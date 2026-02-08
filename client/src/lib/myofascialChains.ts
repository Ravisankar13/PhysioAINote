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
      if (override?.pathology && override.pathology !== 'none') effectiveTension += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
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
        if (override?.pathology && override.pathology !== 'none') effectiveTension += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
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
      effective += PATHOLOGY_EFFECTS[override.pathology].tensionMod;
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
