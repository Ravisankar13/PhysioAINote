import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export class WristRehabExerciseService {
  private exercises: Omit<InsertCachedExercise, 'id'>[] = [
    // Range of Motion
    {
      externalId: 'wrist_rehab_1',
      name: 'Wrist Flexion',
      category: 'Wrist Rehabilitation - Range of Motion',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Support forearm on table. Bend wrist down toward floor. Return to neutral.',
      targetMuscles: ['Wrist Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15001.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_2',
      name: 'Wrist Extension',
      category: 'Wrist Rehabilitation - Range of Motion',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Support forearm on table. Bend wrist up toward ceiling. Return to neutral.',
      targetMuscles: ['Wrist Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15002.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_3',
      name: 'Radial Deviation',
      category: 'Wrist Rehabilitation - Range of Motion',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Forearm on table, thumb up. Bend wrist toward thumb side. Return to neutral.',
      targetMuscles: ['Radial Deviators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15003.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_4',
      name: 'Ulnar Deviation',
      category: 'Wrist Rehabilitation - Range of Motion',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Forearm on table, thumb up. Bend wrist toward pinky side. Return to neutral.',
      targetMuscles: ['Ulnar Deviators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15004.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_5',
      name: 'Wrist Circles',
      category: 'Wrist Rehabilitation - Range of Motion',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Make slow circles with wrist. 10 clockwise, then 10 counter-clockwise.',
      targetMuscles: ['Wrist Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15005.jpg',
      sets: 3,
      reps: '10 each direction',
      duration: null,
      restPeriod: '15 seconds'
    },
    
    // Stretching
    {
      externalId: 'wrist_rehab_6',
      name: 'Prayer Stretch',
      category: 'Wrist Rehabilitation - Flexibility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Palms together in prayer position. Lower hands keeping palms together. Feel stretch.',
      targetMuscles: ['Wrist Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15006.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_7',
      name: 'Reverse Prayer Stretch',
      category: 'Wrist Rehabilitation - Flexibility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Back of hands together, fingers pointing down. Gently push hands together.',
      targetMuscles: ['Wrist Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15007.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_8',
      name: 'Flexor Stretch',
      category: 'Wrist Rehabilitation - Flexibility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Extend arm, palm up. Pull fingers back with other hand. Feel stretch in forearm.',
      targetMuscles: ['Wrist Flexors', 'Forearm'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15008.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Strengthening
    {
      externalId: 'wrist_rehab_9',
      name: 'Wrist Curls',
      category: 'Wrist Rehabilitation - Strengthening',
      bodyPart: 'Wrists',
      equipment: 'Dumbbell',
      difficulty: 'beginner',
      instructions: 'Forearm on table, palm up. Curl weight up with wrist only. Lower slowly.',
      targetMuscles: ['Wrist Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15009.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'wrist_rehab_10',
      name: 'Reverse Wrist Curls',
      category: 'Wrist Rehabilitation - Strengthening',
      bodyPart: 'Wrists',
      equipment: 'Dumbbell',
      difficulty: 'beginner',
      instructions: 'Forearm on table, palm down. Lift weight up with wrist. Lower slowly.',
      targetMuscles: ['Wrist Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15010.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'wrist_rehab_11',
      name: 'Radial Deviation with Weight',
      category: 'Wrist Rehabilitation - Strengthening',
      bodyPart: 'Wrists',
      equipment: 'Hammer or Dumbbell',
      difficulty: 'intermediate',
      instructions: 'Hold weight like hammer. Bend wrist toward thumb side. Control movement.',
      targetMuscles: ['Radial Deviators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15011.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Tendon Glides
    {
      externalId: 'wrist_rehab_12',
      name: 'Tendon Glides',
      category: 'Wrist Rehabilitation - Tendon Mobility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Start with straight fingers. Make hook fist, full fist, straight fist. Return to start.',
      targetMuscles: ['Finger Tendons'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15012.jpg',
      sets: 3,
      reps: '10 sequences',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'wrist_rehab_13',
      name: 'Nerve Glides',
      category: 'Wrist Rehabilitation - Nerve Mobility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Extend arm, bend wrist back. Turn head away. Slowly move wrist up and down.',
      targetMuscles: ['Median Nerve'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15013.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Hand and Finger Exercises
    {
      externalId: 'wrist_rehab_14',
      name: 'Finger Flexion/Extension',
      category: 'Wrist Rehabilitation - Finger Mobility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Make a tight fist. Then spread fingers wide. Repeat.',
      targetMuscles: ['Finger Flexors and Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15014.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'wrist_rehab_15',
      name: 'Thumb Opposition',
      category: 'Wrist Rehabilitation - Thumb Mobility',
      bodyPart: 'Wrists',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Touch thumb to each fingertip, making an O shape. Return to start.',
      targetMuscles: ['Thumb Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/15015.jpg',
      sets: 3,
      reps: '10 sequences',
      duration: null,
      restPeriod: '15 seconds'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing wrist rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added wrist exercise: ${exercise.name}`);
        } else {
          console.log(`Wrist exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding wrist exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Wrist rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}