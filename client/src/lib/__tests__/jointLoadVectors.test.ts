/**
 * Task #239 — Joint load vector tests
 *
 * Standalone runnable test (no test runner installed). Run with:
 *   npx tsx client/src/lib/__tests__/jointLoadVectors.test.ts
 *
 * Asserts the two contracts the task requires:
 *   1. Two skeletons with the SAME overloaded-joint COUNT but DIFFERENT
 *      dominant load directions (compression vs shear) produce DIFFERENT
 *      compensation_burden bias magnitudes — proving the vector-aware
 *      math actually reads the directions, not just the counts.
 *   2. The vector-aware bias magnitude lands inside the same ~5–30 band
 *      that the legacy `count * 6` formula produced (calibration check),
 *      so the rest of the tuned natural-recovery curves are preserved.
 *   3. A treatment declaring `loadModification.unloadsCompression` bends
 *      the recovery curve more for a compression-dominant skeleton than
 *      for a shear-dominant skeleton — proving the engine actually
 *      consumes ConditionContext.jointLoadVectors during simulation.
 */

import {
  computeStructuralBiases,
  type SkeletonBiasInputs,
} from '../naturalRecoveryDriverModel';
import {
  buildConditionContext,
  defaultBranch,
  defaultInput,
  simulateBranch,
  TREATMENT_BY_ID,
  type JointLoadVector,
  type ScenarioBranch,
} from '../recoverySimulationEngine';

