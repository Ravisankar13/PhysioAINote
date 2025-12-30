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
  
  // Calculate arm rotations using true 3D shoulder-to-elbow vector
  // MediaPipe coordinate system: x=right, y=down, z=toward camera
  // THREE.js skeleton: y=up, so we need to flip y
  
  // Left arm: compute 3D vector from shoulder to elbow
  const leftArmVec = {
    x: leftElbow.x - leftShoulder.x,  // positive = elbow to the right of shoulder
    y: -(leftElbow.y - leftShoulder.y), // flip: positive = elbow above shoulder (THREE.js y-up)
    z: leftElbow.z - leftShoulder.z   // positive = elbow toward camera
  };
  
  // Right arm: compute 3D vector from shoulder to elbow  
  const rightArmVec = {
    x: rightElbow.x - rightShoulder.x,
    y: -(rightElbow.y - rightShoulder.y),
    z: rightElbow.z - rightShoulder.z
  };
  
  // Normalize vectors
  const leftArmLen = Math.sqrt(leftArmVec.x * leftArmVec.x + leftArmVec.y * leftArmVec.y + leftArmVec.z * leftArmVec.z) || 0.001;
  const rightArmLen = Math.sqrt(rightArmVec.x * rightArmVec.x + rightArmVec.y * rightArmVec.y + rightArmVec.z * rightArmVec.z) || 0.001;
  
  const leftArmDir = { x: leftArmVec.x / leftArmLen, y: leftArmVec.y / leftArmLen, z: leftArmVec.z / leftArmLen };
  const rightArmDir = { x: rightArmVec.x / rightArmLen, y: rightArmVec.y / rightArmLen, z: rightArmVec.z / rightArmLen };
  
  // Abduction: angle from vertical (y-axis) in the frontal plane (x-y plane)
  // When arm is down: dir.y ≈ -1 (pointing down), angle ≈ 0
  // When arm is raised sideways: dir.x ≈ ±1, dir.y ≈ 0, angle ≈ 90°
  const leftAbduction = Math.atan2(-leftArmDir.x, -leftArmDir.y); // Left arm abducts to the left (negative x)
  const rightAbduction = Math.atan2(rightArmDir.x, -rightArmDir.y); // Right arm abducts to the right (positive x)
  
  // Forward flexion: angle in sagittal plane (y-z plane)
  // When arm is down: dir.y ≈ -1, angle ≈ 0
  // When arm is forward: dir.z > 0, angle increases
  const leftFlexion = Math.atan2(leftArmDir.z, -leftArmDir.y);
  const rightFlexion = Math.atan2(rightArmDir.z, -rightArmDir.y);
  
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
      x: Math.max(-0.5, Math.min(2.5, leftAbduction)), // Abduction (arm raised sideways)
      y: 0, // Internal/external rotation (limited from front view)
      z: Math.max(-1.5, Math.min(1.5, leftFlexion)) // Forward flexion
    },
    rightShoulder: {
      x: Math.max(-0.5, Math.min(2.5, rightAbduction)), // Abduction
      y: 0,
      z: Math.max(-1.5, Math.min(1.5, rightFlexion)) // Forward flexion
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
  private smoothingFactor: number = 0.2; // Lower = smoother but slower response
  private noiseThreshold: number = 0.015; // Attenuate changes smaller than this
  
  constructor(smoothingFactor: number = 0.2) {
    this.smoothingFactor = smoothingFactor;
  }
  
  smooth(newPose: Skeleton3DPose): Skeleton3DPose {
    if (!this.previousPose) {
      this.previousPose = newPose;
      return newPose;
    }
    
    const smoothed: Skeleton3DPose = {} as Skeleton3DPose;
    
    // Smooth each joint with adaptive noise attenuation
    for (const [jointName, rotation] of Object.entries(newPose)) {
      const prevRotation = this.previousPose[jointName as keyof Skeleton3DPose];
      
      // Calculate delta
      const deltaX = rotation.x - prevRotation.x;
      const deltaY = rotation.y - prevRotation.y;
      const deltaZ = rotation.z - prevRotation.z;
      
      // Adaptive smoothing: attenuate small movements more, let larger movements through faster
      // This reduces jitter when still but allows slow deliberate movements
      const scaleX = Math.abs(deltaX) < this.noiseThreshold ? 0.3 : 1.0;
      const scaleY = Math.abs(deltaY) < this.noiseThreshold ? 0.3 : 1.0;
      const scaleZ = Math.abs(deltaZ) < this.noiseThreshold ? 0.3 : 1.0;
      
      smoothed[jointName as keyof Skeleton3DPose] = {
        x: prevRotation.x + deltaX * this.smoothingFactor * scaleX,
        y: prevRotation.y + deltaY * this.smoothingFactor * scaleY,
        z: prevRotation.z + deltaZ * this.smoothingFactor * scaleZ
      };
    }
    
    this.previousPose = smoothed;
    return smoothed;
  }
  
  reset() {
    this.previousPose = null;
  }
}