import { db } from '../db';
import { cachedExercises } from '@shared/schema';
import { sql, like } from 'drizzle-orm';

async function checkRehabExercises() {
  try {
    // Count rehabilitation exercises
    const rehabExercises = await db.select({
      category: cachedExercises.category,
      count: sql<number>`count(*)`
    })
    .from(cachedExercises)
    .where(like(cachedExercises.category, '%Rehabilitation%'))
    .groupBy(cachedExercises.category)
    .orderBy(cachedExercises.category);
    
    console.log('=================================');
    console.log('REHABILITATION EXERCISES');
    console.log('=================================');
    
    let totalRehab = 0;
    rehabExercises.forEach(row => {
      console.log(`${row.category}: ${row.count} exercises`);
      totalRehab += Number(row.count);
    });
    
    console.log('--------------------------------');
    console.log(`Total Rehabilitation Exercises: ${totalRehab}`);
    console.log('=================================');
    
    // Check specific body parts
    const bodyPartRehab = await db.select({
      bodyPart: cachedExercises.bodyPart,
      count: sql<number>`count(*)`
    })
    .from(cachedExercises)
    .where(sql`body_part IN ('Hips', 'Knees', 'Shoulders', 'Neck', 'Elbows', 'Wrists', 'Core', 'Ankles', 'Back')`)
    .groupBy(cachedExercises.bodyPart);
    
    console.log('\nClinical Body Part Exercises:');
    console.log('--------------------------------');
    bodyPartRehab.forEach(row => {
      console.log(`  ${row.bodyPart}: ${row.count} exercises`);
    });
    
  } catch (error) {
    console.error('Error checking exercises:', error);
  }
  process.exit(0);
}

checkRehabExercises();
