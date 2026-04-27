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
