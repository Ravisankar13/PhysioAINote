import * as THREE from 'three';
import fs from 'fs';

const glbPath = '/home/runner/workspace/public/models/skeleton_character.glb';
const buffer = fs.readFileSync(glbPath);

const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

let offset = 12;
let jsonChunk = null;
let binChunk = null;

while (offset < length) {
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  const chunkData = buffer.slice(offset + 8, offset + 8 + chunkLength);
  if (chunkType === 0x4E4F534A) jsonChunk = JSON.parse(chunkData.toString('utf8'));
  else if (chunkType === 0x004E4942) binChunk = chunkData;
  offset += 8 + chunkLength;
}

const gltf = jsonChunk;
const nodes = gltf.nodes || [];
const skins = gltf.skins || [];
const skin = skins[0];
const jointIndices = skin.joints;

class BoneNode {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.children = [];
    this.parent = null;
    this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.quaternion = new THREE.Quaternion();
    this.rotation = new THREE.Euler();
    this.baseQuaternion = new THREE.Quaternion();
  }
}

const allNodes = {};
const boneNodes = {};

nodes.forEach((node, i) => {
  const bn = new BoneNode(node.name || `node_${i}`, i);
  if (node.translation) bn.position.set(node.translation[0], node.translation[1], node.translation[2]);
  if (node.rotation) {
    bn.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
    bn.rotation.setFromQuaternion(bn.quaternion);
  }
  if (node.scale) bn.scale.set(node.scale[0], node.scale[1], node.scale[2]);
  if (node.matrix) {
    const m = new THREE.Matrix4();
    m.fromArray(node.matrix);
    m.decompose(bn.position, bn.quaternion, bn.scale);
    bn.rotation.setFromQuaternion(bn.quaternion);
  }
  bn.baseQuaternion.copy(bn.quaternion);
  allNodes[i] = bn;
  if (jointIndices.includes(i)) boneNodes[node.name || `node_${i}`] = bn;
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

function getWorldPos(node) {
  const wm = new THREE.Matrix4();
  const localMat = new THREE.Matrix4();
  localMat.compose(node.position, node.quaternion, node.scale);
  if (node.parent) {
    const parentWorld = getWorldMatrix(node.parent);
    wm.multiplyMatrices(parentWorld, localMat);
  } else {
    wm.copy(localMat);
  }
  const pos = new THREE.Vector3();
  pos.setFromMatrixPosition(wm);
  return pos;
}

function getWorldMatrix(node) {
  const localMat = new THREE.Matrix4();
  localMat.compose(node.position, node.quaternion, node.scale);
  if (node.parent) {
    const parentWorld = getWorldMatrix(node.parent);
    const wm = new THREE.Matrix4();
    wm.multiplyMatrices(parentWorld, localMat);
    return wm;
  }
  return localMat;
}

function resetAllBones() {
  Object.values(allNodes).forEach(node => {
    node.quaternion.copy(node.baseQuaternion);
    node.rotation.setFromQuaternion(node.quaternion);
  });
}

function applyRotation(boneName, axis, angleDeg) {
  const bone = boneNodes[boneName];
  if (!bone) return;
  const angleRad = angleDeg * Math.PI / 180;
  const extraQuat = new THREE.Quaternion();
  if (axis === 'x') extraQuat.setFromAxisAngle(new THREE.Vector3(1,0,0), angleRad);
  else if (axis === 'y') extraQuat.setFromAxisAngle(new THREE.Vector3(0,1,0), angleRad);
  else if (axis === 'z') extraQuat.setFromAxisAngle(new THREE.Vector3(0,0,1), angleRad);
  bone.quaternion.copy(bone.baseQuaternion).multiply(extraQuat);
  bone.rotation.setFromQuaternion(bone.quaternion);
}

function getEndpointBone(boneName) {
  const endpoints = {
    'Hip_L': 'Ankle_L', 'Hip_R': 'Ankle_R',
    'HipPart1_L': 'Ankle_L', 'HipPart1_R': 'Ankle_R',
    'HipPart2_L': 'Ankle_L', 'HipPart2_R': 'Ankle_R',
    'Knee_L': 'Ankle_L', 'Knee_R': 'Ankle_R',
    'Ankle_L': 'Toes_L', 'Ankle_R': 'Toes_R',
    'Shoulder_L': 'Wrist_L', 'Shoulder_R': 'Wrist_R',
    'ShoulderPart1_L': 'Wrist_L', 'ShoulderPart1_R': 'Wrist_R',
    'Elbow_L': 'Wrist_L', 'Elbow_R': 'Wrist_R',
    'Root_M': 'Head_M',
    'RootPart1_M': 'Spine1_M', 'RootPart2_M': 'Spine1_M',
    'Spine1_M': 'Chest_M', 'Spine1Part1_M': 'Chest_M',
    'Spine1Part2_M': 'Chest_M', 'Chest_M': 'Head_M',
    'Neck_M': 'Head_M', 'NeckPart1_M': 'Head_M', 'NeckPart2_M': 'Head_M',
    'Head_M': 'Head_M',
    'Toes_L': 'ToesEnd_L', 'Toes_R': 'ToesEnd_R',
  };
  return endpoints[boneName] || boneName;
}

function describeDisplacement(delta) {
  const parts = [];
  if (Math.abs(delta.x) > 0.01) parts.push(`${delta.x > 0 ? 'RIGHT' : 'LEFT'}(${Math.abs(delta.x).toFixed(3)})`);
  if (Math.abs(delta.y) > 0.01) parts.push(`${delta.y > 0 ? 'UP' : 'DOWN'}(${Math.abs(delta.y).toFixed(3)})`);
  if (Math.abs(delta.z) > 0.01) parts.push(`${delta.z > 0 ? 'FORWARD' : 'BACKWARD'}(${Math.abs(delta.z).toFixed(3)})`);
  return parts.length > 0 ? parts.join(' + ') : 'NO_MOVEMENT';
}

const testAngle = 30;

const testsToRun = [
  { bone: 'Hip_L', axis: 'z', label: 'Hip_L Z+30' },
  { bone: 'Hip_L', axis: 'y', label: 'Hip_L Y+30' },
  { bone: 'Hip_L', axis: 'x', label: 'Hip_L X+30' },
  { bone: 'Hip_R', axis: 'z', label: 'Hip_R Z+30' },
  { bone: 'Hip_R', axis: 'y', label: 'Hip_R Y+30' },
  { bone: 'Hip_R', axis: 'x', label: 'Hip_R X+30' },
  { bone: 'Knee_L', axis: 'z', label: 'Knee_L Z+30' },
  { bone: 'Knee_R', axis: 'z', label: 'Knee_R Z+30' },
  { bone: 'Ankle_L', axis: 'z', label: 'Ankle_L Z+30' },
  { bone: 'Ankle_R', axis: 'z', label: 'Ankle_R Z+30' },
  { bone: 'Ankle_L', axis: 'x', label: 'Ankle_L X+30' },
  { bone: 'Ankle_R', axis: 'x', label: 'Ankle_R X+30' },
  { bone: 'Shoulder_L', axis: 'y', label: 'Shoulder_L Y+30' },
  { bone: 'Shoulder_L', axis: 'z', label: 'Shoulder_L Z+30' },
  { bone: 'Shoulder_R', axis: 'y', label: 'Shoulder_R Y+30' },
  { bone: 'Shoulder_R', axis: 'z', label: 'Shoulder_R Z+30' },
  { bone: 'ShoulderPart1_L', axis: 'x', label: 'ShoulderPart1_L X+30' },
  { bone: 'ShoulderPart1_R', axis: 'x', label: 'ShoulderPart1_R X+30' },
  { bone: 'Elbow_L', axis: 'z', label: 'Elbow_L Z+30' },
  { bone: 'Elbow_R', axis: 'z', label: 'Elbow_R Z+30' },
  { bone: 'Elbow_L', axis: 'x', label: 'Elbow_L X+30' },
  { bone: 'Elbow_R', axis: 'x', label: 'Elbow_R X+30' },
  { bone: 'RootPart1_M', axis: 'z', label: 'RootPart1_M Z+30 (spine sag)' },
  { bone: 'RootPart1_M', axis: 'y', label: 'RootPart1_M Y+30 (spine lat)' },
  { bone: 'RootPart1_M', axis: 'x', label: 'RootPart1_M X+30 (spine rot)' },
  { bone: 'Spine1_M', axis: 'z', label: 'Spine1_M Z+30 (lumbar sag)' },
  { bone: 'Spine1_M', axis: 'y', label: 'Spine1_M Y+30 (lumbar lat)' },
  { bone: 'Chest_M', axis: 'z', label: 'Chest_M Z+30 (thoracic sag)' },
  { bone: 'Chest_M', axis: 'x', label: 'Chest_M X+30 (thoracic rot)' },
  { bone: 'Neck_M', axis: 'z', label: 'Neck_M Z+30 (neck sag)' },
  { bone: 'Neck_M', axis: 'y', label: 'Neck_M Y+30 (neck lat)' },
  { bone: 'Neck_M', axis: 'x', label: 'Neck_M X+30 (neck rot)' },
];

console.log(`=== BONE ROTATION DISPLACEMENT TEST (applying +${testAngle}° to each axis) ===`);
console.log('World: X=Right, Y=Up, Z=Forward');
console.log('');

testsToRun.forEach(({ bone, axis, label }) => {
  resetAllBones();
  const endBone = getEndpointBone(bone);
  const endNode = boneNodes[endBone];
  if (!endNode) { console.log(`${label.padEnd(40)} ENDPOINT NOT FOUND (${endBone})`); return; }

  const beforePos = getWorldPos(endNode);
  applyRotation(bone, axis, testAngle);
  const afterPos = getWorldPos(endNode);
  const delta = afterPos.clone().sub(beforePos);

  console.log(`${label.padEnd(40)} endpoint=${endBone.padEnd(12)} displacement=${describeDisplacement(delta)}`);
});

console.log('');
console.log('=== MAPPING VERIFICATION ===');
console.log('For each BONE_MAPPING entry, positive keyframe value should produce the NAMED movement.');
console.log('');

const mappingTests = [
  { key: 'leftHip.flexion', bone: 'Hip_L', axis: 'z', scale: -1, expected: 'FORWARD', desc: 'leg swings forward' },
  { key: 'rightHip.flexion', bone: 'Hip_R', axis: 'z', scale: -1, expected: 'FORWARD', desc: 'leg swings forward' },
  { key: 'leftHip.abduction', bone: 'Hip_L', axis: 'y', scale: -1, expected: 'LEFT', desc: 'leg moves out to left' },
  { key: 'rightHip.abduction', bone: 'Hip_R', axis: 'y', scale: 1, expected: 'RIGHT', desc: 'leg moves out to right' },
  { key: 'leftKnee.flexion', bone: 'Knee_L', axis: 'z', scale: 1, expected: 'BACKWARD+UP', desc: 'shin bends backward' },
  { key: 'rightKnee.flexion', bone: 'Knee_R', axis: 'z', scale: 1, expected: 'BACKWARD+UP', desc: 'shin bends backward' },
  { key: 'leftAnkle.dorsiflexion', bone: 'Ankle_L', axis: 'z', scale: -1, expected: 'UP', desc: 'foot points up' },
  { key: 'leftAnkle.plantarflexion', bone: 'Ankle_L', axis: 'z', scale: 1, expected: 'DOWN', desc: 'foot points down' },
  { key: 'leftShoulder.flexion', bone: 'Shoulder_L', axis: 'y', scale: 1, expected: 'FORWARD+UP', desc: 'arm swings forward/up' },
  { key: 'rightShoulder.flexion', bone: 'Shoulder_R', axis: 'y', scale: -1, expected: 'FORWARD+UP', desc: 'arm swings forward/up' },
  { key: 'leftShoulder.abduction', bone: 'Shoulder_L', axis: 'z', scale: -1, expected: 'LEFT+UP', desc: 'arm lifts laterally' },
  { key: 'rightShoulder.abduction', bone: 'Shoulder_R', axis: 'z', scale: 1, expected: 'RIGHT+UP', desc: 'arm lifts laterally' },
  { key: 'leftElbow.flexion', bone: 'Elbow_L', axis: 'z', scale: 1, expected: 'UP+FORWARD', desc: 'forearm bends up' },
  { key: 'rightElbow.flexion', bone: 'Elbow_R', axis: 'z', scale: -1, expected: 'UP+FORWARD', desc: 'forearm bends up' },
];

mappingTests.forEach(({ key, bone, axis, scale, expected, desc }) => {
  resetAllBones();
  const endBone = getEndpointBone(bone);
  const endNode = boneNodes[endBone];
  if (!endNode) { console.log(`${key.padEnd(30)} ENDPOINT NOT FOUND`); return; }

  const beforePos = getWorldPos(endNode);
  const effectiveAngle = testAngle * scale;
  applyRotation(bone, axis, effectiveAngle);
  const afterPos = getWorldPos(endNode);
  const delta = afterPos.clone().sub(beforePos);
  const displacement = describeDisplacement(delta);

  const primaryDir = expected.split('+')[0];
  const isCorrect = displacement.includes(primaryDir);
  const status = isCorrect ? 'OK' : 'WRONG';

  console.log(`${status.padEnd(6)} ${key.padEnd(30)} scale=${String(scale).padEnd(3)} → ${displacement.padEnd(50)} expected=${desc}`);
});
