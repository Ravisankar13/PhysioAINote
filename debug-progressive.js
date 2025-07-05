// Debug Progressive Diagnostic Challenge content issue
import { db } from './server/db.ts';
import { competitions, gameContent } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function debugProgressiveContent() {
  try {
    console.log('=== Progressive Diagnostic Challenge Debug ===');
    
    // Find all progressive diagnostic challenge competitions
    const progressiveComps = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'progressive_diagnostic_challenge'));
    
    console.log(`Found ${progressiveComps.length} Progressive Diagnostic Challenge competitions:`);
    
    for (const comp of progressiveComps) {
      console.log(`\nCompetition ID: ${comp.id}, Title: ${comp.title}`);
      
      // Check if there's game content for this competition
      const content = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, comp.id));
      
      if (content.length === 0) {
        console.log(`  ❌ NO GAME CONTENT FOUND for competition ${comp.id}`);
      } else {
        console.log(`  ✅ Game content exists: ${content.length} records`);
        console.log(`  Content structure:`, Object.keys(content[0].content || {}));
        
        if (content[0].content?.progressiveDiagnosticChallenge) {
          console.log(`  Progressive content keys:`, Object.keys(content[0].content.progressiveDiagnosticChallenge));
        } else {
          console.log(`  ❌ Missing progressiveDiagnosticChallenge key in content`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugProgressiveContent();