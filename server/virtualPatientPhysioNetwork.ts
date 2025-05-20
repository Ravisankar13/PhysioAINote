/**
 * Enhanced Virtual Patient AI with Physio Network Approach
 * 
 * This module extends the virtual patient system to incorporate Physio Network's 
 * evidence-based pain science and rehabilitation approach, providing specialized
 * analysis and treatment recommendations focusing on contemporary pain science.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { 
  physioNetworkAssessmentPrinciples, 
  physioNetworkConditionApproaches, 
  physioNetworkPainApproaches, 
  physioNetworkTreatmentPrinciples,
  physioNetworkResearchArticles,
  getPhysioNetworkExercises
} from "./physioNetworkLibrary";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient using Physio Network's approach
 * @param patient Virtual patient data
 * @returns Enhanced analysis with Physio Network-specific recommendations
 */
export async function analyzePatientPhysioNetwork(patient: VirtualPatient) {
  try {
    // Create a comprehensive prompt that incorporates Physio Network's approach
    const prompt = constructPhysioNetworkPrompt(patient);
    
    // Get specialized analysis using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist using Physio Network's evidence-based pain science approach. Analyze the patient case and provide a detailed assessment, diagnosis, and treatment plan following contemporary pain science principles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    // Parse the AI response with error handling
    let analysisResult;
    try {
      analysisResult = JSON.parse(response.choices[0].message.content!);
    } catch (parseError) {
      console.error("Error parsing Physio Network analysis response:", parseError);
      // Use a simplified format if parsing fails, but still proceed
      analysisResult = {
        diagnosis: "Condition requiring Physio Network pain science approach",
        differentialDiagnosis: [],
        treatmentOptions: [],
        assessmentTests: []
      };
    }

    // Get related research article IDs for the diagnosis
    const relatedArticleIds = getRelatedPhysioNetworkResearchIds(
      analysisResult.diagnosis,
      patient.body_part || ""
    );

    // Enhanced return object with more Physio Network-specific content
    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis,
      treatmentOptions: analysisResult.treatmentOptions,
      physioNetworkSpecificApproach: true,
      assessmentTests: analysisResult.assessmentTests,
      relatedArticleIds: relatedArticleIds,
      physioNetworkMethodology: {
        approachName: "Physio Network Pain Science Framework",
        keyPrinciples: physioNetworkTreatmentPrinciples.slice(0, 5).map(p => p.title),
        assessmentFocus: physioNetworkAssessmentPrinciples.slice(0, 3).map(p => p.title),
        painApproaches: physioNetworkPainApproaches.slice(0, 2).map(pa => pa.name),
        evidenceStrength: "High - Based on contemporary pain science research"
      }
    };
  } catch (error) {
    console.error("Error in Physio Network analysis:", error);
    return createFallbackPhysioNetworkAnalysis(patient);
  }
}

/**
 * Constructs a prompt for analyzing patients using Physio Network's approach
 * @param patient Virtual patient data
 * @returns Formatted prompt with Physio Network-specific context
 */
function constructPhysioNetworkPrompt(patient: VirtualPatient): string {
  // Format patient data for the prompt
  const patientInfo = `
PATIENT INFORMATION:
- Name: ${patient.patient_name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Chief Complaint: ${patient.chief_complaint}
- Symptoms Description: ${patient.symptoms_description}
- Medical History: ${patient.past_medical_history || "None reported"}
- Body Part: ${patient.body_part || "unspecified"}
`;

  // Include Physio Network's key assessment principles
  const assessmentPrinciples = physioNetworkAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Physio Network's key treatment principles
  const treatmentPrinciples = physioNetworkTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Physio Network's pain science approaches
  const painApproaches = physioNetworkPainApproaches
    .map(p => `- ${p.name}: ${p.description}\n  Key features: ${p.keyFeatures.join(', ')}`)
    .join("\n");

  // Identify relevant condition approaches
  let conditionApproaches = "";
  physioNetworkConditionApproaches.forEach(approach => {
    // Check if symptoms or chief complaint mentions the condition
    if (patient.symptoms_description?.toLowerCase().includes(approach.condition.toLowerCase()) ||
        patient.chief_complaint?.toLowerCase().includes(approach.condition.toLowerCase())) {
      conditionApproaches += `\nRELEVANT CONDITION APPROACH: ${approach.condition}\n`;
      conditionApproaches += approach.keyPrinciples.map(p => `- ${p}`).join("\n");
      conditionApproaches += `\nEvidence: ${approach.evidence}\n`;
    }
  });

  // Compile the complete prompt
  return `
${patientInfo}

TASK:
Analyze this patient case from a Physio Network contemporary pain science perspective. Provide a detailed assessment, biopsychosocial analysis of their pain, most likely diagnosis, differential diagnoses, and treatment plan. Your analysis should incorporate Physio Network's evidence-based pain science approaches.

PHYSIO NETWORK KEY ASSESSMENT PRINCIPLES:
${assessmentPrinciples}

PHYSIO NETWORK KEY TREATMENT PRINCIPLES:
${treatmentPrinciples}

PHYSIO NETWORK PAIN SCIENCE APPROACHES:
${painApproaches}

${conditionApproaches}

FORMAT YOUR RESPONSE AS A JSON OBJECT WITH THE FOLLOWING STRUCTURE:
{
  "diagnosis": "Primary diagnosis with rationale",
  "painMechanisms": {
    "nociceptive": "Analysis of nociceptive contributions",
    "neuropathic": "Analysis of neuropathic contributions",
    "nociplastic": "Analysis of nociplastic/central sensitization contributions",
    "cognitive": "Analysis of cognitive-emotional contributions",
    "contextual": "Analysis of contextual and environmental factors"
  },
  "differentialDiagnosis": [
    {"condition": "Alternative diagnosis 1", "likelihood": "percentage likelihood", "rationale": "reasoning"},
    {"condition": "Alternative diagnosis 2", "likelihood": "percentage likelihood", "rationale": "reasoning"},
    {"condition": "Alternative diagnosis 3", "likelihood": "percentage likelihood", "rationale": "reasoning"}
  ],
  "assessmentTests": [
    {"name": "Test name 1", "purpose": "What this test evaluates", "technique": "How to perform", "interpretation": "What results mean"},
    {"name": "Test name 2", "purpose": "What this test evaluates", "technique": "How to perform", "interpretation": "What results mean"},
    {"name": "Test name 3", "purpose": "What this test evaluates", "technique": "How to perform", "interpretation": "What results mean"}
  ],
  "treatmentOptions": {
    "painEducation": ["Key pain science education points specific to this patient"],
    "gradedExposureProgression": ["Progressive steps with rationale"],
    "exercisePrescription": [
      {"name": "Exercise name 1", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 2", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 3", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"}
    ],
    "lifestyleModifications": ["Specific lifestyle factors to address"],
    "expectedOutcomes": ["Realistic prognosis and timeframes"]
  },
  "physioNetworkApproach": {
    "keyPrinciples": ["Specific Physio Network principles most relevant to this case"],
    "specialConsiderations": ["Unique aspects of Physio Network's approach for this presentation"],
    "evidenceBase": ["Research supporting this approach for this condition"]
  }
}
`;
}

