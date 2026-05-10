/**
 * Task #242 — Confidence-band uncertainty model for the recovery
 * simulator's natural-recovery and treatment-recovery curves.
 *
 * Out of scope: Monte Carlo, new input fields, new curve shapes.
 *
 * Inputs collapse a handful of *qualitative* signals into a single
 * normalised "uncertainty" score per week that the chart turns into a
 * translucent band around each center-line curve. The band tightens
 * as the clinician fills more context (animated by the React-side
 * `useAnimatedNumberArray` hook below).
 *
 * Signals used:
 *   1. patient-context completeness (how many structured fields are
 *      filled in vs the count of fields the form exposes)
 *   2. AI confidence — derived from the spread of the
 *      `overall_window_weeks` envelope on the `AINaturalTimeline`
 *      result (`(worst - best) / expected`); falls back to "no AI yet"
 *      when no result is loaded.
 *   3. source conflict — set when an AI result is mid-refresh, has
 *      errored, or its applied patient-context signature is out of
 *      sync with the current one.
 *   4. distance from the most recent clinician check-in. When no
 *      check-in has been recorded yet (Task #241 lands this stream
 *      separately) this collapses to a pure "future weeks grow more
 *      uncertain" multiplier, which is the default behaviour of any
 *      forward-projection.
 *
 * The output (`bandHalfWidthByWeek`) is in the same 0–100 chart unit
 * space as the curves themselves, so the chart consumes it without
 * additional scaling.
 */

import { useEffect, useRef, useState } from 'react';
import type { PatientFactors } from './patientFactorsEngine';
import type { AINaturalTimeline } from './recoverySimulationEngine';

/** Total number of patient-context fields the structured form
 *  exposes — kept in lockstep with `computePatientFactorsFilledCount`
 *  below (and with `countFactorOverrides` / `filledCount` in
 *  `PatientFactorsForm.tsx`) so the "filled ratio" here lines up with
 *  the badge the clinician sees. Currently 20 fields:
 *  menopausalStatus, currentMedications (any-of), bmiNumeric,
 *  timeSinceLastEpisodeMonths, priorSurgeryArea, keyImagingFindings,
 *  sleepHours, proteinIntake, dailyStepsBand, trainingAgeYears,
 *  kinesiophobia, painCatastrophizing, selfEfficacy, perceivedStress,
 *  socialSupport, sittingHoursPerDay, liftingFrequency,
 *  repetitiveTaskExposure, sportPosition, sportSurface. */
/** Total number of structured-form fields exposed by
 *  `PatientFactorsForm`. Bumped to 33 in Task #255 to account for the
 *  Natural Progression layer (chronicity stage, severity grade, pre-tx
 *  slope, 5 validated screeners, expanded meds aggregate, expectations,
 *  predicted adherence, flare pattern, concurrent involvement, demands
 *  ramp, prior tx response). */
export const PATIENT_CONTEXT_TOTAL_FIELDS = 33;

export interface UncertaintySignals {
  /** 0–1: share of patient-context fields that are filled in. */
  filledFactorRatio: number;
  /** 0–1: confidence in the loaded AI verdict (1 = high, 0 = none). */
  aiConfidence: number;
  /** 0–1: any active source-conflict signal (loading, error, sig
   *  mismatch). */
  sourceConflict: number;
  /** Weeks since the last recorded clinician check-in. `null` when
   *  no check-ins exist (Task #241 — currently the default). */
  weeksSinceLastCheckIn: number | null;
  /** Raw filled count, for display in the legend tooltip. */
  filledFactorCount: number;
  /** Raw total exposed by the form, for display in the legend
   *  tooltip. */
  totalFactorCount: number;
}

export interface BandComputeOptions {
  /** Total weeks rendered on the chart (drives the per-week growth
   *  multiplier). */
  totalWeeks: number;
  /** Floor on the half-width in chart units so even a fully-filled
   *  case still shows a visible band. */
  minHalfWidth?: number;
  /** Cap on the half-width so highly uncertain runs never paint
   *  the entire chart. */
  maxHalfWidth?: number;
}

const DEFAULT_MIN_HALF_WIDTH = 1.5;
const DEFAULT_MAX_HALF_WIDTH = 22;

/** Count how many of the 21 structured-form fields are filled in.
 *  Mirrors the keys/logic used by `filledCount` /
 *  `countFactorOverrides` in `PatientFactorsForm.tsx`. */
