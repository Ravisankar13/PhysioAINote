import type { SlingResult } from './slingEngine';
import type {
  SlingHypothesis,
  SlingDrivenRecommendation,
  DriverAnalysisResult,
} from './slingDriverAnalysis';

export type PainStoryStepKind =
  | 'pain-here'
  | 'compromised-sling'
  | 'weak-link'
  | 'compensator'
  | 'overloaded-tissue'
  | 'why-it-hurts'
  | 'fix';

export interface PainStoryStep {
  kind: PainStoryStepKind;
  label: string;
  body: string;
  detail?: string;
}

export interface PainStoryline {
  slingId: SlingHypothesis['slingId'];
  slingLabel: string;
  slingColor: string;
  confidence: SlingHypothesis['confidence'];
  steps: PainStoryStep[];
  recommendations: SlingDrivenRecommendation[];
  /** Plain-language summary for screen readers / collapsed previews. */
  headline: string;
}

const SOFTENERS = {
  high: { lead: '', verb: 'is' },
  moderate: { lead: 'Likely ', verb: 'appears to be' },
  low: { lead: 'One possible explanation: ', verb: 'may be' },
} as const;

function describePainHere(
  hypothesis: SlingHypothesis,
  soft: typeof SOFTENERS[keyof typeof SOFTENERS],
): PainStoryStep | null {
  const labels = hypothesis.supportingMarkers.map(m => m.label).filter(Boolean);
  const regions = hypothesis.loadedRegions.filter(Boolean);
  const where = labels.length > 0
    ? labels.slice(0, 3).join(', ')
    : regions.length > 0
      ? regions.join(', ')
      : '';
  if (!where) return null;
  const more = labels.length > 3 ? ` +${labels.length - 3} more` : '';
  return {
    kind: 'pain-here',
    label: 'Pain here',
    body: `${soft.lead}${where}${more}`.trim(),
    detail: hypothesis.supportingMarkers.length > 0
      ? `${hypothesis.supportingMarkers.length} marker${hypothesis.supportingMarkers.length === 1 ? '' : 's'} pinned this region.`
      : undefined,
  };
}

function describeCompromisedSling(
  hypothesis: SlingHypothesis,
  soft: typeof SOFTENERS[keyof typeof SOFTENERS],
): PainStoryStep {
  return {
    kind: 'compromised-sling',
    label: 'Compromised sling',
    body: `${hypothesis.slingLabel} ${soft.verb} ${hypothesis.status}.`,
    detail: hypothesis.actualPattern,
  };
}

function describeWeakLink(sling: SlingResult | undefined): PainStoryStep | null {
  if (!sling) return null;
  const wl = sling.weakLinks[0];
  if (!wl) return null;
  return {
    kind: 'weak-link',
    label: 'Weak link',
    body: `${wl.muscle} is the weak link (activation ${wl.activationPct}%).`,
    detail: wl.reason,
  };
}

function describeCompensator(sling: SlingResult | undefined): PainStoryStep | null {
  if (!sling) return null;
  const fr = sling.forceReroutes[0];
  if (fr) {
    return {
      kind: 'compensator',
      label: 'Compensator picks it up',
      body: `${fr.toMuscle} is taking over (+${fr.reroutePct}% load from ${fr.fromMuscle}).`,
      detail: fr.clinical,
    };
  }
  const comp = sling.compensations[0];
  if (comp) {
    return {
      kind: 'compensator',
      label: 'Compensator picks it up',
      body: `${comp.compensatingSlingLabel} is compensating (${comp.severity}).`,
      detail: comp.mechanism,
    };
  }
  return null;
}

function describeOverloadedTissue(sling: SlingResult | undefined): PainStoryStep | null {
  if (!sling) return null;
  const area = sling.downstreamRiskArea?.trim();
  if (!area || sling.downstreamRisk === 'none') return null;
  return {
    kind: 'overloaded-tissue',
    label: 'Overloaded tissue',
    body: `${area} carries the leftover load (${sling.downstreamRisk} risk).`,
  };
}

