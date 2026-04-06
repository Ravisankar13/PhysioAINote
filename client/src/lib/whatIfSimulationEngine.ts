import { calculatePosturalForces, type ForceAnalysisResult } from './posturalForceEngine';
import { computeFullMuscleAnalysis, applyOverridesToAnalysis, type MuscleOverride, type MuscleAnalysisResult } from './muscleBiomechanicsEngine';
import { computePathologyCompensation } from './pathologyCompensationEngine';
import { computeCrossSystemCorrelation, type CrossSystemCorrelationResult } from './crossSystemCorrelation';
import { calculateFullBiomechanics } from './biomechanicsEngine';
import { calculateInjuryRisks, type InjuryRiskResult, type RiskScore, type BilateralRisk } from './injuryRiskEngine';
import { analyzeInjuryMechanism, type InjuryMechanismResult } from './injuryMechanismEngine';
import { KINETIC_CHAINS } from './kineticChainExplorer';
import { computeSlingAnalysis, type SlingAnalysisResult, type SlingId } from './slingEngine';

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

export interface SlingDelta {
  slingId: SlingId;
  label: string;
  color: string;
  activationBefore: number;
  activationAfter: number;
  activationDelta: number;
  statusBefore: string;
  statusAfter: string;
  transferBefore: string;
  transferAfter: string;
  transferScoreBefore: number;
  transferScoreAfter: number;
  weakLinksBefore: number;
  weakLinksAfter: number;
}

