import { calculatePosturalForces, type ForceAnalysisResult } from './posturalForceEngine';
import { computeFullMuscleAnalysis, applyOverridesToAnalysis, type MuscleOverride, type MuscleAnalysisResult } from './muscleBiomechanicsEngine';
import { computePathologyCompensation } from './pathologyCompensationEngine';
import { computeCrossSystemCorrelation, type CrossSystemCorrelationResult } from './crossSystemCorrelation';
import { calculateFullBiomechanics } from './biomechanicsEngine';
import { calculateInjuryRisks, type InjuryRiskResult, type RiskScore, type BilateralRisk } from './injuryRiskEngine';
import { analyzeInjuryMechanism, type InjuryMechanismResult } from './injuryMechanismEngine';
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

export interface MuscleDelta {
  muscleId: string;
  label: string;
  activationBefore: number;
  activationAfter: number;
  tightnessBefore: number;
  tightnessAfter: number;
  statusBefore: string;
  statusAfter: string;
}

export interface PainPredictionDelta {
  region: string;
  beforeLikelihood: number;
  afterLikelihood: number;
  delta: number;
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
  muscleDeltas: MuscleDelta[];
  painPredictions: PainPredictionDelta[];
  correlationBefore: CrossSystemCorrelationResult | null;
  correlationAfter: CrossSystemCorrelationResult | null;
  mechanismBefore: InjuryMechanismResult | null;
  mechanismAfter: InjuryMechanismResult | null;
  causalChainsResolved: number;
  causalChainsTotal: number;
  topImprovements: string[];
  simulatedModelConfig: Record<string, Record<string, number>>;
  simulatedOverrides: Record<string, Partial<MuscleOverride>>;
  forceMultiplier: number;
}

const SCENARIO_TO_MUSCLE_IDS: Record<string, string[]> = {
  glute_l: ['l_glut_max', 'l_glut_med', 'l_glut_min'],
  glute_r: ['r_glut_max', 'r_glut_med', 'r_glut_min'],
  core: ['rectus_abdominis', 'obliques', 'transverse_abdominis'],
  quad_l: ['l_rect_fem', 'l_vast_lat', 'l_vast_med', 'l_vast_int'],
  quad_r: ['r_rect_fem', 'r_vast_lat', 'r_vast_med', 'r_vast_int'],
  calf_l: ['l_gastroc', 'l_soleus'],
  calf_r: ['r_gastroc', 'r_soleus'],
  scapula_l: ['l_lower_trap', 'l_rhomboids', 'l_serratus_ant'],
  scapula_r: ['r_lower_trap', 'r_rhomboids', 'r_serratus_ant'],
  spine: ['erector_spinae_thoracic', 'erector_spinae_lumbar', 'multifidus'],
  deltoid_l: ['l_deltoid'],
  deltoid_r: ['r_deltoid'],
  neck: ['deep_neck_flexors', 'l_upper_trap', 'r_upper_trap'],
  chest: ['l_pec_major', 'r_pec_major', 'l_pec_minor', 'r_pec_minor'],
  shin_l: ['l_tib_ant'],
  shin_r: ['r_tib_ant'],
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
  { id: 'cadence_increase', label: 'Cadence ↑10%', description: 'Increase step cadence by 10% (reduces ground contact time and joint loading)', interventionType: 'offload', target: 'cadence', targetType: 'joint', magnitude: 10, unit: '%', color: '#8b5cf6' },
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

function applyOverrideToMuscleIds(
  overrides: Record<string, Partial<MuscleOverride>>,
  scenarioTarget: string,
  overrideValues: Partial<MuscleOverride>
): void {
  const muscleIds = SCENARIO_TO_MUSCLE_IDS[scenarioTarget];
  if (muscleIds) {
    for (const mId of muscleIds) {
      const existing = overrides[mId] || {};
      overrides[mId] = {
        tensionOffset: (existing.tensionOffset ?? 0) + (overrideValues.tensionOffset ?? 0),
        activationOffset: (existing.activationOffset ?? 0) + (overrideValues.activationOffset ?? 0),
        inhibition: overrideValues.inhibition !== undefined
          ? clamp((existing.inhibition ?? 0) + (overrideValues.inhibition ?? 0), 0, 100)
          : (existing.inhibition ?? 0),
        lengthOverride: existing.lengthOverride ?? 'none',
        pathology: existing.pathology ?? 'none',
        isManual: true,
      };
    }
  }
}

export function applyScenarios(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  scenarios: WhatIfScenario[]
): { modelConfig: Record<string, any>; overrides: Record<string, Partial<MuscleOverride>>; forceMultiplier: number } {
  const config: Record<string, any> = JSON.parse(JSON.stringify(baseModelConfig));
  const overrides: Record<string, Partial<MuscleOverride>> = JSON.parse(JSON.stringify(baseOverrides));
  let forceMultiplier = 1.0;

  for (const scenario of scenarios) {
    if (scenario.target === 'cadence' && scenario.interventionType === 'offload') {
      forceMultiplier *= (1 - scenario.magnitude * 0.008);
      continue;
    }

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
        applyOverrideToMuscleIds(overrides, target, {
          tensionOffset: -(scenario.magnitude * 0.3),
          activationOffset: scenario.magnitude * 0.4,
          inhibition: -(scenario.magnitude * 0.5),
        });
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
        applyOverrideToMuscleIds(overrides, target, {
          tensionOffset: -(scenario.magnitude * 0.5),
          activationOffset: -(scenario.magnitude * 0.1),
        });
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
        applyOverrideToMuscleIds(overrides, target, {
          tensionOffset: -(scenario.magnitude * 0.4),
          activationOffset: -(scenario.magnitude * 0.2),
        });
      }
    }
  }

  return { modelConfig: config, overrides, forceMultiplier };
}

