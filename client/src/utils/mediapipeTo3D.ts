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

export type CameraViewType = 'frontal' | 'lateral_left' | 'lateral_right' | 'posterior' | 'oblique';

export interface PosturalMetrics {
  viewType: CameraViewType;
  viewConfidence: number;
  kyphosisAngle: number;
  lordosisAngle: number;
  scoliosisAngle: number;
  scoliosisDirection: 'left' | 'right' | 'none';
  forwardHeadAngle: number;
  anteriorPelvicTilt: number;
  pelvicObliquity: number;
  pelvicRotation: number;
  leftScapulaElevation: number;
  rightScapulaElevation: number;
  leftScapulaProtraction: number;
  rightScapulaProtraction: number;
  leftScapuloHumeralRatio: number;
  rightScapuloHumeralRatio: number;
  leftShoulderElevation: number;
  rightShoulderElevation: number;
  shoulderLevelDifference: number;
  trunkLateralShift: number;
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

function getLandmarkConfidence(landmarks: NormalizedLandmark[], indices: number[]): number {
  let totalVis = 0;
  let count = 0;
  for (const i of indices) {
    const lm = landmarks[i];
    if (lm) {
      totalVis += lm.visibility ?? 0.5;
      count++;
    }
  }
  return count > 0 ? totalVis / count : 0;
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
  const shoulderTilt = Math.atan2(
    -(rightShoulder.y - leftShoulder.y),
    rightShoulder.x - leftShoulder.x
  );
  const hipTilt = Math.atan2(
    -(rightHip.y - leftHip.y),
    rightHip.x - leftHip.x
  );
  const spineLateral = shoulderTilt - hipTilt;
  
  const spineForward = Math.atan2(
    -(shoulderMid.z - hipMid.z),
    shoulderMid.y - hipMid.y
  );

  // === HEAD/NECK CALCULATIONS (Enhanced) ===
  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  const leftEye = landmarks[LANDMARKS.LEFT_EYE];
  const rightEye = landmarks[LANDMARKS.RIGHT_EYE];

  const earConfidence = getLandmarkConfidence(landmarks, [LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR]);
  const eyeConfidence = getLandmarkConfidence(landmarks, [LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE]);
  const noseConfidence = getLandmarkConfidence(landmarks, [LANDMARKS.NOSE]);

  const earVector = createVector(leftEar, rightEar);
  const eyeVector = createVector(leftEye, rightEye);

  // YAW (head rotation left/right): Use shoulder-to-ear vectors for stability
  // Primary: ear Z-depth difference (most direct yaw indicator)
  // Secondary: nose-to-shoulder-midpoint lateral offset for cross-validation
  const shoulderMidRaw: Vec3 = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  const earYaw = Math.atan2(earVector.z, Math.abs(earVector.x) || 0.01) * 1.5;
  const leftShoulderToEar = createVector(leftShoulder, leftEar);
  const rightShoulderToEar = createVector(rightShoulder, rightEar);
  const shoulderEarYaw = Math.atan2(
    rightShoulderToEar.z - leftShoulderToEar.z,
    (Math.abs(leftShoulderToEar.x) + Math.abs(rightShoulderToEar.x)) || 0.01
  ) * 1.2;
  const earWeight = Math.min(earConfidence / 0.7, 1.0);
  const headYaw = earWeight * earYaw + (1 - earWeight) * shoulderEarYaw;

  // ROLL (head tilt sideways): ear height difference, cross-validated with eye tilt
  const earRoll = Math.atan2(earVector.y, Math.abs(earVector.x) || 0.01);
  const eyeRoll = Math.atan2(eyeVector.y, Math.abs(eyeVector.x) || 0.01);
  const headRoll = earConfidence > 0.5
    ? earRoll * 0.7 + eyeRoll * 0.3
    : eyeRoll;

  // PITCH (nodding): nose-to-shoulder-midpoint vector angle relative to torso
  // More stable than nose-to-eye because shoulder midpoint is a better torso reference
  const nosePt: Vec3 = { x: nose.x, y: -nose.y, z: -nose.z };
  const shoulderMidPt: Vec3 = {
    x: shoulderMidRaw.x,
    y: -shoulderMidRaw.y,
    z: -shoulderMidRaw.z
  };
  const noseToShoulderVec: Vec3 = {
    x: nosePt.x - shoulderMidPt.x,
    y: nosePt.y - shoulderMidPt.y,
    z: nosePt.z - shoulderMidPt.z
  };
  const noseShoulderPitch = Math.atan2(noseToShoulderVec.z, noseToShoulderVec.y);

  const eyeMidY = -(leftEye.y + rightEye.y) / 2;
  const noseY = -nose.y;
  const eyeMidZ = -(leftEye.z + rightEye.z) / 2;
  const noseZ = -nose.z;
  const noseEyePitch = Math.atan2(noseY - eyeMidY, Math.abs(noseZ - eyeMidZ) + 0.01) - 0.3;

  const headPitch = noseConfidence > 0.6
    ? noseShoulderPitch * 0.4 + noseEyePitch * 0.6
    : noseEyePitch;

  // === TORSO COORDINATE FRAME ===
  const torsoUp = normalize({
    x: shoulderMid.x - hipMid.x,
    y: shoulderMid.y - hipMid.y,
    z: shoulderMid.z - hipMid.z
  });
  const shoulderVec: Vec3 = {
    x: (rightShoulder.x - leftShoulder.x),
    y: -(rightShoulder.y - leftShoulder.y),
    z: -(rightShoulder.z - leftShoulder.z)
  };
  const torsoRight = normalize(shoulderVec);
  const torsoForward = normalize({
    x: torsoUp.y * torsoRight.z - torsoUp.z * torsoRight.y,
    y: torsoUp.z * torsoRight.x - torsoUp.x * torsoRight.z,
    z: torsoUp.x * torsoRight.y - torsoUp.y * torsoRight.x
  });

  // === ARM CALCULATIONS ===
  const leftUpperArm = normalize(createVector(leftShoulder, leftElbow));
  const leftForearm = normalize(createVector(leftElbow, leftWrist));
  const rightUpperArm = normalize(createVector(rightShoulder, rightElbow));
  const rightForearm = normalize(createVector(rightElbow, rightWrist));

  const computeShoulderAngles = (armDir: Vec3, isLeft: boolean): { flexion: number; abduction: number } => {
    const dotUp = armDir.x * torsoUp.x + armDir.y * torsoUp.y + armDir.z * torsoUp.z;
    const dotFwd = armDir.x * torsoForward.x + armDir.y * torsoForward.y + armDir.z * torsoForward.z;
    const dotRight = armDir.x * torsoRight.x + armDir.y * torsoRight.y + armDir.z * torsoRight.z;

    const lateral = isLeft ? -dotRight : dotRight;

    const elevation = Math.acos(Math.max(-1, Math.min(1, -dotUp)));

    if (elevation < 0.04) {
      return { flexion: 0, abduction: 0 };
    }

    const clampedFwd = Math.max(-0.999, Math.min(0.999, dotFwd));
    const flexion = Math.asin(clampedFwd);
    const cosFlex = Math.cos(flexion);

    let abduction: number;
    if (cosFlex > 0.15) {
      const by = Math.atan2(-dotUp, lateral);
      abduction = Math.PI / 2 - by;
    } else {
      const blendT = Math.max(0, (cosFlex - 0.05) / 0.10);
      const byFallback = Math.atan2(-dotUp, lateral);
      const abdEuler = Math.PI / 2 - byFallback;
      abduction = abdEuler * blendT;
    }

    return { flexion, abduction };
  };

  const leftShoulderAngles = computeShoulderAngles(leftUpperArm, true);
  const leftShoulderFlexion = leftShoulderAngles.flexion;
  const leftShoulderAbduction = leftShoulderAngles.abduction;

  const rightShoulderAngles = computeShoulderAngles(rightUpperArm, false);
  const rightShoulderFlexion = rightShoulderAngles.flexion;
  const rightShoulderAbduction = rightShoulderAngles.abduction;

  const computeShoulderRotation = (upperArm: Vec3, forearm: Vec3, isLeft: boolean): number => {
    const armLen = Math.sqrt(upperArm.x * upperArm.x + upperArm.y * upperArm.y + upperArm.z * upperArm.z);
    if (armLen < 0.001) return 0;

    const elbowAngle = angleBetweenVectors(upperArm, forearm);
    if (elbowAngle < 0.15 || elbowAngle > Math.PI - 0.15) return 0;

    const armAxis = normalize(upperArm);
    const foreProj = {
      x: forearm.x - (forearm.x * armAxis.x + forearm.y * armAxis.y + forearm.z * armAxis.z) * armAxis.x,
      y: forearm.y - (forearm.x * armAxis.x + forearm.y * armAxis.y + forearm.z * armAxis.z) * armAxis.y,
      z: forearm.z - (forearm.x * armAxis.x + forearm.y * armAxis.y + forearm.z * armAxis.z) * armAxis.z,
    };
    const foreProjNorm = normalize(foreProj);

    const refVec = normalize({
      x: torsoForward.x - (torsoForward.x * armAxis.x + torsoForward.y * armAxis.y + torsoForward.z * armAxis.z) * armAxis.x,
      y: torsoForward.y - (torsoForward.x * armAxis.x + torsoForward.y * armAxis.y + torsoForward.z * armAxis.z) * armAxis.y,
      z: torsoForward.z - (torsoForward.x * armAxis.x + torsoForward.y * armAxis.y + torsoForward.z * armAxis.z) * armAxis.z,
    });

    const dotCos = foreProjNorm.x * refVec.x + foreProjNorm.y * refVec.y + foreProjNorm.z * refVec.z;
    const crossForRef = {
      x: refVec.y * foreProjNorm.z - refVec.z * foreProjNorm.y,
      y: refVec.z * foreProjNorm.x - refVec.x * foreProjNorm.z,
      z: refVec.x * foreProjNorm.y - refVec.y * foreProjNorm.x,
    };
    const dotSin = crossForRef.x * armAxis.x + crossForRef.y * armAxis.y + crossForRef.z * armAxis.z;

    const rotation = Math.atan2(dotSin, dotCos);
    return isLeft ? rotation : -rotation;
  };

  const leftShoulderRotation = computeShoulderRotation(leftUpperArm, leftForearm, true);
  const rightShoulderRotation = computeShoulderRotation(rightUpperArm, rightForearm, false);

  const calculateElbowFlexionRobust = (
    shoulder: NormalizedLandmark, elbow: NormalizedLandmark, wrist: NormalizedLandmark
  ): number => {
    const flexion3D = calculateJointFlexion(shoulder, elbow, wrist);
    const dx = wrist.x - elbow.x;
    const dy = wrist.y - elbow.y;
    const dxU = elbow.x - shoulder.x;
    const dyU = elbow.y - shoulder.y;
    const dot2D = dx * dxU + dy * dyU;
    const mag1 = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const mag2 = Math.sqrt(dxU * dxU + dyU * dyU) + 0.001;
    const angle2D = Math.acos(Math.max(-1, Math.min(1, dot2D / (mag1 * mag2))));
    const flexion2D = Math.PI - angle2D;

    const zRange = Math.abs(wrist.z - shoulder.z);
    const depthConfidence = Math.min(1, zRange / 0.15);
    return flexion3D * depthConfidence + flexion2D * (1 - depthConfidence);
  };

  const leftElbowFlexion = calculateElbowFlexionRobust(leftShoulder, leftElbow, leftWrist);
  const rightElbowFlexion = calculateElbowFlexionRobust(rightShoulder, rightElbow, rightWrist);

  const computeForearmPronation = (
    forearmDir: Vec3, wristLm: NormalizedLandmark, indexLm: NormalizedLandmark, isLeft: boolean
  ): number => {
    const handDir = normalize(createVector(wristLm, indexLm));
    const forearmAxis = normalize(forearmDir);
    const dotAlong = handDir.x * forearmAxis.x + handDir.y * forearmAxis.y + handDir.z * forearmAxis.z;
    const handPerp = normalize({
      x: handDir.x - dotAlong * forearmAxis.x,
      y: handDir.y - dotAlong * forearmAxis.y,
      z: handDir.z - dotAlong * forearmAxis.z
    });
    const refPerp = normalize({
      x: torsoUp.x - (torsoUp.x * forearmAxis.x + torsoUp.y * forearmAxis.y + torsoUp.z * forearmAxis.z) * forearmAxis.x,
      y: torsoUp.y - (torsoUp.x * forearmAxis.x + torsoUp.y * forearmAxis.y + torsoUp.z * forearmAxis.z) * forearmAxis.y,
      z: torsoUp.z - (torsoUp.x * forearmAxis.x + torsoUp.y * forearmAxis.y + torsoUp.z * forearmAxis.z) * forearmAxis.z
    });
    const cosAngle = handPerp.x * refPerp.x + handPerp.y * refPerp.y + handPerp.z * refPerp.z;
    const crossDot = (refPerp.y * handPerp.z - refPerp.z * handPerp.y) * forearmAxis.x +
                     (refPerp.z * handPerp.x - refPerp.x * handPerp.z) * forearmAxis.y +
                     (refPerp.x * handPerp.y - refPerp.y * handPerp.x) * forearmAxis.z;
    const angle = Math.atan2(crossDot, cosAngle);
    return isLeft ? angle : -angle;
  };

  const leftPronation = computeForearmPronation(leftForearm, leftWrist, leftIndex, true);
  const rightPronation = computeForearmPronation(rightForearm, rightWrist, rightIndex, false);

  // === LEG CALCULATIONS ===
  const leftThigh = normalize(createVector(leftHip, leftKnee));
  const rightThigh = normalize(createVector(rightHip, rightKnee));
  
  const leftShin = normalize(createVector(leftKnee, leftAnkle));
  const rightShin = normalize(createVector(rightKnee, rightAnkle));

  const leftHipFlexion = Math.atan2(leftThigh.z * 0.3, -leftThigh.y);
  const rightHipFlexion = Math.atan2(rightThigh.z * 0.3, -rightThigh.y);
  
  const leftHipAbduction = Math.atan2(leftThigh.x, -leftThigh.y);
  const rightHipAbduction = Math.atan2(-rightThigh.x, -rightThigh.y);

  const leftKneeFlexion = calculateJointFlexion(leftHip, leftKnee, leftAnkle);
  const rightKneeFlexion = calculateJointFlexion(rightHip, rightKnee, rightAnkle);

  // === ANKLE CALCULATIONS ===
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
    x: leftShoulderFlexion,
    y: leftShoulderRotation,
    z: leftShoulderAbduction
  } : null;
  const rightShoulderJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW]) ? {
    x: rightShoulderFlexion,
    y: rightShoulderRotation,
    z: rightShoulderAbduction
  } : null;
  const leftElbowJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST]) ? {
    x: clamp(leftElbowFlexion, 0, 2.5),
    y: clamp(leftPronation, -1.5, 1.5),
    z: 0
  } : null;
  const rightElbowJoint: Joint3DRotation | null = landmarksVisible(landmarks, [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST]) ? {
    x: clamp(rightElbowFlexion, 0, 2.5),
    y: clamp(rightPronation, -1.5, 1.5),
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

function detectCameraView(landmarks: NormalizedLandmark[]): { viewType: CameraViewType; confidence: number } {
  const lShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const lHip = landmarks[LANDMARKS.LEFT_HIP];
  const rHip = landmarks[LANDMARKS.RIGHT_HIP];

  if (!lShoulder || !rShoulder || !lHip || !rHip) {
    return { viewType: 'frontal', confidence: 0 };
  }

  const shoulderWidth = Math.abs(rShoulder.x - lShoulder.x);
  const shoulderDepth = Math.abs(rShoulder.z - lShoulder.z);
  const hipWidth = Math.abs(rHip.x - lHip.x);

  const depthToWidthRatio = shoulderDepth / (shoulderWidth + 0.001);

  if (depthToWidthRatio > 1.5) {
    const leftCloser = lShoulder.z < rShoulder.z;
    if (leftCloser) {
      return { viewType: 'lateral_right', confidence: Math.min(depthToWidthRatio / 3, 1) };
    }
    return { viewType: 'lateral_left', confidence: Math.min(depthToWidthRatio / 3, 1) };
  }

  if (depthToWidthRatio > 0.6) {
    return { viewType: 'oblique', confidence: 0.5 };
  }

  const noseVis = landmarks[LANDMARKS.NOSE]?.visibility ?? 0;
  if (noseVis < 0.3 && shoulderWidth > 0.1) {
    return { viewType: 'posterior', confidence: 0.7 };
  }

  return { viewType: 'frontal', confidence: Math.min(shoulderWidth / hipWidth, 1) };
}

export function computePosturalMetrics(landmarks: NormalizedLandmark[]): PosturalMetrics {
  const { viewType, confidence: viewConfidence } = detectCameraView(landmarks);

  const lShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const lHip = landmarks[LANDMARKS.LEFT_HIP];
  const rHip = landmarks[LANDMARKS.RIGHT_HIP];
  const lKnee = landmarks[LANDMARKS.LEFT_KNEE];
  const rKnee = landmarks[LANDMARKS.RIGHT_KNEE];
  const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
  const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];
  const nose = landmarks[LANDMARKS.NOSE];
  const lEar = landmarks[LANDMARKS.LEFT_EAR];
  const rEar = landmarks[LANDMARKS.RIGHT_EAR];
  const lElbow = landmarks[LANDMARKS.LEFT_ELBOW];
  const rElbow = landmarks[LANDMARKS.RIGHT_ELBOW];

  const r2d = (r: number) => r * 180 / Math.PI;
  const clampDeg = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
  const shoulderMidZ = (lShoulder.z + rShoulder.z) / 2;
  const hipMidX = (lHip.x + rHip.x) / 2;
  const hipMidY = (lHip.y + rHip.y) / 2;
  const hipMidZ = (lHip.z + rHip.z) / 2;
  const kneeMidY = (lKnee.y + rKnee.y) / 2;
  const kneeMidZ = (lKnee.z + rKnee.z) / 2;

  const isLateral = viewType === 'lateral_left' || viewType === 'lateral_right';

  let kyphosisAngle = 0;
  let lordosisAngle = 0;
  if (isLateral) {
    const shoulderForwardOffset = shoulderMidZ - hipMidZ;
    kyphosisAngle = clampDeg(r2d(Math.atan2(shoulderForwardOffset, Math.abs(shoulderMidY - hipMidY) + 0.001)), -10, 60);

    const hipForwardOfKnee = hipMidZ - kneeMidZ;
    const hipToKneeVertical = Math.abs(hipMidY - kneeMidY) + 0.001;
    lordosisAngle = clampDeg(r2d(Math.atan2(hipForwardOfKnee, hipToKneeVertical)) * 2.5, -10, 60);
  } else {
    const shoulderForwardOffset = shoulderMidZ - hipMidZ;
    kyphosisAngle = clampDeg(r2d(Math.atan2(shoulderForwardOffset, Math.abs(shoulderMidY - hipMidY) + 0.001)) * 0.5, -5, 30);
    lordosisAngle = 0;
  }

  const shoulderTiltDeg = r2d(Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x));
  const hipTiltDeg = r2d(Math.atan2(rHip.y - lHip.y, rHip.x - lHip.x));
  const scoliosisAngle = clampDeg(Math.abs(shoulderTiltDeg - hipTiltDeg), 0, 40);
  const lateralShift = shoulderMidX - hipMidX;
  const trunkLateralShift = clampDeg(r2d(Math.atan2(lateralShift, Math.abs(shoulderMidY - hipMidY) + 0.001)), -20, 20);
  const scoliosisDirection: 'left' | 'right' | 'none' =
    scoliosisAngle < 3 ? 'none' :
    lateralShift > 0 ? 'right' : 'left';

  let forwardHeadAngle = 0;
  if (nose && lEar && rEar) {
    const earMidX = (lEar.x + rEar.x) / 2;
    const earMidY = (lEar.y + rEar.y) / 2;
    const earMidZ = (lEar.z + rEar.z) / 2;

    if (isLateral) {
      const headForwardOffset = earMidZ - shoulderMidZ;
      const headAboveShoulders = Math.abs(shoulderMidY - earMidY) + 0.001;
      forwardHeadAngle = clampDeg(r2d(Math.atan2(headForwardOffset, headAboveShoulders)), -10, 50);
    } else {
      const noseForward = nose.z - shoulderMidZ;
      forwardHeadAngle = clampDeg(r2d(Math.atan2(noseForward, Math.abs(shoulderMidY - nose.y) + 0.001)) * 0.7, -5, 30);
    }
  }

  let anteriorPelvicTilt = 0;
  if (isLateral) {
    const hipToKneeZ = hipMidZ - kneeMidZ;
    const hipToKneeY = Math.abs(hipMidY - kneeMidY) + 0.001;
    const pelvisAngle = r2d(Math.atan2(hipToKneeZ, hipToKneeY));

    const shoulderToHipZ = shoulderMidZ - hipMidZ;
    const shoulderToHipY = Math.abs(shoulderMidY - hipMidY) + 0.001;
    const trunkAngle = r2d(Math.atan2(shoulderToHipZ, shoulderToHipY));

    anteriorPelvicTilt = clampDeg((pelvisAngle - trunkAngle * 0.3) * 2, -30, 30);
  } else {
    const spineForwardRaw = shoulderMidZ - hipMidZ;
    anteriorPelvicTilt = clampDeg(r2d(Math.atan2(spineForwardRaw, Math.abs(shoulderMidY - hipMidY) + 0.001)) * 0.4, -15, 15);
  }

  const pelvicObliquity = clampDeg(r2d(Math.atan2(rHip.y - lHip.y, rHip.x - lHip.x)), -20, 20);

  const pelvicRotation = clampDeg(r2d(Math.atan2(rHip.z - lHip.z, Math.abs(rHip.x - lHip.x) + 0.001)), -30, 30);

  const shoulderLevelDifference = clampDeg(r2d(Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x)), -20, 20);

  const torsoHeight = Math.abs(shoulderMidY - hipMidY) + 0.001;

  const leftShoulderElevation = clampDeg(
    r2d((shoulderMidY - lShoulder.y) / torsoHeight) * 30, -15, 25
  );
  const rightShoulderElevation = clampDeg(
    r2d((shoulderMidY - rShoulder.y) / torsoHeight) * 30, -15, 25
  );

  let leftScapulaElevation = 0;
  let rightScapulaElevation = 0;
  if (lEar && rEar) {
    const earToShoulderL = lShoulder.y - lEar.y;
    const earToShoulderR = rShoulder.y - rEar.y;
    const avgEarToShoulder = ((earToShoulderL + earToShoulderR) / 2) || 0.001;
    leftScapulaElevation = clampDeg(((earToShoulderL - avgEarToShoulder) / Math.abs(avgEarToShoulder)) * -20, -15, 15);
    rightScapulaElevation = clampDeg(((earToShoulderR - avgEarToShoulder) / Math.abs(avgEarToShoulder)) * -20, -15, 15);
  }

  const leftScapulaProtraction = clampDeg(
    r2d(Math.atan2(lShoulder.z - shoulderMidZ, torsoHeight)) * 3, -20, 20
  );
  const rightScapulaProtraction = clampDeg(
    r2d(Math.atan2(rShoulder.z - shoulderMidZ, torsoHeight)) * 3, -20, 20
  );

  let leftScapuloHumeralRatio = 2.0;
  let rightScapuloHumeralRatio = 2.0;
  if (lElbow) {
    const leftArmVec = createVector(lShoulder, lElbow);
    const leftArmElevation = r2d(Math.atan2(
      Math.sqrt(leftArmVec.x * leftArmVec.x + leftArmVec.z * leftArmVec.z),
      -leftArmVec.y
    ));
    if (leftArmElevation > 30) {
      const leftShoulderHike = (shoulderMidY - lShoulder.y) / torsoHeight;
      const scapularContribution = Math.max(0, leftShoulderHike * 180);
      const glenohumeralContribution = Math.max(1, leftArmElevation - scapularContribution);
      leftScapuloHumeralRatio = glenohumeralContribution / Math.max(1, scapularContribution);
      leftScapuloHumeralRatio = Math.max(0.5, Math.min(5, leftScapuloHumeralRatio));
    }
  }
  if (rElbow) {
    const rightArmVec = createVector(rShoulder, rElbow);
    const rightArmElevation = r2d(Math.atan2(
      Math.sqrt(rightArmVec.x * rightArmVec.x + rightArmVec.z * rightArmVec.z),
      -rightArmVec.y
    ));
    if (rightArmElevation > 30) {
      const rightShoulderHike = (shoulderMidY - rShoulder.y) / torsoHeight;
      const scapularContribution = Math.max(0, rightShoulderHike * 180);
      const glenohumeralContribution = Math.max(1, rightArmElevation - scapularContribution);
      rightScapuloHumeralRatio = glenohumeralContribution / Math.max(1, scapularContribution);
      rightScapuloHumeralRatio = Math.max(0.5, Math.min(5, rightScapuloHumeralRatio));
    }
  }

  return {
    viewType,
    viewConfidence,
    kyphosisAngle,
    lordosisAngle,
    scoliosisAngle,
    scoliosisDirection,
    forwardHeadAngle,
    anteriorPelvicTilt,
    pelvicObliquity,
    pelvicRotation,
    leftScapulaElevation,
    rightScapulaElevation,
    leftScapulaProtraction,
    rightScapulaProtraction,
    leftScapuloHumeralRatio,
    rightScapuloHumeralRatio,
    leftShoulderElevation,
    rightShoulderElevation,
    shoulderLevelDifference,
    trunkLateralShift
  };
}

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
    ]
  },
  left_hip: {
    regionId: 'left_hip',
    requiredLandmarks: [23, 25],
    jointMapping: [
      { joint: 'leftHip', landmarks: [23, 25] },
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
    requiredLandmarks: [12, 14, 16],
    jointMapping: [
      { joint: 'rightElbow', landmarks: [12, 14, 16] },
    ]
  },
  left_elbow: {
    regionId: 'left_elbow',
    requiredLandmarks: [11, 13, 15],
    jointMapping: [
      { joint: 'leftElbow', landmarks: [11, 13, 15] },
    ]
  },
  cervical: {
    regionId: 'cervical',
    requiredLandmarks: [0, 7, 8],
    jointMapping: [
      { joint: 'neck', landmarks: [0, 2, 5, 7, 8] },
    ]
  },
  lumbar: {
    regionId: 'lumbar',
    requiredLandmarks: [11, 12, 23, 24],
    jointMapping: [
      { joint: 'spine', landmarks: [11, 12, 23, 24] },
    ]
  },
  full_legs: {
    regionId: 'full_legs',
    requiredLandmarks: [23, 24, 25, 26, 27, 28],
    jointMapping: [
      { joint: 'leftHip', landmarks: [23, 25] },
      { joint: 'rightHip', landmarks: [24, 26] },
      { joint: 'leftKnee', landmarks: [23, 25, 27] },
      { joint: 'rightKnee', landmarks: [24, 26, 28] },
    ]
  },
};

