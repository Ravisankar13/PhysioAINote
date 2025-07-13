/**
 * Functional Movement Library
 * 
 * Predefined movement patterns for common physiotherapy assessments.
 * Each movement includes baseline joint positions and condition-specific modifications.
 */

export interface FunctionalMovement {
  id: string;
  name: string;
  category: 'lower_body' | 'upper_body' | 'functional' | 'balance';
  description: string;
  duration: number; // seconds
  frameCount: number;
  baselineFrames: Array<{
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
    jointAngles?: { [joint: string]: number };
    phase: 'start' | 'movement' | 'end_position' | 'return';
  }>;
  assessmentPoints: string[];
  commonCompensations: string[];
  affectedByConditions: string[];
}

export const FUNCTIONAL_MOVEMENTS: FunctionalMovement[] = [
  {
    id: 'squat',
    name: 'Bodyweight Squat',
    category: 'lower_body',
    description: 'Full depth squat assessing hip, knee, and ankle mobility with core stability',
    duration: 4,
    frameCount: 80,
    baselineFrames: generateSquatFrames(),
    assessmentPoints: [
      'Hip flexion range',
      'Knee valgus/varus',
      'Ankle dorsiflexion',
      'Trunk control',
      'Weight distribution'
    ],
    commonCompensations: [
      'Forward trunk lean',
      'Knee cave-in',
      'Heel lift',
      'Asymmetric loading'
    ],
    affectedByConditions: ['knee_pain', 'hip_osteoarthritis', 'ankle_stiffness', 'back_pain']
  },
  {
    id: 'step_up',
    name: 'Step Up',
    category: 'lower_body',
    description: 'Single leg step up onto platform assessing unilateral strength and control',
    duration: 3,
    frameCount: 60,
    baselineFrames: generateStepUpFrames(),
    assessmentPoints: [
      'Single leg strength',
      'Hip stability',
      'Knee alignment',
      'Push-off quality',
      'Landing control'
    ],
    commonCompensations: [
      'Hip drop',
      'Knee valgus',
      'Trunk lean',
      'Push-off with opposite leg'
    ],
    affectedByConditions: ['knee_pain', 'hip_weakness', 'ankle_instability']
  },
  {
    id: 'overhead_reach',
    name: 'Overhead Reach',
    category: 'upper_body',
    description: 'Bilateral arm elevation assessing shoulder mobility and scapular control',
    duration: 3,
    frameCount: 60,
    baselineFrames: generateOverheadReachFrames(),
    assessmentPoints: [
      'Shoulder elevation range',
      'Scapular rhythm',
      'Trunk compensation',
      'Bilateral symmetry'
    ],
    commonCompensations: [
      'Shoulder shrugging',
      'Trunk extension',
      'Scapular winging',
      'Asymmetric elevation'
    ],
    affectedByConditions: ['shoulder_impingement', 'rotator_cuff_tear', 'frozen_shoulder']
  },
  {
    id: 'walking_gait',
    name: 'Walking Gait',
    category: 'functional',
    description: 'Normal walking pattern assessing lower limb coordination and balance',
    duration: 5,
    frameCount: 100,
    baselineFrames: generateWalkingFrames(),
    assessmentPoints: [
      'Heel strike pattern',
      'Stride length',
      'Weight acceptance',
      'Push-off quality',
      'Arm swing'
    ],
    commonCompensations: [
      'Antalgic gait',
      'Circumduction',
      'Trendelenburg',
      'Foot drop compensation'
    ],
    affectedByConditions: ['knee_pain', 'hip_osteoarthritis', 'ankle_pain', 'back_pain']
  },
  {
    id: 'sit_to_stand',
    name: 'Sit to Stand',
    category: 'functional',
    description: 'Chair rise assessing lower limb strength and movement strategy',
    duration: 3,
    frameCount: 60,
    baselineFrames: generateSitToStandFrames(),
    assessmentPoints: [
      'Forward lean strategy',
      'Weight transfer',
      'Hip/knee extension',
      'Balance recovery',
      'Use of arms'
    ],
    commonCompensations: [
      'Excessive forward lean',
      'Push-off with arms',
      'Asymmetric rise',
      'Multiple attempts'
    ],
    affectedByConditions: ['knee_osteoarthritis', 'hip_weakness', 'back_pain']
  },
  {
    id: 'single_leg_stand',
    name: 'Single Leg Stand',
    category: 'balance',
    description: 'Static balance assessment on one leg',
    duration: 3,
    frameCount: 60,
    baselineFrames: generateSingleLegStandFrames(),
    assessmentPoints: [
      'Hip stability',
      'Ankle strategy',
      'Trunk control',
      'Time to balance loss'
    ],
    commonCompensations: [
      'Hip drop',
      'Trunk lean',
      'Ankle wobble',
      'Arm flailing'
    ],
    affectedByConditions: ['ankle_instability', 'hip_weakness', 'knee_pain']
  },
  {
    id: 'cross_body_reach',
    name: 'Cross Body Reach',
    category: 'upper_body',
    description: 'Horizontal adduction and internal rotation assessment',
    duration: 2,
    frameCount: 40,
    baselineFrames: generateCrossBodyReachFrames(),
    assessmentPoints: [
      'Horizontal adduction range',
      'Internal rotation',
      'Scapular protraction',
      'Trunk rotation'
    ],
    commonCompensations: [
      'Trunk rotation',
      'Shoulder elevation',
      'Scapular winging'
    ],
    affectedByConditions: ['shoulder_impingement', 'adhesive_capsulitis']
  },
  {
    id: 'lunge',
    name: 'Forward Lunge',
    category: 'lower_body',
    description: 'Dynamic lunge assessing lower limb control and flexibility',
    duration: 4,
    frameCount: 80,
    baselineFrames: generateLungeFrames(),
    assessmentPoints: [
      'Step length',
      'Knee alignment',
      'Hip flexibility',
      'Balance control',
      'Return to start'
    ],
    commonCompensations: [
      'Knee valgus',
      'Forward trunk lean',
      'Shortened stride',
      'Loss of balance'
    ],
    affectedByConditions: ['knee_pain', 'hip_flexor_tightness', 'ankle_stiffness']
  }
];

