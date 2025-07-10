import { db } from '../db.js';
import { competitions, gameContent } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

async function cleanupCompetitions() {
  console.log('Cleaning up competitions...');
  
  try {
    // Delete all existing game content first (foreign key constraint)
    await db.delete(gameContent);
    console.log('✓ Deleted all existing game content');
    
    // Delete all existing competitions
    await db.delete(competitions);
    console.log('✓ Deleted all existing competitions');
    
    // Create new competitions with correct game types
    const newCompetitions = [
      {
        title: 'Red Flag Detective: Spine Emergencies',
        description: 'Identify critical spine conditions requiring immediate medical attention',
        gameType: 'red_flag_detective',
        bodyPart: 'back',
        difficulty: 'advanced',
        timeLimit: 15,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        caseStudyIds: [], // Required field
        complexCaseIds: []
      },
      {
        title: 'Red Flag Detective: Shoulder Pathology',
        description: 'Recognize serious shoulder pathology requiring urgent intervention',
        gameType: 'red_flag_detective',
        bodyPart: 'shoulder',
        difficulty: 'advanced',
        timeLimit: 12,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Differential Race: Knee Pain Mastery',
        description: 'Generate comprehensive differential diagnoses for complex knee presentations',
        gameType: 'differential_diagnosis_duel',
        bodyPart: 'knee',
        difficulty: 'advanced',
        timeLimit: 20,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Differential Race: Hip Complexity Challenge',
        description: 'Master complex hip pain differential diagnosis under time pressure',
        gameType: 'differential_diagnosis_duel',
        bodyPart: 'hip',
        difficulty: 'advanced',
        timeLimit: 18,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Pattern Recognition: Classic Presentations',
        description: 'Recognize classic clinical patterns and syndromes instantly',
        gameType: 'lightning_diagnosis',
        bodyPart: 'general',
        difficulty: 'intermediate',
        timeLimit: 10,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Emergency Triage: Critical Decision Making',
        description: 'Make critical triage decisions with multiple patients under pressure',
        gameType: 'emergency_room_simulator',
        bodyPart: 'general',
        difficulty: 'advanced',
        timeLimit: 25,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Manual Therapy Selection: Optimal Techniques',
        description: 'Choose the most effective manual therapy approaches for complex cases',
        gameType: 'treatment_speed_run',
        bodyPart: 'general',
        difficulty: 'advanced',
        timeLimit: 15,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      },
      {
        title: 'Home Exercise Prescription: Evidence-Based Programs',
        description: 'Design optimal home exercise programs with perfect dosage and progression',
        gameType: 'treatment_speed_run',
        bodyPart: 'general',
        difficulty: 'intermediate',
        timeLimit: 18,
        maxParticipants: 10,
        status: 'active',
        type: 'daily_challenge',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        caseStudyIds: [],
        complexCaseIds: []
      }
    ];
    
    // Insert new competitions
    const insertedCompetitions = await db.insert(competitions).values(newCompetitions).returning();
    console.log(`✓ Created ${insertedCompetitions.length} new competitions`);
    
    // Log final result
    console.log('\nNew competitions created:');
    insertedCompetitions.forEach((comp, index) => {
      console.log(`${index + 1}. ${comp.title} (${comp.gameType})`);
    });
    
    console.log('\n🎯 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupCompetitions().then(() => {
  console.log('Script completed');
  process.exit(0);
});