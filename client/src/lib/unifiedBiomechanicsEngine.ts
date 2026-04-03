import { calculatePosturalForces, type ForceAnalysisResult, type JointSurfaceForce } from './posturalForceEngine';
import { calculateFullBiomechanics, type BiomechanicsResult, type AsymmetryAnalysis as BiomechAsymmetry, type MovementQuality } from './biomechanicsEngine';
import { StaticPostureAnalyzer, type ModelConfig as StaticModelConfig } from './staticPostureAnalyzer';
import { computePathologyCompensation, type PathologyCompensationResult } from './pathologyCompensationEngine';
import { getMovementBiomechanics, type BiomechanicsSnapshot, type JointForce as MovementJointForce, type MuscleActivation as MovementMuscleActivation } from './movementBiomechanics';

export type Severity = 'mild' | 'moderate' | 'severe';

export interface UnifiedJointForce {
  joint: string;
  compressionBW: number;
  shearBW: number;
  tensionBW: number;
  totalBW: number;
  forceN: number;
  status: 'low' | 'moderate' | 'high' | 'very_high';
  clinical: string;
}

export interface WeightDistributionData {
  leftPct: number;
  rightPct: number;
  anteriorPosteriorShift: number;
  comX: number;
  comY: number;
  clinical: string;
}

export interface ForceOutput {
  joints: UnifiedJointForce[];
  weightDistribution: WeightDistributionData;
  peakJoint: string;
  peakForceBW: number;
}

export interface PosturalDeviation {
  pattern: string;
  region: string;
  severity: Severity;
  angleDeg: number;
  clinical: string;
}

export interface ROMRestriction {
  joint: string;
  parameter: string;
  currentDeg: number;
  normalDeg: number;
  deficitPct: number;
  reason: string;
}

export interface PostureOutput {
  deviations: PosturalDeviation[];
  romRestrictions: ROMRestriction[];
  overallAlignmentScore: number;
  dominantPattern: string;
}

export interface MuscleStateEntry {
  muscle: string;
  activationPct: number;
  role: 'overactive' | 'underactive' | 'normal' | 'inhibited';
  clinical: string;
}

export interface AsymmetryEntry {
  region: string;
  leftValue: number;
  rightValue: number;
  differencePct: number;
  severity: Severity;
  clinical: string;
}

export interface MuscleAsymmetryOutput {
  muscles: MuscleStateEntry[];
  asymmetries: AsymmetryEntry[];
  globalActivationScore: number;
}

export type FaultCategory = 'alignment' | 'stability' | 'mobility' | 'loading' | 'control';

export interface BiomechanicalFault {
  id: string;
  label: string;
  category: FaultCategory;
  severity: Severity;
  confidence: number;
  measuredValue: number;
  threshold: number;
  unit: string;
  affectedJoints: string[];
  clinical: string;
  corrective: string;
}

export interface FaultRuleConfig {
  id: string;
  label: string;
  category: FaultCategory;
  enabled: boolean;
  parameter: string;
  comparator: 'gt' | 'lt' | 'abs_gt';
  thresholdMild: number;
  thresholdModerate: number;
  thresholdSevere: number;
  unit: string;
  affectedJoints: string[];
  clinical: string;
  corrective: string;
}

export interface FaultOutput {
  faults: BiomechanicalFault[];
  faultCount: number;
  topFaultCategory: FaultCategory | null;
  overallRiskScore: number;
}

export interface MovementTaskForce {
  joint: string;
  label: string;
  forcePercent: number;
  baselinePercent: number;
  direction: string;
}

export interface MovementTaskMuscle {
  muscle: string;
  activationPercent: number;
  role: string;
}

export interface MovementTaskFault {
  id: string;
  label: string;
  severity: Severity;
  description: string;
  affectedJoint: string;
}

export interface MovementTaskOutput {
  taskId: string;
  taskLabel: string;
  progress: number;
  phase: string;
  forces: MovementTaskForce[];
  muscles: MovementTaskMuscle[];
  peakForceJoint: string;
  peakForcePct: number;
  taskFaults: MovementTaskFault[];
  taskScore: number;
}

export interface JointKinematicsEntry {
  joint: string;
  flexionDeg: number;
  extensionDeg: number;
  currentAngleDeg: number;
  normalRangeDeg: [number, number];
  withinNormal: boolean;
  plane: 'sagittal' | 'frontal' | 'transverse';
  clinical: string;
}

export interface JointKinematicsOutput {
  joints: JointKinematicsEntry[];
  totalMobilityScore: number;
  restrictedJoints: string[];
  hypermobileJoints: string[];
}

export interface CompensationPattern {
  id: string;
  label: string;
  primaryRegion: string;
  compensatingRegion: string;
  mechanism: string;
  severity: Severity;
  additionalLoadPct: number;
  affectedMovements: string[];
  clinical: string;
  corrective: string;
}

export interface CompensationOutput {
  patterns: CompensationPattern[];
  totalCompensationScore: number;
  primaryDrivers: string[];
  cascadeChains: Array<{ chain: string[]; severity: Severity }>;
}

export interface ComparisonEntry {
  parameter: string;
  leftValue: number;
  rightValue: number;
  delta: number;
  deltaPct: number;
  significance: 'negligible' | 'notable' | 'significant';
}

export interface ComparisonOutput {
  mode: 'left_right' | 'before_after';
  entries: ComparisonEntry[];
  summary: string;
}

export interface BiomechanicsOutput {
  timestamp: number;
  forces: ForceOutput;
  posture: PostureOutput;
  muscleAsymmetry: MuscleAsymmetryOutput;
  jointKinematics: JointKinematicsOutput;
  compensationPatterns: CompensationOutput;
  faults: FaultOutput;
  movementTask: MovementTaskOutput | null;
  comparison: ComparisonOutput | null;
  qualityScore: number;
  clinicalSummary: string;
}

export interface UnifiedBiomechanicsInput {
  modelConfig: Record<string, any>;
  heightCm: number;
  weightKg: number;
  muscleOverrides?: Record<string, any>;
  movementTaskId?: string;
  movementProgress?: number;
  faultRuleOverrides?: Partial<FaultRuleConfig>[];
  previousOutput?: BiomechanicsOutput | null;
}

const MOVEMENT_TASK_LABELS: Record<string, string> = {
  squat: 'Squat',
  single_leg_squat: 'Single Leg Squat',
  walk: 'Walking Gait',
  lunge: 'Lunge',
  singleLegBalance: 'Single Leg Balance',
  hipCircles: 'Hip Circles',
  shoulderCircles: 'Shoulder Circles',
  neckMobility: 'Neck Mobility',
  forwardBend: 'Forward Bend',
  backwardBend: 'Backward Bend',
  overhead_reach: 'Overhead Reach',
  calfRaises: 'Calf Raises',
  armElevations: 'Arm Elevations',
  hipHinge: 'Hip Hinge',
  shoulderAbduction: 'Shoulder Abduction',
  lateralLunge: 'Lateral Lunge',
  trunkRotation: 'Trunk Rotation',
  lateralFlexion: 'Lateral Flexion',
  elbowFlexion: 'Elbow Flexion',
  stepUp: 'Step Up',
};

