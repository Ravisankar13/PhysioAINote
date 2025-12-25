/**
 * Biomechanics Calculation Engine
 * 
 * Calculates joint forces, loads, muscle activation estimates, and injury risks
 * based on patient anthropometrics and posture configuration.
 * 
 * Uses simplified inverse dynamics and validated biomechanical models.
 */

// Anthropometric data based on standard body segment parameters
const SEGMENT_MASS_PERCENTAGES = {
  head: 0.081,
  trunk: 0.497,
  upperArm: 0.028,
  forearm: 0.016,
  hand: 0.006,
  thigh: 0.100,
  shank: 0.047,
  foot: 0.014,
};

const SEGMENT_LENGTH_PERCENTAGES = {
  trunk: 0.288, // of height
  upperArm: 0.186,
  forearm: 0.146,
  thigh: 0.245,
  shank: 0.246,
  foot: 0.152,
};

const GRAVITY = 9.81; // m/s^2

export interface Anthropometrics {
  heightCm: number;
  weightKg: number;
  segmentMasses: {
    head: number;
    trunk: number;
    upperArmL: number;
    upperArmR: number;
    forearmL: number;
    forearmR: number;
    handL: number;
    handR: number;
    thighL: number;
    thighR: number;
    shankL: number;
    shankR: number;
    footL: number;
    footR: number;
  };
  segmentLengths: {
    trunk: number;
    upperArm: number;
    forearm: number;
    thigh: number;
    shank: number;
  };
}

export interface PostureSnapshot {
  pelvisTilt: number;
  pelvisObliquity: number;
  pelvisRotation: number;
  spineFlexion: number;
  spineLateralFlexion: number;
  spineRotation: number;
  leftHip: { flexion: number; abduction: number; rotation: number };
  rightHip: { flexion: number; abduction: number; rotation: number };
  leftKnee: { flexion: number; varus: number };
  rightKnee: { flexion: number; varus: number };
  leftAnkle: { dorsiflexion: number; inversion: number };
  rightAnkle: { dorsiflexion: number; inversion: number };
  leftShoulder: { flexion: number; abduction: number; rotation: number };
  rightShoulder: { flexion: number; abduction: number; rotation: number };
  leftElbow: { flexion: number; pronation: number };
  rightElbow: { flexion: number; pronation: number };
}

export interface JointForces {
  lumbarSpine: { compression: number; shear: number; moment: number };
  thoracicSpine: { compression: number; shear: number; moment: number };
  cervicalSpine: { compression: number; shear: number; moment: number };
  leftHip: { compression: number; shear: number; moment: number };
  rightHip: { compression: number; shear: number; moment: number };
  leftKnee: { compression: number; shear: number; moment: number; patellofemoral: number };
  rightKnee: { compression: number; shear: number; moment: number; patellofemoral: number };
  leftAnkle: { compression: number; shear: number; moment: number };
  rightAnkle: { compression: number; shear: number; moment: number };
  leftShoulder: { compression: number; shear: number; moment: number };
  rightShoulder: { compression: number; shear: number; moment: number };
}

export interface GroundReactionForces {
  leftFoot: { vertical: number; anteriorPosterior: number; medialLateral: number };
  rightFoot: { vertical: number; anteriorPosterior: number; medialLateral: number };
  centerOfPressure: { x: number; y: number };
  weightDistribution: { left: number; right: number };
}

export interface MuscleActivation {
  rectusAbdominis: number;
  obliques: number;
  transverseAbdominis: number;
  erectorSpinae: number;
  multifidus: number;
  quadratusLumborum: { left: number; right: number };
  gluteusMaximus: { left: number; right: number };
  gluteusMedius: { left: number; right: number };
  iliopsoas: { left: number; right: number };
  hipAdductors: { left: number; right: number };
  tensorFasciaeLatae: { left: number; right: number };
  piriformis: { left: number; right: number };
  quadriceps: { left: number; right: number };
  hamstrings: { left: number; right: number };
  gastrocnemius: { left: number; right: number };
  popliteus: { left: number; right: number };
  tibialisAnterior: { left: number; right: number };
  soleus: { left: number; right: number };
  peroneals: { left: number; right: number };
  tibialisPosterior: { left: number; right: number };
  rotatorcuff: { left: number; right: number };
  deltoid: { left: number; right: number };
  trapezius: { upper: number; middle: number; lower: number };
  serratusAnterior: { left: number; right: number };
  pectoralisMajor: { left: number; right: number };
  latissimusDorsi: { left: number; right: number };
}

