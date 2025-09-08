import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CCDIKSolver, IKConfig } from './CCDIKHelper';
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
  modelConfig?: {
    limbScales?: {
      upperArm: number;
      forearm: number;
      thigh: number;
      shin: number;
      overall: number;
    };
    spinalPathology?: {
      spineFlexion: number;
      spineLateralFlexion: number;
      spineRotation: number;
    };
    shoulderPathology?: {
      shoulderFlexion: number;
      shoulderAbduction: number;
      shoulderRotation: number;
    };
    lowerLimbPathology?: {
      hipFlexion: number;
      hipAbduction: number;
      hipRotation: number;
      kneeFlexion: number;
      ankleDorsiflexion: number;
    };
  };
  className?: string;
  showControls?: boolean;
  modelUrl?: string;
}

export default function RiggedAnatomicalSkeleton({
  patientData,
  modelConfig,
  className = '',
  showControls = true,
  modelUrl = '/skeleton_rig.glb' // Use the existing skeleton rig GLB
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
    ikSolver?: CCDIKSolver;
    skinnedMesh?: THREE.SkinnedMesh;
    ikTargets?: {
      leftHand?: THREE.Object3D;
      rightHand?: THREE.Object3D;
      leftFoot?: THREE.Object3D;
      rightFoot?: THREE.Object3D;
      head?: THREE.Object3D;
    };
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

    // Create camera - closer for better view
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
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

    // Orbit controls - adjusted for closer view
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 10;
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
        
        // Scale and position model - larger scale for better visibility
        model.scale.set(0.02, 0.02, 0.02); // Increased scale for better visibility
        model.position.set(0, 0, 0);
        
        // Center the model and adjust position
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center horizontally but keep at ground level
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -box.min.y; // Place feet at ground level
        
        // Auto-adjust camera based on model size
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.5;
        camera.position.set(0, size.y * 0.5, cameraDistance);
        camera.lookAt(0, size.y * 0.5, 0);
        controls.target.set(0, size.y * 0.5, 0);
        controls.update();
        
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
        let skinnedMesh: THREE.SkinnedMesh | undefined;
        const bones: { [key: string]: THREE.Bone } = {};
        
        model.traverse((child: any) => {
          if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
            skinnedMesh = child;
            console.log('Found skeleton with', skeleton?.bones.length, 'bones');
            
            // Map bones by name
            skeleton?.bones.forEach((bone: THREE.Bone) => {
              bones[bone.name] = bone;
              // Also add uppercase version for easier matching
              bones[bone.name.toUpperCase()] = bone;
              
              // Log important limb bones
              if (bone.name.includes('HUMERUS') || bone.name.includes('RADIUS') ||
                  bone.name.includes('FEMUR') || bone.name.includes('TIBIA')) {
                console.log('Important limb bone:', bone.name);
              }
            });
          } else if (child.isBone) {
            // Also collect any loose bones
            bones[child.name] = child;
            bones[child.name.toUpperCase()] = child;
          }
        });
        
        // If no skeleton found, create a basic one
        if (!skeleton || Object.keys(bones).length === 0) {
          console.log('No rigged skeleton found, model will be static');
        }
        
        // Set up IK solver if we have a skinned mesh and skeleton
        let ikSolver: CCDIKSolver | undefined;
        const ikTargets: any = {};
        
        if (skinnedMesh && skeleton) {
          console.log('Setting up IK solver for skeleton');
          
          // Create IK targets (invisible objects that define where bones should reach)
          ikTargets.leftHand = new THREE.Object3D();
          ikTargets.rightHand = new THREE.Object3D();
          ikTargets.leftFoot = new THREE.Object3D();
          ikTargets.rightFoot = new THREE.Object3D();
          ikTargets.head = new THREE.Object3D();
          
          // Add targets to scene
          scene.add(ikTargets.leftHand);
          scene.add(ikTargets.rightHand);
          scene.add(ikTargets.leftFoot);
          scene.add(ikTargets.rightFoot);
          scene.add(ikTargets.head);
          
          // Find bone indices for IK chains
          const findBoneIndex = (name: string): number => {
            const index = skeleton!.bones.findIndex(b => 
              b.name.toUpperCase().includes(name.toUpperCase())
            );
            return index >= 0 ? index : -1;
          };
          
          // Create IK configurations
          const ikConfigs: IKConfig[] = [];
          
          // Try to find spine bones for IK
          const spineIndices: number[] = [];
          for (let i = 0; i < skeleton.bones.length; i++) {
            const boneName = skeleton.bones[i].name.toUpperCase();
            if (boneName.includes('SPINE') || boneName.includes('CHEST') || 
                boneName.includes('ABDOMEN') || boneName.includes('TORSO')) {
              spineIndices.push(i);
            }
          }
          
          // If we found spine bones, create spine IK config
          if (spineIndices.length > 1) {
            const headIndex = findBoneIndex('HEAD');
            if (headIndex >= 0) {
              ikConfigs.push(CCDIKSolver.createSpineIKConfig(
                skeleton,
                spineIndices,
                headIndex
              ));
              console.log('Created spine IK chain with', spineIndices.length, 'bones');
            }
          }
          
          // Create arm IK chains
          const leftShoulderIndex = findBoneIndex('HUMERUSL');
          const leftElbowIndex = findBoneIndex('RADIUSL');
          const leftWristIndex = findBoneIndex('HANDL');
          
          if (leftShoulderIndex >= 0 && leftElbowIndex >= 0 && leftWristIndex >= 0) {
            // Add a target bone for left hand
            const leftHandTarget = new THREE.Bone();
            leftHandTarget.name = 'IK_TARGET_LEFT_HAND';
            skeleton.bones.push(leftHandTarget);
            
            ikConfigs.push(CCDIKSolver.createLimbIKConfig(
              skeleton,
              leftShoulderIndex,
              leftElbowIndex,
              leftWristIndex,
              skeleton.bones.length - 1
            ));
            console.log('Created left arm IK chain');
          }
          
          // Create right arm IK chain
          const rightShoulderIndex = findBoneIndex('HUMERUSR');
          const rightElbowIndex = findBoneIndex('RADIUSR');
          const rightWristIndex = findBoneIndex('HANDR');
          
          if (rightShoulderIndex >= 0 && rightElbowIndex >= 0 && rightWristIndex >= 0) {
            const rightHandTarget = new THREE.Bone();
            rightHandTarget.name = 'IK_TARGET_RIGHT_HAND';
            skeleton.bones.push(rightHandTarget);
            
            ikConfigs.push(CCDIKSolver.createLimbIKConfig(
              skeleton,
              rightShoulderIndex,
              rightElbowIndex,
              rightWristIndex,
              skeleton.bones.length - 1
            ));
            console.log('Created right arm IK chain');
          }
          
          // Create leg IK chains
          const leftHipIndex = findBoneIndex('FEMURL');
          const leftKneeIndex = findBoneIndex('TIBIAL');
          const leftAnkleIndex = findBoneIndex('FOOTL');
          
          if (leftHipIndex >= 0 && leftKneeIndex >= 0 && leftAnkleIndex >= 0) {
            const leftFootTarget = new THREE.Bone();
            leftFootTarget.name = 'IK_TARGET_LEFT_FOOT';
            skeleton.bones.push(leftFootTarget);
            
            ikConfigs.push(CCDIKSolver.createLimbIKConfig(
              skeleton,
              leftHipIndex,
              leftKneeIndex,
              leftAnkleIndex,
              skeleton.bones.length - 1
            ));
            console.log('Created left leg IK chain');
          }
          
          const rightHipIndex = findBoneIndex('FEMURR');
          const rightKneeIndex = findBoneIndex('TIBIAR');
          const rightAnkleIndex = findBoneIndex('FOOTR');
          
          if (rightHipIndex >= 0 && rightKneeIndex >= 0 && rightAnkleIndex >= 0) {
            const rightFootTarget = new THREE.Bone();
            rightFootTarget.name = 'IK_TARGET_RIGHT_FOOT';
            skeleton.bones.push(rightFootTarget);
            
            ikConfigs.push(CCDIKSolver.createLimbIKConfig(
              skeleton,
              rightHipIndex,
              rightKneeIndex,
              rightAnkleIndex,
              skeleton.bones.length - 1
            ));
            console.log('Created right leg IK chain');
          }
          
          // Create the IK solver with all configurations
          if (ikConfigs.length > 0) {
            ikSolver = new CCDIKSolver(skinnedMesh, ikConfigs);
            console.log('IK solver created with', ikConfigs.length, 'chains');
          }
        }
        
        scene.add(model);
        
        if (sceneRef.current) {
          sceneRef.current.model = model;
          sceneRef.current.skeleton = skeleton;
          sceneRef.current.bones = bones;
          sceneRef.current.skinnedMesh = skinnedMesh;
          sceneRef.current.ikSolver = ikSolver;
          sceneRef.current.ikTargets = ikTargets;
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to load skeleton model: ${errorMessage}`);
        setIsLoading(false);
      }
    );

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      }
      
      // Update IK solver if it exists
      if (sceneRef.current?.ikSolver) {
        sceneRef.current.ikSolver.update();
      }
      
      // Joint rotations and limb scales are now applied via useEffect
      
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

  // Update bones when joint rotations change
  useEffect(() => {
    applyJointRotations();
  }, [jointRotations]);

  // Helper function to check if all values are reset
  const isResetState = (config: typeof modelConfig) => {
    if (!config) return false;
    
    // Cast to any to check new properties
    const configAny = config as any;
    
    // Check legacy pathology values
    const legacyReset = (
      config.limbScales?.upperArm === 1.0 &&
      config.limbScales?.forearm === 1.0 &&
      config.limbScales?.thigh === 1.0 &&
      config.limbScales?.shin === 1.0 &&
      config.limbScales?.overall === 1.0 &&
      config.spinalPathology?.spineFlexion === 0 &&
      config.spinalPathology?.spineLateralFlexion === 0 &&
      config.spinalPathology?.spineRotation === 0 &&
      config.shoulderPathology?.shoulderFlexion === 0 &&
      config.shoulderPathology?.shoulderAbduction === 0 &&
      config.shoulderPathology?.shoulderRotation === 0 &&
      config.lowerLimbPathology?.hipFlexion === 0 &&
      config.lowerLimbPathology?.hipAbduction === 0 &&
      config.lowerLimbPathology?.hipRotation === 0 &&
      config.lowerLimbPathology?.kneeFlexion === 0 &&
      config.lowerLimbPathology?.ankleDorsiflexion === 0
    );
    
    // Check new bilateral values if they exist
    const bilateralReset = !configAny.leftHip ? true : (
      configAny.leftHip?.flexion === 0 &&
      configAny.leftHip?.abduction === 0 &&
      configAny.leftHip?.internalRotation === 0 &&
      configAny.leftHip?.anteversion === 15 &&
      configAny.leftHip?.neckShaftAngle === 130 &&
      configAny.rightHip?.flexion === 0 &&
      configAny.rightHip?.abduction === 0 &&
      configAny.rightHip?.internalRotation === 0 &&
      configAny.rightHip?.anteversion === 15 &&
      configAny.rightHip?.neckShaftAngle === 130 &&
      configAny.leftKnee?.flexion === 0 &&
      configAny.leftKnee?.varus === 0 &&
      configAny.leftKnee?.tibialTorsion === 0 &&
      configAny.leftKnee?.patellaAlta === 0 &&
      configAny.rightKnee?.flexion === 0 &&
      configAny.rightKnee?.varus === 0 &&
      configAny.rightKnee?.tibialTorsion === 0 &&
      configAny.rightKnee?.patellaAlta === 0 &&
      configAny.leftAnkle?.dorsiflexion === 0 &&
      configAny.leftAnkle?.plantarflexion === 0 &&
      configAny.leftAnkle?.inversion === 0 &&
      configAny.leftAnkle?.eversion === 0 &&
      configAny.leftAnkle?.archHeight === 0 &&
      configAny.rightAnkle?.dorsiflexion === 0 &&
      configAny.rightAnkle?.plantarflexion === 0 &&
      configAny.rightAnkle?.inversion === 0 &&
      configAny.rightAnkle?.eversion === 0 &&
      configAny.rightAnkle?.archHeight === 0 &&
      configAny.leftShoulder?.flexion === 0 &&
      configAny.leftShoulder?.abduction === 0 &&
      configAny.leftShoulder?.internalRotation === 0 &&
      configAny.leftShoulder?.protraction === 0 &&
      configAny.leftShoulder?.elevation === 0 &&
      configAny.leftShoulder?.winging === 0 &&
      configAny.rightShoulder?.flexion === 0 &&
      configAny.rightShoulder?.abduction === 0 &&
      configAny.rightShoulder?.internalRotation === 0 &&
      configAny.rightShoulder?.protraction === 0 &&
      configAny.rightShoulder?.elevation === 0 &&
      configAny.rightShoulder?.winging === 0 &&
      configAny.leftElbow?.flexion === 0 &&
      configAny.leftElbow?.carryingAngle === 10 &&
      configAny.leftElbow?.pronation === 0 &&
      configAny.rightElbow?.flexion === 0 &&
      configAny.rightElbow?.carryingAngle === 10 &&
      configAny.rightElbow?.pronation === 0
    );
    
    // Check spine values if they exist (with clinical normal values)
    const spineReset = !configAny.spine ? true : (
      configAny.spine?.cervicalLordosis === -40 &&
      configAny.spine?.thoracicKyphosis === 35 &&
      configAny.spine?.lumbarLordosis === -50 &&
      configAny.spine?.scoliosis === 0 &&
      configAny.spine?.forwardHead === 0 &&
      configAny.spine?.lateralShift === 0
    );
    
    // Check pelvis values if they exist
    const pelvisReset = !configAny.pelvis ? true : (
      configAny.pelvis?.tilt === 0 &&
      configAny.pelvis?.obliquity === 0 &&
      configAny.pelvis?.rotation === 0
    );
    
    return legacyReset && bilateralReset && spineReset && pelvisReset;
  };

  // Reset all bones to default state
  const resetAllBones = () => {
    if (!sceneRef.current) return;
    
    // Don't reset bones individually - just ensure model is at correct scale
    // The bones will be reset through the normal pathology application process
    
    // Reset the model scale to default
    if (sceneRef.current.model) {
      sceneRef.current.model.scale.set(0.02, 0.02, 0.02);
      sceneRef.current.model.rotation.set(0, 0, 0);
      sceneRef.current.model.position.set(0, 0, 0);
      sceneRef.current.model.updateMatrix();
      sceneRef.current.model.updateMatrixWorld(true);
    }
    
    // Force re-apply the default scales to ensure skeleton is visible
    if (sceneRef.current.bones) {
      // Apply default limb scales (1.0 for all)
      applyLimbScales();
    }
    
    // Update skeleton
    if (sceneRef.current.skeleton) {
      sceneRef.current.skeleton.update();
    }
  };

  // Update scales when limb scales change from state or modelConfig
  useEffect(() => {
    // Always apply limb scales - when reset, they'll be 1.0 which is correct
    applyLimbScales();
  }, [limbScales, modelConfig?.limbScales]);
  
  // Update bones when pathology changes from modelConfig
  useEffect(() => {
    if (modelConfig) {
      // Always apply pathology rotations - when reset, they'll be 0 which is correct
      applyPathologyRotations();
    }
  }, [modelConfig?.spinalPathology, modelConfig?.shoulderPathology, modelConfig?.lowerLimbPathology]);

  // Apply femoral morphology changes from new bilateral parameters
  useEffect(() => {
    if (!sceneRef.current || !sceneRef.current.bones) return;
    
    const bones = sceneRef.current.bones;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const configAny = modelConfig as any;
    
    // Apply femoral anteversion and neck-shaft angle if they exist
    if (configAny?.leftHip || configAny?.rightHip) {
      // Left femur
      if (configAny.leftHip) {
        const leftFemurBones = Object.keys(bones).filter(name => 
          name.toLowerCase().includes('femur') && name.toLowerCase().includes('l')
        );
        
        
        leftFemurBones.forEach(boneName => {
          const bone = bones[boneName];
          
          // Only apply to the main femur bone, not the MCH bones
          if (!boneName.includes('MCH')) {
            // Reset rotation first to avoid accumulation
            bone.rotation.set(0, 0, 0);
            
            // Apply femoral anteversion (internal/external rotation)
            // Try X-axis as it might be the longitudinal axis in this rig
            if (configAny.leftHip.anteversion !== undefined) {
              // For left leg, positive anteversion should rotate the knee inward
              const anteversionAngle = configAny.leftHip.anteversion - 15; // 15 is normal
              bone.rotation.x = toRad(anteversionAngle);

            }
            
            // Apply neck-shaft angle (coxa vara/valga)
            // This affects the frontal plane angle
            if (configAny.leftHip.neckShaftAngle !== undefined) {
              // Neck-shaft angle affects how much the femur angles outward
              const angleDeviation = configAny.leftHip.neckShaftAngle - 130; // 130 is normal
              // Try Y-axis for frontal plane
              bone.rotation.y = toRad(angleDeviation * 0.3); // Scale down

            }
            
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
          }
        });
      }
      
      // Right femur
      if (configAny.rightHip) {
        const rightFemurBones = Object.keys(bones).filter(name => 
          name.toLowerCase().includes('femur') && name.toLowerCase().includes('r')
        );
        
        rightFemurBones.forEach(boneName => {
          const bone = bones[boneName];
          
          // Only apply to the main femur bone, not the MCH bones
          if (!boneName.includes('MCH')) {
            // Reset rotation first to avoid accumulation
            bone.rotation.set(0, 0, 0);
            
            // Apply femoral anteversion (internal/external rotation)
            if (configAny.rightHip.anteversion !== undefined) {
              // For right leg, positive anteversion should rotate the knee inward
              const anteversionAngle = configAny.rightHip.anteversion - 15;
              bone.rotation.x = toRad(-anteversionAngle); // Negative for right side symmetry

            }
            
            // Apply neck-shaft angle (coxa vara/valga)
            if (configAny.rightHip.neckShaftAngle !== undefined) {
              const angleDeviation = configAny.rightHip.neckShaftAngle - 130;
              // Try Y-axis for frontal plane
              bone.rotation.y = toRad(-angleDeviation * 0.3); // Negative for right side

            }
            
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
          }
        });
      }
    }
  }, [(modelConfig as any)?.leftHip?.anteversion, (modelConfig as any)?.leftHip?.neckShaftAngle,
      (modelConfig as any)?.rightHip?.anteversion, (modelConfig as any)?.rightHip?.neckShaftAngle]);

  // Apply other bilateral morphological parameters
  useEffect(() => {
    if (!sceneRef.current || !sceneRef.current.bones) return;
    
    const bones = sceneRef.current.bones;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const configAny = modelConfig as any;
    
    // Apply knee morphology
    if (configAny?.leftKnee || configAny?.rightKnee) {
      // Left knee/tibia
      if (configAny.leftKnee) {
        const leftTibiaBones = Object.keys(bones).filter(name => 
          name.toLowerCase().includes('tibia') && name.toLowerCase().includes('l')
        );
        
        leftTibiaBones.forEach(boneName => {
          const bone = bones[boneName];
          
          // Apply tibial torsion
          if (configAny.leftKnee.tibialTorsion !== undefined) {
            bone.rotation.y = toRad(configAny.leftKnee.tibialTorsion);
          }
          
          // Apply varus/valgus
          if (configAny.leftKnee.varus !== undefined) {
            bone.rotation.z = toRad(configAny.leftKnee.varus);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
        
        // Patella alta/baja (vertical displacement of patella)
        const leftPatellaBones = Object.keys(bones).filter(name => 
          name.toLowerCase().includes('patella') && name.toLowerCase().includes('l')
        );
        
        leftPatellaBones.forEach(boneName => {
          const bone = bones[boneName];
          if (configAny.leftKnee.patellaAlta !== undefined) {
            bone.position.y += configAny.leftKnee.patellaAlta * 0.001; // Convert mm to model units
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
          }
        });
      }
      
      // Right knee/tibia
      if (configAny.rightKnee) {
        const rightTibiaBones = Object.keys(bones).filter(name => 
          name.toLowerCase().includes('tibia') && name.toLowerCase().includes('r')
        );
        
        rightTibiaBones.forEach(boneName => {
          const bone = bones[boneName];
          
          if (configAny.rightKnee.tibialTorsion !== undefined) {
            bone.rotation.y = toRad(configAny.rightKnee.tibialTorsion);
          }
          
          if (configAny.rightKnee.varus !== undefined) {
            bone.rotation.z = toRad(-configAny.rightKnee.varus); // Negative for right side
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
      }
    }
    
    // Apply elbow morphology
    if (configAny?.leftElbow || configAny?.rightElbow) {
      // Left elbow
      if (configAny.leftElbow) {
        const leftElbowBones = Object.keys(bones).filter(name => 
          (name.toLowerCase().includes('radius') || name.toLowerCase().includes('ulna')) && 
          name.toLowerCase().includes('l')
        );
        
        leftElbowBones.forEach(boneName => {
          const bone = bones[boneName];
          
          // Apply carrying angle
          if (configAny.leftElbow.carryingAngle !== undefined) {
            const angleDeviation = configAny.leftElbow.carryingAngle - 10; // 10 is normal
            bone.rotation.z = toRad(angleDeviation * 0.5);
          }
          
          // Apply pronation/supination
          if (configAny.leftElbow.pronation !== undefined) {
            bone.rotation.x = toRad(configAny.leftElbow.pronation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
      }
      
      // Right elbow
      if (configAny.rightElbow) {
        const rightElbowBones = Object.keys(bones).filter(name => 
          (name.toLowerCase().includes('radius') || name.toLowerCase().includes('ulna')) && 
          name.toLowerCase().includes('r')
        );
        
        rightElbowBones.forEach(boneName => {
          const bone = bones[boneName];
          
          if (configAny.rightElbow.carryingAngle !== undefined) {
            const angleDeviation = configAny.rightElbow.carryingAngle - 10;
            bone.rotation.z = toRad(-angleDeviation * 0.5);
          }
          
          if (configAny.rightElbow.pronation !== undefined) {
            bone.rotation.x = toRad(configAny.rightElbow.pronation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
      }
    }
    
    // Apply shoulder morphology (scapular winging, protraction, elevation)
    if (configAny?.leftShoulder || configAny?.rightShoulder) {
      // Left shoulder/scapula
      if (configAny.leftShoulder) {
        const leftScapulaBones = Object.keys(bones).filter(name => 
          (name.toLowerCase().includes('scapula') || name.toLowerCase().includes('clavicle')) && 
          name.toLowerCase().includes('l')
        );
        
        leftScapulaBones.forEach(boneName => {
          const bone = bones[boneName];
          
          // Apply scapular winging
          if (configAny.leftShoulder.winging !== undefined) {
            bone.rotation.y = toRad(configAny.leftShoulder.winging);
          }
          
          // Apply protraction/retraction
          if (configAny.leftShoulder.protraction !== undefined) {
            bone.position.z += configAny.leftShoulder.protraction * 0.001;
          }
          
          // Apply elevation/depression
          if (configAny.leftShoulder.elevation !== undefined) {
            bone.position.y += configAny.leftShoulder.elevation * 0.001;
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
      }
      
      // Right shoulder/scapula
      if (configAny.rightShoulder) {
        const rightScapulaBones = Object.keys(bones).filter(name => 
          (name.toLowerCase().includes('scapula') || name.toLowerCase().includes('clavicle')) && 
          name.toLowerCase().includes('r')
        );
        
        rightScapulaBones.forEach(boneName => {
          const bone = bones[boneName];
          
          if (configAny.rightShoulder.winging !== undefined) {
            bone.rotation.y = toRad(-configAny.rightShoulder.winging);
          }
          
          if (configAny.rightShoulder.protraction !== undefined) {
            bone.position.z += configAny.rightShoulder.protraction * 0.001;
          }
          
          if (configAny.rightShoulder.elevation !== undefined) {
            bone.position.y += configAny.rightShoulder.elevation * 0.001;
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
      }
    }
  }, [(modelConfig as any)?.leftKnee, (modelConfig as any)?.rightKnee,
      (modelConfig as any)?.leftElbow, (modelConfig as any)?.rightElbow,
      (modelConfig as any)?.leftShoulder, (modelConfig as any)?.rightShoulder]);

  // Apply spinal curve parameters (lordosis and kyphosis) with IK
  useEffect(() => {
    if (!sceneRef.current || !sceneRef.current.bones || !sceneRef.current.ikSolver) return;
    
    const bones = sceneRef.current.bones;
    const ikSolver = sceneRef.current.ikSolver;
    const ikTargets = sceneRef.current.ikTargets;
    const configAny = modelConfig as any;
    
    if (configAny?.spine && ikTargets) {
      // Store current end effector positions before spine adjustment
      const leftHandBone = Object.values(bones).find(b => b.name.includes('HANDL'));
      const rightHandBone = Object.values(bones).find(b => b.name.includes('HANDR'));
      const leftFootBone = Object.values(bones).find(b => b.name.includes('FOOTL'));
      const rightFootBone = Object.values(bones).find(b => b.name.includes('FOOTR'));
      const headBone = Object.values(bones).find(b => b.name.includes('HEAD'));
      
      // Store original positions
      const originalPositions: { [key: string]: THREE.Vector3 } = {};
      
      if (leftHandBone) {
        originalPositions.leftHand = new THREE.Vector3();
        leftHandBone.getWorldPosition(originalPositions.leftHand);
      }
      if (rightHandBone) {
        originalPositions.rightHand = new THREE.Vector3();
        rightHandBone.getWorldPosition(originalPositions.rightHand);
      }
      if (leftFootBone) {
        originalPositions.leftFoot = new THREE.Vector3();
        leftFootBone.getWorldPosition(originalPositions.leftFoot);
      }
      if (rightFootBone) {
        originalPositions.rightFoot = new THREE.Vector3();
        rightFootBone.getWorldPosition(originalPositions.rightFoot);
      }
      
      // Apply spine curves with very small increments
      const spineBones = Object.values(bones).filter(b => {
        const name = b.name.toUpperCase();
        return name.includes('SPINE') || name.includes('CHEST') || 
               name.includes('TORSO') || name.includes('ABDOMEN');
      });
      
      // Apply subtle spine rotations
      spineBones.forEach(bone => {
        const name = bone.name.toUpperCase();
        
        // Reset rotation first
        bone.rotation.set(0, 0, 0);
        
        // Apply very subtle curves based on bone location
        let totalRotationX = 0;
        let totalRotationZ = 0;
        
        // Cervical lordosis (neck curve)
        if (configAny.spine.cervicalLordosis !== undefined && name.includes('NECK')) {
          const deviation = (configAny.spine.cervicalLordosis + 40) * 0.002; // Very subtle
          totalRotationX += THREE.MathUtils.degToRad(deviation);
        }
        
        // Thoracic kyphosis (upper back curve)
        if (configAny.spine.thoracicKyphosis !== undefined && name.includes('CHEST')) {
          const deviation = (configAny.spine.thoracicKyphosis - 35) * 0.002;
          totalRotationX -= THREE.MathUtils.degToRad(deviation);
        }
        
        // Lumbar lordosis (lower back curve)
        if (configAny.spine.lumbarLordosis !== undefined && 
            (name.includes('ABDOMEN') || name.includes('LUMBAR'))) {
          const deviation = (configAny.spine.lumbarLordosis + 50) * 0.002;
          totalRotationX += THREE.MathUtils.degToRad(deviation);
        }
        
        // Scoliosis (lateral curve)
        if (configAny.spine.scoliosis !== undefined) {
          totalRotationZ = THREE.MathUtils.degToRad(configAny.spine.scoliosis * 0.002);
        }
        
        // Apply the rotations
        bone.rotation.x = totalRotationX;
        bone.rotation.z = totalRotationZ;
        bone.updateMatrixWorld(true);
      });
      
      // Update IK targets to maintain original positions
      if (ikTargets.leftHand && originalPositions.leftHand) {
        ikTargets.leftHand.position.copy(originalPositions.leftHand);
      }
      if (ikTargets.rightHand && originalPositions.rightHand) {
        ikTargets.rightHand.position.copy(originalPositions.rightHand);
      }
      if (ikTargets.leftFoot && originalPositions.leftFoot) {
        ikTargets.leftFoot.position.copy(originalPositions.leftFoot);
      }
      if (ikTargets.rightFoot && originalPositions.rightFoot) {
        ikTargets.rightFoot.position.copy(originalPositions.rightFoot);
      }
      
      // Run IK solver to adjust limbs and maintain connectivity
      ikSolver.update();
      
      console.log('Applied spine curves with IK constraints');
    }
  }, [(modelConfig as any)?.spine?.cervicalLordosis, (modelConfig as any)?.spine?.thoracicKyphosis,
      (modelConfig as any)?.spine?.lumbarLordosis, (modelConfig as any)?.spine?.scoliosis]);

  // Apply joint rotations to the skeleton
  const applyJointRotations = () => {
    if (!sceneRef.current || !sceneRef.current.bones) return;
    
    const bones = sceneRef.current.bones;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    // Log available bones for debugging (only once)
    if (Object.keys(bones).length > 0 && !(window as any)['bonesLogged']) {
      console.log('Available bones for control:', Object.keys(bones).filter(name => 
        name.includes('SPINE') || name.includes('NECK') || name.includes('HUMERUS') || 
        name.includes('RADIUS') || name.includes('FEMUR') || name.includes('TIBIA')
      ));
      (window as any)['bonesLogged'] = true;
    }
    
    // Apply rotations to specific bones if they exist
    // Map common bone names - updated for skeleton_rig.glb
    const boneMap: { [key: string]: string[] } = {
      spine: ['SPINE_C', 'SPINE_B', 'SPINE_A', 'Spine', 'spine', 'mixamorigSpine', 'Spine1'],
      neck: ['NECK', 'HEAD', 'Neck', 'neck', 'mixamorigNeck', 'Head'],
      leftShoulder: ['CLAVICLEL', 'HUMERUSL', 'SHOULDERL', 'LeftShoulder', 'left_shoulder', 'mixamorigLeftArm', 'LeftArm'],
      rightShoulder: ['CLAVICLER', 'HUMERUSR', 'SHOULDERR', 'RightShoulder', 'right_shoulder', 'mixamorigRightArm', 'RightArm'],
      leftElbow: ['RADIALFAL', 'RADIALSAL', 'RADIUSL', 'LeftElbow', 'left_elbow', 'mixamorigLeftForeArm', 'LeftForeArm'],
      rightElbow: ['RADIALFAR', 'RADIALSAR', 'RADIUSR', 'RightElbow', 'right_elbow', 'mixamorigRightForeArm', 'RightForeArm'],
      leftHip: ['FEMURL', 'HIPL', 'LeftHip', 'left_hip', 'mixamorigLeftUpLeg', 'LeftUpLeg'],
      rightHip: ['FEMURR', 'HIPR', 'RightHip', 'right_hip', 'mixamorigRightUpLeg', 'RightUpLeg'],
      leftKnee: ['TIBIAL', 'KNEEL', 'LeftKnee', 'left_knee', 'mixamorigLeftLeg', 'LeftLeg'],
      rightKnee: ['TIBIAR', 'KNEER', 'RightKnee', 'right_knee', 'mixamorigRightLeg', 'RightLeg']
    };
    
    // Apply rotations
    Object.entries(jointRotations).forEach(([jointName, rotation]) => {
      const possibleNames = boneMap[jointName] || [];
      let found = false;
      
      for (const boneName of possibleNames) {
        if (bones[boneName]) {
          // Apply rotation
          bones[boneName].rotation.x = toRad(rotation.x);
          bones[boneName].rotation.y = toRad(rotation.y);
          bones[boneName].rotation.z = toRad(rotation.z);
          
          // Update the bone's matrix
          bones[boneName].updateMatrix();
          bones[boneName].updateMatrixWorld(true);
          
          found = true;
          break; // Found and applied, move to next joint
        }
      }
      
      // Log if we couldn't find a bone for this joint (only once)
      if (!found && rotation.x !== 0 && !(window as any)[`${jointName}NotFound`]) {
        console.log(`Could not find bone for ${jointName}. Tried:`, possibleNames);
        console.log('Available bones:', Object.keys(bones).slice(0, 20));
        (window as any)[`${jointName}NotFound`] = true;
      }
    });
  };
  
  // Apply pathology-based rotations to the skeleton
  const applyPathologyRotations = () => {
    if (!sceneRef.current || !sceneRef.current.bones) return;
    
    // Skip if no modelConfig is provided
    if (!modelConfig) return;
    
    const bones = sceneRef.current.bones;
    const toRad = THREE.MathUtils.degToRad;
    const { spinalPathology, shoulderPathology, lowerLimbPathology } = modelConfig;
    
    // Apply spine rotations
    if (spinalPathology) {
      // Find all spine and vertebrae bones, excluding pelvis
      const spineBonesFound: { bone: THREE.Bone, priority: number }[] = [];
      
      Object.keys(bones).forEach(boneName => {
        const lowerName = boneName.toLowerCase();
        let priority = 10; // Default low priority
        
        // Higher priority for actual spine/vertebrae bones
        if (lowerName.includes('vertebr')) {
          priority = 1;
          if (lowerName.includes('l1') || lowerName.includes('l2')) priority = 2;
          if (lowerName.includes('t12') || lowerName.includes('t11')) priority = 3;
          if (lowerName.includes('t1') || lowerName.includes('c7')) priority = 4;
          spineBonesFound.push({ bone: bones[boneName], priority });
        } else if (lowerName.includes('spine') && !lowerName.includes('pelvis')) {
          priority = 5;
          spineBonesFound.push({ bone: bones[boneName], priority });
        } else if (lowerName.includes('thorac') || lowerName.includes('lumbar')) {
          priority = 6;
          spineBonesFound.push({ bone: bones[boneName], priority });
        }
      });
      
      // Sort by priority to get the most appropriate spine bone
      spineBonesFound.sort((a, b) => a.priority - b.priority);
      
      // Apply rotation to all spine bones with graduated effect
      if (spineBonesFound.length > 0) {
        // Log once to debug
        if (!(window as any)['spineBonesLogged']) {
          console.log('Spine bones found for rotation:', spineBonesFound.map(item => item.bone.name));
          (window as any)['spineBonesLogged'] = true;
        }
        
        spineBonesFound.forEach((item, index) => {
          const bone = item.bone;
          
          // Reset rotation first
          bone.rotation.set(0, 0, 0);
          
          // Apply graduated rotation - more rotation for lower spine bones
          const factor = 1.0 - (index * 0.1); // Reduce rotation as we go up the spine
          const clampedFactor = Math.max(0.3, factor); // Minimum 30% rotation
          
          // Apply spine flexion/extension (rotation around X axis)
          if (spinalPathology.spineFlexion !== undefined) {
            bone.rotation.x = toRad(spinalPathology.spineFlexion * clampedFactor);
          }
          
          // Apply spine lateral flexion (rotation around Z axis)
          if (spinalPathology.spineLateralFlexion !== undefined) {
            bone.rotation.z = toRad(spinalPathology.spineLateralFlexion * clampedFactor);
          }
          
          // Apply spine rotation (rotation around Y axis)
          if (spinalPathology.spineRotation !== undefined) {
            bone.rotation.y = toRad(spinalPathology.spineRotation * clampedFactor);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        });
        
        // Find and rotate head/skull bones to match spine movement
        // The head needs the full rotation to stay connected
        Object.keys(bones).forEach(boneName => {
          const lowerName = boneName.toLowerCase();
          
          // Look for head, skull, and cranium bones
          if (lowerName.includes('head') || lowerName.includes('skull') || 
              lowerName.includes('cranium') || lowerName.includes('mandible') ||
              lowerName.includes('maxilla') || lowerName.includes('frontal') ||
              lowerName.includes('parietal') || lowerName.includes('occipital') ||
              lowerName.includes('temporal') || lowerName.includes('sphenoid')) {
            
            const bone = bones[boneName];
            
            // Apply full spine rotation to head bones so they stay connected
            bone.rotation.set(0, 0, 0);
            
            if (spinalPathology.spineFlexion !== undefined) {
              bone.rotation.x = toRad(spinalPathology.spineFlexion);
            }
            
            if (spinalPathology.spineLateralFlexion !== undefined) {
              bone.rotation.z = toRad(spinalPathology.spineLateralFlexion);
            }
            
            if (spinalPathology.spineRotation !== undefined) {
              bone.rotation.y = toRad(spinalPathology.spineRotation);
            }
            
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
          }
          // Apply slightly less rotation to neck bones for natural transition
          else if (lowerName.includes('neck') || lowerName.includes('cervical')) {
            const bone = bones[boneName];
            
            bone.rotation.set(0, 0, 0);
            
            if (spinalPathology.spineFlexion !== undefined) {
              bone.rotation.x = toRad(spinalPathology.spineFlexion * 0.7);
            }
            
            if (spinalPathology.spineLateralFlexion !== undefined) {
              bone.rotation.z = toRad(spinalPathology.spineLateralFlexion * 0.7);
            }
            
            if (spinalPathology.spineRotation !== undefined) {
              bone.rotation.y = toRad(spinalPathology.spineRotation * 0.7);
            }
            
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
          }
        });
        
        // Log head bones for debugging (once only)
        if (!(window as any)['headBonesLogged']) {
          const headBones = Object.keys(bones).filter(name => 
            name.toLowerCase().includes('head') || 
            name.toLowerCase().includes('skull') ||
            name.toLowerCase().includes('cranium')
          );
          if (headBones.length > 0) {
            console.log('Head/skull bones found:', headBones);
          } else {
            console.log('No head/skull bones found - checking all bone names for head-related terms');
            const allBoneNames = Object.keys(bones);
            console.log('Sample bone names:', allBoneNames.slice(0, 30));
          }
          (window as any)['headBonesLogged'] = true;
        }
      }
    }
    
    // Apply shoulder rotations
    if (shoulderPathology) {
      // Left shoulder
      ['HUMERUSL_83', 'HUMERUSL', 'humerusl'].forEach(boneName => {
        if (bones[boneName]) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          
          if (shoulderPathology.shoulderFlexion !== undefined) {
            bone.rotation.x = toRad(shoulderPathology.shoulderFlexion);
          }
          
          if (shoulderPathology.shoulderAbduction !== undefined) {
            bone.rotation.z = toRad(-shoulderPathology.shoulderAbduction);
          }
          
          if (shoulderPathology.shoulderRotation !== undefined) {
            bone.rotation.y = toRad(shoulderPathology.shoulderRotation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
      
      // Right shoulder
      ['HUMERUSR_125', 'HUMERUSR', 'humerusr'].forEach(boneName => {
        if (bones[boneName]) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          
          if (shoulderPathology.shoulderFlexion !== undefined) {
            bone.rotation.x = toRad(shoulderPathology.shoulderFlexion);
          }
          
          if (shoulderPathology.shoulderAbduction !== undefined) {
            bone.rotation.z = toRad(shoulderPathology.shoulderAbduction);
          }
          
          if (shoulderPathology.shoulderRotation !== undefined) {
            bone.rotation.y = toRad(-shoulderPathology.shoulderRotation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
    }
    
    // Apply hip rotations
    if (lowerLimbPathology) {
      // Left hip
      ['FEMURL_233', 'FEMURL', 'femurl'].forEach(boneName => {
        if (bones[boneName]) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          
          if (lowerLimbPathology.hipFlexion !== undefined) {
            bone.rotation.x = toRad(-lowerLimbPathology.hipFlexion);
          }
          
          if (lowerLimbPathology.hipAbduction !== undefined) {
            bone.rotation.z = toRad(-lowerLimbPathology.hipAbduction);
          }
          
          if (lowerLimbPathology.hipRotation !== undefined) {
            bone.rotation.y = toRad(lowerLimbPathology.hipRotation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
      
      // Right hip
      ['FEMURR_194', 'FEMURR', 'femurr'].forEach(boneName => {
        if (bones[boneName]) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          
          if (lowerLimbPathology.hipFlexion !== undefined) {
            bone.rotation.x = toRad(-lowerLimbPathology.hipFlexion);
          }
          
          if (lowerLimbPathology.hipAbduction !== undefined) {
            bone.rotation.z = toRad(lowerLimbPathology.hipAbduction);
          }
          
          if (lowerLimbPathology.hipRotation !== undefined) {
            bone.rotation.y = toRad(-lowerLimbPathology.hipRotation);
          }
          
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
      
      // Knee flexion
      ['TIBIAL_232', 'TIBIAL', 'tibial'].forEach(boneName => {
        if (bones[boneName] && lowerLimbPathology.kneeFlexion !== undefined) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          bone.rotation.x = toRad(lowerLimbPathology.kneeFlexion);
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
      
      ['TIBIAR_193', 'TIBIAR', 'tibiar'].forEach(boneName => {
        if (bones[boneName] && lowerLimbPathology.kneeFlexion !== undefined) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          bone.rotation.x = toRad(lowerLimbPathology.kneeFlexion);
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
      
      // Ankle dorsiflexion
      Object.keys(bones).forEach(boneName => {
        if ((boneName.toLowerCase().includes('foot') || 
             boneName.toLowerCase().includes('ankle')) &&
            lowerLimbPathology.ankleDorsiflexion !== undefined) {
          const bone = bones[boneName];
          bone.rotation.set(0, 0, 0);
          bone.rotation.x = toRad(-lowerLimbPathology.ankleDorsiflexion);
          bone.updateMatrix();
          bone.updateMatrixWorld(true);
        }
      });
    }
    
    // Update skeleton if it exists
    if (sceneRef.current?.skeleton) {
      sceneRef.current.skeleton.update();
    }
  };

  // Apply limb scales to the skeleton
  const applyLimbScales = () => {
    if (!sceneRef.current || !sceneRef.current.model) return;
    
    const model = sceneRef.current.model;
    const bones = sceneRef.current.bones;
    
    // Use modelConfig limbScales if provided, otherwise use state limbScales
    const scales = modelConfig?.limbScales || limbScales;
    
    // Apply overall scale - increased base scale
    model.scale.set(
      0.02 * scales.overall,
      0.02 * scales.overall,
      0.02 * scales.overall
    );
    
    // If we have bones, apply specific limb scales
    if (bones) {
      // Log available bones first time we try to scale
      if (!(window as any)['availableBonesLogged']) {
        // Get all bone names
        const allBones = Object.keys(bones);
        console.log('Total bones available:', allBones.length);
        
        // Find arm-related bones
        const armBones = allBones.filter(name => 
          name.toLowerCase().includes('arm') || 
          name.toLowerCase().includes('humerus') || 
          name.toLowerCase().includes('radius') ||
          name.toLowerCase().includes('ulna') ||
          name.toLowerCase().includes('elbow') ||
          name.toLowerCase().includes('shoulder')
        );
        console.log('Arm-related bones:', armBones);
        
        // Find leg-related bones  
        const legBones = allBones.filter(name =>
          name.toLowerCase().includes('femur') ||
          name.toLowerCase().includes('tibia') ||
          name.toLowerCase().includes('fibula') ||
          name.toLowerCase().includes('leg') ||
          name.toLowerCase().includes('shin')
        );
        console.log('Leg-related bones:', legBones);
        
        (window as any)['availableBonesLogged'] = true;
      }
      
      // Scale upper arms - try multiple possible names
      const upperArmBones = [
        'HUMERUSL', 'HUMERUSR', 
        'humerusl', 'humerusr',
        'MCH_humerusL', 'MCH_humerusR',
        'CONTROL_HUMERUSL', 'CONTROL_HUMERUSR',
        'ARM_L', 'ARM_R',
        'UpperArm_L', 'UpperArm_R'
      ];
      let upperArmScaled = false;
      upperArmBones.forEach(boneName => {
        if (bones[boneName]) {
          bones[boneName].scale.set(1, scales.upperArm, 1);
          bones[boneName].updateMatrix();
          bones[boneName].updateMatrixWorld(true);
          upperArmScaled = true;
          if (scales.upperArm !== 1.0) {
            console.log(`Scaling upper arm ${boneName} to ${scales.upperArm}`);
          }
        }
      });
      
      if (!upperArmScaled && scales.upperArm !== 1.0) {
        // Try to find any bone with 'arm' in the name
        Object.keys(bones).forEach(boneName => {
          if ((boneName.toLowerCase().includes('humerus') || 
               boneName.toLowerCase().includes('upperarm')) && 
              !boneName.toLowerCase().includes('fore')) {
            bones[boneName].scale.set(1, scales.upperArm, 1);
            bones[boneName].updateMatrix();
            bones[boneName].updateMatrixWorld(true);
            console.log(`Found and scaled arm bone: ${boneName}`);
            upperArmScaled = true;
          }
        });
        
        if (!upperArmScaled) {
          console.log('Could not find upper arm bones to scale');
        }
      }
      
      // Scale forearms - try multiple possible names
      const forearmBones = [
        'RADIUSL', 'RADIUSR', 
        'ULNAL', 'ULNAR',
        'radiusl', 'radiusr',
        'ulnal', 'ulnar',
        'RADIALFAL', 'RADIALFAR', 
        'RADIALSAL', 'RADIALSAR',
        'ForeArm_L', 'ForeArm_R',
        'LowerArm_L', 'LowerArm_R'
      ];
      let forearmScaled = false;
      forearmBones.forEach(boneName => {
        if (bones[boneName]) {
          bones[boneName].scale.set(1, scales.forearm, 1);
          bones[boneName].updateMatrix();
          bones[boneName].updateMatrixWorld(true);
          forearmScaled = true;
          if (scales.forearm !== 1.0) {
            console.log(`Scaling forearm ${boneName} to ${scales.forearm}`);
          }
        }
      });
      
      if (!forearmScaled && scales.forearm !== 1.0) {
        // Try to find any bone with 'radius' or 'ulna' in the name
        Object.keys(bones).forEach(boneName => {
          if (boneName.toLowerCase().includes('radius') || 
              boneName.toLowerCase().includes('ulna') ||
              boneName.toLowerCase().includes('forearm')) {
            bones[boneName].scale.set(1, scales.forearm, 1);
            bones[boneName].updateMatrix();
            bones[boneName].updateMatrixWorld(true);
            console.log(`Found and scaled forearm bone: ${boneName}`);
            forearmScaled = true;
          }
        });
      }
      
      // Scale thighs (femur bones)
      const thighBones = ['FEMURL', 'FEMURR', 'MCH_femurL_234', 'MCH_femurR_195'];
      thighBones.forEach(boneName => {
        if (bones[boneName]) {
          bones[boneName].scale.set(1, scales.thigh, 1);
          bones[boneName].updateMatrix();
          bones[boneName].updateMatrixWorld(true);
        }
      });
      
      // Scale shins - try multiple possible names
      const shinBones = [
        'TIBIAL', 'TIBIAR', 
        'FIBULAL', 'FIBULAR',
        'tibial', 'tibiar',
        'fibulal', 'fibular',
        'TIBIA_L', 'TIBIA_R',
        'Shin_L', 'Shin_R',
        'LowerLeg_L', 'LowerLeg_R'
      ];
      let shinScaled = false;
      shinBones.forEach(boneName => {
        if (bones[boneName]) {
          bones[boneName].scale.set(1, scales.shin, 1);
          bones[boneName].updateMatrix();
          bones[boneName].updateMatrixWorld(true);
          shinScaled = true;
          if (scales.shin !== 1.0) {
            console.log(`Scaling shin ${boneName} to ${scales.shin}`);
          }
        }
      });
      
      if (!shinScaled && scales.shin !== 1.0) {
        // Try to find any bone with 'tibia' or 'fibula' in the name
        Object.keys(bones).forEach(boneName => {
          if ((boneName.toLowerCase().includes('tibia') || 
               boneName.toLowerCase().includes('fibula') ||
               boneName.toLowerCase().includes('shin')) &&
              !boneName.toLowerCase().includes('toe')) {
            bones[boneName].scale.set(1, scales.shin, 1);
            bones[boneName].updateMatrix();
            bones[boneName].updateMatrixWorld(true);
            console.log(`Found and scaled shin bone: ${boneName}`);
            shinScaled = true;
          }
        });
      }
      
      // Scale spine if available in scales
      if ('spine' in scales) {
        const spineBones = ['SPINE_A', 'SPINE_B', 'SPINE_C', 'SPINE_D'];
        spineBones.forEach(boneName => {
          if (bones[boneName]) {
            bones[boneName].scale.y = (scales as any).spine;
            bones[boneName].updateMatrix();
            bones[boneName].updateMatrixWorld(true);
          }
        });
      }
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
                      onValueChange={([value]) => {
                        console.log('Spine flexion changed to:', value);
                        setJointRotations(prev => ({...prev, spine: {...prev.spine, x: value}}));
                      }}
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
                        console.log('Shoulder flexion changed to:', value);
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
                      onValueChange={([value]) => {
                        console.log('Upper arm scale changed to:', value);
                        setLimbScales(prev => ({...prev, upperArm: value}));
                      }}
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