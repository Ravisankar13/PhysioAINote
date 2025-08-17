import * as THREE from 'three';

// Generate a Mixamo-compatible skeleton programmatically
export function generateMixamoSkeleton() {
  const bones: THREE.Bone[] = [];
  const boneMap = new Map<string, THREE.Bone>();
  
  // Root and Hips
  const hips = new THREE.Bone();
  hips.name = 'mixamorigHips';
  hips.position.set(0, 100, 0);
  bones.push(hips);
  boneMap.set('hips', hips);
  
  // Spine chain
  const spine = new THREE.Bone();
  spine.name = 'mixamorigSpine';
  spine.position.set(0, 10, 0);
  hips.add(spine);
  bones.push(spine);
  boneMap.set('spine', spine);
  
  const spine1 = new THREE.Bone();
  spine1.name = 'mixamorigSpine1';
  spine1.position.set(0, 15, 0);
  spine.add(spine1);
  bones.push(spine1);
  boneMap.set('spine1', spine1);
  
  const spine2 = new THREE.Bone();
  spine2.name = 'mixamorigSpine2';
  spine2.position.set(0, 15, 0);
  spine1.add(spine2);
  bones.push(spine2);
  boneMap.set('spine2', spine2);
  
  // Neck and Head
  const neck = new THREE.Bone();
  neck.name = 'mixamorigNeck';
  neck.position.set(0, 20, 0);
  spine2.add(neck);
  bones.push(neck);
  boneMap.set('neck', neck);
  
  const head = new THREE.Bone();
  head.name = 'mixamorigHead';
  head.position.set(0, 15, 0);
  neck.add(head);
  bones.push(head);
  boneMap.set('head', head);
  
  // Left Arm
  const leftShoulder = new THREE.Bone();
  leftShoulder.name = 'mixamorigLeftShoulder';
  leftShoulder.position.set(8, 15, 0);
  spine2.add(leftShoulder);
  bones.push(leftShoulder);
  boneMap.set('leftShoulder', leftShoulder);
  
  const leftArm = new THREE.Bone();
  leftArm.name = 'mixamorigLeftArm';
  leftArm.position.set(15, 0, 0);
  leftShoulder.add(leftArm);
  bones.push(leftArm);
  boneMap.set('leftUpperArm', leftArm);
  
  const leftForeArm = new THREE.Bone();
  leftForeArm.name = 'mixamorigLeftForeArm';
  leftForeArm.position.set(30, 0, 0);
  leftArm.add(leftForeArm);
  bones.push(leftForeArm);
  boneMap.set('leftForearm', leftForeArm);
  
  const leftHand = new THREE.Bone();
  leftHand.name = 'mixamorigLeftHand';
  leftHand.position.set(25, 0, 0);
  leftForeArm.add(leftHand);
  bones.push(leftHand);
  boneMap.set('leftHand', leftHand);
  
  // Right Arm
  const rightShoulder = new THREE.Bone();
  rightShoulder.name = 'mixamorigRightShoulder';
  rightShoulder.position.set(-8, 15, 0);
  spine2.add(rightShoulder);
  bones.push(rightShoulder);
  boneMap.set('rightShoulder', rightShoulder);
  
  const rightArm = new THREE.Bone();
  rightArm.name = 'mixamorigRightArm';
  rightArm.position.set(-15, 0, 0);
  rightShoulder.add(rightArm);
  bones.push(rightArm);
  boneMap.set('rightUpperArm', rightArm);
  
  const rightForeArm = new THREE.Bone();
  rightForeArm.name = 'mixamorigRightForeArm';
  rightForeArm.position.set(-30, 0, 0);
  rightArm.add(rightForeArm);
  bones.push(rightForeArm);
  boneMap.set('rightForearm', rightForeArm);
  
  const rightHand = new THREE.Bone();
  rightHand.name = 'mixamorigRightHand';
  rightHand.position.set(-25, 0, 0);
  rightForeArm.add(rightHand);
  bones.push(rightHand);
  boneMap.set('rightHand', rightHand);
  
  // Left Leg
  const leftUpLeg = new THREE.Bone();
  leftUpLeg.name = 'mixamorigLeftUpLeg';
  leftUpLeg.position.set(10, -5, 0);
  hips.add(leftUpLeg);
  bones.push(leftUpLeg);
  boneMap.set('leftThigh', leftUpLeg);
  
  const leftLeg = new THREE.Bone();
  leftLeg.name = 'mixamorigLeftLeg';
  leftLeg.position.set(0, -40, 0);
  leftUpLeg.add(leftLeg);
  bones.push(leftLeg);
  boneMap.set('leftShin', leftLeg);
  
  const leftFoot = new THREE.Bone();
  leftFoot.name = 'mixamorigLeftFoot';
  leftFoot.position.set(0, -35, 0);
  leftLeg.add(leftFoot);
  bones.push(leftFoot);
  boneMap.set('leftFoot', leftFoot);
  
  const leftToeBase = new THREE.Bone();
  leftToeBase.name = 'mixamorigLeftToeBase';
  leftToeBase.position.set(0, -8, 15);
  leftFoot.add(leftToeBase);
  bones.push(leftToeBase);
  
  // Right Leg
  const rightUpLeg = new THREE.Bone();
  rightUpLeg.name = 'mixamorigRightUpLeg';
  rightUpLeg.position.set(-10, -5, 0);
  hips.add(rightUpLeg);
  bones.push(rightUpLeg);
  boneMap.set('rightThigh', rightUpLeg);
  
  const rightLeg = new THREE.Bone();
  rightLeg.name = 'mixamorigRightLeg';
  rightLeg.position.set(0, -40, 0);
  rightUpLeg.add(rightLeg);
  bones.push(rightLeg);
  boneMap.set('rightShin', rightLeg);
  
  const rightFoot = new THREE.Bone();
  rightFoot.name = 'mixamorigRightFoot';
  rightFoot.position.set(0, -35, 0);
  rightLeg.add(rightFoot);
  bones.push(rightFoot);
  boneMap.set('rightFoot', rightFoot);
  
  const rightToeBase = new THREE.Bone();
  rightToeBase.name = 'mixamorigRightToeBase';
  rightToeBase.position.set(0, -8, 15);
  rightFoot.add(rightToeBase);
  bones.push(rightToeBase);
  
  return { bones, boneMap, rootBone: hips };
}

