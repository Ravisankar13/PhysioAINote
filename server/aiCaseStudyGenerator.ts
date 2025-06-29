import OpenAI from "openai";
import { AICaseStudy, bodyPartEnum } from "@shared/schema";

// Create OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define input types
export interface AICaseStudyInput {
  bodyPart: typeof bodyPartEnum.enumValues[number];
  complexity: "beginner" | "intermediate" | "advanced";
  includeResearch: boolean;
}

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

// Sample expert sources for different body parts to reference in generated content
const expertSourcesByBodyPart: Record<string, string[]> = {
  shoulder: [
    "Jeremy Lewis - Rotator Cuff Related Shoulder Pain Research",
    "Jo Gibson - Upper Limb Rehabilitation Protocols",
    "Ann Cools - Scapular Dyskinesis Research",
    "Chris Littlewood - Self-Managed Exercise Programs for Shoulder Pain"
  ],
  neck: [
    "Gwendolen Jull - Cervical Spine Research",
    "Deborah Falla - Motor Control in Neck Pain",
    "Michele Sterling - Whiplash Associated Disorders Research",
    "Peter O'Sullivan - Cognitive Functional Therapy for Neck Pain"
  ],
  back: [
    "Peter O'Sullivan - Cognitive Functional Therapy for Low Back Pain",
    "Lorimer Moseley - Pain Neuroscience Education",
    "Stuart McGill - Spine Biomechanics Research",
    "Kieran O'Sullivan - Low Back Pain Management Approach"
  ],
  knee: [
    "Kay Crossley - Patellofemoral Pain Research",
    "Ewa Roos - GLAD Program for Knee Osteoarthritis",
    "Adam Weir - Tendinopathy Management Protocols",
    "Timothy Hewett - ACL Injury Prevention Research"
  ],
  hip: [
    "Alison Grimaldi - Hip and Gluteal Tendinopathy Research",
    "Joanne Kemp - Hip-Related Pain Management",
    "Inger Mechlenburg - Hip Dysplasia Rehabilitation",
    "Ricci Plastow - Femoroacetabular Impingement Management"
  ],
  ankle: [
    "Claire Hiller - Ankle Instability Research",
    "Bill Vicenzino - Ankle Sprain Rehabilitation",
    "Karin Grävare Silbernagel - Achilles Tendon Rehabilitation",
    "Eamonn Delahunt - Ankle Sprains and Instability Protocols"
  ],
  foot: [
    "Christian Barton - Running-Related Injuries Research",
    "Michael Rathleff - Plantar Fasciopathy Management",
    "Tom McPoil - Foot Function Assessment",
    "Rebecca Mellsop - Foot Orthoses Research"
  ],
  elbow: [
    "Leanne Bissett - Lateral Epicondylalgia Management",
    "Jill Cook - Tendon Research",
    "Bill Vicenzino - Lateral Elbow Pain Research",
    "Jeremy Lewis - Upper Limb Tendinopathy Management"
  ],
  wrist: [
    "Joy MacDermid - Wrist Outcome Measures",
    "Mark Ross - Carpal Tunnel Syndrome Management",
    "Sarah Mee - TFCC Injury Rehabilitation",
    "Lisa Hodges - Wrist Instability Management"
  ],
  hand: [
    "Susan Michlovitz - Hand Therapy Protocols",
    "Joy MacDermid - Hand Outcome Measures",
    "Katherine Rundell - Post-Surgical Hand Rehabilitation",
    "Mark Ross - Complex Regional Pain Syndrome Management"
  ],
  general: [
    "Lorimer Moseley - Pain Science Education",
    "David Butler - Neurodynamics Research",
    "Bronnie Thompson - Biopsychosocial Approach to Persistent Pain",
    "Paul Hodges - Motor Control Research"
  ],
  other: [
    "Peter Malliaras - Tendinopathy Rehabilitation",
    "Jill Cook - Tendinopathy Research",
    "Jeremy Lewis - Shoulder and Upper Limb Research",
    "Peter O'Sullivan - Cognitive Functional Therapy"
  ]
};

/**
 * Generates an AI case study based on input parameters
 * @param input The input parameters for generating a case study
 * @param userId The user ID creating the case study
 * @returns A complete AI case study object
 */
