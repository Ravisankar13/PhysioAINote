import { AGONIST_ANTAGONIST_PAIRS } from './bidirectionalMuscleJoint';
import { MYOFASCIAL_CHAINS } from './myofascialChains';
import { KINETIC_CHAINS } from './kineticChainExplorer';
import { getMuscleToGroupMap, type MuscleOverride } from './muscleBiomechanicsEngine';

export type InfluencePathway = 'reciprocal_inhibition' | 'fascial_chain' | 'kinetic_chain';

export interface InfluenceSource {
  sourceGroupId: string;
  sourceLabel: string;
  pathway: InfluencePathway;
  delta: number;
  chainName?: string;
  mechanism?: string;
}

export interface InfluenceEntry {
  targetGroupId: string;
  sources: InfluenceSource[];
}

export type InfluenceMap = Record<string, InfluenceEntry>;

const GROUP_LABELS: Record<string, string> = {
  neck: 'Neck', chest: 'Chest', spine: 'Spine', core: 'Core',
  scapula_l: 'L Scapula', scapula_r: 'R Scapula',
  deltoid_l: 'L Shoulder', deltoid_r: 'R Shoulder',
  bicep_l: 'L Arm', bicep_r: 'R Arm',
  glute_l: 'L Glute', glute_r: 'R Glute',
  quad_l: 'L Thigh', quad_r: 'R Thigh',
  calf_l: 'L Calf', calf_r: 'R Calf',
  shin_l: 'L Shin', shin_r: 'R Shin',
};

const MUSCLE_NAME_TO_GROUP: Record<string, string> = {
  'gastrocnemius': 'calf', 'soleus': 'calf', 'achilles': 'calf',
  'tibialis anterior': 'shin', 'tibialis posterior': 'shin', 'peroneus': 'shin', 'peroneal': 'shin',
  'quadriceps': 'quad', 'rectus femoris': 'quad', 'vastus': 'quad',
  'hamstrings': 'quad', 'biceps femoris': 'quad', 'semimembranosus': 'quad', 'semitendinosus': 'quad',
  'gluteus': 'glute', 'gluteals': 'glute', 'gluteus maximus': 'glute', 'gluteus medius': 'glute', 'gluteus minimus': 'glute',
  'iliopsoas': 'glute', 'hip flexor': 'glute', 'hip rotator': 'glute', 'adductor': 'glute', 'piriformis': 'glute',
  'erector spinae': 'spine', 'iliocostalis': 'spine', 'longissimus': 'spine', 'spinalis': 'spine', 'multifidus': 'spine',
  'rectus abdominis': 'core', 'transversus abdominis': 'core', 'oblique': 'core', 'external oblique': 'core', 'internal oblique': 'core',
  'diaphragm': 'core', 'psoas': 'core', 'pelvic floor': 'core', 'core stabilizer': 'core',
  'pectoralis': 'chest', 'sternal': 'chest',
  'deltoid': 'deltoid', 'rotator cuff': 'deltoid', 'latissimus dorsi': 'deltoid',
  'serratus anterior': 'scapula', 'trapezius': 'scapula', 'rhomboid': 'scapula', 'levator scapulae': 'scapula',
  'biceps': 'bicep', 'triceps': 'bicep', 'pronator': 'bicep', 'supinator': 'bicep',
  'sternocleidomastoid': 'neck', 'scalene': 'neck', 'splenius': 'neck', 'longus colli': 'neck', 'longus capitis': 'neck', 'deep cervical': 'neck', 'suboccipital': 'neck',
};

function muscleNameToGroupId(muscleName: string, side?: 'l' | 'r'): string | null {
  const lower = muscleName.toLowerCase();
  for (const [key, group] of Object.entries(MUSCLE_NAME_TO_GROUP)) {
    if (lower.includes(key) || key.includes(lower)) {
      if (['calf', 'shin', 'quad', 'glute', 'deltoid', 'scapula', 'bicep'].includes(group)) {
        return side ? `${group}_${side}` : null;
      }
      return group;
    }
  }
  return null;
}

function inferSideFromChain(chainId: string): 'l' | 'r' | null {
  if (chainId.endsWith('_l')) return 'l';
  if (chainId.endsWith('_r')) return 'r';
  return null;
}

