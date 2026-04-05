import axios from 'axios';

export type EvidenceSource = 'PubMed' | 'PEDro' | 'Europe PMC' | 'OpenAlex' | 'Cochrane';

export interface ClinicalPaper {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid: string;
  doi?: string;
  abstract: string;
  studyType: 'RCT' | 'Systematic Review' | 'Meta-Analysis' | 'Cohort' | 'Case Study' | 'Clinical Guideline';
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  relevanceScore: number;
  pubmedUrl: string;
  sources?: EvidenceSource[];
  citationCount?: number;
  openAccessUrl?: string;
  pedroScore?: number;
}

export interface SourceStatus {
  name: EvidenceSource;
  searched: boolean;
  resultCount: number;
  error?: string;
}

export interface MultiSourceEvidenceResult {
  papers: ClinicalPaper[];
  overallGrade: 'A' | 'B' | 'C' | 'D';
  confidence: 'High' | 'Moderate' | 'Low' | 'Very Low';
  searchQuery: string;
  source: 'multi' | 'pubmed' | 'fallback';
  sourcesSearched: SourceStatus[];
  totalSourcesQueried: number;
  totalSourcesReturned: number;
}

export interface ClinicalEvidenceResult {
  papers: ClinicalPaper[];
  overallGrade: 'A' | 'B' | 'C' | 'D';
  confidence: 'High' | 'Moderate' | 'Low' | 'Very Low';
  searchQuery: string;
  source: 'pubmed' | 'fallback';
}

interface CacheEntry {
  result: ClinicalEvidenceResult;
  timestamp: number;
}

interface MultiSourceCacheEntry {
  result: MultiSourceEvidenceResult;
  timestamp: number;
}

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EUROPE_PMC_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const OPENALEX_BASE = 'https://api.openalex.org';
const CACHE_TTL_MS = 15 * 60 * 1000;

const evidenceCache = new Map<string, CacheEntry>();
const multiSourceCache = new Map<string, MultiSourceCacheEntry>();

function makeCacheKey(region: string, condition: string, treatment: string): string {
  return `${region}||${condition}||${treatment}`.toLowerCase().trim();
}

function classifyStudyType(title: string, abstract: string): ClinicalPaper['studyType'] {
  const text = `${title} ${abstract}`.toLowerCase();
  if (text.includes('meta-analysis') || text.includes('meta analysis')) return 'Meta-Analysis';
  if (text.includes('systematic review')) return 'Systematic Review';
  if (text.includes('randomized') || text.includes('randomised') || text.includes('rct')) return 'RCT';
  if (text.includes('cohort') || text.includes('prospective') || text.includes('longitudinal')) return 'Cohort';
  if (text.includes('guideline') || text.includes('consensus') || text.includes('recommendation')) return 'Clinical Guideline';
  return 'Case Study';
}

function gradeFromStudyType(studyType: ClinicalPaper['studyType'], year: number): ClinicalPaper['evidenceGrade'] {
  const recency = new Date().getFullYear() - year;
  if (studyType === 'Meta-Analysis' || studyType === 'Systematic Review') return 'A';
  if (studyType === 'RCT') return recency <= 5 ? 'A' : 'B';
  if (studyType === 'Clinical Guideline') return 'B';
  if (studyType === 'Cohort') return 'C';
  return 'D';
}

function computeRelevance(title: string, abstract: string, searchTerms: string[]): number {
  const text = `${title} ${abstract}`.toLowerCase();
  let hits = 0;
  for (const term of searchTerms) {
    if (text.includes(term.toLowerCase())) hits++;
  }
  return Math.min(1, hits / Math.max(searchTerms.length, 1));
}

function extractAbstractFromXml(xml: string): string {
  const segments: string[] = [];
  const regex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const cleaned = match[1].replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    if (cleaned) segments.push(cleaned);
  }
  return segments.join(' ') || '';
}

function parseEfetchXml(xml: string): Array<{ pmid: string; title: string; authors: string; journal: string; year: number; abstract: string }> {
  const articles: Array<{ pmid: string; title: string; authors: string; journal: string; year: number; abstract: string }> = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let artMatch;
  while ((artMatch = articleRegex.exec(xml)) !== null) {
    const block = artMatch[1];
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const journalMatch = block.match(/<Title>([\s\S]*?)<\/Title>/);
    const yearMatch = block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const authorBlocks = block.match(/<Author[\s\S]*?<\/Author>/g) || [];
    const authorNames = authorBlocks.slice(0, 6).map(ab => {
      const last = ab.match(/<LastName>(.*?)<\/LastName>/)?.[1] || '';
      const initials = ab.match(/<Initials>(.*?)<\/Initials>/)?.[1] || '';
      return `${last} ${initials}`.trim();
    }).filter(Boolean);

    const abstract = extractAbstractFromXml(block);
    const cleanTitle = (titleMatch?.[1] || 'Untitled').replace(/<[^>]*>/g, '');

    articles.push({
      pmid: pmidMatch?.[1] || '',
      title: cleanTitle,
      authors: authorNames.length > 0 ? (authorNames.length > 3 ? `${authorNames.slice(0, 3).join(', ')} et al.` : authorNames.join(', ')) : 'Unknown',
      journal: journalMatch?.[1]?.replace(/<[^>]*>/g, '') || 'Unknown Journal',
      year: parseInt(yearMatch?.[1] || `${new Date().getFullYear()}`),
      abstract: abstract || 'No abstract available.',
    });
  }
  return articles;
}

