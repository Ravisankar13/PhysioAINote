/**
 * Task #255 — Natural Progression Layer tests.
 *
 * Standalone tsx-runnable test (no test runner installed). Run with:
 *   npx tsx client/src/lib/__tests__/naturalProgression.test.ts
 *
 * Coverage:
 *   - Prior dataset lookup by conditionId / stage / severity.
 *   - Screener-score → risk bucket thresholds.
 *   - Severity-grade family bucketing.
 *   - Chronicity-stage inference from `weeksSinceOnset`.
 *   - Shifter direction (helping vs hurting) and `value` carry-through.
 *   - Graceful fallback to GENERIC_FALLBACK_PRIOR when condition is
 *     unknown and to a no-shifter result when factors are blank.
 *   - Ceiling / chronification probability respond to severity flips.
 *   - Simulator-end behavior: per-week multipliers length, monotonicity
 *     of adjustedCurve up to ceiling, perWeekMultipliers stay in [0.5, 1.6].
 */

import {
  computeNaturalProgression,
  computeScreenerRiskBucket,
  severityToBucket,
  inferChronicityStage,
} from "../naturalProgressionEngine";
import {
  GENERIC_FALLBACK_PRIOR,
  lookupNaturalHistoryPrior,
} from "../naturalHistoryPriors";
import { DEFAULT_PATIENT_FACTORS, type PatientFactors } from "../patientFactorsEngine";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); }
}

function clone(): PatientFactors {
  // Deep-ish clone so test mutations don't leak across cases.
  return JSON.parse(JSON.stringify(DEFAULT_PATIENT_FACTORS));
}

// ─────────────────────────────────────────────────────────────────────
// 1. Screener risk buckets
// ─────────────────────────────────────────────────────────────────────

assert(computeScreenerRiskBucket(null, "startBack") === null,
  "startBack: null score → null bucket");
assert(computeScreenerRiskBucket(2, "startBack") === "low",
  "startBack ≤3 → low");
assert(computeScreenerRiskBucket(4, "startBack") === "moderate",
  "startBack 4 → moderate");
assert(computeScreenerRiskBucket(7, "startBack") === "high",
  "startBack ≥5 → high");

assert(computeScreenerRiskBucket(20, "orebro") === "low",
  "orebro <30 → low");
assert(computeScreenerRiskBucket(40, "orebro") === "moderate",
  "orebro 30–49 → moderate");
assert(computeScreenerRiskBucket(80, "orebro") === "high",
  "orebro ≥50 → high");

assert(computeScreenerRiskBucket(15, "fabq") === "low", "fabq <20 → low");
assert(computeScreenerRiskBucket(30, "fabq") === "moderate", "fabq 20–39 → moderate");
assert(computeScreenerRiskBucket(50, "fabq") === "high", "fabq ≥40 → high");

assert(computeScreenerRiskBucket(10, "pcs") === "low", "pcs <20 → low");
assert(computeScreenerRiskBucket(25, "pcs") === "moderate", "pcs 20–29 → moderate");
assert(computeScreenerRiskBucket(35, "pcs") === "high", "pcs ≥30 → high");

assert(computeScreenerRiskBucket(20, "osproYf") === "low", "osproYf <33 → low");
assert(computeScreenerRiskBucket(50, "osproYf") === "moderate", "osproYf 33–66 → moderate");
assert(computeScreenerRiskBucket(80, "osproYf") === "high", "osproYf >66 → high");

// ─────────────────────────────────────────────────────────────────────
// 2. Severity-grade bucketing
// ─────────────────────────────────────────────────────────────────────

assert(severityToBucket("kl_grade", 0) === "mild", "KL 0 → mild");
assert(severityToBucket("kl_grade", 2) === "moderate", "KL 2 → moderate");
assert(severityToBucket("kl_grade", 4) === "severe", "KL 4 → severe");
assert(severityToBucket("tear_thickness", 2) === "severe", "Tear 2 → severe");
assert(severityToBucket("unknown", 3) === "any", "unknown family → any");
assert(severityToBucket("kl_grade", null) === "any", "null grade → any");

// ─────────────────────────────────────────────────────────────────────
// 3. Chronicity inference
// ─────────────────────────────────────────────────────────────────────

assert(inferChronicityStage("unknown", null) === "unknown",
  "unknown stage + null weeks → unknown");
