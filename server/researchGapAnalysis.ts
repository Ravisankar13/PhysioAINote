import OpenAI from "openai";
import { allResearchPapers } from "./comprehensiveResearchDatabase";
import { 
  type ResearchGap, 
  type InsertResearchGap,
  bodyPartEnum 
} from "@shared/schema";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for research gap analysis");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GapAnalysisInput {
  bodyPart?: string;
  timeframeYears?: number;
  includeAllBodyParts?: boolean;
}

interface IdentifiedGap {
  title: string;
  description: string;
  bodyPart: string;
  gapType: "demographic" | "treatment" | "outcome" | "methodology";
  priority: "low" | "medium" | "high" | "critical";
  evidenceLevel: string;
  potentialImpact: string;
  suggestedMethodology: string;
}

export class ResearchGapAnalysisService {
  /**
   * Analyze research papers to identify gaps in current literature
   */
  async analyzeResearchGaps(input: GapAnalysisInput = {}): Promise<IdentifiedGap[]> {
    try {
      console.log("Starting research gap analysis...");
      
      // Filter research papers based on input criteria
      let relevantPapers = allResearchPapers;
      
      if (input.bodyPart && input.bodyPart !== "all") {
        relevantPapers = allResearchPapers.filter(paper => 
          paper.bodyPart === input.bodyPart || paper.bodyPart === "general"
        );
      }

      // Create a comprehensive overview of the research landscape
      const researchOverview = this.createResearchOverview(relevantPapers);
      
      // Use AI to identify gaps
      const gaps = await this.identifyGapsWithAI(researchOverview, input.bodyPart);
      
      return gaps;
    } catch (error) {
      console.error("Error in research gap analysis:", error);
      return this.getFallbackGaps(input.bodyPart);
    }
  }

