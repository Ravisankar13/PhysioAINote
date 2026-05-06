import type { MuscleOverride, PathologyType } from './muscleBiomechanicsEngine';
import { getMuscleToGroupMap } from './muscleBiomechanicsEngine';

export interface SynergistCompensation {
  muscleGroupId: string;
  tensionIncrease: number;
  activationIncrease: number;
  reason: string;
}

export interface RomRestriction {
  joint: string;
  parameter: string;
  restrictionPercent: number;
  reason: string;
}

export interface PosturalDeviation {
  joint: string;
  parameter: string;
  deviationDegrees: number;
  reason: string;
}

export interface ClinicalFinding {
  severity: 'mild' | 'moderate' | 'severe';
  title: string;
  description: string;
  muscleSource: string;
  pathology: PathologyType;
  /** Optional enrichment populated by the Compensation Re-Education engine
   *  (see `client/src/lib/compensationReEducation.ts`). The grouped
   *  `enrichment` object and the top-level fields are written together so
   *  downstream consumers can read either form. */
  enrichment?: import('./compensationReEducation').CompensationEnrichment;
  driver?: import('./compensationReEducation').CompensationDriver;
  drivers?: import('./compensationReEducation').CompensationDriver[];
  verdict?: import('./compensationReEducation').CompensationVerdict;
  cost?: import('./compensationLibrary').CompensationCostProfile;
  betterPatternId?: string | null;
  retrainingPlanId?: string | null;
}

export interface PathologyCompensationResult {
  compensatoryOverrides: Record<string, Partial<MuscleOverride>>;
  romRestrictions: RomRestriction[];
  posturalDeviations: PosturalDeviation[];
  clinicalFindings: ClinicalFinding[];
}

export interface PainfulArc {
  joint: string;
  movement: string;
  startAngle: number;
  endAngle: number;
  painIntensity: number;
}

interface CompensationPattern {
  pathologyTypes: PathologyType[];
  synergists: SynergistCompensation[];
  romRestrictions: RomRestriction[];
  posturalDeviations: PosturalDeviation[];
  clinicalTitle: string;
  clinicalDescription: string;
  severity: 'mild' | 'moderate' | 'severe';
  painfulArcs?: PainfulArc[];
  activeStrengthReductionPercent?: number;
  painInhibitionFactor?: number;
}

export interface ActiveCapacityRow {
  joint: string;
  movement: string;
  passiveRomMin: number;
  passiveRomMax: number;
  activeRomMin: number;
  activeRomMax: number;
  painfulArc: {
    start: number;
    end: number;
    intensity: number;
    direction?: 'ascending' | 'descending' | 'either';
    loadingMode?: 'concentric' | 'eccentric' | 'isometric' | 'any';
    label?: string;
  } | null;
  activeStrengthPct: number;
  painInhibitionFactor: number;
  source: 'pathology-baseline' | 'ai' | 'manual';
}

export type ActiveCapacityProfile = Record<string, ActiveCapacityRow>;

