/**
 * Enhanced Virtual Patient AI with Sports Map Australia Approach
 * 
 * This module extends the virtual patient system to incorporate Sports Map Australia's 
 * evidence-based sports rehabilitation approach, providing specialized
 * analysis and treatment recommendations for athletic injuries and sports performance.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { 
  sportsMapAssessmentPrinciples, 
  sportsMapConditionApproaches, 
  sportsMapSportSpecificApproaches, 
  sportsMapTreatmentPrinciples,
  sportsMapResearchArticles,
  getSportsMapExercises
} from "./sportsMapLibrary";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient using Sports Map Australia's approach
 * @param patient Virtual patient data
 * @returns Enhanced analysis with Sports Map-specific recommendations
 */
export async function analyzePatientSportsMap(patient: VirtualPatient) {
  try {
    // Create a comprehensive prompt that incorporates Sports Map's approach
    const prompt = constructSportsMapPrompt(patient);
    
    // Get specialized analysis using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are an expert sports physiotherapist using Sports Map Australia's evidence-based approach. Analyze the patient case and provide a detailed assessment, diagnosis, and return-to-sport plan following Sports Map's principles for athletic injuries."
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
      console.error("Error parsing Sports Map analysis response:", parseError);
      // Use a simplified format if parsing fails, but still proceed
      analysisResult = {
        diagnosis: "Athletic condition requiring Sports Map approach",
        differentialDiagnosis: [],
        treatmentOptions: [],
        assessmentTests: []
      };
    }

    // Get related research article IDs for the diagnosis
    const relatedArticleIds = getRelatedSportsMapResearchIds(
      analysisResult.diagnosis,
      patient.body_part || ""
    );

    // Enhanced return object with more Sports Map-specific content
    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis,
      treatmentOptions: analysisResult.treatmentOptions,
      sportsMapSpecificApproach: true,
      assessmentTests: analysisResult.assessmentTests,
      relatedArticleIds: relatedArticleIds,
      sportsMapMethodology: {
        approachName: "Sports Map Performance Framework",
        keyPrinciples: sportsMapTreatmentPrinciples.slice(0, 5).map(p => p.title),
        assessmentFocus: sportsMapAssessmentPrinciples.slice(0, 3).map(p => p.title),
        evidenceStrength: "High - Based on sport-specific research and performance science"
      }
    };
  } catch (error) {
    console.error("Error in Sports Map analysis:", error);
    return createFallbackSportsMapAnalysis(patient);
  }
}

/**
 * Constructs a prompt for analyzing patients using Sports Map's approach
 * @param patient Virtual patient data
 * @returns Formatted prompt with Sports Map-specific context
 */
