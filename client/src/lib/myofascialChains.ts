import { type MuscleOverride, PATHOLOGY_EFFECTS } from './muscleBiomechanicsEngine';

export interface ChainLink {
  muscleId: string;
  propagationWeight: number;
}

export interface MyofascialChain {
  id: string;
  name: string;
  color: string;
  links: ChainLink[];
}

export interface FunctionalSling {
  id: string;
  name: string;
  pairs: [string, string][];
  propagationWeight: number;
}

export const MYOFASCIAL_CHAINS: MyofascialChain[] = [
  {
    id: 'superficial_back_l',
    name: 'Superficial Back Line (L)',
    color: '#e74c3c',
    links: [
      { muscleId: 'shin_l', propagationWeight: 0.7 },
      { muscleId: 'calf_l', propagationWeight: 0.8 },
      { muscleId: 'glute_l', propagationWeight: 0.6 },
      { muscleId: 'spine', propagationWeight: 0.8 },
      { muscleId: 'neck', propagationWeight: 0.6 },
    ],
  },
  {
    id: 'superficial_back_r',
    name: 'Superficial Back Line (R)',
    color: '#e74c3c',
    links: [
      { muscleId: 'shin_r', propagationWeight: 0.7 },
      { muscleId: 'calf_r', propagationWeight: 0.8 },
      { muscleId: 'glute_r', propagationWeight: 0.6 },
      { muscleId: 'spine', propagationWeight: 0.8 },
      { muscleId: 'neck', propagationWeight: 0.6 },
    ],
  },
  {
    id: 'superficial_front_l',
    name: 'Superficial Front Line (L)',
    color: '#3498db',
    links: [
      { muscleId: 'shin_l', propagationWeight: 0.6 },
      { muscleId: 'quad_l', propagationWeight: 0.8 },
      { muscleId: 'core', propagationWeight: 0.7 },
      { muscleId: 'chest', propagationWeight: 0.6 },
      { muscleId: 'neck', propagationWeight: 0.5 },
    ],
  },
  {
    id: 'superficial_front_r',
    name: 'Superficial Front Line (R)',
    color: '#3498db',
    links: [
      { muscleId: 'shin_r', propagationWeight: 0.6 },
      { muscleId: 'quad_r', propagationWeight: 0.8 },
      { muscleId: 'core', propagationWeight: 0.7 },
      { muscleId: 'chest', propagationWeight: 0.6 },
      { muscleId: 'neck', propagationWeight: 0.5 },
    ],
  },
  {
    id: 'lateral_line_l',
    name: 'Lateral Line (L)',
    color: '#f39c12',
    links: [
      { muscleId: 'shin_l', propagationWeight: 0.5 },
      { muscleId: 'calf_l', propagationWeight: 0.5 },
      { muscleId: 'glute_l', propagationWeight: 0.7 },
      { muscleId: 'core', propagationWeight: 0.6 },
      { muscleId: 'deltoid_l', propagationWeight: 0.5 },
      { muscleId: 'neck', propagationWeight: 0.4 },
    ],
  },
  {
    id: 'lateral_line_r',
    name: 'Lateral Line (R)',
    color: '#f39c12',
    links: [
      { muscleId: 'shin_r', propagationWeight: 0.5 },
      { muscleId: 'calf_r', propagationWeight: 0.5 },
      { muscleId: 'glute_r', propagationWeight: 0.7 },
      { muscleId: 'core', propagationWeight: 0.6 },
      { muscleId: 'deltoid_r', propagationWeight: 0.5 },
      { muscleId: 'neck', propagationWeight: 0.4 },
    ],
  },
  {
    id: 'spiral_line_l',
    name: 'Spiral Line (L)',
    color: '#9b59b6',
    links: [
      { muscleId: 'shin_l', propagationWeight: 0.5 },
      { muscleId: 'quad_l', propagationWeight: 0.6 },
      { muscleId: 'core', propagationWeight: 0.8 },
      { muscleId: 'spine', propagationWeight: 0.7 },
      { muscleId: 'scapula_r', propagationWeight: 0.5 },
      { muscleId: 'deltoid_r', propagationWeight: 0.5 },
    ],
  },
  {
    id: 'spiral_line_r',
    name: 'Spiral Line (R)',
    color: '#9b59b6',
    links: [
      { muscleId: 'shin_r', propagationWeight: 0.5 },
      { muscleId: 'quad_r', propagationWeight: 0.6 },
      { muscleId: 'core', propagationWeight: 0.8 },
      { muscleId: 'spine', propagationWeight: 0.7 },
      { muscleId: 'scapula_l', propagationWeight: 0.5 },
      { muscleId: 'deltoid_l', propagationWeight: 0.5 },
    ],
  },
  {
    id: 'deep_front_l',
    name: 'Deep Front Line (L)',
    color: '#2ecc71',
    links: [
      { muscleId: 'shin_l', propagationWeight: 0.6 },
      { muscleId: 'calf_l', propagationWeight: 0.6 },
      { muscleId: 'quad_l', propagationWeight: 0.5 },
      { muscleId: 'core', propagationWeight: 0.9 },
      { muscleId: 'spine', propagationWeight: 0.6 },
      { muscleId: 'chest', propagationWeight: 0.5 },
      { muscleId: 'neck', propagationWeight: 0.7 },
    ],
  },
  {
    id: 'deep_front_r',
    name: 'Deep Front Line (R)',
    color: '#2ecc71',
    links: [
      { muscleId: 'shin_r', propagationWeight: 0.6 },
      { muscleId: 'calf_r', propagationWeight: 0.6 },
      { muscleId: 'quad_r', propagationWeight: 0.5 },
      { muscleId: 'core', propagationWeight: 0.9 },
      { muscleId: 'spine', propagationWeight: 0.6 },
      { muscleId: 'chest', propagationWeight: 0.5 },
      { muscleId: 'neck', propagationWeight: 0.7 },
    ],
  },
  {
    id: 'arm_line_l',
    name: 'Arm Line (L)',
    color: '#1abc9c',
    links: [
      { muscleId: 'bicep_l', propagationWeight: 0.7 },
      { muscleId: 'deltoid_l', propagationWeight: 0.8 },
      { muscleId: 'scapula_l', propagationWeight: 0.7 },
      { muscleId: 'chest', propagationWeight: 0.5 },
      { muscleId: 'spine', propagationWeight: 0.4 },
    ],
  },
  {
    id: 'arm_line_r',
    name: 'Arm Line (R)',
    color: '#1abc9c',
    links: [
      { muscleId: 'bicep_r', propagationWeight: 0.7 },
      { muscleId: 'deltoid_r', propagationWeight: 0.8 },
      { muscleId: 'scapula_r', propagationWeight: 0.7 },
      { muscleId: 'chest', propagationWeight: 0.5 },
      { muscleId: 'spine', propagationWeight: 0.4 },
    ],
  },
];

