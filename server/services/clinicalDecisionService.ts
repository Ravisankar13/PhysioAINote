import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Red flag symptoms categorized by urgency level
const RED_FLAG_PATTERNS = {
  critical: [
    { pattern: /chest pain|crushing pain|pressure in chest/i, condition: 'Possible cardiac event' },
    { pattern: /difficulty breathing|can't breathe|shortness of breath with chest pain/i, condition: 'Respiratory emergency' },
    { pattern: /sudden severe headache|thunderclap headache|worst headache/i, condition: 'Possible subarachnoid hemorrhage' },
    { pattern: /facial droop|arm weakness|slurred speech/i, condition: 'Possible stroke (FAST signs)' },
    { pattern: /loss of consciousness|unresponsive|passed out/i, condition: 'Syncope/LOC' },
    { pattern: /severe abdominal pain|rigid abdomen|rebound tenderness/i, condition: 'Possible surgical abdomen' },
  ],
  urgent: [
    { pattern: /severe headache.*vision changes|visual disturbance.*headache/i, condition: 'Possible temporal arteritis or migraine' },
    { pattern: /fever.*neck stiffness|stiff neck.*fever/i, condition: 'Possible meningitis' },
    { pattern: /sudden vision loss|blind spot|curtain over vision/i, condition: 'Ocular emergency' },
    { pattern: /blood in stool|black tarry stool|melena/i, condition: 'GI bleeding' },
    { pattern: /persistent vomiting|projectile vomiting/i, condition: 'Severe dehydration risk' },
    { pattern: /severe pain.*swollen.*red/i, condition: 'Possible cellulitis or DVT' },
  ],
  important: [
    { pattern: /unexplained weight loss|lost.*pounds.*month/i, condition: 'Requires investigation' },
    { pattern: /night sweats|drenching sweats/i, condition: 'Constitutional symptoms' },
    { pattern: /persistent cough.*blood|hemoptysis/i, condition: 'Requires chest imaging' },
    { pattern: /bone pain at night|worse at night/i, condition: 'Concerning for malignancy' },
    { pattern: /progressive weakness|getting weaker/i, condition: 'Neurological assessment needed' },
  ]
};

// Common clinical guidelines
const CLINICAL_GUIDELINES = {
  'low back pain': {
    source: 'American College of Physicians',
    year: 2017,
    recommendations: [
      'First-line: Non-pharmacologic treatment (heat, massage, acupuncture, spinal manipulation)',
      'If pharmacologic: NSAIDs or skeletal muscle relaxants',
      'Avoid imaging for first 6 weeks unless red flags',
      'Consider cognitive behavioral therapy',
      'Avoid opioids as first-line treatment'
    ],
    redFlags: [
      'Age >50 or <20',
      'History of cancer',
      'Unexplained weight loss',
      'Fever',
      'IV drug use',
      'Progressive neurologic deficit',
      'Bowel/bladder dysfunction'
    ]
  },
  'shoulder pain': {
    source: 'British Medical Journal',
    year: 2019,
    recommendations: [
      'Initial assessment: Rule out red flags',
      'Conservative management for 6-12 weeks',
      'Exercise therapy as first-line',
      'Consider subacromial injection if severe',
      'MRI only if surgery contemplated'
    ],
    specialTests: [
      'Neer impingement test',
      'Hawkins-Kennedy test',
      'Empty can test (supraspinatus)',
      'External rotation resistance (infraspinatus)',
      'Lift-off test (subscapularis)'
    ]
  },
  'knee pain': {
    source: 'American Academy of Orthopaedic Surgeons',
    year: 2022,
    recommendations: [
      'Weight loss if BMI >25',
      'Strengthening exercises',
      'Low-impact aerobic exercise',
      'Consider knee braces/supports',
      'Intra-articular injections for moderate-severe OA'
    ],
    imaging: [
      'X-ray: First-line for chronic knee pain',
      'MRI: If mechanical symptoms or trauma',
      'Ultrasound: For soft tissue evaluation'
    ]
  },
  'neck pain': {
    source: 'Bone and Joint Decade Task Force',
    year: 2020,
    recommendations: [
      'Education and reassurance',
      'Maintain activity levels',
      'Manual therapy combined with exercise',
      'Avoid cervical collars',
      'Multimodal approach most effective'
    ],
    warningSignsA: [
      'Myelopathy signs',
      'Progressive neurological deficit',
      'Severe trauma history',
      'Systemic symptoms'
    ]
  }
};

export interface RedFlagAlert {
  level: 'critical' | 'urgent' | 'important';
  condition: string;
  matchedText: string;
  recommendations: string[];
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  probability: number;
  supportingSymptoms: string[];
  additionalTestsNeeded: string[];
  icd10Code?: string;
}

export interface ClinicalGuideline {
  condition: string;
  source: string;
  year: number;
  recommendations: string[];
  redFlags?: string[];
  specialTests?: string[];
  imaging?: string[];
}

class ClinicalDecisionService {
  private static instance: ClinicalDecisionService;

  private constructor() {}

  public static getInstance(): ClinicalDecisionService {
    if (!ClinicalDecisionService.instance) {
      ClinicalDecisionService.instance = new ClinicalDecisionService();
    }
    return ClinicalDecisionService.instance;
  }

  // Detect red flag symptoms in transcript
  public detectRedFlags(transcript: string): RedFlagAlert[] {
    const alerts: RedFlagAlert[] = [];
    
    // Check each urgency level
    for (const [level, patterns] of Object.entries(RED_FLAG_PATTERNS)) {
      for (const { pattern, condition } of patterns) {
        const match = transcript.match(pattern);
        if (match) {
          let recommendations: string[] = [];
          
          // Add level-specific recommendations
          if (level === 'critical') {
            recommendations = [
              'Immediate medical attention required',
              'Consider calling emergency services',
              'Document vital signs urgently',
              'Prepare for potential transfer'
            ];
          } else if (level === 'urgent') {
            recommendations = [
              'Urgent assessment needed',
              'Consider same-day referral',
              'Monitor closely',
              'Document thoroughly'
            ];
          } else {
            recommendations = [
              'Further investigation warranted',
              'Schedule follow-up',
              'Consider specialist referral',
              'Track progression'
            ];
          }
          
          alerts.push({
            level: level as 'critical' | 'urgent' | 'important',
            condition,
            matchedText: match[0],
            recommendations
          });
        }
      }
    }
    
    return alerts;
  }

  // Generate differential diagnoses using AI
  public async generateDifferentialDiagnoses(
    transcript: string,
    soapSections: any
  ): Promise<DifferentialDiagnosis[]> {
    try {
      const prompt = `Based on this clinical presentation, generate a differential diagnosis list.

Patient Presentation:
Subjective: ${soapSections.subjective || transcript}
Objective: ${soapSections.objective || 'Not documented'}

Generate 5-7 differential diagnoses in order of probability. For each diagnosis, provide:
1. Diagnosis name
2. Probability (as percentage)
3. Supporting symptoms from the presentation
4. Additional tests needed to confirm/rule out
5. ICD-10 code if applicable

Respond in JSON format:
{
  "differentials": [
    {
      "diagnosis": "string",
      "probability": number,
      "supportingSymptoms": ["string"],
      "additionalTestsNeeded": ["string"],
      "icd10Code": "string"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'system',
            content: 'You are an experienced physician generating differential diagnoses. Provide accurate medical reasoning based on the presented symptoms.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.differentials || [];
    } catch (error) {
      console.error('Error generating differential diagnoses:', error);
      return [];
    }
  }

  // Match clinical guidelines based on condition
  public matchClinicalGuidelines(transcript: string, assessment: string): ClinicalGuideline[] {
    const guidelines: ClinicalGuideline[] = [];
    const textToSearch = (transcript + ' ' + assessment).toLowerCase();
    
    // Check for matching conditions
    for (const [condition, guideline] of Object.entries(CLINICAL_GUIDELINES)) {
      if (textToSearch.includes(condition)) {
        guidelines.push({
          condition,
          ...guideline
        });
      }
    }
    
    return guidelines;
  }

  // Get evidence-based treatment recommendations
  public async getEvidenceBasedRecommendations(
    diagnosis: string,
    patientContext: string
  ): Promise<string[]> {
    try {
      const prompt = `For a patient with ${diagnosis}, provide evidence-based treatment recommendations.

Patient context: ${patientContext}

Provide 5-7 specific, actionable treatment recommendations based on current medical evidence and guidelines. Include:
- First-line treatments
- Non-pharmacological interventions
- Pharmacological options if appropriate
- Follow-up recommendations
- Patient education points

Format as a JSON array of strings.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical decision support system providing evidence-based treatment recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.recommendations || [];
    } catch (error) {
      console.error('Error getting treatment recommendations:', error);
      return [];
    }
  }

  // Check for contraindications
  public async checkContraindications(
    medications: string[],
    conditions: string[],
    allergies: string[]
  ): Promise<Array<{ medication: string; issue: string; severity: string }>> {
    try {
      const prompt = `Check for contraindications and drug interactions.

Medications: ${medications.join(', ')}
Medical Conditions: ${conditions.join(', ')}
Allergies: ${allergies.join(', ')}

Identify any:
1. Drug-drug interactions
2. Drug-condition contraindications
3. Allergy concerns

Respond in JSON format:
{
  "contraindications": [
    {
      "medication": "string",
      "issue": "string",
      "severity": "high|medium|low"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical pharmacist checking for medication safety issues.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.contraindications || [];
    } catch (error) {
      console.error('Error checking contraindications:', error);
      return [];
    }
  }
}

export const clinicalDecisionService = ClinicalDecisionService.getInstance();