export interface TimelinePoint {
  week: number;
  riskScore: number;
  riskLevel: string;
  forceReduction: number;
  compensationResolution: number;
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
  slingDeltas: SlingDelta[];
  slingBefore: SlingAnalysisResult | null;
  slingAfter: SlingAnalysisResult | null;
  forceTransferScoreBefore: number;
  forceTransferScoreAfter: number;
  correlationBefore: CrossSystemCorrelationResult | null;
  correlationAfter: CrossSystemCorrelationResult | null;
  mechanismBefore: InjuryMechanismResult | null;
  mechanismAfter: InjuryMechanismResult | null;
  causalChainsResolved: number;
  causalChainsTotal: number;
  topImprovements: string[];
  timeline: TimelinePoint[];
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
  deltoid_l: ['l_ant_deltoid', 'l_mid_deltoid', 'l_post_deltoid'],
  deltoid_r: ['r_ant_deltoid', 'r_mid_deltoid', 'r_post_deltoid'],
  neck: ['deep_neck_flexors', 'l_upper_trap', 'r_upper_trap', 'scm', 'suboccipitals', 'levator_scapulae', 'scalenes'],
  chest: ['l_pec_major', 'r_pec_major', 'l_pec_minor', 'r_pec_minor'],
  shin_l: ['l_tib_ant'],
  shin_r: ['r_tib_ant'],
  hamstring_l: ['l_hamstrings'],
  hamstring_r: ['r_hamstrings'],
  hip_flexor_l: ['l_hip_flexors', 'l_rect_fem'],
  hip_flexor_r: ['r_hip_flexors', 'r_rect_fem'],
  adductor_l: ['l_adductors'],
  adductor_r: ['r_adductors'],
  piriformis_l: ['l_piriformis'],
  piriformis_r: ['r_piriformis'],
  rotator_cuff_l: ['l_supraspinatus', 'l_infraspinatus'],
  rotator_cuff_r: ['r_supraspinatus', 'r_infraspinatus'],
  peroneal_l: ['l_peroneals'],
  peroneal_r: ['r_peroneals'],
  tib_post_l: ['l_tib_post'],
  tib_post_r: ['r_tib_post'],
  bicep_l: ['l_biceps'],
  bicep_r: ['r_biceps'],
  tricep_l: ['l_triceps'],
  tricep_r: ['r_triceps'],
  wrist_flex_l: ['l_wrist_flex'],
  wrist_flex_r: ['r_wrist_flex'],
  wrist_ext_l: ['l_wrist_ext'],
  wrist_ext_r: ['r_wrist_ext'],
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
  hamstring_l: (m) => ({ leftKnee: { flexion: m * 0.08 }, leftHip: { extension: m * 0.12 }, pelvis: { tilt: m * 0.06 } }),
  hamstring_r: (m) => ({ rightKnee: { flexion: m * 0.08 }, rightHip: { extension: m * 0.12 }, pelvis: { tilt: m * 0.06 } }),
  hip_flexor_l: (m) => ({ leftHip: { flexion: m * 0.15 }, pelvis: { tilt: m * 0.08 } }),
  hip_flexor_r: (m) => ({ rightHip: { flexion: m * 0.15 }, pelvis: { tilt: m * 0.08 } }),
  adductor_l: (m) => ({ leftHip: { adduction: m * 0.1 } }),
  adductor_r: (m) => ({ rightHip: { adduction: m * 0.1 } }),
  piriformis_l: (m) => ({ leftHip: { externalRotation: m * 0.1 } }),
  piriformis_r: (m) => ({ rightHip: { externalRotation: m * 0.1 } }),
  rotator_cuff_l: (m) => ({ leftShoulder: { externalRotation: m * 0.15, abduction: m * 0.08 } }),
  rotator_cuff_r: (m) => ({ rightShoulder: { externalRotation: m * 0.15, abduction: m * 0.08 } }),
  peroneal_l: (m) => ({ leftAnkle: { eversion: m * 0.1, inversion: -(m * 0.08) } }),
  peroneal_r: (m) => ({ rightAnkle: { eversion: m * 0.1, inversion: -(m * 0.08) } }),
  tib_post_l: (m) => ({ leftAnkle: { inversion: m * 0.08 } }),
  tib_post_r: (m) => ({ rightAnkle: { inversion: m * 0.08 } }),
  bicep_l: (m) => ({ leftElbow: { flexion: m * 0.06 } }),
  bicep_r: (m) => ({ rightElbow: { flexion: m * 0.06 } }),
  tricep_l: (m) => ({ leftElbow: { flexion: -(m * 0.06) } }),
  tricep_r: (m) => ({ rightElbow: { flexion: -(m * 0.06) } }),
  wrist_flex_l: (m) => ({ leftWrist: { flexion: m * 0.05 } }),
  wrist_flex_r: (m) => ({ rightWrist: { flexion: m * 0.05 } }),
  wrist_ext_l: (m) => ({ leftWrist: { extension: m * 0.05 } }),
  wrist_ext_r: (m) => ({ rightWrist: { extension: m * 0.05 } }),
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
  hamstring_l: (m) => ({ leftHip: { flexion: m * 0.2 }, pelvis: { tilt: -(m * 0.12) } }),
  hamstring_r: (m) => ({ rightHip: { flexion: m * 0.2 }, pelvis: { tilt: -(m * 0.12) } }),
  hip_flexor_l: (m) => ({ pelvis: { tilt: -(m * 0.2) }, spine: { lumbarLordosis: -(m * 0.12) }, leftHip: { extension: m * 0.18 } }),
  hip_flexor_r: (m) => ({ pelvis: { tilt: -(m * 0.2) }, spine: { lumbarLordosis: -(m * 0.12) }, rightHip: { extension: m * 0.18 } }),
  adductor_l: (m) => ({ leftHip: { abduction: m * 0.15 } }),
  adductor_r: (m) => ({ rightHip: { abduction: m * 0.15 } }),
  piriformis_l: (m) => ({ leftHip: { internalRotation: m * 0.15 } }),
  piriformis_r: (m) => ({ rightHip: { internalRotation: m * 0.15 } }),
  rotator_cuff_l: (m) => ({ leftShoulder: { internalRotation: m * 0.1 } }),
  rotator_cuff_r: (m) => ({ rightShoulder: { internalRotation: m * 0.1 } }),
  peroneal_l: (m) => ({ leftAnkle: { inversion: m * 0.1 } }),
  peroneal_r: (m) => ({ rightAnkle: { inversion: m * 0.1 } }),
  tib_post_l: (m) => ({ leftAnkle: { eversion: m * 0.08 } }),
  tib_post_r: (m) => ({ rightAnkle: { eversion: m * 0.08 } }),
  bicep_l: (m) => ({ leftElbow: { flexion: -(m * 0.08) } }),
  bicep_r: (m) => ({ rightElbow: { flexion: -(m * 0.08) } }),
  wrist_flex_l: (m) => ({ leftWrist: { extension: m * 0.1 } }),
  wrist_flex_r: (m) => ({ rightWrist: { extension: m * 0.1 } }),
  wrist_ext_l: (m) => ({ leftWrist: { flexion: m * 0.1 } }),
  wrist_ext_r: (m) => ({ rightWrist: { flexion: m * 0.1 } }),
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
  leftElbow: (m) => ({ leftElbow: { flexion: m * 0.08, pronation: m * 0.05 } }),
  rightElbow: (m) => ({ rightElbow: { flexion: m * 0.08, pronation: m * 0.05 } }),
  leftWrist: (m) => ({ leftWrist: { flexion: m * 0.08, extension: m * 0.08 } }),
  rightWrist: (m) => ({ rightWrist: { flexion: m * 0.08, extension: m * 0.08 } }),
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
  { id: 'hamstring_l', label: 'L Hamstrings' },
  { id: 'hamstring_r', label: 'R Hamstrings' },
  { id: 'hip_flexor_l', label: 'L Hip Flexors' },
  { id: 'hip_flexor_r', label: 'R Hip Flexors' },
  { id: 'adductor_l', label: 'L Adductors' },
  { id: 'adductor_r', label: 'R Adductors' },
  { id: 'piriformis_l', label: 'L Piriformis' },
  { id: 'piriformis_r', label: 'R Piriformis' },
  { id: 'calf_l', label: 'L Calf' },
  { id: 'calf_r', label: 'R Calf' },
  { id: 'peroneal_l', label: 'L Peroneals' },
  { id: 'peroneal_r', label: 'R Peroneals' },
  { id: 'tib_post_l', label: 'L Tib Posterior' },
  { id: 'tib_post_r', label: 'R Tib Posterior' },
  { id: 'scapula_l', label: 'L Scapular' },
  { id: 'scapula_r', label: 'R Scapular' },
  { id: 'rotator_cuff_l', label: 'L Rotator Cuff' },
  { id: 'rotator_cuff_r', label: 'R Rotator Cuff' },
  { id: 'deltoid_l', label: 'L Deltoid' },
  { id: 'deltoid_r', label: 'R Deltoid' },
  { id: 'spine', label: 'Erector Spinae' },
  { id: 'neck', label: 'Neck' },
  { id: 'chest', label: 'Chest/Pecs' },
  { id: 'bicep_l', label: 'L Biceps' },
  { id: 'bicep_r', label: 'R Biceps' },
  { id: 'tricep_l', label: 'L Triceps' },
  { id: 'tricep_r', label: 'R Triceps' },
  { id: 'wrist_flex_l', label: 'L Wrist Flexors' },
  { id: 'wrist_flex_r', label: 'R Wrist Flexors' },
  { id: 'wrist_ext_l', label: 'L Wrist Extensors' },
  { id: 'wrist_ext_r', label: 'R Wrist Extensors' },
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
  { id: 'leftElbow', label: 'L Elbow' },
  { id: 'rightElbow', label: 'R Elbow' },
  { id: 'leftWrist', label: 'L Wrist' },
  { id: 'rightWrist', label: 'R Wrist' },
  { id: 'neck', label: 'Neck' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function expandBilateralTarget(target: string): string[] {
  const BILATERAL_MAP: Record<string, string[]> = {
    glute: ['glute_l', 'glute_r'],
    quad: ['quad_l', 'quad_r'],
    calf: ['calf_l', 'calf_r'],
    scapula: ['scapula_l', 'scapula_r'],
    ankle: ['leftAnkle', 'rightAnkle'],
    hip: ['leftHip', 'rightHip'],
    knee: ['leftKnee', 'rightKnee'],
    shoulder: ['leftShoulder', 'rightShoulder'],
    hamstring: ['hamstring_l', 'hamstring_r'],
    hip_flexor: ['hip_flexor_l', 'hip_flexor_r'],
    adductor: ['adductor_l', 'adductor_r'],
    piriformis: ['piriformis_l', 'piriformis_r'],
    rotator_cuff: ['rotator_cuff_l', 'rotator_cuff_r'],
    peroneal: ['peroneal_l', 'peroneal_r'],
    tib_post: ['tib_post_l', 'tib_post_r'],
    bicep: ['bicep_l', 'bicep_r'],
    tricep: ['tricep_l', 'tricep_r'],
    deltoid: ['deltoid_l', 'deltoid_r'],
    elbow: ['leftElbow', 'rightElbow'],
    wrist: ['leftWrist', 'rightWrist'],
    wrist_flex: ['wrist_flex_l', 'wrist_flex_r'],
    wrist_ext: ['wrist_ext_l', 'wrist_ext_r'],
  };
  return BILATERAL_MAP[target] || [target];
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

const JOINT_DEVIATION_TARGETS: Record<string, { configKey: string; paramKey: string; normalValue: number }[]> = {
  spine: [
    { configKey: 'spine', paramKey: 'thoracicKyphosis', normalValue: 40 },
    { configKey: 'spine', paramKey: 'lumbarLordosis', normalValue: 30 },
    { configKey: 'spine', paramKey: 'scoliosis', normalValue: 0 },
  ],
  neck: [
    { configKey: 'spine', paramKey: 'forwardHead', normalValue: 0 },
  ],
  hip: [
    { configKey: 'leftHip', paramKey: 'flexion', normalValue: 0 },
    { configKey: 'rightHip', paramKey: 'flexion', normalValue: 0 },
  ],
  hip_l: [
    { configKey: 'leftHip', paramKey: 'flexion', normalValue: 0 },
  ],
  hip_r: [
    { configKey: 'rightHip', paramKey: 'flexion', normalValue: 0 },
  ],
  knee: [
    { configKey: 'leftKnee', paramKey: 'flexion', normalValue: 0 },
    { configKey: 'rightKnee', paramKey: 'flexion', normalValue: 0 },
  ],
  knee_l: [
    { configKey: 'leftKnee', paramKey: 'flexion', normalValue: 0 },
  ],
  knee_r: [
    { configKey: 'rightKnee', paramKey: 'flexion', normalValue: 0 },
  ],
  ankle: [
    { configKey: 'leftAnkle', paramKey: 'dorsiflexion', normalValue: 0 },
    { configKey: 'rightAnkle', paramKey: 'dorsiflexion', normalValue: 0 },
  ],
  ankle_l: [
    { configKey: 'leftAnkle', paramKey: 'dorsiflexion', normalValue: 0 },
  ],
  ankle_r: [
    { configKey: 'rightAnkle', paramKey: 'dorsiflexion', normalValue: 0 },
  ],
  shoulder: [
    { configKey: 'leftShoulder', paramKey: 'protraction', normalValue: 0 },
    { configKey: 'rightShoulder', paramKey: 'protraction', normalValue: 0 },
  ],
  shoulder_l: [
    { configKey: 'leftShoulder', paramKey: 'protraction', normalValue: 0 },
  ],
  shoulder_r: [
    { configKey: 'rightShoulder', paramKey: 'protraction', normalValue: 0 },
  ],
  elbow: [
    { configKey: 'leftElbow', paramKey: 'flexion', normalValue: 0 },
    { configKey: 'rightElbow', paramKey: 'flexion', normalValue: 0 },
  ],
  elbow_l: [
    { configKey: 'leftElbow', paramKey: 'flexion', normalValue: 0 },
  ],
  elbow_r: [
    { configKey: 'rightElbow', paramKey: 'flexion', normalValue: 0 },
  ],
  wrist_l: [
    { configKey: 'leftWrist', paramKey: 'flexion', normalValue: 0 },
  ],
  wrist_r: [
    { configKey: 'rightWrist', paramKey: 'flexion', normalValue: 0 },
  ],
};

function computeBaselineAwareMagnitude(
  baseMagnitude: number,
  scenarioTarget: string,
  muscleAnalysis: MuscleAnalysisResult | null,
  interventionType?: InterventionType,
  modelConfig?: Record<string, unknown> | null,
): number {
  if (interventionType === 'mobilize' && modelConfig) {
    const deviations = JOINT_DEVIATION_TARGETS[scenarioTarget];
    if (deviations && deviations.length > 0) {
      let totalDeviation = 0;
      let devCount = 0;
      for (const dev of deviations) {
        const jointConfig = modelConfig[dev.configKey] as Record<string, number> | undefined;
        if (jointConfig && jointConfig[dev.paramKey] !== undefined) {
          const actual = jointConfig[dev.paramKey];
          const deviation = Math.abs(actual - dev.normalValue);
          totalDeviation += deviation;
          devCount++;
        }
      }
      if (devCount > 0) {
        const avgDeviation = totalDeviation / devCount;
        const deviationScale = 0.6 + (avgDeviation / 30) * 0.8;
        return baseMagnitude * clamp(deviationScale, 0.4, 2.0);
      }
    }
  }

  if (!muscleAnalysis) return baseMagnitude;
  const muscleIds = SCENARIO_TO_MUSCLE_IDS[scenarioTarget];
  if (!muscleIds || muscleIds.length === 0) return baseMagnitude;

  let totalDeficit = 0;
  let count = 0;
  for (const mId of muscleIds) {
    const muscle = muscleAnalysis.allMuscles.find(m => m.id === mId);
    if (muscle) {
      const deficit = Math.max(0, 100 - muscle.activationPercent) / 100;
      totalDeficit += deficit;
      count++;
    }
  }

  if (count === 0) return baseMagnitude;
  const avgDeficit = totalDeficit / count;
  const scaleFactor = 0.5 + avgDeficit * 0.8;
  return baseMagnitude * clamp(scaleFactor, 0.3, 1.8);
}

export function applyScenarios(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  scenarios: WhatIfScenario[],
  baselineMuscleAnalysis?: MuscleAnalysisResult | null,
): { modelConfig: Record<string, any>; overrides: Record<string, Partial<MuscleOverride>>; forceMultiplier: number } {
  const config: Record<string, any> = JSON.parse(JSON.stringify(baseModelConfig));
  const overrides: Record<string, Partial<MuscleOverride>> = JSON.parse(JSON.stringify(baseOverrides));
  let forceMultiplier = 1.0;

  for (const scenario of scenarios) {
    if (scenario.target === 'cadence' && scenario.interventionType === 'offload') {
      forceMultiplier *= (1 - scenario.magnitude * 0.008);
      continue;
    }

    const effectiveMagnitude = computeBaselineAwareMagnitude(
      scenario.magnitude,
      scenario.target,
      baselineMuscleAnalysis ?? null,
      scenario.interventionType,
      baseModelConfig,
    );

    const targets = expandBilateralTarget(scenario.target);

    for (const target of targets) {
      if (scenario.interventionType === 'strengthen') {
        const effectFn = STRENGTHEN_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(effectiveMagnitude);
          for (const [joint, params] of Object.entries(effects)) {
            if (!config[joint]) config[joint] = {};
            for (const [param, value] of Object.entries(params)) {
              config[joint][param] = (config[joint][param] || 0) + value;
            }
          }
        }
        applyOverrideToMuscleIds(overrides, target, {
          tensionOffset: -(effectiveMagnitude * 0.3),
          activationOffset: effectiveMagnitude * 0.4,
          inhibition: -(effectiveMagnitude * 0.5),
        });
      }

      if (scenario.interventionType === 'stretch') {
        const effectFn = STRETCH_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(effectiveMagnitude);
          for (const [joint, params] of Object.entries(effects)) {
            if (!config[joint]) config[joint] = {};
            for (const [param, value] of Object.entries(params)) {
              config[joint][param] = (config[joint][param] || 0) + value;
            }
          }
        }
        applyOverrideToMuscleIds(overrides, target, {
          tensionOffset: -(effectiveMagnitude * 0.5),
          activationOffset: -(effectiveMagnitude * 0.1),
        });
      }

      if (scenario.interventionType === 'mobilize') {
        const effectFn = MOBILIZE_EFFECTS[target];
        if (effectFn) {
          const effects = effectFn(effectiveMagnitude);
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
          tensionOffset: -(effectiveMagnitude * 0.4),
          activationOffset: -(effectiveMagnitude * 0.2),
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
      const maxBw = Math.max(j.compression, j.tension);
      if (maxBw < 0.8) j.status = 'low';
      else if (maxBw < 1.5) j.status = 'moderate';
      else if (maxBw < 3.0) j.status = 'high';
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
  } catch (e) {
    console.warn('[WhatIf] Correlation computation failed:', e instanceof Error ? e.message : e);
  }

  return { forces, muscles, correlation };
}

export interface DecisionEngineIntervention {
  id: string;
  name: string;
  category: string;
  tier: string;
  targetRegions: string[];
  dosage: string;
  evidenceGrade: string;
  score?: number;
}

const REGION_TO_TARGETS: Record<string, { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType }> = {
  lumbar: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  thoracic: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  cervical: { target: 'neck', targetType: 'joint', intervention: 'mobilize' },
  shoulder: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  hip: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  knee: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  ankle: { target: 'ankle', targetType: 'joint', intervention: 'mobilize' },
  elbow: { target: 'elbow', targetType: 'joint', intervention: 'mobilize' },
  wrist: { target: 'wrist', targetType: 'joint', intervention: 'mobilize' },
  core: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  gluteal: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  hamstring: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  calf: { target: 'calf', targetType: 'muscle', intervention: 'strengthen' },
  scapular: { target: 'scapula', targetType: 'muscle', intervention: 'strengthen' },
};

const CATEGORY_INTERVENTION_MAP: Record<string, InterventionType> = {
  exercise: 'strengthen',
  manual_therapy: 'mobilize',
  modality: 'offload',
  load_management: 'offload',
  neural: 'mobilize',
  education: 'offload',
};

export function generateScenariosFromDecisionEngine(
  interventions: DecisionEngineIntervention[]
): WhatIfScenario[] {
  const scenarios: WhatIfScenario[] = [];
  const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6'];
  const seen = new Set<string>();

  for (const intervention of interventions.slice(0, 8)) {
    const nameLC = intervention.name.toLowerCase();
    const categoryIntervention = CATEGORY_INTERVENTION_MAP[intervention.category] || 'strengthen';
    let matchedTarget: { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType } | null = null;

    for (const region of intervention.targetRegions) {
      const regionLC = region.toLowerCase();
      for (const [key, mapping] of Object.entries(REGION_TO_TARGETS)) {
        if (regionLC.includes(key)) {
          matchedTarget = mapping;
          break;
        }
      }
      if (matchedTarget) break;
    }

    if (!matchedTarget) {
      if (nameLC.includes('stretch')) {
        matchedTarget = { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' };
      } else if (nameLC.includes('strengthen') || nameLC.includes('exercise')) {
        matchedTarget = { target: 'core', targetType: 'muscle', intervention: 'strengthen' };
      } else {
        matchedTarget = { target: 'spine', targetType: 'joint', intervention: categoryIntervention };
      }
    }

    const finalIntervention = nameLC.includes('stretch') ? 'stretch' as InterventionType
      : nameLC.includes('mobiliz') || nameLC.includes('mobilise') ? 'mobilize' as InterventionType
      : nameLC.includes('strengthen') || nameLC.includes('progressive') ? 'strengthen' as InterventionType
      : matchedTarget.intervention;

    const scenarioKey = `${matchedTarget.target}_${finalIntervention}`;
    if (seen.has(scenarioKey)) continue;
    seen.add(scenarioKey);

    const magnitude = intervention.tier === 'primary' ? 20 : 12;
    scenarios.push({
      id: `de_${intervention.id}`,
      label: intervention.name.length > 25 ? intervention.name.slice(0, 22) + '...' : intervention.name,
      description: `${intervention.name} (${intervention.tier}, ${intervention.evidenceGrade})`,
      interventionType: finalIntervention,
      target: matchedTarget.target,
      targetType: matchedTarget.targetType,
      magnitude,
      unit: finalIntervention === 'mobilize' ? '°' : '%',
      color: colors[scenarios.length % colors.length],
    });
  }

  return scenarios;
}


function getRiskLevelFromScore(score: number): string {
  if (score < 20) return 'minimal';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

function getDoseResponseFraction(week: number): number {
  if (week === 0) return 0;
  if (week <= 2) return 0.15 * week;
  if (week <= 6) return 0.3 + (week - 2) * 0.12;
  if (week <= 10) return 0.78 + (week - 6) * 0.04;
  return clamp(0.94 + (week - 10) * 0.015, 0, 1);
}

function getWeekScaledScenarios(scenarios: WhatIfScenario[], week: number): WhatIfScenario[] {
  const fraction = getDoseResponseFraction(week);
  return scenarios.map(s => ({
    ...s,
    magnitude: s.magnitude * fraction,
  }));
}

function computeTimelineProjection(
  baseModelConfig: Record<string, Record<string, number>>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  scenarios: WhatIfScenario[],
  overallRiskBefore: number,
  muscleAnalysis: MuscleAnalysisResult | null,
): TimelinePoint[] {
  const points: TimelinePoint[] = [];

  for (let week = 0; week <= 12; week++) {
    if (week === 0) {
      points.push({
        week: 0,
        riskScore: Math.round(clamp(overallRiskBefore, 0, 100)),
        riskLevel: getRiskLevelFromScore(overallRiskBefore),
        forceReduction: 0,
        compensationResolution: 0,
      });
      continue;
    }

    const weekScenarios = getWeekScaledScenarios(scenarios, week);
    const { modelConfig: weekConfig, overrides: weekOverrides, forceMultiplier: weekFM } = applyScenarios(
      baseModelConfig, baseOverrides, weekScenarios, muscleAnalysis ?? undefined
    );

    let weekOverallAfter = overallRiskBefore;
    try {
      const weekAfter = buildCorrelationInput(weekConfig, weekOverrides, painMarkers, bodyWeightKg, weekFM);
      weekOverallAfter = weekAfter.correlation?.overallRiskScore ?? overallRiskBefore;
    } catch { /* ignore */ }

    const forceReduction = (1 - weekFM) * 100;

    const fraction = getDoseResponseFraction(week);
    const avgCompResolution = fraction * 60;

    points.push({
      week,
      riskScore: Math.round(clamp(weekOverallAfter, 0, 100)),
      riskLevel: getRiskLevelFromScore(weekOverallAfter),
      forceReduction: Math.round(forceReduction * 10) / 10,
      compensationResolution: Math.round(avgCompResolution * 10) / 10,
    });
  }
  return points;
}

export function computeWhatIfComparison(
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  scenarios: WhatIfScenario[],
  muscleAnalysis?: MuscleAnalysisResult | null,
  biomechanicsOutput?: any | null,
): WhatIfComparisonResult {
  const { modelConfig: simConfig, overrides: simOverrides, forceMultiplier } = applyScenarios(baseModelConfig, baseOverrides, scenarios, muscleAnalysis);
  const effectiveBodyWeightKg = bodyWeightKg * forceMultiplier;

  const before = buildCorrelationInput(baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, 1.0);
  const after = buildCorrelationInput(simConfig, simOverrides, painMarkers, effectiveBodyWeightKg, forceMultiplier);

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
    afterRisk = calculateInjuryRisks(calculateFullBiomechanics(170, effectiveBodyWeightKg, safeModel(simConfig)));
  } catch (e) {
    console.warn('[WhatIf] Risk computation failed:', e instanceof Error ? e.message : e);
  }

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
      bodyWeightKg: effectiveBodyWeightKg,
    });
    causalChainsTotal = mechanismBefore.causalChains.length;
    causalChainsResolved = causalChainsTotal - mechanismAfter.causalChains.length;
    if (causalChainsResolved < 0) causalChainsResolved = 0;
  } catch (e) {
    console.warn('[WhatIf] Mechanism computation failed:', e instanceof Error ? e.message : e);
  }

  let slingBefore: SlingAnalysisResult | null = null;
  let slingAfter: SlingAnalysisResult | null = null;
  const slingDeltas: SlingDelta[] = [];
  try {
    const toSlingOverrides = (overrides: Record<string, Partial<MuscleOverride>>): Record<string, { tension?: number; pathology?: string }> => {
      const result: Record<string, { tension?: number; pathology?: string }> = {};
      for (const [key, ov] of Object.entries(overrides)) {
        const tensionBase = 50;
        const tensionAdjust = (ov.tensionOffset ?? 0) * 0.5;
        const activationAdjust = (ov.activationOffset ?? 0) * 0.3;
        const inhibitionAdjust = (ov.inhibition ?? 0) * -0.2;
        result[key] = {
          tension: clamp(tensionBase + tensionAdjust + activationAdjust + inhibitionAdjust, 0, 100),
          pathology: (ov.pathology && ov.pathology !== 'none') ? ov.pathology : undefined,
        };
      }
      return result;
    };

    slingBefore = computeSlingAnalysis({
      biomechanicsOutput: biomechanicsOutput || null,
      muscleOverrides: toSlingOverrides(baseOverrides as Record<string, MuscleOverride>),
    });

    let simBiomechanicsOutput = biomechanicsOutput || null;
    if (simBiomechanicsOutput) {
      simBiomechanicsOutput = JSON.parse(JSON.stringify(simBiomechanicsOutput));
      if (simBiomechanicsOutput.posture && simBiomechanicsOutput.posture.deviations) {
        for (const dev of simBiomechanicsOutput.posture.deviations) {
          if (dev.angleDeg !== undefined) {
            const reductionFactor = 1 - (forceMultiplier < 1 ? (1 - forceMultiplier) * 2 : 0);
            dev.angleDeg = dev.angleDeg * clamp(reductionFactor, 0.3, 1.0);
          }
        }
      }
      if (simBiomechanicsOutput.faults) {
        simBiomechanicsOutput.faults.overallRiskScore = Math.round(
          simBiomechanicsOutput.faults.overallRiskScore * clamp(forceMultiplier, 0.5, 1.2)
        );
      }
    }

    slingAfter = computeSlingAnalysis({
      biomechanicsOutput: simBiomechanicsOutput,
      muscleOverrides: toSlingOverrides(simOverrides as Record<string, MuscleOverride>),
    });

    const transferScoreMap = (quality: string): number =>
      quality === 'good' ? 85 : quality === 'reduced' ? 55 : 25;

    for (const bs of slingBefore.slings) {
      const as_ = slingAfter.slings.find(s => s.slingId === bs.slingId);
      if (as_) {
        const delta = as_.activationScore - bs.activationScore;
        if (Math.abs(delta) > 1 || bs.status !== as_.status || bs.forceTransferQuality !== as_.forceTransferQuality) {
          slingDeltas.push({
            slingId: bs.slingId,
            label: bs.label,
            color: bs.color,
            activationBefore: bs.activationScore,
            activationAfter: as_.activationScore,
            activationDelta: delta,
            statusBefore: bs.status,
            statusAfter: as_.status,
            transferBefore: bs.forceTransferQuality,
            transferAfter: as_.forceTransferQuality,
            transferScoreBefore: transferScoreMap(bs.forceTransferQuality),
            transferScoreAfter: transferScoreMap(as_.forceTransferQuality),
            weakLinksBefore: bs.weakLinks.length,
            weakLinksAfter: as_.weakLinks.length,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[WhatIf] Sling computation failed:', e instanceof Error ? e.message : e);
  }

  const painPredictions: PainPredictionDelta[] = [];
  const PAIN_REGION_POSITIONS: Record<string, { x: number; y: number; z: number }> = {
    lumbar: { x: 0, y: 1.0, z: -0.1 },
    cervical: { x: 0, y: 1.5, z: 0 },
    knee: { x: 0.15, y: 0.5, z: 0 },
    hip: { x: 0.2, y: 0.9, z: 0 },
    ankle: { x: 0.1, y: 0.1, z: 0 },
    shoulder: { x: 0.35, y: 1.35, z: 0 },
    elbow: { x: 0.4, y: 1.1, z: 0 },
    wrist: { x: 0.45, y: 0.9, z: 0 },
  };
  const painRegions = ['lumbar', 'cervical', 'knee', 'hip', 'ankle', 'shoulder', 'elbow', 'wrist'];
  for (const region of painRegions) {
    const beforeRegionRisks = riskDeltas.filter(rd => rd.region.toLowerCase().includes(region) || rd.label.toLowerCase().includes(region));
    const beforeForceRegion = forceDeltas.filter(fd => fd.jointId.toLowerCase().includes(region));
    if (beforeRegionRisks.length === 0 && beforeForceRegion.length === 0) continue;

    let markerWeight = 1.0;
    const regionPos = PAIN_REGION_POSITIONS[region];
    if (regionPos && painMarkers.length > 0) {
      for (const pm of painMarkers) {
        const dx = pm.position.x - regionPos.x;
        const dy = pm.position.y - regionPos.y;
        const dz = pm.position.z - regionPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.3) {
          const severityFactor = (pm.severity ?? 5) / 5;
          const proximityFactor = 1 - (dist / 0.3);
          markerWeight += proximityFactor * severityFactor * 0.5;
        }
      }
    }

    const avgRiskBefore = beforeRegionRisks.length > 0
      ? beforeRegionRisks.reduce((s, r) => s + r.before, 0) / beforeRegionRisks.length
      : 0;
    const avgRiskAfter = beforeRegionRisks.length > 0
      ? beforeRegionRisks.reduce((s, r) => s + r.after, 0) / beforeRegionRisks.length
      : 0;
    const avgForceDeltaPct = beforeForceRegion.length > 0
      ? beforeForceRegion.reduce((s, f) => s + f.deltaPercent, 0) / beforeForceRegion.length
      : 0;
    const beforeLikelihood = clamp((avgRiskBefore * 0.7 + (avgForceDeltaPct > 0 ? 10 : 0)) * markerWeight, 0, 100);
    const afterLikelihood = clamp((avgRiskAfter * 0.7 + (avgForceDeltaPct > 0 ? avgForceDeltaPct * 0.3 : avgForceDeltaPct * 0.2)) * markerWeight, 0, 100);
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
  const sortedForces = [...forceDeltas].sort((a: ForceDelta, b: ForceDelta) => a.delta - b.delta);
  for (const fd of sortedForces.slice(0, 3)) {
    if (fd.delta < 0) {
      topImprovements.push(`${fd.jointLabel}: ${Math.abs(fd.deltaPercent).toFixed(0)}% force reduction`);
    }
  }
  const sortedRisks = [...riskDeltas].sort((a: RiskDelta, b: RiskDelta) => a.delta - b.delta);
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
  for (const sd of slingDeltas.filter(s => s.activationDelta > 3).slice(0, 2)) {
    topImprovements.push(`${sd.label}: activation ↑${sd.activationDelta.toFixed(0)}`);
  }

  const timeline = computeTimelineProjection(
    baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
    scenarios, overallBefore, muscleAnalysis ?? null,
  );

  return {
    scenarios,
    overallRiskBefore: overallBefore,
    overallRiskAfter: overallAfter,
    overallRiskDelta: overallAfter - overallBefore,
    riskLevelBefore: beforeRisk?.overallRiskLevel ?? 'minimal',
    riskLevelAfter: afterRisk?.overallRiskLevel ?? 'minimal',
    forceDeltas: forceDeltas.sort((a: ForceDelta, b: ForceDelta) => a.delta - b.delta),
    riskDeltas: riskDeltas.sort((a: RiskDelta, b: RiskDelta) => a.delta - b.delta),
    compensationDeltas,
    muscleDeltas: muscleDeltas.sort((a: MuscleDelta, b: MuscleDelta) => (a.activationAfter - a.activationBefore) - (b.activationAfter - b.activationBefore)),
    painPredictions: painPredictions.sort((a: PainPredictionDelta, b: PainPredictionDelta) => a.delta - b.delta),
    slingDeltas,
    slingBefore,
    slingAfter,
    forceTransferScoreBefore: slingBefore?.overallForceTransferScore ?? 0,
    forceTransferScoreAfter: slingAfter?.overallForceTransferScore ?? 0,
    correlationBefore: before.correlation,
    correlationAfter: after.correlation,
    mechanismBefore,
    mechanismAfter,
    causalChainsResolved,
    causalChainsTotal,
    topImprovements,
    timeline,
    simulatedModelConfig: simConfig,
    simulatedOverrides: simOverrides,
    forceMultiplier,
  };
}
