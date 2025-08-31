import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { transformExercise } from './transformExercises';

export class AnkleRehabExerciseService {
  private rawExercises = [
    // Range of Motion
    {
      externalId: 'ankle_rehab_1',
      name: 'Ankle Pumps',
      category: 'Ankle Rehabilitation - Range of Motion',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Sit or lie down. Point toes down (plantarflexion), then pull toes up (dorsiflexion). Repeat smoothly.',
      targetMuscles: ['Gastrocnemius', 'Tibialis Anterior'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17001.jpg',
      sets: 3,
      reps: '20-30',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'ankle_rehab_2',
      name: 'Ankle Circles',
      category: 'Ankle Rehabilitation - Range of Motion',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Sit with leg elevated. Make circles with ankle. 10 clockwise, 10 counter-clockwise.',
      targetMuscles: ['Ankle Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17002.jpg',
      sets: 3,
      reps: '10 each direction',
      duration: null,
      restPeriod: '15 seconds'
    },
    {
      externalId: 'ankle_rehab_3',
      name: 'Ankle Alphabet',
      category: 'Ankle Rehabilitation - Range of Motion',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Sit with leg elevated. Use big toe to draw letters A-Z in the air.',
      targetMuscles: ['Ankle Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17003.jpg',
      sets: 2,
      reps: 'A-Z',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Stretching
    {
      externalId: 'ankle_rehab_4',
      name: 'Calf Stretch - Gastrocnemius',
      category: 'Ankle Rehabilitation - Flexibility',
      bodyPart: 'Ankles',
      equipment: 'Wall',
      difficulty: 'beginner',
      instructions: 'Face wall, hands on wall. Step affected leg back, heel down. Lean forward to stretch calf.',
      targetMuscles: ['Gastrocnemius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17004.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'ankle_rehab_5',
      name: 'Calf Stretch - Soleus',
      category: 'Ankle Rehabilitation - Flexibility',
      bodyPart: 'Ankles',
      equipment: 'Wall',
      difficulty: 'beginner',
      instructions: 'Face wall, affected leg back with knee bent. Keep heel down. Lean forward to stretch deep calf.',
      targetMuscles: ['Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17005.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'ankle_rehab_6',
      name: 'Towel Stretch',
      category: 'Ankle Rehabilitation - Flexibility',
      bodyPart: 'Ankles',
      equipment: 'Towel',
      difficulty: 'beginner',
      instructions: 'Sit with leg straight. Loop towel around ball of foot. Pull towel to stretch calf.',
      targetMuscles: ['Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17006.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Strengthening
    {
      externalId: 'ankle_rehab_7',
      name: 'Heel Raises',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Stand holding support. Rise up on toes. Hold briefly. Lower slowly.',
      targetMuscles: ['Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17007.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_8',
      name: 'Single Leg Heel Raises',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Stand on one leg holding support. Rise up on toes. Lower slowly with control.',
      targetMuscles: ['Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17008.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_9',
      name: 'Toe Raises',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Stand with heels on ground. Lift toes and forefoot up. Hold briefly. Lower.',
      targetMuscles: ['Tibialis Anterior'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17009.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Resistance Band Exercises
    {
      externalId: 'ankle_rehab_10',
      name: 'Dorsiflexion with Band',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Sit with leg straight. Loop band around foot. Pull toes toward you against resistance.',
      targetMuscles: ['Tibialis Anterior'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17010.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_11',
      name: 'Plantarflexion with Band',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Sit with leg straight. Hold band, loop around foot. Point toes down against resistance.',
      targetMuscles: ['Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17011.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_12',
      name: 'Inversion with Band',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Band anchored to side. Turn foot inward against resistance.',
      targetMuscles: ['Tibialis Posterior'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17012.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_13',
      name: 'Eversion with Band',
      category: 'Ankle Rehabilitation - Strengthening',
      bodyPart: 'Ankles',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Band anchored to inside. Turn foot outward against resistance.',
      targetMuscles: ['Peroneus Longus', 'Peroneus Brevis'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17013.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Balance and Proprioception
    {
      externalId: 'ankle_rehab_14',
      name: 'Single Leg Balance',
      category: 'Ankle Rehabilitation - Balance',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Stand on one leg. Hold position. Progress to eyes closed.',
      targetMuscles: ['Ankle Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17014.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'ankle_rehab_15',
      name: 'Balance Board',
      category: 'Ankle Rehabilitation - Balance',
      bodyPart: 'Ankles',
      equipment: 'Balance Board',
      difficulty: 'intermediate',
      instructions: 'Stand on balance board. Maintain balance. Progress to single leg.',
      targetMuscles: ['Ankle Stabilizers', 'Proprioceptors'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17015.jpg',
      sets: 3,
      reps: 'Hold 30-60 seconds',
      duration: '30-60 seconds',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_16',
      name: 'Star Excursion',
      category: 'Ankle Rehabilitation - Balance',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'advanced',
      instructions: 'Stand on one leg. Reach other leg in 8 directions like star points. Return to center.',
      targetMuscles: ['Ankle Stabilizers', 'Hip Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17016.jpg',
      sets: 2,
      reps: '8 directions',
      duration: null,
      restPeriod: '60 seconds'
    },
    
    // Plyometric
    {
      externalId: 'ankle_rehab_17',
      name: 'Ankle Hops',
      category: 'Ankle Rehabilitation - Plyometric',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'advanced',
      instructions: 'Small hops on both feet using only ankles. Keep knees relatively straight.',
      targetMuscles: ['Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17017.jpg',
      sets: 3,
      reps: '20-30',
      duration: null,
      restPeriod: '60 seconds'
    },
    {
      externalId: 'ankle_rehab_18',
      name: 'Single Leg Hops',
      category: 'Ankle Rehabilitation - Plyometric',
      bodyPart: 'Ankles',
      equipment: 'None',
      difficulty: 'advanced',
      instructions: 'Hop on one leg. Focus on soft landing and control.',
      targetMuscles: ['Ankle Stabilizers', 'Calf Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17018.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '60 seconds'
    },
    
    // Functional
    {
      externalId: 'ankle_rehab_19',
      name: 'Step Ups',
      category: 'Ankle Rehabilitation - Functional',
      bodyPart: 'Ankles',
      equipment: 'Step or Box',
      difficulty: 'intermediate',
      instructions: 'Step up onto box with affected leg. Control descent. Focus on ankle stability.',
      targetMuscles: ['Ankle Stabilizers', 'Quadriceps', 'Glutes'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17019.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'ankle_rehab_20',
      name: 'Eccentric Heel Drops',
      category: 'Ankle Rehabilitation - Achilles',
      bodyPart: 'Ankles',
      equipment: 'Step',
      difficulty: 'intermediate',
      instructions: 'Rise on both toes on step edge. Shift to affected leg. Lower slowly below step level.',
      targetMuscles: ['Achilles Tendon', 'Gastrocnemius', 'Soleus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/17020.jpg',
      sets: 3,
      reps: '15',
      duration: null,
      restPeriod: '60 seconds'
    }
  ];

  // Transform raw exercises to match database schema
  private exercises: Omit<InsertCachedExercise, 'id'>[] = this.rawExercises.map(exercise => 
    transformExercise(exercise)
  );

  async syncToDatabase(): Promise<void> {
    console.log('Syncing ankle rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added ankle exercise: ${exercise.name}`);
        } else {
          console.log(`Ankle exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding ankle exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Ankle rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}