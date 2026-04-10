/**
 * Pose to Controller Map Utility
 * 
 * Converts MediaPipe pose angles to BONE_MAPPING compatible values.
 * Uses anatomical range limits to clamp inputs so the skeleton
 * moves within physiologically realistic constraints.
 * 
 * KEY: Neutral pose (arms down, standing) = zero controller values
 * The raw MediaPipe angles are already relative to neutral, so we
 * just clamp them to anatomical limits and pass through directly.
 */

import { Skeleton3DPose, ScapulaEstimate, JointConfidenceMap, GlobalTranslation, SpineSegmentation, BodyProportions } from './mediapipeTo3D';

/**
 * Joint movement ranges in radians (anatomical norms)
 * Used to clamp MediaPipe values to realistic limits
 */
export const ANATOMICAL_RANGES = {
  shoulder: {
    flexion: { min: -0.5, max: Math.PI },               // -28° to 180° (extension to full overhead)
    abduction: { min: -0.35, max: Math.PI },            // -20° to 180° (adduction to full overhead)
  },
  elbow: {
    flexion: { min: 0, max: 2.6 }                      // 0° to 150° (straight to fully bent)
  },
  hip: {
    flexion: { min: -0.35, max: 2.1 },                 // -20° to 120° (extension to flexion)
    abduction: { min: -0.17, max: 0.8 }                // -10° to 45°
  },
  knee: {
    flexion: { min: 0, max: 2.4 }                      // 0° to 140° (straight to fully bent)
  },
  ankle: {
    dorsiflexion: { min: -0.87, max: 0.35 },            // -50° plantarflexion to 20° dorsiflexion
    inversion: { min: -0.52, max: 0.52 }                // ~-30° eversion to ~30° inversion
  },
  wrist: {
    flexion: { min: -1.2, max: 1.2 },                   // ~-70° extension to ~70° flexion
    deviation: { min: -0.52, max: 0.35 }                 // ~-30° ulnar to ~20° radial
  },
  spine: {
    forward: { min: -0.5, max: 0.7 },                  // Extension to flexion
    lateral: { min: -0.5, max: 0.5 }                   // Side bending
  },
  neck: {
    forward: { min: -0.5, max: 0.5 },
    rotation: { min: -0.8, max: 0.8 },
    lateral: { min: -0.4, max: 0.4 }
  }
};

/**
 * Controller output format matching BONE_MAPPING expectations
 * All values are in radians, where 0 = neutral position
 */
export interface ControllerValues {
  leftShoulder: { flexion: number; abduction: number; internalRotation: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number };
  leftElbow: { flexion: number; pronation: number };
  rightElbow: { flexion: number; pronation: number };
  leftHip: { flexion: number; abduction: number };
  rightHip: { flexion: number; abduction: number };
  leftKnee: { flexion: number };
  rightKnee: { flexion: number };
  leftAnkle: { dorsiflexion: number; inversion: number };
  rightAnkle: { dorsiflexion: number; inversion: number };
  leftWrist: { flexion: number; deviation: number };
  rightWrist: { flexion: number; deviation: number };
  pelvis: { tilt: number; obliquity: number; rotation: number };
  spine: { flexion: number; lateralFlexion: number; kyphosis: number; lordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalFlexion: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicFlexion: number; thoracicRotation: number; thoracicLateralFlexion: number; lumbarFlexion: number; lumbarRotation: number; lumbarLateralFlexion: number };
  neck: { flexion: number; rotation: number; lateralFlexion: number };
  scapula: { leftElevation: number; rightElevation: number; leftProtraction: number; rightProtraction: number };
}

/**
 * Clamp a value within a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 1D Kalman filter for smooth, low-latency signal estimation.
 * Better than exponential smoothing for neck/spine because it adapts
 * to measurement noise and process dynamics independently.
 */
class KalmanFilter1D {
  private x: number;
  private p: number;
  private q: number;
  private r: number;
  private initialized: boolean;

