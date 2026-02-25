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
  leftAnkle: Joint3DRotation;
  rightAnkle: Joint3DRotation;
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
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
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

const MIN_VISIBILITY = 0.5;

function landmarksVisible(landmarks: NormalizedLandmark[], indices: number[]): boolean {
  return indices.every(i => {
    const lm = landmarks[i];
    return lm && (lm.visibility === undefined || lm.visibility >= MIN_VISIBILITY);
  });
}

/**
 * Convert MediaPipe landmarks to 3D skeleton pose
 * All rotations are in radians
 * Returns null for joints whose key landmarks have low visibility
 */
export function convertMediaPipeTo3D(landmarks: NormalizedLandmark[], mirrorMode: boolean = false): PartialSkeleton3DPose {
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
  const leftHeel = landmarks[LANDMARKS.LEFT_HEEL] || leftAnkle;
  const rightHeel = landmarks[LANDMARKS.RIGHT_HEEL] || rightAnkle;
  const leftFootIndex = landmarks[LANDMARKS.LEFT_FOOT_INDEX] || leftAnkle;
  const rightFootIndex = landmarks[LANDMARKS.RIGHT_FOOT_INDEX] || rightAnkle;
  const leftIndex = landmarks[LANDMARKS.LEFT_INDEX];
  const rightIndex = landmarks[LANDMARKS.RIGHT_INDEX];

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

  // ELEVATION-AZIMUTH DECOMPOSITION for shoulder angles
  //
  // Instead of independent atan2 projections (which become unstable when y→0),
  // we compute a single elevation angle from vertical, then decompose it into
  // flexion and abduction based on the direction the arm points in the horizontal plane.
  //
  // elevation = atan2(sqrt(x²+z²), -y)  — total angle from vertical down (0=down, π/2=horizontal, π=up)
  // azimuth = atan2(z, -x) [left] or atan2(z, x) [right] — direction in horizontal plane (0=lateral, π/2=forward)
  // flexion = elevation * sin(azimuth)   — forward component
  // abduction = elevation * cos(azimuth) — lateral component
  //
  // This avoids singularities because elevation uses magnitude (always ≥0) and azimuth
  // is only used as a weighting factor, not as a standalone angle.

  const computeShoulderAngles = (armDir: Vec3, isLeft: boolean): { flexion: number; abduction: number } => {
    const horizMag = Math.sqrt(armDir.x * armDir.x + armDir.z * armDir.z);
    const elevation = Math.atan2(horizMag, -armDir.y);
    const lateralX = isLeft ? -armDir.x : armDir.x;
    const azimuth = Math.atan2(armDir.z, lateralX);
    return {
      flexion: elevation * Math.sin(azimuth),
      abduction: elevation * Math.cos(azimuth)
    };
  };

  const leftShoulderAngles = computeShoulderAngles(leftUpperArm, true);
  const leftShoulderFlexion = leftShoulderAngles.flexion;
  const leftShoulderAbduction = leftShoulderAngles.abduction;

  const rightShoulderAngles = computeShoulderAngles(rightUpperArm, false);
  const rightShoulderFlexion = rightShoulderAngles.flexion;
  const rightShoulderAbduction = rightShoulderAngles.abduction;

  // SHOULDER INTERNAL/EXTERNAL ROTATION
  // Computed from the relationship between upper arm and forearm directions
  // Project forearm onto the plane perpendicular to the upper arm (transverse plane of the humerus)
  // Cross product of upper arm and forearm gives rotation axis; dot with reference gives rotation angle
  const computeShoulderRotation = (upperArm: Vec3, forearm: Vec3, isLeft: boolean): number => {
    // Reference "no rotation" direction: when forearm hangs straight down relative to upper arm
    // Use the body's forward direction (Z) and lateral direction (X) to define the reference plane
    // Cross product: upperArm × forearm
    const cross = {
      x: upperArm.y * forearm.z - upperArm.z * forearm.y,
      y: upperArm.z * forearm.x - upperArm.x * forearm.z,
      z: upperArm.x * forearm.y - upperArm.y * forearm.x
    };
    // Project cross product onto the upper arm axis to get rotation component
    const dot = cross.x * upperArm.x + cross.y * upperArm.y + cross.z * upperArm.z;
    // The magnitude indicates rotation amount; sign indicates internal vs external
    // For left arm: positive dot = internal rotation; for right arm: negative dot = internal rotation
    const rotation = Math.atan2(dot, 
      forearm.x * upperArm.x + forearm.y * upperArm.y + forearm.z * upperArm.z + 0.001);
    return isLeft ? rotation : -rotation;
  };

  const leftShoulderRotation = computeShoulderRotation(leftUpperArm, leftForearm, true);
  const rightShoulderRotation = computeShoulderRotation(rightUpperArm, rightForearm, false);

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
  // Z-depth dampening (0.3x) reduces noise from MediaPipe's unreliable monocular Z estimation
  const leftHipFlexion = Math.atan2(leftThigh.z * 0.3, -leftThigh.y);
  const rightHipFlexion = Math.atan2(rightThigh.z * 0.3, -rightThigh.y);
  
  // Hip abduction (leg moved outward) - stored in .z
  // Left leg: negative X = abducted (moved left), positive X = adducted (moved right/medial)
  // Right leg: positive X = abducted (moved right), negative X = adducted (moved left/medial)
  // Keep signed values to distinguish abduction vs adduction
  const leftHipAbduction = Math.atan2(leftThigh.x, -leftThigh.y);
  const rightHipAbduction = Math.atan2(-rightThigh.x, -rightThigh.y);

  // Knee flexion
  const leftKneeFlexion = calculateJointFlexion(leftHip, leftKnee, leftAnkle);
  const rightKneeFlexion = calculateJointFlexion(rightHip, rightKnee, rightAnkle);

  // === ANKLE CALCULATIONS ===
  // Dorsiflexion/plantarflexion: angle between shin direction and foot direction
  // Shin direction: knee → ankle; Foot direction: ankle → foot_index (or heel → foot_index)
  // When foot is flat (90° to shin), dorsiflexion ≈ 0
  // Positive = dorsiflexion (toes up), Negative = plantarflexion (toes down)
  const leftShinDir = normalize(createVector(leftKnee, leftAnkle));
  const leftFootDir = normalize(createVector(leftHeel, leftFootIndex));
  const leftAnkleBendAngle = angleBetweenVectors(
    { x: -leftShinDir.x, y: -leftShinDir.y, z: -leftShinDir.z },
    leftFootDir
  );
  const leftAnkleDorsiflexion = (Math.PI / 2) - leftAnkleBendAngle;

  const rightShinDir = normalize(createVector(rightKnee, rightAnkle));
  const rightFootDir = normalize(createVector(rightHeel, rightFootIndex));
  const rightAnkleBendAngle = angleBetweenVectors(
    { x: -rightShinDir.x, y: -rightShinDir.y, z: -rightShinDir.z },
    rightFootDir
  );
  const rightAnkleDorsiflexion = (Math.PI / 2) - rightAnkleBendAngle;

  // === WRIST CALCULATIONS ===
  // Wrist flexion/extension: angle between forearm and hand direction
  // Forearm: elbow → wrist; Hand: wrist → index finger base (landmark 19/20)
  // Positive = flexion (palm toward forearm), Negative = extension (back of hand toward forearm)
  const leftHandDir = normalize(createVector(leftWrist, leftIndex));
  const leftWristBendAngle = angleBetweenVectors(leftForearm, leftHandDir);
  const leftWristFlexion = Math.PI - leftWristBendAngle;

  const rightHandDir = normalize(createVector(rightWrist, rightIndex));
  const rightWristBendAngle = angleBetweenVectors(rightForearm, rightHandDir);
  const rightWristFlexion = Math.PI - rightWristBendAngle;

  // Clamp helper
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Build the base pose, returning null for joints with low-confidence landmarks
  const leftShoulderJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW]) ? {
    x: clamp(leftShoulderFlexion, -0.5, Math.PI),
    y: clamp(leftShoulderRotation, -1.2, 1.2),
    z: clamp(leftShoulderAbduction, -0.3, Math.PI)
  } : null;
  const rightShoulderJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW]) ? {
    x: clamp(rightShoulderFlexion, -0.5, Math.PI),
    y: clamp(rightShoulderRotation, -1.2, 1.2),
    z: clamp(rightShoulderAbduction, -0.3, Math.PI)
  } : null;
  const leftElbowJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST]) ? {
    x: clamp(leftElbowFlexion, 0, 2.5),
    y: 0,
    z: 0
  } : null;
  const rightElbowJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST]) ? {
    x: clamp(rightElbowFlexion, 0, 2.5),
    y: 0,
    z: 0
  } : null;
  const leftHipJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE]) ? {
    x: clamp(leftHipFlexion, -0.5, 2.0),
    y: 0,
    z: clamp(leftHipAbduction, -0.3, 0.8)
  } : null;
  const rightHipJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE]) ? {
    x: clamp(rightHipFlexion, -0.5, 2.0),
    y: 0,
    z: clamp(rightHipAbduction, -0.3, 0.8)
  } : null;
  const leftKneeJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE]) ? {
    x: clamp(leftKneeFlexion, 0, 2.5),
    y: 0,
    z: 0
  } : null;
  const rightKneeJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE]) ? {
    x: clamp(rightKneeFlexion, 0, 2.5),
    y: 0,
    z: 0
  } : null;
  const leftAnkleJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL]) ? {
    x: clamp(leftAnkleDorsiflexion, -0.87, 0.35),
    y: 0,
    z: 0
  } : null;
  const rightAnkleJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL]) ? {
    x: clamp(rightAnkleDorsiflexion, -0.87, 0.35),
    y: 0,
    z: 0
  } : null;

  const spineVisible = landmarksVisible(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP]);
  const neckVisible = landmarksVisible(landmarks, [LANDMARKS.NOSE, LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR])
    || landmarksVisible(landmarks, [LANDMARKS.NOSE, LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE]);
  const leftWristVisible = landmarksVisible(landmarks, [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST, LANDMARKS.LEFT_INDEX]);
  const rightWristVisible = landmarksVisible(landmarks, [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST, LANDMARKS.RIGHT_INDEX]);

  // When mirror mode is ON, swap left/right joints AND invert lateral (z) components
  // The webcam shows a mirror image, so:
  // 1. User's left arm appears on right side of screen → we detect it as rightShoulder landmarks
  // 2. Lateral movements (X-axis) are reversed in the mirrored view
  // 3. We swap joints AND negate z (abduction) to correct both issues
  if (mirrorMode) {
    return {
      spine: spineVisible ? {
        x: clamp(spineForward, -0.8, 0.8),
        y: 0,
        z: clamp(-spineLateral, -0.5, 0.5)
      } : null,
      neck: neckVisible ? {
        x: clamp(headPitch, -0.6, 0.6),
        y: clamp(-headYaw, -0.8, 0.8),
        z: clamp(-headRoll, -0.5, 0.5)
      } : null,
      leftShoulder: rightShoulderJoint,
      rightShoulder: leftShoulderJoint,
      leftElbow: rightElbowJoint,
      rightElbow: leftElbowJoint,
      leftHip: rightHipJoint,
      rightHip: leftHipJoint,
      leftKnee: rightKneeJoint,
      rightKnee: leftKneeJoint,
      leftWrist: rightWristVisible ? { x: clamp(rightWristFlexion, -1.2, 1.2), y: 0, z: 0 } : null,
      rightWrist: leftWristVisible ? { x: clamp(leftWristFlexion, -1.2, 1.2), y: 0, z: 0 } : null,
      leftAnkle: rightAnkleJoint,
      rightAnkle: leftAnkleJoint
    };
  }

  return {
    spine: spineVisible ? {
      x: clamp(spineForward, -0.8, 0.8),
      y: 0,
      z: clamp(spineLateral, -0.5, 0.5)
    } : null,
    neck: neckVisible ? {
      x: clamp(headPitch, -0.6, 0.6),
      y: clamp(headYaw, -0.8, 0.8),
      z: clamp(headRoll, -0.5, 0.5)
    } : null,
    leftShoulder: leftShoulderJoint,
    rightShoulder: rightShoulderJoint,
    leftElbow: leftElbowJoint,
    rightElbow: rightElbowJoint,
    leftHip: leftHipJoint,
    rightHip: rightHipJoint,
    leftKnee: leftKneeJoint,
    rightKnee: rightKneeJoint,
    leftWrist: leftWristVisible ? { x: clamp(leftWristFlexion, -1.2, 1.2), y: 0, z: 0 } : null,
    rightWrist: rightWristVisible ? { x: clamp(rightWristFlexion, -1.2, 1.2), y: 0, z: 0 } : null,
    leftAnkle: leftAnkleJoint,
    rightAnkle: rightAnkleJoint
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
      const rw = safeGet(landmarks, LANDMARKS.RIGHT_WRIST);
      const upperArm = normalize(createVector(rs, re));
      const forearm = normalize(createVector(re, rw));
      const horizMag = Math.sqrt(upperArm.x * upperArm.x + upperArm.z * upperArm.z);
      const elevation = Math.atan2(horizMag, -upperArm.y);
      const azimuth = Math.atan2(upperArm.z, upperArm.x);
      const flexion = elevation * Math.sin(azimuth);
      const abduction = elevation * Math.cos(azimuth);
      const cross = {
        x: upperArm.y * forearm.z - upperArm.z * forearm.y,
        y: upperArm.z * forearm.x - upperArm.x * forearm.z,
        z: upperArm.x * forearm.y - upperArm.y * forearm.x
      };
      const dotCross = cross.x * upperArm.x + cross.y * upperArm.y + cross.z * upperArm.z;
      const dotFore = forearm.x * upperArm.x + forearm.y * upperArm.y + forearm.z * upperArm.z + 0.001;
      const rotation = -Math.atan2(dotCross, dotFore);
      return { x: clamp(flexion, -0.5, Math.PI), y: clamp(rotation, -1.2, 1.2), z: clamp(abduction, -0.3, Math.PI) };
    }
    case 'leftShoulder': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW], 0.15)) return null;
      const ls = safeGet(landmarks, LANDMARKS.LEFT_SHOULDER);
      const le = safeGet(landmarks, LANDMARKS.LEFT_ELBOW);
      const lw = safeGet(landmarks, LANDMARKS.LEFT_WRIST);
      const upperArm = normalize(createVector(ls, le));
      const forearm = normalize(createVector(le, lw));
      const horizMag = Math.sqrt(upperArm.x * upperArm.x + upperArm.z * upperArm.z);
      const elevation = Math.atan2(horizMag, -upperArm.y);
      const azimuth = Math.atan2(upperArm.z, -upperArm.x);
      const flexion = elevation * Math.sin(azimuth);
      const abduction = elevation * Math.cos(azimuth);
      const cross = {
        x: upperArm.y * forearm.z - upperArm.z * forearm.y,
        y: upperArm.z * forearm.x - upperArm.x * forearm.z,
        z: upperArm.x * forearm.y - upperArm.y * forearm.x
      };
      const dotCross = cross.x * upperArm.x + cross.y * upperArm.y + cross.z * upperArm.z;
      const dotFore = forearm.x * upperArm.x + forearm.y * upperArm.y + forearm.z * upperArm.z + 0.001;
      const rotation = Math.atan2(dotCross, dotFore);
      return { x: clamp(flexion, -0.5, Math.PI), y: clamp(rotation, -1.2, 1.2), z: clamp(abduction, -0.3, Math.PI) };
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
      const flexion = Math.atan2(thigh.z * 0.3, -thigh.y);
      const abduction = Math.atan2(-thigh.x, -thigh.y);
      return { x: clamp(flexion, -0.5, 2.0), y: 0, z: clamp(abduction, -0.3, 0.8) };
    }
    case 'leftHip': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE], 0.15)) return null;
      const lh = safeGet(landmarks, LANDMARKS.LEFT_HIP);
      const lk = safeGet(landmarks, LANDMARKS.LEFT_KNEE);
      const thigh = normalize(createVector(lh, lk));
      const flexion = Math.atan2(thigh.z * 0.3, -thigh.y);
      const abduction = Math.atan2(thigh.x, -thigh.y);
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
    case 'leftWrist': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST, LANDMARKS.LEFT_INDEX], 0.15)) return null;
      const leForearm = normalize(createVector(safeGet(landmarks, LANDMARKS.LEFT_ELBOW), safeGet(landmarks, LANDMARKS.LEFT_WRIST)));
      const leHand = normalize(createVector(safeGet(landmarks, LANDMARKS.LEFT_WRIST), safeGet(landmarks, LANDMARKS.LEFT_INDEX)));
      const lwAngle = angleBetweenVectors(leForearm, leHand);
      return { x: clamp(Math.PI - lwAngle, -1.2, 1.2), y: 0, z: 0 };
    }
    case 'rightWrist': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST, LANDMARKS.RIGHT_INDEX], 0.15)) return null;
      const reForearm = normalize(createVector(safeGet(landmarks, LANDMARKS.RIGHT_ELBOW), safeGet(landmarks, LANDMARKS.RIGHT_WRIST)));
      const reHand = normalize(createVector(safeGet(landmarks, LANDMARKS.RIGHT_WRIST), safeGet(landmarks, LANDMARKS.RIGHT_INDEX)));
      const rwAngle = angleBetweenVectors(reForearm, reHand);
      return { x: clamp(Math.PI - rwAngle, -1.2, 1.2), y: 0, z: 0 };
    }
    case 'leftAnkle': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE], 0.15)) return null;
      const laShin = normalize(createVector(safeGet(landmarks, LANDMARKS.LEFT_KNEE), safeGet(landmarks, LANDMARKS.LEFT_ANKLE)));
      const laHeel = landmarks[LANDMARKS.LEFT_HEEL] || safeGet(landmarks, LANDMARKS.LEFT_ANKLE);
      const laFootIdx = landmarks[LANDMARKS.LEFT_FOOT_INDEX] || safeGet(landmarks, LANDMARKS.LEFT_ANKLE);
      const laFoot = normalize(createVector(laHeel, laFootIdx));
      const laAngle = angleBetweenVectors({ x: -laShin.x, y: -laShin.y, z: -laShin.z }, laFoot);
      return { x: clamp((Math.PI / 2) - laAngle, -0.87, 0.35), y: 0, z: 0 };
    }
    case 'rightAnkle': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE], 0.15)) return null;
      const raShin = normalize(createVector(safeGet(landmarks, LANDMARKS.RIGHT_KNEE), safeGet(landmarks, LANDMARKS.RIGHT_ANKLE)));
      const raHeel = landmarks[LANDMARKS.RIGHT_HEEL] || safeGet(landmarks, LANDMARKS.RIGHT_ANKLE);
      const raFootIdx = landmarks[LANDMARKS.RIGHT_FOOT_INDEX] || safeGet(landmarks, LANDMARKS.RIGHT_ANKLE);
      const raFoot = normalize(createVector(raHeel, raFootIdx));
      const raAngle = angleBetweenVectors({ x: -raShin.x, y: -raShin.y, z: -raShin.z }, raFoot);
      return { x: clamp((Math.PI / 2) - raAngle, -0.87, 0.35), y: 0, z: 0 };
    }
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
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftWrist', 'rightWrist',
    'leftAnkle', 'rightAnkle'
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
    leftAnkle: null, rightAnkle: null,
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
    swapped.leftAnkle = result.rightAnkle;
    swapped.rightAnkle = result.leftAnkle;
    if (swapped.spine) swapped.spine = { ...swapped.spine, z: -swapped.spine.z };
    if (swapped.neck) swapped.neck = { ...swapped.neck, y: -swapped.neck.y, z: -swapped.neck.z };
    return swapped;
  }

  return result;
}

export class PartialPoseSmoother {
  private previousPose: PartialSkeleton3DPose | null = null;
  private velocityHistory: Map<string, number[]> = new Map();

  private static readonly VELOCITY_HISTORY_SIZE = 3;
  private static readonly FAST_THRESHOLD = 0.15;
  private static readonly SLOW_THRESHOLD = 0.01;
  private static readonly FAST_FACTOR = 0.8;
  private static readonly SLOW_FACTOR = 0.15;

  private static readonly ALL_JOINTS: (keyof Skeleton3DPose)[] = [
    'spine', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftWrist', 'rightWrist',
    'leftAnkle', 'rightAnkle'
  ];

  private getAdaptiveFactor(jointKey: string, deltaMag: number): number {
    const history = this.velocityHistory.get(jointKey) || [];
    history.push(deltaMag);
    if (history.length > PartialPoseSmoother.VELOCITY_HISTORY_SIZE) {
      history.shift();
    }
    this.velocityHistory.set(jointKey, history);

    const avgVelocity = history.reduce((s, v) => s + v, 0) / history.length;

    if (avgVelocity >= PartialPoseSmoother.FAST_THRESHOLD) {
      return PartialPoseSmoother.FAST_FACTOR;
    }
    if (avgVelocity <= PartialPoseSmoother.SLOW_THRESHOLD) {
      return PartialPoseSmoother.SLOW_FACTOR;
    }
    const t = (avgVelocity - PartialPoseSmoother.SLOW_THRESHOLD) / (PartialPoseSmoother.FAST_THRESHOLD - PartialPoseSmoother.SLOW_THRESHOLD);
    return PartialPoseSmoother.SLOW_FACTOR + t * (PartialPoseSmoother.FAST_FACTOR - PartialPoseSmoother.SLOW_FACTOR);
  }

