import OpenAI from 'openai';
import { db } from '../db';
import { researchArticles } from '@shared/schema';
import { or, ilike, desc, sql } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ClinicalIntakeData {
  painLocation: string;
  painSide: string;
  duration: string;
  onset: string;
  aggravatingFactors: string[];
  easingFactors: string[];
  painNature: string;
  painSeverity: number;
  functionalLimitations: string;
  redFlags: string[];
  additionalNotes: string;
}

interface MovementPattern {
  id: string;
  name: string;
  description: string;
  severity: string;
  clinicalImplication: string;
  relatedConditions: string[];
  affectedRegion: string;
}

interface AsymmetryAnalysis {
  joint: string;
  movement: string;
  leftValue: number;
  rightValue: number;
  difference: number;
  percentDifference: number;
  clinicallySignificant: boolean;
}

interface MovementAnalysisData {
  patterns: MovementPattern[];
  asymmetries: AsymmetryAnalysis[];
  compensations: { name: string; description: string }[];
  overallMovementQuality: number;
  primaryImpairments: string[];
  clinicalHypotheses: string[];
  recommendedFocus: string[];
  peakAngles: Record<string, number>;
}

interface ResearchArticle {
  id: number;
  title: string;
  authors: string;
  journal: string;
  publicationDate: Date | null;
  abstract: string;
  clinicalRelevance: string | null;
  keyFindings: string | null;
}

export interface ClinicalAssessmentResult {
  diagnosis: {
    primaryHypothesis: string;
    differentialDiagnoses: string[];
    confidence: string;
    clinicalReasoning: string;
  };
  movementFindings: {
    summary: string;
    keyImpairments: string[];
    functionalLimitations: string[];
  };
  treatmentPlan: {
    phase1: TreatmentPhase;
    phase2: TreatmentPhase;
    phase3: TreatmentPhase;
    precautions: string[];
    prognosis: string;
  };
  researchEvidence: {
    articles: ResearchCitation[];
    evidenceSummary: string;
    levelOfEvidence: string;
  };
  redFlagAlert: {
    present: boolean;
    flags: string[];
    recommendation: string;
  } | null;
}

interface TreatmentPhase {
  name: string;
  duration: string;
  goals: string[];
  interventions: TreatmentIntervention[];
}

interface TreatmentIntervention {
  type: string;
  name: string;
  description: string;
  frequency: string;
  evidence: string;
}

interface ResearchCitation {
  title: string;
  authors: string;
  year: number;
  journal: string;
  keyFinding: string;
  clinicalRelevance: string;
}

export class ClinicalAssessmentService {
  
  async generateAssessment(
    intakeData: ClinicalIntakeData | null,
    movementData: MovementAnalysisData
  ): Promise<ClinicalAssessmentResult> {
    
    const relevantArticles = await this.fetchRelevantResearch(intakeData, movementData);
    
    if (intakeData?.redFlags && intakeData.redFlags.length > 0) {
      const redFlagAlert = this.assessRedFlags(intakeData.redFlags);
      if (redFlagAlert.present) {
        return this.generateRedFlagResponse(redFlagAlert, intakeData, movementData, relevantArticles);
      }
    }
    
    const aiAssessment = await this.generateAIAssessment(intakeData, movementData, relevantArticles);
    
    return aiAssessment;
  }