interface FlattenedRisk {
  key: string;
  label: string;
  region: string;
  score: number;
  level: string;
}

function isRiskScore(obj: unknown): obj is RiskScore {
  return typeof obj === 'object' && obj !== null && 'risk' in obj && 'level' in obj && !('left' in obj);
}

function isBilateralRisk(obj: unknown): obj is BilateralRisk {
  return typeof obj === 'object' && obj !== null && 'left' in obj && 'right' in obj;
}

function flattenRisks(jointRisks: InjuryRiskResult['jointRisks']): FlattenedRisk[] {
  const results: FlattenedRisk[] = [];
  const regionLabels: Record<string, string> = {
    lumbarSpine: 'Lumbar Spine',
    hip: 'Hip',
    knee: 'Knee',
    ankle: 'Ankle',
    shoulder: 'Shoulder',
  };

  for (const [regionKey, regionRisks] of Object.entries(jointRisks)) {
    const regionLabel = regionLabels[regionKey] || regionKey;
    for (const [riskKey, riskValue] of Object.entries(regionRisks as Record<string, unknown>)) {
      const readableLabel = riskKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      if (isRiskScore(riskValue)) {
        results.push({
          key: `${regionKey}.${riskKey}`,
          label: `${regionLabel}: ${readableLabel}`,
          region: regionKey,
          score: riskValue.risk,
          level: riskValue.level,
        });
      } else if (isBilateralRisk(riskValue)) {
        results.push({
          key: `${regionKey}.${riskKey}.left`,
          label: `L ${regionLabel}: ${readableLabel}`,
          region: regionKey,
          score: riskValue.left.risk,
          level: riskValue.left.level,
        });
        results.push({
          key: `${regionKey}.${riskKey}.right`,
          label: `R ${regionLabel}: ${readableLabel}`,
          region: regionKey,
          score: riskValue.right.risk,
          level: riskValue.right.level,
        });
      }
    }
  }
  return results;
}

