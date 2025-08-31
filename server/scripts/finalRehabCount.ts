import { db } from '../db';
import { cachedExercises } from '@shared/schema';
import { sql, like } from 'drizzle-orm';

async function finalRehabCount() {
  try {
    // Count rehabilitation exercises by body part
    const rehabByBodyPart = await db.select({
      bodyPart: cachedExercises.bodyPart,
      count: sql<number>`count(*)`
    })
    .from(cachedExercises)
    .where(sql`body_part IN ('Hips', 'Knees', 'Shoulders', 'Neck', 'Elbows', 'Wrists', 'core', 'ankles', 'Back')`)
    .groupBy(cachedExercises.bodyPart)
    .orderBy(cachedExercises.bodyPart);
    
    console.log('=================================');
    console.log('FINAL REHABILITATION EXERCISE COUNT');
    console.log('=================================');
    
    let totalRehab = 0;
    rehabByBodyPart.forEach(row => {
      const formattedName = row.bodyPart.charAt(0).toUpperCase() + row.bodyPart.slice(1);
      console.log(`  ${formattedName}: ${row.count} exercises`);
      totalRehab += Number(row.count);
    });
    
    console.log('--------------------------------');
    console.log(`Total Clinical Exercises: ${totalRehab}`);
    
    // Get overall total
    const total = await db.select({ count: sql<number>`count(*)` }).from(cachedExercises);
    console.log(`Total Database Exercises: ${total[0].count}`);
    console.log('=================================');
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

finalRehabCount();
