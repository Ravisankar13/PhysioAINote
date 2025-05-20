/**
 * Enhanced Virtual Patient AI with Jo Gibson's Shoulder Rehabilitation Approach
 * 
 * This module extends the virtual patient system to incorporate Jo Gibson's 
 * evidence-based approach to shoulder rehabilitation, providing specialized
 * analysis and treatment recommendations for shoulder conditions.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { joGibsonAssessmentPrinciples, joGibsonTreatmentPrinciples, joGibsonConditionApproaches } from "./joGibsonShoulderLibrary";
import { getJoGibsonShoulderExercises } from "./joGibsonShoulderLibrary";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient with shoulder issues using Jo Gibson's approach
 * @param patient Virtual patient data
 * @returns Enhanced analysis with Jo Gibson-specific shoulder recommendations
 */
export async function analyzeShoulderPatientJoGibson(patient: VirtualPatient) {
  try {
    // Create a comprehensive prompt that incorporates Jo Gibson's approach
    const prompt = constructJoGibsonShoulderPrompt(patient);
    
    // Get specialized shoulder analysis using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist specializing in shoulder rehabilitation using Jo Gibson's evidence-based approach. Analyze the patient case and provide a detailed assessment, diagnosis, and treatment plan following Jo Gibson's principles."
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

    // Parse the AI response
    const analysisResult = JSON.parse(response.choices[0].message.content!);

    // Generate related research article IDs based on the diagnosis
    const relatedArticleIds = await getRelatedShoulderResearchIds(
      analysisResult.diagnosis,
      analysisResult.differentialDiagnosis,
      patient.body_part || ""
    );

    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis,
      treatmentOptions: analysisResult.treatmentOptions,
      joGibsonSpecificApproach: analysisResult.joGibsonApproach,
      assessmentTests: analysisResult.assessmentTests,
      relatedArticleIds: relatedArticleIds
    };
  } catch (error) {
    console.error("Error in Jo Gibson shoulder analysis:", error);
    return createFallbackShoulderAnalysis(patient);
  }
}

/**
 * Constructs a prompt for analyzing shoulder patients using Jo Gibson's approach
 * @param patient Virtual patient data
 * @returns Formatted prompt with Jo Gibson-specific context
 */
function constructJoGibsonShoulderPrompt(patient: VirtualPatient): string {
  // Format patient data for the prompt
  const patientInfo = `
PATIENT INFORMATION:
- Name: ${patient.patient_name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Chief Complaint: ${patient.chief_complaint}
- Symptoms Description: ${patient.symptoms_description}
- Medical History: ${patient.past_medical_history || "None reported"}
- Body Part: ${patient.body_part || "shoulder"}
${patient.objectiveFindings ? `- Objective Findings: ${JSON.stringify(patient.objectiveFindings)}` : ""}
`;

  // Include Jo Gibson's key assessment principles
  const assessmentPrinciples = joGibsonAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Jo Gibson's key treatment principles
  const treatmentPrinciples = joGibsonTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include specific condition approaches if they match keywords in the patient description
  let matchedConditionApproaches = "";
  joGibsonConditionApproaches.forEach(condition => {
    const conditionKeywords = condition.condition.toLowerCase().split(" ");
    const patientText = `${patient.chief_complaint} ${patient.symptoms_description} ${patient.past_medical_history || ""}`.toLowerCase();
    
    if (conditionKeywords.some(keyword => patientText.includes(keyword))) {
      matchedConditionApproaches += `\nRELEVANT CONDITION APPROACH: ${condition.condition}\n`;
      matchedConditionApproaches += condition.keyPrinciples.map(p => `- ${p}`).join("\n");
      matchedConditionApproaches += `\nEvidence: ${condition.evidence}\n`;
    }
  });

  // Compile the complete prompt
  return `
${patientInfo}

TASK:
Analyze this patient case from a Jo Gibson shoulder rehabilitation perspective. Provide a detailed assessment, most likely diagnosis, differential diagnoses, and treatment plan. Your analysis should incorporate Jo Gibson's evidence-based approach to shoulder rehabilitation.

JO GIBSON'S KEY ASSESSMENT PRINCIPLES:
${assessmentPrinciples}

JO GIBSON'S KEY TREATMENT PRINCIPLES:
${treatmentPrinciples}

${matchedConditionApproaches}

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
    "educationPoints": ["Key patient education points"],
    "expectedOutcomes": ["Realistic prognosis and timeframes"]
  },
  "joGibsonApproach": {
    "keyPrinciples": ["Specific Jo Gibson principles most relevant to this case"],
    "specialConsiderations": ["Unique aspects of Jo Gibson's approach for this presentation"],
    "evidenceBase": ["Research supporting this approach for this condition"]
  }
}
`;
}

