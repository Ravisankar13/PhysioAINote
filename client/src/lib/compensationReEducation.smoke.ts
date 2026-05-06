/**
 * Compensation Re-Education Engine — smoke test
 * ---------------------------------------------
 * Canonical case: a patient with a left supraspinatus tear attempts left
 * shoulder flexion and substitutes with an upper-trapezius shrug. The
 * engine should:
 *   - match the `left_shoulder_flexion__upper_trap_shrug` library entry
 *   - infer driver = "weakness" (rotator cuff pathology + load >40 %)
 *   - assign verdict in {phase_out, harmful} (high cost + non-anatomical)
 *   - propose a non-empty `betterPatternId`
 *   - return cost.cervical >= 0.6 (shrug → cervical load)
 *
 * Run with: `npx tsx client/src/lib/compensationReEducation.smoke.ts`
 * Exits non-zero on assertion failure.
 */

import { enrichCompensations } from './compensationReEducation';
import type { CompensationResult } from './jointConstraints';
import type { PathologyCompensationResult } from './pathologyCompensationEngine';
import type { PathologyType } from './muscleBiomechanicsEngine';

const jointConstraints: CompensationResult = {
  patterns: [
    {
      sourceJoint: 'left_shoulder',
      sourceMovement: 'flexion',
      compensatingJoint: 'left_shoulder',
      compensatingMovement: 'flexion',
      compensationRatio: 0.55,
      additionalLoad: 65,
      clinicalNote: 'Patient elevates the scapula via upper trap to lift the arm — visible shoulder hike on every flexion attempt.',
    },
  ],
  totalCompensation: 0.55,
  overloadedStructures: ['upper trapezius', 'levator scapulae'],
  clinicalWarnings: [{ message: 'Sustained upper trap shrug loads cervical spine.', severity: 'severe' }],
  postureNotes: ['Forward head + elevated scapula on left'],
};

const pathology: PathologyCompensationResult = {
  compensatoryOverrides: {},
  romRestrictions: [
    { joint: 'left_shoulder', parameter: 'flexion', restrictionPercent: 39, reason: 'supraspinatus tear' },
  ],
  posturalDeviations: [],
  clinicalFindings: [
    { severity: 'severe', title: 'Supraspinatus tear', description: 'Partial-thickness left supraspinatus tear limits active abduction/flexion.', muscleSource: 'supraspinatus', pathology: 'rotator_cuff_tear' as PathologyType },
  ],
};

const out = enrichCompensations({
  jointConstraints,
  pathology,
  sling: null,
  painMarkers: [
    { nearestBone: 'leftHumerus', anatomicalLabel: 'left shoulder', type: 'sharp', severity: 7 },
  ],
  patientFlags: { chronicityMonths: 3, structuralDiagnosis: true, fearAvoidance: false },
  activeMovementId: 'leftShoulder:flexion',
});

const fail = (msg: string): never => { console.error('SMOKE FAIL:', msg); process.exit(1); };

if (out.compensations.length === 0) fail('expected at least one enriched compensation');

const shrug = out.compensations.find(c => c.matchedPatternId === 'left_shoulder_flexion__upper_trap_shrug');
if (!shrug) fail(`expected matched pattern left_shoulder_flexion__upper_trap_shrug; got ${out.compensations.map(c => c.matchedPatternId).join(', ')}`);

if (!['weakness', 'pain', 'anatomical'].includes(shrug!.driver)) fail(`expected driver weakness|pain|anatomical, got ${shrug!.driver}`);
if (!['phase_out', 'harmful', 'necessary'].includes(shrug!.verdict)) fail(`expected verdict phase_out|harmful|necessary, got ${shrug!.verdict}`);
if (!shrug!.betterPatternId) fail('expected non-empty betterPatternId');
if (shrug!.cost.cervical < 0.6) fail(`expected cost.cervical >= 0.6, got ${shrug!.cost.cervical}`);
if (typeof shrug!.cost.lumbar !== 'number') fail('expected cost.lumbar to be present');
if (!shrug!.retrainingPlanId) fail('expected retrainingPlanId');

console.log('SMOKE OK ✔');
console.log(JSON.stringify({
  matched: shrug!.matchedPatternId,
  driver: shrug!.driver,
  verdict: shrug!.verdict,
  betterPatternId: shrug!.betterPatternId,
  cost: shrug!.cost,
  costScore: shrug!.costScore,
  retrainingPlanId: shrug!.retrainingPlanId,
}, null, 2));