export function computeInfluenceMap(
  muscleOverrides: Record<string, MuscleOverride>,
  crossMuscleEffects?: {
    reciprocalInhibitions?: Record<string, number>;
    chainPropagation?: Record<string, { totalChainTension: number; totalChainActivation: number }>;
  }
): InfluenceMap {
  const muscleToGroup = getMuscleToGroupMap();
  const result: InfluenceMap = {};

  const modifiedGroupIds = new Set<string>();
  for (const [id, ov] of Object.entries(muscleOverrides)) {
    if (!ov?.isManual) continue;
    const groupId = muscleToGroup[id] || id;
    modifiedGroupIds.add(groupId);
  }

  if (modifiedGroupIds.size === 0) return result;

  const addInfluence = (targetGroupId: string, source: InfluenceSource) => {
    if (targetGroupId === source.sourceGroupId) return;
    if (modifiedGroupIds.has(targetGroupId)) return;
    if (!result[targetGroupId]) {
      result[targetGroupId] = { targetGroupId, sources: [] };
    }
    const existing = result[targetGroupId].sources.find(
      s => s.sourceGroupId === source.sourceGroupId && s.pathway === source.pathway && s.chainName === source.chainName
    );
    if (existing) {
      existing.delta = Math.max(existing.delta, source.delta);
    } else {
      result[targetGroupId].sources.push(source);
    }
  };

  for (const srcGroup of modifiedGroupIds) {
    const srcLabel = GROUP_LABELS[srcGroup] || srcGroup;

    for (const pair of AGONIST_ANTAGONIST_PAIRS) {
      if (pair.agonist === srcGroup) {
        const riAmount = crossMuscleEffects?.reciprocalInhibitions?.[pair.antagonist] ?? 0;
        const delta = riAmount > 0 ? riAmount : Math.round(pair.reciprocalInhibitionStrength * 30);
        if (delta > 2) {
          addInfluence(pair.antagonist, {
            sourceGroupId: srcGroup,
            sourceLabel: srcLabel,
            pathway: 'reciprocal_inhibition',
            delta,
            mechanism: `Agonist activation inhibits antagonist via ${pair.jointParam.split('.')[1]}`,
          });
        }
      }
      if (pair.antagonist === srcGroup) {
        addInfluence(pair.agonist, {
          sourceGroupId: srcGroup,
          sourceLabel: srcLabel,
          pathway: 'reciprocal_inhibition',
          delta: Math.round(pair.reciprocalInhibitionStrength * 20),
          mechanism: `Antagonist tension affects agonist via ${pair.jointParam.split('.')[1]}`,
        });
      }
    }

    for (const chain of MYOFASCIAL_CHAINS) {
      const srcIdx = chain.links.findIndex(l => l.muscleId === srcGroup);
      if (srcIdx === -1) continue;

      for (let i = 0; i < chain.links.length; i++) {
        if (i === srcIdx) continue;
        const link = chain.links[i];
        const targetGroupId = link.muscleId;
        const distance = Math.abs(i - srcIdx);
        const decayFactor = 0.6;
        const baseDelta = 30 * link.propagationWeight * Math.pow(decayFactor, distance);
        const actualDelta = crossMuscleEffects?.chainPropagation?.[targetGroupId]?.totalChainTension;
        const delta = actualDelta !== undefined ? Math.abs(actualDelta) : baseDelta;

        if (delta > 1) {
          addInfluence(targetGroupId, {
            sourceGroupId: srcGroup,
            sourceLabel: srcLabel,
            pathway: 'fascial_chain',
            delta: Math.round(delta),
            chainName: chain.name,
            mechanism: distance === 1 ? 'Direct fascial connection' : `${distance} links away in chain`,
          });
        }
      }
    }

    for (const chain of KINETIC_CHAINS) {
      const srcGroupBase = srcGroup.replace(/_[lr]$/, '');
      const side = srcGroup.endsWith('_l') ? 'l' : srcGroup.endsWith('_r') ? 'r' : null;

      const srcLinkIdx = chain.links.findIndex(link =>
        link.muscles.some(m => {
          const gId = muscleNameToGroupId(m, side as 'l' | 'r' | undefined ?? undefined);
          return gId === srcGroup || gId === srcGroupBase;
        }) ||
        link.region.includes(srcGroupBase) ||
        srcGroupBase.includes(link.region.replace(/lateral_|medial_|deep_|anterior_|posterior_/, ''))
      );

      if (srcLinkIdx === -1) continue;

      for (let i = 0; i < chain.links.length; i++) {
        if (i === srcLinkIdx) continue;
        const link = chain.links[i];
        const distance = Math.abs(i - srcLinkIdx);
        if (distance > 3) continue;

        for (const muscleName of link.muscles) {
          const targetGroup = muscleNameToGroupId(muscleName, side as 'l' | 'r' | undefined ?? undefined);
          if (!targetGroup) continue;

          const delta = Math.round(20 / distance);
          addInfluence(targetGroup, {
            sourceGroupId: srcGroup,
            sourceLabel: srcLabel,
            pathway: 'kinetic_chain',
            delta,
            chainName: chain.label,
            mechanism: link.forceContribution,
          });
        }
      }
    }
  }

  return result;
}

export function getInfluencePathwayColor(pathway: InfluencePathway): string {
  switch (pathway) {
    case 'reciprocal_inhibition': return '#eab308';
    case 'fascial_chain': return '#06b6d4';
    case 'kinetic_chain': return '#f97316';
  }
}

export function getInfluencePathwayLabel(pathway: InfluencePathway): string {
  switch (pathway) {
    case 'reciprocal_inhibition': return 'Reciprocal Inhibition';
    case 'fascial_chain': return 'Fascial Chain';
    case 'kinetic_chain': return 'Kinetic Chain';
  }
}

export function getInfluencePathwayAbbrev(pathway: InfluencePathway): string {
  switch (pathway) {
    case 'reciprocal_inhibition': return 'RI';
    case 'fascial_chain': return 'FC';
    case 'kinetic_chain': return 'KC';
  }
}

export function getGroupInfluenceCount(
  influenceMap: InfluenceMap,
  groupId: string,
  allMuscleIds: string[],
  muscleToGroup: Record<string, string>
): number {
  let count = 0;
  for (const mId of allMuscleIds) {
    const gId = muscleToGroup[mId] || mId;
    if (gId === groupId && influenceMap[gId]) {
      count++;
      break;
    }
  }
  return influenceMap[groupId] ? 1 : count;
}

export function getDominantPathway(entry: InfluenceEntry): InfluencePathway {
  const pathways = entry.sources.map(s => s.pathway);
  if (pathways.includes('reciprocal_inhibition')) return 'reciprocal_inhibition';
  if (pathways.includes('fascial_chain')) return 'fascial_chain';
  return 'kinetic_chain';
}
