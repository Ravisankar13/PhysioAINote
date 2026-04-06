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
  { id: 'scapula_r', label: 'Right Scapula', color: '#8e44ad', bones: ['Scapula_R'] },
  { id: 'scapula_l', label: 'Left Scapula', color: '#8e44ad', bones: ['Scapula_L'] },
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
  { id: 'chest', label: 'Chest', color: '#e91e63', bones: ['Chest_M'] },
  { id: 'spine', label: 'Spine', color: '#ff9800', bones: ['Spine1_M', 'Chest_M'] },
  { id: 'neck', label: 'Neck', color: '#795548', bones: ['Neck_M', 'NeckPart1_M', 'NeckPart2_M'] },
  { id: 'core', label: 'Core', color: '#f1c40f', bones: ['Root_M', 'RootPart1_M', 'RootPart2_M'] },
];

const NAMED_MUSCLE_TO_GROUP: Record<string, string> = {
  'Deltoid1': 'deltoid_r',
  'supraspinatus': 'scapula_r',
  'Infraspinatus1': 'scapula_r',
  'Lat_Dorsi': 'spine',
  'Trapezius': 'spine',
  'Trapezius_lower': 'spine',
  'Trapezius_mid': 'spine',
  'Trapezius_upper': 'neck',
  'Pec_major': 'chest',
  'Pec_minor': 'chest',
  'Teres_major': 'scapula_r',
  'Teres_minor': 'scapula_r',
  'Levator_scapula': 'neck',
  'Rhomboid_major_minor': 'scapula_r',
  'Gluteus_maximus': 'glute_r',
  'Gluteus_medius1': 'glute_r',
  'Gluteus_Minimus': 'glute_r',
  'Piriformis': 'glute_r',
  'Obturator_externus': 'glute_r',
  'Quadratus_femoris': 'glute_r',
  'Gemelli_inferior': 'glute_r',
  'Rectus_abdominus': 'core',
  'External_obliques': 'core',
  'Internal_obliques': 'core',
  'Quadratus_lumborum': 'core',
};

export interface SplitMuscleGroup {
  id: string;
  label: string;
  color: string;
  meshes: THREE.Mesh[];
  visible: boolean;
}

function classifyMeshByName(meshName: string): string | null {
  const direct = NAMED_MUSCLE_TO_GROUP[meshName];
  if (direct) return direct;
  const lower = meshName.toLowerCase();
  for (const [key, group] of Object.entries(NAMED_MUSCLE_TO_GROUP)) {
    if (lower.includes(key.toLowerCase())) return group;
  }
  return null;
}

function classifyMeshByBoneWeights(
  mesh: THREE.SkinnedMesh
): string {
  const geometry = mesh.geometry;
  const skinIndex = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
  const skinWeight = geometry.getAttribute('skinWeight') as THREE.BufferAttribute;

  if (!skinIndex || !skinWeight || !mesh.skeleton) return 'other';

  const boneCounts: Record<string, number> = {};
  const sampleCount = Math.min(skinIndex.count, 200);
  const step = Math.max(1, Math.floor(skinIndex.count / sampleCount));

  for (let i = 0; i < skinIndex.count; i += step) {
    let maxWeight = 0;
    let dominantBoneIdx = 0;
    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantBoneIdx = skinIndex.getComponent(i, j);
      }
    }
    const bone = mesh.skeleton.bones[dominantBoneIdx];
    if (bone) {
      const name = bone.name;
      boneCounts[name] = (boneCounts[name] || 0) + 1;
    }
  }

  let topBone = '';
  let topCount = 0;
  for (const [name, count] of Object.entries(boneCounts)) {
    if (count > topCount) {
      topCount = count;
      topBone = name;
    }
  }

  for (const group of MUSCLE_GROUPS) {
    if (group.bones.includes(topBone)) {
      return group.id;
    }
  }

  return 'other';
}

export function classifyMuscleMeshes(
  muscleMeshes: THREE.Object3D[],
): Map<string, SplitMuscleGroup> {
  const results = new Map<string, SplitMuscleGroup>();

  for (const mesh of muscleMeshes) {
    if (!(mesh instanceof THREE.SkinnedMesh)) continue;
    if (!mesh.skeleton || !mesh.geometry.getAttribute('skinIndex')) continue;

    const namedGroup = classifyMeshByName(mesh.name);
    const groupId = namedGroup || classifyMeshByBoneWeights(mesh);

    if (!results.has(groupId)) {
      const def = MUSCLE_GROUPS.find(g => g.id === groupId) || {
        id: groupId,
        label: groupId === 'other' ? 'Other Tissue' : groupId,
        color: '#888888'
      };
      results.set(groupId, {
        id: def.id,
        label: def.label,
        color: def.color,
        meshes: [],
        visible: true,
      });
    }
    results.get(groupId)!.meshes.push(mesh);
  }

  console.log(`Classified ${muscleMeshes.length} muscle meshes into ${results.size} groups:`);
  Array.from(results.entries()).forEach(([id, group]) => {
    const meshNames = group.meshes.map(m => m.name).join(', ');
    console.log(`  ${group.label} (${id}): ${group.meshes.length} meshes [${meshNames}]`);
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
  groups.clear();
}
