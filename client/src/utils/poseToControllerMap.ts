/**
 * Pose to Controller Map Utility
 * 
 * Converts MediaPipe pose angles to BONE_MAPPING compatible values.
 * Uses anatomical range limits to normalize inputs so the skeleton
 * moves within physiologically realistic constraints.
 * 
 * This bridges the gap between:
 * - MediaPipe: raw joint angles in radians
 * - BONE_MAPPING: normalized offsets applied to bone rotations
 */

import { Skeleton3DPose, Joint3DRotation } from './mediapipeTo3D';

/**
 * Joint movement ranges in radians (anatomical norms)
 * Used to normalize MediaPipe values to the skeleton's control range
 */
export const ANATOMICAL_RANGES = {
  shoulder: {
    flexion: { min: -0.35, max: Math.PI * 0.9 },      // -20° to 162° (arm down to overhead)
    abduction: { min: -0.17, max: Math.PI * 0.9 },    // -10° to 162° (arm down to overhead)
    internalRotation: { min: -1.4, max: 1.4 }         // ±80°
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
  spine: {
    forward: { min: -0.5, max: 0.7 },                  // Extension to flexion
    lateral: { min: -0.5, max: 0.5 }                   // Side bending
  },
  neck: {
    forward: { min: -0.5, max: 0.5 },
    lateral: { min: -0.4, max: 0.4 }
  }
};

/**
 * Controller output format matching BONE_MAPPING expectations
 */
export interface ControllerValues {
  leftShoulder: { flexion: number; abduction: number };
  rightShoulder: { flexion: number; abduction: number };
  leftElbow: { flexion: number };
  rightElbow: { flexion: number };
  leftHip: { flexion: number; abduction: number };
  rightHip: { flexion: number; abduction: number };
  leftKnee: { flexion: number };
  rightKnee: { flexion: number };
  pelvis: { tilt: number; obliquity: number };
  neck: { flexion: number; lateralFlexion: number };
}

/**
 * Clamp a value within a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a raw angle to a controller value
 * Maps the anatomical range to [-1, 1] or [0, 1] depending on the movement
 */
function normalizeToRange(
  value: number, 
  range: { min: number; max: number },
  zeroPoint: 'min' | 'center' = 'min'
): number {
  const clamped = clamp(value, range.min, range.max);
  
  if (zeroPoint === 'center') {
    // Bidirectional movement (e.g., lateral flexion): normalize to [-1, 1]
    const center = (range.min + range.max) / 2;
    const halfRange = (range.max - range.min) / 2;
    return (clamped - center) / halfRange;
  } else {
    // Unidirectional movement (e.g., elbow flexion): normalize to [0, 1]
    return (clamped - range.min) / (range.max - range.min);
  }
}

/**
 * Apply dead zone to reduce jitter near neutral positions
 */
function applyDeadZone(value: number, threshold: number = 0.05): number {
  if (Math.abs(value) < threshold) return 0;
  // Scale remaining range to preserve full motion
  const sign = value > 0 ? 1 : -1;
  return sign * (Math.abs(value) - threshold) / (1 - threshold);
}

/**
 * Convert Skeleton3DPose to controller-compatible values
 * 
 * The output values are in the same units expected by BONE_MAPPING:
 * - flexion/abduction values that match the slider scale factors
 * - Properly signed for left/right symmetry
 */
export function poseToControllerValues(pose: Skeleton3DPose): ControllerValues {
  const { shoulder, elbow, hip, knee, spine, neck } = ANATOMICAL_RANGES;
  
  // Left Shoulder
  // pose.leftShoulder.x = flexion angle (forward raise)
  // pose.leftShoulder.z = abduction angle (side raise)
  const leftShoulderFlexion = normalizeToRange(pose.leftShoulder.x, shoulder.flexion) * shoulder.flexion.max;
  const leftShoulderAbduction = normalizeToRange(pose.leftShoulder.z, shoulder.abduction) * shoulder.abduction.max;
  
  // Right Shoulder
  const rightShoulderFlexion = normalizeToRange(pose.rightShoulder.x, shoulder.flexion) * shoulder.flexion.max;
  const rightShoulderAbduction = normalizeToRange(pose.rightShoulder.z, shoulder.abduction) * shoulder.abduction.max;
  
  // Elbows (flexion only - straight=0, bent=positive)
  const leftElbowFlexion = normalizeToRange(pose.leftElbow.x, elbow.flexion) * elbow.flexion.max;
  const rightElbowFlexion = normalizeToRange(pose.rightElbow.x, elbow.flexion) * elbow.flexion.max;
  
  // Left Hip
  const leftHipFlexion = normalizeToRange(pose.leftHip.x, hip.flexion) * hip.flexion.max;
  const leftHipAbduction = normalizeToRange(pose.leftHip.z, hip.abduction) * hip.abduction.max;
  
  // Right Hip
  const rightHipFlexion = normalizeToRange(pose.rightHip.x, hip.flexion) * hip.flexion.max;
  const rightHipAbduction = normalizeToRange(pose.rightHip.z, hip.abduction) * hip.abduction.max;
  
  // Knees
  const leftKneeFlexion = normalizeToRange(pose.leftKnee.x, knee.flexion) * knee.flexion.max;
  const rightKneeFlexion = normalizeToRange(pose.rightKnee.x, knee.flexion) * knee.flexion.max;
  
  // Pelvis (derived from spine pose)
  const pelvisTilt = applyDeadZone(
    normalizeToRange(pose.spine.x, spine.forward, 'center')
  ) * 0.5; // Scale down for subtle pelvic movement
  
  const pelvisObliquity = applyDeadZone(
    normalizeToRange(pose.spine.z, spine.lateral, 'center')
  ) * 0.3;
  
  // Neck
  const neckFlexion = applyDeadZone(
    normalizeToRange(pose.neck.x, neck.forward, 'center')
  ) * 0.5;
  
  const neckLateralFlexion = applyDeadZone(
    normalizeToRange(pose.neck.z, neck.lateral, 'center')
  ) * 0.4;
  
  return {
    leftShoulder: { 
      flexion: leftShoulderFlexion, 
      abduction: leftShoulderAbduction 
    },
    rightShoulder: { 
      flexion: rightShoulderFlexion, 
      abduction: rightShoulderAbduction 
    },
    leftElbow: { flexion: leftElbowFlexion },
    rightElbow: { flexion: rightElbowFlexion },
    leftHip: { 
      flexion: leftHipFlexion, 
      abduction: leftHipAbduction 
    },
    rightHip: { 
      flexion: rightHipFlexion, 
      abduction: rightHipAbduction 
    },
    leftKnee: { flexion: leftKneeFlexion },
    rightKnee: { flexion: rightKneeFlexion },
    pelvis: { 
      tilt: pelvisTilt, 
      obliquity: pelvisObliquity 
    },
    neck: { 
      flexion: neckFlexion, 
      lateralFlexion: neckLateralFlexion 
    }
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
  
  constructor(smoothingFactor: number = 0.4, noiseThreshold: number = 0.02) {
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
        ? this.smoothingFactor * 0.3 
        : this.smoothingFactor;
      return prev + delta * factor;
    };
    
    const smoothed: ControllerValues = {
      leftShoulder: {
        flexion: smoothValue(current.leftShoulder.flexion, this.previous.leftShoulder.flexion),
        abduction: smoothValue(current.leftShoulder.abduction, this.previous.leftShoulder.abduction)
      },
      rightShoulder: {
        flexion: smoothValue(current.rightShoulder.flexion, this.previous.rightShoulder.flexion),
        abduction: smoothValue(current.rightShoulder.abduction, this.previous.rightShoulder.abduction)
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
      pelvis: {
        tilt: smoothValue(current.pelvis.tilt, this.previous.pelvis.tilt),
        obliquity: smoothValue(current.pelvis.obliquity, this.previous.pelvis.obliquity)
      },
      neck: {
        flexion: smoothValue(current.neck.flexion, this.previous.neck.flexion),
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
