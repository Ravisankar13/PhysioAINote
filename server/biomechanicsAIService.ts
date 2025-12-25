/**
 * AI-powered Biomechanical Clinical Assessment Service
 * 
 * Uses OpenAI to analyze biomechanics data and generate treatment strategies.
 */

import { openai } from './openai';

export interface BiomechanicsInput {
  patientInfo?: {
    name?: string;
    age?: number;
    gender?: string;
    chiefComplaint?: string;
  };
  anthropometrics: {
    heightCm: number;
    weightKg: number;
  };
  jointForces: {
    lumbarSpine: { compression: number; shear: number; moment: number };
    leftHip: { compression: number };
    rightHip: { compression: number };
    leftKnee: { compression: number; patellofemoral: number };
    rightKnee: { compression: number; patellofemoral: number };
  };
  muscleActivation: {
    erectorSpinae: number;
    gluteusMaximus: { left: number; right: number };
    gluteusMedius: { left: number; right: number };
    quadriceps: { left: number; right: number };
    hamstrings: { left: number; right: number };
  };
  asymmetryAnalysis: {
    hipLoadAsymmetry: number;
    kneeLoadAsymmetry: number;
    weightDistributionAsymmetry: number;
    muscleActivationAsymmetry: {
      gluteMax: number;
      gluteMed: number;
      quadriceps: number;
      hamstrings: number;
    };
  };
  movementQuality: {
    overallScore: number;
    stabilityScore: number;
    mobilityScore: number;
    controlScore: number;
    compensationPatterns: string[];
    movementFaults: string[];
  };
  injuryRisks: {
    overallRiskLevel: string;
    overallRiskScore: number;
    highRiskAreas: Array<{ area: string; risk: number; factors: string[] }>;
  };
  posture: {
    pelvisTilt: number;
    pelvisObliquity: number;
    spineFlexion: number;
    spineLateralFlexion: number;
  };
}

export interface TreatmentStrategy {
  clinicalSummary: string;
  primaryProblems: Array<{
    problem: string;
    severity: string;
    priority: number;
    relatedFindings: string[];
  }>;
  treatmentGoals: {
    shortTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
    longTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
  };
  interventions: {
    manualTherapy: Array<{
      technique: string;
      target: string;
      frequency: string;
      rationale: string;
    }>;
    therapeuticExercises: Array<{
      exercise: string;
      sets: number;
      reps: number;
      frequency: string;
      progression: string;
      rationale: string;
    }>;
    neuromuscularReeducation: Array<{
      activity: string;
      focus: string;
      progression: string;
    }>;
    patientEducation: Array<{
      topic: string;
      keyPoints: string[];
    }>;
  };
  loadManagement: {
    currentLoadCapacity: string;
    recommendedLoadReduction: number;
    activityModifications: string[];
    returnToActivityCriteria: string[];
  };
  precautions: {
    redFlags: string[];
    contraindications: string[];
    watchFor: string[];
  };
  prognosis: {
    expectedRecoveryTime: string;
    prognosticFactors: { positive: string[]; negative: string[] };
    expectedOutcome: string;
  };
}

/**
 * Generate AI clinical assessment from biomechanics data
 */
export async function generateClinicalAssessment(input: BiomechanicsInput): Promise<TreatmentStrategy> {
  const prompt = constructAssessmentPrompt(input);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert musculoskeletal physiotherapist with advanced training in biomechanics and clinical reasoning. 
Your task is to analyze biomechanical assessment data and provide evidence-based treatment recommendations.

Guidelines:
- Use current best-practice clinical guidelines (NICE, APTA, etc.)
- Consider the hierarchy of evidence when making recommendations
- Prioritize active interventions over passive treatments
- Include specific exercise parameters (sets, reps, frequency)
- Address both local tissue issues and contributing factors
- Consider psychosocial factors in your recommendations
- Use clinical reasoning to connect assessment findings to treatment choices

Be specific, practical, and evidence-based in your recommendations.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }
    
    return JSON.parse(content) as TreatmentStrategy;
  } catch (error: any) {
    console.error("Error generating clinical assessment:", error);
    throw new Error(`Failed to generate clinical assessment: ${error.message || "Unknown error"}`);
  }
}

