import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MovementData {
  timestamp: number;
  poses: any[];
  movementType: string;
  qualityScore: number;
  jointAngles?: Record<string, number>;
  velocity?: Record<string, number>;
  acceleration?: Record<string, number>;
}

interface MovementAnalysisResult {
  overallScore: number;
  qualityDescription: string;
  findings: string[];
  compensations: string[];
  recommendations: string[];
  jointMetrics: Record<string, string>;
  clinicalImpression: string;
  riskFactors: string[];
  suggestedExercises: string[];
  differentialDiagnosis?: string[];
}

export async function analyzeMovementWithAI(
  movementType: string,
  movementData: MovementData[],
  patientHistory?: string
): Promise<MovementAnalysisResult> {
  try {
    // Prepare movement summary for AI analysis
    const movementSummary = prepareMovementSummary(movementData);
    
    const systemPrompt = `You are an expert physiotherapist specializing in movement analysis. 
    Analyze the following movement data and provide detailed clinical insights based on best practices 
    from Jo Gibson, Alison Grimaldi, Leanne Bisset, and Clinical Edge frameworks.
    
    Focus on:
    1. Movement quality and biomechanical efficiency
    2. Compensatory patterns and deviations
    3. Risk factors for injury
    4. Clinical implications
    5. Evidence-based recommendations
    
    Respond with a structured JSON analysis.`;

    const userPrompt = `Movement Type: ${movementType}
    
Movement Data Summary:
${JSON.stringify(movementSummary, null, 2)}

${patientHistory ? `Patient History: ${patientHistory}` : ''}

Provide a comprehensive movement analysis including:
- Overall quality score (0-100)
- Quality description
- Key findings (array of specific observations)
- Compensatory patterns detected (array)
- Clinical recommendations (array)
- Joint metrics (object with angle measurements)
- Clinical impression (brief summary)
- Risk factors identified (array)
- Suggested corrective exercises (array)
${movementType === 'gait' ? '- Differential diagnosis possibilities (array)' : ''}

Format the response as JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      overallScore: analysisResult.overallScore || 0,
      qualityDescription: analysisResult.qualityDescription || 'Analysis incomplete',
      findings: analysisResult.findings || [],
      compensations: analysisResult.compensations || [],
      recommendations: analysisResult.recommendations || [],
      jointMetrics: analysisResult.jointMetrics || {},
      clinicalImpression: analysisResult.clinicalImpression || '',
      riskFactors: analysisResult.riskFactors || [],
      suggestedExercises: analysisResult.suggestedExercises || [],
      differentialDiagnosis: analysisResult.differentialDiagnosis
    };
  } catch (error) {
    console.error('AI movement analysis failed:', error);
    throw new Error('Failed to analyze movement with AI');
  }
}

function prepareMovementSummary(movementData: MovementData[]) {
  if (movementData.length === 0) return {};

  // Calculate aggregate metrics
  const avgQuality = movementData.reduce((sum, d) => sum + d.qualityScore, 0) / movementData.length;
  
  // Get joint angle ranges
  const jointAngleRanges: Record<string, { min: number; max: number; avg: number }> = {};
  
  movementData.forEach(data => {
    if (data.jointAngles) {
      Object.entries(data.jointAngles).forEach(([joint, angle]) => {
        if (!jointAngleRanges[joint]) {
          jointAngleRanges[joint] = { min: angle, max: angle, avg: 0 };
        }
        jointAngleRanges[joint].min = Math.min(jointAngleRanges[joint].min, angle);
        jointAngleRanges[joint].max = Math.max(jointAngleRanges[joint].max, angle);
      });
    }
  });

  // Calculate averages
  Object.keys(jointAngleRanges).forEach(joint => {
    const angles = movementData
      .filter(d => d.jointAngles && d.jointAngles[joint])
      .map(d => d.jointAngles![joint]);
    jointAngleRanges[joint].avg = angles.reduce((sum, a) => sum + a, 0) / angles.length;
  });

  // Detect movement phases
  const movementPhases = detectMovementPhases(movementData);

  return {
    duration: (movementData[movementData.length - 1].timestamp - movementData[0].timestamp) / 1000,
    frameCount: movementData.length,
    averageQuality: avgQuality,
    jointAngleRanges,
    movementPhases,
    qualityTrend: calculateQualityTrend(movementData)
  };
}

function detectMovementPhases(movementData: MovementData[]) {
  // Simple phase detection based on quality scores
  const phases = [];
  let currentPhase = { start: 0, end: 0, avgQuality: 0 };
  let phaseData: number[] = [];

  movementData.forEach((data, index) => {
    phaseData.push(data.qualityScore);
    
    // Detect phase change (significant quality change)
    if (index > 0) {
      const qualityChange = Math.abs(data.qualityScore - movementData[index - 1].qualityScore);
      if (qualityChange > 20) {
        // End current phase
        currentPhase.end = index - 1;
        currentPhase.avgQuality = phaseData.reduce((a, b) => a + b, 0) / phaseData.length;
        phases.push({ ...currentPhase });
        
        // Start new phase
        currentPhase = { start: index, end: index, avgQuality: 0 };
        phaseData = [data.qualityScore];
      }
    }
  });

  // Add final phase
  currentPhase.end = movementData.length - 1;
  currentPhase.avgQuality = phaseData.reduce((a, b) => a + b, 0) / phaseData.length;
  phases.push(currentPhase);

  return phases;
}

function calculateQualityTrend(movementData: MovementData[]): 'improving' | 'declining' | 'stable' {
  if (movementData.length < 3) return 'stable';
  
  const firstThird = movementData.slice(0, Math.floor(movementData.length / 3));
  const lastThird = movementData.slice(Math.floor(movementData.length * 2 / 3));
  
  const avgFirst = firstThird.reduce((sum, d) => sum + d.qualityScore, 0) / firstThird.length;
  const avgLast = lastThird.reduce((sum, d) => sum + d.qualityScore, 0) / lastThird.length;
  
  if (avgLast > avgFirst + 5) return 'improving';
  if (avgLast < avgFirst - 5) return 'declining';
  return 'stable';
}

// Virtual Patient Generation from Movement Data
export async function generateVirtualPatientFromMovement(
  movementData: MovementData[],
  analysisResult: MovementAnalysisResult
): Promise<any> {
  try {
    const systemPrompt = `You are an expert in creating accurate virtual patient models from movement analysis data.
    Based on the movement analysis, generate a comprehensive virtual patient configuration that reflects
    the observed biomechanical patterns, compensations, and pathologies.`;

    const userPrompt = `Based on this movement analysis, create a virtual patient configuration:
    
Movement Analysis:
${JSON.stringify(analysisResult, null, 2)}

Generate a virtual patient with:
1. Appropriate ROM limitations based on observed movement
2. Muscle bulk adjustments reflecting weakness patterns
3. Muscle tone settings based on movement quality
4. Pain regions likely associated with compensations
5. Gait deviations if applicable
6. Force distribution patterns
7. Postural deviations
8. Soft tissue restrictions

Return as JSON matching the virtual patient configuration schema.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Failed to generate virtual patient:', error);
    throw new Error('Failed to generate virtual patient from movement');
  }
}

