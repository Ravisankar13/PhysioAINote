import { db } from './db';
import { cachedExercises, type InsertCachedExercise } from '@shared/schema';

// Hip rehabilitation exercise database with clinical focus
export class HipRehabExerciseService {
  private hipExercises: Omit<InsertCachedExercise, 'id'>[] = [
    // ============ GLUTE STRENGTHENING EXERCISES ============
    {
      externalId: 'hip_rehab_001',
      name: 'Glute Bridge',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/BWLyingHipExtension.gif',
      instructions: [
        'Lie on your back with knees bent and feet flat on floor, hip-width apart',
        'Engage core and squeeze glutes',
        'Lift hips off floor until body forms straight line from knees to shoulders',
        'Hold for 2-3 seconds at top',
        'Lower slowly back to starting position',
        'Perform 3 sets of 15-20 repetitions'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Glute Strengthening'
    },
    {
      externalId: 'hip_rehab_002',
      name: 'Single Leg Glute Bridge',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/BWSingleLegHipExtension.gif',
      instructions: [
        'Lie on back with one knee bent, other leg straight',
        'Lift straight leg to match height of bent knee',
        'Push through heel of planted foot to lift hips',
        'Keep hips level throughout movement',
        'Hold 2-3 seconds, lower slowly',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Glute Strengthening'
    },
    {
      externalId: 'hip_rehab_003',
      name: 'Clamshells',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/BWSideLyingHipAbduction.gif',
      instructions: [
        'Lie on side with hips and knees bent at 45 degrees',
        'Keep feet together and core engaged',
        'Rotate top knee upward while keeping feet touching',
        'Feel contraction in outer hip/glute',
        'Lower slowly with control',
        'Perform 3 sets of 15-20 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Hip Abduction'
    },
    {
      externalId: 'hip_rehab_004',
      name: 'Isometric Belt Abduction',
      bodyPart: 'Hips',
      equipment: 'belt',
      target: 'hip abductors',
      gifUrl: 'https://orthoinfo.aaos.org/globalassets/figures/a00033f11.jpg',
      instructions: [
        'Sit in chair with belt around both knees',
        'Keep feet flat on floor, hip-width apart',
        'Push knees outward against belt resistance',
        'Hold isometric contraction for 5-10 seconds',
        'Relax and repeat',
        'Perform 3 sets of 10-15 holds'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Isometric'
    },
    {
      externalId: 'hip_rehab_005',
      name: 'Monster Walks (Lateral Band Walks)',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/RBHipAbduction.gif',
      instructions: [
        'Place resistance band around ankles or above knees',
        'Stand with feet hip-width apart, slight knee bend',
        'Step sideways maintaining tension in band',
        'Keep toes pointing forward, avoid rotating',
        'Take 10-15 steps one direction, then return',
        'Perform 3 sets each direction'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_006',
      name: 'Fire Hydrants (Quadruped Hip Abduction)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/BWQuadrupedHipAbduction.gif',
      instructions: [
        'Start on hands and knees (quadruped position)',
        'Keep core engaged and back neutral',
        'Lift one knee out to side while maintaining 90-degree angle',
        'Lift until thigh is parallel to floor',
        'Lower with control',
        'Perform 3 sets of 12-15 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Hip Abduction'
    },
    {
      externalId: 'hip_rehab_007',
      name: 'Side-lying Hip Abduction',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/BWSideLyingHipAbduction.gif',
      instructions: [
        'Lie on side with bottom knee slightly bent for stability',
        'Keep top leg straight with toes pointing forward',
        'Lift top leg up toward ceiling about 45 degrees',
        'Avoid rotating hip or leaning back',
        'Lower slowly with control',
        'Perform 3 sets of 15-20 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Hip Abduction'
    },
    {
      externalId: 'hip_rehab_008',
      name: 'Standing Hip Abduction',
      bodyPart: 'Hips',
      equipment: 'cable',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/CBHipAbduction.gif',
      instructions: [
        'Stand perpendicular to cable or band anchor',
        'Attach ankle strap to outside leg',
        'Hold stable object for balance if needed',
        'Lift leg out to side keeping knee straight',
        'Control the return to starting position',
        'Perform 3 sets of 12-15 per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Hip Abduction'
    },

    // ============ HIP FLEXOR EXERCISES ============
    {
      externalId: 'hip_rehab_009',
      name: 'Standing Hip Flexion',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/CBHipFlexion.gif',
      instructions: [
        'Stand with band around ankle, facing away from anchor',
        'Keep standing leg slightly bent',
        'Lift knee toward chest against resistance',
        'Keep core engaged and avoid leaning back',
        'Lower with control',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Hip Flexion'
    },
    {
      externalId: 'hip_rehab_010',
      name: 'Supine Hip Flexion (Knee to Chest)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWLyingKneeRaise.gif',
      instructions: [
        'Lie on back with legs straight',
        'Slowly bring one knee toward chest',
        'Use hands to gently pull knee closer if comfortable',
        'Hold for 20-30 seconds',
        'Return to start position',
        'Perform 3 sets of 10 per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_011',
      name: 'Seated Hip Flexion',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWSeatedLegRaise.gif',
      instructions: [
        'Sit in chair with feet flat on floor',
        'Place band around foot if using resistance',
        'Lift knee toward chest keeping back straight',
        'Hold briefly at top',
        'Lower with control',
        'Perform 3 sets of 15 per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Hip Flexion'
    },

    // ============ ISOMETRIC EXERCISES ============
    {
      externalId: 'hip_rehab_012',
      name: 'Isometric Hip Extension',
      bodyPart: 'Hips',
      equipment: 'wall',
      target: 'glutes',
      gifUrl: 'https://orthoinfo.aaos.org/globalassets/figures/a00033f11.jpg',
      instructions: [
        'Stand facing away from wall, heel against wall',
        'Push heel back into wall without moving',
        'Feel contraction in glute',
        'Hold for 5-10 seconds',
        'Relax and repeat',
        'Perform 3 sets of 10 holds per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Isometric'
    },
    {
      externalId: 'hip_rehab_013',
      name: 'Isometric Hip Flexion',
      bodyPart: 'Hips',
      equipment: 'wall',
      target: 'hip flexors',
      gifUrl: 'https://orthoinfo.aaos.org/globalassets/figures/a00033f12.jpg',
      instructions: [
        'Stand facing wall with knee lifted to 90 degrees',
        'Push knee into wall without moving',
        'Feel contraction in hip flexor',
        'Hold for 5-10 seconds',
        'Relax and repeat',
        'Perform 3 sets of 10 holds per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Isometric'
    },
    {
      externalId: 'hip_rehab_014',
      name: 'Wall Sit with Hip Abduction',
      bodyPart: 'Hips',
      equipment: 'wall',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/BWSingleLegWallSquat.gif',
      instructions: [
        'Lean back against wall with feet shoulder-width apart',
        'Slide down until thighs parallel to floor',
        'Place band around knees if desired',
        'Push knees outward maintaining wall sit',
        'Hold position for 30-60 seconds',
        'Perform 3 sets'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Isometric'
    },

    // ============ HIP MOBILITY & STRETCHING ============
    {
      externalId: 'hip_rehab_015',
      name: '90/90 Hip Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip rotators',
      gifUrl: 'https://www.exrx.net/Stretches/HipExternalRotators/Seated90-90.gif',
      instructions: [
        'Sit with front leg bent at 90 degrees in front',
        'Back leg also bent at 90 degrees to side',
        'Keep spine tall and lean forward over front leg',
        'Feel stretch in outer hip of front leg',
        'Hold for 30-60 seconds',
        'Switch sides and repeat 2-3 times each'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_016',
      name: 'Pigeon Pose',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip rotators',
      gifUrl: 'https://www.exrx.net/Stretches/HipExternalRotators/PigeonPose.gif',
      instructions: [
        'Start in plank position',
        'Bring one knee forward behind same-side wrist',
        'Extend opposite leg straight back',
        'Lower hips toward floor',
        'Hold for 30-60 seconds feeling stretch in hip',
        'Perform 2-3 times per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_017',
      name: 'Hip Flexor Stretch (Kneeling)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/Stretches/HipFlexors/KneelingHipFlexor.gif',
      instructions: [
        'Kneel on one knee with other foot flat in front',
        'Keep back straight and core engaged',
        'Shift weight forward until stretch felt in front of hip',
        'Avoid arching lower back',
        'Hold for 30-60 seconds',
        'Perform 2-3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_018',
      name: 'Butterfly Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip adductors',
      gifUrl: 'https://www.exrx.net/Stretches/HipAdductors/SeatedButterfly.gif',
      instructions: [
        'Sit with soles of feet together',
        'Let knees fall out to sides',
        'Hold feet with hands',
        'Gently press knees down with elbows',
        'Lean forward slightly to increase stretch',
        'Hold for 30-60 seconds, repeat 2-3 times'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_019',
      name: 'Figure-4 Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip rotators',
      gifUrl: 'https://www.exrx.net/Stretches/HipExternalRotators/LyingCrossover.gif',
      instructions: [
        'Lie on back with knees bent',
        'Cross one ankle over opposite knee',
        'Pull thigh of bottom leg toward chest',
        'Feel stretch in outer hip of crossed leg',
        'Hold for 30-60 seconds',
        'Perform 2-3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_020',
      name: 'Hip CAR (Controlled Articular Rotation)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip joint',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWStandingHipCircles.gif',
      instructions: [
        'Stand on one leg, hold wall for balance',
        'Lift knee to 90 degrees',
        'Slowly rotate hip in large circle',
        'Move through full comfortable range',
        'Perform 5 circles each direction',
        'Repeat on other leg, 2-3 sets'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_021',
      name: 'Frog Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip adductors',
      gifUrl: 'https://www.exrx.net/Stretches/HipAdductors/KneelingGroin.gif',
      instructions: [
        'Start on hands and knees',
        'Spread knees wide, keeping them bent at 90 degrees',
        'Keep feet in line with knees',
        'Rock hips back toward heels',
        'Feel stretch in inner thighs',
        'Hold 30-60 seconds, repeat 2-3 times'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Mobility'
    },

    // ============ HIP STABILIZATION ============
    {
      externalId: 'hip_rehab_022',
      name: 'Single Leg Deadlift',
      bodyPart: 'Hips',
      equipment: 'dumbbell',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Hamstrings/DBSingleLegStraightLegDeadlift.gif',
      instructions: [
        'Stand on one leg holding weight in opposite hand',
        'Hinge at hip while extending free leg behind',
        'Keep back straight and core engaged',
        'Lower until torso parallel to floor',
        'Return to standing position',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Stabilization'
    },
    {
      externalId: 'hip_rehab_023',
      name: 'Single Leg Stand',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip stabilizers',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Ankle/BWSingleLegStand.gif',
      instructions: [
        'Stand on one leg with slight knee bend',
        'Keep hips level and core engaged',
        'Hold for 30-60 seconds',
        'For challenge, close eyes or stand on unstable surface',
        'Progress by adding arm movements',
        'Perform 3 sets per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Balance'
    },
    {
      externalId: 'hip_rehab_024',
      name: 'Bird Dog',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'core',
      gifUrl: 'https://www.exrx.net/AnimatedEx/ErectorSpinae/BWBirdDog.gif',
      instructions: [
        'Start on hands and knees',
        'Extend opposite arm and leg simultaneously',
        'Keep hips level and core engaged',
        'Hold for 5-10 seconds',
        'Return to start with control',
        'Perform 3 sets of 10-12 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Core Stability'
    },
    {
      externalId: 'hip_rehab_025',
      name: 'Dead Bug',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'core',
      gifUrl: 'https://www.exrx.net/AnimatedEx/RectusAbdominis/BWDeadBug.gif',
      instructions: [
        'Lie on back with arms reaching up',
        'Lift knees to 90 degrees',
        'Lower opposite arm and leg toward floor',
        'Keep lower back pressed to floor',
        'Return to start and switch sides',
        'Perform 3 sets of 10-12 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Core Stability'
    },
    {
      externalId: 'hip_rehab_026',
      name: 'Pallof Press',
      bodyPart: 'Hips',
      equipment: 'cable',
      target: 'core',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Obliques/CBPallofPress.gif',
      instructions: [
        'Stand perpendicular to cable at chest height',
        'Hold handle with both hands at chest',
        'Press arms straight out resisting rotation',
        'Hold for 2-3 seconds',
        'Return to chest with control',
        'Perform 3 sets of 12-15 per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Anti-Rotation'
    },

    // ============ CLINICAL REHABILITATION ============
    {
      externalId: 'hip_rehab_027',
      name: 'Prone Hip Extension',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/BWProneHipExtension.gif',
      instructions: [
        'Lie face down with legs straight',
        'Keep knee straight and lift leg up',
        'Squeeze glute at top of movement',
        'Avoid rotating pelvis',
        'Lower with control',
        'Perform 3 sets of 15 per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Strengthening'
    },
    {
      externalId: 'hip_rehab_028',
      name: 'Sidelying Hip External Rotation',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip rotators',
      gifUrl: 'https://orthoinfo.aaos.org/globalassets/figures/a00033f13.jpg',
      instructions: [
        'Lie on side with knees bent to 90 degrees',
        'Keep feet together',
        'Rotate top knee upward (external rotation)',
        'Keep pelvis stable',
        'Lower with control',
        'Perform 3 sets of 15-20 per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Rotation'
    },
    {
      externalId: 'hip_rehab_029',
      name: 'Standing Hip Hikes',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip stabilizers',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/BWStandingHipHike.gif',
      instructions: [
        'Stand on step with one leg hanging off edge',
        'Keep standing leg straight',
        'Drop hanging hip down, then hike it up',
        'Use hip muscles, not trunk lean',
        'Control the movement',
        'Perform 3 sets of 15 per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_030',
      name: 'Step-ups',
      bodyPart: 'Hips',
      equipment: 'box',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/DBStepUp.gif',
      instructions: [
        'Stand facing box or step (12-16 inches)',
        'Place one foot fully on step',
        'Push through heel to step up',
        'Control the descent',
        'Keep knee tracking over toes',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_031',
      name: 'Lateral Step-ups',
      bodyPart: 'Hips',
      equipment: 'box',
      target: 'hip abductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/DBLateralStepUp.gif',
      instructions: [
        'Stand beside box or step',
        'Place nearest foot on step',
        'Push up to standing on step',
        'Focus on using hip muscles',
        'Control the descent',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_032',
      name: 'Step-downs (Eccentric Control)',
      bodyPart: 'Hips',
      equipment: 'box',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/BWStepDown.gif',
      instructions: [
        'Stand on box or step',
        'Slowly lower one foot toward floor',
        'Control descent with standing leg',
        'Tap floor lightly, return to start',
        'Keep hips level throughout',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Eccentric'
    },

    // ============ ADVANCED/FUNCTIONAL ============
    {
      externalId: 'hip_rehab_033',
      name: 'Lateral Lunges',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip adductors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/DBLateralLunge.gif',
      instructions: [
        'Stand with feet together',
        'Step wide to one side',
        'Bend stepping leg while keeping other straight',
        'Push hips back and down',
        'Push off to return to start',
        'Perform 3 sets of 12-15 per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_034',
      name: 'Curtsy Lunges',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/DBCrossoverLunge.gif',
      instructions: [
        'Stand with feet hip-width apart',
        'Step one leg behind and across other leg',
        'Lower into lunge position',
        'Keep front knee over ankle',
        'Push through front heel to return',
        'Perform 3 sets of 12-15 per side'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Functional'
    },
    {
      externalId: 'hip_rehab_035',
      name: 'Bulgarian Split Squats',
      bodyPart: 'Hips',
      equipment: 'bench',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/DBSingleLegSplitSquat.gif',
      instructions: [
        'Place rear foot on bench behind you',
        'Lower into lunge position',
        'Keep front knee tracking over toes',
        'Push through front heel to return',
        'Maintain upright torso',
        'Perform 3 sets of 10-12 per leg'
      ],
      difficulty: 'advanced',
      category: 'Hip Rehabilitation - Advanced'
    },
    {
      externalId: 'hip_rehab_036',
      name: 'Single Leg Box Squats',
      bodyPart: 'Hips',
      equipment: 'box',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/BWSingleLegSquat.gif',
      instructions: [
        'Stand on one leg in front of box',
        'Slowly lower to seated position',
        'Keep knee tracking over toes',
        'Stand back up on same leg',
        'Use arms for balance only',
        'Perform 3 sets of 8-10 per leg'
      ],
      difficulty: 'advanced',
      category: 'Hip Rehabilitation - Advanced'
    },
    {
      externalId: 'hip_rehab_037',
      name: 'Lateral Bounds',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip stabilizers',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Plyometrics/BWLateralBound.gif',
      instructions: [
        'Start standing on one leg',
        'Bound laterally to opposite leg',
        'Land softly with knee bent',
        'Stabilize before next bound',
        'Focus on control and balance',
        'Perform 3 sets of 10 bounds each direction'
      ],
      difficulty: 'advanced',
      category: 'Hip Rehabilitation - Plyometric'
    },
    {
      externalId: 'hip_rehab_038',
      name: 'Skater Hops',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip stabilizers',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Plyometrics/BWSkaterHop.gif',
      instructions: [
        'Start in partial squat position',
        'Hop laterally landing on opposite foot',
        'Swing arms for momentum',
        'Land softly with control',
        'Immediately hop to other side',
        'Perform 3 sets of 20 total hops'
      ],
      difficulty: 'advanced',
      category: 'Hip Rehabilitation - Plyometric'
    },

    // ============ SPECIFIC CONDITIONS ============
    {
      externalId: 'hip_rehab_039',
      name: 'Thomas Stretch (Hip Flexor)',
      bodyPart: 'Hips',
      equipment: 'table',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/Stretches/HipFlexors/LyingThomas.gif',
      instructions: [
        'Lie on edge of table/bed',
        'Pull one knee to chest',
        'Let other leg hang off edge',
        'Feel stretch in front of hanging hip',
        'Hold for 30-60 seconds',
        'Perform 2-3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - FAI Protocol'
    },
    {
      externalId: 'hip_rehab_040',
      name: 'Hip Flexor Isometric (FAI Safe)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip flexors',
      gifUrl: 'https://orthoinfo.aaos.org/globalassets/figures/a00033f12.jpg',
      instructions: [
        'Sit in chair with good posture',
        'Place hands on top of thigh',
        'Push thigh up against hand resistance',
        'Hold for 5-10 seconds without moving',
        'Keep hip angle less than 90 degrees',
        'Perform 3 sets of 10 holds'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - FAI Protocol'
    },
    {
      externalId: 'hip_rehab_041',
      name: 'Aqua Walking (Arthritis)',
      bodyPart: 'Hips',
      equipment: 'pool',
      target: 'hip joint',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Cardio/WaterWalking.gif',
      instructions: [
        'Walk in waist-deep water',
        'Take normal walking strides',
        'Use water resistance for gentle strengthening',
        'Walk forward, backward, and sideways',
        'Perform for 20-30 minutes',
        'Low impact for arthritic hips'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Arthritis'
    },
    {
      externalId: 'hip_rehab_042',
      name: 'Mini Squats (Post-Op)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/BWSquat.gif',
      instructions: [
        'Stand with feet hip-width apart',
        'Squat down only 30-45 degrees',
        'Keep weight evenly distributed',
        'Use chair for support if needed',
        'Return to standing slowly',
        'Perform 3 sets of 15-20'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Post-Op'
    },
    {
      externalId: 'hip_rehab_043',
      name: 'Heel Slides (Post-Op)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWHeelSlide.gif',
      instructions: [
        'Lie on back with legs straight',
        'Slowly slide heel toward buttocks',
        'Bend knee as far as comfortable',
        'Hold briefly, then slide back',
        'Keep movement controlled',
        'Perform 3 sets of 15-20'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Post-Op'
    },
    {
      externalId: 'hip_rehab_044',
      name: 'Seated Marching',
      bodyPart: 'Hips',
      equipment: 'chair',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWSeatedMarch.gif',
      instructions: [
        'Sit in chair with feet flat',
        'Lift one knee up like marching',
        'Lower with control',
        'Alternate legs rhythmically',
        'Keep back straight',
        'Perform for 1-2 minutes, 3 sets'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Early Phase'
    },
    {
      externalId: 'hip_rehab_045',
      name: 'Standing Marching',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWHighKnee.gif',
      instructions: [
        'Stand with feet hip-width apart',
        'Lift knee to hip height',
        'Lower with control',
        'Alternate legs like marching',
        'Use wall for balance if needed',
        'Perform for 1-2 minutes, 3 sets'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Warm-up'
    },

    // ============ GREATER TROCHANTERIC PAIN SYNDROME ============
    {
      externalId: 'hip_rehab_046',
      name: 'Side-lying Hip Abduction (GTPS)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'gluteus medius',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipAbductors/BWSideLyingHipAbduction.gif',
      instructions: [
        'Lie on unaffected side',
        'Slightly bend bottom knee for stability',
        'Keep top leg straight, toes forward',
        'Lift leg to 30 degrees only (not higher)',
        'Hold 5 seconds, lower slowly',
        'Perform 3 sets of 10-15'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - GTPS'
    },
    {
      externalId: 'hip_rehab_047',
      name: 'Wall Squat Isometric (GTPS)',
      bodyPart: 'Hips',
      equipment: 'wall',
      target: 'gluteus medius',
      gifUrl: 'https://www.exrx.net/AnimatedEx/Quadriceps/BWWallSquat.gif',
      instructions: [
        'Stand with back against wall',
        'Slide down to 45-60 degree squat',
        'Keep knees behind toes',
        'Hold position for 30-60 seconds',
        'Focus on glute engagement',
        'Perform 3 sets'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - GTPS'
    },
    {
      externalId: 'hip_rehab_048',
      name: 'Single Leg Bridge (GTPS)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'gluteus medius',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/BWSingleLegHipExtension.gif',
      instructions: [
        'Lie on back, one knee bent',
        'Extend other leg straight',
        'Lift hips using bent leg only',
        'Keep pelvis level',
        'Hold 5 seconds at top',
        'Perform 3 sets of 10 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - GTPS'
    },

    // ============ HIP LABRAL TEAR EXERCISES ============
    {
      externalId: 'hip_rehab_049',
      name: 'Quadruped Rocking',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip joint',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWQuadrupedRocking.gif',
      instructions: [
        'Start on hands and knees',
        'Rock hips back toward heels',
        'Stop before pain or pinching',
        'Return to start position',
        'Keep spine neutral',
        'Perform 3 sets of 15-20'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Labral'
    },
    {
      externalId: 'hip_rehab_050',
      name: 'Hip Flexion with Band (Labral Safe)',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/CBHipFlexion.gif',
      instructions: [
        'Attach band to ankle',
        'Stand facing away from anchor',
        'Lift knee to 70-80 degrees only',
        'Avoid hip impingement position',
        'Control return to start',
        'Perform 3 sets of 12-15'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Labral'
    },

    // ============ PIRIFORMIS SYNDROME ============
    {
      externalId: 'hip_rehab_051',
      name: 'Seated Piriformis Stretch',
      bodyPart: 'Hips',
      equipment: 'chair',
      target: 'piriformis',
      gifUrl: 'https://www.exrx.net/Stretches/HipExternalRotators/SeatedCrossover.gif',
      instructions: [
        'Sit in chair with feet flat',
        'Cross affected ankle over opposite knee',
        'Gently lean forward keeping back straight',
        'Feel stretch deep in buttock',
        'Hold 30-60 seconds',
        'Perform 3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Piriformis'
    },
    {
      externalId: 'hip_rehab_052',
      name: 'Supine Piriformis Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'piriformis',
      gifUrl: 'https://www.exrx.net/Stretches/HipExternalRotators/LyingCrossover.gif',
      instructions: [
        'Lie on back with knees bent',
        'Cross affected ankle over opposite knee',
        'Pull thigh toward chest',
        'Feel stretch in buttock',
        'Hold 30-60 seconds',
        'Perform 3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Piriformis'
    },

    // ============ SNAPPING HIP SYNDROME ============
    {
      externalId: 'hip_rehab_053',
      name: 'IT Band Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'IT band',
      gifUrl: 'https://www.exrx.net/Stretches/TensorFasciaeLatae/Standing.gif',
      instructions: [
        'Stand with affected leg crossed behind',
        'Lean away from affected side',
        'Push hip toward affected side',
        'Feel stretch along outer thigh',
        'Hold 30-60 seconds',
        'Perform 3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - IT Band'
    },
    {
      externalId: 'hip_rehab_054',
      name: 'Foam Roll IT Band',
      bodyPart: 'Hips',
      equipment: 'foam roll',
      target: 'IT band',
      gifUrl: 'https://www.exrx.net/AnimatedEx/FoamRoll/FoamRollITBand.gif',
      instructions: [
        'Lie on side with foam roller under outer thigh',
        'Support body weight with arms',
        'Roll from hip to just above knee',
        'Pause on tender spots',
        'Perform for 1-2 minutes per side',
        'Do daily for best results'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Myofascial'
    },

    // ============ SACROILIAC JOINT EXERCISES ============
    {
      externalId: 'hip_rehab_055',
      name: 'Knee to Chest (SI Joint)',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'SI joint',
      gifUrl: 'https://www.exrx.net/Stretches/HipFlexors/LyingKneeToChest.gif',
      instructions: [
        'Lie on back with legs straight',
        'Pull one knee toward chest',
        'Keep other leg straight on floor',
        'Hold 30 seconds',
        'Feel stretch in lower back/hip',
        'Perform 3 times per side'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - SI Joint'
    },
    {
      externalId: 'hip_rehab_056',
      name: 'Double Knee to Chest',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'SI joint',
      gifUrl: 'https://www.exrx.net/Stretches/ErectorSpinae/LyingKneesToChest.gif',
      instructions: [
        'Lie on back',
        'Pull both knees toward chest',
        'Hold behind thighs',
        'Rock gently side to side',
        'Hold 30-60 seconds',
        'Perform 3 times'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - SI Joint'
    },
    {
      externalId: 'hip_rehab_057',
      name: 'Hip Adductor Stretch',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip adductors',
      gifUrl: 'https://www.exrx.net/Stretches/HipAdductors/SeatedStraddle.gif',
      instructions: [
        'Sit with legs spread wide',
        'Keep back straight',
        'Lean forward from hips',
        'Feel stretch in inner thighs',
        'Hold 30-60 seconds',
        'Perform 3 times'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Flexibility'
    },
    {
      externalId: 'hip_rehab_058',
      name: 'Standing Hip Circles',
      bodyPart: 'Hips',
      equipment: 'body weight',
      target: 'hip joint',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/BWStandingHipCircles.gif',
      instructions: [
        'Stand on one leg, hands on hips',
        'Make small circles with lifted knee',
        'Perform 10 circles clockwise',
        'Then 10 circles counter-clockwise',
        'Keep movements controlled',
        'Perform 2-3 sets per leg'
      ],
      difficulty: 'beginner',
      category: 'Hip Rehabilitation - Mobility'
    },
    {
      externalId: 'hip_rehab_059',
      name: 'Resistance Band Hip Flexion',
      bodyPart: 'Hips',
      equipment: 'resistance band',
      target: 'hip flexors',
      gifUrl: 'https://www.exrx.net/AnimatedEx/HipFlexors/RBHipFlexion.gif',
      instructions: [
        'Attach band around ankle',
        'Stand facing away from anchor point',
        'Lift knee forward against resistance',
        'Keep core engaged',
        'Lower with control',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Strengthening'
    },
    {
      externalId: 'hip_rehab_060',
      name: 'Cable Hip Extension',
      bodyPart: 'Hips',
      equipment: 'cable',
      target: 'glutes',
      gifUrl: 'https://www.exrx.net/AnimatedEx/GluteusMaximus/CBStandingHipExtension.gif',
      instructions: [
        'Attach cable to ankle',
        'Face cable machine',
        'Extend leg backward keeping knee straight',
        'Squeeze glute at end of movement',
        'Return with control',
        'Perform 3 sets of 12-15 per leg'
      ],
      difficulty: 'intermediate',
      category: 'Hip Rehabilitation - Strengthening'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing hip rehabilitation exercises to database...');
    
    try {
      for (const exercise of this.hipExercises) {
        // Check if exercise already exists
        const existing = await db.query.cachedExercises.findFirst({
          where: (exercises, { eq }) => eq(exercises.externalId, exercise.externalId)
        });

        if (!existing) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added hip exercise: ${exercise.name}`);
        } else {
          console.log(`Hip exercise already exists: ${exercise.name}`);
        }
      }
      
      console.log('Hip rehabilitation exercises sync complete!');
    } catch (error) {
      console.error('Error syncing hip exercises:', error);
      throw error;
    }
  }

  getExercisesByCategory(category: string): Omit<InsertCachedExercise, 'id'>[] {
    return this.hipExercises.filter(ex => ex.category === category);
  }

  getExercisesByDifficulty(difficulty: string): Omit<InsertCachedExercise, 'id'>[] {
    return this.hipExercises.filter(ex => ex.difficulty === difficulty);
  }

  getExercisesByTarget(target: string): Omit<InsertCachedExercise, 'id'>[] {
    return this.hipExercises.filter(ex => ex.target === target);
  }
}