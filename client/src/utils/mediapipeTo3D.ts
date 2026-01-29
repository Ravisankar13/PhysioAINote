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