assert(inferChronicityStage("unknown", 2) === "acute", "<4 wk → acute");
assert(inferChronicityStage("unknown", 8) === "subacute", "4–12 wk → subacute");
assert(inferChronicityStage("unknown", 20) === "chronic", "≥12 wk → chronic");
assert(inferChronicityStage("acute", 99) === "acute",
  "explicit stage overrides weeks");

// ─────────────────────────────────────────────────────────────────────
// 4. Prior lookup
// ─────────────────────────────────────────────────────────────────────

const priorAdhCap = lookupNaturalHistoryPrior({
  conditionId: "frozen_shoulder",
  stage: null,
  severityBucket: null,
});
assert(priorAdhCap !== GENERIC_FALLBACK_PRIOR,
  "frozen_shoulder matches a curated prior, not the generic fallback");

const priorUnknown = lookupNaturalHistoryPrior({
  conditionId: "totally_made_up_condition_xyz",
  stage: null,
  severityBucket: null,
});
assert(priorUnknown === GENERIC_FALLBACK_PRIOR,
  "unknown conditionId → GENERIC_FALLBACK_PRIOR");

const priorNullId = lookupNaturalHistoryPrior({
  conditionId: null,
  stage: null,
  severityBucket: null,
});
assert(priorNullId === GENERIC_FALLBACK_PRIOR,
  "null conditionId → GENERIC_FALLBACK_PRIOR");

// ─────────────────────────────────────────────────────────────────────
// 5. computeNaturalProgression — graceful fallback (blank factors)
// ─────────────────────────────────────────────────────────────────────

const blank = computeNaturalProgression({
  conditionId: "frozen_shoulder",
  factors: clone(),
  totalWeeks: 24,
});
assert(blank.priorMatched === true,
  "blank-factors run still matches the curated prior");
assert(blank.shifters.length === 0,
  `blank factors → 0 shifters (got ${blank.shifters.length})`);
assert(blank.netShiftPercent === 0,
  `blank factors → netShiftPercent=0 (got ${blank.netShiftPercent})`);
assert(blank.perWeekMultipliers.length === 25,
  `perWeekMultipliers length = totalWeeks+1 (got ${blank.perWeekMultipliers.length})`);
assert(blank.perWeekMultipliers.every(m => m === 1),
  "blank factors → every per-week multiplier = 1.0");
assert(blank.adjustedCurve.length === 25,
  "adjustedCurve length = totalWeeks+1");
assert(Object.keys(blank.screenerRiskBuckets).length === 0,
  "blank factors → no screener buckets surfaced");

// ─────────────────────────────────────────────────────────────────────
// 6. Shifter direction & value carry-through
// ─────────────────────────────────────────────────────────────────────

const hurting = clone();
hurting.chronicityStage = "chronic";
hurting.preTxSlope = "worsening";
hurting.recoveryExpectations = "low";
hurting.predictedAdherence = "low";
hurting.screenerScores.startBack = 8;
hurting.screenerScores.pcs = 35;
hurting.priorTxResponse = "non_responder";
hurting.concurrentInvolvement.systemicCondition = true;
hurting.expandedMedications.chronicOpioids = true;

const hurtRes = computeNaturalProgression({
  conditionId: "frozen_shoulder",
  factors: hurting,
  totalWeeks: 24,
});
assert(hurtRes.shifters.length > 0,
  "stacked hurting factors emit shifters");
assert(hurtRes.shifters.every(s => typeof s.contributionPercent === "number"),
  "every shifter has a numeric contributionPercent");
assert(hurtRes.shifters.some(s => s.direction === "hurting"),
  "at least one hurting shifter is emitted");
assert(hurtRes.netShiftPercent < 0,
  `net shift should be negative for stacked-hurting (got ${hurtRes.netShiftPercent})`);
assert(hurtRes.chronificationProbability >= blank.chronificationProbability,
  "chronification probability rises (or holds) under stacked hurting factors");
assert(hurtRes.screenerRiskBuckets.startBack === "high",
  "startBack=8 surfaces as high risk bucket");
assert(hurtRes.screenerRiskBuckets.pcs === "high",
  "pcs=35 surfaces as high risk bucket");

const helping = clone();
helping.chronicityStage = "acute";
helping.preTxSlope = "improving";
helping.recoveryExpectations = "high";
helping.predictedAdherence = "high";
helping.priorTxResponse = "fast_responder";