/**
 * Gets related research article IDs based on the diagnosis and body part
 * @param diagnosis Primary diagnosis
 * @param bodyPart Body part affected
 * @returns Array of related article IDs
 */
function getRelatedPhysioNetworkResearchIds(
  diagnosis: string,
  bodyPart: string
): string[] {
  try {
    // Find Physio Network research articles related to this body part or diagnosis
    const relatedArticles = physioNetworkResearchArticles
      .filter(article => 
        article.bodyPart === bodyPart ||
        (diagnosis && article.abstract.toLowerCase().includes(diagnosis.toLowerCase())) ||
        article.keywords.some(keyword => diagnosis.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map(article => article.id.toString());
      
    // If no specific matches, return general articles
    if (relatedArticles.length === 0) {
      return physioNetworkResearchArticles
        .slice(0, 3)
        .map(article => article.id.toString());
    }
    
    return relatedArticles.slice(0, 5);
  } catch (error) {
    console.error("Error finding related Physio Network research IDs:", error);
    return ["2001", "2002", "2004"]; // Default to key pain science articles
  }
}

/**
 * Creates fallback analysis using Physio Network's approach when AI analysis fails
 * @param patient Virtual patient data
 * @returns Basic analysis using Physio Network principles
 */
function createFallbackPhysioNetworkAnalysis(patient: VirtualPatient): any {
  // Default diagnosis based on body part and contemporary pain science
  let diagnosis = "Pain condition requiring biopsychosocial approach";
  let differentialDiagnosis = [];
  let treatmentOptions = {
    painEducation: ["Contemporary pain education on biopsychosocial model", "Understanding pain as an output not just input"],
    gradedExposureProgression: ["Graduated exposure to feared or avoided movements", "Progressive building of self-efficacy"],
    exercisePrescription: [],
    lifestyleModifications: ["Sleep hygiene strategies", "Stress management techniques"],
    expectedOutcomes: ["Improved understanding of pain mechanisms", "Increased functional capacity and reduced fear-avoidance"]
  };
  
  // Customize based on body part if available
  if (patient.body_part) {
    diagnosis = `${patient.body_part} pain condition with potential nociplastic contributions`;
    
    // Find the most appropriate pain approach for this presentation
    const painApproach = physioNetworkPainApproaches[0]; // Default to first approach
    
    if (painApproach) {
      // Add specialized approaches to treatment options
      treatmentOptions.painEducation = painApproach.keyFeatures;
    }
    
    // Add relevant exercises based on body part
    const exercises = getPhysioNetworkExercises().filter(exercise => 
      exercise.bodyPart === patient.body_part || exercise.bodyPart === "general"
    );
    
    if (exercises.length > 0) {
      treatmentOptions.exercisePrescription = exercises.slice(0, 3).map(exercise => ({
        name: exercise.title,
        purpose: exercise.description.split('.')[0],
        technique: exercise.instructions,
        progression: "Progress by increasing duration, complexity, or reducing feedback"
      }));
    }
  }
  
  return {
    diagnosis: diagnosis,
    painMechanisms: {
      nociceptive: "Potential tissue-based contributions to pain experience",
      neuropathic: "No clear signs of nerve-related pain based on presentation",
      nociplastic: "Possible central sensitization contributing to overall experience",
      cognitive: "Patient beliefs and expectations may be influencing pain experience",
      contextual: "Environmental and contextual factors should be explored"
    },
    differentialDiagnosis: differentialDiagnosis,
    treatmentOptions: treatmentOptions,
    physioNetworkSpecificApproach: true,
    assessmentTests: [],
    relatedArticleIds: getRelatedPhysioNetworkResearchIds(diagnosis, patient.body_part || ""),
    physioNetworkMethodology: {
      approachName: "Physio Network Pain Science Framework",
      keyPrinciples: physioNetworkTreatmentPrinciples.slice(0, 5).map(p => p.title),
      assessmentFocus: physioNetworkAssessmentPrinciples.slice(0, 3).map(p => p.title),
      painApproaches: physioNetworkPainApproaches.slice(0, 2).map(pa => pa.name),
      evidenceStrength: "High - Based on contemporary pain science research"
    }
  };
}