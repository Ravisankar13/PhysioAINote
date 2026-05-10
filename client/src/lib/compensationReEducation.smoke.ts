/**
 * Compensation Re-Education Engine — smoke test
 * ---------------------------------------------
 * Canonical case: a patient demonstrates left shoulder flexion via an
 * upper-trapezius shrug pattern (no structural pathology, no severe
 * pain) — i.e. a habitual / motor-planning compensation that should
 * be re-trainable. The engine should:
 *   - match the `left_shoulder_flexion__upper_trap_shrug` library entry
 *   - infer driver in {motor_planning, mechanical_block, weakness}
 *   - assign verdict = optimizable (a lower-cost pattern is available
 *     and aggregate cost stays under the harmful threshold)
 *   - propose a non-empty `betterPatternId`
 *   - return cost.cervical >= 0.6 (shrug → cervical load)
 *   - return a populated cost.lumbar field (5-axis schema)
 *   - stamp the same enrichment back onto the cloned detector output
 *
 * Run with: `npx tsx client/src/lib/compensationReEducation.smoke.ts`
 * Exits non-zero on assertion failure.
 */

import { enrichCompensations } from './compensationReEducation';
import type { CompensationResult } from './jointConstraints';

const jointConstraints: CompensationResult = {
  patterns: [
    {
      sourceJoint: 'left_shoulder',
      sourceMovement: 'flexion',
      compensatingJoint: 'left_shoulder',
      compensatingMovement: 'flexion',
      compensationRatio: 0.35,
      additionalLoad: 30,
      clinicalNote: 'Patient elevates the scapula via upper trap to lift the arm — visible shoulder hike on every flexion attempt.',
    },
  ],
  totalCompensation: 0.35,
  overloadedStructures: ['upper trapezius'],
  clinicalWarnings: [{ message: 'Shoulder hike pattern observed.', severity: 'moderate' }],
  postureNotes: ['Mild elevated scapula on left'],
};

const out = enrichCompensations({
  jointConstraints,
  pathology: null,
  sling: null,
  painMarkers: [
    { nearestBone: 'leftHumerus', anatomicalLabel: 'left shoulder', type: 'ache', severity: 3 },
  ],
  patientFlags: { chronicityMonths: 1, structuralDiagnosis: false, fearAvoidance: false },
  activeMovementId: 'left_shoulder:flexion',
});

const fail = (msg: string): never => { console.error('SMOKE FAIL:', msg); process.exit(1); };

if (out.compensations.length === 0) fail('expected at least one enriched compensation');

const shrug = out.compensations.find(c => c.matchedPatternId === 'left_shoulder_flexion__upper_trap_shrug');
if (!shrug) fail(`expected matched pattern left_shoulder_flexion__upper_trap_shrug; got ${out.compensations.map(c => c.matchedPatternId).join(', ')}`);

// Multi-driver attribution: canonical case must surface BOTH
// mechanical_block (source joint can't reach target) AND motor_planning
// (compensation is a learned, retrainable pattern).
if (!shrug!.drivers.includes('mechanical_block')) fail(`expected drivers to include mechanical_block, got ${shrug!.drivers.join(', ')}`);
if (!shrug!.drivers.includes('motor_planning')) fail(`expected drivers to include motor_planning, got ${shrug!.drivers.join(', ')}`);
if (shrug!.driver !== shrug!.drivers[0]) fail(`primary driver should equal drivers[0], got driver=${shrug!.driver} drivers[0]=${shrug!.drivers[0]}`);
if (shrug!.verdict !== 'optimizable') fail(`expected verdict optimizable, got ${shrug!.verdict} (cost=${shrug!.costScore})`);
if (!shrug!.betterPatternId) fail('expected non-empty betterPatternId');
if (shrug!.cost.cervical < 0.6) fail(`expected cost.cervical >= 0.6, got ${shrug!.cost.cervical}`);
if (typeof shrug!.cost.lumbar !== 'number') fail('expected cost.lumbar to be present');
if (!shrug!.retrainingPlanId) fail('expected retrainingPlanId');

// Verify enrichment is also stamped onto the cloned detector output.
const clonedPattern = out.enrichedDetectorOutputs.jointConstraints?.patterns[0];
if (!clonedPattern || !clonedPattern.enrichment) fail('expected enrichedDetectorOutputs.jointConstraints.patterns[0].enrichment to be populated');
if (clonedPattern!.driver !== shrug!.driver) fail(`expected cloned pattern driver=${shrug!.driver}, got ${clonedPattern!.driver}`);
if (clonedPattern!.verdict !== shrug!.verdict) fail(`expected cloned pattern verdict=${shrug!.verdict}, got ${clonedPattern!.verdict}`);
if (clonedPattern!.betterPatternId !== shrug!.betterPatternId) fail('expected cloned pattern betterPatternId to match');

console.log('SMOKE OK ✔');
console.log(JSON.stringify({
  matched: shrug!.matchedPatternId,
  driver: shrug!.driver,
  drivers: shrug!.drivers,
  verdict: shrug!.verdict,
  betterPatternId: shrug!.betterPatternId,
  cost: shrug!.cost,
  costScore: shrug!.costScore,
  retrainingPlanId: shrug!.retrainingPlanId,
  detectorEnrichmentApplied: !!clonedPattern!.enrichment,
}, null, 2));
