import { NormalizedLandmark } from '@mediapipe/pose';

// Types for specialized movement analysis
export interface GaitCyclePhase {
  phase: 'stance' | 'swing';
  percentage: number;
  subPhase?: 'initial_contact' | 'loading_response' | 'mid_stance' | 'terminal_stance' | 'pre_swing' | 'initial_swing' | 'mid_swing' | 'terminal_swing';
}

export interface GaitMetrics {
  cadence: number; // steps per minute
  strideLength: number; // normalized to leg length
  stepLength: { left: number; right: number };
  stepWidth: number;
  stancePhasePercent: number;
  swingPhasePercent: number;
  toeOutAngle: { left: number; right: number };
  trunkLean: { frontal: number; sagittal: number };
  pelvicDrop: number;
  hipFlexionExtension: { flexion: number; extension: number };
  kneeFlexionAtContact: number;
  ankleDorsiflexion: number;
  armSwingSymmetry: number;
  deviations: string[];
}

export interface RunningGaitMetrics extends GaitMetrics {
  verticalOscillation: number;
  groundContactTime: number;
  flightTime: number;
  strikePattern: 'heel' | 'midfoot' | 'forefoot';
  overstride: boolean;
  kneeFlexionAtContact: number;
  hipExtensionAtToeOff: number;
  cadenceOptimal: boolean;
  crossoverGait: boolean;
  excessiveKneeValgus: boolean;
}

export interface StepAnalysisMetrics {
  movementStrategy: 'hip_dominant' | 'knee_dominant' | 'balanced';
  trunkLean: number;
  kneeValgusAngle: number;
  pelvicDrop: number;
  weightTransferTime: number;
  smoothnessScore: number;
  compensations: string[];
}

export interface SquatAnalysisMetrics {
  depth: number; // degrees of knee flexion
  depthCategory: 'full' | 'parallel' | 'partial' | 'insufficient';
  kneeValgusAngle: { left: number; right: number };
  kneeOverToe: { left: boolean; right: boolean };
  hipShift: number; // lateral shift in cm
  trunkLean: { frontal: number; sagittal: number };
  pelvicTilt: number;
  spineNeutral: boolean;
  buttWink: boolean;
  heelRise: { left: boolean; right: boolean };
  symmetryScore: number;
  qualityScore: number;
}

export interface ShoulderFlexionMetrics {
  maxFlexionAngle: { left: number; right: number };
  scapuloHumeralRhythm: { left: number; right: number };
  scapularDyskinesis: {
    left: { present: boolean; type: 'I' | 'II' | 'III' | 'IV' | null };
    right: { present: boolean; type: 'I' | 'II' | 'III' | 'IV' | null };
  };
  winging: { left: boolean; right: boolean };
  earlyElevation: { left: boolean; right: boolean };
  painfulArc: { left: boolean; right: boolean };
  asymmetry: number;
  compensations: string[];
}

export interface MovementTestResult {
  testType: string;
  timestamp: number;
  metrics: any;
  score: number;
  risk: 'low' | 'moderate' | 'high';
  recommendations: string[];
  videoTimestamps?: { event: string; time: number }[];
}

// Helper functions for common calculations
function calculateDistance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
}

function calculateAngle(p1: NormalizedLandmark, p2: NormalizedLandmark, p3: NormalizedLandmark): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
  
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  const angle = Math.acos(dot / (mag1 * mag2));
  return angle * (180 / Math.PI);
}

