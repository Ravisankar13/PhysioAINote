import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Maximize2, Bone, Activity, User } from 'lucide-react';

interface RiggedAnatomicalSkeletonProps {
  patientData?: {
    anthropometrics?: {
      height: number;
      weight: number;
      limbLengths?: {
        upperArm: number;
        forearm: number;
        thigh: number;
        shin: number;
      };
      torsoScale?: number;
      overallScale?: number;
    };
    jointRestrictions?: {
      shoulder?: { flexion?: number; abduction?: number; rotation?: number };
      elbow?: { flexion?: number; extension?: number };
      hip?: { flexion?: number; abduction?: number; rotation?: number };
      knee?: { flexion?: number; extension?: number };
      spine?: { flexion?: number; extension?: number; rotation?: number };
      neck?: { flexion?: number; extension?: number; rotation?: number };
    };
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
  showControls?: boolean;
  modelUrl?: string;
}

export default function RiggedAnatomicalSkeleton({
  patientData,
  className = '',
  showControls = true,
  modelUrl = '/models/skeleton.glb' // Use the skeleton.glb from Artec 3D by default
}: RiggedAnatomicalSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    model?: THREE.Group;
    skeleton?: THREE.Skeleton;
    mixer?: THREE.AnimationMixer;
    clock: THREE.Clock;
    bones: { [key: string]: THREE.Bone };
  } | null>(null);

  // Joint control states
  const [jointRotations, setJointRotations] = useState({
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    leftShoulder: { x: 0, y: 0, z: 0 },
    rightShoulder: { x: 0, y: 0, z: 0 },
    leftElbow: { x: 0, y: 0, z: 0 },
    rightElbow: { x: 0, y: 0, z: 0 },
    leftHip: { x: 0, y: 0, z: 0 },
    rightHip: { x: 0, y: 0, z: 0 },
    leftKnee: { x: 0, y: 0, z: 0 },
    rightKnee: { x: 0, y: 0, z: 0 }
  });

  // Limb scale controls
  const [limbScales, setLimbScales] = useState({
    upperArm: 1.0,
    forearm: 1.0,
    thigh: 1.0,
    shin: 1.0,
    spine: 1.0,
    overall: 1.0
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 100);

    // Create camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 1, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 1, 0);
    controls.update();

    // Initialize scene reference
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      clock: new THREE.Clock(),
      bones: {}
    };

    // Load the rigged skeleton model
    const loader = new GLTFLoader();
    
    console.log('Loading rigged skeleton from:', modelUrl);
    
