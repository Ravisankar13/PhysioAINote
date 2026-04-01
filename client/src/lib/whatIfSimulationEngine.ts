import { calculatePosturalForces, type ForceAnalysisResult, type JointSurfaceForce } from './posturalForceEngine';
import { computeFullMuscleAnalysis, applyOverridesToAnalysis, type MuscleOverride, type MuscleAnalysisResult } from './muscleBiomechanicsEngine';
import { computePathologyCompensation, type PathologyCompensationResult } from './pathologyCompensationEngine';
import { computeCrossSystemCorrelation, type CrossSystemCorrelationResult, type CorrelationInput } from './crossSystemCorrelation';
import { calculateFullBiomechanics } from './biomechanicsEngine';
import { calculateInjuryRisks, type InjuryRiskResult } from './injuryRiskEngine';
import { KINETIC_CHAINS } from './kineticChainExplorer';

export type InterventionType = 'strengthen' | 'stretch' | 'mobilize' | 'offload';

export interface WhatIfScenario {
  id: string;
  label: string;
  description: string;
  interventionType: InterventionType;
  target: string;
  targetType: 'muscle' | 'joint';
  magnitude: number;
  unit: string;
  color: string;
}

export interface ForceDelta {
  jointId: string;
  jointLabel: string;
  before: number;
  after: number;
  delta: number;
  deltaPercent: number;
  statusBefore: string;
  statusAfter: string;
}

export interface RiskDelta {
  region: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  levelBefore: string;
  levelAfter: string;
}

export interface CompensationDelta {
  pattern: string;
  resolvedPercent: number;
  before: number;
  after: number;
}

export interface WhatIfComparisonResult {
  scenarios: WhatIfScenario[];
  overallRiskBefore: number;
  overallRiskAfter: number;
  overallRiskDelta: number;
  riskLevelBefore: string;
  riskLevelAfter: string;
  forceDeltas: ForceDelta[];
  riskDeltas: RiskDelta[];
  compensationDeltas: CompensationDelta[];
  topImprovements: string[];
  simulatedModelConfig: Record<string, Record<string, number>>;
  simulatedOverrides: Record<string, Partial<MuscleOverride>>;
}

const MUSCLE_JOINT_MAP: Record<string, string[]> = {
  glute_l: ['leftHip'],
  glute_r: ['rightHip'],
  quad_l: ['leftKnee', 'leftHip'],
  quad_r: ['rightKnee', 'rightHip'],
  calf_l: ['leftAnkle', 'leftKnee'],
  calf_r: ['rightAnkle', 'rightKnee'],
  core: ['spine', 'pelvis'],
  spine: ['spine', 'pelvis'],
  deltoid_l: ['leftShoulder'],
  deltoid_r: ['rightShoulder'],
  scapula_l: ['leftShoulder', 'leftScapula'],
  scapula_r: ['rightShoulder', 'rightScapula'],
  neck: ['neck', 'spine'],
  chest: ['leftShoulder', 'rightShoulder'],
  bicep_l: ['leftElbow'],
  bicep_r: ['rightElbow'],
  shin_l: ['leftAnkle'],
  shin_r: ['rightAnkle'],
};

const STRENGTHEN_EFFECTS: Record<string, (mag: number) => Record<string, Record<string, number>>> = {
  glute_l: (m) => ({ pelvis: { obliquity: -(m * 0.15), tilt: -(m * 0.1) }, leftHip: { extension: m * 0.2, abduction: m * 0.15 } }),
  glute_r: (m) => ({ pelvis: { obliquity: m * 0.15, tilt: -(m * 0.1) }, rightHip: { extension: m * 0.2, abduction: m * 0.15 } }),
  core: (m) => ({ pelvis: { tilt: -(m * 0.2) }, spine: { lumbarLordosis: -(m * 0.15), thoracicKyphosis: -(m * 0.08) } }),
  quad_l: (m) => ({ leftKnee: { flexion: -(m * 0.1), recurvatum: -(m * 0.08) } }),
  quad_r: (m) => ({ rightKnee: { flexion: -(m * 0.1), recurvatum: -(m * 0.08) } }),
  scapula_l: (m) => ({ leftShoulder: { elevation: -(m * 0.12), protraction: -(m * 0.1) }, spine: { thoracicKyphosis: -(m * 0.06) } }),
  scapula_r: (m) => ({ rightShoulder: { elevation: -(m * 0.12), protraction: -(m * 0.1) }, spine: { thoracicKyphosis: -(m * 0.06) } }),
  spine: (m) => ({ spine: { thoracicKyphosis: -(m * 0.1), lumbarLordosis: m * 0.08 } }),
  calf_l: (m) => ({ leftAnkle: { dorsiflexion: m * 0.05 } }),
  calf_r: (m) => ({ rightAnkle: { dorsiflexion: m * 0.05 } }),
  neck: (m) => ({ spine: { forwardHead: -(m * 0.15) }, neck: { forwardHead: -(m * 0.15) } }),
};

