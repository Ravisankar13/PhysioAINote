import { pool } from '../db';

/**
 * Adds interactive stages and questions to existing complex cases
 */
export async function addInteractiveQuestionsToComplexCases() {
  try {
    console.log('Starting to add interactive questions to complex cases...');
    
    // Get all existing complex cases
    const complexCases = await db.query('SELECT * FROM complex_cases ORDER BY id');
    console.log(`Found ${complexCases.rows.length} existing complex cases`);

    // Check if stages already exist for these cases
    const existingStages = await db.query('SELECT complex_case_id FROM case_stages GROUP BY complex_case_id');
    const casesWithStages = new Set(existingStages.rows.map(row => row.complex_case_id));

    for (const complexCase of complexCases.rows) {
      if (casesWithStages.has(complexCase.id)) {
        console.log(`Skipping case ${complexCase.id} - already has stages`);
        continue;
      }

      console.log(`Processing case: ${complexCase.title}`);
      
      // Create stages for this case
      const stages = createStagesForCase(complexCase);
      
      // Insert stages and get their IDs
      for (const stage of stages) {
        const insertStageResult = await db.query(`
          INSERT INTO case_stages (complex_case_id, stage_number, title, description, stage_type, information_revealed, expected_time_minutes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          stage.complex_case_id,
          stage.stage_number,
          stage.title,
          stage.description,
          stage.stage_type,
          JSON.stringify(stage.information_revealed),
          stage.expected_time_minutes
        ]);
        
        const stageId = insertStageResult.rows[0].id;
        console.log(`Created stage ${stageId} for case ${complexCase.id}`);
        
        // Create questions for this stage
        const questions = createQuestionsForStage(stageId, stage.stage_number, complexCase);
        
        for (const question of questions) {
          await db.query(`
            INSERT INTO stage_questions (stage_id, question_number, question_text, question_type, correct_answer, answer_explanation, scoring_criteria, points_available)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            question.stage_id,
            question.question_number,
            question.question_text,
            question.question_type,
            question.correct_answer,
            question.answer_explanation,
            JSON.stringify(question.scoring_criteria),
            question.points_available
          ]);
        }
        console.log(`Created ${questions.length} questions for stage ${stageId}`);
      }
    }
    
    console.log('Successfully added interactive questions to all complex cases!');
  } catch (error) {
    console.error('Error adding interactive questions:', error);
    throw error;
  }
}

function createStagesForCase(complexCase: any): any[] {
  const stages: any[] = [
    {
      complex_case_id: complexCase.id,
      stage_number: 1,
      title: "Initial Assessment & History Taking",
      description: "Gather comprehensive patient history and perform initial clinical assessment",
      stage_type: "assessment",
      information_revealed: {
        patientResponse: complexCase.patient_description || "Patient presents with primary complaint",
        additionalHistory: complexCase.medical_history || "Medical history to be documented",
        observationFindings: "Initial observation and first impressions documented"
      },
      expected_time_minutes: Math.ceil((complexCase.estimated_time || 30) * 0.25) // 25% of total time
    },
    {
      complex_case_id: complexCase.id,
      stage_number: 2,
      title: "Physical Examination & Special Tests",
      description: "Conduct systematic physical examination and appropriate special tests",
      stage_type: "examination", 
      information_revealed: {
        testResults: "Physical examination findings documented",
        observationFindings: "Palpation and movement testing completed",
        additionalHistory: "Additional examination findings provided"
      },
      expected_time_minutes: Math.ceil((complexCase.estimated_time || 30) * 0.3) // 30% of total time
    },
    {
      complex_case_id: complexCase.id,
      stage_number: 3,
      title: "Differential Diagnosis & Clinical Reasoning",
      description: "Formulate differential diagnoses and demonstrate clinical reasoning",
      stage_type: "diagnosis",
      information_revealed: {
        additionalHistory: "Additional clinical information provided",
        testResults: "Range of motion and strength testing results",
        observationFindings: "Further clinical findings revealed"
      },
      expected_time_minutes: Math.ceil((complexCase.estimated_time || 30) * 0.25) // 25% of total time
    },
    {
      complex_case_id: complexCase.id,
      stage_number: 4,
      title: "Treatment Planning & Patient Education",
      description: "Develop comprehensive treatment plan and patient education strategy",
      stage_type: "treatment",
      information_revealed: {
        patientResponse: "Patient goals and expectations discussed",
        observationFindings: "Patient readiness for treatment and education assessed",
        additionalHistory: "Treatment planning considerations"
      },
      expected_time_minutes: Math.ceil((complexCase.estimated_time || 30) * 0.2) // 20% of total time
    }
  ];
  
  return stages;
}

