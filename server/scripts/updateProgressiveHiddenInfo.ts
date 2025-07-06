import { db } from '../db.ts';
import { gameContent, competitions } from '../../shared/schema.ts';
import { eq, and } from 'drizzle-orm';

async function updateProgressiveHiddenInformation() {
  console.log('🔄 Updating Progressive Diagnostic Challenge hidden information...');
  
  try {
    // Get all Progressive Diagnostic Challenge competitions
    const progressiveCompetitions = await db.select()
      .from(competitions)
      .where(eq(competitions.gameType, 'progressive_diagnostic_challenge'));
    
    console.log(`Found ${progressiveCompetitions.length} Progressive Diagnostic Challenge competitions`);
    
    for (const competition of progressiveCompetitions) {
      // Get existing game content
      const existingContent = await db.select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id))
        .limit(1);
      
      if (existingContent.length > 0) {
        const content = existingContent[0].content as any;
        let updated = false;
        
        // Update shoulder content
        if (competition.bodyPart === 'shoulder' && content.progressiveDiagnosticChallenge) {
          content.progressiveDiagnosticChallenge.hiddenInformation = {
            ...content.progressiveDiagnosticChallenge.hiddenInformation,
            // Question reveals mapping
            onset: "Pain began 2 weeks ago after heavy lifting episode",
            movements: "Pain worsens with overhead reaching and lifting",
            positions: "Sleeping on affected side causes significant discomfort",
            trauma_history: "No direct trauma, but overuse from furniture moving",
            causative_factors: "Poor lifting technique with repetitive overhead motions",
            pain_intensity: "Pain rated 6-7/10 during activities, 3/10 at rest",
            pain_pattern: "Worse in morning, improves with gentle movement",
            // Test reveals mapping
            impingement_signs: "Positive painful arc between 60-120 degrees abduction",
            arc_of_pain: "Clear painful arc present during active abduction",
            impingement_confirmation: "Positive Hawkins-Kennedy test reproducing symptoms",
            rotator_cuff_involvement: "Suggests rotator cuff tendon involvement in impingement"
          };
          updated = true;
        }
        
        // Update knee content
        if (competition.bodyPart === 'knee' && content.progressiveDiagnosticChallenge) {
          content.progressiveDiagnosticChallenge.hiddenInformation = {
            ...content.progressiveDiagnosticChallenge.hiddenInformation,
            // Question reveals mapping
            injury_details: "Non-contact injury occurred during pivoting movement while defending",
            position_at_injury: "Player was in a planted position with knee in slight flexion",
            pop_sound: "Loud audible pop heard by player and teammates",
            crack_indication: "No cracking sounds, just a single distinct pop",
            weight_bearing_status: "Unable to bear weight immediately after injury",
            gait_pattern: "Cannot walk normally, requires assistance off field",
            // Test reveals mapping
            acl_status: "Positive anterior drawer test indicating ACL rupture",
            anterior_translation: "Significant anterior translation of tibia on femur",
            meniscal_integrity: "McMurray test shows some mechanical symptoms",
            mechanical_symptoms: "Possible concurrent meniscal damage with locking sensation"
          };
          updated = true;
        }
        
        if (updated) {
          await db.update(gameContent)
            .set({ content })
            .where(eq(gameContent.competitionId, competition.id));
          
          console.log(`✓ Updated ${competition.title} hidden information`);
        }
      }
    }
    
    console.log('🎉 Progressive Diagnostic Challenge hidden information updated!');
    
  } catch (error) {
    console.error('❌ Error updating Progressive Diagnostic Challenge hidden information:', error);
    throw error;
  }
}

updateProgressiveHiddenInformation()
  .then(() => {
    console.log('Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update:', error);
    process.exit(1);
  });