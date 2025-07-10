import { db } from '../db.js';
import { competitions, gameContent } from '../../shared/schema.js';

// New competition types with clinical variety
const newCompetitions = [
  // RED FLAG DETECTIVE COMPETITIONS
  {
    title: "Red Flag Detective: Spine Emergencies",
    description: "Identify critical spine pathologies requiring immediate medical attention",
    gameType: "red_flag_detective",
    bodyPart: "back",
    difficulty: "advanced",
    timeLimit: 10,
    maxParticipants: 10,
    content: {
      redFlagDetective: {
        cases: [
          {
            patientPresentation: "45-year-old office worker with sudden severe low back pain after lifting, bilateral leg weakness, and loss of bladder control",
            redFlags: ["Cauda equina syndrome", "Bilateral neurological deficit", "Bladder dysfunction"],
            distractors: ["Simple muscle strain", "Disc herniation", "Sciatica"],
            urgency: "immediate",
            correctAction: "Emergency MRI and surgical referral within 24 hours"
          },
          {
            patientPresentation: "70-year-old with progressive back pain, night sweats, weight loss, and previous history of breast cancer",
            redFlags: ["Metastatic disease", "Constitutional symptoms", "Cancer history"],
            distractors: ["Osteoporotic compression fracture", "Age-related degeneration", "Muscle strain"],
            urgency: "urgent",
            correctAction: "Immediate oncology referral and imaging"
          },
          {
            patientPresentation: "30-year-old with acute thoracic pain, fever, and recent IV drug use history",
            redFlags: ["Spinal infection", "Osteomyelitis risk", "Systemic illness"],
            distractors: ["Muscle strain", "Rib dysfunction", "Postural pain"],
            urgency: "immediate",
            correctAction: "Emergency blood work, MRI, and infectious disease consultation"
          }
        ],
        scoringCriteria: {
          redFlagIdentification: 40,
          falsePositiveAvoidance: 30,
          urgencyAssessment: 20,
          appropriateAction: 10
        }
      }
    }
  },
  {
    title: "Red Flag Detective: Shoulder Pathology",
    description: "Spot dangerous shoulder conditions hiding behind common presentations",
    gameType: "red_flag_detective",
    bodyPart: "shoulder",
    difficulty: "advanced",
    timeLimit: 8,
    maxParticipants: 10,
    content: {
      redFlagDetective: {
        cases: [
          {
            patientPresentation: "55-year-old with sudden shoulder pain, shortness of breath, and left arm numbness after yard work",
            redFlags: ["Myocardial infarction", "Cardiac referred pain", "Acute cardiac event"],
            distractors: ["Rotator cuff tear", "Shoulder impingement", "Muscle strain"],
            urgency: "immediate",
            correctAction: "Emergency cardiac evaluation and ECG"
          },
          {
            patientPresentation: "25-year-old athlete with shoulder pain, numbness in pinky finger, and Horner's syndrome signs",
            redFlags: ["Thoracic outlet syndrome", "Neurological compromise", "Vascular involvement"],
            distractors: ["Labral tear", "Rotator cuff injury", "AC joint sprain"],
            urgency: "urgent",
            correctAction: "Vascular and neurological assessment immediately"
          }
        ],
        scoringCriteria: {
          redFlagIdentification: 40,
          falsePositiveAvoidance: 30,
          urgencyAssessment: 20,
          appropriateAction: 10
        }
      }
    }
  },

  // DIFFERENTIAL RACE COMPETITIONS
  {
    title: "Differential Race: Knee Pain Mastery",
    description: "Generate comprehensive differential diagnoses for complex knee presentations",
    gameType: "differential_diagnosis_duel",
    bodyPart: "knee",
    difficulty: "intermediate",
    timeLimit: 12,
    maxParticipants: 10,
    content: {
      differentialDiagnosisDuel: {
        cases: [
          {
            patientPresentation: "18-year-old soccer player with acute knee pain, audible pop, immediate swelling, and inability to continue playing",
            requiredDifferentials: ["ACL rupture", "Meniscal tear", "PCL injury", "MCL sprain", "Lateral collateral ligament injury"],
            bonusDifferentials: ["Osteochondral fracture", "Patellar dislocation", "Hemarthrosis"],
            excludeDifferentials: ["Osteoarthritis", "Rheumatoid arthritis", "Gout"],
            timeToComplete: 8
          },
          {
            patientPresentation: "65-year-old with gradual onset knee stiffness, morning pain lasting 30 minutes, and difficulty with stairs",
            requiredDifferentials: ["Osteoarthritis", "Meniscal degeneration", "Patellofemoral pain syndrome", "Bursitis"],
            bonusDifferentials: ["Chondromalacia patellae", "Baker's cyst", "Osteonecrosis"],
            excludeDifferentials: ["ACL tear", "Acute fracture", "Septic arthritis"],
            timeToComplete: 6
          }
        ],
        scoringCriteria: {
          requiredDifferentials: 50,
          bonusDifferentials: 25,
          avoidingExclusions: 15,
          timeBonus: 10
        }
      }
    }
  },
  {
    title: "Differential Race: Hip Complexity Challenge",
    description: "Master the art of hip differential diagnosis across age groups",
    gameType: "differential_diagnosis_duel",
    bodyPart: "hip",
    difficulty: "advanced",
    timeLimit: 15,
    maxParticipants: 10,
    content: {
      differentialDiagnosisDuel: {
        cases: [
          {
            patientPresentation: "12-year-old with hip pain, limping, and restricted internal rotation",
            requiredDifferentials: ["Slipped capital femoral epiphysis", "Legg-Calve-Perthes disease", "Transient synovitis", "Septic arthritis"],
            bonusDifferentials: ["Juvenile arthritis", "Hip dysplasia", "Stress fracture"],
            excludeDifferentials: ["Osteoarthritis", "Labral tear", "Piriformis syndrome"],
            timeToComplete: 10
          },
          {
            patientPresentation: "35-year-old runner with deep groin pain, clicking sensation, and pain with hip flexion",
            requiredDifferentials: ["Labral tear", "FAI (femoroacetabular impingement)", "Hip flexor strain", "Adductor strain"],
            bonusDifferentials: ["Stress fracture", "Osteitis pubis", "Sports hernia"],
            excludeDifferentials: ["Osteoarthritis", "AVN", "SCFE"],
            timeToComplete: 8
          }
        ],
        scoringCriteria: {
          requiredDifferentials: 50,
          bonusDifferentials: 25,
          avoidingExclusions: 15,
          timeBonus: 10
        }
      }
    }
  },

  // PATTERN RECOGNITION COMPETITIONS  
  {
    title: "Pattern Recognition: Classic Presentations",
    description: "Recognize classic clinical patterns and syndromes instantly",
    gameType: "lightning_diagnosis",
    bodyPart: "general",
    difficulty: "intermediate",
    timeLimit: 10,
    maxParticipants: 10,
    content: {
      lightningDiagnosis: {
        questions: [
          {
            case: "Middle-aged tennis player with lateral elbow pain worse with gripping and resisted wrist extension",
            correctDiagnosis: "Lateral epicondylitis (Tennis elbow)",
            options: ["Lateral epicondylitis", "Medial epicondylitis", "Radial tunnel syndrome", "Posterior interosseous nerve syndrome"],
            timeLimit: 30,
            explanationKey: "Classic tennis elbow presentation with lateral elbow pain and resisted wrist extension"
          },
          {
            case: "Young female dancer with gradual onset heel pain, worse in morning and after activity",
            correctDiagnosis: "Plantar fasciitis",
            options: ["Plantar fasciitis", "Achilles tendinopathy", "Calcaneal stress fracture", "Tarsal tunnel syndrome"],
            timeLimit: 30,
            explanationKey: "Classic plantar fasciitis with morning stiffness and activity-related pain"
          },
          {
            case: "Office worker with numbness in thumb, index, and middle fingers, worse at night",
            correctDiagnosis: "Carpal tunnel syndrome",
            options: ["Carpal tunnel syndrome", "Cubital tunnel syndrome", "Thoracic outlet syndrome", "Cervical radiculopathy"],
            timeLimit: 30,
            explanationKey: "Classic median nerve distribution and nocturnal symptoms"
          }
        ],
        scoringCriteria: {
          accuracy: 70,
          speed: 30
        }
      }
    }
  },

  // EMERGENCY TRIAGE COMPETITIONS
  {
    title: "Emergency Triage: Critical Decision Making",
    description: "Make rapid triage decisions in emergency scenarios",
    gameType: "emergency_room_simulator",
    bodyPart: "general",
    difficulty: "advanced",
    timeLimit: 20,
    maxParticipants: 10,
    content: {
      emergencyRoomSimulator: {
        scenarios: [
          {
            multiplePatients: [
              {
                patient: "25-year-old with acute back pain after car accident, alert and stable vitals",
                triageLevel: "urgent",
                timeToAssess: 30,
                keyFindings: ["Mechanism of injury", "Spinal precautions needed"]
              },
              {
                patient: "60-year-old with chest pain radiating to left arm, sweating, nauseous",
                triageLevel: "immediate",
                timeToAssess: 5,
                keyFindings: ["Cardiac symptoms", "Life-threatening presentation"]
              },
              {
                patient: "40-year-old with ankle sprain from basketball, walking with limp",
                triageLevel: "less urgent",
                timeToAssess: 60,
                keyFindings: ["Non-urgent injury", "Stable presentation"]
              }
            ],
            resourceLimitations: ["One treatment room available", "Limited imaging access"],
            correctPrioritization: ["Patient 2 (immediate)", "Patient 1 (urgent)", "Patient 3 (less urgent)"],
            timeConstraint: 10
          }
        ],
        scoringCriteria: {
          correctPrioritization: 50,
          timeManagement: 25,
          resourceUtilization: 15,
          safetyConsiderations: 10
        }
      }
    }
  },

  // MANUAL THERAPY SELECTION COMPETITIONS
  {
    title: "Manual Therapy Selection: Optimal Techniques",
    description: "Choose the most effective manual therapy approaches for complex cases",
    gameType: "treatment_speed_run",
    bodyPart: "general",
    difficulty: "advanced",
    timeLimit: 15,
    maxParticipants: 10,
    content: {
      treatmentSpeedRun: {
        cases: [
          {
            patientPresentation: "45-year-old office worker with cervical spine stiffness, forward head posture, and upper trap tension",
            requiredComponents: [
              "Manual therapy technique selection",
              "Specific joint mobilization approach", 
              "Soft tissue treatment plan",
              "Postural correction strategy"
            ],
            gradingCriteria: {
              techniqueSelection: "Evidence-based manual therapy choices",
              specificityOfTreatment: "Targeted approach to identified impairments",
              safetyConsiderations: "Contraindications and precautions addressed",
              progressionPlan: "Clear treatment progression outlined"
            },
            timeToComplete: 12,
            optimalTechniques: [
              "Cervical mobilization (C1-C2, C4-C6)",
              "Upper cervical muscle energy techniques",
              "Suboccipital soft tissue release",
              "Thoracic spine manipulation T3-T6",
              "Pectoral muscle stretching and release"
            ]
          },
          {
            patientPresentation: "28-year-old athlete with acute lumbar spine dysfunction, protective muscle guarding, and limited flexion",
            requiredComponents: [
              "Acute care manual therapy approach",
              "Pain modulation techniques",
              "Movement restoration plan",
              "Return to sport considerations"
            ],
            gradingCriteria: {
              acuteCareApproach: "Appropriate for inflammatory phase",
              painManagement: "Effective pain modulation strategies",
              movementRestoration: "Progressive mobility techniques",
              functionalIntegration: "Sport-specific movement patterns"
            },
            timeToComplete: 10,
            optimalTechniques: [
              "Grade I-II lumbar mobilizations",
              "Gentle soft tissue techniques",
              "Muscle energy techniques for pelvic asymmetry",
              "Neural mobilization as tolerated",
              "Progressive loading exercises"
            ]
          }
        ],
        scoringCriteria: {
          techniqueSelection: 35,
          evidenceBase: 25,
          safetyProfile: 25,
          progressionPlanning: 15
        }
      }
    }
  },

  // HOME EXERCISE PRESCRIPTION COMPETITIONS
  {
    title: "Home Exercise Prescription: Evidence-Based Programs",
    description: "Design optimal home exercise programs with perfect dosage and progression",
    gameType: "treatment_speed_run",
    bodyPart: "general", 
    difficulty: "intermediate",
    timeLimit: 18,
    maxParticipants: 10,
    content: {
      treatmentSpeedRun: {
        cases: [
          {
            patientPresentation: "55-year-old with chronic low back pain, poor core stability, and fear of movement",
            requiredComponents: [
              "Exercise selection rationale",
              "Specific dosage parameters",
              "Progression timeline", 
              "Patient education strategy"
            ],
            gradingCriteria: {
              exerciseSelection: "Evidence-based exercise choices for chronic low back pain",
              dosageParameters: "Appropriate sets, reps, frequency, and intensity",
              progressionPlan: "Clear 4-6 week progression strategy",
              patientEducation: "Pain science education and self-management strategies"
            },
            timeToComplete: 15,
            optimalProgram: [
              "Core stabilization (dead bug, bird dog) - 2 sets x 10 reps, 2x daily",
              "Hip flexor stretching - 30 seconds x 3, 2x daily",
              "Cat-cow mobility - 10 reps, 3x daily",
              "Walking program - Start 10 minutes, progress by 5 minutes weekly",
              "Pain education materials and movement confidence building"
            ]
          },
          {
            patientPresentation: "30-year-old runner with patellofemoral pain, weak glutes, and poor landing mechanics",
            requiredComponents: [
              "Biomechanical exercise selection",
              "Sport-specific progression",
              "Strength training parameters",
              "Return-to-running protocol"
            ],
            gradingCriteria: {
              biomechanicalFocus: "Addresses gluteal weakness and movement patterns",
              strengthProgression: "Progressive overload principles applied",
              sportSpecific: "Running-specific movement integration",
              returnToSport: "Graduated return-to-running protocol"
            },
            timeToComplete: 12,
            optimalProgram: [
              "Clamshells with resistance - 3 sets x 15, daily",
              "Single leg squat progression - 2 sets x 10 each leg",
              "Step-down exercises - 2 sets x 12 each leg",
              "Plyometric progression (week 3-4)",
              "Running progression: walk-jog intervals progressing to continuous running"
            ]
          }
        ],
        scoringCriteria: {
          exerciseSelection: 30,
          dosageAccuracy: 25,
          progressionLogic: 25,
          patientEducation: 20
        }
      }
    }
  }
];

