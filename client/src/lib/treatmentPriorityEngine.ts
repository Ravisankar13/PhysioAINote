import type { MuscleAnalysisResult, IndividualMuscle, ClinicalStatus } from './muscleBiomechanicsEngine';
import type { InfluenceMap, InfluencePathway } from './muscleInfluenceMap';

export type TreatmentAction = 'release' | 'stretch' | 'strengthen' | 'activate' | 'mobilize' | 'stabilize';

export interface TreatmentTechnique {
  name: string;
  type: 'manual' | 'exercise' | 'modality';
  dosage: string;
  rationale: string;
}

export interface PainCorrelation {
  painMarkerId: string;
  painLabel: string;
  mechanism: 'direct' | 'referred' | 'compensatory';
  explanation: string;
}

export interface TreatmentTarget {
  targetId: string;
  targetName: string;
  targetType: 'muscle' | 'joint' | 'chain';
  priority: number;
  clinicalStatus: ClinicalStatus;
  treatmentAction: TreatmentAction;
  actionLabel: string;
  isRootCause: boolean;
  isCompensation: boolean;
  rationale: string;
  techniques: TreatmentTechnique[];
  painCorrelations: PainCorrelation[];
  chainContext: { chainName: string; integrity: number }[];
  influenceCount: number;
  dysfunctionScore: number;
}

export interface TreatmentSummary {
  totalTargets: number;
  rootCauses: number;
  compensations: number;
  criticalChain: string | null;
  syndromes: string[];
  treatmentSequence: string[];
}

export interface TreatmentPriorityResult {
  targets: TreatmentTarget[];
  summary: TreatmentSummary;
}

interface PainMarkerSimple {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  severity?: number;
}

const STATUS_TO_ACTION: Record<ClinicalStatus, { action: TreatmentAction; label: string }> = {
  shortened: { action: 'stretch', label: 'Stretch & Lengthen' },
  overactive: { action: 'release', label: 'Release & Inhibit' },
  inhibited: { action: 'activate', label: 'Activate & Facilitate' },
  weak: { action: 'strengthen', label: 'Strengthen' },
  spasm: { action: 'release', label: 'Release & Relax' },
  lengthened: { action: 'stabilize', label: 'Stabilize & Shorten' },
  normal: { action: 'stabilize', label: 'Maintain' },
};

const TECHNIQUE_DB: Record<ClinicalStatus, TreatmentTechnique[]> = {
  shortened: [
    { name: 'Sustained static stretch', type: 'exercise', dosage: '3×30s holds', rationale: 'Restore resting length via viscoelastic creep' },
    { name: 'Myofascial release', type: 'manual', dosage: '3-5 min per area', rationale: 'Reduce fascial restrictions and adhesions' },
    { name: 'Eccentric loading', type: 'exercise', dosage: '3×12 reps slow tempo', rationale: 'Promote sarcomere addition and length gains' },
  ],
  overactive: [
    { name: 'Inhibitory pressure/trigger point', type: 'manual', dosage: '60-90s per point', rationale: 'Reduce motor neuron excitability' },
    { name: 'Reciprocal inhibition exercise', type: 'exercise', dosage: '3×15 reps of antagonist', rationale: 'Use neural inhibition to reduce overactivity' },
    { name: 'Foam roll/instrument-assisted', type: 'manual', dosage: '2 min per region', rationale: 'Mechanical reduction of tone' },
  ],
  inhibited: [
    { name: 'Isolated isometric activation', type: 'exercise', dosage: '3×10s holds × 10 reps', rationale: 'Re-establish motor recruitment pattern' },
    { name: 'Neuromuscular electrical stimulation', type: 'modality', dosage: '15 min with active contraction', rationale: 'Facilitate motor unit recruitment' },
    { name: 'Tactile cueing with activation', type: 'manual', dosage: 'During exercise sets', rationale: 'Enhanced proprioceptive feedback for recruitment' },
  ],
  weak: [
    { name: 'Progressive resistance training', type: 'exercise', dosage: '3×8-12 reps, progressive load', rationale: 'Hypertrophy and strength gains' },
    { name: 'Functional strengthening', type: 'exercise', dosage: '3×10 reps compound movements', rationale: 'Integrate strength into functional patterns' },
  ],
  spasm: [
    { name: 'Gentle sustained pressure', type: 'manual', dosage: '90-120s holds', rationale: 'Engage Golgi tendon organ reflex for relaxation' },
    { name: 'Positional release technique', type: 'manual', dosage: '90s in shortened position', rationale: 'Reset muscle spindle sensitivity' },
    { name: 'Heat application', type: 'modality', dosage: '15-20 min moist heat', rationale: 'Increase blood flow and reduce spasm' },
  ],
  lengthened: [
    { name: 'Concentric strengthening in inner range', type: 'exercise', dosage: '3×15 reps', rationale: 'Restore resting tone and reduce laxity' },
    { name: 'Taping for postural support', type: 'modality', dosage: 'Apply during activity', rationale: 'External support while retraining motor patterns' },
  ],
  normal: [],
};

