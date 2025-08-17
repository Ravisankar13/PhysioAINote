import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// Create a Mixamo-compatible skeleton model
async function generateMixamoModel() {
  const scene = new THREE.Scene();
  
  // Create skeleton geometry
  const bones: THREE.Bone[] = [];
  const boneMap = new Map<string, THREE.Bone>();
  
  // Root and Hips
  const hips = new THREE.Bone();
  hips.name = 'mixamorigHips';
  hips.position.set(0, 1, 0);
  bones.push(hips);
  boneMap.set('hips', hips);
  
  // Spine chain
  const spine = new THREE.Bone();
  spine.name = 'mixamorigSpine';
  spine.position.set(0, 0.1, 0);
  hips.add(spine);
  bones.push(spine);
  
  const spine1 = new THREE.Bone();
  spine1.name = 'mixamorigSpine1';
  spine1.position.set(0, 0.15, 0);
  spine.add(spine1);
  bones.push(spine1);
  
  const spine2 = new THREE.Bone();
  spine2.name = 'mixamorigSpine2';
  spine2.position.set(0, 0.15, 0);
  spine1.add(spine2);
  bones.push(spine2);
  
  // Neck and Head
  const neck = new THREE.Bone();
  neck.name = 'mixamorigNeck';
  neck.position.set(0, 0.2, 0);
  spine2.add(neck);
  bones.push(neck);
  
  const head = new THREE.Bone();
  head.name = 'mixamorigHead';
  head.position.set(0, 0.15, 0);
  neck.add(head);
  bones.push(head);
  
  // Left Arm
  const leftShoulder = new THREE.Bone();
  leftShoulder.name = 'mixamorigLeftShoulder';
  leftShoulder.position.set(0.08, 0.15, 0);
  spine2.add(leftShoulder);
  bones.push(leftShoulder);
  
  const leftArm = new THREE.Bone();
  leftArm.name = 'mixamorigLeftArm';
  leftArm.position.set(0.15, 0, 0);
  leftShoulder.add(leftArm);
  bones.push(leftArm);
  
  const leftForeArm = new THREE.Bone();
  leftForeArm.name = 'mixamorigLeftForeArm';
  leftForeArm.position.set(0.3, 0, 0);
  leftArm.add(leftForeArm);
  bones.push(leftForeArm);
  
  const leftHand = new THREE.Bone();
  leftHand.name = 'mixamorigLeftHand';
  leftHand.position.set(0.25, 0, 0);
  leftForeArm.add(leftHand);
  bones.push(leftHand);
  
  // Right Arm
  const rightShoulder = new THREE.Bone();
  rightShoulder.name = 'mixamorigRightShoulder';
  rightShoulder.position.set(-0.08, 0.15, 0);
  spine2.add(rightShoulder);
  bones.push(rightShoulder);
  
  const rightArm = new THREE.Bone();
  rightArm.name = 'mixamorigRightArm';
  rightArm.position.set(-0.15, 0, 0);
  rightShoulder.add(rightArm);
  bones.push(rightArm);
  
  const rightForeArm = new THREE.Bone();
  rightForeArm.name = 'mixamorigRightForeArm';
  rightForeArm.position.set(-0.3, 0, 0);
  rightArm.add(rightForeArm);
  bones.push(rightForeArm);
  
  const rightHand = new THREE.Bone();
  rightHand.name = 'mixamorigRightHand';
  rightHand.position.set(-0.25, 0, 0);
  rightForeArm.add(rightHand);
  bones.push(rightHand);
  
  // Left Leg
  const leftUpLeg = new THREE.Bone();
  leftUpLeg.name = 'mixamorigLeftUpLeg';
  leftUpLeg.position.set(0.1, -0.05, 0);
  hips.add(leftUpLeg);
  bones.push(leftUpLeg);
  
  const leftLeg = new THREE.Bone();
  leftLeg.name = 'mixamorigLeftLeg';
  leftLeg.position.set(0, -0.4, 0);
  leftUpLeg.add(leftLeg);
  bones.push(leftLeg);
  
  const leftFoot = new THREE.Bone();
  leftFoot.name = 'mixamorigLeftFoot';
  leftFoot.position.set(0, -0.35, 0);
  leftLeg.add(leftFoot);
  bones.push(leftFoot);
  
  const leftToeBase = new THREE.Bone();
  leftToeBase.name = 'mixamorigLeftToeBase';
  leftToeBase.position.set(0, -0.08, 0.15);
  leftFoot.add(leftToeBase);
  bones.push(leftToeBase);
  
  // Right Leg
  const rightUpLeg = new THREE.Bone();
  rightUpLeg.name = 'mixamorigRightUpLeg';
  rightUpLeg.position.set(-0.1, -0.05, 0);
  hips.add(rightUpLeg);
  bones.push(rightUpLeg);
  
  const rightLeg = new THREE.Bone();
  rightLeg.name = 'mixamorigRightLeg';
  rightLeg.position.set(0, -0.4, 0);
  rightUpLeg.add(rightLeg);
  bones.push(rightLeg);
  
  const rightFoot = new THREE.Bone();
  rightFoot.name = 'mixamorigRightFoot';
  rightFoot.position.set(0, -0.35, 0);
  rightLeg.add(rightFoot);
  bones.push(rightFoot);
  
  const rightToeBase = new THREE.Bone();
  rightToeBase.name = 'mixamorigRightToeBase';
  rightToeBase.position.set(0, -0.08, 0.15);
  rightFoot.add(rightToeBase);
  bones.push(rightToeBase);
  
  // Create skeleton
  const skeleton = new THREE.Skeleton(bones);
  
  // Create skinned mesh geometry
  const geometry = createHumanoidGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    skinning: true,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'Body';
  
  // Bind skeleton to mesh
  mesh.bind(skeleton);
  mesh.skeleton.bones[0].updateMatrixWorld(true);
  
  // Add to scene
  scene.add(mesh);
  scene.add(hips);
  
  // Create and export GLTF
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        // Save the GLTF file
        const outputPath = path.join(process.cwd(), 'client/public/models/mixamo/base-skeleton.glb');
        const outputDir = path.dirname(outputPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write binary GLB file
        fs.writeFileSync(outputPath, Buffer.from(gltf as ArrayBuffer));
        console.log('✓ Mixamo model generated at:', outputPath);
        resolve(outputPath);
      },
      (error) => {
        console.error('Error generating model:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// Create humanoid geometry with proper vertex groups
function createHumanoidGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  // Create a simple humanoid shape with body parts
  const vertices: number[] = [];
  const indices: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  
  // Torso vertices (8 vertices for a box)
  const torsoVertices = [
    // Front face
    -0.15, 0.8, 0.1,   // 0
    0.15, 0.8, 0.1,    // 1
    0.15, 1.5, 0.1,    // 2
    -0.15, 1.5, 0.1,   // 3
    // Back face
    -0.15, 0.8, -0.1,  // 4
    0.15, 0.8, -0.1,   // 5
    0.15, 1.5, -0.1,   // 6
    -0.15, 1.5, -0.1,  // 7
  ];
  
  // Head vertices
  const headVertices = [
    -0.1, 1.5, 0.08,   // 8
    0.1, 1.5, 0.08,    // 9
    0.1, 1.8, 0.08,    // 10
    -0.1, 1.8, 0.08,   // 11
    -0.1, 1.5, -0.08,  // 12
    0.1, 1.5, -0.08,   // 13
    0.1, 1.8, -0.08,   // 14
    -0.1, 1.8, -0.08,  // 15
  ];
  
  // Arms and legs would be added similarly...
  
  // Combine all vertices
  vertices.push(...torsoVertices, ...headVertices);
  
  // Create faces (triangles) for torso
  const torsoIndices = [
    0, 1, 2, 0, 2, 3,  // Front
    4, 6, 5, 4, 7, 6,  // Back
    0, 4, 5, 0, 5, 1,  // Bottom
    2, 6, 7, 2, 7, 3,  // Top
    0, 3, 7, 0, 7, 4,  // Left
    1, 5, 6, 1, 6, 2,  // Right
  ];
  
  // Create faces for head
  const headIndices = [
    8, 9, 10, 8, 10, 11,    // Front
    12, 14, 13, 12, 15, 14, // Back
    8, 12, 13, 8, 13, 9,    // Bottom
    10, 14, 15, 10, 15, 11, // Top
    8, 11, 15, 8, 15, 12,   // Left
    9, 13, 14, 9, 14, 10,   // Right
  ];
  
  // Adjust head indices offset
  const adjustedHeadIndices = headIndices.map(i => i);
  
  indices.push(...torsoIndices, ...adjustedHeadIndices);
  
  // Assign skin weights (simplified - each vertex fully weighted to nearest bone)
  // Torso vertices (0-7) -> spine bones (indices 1-3)
  for (let i = 0; i < 8; i++) {
    skinIndices.push(1, 2, 0, 0); // Mainly spine and spine1
    skinWeights.push(0.5, 0.5, 0, 0);
  }
  
  // Head vertices (8-15) -> head bone (index 5)
  for (let i = 0; i < 8; i++) {
    skinIndices.push(5, 4, 0, 0); // Head and neck
    skinWeights.push(0.7, 0.3, 0, 0);
  }
  
  // Set attributes
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  
  // Compute normals
  geometry.computeVertexNormals();
  
  return geometry;
}

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  generateMixamoModel()
    .then(() => {
      console.log('Model generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Model generation failed:', error);
      process.exit(1);
    });
}

export { generateMixamoModel };