/**
 * Gets related research article IDs based on the diagnosis
 * @param diagnosis Primary diagnosis
 * @param differentialDiagnosis Differential diagnoses
 * @param bodyPart Body part affected
 * @returns Array of related article IDs
 */
async function getRelatedShoulderResearchIds(
  diagnosis: string,
  differentialDiagnosis: any[],
  bodyPart: string
): Promise<string[]> {
  try {
    // Combine diagnosis information to create search terms
    const diagnoses = [diagnosis];
    if (differentialDiagnosis && Array.isArray(differentialDiagnosis)) {
      diagnoses.push(...differentialDiagnosis.map(d => d.condition));
    }

    // Get specialized search terms for shoulder research
    const searchTerms = await generateShoulderResearchSearchTerms(diagnoses.join(", "), bodyPart);
    
    // For now, return the search terms as IDs
    // In a full implementation, these would be mapped to actual research article IDs
    return searchTerms.slice(0, 5);
  } catch (error) {
    console.error("Error generating related shoulder research IDs:", error);
    return ["shoulder rehabilitation", "Jo Gibson approach", bodyPart, "physiotherapy"];
  }
}

/**
 * Generates specialized search terms for shoulder research
 * @param diagnosis Combined diagnosis information
 * @param bodyPart Body part affected
 * @returns Array of search terms
 */
