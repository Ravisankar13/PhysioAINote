interface JointAngles {
  spine?: { thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number; forwardHead?: number; lateralShift?: number };
  neck?: { flexion?: number; extension?: number; lateralFlexion?: number };
  pelvis?: { tilt?: number; obliquity?: number };
  leftHip?: { flexion?: number; abduction?: number };
  rightHip?: { flexion?: number; abduction?: number };
  leftKnee?: { flexion?: number; varus?: number };
  rightKnee?: { flexion?: number; varus?: number };
  leftAnkle?: { dorsiflexion?: number; plantarflexion?: number };
  rightAnkle?: { dorsiflexion?: number; plantarflexion?: number };
  leftShoulder?: { flexion?: number; abduction?: number };
  rightShoulder?: { flexion?: number; abduction?: number };
  leftElbow?: { flexion?: number };
  rightElbow?: { flexion?: number };
  [key: string]: any;
}

const SEGMENT_MASS_PCT: Record<string, number> = {
  head: 0.081,
  trunk: 0.497,
  upperTrunk: 0.216,
  lowerTrunk: 0.281,
  upperArm: 0.028,
  forearm: 0.016,
  hand: 0.006,
  thigh: 0.100,
  shank: 0.047,
  foot: 0.015,
};

const SEGMENT_LENGTH_RATIO: Record<string, number> = {
  head: 0.13,
  trunk: 0.30,
  upperTrunk: 0.17,
  lowerTrunk: 0.13,
  upperArm: 0.19,
  forearm: 0.15,
  hand: 0.05,
  thigh: 0.25,
  shank: 0.25,
  foot: 0.04,
};

const SEGMENT_COM_RATIO: Record<string, number> = {
  head: 0.50,
  trunk: 0.50,
  upperTrunk: 0.50,
  lowerTrunk: 0.50,
  upperArm: 0.436,
  forearm: 0.430,
  hand: 0.506,
  thigh: 0.433,
  shank: 0.433,
  foot: 0.500,
};

export interface JointForceResult {
  joint: string;
  label: string;
  forceBW: number;
  compressionBW: number;
  shearBW: number;
  status: 'low' | 'moderate' | 'high' | 'very_high';
  clinical: string;
}

export interface ForceAnalysisResult {
  joints: JointForceResult[];
  totalBodyCOM: { x: number; y: number };
  baseSupportShift: number;
}

const deg2rad = (d: number) => (d * Math.PI) / 180;

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function getStatus(bw: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (bw < 0.8) return 'low';
  if (bw < 1.5) return 'moderate';
  if (bw < 3.0) return 'high';
  return 'very_high';
}

function getClinicalNote(joint: string, bw: number): string {
  if (bw < 0.5) return 'Minimal loading';
  if (bw < 1.0) return 'Normal standing load';
  if (bw < 2.0) return 'Moderate load — typical functional range';
  if (bw < 3.0) return 'Elevated load — monitor for symptom reproduction';
  return 'High load — potential tissue stress risk';
}

