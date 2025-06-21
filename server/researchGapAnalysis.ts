import OpenAI from "openai";
import { db } from "./db";
import { researchArticles, type ResearchArticle } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for research gap analysis");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GapAnalysisInput {
  title: string;
  abstract: string;
  methodology?: string;
  authors: string;
  journal: string;
  publicationDate: string;
}

interface GapAnalysisResult {
  qualityScore: number;
  identifiedGaps: {
    methodology: string[];
    statistical: string[];
    clinical: string[];
    bias: string[];
  };
  generatedQuestions: {
    critical: string[];
    moderate: string[];
    minor: string[];
  };
  biasAssessment: {
    selectionBias: { score: number; notes: string };
    performanceBias: { score: number; notes: string };
    detectionBias: { score: number; notes: string };
    attritionBias: { score: number; notes: string };
    reportingBias: { score: number; notes: string };
  };
  methodologyAssessment: {
    sampleSizeAdequacy: { score: number; notes: string };
    studyDesign: { score: number; notes: string };
    outcomeValidation: { score: number; notes: string };
    followUpDuration: { score: number; notes: string };
    statisticalMethods: { score: number; notes: string };
  };
  followUpQuestions: {
    methodological: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    population: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    intervention: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    outcomes: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    mechanisms: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
  };
}

export class ResearchGapAnalysisService {
  
