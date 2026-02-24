// Joint Constraints and Compensation Engine
// Models movement restrictions and compensatory patterns

export type JointType = 
  | 'cervical_spine' | 'thoracic_spine' | 'lumbar_spine'
  | 'pelvis'
  | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_scapula' | 'right_scapula';

export type MovementType = 
  | 'flexion' | 'extension' | 'rotation' | 'lateral_flexion'
  | 'abduction' | 'adduction' | 'internal_rotation' | 'external_rotation'
  | 'dorsiflexion' | 'plantarflexion' | 'inversion' | 'eversion'
  | 'anterior_tilt' | 'posterior_tilt' | 'obliquity'
  | 'upwardRotation';

export type ConstraintReason = 'pain' | 'stiffness' | 'weakness' | 'instability' | 'neural' | 'structural';

export interface JointConstraint {
  id: string;
  joint: JointType;
  movement: MovementType;
  maxROM: number; // Maximum allowed ROM in degrees
  normalROM: number; // Normal ROM for comparison
  reason: ConstraintReason;
  painLevel?: number; // 0-10
  isActive: boolean;
}

export interface CompensationPattern {
  sourceJoint: JointType;
  sourceMovement: MovementType;
  compensatingJoint: JointType;
  compensatingMovement: MovementType;
  compensationRatio: number; // How much the compensating joint takes over (0-1)
  additionalLoad: number; // Percentage increase in load
  clinicalNote: string;
}

export type WarningSeverity = 'moderate' | 'severe';

export interface ClinicalWarning {
  message: string;
  severity: WarningSeverity;
}

export interface CompensationResult {
  patterns: CompensationPattern[];
  totalCompensation: number;
  overloadedStructures: string[];
  clinicalWarnings: ClinicalWarning[];
  postureNotes: string[];
}

// Normal ROM values for each joint/movement combination
export const NORMAL_ROM: Record<JointType, Record<string, number>> = {
  cervical_spine: {
    flexion: 50,
    extension: 60,
    rotation: 80,
    lateral_flexion: 45,
  },
  thoracic_spine: {
    flexion: 40,
    extension: 20,
    rotation: 35,
    lateral_flexion: 25,
  },
  lumbar_spine: {
    flexion: 60,
    extension: 25,
    rotation: 5,
    lateral_flexion: 25,
  },
  pelvis: {
    anterior_tilt: 15,
    posterior_tilt: 15,
    obliquity: 10,
    rotation: 10,
  },
  left_hip: {
    flexion: 120,
    extension: 30,
    abduction: 45,
    adduction: 30,
    internal_rotation: 45,
    external_rotation: 45,
  },
  right_hip: {
    flexion: 120,
    extension: 30,
    abduction: 45,
    adduction: 30,
    internal_rotation: 45,
    external_rotation: 45,
  },
  left_knee: {
    flexion: 140,
    extension: 0,
  },
  right_knee: {
    flexion: 140,
    extension: 0,
  },
  left_ankle: {
    dorsiflexion: 20,
    plantarflexion: 50,
    inversion: 35,
    eversion: 20,
  },
  right_ankle: {
    dorsiflexion: 20,
    plantarflexion: 50,
    inversion: 35,
    eversion: 20,
  },
  left_shoulder: {
    flexion: 180,
    extension: 60,
    abduction: 180,
    adduction: 50,
    internal_rotation: 70,
    external_rotation: 90,
  },
  right_shoulder: {
    flexion: 180,
    extension: 60,
    abduction: 180,
    adduction: 50,
    internal_rotation: 70,
    external_rotation: 90,
  },
  left_scapula: {
    upwardRotation: 60,
  },
  right_scapula: {
    upwardRotation: 60,
  },
};