// Create humanoid mesh geometry
export function createHumanoidMesh(bones: THREE.Bone[]) {
  const skeleton = new THREE.Skeleton(bones);
  
  // Create body parts with proper proportions
  const meshes: THREE.SkinnedMesh[] = [];
  const material = new THREE.MeshPhongMaterial({
    color: 0xe8d5c4, // Skin tone
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  });
  
  // Helper function to create a body part
  function createBodyPart(
    width: number,
    height: number,
    depth: number,
    boneIndex: number,
    position: THREE.Vector3
  ): THREE.SkinnedMesh {
    const geometry = new THREE.BoxGeometry(width, height, depth, 4, 4, 4);
    
    // Set up skinning
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    
    const positionAttribute = geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      // Assign vertices to bones
      skinIndices.push(boneIndex, 0, 0, 0);
      skinWeights.push(1, 0, 0, 0);
    }
    
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.bind(skeleton);
    mesh.position.copy(position);
    
    return mesh;
  }
  
  // Create torso
  const torso = createBodyPart(30, 45, 20, 1, new THREE.Vector3(0, 122.5, 0));
  meshes.push(torso);
  
  // Create head
  const headGeometry = new THREE.SphereGeometry(12, 16, 16);
  const headSkinIndices: number[] = [];
  const headSkinWeights: number[] = [];
  
  for (let i = 0; i < headGeometry.attributes.position.count; i++) {
    headSkinIndices.push(5, 0, 0, 0); // Head bone index
    headSkinWeights.push(1, 0, 0, 0);
  }
  
  headGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(headSkinIndices, 4));
  headGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(headSkinWeights, 4));
  
  const headMesh = new THREE.SkinnedMesh(headGeometry, material);
  headMesh.bind(skeleton);
  headMesh.position.set(0, 165, 0);
  meshes.push(headMesh);
  
  // Create arms
  const leftUpperArm = createBodyPart(8, 30, 8, 7, new THREE.Vector3(20, 135, 0));
  const leftLowerArm = createBodyPart(6, 25, 6, 8, new THREE.Vector3(35, 120, 0));
  const rightUpperArm = createBodyPart(8, 30, 8, 11, new THREE.Vector3(-20, 135, 0));
  const rightLowerArm = createBodyPart(6, 25, 6, 12, new THREE.Vector3(-35, 120, 0));
  
  meshes.push(leftUpperArm, leftLowerArm, rightUpperArm, rightLowerArm);
  
  // Create legs
  const leftUpperLeg = createBodyPart(10, 40, 10, 15, new THREE.Vector3(10, 80, 0));
  const leftLowerLeg = createBodyPart(8, 35, 8, 16, new THREE.Vector3(10, 45, 0));
  const rightUpperLeg = createBodyPart(10, 40, 10, 19, new THREE.Vector3(-10, 80, 0));
  const rightLowerLeg = createBodyPart(8, 35, 8, 20, new THREE.Vector3(-10, 45, 0));
  
  meshes.push(leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg);
  
  // Create a group to hold all meshes
  const group = new THREE.Group();
  meshes.forEach(mesh => group.add(mesh));
  
  return { meshGroup: group, skeleton, meshes };
}