const POSITION_TO_REGION: Record<string, string[]> = {
  neck: ['neck', 'scapula_l', 'scapula_r'],
  shoulder_l: ['deltoid_l', 'scapula_l', 'chest', 'bicep_l'],
  shoulder_r: ['deltoid_r', 'scapula_r', 'chest', 'bicep_r'],
  upper_back: ['spine', 'scapula_l', 'scapula_r'],
  lower_back: ['spine', 'core', 'glute_l', 'glute_r'],
  hip_l: ['glute_l', 'quad_l', 'core'],
  hip_r: ['glute_r', 'quad_r', 'core'],
  knee_l: ['quad_l', 'calf_l'],
  knee_r: ['quad_r', 'calf_r'],
  ankle_l: ['calf_l', 'shin_l'],
  ankle_r: ['calf_r', 'shin_r'],
  chest_area: ['chest', 'deltoid_l', 'deltoid_r'],
  core_area: ['core', 'spine'],
};

function positionToRegionGroups(pos: { x: number; y: number; z: number }): string[] {
  const groups: string[] = [];
  const side = pos.x < 0 ? '_l' : '_r';

  if (pos.y > 1.5) {
    groups.push('neck');
  } else if (pos.y > 1.2) {
    groups.push(`scapula${side}`, `deltoid${side}`, 'chest', 'spine');
  } else if (pos.y > 0.9) {
    groups.push('spine', 'core', `glute${side}`);
  } else if (pos.y > 0.5) {
    groups.push(`quad${side}`, `glute${side}`);
  } else if (pos.y > 0.2) {
    groups.push(`calf${side}`, `quad${side}`);
  } else {
    groups.push(`shin${side}`, `calf${side}`);
  }

  return groups;
}