  private async fetchRelevantResearch(
    intakeData: ClinicalIntakeData | null,
    movementData: MovementAnalysisData
  ): Promise<ResearchArticle[]> {
    const searchTerms: string[] = [];
    
    if (intakeData?.painLocation) {
      const locationMap: Record<string, string[]> = {
        'cervical': ['neck pain', 'cervical', 'whiplash'],
        'thoracic': ['thoracic pain', 'upper back', 'thoracic spine'],
        'lumbar': ['low back pain', 'lumbar', 'sciatica'],
        'shoulder': ['shoulder pain', 'rotator cuff', 'impingement'],
        'elbow': ['elbow pain', 'lateral epicondylitis', 'tennis elbow'],
        'wrist_hand': ['wrist pain', 'carpal tunnel', 'hand'],
        'hip': ['hip pain', 'hip osteoarthritis', 'femoroacetabular'],
        'knee': ['knee pain', 'patellofemoral', 'ACL'],
        'ankle_foot': ['ankle pain', 'plantar fasciitis', 'ankle sprain'],
        'pelvis': ['pelvic pain', 'sacroiliac', 'SI joint'],
      };
      searchTerms.push(...(locationMap[intakeData.painLocation] || [intakeData.painLocation]));
    }
    
    movementData.patterns.forEach(pattern => {
      if (pattern.relatedConditions) {
        searchTerms.push(...pattern.relatedConditions.slice(0, 2));
      }
    });
    
    movementData.primaryImpairments.forEach(impairment => {
      searchTerms.push(impairment);
    });
    
    if (intakeData?.duration === 'chronic') {
      searchTerms.push('chronic pain management');
    }
    
    if (searchTerms.length === 0) {
      searchTerms.push('musculoskeletal', 'rehabilitation');
    }

    try {
      const termsToSearch = searchTerms.slice(0, 5);
      
      if (termsToSearch.length === 0) {
        const articles = await db
          .select({
            id: researchArticles.id,
            title: researchArticles.title,
            authors: researchArticles.authors,
            journal: researchArticles.journal,
            publicationDate: researchArticles.publicationDate,
            abstract: researchArticles.abstract,
            clinicalRelevance: researchArticles.clinicalRelevance,
            keyFindings: researchArticles.keyFindings,
          })
          .from(researchArticles)
          .orderBy(desc(researchArticles.publicationDate))
          .limit(5);
        return articles;
      }

      const conditions = termsToSearch.map(term => 
        or(
          ilike(researchArticles.title, `%${term}%`),
          ilike(researchArticles.abstract, `%${term}%`),
          ilike(researchArticles.keyFindings, `%${term}%`)
        )
      );

      const articles = await db
        .select({
          id: researchArticles.id,
          title: researchArticles.title,
          authors: researchArticles.authors,
          journal: researchArticles.journal,
          publicationDate: researchArticles.publicationDate,
          abstract: researchArticles.abstract,
          clinicalRelevance: researchArticles.clinicalRelevance,
          keyFindings: researchArticles.keyFindings,
        })
        .from(researchArticles)
        .where(or(...conditions))
        .orderBy(desc(researchArticles.publicationDate))
        .limit(10);

      return articles;
    } catch (error) {
      console.error('Error fetching research articles:', error);
      return [];
    }
  }

  private assessRedFlags(redFlags: string[]): { present: boolean; flags: string[]; recommendation: string } {
    const criticalFlags = ['bladder_bowel', 'saddle_numbness', 'progressive_weakness'];
    const hasCritical = redFlags.some(flag => criticalFlags.includes(flag));
    
    const flagDescriptions: Record<string, string> = {
      'night_pain': 'Night pain waking from sleep',
      'weight_loss': 'Unexplained weight loss',
      'fever': 'Fever or feeling unwell',
      'bladder_bowel': 'Bladder/bowel dysfunction (URGENT)',
      'saddle_numbness': 'Saddle area numbness (URGENT)',
      'progressive_weakness': 'Progressive neurological weakness (URGENT)',
      'trauma': 'Recent significant trauma',
      'cancer_history': 'History of cancer',
      'steroid_use': 'Long-term steroid use',
      'age_under_20': 'Age under 20 with back pain',
      'age_over_55': 'Age over 55 with new onset pain',
    };

    return {
      present: redFlags.length > 0,
      flags: redFlags.map(f => flagDescriptions[f] || f),
      recommendation: hasCritical 
        ? 'URGENT: Immediate medical referral recommended. Possible cauda equina syndrome or serious pathology.'
        : 'Medical screening recommended before proceeding with physiotherapy treatment.',
    };
  }