const PATHOLOGY_COMPENSATION_MAP: Record<string, CompensationPattern[]> = {
  deltoid_l: [
    {
      pathologyTypes: ['strain', 'weakness', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'scapula_l', tensionIncrease: 20, activationIncrease: 15, reason: 'Upper trapezius compensates for deltoid dysfunction — shoulder hiking' },
        { muscleGroupId: 'chest', tensionIncrease: 10, activationIncrease: 8, reason: 'Pectoralis assists shoulder flexion when deltoid is compromised' },
        { muscleGroupId: 'bicep_l', tensionIncrease: 8, activationIncrease: 10, reason: 'Biceps long head assists shoulder flexion' },
      ],
      romRestrictions: [
        { joint: 'leftShoulder', parameter: 'abduction', restrictionPercent: 35, reason: 'Deltoid tear limits active abduction' },
        { joint: 'leftShoulder', parameter: 'flexion', restrictionPercent: 25, reason: 'Deltoid dysfunction limits active shoulder flexion' },
      ],
      posturalDeviations: [
        { joint: 'leftShoulder', parameter: 'elevation', deviationDegrees: 5, reason: 'Compensatory shoulder hiking via upper trapezius' },
      ],
      clinicalTitle: 'Left Deltoid Dysfunction',
      clinicalDescription: 'Deltoid pathology causes upper trapezius to compensate with shoulder hiking. Pectoralis and biceps long head assist flexion. Active abduction and flexion ROM reduced.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftShoulder', parameter: 'abduction', restrictionPercent: 20, reason: 'Deltoid spasm/fibrosis restricts shoulder abduction' },
        { joint: 'leftShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Deltoid stiffness limits shoulder flexion arc' },
      ],
      posturalDeviations: [
        { joint: 'leftShoulder', parameter: 'abduction', deviationDegrees: 3, reason: 'Deltoid shortening holds arm slightly abducted' },
      ],
      clinicalTitle: 'Left Deltoid Stiffness',
      clinicalDescription: 'Deltoid spasm or fibrosis restricts shoulder mobility. Arm may rest slightly abducted.',
      severity: 'mild',
    },
  ],
  deltoid_r: [
    {
      pathologyTypes: ['strain', 'weakness', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'scapula_r', tensionIncrease: 20, activationIncrease: 15, reason: 'Upper trapezius compensates for deltoid dysfunction — shoulder hiking' },
        { muscleGroupId: 'chest', tensionIncrease: 10, activationIncrease: 8, reason: 'Pectoralis assists shoulder flexion when deltoid is compromised' },
        { muscleGroupId: 'bicep_r', tensionIncrease: 8, activationIncrease: 10, reason: 'Biceps long head assists shoulder flexion' },
      ],
      romRestrictions: [
        { joint: 'rightShoulder', parameter: 'abduction', restrictionPercent: 35, reason: 'Deltoid tear limits active abduction' },
        { joint: 'rightShoulder', parameter: 'flexion', restrictionPercent: 25, reason: 'Deltoid dysfunction limits active shoulder flexion' },
      ],
      posturalDeviations: [
        { joint: 'rightShoulder', parameter: 'elevation', deviationDegrees: 5, reason: 'Compensatory shoulder hiking via upper trapezius' },
      ],
      clinicalTitle: 'Right Deltoid Dysfunction',
      clinicalDescription: 'Deltoid pathology causes upper trapezius to compensate with shoulder hiking. Pectoralis and biceps long head assist flexion. Active abduction and flexion ROM reduced.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'rightShoulder', parameter: 'abduction', restrictionPercent: 20, reason: 'Deltoid spasm/fibrosis restricts shoulder abduction' },
        { joint: 'rightShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Deltoid stiffness limits shoulder flexion arc' },
      ],
      posturalDeviations: [
        { joint: 'rightShoulder', parameter: 'abduction', deviationDegrees: 3, reason: 'Deltoid shortening holds arm slightly abducted' },
      ],
      clinicalTitle: 'Right Deltoid Stiffness',
      clinicalDescription: 'Deltoid spasm or fibrosis restricts shoulder mobility. Arm may rest slightly abducted.',
      severity: 'mild',
    },
  ],

  scapula_l: [
    {
      pathologyTypes: ['strain', 'weakness'],
      synergists: [
        { muscleGroupId: 'deltoid_l', tensionIncrease: 15, activationIncrease: 12, reason: 'Deltoid overworks to compensate for scapular stabilizer weakness' },
        { muscleGroupId: 'neck', tensionIncrease: 12, activationIncrease: 10, reason: 'Levator scapulae/cervical muscles compensate for weak trapezius' },
      ],
      romRestrictions: [
        { joint: 'leftShoulder', parameter: 'flexion', restrictionPercent: 30, reason: 'Scapular stabilizer weakness disrupts scapulohumeral rhythm — limits overhead reach' },
        { joint: 'leftShoulder', parameter: 'abduction', restrictionPercent: 25, reason: 'Poor scapular upward rotation limits abduction beyond 90°' },
      ],
      posturalDeviations: [
        { joint: 'leftShoulder', parameter: 'protraction', deviationDegrees: 5, reason: 'Scapular winging — weak serratus anterior/lower trapezius' },
      ],
      clinicalTitle: 'Left Scapular Dyskinesis',
      clinicalDescription: 'Weak scapular stabilizers (serratus anterior, lower/middle trapezius) disrupt scapulohumeral rhythm. Scapular winging present. Deltoid and cervical muscles compensate. Overhead reach limited.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'trigger_point', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Upper trapezius tightness restricts scapular movement' },
      ],
      posturalDeviations: [
        { joint: 'leftShoulder', parameter: 'elevation', deviationDegrees: 8, reason: 'Upper trapezius spasm causes sustained shoulder elevation' },
        { joint: 'neck', parameter: 'lateralFlexion', deviationDegrees: -3, reason: 'Ipsilateral cervical side-bend from elevated scapula' },
      ],
      clinicalTitle: 'Left Upper Trapezius Tightness',
      clinicalDescription: 'Tight upper trapezius elevates the scapula and limits cervical lateral flexion. Common contributor to tension-type headaches and neck pain.',
      severity: 'mild',
    },
  ],
  scapula_r: [
    {
      pathologyTypes: ['strain', 'weakness'],
      synergists: [
        { muscleGroupId: 'deltoid_r', tensionIncrease: 15, activationIncrease: 12, reason: 'Deltoid overworks to compensate for scapular stabilizer weakness' },
        { muscleGroupId: 'neck', tensionIncrease: 12, activationIncrease: 10, reason: 'Levator scapulae/cervical muscles compensate for weak trapezius' },
      ],
      romRestrictions: [
        { joint: 'rightShoulder', parameter: 'flexion', restrictionPercent: 30, reason: 'Scapular stabilizer weakness disrupts scapulohumeral rhythm' },
        { joint: 'rightShoulder', parameter: 'abduction', restrictionPercent: 25, reason: 'Poor scapular upward rotation limits abduction beyond 90°' },
      ],
      posturalDeviations: [
        { joint: 'rightShoulder', parameter: 'protraction', deviationDegrees: 5, reason: 'Scapular winging' },
      ],
      clinicalTitle: 'Right Scapular Dyskinesis',
      clinicalDescription: 'Weak scapular stabilizers disrupt scapulohumeral rhythm. Scapular winging present. Deltoid and cervical muscles compensate.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'trigger_point', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'rightShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Upper trapezius tightness restricts scapular movement' },
      ],
      posturalDeviations: [
        { joint: 'rightShoulder', parameter: 'elevation', deviationDegrees: 8, reason: 'Upper trapezius spasm causes sustained shoulder elevation' },
        { joint: 'neck', parameter: 'lateralFlexion', deviationDegrees: 3, reason: 'Ipsilateral cervical side-bend from elevated scapula' },
      ],
      clinicalTitle: 'Right Upper Trapezius Tightness',
      clinicalDescription: 'Tight upper trapezius elevates the scapula and limits cervical lateral flexion.',
      severity: 'mild',
    },
  ],

  spine: [
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [
        { muscleGroupId: 'glute_l', tensionIncrease: 10, activationIncrease: 8, reason: 'Gluteal muscles compensate to assist hip extension when lumbar extension is locked' },
        { muscleGroupId: 'glute_r', tensionIncrease: 10, activationIncrease: 8, reason: 'Gluteal muscles compensate to assist hip extension when lumbar extension is locked' },
        { muscleGroupId: 'calf_l', tensionIncrease: 6, activationIncrease: 5, reason: 'Hamstring/calf complex loads increase with reduced lumbar mobility' },
        { muscleGroupId: 'calf_r', tensionIncrease: 6, activationIncrease: 5, reason: 'Hamstring/calf complex loads increase with reduced lumbar mobility' },
      ],
      romRestrictions: [
        { joint: 'spine', parameter: 'lumbarLordosis', restrictionPercent: 45, reason: 'Erector spinae tightness severely restricts lumbar flexion — unable to flatten lordosis' },
        { joint: 'spine', parameter: 'scoliosis', restrictionPercent: 30, reason: 'Bilateral erector spinae tightness restricts lateral flexion' },
      ],
      posturalDeviations: [
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 10, reason: 'Tight erector spinae locks lumbar spine in extension/lordosis' },
        { joint: 'spine', parameter: 'thoracicKyphosis', deviationDegrees: -3, reason: 'Thoracic spine flattens as erector spinae pull extends through thoracolumbar junction' },
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: 5, reason: 'Erector spinae tightness creates anterior pelvic tilt via lumbar-pelvic coupling' },
      ],
      clinicalTitle: 'Erector Spinae Tightness / Spasm',
      clinicalDescription: 'Tight erector spinae muscles lock the lumbar spine in extension, severely restricting forward bending. Compensatory anterior pelvic tilt develops. Hip extensors and hamstrings must compensate for reduced spinal mobility during bending tasks. Common in chronic low back pain.',
      severity: 'severe',
    },
    {
      pathologyTypes: ['strain', 'weakness'],
      synergists: [
        { muscleGroupId: 'core', tensionIncrease: 18, activationIncrease: 15, reason: 'Abdominals compensate to stabilize the spine when erector spinae are weak' },
        { muscleGroupId: 'glute_l', tensionIncrease: 8, activationIncrease: 6, reason: 'Gluteal muscles assist trunk extension when back extensors are weak' },
        { muscleGroupId: 'glute_r', tensionIncrease: 8, activationIncrease: 6, reason: 'Gluteal muscles assist trunk extension when back extensors are weak' },
      ],
      romRestrictions: [
        { joint: 'spine', parameter: 'lumbarLordosis', restrictionPercent: 20, reason: 'Pain-limited spinal extension from erector spinae injury' },
      ],
      posturalDeviations: [
        { joint: 'spine', parameter: 'thoracicKyphosis', deviationDegrees: 5, reason: 'Increased thoracic kyphosis from weak back extensors' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: -4, reason: 'Loss of lordosis — weak extensors cannot maintain normal lumbar curve' },
      ],
      clinicalTitle: 'Erector Spinae Weakness / Strain',
      clinicalDescription: 'Weak or strained back extensors cannot maintain normal lumbar lordosis. Core muscles compensate for spinal stability. Thoracic kyphosis increases. Trunk extension is painful and limited.',
      severity: 'moderate',
    },
  ],

  core: [
    {
      pathologyTypes: ['weakness', 'strain'],
      synergists: [
        { muscleGroupId: 'spine', tensionIncrease: 15, activationIncrease: 12, reason: 'Erector spinae overactivate to stabilize spine when abdominals are weak' },
        { muscleGroupId: 'glute_l', tensionIncrease: 6, activationIncrease: 5, reason: 'Hip extensors assist pelvic control' },
        { muscleGroupId: 'glute_r', tensionIncrease: 6, activationIncrease: 5, reason: 'Hip extensors assist pelvic control' },
      ],
      romRestrictions: [],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: 8, reason: 'Weak abdominals cannot resist anterior pelvic tilt — classic lower crossed syndrome' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 6, reason: 'Increased lordosis from loss of anterior pelvic control' },
      ],
      clinicalTitle: 'Core / Abdominal Weakness',
      clinicalDescription: 'Weak abdominals allow anterior pelvic tilt and increased lumbar lordosis. Erector spinae overactivate to compensate for lost spinal stability. Hip flexors may shorten adaptively.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'spine', parameter: 'lumbarLordosis', restrictionPercent: 20, reason: 'Abdominal tightness restricts spinal extension' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: -5, reason: 'Tight abdominals pull pelvis into posterior tilt' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: -5, reason: 'Flattened lumbar curve from abdominal tightness' },
        { joint: 'spine', parameter: 'thoracicKyphosis', deviationDegrees: 4, reason: 'Increased thoracic rounding from flexed trunk posture' },
      ],
      clinicalTitle: 'Abdominal / Core Tightness',
      clinicalDescription: 'Tight abdominals pull the pelvis into posterior tilt and flatten the lumbar curve. Thoracic kyphosis may increase. Common after abdominal surgery or overtraining.',
      severity: 'mild',
    },
  ],

  glute_l: [
    {
      pathologyTypes: ['weakness', 'strain', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'spine', tensionIncrease: 12, activationIncrease: 10, reason: 'Erector spinae compensate for hip extension when glutes are weak' },
        { muscleGroupId: 'calf_l', tensionIncrease: 10, activationIncrease: 8, reason: 'Hamstrings/calf complex compensates for hip extension deficit' },
        { muscleGroupId: 'quad_l', tensionIncrease: 8, activationIncrease: 6, reason: 'TFL/quad compensate for hip abduction when gluteus medius is weak' },
      ],
      romRestrictions: [
        { joint: 'leftHip', parameter: 'extension', restrictionPercent: 30, reason: 'Gluteal weakness limits active hip extension' },
        { joint: 'leftHip', parameter: 'abduction', restrictionPercent: 25, reason: 'Gluteus medius weakness limits hip abduction — Trendelenburg sign' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'obliquity', deviationDegrees: 4, reason: 'Contralateral pelvic drop (Trendelenburg) during single-leg stance' },
        { joint: 'leftKnee', parameter: 'varus', deviationDegrees: -3, reason: 'Dynamic knee valgus from gluteus medius weakness — knee collapses inward' },
        { joint: 'spine', parameter: 'scoliosis', deviationDegrees: 3, reason: 'Compensatory trunk lateral lean toward weak side' },
      ],
      clinicalTitle: 'Left Gluteal Weakness — Trendelenburg Pattern',
      clinicalDescription: 'Weak gluteus medius/maximus causes contralateral pelvic drop (Trendelenburg sign), dynamic knee valgus, and trunk lateral lean. Erector spinae, hamstrings, and TFL overwork to compensate. Common in hip pathology, post-surgical weakness, and lower limb injuries.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftHip', parameter: 'flexion', restrictionPercent: 25, reason: 'Tight gluteals restrict hip flexion ROM' },
        { joint: 'leftHip', parameter: 'internalRotation', restrictionPercent: 20, reason: 'Tight external rotators (deep gluteals) limit internal rotation' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: -3, reason: 'Gluteal tightness pulls pelvis into posterior tilt' },
        { joint: 'leftHip', parameter: 'externalRotation', deviationDegrees: 4, reason: 'Tight deep gluteals hold hip in external rotation' },
      ],
      clinicalTitle: 'Left Gluteal Tightness',
      clinicalDescription: 'Tight gluteal muscles restrict hip flexion and internal rotation. Pelvis may be pulled into posterior tilt. Deep gluteal syndrome can cause sciatic-type symptoms.',
      severity: 'mild',
    },
  ],
  glute_r: [
    {
      pathologyTypes: ['weakness', 'strain', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'spine', tensionIncrease: 12, activationIncrease: 10, reason: 'Erector spinae compensate for hip extension' },
        { muscleGroupId: 'calf_r', tensionIncrease: 10, activationIncrease: 8, reason: 'Hamstrings/calf complex compensates for hip extension deficit' },
        { muscleGroupId: 'quad_r', tensionIncrease: 8, activationIncrease: 6, reason: 'TFL/quad compensate for hip abduction' },
      ],
      romRestrictions: [
        { joint: 'rightHip', parameter: 'extension', restrictionPercent: 30, reason: 'Gluteal weakness limits active hip extension' },
        { joint: 'rightHip', parameter: 'abduction', restrictionPercent: 25, reason: 'Gluteus medius weakness — Trendelenburg sign' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'obliquity', deviationDegrees: -4, reason: 'Contralateral pelvic drop (Trendelenburg)' },
        { joint: 'rightKnee', parameter: 'varus', deviationDegrees: -3, reason: 'Dynamic knee valgus from gluteus medius weakness' },
        { joint: 'spine', parameter: 'scoliosis', deviationDegrees: -3, reason: 'Compensatory trunk lean toward weak side' },
      ],
      clinicalTitle: 'Right Gluteal Weakness — Trendelenburg Pattern',
      clinicalDescription: 'Weak gluteus medius/maximus causes contralateral pelvic drop, dynamic knee valgus, and trunk lateral lean. Erector spinae, hamstrings, and TFL overwork.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'rightHip', parameter: 'flexion', restrictionPercent: 25, reason: 'Tight gluteals restrict hip flexion' },
        { joint: 'rightHip', parameter: 'internalRotation', restrictionPercent: 20, reason: 'Tight deep gluteals limit internal rotation' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: -3, reason: 'Gluteal tightness pulls pelvis into posterior tilt' },
        { joint: 'rightHip', parameter: 'externalRotation', deviationDegrees: 4, reason: 'Hip held in external rotation' },
      ],
      clinicalTitle: 'Right Gluteal Tightness',
      clinicalDescription: 'Tight gluteals restrict hip flexion and internal rotation. Posterior pelvic tilt may develop.',
      severity: 'mild',
    },
  ],

  quad_l: [
    {
      pathologyTypes: ['weakness', 'strain', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'glute_l', tensionIncrease: 10, activationIncrease: 8, reason: 'Hip extensors compensate for weak knee extensors during stance' },
        { muscleGroupId: 'calf_l', tensionIncrease: 12, activationIncrease: 10, reason: 'Calf muscles overwork to maintain knee stability when quads are weak' },
      ],
      romRestrictions: [
        { joint: 'leftKnee', parameter: 'flexion', restrictionPercent: 20, reason: 'Quadriceps weakness causes knee giving way — limits controlled descent' },
      ],
      posturalDeviations: [
        { joint: 'leftKnee', parameter: 'flexion', deviationDegrees: -3, reason: 'Knee locks into hyperextension (genu recurvatum) — compensatory strategy for weak quads' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 2, reason: 'Trunk shifts posteriorly to keep center of mass behind knees' },
      ],
      clinicalTitle: 'Left Quadriceps Weakness',
      clinicalDescription: 'Weak quadriceps cannot control knee flexion during stance. Knee locks into hyperextension as a compensatory strategy. Calf muscles and hip extensors overwork. Risk of patellofemoral dysfunction.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftKnee', parameter: 'flexion', restrictionPercent: 30, reason: 'Tight quadriceps restrict knee flexion ROM' },
        { joint: 'leftHip', parameter: 'extension', restrictionPercent: 15, reason: 'Tight rectus femoris restricts hip extension (Thomas test positive)' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: 4, reason: 'Tight rectus femoris pulls pelvis into anterior tilt' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 3, reason: 'Increased lordosis from anterior pelvic tilt driven by hip flexor tightness' },
      ],
      clinicalTitle: 'Left Quadriceps / Hip Flexor Tightness',
      clinicalDescription: 'Tight quadriceps restrict knee flexion and hip extension. Rectus femoris tightness pulls the pelvis into anterior tilt, increasing lumbar lordosis. Classic component of lower crossed syndrome.',
      severity: 'moderate',
    },
  ],
  quad_r: [
    {
      pathologyTypes: ['weakness', 'strain', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'glute_r', tensionIncrease: 10, activationIncrease: 8, reason: 'Hip extensors compensate for weak knee extensors' },
        { muscleGroupId: 'calf_r', tensionIncrease: 12, activationIncrease: 10, reason: 'Calf muscles overwork to maintain knee stability' },
      ],
      romRestrictions: [
        { joint: 'rightKnee', parameter: 'flexion', restrictionPercent: 20, reason: 'Quadriceps weakness — limited controlled descent' },
      ],
      posturalDeviations: [
        { joint: 'rightKnee', parameter: 'flexion', deviationDegrees: -3, reason: 'Genu recurvatum — compensatory hyperextension' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 2, reason: 'Trunk shifts posteriorly' },
      ],
      clinicalTitle: 'Right Quadriceps Weakness',
      clinicalDescription: 'Weak quadriceps causes knee hyperextension and calf overwork.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'rightKnee', parameter: 'flexion', restrictionPercent: 30, reason: 'Tight quadriceps restrict knee flexion' },
        { joint: 'rightHip', parameter: 'extension', restrictionPercent: 15, reason: 'Tight rectus femoris restricts hip extension' },
      ],
      posturalDeviations: [
        { joint: 'pelvis', parameter: 'tilt', deviationDegrees: 4, reason: 'Rectus femoris tightness → anterior pelvic tilt' },
        { joint: 'spine', parameter: 'lumbarLordosis', deviationDegrees: 3, reason: 'Lordosis from anterior pelvic tilt' },
      ],
      clinicalTitle: 'Right Quadriceps / Hip Flexor Tightness',
      clinicalDescription: 'Tight quadriceps restrict knee flexion and hip extension. Anterior pelvic tilt and increased lordosis develop.',
      severity: 'moderate',
    },
  ],

  calf_l: [
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [
        { muscleGroupId: 'quad_l', tensionIncrease: 8, activationIncrease: 6, reason: 'Quadriceps compensate during gait when ankle ROM is restricted' },
      ],
      romRestrictions: [
        { joint: 'leftAnkle', parameter: 'dorsiflexion', restrictionPercent: 40, reason: 'Tight gastrocnemius/soleus severely restricts dorsiflexion' },
      ],
      posturalDeviations: [
        { joint: 'leftAnkle', parameter: 'plantarflexion', deviationDegrees: 5, reason: 'Ankle held in relative plantarflexion from calf tightness' },
        { joint: 'leftKnee', parameter: 'flexion', deviationDegrees: -2, reason: 'Knee hyperextension tendency from reduced dorsiflexion' },
      ],
      clinicalTitle: 'Left Calf Tightness',
      clinicalDescription: 'Tight calf muscles restrict ankle dorsiflexion, causing compensatory knee hyperextension and early heel rise during gait. Increases loading on the forefoot and Achilles tendon.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['strain', 'weakness', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'shin_l', tensionIncrease: 15, activationIncrease: 12, reason: 'Tibialis anterior overworks to control ankle when calf is weak' },
        { muscleGroupId: 'quad_l', tensionIncrease: 6, activationIncrease: 5, reason: 'Knee extensors compensate during push-off phase' },
      ],
      romRestrictions: [
        { joint: 'leftAnkle', parameter: 'plantarflexion', restrictionPercent: 35, reason: 'Calf tear/weakness limits push-off power' },
      ],
      posturalDeviations: [
        { joint: 'leftAnkle', parameter: 'dorsiflexion', deviationDegrees: 3, reason: 'Ankle drops into dorsiflexion — loss of plantarflexion control' },
      ],
      clinicalTitle: 'Left Calf Weakness / Strain',
      clinicalDescription: 'Weak or torn calf muscles reduce push-off power. Tibialis anterior overworks. Gait shows reduced stride length and loss of heel-rise.',
      severity: 'moderate',
    },
  ],
  calf_r: [
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [
        { muscleGroupId: 'quad_r', tensionIncrease: 8, activationIncrease: 6, reason: 'Quadriceps compensate for restricted ankle ROM' },
      ],
      romRestrictions: [
        { joint: 'rightAnkle', parameter: 'dorsiflexion', restrictionPercent: 40, reason: 'Tight gastrocnemius/soleus restricts dorsiflexion' },
      ],
      posturalDeviations: [
        { joint: 'rightAnkle', parameter: 'plantarflexion', deviationDegrees: 5, reason: 'Ankle held in plantarflexion' },
        { joint: 'rightKnee', parameter: 'flexion', deviationDegrees: -2, reason: 'Knee hyperextension from reduced dorsiflexion' },
      ],
      clinicalTitle: 'Right Calf Tightness',
      clinicalDescription: 'Tight calf muscles restrict dorsiflexion. Compensatory knee hyperextension and increased forefoot loading.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['strain', 'weakness', 'tendinopathy'],
      synergists: [
        { muscleGroupId: 'shin_r', tensionIncrease: 15, activationIncrease: 12, reason: 'Tibialis anterior overworks when calf is weak' },
        { muscleGroupId: 'quad_r', tensionIncrease: 6, activationIncrease: 5, reason: 'Knee extensors compensate during push-off' },
      ],
      romRestrictions: [
        { joint: 'rightAnkle', parameter: 'plantarflexion', restrictionPercent: 35, reason: 'Calf weakness limits push-off' },
      ],
      posturalDeviations: [
        { joint: 'rightAnkle', parameter: 'dorsiflexion', deviationDegrees: 3, reason: 'Loss of plantarflexion control' },
      ],
      clinicalTitle: 'Right Calf Weakness / Strain',
      clinicalDescription: 'Weak calf reduces push-off power. Tibialis anterior and knee extensors compensate.',
      severity: 'moderate',
    },
  ],

  chest: [
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Tight pectorals restrict overhead shoulder flexion' },
        { joint: 'rightShoulder', parameter: 'flexion', restrictionPercent: 15, reason: 'Tight pectorals restrict overhead shoulder flexion' },
        { joint: 'leftShoulder', parameter: 'externalRotation', restrictionPercent: 20, reason: 'Pectoral tightness limits external rotation' },
        { joint: 'rightShoulder', parameter: 'externalRotation', restrictionPercent: 20, reason: 'Pectoral tightness limits external rotation' },
      ],
      posturalDeviations: [
        { joint: 'leftShoulder', parameter: 'protraction', deviationDegrees: 6, reason: 'Tight pectorals pull shoulders into protraction' },
        { joint: 'rightShoulder', parameter: 'protraction', deviationDegrees: 6, reason: 'Tight pectorals pull shoulders into protraction' },
        { joint: 'leftShoulder', parameter: 'internalRotation', deviationDegrees: 5, reason: 'Pectoral tightness drives internal rotation posture' },
        { joint: 'rightShoulder', parameter: 'internalRotation', deviationDegrees: 5, reason: 'Pectoral tightness drives internal rotation posture' },
        { joint: 'spine', parameter: 'thoracicKyphosis', deviationDegrees: 6, reason: 'Protracted shoulders increase thoracic kyphosis — rounded upper back' },
      ],
      clinicalTitle: 'Pectoral Tightness — Upper Crossed Syndrome Component',
      clinicalDescription: 'Tight pectorals protract the shoulders and internally rotate the glenohumeral joints, increasing thoracic kyphosis. This is a hallmark of upper crossed syndrome. Limits overhead reach and external rotation. Contributes to subacromial impingement risk.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['strain', 'weakness'],
      synergists: [
        { muscleGroupId: 'deltoid_l', tensionIncrease: 10, activationIncrease: 8, reason: 'Anterior deltoid compensates for weak pectoralis during pushing' },
        { muscleGroupId: 'deltoid_r', tensionIncrease: 10, activationIncrease: 8, reason: 'Anterior deltoid compensates for weak pectoralis during pushing' },
      ],
      romRestrictions: [],
      posturalDeviations: [],
      clinicalTitle: 'Pectoral Weakness / Strain',
      clinicalDescription: 'Weak pectorals reduce horizontal adduction and pushing strength. Anterior deltoids compensate.',
      severity: 'mild',
    },
  ],

  neck: [
    {
      pathologyTypes: ['spasm', 'fibrosis', 'trigger_point'],
      synergists: [],
      romRestrictions: [
        { joint: 'neck', parameter: 'rotation', restrictionPercent: 30, reason: 'Cervical muscle tightness restricts rotation' },
        { joint: 'neck', parameter: 'lateralFlexion', restrictionPercent: 25, reason: 'Cervical muscle tightness restricts lateral flexion' },
        { joint: 'neck', parameter: 'flexion', restrictionPercent: 20, reason: 'Cervical extensors restrict forward flexion' },
      ],
      posturalDeviations: [
        { joint: 'spine', parameter: 'forwardHead', deviationDegrees: 5, reason: 'Tight suboccipitals and upper cervical extensors drive forward head posture' },
        { joint: 'neck', parameter: 'extension', deviationDegrees: 4, reason: 'Upper cervical extension to maintain horizontal gaze with forward head' },
        { joint: 'spine', parameter: 'thoracicKyphosis', deviationDegrees: 3, reason: 'Thoracic kyphosis increases with forward head posture' },
      ],
      clinicalTitle: 'Cervical Muscle Tightness',
      clinicalDescription: 'Tight cervical muscles restrict neck mobility in all directions. Forward head posture develops with compensatory upper cervical extension. Thoracic kyphosis increases. Common cause of tension headaches.',
      severity: 'moderate',
    },
    {
      pathologyTypes: ['strain', 'weakness'],
      synergists: [
        { muscleGroupId: 'scapula_l', tensionIncrease: 10, activationIncrease: 8, reason: 'Upper trapezius compensates for cervical stabilizer weakness' },
        { muscleGroupId: 'scapula_r', tensionIncrease: 10, activationIncrease: 8, reason: 'Upper trapezius compensates for cervical stabilizer weakness' },
      ],
      romRestrictions: [
        { joint: 'neck', parameter: 'extension', restrictionPercent: 25, reason: 'Weak deep cervical flexors allow excessive extension — pain limits motion' },
      ],
      posturalDeviations: [
        { joint: 'spine', parameter: 'forwardHead', deviationDegrees: 6, reason: 'Weak deep cervical flexors cannot maintain chin tuck — forward head develops' },
      ],
      clinicalTitle: 'Cervical Muscle Weakness',
      clinicalDescription: 'Weak deep cervical flexors cannot maintain proper head-on-neck position. Forward head posture develops. Upper trapezius compensates for lost cervical stability.',
      severity: 'moderate',
    },
  ],

  bicep_l: [
    {
      pathologyTypes: ['strain', 'tendinopathy', 'weakness'],
      synergists: [
        { muscleGroupId: 'deltoid_l', tensionIncrease: 8, activationIncrease: 6, reason: 'Anterior deltoid compensates for biceps during shoulder flexion' },
      ],
      romRestrictions: [
        { joint: 'leftElbow', parameter: 'flexion', restrictionPercent: 20, reason: 'Biceps weakness limits active elbow flexion strength' },
      ],
      posturalDeviations: [],
      clinicalTitle: 'Left Biceps Dysfunction',
      clinicalDescription: 'Biceps weakness or tendinopathy reduces elbow flexion and supination strength. Anterior deltoid compensates for shoulder flexion component.',
      severity: 'mild',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'leftElbow', parameter: 'extension', restrictionPercent: 25, reason: 'Biceps tightness restricts full elbow extension' },
      ],
      posturalDeviations: [
        { joint: 'leftElbow', parameter: 'flexion', deviationDegrees: 8, reason: 'Flexion contracture — elbow held in flexion from biceps tightness' },
      ],
      clinicalTitle: 'Left Biceps Tightness',
      clinicalDescription: 'Tight biceps restrict full elbow extension, creating a flexion contracture posture.',
      severity: 'mild',
    },
  ],
  bicep_r: [
    {
      pathologyTypes: ['strain', 'tendinopathy', 'weakness'],
      synergists: [
        { muscleGroupId: 'deltoid_r', tensionIncrease: 8, activationIncrease: 6, reason: 'Anterior deltoid compensates for biceps during shoulder flexion' },
      ],
      romRestrictions: [
        { joint: 'rightElbow', parameter: 'flexion', restrictionPercent: 20, reason: 'Biceps weakness limits elbow flexion' },
      ],
      posturalDeviations: [],
      clinicalTitle: 'Right Biceps Dysfunction',
      clinicalDescription: 'Biceps weakness reduces elbow flexion and supination. Anterior deltoid compensates.',
      severity: 'mild',
    },
    {
      pathologyTypes: ['spasm', 'fibrosis'],
      synergists: [],
      romRestrictions: [
        { joint: 'rightElbow', parameter: 'extension', restrictionPercent: 25, reason: 'Biceps tightness restricts elbow extension' },
      ],
      posturalDeviations: [
        { joint: 'rightElbow', parameter: 'flexion', deviationDegrees: 8, reason: 'Flexion contracture' },
      ],
      clinicalTitle: 'Right Biceps Tightness',
      clinicalDescription: 'Tight biceps restrict elbow extension, creating a flexion contracture.',
      severity: 'mild',
    },
  ],

  shin_l: [
    {
      pathologyTypes: ['strain', 'weakness', 'inflammation'],
      synergists: [
        { muscleGroupId: 'calf_l', tensionIncrease: 8, activationIncrease: 6, reason: 'Calf muscles overwork to control ankle when tibialis anterior is weak' },
      ],
      romRestrictions: [
        { joint: 'leftAnkle', parameter: 'dorsiflexion', restrictionPercent: 25, reason: 'Tibialis anterior weakness causes foot drop — limits active dorsiflexion' },
      ],
      posturalDeviations: [
        { joint: 'leftAnkle', parameter: 'plantarflexion', deviationDegrees: 3, reason: 'Foot drop tendency from weak dorsiflexor' },
      ],
      clinicalTitle: 'Left Tibialis Anterior Weakness',
      clinicalDescription: 'Weak tibialis anterior causes foot drop tendency. Compensatory hip hiking and steppage gait pattern develops.',
      severity: 'moderate',
    },
  ],
  shin_r: [
    {
      pathologyTypes: ['strain', 'weakness', 'inflammation'],
      synergists: [
        { muscleGroupId: 'calf_r', tensionIncrease: 8, activationIncrease: 6, reason: 'Calf muscles overwork when tibialis anterior is weak' },
      ],
      romRestrictions: [
        { joint: 'rightAnkle', parameter: 'dorsiflexion', restrictionPercent: 25, reason: 'Tibialis anterior weakness — foot drop' },
      ],
      posturalDeviations: [
        { joint: 'rightAnkle', parameter: 'plantarflexion', deviationDegrees: 3, reason: 'Foot drop tendency' },
      ],
      clinicalTitle: 'Right Tibialis Anterior Weakness',
      clinicalDescription: 'Weak tibialis anterior causes foot drop. Steppage gait develops.',
      severity: 'moderate',
    },
  ],
};

