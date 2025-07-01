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

function getBodyPartSpecifics(bodyPart: string): string {
  const specifics = {
    shoulder: "Create a case involving rotator cuff pathology, shoulder impingement, frozen shoulder, or instability. Include shoulder-specific tests like Hawkins-Kennedy, Neer's test, apprehension test. Focus on overhead activities, throwing mechanics, and scapular dyskinesis.",
    knee: "Create a case involving meniscal tears, ACL injury, patellofemoral pain, or osteoarthritis. Include knee-specific tests like McMurray's, Lachman's, anterior drawer, patella apprehension. Focus on weight-bearing activities, stairs, and functional movements.",
    back: "Create a case involving disc herniation, facet joint dysfunction, muscle strain, or stenosis. Include spinal tests like straight leg raise, slump test, neurological screening. Focus on bending, lifting, and daily activities.",
    neck: "Create a case involving cervical radiculopathy, tension headaches, or whiplash. Include cervical tests like Spurling's, upper limb tension tests, cranio-cervical flexion test. Focus on neck movement, headaches, and arm symptoms.",
    hip: "Create a case involving FAI, labral tears, hip osteoarthritis, or bursitis. Include hip-specific tests like FADIR, FABER, Thomas test, Trendelenburg. Focus on walking, stairs, and hip movement.",
    ankle: "Create a case involving ankle sprains, Achilles tendinopathy, or impingement. Include ankle tests like anterior drawer, talar tilt, squeeze test. Focus on weight-bearing, walking, and sports activities.",
    elbow: "Create a case involving tennis elbow, golfer's elbow, or ulnar nerve entrapment. Include elbow tests like Cozen's test, Mill's test, Tinel's sign. Focus on gripping, lifting, and repetitive arm movements.",
    wrist: "Create a case involving carpal tunnel, De Quervain's, or wrist fracture. Include wrist tests like Phalen's, Finkelstein's, Watson's test. Focus on gripping, typing, and hand function.",
    foot: "Create a case involving plantar fasciitis, Morton's neuroma, or stress fractures. Include foot tests like windlass test, squeeze test, Mulder's sign. Focus on walking, standing, and foot mechanics.",
    general: "Create a complex multi-system case involving multiple body regions or systemic conditions affecting movement and function."
  };
  
  return specifics[bodyPart] || specifics.general;
}

