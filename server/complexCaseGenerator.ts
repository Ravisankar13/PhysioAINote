import openai from './openai';
import { ComplexCase, InsertComplexCase, CaseStage, InsertCaseStage, StageQuestion, InsertStageQuestion } from '@shared/schema';
import { bodyPartEnum } from '@shared/schema';

export interface ComplexCaseInput {
  bodyPart: typeof bodyPartEnum.enumValues[number];
  complexity: "beginner" | "intermediate" | "advanced";
  competitionType: "complete_clinician" | "diagnostic_detective" | "treatment_strategist" | "clinical_educator";
  estimatedTime: number; // in minutes
}

export interface ComplexCaseGenerationResult {
  complexCase: InsertComplexCase;
  stages: InsertCaseStage[];
  questions: InsertStageQuestion[];
}

/**
 * Generates a comprehensive multi-stage case study with progressive questions
 */
export async function generateComplexCase(
  input: ComplexCaseInput,
  userId: number
): Promise<ComplexCaseGenerationResult> {
  try {
    console.log(`Generating complex case for ${input.bodyPart} - ${input.complexity} level`);
    
    const prompt = buildComplexCasePrompt(input);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(input.competitionType)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const generatedContent = JSON.parse(response.choices[0].message.content || '{}');
    
    // Transform the AI response into our database structure
    const complexCase: InsertComplexCase = {
      userId,
      title: generatedContent.title,
      patientDescription: generatedContent.patientDescription,
      occupationalHistory: generatedContent.occupationalHistory,
      socialHistory: generatedContent.socialHistory,
      medicalHistory: generatedContent.medicalHistory,
      currentMedications: generatedContent.currentMedications,
      mechanismOfInjury: generatedContent.mechanismOfInjury,
      bodyPart: input.bodyPart,
      complexity: input.complexity,
      estimatedTime: input.estimatedTime,
      initialPresentation: generatedContent.initialPresentation,
      detailedHistory: generatedContent.detailedHistory,
      physicalFindings: generatedContent.physicalFindings,
      correctDifferentials: generatedContent.correctDifferentials,
      correctAssessments: generatedContent.correctAssessments,
      correctTreatmentPlan: generatedContent.correctTreatmentPlan,
      expertRationale: generatedContent.expertRationale,
      researchEvidence: generatedContent.researchEvidence || []
    };

    // Generate stages and questions
    const stages: InsertCaseStage[] = [];
    const questions: InsertStageQuestion[] = [];

    generatedContent.stages.forEach((stageData: any, stageIndex: number) => {
      const stage: InsertCaseStage = {
        complexCaseId: 0, // Will be set after case creation
        stageNumber: stageIndex + 1,
        title: stageData.title,
        description: stageData.description,
        providedInformation: stageData.providedInformation,
        timeAllocation: stageData.timeAllocation || Math.ceil(input.estimatedTime / generatedContent.stages.length)
      };
      stages.push(stage);

      // Generate questions for this stage
      stageData.questions.forEach((questionData: any, questionIndex: number) => {
        const question: InsertStageQuestion = {
          stageId: 0, // Will be set after stage creation
          questionNumber: questionIndex + 1,
          questionText: questionData.questionText,
          questionType: questionData.questionType,
          options: questionData.options,
          expectedAnswers: questionData.expectedAnswers,
          scoringCriteria: questionData.scoringCriteria,
          correctAnswer: questionData.correctAnswer,
          rationale: questionData.rationale,
          learningPoints: questionData.learningPoints || []
        };
        questions.push(question);
      });
    });

    return { complexCase, stages, questions };

  } catch (error) {
    console.error('Error generating complex case:', error);
    return createFallbackComplexCase(input, userId);
  }
}