export function computePatientFactorsFilledCount(
  factors: PatientFactors | null | undefined,
): number {
  if (!factors) return 0;
  let n = 0;
  if (factors.menopausalStatus !== 'unknown') n++;
  const meds = factors.currentMedications;
  if (meds && (meds.nsaids || meds.oralCorticosteroids || meds.statins || meds.anticoagulants)) n++;
  if (factors.bmiNumeric !== null) n++;
  if (factors.timeSinceLastEpisodeMonths !== null) n++;
  if (factors.priorSurgeryArea) n++;
  if (factors.keyImagingFindings !== 'unknown') n++;
  if (factors.sleepHours !== null) n++;
  if (factors.proteinIntake !== 'unknown') n++;
  if (factors.dailyStepsBand !== 'unknown') n++;
  if (factors.trainingAgeYears !== null) n++;
  if (factors.kinesiophobia !== null) n++;
  if (factors.painCatastrophizing !== null) n++;
  if (factors.selfEfficacy !== null) n++;
  if (factors.perceivedStress !== null) n++;
  if (factors.socialSupport !== 'unknown') n++;
  if (factors.sittingHoursPerDay !== null) n++;
  if (factors.liftingFrequency !== 'unknown') n++;
  if (factors.repetitiveTaskExposure !== 'unknown') n++;
  if (factors.sportPosition && factors.sportPosition.trim()) n++;
  if (factors.sportSurface !== 'unknown') n++;
  // Task #255 — Natural Progression Layer fields. 13 additional
  // fields, each only counted when populated (no zero-fill).
  if (factors.weeksSinceOnset !== null) n++;
  if (factors.chronicityStage !== 'unknown') n++;
  if (factors.severityGradeFamily !== 'unknown' && factors.severityGradeValue !== null) n++;
  if (factors.preTxSlope !== 'unknown') n++;
  const s = factors.screenerScores;
  if (s) {
    if (s.startBack !== null) n++;
    if (s.orebro !== null) n++;
    if (s.fabq !== null) n++;
    if (s.pcs !== null) n++;
    if (s.osproYf !== null) n++;
  }
  const xm = factors.expandedMedications;
  if (xm && (xm.ssris || xm.glp1 || xm.aromataseInhibitors || xm.chronicOpioids || xm.ocp || xm.hrt)) n++;
  if (factors.recoveryExpectations !== 'unknown') n++;
  if (factors.predictedAdherence !== 'unknown') n++;
  const fp = factors.flarePattern;
  if (fp && (fp.frequency !== 'unknown' || fp.count12mo !== null || fp.lastFlareWeeks !== null)) n++;
  const ci = factors.concurrentInvolvement;
  if (ci && (ci.bilateral || ci.multiSite || ci.systemicCondition)) n++;
  const dr = factors.demandsRamp;
  if (dr && (dr.targetWeeks !== null || dr.intensityMultiplier !== null)) n++;
  if (factors.priorTxResponse !== 'unknown') n++;
  return n;
}

/** Derive AI confidence (0–1) from the spread of the natural-history
 *  envelope. A tight envelope (`worst - best` small relative to the
 *  expected window) implies the AI converged; a wide one signals
 *  ambiguity. Returns 0 when no AI verdict is loaded. */
export function computeAiConfidence(
  ai: AINaturalTimeline | null | undefined,
): number {
  if (!ai) return 0;
  const win = ai.overall_window_weeks;
  if (!win || !Number.isFinite(win.expected) || win.expected <= 0) {
    // Verdict exists but envelope absent — treat as moderate confidence.
    return 0.6;
  }
  const spread = Math.max(0, (win.worst ?? win.expected) - (win.best ?? win.expected));
  const relativeSpread = spread / Math.max(1, win.expected);
  // 0 spread → 1.0 confidence; spread = 1× expected → ~0.3 confidence.
  const conf = 1 - Math.min(1, relativeSpread * 0.7);
  return Math.max(0.1, Math.min(1, conf));
}

export interface AssembleSignalsArgs {
  patientFactors?: PatientFactors | null;
  /** When the parent already has a count (e.g. the dashboard receives
   *  it via props), pass it directly to skip the per-field walk. */
  patientFactorsFilledCount?: number | null;
  aiNaturalTimeline?: AINaturalTimeline | null;
  naturalTimelineLoading?: boolean;
  caseSpecificPlanLoading?: boolean;
  caseSpecificPlanError?: string | null;
  /** True when the AI's applied patient-context signature differs
   *  from the current one — i.e. the AI verdict is stale relative to
   *  the latest clinician input. */
  patientContextStale?: boolean;
  /** Weeks elapsed since the last actual session outcome. `null` if
   *  no check-ins exist yet. */
  weeksSinceLastCheckIn?: number | null;
}

/** Assemble the four uncertainty signals from the inputs the
 *  recovery dashboards already have on hand. All inputs are optional
 *  so the dashboards can supply whichever subset they have. */