let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ ${msg}`); }
}

// --------------------------------------------------------------------------
// Test 1 — same overload count, different directions → different bias
// --------------------------------------------------------------------------
console.log('\nTest 1: same overload count, different load directions →' +
  ' different compensation_burden magnitude');

const compressionDominantVectors: JointLoadVector[] = [
  {
    jointId: 'l5_s1_disc',
    label: 'L5–S1 disc',
    category: 'disc',
    magnitudeBW: 2.0,
    dominantComponent: 'compression',
    components: { compression: 2.0, shear: 0.1, tension: 0.0 },
    dominantTissue: 'disc',
    status: 'high',
  },
  {
    jointId: 'right_hip',
    label: 'Right hip',
    category: 'hip',
    magnitudeBW: 1.8,
    dominantComponent: 'compression',
    components: { compression: 1.8, shear: 0.05, tension: 0.0 },
    dominantTissue: 'cartilage',
    status: 'high',
  },
];

const shearDominantVectors: JointLoadVector[] = [
  {
    jointId: 'l5_s1_disc',
    label: 'L5–S1 disc',
    category: 'disc',
    magnitudeBW: 2.0,
    dominantComponent: 'shear',
    components: { compression: 0.1, shear: 2.0, tension: 0.0 },
    dominantTissue: 'disc',
    status: 'high',
  },
  {
    jointId: 'right_hip',
    label: 'Right hip',
    category: 'hip',
    magnitudeBW: 1.8,
    dominantComponent: 'shear',
    components: { compression: 0.05, shear: 1.8, tension: 0.0 },
    dominantTissue: 'labrum',
    status: 'high',
  },
];

const baseSkel: SkeletonBiasInputs = { jointForceOverloadCount: 2 };

const compressionBiases = computeStructuralBiases(null, {
  ...baseSkel,
  jointLoadVectors: compressionDominantVectors,
});
const shearBiases = computeStructuralBiases(null, {
  ...baseSkel,
  jointLoadVectors: shearDominantVectors,
});

const compBurdenComp = compressionBiases.find(b => b.id === 'compensation_burden');
const compBurdenShear = shearBiases.find(b => b.id === 'compensation_burden');

assert(!!compBurdenComp, 'compression-dominant skeleton produces a compensation_burden bias');
assert(!!compBurdenShear, 'shear-dominant skeleton produces a compensation_burden bias');
assert(
  !!compBurdenComp && !!compBurdenShear &&
    Math.abs(compBurdenComp.magnitude - compBurdenShear.magnitude) > 1,
  `compression vs shear magnitudes differ (compression=${compBurdenComp?.magnitude.toFixed(1)} vs shear=${compBurdenShear?.magnitude.toFixed(1)})`,
);
assert(
  !!compBurdenComp && !!compBurdenShear && compBurdenShear.magnitude > compBurdenComp.magnitude,
  'shear-dominant load yields HIGHER compensation_burden than compression-dominant (shear is the more injurious component)',
);

// --------------------------------------------------------------------------
// Test 2 — calibration: vector-aware magnitude stays in legacy band
// --------------------------------------------------------------------------
console.log('\nTest 2: vector-aware magnitude calibrated to legacy `count * 6` scale');

const legacyBiases = computeStructuralBiases(null, { jointForceOverloadCount: 2 });
const legacyBurden = legacyBiases.find(b => b.id === 'compensation_burden');

assert(!!legacyBurden, 'legacy count-based path still works (fallback)');
assert(
  !!legacyBurden && legacyBurden.magnitude === 12,
  `legacy count-based magnitude = 2 × 6 = 12 (got ${legacyBurden?.magnitude})`,
);
assert(
  !!compBurdenComp && compBurdenComp.magnitude >= 5 && compBurdenComp.magnitude <= 40,
  `vector-aware compression magnitude (${compBurdenComp?.magnitude.toFixed(1)}) sits in calibration band 5–40`,
);
assert(
  !!compBurdenShear && compBurdenShear.magnitude >= 5 && compBurdenShear.magnitude <= 40,
  `vector-aware shear magnitude (${compBurdenShear?.magnitude.toFixed(1)}) sits in calibration band 5–40`,
);

// --------------------------------------------------------------------------
// Test 3 — treatment loadModification bends curves differently
// --------------------------------------------------------------------------
console.log('\nTest 3: rest_offload (unloads compression) bends compression-dominant curve more than shear-dominant curve');

const ctxCompression = buildConditionContext({
  mainComplaint: 'lumbar disc herniation',
  jointLoadVectors: compressionDominantVectors,
});
const ctxShear = buildConditionContext({
  mainComplaint: 'lumbar disc herniation',
  jointLoadVectors: shearDominantVectors,
});

const input = defaultInput();
const branchWithRestOffload: ScenarioBranch = {
  ...defaultBranch(input),
  interventions: [{
    id: 'iv_rest',
    treatmentId: 'rest_offload',
    startWeek: 0,
    doseMultiplier: 1,
    adherence: 1,
  }],
};

assert(TREATMENT_BY_ID.has('rest_offload'), 'rest_offload treatment is in library');
const restOffload = TREATMENT_BY_ID.get('rest_offload');
assert(
  !!restOffload?.loadModification?.unloadsCompression,
  'rest_offload declares loadModification.unloadsCompression',
);

const projComp = simulateBranch(input, branchWithRestOffload, 'usual_care', undefined, [], ctxCompression);
const projShear = simulateBranch(input, branchWithRestOffload, 'usual_care', undefined, [], ctxShear);

// Pick a mid-window week to compare (after onset, during peak effect)
const wk = 4;
const jlComp = projComp.states[wk].jointLoading;
const jlShear = projShear.states[wk].jointLoading;
const ltComp = projComp.states[wk].loadTolerance;
const ltShear = projShear.states[wk].loadTolerance;

console.log(`    week ${wk}: jointLoading compression=${jlComp.toFixed(2)} vs shear=${jlShear.toFixed(2)}`);
console.log(`    week ${wk}: loadTolerance compression=${ltComp.toFixed(2)} vs shear=${ltShear.toFixed(2)}`);

assert(
  jlComp < jlShear,
  `compression skeleton has LOWER jointLoading under rest_offload than shear skeleton (${jlComp.toFixed(2)} < ${jlShear.toFixed(2)})`,
);
assert(
  ltComp > ltShear,
  `compression skeleton gains MORE loadTolerance under rest_offload than shear skeleton (${ltComp.toFixed(2)} > ${ltShear.toFixed(2)})`,
);

// --------------------------------------------------------------------------
// Test 4 — motor_control (distributed redirection) bends shear-dominant
// curve via compensation reduction
// --------------------------------------------------------------------------
console.log('\nTest 4: motor_control (redirectsTo: distributed) actually engages on shear-dominant skeleton');

const branchWithMotorControl: ScenarioBranch = {
  ...defaultBranch(input),
  interventions: [{
    id: 'iv_mc',
    treatmentId: 'motor_control',
    startWeek: 0,
    doseMultiplier: 1,
    adherence: 1,
  }],
};

// Same plan, but ConditionContext WITHOUT vectors → no loadModification fires
const ctxNoVectors = buildConditionContext({ mainComplaint: 'lumbar disc herniation' });
const projNoVectors = simulateBranch(input, branchWithMotorControl, 'usual_care', undefined, [], ctxNoVectors);
const projShearMC = simulateBranch(input, branchWithMotorControl, 'usual_care', undefined, [], ctxShear);

const compNoVec = projNoVectors.states[wk].compensation;
const compShearMC = projShearMC.states[wk].compensation;
console.log(`    week ${wk}: compensation no-vectors=${compNoVec.toFixed(2)} vs shear-with-vectors=${compShearMC.toFixed(2)}`);
assert(
  compShearMC < compNoVec,
  `motor_control reduces compensation MORE on a shear-dominant skeleton than on a vector-less ConditionContext (${compShearMC.toFixed(2)} < ${compNoVec.toFixed(2)})`,
);

// --------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
