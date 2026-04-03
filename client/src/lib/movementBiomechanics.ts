export interface JointForce {
  joint: string;
  label: string;
  forcePercent: number;
  baselinePercent: number;
  direction: 'compressive' | 'shear' | 'tensile' | 'torsional';
}

export interface MuscleActivation {
  muscle: string;
  activationPercent: number;
  role: 'agonist' | 'antagonist' | 'stabilizer' | 'synergist';
}

export interface BiomechanicsSnapshot {
  forces: JointForce[];
  muscles: MuscleActivation[];
  phase: string;
}

interface ForceProfile {
  joint: string;
  label: string;
  direction: 'compressive' | 'shear' | 'tensile' | 'torsional';
  baseline: number;
  curve: number[];
}

interface MuscleProfile {
  muscle: string;
  role: 'agonist' | 'antagonist' | 'stabilizer' | 'synergist';
  curve: number[];
}

interface PhaseLabel {
  range: [number, number];
  label: string;
}

interface MovementBiomechanics {
  forces: ForceProfile[];
  muscles: MuscleProfile[];
  phases: PhaseLabel[];
}

function sampleCurve(curve: number[], progress: number): number {
  if (curve.length === 0) return 0;
  if (curve.length === 1) return curve[0];
  const idx = progress * (curve.length - 1);
  const low = Math.floor(idx);
  const high = Math.min(low + 1, curve.length - 1);
  const t = idx - low;
  return curve[low] + (curve[high] - curve[low]) * t;
}

function getPhase(phases: PhaseLabel[], progress: number): string {
  for (const p of phases) {
    if (progress >= p.range[0] && progress <= p.range[1]) return p.label;
  }
  return 'Transition';
}