export function assembleUncertaintySignals(args: AssembleSignalsArgs): UncertaintySignals {
  const filledCount = args.patientFactorsFilledCount != null
    ? Math.max(0, Math.min(PATIENT_CONTEXT_TOTAL_FIELDS, args.patientFactorsFilledCount))
    : computePatientFactorsFilledCount(args.patientFactors ?? null);
  const filledFactorRatio = filledCount / PATIENT_CONTEXT_TOTAL_FIELDS;
  const aiConfidence = computeAiConfidence(args.aiNaturalTimeline ?? null);
  const conflictPieces: number[] = [];
  if (args.naturalTimelineLoading) conflictPieces.push(0.6);
  if (args.caseSpecificPlanLoading) conflictPieces.push(0.6);
  if (args.caseSpecificPlanError) conflictPieces.push(0.8);
  if (args.patientContextStale) conflictPieces.push(0.9);
  const sourceConflict = conflictPieces.length === 0
    ? 0
    : Math.min(1, conflictPieces.reduce((a, b) => a + b, 0) / 1.5);
  return {
    filledFactorRatio,
    aiConfidence,
    sourceConflict,
    weeksSinceLastCheckIn: args.weeksSinceLastCheckIn ?? null,
    filledFactorCount: filledCount,
    totalFactorCount: PATIENT_CONTEXT_TOTAL_FIELDS,
  };
}

/** Collapse the four signals into a single "base uncertainty" 0–1
 *  score. Weighted so missing context dominates (it's the lever the
 *  clinician can act on directly). */
export function computeBaseUncertainty(s: UncertaintySignals): number {
  const fromContext = 0.35 * (1 - s.filledFactorRatio);
  const fromAi = 0.25 * (1 - s.aiConfidence);
  const fromConflict = 0.15 * s.sourceConflict;
  // No check-in data → contribute the full 0.10 (we have no anchor);
  // a fresh check-in (≤ 1 wk old) drops contribution to ~0.
  const checkInPenalty = s.weeksSinceLastCheckIn == null
    ? 0.10
    : Math.min(0.15, 0.02 * s.weeksSinceLastCheckIn);
  // 0.10 floor so even the best case shows a visible band.
  const base = 0.10 + fromContext + fromAi + fromConflict + checkInPenalty;
  return Math.max(0, Math.min(1, base));
}

/** Build the per-week half-width array (chart-unit space) the chart
 *  uses to draw the band. Future weeks get progressively wider bands
 *  because forward projections compound uncertainty. */
export function computeBandHalfWidthByWeek(
  signals: UncertaintySignals,
  opts: BandComputeOptions,
): number[] {
  const totalWeeks = Math.max(1, opts.totalWeeks);
  const minH = opts.minHalfWidth ?? DEFAULT_MIN_HALF_WIDTH;
  const maxH = opts.maxHalfWidth ?? DEFAULT_MAX_HALF_WIDTH;
  const base = computeBaseUncertainty(signals);
  const baseHalfWidth = base * 28; // 0–28 chart units before week growth.
  const out: number[] = [];
  // +1 because curves are usually [0..totalWeeks] inclusive.
  for (let w = 0; w <= totalWeeks; w++) {
    const futureMul = 1 + 0.6 * (w / totalWeeks);
    const h = baseHalfWidth * futureMul;
    out.push(Math.max(minH, Math.min(maxH, h)));
  }
  return out;
}

/** Convenience: classify the assembled uncertainty into a short
 *  label the legend can show. Thresholds picked so a fully-filled,
 *  fresh-AI case lands on "Tight", a default case lands on
 *  "Moderate", and an empty/stale one lands on "Wide". */
export function describeUncertainty(signals: UncertaintySignals): {
  band: 'Tight' | 'Moderate' | 'Wide';
  color: string;
} {
  const base = computeBaseUncertainty(signals);
  if (base < 0.30) return { band: 'Tight', color: '#22c55e' };
  if (base < 0.55) return { band: 'Moderate', color: '#f59e0b' };
  return { band: 'Wide', color: '#ef4444' };
}

/** React hook that smoothly interpolates an array of numbers from
 *  whatever it currently shows to a new target, over `durationMs`,
 *  using requestAnimationFrame. Lets the band visibly *tighten* as
 *  the clinician fills more context instead of snapping. */
export function useAnimatedNumberArray(
  target: number[] | null | undefined,
  durationMs = 450,
): number[] {
  const [current, setCurrent] = useState<number[]>(() => target ? target.slice() : []);
  const fromRef = useRef<number[]>(target ? target.slice() : []);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<number[] | null | undefined>(target);

  useEffect(() => {
    targetRef.current = target;
    if (!target) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setCurrent([]);
      fromRef.current = [];
      return;
    }
    // Snap when the array length changes — interpolation between
    // mismatched-length arrays is meaningless and visually noisy.
    if (fromRef.current.length !== target.length) {
      fromRef.current = target.slice();
      setCurrent(target.slice());
      return;
    }
    fromRef.current = current.slice();
    startRef.current = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic for a satisfying tighten.
      const eased = 1 - Math.pow(1 - t, 3);
      const tgt = targetRef.current;
      if (!tgt) return;
      const from = fromRef.current;
      const next: number[] = new Array(tgt.length);
      for (let i = 0; i < tgt.length; i++) {
        const a = from[i] ?? tgt[i];
        next[i] = a + (tgt[i] - a) * eased;
      }
      setCurrent(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(target), durationMs]);

  return current;
}