// Compensation chains - when one joint is restricted, adjacent joints compensate
const COMPENSATION_CHAINS: Array<{
  source: { joint: JointType; movement: MovementType };
  compensators: Array<{
    joint: JointType;
    movement: MovementType;
    ratio: number;
    loadIncrease: number;
    note: string;
  }>;
}> = [
  // Lumbar flexion restriction
  {
    source: { joint: 'lumbar_spine', movement: 'flexion' },
    compensators: [
      { joint: 'pelvis', movement: 'anterior_tilt', ratio: 0.4, loadIncrease: 25, note: 'Increased anterior pelvic tilt to compensate for lumbar stiffness' },
      { joint: 'left_hip', movement: 'flexion', ratio: 0.3, loadIncrease: 20, note: 'Hip flexion compensating for limited lumbar motion' },
      { joint: 'right_hip', movement: 'flexion', ratio: 0.3, loadIncrease: 20, note: 'Hip flexion compensating for limited lumbar motion' },
      { joint: 'thoracic_spine', movement: 'flexion', ratio: 0.2, loadIncrease: 30, note: 'Thoracic hypermobility compensating for lumbar restriction' },
    ],
  },
  // Lumbar extension restriction
  {
    source: { joint: 'lumbar_spine', movement: 'extension' },
    compensators: [
      { joint: 'pelvis', movement: 'anterior_tilt', ratio: 0.35, loadIncrease: 20, note: 'Pelvic tilt compensating for extension limitation' },
      { joint: 'left_hip', movement: 'extension', ratio: 0.25, loadIncrease: 25, note: 'Hip extension compensating for lumbar restriction' },
      { joint: 'right_hip', movement: 'extension', ratio: 0.25, loadIncrease: 25, note: 'Hip extension compensating for lumbar restriction' },
    ],
  },
  // Lumbar rotation restriction
  {
    source: { joint: 'lumbar_spine', movement: 'rotation' },
    compensators: [
      { joint: 'thoracic_spine', movement: 'rotation', ratio: 0.5, loadIncrease: 35, note: 'Thoracic spine rotation hypermobility' },
      { joint: 'pelvis', movement: 'rotation', ratio: 0.3, loadIncrease: 20, note: 'Pelvis rotation to achieve trunk rotation' },
      { joint: 'left_hip', movement: 'internal_rotation', ratio: 0.2, loadIncrease: 15, note: 'Hip rotation contributing to trunk rotation' },
    ],
  },
  // Hip flexion restriction (left)
  {
    source: { joint: 'left_hip', movement: 'flexion' },
    compensators: [
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.4, loadIncrease: 35, note: 'Increased lumbar flexion strain due to hip restriction' },
      { joint: 'pelvis', movement: 'posterior_tilt', ratio: 0.3, loadIncrease: 20, note: 'Posterior pelvic tilt to achieve hip flexion position' },
      { joint: 'left_knee', movement: 'flexion', ratio: 0.2, loadIncrease: 15, note: 'Knee flexion compensating for hip limitation' },
    ],
  },
  // Hip flexion restriction (right)
  {
    source: { joint: 'right_hip', movement: 'flexion' },
    compensators: [
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.4, loadIncrease: 35, note: 'Increased lumbar flexion strain due to hip restriction' },
      { joint: 'pelvis', movement: 'posterior_tilt', ratio: 0.3, loadIncrease: 20, note: 'Posterior pelvic tilt to achieve hip flexion position' },
      { joint: 'right_knee', movement: 'flexion', ratio: 0.2, loadIncrease: 15, note: 'Knee flexion compensating for hip limitation' },
    ],
  },
  // Hip internal rotation restriction
  {
    source: { joint: 'left_hip', movement: 'internal_rotation' },
    compensators: [
      { joint: 'lumbar_spine', movement: 'rotation', ratio: 0.35, loadIncrease: 30, note: 'Lumbar rotation compensating for hip rotation deficit' },
      { joint: 'left_knee', movement: 'flexion', ratio: 0.25, loadIncrease: 25, note: 'Knee valgus/rotation strain from hip compensation' },
      { joint: 'left_ankle', movement: 'eversion', ratio: 0.2, loadIncrease: 20, note: 'Ankle pronation to achieve rotation' },
    ],
  },
  {
    source: { joint: 'right_hip', movement: 'internal_rotation' },
    compensators: [
      { joint: 'lumbar_spine', movement: 'rotation', ratio: 0.35, loadIncrease: 30, note: 'Lumbar rotation compensating for hip rotation deficit' },
      { joint: 'right_knee', movement: 'flexion', ratio: 0.25, loadIncrease: 25, note: 'Knee valgus/rotation strain from hip compensation' },
      { joint: 'right_ankle', movement: 'eversion', ratio: 0.2, loadIncrease: 20, note: 'Ankle pronation to achieve rotation' },
    ],
  },
  // Ankle dorsiflexion restriction
  {
    source: { joint: 'left_ankle', movement: 'dorsiflexion' },
    compensators: [
      { joint: 'left_knee', movement: 'flexion', ratio: 0.35, loadIncrease: 25, note: 'Excessive knee flexion to compensate for ankle restriction' },
      { joint: 'left_hip', movement: 'flexion', ratio: 0.3, loadIncrease: 20, note: 'Hip flexion compensation during squat/gait' },
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.2, loadIncrease: 30, note: 'Forward trunk lean from ankle restriction' },
    ],
  },
  {
    source: { joint: 'right_ankle', movement: 'dorsiflexion' },
    compensators: [
      { joint: 'right_knee', movement: 'flexion', ratio: 0.35, loadIncrease: 25, note: 'Excessive knee flexion to compensate for ankle restriction' },
      { joint: 'right_hip', movement: 'flexion', ratio: 0.3, loadIncrease: 20, note: 'Hip flexion compensation during squat/gait' },
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.2, loadIncrease: 30, note: 'Forward trunk lean from ankle restriction' },
    ],
  },
  // Cervical rotation restriction
  {
    source: { joint: 'cervical_spine', movement: 'rotation' },
    compensators: [
      { joint: 'thoracic_spine', movement: 'rotation', ratio: 0.6, loadIncrease: 35, note: 'Thoracic rotation hypermobility compensating for cervical restriction' },
      { joint: 'left_shoulder', movement: 'internal_rotation', ratio: 0.2, loadIncrease: 15, note: 'Shoulder rotation to achieve head turn' },
    ],
  },
  // Thoracic rotation restriction
  {
    source: { joint: 'thoracic_spine', movement: 'rotation' },
    compensators: [
      { joint: 'cervical_spine', movement: 'rotation', ratio: 0.3, loadIncrease: 30, note: 'Cervical hypermobility compensating for thoracic stiffness' },
      { joint: 'lumbar_spine', movement: 'rotation', ratio: 0.4, loadIncrease: 40, note: 'Lumbar rotation overload (lumbar spine not designed for rotation)' },
    ],
  },
  // Knee flexion restriction
  {
    source: { joint: 'left_knee', movement: 'flexion' },
    compensators: [
      { joint: 'left_hip', movement: 'flexion', ratio: 0.4, loadIncrease: 25, note: 'Hip flexion compensating for knee limitation' },
      { joint: 'left_ankle', movement: 'dorsiflexion', ratio: 0.3, loadIncrease: 20, note: 'Ankle dorsiflexion strain during stance' },
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.2, loadIncrease: 25, note: 'Trunk lean forward to lower body' },
    ],
  },
  {
    source: { joint: 'right_knee', movement: 'flexion' },
    compensators: [
      { joint: 'right_hip', movement: 'flexion', ratio: 0.4, loadIncrease: 25, note: 'Hip flexion compensating for knee limitation' },
      { joint: 'right_ankle', movement: 'dorsiflexion', ratio: 0.3, loadIncrease: 20, note: 'Ankle dorsiflexion strain during stance' },
      { joint: 'lumbar_spine', movement: 'flexion', ratio: 0.2, loadIncrease: 25, note: 'Trunk lean forward to lower body' },
    ],
  },
  // Shoulder flexion restriction - GH joint stiff → scapula, thoracic, lumbar compensate
  {
    source: { joint: 'left_shoulder', movement: 'flexion' },
    compensators: [
      { joint: 'left_scapula', movement: 'upwardRotation', ratio: 0.3, loadIncrease: 25, note: 'Increased scapular upward rotation to compensate for GH stiffness' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension to achieve overhead reach' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperlordosis during overhead activities' },
      { joint: 'pelvis', movement: 'anterior_tilt', ratio: 0.15, loadIncrease: 20, note: 'Anterior pelvic tilt to extend trunk for overhead reach' },
    ],
  },
  {
    source: { joint: 'right_shoulder', movement: 'flexion' },
    compensators: [
      { joint: 'right_scapula', movement: 'upwardRotation', ratio: 0.3, loadIncrease: 25, note: 'Increased scapular upward rotation to compensate for GH stiffness' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension to achieve overhead reach' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperlordosis during overhead activities' },
      { joint: 'pelvis', movement: 'anterior_tilt', ratio: 0.15, loadIncrease: 20, note: 'Anterior pelvic tilt to extend trunk for overhead reach' },
    ],
  },
  // Shoulder abduction restriction
  {
    source: { joint: 'left_shoulder', movement: 'abduction' },
    compensators: [
      { joint: 'left_scapula', movement: 'upwardRotation', ratio: 0.3, loadIncrease: 25, note: 'Increased scapular upward rotation during abduction' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.2, loadIncrease: 25, note: 'Thoracic extension to assist lateral elevation' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.15, loadIncrease: 30, note: 'Lumbar side-bend and extension during abduction' },
    ],
  },
  {
    source: { joint: 'right_shoulder', movement: 'abduction' },
    compensators: [
      { joint: 'right_scapula', movement: 'upwardRotation', ratio: 0.3, loadIncrease: 25, note: 'Increased scapular upward rotation during abduction' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.2, loadIncrease: 25, note: 'Thoracic extension to assist lateral elevation' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.15, loadIncrease: 30, note: 'Lumbar side-bend and extension during abduction' },
    ],
  },
  // Shoulder internal rotation restriction → cervical, contralateral shoulder compensate
  {
    source: { joint: 'left_shoulder', movement: 'internal_rotation' },
    compensators: [
      { joint: 'left_scapula', movement: 'upwardRotation', ratio: 0.25, loadIncrease: 25, note: 'Scapular protraction compensating for GH internal rotation deficit' },
      { joint: 'thoracic_spine', movement: 'rotation', ratio: 0.3, loadIncrease: 30, note: 'Thoracic rotation compensating for shoulder internal rotation loss' },
      { joint: 'cervical_spine', movement: 'rotation', ratio: 0.15, loadIncrease: 20, note: 'Cervical rotation contributing to reaching movements' },
    ],
  },
  {
    source: { joint: 'right_shoulder', movement: 'internal_rotation' },
    compensators: [
      { joint: 'right_scapula', movement: 'upwardRotation', ratio: 0.25, loadIncrease: 25, note: 'Scapular protraction compensating for GH internal rotation deficit' },
      { joint: 'thoracic_spine', movement: 'rotation', ratio: 0.3, loadIncrease: 30, note: 'Thoracic rotation compensating for shoulder internal rotation loss' },
      { joint: 'cervical_spine', movement: 'rotation', ratio: 0.15, loadIncrease: 20, note: 'Cervical rotation contributing to reaching movements' },
    ],
  },
  // Shoulder external rotation restriction → scapula retraction, thoracic compensate
  {
    source: { joint: 'left_shoulder', movement: 'external_rotation' },
    compensators: [
      { joint: 'left_scapula', movement: 'upwardRotation', ratio: 0.2, loadIncrease: 25, note: 'Scapular posterior tilt/upward rotation compensating for GH external rotation deficit' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension to achieve cocking/throwing position' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperextension during overhead/throwing activities' },
    ],
  },
  {
    source: { joint: 'right_shoulder', movement: 'external_rotation' },
    compensators: [
      { joint: 'right_scapula', movement: 'upwardRotation', ratio: 0.2, loadIncrease: 25, note: 'Scapular posterior tilt/upward rotation compensating for GH external rotation deficit' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension to achieve cocking/throwing position' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperextension during overhead/throwing activities' },
    ],
  },
  // Scapula upward rotation restriction → GH, thoracic, lumbar compensate
  {
    source: { joint: 'left_scapula', movement: 'upwardRotation' },
    compensators: [
      { joint: 'left_shoulder', movement: 'flexion', ratio: 0.2, loadIncrease: 30, note: 'GH joint forced beyond normal range - risk of subacromial impingement' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension compensating for scapular restriction' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperlordosis from scapular dysfunction' },
    ],
  },
  {
    source: { joint: 'right_scapula', movement: 'upwardRotation' },
    compensators: [
      { joint: 'right_shoulder', movement: 'flexion', ratio: 0.2, loadIncrease: 30, note: 'GH joint forced beyond normal range - risk of subacromial impingement' },
      { joint: 'thoracic_spine', movement: 'extension', ratio: 0.25, loadIncrease: 30, note: 'Thoracic extension compensating for scapular restriction' },
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.2, loadIncrease: 35, note: 'Lumbar hyperlordosis from scapular dysfunction' },
    ],
  },
  // Thoracic extension restriction → lumbar and pelvis compensate
  {
    source: { joint: 'thoracic_spine', movement: 'extension' },
    compensators: [
      { joint: 'lumbar_spine', movement: 'extension', ratio: 0.4, loadIncrease: 40, note: 'Lumbar hyperlordosis compensating for thoracic stiffness' },
      { joint: 'pelvis', movement: 'anterior_tilt', ratio: 0.2, loadIncrease: 25, note: 'Anterior pelvic tilt from thoracic restriction' },
    ],
  },
];

// Structure overload mapping - which structures get overloaded for each compensation
const OVERLOAD_STRUCTURES: Record<string, string[]> = {
  'lumbar_spine:flexion': ['L4-L5 disc', 'L5-S1 disc', 'Posterior longitudinal ligament', 'Multifidus'],
  'lumbar_spine:extension': ['Facet joints', 'Pars interarticularis', 'Interspinous ligaments'],
  'lumbar_spine:rotation': ['Annulus fibrosus', 'Facet joint capsules', 'Intertransverse ligaments'],
  'thoracic_spine:flexion': ['T8-T12 discs', 'Costovertebral joints', 'Erector spinae'],
  'thoracic_spine:rotation': ['Rib articulations', 'Costovertebral joints', 'Thoracolumbar fascia'],
  'cervical_spine:rotation': ['C1-C2 articulation', 'Alar ligaments', 'Sternocleidomastoid'],
  'pelvis:anterior_tilt': ['Hip flexors', 'Lumbar facets', 'Sacroiliac joint'],
  'pelvis:posterior_tilt': ['Hamstrings', 'Gluteus maximus', 'Sacroiliac joint'],
  'left_hip:flexion': ['Hip labrum', 'Rectus femoris', 'Iliopsoas'],
  'right_hip:flexion': ['Hip labrum', 'Rectus femoris', 'Iliopsoas'],
  'left_hip:internal_rotation': ['Hip labrum', 'Piriformis', 'Hip capsule'],
  'right_hip:internal_rotation': ['Hip labrum', 'Piriformis', 'Hip capsule'],
  'left_knee:flexion': ['Patellofemoral joint', 'Quadriceps tendon', 'Patellar tendon'],
  'right_knee:flexion': ['Patellofemoral joint', 'Quadriceps tendon', 'Patellar tendon'],
  'left_ankle:dorsiflexion': ['Achilles tendon', 'Tibialis anterior', 'Ankle mortise'],
  'right_ankle:dorsiflexion': ['Achilles tendon', 'Tibialis anterior', 'Ankle mortise'],
  'left_shoulder:flexion': ['Subacromial space', 'Supraspinatus tendon', 'Superior labrum', 'Inferior GH ligament'],
  'right_shoulder:flexion': ['Subacromial space', 'Supraspinatus tendon', 'Superior labrum', 'Inferior GH ligament'],
  'left_shoulder:abduction': ['Subacromial space', 'Supraspinatus tendon', 'Acromioclavicular joint', 'Rotator cuff'],
  'right_shoulder:abduction': ['Subacromial space', 'Supraspinatus tendon', 'Acromioclavicular joint', 'Rotator cuff'],
  'left_shoulder:internal_rotation': ['Anterior GH capsule', 'Subscapularis tendon', 'Anterior labrum', 'Middle GH ligament'],
  'right_shoulder:internal_rotation': ['Anterior GH capsule', 'Subscapularis tendon', 'Anterior labrum', 'Middle GH ligament'],
  'left_shoulder:external_rotation': ['Posterior GH capsule', 'Infraspinatus tendon', 'Teres minor', 'Posterior labrum'],
  'right_shoulder:external_rotation': ['Posterior GH capsule', 'Infraspinatus tendon', 'Teres minor', 'Posterior labrum'],
  'left_scapula:upwardRotation': ['Serratus anterior', 'Lower trapezius', 'Pectoralis minor', 'Scapulothoracic joint'],
  'right_scapula:upwardRotation': ['Serratus anterior', 'Lower trapezius', 'Pectoralis minor', 'Scapulothoracic joint'],
  'thoracic_spine:extension': ['T8-T12 facet joints', 'Costovertebral joints', 'Erector spinae', 'Thoracolumbar fascia'],
  'cervical_spine:extension': ['C4-C6 facet joints', 'Suboccipital muscles', 'Posterior cervical ligaments'],
  'left_hip:extension': ['Hip flexor complex', 'Anterior hip capsule', 'Lumbar facet joints'],
  'right_hip:extension': ['Hip flexor complex', 'Anterior hip capsule', 'Lumbar facet joints'],
  'left_ankle:eversion': ['Peroneal tendons', 'Lateral ankle ligaments', 'Subtalar joint'],
  'right_ankle:eversion': ['Peroneal tendons', 'Lateral ankle ligaments', 'Subtalar joint'],
};

