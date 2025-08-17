import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

interface MixamoSkeletonProps {
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

export default function MixamoSkeleton({
  patientData,
  className = '',
  showControls = true,
  modelUrl
}: MixamoSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    model?: THREE.Group;
    skeleton?: THREE.Skeleton;
    mixer?: THREE.AnimationMixer;
    clock: THREE.Clock;
    mouseX: number;
    mouseY: number;
    bones: { [key: string]: THREE.Bone };
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50); // Fog for actual model scale

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 5); // Camera positioned for actual model size
    camera.lookAt(0, 1, 0); // Look at center of model

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
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Grid helper - sized for actual model
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.receiveShadow = true;
    scene.add(gridHelper);

    // Initialize scene reference
    sceneRef.current = {
      scene,
      camera,
      renderer,
      clock: new THREE.Clock(),
      mouseX: 0,
      mouseY: 0,
      bones: {}
    };

    // Default to Mixamo FBX if no model URL provided
    const urlToLoad = modelUrl || 'models/mixamo-skeleton.fbx';
    
    // Create or load model
    if (urlToLoad && (urlToLoad.endsWith('.glb') || urlToLoad.endsWith('.gltf') || urlToLoad.endsWith('.fbx'))) {
      // Load external Mixamo model
      const loader = urlToLoad.endsWith('.fbx') ? new FBXLoader() : new GLTFLoader();
      
      console.log('Loading model from:', urlToLoad);
      
      loader.load(
        urlToLoad,
        (result: any) => {
          console.log('Model loaded successfully:', result);
          const model = urlToLoad.endsWith('.fbx') ? result : result.scene;
          
          // Scale and position model - much larger scale needed
          model.scale.set(1, 1, 1); // Full size for Mixamo model
          model.position.set(0, 0, 0); // Center at origin
          
          // Enable shadows and fix materials
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = false; // Ensure mesh is always rendered
              
              if (child.material) {
                // Ensure material is visible
                child.material.side = THREE.DoubleSide;
                child.material.transparent = false;
                child.material.opacity = 1;
                
                // Add some color if material is too dark
                if (child.material.color) {
                  child.material.color.setHex(0x888888);
                }
              }
            }
          });
          
          // Find skeleton and bones
          let skeleton: THREE.Skeleton | undefined;
          const bones: { [key: string]: THREE.Bone } = {};
          
          model.traverse((child: any) => {
            if (child.isSkinnedMesh && child.skeleton) {
              skeleton = child.skeleton;
              console.log('Found skeleton with', skeleton.bones.length, 'bones');
              
              // Map bones by name
              if (skeleton) {
                skeleton.bones.forEach((bone: THREE.Bone) => {
                  bones[bone.name] = bone;
                  console.log('Bone:', bone.name);
                  
                  // Also map common variations - handle both mixamorig: and mixamorig prefixes
                  if (bone.name.includes('mixamorig:')) {
                    const shortName = bone.name.replace('mixamorig:', '');
                    bones[shortName] = bone;
                    console.log('Mapped short name from mixamorig:', shortName);
                  } else if (bone.name.startsWith('mixamorig')) {
                    // Handle mixamorig prefix without colon
                    const shortName = bone.name.replace('mixamorig', '');
                    bones[shortName] = bone;
                    console.log('Mapped short name from mixamorig:', shortName);
                  }
                });
              }
            }
          });
          
          console.log('All bone names:', Object.keys(bones));
          
          // Setup animation mixer if model has animations
          let mixer: THREE.AnimationMixer | undefined;
          if (result.animations && result.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(result.animations[0]);
            action.play();
            
            if (sceneRef.current) {
              sceneRef.current.mixer = mixer;
            }
          }
          
          scene.add(model);
          console.log('Model added to scene. Position:', model.position, 'Scale:', model.scale);
          console.log('Model bounds:', new THREE.Box3().setFromObject(model));
          
          if (sceneRef.current) {
            sceneRef.current.model = model;
            sceneRef.current.skeleton = skeleton;
            sceneRef.current.bones = bones;
          }
          
          setIsLoading(false);
          applySliderValues();
        },
        (progress) => {
          console.log('Loading model...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
        },
        (error) => {
          console.error('Error loading model:', error);
          console.error('Error details:', error.message || error);
          setError(`Failed to load model: ${error.message || 'Unknown error'}`);
          createFallbackSkeleton();
        }
      );
    } else {
      // Create procedural Mixamo-compatible skeleton
      createFallbackSkeleton();
    }

    function createFallbackSkeleton() {
      const skeletonGroup = new THREE.Group();
      const bones: { [key: string]: THREE.Bone } = {};
      const boneArray: THREE.Bone[] = [];
      
      // Create Mixamo-compatible bone hierarchy
      // Root
      const hips = new THREE.Bone();
      hips.name = 'Hips';
      hips.position.set(0, 1, 0);
      bones['Hips'] = hips;
      boneArray.push(hips);
      
      // Spine chain
      const spine = new THREE.Bone();
      spine.name = 'Spine';
      spine.position.set(0, 0.1, 0);
      hips.add(spine);
      bones['Spine'] = spine;
      boneArray.push(spine);
      
      const spine1 = new THREE.Bone();
      spine1.name = 'Spine1';
      spine1.position.set(0, 0.15, 0);
      spine.add(spine1);
      bones['Spine1'] = spine1;
      boneArray.push(spine1);
      
      const spine2 = new THREE.Bone();
      spine2.name = 'Spine2';
      spine2.position.set(0, 0.15, 0);
      spine1.add(spine2);
      bones['Spine2'] = spine2;
      boneArray.push(spine2);
      
      const neck = new THREE.Bone();
      neck.name = 'Neck';
      neck.position.set(0, 0.2, 0);
      spine2.add(neck);
      bones['Neck'] = neck;
      boneArray.push(neck);
      
      const head = new THREE.Bone();
      head.name = 'Head';
      head.position.set(0, 0.15, 0);
      neck.add(head);
      bones['Head'] = head;
      boneArray.push(head);
      
      // Left Arm chain
      const leftShoulder = new THREE.Bone();
      leftShoulder.name = 'LeftShoulder';
      leftShoulder.position.set(0.05, 0.15, 0);
      spine2.add(leftShoulder);
      bones['LeftShoulder'] = leftShoulder;
      boneArray.push(leftShoulder);
      
      const leftArm = new THREE.Bone();
      leftArm.name = 'LeftArm';
      leftArm.position.set(0.12, 0, 0);
      leftShoulder.add(leftArm);
      bones['LeftArm'] = leftArm;
      boneArray.push(leftArm);
      
      const leftForeArm = new THREE.Bone();
      leftForeArm.name = 'LeftForeArm';
      leftForeArm.position.set(0.25, 0, 0);
      leftArm.add(leftForeArm);
      bones['LeftForeArm'] = leftForeArm;
      boneArray.push(leftForeArm);
      
      const leftHand = new THREE.Bone();
      leftHand.name = 'LeftHand';
      leftHand.position.set(0.25, 0, 0);
      leftForeArm.add(leftHand);
      bones['LeftHand'] = leftHand;
      boneArray.push(leftHand);
      
      // Right Arm chain
      const rightShoulder = new THREE.Bone();
      rightShoulder.name = 'RightShoulder';
      rightShoulder.position.set(-0.05, 0.15, 0);
      spine2.add(rightShoulder);
      bones['RightShoulder'] = rightShoulder;
      boneArray.push(rightShoulder);
      
      const rightArm = new THREE.Bone();
      rightArm.name = 'RightArm';
      rightArm.position.set(-0.12, 0, 0);
      rightShoulder.add(rightArm);
      bones['RightArm'] = rightArm;
      boneArray.push(rightArm);
      
      const rightForeArm = new THREE.Bone();
      rightForeArm.name = 'RightForeArm';
      rightForeArm.position.set(-0.25, 0, 0);
      rightArm.add(rightForeArm);
      bones['RightForeArm'] = rightForeArm;
      boneArray.push(rightForeArm);
      
      const rightHand = new THREE.Bone();
      rightHand.name = 'RightHand';
      rightHand.position.set(-0.25, 0, 0);
      rightForeArm.add(rightHand);
      bones['RightHand'] = rightHand;
      boneArray.push(rightHand);
      
      // Left Leg chain
      const leftUpLeg = new THREE.Bone();
      leftUpLeg.name = 'LeftUpLeg';
      leftUpLeg.position.set(0.1, -0.05, 0);
      hips.add(leftUpLeg);
      bones['LeftUpLeg'] = leftUpLeg;
      boneArray.push(leftUpLeg);
      
      const leftLeg = new THREE.Bone();
      leftLeg.name = 'LeftLeg';
      leftLeg.position.set(0, -0.45, 0);
      leftUpLeg.add(leftLeg);
      bones['LeftLeg'] = leftLeg;
      boneArray.push(leftLeg);
      
      const leftFoot = new THREE.Bone();
      leftFoot.name = 'LeftFoot';
      leftFoot.position.set(0, -0.45, 0);
      leftLeg.add(leftFoot);
      bones['LeftFoot'] = leftFoot;
      boneArray.push(leftFoot);
      
      const leftToeBase = new THREE.Bone();
      leftToeBase.name = 'LeftToeBase';
      leftToeBase.position.set(0, -0.05, 0.1);
      leftFoot.add(leftToeBase);
      bones['LeftToeBase'] = leftToeBase;
      boneArray.push(leftToeBase);
      
      // Right Leg chain
      const rightUpLeg = new THREE.Bone();
      rightUpLeg.name = 'RightUpLeg';
      rightUpLeg.position.set(-0.1, -0.05, 0);
      hips.add(rightUpLeg);
      bones['RightUpLeg'] = rightUpLeg;
      boneArray.push(rightUpLeg);
      
      const rightLeg = new THREE.Bone();
      rightLeg.name = 'RightLeg';
      rightLeg.position.set(0, -0.45, 0);
      rightUpLeg.add(rightLeg);
      bones['RightLeg'] = rightLeg;
      boneArray.push(rightLeg);
      
      const rightFoot = new THREE.Bone();
      rightFoot.name = 'RightFoot';
      rightFoot.position.set(0, -0.45, 0);
      rightLeg.add(rightFoot);
      bones['RightFoot'] = rightFoot;
      boneArray.push(rightFoot);
      
      const rightToeBase = new THREE.Bone();
      rightToeBase.name = 'RightToeBase';
      rightToeBase.position.set(0, -0.05, 0.1);
      rightFoot.add(rightToeBase);
      bones['RightToeBase'] = rightToeBase;
      boneArray.push(rightToeBase);
      
      // Create skeleton
      const skeleton = new THREE.Skeleton(boneArray);
      
      // Create skinned mesh
      const geometry = createHumanoidGeometry();
      const material = new THREE.MeshPhongMaterial({
        color: 0xe8d5c4,
        side: THREE.DoubleSide
      });
      
      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
      skinnedMesh.bind(skeleton);
      skinnedMesh.castShadow = true;
      skinnedMesh.receiveShadow = true;
      
      // Add skeleton helper for visualization
      const skeletonHelper = new THREE.SkeletonHelper(hips);
      scene.add(skeletonHelper);
      
      skeletonGroup.add(hips);
      skeletonGroup.add(skinnedMesh);
      scene.add(skeletonGroup);
      
      if (sceneRef.current) {
        sceneRef.current.model = skeletonGroup;
        sceneRef.current.skeleton = skeleton;
        sceneRef.current.bones = bones;
      }
      
      setIsLoading(false);
      applySliderValues();
    }

    function createHumanoidGeometry(): THREE.BufferGeometry {
      // Create a simple humanoid geometry
      const geometry = new THREE.BoxGeometry(1, 2, 0.5);
      
      // Add skinning attributes
      const skinIndices: number[] = [];
      const skinWeights: number[] = [];
      
      // Simple weight painting - assign vertices to nearest bones
      const positionAttribute = geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        const y = positionAttribute.getY(i);
        
        if (y > 0.5) {
          // Upper body - assign to spine/chest
          skinIndices.push(2, 3, 0, 0);
          skinWeights.push(0.5, 0.5, 0, 0);
        } else if (y > -0.5) {
          // Mid body - assign to hips/spine
          skinIndices.push(0, 1, 0, 0);
          skinWeights.push(0.7, 0.3, 0, 0);
        } else {
          // Lower body - assign to legs
          skinIndices.push(13, 17, 0, 0);
          skinWeights.push(0.5, 0.5, 0, 0);
        }
      }
      
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
      
      return geometry;
    }

    function applySliderValues() {
      if (!sceneRef.current || !sceneRef.current.bones) return;
      
      const bones = sceneRef.current.bones;
      const restrictions = patientData?.jointRestrictions;
      
      if (!restrictions) {
        console.log('No restrictions to apply');
        return;
      }
      
      console.log('Applying slider values with bones:', Object.keys(bones));
      console.log('Restrictions:', restrictions);
      
      // Apply shoulder restrictions - try multiple bone name variations
      const leftArmBone = bones['LeftArm'] || bones['LeftShoulder'] || bones['LeftUpperArm'] || bones['mixamorig:LeftArm'];
      const rightArmBone = bones['RightArm'] || bones['RightShoulder'] || bones['RightUpperArm'] || bones['mixamorig:RightArm'];
      
      if (restrictions.shoulder && leftArmBone) {
        const shoulder = restrictions.shoulder;
        if (shoulder.flexion !== undefined) {
          leftArmBone.rotation.x = THREE.MathUtils.degToRad(shoulder.flexion * 0.9);
        }
        if (shoulder.abduction !== undefined) {
          leftArmBone.rotation.z = THREE.MathUtils.degToRad(shoulder.abduction * 0.9);
        }
        if (shoulder.rotation !== undefined) {
          leftArmBone.rotation.y = THREE.MathUtils.degToRad(shoulder.rotation * 0.9);
        }
      }
      
      if (restrictions.shoulder && rightArmBone) {
        const shoulder = restrictions.shoulder;
        if (shoulder.flexion !== undefined) {
          rightArmBone.rotation.x = THREE.MathUtils.degToRad(shoulder.flexion * 0.9);
        }
        if (shoulder.abduction !== undefined) {
          rightArmBone.rotation.z = THREE.MathUtils.degToRad(-shoulder.abduction * 0.9);
        }
        if (shoulder.rotation !== undefined) {
          rightArmBone.rotation.y = THREE.MathUtils.degToRad(-shoulder.rotation * 0.9);
        }
      }
      
      // Apply elbow restrictions - try multiple bone name variations
      const leftForeArmBone = bones['LeftForeArm'] || bones['LeftLowerArm'] || bones['mixamorig:LeftForeArm'];
      const rightForeArmBone = bones['RightForeArm'] || bones['RightLowerArm'] || bones['mixamorig:RightForeArm'];
      
      if (restrictions.elbow) {
        if (leftForeArmBone && restrictions.elbow.flexion !== undefined) {
          leftForeArmBone.rotation.x = THREE.MathUtils.degToRad(-restrictions.elbow.flexion);
        }
        if (rightForeArmBone && restrictions.elbow.flexion !== undefined) {
          rightForeArmBone.rotation.x = THREE.MathUtils.degToRad(-restrictions.elbow.flexion);
        }
      }
      
      // Apply hip restrictions - try multiple bone name variations
      const leftUpLegBone = bones['LeftUpLeg'] || bones['LeftThigh'] || bones['LeftUpperLeg'] || bones['mixamorig:LeftUpLeg'];
      const rightUpLegBone = bones['RightUpLeg'] || bones['RightThigh'] || bones['RightUpperLeg'] || bones['mixamorig:RightUpLeg'];
      
      if (restrictions.hip) {
        if (leftUpLegBone && restrictions.hip.flexion !== undefined) {
          leftUpLegBone.rotation.x = THREE.MathUtils.degToRad(-restrictions.hip.flexion * 0.9);
        }
        if (rightUpLegBone && restrictions.hip.flexion !== undefined) {
          rightUpLegBone.rotation.x = THREE.MathUtils.degToRad(-restrictions.hip.flexion * 0.9);
        }
      }
      
      // Apply knee restrictions - try multiple bone name variations
      const leftLegBone = bones['LeftLeg'] || bones['LeftShin'] || bones['LeftLowerLeg'] || bones['mixamorig:LeftLeg'];
      const rightLegBone = bones['RightLeg'] || bones['RightShin'] || bones['RightLowerLeg'] || bones['mixamorig:RightLeg'];
      
      if (restrictions.knee) {
        if (leftLegBone && restrictions.knee.flexion !== undefined) {
          leftLegBone.rotation.x = THREE.MathUtils.degToRad(restrictions.knee.flexion);
        }
        if (rightLegBone && restrictions.knee.flexion !== undefined) {
          rightLegBone.rotation.x = THREE.MathUtils.degToRad(restrictions.knee.flexion);
        }
      }
      
      // Apply spine restrictions - try multiple bone name variations
      const spineBone = bones['Spine'] || bones['mixamorig:Spine'];
      const spine1Bone = bones['Spine1'] || bones['mixamorig:Spine1'];
      const spine2Bone = bones['Spine2'] || bones['mixamorig:Spine2'];
      
      if (restrictions.spine && spineBone) {
        const spine = restrictions.spine;
        if (spine.flexion !== undefined) {
          spineBone.rotation.x = THREE.MathUtils.degToRad(spine.flexion * 0.3);
          if (spine1Bone) spine1Bone.rotation.x = THREE.MathUtils.degToRad(spine.flexion * 0.3);
          if (spine2Bone) spine2Bone.rotation.x = THREE.MathUtils.degToRad(spine.flexion * 0.3);
        }
        if (spine.rotation !== undefined) {
          spineBone.rotation.y = THREE.MathUtils.degToRad(spine.rotation * 0.5);
        }
      }
      
      // Apply neck restrictions - try multiple bone name variations
      const neckBone = bones['Neck'] || bones['mixamorig:Neck'];
      const headBone = bones['Head'] || bones['mixamorig:Head'];
      
      if (restrictions.neck) {
        const neck = restrictions.neck;
        const targetBone = neckBone || headBone; // Use head if neck not found
        
        if (targetBone) {
          if (neck.flexion !== undefined) {
            targetBone.rotation.x = THREE.MathUtils.degToRad(neck.flexion * 0.7);
          }
          if (neck.rotation !== undefined) {
            targetBone.rotation.y = THREE.MathUtils.degToRad(neck.rotation * 0.7);
          }
        }
      }
      
      // Apply limb scaling based on anthropometrics
      if (patientData?.anthropometrics?.limbLengths) {
        const limbs = patientData.anthropometrics.limbLengths;
        
        // Try to find bones with various naming conventions
        const leftArmBone = bones['LeftArm'] || bones['mixamorigLeftArm'] || bones['mixamorig:LeftArm'];
        const rightArmBone = bones['RightArm'] || bones['mixamorigRightArm'] || bones['mixamorig:RightArm'];
        const leftForeArmBone = bones['LeftForeArm'] || bones['mixamorigLeftForeArm'] || bones['mixamorig:LeftForeArm'];
        const rightForeArmBone = bones['RightForeArm'] || bones['mixamorigRightForeArm'] || bones['mixamorig:RightForeArm'];
        const leftUpLegBone = bones['LeftUpLeg'] || bones['mixamorigLeftUpLeg'] || bones['mixamorig:LeftUpLeg'];
        const rightUpLegBone = bones['RightUpLeg'] || bones['mixamorigRightUpLeg'] || bones['mixamorig:RightUpLeg'];
        const leftLegBone = bones['LeftLeg'] || bones['mixamorigLeftLeg'] || bones['mixamorig:LeftLeg'];
        const rightLegBone = bones['RightLeg'] || bones['mixamorigRightLeg'] || bones['mixamorig:RightLeg'];
        const spineBone = bones['Spine'] || bones['mixamorigSpine'] || bones['mixamorig:Spine'];
        const spine1Bone = bones['Spine1'] || bones['mixamorigSpine1'] || bones['mixamorig:Spine1'];
        const spine2Bone = bones['Spine2'] || bones['mixamorigSpine2'] || bones['mixamorig:Spine2'];
        
        // Apply upper arm scaling
        if (leftArmBone && limbs.upperArm) {
          leftArmBone.scale.x = limbs.upperArm / 30; // Normalize to base value
        }
        if (rightArmBone && limbs.upperArm) {
          rightArmBone.scale.x = limbs.upperArm / 30;
        }
        
        // Apply forearm scaling
        if (leftForeArmBone && limbs.forearm) {
          leftForeArmBone.scale.x = limbs.forearm / 25; // Normalize to base value
        }
        if (rightForeArmBone && limbs.forearm) {
          rightForeArmBone.scale.x = limbs.forearm / 25;
        }
        
        // Apply thigh scaling
        if (leftUpLegBone && limbs.thigh) {
          leftUpLegBone.scale.y = limbs.thigh / 40; // Normalize to base value
        }
        if (rightUpLegBone && limbs.thigh) {
          rightUpLegBone.scale.y = limbs.thigh / 40;
        }
        
        // Apply shin scaling
        if (leftLegBone && limbs.shin) {
          leftLegBone.scale.y = limbs.shin / 35; // Normalize to base value
        }
        if (rightLegBone && limbs.shin) {
          rightLegBone.scale.y = limbs.shin / 35;
        }
        
        // Apply torso scaling if provided
        if (patientData.anthropometrics.torsoScale !== undefined) {
          if (spineBone) spineBone.scale.y = patientData.anthropometrics.torsoScale;
          if (spine1Bone) spine1Bone.scale.y = patientData.anthropometrics.torsoScale;
          if (spine2Bone) spine2Bone.scale.y = patientData.anthropometrics.torsoScale;
        }
        
        // Apply overall scaling to the entire model
        if (patientData.anthropometrics.overallScale !== undefined && sceneRef.current.model) {
          const scale = patientData.anthropometrics.overallScale;
          sceneRef.current.model.scale.set(scale, scale, scale);
        }
        
        console.log('Applied limb scaling:', {
          upperArm: limbs.upperArm,
          forearm: limbs.forearm,
          thigh: limbs.thigh,
          shin: limbs.shin,
          bonesFound: {
            leftArm: !!leftArmBone,
            rightArm: !!rightArmBone,
            leftForeArm: !!leftForeArmBone,
            rightForeArm: !!rightForeArmBone,
            leftUpLeg: !!leftUpLegBone,
            rightUpLeg: !!rightUpLegBone,
            leftLeg: !!leftLegBone,
            rightLeg: !!rightLegBone,
            spine: !!spineBone
          }
        });
      }
      
      // Update skeleton
      if (sceneRef.current.skeleton) {
        sceneRef.current.skeleton.update();
      }
    }

    // Mouse controls
    if (showControls) {
      let isMouseDown = false;
      let mouseX = 0;
      let mouseY = 0;
      let targetRotationX = 0;
      let targetRotationY = 0;
      
      const handleMouseDown = (event: MouseEvent) => {
        isMouseDown = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
      };
      
      const handleMouseUp = () => {
        isMouseDown = false;
      };
      
      const handleMouseMove = (event: MouseEvent) => {
        if (!isMouseDown || !sceneRef.current) return;
        
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        
        targetRotationY += deltaX * 0.01;
        targetRotationX += deltaY * 0.01;
        
        // Clamp vertical rotation
        targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX));
        
        mouseX = event.clientX;
        mouseY = event.clientY;
      };
      
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        // Zoom disabled to prevent camera from moving
      };
      
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
      
      // Store target rotations in scene ref
      if (sceneRef.current) {
        sceneRef.current.mouseX = targetRotationY;
        sceneRef.current.mouseY = targetRotationX;
      }
    }

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      
      requestAnimationFrame(animate);
      
      const delta = sceneRef.current.clock.getDelta();
      
      // Update animation mixer
      if (sceneRef.current.mixer) {
        sceneRef.current.mixer.update(delta);
      }
      
      // Smooth model rotation (not camera)
      if (showControls && sceneRef.current.model) {
        sceneRef.current.model.rotation.y += (sceneRef.current.mouseX - sceneRef.current.model.rotation.y) * 0.05;
        
        // Keep camera at fixed position
        camera.position.set(0, 1.5, 5);
        camera.lookAt(0, 1, 0);
      }
      
      // Apply dynamic slider updates
      applySliderValues();
      
      // Render
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current || !mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (sceneRef.current) {
        // Dispose of geometries, materials, textures
        sceneRef.current.scene.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material: any) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        
        sceneRef.current.renderer.dispose();
        if (mount.contains(sceneRef.current.renderer.domElement)) {
          mount.removeChild(sceneRef.current.renderer.domElement);
        }
      }
      sceneRef.current = null;
    };
  }, [showControls, modelUrl]);

  // Re-apply slider values when patient data changes
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.bones) {
      // Apply slider values will be called in the animation loop
      // This ensures smooth updates
    }
  }, [patientData]);

  return (
    <div className={`w-full h-full relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <div className="text-green-500">Loading Mixamo Model...</div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-600/20 border border-yellow-600 text-yellow-500 p-2 rounded z-10">
          {error}
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}