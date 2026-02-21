import * as THREE from 'three';
import fs from 'fs';

// Minimal GLB parser that extracts bones without textures
const glbPath = '/home/runner/workspace/public/models/skeleton_character.glb';
const buffer = fs.readFileSync(glbPath);

// Parse GLB header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

// Parse chunks
let offset = 12;
let jsonChunk = null;
let binChunk = null;

while (offset < length) {
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  const chunkData = buffer.slice(offset + 8, offset + 8 + chunkLength);
  
  if (chunkType === 0x4E4F534A) { // JSON
    jsonChunk = JSON.parse(chunkData.toString('utf8'));
  } else if (chunkType === 0x004E4942) { // BIN
    binChunk = chunkData;
  }
  offset += 8 + chunkLength;
}

if (!jsonChunk) {
  console.error('No JSON chunk found');
  process.exit(1);
}

const gltf = jsonChunk;
const nodes = gltf.nodes || [];
const skins = gltf.skins || [];

if (skins.length === 0) {
  console.error('No skins found');
  process.exit(1);
}

const skin = skins[0];
const jointIndices = skin.joints;

class BoneNode {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.children = [];
    this.parent = null;
    this.localMatrix = new THREE.Matrix4();
    this.worldMatrix = new THREE.Matrix4();
    this.rotation = new THREE.Euler();
    this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.quaternion = new THREE.Quaternion();
  }
}

const boneNodes = {};
const allNodes = {};

nodes.forEach((node, i) => {
  const bn = new BoneNode(node.name || `node_${i}`, i);
  
  if (node.translation) {
    bn.position.set(node.translation[0], node.translation[1], node.translation[2]);
  }
  if (node.rotation) {
    bn.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
    bn.rotation.setFromQuaternion(bn.quaternion);
  }
  if (node.scale) {
    bn.scale.set(node.scale[0], node.scale[1], node.scale[2]);
  }
  if (node.matrix) {
    const m = new THREE.Matrix4();
    m.fromArray(node.matrix);
    m.decompose(bn.position, bn.quaternion, bn.scale);
    bn.rotation.setFromQuaternion(bn.quaternion);
  }
  
  bn.localMatrix.compose(bn.position, bn.quaternion, bn.scale);
  
  allNodes[i] = bn;
  if (jointIndices.includes(i)) {
    boneNodes[node.name || `node_${i}`] = bn;
  }
});

nodes.forEach((node, i) => {
  if (node.children) {
    node.children.forEach(childIdx => {
      if (allNodes[childIdx]) {
        allNodes[childIdx].parent = allNodes[i];
        allNodes[i].children.push(allNodes[childIdx]);
      }
    });
  }
});

function computeWorldMatrix(node) {
  if (node.parent) {
    computeWorldMatrix(node.parent);
    node.worldMatrix.multiplyMatrices(node.parent.worldMatrix, node.localMatrix);
  } else {
    node.worldMatrix.copy(node.localMatrix);
  }
}

Object.values(allNodes).forEach(node => computeWorldMatrix(node));

const diagnosticBones = [
  'Root_M', 'RootPart1_M', 'RootPart2_M',
  'Hip_L', 'Hip_R', 'HipPart1_L', 'HipPart1_R', 'HipPart2_L', 'HipPart2_R',
  'Knee_L', 'Knee_R', 'Ankle_L', 'Ankle_R', 'Toes_L', 'Toes_R',
  'Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M', 'Chest_M',
  'Neck_M', 'NeckPart1_M', 'NeckPart2_M', 'Head_M',
  'Scapula_L', 'Scapula_R',
  'Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R',
  'Elbow_L', 'Elbow_R', 'Wrist_L', 'Wrist_R',
];

console.log('=== BONE AXIS DIAGNOSTIC (Bind-pose world-space directions) ===');
console.log('World: X=right, Y=up, Z=forward(toward viewer)');
console.log('');

const interpretDir = (v) => {
  const abs = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const maxIdx = abs.indexOf(Math.max(...abs));
  const sign = [v.x, v.y, v.z][maxIdx] > 0 ? '+' : '-';
  const dirs = ['Right', 'Up', 'Fwd'];
  const negDirs = ['Left', 'Down', 'Back'];
  return sign === '+' ? dirs[maxIdx] : negDirs[maxIdx];
};

