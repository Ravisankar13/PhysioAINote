import OpenAI from 'openai';
import { config } from 'dotenv';
config();

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface MovementAnalysisInput {
  sessionData: any;
  measurements: any[];
}

export interface MovementAnalysisResult {
  summary: string;
  keyFindings: string[];
  impairmentsSummary: Array<{
    impairment: string;
    severity: string;
    impact: string;
  }>;
  recommendations: {
    exercises: string[];
    manualTherapy: string[];
    patientEducation: string[];
    followUp: string;
  };
  functionalLimitations: string[];
  goals: {
    shortTerm: string[];
    longTerm: string[];
  };
  prognosis: string;
}

export async function analyzeMovementWithAI(input: MovementAnalysisInput): Promise<MovementAnalysisResult> {
  try {
    // Extract key metrics from measurements
    const impairments = new Set<string>();
    const jointProblems = new Map<string, number[]>();
    
    input.measurements.forEach(m => {
      if (m.impairments) {
        m.impairments.forEach((imp: string) => impairments.add(imp));
      }
      
      if (m.metrics?.jointAngles) {
        m.metrics.jointAngles.forEach((angle: any) => {
          if (!angle.isWithinNormal) {
            if (!jointProblems.has(angle.joint)) {
              jointProblems.set(angle.joint, []);
            }
            jointProblems.get(angle.joint)!.push(angle.angle);
          }
        });
      }
    });

    const prompt = `As an expert physiotherapist, analyze the following movement assessment data and provide a comprehensive clinical report.

Patient Information:
- Name: ${input.sessionData.patientName}
- Age: ${input.sessionData.patientAge || 'Not specified'}
- Gender: ${input.sessionData.patientGender || 'Not specified'}
- Chief Complaint: ${input.sessionData.chiefComplaint || 'Not specified'}
- Assessment Type: ${input.sessionData.assessmentType}
- Duration: ${input.sessionData.duration} seconds
- Overall Movement Quality: ${input.sessionData.overallQuality}

Detected Impairments:
${Array.from(impairments).join('\n')}

Joint Angle Deviations:
${Array.from(jointProblems.entries()).map(([joint, angles]) => 
  `${joint}: ${angles.map(a => a.toFixed(1) + '°').join(', ')}`
).join('\n')}

Please provide a detailed analysis in the following JSON format:
{
  "summary": "Brief clinical summary of findings",
  "keyFindings": ["Key finding 1", "Key finding 2", ...],
  "impairmentsSummary": [
    {
      "impairment": "Impairment name",
      "severity": "mild/moderate/severe",
      "impact": "Functional impact description"
    }
  ],
  "recommendations": {
    "exercises": ["Exercise 1", "Exercise 2", ...],
    "manualTherapy": ["Technique 1", "Technique 2", ...],
    "patientEducation": ["Education point 1", "Education point 2", ...],
    "followUp": "Follow-up recommendation"
  },
  "functionalLimitations": ["Limitation 1", "Limitation 2", ...],
  "goals": {
    "shortTerm": ["Goal 1", "Goal 2", ...],
    "longTerm": ["Goal 1", "Goal 2", ...]
  },
  "prognosis": "Expected outcome and timeline"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert physiotherapist specializing in movement analysis and biomechanics. Provide evidence-based, clinically relevant assessments.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || 'Movement analysis completed',
      keyFindings: result.keyFindings || [],
      impairmentsSummary: result.impairmentsSummary || [],
      recommendations: result.recommendations || {
        exercises: [],
        manualTherapy: [],
        patientEducation: [],
        followUp: 'Follow up in 2-4 weeks'
      },
      functionalLimitations: result.functionalLimitations || [],
      goals: result.goals || {
        shortTerm: [],
        longTerm: []
      },
      prognosis: result.prognosis || 'Good prognosis with appropriate intervention'
    };
  } catch (error) {
    console.error('Error analyzing movement with AI:', error);
    
    // Return basic analysis if AI fails
    return {
      summary: 'Movement assessment completed with identified impairments requiring intervention',
      keyFindings: Array.from(new Set(input.measurements.flatMap(m => m.impairments || []))),
      impairmentsSummary: [],
      recommendations: {
        exercises: ['Progressive strengthening', 'Balance training', 'Flexibility exercises'],
        manualTherapy: ['Joint mobilization', 'Soft tissue techniques'],
        patientEducation: ['Posture awareness', 'Movement mechanics', 'Activity modification'],
        followUp: 'Follow up in 2-4 weeks'
      },
      functionalLimitations: ['Movement quality impairments noted'],
      goals: {
        shortTerm: ['Improve movement quality', 'Reduce compensations'],
        longTerm: ['Restore normal movement patterns', 'Return to full function']
      },
      prognosis: 'Good prognosis with appropriate intervention'
    };
  }
}

export async function generateVirtualPatientFromMovement(data: {
  session: any;
  measurements: any[];
  impairments: any[];
}): Promise<any> {
  try {
    // Analyze joint measurements to determine pathology
    const shoulderProblems = data.measurements.filter(m => 
      m.jointName.includes('shoulder') && !m.isWithinNormal
    );
    const spinalProblems = data.measurements.filter(m => 
      (m.jointName.includes('spine') || m.jointName.includes('trunk')) && !m.isWithinNormal
    );
    const lowerLimbProblems = data.measurements.filter(m => 
      (m.jointName.includes('hip') || m.jointName.includes('knee') || m.jointName.includes('ankle')) && !m.isWithinNormal
    );

    // Determine pathologies based on impairments
    const shoulderPathology = shoulderProblems.length > 0 ? {
      flexion: shoulderProblems.some(p => p.angleType === 'flexion') ? 
        Math.min(180, Math.max(...shoulderProblems.filter(p => p.angleType === 'flexion').map(p => p.angle))) : 180,
      abduction: shoulderProblems.some(p => p.angleType === 'abduction') ? 
        Math.min(180, Math.max(...shoulderProblems.filter(p => p.angleType === 'abduction').map(p => p.angle))) : 180,
      internalRotation: 70,
      externalRotation: 90,
      pain: true
    } : null;

    const spinalPathology = spinalProblems.length > 0 || data.impairments.some(i => i.impairmentType === 'forward_head') ? {
      cervicalFlexion: 45,
      cervicalExtension: 45,
      thoracicKyphosis: data.impairments.some(i => i.impairmentType === 'forward_head') ? 50 : 35,
      lumbarLordosis: 40,
      lateralFlexion: 30,
      rotation: 60
    } : null;

    const lowerLimbPathology = lowerLimbProblems.length > 0 || data.impairments.some(i => i.impairmentType === 'knee_valgus') ? {
      hipFlexion: lowerLimbProblems.filter(p => p.jointName.includes('hip')).length > 0 ? 90 : 120,
      kneeFlexion: lowerLimbProblems.filter(p => p.jointName.includes('knee')).length > 0 ? 90 : 135,
      kneeValgus: data.impairments.some(i => i.impairmentType === 'knee_valgus'),
      ankleDorsiflexion: lowerLimbProblems.filter(p => p.jointName.includes('ankle')).length > 0 ? 10 : 20,
      trendelenburg: data.impairments.some(i => i.impairmentType === 'trendelenburg')
    } : null;

    const prompt = `Generate a virtual patient description based on the following movement analysis:

Patient: ${data.session.patientName}
Age: ${data.session.patientAge || 'Unknown'}
Chief Complaint: ${data.session.chiefComplaint || 'Movement dysfunction'}
Assessment Type: ${data.session.assessmentType}

Key Impairments:
${data.impairments.map(i => `- ${i.description} (${i.severity})`).join('\n')}

Create a brief clinical description (2-3 sentences) for this virtual patient model.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a physiotherapist creating virtual patient models for education.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const description = response.choices[0].message.content || 
      `Virtual patient based on movement analysis showing ${data.session.overallQuality} movement quality with identified impairments.`;

    return {
      patientName: `${data.session.patientName} - Movement Analysis`,
      limbScales: {
        armLength: 1.0,
        legLength: 1.0,
        torsoHeight: 1.0,
        shoulderWidth: 1.0,
        hipWidth: 1.0
      },
      shoulderPathology,
      spinalPathology,
      lowerLimbPathology,
      modelConfig: {
        showSkeleton: true,
        showMuscles: false,
        showNerves: false,
        highlightPathology: true
      },
      description
    };
  } catch (error) {
    console.error('Error generating virtual patient:', error);
    
    // Return basic virtual patient if AI fails
    return {
      patientName: `${data.session.patientName} - Movement Analysis`,
      limbScales: {
        armLength: 1.0,
        legLength: 1.0,
        torsoHeight: 1.0,
        shoulderWidth: 1.0,
        hipWidth: 1.0
      },
      shoulderPathology: null,
      spinalPathology: null,
      lowerLimbPathology: null,
      modelConfig: {
        showSkeleton: true,
        showMuscles: false,
        showNerves: false,
        highlightPathology: true
      },
      description: 'Virtual patient generated from movement analysis'
    };
  }
}

