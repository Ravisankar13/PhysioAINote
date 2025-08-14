import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Maximize2, Minimize2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualPatientParameters {
  limbScales?: {
    leftArm?: number;
    rightArm?: number;
    leftLeg?: number;
    rightLeg?: number;
  };
  shoulderPathology?: {
    impingement?: boolean;
    frozenShoulder?: boolean;
    rotatorCuffTear?: boolean;
  };
  spinalPathology?: {
    kyphosis?: number;
    lordosis?: number;
    scoliosis?: number;
    flexionLimitation?: number;
  };
  lowerLimbPathology?: {
    kneeFlexionContracture?: number;
    hipFlexionContracture?: number;
    ankleDorsiflexionLimit?: number;
    trendelenburg?: boolean;
  };
  jointAngles?: Record<string, number>;
  movementRestrictions?: Record<string, { min: number; max: number }>;
  gaitPattern?: string;
  posturalDeviations?: string[];
  painLocations?: string[];
}

interface RealtimeVirtualPatientProps {
  webSocket?: WebSocket | null;
  isRecording: boolean;
  className?: string;
}

export function RealtimeVirtualPatient({ 
  webSocket, 
  isRecording,
  className 
}: RealtimeVirtualPatientProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();
  
  const [parameters, setParameters] = useState<VirtualPatientParameters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [detectedConditions, setDetectedConditions] = useState<string[]>([]);
  const [painIndicators, setPainIndicators] = useState<Array<{
    location: string;
    intensity: number;
    type: string;
    timestamp: Date;
  }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [movementRestrictions, setMovementRestrictions] = useState<Record<string, number>>({});

  // Extract clinical keywords from transcript
  const extractClinicalKeywords = useCallback((text: string) => {
    const painKeywords = ['pain', 'hurt', 'ache', 'sore', 'tender', 'sharp', 'dull', 'burning', 'throbbing'];
    const bodyParts = [
      'shoulder', 'neck', 'back', 'spine', 'knee', 'hip', 'ankle', 'elbow', 'wrist',
      'lumbar', 'cervical', 'thoracic', 'heel', 'foot', 'leg', 'arm', 'hand'
    ];
    const movements = ['flexion', 'extension', 'rotation', 'abduction', 'adduction', 'bend', 'straighten'];
    
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    const foundPainLocations: string[] = [];
    
    // Find pain locations
    bodyParts.forEach(part => {
      if (lowerText.includes(part)) {
        // Check if pain keyword is near body part (within 50 characters)
        painKeywords.forEach(pain => {
          const painIndex = lowerText.indexOf(pain);
          const partIndex = lowerText.indexOf(part);
          if (painIndex !== -1 && partIndex !== -1 && Math.abs(painIndex - partIndex) < 50) {
            foundPainLocations.push(part);
            foundKeywords.push(`${part} ${pain}`);
          }
        });
      }
    });
    
    // Find movement restrictions
    movements.forEach(movement => {
      if (lowerText.includes(movement)) {
        bodyParts.forEach(part => {
          const moveIndex = lowerText.indexOf(movement);
          const partIndex = lowerText.indexOf(part);
          if (moveIndex !== -1 && partIndex !== -1 && Math.abs(moveIndex - partIndex) < 30) {
            foundKeywords.push(`${part} ${movement}`);
          }
        });
      }
    });
    
    return { keywords: foundKeywords, painLocations: foundPainLocations };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 10, 50);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    // Create skeleton
    createSkeleton(scene);
    setIsLoading(false);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      
      // Animate pain spheres
      scene.children.forEach(child => {
        if (child.name === 'painSphere' && (child as any).animationFunction) {
          (child as any).animationFunction();
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Create anatomical skeleton
  const createSkeleton = (scene: THREE.Scene) => {
    const skeleton = new THREE.Group();
    
    // Material for bones
    const boneMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4a5568,  // Default gray-blue color
      shininess: 30,
      specular: 0x444444
    });
    
    const pathologyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff6b6b,
      shininess: 30,
      specular: 0x444444,
      opacity: 0.8,
      transparent: true
    });

    // Helper function to create bone
    const createBone = (length: number, radius: number = 0.03) => {
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
      return new THREE.Mesh(geometry, boneMaterial);
    };

    // Helper function to create joint
    const createJoint = (radius: number = 0.05) => {
      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      return new THREE.Mesh(geometry, boneMaterial);
    };

    // Spine
    const spine = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const vertebra = createBone(0.15, 0.06);
      vertebra.position.y = i * 0.18;
      spine.add(vertebra);
    }
    spine.position.y = 0.8;
    skeleton.add(spine);

    // Pelvis
    const pelvis = createBone(0.4, 0.08);
    pelvis.rotation.z = Math.PI / 2;
    pelvis.position.y = 0.7;
    skeleton.add(pelvis);

    // Ribcage
    const ribcage = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.TorusGeometry(0.15 + i * 0.02, 0.02, 8, 16, Math.PI);
      const ribMesh = new THREE.Mesh(rib, boneMaterial);
      ribMesh.position.y = 1.2 + i * 0.08;
      ribMesh.rotation.x = Math.PI;
      ribcage.add(ribMesh);
    }
    skeleton.add(ribcage);

    // Head
    const head = new THREE.Group();
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      boneMaterial
    );
    skull.position.y = 1.85;
    head.add(skull);
    skeleton.add(head);

    // Arms
    ['left', 'right'].forEach((side, index) => {
      const armGroup = new THREE.Group();
      const sign = index === 0 ? -1 : 1;
      
      // Shoulder joint
      const shoulder = createJoint();
      shoulder.position.set(sign * 0.25, 1.5, 0);
      armGroup.add(shoulder);
      
      // Upper arm
      const upperArm = createBone(0.35);
      upperArm.position.set(sign * 0.25, 1.3, 0);
      armGroup.add(upperArm);
      
      // Elbow joint
      const elbow = createJoint(0.04);
      elbow.position.set(sign * 0.25, 1.1, 0);
      armGroup.add(elbow);
      
      // Lower arm
      const lowerArm = createBone(0.3);
      lowerArm.position.set(sign * 0.25, 0.95, 0);
      armGroup.add(lowerArm);
      
      // Hand
      const hand = createJoint(0.03);
      hand.position.set(sign * 0.25, 0.78, 0);
      armGroup.add(hand);
      
      armGroup.name = `${side}Arm`;
      skeleton.add(armGroup);
    });

    // Legs
    ['left', 'right'].forEach((side, index) => {
      const legGroup = new THREE.Group();
      const sign = index === 0 ? -1 : 1;
      
      // Hip joint
      const hip = createJoint();
      hip.position.set(sign * 0.15, 0.7, 0);
      legGroup.add(hip);
      
      // Upper leg
      const upperLeg = createBone(0.45);
      upperLeg.position.set(sign * 0.15, 0.45, 0);
      legGroup.add(upperLeg);
      
      // Knee joint
      const knee = createJoint(0.05);
      knee.position.set(sign * 0.15, 0.2, 0);
      legGroup.add(knee);
      
      // Lower leg
      const lowerLeg = createBone(0.4);
      lowerLeg.position.set(sign * 0.15, 0, 0);
      legGroup.add(lowerLeg);
      
      // Foot
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.15),
        boneMaterial
      );
      foot.position.set(sign * 0.15, -0.2, 0.03);
      legGroup.add(foot);
      
      legGroup.name = `${side}Leg`;
      skeleton.add(legGroup);
    });

    skeleton.castShadow = true;
    skeleton.receiveShadow = true;
    
    scene.add(skeleton);
    skeletonRef.current = skeleton;
  };

  // Update skeleton based on parameters
  const updateSkeleton = useCallback((params: VirtualPatientParameters) => {
    if (!skeletonRef.current || !sceneRef.current) return;

    // First, reset all bone colors to default
    skeletonRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshPhongMaterial;
        if (material.color) {
          material.color.setHex(0x4a5568); // Default bone color
        }
      }
    });

    // Remove existing pain spheres
    const painSpheres = sceneRef.current.children.filter(child => child.name === 'painSphere');
    painSpheres.forEach(sphere => sceneRef.current!.remove(sphere));

    // Visualize pain locations with color changes and glowing spheres
    if (params.painLocations && params.painLocations.length > 0) {
      console.log('[RealtimeVirtualPatient] Visualizing pain locations:', params.painLocations);
      
      params.painLocations.forEach(location => {
        const lowerLocation = location.toLowerCase();
        
        // Create glowing pain indicator sphere
        const painGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const painMaterial = new THREE.MeshPhongMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.6
        });
        const painSphere = new THREE.Mesh(painGeometry, painMaterial);
        painSphere.name = 'painSphere';

        // Position pain sphere based on location
        let positioned = false;
        
        if (lowerLocation.includes('shoulder')) {
          const side = lowerLocation.includes('left') ? -1 : lowerLocation.includes('right') ? 1 : 1;
          painSphere.position.set(side * 0.25, 1.5, 0);
          positioned = true;
          // Color the shoulder area
          const armName = side === -1 ? 'leftArm' : 'rightArm';
          const arm = skeletonRef.current.getObjectByName(armName);
          if (arm) {
            arm.traverse((child) => {
              if (child instanceof THREE.Mesh && child.position.y > 1.3) {
                const material = child.material as THREE.MeshPhongMaterial;
                material.color.setHex(0xff6b6b);
              }
            });
          }
        } else if (lowerLocation.includes('neck') || lowerLocation.includes('cervical')) {
          painSphere.position.set(0, 1.7, 0);
          positioned = true;
        } else if (lowerLocation.includes('back') || lowerLocation.includes('lumbar') || lowerLocation.includes('spine')) {
          painSphere.position.set(0, 1.2, -0.1);
          positioned = true;
          // Color the spine
          skeletonRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.parent?.position.y === 0.8) {
              const material = child.material as THREE.MeshPhongMaterial;
              material.color.setHex(0xff6b6b);
            }
          });
        } else if (lowerLocation.includes('knee')) {
          const side = lowerLocation.includes('left') ? -1 : lowerLocation.includes('right') ? 1 : 0;
          if (side !== 0) {
            painSphere.position.set(side * 0.15, 0.2, 0);
            positioned = true;
            // Color the knee area
            const legName = side === -1 ? 'leftLeg' : 'rightLeg';
            const leg = skeletonRef.current.getObjectByName(legName);
            if (leg) {
              leg.traverse((child) => {
                if (child instanceof THREE.Mesh && Math.abs(child.position.y - 0.2) < 0.1) {
                  const material = child.material as THREE.MeshPhongMaterial;
                  material.color.setHex(0xff6b6b);
                }
              });
            }
          }
        } else if (lowerLocation.includes('hip')) {
          const side = lowerLocation.includes('left') ? -1 : lowerLocation.includes('right') ? 1 : 1;
          painSphere.position.set(side * 0.15, 0.7, 0);
          positioned = true;
          // Color the hip area
          const legName = side === -1 ? 'leftLeg' : 'rightLeg';
          const leg = skeletonRef.current.getObjectByName(legName);
          if (leg) {
            leg.traverse((child) => {
              if (child instanceof THREE.Mesh && child.position.y > 0.6) {
                const material = child.material as THREE.MeshPhongMaterial;
                material.color.setHex(0xff6b6b);
              }
            });
          }
        } else if (lowerLocation.includes('ankle') || lowerLocation.includes('foot')) {
          const side = lowerLocation.includes('left') ? -1 : lowerLocation.includes('right') ? 1 : 0;
          if (side !== 0) {
            painSphere.position.set(side * 0.15, -0.15, 0);
            positioned = true;
          }
        } else if (lowerLocation.includes('elbow')) {
          const side = lowerLocation.includes('left') ? -1 : lowerLocation.includes('right') ? 1 : 1;
          painSphere.position.set(side * 0.25, 1.1, 0);
          positioned = true;
        }

        // Add pulsing animation to pain sphere
        if (positioned) {
          sceneRef.current.add(painSphere);
          
          // Animate the pain sphere
          const animatePainSphere = () => {
            const time = Date.now() * 0.001;
            painSphere.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
            if (painMaterial.emissiveIntensity) {
              painMaterial.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.2;
            }
          };
          
          // Store animation function for later use
          (painSphere as any).animationFunction = animatePainSphere;
        }
      });
    }

    // Update limb scaling
    if (params.limbScales) {
      ['left', 'right'].forEach(side => {
        ['Arm', 'Leg'].forEach(limb => {
          const limbName = `${side}${limb}`;
          const limbGroup = skeletonRef.current?.getObjectByName(limbName);
          if (limbGroup) {
            const scale = limb === 'Arm' 
              ? params.limbScales![`${side}Arm` as keyof typeof params.limbScales] || 1
              : params.limbScales![`${side}Leg` as keyof typeof params.limbScales] || 1;
            limbGroup.scale.y = scale;
          }
        });
      });
    }

    // Apply joint angles
    if (params.jointAngles) {
      Object.entries(params.jointAngles).forEach(([joint, angle]) => {
        // Apply rotations based on joint names
        // This is simplified - in production, you'd have more sophisticated joint mapping
        if (joint.includes('shoulder') && joint.includes('Right')) {
          const rightArm = skeletonRef.current?.getObjectByName('rightArm');
          if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.degToRad(angle);
          }
        }
        // Add more joint mappings as needed
      });
    }

    // Update detected conditions display
    const conditions: string[] = [];
    
    if (params.shoulderPathology?.impingement) conditions.push('Shoulder Impingement');
    if (params.shoulderPathology?.frozenShoulder) conditions.push('Frozen Shoulder');
    if (params.spinalPathology?.kyphosis) conditions.push(`Kyphosis ${params.spinalPathology.kyphosis}°`);
    if (params.lowerLimbPathology?.trendelenburg) conditions.push('Trendelenburg Gait');
    if (params.gaitPattern) conditions.push(params.gaitPattern);
    
    setDetectedConditions(conditions);
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  // Listen for WebSocket updates
  useEffect(() => {
    if (!webSocket) {
      console.log('[RealtimeVirtualPatient] No WebSocket connection available');
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[RealtimeVirtualPatient] Received message type:', data.type);
        
        if (data.type === 'virtual_patient_update') {
          console.log('[RealtimeVirtualPatient] Processing virtual patient update with parameters:', data.parameters);
          setParameters(data.parameters || {});
          updateSkeleton(data.parameters || {});
          
          // Extract pain indicators and keywords from transcript
          if (data.transcript) {
            const { keywords, painLocations } = extractClinicalKeywords(data.transcript);
            console.log('[RealtimeVirtualPatient] Extracted keywords:', keywords, 'Pain locations:', painLocations);
            setRecentKeywords(keywords);
            
            // Add new pain indicators
            painLocations.forEach(location => {
              setPainIndicators(prev => [...prev, {
                location,
                intensity: 5, // Default intensity
                type: 'aching',
                timestamp: new Date()
              }]);
            });
          }
          
          // Mark as listening when we get updates
          setIsListening(true);
        } else if (data.type === 'realtime_update') {
          // Quick updates for immediate feedback
          if (data.transcript) {
            const { keywords, painLocations } = extractClinicalKeywords(data.transcript);
            setRecentKeywords(keywords);
            setParameters(prev => ({
              ...prev,
              painLocations: [...(prev.painLocations || []), ...painLocations]
            }));
          }
        } else if (data.type === 'virtual_patient_reset') {
          setParameters({});
          updateSkeleton({});
          setDetectedConditions([]);
          setPainIndicators([]);
          setRecentKeywords([]);
        }
      } catch (error) {
        console.error('[RealtimeVirtualPatient] Error processing message:', error);
      }
    };

    webSocket.addEventListener('message', handleMessage);
    console.log('[RealtimeVirtualPatient] WebSocket listener attached');
    
    return () => {
      webSocket.removeEventListener('message', handleMessage);
      console.log('[RealtimeVirtualPatient] WebSocket listener removed');
    };
  }, [webSocket, updateSkeleton, extractClinicalKeywords]);

  // Reset skeleton
  const handleReset = () => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(JSON.stringify({ type: 'reset_virtual_patient' }));
    }
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      isExpanded ? "fixed inset-4 z-50" : "",
      className
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Real-Time Virtual Patient
            {isRecording && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated: {lastUpdate}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              disabled={!isRecording}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 3D Viewport */}
          <div 
            ref={mountRef} 
            className={cn(
              "bg-gray-50 rounded-lg relative",
              isExpanded ? "h-[60vh]" : "h-[400px]"
            )}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Recording Status and Listening Indicator */}
          {isRecording && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-200"></div>
                </div>
                <span className="text-sm font-medium text-blue-800">
                  Listening for clinical findings...
                </span>
              </div>
              {recentKeywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {recentKeywords.slice(-5).map((keyword, idx) => (
                    <span key={idx} className="text-xs bg-white px-2 py-1 rounded-md text-blue-700">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pain Indicators */}
          {painIndicators.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Pain Indicators:</p>
              <div className="grid grid-cols-2 gap-2">
                {painIndicators.slice(-4).map((pain, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-800 capitalize">
                        {pain.location}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(pain.intensity, 5))].map((_, i) => (
                          <div key={i} className="w-2 h-2 bg-red-500 rounded-full"></div>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-red-600">{pain.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected Conditions */}
          {detectedConditions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Detected Conditions:</p>
              <div className="flex flex-wrap gap-2">
                {detectedConditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Parameters Summary */}
          {Object.keys(parameters).length > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {parameters.painLocations && parameters.painLocations.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Pain Locations:</span>
                  <ul className="mt-1 text-gray-600">
                    {parameters.painLocations.map((location, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">•</span>
                        {location}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {parameters.posturalDeviations && parameters.posturalDeviations.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Postural Deviations:</span>
                  <ul className="mt-1 text-gray-600">
                    {parameters.posturalDeviations.map((deviation, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">•</span>
                        {deviation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions when not recording */}
          {!isRecording && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">
                Start recording to see real-time virtual patient updates
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The 3D model will automatically adjust based on clinical findings
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}