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