function createQuestionsForStage(stageId: number, stageNumber: number, complexCase: any): any[] {
  const bodyPart = (complexCase.body_part || "musculoskeletal").toLowerCase();
  
  switch (stageNumber) {
    case 1: // Initial Assessment
      return [
        {
          stage_id: stageId,
          question_number: 1,
          question_text: "Based on the patient's presentation, what are your top 3 differential diagnoses?",
          question_type: "essay",
          correct_answer: `Primary considerations should include common ${bodyPart} pathologies based on mechanism, age, and presentation patterns.`,
          answer_explanation: `Differential diagnosis requires systematic consideration of anatomy, pathophysiology, and clinical presentation patterns specific to ${bodyPart} injuries.`,
          scoring_criteria: {
            maxPoints: 20,
            partialCredit: true,
            keywordPoints: [
              { keyword: bodyPart, points: 5 },
              { keyword: "differential", points: 3 },
              { keyword: "diagnosis", points: 4 }
            ]
          },
          points_available: 20
        },
        {
          stage_id: stageId,
          question_number: 2,
          question_text: "What additional history questions would help narrow your differential diagnosis?",
          question_type: "list",
          correct_answer: "Focus on pain patterns, functional limitations, aggravating/easing factors, and response to previous treatments.",
          answer_explanation: "Comprehensive history taking guides examination focus and helps differentiate between similar presentations.",
          scoring_criteria: {
            maxPoints: 15,
            partialCredit: true,
            keywordPoints: [
              { keyword: "onset", points: 4 },
              { keyword: "pain", points: 3 },
              { keyword: "function", points: 4 }
            ]
          },
          points_available: 15
        }
      ];
      
    case 2: // Physical Examination
      return [
        {
          stage_id: stageId,
          question_number: 1,
          question_text: `What are the most important physical examination tests for suspected ${bodyPart} pathology in this case?`,
          question_type: "list",
          correct_answer: `Systematic examination should include observation, palpation, range of motion, strength testing, and ${bodyPart}-specific special tests.`,
          answer_explanation: `Physical examination must be systematic and include both general musculoskeletal assessment and ${bodyPart}-specific tests with proven diagnostic value.`,
          scoring_criteria: {
            maxPoints: 18,
            partialCredit: true,
            keywordPoints: [
              { keyword: "range", points: 4 },
              { keyword: "strength", points: 4 },
              { keyword: "special", points: 5 }
            ]
          },
          points_available: 18
        },
        {
          stage_id: stageId,
          question_number: 2,
          question_text: "Based on the examination findings, what is your provisional diagnosis?",
          question_type: "short_answer",
          correct_answer: `Provisional diagnosis should be based on examination findings consistent with ${bodyPart} pathology.`,
          answer_explanation: "Provisional diagnosis integrates history and examination findings to guide further assessment and treatment planning.",
          scoring_criteria: {
            maxPoints: 12,
            partialCredit: true,
            keywordPoints: [
              { keyword: "provisional", points: 3 },
              { keyword: bodyPart, points: 4 }
            ]
          },
          points_available: 12
        }
      ];
      
    case 3: // Differential Diagnosis
      return [
        {
          stage_id: stageId,
          question_number: 1,
          question_text: "What are the key features that distinguish your primary diagnosis from similar conditions?",
          question_type: "essay",
          correct_answer: "Key distinguishing features include specific pain patterns, examination findings, and functional limitations characteristic of the primary diagnosis.",
          answer_explanation: "Differential diagnosis requires understanding of distinguishing features between similar conditions affecting the same anatomical region.",
          scoring_criteria: {
            maxPoints: 22,
            partialCredit: true,
            keywordPoints: [
              { keyword: "distinguish", points: 5 },
              { keyword: "features", points: 4 },
              { keyword: "diagnosis", points: 5 }
            ]
          },
          points_available: 22
        },
        {
          stage_id: stageId,
          question_number: 2,
          question_text: "Are there any red flags that require immediate medical referral?",
          question_type: "multiple_choice",
          correct_answer: "Appropriate identification and management of red flags is essential for patient safety.",
          answer_explanation: "Red flag screening is a critical safety component that determines the appropriateness of physiotherapy management.",
          scoring_criteria: {
            maxPoints: 10,
            partialCredit: false,
            keywordPoints: [
              { keyword: "red flags", points: 5 },
              { keyword: "referral", points: 3 }
            ]
          },
          points_available: 10
        }
      ];
      
    case 4: // Treatment Planning
      return [
        {
          stage_id: stageId,
          question_number: 1,
          question_text: "What are your primary treatment goals for this patient?",
          question_type: "list",
          correct_answer: "Treatment goals should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) and patient-centered.",
          answer_explanation: "Effective treatment planning requires clear, measurable goals that align with patient priorities and evidence-based outcomes.",
          scoring_criteria: {
            maxPoints: 16,
            partialCredit: true,
            keywordPoints: [
              { keyword: "pain", points: 4 },
              { keyword: "function", points: 5 },
              { keyword: "goals", points: 3 }
            ]
          },
          points_available: 16
        },
        {
          stage_id: stageId,
          question_number: 2,
          question_text: "What treatment interventions would you include in your management plan?",
          question_type: "essay",
          correct_answer: "Treatment plan should include evidence-based interventions such as therapeutic exercise, manual therapy, patient education, and activity modification as appropriate.",
          answer_explanation: "Effective physiotherapy management combines multiple evidence-based interventions tailored to individual patient needs and preferences.",
          scoring_criteria: {
            maxPoints: 20,
            partialCredit: true,
            keywordPoints: [
              { keyword: "exercise", points: 6 },
              { keyword: "education", points: 4 },
              { keyword: "evidence", points: 5 }
            ]
          },
          points_available: 20
        },
        {
          stage_id: stageId,
          question_number: 3,
          question_text: "How would you educate the patient about their condition and self-management?",
          question_type: "essay",
          correct_answer: "Patient education should include clear explanation of the condition, self-management strategies, activity guidelines, and when to seek further help.",
          answer_explanation: "Effective patient education empowers self-management and improves long-term outcomes by enhancing patient understanding and engagement.",
          scoring_criteria: {
            maxPoints: 14,
            partialCredit: true,
            keywordPoints: [
              { keyword: "education", points: 4 },
              { keyword: "self-management", points: 5 },
              { keyword: "understanding", points: 3 }
            ]
          },
          points_available: 14
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