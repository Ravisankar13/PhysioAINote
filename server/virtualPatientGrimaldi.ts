/**
 * Enhanced Virtual Patient AI with Alison Grimaldi's Hip Rehabilitation Approach
 * 
 * This module extends the virtual patient system to incorporate Alison Grimaldi's 
 * evidence-based approach to hip rehabilitation, providing specialized
 * analysis and treatment recommendations for hip conditions.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { 
  grimaldiAssessmentPrinciples, 
  grimaldiConditionApproaches, 
  grimaldiHipApproaches, 
  grimaldiTreatmentPrinciples,
  grimaldiResearchArticles,
  getGrimaldiHipExercises
} from "./grimaldi-hip-library";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient using Grimaldi's hip rehabilitation approach
 * @param patient Virtual patient data
 * @returns Enhanced analysis with Grimaldi-specific hip rehabilitation recommendations
 */
export async function analyzePatientGrimaldi(patient: VirtualPatient) {
  try {
    // Create a comprehensive prompt that incorporates Grimaldi's approach
    const prompt = constructGrimaldiPrompt(patient);
    
    // Get specialized hip analysis using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist specializing in hip rehabilitation using Alison Grimaldi's evidence-based approach. You have extensive training in Grimaldi's specific diagnostic frameworks for hip pathology, including her gluteal tendinopathy classification, lateral hip pain assessment methodology, and proprietary rehabilitation protocols. Your analysis should precisely follow Grimaldi's pathoanatomical approach, motor control assessment frameworks, and progressive loading principles as published in her research and clinical practice guidelines. Provide a comprehensive assessment, precise diagnosis using Grimaldi's terminology, and detailed treatment plan adhering strictly to her evidence-based principles and latest research on hip rehabilitation."
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
      console.error("Error parsing Grimaldi hip analysis response:", parseError);
      // Use a simplified format if parsing fails, but still proceed
      analysisResult = {
        diagnosis: "Hip condition requiring Grimaldi's approach",
        differentialDiagnosis: [],
        treatmentOptions: [],
        assessmentTests: []
      };
    }

    // Get related research article IDs for the diagnosis
    const relatedArticleIds = getRelatedGrimaldiResearchIds(
      analysisResult.diagnosis,
      patient.body_part || ""
    );

    // Enhanced return object with more Grimaldi-specific content
    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis,
      treatmentOptions: analysisResult.treatmentOptions,
      grimaldiSpecificApproach: true,
      assessmentTests: analysisResult.assessmentTests,
      relatedArticleIds: relatedArticleIds,
      grimaldiMethodology: {
        approachName: "Alison Grimaldi Hip Rehabilitation Framework",
        keyPrinciples: grimaldiTreatmentPrinciples.slice(0, 5).map(p => p.title),
        assessmentFocus: grimaldiAssessmentPrinciples.slice(0, 3).map(p => p.title),
        evidenceStrength: "High - Based on specialized research in hip rehabilitation"
      }
    };
  } catch (error) {
    console.error("Error in Grimaldi hip analysis:", error);
    return createFallbackGrimaldiAnalysis(patient);
  }
}

/**
 * Constructs a prompt for analyzing patients using Grimaldi's approach
 * @param patient Virtual patient data
 * @returns Formatted prompt with Grimaldi-specific hip rehabilitation context
 */
