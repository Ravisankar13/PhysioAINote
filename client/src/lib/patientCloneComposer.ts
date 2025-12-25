import { calculateFullBiomechanics, BiomechanicsResult } from './biomechanicsEngine';

export interface CapturedJointAngles {
  hipFlexion: { left: number; right: number };
  hipAbduction: { left: number; right: number };
  kneeFlexion: { left: number; right: number };
  shoulderFlexion: { left: number; right: number };
  shoulderAbduction: { left: number; right: number };
  elbowFlexion: { left: number; right: number };
  trunkFlexion: number;
  trunkLateralFlexion: number;
}

export interface ClinicalModifiers {
  primaryCondition: string;
  bodyRegion: string;
  severity: 'mild' | 'moderate' | 'severe';
  chronicity: 'acute' | 'subacute' | 'chronic';
  movementLimitations: string[];
  compensatoryPatterns: string[];
  painBehavior: 'constant' | 'intermittent' | 'activity_related';
}

export interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
  leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
  leftWrist: { deviation: number; flexion: number };
  rightWrist: { deviation: number; flexion: number };
}

export interface PatientCloneState {
  modelConfig: ModelConfig;
  biomechanicsData: BiomechanicsResult | null;
  clinicalModifiers?: ClinicalModifiers;
  capturedAngles?: CapturedJointAngles;
  animationFrames?: Array<{ timestamp: number; jointAngles: Record<string, Record<string, number>> }>;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  limbScales: { upperArm: 1, forearm: 1, thigh: 1, shin: 1, overall: 1 },
  spine: { cervicalLordosis: 0, thoracicKyphosis: 0, lumbarLordosis: 0, scoliosis: 0, forwardHead: 0, lateralShift: 0, cervicalRotation: 0, cervicalLateralFlexion: 0, thoracicRotation: 0, lumbarRotation: 0 },
  neck: { flexion: 0, extension: 0, rotation: 0, lateralFlexion: 0, forwardHead: 0 },
  pelvis: { tilt: 0, obliquity: 0, rotation: 0, drop: 0 },
  leftHip: { flexion: 0, extension: 0, abduction: 0, internalRotation: 0, anteversion: 15, neckShaftAngle: 125 },
  rightHip: { flexion: 0, extension: 0, abduction: 0, internalRotation: 0, anteversion: 15, neckShaftAngle: 125 },
  leftKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 10, patellaAlta: 1 },
  rightKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 10, patellaAlta: 1 },
  leftAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, archHeight: 1 },
  rightAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, archHeight: 1 },
  leftShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 1 },
  rightShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 1 },
  leftElbow: { flexion: 0, carryingAngle: 10, pronation: 0 },
  rightElbow: { flexion: 0, carryingAngle: 10, pronation: 0 },
  leftWrist: { deviation: 0, flexion: 0 },
  rightWrist: { deviation: 0, flexion: 0 },
};

export class PatientCloneComposer {
  static applyMovementCapture(
    baseConfig: ModelConfig,
    capturedAngles: CapturedJointAngles
  ): ModelConfig {
    return {
      ...baseConfig,
      leftHip: {
        ...baseConfig.leftHip,
        flexion: capturedAngles.hipFlexion.left,
        abduction: capturedAngles.hipAbduction.left,
      },
      rightHip: {
        ...baseConfig.rightHip,
        flexion: capturedAngles.hipFlexion.right,
        abduction: capturedAngles.hipAbduction.right,
      },
      leftKnee: {
        ...baseConfig.leftKnee,
        flexion: capturedAngles.kneeFlexion.left,
      },
      rightKnee: {
        ...baseConfig.rightKnee,
        flexion: capturedAngles.kneeFlexion.right,
      },
      leftShoulder: {
        ...baseConfig.leftShoulder,
        flexion: capturedAngles.shoulderFlexion.left,
        abduction: capturedAngles.shoulderAbduction.left,
      },
      rightShoulder: {
        ...baseConfig.rightShoulder,
        flexion: capturedAngles.shoulderFlexion.right,
        abduction: capturedAngles.shoulderAbduction.right,
      },
      leftElbow: {
        ...baseConfig.leftElbow,
        flexion: capturedAngles.elbowFlexion.left,
      },
      rightElbow: {
        ...baseConfig.rightElbow,
        flexion: capturedAngles.elbowFlexion.right,
      },
      spine: {
        ...baseConfig.spine,
        thoracicKyphosis: capturedAngles.trunkFlexion > 15 ? capturedAngles.trunkFlexion * 0.5 : 0,
        lateralShift: capturedAngles.trunkLateralFlexion,
      },
    };
  }