// Clinical Reasoning AI Assistant
export async function getClinicalReasoning(
  patientData: any,
  movementAnalysis: MovementAnalysisResult,
  specificQuestion?: string
): Promise<string> {
  try {
    const systemPrompt = `You are an expert physiotherapist providing clinical reasoning support.
    Use evidence-based frameworks from Jo Gibson (shoulder), Alison Grimaldi (hip), 
    Leanne Bisset (tendinopathy), Clinical Edge, and Physio Network.
    
    Provide clear, practical clinical reasoning that helps guide assessment and treatment decisions.`;

    const userPrompt = `Patient Data:
${JSON.stringify(patientData, null, 2)}

Movement Analysis:
${JSON.stringify(movementAnalysis, null, 2)}

${specificQuestion || 'Provide clinical reasoning for this patient case including differential diagnosis, key assessment priorities, and treatment approach.'}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 1500
    });

    return response.choices[0].message.content || 'Unable to generate clinical reasoning';
  } catch (error) {
    console.error('Clinical reasoning AI failed:', error);
    throw new Error('Failed to generate clinical reasoning');
  }
}

// Pattern Recognition for Pathology Detection
export async function detectPathologyPatterns(
  movementData: MovementData[],
  movementType: string
): Promise<{
  detectedPatterns: string[];
  likelyPathologies: string[];
  confidenceScores: Record<string, number>;
}> {
  try {
    const movementSummary = prepareMovementSummary(movementData);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in movement pathology pattern recognition.
          Identify specific pathological movement patterns and their likely causes.`
        },
        {
          role: 'user',
          content: `Movement Type: ${movementType}
Movement Data: ${JSON.stringify(movementSummary, null, 2)}

Identify:
1. Specific pathological movement patterns observed
2. Likely underlying pathologies
3. Confidence scores for each pathology (0-1)

Return as JSON with: detectedPatterns (array), likelyPathologies (array), confidenceScores (object)`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Pathology pattern detection failed:', error);
    throw new Error('Failed to detect pathology patterns');
  }
}

