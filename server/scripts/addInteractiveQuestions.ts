import { db } from '../db';
import { complexCases, caseStages, stageQuestions, InsertCaseStage, InsertStageQuestion } from '@shared/schema';

/**
 * Adds interactive stages and questions to existing complex cases
 */
export async function addInteractiveQuestionsToComplexCases() {
  try {
    console.log('Starting to add interactive questions to complex cases...');
    
    // Get all existing complex cases
    const existingCases = await db.select().from(complexCases);
    console.log(`Found ${existingCases.length} existing complex cases`);

    for (const complexCase of existingCases) {
      console.log(`Processing case: ${complexCase.title}`);
      
      // Create stages for this case
      const stages = await createStagesForCase(complexCase);
      
      // Insert stages
      const insertedStages = await db.insert(caseStages).values(stages).returning();
      console.log(`Created ${insertedStages.length} stages for case ${complexCase.id}`);
      
      // Create questions for each stage
      for (const stage of insertedStages) {
        const questions = createQuestionsForStage(stage, complexCase);
        await db.insert(stageQuestions).values(questions);
        console.log(`Created ${questions.length} questions for stage ${stage.id}`);
      }
    }
    
    console.log('Successfully added interactive questions to all complex cases!');
  } catch (error) {
    console.error('Error adding interactive questions:', error);
    throw error;
  }
}

function createStagesForCase(complexCase: any): InsertCaseStage[] {
  const stages: InsertCaseStage[] = [
    {
      complexCaseId: complexCase.id,
      stageNumber: 1,
      title: "Initial Assessment & History Taking",
      description: "Gather comprehensive patient history and perform initial clinical assessment",
      providedInformation: {
        patientResponse: complexCase.initialPresentation?.chiefComplaint || "Patient presents with primary complaint",
        additionalHistory: complexCase.medicalHistory,
        observationFindings: "Initial observation and first impressions documented"
      },
      timeAllocation: Math.ceil(complexCase.estimatedTime * 0.25) // 25% of total time
    },
    {
      complexCaseId: complexCase.id,
      stageNumber: 2,
      title: "Physical Examination & Special Tests",
      description: "Conduct systematic physical examination and appropriate special tests",
      providedInformation: {
        testResults: complexCase.physicalFindings?.observation || "Physical examination findings documented",
        observationFindings: complexCase.physicalFindings?.palpation || "Palpation and movement testing completed"
      },
      timeAllocation: Math.ceil(complexCase.estimatedTime * 0.3) // 30% of total time
    },
    {
      complexCaseId: complexCase.id,
      stageNumber: 3,
      title: "Differential Diagnosis & Clinical Reasoning",
      description: "Formulate differential diagnoses and demonstrate clinical reasoning",
      providedInformation: {
        additionalHistory: complexCase.detailedHistory?.progressionPattern || "Additional clinical information provided",
        testResults: complexCase.physicalFindings?.rangeOfMotion || "Range of motion and strength testing results"
      },
      timeAllocation: Math.ceil(complexCase.estimatedTime * 0.25) // 25% of total time
    },
    {
      complexCaseId: complexCase.id,
      stageNumber: 4,
      title: "Treatment Planning & Patient Education",
      description: "Develop comprehensive treatment plan and patient education strategy",
      providedInformation: {
        patientResponse: complexCase.initialPresentation?.patientGoals?.join(', ') || "Patient goals and expectations discussed",
        observationFindings: "Patient readiness for treatment and education assessed"
      },
      timeAllocation: Math.ceil(complexCase.estimatedTime * 0.2) // 20% of total time
    }
  ];
  
  return stages;
}

