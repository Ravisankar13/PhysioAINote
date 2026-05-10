import { POLITE_USER_AGENT, politeFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const WORKS = 'https://api.openalex.org/works';
// OpenAlex polite pool is 10 req/s; we keep ~5 req/s margin.
const OPENALEX_MIN_INTERVAL_MS = 220;

/** OpenAlex stores abstracts as an inverted index `{word: [positions...]}`.
 *  Reconstruct a plain string for the model to read. */
function reconstructAbstract(invIdx: Record<string, number[]> | null | undefined): string {
  if (!invIdx) return '';
  const tokens: string[] = [];
  for (const [word, positions] of Object.entries(invIdx)) {
    for (const p of positions) tokens[p] = word;
  }
  return tokens.filter(Boolean).join(' ').trim();
}

interface OAWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  open_access?: { is_oa?: boolean };
  primary_location?: {
    source?: { display_name?: string | null } | null;
    landing_page_url?: string | null;
  } | null;
  authorships?: Array<{ author?: { display_name?: string } | null }> | null;
}

export async function searchOpenAlex(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT };

  try {
    const url = `${WORKS}?search=${encodeURIComponent(query)}&per-page=${limit}&select=id,doi,title,display_name,publication_year,abstract_inverted_index,open_access,primary_location,authorships`;
    const r = await politeFetch('openalex', url, { headers, timeoutMs, minIntervalMs: OPENALEX_MIN_INTERVAL_MS });
    if (!r.ok) throw new Error(`openalex ${r.status}`);
    const j = await r.json() as { results?: OAWork[] };
    const results = j?.results ?? [];

    const papers: NormalizedPaper[] = [];
    for (const w of results) {
      const title = (w.title || w.display_name || '').trim();
      const abstract = reconstructAbstract(w.abstract_inverted_index);
      if (!title) continue;
      // OpenAlex IDs look like "https://openalex.org/W123…"
      const externalId = (w.id || '').replace('https://openalex.org/', '');
      const doi = w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//i, '') : null;
      const journal = w.primary_location?.source?.display_name ?? null;
      const url2 = w.primary_location?.landing_page_url
        || (doi ? `https://doi.org/${doi}` : `https://openalex.org/${externalId}`);
      const authors = (w.authorships || [])
        .map(a => a?.author?.display_name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      papers.push({
        source: 'openalex',
        externalId: externalId || (doi ?? title.slice(0, 40)),
        title,
        authors,
        year: typeof w.publication_year === 'number' ? w.publication_year : null,
        journal,
        abstract,
        doi,
        url: url2,
        openAccess: !!w.open_access?.is_oa,
      });
    }
    return { source: 'openalex', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][openalex] search failed: ${msg}`);
    return { source: 'openalex', papers: [], ok: false, error: msg };
  }
}