// Walking Gait Analysis
export function analyzeWalkingGait(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): GaitMetrics {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftHeel = landmarks[29];
  const rightHeel = landmarks[30];
  const leftToe = landmarks[31];
  const rightToe = landmarks[32];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Calculate leg length for normalization
  const leftLegLength = calculateDistance(leftHip, leftKnee) + calculateDistance(leftKnee, leftAnkle);
  const rightLegLength = calculateDistance(rightHip, rightKnee) + calculateDistance(rightKnee, rightAnkle);
  const avgLegLength = (leftLegLength + rightLegLength) / 2;

  // Stride and step calculations
  const strideLength = calculateDistance(leftAnkle, rightAnkle) / avgLegLength;
  const stepWidth = Math.abs(leftAnkle.x - rightAnkle.x) * 100; // in cm estimate

  // Calculate angles
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);

  // Toe out angle
  const leftToeOut = Math.atan2(leftToe.x - leftHeel.x, leftToe.z - leftHeel.z) * (180 / Math.PI);
  const rightToeOut = Math.atan2(rightToe.x - rightHeel.x, rightToe.z - rightHeel.z) * (180 / Math.PI);

  // Trunk lean
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };
  const trunkLeanFrontal = Math.atan2(midShoulder.x - midHip.x, midShoulder.y - midHip.y) * (180 / Math.PI);
  const trunkLeanSagittal = Math.atan2(midShoulder.z - midHip.z, midShoulder.y - midHip.y) * (180 / Math.PI);

  // Pelvic drop (Trendelenburg)
  const pelvicDrop = Math.abs(leftHip.y - rightHip.y) * 100; // in cm estimate

  // Detect deviations
  const deviations: string[] = [];
  if (pelvicDrop > 2) deviations.push('Trendelenburg gait detected');
  if (stepWidth > 20) deviations.push('Wide base gait');
  if (stepWidth < 5) deviations.push('Narrow base gait');
  if (Math.abs(trunkLeanFrontal) > 5) deviations.push('Excessive lateral trunk lean');
  if (leftKneeAngle < 160 || rightKneeAngle < 160) deviations.push('Reduced knee extension');
  if (Math.abs(leftToeOut) > 15 || Math.abs(rightToeOut) > 15) deviations.push('Excessive toe out');

  // Estimate cadence from frame analysis
  const cadence = previousFrames.length > 30 ? estimateCadence(previousFrames) : 100;

  // Arm swing symmetry
  const leftArmSwing = calculateDistance(landmarks[11], landmarks[15]); // shoulder to wrist
  const rightArmSwing = calculateDistance(landmarks[12], landmarks[16]);
  const armSwingSymmetry = Math.min(leftArmSwing, rightArmSwing) / Math.max(leftArmSwing, rightArmSwing) * 100;

  return {
    cadence,
    strideLength,
    stepLength: { left: strideLength / 2, right: strideLength / 2 },
    stepWidth,
    stancePhasePercent: 60, // Default, needs temporal analysis
    swingPhasePercent: 40,
    toeOutAngle: { left: leftToeOut, right: rightToeOut },
    trunkLean: { frontal: trunkLeanFrontal, sagittal: trunkLeanSagittal },
    pelvicDrop,
    hipFlexionExtension: { 
      flexion: Math.max(180 - leftHipAngle, 180 - rightHipAngle),
      extension: Math.min(180 - leftHipAngle, 180 - rightHipAngle)
    },
    kneeFlexionAtContact: Math.min(180 - leftKneeAngle, 180 - rightKneeAngle),
    ankleDorsiflexion: 10, // Needs more complex calculation
    armSwingSymmetry,
    deviations
  };
}