const STRETCH_EFFECTS: Record<string, (m: number) => Record<string, Record<string, number>>> = {
  quad_l: (m) => ({ pelvis: { tilt: -(m * 0.15) }, spine: { lumbarLordosis: -(m * 0.1) }, leftHip: { extension: m * 0.2 } }),
  quad_r: (m) => ({ pelvis: { tilt: -(m * 0.15) }, spine: { lumbarLordosis: -(m * 0.1) }, rightHip: { extension: m * 0.2 } }),
  calf_l: (m) => ({ leftAnkle: { dorsiflexion: m * 0.3, plantarflexion: -(m * 0.1) } }),
  calf_r: (m) => ({ rightAnkle: { dorsiflexion: m * 0.3, plantarflexion: -(m * 0.1) } }),
  chest: (m) => ({ spine: { thoracicKyphosis: -(m * 0.12) }, leftShoulder: { protraction: -(m * 0.1) }, rightShoulder: { protraction: -(m * 0.1) } }),
  neck: (m) => ({ spine: { forwardHead: -(m * 0.2) }, neck: { forwardHead: -(m * 0.2) } }),
  spine: (m) => ({ spine: { lumbarLordosis: -(m * 0.15) }, pelvis: { tilt: -(m * 0.1) } }),
  glute_l: (m) => ({ leftHip: { flexion: m * 0.15, internalRotation: m * 0.1 } }),
  glute_r: (m) => ({ rightHip: { flexion: m * 0.15, internalRotation: m * 0.1 } }),
};

const MOBILIZE_EFFECTS: Record<string, (m: number) => Record<string, Record<string, number>>> = {
  leftAnkle: (m) => ({ leftAnkle: { dorsiflexion: m * 0.4 } }),
  rightAnkle: (m) => ({ rightAnkle: { dorsiflexion: m * 0.4 } }),
  leftHip: (m) => ({ leftHip: { flexion: m * 0.15, extension: m * 0.1, internalRotation: m * 0.1, abduction: m * 0.1 } }),
  rightHip: (m) => ({ rightHip: { flexion: m * 0.15, extension: m * 0.1, internalRotation: m * 0.1, abduction: m * 0.1 } }),
  spine: (m) => ({ spine: { thoracicKyphosis: -(m * 0.08), lumbarLordosis: -(m * 0.06) } }),
  leftShoulder: (m) => ({ leftShoulder: { flexion: m * 0.1, abduction: m * 0.1, externalRotation: m * 0.1 } }),
  rightShoulder: (m) => ({ rightShoulder: { flexion: m * 0.1, abduction: m * 0.1, externalRotation: m * 0.1 } }),
  leftKnee: (m) => ({ leftKnee: { flexion: m * 0.1 } }),
  rightKnee: (m) => ({ rightKnee: { flexion: m * 0.1 } }),
  neck: (m) => ({ neck: { forwardHead: -(m * 0.2), lateralFlexion: m * 0.1 } }),
};

