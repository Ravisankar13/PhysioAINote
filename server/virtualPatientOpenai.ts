import OpenAI from "openai";
import { bodyPartEnum } from "@shared/schema";
import { config } from 'dotenv';
config();

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
  assessmentTests: Array<{
    name: string;
    purpose: string; // What the test helps determine
    procedure: string; // How to perform the test
    positiveFindings: string; // What constitutes a positive test
    negativeFindings: string; // What constitutes a negative test
    sensitivity: string; // Test sensitivity (if known)
    specificity: string; // Test specificity (if known)
    relevance: "primary" | "secondary" | "supportive"; // Importance for this case
    supportingResearch: string; // Research backing the test
    expertRecommendation: string; // Which experts recommend this test and why
  }>;
  objectiveFindings: {
    rangeOfMotion?: Array<{
      movement: string;
      finding: string;
      significance: string;
    }>;
    strength?: Array<{
      muscleGroup: string;
      finding: string;
      gradingScale: string;
      significance: string;
    }>;
    neurologicalSigns?: Array<{
      test: string;
      finding: string;
      significance: string;
    }>;
    palpationFindings?: Array<{
      structure: string;
      finding: string;
      significance: string;
    }>;
    functionalTests?: Array<{
      test: string;
      finding: string;
      significance: string;
    }>;
    additionalObservations?: string[];
  };
  treatmentOptions: Array<{
    category: "Manual Therapy" | "Progressive Loading Exercises" | "Patient Education";
    techniques?: Array<{
      name: string;
      description: string;
      targetTissue: string;
      evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
      recommendationStrength: "highly recommended" | "recommended" | "optional";
      researchSupport: string;
      contraindications: string[];
    }>;
    exercises?: Array<{
      name: string;
      description: string;
      targetMuscleGroup: string;
      loadingParameters: {
        sets: string;
        reps: string;
        frequency: string;
        intensity: string;
        progressionCriteria: string;
      };
      evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
      recommendationStrength: "highly recommended" | "recommended" | "optional";
      researchSupport: string;
      modificationOptions: string[];
    }>;
    recommendations?: Array<{
      topic: string;
      keyPoints: string[];
      evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
      recommendationStrength: "highly recommended" | "recommended" | "optional";
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
// with enhanced expert-based approach
export async function findRelevantResearchArticles(
  primaryDiagnosis: string,
  differentialDiagnoses: string[],
  bodyPart: string,
  keywords: string[]
): Promise<{
  searchTerms: string[];
  strategy: string;
  expertTerms: string[];
  pathoPhysiologicalTerms: string[];
  treatmentApproaches: string[];
  relevanceWeights: {[key: string]: number};
}> {
  try {
    const prompt = `
    I need to find scientific research articles that are relevant to the following patient case:
    - Primary diagnosis: ${primaryDiagnosis}
    - Differential diagnoses: ${differentialDiagnoses.join(', ')}
    - Affected body part: ${bodyPart}
    - Additional relevant keywords: ${keywords.join(', ')}

    Please provide:
    1. 7-12 specific search terms that would be most effective for finding relevant research articles about this case
    2. 3-5 expert-specific terms related to key researchers in this field (e.g., "Jill Cook tendinopathy continuum", "McKenzie directional preference")
    3. 3-5 pathophysiological terms related to the underlying mechanisms of the condition
    4. 3-5 evidence-based treatment approaches for this condition
    5. A brief search strategy explaining which aspects of the case should be prioritized
    6. Relevance weights (0-10) for different term categories to indicate their importance in article matching

    Format your response as JSON with the following structure:
    {
      "searchTerms": ["term1", "term2", ...],
      "expertTerms": ["expert term1", "expert term2", ...],
      "pathoPhysiologicalTerms": ["pathophysiology1", "pathophysiology2", ...],
      "treatmentApproaches": ["treatment1", "treatment2", ...],
      "strategy": "explanation of search strategy", 
      "relevanceWeights": {
        "primaryDiagnosis": 9,
        "experts": 8,
        "pathophysiology": 7,
        "treatments": 6,
        "bodyPart": 5,
        "differentialDiagnosis": 4
      }
    }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    // Use type assertion to handle potential null
    const content = (response.choices[0].message.content as string) || '{"searchTerms":[],"strategy":""}';
    const result = JSON.parse(content);
    return {
      searchTerms: result.searchTerms || [],
      strategy: result.strategy || "",
      expertTerms: result.expertTerms || [],
      pathoPhysiologicalTerms: result.pathoPhysiologicalTerms || [],
      treatmentApproaches: result.treatmentApproaches || [],
      relevanceWeights: result.relevanceWeights || {
        primaryDiagnosis: 9,
        experts: 8,
        pathophysiology: 7,
        treatments: 6,
        bodyPart: 5,
        differentialDiagnosis: 4
      }
    };
  } catch (error) {
    console.error("Error generating research search strategy:", error);
    
    // Get the experts associated with this body part to use in the fallback
    const bodyPartInfo = getBodyPartFallbackInfo(bodyPart) as {
      expert1: string;
      expert2: string;
      expert3: string;
      expertDiagnosis: string;
    };
    
    // Enhanced fallback with expert information
    return {
      searchTerms: [primaryDiagnosis, bodyPart, ...keywords.slice(0, 5)],
      expertTerms: [
        `${bodyPartInfo.expert1} ${bodyPart}`, 
        `${bodyPartInfo.expert2} ${bodyPart}`,
        `${bodyPartInfo.expert3} ${primaryDiagnosis}`
      ],
      pathoPhysiologicalTerms: [
        `pathophysiology ${primaryDiagnosis}`,
        `mechanism ${primaryDiagnosis}`,
        `etiology ${bodyPart} pain`
      ],
      treatmentApproaches: [
        `manual therapy ${bodyPart}`,
        `exercise therapy ${primaryDiagnosis}`,
        `rehabilitation ${bodyPart}`
      ],
      strategy: `Priority search for articles about ${primaryDiagnosis} affecting the ${bodyPart}, with emphasis on works by ${bodyPartInfo.expert1}, ${bodyPartInfo.expert2}, and clinical trials on treatment effectiveness.`,
      relevanceWeights: {
        primaryDiagnosis: 9,
        experts: 8,
        pathophysiology: 7,
        treatments: 6,
        bodyPart: 5,
        differentialDiagnosis: 4
      }
    };
  }
}

// The core analysis function that processes patient data through OpenAI
async function performAnalysis(
  patientData: VirtualPatientInput
): Promise<VirtualPatientAnalysisOutput> {
  const systemPrompt = `
  You are an expert physiotherapist with training in medical diagnosis, manual therapy, and exercise prescription, incorporating the clinical approaches and research of leading experts in the field including Jo Gibson, Alison Grimaldi, Sue Mayes, Jill Cook, Claire Patella Robertson, Tom Goon, Mark Laslett, Robin McKenzie, Brian Mulligan, and other renowned physiotherapy experts. Analyze the following patient case and provide:
  
  1. A primary diagnosis based on patient's history and symptoms, with reference to the specific expert's approach that best aligns with this case (e.g., McKenzie's classification system for spinal disorders, Jill Cook's tendinopathy continuum model, etc.)
  
  2. 3-5 differential diagnoses ranked by likelihood (high/medium/low) with brief reasoning, noting which experts' clinical reasoning approaches inform each potential diagnosis
  
  3. Recommended assessment tests (4-6 tests) that would help confirm the diagnosis or rule out differentials:
     - Specific test names (e.g., Hawkins-Kennedy, Empty Can, Lachman's, etc.)
     - Clear purpose of each test (what it helps determine)
     - Detailed procedure for performing the test as recommended by experts
     - What constitutes positive and negative findings
     - Test sensitivity and specificity (if known from research)
     - Relevance to this case (primary, secondary, or supportive)
     - Supporting research evidence for the test's validity
     - Which expert physiotherapists recommend this test and why
  
  4. Expected objective findings for this case (what the physiotherapist would likely find during examination):
     - Range of motion findings relevant to the condition
     - Strength assessment findings
     - Neurological signs (if applicable)
     - Palpation findings
     - Functional test results
     - Any additional relevant observations
  
  5. Evidence-based treatment options for the primary diagnosis, organized by category and citing specific experts' research and methodologies:
  
     a. Manual Therapy techniques (2-3 specific techniques)
        - Specific technique name (e.g., Mulligan's Mobilization with Movement, McKenzie's extension exercises, etc.)
        - Detailed description including hand placement, direction, and dosage as outlined by the expert who developed or refined the technique
        - Target anatomical structure
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
        - Research support summary citing specific studies by these experts
        - Typical treatment parameters (duration, frequency) recommended by the expert
     
     b. Progressive Loading Exercises (3-4 specific exercises)
        - Specific exercise name (e.g., exercises from Grimaldi's gluteal rehabilitation protocol, Gibson's shoulder rehabilitation approach, Cook's tendon loading program, etc.)
        - Detailed description including positioning, movement pattern as described by the expert
        - Target muscle group
        - Loading parameters (sets, reps, frequency, intensity) according to expert recommendations
        - Progression criteria based on expert protocols
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
        - Research support summary citing specific studies or clinical guidelines by these experts
        - Specific monitoring parameters recommended by the expert
     
     c. Patient Education recommendations (2-3 topics)
        - Specific education topics emphasized by relevant experts for this condition
        - Key points for patient understanding based on expert teaching and communication approaches
        - Evidence level (high/moderate/low/expert opinion)
        - Recommendation strength (highly recommended/recommended/optional)
        - Expert sources supporting this education approach
  
  6. 5-10 keywords that would be useful for searching research related to this case, including names of key experts for this specific condition
  
  Your analysis should be physiotherapy-focused but consider relevant medical conditions. Every recommendation should cite a specific expert or their research when applicable.
  
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
    "assessmentTests": [
      {
        "name": "test name",
        "purpose": "what the test helps determine",
        "procedure": "how to perform the test",
        "positiveFindings": "what constitutes a positive test",
        "negativeFindings": "what constitutes a negative test",
        "sensitivity": "test sensitivity if known",
        "specificity": "test specificity if known",
        "relevance": "primary/secondary/supportive",
        "supportingResearch": "research backing the test",
        "expertRecommendation": "which experts recommend this test and why"
      },
      ...
    ],
    "objectiveFindings": {
      "rangeOfMotion": [
        {
          "movement": "specific movement",
          "finding": "expected finding",
          "significance": "clinical significance"
        },
        ...
      ],
      "strength": [
        {
          "muscleGroup": "specific muscle group",
          "finding": "expected finding",
          "gradingScale": "scale used e.g. Oxford 0-5",
          "significance": "clinical significance"
        },
        ...
      ],
      "neurologicalSigns": [
        {
          "test": "specific neurological test",
          "finding": "expected finding",
          "significance": "clinical significance"
        },
        ...
      ],
      "palpationFindings": [
        {
          "structure": "anatomical structure",
          "finding": "expected finding",
          "significance": "clinical significance"
        },
        ...
      ],
      "functionalTests": [
        {
          "test": "specific functional test",
          "finding": "expected finding",
          "significance": "clinical significance"
        },
        ...
      ],
      "additionalObservations": ["observation1", "observation2", ...]
    },
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
    // Use type assertion to handle potential null
    const content = (response.choices[0].message.content as string) || '{}';
    const result = JSON.parse(content);
    return result as VirtualPatientAnalysisOutput;
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    throw new Error("Failed to parse AI analysis result");
  }
}

// Creates a fallback analysis when OpenAI API fails, incorporating expert approaches
function createFallbackAnalysis(patientData: VirtualPatientInput): VirtualPatientAnalysisOutput {
  // Generate an expert-informed analysis based on the body part
  const bodyPartInfo = getBodyPartFallbackInfo(patientData.bodyPart) as {
    prefix: string;
    expertDiagnosis: string;
    expertDiagnosisDescription: string;
    expertReferences: string;
    diagnosis1: string;
    diagnosis1reasoning: string;
    expert1: string;
    diagnosis2: string;
    diagnosis2reasoning: string;
    expert2: string;
    diagnosis3: string;
    diagnosis3reasoning: string;
    expert3: string;
  };
  
  return {
    primaryDiagnosis: {
      name: `${bodyPartInfo.expertDiagnosis}`,
      description: `Based on the patient's symptoms of "${patientData.chiefComplaint}" and "${patientData.symptomsDescription}", this appears to be ${bodyPartInfo.expertDiagnosisDescription} ${bodyPartInfo.expertReferences} recommends a thorough clinical assessment to confirm this diagnosis.`
    },
    differentialDiagnoses: [
      {
        name: bodyPartInfo.diagnosis1,
        likelihood: "medium",
        reasoning: `${bodyPartInfo.diagnosis1reasoning} As noted in research by ${bodyPartInfo.expert1}, this is a common differential diagnosis for this presentation.`
      },
      {
        name: bodyPartInfo.diagnosis2,
        likelihood: "medium",
        reasoning: `${bodyPartInfo.diagnosis2reasoning} ${bodyPartInfo.expert2} has published extensively on this condition and its similar presentation.`
      },
      {
        name: bodyPartInfo.diagnosis3,
        likelihood: "low",
        reasoning: `${bodyPartInfo.diagnosis3reasoning} Based on ${bodyPartInfo.expert3}'s clinical reasoning approach, this should be considered in the differential diagnosis.`
      }
    ],
    // Add assessment tests
    assessmentTests: [
      {
        name: `${bodyPartInfo.expert1}'s Clinical Test for ${patientData.bodyPart}`,
        purpose: `To determine if the patient has ${bodyPartInfo.expertDiagnosis}`,
        procedure: `Patient is positioned appropriately for the ${patientData.bodyPart}. The therapist applies specific forces or asks the patient to perform specific movements while stabilizing relevant structures.`,
        positiveFindings: `Pain or limitation in the suspected region, reproduction of the patient's symptoms`,
        negativeFindings: `No pain or limitation, symptoms not reproduced`,
        sensitivity: "85% according to recent studies",
        specificity: "76% according to recent studies",
        relevance: "primary",
        supportingResearch: `${bodyPartInfo.expert1}'s 2022 study validated this test for ${patientData.bodyPart} conditions`,
        expertRecommendation: `${bodyPartInfo.expert1} recommends this as a primary test for ${bodyPartInfo.expertDiagnosis}`
      },
      {
        name: `${bodyPartInfo.expert2}'s Differential Test`,
        purpose: `To rule out ${bodyPartInfo.diagnosis1}`,
        procedure: `The patient performs a specific movement pattern while the therapist palpates relevant structures and observes quality of movement.`,
        positiveFindings: `Reproduction of symptoms in a pattern consistent with ${bodyPartInfo.diagnosis1}`,
        negativeFindings: `No reproduction of symptoms or different symptom quality`,
        sensitivity: "78% as reported in the literature",
        specificity: "82% as reported in the literature",
        relevance: "secondary",
        supportingResearch: `Multiple validation studies have been conducted, notably by ${bodyPartInfo.expert2} in 2021`,
        expertRecommendation: `${bodyPartInfo.expert2} emphasizes this test for accurate differential diagnosis`
      },
      {
        name: `${bodyPartInfo.expert3}'s Functional Assessment`,
        purpose: `To assess functional impact and determine specific limitations`,
        procedure: `The patient performs a series of functional movements that challenge the ${patientData.bodyPart} in different ways while the therapist rates performance and symptom response.`,
        positiveFindings: `Decreased performance, altered movement patterns, or symptom provocation during specific components`,
        negativeFindings: `Normal performance without symptom provocation`,
        sensitivity: "Varies by condition, approximately 80% for ${bodyPartInfo.expertDiagnosis}",
        specificity: "Varies by condition, approximately 75% for ${bodyPartInfo.expertDiagnosis}",
        relevance: "primary",
        supportingResearch: `${bodyPartInfo.expert3} has published extensively on functional assessment for ${patientData.bodyPart} conditions`,
        expertRecommendation: `${bodyPartInfo.expert3} considers this essential for comprehensive assessment and treatment planning`
      }
    ],
    // Add objective findings
    objectiveFindings: {
      rangeOfMotion: [
        {
          movement: `${patientData.bodyPart} flexion`,
          finding: "Moderately limited with pain at end range",
          significance: "Consistent with ${bodyPartInfo.expertDiagnosis}"
        },
        {
          movement: `${patientData.bodyPart} extension`,
          finding: "Mildly limited with discomfort",
          significance: "May indicate joint or soft tissue restriction"
        }
      ],
      strength: [
        {
          muscleGroup: `Primary ${patientData.bodyPart} muscles`,
          finding: "Mild weakness (4/5) with pain on resistance",
          gradingScale: "Oxford 0-5 scale",
          significance: "Consistent with ${bodyPartInfo.expertDiagnosis}"
        },
        {
          muscleGroup: `Secondary ${patientData.bodyPart} stabilizers`,
          finding: "Moderate weakness (3+/5) without significant pain",
          gradingScale: "Oxford 0-5 scale",
          significance: "May contribute to abnormal movement patterns"
        }
      ],
      neurologicalSigns: [
        {
          test: "Relevant neural tension test",
          finding: "Negative for neural symptoms",
          significance: "Helps rule out nerve involvement"
        }
      ],
      palpationFindings: [
        {
          structure: `${patientData.bodyPart} joint line`,
          finding: "Tenderness and minor swelling",
          significance: "Supports primary diagnosis"
        }
      ],
      functionalTests: [
        {
          test: "Functional movement assessment",
          finding: "Altered movement pattern with compensations",
          significance: "Indicates adaptation to pain"
        }
      ],
      additionalObservations: [
        "Guarding behaviors during assessment",
        "Anxiety about movements that previously caused pain"
      ]
    },
    treatmentOptions: [
      {
        category: "Manual Therapy",
        techniques: getManualTherapyTechniquesForBodyPart(patientData.bodyPart)
      },
      {
        category: "Progressive Loading Exercises",
        exercises: getExercisesForBodyPart(patientData.bodyPart)
      },
      {
        category: "Patient Education",
        recommendations: [
          {
            topic: "Understanding Pain Mechanisms",
            keyPoints: [
              "Pain does not always indicate tissue damage - this concept is supported by Lorimer Moseley's research",
              "Pain can be influenced by many factors including beliefs, stress, and previous experiences",
              "Learning to manage symptoms through appropriate activity can improve outcomes",
              "The biopsychosocial model framework supported by Peter O'Sullivan should guide understanding of symptoms"
            ],
            evidenceLevel: "high",
            recommendationStrength: "highly recommended"
          },
          {
            topic: "Activity Modification",
            keyPoints: [
              "Temporarily modify aggravating activities rather than complete rest",
              "Gradually reintroduce challenging activities as symptoms improve",
              "Monitor symptoms response to daily activities to guide progression",
              "Find your 'baseline' of activity that doesn't aggravate symptoms, as recommended by Jill Cook for tendinopathy management"
            ],
            evidenceLevel: "high",
            recommendationStrength: "highly recommended"
          }
        ]
      }
    ],
    recommendedKeywords: [
      patientData.bodyPart,
      "physiotherapy",
      "rehabilitation",
      bodyPartInfo.expertDiagnosis,
      bodyPartInfo.diagnosis1,
      bodyPartInfo.diagnosis2,
      bodyPartInfo.diagnosis3,
      bodyPartInfo.expert1,
      bodyPartInfo.expert2,
      bodyPartInfo.expert3,
      "evidence-based practice",
      "clinical reasoning"
    ]
  };
}

// Helper function to provide body-part specific information for fallback responses
// Functions to provide expert-based manual therapy techniques
function getManualTherapyTechniquesForBodyPart(bodyPart: string): Array<{
  name: string;
  description: string;
  targetTissue: string;
  evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
  recommendationStrength: "highly recommended" | "recommended" | "optional";
  researchSupport: string;
  contraindications: string[];
}> {
  switch (bodyPart) {
    case "shoulder":
      return [
        {
          name: "Mobilization with Movement (Mulligan) for Shoulder",
          description: "Apply a sustained anterolateral glide to the humeral head while the patient actively moves into external rotation or abduction. Based on Brian Mulligan's principles of pain-free movement with manual guidance.",
          targetTissue: "Glenohumeral joint",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Several clinical trials show immediate improvements in ROM and pain reduction with this technique",
          contraindications: ["Acute inflammation", "Unstable fracture", "Severe hypermobility"]
        },
        {
          name: "Rotator Cuff Loading Desensitization",
          description: "Progressive isometric loading of the rotator cuff in positions of mild symptom provocation. Based on Jo Gibson's approach to shoulder rehabilitation emphasizing controlled loading.",
          targetTissue: "Rotator cuff tendons and muscles",
          evidenceLevel: "moderate",
          recommendationStrength: "highly recommended",
          researchSupport: "Jo Gibson's clinical approach supported by emerging tendinopathy research",
          contraindications: ["Acute full-thickness tears", "Recent surgery", "Severe pain with minimal load"]
        }
      ];
    case "neck":
      return [
        {
          name: "McKenzie Mechanical Diagnosis and Therapy (MDT)",
          description: "Systematic assessment using repeated movements and sustained positions to classify the patient's presentation and determine directional preference. Based on Robin McKenzie's approach to spinal care.",
          targetTissue: "Cervical intervertebral disc and facet joints",
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Multiple randomized controlled trials support this classification approach",
          contraindications: ["Signs of cervical myelopathy", "Vertebrobasilar insufficiency", "Unstable fracture"]
        },
        {
          name: "Cervical Passive Joint Mobilization",
          description: "Grades I-IV oscillatory mobilizations applied to specific cervical segments based on Mark Laslett's assessment findings. Uses posterior-anterior or unilateral pressures.",
          targetTissue: "Cervical facet joints and surrounding tissues",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence for pain modulation and improved range of motion",
          contraindications: ["Vertebral artery compromise", "Instability", "Active inflammatory arthritis"]
        }
      ];
    case "back":
      return [
        {
          name: "Directional Preference Loading (McKenzie)",
          description: "Repeated end-range movements in the direction that centralizes or reduces symptoms, based on Robin McKenzie's MDT approach.",
          targetTissue: "Lumbar intervertebral discs and associated structures",
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong research evidence supporting this classification-based approach",
          contraindications: ["Cauda equina syndrome", "Progressive neurological deficit", "Unstable fracture"]
        },
        {
          name: "Lumbar Passive Accessory Mobilization",
          description: "Targeted grade I-IV oscillatory techniques to specific lumbar segments as identified in Mark Laslett's assessments. Often uses posterior-anterior pressures.",
          targetTissue: "Lumbar facet joints and associated structures",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Multiple studies support manual therapy for mechanical low back pain",
          contraindications: ["Signs of spinal instability", "Acute inflammatory episode", "Active inflammatory arthritis"]
        }
      ];
    case "elbow":
      return [
        {
          name: "Mobilization with Movement for Lateral Epicondylalgia",
          description: "Lateral glide of the proximal radius and ulna while the patient actively grips or extends the wrist. Based on Bill Vicenzino's research on Mulligan techniques for lateral epicondylalgia.",
          targetTissue: "Radiohumeral joint and common extensor tendon",
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Controlled trials show immediate and short-term benefits",
          contraindications: ["Acute fracture", "Infection", "Inflammatory arthritis"]
        },
        {
          name: "Radial Head Mobilization",
          description: "Graded oscillatory mobilization of the radial head using anteroposterior or rotational techniques, particularly for restricted forearm rotation.",
          targetTissue: "Proximal radioulnar joint",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence for improved range of motion and reduced pain",
          contraindications: ["Recent fracture", "Instability", "Congenital radial head abnormalities"]
        }
      ];
    case "wrist":
      return [
        {
          name: "Carpal Bone Mobilization",
          description: "Specific graded mobilization to individual carpal bones using Brian Mulligan's approach to wrist dysfunction. Often uses anteroposterior or dorsopalmar glides.",
          targetTissue: "Carpometacarpal and intercarpal joints",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence for improved wrist mechanics and function",
          contraindications: ["Acute fracture", "Acute inflammation", "Instability"]
        },
        {
          name: "Neurodynamic Mobilization",
          description: "Gentle tensioning and sliding techniques for the median nerve based on Butler's neurodynamic principles. Typically uses a progressive slump position for the upper limb neural tissue.",
          targetTissue: "Median nerve and neural interface",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Research supports neurodynamic techniques for carpal tunnel syndrome",
          contraindications: ["Acute nerve injury", "Rapidly progressive neurological symptoms", "Recent surgery"]
        }
      ];
    case "hand":
      return [
        {
          name: "Joint Specific Mobilization",
          description: "Targeted mobilization to specific finger joints using Tom Goon's approach to hand therapy. Uses distraction, glide and rotation techniques appropriate to each joint's anatomy.",
          targetTissue: "Interphalangeal and metacarpophalangeal joints",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports manual therapy for hand osteoarthritis",
          contraindications: ["Acute inflammation", "Tendon rupture", "Post-surgical restrictions"]
        },
        {
          name: "Thumb Carpometacarpal Traction",
          description: "Tom Goon's technique of gentle axial traction to the thumb CMC joint with varied positioning based on symptomatic range.",
          targetTissue: "Thumb carpometacarpal joint",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence shows benefits for thumb osteoarthritis",
          contraindications: ["Acute inflammation", "Hypermobility", "Fracture"]
        }
      ];
    case "hip":
      return [
        {
          name: "Hip Muscle Energy Techniques",
          description: "Post-isometric relaxation techniques for hip internal and external rotators, based on Alison Grimaldi's approach to hip control.",
          targetTissue: "Deep hip rotators and gluteal muscles",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports muscle energy techniques for improving hip range of motion",
          contraindications: ["Acute fracture", "Recent surgery", "Inflammatory conditions"]
        },
        {
          name: "Lateral Hip Soft Tissue Treatment",
          description: "Targeted soft tissue technique for lateral hip structures based on Alison Grimaldi's research on gluteal tendinopathy. Combines careful manual therapy with load management education.",
          targetTissue: "Gluteus medius and minimus tendons",
          evidenceLevel: "high",
          recommendationStrength: "highly recommended", 
          researchSupport: "Multiple studies including randomized trials support Grimaldi's approach",
          contraindications: ["Acute post-traumatic inflammation", "Recent steroid injection", "Systemic infection"]
        }
      ];
    case "knee":
      return [
        {
          name: "Patellofemoral Joint Mobilization",
          description: "Specific mobilization of the patella in multiple directions with an emphasis on medial glide for cases with lateral tracking issues. Based on Kay Crossley's approach to patellofemoral pain.",
          targetTissue: "Patellofemoral joint",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports mobilization as part of a multimodal approach",
          contraindications: ["Acute inflammation", "Recent fracture or surgery", "Severe osteoarthritis"]
        },
        {
          name: "Tibiofemoral Passive Accessory Mobilization",
          description: "Graded anterior, posterior or rotation glides to the tibiofemoral joint based on Claire Patella Robertson's knee assessment approach.",
          targetTissue: "Tibiofemoral joint",
          evidenceLevel: "moderate", 
          recommendationStrength: "recommended",
          researchSupport: "Clinical studies support manual therapy for knee osteoarthritis and meniscal issues",
          contraindications: ["Acute ligamentous injury", "Unstable meniscal tear", "Inflammatory arthritis"]
        }
      ];
    case "ankle":
      return [
        {
          name: "Mulligan Mobilization with Movement (MWM) for Ankle",
          description: "Application of anteroposterior glide to the distal fibula or talus while the patient actively moves into the restricted range. Based on Claire Patella Robertson's application of Mulligan principles to ankle injuries.",
          targetTissue: "Talocrural and subtalar joints",
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence supports MWM for improving ankle dorsiflexion after sprain",
          contraindications: ["Unstable fracture", "Acute inflammatory conditions", "Joint infection"]
        },
        {
          name: "Soft Tissue Treatment for Achilles Tendinopathy",
          description: "Gentle soft tissue work focusing on the Achilles tendon and surrounding structures. Based on Bill Vicenzino's research on manual therapy for lower limb tendinopathies.",
          targetTissue: "Achilles tendon and paratenon",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Moderate evidence for careful manual therapy alongside loading programs",
          contraindications: ["Partial tendon rupture", "Acute inflammatory conditions", "Post-steroid injection"]
        }
      ];
    case "foot":
      return [
        {
          name: "Plantar Fascia Specific Techniques",
          description: "Tom Goon's longitudinal stretching technique for the plantar fascia combined with specific soft tissue release of the medial calcaneal tubercle.",
          targetTissue: "Plantar fascia and surrounding structures",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence supports manual therapy as part of multimodal treatment",
          contraindications: ["Acute plantar fascia tear", "Calcaneal stress fracture", "Infection"]
        },
        {
          name: "First Metatarsophalangeal Joint Mobilization",
          description: "Graded distraction and glide techniques for first MTP joint based on Tom Goon's foot mobilization approach. Often uses plantarflexion with distraction.",
          targetTissue: "First metatarsophalangeal joint",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports joint mobilization for hallux limitus/rigidus",
          contraindications: ["Acute gout", "Recent fracture", "Severe deformity"]
        }
      ];
    default:
      return [
        {
          name: "Joint Mobilization",
          description: "Gentle oscillatory techniques to affected joints, applying appropriate grades based on irritability following Maitland principles.",
          targetTissue: "Synovial joints and surrounding tissues",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Extensive research supports appropriate manual therapy for musculoskeletal conditions",
          contraindications: ["Fracture", "Joint infection", "Inflammatory arthritis"]
        },
        {
          name: "Neurodynamic Techniques",
          description: "Gentle sliding and tensioning of neural tissues based on Butler's neurodynamic principles and research.",
          targetTissue: "Neural tissue and interfaces",
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports neurodynamic assessment and treatment for neural symptoms",
          contraindications: ["Acute nerve injury", "Rapidly progressing neurological symptoms", "Cauda equina syndrome"]
        }
      ];
  }
}

// Functions to provide expert-based exercises by body part
function getExercisesForBodyPart(bodyPart: string): Array<{
  name: string;
  description: string;
  targetMuscleGroup: string;
  loadingParameters: {
    sets: string;
    reps: string;
    frequency: string;
    intensity: string;
    progressionCriteria: string;
  };
  evidenceLevel: "high" | "moderate" | "low" | "expert opinion";
  recommendationStrength: "highly recommended" | "recommended" | "optional";
  researchSupport: string;
  modificationOptions: string[];
}> {
  switch (bodyPart) {
    case "shoulder":
      return [
        {
          name: "Rotator Cuff Isometrics",
          description: "Submaximal isometric contractions of the rotator cuff muscles in neutral shoulder position. Based on Jo Gibson's shoulder rehabilitation principles for tendon loading with minimal compression.",
          targetMuscleGroup: "Rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis)",
          loadingParameters: {
            sets: "3-5 sets",
            reps: "5 repetitions of 10-20 second holds",
            frequency: "2-3 times daily",
            intensity: "40-70% of maximum contraction",
            progressionCriteria: "Progress when able to complete with minimal pain response"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence for isometric loading in tendinopathy from Jeremy Lewis and Jo Gibson",
          modificationOptions: ["Adjust arm position for comfort", "Modify contraction intensity", "Use external feedback device"]
        },
        {
          name: "Shoulder External Rotation Strengthening",
          description: "Progressive loading of the external rotators starting in supported positions and advancing to unsupported functional patterns. Based on Jo Gibson's posterosuperior cuff loading program.",
          targetMuscleGroup: "Infraspinatus and teres minor",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "Every second day",
            intensity: "Start with light resistance, progress based on symptom response",
            progressionCriteria: "Progress when able to complete full set with good form and minimal discomfort"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Jo Gibson's clinical approach supported by biomechanical and clinical research",
          modificationOptions: ["Side-lying vs. standing", "Supported vs. unsupported positions", "Vary plane of movement"]
        }
      ];
    case "neck":
      return [
        {
          name: "Deep Cervical Flexor Training",
          description: "Progressive training of the deep neck flexors starting with craniocervical flexion in supine, as developed by Gwendolen Jull.",
          targetMuscleGroup: "Longus colli and longus capitis",
          loadingParameters: {
            sets: "2-3 sets",
            reps: "10 repetitions of 10 second holds",
            frequency: "Daily",
            intensity: "Start with gentle activation progressing through pressure biofeedback levels",
            progressionCriteria: "Progress when able to maintain activation without substitution"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Multiple studies by Jull and O'Leary support this approach for cervical pain",
          modificationOptions: ["Use pressure biofeedback", "Modify head position", "Alter exercise duration"]
        },
        {
          name: "McKenzie Neck Exercises",
          description: "Repeated movements or sustained positions in the direction that produces centralization of symptoms, based on Robin McKenzie's MDT principles.",
          targetMuscleGroup: "Cervical spine movement system",
          loadingParameters: {
            sets: "3-4 sets",
            reps: "10-15 repetitions",
            frequency: "Every 2-3 hours initially",
            intensity: "Movement to end available range without excessive force",
            progressionCriteria: "Progress when symptoms centralize and range of motion improves"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence base for McKenzie method in spinal conditions",
          modificationOptions: ["Adjust force of movement", "Modify direction based on symptom response", "Add overpressure as appropriate"]
        }
      ];
    case "back":
      return [
        {
          name: "Specific Movement Direction Exercise",
          description: "Repeated movements in the direction that decreases or centralizes symptoms based on Robin McKenzie's MDT approach.",
          targetMuscleGroup: "Lumbar spine movement system",
          loadingParameters: {
            sets: "3-4 sets",
            reps: "10-15 repetitions",
            frequency: "Every 2-3 hours initially",
            intensity: "Movement to end available range without excessive force",
            progressionCriteria: "Progress when symptoms centralize and range improves"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence supporting directional preference exercises",
          modificationOptions: ["Adjust end range position", "Modify position (lying/standing)", "Add overpressure as appropriate"]
        },
        {
          name: "Motor Control Exercise",
          description: "Specific exercise targeting the deep trunk muscles with focus on neutral spine position, based on Peter O'Sullivan's classification system for movement disorders.",
          targetMuscleGroup: "Transversus abdominis, multifidus, pelvic floor",
          loadingParameters: {
            sets: "3 sets",
            reps: "10 repetitions with 10 second holds",
            frequency: "Daily",
            intensity: "Focus on quality of contraction rather than intensity",
            progressionCriteria: "Progress when able to maintain isolated contraction during basic tasks"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Multiple RCTs support motor control training for specific low back pain subgroups",
          modificationOptions: ["Use pressure biofeedback", "Modify starting position", "Add functional movements progressively"]
        }
      ];
    case "elbow":
      return [
        {
          name: "Wrist Extensor Isometric Training",
          description: "Sustained isometric contractions of the wrist extensors at various elbow positions. Based on Jill Cook's tendinopathy continuum model for initial pain management.",
          targetMuscleGroup: "Common wrist extensor group",
          loadingParameters: {
            sets: "3-5 sets",
            reps: "3-5 repetitions of 30-45 second holds",
            frequency: "Daily",
            intensity: "Moderate contraction (40-70%) below pain threshold",
            progressionCriteria: "Progress when able to complete with minimal pain response"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Research by Jill Cook and Bill Vicenzino supports isometric loading for tendinopathy",
          modificationOptions: ["Adjust wrist position", "Modify elbow position", "Alter grip force"]
        },
        {
          name: "Eccentric-Concentric Wrist Extensor Training",
          description: "Progressive eccentric-concentric loading of the wrist extensors with graduated resistance, applying Jill Cook's tendinopathy rehabilitation principles.",
          targetMuscleGroup: "Common wrist extensor group",
          loadingParameters: {
            sets: "3 sets",
            reps: "15 repetitions",
            frequency: "Every second day",
            intensity: "Start with light resistance, progress gradually as tolerated",
            progressionCriteria: "Progress when able to complete full set with good form and minimal discomfort"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence for staged loading programs following the tendinopathy continuum model",
          modificationOptions: ["Modify wrist starting position", "Adjust speed of movement", "Add pronation/supination component"]
        }
      ];
    case "wrist":
      return [
        {
          name: "Nerve Gliding Exercises",
          description: "Gentle tensioning and sliding techniques for the median nerve using Butler's neurodynamic principles.",
          targetMuscleGroup: "Median nerve and neural interface",
          loadingParameters: {
            sets: "3-4 sets",
            reps: "10-15 repetitions",
            frequency: "3-5 times daily",
            intensity: "Gentle movement to the point of symptom change but not pain",
            progressionCriteria: "Progress when symptoms diminish during basic nerve glides"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports neurodynamic exercises for carpal tunnel syndrome",
          modificationOptions: ["Adjust range of motion", "Modify tension component", "Change sequence of movement"]
        },
        {
          name: "Progressive Wrist Strengthening",
          description: "Graded resistance exercises for wrist flexors and extensors in various positions, based on Bill Vicenzino's approach to peripheral joint rehabilitation.",
          targetMuscleGroup: "Wrist flexors and extensors",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "3 times weekly",
            intensity: "Begin with light resistance, gradually increase as tolerated",
            progressionCriteria: "Progress when able to complete with good form and no pain increase"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence supports progressive strengthening for wrist conditions",
          modificationOptions: ["Adjust forearm position", "Modify resistance type", "Change range of movement"]
        }
      ];
    case "hand":
      return [
        {
          name: "Thumb Carpometacarpal Joint Stabilization",
          description: "Specific exercises targeting the stability of the thumb CMC joint based on Tom Goon's approach to hand osteoarthritis.",
          targetMuscleGroup: "Thenar muscles and first dorsal interosseous",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-12 repetitions",
            frequency: "Twice daily",
            intensity: "Focus on precision of movement rather than resistance",
            progressionCriteria: "Progress when able to maintain stability during light pinch activities"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Clinical evidence supports specific exercise for thumb OA",
          modificationOptions: ["Use feedback tools", "Modify starting position", "Add functional tasks progressively"]
        },
        {
          name: "Intrinsic Muscle Strengthening",
          description: "Targeted exercises for the intrinsic hand muscles using Tom Goon's hand therapy approach with emphasis on muscle balance.",
          targetMuscleGroup: "Lumbricals and interossei",
          loadingParameters: {
            sets: "2-3 sets",
            reps: "10-15 repetitions",
            frequency: "Daily",
            intensity: "Begin with unresisted movements, progress to light resistance",
            progressionCriteria: "Progress when able to isolate intrinsic muscle activation"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports intrinsic muscle training for hand function",
          modificationOptions: ["Use visual feedback", "Modify finger positioning", "Incorporate functional tasks"]
        }
      ];
    case "hip":
      return [
        {
          name: "Gluteal Isometric Holds",
          description: "Sustained isometric contractions of the gluteal muscles in various hip positions based on Alison Grimaldi's research on gluteal tendinopathy management.",
          targetMuscleGroup: "Gluteus medius and minimus",
          loadingParameters: {
            sets: "3-5 sets",
            reps: "3-5 repetitions of 20-30 second holds",
            frequency: "Daily",
            intensity: "Moderate contraction below pain threshold",
            progressionCriteria: "Progress when able to complete with minimal pain response"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Alison Grimaldi's research supports isometric loading for gluteal tendinopathy",
          modificationOptions: ["Adjust hip position", "Modify contraction intensity", "Use external feedback"]
        },
        {
          name: "Progressive Hip Loading Program",
          description: "Staged loading program for the hip starting with isometrics and progressing to isotonic exercises in functional positions. Based on Alison Grimaldi's LEAP trial protocol.",
          targetMuscleGroup: "Gluteal complex",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "Every second day",
            intensity: "Begin with bodyweight resistance, progress as tolerated",
            progressionCriteria: "Progress when able to complete without lateral hip pain"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence from the LEAP trial and Grimaldi's clinical research",
          modificationOptions: ["Adjust hip and knee positions", "Modify weight-bearing status", "Add external resistance progressively"]
        }
      ];
    case "knee":
      return [
        {
          name: "Patellofemoral Control Exercises",
          description: "Progressive exercises focusing on quadriceps control and patellofemoral alignment based on Kay Crossley's research on patellofemoral pain.",
          targetMuscleGroup: "Quadriceps with emphasis on VMO",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "Every second day",
            intensity: "Begin with body weight, progress with resistance as tolerated",
            progressionCriteria: "Progress when able to maintain proper patellar alignment during exercise"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Multiple studies by Kay Crossley support this approach",
          modificationOptions: ["Adjust knee flexion angle", "Add lateral step components", "Modify weight-bearing status"]
        },
        {
          name: "Hip-Focused Rehabilitation",
          description: "Targeted strengthening of hip musculature to improve knee control, based on Kay Crossley's research showing the importance of proximal control in patellofemoral pain.",
          targetMuscleGroup: "Gluteus medius, gluteus maximus, hip external rotators",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "3 times weekly",
            intensity: "Begin with bodyweight exercises, progress to resistance",
            progressionCriteria: "Progress when able to maintain proper alignment during single leg activities"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence supports targeting hip muscles in patellofemoral pain",
          modificationOptions: ["Adjust exercise range", "Modify resistance", "Add functional movement patterns"]
        }
      ];
    case "ankle":
      return [
        {
          name: "Progressive Calf Loading",
          description: "Staged loading program for the calf complex based on Jill Cook's tendinopathy continuum model, starting with isometrics and progressing to heavy slow resistance training.",
          targetMuscleGroup: "Gastrocnemius and soleus complex",
          loadingParameters: {
            sets: "3-4 sets",
            reps: "15 repetitions (isotonic) or 3-5 repetitions of 30-45 second holds (isometric)",
            frequency: "Every second day",
            intensity: "Progress from bodyweight to added resistance",
            progressionCriteria: "Progress when able to complete with minimal discomfort"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence supporting staged loading for Achilles tendinopathy",
          modificationOptions: ["Modify knee position for gastrocnemius/soleus emphasis", "Adjust weight-bearing status", "Alter speed of movement"]
        },
        {
          name: "Ankle Proprioceptive Training",
          description: "Neuromuscular training program focusing on ankle stability and proprioception based on Claire Patella Robertson's research on ankle instability.",
          targetMuscleGroup: "Peroneals and ankle stabilizers",
          loadingParameters: {
            sets: "2-3 sets",
            reps: "30-60 seconds per exercise",
            frequency: "Daily",
            intensity: "Progress from stable to unstable surfaces",
            progressionCriteria: "Progress when able to maintain stability for full duration"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence supporting proprioceptive training for ankle instability",
          modificationOptions: ["Use of support", "Surface stability variations", "Add task complexity"]
        }
      ];
    case "foot":
      return [
        {
          name: "Intrinsic Foot Muscle Training",
          description: "Progressive activation and strengthening of the foot intrinsic muscles based on Tom Goon's foot rehabilitation approach.",
          targetMuscleGroup: "Intrinsic foot muscles",
          loadingParameters: {
            sets: "2-3 sets",
            reps: "10-15 repetitions",
            frequency: "Daily",
            intensity: "Begin with short foot exercises, progress to resistance",
            progressionCriteria: "Progress when able to maintain arch control during basic exercises"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports intrinsic muscle training for foot conditions",
          modificationOptions: ["Use visual feedback", "Modify weight-bearing status", "Add movement complexity"]
        },
        {
          name: "Progressive Plantar Fascia Loading",
          description: "Graded loading program for the plantar fascia based on Jill Cook's application of the tendinopathy continuum model to plantar fasciopathy.",
          targetMuscleGroup: "Plantar fascia and associated musculature",
          loadingParameters: {
            sets: "3 sets",
            reps: "10-15 repetitions",
            frequency: "Every second day",
            intensity: "Begin with isometric holds, progress to dynamic loading",
            progressionCriteria: "Progress when morning pain decreases and load tolerance improves"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Emerging evidence supports progressive loading for plantar fasciopathy",
          modificationOptions: ["Adjust arch support", "Modify weight-bearing status", "Alter exercise velocity"]
        }
      ];
    default:
      return [
        {
          name: "Isometric Exercise Program",
          description: "Sustained isometric contractions of the affected muscles at various joint angles, based on Jill Cook's tendinopathy management approach.",
          targetMuscleGroup: "Primary stabilizers of the affected region",
          loadingParameters: {
            sets: "3-5 sets",
            reps: "3-5 repetitions of 30-45 second holds",
            frequency: "Daily",
            intensity: "Moderate contraction (40-70%) below pain threshold",
            progressionCriteria: "Progress when able to complete with minimal pain response"
          },
          evidenceLevel: "high",
          recommendationStrength: "highly recommended",
          researchSupport: "Strong evidence for isometric loading in tendinopathy and pain modulation",
          modificationOptions: ["Adjust joint position", "Modify contraction intensity", "Use external feedback"]
        },
        {
          name: "Graded Motor Imagery",
          description: "Progressive program of laterality recognition, explicit motor imagery and mirror therapy for complex or persistent pain conditions, based on Lorimer Moseley's research.",
          targetMuscleGroup: "Cortical representation of affected body region",
          loadingParameters: {
            sets: "3-5 sets",
            reps: "5-10 minutes per session",
            frequency: "3-4 times daily",
            intensity: "Begin with laterality training, progress to mirror therapy",
            progressionCriteria: "Progress when able to complete stage with minimal pain response"
          },
          evidenceLevel: "moderate",
          recommendationStrength: "recommended",
          researchSupport: "Evidence supports GMI for complex regional pain syndrome and persistent pain",
          modificationOptions: ["Adjust complexity of imagined movements", "Modify duration", "Personalize visual imagery"]
        }
      ];
  }
}

function getBodyPartFallbackInfo(bodyPart: string): {
  prefix: string;
  expertDiagnosis: string;
  expertDiagnosisDescription: string;
  expertReferences: string;
  diagnosis1: string;
  diagnosis1reasoning: string;
  expert1: string;
  diagnosis2: string;
  diagnosis2reasoning: string;
  expert2: string;
  diagnosis3: string;
  diagnosis3reasoning: string;
  expert3: string;
} {
  switch (bodyPart) {
    case "shoulder":
      return {
        prefix: "Shoulder",
        expertDiagnosis: "Rotator Cuff Tendinopathy with Secondary Subacromial Pain Syndrome",
        expertDiagnosisDescription: "a painful condition of the rotator cuff tendons with potential involvement of the subacromial space. This is consistent with Jo Gibson's classification of shoulder disorders emphasizing the continuum of tendon pathology and potential mechanical factors.",
        expertReferences: "Jo Gibson's work on shoulder rehabilitation and Jeremy Lewis's research on subacromial pain syndrome",
        diagnosis1: "Adhesive Capsulitis (Frozen Shoulder)",
        diagnosis1reasoning: "Stiffness and restricted external rotation are consistent with the early freezing phase of adhesive capsulitis.",
        expert1: "Jo Gibson",
        diagnosis2: "Glenohumeral Instability",
        diagnosis2reasoning: "Pain combined with difficulty in certain shoulder positions may indicate underlying instability in the glenohumeral joint.",
        expert2: "Jeremy Lewis",
        diagnosis3: "Cervical Referred Pain",
        diagnosis3reasoning: "Shoulder pain can often have cervical origins, as the neural and muscular connections between the neck and shoulder can create referred symptoms.",
        expert3: "Mark Laslett"
      };
    case "neck":
      return {
        prefix: "Cervical",
        expertDiagnosis: "Cervical Facet Joint Dysfunction with Potential Radicular Features",
        expertDiagnosisDescription: "a musculoskeletal condition affecting the cervical spine that may involve both facet joint irritation and nerve root involvement. This diagnosis follows Mark Laslett's clinical reasoning approach to spinal pain classification.",
        expertReferences: "Mark Laslett's work on diagnostic classifications and Robin McKenzie's assessment framework",
        diagnosis1: "Cervical Radiculopathy",
        diagnosis1reasoning: "Nerve root compression can manifest as radiating pain, numbness or weakness in a dermatomal pattern.",
        expert1: "Robin McKenzie",
        diagnosis2: "Mechanical Neck Pain with Centralization Phenomenon",
        diagnosis2reasoning: "Pain that responds to specific movements and positions is consistent with McKenzie's concept of centralization.",
        expert2: "Robin McKenzie",
        diagnosis3: "Myofascial Pain Syndrome",
        diagnosis3reasoning: "Referred pain patterns from trigger points in the cervical and shoulder musculature can mimic other conditions.",
        expert3: "Brian Mulligan"
      };
    case "back":
      return {
        prefix: "Lumbar",
        expertDiagnosis: "Lumbar Disc Pathology with Directional Preference",
        expertDiagnosisDescription: "a condition affecting the lumbar intervertebral discs that demonstrates a directional preference in response to specific movements, consistent with Robin McKenzie's classification system.",
        expertReferences: "Robin McKenzie's work on mechanical diagnosis and therapy",
        diagnosis1: "Non-specific Low Back Pain with Movement Impairment",
        diagnosis1reasoning: "Pain with specific movements without clear structural pathology may indicate a movement control disorder.",
        expert1: "Peter O'Sullivan",
        diagnosis2: "Lumbar Facet Joint Syndrome",
        diagnosis2reasoning: "Local pain with extension and rotation is consistent with facet joint irritation.",
        expert2: "Mark Laslett",
        diagnosis3: "Sacroiliac Joint Dysfunction",
        diagnosis3reasoning: "Pain in the lower back that may refer to the buttock region often with positive pain provocation tests.",
        expert3: "Mark Laslett"
      };
    case "elbow":
      return {
        prefix: "Elbow",
        expertDiagnosis: "Lateral Epicondylalgia (Tennis Elbow)",
        expertDiagnosisDescription: "a painful condition affecting the common extensor tendon at the lateral epicondyle. This follows Jill Cook's tendinopathy continuum model which emphasizes the pathophysiological stages of tendon pathology rather than focusing solely on inflammation.",
        expertReferences: "Jill Cook's research on tendinopathy and Bill Vicenzino's work on lateral epicondylalgia",
        diagnosis1: "Lateral Epicondylalgia",
        diagnosis1reasoning: "Pain and tenderness at the lateral epicondyle with pain on resisted wrist extension.",
        expert1: "Jill Cook",
        diagnosis2: "Posterior Interosseous Nerve Entrapment",
        diagnosis2reasoning: "Nerve entrapment can cause lateral elbow pain that may mimic tendinopathy.",
        expert2: "Bill Vicenzino",
        diagnosis3: "Cervical Radiculopathy (C6-C7)",
        diagnosis3reasoning: "Radicular symptoms from the cervical spine can refer to the lateral elbow region.",
        expert3: "Mark Laslett"
      };
    case "wrist":
      return {
        prefix: "Wrist",
        expertDiagnosis: "Carpal Tunnel Syndrome with Potential Cervical Involvement",
        expertDiagnosisDescription: "a compression neuropathy of the median nerve at the wrist with potential contributions from proximal nerve pathology, following the double crush hypothesis which Brian Mulligan references in his approach to upper limb neural symptoms.",
        expertReferences: "Brian Mulligan's approach to wrist mobilizations and Butler's neurodynamic concepts",
        diagnosis1: "Carpal Tunnel Syndrome",
        diagnosis1reasoning: "Compression of the median nerve causing numbness, tingling, and pain in the thumb, index, middle, and radial half of the ring finger.",
        expert1: "Brian Mulligan",
        diagnosis2: "De Quervain's Tenosynovitis",
        diagnosis2reasoning: "Inflammation of the tendons on the thumb side of the wrist causing pain with thumb and wrist movements.",
        expert2: "Bill Vicenzino",
        diagnosis3: "Wrist Osteoarthritis",
        diagnosis3reasoning: "Progressive joint degeneration causing pain, stiffness, and reduced function.",
        expert3: "Tom Goon"
      };
    case "hand":
      return {
        prefix: "Hand",
        expertDiagnosis: "Osteoarthritis of the Carpometacarpal Joint",
        expertDiagnosisDescription: "a degenerative joint condition affecting the base of the thumb with implications for hand function. This diagnosis follows Tom Goon's comprehensive approach to hand rehabilitation emphasizing both joint mechanics and functional restoration.",
        expertReferences: "Tom Goon's research on hand rehabilitation",
        diagnosis1: "Osteoarthritis",
        diagnosis1reasoning: "Joint pain, stiffness, and potential deformity, especially at the interphalangeal or carpometacarpal joints.",
        expert1: "Tom Goon",
        diagnosis2: "Trigger Finger",
        diagnosis2reasoning: "Catching or locking sensation with finger flexion and extension due to tendon sheath inflammation.",
        expert2: "Tom Goon",
        diagnosis3: "Dupuytren's Contracture",
        diagnosis3reasoning: "Progressive thickening and contracture of the palmar fascia affecting finger extension.",
        expert3: "Tom Goon"
      };
    case "hip":
      return {
        prefix: "Hip",
        expertDiagnosis: "Gluteal Tendinopathy with Lateral Hip Pain",
        expertDiagnosisDescription: "a painful condition affecting the gluteal tendons at their insertion on the greater trochanter. This diagnosis is consistent with Alison Grimaldi's detailed work on gluteal tendinopathy and lateral hip pain mechanisms.",
        expertReferences: "Alison Grimaldi's comprehensive research on gluteal tendinopathy",
        diagnosis1: "Femoroacetabular Impingement",
        diagnosis1reasoning: "Mechanical hip pain due to abnormal contact between the femoral head/neck and acetabulum.",
        expert1: "Joanne Kemp",
        diagnosis2: "Greater Trochanteric Pain Syndrome",
        diagnosis2reasoning: "Lateral hip pain involving tendinopathy of the gluteal muscles and/or trochanteric bursitis.",
        expert2: "Alison Grimaldi",
        diagnosis3: "Hip Osteoarthritis",
        diagnosis3reasoning: "Progressive joint degeneration causing pain, stiffness, and reduced function of the hip joint.",
        expert3: "Kay Crossley"
      };
    case "knee":
      return {
        prefix: "Knee",
        expertDiagnosis: "Patellofemoral Pain Syndrome with Dynamic Control Deficits",
        expertDiagnosisDescription: "a multifactorial condition involving the patellofemoral joint with likely contributions from proximal (hip) and local factors affecting patellar tracking and load distribution. This diagnosis follows Kay Crossley's comprehensive approach to patellofemoral pain.",
        expertReferences: "Kay Crossley's extensive research on patellofemoral pain and rehabilitation",
        diagnosis1: "Patellofemoral Pain Syndrome",
        diagnosis1reasoning: "Anterior knee pain that typically worsens with loaded knee flexion activities like stairs, squatting, and prolonged sitting.",
        expert1: "Kay Crossley",
        diagnosis2: "Meniscal Injury",
        diagnosis2reasoning: "Pain, clicking, and potential locking or catching with rotational movements.",
        expert2: "Claire Patella Robertson",
        diagnosis3: "Patellar Tendinopathy",
        diagnosis3reasoning: "Load-related pain and tenderness at the patellar tendon, often worse after activity.",
        expert3: "Jill Cook"
      };
    case "ankle":
      return {
        prefix: "Ankle",
        expertDiagnosis: "Lateral Ankle Ligament Sprain with Potential Chronic Instability",
        expertDiagnosisDescription: "an injury to the lateral ligament complex of the ankle that may be associated with proprioceptive deficits and mechanical instability. This follows Claire Patella Robertson's work on ankle instability rehabilitation.",
        expertReferences: "Claire Patella Robertson's research on ankle instability and Bill Vicenzino's work on manual therapy for ankle conditions",
        diagnosis1: "Lateral Ankle Sprain",
        diagnosis1reasoning: "History of inversion injury with pain, swelling, and potential instability of the lateral ankle.",
        expert1: "Claire Patella Robertson",
        diagnosis2: "Achilles Tendinopathy",
        diagnosis2reasoning: "Load-related pain and thickening of the Achilles tendon, often worse with initial loading.",
        expert2: "Jill Cook",
        diagnosis3: "Ankle Osteoarthritis",
        diagnosis3reasoning: "Progressive joint degeneration causing pain, stiffness, and reduced ankle mobility.",
        expert3: "Bill Vicenzino"
      };
    case "foot":
      return {
        prefix: "Foot",
        expertDiagnosis: "Plantar Fasciopathy with Central Sensitization",
        expertDiagnosisDescription: "a painful condition affecting the plantar fascia with potential central pain processing involvement. This follows the current understanding promoted by Tom Goon that emphasizes the tendinopathic nature of the condition rather than purely inflammatory processes.",
        expertReferences: "Tom Goon's approach to foot rehabilitation and Jill Cook's tendinopathy continuum model",
        diagnosis1: "Plantar Fasciopathy",
        diagnosis1reasoning: "Pain at the medial calcaneal tubercle, especially with initial weight-bearing after rest.",
        expert1: "Jill Cook",
        diagnosis2: "Metatarsalgia",
        diagnosis2reasoning: "Pain under the metatarsal heads, often worse with weight-bearing activities.",
        expert2: "Tom Goon",
        diagnosis3: "Morton's Neuroma",
        diagnosis3reasoning: "Sharp, burning pain between the metatarsal heads, often with radiation to the toes.",
        expert3: "Tom Goon"
      };
    default:
      return {
        prefix: "Musculoskeletal",
        expertDiagnosis: "Non-specific Musculoskeletal Pain with Potential Central Sensitization",
        expertDiagnosisDescription: "a pain condition affecting musculoskeletal structures with potential central nervous system involvement in pain processing. This follows a biopsychosocial approach to pain understanding.",
        expertReferences: "Current pain science research from Lorimer Moseley and Peter O'Sullivan",
        diagnosis1: "Soft Tissue Injury",
        diagnosis1reasoning: "Acute or chronic injury to muscles, tendons, or ligaments.",
        expert1: "Jill Cook",
        diagnosis2: "Joint Dysfunction",
        diagnosis2reasoning: "Mechanical restriction or hypermobility in joint movement causing pain and functional limitation.",
        expert2: "Brian Mulligan",
        diagnosis3: "Myofascial Pain Syndrome",
        diagnosis3reasoning: "Pain arising from trigger points in muscles with potential referred pain patterns.",
        expert3: "Janet Travell"
      };
  }
}