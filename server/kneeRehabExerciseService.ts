import { db } from './db';
import { cachedExercises, type InsertCachedExercise } from '@shared/schema';

// Comprehensive knee rehabilitation exercise database
export class KneeRehabExerciseService {
  private kneeExercises: Omit<InsertCachedExercise, 'id'>[] = [
    // ============ QUADRICEPS STRENGTHENING ============
    {
      externalId: 'knee_rehab_001',
      name: 'Quad Sets',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_quadsets.jpg',
      instructions: [
        'Sit or lie with leg straight',
        'Tighten thigh muscle by pushing knee down into surface',
        'Hold for 5-10 seconds',
        'Feel contraction in front of thigh',
        'Relax and repeat',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Quadriceps'
    },
    {
      externalId: 'knee_rehab_002',
      name: 'Straight Leg Raises',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_straightlegraise.jpg',
      instructions: [
        'Lie on back with one knee bent, other leg straight',
        'Tighten quad of straight leg',
        'Lift straight leg to height of bent knee',
        'Keep knee straight throughout',
        'Hold 2-3 seconds, lower slowly',
        'Perform 3 sets of 10-15 per leg'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Quadriceps'
    },
    {
      externalId: 'knee_rehab_003',
      name: 'Wall Sits',
      bodyPart: 'Knees',
      equipment: 'wall',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_wallsit.jpg',
      instructions: [
        'Stand with back against wall',
        'Slide down until knees at 45-90 degrees',
        'Keep knees behind toes',
        'Hold position for 20-60 seconds',
        'Push through heels to return up',
        'Perform 3 sets with rest between'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Quadriceps'
    },
    {
      externalId: 'knee_rehab_004',
      name: 'Terminal Knee Extension',
      bodyPart: 'Knees',
      equipment: 'resistance band',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_terminalkneeextension.jpg',
      instructions: [
        'Loop band around sturdy object and behind knee',
        'Step back to create tension',
        'Start with knee slightly bent',
        'Straighten knee completely against resistance',
        'Focus on squeezing quad at end range',
        'Perform 3 sets of 15-20 repetitions'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - VMO'
    },
    {
      externalId: 'knee_rehab_005',
      name: 'Step Ups',
      bodyPart: 'Knees',
      equipment: 'box',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_stepup.jpg',
      instructions: [
        'Stand facing step or box (4-8 inches high)',
        'Place one foot fully on step',
        'Push through heel to step up',
        'Control descent back down',
        'Keep knee tracking over toes',
        'Perform 3 sets of 10-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Functional'
    },
    {
      externalId: 'knee_rehab_006',
      name: 'Mini Squats',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_minisquat.jpg',
      instructions: [
        'Stand with feet shoulder-width apart',
        'Bend knees to 30-45 degrees only',
        'Keep knees behind toes',
        'Push through heels to return',
        'Maintain neutral spine throughout',
        'Perform 3 sets of 15-20 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Functional'
    },
    {
      externalId: 'knee_rehab_007',
      name: 'Leg Press (Limited Range)',
      bodyPart: 'Knees',
      equipment: 'machine',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_legpress.jpg',
      instructions: [
        'Sit in leg press machine',
        'Start with knees at 90 degrees maximum',
        'Press to just short of full extension',
        'Control the descent',
        'Avoid locking knees out',
        'Perform 3 sets of 12-15 repetitions'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Strengthening'
    },
    {
      externalId: 'knee_rehab_008',
      name: 'VMO Dips',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'VMO',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_vmodips.jpg',
      instructions: [
        'Stand on edge of step sideways',
        'Lower outside leg slowly',
        'Keep standing knee slightly bent',
        'Touch heel to ground lightly',
        'Push back up with standing leg',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - VMO'
    },

    // ============ HAMSTRING EXERCISES ============
    {
      externalId: 'knee_rehab_009',
      name: 'Hamstring Curls (Prone)',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_pronehamstringcurl.jpg',
      instructions: [
        'Lie face down on surface',
        'Slowly bend knee bringing heel toward buttock',
        'Keep hips pressed down',
        'Hold briefly at top',
        'Lower slowly with control',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Hamstrings'
    },
    {
      externalId: 'knee_rehab_010',
      name: 'Standing Hamstring Curls',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_standinghamstringcurl.jpg',
      instructions: [
        'Stand holding stable surface for balance',
        'Bend knee bringing heel toward buttock',
        'Keep thighs parallel',
        'Squeeze hamstring at top',
        'Lower slowly',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Hamstrings'
    },
    {
      externalId: 'knee_rehab_011',
      name: 'Nordic Hamstring Curls (Eccentric)',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_nordichamstringcurl.jpg',
      instructions: [
        'Kneel with ankles secured',
        'Keep body straight from knees to head',
        'Slowly lower forward using hamstrings to control',
        'Catch yourself with hands when needed',
        'Push back up to start',
        'Perform 3 sets of 5-8 repetitions'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - Hamstrings'
    },
    {
      externalId: 'knee_rehab_012',
      name: 'Single Leg Romanian Deadlift',
      bodyPart: 'Knees',
      equipment: 'dumbbell',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_singlelegrdl.jpg',
      instructions: [
        'Stand on one leg holding weight',
        'Hinge at hip keeping back straight',
        'Extend free leg behind for balance',
        'Feel stretch in standing leg hamstring',
        'Return to standing squeezing glutes',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Hamstrings'
    },
    {
      externalId: 'knee_rehab_013',
      name: 'Swiss Ball Hamstring Curls',
      bodyPart: 'Knees',
      equipment: 'swiss ball',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_swissballhamstringcurl.jpg',
      instructions: [
        'Lie on back with heels on ball',
        'Lift hips into bridge position',
        'Pull heels toward buttocks rolling ball in',
        'Keep hips elevated throughout',
        'Slowly return to start',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Hamstrings'
    },

    // ============ ACL REHABILITATION ============
    {
      externalId: 'knee_rehab_014',
      name: 'Heel Slides',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'knee mobility',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_heelslide.jpg',
      instructions: [
        'Lie on back with legs straight',
        'Slowly slide heel toward buttock',
        'Bend knee as far as comfortable',
        'Hold 5 seconds',
        'Slide heel back to straight',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - ACL Phase 1'
    },
    {
      externalId: 'knee_rehab_015',
      name: 'Prone Knee Flexion',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'knee mobility',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_pronekneeflexion.jpg',
      instructions: [
        'Lie face down',
        'Slowly bend knee bringing heel toward buttock',
        'Use opposite foot to assist if needed',
        'Hold at comfortable end range',
        'Return slowly',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - ACL Phase 1'
    },
    {
      externalId: 'knee_rehab_016',
      name: 'Single Leg Balance',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'proprioception',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_singlelegbalance.jpg',
      instructions: [
        'Stand on affected leg',
        'Maintain balance for 30-60 seconds',
        'Keep knee slightly bent',
        'Progress by closing eyes',
        'Add arm movements for challenge',
        'Perform 3 sets on each leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - ACL Phase 2'
    },
    {
      externalId: 'knee_rehab_017',
      name: 'Forward Lunges',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_forwardlunge.jpg',
      instructions: [
        'Step forward into lunge position',
        'Lower back knee toward ground',
        'Keep front knee over ankle',
        'Push through front heel to return',
        'Maintain upright torso',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - ACL Phase 3'
    },
    {
      externalId: 'knee_rehab_018',
      name: 'Lateral Lunges',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_laterallunge.jpg',
      instructions: [
        'Step out wide to one side',
        'Bend stepping leg while keeping other straight',
        'Push hips back like sitting',
        'Push off bent leg to return',
        'Keep knee tracking over toes',
        'Perform 3 sets of 10-12 per side'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - ACL Phase 3'
    },
    {
      externalId: 'knee_rehab_019',
      name: 'Box Jumps (Progressive)',
      bodyPart: 'Knees',
      equipment: 'box',
      target: 'power',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_boxjump.jpg',
      instructions: [
        'Start with low box (4-6 inches)',
        'Jump with both feet onto box',
        'Land softly with bent knees',
        'Step down (dont jump down initially)',
        'Progress height gradually',
        'Perform 3 sets of 5-8 repetitions'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - ACL Phase 4'
    },
    {
      externalId: 'knee_rehab_020',
      name: 'Single Leg Hops',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'power',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_singleleghop.jpg',
      instructions: [
        'Stand on affected leg',
        'Hop forward and land on same leg',
        'Focus on soft landing with control',
        'Progress distance gradually',
        'Add lateral and backward hops',
        'Perform 3 sets of 8-10 hops'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - ACL Phase 4'
    },

    // ============ PATELLOFEMORAL PAIN SYNDROME ============
    {
      externalId: 'knee_rehab_021',
      name: 'Patellar Mobilization',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'patella',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_patellarmobilization.jpg',
      instructions: [
        'Sit with leg straight and relaxed',
        'Gently move kneecap side to side',
        'Move kneecap up and down',
        'Perform in pain-free range',
        'Do for 2-3 minutes',
        'Perform 2-3 times daily'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Patellofemoral'
    },
    {
      externalId: 'knee_rehab_022',
      name: 'IT Band Stretch',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'IT band',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_itbandstretch.jpg',
      instructions: [
        'Stand and cross affected leg behind other',
        'Lean away from affected side',
        'Feel stretch along outer thigh',
        'Hold 30 seconds',
        'Repeat 3-4 times',
        'Perform 2-3 times daily'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Patellofemoral'
    },
    {
      externalId: 'knee_rehab_023',
      name: 'Calf Stretch (Gastrocnemius)',
      bodyPart: 'Knees',
      equipment: 'wall',
      target: 'calves',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_calfstretch.jpg',
      instructions: [
        'Face wall with hands against it',
        'Step affected leg back',
        'Keep heel down and knee straight',
        'Lean forward feeling calf stretch',
        'Hold 30 seconds',
        'Perform 3-4 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Flexibility'
    },
    {
      externalId: 'knee_rehab_024',
      name: 'Calf Stretch (Soleus)',
      bodyPart: 'Knees',
      equipment: 'wall',
      target: 'calves',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_soleusstretch.jpg',
      instructions: [
        'Face wall with hands against it',
        'Step affected leg back',
        'Keep heel down but bend knee',
        'Lean forward feeling deep calf stretch',
        'Hold 30 seconds',
        'Perform 3-4 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Flexibility'
    },
    {
      externalId: 'knee_rehab_025',
      name: 'Quad Stretch (Standing)',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_standingquadstretch.jpg',
      instructions: [
        'Stand holding wall for balance',
        'Bend knee bringing heel to buttock',
        'Grasp ankle with hand',
        'Keep knees together',
        'Hold 30 seconds',
        'Perform 3-4 repetitions per leg'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Flexibility'
    },
    {
      externalId: 'knee_rehab_026',
      name: 'Hamstring Stretch (Seated)',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'hamstrings',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_seatedhamstringstretch.jpg',
      instructions: [
        'Sit with one leg straight, other bent',
        'Reach toward toes of straight leg',
        'Keep back straight',
        'Feel stretch behind thigh',
        'Hold 30 seconds',
        'Perform 3-4 repetitions per leg'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Flexibility'
    },

    // ============ MENISCUS REHABILITATION ============
    {
      externalId: 'knee_rehab_027',
      name: 'Passive Knee Extension',
      bodyPart: 'Knees',
      equipment: 'towel',
      target: 'knee extension',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_passivekneeextension.jpg',
      instructions: [
        'Sit with heel propped on rolled towel',
        'Let knee straighten with gravity',
        'Can add light weight on thigh',
        'Hold 5-10 minutes',
        'Feel gentle stretch',
        'Perform 2-3 times daily'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Meniscus'
    },
    {
      externalId: 'knee_rehab_028',
      name: 'Bike Riding (Stationary)',
      bodyPart: 'Knees',
      equipment: 'bike',
      target: 'knee mobility',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_stationarybike.jpg',
      instructions: [
        'Start with seat high to minimize knee bend',
        'Pedal with light resistance',
        'Progress time from 5-20 minutes',
        'Increase resistance gradually',
        'Maintain smooth pedaling',
        'Perform daily as tolerated'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Meniscus'
    },
    {
      externalId: 'knee_rehab_029',
      name: 'Partial Weight Bearing Squats',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_partialweightbearingsquat.jpg',
      instructions: [
        'Hold onto stable surface',
        'Squat to comfortable depth only',
        'Use arms to assist as needed',
        'Progress depth as tolerated',
        'Keep weight evenly distributed',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Meniscus'
    },
    {
      externalId: 'knee_rehab_030',
      name: 'Pool Walking',
      bodyPart: 'Knees',
      equipment: 'pool',
      target: 'general conditioning',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_poolwalking.jpg',
      instructions: [
        'Walk in waist-deep water',
        'Start with forward walking',
        'Add backward and sideways walking',
        'Progress to deeper water',
        'Can add resistance with faster walking',
        'Perform 15-30 minutes'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Meniscus'
    },

    // ============ GENERAL KNEE STRENGTHENING ============
    {
      externalId: 'knee_rehab_031',
      name: 'Calf Raises',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'calves',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_calfraise.jpg',
      instructions: [
        'Stand with feet hip-width apart',
        'Rise up onto toes',
        'Hold briefly at top',
        'Lower slowly with control',
        'Progress to single leg',
        'Perform 3 sets of 15-20 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Knee Rehabilitation - Strengthening'
    },
    {
      externalId: 'knee_rehab_032',
      name: 'Goblet Squats',
      bodyPart: 'Knees',
      equipment: 'dumbbell',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_gobletsquat.jpg',
      instructions: [
        'Hold weight at chest level',
        'Squat down keeping chest up',
        'Go to comfortable depth',
        'Push through heels to stand',
        'Keep knees tracking over toes',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Strengthening'
    },
    {
      externalId: 'knee_rehab_033',
      name: 'Reverse Lunges',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_reverselunge.jpg',
      instructions: [
        'Step backward into lunge',
        'Lower back knee toward ground',
        'Keep front knee over ankle',
        'Push through front heel to return',
        'Easier on knees than forward lunges',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Functional'
    },
    {
      externalId: 'knee_rehab_034',
      name: 'Step Downs',
      bodyPart: 'Knees',
      equipment: 'box',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_stepdown.jpg',
      instructions: [
        'Stand on step or box',
        'Slowly lower one foot toward ground',
        'Control descent with standing leg',
        'Tap heel and return up',
        'Keep knee aligned over toes',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Functional'
    },
    {
      externalId: 'knee_rehab_035',
      name: 'Leg Extensions (Limited Range)',
      bodyPart: 'Knees',
      equipment: 'machine',
      target: 'quadriceps',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_legextension.jpg',
      instructions: [
        'Sit in leg extension machine',
        'Start at 90 degrees knee flexion',
        'Extend to 30 degrees only (not full extension)',
        'Avoid last 30 degrees to protect knee',
        'Control the movement',
        'Perform 3 sets of 12-15 repetitions'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Strengthening'
    },

    // ============ BALANCE AND PROPRIOCEPTION ============
    {
      externalId: 'knee_rehab_036',
      name: 'Tandem Walking',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'balance',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_tandemwalking.jpg',
      instructions: [
        'Walk placing heel directly in front of toes',
        'Like walking on a tightrope',
        'Use arms for balance',
        'Look ahead, not down',
        'Perform for 20-30 steps',
        'Do 2-3 sets'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Balance'
    },
    {
      externalId: 'knee_rehab_037',
      name: 'BOSU Ball Squats',
      bodyPart: 'Knees',
      equipment: 'bosu ball',
      target: 'proprioception',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_bosuballsquat.jpg',
      instructions: [
        'Stand on BOSU ball dome side up',
        'Perform mini squats',
        'Focus on balance and control',
        'Keep core engaged',
        'Progress to deeper squats',
        'Perform 3 sets of 10-15 repetitions'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - Balance'
    },
    {
      externalId: 'knee_rehab_038',
      name: 'Single Leg Reaches',
      bodyPart: 'Knees',
      equipment: 'body weight',
      target: 'balance',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_singlelegreach.jpg',
      instructions: [
        'Stand on one leg',
        'Reach in different directions with other leg',
        'Touch toe to ground lightly',
        'Return to center each time',
        'Maintain balance throughout',
        'Perform 10 reaches in each direction'
      ],
      difficulty: 'intermediate',
      category: 'Knee Rehabilitation - Balance'
    },
    {
      externalId: 'knee_rehab_039',
      name: 'Wobble Board Balance',
      bodyPart: 'Knees',
      equipment: 'wobble board',
      target: 'proprioception',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_wobbleboard.jpg',
      instructions: [
        'Stand on wobble board',
        'Try to keep edges from touching ground',
        'Start with two feet',
        'Progress to single leg',
        'Add ball toss for challenge',
        'Perform for 30-60 seconds, 3 sets'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - Balance'
    },
    {
      externalId: 'knee_rehab_040',
      name: 'Agility Ladder Drills',
      bodyPart: 'Knees',
      equipment: 'agility ladder',
      target: 'agility',
      gifUrl: 'https://www.hep2go.com/assets/exercises/ex_agilityladder.jpg',
      instructions: [
        'Start with simple in-in-out-out pattern',
        'Progress to lateral shuffles',
        'Add crossover steps',
        'Increase speed gradually',
        'Focus on light, quick feet',
        'Perform 3-4 patterns, 2-3 times each'
      ],
      difficulty: 'advanced',
      category: 'Knee Rehabilitation - Sports Specific'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing knee rehabilitation exercises to database...');
    
    for (const exercise of this.kneeExercises) {
      try {
        // Check if exercise already exists
        const existing = await db
          .select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values({
            ...exercise,
            apiSource: 'physiotherapy',
            secondaryMuscles: exercise.target === 'quadriceps' 
              ? ['glutes', 'calves'] 
              : exercise.target === 'hamstrings'
              ? ['glutes', 'calves']
              : [],
            isActive: true
          });
          console.log(`Added knee exercise: ${exercise.name}`);
        } else {
          console.log(`Knee exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding knee exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Knee rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.kneeExercises.map(ex => ({
      ...ex,
      apiSource: 'physiotherapy',
      secondaryMuscles: ex.target === 'quadriceps' 
        ? ['glutes', 'calves'] 
        : ex.target === 'hamstrings'
        ? ['glutes', 'calves']
        : [],
      isActive: true
    }));
  }
}

import { eq } from 'drizzle-orm';