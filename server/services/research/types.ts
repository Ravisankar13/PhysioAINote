/** Common normalized record returned by every research source adapter. */
export interface NormalizedPaper {
  source: 'pubmed' | 'openalex' | 'europepmc';
  externalId: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  abstract: string;
  doi: string | null;
  url: string;
  openAccess: boolean;
}

export interface SearchOptions {
  /** Soft cap on records returned. Adapter is allowed to return fewer. */
  limit: number;
  /** Polite request budget — adapters should drop the search if exceeded. */
  timeoutMs?: number;
}

export interface AdapterResult {
  source: 'pubmed' | 'openalex' | 'europepmc';
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
