import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { transformExercise } from './transformExercises';

export class CoreRehabExerciseService {
  private rawExercises = [
    // Basic Core Activation
    {
      externalId: 'core_rehab_1',
      name: 'Transverse Abdominis Activation',
      category: 'Core Rehabilitation - Activation',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Draw belly button toward spine without moving back. Hold 5-10 seconds.',
      targetMuscles: ['transverse abdominis'],
      imageUrl: 'https://www.hep2go.com/ex_images/16001.jpg'
    },
    {
      externalId: 'core_rehab_2',
      name: 'Pelvic Tilts',
      category: 'Core Rehabilitation - Activation',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Flatten lower back against floor by tilting pelvis. Hold briefly.',
      targetMuscles: ['core', 'pelvic floor'],
      imageUrl: 'https://www.hep2go.com/ex_images/16002.jpg'
    },
    {
      externalId: 'core_rehab_3',
      name: 'Dead Bug',
      category: 'Core Rehabilitation - Stability',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'Lie on back, arms up, knees at 90 degrees. Lower opposite arm and leg slowly. Return and alternate.',
      targetMuscles: ['deep core', 'hip flexors'],
      imageUrl: 'https://www.hep2go.com/ex_images/16003.jpg'
    },
    {
      externalId: 'core_rehab_4',
      name: 'Bird Dog',
      category: 'Core Rehabilitation - Stability',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'On hands and knees, extend opposite arm and leg. Hold 5 seconds. Return and switch.',
      targetMuscles: ['multifidus', 'erector spinae', 'core'],
      imageUrl: 'https://www.hep2go.com/ex_images/16004.jpg'
    },
    
    // Plank Variations
    {
      externalId: 'core_rehab_5',
      name: 'Modified Plank',
      category: 'Core Rehabilitation - Strengthening',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'On knees and forearms. Keep body straight from knees to head. Hold position.',
      targetMuscles: ['core', 'shoulders'],
      imageUrl: 'https://www.hep2go.com/ex_images/16005.jpg'
    },
    {
      externalId: 'core_rehab_6',
      name: 'Full Plank',
      category: 'Core Rehabilitation - Strengthening',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'On forearms and toes. Keep body straight from head to heels. Hold position.',
      targetMuscles: ['core', 'shoulders', 'glutes'],
      imageUrl: 'https://www.hep2go.com/ex_images/16006.jpg'
    },
    {
      externalId: 'core_rehab_7',
      name: 'Side Plank',
      category: 'Core Rehabilitation - Strengthening',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'Lie on side, prop on forearm. Lift hips off ground. Keep body straight. Hold.',
      targetMuscles: ['obliques', 'quadratus lumborum'],
      imageUrl: 'https://www.hep2go.com/ex_images/16007.jpg'
    },
    
    // Bridging
    {
      externalId: 'core_rehab_8',
      name: 'Glute Bridge',
      category: 'Core Rehabilitation - Strengthening',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Lift hips up squeezing glutes. Hold briefly. Lower slowly.',
      targetMuscles: ['glutes', 'core', 'hamstrings'],
      imageUrl: 'https://www.hep2go.com/ex_images/16008.jpg'
    },
    {
      externalId: 'core_rehab_9',
      name: 'Single Leg Bridge',
      category: 'Core Rehabilitation - Advanced',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'advanced',
      instructions: 'From bridge position, extend one leg. Hold hips level. Lower and switch.',
      targetMuscles: ['glutes', 'core', 'hip stabilizers'],
      imageUrl: 'https://www.hep2go.com/ex_images/16009.jpg'
    },
    {
      externalId: 'core_rehab_10',
      name: 'Bridge with March',
      category: 'Core Rehabilitation - Stability',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'Hold bridge position. Slowly lift one knee toward chest. Return and alternate.',
      targetMuscles: ['core', 'hip flexors', 'glutes'],
      imageUrl: 'https://www.hep2go.com/ex_images/16010.jpg'
    },
    
    // Rotational Exercises
    {
      externalId: 'core_rehab_11',
      name: 'Russian Twist',
      category: 'Core Rehabilitation - Rotation',
      bodyPart: 'Core',
      equipment: 'medicine ball',
      difficulty: 'intermediate',
      instructions: 'Sit with knees bent, lean back slightly. Rotate torso side to side holding weight.',
      targetMuscles: ['obliques', 'rectus abdominis'],
      imageUrl: 'https://www.hep2go.com/ex_images/16011.jpg'
    },
    {
      externalId: 'core_rehab_12',
      name: 'Wood Chops',
      category: 'Core Rehabilitation - Rotation',
      bodyPart: 'Core',
      equipment: 'cable',
      difficulty: 'intermediate',
      instructions: 'Pull cable diagonally across body from high to low. Control movement. Switch sides.',
      targetMuscles: ['obliques', 'core'],
      imageUrl: 'https://www.hep2go.com/ex_images/16012.jpg'
    },
    {
      externalId: 'core_rehab_13',
      name: 'Pallof Press',
      category: 'Core Rehabilitation - Anti-Rotation',
      bodyPart: 'Core',
      equipment: 'cable',
      difficulty: 'intermediate',
      instructions: 'Hold band at chest. Press straight out resisting rotation. Hold. Return to chest.',
      targetMuscles: ['deep core', 'obliques'],
      imageUrl: 'https://www.hep2go.com/ex_images/16013.jpg'
    },
    
    // Advanced Core
    {
      externalId: 'core_rehab_14',
      name: 'Ab Wheel Rollout',
      category: 'Core Rehabilitation - Advanced',
      bodyPart: 'Core',
      equipment: 'ab wheel',
      difficulty: 'advanced',
      instructions: 'From knees, roll wheel forward keeping core tight. Pull back to start.',
      targetMuscles: ['rectus abdominis', 'deep core', 'lats'],
      imageUrl: 'https://www.hep2go.com/ex_images/16014.jpg'
    },
    {
      externalId: 'core_rehab_15',
      name: 'Hanging Knee Raises',
      category: 'Core Rehabilitation - Advanced',
      bodyPart: 'Core',
      equipment: 'pull-up bar',
      difficulty: 'advanced',
      instructions: 'Hang from bar. Raise knees to chest keeping torso stable. Lower with control.',
      targetMuscles: ['lower abs', 'hip flexors'],
      imageUrl: 'https://www.hep2go.com/ex_images/16015.jpg'
    },
    {
      externalId: 'core_rehab_16',
      name: 'Turkish Get-Up',
      category: 'Core Rehabilitation - Functional',
      bodyPart: 'Core',
      equipment: 'kettlebell',
      difficulty: 'advanced',
      instructions: 'From lying, stand up while holding weight overhead. Reverse to return.',
      targetMuscles: ['entire core', 'shoulders', 'hips'],
      imageUrl: 'https://www.hep2go.com/ex_images/16016.jpg'
    },
    
    // Isometric Holds
    {
      externalId: 'core_rehab_17',
      name: 'Hollow Body Hold',
      category: 'Core Rehabilitation - Isometric',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'Lie on back, press lower back down. Lift shoulders and legs off ground. Hold.',
      targetMuscles: ['rectus abdominis', 'deep core'],
      imageUrl: 'https://www.hep2go.com/ex_images/16017.jpg'
    },
    {
      externalId: 'core_rehab_18',
      name: 'Wall Sit',
      category: 'Core Rehabilitation - Isometric',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Back against wall, slide down to 90 degrees. Hold position.',
      targetMuscles: ['quadriceps', 'core', 'glutes'],
      imageUrl: 'https://www.hep2go.com/ex_images/16018.jpg'
    },
    {
      externalId: 'core_rehab_19',
      name: 'Bear Crawl Hold',
      category: 'Core Rehabilitation - Isometric',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'On hands and toes, knees just off ground. Hold position keeping back flat.',
      targetMuscles: ['deep core', 'shoulders', 'quadriceps'],
      imageUrl: 'https://www.hep2go.com/ex_images/16019.jpg'
    },
    
    // Dynamic Core
    {
      externalId: 'core_rehab_20',
      name: 'Mountain Climbers',
      category: 'Core Rehabilitation - Dynamic',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'intermediate',
      instructions: 'In plank position, alternate bringing knees to chest rapidly.',
      targetMuscles: ['core', 'hip flexors', 'shoulders'],
      imageUrl: 'https://www.hep2go.com/ex_images/16020.jpg'
    },
    {
      externalId: 'core_rehab_21',
      name: 'Bicycle Crunches',
      category: 'Core Rehabilitation - Dynamic',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Lie on back, bring opposite elbow to knee while extending other leg.',
      targetMuscles: ['obliques', 'rectus abdominis'],
      imageUrl: 'https://www.hep2go.com/ex_images/16021.jpg'
    },
    {
      externalId: 'core_rehab_22',
      name: 'Flutter Kicks',
      category: 'Core Rehabilitation - Dynamic',
      bodyPart: 'Core',
      equipment: 'body weight',
      difficulty: 'beginner',
      instructions: 'Lie on back, lift legs slightly. Alternate small kicks up and down.',
      targetMuscles: ['lower abs', 'hip flexors'],
      imageUrl: 'https://www.hep2go.com/ex_images/16022.jpg'
    }
  ];

  // Transform raw exercises to match database schema
  private exercises: Omit<InsertCachedExercise, 'id'>[] = this.rawExercises.map(exercise => 
    transformExercise(exercise)
  );

  async syncToDatabase(): Promise<void> {
    console.log('Syncing core rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        // Check if exercise already exists
        const existing = await db
          .select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId));

        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added core exercise: ${exercise.name}`);
        } else {
          console.log(`Core exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding core exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Core rehabilitation exercises sync complete');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}