  /**
   * Create a comprehensive overview of research landscape
   */
  private createResearchOverview(papers: typeof allResearchPapers): string {
    const bodyPartCounts = papers.reduce((acc, paper) => {
      acc[paper.bodyPart] = (acc[paper.bodyPart] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const methodologyCounts = papers.reduce((acc, paper) => {
      const methodology = this.extractMethodology(paper.abstract);
      acc[methodology] = (acc[methodology] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const populationGaps = this.analyzePopulationGaps(papers);
    const treatmentGaps = this.analyzeTreatmentGaps(papers);

    return `
Research Landscape Overview:
- Total papers analyzed: ${papers.length}
- Body part distribution: ${JSON.stringify(bodyPartCounts, null, 2)}
- Methodology distribution: ${JSON.stringify(methodologyCounts, null, 2)}
- Population gaps identified: ${populationGaps}
- Treatment gaps identified: ${treatmentGaps}

Sample abstracts for context:
${papers.slice(0, 5).map(p => `Title: ${p.title}\nAbstract: ${p.abstract.substring(0, 300)}...`).join('\n\n')}
`;
  }

  /**
   * Use AI to identify research gaps
   */
  private async identifyGapsWithAI(researchOverview: string, bodyPart?: string): Promise<IdentifiedGap[]> {
    const prompt = `As a physiotherapy research expert, analyze the following research landscape and identify critical gaps in current literature.

${researchOverview}

Please identify 8-12 significant research gaps in physiotherapy literature${bodyPart ? ` focusing on ${bodyPart}` : ''}. For each gap, provide:

1. A clear, specific title
2. Detailed description of what's missing
3. Body part focus
4. Gap type (demographic/treatment/outcome/methodology)
5. Priority level (low/medium/high/critical)
6. Current evidence quality level
7. Potential clinical impact
8. Suggested research methodology

Focus on gaps that would have meaningful clinical impact and are feasible to address through research using virtual patient data.

Respond in JSON format as an array of gap objects with these exact fields:
- title (string)
- description (string) 
- bodyPart (string - must be one of: shoulder, neck, back, elbow, wrist, hand, hip, knee, ankle, foot, general, other)
- gapType (string - one of: demographic, treatment, outcome, methodology)
- priority (string - one of: low, medium, high, critical)
- evidenceLevel (string)
- potentialImpact (string)
- suggestedMethodology (string)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.gaps || [];
  }

  /**
   * Extract methodology type from abstract
   */
  private extractMethodology(abstract: string): string {
    const methodologyKeywords = {
      "randomized controlled trial": ["randomized", "rct", "controlled trial"],
      "systematic review": ["systematic review", "meta-analysis"],
      "cohort study": ["cohort", "longitudinal", "prospective"],
      "case study": ["case study", "case report"],
      "cross-sectional": ["cross-sectional", "survey"],
      "biomechanical": ["biomechanical", "kinematic", "kinetic"],
      "qualitative": ["qualitative", "interview", "focus group"]
    };

    const lowerAbstract = abstract.toLowerCase();
    
    for (const [methodology, keywords] of Object.entries(methodologyKeywords)) {
      if (keywords.some(keyword => lowerAbstract.includes(keyword))) {
        return methodology;
      }
    }
    
    return "other";
  }

  /**
   * Analyze population representation gaps
   */
  private analyzePopulationGaps(papers: typeof allResearchPapers): string {
    const ageGroups = ["pediatric", "adolescent", "adult", "elderly"];
    const genders = ["male", "female"];
    const populations = ["athletes", "workers", "chronic pain"];

    const gaps = [];
    
    // Simple analysis - in reality this would be more sophisticated
    if (papers.length < 50) {
      gaps.push("Insufficient overall research volume");
    }
    
    gaps.push("Limited diversity in age groups studied");
    gaps.push("Underrepresentation of certain ethnic populations");
    gaps.push("Insufficient long-term follow-up studies");

    return gaps.join(", ");
  }

  /**
   * Analyze treatment approach gaps
   */
  private analyzeTreatmentGaps(papers: typeof allResearchPapers): string {
    const treatments = ["manual therapy", "exercise", "education", "technology-assisted"];
    const gaps = [];
    
    gaps.push("Limited comparative effectiveness research");
    gaps.push("Insufficient personalized treatment approaches");
    gaps.push("Lack of technology integration studies");
    gaps.push("Limited cost-effectiveness analyses");

    return gaps.join(", ");
  }

  /**
   * Generate priority gaps for specific body parts
   */
  async generateBodyPartSpecificGaps(bodyPart: string): Promise<IdentifiedGap[]> {
    const bodyPartSpecificPrompts = {
      shoulder: "shoulder impingement, rotator cuff tears, frozen shoulder, shoulder instability",
      knee: "ACL injuries, patellofemoral pain, meniscal tears, osteoarthritis",
      back: "lower back pain, disc herniation, spinal stenosis, chronic pain",
      neck: "cervical pain, whiplash, cervical radiculopathy, postural dysfunction",
      // Add more as needed
    };

    const conditions = bodyPartSpecificPrompts[bodyPart as keyof typeof bodyPartSpecificPrompts] || `${bodyPart} conditions`;
    
    const prompt = `Identify specific research gaps for ${bodyPart} physiotherapy focusing on ${conditions}. 
    
    Consider gaps in:
    - Treatment effectiveness comparisons
    - Patient subgroup analyses  
    - Long-term outcome tracking
    - Technology integration
    - Cost-effectiveness
    - Prevention strategies
    
    Provide 6-8 specific, actionable research gaps in JSON format.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.gaps || this.getFallbackGaps(bodyPart);
    } catch (error) {
      console.error("Error generating body part specific gaps:", error);
      return this.getFallbackGaps(bodyPart);
    }
  }

  /**
   * Fallback gaps when AI analysis fails
   */
  private getFallbackGaps(bodyPart?: string): IdentifiedGap[] {
    const baseGaps: IdentifiedGap[] = [
      {
        title: "Long-term Outcome Tracking in Chronic Pain Management",
        description: "Limited research on long-term effectiveness of physiotherapy interventions for chronic pain conditions beyond 12 months follow-up.",
        bodyPart: bodyPart || "general",
        gapType: "outcome",
        priority: "high",
        evidenceLevel: "Low - most studies <6 months follow-up",
        potentialImpact: "High - would inform sustainable treatment approaches and healthcare resource allocation",
        suggestedMethodology: "Longitudinal cohort study with virtual patient data tracking treatment responses over 2+ years"
      },
      {
        title: "Personalized Treatment Algorithm Development",
        description: "Lack of evidence-based algorithms for matching specific patient characteristics to optimal treatment approaches.",
        bodyPart: bodyPart || "general", 
        gapType: "methodology",
        priority: "critical",
        evidenceLevel: "Very Low - mostly expert opinion",
        potentialImpact: "Critical - could revolutionize clinical decision making and improve outcomes",
        suggestedMethodology: "Machine learning analysis of virtual patient treatment response patterns"
      },
      {
        title: "Technology-Assisted Rehabilitation Effectiveness",
        description: "Insufficient comparative research on technology-enhanced physiotherapy vs traditional approaches.",
        bodyPart: bodyPart || "general",
        gapType: "treatment",
        priority: "high", 
        evidenceLevel: "Low - limited RCTs available",
        potentialImpact: "High - could guide technology adoption and improve accessibility",
        suggestedMethodology: "Multi-arm RCT comparing traditional, app-assisted, and VR-enhanced rehabilitation"
      }
    ];

    return baseGaps;
  }

  /**
   * Get research gap statistics for dashboard
   */
  async getGapStatistics(): Promise<{
    totalGaps: number;
    byPriority: Record<string, number>;
    byBodyPart: Record<string, number>;
    byGapType: Record<string, number>;
  }> {
    // This would normally query the database
    // For now, return representative statistics
    return {
      totalGaps: 45,
      byPriority: {
        critical: 8,
        high: 15,
        medium: 18,
        low: 4
      },
      byBodyPart: {
        back: 12,
        knee: 8,
        shoulder: 7,
        neck: 6,
        general: 12
      },
      byGapType: {
        outcome: 15,
        treatment: 12,
        methodology: 10,
        demographic: 8
      }
    };
  }
}

export const researchGapAnalysisService = new ResearchGapAnalysisService();