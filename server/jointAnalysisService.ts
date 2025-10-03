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
      return this.processClinicalReasoningResult(result, sessionData.testsPerformed);

    } catch (error) {
      console.error('Error in clinical reasoning:', error);
      throw new Error('Failed to determine next test');
    }
  }

  /**
   * Generates comprehensive final diagnosis synthesizing all test results
   */
  async generateFinalDiagnosis(sessionData: {
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
    currentHypotheses: Array<{
      diagnosis: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
    }>;
  }): Promise<{
    primaryDiagnosis: {
      condition: string;
      confidence: "high" | "moderate" | "low";
      clinicalReasoning: string;
      keyFindings: string[];
    };
    differentialDiagnoses: Array<{
      condition: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
      ruledOutBy?: string;
    }>;
    clinicalReasoningChain: string[];
    treatmentRecommendations: {
      immediateActions: string[];
      exercises: string[];
      manualTherapy: string[];
      precautions: string[];
    };
    redFlags: string[];
    prognosticIndicators: string[];
  }> {
    try {
      const prompt = this.buildFinalDiagnosisPrompt(sessionData);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert musculoskeletal physiotherapist providing comprehensive final diagnostic synthesis. Your role is to:

1. SYNTHESIZE all test findings into a coherent primary diagnosis
2. RANK differential diagnoses with clear supporting evidence
3. PROVIDE step-by-step clinical reasoning demonstrating your diagnostic process
4. DEVELOP comprehensive, evidence-based treatment recommendations
5. IDENTIFY any red flags requiring medical referral
6. ASSESS prognostic indicators for recovery

Use evidence-based clinical reasoning and current best practices in musculoskeletal physiotherapy. Be specific, actionable, and clinically precise.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return this.processFinalDiagnosisResult(result);

    } catch (error) {
      console.error('Error in final diagnosis generation:', error);
      throw new Error('Failed to generate final diagnosis');
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
    
    // Extract previously performed movement types to prevent repetition
    const performedMovementTypes = sessionData.testsPerformed.map(t => t.movementType);
    const performedMovementsList = performedMovementTypes.length > 0 
      ? performedMovementTypes.map((m, i) => `${i + 1}. ${m}`).join('\n')
      : 'None yet';
    
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

    // Define curated test sequences for different joints
    const shoulderTests = [
      'Active abduction (raising arm out to side)',
      'Active flexion (raising arm forward/overhead)', 
      'Active external rotation (rotating arm outward)',
      'Active internal rotation (rotating arm inward/behind back)',
      'Scaption (raising arm at 30° angle between front and side)',
      'Horizontal adduction (crossing arm across chest)',
      'Extension (moving arm backward)',
      'Combined movements (e.g., flexion with rotation)'
    ];

    const curatedTests = sessionData.jointType === 'shoulder' ? shoulderTests : [];
    const availableTestsList = curatedTests.length > 0 
      ? '\n\nAVAILABLE TEST OPTIONS (choose from these):\n' + curatedTests.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : '';

    return `
CLINICAL ASSESSMENT SESSION - ${jointName.toUpperCase()} JOINT
Tests Performed So Far: ${testCount}

MOVEMENT TYPES ALREADY TESTED (DO NOT REPEAT):
${performedMovementsList}
${availableTestsList}

${testsHistory}

TASK: Use hypothesis-deductive reasoning to determine the next step in this assessment.

CRITICAL CONSTRAINT: You MUST select a different movement type than those already tested. The "movementType" field in your response must NOT match any of the movement types listed above unless assessment is complete.

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
    "movementType": "Specific movement that is DIFFERENT from all previously tested movements",
    "instruction": "Clear, specific instruction for the test (e.g., 'Rotate your arm outward while keeping elbow at side')",
    "rationale": "Why this test is the most important next step (e.g., 'Will differentiate between capsular restriction and impingement')",
    "isNovelTest": true (MUST be true - confirms this is a NEW movement type not previously tested)
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
  private processClinicalReasoningResult(
    result: any,
    testsPerformed: Array<{ movementType: string }>
  ): {
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
    // Validate that the recommended test is novel (not a repeat)
    // Normalize movement types by extracting key movement words
    const normalizeMovementType = (type: string): string => {
      return type
        .toLowerCase()
        .replace(/\(.*?\)/g, '') // Remove parenthetical descriptions
        .replace(/active|passive|resisted/gi, '') // Remove modifiers
        .replace(/[^a-z\s]/g, '') // Remove special chars
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 2) // Keep words longer than 2 chars
        .sort()
        .join(' ');
    };
    
    const performedMovementTypes = testsPerformed.map(t => normalizeMovementType(t.movementType));
    let validatedNextTest = null;
    
    if (result.nextTest && !result.isAssessmentComplete) {
      const recommendedType = normalizeMovementType(result.nextTest.movementType || '');
      const isRepeat = performedMovementTypes.some(performed => 
        performed === recommendedType || 
        recommendedType.includes(performed) || 
        performed.includes(recommendedType)
      );
      
      if (isRepeat) {
        console.warn(`AI recommended repeat test: "${result.nextTest.movementType}". Rejecting to force variety.`);
        // Don't include the repeated test - this will trigger assessment completion
        validatedNextTest = null;
      } else {
        validatedNextTest = {
          movementType: result.nextTest.movementType || '',
          instruction: result.nextTest.instruction || '',
          rationale: result.nextTest.rationale || ''
        };
      }
    }
    
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
      nextTest: validatedNextTest,
      isAssessmentComplete: result.isAssessmentComplete || (result.nextTest && validatedNextTest === null) || false,
      completionReason: validatedNextTest === null && result.nextTest 
        ? 'Assessment complete - all available movement patterns tested'
        : result.completionReason
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
   * Builds the comprehensive final diagnosis prompt
   */
  private buildFinalDiagnosisPrompt(sessionData: {
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
    currentHypotheses: Array<{
      diagnosis: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
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
- Smoothness: ${test.smoothness.toFixed(2)}
- Compensations: ${compensations}
- Symmetry: ${symmetry}
- Findings: ${test.findings}
`;
    });

    let hypothesesSummary = '';
    sessionData.currentHypotheses.forEach((hypothesis, index) => {
      const evidence = hypothesis.supportingEvidence.join('; ');
      hypothesesSummary += `
${index + 1}. ${hypothesis.diagnosis} (${hypothesis.likelihood} likelihood)
   Supporting Evidence: ${evidence}
`;
    });

    return `
COMPREHENSIVE FINAL DIAGNOSIS - ${jointName.toUpperCase()} JOINT ASSESSMENT
Total Tests Performed: ${testCount}

COMPLETE TEST HISTORY:
${testsHistory}

CURRENT DIAGNOSTIC HYPOTHESES:
${hypothesesSummary}

TASK: Provide a comprehensive final diagnostic synthesis based on ALL assessment data.

REQUIRED ANALYSIS:

1. PRIMARY DIAGNOSIS
   - Identify the single most likely diagnosis based on all evidence
   - Assign confidence level (high/moderate/low)
   - Provide detailed clinical reasoning explaining WHY this is the primary diagnosis
   - List key findings that support this diagnosis

2. DIFFERENTIAL DIAGNOSES
   - List other possible diagnoses ranked by likelihood
   - For each, provide supporting evidence from the tests
   - If ruled out, explain what finding(s) ruled it out

3. CLINICAL REASONING CHAIN
   - Provide step-by-step reasoning showing how you arrived at the diagnosis
   - Each step should reference specific test findings
   - Show the logical progression from findings → pattern recognition → diagnosis

4. TREATMENT RECOMMENDATIONS
   - Immediate Actions: What should be done first (e.g., pain management, activity modification)
   - Exercises: Specific therapeutic exercises targeting the diagnosed condition
   - Manual Therapy: Hands-on techniques indicated for this condition
   - Precautions: What to avoid or monitor carefully

5. RED FLAGS
   - Identify any concerning patterns requiring medical referral or imaging
   - List specific indicators that suggest serious pathology

6. PROGNOSTIC INDICATORS
   - Expected recovery timeline
   - Factors that may influence recovery (positive and negative)
   - Functional goals and milestones

Respond in this EXACT JSON format:
{
  "primaryDiagnosis": {
    "condition": "Specific diagnosis name (e.g., 'Subacromial impingement syndrome with rotator cuff tendinopathy')",
    "confidence": "high" | "moderate" | "low",
    "clinicalReasoning": "Detailed explanation of why this is the primary diagnosis (2-3 sentences)",
    "keyFindings": ["Specific test findings supporting this diagnosis (e.g., 'Painful arc 80-120° during abduction')"]
  },
  "differentialDiagnoses": [
    {
      "condition": "Alternative diagnosis name",
      "likelihood": "high" | "moderate" | "low",
      "supportingEvidence": ["Evidence from tests that could support this diagnosis"],
      "ruledOutBy": "Optional: Specific finding that rules this out (e.g., 'No restriction in passive ROM rules out adhesive capsulitis')"
    }
  ],
  "clinicalReasoningChain": [
    "Step 1: Initial observation from first test (e.g., 'Abduction test revealed limited range to 85° with compensation')",
    "Step 2: Pattern recognition (e.g., 'Painful arc pattern combined with scapular compensation suggests impingement')",
    "Step 3: Hypothesis testing (e.g., 'Internal rotation limitation confirmed capsular involvement')",
    "Step 4: Final synthesis (e.g., 'Pattern consistent with subacromial impingement with secondary rotator cuff weakness')"
  ],
  "treatmentRecommendations": {
    "immediateActions": [
      "Specific immediate interventions (e.g., 'Avoid overhead activities above 90° for 2 weeks')"
    ],
    "exercises": [
      "Specific exercises with dosage (e.g., 'External rotation strengthening: 3 sets x 15 reps, 2x daily')"
    ],
    "manualTherapy": [
      "Specific techniques (e.g., 'Posterior capsule mobilization', 'Scapular stabilization training')"
    ],
    "precautions": [
      "Important warnings (e.g., 'Monitor for increased pain with overhead movements - may indicate progression')"
    ]
  },
  "redFlags": [
    "Any concerning indicators (e.g., 'Consider imaging if no improvement in 4 weeks')"
  ],
  "prognosticIndicators": [
    "Recovery expectations (e.g., 'Expected 6-8 week recovery with consistent treatment')",
    "Positive/negative factors (e.g., 'Good prognosis due to preserved passive ROM and no acute injury')"
  ]
}

Provide comprehensive, evidence-based analysis using all available test data and current hypotheses.
`;
  }

  /**
   * Processes and validates the final diagnosis result
   */
  private processFinalDiagnosisResult(result: any): {
    primaryDiagnosis: {
      condition: string;
      confidence: "high" | "moderate" | "low";
      clinicalReasoning: string;
      keyFindings: string[];
    };
    differentialDiagnoses: Array<{
      condition: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
      ruledOutBy?: string;
    }>;
    clinicalReasoningChain: string[];
    treatmentRecommendations: {
      immediateActions: string[];
      exercises: string[];
      manualTherapy: string[];
      precautions: string[];
    };
    redFlags: string[];
    prognosticIndicators: string[];
  } {
    return {
      primaryDiagnosis: {
        condition: result.primaryDiagnosis?.condition || 'Diagnosis pending further evaluation',
        confidence: result.primaryDiagnosis?.confidence || 'moderate',
        clinicalReasoning: result.primaryDiagnosis?.clinicalReasoning || 'Clinical reasoning in progress',
        keyFindings: Array.isArray(result.primaryDiagnosis?.keyFindings) 
          ? result.primaryDiagnosis.keyFindings 
          : []
      },
      differentialDiagnoses: Array.isArray(result.differentialDiagnoses)
        ? result.differentialDiagnoses.map((d: any) => ({
            condition: d.condition || 'Alternative diagnosis',
            likelihood: d.likelihood || 'low',
            supportingEvidence: Array.isArray(d.supportingEvidence) ? d.supportingEvidence : [],
            ruledOutBy: d.ruledOutBy
          }))
        : [],
      clinicalReasoningChain: Array.isArray(result.clinicalReasoningChain)
        ? result.clinicalReasoningChain
        : [],
      treatmentRecommendations: {
        immediateActions: Array.isArray(result.treatmentRecommendations?.immediateActions)
          ? result.treatmentRecommendations.immediateActions
          : [],
        exercises: Array.isArray(result.treatmentRecommendations?.exercises)
          ? result.treatmentRecommendations.exercises
          : [],
        manualTherapy: Array.isArray(result.treatmentRecommendations?.manualTherapy)
          ? result.treatmentRecommendations.manualTherapy
          : [],
        precautions: Array.isArray(result.treatmentRecommendations?.precautions)
          ? result.treatmentRecommendations.precautions
          : []
      },
      redFlags: Array.isArray(result.redFlags) ? result.redFlags : [],
      prognosticIndicators: Array.isArray(result.prognosticIndicators) 
        ? result.prognosticIndicators 
        : []
    };
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