  private async generateRedFlagResponse(
    redFlagAlert: { present: boolean; flags: string[]; recommendation: string },
    intakeData: ClinicalIntakeData | null,
    movementData: MovementAnalysisData,
    articles: ResearchArticle[]
  ): Promise<ClinicalAssessmentResult> {
    return {
      diagnosis: {
        primaryHypothesis: 'Red flags identified - requires medical screening',
        differentialDiagnoses: ['Serious pathology must be ruled out before musculoskeletal diagnosis'],
        confidence: 'N/A - medical clearance required',
        clinicalReasoning: 'Red flag signs/symptoms present that require medical investigation before proceeding with physiotherapy assessment and treatment.',
      },
      movementFindings: {
        summary: 'Movement assessment deferred pending medical clearance',
        keyImpairments: movementData.primaryImpairments,
        functionalLimitations: intakeData?.functionalLimitations ? [intakeData.functionalLimitations] : [],
      },
      treatmentPlan: {
        phase1: {
          name: 'Medical Referral',
          duration: 'Immediate',
          goals: ['Rule out serious pathology', 'Obtain medical clearance'],
          interventions: [{
            type: 'Referral',
            name: 'Medical screening',
            description: 'Refer to appropriate medical professional for investigation of red flag symptoms',
            frequency: 'Immediate',
            evidence: 'Clinical guidelines recommend immediate referral for red flag symptoms',
          }],
        },
        phase2: { name: 'Pending clearance', duration: 'TBD', goals: [], interventions: [] },
        phase3: { name: 'Pending clearance', duration: 'TBD', goals: [], interventions: [] },
        precautions: redFlagAlert.flags,
        prognosis: 'Dependent on outcome of medical investigation',
      },
      researchEvidence: {
        articles: [],
        evidenceSummary: 'Medical screening takes priority over musculoskeletal treatment',
        levelOfEvidence: 'Clinical guideline recommendation',
      },
      redFlagAlert,
    };
  }

