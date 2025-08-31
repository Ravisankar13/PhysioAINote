import { NormalizedLandmark } from '@mediapipe/pose';

export interface RunningMetrics {
  // Primary metrics
  cadence: number; // steps per minute
  stepRate: number; // steps per minute (same as cadence, for clarity)
  strideLength: number; // distance between same foot strikes (meters)
  stepLength: number; // distance between opposite foot strikes (meters)
  stepWidth: number; // lateral distance between feet (meters)
  
  // Temporal metrics
  groundContactTime: number; // milliseconds on ground
  flightTime: number; // milliseconds in air
  contactTimeRatio: number; // ground/flight time ratio
  
  // Foot strike and landing
  footStrike: 'heel' | 'midfoot' | 'forefoot';
  footStrikeAngle: number; // angle of foot at contact (degrees)
  
  // Vertical mechanics
  verticalOscillation: number; // vertical bounce (cm)
  verticalRatio: number; // vertical oscillation / stride length
  
  // Joint angles
  kneeFlexion: number; // knee angle at foot strike
  hipExtension: number; // hip extension angle
  ankleAngle: number; // ankle dorsiflexion/plantarflexion
  
  // Body position
  trunkLean: number; // forward/backward lean (degrees)
  lateralLean: number; // side-to-side lean (degrees)
  pelvicDrop: number; // hip drop during stance
  pelvicRotation: number; // pelvis rotation (degrees)
  
  // Symmetry metrics
  stepLengthAsymmetry: number; // % difference left vs right
  contactTimeAsymmetry: number; // % difference left vs right
  armSwingSymmetry: number; // arm swing balance
  
  // Efficiency indicators
  crossoverGait: boolean; // feet crossing midline
  overstriding: boolean; // landing too far ahead
  efficiency: number; // overall running efficiency score (0-100)
  
  // Dynamic metrics
  legStiffness: number; // spring-like leg behavior
  propulsivePower: number; // push-off power estimate
}

interface StepData {
  timestamp: number;
  footPosition: 'left' | 'right';
  landmarks: NormalizedLandmark[];
  isGroundContact: boolean;
  footStrikeType?: 'heel' | 'midfoot' | 'forefoot';
  hipY?: number;
  ankleX?: number;
  ankleY?: number;
}

// Enhanced tracking for comprehensive metrics
let stepHistory: StepData[] = [];
let lastLeftFootY = 0;
let lastRightFootY = 0;
let leftStepCount = 0;
let rightStepCount = 0;
let analysisStartTime = Date.now();

// Additional tracking for new metrics
let leftGroundContactStart = 0;
let rightGroundContactStart = 0;
let leftFlightStart = 0;
let rightFlightStart = 0;
let leftContactTimes: number[] = [];
let rightContactTimes: number[] = [];
let leftStepLengths: number[] = [];
let rightStepLengths: number[] = [];
let verticalPositions: number[] = [];
let lastLeftStrikeX = 0;
let lastRightStrikeX = 0;

export function analyzeRunningMechanics(landmarks: NormalizedLandmark[]): RunningMetrics {
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - analysisStartTime) / 1000;

  // Key landmark indices
  const LEFT_ANKLE = 27;
  const RIGHT_ANKLE = 28;
  const LEFT_KNEE = 25;
  const RIGHT_KNEE = 26;
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;
  const LEFT_SHOULDER = 11;
  const RIGHT_SHOULDER = 12;
  const LEFT_ELBOW = 13;
  const RIGHT_ELBOW = 14;
  const LEFT_WRIST = 15;
  const RIGHT_WRIST = 16;
  const LEFT_HEEL = 29;
  const RIGHT_HEEL = 30;
  const LEFT_TOE = 31;
  const RIGHT_TOE = 32;
  const NOSE = 0;
  
  // Calculate hip midpoint for reference
  const hipMidpointX = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2;
  const hipMidpointY = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;

  // Enhanced step detection with ground contact tracking
  const leftFootY = landmarks[LEFT_ANKLE].y;
  const rightFootY = landmarks[RIGHT_ANKLE].y;
  const leftFootX = landmarks[LEFT_ANKLE].x;
  const rightFootX = landmarks[RIGHT_ANKLE].x;
  
  // Detect ground contact (foot at lowest point with minimal vertical movement)
  const leftFootVelocity = leftFootY - lastLeftFootY;
  const rightFootVelocity = rightFootY - lastRightFootY;
  const velocityThreshold = 0.002; // Threshold for detecting ground contact
  
  // Left foot strike detection
  if (lastLeftFootY > leftFootY && Math.abs(leftFootVelocity) < velocityThreshold) {
    leftStepCount++;
    
    // Calculate step length from last right strike
    if (lastRightStrikeX > 0) {
      const stepLength = Math.abs(leftFootX - lastRightStrikeX);
      leftStepLengths.push(stepLength);
    }
    lastLeftStrikeX = leftFootX;
    
    // Record ground contact start
    leftGroundContactStart = currentTime;
    
    // Determine foot strike type
    const footStrikeType = determineFootStrike(landmarks);
    
    stepHistory.push({
      timestamp: currentTime,
      footPosition: 'left',
      landmarks: [...landmarks],
      isGroundContact: true,
      footStrikeType,
      hipY: hipMidpointY,
      ankleX: leftFootX,
      ankleY: leftFootY
    });
  }
  
  // Right foot strike detection
  if (lastRightFootY > rightFootY && Math.abs(rightFootVelocity) < velocityThreshold) {
    rightStepCount++;
    
    // Calculate step length from last left strike
    if (lastLeftStrikeX > 0) {
      const stepLength = Math.abs(rightFootX - lastLeftStrikeX);
      rightStepLengths.push(stepLength);
    }
    lastRightStrikeX = rightFootX;
    
    // Record ground contact start
    rightGroundContactStart = currentTime;
    
    // Determine foot strike type
    const footStrikeType = determineFootStrike(landmarks);
    
    stepHistory.push({
      timestamp: currentTime,
      footPosition: 'right',
      landmarks: [...landmarks],
      isGroundContact: true,
      footStrikeType,
      hipY: hipMidpointY,
      ankleX: rightFootX,
      ankleY: rightFootY
    });
  }
  
  // Detect toe-off (when foot leaves ground)
  if (leftFootVelocity < -velocityThreshold && leftGroundContactStart > 0) {
    const contactTime = currentTime - leftGroundContactStart;
    leftContactTimes.push(contactTime);
    leftGroundContactStart = 0;
    leftFlightStart = currentTime;
  }
  
  if (rightFootVelocity < -velocityThreshold && rightGroundContactStart > 0) {
    const contactTime = currentTime - rightGroundContactStart;
    rightContactTimes.push(contactTime);
    rightGroundContactStart = 0;
    rightFlightStart = currentTime;
  }

  lastLeftFootY = leftFootY;
  lastRightFootY = rightFootY;
  
  // Track vertical position for oscillation
  verticalPositions.push(hipMidpointY);

  // Clean old step data (keep last 10 seconds)
  stepHistory = stepHistory.filter(step => currentTime - step.timestamp < 10000);
  leftContactTimes = leftContactTimes.slice(-20); // Keep last 20 values
  rightContactTimes = rightContactTimes.slice(-20);
  leftStepLengths = leftStepLengths.slice(-20);
  rightStepLengths = rightStepLengths.slice(-20);
  verticalPositions = verticalPositions.slice(-100); // Keep last 100 frames

  // Calculate cadence (steps per minute)
  const totalSteps = leftStepCount + rightStepCount;
  const cadence = elapsedSeconds > 0 ? (totalSteps / elapsedSeconds) * 60 : 0;
  const stepRate = cadence; // Same as cadence, for clarity

  // Calculate average ground contact time (milliseconds)
  const avgLeftContactTime = leftContactTimes.length > 0 
    ? leftContactTimes.reduce((a, b) => a + b, 0) / leftContactTimes.length 
    : 250; // Default 250ms
  const avgRightContactTime = rightContactTimes.length > 0
    ? rightContactTimes.reduce((a, b) => a + b, 0) / rightContactTimes.length
    : 250;
  const groundContactTime = (avgLeftContactTime + avgRightContactTime) / 2;
  
  // Calculate flight time (estimated from cadence and contact time)
  const stepDuration = cadence > 0 ? 60000 / cadence : 350; // ms per step
  const flightTime = Math.max(0, stepDuration - groundContactTime);
  const contactTimeRatio = flightTime > 0 ? groundContactTime / flightTime : 1;

  // Calculate step metrics
  const avgLeftStepLength = leftStepLengths.length > 0
    ? leftStepLengths.reduce((a, b) => a + b, 0) / leftStepLengths.length
    : 0;
  const avgRightStepLength = rightStepLengths.length > 0
    ? rightStepLengths.reduce((a, b) => a + b, 0) / rightStepLengths.length
    : 0;
  const stepLength = (avgLeftStepLength + avgRightStepLength) / 2; // In normalized units
  const strideLength = stepLength * 2; // Stride = 2 steps
  
  // Calculate step width (lateral distance between feet)
  const stepWidth = Math.abs(leftFootX - rightFootX);
  
  // Calculate vertical oscillation
  const maxY = Math.max(...verticalPositions.slice(-20));
  const minY = Math.min(...verticalPositions.slice(-20));
  const verticalOscillation = (maxY - minY) * 100; // Convert to cm (approximate)
  const verticalRatio = strideLength > 0 ? verticalOscillation / (strideLength * 100) : 0;
  
  // Calculate asymmetry metrics
  const stepLengthAsymmetry = avgLeftStepLength > 0 && avgRightStepLength > 0
    ? Math.abs(avgLeftStepLength - avgRightStepLength) / ((avgLeftStepLength + avgRightStepLength) / 2) * 100
    : 0;
  const contactTimeAsymmetry = avgLeftContactTime > 0 && avgRightContactTime > 0
    ? Math.abs(avgLeftContactTime - avgRightContactTime) / ((avgLeftContactTime + avgRightContactTime) / 2) * 100
    : 0;

  // Determine foot strike pattern and angle
  const footStrike = determineFootStrike(landmarks);
  const footStrikeAngle = calculateFootStrikeAngle(landmarks);

  // Calculate joint angles
  const kneeFlexion = calculateKneeFlexion(landmarks);
  const hipExtension = calculateHipExtension(landmarks);
  const ankleAngle = calculateAnkleAngle(landmarks);

  // Calculate body position metrics
  const trunkLean = calculateTrunkLean(landmarks);
  const lateralLean = calculateLateralLean(landmarks);
  const pelvicRotation = calculatePelvicRotation(landmarks);

  // Calculate arm swing symmetry
  const armSwingSymmetry = calculateArmSwingSymmetry(landmarks);

  // Check for crossover gait (feet crossing midline)
  const crossoverGait = detectCrossoverGait(landmarks, hipMidpointX);

  // Check for overstriding
  const overstriding = detectOverstriding(landmarks);
  
  // Calculate leg stiffness (simplified spring model)
  const legStiffness = calculateLegStiffness(verticalOscillation, groundContactTime);
  
  // Calculate propulsive power estimate
  const propulsivePower = calculatePropulsivePower(strideLength, cadence, verticalOscillation);
  
  // Calculate overall efficiency score (0-100)
  const efficiency = calculateRunningEfficiency({
    cadence,
    verticalRatio,
    groundContactTime,
    stepLengthAsymmetry,
    contactTimeAsymmetry,
    overstriding,
    crossoverGait
  });

  // Calculate pelvic drop
  const pelvicDrop = calculatePelvicDrop(landmarks);

  return {
    // Primary metrics
    cadence: Math.round(cadence),
    stepRate: Math.round(stepRate),
    strideLength: Number(strideLength.toFixed(3)),
    stepLength: Number(stepLength.toFixed(3)),
    stepWidth: Number(stepWidth.toFixed(3)),
    
    // Temporal metrics
    groundContactTime: Math.round(groundContactTime),
    flightTime: Math.round(flightTime),
    contactTimeRatio: Number(contactTimeRatio.toFixed(2)),
    
    // Foot strike and landing
    footStrike,
    footStrikeAngle: Math.round(footStrikeAngle),
    
    // Vertical mechanics
    verticalOscillation: Number(verticalOscillation.toFixed(1)),
    verticalRatio: Number(verticalRatio.toFixed(3)),
    
    // Joint angles
    kneeFlexion: Math.round(kneeFlexion),
    hipExtension: Math.round(hipExtension),
    ankleAngle: Math.round(ankleAngle),
    
    // Body position
    trunkLean: Number(trunkLean.toFixed(1)),
    lateralLean: Number(lateralLean.toFixed(1)),
    pelvicDrop: Number(pelvicDrop.toFixed(1)),
    pelvicRotation: Number(pelvicRotation.toFixed(1)),
    
    // Symmetry metrics
    stepLengthAsymmetry: Number(stepLengthAsymmetry.toFixed(1)),
    contactTimeAsymmetry: Number(contactTimeAsymmetry.toFixed(1)),
    armSwingSymmetry: Number(armSwingSymmetry.toFixed(1)),
    
    // Efficiency indicators
    crossoverGait,
    overstriding,
    efficiency: Math.round(efficiency),
    
    // Dynamic metrics
    legStiffness: Number(legStiffness.toFixed(1)),
    propulsivePower: Number(propulsivePower.toFixed(1))
  };
}