const MOVEMENT_BIOMECHANICS: Record<string, MovementBiomechanics> = {
  squat: {
    forces: [
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 40, curve: [40, 55, 75, 95, 100, 95, 75, 55, 40] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 30, curve: [30, 45, 65, 85, 90, 85, 65, 45, 30] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'compressive', baseline: 30, curve: [30, 45, 65, 85, 90, 85, 65, 45, 30] },
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 25, curve: [25, 45, 70, 90, 95, 90, 70, 45, 25] },
      { joint: 'right_knee', label: 'Right Knee', direction: 'compressive', baseline: 25, curve: [25, 45, 70, 90, 95, 90, 70, 45, 25] },
      { joint: 'left_ankle', label: 'Left Ankle', direction: 'compressive', baseline: 20, curve: [20, 35, 50, 65, 70, 65, 50, 35, 20] },
      { joint: 'right_ankle', label: 'Right Ankle', direction: 'compressive', baseline: 20, curve: [20, 35, 50, 65, 70, 65, 50, 35, 20] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 15, curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
    ],
    muscles: [
      { muscle: 'Quadriceps', role: 'agonist', curve: [10, 30, 55, 80, 90, 80, 55, 30, 10] },
      { muscle: 'Gluteus Maximus', role: 'agonist', curve: [10, 25, 50, 75, 85, 75, 50, 25, 10] },
      { muscle: 'Hamstrings', role: 'synergist', curve: [15, 25, 40, 55, 60, 55, 40, 25, 15] },
      { muscle: 'Erector Spinae', role: 'stabilizer', curve: [20, 35, 50, 65, 70, 65, 50, 35, 20] },
      { muscle: 'Core / Transversus', role: 'stabilizer', curve: [25, 35, 45, 55, 60, 55, 45, 35, 25] },
      { muscle: 'Gastrocnemius', role: 'stabilizer', curve: [10, 20, 30, 40, 45, 40, 30, 20, 10] },
      { muscle: 'Tibialis Anterior', role: 'antagonist', curve: [15, 20, 25, 30, 35, 30, 25, 20, 15] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Descent (Eccentric)' },
      { range: [0.45, 0.55], label: 'Bottom Position' },
      { range: [0.55, 0.9], label: 'Ascent (Concentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  walk: {
    forces: [
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 30, curve: [50, 65, 80, 70, 40, 30, 35, 45, 50] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'compressive', baseline: 30, curve: [30, 35, 45, 50, 65, 80, 70, 40, 30] },
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 20, curve: [55, 70, 60, 40, 25, 20, 30, 45, 55] },
      { joint: 'right_knee', label: 'Right Knee', direction: 'compressive', baseline: 20, curve: [20, 30, 45, 55, 70, 60, 40, 25, 20] },
      { joint: 'left_ankle', label: 'Left Ankle', direction: 'compressive', baseline: 15, curve: [40, 55, 70, 50, 20, 15, 20, 30, 40] },
      { joint: 'right_ankle', label: 'Right Ankle', direction: 'compressive', baseline: 15, curve: [15, 20, 30, 40, 55, 70, 50, 20, 15] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 30, curve: [35, 40, 45, 40, 35, 40, 45, 40, 35] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'torsional', baseline: 10, curve: [15, 20, 25, 20, 15, 20, 25, 20, 15] },
    ],
    muscles: [
      { muscle: 'Gluteus Medius (L)', role: 'stabilizer', curve: [60, 70, 55, 30, 15, 10, 15, 40, 60] },
      { muscle: 'Gluteus Medius (R)', role: 'stabilizer', curve: [10, 15, 40, 60, 70, 55, 30, 15, 10] },
      { muscle: 'Quadriceps (L)', role: 'agonist', curve: [50, 60, 40, 25, 10, 15, 30, 45, 50] },
      { muscle: 'Quadriceps (R)', role: 'agonist', curve: [15, 30, 45, 50, 60, 40, 25, 10, 15] },
      { muscle: 'Gastrocnemius (L)', role: 'agonist', curve: [30, 50, 75, 60, 10, 5, 10, 20, 30] },
      { muscle: 'Gastrocnemius (R)', role: 'agonist', curve: [5, 10, 20, 30, 50, 75, 60, 10, 5] },
      { muscle: 'Hip Flexors (L)', role: 'agonist', curve: [5, 10, 15, 40, 60, 50, 20, 10, 5] },
      { muscle: 'Hip Flexors (R)', role: 'agonist', curve: [50, 20, 10, 5, 10, 15, 40, 60, 50] },
    ],
    phases: [
      { range: [0, 0.15], label: 'L Heel Strike' },
      { range: [0.15, 0.35], label: 'L Midstance' },
      { range: [0.35, 0.5], label: 'L Push-Off' },
      { range: [0.5, 0.65], label: 'R Heel Strike' },
      { range: [0.65, 0.85], label: 'R Midstance' },
      { range: [0.85, 1], label: 'R Push-Off' },
    ],
  },
  lunge: {
    forces: [
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 25, curve: [25, 50, 80, 95, 100, 95, 80, 50, 25] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 30, curve: [30, 50, 70, 85, 90, 85, 70, 50, 30] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'tensile', baseline: 20, curve: [20, 35, 50, 60, 65, 60, 50, 35, 20] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 35, curve: [35, 45, 60, 70, 75, 70, 60, 45, 35] },
      { joint: 'left_ankle', label: 'Left Ankle', direction: 'compressive', baseline: 20, curve: [20, 35, 50, 60, 65, 60, 50, 35, 20] },
    ],
    muscles: [
      { muscle: 'Quadriceps (Lead)', role: 'agonist', curve: [10, 35, 60, 85, 90, 85, 60, 35, 10] },
      { muscle: 'Gluteus Maximus', role: 'agonist', curve: [15, 30, 55, 75, 80, 75, 55, 30, 15] },
      { muscle: 'Hip Flexors (Trail)', role: 'antagonist', curve: [10, 25, 45, 60, 65, 60, 45, 25, 10] },
      { muscle: 'Core / Obliques', role: 'stabilizer', curve: [20, 30, 40, 50, 55, 50, 40, 30, 20] },
      { muscle: 'Gastrocnemius', role: 'stabilizer', curve: [10, 20, 35, 45, 50, 45, 35, 20, 10] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Step Forward (Eccentric)' },
      { range: [0.45, 0.55], label: 'Bottom Position' },
      { range: [0.55, 0.9], label: 'Push Back (Concentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  singleLegBalance: {
    forces: [
      { joint: 'left_hip', label: 'Stance Hip', direction: 'compressive', baseline: 50, curve: [30, 60, 75, 80, 85, 80, 75, 60, 30] },
      { joint: 'left_knee', label: 'Stance Knee', direction: 'compressive', baseline: 35, curve: [25, 45, 55, 60, 65, 60, 55, 45, 25] },
      { joint: 'left_ankle', label: 'Stance Ankle', direction: 'compressive', baseline: 30, curve: [20, 40, 50, 55, 60, 55, 50, 40, 20] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 20, curve: [10, 25, 35, 40, 45, 40, 35, 25, 10] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'shear', baseline: 25, curve: [20, 30, 40, 45, 50, 45, 40, 30, 20] },
    ],
    muscles: [
      { muscle: 'Gluteus Medius', role: 'stabilizer', curve: [20, 55, 75, 85, 90, 85, 75, 55, 20] },
      { muscle: 'Gluteus Minimus', role: 'stabilizer', curve: [15, 40, 60, 70, 75, 70, 60, 40, 15] },
      { muscle: 'Quadriceps', role: 'stabilizer', curve: [15, 30, 45, 50, 55, 50, 45, 30, 15] },
      { muscle: 'Tibialis Posterior', role: 'stabilizer', curve: [10, 35, 50, 60, 65, 60, 50, 35, 10] },
      { muscle: 'Peroneals', role: 'stabilizer', curve: [10, 30, 45, 55, 60, 55, 45, 30, 10] },
      { muscle: 'Core / TA', role: 'stabilizer', curve: [25, 40, 55, 60, 65, 60, 55, 40, 25] },
    ],
    phases: [
      { range: [0, 0.15], label: 'Weight Shift' },
      { range: [0.15, 0.45], label: 'Leg Lift' },
      { range: [0.45, 0.7], label: 'Single Leg Hold' },
      { range: [0.7, 0.9], label: 'Leg Lower' },
      { range: [0.9, 1], label: 'Return' },
    ],
  },
  hipCircles: {
    forces: [
      { joint: 'left_hip', label: 'Left Hip', direction: 'torsional', baseline: 25, curve: [30, 45, 55, 60, 55, 45, 55, 60, 55, 45, 30] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'torsional', baseline: 25, curve: [30, 45, 55, 60, 55, 45, 55, 60, 55, 45, 30] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'torsional', baseline: 20, curve: [25, 35, 45, 50, 45, 35, 45, 50, 45, 35, 25] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'torsional', baseline: 15, curve: [20, 30, 40, 45, 40, 30, 40, 45, 40, 30, 20] },
    ],
    muscles: [
      { muscle: 'Hip Rotators', role: 'agonist', curve: [20, 40, 55, 65, 55, 40, 55, 65, 55, 40, 20] },
      { muscle: 'Gluteus Medius', role: 'agonist', curve: [15, 35, 50, 60, 50, 35, 50, 60, 50, 35, 15] },
      { muscle: 'Adductors', role: 'synergist', curve: [10, 30, 45, 50, 45, 30, 45, 50, 45, 30, 10] },
      { muscle: 'Core / Obliques', role: 'stabilizer', curve: [25, 35, 40, 45, 40, 35, 40, 45, 40, 35, 25] },
    ],
    phases: [
      { range: [0, 0.25], label: 'Forward Arc' },
      { range: [0.25, 0.5], label: 'Lateral Arc' },
      { range: [0.5, 0.75], label: 'Backward Arc' },
      { range: [0.75, 1], label: 'Return Arc' },
    ],
  },
  shoulderCircles: {
    forces: [
      { joint: 'left_shoulder', label: 'Left GH Joint', direction: 'tensile', baseline: 15, curve: [20, 35, 55, 65, 60, 45, 55, 65, 55, 35, 20] },
      { joint: 'right_shoulder', label: 'Right GH Joint', direction: 'tensile', baseline: 15, curve: [20, 35, 55, 65, 60, 45, 55, 65, 55, 35, 20] },
      { joint: 'left_scapula', label: 'Left Scapulothoracic', direction: 'shear', baseline: 10, curve: [15, 25, 40, 50, 45, 30, 40, 50, 40, 25, 15] },
      { joint: 'right_scapula', label: 'Right Scapulothoracic', direction: 'shear', baseline: 10, curve: [15, 25, 40, 50, 45, 30, 40, 50, 40, 25, 15] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 15, curve: [18, 22, 30, 35, 32, 25, 30, 35, 30, 22, 18] },
    ],
    muscles: [
      { muscle: 'Deltoid', role: 'agonist', curve: [15, 35, 55, 70, 65, 40, 55, 70, 55, 35, 15] },
      { muscle: 'Rotator Cuff', role: 'stabilizer', curve: [20, 40, 55, 65, 60, 45, 55, 65, 55, 40, 20] },
      { muscle: 'Upper Trapezius', role: 'synergist', curve: [10, 30, 50, 60, 50, 30, 50, 60, 50, 30, 10] },
      { muscle: 'Serratus Anterior', role: 'stabilizer', curve: [15, 30, 45, 55, 50, 35, 45, 55, 45, 30, 15] },
      { muscle: 'Rhomboids', role: 'antagonist', curve: [20, 25, 30, 35, 40, 45, 35, 30, 35, 25, 20] },
    ],
    phases: [
      { range: [0, 0.25], label: 'Elevation' },
      { range: [0.25, 0.5], label: 'Retraction' },
      { range: [0.5, 0.75], label: 'Depression' },
      { range: [0.75, 1], label: 'Protraction' },
    ],
  },
  neckMobility: {
    forces: [
      { joint: 'cervical_spine', label: 'Cervical Spine', direction: 'compressive', baseline: 20, curve: [25, 40, 55, 50, 30, 40, 55, 50, 25] },
      { joint: 'thoracic_spine', label: 'Upper Thoracic', direction: 'compressive', baseline: 15, curve: [18, 25, 30, 28, 20, 25, 30, 28, 18] },
    ],
    muscles: [
      { muscle: 'SCM', role: 'agonist', curve: [10, 30, 50, 45, 15, 30, 50, 45, 10] },
      { muscle: 'Upper Trapezius', role: 'synergist', curve: [15, 25, 40, 35, 20, 25, 40, 35, 15] },
      { muscle: 'Scalenes', role: 'agonist', curve: [10, 20, 35, 40, 15, 20, 35, 40, 10] },
      { muscle: 'Deep Cervical Flexors', role: 'stabilizer', curve: [25, 35, 40, 38, 30, 35, 40, 38, 25] },
      { muscle: 'Suboccipitals', role: 'antagonist', curve: [20, 15, 10, 15, 25, 15, 10, 15, 20] },
    ],
    phases: [
      { range: [0, 0.25], label: 'Flexion' },
      { range: [0.25, 0.5], label: 'Extension' },
      { range: [0.5, 0.75], label: 'Lateral Flexion' },
      { range: [0.75, 1], label: 'Rotation' },
    ],
  },
  forwardBend: {
    forces: [
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 40, curve: [40, 60, 80, 95, 100, 95, 80, 60, 40] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 25, curve: [25, 35, 50, 60, 65, 60, 50, 35, 25] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 25, curve: [25, 40, 55, 65, 70, 65, 55, 40, 25] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'compressive', baseline: 25, curve: [25, 40, 55, 65, 70, 65, 55, 40, 25] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 15, curve: [15, 25, 40, 50, 55, 50, 40, 25, 15] },
    ],
    muscles: [
      { muscle: 'Erector Spinae', role: 'antagonist', curve: [20, 45, 70, 85, 90, 85, 70, 45, 20] },
      { muscle: 'Hamstrings', role: 'agonist', curve: [10, 30, 55, 70, 75, 70, 55, 30, 10] },
      { muscle: 'Gluteus Maximus', role: 'synergist', curve: [10, 25, 40, 50, 55, 50, 40, 25, 10] },
      { muscle: 'Rectus Abdominis', role: 'agonist', curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
      { muscle: 'Multifidus', role: 'stabilizer', curve: [25, 40, 55, 65, 70, 65, 55, 40, 25] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Flexion (Eccentric)' },
      { range: [0.45, 0.55], label: 'End Range' },
      { range: [0.55, 0.9], label: 'Extension (Concentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  backwardBend: {
    forces: [
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 40, curve: [40, 55, 75, 90, 95, 90, 75, 55, 40] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 20, curve: [20, 30, 45, 55, 60, 55, 45, 30, 20] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'tensile', baseline: 15, curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'tensile', baseline: 15, curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
    ],
    muscles: [
      { muscle: 'Erector Spinae', role: 'agonist', curve: [20, 45, 70, 85, 90, 85, 70, 45, 20] },
      { muscle: 'Multifidus', role: 'agonist', curve: [20, 40, 55, 65, 70, 65, 55, 40, 20] },
      { muscle: 'Rectus Abdominis', role: 'antagonist', curve: [15, 25, 40, 55, 60, 55, 40, 25, 15] },
      { muscle: 'Hip Flexors', role: 'stabilizer', curve: [10, 25, 40, 50, 55, 50, 40, 25, 10] },
      { muscle: 'Gluteus Maximus', role: 'stabilizer', curve: [15, 20, 30, 35, 40, 35, 30, 20, 15] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Extension (Concentric)' },
      { range: [0.45, 0.55], label: 'End Range' },
      { range: [0.55, 0.9], label: 'Return (Eccentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  calfRaises: {
    forces: [
      { joint: 'left_ankle', label: 'Left Ankle', direction: 'compressive', baseline: 30, curve: [30, 50, 75, 90, 95, 90, 75, 50, 30] },
      { joint: 'right_ankle', label: 'Right Ankle', direction: 'compressive', baseline: 30, curve: [30, 50, 75, 90, 95, 90, 75, 50, 30] },
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 15, curve: [15, 20, 30, 35, 40, 35, 30, 20, 15] },
      { joint: 'right_knee', label: 'Right Knee', direction: 'compressive', baseline: 15, curve: [15, 20, 30, 35, 40, 35, 30, 20, 15] },
    ],
    muscles: [
      { muscle: 'Gastrocnemius', role: 'agonist', curve: [10, 40, 70, 85, 90, 85, 70, 40, 10] },
      { muscle: 'Soleus', role: 'agonist', curve: [15, 40, 65, 80, 85, 80, 65, 40, 15] },
      { muscle: 'Tibialis Anterior', role: 'antagonist', curve: [20, 15, 10, 8, 5, 8, 10, 15, 20] },
      { muscle: 'Peroneals', role: 'stabilizer', curve: [10, 25, 40, 50, 55, 50, 40, 25, 10] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Rise (Concentric)' },
      { range: [0.45, 0.55], label: 'Peak' },
      { range: [0.55, 0.9], label: 'Lower (Eccentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  armElevations: {
    forces: [
      { joint: 'left_shoulder', label: 'Left GH Joint', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'right_shoulder', label: 'Right GH Joint', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'left_scapula', label: 'Left Scapulothoracic', direction: 'shear', baseline: 10, curve: [10, 20, 40, 55, 65, 55, 40, 20, 10] },
      { joint: 'right_scapula', label: 'Right Scapulothoracic', direction: 'shear', baseline: 10, curve: [10, 20, 40, 55, 65, 55, 40, 20, 10] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 15, curve: [15, 20, 30, 40, 45, 40, 30, 20, 15] },
    ],
    muscles: [
      { muscle: 'Anterior Deltoid', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Supraspinatus', role: 'agonist', curve: [10, 30, 55, 70, 75, 70, 55, 30, 10] },
      { muscle: 'Upper Trapezius', role: 'synergist', curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { muscle: 'Serratus Anterior', role: 'synergist', curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { muscle: 'Rotator Cuff', role: 'stabilizer', curve: [20, 35, 50, 60, 65, 60, 50, 35, 20] },
      { muscle: 'Lower Trapezius', role: 'stabilizer', curve: [10, 20, 35, 50, 60, 50, 35, 20, 10] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Arms at Side' },
      { range: [0.1, 0.45], label: 'Elevation (Concentric)' },
      { range: [0.45, 0.55], label: 'Overhead' },
      { range: [0.55, 0.9], label: 'Lowering (Eccentric)' },
      { range: [0.9, 1], label: 'Arms at Side' },
    ],
  },
  hipHinge: {
    forces: [
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 45, curve: [45, 60, 80, 95, 100, 95, 80, 60, 45] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 30, curve: [30, 50, 70, 85, 90, 85, 70, 50, 30] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'compressive', baseline: 30, curve: [30, 50, 70, 85, 90, 85, 70, 50, 30] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 15, curve: [15, 30, 45, 55, 60, 55, 45, 30, 15] },
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 15, curve: [15, 20, 25, 30, 35, 30, 25, 20, 15] },
      { joint: 'right_knee', label: 'Right Knee', direction: 'compressive', baseline: 15, curve: [15, 20, 25, 30, 35, 30, 25, 20, 15] },
    ],
    muscles: [
      { muscle: 'Gluteus Maximus', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Hamstrings', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Erector Spinae', role: 'stabilizer', curve: [25, 45, 65, 80, 85, 80, 65, 45, 25] },
      { muscle: 'Core / TA', role: 'stabilizer', curve: [25, 35, 50, 60, 65, 60, 50, 35, 25] },
      { muscle: 'Quadriceps', role: 'antagonist', curve: [10, 15, 20, 25, 25, 25, 20, 15, 10] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Hinge Down (Eccentric)' },
      { range: [0.45, 0.55], label: 'Bottom Position' },
      { range: [0.55, 0.9], label: 'Drive Up (Concentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  shoulderAbduction: {
    forces: [
      { joint: 'left_shoulder', label: 'Left GH Joint', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'right_shoulder', label: 'Right GH Joint', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'left_scapula', label: 'Left Scapulothoracic', direction: 'shear', baseline: 10, curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { joint: 'right_scapula', label: 'Right Scapulothoracic', direction: 'shear', baseline: 10, curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 12, curve: [12, 18, 28, 35, 40, 35, 28, 18, 12] },
    ],
    muscles: [
      { muscle: 'Middle Deltoid', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Supraspinatus', role: 'agonist', curve: [15, 40, 60, 70, 65, 55, 40, 25, 15] },
      { muscle: 'Upper Trapezius', role: 'synergist', curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { muscle: 'Serratus Anterior', role: 'synergist', curve: [10, 25, 45, 60, 70, 60, 45, 25, 10] },
      { muscle: 'Infraspinatus', role: 'stabilizer', curve: [15, 30, 45, 55, 60, 55, 45, 30, 15] },
      { muscle: 'Subscapularis', role: 'stabilizer', curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Arms at Side' },
      { range: [0.1, 0.3], label: '0-60° (Supraspinatus)' },
      { range: [0.3, 0.45], label: '60-120° (Deltoid Peak)' },
      { range: [0.45, 0.55], label: '120-180° (Full Abduction)' },
      { range: [0.55, 0.9], label: 'Lowering (Eccentric)' },
      { range: [0.9, 1], label: 'Arms at Side' },
    ],
  },
  lateralLunge: {
    forces: [
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 25, curve: [25, 45, 70, 85, 90, 85, 70, 45, 25] },
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 25, curve: [25, 45, 65, 80, 85, 80, 65, 45, 25] },
      { joint: 'right_hip', label: 'Right Hip (Adductor stretch)', direction: 'tensile', baseline: 15, curve: [15, 30, 50, 60, 65, 60, 50, 30, 15] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'shear', baseline: 25, curve: [25, 35, 50, 60, 65, 60, 50, 35, 25] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 15, curve: [15, 25, 40, 50, 55, 50, 40, 25, 15] },
    ],
    muscles: [
      { muscle: 'Quadriceps (Lead)', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Gluteus Medius', role: 'agonist', curve: [15, 35, 55, 70, 75, 70, 55, 35, 15] },
      { muscle: 'Adductors (Trail)', role: 'antagonist', curve: [10, 30, 55, 70, 75, 70, 55, 30, 10] },
      { muscle: 'Gluteus Maximus', role: 'synergist', curve: [10, 25, 45, 60, 65, 60, 45, 25, 10] },
      { muscle: 'Core / Obliques', role: 'stabilizer', curve: [20, 30, 40, 50, 55, 50, 40, 30, 20] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Standing' },
      { range: [0.1, 0.45], label: 'Step Out (Eccentric)' },
      { range: [0.45, 0.55], label: 'Bottom Position' },
      { range: [0.55, 0.9], label: 'Push Back (Concentric)' },
      { range: [0.9, 1], label: 'Standing' },
    ],
  },
  trunkRotation: {
    forces: [
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'torsional', baseline: 20, curve: [20, 40, 55, 65, 55, 40, 55, 65, 55, 40, 20] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'torsional', baseline: 30, curve: [30, 45, 55, 60, 55, 45, 55, 60, 55, 45, 30] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'torsional', baseline: 15, curve: [15, 25, 35, 40, 35, 25, 35, 40, 35, 25, 15] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'torsional', baseline: 10, curve: [10, 20, 30, 35, 30, 20, 15, 10, 15, 20, 10] },
      { joint: 'right_hip', label: 'Right Hip', direction: 'torsional', baseline: 10, curve: [10, 15, 10, 15, 20, 30, 35, 30, 20, 15, 10] },
    ],
    muscles: [
      { muscle: 'External Obliques', role: 'agonist', curve: [10, 35, 55, 70, 55, 35, 55, 70, 55, 35, 10] },
      { muscle: 'Internal Obliques', role: 'agonist', curve: [10, 30, 50, 65, 50, 30, 50, 65, 50, 30, 10] },
      { muscle: 'Erector Spinae', role: 'stabilizer', curve: [20, 30, 40, 45, 40, 30, 40, 45, 40, 30, 20] },
      { muscle: 'Multifidus', role: 'stabilizer', curve: [25, 35, 45, 50, 45, 35, 45, 50, 45, 35, 25] },
      { muscle: 'Rectus Abdominis', role: 'synergist', curve: [15, 20, 25, 30, 25, 20, 25, 30, 25, 20, 15] },
    ],
    phases: [
      { range: [0, 0.05], label: 'Neutral' },
      { range: [0.05, 0.25], label: 'Rotation Left' },
      { range: [0.25, 0.5], label: 'Return to Center' },
      { range: [0.5, 0.75], label: 'Rotation Right' },
      { range: [0.75, 1], label: 'Return to Center' },
    ],
  },
  lateralFlexion: {
    forces: [
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'shear', baseline: 25, curve: [25, 45, 60, 50, 25, 45, 60, 50, 25] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'shear', baseline: 15, curve: [15, 30, 45, 35, 15, 30, 45, 35, 15] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 10, curve: [10, 20, 30, 25, 10, 20, 30, 25, 10] },
    ],
    muscles: [
      { muscle: 'Quadratus Lumborum', role: 'agonist', curve: [10, 40, 65, 50, 10, 40, 65, 50, 10] },
      { muscle: 'External Obliques', role: 'agonist', curve: [10, 35, 55, 45, 10, 35, 55, 45, 10] },
      { muscle: 'Internal Obliques', role: 'synergist', curve: [10, 30, 50, 40, 10, 30, 50, 40, 10] },
      { muscle: 'Erector Spinae', role: 'stabilizer', curve: [20, 35, 45, 40, 20, 35, 45, 40, 20] },
      { muscle: 'Intercostals', role: 'synergist', curve: [5, 20, 35, 25, 5, 20, 35, 25, 5] },
    ],
    phases: [
      { range: [0, 0.05], label: 'Neutral' },
      { range: [0.05, 0.25], label: 'Left Lateral Flexion' },
      { range: [0.25, 0.5], label: 'Return to Center' },
      { range: [0.5, 0.75], label: 'Right Lateral Flexion' },
      { range: [0.75, 1], label: 'Return to Center' },
    ],
  },
  elbowFlexion: {
    forces: [
      { joint: 'left_elbow', label: 'Left Elbow', direction: 'compressive', baseline: 10, curve: [10, 25, 45, 55, 60, 55, 45, 25, 10] },
      { joint: 'right_elbow', label: 'Right Elbow', direction: 'compressive', baseline: 10, curve: [10, 25, 45, 55, 60, 55, 45, 25, 10] },
      { joint: 'left_shoulder', label: 'Left Shoulder', direction: 'compressive', baseline: 10, curve: [10, 15, 20, 25, 28, 25, 20, 15, 10] },
      { joint: 'right_shoulder', label: 'Right Shoulder', direction: 'compressive', baseline: 10, curve: [10, 15, 20, 25, 28, 25, 20, 15, 10] },
    ],
    muscles: [
      { muscle: 'Biceps Brachii', role: 'agonist', curve: [10, 35, 60, 80, 85, 80, 60, 35, 10] },
      { muscle: 'Brachialis', role: 'agonist', curve: [10, 30, 55, 70, 75, 70, 55, 30, 10] },
      { muscle: 'Brachioradialis', role: 'synergist', curve: [5, 20, 40, 55, 60, 55, 40, 20, 5] },
      { muscle: 'Triceps Brachii', role: 'antagonist', curve: [15, 12, 8, 5, 5, 5, 8, 12, 15] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Arms Extended' },
      { range: [0.1, 0.45], label: 'Flexion (Concentric)' },
      { range: [0.45, 0.55], label: 'Peak Flexion' },
      { range: [0.55, 0.9], label: 'Extension (Eccentric)' },
      { range: [0.9, 1], label: 'Arms Extended' },
    ],
  },
  stepUp: {
    forces: [
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 25, curve: [25, 50, 75, 90, 80, 60, 75, 85, 70, 40, 25] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 30, curve: [30, 55, 75, 85, 70, 50, 65, 80, 65, 40, 30] },
      { joint: 'right_ankle', label: 'Right Ankle', direction: 'compressive', baseline: 20, curve: [30, 45, 55, 40, 20, 15, 25, 35, 45, 35, 30] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 30, curve: [30, 40, 50, 55, 45, 35, 45, 55, 50, 40, 30] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 15, curve: [15, 25, 35, 40, 30, 20, 30, 40, 35, 25, 15] },
    ],
    muscles: [
      { muscle: 'Quadriceps (Lead)', role: 'agonist', curve: [10, 40, 70, 85, 65, 40, 60, 80, 60, 30, 10] },
      { muscle: 'Gluteus Maximus', role: 'agonist', curve: [10, 35, 60, 80, 70, 45, 55, 75, 55, 30, 10] },
      { muscle: 'Gluteus Medius', role: 'stabilizer', curve: [15, 40, 55, 65, 55, 40, 50, 60, 50, 35, 15] },
      { muscle: 'Gastrocnemius', role: 'synergist', curve: [20, 30, 40, 35, 20, 15, 25, 35, 40, 30, 20] },
      { muscle: 'Core / TA', role: 'stabilizer', curve: [20, 30, 40, 45, 40, 30, 35, 45, 40, 30, 20] },
    ],
    phases: [
      { range: [0, 0.15], label: 'Approach' },
      { range: [0.15, 0.45], label: 'Step Up (Concentric)' },
      { range: [0.45, 0.55], label: 'Top Position' },
      { range: [0.55, 0.85], label: 'Step Down (Eccentric)' },
      { range: [0.85, 1], label: 'Return' },
    ],
  },
  single_leg_squat: {
    forces: [
      { joint: 'left_knee', label: 'Left Knee', direction: 'compressive', baseline: 30, curve: [30, 55, 80, 100, 105, 100, 80, 55, 30] },
      { joint: 'left_hip', label: 'Left Hip', direction: 'compressive', baseline: 35, curve: [35, 55, 75, 95, 100, 95, 75, 55, 35] },
      { joint: 'left_ankle', label: 'Left Ankle', direction: 'compressive', baseline: 25, curve: [25, 40, 55, 70, 75, 70, 55, 40, 25] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 35, curve: [35, 50, 65, 80, 85, 80, 65, 50, 35] },
      { joint: 'pelvis', label: 'Pelvis', direction: 'shear', baseline: 20, curve: [20, 35, 50, 60, 65, 60, 50, 35, 20] },
    ],
    muscles: [
      { muscle: 'Quadriceps (Stance)', role: 'agonist', curve: [10, 35, 65, 90, 95, 90, 65, 35, 10] },
      { muscle: 'Gluteus Maximus', role: 'agonist', curve: [10, 30, 55, 80, 85, 80, 55, 30, 10] },
      { muscle: 'Gluteus Medius', role: 'stabilizer', curve: [25, 50, 70, 85, 90, 85, 70, 50, 25] },
      { muscle: 'Hamstrings', role: 'synergist', curve: [15, 30, 45, 60, 65, 60, 45, 30, 15] },
      { muscle: 'Core / Obliques', role: 'stabilizer', curve: [25, 40, 55, 65, 70, 65, 55, 40, 25] },
      { muscle: 'Tibialis Posterior', role: 'stabilizer', curve: [20, 35, 50, 60, 65, 60, 50, 35, 20] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Single Leg Stance' },
      { range: [0.1, 0.45], label: 'Descent (Eccentric)' },
      { range: [0.45, 0.55], label: 'Bottom Position' },
      { range: [0.55, 0.9], label: 'Ascent (Concentric)' },
      { range: [0.9, 1], label: 'Single Leg Stance' },
    ],
  },
  overhead_reach: {
    forces: [
      { joint: 'left_shoulder', label: 'Left Shoulder', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'right_shoulder', label: 'Right Shoulder', direction: 'compressive', baseline: 15, curve: [15, 30, 55, 75, 85, 75, 55, 30, 15] },
      { joint: 'cervical_spine', label: 'Cervical Spine', direction: 'compressive', baseline: 20, curve: [20, 30, 40, 50, 55, 50, 40, 30, 20] },
      { joint: 'thoracic_spine', label: 'Thoracic Spine', direction: 'compressive', baseline: 25, curve: [25, 35, 50, 60, 65, 60, 50, 35, 25] },
      { joint: 'lumbar_spine', label: 'Lumbar Spine', direction: 'compressive', baseline: 30, curve: [30, 40, 50, 60, 65, 60, 50, 40, 30] },
    ],
    muscles: [
      { muscle: 'Deltoid', role: 'agonist', curve: [10, 30, 60, 80, 90, 80, 60, 30, 10] },
      { muscle: 'Upper Trapezius', role: 'synergist', curve: [15, 30, 50, 70, 75, 70, 50, 30, 15] },
      { muscle: 'Serratus Anterior', role: 'stabilizer', curve: [10, 25, 45, 65, 75, 65, 45, 25, 10] },
      { muscle: 'Lower Trapezius', role: 'stabilizer', curve: [15, 30, 50, 60, 65, 60, 50, 30, 15] },
      { muscle: 'Rotator Cuff', role: 'stabilizer', curve: [20, 35, 55, 70, 80, 70, 55, 35, 20] },
      { muscle: 'Core / TA', role: 'stabilizer', curve: [15, 25, 35, 45, 50, 45, 35, 25, 15] },
      { muscle: 'Latissimus Dorsi', role: 'antagonist', curve: [30, 25, 20, 15, 10, 15, 20, 25, 30] },
    ],
    phases: [
      { range: [0, 0.1], label: 'Arms at Side' },
      { range: [0.1, 0.45], label: 'Elevation (Concentric)' },
      { range: [0.45, 0.55], label: 'Full Overhead' },
      { range: [0.55, 0.9], label: 'Lowering (Eccentric)' },
      { range: [0.9, 1], label: 'Arms at Side' },
    ],
  },
};

export function getMovementBiomechanics(
  movementId: string,
  progress: number,
  restrictionOverloads?: Record<string, number>
): BiomechanicsSnapshot | null {
  const bio = MOVEMENT_BIOMECHANICS[movementId];
  if (!bio) return null;

  const p = Math.max(0, Math.min(1, progress));

  const forces: JointForce[] = bio.forces.map(f => {
    let forcePercent = sampleCurve(f.curve, p);
    const overloadKey = f.joint;
    if (restrictionOverloads && restrictionOverloads[overloadKey]) {
      forcePercent = Math.min(100, forcePercent * (1 + restrictionOverloads[overloadKey] / 100));
    }
    return {
      joint: f.joint,
      label: f.label,
      forcePercent: Math.round(forcePercent),
      baselinePercent: f.baseline,
      direction: f.direction,
    };
  });

  const muscles: MuscleActivation[] = bio.muscles.map(m => ({
    muscle: m.muscle,
    activationPercent: Math.round(sampleCurve(m.curve, p)),
    role: m.role,
  }));

  const phase = getPhase(bio.phases, p);

  return { forces, muscles, phase };
}

export function computeRestrictionOverloads(
  compensationPatterns: Array<{ compensatingJoint: string; additionalLoad: number }>
): Record<string, number> {
  const overloads: Record<string, number> = {};
  for (const p of compensationPatterns) {
    const key = p.compensatingJoint;
    overloads[key] = (overloads[key] || 0) + p.additionalLoad;
  }
  return overloads;
}
