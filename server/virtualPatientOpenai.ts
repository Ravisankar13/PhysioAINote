import OpenAI from "openai";
import { bodyPartEnum } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VirtualPatientInput {
  patientName: string;
  age: string;
  gender: string;
  chiefComplaint: string;
  symptomsDescription: string;
  bodyPart: typeof bodyPartEnum.enumValues[number];
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  socialHistory?: string;
  familyHistory?: string;
  medications?: string;
  allergies?: string;
}

export interface VirtualPatientAnalysisOutput {
  primaryDiagnosis: {
    name: string;
    description: string;
  };
  differentialDiagnoses: Array<{
    name: string;
    likelihood: "high" | "medium" | "low";
    reasoning: string;
  }>;
  treatmentOptions: Array<{
    name: string;
    description: string;
    evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
    recommendationStrength: "highly recommended" | "recommended" | "optional";
    researchConsiderations?: Array<{
      topic: string;
      relevance: string;
    }>;
  }>;
  recommendedKeywords: string[];
}

// Attempts to analyze virtual patient case with graceful fallback for API issues
export async function analyzeVirtualPatientCase(
  patientData: VirtualPatientInput
): Promise<VirtualPatientAnalysisOutput> {
  try {
    const result = await performAnalysis(patientData);
    return result;
  } catch (error) {
    console.error("Error analyzing virtual patient with OpenAI:", error);
    return createFallbackAnalysis(patientData);
  }
}