export interface PostureDeviation {
  joint: JointType;
  movement: MovementType;
  deviationPercent: number;
  description: string;
}

export interface PostureContext {
  deviations: PostureDeviation[];
}

const POSTURE_DEVIATION_MAP: {
  configPath: string;
  configProp: string;
  joint: JointType;
  movement: MovementType;
  maxDeviation: number;
  description: (val: number) => string;
}[] = [
  { configPath: 'leftScapula', configProp: 'winging', joint: 'left_scapula', movement: 'upwardRotation', maxDeviation: 30, description: (v) => `Left scapula winging ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'rightScapula', configProp: 'winging', joint: 'right_scapula', movement: 'upwardRotation', maxDeviation: 30, description: (v) => `Right scapula winging ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'leftScapula', configProp: 'protraction', joint: 'left_scapula', movement: 'upwardRotation', maxDeviation: 25, description: (v) => `Left scapula protracted ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'rightScapula', configProp: 'protraction', joint: 'right_scapula', movement: 'upwardRotation', maxDeviation: 25, description: (v) => `Right scapula protracted ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'leftScapula', configProp: 'anteriorTilt', joint: 'left_scapula', movement: 'upwardRotation', maxDeviation: 20, description: (v) => `Left scapula anterior tilt ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'rightScapula', configProp: 'anteriorTilt', joint: 'right_scapula', movement: 'upwardRotation', maxDeviation: 20, description: (v) => `Right scapula anterior tilt ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'spine', configProp: 'thoracicKyphosis', joint: 'thoracic_spine', movement: 'extension', maxDeviation: 40, description: (v) => `Increased thoracic kyphosis ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'spine', configProp: 'lumbarLordosis', joint: 'lumbar_spine', movement: 'extension', maxDeviation: 35, description: (v) => `Increased lumbar lordosis ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'pelvis', configProp: 'tilt', joint: 'pelvis', movement: 'anterior_tilt', maxDeviation: 25, description: (v) => `Anterior pelvic tilt ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'leftShoulder', configProp: 'protraction', joint: 'left_shoulder', movement: 'flexion', maxDeviation: 20, description: (v) => `Left shoulder protracted ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'rightShoulder', configProp: 'protraction', joint: 'right_shoulder', movement: 'flexion', maxDeviation: 20, description: (v) => `Right shoulder protracted ${Math.abs(v).toFixed(0)}°` },
  { configPath: 'spine', configProp: 'forwardHead', joint: 'cervical_spine', movement: 'extension', maxDeviation: 20, description: (v) => `Forward head posture ${Math.abs(v).toFixed(0)}°` },
];