export const AVAILABLE_MOVEMENT_TASKS = Object.entries(MOVEMENT_TASK_LABELS).map(([id, label]) => ({ id, label }));

const DEFAULT_FAULT_RULES: FaultRuleConfig[] = [
  {
    id: 'anterior_pelvic_tilt',
    label: 'Anterior Pelvic Tilt',
    category: 'alignment',
    enabled: true,
    parameter: 'pelvis.tilt',
    comparator: 'gt',
    thresholdMild: 12,
    thresholdModerate: 18,
    thresholdSevere: 25,
    unit: '°',
    affectedJoints: ['pelvis', 'lumbar_spine', 'hip'],
    clinical: 'Increased lumbar lordosis and anterior hip loading',
    corrective: 'Core strengthening, hip flexor stretching, posterior pelvic tilt exercises',
  },
  {
    id: 'posterior_pelvic_tilt',
    label: 'Posterior Pelvic Tilt',
    category: 'alignment',
    enabled: true,
    parameter: 'pelvis.tilt',
    comparator: 'lt',
    thresholdMild: -8,
    thresholdModerate: -15,
    thresholdSevere: -22,
    unit: '°',
    affectedJoints: ['pelvis', 'lumbar_spine'],
    clinical: 'Flattened lumbar curve, increased disc compression posteriorly',
    corrective: 'Hip flexor activation, lumbar extension exercises, anterior tilt training',
  },
  {
    id: 'excessive_thoracic_kyphosis',
    label: 'Excessive Thoracic Kyphosis',
    category: 'alignment',
    enabled: true,
    parameter: 'spine.thoracicKyphosis',
    comparator: 'gt',
    thresholdMild: 40,
    thresholdModerate: 50,
    thresholdSevere: 60,
    unit: '°',
    affectedJoints: ['thoracic_spine', 'cervical_spine', 'shoulder'],
    clinical: 'Forward head posture, shoulder impingement risk, thoracic outlet compression',
    corrective: 'Thoracic extension mobilization, pec stretching, scapular retraction exercises',
  },
  {
    id: 'excessive_lumbar_lordosis',
    label: 'Excessive Lumbar Lordosis',
    category: 'alignment',
    enabled: true,
    parameter: 'spine.lumbarLordosis',
    comparator: 'gt',
    thresholdMild: 45,
    thresholdModerate: 55,
    thresholdSevere: 65,
    unit: '°',
    affectedJoints: ['lumbar_spine', 'pelvis'],
    clinical: 'Increased facet loading and spondylolisthesis risk',
    corrective: 'Core stabilization, gluteal activation, hip flexor lengthening',
  },
  {
    id: 'scoliosis',
    label: 'Scoliotic Curve',
    category: 'alignment',
    enabled: true,
    parameter: 'spine.scoliosis',
    comparator: 'abs_gt',
    thresholdMild: 10,
    thresholdModerate: 20,
    thresholdSevere: 35,
    unit: '°',
    affectedJoints: ['thoracic_spine', 'lumbar_spine', 'pelvis'],
    clinical: 'Asymmetric spinal loading, rotational component affects rib cage and respiration',
    corrective: 'Schroth-method exercises, asymmetric strengthening, postural awareness',
  },
  {
    id: 'forward_head',
    label: 'Forward Head Posture',
    category: 'alignment',
    enabled: true,
    parameter: 'spine.forwardHead',
    comparator: 'gt',
    thresholdMild: 15,
    thresholdModerate: 25,
    thresholdSevere: 40,
    unit: 'mm',
    affectedJoints: ['cervical_spine', 'thoracic_spine'],
    clinical: 'Increased cervical extensor loading, suboccipital tightness, potential cervicogenic headache',
    corrective: 'Chin tucks, deep neck flexor strengthening, thoracic extension mobilization',
  },
  {
    id: 'pelvic_obliquity',
    label: 'Pelvic Obliquity',
    category: 'alignment',
    enabled: true,
    parameter: 'pelvis.obliquity',
    comparator: 'abs_gt',
    thresholdMild: 5,
    thresholdModerate: 10,
    thresholdSevere: 15,
    unit: '°',
    affectedJoints: ['pelvis', 'hip', 'lumbar_spine'],
    clinical: 'Functional leg length discrepancy, asymmetric hip loading',
    corrective: 'Hip abductor strengthening, pelvic alignment training, assess for true LLD',
  },
  {
    id: 'knee_valgus_left',
    label: 'Left Knee Valgus',
    category: 'alignment',
    enabled: true,
    parameter: 'leftKnee.varus',
    comparator: 'lt',
    thresholdMild: -5,
    thresholdModerate: -10,
    thresholdSevere: -18,
    unit: '°',
    affectedJoints: ['left_knee', 'left_hip'],
    clinical: 'Increased medial compartment loading, ACL strain risk',
    corrective: 'Hip abductor/external rotator strengthening, neuromuscular knee control training',
  },
  {
    id: 'knee_valgus_right',
    label: 'Right Knee Valgus',
    category: 'alignment',
    enabled: true,
    parameter: 'rightKnee.varus',
    comparator: 'lt',
    thresholdMild: -5,
    thresholdModerate: -10,
    thresholdSevere: -18,
    unit: '°',
    affectedJoints: ['right_knee', 'right_hip'],
    clinical: 'Increased medial compartment loading, ACL strain risk',
    corrective: 'Hip abductor/external rotator strengthening, neuromuscular knee control training',
  },
  {
    id: 'knee_recurvatum_left',
    label: 'Left Knee Hyperextension',
    category: 'stability',
    enabled: true,
    parameter: 'leftKnee.recurvatum',
    comparator: 'gt',
    thresholdMild: 5,
    thresholdModerate: 10,
    thresholdSevere: 15,
    unit: '°',
    affectedJoints: ['left_knee'],
    clinical: 'Posterior capsule stress, hamstring/popliteus insufficiency',
    corrective: 'Quadriceps/hamstring co-contraction training, proprioception exercises',
  },
  {
    id: 'knee_recurvatum_right',
    label: 'Right Knee Hyperextension',
    category: 'stability',
    enabled: true,
    parameter: 'rightKnee.recurvatum',
    comparator: 'gt',
    thresholdMild: 5,
    thresholdModerate: 10,
    thresholdSevere: 15,
    unit: '°',
    affectedJoints: ['right_knee'],
    clinical: 'Posterior capsule stress, hamstring/popliteus insufficiency',
    corrective: 'Quadriceps/hamstring co-contraction training, proprioception exercises',
  },
  {
    id: 'ankle_dorsiflexion_deficit_left',
    label: 'Left Ankle Dorsiflexion Deficit',
    category: 'mobility',
    enabled: true,
    parameter: 'leftAnkle.dorsiflexion',
    comparator: 'lt',
    thresholdMild: 10,
    thresholdModerate: 5,
    thresholdSevere: 0,
    unit: '°',
    affectedJoints: ['left_ankle', 'left_knee'],
    clinical: 'Compensatory knee valgus, early heel rise during squat, altered gait',
    corrective: 'Gastrocnemius/soleus stretching, ankle joint mobilization, heel cord flexibility',
  },
  {
    id: 'ankle_dorsiflexion_deficit_right',
    label: 'Right Ankle Dorsiflexion Deficit',
    category: 'mobility',
    enabled: true,
    parameter: 'rightAnkle.dorsiflexion',
    comparator: 'lt',
    thresholdMild: 10,
    thresholdModerate: 5,
    thresholdSevere: 0,
    unit: '°',
    affectedJoints: ['right_ankle', 'right_knee'],
    clinical: 'Compensatory knee valgus, early heel rise during squat, altered gait',
    corrective: 'Gastrocnemius/soleus stretching, ankle joint mobilization, heel cord flexibility',
  },
  {
    id: 'excessive_foot_pronation_left',
    label: 'Left Foot Excessive Pronation',
    category: 'alignment',
    enabled: true,
    parameter: 'leftAnkle.eversion',
    comparator: 'gt',
    thresholdMild: 8,
    thresholdModerate: 14,
    thresholdSevere: 20,
    unit: '°',
    affectedJoints: ['left_ankle', 'left_knee', 'left_hip'],
    clinical: 'Tibial internal rotation, knee valgus stress propagation upward',
    corrective: 'Arch strengthening (short foot exercise), foot orthosis consideration',
  },
  {
    id: 'excessive_foot_pronation_right',
    label: 'Right Foot Excessive Pronation',
    category: 'alignment',
    enabled: true,
    parameter: 'rightAnkle.eversion',
    comparator: 'gt',
    thresholdMild: 8,
    thresholdModerate: 14,
    thresholdSevere: 20,
    unit: '°',
    affectedJoints: ['right_ankle', 'right_knee', 'right_hip'],
    clinical: 'Tibial internal rotation, knee valgus stress propagation upward',
    corrective: 'Arch strengthening (short foot exercise), foot orthosis consideration',
  },
  {
    id: 'hip_flexion_contracture_left',
    label: 'Left Hip Flexion Contracture',
    category: 'mobility',
    enabled: true,
    parameter: 'leftHip.flexion',
    comparator: 'gt',
    thresholdMild: 15,
    thresholdModerate: 25,
    thresholdSevere: 35,
    unit: '°',
    affectedJoints: ['left_hip', 'lumbar_spine'],
    clinical: 'Compensatory lumbar lordosis, altered gait mechanics',
    corrective: 'Hip flexor stretching (Thomas position), prone hip extension activation',
  },
  {
    id: 'hip_flexion_contracture_right',
    label: 'Right Hip Flexion Contracture',
    category: 'mobility',
    enabled: true,
    parameter: 'rightHip.flexion',
    comparator: 'gt',
    thresholdMild: 15,
    thresholdModerate: 25,
    thresholdSevere: 35,
    unit: '°',
    affectedJoints: ['right_hip', 'lumbar_spine'],
    clinical: 'Compensatory lumbar lordosis, altered gait mechanics',
    corrective: 'Hip flexor stretching (Thomas position), prone hip extension activation',
  },
  {
    id: 'scapular_winging_left',
    label: 'Left Scapular Winging',
    category: 'stability',
    enabled: true,
    parameter: 'leftScapula.winging',
    comparator: 'gt',
    thresholdMild: 5,
    thresholdModerate: 10,
    thresholdSevere: 18,
    unit: '°',
    affectedJoints: ['left_scapula', 'left_shoulder'],
    clinical: 'Serratus anterior weakness, impaired scapulohumeral rhythm',
    corrective: 'Serratus anterior activation (wall slides, push-up plus), scapular stabilization',
  },
  {
    id: 'scapular_winging_right',
    label: 'Right Scapular Winging',
    category: 'stability',
    enabled: true,
    parameter: 'rightScapula.winging',
    comparator: 'gt',
    thresholdMild: 5,
    thresholdModerate: 10,
    thresholdSevere: 18,
    unit: '°',
    affectedJoints: ['right_scapula', 'right_shoulder'],
    clinical: 'Serratus anterior weakness, impaired scapulohumeral rhythm',
    corrective: 'Serratus anterior activation (wall slides, push-up plus), scapular stabilization',
  },
  {
    id: 'weight_distribution_asymmetry',
    label: 'Weight Distribution Asymmetry',
    category: 'loading',
    enabled: true,
    parameter: '_computed.weightAsymmetryPct',
    comparator: 'gt',
    thresholdMild: 8,
    thresholdModerate: 15,
    thresholdSevere: 25,
    unit: '%',
    affectedJoints: ['pelvis', 'hip', 'knee', 'ankle'],
    clinical: 'Unilateral overloading, increased joint degeneration risk on loaded side',
    corrective: 'Weight shift awareness training, balance board exercises, assess for pain avoidance',
  },
  {
    id: 'high_lumbar_compression',
    label: 'Elevated Lumbar Compression',
    category: 'loading',
    enabled: true,
    parameter: '_computed.lumbarCompressionBW',
    comparator: 'gt',
    thresholdMild: 1.5,
    thresholdModerate: 2.5,
    thresholdSevere: 4.0,
    unit: 'BW',
    affectedJoints: ['lumbar_spine'],
    clinical: 'Disc degeneration risk, facet overload, stenosis aggravation',
    corrective: 'Load management, ergonomic education, core bracing technique',
  },
];