function buildCorrelationInput(
  modelConfig: Record<string, any>,
  overrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  forceMultiplier: number
): { forces: ForceAnalysisResult; muscles: MuscleAnalysisResult; correlation: CrossSystemCorrelationResult | null } {
  const forces = calculatePosturalForces(modelConfig);
  if (forceMultiplier !== 1.0) {
    for (const j of forces.joints) {
      j.compression *= forceMultiplier;
      j.tension *= forceMultiplier;
      j.shear *= forceMultiplier;
      j.totalForce *= forceMultiplier;
      if (j.totalForce < 500) j.status = 'low';
      else if (j.totalForce < 1500) j.status = 'moderate';
      else if (j.totalForce < 3000) j.status = 'high';
      else j.status = 'very_high';
    }
  }
  const muscleBase = computeFullMuscleAnalysis(modelConfig);
  const muscles = applyOverridesToAnalysis(muscleBase, overrides as Record<string, MuscleOverride>);

  let correlation: CrossSystemCorrelationResult | null = null;
  try {
    correlation = computeCrossSystemCorrelation({
      painMarkers: painMarkers.map(pm => ({
        id: pm.id, position: pm.position, label: pm.label, type: pm.type,
        severity: pm.severity ?? 5, description: pm.description,
      })),
      forces: forces.joints,
      muscles: muscles.allMuscles,
      muscleGroups: muscles.groups,
      syndromes: muscles.syndromes,
      kineticChains: KINETIC_CHAINS,
      bodyWeightKg,
    });
  } catch (_e) { /* optional */ }

  return { forces, muscles, correlation };
}