export function computeTreatmentPriorities(
  muscleAnalysis: MuscleAnalysisResult,
  influenceMap: InfluenceMap,
  chainIntegrityScores: Record<string, number>,
  painMarkers: PainMarkerSimple[]
): TreatmentPriorityResult {
  const targets: TreatmentTarget[] = [];
  const abnormalMuscles = muscleAnalysis.allMuscles.filter(m => m.clinicalStatus !== 'normal');
  if (abnormalMuscles.length === 0) {
    return {
      targets: [],
      summary: {
        totalTargets: 0,
        rootCauses: 0,
        compensations: 0,
        criticalChain: null,
        syndromes: [],
        treatmentSequence: [],
      }
    };
  }

  const groupDysfunction = new Map<string, { muscles: IndividualMuscle[]; maxSeverity: number; dominantStatus: ClinicalStatus }>();

  for (const muscle of abnormalMuscles) {
    const groupId = muscle.meshGroup;
    const existing = groupDysfunction.get(groupId);
    const severity = computeDysfunctionSeverity(muscle);

    if (!existing) {
      groupDysfunction.set(groupId, { muscles: [muscle], maxSeverity: severity, dominantStatus: muscle.clinicalStatus });
    } else {
      existing.muscles.push(muscle);
      if (severity > existing.maxSeverity) {
        existing.maxSeverity = severity;
        existing.dominantStatus = muscle.clinicalStatus;
      }
    }
  }

  const painRegionGroups = new Map<string, PainMarkerSimple[]>();
  for (const pm of painMarkers) {
    const groups = positionToRegionGroups(pm.position);
    for (const g of groups) {
      if (!painRegionGroups.has(g)) painRegionGroups.set(g, []);
      painRegionGroups.get(g)!.push(pm);
    }
  }

  for (const [groupId, data] of groupDysfunction) {
    const influenceEntry = influenceMap[groupId];
    const influencedByCount = influenceEntry?.sources?.length || 0;

    let influencesOutCount = 0;
    for (const [, entry] of Object.entries(influenceMap)) {
      if (entry.sources.some(s => s.sourceGroupId === groupId)) {
        influencesOutCount++;
      }
    }

    const isRootCause = influencesOutCount >= 2 && influencedByCount === 0;
    const isCompensation = influencedByCount > 0 && influencesOutCount === 0;

    const painCorrelations: PainCorrelation[] = [];
    const directPains = painRegionGroups.get(groupId) || [];
    for (const pm of directPains) {
      painCorrelations.push({
        painMarkerId: pm.id,
        painLabel: pm.label || 'Pain marker',
        mechanism: 'direct',
        explanation: `${getGroupLabel(groupId)} dysfunction directly at pain site`,
      });
    }

    if (influencesOutCount > 0) {
      for (const [targetGroup, entry] of Object.entries(influenceMap)) {
        const affectedPains = painRegionGroups.get(targetGroup) || [];
        if (affectedPains.length > 0 && entry.sources.some(s => s.sourceGroupId === groupId)) {
          const source = entry.sources.find(s => s.sourceGroupId === groupId)!;
          for (const pm of affectedPains) {
            painCorrelations.push({
              painMarkerId: pm.id,
              painLabel: pm.label || 'Pain marker',
              mechanism: source.pathway === 'fascial_chain' ? 'referred' : 'compensatory',
              explanation: `${getGroupLabel(groupId)} ${source.pathway === 'fascial_chain' ? 'tension propagating via ' + (source.chainName || 'fascial chain') : 'causing compensatory load'} → ${getGroupLabel(targetGroup)} pain`,
            });
          }
        }
      }
    }

    const chainContext: { chainName: string; integrity: number }[] = [];
    for (const [chainName, score] of Object.entries(chainIntegrityScores)) {
      if (isGroupInChain(groupId, chainName)) {
        chainContext.push({ chainName: formatChainName(chainName), integrity: score });
      }
    }

    const painWeight = painCorrelations.length > 0 ? 2 : 0;
    const rootCauseWeight = isRootCause ? 3 : 0;
    const influenceWeight = Math.min(influencesOutCount * 0.5, 2);
    const severityWeight = data.maxSeverity / 25;
    const chainWeight = chainContext.some(c => c.integrity < 60) ? 1 : 0;
    const priority = Math.min(10, Math.round(painWeight + rootCauseWeight + influenceWeight + severityWeight + chainWeight));

    const { action, label } = STATUS_TO_ACTION[data.dominantStatus];
    const techniques = TECHNIQUE_DB[data.dominantStatus] || [];

    const rationale = buildRationale(data, influencesOutCount, influencedByCount, painCorrelations.length, isRootCause, isCompensation);

    targets.push({
      targetId: groupId,
      targetName: getGroupLabel(groupId),
      targetType: 'muscle',
      priority,
      clinicalStatus: data.dominantStatus,
      treatmentAction: action,
      actionLabel: label,
      isRootCause,
      isCompensation,
      rationale,
      techniques,
      painCorrelations,
      chainContext,
      influenceCount: influencesOutCount,
      dysfunctionScore: data.maxSeverity,
    });
  }

  targets.sort((a, b) => {
    if (a.isRootCause && !b.isRootCause) return -1;
    if (!a.isRootCause && b.isRootCause) return 1;
    return b.priority - a.priority;
  });

  let criticalChain: string | null = null;
  let lowestIntegrity = 100;
  for (const [name, score] of Object.entries(chainIntegrityScores)) {
    if (score < lowestIntegrity) {
      lowestIntegrity = score;
      criticalChain = formatChainName(name);
    }
  }

  const syndromes = muscleAnalysis.syndromes.filter(s => s.detected).map(s => s.label);

  const treatmentSequence: string[] = [];
  const rootTargets = targets.filter(t => t.isRootCause);
  const compTargets = targets.filter(t => t.isCompensation);
  const otherTargets = targets.filter(t => !t.isRootCause && !t.isCompensation);

  if (rootTargets.length > 0) {
    treatmentSequence.push(`1. Address root causes: ${rootTargets.map(t => t.targetName).join(', ')}`);
  }
  if (otherTargets.length > 0) {
    treatmentSequence.push(`${rootTargets.length > 0 ? '2' : '1'}. Treat primary dysfunctions: ${otherTargets.map(t => t.targetName).join(', ')}`);
  }
  if (compTargets.length > 0) {
    treatmentSequence.push(`${rootTargets.length > 0 ? '3' : '2'}. Monitor compensations: ${compTargets.map(t => t.targetName).join(', ')}`);
  }

  return {
    targets,
    summary: {
      totalTargets: targets.length,
      rootCauses: rootTargets.length,
      compensations: compTargets.length,
      criticalChain: lowestIntegrity < 70 ? criticalChain : null,
      syndromes,
      treatmentSequence,
    }
  };
}