const ROTATOR_CUFF_MUSCLES: Record<string, { side: 'left' | 'right'; action: string }> = {
  l_infraspinatus: { side: 'left', action: 'external_rotation' },
  r_infraspinatus: { side: 'right', action: 'external_rotation' },
  l_supraspinatus: { side: 'left', action: 'abduction_initiation' },
  r_supraspinatus: { side: 'right', action: 'abduction_initiation' },
  l_subscapularis: { side: 'left', action: 'internal_rotation' },
  r_subscapularis: { side: 'right', action: 'internal_rotation' },
  l_teres_minor: { side: 'left', action: 'external_rotation' },
  r_teres_minor: { side: 'right', action: 'external_rotation' },
  l_teres_major: { side: 'left', action: 'internal_rotation' },
  r_teres_major: { side: 'right', action: 'internal_rotation' },
};

function computeRotatorCuffEffects(
  overrides: Record<string, MuscleOverride>
): PathologyCompensationResult {
  const result: PathologyCompensationResult = {
    compensatoryOverrides: {},
    romRestrictions: [],
    posturalDeviations: [],
    clinicalFindings: [],
  };

  const rcBySlide: Record<string, { muscle: string; pathology: PathologyType; action: string }[]> = {
    left: [],
    right: [],
  };

  for (const [muscleId, rcInfo] of Object.entries(ROTATOR_CUFF_MUSCLES)) {
    const override = overrides[muscleId];
    if (!override?.isManual || override.pathology === 'none') continue;

    const isDisabling = ['strain', 'weakness', 'tendinopathy'].includes(override.pathology);
    if (isDisabling) {
      rcBySlide[rcInfo.side].push({ muscle: muscleId, pathology: override.pathology, action: rcInfo.action });
    }
  }

  for (const [side, affected] of Object.entries(rcBySlide)) {
    if (affected.length === 0) continue;

    const shoulderJoint = side === 'left' ? 'leftShoulder' : 'rightShoulder';
    const scapulaGroup = side === 'left' ? 'scapula_l' : 'scapula_r';
    const deltoidGroup = side === 'left' ? 'deltoid_l' : 'deltoid_r';
    const sideLabel = side === 'left' ? 'Left' : 'Right';

    const hasExternalRotatorTear = affected.some(a => a.action === 'external_rotation');
    const hasAbductionInitiator = affected.some(a => a.action === 'abduction_initiation');
    const tearCount = affected.length;
    const isLargeTear = tearCount >= 2;
    const isMassiveTear = tearCount >= 3;

    if (hasExternalRotatorTear) {
      result.romRestrictions.push({
        joint: shoulderJoint,
        parameter: 'externalRotation',
        restrictionPercent: 40 + (tearCount * 10),
        reason: `${sideLabel} external rotator tear(s) — loss of active external rotation`,
      });
    }

    if (hasAbductionInitiator) {
      result.romRestrictions.push({
        joint: shoulderJoint,
        parameter: 'abduction',
        restrictionPercent: 35 + (tearCount * 8),
        reason: `Supraspinatus tear — cannot initiate abduction (0-15° range compromised)`,
      });
      result.romRestrictions.push({
        joint: shoulderJoint,
        parameter: 'flexion',
        restrictionPercent: 25 + (tearCount * 5),
        reason: `Supraspinatus tear limits active shoulder elevation`,
      });
    }

    if (!result.compensatoryOverrides[scapulaGroup]) {
      result.compensatoryOverrides[scapulaGroup] = {};
    }
    const scapComp = result.compensatoryOverrides[scapulaGroup];
    scapComp.tensionOffset = (scapComp.tensionOffset || 0) + 15 + (tearCount * 8);
    scapComp.activationOffset = (scapComp.activationOffset || 0) + 12 + (tearCount * 5);

    if (!result.compensatoryOverrides[deltoidGroup]) {
      result.compensatoryOverrides[deltoidGroup] = {};
    }
    const deltComp = result.compensatoryOverrides[deltoidGroup];
    deltComp.tensionOffset = (deltComp.tensionOffset || 0) + 12 + (tearCount * 5);
    deltComp.activationOffset = (deltComp.activationOffset || 0) + 10 + (tearCount * 4);

    if (isLargeTear) {
      result.posturalDeviations.push({
        joint: shoulderJoint,
        parameter: 'elevation',
        deviationDegrees: -6 - (tearCount * 2),
        reason: `${sideLabel} humeral depression — loss of humeral head depressor function from rotator cuff tears`,
      });

      result.posturalDeviations.push({
        joint: shoulderJoint,
        parameter: 'protraction',
        deviationDegrees: 4 + tearCount,
        reason: `${sideLabel} scapular dyskinesis — altered scapulohumeral rhythm from rotator cuff insufficiency`,
      });

      result.posturalDeviations.push({
        joint: shoulderJoint,
        parameter: 'elevation',
        deviationDegrees: 6,
        reason: `${sideLabel} shoulder hiking — upper trapezius compensates for rotator cuff loss`,
      });

      result.romRestrictions.push({
        joint: shoulderJoint,
        parameter: 'abduction',
        restrictionPercent: isMassiveTear ? 60 : 45,
        reason: `${sideLabel} massive rotator cuff tear — force couple disrupted, active elevation severely limited`,
      });
    }

    if (isMassiveTear) {
      result.posturalDeviations.push({
        joint: shoulderJoint,
        parameter: 'internalRotation',
        deviationDegrees: 8,
        reason: `${sideLabel} shoulder adopts internally rotated posture — loss of external rotator force couple`,
      });

      result.posturalDeviations.push({
        joint: 'spine',
        parameter: 'scoliosis',
        deviationDegrees: side === 'left' ? -2 : 2,
        reason: `Trunk shifts toward affected side to unload shoulder`,
      });
    }

    result.clinicalFindings.push({
      severity: isMassiveTear ? 'severe' : isLargeTear ? 'moderate' : 'mild',
      title: `${sideLabel} Rotator Cuff ${isMassiveTear ? 'Massive' : isLargeTear ? 'Large' : 'Partial'} Tear`,
      description: isMassiveTear
        ? `Massive rotator cuff tear (${tearCount} muscles affected). Force couple between deltoid and cuff is disrupted. Humeral depression, scapular dyskinesis, and pseudoparalysis likely. Active elevation severely compromised. Upper trapezius and deltoid overwork in compensation.`
        : isLargeTear
        ? `Large rotator cuff tear (${tearCount} muscles). Humeral head migrates superiorly. Scapular dyskinesis present with altered scapulohumeral rhythm. Shoulder hiking and protraction compensations active.`
        : `Partial rotator cuff involvement (${affected.map(a => a.muscle.replace(/[lr]_/, '')).join(', ')}). Compensatory upper trapezius activation and deltoid overwork. ROM restricted in ${affected.map(a => a.action.replace('_', ' ')).join(', ')}.`,
      muscleSource: affected.map(a => a.muscle).join(', '),
      pathology: affected[0].pathology,
    });
  }

  return result;
}