// Running Gait Analysis
export function analyzeRunningGait(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): RunningGaitMetrics {
  // Get base walking metrics first
  const baseMetrics = analyzeWalkingGait(landmarks, previousFrames);
  
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftHeel = landmarks[29];
  const rightHeel = landmarks[30];
  const leftToe = landmarks[31];
  const rightToe = landmarks[32];

  // Vertical oscillation
  const midHip = {
    y: (leftHip.y + rightHip.y) / 2
  };
  const verticalOscillation = previousFrames.length > 10 
    ? calculateVerticalOscillation(previousFrames) 
    : 8; // cm

  // Strike pattern detection
  const strikePattern = detectStrikePattern(leftHeel, leftToe, rightHeel, rightToe, leftAnkle, rightAnkle);

  // Overstride detection
  const overstride = detectOverstride(landmarks);

  // Knee valgus detection
  const leftKneeValgus = calculateKneeValgus(leftHip, leftKnee, leftAnkle);
  const rightKneeValgus = calculateKneeValgus(rightHip, rightKnee, rightAnkle);
  const excessiveKneeValgus = leftKneeValgus > 10 || rightKneeValgus > 10;

  // Crossover gait detection
  const crossoverGait = baseMetrics.stepWidth < 2;

  // Hip extension at toe-off
  const hipExtensionAtToeOff = calculateHipExtension(landmarks);

  return {
    ...baseMetrics,
    verticalOscillation,
    groundContactTime: 250, // ms - needs temporal analysis
    flightTime: 100, // ms - needs temporal analysis
    strikePattern,
    overstride,
    kneeFlexionAtContact: baseMetrics.kneeFlexionAtContact,
    hipExtensionAtToeOff,
    cadenceOptimal: baseMetrics.cadence >= 170 && baseMetrics.cadence <= 180,
    crossoverGait,
    excessiveKneeValgus
  };
}

// Step Up Analysis
export function analyzeStepUp(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): StepAnalysisMetrics {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Determine which leg is stepping up based on height
  const steppingLeg = leftAnkle.y < rightAnkle.y ? 'left' : 'right';
  
  // Calculate trunk lean
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
  const trunkLean = Math.atan2(midShoulder.x - midHip.x, midShoulder.y - midHip.y) * (180 / Math.PI);

  // Movement strategy
  const hipAngle = steppingLeg === 'left' 
    ? calculateAngle(leftShoulder, leftHip, leftKnee)
    : calculateAngle(rightShoulder, rightHip, rightKnee);
  const kneeAngle = steppingLeg === 'left'
    ? calculateAngle(leftHip, leftKnee, leftAnkle)
    : calculateAngle(rightHip, rightKnee, rightAnkle);

  let movementStrategy: 'hip_dominant' | 'knee_dominant' | 'balanced';
  if (Math.abs(trunkLean) > 15) {
    movementStrategy = 'hip_dominant';
  } else if (kneeAngle < 70) {
    movementStrategy = 'knee_dominant';
  } else {
    movementStrategy = 'balanced';
  }

  // Knee valgus
  const kneeValgusAngle = steppingLeg === 'left'
    ? calculateKneeValgus(leftHip, leftKnee, leftAnkle)
    : calculateKneeValgus(rightHip, rightKnee, rightAnkle);

  // Pelvic drop
  const pelvicDrop = Math.abs(leftHip.y - rightHip.y) * 100;

  // Compensations
  const compensations: string[] = [];
  if (Math.abs(trunkLean) > 15) compensations.push('Excessive trunk lean');
  if (kneeValgusAngle > 10) compensations.push('Knee valgus collapse');
  if (pelvicDrop > 2) compensations.push('Contralateral hip drop');

  return {
    movementStrategy,
    trunkLean: Math.abs(trunkLean),
    kneeValgusAngle,
    pelvicDrop,
    weightTransferTime: 1.5, // seconds - needs temporal analysis
    smoothnessScore: calculateSmoothness(previousFrames),
    compensations
  };
}

// Step Down Analysis
export function analyzeStepDown(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): StepAnalysisMetrics {
  // Similar to step up but with different biomechanics
  const metrics = analyzeStepUp(landmarks, previousFrames);
  
  // Step down specific adjustments
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  
  // Eccentric control assessment
  const eccentricControl = previousFrames.length > 5 
    ? assessEccentricControl(previousFrames)
    : 0.7;

  // Additional compensations for step down
  if (eccentricControl < 0.5) {
    metrics.compensations.push('Poor eccentric control');
  }

  return {
    ...metrics,
    smoothnessScore: eccentricControl
  };
}

// Single Leg Squat Analysis
export function analyzeSingleLegSquat(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): SquatAnalysisMetrics {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Determine standing leg
  const standingLeg = leftAnkle.y > rightAnkle.y ? 'left' : 'right';
  
  // Calculate depth
  const kneeAngle = standingLeg === 'left'
    ? calculateAngle(leftHip, leftKnee, leftAnkle)
    : calculateAngle(rightHip, rightKnee, rightAnkle);
  const depth = 180 - kneeAngle;

  // Depth category
  let depthCategory: 'full' | 'parallel' | 'partial' | 'insufficient';
  if (depth >= 90) depthCategory = 'full';
  else if (depth >= 70) depthCategory = 'parallel';
  else if (depth >= 45) depthCategory = 'partial';
  else depthCategory = 'insufficient';

  // Knee valgus
  const kneeValgusLeft = calculateKneeValgus(leftHip, leftKnee, leftAnkle);
  const kneeValgusRight = calculateKneeValgus(rightHip, rightKnee, rightAnkle);

  // Trunk lean
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };
  const trunkLeanFrontal = Math.atan2(midShoulder.x - midHip.x, midShoulder.y - midHip.y) * (180 / Math.PI);
  const trunkLeanSagittal = Math.atan2(midShoulder.z - midHip.z, midShoulder.y - midHip.y) * (180 / Math.PI);

  // Pelvic tilt
  const pelvicTilt = Math.abs(leftHip.y - rightHip.y) * 100;

  // Quality score based on Crossley criteria
  let qualityScore = 100;
  if (depth < 60) qualityScore -= 20;
  if (Math.abs(kneeValgusLeft) > 10 || Math.abs(kneeValgusRight) > 10) qualityScore -= 30;
  if (Math.abs(trunkLeanFrontal) > 10) qualityScore -= 20;
  if (pelvicTilt > 2) qualityScore -= 15;
  qualityScore = Math.max(0, qualityScore);

  return {
    depth,
    depthCategory,
    kneeValgusAngle: { left: kneeValgusLeft, right: kneeValgusRight },
    kneeOverToe: { 
      left: leftKnee.z > leftAnkle.z,
      right: rightKnee.z > rightAnkle.z
    },
    hipShift: 0, // Needs more complex calculation
    trunkLean: { frontal: trunkLeanFrontal, sagittal: trunkLeanSagittal },
    pelvicTilt,
    spineNeutral: Math.abs(trunkLeanSagittal) < 10,
    buttWink: false, // Needs lumbar spine tracking
    heelRise: { left: false, right: false }, // Needs heel tracking
    symmetryScore: 100, // Single leg, so max symmetry
    qualityScore
  };
}

// Double Leg Squat Analysis
export function analyzeDoubleSquat(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): SquatAnalysisMetrics {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Calculate depth for both legs
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const avgDepth = (180 - leftKneeAngle + 180 - rightKneeAngle) / 2;

  // Depth category
  let depthCategory: 'full' | 'parallel' | 'partial' | 'insufficient';
  if (avgDepth >= 120) depthCategory = 'full';
  else if (avgDepth >= 90) depthCategory = 'parallel';
  else if (avgDepth >= 60) depthCategory = 'partial';
  else depthCategory = 'insufficient';

  // Knee valgus for both sides
  const kneeValgusLeft = calculateKneeValgus(leftHip, leftKnee, leftAnkle);
  const kneeValgusRight = calculateKneeValgus(rightHip, rightKnee, rightAnkle);

  // Hip shift (lateral displacement)
  const hipShift = (leftHip.x - rightHip.x) * 100; // cm estimate

  // Trunk lean
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };
  const trunkLeanFrontal = Math.atan2(midShoulder.x - midHip.x, midShoulder.y - midHip.y) * (180 / Math.PI);
  const trunkLeanSagittal = Math.atan2(midShoulder.z - midHip.z, midShoulder.y - midHip.y) * (180 / Math.PI);

  // Symmetry score
  const depthDifference = Math.abs((180 - leftKneeAngle) - (180 - rightKneeAngle));
  const symmetryScore = Math.max(0, 100 - depthDifference * 2);

  // Quality score
  let qualityScore = 100;
  if (avgDepth < 90) qualityScore -= 20;
  if (Math.abs(kneeValgusLeft) > 5 || Math.abs(kneeValgusRight) > 5) qualityScore -= 25;
  if (Math.abs(trunkLeanFrontal) > 5) qualityScore -= 15;
  if (Math.abs(hipShift) > 5) qualityScore -= 20;
  if (symmetryScore < 80) qualityScore -= 20;
  qualityScore = Math.max(0, qualityScore);

  return {
    depth: avgDepth,
    depthCategory,
    kneeValgusAngle: { left: kneeValgusLeft, right: kneeValgusRight },
    kneeOverToe: {
      left: leftKnee.z > leftAnkle.z,
      right: rightKnee.z > rightAnkle.z
    },
    hipShift: Math.abs(hipShift),
    trunkLean: { frontal: trunkLeanFrontal, sagittal: trunkLeanSagittal },
    pelvicTilt: Math.abs(leftHip.y - rightHip.y) * 100,
    spineNeutral: Math.abs(trunkLeanSagittal) < 15,
    buttWink: detectButtWink(previousFrames),
    heelRise: { 
      left: detectHeelRise('left', landmarks),
      right: detectHeelRise('right', landmarks)
    },
    symmetryScore,
    qualityScore
  };
}

