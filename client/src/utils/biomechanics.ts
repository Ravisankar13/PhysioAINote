// Biomechanics calculation utilities for movement analysis
import { NormalizedLandmark } from '@mediapipe/pose';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface JointAngle {
  joint: string;
  angle: number;
  plane: 'sagittal' | 'frontal' | 'transverse';
  side?: 'left' | 'right';
  normalRange: { min: number; max: number };
  isWithinNormal: boolean;
}

export interface MovementMetrics {
  jointAngles: JointAngle[];
  centerOfMass: Vector3D;
  stability: number;
  symmetry: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Test-specific metrics
  lungeMetrics?: {
    depth: number;
    kneeAngle: number;
    stability: number;
    symmetry: number;
  };
  
  balance?: {
    swayVelocity: number;
    comDeviation: number;
    strategy: string;
    timeInBalance: number;
  };
  
  dropJump?: {
    landingForce: number;
    kneeFlexion: number;
    valgusAngle: number;
    reactiveStrengthIndex: number;
  };
  
  shoulder?: {
    flexionAngle: number;
    scapularWinging: boolean;
    symmetry: number;
    compensationPattern: string;
  };
  
  core?: {
    pelvicTilt: number;
    rotationControl: boolean;
    trunkLean: number;
    stability: number;
  };
  
  gait?: {
    cadence: number;
    stepLength: number;
    strideTime: number;
    gaitCycle: 'stance' | 'swing';
  };
  
  squatDepth?: number;
  heelLift?: boolean;
  shoulderFlexion?: number;
  armSwing?: string;
}

// Landmark indices for MediaPipe Pose
export const POSE_LANDMARKS = {
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
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

// Normal ranges for common joint angles (in degrees)
export const NORMAL_RANGES = {
  hip: {
    flexion: { min: 0, max: 120 },
    extension: { min: 0, max: 30 },
    abduction: { min: 0, max: 45 },
    adduction: { min: 0, max: 30 }
  },
  knee: {
    flexion: { min: 0, max: 135 },
    extension: { min: -5, max: 0 }
  },
  ankle: {
    dorsiflexion: { min: 0, max: 20 },
    plantarflexion: { min: 0, max: 50 }
  },
  shoulder: {
    flexion: { min: 0, max: 180 },
    extension: { min: 0, max: 60 },
    abduction: { min: 0, max: 180 }
  },
  elbow: {
    flexion: { min: 0, max: 145 },
    extension: { min: 0, max: 0 }
  },
  spine: {
    flexion: { min: 0, max: 80 },
    extension: { min: 0, max: 30 },
    lateralFlexion: { min: 0, max: 35 },
    rotation: { min: 0, max: 45 }
  }
};

// Vector operations
export function createVector(from: NormalizedLandmark, to: NormalizedLandmark): Vector3D {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z
  };
}

export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVector(v: Vector3D): Vector3D {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / mag,
    y: v.y / mag,
    z: v.z / mag
  };
}

export function dotProduct(v1: Vector3D, v2: Vector3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

export function crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
}

// Calculate angle between three points
export function calculateAngle(
  point1: NormalizedLandmark,
  point2: NormalizedLandmark, // vertex
  point3: NormalizedLandmark
): number {
  const v1 = createVector(point2, point1);
  const v2 = createVector(point2, point3);
  
  const v1Norm = normalizeVector(v1);
  const v2Norm = normalizeVector(v2);
  
  const dot = dotProduct(v1Norm, v2Norm);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angleRadians = Math.acos(clampedDot);
  
  return angleRadians * (180 / Math.PI);
}

// Calculate hip flexion angle
export function calculateHipFlexion(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): JointAngle {
  const hip = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const knee = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const shoulder = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER] : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  
  const angle = calculateAngle(shoulder, hip, knee);
  
  return {
    joint: `${side}_hip`,
    angle: 180 - angle, // Convert to flexion angle
    plane: 'sagittal',
    side,
    normalRange: NORMAL_RANGES.hip.flexion,
    isWithinNormal: angle >= NORMAL_RANGES.hip.flexion.min && angle <= NORMAL_RANGES.hip.flexion.max
  };
}