// Exercise Prescription AI
export async function generateExercisePrescription(
  analysisResult: MovementAnalysisResult,
  patientGoals?: string[],
  restrictions?: string[]
): Promise<{
  exercises: Array<{
    name: string;
    description: string;
    sets: number;
    reps: string;
    frequency: string;
    progression: string;
    precautions: string[];
  }>;
  programDuration: string;
  reviewDate: string;
  expectedOutcomes: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert physiotherapist creating evidence-based exercise programs.
          Base prescriptions on current research and clinical guidelines.`
        },
        {
          role: 'user',
          content: `Movement Analysis: ${JSON.stringify(analysisResult, null, 2)}
Patient Goals: ${patientGoals?.join(', ') || 'General improvement'}
Restrictions: ${restrictions?.join(', ') || 'None'}

Create a comprehensive exercise program with:
- Specific exercises addressing identified issues
- Clear parameters (sets, reps, frequency)
- Progression criteria
- Safety precautions
- Expected outcomes
- Program duration and review timeline

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Exercise prescription generation failed:', error);
    throw new Error('Failed to generate exercise prescription');
  }
}

// ============= ADDITIONAL PHASE 5 FEATURES =============

// 1. Predictive Analytics
export async function predictiveAnalytics(
  movementData: MovementData[],
  patientHistory: any,
  analysisResult: MovementAnalysisResult
): Promise<{
  injuryRiskScore: number;
  riskFactors: Array<{ factor: string; severity: string; likelihood: number }>;
  recoveryTimeline: { optimistic: string; realistic: string; conservative: string };
  treatmentOutcomePrediction: { successProbability: number; keyFactors: string[] };
  performanceOptimization: string[];
  preventiveMeasures: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in physiotherapy predictive analytics.
          Analyze movement patterns and patient data to predict injury risks, recovery timelines, 
          and treatment outcomes based on evidence-based research and clinical data.`
        },
        {
          role: 'user',
          content: `Movement Data: ${JSON.stringify(prepareMovementSummary(movementData), null, 2)}
Patient History: ${JSON.stringify(patientHistory, null, 2)}
Analysis Result: ${JSON.stringify(analysisResult, null, 2)}

Provide predictive analytics including:
1. Injury risk score (0-100)
2. Specific risk factors with severity and likelihood
3. Recovery timeline estimates (optimistic, realistic, conservative)
4. Treatment outcome prediction with success probability
5. Performance optimization recommendations
6. Preventive measures to reduce injury risk

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Predictive analytics failed:', error);
    throw new Error('Failed to generate predictive analytics');
  }
}

// 2. Natural Language Processing for Voice Commands
export async function processNaturalLanguageCommand(
  command: string,
  context?: any
): Promise<{
  intent: string;
  parameters: Record<string, any>;
  action: string;
  response: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a physiotherapy virtual patient system.
          Parse natural language commands and convert them to system actions.
          Commands can be about adjusting patient parameters, querying conditions, or clinical documentation.`
        },
        {
          role: 'user',
          content: `Command: "${command}"
Context: ${JSON.stringify(context, null, 2)}

Parse this command and return:
1. Intent (what the user wants to do)
2. Parameters extracted from the command
3. Specific action to take
4. Natural language response to the user

Return as JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('NLP command processing failed:', error);
    throw new Error('Failed to process natural language command');
  }
}

// 3. Smart Comparative Analysis
export async function performComparativeAnalysis(
  beforeData: MovementData[],
  afterData: MovementData[],
  treatmentDetails?: any
): Promise<{
  improvementScore: number;
  changedMetrics: Array<{ metric: string; before: number; after: number; change: string; significance: string }>;
  patternChanges: string[];
  treatmentEffectiveness: string;
  recommendations: string[];
  visualProgressMarkers: Array<{ area: string; progress: number }>;
}> {
  try {
    const beforeSummary = prepareMovementSummary(beforeData);
    const afterSummary = prepareMovementSummary(afterData);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in analyzing treatment effectiveness through movement comparison.
          Compare before and after movement data to assess treatment progress and effectiveness.`
        },
        {
          role: 'user',
          content: `Before Treatment: ${JSON.stringify(beforeSummary, null, 2)}
After Treatment: ${JSON.stringify(afterSummary, null, 2)}
Treatment Details: ${JSON.stringify(treatmentDetails, null, 2)}

Analyze the changes and provide:
1. Overall improvement score (0-100)
2. Specific metric changes with clinical significance
3. Pattern changes observed
4. Treatment effectiveness assessment
5. Recommendations for continued treatment
6. Visual progress markers for key areas

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Comparative analysis failed:', error);
    throw new Error('Failed to perform comparative analysis');
  }
}

