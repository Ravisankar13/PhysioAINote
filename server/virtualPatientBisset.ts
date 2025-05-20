/**
 * Enhanced Virtual Patient AI with Leanne Bisset's Elbow Rehabilitation Approach
 * 
 * This module extends the virtual patient system to incorporate Leanne Bisset's 
 * evidence-based approach to elbow rehabilitation, providing specialized
 * analysis and treatment recommendations for elbow conditions.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { 
  bissetAssessmentPrinciples, 
  bissetConditionApproaches, 
  bissetElbowApproaches, 
  bissetTreatmentPrinciples,
  bissetResearchArticles,
  getBissetElbowExercises
} from "./bisset-elbow-library";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient using Bisset's elbow rehabilitation approach
 * @param patient Virtual patient data
 * @returns Enhanced analysis with Bisset-specific elbow rehabilitation recommendations
 */
export async function analyzePatientBisset(patient: VirtualPatient) {
  try {
    // Create a comprehensive prompt that incorporates Bisset's approach
    const prompt = constructBissetPrompt(patient);
    
    // Get specialized elbow analysis using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist specializing in elbow rehabilitation using Leanne Bisset's evidence-based approach. Analyze the patient case and provide a detailed assessment, diagnosis, and treatment plan following Bisset's principles for elbow conditions."
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
      console.error("Error parsing Bisset elbow analysis response:", parseError);
      // Use a simplified format if parsing fails, but still proceed
      analysisResult = {
        diagnosis: "Elbow condition requiring Bisset's approach",
        differentialDiagnosis: [],
        treatmentOptions: [],
        assessmentTests: []
      };
    }

    // Get related research article IDs for the diagnosis
    const relatedArticleIds = getRelatedBissetResearchIds(
      analysisResult.diagnosis,
      patient.body_part || ""
    );

    // Enhanced return object with more Bisset-specific content
    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis,
      treatmentOptions: analysisResult.treatmentOptions,
      bissetSpecificApproach: true,
      assessmentTests: analysisResult.assessmentTests,
      relatedArticleIds: relatedArticleIds,
      bissetMethodology: {
        approachName: "Leanne Bisset Elbow Rehabilitation Framework",
        keyPrinciples: bissetTreatmentPrinciples.slice(0, 5).map(p => p.title),
        assessmentFocus: bissetAssessmentPrinciples.slice(0, 3).map(p => p.title),
        evidenceStrength: "High - Based on specialized research in elbow rehabilitation"
      }
    };
  } catch (error) {
    console.error("Error in Bisset elbow analysis:", error);
    return createFallbackBissetAnalysis(patient);
  }
}

/**
 * Constructs a prompt for analyzing patients using Bisset's approach
 * @param patient Virtual patient data
 * @returns Formatted prompt with Bisset-specific elbow rehabilitation context
 */
