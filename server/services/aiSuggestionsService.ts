// Import shared OpenAI instance configured with Replit AI Integrations
import { openai } from '../openai';

// Enhanced Differential Diagnosis Interface with comprehensive clinical reasoning
export interface EnhancedDifferential {
  id: string;
  conditionName: string;
  tier: 'most_likely' | 'possible' | 'must_not_miss';
  probabilityScore: number; // 0-100
  
  // Anatomical and Pathophysiological Reasoning
  anatomicalStructure: string;
  mechanism: string;
  pathophysiology: string;
  
  // Clinical Features
  supportingFindings: string[];
  contradictingFindings: string[];
  keyDifferentiatingFeatures: string[];
  
  // Red Flag Assessment
  isRedFlag: boolean;
  redFlagIndicators?: string[];
  urgentActions?: string[];
  timeframe?: string; // e.g., "Immediate referral", "Within 24 hours"
  
  // Clinical Prediction Rules
  relevantCPRs?: {
    name: string;
    result?: string;
    interpretation: string;
  }[];
  
  // Evidence Base
  evidenceSummary: string;
  evidenceLevel: 'high' | 'moderate' | 'low' | 'expert_opinion';
  keyReferences?: string[];
  guidelineRecommendations?: string;
  
  // Management Implications
  suggestedTests: string[];
  initialManagement: string;
  referralIndications?: string[];
}

export interface DifferentialAnalysisResult {
  differentials: EnhancedDifferential[];
  clinicalReasoning: string;
  uncertaintyNote?: string;
  recommendedNextSteps: string[];
  timestamp: string;
}

export interface AISuggestion {
  id: string;
  type: 'assessment' | 'differential' | 'treatment' | 'red-flag' | 'documentation';
  suggestion: string;
  reasoning?: string;
  priority: 'high' | 'normal';
  section?: 'subjective' | 'objective' | 'assessment' | 'plan';
}