function createQuestionsForStage(stage: any, complexCase: any): InsertStageQuestion[] {
  const bodyPart = complexCase.bodyPart.toLowerCase();
  
  switch (stage.stageNumber) {
    case 1: // Initial Assessment
      return [
        {
          stageId: stage.id,
          questionNumber: 1,
          questionText: "Based on the patient's presentation, what are your top 3 differential diagnoses?",
          questionType: "essay",
          expectedAnswers: [`${bodyPart} pathology`, "musculoskeletal disorder", "inflammatory condition"],
          scoringCriteria: {
            maxPoints: 20,
            partialCredit: true,
            keywordPoints: [
              { keyword: bodyPart, points: 5 },
              { keyword: "differential", points: 3 },
              { keyword: "diagnosis", points: 4 }
            ]
          },
          correctAnswer: `Primary considerations should include common ${bodyPart} pathologies based on mechanism, age, and presentation patterns.`,
          rationale: `Differential diagnosis requires systematic consideration of anatomy, pathophysiology, and clinical presentation patterns specific to ${bodyPart} injuries.`,
          learningPoints: [
            "Consider mechanism of injury",
            "Age-related pathology patterns",
            "Anatomical structures involved"
          ]
        },
        {
          stageId: stage.id,
          questionNumber: 2,
          questionText: "What additional history questions would help narrow your differential diagnosis?",
          questionType: "list",
          expectedAnswers: ["onset mechanism", "pain characteristics", "functional limitations", "previous treatments"],
          scoringCriteria: {
            maxPoints: 15,
            partialCredit: true,
            keywordPoints: [
              { keyword: "onset", points: 4 },
              { keyword: "pain", points: 3 },
              { keyword: "function", points: 4 }
            ]
          },
          correctAnswer: "Focus on pain patterns, functional limitations, aggravating/easing factors, and response to previous treatments.",
          rationale: "Comprehensive history taking guides examination focus and helps differentiate between similar presentations.",
          learningPoints: [
            "SOCRATES pain assessment",
            "Functional impact evaluation",
            "Treatment response history"
          ]
        }
      ];
      
    case 2: // Physical Examination
      return [
        {
          stageId: stage.id,
          questionNumber: 1,
          questionText: `What are the most important physical examination tests for suspected ${bodyPart} pathology in this case?`,
          questionType: "list",
          expectedAnswers: ["range of motion", "strength testing", "special tests", "palpation"],
          scoringCriteria: {
            maxPoints: 18,
            partialCredit: true,
            keywordPoints: [
              { keyword: "range", points: 4 },
              { keyword: "strength", points: 4 },
              { keyword: "special", points: 5 }
            ]
          },
          correctAnswer: `Systematic examination should include observation, palpation, range of motion, strength testing, and ${bodyPart}-specific special tests.`,
          rationale: `Physical examination must be systematic and include both general musculoskeletal assessment and ${bodyPart}-specific tests with proven diagnostic value.`,
          learningPoints: [
            "Systematic examination approach",
            "Evidence-based special tests",
            "Comparative assessment"
          ]
        },
        {
          stageId: stage.id,
          questionNumber: 2,
          questionText: "Based on the examination findings, what is your provisional diagnosis?",
          questionType: "short_answer",
          expectedAnswers: [`${bodyPart} dysfunction`, "musculoskeletal injury"],
          scoringCriteria: {
            maxPoints: 12,
            partialCredit: true,
            keywordPoints: [
              { keyword: "provisional", points: 3 },
              { keyword: bodyPart, points: 4 }
            ]
          },
          correctAnswer: `Provisional diagnosis should be based on examination findings consistent with ${bodyPart} pathology.`,
          rationale: "Provisional diagnosis integrates history and examination findings to guide further assessment and treatment planning.",
          learningPoints: [
            "Evidence-based diagnosis",
            "Clinical reasoning process",
            "Hypothesis testing"
          ]
        }
      ];
      
    case 3: // Differential Diagnosis
      return [
        {
          stageId: stage.id,
          questionNumber: 1,
          questionText: "What are the key features that distinguish your primary diagnosis from similar conditions?",
          questionType: "essay",
          expectedAnswers: ["clinical presentation", "examination findings", "mechanism"],
          scoringCriteria: {
            maxPoints: 22,
            partialCredit: true,
            keywordPoints: [
              { keyword: "distinguish", points: 5 },
              { keyword: "features", points: 4 },
              { keyword: "diagnosis", points: 5 }
            ]
          },
          correctAnswer: "Key distinguishing features include specific pain patterns, examination findings, and functional limitations characteristic of the primary diagnosis.",
          rationale: "Differential diagnosis requires understanding of distinguishing features between similar conditions affecting the same anatomical region.",
          learningPoints: [
            "Pathognomonic signs",
            "Pattern recognition",
            "Clinical decision making"
          ]
        },
        {
          stageId: stage.id,
          questionNumber: 2,
          questionText: "Are there any red flags that require immediate medical referral?",
          questionType: "multiple_choice",
          options: ["No red flags present", "Minor concerns", "Immediate referral needed", "Further investigation required"],
          expectedAnswers: ["appropriate assessment"],
          scoringCriteria: {
            maxPoints: 10,
            partialCredit: false,
            keywordPoints: [
              { keyword: "red flags", points: 5 },
              { keyword: "referral", points: 3 }
            ]
          },
          correctAnswer: "Appropriate identification and management of red flags is essential for patient safety.",
          rationale: "Red flag screening is a critical safety component that determines the appropriateness of physiotherapy management.",
          learningPoints: [
            "Red flag identification",
            "Referral guidelines",
            "Patient safety priorities"
          ]
        }
      ];
      
    case 4: // Treatment Planning
      return [
        {
          stageId: stage.id,
          questionNumber: 1,
          questionText: "What are your primary treatment goals for this patient?",
          questionType: "list",
          expectedAnswers: ["pain reduction", "function improvement", "return to activity"],
          scoringCriteria: {
            maxPoints: 16,
            partialCredit: true,
            keywordPoints: [
              { keyword: "pain", points: 4 },
              { keyword: "function", points: 5 },
              { keyword: "goals", points: 3 }
            ]
          },
          correctAnswer: "Treatment goals should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) and patient-centered.",
          rationale: "Effective treatment planning requires clear, measurable goals that align with patient priorities and evidence-based outcomes.",
          learningPoints: [
            "SMART goal setting",
            "Patient-centered care",
            "Outcome measurement"
          ]
        },
        {
          stageId: stage.id,
          questionNumber: 2,
          questionText: "What treatment interventions would you include in your management plan?",
          questionType: "essay",
          expectedAnswers: ["exercise therapy", "manual therapy", "education", "activity modification"],
          scoringCriteria: {
            maxPoints: 20,
            partialCredit: true,
            keywordPoints: [
              { keyword: "exercise", points: 6 },
              { keyword: "education", points: 4 },
              { keyword: "evidence", points: 5 }
            ]
          },
          correctAnswer: "Treatment plan should include evidence-based interventions such as therapeutic exercise, manual therapy, patient education, and activity modification as appropriate.",
          rationale: "Effective physiotherapy management combines multiple evidence-based interventions tailored to individual patient needs and preferences.",
          learningPoints: [
            "Evidence-based practice",
            "Multimodal treatment approach",
            "Patient preferences integration"
          ]
        },
        {
          stageId: stage.id,
          questionNumber: 3,
          questionText: "How would you educate the patient about their condition and self-management?",
          questionType: "essay",
          expectedAnswers: ["condition explanation", "self-management strategies", "activity guidelines"],
          scoringCriteria: {
            maxPoints: 14,
            partialCredit: true,
            keywordPoints: [
              { keyword: "education", points: 4 },
              { keyword: "self-management", points: 5 },
              { keyword: "understanding", points: 3 }
            ]
          },
          correctAnswer: "Patient education should include clear explanation of the condition, self-management strategies, activity guidelines, and when to seek further help.",
          rationale: "Effective patient education empowers self-management and improves long-term outcomes by enhancing patient understanding and engagement.",
          learningPoints: [
            "Health literacy considerations",
            "Self-efficacy enhancement",
            "Collaborative care approach"
          ]
        }
      ];
      
    default:
      return [];
  }
}

// Self-executing function when file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addInteractiveQuestionsToComplexCases()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}