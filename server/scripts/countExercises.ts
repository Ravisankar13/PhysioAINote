import { db } from '../db';
import { cachedExercises } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function countExercises() {
  try {
    // Get total count
    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(cachedExercises);
    
    console.log('=================================');
    console.log('EXERCISE DATABASE SUMMARY');
    console.log('=================================');
    console.log('Total exercises in database:', totalCount[0].count);
    
    // Get count by body part
    const bodyPartCounts = await db.select({
      bodyPart: cachedExercises.bodyPart,
      count: sql<number>`count(*)`
    })
    .from(cachedExercises)
    .groupBy(cachedExercises.bodyPart)
    .orderBy(sql`count(*) DESC`);
    
    console.log('\n📊 Exercises by body part:');
    console.log('--------------------------------');
    bodyPartCounts.forEach(row => {
      console.log(`  ${row.bodyPart}: ${row.count} exercises`);
    });
    
    // Get count by difficulty
    const difficultyCounts = await db.select({
      difficulty: cachedExercises.difficulty,
      count: sql<number>`count(*)`
    })
    .from(cachedExercises)
    .groupBy(cachedExercises.difficulty);
    
    console.log('\n🎯 Exercises by difficulty:');
    console.log('--------------------------------');
    difficultyCounts.forEach(row => {
      console.log(`  ${row.difficulty || 'Not specified'}: ${row.count} exercises`);
    });
    
    // Get unique categories
    const categoryCount = await db.select({ 
      count: sql<number>`count(distinct category)` 
    }).from(cachedExercises);
    
    console.log('\n📂 Unique categories:', categoryCount[0].count);
    console.log('=================================');
    
  } catch (error) {
    console.error('Error counting exercises:', error);
  }
  process.exit(0);
}

countExercises();