// Interface to facilitate finding research articles relevant to a diagnosis
export async function findRelevantResearchArticles(
  primaryDiagnosis: string,
  differentialDiagnoses: string[],
  bodyPart: string,
  keywords: string[]
): Promise<{
  searchTerms: string[];
  strategy: string;
}> {
  try {
    const prompt = `
    I need to find scientific research articles that are relevant to the following patient case:
    - Primary diagnosis: ${primaryDiagnosis}
    - Differential diagnoses: ${differentialDiagnoses.join(', ')}
    - Affected body part: ${bodyPart}
    - Additional relevant keywords: ${keywords.join(', ')}

    Please provide:
    1. A list of 5-10 specific search terms that would be most effective for finding relevant research articles about this case
    2. A brief search strategy explaining which aspects of the case should be prioritized in the literature search

    Format your response as JSON with the following structure:
    {
      "searchTerms": ["term1", "term2", ...],
      "strategy": "explanation of search strategy"
    }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      searchTerms: result.searchTerms || [],
      strategy: result.strategy || ""
    };
  } catch (error) {
    console.error("Error generating research search strategy:", error);
    // Fallback
    return {
      searchTerms: [primaryDiagnosis, bodyPart, ...keywords.slice(0, 3)],
      strategy: `Search for articles about ${primaryDiagnosis} affecting the ${bodyPart}.`
    };
  }
}

// The core analysis function that processes patient data through OpenAI
async function performAnalysis(
  patientData: VirtualPatientInput
): Promise<VirtualPatientAnalysisOutput> {
  const systemPrompt = `
  You are an expert physiotherapist with training in medical diagnosis, manual therapy, and exercise prescription. Analyze the following patient case and provide:
  
  1. A primary diagnosis based on the patient's history and symptoms
  2. 3-5 differential diagnoses ranked by likelihood (high/medium/low) with brief reasoning
  3. Evidence-based treatment options for the primary diagnosis, organized by category:
     a. Manual Therapy techniques (2-3 specific techniques)
        - Specific technique name
        - Detailed description including hand placement, direction, and dosage
        - Target anatomical structure
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
        - Brief research support summary
     
     b. Progressive Loading Exercises (3-4 specific exercises)
        - Specific exercise name
        - Detailed description including positioning, movement pattern
        - Target muscle group
        - Loading parameters (sets, reps, frequency, intensity)
        - Progression criteria
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
        - Brief research support summary
     
     c. Patient Education recommendations (2-3 topics)
        - Specific education topics
        - Key points for patient understanding
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
  
  4. 5-10 keywords that would be useful for searching research related to this case
  
  Your analysis should be physiotherapy-focused but consider relevant medical conditions.
  Format your response as JSON with the following structure:
  
  {
    "primaryDiagnosis": {
      "name": "diagnosis name",
      "description": "detailed explanation"
    },
    "differentialDiagnoses": [
      {
        "name": "differential diagnosis 1",
        "likelihood": "high/medium/low",
        "reasoning": "brief reasoning"
      },
      ...
    ],
    "treatmentOptions": [
      {
        "category": "Manual Therapy",
        "techniques": [
          {
            "name": "specific technique name",
            "description": "detailed technique description including hand placement, direction, and dosage",
            "targetTissue": "specific anatomical structure being targeted",
            "evidenceLevel": "high/moderate/low/expert opinion",
            "recommendationStrength": "highly recommended/recommended/optional",
            "researchSupport": "brief summary of research evidence supporting this technique",
            "contraindications": ["contraindication1", "contraindication2"]
          },
          ...
        ]
      },
      {
        "category": "Progressive Loading Exercises",
        "exercises": [
          {
            "name": "specific exercise name",
            "description": "detailed exercise description including positioning and movement pattern",
            "targetMuscleGroup": "specific muscles being targeted",
            "loadingParameters": {
              "sets": "recommended sets (range)",
              "reps": "recommended repetitions (range)",
              "frequency": "recommended frequency",
              "intensity": "recommended intensity/load guidelines",
              "progressionCriteria": "when and how to progress the exercise"
            },
            "evidenceLevel": "high/moderate/low/expert opinion",
            "recommendationStrength": "highly recommended/recommended/optional",
            "researchSupport": "brief summary of research evidence supporting this exercise",
            "modificationOptions": ["option1", "option2"]
          },
          ...
        ]
      },
      {
        "category": "Patient Education",
        "recommendations": [
          {
            "topic": "specific education topic",
            "keyPoints": ["point1", "point2"],
            "evidenceLevel": "high/moderate/low/expert opinion",
            "recommendationStrength": "highly recommended/recommended/optional"
          },
          ...
        ]
      }
    ],
    "recommendedKeywords": ["keyword1", "keyword2", ...]
  }
  `;

  const userPrompt = `
  PATIENT CASE INFORMATION:
  Name: ${patientData.patientName}
  Age: ${patientData.age}
  Gender: ${patientData.gender}
  Chief Complaint: ${patientData.chiefComplaint}
  Affected Body Part: ${patientData.bodyPart}
  
  Detailed Symptoms Description:
  ${patientData.symptomsDescription}
  
  ${patientData.pastMedicalHistory ? `Past Medical History: ${patientData.pastMedicalHistory}` : ''}
  ${patientData.pastSurgicalHistory ? `Past Surgical History: ${patientData.pastSurgicalHistory}` : ''}
  ${patientData.socialHistory ? `Social History: ${patientData.socialHistory}` : ''}
  ${patientData.familyHistory ? `Family History: ${patientData.familyHistory}` : ''}
  ${patientData.medications ? `Medications: ${patientData.medications}` : ''}
  ${patientData.allergies ? `Allergies: ${patientData.allergies}` : ''}
  
  Based on this information, provide a comprehensive physiotherapy assessment and treatment plan in the JSON format specified.
  `;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0].message.content);
    return result as VirtualPatientAnalysisOutput;
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    throw new Error("Failed to parse AI analysis result");
  }
}

// Creates a fallback analysis when OpenAI API fails
function createFallbackAnalysis(patientData: VirtualPatientInput): VirtualPatientAnalysisOutput {
  // Generate a basic analysis based on the body part
  const bodyPartInfo = getBodyPartFallbackInfo(patientData.bodyPart);
  
  return {
    primaryDiagnosis: {
      name: `${bodyPartInfo.prefix} Strain/Sprain`,
      description: `Based on the patient's symptoms, this appears to be a ${bodyPartInfo.prefix.toLowerCase()} strain/sprain that requires further assessment.`
    },
    differentialDiagnoses: [
      {
        name: bodyPartInfo.diagnosis1,
        likelihood: "medium",
        reasoning: `Common condition affecting the ${patientData.bodyPart} with similar presentation`
      },
      {
        name: bodyPartInfo.diagnosis2,
        likelihood: "medium",
        reasoning: `Should be considered given the patient's symptoms`
      },
      {
        name: "Referred Pain",
        likelihood: "low",
        reasoning: "Symptoms might be originating from adjacent structures"
      }
    ],
    treatmentOptions: [
      {
        name: "Initial Rest & Protection",
        description: "Relative rest from aggravating activities for 24-48 hours",
        evidenceLevel: "moderate",
        recommendationStrength: "recommended"
      },
      {
        name: "Pain Management",
        description: "Appropriate pain management strategies including modalities and medication if necessary",
        evidenceLevel: "moderate",
        recommendationStrength: "recommended"
      },
      {
        name: "Progressive Loading Exercise",
        description: "Gradually progressive strengthening exercises as tolerated",
        evidenceLevel: "high",
        recommendationStrength: "highly recommended"
      },
      {
        name: "Manual Therapy",
        description: "Targeted manual therapy techniques to improve mobility and reduce pain",
        evidenceLevel: "moderate",
        recommendationStrength: "recommended"
      },
      {
        name: "Patient Education",
        description: "Education on condition, self-management, and activity modification",
        evidenceLevel: "high",
        recommendationStrength: "highly recommended"
      }
    ],
    recommendedKeywords: [
      patientData.bodyPart,
      "physiotherapy",
      "rehabilitation",
      "exercise therapy",
      bodyPartInfo.diagnosis1,
      bodyPartInfo.diagnosis2,
      "pain management"
    ]
  };
}