export const PRESET_SCENARIOS: WhatIfScenario[] = [
  { id: 'glute_strengthen_20', label: 'Glute +20%', description: 'Improve bilateral gluteal strength by 20%', interventionType: 'strengthen', target: 'glute', targetType: 'muscle', magnitude: 20, unit: '%', color: '#22c55e' },
  { id: 'core_strengthen_30', label: 'Core +30%', description: 'Improve core stabilizer activation by 30%', interventionType: 'strengthen', target: 'core', targetType: 'muscle', magnitude: 30, unit: '%', color: '#3b82f6' },
  { id: 'ankle_df_10', label: 'Ankle DF +10°', description: 'Improve ankle dorsiflexion by 10 degrees bilaterally', interventionType: 'mobilize', target: 'ankle', targetType: 'joint', magnitude: 10, unit: '°', color: '#a855f7' },
  { id: 'hip_flexor_stretch', label: 'Hip Flexor Stretch', description: 'Stretch bilateral hip flexors/quads to reduce anterior pelvic tilt', interventionType: 'stretch', target: 'quad', targetType: 'muscle', magnitude: 15, unit: '°', color: '#f59e0b' },
  { id: 'thoracic_mob', label: 'T-Spine Mob', description: 'Improve thoracic spine mobility', interventionType: 'mobilize', target: 'spine', targetType: 'joint', magnitude: 10, unit: '°', color: '#06b6d4' },
  { id: 'scap_strengthen', label: 'Scapular +25%', description: 'Strengthen scapular stabilizers bilaterally', interventionType: 'strengthen', target: 'scapula', targetType: 'muscle', magnitude: 25, unit: '%', color: '#ec4899' },
  { id: 'pec_stretch', label: 'Pec Stretch', description: 'Stretch pectoral muscles to improve posture', interventionType: 'stretch', target: 'chest', targetType: 'muscle', magnitude: 12, unit: '°', color: '#f97316' },
  { id: 'neck_strengthen', label: 'Deep Neck +20%', description: 'Strengthen deep neck flexors', interventionType: 'strengthen', target: 'neck', targetType: 'muscle', magnitude: 20, unit: '%', color: '#8b5cf6' },
];

export const MUSCLE_TARGETS = [
  { id: 'glute_l', label: 'L Gluteals' },
  { id: 'glute_r', label: 'R Gluteals' },
  { id: 'core', label: 'Core' },
  { id: 'quad_l', label: 'L Quadriceps' },
  { id: 'quad_r', label: 'R Quadriceps' },
  { id: 'calf_l', label: 'L Calf' },
  { id: 'calf_r', label: 'R Calf' },
  { id: 'scapula_l', label: 'L Scapular' },
  { id: 'scapula_r', label: 'R Scapular' },
  { id: 'spine', label: 'Erector Spinae' },
  { id: 'deltoid_l', label: 'L Deltoid' },
  { id: 'deltoid_r', label: 'R Deltoid' },
  { id: 'neck', label: 'Neck' },
  { id: 'chest', label: 'Chest/Pecs' },
];

export const JOINT_TARGETS = [
  { id: 'leftAnkle', label: 'L Ankle' },
  { id: 'rightAnkle', label: 'R Ankle' },
  { id: 'leftKnee', label: 'L Knee' },
  { id: 'rightKnee', label: 'R Knee' },
  { id: 'leftHip', label: 'L Hip' },
  { id: 'rightHip', label: 'R Hip' },
  { id: 'spine', label: 'Spine' },
  { id: 'leftShoulder', label: 'L Shoulder' },
  { id: 'rightShoulder', label: 'R Shoulder' },
  { id: 'neck', label: 'Neck' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function expandBilateralTarget(target: string): string[] {
  if (target === 'glute') return ['glute_l', 'glute_r'];
  if (target === 'quad') return ['quad_l', 'quad_r'];
  if (target === 'calf') return ['calf_l', 'calf_r'];
  if (target === 'scapula') return ['scapula_l', 'scapula_r'];
  if (target === 'ankle') return ['leftAnkle', 'rightAnkle'];
  if (target === 'hip') return ['leftHip', 'rightHip'];
  if (target === 'knee') return ['leftKnee', 'rightKnee'];
  if (target === 'shoulder') return ['leftShoulder', 'rightShoulder'];
  return [target];
}

export function applyScenarios(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  scenarios: WhatIfScenario[]
): { modelConfig: Record<string, any>; overrides: Record<string, Partial<MuscleOverride>> } {
  const config: Record<string, any> = JSON.parse(JSON.stringify(baseModelConfig));
  const overrides: Record<string, Partial<MuscleOverride>> = JSON.parse(JSON.stringify(baseOverrides));

  for (const scenario of scenarios) {
    const targets = expandBilateralTarget(scenario.target);

    for (const target of targets) {
      if (scenario.interventionType === 'strengthen') {
        const effectFn = STRENGTHEN_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(scenario.magnitude);
          for (const [joint, params] of Object.entries(effects)) {
            if (!config[joint]) config[joint] = {};
            for (const [param, value] of Object.entries(params)) {
              config[joint][param] = (config[joint][param] || 0) + value;
            }
          }
        }
        const existing = overrides[target] || {};
        overrides[target] = {
          ...existing,
          tension: clamp((existing.tension ?? 50) - scenario.magnitude * 0.3, 0, 100),
          activation: clamp((existing.activation ?? 50) + scenario.magnitude * 0.4, 0, 100),
        };
      }

      if (scenario.interventionType === 'stretch') {
        const effectFn = STRETCH_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(scenario.magnitude);
          for (const [joint, params] of Object.entries(effects)) {
            if (!config[joint]) config[joint] = {};
            for (const [param, value] of Object.entries(params)) {
              config[joint][param] = (config[joint][param] || 0) + value;
            }
          }
        }
        const existing = overrides[target] || {};
        overrides[target] = {
          ...existing,
          tension: clamp((existing.tension ?? 50) - scenario.magnitude * 0.5, 0, 100),
          activation: clamp((existing.activation ?? 50) - scenario.magnitude * 0.1, 0, 100),
        };
      }

      if (scenario.interventionType === 'mobilize') {
        const effectFn = MOBILIZE_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(scenario.magnitude);
          for (const [joint, params] of Object.entries(effects)) {
            if (!config[joint]) config[joint] = {};
            for (const [param, value] of Object.entries(params)) {
              config[joint][param] = (config[joint][param] || 0) + value;
            }
          }
        }
      }

      if (scenario.interventionType === 'offload') {
        const existing = overrides[target] || {};
        overrides[target] = {
          ...existing,
          tension: clamp((existing.tension ?? 50) - scenario.magnitude * 0.4, 0, 100),
          activation: clamp((existing.activation ?? 50) - scenario.magnitude * 0.2, 0, 100),
        };
      }
    }
  }

  return { modelConfig: config, overrides };
}

