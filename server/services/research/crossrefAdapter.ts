import { POLITE_USER_AGENT, politeFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const WORKS = 'https://api.crossref.org/works';
// CrossRef's polite-pool wants a contact email in the UA (already
// present in POLITE_USER_AGENT). 500 ms keeps us comfortably under
// the suggested rate while still being snappy.
const CROSSREF_MIN_INTERVAL_MS = 500;

interface CRAuthor { given?: string; family?: string; name?: string }
interface CRWork {
  DOI?: string;
  title?: string[] | null;
  abstract?: string | null;
  author?: CRAuthor[] | null;
  issued?: { 'date-parts'?: number[][] } | null;
  'container-title'?: string[] | null;
  'short-container-title'?: string[] | null;
  URL?: string | null;
  type?: string | null;
}

function pickYear(w: CRWork): number | null {
  const dp = w.issued?.['date-parts'];
  if (!dp || dp.length === 0) return null;
  const y = dp[0]?.[0];
  return typeof y === 'number' && y > 1800 && y < 3000 ? y : null;
}

function pickAuthors(w: CRWork): string[] {
  if (!w.author) return [];
  return w.author
    .map(a => {
      if (a.name) return a.name.trim();
      const parts = [a.family || '', a.given || ''].map(s => s.trim()).filter(Boolean);
      return parts.join(' ').trim();
    })
    .filter(s => s.length > 0)
    .slice(0, 12);
}

function stripJatsTags(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchCrossRef(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT };

  if (!query || !query.trim()) {
    return { source: 'crossref', papers: [], ok: true };
  }

  try {
    const url = `${WORKS}?rows=${limit}&query=${encodeURIComponent(query)}&select=DOI,title,abstract,author,issued,container-title,short-container-title,URL,type`;
    const r = await politeFetch('crossref', url, { headers, timeoutMs, minIntervalMs: CROSSREF_MIN_INTERVAL_MS });
    if (!r.ok) throw new Error(`crossref ${r.status}`);
    const j = await r.json() as { message?: { items?: CRWork[] } };
    const items = j?.message?.items ?? [];

    const papers: NormalizedPaper[] = [];
    for (const w of items) {
      const title = ((w.title && w.title[0]) || '').trim();
      if (!title) continue;
      const doi = w.DOI ? w.DOI.trim() : null;
      const journal = (w['container-title'] && w['container-title'][0])
        || (w['short-container-title'] && w['short-container-title'][0])
        || null;
      papers.push({
        source: 'crossref',
        externalId: doi || title.slice(0, 40),
        title,
        authors: pickAuthors(w),
        year: pickYear(w),
        journal,
        abstract: stripJatsTags(w.abstract),
        doi,
        url: w.URL || (doi ? `https://doi.org/${doi}` : 'https://www.crossref.org/'),
        openAccess: false,
      });
    }

    return { source: 'crossref', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][crossref] search failed: ${msg}`);
    return { source: 'crossref', papers: [], ok: false, error: msg };
  }
}