// Generate baseline movement frames for each functional movement
function generateSquatFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 80;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    let phase: 'start' | 'movement' | 'end_position' | 'return' = 'start';
    let squatDepth = 0;
    
    if (progress < 0.2) {
      phase = 'start';
      squatDepth = 0;
    } else if (progress < 0.5) {
      phase = 'movement';
      squatDepth = Math.sin((progress - 0.2) / 0.3 * Math.PI / 2) * 0.8; // Down phase
    } else if (progress < 0.7) {
      phase = 'end_position';
      squatDepth = 0.8; // Hold bottom position
    } else {
      phase = 'return';
      squatDepth = 0.8 * Math.cos((progress - 0.7) / 0.3 * Math.PI / 2); // Up phase
    }
    
    frames.push({
      timestamp: (i / totalFrames) * 4000, // 4 second duration
      landmarks: generateSquatLandmarks(squatDepth),
      jointAngles: {
        hip_flexion: 20 + squatDepth * 90,
        knee_flexion: squatDepth * 110,
        ankle_dorsiflexion: squatDepth * 30
      },
      phase
    });
  }
  
  return frames;
}

function generateSquatLandmarks(depth: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  // Generate 33 MediaPipe landmarks for squat position
  const landmarks = [];
  const hipDrop = depth * 0.5; // How much hips drop
  const kneeForward = depth * 0.3; // How much knees move forward
  const trunkLean = depth * 0.1; // Slight forward trunk lean
  
  // Generate all 33 landmarks with squat-specific positioning
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Apply squat-specific modifications based on landmark index
    if (i >= 23 && i <= 28) { // Hip and knee landmarks
      y -= hipDrop;
      z += kneeForward;
    }
    if (i >= 11 && i <= 16) { // Shoulder and upper body
      z += trunkLean;
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateStepUpFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 60;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    let phase: 'start' | 'movement' | 'end_position' | 'return' = 'start';
    let stepHeight = 0;
    
    if (progress < 0.3) {
      phase = 'start';
      stepHeight = 0;
    } else if (progress < 0.7) {
      phase = 'movement';
      stepHeight = Math.sin((progress - 0.3) / 0.4 * Math.PI / 2) * 0.4;
    } else {
      phase = 'end_position';
      stepHeight = 0.4;
    }
    
    frames.push({
      timestamp: (i / totalFrames) * 3000,
      landmarks: generateStepUpLandmarks(stepHeight),
      jointAngles: {
        hip_flexion: stepHeight * 90,
        knee_flexion: stepHeight * 90,
        ankle_dorsiflexion: stepHeight * 20
      },
      phase
    });
  }
  
  return frames;
}

function generateStepUpLandmarks(height: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Step up modifications - lift one leg
    if (i >= 25 && i <= 28) { // Right leg landmarks
      y += height;
      z += height * 0.5;
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateOverheadReachFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 60;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    let phase: 'start' | 'movement' | 'end_position' | 'return' = 'start';
    let armElevation = 0;
    
    if (progress < 0.4) {
      phase = 'movement';
      armElevation = Math.sin(progress / 0.4 * Math.PI / 2) * 1.0;
    } else if (progress < 0.6) {
      phase = 'end_position';
      armElevation = 1.0;
    } else {
      phase = 'return';
      armElevation = Math.cos((progress - 0.6) / 0.4 * Math.PI / 2) * 1.0;
    }
    
    frames.push({
      timestamp: (i / totalFrames) * 3000,
      landmarks: generateOverheadReachLandmarks(armElevation),
      jointAngles: {
        shoulder_flexion: armElevation * 180,
        shoulder_abduction: armElevation * 45,
        elbow_flexion: armElevation * 15
      },
      phase
    });
  }
  
  return frames;
}