  constructor(processNoise: number = 0.001, measurementNoise: number = 0.01) {
    this.x = 0;
    this.p = 1.0;
    this.q = processNoise;
    this.r = measurementNoise;
    this.initialized = false;
  }

  update(measurement: number, measurementNoise?: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.p = 1.0;
      this.initialized = true;
      return measurement;
    }

    const r = measurementNoise ?? this.r;

    this.p += this.q;

    const k = this.p / (this.p + r);

    this.x += k * (measurement - this.x);

    this.p *= (1 - k);

    return this.x;
  }

  reset(): void {
    this.x = 0;
    this.p = 1.0;
    this.initialized = false;
  }

  get value(): number {
    return this.x;
  }
}

/**
 * Velocity-adaptive dead zone for neck/spine channels.
 * When holding still, uses a larger dead zone to suppress jitter.
 * When moving intentionally, uses a smaller dead zone for responsiveness.
 */
class AdaptiveDeadZone {
  private velocityHistory: number[] = [];
  private readonly historySize: number = 5;
  private readonly stillDeadZone: number;
  private readonly movingDeadZone: number;
  private readonly velocityThreshold: number;

  constructor(stillDeadZone: number = 0.04, movingDeadZone: number = 0.015, velocityThreshold: number = 0.08) {
    this.stillDeadZone = stillDeadZone;
    this.movingDeadZone = movingDeadZone;
    this.velocityThreshold = velocityThreshold;
  }

  apply(value: number, prevValue: number): number {
    const velocity = Math.abs(value - prevValue);
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.historySize) {
      this.velocityHistory.shift();
    }

    const avgVelocity = this.velocityHistory.reduce((s, v) => s + v, 0) / this.velocityHistory.length;

    let threshold: number;
    if (avgVelocity < this.velocityThreshold * 0.3) {
      threshold = this.stillDeadZone;
    } else if (avgVelocity > this.velocityThreshold) {
      threshold = this.movingDeadZone;
    } else {
      const t = (avgVelocity - this.velocityThreshold * 0.3) / (this.velocityThreshold * 0.7);
      threshold = this.stillDeadZone + t * (this.movingDeadZone - this.stillDeadZone);
    }

    if (Math.abs(value) < threshold) return 0;
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - threshold);
  }

  reset(): void {
    this.velocityHistory = [];
  }
}

function applyDeadZone(value: number, threshold: number = 0.03): number {
  const abs = Math.abs(value);
  if (abs < 0.001) return 0;
  const sign = value > 0 ? 1 : -1;
  if (abs >= threshold * 2) return value;
  const t = abs / (threshold * 2);
  return sign * abs * t * t;
}

const ARM_DEAD_ZONE = 0.02;
const SPINE_DEAD_ZONE = 0.025;
const HIP_DEAD_ZONE = 0.06;
const KNEE_DEAD_ZONE = 0.05;
const ANKLE_DEAD_ZONE = 0.04;

export interface ExtendedPoseInput extends Skeleton3DPose {
  pelvisTilt?: number;
  pelvisObliquity?: number;
  pelvisRotation?: number;
  scapulaData?: ScapulaEstimate;
  jointConfidence?: JointConfidenceMap;
  globalTranslation?: GlobalTranslation;
  spineSegments?: SpineSegmentation;
  bodyProportions?: BodyProportions;
}

/**
 * Convert Skeleton3DPose to controller-compatible values
 */