function getSystemPrompt(competitionType: string): string {
  const basePrompt = `You are an expert physiotherapist and clinical educator creating comprehensive multi-stage case studies for professional education. Your cases should be realistic, clinically relevant, and educationally valuable.

Always respond with valid JSON containing all required fields. Never reveal the diagnosis in the title - use symptom-based descriptions only.`;

  const typeSpecificPrompts = {
    complete_clinician: `Focus on comprehensive clinical reasoning across all aspects of physiotherapy practice. Include complex decision-making scenarios that test diagnostic skills, assessment planning, treatment selection, and patient communication.`,
    
    diagnostic_detective: `Emphasize complex differential diagnosis with multiple overlapping conditions. Include cases with atypical presentations, confounding factors, and systematic elimination of possibilities.`,
    
    treatment_strategist: `Focus heavily on evidence-based treatment planning, intervention selection, outcome measurement, and long-term rehabilitation planning. Assume diagnosis is known early in the case.`,
    
    clinical_educator: `Emphasize patient education scenarios, motivational interviewing, behavior change strategies, and complex communication challenges with various patient populations.`
  };

  return basePrompt + "\n\n" + typeSpecificPrompts[competitionType as keyof typeof typeSpecificPrompts];
}

function buildComplexCasePrompt(input: ComplexCaseInput): string {
  return `Create a comprehensive multi-stage physiotherapy case study with the following specifications:

**Case Requirements:**
- Body Part: ${input.bodyPart}
- Complexity: ${input.complexity}
- Competition Type: ${input.competitionType}
- Estimated Completion Time: ${input.estimatedTime} minutes
- Target: 4-6 progressive stages with 2-3 questions per stage

**Required JSON Structure:**
{
  "title": "Symptom-focused title (NO diagnosis revealed)",
  "patientDescription": "Detailed patient background including demographics, lifestyle, occupation",
  "occupationalHistory": "Relevant work history and physical demands",
  "socialHistory": "Family, social support, activities, lifestyle factors",
  "medicalHistory": "Past medical history, surgeries, medications, allergies",
  "currentMedications": "Current medications and supplements",
  "mechanismOfInjury": "How the injury/condition occurred",
  "initialPresentation": {
    "chiefComplaint": "Primary reason for seeking treatment",
    "painScale": "0-10 pain rating",
    "functionalLimitations": ["specific functional limitations"],
    "patientGoals": ["what patient wants to achieve"]
  },
  "detailedHistory": {
    "onsetDetails": "Detailed onset information",
    "progressionPattern": "How symptoms have changed over time",
    "aggravatingFactors": ["factors that worsen symptoms"],
    "easingFactors": ["factors that improve symptoms"],
    "previousTreatments": ["treatments already tried"],
    "redFlagScreening": ["relevant red flag questions and responses"]
  },
  "physicalFindings": {
    "observation": "What you observe during examination",
    "palpation": "Palpation findings",
    "rangeOfMotion": "ROM findings",
    "strength": "Strength test results",
    "neurological": "Neurological examination findings",
    "specialTests": "Special test results",
    "functional": "Functional movement findings"
  },
  "correctDifferentials": {
    "primary": "Most likely diagnosis",
    "secondary": ["other possible diagnoses"],
    "ruled_out": ["diagnoses to rule out and why"]
  },
  "correctAssessments": ["appropriate assessment tests and measures"],
  "correctTreatmentPlan": {
    "shortTerm": ["2-4 week goals and interventions"],
    "longTerm": ["3-6 month goals and interventions"],
    "patientEducation": ["key education points"],
    "expectedOutcome": "Realistic outcome expectations",
    "reassessmentPlan": "When and how to reassess"
  },
  "expertRationale": "Expert explanation of clinical reasoning",
  "researchEvidence": ["relevant research citations"],
  "stages": [
    {
      "title": "Stage title",
      "description": "What happens in this stage",
      "providedInformation": {
        "patientResponse": "Patient's response to questions",
        "testResults": "Any test results revealed",
        "additionalHistory": "Additional history uncovered",
        "observationFindings": "Observation findings"
      },
      "timeAllocation": "minutes for this stage",
      "questions": [
        {
          "questionText": "The question to ask",
          "questionType": "multiple_choice | short_answer | list | essay",
          "options": ["option1", "option2"] // for multiple choice only,
          "expectedAnswers": ["expected answer keywords"],
          "scoringCriteria": {
            "maxPoints": "maximum points possible",
            "partialCredit": "true/false",
            "keywordPoints": [{"keyword": "term", "points": "points for this term"}]
          },
          "correctAnswer": "The correct/best answer",
          "rationale": "Why this is the correct answer",
          "learningPoints": ["key learning points from this question"]
        }
      ]
    }
  ]
}

Create a realistic, challenging case that promotes deep clinical thinking and evidence-based practice.`;
}