function hasVisibleLandmarks(landmarks: NormalizedLandmark[], indices: number[], minVis: number = MIN_VISIBILITY): boolean {
  return indices.every(i => {
    const lm = landmarks[i];
    return lm && (lm.visibility === undefined || lm.visibility >= minVis);
  });
}

function safeGet(landmarks: NormalizedLandmark[], index: number): NormalizedLandmark {
  return landmarks[index] || { x: 0, y: 0, z: 0, visibility: 0 };
}

export function computeJointFromPartial(
  joint: keyof Skeleton3DPose,
  landmarks: NormalizedLandmark[],
  mirrorMode: boolean = false
): Joint3DRotation | null {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  switch (joint) {
    case 'leftShoulder':
    case 'rightShoulder': {
      const isLeft = joint === 'leftShoulder';
      const actualJoint = mirrorMode ? (isLeft ? 'rightShoulder' : 'leftShoulder') : joint;
      const sIdx = actualJoint === 'leftShoulder' ? LANDMARKS.LEFT_SHOULDER : LANDMARKS.RIGHT_SHOULDER;
      const eIdx = actualJoint === 'leftShoulder' ? LANDMARKS.LEFT_ELBOW : LANDMARKS.RIGHT_ELBOW;
      const wIdx = actualJoint === 'leftShoulder' ? LANDMARKS.LEFT_WRIST : LANDMARKS.RIGHT_WRIST;
      if (!hasVisibleLandmarks(landmarks, [sIdx, eIdx], 0.15)) return null;
      const sLm = safeGet(landmarks, sIdx);
      const eLm = safeGet(landmarks, eIdx);
      const wLm = safeGet(landmarks, wIdx);
      const upperArm = normalize(createVector(sLm, eLm));
      const forearm = normalize(createVector(eLm, wLm));
      const horizMag = Math.sqrt(upperArm.x * upperArm.x + upperArm.z * upperArm.z);
      const elevation = Math.atan2(horizMag, -upperArm.y);
      const sideIsLeft = actualJoint === 'leftShoulder';
      const lateralX = sideIsLeft ? -upperArm.x : upperArm.x;
      const azimuth = Math.atan2(upperArm.z, lateralX);
      const flexion = elevation * Math.sin(azimuth);
      const abduction = elevation * Math.cos(azimuth);
      const cross = {
        x: upperArm.y * forearm.z - upperArm.z * forearm.y,
        y: upperArm.z * forearm.x - upperArm.x * forearm.z,
        z: upperArm.x * forearm.y - upperArm.y * forearm.x
      };
      const dot = cross.x * upperArm.x + cross.y * upperArm.y + cross.z * upperArm.z;
      const intRot = Math.atan2(dot, forearm.x * upperArm.x + forearm.y * upperArm.y + forearm.z * upperArm.z + 0.001);
      const signedRot = sideIsLeft ? intRot : -intRot;
      return {
        x: clamp(flexion, -0.5, Math.PI),
        y: clamp(signedRot, -1.2, 1.2),
        z: clamp(abduction, -0.3, Math.PI)
      };
    }
    case 'leftElbow':
    case 'rightElbow': {
      const isLeft = joint === 'leftElbow';
      const actualJoint = mirrorMode ? (isLeft ? 'rightElbow' : 'leftElbow') : joint;
      const sIdx = actualJoint === 'leftElbow' ? LANDMARKS.LEFT_SHOULDER : LANDMARKS.RIGHT_SHOULDER;
      const eIdx = actualJoint === 'leftElbow' ? LANDMARKS.LEFT_ELBOW : LANDMARKS.RIGHT_ELBOW;
      const wIdx = actualJoint === 'leftElbow' ? LANDMARKS.LEFT_WRIST : LANDMARKS.RIGHT_WRIST;
      if (!hasVisibleLandmarks(landmarks, [sIdx, eIdx, wIdx], 0.15)) return null;
      const angleFromVertical = calculateJointFlexion(safeGet(landmarks, sIdx), safeGet(landmarks, eIdx), safeGet(landmarks, wIdx));
      return { x: clamp(angleFromVertical, 0, 2.5), y: 0, z: 0 };
    }
    case 'leftHip':
    case 'rightHip': {
      const isLeft = joint === 'leftHip';
      const actualJoint = mirrorMode ? (isLeft ? 'rightHip' : 'leftHip') : joint;
      const hIdx = actualJoint === 'leftHip' ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
      const kIdx = actualJoint === 'leftHip' ? LANDMARKS.LEFT_KNEE : LANDMARKS.RIGHT_KNEE;
      if (!hasVisibleLandmarks(landmarks, [hIdx, kIdx], 0.15)) return null;
      const thigh = normalize(createVector(safeGet(landmarks, hIdx), safeGet(landmarks, kIdx)));
      const hipFlex = Math.atan2(thigh.z * 0.3, -thigh.y);
      const isActualLeft = actualJoint === 'leftHip';
      const hipAbd = isActualLeft
        ? Math.atan2(thigh.x, -thigh.y)
        : Math.atan2(-thigh.x, -thigh.y);
      return { x: clamp(hipFlex, -0.5, 2.0), y: 0, z: clamp(hipAbd, -0.3, 0.8) };
    }
    case 'leftKnee':
    case 'rightKnee': {
      const isLeft = joint === 'leftKnee';
      const actualJoint = mirrorMode ? (isLeft ? 'rightKnee' : 'leftKnee') : joint;
      const hIdx = actualJoint === 'leftKnee' ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
      const kIdx = actualJoint === 'leftKnee' ? LANDMARKS.LEFT_KNEE : LANDMARKS.RIGHT_KNEE;
      const aIdx = actualJoint === 'leftKnee' ? LANDMARKS.LEFT_ANKLE : LANDMARKS.RIGHT_ANKLE;
      if (!hasVisibleLandmarks(landmarks, [hIdx, kIdx, aIdx], 0.15)) return null;
      const angleFromVertical = calculateJointFlexion(safeGet(landmarks, hIdx), safeGet(landmarks, kIdx), safeGet(landmarks, aIdx));
      return { x: clamp(angleFromVertical, 0, 2.5), y: 0, z: 0 };
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
      const sMid: Vec3 = { x: (ls.x + rs.x) / 2, y: -((ls.y + rs.y) / 2), z: -((ls.z + rs.z) / 2) };
      const hMid: Vec3 = { x: (lh.x + rh.x) / 2, y: -((lh.y + rh.y) / 2), z: -((lh.z + rh.z) / 2) };
      const sTilt = Math.atan2(-(rs.y - ls.y), rs.x - ls.x);
      const hTilt = Math.atan2(-(rh.y - lh.y), rh.x - lh.x);
      const lateral = sTilt - hTilt;
      const forward = Math.atan2(-(sMid.z - hMid.z), sMid.y - hMid.y);
      return { x: clamp(forward, -0.8, 0.8), y: 0, z: clamp(lateral, -0.5, 0.5) };
    }
    case 'neck': {
      if (!hasVisibleLandmarks(landmarks, [LANDMARKS.NOSE], 0.1)) return null;
      const noseL = safeGet(landmarks, LANDMARKS.NOSE);
      const leftEarL = safeGet(landmarks, LANDMARKS.LEFT_EAR);
      const rightEarL = safeGet(landmarks, LANDMARKS.RIGHT_EAR);
      const leftEyeL = safeGet(landmarks, LANDMARKS.LEFT_EYE);
      const rightEyeL = safeGet(landmarks, LANDMARKS.RIGHT_EYE);
      const earVisL = hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR], 0.05);
      const eyeVisL = hasVisibleLandmarks(landmarks, [LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE], 0.05);
      if (!earVisL && !eyeVisL) return null;

      const earVecL = earVisL ? createVector(leftEarL, rightEarL) : createVector(leftEyeL, rightEyeL);
      const earConfL = getLandmarkConfidence(landmarks, [LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR]);

      const leftShoulderL = safeGet(landmarks, LANDMARKS.LEFT_SHOULDER);
      const rightShoulderL = safeGet(landmarks, LANDMARKS.RIGHT_SHOULDER);
      const earYawL = Math.atan2(earVecL.z, Math.abs(earVecL.x) || 0.01) * 1.5;
      const lSToEar = createVector(leftShoulderL, leftEarL);
      const rSToEar = createVector(rightShoulderL, rightEarL);
      const sEarYawL = Math.atan2(
        rSToEar.z - lSToEar.z,
        (Math.abs(lSToEar.x) + Math.abs(rSToEar.x)) || 0.01
      ) * 1.2;
      const earWL = Math.min(earConfL / 0.7, 1.0);
      const yawL = earWL * earYawL + (1 - earWL) * sEarYawL;

      const eyeVecL = createVector(leftEyeL, rightEyeL);
      const earRollL = Math.atan2(earVecL.y, Math.abs(earVecL.x) || 0.01);
      const eyeRollL = Math.atan2(eyeVecL.y, Math.abs(eyeVecL.x) || 0.01);
      const rollL = earConfL > 0.5 ? earRollL * 0.7 + eyeRollL * 0.3 : eyeRollL;

      const sMidRawL: Vec3 = {
        x: (leftShoulderL.x + rightShoulderL.x) / 2,
        y: (leftShoulderL.y + rightShoulderL.y) / 2,
        z: (leftShoulderL.z + rightShoulderL.z) / 2
      };
      const nosePtL: Vec3 = { x: noseL.x, y: -noseL.y, z: -noseL.z };
      const sMidPtL: Vec3 = { x: sMidRawL.x, y: -sMidRawL.y, z: -sMidRawL.z };
      const nToSVec: Vec3 = {
        x: nosePtL.x - sMidPtL.x,
        y: nosePtL.y - sMidPtL.y,
        z: nosePtL.z - sMidPtL.z
      };
      const nsP = Math.atan2(nToSVec.z, nToSVec.y);
      const eMidYL = -(leftEyeL.y + rightEyeL.y) / 2;
      const nYL = -noseL.y;
      const eMidZL = -(leftEyeL.z + rightEyeL.z) / 2;
      const nZL = -noseL.z;
      const neP = Math.atan2(nYL - eMidYL, Math.abs(nZL - eMidZL) + 0.01) - 0.3;
      const noseConfL = getLandmarkConfidence(landmarks, [LANDMARKS.NOSE]);
      const pitchL = noseConfL > 0.6 ? nsP * 0.4 + neP * 0.6 : neP;

      return { x: clamp(pitchL, -0.6, 0.6), y: clamp(yawL, -0.8, 0.8), z: clamp(rollL, -0.5, 0.5) };
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