export async function getClinicalReasoning(impairments: string[]): Promise<string> {
  try {
    const prompt = `As a physiotherapist, provide clinical reasoning for the following movement impairments:
${impairments.join('\n')}

Explain the biomechanical relationships and potential causes in 2-3 paragraphs.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert physiotherapist providing clinical reasoning.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Clinical reasoning analysis pending.';
  } catch (error) {
    console.error('Error getting clinical reasoning:', error);
    return 'Unable to generate clinical reasoning at this time.';
  }
}

export async function detectPathologyPatterns(measurements: any[]): Promise<string[]> {
  const patterns: string[] = [];
  
  // Analyze patterns in measurements
  const kneeValgusCount = measurements.filter(m => 
    m.impairments?.some((i: string) => i.includes('knee valgus'))
  ).length;
  
  const trendelenburgCount = measurements.filter(m => 
    m.impairments?.some((i: string) => i.includes('Trendelenburg'))
  ).length;
  
  if (kneeValgusCount > measurements.length * 0.3) {
    patterns.push('Consistent knee valgus pattern indicating hip weakness');
  }
  
  if (trendelenburgCount > measurements.length * 0.2) {
    patterns.push('Trendelenburg pattern suggesting gluteus medius weakness');
  }
  
  return patterns;
}

export async function generateExercisePrescription(
  impairments: string[],
  assessmentType: string
): Promise<string[]> {
  try {
    const prompt = `Based on these movement impairments from a ${assessmentType} assessment:
${impairments.join('\n')}

Provide 5 specific therapeutic exercises with brief descriptions. Format as a JSON array of strings.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a physiotherapist prescribing evidence-based exercises.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || '{"exercises":[]}');
    return result.exercises || [];
  } catch (error) {
    console.error('Error generating exercise prescription:', error);
    return [
      'Hip strengthening exercises',
      'Core stabilization',
      'Balance training',
      'Flexibility exercises',
      'Functional movement patterns'
    ];
  }
}