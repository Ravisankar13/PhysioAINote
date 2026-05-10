/**
 * Task #255 — Natural Progression × Simulator integration tests.
 *
 * Standalone tsx-runnable test (no test runner installed). Run with:
 *   npx tsx client/src/lib/__tests__/naturalProgressionSimulator.test.ts
 *
 * These tests prove the diagnosis-level natural-history prior actually
 * shapes the simulator's per-week trajectory — not just the dashboard's
 * "Why this curve" panel. Concretely:
 *
 *   1. Same patient profile, two different conditions:
 *      acute LBP recovers materially faster than adhesive capsulitis.
 *   2. Same condition (knee OA), severity flip:
 *      mild KL=1 ends higher than severe KL=4.
 *   3. Same condition, chronicity flip:
 *      acute case ends higher than chronic case.
 *   4. Same condition, pre-tx slope flip:
 *      improving ends higher than worsening.
 *   5. Treated branch ends higher than baseline branch on the same
 *      diagnosis (interventions can rise above the natural floor).
 *   6. Graceful fallback: removing the natural progression entirely
 *      still produces a valid finite curve (no crash / no NaN).
 */

import {
  simulateBranch,
  buildConditionContext,
  classifyCondition,
  defaultBranch,
  defaultInput,
  type SimulationInput,
  type ScenarioBranch,
} from "../recoverySimulationEngine";
import {
  computeNaturalProgression,
  resolveNaturalProgressionConditionId,
} from "../naturalProgressionEngine";
import { GENERIC_FALLBACK_PRIOR } from "../naturalHistoryPriors";
import { DEFAULT_PATIENT_FACTORS, type PatientFactors } from "../patientFactorsEngine";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); }
}

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return { ...defaultInput(), totalWeeks: 24, ...overrides };
}

/** Build a branch whose id starts with "baseline_" so simulateBranch
 *  treats it as a passive/no-treatment reference (full natural-progression
 *  weighting). */
function makeBaselineBranch(input: SimulationInput): ScenarioBranch {
  return {
    id: 'baseline_no_treatment',
    name: 'No treatment',
    fromWeek: 0,
    interventions: [],
    flareEvents: [],
    reaggravationEvents: [],
    loadAdjustments: [],
    color: '#888',
  };
}

function ctxFor(conditionId: string, factors: PatientFactors, totalWeeks: number) {
  return buildConditionContext({
    mainComplaint: conditionLabelFor(conditionId),
    naturalProgression: computeNaturalProgression({
      conditionId,
      factors,
      totalWeeks,
    }),
  });
}

/** Map our test conditionIds onto strings that `classifyCondition`
 *  inside `buildConditionContext` will route to the same id. */