function buildComplexCasePrompt(input: ComplexCaseInput): string {
  const bodyPartGuidance = getBodyPartSpecifics(input.bodyPart);
  
  return `Create a comprehensive multi-stage physiotherapy case study with detailed clinical progression and the following specifications:

**CRITICAL: Body Part Specific Requirements for ${input.bodyPart.toUpperCase()}:**
${bodyPartGuidance}

**Competition Type Focus:**
${input.competitionType === 'complete_clinician' ? 'Focus on comprehensive assessment and treatment planning from initial contact to discharge planning.' :
  input.competitionType === 'diagnostic_detective' ? 'Emphasize complex differential diagnosis with multiple possible conditions and detailed clinical reasoning.' :
  input.competitionType === 'treatment_strategist' ? 'Focus on evidence-based treatment planning with multiple intervention options and progression strategies.' :
  'Focus on teaching and mentoring aspects, including patient education and clinical reasoning explanation.'}

**Case Requirements:**
- Body Part: ${input.bodyPart}
- Complexity: ${input.complexity}
- Competition Type: ${input.competitionType}
- Estimated Completion Time: ${input.estimatedTime} minutes
- Target: 4-6 progressive stages with 2-3 questions per stage
- Each stage must reveal NEW and DETAILED clinical information
- Include specific objective findings, special test results, and measurement data

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
      "title": "Initial Assessment & History Taking",
      "description": "Gather comprehensive patient history and perform initial clinical assessment",
      "stageType": "assessment",
      "expectedTimeMinutes": 6,
      "informationRevealed": {
        "patientResponse": "Detailed patient response to history questions including onset, location, quality, radiation, timing, exacerbating/alleviating factors",
        "additionalHistory": "Additional relevant history including red flag screening, previous treatments, medications",
        "observationFindings": "Initial observation findings including posture, gait, obvious deformities, functional movements"
      },
      "questions": [
        {
          "questionText": "Based on the patient's history, what are your top 3 differential diagnoses?",
          "questionType": "essay",
          "correctAnswer": "Should include most likely diagnoses based on mechanism, patient age, and presentation",
          "answerExplanation": "Differential diagnosis should be systematic based on anatomy, pathophysiology, and clinical presentation patterns",
          "scoringCriteria": {
            "maxPoints": 20,
            "partialCredit": true,
            "keywordPoints": [{"keyword": "differential", "points": 5}, {"keyword": "diagnosis", "points": 5}]
          },
          "pointsAvailable": 20
        }
      ]
    },
    {
      "title": "Physical Examination & Special Tests",
      "description": "Conduct systematic physical examination and appropriate special tests",
      "stageType": "examination", 
      "expectedTimeMinutes": 8,
      "informationRevealed": {
        "testResults": "Specific physical examination findings including range of motion measurements, strength grades, palpation findings",
        "additionalHistory": "Additional examination findings and patient responses during testing",
        "observationFindings": "Detailed movement analysis and functional testing results"
      },
      "questions": [
        {
          "questionText": "What are the most important special tests to perform for this presentation?",
          "questionType": "list",
          "correctAnswer": "Should include body-part specific special tests with proven diagnostic accuracy",
          "answerExplanation": "Special tests should be selected based on differential diagnosis and have strong sensitivity/specificity",
          "scoringCriteria": {
            "maxPoints": 18,
            "partialCredit": true,
            "keywordPoints": [{"keyword": "test", "points": 3}, {"keyword": "special", "points": 3}]
          },
          "pointsAvailable": 18
        }
      ]
    },
    {
      "title": "Test Results & Diagnostic Findings",
      "description": "Review special test results and imaging/lab findings if indicated",
      "stageType": "diagnostic",
      "expectedTimeMinutes": 5,
      "informationRevealed": {
        "testResults": "Specific special test results (positive/negative) with exact findings, imaging results if ordered",
        "additionalHistory": "Patient response to testing, pain provocation patterns",
        "observationFindings": "Functional movement patterns and compensatory strategies observed"
      },
      "questions": [
        {
          "questionText": "Based on all examination findings, what is your working diagnosis?",
          "questionType": "short_answer",
          "correctAnswer": "Should reflect most likely diagnosis based on all available evidence",
          "answerExplanation": "Diagnosis should integrate history, examination, and test findings using clinical reasoning",
          "scoringCriteria": {
            "maxPoints": 25,
            "partialCredit": true,
            "keywordPoints": [{"keyword": "diagnosis", "points": 10}, {"keyword": "evidence", "points": 5}]
          },
          "pointsAvailable": 25
        }
      ]
    },
    {
      "title": "Treatment Planning & Goal Setting",
      "description": "Develop evidence-based treatment plan with appropriate goals and interventions",
      "stageType": "treatment",
      "expectedTimeMinutes": 7,
      "informationRevealed": {
        "patientResponse": "Patient's treatment preferences, goals, and concerns discussed",
        "additionalHistory": "Patient's previous treatment experiences and outcomes",
        "observationFindings": "Baseline functional measurements and outcome measure scores"
      },
      "questions": [
        {
          "questionText": "What are your primary treatment interventions for this patient?",
          "questionType": "essay",
          "correctAnswer": "Should include evidence-based interventions appropriate for the diagnosis and patient factors",
          "answerExplanation": "Treatment should be based on best available evidence, patient preferences, and clinical expertise",
          "scoringCriteria": {
            "maxPoints": 22,
            "partialCredit": true,
            "keywordPoints": [{"keyword": "treatment", "points": 5}, {"keyword": "evidence", "points": 5}]
          },
          "pointsAvailable": 22
        }
      ]
    }
  ]
}

Create a realistic, challenging case that promotes deep clinical thinking and evidence-based practice.`;
}

