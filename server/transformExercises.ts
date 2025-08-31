import { type InsertCachedExercise } from '@shared/schema';

// Transform exercise data to match the cachedExercises schema
export function transformExercise(exercise: any): Omit<InsertCachedExercise, 'id'> {
  // Extract primary target muscle from targetMuscles array or use default
  let primaryTarget = 'core';
  let secondaryMuscles: string[] = [];
  
  if (exercise.targetMuscles && Array.isArray(exercise.targetMuscles)) {
    if (exercise.targetMuscles.length > 0) {
      primaryTarget = exercise.targetMuscles[0].toLowerCase();
      secondaryMuscles = exercise.targetMuscles.slice(1).map((m: string) => m.toLowerCase());
    }
  } else if (exercise.target) {
    primaryTarget = exercise.target.toLowerCase();
  }

  // Convert instructions to array if it's a string
  let instructionsArray: string[] = [];
  if (typeof exercise.instructions === 'string') {
    instructionsArray = exercise.instructions.split('. ').filter((i: string) => i.length > 0);
  } else if (Array.isArray(exercise.instructions)) {
    instructionsArray = exercise.instructions;
  }

  // Build the transformed exercise
  const transformed: Omit<InsertCachedExercise, 'id'> = {
    externalId: exercise.externalId,
    apiSource: exercise.apiSource || 'physiotherapy',
    name: exercise.name,
    bodyPart: exercise.bodyPart.toLowerCase(),
    equipment: exercise.equipment?.toLowerCase() || 'body weight',
    target: primaryTarget,
    secondaryMuscles: secondaryMuscles,
    instructions: instructionsArray,
    difficulty: exercise.difficulty,
    category: exercise.category,
    isActive: true
  };

  // Add optional gifUrl if imageUrl exists (using imageUrl as gifUrl)
  if (exercise.imageUrl) {
    transformed.gifUrl = exercise.imageUrl;
  } else if (exercise.gifUrl) {
    transformed.gifUrl = exercise.gifUrl;
  }

  return transformed;
}