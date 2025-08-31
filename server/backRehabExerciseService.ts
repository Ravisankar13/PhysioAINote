import { cachedExercises, type InsertCachedExercise } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { transformExercise } from './transformExercises';

export class BackRehabExerciseService {
  private rawExercises = [
    // Lower Back - Basic
    {
      externalId: 'back_rehab_1',
      name: 'Knee to Chest',
      category: 'Back Rehabilitation - Lower Back Flexibility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back. Pull one knee to chest with both hands. Hold 30 seconds. Switch legs.',
      targetMuscles: ['Lower Back', 'Glutes'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18001.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'back_rehab_2',
      name: 'Double Knee to Chest',
      category: 'Back Rehabilitation - Lower Back Flexibility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back. Pull both knees to chest. Hold 30 seconds. Rock gently side to side.',
      targetMuscles: ['Lower Back', 'Glutes'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18002.jpg',
      sets: 3,
      reps: 'Hold 30 seconds',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'back_rehab_3',
      name: 'Lower Trunk Rotation',
      category: 'Back Rehabilitation - Lower Back Mobility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Keep shoulders down. Rotate knees side to side slowly.',
      targetMuscles: ['Lower Back', 'Obliques'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18003.jpg',
      sets: 3,
      reps: '10 each side',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_4',
      name: 'Pelvic Tilt',
      category: 'Back Rehabilitation - Core Activation',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Flatten lower back against floor. Hold 5 seconds. Release.',
      targetMuscles: ['Deep Core', 'Lower Back'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18004.jpg',
      sets: 3,
      reps: '15-20',
      duration: '5 seconds hold',
      restPeriod: '30 seconds'
    },
    
    // McKenzie Exercises
    {
      externalId: 'back_rehab_5',
      name: 'Prone Press-Up (Cobra)',
      category: 'Back Rehabilitation - McKenzie Extension',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie face down. Push up with arms, keeping hips on floor. Hold briefly. Lower slowly.',
      targetMuscles: ['Erector Spinae', 'Lower Back'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18005.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_6',
      name: 'Standing Extension',
      category: 'Back Rehabilitation - McKenzie Extension',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Stand with hands on lower back. Lean backward gently. Return to neutral.',
      targetMuscles: ['Erector Spinae'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18006.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_7',
      name: 'Prone on Elbows',
      category: 'Back Rehabilitation - McKenzie Extension',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie face down. Prop on elbows. Hold position 2-3 minutes. Breathe normally.',
      targetMuscles: ['Lower Back'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18007.jpg',
      sets: 1,
      reps: 'Hold 2-3 minutes',
      duration: '2-3 minutes',
      restPeriod: 'As needed'
    },
    
    // Strengthening
    {
      externalId: 'back_rehab_8',
      name: 'Bird Dog',
      category: 'Back Rehabilitation - Strengthening',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'On hands and knees. Extend opposite arm and leg. Hold 5 seconds. Switch sides.',
      targetMuscles: ['Multifidus', 'Erector Spinae', 'Core'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18008.jpg',
      sets: 3,
      reps: '10 each side',
      duration: '5 seconds hold',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_9',
      name: 'Superman',
      category: 'Back Rehabilitation - Strengthening',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie face down. Lift chest and legs off floor simultaneously. Hold briefly. Lower.',
      targetMuscles: ['Erector Spinae', 'Glutes'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18009.jpg',
      sets: 3,
      reps: '10-12',
      duration: '3 seconds hold',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_10',
      name: 'Prone Back Extension',
      category: 'Back Rehabilitation - Strengthening',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie face down, hands at sides. Lift chest off floor. Hold briefly. Lower slowly.',
      targetMuscles: ['Erector Spinae'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18010.jpg',
      sets: 3,
      reps: '12-15',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Stretching
    {
      externalId: 'back_rehab_11',
      name: 'Child\'s Pose',
      category: 'Back Rehabilitation - Stretching',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Kneel and sit back on heels. Reach arms forward on floor. Hold and breathe.',
      targetMuscles: ['Lower Back', 'Lats'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18011.jpg',
      sets: 3,
      reps: 'Hold 30-60 seconds',
      duration: '30-60 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'back_rehab_12',
      name: 'Cat-Camel',
      category: 'Back Rehabilitation - Mobility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'On hands and knees. Arch back up (cat), then sag down (camel). Move slowly.',
      targetMuscles: ['Spinal Muscles'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18012.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_13',
      name: 'Hamstring Stretch',
      category: 'Back Rehabilitation - Stretching',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back. Loop towel around foot. Pull leg up keeping knee straight. Hold.',
      targetMuscles: ['Hamstrings'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18013.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    {
      externalId: 'back_rehab_14',
      name: 'Piriformis Stretch',
      category: 'Back Rehabilitation - Stretching',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie on back. Cross ankle over opposite knee. Pull thigh toward chest.',
      targetMuscles: ['Piriformis', 'Hip Rotators'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18014.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    },
    
    // Stabilization
    {
      externalId: 'back_rehab_15',
      name: 'Dead Bug',
      category: 'Back Rehabilitation - Stabilization',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie on back, arms up, knees at 90°. Lower opposite arm and leg. Return. Alternate.',
      targetMuscles: ['Deep Core', 'Multifidus'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18015.jpg',
      sets: 3,
      reps: '10 each side',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_16',
      name: 'Side Plank',
      category: 'Back Rehabilitation - Stabilization',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Lie on side, prop on elbow. Lift hips off ground. Keep body straight. Hold.',
      targetMuscles: ['Quadratus Lumborum', 'Obliques'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18016.jpg',
      sets: 3,
      reps: 'Hold 20-30 seconds each',
      duration: '20-30 seconds',
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_17',
      name: 'Wall Sits',
      category: 'Back Rehabilitation - Functional',
      bodyPart: 'Back',
      equipment: 'Wall',
      difficulty: 'intermediate',
      instructions: 'Back against wall. Slide down to squat position. Hold. Keep back flat on wall.',
      targetMuscles: ['Quadriceps', 'Core', 'Back Stabilizers'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18017.jpg',
      sets: 3,
      reps: 'Hold 30-60 seconds',
      duration: '30-60 seconds',
      restPeriod: '60 seconds'
    },
    
    // Upper Back
    {
      externalId: 'back_rehab_18',
      name: 'Thoracic Extension',
      category: 'Back Rehabilitation - Upper Back',
      bodyPart: 'Back',
      equipment: 'Foam Roller',
      difficulty: 'intermediate',
      instructions: 'Lie on roller at mid-back. Support head with hands. Extend back over roller.',
      targetMuscles: ['Thoracic Spine'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18018.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_19',
      name: 'Scapular Retraction',
      category: 'Back Rehabilitation - Upper Back',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Squeeze shoulder blades together. Hold 5 seconds. Relax. Keep shoulders down.',
      targetMuscles: ['Rhomboids', 'Middle Trapezius'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18019.jpg',
      sets: 3,
      reps: '15-20',
      duration: '5 seconds hold',
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_20',
      name: 'Rows with Band',
      category: 'Back Rehabilitation - Upper Back Strengthening',
      bodyPart: 'Back',
      equipment: 'Resistance Band',
      difficulty: 'intermediate',
      instructions: 'Hold band with arms extended. Pull to chest squeezing shoulder blades. Return slowly.',
      targetMuscles: ['Rhomboids', 'Middle Trapezius', 'Lats'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18020.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    
    // Neural Mobilization
    {
      externalId: 'back_rehab_21',
      name: 'Sciatic Nerve Floss',
      category: 'Back Rehabilitation - Neural Mobility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Sit tall. Straighten knee while flexing ankle and neck. Then bend knee while extending ankle and neck.',
      targetMuscles: ['Sciatic Nerve'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18021.jpg',
      sets: 3,
      reps: '10-15',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_22',
      name: 'Slump Stretch',
      category: 'Back Rehabilitation - Neural Mobility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'intermediate',
      instructions: 'Sit slumped with chin to chest. Straighten one knee and pull toes up. Hold briefly.',
      targetMuscles: ['Neural Structures', 'Hamstrings'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18022.jpg',
      sets: 3,
      reps: '10 each side',
      duration: null,
      restPeriod: '30 seconds'
    },
    
    // Functional Exercises
    {
      externalId: 'back_rehab_23',
      name: 'Bridges',
      category: 'Back Rehabilitation - Functional',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Lift hips up squeezing glutes. Hold briefly. Lower slowly.',
      targetMuscles: ['Glutes', 'Lower Back', 'Core'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18023.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '45 seconds'
    },
    {
      externalId: 'back_rehab_24',
      name: 'Partial Crunches',
      category: 'Back Rehabilitation - Core',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Lie on back, knees bent. Cross arms on chest. Lift shoulders slightly off floor.',
      targetMuscles: ['Rectus Abdominis', 'Core'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18024.jpg',
      sets: 3,
      reps: '15-20',
      duration: null,
      restPeriod: '30 seconds'
    },
    {
      externalId: 'back_rehab_25',
      name: 'Hip Flexor Stretch',
      category: 'Back Rehabilitation - Hip Flexibility',
      bodyPart: 'Back',
      equipment: 'None',
      difficulty: 'beginner',
      instructions: 'Kneel on one knee. Push hips forward keeping back straight. Feel stretch in front of hip.',
      targetMuscles: ['Hip Flexors', 'Psoas'],
      videoUrl: '',
      imageUrl: 'https://www.hep2go.com/ex_images/18025.jpg',
      sets: 3,
      reps: 'Hold 30 seconds each',
      duration: '30 seconds',
      restPeriod: '15 seconds'
    }
  ];

  // Transform raw exercises to match database schema
  private exercises: Omit<InsertCachedExercise, 'id'>[] = this.rawExercises.map(exercise => 
    transformExercise(exercise)
  );

  async syncToDatabase(): Promise<void> {
    console.log('Syncing back rehabilitation exercises to database...');
    
    for (const exercise of this.exercises) {
      try {
        const existing = await db.select()
          .from(cachedExercises)
          .where(eq(cachedExercises.externalId, exercise.externalId))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(cachedExercises).values(exercise);
          console.log(`Added back exercise: ${exercise.name}`);
        } else {
          console.log(`Back exercise already exists: ${exercise.name}`);
        }
      } catch (error) {
        console.error(`Error adding back exercise ${exercise.name}:`, error);
      }
    }
    
    console.log('Back rehabilitation exercises sync complete!');
  }

  getExercises(): Omit<InsertCachedExercise, 'id'>[] {
    return this.exercises;
  }
}