export const FUNCTIONAL_SLINGS: FunctionalSling[] = [
  {
    id: 'anterior_oblique',
    name: 'Anterior Oblique Sling',
    pairs: [
      ['deltoid_l', 'glute_r'],
      ['deltoid_r', 'glute_l'],
      ['chest', 'core'],
    ],
    propagationWeight: 0.4,
  },
  {
    id: 'posterior_oblique',
    name: 'Posterior Oblique Sling',
    pairs: [
      ['scapula_l', 'glute_r'],
      ['scapula_r', 'glute_l'],
      ['spine', 'core'],
    ],
    propagationWeight: 0.4,
  },
  {
    id: 'lateral_sling',
    name: 'Lateral Sling',
    pairs: [
      ['glute_l', 'core'],
      ['glute_r', 'core'],
      ['quad_l', 'glute_l'],
      ['quad_r', 'glute_r'],
    ],
    propagationWeight: 0.35,
  },
  {
    id: 'deep_longitudinal',
    name: 'Deep Longitudinal Sling',
    pairs: [
      ['calf_l', 'spine'],
      ['calf_r', 'spine'],
      ['glute_l', 'spine'],
      ['glute_r', 'spine'],
    ],
    propagationWeight: 0.3,
  },
];

export interface ChainEffect {
  chainId: string;
  chainName: string;
  chainColor: string;
  sourceMuscle: string;
  tensionDelta: number;
}

export interface PropagatedMuscleState {
  chainEffects: ChainEffect[];
  slingEffects: ChainEffect[];
  totalChainTension: number;
  totalChainActivation: number;
}

