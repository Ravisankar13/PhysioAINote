export interface ClinicalPosturePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  joints: Record<string, Record<string, number>>;
}

export interface PresetCategory {
  id: string;
  label: string;
  presets: ClinicalPosturePreset[];
}

const PRESETS: ClinicalPosturePreset[] = [
  {
    id: 'upper_crossed_syndrome',
    name: 'Upper Crossed Syndrome',
    category: 'postural_syndromes',
    description: 'Forward head, increased thoracic kyphosis, scapular protraction, shoulder internal rotation',
    joints: {
      spine: { forwardHead: 25, thoracicKyphosis: 30, cervicalLordosis: 15 },
      neck: { flexion: 15, forwardHead: 20 },
      leftShoulder: { internalRotation: 20, protraction: 15 },
      rightShoulder: { internalRotation: 20, protraction: 15 },
      leftScapula: { protraction: 20, anteriorTilt: 10 },
      rightScapula: { protraction: 20, anteriorTilt: 10 },
    }
  },
  {
    id: 'lower_crossed_syndrome',
    name: 'Lower Crossed Syndrome',
    category: 'postural_syndromes',
    description: 'Anterior pelvic tilt, increased lumbar lordosis, hip flexor tightness',
    joints: {
      pelvis: { tilt: 20 },
      spine: { lumbarLordosis: 30 },
      leftHip: { flexion: 15 },
      rightHip: { flexion: 15 },
    }
  },
  {
    id: 'forward_head_posture',
    name: 'Forward Head Posture',
    category: 'postural_syndromes',
    description: 'Head anterior to plumb line, upper cervical extension, lower cervical flexion',
    joints: {
      spine: { forwardHead: 30 },
      neck: { forwardHead: 25, flexion: 10 },
      leftScapula: { protraction: 10 },
      rightScapula: { protraction: 10 },
    }
  },
  {
    id: 'flat_back',
    name: 'Flat Back',
    category: 'spinal_deviations',
    description: 'Decreased lumbar lordosis, posterior pelvic tilt, reduced thoracic kyphosis',
    joints: {
      spine: { lumbarLordosis: -20, thoracicKyphosis: -10 },
      pelvis: { tilt: -15 },
    }
  },
  {
    id: 'swayback',
    name: 'Swayback',
    category: 'spinal_deviations',
    description: 'Posterior pelvic shift, thoracolumbar kyphosis, hip extension, forward head',
    joints: {
      spine: { thoracicKyphosis: 25, lumbarLordosis: -10, forwardHead: 20, lateralShift: 0 },
      pelvis: { tilt: -10 },
      neck: { forwardHead: 15 },
      leftHip: { extension: 10 },
      rightHip: { extension: 10 },
    }
  },
  {
    id: 'kyphotic_posture',
    name: 'Kyphotic Posture',
    category: 'spinal_deviations',
    description: 'Excessive thoracic kyphosis with compensatory cervical and lumbar changes',
    joints: {
      spine: { thoracicKyphosis: 40, cervicalLordosis: 15, forwardHead: 15 },
      leftScapula: { protraction: 15, anteriorTilt: 8 },
      rightScapula: { protraction: 15, anteriorTilt: 8 },
    }
  },
  {
    id: 'lordotic_posture',
    name: 'Lordotic Posture',
    category: 'spinal_deviations',
    description: 'Excessive lumbar lordosis with anterior pelvic tilt',
    joints: {
      spine: { lumbarLordosis: 35 },
      pelvis: { tilt: 25 },
      leftHip: { flexion: 10 },
      rightHip: { flexion: 10 },
    }
  },
  {
    id: 'scoliotic_lean_left',
    name: 'Scoliotic Lean (Left)',
    category: 'spinal_deviations',
    description: 'Left lateral trunk lean with compensatory curves',
    joints: {
      spine: { scoliosis: -15, lateralShift: -10, thoracicScoliosis: -12, lumbarScoliosis: 8 },
      pelvis: { obliquity: 5 },
    }
  },
  {
    id: 'scoliotic_lean_right',
    name: 'Scoliotic Lean (Right)',
    category: 'spinal_deviations',
    description: 'Right lateral trunk lean with compensatory curves',
    joints: {
      spine: { scoliosis: 15, lateralShift: 10, thoracicScoliosis: 12, lumbarScoliosis: -8 },
      pelvis: { obliquity: -5 },
    }
  },
  {
    id: 'antalgic_lean_left',
    name: 'Antalgic Lean (Left)',
    category: 'spinal_deviations',
    description: 'Pain-avoidance lateral shift to the left',
    joints: {
      spine: { lateralShift: -15, lumbarScoliosis: -8 },
      pelvis: { obliquity: 3 },
    }
  },
  {
    id: 'antalgic_lean_right',
    name: 'Antalgic Lean (Right)',
    category: 'spinal_deviations',
    description: 'Pain-avoidance lateral shift to the right',
    joints: {
      spine: { lateralShift: 15, lumbarScoliosis: 8 },
      pelvis: { obliquity: -3 },
    }
  },
  {
    id: 'genu_valgum',
    name: 'Genu Valgum',
    category: 'lower_limb',
    description: 'Bilateral knock knees with compensatory ankle and hip changes',
    joints: {
      leftKnee: { varus: -12 },
      rightKnee: { varus: -12 },
      leftAnkle: { eversion: 8 },
      rightAnkle: { eversion: 8 },
      leftHip: { adduction: 8, internalRotation: 10 },
      rightHip: { adduction: 8, internalRotation: 10 },
    }
  },
  {
    id: 'genu_varum',
    name: 'Genu Varum',
    category: 'lower_limb',
    description: 'Bilateral bow legs',
    joints: {
      leftKnee: { varus: 12 },
      rightKnee: { varus: 12 },
      leftAnkle: { inversion: 5 },
      rightAnkle: { inversion: 5 },
    }
  },
  {
    id: 'anterior_pelvic_tilt',
    name: 'Anterior Pelvic Tilt',
    category: 'lower_limb',
    description: 'Pelvis tilted forward, increased lumbar lordosis, hip flexor tightness',
    joints: {
      pelvis: { tilt: 20 },
      spine: { lumbarLordosis: 25 },
      leftHip: { flexion: 12 },
      rightHip: { flexion: 12 },
    }
  },
  {
    id: 'posterior_pelvic_tilt',
    name: 'Posterior Pelvic Tilt',
    category: 'lower_limb',
    description: 'Pelvis tilted backward, flattened lumbar curve',
    joints: {
      pelvis: { tilt: -18 },
      spine: { lumbarLordosis: -20 },
    }
  },
  {
    id: 'rounded_shoulders',
    name: 'Rounded Shoulders',
    category: 'upper_limb',
    description: 'Bilateral scapular protraction, shoulder internal rotation, increased thoracic kyphosis',
    joints: {
      leftShoulder: { internalRotation: 25, protraction: 15 },
      rightShoulder: { internalRotation: 25, protraction: 15 },
      leftScapula: { protraction: 25, anteriorTilt: 12 },
      rightScapula: { protraction: 25, anteriorTilt: 12 },
      spine: { thoracicKyphosis: 20 },
    }
  },
  {
    id: 'trendelenburg_left',
    name: 'Trendelenburg (Left)',
    category: 'gait_patterns',
    description: 'Left stance phase: contralateral pelvis drop indicating left hip abductor weakness',
    joints: {
      pelvis: { obliquity: -10 },
      leftHip: { abduction: 5 },
      spine: { lateralFlexion: 8 },
    }
  },
  {
    id: 'trendelenburg_right',
    name: 'Trendelenburg (Right)',
    category: 'gait_patterns',
    description: 'Right stance phase: contralateral pelvis drop indicating right hip abductor weakness',
    joints: {
      pelvis: { obliquity: 10 },
      rightHip: { abduction: 5 },
      spine: { lateralFlexion: -8 },
    }
  },
];

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'postural_syndromes', label: 'Postural Syndromes' },
  { id: 'spinal_deviations', label: 'Spinal Deviations' },
  { id: 'lower_limb', label: 'Lower Limb' },
  { id: 'upper_limb', label: 'Upper Limb' },
  { id: 'gait_patterns', label: 'Gait Patterns' },
];