  smooth(newPose: PartialSkeleton3DPose): PartialSkeleton3DPose {
    if (!this.previousPose) {
      this.previousPose = { ...newPose };
      return newPose;
    }

    const smoothed: PartialSkeleton3DPose = {} as PartialSkeleton3DPose;

    for (const jointName of PartialPoseSmoother.ALL_JOINTS) {
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

      const dx = newVal.x - prevVal.x;
      const dy = newVal.y - prevVal.y;
      const dz = newVal.z - prevVal.z;
      const deltaMag = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const factor = this.getAdaptiveFactor(jointName, deltaMag);

      smoothed[jointName] = {
        x: prevVal.x + dx * factor,
        y: prevVal.y + dy * factor,
        z: prevVal.z + dz * factor,
      };
    }

    this.previousPose = smoothed;
    return smoothed;
  }

  reset() {
    this.previousPose = null;
    this.velocityHistory.clear();
  }
}

/**
 * Smooth pose transitions to prevent jittery movement
 */
export class Posesmoother {
  private previousPose: Skeleton3DPose | null = null;
  private velocityHistory: Map<string, number[]> = new Map();

  constructor(_smoothingFactor?: number) {}
  
  private static readonly VELOCITY_HISTORY_SIZE = 3;
  private static readonly FAST_THRESHOLD = 0.15;
  private static readonly SLOW_THRESHOLD = 0.01;
  private static readonly FAST_FACTOR = 0.8;
  private static readonly SLOW_FACTOR = 0.15;

