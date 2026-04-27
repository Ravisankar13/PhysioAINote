import { POLITE_USER_AGENT, politeFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

// PEDro has no public JSON API. We scrape the public Advanced Search
// results page. Be conservative with the rate to stay polite — the
// site has no documented cap but it's a small academic project.
const PEDRO_MIN_INTERVAL_MS = 1500;

const ADVANCED_SEARCH = 'https://search.pedro.org.au/advanced-search/results';

/** Decode the few HTML entities we ever see in PEDro listings. Keeps
 *  the adapter dependency-free (no cheerio). */
function decode(s: string): string {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(s: string): string {
  return decode((s || '').replace(/<[^>]+>/g, ' '));
}

interface PedroRow {
  detailUrl: string | null;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  pedroScore: number | null;
  externalId: string;
}

/** Parse the PEDro search results table. The page's structure (as of
 *  2024-2026) groups each hit into 4 sibling <tr> rows: the heading,
 *  Method, Score, and a Source row. We don't depend on any specific
 *  CSS classes; we just walk row groups whose first cell is a link to
 *  /detail/?id=NNN. */
function parseResultsHtml(html: string): PedroRow[] {
  const rows: PedroRow[] = [];
  // Find each "result block" anchored on the detail link in the title row.
  // We look for an anchor like /advanced-search/detail/?id=NNN and then
  // collect a slice of the surrounding HTML to scan for fields.
  const detailRe = /<a[^>]+href=["']([^"']*\/detail\/[^"']*\?id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const matches: Array<{ url: string; id: string; titleHtml: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = detailRe.exec(html)) !== null) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    matches.push({ url: m[1], id: m[2], titleHtml: m[3], index: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const { url, id, titleHtml, index } = matches[i];
    const sliceEnd = i + 1 < matches.length ? matches[i + 1].index : Math.min(html.length, index + 6000);
    const block = html.slice(index, sliceEnd);
    const title = stripTags(titleHtml);
    if (!title) continue;

    // Authors row. PEDro typically writes "Last AB, Last CD (year)"
    // or "Last AB, Last CD" with the year right after.
    let authors: string[] = [];
    let year: number | null = null;
    const authorMatch = block.match(/<td[^>]*>\s*([A-Z][A-Za-z\s,.\-']+?)(?:\s*\((\d{4})\))?\s*<\/td>/);
    if (authorMatch) {
      const raw = stripTags(authorMatch[1]);
      authors = raw.split(/,\s*/).map(s => s.trim()).filter(Boolean).slice(0, 12);
      if (authorMatch[2]) year = parseInt(authorMatch[2], 10);
    }
    if (!year) {
      const ym = block.match(/\((\d{4})\)/);
      if (ym) year = parseInt(ym[1], 10);
    }

    // Journal — a "Source" row, e.g. "Phys Ther 2019 Mar;99(3):300-310".
    let journal: string | null = null;
    const sourceMatch = block.match(/Source[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (sourceMatch) {
      const raw = stripTags(sourceMatch[1]);
      // Trim trailing volume/page noise to keep the journal label tidy.
      journal = raw.split(/\s+\d{4}/)[0].trim() || raw;
    }

    // PEDro score — numeric, usually "Score: N/10" or appears after "score".
    let pedroScore: number | null = null;
    const scoreMatch = block.match(/score[^<>]*<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\s*<\/td>/i)
      || block.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    if (scoreMatch) {
      const n = parseFloat(scoreMatch[1]);
      if (Number.isFinite(n) && n >= 0 && n <= 10) pedroScore = n;
    }

    rows.push({
      detailUrl: url.startsWith('http') ? url : `https://search.pedro.org.au${url.startsWith('/') ? '' : '/'}${url}`,
      title,
      authors,
      year,
      journal,
      pedroScore,
      externalId: id,
    });
  }
  return rows;
}

export async function searchPedro(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = {
    'User-Agent': POLITE_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml',
  };

  if (!query || !query.trim()) {
    return { source: 'pedro', papers: [], ok: true };
  }

  try {
    // PEDro's advanced search accepts an `abstract_with_words` param for
    // free-text. Limit to the top N results via `count`.
    const url = `${ADVANCED_SEARCH}?abstract_with_words=${encodeURIComponent(query)}&count=${limit}`;
    const r = await politeFetch('pedro', url, { headers, timeoutMs, minIntervalMs: PEDRO_MIN_INTERVAL_MS });
    if (!r.ok) throw new Error(`pedro ${r.status}`);
    const html = await r.text();
    const rows = parseResultsHtml(html).slice(0, limit);

    const papers: NormalizedPaper[] = rows.map(row => ({
      source: 'pedro' as const,
      externalId: row.externalId,
      title: row.title,
      authors: row.authors,
      year: row.year,
      journal: row.journal,
      // PEDro listings don't include a usable abstract on the search
      // page — only the detail page does, which would require an
      // extra fetch per hit. Leave empty; the synthesizer down-weights
      // abstract-less records but still cites the title + score.
      abstract: '',
      doi: null,
      url: row.detailUrl || `https://search.pedro.org.au/advanced-search/detail/?id=${row.externalId}`,
      openAccess: false,
      pedroScore: row.pedroScore,
    }));

    return { source: 'pedro', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][pedro] search failed: ${msg}`);
    return { source: 'pedro', papers: [], ok: false, error: msg };
  }
}