export function poseToControllerValues(pose: ExtendedPoseInput): ControllerValues {
  const { shoulder, elbow, hip, knee, spine, neck } = ANATOMICAL_RANGES;
  
  const leftShoulderFlexion = applyDeadZone(clamp(pose.leftShoulder.x, shoulder.flexion.min, shoulder.flexion.max), ARM_DEAD_ZONE);
  const leftShoulderAbduction = applyDeadZone(clamp(pose.leftShoulder.z, shoulder.abduction.min, shoulder.abduction.max), ARM_DEAD_ZONE);
  
  const rightShoulderFlexion = applyDeadZone(clamp(pose.rightShoulder.x, shoulder.flexion.min, shoulder.flexion.max), ARM_DEAD_ZONE);
  const rightShoulderAbduction = applyDeadZone(clamp(pose.rightShoulder.z, shoulder.abduction.min, shoulder.abduction.max), ARM_DEAD_ZONE);

  const leftShoulderInternalRotation = applyDeadZone(clamp(pose.leftShoulder.y, -1.2, 1.2), ARM_DEAD_ZONE);
  const rightShoulderInternalRotation = applyDeadZone(clamp(pose.rightShoulder.y, -1.2, 1.2), ARM_DEAD_ZONE);
  
  const leftElbowFlexion = applyDeadZone(clamp(pose.leftElbow.x, elbow.flexion.min, elbow.flexion.max), ARM_DEAD_ZONE);
  const rightElbowFlexion = applyDeadZone(clamp(pose.rightElbow.x, elbow.flexion.min, elbow.flexion.max), ARM_DEAD_ZONE);
  const leftElbowPronation = applyDeadZone(clamp(pose.leftElbow.y, -1.5, 1.5), ARM_DEAD_ZONE);
  const rightElbowPronation = applyDeadZone(clamp(pose.rightElbow.y, -1.5, 1.5), ARM_DEAD_ZONE);
  
  const leftHipFlexion = applyDeadZone(clamp(pose.leftHip.x, hip.flexion.min, hip.flexion.max), HIP_DEAD_ZONE);
  const leftHipAbduction = applyDeadZone(clamp(pose.leftHip.z, hip.abduction.min, hip.abduction.max), HIP_DEAD_ZONE);
  
  const rightHipFlexion = applyDeadZone(clamp(pose.rightHip.x, hip.flexion.min, hip.flexion.max), HIP_DEAD_ZONE);
  const rightHipAbduction = applyDeadZone(clamp(pose.rightHip.z, hip.abduction.min, hip.abduction.max), HIP_DEAD_ZONE);
  
  const leftKneeFlexion = applyDeadZone(clamp(pose.leftKnee.x, knee.flexion.min, knee.flexion.max), KNEE_DEAD_ZONE);
  const rightKneeFlexion = applyDeadZone(clamp(pose.rightKnee.x, knee.flexion.min, knee.flexion.max), KNEE_DEAD_ZONE);
  
  const { ankle, wrist } = ANATOMICAL_RANGES;
  const leftAnkleDorsiflexion = applyDeadZone(clamp(pose.leftAnkle.x, ankle.dorsiflexion.min, ankle.dorsiflexion.max), ANKLE_DEAD_ZONE);
  const rightAnkleDorsiflexion = applyDeadZone(clamp(pose.rightAnkle.x, ankle.dorsiflexion.min, ankle.dorsiflexion.max), ANKLE_DEAD_ZONE);
  
  const leftWristFlexion = applyDeadZone(clamp(pose.leftWrist.x, wrist.flexion.min, wrist.flexion.max), ARM_DEAD_ZONE);
  const rightWristFlexion = applyDeadZone(clamp(pose.rightWrist.x, wrist.flexion.min, wrist.flexion.max), ARM_DEAD_ZONE);
  const leftWristDeviation = applyDeadZone(clamp(pose.leftWrist.z, wrist.deviation.min, wrist.deviation.max), ARM_DEAD_ZONE);
  const rightWristDeviation = applyDeadZone(clamp(pose.rightWrist.z, wrist.deviation.min, wrist.deviation.max), ARM_DEAD_ZONE);

  const leftAnkleInversion = applyDeadZone(clamp(pose.leftAnkle.z, ankle.inversion.min, ankle.inversion.max), ANKLE_DEAD_ZONE);
  const rightAnkleInversion = applyDeadZone(clamp(pose.rightAnkle.z, ankle.inversion.min, ankle.inversion.max), ANKLE_DEAD_ZONE);

  const pelvisTilt = pose.pelvisTilt !== undefined
    ? applyDeadZone(clamp(pose.pelvisTilt, -0.5, 0.5), SPINE_DEAD_ZONE)
    : applyDeadZone(clamp(pose.spine.x, spine.forward.min, spine.forward.max)) * 0.5;
  const pelvisObliquity = pose.pelvisObliquity !== undefined
    ? applyDeadZone(clamp(pose.pelvisObliquity, -0.35, 0.35), SPINE_DEAD_ZONE)
    : applyDeadZone(clamp(pose.spine.z, spine.lateral.min, spine.lateral.max)) * 0.3;
  const pelvisRotation = pose.pelvisRotation !== undefined
    ? applyDeadZone(clamp(pose.pelvisRotation, -0.5, 0.5), SPINE_DEAD_ZONE)
    : applyDeadZone(clamp(pose.spine.y, -0.5, 0.5), SPINE_DEAD_ZONE) * 0.4;
  
  const spineFlexion = applyDeadZone(clamp(pose.spine.x, spine.forward.min, spine.forward.max), SPINE_DEAD_ZONE);
  const spineLateralFlexion = applyDeadZone(clamp(pose.spine.z, spine.lateral.min, spine.lateral.max), SPINE_DEAD_ZONE);

  const spineKyphosis = clamp(pose.spine.x * 0.6, -0.15, 0.4);
  const spineScoliosis = clamp(pose.spine.z * 1.2, -0.3, 0.3);
  const spineForwardHead = clamp(pose.neck.x * 0.5, -0.15, 0.3);
  const spineLateralShift = clamp(pose.spine.z * 0.8, -0.2, 0.2);
  
  const neckFlexion = applyDeadZone(clamp(pose.neck.x, neck.forward.min, neck.forward.max));
  const neckRotation = applyDeadZone(clamp(pose.neck.y, neck.rotation.min, neck.rotation.max));
  const neckLateralFlexion = applyDeadZone(clamp(pose.neck.z, neck.lateral.min, neck.lateral.max));

  const scapData = pose.scapulaData;
  const scapLeftElev = scapData ? applyDeadZone(clamp(scapData.leftElevation, -0.3, 0.3), 0.015) : 0;
  const scapRightElev = scapData ? applyDeadZone(clamp(scapData.rightElevation, -0.3, 0.3), 0.015) : 0;
  const scapLeftProt = scapData ? applyDeadZone(clamp(scapData.leftProtraction, -0.35, 0.35), 0.015) : 0;
  const scapRightProt = scapData ? applyDeadZone(clamp(scapData.rightProtraction, -0.35, 0.35), 0.015) : 0;
  
  return {
    leftShoulder: { flexion: leftShoulderFlexion, abduction: leftShoulderAbduction, internalRotation: leftShoulderInternalRotation },
    rightShoulder: { flexion: rightShoulderFlexion, abduction: rightShoulderAbduction, internalRotation: rightShoulderInternalRotation },
    leftElbow: { flexion: leftElbowFlexion, pronation: leftElbowPronation },
    rightElbow: { flexion: rightElbowFlexion, pronation: rightElbowPronation },
    leftHip: { flexion: leftHipFlexion, abduction: leftHipAbduction },
    rightHip: { flexion: rightHipFlexion, abduction: rightHipAbduction },
    leftKnee: { flexion: leftKneeFlexion },
    rightKnee: { flexion: rightKneeFlexion },
    leftAnkle: { dorsiflexion: leftAnkleDorsiflexion, inversion: leftAnkleInversion },
    rightAnkle: { dorsiflexion: rightAnkleDorsiflexion, inversion: rightAnkleInversion },
    leftWrist: { flexion: leftWristFlexion, deviation: leftWristDeviation },
    rightWrist: { flexion: rightWristFlexion, deviation: rightWristDeviation },
    pelvis: { tilt: pelvisTilt, obliquity: pelvisObliquity, rotation: pelvisRotation },
    spine: {
      flexion: spineFlexion, lateralFlexion: spineLateralFlexion, kyphosis: spineKyphosis, lordosis: 0, scoliosis: spineScoliosis, forwardHead: spineForwardHead, lateralShift: spineLateralShift,
      cervicalFlexion: pose.spineSegments ? clamp(pose.spineSegments.cervicalFlexion, -0.4, 0.4) : 0,
      cervicalRotation: pose.spineSegments ? clamp(pose.spineSegments.cervicalRotation, -0.5, 0.5) : 0,
      cervicalLateralFlexion: pose.spineSegments ? clamp(pose.spineSegments.cervicalLateralFlexion, -0.35, 0.35) : 0,
      thoracicFlexion: pose.spineSegments ? clamp(pose.spineSegments.thoracicFlexion, -0.4, 0.35) : 0,
      thoracicRotation: pose.spineSegments ? clamp(pose.spineSegments.thoracicRotation, -0.4, 0.4) : 0,
      thoracicLateralFlexion: pose.spineSegments ? clamp(pose.spineSegments.thoracicLateralFlexion, -0.3, 0.3) : 0,
      lumbarFlexion: pose.spineSegments ? clamp(pose.spineSegments.lumbarFlexion, -0.5, 0.5) : 0,
      lumbarRotation: pose.spineSegments ? clamp(pose.spineSegments.lumbarRotation, -0.3, 0.3) : 0,
      lumbarLateralFlexion: pose.spineSegments ? clamp(pose.spineSegments.lumbarLateralFlexion, -0.35, 0.35) : 0,
    },
    neck: { flexion: neckFlexion, rotation: neckRotation, lateralFlexion: neckLateralFlexion },
    scapula: { leftElevation: scapLeftElev, rightElevation: scapRightElev, leftProtraction: scapLeftProt, rightProtraction: scapRightProt }
  };
}

