import axios from 'axios';

// ExerciseDB API types
export interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

// Cached exercise type for our database
export interface CachedExercise {
  externalId: string;
  apiSource: 'exercisedb';
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
}

class ExerciseDBService {
  private baseUrl = 'https://exercisedb.p.rapidapi.com';
  private headers = {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
  };

  // Cache to avoid repeated API calls
  private cache = new Map<string, any>();
  private cacheTimeout = 3600000; // 1 hour

  // Get all exercises (limited for free tier)
  async getAllExercises(limit: number = 50): Promise<ExerciseDBExercise[]> {
    const cacheKey = `all_exercises_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises`, {
        headers: this.headers,
        params: { limit }
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching exercises from ExerciseDB:', error);
      // Return empty array if API fails
      return [];
    }
  }

  // Get exercises by body part
  async getExercisesByBodyPart(bodyPart: string): Promise<ExerciseDBExercise[]> {
    const cacheKey = `bodypart_${bodyPart}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/bodyPart/${bodyPart}`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for body part ${bodyPart}:`, error);
      return [];
    }
  }

  // Get exercises by equipment
  async getExercisesByEquipment(equipment: string): Promise<ExerciseDBExercise[]> {
    const cacheKey = `equipment_${equipment}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/equipment/${equipment}`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for equipment ${equipment}:`, error);
      return [];
    }
  }

  // Get exercises by target muscle
  async getExercisesByTarget(target: string): Promise<ExerciseDBExercise[]> {
    const cacheKey = `target_${target}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/target/${target}`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercises for target ${target}:`, error);
      return [];
    }
  }

  // Get single exercise by ID
  async getExerciseById(exerciseId: string): Promise<ExerciseDBExercise | null> {
    const cacheKey = `exercise_${exerciseId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/exercise/${exerciseId}`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercise ${exerciseId}:`, error);
      return null;
    }
  }

  // Search exercises by name
  async searchExercisesByName(query: string): Promise<ExerciseDBExercise[]> {
    const cacheKey = `search_${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/name/${query}`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error searching exercises for "${query}":`, error);
      return [];
    }
  }

  // Get list of body parts
  async getBodyPartList(): Promise<string[]> {
    const cacheKey = 'bodyparts_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/bodyPartList`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching body parts list:', error);
      return ['back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs', 'waist'];
    }
  }

  // Get list of equipment
  async getEquipmentList(): Promise<string[]> {
    const cacheKey = 'equipment_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/equipmentList`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching equipment list:', error);
      return ['barbell', 'body weight', 'cable', 'dumbbell', 'resistance band', 'stability ball'];
    }
  }

  // Get list of target muscles
  async getTargetList(): Promise<string[]> {
    const cacheKey = 'target_list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/exercises/targetList`, {
        headers: this.headers
      });
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching target muscles list:', error);
      return ['abs', 'adductors', 'biceps', 'calves', 'cardiovascular system', 'delts', 'forearms', 'glutes', 'hamstrings', 'lats', 'pectorals', 'quads', 'spine', 'traps', 'triceps'];
    }
  }

  // Convert ExerciseDB format to our cached format
  convertToCachedExercise(exercise: ExerciseDBExercise): CachedExercise {
    // Determine difficulty based on equipment and exercise type
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
    if (exercise.equipment === 'body weight') {
      difficulty = 'beginner';
    } else if (exercise.equipment === 'barbell' || exercise.equipment === 'cable') {
      difficulty = 'advanced';
    }

    // Map body parts to categories
    const categoryMap: Record<string, string> = {
      'back': 'Back',
      'chest': 'Chest',
      'shoulders': 'Shoulder',
      'upper arms': 'Arms',
      'lower arms': 'Arms',
      'upper legs': 'Legs',
      'lower legs': 'Legs',
      'waist': 'Core',
      'neck': 'Neck',
      'cardio': 'Cardio'
    };

    return {
      externalId: exercise.id,
      apiSource: 'exercisedb',
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl,
      target: exercise.target,
      secondaryMuscles: exercise.secondaryMuscles,
      instructions: exercise.instructions,
      difficulty,
      category: categoryMap[exercise.bodyPart] || 'General'
    };
  }

  // Batch fetch exercises for initial database population
  async fetchExercisesForInitialLoad(): Promise<CachedExercise[]> {
    const exercises: ExerciseDBExercise[] = [];
    
    // Fetch exercises for main body parts
    const bodyParts = ['back', 'chest', 'shoulders', 'upper legs', 'lower legs', 'waist'];
    
    for (const bodyPart of bodyParts) {
      const bodyPartExercises = await this.getExercisesByBodyPart(bodyPart);
      exercises.push(...bodyPartExercises.slice(0, 20)); // Limit to 20 per body part for free tier
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Convert to cached format
    return exercises.map(ex => this.convertToCachedExercise(ex));
  }

  // Cache management
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const exerciseDBService = new ExerciseDBService();

// Free alternative data if API is not available
export const fallbackExercises: CachedExercise[] = [
  // Shoulder exercises
  {
    externalId: 'fallback_1',
    apiSource: 'exercisedb',
    name: 'Shoulder Press',
    bodyPart: 'shoulders',
    equipment: 'dumbbell',
    gifUrl: '',
    target: 'delts',
    secondaryMuscles: ['triceps', 'upper chest'],
    instructions: [
      'Sit on a bench with back support',
      'Hold dumbbells at shoulder height',
      'Press weights overhead until arms are extended',
      'Lower back to starting position'
    ],
    difficulty: 'intermediate',
    category: 'Shoulder'
  },
  {
    externalId: 'fallback_2',
    apiSource: 'exercisedb',
    name: 'Lateral Raises',
    bodyPart: 'shoulders',
    equipment: 'dumbbell',
    gifUrl: '',
    target: 'delts',
    secondaryMuscles: ['traps'],
    instructions: [
      'Stand with dumbbells at sides',
      'Raise arms out to sides until parallel with floor',
      'Pause briefly at top',
      'Lower back to starting position'
    ],
    difficulty: 'beginner',
    category: 'Shoulder'
  },
  // Back exercises
  {
    externalId: 'fallback_3',
    apiSource: 'exercisedb',
    name: 'Bent Over Row',
    bodyPart: 'back',
    equipment: 'barbell',
    gifUrl: '',
    target: 'lats',
    secondaryMuscles: ['biceps', 'middle back'],
    instructions: [
      'Bend at hips with knees slightly bent',
      'Grasp barbell with overhand grip',
      'Pull bar to lower chest',
      'Lower back to starting position'
    ],
    difficulty: 'intermediate',
    category: 'Back'
  },
  // Leg exercises
  {
    externalId: 'fallback_4',
    apiSource: 'exercisedb',
    name: 'Squat',
    bodyPart: 'upper legs',
    equipment: 'body weight',
    gifUrl: '',
    target: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower body by bending knees and hips',
      'Descend until thighs are parallel to floor',
      'Push through heels to return to standing'
    ],
    difficulty: 'beginner',
    category: 'Legs'
  },
  // Core exercises
  {
    externalId: 'fallback_5',
    apiSource: 'exercisedb',
    name: 'Plank',
    bodyPart: 'waist',
    equipment: 'body weight',
    gifUrl: '',
    target: 'abs',
    secondaryMuscles: ['shoulders', 'back'],
    instructions: [
      'Start in push-up position on forearms',
      'Keep body in straight line from head to heels',
      'Engage core and hold position',
      'Maintain neutral spine throughout'
    ],
    difficulty: 'beginner',
    category: 'Core'
  }
];