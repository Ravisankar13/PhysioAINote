import * as THREE from 'three';

export interface LegIKConfig {
  hipBoneName: string;
  thighBoneName: string;
  shinBoneName: string;
  footBoneName: string;
  isLeft: boolean;
}

export interface IKResult {
  hipAngle: number;
  kneeAngle: number;
  success: boolean;
}

// Bone names for the new 90-bone skeleton model
// Hierarchy: Hip_L/R → HipPart1 → HipPart2 → Knee_L/R → Ankle_L/R → Toes
// For IK: thigh rotation applied at Hip_L, shin rotation at Knee_L
export const LEG_IK_CONFIG = {
  left: {
    hipBoneName: 'Hip_L',      // Hip joint position (root of leg chain)
    thighBoneName: 'Hip_L',    // Where thigh rotation is applied
    shinBoneName: 'Knee_L',    // Where knee rotation is applied
    footBoneName: 'Ankle_L',   // End effector (foot position)
    isLeft: true,
  },
  right: {
    hipBoneName: 'Hip_R',      // Hip joint position (root of leg chain)
    thighBoneName: 'Hip_R',    // Where thigh rotation is applied
    shinBoneName: 'Knee_R',    // Where knee rotation is applied
    footBoneName: 'Ankle_R',   // End effector (foot position)
    isLeft: false,
  },
};

export function solveTwoBoneIK(
  hipWorldPos: THREE.Vector3,
  targetFootPos: THREE.Vector3,
  thighLength: number,
  shinLength: number,
  poleVector: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
): IKResult {
  const targetDistance = hipWorldPos.distanceTo(targetFootPos);
  const totalLength = thighLength + shinLength;
  const minLength = Math.abs(thighLength - shinLength);

  if (targetDistance > totalLength) {
    return { hipAngle: 0, kneeAngle: 0, success: false };
  }

  if (targetDistance < minLength) {
    const maxKneeAngle = Math.PI * 0.9;
    return { hipAngle: Math.PI / 4, kneeAngle: maxKneeAngle, success: true };
  }

  const a = thighLength;
  const b = shinLength;
  const c = targetDistance;

  const cosKneeAngle = (a * a + b * b - c * c) / (2 * a * b);
  const clampedCosKnee = Math.max(-1, Math.min(1, cosKneeAngle));
  const kneeAngle = Math.PI - Math.acos(clampedCosKnee);

  const cosHipAngle = (a * a + c * c - b * b) / (2 * a * c);
  const clampedCosHip = Math.max(-1, Math.min(1, cosHipAngle));
  const hipAngleFromTarget = Math.acos(clampedCosHip);

  const direction = new THREE.Vector3().subVectors(targetFootPos, hipWorldPos).normalize();
  const downVector = new THREE.Vector3(0, -1, 0);
  const hipAngleFromVertical = Math.acos(Math.max(-1, Math.min(1, direction.dot(downVector))));

  const hipAngle = hipAngleFromVertical + hipAngleFromTarget;

  return {
    hipAngle: hipAngle,
    kneeAngle: kneeAngle,
    success: true,
  };
}

export function calculateLegLengths(
  bones: { [name: string]: THREE.Bone },
  config: LegIKConfig
): { thighLength: number; shinLength: number } | null {
  const hipBone = bones[config.hipBoneName];
  const thighBone = bones[config.thighBoneName];
  const shinBone = bones[config.shinBoneName];
  const footBone = bones[config.footBoneName];

  if (!hipBone || !thighBone || !shinBone || !footBone) {
    console.warn('IK: Missing bones for leg IK', config);
    return null;
  }

  const hipWorldPos = new THREE.Vector3();
  const kneeWorldPos = new THREE.Vector3();
  const ankleWorldPos = new THREE.Vector3();

  hipBone.getWorldPosition(hipWorldPos);
  shinBone.getWorldPosition(kneeWorldPos);
  footBone.getWorldPosition(ankleWorldPos);

  const thighLength = hipWorldPos.distanceTo(kneeWorldPos);
  const shinLength = kneeWorldPos.distanceTo(ankleWorldPos);

  return { thighLength, shinLength };
}