function generateOverheadReachLandmarks(elevation: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Overhead reach modifications
    if (i >= 11 && i <= 22) { // Arm landmarks
      y += elevation * 0.8; // Arms go up
      z += elevation * 0.2; // Slight forward component
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

// Simplified generators for other movements
function generateWalkingFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 100;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const gaitCycle = Math.sin(progress * Math.PI * 4); // 4 steps in 5 seconds
    
    frames.push({
      timestamp: (i / totalFrames) * 5000,
      landmarks: generateWalkingLandmarks(gaitCycle, progress),
      phase: 'movement'
    });
  }
  
  return frames;
}

function generateWalkingLandmarks(gaitCycle: number, progress: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Walking pattern - alternate leg movement
    if (i >= 23 && i <= 28) { // Leg landmarks
      x += gaitCycle * 0.3; // Lateral shift
      z += Math.abs(gaitCycle) * 0.4; // Forward progression
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateSitToStandFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 60;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    let phase: 'start' | 'movement' | 'end_position' | 'return' = 'start';
    let standProgress = 0;
    
    if (progress < 0.2) {
      phase = 'start';
    } else if (progress < 0.8) {
      phase = 'movement';
      standProgress = (progress - 0.2) / 0.6;
    } else {
      phase = 'end_position';
      standProgress = 1.0;
    }
    
    frames.push({
      timestamp: (i / totalFrames) * 3000,
      landmarks: generateSitToStandLandmarks(standProgress),
      phase
    });
  }
  
  return frames;
}

function generateSitToStandLandmarks(progress: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Sit to stand - rising motion
    if (i >= 11 && i <= 28) { // Torso and legs
      y += progress * 0.6; // Rise up
      z += progress * 0.3; // Forward lean initially
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateSingleLegStandFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 60;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const sway = Math.sin(progress * Math.PI * 6) * 0.1; // Balance sway
    
    frames.push({
      timestamp: (i / totalFrames) * 3000,
      landmarks: generateSingleLegStandLandmarks(sway),
      phase: 'movement'
    });
  }
  
  return frames;
}

function generateSingleLegStandLandmarks(sway: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Single leg stand - one leg lifted, body sway
    if (i >= 25 && i <= 28) { // Right leg lifted
      y += 0.3;
    }
    if (i >= 11 && i <= 16) { // Body sway
      x += sway;
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateCrossBodyReachFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 40;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const reachAcross = Math.sin(progress * Math.PI) * 0.8;
    
    frames.push({
      timestamp: (i / totalFrames) * 2000,
      landmarks: generateCrossBodyReachLandmarks(reachAcross),
      phase: 'movement'
    });
  }
  
  return frames;
}

function generateCrossBodyReachLandmarks(reach: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Cross body reach - right arm across body
    if (i >= 11 && i <= 16 && i % 2 === 0) { // Right arm
      x -= reach;
      z += reach * 0.3;
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

function generateLungeFrames(): FunctionalMovement['baselineFrames'] {
  const frames: FunctionalMovement['baselineFrames'] = [];
  const totalFrames = 80;
  
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    let phase: 'start' | 'movement' | 'end_position' | 'return' = 'start';
    let lungeDepth = 0;
    
    if (progress < 0.3) {
      phase = 'movement';
      lungeDepth = Math.sin(progress / 0.3 * Math.PI / 2) * 0.8;
    } else if (progress < 0.5) {
      phase = 'end_position';
      lungeDepth = 0.8;
    } else if (progress < 0.8) {
      phase = 'return';
      lungeDepth = 0.8 * Math.cos((progress - 0.5) / 0.3 * Math.PI / 2);
    } else {
      phase = 'start';
      lungeDepth = 0;
    }
    
    frames.push({
      timestamp: (i / totalFrames) * 4000,
      landmarks: generateLungeLandmarks(lungeDepth),
      phase
    });
  }
  
  return frames;
}

function generateLungeLandmarks(depth: number): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = [];
  
  for (let i = 0; i < 33; i++) {
    let x = 0, y = 0, z = 0;
    
    // Lunge position - step forward with one leg
    if (i >= 25 && i <= 28) { // Right leg forward
      z += depth * 0.8;
      y -= depth * 0.3;
    }
    if (i >= 23 && i <= 24) { // Left leg back
      z -= depth * 0.2;
      y -= depth * 0.4;
    }
    
    landmarks.push({ x, y, z, visibility: 0.9 });
  }
  
  return landmarks;
}

export function getFunctionalMovement(movementId: string): FunctionalMovement | undefined {
  return FUNCTIONAL_MOVEMENTS.find(movement => movement.id === movementId);
}

export function getFunctionalMovementsByCategory(category: FunctionalMovement['category']): FunctionalMovement[] {
  return FUNCTIONAL_MOVEMENTS.filter(movement => movement.category === category);
}

export function getMovementsAffectedByCondition(condition: string): FunctionalMovement[] {
  return FUNCTIONAL_MOVEMENTS.filter(movement => 
    movement.affectedByConditions.some(affected => 
      condition.toLowerCase().includes(affected.toLowerCase()) ||
      affected.toLowerCase().includes(condition.toLowerCase())
    )
  );
}