// New helper functions for comprehensive metrics
function calculateFootStrikeAngle(landmarks: NormalizedLandmark[]): number {
  const LEFT_HEEL = 29;
  const LEFT_TOE = 31;
  const RIGHT_HEEL = 30;
  const RIGHT_TOE = 32;
  const LEFT_ANKLE = 27;
  const RIGHT_ANKLE = 28;
  
  // Use the foot that's lower (in contact)
  const leftFootLower = landmarks[LEFT_ANKLE].y > landmarks[RIGHT_ANKLE].y;
  
  if (leftFootLower) {
    return Math.atan2(
      landmarks[LEFT_TOE].y - landmarks[LEFT_HEEL].y,
      landmarks[LEFT_TOE].x - landmarks[LEFT_HEEL].x
    ) * (180 / Math.PI);
  } else {
    return Math.atan2(
      landmarks[RIGHT_TOE].y - landmarks[RIGHT_HEEL].y,
      landmarks[RIGHT_TOE].x - landmarks[RIGHT_HEEL].x
    ) * (180 / Math.PI);
  }
}

function calculateAnkleAngle(landmarks: NormalizedLandmark[]): number {
  const LEFT_ANKLE = 27;
  const LEFT_KNEE = 25;
  const LEFT_TOE = 31;
  const RIGHT_ANKLE = 28;
  const RIGHT_KNEE = 26;
  const RIGHT_TOE = 32;
  
  // Calculate for the leg with more knee flexion (stance leg)
  const leftKneeY = landmarks[LEFT_KNEE].y;
  const rightKneeY = landmarks[RIGHT_KNEE].y;
  
  if (leftKneeY > rightKneeY) {
    // Left leg is stance
    const shinVector = {
      x: landmarks[LEFT_KNEE].x - landmarks[LEFT_ANKLE].x,
      y: landmarks[LEFT_KNEE].y - landmarks[LEFT_ANKLE].y
    };
    const footVector = {
      x: landmarks[LEFT_TOE].x - landmarks[LEFT_ANKLE].x,
      y: landmarks[LEFT_TOE].y - landmarks[LEFT_ANKLE].y
    };
    
    const dotProduct = shinVector.x * footVector.x + shinVector.y * footVector.y;
    const shinMag = Math.sqrt(shinVector.x ** 2 + shinVector.y ** 2);
    const footMag = Math.sqrt(footVector.x ** 2 + footVector.y ** 2);
    
    return Math.acos(dotProduct / (shinMag * footMag)) * (180 / Math.PI) - 90;
  } else {
    // Right leg is stance
    const shinVector = {
      x: landmarks[RIGHT_KNEE].x - landmarks[RIGHT_ANKLE].x,
      y: landmarks[RIGHT_KNEE].y - landmarks[RIGHT_ANKLE].y
    };
    const footVector = {
      x: landmarks[RIGHT_TOE].x - landmarks[RIGHT_ANKLE].x,
      y: landmarks[RIGHT_TOE].y - landmarks[RIGHT_ANKLE].y
    };
    
    const dotProduct = shinVector.x * footVector.x + shinVector.y * footVector.y;
    const shinMag = Math.sqrt(shinVector.x ** 2 + shinVector.y ** 2);
    const footMag = Math.sqrt(footVector.x ** 2 + footVector.y ** 2);
    
    return Math.acos(dotProduct / (shinMag * footMag)) * (180 / Math.PI) - 90;
  }
}

function calculateLateralLean(landmarks: NormalizedLandmark[]): number {
  const LEFT_SHOULDER = 11;
  const RIGHT_SHOULDER = 12;
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;
  
  const shoulderMidX = (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2;
  const hipMidX = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2;
  
  // Calculate lateral lean in degrees
  const lateralOffset = shoulderMidX - hipMidX;
  return Math.atan(lateralOffset * 10) * (180 / Math.PI); // Scale factor for visibility
}

function calculatePelvicRotation(landmarks: NormalizedLandmark[]): number {
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;
  
  // Calculate rotation based on hip positions in 3D space (approximated)
  const hipWidth = Math.abs(landmarks[RIGHT_HIP].x - landmarks[LEFT_HIP].x);
  const hipDepthDiff = landmarks[RIGHT_HIP].z - landmarks[LEFT_HIP].z;
  
  return Math.atan2(hipDepthDiff, hipWidth) * (180 / Math.PI);
}

function calculateLegStiffness(verticalOscillation: number, groundContactTime: number): number {
  // Simplified spring-mass model
  // Higher stiffness = less vertical oscillation and shorter contact time
  if (verticalOscillation === 0 || groundContactTime === 0) return 0;
  
  // Normalize to 0-100 scale
  const stiffnessIndex = (1000 / groundContactTime) * (10 / verticalOscillation);
  return Math.min(100, Math.max(0, stiffnessIndex * 10));
}

function calculatePropulsivePower(strideLength: number, cadence: number, verticalOscillation: number): number {
  // Estimate based on movement parameters
  const velocity = (strideLength * cadence) / 60; // m/s approximation
  const verticalWork = verticalOscillation / 100; // Convert to meters
  
  // Simplified power calculation (arbitrary units)
  const power = velocity * (1 + verticalWork) * 100;
  return Math.min(100, Math.max(0, power));
}

function calculateRunningEfficiency(params: {
  cadence: number;
  verticalRatio: number;
  groundContactTime: number;
  stepLengthAsymmetry: number;
  contactTimeAsymmetry: number;
  overstriding: boolean;
  crossoverGait: boolean;
}): number {
  let score = 100;
  
  // Cadence efficiency (optimal 170-180)
  if (params.cadence < 160 || params.cadence > 190) {
    score -= 10;
  } else if (params.cadence < 170 || params.cadence > 180) {
    score -= 5;
  }
  
  // Vertical ratio (lower is better)
  if (params.verticalRatio > 0.15) score -= 15;
  else if (params.verticalRatio > 0.10) score -= 10;
  else if (params.verticalRatio > 0.08) score -= 5;
  
  // Ground contact time (shorter is generally better)
  if (params.groundContactTime > 300) score -= 10;
  else if (params.groundContactTime > 250) score -= 5;
  
  // Asymmetry penalties
  if (params.stepLengthAsymmetry > 10) score -= 10;
  else if (params.stepLengthAsymmetry > 5) score -= 5;
  
  if (params.contactTimeAsymmetry > 10) score -= 10;
  else if (params.contactTimeAsymmetry > 5) score -= 5;
  
  // Technique penalties
  if (params.overstriding) score -= 15;
  if (params.crossoverGait) score -= 10;
  
  return Math.max(0, score);
}

function determineFootStrike(landmarks: NormalizedLandmark[]): 'heel' | 'midfoot' | 'forefoot' {
  const LEFT_HEEL = 29;
  const LEFT_TOE = 31;
  const RIGHT_HEEL = 30;
  const RIGHT_TOE = 32;
  const LEFT_ANKLE = 27;
  const RIGHT_ANKLE = 28;

  // Check which foot is in contact (lower position)
  const leftFootLower = landmarks[LEFT_ANKLE].y > landmarks[RIGHT_ANKLE].y;
  
  if (leftFootLower) {
    const heelToToeAngle = Math.atan2(
      landmarks[LEFT_TOE].y - landmarks[LEFT_HEEL].y,
      landmarks[LEFT_TOE].x - landmarks[LEFT_HEEL].x
    ) * (180 / Math.PI);
    
    if (heelToToeAngle < -10) return 'heel';
    if (heelToToeAngle > 10) return 'forefoot';
    return 'midfoot';
  } else {
    const heelToToeAngle = Math.atan2(
      landmarks[RIGHT_TOE].y - landmarks[RIGHT_HEEL].y,
      landmarks[RIGHT_TOE].x - landmarks[RIGHT_HEEL].x
    ) * (180 / Math.PI);
    
    if (heelToToeAngle < -10) return 'heel';
    if (heelToToeAngle > 10) return 'forefoot';
    return 'midfoot';
  }
}

function calculateKneeFlexion(landmarks: NormalizedLandmark[]): number {
  const LEFT_HIP = 23;
  const LEFT_KNEE = 25;
  const LEFT_ANKLE = 27;
  const RIGHT_HIP = 24;
  const RIGHT_KNEE = 26;
  const RIGHT_ANKLE = 28;

  // Calculate for the leg that's in stance phase (lower)
  const leftLegStance = landmarks[LEFT_ANKLE].y > landmarks[RIGHT_ANKLE].y;
  
  if (leftLegStance) {
    const angle = calculateAngle(
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE],
      landmarks[LEFT_ANKLE]
    );
    return 180 - angle; // Flexion angle
  } else {
    const angle = calculateAngle(
      landmarks[RIGHT_HIP],
      landmarks[RIGHT_KNEE],
      landmarks[RIGHT_ANKLE]
    );
    return 180 - angle;
  }
}

