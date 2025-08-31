import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

export class ShoulderRehabExerciseService {
  private exercises: Omit<InsertCachedExercise, 'id'>[] = [
    // Rotator Cuff Strengthening
    {
      externalId: 'shoulder_rehab_1',
      name: 'External Rotation with Band',
      category: 'Shoulder Rehabilitation - Rotator Cuff',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Attach band at elbow height. Keep elbow at 90 degrees against side. Rotate arm outward against resistance. Control return to start position.',
      targetMuscles: ['Infraspinatus', 'Teres Minor'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11077.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30-45 seconds'
    },
    {
      externalId: 'shoulder_rehab_2',
      name: 'Internal Rotation with Band',
      category: 'Shoulder Rehabilitation - Rotator Cuff',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Attach band at elbow height. Keep elbow at 90 degrees against side. Rotate arm inward across body against resistance.',
      targetMuscles: ['Subscapularis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11076.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30-45 seconds'
    },
    {
      externalId: 'shoulder_rehab_3',
      name: 'Scaption (Scapular Plane Elevation)',
      category: 'Shoulder Rehabilitation - Rotator Cuff',
      bodyPart: 'Shoulders',
      equipment: 'Dumbbells',
      difficulty: 'beginner',
      instructions: 'Raise arms at 30-degree angle from body (thumbs up). Lift to shoulder height. Lower slowly with control.',
      targetMuscles: ['Supraspinatus', 'Deltoids'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11083.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_4',
      name: 'Prone T-Raises',
      category: 'Shoulder Rehabilitation - Posterior',
      bodyPart: 'Shoulders',
      equipment: 'Dumbbells',
      difficulty: 'intermediate',
      instructions: 'Lie face down. Raise arms out to sides at 90 degrees forming T shape. Squeeze shoulder blades together at top.',
      targetMuscles: ['Posterior Deltoid', 'Middle Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11094.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_5',
      name: 'Prone Y-Raises',
      category: 'Shoulder Rehabilitation - Posterior',
      bodyPart: 'Shoulders',
      equipment: 'Dumbbells',
      difficulty: 'intermediate',
      instructions: 'Lie face down. Raise arms overhead at 45-degree angle forming Y shape. Focus on scapular control.',
      targetMuscles: ['Lower Trapezius', 'Posterior Deltoid'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11095.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Impingement Protocol
    {
      externalId: 'shoulder_rehab_6',
      name: 'Pendulum Swings (Codman)',
      category: 'Shoulder Rehabilitation - Impingement',
      bodyPart: 'Shoulders',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lean forward supporting with other arm. Let affected arm hang. Swing gently in circles and side-to-side.',
      targetMuscles: ['Shoulder Joint Capsule'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11070.jpg',
      sets: 3,
      reps: '10 each direction',
      duration: null,
      restPeriod: 'As needed'
    },
    {
      externalId: 'shoulder_rehab_7',
      name: 'Wall Slides',
      category: 'Shoulder Rehabilitation - Impingement',
      bodyPart: 'Shoulders',
      equipment: 'Wall',
      difficulty: 'beginner',
      instructions: 'Stand facing wall. Place hands on wall. Slide arms up wall keeping elbows straight. Lower with control.',
      targetMuscles: ['Serratus Anterior', 'Deltoids'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11072.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_8',
      name: 'Cross-Body Stretch',
      category: 'Shoulder Rehabilitation - Flexibility',
      bodyPart: 'Shoulders',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Pull affected arm across body with opposite hand. Hold stretch at shoulder level. Feel stretch in posterior shoulder.',
      targetMuscles: ['Posterior Deltoid', 'Posterior Capsule'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11071.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Frozen Shoulder Protocol
    {
      externalId: 'shoulder_rehab_9',
      name: 'Towel Stretch Behind Back',
      category: 'Shoulder Rehabilitation - Frozen Shoulder',
      bodyPart: 'Shoulders',
      equipment: 'Towel',
      difficulty: 'beginner',
      instructions: 'Hold towel behind back with both hands. Use good arm to pull affected arm up back. Feel stretch in front of shoulder.',
      targetMuscles: ['Anterior Shoulder', 'Internal Rotators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11074.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'shoulder_rehab_10',
      name: 'Doorway Stretch',
      category: 'Shoulder Rehabilitation - Frozen Shoulder',
      bodyPart: 'Shoulders',
      equipment: 'Doorway',
      difficulty: 'beginner',
      instructions: 'Place hand on doorframe at shoulder height. Step forward to stretch chest and front of shoulder.',
      targetMuscles: ['Pectoralis Major', 'Anterior Deltoid'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11073.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'shoulder_rehab_11',
      name: 'Sleeper Stretch',
      category: 'Shoulder Rehabilitation - Flexibility',
      bodyPart: 'Shoulders',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie on affected side. Bend elbow to 90 degrees. Use other hand to push arm down toward floor. Feel stretch in back of shoulder.',
      targetMuscles: ['Posterior Capsule', 'External Rotators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11075.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Scapular Stabilization
    {
      externalId: 'shoulder_rehab_12',
      name: 'Scapular Wall Push-Ups',
      category: 'Shoulder Rehabilitation - Scapular',
      bodyPart: 'Shoulders',
      equipment: 'Wall',
      difficulty: 'beginner',
      instructions: 'Stand arms length from wall. Place hands on wall. Push shoulder blades forward and back without bending elbows.',
      targetMuscles: ['Serratus Anterior'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11080.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_13',
      name: 'Scapular Retraction',
      category: 'Shoulder Rehabilitation - Scapular',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Hold band with arms straight. Pull shoulder blades together without bending elbows. Hold and release.',
      targetMuscles: ['Rhomboids', 'Middle Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11081.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_14',
      name: 'Prone I-Raises',
      category: 'Shoulder Rehabilitation - Scapular',
      bodyPart: 'Shoulders',
      equipment: 'Dumbbells',
      difficulty: 'intermediate',
      instructions: 'Lie face down. Raise arms straight overhead forming I shape. Keep thumbs up. Focus on lower trap activation.',
      targetMuscles: ['Lower Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11096.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Advanced Strengthening
    {
      externalId: 'shoulder_rehab_15',
      name: 'Face Pulls',
      category: 'Shoulder Rehabilitation - Posterior',
      bodyPart: 'Shoulders',
      equipment: 'Cable or Band',
      difficulty: 'intermediate',
      instructions: 'Pull band to face level with elbows high. Separate hands at face. Focus on rear deltoids and external rotation.',
      targetMuscles: ['Posterior Deltoid', 'External Rotators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11082.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_16',
      name: 'Band Pull-Aparts',
      category: 'Shoulder Rehabilitation - Posterior',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Hold band at shoulder height with straight arms. Pull band apart by squeezing shoulder blades.',
      targetMuscles: ['Posterior Deltoid', 'Rhomboids'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11084.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_17',
      name: 'Wall Angels',
      category: 'Shoulder Rehabilitation - Mobility',
      bodyPart: 'Shoulders',
      equipment: 'Wall',
      difficulty: 'intermediate',
      instructions: 'Stand with back against wall. Arms in goal post position. Slide arms up and down maintaining wall contact.',
      targetMuscles: ['Rotator Cuff', 'Scapular Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11085.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_18',
      name: 'Shoulder Flexion with Band',
      category: 'Shoulder Rehabilitation - Strengthening',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Stand on band. Raise arm forward to shoulder height. Keep elbow straight. Lower with control.',
      targetMuscles: ['Anterior Deltoid', 'Supraspinatus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11086.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_19',
      name: 'Shoulder Abduction with Band',
      category: 'Shoulder Rehabilitation - Strengthening',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'beginner',
      instructions: 'Stand on band. Raise arm out to side to shoulder height. Keep thumb up. Lower slowly.',
      targetMuscles: ['Middle Deltoid', 'Supraspinatus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11087.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_20',
      name: 'Bear Crawl Hold',
      category: 'Shoulder Rehabilitation - Stability',
      bodyPart: 'Shoulders',
      equipment: 'None',
      difficulty: 'advanced',
      instructions: 'Start on hands and knees. Lift knees slightly off ground. Hold position maintaining neutral spine.',
      targetMuscles: ['Serratus Anterior', 'Core', 'Deltoids'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11088.jpg',
      sets: 3,
      reps: 'Hold 30-45 seconds',
      duration: '30-45 seconds',
      restPeriod: '60 seconds'
    },
    
    // Labral and Instability
    {
      externalId: 'shoulder_rehab_21',
      name: 'Rhythmic Stabilization',
      category: 'Shoulder Rehabilitation - Instability',
      bodyPart: 'Shoulders',
      equipment: 'Partner or Wall',
      difficulty: 'intermediate',
      instructions: 'Hold arm at 90 degrees. Partner applies light perturbations. Resist movement in all directions.',
      targetMuscles: ['Rotator Cuff', 'Proprioceptors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11089.jpg',
      sets: 3,
      reps: '30-60 seconds',
      duration: '30-60 seconds',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_22',
      name: 'Closed Chain Wall Push-Ups',
      category: 'Shoulder Rehabilitation - Instability',
      bodyPart: 'Shoulders',
      equipment: 'Wall',
      difficulty: 'beginner',
      instructions: 'Perform push-ups against wall. Focus on controlled movement and scapular positioning.',
      targetMuscles: ['Pectoralis', 'Serratus Anterior', 'Deltoids'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11090.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'shoulder_rehab_23',
      name: 'Ball Stabilization on Wall',
      category: 'Shoulder Rehabilitation - Instability',
      bodyPart: 'Shoulders',
      equipment: 'Small Ball',
      difficulty: 'intermediate',
      instructions: 'Press ball against wall with hand. Make small circles maintaining pressure. Progress to alphabet patterns.',
      targetMuscles: ['Rotator Cuff', 'Scapular Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11091.jpg',
      sets: 3,
      reps: '30 seconds each direction',
      duration: '30 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_24',
      name: 'Supine Shoulder Flexion',
      category: 'Shoulder Rehabilitation - Range of Motion',
      bodyPart: 'Shoulders',
      equipment: 'Stick or Band',
      difficulty: 'beginner',
      instructions: 'Lie on back. Use good arm to help lift affected arm overhead. Keep elbow straight.',
      targetMuscles: ['Shoulder Flexors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11092.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'shoulder_rehab_25',
      name: 'Standing Row with Band',
      category: 'Shoulder Rehabilitation - Strengthening',
      bodyPart: 'Shoulders',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Pull band to chest keeping elbows close to body. Squeeze shoulder blades together at end of movement.',
      targetMuscles: ['Rhomboids', 'Middle Trapezius', 'Posterior Deltoid'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/11093.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    }
  ];

  async syncToDatabase(): Promise<void> {
    console.log('Syncing shoulder rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        // Check if exercise already exists
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added shoulder exercise: ${exercise.name}`);
        } else {
          console.log(`Shoulder exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding shoulder exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Shoulder rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }

  getExercisesByCategory(category: string): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises.filter(ex => ex.category === category);
  }

  getExercisesByDifficulty(difficulty: string): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises.filter(ex => ex.difficulty === difficulty);
  }
}