export function computePostureDeviations(modelConfig: Record<string, Record<string, number | undefined> | undefined>): PostureContext {
  const deviations: PostureDeviation[] = [];
  const jointDeviationAccum = new Map<string, { total: number; descriptions: string[] }>();

  for (const mapping of POSTURE_DEVIATION_MAP) {
    const section = modelConfig[mapping.configPath];
    if (!section) continue;
    const value = section[mapping.configProp];
    if (value === undefined || value === 0) continue;

    const absVal = Math.abs(value);
    const deviationPercent = Math.min(absVal / mapping.maxDeviation, 1.0);

    if (deviationPercent > 0.05) {
      const key = `${mapping.joint}:${mapping.movement}`;
      const existing = jointDeviationAccum.get(key) || { total: 0, descriptions: [] };
      existing.total = Math.min(existing.total + deviationPercent * 0.6, 0.95);
      existing.descriptions.push(mapping.description(value));
      jointDeviationAccum.set(key, existing);
    }
  }

  for (const [key, accum] of Array.from(jointDeviationAccum.entries())) {
    const [joint, movement] = key.split(':');
    deviations.push({
      joint: joint as JointType,
      movement: movement as MovementType,
      deviationPercent: accum.total,
      description: accum.descriptions.join(', '),
    });
  }

  return { deviations };
}

