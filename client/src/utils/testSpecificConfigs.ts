// Test-specific configurations for Movement Analysis
export interface TestSpecificConfig {
  id: string;
  name: string;
  // Joint angles to display for this test
  relevantJoints: {
    [key: string]: boolean;
  };
  // Camera setup instructions
  cameraInstructions: {
    primaryView: 'front' | 'side' | 'full-body';
    distance: string;
    height: string;
    additionalNotes?: string;
  };
  // Visual overlays and guides
  visualGuides: {
    alignmentLines?: boolean;
    romArcs?: boolean;
    phaseIndicators?: boolean;
    depthMarkers?: boolean;
    kneeTrackingLine?: boolean;
    pelvicStabilityIndicator?: boolean;
    verticalOscillationBar?: boolean;
    cadenceDisplay?: boolean;
  };
  // Key metrics to highlight
  primaryMetrics: string[];
  // Critical angles with normal ranges
  criticalAngles: {
    joint: string;
    normalRange: { min: number; max: number };
    warningThreshold?: number;
  }[];
  // Common errors to detect
  commonErrors: string[];
}

export const TEST_CONFIGS: { [key: string]: TestSpecificConfig } = {
  'general-movement': {
    id: 'general-movement',
    name: 'General Movement',
    relevantJoints: {
      'left_shoulder': true,
      'right_shoulder': true,
      'left_elbow': true,
      'right_elbow': true,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': true,
    },
    cameraInstructions: {
      primaryView: 'full-body',
      distance: '2-3 meters',
      height: 'chest level',
      additionalNotes: 'Ensure entire body is visible in frame',
    },
    visualGuides: {
      alignmentLines: true,
    },
    primaryMetrics: ['symmetry', 'stability', 'quality'],
    criticalAngles: [],
    commonErrors: ['asymmetry', 'restricted range', 'compensation patterns'],
  },

  'walking-gait': {
    id: 'walking-gait',
    name: 'Walking Gait',
    relevantJoints: {
      'left_shoulder': false,
      'right_shoulder': false,
      'left_elbow': false,
      'right_elbow': false,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': true,
    },
    cameraInstructions: {
      primaryView: 'side',
      distance: '3-4 meters',
      height: 'hip level',
      additionalNotes: 'Position camera perpendicular to walking path',
    },
    visualGuides: {
      phaseIndicators: true,
      cadenceDisplay: true,
    },
    primaryMetrics: ['stepLength', 'stanceTime', 'cadence', 'hipDrop'],
    criticalAngles: [
      { joint: 'hip', normalRange: { min: -10, max: 30 } },
      { joint: 'knee', normalRange: { min: 0, max: 60 } },
      { joint: 'ankle', normalRange: { min: -20, max: 10 } },
    ],
    commonErrors: ['trendelenburg', 'foot drop', 'circumduction', 'antalgic gait'],
  },

  'running-gait': {
    id: 'running-gait',
    name: 'Running Gait',
    relevantJoints: {
      'left_shoulder': false,
      'right_shoulder': false,
      'left_elbow': false,
      'right_elbow': false,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': true,
    },
    cameraInstructions: {
      primaryView: 'side',
      distance: '4-5 meters',
      height: 'hip level',
      additionalNotes: 'Capture multiple strides, side view preferred',
    },
    visualGuides: {
      verticalOscillationBar: true,
      cadenceDisplay: true,
      phaseIndicators: true,
    },
    primaryMetrics: ['cadence', 'verticalOscillation', 'groundContactTime', 'footStrike'],
    criticalAngles: [
      { joint: 'hip', normalRange: { min: -20, max: 45 } },
      { joint: 'knee', normalRange: { min: 25, max: 110 } },
      { joint: 'ankle', normalRange: { min: -30, max: 25 } },
    ],
    commonErrors: ['overstriding', 'excessive vertical oscillation', 'crossover gait', 'hip drop'],
  },

  'single-leg-squat': {
    id: 'single-leg-squat',
    name: 'Single Leg Squat',
    relevantJoints: {
      'left_shoulder': false,
      'right_shoulder': false,
      'left_elbow': false,
      'right_elbow': false,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': false,
    },
    cameraInstructions: {
      primaryView: 'front',
      distance: '2-3 meters',
      height: 'knee level',
      additionalNotes: 'Front view critical for knee valgus assessment',
    },
    visualGuides: {
      kneeTrackingLine: true,
      pelvicStabilityIndicator: true,
      alignmentLines: true,
    },
    primaryMetrics: ['kneeValgusAngle', 'pelvicDrop', 'trunkLateralFlexion', 'balanceScore'],
    criticalAngles: [
      { joint: 'knee_valgus', normalRange: { min: -5, max: 5 }, warningThreshold: 10 },
      { joint: 'hip_adduction', normalRange: { min: -5, max: 10 }, warningThreshold: 15 },
      { joint: 'trunk_lateral_flexion', normalRange: { min: -5, max: 5 } },
    ],
    commonErrors: ['knee valgus collapse', 'pelvic drop', 'trunk lean', 'loss of balance'],
  },

  'double-leg-squat': {
    id: 'double-leg-squat',
    name: 'Double Leg Squat',
    relevantJoints: {
      'left_shoulder': false,
      'right_shoulder': false,
      'left_elbow': false,
      'right_elbow': false,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': true,
    },
    cameraInstructions: {
      primaryView: 'side',
      distance: '2-3 meters',
      height: 'hip level',
      additionalNotes: 'Side view for depth, can alternate with front view',
    },
    visualGuides: {
      depthMarkers: true,
      kneeTrackingLine: true,
      alignmentLines: true,
    },
    primaryMetrics: ['squatDepth', 'kneeAlignment', 'trunkAngle', 'heelContact'],
    criticalAngles: [
      { joint: 'hip', normalRange: { min: 70, max: 120 } },
      { joint: 'knee', normalRange: { min: 70, max: 120 } },
      { joint: 'ankle', normalRange: { min: 15, max: 35 } },
      { joint: 'trunk', normalRange: { min: 45, max: 70 } },
    ],
    commonErrors: ['butt wink', 'knee valgus', 'forward lean', 'heels rising'],
  },

  'step-up-down': {
    id: 'step-up-down',
    name: 'Step Up/Down',
    relevantJoints: {
      'left_shoulder': false,
      'right_shoulder': false,
      'left_elbow': false,
      'right_elbow': false,
      'left_hip': true,
      'right_hip': true,
      'left_knee': true,
      'right_knee': true,
      'left_ankle': true,
      'right_ankle': true,
    },
    cameraInstructions: {
      primaryView: 'side',
      distance: '2-3 meters',
      height: 'step level',
      additionalNotes: 'Capture both ascent and descent phases',
    },
    visualGuides: {
      pelvicStabilityIndicator: true,
      alignmentLines: true,
      phaseIndicators: true,
    },
    primaryMetrics: ['pelvicStability', 'kneeControl', 'trunkStability', 'momentumUse'],
    criticalAngles: [
      { joint: 'hip', normalRange: { min: 60, max: 90 } },
      { joint: 'knee', normalRange: { min: 60, max: 90 } },
      { joint: 'pelvis_drop', normalRange: { min: -5, max: 5 }, warningThreshold: 10 },
    ],
    commonErrors: ['trendelenburg sign', 'knee valgus', 'excessive momentum', 'trunk lean'],
  },

  'shoulder-flexion': {
    id: 'shoulder-flexion',
    name: 'Shoulder Flexion',
    relevantJoints: {
      'left_shoulder': true,
      'right_shoulder': true,
      'left_elbow': true,
      'right_elbow': true,
      'left_hip': false,
      'right_hip': false,
      'left_knee': false,
      'right_knee': false,
      'left_ankle': false,
      'right_ankle': false,
    },
    cameraInstructions: {
      primaryView: 'side',
      distance: '2 meters',
      height: 'shoulder level',
      additionalNotes: 'Side view essential for sagittal plane assessment',
    },
    visualGuides: {
      romArcs: true,
      alignmentLines: true,
    },
    primaryMetrics: ['maxFlexionROM', 'scapularDyskinesis', 'compensatoryMovement', 'symmetry'],
    criticalAngles: [
      { joint: 'shoulder_flexion', normalRange: { min: 160, max: 180 }, warningThreshold: 150 },
      { joint: 'scapular_upward_rotation', normalRange: { min: 50, max: 60 } },
      { joint: 'thoracic_extension', normalRange: { min: -10, max: 10 } },
    ],
    commonErrors: ['early scapular elevation', 'excessive lordosis', 'trunk rotation', 'painful arc'],
  },
};

