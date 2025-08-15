import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FBXSkeletonViewerProps {
  modelConfig?: any;
  selectedTest?: string;
  selectedExercise?: string;
  animationSpeed?: number;
  repetitions?: number;
  selectedSide?: 'both' | 'left' | 'right';
  isFullscreen?: boolean;
}

export default function FBXSkeletonViewer({
  modelConfig,
  selectedTest,
  selectedExercise,
  animationSpeed = 1,
  repetitions = 10,
  selectedSide = 'both',
  isFullscreen = false
}: FBXSkeletonViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const frameRef = useRef<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bone mapping for the FBX model - adjust these based on your model's bone names
  const boneMap = useRef<{ [key: string]: THREE.Bone | null }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.2, 1.5); // Even closer camera position
    camera.lookAt(0, 0.8, 0); // Looking at center of skeleton
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;  // Allow very close zoom
    controls.maxDistance = 3;  // Further limit max zoom out
    controls.target.set(0, 0.8, 0); // Focus on center of skeleton
    controls.update();
    controlsRef.current = controls;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xe0e0e0 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // Load FBX model
    const loader = new FBXLoader();
    setLoading(true);
    setError(null);
    
    console.log('Starting to load FBX model from /skeleton-model.fbx');

    loader.load(
      '/skeleton-model.fbx',
      (fbx: THREE.Group) => {
        console.log('FBX model loaded successfully', fbx);
        modelRef.current = fbx;
        
        // Scale and position the model - further increased for better visibility
        fbx.scale.set(0.025, 0.025, 0.025); // Significantly increased scale
        fbx.position.set(0, 0.2, 0); // Slightly raised to center in view
        
        // Enable shadows
        fbx.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Make the material double-sided to see all faces
            if (child.material) {
              (child.material as THREE.Material).side = THREE.DoubleSide;
            }
          }
          
          // Store bone references for animation
          if (child instanceof THREE.Bone) {
            boneMap.current[child.name] = child;
            console.log('Found bone:', child.name);
            
            // Diagnostic logging for spine bones
            if (child.name.toLowerCase().includes('spine') || 
                child.name.toLowerCase().includes('pelvis') || 
                child.name.toLowerCase().includes('ribcage')) {
              console.log(`Bone: ${child.name}`);
              console.log(`  - World Position:`, child.getWorldPosition(new THREE.Vector3()));
              console.log(`  - Local Position:`, child.position);
              console.log(`  - Rotation (euler):`, child.rotation);
              console.log(`  - Scale:`, child.scale);
              
              // Check parent bone
              if (child.parent && child.parent instanceof THREE.Bone) {
                console.log(`  - Parent: ${child.parent.name}`);
              }
            }
          }
        });

        scene.add(fbx);
        
        // Add bone visualization helper
        const boneHelper = new THREE.SkeletonHelper(fbx);
        boneHelper.visible = true;
        scene.add(boneHelper);

        // Create animation mixer for the model
        mixerRef.current = new THREE.AnimationMixer(fbx);

        // Apply initial configuration if provided
        if (modelConfig) {
          applyModelConfiguration(fbx, modelConfig);
        }

        setLoading(false);
      },
      (progress: ProgressEvent<EventTarget>) => {
        console.log('Loading progress:', (progress.loaded / progress.total) * 100, '%');
      },
      (error: unknown) => {
        console.error('Error loading FBX model:', error);
        setError('Failed to load skeleton model');
        setLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update animations
      if (mixerRef.current) {
        const delta = clockRef.current.getDelta();
        mixerRef.current.update(delta * animationSpeed);
      }

      // Apply movement tests or exercises
      if (modelRef.current) {
        if (selectedTest) {
          applyMovementTest(selectedTest);
        } else if (selectedExercise) {
          applyExercise(selectedExercise);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // React to configuration changes
  useEffect(() => {
    if (modelRef.current && modelConfig) {
      applyModelConfiguration(modelRef.current, modelConfig);
    }
  }, [modelConfig]);

  // Apply model configuration (limb scales, pathologies, etc.)
  const applyModelConfiguration = (model: THREE.Group, config: any) => {
    if (!config) return;

    // Apply limb scales using exact bone names from the FBX
    if (config.limbScales) {
      // Upper arm scaling
      if (config.limbScales.upperArm !== undefined) {
        const rightArm = boneMap.current['HumerusR'];
        const leftArm = boneMap.current['HumerusL'];
        if (rightArm) rightArm.scale.setScalar(config.limbScales.upperArm);
        if (leftArm) leftArm.scale.setScalar(config.limbScales.upperArm);
      }
      
      // Forearm scaling
      if (config.limbScales.forearm !== undefined) {
        const rightForearm = boneMap.current['Radius_AlnaR'];
        const leftForearm = boneMap.current['Radius_AlnaL'];
        if (rightForearm) rightForearm.scale.setScalar(config.limbScales.forearm);
        if (leftForearm) leftForearm.scale.setScalar(config.limbScales.forearm);
      }
      
      // Thigh scaling
      if (config.limbScales.thigh !== undefined) {
        const rightThigh = boneMap.current['FemurR'];
        const leftThigh = boneMap.current['FemurL'];
        if (rightThigh) rightThigh.scale.setScalar(config.limbScales.thigh);
        if (leftThigh) leftThigh.scale.setScalar(config.limbScales.thigh);
      }
      
      // Shin scaling  
      if (config.limbScales.shin !== undefined) {
        const rightShin = boneMap.current['fibula_tibiaR'];
        const leftShin = boneMap.current['fibula_tibiaL'];
        if (rightShin) rightShin.scale.setScalar(config.limbScales.shin);
        if (leftShin) leftShin.scale.setScalar(config.limbScales.shin);
      }
      
      // Torso/Spine scaling
      if (config.limbScales.torso !== undefined) {
        const spine = boneMap.current['Spine'];
        const spine1 = boneMap.current['Spine_1'];
        const spine2 = boneMap.current['Spine_2'];
        const ribCage = boneMap.current['RibCage'];
        if (spine) spine.scale.setScalar(config.limbScales.torso);
        if (spine1) spine1.scale.setScalar(config.limbScales.torso);
        if (spine2) spine2.scale.setScalar(config.limbScales.torso);
        if (ribCage) ribCage.scale.setScalar(config.limbScales.torso);
      }

      // Apply overall scale to the entire model
      if (config.limbScales.overall !== undefined) {
        model.scale.set(0.025 * config.limbScales.overall, 0.025 * config.limbScales.overall, 0.025 * config.limbScales.overall);
      }
    }

    // Apply pathologies (shoulder, spine, lower limb)
    if (config.shoulderPathology) {
      applyShoulderPathology(model, config.shoulderPathology);
    }

    if (config.spinalPathology) {
      applySpinalPathology(model, config.spinalPathology);
    }

    if (config.lowerLimbPathology) {
      applyLowerLimbPathology(model, config.lowerLimbPathology);
    }
  };

  // Apply shoulder pathology
  const applyShoulderPathology = (model: THREE.Group, pathology: any) => {
    // Use correct bone names from the FBX
    const leftShoulder = boneMap.current['Humerus_rootL'];
    const rightShoulder = boneMap.current['Humerus_rootR'];
    const leftArm = boneMap.current['HumerusL'];
    const rightArm = boneMap.current['HumerusR'];

    if (pathology.scapularWinging !== undefined && (leftShoulder || rightShoulder)) {
      const wingAngle = (pathology.scapularWinging / 10) * 0.3; // Reduced for subtlety
      if (leftShoulder) {
        leftShoulder.rotation.z = wingAngle;
      }
      if (rightShoulder) {
        rightShoulder.rotation.z = -wingAngle;
      }
    }

    if (pathology.acSeparation !== undefined && rightShoulder) {
      rightShoulder.position.y += pathology.acSeparation * 0.002;
    }

    if (pathology.ghSubluxation !== undefined && leftArm && rightArm) {
      leftArm.position.x -= pathology.ghSubluxation * 0.002;
      rightArm.position.x += pathology.ghSubluxation * 0.002;
    }
  };

  // Apply spinal pathology
  const applySpinalPathology = (model: THREE.Group, pathology: any) => {
    // Use correct spine bone names from the FBX
    const spine = boneMap.current['Spine'];
    const spine1 = boneMap.current['Spine_1'];
    const spine2 = boneMap.current['Spine_2'];
    
    if (pathology.scoliosis !== undefined) {
      const curve = (pathology.scoliosis / 100) * Math.PI / 8;
      if (spine) spine.rotation.z = curve * 0.5;
      if (spine1) spine1.rotation.z = curve;
      if (spine2) spine2.rotation.z = -curve * 0.5;
    }
    
    if (pathology.kyphosis !== undefined && spine2) {
      spine2.rotation.x = (pathology.kyphosis / 100) * Math.PI / 6;
    }

    if (pathology.lordosis !== undefined && spine1) {
      spine1.rotation.x = -(pathology.lordosis / 100) * Math.PI / 6;
    }
  };

  // Apply lower limb pathology
  const applyLowerLimbPathology = (model: THREE.Group, pathology: any) => {
    // Use correct bone names from the FBX
    const leftKnee = boneMap.current['fibula_tibiaL'];
    const rightKnee = boneMap.current['fibula_tibiaR'];
    const leftFemur = boneMap.current['FemurL'];
    const rightFemur = boneMap.current['FemurR'];

    if (pathology.kneeVarusValgus !== undefined) {
      const angle = (pathology.kneeVarusValgus / 100) * Math.PI / 8;
      if (leftKnee) leftKnee.rotation.z = angle;
      if (rightKnee) rightKnee.rotation.z = -angle;
    }

    if (pathology.genuVarum !== undefined && leftKnee && rightKnee) {
      const angle = (pathology.genuVarum / 100) * Math.PI / 10;
      leftKnee.rotation.z = angle;
      rightKnee.rotation.z = angle;
    }

    if (pathology.genuValgum !== undefined && leftKnee && rightKnee) {
      const angle = -(pathology.genuValgum / 100) * Math.PI / 10;
      leftKnee.rotation.z = angle;
      rightKnee.rotation.z = angle;
    }
    
    if (pathology.tibialTorsion !== undefined && leftKnee && rightKnee) {
      const torsion = (pathology.tibialTorsion / 100) * Math.PI / 6;
      leftKnee.rotation.y = torsion;
      rightKnee.rotation.y = torsion;
    }
  };

  // Apply movement test animations
  const applyMovementTest = (test: string) => {
    const time = Date.now() * 0.001 * animationSpeed;
    
    switch (test) {
      case 'shoulder-abduction':
        animateShoulderAbduction(time);
        break;
      case 'knee-flexion':
        animateKneeFlexion(time);
        break;
      case 'hip-abduction':
        animateHipAbduction(time);
        break;
      case 'cervical-rotation':
        animateCervicalRotation(time);
        break;
      case 'trunk-flexion':
        animateTrunkFlexion(time);
        break;
      default:
        break;
    }
  };

  // Apply exercise animations
  const applyExercise = (exercise: string) => {
    const time = Date.now() * 0.001 * animationSpeed;
    
    // Implement exercise-specific animations
    // This would be similar to movement tests but with different patterns
    console.log('Applying exercise:', exercise);
  };

  // Animation functions for movement tests
  const animateShoulderAbduction = (time: number) => {
    const leftArm = boneMap.current['LeftArm'] || boneMap.current['L_UpperArm'];
    const rightArm = boneMap.current['RightArm'] || boneMap.current['R_UpperArm'];
    
    const angle = Math.sin(time) * Math.PI / 2; // 0 to 90 degrees
    
    if (selectedSide === 'left' || selectedSide === 'both') {
      if (leftArm) {
        leftArm.rotation.z = angle;
      }
    }
    
    if (selectedSide === 'right' || selectedSide === 'both') {
      if (rightArm) {
        rightArm.rotation.z = -angle;
      }
    }
  };

  const animateKneeFlexion = (time: number) => {
    const leftKnee = boneMap.current['LeftKnee'] || boneMap.current['L_Knee'];
    const rightKnee = boneMap.current['RightKnee'] || boneMap.current['R_Knee'];
    
    const angle = Math.abs(Math.sin(time)) * Math.PI / 2; // 0 to 90 degrees
    
    if (selectedSide === 'left' || selectedSide === 'both') {
      if (leftKnee) {
        leftKnee.rotation.x = -angle;
      }
    }
    
    if (selectedSide === 'right' || selectedSide === 'both') {
      if (rightKnee) {
        rightKnee.rotation.x = -angle;
      }
    }
  };

  const animateHipAbduction = (time: number) => {
    const leftHip = boneMap.current['LeftUpLeg'] || boneMap.current['L_Thigh'];
    const rightHip = boneMap.current['RightUpLeg'] || boneMap.current['R_Thigh'];
    
    const angle = Math.sin(time) * Math.PI / 6; // 0 to 30 degrees
    
    if (selectedSide === 'left' || selectedSide === 'both') {
      if (leftHip) {
        leftHip.rotation.z = angle;
      }
    }
    
    if (selectedSide === 'right' || selectedSide === 'both') {
      if (rightHip) {
        rightHip.rotation.z = -angle;
      }
    }
  };

  const animateCervicalRotation = (time: number) => {
    const neck = boneMap.current['Neck'] || boneMap.current['Head'];
    
    if (neck) {
      neck.rotation.y = Math.sin(time) * Math.PI / 3; // -60 to 60 degrees
    }
  };

  const animateTrunkFlexion = (time: number) => {
    const spine = boneMap.current['Spine'] || boneMap.current['Spine1'];
    
    if (spine) {
      spine.rotation.x = Math.abs(Math.sin(time)) * Math.PI / 4; // 0 to 45 degrees
    }
  };

  // Update configuration when props change
  useEffect(() => {
    if (modelRef.current && modelConfig) {
      applyModelConfiguration(modelRef.current, modelConfig);
    }
  }, [modelConfig]);

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen' : 'h-[600px]'} bg-gray-100 rounded-lg overflow-hidden`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading skeleton model...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div ref={mountRef} className="w-full h-full" />
      
      {!loading && !error && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-2 rounded shadow">
          <p className="text-xs text-gray-600">Use mouse to rotate • Scroll to zoom</p>
        </div>
      )}
    </div>
  );
}