export { DEFAULT_FAULT_RULES };

function resolveParam(config: Record<string, any>, path: string): number | undefined {
  const parts = path.split('.');
  let current: any = config;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'number' ? current : undefined;
}

function evaluateFaultRule(
  rule: FaultRuleConfig,
  config: Record<string, any>,
  computed: Record<string, number>
): BiomechanicalFault | null {
  if (!rule.enabled) return null;

  let value: number | undefined;
  if (rule.parameter.startsWith('_computed.')) {
    value = computed[rule.parameter.replace('_computed.', '')];
  } else {
    value = resolveParam(config, rule.parameter);
  }
  if (value === undefined) return null;

  const testValue = rule.comparator === 'abs_gt' ? Math.abs(value) : value;
  let severity: Severity | null = null;

  if (rule.comparator === 'gt' || rule.comparator === 'abs_gt') {
    if (testValue >= rule.thresholdSevere) severity = 'severe';
    else if (testValue >= rule.thresholdModerate) severity = 'moderate';
    else if (testValue >= rule.thresholdMild) severity = 'mild';
  } else if (rule.comparator === 'lt') {
    if (testValue <= rule.thresholdSevere) severity = 'severe';
    else if (testValue <= rule.thresholdModerate) severity = 'moderate';
    else if (testValue <= rule.thresholdMild) severity = 'mild';
  }

  if (!severity) return null;

  const threshold = severity === 'severe' ? rule.thresholdSevere
    : severity === 'moderate' ? rule.thresholdModerate
    : rule.thresholdMild;

  const confidence = severity === 'severe' ? 0.95
    : severity === 'moderate' ? 0.8
    : 0.65;

  return {
    id: rule.id,
    label: rule.label,
    category: rule.category,
    severity,
    confidence,
    measuredValue: value,
    threshold: Math.abs(threshold),
    unit: rule.unit,
    affectedJoints: rule.affectedJoints,
    clinical: rule.clinical,
    corrective: rule.corrective,
  };
}