async function generateShoulderResearchSearchTerms(
  diagnosis: string,
  bodyPart: string
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a research physiotherapist specializing in shoulder rehabilitation. Generate specific, evidence-based search terms that would help find relevant research articles for this patient case."
        },
        {
          role: "user",
          content: `Generate 5 specific search terms for finding research articles relevant to: ${diagnosis} affecting the ${bodyPart}. Focus on Jo Gibson's shoulder rehabilitation approach and evidence-based physiotherapy interventions.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result.searchTerms || [];
  } catch (error) {
    console.error("Error generating shoulder research search terms:", error);
    return [
      "Jo Gibson shoulder approach",
      bodyPart + " rehabilitation",
      diagnosis.split(" ").slice(0, 3).join(" "),
      "evidence-based physiotherapy",
      "shoulder movement control"
    ];
  }
}

/**
 * Creates fallback analysis when AI analysis fails
 * @param patient Virtual patient data
 * @returns Basic analysis with Jo Gibson principles
 */
function createFallbackShoulderAnalysis(patient: VirtualPatient): any {
  // Extract key symptoms from patient description
  const symptomsLower = (patient.symptoms_description || "").toLowerCase();
  const complaintLower = (patient.chief_complaint || "").toLowerCase();

  // Determine likely condition based on keywords
  let likelyCondition = "Non-specific shoulder pain";
  let differentials = [];
  let assessmentTests = [];
  
  if (symptomsLower.includes("night") && symptomsLower.includes("pain")) {
    likelyCondition = "Rotator cuff tendinopathy";
    differentials = [
      { condition: "Frozen shoulder (early phase)", likelihood: "35%", rationale: "Night pain and progressive stiffness are common features" },
      { condition: "Subacromial pain syndrome", likelihood: "30%", rationale: "Pain with overhead movements and positive impingement signs" }
    ];
    assessmentTests = [
      { name: "Empty can test", purpose: "Assess supraspinatus involvement", technique: "Arms at 90° in scapular plane, thumbs down, resist downward pressure", interpretation: "Pain or weakness suggests supraspinatus pathology" },
      { name: "External rotation lag sign", purpose: "Assess rotator cuff integrity", technique: "Support arm in 90° abduction and external rotation, ask patient to maintain position", interpretation: "Lag (inability to maintain position) suggests rotator cuff tear" }
    ];
  } else if (symptomsLower.includes("stiff") || symptomsLower.includes("frozen")) {
    likelyCondition = "Adhesive capsulitis (Frozen shoulder)";
    differentials = [
      { condition: "Glenohumeral osteoarthritis", likelihood: "25%", rationale: "Can cause stiffness but typically with more crepitus and gradual onset" },
      { condition: "Rotator cuff tendinopathy with stiffness", likelihood: "40%", rationale: "Stiffness secondary to pain limitation is common" }
    ];
    assessmentTests = [
      { name: "Passive range of motion assessment", purpose: "Evaluate capsular restriction pattern", technique: "Assess passive external rotation, abduction, and internal rotation", interpretation: "Global restriction in capsular pattern suggests adhesive capsulitis" },
      { name: "Capsular end-feel assessment", purpose: "Determine nature of restriction", technique: "Assess quality of end-feel in limited ranges", interpretation: "Firm, empty end-feel suggests capsular restriction" }
    ];
  } else if (symptomsLower.includes("unstable") || symptomsLower.includes("dislocation") || complaintLower.includes("instability")) {
    likelyCondition = "Shoulder instability";
    differentials = [
      { condition: "SLAP lesion", likelihood: "20%", rationale: "Can cause sense of instability with overhead activities" },
      { condition: "Scapular dyskinesis", likelihood: "35%", rationale: "Poor scapular control can create sensation of instability" }
    ];
    assessmentTests = [
      { name: "Apprehension test", purpose: "Assess anterior instability", technique: "Abduction and external rotation with anterior pressure", interpretation: "Apprehension or guarding suggests instability" },
      { name: "Relocation test", purpose: "Confirm instability versus impingement", technique: "Apply posterior pressure during apprehension test", interpretation: "Relief of apprehension suggests instability" }
    ];
  }

  // Extract Jo Gibson principles most relevant to the condition
  const relevantAssessmentPrinciples = joGibsonAssessmentPrinciples
    .slice(0, 3)
    .map(p => `${p.title}: ${p.description}`);
    
  const relevantTreatmentPrinciples = joGibsonTreatmentPrinciples
    .slice(0, 3)
    .map(p => `${p.title}: ${p.description}`);

  // Select relevant condition approach if available
  const conditionMatch = joGibsonConditionApproaches.find(c => 
    c.condition.toLowerCase().includes(likelyCondition.toLowerCase().split(" ")[0]) ||
    likelyCondition.toLowerCase().includes(c.condition.toLowerCase().split(" ")[0])
  );

  // Select appropriate exercises from Jo Gibson's approach
  const relevantExercises = getJoGibsonShoulderExercises()
    .filter(ex => ex.difficulty === "beginner" || ex.difficulty === "intermediate")
    .slice(0, 3)
    .map(ex => ({
      name: ex.name,
      purpose: ex.description,
      technique: ex.instructions,
      progression: "Progress as tolerated following Jo Gibson's optimal loading principles"
    }));

  return {
    diagnosis: likelyCondition,
    differentialDiagnosis: differentials,
    assessmentTests: assessmentTests,
    treatmentOptions: {
      immediateInterventions: [
        "Pain management following Jo Gibson's optimal loading principles",
        "Education about condition and expected recovery",
        "Initial movement within pain limits to maintain tissue health"
      ],
      rehabilitationProgression: [
        "Establish quality movement in supported positions",
        "Progressive loading based on symptom response",
        "Integration into functional patterns specific to patient's needs"
      ],
      exercisePrescription: relevantExercises,
      educationPoints: [
        "Understanding the difference between pain and tissue damage",
        "Importance of graded exposure to movement",
        "Self-management strategies for long-term shoulder health"
      ],
      expectedOutcomes: [
        "Gradual improvement in pain and function over 8-12 weeks",
        "Return to functional activities with modified technique initially",
        "Long-term management strategies for preventing recurrence"
      ]
    },
    joGibsonApproach: {
      keyPrinciples: relevantTreatmentPrinciples,
      specialConsiderations: conditionMatch ? conditionMatch.keyPrinciples : ["Individualized approach based on assessment findings", "Focus on quality of movement before quantity"],
      evidenceBase: conditionMatch ? [conditionMatch.evidence] : ["Evidence supports progressive loading rather than complete rest for most shoulder conditions"]
    },
    relatedArticleIds: ["shoulder rehabilitation", "Jo Gibson approach", patient.body_part || "shoulder", "physiotherapy"]
  };
}

/**
 * Determines if a patient requires Jo Gibson's specialized shoulder approach
 * @param patient Virtual patient data
 * @returns Boolean indicating whether the patient has a shoulder condition
 */
export function isShoulderPatient(patient: VirtualPatient): boolean {
  // Check if the body part is explicitly shoulder
  if (patient.body_part?.toLowerCase() === "shoulder") {
    return true;
  }
  
  // Check for shoulder-related terms in symptoms and complaints
  const shoulderTerms = ["shoulder", "rotator cuff", "cuff", "acromioclavicular", "glenohumeral", "labrum", "subacromial", "deltoid", "frozen shoulder", "adhesive capsulitis"];
  
  const textToSearch = `${patient.chief_complaint} ${patient.symptoms_description} ${patient.past_medical_history || ""}`.toLowerCase();
  
  return shoulderTerms.some(term => textToSearch.includes(term));
}