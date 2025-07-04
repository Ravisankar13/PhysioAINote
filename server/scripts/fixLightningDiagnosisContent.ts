import { db } from '../db.js';
import { competitions, gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { gameContentGenerator } from '../gameContentGenerator.js';

async function fixLightningDiagnosisContent() {
  try {
    console.log('Fixing Lightning Diagnosis game content...');
    
    // Get all lightning_diagnosis competitions without content
    const lightningCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'lightning_diagnosis'));

    console.log(`Found ${lightningCompetitions.length} Lightning Diagnosis competitions`);

    for (const competition of lightningCompetitions) {
      // Check if content already exists
      const existingContent = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id));

      if (existingContent.length > 0) {
        console.log(`Content already exists for competition ${competition.id}: ${competition.title}`);
        continue;
      }

      console.log(`Generating content for: ${competition.title}`);

      // Generate Lightning Diagnosis content
      const generatedContent = await gameContentGenerator.generateGameContent({
        gameType: 'lightning_diagnosis',
        bodyPart: competition.bodyPart || 'general',
        difficulty: competition.difficulty || 'intermediate',
        timeLimit: competition.timeLimit || 30
      });

      // Insert game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'lightning_diagnosis',
        content: { lightningDiagnosis: generatedContent }
      });

      console.log(`✓ Created content for competition ${competition.id}: ${competition.title}`);
    }

    console.log('✓ Successfully fixed all Lightning Diagnosis game content');
    
  } catch (error) {
    console.error('Error fixing Lightning Diagnosis content:', error);
    throw error;
  }
}

// Run the function
fixLightningDiagnosisContent()
  .then(() => {
    console.log('Lightning Diagnosis content fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to fix Lightning Diagnosis content:', error);
    process.exit(1);
  });

export { fixLightningDiagnosisContent };