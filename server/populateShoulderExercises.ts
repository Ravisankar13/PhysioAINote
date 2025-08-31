import { db } from './db';
import { cachedExercises as exercisesTable } from '@shared/schema';
import { shoulderRehabExerciseService } from './shoulderRehabExerciseService';
import { eq } from 'drizzle-orm';

async function populateShoulderRehabExercises() {
  try {
    console.log('Starting to populate shoulder rehabilitation exercises...');
    
    // Get all shoulder rehab exercises
    const shoulderExercises = await shoulderRehabExerciseService.getAllExercises();
    console.log(`Found ${shoulderExercises.length} shoulder rehabilitation exercises to add`);
    
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const exercise of shoulderExercises) {
      try {
        // Check if exercise already exists
        const existing = await db
          .select()
          .from(exercisesTable)
          .where(eq(exercisesTable.name, exercise.name))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`Skipping existing exercise: ${exercise.name}`);
          skippedCount++;
          continue;
        }
        
        // Insert the exercise
        await db.insert(exercisesTable).values({
          externalId: exercise.externalId,
          apiSource: exercise.apiSource,
          name: exercise.name,
          bodyPart: exercise.bodyPart,
          equipment: exercise.equipment,
          gifUrl: exercise.gifUrl,
          target: exercise.target,
          secondaryMuscles: exercise.secondaryMuscles,
          instructions: exercise.instructions,
          difficulty: exercise.difficulty as 'beginner' | 'intermediate' | 'advanced',
          category: exercise.category
        });
        
        console.log(`Added exercise: ${exercise.name}`);
        addedCount++;
        
      } catch (error) {
        console.error(`Error adding exercise ${exercise.name}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n=== Shoulder Rehab Exercise Population Complete ===');
    console.log(`Total exercises processed: ${shoulderExercises.length}`);
    console.log(`Successfully added: ${addedCount}`);
    console.log(`Skipped (already exist): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Get total count
    const totalExercises = await db.select().from(exercisesTable);
    console.log(`\nTotal exercises in database: ${totalExercises.length}`);
    
  } catch (error) {
    console.error('Fatal error populating shoulder exercises:', error);
    process.exit(1);
  }
}

// Run the population
populateShoulderRehabExercises()
  .then(() => {
    console.log('Shoulder exercise population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to populate shoulder exercises:', error);
    process.exit(1);
  });