export async function generateAICaseStudy(
  input: AICaseStudyInput,
  userId: number
): Promise<AICaseStudy> {
  try {
    // Create a detailed prompt for GPT
    const prompt = `Generate a detailed physiotherapy case study for a patient with a ${input.bodyPart} issue. 
      This should be a ${input.complexity} level case appropriate for physiotherapy students or practitioners.
      
      IMPORTANT: The case title should focus on patient symptoms and demographics (e.g., "Office Worker with Persistent Shoulder Pain") 
      rather than revealing the diagnosis (e.g., avoid "Rotator Cuff Tendinopathy in Office Worker").
      
      Please structure your response as a JSON object with the following format:
      {
        "title": "Symptom-based title focusing on patient presentation (avoid revealing the diagnosis)",
        "patientDescription": "Brief demographic information and relevant background",
        "history": "Detailed patient history of present condition",
        "presentingSymptoms": "Current symptoms and patient complaints",
        "vitalSigns": "Any relevant vital signs if applicable",
        "hiddenFindings": {
          "rangeOfMotion": "Findings from ROM testing",
          "strength": "Findings from strength testing",
          "specialTests": "Results from special tests",
          "palpation": "Findings from palpation",
          "additionalObservations": "Any other relevant clinical findings"
        },
        "correctDiagnosis": "The correct diagnosis with specific details",
        "differentialDiagnoses": ["List of 3-5 differential diagnoses to consider"],
        "correctAssessmentApproach": ["List of 5-8 specific assessment procedures that should be used"],
        "correctTreatmentApproach": "Detailed evidence-based treatment plan"
        ${input.includeResearch ? `,
        "researchBasis": ["List of 3-5 recent (last 5 years) research papers supporting this approach"],
        "expertSources": ["List of 2-3 expert physiotherapists known for work in this area"]` : ""}
      }
      
      For the ${input.bodyPart} case, make sure to include:
      1. Realistic, clinically accurate presentation for the complexity level
      2. Accurate special tests with correct expected results
      3. Evidence-based assessment and treatment approaches
      4. If including research, cite real, recent studies with authors and approximate years
      
      Make the case realistic but educational, highlighting key clinical reasoning aspects appropriate for a ${input.complexity} level.`;

    // Call OpenAI API to generate case study
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist and educator specialized in creating realistic clinical case studies based on current evidence and best practice."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const generatedCase = JSON.parse(response.choices[0].message.content);

    // Add some expert sources if none were provided or if expert sources are needed
    if (input.includeResearch && (!generatedCase.expertSources || generatedCase.expertSources.length === 0)) {
      generatedCase.expertSources = expertSourcesByBodyPart[input.bodyPart] || 
                                    expertSourcesByBodyPart.general;
    }

    // Return the case study with user ID
    return {
      ...generatedCase,
      bodyPart: input.bodyPart,
      complexity: input.complexity,
      userId: userId,
      createdAt: new Date()
    };
  } catch (error) {
    console.error("Error generating AI case study:", error);
    throw new Error(`Failed to generate case study: ${error.message}`);
  }
}

/**
 * Generates diagnostic feedback for a user's attempt at a case study
 * @param input The user's diagnostic attempt
 * @param caseStudy The original case study
 * @returns Feedback object with scores and comments
 */
export async function generateDiagnosticFeedback(
  input: DiagnosticFeedbackInput,
  caseStudy: AICaseStudy
): Promise<any> {
  try {
    // Create a detailed prompt for feedback generation
    const prompt = `As an expert physiotherapy educator, provide detailed feedback on a student's diagnostic attempt for a case study.
    
    THE CASE STUDY:
    Title: ${caseStudy.title}
    Body Part: ${caseStudy.bodyPart}
    Complexity: ${caseStudy.complexity}
    Correct Diagnosis: ${caseStudy.correctDiagnosis}
    Differential Diagnoses: ${caseStudy.differentialDiagnoses.join(', ')}
    Correct Assessment Approach: ${caseStudy.correctAssessmentApproach.join(', ')}
    Correct Treatment Approach: ${caseStudy.correctTreatmentApproach}
    
    THE STUDENT'S ATTEMPT:
    Diagnosis: ${input.userDiagnosis}
    Clinical Reasoning: ${input.userReasoning}
    Assessment Tests Selected: ${input.assessmentTests.join(', ')}
    Proposed Treatment: ${input.proposedTreatment}
    
    Please evaluate the attempt and provide detailed feedback in the following JSON format:
    {
      "diagnosisFeedback": "Detailed feedback on diagnosis accuracy and clinical reasoning",
      "assessmentFeedback": "Feedback on assessment test selection",
      "treatmentFeedback": "Feedback on treatment plan appropriateness",
      "keyLearningPoints": ["3-5 specific learning points"],
      "suggestedResources": ["2-3 specific resources for further learning"],
      "diagnosisAccuracy": 0-100,
      "assessmentAccuracy": 0-100,
      "treatmentAccuracy": 0-100,
      "overallAccuracy": 0-100
    }
    
    Score each area (diagnosis, assessment, treatment) from 0-100 based on:
    - Accuracy compared to correct answer
    - Completeness of approach
    - Clinical reasoning quality
    - Evidence-based decision making
    
    Be constructive, educational, and specific in your feedback. Include what was done well and what could be improved.`;

    // Call OpenAI API to generate feedback
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapy educator specialized in providing educational feedback on clinical reasoning and practice."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    // Parse and return the feedback
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating diagnostic feedback:", error);
    // Instead of throwing an error, provide fallback feedback
    return createFallbackFeedback(input, caseStudy);
  }
}