    loader.load(
      modelUrl,
      (gltf) => {
        console.log('Rigged skeleton loaded successfully:', gltf);
        const model = gltf.scene;
        
        // Scale and position model
        model.scale.set(0.01, 0.01, 0.01); // Artec model is large, scale it down
        model.position.set(0, 0, 0);
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y = 0;
        
        // Enable shadows and enhance materials
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            
            if (child.material) {
              // Make bones look more medical/anatomical
              child.material.color = new THREE.Color(0xf4f1e8);
              child.material.roughness = 0.7;
              child.material.metalness = 0.1;
            }
          }
        });
        
        // Find skeleton and bones if the model is rigged
        let skeleton: THREE.Skeleton | undefined;
        const bones: { [key: string]: THREE.Bone } = {};
        
        model.traverse((child: any) => {
          if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
            console.log('Found skeleton with', skeleton.bones.length, 'bones');
            
            // Map bones by name
            skeleton.bones.forEach((bone: THREE.Bone) => {
              bones[bone.name] = bone;
              console.log('Bone found:', bone.name);
            });
          } else if (child.isBone) {
            // Also collect any loose bones
            bones[child.name] = child;
          }
        });
        
        // If no skeleton found, create a basic one
        if (!skeleton || Object.keys(bones).length === 0) {
          console.log('No rigged skeleton found, model will be static');
        }
        
        scene.add(model);
        
        if (sceneRef.current) {
          sceneRef.current.model = model;
          sceneRef.current.skeleton = skeleton;
          sceneRef.current.bones = bones;
        }
        
        setIsLoading(false);
        
        // Apply initial patient data if provided
        if (patientData) {
          applyPatientData();
        }
      },
      (progress) => {
        console.log('Loading skeleton...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('Error loading rigged skeleton:', error);
        setError(`Failed to load skeleton model: ${error.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    );

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      }
      
      // Apply joint rotations to bones
      applyJointRotations();
      
      // Apply limb scales
      applyLimbScales();
      
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    function handleResize() {
      if (!mountRef.current || !sceneRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      controls.dispose();
      sceneRef.current = null;
    };
  }, [modelUrl]);

  // Apply joint rotations to the skeleton
  const applyJointRotations = () => {
    if (!sceneRef.current || !sceneRef.current.bones) return;
    
    const bones = sceneRef.current.bones;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    // Apply rotations to specific bones if they exist
    // Map common bone names
    const boneMap: { [key: string]: string[] } = {
      spine: ['Spine', 'spine', 'mixamorigSpine', 'Spine1'],
      neck: ['Neck', 'neck', 'mixamorigNeck', 'Head'],
      leftShoulder: ['LeftShoulder', 'left_shoulder', 'mixamorigLeftArm', 'LeftArm'],
      rightShoulder: ['RightShoulder', 'right_shoulder', 'mixamorigRightArm', 'RightArm'],
      leftElbow: ['LeftElbow', 'left_elbow', 'mixamorigLeftForeArm', 'LeftForeArm'],
      rightElbow: ['RightElbow', 'right_elbow', 'mixamorigRightForeArm', 'RightForeArm'],
      leftHip: ['LeftHip', 'left_hip', 'mixamorigLeftUpLeg', 'LeftUpLeg'],
      rightHip: ['RightHip', 'right_hip', 'mixamorigRightUpLeg', 'RightUpLeg'],
      leftKnee: ['LeftKnee', 'left_knee', 'mixamorigLeftLeg', 'LeftLeg'],
      rightKnee: ['RightKnee', 'right_knee', 'mixamorigRightLeg', 'RightLeg']
    };
    
    // Apply rotations
    Object.entries(jointRotations).forEach(([jointName, rotation]) => {
      const possibleNames = boneMap[jointName] || [];
      
      for (const boneName of possibleNames) {
        if (bones[boneName]) {
          bones[boneName].rotation.x = toRad(rotation.x);
          bones[boneName].rotation.y = toRad(rotation.y);
          bones[boneName].rotation.z = toRad(rotation.z);
          break; // Found and applied, move to next joint
        }
      }
    });
  };

  // Apply limb scales to the skeleton
  const applyLimbScales = () => {
    if (!sceneRef.current || !sceneRef.current.model) return;
    
    const model = sceneRef.current.model;
    
    // Apply overall scale
    model.scale.set(
      0.01 * limbScales.overall,
      0.01 * limbScales.overall,
      0.01 * limbScales.overall
    );
    
    // If we have bones, apply specific limb scales
    if (sceneRef.current.bones) {
      const bones = sceneRef.current.bones;
      
      // Scale specific limbs if bones exist
      // This would require more complex bone hierarchy manipulation
      // For now, we'll keep it simple with overall scaling
    }
  };

  // Apply patient data to the model
  const applyPatientData = () => {
    if (!patientData || !sceneRef.current) return;
    
    // Apply joint restrictions
    if (patientData.jointRestrictions) {
      const restrictions = patientData.jointRestrictions;
      
      // Convert restrictions to rotations (simplified)
      if (restrictions.shoulder) {
        setJointRotations(prev => ({
          ...prev,
          leftShoulder: {
            x: -(restrictions.shoulder?.flexion || 0) / 2,
            y: 0,
            z: (restrictions.shoulder?.abduction || 0) / 4
          },
          rightShoulder: {
            x: -(restrictions.shoulder?.flexion || 0) / 2,
            y: 0,
            z: -(restrictions.shoulder?.abduction || 0) / 4
          }
        }));
      }
      
      if (restrictions.elbow) {
        setJointRotations(prev => ({
          ...prev,
          leftElbow: { x: -(restrictions.elbow?.flexion || 0) / 2, y: 0, z: 0 },
          rightElbow: { x: -(restrictions.elbow?.flexion || 0) / 2, y: 0, z: 0 }
        }));
      }
    }
    
    // Apply limb lengths
    if (patientData.anthropometrics?.limbLengths) {
      const lengths = patientData.anthropometrics.limbLengths;
      setLimbScales(prev => ({
        ...prev,
        upperArm: lengths.upperArm / 30, // Normalize to default length
        forearm: lengths.forearm / 25,
        thigh: lengths.thigh / 40,
        shin: lengths.shin / 35
      }));
    }
  };

  // Reset all controls
  const resetControls = () => {
    setJointRotations({
      spine: { x: 0, y: 0, z: 0 },
      neck: { x: 0, y: 0, z: 0 },
      leftShoulder: { x: 0, y: 0, z: 0 },
      rightShoulder: { x: 0, y: 0, z: 0 },
      leftElbow: { x: 0, y: 0, z: 0 },
      rightElbow: { x: 0, y: 0, z: 0 },
      leftHip: { x: 0, y: 0, z: 0 },
      rightHip: { x: 0, y: 0, z: 0 },
      leftKnee: { x: 0, y: 0, z: 0 },
      rightKnee: { x: 0, y: 0, z: 0 }
    });
    
    setLimbScales({
      upperArm: 1.0,
      forearm: 1.0,
      thigh: 1.0,
      shin: 1.0,
      spine: 1.0,
      overall: 1.0
    });
    
    if (sceneRef.current?.controls) {
      sceneRef.current.controls.reset();
    }
  };

  // Apply preset poses
  const applyPresetPose = (poseName: string) => {
    const poses: { [key: string]: any } = {
      standing: {
        spine: { x: 0, y: 0, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
        leftShoulder: { x: 0, y: 0, z: 0 },
        rightShoulder: { x: 0, y: 0, z: 0 },
        leftElbow: { x: 0, y: 0, z: 0 },
        rightElbow: { x: 0, y: 0, z: 0 },
        leftHip: { x: 0, y: 0, z: 0 },
        rightHip: { x: 0, y: 0, z: 0 },
        leftKnee: { x: 0, y: 0, z: 0 },
        rightKnee: { x: 0, y: 0, z: 0 }
      },
      sitting: {
        spine: { x: 10, y: 0, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
        leftShoulder: { x: -10, y: 0, z: 0 },
        rightShoulder: { x: -10, y: 0, z: 0 },
        leftElbow: { x: -90, y: 0, z: 0 },
        rightElbow: { x: -90, y: 0, z: 0 },
        leftHip: { x: -90, y: 0, z: 0 },
        rightHip: { x: -90, y: 0, z: 0 },
        leftKnee: { x: -90, y: 0, z: 0 },
        rightKnee: { x: -90, y: 0, z: 0 }
      },
      walking: {
        spine: { x: 0, y: 0, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
        leftShoulder: { x: 30, y: 0, z: 0 },
        rightShoulder: { x: -30, y: 0, z: 0 },
        leftElbow: { x: -20, y: 0, z: 0 },
        rightElbow: { x: -10, y: 0, z: 0 },
        leftHip: { x: -30, y: 0, z: 0 },
        rightHip: { x: 20, y: 0, z: 0 },
        leftKnee: { x: -10, y: 0, z: 0 },
        rightKnee: { x: -40, y: 0, z: 0 }
      }
    };
    
    if (poses[poseName]) {
      setJointRotations(poses[poseName]);
    }
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-white mb-2" />
            <p className="text-white">Loading Anatomical Skeleton...</p>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded z-20">
          {error}
        </div>
      )}
      
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Controls Panel */}
      {showControls && !isLoading && (
        <div className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur rounded-lg shadow-lg z-10 max-h-[calc(100%-2rem)] overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bone className="w-5 h-5" />
                Skeleton Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Poses */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => applyPresetPose('standing')}>
                  <User className="w-4 h-4 mr-1" /> Standing
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPresetPose('sitting')}>
                  Sitting
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPresetPose('walking')}>
                  Walking
                </Button>
              </div>
              
              <Tabs defaultValue="joints" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="joints">Joints</TabsTrigger>
                  <TabsTrigger value="scales">Proportions</TabsTrigger>
                </TabsList>
                
                {/* Joint Controls */}
                <TabsContent value="joints" className="space-y-3 mt-3">
                  {/* Spine */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Spine Flexion</Label>
                    <Slider
                      value={[jointRotations.spine.x]}
                      onValueChange={([value]) => 
                        setJointRotations(prev => ({...prev, spine: {...prev.spine, x: value}}))
                      }
                      min={-45}
                      max={45}
                      step={1}
                    />
                  </div>
                  
                  {/* Shoulder */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Shoulder Flexion</Label>
                    <Slider
                      value={[jointRotations.leftShoulder.x]}
                      onValueChange={([value]) => {
                        setJointRotations(prev => ({
                          ...prev, 
                          leftShoulder: {...prev.leftShoulder, x: value},
                          rightShoulder: {...prev.rightShoulder, x: value}
                        }));
                      }}
                      min={-180}
                      max={60}
                      step={1}
                    />
                  </div>
                  
                  {/* Elbow */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Elbow Flexion</Label>
                    <Slider
                      value={[jointRotations.leftElbow.x]}
                      onValueChange={([value]) => {
                        setJointRotations(prev => ({
                          ...prev, 
                          leftElbow: {...prev.leftElbow, x: value},
                          rightElbow: {...prev.rightElbow, x: value}
                        }));
                      }}
                      min={-150}
                      max={0}
                      step={1}
                    />
                  </div>
                  
                  {/* Hip */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hip Flexion</Label>
                    <Slider
                      value={[jointRotations.leftHip.x]}
                      onValueChange={([value]) => {
                        setJointRotations(prev => ({
                          ...prev, 
                          leftHip: {...prev.leftHip, x: value},
                          rightHip: {...prev.rightHip, x: value}
                        }));
                      }}
                      min={-120}
                      max={30}
                      step={1}
                    />
                  </div>
                  
                  {/* Knee */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Knee Flexion</Label>
                    <Slider
                      value={[jointRotations.leftKnee.x]}
                      onValueChange={([value]) => {
                        setJointRotations(prev => ({
                          ...prev, 
                          leftKnee: {...prev.leftKnee, x: value},
                          rightKnee: {...prev.rightKnee, x: value}
                        }));
                      }}
                      min={-140}
                      max={0}
                      step={1}
                    />
                  </div>
                </TabsContent>
                
                {/* Scale Controls */}
                <TabsContent value="scales" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Overall Scale</Label>
                    <Slider
                      value={[limbScales.overall]}
                      onValueChange={([value]) => 
                        setLimbScales(prev => ({...prev, overall: value}))
                      }
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Upper Arm Length</Label>
                    <Slider
                      value={[limbScales.upperArm]}
                      onValueChange={([value]) => 
                        setLimbScales(prev => ({...prev, upperArm: value}))
                      }
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Forearm Length</Label>
                    <Slider
                      value={[limbScales.forearm]}
                      onValueChange={([value]) => 
                        setLimbScales(prev => ({...prev, forearm: value}))
                      }
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Thigh Length</Label>
                    <Slider
                      value={[limbScales.thigh]}
                      onValueChange={([value]) => 
                        setLimbScales(prev => ({...prev, thigh: value}))
                      }
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Shin Length</Label>
                    <Slider
                      value={[limbScales.shin]}
                      onValueChange={([value]) => 
                        setLimbScales(prev => ({...prev, shin: value}))
                      }
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Reset Button */}
              <Button 
                onClick={resetControls} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset All Controls
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}