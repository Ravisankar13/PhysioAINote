/**
 * MediaPipe to 3D Pose Converter
 * Converts MediaPipe pose landmarks to 3D skeleton joint rotations
 * 
 * MediaPipe coordinate system:
 * - X: 0 (left edge) to 1 (right edge) - increases to the right
 * - Y: 0 (top) to 1 (bottom) - increases downward
 * - Z: Depth - negative values toward camera, positive away
 * 
 * GLB Skeleton coordinate system (THREE.js):
 * - X: Right
 * - Y: Up
 * - Z: Toward camera (out of screen)
 */

import { NormalizedLandmark } from '@mediapipe/pose';

export interface Joint3DRotation {
  x: number; // Typically flexion/extension
  y: number; // Typically internal/external rotation
  z: number; // Typically abduction/adduction
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
  leftWrist: Joint3DRotation;
  rightWrist: Joint3DRotation;
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

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Create a 3D vector from two landmarks (from -> to)
 * Converts from MediaPipe coords to THREE.js coords
 */
function createVector(from: NormalizedLandmark, to: NormalizedLandmark): Vec3 {
  return {
    x: to.x - from.x,           // Right is positive
    y: -(to.y - from.y),        // Flip Y: up is positive in THREE.js
    z: -(to.z - from.z)         // Flip Z: toward camera is positive in THREE.js
  };
}

/**
 * Normalize a vector
 */
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: -1, z: 0 }; // Default down vector
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Calculate the angle between two vectors using dot product
 */
