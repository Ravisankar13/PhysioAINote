import { type MuscleOverride, PATHOLOGY_EFFECTS } from './muscleBiomechanicsEngine';

export interface MuscleJointAction {
  joint: string;
  parameter: string;
  direction: number;
  strength: number;
}

export interface AgonistAntagonistPair {
  agonist: string;
  antagonist: string;
  jointParam: string;
  reciprocalInhibitionStrength: number;
}

export interface JointCoupling {
  sourceJoint: string;
  sourceParam: string;
  targetJoint: string;
  targetParam: string;
  ratio: number;
}

export const MUSCLE_JOINT_ACTIONS: Record<string, MuscleJointAction[]> = {
  glute_l: [
    { joint: 'leftHip', parameter: 'extension', direction: 1, strength: 0.8 },
    { joint: 'leftHip', parameter: 'flexion', direction: -1, strength: 0.6 },
    { joint: 'leftHip', parameter: 'abduction', direction: 1, strength: 0.4 },
    { joint: 'pelvis', parameter: 'tilt', direction: -1, strength: 0.3 },
  ],
  glute_r: [
    { joint: 'rightHip', parameter: 'extension', direction: 1, strength: 0.8 },
    { joint: 'rightHip', parameter: 'flexion', direction: -1, strength: 0.6 },
    { joint: 'rightHip', parameter: 'abduction', direction: 1, strength: 0.4 },
    { joint: 'pelvis', parameter: 'tilt', direction: -1, strength: 0.3 },
  ],
  quad_l: [
    { joint: 'leftKnee', parameter: 'flexion', direction: -1, strength: 0.8 },
    { joint: 'leftHip', parameter: 'flexion', direction: 1, strength: 0.3 },
  ],
  quad_r: [
    { joint: 'rightKnee', parameter: 'flexion', direction: -1, strength: 0.8 },
    { joint: 'rightHip', parameter: 'flexion', direction: 1, strength: 0.3 },
  ],
  calf_l: [
    { joint: 'leftAnkle', parameter: 'plantarflexion', direction: 1, strength: 0.7 },
    { joint: 'leftAnkle', parameter: 'dorsiflexion', direction: -1, strength: 0.6 },
    { joint: 'leftKnee', parameter: 'flexion', direction: 1, strength: 0.15 },
  ],
  calf_r: [
    { joint: 'rightAnkle', parameter: 'plantarflexion', direction: 1, strength: 0.7 },
    { joint: 'rightAnkle', parameter: 'dorsiflexion', direction: -1, strength: 0.6 },
    { joint: 'rightKnee', parameter: 'flexion', direction: 1, strength: 0.15 },
  ],
  shin_l: [
    { joint: 'leftAnkle', parameter: 'dorsiflexion', direction: 1, strength: 0.7 },
    { joint: 'leftAnkle', parameter: 'plantarflexion', direction: -1, strength: 0.5 },
  ],
  shin_r: [
    { joint: 'rightAnkle', parameter: 'dorsiflexion', direction: 1, strength: 0.7 },
    { joint: 'rightAnkle', parameter: 'plantarflexion', direction: -1, strength: 0.5 },
  ],
  core: [
    { joint: 'pelvis', parameter: 'tilt', direction: -1, strength: 0.4 },
    { joint: 'spine', parameter: 'lumbarLordosis', direction: -1, strength: 0.3 },
  ],
  spine: [
    { joint: 'spine', parameter: 'lumbarLordosis', direction: 1, strength: 0.5 },
    { joint: 'spine', parameter: 'thoracicKyphosis', direction: -1, strength: 0.3 },
  ],
  neck: [
    { joint: 'neck', parameter: 'extension', direction: 1, strength: 0.5 },
    { joint: 'spine', parameter: 'forwardHead', direction: 1, strength: 0.3 },
  ],
  chest: [
    { joint: 'leftShoulder', parameter: 'internalRotation', direction: 1, strength: 0.3 },
    { joint: 'rightShoulder', parameter: 'internalRotation', direction: 1, strength: 0.3 },
    { joint: 'spine', parameter: 'thoracicKyphosis', direction: 1, strength: 0.2 },
  ],
  deltoid_l: [
    { joint: 'leftShoulder', parameter: 'abduction', direction: 1, strength: 0.6 },
    { joint: 'leftShoulder', parameter: 'flexion', direction: 1, strength: 0.4 },
  ],
  deltoid_r: [
    { joint: 'rightShoulder', parameter: 'abduction', direction: 1, strength: 0.6 },
    { joint: 'rightShoulder', parameter: 'flexion', direction: 1, strength: 0.4 },
  ],
  scapula_l: [
    { joint: 'leftShoulder', parameter: 'elevation', direction: 1, strength: 0.4 },
  ],
  scapula_r: [
    { joint: 'rightShoulder', parameter: 'elevation', direction: 1, strength: 0.4 },
  ],
  bicep_l: [
    { joint: 'leftElbow', parameter: 'flexion', direction: 1, strength: 0.8 },
    { joint: 'leftShoulder', parameter: 'flexion', direction: 1, strength: 0.15 },
  ],
  bicep_r: [
    { joint: 'rightElbow', parameter: 'flexion', direction: 1, strength: 0.8 },
    { joint: 'rightShoulder', parameter: 'flexion', direction: 1, strength: 0.15 },
  ],
};