  static applyClinicalModifiers(
    baseConfig: ModelConfig,
    modifiers: ClinicalModifiers
  ): ModelConfig {
    const config = { ...baseConfig };

    const severityMultiplier = modifiers.severity === 'severe' ? 1.5 : modifiers.severity === 'moderate' ? 1.0 : 0.5;

    if (modifiers.bodyRegion === 'shoulder' || modifiers.bodyRegion === 'upper_extremity') {
      if (modifiers.movementLimitations.some(l => l.toLowerCase().includes('flexion'))) {
        config.leftShoulder = { ...config.leftShoulder, flexion: Math.min(config.leftShoulder.flexion, 90 * severityMultiplier) };
        config.rightShoulder = { ...config.rightShoulder, flexion: Math.min(config.rightShoulder.flexion, 90 * severityMultiplier) };
      }
      if (modifiers.movementLimitations.some(l => l.toLowerCase().includes('abduction'))) {
        config.leftShoulder = { ...config.leftShoulder, abduction: Math.min(config.leftShoulder.abduction, 60 * severityMultiplier) };
        config.rightShoulder = { ...config.rightShoulder, abduction: Math.min(config.rightShoulder.abduction, 60 * severityMultiplier) };
      }
    }

    if (modifiers.bodyRegion === 'hip' || modifiers.bodyRegion === 'lower_extremity') {
      if (modifiers.movementLimitations.some(l => l.toLowerCase().includes('flexion'))) {
        config.leftHip = { ...config.leftHip, flexion: Math.min(config.leftHip.flexion, 60 * severityMultiplier) };
        config.rightHip = { ...config.rightHip, flexion: Math.min(config.rightHip.flexion, 60 * severityMultiplier) };
      }
    }

    if (modifiers.bodyRegion === 'spine' || modifiers.bodyRegion === 'back') {
      config.spine = {
        ...config.spine,
        thoracicKyphosis: config.spine.thoracicKyphosis + (10 * severityMultiplier),
        forwardHead: config.spine.forwardHead + (5 * severityMultiplier),
      };
    }

    if (modifiers.compensatoryPatterns.some(p => p.toLowerCase().includes('trendelenburg'))) {
      config.pelvis = { ...config.pelvis, drop: 5 * severityMultiplier };
    }

    if (modifiers.compensatoryPatterns.some(p => p.toLowerCase().includes('antalgic'))) {
      config.pelvis = { ...config.pelvis, tilt: -5 * severityMultiplier };
    }

    return config;
  }

  static composePatientClone(
    capturedAngles?: CapturedJointAngles,
    clinicalModifiers?: ClinicalModifiers,
    existingConfig?: ModelConfig,
    heightCm: number = 170,
    weightKg: number = 70
  ): PatientCloneState {
    let modelConfig = existingConfig ? { ...existingConfig } : { ...DEFAULT_MODEL_CONFIG };

    if (capturedAngles) {
      modelConfig = this.applyMovementCapture(modelConfig, capturedAngles);
    }

    if (clinicalModifiers) {
      modelConfig = this.applyClinicalModifiers(modelConfig, clinicalModifiers);
    }

    const biomechanicsData = calculateFullBiomechanics(heightCm, weightKg, modelConfig);

    return {
      modelConfig,
      biomechanicsData,
      clinicalModifiers,
      capturedAngles,
    };
  }

  static createFromMediaPipePose(landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>): CapturedJointAngles {
    const calculateAngle = (p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }, p3: { x: number; y: number; z: number }): number => {
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
      if (mag1 === 0 || mag2 === 0) return 0;
      const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      return 180 - (Math.acos(cos) * 180 / Math.PI);
    };