// Shoulder Flexion Analysis
export function analyzeShoulderFlexion(
  landmarks: NormalizedLandmark[],
  previousFrames: NormalizedLandmark[][] = []
): ShoulderFlexionMetrics {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const nose = landmarks[0];

  // Calculate shoulder flexion angles
  const leftFlexion = calculateShoulderFlexion(leftShoulder, leftElbow, leftHip);
  const rightFlexion = calculateShoulderFlexion(rightShoulder, rightElbow, rightHip);

  // Scapulohumeral rhythm (should be 2:1 after 30 degrees)
  const leftRhythm = calculateScapuloHumeralRhythm(leftFlexion, previousFrames, 'left');
  const rightRhythm = calculateScapuloHumeralRhythm(rightFlexion, previousFrames, 'right');

  // Detect scapular dyskinesis
  const leftDyskinesis = detectScapularDyskinesis(landmarks, 'left', previousFrames);
  const rightDyskinesis = detectScapularDyskinesis(landmarks, 'right', previousFrames);

  // Detect winging
  const leftWinging = detectScapularWinging(landmarks, 'left');
  const rightWinging = detectScapularWinging(landmarks, 'right');

  // Early elevation (upper trap dominance)
  const leftEarlyElevation = leftShoulder.y < nose.y && leftFlexion < 60;
  const rightEarlyElevation = rightShoulder.y < nose.y && rightFlexion < 60;

  // Painful arc (typically 60-120 degrees)
  const leftPainfulArc = leftFlexion >= 60 && leftFlexion <= 120;
  const rightPainfulArc = rightFlexion >= 60 && rightFlexion <= 120;

  // Asymmetry
  const asymmetry = Math.abs(leftFlexion - rightFlexion);

  // Compensations
  const compensations: string[] = [];
  if (leftWinging || rightWinging) compensations.push('Scapular winging detected');
  if (leftEarlyElevation || rightEarlyElevation) compensations.push('Early shoulder elevation');
  if (asymmetry > 10) compensations.push(`Asymmetrical movement (${asymmetry.toFixed(0)}° difference)`);
  if (leftDyskinesis.present || rightDyskinesis.present) compensations.push('Scapular dyskinesis present');

  return {
    maxFlexionAngle: { left: leftFlexion, right: rightFlexion },
    scapuloHumeralRhythm: { left: leftRhythm, right: rightRhythm },
    scapularDyskinesis: {
      left: leftDyskinesis,
      right: rightDyskinesis
    },
    winging: { left: leftWinging, right: rightWinging },
    earlyElevation: { left: leftEarlyElevation, right: rightEarlyElevation },
    painfulArc: { left: leftPainfulArc, right: rightPainfulArc },
    asymmetry,
    compensations
  };
}