export const AGONIST_ANTAGONIST_PAIRS: AgonistAntagonistPair[] = [
  { agonist: 'quad_l', antagonist: 'calf_l', jointParam: 'leftKnee.flexion', reciprocalInhibitionStrength: 0.3 },
  { agonist: 'quad_r', antagonist: 'calf_r', jointParam: 'rightKnee.flexion', reciprocalInhibitionStrength: 0.3 },

  { agonist: 'glute_l', antagonist: 'quad_l', jointParam: 'leftHip.flexion', reciprocalInhibitionStrength: 0.25 },
  { agonist: 'glute_r', antagonist: 'quad_r', jointParam: 'rightHip.flexion', reciprocalInhibitionStrength: 0.25 },

  { agonist: 'calf_l', antagonist: 'shin_l', jointParam: 'leftAnkle.dorsiflexion', reciprocalInhibitionStrength: 0.35 },
  { agonist: 'calf_r', antagonist: 'shin_r', jointParam: 'rightAnkle.dorsiflexion', reciprocalInhibitionStrength: 0.35 },

  { agonist: 'core', antagonist: 'spine', jointParam: 'spine.lumbarLordosis', reciprocalInhibitionStrength: 0.3 },

  { agonist: 'chest', antagonist: 'scapula_l', jointParam: 'leftShoulder.internalRotation', reciprocalInhibitionStrength: 0.2 },
  { agonist: 'chest', antagonist: 'scapula_r', jointParam: 'rightShoulder.internalRotation', reciprocalInhibitionStrength: 0.2 },

  { agonist: 'bicep_l', antagonist: 'deltoid_l', jointParam: 'leftElbow.flexion', reciprocalInhibitionStrength: 0.15 },
  { agonist: 'bicep_r', antagonist: 'deltoid_r', jointParam: 'rightElbow.flexion', reciprocalInhibitionStrength: 0.15 },
];

export const JOINT_COUPLINGS: JointCoupling[] = [
  { sourceJoint: 'pelvis', sourceParam: 'tilt', targetJoint: 'spine', targetParam: 'lumbarLordosis', ratio: 0.6 },

  { sourceJoint: 'spine', sourceParam: 'thoracicKyphosis', targetJoint: 'neck', targetParam: 'extension', ratio: 0.4 },

  { sourceJoint: 'spine', sourceParam: 'thoracicKyphosis', targetJoint: 'leftShoulder', targetParam: 'protraction', ratio: 0.3 },
  { sourceJoint: 'spine', sourceParam: 'thoracicKyphosis', targetJoint: 'rightShoulder', targetParam: 'protraction', ratio: 0.3 },

  { sourceJoint: 'pelvis', sourceParam: 'tilt', targetJoint: 'leftHip', targetParam: 'flexion', ratio: 0.25 },
  { sourceJoint: 'pelvis', sourceParam: 'tilt', targetJoint: 'rightHip', targetParam: 'flexion', ratio: 0.25 },

  { sourceJoint: 'spine', sourceParam: 'forwardHead', targetJoint: 'neck', targetParam: 'forwardHead', ratio: 0.8 },

  { sourceJoint: 'spine', sourceParam: 'scoliosis', targetJoint: 'pelvis', targetParam: 'obliquity', ratio: 0.3 },
];

