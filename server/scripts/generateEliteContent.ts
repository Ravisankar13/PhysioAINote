/**
 * Generate content for Elite Game competitions
 * This script creates proper game content for the new Elite competition types
 */

import { db } from '../db';
import { competitions, gameContent } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

// Elite competition content generators
const generateRedFlagDetectiveContent = (competitionTitle: string) => {
  const isSpine = competitionTitle.toLowerCase().includes('spine');
  const isShoulder = competitionTitle.toLowerCase().includes('shoulder');

  if (isSpine) {
    return {
      redFlagDetective: {
        cases: [
          {
            id: 1,
            presentation: "A 45-year-old male presents with severe lower back pain that started 3 days ago after lifting heavy boxes. He reports bowel incontinence since yesterday and bilateral leg numbness below the knees. Pain is constant 9/10, not relieved by rest or position changes.",
            redFlags: [
              "Cauda equina syndrome (bowel incontinence + bilateral numbness)",
              "Progressive neurological deficit",
              "Severe unrelenting pain"
            ],
            urgency: "immediate",
            expectedActions: ["Immediate MRI", "Urgent neurosurgical consultation", "Bladder scan"]
          }
        ]
      }
    };
  } else if (isShoulder) {
    return {
      redFlagDetective: {
        cases: [
          {
            id: 1,
            presentation: "A 28-year-old female presents with sudden onset severe shoulder pain following a minor fall. She has a history of steroid use for asthma. The shoulder appears swollen and she cannot move it at all. She mentions having night sweats and feeling unwell for the past week.",
            redFlags: [
              "Septic arthritis (systemic symptoms + inability to move joint)",
              "Immunocompromised patient (steroid use)",
              "Rapid onset of severe symptoms"
            ],
            urgency: "urgent",
            expectedActions: ["Blood tests (WBC, CRP, ESR)", "Joint aspiration", "Urgent orthopedic consultation"]
          }
        ]
      }
    };
  }

  return {
    redFlagDetective: {
      cases: [
        {
          id: 1,
          presentation: "Patient presents with concerning symptoms requiring red flag assessment...",
          redFlags: ["Potential serious pathology"],
          urgency: "assessment required",
          expectedActions: ["Clinical evaluation", "Appropriate referral"]
        }
      ]
    }
  };
};

const generateDifferentialDiagnosisContent = (competitionTitle: string) => {
  const isKnee = competitionTitle.toLowerCase().includes('knee');
  const isHip = competitionTitle.toLowerCase().includes('hip');

  if (isKnee) {
    return {
      differentialDiagnosis: {
        cases: [
          {
            id: 1,
            presentation: "A 22-year-old soccer player presents with acute knee pain and swelling after a non-contact pivoting injury during practice. He heard a 'pop' and immediately fell to the ground. He cannot bear weight and reports the knee feels unstable.",
            expectedDifferentials: [
              "ACL rupture (most likely - mechanism, pop, instability)",
              "Meniscal tear (associated with ACL injury)",
              "MCL sprain (may occur with ACL)",
              "Patellar dislocation",
              "Tibial plateau fracture (less likely in young athlete)"
            ],
            clinicalTests: ["Lachman test", "Anterior drawer", "McMurray test", "Valgus stress test"],
            mostLikely: "ACL rupture with possible meniscal involvement"
          }
        ]
      }
    };
  } else if (isHip) {
    return {
      differentialDiagnosis: {
        cases: [
          {
            id: 1,
            presentation: "A 65-year-old woman presents with gradual onset right hip pain over 6 months. Pain is worst in the morning and after sitting for prolonged periods. She reports stiffness that improves with movement but worsens with walking long distances. Pain occasionally radiates to the knee.",
            expectedDifferentials: [
              "Hip osteoarthritis (most likely - age, gradual onset, morning stiffness)",
              "Trochanteric bursitis",
              "Lumbar spine referred pain",
              "Hip labral tear",
              "Avascular necrosis (less likely without risk factors)"
            ],
            clinicalTests: ["FABER test", "Hip flexion/rotation", "Trendelenburg test", "Thomas test"],
            mostLikely: "Primary hip osteoarthritis"
          }
        ]
      }
    };
  }

  return {
    differentialDiagnosis: {
      cases: [
        {
          id: 1,
          presentation: "Complex clinical presentation requiring differential diagnosis...",
          expectedDifferentials: ["Multiple potential diagnoses"],
          clinicalTests: ["Appropriate clinical tests"],
          mostLikely: "Most probable diagnosis"
        }
      ]
    }
  };
};