// Helper function to get config for a test
export function getTestConfig(testId: string): TestSpecificConfig | null {
  return TEST_CONFIGS[testId] || null;
}

// Helper function to get relevant joints for a test
export function getRelevantJoints(testId: string): { [key: string]: boolean } {
  const config = getTestConfig(testId);
  return config ? config.relevantJoints : {};
}

// Helper function to get camera instructions
export function getCameraInstructions(testId: string): string {
  const config = getTestConfig(testId);
  if (!config) return 'Position camera to capture full body';
  
  const { primaryView, distance, height, additionalNotes } = config.cameraInstructions;
  let instructions = `Camera Setup: ${primaryView.toUpperCase()} view, ${distance} away, at ${height}.`;
  if (additionalNotes) {
    instructions += ` ${additionalNotes}`;
  }
  return instructions;
}

// Helper function to check if an angle is within normal range
export function isAngleNormal(testId: string, joint: string, angle: number): boolean {
  const config = getTestConfig(testId);
  if (!config) return true;
  
  const criticalAngle = config.criticalAngles.find(ca => ca.joint === joint);
  if (!criticalAngle) return true;
  
  return angle >= criticalAngle.normalRange.min && angle <= criticalAngle.normalRange.max;
}

// Helper function to get angle severity
export function getAngleSeverity(testId: string, joint: string, angle: number): 'normal' | 'warning' | 'critical' {
  const config = getTestConfig(testId);
  if (!config) return 'normal';
  
  const criticalAngle = config.criticalAngles.find(ca => ca.joint === joint);
  if (!criticalAngle) return 'normal';
  
  const { min, max } = criticalAngle.normalRange;
  const warningThreshold = criticalAngle.warningThreshold;
  
  if (angle >= min && angle <= max) {
    return 'normal';
  }
  
  if (warningThreshold) {
    const deviation = Math.min(Math.abs(angle - min), Math.abs(angle - max));
    if (deviation <= warningThreshold) {
      return 'warning';
    }
  }
  
  return 'critical';
}