function buildForceOutput(forceResult: ForceAnalysisResult, bodyWeightKg: number): ForceOutput {
  const g = 9.81;
  const joints: UnifiedJointForce[] = forceResult.joints.map(j => ({
    joint: j.label,
    compressionBW: j.compression,
    shearBW: j.shear,
    tensionBW: j.tension,
    totalBW: j.totalForce,
    forceN: Math.round(j.totalForce * bodyWeightKg * g),
    status: j.status,
    clinical: j.clinical,
  }));

  const com = forceResult.totalBodyCOM;
  const asymmetry = Math.abs(com.x);
  let clinical = 'Symmetrical weight distribution';
  if (asymmetry > 3) clinical = `Significant ${com.x > 0 ? 'right' : 'left'}-side loading`;
  else if (asymmetry > 1) clinical = `Mild ${com.x > 0 ? 'right' : 'left'}-side predominance`;

  const weightDistribution: WeightDistributionData = {
    leftPct: Math.round(Math.max(10, Math.min(90, 50 + com.x * -5))),
    rightPct: Math.round(Math.max(10, Math.min(90, 50 + com.x * 5))),
    anteriorPosteriorShift: com.y,
    comX: com.x,
    comY: com.y,
    clinical,
  };

  const peak = joints.reduce((best, j) => j.totalBW > best.totalBW ? j : best, joints[0]);

  return {
    joints,
    weightDistribution,
    peakJoint: peak?.joint ?? '',
    peakForceBW: peak?.totalBW ?? 0,
  };
}

function buildPostureOutput(
  forceResult: ForceAnalysisResult,
  config: Record<string, any>,
  pathologyResult: PathologyCompensationResult | null
): PostureOutput {
  const deviations: PosturalDeviation[] = [];

  const spine = config.spine ?? {};
  const pelvis = config.pelvis ?? {};

  if (spine.thoracicKyphosis && Math.abs(spine.thoracicKyphosis) > 35) {
    deviations.push({
      pattern: 'Increased Thoracic Kyphosis',
      region: 'Thoracic Spine',
      severity: spine.thoracicKyphosis > 55 ? 'severe' : spine.thoracicKyphosis > 45 ? 'moderate' : 'mild',
      angleDeg: spine.thoracicKyphosis,
      clinical: 'Rounded upper back posture, may contribute to shoulder impingement and cervicogenic headache',
    });
  }
  if (spine.lumbarLordosis && Math.abs(spine.lumbarLordosis) > 40) {
    deviations.push({
      pattern: 'Increased Lumbar Lordosis',
      region: 'Lumbar Spine',
      severity: spine.lumbarLordosis > 60 ? 'severe' : spine.lumbarLordosis > 50 ? 'moderate' : 'mild',
      angleDeg: spine.lumbarLordosis,
      clinical: 'Increased facet joint loading and anterior pelvic tilt compensation',
    });
  }
  if (spine.scoliosis && Math.abs(spine.scoliosis) > 8) {
    deviations.push({
      pattern: spine.scoliosis > 0 ? 'Right Convex Scoliosis' : 'Left Convex Scoliosis',
      region: 'Spine',
      severity: Math.abs(spine.scoliosis) > 30 ? 'severe' : Math.abs(spine.scoliosis) > 18 ? 'moderate' : 'mild',
      angleDeg: Math.abs(spine.scoliosis),
      clinical: 'Asymmetric spinal loading with rotational component',
    });
  }
  if (spine.forwardHead && spine.forwardHead > 12) {
    deviations.push({
      pattern: 'Forward Head Posture',
      region: 'Cervical Spine',
      severity: spine.forwardHead > 35 ? 'severe' : spine.forwardHead > 22 ? 'moderate' : 'mild',
      angleDeg: spine.forwardHead,
      clinical: 'Increased cervical extensor demand, suboccipital compression',
    });
  }
  if (pelvis.tilt && Math.abs(pelvis.tilt) > 10) {
    const isAnterior = pelvis.tilt > 0;
    deviations.push({
      pattern: isAnterior ? 'Anterior Pelvic Tilt' : 'Posterior Pelvic Tilt',
      region: 'Pelvis',
      severity: Math.abs(pelvis.tilt) > 22 ? 'severe' : Math.abs(pelvis.tilt) > 16 ? 'moderate' : 'mild',
      angleDeg: Math.abs(pelvis.tilt),
      clinical: isAnterior
        ? 'Hip flexor tightness pattern, increased lumbar extension'
        : 'Flattened lumbar curve, hamstring dominance',
    });
  }
  if (pelvis.obliquity && Math.abs(pelvis.obliquity) > 4) {
    deviations.push({
      pattern: 'Pelvic Obliquity',
      region: 'Pelvis',
      severity: Math.abs(pelvis.obliquity) > 12 ? 'severe' : Math.abs(pelvis.obliquity) > 8 ? 'moderate' : 'mild',
      angleDeg: Math.abs(pelvis.obliquity),
      clinical: 'Functional leg length discrepancy pattern, asymmetric hip loading',
    });
  }

  for (const side of ['left', 'right'] as const) {
    const knee = config[`${side}Knee`];
    if (knee?.varus && knee.varus < -4) {
      deviations.push({
        pattern: `${side === 'left' ? 'Left' : 'Right'} Knee Valgus`,
        region: `${side === 'left' ? 'Left' : 'Right'} Knee`,
        severity: Math.abs(knee.varus) > 16 ? 'severe' : Math.abs(knee.varus) > 9 ? 'moderate' : 'mild',
        angleDeg: Math.abs(knee.varus),
        clinical: 'Medial compartment loading, ACL strain pattern',
      });
    }
    const ankle = config[`${side}Ankle`];
    if (ankle?.eversion && ankle.eversion > 7) {
      deviations.push({
        pattern: `${side === 'left' ? 'Left' : 'Right'} Foot Pronation`,
        region: `${side === 'left' ? 'Left' : 'Right'} Ankle/Foot`,
        severity: ankle.eversion > 18 ? 'severe' : ankle.eversion > 12 ? 'moderate' : 'mild',
        angleDeg: ankle.eversion,
        clinical: 'Tibial internal rotation chain, ascending kinetic influence',
      });
    }
  }

  const romRestrictions: ROMRestriction[] = [];
  if (pathologyResult) {
    for (const rom of pathologyResult.romRestrictions) {
      romRestrictions.push({
        joint: rom.joint,
        parameter: rom.parameter,
        currentDeg: rom.currentMax ?? rom.normalMax * (1 - rom.restrictionPercent / 100),
        normalDeg: rom.normalMax,
        deficitPct: rom.restrictionPercent,
        reason: rom.reason,
      });
    }
  }

  const alignmentScore = Math.max(0, Math.min(100, 100 - deviations.reduce((sum, d) => {
    const w = d.severity === 'severe' ? 18 : d.severity === 'moderate' ? 10 : 5;
    return sum + w;
  }, 0)));

  const dominantPattern = deviations.length > 0
    ? deviations.sort((a, b) => {
        const sevOrder = { severe: 3, moderate: 2, mild: 1 };
        return sevOrder[b.severity] - sevOrder[a.severity];
      })[0].pattern
    : 'Within normal limits';

  return {
    deviations,
    romRestrictions,
    overallAlignmentScore: alignmentScore,
    dominantPattern,
  };
}

