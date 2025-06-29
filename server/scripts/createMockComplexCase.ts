import { db } from "../db";
import { complexCases, caseStages, stageQuestions } from "@shared/schema";

export async function createMockComplexCase() {
  try {
    // Check if complex case already exists
    const existingCases = await db.select().from(complexCases).limit(1);
    if (existingCases.length > 0) {
      console.log("Mock complex case already exists");
      return existingCases[0];
    }

    // Create the main complex case
    const [complexCase] = await db.insert(complexCases).values({
      userId: 1, // Admin user
      title: "Construction Worker with Lower Back Pain",
      patientDescription: "45-year-old male construction worker presenting with acute onset lower back pain",
      occupationalHistory: "Heavy lifting and manual labor for 20 years",
      socialHistory: "Non-smoker, moderate alcohol consumption, lives with family",
      medicalHistory: "No significant past medical history, no previous back injuries",
      currentMedications: "None",
      mechanismOfInjury: "Lifting 50lb bag of cement with twisting motion",
      bodyPart: "back",
      complexity: "intermediate",
      estimatedTime: 45,
      initialPresentation: {
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
      },
      detailedHistory: {
        onsetDetails: "Sharp pain occurred immediately during lifting, accompanied by muscle spasm",
        progressionPattern: "Pain has remained constant, worse in morning, improves with movement",
        aggravatingFactors: ["Bending forward", "Prolonged sitting", "Coughing/sneezing"],
        easingFactors: ["Walking", "Heat application", "Anti-inflammatory medication"],
        previousTreatments: ["Rest", "Over-the-counter NSAIDs", "Heat packs"],
        redFlagScreening: ["No bowel/bladder dysfunction", "No progressive weakness", "No fever"]
      },
      physicalFindings: {
        observation: "Antalgic gait, holding right side, reduced lumbar lordosis",
        palpation: "Muscle spasm in right paraspinal muscles L3-L5",
        rangeOfMotion: "Flexion 30° (limited by pain), extension normal, side flexion limited right",
        strength: "Lower extremity strength 5/5 throughout, except slight weakness in right plantar flexion",
        neurological: "Positive straight leg raise at 45° on right, diminished right Achilles reflex"
      },
      diagnosticFindings: {
        imagingResults: "MRI shows L4-L5 disc protrusion with mild nerve root compression",
        laboratoryResults: "Not applicable",
        specialTests: "Positive SLR, positive slump test, negative prone instability test"
      },
      expertDiagnosis: {
        primaryDiagnosis: "L4-L5 disc herniation with S1 radiculopathy",
        differentialDiagnoses: ["Lumbar strain", "Facet joint dysfunction", "Piriformis syndrome"],
        prognosticFactors: ["Young age", "Acute onset", "Good motivation", "No comorbidities"]
      },
      treatmentPlan: {
        acutePhase: ["Pain management", "Activity modification", "Gentle mobilization"],
        rehabilitationPhase: ["Progressive strengthening", "Movement re-education", "Return to work program"],
        maintenancePhase: ["Injury prevention education", "Ergonomic training", "Fitness maintenance"]
      },
      researchEvidence: [
        "Disc herniation management guidelines (NASS 2021)",
        "Exercise therapy for chronic low back pain (Cochrane 2019)",
        "Work-related back injury prevention strategies"
      ]
    }).returning();

    console.log("Created complex case:", complexCase.id);

    // Create stages
    const stageData = [
      {
        complexCaseId: complexCase.id,
        stageNumber: 1,
        title: "Initial Assessment & History",
        description: "Gather comprehensive patient history and perform initial assessment",
        providedInformation: {
          patientResponse: "Patient reports lifting 50lb bag of cement when sharp pain occurred in lower back",
          additionalHistory: "No previous back injuries. Generally healthy. Works 10-hour days in construction",
          observationFindings: "Patient appears uncomfortable, favoring right side when walking"
        },
        timeAllocation: 15
      },
      {
        complexCaseId: complexCase.id,
        stageNumber: 2,
        title: "Physical Examination",
        description: "Conduct systematic physical examination and special tests",
        providedInformation: {
          testResults: "Positive straight leg raise at 45° on right, negative left. Decreased lumbar flexion ROM",
          observationFindings: "Antalgic gait pattern, muscle guarding in lumbar paraspinals"
        },
        timeAllocation: 20
      },
      {
        complexCaseId: complexCase.id,
        stageNumber: 3,
        title: "Diagnosis & Differential",
        description: "Formulate primary diagnosis and consider differential diagnoses",
        providedInformation: {
          additionalHistory: "MRI shows L4-L5 disc protrusion with nerve root compression"
        },
        timeAllocation: 10
      },
      {
        complexCaseId: complexCase.id,
        stageNumber: 4,
        title: "Treatment Planning & Education",
        description: "Develop comprehensive treatment plan and patient education strategy",
        providedInformation: {
          patientResponse: "Patient motivated to return to work but concerned about reinjury"
        },
        timeAllocation: 15
      }
    ];

    const stages = await db.insert(caseStages).values(stageData).returning();
    console.log("Created stages:", stages.length);

    // Create questions for each stage
    const questionData = [
      // Stage 1: Initial Assessment
      {
        stageId: stages[0].id,
        questionNumber: 1,
        questionText: "What are the key elements you would include in your subjective history for this patient?",
        questionType: "essay",
        options: [],
        expectedAnswers: ["Pain onset and mechanism", "Pain characteristics", "Aggravating/easing factors", "Functional limitations", "Red flag screening"],
        scoringCriteria: "Comprehensive history taking including mechanism, pain pattern, functional impact, and safety screening",
        correctAnswer: "Pain onset and mechanism, pain characteristics (location, quality, intensity), aggravating/easing factors, functional limitations, work demands, previous episodes, current medications, red flag screening",
        rationale: "Comprehensive history is crucial for understanding mechanism of injury and identifying red flags",
        learningPoints: ["Systematic history taking", "Red flag identification", "Functional assessment"]
      },
      {
        stageId: stages[0].id,
        questionNumber: 2,
        questionText: "List 5 red flags you would screen for in this patient:",
        questionType: "list",
        options: [],
        expectedAnswers: ["Cauda equina symptoms", "Progressive neurological deficit", "Fever", "Severe night pain", "Bowel/bladder dysfunction"],
        scoringCriteria: "Identification of serious pathology indicators",
        correctAnswer: "Cauda equina symptoms, progressive neurological deficit, fever, severe night pain, bowel/bladder dysfunction",
        rationale: "Red flag screening is essential to rule out serious pathology requiring medical referral",
        learningPoints: ["Red flag recognition", "Medical screening", "Safety assessment"]
      },
      
      // Stage 2: Physical Examination  
      {
        stageId: stages[1].id,
        questionNumber: 1,
        questionText: "What objective tests would you prioritize for this patient?",
        questionType: "essay",
        options: [],
        expectedAnswers: ["ROM assessment", "Neurological testing", "Palpation", "Functional movement assessment"],
        scoringCriteria: "Systematic and relevant examination approach",
        correctAnswer: "ROM assessment (lumbar flexion/extension/side flexion), neurological testing (straight leg raise, reflexes, sensation, strength), palpation for muscle guarding/trigger points, functional movement assessment",
        rationale: "Systematic examination helps identify impairments and guide treatment decisions",
        learningPoints: ["Examination prioritization", "Neurological testing", "Movement assessment"]
      },
      
      // Stage 3: Diagnosis
      {
        stageId: stages[2].id,
        questionNumber: 1,
        questionText: "Based on the examination findings, what is your primary working diagnosis?",
        questionType: "short_answer",
        options: [],
        expectedAnswers: ["L4-L5 disc herniation", "Disc herniation with nerve root compression", "Lumbar disc pathology"],
        scoringCriteria: "Accurate primary diagnosis based on clinical findings",
        correctAnswer: "L4-L5 disc herniation with nerve root compression",
        rationale: "Accurate diagnosis guides appropriate treatment selection",
        learningPoints: ["Clinical reasoning", "Diagnostic accuracy", "Pattern recognition"]
      },
      {
        stageId: stages[2].id,
        questionNumber: 2,
        questionText: "List 3 differential diagnoses to consider:",
        questionType: "list",
        options: [],
        expectedAnswers: ["Lumbar strain", "Piriformis syndrome", "Facet joint dysfunction"],
        scoringCriteria: "Comprehensive differential diagnosis consideration",
        correctAnswer: "Lumbar strain, piriformis syndrome, facet joint dysfunction",
        rationale: "Considering alternatives ensures comprehensive clinical reasoning",
        learningPoints: ["Differential diagnosis", "Clinical reasoning", "Alternative considerations"]
      },
      
      // Stage 4: Treatment Planning
      {
        stageId: stages[3].id,
        questionNumber: 1,
        questionText: "Outline your initial treatment approach for the first 2 weeks:",
        questionType: "essay",
        options: [],
        expectedAnswers: ["Activity modification", "Manual therapy", "Exercise therapy", "Patient education"],
        scoringCriteria: "Evidence-based early intervention approach",
        correctAnswer: "Activity modification, manual therapy for pain relief, gentle mobility exercises, patient education on movement mechanics, graduated return to activity, ergonomic workplace assessment",
        rationale: "Early intervention focuses on pain reduction and preventing chronicity",
        learningPoints: ["Treatment planning", "Evidence-based practice", "Patient education"]
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