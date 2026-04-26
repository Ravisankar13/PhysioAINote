/**
 * Task #255 — Natural Progression Engine.
 *
 * Composes the diagnosis-level natural-history prior (from
 * `naturalHistoryPriors.ts`) with patient-specific shifters (chronicity
 * stage, severity grade, pre-treatment slope, validated screener
 * buckets, expanded meds, expectations, predicted adherence, flare
 * pattern, concurrent/systemic involvement, demands ramp, prior tx
 * response) and emits:
 *
 *   1. A baseline "do nothing" recovery curve (per-week 0–1 fractions).
 *   2. A list of shifter contributions (each labelled, directional, %).
 *   3. Per-week multipliers the simulator uses to anchor its
 *      capacity / function curves to the prior.
 *   4. A residual-deficit ceiling and chronification probability the
 *      scenario branching consumes.
 *
 * All math is transparent: every shifter exposes its individual
 * contribution so the dashboard's "Why this curve" panel can render a
 * per-row breakdown.
 *
 * Graceful fallback: if the condition isn't in the prior catalog, the
 * engine returns the generic fallback prior with empty shifters; if
 * specific patient fields are missing, the corresponding shifters are
 * simply omitted (no zero-fill / no fake confidence).
 */

import {
  type PatientFactors,
  type ChronicityStage,
  type PreTxSlope,
  type RecoveryExpectations,
  type PredictedAdherence,
  type SeverityGradeFamily,
  type PriorTxResponse,
} from "./patientFactorsEngine";
import {
  type NaturalHistoryPrior,
  type PriorLookupArgs,
  GENERIC_FALLBACK_PRIOR,
  lookupNaturalHistoryPrior,
  priorRecoveryCurve,
} from "./naturalHistoryPriors";

export type ShifterDirection = "helping" | "hurting" | "informational";

export interface NaturalProgressionShifter {
  /** Stable id for testing / dedup. */
  id: string;
  /** Short human label. */
  label: string;
  /** What this shifter is doing to the curve. */
  effect: string;
  /** "+9%" / "−12%" — the % change applied to the per-week slope. */
  contributionPercent: number;
  direction: ShifterDirection;
  /** Raw value (e.g. screener score, expectations bucket) for tooltip. */
  value: string | number | null;
}

export interface NaturalProgressionResult {
  /** The matched prior (or `GENERIC_FALLBACK_PRIOR`). */
  prior: NaturalHistoryPrior;
  /** True when the matched prior is the literature-derived one for
   *  this condition; false when the engine fell back to generic. */
  priorMatched: boolean;
  /** Per-week recovery fractions (0–1) on the prior curve, *before*
   *  patient shifters. Length = totalWeeks + 1. */
  baseCurve: number[];
  /** Per-week shifter-adjusted recovery fractions (0–1). */
  adjustedCurve: number[];
  /** Per-week multipliers the simulator uses to scale capacity gain
   *  inside `simulateBranch` (1.0 = neutral). Length = totalWeeks + 1. */
  perWeekMultipliers: number[];
  /** Residual deficit ceiling after applying shifters (0–1). */
  ceiling: number;
  /** Chronification probability after applying shifters (0–1). */
  chronificationProbability: number;
  /** Plateau probability after applying shifters (0–1). */
  plateauProbability: number;
  /** Ordered list of active shifters (highest |contribution| first). */
  shifters: NaturalProgressionShifter[];
  /** Net % the prior was shifted (sum of helping − hurting). */
  netShiftPercent: number;
  /** One-line plain-language summary, e.g.
   *  "Frozen shoulder (frozen) — anchored to natural-history prior;
   *   3 shifters slowing recovery (net −22%)." */
  summary: string;
  /** Bucketised screener risk for STarT Back / Örebro / FABQ / PCS
   *  / OSPRO-YF (omit if score absent). */
  screenerRiskBuckets: Record<string, "low" | "moderate" | "high">;
}

// ─────────────────────────────────────────────────────────────────────
// Screener score → risk-bucket mappings (literature thresholds).
// ─────────────────────────────────────────────────────────────────────