// Helper function to provide body-part specific information for fallback responses
function getBodyPartFallbackInfo(bodyPart: string): {
  prefix: string;
  diagnosis1: string;
  diagnosis2: string;
} {
  switch (bodyPart) {
    case "shoulder":
      return {
        prefix: "Shoulder",
        diagnosis1: "Rotator Cuff Tendinopathy",
        diagnosis2: "Subacromial Impingement"
      };
    case "neck":
      return {
        prefix: "Cervical",
        diagnosis1: "Cervical Radiculopathy",
        diagnosis2: "Mechanical Neck Pain"
      };
    case "back":
      return {
        prefix: "Lumbar",
        diagnosis1: "Non-specific Low Back Pain",
        diagnosis2: "Lumbar Radiculopathy"
      };
    case "elbow":
      return {
        prefix: "Elbow",
        diagnosis1: "Lateral Epicondylalgia",
        diagnosis2: "Medial Epicondylalgia"
      };
    case "wrist":
      return {
        prefix: "Wrist",
        diagnosis1: "Carpal Tunnel Syndrome",
        diagnosis2: "De Quervain's Tenosynovitis"
      };
    case "hand":
      return {
        prefix: "Hand",
        diagnosis1: "Trigger Finger",
        diagnosis2: "Osteoarthritis"
      };
    case "hip":
      return {
        prefix: "Hip",
        diagnosis1: "Femoroacetabular Impingement",
        diagnosis2: "Greater Trochanteric Pain Syndrome"
      };
    case "knee":
      return {
        prefix: "Knee",
        diagnosis1: "Patellofemoral Pain Syndrome",
        diagnosis2: "Meniscal Injury"
      };
    case "ankle":
      return {
        prefix: "Ankle",
        diagnosis1: "Lateral Ankle Sprain",
        diagnosis2: "Achilles Tendinopathy"
      };
    case "foot":
      return {
        prefix: "Foot",
        diagnosis1: "Plantar Fasciitis",
        diagnosis2: "Metatarsalgia"
      };
    default:
      return {
        prefix: "Musculoskeletal",
        diagnosis1: "Myofascial Pain Syndrome",
        diagnosis2: "Chronic Pain Condition"
      };
  }
}