const fmtVec = (v) => `(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const toDeg = (r) => (r * 180 / Math.PI).toFixed(1);

diagnosticBones.forEach(boneName => {
  const bone = boneNodes[boneName];
  if (!bone) {
    console.log(`${boneName.padEnd(20)} NOT FOUND`);
    return;
  }
  
  const wm = bone.worldMatrix;
  const e = wm.elements;
  const xDir = new THREE.Vector3(e[0], e[1], e[2]).normalize();
  const yDir = new THREE.Vector3(e[4], e[5], e[6]).normalize();
  const zDir = new THREE.Vector3(e[8], e[9], e[10]).normalize();
  
  console.log(
    `${boneName.padEnd(20)} X:${fmtVec(xDir).padEnd(22)}${interpretDir(xDir).padEnd(7)} Y:${fmtVec(yDir).padEnd(22)}${interpretDir(yDir).padEnd(7)} Z:${fmtVec(zDir).padEnd(22)}${interpretDir(zDir).padEnd(7)} rot:(${toDeg(bone.rotation.x)},${toDeg(bone.rotation.y)},${toDeg(bone.rotation.z)})`
  );
});

console.log('');
console.log('=== FLEXION AXIS DETERMINATION ===');
console.log('Flexion/Extension = rotation around mediolateral axis (Left-Right)');
console.log('Abduction/Adduction = rotation around anteroposterior axis (Forward-Backward)');  
console.log('Int/Ext Rotation = rotation around longitudinal axis (along bone length)');
console.log('');

const jointsToAnalyze = [
  { name: 'Hip_L', label: 'Left Hip' },
  { name: 'Hip_R', label: 'Right Hip' },
  { name: 'HipPart1_L', label: 'L Thigh Mid' },
  { name: 'HipPart1_R', label: 'R Thigh Mid' },
  { name: 'Knee_L', label: 'Left Knee' },
  { name: 'Knee_R', label: 'Right Knee' },
  { name: 'Ankle_L', label: 'Left Ankle' },
  { name: 'Ankle_R', label: 'Right Ankle' },
  { name: 'Toes_L', label: 'Left Toes' },
  { name: 'Toes_R', label: 'Right Toes' },
  { name: 'Shoulder_L', label: 'Left Shoulder' },
  { name: 'Shoulder_R', label: 'Right Shoulder' },
  { name: 'ShoulderPart1_L', label: 'L Humerus Mid' },
  { name: 'ShoulderPart1_R', label: 'R Humerus Mid' },
  { name: 'Elbow_L', label: 'Left Elbow' },
  { name: 'Elbow_R', label: 'Right Elbow' },
  { name: 'Wrist_L', label: 'Left Wrist' },
  { name: 'Wrist_R', label: 'Right Wrist' },
  { name: 'Root_M', label: 'Root/Pelvis' },
  { name: 'RootPart1_M', label: 'Sacral 1' },
  { name: 'RootPart2_M', label: 'Sacral 2' },
  { name: 'Spine1_M', label: 'Lumbar' },
  { name: 'Spine1Part1_M', label: 'Thoracolumbar' },
  { name: 'Spine1Part2_M', label: 'Thoracic' },
  { name: 'Chest_M', label: 'Chest' },
  { name: 'Neck_M', label: 'Neck' },
  { name: 'NeckPart1_M', label: 'Neck Mid' },
  { name: 'NeckPart2_M', label: 'Neck Upper' },
  { name: 'Head_M', label: 'Head' },
  { name: 'Scapula_L', label: 'Left Scapula' },
  { name: 'Scapula_R', label: 'Right Scapula' },
];

const worldRight = new THREE.Vector3(1, 0, 0);
const worldUp = new THREE.Vector3(0, 1, 0);
const worldFwd = new THREE.Vector3(0, 0, 1);

jointsToAnalyze.forEach(({ name, label }) => {
  const bone = boneNodes[name];
  if (!bone) return;
  
  const wm = bone.worldMatrix;
  const e = wm.elements;
  const xDir = new THREE.Vector3(e[0], e[1], e[2]).normalize();
  const yDir = new THREE.Vector3(e[4], e[5], e[6]).normalize();
  const zDir = new THREE.Vector3(e[8], e[9], e[10]).normalize();
  
  const axes = ['x', 'y', 'z'];
  const dirs = [xDir, yDir, zDir];
  
  // Find bone's length axis (direction to first child)
  let boneDir = worldUp.clone().negate(); // default: pointing down
  if (bone.children.length > 0) {
    const childPos = new THREE.Vector3();
    const parentPos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    bone.children[0].worldMatrix.decompose(childPos, q, s);
    bone.worldMatrix.decompose(parentPos, q, s);
    boneDir = childPos.sub(parentPos).normalize();
  }
  
  // Find which local axis aligns with bone direction (longitudinal)
  let longAxisIdx = 0;
  let maxDot = 0;
  dirs.forEach((d, i) => {
    const dot = Math.abs(d.dot(boneDir));
    if (dot > maxDot) { maxDot = dot; longAxisIdx = i; }
  });
  
  // Find which local axis is most mediolateral (left-right) = flexion axis
  let flexAxisIdx = 0;
  let maxRightDot = 0;
  dirs.forEach((d, i) => {
    if (i === longAxisIdx) return;
    const dot = Math.abs(d.dot(worldRight));
    if (dot > maxRightDot) { maxRightDot = dot; flexAxisIdx = i; }
  });
  
  // Remaining axis is for abduction
  const abdAxisIdx = [0, 1, 2].find(i => i !== longAxisIdx && i !== flexAxisIdx);
  
  // Determine flexion direction sign
  // For flexion: positive rotation should move the distal end forward (anterior) or upward
  // Check the cross product to determine sign
  const flexAxis = dirs[flexAxisIdx];
  const flexPositive = flexAxis.dot(worldRight) > 0 ? '+' : '-';
  
  console.log(
    `${label.padEnd(20)} LONG=${axes[longAxisIdx]}(${interpretDir(dirs[longAxisIdx])})  FLEX=${axes[flexAxisIdx]}(${interpretDir(dirs[flexAxisIdx])})  ABD=${axes[abdAxisIdx]}(${interpretDir(dirs[abdAxisIdx])})  boneDir=${fmtVec(boneDir)}`
  );
});
