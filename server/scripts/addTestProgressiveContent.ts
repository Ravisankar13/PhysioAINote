import { db } from '../db.ts';
import { competitions, gameContent } from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function addTestProgressiveContent() {
  console.log('🎯 Adding test Progressive Diagnostic Challenge content...');
  
  try {
    // Get one Progressive Diagnostic Challenge competition
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'progressive_diagnostic_challenge'))
      .limit(1);
    
    if (competition.length === 0) {
      console.log('No Progressive Diagnostic Challenge competitions found');
      return;
    }
    
    const comp = competition[0];
    console.log(`Found competition: ${comp.title} (ID: ${comp.id})`);
    
    // Check if content already exists
    const existingContent = await db
      .select()
      .from(gameContent)
      .where(eq(gameContent.competitionId, comp.id));
    
    if (existingContent.length > 0) {
      console.log('Content already exists');
      return;
    }
    
    // Create test Progressive Diagnostic Challenge content
    const testContent = {
      progressiveDiagnosticChallenge: {
        patientPresentation: {
          age: 28,
          gender: "female",
          occupation: "office worker",
          chiefComplaint: "shoulder pain and stiffness for 2 weeks",
          initialSymptoms: [
            "Pain with overhead movements",
            "Morning stiffness",
            "Difficulty sleeping on affected side"
          ]
        },
        availableQuestions: [
          {
            id: "q1",
            question: "When did the pain first start?",
            cost: 1,
            category: "history",
            reveals: ["onset", "mechanism"]
          },
          {
            id: "q2", 
            question: "What makes the pain worse?",
            cost: 1,
            category: "aggravating_factors",
            reveals: ["movements", "positions"]
          },
          {
            id: "q3",
            question: "Any recent injuries or trauma?",
            cost: 2,
            category: "mechanism",
            reveals: ["trauma_history", "causative_factors"]
          }
        ],
        availableTests: [
          {
            id: "t1",
            test: "Painful Arc Test",
            cost: 3,
            category: "special_tests",
            reveals: ["impingement_signs", "arc_of_pain"]
          },
          {
            id: "t2",
            test: "Hawkins-Kennedy Test", 
            cost: 3,
            category: "impingement",
            reveals: ["impingement_confirmation", "rotator_cuff_involvement"]
          }
        ],
        hiddenInformation: {
          detailedHistory: "Patient started experiencing pain after moving furniture 2 weeks ago",
          mechanism: "Overhead lifting with poor technique",
          previousHistory: "No previous shoulder problems",
          medicationHistory: "Taking ibuprofen with moderate relief"
        },
        correctDiagnosis: "Subacromial Impingement Syndrome",
        differentialDiagnoses: [
          "Rotator cuff tendinopathy",
          "Adhesive capsulitis",
          "Acromioclavicular joint dysfunction"
        ],
        resourceBudget: 15,
        timeLimit: 25,
        scoringCriteria: {
          efficiency: 40,
          thoroughness: 30,
          safety: 20,
          accuracy: 10
        }
      }
    };
    
    // Insert content into database
    await db.insert(gameContent).values({
      competitionId: comp.id,
      gameType: 'progressive_diagnostic_challenge',
      content: testContent
    });
    
    console.log('✅ Test content added successfully');
    
  } catch (error) {
    console.error('❌ Error adding test content:', error);
    throw error;
  }
}

// Run the script
addTestProgressiveContent().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});