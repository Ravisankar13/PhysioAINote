import { NormalizedLandmark } from '@mediapipe/pose';

export interface RunningMetrics {
  cadence: number; // steps per minute
  strideLength: number; // relative stride length
  verticalOscillation: number; // bounce in running
  groundContactTime: number; // estimated contact time
  footStrike: 'heel' | 'midfoot' | 'forefoot';
  kneeFlexion: number; // knee angle at foot strike
  hipExtension: number; // hip extension angle
  trunkLean: number; // forward/backward lean
  armSwingSymmetry: number; // arm swing balance
  crossoverGait: boolean; // feet crossing midline
  overstriding: boolean; // landing too far ahead
  pelvicDrop: number; // hip drop during stance
}

interface StepData {
  timestamp: number;
  footPosition: 'left' | 'right';
  landmarks: NormalizedLandmark[];
}

// Store previous frames for cadence calculation
let stepHistory: StepData[] = [];
let lastLeftFootY = 0;
let lastRightFootY = 0;
let leftStepCount = 0;
let rightStepCount = 0;
let analysisStartTime = Date.now();

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

  // Detect steps (when foot passes highest point and starts descending)
  const leftFootY = landmarks[LEFT_ANKLE].y;
  const rightFootY = landmarks[RIGHT_ANKLE].y;
  
  // Count steps based on foot movement
  if (lastLeftFootY < leftFootY && leftFootY > rightFootY) {
    leftStepCount++;
    stepHistory.push({
      timestamp: currentTime,
      footPosition: 'left',
      landmarks: [...landmarks]
    });
  }
  
  if (lastRightFootY < rightFootY && rightFootY > leftFootY) {
    rightStepCount++;
    stepHistory.push({
      timestamp: currentTime,
      footPosition: 'right',
      landmarks: [...landmarks]
    });
  }

  lastLeftFootY = leftFootY;
  lastRightFootY = rightFootY;

  // Clean old step data (keep last 10 seconds)
  stepHistory = stepHistory.filter(step => currentTime - step.timestamp < 10000);

  // Calculate cadence (steps per minute)
  const totalSteps = leftStepCount + rightStepCount;
  const cadence = elapsedSeconds > 0 ? (totalSteps / elapsedSeconds) * 60 : 0;

  // Calculate stride length (relative to leg length)
  const legLength = Math.sqrt(
    Math.pow(landmarks[LEFT_HIP].x - landmarks[LEFT_ANKLE].x, 2) +
    Math.pow(landmarks[LEFT_HIP].y - landmarks[LEFT_ANKLE].y, 2)
  );
  
  const strideLength = stepHistory.length >= 2 
    ? Math.abs(stepHistory[stepHistory.length - 1].landmarks[LEFT_ANKLE].x - 
               stepHistory[stepHistory.length - 2].landmarks[LEFT_ANKLE].x) / legLength
    : 0;

  // Calculate vertical oscillation (bounce)
  const hipMidpointY = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
  const verticalOscillation = stepHistory.length >= 2
    ? Math.abs(hipMidpointY - stepHistory[stepHistory.length - 2].landmarks[LEFT_HIP].y) * 100
    : 0;

  // Determine foot strike pattern
  const footStrike = determineFootStrike(landmarks);

  // Calculate knee flexion at foot strike
  const kneeFlexion = calculateKneeFlexion(landmarks);

  // Calculate hip extension
  const hipExtension = calculateHipExtension(landmarks);

  // Calculate trunk lean
  const trunkLean = calculateTrunkLean(landmarks);

  // Calculate arm swing symmetry
  const armSwingSymmetry = calculateArmSwingSymmetry(landmarks);

  // Check for crossover gait
  const crossoverGait = detectCrossoverGait(landmarks);

  // Check for overstriding
  const overstriding = detectOverstriding(landmarks);

  // Calculate pelvic drop
  const pelvicDrop = calculatePelvicDrop(landmarks);

  // Estimate ground contact time (simplified)
  const groundContactTime = estimateGroundContactTime(cadence);

  return {
    cadence: Math.round(cadence),
    strideLength: Number(strideLength.toFixed(2)),
    verticalOscillation: Number(verticalOscillation.toFixed(1)),
    groundContactTime,
    footStrike,
    kneeFlexion: Math.round(kneeFlexion),
    hipExtension: Math.round(hipExtension),
    trunkLean: Number(trunkLean.toFixed(1)),
    armSwingSymmetry: Number(armSwingSymmetry.toFixed(1)),
    crossoverGait,
    overstriding,
    pelvicDrop: Number(pelvicDrop.toFixed(1))
  };
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

function detectCrossoverGait(landmarks: NormalizedLandmark[]): boolean {
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