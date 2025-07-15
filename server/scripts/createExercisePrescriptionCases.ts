import { db } from "../db";
import { gameContent } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Creates unique exercise prescription cases for each of the 4 competitions
 */
export async function createExercisePrescriptionCases() {
  console.log("Creating unique Exercise Prescription Expert cases...");

  // Competition 126: Athletic Recovery (Knee)
  const athleticRecoveryCase = {
    challenges: [{
      id: "ep_knee_001",
      challenge: "Design a comprehensive 12-week return-to-sport program for ACL reconstruction recovery",
      rationale: "Evidence supports progressive loading with neuromuscular control for ACL recovery. Focus on strength, proprioception, and sport-specific movement patterns.",
      timeLimit: 300,
      difficulty: "advanced",
      optimalProgram: "Progressive loading with neuromuscular control and sport-specific training",
      patientProfile: {
        age: 22,
        gender: "female",
        history: "16 weeks post ACL reconstruction (hamstring graft), cleared for running but experiencing knee instability during cutting movements",
        condition: "Post-ACL reconstruction with return-to-sport goals",
        occupation: "university soccer player",
        currentFunction: "Can jog straight line, difficulty with pivoting, lacks confidence in knee stability"
      },
      programOptions: [
        "Immediate return to full sport training to regain fitness quickly",
        "Progressive loading with neuromuscular control and sport-specific training",
        "Strength-focused program with minimal sport-specific elements",
        "Conservative approach with delayed return to cutting activities"
      ],
      outcomesMeasures: [
        "Knee injury and Osteoarthritis Outcome Score (KOOS)",
        "ACL-Return to Sport after Injury (ACL-RSI)",
        "Single-leg hop test battery",
        "Knee valgus during landing assessment"
      ],
      weeksProgression: {
        "weeks1-4": "Straight-line running progression, basic agility ladder, single-leg strength (3x15 at 60% 1RM)",
        "weeks5-8": "Introduce cutting at 50% speed, plyometric training, sport-specific movement patterns",
        "weeks9-12": "Full-speed cutting, reactive agility, return-to-sport testing, psychological readiness assessment"
      },
      assessmentFindings: {
        movement: "Knee valgus during single-leg squat, hesitant cutting mechanics, altered landing patterns",
        strength: "Quadriceps 85% of uninjured side, hamstring 90%, hip abductors 4/5",
        endurance: "Can run 5km at moderate pace, fatigue affects movement quality",
        psychosocial: "Moderate fear of re-injury, concerns about competitive performance"
      }
    }]
  };

  // Competition 127: Chronic Pain Management (Back)
  const chronicPainCase = {
    challenges: [{
      id: "ep_back_001",
      challenge: "Design a comprehensive 16-week exercise program for chronic non-specific low back pain",
      rationale: "Evidence supports graded exposure therapy and movement confidence building for chronic pain. Addresses pain sensitization and movement avoidance patterns.",
      timeLimit: 300,
      difficulty: "advanced",
      optimalProgram: "Graded exposure with movement confidence building and pain education",
      patientProfile: {
        age: 38,
        gender: "female",
        history: "2 years of chronic low back pain, multiple failed treatments, high disability and pain-related fear",
        condition: "Chronic non-specific low back pain with central sensitization",
        occupation: "office manager",
        currentFunction: "Avoids bending, difficulty sitting >30 minutes, sleep disturbance, limited social activities"
      },
      programOptions: [
        "High-intensity strength training to build back muscle capacity",
        "Graded exposure with movement confidence building and pain education",
        "Pain-contingent exercise avoiding aggravating movements",
        "Passive treatments with gentle stretching only"
      ],
      outcomesMeasures: [
        "Oswestry Disability Index (ODI)",
        "Pain Catastrophizing Scale (PCS)",
        "Tampa Scale of Kinesiophobia",
        "Patient Global Impression of Change (PGIC)"
      ],
      weeksProgression: {
        "weeks1-4": "Pain education, gentle movement exploration, basic activities of daily living",
        "weeks5-8": "Graded exposure to feared movements, progressive loading, movement confidence building",
        "weeks9-12": "Functional training, work-specific activities, social re-engagement",
        "weeks13-16": "Advanced functional training, self-management strategies, relapse prevention"
      },
      assessmentFindings: {
        movement: "Guarded movement patterns, avoidance of flexion, rigid postural control",
        strength: "Generalized deconditioning, poor motor control, muscle tension patterns",
        endurance: "Limited activity tolerance, fatigue with minimal exertion",
        psychosocial: "High catastrophizing, depression symptoms, social isolation, work-related stress"
      }
    }]
  };

  // Competition 128: Geriatric Rehabilitation (General)
  const geriatricCase = {
    challenges: [{
      id: "ep_geriatric_001",
      challenge: "Design a comprehensive 12-week fall prevention and functional mobility program",
      rationale: "Evidence supports multi-modal exercise for fall prevention in older adults. Addresses strength, balance, cognitive function, and environmental factors.",
      timeLimit: 300,
      difficulty: "advanced",
      optimalProgram: "Multi-modal exercise with fall prevention focus and functional training",
      patientProfile: {
        age: 76,
        gender: "male",
        history: "Recent fall resulting in wrist fracture, increasing frailty, fear of falling, multiple comorbidities",
        condition: "Post-fall syndrome with increased frailty and mobility concerns",
        occupation: "retired teacher",
        currentFunction: "Uses walking stick, difficulty with stairs, reduced community participation"
      },
      programOptions: [
        "High-intensity resistance training to maximize strength gains",
        "Multi-modal exercise with fall prevention focus and functional training",
        "Balance training only to specifically address fall risk",
        "Gentle seated exercises to avoid fall risk during training"
      ],
      outcomesMeasures: [
        "Berg Balance Scale",
        "Timed Up and Go (TUG)",
        "Falls Efficacy Scale - International (FES-I)",
        "Short Physical Performance Battery (SPPB)"
      ],
      weeksProgression: {
        "weeks1-4": "Seated strength exercises, standing balance training, gait re-education",
        "weeks5-8": "Progressive resistance training, dynamic balance challenges, stair negotiation",
        "weeks9-12": "Functional task training, community mobility, dual-task activities"
      },
      assessmentFindings: {
        movement: "Reduced gait speed, narrow base of support, difficulty with transitions",
        strength: "Generalized weakness, grip strength 15kg, unable to rise from chair without arms",
        endurance: "Limited to 50 meters walking, breathless with stairs",
        psychosocial: "High fear of falling, reduced confidence, social isolation, mild cognitive decline"
      }
    }]
  };

  // Competition 129: Post-Surgical Protocols (Shoulder)
  const postSurgicalCase = {
    challenges: [{
      id: "ep_shoulder_001",
      challenge: "Design a comprehensive 20-week post-surgical rehabilitation program for rotator cuff repair",
      rationale: "Evidence supports phased approach respecting tissue healing while preventing stiffness. Balance protection with progressive loading.",
      timeLimit: 300,
      difficulty: "advanced",
      optimalProgram: "Phased rehabilitation respecting tissue healing with progressive loading",
      patientProfile: {
        age: 52,
        gender: "male",
        history: "8 weeks post arthroscopic rotator cuff repair (supraspinatus), experiencing stiffness and weakness",
        condition: "Post-surgical rotator cuff repair with secondary stiffness",
        occupation: "carpenter",
        currentFunction: "Limited overhead reach, difficulty with work tasks, night pain resolved"
      },
      programOptions: [
        "Aggressive early mobilization to prevent stiffness",
        "Phased rehabilitation respecting tissue healing with progressive loading",
        "Delayed strengthening approach focusing on protection",
        "Immediate return to work activities to maintain function"
      ],
      outcomesMeasures: [
        "Shoulder Pain and Disability Index (SPADI)",
        "Constant-Murley Shoulder Score",
        "Range of motion measurements",
        "Rotator cuff strength testing"
      ],
      weeksProgression: {
        "weeks1-6": "Passive range of motion, pendulum exercises, sling weaning",
        "weeks7-12": "Active-assisted range of motion, gentle strengthening, scapular stability",
        "weeks13-16": "Progressive strengthening, functional movements, work simulation",
        "weeks17-20": "Advanced strengthening, return-to-work activities, maintenance program"
      },
      assessmentFindings: {
        movement: "Limited shoulder flexion (100°), external rotation (20°), compensatory scapular patterns",
        strength: "Rotator cuff 2/5, scapular muscles 3/5, general upper limb weakness",
        endurance: "Fatigue with sustained arm elevation, difficulty with repetitive tasks",
        psychosocial: "Concerns about work return, fear of re-injury, financial stress"
      }
    }]
  };

  // Update each competition with unique content
  try {
    await db.update(gameContent)
      .set({ content: athleticRecoveryCase })
      .where(eq(gameContent.competitionId, 126));
    
    await db.update(gameContent)
      .set({ content: chronicPainCase })
      .where(eq(gameContent.competitionId, 127));
    
    await db.update(gameContent)
      .set({ content: geriatricCase })
      .where(eq(gameContent.competitionId, 128));
    
    await db.update(gameContent)
      .set({ content: postSurgicalCase })
      .where(eq(gameContent.competitionId, 129));

    console.log("✓ Successfully created unique Exercise Prescription Expert cases for all 4 competitions");
  } catch (error) {
    console.error("Error creating Exercise Prescription Expert cases:", error);
  }
}

// Run the script if called directly
createExercisePrescriptionCases()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });