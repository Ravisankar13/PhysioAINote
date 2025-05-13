/**
 * Script to add a batch of test exercises for each body part
 * This will help test the pagination feature for exercises
 */

import { storage } from '../storage';
import { InsertExercise, bodyPartEnum, difficultyEnum } from '@shared/schema';

async function seedTestExercises() {
  console.log("Starting to seed test exercises for pagination...");
  
  // List of body parts
  const bodyParts = bodyPartEnum.enumValues;
  
  // Difficulty levels
  const difficulties = difficultyEnum.enumValues;
  
  // Generate exercises for each body part
  for (const bodyPart of bodyParts) {
    console.log(`Creating test exercises for ${bodyPart}...`);
    
    // Create 25 exercises per body part (enough to show pagination)
    for (let i = 1; i <= 25; i++) {
      const difficulty = difficulties[i % difficulties.length];
      
      const exercise: InsertExercise = {
        title: `${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)} Exercise ${i}`,
        description: `Test exercise ${i} for ${bodyPart} with ${difficulty} difficulty.`,
        bodyPart: bodyPart as any, // Type assertion to bypass TypeScript constraint
        targetMuscles: `Primary ${bodyPart} muscles`,
        difficulty: difficulty as any, // Type assertion to bypass TypeScript constraint
        instructions: `Instructions for ${bodyPart} exercise ${i}. Follow proper form.`,
        precautions: `Be careful of proper alignment during this ${difficulty} exercise.`,
        repetitions: `${8 + (i % 8)}`,
        sets: `${3 + (i % 2)}`,
        duration: i % 2 === 0 ? `${i * 5} seconds` : null,
        imageUrl: null,
        videoUrl: null,
        aiGenerated: false
      };
      
      try {
        await storage.createExercise(exercise);
        // Add a small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error creating test exercise for ${bodyPart}:`, error);
      }
    }
  }
  
  console.log("Completed seeding test exercises for pagination!");
}

async function main() {
  try {
    await seedTestExercises();
    console.log("✅ All test exercises have been added to the database!");
  } catch (error) {
    console.error("❌ Error seeding test exercises:", error);
  } finally {
    process.exit(0);
  }
}

main();