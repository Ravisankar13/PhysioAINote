import { db } from '../db.ts';
import { competitions as competitionsTable, gameContent } from '../../shared/schema.ts';
import { eq, and, isNull } from 'drizzle-orm';

const progressiveContents = {
  shoulder: {
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
        },
        {
          id: "q4",
          question: "Rate your pain from 1-10",
          cost: 1,
          category: "severity",
          reveals: ["pain_intensity", "pain_pattern"]
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
        medicationHistory: "Taking ibuprofen with moderate relief",
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
  },
  knee: {
    progressiveDiagnosticChallenge: {
      patientPresentation: {
        age: 22,
        gender: "male",
        occupation: "soccer player",
        chiefComplaint: "knee pain and swelling after sports injury",
        initialSymptoms: [
          "Immediate pain during game",
          "Swelling within hours",
          "Difficulty weight bearing"
        ]
      },
      availableQuestions: [
        {
          id: "q1",
          question: "Describe the mechanism of injury",
          cost: 1,
          category: "mechanism",
          reveals: ["injury_details", "position_at_injury"]
        },
        {
          id: "q2",
          question: "Did you hear any sounds?",
          cost: 2,
          category: "auditory_symptoms", 
          reveals: ["pop_sound", "crack_indication"]
        },
        {
          id: "q3",
          question: "Can you walk normally?",
          cost: 1,
          category: "function",
          reveals: ["weight_bearing_status", "gait_pattern"]
        }
      ],
      availableTests: [
        {
          id: "t1",
          test: "Anterior Drawer Test",
          cost: 4,
          category: "ligament_integrity",
          reveals: ["acl_status", "anterior_translation"]
        },
        {
          id: "t2",
          test: "McMurray Test",
          cost: 3,
          category: "meniscal_assessment",
          reveals: ["meniscal_integrity", "mechanical_symptoms"]
        }
      ],
      hiddenInformation: {
        detailedHistory: "Non-contact injury during pivoting movement",
        mechanism: "Valgus stress with external rotation",
        auditorySymptoms: "Loud pop heard at time of injury",
        functionalLoss: "Immediate inability to continue playing",
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
      },
      correctDiagnosis: "ACL Rupture",
      differentialDiagnoses: [
        "Meniscal tear",
        "MCL sprain",
        "Patellar dislocation"
      ],
      resourceBudget: 18,
      timeLimit: 30,
      scoringCriteria: {
        efficiency: 35,
        thoroughness: 35,
        safety: 20,
        accuracy: 10
      }
    }
  },
  back: {
    progressiveDiagnosticChallenge: {
      patientPresentation: {
        age: 45,
        gender: "male",
        occupation: "construction worker",
        chiefComplaint: "severe lower back pain with leg symptoms",
        initialSymptoms: [
          "Sharp shooting pain down leg",
          "Numbness in foot",
          "Weakness lifting foot up"
        ]
      },
      availableQuestions: [
        {
          id: "q1",
          question: "When lifting, what position were you in?",
          cost: 1,
          category: "mechanism",
          reveals: ["lifting_posture", "load_details"]
        },
        {
          id: "q2",
          question: "Any bowel or bladder changes?",
          cost: 3,
          category: "red_flags",
          reveals: ["cauda_equina_symptoms", "emergency_signs"]
        },
        {
          id: "q3",
          question: "Does coughing make it worse?",
          cost: 1,
          category: "nerve_tension",
          reveals: ["increased_intrathecal_pressure", "nerve_involvement"]
        }
      ],
      availableTests: [
        {
          id: "t1",
          test: "Straight Leg Raise",
          cost: 3,
          category: "nerve_tension",
          reveals: ["sciatic_nerve_tension", "disc_involvement"]
        },
        {
          id: "t2",
          test: "Ankle Dorsiflexion Test",
          cost: 2,
          category: "neurological",
          reveals: ["l5_nerve_root", "motor_function"]
        }
      ],
      hiddenInformation: {
        detailedHistory: "Heavy lifting in flexed and rotated position",
        mechanism: "Herniated disc at L5-S1 level",
        redFlagAssessment: "No bowel/bladder dysfunction",
        neurologicalFindings: "L5 nerve root compression pattern"
      },
      correctDiagnosis: "L5-S1 Disc Herniation with Radiculopathy",
      differentialDiagnoses: [
        "Piriformis syndrome",
        "Facet joint dysfunction",
        "Spinal stenosis"
      ],
      resourceBudget: 20,
      timeLimit: 35,
      scoringCriteria: {
        efficiency: 30,
        thoroughness: 25,
        safety: 35,
        accuracy: 10
      }
    }
  },
  hip: {
    progressiveDiagnosticChallenge: {
      patientPresentation: {
        age: 35,
        gender: "female",
        occupation: "runner",
        chiefComplaint: "deep hip pain and clicking during activity",
        initialSymptoms: [
          "Deep aching in groin",
          "Clicking sensation with movement",
          "Pain with prolonged sitting"
        ]
      },
      availableQuestions: [
        {
          id: "q1",
          question: "When do you feel the clicking?",
          cost: 1,
          category: "mechanical_symptoms",
          reveals: ["clicking_pattern", "movement_specific"]
        },
        {
          id: "q2",
          question: "How long have you been running?",
          cost: 1,
          category: "activity_history",
          reveals: ["training_background", "overuse_potential"]
        },
        {
          id: "q3",
          question: "Any change in your training recently?",
          cost: 2,
          category: "training_modifications",
          reveals: ["training_errors", "load_management"]
        }
      ],
      availableTests: [
        {
          id: "t1",
          test: "FADIR Test",
          cost: 3,
          category: "hip_impingement",
          reveals: ["cam_impingement", "labral_involvement"]
        },
        {
          id: "t2",
          test: "FABER Test",
          cost: 3,
          category: "hip_mobility",
          reveals: ["posterior_hip_structures", "sacroiliac_involvement"]
        }
      ],
      hiddenInformation: {
        detailedHistory: "Increased mileage over past 2 months",
        mechanism: "Repetitive hip flexion with impingement",
        imagingFindings: "Cam-type morphology with labral fraying",
        functionalLimitations: "Pain limits deep hip flexion activities"
      },
      correctDiagnosis: "Femoroacetabular Impingement with Labral Tear",
      differentialDiagnoses: [
        "Hip flexor strain",
        "Stress fracture",
        "Trochanteric bursitis"
      ],
      resourceBudget: 16,
      timeLimit: 25,
      scoringCriteria: {
        efficiency: 40,
        thoroughness: 30,
        safety: 20,
        accuracy: 10
      }
    }
  },
  ankle: {
    progressiveDiagnosticChallenge: {
      patientPresentation: {
        age: 19,
        gender: "female",
        occupation: "college student",
        chiefComplaint: "ankle pain and instability after fall",
        initialSymptoms: [
          "Pain on outer side of ankle",
          "Swelling around ankle bone",
          "Feeling of ankle giving way"
        ]
      },
      availableQuestions: [
        {
          id: "q1",
          question: "How did you land when you fell?",
          cost: 1,
          category: "mechanism",
          reveals: ["inversion_injury", "position_at_impact"]
        },
        {
          id: "q2",
          question: "Could you walk immediately after?",
          cost: 1,
          category: "immediate_function",
          reveals: ["severity_indicator", "weight_bearing_ability"]
        },
        {
          id: "q3",
          question: "Any previous ankle injuries?",
          cost: 2,
          category: "injury_history",
          reveals: ["chronic_instability", "recurrent_pattern"]
        }
      ],
      availableTests: [
        {
          id: "t1",
          test: "Anterior Drawer Test (Ankle)",
          cost: 3,
          category: "ligament_integrity",
          reveals: ["atfl_status", "anterior_instability"]
        },
        {
          id: "t2",
          test: "Talar Tilt Test",
          cost: 3,
          category: "lateral_stability",
          reveals: ["cfl_integrity", "inversion_instability"]
        }
      ],
      hiddenInformation: {
        detailedHistory: "Rolled ankle stepping off curb while texting",
        mechanism: "Plantarflexion and inversion injury",
        previousInjuries: "Two previous ankle sprains on same side",
        functionalStatus: "Able to walk but with significant limp"
      },
      correctDiagnosis: "Grade II Lateral Ankle Sprain with Chronic Instability",
      differentialDiagnoses: [
        "Ankle fracture",
        "High ankle sprain",
        "Peroneal tendon injury"
      ],
      resourceBudget: 14,
      timeLimit: 20,
      scoringCriteria: {
        efficiency: 45,
        thoroughness: 25,
        safety: 20,
        accuracy: 10
      }
    }
  }
};

async function addAllProgressiveContent() {
  console.log('🎯 Adding Progressive Diagnostic Challenge content for all competitions...');
  
  try {
    // Get all Progressive Diagnostic Challenge competitions without content
    const progressiveComps = await db
      .select()
      .from(competitionsTable)
      .where(eq(competitionsTable.gameType, 'progressive_diagnostic_challenge'));
    
    console.log(`Found ${progressiveComps.length} Progressive Diagnostic Challenge competitions`);
    
    for (const competition of progressiveComps) {
      // Check if content already exists
      const existingContent = await db
        .select()
        .from(gameContent)
        .where(eq(gameContent.competitionId, competition.id));
      
      if (existingContent.length > 0) {
        console.log(`✓ ${competition.title}: Content already exists`);
        continue;
      }
      
      // Get content for this body part
      const bodyPart = competition.bodyPart || 'shoulder';
      const content = progressiveContents[bodyPart as keyof typeof progressiveContents];
      
      if (!content) {
        console.log(`⚠️  ${competition.title}: No content template for ${bodyPart}`);
        continue;
      }
      
      // Insert content into database
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'progressive_diagnostic_challenge',
        content: content
      });
      
      console.log(`✅ ${competition.title}: Content added successfully`);
    }
    
    console.log('\n🎉 All Progressive Diagnostic Challenge content added!');
    
  } catch (error) {
    console.error('❌ Error adding Progressive Diagnostic Challenge content:', error);
    throw error;
  }
}

// Run the script
addAllProgressiveContent().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});