export const MUSCLE_BONE_POSITIONS: Record<string, string> = {
  shin_l: 'Ankle_L',
  shin_r: 'Ankle_R',
  calf_l: 'Knee_L',
  calf_r: 'Knee_R',
  quad_l: 'HipPart2_L',
  quad_r: 'HipPart2_R',
  glute_l: 'Hip_L',
  glute_r: 'Hip_R',
  core: 'RootPart1_M',
  spine: 'Spine1_M',
  neck: 'Neck_M',
  chest: 'Chest_M',
  deltoid_l: 'Shoulder_L',
  deltoid_r: 'Shoulder_R',
  bicep_l: 'Elbow_L',
  bicep_r: 'Elbow_R',
  scapula_l: 'Scapula_L',
  scapula_r: 'Scapula_R',
  foot_l: 'Toes_L',
  foot_r: 'Toes_R',
};

export function getChainMembership(muscleId: string): MyofascialChain[] {
  return MYOFASCIAL_CHAINS.filter(chain =>
    chain.links.some(link => link.muscleId === muscleId)
  );
}

function getDistanceInChain(chain: MyofascialChain, sourceIdx: number, targetIdx: number): number {
  return Math.abs(sourceIdx - targetIdx);
}

export function propagateChainEffects(
  baseTensions: { [muscleId: string]: number },
  overrides: { [muscleId: string]: MuscleOverride }
): { [muscleId: string]: PropagatedMuscleState } {
  const results: { [muscleId: string]: PropagatedMuscleState } = {};
  const allMuscleIds = new Set<string>();

  MYOFASCIAL_CHAINS.forEach(chain => chain.links.forEach(l => allMuscleIds.add(l.muscleId)));
  FUNCTIONAL_SLINGS.forEach(sling => sling.pairs.forEach(([a, b]) => { allMuscleIds.add(a); allMuscleIds.add(b); }));
  Object.keys(baseTensions).forEach(id => allMuscleIds.add(id));
  Object.keys(overrides).forEach(id => allMuscleIds.add(id));

  Array.from(allMuscleIds).forEach(id => {
    results[id] = { chainEffects: [], slingEffects: [], totalChainTension: 0, totalChainActivation: 0 };
  });

  for (const chain of MYOFASCIAL_CHAINS) {
    const linkIds = chain.links.map(l => l.muscleId);
    const uniqueIds = Array.from(new Set(linkIds));

    for (const sourceId of uniqueIds) {
      const baseTension = baseTensions[sourceId] ?? 50;
      const override = overrides[sourceId];
      let effectiveTension = baseTension + (override?.tensionOffset ?? 0);
      if (override?.lengthOverride === 'shortened') effectiveTension = Math.max(effectiveTension, 70);
      else if (override?.lengthOverride === 'lengthened') effectiveTension = Math.min(effectiveTension, 30);
      if (override?.pathology && override.pathology !== 'none' && PATHOLOGY_EFFECTS[override.pathology]) effectiveTension += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
      const deviation = effectiveTension - 50;

      if (Math.abs(deviation) < 5) continue;

      const sourceLink = chain.links.find(l => l.muscleId === sourceId);
      if (!sourceLink) continue;
      const sourceIdx = chain.links.indexOf(sourceLink);

      for (const targetId of uniqueIds) {
        if (targetId === sourceId) continue;

        const targetLink = chain.links.find(l => l.muscleId === targetId);
        if (!targetLink) continue;
        const targetIdx = chain.links.indexOf(targetLink);

        const distance = getDistanceInChain(chain, sourceIdx, targetIdx);
        const decayFactor = Math.pow(0.6, distance);
        const tensionDelta = deviation * sourceLink.propagationWeight * targetLink.propagationWeight * decayFactor * 0.3;

        if (Math.abs(tensionDelta) < 0.5) continue;

        if (!results[targetId]) {
          results[targetId] = { chainEffects: [], slingEffects: [], totalChainTension: 0, totalChainActivation: 0 };
        }

        results[targetId].chainEffects.push({
          chainId: chain.id,
          chainName: chain.name,
          chainColor: chain.color,
          sourceMuscle: sourceId,
          tensionDelta,
        });
        results[targetId].totalChainTension += tensionDelta;
        results[targetId].totalChainActivation += Math.abs(tensionDelta) * 0.5;
      }
    }
  }

  for (const sling of FUNCTIONAL_SLINGS) {
    for (const [muscleA, muscleB] of sling.pairs) {
      const processPair = (source: string, target: string) => {
        const baseTension = baseTensions[source] ?? 50;
        const override = overrides[source];
        let effectiveTension = baseTension + (override?.tensionOffset ?? 0);
        if (override?.lengthOverride === 'shortened') effectiveTension = Math.max(effectiveTension, 70);
        else if (override?.lengthOverride === 'lengthened') effectiveTension = Math.min(effectiveTension, 30);
        if (override?.pathology && override.pathology !== 'none' && PATHOLOGY_EFFECTS[override.pathology]) effectiveTension += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
        const deviation = effectiveTension - 50;

        if (Math.abs(deviation) < 5) return;

        const tensionDelta = deviation * sling.propagationWeight * 0.25;

        if (Math.abs(tensionDelta) < 0.5) return;

        if (!results[target]) {
          results[target] = { chainEffects: [], slingEffects: [], totalChainTension: 0, totalChainActivation: 0 };
        }

        results[target].slingEffects.push({
          chainId: sling.id,
          chainName: sling.name,
          chainColor: '#e67e22',
          sourceMuscle: source,
          tensionDelta,
        });
        results[target].totalChainTension += tensionDelta;
        results[target].totalChainActivation += Math.abs(tensionDelta) * 0.3;
      };

      processPair(muscleA, muscleB);
      processPair(muscleB, muscleA);
    }
  }

  return results;
}

