/**
 * MediaPipe to 3D Pose Converter
 * Converts MediaPipe pose landmarks to 3D skeleton joint rotations
 */

import { NormalizedLandmark } from '@mediapipe/pose';

export interface Joint3DRotation {
  x: number;
  y: number;
  z: number;
}

export interface Skeleton3DPose {
  spine: Joint3DRotation;
  neck: Joint3DRotation;
  leftShoulder: Joint3DRotation;
  rightShoulder: Joint3DRotation;
  leftElbow: Joint3DRotation;
  rightElbow: Joint3DRotation;
  leftHip: Joint3DRotation;
  rightHip: Joint3DRotation;
  leftKnee: Joint3DRotation;
  rightKnee: Joint3DRotation;
}

// MediaPipe landmark indices
const LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
};

/**
 * Calculate angle between three points
 */
function calculateAngle(p1: NormalizedLandmark, p2: NormalizedLandmark, p3: NormalizedLandmark): number {
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y
  };
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y
  };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
  return angle;
}

/**
 * Convert MediaPipe landmarks to 3D skeleton pose
 */
export function convertMediaPipeTo3D(landmarks: NormalizedLandmark[]): Skeleton3DPose {
  // Get key landmarks
  const nose = landmarks[LANDMARKS.NOSE];
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[LANDMARKS.RIGHT_WRIST];
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];
  
  // Calculate shoulder midpoint and hip midpoint
  const shoulderMidpoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  
  const hipMidpoint = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };
  
  // Calculate spine rotation (based on shoulder tilt and torso lean)
  const shoulderTilt = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);
  const hipTilt = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x);
  const spineLatera = shoulderTilt - hipTilt;
  
  // Calculate torso forward/backward lean
  const torsoLean = Math.atan2(shoulderMidpoint.z - hipMidpoint.z, shoulderMidpoint.y - hipMidpoint.y);
  
  // Calculate neck rotation (head position relative to shoulders)
  const neckLateral = Math.atan2(nose.x - shoulderMidpoint.x, nose.y - shoulderMidpoint.y);
  const neckForward = Math.atan2(nose.z - shoulderMidpoint.z, nose.y - shoulderMidpoint.y);
  
  // Calculate arm rotations
  const leftShoulderAngle = calculateAngle(leftElbow, leftShoulder, shoulderMidpoint);
  const rightShoulderAngle = calculateAngle(rightElbow, rightShoulder, shoulderMidpoint);
  
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  
  // Calculate leg rotations
  const leftHipAngle = calculateAngle(leftKnee, leftHip, hipMidpoint);
  const rightHipAngle = calculateAngle(rightKnee, rightHip, hipMidpoint);
  
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  
  return {
    spine: {
      x: Math.max(-0.5, Math.min(0.5, torsoLean * 2)), // Forward/backward lean
      y: 0, // Rotation around vertical axis (minimal from 2D data)
      z: Math.max(-0.3, Math.min(0.3, spineLatera * 3)) // Lateral flexion
    },
    neck: {
      x: Math.max(-0.4, Math.min(0.4, neckForward * 3)), // Head forward/back
      y: 0, // Head rotation (limited from front view)
      z: Math.max(-0.4, Math.min(0.4, neckLateral * 2)) // Head side tilt
    },
    leftShoulder: {
      x: Math.max(-1.0, Math.min(2.0, leftShoulderAngle - Math.PI/2)), // Flexion/extension
      y: 0, // Internal/external rotation (limited from front view)
      z: Math.max(-1.5, Math.min(1.5, (leftShoulder.y - shoulderMidpoint.y) * 3)) // Abduction
    },
    rightShoulder: {
      x: Math.max(-1.0, Math.min(2.0, rightShoulderAngle - Math.PI/2)),
      y: 0,
      z: Math.max(-1.5, Math.min(1.5, (rightShoulder.y - shoulderMidpoint.y) * 3))
    },
    leftElbow: {
      x: Math.max(0, Math.min(2.5, Math.PI - leftElbowAngle)), // Flexion only
      y: 0,
      z: 0
    },
    rightElbow: {
      x: Math.max(0, Math.min(2.5, Math.PI - rightElbowAngle)),
      y: 0,
      z: 0
    },
    leftHip: {
      x: Math.max(-1.0, Math.min(1.5, leftHipAngle - Math.PI/2)), // Flexion/extension
      y: 0, // Internal/external rotation (limited)
      z: Math.max(-0.5, Math.min(0.5, (leftHip.x - hipMidpoint.x) * 2)) // Abduction
    },
    rightHip: {
      x: Math.max(-1.0, Math.min(1.5, rightHipAngle - Math.PI/2)),
      y: 0,
      z: Math.max(-0.5, Math.min(0.5, (rightHip.x - hipMidpoint.x) * 2))
    },
    leftKnee: {
      x: Math.max(0, Math.min(2.5, Math.PI - leftKneeAngle)), // Flexion only
      y: 0,
      z: 0
    },
    rightKnee: {
      x: Math.max(0, Math.min(2.5, Math.PI - rightKneeAngle)),
      y: 0,
      z: 0
    }
  };
}

/**
 * Smooth pose transitions to prevent jittery movement
 */
export class Posesmoother {
  private previousPose: Skeleton3DPose | null = null;
  private smoothingFactor: number = 0.3;
  
  constructor(smoothingFactor: number = 0.3) {
    this.smoothingFactor = smoothingFactor;
  }
  
  smooth(newPose: Skeleton3DPose): Skeleton3DPose {
    if (!this.previousPose) {
      this.previousPose = newPose;
      return newPose;
    }
    
    const smoothed: Skeleton3DPose = {} as Skeleton3DPose;
    
    // Smooth each joint
    for (const [jointName, rotation] of Object.entries(newPose)) {
      const prevRotation = this.previousPose[jointName as keyof Skeleton3DPose];
      smoothed[jointName as keyof Skeleton3DPose] = {
        x: prevRotation.x + (rotation.x - prevRotation.x) * this.smoothingFactor,
        y: prevRotation.y + (rotation.y - prevRotation.y) * this.smoothingFactor,
        z: prevRotation.z + (rotation.z - prevRotation.z) * this.smoothingFactor
      };
    }
    
    this.previousPose = smoothed;
    return smoothed;
  }
  
  reset() {
    this.previousPose = null;
  }
}