function buildMuscleAsymmetryOutput(biomechResult: BiomechanicsResult | null): MuscleAsymmetryOutput {
  if (!biomechResult) {
    return { muscles: [], asymmetries: [], globalActivationScore: 50 };
  }

  const ma = biomechResult.muscleActivation;
  const muscles: MuscleStateEntry[] = [];

  const addMuscle = (name: string, activation: number) => {
    let role: MuscleStateEntry['role'] = 'normal';
    let clinical = 'Normal activation level';
    if (activation > 70) {
      role = 'overactive';
      clinical = 'Elevated activation — potential for fatigue and strain';
    } else if (activation < 15) {
      role = 'underactive';
      clinical = 'Low activation — may indicate weakness or inhibition';
    } else if (activation < 5) {
      role = 'inhibited';
      clinical = 'Minimal activation — inhibited muscle, compensatory patterns likely';
    }
    muscles.push({ muscle: name, activationPct: Math.round(activation), role, clinical });
  };

  addMuscle('Erector Spinae', ma.erectorSpinae);
  addMuscle('Rectus Abdominis', ma.rectusAbdominis);
  addMuscle('Obliques', ma.obliques);
  addMuscle('L Gluteus Maximus', ma.gluteusMaximus.left);
  addMuscle('R Gluteus Maximus', ma.gluteusMaximus.right);
  addMuscle('L Gluteus Medius', ma.gluteusMedius.left);
  addMuscle('R Gluteus Medius', ma.gluteusMedius.right);
  addMuscle('L Quadriceps', ma.quadriceps.left);
  addMuscle('R Quadriceps', ma.quadriceps.right);
  addMuscle('L Hamstrings', ma.hamstrings.left);
  addMuscle('R Hamstrings', ma.hamstrings.right);
  addMuscle('L Iliopsoas', ma.iliopsoas.left);
  addMuscle('R Iliopsoas', ma.iliopsoas.right);
  addMuscle('L Gastrocnemius', ma.gastrocnemius.left);
  addMuscle('R Gastrocnemius', ma.gastrocnemius.right);
  addMuscle('Upper Trapezius', ma.trapezius.upper);
  addMuscle('L Deltoid', ma.deltoid.left);
  addMuscle('R Deltoid', ma.deltoid.right);

  const asymmetries: AsymmetryEntry[] = [];
  const aa = biomechResult.asymmetryAnalysis;

  const addAsymmetry = (region: string, leftVal: number, rightVal: number) => {
    const diff = Math.abs(leftVal - rightVal);
    const avg = (leftVal + rightVal) / 2;
    const diffPct = avg > 0 ? (diff / avg) * 100 : 0;
    if (diffPct < 5) return;
    const severity: Severity = diffPct > 30 ? 'severe' : diffPct > 15 ? 'moderate' : 'mild';
    const dominant = leftVal > rightVal ? 'Left' : 'Right';
    asymmetries.push({
      region,
      leftValue: Math.round(leftVal),
      rightValue: Math.round(rightVal),
      differencePct: Math.round(diffPct),
      severity,
      clinical: `${dominant}-side dominant (${Math.round(diffPct)}% asymmetry)`,
    });
  };

  addAsymmetry('Gluteus Maximus', ma.gluteusMaximus.left, ma.gluteusMaximus.right);
  addAsymmetry('Gluteus Medius', ma.gluteusMedius.left, ma.gluteusMedius.right);
  addAsymmetry('Quadriceps', ma.quadriceps.left, ma.quadriceps.right);
  addAsymmetry('Hamstrings', ma.hamstrings.left, ma.hamstrings.right);
  addAsymmetry('Gastrocnemius', ma.gastrocnemius.left, ma.gastrocnemius.right);
  addAsymmetry('Iliopsoas', ma.iliopsoas.left, ma.iliopsoas.right);
  addAsymmetry('Deltoid', ma.deltoid.left, ma.deltoid.right);

  const allActivations = muscles.map(m => m.activationPct);
  const avgActivation = allActivations.reduce((a, b) => a + b, 0) / allActivations.length;
  const globalScore = Math.round(Math.min(100, avgActivation * 2));

  return {
    muscles,
    asymmetries,
    globalActivationScore: globalScore,
  };
}