export function calculatePosturalForces(config: JointAngles): ForceAnalysisResult {
  const spineFlexion = Math.abs(config.spine?.thoracicKyphosis ?? 0) + Math.abs(config.spine?.lumbarLordosis ?? 0);
  const forwardHead = Math.abs(config.spine?.forwardHead ?? 0);
  const lateralShift = Math.abs(config.spine?.lateralShift ?? 0);
  const scoliosis = Math.abs(config.spine?.scoliosis ?? 0);
  const neckFlexion = Math.abs(config.neck?.flexion ?? 0);
  const neckExtension = Math.abs(config.neck?.extension ?? 0);
  const neckLateral = Math.abs(config.neck?.lateralFlexion ?? 0);
  const pelvisTilt = config.pelvis?.tilt ?? 0;
  const pelvisObliquity = Math.abs(config.pelvis?.obliquity ?? 0);

  const lHipFlex = Math.abs(config.leftHip?.flexion ?? 0);
  const rHipFlex = Math.abs(config.rightHip?.flexion ?? 0);
  const lHipAbd = Math.abs(config.leftHip?.abduction ?? 0);
  const rHipAbd = Math.abs(config.rightHip?.abduction ?? 0);
  const lKneeFlex = Math.abs(config.leftKnee?.flexion ?? 0);
  const rKneeFlex = Math.abs(config.rightKnee?.flexion ?? 0);
  const lKneeVarus = Math.abs(config.leftKnee?.varus ?? 0);
  const rKneeVarus = Math.abs(config.rightKnee?.varus ?? 0);
  const lAnkleDF = Math.abs(config.leftAnkle?.dorsiflexion ?? 0);
  const rAnkleDF = Math.abs(config.rightAnkle?.dorsiflexion ?? 0);
  const lAnklePF = Math.abs(config.leftAnkle?.plantarflexion ?? 0);
  const rAnklePF = Math.abs(config.rightAnkle?.plantarflexion ?? 0);
  const lShoulderFlex = Math.abs(config.leftShoulder?.flexion ?? 0);
  const rShoulderFlex = Math.abs(config.rightShoulder?.flexion ?? 0);
  const lShoulderAbd = Math.abs(config.leftShoulder?.abduction ?? 0);
  const rShoulderAbd = Math.abs(config.rightShoulder?.abduction ?? 0);
  const lElbowFlex = Math.abs(config.leftElbow?.flexion ?? 0);
  const rElbowFlex = Math.abs(config.rightElbow?.flexion ?? 0);

  const aboveMassHead = SEGMENT_MASS_PCT.head;
  const aboveMassTrunk = SEGMENT_MASS_PCT.trunk;
  const aboveMassArms = (SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand) * 2;
  const aboveLumbar = aboveMassHead + aboveMassTrunk * 0.6 + aboveMassArms;
  const aboveHip = aboveMassHead + aboveMassTrunk + aboveMassArms;
  const thighMass = SEGMENT_MASS_PCT.thigh;
  const shankMass = SEGMENT_MASS_PCT.shank;
  const footMass = SEGMENT_MASS_PCT.foot;
  const legMass = thighMass + shankMass + footMass;

  const cervicalCompression = aboveMassHead * (1 + 0.015 * neckFlexion + 0.01 * neckExtension + 0.008 * forwardHead + 0.005 * neckLateral);
  const cervicalShear = aboveMassHead * (0.01 * neckFlexion + 0.005 * forwardHead);

  const trunkLeverArm = Math.sin(deg2rad(clamp(spineFlexion, 0, 90)));
  const lumbarMomentMultiplier = 1 + trunkLeverArm * 3.5;
  const lumbarLateralFactor = 1 + 0.02 * lateralShift + 0.015 * scoliosis + 0.01 * pelvisObliquity;
  const lumbarCompression = aboveLumbar * lumbarMomentMultiplier * lumbarLateralFactor;
  const lumbarShear = aboveLumbar * (Math.sin(deg2rad(clamp(spineFlexion, 0, 90))) * 0.6 + Math.abs(pelvisTilt) * 0.01);

  const hipBaseFlex = (flexAngle: number) => {
    const sinFlex = Math.sin(deg2rad(clamp(flexAngle, 0, 120)));
    return aboveHip * 0.5 * (1 + sinFlex * 2.5);
  };
  const abdFactor = (abd: number) => 1 + 0.02 * abd;
  const lHipForce = hipBaseFlex(lHipFlex) * abdFactor(lHipAbd) + thighMass * 0.5;
  const rHipForce = hipBaseFlex(rHipFlex) * abdFactor(rHipAbd) + thighMass * 0.5;
  const lHipShear = aboveHip * 0.5 * Math.sin(deg2rad(clamp(lHipFlex, 0, 120))) * 0.3;
  const rHipShear = aboveHip * 0.5 * Math.sin(deg2rad(clamp(rHipFlex, 0, 120))) * 0.3;

  const kneeBase = (hipFlex: number, kneeFlex: number) => {
    const aboveKnee = aboveHip * 0.5 + thighMass;
    const kneeFlexRad = deg2rad(clamp(kneeFlex, 0, 140));
    const patelloFemoralMultiplier = 1 + Math.sin(kneeFlexRad) * 4.0;
    const hipFlexContribution = 1 + Math.sin(deg2rad(clamp(hipFlex, 0, 120))) * 0.5;
    return aboveKnee * patelloFemoralMultiplier * hipFlexContribution * 0.5;
  };
  const varusFactor = (v: number) => 1 + 0.03 * v;
  const lKneeForce = kneeBase(lHipFlex, lKneeFlex) * varusFactor(lKneeVarus);
  const rKneeForce = kneeBase(rHipFlex, rKneeFlex) * varusFactor(rKneeVarus);
  const lKneeShear = lKneeForce * Math.sin(deg2rad(clamp(lKneeFlex, 0, 140))) * 0.15;
  const rKneeShear = rKneeForce * Math.sin(deg2rad(clamp(rKneeFlex, 0, 140))) * 0.15;

  const ankleBase = (kneeFlex: number, df: number, pf: number) => {
    const aboveAnkle = aboveHip * 0.5 + thighMass + shankMass;
    const ankleMoment = Math.max(df, pf);
    return aboveAnkle * (1 + Math.sin(deg2rad(clamp(ankleMoment, 0, 50))) * 1.5) * 0.5;
  };
  const lAnkleForce = ankleBase(lKneeFlex, lAnkleDF, lAnklePF);
  const rAnkleForce = ankleBase(rKneeFlex, rAnkleDF, rAnklePF);

  const shoulderBase = (flex: number, abd: number, elbowFlex: number) => {
    const armMass = SEGMENT_MASS_PCT.upperArm + SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand;
    const leverAngle = Math.max(flex, abd);
    const leverArm = Math.sin(deg2rad(clamp(leverAngle, 0, 180)));
    return armMass * (1 + leverArm * 5.0) + armMass * Math.sin(deg2rad(clamp(elbowFlex, 0, 150))) * 0.3;
  };
  const lShoulderForce = shoulderBase(lShoulderFlex, lShoulderAbd, lElbowFlex);
  const rShoulderForce = shoulderBase(rShoulderFlex, rShoulderAbd, rElbowFlex);

  const elbowBase = (flex: number) => {
    const forearmMass = SEGMENT_MASS_PCT.forearm + SEGMENT_MASS_PCT.hand;
    return forearmMass * (1 + Math.sin(deg2rad(clamp(flex, 0, 150))) * 3.5);
  };
  const lElbowForce = elbowBase(lElbowFlex);
  const rElbowForce = elbowBase(rElbowFlex);

  const comX = lateralShift * 0.01 + scoliosis * 0.005 + pelvisObliquity * 0.005;
  const comY = spineFlexion * 0.005 + forwardHead * 0.003 + Math.max(lHipFlex, rHipFlex) * 0.002;

  const joints: JointForceResult[] = [
    { joint: 'cervical', label: 'Cervical Spine', forceBW: cervicalCompression, compressionBW: cervicalCompression, shearBW: cervicalShear, status: getStatus(cervicalCompression), clinical: getClinicalNote('cervical', cervicalCompression) },
    { joint: 'lumbar', label: 'L4/L5 Lumbar', forceBW: lumbarCompression, compressionBW: lumbarCompression, shearBW: lumbarShear, status: getStatus(lumbarCompression), clinical: getClinicalNote('lumbar', lumbarCompression) },
    { joint: 'leftHip', label: 'Left Hip', forceBW: lHipForce, compressionBW: lHipForce, shearBW: lHipShear, status: getStatus(lHipForce), clinical: getClinicalNote('hip', lHipForce) },
    { joint: 'rightHip', label: 'Right Hip', forceBW: rHipForce, compressionBW: rHipForce, shearBW: rHipShear, status: getStatus(rHipForce), clinical: getClinicalNote('hip', rHipForce) },
    { joint: 'leftKnee', label: 'Left Knee', forceBW: lKneeForce, compressionBW: lKneeForce, shearBW: lKneeShear, status: getStatus(lKneeForce), clinical: getClinicalNote('knee', lKneeForce) },
    { joint: 'rightKnee', label: 'Right Knee', forceBW: rKneeForce, compressionBW: rKneeForce, shearBW: rKneeShear, status: getStatus(rKneeForce), clinical: getClinicalNote('knee', rKneeForce) },
    { joint: 'leftAnkle', label: 'Left Ankle', forceBW: lAnkleForce, compressionBW: lAnkleForce, shearBW: 0, status: getStatus(lAnkleForce), clinical: getClinicalNote('ankle', lAnkleForce) },
    { joint: 'rightAnkle', label: 'Right Ankle', forceBW: rAnkleForce, compressionBW: rAnkleForce, shearBW: 0, status: getStatus(rAnkleForce), clinical: getClinicalNote('ankle', rAnkleForce) },
    { joint: 'leftShoulder', label: 'Left Shoulder', forceBW: lShoulderForce, compressionBW: lShoulderForce, shearBW: 0, status: getStatus(lShoulderForce), clinical: getClinicalNote('shoulder', lShoulderForce) },
    { joint: 'rightShoulder', label: 'Right Shoulder', forceBW: rShoulderForce, compressionBW: rShoulderForce, shearBW: 0, status: getStatus(rShoulderForce), clinical: getClinicalNote('shoulder', rShoulderForce) },
    { joint: 'leftElbow', label: 'Left Elbow', forceBW: lElbowForce, compressionBW: lElbowForce, shearBW: 0, status: getStatus(lElbowForce), clinical: getClinicalNote('elbow', lElbowForce) },
    { joint: 'rightElbow', label: 'Right Elbow', forceBW: rElbowForce, compressionBW: rElbowForce, shearBW: 0, status: getStatus(rElbowForce), clinical: getClinicalNote('elbow', rElbowForce) },
  ];

  return {
    joints,
    totalBodyCOM: { x: comX, y: comY },
    baseSupportShift: Math.sqrt(comX * comX + comY * comY),
  };
}

export function forceToNewtons(bw: number, bodyWeightKg: number): number {
  return Math.round(bw * bodyWeightKg * 9.81);
}

export function getStatusColor(status: 'low' | 'moderate' | 'high' | 'very_high'): string {
  switch (status) {
    case 'low': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'high': return '#f97316';
    case 'very_high': return '#ef4444';
  }
}

export function getStatusHex(status: 'low' | 'moderate' | 'high' | 'very_high'): number {
  switch (status) {
    case 'low': return 0x22c55e;
    case 'moderate': return 0xeab308;
    case 'high': return 0xf97316;
    case 'very_high': return 0xef4444;
  }
}