  private static readonly DEFAULT_JOINT: Joint3DRotation = { x: 0, y: 0, z: 0 };

  private static readonly ALL_JOINTS: (keyof Skeleton3DPose)[] = [
    'spine', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftWrist', 'rightWrist',
    'leftAnkle', 'rightAnkle'
  ];

  private getAdaptiveFactor(jointKey: string, deltaMag: number): number {
    const history = this.velocityHistory.get(jointKey) || [];
    history.push(deltaMag);
    if (history.length > Posesmoother.VELOCITY_HISTORY_SIZE) {
      history.shift();
    }
    this.velocityHistory.set(jointKey, history);

    const avgVelocity = history.reduce((s, v) => s + v, 0) / history.length;

    if (avgVelocity >= Posesmoother.FAST_THRESHOLD) {
      return Posesmoother.FAST_FACTOR;
    }
    if (avgVelocity <= Posesmoother.SLOW_THRESHOLD) {
      return Posesmoother.SLOW_FACTOR;
    }
    const t = (avgVelocity - Posesmoother.SLOW_THRESHOLD) / (Posesmoother.FAST_THRESHOLD - Posesmoother.SLOW_THRESHOLD);
    return Posesmoother.SLOW_FACTOR + t * (Posesmoother.FAST_FACTOR - Posesmoother.SLOW_FACTOR);
  }