const helpRes = computeNaturalProgression({
  conditionId: "frozen_shoulder",
  factors: helping,
  totalWeeks: 24,
});
assert(helpRes.shifters.some(s => s.direction === "helping"),
  "at least one helping shifter is emitted");
assert(helpRes.netShiftPercent > 0,
  `net shift should be positive for stacked-helping (got ${helpRes.netShiftPercent})`);

// Ordered desc by |contribution|
for (let i = 1; i < hurtRes.shifters.length; i++) {
  assert(
    Math.abs(hurtRes.shifters[i - 1].contributionPercent) >=
      Math.abs(hurtRes.shifters[i].contributionPercent),
    `shifters sorted by |contributionPercent| desc (idx ${i})`,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 7. Ceiling / chronification differ when severity flips
// ─────────────────────────────────────────────────────────────────────

const mildKnee = clone();
mildKnee.severityGradeFamily = "kl_grade";
mildKnee.severityGradeValue = 1;
const severeKnee = clone();
severeKnee.severityGradeFamily = "kl_grade";
severeKnee.severityGradeValue = 4;

const mildRes = computeNaturalProgression({
  conditionId: "osteoarthritis",
  factors: mildKnee,
  totalWeeks: 24,
});
const severeRes = computeNaturalProgression({
  conditionId: "osteoarthritis",
  factors: severeKnee,
  totalWeeks: 24,
});
assert(mildRes.priorMatched === true && severeRes.priorMatched === true,
  "osteoarthritis prior is curated for both severities");
assert(mildRes.ceiling >= severeRes.ceiling - 1e-9,
  `mild ceiling >= severe ceiling (mild=${mildRes.ceiling}, severe=${severeRes.ceiling})`);
assert(severeRes.chronificationProbability >= mildRes.chronificationProbability - 1e-9,
  "severe knee OA has >= chronification probability than mild");

// ─────────────────────────────────────────────────────────────────────
// 8. Per-week multiplier bounds + monotonic adjusted curve to ceiling
// ─────────────────────────────────────────────────────────────────────

const big = computeNaturalProgression({
  conditionId: "frozen_shoulder",
  factors: hurting,
  totalWeeks: 52,
});
assert(big.perWeekMultipliers.length === 53,
  "perWeekMultipliers spans 0..totalWeeks inclusive");
assert(big.perWeekMultipliers.every(m => m >= 0.5 && m <= 1.6),
  "per-week multipliers stay clamped to [0.5, 1.6]");
assert(Math.abs(big.perWeekMultipliers[0] - 1) < 1e-9,
  "week-0 multiplier always starts at 1.0 (smoothstep ramp)");
// Use the *helping* run for monotonicity: a hurting context can dip
// during the smoothstep ramp because the slope multiplier shrinks
// faster than the underlying prior rises (by design).
const helpBig = computeNaturalProgression({
  conditionId: "frozen_shoulder",
  factors: helping,
  totalWeeks: 52,
});
for (let i = 1; i < helpBig.adjustedCurve.length; i++) {
  assert(helpBig.adjustedCurve[i] >= helpBig.adjustedCurve[i - 1] - 1e-9,
    `helping-context adjustedCurve non-decreasing (idx ${i})`);
  assert(helpBig.adjustedCurve[i] <= helpBig.ceiling + 1e-9,
    `helping-context adjustedCurve clamped to ceiling (idx ${i})`);
}

// ─────────────────────────────────────────────────────────────────────
// 9. Graceful fallback when condition is unknown
// ─────────────────────────────────────────────────────────────────────

const fallback = computeNaturalProgression({
  conditionId: "totally_made_up_condition_xyz",
  factors: clone(),
  totalWeeks: 12,
});
assert(fallback.priorMatched === false,
  "unknown condition → priorMatched=false");
assert(fallback.prior === GENERIC_FALLBACK_PRIOR,
  "unknown condition → GENERIC_FALLBACK_PRIOR returned");
assert(fallback.summary.toLowerCase().includes("generic prior"),
  "fallback summary advertises the generic prior");
assert(fallback.adjustedCurve.length === 13 && fallback.perWeekMultipliers.length === 13,
  "fallback still returns full-length curves");

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────

console.log(`\nNatural progression tests: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
} else {
  console.log("All passed");
}
