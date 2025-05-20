/**
 * Enhanced Virtual Patient AI with Jo Gibson's Shoulder Rehabilitation Approach
 * 
 * This module extends the virtual patient system to incorporate Jo Gibson's 
 * evidence-based approach to shoulder rehabilitation, providing specialized
 * analysis and treatment recommendations for shoulder conditions.
 */

import OpenAI from "openai";
import { VirtualPatient } from "@shared/schema";
import { joGibsonAssessmentPrinciples, joGibsonTreatmentPrinciples, joGibsonConditionApproaches, getJoGibsonShoulderExercises, joGibsonResearchArticles } from "./joGibsonShoulderLibrary";

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

    // Parse the AI response with error handling
    let analysisResult;
    try {
      analysisResult = JSON.parse(response.choices[0].message.content!);
      
      // Ensure fields exist and are properly structured
      if (!analysisResult.differentialDiagnosis) {
        analysisResult.differentialDiagnosis = [];
      }
      
      if (!analysisResult.treatmentOptions) {
        analysisResult.treatmentOptions = {
          immediateInterventions: [],
          rehabilitationProgression: [],
          exercisePrescription: [],
          educationPoints: [],
          expectedOutcomes: []
        };
      }
      
      if (!analysisResult.assessmentTests) {
        analysisResult.assessmentTests = [];
      }
    } catch (parseError) {
      console.error("Error parsing Jo Gibson analysis response:", parseError);
      // Use a simplified format if parsing fails, but still proceed
      analysisResult = {
        diagnosis: "Shoulder condition requiring Jo Gibson's approach",
        differentialDiagnosis: [],
        treatmentOptions: {
          immediateInterventions: [],
          rehabilitationProgression: [],
          exercisePrescription: [],
          educationPoints: [],
          expectedOutcomes: []
        },
        assessmentTests: []
      };
    }

    // Get related research article IDs for the diagnosis
    const relatedArticleIds = await getRelatedShoulderResearchIds(
      analysisResult.diagnosis,
      analysisResult.differentialDiagnosis,
      patient.body_part || ""
    );

    // Enhanced return object with more Jo Gibson-specific content
    return {
      diagnosis: analysisResult.diagnosis,
      differentialDiagnosis: analysisResult.differentialDiagnosis || [],
      treatmentOptions: analysisResult.treatmentOptions || {
        immediateInterventions: [],
        rehabilitationProgression: [],
        exercisePrescription: [],
        educationPoints: [],
        expectedOutcomes: []
      },
      joGibsonSpecificApproach: true, // Always true when using this function
      assessmentTests: analysisResult.assessmentTests || [],
      relatedArticleIds: relatedArticleIds || [],
      joGibsonMethodology: {
        approachName: "Jo Gibson Shoulder Rehabilitation",
        keyPrinciples: joGibsonTreatmentPrinciples.slice(0, 5),
        assessmentFocus: joGibsonAssessmentPrinciples.slice(0, 3),
        rehabilitationPhases: [
          "Early: Motor control and kinetic chain integration",
          "Middle: Progressive loading with quality movement",
          "Late: Function-specific rehabilitation and return to activity"
        ],
        evidenceStrength: "High - Based on multiple RCTs and systematic reviews"
      }
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
`;

  // Include Jo Gibson's key assessment principles
  const assessmentPrinciples = joGibsonAssessmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Include Jo Gibson's key treatment principles
  const treatmentPrinciples = joGibsonTreatmentPrinciples
    .map(p => `- ${p.title}: ${p.description}`)
    .join("\n");

  // Enhanced condition detection for more accurate matching to Jo Gibson's approaches
  let matchedConditionApproaches = "";
  
  // Define symptom-to-condition mappings based on Jo Gibson's approach
  const symptomMappings = [
    { 
      condition: "Rotator Cuff Tendinopathy", 
      keywords: ["pain with overhead", "night pain", "painful arc", "tendinitis", "tendinopathy", "impingement", "supraspinatus", "catching", "clicking"] 
    },
    { 
      condition: "Frozen Shoulder (Adhesive Capsulitis)", 
      keywords: ["stiffness", "frozen", "capsulitis", "limited range", "gradual onset", "severe night pain", "difficulty dressing", "restriction"] 
    },
    { 
      condition: "Shoulder Instability", 
      keywords: ["unstable", "instability", "subluxation", "dislocation", "loose", "give way", "apprehension", "slipping", "falling out", "giving out"] 
    },
    { 
      condition: "Post-surgical Rehabilitation", 
      keywords: ["surgery", "post-op", "post-operative", "repair", "reconstruction", "arthroscopy", "decompression", "acromioplasty"] 
    },
    { 
      condition: "Scapular Dyskinesis", 
      keywords: ["scapular winging", "dyskinesis", "abnormal movement", "scapulothoracic", "posture", "dropping shoulder", "scapular control"] 
    }
  ];
  
  // Combine all patient information for comprehensive symptom matching
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""} ${patient.past_medical_history || ""}`.toLowerCase();

  // Find matching conditions based on symptom keywords
  const matchedConditions = symptomMappings.filter(mapping => 
    mapping.keywords.some(keyword => patientText.includes(keyword.toLowerCase()))
  );
  
  // Get corresponding Jo Gibson condition approaches for matched conditions
  matchedConditions.forEach(match => {
    const conditionApproach = joGibsonConditionApproaches.find(
      approach => approach.condition.toLowerCase() === match.condition.toLowerCase()
    );
    
    if (conditionApproach) {
      matchedConditionApproaches += `\nRELEVANT CONDITION APPROACH: ${conditionApproach.condition}\n`;
      matchedConditionApproaches += conditionApproach.keyPrinciples.map(p => `- ${p}`).join("\n");
      matchedConditionApproaches += `\nEvidence: ${conditionApproach.evidence}\n`;
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
      differentialDiagnosis.forEach(d => {
        if (d && d.condition) {
          diagnoses.push(d.condition);
        }
      });
    }

    // Get specialized search terms for shoulder research
    const searchTerms = await generateShoulderResearchSearchTerms(diagnoses.join(", "), bodyPart);
    
    // For now, return the search terms as IDs (would be mapped to actual research article IDs in full implementation)
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
 * Creates fallback analysis with Jo Gibson's specialized shoulder approach when AI analysis fails
 * @param patient Virtual patient data
 * @returns Comprehensive analysis using Jo Gibson shoulder rehabilitation principles
 */
function createFallbackShoulderAnalysis(patient: VirtualPatient): any {
  // Default structure to ensure consistent output
  const defaultAnalysis = {
    diagnosis: "Shoulder condition requiring specialized rehabilitation",
    differentialDiagnosis: [],
    treatmentOptions: {
      immediateInterventions: [],
      rehabilitationProgression: [],
      exercisePrescription: [],
      educationPoints: [],
      expectedOutcomes: []
    },
    assessmentTests: [],
    relatedArticleIds: [],
    joGibsonSpecificApproach: true
  };
  // Extract key symptoms from all patient information for comprehensive analysis
  const patientText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""} ${patient.past_medical_history || ""}`.toLowerCase();

  // Define enhanced condition detection using Jo Gibson's specialized approach
  const symptomConditionMappings = [
    { 
      condition: "Rotator Cuff Tendinopathy", 
      keywords: ["pain with overhead", "night pain", "painful arc", "tendinitis", "tendinopathy", "impingement", "supraspinatus", "catching", "clicking", "painful jolt", "weakness raising arm"],
      tests: [
        { name: "Empty can test", purpose: "Assess supraspinatus involvement", technique: "Arms at 90° in scapular plane, thumbs down, resist downward pressure", interpretation: "Pain or weakness suggests supraspinatus pathology" },
        { name: "External rotation lag sign", purpose: "Assess rotator cuff integrity", technique: "Support arm in 90° abduction and external rotation, ask patient to maintain position", interpretation: "Lag (inability to maintain position) suggests rotator cuff tear" },
        { name: "Painful arc test", purpose: "Assess for subacromial impingement", technique: "Active shoulder abduction noting pain between 60-120°", interpretation: "Pain in this range suggests rotator cuff or subacromial involvement" }
      ],
      differentials: [
        { condition: "Frozen shoulder (early phase)", likelihood: "35%", rationale: "Night pain and progressive stiffness are common features" },
        { condition: "Subacromial pain syndrome", likelihood: "30%", rationale: "Pain with overhead movements and positive impingement signs" }
      ],
      exerciseTypes: ["isometric", "rotator cuff", "scapular control"]
    },
    { 
      condition: "Adhesive Capsulitis (Frozen Shoulder)", 
      keywords: ["stiff", "frozen", "capsulitis", "limited range", "gradual onset", "severe night pain", "difficulty dressing", "restriction", "can't reach behind"],
      tests: [
        { name: "Capsular pattern test", purpose: "Assess for characteristic frozen shoulder limitation pattern", technique: "Assess passive range: external rotation, abduction, internal rotation", interpretation: "Classic pattern shows greater limitation in external rotation and elevation" },
        { name: "Coracoid pain test", purpose: "Differentiate from impingement", technique: "Palpate coracoid process for tenderness", interpretation: "Typical tenderness in frozen shoulder" }
      ],
      differentials: [
        { condition: "Glenohumeral osteoarthritis", likelihood: "25%", rationale: "Can present with stiffness but different pattern of limitation" },
        { condition: "Rotator cuff pathology with secondary stiffness", likelihood: "30%", rationale: "Rotator cuff issues can lead to compensatory stiffness" }
      ],
      exerciseTypes: ["gentle stretching", "pendulum", "pain-free mobility"]
    },
    { 
      condition: "Shoulder Instability", 
      keywords: ["instability", "dislocate", "unstable", "subluxation", "loose", "give way", "apprehension", "slipping", "falling out", "giving out"],
      tests: [
        { name: "Apprehension test", purpose: "Assess for anterior instability", technique: "Abduct and externally rotate arm while applying gentle anterior pressure", interpretation: "Apprehension or guarding suggests instability" },
        { name: "Sulcus sign", purpose: "Assess for inferior instability", technique: "Apply downward traction on arm in neutral position", interpretation: "Visible sulcus below acromion indicates inferior laxity" },
        { name: "Load and shift test", purpose: "Assess glenohumeral laxity", technique: "Stabilize scapula while applying anterior/posterior force to humeral head", interpretation: "Excessive translation indicates instability" }
      ],
      differentials: [
        { condition: "Multidirectional instability", likelihood: "40%", rationale: "Common in young, hypermobile patients" },
        { condition: "SLAP lesion", likelihood: "25%", rationale: "Can present with sensations of instability and clicking" }
      ],
      exerciseTypes: ["proprioception", "rotator cuff", "closed chain", "rhythmic stabilization"]
    },
    { 
      condition: "Scapular Dyskinesis", 
      keywords: ["scapular winging", "dyskinesis", "abnormal movement", "scapulothoracic", "posture", "dropping shoulder", "scapular control"],
      tests: [
        { name: "Scapular assistance test", purpose: "Assess impact of proper scapular positioning", technique: "Manually assist scapular upward rotation during arm elevation", interpretation: "Improved symptoms with assistance suggests scapular role" },
        { name: "Scapular retraction test", purpose: "Assess scapular control and stability", technique: "Actively retract scapulae against resistance", interpretation: "Asymmetry or weakness indicates scapular muscle dysfunction" }
      ],
      differentials: [
        { condition: "Long thoracic nerve palsy", likelihood: "20%", rationale: "Causes medial scapular winging due to serratus anterior weakness" },
        { condition: "Trapezius dysfunction", likelihood: "30%", rationale: "Often presents with altered scapular positioning and movement" }
      ],
      exerciseTypes: ["scapular control", "serratus anterior", "trapezius", "postural correction"]
    }
  ];
  
  // Determine most likely condition based on keyword matching
  let bestMatch = { condition: "Non-specific shoulder pain", matchCount: 0 };
  let differentials: Array<{condition: string, likelihood: string, rationale: string}> = [];
  let assessmentTests: Array<{name: string, purpose: string, technique: string, interpretation: string}> = [];
  let recommendedExerciseTypes: string[] = [];
  
  // Find best matching condition
  symptomConditionMappings.forEach(mapping => {
    const matchCount = mapping.keywords.filter(keyword => patientText.includes(keyword)).length;
    if (matchCount > bestMatch.matchCount) {
      bestMatch = { condition: mapping.condition, matchCount };
      differentials = mapping.differentials || [];
      assessmentTests = mapping.tests || [];
      recommendedExerciseTypes = mapping.exerciseTypes || [];
    }
  });
  
  // If no good match, use default values
  if (bestMatch.matchCount === 0) {
    differentials = [
      { condition: "Rotator cuff tendinopathy", likelihood: "30%", rationale: "Common cause of shoulder pain" },
      { condition: "Subacromial pain syndrome", likelihood: "25%", rationale: "Frequently presents with pain in shoulder region" }
    ];
    assessmentTests = [
      { name: "Empty can test", purpose: "Assess supraspinatus involvement", technique: "Arms at 90° in scapular plane, thumbs down, resist downward pressure", interpretation: "Pain or weakness suggests supraspinatus pathology" },
      { name: "Hawkins-Kennedy test", purpose: "Assess for subacromial impingement", technique: "Flex shoulder and elbow to 90°, then internally rotate", interpretation: "Pain suggests impingement" }
    ];
    recommendedExerciseTypes = ["rotator cuff", "scapular control", "gentle mobility"];
  }
  
  // Select Jo Gibson exercises specifically for the identified condition
  const allExercises = getJoGibsonShoulderExercises();
  
  // Filter exercises based on condition-specific types and beginner level
  const conditionSpecificExercises = allExercises
    .filter(ex => {
      // Match exercise to condition needs based on description and target muscles
      const exerciseText = `${ex.title} ${ex.description} ${ex.targetMuscles}`.toLowerCase();
      return ex.bodyPart === "shoulder" && 
             ex.difficulty === "beginner" && 
             recommendedExerciseTypes.some(type => exerciseText.includes(type.toLowerCase()));
    })
    .slice(0, 3)
    .map(ex => ({
      name: ex.title,
      purpose: ex.targetMuscles,
      technique: ex.instructions,
      progression: "Progress following Jo Gibson's optimal loading principles"
    }));
  
  // Add intermediate exercises for progression
  const progressionExercises = allExercises
    .filter(ex => {
      const exerciseText = `${ex.title} ${ex.description} ${ex.targetMuscles}`.toLowerCase();
      return ex.bodyPart === "shoulder" && 
             ex.difficulty === "intermediate" && 
             recommendedExerciseTypes.some(type => exerciseText.includes(type.toLowerCase()));
    })
    .slice(0, 2)
    .map(ex => ({
      name: ex.title,
      purpose: ex.targetMuscles,
      technique: ex.instructions,
      progression: "Advance to this after mastering initial exercises"
    }));

  // Get Jo Gibson treatment principles specific to the condition
  const conditionApproach = joGibsonConditionApproaches.find(
    approach => approach.condition === bestMatch.condition
  );
  
  const immediateInterventions = conditionApproach ? 
    conditionApproach.keyPrinciples.slice(0, 3) : 
    [
      "Pain management following Jo Gibson's optimal loading principles",
      "Education about condition and expected recovery",
      "Initial movement within pain limits to maintain tissue health"
    ];

  return {
    diagnosis: bestMatch.condition,
    differentialDiagnosis: differentials,
    assessmentTests: assessmentTests,
    treatmentOptions: {
      immediateInterventions: immediateInterventions,
      rehabilitationProgression: [
        "Establish quality movement in supported positions",
        "Progress to unsupported functional movements",
        "Add resistance only after quality movement is established"
      ],
      exercisePrescription: [...conditionSpecificExercises, ...progressionExercises],
      educationPoints: [
        "Understanding pain mechanisms and tissue adaptation",
        "Importance of quality movement over quantity or load",
        "Self-management strategies for long-term success"
      ],
      expectedOutcomes: [
        "Progressive improvement over 6-12 weeks with adherence",
        "Return to functional activities with modified technique initially",
        "Long-term management strategies for preventing recurrence"
      ]
    },
    joGibsonSpecificApproach: true,
    joGibsonMethodology: {
      approachName: "Jo Gibson Shoulder Rehabilitation",
      keyPrinciples: joGibsonTreatmentPrinciples.slice(0, 3).map(p => p.title),
      assessmentFocus: joGibsonAssessmentPrinciples.slice(0, 3).map(p => p.title),
      rehabilitationPhases: [
        "Early: Motor control and kinetic chain integration",
        "Middle: Progressive loading with quality movement",
        "Late: Function-specific rehabilitation and return to activity"
      ],
      evidenceStrength: "High - Based on multiple RCTs and systematic reviews"
    },
    relatedArticleIds: ["158", "161", "163", "165", "170"]  // Common shoulder research article IDs
  };
}

/**
 * Determines if a patient requires Jo Gibson's specialized shoulder approach
 * @param patient Virtual patient data
 * @returns Boolean indicating whether the patient has a shoulder condition
 */
export function isShoulderPatient(patient: VirtualPatient): boolean {
  // Check if the patient has a shoulder-related condition using both body part and symptoms
  if (patient.body_part === "shoulder") {
    return true;
  }
  
  // Also check for shoulder-related terms in symptoms and chief complaint
  const shoulderTerms = [
    "shoulder", "rotator cuff", "glenohumeral", "acromioclavicular", "acromion",
    "scapula", "deltoid", "supraspinatus", "infraspinatus", "subscapularis", 
    "teres minor", "teres major", "impingement", "frozen shoulder", "adhesive capsulitis",
    "labral tear", "SLAP tear", "biceps tendon", "subacromial", "clavicle",
    "ac joint", "sc joint", "trapezius", "rhomboid", "levator scapulae",
    "scapular dyskinesis", "instability", "dislocation", "subluxation"
  ];
  
  const symptomText = `${patient.chief_complaint || ""} ${patient.symptoms_description || ""}`.toLowerCase();
  
  return shoulderTerms.some(term => symptomText.includes(term.toLowerCase()));
}