  smooth(newPose: PartialSkeleton3DPose): Skeleton3DPose {
    if (!this.previousPose) {
      const initial: Skeleton3DPose = {} as Skeleton3DPose;
      for (const joint of Posesmoother.ALL_JOINTS) {
        initial[joint] = newPose[joint] ?? { ...Posesmoother.DEFAULT_JOINT };
      }
      this.previousPose = initial;
      return initial;
    }
    
    const smoothed: Skeleton3DPose = {} as Skeleton3DPose;
    
    for (const jointName of Posesmoother.ALL_JOINTS) {
      const rotation = newPose[jointName];
      const prevRotation = this.previousPose[jointName];
      
      if (!rotation) {
        smoothed[jointName] = prevRotation ? { ...prevRotation } : { ...Posesmoother.DEFAULT_JOINT };
        continue;
      }

      if (!prevRotation) {
        smoothed[jointName] = { ...rotation };
        continue;
      }
      
      const deltaX = rotation.x - prevRotation.x;
      const deltaY = rotation.y - prevRotation.y;
      const deltaZ = rotation.z - prevRotation.z;
      const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
      
      const factor = this.getAdaptiveFactor(jointName, deltaMag);
      
      smoothed[jointName] = {
        x: prevRotation.x + deltaX * factor,
        y: prevRotation.y + deltaY * factor,
        z: prevRotation.z + deltaZ * factor
      };
    }
    
    this.previousPose = smoothed;
    return smoothed;
  }
  
  reset() {
    this.previousPose = null;
    this.velocityHistory.clear();
  }
}
