import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export class NeckRehabExerciseService {
  private exercises: Omit<InsertCachedExercise, 'id'>[] = [
    // Neck Range of Motion
    {
      externalId: 'neck_rehab_1',
      name: 'Cervical Flexion',
      category: 'Neck Rehabilitation - Range of Motion',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Slowly lower chin toward chest. Feel stretch in back of neck. Hold briefly. Return to neutral.',
      targetMuscles: ['Cervical Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13001.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'neck_rehab_2',
      name: 'Cervical Extension',
      category: 'Neck Rehabilitation - Range of Motion',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Slowly look up toward ceiling. Do not force movement. Return to neutral position.',
      targetMuscles: ['Cervical Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13002.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'neck_rehab_3',
      name: 'Cervical Rotation',
      category: 'Neck Rehabilitation - Range of Motion',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Turn head slowly to look over shoulder. Hold briefly. Return to center and repeat other side.',
      targetMuscles: ['Cervical Rotators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13003.jpg',
      sets: 3,
      reps: '10 each side',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'neck_rehab_4',
      name: 'Lateral Flexion (Side Bending)',
      category: 'Neck Rehabilitation - Range of Motion',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Tilt ear toward shoulder without raising shoulder. Feel stretch on opposite side. Return to center.',
      targetMuscles: ['Lateral Cervical Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13004.jpg',
      sets: 3,
      reps: '10 each side',
      duration: null,
      restPeriod: '15 seconds'
    },
    
    // Isometric Strengthening
    {
      externalId: 'neck_rehab_5',
      name: 'Isometric Flexion',
      category: 'Neck Rehabilitation - Strengthening',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Place hand on forehead. Push head into hand without moving. Hold 5-10 seconds.',
      targetMuscles: ['Deep Neck Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13005.jpg',
      sets: 3,
      reps: 'Hold 5-10 seconds',
      duration: '5-10 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'neck_rehab_6',
      name: 'Isometric Extension',
      category: 'Neck Rehabilitation - Strengthening',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Place hands behind head. Push head back into hands without moving. Hold 5-10 seconds.',
      targetMuscles: ['Cervical Extensors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13006.jpg',
      sets: 3,
      reps: 'Hold 5-10 seconds',
      duration: '5-10 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'neck_rehab_7',
      name: 'Isometric Lateral Flexion',
      category: 'Neck Rehabilitation - Strengthening',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Place hand on side of head. Push head into hand without moving. Hold 5-10 seconds.',
      targetMuscles: ['Lateral Neck Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13007.jpg',
      sets: 3,
      reps: 'Hold 5-10 seconds each side',
      duration: '5-10 seconds',
      restPeriod: '30 seconds'
    },
    
    // Stretching
    {
      externalId: 'neck_rehab_8',
      name: 'Upper Trapezius Stretch',
      category: 'Neck Rehabilitation - Flexibility',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Tilt head to one side. Use hand to gently increase stretch. Hold 30 seconds.',
      targetMuscles: ['Upper Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13008.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each side',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'neck_rehab_9',
      name: 'Levator Scapulae Stretch',
      category: 'Neck Rehabilitation - Flexibility',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Look down and to one side. Use hand to gently pull head down. Feel stretch in back/side of neck.',
      targetMuscles: ['Levator Scapulae'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13009.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each side',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'neck_rehab_10',
      name: 'Scalene Stretch',
      category: 'Neck Rehabilitation - Flexibility',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Tilt head to side and slightly back. Look up and away. Feel stretch in front/side of neck.',
      targetMuscles: ['Scalenes'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13010.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each side',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Postural Exercises
    {
      externalId: 'neck_rehab_11',
      name: 'Chin Tucks',
      category: 'Neck Rehabilitation - Postural',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Pull chin straight back (not down). Make double chin. Hold 5 seconds. Relax.',
      targetMuscles: ['Deep Neck Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13011.jpg',
      sets: 3,
      reps: '10-15',
      duration: '5 seconds hold',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'neck_rehab_12',
      name: 'Wall Angels',
      category: 'Neck Rehabilitation - Postural',
      bodyPart: 'Neck',
      equipment: 'Wall',
      difficulty: 'intermediate',
      instructions: 'Stand against wall. Arms in goal post position. Slide arms up and down maintaining contact.',
      targetMuscles: ['Upper Back', 'Neck Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13012.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'neck_rehab_13',
      name: 'Scapular Retraction',
      category: 'Neck Rehabilitation - Postural',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Squeeze shoulder blades together. Hold 5 seconds. Relax. Keep shoulders down.',
      targetMuscles: ['Rhomboids', 'Middle Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13013.jpg',
      sets: 3,
      reps: '10-15',
      duration: '5 seconds hold',
      restPeriod: '30 seconds'
    },
    
    // Advanced Stabilization
    {
      externalId: 'neck_rehab_14',
      name: 'Deep Neck Flexor Training',
      category: 'Neck Rehabilitation - Stabilization',
      bodyPart: 'Neck',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie on back. Perform chin tuck. Lift head slightly off ground. Hold 10 seconds.',
      targetMuscles: ['Longus Colli', 'Longus Capitis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13014.jpg',
      sets: 3,
      reps: '5-10',
      duration: '10 seconds hold',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'neck_rehab_15',
      name: 'Neck Stabilization with Band',
      category: 'Neck Rehabilitation - Stabilization',
      bodyPart: 'Neck',
      equipment: 'Resistance Band',
      difficulty: 'advanced',
      instructions: 'Loop band around head. Maintain neutral position while band provides resistance.',
      targetMuscles: ['Neck Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/13015.jpg',
      sets: 3,
      reps: '30-60 seconds',
      duration: '30-60 seconds',
      restPeriod: '60 seconds'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing neck rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added neck exercise: ${exercise.name}`);
        } else {
          console.log(`Neck exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding neck exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Neck rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}