export function computeWhatIfComparison(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  scenarios: WhatIfScenario[]
): WhatIfComparisonResult {
  const { modelConfig: simConfig, overrides: simOverrides, forceMultiplier } = applyScenarios(baseModelConfig, baseOverrides, scenarios);

  const before = buildCorrelationInput(baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, 1.0);
  const after = buildCorrelationInput(simConfig, simOverrides, painMarkers, bodyWeightKg, forceMultiplier);

  const forceDeltas: ForceDelta[] = [];
  for (const bj of before.forces.joints) {
    const aj = after.forces.joints.find(j => j.id === bj.id);
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

  const muscleDeltas: MuscleDelta[] = [];
  for (const bm of before.muscles.allMuscles) {
    const am = after.muscles.allMuscles.find(m => m.id === bm.id);
    if (am && (
      Math.abs(am.activationPercent - bm.activationPercent) > 2 ||
      Math.abs(am.tightnessPercent - bm.tightnessPercent) > 2 ||
      am.clinicalStatus !== bm.clinicalStatus
    )) {
      muscleDeltas.push({
        muscleId: bm.id,
        label: bm.label,
        activationBefore: bm.activationPercent,
        activationAfter: am.activationPercent,
        tightnessBefore: bm.tightnessPercent,
        tightnessAfter: am.tightnessPercent,
        statusBefore: bm.clinicalStatus,
        statusAfter: am.clinicalStatus,
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
    beforeRisk = calculateInjuryRisks(calculateFullBiomechanics(170, bodyWeightKg, safeModel(baseModelConfig)));
    afterRisk = calculateInjuryRisks(calculateFullBiomechanics(170, bodyWeightKg, safeModel(simConfig)));
  } catch (_e) { /* optional */ }

  const riskDeltas: RiskDelta[] = [];
  const overallBefore = beforeRisk?.overallRiskScore ?? 0;
  const overallAfter = afterRisk?.overallRiskScore ?? 0;

  if (beforeRisk && afterRisk) {
    const beforeFlat = flattenRisks(beforeRisk.jointRisks);
    const afterFlat = flattenRisks(afterRisk.jointRisks);
    for (const br of beforeFlat) {
      const ar = afterFlat.find(r => r.key === br.key);
      if (ar) {
        riskDeltas.push({
          region: br.region,
          label: br.label,
          before: br.score,
          after: ar.score,
          delta: ar.score - br.score,
          levelBefore: br.level,
          levelAfter: ar.level,
        });
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

  let mechanismBefore: InjuryMechanismResult | null = null;
  let mechanismAfter: InjuryMechanismResult | null = null;
  let causalChainsResolved = 0;
  let causalChainsTotal = 0;
  try {
    mechanismBefore = analyzeInjuryMechanism({
      forceAnalysis: before.forces,
      pathologyCompensation: beforePathology,
      correlationResult: before.correlation,
      compensatedOverrides: baseOverrides,
      bodyWeightKg,
    });
    mechanismAfter = analyzeInjuryMechanism({
      forceAnalysis: after.forces,
      pathologyCompensation: afterPathology,
      correlationResult: after.correlation,
      compensatedOverrides: simOverrides,
      bodyWeightKg,
    });
    causalChainsTotal = mechanismBefore.causalChains.length;
    causalChainsResolved = causalChainsTotal - mechanismAfter.causalChains.length;
    if (causalChainsResolved < 0) causalChainsResolved = 0;
  } catch (_e) { /* optional */ }

  const painPredictions: PainPredictionDelta[] = [];
  const painRegions = ['lumbar', 'cervical', 'knee', 'hip', 'ankle', 'shoulder'];
  for (const region of painRegions) {
    const beforeRegionRisks = riskDeltas.filter(rd => rd.region.toLowerCase().includes(region) || rd.label.toLowerCase().includes(region));
    const beforeForceRegion = forceDeltas.filter(fd => fd.jointId.toLowerCase().includes(region));
    if (beforeRegionRisks.length === 0 && beforeForceRegion.length === 0) continue;
    const avgRiskBefore = beforeRegionRisks.length > 0
      ? beforeRegionRisks.reduce((s, r) => s + r.before, 0) / beforeRegionRisks.length
      : 0;
    const avgRiskAfter = beforeRegionRisks.length > 0
      ? beforeRegionRisks.reduce((s, r) => s + r.after, 0) / beforeRegionRisks.length
      : 0;
    const avgForceDeltaPct = beforeForceRegion.length > 0
      ? beforeForceRegion.reduce((s, f) => s + f.deltaPercent, 0) / beforeForceRegion.length
      : 0;
    const beforeLikelihood = clamp(avgRiskBefore * 0.7 + (avgForceDeltaPct > 0 ? 10 : 0), 0, 100);
    const afterLikelihood = clamp(avgRiskAfter * 0.7 + (avgForceDeltaPct > 0 ? avgForceDeltaPct * 0.3 : avgForceDeltaPct * 0.2), 0, 100);
    if (Math.abs(beforeLikelihood - afterLikelihood) > 1) {
      painPredictions.push({
        region: region.charAt(0).toUpperCase() + region.slice(1),
        beforeLikelihood: Math.round(beforeLikelihood),
        afterLikelihood: Math.round(afterLikelihood),
        delta: Math.round(afterLikelihood - beforeLikelihood),
      });
    }
  }

  const topImprovements: string[] = [];
  if (overallAfter < overallBefore) {
    topImprovements.push(`Overall risk: ${overallBefore.toFixed(0)} → ${overallAfter.toFixed(0)} (↓${(overallBefore - overallAfter).toFixed(0)})`);
  }
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
  const resolvedComps = compensationDeltas.filter(c => c.resolvedPercent >= 50);
  for (const rc of resolvedComps.slice(0, 2)) {
    topImprovements.push(`${rc.pattern}: ${rc.resolvedPercent.toFixed(0)}% resolved`);
  }
  for (const pp of painPredictions.filter(p => p.delta < 0).slice(0, 2)) {
    topImprovements.push(`${pp.region} pain: ↓${Math.abs(pp.delta)}% predicted`);
  }
  if (causalChainsResolved > 0) {
    topImprovements.push(`${causalChainsResolved}/${causalChainsTotal} causal chains resolved`);
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
    muscleDeltas: muscleDeltas.sort((a, b) => (a.activationAfter - a.activationBefore) - (b.activationAfter - b.activationBefore)),
    painPredictions: painPredictions.sort((a, b) => a.delta - b.delta),
    correlationBefore: before.correlation,
    correlationAfter: after.correlation,
    mechanismBefore,
    mechanismAfter,
    causalChainsResolved,
    causalChainsTotal,
    topImprovements,
    simulatedModelConfig: simConfig,
    simulatedOverrides: simOverrides,
    forceMultiplier,
  };
}
