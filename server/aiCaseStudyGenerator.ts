import OpenAI from "openai";
import { bodyPartEnum } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for research-based case generation
export interface AICaseStudyInput {
  bodyPart: typeof bodyPartEnum.enumValues[number];
  complexity: "beginner" | "intermediate" | "advanced";
  includeResearch: boolean;
}

// Interface for feedback on user's diagnostic approach
export interface DiagnosticFeedbackInput {
  caseStudyId: number;
  userDiagnosis: string;
  userReasoning: string;
  assessmentTests: string[];
  proposedTreatment: string;
}

export interface AICaseStudy {
  id?: number;
  title: string;
  patientDescription: string;
  history: string;
  presentingSymptoms: string;
  vitalSigns?: string;
  bodyPart: typeof bodyPartEnum.enumValues[number];
  complexity: string;
  hiddenFindings: { [key: string]: string };
  correctDiagnosis: string;
  differentialDiagnoses: string[];
  correctAssessmentApproach: string[];
  correctTreatmentApproach: string;
  researchBasis?: string[];
  expertSources?: string[];
  userId: number;
  createdAt?: Date;
}

// Generate a research-based case study
export async function generateAICaseStudy(
  input: AICaseStudyInput,
  userId: number
): Promise<AICaseStudy> {
  try {
    const { bodyPart, complexity, includeResearch } = input;
    
    // Build the prompt for generating a research-based case
    const prompt = `
    Create a realistic and evidence-based physiotherapy case study for a ${complexity} level student focusing on the ${bodyPart} region.
    
    Include:
    1. Patient demographic information and history
    2. Detailed current symptoms and presentation
    3. Hidden objective findings the student should discover through correct assessment
    4. The correct diagnosis based on current best evidence
    5. 2-3 reasonable differential diagnoses
    6. 3-5 evidence-based assessment tests that would be appropriate to perform
    7. The correct treatment approach based on current research evidence
    ${includeResearch ? "8. 3-5 recent research papers or expert sources that inform this case" : ""}
    
    Based on complexity level (${complexity}):
    - Beginner: Common condition with clear presentation and straightforward assessment/treatment path
    - Intermediate: Condition with some complexity or comorbidities requiring careful differential diagnosis
    - Advanced: Complex case with potential red flags, multiple systems involvement, or requiring sophisticated clinical reasoning
    
    Incorporate real evidence-based practice from renowned physiotherapy experts like:
    - Shoulder: Jeremy Lewis, Jo Gibson, Ann Cools
    - Knee: Kay Crossley, Christian Barton
    - Low back: Peter O'Sullivan, Lorimer Moseley
    - Hip: Alison Grimaldi, Joanne Kemp
    - Neck: Gwendolen Jull, Deborah Falla
    - Other relevant experts for this specific ${bodyPart} region
    
    Format your response as JSON with the following structure:
    {
      "title": "Brief descriptive title of the case",
      "patientDescription": "Age, gender, occupation, relevant characteristics",
      "history": "Patient's past medical history, injury mechanism if applicable",
      "presentingSymptoms": "Chief complaints and presentation",
      "vitalSigns": "Any relevant physical findings",
      "bodyPart": "${bodyPart}",
      "complexity": "${complexity}",
      "hiddenFindings": {
        "rangeOfMotion": "Findings a student should discover when testing ROM",
        "strength": "Strength testing findings",
        "specialTests": "Results of key tests",
        "palpation": "Palpation findings",
        "additionalObservations": "Other relevant findings"
      },
      "correctDiagnosis": "The evidence-based diagnosis",
      "differentialDiagnoses": ["differential1", "differential2", "differential3"],
      "correctAssessmentApproach": ["test1", "test2", "test3", "test4", "test5"],
      "correctTreatmentApproach": "Evidence-based treatment approach overview",
      ${includeResearch ? `"researchBasis": ["study1", "study2", "study3"],
      "expertSources": ["expert1 approach", "expert2 protocol", "expert3 technique"],` : ""}
      "userId": ${userId}
    }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    // Parse and return the generated case
    const content = (response.choices[0].message.content as string) || "{}";
    const result = JSON.parse(content);
    
    return {
      title: result.title || `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} ${bodyPart} case`,
      patientDescription: result.patientDescription || "Patient information not available",
      history: result.history || "No history provided",
      presentingSymptoms: result.presentingSymptoms || "Symptoms not specified",
      vitalSigns: result.vitalSigns || "No vital signs recorded",
      bodyPart: bodyPart,
      complexity: complexity,
      hiddenFindings: result.hiddenFindings || {},
      correctDiagnosis: result.correctDiagnosis || "Diagnosis not specified",
      differentialDiagnoses: result.differentialDiagnoses || [],
      correctAssessmentApproach: result.correctAssessmentApproach || [],
      correctTreatmentApproach: result.correctTreatmentApproach || "Treatment approach not specified",
      researchBasis: result.researchBasis || [],
      expertSources: result.expertSources || [],
      userId: userId
    };
  } catch (error) {
    console.error("Error generating AI case study:", error);
    throw new Error(`Failed to generate case study: ${error.message}`);
  }
}

// Generate feedback on a user's diagnostic approach
export async function generateDiagnosticFeedback(
  input: DiagnosticFeedbackInput,
  caseStudy: AICaseStudy
): Promise<{
  overallAccuracy: number;
  diagnosisFeedback: string;
  assessmentFeedback: string;
  treatmentFeedback: string;
  keyLearningPoints: string[];
  suggestedResources?: string[];
}> {
  try {
    // Extract user input and case details
    const { userDiagnosis, userReasoning, assessmentTests, proposedTreatment } = input;
    const { correctDiagnosis, correctAssessmentApproach, correctTreatmentApproach, expertSources } = caseStudy;
    
    // Build the feedback generation prompt
    const prompt = `
    You are an expert physiotherapy clinical educator providing feedback on a student's approach to a clinical case.
    
    CASE DETAILS:
    - Correct diagnosis: ${correctDiagnosis}
    - Appropriate assessment tests: ${correctAssessmentApproach.join(", ")}
    - Evidence-based treatment approach: ${correctTreatmentApproach}
    ${expertSources && expertSources.length > 0 ? `- Expert approaches: ${expertSources.join(", ")}` : ""}
    
    STUDENT'S APPROACH:
    - Student's diagnosis: ${userDiagnosis}
    - Student's clinical reasoning: ${userReasoning}
    - Assessment tests selected: ${assessmentTests.join(", ")}
    - Proposed treatment plan: ${proposedTreatment}
    
    Provide constructive clinical feedback that:
    1. Evaluates the accuracy of the student's diagnosis (0-100%)
    2. Analyzes the appropriateness of their selected assessment tests
    3. Assesses their treatment plan's alignment with evidence-based practice
    4. Identifies 3-5 key learning points they should focus on
    5. Suggests 2-3 specific resources (research papers, textbooks, or expert techniques) for further learning
    
    Your feedback should be educational, supportive, and reference specific evidence or expert approaches where appropriate.
    
    Format your response as JSON with the following structure:
    {
      "overallAccuracy": 85,
      "diagnosisFeedback": "Detailed feedback on diagnosis",
      "assessmentFeedback": "Detailed feedback on assessment approach",
      "treatmentFeedback": "Detailed feedback on treatment plan",
      "keyLearningPoints": ["learning point 1", "learning point 2", "learning point 3"],
      "suggestedResources": ["specific resource 1", "specific resource 2", "specific resource 3"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    // Parse and return the feedback
    const content = (response.choices[0].message.content as string) || "{}";
    const result = JSON.parse(content);
    
    return {
      overallAccuracy: result.overallAccuracy || 0,
      diagnosisFeedback: result.diagnosisFeedback || "No feedback available on diagnosis.",
      assessmentFeedback: result.assessmentFeedback || "No feedback available on assessment approach.",
      treatmentFeedback: result.treatmentFeedback || "No feedback available on treatment plan.",
      keyLearningPoints: result.keyLearningPoints || ["No specific learning points identified."],
      suggestedResources: result.suggestedResources || []
    };
  } catch (error) {
    console.error("Error generating diagnostic feedback:", error);
    throw new Error(`Failed to generate feedback: ${error.message}`);
  }
}