/**
 * Task #240 — Patient factor direction semantics tests
 *
 * Standalone runnable test (no test runner installed). Run with:
 *   npx tsx client/src/lib/__tests__/patientFactorsDirection.test.ts
 *
 * Asserts that every modifierBreakdown row produced by
 * `computePatientModifiers` carries a `direction` and `targetMetric`
 * that matches the *actual* modeled effect, so the dashboard's
 * "What's affecting this curve" panel can never invert helping vs
 * hurting (the bug fixed in the third review of Task #240).
 *
 * Coverage matrix:
 *   - chronicity: acute / chronic / recurrent
 *   - sleepQuality: poor / fair
 *   - activityLevel: sedentary / athletic
 *   - irritability: high / low
 *   - sportPosition (informational, not modeled)
 *   - informational rows excluded from "applied" set
 */

import {
  computePatientModifiers,
  DEFAULT_PATIENT_FACTORS,
  type PatientFactors,
} from '../patientFactorsEngine';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); }
}

function findRow(factors: PatientFactors, factorName: string | RegExp, effectMatch: RegExp) {
  const rows = computePatientModifiers(factors).modifierBreakdown;
  return rows.find(r =>
    (typeof factorName === 'string' ? r.factor === factorName : factorName.test(r.factor))
    && effectMatch.test(r.effect)
  );
}

// --- Chronicity ---
{
  const acute = findRow({ ...DEFAULT_PATIENT_FACTORS, chronicity: 'acute' }, 'Chronicity', /Acute/);
  assert(acute?.direction === 'helping', `Chronicity:acute expected helping, got ${acute?.direction}`);
  assert(acute?.targetMetric === 'multiple', `Chronicity:acute expected targetMetric multiple`);

  const chronic = findRow({ ...DEFAULT_PATIENT_FACTORS, chronicity: 'chronic' }, 'Chronicity', /Chronic/);
  assert(chronic?.direction === 'hurting', `Chronicity:chronic expected hurting, got ${chronic?.direction}`);

  const recurrent = findRow({ ...DEFAULT_PATIENT_FACTORS, chronicity: 'recurrent' }, 'Chronicity', /Recurrent/);
  assert(recurrent?.direction === 'hurting', `Chronicity:recurrent expected hurting, got ${recurrent?.direction}`);
}

// --- Sleep quality ---
{
  const poor = findRow({ ...DEFAULT_PATIENT_FACTORS, sleepQuality: 'poor' }, 'Sleep quality', /Poor/);
  assert(poor?.direction === 'hurting', `Sleep:poor expected hurting, got ${poor?.direction}`);

  const fair = findRow({ ...DEFAULT_PATIENT_FACTORS, sleepQuality: 'fair' }, 'Sleep quality', /Fair/);
  assert(fair?.direction === 'hurting', `Sleep:fair expected hurting, got ${fair?.direction}`);
}

// --- Activity level ---
{
  const sed = findRow({ ...DEFAULT_PATIENT_FACTORS, activityLevel: 'sedentary' }, 'Activity level', /Sedentary/);
  assert(sed?.direction === 'hurting', `Activity:sedentary expected hurting, got ${sed?.direction}`);

  const ath = findRow({ ...DEFAULT_PATIENT_FACTORS, activityLevel: 'athletic' }, 'Activity level', /Athletic/);
  assert(ath?.direction === 'helping', `Activity:athletic expected helping, got ${ath?.direction}`);
}

// --- Irritability ---
{
  const hi = findRow({ ...DEFAULT_PATIENT_FACTORS, irritability: 'high' }, 'Irritability', /High/);
  assert(hi?.direction === 'hurting', `Irritability:high expected hurting, got ${hi?.direction}`);

  const lo = findRow({ ...DEFAULT_PATIENT_FACTORS, irritability: 'low' }, 'Irritability', /Low/);
  assert(lo?.direction === 'helping', `Irritability:low expected helping, got ${lo?.direction}`);
}

// --- Sport position (informational, not modeled) ---
{
  const row = findRow(
    { ...DEFAULT_PATIENT_FACTORS, sportPosition: 'goalkeeper' },
    'Sport position',
    /goalkeeper/i
  );
  assert(row?.direction === 'informational', `Sport position expected informational, got ${row?.direction}`);
  assert(row?.targetMetric === 'none', `Sport position expected targetMetric none, got ${row?.targetMetric}`);
  assert(row?.multiplier === 1.0, `Sport position expected multiplier 1.0`);
}

// --- Informational rows are produced for the documented "shown but not applied" factors ---
{
  const optimalSleep = findRow(
    { ...DEFAULT_PATIENT_FACTORS, sleepHours: 8 },
    /Sleep/,
    /Optimal/
  );
  assert(optimalSleep?.direction === 'informational', `Optimal sleep window expected informational, got ${optimalSleep?.direction}`);

  const highProtein = findRow(
    { ...DEFAULT_PATIENT_FACTORS, proteinIntake: 'high' },
    'Protein intake (high)',
    /repair/i
  );
  assert(highProtein?.direction === 'informational', `High protein expected informational, got ${highProtein?.direction}`);
}

// --- recurrenceRisk: lower-is-better. A 0.95 multiplier on recurrenceRisk
//     would be HELPING. A 1.x multiplier (which this codebase represents
//     in the breakdown row as <1 effect) is HURTING. Verify the hard-surface
//     row (which raises recurrenceRisk) is correctly tagged hurting. ---
{
  const surface = findRow({ ...DEFAULT_PATIENT_FACTORS, sportSurface: 'hard' }, 'Hard sport surface', /impact/);
  assert(surface?.direction === 'hurting', `Hard surface expected hurting, got ${surface?.direction}`);
  assert(surface?.targetMetric === 'recurrenceRisk', `Hard surface expected targetMetric recurrenceRisk`);
}

console.log(`\n=== Patient factor direction tests ===`);
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);
if (fail > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