export async function generateAISuggestions(
  soapSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  },
  transcript?: string
): Promise<AISuggestion[]> {
  try {
    // Create a comprehensive context from SOAP sections
    const clinicalContext = `
      CURRENT SOAP NOTE:
      Subjective: ${soapSections.subjective || 'Not yet documented'}
      Objective: ${soapSections.objective || 'Not yet documented'}
      Assessment: ${soapSections.assessment || 'Not yet documented'}
      Plan: ${soapSections.plan || 'Not yet documented'}
      
      ${transcript ? `Recent Transcript: ${transcript}` : ''}
    `;

    const prompt = `You are an expert physiotherapist providing real-time clinical suggestions during a patient consultation. 
    Based on the current SOAP note, provide 3-5 actionable suggestions to improve the assessment or treatment.
    
    ${clinicalContext}
    
    Generate suggestions following these guidelines:
    1. Identify missing critical information that should be documented
    2. Suggest relevant special tests or assessments based on the presentation
    3. Highlight any potential red flags or safety concerns
    4. Recommend evidence-based treatment approaches
    5. Point out documentation improvements for medical-legal completeness
    
    Use expert physiotherapy frameworks from Jo Gibson, Alison Grimaldi, Leanne Bisset, Clinical Edge, and Physio Network.
    
    Return a JSON array of suggestions with this structure:
    {
      "suggestions": [
        {
          "type": "assessment|differential|treatment|red-flag|documentation",
          "suggestion": "Clear, actionable suggestion text",
          "reasoning": "Brief explanation of why this is important",
          "priority": "high|normal",
          "section": "subjective|objective|assessment|plan"
        }
      ]
    }
    
    Focus on practical, immediately actionable suggestions that would improve patient care.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: 'You are an expert physiotherapist providing clinical guidance. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    
    // Add unique IDs to each suggestion
    const suggestions: AISuggestion[] = result.suggestions.map((s: any, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      type: s.type || 'assessment',
      suggestion: s.suggestion,
      reasoning: s.reasoning,
      priority: s.priority || 'normal',
      section: s.section
    }));

    return suggestions;
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [];
  }
}

export function applySuggestionToSoap(
  suggestion: AISuggestion,
  currentSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }
): {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  const updatedSections = { ...currentSections };
  
  // Determine which section to update based on suggestion type and section
  const targetSection = suggestion.section || determineTargetSection(suggestion.type);
  
  // Add the suggestion content to the appropriate section
  const suggestionText = `\n• ${suggestion.suggestion}`;
  
  switch (targetSection) {
    case 'subjective':
      updatedSections.subjective = (updatedSections.subjective || '') + suggestionText;
      break;
    case 'objective':
      updatedSections.objective = (updatedSections.objective || '') + suggestionText;
      break;
    case 'assessment':
      updatedSections.assessment = (updatedSections.assessment || '') + suggestionText;
      break;
    case 'plan':
      updatedSections.plan = (updatedSections.plan || '') + suggestionText;
      break;
  }
  
  return updatedSections;
}

function determineTargetSection(type: string): 'subjective' | 'objective' | 'assessment' | 'plan' {
  switch (type) {
    case 'assessment':
    case 'differential':
    case 'red-flag':
      return 'assessment';
    case 'treatment':
      return 'plan';
    case 'documentation':
      return 'objective';
    default:
      return 'assessment';
  }
}

// Enhanced Differential Diagnosis Generator with comprehensive clinical reasoning
export async function generateEnhancedDifferentials(
  soapSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  },
  bodyRegion?: string,
  transcript?: string
): Promise<DifferentialAnalysisResult> {
  try {
    const clinicalContext = `
CLINICAL PRESENTATION:
=====================
SUBJECTIVE FINDINGS:
${soapSections.subjective || 'Not yet documented'}

OBJECTIVE FINDINGS:
${soapSections.objective || 'Not yet documented'}

CURRENT ASSESSMENT:
${soapSections.assessment || 'Not yet documented'}

CURRENT PLAN:
${soapSections.plan || 'Not yet documented'}

${bodyRegion ? `PRIMARY BODY REGION: ${bodyRegion}` : ''}
${transcript ? `RECENT SESSION NOTES: ${transcript}` : ''}
`;

    const comprehensivePrompt = `You are an expert musculoskeletal physiotherapist with advanced clinical reasoning skills, trained in methodologies from Jo Gibson (shoulder), Alison Grimaldi (hip), Leanne Bisset (elbow/tendinopathy), Clinical Edge, Physio Network, and Sports Map frameworks.

Analyze the following clinical presentation and generate a COMPREHENSIVE differential diagnosis list with evidence-based clinical reasoning.

${clinicalContext}

GENERATE DIFFERENTIAL DIAGNOSES following this structured approach:

1. TIERED CLASSIFICATION:
   - "most_likely": Primary working diagnoses with highest probability (typically 2-3)
   - "possible": Reasonable alternatives that should be considered (typically 2-4)
   - "must_not_miss": Serious conditions that MUST be ruled out even if probability is low (red flags)

2. PROBABILITY WEIGHTING:
   - Assign probability scores (0-100) to each differential
   - Ensure "most_likely" differentials collectively sum to approximately 60-80%
   - "must_not_miss" conditions may have low probability but high clinical significance

3. FOR EACH DIFFERENTIAL, PROVIDE:
   a) Anatomical structure(s) involved
   b) Mechanism of injury/pathophysiology
   c) Supporting clinical findings from the presentation
   d) Contradicting findings (if any)
   e) Key differentiating features from other conditions
   f) Red flag assessment with urgency indicators
   g) Relevant Clinical Prediction Rules (Ottawa, Wells, NEXUS, Canadian C-Spine, etc.)
   h) Evidence summary with strength rating
   i) Suggested confirmatory tests
   j) Initial management approach

4. CLINICAL PREDICTION RULES TO CONSIDER:
   - Spine: Canadian C-Spine Rule, NEXUS, STarT Back
   - Lower Limb: Ottawa Ankle/Knee/Foot Rules, Wells DVT/PE Criteria
   - Shoulder: Hawkins-Kennedy sensitivity, Apprehension test specificity
   - Hip: FADIR test interpretation, Trendelenburg implications
   - Neurological: Upper/Lower Motor Neuron patterns, dermatomal distributions

5. EVIDENCE LEVELS:
   - "high": Systematic reviews, meta-analyses, high-quality RCTs
   - "moderate": Cohort studies, case-control, lower quality RCTs
   - "low": Case series, expert consensus
   - "expert_opinion": Clinical reasoning without strong evidence base

