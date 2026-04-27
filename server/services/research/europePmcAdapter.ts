import { POLITE_USER_AGENT, timeoutFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const SEARCH = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

interface EPmcResult {
  id?: string;
  source?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  abstractText?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  isOpenAccess?: 'Y' | 'N';
}

export async function searchEuropePmc(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT };

  try {
    const url = `${SEARCH}?query=${encodeURIComponent(query)}&format=json&pageSize=${limit}&resultType=core`;
    const r = await timeoutFetch(url, { headers, timeoutMs });
    if (!r.ok) throw new Error(`epmc ${r.status}`);
    const j = await r.json() as { resultList?: { result?: EPmcResult[] } };
    const results = j?.resultList?.result ?? [];

    const papers: NormalizedPaper[] = [];
    for (const x of results) {
      const title = (x.title || '').trim();
      if (!title) continue;
      const id = x.id || x.pmid || x.doi || title.slice(0, 40);
      const sourceTag = (x.source || '').toUpperCase();
      const url2 =
        x.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${x.pmid}/`
        : x.doi ? `https://doi.org/${x.doi}`
        : `https://europepmc.org/article/${sourceTag || 'MED'}/${id}`;
      const yearNum = x.pubYear && /^\d{4}$/.test(x.pubYear) ? parseInt(x.pubYear, 10) : null;
      const authors = (x.authorString || '')
        .split(/,\s*/)
        .map(s => s.trim())
        .filter(Boolean);
      papers.push({
        source: 'europepmc',
        externalId: id,
        title,
        authors,
        year: yearNum,
        journal: x.journalTitle ?? null,
        abstract: (x.abstractText || '').replace(/\s+/g, ' ').trim(),
        doi: x.doi || null,
        url: url2,
        openAccess: x.isOpenAccess === 'Y',
      });
    }
    return { source: 'europepmc', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][europepmc] search failed: ${msg}`);
    return { source: 'europepmc', papers: [], ok: false, error: msg };
  }
}
