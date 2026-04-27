/** Common normalized record returned by every research source adapter. */
export type Source =
  | 'pubmed'
  | 'openalex'
  | 'europepmc'
  | 'pedro'
  | 'semanticscholar'
  | 'crossref'
  | 'clinicaltrials';

export interface TrialMetadata {
  nct: string;
  status: string;
  phase: string | null;
  intervention: string | null;
  primaryOutcome: string | null;
}

export interface NormalizedPaper {
  source: Source;
  externalId: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  abstract: string;
  doi: string | null;
  url: string;
  openAccess: boolean;
  /** PEDro Score (0-10) — physiotherapy methodological-quality rating. Only
   *  populated by the PEDro adapter. */
  pedroScore?: number | null;
  /** Citation count — populated by Semantic Scholar; useful relevance signal. */
  citationCount?: number | null;
  /** Trial-specific metadata — populated only by the ClinicalTrials.gov
   *  adapter. Trials are split out of the citation pipeline downstream. */
  trialMetadata?: TrialMetadata | null;
}

export interface SearchOptions {
  /** Soft cap on records returned. Adapter is allowed to return fewer. */
  limit: number;
  /** Polite request budget — adapters should drop the search if exceeded. */
  timeoutMs?: number;
}

export interface AdapterResult {
  source: Source;
  papers: NormalizedPaper[];
  ok: boolean;
  error?: string;
}

export const POLITE_USER_AGENT =
  'PhysioGPT-CaseResearch/1.0 (clinical-decision-support; contact=research@physiogpt.app)';

export function timeoutFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** ─── Per-source polite throttling ─────────────────────────────
 *  We hit the same source multiple times across the tier ladder, so a
 *  per-source minimum interval (with a small jitter) keeps us under
 *  documented rate caps without an API key. Calls within ONE tier are
 *  still parallelized across DIFFERENT sources — this only serializes
 *  repeat calls to the SAME source. */
const lastHitAt = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function throttle(sourceKey: string, minIntervalMs: number, jitterMs = 80): Promise<void> {
  // Chain through any in-flight wait for this source so callers are
  // serialized in arrival order.
  const prev = inFlight.get(sourceKey) ?? Promise.resolve();
  let release!: () => void;
  const ticket = new Promise<void>(res => { release = res; });
  inFlight.set(sourceKey, prev.then(() => ticket));
  await prev;
  try {
    const last = lastHitAt.get(sourceKey) ?? 0;
    const now = Date.now();
    const wait = last + minIntervalMs - now;
    if (wait > 0) await sleep(wait + Math.floor(Math.random() * jitterMs));
    lastHitAt.set(sourceKey, Date.now());
  } finally {
    release();
  }
}

/** fetch() with timeout + a single 429/503 retry honoring Retry-After. */
export async function politeFetch(
  sourceKey: string,
  url: string,
  init: RequestInit & { timeoutMs?: number; minIntervalMs: number },
): Promise<Response> {
  const { minIntervalMs, ...fetchInit } = init;
  await throttle(sourceKey, minIntervalMs);
  let r = await timeoutFetch(url, fetchInit);
  if (r.status === 429 || r.status === 503) {
    const retryAfter = parseInt(r.headers.get('retry-after') || '', 10);
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter, 5) * 1000
      : 1500;
    console.warn(`[caseResearch][${sourceKey}] ${r.status}, backing off ${backoff}ms`);
    await sleep(backoff);
    await throttle(sourceKey, minIntervalMs);
    r = await timeoutFetch(url, fetchInit);
  }
  return r;
}

/** Cheap normalization for title-based dedupe across sources. */
export function normalizeTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 200);
}

/** Cheap normalization for DOI dedupe — strips URL prefix + lowercases. */
export function normalizeDoi(d: string | null | undefined): string | null {
  if (!d) return null;
  const cleaned = d
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();
  return cleaned || null;
}

// ---- Structured query + per-source serialization -----------------
//
// Each tier of the engine's ladder yields a StructuredQuery — a seed
// (canonical condition phrase + any synonyms to OR for that tier) plus
// a list of AND'd OR-groups (one per discriminating variable). The
// adapters then format this object into the dialect their API likes
// best, instead of all sources receiving the same generic boolean
// string.
// ------------------------------------------------------------------