function constructBissetPrompt(patient: VirtualPatient): string {
  // Format patient data for the prompt
  const patientInfo = `
PATIENT INFORMATION:
- Name: ${patient.patient_name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Chief Complaint: ${patient.chief_complaint}
- Symptoms Description: ${patient.symptoms_description}
- Medical History: ${patient.past_medical_history || "None reported"}
- Body Part: ${patient.body_part || "elbow"}
`;

  // Include Bisset's key assessment principles
  const assessmentPrinciples = bissetAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Bisset's key treatment principles
  const treatmentPrinciples = bissetTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Bisset's specialized elbow approaches
  const elbowApproaches = bissetElbowApproaches
    .map(a => `- ${a.name}: ${a.description}\n  Key features: ${a.keyFeatures.join(', ')}`)
    .join("\n");

  // Identify relevant condition approaches
  let conditionApproaches = "";
  bissetConditionApproaches.forEach(approach => {
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
Analyze this patient case from Leanne Bisset's elbow rehabilitation perspective. Provide a detailed assessment, most likely diagnosis, differential diagnoses, and treatment plan. Your analysis should incorporate Bisset's evidence-based approach to elbow conditions.

BISSET'S KEY ASSESSMENT PRINCIPLES:
${assessmentPrinciples}

BISSET'S KEY TREATMENT PRINCIPLES:
${treatmentPrinciples}

BISSET'S SPECIALIZED ELBOW APPROACHES:
${elbowApproaches}

${conditionApproaches}

FORMAT YOUR RESPONSE AS A JSON OBJECT WITH THE FOLLOWING STRUCTURE:
{
  "diagnosis": "Primary diagnosis with rationale",
  "painMechanisms": {
    "local": "Analysis of local tissue contributions",
    "neural": "Analysis of peripheral neural contributions",
    "central": "Analysis of central pain processing contributions"
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
    "immediateInterventions": ["Short-term interventions with rationale"],
    "rehabilitationProgression": ["Progressive steps with rationale"],
    "exercisePrescription": [
      {"name": "Exercise name 1", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 2", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 3", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"}
    ],
    "manualTherapyApproaches": ["Specific manual therapy techniques if appropriate"],
    "activityModifications": ["Key activity modifications during rehabilitation"],
    "expectedOutcomes": ["Realistic prognosis and timeframes"]
  },
  "bissetApproach": {
    "keyPrinciples": ["Specific Bisset principles most relevant to this case"],
    "specialConsiderations": ["Unique aspects of Bisset's approach for this presentation"],
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
function getRelatedBissetResearchIds(
  diagnosis: string,
  bodyPart: string
): string[] {
  try {
    // For Bisset's approach, we focus on elbow-related articles
    if (bodyPart.toLowerCase() !== "elbow") {
      // Return empty array if not elbow-related
      return [];
    }
    
    // Find Bisset research articles related to this diagnosis
    const relatedArticles = bissetResearchArticles
      .filter(article => 
        (diagnosis && article.abstract.toLowerCase().includes(diagnosis.toLowerCase())) ||
        article.keywords.some(keyword => diagnosis.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map(article => article.id.toString());
      
    // If no specific matches, return general elbow articles
    if (relatedArticles.length === 0) {
      return bissetResearchArticles
        .slice(0, 3)
        .map(article => article.id.toString());
    }
    
    return relatedArticles.slice(0, 5);
  } catch (error) {
    console.error("Error finding related Bisset research IDs:", error);
    return ["5001", "5002", "5005"]; // Default to key elbow rehab articles
  }
}

/**
 * Creates fallback analysis using Bisset's approach when AI analysis fails
 * @param patient Virtual patient data
 * @returns Basic analysis using Bisset's elbow rehabilitation principles
 */
function createFallbackBissetAnalysis(patient: VirtualPatient): any {
  // Default diagnosis for elbow conditions
  let diagnosis = "Elbow condition requiring specialized rehabilitation";
  let painMechanisms = {
    local: "Possible local tissue involvement contributing to pain experience",
    neural: "Potential neural tissue sensitivity to be assessed",
    central: "Consideration of central pain processing factors"
  };
  let differentialDiagnosis = [];
  let treatmentOptions = {
    immediateInterventions: ["Identification and modification of aggravating activities", "Education on pain mechanisms and tissue loading"],
    rehabilitationProgression: ["Staged loading program based on tissue irritability", "Progressive integration of functional tasks"],
    exercisePrescription: [],
    manualTherapyApproaches: ["Selected manual therapy techniques to modulate pain if appropriate", "Neural tissue mobilization if neural sensitivity present"],
    activityModifications: ["Modified gripping techniques for relevant activities", "Ergonomic assessment and modification for work tasks"],
    expectedOutcomes: ["Progressive improvement with appropriate load management", "Return to function with optimal movement patterns"]
  };
  
  // Customize based on keywords in symptoms or chief complaint
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""}`.toLowerCase();
  
  if (patientText.includes("lateral") || patientText.includes("tennis elbow") || patientText.includes("outer elbow")) {
    diagnosis = "Lateral elbow tendinopathy (Tennis elbow)";
    
    // Add specific exercises for lateral elbow tendinopathy
    treatmentOptions.exercisePrescription = [
      {
        name: "Graded Isometric Wrist Extension",
        purpose: "Pain modulation and initial tendon loading",
        technique: "Generate isometric contraction against resistance without movement",
        progression: "Increase hold time and effort as tolerated"
      },
      {
        name: "Progressive Eccentric Wrist Extension",
        purpose: "Promote tendon remodeling and strength",
        technique: "Use opposite hand to assist lifting weight, then lower slowly with affected side",
        progression: "Gradually increase weight as symptoms allow"
      },
      {
        name: "Forearm Supination Strengthening",
        purpose: "Address common strength deficits in forearm rotators",
        technique: "Hold light weight in hammer grip, rotate to palm-up position",
        progression: "Increase weight or hold time at end position"
      }
    ];
  } else if (patientText.includes("medial") || patientText.includes("golfer's elbow") || patientText.includes("inner elbow")) {
    diagnosis = "Medial elbow tendinopathy (Golfer's elbow)";
    
    // Add specific exercises for medial elbow tendinopathy
    treatmentOptions.exercisePrescription = [
      {
        name: "Graded Isometric Wrist Flexion",
        purpose: "Pain modulation and initial tendon loading",
        technique: "Generate isometric contraction against resistance without movement",
        progression: "Increase hold time and effort as tolerated"
      },
      {
        name: "Progressive Eccentric Wrist Flexion",
        purpose: "Promote tendon remodeling and strength",
        technique: "Use opposite hand to assist lifting weight, then lower slowly with affected side",
        progression: "Gradually increase weight as symptoms allow"
      }
    ];
  } else if (patientText.includes("nerve") || patientText.includes("tingling") || patientText.includes("numbness")) {
    diagnosis = "Radial nerve-related lateral elbow pain";
    
    // Add specific exercises for neural involvement
    treatmentOptions.exercisePrescription = [
      {
        name: "Radial Nerve Slider Technique",
        purpose: "Improve neural mobility without provoking symptoms",
        technique: "Simultaneously extend wrist while bending elbow, then flex wrist while straightening elbow",
        progression: "Increase range of motion or add gentle neck movements"
      },
      {
        name: "Sensitized Neural Tissue Desensitization",
        purpose: "Gradually reduce neural tissue sensitivity",
        technique: "Hold position that produces minimal neural symptoms briefly, then release",
        progression: "Increase hold time and move further into range as tolerance improves"
      }
    ];
  }
  
  return {
    diagnosis: diagnosis,
    painMechanisms: painMechanisms,
    differentialDiagnosis: differentialDiagnosis,
    treatmentOptions: treatmentOptions,
    bissetSpecificApproach: true,
    assessmentTests: [],
    relatedArticleIds: getRelatedBissetResearchIds(diagnosis, "elbow"),
    bissetMethodology: {
      approachName: "Leanne Bisset Elbow Rehabilitation Framework",
      keyPrinciples: bissetTreatmentPrinciples.slice(0, 5).map(p => p.title),
      assessmentFocus: bissetAssessmentPrinciples.slice(0, 3).map(p => p.title),
      evidenceStrength: "High - Based on specialized research in elbow rehabilitation"
    }
  };
}