// Helper functions
function calculateKneeValgus(hip: NormalizedLandmark, knee: NormalizedLandmark, ankle: NormalizedLandmark): number {
  // Calculate frontal plane projection angle
  const hipToKnee = { x: knee.x - hip.x, y: knee.y - hip.y };
  const kneeToAnkle = { x: ankle.x - knee.x, y: ankle.y - knee.y };
  
  const angle1 = Math.atan2(hipToKnee.x, hipToKnee.y);
  const angle2 = Math.atan2(kneeToAnkle.x, kneeToAnkle.y);
  
  return (angle2 - angle1) * (180 / Math.PI);
}

function calculateVerticalOscillation(frames: NormalizedLandmark[][]): number {
  if (frames.length < 10) return 8;
  
  const hipHeights = frames.map(frame => {
    const leftHip = frame[23];
    const rightHip = frame[24];
    return (leftHip.y + rightHip.y) / 2;
  });
  
  const maxHeight = Math.max(...hipHeights);
  const minHeight = Math.min(...hipHeights);
  
  return (maxHeight - minHeight) * 100; // Convert to cm estimate
}

function detectStrikePattern(
  leftHeel: NormalizedLandmark,
  leftToe: NormalizedLandmark,
  rightHeel: NormalizedLandmark,
  rightToe: NormalizedLandmark,
  leftAnkle: NormalizedLandmark,
  rightAnkle: NormalizedLandmark
): 'heel' | 'midfoot' | 'forefoot' {
  // Simplified detection based on heel and toe positions relative to ankle
  const leftHeelFirst = leftHeel.y > leftToe.y;
  const rightHeelFirst = rightHeel.y > rightToe.y;
  
  if (leftHeelFirst || rightHeelFirst) return 'heel';
  
  const leftMidfoot = Math.abs(leftHeel.y - leftToe.y) < 0.02;
  const rightMidfoot = Math.abs(rightHeel.y - rightToe.y) < 0.02;
  
  if (leftMidfoot || rightMidfoot) return 'midfoot';
  
  return 'forefoot';
}

function detectOverstride(landmarks: NormalizedLandmark[]): boolean {
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];
  
  // Check if ankle is significantly ahead of knee (overstride)
  const leftOverstride = leftAnkle.z > leftKnee.z + 0.1;
  const rightOverstride = rightAnkle.z > rightKnee.z + 0.1;
  
  return leftOverstride || rightOverstride;
}

function calculateHipExtension(landmarks: NormalizedLandmark[]): number {
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const leftShoulder = landmarks[11];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightShoulder = landmarks[12];
  
  const leftExtension = calculateAngle(leftShoulder, leftHip, leftKnee) - 180;
  const rightExtension = calculateAngle(rightShoulder, rightHip, rightKnee) - 180;
  
  return Math.max(leftExtension, rightExtension);
}

function estimateCadence(frames: NormalizedLandmark[][]): number {
  // Simplified cadence estimation based on ankle movement patterns
  if (frames.length < 30) return 100;
  
  let stepCount = 0;
  let previousHeight = frames[0][27].y; // Left ankle
  
  for (let i = 1; i < frames.length; i++) {
    const currentHeight = frames[i][27].y;
    if (previousHeight > currentHeight + 0.02 && i > 0) {
      stepCount++;
    }
    previousHeight = currentHeight;
  }
  
  // Convert to steps per minute (assuming 30 fps)
  return (stepCount / frames.length) * 30 * 60;
}

function calculateSmoothness(frames: NormalizedLandmark[][]): number {
  if (frames.length < 5) return 0.5;
  
  // Calculate jerk (rate of change of acceleration) as a measure of smoothness
  let totalJerk = 0;
  
  for (let i = 2; i < frames.length; i++) {
    const prevPrev = frames[i - 2][23]; // Hip position
    const prev = frames[i - 1][23];
    const current = frames[i][23];
    
    const acc1 = {
      x: prev.x - prevPrev.x,
      y: prev.y - prevPrev.y
    };
    const acc2 = {
      x: current.x - prev.x,
      y: current.y - prev.y
    };
    
    const jerk = Math.sqrt(
      Math.pow(acc2.x - acc1.x, 2) + 
      Math.pow(acc2.y - acc1.y, 2)
    );
    
    totalJerk += jerk;
  }
  
  // Convert to smoothness score (0-1, where 1 is smoothest)
  const avgJerk = totalJerk / (frames.length - 2);
  return Math.max(0, Math.min(1, 1 - avgJerk * 100));
}

