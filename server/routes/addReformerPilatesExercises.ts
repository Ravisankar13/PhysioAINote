import { storage } from "../storage";
import { getReformerPilatesExercises } from "../reformerPilatesExercises";
import { db } from "../db";
import { exercises } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Adds Reformer Pilates exercises to the database
 */
export async function addReformerPilatesExercises(): Promise<void> {
  console.log("Adding Reformer Pilates exercises to the database...");
  
  const exercises = getReformerPilatesExercises();
  
  for (const exercise of exercises) {
    try {
      // Check if exercise already exists by title to avoid duplicates
      // Search directly in the database instead of using the missing method
      const existingExercises = await db.select()
        .from(exercises)
        .where(sql`LOWER(title) LIKE ${`%${exercise.title.toLowerCase()}%`}`)
      
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