export function getClinicalPresetCategories(): PresetCategory[] {
  return CATEGORIES.map(cat => ({
    ...cat,
    presets: PRESETS.filter(p => p.category === cat.id),
  }));
}

export function getPresetById(id: string): ClinicalPosturePreset | undefined {
  return PRESETS.find(p => p.id === id);
}

export function getAllPresets(): ClinicalPosturePreset[] {
  return PRESETS;
}

export function applyPresetToConfig(
  currentConfig: Record<string, any>,
  preset: ClinicalPosturePreset,
  defaultConfig: Record<string, any>
): Record<string, any> {
  const config = JSON.parse(JSON.stringify(defaultConfig));
  for (const [jointKey, params] of Object.entries(preset.joints)) {
    if (!config[jointKey]) config[jointKey] = {};
    for (const [param, value] of Object.entries(params)) {
      config[jointKey][param] = value;
    }
  }
  return config;
}

export const MODEL_CONFIG_JOINT_DESCRIPTIONS: Record<string, Record<string, string>> = {
  spine: {
    cervicalLordosis: 'Cervical lordosis curve (degrees)',
    thoracicKyphosis: 'Thoracic kyphosis curve (degrees, positive = more kyphotic)',
    lumbarLordosis: 'Lumbar lordosis curve (degrees, positive = more lordotic)',
    scoliosis: 'Overall lateral curvature (degrees, positive = right convexity)',
    forwardHead: 'Forward head position (degrees/cm)',
    lateralShift: 'Lateral trunk shift (degrees, positive = right shift)',
    cervicalRotation: 'Cervical rotation (degrees)',
    cervicalLateralFlexion: 'Cervical side bending (degrees)',
    thoracicRotation: 'Thoracic rotation (degrees)',
    lumbarRotation: 'Lumbar rotation (degrees)',
    flexion: 'Trunk forward flexion (degrees)',
    lateralFlexion: 'Trunk lateral flexion (degrees)',
    lumbarScoliosis: 'Lumbar scoliosis (degrees)',
    thoracicScoliosis: 'Thoracic scoliosis (degrees)',
    cervicalScoliosis: 'Cervical scoliosis (degrees)',
  },
  neck: {
    flexion: 'Neck flexion (degrees)',
    extension: 'Neck extension (degrees)',
    rotation: 'Neck rotation (degrees)',
    lateralFlexion: 'Neck lateral flexion (degrees)',
    forwardHead: 'Forward head posture (degrees)',
  },
  pelvis: {
    tilt: 'Pelvic tilt (degrees, positive = anterior)',
    obliquity: 'Pelvic obliquity (degrees, positive = right side up)',
    rotation: 'Pelvic rotation (degrees)',
    drop: 'Pelvic drop (for squats)',
  },
  leftHip: {
    flexion: 'Left hip flexion (degrees)',
    extension: 'Left hip extension (degrees)',
    abduction: 'Left hip abduction (degrees)',
    adduction: 'Left hip adduction (degrees)',
    internalRotation: 'Left hip internal rotation (degrees)',
    externalRotation: 'Left hip external rotation (degrees)',
  },
  rightHip: {
    flexion: 'Right hip flexion (degrees)',
    extension: 'Right hip extension (degrees)',
    abduction: 'Right hip abduction (degrees)',
    adduction: 'Right hip adduction (degrees)',
    internalRotation: 'Right hip internal rotation (degrees)',
    externalRotation: 'Right hip external rotation (degrees)',
  },
  leftKnee: {
    flexion: 'Left knee flexion (degrees)',
    varus: 'Left knee varus/valgus (degrees, positive = varus)',
  },
  rightKnee: {
    flexion: 'Right knee flexion (degrees)',
    varus: 'Right knee varus/valgus (degrees, positive = varus)',
  },
  leftAnkle: {
    dorsiflexion: 'Left ankle dorsiflexion (degrees)',
    plantarflexion: 'Left ankle plantarflexion (degrees)',
    inversion: 'Left ankle inversion (degrees)',
    eversion: 'Left ankle eversion (degrees)',
  },
  rightAnkle: {
    dorsiflexion: 'Right ankle dorsiflexion (degrees)',
    plantarflexion: 'Right ankle plantarflexion (degrees)',
    inversion: 'Right ankle inversion (degrees)',
    eversion: 'Right ankle eversion (degrees)',
  },
  leftShoulder: {
    flexion: 'Left shoulder flexion (degrees)',
    abduction: 'Left shoulder abduction (degrees)',
    internalRotation: 'Left shoulder internal rotation (degrees)',
    externalRotation: 'Left shoulder external rotation (degrees)',
    protraction: 'Left shoulder protraction (degrees)',
    elevation: 'Left shoulder elevation (degrees)',
  },
  rightShoulder: {
    flexion: 'Right shoulder flexion (degrees)',
    abduction: 'Right shoulder abduction (degrees)',
    internalRotation: 'Right shoulder internal rotation (degrees)',
    externalRotation: 'Right shoulder external rotation (degrees)',
    protraction: 'Right shoulder protraction (degrees)',
    elevation: 'Right shoulder elevation (degrees)',
  },
  leftScapula: {
    protraction: 'Left scapula protraction (degrees)',
    retraction: 'Left scapula retraction (degrees)',
    elevation: 'Left scapula elevation (degrees)',
    anteriorTilt: 'Left scapula anterior tilt (degrees)',
    winging: 'Left scapular winging (degrees)',
  },
  rightScapula: {
    protraction: 'Right scapula protraction (degrees)',
    retraction: 'Right scapula retraction (degrees)',
    elevation: 'Right scapula elevation (degrees)',
    anteriorTilt: 'Right scapula anterior tilt (degrees)',
    winging: 'Right scapular winging (degrees)',
  },
  leftElbow: {
    flexion: 'Left elbow flexion (degrees)',
    pronation: 'Left forearm pronation (degrees)',
  },
  rightElbow: {
    flexion: 'Right elbow flexion (degrees)',
    pronation: 'Right forearm pronation (degrees)',
  },
  leftWrist: {
    flexion: 'Left wrist flexion (degrees)',
    deviation: 'Left wrist deviation (degrees)',
  },
  rightWrist: {
    flexion: 'Right wrist flexion (degrees)',
    deviation: 'Right wrist deviation (degrees)',
  },
};

export function buildJointSchemaForAI(): string {
  const lines: string[] = [];
  lines.push('Available joint groups and their parameters (all values in degrees):');
  for (const [joint, params] of Object.entries(MODEL_CONFIG_JOINT_DESCRIPTIONS)) {
    const paramList = Object.entries(params).map(([k, desc]) => `    "${k}": ${desc}`).join('\n');
    lines.push(`  "${joint}": {\n${paramList}\n  }`);
  }
  return lines.join('\n');
}