/**
 * Creates fallback feedback when the OpenAI API call fails
 * @param input The user's diagnostic attempt
 * @param caseStudy The original case study
 * @returns A feedback object with basic scores and comments
 */
function createFallbackFeedback(input: DiagnosticFeedbackInput, caseStudy: AICaseStudy): any {
  // Calculate basic diagnosis score
  let diagnosisAccuracy = calculateSimilarityScore(input.userDiagnosis, caseStudy.correctDiagnosis);
  
  // Calculate assessment score based on test selection
  let assessmentAccuracy = 0;
  const correctTests = caseStudy.correctAssessmentApproach.map(test => test.toLowerCase());
  const selectedTests = input.assessmentTests.map(test => test.toLowerCase());
  
  // Count matching tests
  const matchCount = selectedTests.filter(test => 
    correctTests.some(correct => correct.includes(test) || test.includes(correct))
  ).length;
  
  if (correctTests.length > 0) {
    assessmentAccuracy = Math.min(100, Math.round((matchCount / correctTests.length) * 100));
  }
  
  // Calculate treatment score
  let treatmentAccuracy = calculateSimilarityScore(input.proposedTreatment, caseStudy.correctTreatmentApproach);
  
  // Calculate overall score
  const overallAccuracy = Math.round((diagnosisAccuracy + assessmentAccuracy + treatmentAccuracy) / 3);
  
  // Prepare feedback
  return {
    diagnosisFeedback: `Your diagnosis was ${diagnosisAccuracy}% aligned with the expected diagnosis of "${caseStudy.correctDiagnosis}". ${
      diagnosisAccuracy > 75 
        ? "Great work identifying the key clinical presentation."
        : "Consider reviewing the key symptoms and clinical patterns for this condition."
    }`,
    assessmentFeedback: `You selected ${selectedTests.length} assessment tests, with ${matchCount} matching the recommended approach. ${
      assessmentAccuracy > 75
        ? "Your assessment selection was comprehensive and targeted."
        : "Consider including these key tests in your assessment: " + caseStudy.correctAssessmentApproach.join(", ")
    }`,
    treatmentFeedback: `Your treatment plan was ${treatmentAccuracy}% aligned with evidence-based recommendations. ${
      treatmentAccuracy > 75
        ? "Your proposed interventions demonstrate sound clinical reasoning."
        : "Consider incorporating these evidence-based approaches: " + caseStudy.correctTreatmentApproach
    }`,
    keyLearningPoints: [
      "Always connect assessment findings directly to your diagnostic reasoning",
      "Select assessment tests that specifically confirm or rule out your differential diagnoses",
      "Ensure your treatment approach is aligned with current best practice for this condition",
      "Consider the patient's specific presentation when developing your treatment plan"
    ],
    suggestedResources: [
      `Current clinical practice guidelines for ${caseStudy.bodyPart} conditions`,
      `Evidence-based assessment and treatment approaches for ${caseStudy.correctDiagnosis}`
    ],
    diagnosisAccuracy,
    assessmentAccuracy,
    treatmentAccuracy,
    overallAccuracy
  };
}

/**
 * Calculates a simple text similarity score
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Similarity score 0-100
 */
function calculateSimilarityScore(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  for (const word of words1) {
    if (word.length > 3 && words2.some(w => w.includes(word) || word.includes(w))) {
      matchCount++;
    }
  }
  
  const totalWords = Math.max(words1.length, 1);
  return Math.min(100, Math.round((matchCount / totalWords) * 100));
}