Return a JSON object with this EXACT structure:
{
  "differentials": [
    {
      "conditionName": "Specific diagnosis name",
      "tier": "most_likely|possible|must_not_miss",
      "probabilityScore": 35,
      "anatomicalStructure": "Specific anatomical structure(s)",
      "mechanism": "Mechanism of injury or condition development",
      "pathophysiology": "Brief pathophysiological explanation",
      "supportingFindings": ["Finding 1 from presentation", "Finding 2"],
      "contradictingFindings": ["Any contradicting evidence"],
      "keyDifferentiatingFeatures": ["What distinguishes this from similar conditions"],
      "isRedFlag": false,
      "redFlagIndicators": ["If applicable"],
      "urgentActions": ["If red flag - what to do immediately"],
      "timeframe": "If urgent - when to act",
      "relevantCPRs": [
        {
          "name": "Clinical Prediction Rule name",
          "result": "Positive/Negative/Unclear based on available data",
          "interpretation": "What this means clinically"
        }
      ],
      "evidenceSummary": "Brief summary of evidence supporting this diagnosis",
      "evidenceLevel": "high|moderate|low|expert_opinion",
      "keyReferences": ["Key guideline or study if applicable"],
      "guidelineRecommendations": "Relevant guideline recommendations",
      "suggestedTests": ["Special test 1", "Imaging if indicated"],
      "initialManagement": "Brief initial management approach",
      "referralIndications": ["When to refer"]
    }
  ],
  "clinicalReasoning": "A 2-3 sentence summary of your overall clinical reasoning process",
  "uncertaintyNote": "Any limitations or uncertainties in the analysis",
  "recommendedNextSteps": ["Specific next steps to refine the diagnosis"]
}

Be thorough, evidence-based, and clinically practical. Prioritize patient safety by never missing serious pathology.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert musculoskeletal physiotherapist specializing in clinical reasoning and differential diagnosis. 
You combine deep anatomical knowledge with evidence-based practice and validated clinical prediction rules.
Always respond with properly structured JSON. Never omit the "must_not_miss" tier - patient safety is paramount.
Use specific anatomical and medical terminology while remaining clinically practical.`
        },
        {
          role: 'user',
          content: comprehensivePrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4, // Lower temperature for more consistent clinical reasoning
      max_tokens: 4000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add unique IDs to each differential
    const differentials: EnhancedDifferential[] = (result.differentials || []).map((d: any, index: number) => ({
      id: `diff-${Date.now()}-${index}`,
      conditionName: d.conditionName || 'Unknown Condition',
      tier: d.tier || 'possible',
      probabilityScore: Math.min(100, Math.max(0, d.probabilityScore || 0)),
      anatomicalStructure: d.anatomicalStructure || 'Not specified',
      mechanism: d.mechanism || 'Not specified',
      pathophysiology: d.pathophysiology || 'Not specified',
      supportingFindings: d.supportingFindings || [],
      contradictingFindings: d.contradictingFindings || [],
      keyDifferentiatingFeatures: d.keyDifferentiatingFeatures || [],
      isRedFlag: d.isRedFlag || d.tier === 'must_not_miss',
      redFlagIndicators: d.redFlagIndicators || [],
      urgentActions: d.urgentActions || [],
      timeframe: d.timeframe,
      relevantCPRs: d.relevantCPRs || [],
      evidenceSummary: d.evidenceSummary || 'No evidence summary provided',
      evidenceLevel: d.evidenceLevel || 'expert_opinion',
      keyReferences: d.keyReferences || [],
      guidelineRecommendations: d.guidelineRecommendations,
      suggestedTests: d.suggestedTests || [],
      initialManagement: d.initialManagement || 'Not specified',
      referralIndications: d.referralIndications || []
    }));

    // Sort differentials by tier priority and probability
    const tierOrder = { 'must_not_miss': 0, 'most_likely': 1, 'possible': 2 };
    differentials.sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return b.probabilityScore - a.probabilityScore;
    });

    return {
      differentials,
      clinicalReasoning: result.clinicalReasoning || 'Clinical reasoning not provided',
      uncertaintyNote: result.uncertaintyNote,
      recommendedNextSteps: result.recommendedNextSteps || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating enhanced differentials:', error);
    return {
      differentials: [],
      clinicalReasoning: 'Unable to generate differential analysis due to an error.',
      recommendedNextSteps: ['Please try again or consult with a senior clinician'],
      timestamp: new Date().toISOString()
    };
  }
}