function buildFaultOutput(
  config: Record<string, any>,
  forceOutput: ForceOutput,
  rules: FaultRuleConfig[]
): FaultOutput {
  const computed: Record<string, number> = {};
  computed['weightAsymmetryPct'] = Math.abs(forceOutput.weightDistribution.leftPct - 50);

  const lumbar = forceOutput.joints.find(j =>
    j.joint.toLowerCase().includes('lumbar') || j.joint.toLowerCase().includes('l3') || j.joint.toLowerCase().includes('l4')
  );
  if (lumbar) {
    computed['lumbarCompressionBW'] = lumbar.compressionBW;
  }

  const faults: BiomechanicalFault[] = [];
  for (const rule of rules) {
    const fault = evaluateFaultRule(rule, config, computed);
    if (fault) faults.push(fault);
  }

  faults.sort((a, b) => {
    const sevOrder = { severe: 3, moderate: 2, mild: 1 };
    return sevOrder[b.severity] - sevOrder[a.severity];
  });

  const categoryCount: Record<string, number> = {};
  for (const f of faults) {
    categoryCount[f.category] = (categoryCount[f.category] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

  const riskScore = Math.min(100, faults.reduce((sum, f) => {
    const w = f.severity === 'severe' ? 25 : f.severity === 'moderate' ? 15 : 7;
    return sum + w * f.confidence;
  }, 0));

  return {
    faults,
    faultCount: faults.length,
    topFaultCategory: (topCategory?.[0] as FaultCategory) ?? null,
    overallRiskScore: Math.round(riskScore),
  };
}

function buildMovementTaskOutput(
  taskId: string | undefined,
  progress: number,
  postureOutput: PostureOutput,
  forceOutput: ForceOutput,
): MovementTaskOutput | null {
  if (!taskId) return null;

  const snapshot = getMovementBiomechanics(taskId, progress);
  if (!snapshot) return null;

  const forces: MovementTaskForce[] = snapshot.forces.map(f => ({
    joint: f.joint,
    label: f.label,
    forcePercent: f.forcePercent,
    baselinePercent: f.baselinePercent,
    direction: f.direction,
  }));

  const muscles: MovementTaskMuscle[] = snapshot.muscles.map(m => ({
    muscle: m.muscle,
    activationPercent: m.activationPercent,
    role: m.role,
  }));

  const peak = forces.reduce((best, f) => f.forcePercent > best.forcePercent ? f : best, forces[0]);

  const taskFaults: MovementTaskFault[] = [];
  let faultIdx = 0;

  for (const f of forces) {
    if (f.forcePercent > 90) {
      taskFaults.push({
        id: `tf_${faultIdx++}`,
        label: `Excessive ${f.label} loading during ${snapshot.phase}`,
        severity: f.forcePercent > 100 ? 'severe' : 'moderate',
        description: `${f.label} force at ${f.forcePercent}% exceeds safe threshold during ${snapshot.phase}.`,
        affectedJoint: f.joint,
      });
    }
  }

  for (const dev of postureOutput.deviations) {
    if (dev.severity !== 'mild') {
      const relatedForce = forces.find(f =>
        f.joint.includes(dev.region) || dev.region.includes(f.joint.replace('left_', '').replace('right_', ''))
      );
      if (relatedForce) {
        taskFaults.push({
          id: `tf_${faultIdx++}`,
          label: `${dev.pattern} affecting ${taskId} mechanics`,
          severity: dev.severity,
          description: `Postural deviation (${dev.pattern}, ${dev.angleDeg}°) alters loading pattern during ${MOVEMENT_TASK_LABELS[taskId] ?? taskId}.`,
          affectedJoint: relatedForce.joint,
        });
      }
    }
  }

  if (taskId === 'single_leg_squat' || taskId === 'singleLegBalance') {
    const wd = forceOutput.weightDistribution;
    if (Math.abs(wd.leftPct - wd.rightPct) > 15) {
      taskFaults.push({
        id: `tf_${faultIdx++}`,
        label: 'Weight distribution asymmetry during single-leg task',
        severity: Math.abs(wd.leftPct - wd.rightPct) > 25 ? 'severe' : 'moderate',
        description: `L/R weight distribution ${wd.leftPct}%/${wd.rightPct}% indicates poor single-leg control.`,
        affectedJoint: 'pelvis',
      });
    }
  }

  if (taskId === 'overhead_reach') {
    for (const rom of postureOutput.romRestrictions) {
      if (rom.joint.toLowerCase().includes('shoulder') && rom.deficitPct > 15) {
        taskFaults.push({
          id: `tf_${faultIdx++}`,
          label: `Shoulder ROM restriction limits overhead reach`,
          severity: rom.deficitPct > 30 ? 'severe' : 'moderate',
          description: `${rom.joint} has ${Math.round(rom.deficitPct)}% ROM deficit affecting overhead reaching mechanics.`,
          affectedJoint: rom.joint.toLowerCase().includes('left') ? 'left_shoulder' : 'right_shoulder',
        });
      }
    }
  }

  const taskScore = Math.max(0, Math.min(100, Math.round(
    100 - taskFaults.reduce((sum, f) => sum + (f.severity === 'severe' ? 25 : f.severity === 'moderate' ? 12 : 5), 0)
  )));

  return {
    taskId,
    taskLabel: MOVEMENT_TASK_LABELS[taskId] ?? taskId,
    progress,
    phase: snapshot.phase,
    forces,
    muscles,
    peakForceJoint: peak?.joint ?? '',
    peakForcePct: peak?.forcePercent ?? 0,
    taskFaults,
    taskScore,
  };
}

function buildComparison(
  forceOutput: ForceOutput,
  previousOutput: BiomechanicsOutput | null
): ComparisonOutput | null {
  if (!previousOutput) return null;

  const entries: ComparisonEntry[] = [];

  for (const currentJoint of forceOutput.joints) {
    const prevJoint = previousOutput.forces.joints.find(j => j.joint === currentJoint.joint);
    if (!prevJoint) continue;

    const delta = currentJoint.totalBW - prevJoint.totalBW;
    const deltaPct = prevJoint.totalBW > 0 ? (delta / prevJoint.totalBW) * 100 : 0;
    if (Math.abs(deltaPct) < 3) continue;

    entries.push({
      parameter: `${currentJoint.joint} Total Force`,
      leftValue: prevJoint.totalBW,
      rightValue: currentJoint.totalBW,
      delta: Math.round(delta * 100) / 100,
      deltaPct: Math.round(deltaPct),
      significance: Math.abs(deltaPct) > 30 ? 'significant' : Math.abs(deltaPct) > 10 ? 'notable' : 'negligible',
    });
  }

  const prevWD = previousOutput.forces.weightDistribution;
  const curWD = forceOutput.weightDistribution;
  const wdDelta = curWD.leftPct - prevWD.leftPct;
  if (Math.abs(wdDelta) > 2) {
    entries.push({
      parameter: 'Weight Distribution (L%)',
      leftValue: prevWD.leftPct,
      rightValue: curWD.leftPct,
      delta: wdDelta,
      deltaPct: Math.round((wdDelta / prevWD.leftPct) * 100),
      significance: Math.abs(wdDelta) > 10 ? 'significant' : Math.abs(wdDelta) > 5 ? 'notable' : 'negligible',
    });
  }

  const sigCount = entries.filter(e => e.significance === 'significant').length;
  const notableCount = entries.filter(e => e.significance === 'notable').length;
  let summary = 'No significant changes detected.';
  if (sigCount > 0) {
    summary = `${sigCount} significant change(s) detected — review force redistribution.`;
  } else if (notableCount > 0) {
    summary = `${notableCount} notable change(s) — trending towards clinical significance.`;
  }

  return {
    mode: 'before_after',
    entries,
    summary,
  };
}

const JOINT_ROM_NORMS: Record<string, { normal: [number, number]; plane: 'sagittal' | 'frontal' | 'transverse' }> = {
  left_hip: { normal: [0, 120], plane: 'sagittal' },
  right_hip: { normal: [0, 120], plane: 'sagittal' },
  left_knee: { normal: [0, 140], plane: 'sagittal' },
  right_knee: { normal: [0, 140], plane: 'sagittal' },
  left_ankle: { normal: [-20, 50], plane: 'sagittal' },
  right_ankle: { normal: [-20, 50], plane: 'sagittal' },
  left_shoulder: { normal: [0, 180], plane: 'sagittal' },
  right_shoulder: { normal: [0, 180], plane: 'sagittal' },
  lumbar_spine: { normal: [-30, 60], plane: 'sagittal' },
  thoracic_spine: { normal: [-5, 40], plane: 'sagittal' },
  cervical_spine: { normal: [-60, 60], plane: 'sagittal' },
  pelvis: { normal: [-15, 15], plane: 'frontal' },
};

function buildJointKinematics(
  modelConfig: Record<string, number>,
  romRestrictions: ROMRestriction[],
): JointKinematicsOutput {
  const joints: JointKinematicsEntry[] = [];
  const restrictedJoints: string[] = [];
  const hypermobileJoints: string[] = [];

  for (const [joint, norms] of Object.entries(JOINT_ROM_NORMS)) {
    const restriction = romRestrictions.find(r => r.joint.toLowerCase().includes(joint.replace('left_', '').replace('right_', '')));
    const restrictionPct = restriction ? restriction.deficitPct : 0;

    const normalRange = norms.normal;
    const midAngle = (normalRange[0] + normalRange[1]) / 2;
    const totalROM = normalRange[1] - normalRange[0];
    const effectiveROM = totalROM * (1 - restrictionPct / 100);

    const side = joint.startsWith('left_') ? 'l_' : joint.startsWith('right_') ? 'r_' : '';
    const bonePart = joint.replace('left_', '').replace('right_', '');

    let currentAngle = midAngle;
    const sliderKey = `${side}${bonePart}_flexion`;
    const altKey = `${side}${bonePart}Flex`;
    if (modelConfig[sliderKey] !== undefined) {
      currentAngle = modelConfig[sliderKey];
    } else if (modelConfig[altKey] !== undefined) {
      currentAngle = modelConfig[altKey];
    }

    const withinNormal = currentAngle >= normalRange[0] && currentAngle <= normalRange[1];

    let clinical = 'Within normal range.';
    if (restrictionPct > 20) {
      clinical = `${Math.round(restrictionPct)}% ROM deficit — likely capsular or muscular restriction.`;
      restrictedJoints.push(joint);
    } else if (restrictionPct > 10) {
      clinical = `Minor ROM limitation (${Math.round(restrictionPct)}% deficit).`;
    }

    if (currentAngle > normalRange[1] + 10) {
      clinical = 'Hypermobile — potential ligamentous laxity.';
      hypermobileJoints.push(joint);
    }

    joints.push({
      joint,
      flexionDeg: Math.round(normalRange[0] + effectiveROM * 0.1),
      extensionDeg: Math.round(normalRange[0] + effectiveROM),
      currentAngleDeg: Math.round(currentAngle),
      normalRangeDeg: normalRange,
      withinNormal,
      plane: norms.plane,
      clinical,
    });
  }

  const totalMobilityScore = Math.max(0, Math.min(100, Math.round(
    100 - (restrictedJoints.length * 12) + (hypermobileJoints.length * -5)
  )));

  return { joints, totalMobilityScore, restrictedJoints, hypermobileJoints };
}

function buildCompensationPatterns(
  posture: PostureOutput,
  muscleAsymmetry: MuscleAsymmetryOutput,
  faults: FaultOutput,
  pathologyResult: PathologyCompensationResult | null,
): CompensationOutput {
  const patterns: CompensationPattern[] = [];
  let nextId = 1;

  if (pathologyResult) {
    for (const finding of pathologyResult.clinicalFindings) {
      const severityVal: Severity = finding.severity === 'severe' ? 'severe' : finding.severity === 'moderate' ? 'moderate' : 'mild';
      patterns.push({
        id: `comp_${nextId++}`,
        label: finding.title,
        primaryRegion: finding.muscleSource,
        compensatingRegion: 'adjacent structures',
        mechanism: finding.description,
        severity: severityVal,
        additionalLoadPct: severityVal === 'severe' ? 30 : severityVal === 'moderate' ? 15 : 5,
        affectedMovements: ['squat', 'walk', 'lunge'],
        clinical: finding.description,
        corrective: `Address ${finding.muscleSource} ${finding.pathology}. Strengthen stabilizers.`,
      });
    }
    for (const [muscleId, override] of Object.entries(pathologyResult.compensatoryOverrides)) {
      const muscleName = muscleId.replace(/_/g, ' ');
      const activationDelta = override.activationOffset ?? 0;
      if (Math.abs(activationDelta) > 10) {
        patterns.push({
          id: `comp_${nextId++}`,
          label: `${muscleName} compensatory ${activationDelta > 0 ? 'overactivation' : 'inhibition'}`,
          primaryRegion: muscleName,
          compensatingRegion: muscleName,
          mechanism: activationDelta > 0 ? 'synergist overload' : 'reflex inhibition',
          severity: Math.abs(activationDelta) > 25 ? 'severe' : Math.abs(activationDelta) > 15 ? 'moderate' : 'mild',
          additionalLoadPct: Math.abs(activationDelta),
          affectedMovements: ['squat', 'walk', 'lunge'],
          clinical: `${muscleName} shows ${Math.abs(activationDelta)}% activation change due to compensatory pattern.`,
          corrective: `Address underlying pathology driving ${muscleName} compensation.`,
        });
      }
    }
  }

  for (const asym of muscleAsymmetry.asymmetries) {
    if (asym.severity !== 'mild') {
      const strongSide = asym.leftValue > asym.rightValue ? 'left' : 'right';
      const weakSide = strongSide === 'left' ? 'right' : 'left';
      patterns.push({
        id: `comp_${nextId++}`,
        label: `${asym.region} lateral shift compensation`,
        primaryRegion: `${weakSide} ${asym.region}`,
        compensatingRegion: `${strongSide} ${asym.region}`,
        mechanism: 'contralateral overload',
        severity: asym.severity,
        additionalLoadPct: Math.round(asym.differencePct / 2),
        affectedMovements: ['walk', 'single_leg_squat', 'lunge'],
        clinical: `${Math.round(asym.differencePct)}% ${asym.region} asymmetry causes ${strongSide}-side overloading.`,
        corrective: `Targeted ${weakSide}-side strengthening for ${asym.region}. Single-leg exercises.`,
      });
    }
  }

  for (const dev of posture.deviations) {
    if (dev.severity !== 'mild') {
      const compRegion = dev.region === 'lumbar' ? 'thoracic spine' :
        dev.region === 'thoracic' ? 'cervical spine' :
        dev.region === 'pelvis' ? 'lumbar spine' :
        dev.region === 'cervical' ? 'thoracic spine' : 'adjacent region';
      patterns.push({
        id: `comp_${nextId++}`,
        label: `${dev.pattern} compensation chain`,
        primaryRegion: dev.region,
        compensatingRegion: compRegion,
        mechanism: 'postural compensation',
        severity: dev.severity,
        additionalLoadPct: Math.round(dev.angleDeg * 0.8),
        affectedMovements: ['walk', 'squat', 'overhead_reach'],
        clinical: `${dev.pattern} (${dev.angleDeg}°) drives compensatory loading at ${compRegion}.`,
        corrective: dev.clinical,
      });
    }
  }

  const totalCompensationScore = Math.max(0, Math.min(100,
    patterns.reduce((sum, p) => sum + (p.severity === 'severe' ? 25 : p.severity === 'moderate' ? 15 : 5), 0)
  ));

  const primaryDrivers = [...new Set(patterns.filter(p => p.severity === 'severe' || p.severity === 'moderate').map(p => p.primaryRegion))];

  const cascadeChains: Array<{ chain: string[]; severity: Severity }> = [];
  const driverPatterns = patterns.filter(p => p.severity !== 'mild');
  for (const dp of driverPatterns) {
    const downstream = patterns.filter(p => p.primaryRegion === dp.compensatingRegion);
    if (downstream.length > 0) {
      cascadeChains.push({
        chain: [dp.primaryRegion, dp.compensatingRegion, ...downstream.map(d => d.compensatingRegion)],
        severity: dp.severity,
      });
    }
  }

  return { patterns, totalCompensationScore, primaryDrivers, cascadeChains };
}

function buildLeftRightComparison(forces: ForceOutput, muscleAsym: MuscleAsymmetryOutput): ComparisonOutput {
  const entries: ComparisonEntry[] = [];

  const leftJoints = forces.joints.filter(j => j.joint.startsWith('left_'));
  for (const lj of leftJoints) {
    const rjName = lj.joint.replace('left_', 'right_');
    const rj = forces.joints.find(j => j.joint === rjName);
    if (!rj) continue;

    const delta = lj.totalBW - rj.totalBW;
    const avg = (lj.totalBW + rj.totalBW) / 2;
    const deltaPct = avg > 0 ? (delta / avg) * 100 : 0;
    if (Math.abs(deltaPct) < 2) continue;

    entries.push({
      parameter: `${lj.joint.replace('left_', '')} Force (BW)`,
      leftValue: lj.totalBW,
      rightValue: rj.totalBW,
      delta: Math.round(delta * 100) / 100,
      deltaPct: Math.round(deltaPct),
      significance: Math.abs(deltaPct) > 25 ? 'significant' : Math.abs(deltaPct) > 10 ? 'notable' : 'negligible',
    });
  }

  for (const asym of muscleAsym.asymmetries) {
    entries.push({
      parameter: `${asym.region} Activation`,
      leftValue: asym.leftValue,
      rightValue: asym.rightValue,
      delta: Math.round((asym.leftValue - asym.rightValue) * 100) / 100,
      deltaPct: Math.round(asym.differencePct),
      significance: asym.severity === 'severe' ? 'significant' : asym.severity === 'moderate' ? 'notable' : 'negligible',
    });
  }

  const sigCount = entries.filter(e => e.significance === 'significant').length;
  const notableCount = entries.filter(e => e.significance === 'notable').length;
  let summary = 'Bilateral symmetry within normal limits.';
  if (sigCount > 0) {
    summary = `${sigCount} significant left-right asymmetry(ies) detected.`;
  } else if (notableCount > 0) {
    summary = `${notableCount} notable bilateral difference(s).`;
  }

  return { mode: 'left_right', entries, summary };
}

function buildClinicalSummary(
  faults: FaultOutput,
  posture: PostureOutput,
  forces: ForceOutput,
  muscleAsym: MuscleAsymmetryOutput
): string {
  const parts: string[] = [];

  if (faults.faultCount === 0) {
    parts.push('No biomechanical faults detected.');
  } else {
    const severe = faults.faults.filter(f => f.severity === 'severe');
    const moderate = faults.faults.filter(f => f.severity === 'moderate');
    if (severe.length > 0) {
      parts.push(`${severe.length} severe fault(s): ${severe.map(f => f.label).join(', ')}.`);
    }
    if (moderate.length > 0) {
      parts.push(`${moderate.length} moderate fault(s): ${moderate.map(f => f.label).join(', ')}.`);
    }
  }

  if (posture.dominantPattern !== 'Within normal limits') {
    parts.push(`Dominant postural pattern: ${posture.dominantPattern}.`);
  }

  if (forces.peakForceBW > 2.5) {
    parts.push(`Peak loading at ${forces.peakJoint} (${forces.peakForceBW.toFixed(1)} BW).`);
  }

  const severeAsym = muscleAsym.asymmetries.filter(a => a.severity === 'severe');
  if (severeAsym.length > 0) {
    parts.push(`Significant muscle asymmetry: ${severeAsym.map(a => a.region).join(', ')}.`);
  }

  return parts.join(' ') || 'Biomechanical status within normal limits.';
}

export function computeUnifiedBiomechanics(input: UnifiedBiomechanicsInput): BiomechanicsOutput {
  const {
    modelConfig,
    heightCm,
    weightKg,
    muscleOverrides,
    movementTaskId,
    movementProgress = 0.5,
    faultRuleOverrides,
    previousOutput,
  } = input;

  const forceResult = calculatePosturalForces(modelConfig);

  let biomechResult: BiomechanicsResult | null = null;
  try {
    biomechResult = calculateFullBiomechanics(heightCm, weightKg, modelConfig);
  } catch {
    biomechResult = null;
  }

  let pathologyResult: PathologyCompensationResult | null = null;
  if (muscleOverrides && Object.keys(muscleOverrides).length > 0) {
    try {
      pathologyResult = computePathologyCompensation(muscleOverrides);
    } catch {
      pathologyResult = null;
    }
  }

  const forces = buildForceOutput(forceResult, weightKg);
  const posture = buildPostureOutput(forceResult, modelConfig, pathologyResult);
  const muscleAsymmetry = buildMuscleAsymmetryOutput(biomechResult);
  const jointKinematics = buildJointKinematics(modelConfig, posture.romRestrictions);
  const compensationPatterns = buildCompensationPatterns(posture, muscleAsymmetry, buildFaultOutput(modelConfig, forces, DEFAULT_FAULT_RULES), pathologyResult);

  let rules = [...DEFAULT_FAULT_RULES];
  if (faultRuleOverrides) {
    for (const override of faultRuleOverrides) {
      const idx = rules.findIndex(r => r.id === override.id);
      if (idx >= 0) {
        rules[idx] = { ...rules[idx], ...override };
      }
    }
  }
  const faults = buildFaultOutput(modelConfig, forces, rules);

  const movementTask = buildMovementTaskOutput(movementTaskId, movementProgress, posture, forces);
  const beforeAfterComparison = buildComparison(forces, previousOutput);
  const leftRightComparison = buildLeftRightComparison(forces, muscleAsymmetry);
  const comparison = previousOutput ? beforeAfterComparison : leftRightComparison;

  const qualityScore = Math.max(0, Math.min(100, Math.round(
    (posture.overallAlignmentScore * 0.25) +
    ((100 - faults.overallRiskScore) * 0.25) +
    (muscleAsymmetry.globalActivationScore * 0.15) +
    (jointKinematics.totalMobilityScore * 0.15) +
    (Math.max(0, 100 - compensationPatterns.totalCompensationScore) * 0.1) +
    ((biomechResult?.movementQuality.overallScore ?? 50) * 0.1)
  )));

  const clinicalSummary = buildClinicalSummary(faults, posture, forces, muscleAsymmetry);

  return {
    timestamp: Date.now(),
    forces,
    posture,
    muscleAsymmetry,
    jointKinematics,
    compensationPatterns,
    faults,
    movementTask,
    comparison,
    qualityScore,
    clinicalSummary,
  };
}