export function computeWholeBodyTensionScore(
  tensions: { [muscleId: string]: number },
  overrides: { [muscleId: string]: MuscleOverride }
): { score: number; level: 'low' | 'moderate' | 'high' | 'critical'; description: string } {
  const ids = Object.keys(tensions);
  if (ids.length === 0) return { score: 0, level: 'low', description: 'No data' };

  let totalDeviation = 0;
  let maxDeviation = 0;
  let overrideCount = 0;

  let pathologyCount = 0;
  let inhibitionTotal = 0;

  for (const id of ids) {
    const base = tensions[id];
    const override = overrides[id];
    let effective = base + (override?.tensionOffset ?? 0);
    if (override?.lengthOverride === 'shortened') effective = Math.max(effective, 70);
    else if (override?.lengthOverride === 'lengthened') effective = Math.min(effective, 30);
    if (override?.pathology && override.pathology !== 'none') {
      if (PATHOLOGY_EFFECTS[override.pathology]) effective += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
      pathologyCount++;
    }
    if (override?.inhibition && override.inhibition > 0) {
      inhibitionTotal += override.inhibition;
    }
    const dev = Math.abs(effective - 50);
    totalDeviation += dev;
    maxDeviation = Math.max(maxDeviation, dev);
    if (override?.isManual) overrideCount++;
  }

  const avgDeviation = totalDeviation / ids.length;
  let score = Math.min(100, avgDeviation * 2 + maxDeviation * 0.5);
  score += pathologyCount * 5;
  score += (inhibitionTotal / ids.length) * 0.3;
  score = Math.min(100, score);

  let level: 'low' | 'moderate' | 'high' | 'critical';
  let description: string;

  if (score < 20) {
    level = 'low';
    description = 'Body is in a balanced, low-stress state';
  } else if (score < 45) {
    level = 'moderate';
    description = 'Some regional tension detected, compensatory patterns possible';
  } else if (score < 70) {
    level = 'high';
    description = 'Significant tension across multiple chains, likely compensatory patterns active';
  } else {
    level = 'critical';
    description = 'High systemic tension, multiple fascial chains under stress';
  }

  const details: string[] = [];
  if (overrideCount > 0) details.push(`${overrideCount} override${overrideCount > 1 ? 's' : ''}`);
  if (pathologyCount > 0) details.push(`${pathologyCount} patholog${pathologyCount > 1 ? 'ies' : 'y'}`);
  if (inhibitionTotal > 0) details.push('inhibition present');
  if (details.length > 0) {
    description += ` (${details.join(', ')})`;
  }

  return { score: Math.round(score), level, description };
}

export interface ChainRecommendation {
  chainId: string;
  chainName: string;
  level: 'moderate' | 'high' | 'critical';
  stretches: string[];
  treatments: string[];
  description: string;
}

const CHAIN_RECOMMENDATIONS: Record<string, { stretches: string[]; treatments: Record<string, string[]> }> = {
  superficial_back_l: {
    stretches: ['Seated Forward Fold', 'Cat-Cow Stretch', 'Standing Calf Stretch', 'Downward Dog'],
    treatments: {
      moderate: ['Foam rolling along posterior chain', 'Gentle dynamic stretching pre-activity'],
      high: ['Myofascial release of erector spinae', 'Deep tissue massage of calves and hamstrings', 'Neural flossing for sciatic nerve'],
      critical: ['Manual therapy focusing on thoracolumbar fascia', 'Trigger point dry needling of paraspinals', 'Progressive eccentric loading program'],
    },
  },
  superficial_back_r: {
    stretches: ['Seated Forward Fold', 'Cat-Cow Stretch', 'Standing Calf Stretch', 'Downward Dog'],
    treatments: {
      moderate: ['Foam rolling along posterior chain', 'Gentle dynamic stretching pre-activity'],
      high: ['Myofascial release of erector spinae', 'Deep tissue massage of calves and hamstrings', 'Neural flossing for sciatic nerve'],
      critical: ['Manual therapy focusing on thoracolumbar fascia', 'Trigger point dry needling of paraspinals', 'Progressive eccentric loading program'],
    },
  },
  superficial_front_l: {
    stretches: ['Standing Quad Stretch', 'Hip Flexor Lunge Stretch', 'Chest Doorway Stretch', 'Cobra Pose'],
    treatments: {
      moderate: ['Self-massage of quadriceps and hip flexors', 'Active mobility drills for hip extension'],
      high: ['Soft tissue mobilization of rectus femoris', 'Psoas release technique', 'Anterior chain stretching protocol'],
      critical: ['Instrument-assisted soft tissue mobilization (IASTM)', 'PNF stretching of hip flexors and quads', 'Breathing re-education for diaphragm release'],
    },
  },
  superficial_front_r: {
    stretches: ['Standing Quad Stretch', 'Hip Flexor Lunge Stretch', 'Chest Doorway Stretch', 'Cobra Pose'],
    treatments: {
      moderate: ['Self-massage of quadriceps and hip flexors', 'Active mobility drills for hip extension'],
      high: ['Soft tissue mobilization of rectus femoris', 'Psoas release technique', 'Anterior chain stretching protocol'],
      critical: ['Instrument-assisted soft tissue mobilization (IASTM)', 'PNF stretching of hip flexors and quads', 'Breathing re-education for diaphragm release'],
    },
  },
  lateral_line_l: {
    stretches: ['Side-Lying Lateral Stretch', 'IT Band Foam Roll', 'Standing Side Bend', 'Pigeon Pose Variation'],
    treatments: {
      moderate: ['Lateral chain foam rolling', 'Balance training on unstable surfaces'],
      high: ['IT band release with sustained pressure', 'Gluteus medius activation exercises', 'Lateral hip mobilization'],
      critical: ['Manual fascial release of lateral line', 'Corrective exercise for frontal plane imbalance', 'Neuromuscular re-education for lateral stability'],
    },
  },
  lateral_line_r: {
    stretches: ['Side-Lying Lateral Stretch', 'IT Band Foam Roll', 'Standing Side Bend', 'Pigeon Pose Variation'],
    treatments: {
      moderate: ['Lateral chain foam rolling', 'Balance training on unstable surfaces'],
      high: ['IT band release with sustained pressure', 'Gluteus medius activation exercises', 'Lateral hip mobilization'],
      critical: ['Manual fascial release of lateral line', 'Corrective exercise for frontal plane imbalance', 'Neuromuscular re-education for lateral stability'],
    },
  },
  spiral_line_l: {
    stretches: ['Seated Spinal Twist', 'Thread the Needle', 'Supine Trunk Rotation', 'World\'s Greatest Stretch'],
    treatments: {
      moderate: ['Rotational mobility exercises', 'Cross-body foam rolling patterns'],
      high: ['Oblique and rotator cuff soft tissue work', 'Anti-rotation core stability exercises', 'Thoracic spine mobilization'],
      critical: ['Manual therapy for rotational restrictions', 'Spiral line fascial release', 'Functional rotational retraining program'],
    },
  },
  spiral_line_r: {
    stretches: ['Seated Spinal Twist', 'Thread the Needle', 'Supine Trunk Rotation', 'World\'s Greatest Stretch'],
    treatments: {
      moderate: ['Rotational mobility exercises', 'Cross-body foam rolling patterns'],
      high: ['Oblique and rotator cuff soft tissue work', 'Anti-rotation core stability exercises', 'Thoracic spine mobilization'],
      critical: ['Manual therapy for rotational restrictions', 'Spiral line fascial release', 'Functional rotational retraining program'],
    },
  },
  deep_front_l: {
    stretches: ['Diaphragmatic Breathing', 'Psoas March', 'Deep Squat Hold', 'Child\'s Pose with Breathing'],
    treatments: {
      moderate: ['Breathing exercises and diaphragm mobility', 'Gentle psoas stretching with pelvic control'],
      high: ['Visceral mobilization techniques', 'Deep front line fascial release', 'Pelvic floor coordination exercises'],
      critical: ['Manual therapy for deep fascial restrictions', 'Craniosacral integration', 'Comprehensive core stability retraining'],
    },
  },
  deep_front_r: {
    stretches: ['Diaphragmatic Breathing', 'Psoas March', 'Deep Squat Hold', 'Child\'s Pose with Breathing'],
    treatments: {
      moderate: ['Breathing exercises and diaphragm mobility', 'Gentle psoas stretching with pelvic control'],
      high: ['Visceral mobilization techniques', 'Deep front line fascial release', 'Pelvic floor coordination exercises'],
      critical: ['Manual therapy for deep fascial restrictions', 'Craniosacral integration', 'Comprehensive core stability retraining'],
    },
  },
  arm_line_l: {
    stretches: ['Cross-Body Shoulder Stretch', 'Wrist Flexor/Extensor Stretch', 'Doorway Pec Stretch', 'Eagle Arms'],
    treatments: {
      moderate: ['Upper limb foam rolling and self-massage', 'Scapular stabilization exercises'],
      high: ['Shoulder girdle soft tissue mobilization', 'Neural gliding for median/ulnar nerve', 'Rotator cuff strengthening protocol'],
      critical: ['Manual therapy for shoulder capsule restrictions', 'Comprehensive upper quarter treatment', 'Graduated loading program for arm line'],
    },
  },
  arm_line_r: {
    stretches: ['Cross-Body Shoulder Stretch', 'Wrist Flexor/Extensor Stretch', 'Doorway Pec Stretch', 'Eagle Arms'],
    treatments: {
      moderate: ['Upper limb foam rolling and self-massage', 'Scapular stabilization exercises'],
      high: ['Shoulder girdle soft tissue mobilization', 'Neural gliding for median/ulnar nerve', 'Rotator cuff strengthening protocol'],
      critical: ['Manual therapy for shoulder capsule restrictions', 'Comprehensive upper quarter treatment', 'Graduated loading program for arm line'],
    },
  },
};