    const leftHipFlexion = landmarks.length > 26 ? calculateAngle(landmarks[11], landmarks[23], landmarks[25]) : 0;
    const rightHipFlexion = landmarks.length > 26 ? calculateAngle(landmarks[12], landmarks[24], landmarks[26]) : 0;
    const leftKneeFlexion = landmarks.length > 28 ? calculateAngle(landmarks[23], landmarks[25], landmarks[27]) : 0;
    const rightKneeFlexion = landmarks.length > 28 ? calculateAngle(landmarks[24], landmarks[26], landmarks[28]) : 0;
    const leftShoulderFlexion = landmarks.length > 15 ? calculateAngle(landmarks[23], landmarks[11], landmarks[13]) : 0;
    const rightShoulderFlexion = landmarks.length > 16 ? calculateAngle(landmarks[24], landmarks[12], landmarks[14]) : 0;
    const leftElbowFlexion = landmarks.length > 16 ? calculateAngle(landmarks[11], landmarks[13], landmarks[15]) : 0;
    const rightElbowFlexion = landmarks.length > 16 ? calculateAngle(landmarks[12], landmarks[14], landmarks[16]) : 0;

    const leftShoulderAbduction = landmarks.length > 14 ? Math.abs(landmarks[13].x - landmarks[11].x) * 100 : 0;
    const rightShoulderAbduction = landmarks.length > 14 ? Math.abs(landmarks[14].x - landmarks[12].x) * 100 : 0;
    const leftHipAbduction = landmarks.length > 26 ? Math.abs(landmarks[25].x - landmarks[23].x) * 80 : 0;
    const rightHipAbduction = landmarks.length > 26 ? Math.abs(landmarks[26].x - landmarks[24].x) * 80 : 0;

    const trunkFlexion = landmarks.length > 24 ? 
      (landmarks[11].y + landmarks[12].y) / 2 - (landmarks[23].y + landmarks[24].y) / 2 > 0 ? 
        Math.min(45, ((landmarks[11].y + landmarks[12].y) / 2 - (landmarks[23].y + landmarks[24].y) / 2) * 100) : 0 
      : 0;
    const trunkLateralFlexion = landmarks.length > 12 ? (landmarks[11].y - landmarks[12].y) * 50 : 0;

    return {
      hipFlexion: { left: Math.max(0, leftHipFlexion), right: Math.max(0, rightHipFlexion) },
      hipAbduction: { left: Math.min(45, leftHipAbduction), right: Math.min(45, rightHipAbduction) },
      kneeFlexion: { left: Math.max(0, leftKneeFlexion), right: Math.max(0, rightKneeFlexion) },
      shoulderFlexion: { left: Math.max(0, leftShoulderFlexion), right: Math.max(0, rightShoulderFlexion) },
      shoulderAbduction: { left: Math.min(180, leftShoulderAbduction), right: Math.min(180, rightShoulderAbduction) },
      elbowFlexion: { left: Math.max(0, leftElbowFlexion), right: Math.max(0, rightElbowFlexion) },
      trunkFlexion: Math.max(0, trunkFlexion),
      trunkLateralFlexion: Math.max(-30, Math.min(30, trunkLateralFlexion)),
    };
  }

  static getDefaultModelConfig(): ModelConfig {
    return { ...DEFAULT_MODEL_CONFIG };
  }
}

export const CLINICAL_CONDITION_MAPPINGS: Record<string, Partial<ClinicalModifiers>> = {
  'frozen_shoulder': {
    bodyRegion: 'shoulder',
    movementLimitations: ['external rotation', 'abduction', 'flexion'],
    compensatoryPatterns: ['scapular elevation', 'trunk lean'],
  },
  'hip_oa': {
    bodyRegion: 'hip',
    movementLimitations: ['internal rotation', 'flexion', 'abduction'],
    compensatoryPatterns: ['trendelenburg', 'antalgic gait'],
  },
  'lbp': {
    bodyRegion: 'back',
    movementLimitations: ['flexion', 'extension', 'rotation'],
    compensatoryPatterns: ['guarded movement', 'reduced lumbar lordosis'],
  },
  'knee_acl': {
    bodyRegion: 'lower_extremity',
    movementLimitations: ['extension', 'rotational stability'],
    compensatoryPatterns: ['quad avoidance', 'stiff knee gait'],
  },
  'ankle_sprain': {
    bodyRegion: 'lower_extremity',
    movementLimitations: ['inversion', 'plantarflexion'],
    compensatoryPatterns: ['antalgic gait', 'reduced push-off'],
  },
};