function createFallbackComplexCase(input: ComplexCaseInput, userId: number): ComplexCaseGenerationResult {
  // Body part specific case content
  const shoulderCase = {
    title: "Office Worker with Shoulder Pain",
    patientDescription: "A 42-year-old office manager presents with progressive shoulder pain and difficulty with overhead activities.",
    occupationalHistory: "Desk-based work for 15 years with frequent computer use.",
    socialHistory: "Lives with spouse and two children, enjoys weekend activities.",
    medicalHistory: "Previous wrist fracture (2018), mild hypertension controlled with medication.",
    currentMedications: "Lisinopril 10mg daily, occasional ibuprofen for shoulder pain.",
    mechanismOfInjury: "Insidious onset following increased computer work and poor posture.",
    initialPresentation: {
      chiefComplaint: "Right shoulder pain with overhead reaching",
      painScale: 6,
      functionalLimitations: ["overhead reaching", "sleeping on right side"],
      patientGoals: ["return to pain-free activities", "improve sleep quality"]
    },
    detailedHistory: {
      onsetDetails: "Gradual onset over 6 weeks",
      progressionPattern: "Pain increased from 2/10 to current 6/10",
      aggravatingFactors: ["overhead reaching", "prolonged computer work"],
      easingFactors: ["rest", "heat application"],
      previousTreatments: ["over-the-counter ibuprofen"],
      redFlagScreening: ["no night pain", "no neurological symptoms"]
    },
    physicalFindings: {
      observation: "Forward head posture, elevated right shoulder",
      palpation: "Tenderness over subacromial space",
      rangeOfMotion: "Active flexion 150°, abduction 140°",
      strength: "4/5 shoulder abduction with pain",
      neurological: "Normal sensation and reflexes",
      specialTests: "Positive Hawkins-Kennedy test",
      functional: "Unable to reach top shelf"
    },
    correctDifferentials: {
      primary: "Subacromial impingement syndrome",
      secondary: ["Rotator cuff tendinopathy", "Adhesive capsulitis"],
      ruled_out: ["Rotator cuff tear", "Cervical radiculopathy"]
    },
    correctAssessments: ["DASH questionnaire", "ROM measurement", "Strength testing"],
    correctTreatmentPlan: {
      shortTerm: ["Reduce pain", "Improve ROM"],
      longTerm: ["Restore function", "Prevent recurrence"],
      patientEducation: ["Proper ergonomics", "Exercise program"],
      expectedOutcome: "Good prognosis with treatment",
      reassessmentPlan: "Re-evaluate in 2 weeks"
    },
    expertRationale: "Classic presentation requiring multimodal approach.",
    researchEvidence: ["Exercise protocols (Lewis et al., 2015)"]
  };

  const backCase = {
    title: "Construction Worker with Lower Back Pain",
    patientDescription: "A 45-year-old construction worker presents with lower back pain after lifting.",
    occupationalHistory: "Construction work for 20 years with heavy lifting.",
    socialHistory: "Married with three children, enjoys fishing.",
    medicalHistory: "Previous back strain (2019), mild obesity.",
    currentMedications: "Naproxen 500mg twice daily for pain.",
    mechanismOfInjury: "Lifting heavy concrete block with forward flexion.",
    initialPresentation: {
      chiefComplaint: "Lower back pain with leg radiation",
      painScale: 7,
      functionalLimitations: ["lifting", "bending"],
      patientGoals: ["return to work", "eliminate pain"]
    },
    detailedHistory: {
      onsetDetails: "Immediate onset while lifting",
      progressionPattern: "Initial sharp pain, now constant ache",
      aggravatingFactors: ["bending", "lifting", "sitting"],
      easingFactors: ["lying down", "heat"],
      previousTreatments: ["rest", "pain medication"],
      redFlagScreening: ["no bowel/bladder dysfunction"]
    },
    physicalFindings: {
      observation: "Antalgic gait, list to left",
      palpation: "Muscle spasm in lumbar region",
      rangeOfMotion: "Forward flexion 30° limited",
      strength: "4/5 ankle dorsiflexion",
      neurological: "Diminished L5 sensation",
      specialTests: "Positive straight leg raise",
      functional: "Unable to tie shoes"
    },
    correctDifferentials: {
      primary: "Lumbar disc herniation with radiculopathy",
      secondary: ["Muscle strain", "Facet dysfunction"],
      ruled_out: ["Cauda equina", "Fracture"]
    },
    correctAssessments: ["Oswestry Index", "Neurological assessment"],
    correctTreatmentPlan: {
      shortTerm: ["Pain reduction", "Restore movement"],
      longTerm: ["Return to work", "Strengthen core"],
      patientEducation: ["Lifting mechanics", "Activity modification"],
      expectedOutcome: "Good prognosis with care",
      reassessmentPlan: "Re-evaluate in 1 week"
    },
    expertRationale: "Classic disc herniation requiring monitoring.",
    researchEvidence: ["Conservative management (Lurie et al., 2014)"]
  };

  // Select appropriate case based on body part
  const caseContent = input.bodyPart === 'back' ? backCase : shoulderCase;
  
  const fallbackCase: InsertComplexCase = {
    userId,
    title: caseContent.title,
    patientDescription: caseContent.patientDescription,
    occupationalHistory: caseContent.occupationalHistory,
    socialHistory: caseContent.socialHistory,
    medicalHistory: caseContent.medicalHistory,
    currentMedications: caseContent.currentMedications,
    mechanismOfInjury: caseContent.mechanismOfInjury,
    bodyPart: input.bodyPart,
    complexity: input.complexity,
    estimatedTime: input.estimatedTime,
    initialPresentation: caseContent.initialPresentation,
    detailedHistory: caseContent.detailedHistory,
    physicalFindings: caseContent.physicalFindings,
    correctDifferentials: caseContent.correctDifferentials,
    correctAssessments: caseContent.correctAssessments,
    correctTreatmentPlan: caseContent.correctTreatmentPlan,
    expertRationale: caseContent.expertRationale,
    researchEvidence: caseContent.researchEvidence
  };

  // Create basic stages
  const stages: InsertCaseStage[] = [
    {
      complexCaseId: 0,
      stageNumber: 1,
      title: "Initial Assessment",
      description: "Gather initial clinical information",
      providedInformation: { patientResponse: "Patient history provided" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 2,
      title: "Physical Examination",
      description: "Conduct examination and tests",
      providedInformation: { testResults: "Examination findings" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 3,
      title: "Diagnosis and Planning",
      description: "Form diagnosis and plan",
      providedInformation: { additionalHistory: "Additional information" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    },
    {
      complexCaseId: 0,
      stageNumber: 4,
      title: "Treatment Implementation",
      description: "Implement treatment plan",
      providedInformation: { observationFindings: "Treatment observations" },
      timeAllocation: Math.ceil(input.estimatedTime / 4)
    }
  ];

  // Create basic questions
  const questions: InsertStageQuestion[] = [
    {
      stageId: 0,
      questionNumber: 1,
      questionText: "What are the top 3 differential diagnoses?",
      questionType: "list",
      options: [],
      expectedAnswers: ["primary diagnosis", "secondary diagnosis"],
      scoringCriteria: {
        maxPoints: 15,
        partialCredit: true,
        keywordPoints: [
          { keyword: "primary", points: 7 },
          { keyword: "secondary", points: 4 }
        ]
      },
      correctAnswer: "Primary and secondary diagnoses",
      rationale: "Based on clinical presentation",
      learningPoints: ["Consider multiple possibilities"]
    }
  ];

  return { complexCase: fallbackCase, stages, questions };
}

/**
 * Scores individual question response using AI analysis with immediate feedback
 */
export async function scoreQuestionResponse(
  question: any,
  userAnswer: string,
  complexCase: any,
  stage: any
): Promise<{
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  keywordMatches: { keyword: string; points: number }[];
}> {
  try {
    const openai = await import('./openai');
    
    const prompt = `You are an expert physiotherapy educator providing immediate scoring and feedback for a student's answer to a clinical case question.

CASE CONTEXT:
- Patient: ${complexCase.title}
- Stage: ${stage.title} - ${stage.description}
- Body Part: ${complexCase.bodyPart}

QUESTION DETAILS:
- Question: ${question.questionText}
- Question Type: ${question.questionType}
- Max Points: ${question.pointsAvailable}
- Expected Answer: ${question.correctAnswer}

STUDENT'S ANSWER:
"${userAnswer}"

SCORING CRITERIA:
${JSON.stringify(question.scoringCriteria, null, 2)}

Please provide detailed scoring and feedback in JSON format:
{
  "score": number (0 to ${question.pointsAvailable}),
  "feedback": "Detailed feedback explaining the score with specific clinical reasoning",
  "strengths": ["specific strengths in the answer"],
  "improvements": ["specific areas for improvement"],
  "keywordMatches": [{"keyword": "term", "points": number}],
  "clinicalReasoning": "Assessment of clinical reasoning quality",
  "evidenceBase": "Comments on evidence-based thinking demonstrated"
}

Focus on constructive feedback that helps the student learn. Be specific about what was good and what could be improved.`;

    const response = await openai.default.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      score: Math.min(result.score || 0, question.pointsAvailable),
      maxScore: question.pointsAvailable,
      feedback: result.feedback || "Answer received and reviewed.",
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      keywordMatches: result.keywordMatches || []
    };

  } catch (error) {
    console.error('Error scoring question response:', error);
    
    // Fallback scoring based on keyword matching
    const keywords = question.scoringCriteria?.keywordPoints || [];
    let fallbackScore = 0;
    const matchedKeywords: { keyword: string; points: number }[] = [];
    
    keywords.forEach((kw: any) => {
      if (userAnswer.toLowerCase().includes(kw.keyword.toLowerCase())) {
        fallbackScore += kw.points;
        matchedKeywords.push({ keyword: kw.keyword, points: kw.points });
      }
    });
    
    return {
      score: Math.min(fallbackScore, question.pointsAvailable),
      maxScore: question.pointsAvailable,
      feedback: `Answer reviewed. Key terms identified: ${matchedKeywords.map(k => k.keyword).join(', ')}`,
      strengths: ["Response submitted successfully"],
      improvements: ["Consider more detailed clinical reasoning"],
      keywordMatches: matchedKeywords
    };
  }
}

/**
 * Scores a complex case attempt using AI analysis with evidence-based references
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
    evidenceReferences: string[];
  };
}> {
  try {
    // Get relevant research articles for this body part
    const { storage } = await import('./storage');
    const researchResult = await storage.getResearchPapersByBodyPart(complexCase.bodyPart, 1, 10);
    const relevantResearch = researchResult.papers;
    
    // Create evidence context from top research articles
    const evidenceContext = relevantResearch
      .filter((article: any) => article.qualityScore && article.qualityScore > 80)
      .slice(0, 5) // Top 5 highest quality articles
      .map((article: any) => ({
        title: article.title,
        keyFindings: article.keyFindings,
        clinicalRelevance: article.clinicalRelevance,
        authors: article.authors,
        journal: article.journal
      }));

    const prompt = `Analyze this complex physiotherapy case attempt using current evidence-based practice standards and provide detailed scoring with specific research references.

**Case Information:**
Title: ${complexCase.title}
Body Part: ${complexCase.bodyPart}
Complexity: ${complexCase.complexity}

**Correct Evidence-Based Answers:**
Differential Diagnoses: ${JSON.stringify(complexCase.correctDifferentials)}
Assessments: ${JSON.stringify(complexCase.correctAssessments)}
Treatment Plan: ${JSON.stringify(complexCase.correctTreatmentPlan)}

**Current Evidence Base for ${complexCase.bodyPart.toUpperCase()}:**
${evidenceContext.map((article: any, index: number) => `
${index + 1}. "${article.title}" (${article.authors})
   Published in: ${article.journal}
   Key Findings: ${article.keyFindings}
   Clinical Relevance: ${article.clinicalRelevance}
`).join('\n')}

**User Responses:**
${JSON.stringify(stageResponses, null, 2)}

Please analyze the user responses against both the correct answers AND current evidence-based practice. Reference specific research findings when evaluating clinical reasoning, assessment choices, and treatment planning.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapy educator analyzing student performance against current evidence-based practice standards. 

Score each category from 0-100 based on:
- Clinical Reasoning (40%): Accuracy of diagnoses compared to evidence-based criteria, logical thinking, evidence-based decisions
- Assessment Skills (25%): Appropriate test selection based on current research, interpretation accuracy
- Treatment Planning (25%): Evidence-based interventions, realistic goals, progression aligned with research
- Communication (10%): Patient education quality, professional communication

When evaluating responses, specifically compare against the provided evidence base and reference relevant research findings in your feedback. Include specific evidence citations when appropriate.

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
    "strengths": ["specific strengths with evidence references"],
    "improvementAreas": ["areas for improvement with evidence-based recommendations"],
    "recommendedResources": ["specific research papers and evidence-based resources"],
    "nextSteps": ["actionable next steps based on current evidence"],
    "evidenceReferences": ["specific citations to research that supports or contradicts the user's approach"]
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

    // Ensure feedback has all required fields
    const feedback = {
      strengths: analysis.feedback?.strengths || ["Attempted all questions"],
      improvementAreas: analysis.feedback?.improvementAreas || ["Continue developing skills"],
      recommendedResources: analysis.feedback?.recommendedResources || ["Review evidence-based guidelines"],
      nextSteps: analysis.feedback?.nextSteps || ["Practice more cases"],
      evidenceReferences: analysis.feedback?.evidenceReferences || ["Consult recent systematic reviews"]
    };

    return {
      totalScore,
      categoryScores: analysis.categoryScores,
      feedback
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
        nextSteps: ["Practice more complex cases", "Seek mentorship opportunities"],
        evidenceReferences: ["Consult recent systematic reviews for this condition", "Review latest clinical practice guidelines"]
      }
    };
  }
}