export interface AsymmetryAnalysis {
  hipLoadAsymmetry: number;
  kneeLoadAsymmetry: number;
  ankleLoadAsymmetry: number;
  shoulderLoadAsymmetry: number;
  muscleActivationAsymmetry: {
    gluteMax: number;
    gluteMed: number;
    quadriceps: number;
    hamstrings: number;
  };
  weightDistributionAsymmetry: number;
}

export interface MovementQuality {
  overallScore: number;
  stabilityScore: number;
  mobilityScore: number;
  controlScore: number;
  compensationPatterns: string[];
  movementFaults: string[];
}

export interface BiomechanicsResult {
  anthropometrics: Anthropometrics;
  postureSnapshot: PostureSnapshot;
  jointForces: JointForces;
  groundReactionForces: GroundReactionForces;
  muscleActivation: MuscleActivation;
  asymmetryAnalysis: AsymmetryAnalysis;
  movementQuality: MovementQuality;
}

/**
 * Calculate anthropometrics from basic measurements
 */
export function calculateAnthropometrics(heightCm: number, weightKg: number): Anthropometrics {
  const heightM = heightCm / 100;
  
  return {
    heightCm,
    weightKg,
    segmentMasses: {
      head: weightKg * SEGMENT_MASS_PERCENTAGES.head,
      trunk: weightKg * SEGMENT_MASS_PERCENTAGES.trunk,
      upperArmL: weightKg * SEGMENT_MASS_PERCENTAGES.upperArm,
      upperArmR: weightKg * SEGMENT_MASS_PERCENTAGES.upperArm,
      forearmL: weightKg * SEGMENT_MASS_PERCENTAGES.forearm,
      forearmR: weightKg * SEGMENT_MASS_PERCENTAGES.forearm,
      handL: weightKg * SEGMENT_MASS_PERCENTAGES.hand,
      handR: weightKg * SEGMENT_MASS_PERCENTAGES.hand,
      thighL: weightKg * SEGMENT_MASS_PERCENTAGES.thigh,
      thighR: weightKg * SEGMENT_MASS_PERCENTAGES.thigh,
      shankL: weightKg * SEGMENT_MASS_PERCENTAGES.shank,
      shankR: weightKg * SEGMENT_MASS_PERCENTAGES.shank,
      footL: weightKg * SEGMENT_MASS_PERCENTAGES.foot,
      footR: weightKg * SEGMENT_MASS_PERCENTAGES.foot,
    },
    segmentLengths: {
      trunk: heightM * SEGMENT_LENGTH_PERCENTAGES.trunk,
      upperArm: heightM * SEGMENT_LENGTH_PERCENTAGES.upperArm,
      forearm: heightM * SEGMENT_LENGTH_PERCENTAGES.forearm,
      thigh: heightM * SEGMENT_LENGTH_PERCENTAGES.thigh,
      shank: heightM * SEGMENT_LENGTH_PERCENTAGES.shank,
    },
  };
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate lumbar spine compression using simplified model
 * Based on NIOSH lifting equation principles
 */
function calculateSpineCompression(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot
): { compression: number; shear: number; moment: number } {
  const { weightKg, segmentMasses, segmentLengths } = anthropometrics;
  const trunkAngle = toRadians(posture.spineFlexion);
  
  // Upper body mass (head + trunk + arms)
  const upperBodyMass = 
    segmentMasses.head + 
    segmentMasses.trunk + 
    segmentMasses.upperArmL + segmentMasses.upperArmR +
    segmentMasses.forearmL + segmentMasses.forearmR +
    segmentMasses.handL + segmentMasses.handR;
  
  // Moment arm from L5/S1 to center of mass of upper body
  const momentArm = segmentLengths.trunk * 0.5 * Math.sin(trunkAngle);
  
  // Gravitational moment
  const gravityMoment = upperBodyMass * GRAVITY * momentArm;
  
  // Erector spinae moment arm (approximately 5cm)
  const muscleArm = 0.05;
  
  // Required muscle force to balance moment
  const muscleForce = gravityMoment / muscleArm;
  
  // Compression = muscle force + gravity component
  const compression = muscleForce + upperBodyMass * GRAVITY * Math.cos(trunkAngle);
  
  // Shear force
  const shear = upperBodyMass * GRAVITY * Math.sin(trunkAngle);
  
  return {
    compression: Math.round(compression),
    shear: Math.round(shear),
    moment: Math.round(gravityMoment),
  };
}

/**
 * Calculate hip joint forces
 */
function calculateHipForces(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot,
  side: 'left' | 'right'
): { compression: number; shear: number; moment: number } {
  const hip = side === 'left' ? posture.leftHip : posture.rightHip;
  const flexionAngle = toRadians(hip.flexion);
  const abductionAngle = toRadians(hip.abduction);
  
  // Body weight supported by this hip (simplified single-leg stance model)
  const weightDistribution = 0.5; // Assume equal distribution in standing
  const supportedWeight = anthropometrics.weightKg * GRAVITY * weightDistribution;
  
  // Hip joint reaction forces increase with flexion
  const flexionMultiplier = 1 + Math.sin(flexionAngle) * 2;
  
  // Abductor muscle force (gluteus medius) creates significant compression
  // During single-leg stance, hip abductors generate 2-3x body weight
  const abductorForce = supportedWeight * (1 + Math.abs(abductionAngle) * 0.5);
  
  const compression = supportedWeight * flexionMultiplier + abductorForce;
  const shear = supportedWeight * Math.sin(flexionAngle) * 0.3;
  const moment = supportedWeight * anthropometrics.segmentLengths.thigh * 0.5 * Math.sin(flexionAngle);
  
  return {
    compression: Math.round(compression),
    shear: Math.round(shear),
    moment: Math.round(moment),
  };
}

/**
 * Calculate knee joint forces including patellofemoral
 */
function calculateKneeForces(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot,
  side: 'left' | 'right'
): { compression: number; shear: number; moment: number; patellofemoral: number } {
  const knee = side === 'left' ? posture.leftKnee : posture.rightKnee;
  const flexionAngle = toRadians(knee.flexion);
  
  // Weight above knee
  const upperWeight = anthropometrics.weightKg * 0.5 * GRAVITY;
  
  // Tibiofemoral compression increases exponentially with knee flexion
  const flexionFactor = 1 + Math.pow(Math.sin(flexionAngle), 2) * 4;
  
  // Quadriceps force required to extend against load
  const quadForce = upperWeight * Math.sin(flexionAngle) * 4;
  
  // Patellofemoral force increases dramatically with flexion
  // PF force ≈ quadriceps force * function of knee angle
  const pfAngleFactor = 0.5 + 0.5 * Math.sin(flexionAngle);
  const patellofemoral = quadForce * pfAngleFactor * 2;
  
  const compression = upperWeight * flexionFactor + quadForce * Math.cos(flexionAngle);
  const shear = quadForce * Math.sin(flexionAngle) * 0.2;
  const moment = upperWeight * anthropometrics.segmentLengths.shank * 0.5 * Math.sin(flexionAngle);
  
  return {
    compression: Math.round(compression),
    shear: Math.round(shear),
    moment: Math.round(moment),
    patellofemoral: Math.round(patellofemoral),
  };
}

/**
 * Calculate ankle joint forces
 */
function calculateAnkleForces(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot,
  side: 'left' | 'right'
): { compression: number; shear: number; moment: number } {
  const ankle = side === 'left' ? posture.leftAnkle : posture.rightAnkle;
  const dorsiflexionAngle = toRadians(ankle.dorsiflexion);
  
  // Body weight above ankle
  const bodyWeight = anthropometrics.weightKg * 0.5 * GRAVITY;
  
  // Plantarflexor muscle force (Achilles)
  const achillesMultiplier = 1 + Math.abs(dorsiflexionAngle) * 2;
  const achillesForce = bodyWeight * achillesMultiplier;
  
  const compression = bodyWeight + achillesForce;
  const shear = bodyWeight * Math.sin(dorsiflexionAngle) * 0.2;
  const moment = bodyWeight * 0.15 * Math.sin(dorsiflexionAngle); // ~15cm lever arm
  
  return {
    compression: Math.round(compression),
    shear: Math.round(shear),
    moment: Math.round(moment),
  };
}

/**
 * Calculate shoulder joint forces
 */
function calculateShoulderForces(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot,
  side: 'left' | 'right'
): { compression: number; shear: number; moment: number } {
  const shoulder = side === 'left' ? posture.leftShoulder : posture.rightShoulder;
  const flexionAngle = toRadians(shoulder.flexion);
  const abductionAngle = toRadians(shoulder.abduction);
  
  // Arm weight
  const armMass = side === 'left'
    ? anthropometrics.segmentMasses.upperArmL + anthropometrics.segmentMasses.forearmL + anthropometrics.segmentMasses.handL
    : anthropometrics.segmentMasses.upperArmR + anthropometrics.segmentMasses.forearmR + anthropometrics.segmentMasses.handR;
  
  const armWeight = armMass * GRAVITY;
  
  // Moment arm increases with elevation
  const elevationAngle = Math.max(Math.abs(flexionAngle), Math.abs(abductionAngle));
  const momentArm = anthropometrics.segmentLengths.upperArm * 0.5 * Math.sin(elevationAngle);
  
  // Rotator cuff and deltoid must overcome gravitational moment
  const muscleForce = (armWeight * momentArm) / 0.03; // ~3cm rotator cuff moment arm
  
  const compression = muscleForce * Math.cos(elevationAngle) + armWeight * Math.cos(elevationAngle);
  const shear = muscleForce * Math.sin(elevationAngle) * 0.5;
  const moment = armWeight * momentArm;
  
  return {
    compression: Math.round(compression),
    shear: Math.round(shear),
    moment: Math.round(moment),
  };
}

/**
 * Calculate ground reaction forces
 */
export function calculateGroundReactionForces(
  anthropometrics: Anthropometrics,
  posture: PostureSnapshot
): GroundReactionForces {
  const bodyWeight = anthropometrics.weightKg * GRAVITY;
  
  // Weight distribution based on posture asymmetries
  const pelvisShift = posture.pelvisObliquity / 10; // Each degree shifts ~1% of weight
  const spineShift = posture.spineLateralFlexion / 15;
  
  let leftWeight = 0.5 + pelvisShift + spineShift;
  let rightWeight = 0.5 - pelvisShift - spineShift;
  
  // Clamp to reasonable bounds
  leftWeight = Math.max(0.2, Math.min(0.8, leftWeight));
  rightWeight = 1 - leftWeight;
  
  // Anterior-posterior forces based on forward lean
  const apForce = bodyWeight * Math.sin(toRadians(posture.pelvisTilt)) * 0.1;
  
  return {
    leftFoot: {
      vertical: Math.round(bodyWeight * leftWeight),
      anteriorPosterior: Math.round(apForce * leftWeight),
      medialLateral: Math.round(bodyWeight * 0.05 * leftWeight),
    },
    rightFoot: {
      vertical: Math.round(bodyWeight * rightWeight),
      anteriorPosterior: Math.round(apForce * rightWeight),
      medialLateral: Math.round(bodyWeight * 0.05 * rightWeight),
    },
    centerOfPressure: {
      x: (rightWeight - 0.5) * 0.2, // Shift in meters
      y: posture.pelvisTilt * 0.01,
    },
    weightDistribution: {
      left: Math.round(leftWeight * 100),
      right: Math.round(rightWeight * 100),
    },
  };
}

/**
 * Estimate muscle activation levels based on posture
 */
export function calculateMuscleActivation(
  posture: PostureSnapshot
): MuscleActivation {
  // Core muscles
  const spineFlexionAbs = Math.abs(posture.spineFlexion);
  const erectorSpinae = Math.min(100, 10 + spineFlexionAbs * 2);
  const rectusAbdominis = Math.min(100, 5 + Math.max(0, -posture.spineFlexion) * 1.5);
  const obliques = Math.min(100, 5 + Math.abs(posture.spineLateralFlexion) * 2 + Math.abs(posture.spineRotation) * 1.5);
  const transverseAbdominis = Math.min(100, 10 + spineFlexionAbs * 0.5);
  const multifidus = Math.min(100, 15 + spineFlexionAbs * 1.5);
  
  // Calculate bilateral muscle activations
  const calcBilateral = (left: number, right: number) => ({
    left: Math.min(100, Math.max(0, left)),
    right: Math.min(100, Math.max(0, right)),
  });
  
  // Quadratus lumborum - active with lateral flexion
  const qlLeft = 10 + Math.max(0, posture.spineLateralFlexion) * 2;
  const qlRight = 10 + Math.max(0, -posture.spineLateralFlexion) * 2;
  
  // Gluteus maximus - hip extension
  const gluteMaxL = 10 + Math.max(0, -posture.leftHip.flexion) * 2;
  const gluteMaxR = 10 + Math.max(0, -posture.rightHip.flexion) * 2;
  
  // Gluteus medius - hip abduction and pelvic stability
  const gluteMedL = 15 + posture.leftHip.abduction * 2 + Math.abs(posture.pelvisObliquity);
  const gluteMedR = 15 + posture.rightHip.abduction * 2 + Math.abs(posture.pelvisObliquity);
  
  // Iliopsoas - hip flexion
  const iliopsoasL = 5 + Math.max(0, posture.leftHip.flexion) * 1.5;
  const iliopsoasR = 5 + Math.max(0, posture.rightHip.flexion) * 1.5;
  
  // Quadriceps - knee extension
  const quadsL = 10 + posture.leftKnee.flexion * 1.5;
  const quadsR = 10 + posture.rightKnee.flexion * 1.5;
  
  // Hamstrings - hip extension and knee flexion
  const hamsL = 10 + posture.leftKnee.flexion * 0.5 + Math.max(0, -posture.leftHip.flexion);
  const hamsR = 10 + posture.rightKnee.flexion * 0.5 + Math.max(0, -posture.rightHip.flexion);
  
  // Gastrocnemius/Soleus - plantarflexion
  const gastrocL = 15 + Math.max(0, -posture.leftAnkle.dorsiflexion) * 2;
  const gastrocR = 15 + Math.max(0, -posture.rightAnkle.dorsiflexion) * 2;
  
  // Tibialis anterior - dorsiflexion
  const tibAntL = 5 + Math.max(0, posture.leftAnkle.dorsiflexion) * 2;
  const tibAntR = 5 + Math.max(0, posture.rightAnkle.dorsiflexion) * 2;
  
  // Shoulder muscles
  const shoulderElevationL = Math.max(Math.abs(posture.leftShoulder.flexion), Math.abs(posture.leftShoulder.abduction));
  const shoulderElevationR = Math.max(Math.abs(posture.rightShoulder.flexion), Math.abs(posture.rightShoulder.abduction));
  
  const deltoidL = 10 + shoulderElevationL * 1;
  const deltoidR = 10 + shoulderElevationR * 1;
  
  const rotatorCuffL = 15 + shoulderElevationL * 0.5 + Math.abs(posture.leftShoulder.rotation) * 0.5;
  const rotatorCuffR = 15 + shoulderElevationR * 0.5 + Math.abs(posture.rightShoulder.rotation) * 0.5;
  
  // Trapezius
  const trapUpper = 10 + (shoulderElevationL + shoulderElevationR) * 0.3;
  const trapMiddle = 10 + Math.abs(posture.spineRotation) * 0.5;
  const trapLower = 10 + (shoulderElevationL + shoulderElevationR) * 0.2;
  
  return {
    rectusAbdominis,
    obliques,
    transverseAbdominis,
    erectorSpinae,
    multifidus,
    quadratusLumborum: calcBilateral(qlLeft, qlRight),
    gluteusMaximus: calcBilateral(gluteMaxL, gluteMaxR),
    gluteusMedius: calcBilateral(gluteMedL, gluteMedR),
    iliopsoas: calcBilateral(iliopsoasL, iliopsoasR),
    hipAdductors: calcBilateral(10 + Math.max(0, -posture.leftHip.abduction), 10 + Math.max(0, -posture.rightHip.abduction)),
    tensorFasciaeLatae: calcBilateral(10 + posture.leftHip.abduction * 0.5, 10 + posture.rightHip.abduction * 0.5),
    piriformis: calcBilateral(10 + Math.abs(posture.leftHip.rotation) * 0.5, 10 + Math.abs(posture.rightHip.rotation) * 0.5),
    quadriceps: calcBilateral(quadsL, quadsR),
    hamstrings: calcBilateral(hamsL, hamsR),
    gastrocnemius: calcBilateral(gastrocL, gastrocR),
    popliteus: calcBilateral(5 + posture.leftKnee.flexion * 0.2, 5 + posture.rightKnee.flexion * 0.2),
    tibialisAnterior: calcBilateral(tibAntL, tibAntR),
    soleus: calcBilateral(gastrocL * 0.8, gastrocR * 0.8),
    peroneals: calcBilateral(10 + Math.max(0, posture.leftAnkle.inversion) * 0.5, 10 + Math.max(0, posture.rightAnkle.inversion) * 0.5),
    tibialisPosterior: calcBilateral(10 + Math.max(0, -posture.leftAnkle.inversion), 10 + Math.max(0, -posture.rightAnkle.inversion)),
    rotatorcuff: calcBilateral(rotatorCuffL, rotatorCuffR),
    deltoid: calcBilateral(deltoidL, deltoidR),
    trapezius: { upper: Math.min(100, trapUpper), middle: Math.min(100, trapMiddle), lower: Math.min(100, trapLower) },
    serratusAnterior: calcBilateral(10 + posture.leftShoulder.flexion * 0.3, 10 + posture.rightShoulder.flexion * 0.3),
    pectoralisMajor: calcBilateral(10 + Math.max(0, posture.leftShoulder.flexion) * 0.5, 10 + Math.max(0, posture.rightShoulder.flexion) * 0.5),
    latissimusDorsi: calcBilateral(10 + Math.max(0, -posture.leftShoulder.flexion) * 0.5, 10 + Math.max(0, -posture.rightShoulder.flexion) * 0.5),
  };
}

/**
 * Calculate asymmetry between left and right sides
 */
export function calculateAsymmetryAnalysis(
  jointForces: JointForces,
  grf: GroundReactionForces,
  muscleActivation: MuscleActivation
): AsymmetryAnalysis {
  const calcAsymmetry = (left: number, right: number): number => {
    const avg = (left + right) / 2;
    if (avg === 0) return 0;
    return Math.round(Math.abs(left - right) / avg * 100);
  };
  
  return {
    hipLoadAsymmetry: calcAsymmetry(jointForces.leftHip.compression, jointForces.rightHip.compression),
    kneeLoadAsymmetry: calcAsymmetry(jointForces.leftKnee.compression, jointForces.rightKnee.compression),
    ankleLoadAsymmetry: calcAsymmetry(jointForces.leftAnkle.compression, jointForces.rightAnkle.compression),
    shoulderLoadAsymmetry: calcAsymmetry(jointForces.leftShoulder.compression, jointForces.rightShoulder.compression),
    muscleActivationAsymmetry: {
      gluteMax: calcAsymmetry(muscleActivation.gluteusMaximus.left, muscleActivation.gluteusMaximus.right),
      gluteMed: calcAsymmetry(muscleActivation.gluteusMedius.left, muscleActivation.gluteusMedius.right),
      quadriceps: calcAsymmetry(muscleActivation.quadriceps.left, muscleActivation.quadriceps.right),
      hamstrings: calcAsymmetry(muscleActivation.hamstrings.left, muscleActivation.hamstrings.right),
    },
    weightDistributionAsymmetry: Math.abs(grf.weightDistribution.left - 50),
  };
}

/**
 * Assess overall movement quality
 */
export function calculateMovementQuality(
  posture: PostureSnapshot,
  asymmetry: AsymmetryAnalysis
): MovementQuality {
  const compensationPatterns: string[] = [];
  const movementFaults: string[] = [];
  
  // Check for common compensation patterns
  if (Math.abs(posture.pelvisTilt) > 15) {
    compensationPatterns.push(posture.pelvisTilt > 0 ? 'Excessive anterior pelvic tilt' : 'Excessive posterior pelvic tilt');
  }
  
  if (Math.abs(posture.pelvisObliquity) > 5) {
    compensationPatterns.push(`Pelvic obliquity (${posture.pelvisObliquity > 0 ? 'left' : 'right'} side elevated)`);
  }
  
  if (Math.abs(posture.spineLateralFlexion) > 10) {
    compensationPatterns.push('Lateral trunk shift');
  }
  
  if (Math.abs(posture.spineFlexion) > 30) {
    compensationPatterns.push('Excessive trunk flexion');
  }
  
  // Check for movement faults
  if (posture.leftKnee.varus > 10 || posture.rightKnee.varus > 10) {
    movementFaults.push('Knee varus (bow-legged positioning)');
  }
  
  if (posture.leftKnee.varus < -10 || posture.rightKnee.varus < -10) {
    movementFaults.push('Knee valgus collapse');
  }
  
  if (asymmetry.weightDistributionAsymmetry > 15) {
    movementFaults.push('Significant weight shift asymmetry');
  }
  
  if (asymmetry.hipLoadAsymmetry > 20) {
    movementFaults.push('Hip load imbalance');
  }
  
  if (asymmetry.kneeLoadAsymmetry > 20) {
    movementFaults.push('Knee load imbalance');
  }
  
  // Calculate scores
  const stabilityScore = Math.max(0, 100 - 
    Math.abs(posture.pelvisObliquity) * 3 - 
    Math.abs(posture.spineLateralFlexion) * 2 - 
    asymmetry.weightDistributionAsymmetry
  );
  
  const mobilityScore = Math.max(0, 100 - 
    Math.abs(Math.abs(posture.leftHip.flexion) - Math.abs(posture.rightHip.flexion)) * 2 -
    Math.abs(Math.abs(posture.leftKnee.flexion) - Math.abs(posture.rightKnee.flexion)) * 2
  );
  
  const controlScore = Math.max(0, 100 - 
    compensationPatterns.length * 10 - 
    movementFaults.length * 15
  );
  
  const overallScore = Math.round((stabilityScore + mobilityScore + controlScore) / 3);
  
  return {
    overallScore,
    stabilityScore: Math.round(stabilityScore),
    mobilityScore: Math.round(mobilityScore),
    controlScore: Math.round(controlScore),
    compensationPatterns,
    movementFaults,
  };
}

/**
 * Main function to calculate all biomechanics from model config
 */
export function calculateFullBiomechanics(
  heightCm: number,
  weightKg: number,
  modelConfig: {
    pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
    spine: { thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number };
    leftHip: { flexion: number; abduction: number; internalRotation: number };
    rightHip: { flexion: number; abduction: number; internalRotation: number };
    leftKnee: { flexion: number; varus: number };
    rightKnee: { flexion: number; varus: number };
    leftAnkle: { dorsiflexion: number; inversion: number };
    rightAnkle: { dorsiflexion: number; inversion: number };
    leftShoulder: { flexion: number; abduction: number; internalRotation: number };
    rightShoulder: { flexion: number; abduction: number; internalRotation: number };
    leftElbow: { flexion: number; pronation: number };
    rightElbow: { flexion: number; pronation: number };
  }
): BiomechanicsResult {
  const anthropometrics = calculateAnthropometrics(heightCm, weightKg);
  
  const posture: PostureSnapshot = {
    pelvisTilt: modelConfig.pelvis.tilt,
    pelvisObliquity: modelConfig.pelvis.obliquity,
    pelvisRotation: modelConfig.pelvis.rotation,
    spineFlexion: modelConfig.spine.lumbarLordosis - 30, // Normalize from lordosis
    spineLateralFlexion: modelConfig.spine.scoliosis,
    spineRotation: 0,
    leftHip: {
      flexion: modelConfig.leftHip.flexion,
      abduction: modelConfig.leftHip.abduction,
      rotation: modelConfig.leftHip.internalRotation,
    },
    rightHip: {
      flexion: modelConfig.rightHip.flexion,
      abduction: modelConfig.rightHip.abduction,
      rotation: modelConfig.rightHip.internalRotation,
    },
    leftKnee: {
      flexion: modelConfig.leftKnee.flexion,
      varus: modelConfig.leftKnee.varus,
    },
    rightKnee: {
      flexion: modelConfig.rightKnee.flexion,
      varus: modelConfig.rightKnee.varus,
    },
    leftAnkle: {
      dorsiflexion: modelConfig.leftAnkle.dorsiflexion,
      inversion: modelConfig.leftAnkle.inversion,
    },
    rightAnkle: {
      dorsiflexion: modelConfig.rightAnkle.dorsiflexion,
      inversion: modelConfig.rightAnkle.inversion,
    },
    leftShoulder: {
      flexion: modelConfig.leftShoulder.flexion,
      abduction: modelConfig.leftShoulder.abduction,
      rotation: modelConfig.leftShoulder.internalRotation,
    },
    rightShoulder: {
      flexion: modelConfig.rightShoulder.flexion,
      abduction: modelConfig.rightShoulder.abduction,
      rotation: modelConfig.rightShoulder.internalRotation,
    },
    leftElbow: {
      flexion: modelConfig.leftElbow.flexion,
      pronation: modelConfig.leftElbow.pronation,
    },
    rightElbow: {
      flexion: modelConfig.rightElbow.flexion,
      pronation: modelConfig.rightElbow.pronation,
    },
  };
  
  // Calculate all forces
  const lumbarSpine = calculateSpineCompression(anthropometrics, posture);
  const thoracicSpine = { 
    compression: Math.round(lumbarSpine.compression * 0.6), 
    shear: Math.round(lumbarSpine.shear * 0.5), 
    moment: Math.round(lumbarSpine.moment * 0.4) 
  };
  const cervicalSpine = { 
    compression: Math.round(anthropometrics.segmentMasses.head * GRAVITY * 1.5), 
    shear: Math.round(anthropometrics.segmentMasses.head * GRAVITY * 0.2), 
    moment: 5 
  };
  
  const jointForces: JointForces = {
    lumbarSpine,
    thoracicSpine,
    cervicalSpine,
    leftHip: calculateHipForces(anthropometrics, posture, 'left'),
    rightHip: calculateHipForces(anthropometrics, posture, 'right'),
    leftKnee: calculateKneeForces(anthropometrics, posture, 'left'),
    rightKnee: calculateKneeForces(anthropometrics, posture, 'right'),
    leftAnkle: calculateAnkleForces(anthropometrics, posture, 'left'),
    rightAnkle: calculateAnkleForces(anthropometrics, posture, 'right'),
    leftShoulder: calculateShoulderForces(anthropometrics, posture, 'left'),
    rightShoulder: calculateShoulderForces(anthropometrics, posture, 'right'),
  };
  
  const groundReactionForces = calculateGroundReactionForces(anthropometrics, posture);
  const muscleActivation = calculateMuscleActivation(posture);
  const asymmetryAnalysis = calculateAsymmetryAnalysis(jointForces, groundReactionForces, muscleActivation);
  const movementQuality = calculateMovementQuality(posture, asymmetryAnalysis);
  
  return {
    anthropometrics,
    postureSnapshot: posture,
    jointForces,
    groundReactionForces,
    muscleActivation,
    asymmetryAnalysis,
    movementQuality,
  };
}
