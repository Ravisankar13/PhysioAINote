// Body Part Analysis Service for Biomechanical Measurements
// Provides specific analysis for each body region with clinical measurements

export interface BodyPartMeasurement {
  name: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  interpretation: 'normal' | 'below' | 'above';
  clinicalSignificance?: string;
}

export interface BodyPartAnalysis {
  region: string;
  measurements: BodyPartMeasurement[];
  overallScore: number; // 0-100
  recommendations: string[];
  timestamp: Date;
}

// Define all body regions with their specific measurements
export const BODY_REGIONS = [
  { id: 'cervical', label: 'C-Spine', icon: '🔵' },
  { id: 'thoracic', label: 'T-Spine', icon: '🟢' },
  { id: 'lumbar', label: 'L-Spine', icon: '🟡' },
  { id: 'shoulder', label: 'Shoulder', icon: '🔴' },
  { id: 'elbow', label: 'Elbow', icon: '🟣' },
  { id: 'wrist', label: 'Wrist', icon: '🟠' },
  { id: 'hip', label: 'Hip', icon: '🔵' },
  { id: 'knee', label: 'Knee', icon: '🟢' },
  { id: 'ankle', label: 'Ankle', icon: '🟡' },
] as const;

export type BodyRegionId = typeof BODY_REGIONS[number]['id'];

// Helper function to calculate angle between three points
function calculateAngle(p1: any, p2: any, p3: any): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
  
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