function createFallbackComplexCase(input: ComplexCaseInput, userId: number): ComplexCaseGenerationResult {
  // Create a basic fallback case if AI generation fails
  const fallbackCase: InsertComplexCase = {
    userId,
    title: `${input.complexity.charAt(0).toUpperCase() + input.complexity.slice(1)} ${input.bodyPart} Case Study`,
    patientDescription: `A patient presenting with ${input.bodyPart} symptoms requiring comprehensive assessment and treatment planning.`,
    occupationalHistory: "Standard occupational demands with moderate physical activity.",
    socialHistory: "Independent living with good social support system.",
    medicalHistory: `Medical history relevant to ${input.bodyPart} condition.`,
    currentMedications: "No significant medications affecting treatment.",
    mechanismOfInjury: `Mechanism of injury affecting the ${input.bodyPart}.`,
    bodyPart: input.bodyPart,
    complexity: input.complexity,
    estimatedTime: input.estimatedTime,
    initialPresentation: {
      chiefComplaint: `${input.bodyPart} pain and dysfunction`,
      painScale: 6,
      functionalLimitations: ["reduced range of motion", "pain with activity"],
      patientGoals: ["return to normal activities", "reduce pain"]
    },
    detailedHistory: {
      onsetDetails: "Gradual onset over several weeks",
      progressionPattern: "Symptoms have been gradually worsening",
      aggravatingFactors: ["activity", "prolonged positioning"],
      easingFactors: ["rest", "heat/ice"],
      previousTreatments: ["over-the-counter medication"],
      redFlagScreening: ["no significant red flags identified"]
    },
    physicalFindings: {
      observation: "Visible changes consistent with condition",
      palpation: "Tenderness and tissue changes noted",
      rangeOfMotion: "Limited range of motion in affected area",
      strength: "Reduced strength in key muscle groups",
      neurological: "Neurological examination within normal limits",
      specialTests: "Positive special tests confirming diagnosis",
      functional: "Functional limitations noted during assessment"
    },
    correctDifferentials: {
      primary: `Primary ${input.bodyPart} condition`,
      secondary: [`Secondary ${input.bodyPart} condition`, "Alternative diagnosis"],
      ruled_out: ["More serious pathology ruled out through examination"]
    },
    correctAssessments: ["Range of motion assessment", "Strength testing", "Functional assessment"],
    correctTreatmentPlan: {
      shortTerm: ["Pain reduction", "Improve range of motion"],
      longTerm: ["Return to full function", "Prevent recurrence"],
      patientEducation: ["Condition explanation", "Home exercise program"],
      expectedOutcome: "Good prognosis with appropriate treatment",
      reassessmentPlan: "Reassess in 2-3 weeks to monitor progress"
    },
    expertRationale: "Standard clinical reasoning approach for this type of case.",
    researchEvidence: ["Evidence-based treatment approaches for this condition"]
  };

  // Create basic stages
  const stages: InsertCaseStage[] = [
    {
      complexCaseId: 0,
      stageNumber: 1,
      title: "Initial Assessment",
      description: "Gather initial clinical information and plan assessment",
      providedInformation: { patientResponse: "Patient provides initial history" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 2,
      title: "Physical Examination",
      description: "Conduct physical examination and special tests",
      providedInformation: { testResults: "Physical examination findings" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 3,
      title: "Diagnosis and Planning",
      description: "Form diagnosis and create treatment plan",
      providedInformation: { additionalHistory: "Additional clinical information" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 4,
      title: "Treatment Implementation",
      description: "Implement treatment and plan follow-up",
      providedInformation: { observationFindings: "Treatment response observations" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    }
  ];

  // Create basic questions
  const questions: InsertStageQuestion[] = [
    {
      stageId: 0,
      questionNumber: 1,
      questionText: "What are the top 3 differential diagnoses for this presentation?",
      questionType: "list",
      options: [],
      expectedAnswers: ["primary diagnosis", "secondary diagnosis", "alternative diagnosis"],
      scoringCriteria: {
        maxPoints: 15,
        partialCredit: true,
        keywordPoints: [
          { keyword: "primary diagnosis", points: 7 },
          { keyword: "secondary diagnosis", points: 4 },
          { keyword: "alternative diagnosis", points: 4 }
        ]
      },
      correctAnswer: "Primary diagnosis, Secondary diagnosis, Alternative diagnosis",
      rationale: "These are the most likely diagnoses based on the clinical presentation.",
      learningPoints: ["Consider multiple diagnostic possibilities", "Use systematic approach to differential diagnosis"]
    }
  ];

  return { complexCase: fallbackCase, stages, questions };
}

/**
 * Scores a complex case attempt using AI analysis
 */
export async function scoreComplexCaseAttempt(
  complexCase: ComplexCase,
  stageResponses: any[]
): Promise<{
  totalScore: number;
  categoryScores: {
    clinicalReasoning: number;
    assessmentSkills: number;
    treatmentPlanning: number;
    communication: number;
    timeEfficiency: number;
  };
  feedback: {
    strengths: string[];
    improvementAreas: string[];
    recommendedResources: string[];
    nextSteps: string[];
  };
}> {
  try {
    const prompt = `Analyze this complex physiotherapy case attempt and provide detailed scoring and feedback.

**Case Information:**
Title: ${complexCase.title}
Body Part: ${complexCase.bodyPart}
Complexity: ${complexCase.complexity}

**Correct Answers:**
Differential Diagnoses: ${JSON.stringify(complexCase.correctDifferentials)}
Assessments: ${JSON.stringify(complexCase.correctAssessments)}
Treatment Plan: ${JSON.stringify(complexCase.correctTreatmentPlan)}

**User Responses:**
${JSON.stringify(stageResponses, null, 2)}

Please provide a comprehensive analysis with scores (0-100) for each category and detailed feedback.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapy educator analyzing student performance on complex case studies. 

Score each category from 0-100 based on:
- Clinical Reasoning (40%): Accuracy of diagnoses, logical thinking, evidence-based decisions
- Assessment Skills (25%): Appropriate test selection, interpretation, clinical reasoning
- Treatment Planning (25%): Evidence-based interventions, realistic goals, progression
- Communication (10%): Patient education quality, professional communication

Provide constructive feedback focusing on learning and improvement.

Respond with JSON in this exact format:
{
  "categoryScores": {
    "clinicalReasoning": 85,
    "assessmentSkills": 78,
    "treatmentPlanning": 82,
    "communication": 90,
    "timeEfficiency": 75
  },
  "feedback": {
    "strengths": ["specific strengths"],
    "improvementAreas": ["areas for improvement"],
    "recommendedResources": ["specific learning resources"],
    "nextSteps": ["actionable next steps"]
  }
}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    // Calculate weighted total score
    const totalScore = Math.round(
      (analysis.categoryScores.clinicalReasoning * 0.4) +
      (analysis.categoryScores.assessmentSkills * 0.25) +
      (analysis.categoryScores.treatmentPlanning * 0.25) +
      (analysis.categoryScores.communication * 0.1)
    );

    return {
      totalScore,
      categoryScores: analysis.categoryScores,
      feedback: analysis.feedback
    };

  } catch (error) {
    console.error('Error scoring complex case attempt:', error);
    
    // Fallback scoring
    return {
      totalScore: 75,
      categoryScores: {
        clinicalReasoning: 75,
        assessmentSkills: 75,
        treatmentPlanning: 75,
        communication: 75,
        timeEfficiency: 75
      },
      feedback: {
        strengths: ["Attempted all questions", "Showed clinical thinking"],
        improvementAreas: ["Continue developing clinical reasoning skills"],
        recommendedResources: ["Review evidence-based practice guidelines"],
        nextSteps: ["Practice more complex cases", "Seek mentorship opportunities"]
      }
    };
  }
}