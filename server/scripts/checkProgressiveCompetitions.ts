import { db } from '../db.js';
import { competitions } from '@shared/schema';
import { eq, like } from 'drizzle-orm';

async function checkProgressiveCompetitions() {
  try {
    // Check for Progressive Diagnostic competitions
    const progressiveCompetitions = await db
      .select()
      .from(competitions)
      .where(like(competitions.title, '%Progressive Diagnostic%'));

    console.log(`Found ${progressiveCompetitions.length} Progressive Diagnostic competitions:`);
    
    progressiveCompetitions.forEach((comp, index) => {
      console.log(`\n=== Progressive Competition ${index + 1} ===`);
      console.log(`Title: ${comp.title}`);
      console.log(`Type: ${comp.type}`);
      console.log(`Game Type: ${comp.gameType}`);
      console.log(`Status: ${comp.status}`);
      console.log(`Body Part: ${comp.bodyPart}`);
      console.log(`Difficulty: ${comp.difficulty}`);
      console.log(`Time Limit: ${comp.timeLimit}`);
    });

    // Also check for game content
    const { gameContent } = await import('@shared/schema');
    const content = await db
      .select()
      .from(gameContent)
      .where(eq(gameContent.gameType, 'progressive_diagnostic_challenge'));
      
    console.log(`\nFound ${content.length} Progressive Diagnostic game content entries`);
    
  } catch (error) {
    console.error('Error checking Progressive competitions:', error);
  }
}

checkProgressiveCompetitions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to check Progressive competitions:', error);
    process.exit(1);
  });