// Create a complete Mixamo-compatible model
export function createMixamoModel() {
  const { bones, boneMap, rootBone } = generateMixamoSkeleton();
  const { meshGroup, skeleton, meshes } = createHumanoidMesh(bones);
  
  // Create the scene structure
  const scene = new THREE.Group();
  scene.name = 'MixamoModel';
  
  // Add root bone and meshes
  scene.add(rootBone);
  scene.add(meshGroup);
  
  // Create animations
  const animations = createBasicAnimations(bones);
  
  // Create a mixer for animations
  const mixer = new THREE.AnimationMixer(scene);
  
  return {
    scene,
    animations,
    bones: boneMap,
    mixer,
    skeleton,
    meshes
  };
}

// Create basic clinical animations
function createBasicAnimations(bones: THREE.Bone[]): THREE.AnimationClip[] {
  const animations: THREE.AnimationClip[] = [];
  
  // Find specific bones
  const leftArm = bones.find(b => b.name === 'mixamorigLeftArm');
  const rightArm = bones.find(b => b.name === 'mixamorigRightArm');
  const leftUpLeg = bones.find(b => b.name === 'mixamorigLeftUpLeg');
  const rightUpLeg = bones.find(b => b.name === 'mixamorigRightUpLeg');
  
  // Idle animation (subtle breathing)
  const idleTracks: THREE.KeyframeTrack[] = [];
  if (bones[1]) { // Spine
    idleTracks.push(
      new THREE.VectorKeyframeTrack(
        `${bones[1].name}.position`,
        [0, 1, 2],
        [0, 10, 0, 0, 10.5, 0, 0, 10, 0]
      )
    );
  }
  animations.push(new THREE.AnimationClip('idle', 2, idleTracks));
  
  // Arm flexion animation
  if (leftArm && rightArm) {
    const armFlexionTracks = [
      new THREE.QuaternionKeyframeTrack(
        `${leftArm.name}.quaternion`,
        [0, 0.5, 1],
        [
          0, 0, 0, 1,
          -0.707, 0, 0, 0.707,
          0, 0, 0, 1
        ]
      ),
      new THREE.QuaternionKeyframeTrack(
        `${rightArm.name}.quaternion`,
        [0, 0.5, 1],
        [
          0, 0, 0, 1,
          -0.707, 0, 0, 0.707,
          0, 0, 0, 1
        ]
      )
    ];
    animations.push(new THREE.AnimationClip('armFlexion', 1, armFlexionTracks));
  }
  
  // Walking animation (simplified)
  if (leftUpLeg && rightUpLeg) {
    const walkTracks = [
      new THREE.QuaternionKeyframeTrack(
        `${leftUpLeg.name}.quaternion`,
        [0, 0.25, 0.5, 0.75, 1],
        [
          0, 0, 0, 1,
          0.2, 0, 0, 0.98,
          0, 0, 0, 1,
          -0.2, 0, 0, 0.98,
          0, 0, 0, 1
        ]
      ),
      new THREE.QuaternionKeyframeTrack(
        `${rightUpLeg.name}.quaternion`,
        [0, 0.25, 0.5, 0.75, 1],
        [
          0, 0, 0, 1,
          -0.2, 0, 0, 0.98,
          0, 0, 0, 1,
          0.2, 0, 0, 0.98,
          0, 0, 0, 1
        ]
      )
    ];
    animations.push(new THREE.AnimationClip('walking', 1, walkTracks));
  }
  
  return animations;
}