/**
 * Enhanced smoother with Kalman filtering for neck/spine channels
 * and velocity-adaptive dead zones for improved stability.
 */
export class ControllerSmoother {
  private previous: ControllerValues | null = null;
  private smoothingFactor: number;
  private noiseThreshold: number;

  private neckFlexionKF = new KalmanFilter1D(0.0008, 0.015);
  private neckRotationKF = new KalmanFilter1D(0.001, 0.012);
  private neckLateralKF = new KalmanFilter1D(0.0008, 0.015);
  private spineFlexionKF = new KalmanFilter1D(0.0015, 0.01);
  private spineLateralKF = new KalmanFilter1D(0.001, 0.012);

  private neckFlexionDZ = new AdaptiveDeadZone(0.035, 0.012, 0.06);
  private neckRotationDZ = new AdaptiveDeadZone(0.03, 0.01, 0.08);
  private neckLateralDZ = new AdaptiveDeadZone(0.035, 0.012, 0.06);
  private spineFlexionDZ = new AdaptiveDeadZone(0.04, 0.015, 0.07);
  private spineLateralDZ = new AdaptiveDeadZone(0.04, 0.015, 0.07);

  private prevNeckFlexion = 0;
  private prevNeckRotation = 0;
  private prevNeckLateral = 0;
  private prevSpineFlexion = 0;
  private prevSpineLateral = 0;
  