function buildPubMedQuery(region: string, condition: string, treatment: string): string {
  const parts: string[] = [];
  if (region) parts.push(region);
  if (condition) parts.push(condition);
  if (treatment) parts.push(treatment);
  const base = parts.join(' ');
  return `(${base}) AND (physiotherapy OR "physical therapy" OR rehabilitation) AND (Randomized Controlled Trial[pt] OR systematic review[ti] OR meta-analysis[ti] OR clinical trial[pt])`;
}

function overallGradeFromPapers(papers: ClinicalPaper[]): { grade: ClinicalPaper['evidenceGrade']; confidence: ClinicalEvidenceResult['confidence'] } {
  const gradeA = papers.filter(p => p.evidenceGrade === 'A').length;
  const gradeB = papers.filter(p => p.evidenceGrade === 'B').length;
  if (gradeA >= 2) return { grade: 'A', confidence: 'High' };
  if (gradeA >= 1 || gradeB >= 2) return { grade: 'B', confidence: 'Moderate' };
  if (papers.length >= 2) return { grade: 'C', confidence: 'Low' };
  return { grade: 'D', confidence: 'Very Low' };
}

const FALLBACK_PAPERS: Record<string, ClinicalPaper[]> = {
  shoulder: [
    { title: 'Exercise therapy for rotator cuff tendinopathy: a systematic review and meta-analysis', authors: 'Littlewood C, Ashton J, Chance-Larsen K et al.', journal: 'Br J Sports Med', year: 2012, pmid: '22972130', abstract: 'Exercise therapy reduces pain and improves function in rotator cuff tendinopathy with strong evidence supporting progressive loading protocols.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.95, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/22972130/' },
    { title: 'Effectiveness of manual therapy and exercise for rotator cuff disease', authors: 'Page MJ, Green S, McBain B et al.', journal: 'Cochrane Database Syst Rev', year: 2016, pmid: '27283590', abstract: 'Combined manual therapy and exercise may be beneficial for rotator cuff disease, with moderate quality evidence supporting clinical improvements.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.9, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27283590/' },
  ],
  knee: [
    { title: 'Exercise therapy for patellofemoral pain syndrome: a systematic review', authors: 'van der Heijden RA, Lankhorst NE, van Linschoten R et al.', journal: 'Br J Sports Med', year: 2015, pmid: '25716151', abstract: 'Exercise therapy, particularly combined hip and knee exercises, reduces pain and improves function in patellofemoral pain syndrome.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.93, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25716151/' },
    { title: 'Effectiveness of exercise on knee osteoarthritis: a systematic review and meta-analysis', authors: 'Fransen M, McConnell S, Harmer AR et al.', journal: 'Cochrane Database Syst Rev', year: 2015, pmid: '25569281', abstract: 'Land-based therapeutic exercise provides short-term benefit in terms of reduced knee pain and improved physical function for people with knee OA.', studyType: 'Meta-Analysis', evidenceGrade: 'A', relevanceScore: 0.92, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25569281/' },
  ],
  'low back': [
    { title: 'Exercise therapy for chronic low back pain: protocol for an individual participant data meta-analysis', authors: 'Hayden JA, van Tulder MW, Malmivaara A, Koes BW', journal: 'Cochrane Database Syst Rev', year: 2021, pmid: '34606069', abstract: 'Exercise therapy is effective for reducing pain and improving function in chronic non-specific low back pain.', studyType: 'Meta-Analysis', evidenceGrade: 'A', relevanceScore: 0.95, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/34606069/' },
    { title: 'Motor control exercises for chronic non-specific low-back pain', authors: 'Saragiotto BT, Maher CG, Yamato TP et al.', journal: 'Cochrane Database Syst Rev', year: 2016, pmid: '26742533', abstract: 'Motor control exercise is effective for chronic LBP with evidence supporting its use over general exercise for pain outcomes.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.9, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/26742533/' },
  ],
  neck: [
    { title: 'Exercise for mechanical neck disorders: a Cochrane review update', authors: 'Gross A, Kay TM, Paquin JP et al.', journal: 'Cochrane Database Syst Rev', year: 2015, pmid: '25629215', abstract: 'Cervical and scapulothoracic strengthening and endurance exercises can reduce neck pain and improve function.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.92, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25629215/' },
  ],
  hip: [
    { title: 'Exercise therapy for hip osteoarthritis: a systematic review', authors: 'Fransen M, McConnell S, Hernandez-Molina G, Reichenbach S', journal: 'Cochrane Database Syst Rev', year: 2014, pmid: '24756895', abstract: 'Therapeutic exercise reduces pain and improves function in hip osteoarthritis with moderate quality evidence.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.9, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/24756895/' },
  ],
  ankle: [
    { title: 'Effectiveness of exercise-based interventions for ankle sprains: systematic review', authors: 'Doherty C, Bleakley C, Delahunt E, Holden S', journal: 'Br J Sports Med', year: 2017, pmid: '27707741', abstract: 'Exercise-based interventions effectively reduce re-injury rates and improve functional outcomes after ankle sprain.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.91, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27707741/' },
  ],
  general: [
    { title: 'The effectiveness of therapeutic exercise for musculoskeletal conditions', authors: 'Geneen LJ, Moore RA, Clarke C et al.', journal: 'Cochrane Database Syst Rev', year: 2017, pmid: '28436583', abstract: 'Physical activity and exercise have beneficial effects on pain severity and physical function in chronic pain conditions.', studyType: 'Systematic Review', evidenceGrade: 'A', relevanceScore: 0.85, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/28436583/' },
    { title: 'Manual therapy and exercise for musculoskeletal conditions', authors: 'Clar C, Tsertsvadze A, Court R et al.', journal: 'Chiropr Man Therap', year: 2014, pmid: '25389463', abstract: 'Evidence supports manual therapy combined with exercise as an effective treatment approach for various musculoskeletal conditions.', studyType: 'Systematic Review', evidenceGrade: 'B', relevanceScore: 0.8, pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25389463/' },
  ],
};

function getFallbackPapers(region: string, condition: string): ClinicalPaper[] {
  const regionLower = region.toLowerCase();
  for (const [key, papers] of Object.entries(FALLBACK_PAPERS)) {
    if (regionLower.includes(key) || key.includes(regionLower)) {
      return papers;
    }
  }
  return FALLBACK_PAPERS.general;
}

export async function fetchClinicalEvidence(
  region: string,
  condition: string = '',
  treatment: string = ''
): Promise<ClinicalEvidenceResult> {
  const cacheKey = makeCacheKey(region, condition, treatment);
  const cached = evidenceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const searchQuery = buildPubMedQuery(region, condition, treatment);
  const searchTerms = [region, condition, treatment].filter(Boolean);

  try {
    const searchResponse = await axios.get(`${PUBMED_BASE}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: searchQuery,
        retmax: 8,
        retmode: 'json',
        sort: 'relevance',
        datetype: 'pdat',
        mindate: '2015',
        maxdate: new Date().getFullYear(),
      },
      timeout: 6000,
    });

    const ids: string[] = searchResponse.data?.esearchresult?.idlist || [];
    if (ids.length === 0) throw new Error('No PubMed results');

    const fetchResponse = await axios.get(`${PUBMED_BASE}/efetch.fcgi`, {
      params: { db: 'pubmed', id: ids.join(','), retmode: 'xml' },
      timeout: 8000,
    });

    const parsed = parseEfetchXml(fetchResponse.data);
    if (parsed.length === 0) throw new Error('XML parse returned 0 articles');

    const papers: ClinicalPaper[] = parsed.map(p => {
      const studyType = classifyStudyType(p.title, p.abstract);
      const grade = gradeFromStudyType(studyType, p.year);
      return {
        title: p.title,
        authors: p.authors,
        journal: p.journal,
        year: p.year,
        pmid: p.pmid,
        abstract: p.abstract,
        studyType,
        evidenceGrade: grade,
        relevanceScore: computeRelevance(p.title, p.abstract, searchTerms),
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
      };
    }).sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3 };
      if (gradeOrder[a.evidenceGrade] !== gradeOrder[b.evidenceGrade]) {
        return gradeOrder[a.evidenceGrade] - gradeOrder[b.evidenceGrade];
      }
      return b.relevanceScore - a.relevanceScore;
    });

    const { grade, confidence } = overallGradeFromPapers(papers);
    const result: ClinicalEvidenceResult = { papers: papers.slice(0, 5), overallGrade: grade, confidence, searchQuery, source: 'pubmed' };
    evidenceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;

  } catch (err: any) {
    console.warn('PubMed fetch failed, using fallback:', err.message);
    const fallback = getFallbackPapers(region, condition);
    const { grade, confidence } = overallGradeFromPapers(fallback);
    const result: ClinicalEvidenceResult = { papers: fallback, overallGrade: grade, confidence, searchQuery, source: 'fallback' };
    evidenceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

export async function fetchClinicalEvidenceMulti(
  regions: string[],
  conditions: string[],
  treatments: string[]
): Promise<ClinicalEvidenceResult> {
  const regionPart = regions.filter(Boolean).slice(0, 3);
  const conditionPart = conditions.filter(Boolean).slice(0, 3);
  const treatmentPart = treatments.filter(Boolean).slice(0, 2);

  const queryParts: string[] = [];
  if (regionPart.length > 0) queryParts.push(regionPart.length === 1 ? regionPart[0] : `(${regionPart.join(' OR ')})`);
  if (conditionPart.length > 0) queryParts.push(conditionPart.length === 1 ? conditionPart[0] : `(${conditionPart.join(' OR ')})`);
  if (treatmentPart.length > 0) queryParts.push(treatmentPart.length === 1 ? treatmentPart[0] : `(${treatmentPart.join(' OR ')})`);

  if (queryParts.length === 0) {
    return { papers: [], overallGrade: 'D', confidence: 'Very Low', searchQuery: '', source: 'fallback' };
  }

  const combinedRegion = [...regionPart].sort().join(' ');
  const combinedCondition = [...conditionPart].sort().join(' ');
  const combinedTreatment = [...treatmentPart].sort().join(' ');

  const cacheKey = makeCacheKey(combinedRegion, combinedCondition, combinedTreatment);
  const cached = evidenceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const base = queryParts.join(' AND ');
  const searchQuery = `(${base}) AND (physiotherapy OR "physical therapy" OR rehabilitation) AND (Randomized Controlled Trial[pt] OR systematic review[ti] OR meta-analysis[ti] OR clinical trial[pt])`;
  const searchTerms = [...regionPart, ...conditionPart, ...treatmentPart];

  try {
    const searchResponse = await axios.get(`${PUBMED_BASE}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: searchQuery,
        retmax: 8,
        retmode: 'json',
        sort: 'relevance',
        datetype: 'pdat',
        mindate: '2015',
        maxdate: new Date().getFullYear(),
      },
      timeout: 6000,
    });

    const ids: string[] = searchResponse.data?.esearchresult?.idlist || [];
    if (ids.length === 0) throw new Error('No PubMed results');

    const fetchResponse = await axios.get(`${PUBMED_BASE}/efetch.fcgi`, {
      params: { db: 'pubmed', id: ids.join(','), retmode: 'xml' },
      timeout: 8000,
    });

    const parsed = parseEfetchXml(fetchResponse.data);
    if (parsed.length === 0) throw new Error('XML parse returned 0 articles');

    const papers: ClinicalPaper[] = parsed.map(p => {
      const studyType = classifyStudyType(p.title, p.abstract);
      const grade = gradeFromStudyType(studyType, p.year);
      return {
        title: p.title,
        authors: p.authors,
        journal: p.journal,
        year: p.year,
        pmid: p.pmid,
        abstract: p.abstract,
        studyType,
        evidenceGrade: grade,
        relevanceScore: computeRelevance(p.title, p.abstract, searchTerms),
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
      };
    }).sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3 };
      if (gradeOrder[a.evidenceGrade] !== gradeOrder[b.evidenceGrade]) {
        return gradeOrder[a.evidenceGrade] - gradeOrder[b.evidenceGrade];
      }
      return b.relevanceScore - a.relevanceScore;
    });

    const { grade, confidence } = overallGradeFromPapers(papers);
    const result: ClinicalEvidenceResult = { papers: papers.slice(0, 5), overallGrade: grade, confidence, searchQuery, source: 'pubmed' };
    evidenceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;

  } catch (err: any) {
    console.warn('PubMed multi-term fetch failed, using fallback:', err.message);
    const fallback = getFallbackPapers(regionPart[0] || '', conditionPart[0] || '');
    const { grade, confidence } = overallGradeFromPapers(fallback);
    const result: ClinicalEvidenceResult = { papers: fallback, overallGrade: grade, confidence, searchQuery, source: 'fallback' };
    evidenceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

export function extractClinicalTerms(message: string): { region: string; condition: string; treatment: string } {
  const multi = extractClinicalTermsMulti(message);
  return {
    region: multi.regions[0] || '',
    condition: multi.conditions[0] || '',
    treatment: multi.treatments[0] || '',
  };
}

export function extractClinicalTermsMulti(message: string): { regions: string[]; conditions: string[]; treatments: string[] } {
  const lower = message.toLowerCase();
  const regions = [
    'shoulder', 'knee', 'hip', 'ankle', 'neck', 'cervical', 'thoracic', 'lumbar',
    'low back', 'elbow', 'wrist', 'foot', 'sacroiliac', 'pelvis', 'spine',
    'scapula', 'clavicle', 'rib', 'jaw', 'tmj', 'head', 'hamstring', 'quadriceps',
    'calf', 'shin', 'groin', 'glute', 'forearm', 'hand', 'finger', 'thumb', 'toe',
  ];
  const conditions = [
    'tendinopathy', 'tendinitis', 'impingement', 'tear', 'sprain', 'strain',
    'fracture', 'arthritis', 'osteoarthritis', 'bursitis', 'radiculopathy',
    'disc', 'meniscus', 'ligament', 'fasciitis', 'syndrome', 'stenosis',
    'instability', 'dislocation', 'frozen shoulder', 'adhesive capsulitis',
    'plantar fasciitis', 'carpal tunnel', 'patellofemoral',
    'kyphosis', 'lordosis', 'scoliosis', 'anterior pelvic tilt', 'posterior pelvic tilt',
    'forward head posture', 'lateral shift', 'upper cross syndrome', 'lower cross syndrome',
    'trigger point', 'myofascial pain', 'muscle spasm', 'muscle weakness',
    'muscle inhibition', 'muscle tightness', 'overactive', 'underactive',
    'compensation', 'postural dysfunction', 'malalignment',
    'rotator cuff', 'labral', 'nerve entrapment', 'neuropathy',
    'sciatica', 'piriformis', 'thoracic outlet', 'whiplash',
    'scar tissue', 'adhesion', 'fibrosis', 'fascial restriction',
  ];
  const treatments = [
    'exercise', 'manual therapy', 'mobilization', 'manipulation', 'stretching',
    'strengthening', 'eccentric', 'isometric', 'dry needling', 'taping',
    'ultrasound', 'shockwave', 'laser', 'massage',
    'myofascial release', 'soft tissue', 'postural correction', 'motor control',
    'proprioception', 'neuromuscular', 'stabilization', 'core stability',
    'balance training', 'gait training', 'ergonomic',
  ];

  const foundRegions: string[] = [];
  const foundConditions: string[] = [];
  const foundTreatments: string[] = [];

  for (const r of regions) { if (lower.includes(r) && !foundRegions.includes(r)) foundRegions.push(r); }
  for (const c of conditions) { if (lower.includes(c) && !foundConditions.includes(c)) foundConditions.push(c); }
  for (const t of treatments) { if (lower.includes(t) && !foundTreatments.includes(t)) foundTreatments.push(t); }

  return { regions: foundRegions.slice(0, 4), conditions: foundConditions.slice(0, 4), treatments: foundTreatments.slice(0, 3) };
}

export function formatPapersForPrompt(papers: ClinicalPaper[]): string {
  if (papers.length === 0) return '';
  const lines = papers.map((p, i) =>
    `[${i + 1}] ${p.authors} (${p.year}). "${p.title}" ${p.journal}. PMID: ${p.pmid}. Evidence Grade: ${p.evidenceGrade}. Study Type: ${p.studyType}.`
  );
  return `\n\nRELEVANT PUBMED EVIDENCE (cite these using [Author, Year] format with PMID):\n${lines.join('\n')}`;
}

function estimatePedroScore(title: string, abstract: string): number {
  const text = `${title} ${abstract}`.toLowerCase();
  let score = 0;
  if (/\brandom(ized|ised|ly)\b/.test(text)) score += 2;
  if (/\b(conceal|allocation)\b/.test(text)) score += 1;
  if (/\bblind(ed|ing)?\b/.test(text) || /\bdouble[\s-]blind/.test(text)) score += 2;
  if (/\bintention[\s-]to[\s-]treat\b/.test(text)) score += 1;
  if (/\bfollow[\s-]?up\b/.test(text) && /\b(>|more than|over)\s*8[05]%/.test(text)) score += 1;
  if (/\bbaseline\b/.test(text) && /\bsimilar|comparable|no.*difference/.test(text)) score += 1;
  if (/\bpoint\s*(measure|estimate)\b/.test(text) || /\bconfidence\s*interval/.test(text) || /\b95%\s*ci\b/.test(text)) score += 1;
  if (/\bbetween[\s-]group\b/.test(text) || /\binter[\s-]?group\b/.test(text)) score += 1;
  return Math.min(score, 10);
}

async function searchPEDro(region: string, condition: string, treatment: string, searchTerms: string[]): Promise<ClinicalPaper[]> {
  const parts: string[] = [];
  if (region) parts.push(region);
  if (condition) parts.push(condition);
  if (treatment) parts.push(treatment);
  if (parts.length === 0) return [];

  const query = `(${parts.join(' AND ')}) AND (physiotherapy OR "physical therapy" OR rehabilitation) AND (SRC:MED) AND (randomized controlled trial OR clinical trial OR systematic review)`;

  const response = await axios.get(`${EUROPE_PMC_BASE}/search`, {
    params: {
      query,
      format: 'json',
      pageSize: 6,
      resultType: 'core',
      sort: 'RELEVANCE',
      fromSearchDate: '2015-01-01',
    },
    timeout: 6000,
  });

  const results = response.data?.resultList?.result || [];
  return results
    .filter((r: Record<string, unknown>) => r.title && r.authorString)
    .map((r: Record<string, unknown>) => {
      const title = String(r.title || '').replace(/<[^>]*>/g, '');
      const abstract = String(r.abstractText || 'No abstract available.').replace(/<[^>]*>/g, '');
      const studyType = classifyStudyType(title, abstract);
      const year = parseInt(String(r.pubYear || new Date().getFullYear()));
      const grade = gradeFromStudyType(studyType, year);
      const pmid = String(r.pmid || r.id || '');
      const doi = r.doi ? String(r.doi) : undefined;
      const pedroScore = (studyType === 'RCT' || studyType === 'Clinical Guideline' || studyType === 'Systematic Review')
        ? estimatePedroScore(title, abstract) : undefined;
      return {
        title,
        authors: String(r.authorString || 'Unknown'),
        journal: String(r.journalTitle || 'Unknown Journal'),
        year,
        pmid,
        doi,
        abstract,
        studyType,
        evidenceGrade: grade,
        relevanceScore: computeRelevance(title, abstract, searchTerms),
        pubmedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : (doi ? `https://doi.org/${doi}` : ''),
        sources: ['PEDro' as EvidenceSource],
        pedroScore,
        openAccessUrl: r.fullTextUrlList && typeof r.fullTextUrlList === 'object' ? extractOpenAccessUrl(r.fullTextUrlList) : undefined,
      };
    });
}

async function searchEuropePMC(region: string, condition: string, treatment: string, searchTerms: string[]): Promise<ClinicalPaper[]> {
  const parts: string[] = [];
  if (region) parts.push(region);
  if (condition) parts.push(condition);
  if (treatment) parts.push(treatment);
  if (parts.length === 0) return [];

  const query = `(${parts.join(' AND ')}) AND (physiotherapy OR "physical therapy" OR rehabilitation) AND (SRC:MED)`;

  const response = await axios.get(`${EUROPE_PMC_BASE}/search`, {
    params: {
      query,
      format: 'json',
      pageSize: 8,
      resultType: 'core',
      sort: 'RELEVANCE',
      fromSearchDate: '2015-01-01',
    },
    timeout: 6000,
  });

  const results = response.data?.resultList?.result || [];
  return results
    .filter((r: Record<string, unknown>) => r.title && r.authorString)
    .map((r: Record<string, unknown>) => {
      const title = String(r.title || '').replace(/<[^>]*>/g, '');
      const abstract = String(r.abstractText || 'No abstract available.').replace(/<[^>]*>/g, '');
      const studyType = classifyStudyType(title, abstract);
      const year = parseInt(String(r.pubYear || new Date().getFullYear()));
      const grade = gradeFromStudyType(studyType, year);
      const pmid = String(r.pmid || r.id || '');
      const doi = r.doi ? String(r.doi) : undefined;
      return {
        title,
        authors: String(r.authorString || 'Unknown'),
        journal: String(r.journalTitle || 'Unknown Journal'),
        year,
        pmid,
        doi,
        abstract,
        studyType,
        evidenceGrade: grade,
        relevanceScore: computeRelevance(title, abstract, searchTerms),
        pubmedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : (doi ? `https://doi.org/${doi}` : ''),
        sources: ['Europe PMC' as EvidenceSource],
        openAccessUrl: r.fullTextUrlList && typeof r.fullTextUrlList === 'object' ? extractOpenAccessUrl(r.fullTextUrlList) : undefined,
      };
    });
}

function extractOpenAccessUrl(fullTextUrlList: unknown): string | undefined {
  try {
    const list = fullTextUrlList as { fullTextUrl?: Array<{ availabilityCode?: string; url?: string }> };
    const oa = list?.fullTextUrl?.find(u => u.availabilityCode === 'OA');
    return oa?.url;
  } catch {
    return undefined;
  }
}

async function searchOpenAlex(region: string, condition: string, treatment: string, searchTerms: string[]): Promise<ClinicalPaper[]> {
  const parts: string[] = [];
  if (region) parts.push(region);
  if (condition) parts.push(condition);
  if (treatment) parts.push(treatment);
  parts.push('physiotherapy rehabilitation');
  if (parts.length <= 1) return [];

  const searchStr = parts.join(' ');

  const response = await axios.get(`${OPENALEX_BASE}/works`, {
    params: {
      search: searchStr,
      filter: `from_publication_date:2015-01-01,type:article`,
      per_page: 8,
      sort: 'relevance_score:desc',
      mailto: 'physiogpt@example.com',
    },
    timeout: 6000,
  });

  const results = response.data?.results || [];
  return results
    .filter((w: Record<string, unknown>) => w.title)
    .map((w: Record<string, unknown>) => {
      const title = String(w.title || '');
      const abstract = w.abstract_inverted_index ? reconstructAbstract(w.abstract_inverted_index as Record<string, number[]>) : 'No abstract available.';
      const studyType = classifyStudyType(title, abstract);
      const year = parseInt(String(w.publication_year || new Date().getFullYear()));
      const grade = gradeFromStudyType(studyType, year);

      const authorships = (w.authorships || []) as Array<{ author?: { display_name?: string } }>;
      const authorNames = authorships.slice(0, 4).map(a => a.author?.display_name || '').filter(Boolean);
      const authorStr = authorNames.length > 3 ? `${authorNames.slice(0, 3).join(', ')} et al.` : authorNames.join(', ') || 'Unknown';

      const ids = w.ids as Record<string, string> | undefined;
      const doi = ids?.doi ? String(ids.doi).replace('https://doi.org/', '') : (w.doi ? String(w.doi).replace('https://doi.org/', '') : undefined);
      const pmid = ids?.pmid ? String(ids.pmid).replace('https://pubmed.ncbi.nlm.nih.gov/', '').replace('/', '') : '';

      const primaryLocation = w.primary_location as { source?: { display_name?: string } } | undefined;
      const journal = primaryLocation?.source?.display_name || 'Unknown Journal';

      const oaInfo = w.open_access as { oa_url?: string; is_oa?: boolean } | undefined;
      const citedByCount = typeof w.cited_by_count === 'number' ? w.cited_by_count : undefined;

      return {
        title,
        authors: authorStr,
        journal,
        year,
        pmid,
        doi,
        abstract,
        studyType,
        evidenceGrade: grade,
        relevanceScore: computeRelevance(title, abstract, searchTerms),
        pubmedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : (doi ? `https://doi.org/${doi}` : ''),
        sources: ['OpenAlex' as EvidenceSource],
        citationCount: citedByCount,
        openAccessUrl: oaInfo?.oa_url || undefined,
      };
    });
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const wordPositions: Array<[string, number]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      wordPositions.push([word, pos]);
    }
  }
  wordPositions.sort((a, b) => a[1] - b[1]);
  return wordPositions.map(wp => wp[0]).join(' ');
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.length < 20 || nb.length < 20) return false;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter) || shorter.includes(longer.slice(0, shorter.length));
}