function angleBetweenVectors(v1: Vec3, v2: Vec3): number {
  const n1 = normalize(v1);
  const n2 = normalize(v2);
  const dot = n1.x * n2.x + n1.y * n2.y + n1.z * n2.z;
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

/**
 * Calculate the angle of a limb from the vertical (Y-axis) in the frontal plane (X-Y plane)
 * This gives us abduction angle for arms/legs
 * Positive = abducted outward from body
 */
function calculateAbduction(limbDir: Vec3, isLeftSide: boolean): number {
  // Project onto frontal plane (X-Y), measure angle from vertical (down = -Y)
  const frontalAngle = Math.atan2(limbDir.x, -limbDir.y);
  // For left side, negative X means abducted; for right side, positive X means abducted
  return isLeftSide ? -frontalAngle : frontalAngle;
}

/**
 * Calculate the angle of a limb from vertical in the sagittal plane (Z-Y plane)
 * This gives us flexion angle
 * Positive = flexed forward
 */
function calculateFlexion(limbDir: Vec3): number {
  // Project onto sagittal plane (Y-Z), measure angle from vertical
  // Forward flexion: positive Z component
  return Math.atan2(limbDir.z, -limbDir.y);
}

/**
 * Calculate elbow/knee flexion angle (the bend at the joint)
 * Returns angle in radians where 0 = straight, PI = fully bent
 */
function calculateJointFlexion(
  proximal: NormalizedLandmark,  // shoulder or hip
  joint: NormalizedLandmark,     // elbow or knee
  distal: NormalizedLandmark     // wrist or ankle
): number {
  const upperVec = createVector(joint, proximal);
  const lowerVec = createVector(joint, distal);
  const angle = angleBetweenVectors(upperVec, lowerVec);
  // Convert: when arm is straight, angle ≈ PI (vectors point opposite)
  // We want 0 = straight, so: flexion = PI - angle
  return Math.PI - angle;
}

/**
 * Calculate hip flexion using the thigh direction relative to the torso
 */
function calculateHipFlexion(
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  hipMidpoint: Vec3
): number {
  const thighDir = normalize(createVector(hip, knee));
  // When standing straight, thigh points down (-Y)
  // Flexion is forward (positive Z)
  return Math.atan2(thighDir.z, -thighDir.y);
}

/**
 * Calculate hip abduction
 */
function calculateHipAbduction(
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  isLeft: boolean
): number {
  const thighDir = normalize(createVector(hip, knee));
  // When standing straight, thigh points down
  // Abduction moves leg outward (left leg: negative X, right leg: positive X)
  const angle = Math.atan2(Math.abs(thighDir.x), -thighDir.y);
  return angle;
}

/**
 * Convert MediaPipe landmarks to 3D skeleton pose
 * All rotations are in radians
 */
export function convertMediaPipeTo3D(landmarks: NormalizedLandmark[], mirrorMode: boolean = false): Skeleton3DPose {
  // Mirror mode handling:
  // - Keep all calculations in the original anatomical coordinate frame
  // - After computing joint rotations, swap left/right outputs if mirrored
  // - This preserves biomechanical sign conventions while matching the user's view
  
  // Extract key landmarks (no coordinate modifications - keeps math correct)
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

  // Calculate reference points
  const shoulderMid: Vec3 = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: -((leftShoulder.y + rightShoulder.y) / 2),
    z: -((leftShoulder.z + rightShoulder.z) / 2)
  };
  
  const hipMid: Vec3 = {
    x: (leftHip.x + rightHip.x) / 2,
    y: -((leftHip.y + rightHip.y) / 2),
    z: -((leftHip.z + rightHip.z) / 2)
  };

  // === SPINE CALCULATIONS ===
  // Lateral tilt: difference in shoulder heights vs hip heights
  const shoulderTilt = Math.atan2(
    -(rightShoulder.y - leftShoulder.y), // Flip for Y-up
    rightShoulder.x - leftShoulder.x
  );
  const hipTilt = Math.atan2(
    -(rightHip.y - leftHip.y),
    rightHip.x - leftHip.x
  );
  const spineLateral = shoulderTilt - hipTilt;
  
  // Forward lean: how much the shoulders are forward/back of hips
  const spineForward = Math.atan2(
    -(shoulderMid.z - hipMid.z),
    shoulderMid.y - hipMid.y
  );

  // === HEAD/NECK CALCULATIONS ===
  // Use ears and nose for robust head orientation
  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  const leftEye = landmarks[LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[LANDMARKS.RIGHT_EYE];
  
  // Ear-to-ear vector for head orientation basis
  const earVector = createVector(leftEar, rightEar);
  const eyeVector = createVector(leftEye, rightEye);
  
  // YAW (head rotation left/right): determined by ear Z difference
  // When head turns right, right ear moves closer to camera (more negative Z in MediaPipe)
  // After coordinate conversion, this means rightEar.z > leftEar.z when turning right
  // Using atan2 for the angle: positive = turned right, negative = turned left
  const headYaw = Math.atan2(earVector.z, Math.abs(earVector.x) || 0.01) * 1.5; // Scale up for visibility
  
  // ROLL (head tilt sideways): determined by ear height difference
  // When tilting head right, right ear drops (higher Y in MediaPipe, lower in THREE.js)
  const headRoll = Math.atan2(earVector.y, Math.abs(earVector.x) || 0.01);
  
  // PITCH (nodding up/down): nose position relative to eye midpoint
  // When looking down, nose Y increases (in MediaPipe), becomes more negative in THREE.js
  const eyeMidY = -(leftEye.y + rightEye.y) / 2;
  const noseY = -nose.y;
  const eyeMidZ = -(leftEye.z + rightEye.z) / 2;
  const noseZ = -nose.z;
  // Pitch is forward/back nod - comparing nose to eye center position
  const headPitch = Math.atan2(noseY - eyeMidY, Math.abs(noseZ - eyeMidZ) + 0.01) - 0.3; // Offset for natural head angle

  // === ARM CALCULATIONS ===
  // Left upper arm direction (shoulder to elbow)
  const leftUpperArm = normalize(createVector(leftShoulder, leftElbow));
  const leftForearm = normalize(createVector(leftElbow, leftWrist));
  
  // Right upper arm direction
  const rightUpperArm = normalize(createVector(rightShoulder, rightElbow));
  const rightForearm = normalize(createVector(rightElbow, rightWrist));

  // SIMPLIFIED DIRECT MAPPING for shoulder angles
  // 
  // The key insight: we map arm position directly to skeleton rotation axes:
  // - FLEXION: arm moving forward/backward (rotation around Y axis in skeleton)
  // - ABDUCTION: arm moving up/sideways (rotation around Z axis in skeleton)
  //
  // In the camera view:
  // - User faces camera, so +Z in THREE.js = toward camera = backward for user
  // - When user raises arm FORWARD (toward camera), skeleton should show flexion
  // - When user raises arm UP/SIDEWAYS, skeleton should show abduction
  //
  // The arm vector after conversion:
  // - Arm down: (0, -1, 0)
  // - Arm forward (toward camera): (0, 0, +1) 
  // - Arm to side: (±1, 0, 0)
  // - Arm up: (0, +1, 0)
  
  // FLEXION: How much the arm is forward/backward (Z component relative to vertical)
  // When arm is forward (z positive), flexion increases
  // atan2(z, |y|) gives angle in sagittal plane
  const leftShoulderFlexion = Math.atan2(leftUpperArm.z, Math.abs(leftUpperArm.y));
  const rightShoulderFlexion = Math.atan2(rightUpperArm.z, Math.abs(rightUpperArm.y));
  
  // ABDUCTION: How much the arm is raised laterally (combines X and Y)
  // For left arm: negative X = abduction (arm going left)
  // For right arm: positive X = abduction (arm going right)  
  // Also, positive Y = arm raised up
  //
  // Key insight: abduction should increase when arm goes UP or SIDEWAYS
  // Use the elevation from vertical, but only when in the frontal plane
  //
  // Elevation from down = acos(-y) gives total angle from vertical down
  // But we want abduction specifically (lateral elevation)
  // Abduction = atan2(horizontal-lateral-distance, -vertical)
  //
  // For left arm: lateral distance = -x (left is positive abduction)
  // For right arm: lateral distance = +x (right is positive abduction)
  // Vertical down reference = -y
  //
  // When arm is down: x≈0, y≈-1 → atan2(0, 1) = 0
  // When arm is sideways: x≈-1 (left), y≈0 → atan2(1, 0) = π/2
  // When arm is straight up: x≈0, y≈+1 → atan2(0, -1) = π
  // But straight up should be ~180° of abduction which is correct!
  
  const leftShoulderAbduction = Math.atan2(-leftUpperArm.x, -leftUpperArm.y);
  const rightShoulderAbduction = Math.atan2(rightUpperArm.x, -rightUpperArm.y);

  // Elbow flexion (bend angle at elbow)
  const leftElbowFlexion = calculateJointFlexion(leftShoulder, leftElbow, leftWrist);
  const rightElbowFlexion = calculateJointFlexion(rightShoulder, rightElbow, rightWrist);

  // === LEG CALCULATIONS ===
  // Thigh directions
  const leftThigh = normalize(createVector(leftHip, leftKnee));
  const rightThigh = normalize(createVector(rightHip, rightKnee));
  
  // Shin directions
  const leftShin = normalize(createVector(leftKnee, leftAnkle));
  const rightShin = normalize(createVector(rightKnee, rightAnkle));

  // Hip flexion (leg raised forward) - stored in .x
  const leftHipFlexion = Math.atan2(leftThigh.z, -leftThigh.y);
  const rightHipFlexion = Math.atan2(rightThigh.z, -rightThigh.y);
  
  // Hip abduction (leg moved outward) - stored in .z
  // Left leg: negative X = abducted (moved left), positive X = adducted (moved right/medial)
  // Right leg: positive X = abducted (moved right), negative X = adducted (moved left/medial)
  // Keep signed values to distinguish abduction vs adduction
  const leftHipAbduction = Math.atan2(-leftThigh.x, -leftThigh.y);  // Negative X for left leg = positive abduction
  const rightHipAbduction = Math.atan2(rightThigh.x, -rightThigh.y); // Positive X for right leg = positive abduction

  // Knee flexion
  const leftKneeFlexion = calculateJointFlexion(leftHip, leftKnee, leftAnkle);
  const rightKneeFlexion = calculateJointFlexion(rightHip, rightKnee, rightAnkle);

  // Clamp helper
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Build the base pose from calculated values
  const leftShoulderJoint = {
    x: clamp(leftShoulderFlexion, -0.5, Math.PI),    // Flexion (arm forward) - mapped to bone X axis
    y: 0,                                             // Internal/external rotation
    z: clamp(leftShoulderAbduction, -0.3, Math.PI)   // Abduction (arm out to side) - mapped to bone Z axis
  };
  const rightShoulderJoint = {
    x: clamp(rightShoulderFlexion, -0.5, Math.PI),   // Flexion
    y: 0,
    z: clamp(rightShoulderAbduction, -0.3, Math.PI)  // Abduction
  };
  const leftElbowJoint = {
    x: clamp(leftElbowFlexion, 0, 2.5),              // Flexion only (0 = straight, 2.5 = max bend)
    y: 0,
    z: 0
  };
  const rightElbowJoint = {
    x: clamp(rightElbowFlexion, 0, 2.5),
    y: 0,
    z: 0
  };
  const leftHipJoint = {
    x: clamp(leftHipFlexion, -0.5, 2.0),             // Flexion (leg forward)
    y: 0,
    z: clamp(leftHipAbduction, -0.3, 0.8)            // Abduction (leg outward)
  };
  const rightHipJoint = {
    x: clamp(rightHipFlexion, -0.5, 2.0),
    y: 0,
    z: clamp(rightHipAbduction, -0.3, 0.8)
  };
  const leftKneeJoint = {
    x: clamp(leftKneeFlexion, 0, 2.5),               // Flexion only
    y: 0,
    z: 0
  };
  const rightKneeJoint = {
    x: clamp(rightKneeFlexion, 0, 2.5),
    y: 0,
    z: 0
  };

  // When mirror mode is ON, swap left/right joints AND invert lateral (z) components
  // The webcam shows a mirror image, so:
  // 1. User's left arm appears on right side of screen → we detect it as rightShoulder landmarks
  // 2. Lateral movements (X-axis) are reversed in the mirrored view
  // 3. We swap joints AND negate z (abduction) to correct both issues
  if (mirrorMode) {
    return {
      spine: {
        x: clamp(spineForward, -0.8, 0.8),
        y: 0,
        z: clamp(-spineLateral, -0.5, 0.5)  // Invert lateral tilt for mirror
      },
      neck: {
        x: clamp(headPitch, -0.6, 0.6),      // Pitch (nodding up/down)
        y: clamp(-headYaw, -0.8, 0.8),       // Yaw (rotation) - inverted for mirror
        z: clamp(-headRoll, -0.5, 0.5)       // Roll (side tilt) - inverted for mirror
      },
      // Swap left/right joints for mirror mode
      // Abduction (z) should NOT be negated - it's always positive (arm going up)
      // The lateral direction is already handled by the swap
      leftShoulder: rightShoulderJoint,
      rightShoulder: leftShoulderJoint,
      leftElbow: rightElbowJoint,
      rightElbow: leftElbowJoint,
      leftHip: rightHipJoint,
      rightHip: leftHipJoint,
      leftKnee: rightKneeJoint,
      rightKnee: leftKneeJoint,
      leftWrist: { x: 0, y: 0, z: 0 },
      rightWrist: { x: 0, y: 0, z: 0 }
    };
  }

  // Normal mode (no mirroring)
  return {
    spine: {
      x: clamp(spineForward, -0.8, 0.8),      // Forward/backward lean
      y: 0,                                    // Axial rotation (limited from front view)
      z: clamp(spineLateral, -0.5, 0.5)       // Lateral flexion
    },
    neck: {
      x: clamp(headPitch, -0.6, 0.6),        // Pitch (nodding up/down)
      y: clamp(headYaw, -0.8, 0.8),          // Yaw (head rotation left/right)
      z: clamp(headRoll, -0.5, 0.5)          // Roll (head side tilt)
    },
    leftShoulder: leftShoulderJoint,
    rightShoulder: rightShoulderJoint,
    leftElbow: leftElbowJoint,
    rightElbow: rightElbowJoint,
    leftHip: leftHipJoint,
    rightHip: rightHipJoint,
    leftKnee: leftKneeJoint,
    rightKnee: rightKneeJoint,
    leftWrist: { x: 0, y: 0, z: 0 },
    rightWrist: { x: 0, y: 0, z: 0 }
  };
}

export type PartialSkeleton3DPose = {
  [K in keyof Skeleton3DPose]: Joint3DRotation | null;
};

export interface RegionLandmarkMap {
  regionId: string;
  requiredLandmarks: number[];
  jointMapping: Array<{
    joint: keyof Skeleton3DPose;
    landmarks: number[];
  }>;
}

const REGION_JOINT_REQUIREMENTS: Record<string, RegionLandmarkMap> = {
  right_ankle: {
    regionId: 'right_ankle',
    requiredLandmarks: [26, 28],
    jointMapping: [
      { joint: 'rightKnee', landmarks: [26, 28] },
    ]
  },
  left_ankle: {
    regionId: 'left_ankle',
    requiredLandmarks: [25, 27],
    jointMapping: [
      { joint: 'leftKnee', landmarks: [25, 27] },
    ]
  },
  right_knee: {
    regionId: 'right_knee',
    requiredLandmarks: [26, 28],
    jointMapping: [
      { joint: 'rightHip', landmarks: [24, 26] },
      { joint: 'rightKnee', landmarks: [24, 26, 28] },
    ]
  },
  left_knee: {
    regionId: 'left_knee',
    requiredLandmarks: [25, 27],
    jointMapping: [
      { joint: 'leftHip', landmarks: [23, 25] },
      { joint: 'leftKnee', landmarks: [23, 25, 27] },
    ]
  },
  right_hip: {
    regionId: 'right_hip',
    requiredLandmarks: [24, 26],
    jointMapping: [
      { joint: 'rightHip', landmarks: [24, 26] },
      { joint: 'rightKnee', landmarks: [24, 26, 28] },
    ]
  },
  left_hip: {
    regionId: 'left_hip',
    requiredLandmarks: [23, 25],
    jointMapping: [
      { joint: 'leftHip', landmarks: [23, 25] },
      { joint: 'leftKnee', landmarks: [23, 25, 27] },
    ]
  },
  right_shoulder: {
    regionId: 'right_shoulder',
    requiredLandmarks: [12, 14],
    jointMapping: [
      { joint: 'rightShoulder', landmarks: [12, 14] },
      { joint: 'rightElbow', landmarks: [12, 14, 16] },
    ]
  },
  left_shoulder: {
    regionId: 'left_shoulder',
    requiredLandmarks: [11, 13],
    jointMapping: [
      { joint: 'leftShoulder', landmarks: [11, 13] },
      { joint: 'leftElbow', landmarks: [11, 13, 15] },
    ]
  },
  right_elbow: {
    regionId: 'right_elbow',
    requiredLandmarks: [14, 16],
    jointMapping: [
      { joint: 'rightShoulder', landmarks: [12, 14] },
      { joint: 'rightElbow', landmarks: [12, 14, 16] },
    ]
  },
  left_elbow: {
    regionId: 'left_elbow',
    requiredLandmarks: [13, 15],
    jointMapping: [
      { joint: 'leftShoulder', landmarks: [11, 13] },
      { joint: 'leftElbow', landmarks: [11, 13, 15] },
    ]
  },
  cervical_spine: {
    regionId: 'cervical_spine',
    requiredLandmarks: [0],
    jointMapping: [
      { joint: 'neck', landmarks: [0, 7, 8] },
      { joint: 'spine', landmarks: [11, 12, 23, 24] },
    ]
  },
  lumbar_spine: {
    regionId: 'lumbar_spine',
    requiredLandmarks: [11, 12],
    jointMapping: [
      { joint: 'spine', landmarks: [11, 12, 23, 24] },
    ]
  },
  right_leg: {
    regionId: 'right_leg',
    requiredLandmarks: [26],
    jointMapping: [
      { joint: 'rightHip', landmarks: [24, 26] },
      { joint: 'rightKnee', landmarks: [24, 26, 28] },
    ]
  },
  left_leg: {
    regionId: 'left_leg',
    requiredLandmarks: [25],
    jointMapping: [
      { joint: 'leftHip', landmarks: [23, 25] },
      { joint: 'leftKnee', landmarks: [23, 25, 27] },
    ]
  },
};

function hasVisibleLandmarks(landmarks: NormalizedLandmark[], indices: number[], minVisibility: number = 0.3): boolean {
  return indices.every(i => {
    const lm = landmarks[i];
    return lm && (lm.visibility === undefined || lm.visibility >= minVisibility);
  });
}

function safeGet(landmarks: NormalizedLandmark[], index: number): NormalizedLandmark {
  const lm = landmarks[index];
  if (lm) return lm;
  return { x: 0.5, y: 0.5, z: 0, visibility: 0 };
}

function computeJointFromPartial(
  joint: keyof Skeleton3DPose,
  landmarks: NormalizedLandmark[],
  mirrorMode: boolean
): Joint3DRotation | null {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  switch (joint) {
    case 'rightShoulder': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW], 0.15)) return null;
      const rs = safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER);
      const re = safeGet(landmarks, LANDMARKS.RIGHT_ELBOW);
      const upperArm = normalize(createVector(rs, re));
      const flexion = Math.atan2(upperArm.z, Math.abs(upperArm.y));
      const abduction = Math.atan2(upperArm.x, -upperArm.y);
      return { x: clamp(flexion, -0.5, Math.PI), y: 0, z: clamp(abduction, -0.3, Math.PI) };
    }
    case 'leftShoulder': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW], 0.15)) return null;
      const ls = safeGet(landmarks, LANDMARKS.LEFT_SHOULDER);
      const le = safeGet(landmarks, LANDMARKS.LEFT_ELBOW);
      const upperArm = normalize(createVector(ls, le));
      const flexion = Math.atan2(upperArm.z, Math.abs(upperArm.y));
      const abduction = Math.atan2(-upperArm.x, -upperArm.y);
      return { x: clamp(flexion, -0.5, Math.PI), y: 0, z: clamp(abduction, -0.3, Math.PI) };
    }
    case 'rightElbow': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST], 0.15)) return null;
      const flexion = calculateJointFlexion(
        safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER),
        safeGet(landmarks, LANDMARKS.RIGHT_ELBOW),
        safeGet(landmarks, LANDMARKS.RIGHT_WRIST)
      );
      return { x: clamp(flexion, 0, 2.5), y: 0, z: 0 };
    }
    case 'leftElbow': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST], 0.15)) return null;
      const flexion = calculateJointFlexion(
        safeGet(landmarks, LANDMARKS.LEFT_SHOULDER),
        safeGet(landmarks, LANDMARKS.LEFT_ELBOW),
        safeGet(landmarks, LANDMARKS.LEFT_WRIST)
      );
      return { x: clamp(flexion, 0, 2.5), y: 0, z: 0 };
    }
    case 'rightHip': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE], 0.15)) return null;
      const rh = safeGet(landmarks, LANDMARKS.RIGHT_HIP);
      const rk = safeGet(landmarks, LANDMARKS.RIGHT_KNEE);
      const thigh = normalize(createVector(rh, rk));
      const flexion = Math.atan2(thigh.z, -thigh.y);
      const abduction = Math.atan2(thigh.x, -thigh.y);
      return { x: clamp(flexion, -0.5, 2.0), y: 0, z: clamp(abduction, -0.3, 0.8) };
    }
    case 'leftHip': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE], 0.15)) return null;
      const lh = safeGet(landmarks, LANDMARKS.LEFT_HIP);
      const lk = safeGet(landmarks, LANDMARKS.LEFT_KNEE);
      const thigh = normalize(createVector(lh, lk));
      const flexion = Math.atan2(thigh.z, -thigh.y);
      const abduction = Math.atan2(-thigh.x, -thigh.y);
      return { x: clamp(flexion, -0.5, 2.0), y: 0, z: clamp(abduction, -0.3, 0.8) };
    }
    case 'rightKnee': {
      if (hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE], 0.15)) {
        const flexion = calculateJointFlexion(
          safeGet(landmarks, LANDMARKS.RIGHT_HIP),
          safeGet(landmarks, LANDMARKS.RIGHT_KNEE),
          safeGet(landmarks, LANDMARKS.RIGHT_ANKLE)
        );
        return { x: clamp(flexion, 0, 2.5), y: 0, z: 0 };
      }
      if (hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE], 0.15)) {
        const shin = normalize(createVector(
          safeGet(landmarks, LANDMARKS.RIGHT_KNEE),
          safeGet(landmarks, LANDMARKS.RIGHT_ANKLE)
        ));
        const angleFromVertical = Math.acos(Math.max(-1, Math.min(1, -shin.y)));
        return { x: clamp(angleFromVertical, 0, 2.5), y: 0, z: 0 };
      }
      return null;
    }
    case 'leftKnee': {
      if (hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE], 0.15)) {
        const flexion = calculateJointFlexion(
          safeGet(landmarks, LANDMARKS.LEFT_HIP),
          safeGet(landmarks, LANDMARKS.LEFT_KNEE),
          safeGet(landmarks, LANDMARKS.LEFT_ANKLE)
        );
        return { x: clamp(flexion, 0, 2.5), y: 0, z: 0 };
      }
      if (hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE], 0.15)) {
        const shin = normalize(createVector(
          safeGet(landmarks, LANDMARKS.LEFT_KNEE),
          safeGet(landmarks, LANDMARKS.LEFT_ANKLE)
        ));
        const angleFromVertical = Math.acos(Math.max(-1, Math.min(1, -shin.y)));
        return { x: clamp(angleFromVertical, 0, 2.5), y: 0, z: 0 };
      }
      return null;
    }
    case 'spine': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP], 0.15)) {
        if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER], 0.15)) return null;
        const shoulderTilt = Math.atan2(
          -(safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER).y - safeGet(landmarks, LANDMARKS.LEFT_SHOULDER).y),
          safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER).x - safeGet(landmarks, LANDMARKS.LEFT_SHOULDER).x
        );
        return { x: 0, y: 0, z: clamp(shoulderTilt, -0.5, 0.5) };
      }
      const ls = safeGet(landmarks, LANDMARKS.LEFT_SHOULDER);
      const rs = safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER);
      const lh = safeGet(landmarks, LANDMARKS.LEFT_HIP);
      const rh = safeGet(landmarks, LANDMARKS.RIGHT_HIP);
      const shoulderMid: Vec3 = { x: (ls.x + rs.x) / 2, y: -((ls.y + rs.y) / 2), z: -((ls.z + rs.z) / 2) };
      const hipMid: Vec3 = { x: (lh.x + rh.x) / 2, y: -((lh.y + rh.y) / 2), z: -((lh.z + rh.z) / 2) };
      const shoulderTilt = Math.atan2(-(rs.y - ls.y), rs.x - ls.x);
      const hipTilt = Math.atan2(-(rh.y - lh.y), rh.x - lh.x);
      const lateral = shoulderTilt - hipTilt;
      const forward = Math.atan2(-(shoulderMid.z - hipMid.z), shoulderMid.y - hipMid.y);
      return { x: clamp(forward, -0.8, 0.8), y: 0, z: clamp(lateral, -0.5, 0.5) };
    }
    case 'neck': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.NOSE], 0.1)) return null;
      const nose = safeGet(landmarks, LANDMARKS.NOSE);
      const leftEar = safeGet(landmarks, LANDMARKS.LEFT_EAR);
      const rightEar = safeGet(landmarks, LANDMARKS.RIGHT_EAR);
      const leftEye = safeGet(landmarks, LANDMARKS.LEFT_EYE);
      const rightEye = safeGet(landmarks, LANDMARKS.RIGHT_EYE);
      const earVis = hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR], 0.05);
      const eyeVis = hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE], 0.05);
      if (!earVis && !eyeVis) return null;
      const earVector = earVis ? createVector(leftEar, rightEar) : createVector(leftEye, rightEye);
      const headYaw = Math.atan2(earVector.z, Math.abs(earVector.x) || 0.01) * 1.5;
      const headRoll = Math.atan2(earVector.y, Math.abs(earVector.x) || 0.01);
      const eyeMidY = -(leftEye.y + rightEye.y) / 2;
      const noseY = -nose.y;
      const eyeMidZ = -(leftEye.z + rightEye.z) / 2;
      const noseZ = -nose.z;
      const headPitch = Math.atan2(noseY - eyeMidY, Math.abs(noseZ - eyeMidZ) + 0.01) - 0.3;
      return { x: clamp(headPitch, -0.6, 0.6), y: clamp(headYaw, -0.8, 0.8), z: clamp(headRoll, -0.5, 0.5) };
    }
    case 'leftWrist':
    case 'rightWrist':
      return { x: 0, y: 0, z: 0 };
    default:
      return null;
  }
}

