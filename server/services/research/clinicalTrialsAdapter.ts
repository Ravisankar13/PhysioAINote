import { POLITE_USER_AGENT, politeFetch, type AdapterResult, type NormalizedPaper, type SearchOptions } from './types';

const STUDIES = 'https://clinicaltrials.gov/api/v2/studies';
const CT_MIN_INTERVAL_MS = 400;

interface CTInterventionModule {
  interventions?: Array<{ name?: string; type?: string }>;
}
interface CTStatusModule {
  overallStatus?: string;
  startDateStruct?: { date?: string };
  primaryCompletionDateStruct?: { date?: string };
  completionDateStruct?: { date?: string };
  lastUpdateSubmitDate?: string;
}
interface CTDesignModule {
  phases?: string[];
}
interface CTPrimaryOutcome {
  measure?: string;
  description?: string;
}
interface CTOutcomesModule {
  primaryOutcomes?: CTPrimaryOutcome[];
}
interface CTIdModule {
  nctId?: string;
  briefTitle?: string;
}
interface CTDescriptionModule {
  briefSummary?: string;
}
interface CTConditionsModule {
  conditions?: string[];
}
interface CTContactsLocationsModule {
  centralContacts?: Array<{ name?: string }>;
}
interface CTSponsorCollaboratorsModule {
  leadSponsor?: { name?: string };
}
interface CTStudy {
  protocolSection?: {
    identificationModule?: CTIdModule;
    statusModule?: CTStatusModule;
    descriptionModule?: CTDescriptionModule;
    conditionsModule?: CTConditionsModule;
    designModule?: CTDesignModule;
    armsInterventionsModule?: CTInterventionModule;
    outcomesModule?: CTOutcomesModule;
    sponsorCollaboratorsModule?: CTSponsorCollaboratorsModule;
    contactsLocationsModule?: CTContactsLocationsModule;
  };
}

function firstString(arr: Array<string | undefined> | undefined): string | null {
  if (!arr) return null;
  for (const x of arr) {
    if (x && x.trim()) return x.trim();
  }
  return null;
}

/** Statuses we consider "active" — currently underway or about to be. */
const ACTIVE_STATUSES = new Set([
  'RECRUITING',
  'ENROLLING_BY_INVITATION',
  'NOT_YET_RECRUITING',
  'ACTIVE_NOT_RECRUITING',
  'AVAILABLE',
]);

/** Statuses we consider "recent" — finished, but recently enough to still
 *  be relevant evidence. The 5-year recency window is enforced separately. */
const COMPLETED_STATUSES = new Set([
  'COMPLETED',
  'TERMINATED',
]);

const RECENT_YEARS_WINDOW = 5;

/** Pull a 4-digit year out of a CT.gov date string (formats are
 *  "YYYY-MM" or "YYYY-MM-DD" depending on field). Returns null if
 *  no year can be parsed. */
function yearFromDate(d: string | null | undefined): number | null {
  if (!d) return null;
  const m = /^(\d{4})/.exec(d.trim());
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

/** A study qualifies for the "Active & recent trials" sub-section iff
 *  it is currently active OR was completed/terminated within the last
 *  RECENT_YEARS_WINDOW years. Anything older or with an unknown status
 *  is dropped to keep the section clinically relevant. */
function isActiveOrRecent(status: string, sm: CTStatusModule | undefined, currentYear: number): boolean {
  if (ACTIVE_STATUSES.has(status)) return true;
  if (!COMPLETED_STATUSES.has(status)) return false;
  // Prefer primaryCompletionDate, fall back to completionDate, then last update.
  const yearCandidates = [
    yearFromDate(sm?.primaryCompletionDateStruct?.date),
    yearFromDate(sm?.completionDateStruct?.date),
    yearFromDate(sm?.lastUpdateSubmitDate),
  ].filter((y): y is number => y !== null);
  if (yearCandidates.length === 0) return false;
  const mostRecent = Math.max(...yearCandidates);
  return currentYear - mostRecent <= RECENT_YEARS_WINDOW;
}

export async function searchClinicalTrials(query: string, opts: SearchOptions): Promise<AdapterResult> {
  const limit = Math.max(1, Math.min(opts.limit, 25));
  const timeoutMs = opts.timeoutMs ?? 12000;
  const headers: Record<string, string> = { 'User-Agent': POLITE_USER_AGENT, 'Accept': 'application/json' };

  if (!query || !query.trim()) {
    return { source: 'clinicaltrials', papers: [], ok: true };
  }

  try {
    // The v2 API treats `query.cond` as a free-text condition search.
    // We restrict overallStatus to active/recent buckets via filter.overallStatus
    // (CT.gov v2 supports a comma-separated list) and sort by LastUpdatePostDate
    // descending so the freshest studies bubble to the top. We also fetch
    // ~3x the limit then post-filter for completed-but-recent (5y) studies,
    // because the API can't express "<= 5y old completion" on its own.
    const statusFilter = Array.from(ACTIVE_STATUSES)
      .concat(Array.from(COMPLETED_STATUSES))
      .join(',');
    const fetchSize = Math.min(25, limit * 3);
    const url = `${STUDIES}?query.cond=${encodeURIComponent(query)}`
      + `&filter.overallStatus=${statusFilter}`
      + `&sort=LastUpdatePostDate%3Adesc`
      + `&pageSize=${fetchSize}`;
    const r = await politeFetch('clinicaltrials', url, { headers, timeoutMs, minIntervalMs: CT_MIN_INTERVAL_MS });
    if (!r.ok) throw new Error(`clinicaltrials ${r.status}`);
    const j = await r.json() as { studies?: CTStudy[] };
    const studies = j?.studies ?? [];
    const currentYear = new Date().getFullYear();

    const papers: NormalizedPaper[] = [];
    for (const s of studies) {
      const ps = s.protocolSection;
      if (!ps) continue;
      const nct = ps.identificationModule?.nctId?.trim() || '';
      if (!nct) continue;
      const title = (ps.identificationModule?.briefTitle || '').trim();
      if (!title) continue;
      const status = (ps.statusModule?.overallStatus || '').trim() || 'UNKNOWN';
      // Final guard: drop anything that doesn't qualify as
      // active-or-recent. The API filter covers status, but the
      // recency window has to be enforced here.
      if (!isActiveOrRecent(status, ps.statusModule, currentYear)) continue;
      const phase = firstString(ps.designModule?.phases);
      const intervention = firstString((ps.armsInterventionsModule?.interventions || []).map(iv => iv?.name));
      const primaryOutcome = firstString((ps.outcomesModule?.primaryOutcomes || []).map(po => po?.measure));
      const sponsor = ps.sponsorCollaboratorsModule?.leadSponsor?.name?.trim() || '';
      const summary = (ps.descriptionModule?.briefSummary || '').replace(/\s+/g, ' ').trim();

      papers.push({
        source: 'clinicaltrials',
        externalId: nct,
        title,
        authors: sponsor ? [sponsor] : [],
        year: null,
        journal: 'ClinicalTrials.gov',
        abstract: summary,
        doi: null,
        url: `https://clinicaltrials.gov/study/${nct}`,
        openAccess: true,
        trialMetadata: {
          nct,
          status,
          phase,
          intervention,
          primaryOutcome,
        },
      });
      if (papers.length >= limit) break;
    }

    return { source: 'clinicaltrials', papers, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`[caseResearch][clinicaltrials] search failed: ${msg}`);
    return { source: 'clinicaltrials', papers: [], ok: false, error: msg };
  }
}