  constructor(smoothingFactor: number = 0.6, noiseThreshold: number = 0.015) {
    this.smoothingFactor = smoothingFactor;
    this.noiseThreshold = noiseThreshold;
  }
  
  smooth(current: ControllerValues): ControllerValues {
    const neckFlexionFiltered = this.neckFlexionKF.update(current.neck.flexion);
    const neckRotationFiltered = this.neckRotationKF.update(current.neck.rotation);
    const neckLateralFiltered = this.neckLateralKF.update(current.neck.lateralFlexion);
    const spineFlexionFiltered = this.spineFlexionKF.update(current.spine.flexion);
    const spineLateralFiltered = this.spineLateralKF.update(current.spine.lateralFlexion);

    const neckFlexionFinal = this.neckFlexionDZ.apply(neckFlexionFiltered, this.prevNeckFlexion);
    const neckRotationFinal = this.neckRotationDZ.apply(neckRotationFiltered, this.prevNeckRotation);
    const neckLateralFinal = this.neckLateralDZ.apply(neckLateralFiltered, this.prevNeckLateral);
    const spineFlexionFinal = this.spineFlexionDZ.apply(spineFlexionFiltered, this.prevSpineFlexion);
    const spineLateralFinal = this.spineLateralDZ.apply(spineLateralFiltered, this.prevSpineLateral);

    this.prevNeckFlexion = neckFlexionFiltered;
    this.prevNeckRotation = neckRotationFiltered;
    this.prevNeckLateral = neckLateralFiltered;
    this.prevSpineFlexion = spineFlexionFiltered;
    this.prevSpineLateral = spineLateralFiltered;

    if (!this.previous) {
      const result: ControllerValues = {
        ...current,
        neck: { flexion: neckFlexionFinal, rotation: neckRotationFinal, lateralFlexion: neckLateralFinal },
        spine: { ...current.spine, flexion: spineFlexionFinal, lateralFlexion: spineLateralFinal }
      };
      this.previous = structuredClone(result);
      return result;
    }
    
    const smoothValue = (curr: number, prev: number): number => {
      const delta = curr - prev;
      return prev + delta * this.smoothingFactor;
    };
    
    const smoothed: ControllerValues = {
      leftShoulder: {
        flexion: smoothValue(current.leftShoulder.flexion, this.previous.leftShoulder.flexion),
        abduction: smoothValue(current.leftShoulder.abduction, this.previous.leftShoulder.abduction),
        internalRotation: smoothValue(current.leftShoulder.internalRotation, this.previous.leftShoulder.internalRotation)
      },
      rightShoulder: {
        flexion: smoothValue(current.rightShoulder.flexion, this.previous.rightShoulder.flexion),
        abduction: smoothValue(current.rightShoulder.abduction, this.previous.rightShoulder.abduction),
        internalRotation: smoothValue(current.rightShoulder.internalRotation, this.previous.rightShoulder.internalRotation)
      },
      leftElbow: {
        flexion: smoothValue(current.leftElbow.flexion, this.previous.leftElbow.flexion),
        pronation: smoothValue(current.leftElbow.pronation, this.previous.leftElbow.pronation)
      },
      rightElbow: {
        flexion: smoothValue(current.rightElbow.flexion, this.previous.rightElbow.flexion),
        pronation: smoothValue(current.rightElbow.pronation, this.previous.rightElbow.pronation)
      },
      leftHip: {
        flexion: smoothValue(current.leftHip.flexion, this.previous.leftHip.flexion),
        abduction: smoothValue(current.leftHip.abduction, this.previous.leftHip.abduction)
      },
      rightHip: {
        flexion: smoothValue(current.rightHip.flexion, this.previous.rightHip.flexion),
        abduction: smoothValue(current.rightHip.abduction, this.previous.rightHip.abduction)
      },
      leftKnee: {
        flexion: smoothValue(current.leftKnee.flexion, this.previous.leftKnee.flexion)
      },
      rightKnee: {
        flexion: smoothValue(current.rightKnee.flexion, this.previous.rightKnee.flexion)
      },
      leftAnkle: {
        dorsiflexion: smoothValue(current.leftAnkle.dorsiflexion, this.previous.leftAnkle.dorsiflexion),
        inversion: smoothValue(current.leftAnkle.inversion, this.previous.leftAnkle.inversion)
      },
      rightAnkle: {
        dorsiflexion: smoothValue(current.rightAnkle.dorsiflexion, this.previous.rightAnkle.dorsiflexion),
        inversion: smoothValue(current.rightAnkle.inversion, this.previous.rightAnkle.inversion)
      },
      leftWrist: {
        flexion: smoothValue(current.leftWrist.flexion, this.previous.leftWrist.flexion),
        deviation: smoothValue(current.leftWrist.deviation, this.previous.leftWrist.deviation)
      },
      rightWrist: {
        flexion: smoothValue(current.rightWrist.flexion, this.previous.rightWrist.flexion),
        deviation: smoothValue(current.rightWrist.deviation, this.previous.rightWrist.deviation)
      },
      pelvis: {
        tilt: smoothValue(current.pelvis.tilt, this.previous.pelvis.tilt),
        obliquity: smoothValue(current.pelvis.obliquity, this.previous.pelvis.obliquity),
        rotation: smoothValue(current.pelvis.rotation, this.previous.pelvis.rotation)
      },
      spine: {
        flexion: spineFlexionFinal,
        lateralFlexion: spineLateralFinal,
        kyphosis: smoothValue(current.spine.kyphosis, this.previous.spine.kyphosis),
        lordosis: smoothValue(current.spine.lordosis, this.previous.spine.lordosis),
        scoliosis: smoothValue(current.spine.scoliosis, this.previous.spine.scoliosis),
        forwardHead: smoothValue(current.spine.forwardHead, this.previous.spine.forwardHead),
        lateralShift: smoothValue(current.spine.lateralShift, this.previous.spine.lateralShift),
        cervicalFlexion: smoothValue(current.spine.cervicalFlexion, this.previous.spine.cervicalFlexion),
        cervicalRotation: smoothValue(current.spine.cervicalRotation, this.previous.spine.cervicalRotation),
        cervicalLateralFlexion: smoothValue(current.spine.cervicalLateralFlexion, this.previous.spine.cervicalLateralFlexion),
        thoracicFlexion: smoothValue(current.spine.thoracicFlexion, this.previous.spine.thoracicFlexion),
        thoracicRotation: smoothValue(current.spine.thoracicRotation, this.previous.spine.thoracicRotation),
        thoracicLateralFlexion: smoothValue(current.spine.thoracicLateralFlexion, this.previous.spine.thoracicLateralFlexion),
        lumbarFlexion: smoothValue(current.spine.lumbarFlexion, this.previous.spine.lumbarFlexion),
        lumbarRotation: smoothValue(current.spine.lumbarRotation, this.previous.spine.lumbarRotation),
        lumbarLateralFlexion: smoothValue(current.spine.lumbarLateralFlexion, this.previous.spine.lumbarLateralFlexion),
      },
      neck: {
        flexion: neckFlexionFinal,
        rotation: neckRotationFinal,
        lateralFlexion: neckLateralFinal
      },
      scapula: {
        leftElevation: smoothValue(current.scapula.leftElevation, this.previous.scapula.leftElevation),
        rightElevation: smoothValue(current.scapula.rightElevation, this.previous.scapula.rightElevation),
        leftProtraction: smoothValue(current.scapula.leftProtraction, this.previous.scapula.leftProtraction),
        rightProtraction: smoothValue(current.scapula.rightProtraction, this.previous.scapula.rightProtraction)
      }
    };
    
    this.previous = structuredClone(smoothed);
    return smoothed;
  }
  
  reset(): void {
    this.previous = null;
    this.neckFlexionKF.reset();
    this.neckRotationKF.reset();
    this.neckLateralKF.reset();
    this.spineFlexionKF.reset();
    this.spineLateralKF.reset();
    this.neckFlexionDZ.reset();
    this.neckRotationDZ.reset();
    this.neckLateralDZ.reset();
    this.spineFlexionDZ.reset();
    this.spineLateralDZ.reset();
    this.prevNeckFlexion = 0;
    this.prevNeckRotation = 0;
    this.prevNeckLateral = 0;
    this.prevSpineFlexion = 0;
    this.prevSpineLateral = 0;
  }
}
