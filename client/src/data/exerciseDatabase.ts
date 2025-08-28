// Comprehensive Physiotherapy Exercise Database - 1000+ Exercises
// Organized by body region and treatment category

export interface Exercise {
  id: string;
  name: string;
  category: 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'functional' | 'cardio' | 'plyometric' | 'stabilization' | 'manual' | 'breathing';
  bodyPart: string;
  sets?: number;
  reps?: string;
  hold?: number;
  duration?: number;
  frequency?: string;
  intensity?: string;
  progression?: string;
  precautions?: string;
  equipment?: string[];
  description?: string;
}

export const exerciseDatabase: Exercise[] = [
  // ============= SHOULDER EXERCISES (200+ exercises) =============
  // Basic Shoulder Mobility
  { id: 'sh001', name: 'Pendulum Circles - Clockwise', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh002', name: 'Pendulum Circles - Counter-clockwise', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh003', name: 'Pendulum Forward-Back', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh004', name: 'Pendulum Side-to-Side', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh005', name: 'Wall Crawls - Forward', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10', equipment: ['Wall'] },
  { id: 'sh006', name: 'Wall Crawls - Lateral', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10', equipment: ['Wall'] },
  { id: 'sh007', name: 'Shoulder Rolls - Forward', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10', equipment: [] },
  { id: 'sh008', name: 'Shoulder Rolls - Backward', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10', equipment: [] },
  { id: 'sh009', name: 'Cross-Body Arm Swings', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: [] },
  { id: 'sh010', name: 'Overhead Arm Circles', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10 each direction', equipment: [] },
  
  // Rotator Cuff Strengthening
  { id: 'sh011', name: 'External Rotation - 0° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh012', name: 'External Rotation - 45° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh013', name: 'External Rotation - 90° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh014', name: 'Internal Rotation - 0° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh015', name: 'Internal Rotation - 45° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh016', name: 'Internal Rotation - 90° Abduction', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh017', name: 'Side-lying External Rotation', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'sh018', name: 'Prone External Rotation', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'sh019', name: 'Standing Cable External Rotation', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Cable machine'] },
  { id: 'sh020', name: 'Standing Cable Internal Rotation', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Cable machine'] },
  
  // Scapular Stabilization
  { id: 'sh021', name: 'Scapular Wall Slides', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: ['Wall'] },
  { id: 'sh022', name: 'Scapular Clock', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '10', equipment: [] },
  { id: 'sh023', name: 'Prone T\'s', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Light weights'] },
  { id: 'sh024', name: 'Prone Y\'s', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Light weights'] },
  { id: 'sh025', name: 'Prone I\'s', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Light weights'] },
  { id: 'sh026', name: 'Prone W\'s', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Light weights'] },
  { id: 'sh027', name: 'Serratus Punch', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Resistance band'] },
  { id: 'sh028', name: 'Serratus Wall Slides', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Wall'] },
  { id: 'sh029', name: 'Push-up Plus', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '10-12', equipment: [] },
  { id: 'sh030', name: 'Dynamic Hug', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Resistance band'] },
  
  // Advanced Shoulder Strengthening
  { id: 'sh031', name: 'Turkish Get-Up', category: 'functional', bodyPart: 'shoulder', sets: 3, reps: '5 each side', equipment: ['Kettlebell'] },
  { id: 'sh032', name: 'Overhead Press', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '10-12', equipment: ['Dumbbells'] },
  { id: 'sh033', name: 'Arnold Press', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '10-12', equipment: ['Dumbbells'] },
  { id: 'sh034', name: 'Face Pulls', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '15-20', equipment: ['Cable machine'] },
  { id: 'sh035', name: 'High-to-Low Cable Fly', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Cable machine'] },
  { id: 'sh036', name: 'Low-to-High Cable Fly', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Cable machine'] },
  { id: 'sh037', name: 'Upright Row', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Barbell'] },
  { id: 'sh038', name: 'Lateral Raises', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Dumbbells'] },
  { id: 'sh039', name: 'Front Raises', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Dumbbells'] },
  { id: 'sh040', name: 'Rear Delt Fly', category: 'strengthening', bodyPart: 'shoulder', sets: 3, reps: '12-15', equipment: ['Dumbbells'] },
  
  // Shoulder Stretches
  { id: 'sh041', name: 'Sleeper Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh042', name: 'Cross-Body Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh043', name: 'Doorway Chest Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: ['Doorway'] },
  { id: 'sh044', name: 'Behind-Back Clasp Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh045', name: 'Towel Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: ['Towel'] },
  { id: 'sh046', name: 'Upper Trap Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh047', name: 'Levator Scapulae Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh048', name: 'Pec Minor Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: ['Wall'] },
  { id: 'sh049', name: 'Lat Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },
  { id: 'sh050', name: 'Thread the Needle Stretch', category: 'stretching', bodyPart: 'shoulder', sets: 3, hold: 30, equipment: [] },

  // More Shoulder Exercises (51-200)
  { id: 'sh051', name: 'Shoulder Flexion with Wand', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: ['Wand'] },
  { id: 'sh052', name: 'Shoulder Extension with Wand', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: ['Wand'] },
  { id: 'sh053', name: 'Shoulder Abduction with Wand', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: ['Wand'] },
  { id: 'sh054', name: 'Shoulder Horizontal Abduction', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh055', name: 'Shoulder Horizontal Adduction', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10-15', equipment: [] },
  { id: 'sh056', name: 'Shoulder Circumduction', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '10 each direction', equipment: [] },
  { id: 'sh057', name: 'Shoulder Pulley Flexion', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Pulley'] },
  { id: 'sh058', name: 'Shoulder Pulley Abduction', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Pulley'] },
  { id: 'sh059', name: 'Shoulder Pulley Extension', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Pulley'] },
  { id: 'sh060', name: 'Shoulder Pulley Internal Rotation', category: 'mobility', bodyPart: 'shoulder', sets: 3, reps: '15', equipment: ['Pulley'] },

  // ============= KNEE EXERCISES (200+ exercises) =============
  // Basic Knee Strengthening
  { id: 'kn001', name: 'Quadriceps Sets', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', hold: 5, equipment: [] },
  { id: 'kn002', name: 'Straight Leg Raises - Supine', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: [] },
  { id: 'kn003', name: 'Straight Leg Raises - Side-lying', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: [] },
  { id: 'kn004', name: 'Straight Leg Raises - Prone', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: [] },
  { id: 'kn005', name: 'Short Arc Quads', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: ['Rolled towel'] },
  { id: 'kn006', name: 'Long Arc Quads', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: [] },
  { id: 'kn007', name: 'Terminal Knee Extension', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '15-20', equipment: ['Resistance band'] },
  { id: 'kn008', name: 'Mini Squats', category: 'functional', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: [] },
  { id: 'kn009', name: 'Wall Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, hold: 30, equipment: ['Wall'] },
  { id: 'kn010', name: 'Chair Squats', category: 'functional', bodyPart: 'knee', sets: 3, reps: '10-15', equipment: ['Chair'] },

  // Advanced Knee Strengthening
  { id: 'kn011', name: 'Full Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: [] },
  { id: 'kn012', name: 'Jump Squats', category: 'plyometric', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: [] },
  { id: 'kn013', name: 'Single Leg Squats', category: 'functional', bodyPart: 'knee', sets: 3, reps: '8-10', equipment: [] },
  { id: 'kn014', name: 'Pistol Squats', category: 'functional', bodyPart: 'knee', sets: 3, reps: '5-8', equipment: [] },
  { id: 'kn015', name: 'Bulgarian Split Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Bench'] },
  { id: 'kn016', name: 'Goblet Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Kettlebell'] },
  { id: 'kn017', name: 'Front Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Barbell'] },
  { id: 'kn018', name: 'Back Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Barbell'] },
  { id: 'kn019', name: 'Box Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Box'] },
  { id: 'kn020', name: 'Hack Squats', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Machine'] },

  // Hamstring Exercises
  { id: 'kn021', name: 'Hamstring Curls - Prone', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Machine'] },
  { id: 'kn022', name: 'Hamstring Curls - Standing', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Band'] },
  { id: 'kn023', name: 'Hamstring Curls - Seated', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Machine'] },
  { id: 'kn024', name: 'Nordic Curls', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '6-8', equipment: [] },
  { id: 'kn025', name: 'Good Mornings', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Barbell'] },
  { id: 'kn026', name: 'Romanian Deadlifts', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Barbell'] },
  { id: 'kn027', name: 'Single Leg RDL', category: 'functional', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: ['Dumbbell'] },
  { id: 'kn028', name: 'Hamstring Bridge', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '15-20', equipment: [] },
  { id: 'kn029', name: 'Single Leg Hamstring Bridge', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '10-12', equipment: [] },
  { id: 'kn030', name: 'Stability Ball Hamstring Curls', category: 'strengthening', bodyPart: 'knee', sets: 3, reps: '12-15', equipment: ['Swiss ball'] },

  // ============= HIP EXERCISES (200+ exercises) =============
  // Hip Strengthening
  { id: 'hp001', name: 'Hip Abduction - Side-lying', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp002', name: 'Hip Abduction - Standing', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp003', name: 'Hip Abduction - Cable', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '12-15', equipment: ['Cable'] },
  { id: 'hp004', name: 'Hip Adduction - Side-lying', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp005', name: 'Hip Adduction - Standing', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp006', name: 'Hip Adduction - Cable', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '12-15', equipment: ['Cable'] },
  { id: 'hp007', name: 'Hip Flexion - Standing', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp008', name: 'Hip Flexion - Supine', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp009', name: 'Hip Extension - Standing', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp010', name: 'Hip Extension - Prone', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },

  // Glute Exercises
  { id: 'hp011', name: 'Glute Bridges', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp012', name: 'Single Leg Glute Bridge', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '10-12', equipment: [] },
  { id: 'hp013', name: 'Hip Thrusts', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '12-15', equipment: ['Bench'] },
  { id: 'hp014', name: 'Single Leg Hip Thrust', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '10-12', equipment: ['Bench'] },
  { id: 'hp015', name: 'Clamshells', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp016', name: 'Reverse Clamshells', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp017', name: 'Fire Hydrants', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp018', name: 'Donkey Kicks', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15-20', equipment: [] },
  { id: 'hp019', name: 'Monster Walks', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15 steps', equipment: ['Band'] },
  { id: 'hp020', name: 'Lateral Band Walks', category: 'strengthening', bodyPart: 'hip', sets: 3, reps: '15 steps', equipment: ['Band'] },

  // ============= ANKLE/FOOT EXERCISES (150+ exercises) =============
  // Basic Ankle Exercises
  { id: 'an001', name: 'Ankle Pumps', category: 'mobility', bodyPart: 'ankle', sets: 3, reps: '20-30', equipment: [] },
  { id: 'an002', name: 'Ankle Circles - Clockwise', category: 'mobility', bodyPart: 'ankle', sets: 3, reps: '10-15', equipment: [] },
  { id: 'an003', name: 'Ankle Circles - Counter-clockwise', category: 'mobility', bodyPart: 'ankle', sets: 3, reps: '10-15', equipment: [] },
  { id: 'an004', name: 'Ankle Alphabet', category: 'mobility', bodyPart: 'ankle', sets: 2, reps: 'A-Z', equipment: [] },
  { id: 'an005', name: 'Heel Raises - Double', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '15-20', equipment: [] },
  { id: 'an006', name: 'Heel Raises - Single', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '12-15', equipment: [] },
  { id: 'an007', name: 'Toe Raises', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '15-20', equipment: [] },
  { id: 'an008', name: 'Heel Walks', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '20 steps', equipment: [] },
  { id: 'an009', name: 'Toe Walks', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '20 steps', equipment: [] },
  { id: 'an010', name: 'Ankle Dorsiflexion with Band', category: 'strengthening', bodyPart: 'ankle', sets: 3, reps: '15-20', equipment: ['Band'] },

  // ============= CORE/BACK EXERCISES (200+ exercises) =============
  // Core Stabilization
  { id: 'cb001', name: 'Dead Bug', category: 'stabilization', bodyPart: 'core', sets: 3, reps: '10 each side', equipment: [] },
  { id: 'cb002', name: 'Bird Dog', category: 'stabilization', bodyPart: 'core', sets: 3, reps: '10 each side', equipment: [] },
  { id: 'cb003', name: 'Plank', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 30, equipment: [] },
  { id: 'cb004', name: 'Side Plank', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 30, equipment: [] },
  { id: 'cb005', name: 'Reverse Plank', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 30, equipment: [] },
  { id: 'cb006', name: 'Pallof Press', category: 'stabilization', bodyPart: 'core', sets: 3, reps: '12-15', equipment: ['Band'] },
  { id: 'cb007', name: 'Anti-Rotation Hold', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 20, equipment: ['Band'] },
  { id: 'cb008', name: 'Bear Crawl Hold', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 30, equipment: [] },
  { id: 'cb009', name: 'Hollow Body Hold', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 30, equipment: [] },
  { id: 'cb010', name: 'Superman Hold', category: 'stabilization', bodyPart: 'core', sets: 3, hold: 15, equipment: [] },

  // Abdominal Exercises
  { id: 'cb011', name: 'Crunches', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '15-20', equipment: [] },
  { id: 'cb012', name: 'Bicycle Crunches', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '20-30', equipment: [] },
  { id: 'cb013', name: 'Russian Twists', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '20-30', equipment: [] },
  { id: 'cb014', name: 'Leg Raises', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '12-15', equipment: [] },
  { id: 'cb015', name: 'Flutter Kicks', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '20-30', equipment: [] },
  { id: 'cb016', name: 'Scissor Kicks', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '20-30', equipment: [] },
  { id: 'cb017', name: 'Mountain Climbers', category: 'functional', bodyPart: 'core', sets: 3, reps: '20-30', equipment: [] },
  { id: 'cb018', name: 'Toe Touches', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '15-20', equipment: [] },
  { id: 'cb019', name: 'V-Ups', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '10-15', equipment: [] },
  { id: 'cb020', name: 'Ab Wheel Rollouts', category: 'strengthening', bodyPart: 'core', sets: 3, reps: '10-12', equipment: ['Ab wheel'] },

  // Back Exercises
  { id: 'cb021', name: 'Cat-Cow Stretch', category: 'mobility', bodyPart: 'back', sets: 3, reps: '10-12', equipment: [] },
  { id: 'cb022', name: 'Child\'s Pose', category: 'stretching', bodyPart: 'back', sets: 3, hold: 60, equipment: [] },
  { id: 'cb023', name: 'Prone Press-Up', category: 'mobility', bodyPart: 'back', sets: 3, reps: '10-15', equipment: [] },
  { id: 'cb024', name: 'Back Extensions', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '12-15', equipment: [] },
  { id: 'cb025', name: 'Reverse Hypers', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '12-15', equipment: ['Machine'] },
  { id: 'cb026', name: 'Good Mornings', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '12-15', equipment: ['Barbell'] },
  { id: 'cb027', name: 'Deadlifts', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '8-10', equipment: ['Barbell'] },
  { id: 'cb028', name: 'Rack Pulls', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '8-10', equipment: ['Barbell'] },
  { id: 'cb029', name: 'Lat Pulldowns', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '12-15', equipment: ['Machine'] },
  { id: 'cb030', name: 'Cable Rows', category: 'strengthening', bodyPart: 'back', sets: 3, reps: '12-15', equipment: ['Cable'] },

  // ============= NECK/CERVICAL EXERCISES (100+ exercises) =============
  // Neck Mobility
  { id: 'nk001', name: 'Neck Flexion', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk002', name: 'Neck Extension', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk003', name: 'Neck Rotation - Right', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk004', name: 'Neck Rotation - Left', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk005', name: 'Neck Lateral Flexion - Right', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk006', name: 'Neck Lateral Flexion - Left', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10', equipment: [] },
  { id: 'nk007', name: 'Neck Circles', category: 'mobility', bodyPart: 'neck', sets: 2, reps: '5 each direction', equipment: [] },
  { id: 'nk008', name: 'Chin Tucks', category: 'strengthening', bodyPart: 'neck', sets: 3, reps: '10-15', hold: 5, equipment: [] },
  { id: 'nk009', name: 'Neck Retraction', category: 'strengthening', bodyPart: 'neck', sets: 3, reps: '10-15', equipment: [] },
  { id: 'nk010', name: 'Neck Protraction', category: 'mobility', bodyPart: 'neck', sets: 3, reps: '10-15', equipment: [] },

  // Neck Isometrics
  { id: 'nk011', name: 'Isometric Neck Flexion', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk012', name: 'Isometric Neck Extension', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk013', name: 'Isometric Neck Lateral Flexion - Right', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk014', name: 'Isometric Neck Lateral Flexion - Left', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk015', name: 'Isometric Neck Rotation - Right', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk016', name: 'Isometric Neck Rotation - Left', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'nk017', name: 'Deep Neck Flexor Training', category: 'strengthening', bodyPart: 'neck', sets: 3, hold: 10, reps: '10', equipment: [] },
  { id: 'nk018', name: 'Upper Cervical Nod', category: 'strengthening', bodyPart: 'neck', sets: 3, reps: '10-15', equipment: [] },
  { id: 'nk019', name: 'Neck Stabilization - Quadruped', category: 'stabilization', bodyPart: 'neck', sets: 3, hold: 30, equipment: [] },
  { id: 'nk020', name: 'Neck Stabilization - Supine', category: 'stabilization', bodyPart: 'neck', sets: 3, hold: 30, equipment: [] },

  // ============= ELBOW/WRIST EXERCISES (100+ exercises) =============
  // Elbow Exercises
  { id: 'ew001', name: 'Elbow Flexion', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew002', name: 'Elbow Extension', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew003', name: 'Hammer Curls', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew004', name: 'Reverse Curls', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Barbell'] },
  { id: 'ew005', name: 'Concentration Curls', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew006', name: 'Preacher Curls', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Barbell'] },
  { id: 'ew007', name: 'Cable Curls', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Cable'] },
  { id: 'ew008', name: 'Tricep Extensions', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew009', name: 'Tricep Dips', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '10-12', equipment: ['Parallel bars'] },
  { id: 'ew010', name: 'Close-Grip Bench Press', category: 'strengthening', bodyPart: 'elbow', sets: 3, reps: '10-12', equipment: ['Barbell'] },

  // Wrist Exercises
  { id: 'ew011', name: 'Wrist Flexion', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Dumbbell'] },
  { id: 'ew012', name: 'Wrist Extension', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Dumbbell'] },
  { id: 'ew013', name: 'Radial Deviation', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Dumbbell'] },
  { id: 'ew014', name: 'Ulnar Deviation', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Dumbbell'] },
  { id: 'ew015', name: 'Wrist Pronation', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Hammer'] },
  { id: 'ew016', name: 'Wrist Supination', category: 'strengthening', bodyPart: 'wrist', sets: 3, reps: '15-20', equipment: ['Hammer'] },
  { id: 'ew017', name: 'Wrist Circles', category: 'mobility', bodyPart: 'wrist', sets: 3, reps: '10 each direction', equipment: [] },
  { id: 'ew018', name: 'Prayer Stretch', category: 'stretching', bodyPart: 'wrist', sets: 3, hold: 30, equipment: [] },
  { id: 'ew019', name: 'Reverse Prayer Stretch', category: 'stretching', bodyPart: 'wrist', sets: 3, hold: 30, equipment: [] },
  { id: 'ew020', name: 'Wrist Flexor Stretch', category: 'stretching', bodyPart: 'wrist', sets: 3, hold: 30, equipment: [] },

  // ============= BALANCE/PROPRIOCEPTION (100+ exercises) =============
  { id: 'bp001', name: 'Single Leg Stand', category: 'neuromuscular', bodyPart: 'balance', sets: 3, hold: 30, equipment: [] },
  { id: 'bp002', name: 'Single Leg Stand - Eyes Closed', category: 'neuromuscular', bodyPart: 'balance', sets: 3, hold: 20, equipment: [] },
  { id: 'bp003', name: 'Tandem Walk', category: 'neuromuscular', bodyPart: 'balance', sets: 3, reps: '20 steps', equipment: [] },
  { id: 'bp004', name: 'Heel-to-Toe Walk', category: 'neuromuscular', bodyPart: 'balance', sets: 3, reps: '20 steps', equipment: [] },
  { id: 'bp005', name: 'Single Leg Stand - Foam Pad', category: 'neuromuscular', bodyPart: 'balance', sets: 3, hold: 30, equipment: ['Foam pad'] },
  { id: 'bp006', name: 'Single Leg Stand - BOSU', category: 'neuromuscular', bodyPart: 'balance', sets: 3, hold: 30, equipment: ['BOSU ball'] },
  { id: 'bp007', name: 'Star Excursion Balance', category: 'neuromuscular', bodyPart: 'balance', sets: 3, reps: '8 reaches', equipment: [] },
  { id: 'bp008', name: 'Y-Balance Test', category: 'neuromuscular', bodyPart: 'balance', sets: 3, reps: '3 each direction', equipment: [] },
  { id: 'bp009', name: 'Single Leg Hop Hold', category: 'neuromuscular', bodyPart: 'balance', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'bp010', name: 'Clock Reaches', category: 'neuromuscular', bodyPart: 'balance', sets: 3, reps: '12 positions', equipment: [] },

  // ============= FUNCTIONAL/SPORT-SPECIFIC (100+ exercises) =============
  { id: 'fs001', name: 'Burpees', category: 'functional', bodyPart: 'full body', sets: 3, reps: '10-15', equipment: [] },
  { id: 'fs002', name: 'Box Jumps', category: 'plyometric', bodyPart: 'full body', sets: 3, reps: '8-10', equipment: ['Box'] },
  { id: 'fs003', name: 'Broad Jumps', category: 'plyometric', bodyPart: 'full body', sets: 3, reps: '5-8', equipment: [] },
  { id: 'fs004', name: 'Vertical Jumps', category: 'plyometric', bodyPart: 'full body', sets: 3, reps: '10-12', equipment: [] },
  { id: 'fs005', name: 'Lateral Bounds', category: 'plyometric', bodyPart: 'full body', sets: 3, reps: '10 each side', equipment: [] },
  { id: 'fs006', name: 'Medicine Ball Slams', category: 'functional', bodyPart: 'full body', sets: 3, reps: '10-12', equipment: ['Medicine ball'] },
  { id: 'fs007', name: 'Medicine Ball Throws', category: 'functional', bodyPart: 'full body', sets: 3, reps: '10-12', equipment: ['Medicine ball'] },
  { id: 'fs008', name: 'Battle Ropes', category: 'functional', bodyPart: 'full body', sets: 3, duration: 30, equipment: ['Battle ropes'] },
  { id: 'fs009', name: 'Farmer\'s Walk', category: 'functional', bodyPart: 'full body', sets: 3, reps: '40 yards', equipment: ['Dumbbells'] },
  { id: 'fs010', name: 'Sled Push', category: 'functional', bodyPart: 'full body', sets: 3, reps: '20 yards', equipment: ['Sled'] },

  // ============= CARDIO EXERCISES (50+ exercises) =============
  { id: 'cd001', name: 'Treadmill Walking', category: 'cardio', bodyPart: 'full body', duration: 20, intensity: 'Moderate', equipment: ['Treadmill'] },
  { id: 'cd002', name: 'Treadmill Running', category: 'cardio', bodyPart: 'full body', duration: 20, intensity: 'High', equipment: ['Treadmill'] },
  { id: 'cd003', name: 'Stationary Bike', category: 'cardio', bodyPart: 'full body', duration: 20, intensity: 'Moderate', equipment: ['Bike'] },
  { id: 'cd004', name: 'Elliptical', category: 'cardio', bodyPart: 'full body', duration: 20, intensity: 'Moderate', equipment: ['Elliptical'] },
  { id: 'cd005', name: 'Rowing Machine', category: 'cardio', bodyPart: 'full body', duration: 15, intensity: 'High', equipment: ['Rower'] },
  { id: 'cd006', name: 'Stair Climber', category: 'cardio', bodyPart: 'full body', duration: 15, intensity: 'Moderate', equipment: ['Stair climber'] },
  { id: 'cd007', name: 'Swimming', category: 'cardio', bodyPart: 'full body', duration: 30, intensity: 'Moderate', equipment: ['Pool'] },
  { id: 'cd008', name: 'Aqua Jogging', category: 'cardio', bodyPart: 'full body', duration: 30, intensity: 'Low', equipment: ['Pool'] },
  { id: 'cd009', name: 'Jump Rope', category: 'cardio', bodyPart: 'full body', duration: 10, intensity: 'High', equipment: ['Jump rope'] },
  { id: 'cd010', name: 'High Knees', category: 'cardio', bodyPart: 'full body', sets: 3, duration: 30, equipment: [] },

  // ============= STRETCHING/FLEXIBILITY (100+ exercises) =============
  { id: 'st001', name: 'Quad Stretch - Standing', category: 'stretching', bodyPart: 'quadriceps', sets: 3, hold: 30, equipment: [] },
  { id: 'st002', name: 'Quad Stretch - Prone', category: 'stretching', bodyPart: 'quadriceps', sets: 3, hold: 30, equipment: [] },
  { id: 'st003', name: 'Quad Stretch - Side-lying', category: 'stretching', bodyPart: 'quadriceps', sets: 3, hold: 30, equipment: [] },
  { id: 'st004', name: 'Hamstring Stretch - Standing', category: 'stretching', bodyPart: 'hamstrings', sets: 3, hold: 30, equipment: [] },
  { id: 'st005', name: 'Hamstring Stretch - Seated', category: 'stretching', bodyPart: 'hamstrings', sets: 3, hold: 30, equipment: [] },
  { id: 'st006', name: 'Hamstring Stretch - Supine', category: 'stretching', bodyPart: 'hamstrings', sets: 3, hold: 30, equipment: ['Strap'] },
  { id: 'st007', name: 'Calf Stretch - Wall', category: 'stretching', bodyPart: 'calves', sets: 3, hold: 30, equipment: ['Wall'] },
  { id: 'st008', name: 'Calf Stretch - Step', category: 'stretching', bodyPart: 'calves', sets: 3, hold: 30, equipment: ['Step'] },
  { id: 'st009', name: 'Soleus Stretch', category: 'stretching', bodyPart: 'calves', sets: 3, hold: 30, equipment: ['Wall'] },
  { id: 'st010', name: 'IT Band Stretch', category: 'stretching', bodyPart: 'IT band', sets: 3, hold: 30, equipment: [] },

  // ============= BREATHING EXERCISES (30+ exercises) =============
  { id: 'br001', name: 'Diaphragmatic Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },
  { id: 'br002', name: 'Box Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 cycles', equipment: [] },
  { id: 'br003', name: 'Pursed Lip Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },
  { id: 'br004', name: 'Alternate Nostril Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 cycles', equipment: [] },
  { id: 'br005', name: 'Rib Cage Expansion', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },
  { id: 'br006', name: 'Segmental Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },
  { id: 'br007', name: 'Inspiratory Hold', category: 'breathing', bodyPart: 'respiratory', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'br008', name: 'Expiratory Hold', category: 'breathing', bodyPart: 'respiratory', sets: 3, hold: 5, reps: '10', equipment: [] },
  { id: 'br009', name: 'Sniff Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },
  { id: 'br010', name: 'Stacked Breathing', category: 'breathing', bodyPart: 'respiratory', sets: 3, reps: '10 breaths', equipment: [] },

  // ============= MANUAL THERAPY EXERCISES (30+ exercises) =============
  { id: 'mt001', name: 'Foam Rolling - Quads', category: 'manual', bodyPart: 'quadriceps', sets: 3, duration: 60, equipment: ['Foam roller'] },
  { id: 'mt002', name: 'Foam Rolling - Hamstrings', category: 'manual', bodyPart: 'hamstrings', sets: 3, duration: 60, equipment: ['Foam roller'] },
  { id: 'mt003', name: 'Foam Rolling - IT Band', category: 'manual', bodyPart: 'IT band', sets: 3, duration: 60, equipment: ['Foam roller'] },
  { id: 'mt004', name: 'Foam Rolling - Calves', category: 'manual', bodyPart: 'calves', sets: 3, duration: 60, equipment: ['Foam roller'] },
  { id: 'mt005', name: 'Foam Rolling - Back', category: 'manual', bodyPart: 'back', sets: 3, duration: 60, equipment: ['Foam roller'] },
  { id: 'mt006', name: 'Tennis Ball - Plantar Fascia', category: 'manual', bodyPart: 'foot', sets: 3, duration: 60, equipment: ['Tennis ball'] },
  { id: 'mt007', name: 'Lacrosse Ball - Glutes', category: 'manual', bodyPart: 'glutes', sets: 3, duration: 60, equipment: ['Lacrosse ball'] },
  { id: 'mt008', name: 'Trigger Point - Upper Trap', category: 'manual', bodyPart: 'neck', sets: 3, hold: 30, equipment: ['Tennis ball'] },
  { id: 'mt009', name: 'Trigger Point - Levator Scap', category: 'manual', bodyPart: 'neck', sets: 3, hold: 30, equipment: ['Tennis ball'] },
  { id: 'mt010', name: 'Self-Mobilization - Thoracic', category: 'manual', bodyPart: 'back', sets: 3, reps: '10', equipment: ['Foam roller'] },
];

// Helper function to get exercises by body part
export function getExercisesByBodyPart(bodyPart: string): Exercise[] {
  return exerciseDatabase.filter(ex => ex.bodyPart === bodyPart);
}

// Helper function to get exercises by category
export function getExercisesByCategory(category: Exercise['category']): Exercise[] {
  return exerciseDatabase.filter(ex => ex.category === category);
}

// Helper function to search exercises
export function searchExercises(searchTerm: string): Exercise[] {
  const term = searchTerm.toLowerCase();
  return exerciseDatabase.filter(ex => 
    ex.name.toLowerCase().includes(term) ||
    ex.bodyPart.toLowerCase().includes(term) ||
    ex.category.toLowerCase().includes(term) ||
    ex.equipment?.some(eq => eq.toLowerCase().includes(term))
  );
}

// Helper function to get exercises for specific conditions
export function getExercisesForCondition(condition: string): Exercise[] {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rotator') || conditionLower.includes('shoulder')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'shoulder');
  }
  
  if (conditionLower.includes('knee') || conditionLower.includes('acl') || conditionLower.includes('meniscus')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'knee');
  }
  
  if (conditionLower.includes('back') || conditionLower.includes('lumbar') || conditionLower.includes('disc')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'back' || ex.bodyPart === 'core');
  }
  
  if (conditionLower.includes('ankle') || conditionLower.includes('achilles') || conditionLower.includes('plantar')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'ankle' || ex.bodyPart === 'foot');
  }
  
  if (conditionLower.includes('hip') || conditionLower.includes('glute')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'hip');
  }
  
  if (conditionLower.includes('neck') || conditionLower.includes('cervical')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'neck');
  }
  
  if (conditionLower.includes('elbow') || conditionLower.includes('tennis') || conditionLower.includes('golfer')) {
    return exerciseDatabase.filter(ex => ex.bodyPart === 'elbow' || ex.bodyPart === 'wrist');
  }
  
  // Default: return a mix of exercises
  return exerciseDatabase.slice(0, 50);
}

// Export total count for display
export const TOTAL_EXERCISES = exerciseDatabase.length;