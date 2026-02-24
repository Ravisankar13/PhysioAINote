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

export const LEG_IK_CONFIG = {
  left: {
    hipBoneName: 'Hip_L',
    thighBoneName: 'Hip_L',
    shinBoneName: 'Knee_L',
    footBoneName: 'Ankle_L',
    isLeft: true,
  },
  right: {
    hipBoneName: 'Hip_R',
    thighBoneName: 'Hip_R',
    shinBoneName: 'Knee_R',
    footBoneName: 'Ankle_R',
    isLeft: false,
  },
};

export function solveTwoBoneIK(
  hipWorldPos: THREE.Vector3,
  targetFootPos: THREE.Vector3,
  thighLength: number,
  shinLength: number,
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
  const shinBone = bones[config.shinBoneName];
  const footBone = bones[config.footBoneName];

  if (!hipBone || !shinBone || !footBone) {
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

function computeStandingIKAngles(
  bones: { [name: string]: THREE.Bone },
  config: LegIKConfig,
  legLengths: { thighLength: number; shinLength: number },
  initialFootPos: THREE.Vector3
): IKResult {
  const hipBone = bones[config.hipBoneName];
  if (!hipBone) return { hipAngle: 0, kneeAngle: 0, success: false };

  const hipWorldPos = new THREE.Vector3();
  hipBone.getWorldPosition(hipWorldPos);

  return solveTwoBoneIK(hipWorldPos, initialFootPos, legLengths.thighLength, legLengths.shinLength);
}

export function applyLegIK(
  bones: { [name: string]: THREE.Bone },
  initialRotations: { [name: string]: { x: number; y: number; z: number } },
  config: LegIKConfig,
  initialFootPosition: THREE.Vector3,
  legLengths: { thighLength: number; shinLength: number },
  standingAngles: IKResult
): void {
  const thighBone = bones[config.thighBoneName];
  const shinBone = bones[config.shinBoneName];

  if (!thighBone || !shinBone) {
    return;
  }

  const hipWorldPos = new THREE.Vector3();
  thighBone.getWorldPosition(hipWorldPos);
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

  const deltaHipAngle = ikResult.hipAngle - standingAngles.hipAngle;
  const deltaKneeAngle = ikResult.kneeAngle - standingAngles.kneeAngle;

  const thighInitial = initialRotations[config.thighBoneName];
  const shinInitial = initialRotations[config.shinBoneName];

  if (thighInitial) {
    thighBone.rotation.x = thighInitial.x;
    thighBone.rotation.y = thighInitial.y;
    thighBone.rotation.z = thighInitial.z + deltaHipAngle;
  }

  thighBone.updateWorldMatrix(true, false);

  if (shinInitial) {
    shinBone.rotation.x = shinInitial.x;
    shinBone.rotation.y = shinInitial.y;
    shinBone.rotation.z = shinInitial.z - deltaKneeAngle;
  }
}

export interface LegIKState {
  leftLegLengths: { thighLength: number; shinLength: number } | null;
  rightLegLengths: { thighLength: number; shinLength: number } | null;
  leftInitialFootPos: THREE.Vector3 | null;
  rightInitialFootPos: THREE.Vector3 | null;
  leftStandingAngles: IKResult;
  rightStandingAngles: IKResult;
  initialized: boolean;
}

export function initializeLegIK(
  bones: { [name: string]: THREE.Bone }
): LegIKState {
  const leftLegLengths = calculateLegLengths(bones, LEG_IK_CONFIG.left);
  const rightLegLengths = calculateLegLengths(bones, LEG_IK_CONFIG.right);
  const leftInitialFootPos = getInitialFootPosition(bones, LEG_IK_CONFIG.left);
  const rightInitialFootPos = getInitialFootPosition(bones, LEG_IK_CONFIG.right);

  const defaultAngles: IKResult = { hipAngle: 0, kneeAngle: 0, success: false };
  let leftStandingAngles = defaultAngles;
  let rightStandingAngles = defaultAngles;

  if (leftLegLengths && leftInitialFootPos) {
    leftStandingAngles = computeStandingIKAngles(bones, LEG_IK_CONFIG.left, leftLegLengths, leftInitialFootPos);
  }
  if (rightLegLengths && rightInitialFootPos) {
    rightStandingAngles = computeStandingIKAngles(bones, LEG_IK_CONFIG.right, rightLegLengths, rightInitialFootPos);
  }

  return {
    leftLegLengths,
    rightLegLengths,
    leftInitialFootPos,
    rightInitialFootPos,
    leftStandingAngles,
    rightStandingAngles,
    initialized: !!(leftLegLengths && rightLegLengths && leftInitialFootPos && rightInitialFootPos),
  };
}

export function applySquatIK(
  bones: { [name: string]: THREE.Bone },
  initialRotations: { [name: string]: { x: number; y: number; z: number } },
  ikState: LegIKState
): void {
  if (!ikState.initialized) {
    return;
  }

  if (ikState.leftLegLengths && ikState.leftInitialFootPos) {
    applyLegIK(
      bones,
      initialRotations,
      LEG_IK_CONFIG.left,
      ikState.leftInitialFootPos,
      ikState.leftLegLengths,
      ikState.leftStandingAngles
    );
  }

  if (ikState.rightLegLengths && ikState.rightInitialFootPos) {
    applyLegIK(
      bones,
      initialRotations,
      LEG_IK_CONFIG.right,
      ikState.rightInitialFootPos,
      ikState.rightLegLengths,
      ikState.rightStandingAngles
    );
  }
}
