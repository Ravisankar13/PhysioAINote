import { POLITE_USER_AGENT, timeoutFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

/** Strip XML tags and decode the few entities we ever see in PubMed
 *  abstracts. Keeps things dependency-free. */
function stripXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull the inner XML for the FIRST occurrence of a tag from a chunk. */
function firstTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}
function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

interface ParsedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
}

function parseEfetchXml(xml: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const blocks = allTags(xml, 'PubmedArticle');
  for (const block of blocks) {
    const pmid = stripXml(firstTag(block, 'PMID') || '');
    if (!pmid) continue;
    const title = stripXml(firstTag(block, 'ArticleTitle') || '');
    const abstractParts = allTags(firstTag(block, 'Abstract') || '', 'AbstractText');
    const abstract = stripXml(abstractParts.join(' '));
    const journal = stripXml(firstTag(block, 'Title') || firstTag(block, 'ISOAbbreviation') || '');
    const yearStr = stripXml(firstTag(block, 'Year') || '');
    const year = /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : null;
    const authorBlocks = allTags(firstTag(block, 'AuthorList') || '', 'Author');
    const authors: string[] = [];
    for (const ab of authorBlocks) {
      const last = stripXml(firstTag(ab, 'LastName') || '');
      const initials = stripXml(firstTag(ab, 'Initials') || '');
      const collective = stripXml(firstTag(ab, 'CollectiveName') || '');
      if (collective) authors.push(collective);
      else if (last) authors.push(initials ? `${last} ${initials}` : last);
    }
    let doi: string | null = null;
    const articleIds = allTags(block, 'ArticleId');
    for (const aid of articleIds) {
      if (/IdType="doi"/i.test(aid)) {
        doi = stripXml(aid);
        break;
      }
    }
    articles.push({ pmid, title, abstract, authors, year, journal, doi });
  }
  return articles;
}

export async function searchPubMed(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT };

  try {
    const esearchUrl = `${ESEARCH}?db=pubmed&retmode=json&retmax=${limit}&sort=relevance&term=${encodeURIComponent(query)}`;
    const r = await timeoutFetch(esearchUrl, { headers, timeoutMs });
    if (!r.ok) throw new Error(`esearch ${r.status}`);
    const j = await r.json() as { esearchresult?: { idlist?: string[] } };
    const ids = j?.esearchresult?.idlist ?? [];
    if (ids.length === 0) {
      return { source: 'pubmed', papers: [], ok: true };
    }

    const efetchUrl = `${EFETCH}?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(',')}`;
    const r2 = await timeoutFetch(efetchUrl, { headers, timeoutMs });
    if (!r2.ok) throw new Error(`efetch ${r2.status}`);
    const xml = await r2.text();
    const parsed = parseEfetchXml(xml);

    const papers: NormalizedPaper[] = parsed
      .filter(p => p.title && (p.abstract || p.title.length > 20))
      .map(p => ({
        source: 'pubmed' as const,
        externalId: p.pmid,
        title: p.title,
        authors: p.authors,
        year: p.year,
        journal: p.journal,
        abstract: p.abstract,
        doi: p.doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
        openAccess: false,
      }));

    return { source: 'pubmed', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][pubmed] search failed: ${msg}`);
    return { source: 'pubmed', papers: [], ok: false, error: msg };
  }
}