function computeDysfunctionSeverity(muscle: IndividualMuscle): number {
  let score = 0;
  if (muscle.clinicalStatus === 'shortened') score += 20 + (100 - muscle.lengthPercent) * 0.3;
  else if (muscle.clinicalStatus === 'lengthened') score += 15 + (muscle.lengthPercent - 100) * 0.2;
  else if (muscle.clinicalStatus === 'overactive') score += 25 + muscle.activationPercent * 0.3;
  else if (muscle.clinicalStatus === 'inhibited') score += 25 + muscle.inhibitionPercent * 0.4;
  else if (muscle.clinicalStatus === 'spasm') score += 35 + muscle.tightnessPercent * 0.3;
  else if (muscle.clinicalStatus === 'weak') score += 20 + (100 - muscle.activationPercent) * 0.2;
  return Math.min(100, score);
}

function getGroupLabel(groupId: string): string {
  const labels: Record<string, string> = {
    neck: 'Neck', chest: 'Chest', spine: 'Spine', core: 'Core',
    scapula_l: 'L Scapula', scapula_r: 'R Scapula',
    deltoid_l: 'L Shoulder', deltoid_r: 'R Shoulder',
    bicep_l: 'L Arm', bicep_r: 'R Arm',
    glute_l: 'L Glute', glute_r: 'R Glute',
    quad_l: 'L Thigh', quad_r: 'R Thigh',
    calf_l: 'L Calf', calf_r: 'R Calf',
    shin_l: 'L Shin', shin_r: 'R Shin',
  };
  return labels[groupId] || groupId;
}

function formatChainName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function isGroupInChain(groupId: string, chainName: string): boolean {
  const chainMuscleMap: Record<string, string[]> = {
    posterior_chain: ['glute_l', 'glute_r', 'spine', 'calf_l', 'calf_r', 'neck'],
    anterior_chain: ['quad_l', 'quad_r', 'core', 'chest', 'shin_l', 'shin_r', 'neck'],
    lateral_chain: ['deltoid_l', 'deltoid_r', 'glute_l', 'glute_r', 'calf_l', 'calf_r'],
    deep_longitudinal: ['spine', 'core', 'glute_l', 'glute_r', 'calf_l', 'calf_r'],
    spiral_chain: ['scapula_l', 'scapula_r', 'core', 'glute_l', 'glute_r', 'shin_l', 'shin_r'],
    arm_lines: ['deltoid_l', 'deltoid_r', 'scapula_l', 'scapula_r', 'bicep_l', 'bicep_r', 'chest'],
  };
  const groups = chainMuscleMap[chainName];
  return groups ? groups.includes(groupId) : false;
}

function buildRationale(
  data: { muscles: IndividualMuscle[]; maxSeverity: number; dominantStatus: ClinicalStatus },
  influencesOut: number,
  influencedBy: number,
  painCount: number,
  isRootCause: boolean,
  isCompensation: boolean
): string {
  const parts: string[] = [];
  const statusLabel = data.dominantStatus.charAt(0).toUpperCase() + data.dominantStatus.slice(1);

  if (isRootCause) {
    parts.push(`Root cause — ${statusLabel} with ${influencesOut} downstream effects`);
  } else if (isCompensation) {
    parts.push(`Compensation — ${statusLabel} due to ${influencedBy} upstream influence${influencedBy > 1 ? 's' : ''}`);
  } else {
    parts.push(`${statusLabel} dysfunction`);
    if (influencesOut > 0) parts.push(`affects ${influencesOut} other region${influencesOut > 1 ? 's' : ''}`);
  }

  if (painCount > 0) {
    parts.push(`linked to ${painCount} pain marker${painCount > 1 ? 's' : ''}`);
  }

  return parts.join('. ') + '.';
}