export function getChainRecommendations(
  chainEffects: { chainId: string; avgTension: number }[]
): ChainRecommendation[] {
  const recommendations: ChainRecommendation[] = [];

  for (const effect of chainEffects) {
    if (effect.avgTension <= 55 && effect.avgTension >= 45) continue;

    const chain = MYOFASCIAL_CHAINS.find(c => c.id === effect.chainId);
    if (!chain) continue;

    const data = CHAIN_RECOMMENDATIONS[effect.chainId];
    if (!data) continue;

    const deviation = Math.abs(effect.avgTension - 50);
    let level: 'moderate' | 'high' | 'critical';
    if (deviation >= 25) level = 'critical';
    else if (deviation >= 15) level = 'high';
    else level = 'moderate';

    const description = deviation >= 25
      ? `Critical tension imbalance (${Math.round(effect.avgTension)}%) — immediate intervention recommended`
      : deviation >= 15
      ? `High tension detected (${Math.round(effect.avgTension)}%) — targeted treatment advised`
      : `Moderate tension deviation (${Math.round(effect.avgTension)}%) — preventive stretching recommended`;

    recommendations.push({
      chainId: effect.chainId,
      chainName: chain.name,
      level,
      stretches: data.stretches.slice(0, 3),
      treatments: data.treatments[level] || [],
      description,
    });
  }

  return recommendations.sort((a, b) => {
    const order = { critical: 0, high: 1, moderate: 2 };
    return order[a.level] - order[b.level];
  });
}