async function createNewCompetitions() {
  try {
    console.log('Creating new competition system...');
    
    for (const competition of newCompetitions) {
      // Create competition
      const [newComp] = await db.insert(competitions).values({
        title: competition.title,
        description: competition.description,
        type: "daily_challenge",
        gameType: competition.gameType as any,
        status: "active",
        bodyPart: competition.bodyPart as any,
        difficulty: competition.difficulty as any,
        timeLimit: competition.timeLimit,
        maxParticipants: competition.maxParticipants,
        currentParticipants: 0,
        entryFee: 0,
        prizePool: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        caseStudyIds: [],
        caseType: "simple",
        isAutoGenerated: false,
        rules: {}
      }).returning();

      // Create game content
      await db.insert(gameContent).values({
        competitionId: newComp.id,
        gameType: competition.gameType as any,
        content: competition.content,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✓ Created: ${competition.title}`);
    }

    console.log(`\n🎯 Successfully created ${newCompetitions.length} new competitions!`);
    console.log('\nNew Competition Types:');
    console.log('1. Red Flag Detective (2 competitions)');
    console.log('2. Differential Race (2 competitions)'); 
    console.log('3. Pattern Recognition (1 competition)');
    console.log('4. Emergency Triage (1 competition)');
    console.log('5. Manual Therapy Selection (1 competition)');
    console.log('6. Home Exercise Prescription (1 competition)');
    
  } catch (error) {
    console.error('Error creating competitions:', error);
    throw error;
  }
}

// Run directly if called
if (import.meta.url === `file://${process.argv[1]}`) {
  createNewCompetitions()
    .then(() => {
      console.log("New competition system created successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error creating new competitions:", error);
      process.exit(1);
    });
}

export { createNewCompetitions };