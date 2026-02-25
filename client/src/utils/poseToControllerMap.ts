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

import { Skeleton3DPose } from './mediapipeTo3D';

/**
 * Joint movement ranges in radians (anatomical norms)
 * Used to clamp MediaPipe values to realistic limits
 */
export const ANATOMICAL_RANGES = {
  shoulder: {
    flexion: { min: -0.35, max: Math.PI * 0.9 },      // -20° to 162° (extension to overhead)
    abduction: { min: -0.17, max: Math.PI * 0.9 },    // -10° to 162° (adduction to overhead)
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
    dorsiflexion: { min: -0.87, max: 0.35 }            // -50° plantarflexion to 20° dorsiflexion
  },
  wrist: {
    flexion: { min: -1.2, max: 1.2 }                   // ~-70° extension to ~70° flexion
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
  leftElbow: { flexion: number };
  rightElbow: { flexion: number };
  leftHip: { flexion: number; abduction: number };
  rightHip: { flexion: number; abduction: number };
  leftKnee: { flexion: number };
  rightKnee: { flexion: number };
  leftAnkle: { dorsiflexion: number };
  rightAnkle: { dorsiflexion: number };
  leftWrist: { flexion: number };
  rightWrist: { flexion: number };
  pelvis: { tilt: number; obliquity: number };
  spine: { flexion: number; lateralFlexion: number };
  neck: { flexion: number; rotation: number; lateralFlexion: number };
}

/**
 * Clamp a value within a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply dead zone to reduce jitter near neutral positions
 * Returns 0 for values below threshold, otherwise scales remaining range
 * 
 * Using a small threshold (0.03 radians ≈ 1.7°) to balance noise reduction
 * with responsiveness for intentional movements
 */
function applyDeadZone(value: number, threshold: number = 0.03): number {
  if (Math.abs(value) < threshold) return 0;
  const sign = value > 0 ? 1 : -1;
  return sign * (Math.abs(value) - threshold);
}

/**
 * Dead zone for arms - larger threshold to prevent twitching when standing still
 * but small enough to detect intentional ~15° movements
 */
const ARM_DEAD_ZONE = 0.06; // ~3.5 degrees - tracks small intentional arm adjustments

/**
 * Dead zone for spine - smaller threshold relies on ControllerSmoother for jitter control
 * while preserving moderate torso movements
 */
const SPINE_DEAD_ZONE = 0.03; // ~1.7 degrees - better torso tracking sensitivity
const HIP_DEAD_ZONE = 0.12; // ~7 degrees - larger dead zone for hips due to noisy MediaPipe Z-depth
const KNEE_DEAD_ZONE = 0.1; // ~5.7 degrees - filters phantom flexion from landmark misalignment
const ANKLE_DEAD_ZONE = 0.08; // ~4.5 degrees - filters noisy foot landmark detection

/**
 * Convert Skeleton3DPose to controller-compatible values
 * 
 * The output values are in radians, where 0 = neutral position.
 * MediaPipe already computes angles relative to neutral (arm down = ~0),
 * so we just clamp to anatomical limits and apply dead zones.
 * 
 * These values go directly to BONE_MAPPING without degree conversion
 * because we're providing raw radians (the viewer handles the scaling).
 */
export function poseToControllerValues(pose: Skeleton3DPose): ControllerValues {
  const { shoulder, elbow, hip, knee, spine, neck } = ANATOMICAL_RANGES;
  
  // Shoulders - MediaPipe gives x=flexion, z=abduction, already in radians from vertical
  // Use larger dead zone for arms to prevent twitching when at rest
  // No neutral offset - MediaPipe already reports ~0 for arms at rest
  const leftShoulderFlexion = applyDeadZone(clamp(pose.leftShoulder.x, shoulder.flexion.min, shoulder.flexion.max), ARM_DEAD_ZONE);
  const leftShoulderAbduction = applyDeadZone(clamp(pose.leftShoulder.z, shoulder.abduction.min, shoulder.abduction.max), ARM_DEAD_ZONE);
  
  const rightShoulderFlexion = applyDeadZone(clamp(pose.rightShoulder.x, shoulder.flexion.min, shoulder.flexion.max), ARM_DEAD_ZONE);
  const rightShoulderAbduction = applyDeadZone(clamp(pose.rightShoulder.z, shoulder.abduction.min, shoulder.abduction.max), ARM_DEAD_ZONE);

  const leftShoulderInternalRotation = applyDeadZone(clamp(pose.leftShoulder.y, -1.2, 1.2), ARM_DEAD_ZONE);
  const rightShoulderInternalRotation = applyDeadZone(clamp(pose.rightShoulder.y, -1.2, 1.2), ARM_DEAD_ZONE);
  
  // Elbows - x=flexion (0=straight, positive=bent) - use larger dead zone
  const leftElbowFlexion = applyDeadZone(clamp(pose.leftElbow.x, elbow.flexion.min, elbow.flexion.max), ARM_DEAD_ZONE);
  const rightElbowFlexion = applyDeadZone(clamp(pose.rightElbow.x, elbow.flexion.min, elbow.flexion.max), ARM_DEAD_ZONE);
  
  // Hips - x=flexion (0=standing, positive=leg forward), z=abduction
  // Use larger dead zone for hip flexion due to noisy MediaPipe Z-depth
  const leftHipFlexion = applyDeadZone(clamp(pose.leftHip.x, hip.flexion.min, hip.flexion.max), HIP_DEAD_ZONE);
  const leftHipAbduction = applyDeadZone(clamp(pose.leftHip.z, hip.abduction.min, hip.abduction.max), HIP_DEAD_ZONE);
  
  const rightHipFlexion = applyDeadZone(clamp(pose.rightHip.x, hip.flexion.min, hip.flexion.max), HIP_DEAD_ZONE);
  const rightHipAbduction = applyDeadZone(clamp(pose.rightHip.z, hip.abduction.min, hip.abduction.max), HIP_DEAD_ZONE);
  
  // Knees - x=flexion (0=straight, positive=bent)
  const leftKneeFlexion = applyDeadZone(clamp(pose.leftKnee.x, knee.flexion.min, knee.flexion.max), KNEE_DEAD_ZONE);
  const rightKneeFlexion = applyDeadZone(clamp(pose.rightKnee.x, knee.flexion.min, knee.flexion.max), KNEE_DEAD_ZONE);
  
  // Ankles - x=dorsiflexion (positive=dorsiflexion, negative=plantarflexion)
  const { ankle, wrist } = ANATOMICAL_RANGES;
  const leftAnkleDorsiflexion = applyDeadZone(clamp(pose.leftAnkle.x, ankle.dorsiflexion.min, ankle.dorsiflexion.max), ANKLE_DEAD_ZONE);
  const rightAnkleDorsiflexion = applyDeadZone(clamp(pose.rightAnkle.x, ankle.dorsiflexion.min, ankle.dorsiflexion.max), ANKLE_DEAD_ZONE);
  
  // Wrists - x=flexion (positive=flexion, negative=extension)
  const leftWristFlexion = applyDeadZone(clamp(pose.leftWrist.x, wrist.flexion.min, wrist.flexion.max), ARM_DEAD_ZONE);
  const rightWristFlexion = applyDeadZone(clamp(pose.rightWrist.x, wrist.flexion.min, wrist.flexion.max), ARM_DEAD_ZONE);
  
  // Pelvis - derived from spine forward/lateral lean with subtle scaling
  const pelvisTilt = applyDeadZone(clamp(pose.spine.x, spine.forward.min, spine.forward.max)) * 0.5;
  const pelvisObliquity = applyDeadZone(clamp(pose.spine.z, spine.lateral.min, spine.lateral.max)) * 0.3;
  
  // Spine - direct mapping for torso forward/lateral bend (distributed across spine bones)
  // Use larger dead zone to only respond to significant torso movements
  const spineFlexion = applyDeadZone(clamp(pose.spine.x, spine.forward.min, spine.forward.max), SPINE_DEAD_ZONE);
  const spineLateralFlexion = applyDeadZone(clamp(pose.spine.z, spine.lateral.min, spine.lateral.max), SPINE_DEAD_ZONE);
  
  // Neck - now with full yaw/pitch/roll mapping
  const neckFlexion = applyDeadZone(clamp(pose.neck.x, neck.forward.min, neck.forward.max));
  const neckRotation = applyDeadZone(clamp(pose.neck.y, neck.rotation.min, neck.rotation.max));
  const neckLateralFlexion = applyDeadZone(clamp(pose.neck.z, neck.lateral.min, neck.lateral.max));
  
  return {
    leftShoulder: { flexion: leftShoulderFlexion, abduction: leftShoulderAbduction, internalRotation: leftShoulderInternalRotation },
    rightShoulder: { flexion: rightShoulderFlexion, abduction: rightShoulderAbduction, internalRotation: rightShoulderInternalRotation },
    leftElbow: { flexion: leftElbowFlexion },
    rightElbow: { flexion: rightElbowFlexion },
    leftHip: { flexion: leftHipFlexion, abduction: leftHipAbduction },
    rightHip: { flexion: rightHipFlexion, abduction: rightHipAbduction },
    leftKnee: { flexion: leftKneeFlexion },
    rightKnee: { flexion: rightKneeFlexion },
    leftAnkle: { dorsiflexion: leftAnkleDorsiflexion },
    rightAnkle: { dorsiflexion: rightAnkleDorsiflexion },
    leftWrist: { flexion: leftWristFlexion },
    rightWrist: { flexion: rightWristFlexion },
    pelvis: { tilt: pelvisTilt, obliquity: pelvisObliquity },
    spine: { flexion: spineFlexion, lateralFlexion: spineLateralFlexion },
    neck: { flexion: neckFlexion, rotation: neckRotation, lateralFlexion: neckLateralFlexion }
  };
}

/**
 * Smoother class for controller values
 * Applies exponential smoothing to reduce jitter
 */
export class ControllerSmoother {
  private previous: ControllerValues | null = null;
  private smoothingFactor: number;
  private noiseThreshold: number;
  
  constructor(smoothingFactor: number = 0.6, noiseThreshold: number = 0.015) {
    this.smoothingFactor = smoothingFactor;
    this.noiseThreshold = noiseThreshold;
  }
  
  smooth(current: ControllerValues): ControllerValues {
    if (!this.previous) {
      this.previous = structuredClone(current);
      return current;
    }
    
    const smoothValue = (curr: number, prev: number): number => {
      const delta = curr - prev;
      // More smoothing for small movements (noise), less for large (intentional)
      const factor = Math.abs(delta) < this.noiseThreshold 
        ? this.smoothingFactor * 0.5 
        : this.smoothingFactor;
      return prev + delta * factor;
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
        flexion: smoothValue(current.leftElbow.flexion, this.previous.leftElbow.flexion)
      },
      rightElbow: {
        flexion: smoothValue(current.rightElbow.flexion, this.previous.rightElbow.flexion)
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
        dorsiflexion: smoothValue(current.leftAnkle.dorsiflexion, this.previous.leftAnkle.dorsiflexion)
      },
      rightAnkle: {
        dorsiflexion: smoothValue(current.rightAnkle.dorsiflexion, this.previous.rightAnkle.dorsiflexion)
      },
      leftWrist: {
        flexion: smoothValue(current.leftWrist.flexion, this.previous.leftWrist.flexion)
      },
      rightWrist: {
        flexion: smoothValue(current.rightWrist.flexion, this.previous.rightWrist.flexion)
      },
      pelvis: {
        tilt: smoothValue(current.pelvis.tilt, this.previous.pelvis.tilt),
        obliquity: smoothValue(current.pelvis.obliquity, this.previous.pelvis.obliquity)
      },
      spine: {
        flexion: smoothValue(current.spine.flexion, this.previous.spine?.flexion ?? current.spine.flexion),
        lateralFlexion: smoothValue(current.spine.lateralFlexion, this.previous.spine?.lateralFlexion ?? current.spine.lateralFlexion)
      },
      neck: {
        flexion: smoothValue(current.neck.flexion, this.previous.neck.flexion),
        rotation: smoothValue(current.neck.rotation, this.previous.neck.rotation),
        lateralFlexion: smoothValue(current.neck.lateralFlexion, this.previous.neck.lateralFlexion)
      }
    };
    
    this.previous = structuredClone(smoothed);
    return smoothed;
  }
  
  reset(): void {
    this.previous = null;
  }
}