function describeWhyItHurts(sling: SlingResult | undefined): PainStoryStep | null {
  if (!sling) return null;
  const consequence = sling.clinicalConsequences.find(c => c && c.trim().length > 0);
  if (consequence) {
    return {
      kind: 'why-it-hurts',
      label: 'Why it hurts',
      body: consequence.trim(),
      detail: sling.narrative && sling.narrative !== consequence ? sling.narrative : undefined,
    };
  }
  if (sling.narrative) {
    return {
      kind: 'why-it-hurts',
      label: 'Why it hurts',
      body: sling.narrative,
    };
  }
  return null;
}

function describeFix(recommendations: SlingDrivenRecommendation[]): PainStoryStep | null {
  if (recommendations.length === 0) return null;
  const top = recommendations.slice(0, 3);
  const verbs = top.map(r => r.name).join('; ');
  return {
    kind: 'fix',
    label: 'Fix',
    body: top.length === 1
      ? `Start here: ${verbs}.`
      : `${top.length} sling-driven options ready to add to the plan.`,
    detail: top.length > 1 ? verbs : undefined,
  };
}

function buildHeadline(
  hypothesis: SlingHypothesis,
  steps: PainStoryStep[],
): string {
  const painStep = steps.find(s => s.kind === 'pain-here');
  const where = painStep ? painStep.body : hypothesis.slingLabel;
  const why = steps.find(s => s.kind === 'why-it-hurts');
  return why ? `${where} → ${why.body}` : `${where} → ${hypothesis.actualPattern}`;
}

/**
 * Pure assembler — given a sling hypothesis (driver-analysis output) and the
 * matching forward sling result, returns the ordered "Why this hurts" story
 * with empty steps removed and language softened by confidence band. Never
 * throws; returns null when there is not enough data to tell any story.
 */
export function buildPainStorylineForHypothesis(
  hypothesis: SlingHypothesis,
  slingResult: SlingResult | undefined,
  allRecommendations: SlingDrivenRecommendation[],
): PainStoryline | null {
  const soft = SOFTENERS[hypothesis.confidence];
  const recs = allRecommendations.filter(r => r.slingId === hypothesis.slingId);

  const stepsRaw: Array<PainStoryStep | null> = [
    describePainHere(hypothesis, soft),
    describeCompromisedSling(hypothesis, soft),
    describeWeakLink(slingResult),
    describeCompensator(slingResult),
    describeOverloadedTissue(slingResult),
    describeWhyItHurts(slingResult),
    describeFix(recs),
  ];
  const steps = stepsRaw.filter((s): s is PainStoryStep => s !== null);

  if (steps.length < 2) return null;

  return {
    slingId: hypothesis.slingId,
    slingLabel: hypothesis.slingLabel,
    slingColor: hypothesis.color,
    confidence: hypothesis.confidence,
    steps,
    recommendations: recs.slice(0, 3),
    headline: buildHeadline(hypothesis, steps),
  };
}

/** Convenience: build the storyline for the top hypothesis in a driver result. */
export function buildTopPainStoryline(
  driver: DriverAnalysisResult | null | undefined,
  slings: SlingResult[] | undefined,
): PainStoryline | null {
  if (!driver?.topHypothesis) return null;
  const slingResult = (slings ?? []).find(s => s.slingId === driver.topHypothesis!.slingId);
  return buildPainStorylineForHypothesis(driver.topHypothesis, slingResult, driver.recommendations);
}

/** Build a storyline for a specific sling (used by the SlingCard "Why this
 *  hurts" affordance). Returns null when no hypothesis matches that sling
 *  in the current driver analysis. */
export function buildPainStorylineForSling(
  slingId: SlingHypothesis['slingId'],
  driver: DriverAnalysisResult | null | undefined,
  sling: SlingResult | undefined,
): PainStoryline | null {
  if (!driver) return null;
  const hypothesis = driver.hypotheses.find(h => h.slingId === slingId);
  if (!hypothesis) return null;
  return buildPainStorylineForHypothesis(hypothesis, sling, driver.recommendations);
}
