export interface CatalogExercise {
  id: string;
  name: string;
  category: 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'functional' | 'stabilization' | 'manual';
  bodyParts: string[];
  baseSets: number;
  baseReps: string;
  baseHold?: number;
  equipment: string[];
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { id: 'sh021', name: 'Scapular Wall Slides', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-15', equipment: ['Wall'] },
  { id: 'sh024', name: 'Prone Y-Raises', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Light weights'] },
  { id: 'sh023', name: "Prone T's", category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Light weights'] },
  { id: 'sh029', name: 'Push-up Plus', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'sh027', name: 'Serratus Punch', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '15', equipment: ['Resistance band'] },
  { id: 'sh011', name: 'External Rotation - 0° Abduction', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh043', name: 'Doorway Chest Stretch', category: 'stretching', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Doorway'] },
  { id: 'sh046', name: 'Upper Trapezius Stretch', category: 'stretching', bodyParts: ['cervical', 'shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'sh041', name: 'Sleeper Stretch', category: 'stretching', bodyParts: ['shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'nk008', name: 'Chin Tucks', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10-15', baseHold: 5, equipment: [] },
  { id: 'nk017', name: 'Deep Neck Flexor Training', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10', baseHold: 10, equipment: [] },
  { id: 'nk011', name: 'Isometric Neck Flexion', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10', baseHold: 5, equipment: [] },
  { id: 'hp011', name: 'Glute Bridges', category: 'strengthening', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '15-20', baseHold: 5, equipment: [] },
  { id: 'hp012', name: 'Single Leg Glute Bridge', category: 'strengthening', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'hp015', name: 'Clamshells', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15-20', equipment: [] },
  { id: 'hp019', name: 'Monster Walks', category: 'strengthening', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '15 steps', equipment: ['Resistance band'] },
  { id: 'hp013', name: 'Hip Thrusts', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '12-15', equipment: ['Bench'] },
  { id: 'hp020', name: 'Lateral Band Walks', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15 steps', equipment: ['Resistance band'] },
  { id: 'cb001', name: 'Dead Bug', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'cb002', name: 'Bird Dog', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'cb003', name: 'Plank', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'cb004', name: 'Side Plank', category: 'stabilization', bodyParts: ['lumbar', 'core', 'hip'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'cb006', name: 'Pallof Press', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '12-15', equipment: ['Resistance band'] },
  { id: 'cb021', name: 'Cat-Cow Stretch', category: 'mobility', bodyParts: ['thoracic', 'lumbar'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'kn001', name: 'Quadriceps Sets', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '10-15', baseHold: 5, equipment: [] },
  { id: 'kn007', name: 'Terminal Knee Extension', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },
  { id: 'kn009', name: 'Wall Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-15', equipment: ['Wall'] },
  { id: 'kn011', name: 'Full Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '12-15', equipment: [] },
  { id: 'kn024', name: 'Nordic Curls', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '6-8', equipment: [] },
  { id: 'kn015', name: 'Bulgarian Split Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-12', equipment: ['Bench'] },
  { id: 'an005', name: 'Heel Raises - Double', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: [] },
  { id: 'an006', name: 'Heel Raises - Single', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '12-15', equipment: [] },
  { id: 'an010', name: 'Ankle Dorsiflexion with Band', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },
  { id: 'an001', name: 'Ankle Pumps', category: 'mobility', bodyParts: ['ankle'], baseSets: 3, baseReps: '20-30', equipment: [] },
  { id: 'ew001', name: 'Elbow Flexion', category: 'strengthening', bodyParts: ['elbow'], baseSets: 3, baseReps: '12-15', equipment: ['Dumbbell'] },
  { id: 'sh001', name: 'Pendulum Circles', category: 'mobility', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'cb023', name: 'Prone Press-Up (McKenzie)', category: 'mobility', bodyParts: ['lumbar'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'custom_hip_flexor_stretch', name: 'Half-Kneeling Hip Flexor Stretch', category: 'stretching', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'custom_foam_roll_thoracic', name: 'Thoracic Foam Roll Extension', category: 'mobility', bodyParts: ['thoracic'], baseSets: 2, baseReps: '10-15', equipment: ['Foam roller'] },
  { id: 'custom_single_leg_balance', name: 'Single Leg Balance', category: 'functional', bodyParts: ['ankle', 'knee', 'hip'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'custom_isometric_shoulder_er', name: 'Isometric Shoulder External Rotation', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10', baseHold: 10, equipment: ['Wall/towel'] },
  { id: 'custom_eccentric_heel_drop', name: 'Eccentric Heel Drop (Alfredson)', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15', equipment: ['Step'] },
  { id: 'custom_neural_slider_median', name: 'Median Nerve Slider', category: 'neuromuscular', bodyParts: ['cervical', 'shoulder', 'elbow'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'custom_neural_slider_sciatic', name: 'Sciatic Nerve Slider', category: 'neuromuscular', bodyParts: ['lumbar', 'hip', 'knee'], baseSets: 3, baseReps: '10-15', equipment: [] },
];

export function findExercisesByBodyPart(bodyPart: string): CatalogExercise[] {
  const lower = bodyPart.toLowerCase();
  return EXERCISE_CATALOG.filter(ex =>
    ex.bodyParts.some(bp => bp.includes(lower) || lower.includes(bp))
  );
}

export function findExerciseById(id: string): CatalogExercise | undefined {
  return EXERCISE_CATALOG.find(ex => ex.id === id);
}

export const INTERVENTION_EXERCISE_MAP: Record<string, string[]> = {
  isometric_loading: ['custom_isometric_shoulder_er', 'kn001', 'hp011'],
  eccentric_programme: ['custom_eccentric_heel_drop'],
  progressive_strengthening: ['kn009', 'hp011', 'hp012', 'hp019', 'an005'],
  motor_control_retraining: ['cb001', 'cb002', 'nk008', 'cb006'],
  stretching_programme: ['custom_hip_flexor_stretch', 'sh043', 'sh046'],
  graded_exposure: ['cb021', 'kn009', 'custom_single_leg_balance'],
  proprioceptive_training: ['custom_single_leg_balance', 'hp015', 'hp019'],
  neural_mobilisation: ['custom_neural_slider_median', 'custom_neural_slider_sciatic'],
};
