import { db } from "../db";
import { complexCases, caseStages, stageQuestions } from "@shared/schema";

export async function createMockComplexCase() {
  try {
    // Check if complex case already exists
    const existingCase = await db.select().from(complexCases).where({ id: 1 }).limit(1);
    if (existingCase.length > 0) {
      console.log("Mock complex case already exists");
      return;
    }

    // Create the main complex case
    const [complexCase] = await db.insert(complexCases).values({
      title: "Construction Worker with Lower Back Pain",
      patientDescription: "45-year-old construction worker presenting with acute lower back pain after lifting heavy materials",
      bodyPart: "back",
      difficulty: "intermediate",
      competitionType: "complete_clinician",
      estimatedTime: 45,
      userId: 1, // Admin user
      patientData: {
        chiefComplaint: "Severe lower back pain following workplace injury",
        painScale: 8,
        functionalLimitations: [
          "Unable to bend forward",
          "Difficulty walking long distances",
          "Pain with sitting > 30 minutes",
          "Sleep disruption due to pain"
        ],
        patientGoals: [
          "Return to work within 6 weeks",
          "Reduce pain to manageable levels",
          "Restore normal movement patterns",
          "Prevent future injuries"
        ]
      }
    }).returning();

    console.log("Created complex case:", complexCase.id);

    // Create stages
    const stageData = [
      {
        title: "Initial Assessment & History",
        description: "Gather comprehensive patient history and perform initial assessment",
        stageType: "assessment",
        orderIndex: 1,
        timeLimit: 15,
        complexCaseId: complexCase.id,
        context: {
          patientResponse: "Patient reports lifting 50lb bag of cement when sharp pain occurred in lower back",
          additionalHistory: "No previous back injuries. Generally healthy. Works 10-hour days in construction",
          observationFindings: "Patient appears uncomfortable, favoring right side when walking"
        }
      },
      {
        title: "Physical Examination",
        description: "Conduct systematic physical examination and special tests",
        stageType: "examination", 
        orderIndex: 2,
        timeLimit: 20,
        complexCaseId: complexCase.id,
        context: {
          testResults: "Positive straight leg raise at 45° on right, negative left. Decreased lumbar flexion ROM",
          observationFindings: "Antalgic gait pattern, muscle guarding in lumbar paraspinals"
        }
      },
      {
        title: "Diagnosis & Differential",
        description: "Formulate primary diagnosis and consider differential diagnoses",
        stageType: "diagnosis",
        orderIndex: 3,
        timeLimit: 10,
        complexCaseId: complexCase.id,
        context: {
          additionalHistory: "MRI shows L4-L5 disc protrusion with nerve root compression"
        }
      },
      {
        title: "Treatment Planning & Education",
        description: "Develop comprehensive treatment plan and patient education strategy",
        stageType: "treatment",
        orderIndex: 4,
        timeLimit: 15,
        complexCaseId: complexCase.id,
        context: {
          patientResponse: "Patient motivated to return to work but concerned about reinjury"
        }
      }
    ];

    const stages = await db.insert(caseStages).values(stageData).returning();
    console.log("Created stages:", stages.length);

    // Create questions for each stage
    const questionData = [
      // Stage 1: Initial Assessment
      {
        questionText: "What are the key elements you would include in your subjective history for this patient?",
        questionType: "essay",
        pointValue: 25,
        rationale: "Comprehensive history is crucial for understanding mechanism of injury and identifying red flags",
        correctAnswer: "Pain onset and mechanism, pain characteristics (location, quality, intensity), aggravating/easing factors, functional limitations, work demands, previous episodes, current medications, red flag screening",
        stageId: stages[0].id,
        orderIndex: 1,
        options: []
      },
      {
        questionText: "List 5 red flags you would screen for in this patient:",
        questionType: "list",
        pointValue: 15,
        rationale: "Red flag screening is essential to rule out serious pathology requiring medical referral",
        correctAnswer: "Cauda equina symptoms, progressive neurological deficit, fever, severe night pain, bowel/bladder dysfunction",
        stageId: stages[0].id,
        orderIndex: 2,
        options: []
      },
      
      // Stage 2: Physical Examination  
      {
        questionText: "What objective tests would you prioritize for this patient?",
        questionType: "essay",
        pointValue: 30,
        rationale: "Systematic examination helps identify impairments and guide treatment decisions",
        correctAnswer: "ROM assessment (lumbar flexion/extension/side flexion), neurological testing (straight leg raise, reflexes, sensation, strength), palpation for muscle guarding/trigger points, functional movement assessment",
        stageId: stages[1].id,
        orderIndex: 1,
        options: []
      },
      
      // Stage 3: Diagnosis
      {
        questionText: "Based on the examination findings, what is your primary working diagnosis?",
        questionType: "short_answer",
        pointValue: 20,
        rationale: "Accurate diagnosis guides appropriate treatment selection",
        correctAnswer: "L4-L5 disc herniation with nerve root compression",
        stageId: stages[2].id,
        orderIndex: 1,
        options: []
      },
      {
        questionText: "List 3 differential diagnoses to consider:",
        questionType: "list", 
        pointValue: 15,
        rationale: "Considering alternatives ensures comprehensive clinical reasoning",
        correctAnswer: "Lumbar strain, piriformis syndrome, facet joint dysfunction",
        stageId: stages[2].id,
        orderIndex: 2,
        options: []
      },
      
      // Stage 4: Treatment Planning
      {
        questionText: "Outline your initial treatment approach for the first 2 weeks:",
        questionType: "essay",
        pointValue: 35,
        rationale: "Early intervention focuses on pain reduction and preventing chronicity",
        correctAnswer: "Activity modification, manual therapy for pain relief, gentle mobility exercises, patient education on movement mechanics, graduated return to activity, ergonomic workplace assessment",
        stageId: stages[3].id,
        orderIndex: 1,
        options: []
      }
    ];

    await db.insert(stageQuestions).values(questionData);
    console.log("Created questions:", questionData.length);

    console.log("Mock complex case creation completed successfully!");
    return complexCase;

  } catch (error) {
    console.error("Error creating mock complex case:", error);
    throw error;
  }
}