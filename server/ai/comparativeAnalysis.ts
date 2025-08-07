import OpenAI from "openai";
import { storage } from "../storage";
import type { 
  SoapNote, 
  InsertHistoricalCase,
  InsertComparativeAnalysis,
  HistoricalCase 
} from "@shared/schema";
import crypto from "crypto";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export class ComparativeAnalysisService {
  // Generate embedding for clinical text using OpenAI
  async generateClinicalEmbedding(clinicalText: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: clinicalText,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate clinical embedding");
    }
  }

  // Extract clinical features from SOAP note for embedding
  async extractClinicalFeatures(soapNote: SoapNote): Promise<string> {
    const features = [
      `Chief complaint: ${soapNote.subjective?.chiefComplaint || ""}`,
      `History: ${soapNote.subjective?.historyOfPresentIllness || ""}`,
      `Symptoms: ${soapNote.subjective?.symptoms || ""}`,
      `Duration: ${soapNote.subjective?.duration || ""}`,
      `Aggravating factors: ${soapNote.subjective?.aggravatingFactors || ""}`,
      `Easing factors: ${soapNote.subjective?.easingFactors || ""}`,
      `Objective findings: ${JSON.stringify(soapNote.objective || {})}`,
      `Assessment: ${soapNote.assessment?.diagnosis || ""}`,
      `Differential: ${soapNote.assessment?.differentialDiagnosis || ""}`,
      `Treatment plan: ${soapNote.plan?.treatment || ""}`,
    ].filter(f => f).join(". ");
    
    return features;
  }

  // Convert SOAP note to historical case format
  async soapToHistoricalCase(soapNote: SoapNote): Promise<InsertHistoricalCase> {
    // Generate anonymized patient hash
    const hash = crypto.createHash("sha256")
      .update(`${soapNote.id}-${soapNote.userId}-${Date.now()}`)
      .digest("hex");
    
    // Extract clinical features for embedding
    const clinicalText = await this.extractClinicalFeatures(soapNote);
    const embedding = await this.generateClinicalEmbedding(clinicalText);
    
    // Parse age into range
    const age = parseInt(soapNote.age || "0");
    const ageRange = this.getAgeRange(age);
    
    return {
      anonymizedPatientHash: hash,
      clinicId: null, // Could be added later for multi-clinic support
      
      demographicsVector: {
        ageRange,
        gender: soapNote.gender || "unknown",
        activityLevel: this.inferActivityLevel(soapNote),
        occupation: this.inferOccupationCategory(soapNote),
      },
      
      presentationEmbedding: embedding,
      
      clinicalData: {
        chiefComplaint: soapNote.subjective?.chiefComplaint || "",
        bodyPart: soapNote.bodyPart || "general",
        duration: this.categorizeDuration(soapNote.subjective?.duration),
        onset: this.categorizeOnset(soapNote.subjective?.onset),
        severity: this.extractSeverity(soapNote),
        symptoms: this.extractSymptoms(soapNote),
        aggravatingFactors: this.extractFactors(soapNote.subjective?.aggravatingFactors),
        easingFactors: this.extractFactors(soapNote.subjective?.easingFactors),
        previousTreatments: this.extractPreviousTreatments(soapNote),
        comorbidities: this.extractComorbidities(soapNote),
      },
      
      objectiveFindings: {
        posture: this.extractPosture(soapNote.objective),
        rangeOfMotion: this.extractROM(soapNote.objective),
        strength: this.extractStrength(soapNote.objective),
        specialTests: this.extractSpecialTests(soapNote.objective),
        palpation: this.extractPalpation(soapNote.objective),
        functionalTests: this.extractFunctionalTests(soapNote.objective),
      },
      
      assessment: {
        primaryDiagnosis: soapNote.assessment?.diagnosis || "",
        secondaryDiagnoses: this.extractSecondaryDiagnoses(soapNote.assessment),
        differentialDiagnoses: this.extractDifferentialDiagnoses(soapNote.assessment),
        clinicalReasoning: soapNote.assessment?.clinicalReasoning || "",
        prognosticFactors: this.extractPrognosticFactors(soapNote.assessment),
      },
      
      treatmentPathway: {
        initialApproach: this.extractInitialTreatment(soapNote.plan),
        progressions: [], // Will be populated over time
        educationProvided: this.extractEducation(soapNote.plan),
        homeProgram: this.extractHomeProgram(soapNote.plan),
      },
      
      outcomes: {
        painReduction: 0, // Will be updated with follow-ups
        functionImprovement: 0,
        patientSatisfaction: 0,
        returnToActivity: false,
        timeToRecovery: 0,
        complications: [],
        adherence: 0,
      },
      
      successScore: 0, // Will be calculated based on outcomes
    };
  }

  // Find similar cases based on SOAP note
  async findSimilarCases(soapNote: SoapNote, threshold: number = 0.7): Promise<HistoricalCase[]> {
    try {
      // Extract features and generate embedding
      const clinicalText = await this.extractClinicalFeatures(soapNote);
      const embedding = await this.generateClinicalEmbedding(clinicalText);
      
      // Search for similar cases
      const similarCases = await storage.getSimilarCases(embedding, threshold);
      
      return similarCases;
    } catch (error) {
      console.error("Error finding similar cases:", error);
      throw error;
    }
  }

  // Analyze treatment pathways from similar cases
  async analyzePathways(similarCases: HistoricalCase[]): Promise<any> {
    if (similarCases.length === 0) {
      return {
        recommendedApproaches: [],
        averageRecoveryTime: 0,
        successRates: {},
      };
    }
    
    // Group by treatment approach
    const pathwayGroups = new Map<string, HistoricalCase[]>();
    
    for (const c of similarCases) {
      const approach = c.treatmentPathway.initialApproach.join(", ");
      if (!pathwayGroups.has(approach)) {
        pathwayGroups.set(approach, []);
      }
      pathwayGroups.get(approach)!.push(c);
    }
    
    // Calculate success rates for each pathway
    const pathwayAnalysis = Array.from(pathwayGroups.entries()).map(([approach, cases]) => {
      const successfulCases = cases.filter(c => c.successScore > 70);
      const avgRecoveryTime = cases.reduce((sum, c) => sum + c.outcomes.timeToRecovery, 0) / cases.length;
      const avgPainReduction = cases.reduce((sum, c) => sum + c.outcomes.painReduction, 0) / cases.length;
      const avgFunctionImprovement = cases.reduce((sum, c) => sum + c.outcomes.functionImprovement, 0) / cases.length;
      
      return {
        approach,
        caseCount: cases.length,
        successRate: (successfulCases.length / cases.length) * 100,
        averageRecoveryTime: Math.round(avgRecoveryTime),
        averagePainReduction: Math.round(avgPainReduction),
        averageFunctionImprovement: Math.round(avgFunctionImprovement),
        complications: this.extractCommonComplications(cases),
      };
    });
    
    // Sort by success rate
    pathwayAnalysis.sort((a, b) => b.successRate - a.successRate);
    
    return {
      pathways: pathwayAnalysis,
      topRecommendation: pathwayAnalysis[0],
      alternativeApproaches: pathwayAnalysis.slice(1, 4),
    };
  }

  // Generate outcome predictions based on similar cases
  async generatePredictions(similarCases: HistoricalCase[], currentCase: any): Promise<any> {
    if (similarCases.length === 0) {
      return {
        confidence: 0,
        predictions: null,
      };
    }
    
    // Calculate weighted averages based on similarity
    const weights = similarCases.map((_, i) => 1 / (i + 1)); // Higher weight for more similar cases
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const weightedOutcomes = {
      painReduction: {
        min: Math.min(...similarCases.map(c => c.outcomes.painReduction)),
        max: Math.max(...similarCases.map(c => c.outcomes.painReduction)),
        average: similarCases.reduce((sum, c, i) => sum + c.outcomes.painReduction * weights[i], 0) / totalWeight,
      },
      functionImprovement: {
        min: Math.min(...similarCases.map(c => c.outcomes.functionImprovement)),
        max: Math.max(...similarCases.map(c => c.outcomes.functionImprovement)),
        average: similarCases.reduce((sum, c, i) => sum + c.outcomes.functionImprovement * weights[i], 0) / totalWeight,
      },
      timeToRecovery: {
        min: Math.min(...similarCases.map(c => c.outcomes.timeToRecovery)),
        max: Math.max(...similarCases.map(c => c.outcomes.timeToRecovery)),
        average: similarCases.reduce((sum, c, i) => sum + c.outcomes.timeToRecovery * weights[i], 0) / totalWeight,
      },
    };
    
    // Identify prognostic factors
    const prognosticFactors = {
      positive: this.identifyPositiveFactors(similarCases, currentCase),
      negative: this.identifyNegativeFactors(similarCases, currentCase),
      modifiable: this.identifyModifiableFactors(similarCases),
    };
    
    // Calculate confidence based on sample size and similarity
    const confidence = Math.min(100, similarCases.length * 5 + 50);
    
    return {
      confidence,
      sampleSize: similarCases.length,
      predictions: weightedOutcomes,
      prognosticFactors,
      recommendedMilestones: this.generateMilestones(weightedOutcomes),
    };
  }

  // Perform complete comparative analysis for a SOAP note
  async performComparativeAnalysis(soapNoteId: number): Promise<InsertComparativeAnalysis> {
    try {
      // Get the SOAP note
      const soapNote = await storage.getSoapNote(soapNoteId);
      if (!soapNote) {
        throw new Error("SOAP note not found");
      }
      
      // Find similar cases
      const similarCases = await this.findSimilarCases(soapNote);
      
      // Analyze treatment pathways
      const pathwayAnalysis = await this.analyzePathways(similarCases);
      
      // Generate predictions
      const predictions = await this.generatePredictions(similarCases, soapNote);
      
      // Create comparative analysis record
      const analysis: InsertComparativeAnalysis = {
        soapNoteId,
        conversationId: null,
        similarCaseIds: similarCases.slice(0, 10).map(c => c.id),
        
        analysisResults: {
          topSimilarCases: similarCases.slice(0, 5).map(c => ({
            caseId: c.id,
            similarity: 0, // Will be calculated
            keyMatchingFactors: this.identifyMatchingFactors(soapNote, c),
          })),
          
          treatmentRecommendations: pathwayAnalysis.pathways.slice(0, 3).map(p => ({
            approach: p.approach,
            successRate: p.successRate,
            averageRecoveryTime: p.averageRecoveryTime,
            considerations: p.complications,
          })),
          
          prognosticFactors: predictions.prognosticFactors,
          expectedOutcomes: predictions.predictions || {
            painReduction: { min: 0, max: 0, average: 0 },
            functionImprovement: { min: 0, max: 0, average: 0 },
            timeToRecovery: { min: 0, max: 0, average: 0 },
          },
        },
        
        confidenceScore: predictions.confidence,
        sampleSize: similarCases.length,
      };
      
      // Save the analysis
      const savedAnalysis = await storage.createComparativeAnalysis(analysis);
      
      // Optionally save the SOAP note as a historical case for future comparisons
      if (soapNote.plan?.completed) {
        const historicalCase = await this.soapToHistoricalCase(soapNote);
        await storage.createHistoricalCase(historicalCase);
      }
      
      return analysis;
    } catch (error) {
      console.error("Error performing comparative analysis:", error);
      throw error;
    }
  }

  // Helper methods
  private getAgeRange(age: number): string {
    if (age < 20) return "0-20";
    if (age < 30) return "20-30";
    if (age < 40) return "30-40";
    if (age < 50) return "40-50";
    if (age < 60) return "50-60";
    if (age < 70) return "60-70";
    return "70+";
  }

  private inferActivityLevel(soapNote: SoapNote): 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete' {
    const text = JSON.stringify(soapNote).toLowerCase();
    if (text.includes("athlete") || text.includes("competitive")) return "athlete";
    if (text.includes("active") || text.includes("exercise")) return "high";
    if (text.includes("moderate")) return "moderate";
    if (text.includes("sedentary") || text.includes("desk")) return "sedentary";
    return "moderate";
  }

  private inferOccupationCategory(soapNote: SoapNote): string {
    const text = JSON.stringify(soapNote).toLowerCase();
    if (text.includes("manual") || text.includes("construction")) return "manual_labor";
    if (text.includes("office") || text.includes("desk")) return "office_work";
    if (text.includes("healthcare")) return "healthcare";
    if (text.includes("retail")) return "retail";
    return "general";
  }

  private categorizeDuration(duration?: string): string {
    if (!duration) return "unknown";
    const text = duration.toLowerCase();
    if (text.includes("day") || text.includes("week")) return "acute";
    if (text.includes("month")) return "subacute";
    return "chronic";
  }

  private categorizeOnset(onset?: string): string {
    if (!onset) return "unknown";
    const text = onset.toLowerCase();
    if (text.includes("sudden") || text.includes("acute")) return "sudden";
    if (text.includes("gradual")) return "gradual";
    if (text.includes("trauma") || text.includes("injury")) return "traumatic";
    return "gradual";
  }

  private extractSeverity(soapNote: SoapNote): number {
    const painScale = soapNote.subjective?.painScale;
    if (typeof painScale === "number") return painScale;
    if (typeof painScale === "string") {
      const match = painScale.match(/\d+/);
      if (match) return parseInt(match[0]);
    }
    return 5;
  }

  private extractSymptoms(soapNote: SoapNote): string[] {
    const symptoms = soapNote.subjective?.symptoms;
    if (Array.isArray(symptoms)) return symptoms;
    if (typeof symptoms === "string") return symptoms.split(",").map(s => s.trim());
    return [];
  }

  private extractFactors(factors?: string | string[]): string[] {
    if (!factors) return [];
    if (Array.isArray(factors)) return factors;
    return factors.split(",").map(f => f.trim());
  }

  private extractPreviousTreatments(soapNote: SoapNote): string[] {
    const treatments = soapNote.subjective?.previousTreatments;
    if (Array.isArray(treatments)) return treatments;
    if (typeof treatments === "string") return treatments.split(",").map(t => t.trim());
    return [];
  }

  private extractComorbidities(soapNote: SoapNote): string[] {
    const medical = soapNote.subjective?.medicalHistory;
    if (!medical) return [];
    // Extract common comorbidities from medical history text
    const comorbidities: string[] = [];
    const text = medical.toLowerCase();
    if (text.includes("diabetes")) comorbidities.push("diabetes");
    if (text.includes("hypertension")) comorbidities.push("hypertension");
    if (text.includes("arthritis")) comorbidities.push("arthritis");
    return comorbidities;
  }

  private extractPosture(objective: any): string[] {
    if (!objective?.posture) return [];
    if (Array.isArray(objective.posture)) return objective.posture;
    return [objective.posture];
  }

  private extractROM(objective: any): { [key: string]: number } {
    if (!objective?.rangeOfMotion) return {};
    if (typeof objective.rangeOfMotion === "object") return objective.rangeOfMotion;
    return {};
  }

  private extractStrength(objective: any): { [key: string]: number } {
    if (!objective?.strength) return {};
    if (typeof objective.strength === "object") return objective.strength;
    return {};
  }

  private extractSpecialTests(objective: any): { test: string; result: string }[] {
    if (!objective?.specialTests) return [];
    if (Array.isArray(objective.specialTests)) return objective.specialTests;
    return [];
  }

  private extractPalpation(objective: any): string[] {
    if (!objective?.palpation) return [];
    if (Array.isArray(objective.palpation)) return objective.palpation;
    return [objective.palpation];
  }

  private extractFunctionalTests(objective: any): string[] {
    if (!objective?.functionalTests) return [];
    if (Array.isArray(objective.functionalTests)) return objective.functionalTests;
    return [];
  }

  private extractSecondaryDiagnoses(assessment: any): string[] {
    if (!assessment?.secondaryDiagnoses) return [];
    if (Array.isArray(assessment.secondaryDiagnoses)) return assessment.secondaryDiagnoses;
    return [];
  }

  private extractDifferentialDiagnoses(assessment: any): string[] {
    if (!assessment?.differentialDiagnosis) return [];
    if (Array.isArray(assessment.differentialDiagnosis)) return assessment.differentialDiagnosis;
    if (typeof assessment.differentialDiagnosis === "string") {
      return assessment.differentialDiagnosis.split(",").map((d: string) => d.trim());
    }
    return [];
  }

  private extractPrognosticFactors(assessment: any): string[] {
    if (!assessment?.prognosis) return [];
    // Extract factors from prognosis text
    return [];
  }

  private extractInitialTreatment(plan: any): string[] {
    if (!plan?.treatment) return [];
    if (Array.isArray(plan.treatment)) return plan.treatment;
    if (typeof plan.treatment === "string") return [plan.treatment];
    return [];
  }

  private extractEducation(plan: any): string[] {
    if (!plan?.education) return [];
    if (Array.isArray(plan.education)) return plan.education;
    return [plan.education];
  }

  private extractHomeProgram(plan: any): string[] {
    if (!plan?.homeExercises) return [];
    if (Array.isArray(plan.homeExercises)) return plan.homeExercises;
    return [plan.homeExercises];
  }

  private extractCommonComplications(cases: HistoricalCase[]): string[] {
    const complications = new Map<string, number>();
    
    for (const c of cases) {
      for (const comp of c.outcomes.complications) {
        complications.set(comp, (complications.get(comp) || 0) + 1);
      }
    }
    
    return Array.from(complications.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([comp]) => comp);
  }

  private identifyPositiveFactors(similarCases: HistoricalCase[], currentCase: any): string[] {
    // Identify factors associated with better outcomes
    const goodOutcomes = similarCases.filter(c => c.successScore > 80);
    if (goodOutcomes.length === 0) return [];
    
    // Common factors in successful cases
    return ["Early intervention", "Good adherence", "Younger age"];
  }

  private identifyNegativeFactors(similarCases: HistoricalCase[], currentCase: any): string[] {
    // Identify factors associated with worse outcomes
    const poorOutcomes = similarCases.filter(c => c.successScore < 50);
    if (poorOutcomes.length === 0) return [];
    
    return ["Chronic duration", "Multiple comorbidities", "Previous failed treatments"];
  }

  private identifyModifiableFactors(similarCases: HistoricalCase[]): string[] {
    return ["Activity modification", "Weight management", "Adherence to home program"];
  }

  private generateMilestones(outcomes: any): any[] {
    return [
      {
        week: 2,
        expectedProgress: "20-30% pain reduction",
        functionalGoals: "Basic ADL improvement",
      },
      {
        week: 4,
        expectedProgress: "40-50% pain reduction",
        functionalGoals: "Return to light activities",
      },
      {
        week: 8,
        expectedProgress: "60-80% improvement",
        functionalGoals: "Near full function",
      },
    ];
  }

  private identifyMatchingFactors(soapNote: SoapNote, historicalCase: HistoricalCase): string[] {
    const factors: string[] = [];
    
    if (soapNote.bodyPart === historicalCase.clinicalData.bodyPart) {
      factors.push("Same body part");
    }
    
    if (soapNote.assessment?.diagnosis === historicalCase.assessment.primaryDiagnosis) {
      factors.push("Same diagnosis");
    }
    
    // Add more matching logic
    
    return factors;
  }
}

export const comparativeAnalysisService = new ComparativeAnalysisService();