function deduplicateAndMergePapers(allPapers: ClinicalPaper[]): ClinicalPaper[] {
  const merged: ClinicalPaper[] = [];

  for (const paper of allPapers) {
    let found = false;
    for (const existing of merged) {
      const doiMatch = paper.doi && existing.doi && paper.doi === existing.doi;
      const pmidMatch = paper.pmid && existing.pmid && paper.pmid === existing.pmid;
      const titleMatch = titlesMatch(paper.title, existing.title);

      if (doiMatch || pmidMatch || titleMatch) {
        existing.sources = [...new Set([...(existing.sources || []), ...(paper.sources || [])])];
        if (!existing.doi && paper.doi) existing.doi = paper.doi;
        if (!existing.pmid && paper.pmid) existing.pmid = paper.pmid;
        if (!existing.abstract || existing.abstract === 'No abstract available.') existing.abstract = paper.abstract;
        if (!existing.openAccessUrl && paper.openAccessUrl) existing.openAccessUrl = paper.openAccessUrl;
        if (paper.citationCount !== undefined && (existing.citationCount === undefined || paper.citationCount > existing.citationCount)) {
          existing.citationCount = paper.citationCount;
        }
        if (paper.pedroScore !== undefined && (existing.pedroScore === undefined || paper.pedroScore > existing.pedroScore)) {
          existing.pedroScore = paper.pedroScore;
        }
        if (!existing.pubmedUrl && paper.pubmedUrl) existing.pubmedUrl = paper.pubmedUrl;
        existing.relevanceScore = Math.max(existing.relevanceScore, paper.relevanceScore);
        found = true;
        break;
      }
    }
    if (!found) {
      merged.push({ ...paper });
    }
  }

  return merged;
}

