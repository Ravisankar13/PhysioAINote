import * as THREE from 'three';
import fs from 'fs';

const glbPath = '/home/runner/workspace/public/models/skeleton_character.glb';
const buffer = fs.readFileSync(glbPath);

let offset = 12;
let jsonChunk = null;
while (offset < buffer.length) {
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  const chunkData = buffer.slice(offset + 8, offset + 8 + chunkLength);
  if (chunkType === 0x4E4F534A) jsonChunk = JSON.parse(chunkData.toString('utf8'));
  offset += 8 + chunkLength;
}

const nodes = jsonChunk.nodes || [];
const skin = jsonChunk.skins[0];
const jointIndices = skin.joints;

class BoneNode {
  constructor(name, index) { this.name = name; this.index = index; this.children = []; this.parent = null; this.position = new THREE.Vector3(); this.scale = new THREE.Vector3(1,1,1); this.quaternion = new THREE.Quaternion(); this.baseQuaternion = new THREE.Quaternion(); }
}

const allNodes = {};
const boneNodes = {};
nodes.forEach((node, i) => {
  const bn = new BoneNode(node.name || `node_${i}`, i);
  if (node.translation) bn.position.set(node.translation[0], node.translation[1], node.translation[2]);
  if (node.rotation) { bn.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]); }
  if (node.scale) bn.scale.set(node.scale[0], node.scale[1], node.scale[2]);
  if (node.matrix) { const m = new THREE.Matrix4(); m.fromArray(node.matrix); m.decompose(bn.position, bn.quaternion, bn.scale); }
  bn.baseQuaternion.copy(bn.quaternion);
  allNodes[i] = bn;
  if (jointIndices.includes(i)) boneNodes[node.name || `node_${i}`] = bn;
});
nodes.forEach((node, i) => { if (node.children) node.children.forEach(ci => { if (allNodes[ci]) { allNodes[ci].parent = allNodes[i]; allNodes[i].children.push(allNodes[ci]); } }); });

function getWorldMatrix(node) {
  const lm = new THREE.Matrix4(); lm.compose(node.position, node.quaternion, node.scale);
  if (node.parent) { const pw = getWorldMatrix(node.parent); const wm = new THREE.Matrix4(); wm.multiplyMatrices(pw, lm); return wm; }
  return lm;
}
function getWorldPos(node) { const pos = new THREE.Vector3(); pos.setFromMatrixPosition(getWorldMatrix(node)); return pos; }
function resetAllBones() { Object.values(allNodes).forEach(n => { n.quaternion.copy(n.baseQuaternion); }); }
function applyRotation(boneName, axis, angleDeg) {
  const bone = boneNodes[boneName]; if (!bone) return;
  const rad = angleDeg * Math.PI / 180;
  const eq = new THREE.Quaternion();
  if (axis === 'x') eq.setFromAxisAngle(new THREE.Vector3(1,0,0), rad);
  else if (axis === 'y') eq.setFromAxisAngle(new THREE.Vector3(0,1,0), rad);
  else eq.setFromAxisAngle(new THREE.Vector3(0,0,1), rad);
  bone.quaternion.copy(bone.baseQuaternion).multiply(eq);
}
const endpoints = {
  'Hip_L': 'Ankle_L', 'Hip_R': 'Ankle_R', 'Knee_L': 'Ankle_L', 'Knee_R': 'Ankle_R',
  'Ankle_L': 'Toes_L', 'Ankle_R': 'Toes_R',
  'Shoulder_L': 'Wrist_L', 'Shoulder_R': 'Wrist_R', 'Elbow_L': 'Wrist_L', 'Elbow_R': 'Wrist_R',
};
function describeDisp(d) {
  const p = [];
  if (Math.abs(d.x) > 0.01) p.push(`${d.x > 0 ? 'RIGHT' : 'LEFT'}(${Math.abs(d.x).toFixed(3)})`);
  if (Math.abs(d.y) > 0.01) p.push(`${d.y > 0 ? 'UP' : 'DOWN'}(${Math.abs(d.y).toFixed(3)})`);
  if (Math.abs(d.z) > 0.01) p.push(`${d.z > 0 ? 'FWD' : 'BACK'}(${Math.abs(d.z).toFixed(3)})`);
  return p.length > 0 ? p.join(' + ') : 'NONE';
}

const UPDATED_MAPPING = {
  'leftHip.flexion': { bone: 'Hip_L', axis: 'z', scale: 1, expect: 'FWD', desc: 'leg forward' },
  'rightHip.flexion': { bone: 'Hip_R', axis: 'z', scale: 1, expect: 'FWD', desc: 'leg forward' },
  'leftHip.abduction': { bone: 'Hip_L', axis: 'y', scale: 1, expect: 'LEFT', desc: 'leg out left' },
  'rightHip.abduction': { bone: 'Hip_R', axis: 'y', scale: 1, expect: 'RIGHT', desc: 'leg out right' },
  'leftKnee.flexion': { bone: 'Knee_L', axis: 'z', scale: -1, expect: 'BACK', desc: 'shin backward' },
  'rightKnee.flexion': { bone: 'Knee_R', axis: 'z', scale: -1, expect: 'BACK', desc: 'shin backward' },
  'leftAnkle.dorsiflexion': { bone: 'Ankle_L', axis: 'z', scale: 1, expect: 'UP', desc: 'foot up' },
  'leftAnkle.plantarflexion': { bone: 'Ankle_L', axis: 'z', scale: -1, expect: 'DOWN', desc: 'foot down' },
  'rightAnkle.dorsiflexion': { bone: 'Ankle_R', axis: 'z', scale: 1, expect: 'UP', desc: 'foot up' },
  'rightAnkle.plantarflexion': { bone: 'Ankle_R', axis: 'z', scale: -1, expect: 'DOWN', desc: 'foot down' },
  'leftShoulder.flexion': { bone: 'Shoulder_L', axis: 'y', scale: -1, expect: 'UP', desc: 'arm up/forward' },
  'rightShoulder.flexion': { bone: 'Shoulder_R', axis: 'y', scale: -1, expect: 'UP', desc: 'arm up/forward' },
  'leftShoulder.abduction': { bone: 'Shoulder_L', axis: 'z', scale: -1, expect: 'LEFT', desc: 'arm out left' },
  'rightShoulder.abduction': { bone: 'Shoulder_R', axis: 'z', scale: 1, expect: 'RIGHT', desc: 'arm out right' },
  'leftElbow.flexion': { bone: 'Elbow_L', axis: 'z', scale: 1, expect: 'FWD', desc: 'forearm forward' },
  'rightElbow.flexion': { bone: 'Elbow_R', axis: 'z', scale: 1, expect: 'FWD', desc: 'forearm forward' },
};

console.log('=== UPDATED BONE_MAPPING VERIFICATION ===');
console.log('');
const angle = 30;
Object.entries(UPDATED_MAPPING).forEach(([key, { bone, axis, scale, expect, desc }]) => {
  resetAllBones();
  const endBone = endpoints[bone];
  const endNode = boneNodes[endBone];
  if (!endNode) { console.log(`${key.padEnd(30)} ENDPOINT NOT FOUND`); return; }
  const before = getWorldPos(endNode);
  applyRotation(bone, axis, angle * scale);
  const after = getWorldPos(endNode);
  const delta = after.clone().sub(before);
  const disp = describeDisp(delta);
  const ok = disp.includes(expect);
  console.log(`${(ok?'OK':'WRONG').padEnd(6)} ${key.padEnd(30)} scale=${String(scale).padEnd(3)} → ${disp.padEnd(50)} expected=${desc}`);
});