export interface StructuredQuery {
  /** Phrases that form the OR'd seed group (canonical condition +
   *  optional broader synonyms). For most tiers this is a single
   *  phrase. */
  seedPhrases: string[];
  /** AND'd OR-groups. Each entry's phrases are OR'd together; groups
   *  are joined with AND. */
  groups: Array<{ label: string; phrases: string[] }>;
}

function quotePhrase(p: string): string {
  const t = p.trim().replace(/"/g, '');
  if (!t) return '';
  return /\s/.test(t) ? `"${t}"` : t;
}

/** PubMed: full boolean, with `[tiab]` field qualifier on every leaf
 *  phrase so we search title/abstract instead of all fields (which
 *  matches free-text and pulls in noise). */
export function serializeForPubMed(q: StructuredQuery): string {
  const seedGroup = q.seedPhrases
    .map(quotePhrase)
    .filter(Boolean)
    .map(p => `${p}[tiab]`);
  const groups: string[] = [];
  if (seedGroup.length > 0) {
    groups.push(seedGroup.length === 1 ? seedGroup[0] : `(${seedGroup.join(' OR ')})`);
  }
  for (const g of q.groups) {
    const ors = g.phrases.map(quotePhrase).filter(Boolean).map(p => `${p}[tiab]`);
    if (ors.length === 0) continue;
    groups.push(ors.length === 1 ? ors[0] : `(${ors.join(' OR ')})`);
  }
  return groups.join(' AND ');
}

/** Europe PMC: boolean form similar to PubMed but without field
 *  qualifiers (Europe PMC's relevance ranker handles title/abstract
 *  weighting itself). Quoted phrases are preserved as exact-match. */
export function serializeForEuropePmc(q: StructuredQuery): string {
  const seedGroup = q.seedPhrases.map(quotePhrase).filter(Boolean);
  const groups: string[] = [];
  if (seedGroup.length > 0) {
    groups.push(seedGroup.length === 1 ? seedGroup[0] : `(${seedGroup.join(' OR ')})`);
  }
  for (const g of q.groups) {
    const ors = g.phrases.map(quotePhrase).filter(Boolean);
    if (ors.length === 0) continue;
    groups.push(ors.length === 1 ? ors[0] : `(${ors.join(' OR ')})`);
  }
  return groups.join(' AND ');
}

/** OpenAlex (and any other relevance-only source): bag-of-phrases.
 *  Boolean operators degrade OpenAlex relevance ranking, so we just
 *  hand it the phrases (quoted to preserve multi-word units) and let
 *  its TF-IDF do the work. Truncated to 250 chars to stay under the
 *  search field's effective length. */
export function serializeForBag(q: StructuredQuery): string {
  const phrases: string[] = [];
  for (const p of q.seedPhrases) {
    const qp = quotePhrase(p); if (qp) phrases.push(qp);
  }
  for (const g of q.groups) {
    for (const p of g.phrases) {
      const qp = quotePhrase(p); if (qp) phrases.push(qp);
    }
  }
  const joined = Array.from(new Set(phrases)).join(' ');
  return joined.length > 250 ? joined.slice(0, 250).trim() : joined;
}

/** Plain-text query for ClinicalTrials.gov v2 `query.cond`. We strip
 *  surrounding quotes (the API tolerates either, but bare phrases
 *  return broader, more useful results) and join seed + groups with
 *  spaces. */
export function serializeForTrials(q: StructuredQuery): string {
  const parts: string[] = [];
  for (const p of q.seedPhrases) {
    const t = p.trim().replace(/"/g, '');
    if (t) parts.push(t);
  }
  for (const g of q.groups) {
    for (const p of g.phrases) {
      const t = p.trim().replace(/"/g, '');
      if (t) parts.push(t);
    }
  }
  const joined = Array.from(new Set(parts)).join(' ');
  return joined.length > 250 ? joined.slice(0, 250).trim() : joined;
}
