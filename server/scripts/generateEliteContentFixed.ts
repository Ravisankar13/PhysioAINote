import { db } from '../db';
import { competitions, gameContent } from '../../shared/schema';
import { GameContentGenerator } from '../gameContentGenerator';
import { eq } from 'drizzle-orm';

/**
 * Generate comprehensive AI content for Manual Therapy and Exercise Prescription competitions
 */

async function generateEliteContent() {
  console.log('🎯 Generating AI content for elite competitions...');
  
  const generator = new GameContentGenerator();
  
  try {
    // Get all elite competitions using SQL query
    const eliteCompetitions = await db.execute(`
      SELECT * FROM competitions 
      WHERE game_type IN ('manual_therapy_mastery', 'exercise_prescription_expert')
      ORDER BY id
    `);
    
    console.log(`Found ${eliteCompetitions.length} elite competitions`);

    for (const competition of eliteCompetitions) {
      console.log(`\n🔄 Processing: ${competition.title}`);
      
      let content;
      
      const request = {
        gameType: competition.game_type,
        bodyPart: competition.body_part,
        difficulty: competition.difficulty,
        timeLimit: competition.time_limit_minutes
      };
      
      if (competition.game_type === 'manual_therapy_mastery') {
        // Generate Manual Therapy content
        content = await generator.generateManualTherapyMastery(request);
      } else if (competition.game_type === 'exercise_prescription_expert') {
        // Generate Exercise Prescription content
        content = await generator.generateExercisePrescriptionExpert(request);
      }

      if (content) {
        // Update existing content
        await db
          .update(gameContent)
          .set({
            content: content,
            updatedAt: new Date()
          })
          .where(eq(gameContent.competitionId, competition.id));
        
        console.log(`✅ Updated content for: ${competition.title}`);
      } else {
        console.log(`⚠️ No content generated for: ${competition.title}`);
      }
    }

    console.log('\n🎉 Elite content generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating elite content:', error);
    throw error;
  }
}

// Run the script
generateEliteContent()
  .then(() => {
    console.log('\n✅ Elite content generation successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to generate elite content:', error);
    process.exit(1);
  });