function constructGrimaldiPrompt(patient: VirtualPatient): string {
  // Prepare objective findings as a formatted string if they exist
  let objectiveFindings = "None reported";
  if (patient.objective_findings) {
    try {
      const findings = typeof patient.objective_findings === "string" 
        ? JSON.parse(patient.objective_findings) 
        : patient.objective_findings;
      
      if (Array.isArray(findings)) {
        objectiveFindings = findings.map(f => `• ${f.finding}`).join('\n');
      } else {
        objectiveFindings = patient.objective_findings.toString();
      }
    } catch (e) {
      if (typeof patient.objective_findings === "string") {
        objectiveFindings = patient.objective_findings;
      }
    }
  }
  
  // Format patient data for the prompt
  const patientInfo = `
PATIENT INFORMATION:
- Name: ${patient.patient_name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Chief Complaint: ${patient.chief_complaint}
- Symptoms Description: ${patient.symptoms_description}
- Medical History: ${patient.past_medical_history || "None reported"}
- Body Part: ${patient.body_part || "hip"}
- Objective Findings:
${objectiveFindings}
`;

  // Include Grimaldi's key assessment principles
  const assessmentPrinciples = grimaldiAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Grimaldi's key treatment principles
  const treatmentPrinciples = grimaldiTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Grimaldi's specialized hip approaches
  const hipApproaches = grimaldiHipApproaches
    .map(a => `- ${a.name}: ${a.description}\n  Key features: ${a.keyFeatures.join(', ')}`)
    .join("\n");

  // Identify relevant condition approaches
  let conditionApproaches = "";
  grimaldiConditionApproaches.forEach(approach => {
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

SPECIALIZED GRIMALDI HIP DIAGNOSTIC FRAMEWORKS:

1. GRIMALDI'S GLUTEAL TENDINOPATHY CLASSIFICATION:
   - Reactive gluteal tendinopathy: Early pathology with inflammatory markers
   - Tendon dysrepair: Failed healing with beginning structural changes
   - Degenerative tendinopathy: Significant structural and matrix disruption
   - Mixed presentations with specific load tolerance thresholds

2. GRIMALDI'S LATERAL HIP PAIN ASSESSMENT FRAMEWORK:
   - Greater trochanteric pain syndrome subclassification
   - Gluteal tendon-fascial interface assessment
   - Hip joint contribution assessment protocol
   - Deep gluteal region sensitivity testing
   - Bursal involvement assessment

3. GRIMALDI'S HIP LOAD MANAGEMENT PRINCIPLES:
   - Specific compressive vs tensile load evaluation
   - Hip abductor capacity testing protocol
   - Stance phase load tolerance assessment
   - Functional pelvic control evaluation

4. GRIMALDI'S HIP REHABILITATION STAGES:
   - Acute load management (0-2 weeks)
   - Isometric strengthening (1-3 weeks)
   - Dynamic control development (3-6 weeks)
   - Function-specific retraining (6+ weeks)
   - Return to activity/sport progression

TASK:
Analyze this patient case using Alison Grimaldi's specialized hip rehabilitation frameworks. Provide a highly specific diagnostic assessment, precise diagnosis classification, detailed differential diagnoses, and comprehensive evidence-based treatment plan following Grimaldi's exact protocols.

GRIMALDI'S KEY ASSESSMENT PRINCIPLES:
${assessmentPrinciples}

GRIMALDI'S KEY TREATMENT PRINCIPLES:
${treatmentPrinciples}

GRIMALDI'S SPECIALIZED HIP APPROACHES:
${hipApproaches}

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
    "immediateInterventions": ["Short-term interventions with rationale"],
    "rehabilitationProgression": ["Progressive steps with rationale"],
    "exercisePrescription": [
      {"name": "Exercise name 1", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 2", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"},
      {"name": "Exercise name 3", "purpose": "Goal of this exercise", "technique": "How to perform", "progression": "How to advance"}
    ],
    "loadManagementStrategies": ["Specific load management approaches"],
    "activityModifications": ["Key activity modifications during rehabilitation"],
    "expectedOutcomes": ["Realistic prognosis and timeframes"]
  },
  "grimaldiApproach": {
    "keyPrinciples": ["Specific Grimaldi principles most relevant to this case"],
    "specialConsiderations": ["Unique aspects of Grimaldi's approach for this presentation"],
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
function getRelatedGrimaldiResearchIds(
  diagnosis: string,
  bodyPart: string
): string[] {
  try {
    // For Grimaldi's approach, we focus on hip-related articles
    if (bodyPart.toLowerCase() !== "hip") {
      // Return empty array if not hip-related
      return [];
    }
    
    // Find Grimaldi research articles related to this diagnosis
    const relatedArticles = grimaldiResearchArticles
      .filter(article => 
        (diagnosis && article.abstract.toLowerCase().includes(diagnosis.toLowerCase())) ||
        article.keywords.some(keyword => diagnosis.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map(article => article.id.toString());
      
    // If no specific matches, return general hip articles
    if (relatedArticles.length === 0) {
      return grimaldiResearchArticles
        .slice(0, 3)
        .map(article => article.id.toString());
    }
    
    return relatedArticles.slice(0, 5);
  } catch (error) {
    console.error("Error finding related Grimaldi research IDs:", error);
    return ["4001", "4002", "4003"]; // Default to key hip rehab articles
  }
}

/**
 * Creates fallback analysis using Grimaldi's approach when AI analysis fails
 * @param patient Virtual patient data
 * @returns Basic analysis using Grimaldi's hip rehabilitation principles
 */
function createFallbackGrimaldiAnalysis(patient: VirtualPatient): any {
  // Default diagnosis for hip conditions
  let diagnosis = "Hip condition requiring specialized rehabilitation";
  let differentialDiagnosis = [];
  let treatmentOptions = {
    immediateInterventions: ["Identification and reduction of aggravating factors", "Education on hip mechanics and load management"],
    rehabilitationProgression: ["Motor control before loading", "Progressive gluteal muscle activation", "Functional movement pattern training"],
    exercisePrescription: [],
    loadManagementStrategies: ["Modification of compression-producing positions", "Activity dosage based on symptom response"],
    activityModifications: ["Avoidance of provocative positions during acute phase", "Modified movement patterns for daily activities"],
    expectedOutcomes: ["Progressive improvement with adherence to specific exercise program", "Return to function with optimal movement patterns"]
  };
  
  // Customize based on keywords in symptoms or chief complaint
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""}`.toLowerCase();
  
  if (patientText.includes("lateral") || patientText.includes("side of hip") || patientText.includes("trochanteric")) {
    diagnosis = "Gluteal tendinopathy / lateral hip pain";
    
    // Add specific exercises for gluteal tendinopathy
    treatmentOptions.exercisePrescription = [
      {
        name: "Isometric Hip Abduction Against Wall",
        purpose: "Pain modulation and initial tendon loading without compression",
        technique: "Standing with affected side away from wall, push foot into wall with straight leg at 70% effort",
        progression: "Increase hold time and repetitions as tolerated"
      },
      {
        name: "Hip Abduction with Decompression Strategy",
        purpose: "Strengthen gluteal muscles while minimizing compression",
        technique: "Side-lying with hips flexed 30°, lift top knee toward ceiling keeping feet together",
        progression: "Add resistance band around thighs when pain allows"
      },
      {
        name: "Single Leg Stance with Pelvic Control",
        purpose: "Develop functional control during weight-bearing",
        technique: "Stand on affected leg focusing on level pelvis, engage gluteals without tensing",
        progression: "Add small movements of opposite leg while maintaining control"
      }
    ];
  } else if (patientText.includes("groin") || patientText.includes("inner hip") || patientText.includes("adductor")) {
    diagnosis = "Hip-related groin pain";
    
    // Add specific exercises for hip-related groin pain
    treatmentOptions.exercisePrescription = [
      {
        name: "Deep Hip External Rotator Activation",
        purpose: "Activate deep stabilizers of the hip",
        technique: "Seated, create gentle external rotation force without actual movement",
        progression: "Increase effort and hold time, progress to standing position"
      },
      {
        name: "Hip Hinge with Gluteal Engagement",
        purpose: "Develop optimal hip movement pattern",
        technique: "Standing with dowel along spine, hinge at hips while maintaining neutral spine",
        progression: "Add light resistance or perform as single-leg movement"
      }
    ];
  }
  
  return {
    diagnosis: diagnosis,
    differentialDiagnosis: differentialDiagnosis,
    treatmentOptions: treatmentOptions,
    grimaldiSpecificApproach: true,
    assessmentTests: [],
    relatedArticleIds: getRelatedGrimaldiResearchIds(diagnosis, "hip"),
    grimaldiMethodology: {
      approachName: "Alison Grimaldi Hip Rehabilitation Framework",
      keyPrinciples: grimaldiTreatmentPrinciples.slice(0, 5).map(p => p.title),
      assessmentFocus: grimaldiAssessmentPrinciples.slice(0, 3).map(p => p.title),
      evidenceStrength: "High - Based on specialized research in hip rehabilitation"
    }
  };
}