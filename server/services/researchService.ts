import axios from 'axios';
import { db } from '../db';
import { researchArticles } from '@shared/schema';
import { eq, desc, like, or, and, gte } from 'drizzle-orm';

interface PubMedArticle {
  uid: string;
  title: string;
  authors: string[];
  source: string;
  pubdate: string;
  epubdate?: string;
  elocationid?: string;
  doi?: string;
  pmid: string;
  pmcid?: string;
  abstract?: string;
}

interface CrossRefWork {
  DOI: string;
  title: string[];
  author?: Array<{ given?: string; family?: string }>;
  published?: { 'date-parts': number[][] };
  publisher?: string;
  abstract?: string;
  'container-title'?: string[];
  score?: number;
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: Array<{ name: string }>;
  year?: number;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
}

export class ResearchService {
  private static readonly PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private static readonly CROSSREF_BASE_URL = 'https://api.crossref.org';
  private static readonly SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1';
  
  // Physiotherapy-specific search terms
  private static readonly PHYSIO_KEYWORDS = [
    'physiotherapy',
    'physical therapy',
    'rehabilitation',
    'musculoskeletal',
    'manual therapy',
    'exercise therapy',
    'movement disorders',
    'sports rehabilitation',
    'biomechanics',
    'gait analysis',
    'posture',
    'pain management'
  ];

  /**
   * Search PubMed for physiotherapy articles
   */
  static async searchPubMed(query: string, maxResults: number = 20): Promise<any[]> {
    try {
      // Build search query with physiotherapy focus
      const searchQuery = `(${query}) AND (physiotherapy OR "physical therapy" OR rehabilitation OR musculoskeletal)`;
      
      // Step 1: Search for article IDs
      const searchUrl = `${this.PUBMED_BASE_URL}/esearch.fcgi`;
      const searchParams = {
        db: 'pubmed',
        term: searchQuery,
        retmax: maxResults,
        retmode: 'json',
        sort: 'relevance',
        datetype: 'pdat',
        mindate: '2019', // Focus on recent research
        maxdate: new Date().getFullYear()
      };

      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      const articleIds = searchResponse.data.esearchresult?.idlist || [];

      if (articleIds.length === 0) {
        return [];
      }

      // Step 2: Fetch article summaries
      const summaryUrl = `${this.PUBMED_BASE_URL}/esummary.fcgi`;
      const summaryParams = {
        db: 'pubmed',
        id: articleIds.join(','),
        retmode: 'json'
      };

      const summaryResponse = await axios.get(summaryUrl, { params: summaryParams });
      const articles = summaryResponse.data.result;

      // Step 3: Fetch abstracts for each article
      const fetchUrl = `${this.PUBMED_BASE_URL}/efetch.fcgi`;
      const abstractPromises = articleIds.map(async (id: string) => {
        try {
          const abstractParams = {
            db: 'pubmed',
            id: id,
            retmode: 'xml',
            rettype: 'abstract'
          };
          const abstractResponse = await axios.get(fetchUrl, { params: abstractParams });
          return { id, abstract: this.extractAbstractFromXML(abstractResponse.data) };
        } catch (error) {
          console.error(`Error fetching abstract for PubMed ID ${id}:`, error);
          return { id, abstract: '' };
        }
      });

      const abstracts = await Promise.all(abstractPromises);
      const abstractMap = new Map(abstracts.map(a => [a.id, a.abstract]));

      // Transform to our format
      return articleIds.map((id: string) => {
        const article = articles[id];
        if (!article) return null;

        const authors = article.authors?.map((a: any) => a.name).join(', ') || 'Unknown';
        const journal = article.source || 'Unknown Journal';
        const year = article.pubdate?.split(' ')[0] || new Date().getFullYear();
        const abstract = abstractMap.get(id) || article.abstract || 'No abstract available';

        return {
          title: article.title,
          authors,
          journal,
          year: parseInt(year),
          abstract,
          doi: article.elocationid || null,
          pmid: id,
          source: 'PubMed',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          keyFindings: this.extractKeyFindings(abstract),
          clinicalApplications: this.generateClinicalApplications(article.title, abstract),
          tags: this.generateTags(article.title, abstract)
        };
      }).filter(Boolean);

    } catch (error) {
      console.error('Error searching PubMed:', error);
      return [];
    }
  }