function mergeCompensationResults(
  target: PathologyCompensationResult,
  source: PathologyCompensationResult
): void {
  for (const [muscleId, overrides] of Object.entries(source.compensatoryOverrides)) {
    if (!target.compensatoryOverrides[muscleId]) {
      target.compensatoryOverrides[muscleId] = {};
    }
    const existing = target.compensatoryOverrides[muscleId];
    existing.tensionOffset = (existing.tensionOffset || 0) + (overrides.tensionOffset || 0);
    existing.activationOffset = (existing.activationOffset || 0) + (overrides.activationOffset || 0);
  }

  target.romRestrictions.push(...source.romRestrictions);
  target.posturalDeviations.push(...source.posturalDeviations);
  target.clinicalFindings.push(...source.clinicalFindings);
}

function deduplicateRomRestrictions(restrictions: RomRestriction[]): RomRestriction[] {
  const map = new Map<string, RomRestriction>();
  for (const r of restrictions) {
    const key = `${r.joint}.${r.parameter}`;
    const existing = map.get(key);
    if (!existing || r.restrictionPercent > existing.restrictionPercent) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

function deduplicatePosturalDeviations(deviations: PosturalDeviation[]): PosturalDeviation[] {
  const map = new Map<string, PosturalDeviation>();
  for (const d of deviations) {
    const key = `${d.joint}.${d.parameter}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...d });
    } else {
      existing.deviationDegrees += d.deviationDegrees;
      existing.reason = `${existing.reason}; ${d.reason}`;
    }
  }
  return Array.from(map.values());
}

export function computePathologyCompensation(
  overrides: Record<string, MuscleOverride>
): PathologyCompensationResult {
  const result: PathologyCompensationResult = {
    compensatoryOverrides: {},
    romRestrictions: [],
    posturalDeviations: [],
    clinicalFindings: [],
  };

  const muscleToGroup = getMuscleToGroupMap();

  const groupPathologies: Record<string, { pathology: PathologyType; sources: string[] }> = {};

  for (const [muscleId, override] of Object.entries(overrides)) {
    if (!override?.isManual || override.pathology === 'none') continue;

    let groupId = muscleId;
    if (!PATHOLOGY_COMPENSATION_MAP[muscleId]) {
      const mapped = muscleToGroup[muscleId];
      if (mapped) groupId = mapped;
    }

    if (PATHOLOGY_COMPENSATION_MAP[groupId]) {
      if (!groupPathologies[groupId]) {
        groupPathologies[groupId] = { pathology: override.pathology, sources: [] };
      }
      groupPathologies[groupId].sources.push(muscleId);
      if (override.pathology !== groupPathologies[groupId].pathology) {
        const sevOrder: PathologyType[] = ['strain', 'tendinopathy', 'weakness', 'spasm', 'fibrosis', 'trigger_point', 'inflammation', 'none'];
        if (sevOrder.indexOf(override.pathology) < sevOrder.indexOf(groupPathologies[groupId].pathology)) {
          groupPathologies[groupId].pathology = override.pathology;
        }
      }
    }
  }

  for (const [groupId, { pathology }] of Object.entries(groupPathologies)) {
    const patterns = PATHOLOGY_COMPENSATION_MAP[groupId];
    if (!patterns) continue;

    const matching = patterns.find(p => p.pathologyTypes.includes(pathology));
    if (!matching) continue;

    for (const synergist of matching.synergists) {
      if (!result.compensatoryOverrides[synergist.muscleGroupId]) {
        result.compensatoryOverrides[synergist.muscleGroupId] = {};
      }
      const comp = result.compensatoryOverrides[synergist.muscleGroupId];
      comp.tensionOffset = (comp.tensionOffset || 0) + synergist.tensionIncrease;
      comp.activationOffset = (comp.activationOffset || 0) + synergist.activationIncrease;
    }

    result.romRestrictions.push(...matching.romRestrictions);
    result.posturalDeviations.push(...matching.posturalDeviations);

    result.clinicalFindings.push({
      severity: matching.severity,
      title: matching.clinicalTitle,
      description: matching.clinicalDescription,
      muscleSource: groupId,
      pathology,
    });
  }

  const rcEffects = computeRotatorCuffEffects(overrides);
  mergeCompensationResults(result, rcEffects);

  result.romRestrictions = deduplicateRomRestrictions(result.romRestrictions);
  result.posturalDeviations = deduplicatePosturalDeviations(result.posturalDeviations);

  return result;
}

// =====================================================================
// Active-Movement literature overlays
// =====================================================================
// Per-pattern literature-derived starting values for active capacity.
// Looked up by `${groupId}:${pathology}` and merged onto each
// CompensationPattern at read time so the existing entries stay
// untouched. Use `getActiveCapacityFromPathologies` to project these
// across a list of active patterns into a per-joint × per-direction
// active-capacity profile.
const LITERATURE_ACTIVE_OVERLAYS: Record<string, {
  painfulArcs?: PainfulArc[];
  activeStrengthReductionPercent?: number;
  painInhibitionFactor?: number;
}> = {
  // Frozen shoulder (adhesive capsulitis) — capsular fibrosis around the GH joint.
  'scapula_l:fibrosis': {
    painfulArcs: [
      { joint: 'leftShoulder', movement: 'abduction', startAngle: 60, endAngle: 120, painIntensity: 7 },
      { joint: 'leftShoulder', movement: 'flexion', startAngle: 90, endAngle: 140, painIntensity: 6 },
      { joint: 'leftShoulder', movement: 'externalRotation', startAngle: 20, endAngle: 60, painIntensity: 7 },
    ],
    activeStrengthReductionPercent: 50,
    painInhibitionFactor: 0.6,
  },
  'scapula_r:fibrosis': {
    painfulArcs: [
      { joint: 'rightShoulder', movement: 'abduction', startAngle: 60, endAngle: 120, painIntensity: 7 },
      { joint: 'rightShoulder', movement: 'flexion', startAngle: 90, endAngle: 140, painIntensity: 6 },
      { joint: 'rightShoulder', movement: 'externalRotation', startAngle: 20, endAngle: 60, painIntensity: 7 },
    ],
    activeStrengthReductionPercent: 50,
    painInhibitionFactor: 0.6,
  },
  // Rotator cuff tendinopathy — classic 60-120° painful arc in abduction.
  'deltoid_l:tendinopathy': {
    painfulArcs: [
      { joint: 'leftShoulder', movement: 'abduction', startAngle: 60, endAngle: 120, painIntensity: 6 },
    ],
    activeStrengthReductionPercent: 30,
    painInhibitionFactor: 0.4,
  },
  'deltoid_r:tendinopathy': {
    painfulArcs: [
      { joint: 'rightShoulder', movement: 'abduction', startAngle: 60, endAngle: 120, painIntensity: 6 },
    ],
    activeStrengthReductionPercent: 30,
    painInhibitionFactor: 0.4,
  },
  // Meniscus tear — painful end-range knee flexion.
  'quad_l:weakness': {
    painfulArcs: [
      { joint: 'leftKnee', movement: 'flexion', startAngle: 90, endAngle: 110, painIntensity: 6 },
    ],
    activeStrengthReductionPercent: 25,
    painInhibitionFactor: 0.4,
  },
  'quad_r:weakness': {
    painfulArcs: [
      { joint: 'rightKnee', movement: 'flexion', startAngle: 90, endAngle: 110, painIntensity: 6 },
    ],
    activeStrengthReductionPercent: 25,
    painInhibitionFactor: 0.4,
  },
  // Achilles tendinopathy — painful at end-range plantarflexion / loaded dorsiflexion.
  'calf_l:tendinopathy': {
    painfulArcs: [
      { joint: 'leftAnkle', movement: 'plantarflexion', startAngle: 30, endAngle: 50, painIntensity: 5 },
    ],
    activeStrengthReductionPercent: 30,
    painInhibitionFactor: 0.3,
  },
  'calf_r:tendinopathy': {
    painfulArcs: [
      { joint: 'rightAnkle', movement: 'plantarflexion', startAngle: 30, endAngle: 50, painIntensity: 5 },
    ],
    activeStrengthReductionPercent: 30,
    painInhibitionFactor: 0.3,
  },
  // Plantar fasciitis — pain at end-range dorsiflexion (windlass tension).
  'calf_l:fibrosis': {
    painfulArcs: [
      { joint: 'leftAnkle', movement: 'dorsiflexion', startAngle: 5, endAngle: 20, painIntensity: 5 },
    ],
    activeStrengthReductionPercent: 10,
    painInhibitionFactor: 0.2,
  },
  'calf_r:fibrosis': {
    painfulArcs: [
      { joint: 'rightAnkle', movement: 'dorsiflexion', startAngle: 5, endAngle: 20, painIntensity: 5 },
    ],
    activeStrengthReductionPercent: 10,
    painInhibitionFactor: 0.2,
  },
  // Acute low-back HNP — guarded lumbar flexion, severe pain inhibition.
  'spine:spasm': {
    painfulArcs: [
      { joint: 'lumbar_spine', movement: 'flexion', startAngle: 20, endAngle: 60, painIntensity: 8 },
    ],
    activeStrengthReductionPercent: 60,
    painInhibitionFactor: 0.7,
  },
  'spine:strain': {
    painfulArcs: [
      { joint: 'lumbar_spine', movement: 'flexion', startAngle: 25, endAngle: 60, painIntensity: 6 },
      { joint: 'lumbar_spine', movement: 'extension', startAngle: 10, endAngle: 25, painIntensity: 5 },
    ],
    activeStrengthReductionPercent: 35,
    painInhibitionFactor: 0.5,
  },
};

const PASSIVE_ROM_TABLE: Record<string, Record<string, [number, number]>> = {
  leftShoulder:  { flexion: [0, 180], abduction: [0, 180], extension: [0, 60], internalRotation: [0, 70], externalRotation: [0, 90] },
  rightShoulder: { flexion: [0, 180], abduction: [0, 180], extension: [0, 60], internalRotation: [0, 70], externalRotation: [0, 90] },
  leftHip:       { flexion: [0, 120], extension: [0, 30], abduction: [0, 45], adduction: [0, 30], internalRotation: [0, 45], externalRotation: [0, 45] },
  rightHip:      { flexion: [0, 120], extension: [0, 30], abduction: [0, 45], adduction: [0, 30], internalRotation: [0, 45], externalRotation: [0, 45] },
  leftKnee:      { flexion: [0, 140], extension: [0, 0] },
  rightKnee:     { flexion: [0, 140], extension: [0, 0] },
  leftAnkle:     { dorsiflexion: [0, 20], plantarflexion: [0, 50], inversion: [0, 35], eversion: [0, 20] },
  rightAnkle:    { dorsiflexion: [0, 20], plantarflexion: [0, 50], inversion: [0, 35], eversion: [0, 20] },
  lumbar_spine:  { flexion: [0, 60], extension: [0, 25], rotation: [0, 5], lateralFlexion: [0, 25] },
  cervical_spine:{ flexion: [0, 50], extension: [0, 60], rotation: [0, 80], lateralFlexion: [0, 45] },
  thoracic_spine:{ flexion: [0, 40], extension: [0, 20], rotation: [0, 35], lateralFlexion: [0, 25] },
  leftElbow:     { flexion: [0, 140] },
  rightElbow:    { flexion: [0, 140] },
};

export function buildDefaultActiveCapacity(): ActiveCapacityProfile {
  // Default = passive ROM × 0.85, no painful arc, 100% strength, 0 inhibition.
  const out: ActiveCapacityProfile = {};
  for (const [joint, dirs] of Object.entries(PASSIVE_ROM_TABLE)) {
    for (const [movement, [pmin, pmax]] of Object.entries(dirs)) {
      const span = pmax - pmin;
      out[`${joint}:${movement}`] = {
        joint, movement,
        passiveRomMin: pmin, passiveRomMax: pmax,
        activeRomMin: pmin, activeRomMax: pmin + span * 0.85,
        painfulArc: null,
        activeStrengthPct: 100,
        painInhibitionFactor: 0,
        source: 'pathology-baseline',
      };
    }
  }
  return out;
}

/**
 * Aggregate literature-derived active capacity adjustments across a set
 * of active pathologies (group + pathology pairs). Returns a profile
 * built on top of `buildDefaultActiveCapacity`. Used as a deterministic
 * baseline before AI fills in case-specific values.
 */
export function getActiveCapacityFromPathologies(
  pathologies: Array<{ groupId: string; pathology: PathologyType }>
): ActiveCapacityProfile {
  const profile = buildDefaultActiveCapacity();
  for (const { groupId, pathology } of pathologies) {
    const overlay = LITERATURE_ACTIVE_OVERLAYS[`${groupId}:${pathology}`];
    if (!overlay) continue;
    // Apply painful arcs to matching joint/movement rows.
    for (const arc of overlay.painfulArcs || []) {
      const key = `${arc.joint}:${arc.movement}`;
      const row = profile[key];
      if (!row) continue;
      // Take the most painful arc if multiple pathologies overlap.
      if (!row.painfulArc || row.painfulArc.intensity < arc.painIntensity) {
        row.painfulArc = { start: arc.startAngle, end: arc.endAngle, intensity: arc.painIntensity };
      }
      // Active ROM caps at the painful-arc end if pain ≥ 6 (guarded).
      if (arc.painIntensity >= 6 && row.activeRomMax > arc.endAngle) {
        row.activeRomMax = arc.endAngle;
      }
    }
    // Apply per-joint strength + inhibition reductions to every direction
    // of each joint touched by the overlay's painful arcs.
    const touchedJoints = new Set((overlay.painfulArcs || []).map(a => a.joint));
    for (const j of touchedJoints) {
      for (const key of Object.keys(profile)) {
        if (!key.startsWith(`${j}:`)) continue;
        const row = profile[key];
        if (overlay.activeStrengthReductionPercent !== undefined) {
          const target = Math.max(0, 100 - overlay.activeStrengthReductionPercent);
          if (target < row.activeStrengthPct) row.activeStrengthPct = target;
        }
        if (overlay.painInhibitionFactor !== undefined) {
          if (overlay.painInhibitionFactor > row.painInhibitionFactor) {
            row.painInhibitionFactor = overlay.painInhibitionFactor;
          }
        }
      }
    }
  }
  return profile;
}