function conditionLabelFor(id: string): string {
  switch (id) {
    case "acute_lbp":           return "acute low back pain";
    case "frozen_shoulder":     return "frozen shoulder";
    case "osteoarthritis":      return "knee osteoarthritis";
    default:                    return id;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 1. Diagnosis-level shape: acute LBP vs frozen shoulder
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24, acuity: "acute" });
  const blank = clone(DEFAULT_PATIENT_FACTORS);
  const lbp = simulateBranch(
    input,
    makeBaselineBranch(input),
    'no_treatment',
    undefined,
    null,
    ctxFor("acute_lbp", blank, input.totalWeeks),
  );
  const fz = simulateBranch(
    input,
    makeBaselineBranch(input),
    'no_treatment',
    undefined,
    null,
    ctxFor("frozen_shoulder", blank, input.totalWeeks),
  );

  const lbpEnd = lbp.states[lbp.states.length - 1];
  const fzEnd = fz.states[fz.states.length - 1];

  assert(Number.isFinite(lbpEnd.capacity) && Number.isFinite(fzEnd.capacity),
    "diagnosis-level run produces finite capacity (no NaN)");

  assert(lbpEnd.capacity > fzEnd.capacity + 5,
    `with blank patient profile, acute LBP baseline should end materially above frozen shoulder baseline `
    + `(LBP cap=${lbpEnd.capacity.toFixed(1)} vs FZ cap=${fzEnd.capacity.toFixed(1)})`);

  // Mid-run shape: LBP curves up faster early on (literature: ~60% by w4).
  const lbpW4 = lbp.states[4]?.capacity ?? 0;
  const fzW4 = fz.states[4]?.capacity ?? 0;
  assert(lbpW4 > fzW4,
    `at week 4 LBP baseline should sit above frozen shoulder baseline `
    + `(LBP w4=${lbpW4.toFixed(1)} vs FZ w4=${fzW4.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// 2. Severity flip on the same diagnosis (knee OA, KL 1 vs 4)
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24 });
  const mild = clone(DEFAULT_PATIENT_FACTORS);
  mild.severityGradeFamily = "kl_grade";
  mild.severityGradeValue = 1;
  const severe = clone(DEFAULT_PATIENT_FACTORS);
  severe.severityGradeFamily = "kl_grade";
  severe.severityGradeValue = 4;

  const mildRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    ctxFor("osteoarthritis", mild, input.totalWeeks),
  );
  const severeRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    ctxFor("osteoarthritis", severe, input.totalWeeks),
  );

  const mildEnd = mildRes.states[mildRes.states.length - 1];
  const severeEnd = severeRes.states[severeRes.states.length - 1];

  assert(mildEnd.capacity > severeEnd.capacity,
    `mild knee OA baseline ends above severe `
    + `(mild=${mildEnd.capacity.toFixed(1)} vs severe=${severeEnd.capacity.toFixed(1)})`);
  assert(severeEnd.chronicityRisk >= mildEnd.chronicityRisk - 1e-6,
    `severe knee OA carries >= chronicity risk than mild `
    + `(mild=${mildEnd.chronicityRisk.toFixed(1)} vs severe=${severeEnd.chronicityRisk.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Chronicity-stage flip (acute vs chronic) on the same diagnosis.
//
// Use lateral epicondylalgia: the priors catalog has separate acute
// (medianRecoveryWeeks=26) and chronic (medianRecoveryWeeks=52) priors
// for this condition, so flipping `chronicityStage` selects a strictly
// slower curve. (Frozen shoulder isn't a good fit here because its
// "chronic" phase is the *thawing* phase, which actually recovers
// faster than the freezing phase — a quirk of that specific diagnosis.)
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24 });
  const acute = clone(DEFAULT_PATIENT_FACTORS);
  acute.chronicityStage = "acute";
  const chronic = clone(DEFAULT_PATIENT_FACTORS);
  chronic.chronicityStage = "chronic";

  const acuteRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    buildConditionContext({
      mainComplaint: "lateral epicondylalgia",
      naturalProgression: computeNaturalProgression({
        conditionId: "lateral_epicondylalgia",
        factors: acute,
        totalWeeks: input.totalWeeks,
      }),
    }),
  );
  const chronicRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    buildConditionContext({
      mainComplaint: "lateral epicondylalgia",
      naturalProgression: computeNaturalProgression({
        conditionId: "lateral_epicondylalgia",
        factors: chronic,
        totalWeeks: input.totalWeeks,
      }),
    }),
  );

  const acuteEnd = acuteRes.states[acuteRes.states.length - 1];
  const chronicEnd = chronicRes.states[chronicRes.states.length - 1];

  assert(acuteEnd.capacity > chronicEnd.capacity,
    `acute-chronicity baseline ends above chronic `
    + `(acute=${acuteEnd.capacity.toFixed(1)} vs chronic=${chronicEnd.capacity.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// 4. Pre-treatment slope flip
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24 });
  const improving = clone(DEFAULT_PATIENT_FACTORS);
  improving.preTxSlope = "improving";
  const worsening = clone(DEFAULT_PATIENT_FACTORS);
  worsening.preTxSlope = "worsening";

  const impRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    ctxFor("frozen_shoulder", improving, input.totalWeeks),
  );
  const worRes = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null,
    ctxFor("frozen_shoulder", worsening, input.totalWeeks),
  );

  const impEnd = impRes.states[impRes.states.length - 1];
  const worEnd = worRes.states[worRes.states.length - 1];

  assert(impEnd.capacity > worEnd.capacity,
    `improving pre-tx slope baseline ends above worsening `
    + `(imp=${impEnd.capacity.toFixed(1)} vs wor=${worEnd.capacity.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// 5. Treated branch ends above baseline on the same diagnosis
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24 });
  const blank = clone(DEFAULT_PATIENT_FACTORS);
  const ctx = ctxFor("frozen_shoulder", blank, input.totalWeeks);

  const baselineProj = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null, ctx,
  );
  const treatedProj = simulateBranch(
    input, defaultBranch(input), 'usual_care', undefined, null, ctx,
  );

  const baseEnd = baselineProj.states[baselineProj.states.length - 1];
  const txEnd = treatedProj.states[treatedProj.states.length - 1];

  assert(txEnd.capacity > baseEnd.capacity,
    `treated branch ends above baseline branch on the same diagnosis `
    + `(baseline=${baseEnd.capacity.toFixed(1)} vs treated=${txEnd.capacity.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// 6. Graceful fallback: no naturalProgression in the context still works
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 12 });
  const ctx = buildConditionContext({ mainComplaint: "frozen shoulder" });
  const proj = simulateBranch(
    input, makeBaselineBranch(input), 'no_treatment', undefined, null, ctx,
  );
  const end = proj.states[proj.states.length - 1];
  assert(Number.isFinite(end.capacity) && end.capacity >= 0 && end.capacity <= 100,
    `fallback (no naturalProgression) produces a valid 0–100 capacity `
    + `(got ${end.capacity})`);
  assert(proj.states.length === input.totalWeeks + 1,
    "fallback produces full-length state series");
}

// ─────────────────────────────────────────────────────────────────────
// 7. End-to-end app-path: classifyCondition → bridge →
//    computeNaturalProgression. Proves that real complaint strings a
//    clinician would type ("low back pain", "acute LBP", etc.)
//    actually reach the curated LBP priors and do *not* fall back to
//    the generic prior. Reproduces the exact PhysioGPT.tsx wiring.
// ─────────────────────────────────────────────────────────────────────
{
  const baseFactors = clone(DEFAULT_PATIENT_FACTORS);

  // 7a — plain "low back pain" must NOT classify as generic.
  const plainId = classifyCondition("low back pain").id;
  assert(plainId !== "generic",
    `classifyCondition("low back pain") must not return "generic" (got "${plainId}")`);
  assert(plainId === "subacute_lbp",
    `classifyCondition("low back pain") should default to subacute_lbp (got "${plainId}")`);

  // 7b — "acute LBP" must route to acute_lbp from the text alone.
  const acuteTextId = classifyCondition("acute LBP").id;
  assert(acuteTextId === "acute_lbp",
    `classifyCondition("acute LBP") should be acute_lbp (got "${acuteTextId}")`);

  // 7c — "chronic low back pain" must route to chronic_lbp.
  const chronicTextId = classifyCondition("chronic low back pain").id;
  assert(chronicTextId === "chronic_lbp",
    `classifyCondition("chronic low back pain") should be chronic_lbp (got "${chronicTextId}")`);

  // 7d — bridge refines a plain "low back pain" complaint to the
  //      patient's chronicity stage even when the text didn't say so.
  const chronicFactors = clone(DEFAULT_PATIENT_FACTORS);
  chronicFactors.chronicityStage = "chronic";
  const bridgedChronic = resolveNaturalProgressionConditionId(plainId, chronicFactors);
  assert(bridgedChronic === "chronic_lbp",
    `bridge should refine "${plainId}" → chronic_lbp when chronicityStage = chronic (got "${bridgedChronic}")`);

  const acuteFactors = clone(DEFAULT_PATIENT_FACTORS);
  acuteFactors.chronicityStage = "acute";
  const bridgedAcute = resolveNaturalProgressionConditionId(plainId, acuteFactors);
  assert(bridgedAcute === "acute_lbp",
    `bridge should refine "${plainId}" → acute_lbp when chronicityStage = acute (got "${bridgedAcute}")`);

  // 7e — weeksSinceOnset fallback when chronicityStage is unknown.
  const weeksOnly = clone(DEFAULT_PATIENT_FACTORS);
  weeksOnly.chronicityStage = "unknown";
  weeksOnly.weeksSinceOnset = 20;
  const bridgedFromWeeks = resolveNaturalProgressionConditionId(plainId, weeksOnly);
  assert(bridgedFromWeeks === "chronic_lbp",
    `bridge should infer chronic_lbp from weeksSinceOnset=20 when stage is unknown (got "${bridgedFromWeeks}")`);

  // 7f — full app-path NP result is matched (not the generic fallback).
  const np = computeNaturalProgression({
    conditionId: bridgedChronic,
    factors: chronicFactors,
    totalWeeks: 24,
  });
  assert(np.priorMatched === true,
    `LBP path should match a curated prior (priorMatched=${np.priorMatched})`);
  assert(np.prior.conditionId !== GENERIC_FALLBACK_PRIOR.conditionId,
    `LBP path should not return GENERIC_FALLBACK_PRIOR (got prior id "${np.prior.conditionId}")`);
}

// ─────────────────────────────────────────────────────────────────────
// 8. End-to-end simulator behavior on real complaint strings.
//    Same complaint ("low back pain") with acute vs chronic factors
//    should produce strictly different baseline trajectories — proving
//    the bridge actually reaches the simulator, not just the engine.
// ─────────────────────────────────────────────────────────────────────
{
  const input = makeInput({ totalWeeks: 24 });
  const COMPLAINT = "low back pain";

  function simulateFromComplaint(factors: PatientFactors) {
    const classifiedId = classifyCondition(COMPLAINT).id;
    const npConditionId = resolveNaturalProgressionConditionId(classifiedId, factors);
    const ctx = buildConditionContext({
      mainComplaint: COMPLAINT,
      naturalProgression: computeNaturalProgression({
        conditionId: npConditionId,
        factors,
        totalWeeks: input.totalWeeks,
      }),
    });
    return simulateBranch(input, makeBaselineBranch(input), 'no_treatment', undefined, null, ctx);
  }

  const acuteFactors = clone(DEFAULT_PATIENT_FACTORS);
  acuteFactors.chronicityStage = "acute";
  const chronicFactors = clone(DEFAULT_PATIENT_FACTORS);
  chronicFactors.chronicityStage = "chronic";

  const acute = simulateFromComplaint(acuteFactors);
  const chronic = simulateFromComplaint(chronicFactors);
  const acuteEnd = acute.states[acute.states.length - 1];
  const chronicEnd = chronic.states[chronic.states.length - 1];

  assert(acuteEnd.capacity > chronicEnd.capacity + 3,
    `app-path: "low back pain" + acute should end materially above the same complaint + chronic `
    + `(acute=${acuteEnd.capacity.toFixed(1)} vs chronic=${chronicEnd.capacity.toFixed(1)})`);
}

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────

console.log(`\nNatural progression × simulator integration tests: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
} else {
  console.log("All passed");
}
