// Import shared OpenAI instance configured with Replit AI Integrations
import { openai } from '../openai';

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