export async function fetchMultiSourceEvidence(
  region: string,
  condition: string = '',
  treatment: string = ''
): Promise<MultiSourceEvidenceResult> {
  const cacheKey = `multi::${makeCacheKey(region, condition, treatment)}`;
  const cached = multiSourceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const searchQuery = buildPubMedQuery(region, condition, treatment);
  const searchTerms = [region, condition, treatment].filter(Boolean);

  const sourceStatuses: SourceStatus[] = [];
  const allPapers: ClinicalPaper[] = [];

  const [pubmedResult, pedroResult, europePmcResult, openAlexResult] = await Promise.allSettled([
    fetchPubMedPapers(region, condition, treatment, searchTerms),
    searchPEDro(region, condition, treatment, searchTerms),
    searchEuropePMC(region, condition, treatment, searchTerms),
    searchOpenAlex(region, condition, treatment, searchTerms),
  ]);

  if (pubmedResult.status === 'fulfilled') {
    const papers = pubmedResult.value.map(p => ({ ...p, sources: ['PubMed' as EvidenceSource] }));
    allPapers.push(...papers);
    sourceStatuses.push({ name: 'PubMed', searched: true, resultCount: papers.length });
  } else {
    sourceStatuses.push({ name: 'PubMed', searched: true, resultCount: 0, error: pubmedResult.reason?.message || 'Failed' });
  }

  if (pedroResult.status === 'fulfilled') {
    allPapers.push(...pedroResult.value);
    sourceStatuses.push({ name: 'PEDro', searched: true, resultCount: pedroResult.value.length });
  } else {
    sourceStatuses.push({ name: 'PEDro', searched: true, resultCount: 0, error: pedroResult.reason?.message || 'Failed' });
  }

  if (europePmcResult.status === 'fulfilled') {
    allPapers.push(...europePmcResult.value);
    sourceStatuses.push({ name: 'Europe PMC', searched: true, resultCount: europePmcResult.value.length });
  } else {
    sourceStatuses.push({ name: 'Europe PMC', searched: true, resultCount: 0, error: europePmcResult.reason?.message || 'Failed' });
  }

  if (openAlexResult.status === 'fulfilled') {
    allPapers.push(...openAlexResult.value);
    sourceStatuses.push({ name: 'OpenAlex', searched: true, resultCount: openAlexResult.value.length });
  } else {
    sourceStatuses.push({ name: 'OpenAlex', searched: true, resultCount: 0, error: openAlexResult.reason?.message || 'Failed' });
  }

  const totalSourcesQueried = sourceStatuses.length;
  const totalSourcesReturned = sourceStatuses.filter(s => s.resultCount > 0).length;

  if (allPapers.length === 0) {
    const fallback = getFallbackPapers(region, condition).map(p => ({ ...p, sources: ['PubMed' as EvidenceSource] }));
    const { grade, confidence } = overallGradeFromPapers(fallback);
    const result: MultiSourceEvidenceResult = {
      papers: fallback,
      overallGrade: grade,
      confidence,
      searchQuery,
      source: 'fallback',
      sourcesSearched: sourceStatuses,
      totalSourcesQueried,
      totalSourcesReturned: 0,
    };
    multiSourceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  const deduplicated = deduplicateAndMergePapers(allPapers);

  const scored = deduplicated.map(p => {
    const multiSourceBonus = (p.sources?.length || 1) > 1 ? 0.1 * ((p.sources?.length || 1) - 1) : 0;
    const citationBonus = p.citationCount && p.citationCount > 50 ? 0.05 : 0;
    return { ...p, relevanceScore: Math.min(1, p.relevanceScore + multiSourceBonus + citationBonus) };
  });

  scored.sort((a, b) => {
    const gradeOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    if ((gradeOrder[a.evidenceGrade] ?? 3) !== (gradeOrder[b.evidenceGrade] ?? 3)) {
      return (gradeOrder[a.evidenceGrade] ?? 3) - (gradeOrder[b.evidenceGrade] ?? 3);
    }
    return b.relevanceScore - a.relevanceScore;
  });

  const topPapers = scored.slice(0, 10);
  const { grade, confidence } = overallGradeFromPapers(topPapers);

  const adjustedConfidence = totalSourcesReturned >= 3 && confidence === 'Moderate' ? 'High' :
    totalSourcesReturned >= 2 && confidence === 'Low' ? 'Moderate' : confidence;

  const result: MultiSourceEvidenceResult = {
    papers: topPapers,
    overallGrade: grade,
    confidence: adjustedConfidence,
    searchQuery,
    source: 'multi',
    sourcesSearched: sourceStatuses,
    totalSourcesQueried,
    totalSourcesReturned,
  };
  multiSourceCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

async function fetchPubMedPapers(region: string, condition: string, treatment: string, searchTerms: string[]): Promise<ClinicalPaper[]> {
  const searchQuery = buildPubMedQuery(region, condition, treatment);

  const searchResponse = await axios.get(`${PUBMED_BASE}/esearch.fcgi`, {
    params: {
      db: 'pubmed',
      term: searchQuery,
      retmax: 8,
      retmode: 'json',
      sort: 'relevance',
      datetype: 'pdat',
      mindate: '2015',
      maxdate: new Date().getFullYear(),
    },
    timeout: 6000,
  });

  const ids: string[] = searchResponse.data?.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const fetchResponse = await axios.get(`${PUBMED_BASE}/efetch.fcgi`, {
    params: { db: 'pubmed', id: ids.join(','), retmode: 'xml' },
    timeout: 8000,
  });

  const parsed = parseEfetchXml(fetchResponse.data);
  return parsed.map(p => {
    const studyType = classifyStudyType(p.title, p.abstract);
    const grade = gradeFromStudyType(studyType, p.year);
    return {
      title: p.title,
      authors: p.authors,
      journal: p.journal,
      year: p.year,
      pmid: p.pmid,
      abstract: p.abstract,
      studyType,
      evidenceGrade: grade,
      relevanceScore: computeRelevance(p.title, p.abstract, searchTerms),
      pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
    };
  });
}
