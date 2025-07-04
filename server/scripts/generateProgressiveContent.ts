import { db } from '../db.ts';
import { competitions, gameContent } from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';
import { gameContentGenerator } from '../gameContentGenerator.ts';

async function generateProgressiveContent() {
  console.log('🎯 Starting Progressive Diagnostic Challenge content generation...');
  
  try {
    // Get all Progressive Diagnostic Challenge competitions
    const progressiveCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'progressive_diagnostic_challenge'));
    
    console.log(`Found ${progressiveCompetitions.length} Progressive Diagnostic Challenge competitions`);
    
    for (const competition of progressiveCompetitions) {
      console.log(`\n📝 Generating content for: ${competition.title}`);
      
      // Check if content already exists
      const existingContent = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id));
      
      if (existingContent.length > 0) {
        console.log(`   ✓ Content already exists, skipping...`);
        continue;
      }
      
      // Generate new content
      const content = await gameContentGenerator.generateGameContent({
        gameType: 'progressive_diagnostic_challenge',
        bodyPart: (competition.bodyPart as string) || 'general',
        difficulty: (competition.difficulty as string) || 'intermediate'
      });
      
      // Insert content into database
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'progressive_diagnostic_challenge',
        content: content
      });
      
      console.log(`   ✅ Content generated successfully`);
    }
    
    console.log('\n🎉 Progressive Diagnostic Challenge content generation completed!');
    
  } catch (error) {
    console.error('❌ Error generating Progressive Diagnostic Challenge content:', error);
    throw error;
  }
}

// Run the script
generateProgressiveContent().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});