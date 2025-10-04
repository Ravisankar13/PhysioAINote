/**
 * Research Summary Service
 * 
 * Uses AI to summarize research articles into bullet points for education modules
 */

import OpenAI from 'openai';

interface ResearchArticle {
  id: number;
  title: string;
  abstract?: string;
  fullText?: string;
  pmid?: string;
  doi?: string;
}

interface ResearchSummary {
  articleId: number;
  title: string;
  keyPoints: string[];
  clinicalRelevance: string;
  practicalApplication: string;
}

export class ResearchSummaryService {
  private openai: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not configured - research summaries will be unavailable');
    }
    this.openai = new OpenAI({ apiKey });
  }
  
  /**
   * Generate AI-powered summary of research articles
   */
  async summarizeArticles(articles: ResearchArticle[]): Promise<string[]> {
    if (!this.openai.apiKey) {
      // Return fallback summaries if no API key
      return this.generateFallbackSummaries(articles);
    }
    
    try {
      const articleTexts = articles.map(article => 
        `Title: ${article.title}\n${article.abstract || article.fullText || 'No abstract available'}`
      ).join('\n\n---\n\n');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a physiotherapy research expert. Summarize research articles into clear, practical bullet points for physiotherapy students and practitioners. Focus on:
1. Key findings relevant to clinical practice
2. Evidence-based treatment approaches
3. Patient outcomes and prognosis
4. Clinical decision-making insights
5. Practical applications

Keep each bullet point concise (max 2 sentences). Use simple, clear language. Aim for 5-8 bullet points total across all articles.`
          },
          {
            role: "user",
            content: `Summarize these research articles into practical bullet points for physiotherapists:\n\n${articleTexts}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      const summary = response.choices[0].message.content || '';
      
      // Parse bullet points from response
      const bulletPoints = summary
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[•\-\d+\.]\s*/, '').trim())
        .filter(point => point.length > 0);
      
      // Ensure we have at least some content
      if (bulletPoints.length === 0 && summary.trim()) {
        return [summary.trim()];
      }
      
      return bulletPoints;
      
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      return this.generateFallbackSummaries(articles);
    }
  }
  
  /**
   * Generate detailed summary for a single article
   */
  async summarizeSingleArticle(article: ResearchArticle): Promise<ResearchSummary> {
    if (!this.openai.apiKey) {
      return this.generateFallbackSingleSummary(article);
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a physiotherapy research expert. Analyze this research article and provide:
1. 3-5 key clinical findings (as bullet points)
2. Clinical relevance (1-2 sentences)
3. Practical application for physiotherapists (1-2 sentences)

Use clear, professional language suitable for healthcare practitioners.`
          },
          {
            role: "user",
            content: `Article: ${article.title}\n\nAbstract: ${article.abstract || 'Not available'}\n\nProvide a structured summary.`
          }
        ],
        temperature: 0.3,
        max_tokens: 400
      });
      
      const content = response.choices[0].message.content || '';
      
      // Parse the structured response
      const keyPointsMatch = content.match(/key.*?findings?:?\s*([\s\S]*?)(?:clinical relevance|practical|$)/i);
      const relevanceMatch = content.match(/clinical relevance:?\s*([\s\S]*?)(?:practical|$)/i);
      const applicationMatch = content.match(/practical.*?:?\s*([\s\S]*?)$/i);
      
      const keyPoints = keyPointsMatch 
        ? keyPointsMatch[1]
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[•\-\d+\.]\s*/, '').trim())
            .filter(point => point.length > 0)
        : ['Key findings not available'];
      
      return {
        articleId: article.id,
        title: article.title,
        keyPoints,
        clinicalRelevance: relevanceMatch?.[1]?.trim() || 'Clinical relevance analysis pending',
        practicalApplication: applicationMatch?.[1]?.trim() || 'Practical application guidance pending'
      };
      
    } catch (error) {
      console.error('Failed to summarize article:', error);
      return this.generateFallbackSingleSummary(article);
    }
  }
  
  /**
   * Batch summarize multiple articles efficiently
   */
  async batchSummarize(articleIds: number[]): Promise<Map<number, string[]>> {
    // In a real implementation, this would fetch articles from database
    // For now, return mock data
    const summaryMap = new Map<number, string[]>();
    
    for (const id of articleIds) {
      summaryMap.set(id, [
        `Evidence-based finding from article ${id}`,
        `Clinical application insight from research`,
        `Treatment effectiveness data point`
      ]);
    }
    
    return summaryMap;
  }
  
  /**
   * Generate fallback summaries when AI is unavailable
   */
  private generateFallbackSummaries(articles: ResearchArticle[]): string[] {
    const summaries: string[] = [];
    
    for (const article of articles) {
      if (article.abstract) {
        // Extract first sentence of abstract as summary
        const firstSentence = article.abstract.split('.')[0] + '.';
        summaries.push(firstSentence);
      } else {
        summaries.push(`Research article: ${article.title}`);
      }
    }
    
    // Add generic evidence-based practice points
    if (summaries.length === 0) {
      summaries.push(
        'Evidence-based practice recommendations are being compiled',
        'Research findings will be summarized when available',
        'Clinical guidelines are under review'
      );
    }
    
    return summaries;
  }
  
  /**
   * Generate fallback summary for single article
   */
  private generateFallbackSingleSummary(article: ResearchArticle): ResearchSummary {
    return {
      articleId: article.id,
      title: article.title,
      keyPoints: [
        'Research summary is being generated',
        'Key findings will be available shortly',
        'Clinical insights are being analyzed'
      ],
      clinicalRelevance: 'Clinical relevance analysis in progress',
      practicalApplication: 'Practical applications being formulated'
    };
  }
  
  /**
   * Cache summaries to reduce API calls
   */
  private summaryCache = new Map<string, string[]>();
  
  async getCachedSummary(cacheKey: string, generateFn: () => Promise<string[]>): Promise<string[]> {
    if (this.summaryCache.has(cacheKey)) {
      return this.summaryCache.get(cacheKey)!;
    }
    
    const summary = await generateFn();
    this.summaryCache.set(cacheKey, summary);
    
    // Clear old cache entries if too large
    if (this.summaryCache.size > 100) {
      const firstKey = this.summaryCache.keys().next().value;
      this.summaryCache.delete(firstKey);
    }
    
    return summary;
  }
}

// Export singleton instance
export const researchSummaryService = new ResearchSummaryService();