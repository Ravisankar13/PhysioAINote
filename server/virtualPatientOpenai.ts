import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes a virtual patient case and generates diagnosis, differential diagnosis, and treatment recommendations
 * @param virtualPatient Patient information and symptoms
 * @returns Analysis with diagnosis, differential diagnosis, and treatment options
 */
export async function analyzeVirtualPatientCase(virtualPatient: {
  patientName: string;
  age: string;
  gender: string;
  chiefComplaint: string;
  symptomsDescription: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  socialHistory?: string;
  familyHistory?: string;
  medications?: string;
  allergies?: string;
  bodyPart: string;
}) {
  try {
    const prompt = constructVirtualPatientPrompt(virtualPatient);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist with extensive clinical experience. Analyze this patient case thoroughly and provide a detailed assessment including primary diagnosis, differential diagnoses, evidence-based treatment options, and relevant research considerations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    
    const result = JSON.parse(content);
    
    return result;
  } catch (error: any) {
    console.error("Error analyzing virtual patient case:", error);
    throw new Error(`Failed to analyze patient case: ${error.message}`);
  }
}

/**
 * Constructs a prompt for analyzing a virtual patient case
 * @param virtualPatient The patient information and symptoms
 * @returns Formatted prompt string
 */
function constructVirtualPatientPrompt(virtualPatient: {
  patientName: string;
  age: string;
  gender: string;
  chiefComplaint: string;
  symptomsDescription: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  socialHistory?: string;
  familyHistory?: string;
  medications?: string;
  allergies?: string;
  bodyPart: string;
}): string {
  return `
Patient Information:
- Name: ${virtualPatient.patientName}
- Age: ${virtualPatient.age}
- Gender: ${virtualPatient.gender}
- Chief Complaint: ${virtualPatient.chiefComplaint}
- Body Part Affected: ${virtualPatient.bodyPart}
${virtualPatient.pastMedicalHistory ? `- Past Medical History: ${virtualPatient.pastMedicalHistory}` : ''}
${virtualPatient.pastSurgicalHistory ? `- Past Surgical History: ${virtualPatient.pastSurgicalHistory}` : ''}
${virtualPatient.socialHistory ? `- Social History: ${virtualPatient.socialHistory}` : ''}
${virtualPatient.familyHistory ? `- Family History: ${virtualPatient.familyHistory}` : ''}
${virtualPatient.medications ? `- Medications: ${virtualPatient.medications}` : ''}
${virtualPatient.allergies ? `- Allergies: ${virtualPatient.allergies}` : ''}

Detailed Symptoms Description:
"""
${virtualPatient.symptomsDescription}
"""

Based on this information, provide a comprehensive clinical analysis with the following sections:

1. Primary Diagnosis: The most likely diagnosis based on the patient's presentation.
2. Differential Diagnoses: List of other potential diagnoses that should be considered, ranked by likelihood.
3. Evidence-Based Treatment Options: Recommended treatment approaches based on current best evidence.
4. Key Research Considerations: Important research topics or findings that are relevant to this case.

Return your analysis in JSON format with the following structure:
{
  "primaryDiagnosis": {
    "name": "diagnosis name",
    "description": "detailed description with clinical reasoning"
  },
  "differentialDiagnoses": [
    {
      "name": "differential diagnosis 1",
      "likelihood": "high/medium/low",
      "reasoning": "clinical reasoning for this differential"
    },
    {
      "name": "differential diagnosis 2",
      "likelihood": "high/medium/low",
      "reasoning": "clinical reasoning for this differential"
    }
  ],
  "treatmentOptions": [
    {
      "name": "treatment approach 1",
      "description": "detailed description",
      "evidenceLevel": "strong/moderate/limited",
      "recommendationStrength": "highly recommended/recommended/optional"
    },
    {
      "name": "treatment approach 2",
      "description": "detailed description",
      "evidenceLevel": "strong/moderate/limited",
      "recommendationStrength": "highly recommended/recommended/optional"
    }
  ],
  "researchConsiderations": [
    {
      "topic": "research topic 1",
      "relevance": "why this research is relevant to the case"
    },
    {
      "topic": "research topic 2",
      "relevance": "why this research is relevant to the case"
    }
  ],
  "recommendedKeywords": ["keyword1", "keyword2", "keyword3"] 
}
`;
}

/**
 * Finds relevant research articles for a virtual patient case
 * @param diagnosis Primary diagnosis
 * @param differentialDiagnoses List of differential diagnoses
 * @param bodyPart Affected body part
 * @param keywords Keywords for search
 * @returns List of article IDs relevant to the case
 */
export async function findRelevantResearchArticles(
  diagnosis: string,
  differentialDiagnoses: string[],
  bodyPart: string,
  keywords: string[]
) {
  try {
    const prompt = `
I need to find relevant research articles for a patient with the following:
- Primary diagnosis: ${diagnosis}
- Differential diagnoses: ${differentialDiagnoses.join(', ')}
- Affected body part: ${bodyPart}
- Keywords: ${keywords.join(', ')}

I have a database of research articles with the following information:
- Title
- Authors
- Journal
- Year
- Abstract
- Body part category
- DOI

Provide a search strategy that would effectively find the most relevant articles for this case. Focus on:
1. The most important search terms to use
2. How to combine search terms using AND/OR operators
3. What filters (body part, recency, etc.) would be most useful

Return your response in JSON format with the following structure:
{
  "searchTerms": ["term1", "term2", "term3"],
  "bodyPartFilter": "specific body part to filter by",
  "searchStrategy": "description of how to effectively search for relevant articles"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in evidence-based practice and medical literature searching. Help create an effective search strategy to find relevant research articles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Error finding relevant research articles:", error);
    throw new Error(`Failed to find relevant research: ${error.message}`);
  }
}