  /**
   * Search CrossRef for physiotherapy articles
   */
  static async searchCrossRef(query: string, maxResults: number = 20): Promise<any[]> {
    try {
      const url = `${this.CROSSREF_BASE_URL}/works`;
      const params = {
        query: `${query} physiotherapy rehabilitation`,
        rows: maxResults,
        filter: 'from-pub-date:2019',
        select: 'DOI,title,author,published-print,publisher,abstract,container-title,score'
      };

      const response = await axios.get(url, { params });
      const works = response.data.message?.items || [];

      return works.map((work: CrossRefWork) => {
        const authors = work.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') || 'Unknown';
        const year = work.published?.['date-parts']?.[0]?.[0] || new Date().getFullYear();
        const journal = work['container-title']?.[0] || work.publisher || 'Unknown Journal';
        const abstract = work.abstract || 'No abstract available';

        return {
          title: work.title?.[0] || 'Untitled',
          authors,
          journal,
          year,
          abstract,
          doi: work.DOI,
          source: 'CrossRef',
          url: `https://doi.org/${work.DOI}`,
          score: work.score,
          keyFindings: this.extractKeyFindings(abstract),
          clinicalApplications: this.generateClinicalApplications(work.title?.[0], abstract),
          tags: this.generateTags(work.title?.[0], abstract)
        };
      });

    } catch (error) {
      console.error('Error searching CrossRef:', error);
      return [];
    }
  }

  /**
   * Search Semantic Scholar for physiotherapy articles
   */
  static async searchSemanticScholar(query: string, maxResults: number = 20): Promise<any[]> {
    try {
      const url = `${this.SEMANTIC_SCHOLAR_BASE_URL}/paper/search`;
      const params = {
        query: `${query} physiotherapy rehabilitation musculoskeletal`,
        limit: maxResults,
        fields: 'paperId,title,abstract,authors,year,venue,citationCount,influentialCitationCount,fieldsOfStudy',
        yearFilter: '2019-'
      };

      const response = await axios.get(url, { params });
      const papers = response.data.data || [];

      return papers.map((paper: SemanticScholarPaper) => {
        const authors = paper.authors?.map(a => a.name).join(', ') || 'Unknown';
        const abstract = paper.abstract || 'No abstract available';

        return {
          title: paper.title,
          authors,
          journal: paper.venue || 'Unknown Journal',
          year: paper.year || new Date().getFullYear(),
          abstract,
          paperId: paper.paperId,
          source: 'Semantic Scholar',
          url: `https://www.semanticscholar.org/paper/${paper.paperId}`,
          citationCount: paper.citationCount,
          influentialCitationCount: paper.influentialCitationCount,
          fieldsOfStudy: paper.fieldsOfStudy,
          keyFindings: this.extractKeyFindings(abstract),
          clinicalApplications: this.generateClinicalApplications(paper.title, abstract),
          tags: this.generateTags(paper.title, abstract)
        };
      });

    } catch (error) {
      console.error('Error searching Semantic Scholar:', error);
      return [];
    }
  }

  /**
   * Aggregate search across all databases
   */
  static async searchAllDatabases(query: string, maxResultsPerSource: number = 10): Promise<any[]> {
    try {
      // Search all databases in parallel
      const [pubmedResults, crossrefResults, semanticResults] = await Promise.all([
        this.searchPubMed(query, maxResultsPerSource),
        this.searchCrossRef(query, maxResultsPerSource),
        this.searchSemanticScholar(query, maxResultsPerSource)
      ]);

      // Combine and deduplicate results
      const allResults = [...pubmedResults, ...crossrefResults, ...semanticResults];
      
      // Deduplicate by title similarity
      const seen = new Set<string>();
      const uniqueResults = allResults.filter(article => {
        const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalizedTitle)) {
          return false;
        }
        seen.add(normalizedTitle);
        return true;
      });

