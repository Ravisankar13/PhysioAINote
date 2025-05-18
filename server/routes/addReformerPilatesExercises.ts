import { storage } from "../storage";
import { getReformerPilatesExercises } from "../reformerPilatesExercises";

/**
 * Adds Reformer Pilates exercises to the database
 */
export async function addReformerPilatesExercises(): Promise<void> {
  console.log("Adding Reformer Pilates exercises to the database...");
  
  const exercises = getReformerPilatesExercises();
  
  for (const exercise of exercises) {
    try {
      // Check if exercise already exists by title to avoid duplicates
      const existingExercises = await storage.getExercisesBySearchTerm(exercise.title);
      
      if (existingExercises.some(e => e.title === exercise.title)) {
        console.log(`Exercise "${exercise.title}" already exists, skipping...`);
        continue;
      }
      
      await storage.createExercise(exercise);
      console.log(`Added Reformer Pilates exercise: ${exercise.title}`);
    } catch (error) {
      console.error(`Error adding exercise "${exercise.title}":`, error);
    }
  }
  
  console.log("Finished adding Reformer Pilates exercises");
}