  private async generateAIAssessment(
    intakeData: ClinicalIntakeData | null,
    movementData: MovementAnalysisData,
    articles: ResearchArticle[]
  ): Promise<ClinicalAssessmentResult> {
    
    const researchContext = articles.map(a => {
      const year = a.publicationDate ? new Date(a.publicationDate).getFullYear() : 'N/A';
      return `- ${a.title} (${a.authors}, ${year}): ${a.keyFindings || a.abstract?.substring(0, 200)}...`;
    }).join('\n');

    const prompt = `You are an expert physiotherapist clinical decision support system. Analyze the following patient data and generate a comprehensive assessment with evidence-based treatment recommendations.

## Patient Clinical Intake
${intakeData ? `
- Pain Location: ${intakeData.painLocation} (${intakeData.painSide})
- Duration: ${intakeData.duration}
- Onset: ${intakeData.onset}
- Pain Nature: ${intakeData.painNature}
- Pain Severity: ${intakeData.painSeverity}/10
- Aggravating Factors: ${intakeData.aggravatingFactors.join(', ') || 'Not specified'}
- Easing Factors: ${intakeData.easingFactors.join(', ') || 'Not specified'}
- Functional Limitations: ${intakeData.functionalLimitations || 'Not specified'}
- Additional Notes: ${intakeData.additionalNotes || 'None'}
` : 'No clinical intake provided - analysis based on movement patterns only.'}

## Movement Analysis Findings
- Overall Movement Quality Score: ${movementData.overallMovementQuality}/100
- Primary Impairments: ${movementData.primaryImpairments.join(', ') || 'None identified'}
- Clinical Hypotheses: ${movementData.clinicalHypotheses.join(', ') || 'None'}
- Recommended Focus Areas: ${movementData.recommendedFocus.join(', ') || 'General'}

### Identified Movement Patterns
${movementData.patterns.map(p => `- ${p.name} (${p.severity}): ${p.description}. Clinical implication: ${p.clinicalImplication}`).join('\n') || 'No significant patterns identified'}

### Asymmetries
${movementData.asymmetries.map(a => `- ${a.joint} ${a.movement}: Left ${a.leftValue.toFixed(1)}° vs Right ${a.rightValue.toFixed(1)}° (${a.percentDifference.toFixed(1)}% difference)`).join('\n') || 'No significant asymmetries'}

### Compensation Patterns
${movementData.compensations.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'No compensation patterns identified'}

## Relevant Research Evidence
${researchContext || 'No specific research articles matched the clinical presentation.'}

## Task
Generate a comprehensive clinical assessment in the following JSON format:
{
  "diagnosis": {
    "primaryHypothesis": "Most likely diagnosis based on clinical presentation",
    "differentialDiagnoses": ["Alternative diagnosis 1", "Alternative diagnosis 2"],
    "confidence": "high/moderate/low",
    "clinicalReasoning": "Detailed clinical reasoning explaining the diagnostic hypothesis"
  },
  "movementFindings": {
    "summary": "Summary of key movement findings",
    "keyImpairments": ["Impairment 1", "Impairment 2"],
    "functionalLimitations": ["Limitation 1", "Limitation 2"]
  },
  "treatmentPlan": {
    "phase1": {
      "name": "Acute/Pain Relief Phase",
      "duration": "1-2 weeks",
      "goals": ["Goal 1", "Goal 2"],
      "interventions": [
        {
          "type": "Exercise/Manual Therapy/Education",
          "name": "Intervention name",
          "description": "Detailed description with sets/reps if applicable",
          "frequency": "3x/week",
          "evidence": "Research supporting this intervention"
        }
      ]
    },
    "phase2": {
      "name": "Strengthening Phase",
      "duration": "2-4 weeks",
      "goals": [],
      "interventions": []
    },
    "phase3": {
      "name": "Return to Function Phase",
      "duration": "4-8 weeks",
      "goals": [],
      "interventions": []
    },
    "precautions": ["Precaution 1", "Precaution 2"],
    "prognosis": "Expected outcome and timeline"
  },
  "researchEvidence": {
    "articles": [
      {
        "title": "Article title",
        "authors": "First Author et al.",
        "year": 2023,
        "journal": "Journal name",
        "keyFinding": "Main finding relevant to this case",
        "clinicalRelevance": "How this applies to treatment"
      }
    ],
    "evidenceSummary": "Summary of the evidence supporting the treatment plan",
    "levelOfEvidence": "Level of evidence (I-V)"
  }
}

Ensure all treatment recommendations are evidence-based and cite the relevant research. Be specific with exercise prescriptions (sets, reps, frequency).`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from AI');

      const assessment = JSON.parse(content);
      
      return {
        ...assessment,
        redFlagAlert: null,
      };
    } catch (error) {
      console.error('Error generating AI assessment:', error);
      return this.generateFallbackAssessment(intakeData, movementData);
    }
  }

  private generateFallbackAssessment(
    intakeData: ClinicalIntakeData | null,
    movementData: MovementAnalysisData
  ): ClinicalAssessmentResult {
    return {
      diagnosis: {
        primaryHypothesis: 'Musculoskeletal dysfunction - further assessment recommended',
        differentialDiagnoses: movementData.patterns.flatMap(p => p.relatedConditions).slice(0, 3),
        confidence: 'low',
        clinicalReasoning: 'Based on movement analysis, patient demonstrates impairments requiring further clinical evaluation.',
      },
      movementFindings: {
        summary: `Movement quality score: ${movementData.overallMovementQuality}/100. ${movementData.patterns.length} movement patterns identified.`,
        keyImpairments: movementData.primaryImpairments,
        functionalLimitations: intakeData?.functionalLimitations ? [intakeData.functionalLimitations] : [],
      },
      treatmentPlan: {
        phase1: {
          name: 'Assessment & Pain Management',
          duration: '1-2 weeks',
          goals: ['Complete clinical assessment', 'Pain management'],
          interventions: [{
            type: 'Assessment',
            name: 'Comprehensive musculoskeletal examination',
            description: 'Complete physical examination to confirm diagnosis',
            frequency: 'Initial visit',
            evidence: 'Clinical examination is the foundation of physiotherapy assessment',
          }],
        },
        phase2: { name: 'To be determined', duration: 'TBD', goals: [], interventions: [] },
        phase3: { name: 'To be determined', duration: 'TBD', goals: [], interventions: [] },
        precautions: ['Monitor for red flags', 'Progress gradually'],
        prognosis: 'Dependent on clinical findings',
      },
      researchEvidence: {
        articles: [],
        evidenceSummary: 'Evidence-based treatment plan to be developed following clinical assessment',
        levelOfEvidence: 'N/A',
      },
      redFlagAlert: null,
    };
  }
}

export const clinicalAssessmentService = new ClinicalAssessmentService();