function constructSportsMapPrompt(patient: VirtualPatient): string {
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

  // Include Sports Map's key assessment principles
  const assessmentPrinciples = sportsMapAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Sports Map's key treatment principles
  const treatmentPrinciples = sportsMapTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Determine relevant sport category based on patient information
  let sportSpecificInfo = "";
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""} ${patient.past_medical_history || ""}`.toLowerCase();
  
  // Identify sports mentioned in patient information
  const runningTerms = ["run", "running", "runner", "marathon", "sprinting", "jogging"];
  const teamSportTerms = ["soccer", "football", "basketball", "rugby", "hockey", "netball", "cricket", "baseball", "team sport"];
  const overheadTerms = ["tennis", "swimming", "throwing", "pitcher", "volleyball", "racquet", "badminton", "overhead"];
  
  let sportCategory = "";
  if (runningTerms.some(term => patientText.includes(term))) {
    sportCategory = "Running Sports";
  } else if (teamSportTerms.some(term => patientText.includes(term))) {
    sportCategory = "Team Field Sports";
  } else if (overheadTerms.some(term => patientText.includes(term))) {
    sportCategory = "Overhead Sports";
  }
  
  // Add sport-specific approaches if a category was identified
  if (sportCategory) {
    const sportApproaches = sportsMapSportSpecificApproaches.find(
      category => category.sportCategory === sportCategory
    );
    
    if (sportApproaches) {
      sportSpecificInfo += `\nSPORTS MAP APPROACH FOR ${sportCategory.toUpperCase()}:\n`;
      sportApproaches.approaches.forEach(approach => {
        sportSpecificInfo += `- ${approach.name}: ${approach.description}\n`;
        sportSpecificInfo += `  Key features: ${approach.keyFeatures.join(', ')}\n`;
      });
    }
  }

  // Identify relevant condition approaches
  let conditionApproaches = "";
  sportsMapConditionApproaches.forEach(approach => {
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
Analyze this patient case from a Sports Map Australia sports physiotherapy perspective. Provide a detailed assessment, most likely diagnosis, differential diagnoses, and comprehensive return-to-sport rehabilitation plan. Your analysis should incorporate Sports Map's evidence-based approaches for athletic injuries and sports performance.

SPORTS MAP KEY ASSESSMENT PRINCIPLES:
${assessmentPrinciples}

SPORTS MAP KEY TREATMENT PRINCIPLES:
${treatmentPrinciples}

${sportSpecificInfo}
${conditionApproaches}

FORMAT YOUR RESPONSE AS A JSON OBJECT WITH THE FOLLOWING STRUCTURE:
{
  "diagnosis": "Primary diagnosis with rationale",
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
    "acuteManagement": ["Immediate interventions with rationale"],
    "rehabilitationPhases": [
      {"phase": "Early Phase", "goals": ["Goal 1", "Goal 2"], "interventions": ["Intervention 1", "Intervention 2"]},
      {"phase": "Mid Phase", "goals": ["Goal 1", "Goal 2"], "interventions": ["Intervention 1", "Intervention 2"]},
      {"phase": "Late Phase", "goals": ["Goal 1", "Goal 2"], "interventions": ["Intervention 1", "Intervention 2"]},
      {"phase": "Return to Sport", "goals": ["Goal 1", "Goal 2"], "interventions": ["Intervention 1", "Intervention 2"]}
    ],
    "exercisePrescription": [
      {"name": "Exercise name 1", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 2", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 3", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"}
    ],
    "sportSpecificConsiderations": ["Sport-specific considerations"],
    "returnToPlayCriteria": ["Specific criteria that must be met before return to play"]
  },
  "sportsMapApproach": {
    "keyPrinciples": ["Specific Sports Map principles most relevant to this case"],
    "specialConsiderations": ["Unique aspects of Sports Map's approach for this presentation"],
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
function getRelatedSportsMapResearchIds(
  diagnosis: string,
  bodyPart: string
): string[] {
  try {
    // Find Sports Map research articles related to this body part or diagnosis
    const relatedArticles = sportsMapResearchArticles
      .filter(article => 
        article.bodyPart === bodyPart ||
        (diagnosis && article.abstract.toLowerCase().includes(diagnosis.toLowerCase())) ||
        article.keywords.some(keyword => diagnosis.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map(article => article.id.toString());
      
    // If no specific matches, return general articles
    if (relatedArticles.length === 0) {
      return sportsMapResearchArticles
        .slice(0, 3)
        .map(article => article.id.toString());
    }
    
    return relatedArticles.slice(0, 5);
  } catch (error) {
    console.error("Error finding related Sports Map research IDs:", error);
    return ["3001", "3002", "3003"]; // Default to key sports rehab articles
  }
}

/**
 * Creates fallback analysis using Sports Map's approach when AI analysis fails
 * @param patient Virtual patient data
 * @returns Basic analysis using Sports Map principles
 */
function createFallbackSportsMapAnalysis(patient: VirtualPatient): any {
  // Default diagnosis based on body part
  let diagnosis = "Athletic injury requiring sports-specific rehabilitation";
  let differentialDiagnosis: any[] = [];
  let treatmentOptions = {
    acuteManagement: ["Optimal loading within pain limits", "Graduated return to activity"],
    rehabilitationPhases: [
      {
        phase: "Early Phase", 
        goals: ["Control pain and inflammation", "Restore basic movement patterns"], 
        interventions: ["Progressive loading", "Neuromuscular control exercises"]
      },
      {
        phase: "Mid Phase", 
        goals: ["Restore strength and control", "Sport-specific movement patterns"], 
        interventions: ["Progressive strength training", "Functional movement training"]
      },
      {
        phase: "Late Phase", 
        goals: ["Sport-specific capacity", "Return to training integration"], 
        interventions: ["Sport-specific drills", "Positional training"]
      },
      {
        phase: "Return to Sport", 
        goals: ["Full sports participation", "Injury prevention strategies"], 
        interventions: ["Competition simulation", "Monitoring and load management"]
      }
    ],
    exercisePrescription: [],
    sportSpecificConsiderations: ["Gradual return to full training intensity", "Position-specific rehabilitation"],
    returnToPlayCriteria: ["Full pain-free range of motion", "Sport-specific functional testing within 90% of baseline"]
  };
  
  // Customize based on body part if available
  if (patient.body_part) {
    diagnosis = `Sports-related ${patient.body_part} injury`;
    
    // Find the most relevant condition approach for this body part
    const conditionApproach = sportsMapConditionApproaches.find(
      approach => approach.condition.toLowerCase().includes(patient.body_part || "")
    );
    
    if (conditionApproach) {
      diagnosis = conditionApproach.condition;
      treatmentOptions.acuteManagement = conditionApproach.keyPrinciples.slice(0, 2);
      treatmentOptions.returnToPlayCriteria = conditionApproach.keyPrinciples.slice(-2);
    }
    
    // Add relevant exercises based on body part
    const exercises = getSportsMapExercises().filter(exercise => 
      exercise.bodyPart === patient.body_part
    );
    
    if (exercises.length > 0) {
      treatmentOptions.exercisePrescription = exercises.slice(0, 3).map(exercise => ({
        name: exercise.title,
        purpose: exercise.description.split('.')[0],
        technique: exercise.instructions,
        progression: "Progress by increasing load, complexity, and sport-specificity"
      }));
    }
  }
  
  // Identify likely sport based on available information
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""} ${patient.past_medical_history || ""}`.toLowerCase();
  
  const runningTerms = ["run", "running", "runner", "marathon", "sprinting", "jogging"];
  const teamSportTerms = ["soccer", "football", "basketball", "rugby", "hockey", "netball", "cricket", "baseball", "team sport"];
  const overheadTerms = ["tennis", "swimming", "throwing", "pitcher", "volleyball", "racquet", "badminton", "overhead"];
  
  if (runningTerms.some(term => patientText.includes(term))) {
    treatmentOptions.sportSpecificConsiderations.push("Running mechanics assessment and retraining");
    treatmentOptions.returnToPlayCriteria.push("Progressive running volume without symptom recurrence");
  } else if (teamSportTerms.some(term => patientText.includes(term))) {
    treatmentOptions.sportSpecificConsiderations.push("Multidirectional movement and agility progression");
    treatmentOptions.returnToPlayCriteria.push("Full speed change of direction testing without compensation");
  } else if (overheadTerms.some(term => patientText.includes(term))) {
    treatmentOptions.sportSpecificConsiderations.push("Kinetic chain integration for overhead activities");
    treatmentOptions.returnToPlayCriteria.push("Full power overhead activity without pain or compensation");
  }
  
  return {
    diagnosis: diagnosis,
    differentialDiagnosis: differentialDiagnosis,
    treatmentOptions: treatmentOptions,
    sportsMapSpecificApproach: true,
    assessmentTests: [],
    relatedArticleIds: getRelatedSportsMapResearchIds(diagnosis, patient.body_part || ""),
    sportsMapMethodology: {
      approachName: "Sports Map Performance Framework",
      keyPrinciples: sportsMapTreatmentPrinciples.slice(0, 5).map(p => p.title),
      assessmentFocus: sportsMapAssessmentPrinciples.slice(0, 3).map(p => p.title),
      evidenceStrength: "High - Based on sport-specific research and performance science"
    }
  };
}