      // Sort by relevance (using various signals)
      return uniqueResults.sort((a, b) => {
        // Prioritize articles with abstracts
        if (a.abstract !== 'No abstract available' && b.abstract === 'No abstract available') return -1;
        if (a.abstract === 'No abstract available' && b.abstract !== 'No abstract available') return 1;
        
        // Then by year (newer first)
        if (a.year !== b.year) return b.year - a.year;
        
        // Then by citation count if available
        if (a.citationCount && b.citationCount) return b.citationCount - a.citationCount;
        
        return 0;
      });

    } catch (error) {
      console.error('Error searching all databases:', error);
      return [];
    }
  }

  /**
   * Extract abstract from PubMed XML response
   */
  private static extractAbstractFromXML(xml: string): string {
    const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
    if (abstractMatch) {
      return abstractMatch[1]
        .replace(/<[^>]*>/g, '') // Remove any nested XML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    }
    return '';
  }

  /**
   * Extract key findings from abstract using pattern matching
   */
  private static extractKeyFindings(abstract: string): string[] {
    const findings: string[] = [];
    const abstractLower = abstract.toLowerCase();

    // Look for conclusion markers
    const conclusionMarkers = ['conclusion', 'findings', 'results', 'we found', 'demonstrated', 'showed'];
    for (const marker of conclusionMarkers) {
      const index = abstractLower.indexOf(marker);
      if (index !== -1) {
        const sentence = this.extractSentenceAt(abstract, index);
        if (sentence && sentence.length > 30) {
          findings.push(sentence);
          break;
        }
      }
    }

    // Look for statistical significance
    if (abstractLower.includes('p<0.0') || abstractLower.includes('significant')) {
      const sentence = this.extractSentenceAt(abstract, abstractLower.indexOf('significant'));
      if (sentence && !findings.includes(sentence)) {
        findings.push(sentence);
      }
    }

    return findings.slice(0, 3); // Return top 3 findings
  }

  /**
   * Generate clinical applications based on title and abstract
   */
  private static generateClinicalApplications(title: string, abstract: string): string[] {
    const applications: string[] = [];
    const text = `${title} ${abstract}`.toLowerCase();

    // Check for specific clinical contexts
    const clinicalContexts = [
      { keyword: 'treatment', application: 'Treatment protocol optimization' },
      { keyword: 'assessment', application: 'Clinical assessment methodology' },
      { keyword: 'exercise', application: 'Exercise prescription guidelines' },
      { keyword: 'pain', application: 'Pain management strategies' },
      { keyword: 'rehabilitation', application: 'Rehabilitation program design' },
      { keyword: 'prevention', application: 'Injury prevention protocols' },
      { keyword: 'diagnosis', application: 'Diagnostic accuracy improvement' },
      { keyword: 'outcome', application: 'Outcome measure selection' }
    ];

    for (const context of clinicalContexts) {
      if (text.includes(context.keyword)) {
        applications.push(context.application);
        if (applications.length >= 3) break;
      }
    }

    return applications;
  }

  /**
   * Generate relevant tags based on content
   */
  private static generateTags(title: string, abstract: string): string[] {
    const tags: string[] = [];
    const text = `${title} ${abstract}`.toLowerCase();

    // Body regions
    const bodyRegions = ['shoulder', 'knee', 'hip', 'spine', 'ankle', 'neck', 'elbow', 'wrist', 'back'];
    for (const region of bodyRegions) {
      if (text.includes(region)) {
        tags.push(region);
      }
    }

    // Conditions
    const conditions = ['arthritis', 'tendinopathy', 'fracture', 'sprain', 'strain', 'pain', 'injury'];
    for (const condition of conditions) {
      if (text.includes(condition)) {
        tags.push(condition);
      }
    }

    // Treatment types
    const treatments = ['manual therapy', 'exercise', 'mobilization', 'strengthening', 'stretching'];
    for (const treatment of treatments) {
      if (text.includes(treatment)) {
        tags.push(treatment);
      }
    }

    return [...new Set(tags)].slice(0, 5); // Return unique tags, max 5
  }

  /**
   * Extract sentence at given position
   */
  private static extractSentenceAt(text: string, position: number): string {
    // Find sentence boundaries
    const sentenceEnd = text.indexOf('.', position);
    if (sentenceEnd === -1) return '';

    // Find sentence start
    let sentenceStart = position;
    for (let i = position; i >= 0; i--) {
      if (text[i] === '.' && i < position - 1) {
        sentenceStart = i + 1;
        break;
      }
      if (i === 0) {
        sentenceStart = 0;
        break;
      }
    }

    return text.substring(sentenceStart, sentenceEnd + 1).trim();
  }

  /**
   * Save articles to database (optional caching)
   */
  static async saveArticles(articles: any[]): Promise<void> {
    try {
      for (const article of articles) {
        // Check if article already exists (by DOI)
        if (article.doi) {
          const existing = await db.select()
            .from(researchArticles)
            .where(eq(researchArticles.doi, article.doi))
            .limit(1);

          if (existing.length > 0) {
            continue; // Skip if already exists
          }
        }

        // Insert new article
        await db.insert(researchArticles).values({
          title: article.title,
          authors: article.authors,
          journal: article.journal,
          publicationDate: new Date(article.year, 0, 1), // Convert year to date
          doi: article.doi || `temp-${Date.now()}-${Math.random()}`, // Generate temporary DOI if missing
          abstract: article.abstract,
          url: article.url,
          bodyPart: 'general', // Default to general, can be updated later
          keyFindings: article.keyFindings?.join('\n') || null,
          clinicalRelevance: article.clinicalApplications?.join('\n') || null,
          methodology: null,
          aiAnalysisStatus: 'pending',
          qualityScore: article.score || article.citationCount || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error saving articles to database:', error);
    }
  }

  /**
   * Analyze a clinical case and generate treatment recommendations
   */
  static async analyzeClinicalCase(caseData: any): Promise<any> {
    try {
      // Extract key terms from the case for research matching
      const searchTerms = this.extractSearchTermsFromCase(caseData);
      
      // Search for relevant research
      const matchedArticles = await this.searchRelevantArticles(searchTerms);
      
      // Generate clinical analysis
      const analysis = {
        clinicalFeatures: this.extractClinicalFeatures(caseData),
        primaryDiagnosis: this.generatePrimaryDiagnosis(caseData),
        differentialDiagnoses: this.generateDifferentialDiagnoses(caseData),
        matchedResearch: matchedArticles.slice(0, 10), // Top 10 relevant articles
        treatmentPlan: {
          primary: this.generatePrimaryTreatments(caseData, matchedArticles),
          secondary: this.generateSecondaryTreatments(caseData),
          exercises: this.generateExerciseRecommendations(caseData),
          manualTherapy: this.generateManualTherapyRecommendations(caseData)
        },
        prognosis: this.generatePrognosis(caseData),
        redFlagsIdentified: this.identifyRedFlags(caseData),
        clinicalReasoning: this.generateClinicalReasoning(caseData),
        confidenceScore: this.calculateConfidenceScore(caseData)
      };
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing clinical case:', error);
      throw error;
    }
  }

  private static extractSearchTermsFromCase(caseData: any): string {
    const terms = [];
    
    // Add primary complaint terms
    if (caseData.primaryComplaint) {
      terms.push(caseData.primaryComplaint);
    }
    
    // Add key findings
    if (caseData.keyFindings) {
      terms.push(caseData.keyFindings);
    }
    
    // Add special tests
    if (caseData.specialTests) {
      terms.push(caseData.specialTests);
    }
    
    return terms.join(' ');
  }

  private static async searchRelevantArticles(searchTerms: string): Promise<any[]> {
    try {
      // Search the database for relevant articles
      const results = await db.select()
        .from(researchArticles)
        .where(
          or(
            like(researchArticles.title, `%${searchTerms}%`),
            like(researchArticles.abstract, `%${searchTerms}%`),
            like(researchArticles.keyFindings, `%${searchTerms}%`)
          )
        )
        .limit(20);
      
      return results;
    } catch (error) {
      console.error('Error searching relevant articles:', error);
      return [];
    }
  }

  private static extractClinicalFeatures(caseData: any): string[] {
    const features = [];
    
    if (caseData.primaryComplaint) features.push(`Primary complaint: ${caseData.primaryComplaint}`);
    if (caseData.symptomDuration) features.push(`Duration: ${caseData.symptomDuration}`);
    if (caseData.symptomSeverity) features.push(`Severity: ${caseData.symptomSeverity}`);
    if (caseData.movementImpairments) features.push(`Movement impairments: ${caseData.movementImpairments}`);
    
    return features;
  }

  private static generatePrimaryDiagnosis(caseData: any): string {
    // Simplified diagnosis generation based on key patterns
    const complaint = caseData.primaryComplaint?.toLowerCase() || '';
    const findings = caseData.keyFindings?.toLowerCase() || '';
    
    if (complaint.includes('shoulder') || findings.includes('rotator')) {
      return 'Rotator cuff tendinopathy';
    } else if (complaint.includes('back') || complaint.includes('lumbar')) {
      return 'Non-specific low back pain';
    } else if (complaint.includes('knee')) {
      return 'Patellofemoral pain syndrome';
    } else if (complaint.includes('neck')) {
      return 'Cervical spine dysfunction';
    }
    
    return 'Musculoskeletal dysfunction requiring further assessment';
  }

  private static generateDifferentialDiagnoses(caseData: any): string[] {
    const differentials = [];
    const complaint = caseData.primaryComplaint?.toLowerCase() || '';
    
    if (complaint.includes('shoulder')) {
      differentials.push('Adhesive capsulitis', 'Subacromial impingement', 'Biceps tendinopathy');
    } else if (complaint.includes('back')) {
      differentials.push('Facet joint dysfunction', 'Disc herniation', 'Sacroiliac joint dysfunction');
    } else if (complaint.includes('knee')) {
      differentials.push('Meniscal injury', 'Ligamentous injury', 'Osteoarthritis');
    }
    
    return differentials.slice(0, 3);
  }

  private static generatePrimaryTreatments(caseData: any, research: any[]): any[] {
    const treatments = [];
    
    // Manual therapy recommendation
    treatments.push({
      interventionType: 'Manual Therapy',
      description: 'Joint mobilization and soft tissue techniques',
      dosage: '10-15 minutes per session',
      frequency: '2-3 times per week',
      duration: '4-6 weeks',
      evidenceLevel: 'Level A',
      supportingStudies: research.slice(0, 2),
      expectedOutcomes: 'Pain reduction and improved range of motion',
      contraindications: this.identifyRedFlags(caseData)
    });
    
    // Exercise therapy recommendation
    treatments.push({
      interventionType: 'Exercise Therapy',
      description: 'Progressive strengthening and motor control exercises',
      dosage: '3 sets of 10-15 repetitions',
      frequency: 'Daily home program',
      duration: '6-8 weeks',
      evidenceLevel: 'Level A',
      supportingStudies: research.slice(2, 4),
      expectedOutcomes: 'Improved strength and functional capacity',
      contraindications: []
    });
    
    return treatments;
  }

  private static generateSecondaryTreatments(caseData: any): any[] {
    return [
      {
        interventionType: 'Modalities',
        description: 'Heat/cold therapy for symptom management',
        dosage: '15-20 minutes',
        frequency: 'As needed',
        duration: 'Throughout treatment',
        evidenceLevel: 'Level C',
        supportingStudies: [],
        expectedOutcomes: 'Temporary symptom relief',
        contraindications: []
      }
    ];
  }

  private static generateExerciseRecommendations(caseData: any): any[] {
    const exercises = [];
    const complaint = caseData.primaryComplaint?.toLowerCase() || '';
    
    if (complaint.includes('shoulder')) {
      exercises.push({
        interventionType: 'Strengthening',
        description: 'Rotator cuff strengthening with resistance bands',
        dosage: '3x15 repetitions',
        frequency: 'Daily',
        duration: '6 weeks',
        evidenceLevel: 'Level A',
        supportingStudies: [],
        expectedOutcomes: 'Improved shoulder stability and strength',
        contraindications: []
      });
    }
    
    exercises.push({
      interventionType: 'Range of Motion',
      description: 'Active and passive range of motion exercises',
      dosage: '10 repetitions, 3 times daily',
      frequency: 'Daily',
      duration: '4 weeks',
      evidenceLevel: 'Level B',
      supportingStudies: [],
      expectedOutcomes: 'Maintained or improved flexibility',
      contraindications: []
    });
    
    return exercises;
  }

  private static generateManualTherapyRecommendations(caseData: any): any[] {
    return [
      {
        interventionType: 'Mobilization',
        description: 'Grade III-IV joint mobilizations',
        dosage: '3-4 sets of 30 seconds',
        frequency: '2 times per week',
        duration: '4 weeks',
        evidenceLevel: 'Level B',
        supportingStudies: [],
        expectedOutcomes: 'Improved joint mobility',
        contraindications: []
      }
    ];
  }

  private static generatePrognosis(caseData: any): string {
    const duration = caseData.symptomDuration?.toLowerCase() || '';
    const severity = caseData.symptomSeverity || '';
    
    if (duration.includes('week') || duration.includes('days')) {
      return 'Good prognosis with expected recovery in 4-6 weeks with appropriate treatment';
    } else if (duration.includes('month')) {
      return 'Fair to good prognosis with expected recovery in 6-12 weeks with comprehensive treatment';
    }
    
    return 'Prognosis depends on patient compliance and response to treatment. Regular reassessment recommended.';
  }

  private static identifyRedFlags(caseData: any): string[] {
    const redFlags = [];
    const flags = caseData.redFlags?.toLowerCase() || '';
    const history = caseData.medicalHistory?.toLowerCase() || '';
    
    if (flags.includes('cancer') || history.includes('cancer')) {
      redFlags.push('History of cancer - requires medical screening');
    }
    if (flags.includes('fever') || flags.includes('weight loss')) {
      redFlags.push('Constitutional symptoms present');
    }
    if (flags.includes('trauma')) {
      redFlags.push('Recent trauma - consider imaging');
    }
    
    return redFlags;
  }

  private static generateClinicalReasoning(caseData: any): string {
    return `Based on the presentation of ${caseData.primaryComplaint || 'symptoms'} with duration of ${caseData.symptomDuration || 'unspecified'}, 
    the clinical picture suggests a mechanical/musculoskeletal origin. The examination findings of ${caseData.keyFindings || 'various impairments'} 
    support this hypothesis. Treatment approach focuses on addressing identified impairments while monitoring for any changes in presentation.`;
  }

  private static calculateConfidenceScore(caseData: any): number {
    let score = 0.5; // Base score
    
    // Increase confidence based on completeness of data
    if (caseData.primaryComplaint) score += 0.1;
    if (caseData.keyFindings) score += 0.1;
    if (caseData.specialTests) score += 0.1;
    if (caseData.movementImpairments) score += 0.1;
    if (caseData.symptomDuration) score += 0.05;
    if (caseData.symptomSeverity) score += 0.05;
    
    return Math.min(score, 0.95); // Cap at 95% confidence
  }
}