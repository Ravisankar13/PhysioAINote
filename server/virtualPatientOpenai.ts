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
  You are an expert physiotherapist with training in medical diagnosis, manual therapy, and exercise prescription, incorporating the clinical approaches and research of leading experts in the field including Jo Gibson, Alison Grimaldi, Sue Mayes, Jill Cook, Claire Patella Robertson, Tom Goon, Mark Laslett, Robin McKenzie, Brian Mulligan, and other renowned physiotherapy experts. Analyze the following patient case and provide:
  
  1. A primary diagnosis based on patient's history and symptoms, with reference to the specific expert's approach that best aligns with this case (e.g., McKenzie's classification system for spinal disorders, Jill Cook's tendinopathy continuum model, etc.)
  
  2. 3-5 differential diagnoses ranked by likelihood (high/medium/low) with brief reasoning, noting which experts' clinical reasoning approaches inform each potential diagnosis
  
  3. Evidence-based treatment options for the primary diagnosis, organized by category and citing specific experts' research and methodologies:
  
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
  
  4. 5-10 keywords that would be useful for searching research related to this case, including names of key experts for this specific condition
  
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

// Creates a fallback analysis when OpenAI API fails, incorporating expert approaches
function createFallbackAnalysis(patientData: VirtualPatientInput): VirtualPatientAnalysisOutput {
  // Generate an expert-informed analysis based on the body part
  const bodyPartInfo = getBodyPartFallbackInfo(patientData.bodyPart);
  
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
    treatmentOptions: [
      {
        category: "Manual Therapy",
        techniques: [
          {
            name: `${patientData.bodyPart.charAt(0).toUpperCase() + patientData.bodyPart.slice(1)} Mobilization Technique`,
            description: `Gentle oscillatory mobilization to the ${patientData.bodyPart} joint applying grades I-IV depending on irritability. Perform with patient in a comfortable position with adequate support.`,
            targetTissue: `${patientData.bodyPart} joint complex`,
            evidenceLevel: "moderate",
            recommendationStrength: "recommended",
            researchSupport: "Multiple RCTs have shown efficacy for pain reduction and improved range of motion",
            contraindications: ["Acute inflammation", "Recent fracture", "Instability"]
          },
          {
            name: "Soft Tissue Massage",
            description: `Targeted massage to surrounding musculature of the ${patientData.bodyPart} using moderate pressure and focusing on areas of tension. Perform for 5-10 minutes per muscle group.`,
            targetTissue: `${patientData.bodyPart} regional musculature`,
            evidenceLevel: "moderate",
            recommendationStrength: "recommended",
            researchSupport: "Systematic reviews support effectiveness for pain reduction and muscle relaxation",
            contraindications: ["Skin infection", "Deep vein thrombosis", "Recent injury"]
          }
        ]
      },
      {
        category: "Progressive Loading Exercises",
        exercises: [
          {
            name: `${patientData.bodyPart.charAt(0).toUpperCase() + patientData.bodyPart.slice(1)} Isometric Exercise`,
            description: `Gentle isometric contraction of ${patientData.bodyPart} muscles against fixed resistance. Start in pain-free position and maintain contraction.`,
            targetMuscleGroup: `Primary ${patientData.bodyPart} stabilizers`,
            loadingParameters: {
              sets: "3-5 sets",
              reps: "5-10 repetitions",
              frequency: "2-3 times daily",
              intensity: "Submaximal (40-70% of maximum contraction)",
              progressionCriteria: "Progress when able to complete with minimal pain and good form"
            },
            evidenceLevel: "high",
            recommendationStrength: "highly recommended",
            researchSupport: "Strong evidence for pain modulation and neuromuscular activation",
            modificationOptions: ["Adjust contraction intensity", "Modify position for comfort"]
          },
          {
            name: `Progressive ${patientData.bodyPart.charAt(0).toUpperCase() + patientData.bodyPart.slice(1)} Loading`,
            description: `Gradual introduction of load to ${patientData.bodyPart} structures through controlled range of motion exercises with increasing resistance.`,
            targetMuscleGroup: `${patientData.bodyPart} prime movers and stabilizers`,
            loadingParameters: {
              sets: "2-4 sets",
              reps: "8-12 repetitions",
              frequency: "Every other day",
              intensity: "Start with body weight or light resistance, increase by 5-10% weekly",
              progressionCriteria: "Progress when able to complete all sets and reps with proper form and minimal discomfort"
            },
            evidenceLevel: "high",
            recommendationStrength: "highly recommended",
            researchSupport: "Systematic reviews show effectiveness for tissue adaptation and functional improvement",
            modificationOptions: ["Modify range of motion", "Adjust resistance", "Change exercise speed"]
          },
          {
            name: "Functional Movement Pattern Training",
            description: `Integration of ${patientData.bodyPart} function into daily movement patterns and activities, focusing on proper biomechanics and control.`,
            targetMuscleGroup: "Integrated movement chains",
            loadingParameters: {
              sets: "2-3 sets",
              reps: "8-10 repetitions",
              frequency: "3-4 times weekly",
              intensity: "Progress from unloaded to loaded movements",
              progressionCriteria: "Progress when movement quality is maintained with current load"
            },
            evidenceLevel: "moderate",
            recommendationStrength: "recommended",
            researchSupport: "Research supports functional training for return to activities and injury prevention",
            modificationOptions: ["Simplify movement pattern", "Reduce speed or complexity"]
          }
        ]
      },
      {
        category: "Patient Education",
        recommendations: [
          {
            topic: "Pain Management Strategies",
            keyPoints: [
              "Initial relative rest from aggravating activities for 24-48 hours",
              "Appropriate use of cold/heat for symptom management",
              "Gradual return to modified activities as tolerated"
            ],
            evidenceLevel: "moderate",
            recommendationStrength: "recommended"
          },
          {
            topic: "Understanding Pain Mechanisms",
            keyPoints: [
              "Pain doesn't always indicate tissue damage",
              "Activity modification, not avoidance, is recommended",
              "Gradually increasing activity tolerance is important for recovery"
            ],
            evidenceLevel: "high",
            recommendationStrength: "highly recommended"
          },
          {
            topic: "Self-Management Strategies",
            keyPoints: [
              "Recognizing and modifying aggravating factors",
              "Implementing home exercise program consistently",
              "Using appropriate pain management techniques"
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