// Calculate compensation patterns for a set of constraints
export function calculateCompensations(constraints: JointConstraint[], postureContext?: PostureContext): CompensationResult {
  const patterns: CompensationPattern[] = [];
  const overloadedStructures = new Set<string>();
  const clinicalWarnings: ClinicalWarning[] = [];
  const postureNotes: string[] = [];
  let totalCompensation = 0;

  const activeConstraints = constraints.filter(c => c.isActive);

  const getPostureDeviation = (joint: JointType, movement: MovementType): number => {
    if (!postureContext) return 0;
    const matching = postureContext.deviations.filter(d => d.joint === joint && d.movement === movement);
    if (matching.length === 0) return 0;
    return Math.max(...matching.map(d => d.deviationPercent));
  };

  const addedPostureNotes = new Set<string>();

  for (const constraint of activeConstraints) {
    const restrictionRatio = 1 - (constraint.maxROM / constraint.normalROM);
    
    const chain = COMPENSATION_CHAINS.find(
      c => c.source.joint === constraint.joint && c.source.movement === constraint.movement
    );

    if (chain) {
      let excessLoad = 0;
      const compensatorResults: { compensator: typeof chain.compensators[0]; effectiveRatio: number; additionalLoad: number; postureReduction: number }[] = [];

      for (const compensator of chain.compensators) {
        const compensatorConstrained = activeConstraints.find(
          c => c.joint === compensator.joint && c.movement === compensator.movement
        );

        let effectiveRatio = compensator.ratio * restrictionRatio;
        let additionalLoad = compensator.loadIncrease * restrictionRatio;
        let postureReduction = 0;

        if (compensatorConstrained) {
          const compensatorRestriction = compensatorConstrained.maxROM / (NORMAL_ROM[compensatorConstrained.joint]?.[compensatorConstrained.movement] || 100);
          effectiveRatio *= compensatorRestriction;
          additionalLoad *= 1.5;
          clinicalWarnings.push({
            message: `Double restriction: ${formatJointName(constraint.joint)} ${constraint.movement} AND ${formatJointName(compensator.joint)} ${compensator.movement} - severe movement limitation`,
            severity: 'severe',
          });
        }

        const deviation = getPostureDeviation(compensator.joint, compensator.movement);
        if (deviation > 0) {
          postureReduction = deviation;
          const capacityRemaining = 1 - deviation;
          const lostRatio = effectiveRatio * deviation;
          effectiveRatio *= capacityRemaining;
          additionalLoad *= (1 + deviation * 0.5);
          excessLoad += lostRatio;

          if (!addedPostureNotes.has(`${compensator.joint}:${compensator.movement}`)) {
            addedPostureNotes.add(`${compensator.joint}:${compensator.movement}`);
            const matchingDev = postureContext!.deviations.find(d => d.joint === compensator.joint && d.movement === compensator.movement);
            const desc = matchingDev?.description || formatJointName(compensator.joint);
            postureNotes.push(
              `${desc} → ${Math.round(deviation * 100)}% compensation capacity reduced at ${formatJointName(compensator.joint)}`
            );
          }
        }

        compensatorResults.push({ compensator, effectiveRatio, additionalLoad, postureReduction });
      }

      if (excessLoad > 0) {
        const availableCompensators = compensatorResults.filter(r => r.postureReduction < 0.8);
        if (availableCompensators.length > 0) {
          const totalAvailableCapacity = availableCompensators.reduce((sum, r) => sum + (1 - r.postureReduction), 0);
          for (const r of availableCompensators) {
            const share = totalAvailableCapacity > 0 ? (1 - r.postureReduction) / totalAvailableCapacity : 1 / availableCompensators.length;
            r.effectiveRatio += excessLoad * share;
            r.additionalLoad += r.compensator.loadIncrease * excessLoad * share * 1.2;
          }
        } else {
          clinicalWarnings.push({
            message: `All compensating joints for ${formatJointName(constraint.joint)} ${constraint.movement} have reduced capacity due to posture — significant movement limitation`,
            severity: 'severe',
          });
        }
      }

      for (const r of compensatorResults) {
        if (r.effectiveRatio > 0.05) {
          let note = r.compensator.note;
          if (r.postureReduction > 0.3) {
            note += ` (capacity reduced by posture)`;
          }

          patterns.push({
            sourceJoint: constraint.joint,
            sourceMovement: constraint.movement,
            compensatingJoint: r.compensator.joint,
            compensatingMovement: r.compensator.movement,
            compensationRatio: r.effectiveRatio,
            additionalLoad: r.additionalLoad,
            clinicalNote: note,
          });

          totalCompensation += r.effectiveRatio;

          const structureKey = `${r.compensator.joint}:${r.compensator.movement}`;
          const structures = OVERLOAD_STRUCTURES[structureKey] || [];
          structures.forEach(s => overloadedStructures.add(s));
        }
      }
    }

    if (restrictionRatio > 0.85) {
      clinicalWarnings.push({
        message: `Severe ${constraint.movement} restriction at ${formatJointName(constraint.joint)} (${Math.round(restrictionRatio * 100)}% limited) — significant functional limitation`,
        severity: 'severe',
      });
    } else if (restrictionRatio > 0.5) {
      clinicalWarnings.push({
        message: `Moderate ${constraint.movement} restriction at ${formatJointName(constraint.joint)} (${Math.round(restrictionRatio * 100)}% limited) — compensatory patterns developing`,
        severity: 'moderate',
      });
    }
  }

  const compensatingJoints = new Set(patterns.map(p => p.compensatingJoint));
  const sourceJoints = new Set(activeConstraints.map(c => c.joint));
  
  Array.from(compensatingJoints).forEach(joint => {
    if (sourceJoints.has(joint)) {
      clinicalWarnings.push({
        message: `Compensation cascade detected: ${formatJointName(joint)} is both restricted and required to compensate for other restrictions`,
        severity: 'severe',
      });
    }
  });

  return {
    patterns,
    totalCompensation,
    overloadedStructures: Array.from(overloadedStructures),
    clinicalWarnings,
    postureNotes,
  };
}

