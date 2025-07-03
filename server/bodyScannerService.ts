import OpenAI from 'openai';
import { BodyScan, InsertBodyScan } from '../shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SymptomData {
  painLevel: number; // 1-10 scale
  painDuration: string;
  painType: string; // sharp, dull, aching, burning, etc.
  painTriggers: string[];
  painRelief: string[];
  swelling: boolean;
  bruising: boolean;
  stiffness: boolean;
  weakness: boolean;
  numbness: boolean;
  previousInjury: boolean;
  additionalSymptoms: string;
}

export interface DiagnosticAnalysis {
  primaryDiagnosis: {
    condition: string;
    confidence: number;
    reasoning: string;
  };
  differentialDiagnoses: Array<{
    condition: string;
    confidence: number;
    reasoning: string;
  }>;
  visualFindings: string[];
  recommendations: {
    immediateActions: string[];
    treatmentOptions: string[];
    referralNeeded: boolean;
    followUpTimeframe: string;
  };
  redFlags: string[];
  confidenceScore: number;
}

export class BodyScannerService {
  
  /**
   * Analyzes a body part image with symptoms to provide diagnostic insights
   */
  async analyzeBodyPart(
    imageBase64: string,
    bodyPart: string,
    symptoms: SymptomData
  ): Promise<DiagnosticAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(bodyPart, symptoms);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist and diagnostic imaging specialist. Analyze the provided image and symptoms to provide evidence-based diagnostic insights. Always prioritize patient safety and include appropriate red flags and referral recommendations."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      return this.processAnalysisResult(analysisResult);

    } catch (error) {
      console.error('Error in body scanner analysis:', error);
      throw new Error('Failed to analyze body part image');
    }
  }

  /**
   * Builds the analysis prompt based on body part and symptoms
   */
  private buildAnalysisPrompt(bodyPart: string, symptoms: SymptomData): string {
    return `
Please analyze this ${bodyPart} image along with the patient's symptoms and provide a comprehensive diagnostic assessment.

Patient Symptoms:
- Pain Level: ${symptoms.painLevel}/10
- Pain Duration: ${symptoms.painDuration}
- Pain Type: ${symptoms.painType}
- Pain Triggers: ${symptoms.painTriggers.join(', ')}
- Pain Relief: ${symptoms.painRelief.join(', ')}
- Swelling: ${symptoms.swelling ? 'Yes' : 'No'}
- Bruising: ${symptoms.bruising ? 'Yes' : 'No'}
- Stiffness: ${symptoms.stiffness ? 'Yes' : 'No'}
- Weakness: ${symptoms.weakness ? 'Yes' : 'No'}
- Numbness: ${symptoms.numbness ? 'Yes' : 'No'}
- Previous Injury: ${symptoms.previousInjury ? 'Yes' : 'No'}
- Additional Symptoms: ${symptoms.additionalSymptoms}

Please provide your analysis in the following JSON format:
{
  "primaryDiagnosis": {
    "condition": "Most likely diagnosis",
    "confidence": 85,
    "reasoning": "Evidence-based explanation"
  },
  "differentialDiagnoses": [
    {
      "condition": "Alternative diagnosis 1",
      "confidence": 65,
      "reasoning": "Why this is considered"
    },
    {
      "condition": "Alternative diagnosis 2", 
      "confidence": 45,
      "reasoning": "Why this is considered"
    }
  ],
  "visualFindings": [
    "Observable findings from the image"
  ],
  "recommendations": {
    "immediateActions": [
      "Immediate care recommendations"
    ],
    "treatmentOptions": [
      "Evidence-based treatment options"
    ],
    "referralNeeded": true,
    "followUpTimeframe": "Recommended follow-up timing"
  },
  "redFlags": [
    "Any warning signs requiring immediate medical attention"
  ],
  "confidenceScore": 75
}

Focus on:
1. Visual assessment of the ${bodyPart} for signs of pathology
2. Correlation with reported symptoms
3. Evidence-based differential diagnoses
4. Appropriate red flag identification
5. Safe, conservative recommendations
6. Clear referral guidelines when indicated

Remember: This is a screening tool to assist healthcare professionals, not replace clinical judgment.
`;
  }

  /**
   * Processes and validates the AI analysis result
   */
  private processAnalysisResult(result: any): DiagnosticAnalysis {
    return {
      primaryDiagnosis: {
        condition: result.primaryDiagnosis?.condition || 'Unable to determine',
        confidence: Math.max(0, Math.min(100, result.primaryDiagnosis?.confidence || 0)),
        reasoning: result.primaryDiagnosis?.reasoning || 'Insufficient data for analysis'
      },
      differentialDiagnoses: (result.differentialDiagnoses || []).map((diff: any) => ({
        condition: diff.condition || 'Unknown condition',
        confidence: Math.max(0, Math.min(100, diff.confidence || 0)),
        reasoning: diff.reasoning || 'No reasoning provided'
      })),
      visualFindings: result.visualFindings || [],
      recommendations: {
        immediateActions: result.recommendations?.immediateActions || [],
        treatmentOptions: result.recommendations?.treatmentOptions || [],
        referralNeeded: result.recommendations?.referralNeeded || true,
        followUpTimeframe: result.recommendations?.followUpTimeframe || 'Within 1-2 weeks'
      },
      redFlags: result.redFlags || [],
      confidenceScore: Math.max(0, Math.min(100, result.confidenceScore || 0))
    };
  }

  /**
   * Gets body part specific guidance for image capture
   */
  getImageCaptureGuidance(bodyPart: string): {
    instructions: string[];
    requiredViews: string[];
    tips: string[];
  } {
    const guidance: Record<string, any> = {
      knee: {
        instructions: [
          "Expose the knee completely",
          "Ensure good lighting",
          "Capture from multiple angles if possible",
          "Include comparison with other knee if needed"
        ],
        requiredViews: ["Front view", "Side view", "Back view (if possible)"],
        tips: [
          "Look for swelling, bruising, deformity",
          "Note any asymmetry compared to other knee",
          "Capture any visible inflammation or skin changes"
        ]
      },
      back: {
        instructions: [
          "Stand straight against a neutral background",
          "Remove clothing to expose the back area",
          "Maintain natural posture",
          "Include full spine length in view"
        ],
        requiredViews: ["Posterior view", "Lateral view"],
        tips: [
          "Look for spinal curvature abnormalities",
          "Note muscle asymmetry or atrophy",
          "Observe posture and alignment"
        ]
      },
      ankle: {
        instructions: [
          "Remove shoes and socks",
          "Position ankle on neutral background",
          "Capture weight-bearing and non-weight-bearing views",
          "Include foot and lower leg in frame"
        ],
        requiredViews: ["Lateral view", "Medial view", "Posterior view"],
        tips: [
          "Look for swelling, bruising, deformity",
          "Note any asymmetry",
          "Observe foot position and alignment"
        ]
      },
      shoulder: {
        instructions: [
          "Expose shoulder and upper arm",
          "Stand in neutral position",
          "Capture at rest and with arm movement if pain allows",
          "Include comparison with other shoulder"
        ],
        requiredViews: ["Anterior view", "Posterior view", "Lateral view"],
        tips: [
          "Look for asymmetry or deformity",
          "Note any visible muscle atrophy",
          "Observe shoulder blade position"
        ]
      }
    };

    return guidance[bodyPart] || {
      instructions: [
        "Expose the affected area completely",
        "Ensure good lighting and clear visibility", 
        "Position against neutral background",
        "Capture multiple angles if possible"
      ],
      requiredViews: ["Primary view", "Secondary angle"],
      tips: [
        "Look for visible signs of pathology",
        "Note any asymmetry or deformity",
        "Include surrounding anatomy for context"
      ]
    };
  }

  /**
   * Validates symptom data
   */
  validateSymptoms(symptoms: SymptomData): string[] {
    const errors: string[] = [];

    if (symptoms.painLevel < 0 || symptoms.painLevel > 10) {
      errors.push('Pain level must be between 0 and 10');
    }

    if (!symptoms.painDuration) {
      errors.push('Pain duration is required');
    }

    if (!symptoms.painType) {
      errors.push('Pain type is required');
    }

    return errors;
  }
}

export const bodyScannerService = new BodyScannerService();