function assessEccentricControl(frames: NormalizedLandmark[][]): number {
  if (frames.length < 5) return 0.5;
  
  // Analyze descent speed consistency
  const descentSpeeds: number[] = [];
  
  for (let i = 1; i < frames.length; i++) {
    const prevHip = frames[i - 1][23];
    const currentHip = frames[i][23];
    
    if (currentHip.y > prevHip.y) { // Descending
      const speed = currentHip.y - prevHip.y;
      descentSpeeds.push(speed);
    }
  }
  
  if (descentSpeeds.length === 0) return 0.5;
  
  // Calculate coefficient of variation (lower is better)
  const mean = descentSpeeds.reduce((a, b) => a + b, 0) / descentSpeeds.length;
  const variance = descentSpeeds.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / descentSpeeds.length;
  const cv = Math.sqrt(variance) / mean;
  
  // Convert to control score (0-1, where 1 is best control)
  return Math.max(0, Math.min(1, 1 - cv));
}

function detectButtWink(frames: NormalizedLandmark[][]): boolean {
  // Simplified detection - would need lumbar spine tracking for accurate detection
  return false;
}

function detectHeelRise(side: 'left' | 'right', landmarks: NormalizedLandmark[]): boolean {
  const heel = side === 'left' ? landmarks[29] : landmarks[30];
  const toe = side === 'left' ? landmarks[31] : landmarks[32];
  
  // Check if heel is significantly higher than toe
  return heel.y < toe.y - 0.02;
}

function calculateShoulderFlexion(shoulder: NormalizedLandmark, elbow: NormalizedLandmark, hip: NormalizedLandmark): number {
  // Calculate angle between vertical and arm
  const armVector = {
    x: elbow.x - shoulder.x,
    y: elbow.y - shoulder.y,
    z: elbow.z - shoulder.z
  };
  
  const verticalVector = { x: 0, y: -1, z: 0 };
  
  const dot = armVector.x * verticalVector.x + armVector.y * verticalVector.y + armVector.z * verticalVector.z;
  const magArm = Math.sqrt(armVector.x * armVector.x + armVector.y * armVector.y + armVector.z * armVector.z);
  const magVert = 1;
  
  const angle = Math.acos(dot / (magArm * magVert));
  return angle * (180 / Math.PI);
}

function calculateScapuloHumeralRhythm(flexionAngle: number, frames: NormalizedLandmark[][], side: 'left' | 'right'): number {
  // Simplified - normally requires scapular tracking
  // After 30 degrees, should be 2:1 ratio
  if (flexionAngle < 30) return 0;
  
  // Ideal ratio is 2:1 (2 degrees glenohumeral : 1 degree scapular)
  return 2.0;
}

function detectScapularDyskinesis(
  landmarks: NormalizedLandmark[],
  side: 'left' | 'right',
  frames: NormalizedLandmark[][]
): { present: boolean; type: 'I' | 'II' | 'III' | 'IV' | null } {
  // Simplified detection - would need detailed scapular tracking
  const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
  const hip = side === 'left' ? landmarks[23] : landmarks[24];
  
  // Check for abnormal shoulder elevation
  const elevation = shoulder.y - hip.y;
  
  if (elevation < 0.3) {
    return { present: true, type: 'III' }; // Superior border elevation
  }
  
  return { present: false, type: null };
}