const generateEmergencySimulatorContent = () => {
  return {
    emergencySimulator: {
      cases: [
        {
          id: 1,
          presentation: "Multiple patients arrive simultaneously: 1) 35-year-old with chest pain and shortness of breath after car accident, 2) 8-year-old with severe asthma attack, 3) 70-year-old who fell and cannot move right arm, 4) 25-year-old with ankle sprain from sports injury.",
          patients: [
            {
              age: 35,
              condition: "Chest pain + dyspnea post-MVA",
              priority: 1,
              reasoning: "Potential pneumothorax or cardiac contusion"
            },
            {
              age: 8,
              condition: "Severe asthma attack",
              priority: 2,
              reasoning: "Respiratory distress in pediatric patient"
            },
            {
              age: 70,
              condition: "Suspected fractured arm",
              priority: 3,
              reasoning: "Isolated orthopedic injury"
            },
            {
              age: 25,
              condition: "Ankle sprain",
              priority: 4,
              reasoning: "Non-urgent musculoskeletal injury"
            }
          ],
          expectedPrioritization: "Chest trauma → Pediatric asthma → Elderly fracture → Ankle sprain"
        }
      ]
    }
  };
};

async function generateEliteCompetitionContent() {
  console.log('🎯 Generating content for Elite competitions...');

  try {
    // Get all Elite competitions that need content
    const eliteCompetitions = await db
      .select()
      .from(competitions)
      .where(inArray(competitions.gameType, ['red_flag_detective', 'differential_diagnosis_duel', 'emergency_room_simulator']));

    console.log(`Found ${eliteCompetitions.length} Elite competitions:`, eliteCompetitions.map(c => c.title));

    for (const competition of eliteCompetitions) {
      console.log(`\n📝 Generating content for: ${competition.title} (${competition.gameType})`);

      let content;
      
      switch (competition.gameType) {
        case 'red_flag_detective':
          content = generateRedFlagDetectiveContent(competition.title);
          break;
        case 'differential_diagnosis_duel':
          content = generateDifferentialDiagnosisContent(competition.title);
          break;
        case 'emergency_room_simulator':
          content = generateEmergencySimulatorContent();
          break;
        default:
          console.log(`⚠️ Unknown game type: ${competition.gameType}`);
          continue;
      }

      // Check if content already exists
      const existingContent = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id));

      if (existingContent.length > 0) {
        // Update existing content
        await db
          .update(gameContent)
          .set({ content })
          .where(eq(gameContent.competitionId, competition.id));
        console.log(`✅ Updated content for competition ${competition.id}`);
      } else {
        // Insert new content
        await db
          .insert(gameContent)
          .values({
            competitionId: competition.id,
            gameType: competition.gameType,
            content
          });
        console.log(`✅ Created content for competition ${competition.id}`);
      }
    }

    console.log('\n🎉 Elite competition content generation completed!');
    
    // Verify content was created
    const contentCount = await db
      .select({ count: gameContent.competitionId })
      .from(gameContent)
      .innerJoin(competitions, eq(gameContent.competitionId, competitions.id))
      .where(inArray(competitions.gameType, ['red_flag_detective', 'differential_diagnosis_duel', 'emergency_room_simulator']));
    
    console.log(`📊 Total Elite competitions with content: ${contentCount.length}`);

  } catch (error) {
    console.error('❌ Error generating Elite competition content:', error);
  }
}

// Run the content generation
generateEliteCompetitionContent().then(() => {
  console.log('Content generation script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});