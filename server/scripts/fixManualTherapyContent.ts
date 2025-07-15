import { db } from "../db";
import { competitions, gameContent } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Fix manual therapy content - create unique content for each body part
 */
async function fixManualTherapyContent() {
  console.log("Starting manual therapy content fix...");
  
  // Pre-defined content for each body part to ensure uniqueness
  const manualTherapyContents = {
    // Competition 122: Back/Spine
    back: {
      challenges: [{
        id: "mt_back_001",
        scenario: "45-year-old construction worker presents with chronic lower back pain following a lifting injury 6 months ago. Reports morning stiffness lasting 2+ hours, pain rating 7/10 with prolonged sitting. Examination reveals limited lumbar flexion (30°), positive straight leg raise at 40°, and visible protective muscle guarding.",
        challenge: "Select the most appropriate manual therapy approach for this chronic lumbar spine presentation",
        rationale: "Chronic back pain with movement restrictions requires graded mobilization to restore function while respecting tissue sensitivity. Combined approach addresses both articular and soft tissue components.",
        timeLimit: 180,
        difficulty: "advanced",
        presentation: {
          imaging: "MRI shows mild disc degeneration L4-5, no nerve compression",
          redFlags: "None identified",
          symptoms: "Central lower back pain (7/10), morning stiffness >2 hours, radiating pain to buttocks",
          examination: "Limited lumbar flexion 30°, positive SLR 40°, protective muscle guarding, loss of lumbar lordosis"
        },
        correctApproach: "Gentle posterior-anterior (PA) mobilization L4-5 with soft tissue techniques to paravertebral muscles",
        progressionPlan: "Week 1-2: Grade I-II mobilization + muscle energy techniques, Week 3-4: Progress to Grade III mobilization, Week 5-6: Add rotational mobilization and strengthening",
        techniqueOptions: [
          "High velocity low amplitude (HVLA) manipulation to L4-5",
          "Gentle posterior-anterior (PA) mobilization L4-5 with soft tissue techniques to paravertebral muscles",
          "Aggressive deep friction massage to lumbar erector spinae",
          "McKenzie extension exercises with joint mobilization"
        ],
        contraindications: [
          "HVLA manipulation may exacerbate symptoms in acute/subacute presentations",
          "Aggressive techniques contraindicated with protective muscle guarding"
        ]
      }]
    },
    
    // Competition 123: Shoulder
    shoulder: {
      challenges: [{
        id: "mt_shoulder_001",
        scenario: "52-year-old office worker presents with progressive shoulder stiffness over 8 months. Reports severe pain (8/10) with overhead activities and night pain disrupting sleep. Examination reveals active shoulder flexion 90°, external rotation 20°, positive apprehension test, and capsular pattern of restriction.",
        challenge: "Select the most appropriate manual therapy approach for this shoulder complex presentation",
        rationale: "Capsular pattern suggests adhesive capsulitis. Gentle mobilization respects inflamed tissues while promoting capsular extensibility. Heat and soft tissue work prepare tissues for mobilization.",
        timeLimit: 180,
        difficulty: "advanced",
        presentation: {
          imaging: "Ultrasound shows thickened joint capsule, no rotator cuff tears",
          redFlags: "None identified",
          symptoms: "Progressive shoulder stiffness (8/10), night pain, inability to reach overhead",
          examination: "Active flexion 90°, external rotation 20°, capsular pattern, positive apprehension test"
        },
        correctApproach: "Gentle glenohumeral mobilization (Grade I-II) with heat therapy and capsular stretching",
        progressionPlan: "Week 1-3: Grade I-II mobilization + heat, Week 4-6: Progress to Grade III mobilization, Week 7-9: Add end-range mobilization and strengthening",
        techniqueOptions: [
          "Aggressive manipulation under anesthesia",
          "Gentle glenohumeral mobilization (Grade I-II) with heat therapy and capsular stretching",
          "High velocity thrust manipulation to glenohumeral joint",
          "Immediate aggressive stretching to restore range of motion"
        ],
        contraindications: [
          "Aggressive techniques contraindicated in inflammatory phase",
          "HVLA manipulation inappropriate for capsular restrictions"
        ]
      }]
    },
    
    // Competition 124: Neck (keep existing as it's correct)
    neck: {
      challenges: [{
        id: "mt_neck_001",
        scenario: "62-year-old female office worker presents with chronic neck pain and headaches. History of whiplash injury 3 years ago. Reports increased symptoms with prolonged desk work and overhead activities. Examination reveals limited cervical rotation (40° bilaterally), positive upper limb neurodynamic test 1, and forward head posture.",
        challenge: "Select the most appropriate manual therapy approach for this chronic neck pain presentation",
        rationale: "Given chronic nature and forward head posture, gentle mobilization respects tissue sensitivity while addressing movement restrictions. Soft tissue techniques address muscular tension patterns.",
        timeLimit: 180,
        difficulty: "advanced",
        presentation: {
          imaging: "X-ray shows loss of cervical lordosis, no fractures",
          redFlags: "None identified",
          symptoms: "Unilateral neck pain (6/10), occipital headaches 3-4x per week, occasional arm tingling",
          examination: "Limited cervical rotation and extension, positive Spurling's test, forward head posture 4cm"
        },
        correctApproach: "Gentle mobilization (Grade I-II) to upper cervical segments with soft tissue techniques",
        progressionPlan: "Week 1-2: Gentle mobilization + education, Week 3-4: Progress to Grade III-IV mobilization, Week 5-6: Integrate strengthening exercises",
        techniqueOptions: [
          "High velocity low amplitude (HVLA) manipulation to mid-cervical spine",
          "Gentle mobilization (Grade I-II) to upper cervical segments with soft tissue techniques",
          "Aggressive deep tissue massage to cervical musculature",
          "Mulligan's mobilization with movement (MWM) for cervical rotation"
        ],
        contraindications: [
          "HVLA manipulation may exacerbate symptoms in chronic pain states",
          "Aggressive techniques contraindicated in sensitized tissues"
        ]
      }]
    },
    
    // Competition 125: Hip/Lower Extremity
    hip: {
      challenges: [{
        id: "mt_hip_001",
        scenario: "38-year-old marathon runner presents with deep hip pain and stiffness following increased training volume. Reports pain (6/10) with hip flexion beyond 90°, difficulty with stairs, and morning stiffness lasting 45 minutes. Examination reveals limited hip flexion (95°), positive FABER test, and restricted internal rotation (15°).",
        challenge: "Select the most appropriate manual therapy approach for this hip complex presentation",
        rationale: "Hip capsular restriction with athletic demands requires graduated mobilization approach. Soft tissue work to hip flexors and anterior capsule preparation before joint mobilization.",
        timeLimit: 180,
        difficulty: "advanced",
        presentation: {
          imaging: "X-ray shows mild hip joint space narrowing, no fractures",
          redFlags: "None identified",
          symptoms: "Deep hip pain (6/10), stiffness with prolonged sitting, difficulty with stairs",
          examination: "Limited hip flexion 95°, positive FABER test, restricted internal rotation 15°"
        },
        correctApproach: "Gentle hip joint mobilization with soft tissue techniques to hip flexors and anterior capsule",
        progressionPlan: "Week 1-2: Grade I-II mobilization + soft tissue work, Week 3-4: Progress to Grade III mobilization, Week 5-6: Add sport-specific movement patterns",
        techniqueOptions: [
          "High velocity manipulation to hip joint",
          "Gentle hip joint mobilization with soft tissue techniques to hip flexors and anterior capsule",
          "Aggressive deep tissue massage to iliotibial band",
          "Immediate return to full training with joint mobilization"
        ],
        contraindications: [
          "HVLA manipulation inappropriate for capsular restrictions",
          "Aggressive techniques may exacerbate inflammatory response"
        ]
      }]
    }
  };
  
  // Define the manual therapy competitions with their correct body parts
  const manualTherapyCompetitions = [
    { id: 122, bodyPart: "back", title: "Manual Therapy Mastery: Spine Specialists" },
    { id: 123, bodyPart: "shoulder", title: "Manual Therapy Mastery: Shoulder Complex" },
    { id: 124, bodyPart: "neck", title: "Manual Therapy Mastery: Cervical Spine" },
    { id: 125, bodyPart: "hip", title: "Manual Therapy Mastery: Lower Extremity" }
  ];
  
  for (const competition of manualTherapyCompetitions) {
    try {
      console.log(`Updating content for ${competition.title} (${competition.bodyPart})...`);
      
      // Get the appropriate content for this body part
      const content = manualTherapyContents[competition.bodyPart as keyof typeof manualTherapyContents];
      
      // Update the game content in database
      await db
        .update(gameContent)
        .set({
          content: content
        })
        .where(eq(gameContent.competitionId, competition.id));
      
      console.log(`✓ Updated content for competition ${competition.id} (${competition.bodyPart})`);
      
    } catch (error) {
      console.error(`Error updating competition ${competition.id}:`, error);
    }
  }
  
  console.log("Manual therapy content fix completed!");
}

// Run the fix
fixManualTherapyContent().catch(console.error);