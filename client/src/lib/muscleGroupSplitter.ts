import * as THREE from 'three';

export interface MuscleGroupDefinition {
  id: string;
  label: string;
  color: string;
  bones: string[];
}

export const MUSCLE_GROUPS: MuscleGroupDefinition[] = [
  { id: 'deltoid_r', label: 'Right Deltoid', color: '#e74c3c', bones: ['Shoulder_R', 'ShoulderPart1_R', 'ShoulderPart2_R'] },
  { id: 'deltoid_l', label: 'Left Deltoid', color: '#e74c3c', bones: ['Shoulder_L', 'ShoulderPart1_L', 'ShoulderPart2_L'] },
  { id: 'bicep_r', label: 'Right Bicep', color: '#3498db', bones: ['Elbow_R', 'ElbowPart1_R', 'ElbowPart2_R'] },
  { id: 'bicep_l', label: 'Left Bicep', color: '#3498db', bones: ['Elbow_L', 'ElbowPart1_L', 'ElbowPart2_L'] },
  { id: 'glute_r', label: 'Right Glute', color: '#9b59b6', bones: ['Hip_R'] },
  { id: 'glute_l', label: 'Left Glute', color: '#9b59b6', bones: ['Hip_L'] },
  { id: 'quad_r', label: 'Right Thigh', color: '#2ecc71', bones: ['HipPart1_R', 'HipPart2_R'] },
  { id: 'quad_l', label: 'Left Thigh', color: '#2ecc71', bones: ['HipPart1_L', 'HipPart2_L'] },
  { id: 'calf_r', label: 'Right Calf', color: '#f39c12', bones: ['Knee_R'] },
  { id: 'calf_l', label: 'Left Calf', color: '#f39c12', bones: ['Knee_L'] },
  { id: 'shin_r', label: 'Right Shin/Ankle', color: '#1abc9c', bones: ['Ankle_R'] },
  { id: 'shin_l', label: 'Left Shin/Ankle', color: '#1abc9c', bones: ['Ankle_L'] },
  { id: 'foot_r', label: 'Right Foot', color: '#e67e22', bones: ['Toes_R'] },
  { id: 'foot_l', label: 'Left Foot', color: '#e67e22', bones: ['Toes_L'] },
  { id: 'core', label: 'Core', color: '#f1c40f', bones: ['Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M'] },
];

export interface SplitMuscleGroup {
  id: string;
  label: string;
  color: string;
  meshes: THREE.SkinnedMesh[];
  visible: boolean;
}

function classifyVertex(
  vertexIndex: number,
  skinIndex: THREE.BufferAttribute,
  skinWeight: THREE.BufferAttribute,
  skeleton: THREE.Skeleton
): string {
  let maxWeight = 0;
  let dominantBoneName = '';

  for (let j = 0; j < 4; j++) {
    const boneIdx = skinIndex.getComponent(vertexIndex, j);
    const weight = skinWeight.getComponent(vertexIndex, j);
    if (weight > maxWeight) {
      maxWeight = weight;
      const bone = skeleton.bones[boneIdx];
      dominantBoneName = bone ? bone.name : '';
    }
  }

  for (const group of MUSCLE_GROUPS) {
    if (group.bones.includes(dominantBoneName)) {
      return group.id;
    }
  }

  return 'other';
}

function splitSkinnedMesh(
  originalMesh: THREE.SkinnedMesh,
  groupResults: Map<string, SplitMuscleGroup>
): void {
  const geometry = originalMesh.geometry;
  const skinIndex = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
  const skinWeight = geometry.getAttribute('skinWeight') as THREE.BufferAttribute;
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const index = geometry.getIndex();

  if (!skinIndex || !skinWeight || !position || !originalMesh.skeleton) return;

  const vertexGroupId = new Array<string>(position.count);
  for (let i = 0; i < position.count; i++) {
    vertexGroupId[i] = classifyVertex(i, skinIndex, skinWeight, originalMesh.skeleton);
  }

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const trianglesByGroup: Map<string, number[][]> = new Map();

  for (let t = 0; t < triangleCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const g0 = vertexGroupId[i0];
    const g1 = vertexGroupId[i1];
    const g2 = vertexGroupId[i2];

    const groupId = majorityVote(g0, g1, g2);

    if (!trianglesByGroup.has(groupId)) {
      trianglesByGroup.set(groupId, []);
    }
    trianglesByGroup.get(groupId)!.push([i0, i1, i2]);
  }

  Array.from(trianglesByGroup.entries()).forEach(([groupId, triangles]) => {
    if (triangles.length === 0) return;

    const vertexMap = new Map<number, number>();
    const newIndices: number[] = [];
    let newVertexCount = 0;

    for (const tri of triangles) {
      const triVerts = [tri[0], tri[1], tri[2]];
      for (const idx of triVerts) {
        if (!vertexMap.has(idx)) {
          vertexMap.set(idx, newVertexCount++);
        }
        newIndices.push(vertexMap.get(idx)!);
      }
    }

    const newPositions = new Float32Array(newVertexCount * 3);
    const newNormals = normal ? new Float32Array(newVertexCount * 3) : null;
    const newUvs = uv ? new Float32Array(newVertexCount * 2) : null;
    const newSkinIndices = new Uint16Array(newVertexCount * 4);
    const newSkinWeights = new Float32Array(newVertexCount * 4);

    Array.from(vertexMap.entries()).forEach(([oldIdx, newIdx]) => {
      newPositions[newIdx * 3] = position.getX(oldIdx);
      newPositions[newIdx * 3 + 1] = position.getY(oldIdx);
      newPositions[newIdx * 3 + 2] = position.getZ(oldIdx);

      if (newNormals && normal) {
        newNormals[newIdx * 3] = normal.getX(oldIdx);
        newNormals[newIdx * 3 + 1] = normal.getY(oldIdx);
        newNormals[newIdx * 3 + 2] = normal.getZ(oldIdx);
      }

      if (newUvs && uv) {
        newUvs[newIdx * 2] = uv.getX(oldIdx);
        newUvs[newIdx * 2 + 1] = uv.getY(oldIdx);
      }

      for (let j = 0; j < 4; j++) {
        newSkinIndices[newIdx * 4 + j] = skinIndex.getComponent(oldIdx, j);
        newSkinWeights[newIdx * 4 + j] = skinWeight.getComponent(oldIdx, j);
      }
    });

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    if (newNormals) {
      newGeometry.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
    }
    if (newUvs) {
      newGeometry.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2));
    }
    newGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(newSkinIndices, 4));
    newGeometry.setAttribute('skinWeight', new THREE.BufferAttribute(newSkinWeights, 4));
    newGeometry.setIndex(newIndices);

    let material: THREE.Material | THREE.Material[];
    if (Array.isArray(originalMesh.material)) {
      material = originalMesh.material.map((m: THREE.Material) => {
        const cloned = m.clone();
        if (cloned instanceof THREE.MeshStandardMaterial || cloned instanceof THREE.MeshPhysicalMaterial) {
          cloned.transparent = true;
          cloned.side = THREE.DoubleSide;
        }
        return cloned;
      });
    } else {
      material = originalMesh.material.clone();
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
        material.transparent = true;
        material.side = THREE.DoubleSide;
      }
    }

    const newMesh = new THREE.SkinnedMesh(newGeometry, material);
    newMesh.name = `muscle_${groupId}_from_${originalMesh.name}`;
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;

    newMesh.bind(originalMesh.skeleton, originalMesh.bindMatrix);

    if (originalMesh.parent) {
      originalMesh.parent.add(newMesh);
    }

    if (!groupResults.has(groupId)) {
      const def = MUSCLE_GROUPS.find(g => g.id === groupId) || { id: groupId, label: groupId === 'other' ? 'Other Tissue' : groupId, color: '#888888' };
      groupResults.set(groupId, {
        id: def.id,
        label: def.label,
        color: def.color,
        meshes: [],
        visible: true,
      });
    }
    groupResults.get(groupId)!.meshes.push(newMesh);
  });
}

function majorityVote(a: string, b: string, c: string): string {
  if (a === b || a === c) return a;
  if (b === c) return b;
  return a;
}

export function splitMuscleMeshes(
  muscleMeshes: THREE.Object3D[],
): Map<string, SplitMuscleGroup> {
  const results = new Map<string, SplitMuscleGroup>();

  for (const mesh of muscleMeshes) {
    if (!(mesh instanceof THREE.SkinnedMesh)) continue;
    if (!mesh.skeleton || !mesh.geometry.getAttribute('skinIndex')) continue;

    splitSkinnedMesh(mesh, results);
    mesh.visible = false;
  }

  console.log(`Split muscle meshes into ${results.size} groups:`);
  Array.from(results.entries()).forEach(([id, group]) => {
    const totalVerts = group.meshes.reduce((sum: number, m: THREE.SkinnedMesh) => sum + m.geometry.getAttribute('position').count, 0);
    console.log(`  ${group.label} (${id}): ${group.meshes.length} sub-meshes, ${totalVerts} vertices`);
  });

  return results;
}

export function setMuscleGroupVisibility(
  groups: Map<string, SplitMuscleGroup>,
  groupId: string,
  visible: boolean
): void {
  const group = groups.get(groupId);
  if (!group) return;
  group.visible = visible;
  for (const mesh of group.meshes) {
    mesh.visible = visible;
  }
}

export function setAllMuscleGroupsVisibility(
  groups: Map<string, SplitMuscleGroup>,
  visible: boolean
): void {
  groups.forEach((group) => {
    group.visible = visible;
    group.meshes.forEach((mesh) => {
      mesh.visible = visible;
    });
  });
}

export function disposeMuscleGroups(groups: Map<string, SplitMuscleGroup>): void {
  groups.forEach((group) => {
    group.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m: THREE.Material) => m.dispose());
      if (mesh.parent) mesh.parent.remove(mesh);
    });
  });
  groups.clear();
}
