import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JointMetrics {
  joint: 'ankle' | 'knee' | 'hip' | 'shoulder' | 'elbow' | 'wrist';
  // Movement-based metrics
  movementRange?: number;
  smoothness?: number;
  compensationPatterns?: string[];
  symmetry?: number;
  // Legacy static metrics (for backward compatibility)
  flexionAngle?: number;
  extensionAngle?: number;
  abductionAngle?: number;
  adductionAngle?: number;
  rotationAngle?: number;
  alignmentScore?: number;
  rangeOfMotion?: number;
  poseLandmarks?: any;
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
            content: "You are an expert musculoskeletal physiotherapist specializing in movement analysis and functional assessment. Your role is to identify MOVEMENT PROBLEMS and FUNCTIONAL LIMITATIONS, not just describe measurements. Focus on: 1) What compensations reveal about underlying dysfunction, 2) How movement quality indicates pathology, 3) Specific functional limitations affecting daily activities, 4) Targeted interventions for the PRIMARY problem identified. Avoid generic descriptions - provide clinically actionable insights based on movement pathology."
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
    
    // Check if we have movement-based metrics (new format)
    const isMovementAnalysis = metrics.movementRange !== undefined;
    
    if (isMovementAnalysis) {
      // Movement-based analysis prompt
      const compensations = metrics.compensationPatterns?.join(', ') || 'None detected';
      
      return `
Please analyze this ${jointName} movement assessment and identify functional problems, not just measurements.

MOVEMENT DATA:
- Movement Range Achieved: ${metrics.movementRange?.toFixed(1)}° (total range during active movement)
- Movement Smoothness: ${metrics.smoothness?.toFixed(2)} (lower = smoother, jerky if >5.0)
- Bilateral Symmetry: ${metrics.symmetry?.toFixed(1)}% (100% = perfect symmetry)
- Compensation Patterns Detected: ${compensations}

CRITICAL: Focus on FUNCTIONAL PROBLEMS and MOVEMENT QUALITY, not just range numbers:
- A low range during movement indicates ACTUAL restriction (not just resting position)
- High smoothness score (>5.0) indicates jerky/guarded movement suggesting pain or instability
- Compensations reveal dysfunction (e.g., "scapular elevation" = rotator cuff weakness/impingement)
- Asymmetry >10% indicates unilateral dysfunction or injury

Provide ACTIONABLE clinical analysis in this JSON format:
{
  "interpretation": {
    "overall": "Identify PRIMARY FUNCTIONAL PROBLEM (e.g., 'Restricted shoulder abduction with scapular compensation suggesting impingement' NOT 'low range detected')",
    "angleAnalysis": "What does the movement range reveal about function? (e.g., 'Limited to 85° suggests capsular restriction affecting overhead activities')",
    "alignmentAnalysis": "How do compensations indicate dysfunction? (e.g., 'Early scapular elevation indicates rotator cuff weakness or subacromial impingement')",
    "romAnalysis": "Functional impact and activity limitations (e.g., 'Overhead reaching compromised, difficulty with hair washing, dressing')"
  },
  "clinicalFindings": {
    "restrictions": ["Specific movement restrictions with clinical reasoning (e.g., 'Limited glenohumeral abduction - capsular pattern')"],
    "compensations": ["Explain WHY compensations occur (e.g., 'Scapular elevation - compensating for weak rotator cuff')"],
    "asymmetries": ["Clinical significance of asymmetries (e.g., 'Right shoulder 30% reduced - possible injury or guarding')"]
  },
  "recommendations": {
    "exercises": ["Target the PRIMARY PROBLEM (e.g., 'Rotator cuff strengthening - external rotation at 0° abduction')"],
    "manualTherapy": ["Address restrictions (e.g., 'Posterior capsule mobilization', 'Scapular stabilization techniques')"],
    "precautions": ["Movement-specific warnings (e.g., 'Avoid overhead lifting until compensation pattern resolves')"]
  },
  "redFlags": ["Any concerning patterns requiring referral (e.g., 'Severe asymmetry with guarding suggests acute injury - imaging recommended')"],
  "confidenceScore": 85
}

Base analysis on movement pathology and functional limitations, NOT static measurements.
`;
    } else {
      // Legacy static analysis prompt (fallback)
      let angleInfo = '';
      if (metrics.flexionAngle !== undefined) {
        angleInfo += `\n- Flexion: ${metrics.flexionAngle.toFixed(1)}°`;
      }
      if (metrics.extensionAngle !== undefined) {
        angleInfo += `\n- Extension: ${metrics.extensionAngle.toFixed(1)}°`;
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