export function findChainsForBone(boneName: string): { chainId: string; muscleId: string }[] {
  const results: { chainId: string; muscleId: string }[] = [];
  const boneToMuscle: Record<string, string[]> = {};
  for (const [muscleId, bone] of Object.entries(MUSCLE_BONE_POSITIONS)) {
    if (!boneToMuscle[bone]) boneToMuscle[bone] = [];
    boneToMuscle[bone].push(muscleId);
  }

  const BONE_ADJACENCY: Record<string, string[]> = {
    'Ankle_L': ['Knee_L', 'Toes_L'],
    'Ankle_R': ['Knee_R', 'Toes_R'],
    'Knee_L': ['Ankle_L', 'HipPart2_L', 'Hip_L'],
    'Knee_R': ['Ankle_R', 'HipPart2_R', 'Hip_R'],
    'HipPart2_L': ['Knee_L', 'Hip_L', 'RootPart1_M'],
    'HipPart2_R': ['Knee_R', 'Hip_R', 'RootPart1_M'],
    'Hip_L': ['HipPart2_L', 'RootPart1_M', 'Spine1_M'],
    'Hip_R': ['HipPart2_R', 'RootPart1_M', 'Spine1_M'],
    'RootPart1_M': ['Hip_L', 'Hip_R', 'Spine1_M'],
    'Spine1_M': ['RootPart1_M', 'Chest_M', 'Neck_M'],
    'Chest_M': ['Spine1_M', 'Neck_M', 'Shoulder_L', 'Shoulder_R', 'Scapula_L', 'Scapula_R'],
    'Neck_M': ['Chest_M', 'Spine1_M'],
    'Shoulder_L': ['Chest_M', 'Scapula_L', 'Elbow_L'],
    'Shoulder_R': ['Chest_M', 'Scapula_R', 'Elbow_R'],
    'Scapula_L': ['Chest_M', 'Shoulder_L'],
    'Scapula_R': ['Chest_M', 'Shoulder_R'],
    'Elbow_L': ['Shoulder_L'],
    'Elbow_R': ['Shoulder_R'],
    'Toes_L': ['Ankle_L'],
    'Toes_R': ['Ankle_R'],
  };

  const directMuscles = boneToMuscle[boneName] || [];
  const adjacentBones = BONE_ADJACENCY[boneName] || [];
  const nearbyMuscles = new Set(directMuscles);
  for (const adjBone of adjacentBones) {
    for (const m of (boneToMuscle[adjBone] || [])) {
      nearbyMuscles.add(m);
    }
  }

  for (const muscleId of nearbyMuscles) {
    for (const chain of MYOFASCIAL_CHAINS) {
      if (chain.links.some(l => l.muscleId === muscleId)) {
        if (!results.some(r => r.chainId === chain.id && r.muscleId === muscleId)) {
          results.push({ chainId: chain.id, muscleId });
        }
      }
    }
  }

  return results;
}

export interface PainTensionContributor {
  painMarkerId: string;
  painLabel: string;
  contributors: {
    chainId: string;
    chainName: string;
    chainColor: string;
    muscleId: string;
    tension: number;
    tensionDeviation: number;
    score: number;
  }[];
}

export function rankPainTensionContributors(
  painMarkers: { id: string; nearestBone: string; anatomicalLabel?: string }[],
  tensions: Record<string, number>,
  chainEffects: { chainId: string; avgTension: number }[]
): PainTensionContributor[] {
  const results: PainTensionContributor[] = [];

  for (const pm of painMarkers) {
    if (!pm.nearestBone) continue;
    const chainMatches = findChainsForBone(pm.nearestBone);
    const contributorMap = new Map<string, PainTensionContributor['contributors'][number]>();

    for (const match of chainMatches) {
      const chain = MYOFASCIAL_CHAINS.find(c => c.id === match.chainId);
      if (!chain) continue;
      const effect = chainEffects.find(e => e.chainId === match.chainId);
      const chainTension = effect?.avgTension ?? 50;
      const muscleTension = tensions[match.muscleId] ?? 50;
      const tensionDeviation = Math.abs(muscleTension - 50);
      const chainDeviation = Math.abs(chainTension - 50);
      const score = tensionDeviation * 0.6 + chainDeviation * 0.4;

      if (score < 3) continue;

      const key = `${match.chainId}_${match.muscleId}`;
      if (!contributorMap.has(key) || (contributorMap.get(key)?.score ?? 0) < score) {
        contributorMap.set(key, {
          chainId: match.chainId,
          chainName: chain.name,
          chainColor: chain.color,
          muscleId: match.muscleId,
          tension: muscleTension,
          tensionDeviation,
          score,
        });
      }
    }

    const contributors = Array.from(contributorMap.values()).sort((a, b) => b.score - a.score);
    if (contributors.length > 0) {
      results.push({
        painMarkerId: pm.id,
        painLabel: pm.anatomicalLabel || pm.nearestBone,
        contributors,
      });
    }
  }

  return results;
}

