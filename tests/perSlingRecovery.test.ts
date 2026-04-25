/**
 * Per-sling recovery resolution — focused unit tests.
 *
 * Run with `npx tsx tests/perSlingRecovery.test.ts`. Uses node:assert.
 * No test framework is installed in this repo so the file self-runs and
 * prints PASS / FAIL lines for each case, exiting non-zero on any failure.
 */
import { strict as assert } from 'node:assert';
import {
  SLING_IDS,
  SLING_LABELS,
  emptySlingScores,
  aggregateSlingFunction,
  buildConditionContext,
  relevantSlingsForArchetype,
  simulateBranch,
  TREATMENT_LIBRARY,
  type ConditionContext,
  type ScenarioBranch,
  type SimulationInput,
  type TreatmentEffectProfile,
} from '../client/src/lib/recoverySimulationEngine';
import { computeStructuralBiases } from '../client/src/lib/naturalRecoveryDriverModel';
import type { SlingId } from '../client/src/lib/slingEngine';

let failed = 0;
let ran = 0;
function test(name: string, fn: () => void): void {
  ran++;
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e instanceof Error ? e.message : String(e)}`);
  }
}

const baseInput: SimulationInput = {
  totalWeeks: 12,
  conditionSeverity: 40,
  irritability: 30,
  acuity: 'subacute',
  workDemand: 30,
  sportDemand: 20,
  patientAdherence: 0.8,
};

function emptyBranch(id: string, interventions: ScenarioBranch['interventions'] = []): ScenarioBranch {
  return {
    id,
    name: id,
    fromWeek: 0,
    interventions,
    flareEvents: [],
    reaggravationEvents: [],
    loadAdjustments: [],
    color: '#ccc',
  };
}

console.log('Per-sling recovery resolution');
console.log('-----------------------------');

// 1. Canonical sling IDs / labels stay in sync
test('SLING_IDS contains exactly the five canonical slings', () => {
  assert.deepEqual(
    [...SLING_IDS].sort(),
    ['anterior_oblique', 'deep_longitudinal', 'lateral', 'posterior_oblique', 'scapular_shoulder'],
  );
  for (const id of SLING_IDS) {
    assert.ok(SLING_LABELS[id], `missing label for ${id}`);
  }
});

// 2. Math helpers
test('emptySlingScores returns 60 by default and is keyed by all slings', () => {
  const s = emptySlingScores();
  for (const id of SLING_IDS) assert.equal(s[id], 60);
});

test('aggregateSlingFunction is the mean of the five sling scores', () => {
  const s = emptySlingScores(0);
  s.posterior_oblique = 100;
  s.anterior_oblique = 80;
  s.lateral = 60;
  s.deep_longitudinal = 40;
  s.scapular_shoulder = 20;
  assert.equal(aggregateSlingFunction(s), 60);
});

// 3. Condition context — per-sling severity wins, aggregate derives from max
test('buildConditionContext preserves per-sling severities', () => {
  const ctx = buildConditionContext({
    mainComplaint: 'rotator cuff tendinopathy',
    slingSeverities: {
      scapular_shoulder: 70,
      posterior_oblique: 30,
    },
  });
  assert.equal(ctx.slingSeverities.scapular_shoulder, 70);
  assert.equal(ctx.slingSeverities.posterior_oblique, 30);
  // Slings not provided default to 0 (no aggregate fallback because per-sling map was supplied)
  assert.equal(ctx.slingSeverities.anterior_oblique, 0);
});

test('buildConditionContext aggregate severity = max across per-sling values', () => {
  const ctx = buildConditionContext({
    mainComplaint: 'rotator cuff tendinopathy',
    slingSeverities: { scapular_shoulder: 70, posterior_oblique: 30 },
    slingWeakLinkSeverity: 20, // ignored when per-sling supplied
  });
  assert.equal(ctx.slingWeakLinkSeverity, 70);
});

test('buildConditionContext stamps every sling to aggregate when no per-sling input', () => {
  const ctx = buildConditionContext({
    mainComplaint: 'achilles tendinopathy',
    slingWeakLinkSeverity: 45,
  });
  for (const id of SLING_IDS) assert.equal(ctx.slingSeverities[id], 45);
  assert.equal(ctx.slingWeakLinkSeverity, 45);
});

// 4. Relevant slings per archetype
test('relevantSlingsForArchetype returns clinically meaningful slings', () => {
  assert.deepEqual(relevantSlingsForArchetype('frozen_shoulder'), ['scapular_shoulder']);
  assert.deepEqual(relevantSlingsForArchetype('mechanical_impingement'), ['scapular_shoulder', 'posterior_oblique']);
  // Unknown archetype falls back to all slings
  assert.deepEqual(relevantSlingsForArchetype('chronic_nociplastic').sort(), [...SLING_IDS].sort());
});

test('buildConditionContext picks archetype-relevant slings by default', () => {
  const ctx = buildConditionContext({ mainComplaint: 'frozen shoulder' });
  assert.deepEqual(ctx.relevantSlings, ['scapular_shoulder']);
});

test('buildConditionContext lets caller override relevantSlings', () => {
  const ctx = buildConditionContext({
    mainComplaint: 'low back pain',
    relevantSlings: ['lateral', 'deep_longitudinal'],
  });
  assert.deepEqual(ctx.relevantSlings, ['lateral', 'deep_longitudinal']);
});

// 5. Initial state
test('defaultInitialState seeds slingScores keyed by all five slings', () => {
  const ctx = buildConditionContext({
    mainComplaint: 'achilles tendinopathy',
    slingSeverities: { posterior_oblique: 80 },
  });
  const proj = simulateBranch(baseInput, emptyBranch('baseline'), 'no_treatment', undefined, undefined, ctx);
  const s0 = proj.states[0];
  for (const id of SLING_IDS) {
    assert.ok(typeof s0.slingScores[id] === 'number', `missing initial ${id}`);
  }
  // POS sling sits much lower than others at week 0 because of severity 80
  assert.ok(s0.slingScores.posterior_oblique < s0.slingScores.anterior_oblique - 20,
    `expected POS to be much weaker than others at baseline (POS=${s0.slingScores.posterior_oblique}, AO=${s0.slingScores.anterior_oblique})`);
});

// 6. Aggregate is always the mean of per-sling scores after every tick
test('slingFunction is always mean(slingScores) at every week', () => {
  const ctx = buildConditionContext({ mainComplaint: 'achilles tendinopathy' });
  const proj = simulateBranch(
    baseInput,
    emptyBranch('treat', [{
      id: 'mc1', treatmentId: 'motor_control', startWeek: 1, doseMultiplier: 1, adherence: 0.9,
    }]),
    'usual_care',
    undefined,
    undefined,
    ctx,
  );
  for (const s of proj.states) {
    const mean = aggregateSlingFunction(s.slingScores);
    assert.ok(Math.abs(s.slingFunction - mean) < 1e-9,
      `week ${s.week}: aggregate ${s.slingFunction} != mean ${mean}`);
  }
});

// 7. Targeted treatment lifts only its sling target
test('slingTarget routes slingFunction effect to named slings only', () => {
  const targetedProfile: TreatmentEffectProfile = {
    id: 'pos_targeted',
    name: 'POS-targeted exercise',
    modality: 'exercise',
    onsetWeeks: 0,
    peakWeeks: 1,
    durationWeeks: 6,
    carryoverWeeks: 1,
    effects: { slingFunction: 8 },
    slingTarget: 'posterior_oblique',
  };
  const ctx = buildConditionContext({ mainComplaint: 'achilles tendinopathy' });
  const proj = simulateBranch(
    baseInput,
    emptyBranch('targeted', [{
      id: 'i1', treatmentId: 'pos_targeted', startWeek: 1, doseMultiplier: 1, adherence: 1,
    }]),
    'usual_care',
    undefined,
    [targetedProfile],
    ctx,
  );
  const last = proj.states[proj.states.length - 1];
  // POS climbed; the others stayed close to baseline
  assert.ok(last.slingScores.posterior_oblique > last.slingScores.anterior_oblique + 10,
    `POS (${last.slingScores.posterior_oblique}) should significantly exceed AO (${last.slingScores.anterior_oblique}) when targeted`);
  assert.ok(Math.abs(last.slingScores.anterior_oblique - last.slingScores.lateral) < 5,
    `non-targeted slings should track each other (AO=${last.slingScores.anterior_oblique}, Lat=${last.slingScores.lateral})`);
});

// 8. Untagged treatments distribute evenly across all slings (legacy parity)
test('untagged treatments distribute slingFunction effect across all slings', () => {
  const ctx = buildConditionContext({ mainComplaint: 'achilles tendinopathy' });
  const proj = simulateBranch(
    baseInput,
    emptyBranch('untagged', [{
      id: 'mc1', treatmentId: 'motor_control', startWeek: 0, doseMultiplier: 1, adherence: 1,
    }]),
    'usual_care',
    undefined,
    undefined,
    ctx,
  );
  const last = proj.states[proj.states.length - 1];
  // Every sling should have moved by roughly the same amount
  const vals = SLING_IDS.map((id) => last.slingScores[id]);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  assert.ok(max - min < 5, `untagged motor_control should lift slings together (range=${(max - min).toFixed(1)})`);
});

// 9. minSlingScores gate triggers when target sling is below threshold
test('minSlingScores gate attenuates treatment when sling under threshold', () => {
  const gatedProfile: TreatmentEffectProfile = {
    id: 'gated_test',
    name: 'Gated POS plyo',
    modality: 'exercise',
    onsetWeeks: 0,
    peakWeeks: 1,
    durationWeeks: 6,
    carryoverWeeks: 1,
    effects: { strength: 10 },
    gates: { minSlingScores: { posterior_oblique: 50 } },
  };
  const weakCtx = buildConditionContext({
    mainComplaint: 'achilles tendinopathy',
    slingSeverities: { posterior_oblique: 90 }, // POS initial = 60 - 90*0.6 = 6
  });
  const strongCtx = buildConditionContext({
    mainComplaint: 'achilles tendinopathy',
    slingSeverities: { posterior_oblique: 0 }, // POS initial = 60 (>= 50 → passes gate)
  });
  const branch: ScenarioBranch = emptyBranch('test', [{
    id: 'g1', treatmentId: 'gated_test', startWeek: 0, doseMultiplier: 1, adherence: 1,
  }]);
  // Disable RNG flare path by stubbing Math.random
  const origRandom = Math.random;
  Math.random = () => 0.99;
  try {
    const weakProj = simulateBranch(baseInput, branch, 'usual_care', undefined, [gatedProfile], weakCtx);
    const strongProj = simulateBranch(baseInput, branch, 'usual_care', undefined, [gatedProfile], strongCtx);
    const weakStrengthGain = weakProj.states[weakProj.states.length - 1].strength - weakProj.states[0].strength;
    const strongStrengthGain = strongProj.states[strongProj.states.length - 1].strength - strongProj.states[0].strength;
    assert.ok(strongStrengthGain > weakStrengthGain + 5,
      `strong-POS strength gain (${strongStrengthGain.toFixed(1)}) should exceed weak-POS gain (${weakStrengthGain.toFixed(1)}) when gate is active`);
    // The gated branch should emit a marker referencing the named sling
    const labels = weakProj.interventionMarkers.map((m) => m.label).join(' | ');
    assert.ok(/Posterior Oblique/.test(labels) || /sling/i.test(labels),
      `expected sling-gating marker, got: ${labels}`);
  } finally {
    Math.random = origRandom;
  }
});

// 10. Natural-recovery driver compensation_burden uses MAX across relevant slings
test('compensation_burden uses max across relevant slings, ignores irrelevant weak slings', () => {
  const ctxImpinge: ConditionContext = buildConditionContext({
    mainComplaint: 'subacromial impingement',
    // Deep longitudinal NOT relevant to mechanical_impingement (relevantSlings = scapular_shoulder, posterior_oblique)
    slingSeverities: { deep_longitudinal: 90, scapular_shoulder: 0, posterior_oblique: 0 },
  });
  const ctxImpingeRelevant: ConditionContext = buildConditionContext({
    mainComplaint: 'subacromial impingement',
    slingSeverities: { scapular_shoulder: 90, posterior_oblique: 0 },
  });
  const irrelevantBiases = computeStructuralBiases(ctxImpinge, {});
  const relevantBiases = computeStructuralBiases(ctxImpingeRelevant, {});
  const irrelevantComp = irrelevantBiases.find((b) => b.id === 'compensation_burden');
  const relevantComp = relevantBiases.find((b) => b.id === 'compensation_burden');
  // Irrelevant weak sling shouldn't show as compensation burden
  assert.ok(!irrelevantComp || irrelevantComp.magnitude < 10,
    `irrelevant deep-long sling should NOT drive compensation_burden (got ${irrelevantComp?.magnitude})`);
  assert.ok(relevantComp && relevantComp.magnitude > 30,
    `relevant scapular sling should drive compensation_burden (got ${relevantComp?.magnitude})`);
});

// 11. Treatment library still exists / aggregate compatibility
test('TREATMENT_LIBRARY still has motor_control and aggregate slingFunction effect', () => {
  const mc = TREATMENT_LIBRARY.find((t) => t.id === 'motor_control');
  assert.ok(mc, 'motor_control profile present');
  assert.equal(mc!.effects.slingFunction, 5);
});

console.log('-----------------------------');
console.log(`${ran - failed}/${ran} passed`);
if (failed > 0) {
  console.log(`${failed} FAILED`);
  process.exit(1);
}
process.exit(0);