function constructAssessmentPrompt(input: BiomechanicsInput): string {
  return `
Analyze the following biomechanical assessment data and generate a comprehensive treatment strategy.

## Patient Information
${input.patientInfo?.name ? `- Name: ${input.patientInfo.name}` : ''}
${input.patientInfo?.age ? `- Age: ${input.patientInfo.age} years` : ''}
${input.patientInfo?.gender ? `- Gender: ${input.patientInfo.gender}` : ''}
${input.patientInfo?.chiefComplaint ? `- Chief Complaint: ${input.patientInfo.chiefComplaint}` : ''}
- Height: ${input.anthropometrics.heightCm} cm
- Weight: ${input.anthropometrics.weightKg} kg
- BMI: ${(input.anthropometrics.weightKg / Math.pow(input.anthropometrics.heightCm / 100, 2)).toFixed(1)}

## Joint Loading Analysis
### Lumbar Spine
- Compression Force: ${input.jointForces.lumbarSpine.compression} N ${input.jointForces.lumbarSpine.compression > 3400 ? '(EXCEEDS NIOSH LIMIT)' : ''}
- Shear Force: ${input.jointForces.lumbarSpine.shear} N ${input.jointForces.lumbarSpine.shear > 500 ? '(ELEVATED)' : ''}
- Moment: ${input.jointForces.lumbarSpine.moment} Nm

### Hip Forces
- Left: ${input.jointForces.leftHip.compression} N
- Right: ${input.jointForces.rightHip.compression} N
- Asymmetry: ${input.asymmetryAnalysis.hipLoadAsymmetry}%

### Knee Forces
- Left Patellofemoral: ${input.jointForces.leftKnee.patellofemoral} N
- Right Patellofemoral: ${input.jointForces.rightKnee.patellofemoral} N
- Asymmetry: ${input.asymmetryAnalysis.kneeLoadAsymmetry}%

## Muscle Activation Analysis
- Erector Spinae: ${input.muscleActivation.erectorSpinae}% MVC
- Gluteus Maximus: L ${input.muscleActivation.gluteusMaximus.left}% / R ${input.muscleActivation.gluteusMaximus.right}% (Asymmetry: ${input.asymmetryAnalysis.muscleActivationAsymmetry.gluteMax}%)
- Gluteus Medius: L ${input.muscleActivation.gluteusMedius.left}% / R ${input.muscleActivation.gluteusMedius.right}% (Asymmetry: ${input.asymmetryAnalysis.muscleActivationAsymmetry.gluteMed}%)
- Quadriceps: L ${input.muscleActivation.quadriceps.left}% / R ${input.muscleActivation.quadriceps.right}% (Asymmetry: ${input.asymmetryAnalysis.muscleActivationAsymmetry.quadriceps}%)
- Hamstrings: L ${input.muscleActivation.hamstrings.left}% / R ${input.muscleActivation.hamstrings.right}% (Asymmetry: ${input.asymmetryAnalysis.muscleActivationAsymmetry.hamstrings}%)

## Postural Analysis
- Pelvis Tilt: ${input.posture.pelvisTilt}° ${input.posture.pelvisTilt > 15 ? '(ANTERIOR)' : input.posture.pelvisTilt < -15 ? '(POSTERIOR)' : ''}
- Pelvis Obliquity: ${input.posture.pelvisObliquity}° ${Math.abs(input.posture.pelvisObliquity) > 5 ? '(ASYMMETRIC)' : ''}
- Spine Flexion: ${input.posture.spineFlexion}°
- Lateral Shift: ${input.posture.spineLateralFlexion}°
- Weight Distribution Asymmetry: ${input.asymmetryAnalysis.weightDistributionAsymmetry}%

## Movement Quality Scores
- Overall Score: ${input.movementQuality.overallScore}/100
- Stability: ${input.movementQuality.stabilityScore}/100
- Mobility: ${input.movementQuality.mobilityScore}/100
- Control: ${input.movementQuality.controlScore}/100

### Compensation Patterns Identified:
${input.movementQuality.compensationPatterns.length > 0 
  ? input.movementQuality.compensationPatterns.map(p => `- ${p}`).join('\n')
  : '- None identified'}

### Movement Faults:
${input.movementQuality.movementFaults.length > 0 
  ? input.movementQuality.movementFaults.map(f => `- ${f}`).join('\n')
  : '- None identified'}

## Injury Risk Assessment
- Overall Risk Level: ${input.injuryRisks.overallRiskLevel.toUpperCase()}
- Overall Risk Score: ${input.injuryRisks.overallRiskScore}/100

### High Risk Areas:
${input.injuryRisks.highRiskAreas.map(area => 
  `- ${area.area}: ${area.risk}% risk\n  Contributing factors: ${area.factors.join(', ')}`
).join('\n')}

---

Based on this biomechanical assessment, provide a comprehensive treatment strategy in the following JSON format:

{
  "clinicalSummary": "Brief clinical summary of key findings and their clinical significance",
  "primaryProblems": [
    {
      "problem": "Problem description",
      "severity": "mild|moderate|severe",
      "priority": 1,
      "relatedFindings": ["Finding 1", "Finding 2"]
    }
  ],
  "treatmentGoals": {
    "shortTerm": [
      {"goal": "Specific measurable goal", "timeframe": "2-4 weeks", "metrics": ["Metric 1"]}
    ],
    "longTerm": [
      {"goal": "Specific measurable goal", "timeframe": "8-12 weeks", "metrics": ["Metric 1"]}
    ]
  },
  "interventions": {
    "manualTherapy": [
      {"technique": "Specific technique", "target": "Target structure", "frequency": "Frequency", "rationale": "Evidence-based rationale"}
    ],
    "therapeuticExercises": [
      {"exercise": "Exercise name", "sets": 3, "reps": 10, "frequency": "Daily", "progression": "How to progress", "rationale": "Why this exercise"}
    ],
    "neuromuscularReeducation": [
      {"activity": "Activity", "focus": "Focus area", "progression": "Progression plan"}
    ],
    "patientEducation": [
      {"topic": "Topic", "keyPoints": ["Point 1", "Point 2"]}
    ]
  },
  "loadManagement": {
    "currentLoadCapacity": "Description of current capacity",
    "recommendedLoadReduction": 20,
    "activityModifications": ["Modification 1"],
    "returnToActivityCriteria": ["Criterion 1"]
  },
  "precautions": {
    "redFlags": ["Red flag to watch for"],
    "contraindications": ["Contraindicated activity"],
    "watchFor": ["Warning sign"]
  },
  "prognosis": {
    "expectedRecoveryTime": "6-8 weeks",
    "prognosticFactors": {
      "positive": ["Positive factor"],
      "negative": ["Negative factor"]
    },
    "expectedOutcome": "Expected outcome description"
  }
}
`;
}

