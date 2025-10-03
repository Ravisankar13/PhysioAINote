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
   * Determines the next test to perform using AI-driven clinical reasoning
   */
  async determineNextTest(sessionData: {
    jointType: string;
    testsPerformed: Array<{
      movementType: string;
      instruction: string;
      movementRange: number;
      smoothness: number;
      compensations: string[];
      symmetry?: number;
      findings: string;
    }>;
  }): Promise<{
    clinicalReasoning: string;
    currentHypotheses: Array<{
      diagnosis: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
      testsNeeded: string[];
    }>;
    nextTest: {
      movementType: string;
      instruction: string;
      rationale: string;
    } | null;
    isAssessmentComplete: boolean;
    completionReason?: string;
  }> {
    try {
      const prompt = this.buildClinicalReasoningPrompt(sessionData);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert musculoskeletal physiotherapist using hypothesis-deductive reasoning for clinical assessment. Your role is to:

1. FORM DIFFERENTIAL DIAGNOSES based on movement patterns, compensations, and test findings
2. THINK STRATEGICALLY about which test to perform next to confirm or rule out hypotheses
3. USE CLINICAL REASONING to identify the most discriminative test for differential diagnosis
4. KNOW WHEN TO STOP - assessment is complete when:
   - Primary diagnosis has high confidence with supporting evidence
   - Key differential diagnoses have been adequately ruled in/out
   - Additional tests would not meaningfully change clinical decision-making
   - Typically 3-5 well-chosen tests provide sufficient data

Think like a skilled clinician: each test should add valuable diagnostic information. Avoid redundant testing. Focus on tests that differentiate between competing hypotheses.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return this.processClinicalReasoningResult(result);

    } catch (error) {
      console.error('Error in clinical reasoning:', error);
      throw new Error('Failed to determine next test');
    }
  }

  /**
   * Builds the clinical reasoning prompt for adaptive testing
   */
  private buildClinicalReasoningPrompt(sessionData: {
    jointType: string;
    testsPerformed: Array<{
      movementType: string;
      instruction: string;
      movementRange: number;
      smoothness: number;
      compensations: string[];
      symmetry?: number;
      findings: string;
    }>;
  }): string {
    const jointName = sessionData.jointType.charAt(0).toUpperCase() + sessionData.jointType.slice(1);
    const testCount = sessionData.testsPerformed.length;
    
    let testsHistory = '';
    sessionData.testsPerformed.forEach((test, index) => {
      const compensations = test.compensations.join(', ') || 'None';
      const symmetry = test.symmetry !== undefined ? `${test.symmetry.toFixed(1)}%` : 'N/A';
      
      testsHistory += `
Test ${index + 1}: ${test.movementType}
- Instruction: "${test.instruction}"
- Movement Range: ${test.movementRange.toFixed(1)}°
- Smoothness: ${test.smoothness.toFixed(2)} (lower = smoother)
- Compensations: ${compensations}
- Symmetry: ${symmetry}
- Findings: ${test.findings}
`;
    });

    return `
CLINICAL ASSESSMENT SESSION - ${jointName.toUpperCase()} JOINT
Tests Performed So Far: ${testCount}

${testsHistory}

TASK: Use hypothesis-deductive reasoning to determine the next step in this assessment.

ANALYSIS REQUIRED:
1. CLINICAL REASONING: Synthesize all test findings into a coherent clinical picture
2. DIFFERENTIAL DIAGNOSES: List current diagnostic hypotheses ranked by likelihood (high/moderate/low)
   - For each hypothesis, provide supporting evidence from tests performed
   - Identify what additional tests are needed to confirm/rule out each hypothesis
3. NEXT TEST SELECTION: Choose the most strategic next test OR determine if assessment is complete
   - If more testing needed: specify the exact movement type, clear instruction, and clinical rationale
   - If assessment complete: explain why (sufficient evidence, clear diagnosis, no additional tests needed)

Respond in this JSON format:
{
  "clinicalReasoning": "Comprehensive synthesis of findings and clinical thinking process (2-3 sentences explaining the pattern you see)",
  "currentHypotheses": [
    {
      "diagnosis": "Specific diagnostic hypothesis (e.g., 'Subacromial impingement syndrome')",
      "likelihood": "high" | "moderate" | "low",
      "supportingEvidence": ["Evidence from tests performed (e.g., 'Painful arc during abduction at 80-120°')"],
      "testsNeeded": ["Specific tests that would confirm/rule out this diagnosis (e.g., 'Neer impingement test', 'Hawkins-Kennedy test')"]
    }
  ],
  "nextTest": {
    "movementType": "Specific movement (e.g., 'Internal rotation', 'Flexion with resistance')",
    "instruction": "Clear, specific instruction for the test (e.g., 'Raise your arm forward and up as high as possible')",
    "rationale": "Why this test is the most important next step (e.g., 'Will differentiate between capsular restriction and impingement')"
  } OR null if assessment complete,
  "isAssessmentComplete": true/false,
  "completionReason": "Explanation if complete (e.g., 'Primary diagnosis of rotator cuff tendinopathy confirmed with high confidence. Key differentials ruled out. 4 tests provided sufficient diagnostic clarity.')"
}

CLINICAL DECISION RULES:
- Perform ${testCount >= 5 ? 'CRITICAL EVALUATION - assessment should likely be complete by now unless complex presentation' : `${5 - testCount} more strategic tests maximum`}
- Each new test must target a specific diagnostic question
- Avoid redundant tests that confirm what's already known
- Assessment complete when primary diagnosis has high confidence AND key differentials addressed
`;
  }

  /**
   * Processes and validates the clinical reasoning result
   */
  private processClinicalReasoningResult(result: any): {
    clinicalReasoning: string;
    currentHypotheses: Array<{
      diagnosis: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
      testsNeeded: string[];
    }>;
    nextTest: {
      movementType: string;
      instruction: string;
      rationale: string;
    } | null;
    isAssessmentComplete: boolean;
    completionReason?: string;
  } {
    return {
      clinicalReasoning: result.clinicalReasoning || 'Clinical reasoning analysis completed',
      currentHypotheses: Array.isArray(result.currentHypotheses) 
        ? result.currentHypotheses.map((h: any) => ({
            diagnosis: h.diagnosis || 'Undifferentiated diagnosis',
            likelihood: h.likelihood || 'moderate',
            supportingEvidence: Array.isArray(h.supportingEvidence) ? h.supportingEvidence : [],
            testsNeeded: Array.isArray(h.testsNeeded) ? h.testsNeeded : []
          }))
        : [],
      nextTest: result.nextTest ? {
        movementType: result.nextTest.movementType || '',
        instruction: result.nextTest.instruction || '',
        rationale: result.nextTest.rationale || ''
      } : null,
      isAssessmentComplete: result.isAssessmentComplete || false,
      completionReason: result.completionReason
    };
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