function getEffectiveMuscleForce(
  muscleId: string,
  overrides: Record<string, MuscleOverride>
): number | null {
  const override = overrides[muscleId];
  if (!override?.isManual) return null;

  let force = 50;

  force += override.tensionOffset;

  if (override.lengthOverride === 'shortened') {
    force = Math.max(force, 75);
  } else if (override.lengthOverride === 'lengthened') {
    force = Math.min(force, 25);
  } else if (override.lengthOverride === 'neutral') {
    force = 50 + override.tensionOffset;
  }

  if (override.pathology !== 'none') {
    const pathEffect = PATHOLOGY_EFFECTS[override.pathology];
    force += pathEffect.tensionMod;
  }

  if (override.inhibition > 0) {
    const inhibFactor = 1 - (override.inhibition / 100) * 0.5;
    force = 50 + (force - 50) * inhibFactor;
  }

  return Math.max(5, Math.min(95, force));
}

export interface BidirectionalResult {
  jointAdjustments: Record<string, Record<string, number>>;
  reciprocalInhibitions: Record<string, number>;
  couplingEffects: Record<string, Record<string, number>>;
  muscleDrivenJoints: Set<string>;
}

export function computeBidirectionalEffects(
  overrides: Record<string, MuscleOverride>,
  currentModelConfig: any
): BidirectionalResult {
  const jointAdjustments: Record<string, Record<string, number>> = {};
  const reciprocalInhibitions: Record<string, number> = {};
  const couplingEffects: Record<string, Record<string, number>> = {};
  const muscleDrivenJoints = new Set<string>();

  const muscleForcesCache: Record<string, number | null> = {};

  const getForce = (muscleId: string): number | null => {
    if (!(muscleId in muscleForcesCache)) {
      muscleForcesCache[muscleId] = getEffectiveMuscleForce(muscleId, overrides);
    }
    return muscleForcesCache[muscleId];
  };

  for (const [muscleId, actions] of Object.entries(MUSCLE_JOINT_ACTIONS)) {
    const force = getForce(muscleId);
    if (force === null) continue;

    const deviation = force - 50;
    if (Math.abs(deviation) < 3) continue;

    for (const action of actions) {
      if (!jointAdjustments[action.joint]) {
        jointAdjustments[action.joint] = {};
      }
      const currentAdj = jointAdjustments[action.joint][action.parameter] || 0;
      const contribution = deviation * action.direction * action.strength * 0.4;
      jointAdjustments[action.joint][action.parameter] = currentAdj + contribution;
      muscleDrivenJoints.add(`${action.joint}.${action.parameter}`);
    }
  }

  for (const pair of AGONIST_ANTAGONIST_PAIRS) {
    const agonistForce = getForce(pair.agonist);
    if (agonistForce === null) continue;

    const agonistDeviation = agonistForce - 50;
    if (Math.abs(agonistDeviation) < 5) continue;

    const antagonistOverride = overrides[pair.antagonist];
    if (antagonistOverride?.isManual) continue;

    const inhibitionAmount = Math.abs(agonistDeviation) * pair.reciprocalInhibitionStrength;
    const currentInhib = reciprocalInhibitions[pair.antagonist] || 0;
    reciprocalInhibitions[pair.antagonist] = Math.min(80, currentInhib + inhibitionAmount);
  }

  for (const coupling of JOINT_COUPLINGS) {
    const sourceJointAdj = jointAdjustments[coupling.sourceJoint];
    const sourceChange = sourceJointAdj?.[coupling.sourceParam] || 0;

    if (Math.abs(sourceChange) < 1) continue;

    if (!couplingEffects[coupling.targetJoint]) {
      couplingEffects[coupling.targetJoint] = {};
    }
    const currentCoupling = couplingEffects[coupling.targetJoint][coupling.targetParam] || 0;
    couplingEffects[coupling.targetJoint][coupling.targetParam] = currentCoupling + sourceChange * coupling.ratio;
    muscleDrivenJoints.add(`${coupling.targetJoint}.${coupling.targetParam}`);
  }

  return {
    jointAdjustments,
    reciprocalInhibitions,
    couplingEffects,
    muscleDrivenJoints,
  };
}

export function applyBidirectionalToModelConfig(
  baseConfig: any,
  result: BidirectionalResult
): any {
  const newConfig = JSON.parse(JSON.stringify(baseConfig));

  for (const [jointName, params] of Object.entries(result.jointAdjustments)) {
    if (!newConfig[jointName]) continue;
    for (const [param, delta] of Object.entries(params)) {
      if (param in newConfig[jointName]) {
        newConfig[jointName][param] = clamp(
          newConfig[jointName][param] + delta,
          getJointParamRange(jointName, param)[0],
          getJointParamRange(jointName, param)[1]
        );
      }
    }
  }

  for (const [jointName, params] of Object.entries(result.couplingEffects)) {
    if (!newConfig[jointName]) continue;
    for (const [param, delta] of Object.entries(params)) {
      if (param in newConfig[jointName]) {
        newConfig[jointName][param] = clamp(
          newConfig[jointName][param] + delta,
          getJointParamRange(jointName, param)[0],
          getJointParamRange(jointName, param)[1]
        );
      }
    }
  }

  return newConfig;
}

export function mergeReciprocalInhibitions(
  existingOverrides: Record<string, MuscleOverride>,
  reciprocalInhibitions: Record<string, number>
): Record<string, MuscleOverride> {
  const merged = { ...existingOverrides };

  for (const [muscleId, inhibAmount] of Object.entries(reciprocalInhibitions)) {
    const existing = merged[muscleId];
    if (existing?.isManual) continue;

    merged[muscleId] = {
      tensionOffset: existing?.tensionOffset ?? 0,
      activationOffset: existing?.activationOffset ?? 0,
      lengthOverride: existing?.lengthOverride ?? 'none',
      inhibition: inhibAmount,
      pathology: existing?.pathology ?? 'none',
      isManual: false,
    };
  }

  return merged;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const JOINT_RANGES: Record<string, Record<string, [number, number]>> = {
  leftHip: { flexion: [0, 120], extension: [0, 30], abduction: [-30, 45], internalRotation: [-45, 45] },
  rightHip: { flexion: [0, 120], extension: [0, 30], abduction: [-30, 45], internalRotation: [-45, 45] },
  leftKnee: { flexion: [0, 140], varus: [-15, 15], recurvatum: [-5, 15], tibialTorsion: [-30, 30], tibialSlope: [-10, 10] },
  rightKnee: { flexion: [0, 140], varus: [-15, 15], recurvatum: [-5, 15], tibialTorsion: [-30, 30], tibialSlope: [-10, 10] },
  leftAnkle: { dorsiflexion: [0, 30], plantarflexion: [0, 50], inversion: [-20, 20], eversion: [-20, 20] },
  rightAnkle: { dorsiflexion: [0, 30], plantarflexion: [0, 50], inversion: [-20, 20], eversion: [-20, 20] },
  leftShoulder: { flexion: [-30, 180], abduction: [0, 180], internalRotation: [0, 90], externalRotation: [0, 90], elevation: [-10, 30], protraction: [-20, 30] },
  rightShoulder: { flexion: [-30, 180], abduction: [0, 180], internalRotation: [0, 90], externalRotation: [0, 90], elevation: [-10, 30], protraction: [-20, 30] },
  leftElbow: { flexion: [0, 150], pronation: [-90, 90] },
  rightElbow: { flexion: [0, 150], pronation: [-90, 90] },
  pelvis: { tilt: [-30, 30], obliquity: [-15, 15], rotation: [-30, 30], drop: [-15, 15] },
  spine: { thoracicKyphosis: [-10, 60], lumbarLordosis: [-20, 40], scoliosis: [-30, 30], forwardHead: [-10, 40], lateralShift: [-20, 20] },
  neck: { flexion: [-10, 60], extension: [-10, 40], rotation: [-80, 80], lateralFlexion: [-45, 45], forwardHead: [-10, 40] },
};

function getJointParamRange(joint: string, param: string): [number, number] {
  return JOINT_RANGES[joint]?.[param] ?? [-90, 90];
}

export function getMuscleDrivenDescription(muscleId: string): string {
  const actions = MUSCLE_JOINT_ACTIONS[muscleId];
  if (!actions || actions.length === 0) return '';

  const parts = actions.map(a => {
    const jointLabel = a.joint.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const dir = a.direction > 0 ? 'increases' : 'decreases';
    return `${dir} ${jointLabel} ${a.parameter}`;
  });

  return parts.join(', ');
}

export function getAntagonistFor(muscleId: string): string[] {
  const antagonists: string[] = [];
  for (const pair of AGONIST_ANTAGONIST_PAIRS) {
    if (pair.agonist === muscleId) antagonists.push(pair.antagonist);
    if (pair.antagonist === muscleId) antagonists.push(pair.agonist);
  }
  return antagonists;
}