export function convertPartialMediaPipeTo3D(
  landmarks: NormalizedLandmark[],
  regionId: string,
  mirrorMode: boolean = false
): PartialSkeleton3DPose {
  const allJoints: (keyof Skeleton3DPose)[] = [
    'spine', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftWrist', 'rightWrist'
  ];

  const regionMap = REGION_JOINT_REQUIREMENTS[regionId];
  const relevantJoints = regionMap
    ? regionMap.jointMapping.map(m => m.joint)
    : allJoints;

  const result: PartialSkeleton3DPose = {
    spine: null, neck: null,
    leftShoulder: null, rightShoulder: null,
    leftElbow: null, rightElbow: null,
    leftHip: null, rightHip: null,
    leftKnee: null, rightKnee: null,
    leftWrist: null, rightWrist: null,
  };

  for (const joint of relevantJoints) {
    const computed = computeJointFromPartial(joint, landmarks, mirrorMode);
    if (computed) {
      result[joint] = computed;
    }
  }

  if (mirrorMode) {
    const swapped: PartialSkeleton3DPose = { ...result };
    swapped.leftShoulder = result.rightShoulder;
    swapped.rightShoulder = result.leftShoulder;
    swapped.leftElbow = result.rightElbow;
    swapped.rightElbow = result.leftElbow;
    swapped.leftHip = result.rightHip;
    swapped.rightHip = result.leftHip;
    swapped.leftKnee = result.rightKnee;
    swapped.rightKnee = result.leftKnee;
    swapped.leftWrist = result.rightWrist;
    swapped.rightWrist = result.leftWrist;
    if (swapped.spine) swapped.spine = { ...swapped.spine, z: -swapped.spine.z };
    if (swapped.neck) swapped.neck = { ...swapped.neck, y: -swapped.neck.y, z: -swapped.neck.z };
    return swapped;
  }

  return result;
}