export function computeWhatIfComparison(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  scenarios: WhatIfScenario[]
): WhatIfComparisonResult {
  const { modelConfig: simConfig, overrides: simOverrides } = applyScenarios(baseModelConfig, baseOverrides, scenarios);

  const beforeForces = calculatePosturalForces(baseModelConfig);
  const afterForces = calculatePosturalForces(simConfig);

  const forceDeltas: ForceDelta[] = [];
  for (const bj of beforeForces.joints) {
    const aj = afterForces.joints.find(j => j.id === bj.id);
    if (aj) {
      forceDeltas.push({
        jointId: bj.id,
        jointLabel: bj.label,
        before: bj.totalForce,
        after: aj.totalForce,
        delta: aj.totalForce - bj.totalForce,
        deltaPercent: bj.totalForce > 0 ? ((aj.totalForce - bj.totalForce) / bj.totalForce) * 100 : 0,
        statusBefore: bj.status,
        statusAfter: aj.status,
      });
    }
  }

  const safeModel = (mc: Record<string, any>) => ({
    pelvis: { tilt: mc.pelvis?.tilt ?? 0, obliquity: mc.pelvis?.obliquity ?? 0, rotation: mc.pelvis?.rotation ?? 0, drop: mc.pelvis?.drop ?? 0 },
    spine: { thoracicKyphosis: mc.spine?.thoracicKyphosis ?? 0, lumbarLordosis: mc.spine?.lumbarLordosis ?? 0, scoliosis: mc.spine?.scoliosis ?? 0 },
    leftHip: { flexion: mc.leftHip?.flexion ?? 0, abduction: mc.leftHip?.abduction ?? 0, internalRotation: mc.leftHip?.internalRotation ?? 0 },
    rightHip: { flexion: mc.rightHip?.flexion ?? 0, abduction: mc.rightHip?.abduction ?? 0, internalRotation: mc.rightHip?.internalRotation ?? 0 },
    leftKnee: { flexion: mc.leftKnee?.flexion ?? 0, varus: mc.leftKnee?.varus ?? 0 },
    rightKnee: { flexion: mc.rightKnee?.flexion ?? 0, varus: mc.rightKnee?.varus ?? 0 },
    leftAnkle: { dorsiflexion: mc.leftAnkle?.dorsiflexion ?? 0, inversion: mc.leftAnkle?.inversion ?? 0 },
    rightAnkle: { dorsiflexion: mc.rightAnkle?.dorsiflexion ?? 0, inversion: mc.rightAnkle?.inversion ?? 0 },
    leftShoulder: { flexion: mc.leftShoulder?.flexion ?? 0, abduction: mc.leftShoulder?.abduction ?? 0, internalRotation: mc.leftShoulder?.internalRotation ?? 0 },
    rightShoulder: { flexion: mc.rightShoulder?.flexion ?? 0, abduction: mc.rightShoulder?.abduction ?? 0, internalRotation: mc.rightShoulder?.internalRotation ?? 0 },
    leftElbow: { flexion: mc.leftElbow?.flexion ?? 0, pronation: mc.leftElbow?.pronation ?? 0 },
    rightElbow: { flexion: mc.rightElbow?.flexion ?? 0, pronation: mc.rightElbow?.pronation ?? 0 },
  });

  let beforeRisk: InjuryRiskResult | null = null;
  let afterRisk: InjuryRiskResult | null = null;

  try {
    const beforeBio = calculateFullBiomechanics(170, bodyWeightKg, safeModel(baseModelConfig));
    beforeRisk = calculateInjuryRisks(beforeBio);
    const afterBio = calculateFullBiomechanics(170, bodyWeightKg, safeModel(simConfig));
    afterRisk = calculateInjuryRisks(afterBio);
  } catch (_e) {
    // risk computation optional
  }

  const riskDeltas: RiskDelta[] = [];
  const overallBefore = beforeRisk?.overallRiskScore ?? 0;
  const overallAfter = afterRisk?.overallRiskScore ?? 0;

  if (beforeRisk && afterRisk) {
    const regions = Object.keys(beforeRisk.jointRisks) as Array<keyof typeof beforeRisk.jointRisks>;
    for (const region of regions) {
      const br = beforeRisk.jointRisks[region];
      const ar = afterRisk.jointRisks[region];
      if (br && ar) {
        for (const risk of br.risks) {
          const afterMatch = ar.risks.find((r: any) => r.id === risk.id);
          if (afterMatch) {
            riskDeltas.push({
              region,
              label: risk.label,
              before: risk.score,
              after: afterMatch.score,
              delta: afterMatch.score - risk.score,
              levelBefore: risk.level,
              levelAfter: afterMatch.level,
            });
          }
        }
      }
    }
  }

  const beforePathology = computePathologyCompensation(baseOverrides as Record<string, MuscleOverride>);
  const afterPathology = computePathologyCompensation(simOverrides as Record<string, MuscleOverride>);

  const compensationDeltas: CompensationDelta[] = [];
  for (const bf of beforePathology.clinicalFindings) {
    const af = afterPathology.clinicalFindings.find(f => f.title === bf.title);
    const sevScore = (s: string) => s === 'severe' ? 3 : s === 'moderate' ? 2 : 1;
    const bScore = sevScore(bf.severity);
    const aScore = af ? sevScore(af.severity) : 0;
    compensationDeltas.push({
      pattern: bf.title,
      resolvedPercent: af ? clamp(((bScore - aScore) / bScore) * 100, 0, 100) : 100,
      before: bScore,
      after: aScore,
    });
  }

  const topImprovements: string[] = [];
  const sortedForces = [...forceDeltas].sort((a, b) => a.delta - b.delta);
  for (const fd of sortedForces.slice(0, 3)) {
    if (fd.delta < 0) {
      topImprovements.push(`${fd.jointLabel}: ${Math.abs(fd.deltaPercent).toFixed(0)}% force reduction`);
    }
  }
  const sortedRisks = [...riskDeltas].sort((a, b) => a.delta - b.delta);
  for (const rd of sortedRisks.slice(0, 3)) {
    if (rd.delta < 0) {
      topImprovements.push(`${rd.label}: risk ↓${Math.abs(rd.delta).toFixed(0)} pts`);
    }
  }
  if (overallAfter < overallBefore) {
    topImprovements.unshift(`Overall risk: ${overallBefore.toFixed(0)} → ${overallAfter.toFixed(0)} (↓${(overallBefore - overallAfter).toFixed(0)})`);
  }

  return {
    scenarios,
    overallRiskBefore: overallBefore,
    overallRiskAfter: overallAfter,
    overallRiskDelta: overallAfter - overallBefore,
    riskLevelBefore: beforeRisk?.overallRiskLevel ?? 'minimal',
    riskLevelAfter: afterRisk?.overallRiskLevel ?? 'minimal',
    forceDeltas: forceDeltas.sort((a, b) => a.delta - b.delta),
    riskDeltas: riskDeltas.sort((a, b) => a.delta - b.delta),
    compensationDeltas,
    topImprovements,
    simulatedModelConfig: simConfig,
    simulatedOverrides: simOverrides,
  };
}