function calculateHipExtension(landmarks: NormalizedLandmark[]): number {
  const LEFT_SHOULDER = 11;
  const LEFT_HIP = 23;
  const LEFT_KNEE = 25;
  const RIGHT_SHOULDER = 12;
  const RIGHT_HIP = 24;
  const RIGHT_KNEE = 26;

  // Calculate for the trailing leg (higher knee position = swing phase)
  const leftLegSwing = landmarks[LEFT_KNEE].y < landmarks[RIGHT_KNEE].y;
  
  if (leftLegSwing) {
    return calculateAngle(
      landmarks[RIGHT_SHOULDER],
      landmarks[RIGHT_HIP],
      landmarks[RIGHT_KNEE]
    );
  } else {
    return calculateAngle(
      landmarks[LEFT_SHOULDER],
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE]
    );
  }
}

function calculateTrunkLean(landmarks: NormalizedLandmark[]): number {
  const LEFT_SHOULDER = 11;
  const RIGHT_SHOULDER = 12;
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;

  const shoulderMidpoint = {
    x: (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2,
    y: (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2
  };

  const hipMidpoint = {
    x: (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2,
    y: (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2
  };

  // Calculate angle from vertical
  const angle = Math.atan2(
    shoulderMidpoint.x - hipMidpoint.x,
    hipMidpoint.y - shoulderMidpoint.y
  ) * (180 / Math.PI);

  return angle; // Positive = forward lean, Negative = backward lean
}

function calculateArmSwingSymmetry(landmarks: NormalizedLandmark[]): number {
  const LEFT_SHOULDER = 11;
  const LEFT_ELBOW = 13;
  const LEFT_WRIST = 15;
  const RIGHT_SHOULDER = 12;
  const RIGHT_ELBOW = 14;
  const RIGHT_WRIST = 16;

  // Calculate arm swing amplitude for each arm
  const leftArmSwing = Math.abs(landmarks[LEFT_WRIST].x - landmarks[LEFT_SHOULDER].x);
  const rightArmSwing = Math.abs(landmarks[RIGHT_WRIST].x - landmarks[RIGHT_SHOULDER].x);

  // Calculate symmetry (0-100%, 100% = perfect symmetry)
  const symmetry = leftArmSwing > 0 || rightArmSwing > 0
    ? (1 - Math.abs(leftArmSwing - rightArmSwing) / Math.max(leftArmSwing, rightArmSwing)) * 100
    : 100;

  return symmetry;
}

function detectCrossoverGait(landmarks: NormalizedLandmark[], hipMidpointX: number): boolean {
  const LEFT_ANKLE = 27;
  const RIGHT_ANKLE = 28;
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;

  const hipMidline = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2;
  
  // Check if either foot crosses the midline
  const leftCrossover = landmarks[LEFT_ANKLE].x > hipMidline + 0.02;
  const rightCrossover = landmarks[RIGHT_ANKLE].x < hipMidline - 0.02;

  return leftCrossover || rightCrossover;
}

function detectOverstriding(landmarks: NormalizedLandmark[]): boolean {
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;
  const LEFT_ANKLE = 27;
  const RIGHT_ANKLE = 28;

  const hipMidpoint = {
    x: (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2,
    y: (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2
  };

  // Check which foot is in contact (lower position)
  const leftFootStance = landmarks[LEFT_ANKLE].y > landmarks[RIGHT_ANKLE].y;
  
  if (leftFootStance) {
    // Check if left foot is too far ahead of center of mass
    const footAheadDistance = landmarks[LEFT_ANKLE].x - hipMidpoint.x;
    return Math.abs(footAheadDistance) > 0.15; // Threshold for overstriding
  } else {
    const footAheadDistance = landmarks[RIGHT_ANKLE].x - hipMidpoint.x;
    return Math.abs(footAheadDistance) > 0.15;
  }
}

function calculatePelvicDrop(landmarks: NormalizedLandmark[]): number {
  const LEFT_HIP = 23;
  const RIGHT_HIP = 24;

  // Calculate hip height difference (indicates pelvic drop)
  const hipHeightDiff = Math.abs(landmarks[LEFT_HIP].y - landmarks[RIGHT_HIP].y) * 100;
  
  return hipHeightDiff;
}

function estimateGroundContactTime(cadence: number): number {
  // Empirical formula: higher cadence = shorter contact time
  // Typical range: 200-300ms for recreational runners
  if (cadence <= 0) return 0;
  
  const contactTime = 400 - (cadence * 0.8); // Simplified estimation
  return Math.max(200, Math.min(350, contactTime));
}

function calculateAngle(
  pointA: NormalizedLandmark,
  pointB: NormalizedLandmark,
  pointC: NormalizedLandmark
): number {
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export function detectRunningImpairments(metrics: RunningMetrics): string[] {
  const impairments: string[] = [];

  // Cadence issues
  if (metrics.cadence < 160) {
    impairments.push(`Low cadence (${metrics.cadence} spm) - aim for 170-180 spm`);
  } else if (metrics.cadence > 200) {
    impairments.push(`Very high cadence (${metrics.cadence} spm) - may indicate short stride`);
  }

  // Vertical oscillation
  if (metrics.verticalOscillation > 10) {
    impairments.push(`Excessive vertical oscillation (${metrics.verticalOscillation}cm) - wasting energy`);
  }

  // Foot strike pattern
  if (metrics.footStrike === 'heel' && metrics.overstriding) {
    impairments.push('Heavy heel striking with overstriding - high impact forces');
  }

  // Overstriding
  if (metrics.overstriding) {
    impairments.push('Overstriding detected - landing too far ahead of center of mass');
  }

  // Crossover gait
  if (metrics.crossoverGait) {
    impairments.push('Crossover gait pattern - feet crossing midline');
  }

  // Trunk lean
  if (metrics.trunkLean > 15) {
    impairments.push(`Excessive forward lean (${metrics.trunkLean}°)`);
  } else if (metrics.trunkLean < -5) {
    impairments.push(`Backward lean (${Math.abs(metrics.trunkLean)}°) - inefficient`);
  }

  // Arm swing
  if (metrics.armSwingSymmetry < 70) {
    impairments.push(`Asymmetric arm swing (${metrics.armSwingSymmetry.toFixed(0)}% symmetry)`);
  }

  // Pelvic drop
  if (metrics.pelvicDrop > 5) {
    impairments.push(`Excessive pelvic drop (${metrics.pelvicDrop.toFixed(1)}cm) - weak hip stabilizers`);
  }

  // Ground contact time
  if (metrics.groundContactTime > 300) {
    impairments.push(`Long ground contact time (${metrics.groundContactTime}ms) - work on quick turnover`);
  }

  return impairments;
}

export function generateRunningRecommendations(impairments: string[]): string[] {
  const recommendations: string[] = [];

  if (impairments.some(i => i.includes('Low cadence'))) {
    recommendations.push('Use a metronome app to gradually increase cadence by 5-10 steps/min');
    recommendations.push('Focus on quick, light foot contacts');
    recommendations.push('Practice high-knee drills and quick feet exercises');
  }

  if (impairments.some(i => i.includes('vertical oscillation'))) {
    recommendations.push('Focus on forward propulsion rather than upward movement');
    recommendations.push('Lean slightly forward from ankles');
    recommendations.push('Practice "quiet running" with minimal bounce');
  }

  if (impairments.some(i => i.includes('heel striking')) || impairments.some(i => i.includes('Overstriding'))) {
    recommendations.push('Land with foot under center of mass');
    recommendations.push('Increase cadence to naturally shorten stride');
    recommendations.push('Practice barefoot running drills on grass');
    recommendations.push('Focus on midfoot landing pattern');
  }

  if (impairments.some(i => i.includes('Crossover gait'))) {
    recommendations.push('Widen step width slightly - imagine running on railroad tracks');
    recommendations.push('Strengthen hip abductors with lateral band walks');
    recommendations.push('Practice single-leg balance exercises');
  }

  if (impairments.some(i => i.includes('forward lean'))) {
    recommendations.push('Engage core muscles while running');
    recommendations.push('Keep chest up and eyes forward');
    recommendations.push('Practice wall posture drills pre-run');
  }

  if (impairments.some(i => i.includes('Asymmetric arm'))) {
    recommendations.push('Keep elbows bent at 90 degrees');
    recommendations.push('Drive arms forward and back, not across body');
    recommendations.push('Practice arm swing drills without running');
  }

  if (impairments.some(i => i.includes('pelvic drop'))) {
    recommendations.push('Strengthen gluteus medius with side planks');
    recommendations.push('Perform clamshells and hip hikes daily');
    recommendations.push('Focus on level hips during running');
  }

  if (impairments.some(i => i.includes('ground contact time'))) {
    recommendations.push('Practice plyometric exercises (box jumps, bounds)');
    recommendations.push('Focus on "hot ground" visualization');
    recommendations.push('Strengthen calf muscles for better push-off');
  }

  return recommendations;
}

// Reset function for new analysis session
export function resetRunningAnalysis() {
  stepHistory = [];
  lastLeftFootY = 0;
  lastRightFootY = 0;
  leftStepCount = 0;
  rightStepCount = 0;
  analysisStartTime = Date.now();
}