export class PartialPoseSmoother {
  private previousPose: PartialSkeleton3DPose | null = null;
  private smoothingFactor: number;
  private noiseThreshold: number = 0.02;

  constructor(smoothingFactor: number = 0.4) {
    this.smoothingFactor = smoothingFactor;
  }

  smooth(newPose: PartialSkeleton3DPose): PartialSkeleton3DPose {
    if (!this.previousPose) {
      this.previousPose = { ...newPose };
      return newPose;
    }

    const smoothed: PartialSkeleton3DPose = {} as PartialSkeleton3DPose;
    const allJoints: (keyof Skeleton3DPose)[] = [
      'spine', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
      'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftWrist', 'rightWrist'
    ];

    for (const jointName of allJoints) {
      const newVal = newPose[jointName];
      const prevVal = this.previousPose[jointName];

      if (!newVal) {
        smoothed[jointName] = prevVal ? { ...prevVal } : null;
        continue;
      }
      if (!prevVal) {
        smoothed[jointName] = { ...newVal };
        continue;
      }

      const getScale = (delta: number) =>
        Math.abs(delta) < this.noiseThreshold ? 0.1 : this.smoothingFactor;

      const dx = newVal.x - prevVal.x;
      const dy = newVal.y - prevVal.y;
      const dz = newVal.z - prevVal.z;

      smoothed[jointName] = {
        x: prevVal.x + dx * getScale(dx),
        y: prevVal.y + dy * getScale(dy),
        z: prevVal.z + dz * getScale(dz),
      };
    }

    this.previousPose = smoothed;
    return smoothed;
  }