export const JOINT_TO_MUSCLE_MAP: Record<string, string[]> = {
  plantar_fascia: ['shin_l', 'shin_r'],
  calcaneus: ['calf_l', 'calf_r'],
  gastrocnemius: ['calf_l', 'calf_r'],
  knee_posterior: ['calf_l', 'calf_r'],
  hamstrings: ['glute_l', 'glute_r'],
  biceps_femoris: ['glute_l', 'glute_r'],
  sacrotuberous: ['glute_l', 'glute_r', 'spine'],
  erector_spinae: ['spine'],
  suboccipitals: ['neck'],
  galea: ['neck'],
  toe_extensors: ['shin_l', 'shin_r'],
  tibialis_anterior: ['shin_l', 'shin_r'],
  tibialis_ant: ['shin_l', 'shin_r'],
  tibialis_post: ['calf_l', 'calf_r'],
  quadriceps: ['quad_l', 'quad_r'],
  hip_flexors: ['quad_l', 'quad_r', 'core'],
  rectus_abdominis: ['core'],
  sternochondral: ['chest'],
  scm: ['neck'],
  peroneals: ['shin_l', 'shin_r'],
  peroneus_longus: ['shin_l', 'shin_r'],
  it_band: ['glute_l', 'glute_r'],
  tfl_itb: ['glute_l', 'glute_r'],
  tfl_it_band: ['glute_l', 'glute_r'],
  tfl_glut_med: ['glute_l', 'glute_r'],
  lateral_abdominals: ['core'],
  intercostals: ['chest'],
  lateral_neck: ['neck'],
  splenius: ['neck'],
  external_oblique: ['core'],
  ext_oblique: ['core'],
  internal_oblique_contra: ['core'],
  adductors: ['quad_l', 'quad_r'],
  ipsi_adductors: ['quad_l', 'quad_r'],
  contra_adductors: ['quad_l', 'quad_r'],
  pelvic_floor: ['core'],
  psoas_diaphragm: ['core'],
  transversus: ['core'],
  multifidus: ['spine'],
  thoracolumbar_fascia: ['spine'],
  lat_dorsi: ['spine', 'scapula_l', 'scapula_r'],
  glut_med_min: ['glute_l', 'glute_r'],
  contra_glut_max: ['glute_l', 'glute_r'],
  contra_ql: ['core'],
  rhomboids_contra: ['scapula_l', 'scapula_r'],
  serratus_anterior: ['scapula_l', 'scapula_r'],
  scapulothoracic: ['scapula_l', 'scapula_r'],
  glenohumeral: ['deltoid_l', 'deltoid_r'],
  elbow_forearm: ['bicep_l', 'bicep_r'],
  wrist_hand: ['bicep_l', 'bicep_r'],
  deep_neck_flex: ['neck'],
  popliteus: ['calf_l', 'calf_r'],
  anterior_abd_fascia: ['core'],
  lumbopelvic: ['spine', 'core'],
  core_trunk: ['core', 'spine'],
  hip_complex: ['glute_l', 'glute_r', 'quad_l', 'quad_r'],
  knee_complex: ['quad_l', 'quad_r', 'calf_l', 'calf_r'],
  foot_ankle: ['shin_l', 'shin_r', 'calf_l', 'calf_r'],
};

export function mapJointIdToMuscleIds(jointId: string): string[] {
  return JOINT_TO_MUSCLE_MAP[jointId] || [];
}