// Calculate knee flexion angle
export function calculateKneeFlexion(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): JointAngle {
  const hip = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const knee = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const ankle = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_ANKLE] : landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  
  const angle = calculateAngle(hip, knee, ankle);
  
  return {
    joint: `${side}_knee`,
    angle: 180 - angle,
    plane: 'sagittal',
    side,
    normalRange: NORMAL_RANGES.knee.flexion,
    isWithinNormal: angle >= NORMAL_RANGES.knee.flexion.min && angle <= NORMAL_RANGES.knee.flexion.max
  };
}

// Calculate ankle dorsiflexion
export function calculateAnkleDorsiflexion(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): JointAngle {
  const knee = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const ankle = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_ANKLE] : landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const footIndex = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX] : landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX];
  
  const angle = calculateAngle(knee, ankle, footIndex);
  
  return {
    joint: `${side}_ankle`,
    angle: angle - 90, // Convert to dorsiflexion angle
    plane: 'sagittal',
    side,
    normalRange: NORMAL_RANGES.ankle.dorsiflexion,
    isWithinNormal: (angle - 90) >= NORMAL_RANGES.ankle.dorsiflexion.min && 
                     (angle - 90) <= NORMAL_RANGES.ankle.dorsiflexion.max
  };
}

// Calculate shoulder flexion
export function calculateShoulderFlexion(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): JointAngle {
  const hip = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const shoulder = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER] : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const elbow = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_ELBOW] : landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  
  const angle = calculateAngle(hip, shoulder, elbow);
  
  return {
    joint: `${side}_shoulder`,
    angle: angle,
    plane: 'sagittal',
    side,
    normalRange: NORMAL_RANGES.shoulder.flexion,
    isWithinNormal: angle >= NORMAL_RANGES.shoulder.flexion.min && angle <= NORMAL_RANGES.shoulder.flexion.max
  };
}

// Calculate elbow flexion
export function calculateElbowFlexion(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): JointAngle {
  const shoulder = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER] : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const elbow = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_ELBOW] : landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const wrist = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_WRIST] : landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  
  const angle = calculateAngle(shoulder, elbow, wrist);
  
  return {
    joint: `${side}_elbow`,
    angle: 180 - angle,
    plane: 'sagittal',
    side,
    normalRange: NORMAL_RANGES.elbow.flexion,
    isWithinNormal: angle >= NORMAL_RANGES.elbow.flexion.min && angle <= NORMAL_RANGES.elbow.flexion.max
  };
}

// Calculate trunk lean angle
export function calculateTrunkLean(landmarks: NormalizedLandmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  
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
  
  // Calculate angle from vertical (frontal plane)
  const dx = shoulderMidpoint.x - hipMidpoint.x;
  const dy = shoulderMidpoint.y - hipMidpoint.y;
  
  return Math.atan2(dx, -dy) * (180 / Math.PI);
}

