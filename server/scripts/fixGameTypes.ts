import { db } from '../db.js';
import { competitions } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const gameTypeMapping = {
  'Red Flag Detective: Spine Emergencies': 'red_flag_detective',
  'Red Flag Detective: Shoulder Pathology': 'red_flag_detective',
  'Differential Race: Knee Pain Mastery': 'differential_diagnosis_duel',
  'Differential Race: Hip Complexity Challenge': 'differential_diagnosis_duel',
  'Pattern Recognition: Classic Presentations': 'lightning_diagnosis',
  'Emergency Triage: Critical Decision Making': 'emergency_room_simulator',
  'Manual Therapy Selection: Optimal Techniques': 'treatment_speed_run',
  'Home Exercise Prescription: Evidence-Based Programs': 'treatment_speed_run'
};

async function fixGameTypes() {
  console.log('Fixing game types for competitions...');
  
  try {
    // Get all competitions
    const allCompetitions = await db.select().from(competitions);
    console.log(`Found ${allCompetitions.length} competitions`);
    
    // Update each competition with correct game type
    for (const competition of allCompetitions) {
      const correctGameType = gameTypeMapping[competition.title];
      
      if (correctGameType && competition.gameType !== correctGameType) {
        console.log(`Updating "${competition.title}" from ${competition.gameType} to ${correctGameType}`);
        
        await db.update(competitions)
          .set({ gameType: correctGameType })
          .where(eq(competitions.id, competition.id));
        
        console.log(`✓ Updated competition ID ${competition.id}`);
      } else {
        console.log(`✓ "${competition.title}" already has correct game type: ${competition.gameType}`);
      }
    }
    
    console.log('\n🎯 Game types fixed successfully!');
    
    // Display final result
    const updatedCompetitions = await db.select().from(competitions);
    console.log('\nFinal competition list:');
    updatedCompetitions.forEach(comp => {
      console.log(`- ${comp.title} (${comp.gameType})`);
    });
    
  } catch (error) {
    console.error('Error fixing game types:', error);
  }
}

// Run the fix
fixGameTypes().then(() => {
  console.log('Script completed');
  process.exit(0);
});