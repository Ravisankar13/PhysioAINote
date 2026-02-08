export type MuscleState = 'shortened' | 'neutral' | 'lengthened';
export type ActivationLevel = 'inactive' | 'low' | 'moderate' | 'high';

export interface MuscleStatus {
  id: string;
  label: string;
  state: MuscleState;
  tension: number;
  activation: ActivationLevel;
  activationPercent: number;
  description: string;
}

export interface MuscleStatesMap {
  [muscleGroupId: string]: MuscleStatus;
}

interface JointAngles {
  spine: {
    thoracicKyphosis: number;
    lumbarLordosis: number;
    scoliosis: number;
    forwardHead: number;
    cervicalLateralFlexion: number;
    cervicalLordosis: number;
    cervicalRotation: number;
    lateralShift: number;
    thoracicRotation: number;
    lumbarRotation: number;
  };
  pelvis: {
    tilt: number;
    obliquity: number;
    rotation: number;
    drop: number;
  };
  leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number };
  rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number };
  leftKnee: { flexion: number; varus: number; recurvatum: number; tibialTorsion: number; tibialSlope: number };
  rightKnee: { flexion: number; varus: number; recurvatum: number; tibialTorsion: number; tibialSlope: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; elevation: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; elevation: number };
  leftElbow: { flexion: number; pronation: number };
  rightElbow: { flexion: number; pronation: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function tensionToState(tension: number): MuscleState {
  if (tension > 60) return 'shortened';
  if (tension < 40) return 'lengthened';
  return 'neutral';
}

function tensionToActivation(activationPct: number): ActivationLevel {
  if (activationPct >= 70) return 'high';
  if (activationPct >= 40) return 'moderate';
  if (activationPct >= 15) return 'low';
  return 'inactive';
}

function computeGlute(hip: { flexion: number; extension: number; abduction: number; internalRotation: number }, pelvisTilt: number): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension -= hip.flexion * 0.6;
  tension += hip.extension * 0.8;
  activation += hip.extension * 0.7;

  tension -= hip.abduction * 0.2;
  activation += Math.abs(hip.abduction) * 0.3;

  tension -= pelvisTilt * 0.4;
  activation += Math.max(0, -pelvisTilt) * 0.3;

  if (hip.flexion > 20) parts.push('lengthened by hip flexion');
  if (hip.extension > 10) parts.push('activated for hip extension');
  if (pelvisTilt > 10) parts.push('lengthened by anterior pelvic tilt');
  if (Math.abs(hip.abduction) > 15) parts.push('stabilizing in abduction');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeQuad(hip: { flexion: number; extension: number }, knee: { flexion: number; recurvatum: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension += hip.flexion * 0.3;

  tension -= knee.flexion * 0.7;
  activation += knee.flexion * 0.5;

  tension += knee.recurvatum * 0.4;
  activation -= knee.recurvatum * 0.3;

  if (knee.flexion > 20) {
    parts.push('lengthened by knee flexion');
    activation += knee.flexion * 0.4;
  }
  if (knee.flexion > 60) parts.push('eccentrically loaded under deep flexion');
  if (hip.flexion > 20) parts.push('shortened at hip (rectus femoris)');
  if (knee.recurvatum > 5) parts.push('passively tensioned in hyperextension');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeCalf(knee: { flexion: number }, ankle: { dorsiflexion: number; plantarflexion: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension -= ankle.dorsiflexion * 0.8;
  activation += ankle.dorsiflexion * 0.3;

  tension += ankle.plantarflexion * 0.7;
  activation += ankle.plantarflexion * 0.6;

  tension -= knee.flexion * 0.2;

  if (ankle.dorsiflexion > 10) parts.push('stretched by ankle dorsiflexion');
  if (ankle.plantarflexion > 10) parts.push('shortened/active in plantarflexion');
  if (knee.flexion > 30) parts.push('soleus under load with knee bent');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeShin(ankle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension += ankle.dorsiflexion * 0.6;
  activation += ankle.dorsiflexion * 0.7;

  tension -= ankle.plantarflexion * 0.5;

  activation += Math.abs(ankle.inversion) * 0.3;
  activation += Math.abs(ankle.eversion) * 0.3;

  if (ankle.dorsiflexion > 10) parts.push('tibialis anterior active for dorsiflexion');
  if (ankle.plantarflexion > 10) parts.push('tibialis anterior lengthened');
  if (Math.abs(ankle.inversion) > 10) parts.push('peroneals/invertors stabilizing');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeCore(spine: { thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; lateralShift: number }, pelvis: { tilt: number; obliquity: number; rotation: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 15;
  let parts: string[] = [];

  activation += Math.abs(spine.thoracicKyphosis) * 0.3;
  activation += Math.abs(spine.lumbarLordosis) * 0.4;
  tension += spine.lumbarLordosis * 0.3;

  activation += Math.abs(spine.scoliosis) * 0.5;
  activation += Math.abs(spine.lateralShift) * 0.4;

  tension += pelvis.tilt * 0.3;
  activation += Math.abs(pelvis.tilt) * 0.4;
  activation += Math.abs(pelvis.obliquity) * 0.5;
  activation += Math.abs(pelvis.rotation) * 0.3;

  if (Math.abs(pelvis.tilt) > 10) parts.push('core stabilizing against pelvic tilt');
  if (Math.abs(spine.lumbarLordosis) > 15) parts.push('erector spinae active with lordosis');
  if (Math.abs(spine.scoliosis) > 10) parts.push('asymmetric loading from scoliosis');
  if (Math.abs(pelvis.obliquity) > 5) parts.push('lateral core engaged for pelvic obliquity');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeDeltoid(shoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; elevation: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  const flexMag = Math.abs(shoulder.flexion);
  tension += flexMag * 0.3;
  activation += flexMag * 0.5;

  const abdMag = Math.abs(shoulder.abduction);
  tension += abdMag * 0.4;
  activation += abdMag * 0.6;

  activation += Math.abs(shoulder.elevation) * 0.3;

  if (abdMag > 30) parts.push('middle deltoid active in abduction');
  if (flexMag > 40) parts.push('anterior deltoid active in flexion');
  if (abdMag > 60) parts.push('high demand on deltoid/supraspinatus');
  if (Math.abs(shoulder.elevation) > 10) parts.push('upper trapezius/deltoid compensating');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeScapula(shoulder: { flexion: number; abduction: number; elevation: number }, scapula?: { protraction: number; retraction: number; elevation: number; upwardRotation: number; winging: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  const abdMag = Math.abs(shoulder.abduction);
  activation += abdMag * 0.3;
  const flexMag = Math.abs(shoulder.flexion);
  activation += flexMag * 0.2;

  if (scapula) {
    tension += scapula.protraction * 0.4;
    activation += Math.abs(scapula.protraction) * 0.3;
    tension -= scapula.retraction * 0.3;
    activation += Math.abs(scapula.retraction) * 0.4;
    activation += Math.abs(scapula.upwardRotation) * 0.5;
    tension += scapula.winging * 0.6;
    if (scapula.winging > 5) parts.push('serratus anterior weakness indicated by winging');
    if (Math.abs(scapula.protraction) > 10) parts.push('protracted scapula stretching rhomboids');
    if (Math.abs(scapula.retraction) > 10) parts.push('rhomboids/mid-traps active in retraction');
  }

  if (abdMag > 40) parts.push('scapular stabilizers engaged for arm elevation');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeBicep(elbow: { flexion: number; pronation: number }, shoulder: { flexion: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension += elbow.flexion * 0.6;
  activation += elbow.flexion * 0.7;

  tension -= elbow.pronation * 0.2;
  activation += Math.abs(elbow.pronation) * 0.2;

  const shoulderFlex = Math.abs(shoulder.flexion);
  if (shoulderFlex > 40) {
    tension += 10;
    activation += shoulderFlex * 0.15;
  }

  if (elbow.flexion > 20) parts.push('biceps shortened in elbow flexion');
  if (elbow.flexion > 60) parts.push('biceps under high activation');
  if (elbow.pronation > 15) parts.push('biceps stretched by pronation');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeSpine(spine: { thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 15;
  let parts: string[] = [];

  tension += spine.thoracicKyphosis * 0.4;
  activation += Math.abs(spine.thoracicKyphosis) * 0.3;

  tension += spine.lumbarLordosis * 0.5;
  activation += Math.abs(spine.lumbarLordosis) * 0.4;

  activation += Math.abs(spine.scoliosis) * 0.5;

  tension += Math.abs(spine.forwardHead) * 0.4;
  activation += Math.abs(spine.forwardHead) * 0.5;

  if (spine.thoracicKyphosis > 15) parts.push('erector spinae under load from increased kyphosis');
  if (spine.lumbarLordosis > 15) parts.push('paraspinals shortened in lordosis');
  if (Math.abs(spine.scoliosis) > 10) parts.push('asymmetric paraspinal loading');
  if (Math.abs(spine.forwardHead) > 10) parts.push('cervical extensors under strain from forward head');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeNeck(neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number }, spine: { forwardHead: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  tension += neck.flexion * 0.5;
  activation += Math.abs(neck.flexion) * 0.4;

  tension += neck.extension * 0.5;
  activation += Math.abs(neck.extension) * 0.5;

  activation += Math.abs(neck.rotation) * 0.3;
  activation += Math.abs(neck.lateralFlexion) * 0.4;

  const fwdHead = Math.abs(neck.forwardHead || spine.forwardHead);
  tension += fwdHead * 0.5;
  activation += fwdHead * 0.6;

  if (fwdHead > 10) parts.push('upper traps/levator scapulae under strain');
  if (Math.abs(neck.rotation) > 20) parts.push('SCM/scalenes active in rotation');
  if (Math.abs(neck.lateralFlexion) > 10) parts.push('lateral neck muscles asymmetrically loaded');

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function computeChest(shoulder: { flexion: number; internalRotation: number; externalRotation: number }, scapula?: { protraction: number }): { tension: number; activation: number; desc: string } {
  let tension = 50;
  let activation = 10;
  let parts: string[] = [];

  const flexMag = Math.abs(shoulder.flexion);
  if (flexMag > 40) {
    tension += 15;
    activation += flexMag * 0.2;
    parts.push('pec major assisting shoulder flexion');
  }

  tension += shoulder.internalRotation * 0.4;
  activation += Math.abs(shoulder.internalRotation) * 0.3;

  if (scapula && scapula.protraction > 10) {
    tension += scapula.protraction * 0.3;
    parts.push('pec minor shortened with protraction');
  }

  if (shoulder.externalRotation > 20) {
    tension -= 15;
    parts.push('pec major stretched in external rotation');
  }

  return {
    tension: clamp(tension, 5, 95),
    activation: clamp(activation, 0, 100),
    desc: parts.length > 0 ? parts.join('; ') : 'neutral resting position'
  };
}

function safeNum(val: any): number {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

function safeJoint<T extends Record<string, number>>(obj: any, defaults: T): T {
  if (!obj) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    result[key as keyof T] = safeNum(obj[key]) as T[keyof T];
  }
  return result;
}

export function computeAllMuscleStates(modelConfig: any): MuscleStatesMap {
  const results: MuscleStatesMap = {};

  const spineRaw = modelConfig.spine || {};
  const neckRaw = modelConfig.neck || {};

  const angles: JointAngles = {
    spine: {
      thoracicKyphosis: safeNum(spineRaw.thoracicKyphosis),
      lumbarLordosis: safeNum(spineRaw.lumbarLordosis),
      scoliosis: safeNum(spineRaw.scoliosis),
      forwardHead: safeNum(spineRaw.forwardHead || neckRaw.forwardHead),
      cervicalLateralFlexion: safeNum(spineRaw.cervicalLateralFlexion || neckRaw.lateralFlexion),
      cervicalLordosis: safeNum(spineRaw.cervicalLordosis),
      cervicalRotation: safeNum(spineRaw.cervicalRotation || neckRaw.rotation),
      lateralShift: safeNum(spineRaw.lateralShift),
      thoracicRotation: safeNum(spineRaw.thoracicRotation),
      lumbarRotation: safeNum(spineRaw.lumbarRotation),
    },
    pelvis: safeJoint(modelConfig.pelvis, { tilt: 0, obliquity: 0, rotation: 0, drop: 0 }),
    leftHip: safeJoint(modelConfig.leftHip, { flexion: 0, extension: 0, abduction: 0, internalRotation: 0 }),
    rightHip: safeJoint(modelConfig.rightHip, { flexion: 0, extension: 0, abduction: 0, internalRotation: 0 }),
    leftKnee: safeJoint(modelConfig.leftKnee, { flexion: 0, varus: 0, recurvatum: 0, tibialTorsion: 0, tibialSlope: 0 }),
    rightKnee: safeJoint(modelConfig.rightKnee, { flexion: 0, varus: 0, recurvatum: 0, tibialTorsion: 0, tibialSlope: 0 }),
    leftAnkle: safeJoint(modelConfig.leftAnkle, { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0 }),
    rightAnkle: safeJoint(modelConfig.rightAnkle, { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0 }),
    leftShoulder: safeJoint(modelConfig.leftShoulder, { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, elevation: 0 }),
    rightShoulder: safeJoint(modelConfig.rightShoulder, { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, elevation: 0 }),
    leftElbow: safeJoint(modelConfig.leftElbow, { flexion: 0, pronation: 0 }),
    rightElbow: safeJoint(modelConfig.rightElbow, { flexion: 0, pronation: 0 }),
    neck: safeJoint(modelConfig.neck, { flexion: 0, extension: 0, rotation: 0, lateralFlexion: 0, forwardHead: 0 }),
  };

  const gluteL = computeGlute(angles.leftHip, angles.pelvis.tilt);
  results['glute_l'] = { id: 'glute_l', label: 'Left Glute', state: tensionToState(gluteL.tension), tension: gluteL.tension, activation: tensionToActivation(gluteL.activation), activationPercent: gluteL.activation, description: gluteL.desc };

  const gluteR = computeGlute(angles.rightHip, angles.pelvis.tilt);
  results['glute_r'] = { id: 'glute_r', label: 'Right Glute', state: tensionToState(gluteR.tension), tension: gluteR.tension, activation: tensionToActivation(gluteR.activation), activationPercent: gluteR.activation, description: gluteR.desc };

  const quadL = computeQuad(angles.leftHip, angles.leftKnee);
  results['quad_l'] = { id: 'quad_l', label: 'Left Quadriceps', state: tensionToState(quadL.tension), tension: quadL.tension, activation: tensionToActivation(quadL.activation), activationPercent: quadL.activation, description: quadL.desc };

  const quadR = computeQuad(angles.rightHip, angles.rightKnee);
  results['quad_r'] = { id: 'quad_r', label: 'Right Quadriceps', state: tensionToState(quadR.tension), tension: quadR.tension, activation: tensionToActivation(quadR.activation), activationPercent: quadR.activation, description: quadR.desc };

  const calfL = computeCalf(angles.leftKnee, angles.leftAnkle);
  results['calf_l'] = { id: 'calf_l', label: 'Left Calf', state: tensionToState(calfL.tension), tension: calfL.tension, activation: tensionToActivation(calfL.activation), activationPercent: calfL.activation, description: calfL.desc };

  const calfR = computeCalf(angles.rightKnee, angles.rightAnkle);
  results['calf_r'] = { id: 'calf_r', label: 'Right Calf', state: tensionToState(calfR.tension), tension: calfR.tension, activation: tensionToActivation(calfR.activation), activationPercent: calfR.activation, description: calfR.desc };

  const shinL = computeShin(angles.leftAnkle);
  results['shin_l'] = { id: 'shin_l', label: 'Left Shin/Ankle', state: tensionToState(shinL.tension), tension: shinL.tension, activation: tensionToActivation(shinL.activation), activationPercent: shinL.activation, description: shinL.desc };

  const shinR = computeShin(angles.rightAnkle);
  results['shin_r'] = { id: 'shin_r', label: 'Right Shin/Ankle', state: tensionToState(shinR.tension), tension: shinR.tension, activation: tensionToActivation(shinR.activation), activationPercent: shinR.activation, description: shinR.desc };

  const coreData = computeCore(angles.spine, angles.pelvis);
  results['core'] = { id: 'core', label: 'Core', state: tensionToState(coreData.tension), tension: coreData.tension, activation: tensionToActivation(coreData.activation), activationPercent: coreData.activation, description: coreData.desc };

  const deltoidL = computeDeltoid(angles.leftShoulder);
  results['deltoid_l'] = { id: 'deltoid_l', label: 'Left Deltoid', state: tensionToState(deltoidL.tension), tension: deltoidL.tension, activation: tensionToActivation(deltoidL.activation), activationPercent: deltoidL.activation, description: deltoidL.desc };

  const deltoidR = computeDeltoid(angles.rightShoulder);
  results['deltoid_r'] = { id: 'deltoid_r', label: 'Right Deltoid', state: tensionToState(deltoidR.tension), tension: deltoidR.tension, activation: tensionToActivation(deltoidR.activation), activationPercent: deltoidR.activation, description: deltoidR.desc };

  const scapL = computeScapula(angles.leftShoulder, modelConfig.leftScapula);
  results['scapula_l'] = { id: 'scapula_l', label: 'Left Scapular', state: tensionToState(scapL.tension), tension: scapL.tension, activation: tensionToActivation(scapL.activation), activationPercent: scapL.activation, description: scapL.desc };

  const scapR = computeScapula(angles.rightShoulder, modelConfig.rightScapula);
  results['scapula_r'] = { id: 'scapula_r', label: 'Right Scapular', state: tensionToState(scapR.tension), tension: scapR.tension, activation: tensionToActivation(scapR.activation), activationPercent: scapR.activation, description: scapR.desc };

  const bicepL = computeBicep(angles.leftElbow, angles.leftShoulder);
  results['bicep_l'] = { id: 'bicep_l', label: 'Left Bicep', state: tensionToState(bicepL.tension), tension: bicepL.tension, activation: tensionToActivation(bicepL.activation), activationPercent: bicepL.activation, description: bicepL.desc };

  const bicepR = computeBicep(angles.rightElbow, angles.rightShoulder);
  results['bicep_r'] = { id: 'bicep_r', label: 'Right Bicep', state: tensionToState(bicepR.tension), tension: bicepR.tension, activation: tensionToActivation(bicepR.activation), activationPercent: bicepR.activation, description: bicepR.desc };

  const spineData = computeSpine(angles.spine);
  results['spine'] = { id: 'spine', label: 'Spine', state: tensionToState(spineData.tension), tension: spineData.tension, activation: tensionToActivation(spineData.activation), activationPercent: spineData.activation, description: spineData.desc };

  const neckData = computeNeck(angles.neck, angles.spine);
  results['neck'] = { id: 'neck', label: 'Neck', state: tensionToState(neckData.tension), tension: neckData.tension, activation: tensionToActivation(neckData.activation), activationPercent: neckData.activation, description: neckData.desc };

  const chestLData = computeChest(angles.leftShoulder, modelConfig.leftScapula);
  const chestRData = computeChest(angles.rightShoulder, modelConfig.rightScapula);
  const avgChestTension = (chestLData.tension + chestRData.tension) / 2;
  const avgChestActivation = (chestLData.activation + chestRData.activation) / 2;
  const chestParts = [chestLData.desc, chestRData.desc].filter(d => d !== 'neutral resting position');
  results['chest'] = { id: 'chest', label: 'Chest', state: tensionToState(avgChestTension), tension: avgChestTension, activation: tensionToActivation(avgChestActivation), activationPercent: avgChestActivation, description: chestParts.length > 0 ? chestParts[0] : 'neutral resting position' };

  return results;
}

export interface MuscleOverride {
  tensionOffset: number;
  activationOffset: number;
  isManual: boolean;
}

export function applyOverridesAndChains(
  baseStates: MuscleStatesMap,
  overrides: { [muscleId: string]: MuscleOverride },
  chainEffects: { [muscleId: string]: { totalChainTension: number; totalChainActivation: number } }
): MuscleStatesMap {
  const results: MuscleStatesMap = {};

  for (const [id, base] of Object.entries(baseStates)) {
    const override = overrides[id];
    const chain = chainEffects[id];

    let newTension = base.tension;
    let newActivation = base.activationPercent;

    if (override?.isManual) {
      newTension += override.tensionOffset;
      newActivation += override.activationOffset;
    }

    if (chain) {
      newTension += chain.totalChainTension;
      newActivation += chain.totalChainActivation;
    }

    newTension = Math.max(5, Math.min(95, newTension));
    newActivation = Math.max(0, Math.min(100, newActivation));

    const chainDescs: string[] = [];
    if (override?.isManual && override.tensionOffset !== 0) {
      chainDescs.push(`manual override (${override.tensionOffset > 0 ? '+' : ''}${Math.round(override.tensionOffset)}% tension)`);
    }
    if (chain && Math.abs(chain.totalChainTension) > 1) {
      chainDescs.push(`chain propagation (${chain.totalChainTension > 0 ? '+' : ''}${Math.round(chain.totalChainTension)}% tension)`);
    }

    const desc = chainDescs.length > 0
      ? (base.description !== 'neutral resting position' ? base.description + '; ' : '') + chainDescs.join('; ')
      : base.description;

    results[id] = {
      id,
      label: base.label,
      state: tensionToState(newTension),
      tension: newTension,
      activation: tensionToActivation(newActivation),
      activationPercent: newActivation,
      description: desc,
    };
  }

  return results;
}

export function getMuscleColor(status: MuscleStatus): { r: number; g: number; b: number } {
  const t = status.tension / 100;
  const a = status.activationPercent / 100;
  const blend = Math.max(t, a);

  if (status.state === 'shortened') {
    return {
      r: 0.3 + blend * 0.7,
      g: 0.15 + (1 - blend) * 0.2,
      b: 0.1
    };
  }

  if (status.state === 'lengthened') {
    return {
      r: 0.1 + blend * 0.15,
      g: 0.2 + (1 - blend) * 0.3,
      b: 0.4 + blend * 0.5
    };
  }

  return {
    r: 0.2 + blend * 0.15,
    g: 0.5 + (1 - blend) * 0.3,
    b: 0.2 + blend * 0.1
  };
}

export function getMuscleHexColor(status: MuscleStatus): string {
  const c = getMuscleColor(status);
  const toHex = (v: number) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export function getStateEmoji(state: MuscleState): string {
  switch (state) {
    case 'shortened': return '🔴';
    case 'lengthened': return '🔵';
    case 'neutral': return '🟢';
  }
}

export function getActivationEmoji(level: ActivationLevel): string {
  switch (level) {
    case 'high': return '⚡';
    case 'moderate': return '🔶';
    case 'low': return '◽';
    case 'inactive': return '⬜';
  }
}