function formatJointName(joint: JointType): string {
  return joint.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Get available movements for a joint
export function getJointMovements(joint: JointType): MovementType[] {
  const movements = Object.keys(NORMAL_ROM[joint] || {}) as MovementType[];
  return movements;
}

// Create a default constraint for a joint/movement
export function createDefaultConstraint(joint: JointType, movement: MovementType): JointConstraint {
  const normalROM = NORMAL_ROM[joint]?.[movement] || 0;
  return {
    id: `${joint}-${movement}-${Date.now()}`,
    joint,
    movement,
    maxROM: Math.round(normalROM * 0.5), // Default to 50% restriction
    normalROM,
    reason: 'stiffness',
    painLevel: 0,
    isActive: true,
  };
}

// Get joint display info
export function getJointDisplayInfo(joint: JointType): { name: string; icon: string; category: string } {
  const info: Record<JointType, { name: string; icon: string; category: string }> = {
    cervical_spine: { name: 'Cervical Spine', icon: '🦴', category: 'Spine' },
    thoracic_spine: { name: 'Thoracic Spine', icon: '🦴', category: 'Spine' },
    lumbar_spine: { name: 'Lumbar Spine', icon: '🦴', category: 'Spine' },
    pelvis: { name: 'Pelvis', icon: '🦴', category: 'Core' },
    left_hip: { name: 'Left Hip', icon: '🦿', category: 'Lower Limb' },
    right_hip: { name: 'Right Hip', icon: '🦿', category: 'Lower Limb' },
    left_knee: { name: 'Left Knee', icon: '🦵', category: 'Lower Limb' },
    right_knee: { name: 'Right Knee', icon: '🦵', category: 'Lower Limb' },
    left_ankle: { name: 'Left Ankle', icon: '🦶', category: 'Lower Limb' },
    right_ankle: { name: 'Right Ankle', icon: '🦶', category: 'Lower Limb' },
    left_shoulder: { name: 'Left Shoulder', icon: '💪', category: 'Upper Limb' },
    right_shoulder: { name: 'Right Shoulder', icon: '💪', category: 'Upper Limb' },
    left_scapula: { name: 'Left Scapula', icon: '🦴', category: 'Upper Limb' },
    right_scapula: { name: 'Right Scapula', icon: '🦴', category: 'Upper Limb' },
  };
  return info[joint];
}

export const REASON_LABELS: Record<ConstraintReason, { label: string; color: string }> = {
  pain: { label: 'Pain', color: 'text-red-500' },
  stiffness: { label: 'Stiffness', color: 'text-orange-500' },
  weakness: { label: 'Weakness', color: 'text-yellow-500' },
  instability: { label: 'Instability', color: 'text-purple-500' },
  neural: { label: 'Neural', color: 'text-blue-500' },
  structural: { label: 'Structural', color: 'text-gray-500' },
};
