import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SoapData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SanitizedForumPost {
  title: string;
  category: string;
  bodyParts: string[];
  clinicalPresentation: {
    chiefComplaint: string;
    symptoms: string[];
    duration: string;
    mechanism: string;
    aggravatingFactors: string[];
    easingFactors: string[];
  };
  objectiveFindings: {
    movementTests: Array<{
      test: string;
      result: string;
      side?: 'left' | 'right' | 'bilateral';
    }>;
    specialTests: Array<{
      test: string;
      result: string;
      significance: string;
    }>;
    palpation: string[];
    otherFindings: string[];
  };
  assessmentConsiderations: {
    differentialDiagnosis: string[];
    workingDiagnosis: string;
    clinicalReasoning: string;
    redFlags: string[];
  };
  questionsForCommunity: string[];
  sanitizationActions: Array<{
    field: string;
    action: 'removed' | 'replaced' | 'generalized';
    originalSnippet?: string;
    replacedWith?: string;
  }>;
}

export class ForumSanitizationService {
  static async sanitizeSoapForForum(
    soapData: SoapData,
    specificQuestions?: string[]
  ): Promise<SanitizedForumPost> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical privacy expert specializing in de-identifying clinical data for educational forums.
            Your task is to extract clinical information from SOAP notes while removing ALL patient-identifying information.
            
            STRICT PRIVACY RULES:
            1. Remove ALL names, initials, or references to specific people
            2. Replace specific dates with relative timeframes (e.g., "3 weeks ago")
            3. Remove ages - use general terms like "young adult", "middle-aged", "elderly"
            4. Remove locations, clinics, hospitals, or geographic references
            5. Remove occupations unless directly relevant to mechanism
            6. Remove any unique identifiers or case numbers
            7. Generalize rare conditions that could identify someone
            
            CLINICAL EXTRACTION:
            1. Extract the chief complaint and main symptoms
            2. Identify body parts/regions involved
            3. Extract objective test findings without personal details
            4. List differential diagnoses and clinical reasoning
            5. Identify any red flags or safety concerns
            6. Suggest appropriate forum category
            7. Generate a descriptive but anonymous title
            
            Track all sanitization actions for audit purposes.
            
            Return JSON in the exact format specified.`
          },
          {
            role: "user",
            content: `Sanitize this SOAP note for forum posting:
            
            SUBJECTIVE: ${soapData.subjective}
            
            OBJECTIVE: ${soapData.objective}
            
            ASSESSMENT: ${soapData.assessment}
            
            PLAN: ${soapData.plan}
            
            ${specificQuestions ? `User's specific questions: ${specificQuestions.join(', ')}` : ''}
            
            Return JSON with this exact structure:
            {
              "title": "Brief, descriptive, anonymous title",
              "category": "assessment_help|treatment_advice|differential_diagnosis|case_study|evidence_request|technique_question|red_flags|outcome_discussion",
              "bodyParts": ["array of body parts/regions involved"],
              "clinicalPresentation": {
                "chiefComplaint": "main complaint without identifiers",
                "symptoms": ["list of symptoms"],
                "duration": "relative timeframe",
                "mechanism": "how it occurred",
                "aggravatingFactors": ["what makes it worse"],
                "easingFactors": ["what makes it better"]
              },
              "objectiveFindings": {
                "movementTests": [
                  {
                    "test": "test name",
                    "result": "finding",
                    "side": "left|right|bilateral"
                  }
                ],
                "specialTests": [
                  {
                    "test": "test name",
                    "result": "positive/negative",
                    "significance": "what it indicates"
                  }
                ],
                "palpation": ["tender areas"],
                "otherFindings": ["other objective findings"]
              },
              "assessmentConsiderations": {
                "differentialDiagnosis": ["possible diagnoses"],
                "workingDiagnosis": "most likely diagnosis",
                "clinicalReasoning": "reasoning process",
                "redFlags": ["any concerning signs"]
              },
              "questionsForCommunity": ["specific questions for forum"],
              "sanitizationActions": [
                {
                  "field": "field name",
                  "action": "removed|replaced|generalized",
                  "originalSnippet": "small snippet",
                  "replacedWith": "replacement if applicable"
                }
              ]
            }`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Add user's specific questions if provided
      if (specificQuestions && specificQuestions.length > 0) {
        result.questionsForCommunity = [
          ...result.questionsForCommunity,
          ...specificQuestions
        ];
      }
      
      return result;
    } catch (error) {
      console.error('Error sanitizing SOAP for forum:', error);
      throw new Error('Failed to sanitize SOAP note for forum posting');
    }
  }

  static async generateForumPreview(sanitizedPost: SanitizedForumPost): Promise<string> {
    // Generate a preview of how the forum post will look
    const preview = `
# ${sanitizedPost.title}

**Category:** ${sanitizedPost.category.replace(/_/g, ' ').toUpperCase()}
**Body Parts:** ${sanitizedPost.bodyParts.join(', ')}

## Clinical Presentation
**Chief Complaint:** ${sanitizedPost.clinicalPresentation.chiefComplaint}
**Duration:** ${sanitizedPost.clinicalPresentation.duration}
**Mechanism:** ${sanitizedPost.clinicalPresentation.mechanism}

### Symptoms
${sanitizedPost.clinicalPresentation.symptoms.map(s => `• ${s}`).join('\n')}

### Aggravating Factors
${sanitizedPost.clinicalPresentation.aggravatingFactors.map(f => `• ${f}`).join('\n')}

### Easing Factors
${sanitizedPost.clinicalPresentation.easingFactors.map(f => `• ${f}`).join('\n')}

## Objective Findings

### Movement Tests
${sanitizedPost.objectiveFindings.movementTests.map(t => 
  `• ${t.test}: ${t.result} ${t.side ? `(${t.side})` : ''}`
).join('\n')}

### Special Tests
${sanitizedPost.objectiveFindings.specialTests.map(t => 
  `• ${t.test}: ${t.result} - ${t.significance}`
).join('\n')}

### Palpation Findings
${sanitizedPost.objectiveFindings.palpation.map(p => `• ${p}`).join('\n')}

## Assessment Considerations
**Working Diagnosis:** ${sanitizedPost.assessmentConsiderations.workingDiagnosis}

### Differential Diagnoses
${sanitizedPost.assessmentConsiderations.differentialDiagnosis.map(d => `• ${d}`).join('\n')}

### Clinical Reasoning
${sanitizedPost.assessmentConsiderations.clinicalReasoning}

${sanitizedPost.assessmentConsiderations.redFlags.length > 0 ? `
### ⚠️ Red Flags
${sanitizedPost.assessmentConsiderations.redFlags.map(r => `• ${r}`).join('\n')}
` : ''}

## Questions for the Community
${sanitizedPost.questionsForCommunity.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---
*This post has been automatically de-identified to protect patient privacy. All personal information has been removed or generalized.*
    `;

    return preview.trim();
  }

  static validatePrivacyCompliance(text: string): boolean {
    // Check for common PII patterns that should not be in sanitized text
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{10,}\b/, // Phone numbers
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, // Potential names (simplified)
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, // Dates
      /\b(Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+/,// Titles with names
      /\b\d+ years? old\b/i, // Specific ages
      /@[a-zA-Z0-9.]+/, // Email patterns
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return true;
  }
}