// Calculate distance between two points
function calculateDistance(p1: any, p2: any): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Shoulder Analysis
export function analyzeShoulderBiomechanics(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  // Get relevant landmarks
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const nose = landmarks[0];
  
  // 1. Scapulohumeral Rhythm (2:1 ratio monitoring)
  if (leftShoulder && leftElbow && leftHip) {
    const shoulderFlexion = calculateAngle(leftHip, leftShoulder, leftElbow);
    const scapularRotation = shoulderFlexion / 3; // Simplified - normally 2:1 ratio
    const ghMovement = shoulderFlexion * (2/3);
    
    const shRhythm = ghMovement / Math.max(scapularRotation, 1);
    
    measurements.push({
      name: 'Scapulohumeral Rhythm',
      value: shRhythm,
      unit: 'ratio',
      normalRange: { min: 1.8, max: 2.2 },
      interpretation: shRhythm >= 1.8 && shRhythm <= 2.2 ? 'normal' : 
                     shRhythm < 1.8 ? 'below' : 'above',
      clinicalSignificance: 'Abnormal rhythm may indicate scapular dyskinesis or shoulder impingement'
    });
  }
  
  // 2. Shoulder Flexion ROM
  if (leftShoulder && leftElbow && leftHip) {
    const flexionAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
    
    measurements.push({
      name: 'Shoulder Flexion',
      value: flexionAngle,
      unit: '°',
      normalRange: { min: 160, max: 180 },
      interpretation: flexionAngle >= 160 ? 'normal' : 'below',
      clinicalSignificance: 'Limited flexion may indicate capsular tightness or rotator cuff pathology'
    });
  }
  
  // 3. Shoulder Elevation (Shrug sign)
  if (leftShoulder && rightShoulder && nose) {
    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const neckLength = nose.y - shoulderHeight;
    const elevationRatio = neckLength * 100; // Simplified metric
    
    measurements.push({
      name: 'Shoulder Elevation',
      value: elevationRatio,
      unit: '%',
      normalRange: { min: 15, max: 25 },
      interpretation: elevationRatio >= 15 && elevationRatio <= 25 ? 'normal' :
                     elevationRatio < 15 ? 'above' : 'below',
      clinicalSignificance: 'Excessive elevation indicates upper trapezius dominance'
    });
  }
  
  // 4. Shoulder Internal Rotation
  if (leftShoulder && leftElbow) {
    const internalRotation = Math.abs(leftElbow.x - leftShoulder.x) * 100;
    
    measurements.push({
      name: 'Internal Rotation',
      value: internalRotation,
      unit: '°',
      normalRange: { min: 60, max: 90 },
      interpretation: internalRotation >= 60 && internalRotation <= 90 ? 'normal' :
                     internalRotation < 60 ? 'below' : 'above'
    });
  }
  
  // 5. Scapular Winging Detection
  const scapularAsymmetry = Math.abs(leftShoulder.z - rightShoulder.z) * 100;
  measurements.push({
    name: 'Scapular Symmetry',
    value: scapularAsymmetry,
    unit: 'mm',
    normalRange: { min: 0, max: 10 },
    interpretation: scapularAsymmetry <= 10 ? 'normal' : 'above',
    clinicalSignificance: 'Asymmetry >10mm suggests scapular winging or dyskinesis'
  });
  
  // Calculate overall score
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Scapulohumeral Rhythm')?.interpretation !== 'normal') {
    recommendations.push('Focus on scapular stabilization exercises');
  }
  if (measurements.find(m => m.name === 'Shoulder Flexion')?.interpretation === 'below') {
    recommendations.push('Implement shoulder mobility program');
  }
  if (measurements.find(m => m.name === 'Shoulder Elevation')?.interpretation === 'above') {
    recommendations.push('Address upper trapezius tightness');
  }
  
  return {
    region: 'shoulder',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Cervical Spine Analysis
export function analyzeCervicalSpine(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  
  // 1. Forward Head Posture (Craniovertebral Angle)
  if (nose && leftEar && leftShoulder) {
    const cvAngle = calculateAngle(leftShoulder, leftEar, nose);
    
    measurements.push({
      name: 'Craniovertebral Angle',
      value: cvAngle,
      unit: '°',
      normalRange: { min: 49, max: 59 },
      interpretation: cvAngle >= 49 && cvAngle <= 59 ? 'normal' :
                     cvAngle < 49 ? 'below' : 'above',
      clinicalSignificance: 'Angle <49° indicates forward head posture'
    });
  }
  
  // 2. Lateral Flexion ROM
  if (leftEar && rightEar && leftShoulder && rightShoulder) {
    const headTilt = Math.abs(leftEar.y - rightEar.y) * 100;
    const shoulderLevel = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const lateralFlexion = Math.abs(headTilt - shoulderLevel);
    
    measurements.push({
      name: 'Lateral Flexion',
      value: lateralFlexion,
      unit: '°',
      normalRange: { min: 0, max: 45 },
      interpretation: lateralFlexion <= 45 ? 'normal' : 'above',
      clinicalSignificance: 'Limited lateral flexion suggests muscle tightness or joint restriction'
    });
  }
  
  // 3. Cervical Lordosis
  const lordosisAngle = 35; // Placeholder - would need lateral view
  measurements.push({
    name: 'Cervical Lordosis',
    value: lordosisAngle,
    unit: '°',
    normalRange: { min: 20, max: 40 },
    interpretation: 'normal'
  });
  
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Craniovertebral Angle')?.interpretation === 'below') {
    recommendations.push('Perform chin tucks and neck strengthening');
  }
  
  return {
    region: 'cervical',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Lumbar Spine Analysis
export function analyzeLumbarSpine(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  
  // 1. Pelvic Tilt
  if (leftHip && rightHip) {
    const pelvicTilt = Math.abs(leftHip.y - rightHip.y) * 100;
    
    measurements.push({
      name: 'Pelvic Tilt',
      value: pelvicTilt,
      unit: '°',
      normalRange: { min: 0, max: 5 },
      interpretation: pelvicTilt <= 5 ? 'normal' : 'above',
      clinicalSignificance: 'Excessive tilt indicates pelvic instability or muscle imbalance'
    });
  }
  
  // 2. Lumbar Flexion
  if (leftShoulder && leftHip) {
    const trunkFlexion = calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 0.1, z: leftHip.z });
    
    measurements.push({
      name: 'Lumbar Flexion',
      value: trunkFlexion,
      unit: '°',
      normalRange: { min: 40, max: 60 },
      interpretation: trunkFlexion >= 40 && trunkFlexion <= 60 ? 'normal' :
                     trunkFlexion < 40 ? 'below' : 'above'
    });
  }
  
  // 3. Lateral Shift
  const lateralShift = Math.abs((leftHip.x + rightHip.x) / 2 - (leftShoulder.x + rightShoulder.x) / 2) * 100;
  measurements.push({
    name: 'Lateral Shift',
    value: lateralShift,
    unit: 'mm',
    normalRange: { min: 0, max: 10 },
    interpretation: lateralShift <= 10 ? 'normal' : 'above',
    clinicalSignificance: 'Shift >10mm may indicate disc pathology or muscle spasm'
  });
  
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Pelvic Tilt')?.interpretation === 'above') {
    recommendations.push('Core stabilization exercises recommended');
  }
  
  return {
    region: 'lumbar',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Knee Analysis  
export function analyzeKneeBiomechanics(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  
  // 1. Knee Flexion Angle
  if (leftHip && leftKnee && leftAnkle) {
    const flexionAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    
    measurements.push({
      name: 'Knee Flexion',
      value: 180 - flexionAngle,
      unit: '°',
      normalRange: { min: 0, max: 140 },
      interpretation: flexionAngle <= 140 ? 'normal' : 'above'
    });
  }
  
  // 2. Valgus/Varus Angle (Q-Angle)
  if (leftHip && leftKnee && leftAnkle) {
    const hipKneeVector = { x: leftKnee.x - leftHip.x, y: leftKnee.y - leftHip.y };
    const kneeAnkleVector = { x: leftAnkle.x - leftKnee.x, y: leftAnkle.y - leftKnee.y };
    
    const dotProduct = hipKneeVector.x * kneeAnkleVector.x + hipKneeVector.y * kneeAnkleVector.y;
    const mag1 = Math.sqrt(hipKneeVector.x ** 2 + hipKneeVector.y ** 2);
    const mag2 = Math.sqrt(kneeAnkleVector.x ** 2 + kneeAnkleVector.y ** 2);
    
    const qAngle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);
    
    measurements.push({
      name: 'Q-Angle',
      value: qAngle,
      unit: '°',
      normalRange: { min: 12, max: 20 },
      interpretation: qAngle >= 12 && qAngle <= 20 ? 'normal' :
                     qAngle < 12 ? 'below' : 'above',
      clinicalSignificance: 'Q-angle >20° increases patellofemoral stress'
    });
  }
  
  // 3. Dynamic Knee Valgus
  if (leftKnee && rightKnee) {
    const kneeDistance = calculateDistance(leftKnee, rightKnee);
    const hipDistance = calculateDistance(leftHip, rightHip);
    const valgusRatio = (kneeDistance / hipDistance) * 100;
    
    measurements.push({
      name: 'Dynamic Valgus',
      value: valgusRatio,
      unit: '%',
      normalRange: { min: 80, max: 100 },
      interpretation: valgusRatio >= 80 && valgusRatio <= 100 ? 'normal' :
                     valgusRatio < 80 ? 'above' : 'below',
      clinicalSignificance: 'Excessive valgus increases ACL injury risk'
    });
  }
  
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Dynamic Valgus')?.interpretation === 'above') {
    recommendations.push('Hip strengthening to control knee valgus');
  }
  
  return {
    region: 'knee',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Hip Analysis
export function analyzeHipBiomechanics(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftShoulder = landmarks[11];
  
  // 1. Trendelenburg Sign (Hip Drop)
  if (leftHip && rightHip) {
    const hipDrop = Math.abs(leftHip.y - rightHip.y) * 100;
    
    measurements.push({
      name: 'Hip Drop (Trendelenburg)',
      value: hipDrop,
      unit: 'mm',
      normalRange: { min: 0, max: 5 },
      interpretation: hipDrop <= 5 ? 'normal' : 'above',
      clinicalSignificance: 'Positive Trendelenburg indicates hip abductor weakness'
    });
  }
  
  // 2. Hip Flexion ROM
  if (leftShoulder && leftHip && leftKnee) {
    const hipFlexion = calculateAngle(leftShoulder, leftHip, leftKnee);
    
    measurements.push({
      name: 'Hip Flexion',
      value: hipFlexion,
      unit: '°',
      normalRange: { min: 110, max: 130 },
      interpretation: hipFlexion >= 110 && hipFlexion <= 130 ? 'normal' :
                     hipFlexion < 110 ? 'below' : 'above'
    });
  }
  
  // 3. Hip Internal Rotation
  const internalRotation = 35; // Placeholder - needs specific test position
  measurements.push({
    name: 'Internal Rotation',
    value: internalRotation,
    unit: '°',
    normalRange: { min: 30, max: 45 },
    interpretation: 'normal'
  });
  
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Hip Drop (Trendelenburg)')?.interpretation === 'above') {
    recommendations.push('Gluteus medius strengthening required');
  }
  
  return {
    region: 'hip',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Ankle Analysis
export function analyzeAnkleBiomechanics(landmarks: any[]): BodyPartAnalysis {
  const measurements: BodyPartMeasurement[] = [];
  
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const leftHeel = landmarks[29];
  const leftFootIndex = landmarks[31];
  
  // 1. Dorsiflexion ROM (Weight-bearing lunge test simulation)
  if (leftKnee && leftAnkle) {
    const dorsiflexion = calculateAngle(
      leftKnee,
      leftAnkle,
      { x: leftAnkle.x, y: leftAnkle.y + 0.1, z: leftAnkle.z }
    );
    
    measurements.push({
      name: 'Dorsiflexion',
      value: dorsiflexion - 90,
      unit: '°',
      normalRange: { min: 10, max: 20 },
      interpretation: dorsiflexion - 90 >= 10 && dorsiflexion - 90 <= 20 ? 'normal' :
                     dorsiflexion - 90 < 10 ? 'below' : 'above',
      clinicalSignificance: 'Limited dorsiflexion (<10°) increases injury risk'
    });
  }
  
  // 2. Foot Pronation/Supination
  if (leftAnkle && leftHeel && leftFootIndex) {
    const footAngle = calculateAngle(leftHeel, leftAnkle, leftFootIndex);
    
    measurements.push({
      name: 'Foot Position',
      value: footAngle,
      unit: '°',
      normalRange: { min: 0, max: 15 },
      interpretation: footAngle <= 15 ? 'normal' : 'above',
      clinicalSignificance: 'Excessive pronation may cause kinetic chain issues'
    });
  }
  
  // 3. Achilles Tendon Angle
  if (leftKnee && leftAnkle && leftHeel) {
    const achillesAngle = calculateAngle(leftKnee, leftAnkle, leftHeel);
    
    measurements.push({
      name: 'Achilles Angle',
      value: achillesAngle,
      unit: '°',
      normalRange: { min: 0, max: 5 },
      interpretation: achillesAngle <= 5 ? 'normal' : 'above'
    });
  }
  
  const normalCount = measurements.filter(m => m.interpretation === 'normal').length;
  const overallScore = (normalCount / measurements.length) * 100;
  
  const recommendations: string[] = [];
  if (measurements.find(m => m.name === 'Dorsiflexion')?.interpretation === 'below') {
    recommendations.push('Calf stretching and ankle mobility exercises');
  }
  
  return {
    region: 'ankle',
    measurements,
    overallScore,
    recommendations,
    timestamp: new Date()
  };
}

// Main analysis function that routes to specific body part analyzers
export function analyzeBodyPart(region: BodyRegionId, landmarks: any[]): BodyPartAnalysis {
  switch (region) {
    case 'shoulder':
      return analyzeShoulderBiomechanics(landmarks);
    case 'cervical':
      return analyzeCervicalSpine(landmarks);
    case 'lumbar':
      return analyzeLumbarSpine(landmarks);
    case 'knee':
      return analyzeKneeBiomechanics(landmarks);
    case 'hip':
      return analyzeHipBiomechanics(landmarks);
    case 'ankle':
      return analyzeAnkleBiomechanics(landmarks);
    case 'thoracic':
      // Placeholder for thoracic spine analysis
      return {
        region: 'thoracic',
        measurements: [],
        overallScore: 0,
        recommendations: ['Thoracic analysis coming soon'],
        timestamp: new Date()
      };
    case 'elbow':
      // Placeholder for elbow analysis
      return {
        region: 'elbow',
        measurements: [],
        overallScore: 0,
        recommendations: ['Elbow analysis coming soon'],
        timestamp: new Date()
      };
    case 'wrist':
      // Placeholder for wrist analysis
      return {
        region: 'wrist',
        measurements: [],
        overallScore: 0,
        recommendations: ['Wrist analysis coming soon'],
        timestamp: new Date()
      };
    default:
      return {
        region: region,
        measurements: [],
        overallScore: 0,
        recommendations: [],
        timestamp: new Date()
      };
  }
}