// 4. Automated SOAP Note Generation from Virtual Patient Assessment
export async function generateSOAPFromAssessment(
  movementData: MovementData[],
  analysisResult: MovementAnalysisResult,
  patientInfo: any,
  additionalNotes?: string
): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  billingCodes: string[];
  followUpRecommendations: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert physiotherapist generating comprehensive SOAP notes.
          Create detailed, clinically accurate documentation based on virtual patient assessments.
          Include relevant billing codes and follow-up recommendations.`
        },
        {
          role: 'user',
          content: `Movement Data: ${JSON.stringify(prepareMovementSummary(movementData), null, 2)}
Analysis Result: ${JSON.stringify(analysisResult, null, 2)}
Patient Info: ${JSON.stringify(patientInfo, null, 2)}
Additional Notes: ${additionalNotes || 'None'}

Generate a complete SOAP note including:
1. Subjective findings
2. Objective measurements and observations
3. Clinical assessment
4. Treatment plan
5. Relevant billing codes
6. Follow-up recommendations

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('SOAP note generation failed:', error);
    throw new Error('Failed to generate SOAP note');
  }
}

// 5. Population-Based Normative Comparisons
export async function compareToNormativeData(
  movementData: MovementData[],
  age: number,
  gender: string,
  activityLevel: string
): Promise<{
  percentileRankings: Record<string, number>;
  deviationsFromNorm: Array<{ metric: string; deviation: string; significance: string }>;
  ageAdjustedScore: number;
  peerComparison: string;
  normativeRecommendations: string[];
}> {
  try {
    const movementSummary = prepareMovementSummary(movementData);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in biomechanical analysis with access to normative data.
          Compare patient movement patterns to population norms based on demographics.`
        },
        {
          role: 'user',
          content: `Movement Data: ${JSON.stringify(movementSummary, null, 2)}
Demographics: Age: ${age}, Gender: ${gender}, Activity Level: ${activityLevel}

Compare to normative data and provide:
1. Percentile rankings for key metrics
2. Significant deviations from age/gender norms
3. Age-adjusted functional score
4. Peer comparison narrative
5. Recommendations based on normative gaps

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Normative comparison failed:', error);
    throw new Error('Failed to compare to normative data');
  }
}

// 6. Automatic Movement Abnormality Detection
export async function detectMovementAbnormalities(
  movementData: MovementData[]
): Promise<{
  abnormalities: Array<{
    type: string;
    severity: 'mild' | 'moderate' | 'severe';
    timestamp: number;
    description: string;
    clinicalSignificance: string;
  }>;
  gaitPatterns: {
    trendelenburg: boolean;
    antalgic: boolean;
    ataxic: boolean;
    hemiplegic: boolean;
    parkinsonian: boolean;
    other: string[];
  };
  compensatoryPatterns: string[];
  biomechanicalDeviations: Array<{ joint: string; deviation: string; magnitude: number }>;
}> {
  try {
    const movementSummary = prepareMovementSummary(movementData);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in detecting movement abnormalities and pathological gait patterns.
          Identify specific abnormalities, their severity, and clinical significance.`
        },
        {
          role: 'user',
          content: `Movement Data: ${JSON.stringify(movementSummary, null, 2)}

Detect and classify:
1. Specific movement abnormalities with severity and timing
2. Gait pattern classifications (Trendelenburg, antalgic, etc.)
3. Compensatory movement patterns
4. Biomechanical deviations from normal

Return as structured JSON with detailed clinical descriptions.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Abnormality detection failed:', error);
    throw new Error('Failed to detect movement abnormalities');
  }
}

// 7. Virtual Patient Generation from Video/Image Analysis
export async function generateVirtualPatientFromMedia(
  mediaDescription: string,
  frameAnalysis?: any[]
): Promise<{
  patientModel: {
    bodyMetrics: Record<string, number>;
    postureDeviations: string[];
    apparentPathologies: string[];
    movementCharacteristics: string[];
  };
  configurationSuggestions: {
    limbScales: Record<string, number>;
    romLimitations: Record<string, number>;
    muscleParameters: Record<string, number>;
    painRegions: string[];
  };
  confidenceScore: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in biomechanical analysis and 3D modeling.
          Generate accurate virtual patient configurations from visual data descriptions.`
        },
        {
          role: 'user',
          content: `Media Description: ${mediaDescription}
Frame Analysis: ${JSON.stringify(frameAnalysis, null, 2)}

Generate a virtual patient model including:
1. Body metrics and proportions
2. Detected posture deviations
3. Apparent pathologies
4. Movement characteristics
5. Configuration parameters for 3D model
6. Confidence score for accuracy

Return as structured JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Virtual patient generation from media failed:', error);
    throw new Error('Failed to generate virtual patient from media');
  }
}