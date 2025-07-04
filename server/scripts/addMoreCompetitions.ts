import { db } from "../db";
import { competitions, gameContent } from "../../shared/schema";

interface LightningDiagnosisCase {
  id: string;
  presentation: string;
  timeLimit: number;
  correctDiagnosis: string;
  redHerrings: string[];
}

interface TreatmentSpeedRunCase {
  id: string;
  diagnosis: string;
  patientProfile: string;
  timeLimit: number;
  requiredComponents: string[];
  scoringCriteria: string[];
}

const lightningDiagnosisChallenges = [
  {
    title: "Lightning Diagnosis: Wrist Pain Express",
    description: "Rapid-fire wrist pathology identification challenges",
    bodyPart: "wrist",
    difficulty: "intermediate",
    timeLimit: 300,
    cases: [
      {
        id: "ld_wrist_1",
        presentation: "Office worker, 35F, 3-month gradual onset wrist pain, worse with typing, tingling in thumb/index/middle fingers, worse at night",
        timeLimit: 30,
        correctDiagnosis: "Carpal Tunnel Syndrome",
        redHerrings: ["De Quervain's Tenosynovitis", "Wrist Arthritis", "Tendonitis"]
      },
      {
        id: "ld_wrist_2", 
        presentation: "Rock climber, 28M, acute wrist pain after fall, tenderness in anatomical snuffbox, pain with thumb movement",
        timeLimit: 30,
        correctDiagnosis: "Scaphoid Fracture",
        redHerrings: ["Wrist Sprain", "De Quervain's", "Thumb Arthritis"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Foot Pain Sprint",
    description: "Fast-paced foot and ankle diagnostic challenges",
    bodyPart: "foot",
    difficulty: "advanced",
    timeLimit: 420,
    cases: [
      {
        id: "ld_foot_1",
        presentation: "Runner, 42F, heel pain worse in morning, first few steps painful, gradual improvement with walking, tender plantar heel",
        timeLimit: 30,
        correctDiagnosis: "Plantar Fasciitis",
        redHerrings: ["Heel Spur", "Achilles Tendinopathy", "Calcaneal Stress Fracture"]
      },
      {
        id: "ld_foot_2",
        presentation: "Soccer player, 25M, midfoot pain after tackle, swelling dorsum of foot, painful weight bearing, tender at base of 5th metatarsal",
        timeLimit: 30,
        correctDiagnosis: "Jones Fracture",
        redHerrings: ["Lisfranc Injury", "Metatarsal Stress Fracture", "Midfoot Sprain"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Elbow Pain Challenge",
    description: "Rapid elbow pathology identification under pressure",
    bodyPart: "elbow",
    difficulty: "intermediate",
    timeLimit: 360,
    cases: [
      {
        id: "ld_elbow_1",
        presentation: "Tennis player, 38M, lateral elbow pain, worse with gripping, tender lateral epicondyle, pain with resisted wrist extension",
        timeLimit: 30,
        correctDiagnosis: "Lateral Epicondylalgia (Tennis Elbow)",
        redHerrings: ["Radial Tunnel Syndrome", "Elbow Arthritis", "Ligament Sprain"]
      },
      {
        id: "ld_elbow_2",
        presentation: "Golfer, 45F, medial elbow pain, worse with gripping, tender medial epicondyle, pain with resisted wrist flexion",
        timeLimit: 30,
        correctDiagnosis: "Medial Epicondylalgia (Golfer's Elbow)",
        redHerrings: ["Ulnar Nerve Entrapment", "Elbow Arthritis", "MCL Sprain"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Cervical Spine Rush",
    description: "High-speed neck pathology diagnostic scenarios",
    bodyPart: "neck",
    difficulty: "advanced",
    timeLimit: 480,
    cases: [
      {
        id: "ld_neck_1",
        presentation: "Office worker, 32F, insidious neck pain, headaches, arm tingling, worse with neck extension, positive Spurling's test",
        timeLimit: 30,
        correctDiagnosis: "Cervical Radiculopathy",
        redHerrings: ["Tension Headache", "Cervical Strain", "Thoracic Outlet Syndrome"]
      },
      {
        id: "ld_neck_2",
        presentation: "Cyclist, 29M, gradual neck stiffness, reduced rotation, deep aching pain, worse with sustained positions",
        timeLimit: 30,
        correctDiagnosis: "Cervical Facet Joint Dysfunction",
        redHerrings: ["Muscle Strain", "Disc Herniation", "Torticollis"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Hand Pain Blitz",
    description: "Rapid hand pathology identification challenges",
    bodyPart: "hand",
    difficulty: "intermediate",
    timeLimit: 300,
    cases: [
      {
        id: "ld_hand_1",
        presentation: "Seamstress, 55F, thumb base pain, worse with pinching, tender CMC joint, positive grind test",
        timeLimit: 30,
        correctDiagnosis: "CMC Arthritis (Thumb)",
        redHerrings: ["De Quervain's Tenosynovitis", "Trigger Thumb", "Scaphoid Arthritis"]
      },
      {
        id: "ld_hand_2",
        presentation: "Pianist, 27F, finger catching/clicking, morning stiffness, tender A1 pulley, painful digit flexion",
        timeLimit: 30,
        correctDiagnosis: "Trigger Finger",
        redHerrings: ["Dupuytren's Contracture", "Tendon Rupture", "Joint Arthritis"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Thoracic Spine Challenge",
    description: "Fast-paced thoracic spine diagnostic scenarios",
    bodyPart: "back",
    difficulty: "advanced",
    timeLimit: 420,
    cases: [
      {
        id: "ld_thoracic_1",
        presentation: "Student, 20M, upper back pain, worse with prolonged sitting, tender thoracic facets, restricted rotation",
        timeLimit: 30,
        correctDiagnosis: "Thoracic Facet Joint Dysfunction",
        redHerrings: ["Muscle Strain", "Rib Dysfunction", "Disc Herniation"]
      },
      {
        id: "ld_thoracic_2",
        presentation: "Rower, 24F, sharp mid-back pain, worse with breathing, tender along rib angle, pain with trunk rotation",
        timeLimit: 30,
        correctDiagnosis: "Rib Subluxation",
        redHerrings: ["Intercostal Strain", "Thoracic Strain", "Stress Fracture"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Hip Pathology Express",
    description: "Rapid hip condition identification under time pressure",
    bodyPart: "hip",
    difficulty: "advanced",
    timeLimit: 480,
    cases: [
      {
        id: "ld_hip_1",
        presentation: "Runner, 35F, deep groin pain, clicking sensation, pain with hip flexion, positive FADIR test",
        timeLimit: 30,
        correctDiagnosis: "Femoroacetabular Impingement (FAI)",
        redHerrings: ["Hip Flexor Strain", "Labral Tear", "Adductor Strain"]
      },
      {
        id: "ld_hip_2",
        presentation: "Elderly, 72M, groin pain, limping, worse with weight bearing, restricted internal rotation",
        timeLimit: 30,
        correctDiagnosis: "Hip Osteoarthritis",
        redHerrings: ["Trochanteric Bursitis", "Hip Fracture", "Labral Tear"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Ankle Trauma Sprint",
    description: "High-speed ankle injury diagnostic challenges",
    bodyPart: "ankle",
    difficulty: "intermediate",
    timeLimit: 360,
    cases: [
      {
        id: "ld_ankle_1",
        presentation: "Basketball player, 22M, inversion injury, lateral ankle pain, swelling, tender ATFL, positive anterior drawer",
        timeLimit: 30,
        correctDiagnosis: "Lateral Ankle Sprain (Grade 2)",
        redHerrings: ["Ankle Fracture", "High Ankle Sprain", "Peroneal Tendon Injury"]
      },
      {
        id: "ld_ankle_2",
        presentation: "Hiker, 34F, twisted ankle, syndesmosis tenderness, pain with external rotation, squeeze test positive",
        timeLimit: 30,
        correctDiagnosis: "High Ankle Sprain (Syndesmosis)",
        redHerrings: ["Lateral Ankle Sprain", "Ankle Fracture", "Deltoid Ligament Sprain"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Lumbar Spine Blitz",
    description: "Fast-paced lower back pathology identification",
    bodyPart: "back",
    difficulty: "advanced",
    timeLimit: 540,
    cases: [
      {
        id: "ld_lumbar_1",
        presentation: "Weightlifter, 28M, acute low back pain after deadlift, leg pain to foot, positive SLR, decreased reflexes",
        timeLimit: 30,
        correctDiagnosis: "Lumbar Disc Herniation with Radiculopathy",
        redHerrings: ["Muscle Strain", "Facet Joint Sprain", "Piriformis Syndrome"]
      },
      {
        id: "ld_lumbar_2",
        presentation: "Office worker, 45F, chronic low back pain, worse with extension, better with sitting, leg claudication",
        timeLimit: 30,
        correctDiagnosis: "Lumbar Spinal Stenosis",
        redHerrings: ["Disc Degeneration", "Facet Arthritis", "Spondylolisthesis"]
      }
    ] as LightningDiagnosisCase[]
  },
  {
    title: "Lightning Diagnosis: Sports Injury Express",
    description: "Rapid sports-related injury diagnostic challenges",
    bodyPart: "general",
    difficulty: "advanced",
    timeLimit: 600,
    cases: [
      {
        id: "ld_sports_1",
        presentation: "Football player, 19M, non-contact knee injury, pop heard, immediate swelling, positive Lachman test",
        timeLimit: 30,
        correctDiagnosis: "ACL Rupture",
        redHerrings: ["MCL Sprain", "Meniscal Tear", "PCL Injury"]
      },
      {
        id: "ld_sports_2",
        presentation: "Swimmer, 17F, shoulder pain with overhead activities, positive Hawkins test, arc of pain 80-120 degrees",
        timeLimit: 30,
        correctDiagnosis: "Subacromial Impingement Syndrome",
        redHerrings: ["Rotator Cuff Tear", "Labral Tear", "AC Joint Sprain"]
      }
    ] as LightningDiagnosisCase[]
  }
];

const treatmentSpeedRunChallenges = [
  {
    title: "Treatment Speed Run: ACL Rehab Protocol",
    description: "Design comprehensive ACL reconstruction rehabilitation under time pressure",
    bodyPart: "knee",
    difficulty: "advanced",
    timeLimit: 600,
    cases: [
      {
        id: "tsr_acl_1",
        diagnosis: "ACL Reconstruction (Hamstring Graft)",
        patientProfile: "22M soccer player, 2 weeks post-op, goals to return to sport",
        timeLimit: 300,
        requiredComponents: ["Phase-based progression", "Strength training", "Proprioception", "Return to sport criteria", "Timeline"],
        scoringCriteria: ["Evidence-based approach", "Safety considerations", "Sport-specific training", "Outcome measures"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Rotator Cuff Repair",
    description: "Fast-track shoulder rehabilitation protocol design",
    bodyPart: "shoulder",
    difficulty: "advanced",
    timeLimit: 480,
    cases: [
      {
        id: "tsr_rct_1",
        diagnosis: "Rotator Cuff Repair (Supraspinatus)",
        patientProfile: "45F office worker, 4 weeks post-op, limited ROM, wants to return to daily activities",
        timeLimit: 240,
        requiredComponents: ["Protection phase", "Passive ROM", "Active ROM progression", "Strengthening", "Functional training"],
        scoringCriteria: ["Tissue healing timeline", "Progressive loading", "Functional outcomes", "Pain management"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Ankle Sprain Recovery",
    description: "Rapid ankle sprain rehabilitation protocol development",
    bodyPart: "ankle",
    difficulty: "intermediate",
    timeLimit: 360,
    cases: [
      {
        id: "tsr_ankle_1",
        diagnosis: "Grade 2 Lateral Ankle Sprain",
        patientProfile: "28F runner, 1 week post-injury, moderate swelling, wants to return to running",
        timeLimit: 180,
        requiredComponents: ["RICE protocol", "Range of motion", "Strengthening", "Proprioception", "Return to running progression"],
        scoringCriteria: ["Early mobilization", "Progressive loading", "Balance training", "Running mechanics"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Lumbar Disc Herniation",
    description: "Fast-paced lower back rehabilitation protocol design",
    bodyPart: "back",
    difficulty: "advanced",
    timeLimit: 540,
    cases: [
      {
        id: "tsr_disc_1",
        diagnosis: "L5-S1 Disc Herniation with Radiculopathy",
        patientProfile: "35M construction worker, 3 weeks post-onset, leg pain reducing, wants to return to work",
        timeLimit: 270,
        requiredComponents: ["Pain management", "Neural mobilization", "Core stabilization", "Movement re-education", "Work conditioning"],
        scoringCriteria: ["Evidence-based approach", "Graded exposure", "Functional progression", "Ergonomic education"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Frozen Shoulder Protocol",
    description: "Rapid adhesive capsulitis treatment protocol design",
    bodyPart: "shoulder",
    difficulty: "intermediate",
    timeLimit: 420,
    cases: [
      {
        id: "tsr_frozen_1",
        diagnosis: "Adhesive Capsulitis (Freezing Stage)",
        patientProfile: "52F diabetic, 3 months painful shoulder, limited ROM all directions",
        timeLimit: 210,
        requiredComponents: ["Pain management", "Gentle ROM", "Manual therapy", "Home exercise program", "Patient education"],
        scoringCriteria: ["Stage-appropriate treatment", "Pain control", "Gradual progression", "Patient compliance"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Tennis Elbow Protocol",
    description: "Fast-track lateral epicondylalgia treatment design",
    bodyPart: "elbow",
    difficulty: "intermediate",
    timeLimit: 300,
    cases: [
      {
        id: "tsr_tennis_1",
        diagnosis: "Lateral Epicondylalgia (Tennis Elbow)",
        patientProfile: "42M office worker/weekend tennis player, 6 weeks elbow pain, affecting work and sport",
        timeLimit: 150,
        requiredComponents: ["Load management", "Eccentric strengthening", "Manual therapy", "Activity modification", "Equipment assessment"],
        scoringCriteria: ["Evidence-based exercises", "Progressive loading", "Ergonomic advice", "Return to activity plan"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Plantar Fasciitis Protocol",
    description: "Rapid heel pain treatment protocol development",
    bodyPart: "foot",
    difficulty: "intermediate",
    timeLimit: 360,
    cases: [
      {
        id: "tsr_pf_1",
        diagnosis: "Plantar Fasciitis",
        patientProfile: "38F runner, 2 months heel pain, worse in morning, affecting running",
        timeLimit: 180,
        requiredComponents: ["Load modification", "Stretching program", "Strengthening", "Footwear assessment", "Running technique"],
        scoringCriteria: ["Conservative approach", "Progressive loading", "Biomechanical assessment", "Return to running plan"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Neck Pain Protocol",
    description: "Fast-paced cervical spine treatment protocol design",
    bodyPart: "neck",
    difficulty: "intermediate",
    timeLimit: 420,
    cases: [
      {
        id: "tsr_neck_1",
        diagnosis: "Cervical Facet Joint Dysfunction",
        patientProfile: "35M desk worker, 3 weeks neck pain, limited rotation, headaches",
        timeLimit: 210,
        requiredComponents: ["Manual therapy", "Exercise therapy", "Postural correction", "Ergonomic advice", "Pain education"],
        scoringCriteria: ["Multimodal approach", "Movement restoration", "Workplace modifications", "Self-management strategies"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Hip Osteoarthritis",
    description: "Rapid hip arthritis management protocol design",
    bodyPart: "hip",
    difficulty: "advanced",
    timeLimit: 480,
    cases: [
      {
        id: "tsr_hip_oa_1",
        diagnosis: "Hip Osteoarthritis (Moderate)",
        patientProfile: "62M retiree, 6 months hip pain, morning stiffness, wants to stay active",
        timeLimit: 240,
        requiredComponents: ["Exercise therapy", "Weight management", "Activity modification", "Pain management", "Education"],
        scoringCriteria: ["Conservative management", "Functional improvement", "Quality of life", "Long-term planning"]
      }
    ] as TreatmentSpeedRunCase[]
  },
  {
    title: "Treatment Speed Run: Post-Stroke Rehab",
    description: "Fast-track neurological rehabilitation protocol design",
    bodyPart: "general",
    difficulty: "advanced",
    timeLimit: 720,
    cases: [
      {
        id: "tsr_stroke_1",
        diagnosis: "Post-Stroke Hemiparesis (Left Side)",
        patientProfile: "58M, 4 weeks post-stroke, right-handed, moderate weakness left side, living at home",
        timeLimit: 360,
        requiredComponents: ["Motor relearning", "Gait training", "Upper limb therapy", "Balance training", "ADL training"],
        scoringCriteria: ["Neuroplasticity principles", "Task-specific training", "Family involvement", "Discharge planning"]
      }
    ] as TreatmentSpeedRunCase[]
  }
];

export async function addMoreCompetitions() {
  console.log("Adding 10 Lightning Diagnosis challenges...");
  
  // Add Lightning Diagnosis challenges
  for (const challenge of lightningDiagnosisChallenges) {
    try {
      // Create competition
      const [competition] = await db.insert(competitions).values({
        title: challenge.title,
        description: challenge.description,
        type: "daily_challenge",
        gameType: "lightning_diagnosis",
        status: "active",
        bodyPart: challenge.bodyPart as any,
        difficulty: challenge.difficulty,
        timeLimit: challenge.timeLimit,
        maxParticipants: 100,
        currentParticipants: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        caseStudyIds: [],
        isAutoGenerated: false,
        rules: {
          scoringWeights: {
            accuracy: 50,
            speed: 30,
            reasoning: 20,
            differential: 0,
            treatment: 0
          },
          allowedAttempts: 3,
          showLeaderboard: true,
          revealAnswers: true,
          stageTimeLimit: 5
        }
      }).returning();

      // Create game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: "lightning_diagnosis",
        content: {
          lightningDiagnosis: {
            cases: challenge.cases
          }
        }
      });

      console.log(`✓ Added Lightning Diagnosis: ${challenge.title}`);
    } catch (error) {
      console.error(`Failed to add ${challenge.title}:`, error);
    }
  }

  console.log("Adding 10 Treatment Speed Run challenges...");
  
  // Add Treatment Speed Run challenges
  for (const challenge of treatmentSpeedRunChallenges) {
    try {
      // Create competition
      const [competition] = await db.insert(competitions).values({
        title: challenge.title,
        description: challenge.description,
        type: "speed_challenge",
        gameType: "treatment_speed_run",
        status: "active",
        bodyPart: challenge.bodyPart as any,
        difficulty: challenge.difficulty,
        timeLimit: challenge.timeLimit,
        maxParticipants: 50,
        currentParticipants: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        caseStudyIds: [],
        isAutoGenerated: false,
        rules: {
          scoringWeights: {
            accuracy: 40,
            speed: 25,
            reasoning: 20,
            differential: 0,
            treatment: 15
          },
          allowedAttempts: 2,
          showLeaderboard: true,
          revealAnswers: true,
          stageTimeLimit: 10
        }
      }).returning();

      // Create game content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: "treatment_speed_run",
        content: {
          treatmentSpeedRun: {
            cases: challenge.cases
          }
        }
      });

      console.log(`✓ Added Treatment Speed Run: ${challenge.title}`);
    } catch (error) {
      console.error(`Failed to add ${challenge.title}:`, error);
    }
  }

  console.log("✓ Successfully added all competitions!");
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMoreCompetitions()
    .then(() => {
      console.log("Competition addition completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error adding competitions:", error);
      process.exit(1);
    });
}