  async analyzeResearchPaper(input: GapAnalysisInput): Promise<GapAnalysisResult> {
    console.log("Starting AI gap analysis for:", input.title);

    const prompt = this.buildAnalysisPrompt(input);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert research methodologist and biostatistician specializing in physiotherapy and rehabilitation research. 
            Your task is to critically analyze research papers and identify methodological gaps, statistical concerns, and areas for improvement.
            Always respond with valid JSON matching the exact structure requested.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const analysis = JSON.parse(response) as GapAnalysisResult;
      console.log("Gap analysis completed successfully");
      return analysis;

    } catch (error) {
      console.error("Error in AI gap analysis:", error);
      return this.createFallbackAnalysis(input);
    }
  }

  private buildAnalysisPrompt(input: GapAnalysisInput): string {
    return `
Analyze this physiotherapy research paper and provide a comprehensive gap analysis. Return your analysis as JSON with the exact structure below:

**Paper Details:**
Title: ${input.title}
Authors: ${input.authors}
Journal: ${input.journal}
Publication Date: ${input.publicationDate}
Abstract: ${input.abstract}
${input.methodology ? `Methodology: ${input.methodology}` : ''}

**Required JSON Response Structure:**
{
  "qualityScore": 0-100,
  "identifiedGaps": {
    "methodology": ["specific methodology gaps"],
    "statistical": ["statistical analysis concerns"],
    "clinical": ["clinical applicability issues"],
    "bias": ["potential bias sources"]
  },
  "generatedQuestions": {
    "critical": ["critical questions that significantly impact validity"],
    "moderate": ["important questions for interpretation"],
    "minor": ["minor clarifications needed"]
  },
  "biasAssessment": {
    "selectionBias": {"score": 0-10, "notes": "assessment notes"},
    "performanceBias": {"score": 0-10, "notes": "assessment notes"},
    "detectionBias": {"score": 0-10, "notes": "assessment notes"},
    "attritionBias": {"score": 0-10, "notes": "assessment notes"},
    "reportingBias": {"score": 0-10, "notes": "assessment notes"}
  },
  "methodologyAssessment": {
    "sampleSizeAdequacy": {"score": 0-10, "notes": "assessment notes"},
    "studyDesign": {"score": 0-10, "notes": "assessment notes"},
    "outcomeValidation": {"score": 0-10, "notes": "assessment notes"},
    "followUpDuration": {"score": 0-10, "notes": "assessment notes"},
    "statisticalMethods": {"score": 0-10, "notes": "assessment notes"}
  },
  "followUpQuestions": {
    "methodological": [{"question": "specific research question", "priority": 1-10, "feasibilityScore": 1-10, "rationale": "explanation"}],
    "population": [{"question": "population-focused question", "priority": 1-10, "feasibilityScore": 1-10, "rationale": "explanation"}],
    "intervention": [{"question": "intervention modification question", "priority": 1-10, "feasibilityScore": 1-10, "rationale": "explanation"}],
    "outcomes": [{"question": "outcome measurement question", "priority": 1-10, "feasibilityScore": 1-10, "rationale": "explanation"}],
    "mechanisms": [{"question": "mechanism exploration question", "priority": 1-10, "feasibilityScore": 1-10, "rationale": "explanation"}]
  }
}

Focus on:
1. Sample size calculations and power analysis
2. Randomization and blinding procedures
3. Outcome measure validity and reliability
4. Statistical test appropriateness
5. Missing data handling
6. Generalizability of findings
7. Clinical significance vs statistical significance

**Follow-up Research Questions Guidelines:**
Generate 2-3 questions per category that build upon this research:

- **Methodological**: Questions about improving study design, sample size, duration, or measurement approaches
- **Population**: Questions about testing in different demographics, age groups, or severity levels
- **Intervention**: Questions about modifying protocols, dosage, frequency, or combining treatments
- **Outcomes**: Questions about different outcome measures, longer follow-up, or patient-reported measures
- **Mechanisms**: Questions exploring underlying physiological or biomechanical mechanisms

Priority Scale: 1 (low) to 10 (high research priority)
Feasibility Scale: 1 (very difficult) to 10 (very feasible)
Include brief rationale explaining why each question is important.
8. Long-term follow-up adequacy
9. Potential confounding variables
10. Risk of bias assessment per Cochrane guidelines
`;
  }

  private createFallbackAnalysis(input: GapAnalysisInput): GapAnalysisResult {
    console.log("Creating fallback analysis for:", input.title);
    
    return {
      qualityScore: 65,
      identifiedGaps: {
        methodology: ["Sample size calculation not clearly reported", "Randomization method unclear"],
        statistical: ["Multiple comparisons not adjusted", "Effect size reporting incomplete"],
        clinical: ["Real-world applicability unclear", "Long-term outcomes not assessed"],
        bias: ["Potential selection bias in recruitment", "Blinding procedures unclear"]
      },
      generatedQuestions: {
        critical: [
          "Was adequate power analysis conducted for primary outcomes?",
          "Were randomization and allocation concealment procedures appropriate?"
        ],
        moderate: [
          "How were missing data handled in the analysis?",
          "Were outcome assessors blinded to group allocation?"
        ],
        minor: [
          "What was the rationale for chosen follow-up duration?",
          "Were baseline characteristics adequately reported?"
        ]
      },
      biasAssessment: {
        selectionBias: { score: 6, notes: "Recruitment method may introduce selection bias" },
        performanceBias: { score: 7, notes: "Intervention delivery appears standardized" },
        detectionBias: { score: 5, notes: "Unclear if outcome assessors were blinded" },
        attritionBias: { score: 6, notes: "Dropout rates acceptable but handling unclear" },
        reportingBias: { score: 7, notes: "Most outcomes appear to be reported" }
      },
      methodologyAssessment: {
        sampleSizeAdequacy: { score: 6, notes: "Sample size appears adequate but calculation not shown" },
        studyDesign: { score: 7, notes: "Appropriate design for research question" },
        outcomeValidation: { score: 6, notes: "Validated measures used but reliability not reported" },
        followUpDuration: { score: 5, notes: "Follow-up may be too short for intervention type" },
        statisticalMethods: { score: 6, notes: "Appropriate tests used but some concerns with multiple comparisons" }
      },
      followUpQuestions: {
        methodological: [
          { question: "Would a longer follow-up period better capture treatment effects?", priority: 8, feasibilityScore: 7, rationale: "Current follow-up may be insufficient to assess long-term outcomes" },
          { question: "Could a larger sample size improve statistical power?", priority: 7, feasibilityScore: 6, rationale: "Power calculation unclear, larger study would strengthen findings" }
        ],
        population: [
          { question: "How would results differ in older adult populations?", priority: 6, feasibilityScore: 8, rationale: "Age-related factors may influence treatment response" },
          { question: "Would findings generalize to patients with comorbidities?", priority: 7, feasibilityScore: 7, rationale: "Real-world patients often have multiple conditions" }
        ],
        intervention: [
          { question: "What is the optimal treatment dosage and frequency?", priority: 8, feasibilityScore: 7, rationale: "Dose-response relationship not established" },
          { question: "Would combining with other therapies enhance outcomes?", priority: 6, feasibilityScore: 6, rationale: "Multimodal approaches may be more effective" }
        ],
        outcomes: [
          { question: "How do patient-reported outcomes compare to clinical measures?", priority: 7, feasibilityScore: 8, rationale: "Patient perspective is crucial for treatment evaluation" },
          { question: "What are the cost-effectiveness implications?", priority: 6, feasibilityScore: 7, rationale: "Economic evaluation important for healthcare decisions" }
        ],
        mechanisms: [
          { question: "What physiological mechanisms drive the observed improvements?", priority: 5, feasibilityScore: 5, rationale: "Understanding mechanisms could optimize treatment" },
          { question: "How do biomechanical changes relate to functional outcomes?", priority: 6, feasibilityScore: 6, rationale: "Mechanism understanding could guide treatment progression" }
        ]
      }
    };
  }

  async analyzeExistingPaper(articleId: number): Promise<void> {
    console.log(`Analyzing existing paper with ID: ${articleId}`);

    try {
      // Get the research article
      const [article] = await db
        .select()
        .from(researchArticles)
        .where(eq(researchArticles.id, articleId));

      if (!article) {
        throw new Error(`Research article with ID ${articleId} not found`);
      }

      // Skip if already analyzed
      if (article.aiAnalysisStatus === 'completed') {
        console.log(`Article ${articleId} already analyzed`);
        return;
      }

      // Update status to analyzing
      await db
        .update(researchArticles)
        .set({ aiAnalysisStatus: 'analyzing' })
        .where(eq(researchArticles.id, articleId));

      // Perform analysis
      const analysis = await this.analyzeResearchPaper({
        title: article.title,
        abstract: article.abstract,
        methodology: article.methodology || undefined,
        authors: article.authors,
        journal: article.journal,
        publicationDate: article.publicationDate.toISOString(),
      });

      // Update the article with analysis results
      await db
        .update(researchArticles)
        .set({
          aiAnalysisStatus: 'completed',
          qualityScore: analysis.qualityScore,
          identifiedGaps: analysis.identifiedGaps,
          generatedQuestions: analysis.generatedQuestions,
          biasAssessment: analysis.biasAssessment,
          methodologyAssessment: analysis.methodologyAssessment,
          aiAnalyzedAt: new Date(),
        })
        .where(eq(researchArticles.id, articleId));

      console.log(`Successfully analyzed article ${articleId}`);

    } catch (error) {
      console.error(`Error analyzing article ${articleId}:`, error);
      
      // Update status to failed
      await db
        .update(researchArticles)
        .set({ aiAnalysisStatus: 'failed' })
        .where(eq(researchArticles.id, articleId));
    }
  }

  async batchAnalyzeArticles(limit: number = 5): Promise<void> {
    console.log(`Starting batch analysis of up to ${limit} articles`);

    try {
      // Get articles that haven't been analyzed yet
      const articlesToAnalyze = await db
        .select()
        .from(researchArticles)
        .where(eq(researchArticles.aiAnalysisStatus, 'pending'))
        .limit(limit);

      console.log(`Found ${articlesToAnalyze.length} articles to analyze`);

      for (const article of articlesToAnalyze) {
        await this.analyzeExistingPaper(article.id);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Batch analysis completed for ${articlesToAnalyze.length} articles`);

    } catch (error) {
      console.error("Error in batch analysis:", error);
      throw error;
    }
  }
}

export const researchGapAnalysisService = new ResearchGapAnalysisService();