/**
 * Generate a quick clinical summary without full treatment plan
 */
export async function generateQuickSummary(input: BiomechanicsInput): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert physiotherapist. Provide a concise clinical summary of the biomechanical findings in 2-3 paragraphs. Focus on the most clinically significant findings and their implications."
        },
        {
          role: "user",
          content: `
Summarize these biomechanical findings:

Movement Quality Score: ${input.movementQuality.overallScore}/100
Overall Injury Risk: ${input.injuryRisks.overallRiskLevel} (${input.injuryRisks.overallRiskScore}/100)

Key Findings:
- Lumbar compression: ${input.jointForces.lumbarSpine.compression}N
- Hip load asymmetry: ${input.asymmetryAnalysis.hipLoadAsymmetry}%
- Knee load asymmetry: ${input.asymmetryAnalysis.kneeLoadAsymmetry}%
- Weight distribution asymmetry: ${input.asymmetryAnalysis.weightDistributionAsymmetry}%

Compensation Patterns: ${input.movementQuality.compensationPatterns.join(', ') || 'None'}
Movement Faults: ${input.movementQuality.movementFaults.join(', ') || 'None'}

High Risk Areas:
${input.injuryRisks.highRiskAreas.map(a => `- ${a.area}: ${a.risk}%`).join('\n')}
`
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content || "Unable to generate summary.";
  } catch (error: any) {
    console.error("Error generating quick summary:", error);
    return "Error generating clinical summary. Please try again.";
  }
}
