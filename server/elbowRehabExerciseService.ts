import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export class ElbowRehabExerciseService {
  private exercises: Omit<InsertCachedExercise, 'id'>[] = [
    // Tennis Elbow (Lateral Epicondylitis)
    {
      externalId: 'elbow_rehab_1',
      name: 'Wrist Extensor Stretch',
      category: 'Elbow Rehabilitation - Tennis Elbow',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Extend arm with palm down. Use other hand to bend wrist down. Feel stretch on top of forearm.',
      targetMuscles: ['Wrist Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14001.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'elbow_rehab_2',
      name: 'Eccentric Wrist Extension',
      category: 'Elbow Rehabilitation - Tennis Elbow',
      bodyPart: 'Elbows',
      equipment: 'Dumbbell',
      difficulty: 'intermediate',
      instructions: 'Support forearm on table. Lift weight with wrist extension. Slowly lower for 4 seconds.',
      targetMuscles: ['Extensor Carpi Radialis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14002.jpg',
      sets: 3,
      reps: '15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'elbow_rehab_3',
      name: 'Tyler Twist (FlexBar)',
      category: 'Elbow Rehabilitation - Tennis Elbow',
      bodyPart: 'Elbows',
      equipment: 'FlexBar',
      difficulty: 'intermediate',
      instructions: 'Hold FlexBar with affected arm. Twist with good arm. Slowly untwist with affected arm.',
      targetMuscles: ['Wrist Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14003.jpg',
      sets: 3,
      reps: '15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Golfer's Elbow (Medial Epicondylitis)
    {
      externalId: 'elbow_rehab_4',
      name: 'Wrist Flexor Stretch',
      category: 'Elbow Rehabilitation - Golfers Elbow',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Extend arm with palm up. Use other hand to bend wrist back. Feel stretch on inner forearm.',
      targetMuscles: ['Wrist Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14004.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'elbow_rehab_5',
      name: 'Eccentric Wrist Flexion',
      category: 'Elbow Rehabilitation - Golfers Elbow',
      bodyPart: 'Elbows',
      equipment: 'Dumbbell',
      difficulty: 'intermediate',
      instructions: 'Palm up, support forearm. Curl weight up with wrist. Slowly lower for 4 seconds.',
      targetMuscles: ['Flexor Carpi Radialis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14005.jpg',
      sets: 3,
      reps: '15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'elbow_rehab_6',
      name: 'Pronation/Supination',
      category: 'Elbow Rehabilitation - Strengthening',
      bodyPart: 'Elbows',
      equipment: 'Hammer or Dumbbell',
      difficulty: 'beginner',
      instructions: 'Hold weight like hammer. Rotate forearm palm up, then palm down. Control movement.',
      targetMuscles: ['Pronator Teres', 'Supinator'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14006.jpg',
      sets: 3,
      reps: '15 each direction',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // General Elbow Strengthening
    {
      externalId: 'elbow_rehab_7',
      name: 'Bicep Curls',
      category: 'Elbow Rehabilitation - Strengthening',
      bodyPart: 'Elbows',
      equipment: 'Dumbbell',
      difficulty: 'beginner',
      instructions: 'Hold weight with palm up. Bend elbow bringing weight to shoulder. Lower slowly.',
      targetMuscles: ['Biceps Brachii'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14007.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'elbow_rehab_8',
      name: 'Tricep Extension',
      category: 'Elbow Rehabilitation - Strengthening',
      bodyPart: 'Elbows',
      equipment: 'Dumbbell',
      difficulty: 'beginner',
      instructions: 'Hold weight overhead. Lower behind head by bending elbow. Extend back up.',
      targetMuscles: ['Triceps Brachii'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14008.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'elbow_rehab_9',
      name: 'Hammer Curls',
      category: 'Elbow Rehabilitation - Strengthening',
      bodyPart: 'Elbows',
      equipment: 'Dumbbell',
      difficulty: 'beginner',
      instructions: 'Hold weight with neutral grip (thumb up). Curl weight keeping wrist neutral.',
      targetMuscles: ['Brachialis', 'Brachioradialis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14009.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Range of Motion
    {
      externalId: 'elbow_rehab_10',
      name: 'Elbow Flexion/Extension',
      category: 'Elbow Rehabilitation - Range of Motion',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Bend elbow fully bringing hand to shoulder. Straighten completely. Repeat smoothly.',
      targetMuscles: ['Elbow Joint'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14010.jpg',
      sets: 3,
      reps: '20',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'elbow_rehab_11',
      name: 'Active Assisted Elbow Extension',
      category: 'Elbow Rehabilitation - Range of Motion',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Use other hand to help straighten elbow completely. Hold end position briefly.',
      targetMuscles: ['Elbow Joint'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14011.jpg',
      sets: 3,
      reps: '15',
      duration: null,
      restPeriod: '15 seconds'
    },
    
    // Nerve Glides
    {
      externalId: 'elbow_rehab_12',
      name: 'Ulnar Nerve Glide',
      category: 'Elbow Rehabilitation - Nerve Mobility',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Extend arm to side. Bend wrist back, tilt head away. Slowly bend and straighten elbow.',
      targetMuscles: ['Ulnar Nerve'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14012.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_13',
      name: 'Radial Nerve Glide',
      category: 'Elbow Rehabilitation - Nerve Mobility',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Arm at side, make fist, bend wrist down. Extend arm back while rotating shoulder in.',
      targetMuscles: ['Radial Nerve'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14013.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_14',
      name: 'Median Nerve Glide',
      category: 'Elbow Rehabilitation - Nerve Mobility',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Arm out to side, palm up. Extend wrist and fingers back. Tilt head away.',
      targetMuscles: ['Median Nerve'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14014.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Grip Strengthening
    {
      externalId: 'elbow_rehab_15',
      name: 'Grip Strengthening with Putty',
      category: 'Elbow Rehabilitation - Grip',
      bodyPart: 'Elbows',
      equipment: 'Therapy Putty',
      difficulty: 'beginner',
      instructions: 'Squeeze putty in palm. Hold 5 seconds. Release and repeat.',
      targetMuscles: ['Forearm Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14015.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_16',
      name: 'Finger Extension with Band',
      category: 'Elbow Rehabilitation - Grip',
      bodyPart: 'Elbows',
      equipment: 'Rubber Band',
      difficulty: 'beginner',
      instructions: 'Place rubber band around fingers. Spread fingers apart against resistance.',
      targetMuscles: ['Finger Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14016.jpg',
      sets: 3,
      reps: '20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_17',
      name: 'Towel Twist',
      category: 'Elbow Rehabilitation - Grip',
      bodyPart: 'Elbows',
      equipment: 'Towel',
      difficulty: 'beginner',
      instructions: 'Hold towel with both hands. Wring towel as if wringing out water. Reverse direction.',
      targetMuscles: ['Forearm Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14017.jpg',
      sets: 3,
      reps: '10 each direction',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Isometric Exercises
    {
      externalId: 'elbow_rehab_18',
      name: 'Isometric Elbow Flexion',
      category: 'Elbow Rehabilitation - Isometric',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Place hand under table. Push up without moving elbow. Hold 5-10 seconds.',
      targetMuscles: ['Biceps'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14018.jpg',
      sets: 3,
      reps: 'Hold 5-10 seconds',
      duration: '5-10 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_19',
      name: 'Isometric Elbow Extension',
      category: 'Elbow Rehabilitation - Isometric',
      bodyPart: 'Elbows',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Place hand on table top. Push down without moving elbow. Hold 5-10 seconds.',
      targetMuscles: ['Triceps'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14019.jpg',
      sets: 3,
      reps: 'Hold 5-10 seconds',
      duration: '5-10 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'elbow_rehab_20',
      name: 'Ball Squeeze',
      category: 'Elbow Rehabilitation - Grip',
      bodyPart: 'Elbows',
      equipment: 'Tennis Ball',
      difficulty: 'beginner',
      instructions: 'Squeeze tennis ball as hard as comfortable. Hold 5 seconds. Release.',
      targetMuscles: ['Forearm Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/14020.jpg',
      sets: 3,
      reps: '15-20',
      duration: '5 seconds hold',
      restPeriod: '30 seconds'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing elbow rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added elbow exercise: ${exercise.name}`);
        } else {
          console.log(`Elbow exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding elbow exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Elbow rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}