// Calculate pelvic tilt
export function calculatePelvicTilt(landmarks: NormalizedLandmark[]): number {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  
  // Calculate angle in frontal plane
  const dy = leftHip.y - rightHip.y;
  const dx = leftHip.x - rightHip.x;
  
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// Detect knee valgus (knock knees)
export function detectKneeValgus(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right'
): { present: boolean; severity: 'mild' | 'moderate' | 'severe' | null } {
  const hip = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const knee = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const ankle = side === 'left' ? landmarks[POSE_LANDMARKS.LEFT_ANKLE] : landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  
  // Calculate Q-angle (quadriceps angle)
  const hipToKneeVector = createVector(hip, knee);
  const kneeToAnkleVector = createVector(knee, ankle);
  
  const angle = calculateAngle(hip, knee, ankle);
  const frontalDeviation = Math.abs(knee.x - ((hip.x + ankle.x) / 2));
  
  let severity: 'mild' | 'moderate' | 'severe' | null = null;
  let present = false;
  
  if (frontalDeviation > 0.02) { // Threshold in normalized coordinates
    present = true;
    if (frontalDeviation < 0.04) severity = 'mild';
    else if (frontalDeviation < 0.06) severity = 'moderate';
    else severity = 'severe';
  }
  
  return { present, severity };
}

// Detect Trendelenburg sign
export function detectTrendelenburg(landmarks: NormalizedLandmark[]): boolean {
  const pelvicTilt = Math.abs(calculatePelvicTilt(landmarks));
  return pelvicTilt > 10; // More than 10 degrees of pelvic drop
}

// Calculate center of mass
export function calculateCenterOfMass(landmarks: NormalizedLandmark[]): Vector3D {
  // Simplified COM calculation using major body segments
  const keyPoints = [
    landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  ];
  
  const com = keyPoints.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y,
    z: acc.z + point.z
  }), { x: 0, y: 0, z: 0 });
  
  return {
    x: com.x / keyPoints.length,
    y: com.y / keyPoints.length,
    z: com.z / keyPoints.length
  };
}

// Calculate symmetry index
export function calculateSymmetry(landmarks: NormalizedLandmark[]): number {
  const leftHipAngle = calculateHipFlexion(landmarks, 'left').angle;
  const rightHipAngle = calculateHipFlexion(landmarks, 'right').angle;
  const leftKneeAngle = calculateKneeFlexion(landmarks, 'left').angle;
  const rightKneeAngle = calculateKneeFlexion(landmarks, 'right').angle;
  
  const hipDiff = Math.abs(leftHipAngle - rightHipAngle);
  const kneeDiff = Math.abs(leftKneeAngle - rightKneeAngle);
  
  // Normalize to 0-100 scale (100 = perfect symmetry)
  const maxDiff = 45; // Maximum expected difference
  const avgDiff = (hipDiff + kneeDiff) / 2;
  
  return Math.max(0, 100 - (avgDiff / maxDiff) * 100);
}

// Calculate all joint angles
export function calculateAllJointAngles(landmarks: NormalizedLandmark[]): JointAngle[] {
  return [
    calculateHipFlexion(landmarks, 'left'),
    calculateHipFlexion(landmarks, 'right'),
    calculateKneeFlexion(landmarks, 'left'),
    calculateKneeFlexion(landmarks, 'right'),
    calculateAnkleDorsiflexion(landmarks, 'left'),
    calculateAnkleDorsiflexion(landmarks, 'right'),
    calculateShoulderFlexion(landmarks, 'left'),
    calculateShoulderFlexion(landmarks, 'right'),
    calculateElbowFlexion(landmarks, 'left'),
    calculateElbowFlexion(landmarks, 'right')
  ];
}

// Analyze movement quality
export function analyzeMovementQuality(
  landmarks: NormalizedLandmark[]
): MovementMetrics {
  const jointAngles = calculateAllJointAngles(landmarks);
  const centerOfMass = calculateCenterOfMass(landmarks);
  const symmetry = calculateSymmetry(landmarks);
  
  // Calculate stability based on COM displacement
  const comDisplacement = vectorMagnitude(centerOfMass);
  const stability = Math.max(0, 100 - comDisplacement * 200); // Normalize to 0-100
  
  // Determine overall quality
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  const avgScore = (symmetry + stability) / 2;
  
  if (avgScore >= 80) quality = 'excellent';
  else if (avgScore >= 60) quality = 'good';
  else if (avgScore >= 40) quality = 'fair';
  else quality = 'poor';
  
  return {
    jointAngles,
    centerOfMass,
    stability,
    symmetry,
    quality
  };
}