  reset() {
    this.previousPose = null;
  }
}

/**
 * Smooth pose transitions to prevent jittery movement
 */
export class Posesmoother {
  private previousPose: Skeleton3DPose | null = null;
  private smoothingFactor: number = 0.3; // Higher = faster response
  private noiseThreshold: number = 0.02; // Ignore tiny movements
  
  constructor(smoothingFactor: number = 0.3) {
    this.smoothingFactor = smoothingFactor;
  }
  
  smooth(newPose: Skeleton3DPose): Skeleton3DPose {
    if (!this.previousPose) {
      this.previousPose = { ...newPose };
      return newPose;
    }
    
    const smoothed: Skeleton3DPose = {} as Skeleton3DPose;
    
    for (const [jointName, rotation] of Object.entries(newPose)) {
      const prevRotation = this.previousPose[jointName as keyof Skeleton3DPose];
      if (!prevRotation) {
        (smoothed as any)[jointName] = rotation;
        continue;
      }
      
      // Calculate deltas
      const deltaX = rotation.x - prevRotation.x;
      const deltaY = rotation.y - prevRotation.y;
      const deltaZ = rotation.z - prevRotation.z;
      
      // Adaptive smoothing: small movements get more smoothing to reduce jitter
      const getScale = (delta: number) => 
        Math.abs(delta) < this.noiseThreshold ? 0.1 : this.smoothingFactor;
      
      smoothed[jointName as keyof Skeleton3DPose] = {
        x: prevRotation.x + deltaX * getScale(deltaX),
        y: prevRotation.y + deltaY * getScale(deltaY),
        z: prevRotation.z + deltaZ * getScale(deltaZ)
      };
    }
    
    this.previousPose = smoothed;
    return smoothed;
  }
  
  reset() {
    this.previousPose = null;
  }
}
