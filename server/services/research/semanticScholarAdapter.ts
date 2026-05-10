import { POLITE_USER_AGENT, politeFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const SEARCH = 'https://api.semanticscholar.org/graph/v1/paper/search';
// Free tier is generous but rate-limited; ~700 ms between calls keeps
// us well under the documented unauthenticated quota.
const S2_MIN_INTERVAL_MS = 700;

interface S2Author { name?: string }
interface S2Paper {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  authors?: S2Author[];
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  externalIds?: { DOI?: string | null; PubMed?: string | null } | null;
  openAccessPdf?: { url?: string | null } | null;
  url?: string | null;
}

export async function searchSemanticScholar(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT };

  if (!query || !query.trim()) {
    return { source: 'semanticscholar', papers: [], ok: true };
  }

  try {
    const fields = 'title,abstract,authors,year,venue,externalIds,openAccessPdf,citationCount,url';
    const url = `${SEARCH}?query=${encodeURIComponent(query)}&limit=${limit}&fields=${encodeURIComponent(fields)}`;
    const r = await politeFetch('semanticscholar', url, { headers, timeoutMs, minIntervalMs: S2_MIN_INTERVAL_MS });
    if (!r.ok) throw new Error(`semanticscholar ${r.status}`);
    const j = await r.json() as { data?: S2Paper[] };
    const results = j?.data ?? [];

    const papers: NormalizedPaper[] = [];
    for (const p of results) {
      const title = (p.title || '').trim();
      if (!title) continue;
      const doi = p.externalIds?.DOI ? p.externalIds.DOI.trim() : null;
      const pdfUrl = p.openAccessPdf?.url || null;
      const externalId = (p.paperId || doi || title.slice(0, 40)).toString();
      const url2 = p.url
        || (doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${externalId}`);
      papers.push({
        source: 'semanticscholar',
        externalId,
        title,
        authors: (p.authors || []).map(a => (a?.name || '').trim()).filter(Boolean),
        year: typeof p.year === 'number' ? p.year : null,
        journal: p.venue || null,
        abstract: (p.abstract || '').replace(/\s+/g, ' ').trim(),
        doi,
        url: url2,
        openAccess: !!pdfUrl,
        citationCount: typeof p.citationCount === 'number' ? p.citationCount : null,
      });
    }

    return { source: 'semanticscholar', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][semanticscholar] search failed: ${msg}`);
    return { source: 'semanticscholar', papers: [], ok: false, error: msg };
  }
}