export type ScreenerName = "startBack" | "orebro" | "fabq" | "pcs" | "osproYf";

export function computeScreenerRiskBucket(
  score: number | null,
  screener: ScreenerName,
): "low" | "moderate" | "high" | null {
  if (score === null || !Number.isFinite(score)) return null;
  switch (screener) {
    case "startBack":
      // Hill 2008: 0–3 low, 4 moderate (sub-score ≤3), 4+ with sub ≥4 high.
      if (score <= 3) return "low";
      if (score <= 4) return "moderate";
      return "high";
    case "orebro":
      // Linton 2003 ÖMPSQ short: ≥50 high, 30–49 moderate, <30 low.
      if (score < 30) return "low";
      if (score < 50) return "moderate";
      return "high";
    case "fabq":
      // FABQ-PA cutoff ~15, FABQ-W ~34. Combined collapsed scale here:
      // low <20, mod 20–39, high ≥40.
      if (score < 20) return "low";
      if (score < 40) return "moderate";
      return "high";
    case "pcs":
      // Sullivan 1995 PCS: ≥30 high, 20–29 moderate, <20 low.
      if (score < 20) return "low";
      if (score < 30) return "moderate";
      return "high";
    case "osproYf":
      // OSPRO-YF normalised 0–100 (higher = more yellow flags).
      // <33 low, 33–66 moderate, >66 high.
      if (score < 33) return "low";
      if (score <= 66) return "moderate";
      return "high";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Severity-grade → bucket helper. Each family uses its own scale.
// ─────────────────────────────────────────────────────────────────────

export function severityToBucket(
  family: SeverityGradeFamily,
  value: number | null,
): "mild" | "moderate" | "severe" | "any" {
  if (value === null || !Number.isFinite(value)) return "any";
  switch (family) {
    case "kl_grade":
      if (value <= 1) return "mild";
      if (value <= 2) return "moderate";
      return "severe";
    case "tear_thickness":
      if (value <= 0) return "mild";
      if (value <= 1) return "moderate";
      return "severe";
    case "neer_hawkins":
      if (value <= 0) return "mild";
      if (value <= 1) return "moderate";
      return "severe";
    case "nerve_conduction":
      if (value <= 0) return "mild";
      if (value <= 1) return "moderate";
      return "severe";
    case "lbp_severity":
      if (value <= 0) return "mild";
      if (value <= 1) return "moderate";
      return "severe";
    case "tendon_cook_stage":
      if (value <= 0) return "mild";
      if (value <= 1) return "moderate";
      return "severe";
    case "generic_severity":
      if (value <= 1) return "mild";
      if (value <= 2) return "moderate";
      return "severe";
    case "unknown":
      return "any";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Chronicity-stage helpers (also fall back from `weeksSinceOnset`).
// ─────────────────────────────────────────────────────────────────────

export function inferChronicityStage(
  explicit: ChronicityStage,
  weeksSinceOnset: number | null,
): ChronicityStage {
  if (explicit !== "unknown") return explicit;
  if (weeksSinceOnset === null || !Number.isFinite(weeksSinceOnset)) {
    return "unknown";
  }
  if (weeksSinceOnset < 4) return "acute";
  if (weeksSinceOnset < 12) return "subacute";
  return "chronic";
}

/**
 * Task #255 — bridge from `classifyCondition`'s id space onto the
 * `naturalHistoryPriors.ts` id space.
 *
 * Most diagnoses share a single `conditionId` across all stages and
 * delegate the acute/subacute/chronic split to the prior catalog's
 * `stage` dimension (e.g. lateral_epicondylalgia has one id with two
 * stage-keyed priors). Low back pain is a special case: the catalog
 * keys acute / subacute / chronic LBP under three *separate*
 * `conditionId`s, because the underlying epidemiology (recovery
 * curves, residual-deficit ceilings, chronification probability)
 * differs strongly enough to warrant fully independent priors. The
 * classifier can only guess a default variant from the complaint
 * string, so this bridge refines that guess using the structured
 * patient `chronicityStage` (or `weeksSinceOnset` fallback) so a
 * clinician's plain "low back pain" complaint plus
 * `chronicityStage = chronic` ends up at the chronic_lbp prior
 * instead of the subacute default.
 *
 * Returns the input id unchanged for any condition family that does
 * not need this kind of cross-id refinement.
 */
export function resolveNaturalProgressionConditionId(
  classifiedId: string,
  factors: Pick<PatientFactors, "chronicityStage" | "weeksSinceOnset">,
): string {
  const lbpVariants = new Set(["acute_lbp", "subacute_lbp", "chronic_lbp"]);
  if (!lbpVariants.has(classifiedId)) return classifiedId;
  const stage = inferChronicityStage(factors.chronicityStage, factors.weeksSinceOnset);
  if (stage === "acute") return "acute_lbp";
  if (stage === "subacute") return "subacute_lbp";
  if (stage === "chronic") return "chronic_lbp";
  return classifiedId;
}

// ─────────────────────────────────────────────────────────────────────
// Shifter table — each entry is a self-contained rule that may emit a
// shifter when its preconditions are met. Centralised here so tests
// can iterate the table.
// ─────────────────────────────────────────────────────────────────────

interface ShifterRule {
  id: string;
  /** Returns null when the shifter should be skipped. */
  evaluate: (
    factors: PatientFactors,
    stage: ChronicityStage,
  ) => NaturalProgressionShifter | null;
}

const SHIFTER_RULES: ShifterRule[] = [
  // Chronicity stage
  {
    id: "chronicity_stage",
    evaluate: (_, stage) => {
      if (stage === "unknown") return null;
      if (stage === "acute") {
        return {
          id: "chronicity_acute",
          label: "Acute stage",
          effect: "Acute presentations recover faster than the prior median",
          contributionPercent: 8,
          direction: "helping",
          value: "acute",
        };
      }
      if (stage === "subacute") {
        return {
          id: "chronicity_subacute",
          label: "Subacute stage",
          effect: "Subacute window — neutral relative to the prior",
          contributionPercent: 0,
          direction: "informational",
          value: "subacute",
        };
      }
      return {
        id: "chronicity_chronic",
        label: "Chronic stage",
        effect: "Chronic presentations slow recovery",
        contributionPercent: -18,
        direction: "hurting",
        value: "chronic",
      };
    },
  },

  // Severity grade
  {
    id: "severity_grade",
    evaluate: (factors) => {
      const bucket = severityToBucket(factors.severityGradeFamily, factors.severityGradeValue);
      if (bucket === "any") return null;
      if (bucket === "mild") {
        return {
          id: "severity_mild",
          label: "Mild severity grade",
          effect: "Lower severity supports faster recovery",
          contributionPercent: 6,
          direction: "helping",
          value: factors.severityGradeValue,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "severity_moderate",
          label: "Moderate severity grade",
          effect: "Moderate severity — neutral effect",
          contributionPercent: 0,
          direction: "informational",
          value: factors.severityGradeValue,
        };
      }
      return {
        id: "severity_severe",
        label: "Severe grade",
        effect: "Severe grade reduces ceiling and slows recovery",
        contributionPercent: -15,
        direction: "hurting",
        value: factors.severityGradeValue,
      };
    },
  },

  // Pre-treatment slope
  {
    id: "pre_tx_slope",
    evaluate: (factors) => {
      const slope: PreTxSlope = factors.preTxSlope;
      if (slope === "unknown") return null;
      const mag = factors.preTxSlopeMagnitude ?? 5;
      if (slope === "improving") {
        return {
          id: "slope_improving",
          label: "Improving pre-treatment slope",
          effect: `Symptoms already trending up (~${mag.toFixed(0)}pp/wk)`,
          contributionPercent: 9,
          direction: "helping",
          value: `improving (${mag})`,
        };
      }
      if (slope === "flat") {
        return {
          id: "slope_flat",
          label: "Flat pre-treatment slope",
          effect: "Symptoms stable but not improving — inertia",
          contributionPercent: -3,
          direction: "hurting",
          value: "flat",
        };
      }
      return {
        id: "slope_worsening",
        label: "Worsening pre-treatment slope",
        effect: `Trajectory deteriorating pre-presentation (~${mag.toFixed(0)}pp/wk)`,
        contributionPercent: -12,
        direction: "hurting",
        value: `worsening (${mag})`,
      };
    },
  },

  // STarT Back screener
  {
    id: "screener_start_back",
    evaluate: (factors) => {
      const bucket = computeScreenerRiskBucket(factors.screenerScores.startBack, "startBack");
      if (!bucket) return null;
      if (bucket === "high") {
        return {
          id: "startback_high",
          label: "STarT Back high risk",
          effect: "Elevated psychosocial risk slows recovery",
          contributionPercent: -12,
          direction: "hurting",
          value: factors.screenerScores.startBack,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "startback_moderate",
          label: "STarT Back moderate risk",
          effect: "Moderate psychosocial risk dampens recovery slope",
          contributionPercent: -6,
          direction: "hurting",
          value: factors.screenerScores.startBack,
        };
      }
      return {
        id: "startback_low",
        label: "STarT Back low risk",
        effect: "Low psychosocial risk supports recovery",
        contributionPercent: 4,
        direction: "helping",
        value: factors.screenerScores.startBack,
      };
    },
  },

  // Örebro screener
  {
    id: "screener_orebro",
    evaluate: (factors) => {
      const bucket = computeScreenerRiskBucket(factors.screenerScores.orebro, "orebro");
      if (!bucket) return null;
      if (bucket === "high") {
        return {
          id: "orebro_high",
          label: "Örebro high risk",
          effect: "ÖMPSQ high — work-disability risk",
          contributionPercent: -10,
          direction: "hurting",
          value: factors.screenerScores.orebro,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "orebro_moderate",
          label: "Örebro moderate risk",
          effect: "ÖMPSQ moderate — monitor work demands",
          contributionPercent: -5,
          direction: "hurting",
          value: factors.screenerScores.orebro,
        };
      }
      return {
        id: "orebro_low",
        label: "Örebro low risk",
        effect: "ÖMPSQ low — minimal work-disability risk",
        contributionPercent: 3,
        direction: "helping",
        value: factors.screenerScores.orebro,
      };
    },
  },

  // FABQ
  {
    id: "screener_fabq",
    evaluate: (factors) => {
      const bucket = computeScreenerRiskBucket(factors.screenerScores.fabq, "fabq");
      if (!bucket) return null;
      if (bucket === "high") {
        return {
          id: "fabq_high",
          label: "FABQ high",
          effect: "Fear-avoidance high — slows progressive loading",
          contributionPercent: -8,
          direction: "hurting",
          value: factors.screenerScores.fabq,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "fabq_moderate",
          label: "FABQ moderate",
          effect: "Some avoidance behaviour — pace exposure",
          contributionPercent: -4,
          direction: "hurting",
          value: factors.screenerScores.fabq,
        };
      }
      return null;
    },
  },

  // PCS (catastrophising)
  {
    id: "screener_pcs",
    evaluate: (factors) => {
      const bucket = computeScreenerRiskBucket(factors.screenerScores.pcs, "pcs");
      if (!bucket) return null;
      if (bucket === "high") {
        return {
          id: "pcs_high",
          label: "PCS high",
          effect: "Catastrophising high — pain modulation impaired",
          contributionPercent: -9,
          direction: "hurting",
          value: factors.screenerScores.pcs,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "pcs_moderate",
          label: "PCS moderate",
          effect: "Some catastrophising — monitor pain education uptake",
          contributionPercent: -4,
          direction: "hurting",
          value: factors.screenerScores.pcs,
        };
      }
      return null;
    },
  },

  // OSPRO-YF
  {
    id: "screener_ospro_yf",
    evaluate: (factors) => {
      const bucket = computeScreenerRiskBucket(factors.screenerScores.osproYf, "osproYf");
      if (!bucket) return null;
      if (bucket === "high") {
        return {
          id: "ospro_high",
          label: "OSPRO-YF high",
          effect: "Multiple yellow flags — prognosis worsens",
          contributionPercent: -10,
          direction: "hurting",
          value: factors.screenerScores.osproYf,
        };
      }
      if (bucket === "moderate") {
        return {
          id: "ospro_moderate",
          label: "OSPRO-YF moderate",
          effect: "Some yellow flags present — address proactively",
          contributionPercent: -4,
          direction: "hurting",
          value: factors.screenerScores.osproYf,
        };
      }
      return null;
    },
  },

  // Expectations
  {
    id: "expectations",
    evaluate: (factors) => {
      const e: RecoveryExpectations = factors.recoveryExpectations;
      if (e === "unknown") return null;
      if (e === "high") {
        return {
          id: "expectations_high",
          label: "High recovery expectations",
          effect: "Expectations are a known prognostic factor",
          contributionPercent: 6,
          direction: "helping",
          value: e,
        };
      }
      if (e === "low") {
        return {
          id: "expectations_low",
          label: "Low recovery expectations",
          effect: "Pessimistic expectations slow real recovery",
          contributionPercent: -7,
          direction: "hurting",
          value: e,
        };
      }
      return null;
    },
  },

  // Predicted adherence
  {
    id: "adherence",
    evaluate: (factors) => {
      const a: PredictedAdherence = factors.predictedAdherence;
      if (a === "unknown") return null;
      if (a === "high") {
        return {
          id: "adherence_high",
          label: "High predicted adherence",
          effect: "Patient likely to follow plan closely",
          contributionPercent: 5,
          direction: "helping",
          value: a,
        };
      }
      if (a === "low") {
        return {
          id: "adherence_low",
          label: "Low predicted adherence",
          effect: "Adherence concerns dampen treated forecast",
          contributionPercent: -8,
          direction: "hurting",
          value: a,
        };
      }
      return null;
    },
  },

  // Flare pattern
  {
    id: "flare_pattern",
    evaluate: (factors) => {
      const f = factors.flarePattern;
      if (f.frequency === "unknown" && f.count12mo === null) return null;
      if (f.frequency === "weekly" || (f.count12mo ?? 0) >= 12) {
        return {
          id: "flare_high_frequency",
          label: "Frequent flares (≥weekly)",
          effect: "Recurrent flare pattern destabilises recovery",
          contributionPercent: -10,
          direction: "hurting",
          value: f.count12mo,
        };
      }
      if (f.frequency === "monthly" || ((f.count12mo ?? 0) >= 4 && (f.count12mo ?? 0) < 12)) {
        return {
          id: "flare_monthly",
          label: "Monthly flares",
          effect: "Periodic flares — modest drag on recovery",
          contributionPercent: -5,
          direction: "hurting",
          value: f.count12mo,
        };
      }
      if (f.frequency === "rare" || ((f.count12mo ?? 0) >= 1 && (f.count12mo ?? 0) < 4)) {
        return {
          id: "flare_rare",
          label: "Rare flares",
          effect: "Few flares historically — informational",
          contributionPercent: 0,
          direction: "informational",
          value: f.count12mo,
        };
      }
      if (f.frequency === "none" || f.count12mo === 0) {
        return {
          id: "flare_none",
          label: "No flare history",
          effect: "Stable inter-episode pattern",
          contributionPercent: 3,
          direction: "helping",
          value: 0,
        };
      }
      return null;
    },
  },

  // Concurrent / systemic involvement
  {
    id: "concurrent",
    evaluate: (factors) => {
      const c = factors.concurrentInvolvement;
      const flags: string[] = [];
      let hit = 0;
      if (c.bilateral) { flags.push("bilateral"); hit++; }
      if (c.multiSite) { flags.push("multi-site"); hit++; }
      if (c.systemicCondition) { flags.push("systemic"); hit++; }
      if (hit === 0) return null;
      const contribution = -4 * hit; // each adds 4% drag
      return {
        id: "concurrent_load",
        label: "Concurrent / systemic load",
        effect: `${flags.join(" + ")} involvement — slower healing`,
        contributionPercent: contribution,
        direction: "hurting",
        value: flags.join(", "),
      };
    },
  },

  // Demands ramp
  {
    id: "demands_ramp",
    evaluate: (factors) => {
      const d = factors.demandsRamp;
      if (d.targetWeeks === null && d.intensityMultiplier === null) return null;
      const tw = d.targetWeeks ?? 12;
      const im = d.intensityMultiplier ?? 1;
      if (im >= 1.5 && tw <= 8) {
        return {
          id: "demands_aggressive_ramp",
          label: "Aggressive demands ramp",
          effect: `Heavy load target (${im}x) by week ${tw}`,
          contributionPercent: -7,
          direction: "hurting",
          value: `${im}x @ ${tw}w`,
        };
      }
      if (im <= 1 && tw >= 12) {
        return {
          id: "demands_conservative_ramp",
          label: "Conservative demands ramp",
          effect: "Gentle return-to-activity ramp supports recovery",
          contributionPercent: 4,
          direction: "helping",
          value: `${im}x @ ${tw}w`,
        };
      }
      return {
        id: "demands_neutral",
        label: "Demands ramp set",
        effect: `${im}x by week ${tw}`,
        contributionPercent: 0,
        direction: "informational",
        value: `${im}x @ ${tw}w`,
      };
    },
  },

  // Prior treatment response
  {
    id: "prior_tx_response",
    evaluate: (factors) => {
      const p: PriorTxResponse = factors.priorTxResponse;
      if (p === "unknown" || p === "naive") return null;
      if (p === "fast_responder") {
        return {
          id: "prior_fast",
          label: "Fast responder previously",
          effect: "Past episodes resolved faster than expected",
          contributionPercent: 7,
          direction: "helping",
          value: p,
        };
      }
      if (p === "expected") {
        return {
          id: "prior_expected",
          label: "Tracked prior expectations",
          effect: "Past episodes followed the textbook prior",
          contributionPercent: 0,
          direction: "informational",
          value: p,
        };
      }
      if (p === "slow_responder") {
        return {
          id: "prior_slow",
          label: "Slow responder previously",
          effect: "Past episodes resolved slowly",
          contributionPercent: -8,
          direction: "hurting",
          value: p,
        };
      }
      return {
        id: "prior_non",
        label: "Non-responder previously",
        effect: "Past episodes never fully resolved",
        contributionPercent: -14,
        direction: "hurting",
        value: p,
      };
    },
  },

  // Expanded meds — combined into a single shifter (sum of small drags)
  {
    id: "expanded_meds",
    evaluate: (factors) => {
      const m = factors.expandedMedications;
      const drags: string[] = [];
      let total = 0;
      if (m.ssris) { drags.push("SSRIs"); total -= 3; }
      if (m.glp1) { drags.push("GLP-1"); total -= 2; }
      if (m.aromataseInhibitors) { drags.push("AI"); total -= 4; }
      if (m.chronicOpioids) { drags.push("opioids"); total -= 6; }
      if (m.ocp) { drags.push("OCP"); total -= 1; }
      if (m.hrt) { drags.push("HRT"); total += 3; }
      if (drags.length === 0) return null;
      const direction: ShifterDirection = total > 0 ? "helping" : total < 0 ? "hurting" : "informational";
      return {
        id: "expanded_meds_combined",
        label: "Expanded medications",
        effect: drags.join(" + "),
        contributionPercent: total,
        direction,
        value: drags.join(", "),
      };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────────

export interface NaturalProgressionArgs {
  conditionId: string | null | undefined;
  factors: PatientFactors;
  /** Length of the projection horizon (weeks). */
  totalWeeks: number;
}

export function computeNaturalProgression(args: NaturalProgressionArgs): NaturalProgressionResult {
  const { conditionId, factors } = args;
  const totalWeeks = Math.max(1, Math.floor(args.totalWeeks));

  // Resolve chronicity stage (explicit > inferred from weeksSinceOnset)
  const stage = inferChronicityStage(factors.chronicityStage, factors.weeksSinceOnset);
  const severityBucket = severityToBucket(factors.severityGradeFamily, factors.severityGradeValue);

  const lookupArgs: PriorLookupArgs = {
    conditionId,
    stage: stage === "unknown" ? null : stage,
    severityBucket: severityBucket === "any" ? null : severityBucket,
  };
  const prior = lookupNaturalHistoryPrior(lookupArgs);
  const priorMatched = prior !== GENERIC_FALLBACK_PRIOR;

  const baseCurve = priorRecoveryCurve(prior, totalWeeks);

  // Collect shifters
  const shifters: NaturalProgressionShifter[] = [];
  for (const rule of SHIFTER_RULES) {
    const s = rule.evaluate(factors, stage);
    if (s) shifters.push(s);
  }

  // Net % shift across non-informational shifters
  const netShiftPercent = shifters
    .filter(s => s.direction !== "informational")
    .reduce((acc, s) => acc + s.contributionPercent, 0);

  // Per-week multipliers: apply the net shift smoothly so early weeks
  // are barely affected and later weeks fully reflect it. Cap the
  // total multiplier in [0.5, 1.6] so a stack of shifters can't
  // collapse the curve to zero or send it to the moon.
  const netMultiplier = Math.max(0.5, Math.min(1.6, 1 + netShiftPercent / 100));
  const perWeekMultipliers: number[] = [];
  for (let w = 0; w <= totalWeeks; w++) {
    // Smoothstep ramp over first 12 weeks so the prior lead-in still
    // matches week 0–2 anchors before the net shift kicks in fully.
    const ramp = Math.min(1, w / 12);
    const m = 1 + (netMultiplier - 1) * ramp;
    perWeekMultipliers.push(m);
  }

  // Apply multipliers to the base curve to get the adjusted curve.
  // Helping shifters speed the curve toward the ceiling; hurting ones
  // slow it. We multiply the *progress fraction* (0–1) by the
  // per-week multiplier and re-clamp to the ceiling.
  const ceilingShift = Math.max(0, Math.min(0.95, prior.residualDeficitCeiling - netShiftPercent / 1000));
  const ceiling = 1 - ceilingShift;
  const adjustedCurve = baseCurve.map((v, i) => {
    const m = perWeekMultipliers[i] ?? 1;
    return Math.max(0, Math.min(ceiling, v * m));
  });

  // Adjust chronification probability inversely to the net shift.
  const chronShift = -netShiftPercent / 200; // -20% net → +0.10 chronification
  const chronificationProbability = Math.max(
    0,
    Math.min(0.95, prior.chronificationProbability + chronShift),
  );
  const plateauProbability = Math.max(
    0,
    Math.min(0.95, prior.plateauProbability + chronShift * 0.6),
  );

  // Sort shifters by |contribution| desc for top-N display.
  shifters.sort((a, b) => Math.abs(b.contributionPercent) - Math.abs(a.contributionPercent));

  // Bucket all screener scores (omit null buckets).
  const screenerRiskBuckets: Record<string, "low" | "moderate" | "high"> = {};
  (["startBack", "orebro", "fabq", "pcs", "osproYf"] as ScreenerName[]).forEach(name => {
    const b = computeScreenerRiskBucket(factors.screenerScores[name], name);
    if (b) screenerRiskBuckets[name] = b;
  });

  // Summary line.
  const directionWord = netShiftPercent > 5 ? "speeding"
    : netShiftPercent < -5 ? "slowing"
    : "near neutral on";
  const summary = priorMatched
    ? `${prior.conditionLabel} — ${shifters.length} shifters ${directionWord} recovery (net ${netShiftPercent >= 0 ? "+" : ""}${netShiftPercent.toFixed(0)}%)`
    : `Generic prior used (no specific natural-history data for this condition); ${shifters.length} shifters ${directionWord} recovery (net ${netShiftPercent >= 0 ? "+" : ""}${netShiftPercent.toFixed(0)}%)`;

  return {
    prior,
    priorMatched,
    baseCurve,
    adjustedCurve,
    perWeekMultipliers,
    ceiling,
    chronificationProbability,
    plateauProbability,
    shifters,
    netShiftPercent,
    summary,
    screenerRiskBuckets,
  };
}
