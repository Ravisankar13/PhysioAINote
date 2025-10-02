import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JointMetrics {
  joint: 'ankle' | 'knee' | 'hip' | 'shoulder' | 'elbow' | 'wrist';
  flexionAngle?: number;
  extensionAngle?: number;
  abductionAngle?: number;
  adductionAngle?: number;
  rotationAngle?: number;
  alignmentScore: number;
  rangeOfMotion: number;
  poseLandmarks: any;
}

export interface JointAnalysisResult {
  joint: string;
  interpretation: {
    overall: string;
    angleAnalysis: string;
    alignmentAnalysis: string;
    romAnalysis: string;
  };
  clinicalFindings: {
    restrictions: string[];
    compensations: string[];
    asymmetries: string[];
  };
  recommendations: {
    exercises: string[];
    manualTherapy: string[];
    precautions: string[];
  };
  redFlags: string[];
  confidenceScore: number;
}

export class JointAnalysisService {
  
  /**
   * Analyzes joint metrics to provide clinical interpretation
   */
  async analyzeJoint(metrics: JointMetrics): Promise<JointAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(metrics);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert musculoskeletal physiotherapist specializing in joint assessment and movement analysis. Analyze the provided joint metrics to provide evidence-based clinical interpretation. Focus on functional limitations, compensation patterns, and specific treatment recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      return this.processAnalysisResult(analysisResult, metrics.joint);

    } catch (error) {
      console.error('Error in joint analysis:', error);
      throw new Error('Failed to analyze joint metrics');
    }
  }

  /**
   * Builds the analysis prompt based on joint metrics
   */
  private buildAnalysisPrompt(metrics: JointMetrics): string {
    const jointName = metrics.joint.charAt(0).toUpperCase() + metrics.joint.slice(1);
    
    let angleInfo = '';
    if (metrics.flexionAngle !== undefined) {
      angleInfo += `\n- Flexion: ${metrics.flexionAngle.toFixed(1)}°`;
    }
    if (metrics.extensionAngle !== undefined) {
      angleInfo += `\n- Extension: ${metrics.extensionAngle.toFixed(1)}°`;
    }
    if (metrics.abductionAngle !== undefined) {
      angleInfo += `\n- Abduction: ${metrics.abductionAngle.toFixed(1)}°`;
    }
    if (metrics.adductionAngle !== undefined) {
      angleInfo += `\n- Adduction: ${metrics.adductionAngle.toFixed(1)}°`;
    }
    if (metrics.rotationAngle !== undefined) {
      angleInfo += `\n- Rotation: ${metrics.rotationAngle.toFixed(1)}°`;
    }

    return `
Please analyze this ${jointName} joint assessment and provide a comprehensive clinical interpretation.

Joint Metrics:
${angleInfo}
- Alignment Score: ${metrics.alignmentScore}/100
- Range of Motion: ${metrics.rangeOfMotion}% of normal

Provide your clinical analysis in the following JSON format:
{
  "interpretation": {
    "overall": "Summary of joint function and key findings",
    "angleAnalysis": "Analysis of joint angles and what they indicate",
    "alignmentAnalysis": "Analysis of joint alignment and implications",
    "romAnalysis": "Analysis of range of motion and functional impact"
  },
  "clinicalFindings": {
    "restrictions": ["Specific movement restrictions identified"],
    "compensations": ["Compensation patterns observed"],
    "asymmetries": ["Any asymmetries or imbalances noted"]
  },
  "recommendations": {
    "exercises": ["Specific exercises for this joint"],
    "manualTherapy": ["Manual therapy techniques indicated"],
    "precautions": ["Important precautions or contraindications"]
  },
  "redFlags": ["Any red flag indicators requiring medical referral"],
  "confidenceScore": 85
}

Base your analysis on current evidence-based physiotherapy practice and functional movement principles.
`;
  }

  /**
   * Processes and validates the AI analysis result
   */
  private processAnalysisResult(result: any, joint: string): JointAnalysisResult {
    return {
      joint,
      interpretation: {
        overall: result.interpretation?.overall || 'Analysis completed',
        angleAnalysis: result.interpretation?.angleAnalysis || 'Joint angles within normal limits',
        alignmentAnalysis: result.interpretation?.alignmentAnalysis || 'Alignment appears adequate',
        romAnalysis: result.interpretation?.romAnalysis || 'Range of motion assessed'
      },
      clinicalFindings: {
        restrictions: result.clinicalFindings?.restrictions || [],
        compensations: result.clinicalFindings?.compensations || [],
        asymmetries: result.clinicalFindings?.asymmetries || []
      },
      recommendations: {
        exercises: result.recommendations?.exercises || [],
        manualTherapy: result.recommendations?.manualTherapy || [],
        precautions: result.recommendations?.precautions || []
      },
      redFlags: result.redFlags || [],
      confidenceScore: result.confidenceScore || 75
    };
  }
}

export const jointAnalysisService = new JointAnalysisService();