export function getInitialFootPosition(
  bones: { [name: string]: THREE.Bone },
  config: LegIKConfig
): THREE.Vector3 | null {
  const footBone = bones[config.footBoneName];
  if (!footBone) return null;

  const footWorldPos = new THREE.Vector3();
  footBone.getWorldPosition(footWorldPos);
  return footWorldPos;
}

export function applyLegIK(
  bones: { [name: string]: THREE.Bone },
  initialRotations: { [name: string]: { x: number; y: number; z: number } },
  config: LegIKConfig,
  initialFootPosition: THREE.Vector3,
  legLengths: { thighLength: number; shinLength: number }
): void {
  const hipBone = bones[config.hipBoneName];
  const thighBone = bones[config.thighBoneName];
  const shinBone = bones[config.shinBoneName];

  if (!hipBone || !thighBone || !shinBone) {
    console.warn('IK: Missing hip, thigh or shin bone');
    return;
  }

  // Get the CURRENT hip world position (already includes pelvis translation)
  // The pelvis has already been translated down, so hipWorldPos reflects the lowered position
  const hipWorldPos = new THREE.Vector3();
  hipBone.getWorldPosition(hipWorldPos);

  // Target is the original foot position (feet stay planted)
  const targetFootPos = initialFootPosition.clone();

  const ikResult = solveTwoBoneIK(
    hipWorldPos,
    targetFootPos,
    legLengths.thighLength,
    legLengths.shinLength
  );

  if (!ikResult.success) {
    return;
  }

  // Apply rotation to the hip bone (Hip_L/R) for thigh movement
  const thighInitial = initialRotations[config.thighBoneName];
  const shinInitial = initialRotations[config.shinBoneName];

  if (thighInitial) {
    thighBone.rotation.x = thighInitial.x + ikResult.hipAngle;
    thighBone.rotation.y = thighInitial.y;
    thighBone.rotation.z = thighInitial.z;
  }

  if (shinInitial) {
    shinBone.rotation.x = shinInitial.x + ikResult.kneeAngle;
    shinBone.rotation.y = shinInitial.y;
    shinBone.rotation.z = shinInitial.z;
  }
}

export interface LegIKState {
  leftLegLengths: { thighLength: number; shinLength: number } | null;
  rightLegLengths: { thighLength: number; shinLength: number } | null;
  leftInitialFootPos: THREE.Vector3 | null;
  rightInitialFootPos: THREE.Vector3 | null;
  initialized: boolean;
}

export function initializeLegIK(
  bones: { [name: string]: THREE.Bone }
): LegIKState {
  const leftLegLengths = calculateLegLengths(bones, LEG_IK_CONFIG.left);
  const rightLegLengths = calculateLegLengths(bones, LEG_IK_CONFIG.right);
  const leftInitialFootPos = getInitialFootPosition(bones, LEG_IK_CONFIG.left);
  const rightInitialFootPos = getInitialFootPosition(bones, LEG_IK_CONFIG.right);

  console.log('IK initialized:', {
    leftLegLengths,
    rightLegLengths,
    leftInitialFootPos: leftInitialFootPos?.toArray(),
    rightInitialFootPos: rightInitialFootPos?.toArray(),
  });

  return {
    leftLegLengths,
    rightLegLengths,
    leftInitialFootPos,
    rightInitialFootPos,
    initialized: !!(leftLegLengths && rightLegLengths && leftInitialFootPos && rightInitialFootPos),
  };
}

export function applySquatIK(
  bones: { [name: string]: THREE.Bone },
  initialRotations: { [name: string]: { x: number; y: number; z: number } },
  ikState: LegIKState
): void {
  if (!ikState.initialized) {
    console.warn('IK: Not initialized');
    return;
  }

  if (ikState.leftLegLengths && ikState.leftInitialFootPos) {
    applyLegIK(
      bones,
      initialRotations,
      LEG_IK_CONFIG.left,
      ikState.leftInitialFootPos,
      ikState.leftLegLengths
    );
  }

  if (ikState.rightLegLengths && ikState.rightInitialFootPos) {
    applyLegIK(
      bones,
      initialRotations,
      LEG_IK_CONFIG.right,
      ikState.rightInitialFootPos,
      ikState.rightLegLengths
    );
  }
}