function detectScapularWinging(landmarks: NormalizedLandmark[], side: 'left' | 'right'): boolean {
  // Simplified - would need 3D depth information
  const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
  const spine = landmarks[0]; // Using nose as proxy for spine
  
  // Check for excessive lateral displacement
  const lateralDistance = Math.abs(shoulder.x - spine.x);
  
  return lateralDistance > 0.25;
}

// Generate clinical recommendations based on analysis
export function generateRecommendations(testResult: MovementTestResult): string[] {
  const recommendations: string[] = [];
  const { testType, metrics, risk } = testResult;

  if (risk === 'high') {
    recommendations.push('Consider comprehensive physiotherapy assessment');
  }

  switch (testType) {
    case 'walking_gait':
      const walkMetrics = metrics as GaitMetrics;
      if (walkMetrics.pelvicDrop > 2) {
        recommendations.push('Hip abductor strengthening exercises (clamshells, side-lying hip abduction)');
      }
      if (walkMetrics.deviations.includes('Excessive lateral trunk lean')) {
        recommendations.push('Core stability training');
      }
      break;

    case 'running_gait':
      const runMetrics = metrics as RunningGaitMetrics;
      if (runMetrics.cadence < 170) {
        recommendations.push('Increase cadence to 170-180 steps/minute using metronome');
      }
      if (runMetrics.overstride) {
        recommendations.push('Focus on landing with foot under center of mass');
      }
      if (runMetrics.excessiveKneeValgus) {
        recommendations.push('Hip and glute strengthening program');
        recommendations.push('Single-leg balance and control exercises');
      }
      break;

    case 'single_leg_squat':
      const slsMetrics = metrics as SquatAnalysisMetrics;
      if (slsMetrics.qualityScore < 60) {
        recommendations.push('Progressive single-leg strengthening program');
        recommendations.push('Balance and proprioception training');
      }
      if (slsMetrics.kneeValgusAngle.left > 10 || slsMetrics.kneeValgusAngle.right > 10) {
        recommendations.push('Hip external rotator strengthening');
        recommendations.push('Neuromuscular control training');
      }
      break;

    case 'shoulder_flexion':
      const shoulderMetrics = metrics as ShoulderFlexionMetrics;
      if (shoulderMetrics.winging.left || shoulderMetrics.winging.right) {
        recommendations.push('Serratus anterior strengthening (wall slides, push-up plus)');
      }
      if (shoulderMetrics.earlyElevation.left || shoulderMetrics.earlyElevation.right) {
        recommendations.push('Lower trapezius strengthening');
        recommendations.push('Upper trapezius relaxation techniques');
      }
      break;
  }

  return recommendations;
}

// Calculate overall risk score
export function calculateRiskScore(testResult: MovementTestResult): 'low' | 'moderate' | 'high' {
  const { testType, metrics } = testResult;
  let riskScore = 0;

  switch (testType) {
    case 'walking_gait':
      const walkMetrics = metrics as GaitMetrics;
      if (walkMetrics.deviations.length > 2) riskScore += 30;
      if (walkMetrics.pelvicDrop > 3) riskScore += 20;
      if (Math.abs(walkMetrics.trunkLean.frontal) > 10) riskScore += 20;
      break;

    case 'running_gait':
      const runMetrics = metrics as RunningGaitMetrics;
      if (runMetrics.excessiveKneeValgus) riskScore += 40;
      if (runMetrics.overstride) riskScore += 20;
      if (runMetrics.verticalOscillation > 10) riskScore += 15;
      if (!runMetrics.cadenceOptimal) riskScore += 10;
      break;

    case 'single_leg_squat':
      const slsMetrics = metrics as SquatAnalysisMetrics;
      if (slsMetrics.qualityScore < 50) riskScore += 40;
      if (slsMetrics.depth < 45) riskScore += 20;
      if (Math.abs(slsMetrics.kneeValgusAngle.left) > 15 || 
          Math.abs(slsMetrics.kneeValgusAngle.right) > 15) riskScore += 30;
      break;
  }

  if (riskScore >= 60) return 'high';
  if (riskScore >= 30) return 'moderate';
  return 'low';
}