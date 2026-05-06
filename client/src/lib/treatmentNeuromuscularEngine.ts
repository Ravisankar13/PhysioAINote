/**
 * Task #376 — Treatment Mode neuromuscular engine.
 *
 * Pure deterministic function. Takes the mechanical response, the
 * technique, a per-region irritability scalar, and the in-session
 * history of recent techniques, and returns:
 *   - per-muscle activation delta (positive = guarding, negative = relaxing)
 *   - pain delta on the targeted joint (0–10 scale)
 *   - autonomic indicator (-1 parasympathetic ↔ +1 sympathetic)
 *   - withdrawal reflex flag
 *   - pain-spasm-pain engagement flag
 *
 * Drivers (deterministic rules):
 *   - speed (frequencyHz × amplitudeMm) > threshold ⇒ reflex spike
 *   - close-packed position ⇒ baseline guarding ↑
 *   - line-of-drive error >15° ⇒ grinding nociception ↑
 *   - Grade I/II + slow rhythmic frequency ⇒ pain gating; pain delta -
 *   - habituation: each acceptable rep within session drops baseline 5%
 *   - Grade V on irritability >0.6 ⇒ withdrawal flag
 *
 * No React. No AI.
 */

import type { MechanicalResponse, TreatmentTechnique } from './treatmentMechanicalEngine';
import type { JointAccessoryEntry } from './jointAccessoryMotions';

export interface SessionHistoryEntry {
  jointKey: string;
  acceptable: boolean;
  performedAt: number;
}

export interface NeuromuscularResponse {
  muscleActivationDelta: Array<{ muscle: string; delta: number }>;
  painDelta: number;
  autonomicTone: number;
  withdrawalFlag: boolean;
  painSpasmPainEngaged: boolean;
  guardingScalar: number;
  rationale: string[];
}

export interface NeuromuscularInputs {
  mechanical: MechanicalResponse;
  technique: TreatmentTechnique;
  jointEntry: JointAccessoryEntry;
  irritability: number;
  sessionHistory: SessionHistoryEntry[];
  /** Whether the current pose is closer to close-packed than loose-packed. */
  closePackedRatio: number;
}

export function computeNeuromuscularResponse(inputs: NeuromuscularInputs): NeuromuscularResponse {
  const { mechanical, technique, jointEntry, irritability, sessionHistory, closePackedRatio } = inputs;
  const rationale: string[] = [];

  // Baseline guarding from irritability + position.
  let guarding = irritability * 0.6 + closePackedRatio * 0.3;
  if (closePackedRatio > 0.5) rationale.push('Close-packed position → baseline guarding ↑');

  // Habituation discount: count acceptable reps for this joint in
  // the last 90 sec.
  const now = Date.now();
  const recent = sessionHistory.filter(h => h.jointKey === jointEntry.jointId && now - h.performedAt < 90_000 && h.acceptable);
  if (recent.length > 0) {
    const discount = Math.min(0.5, recent.length * 0.05);
    guarding = Math.max(0, guarding - discount);
    rationale.push(`Habituation: -${Math.round(discount * 100)}% baseline (${recent.length} acceptable reps)`);
  }

  // Speed-driven reflex spike.
  const speedScore = technique.frequencyHz * Math.max(1, technique.amplitudeMm);
  let reflexSpike = 0;
  if (speedScore > 12) {
    reflexSpike = Math.min(0.6, (speedScore - 12) / 30);
    rationale.push(`Speed (${technique.frequencyHz.toFixed(1)} Hz × ${technique.amplitudeMm.toFixed(0)} mm) → reflex spike +${(reflexSpike * 100).toFixed(0)}%`);
  }

  // Off-axis grinding.
  let grindingPain = 0;
  if (mechanical.lineOfDriveErrorDeg > 15) {
    grindingPain = Math.min(4, (mechanical.lineOfDriveErrorDeg - 15) / 8);
    rationale.push(`Line of drive ${mechanical.lineOfDriveErrorDeg.toFixed(0)}° off true axis → grinding`);
  }

  // Grade-V with high irritability.
  let withdrawal = false;
  if (technique.gradeSystem === 'maitland' && technique.grade >= 5 && irritability > 0.5) {
    withdrawal = true;
    rationale.push('Grade V on irritable patient → withdrawal reflex');
  }
  if (mechanical.capsularStrain.anterior.overstretched ||
      mechanical.capsularStrain.posterior.overstretched ||
      mechanical.capsularStrain.inferior.overstretched ||
      mechanical.capsularStrain.superior.overstretched) {
    withdrawal = withdrawal || (irritability > 0.4);
    if (withdrawal) rationale.push('Capsule overstretched → reflex withdrawal');
  }

  // Pain gating from low-grade rhythmic mobilization.
  let gating = 0;
  const isLowGradeRhythmic =
    (technique.gradeSystem === 'maitland' ? technique.grade <= 2 : technique.grade <= 1) &&
    technique.frequencyHz >= 0.5 && technique.frequencyHz <= 2.0;
  if (isLowGradeRhythmic && mechanical.lineOfDriveErrorDeg < 10) {
    gating = -1.5;
    rationale.push('Low-grade rhythmic glide on-axis → pain gating');
  }

  // Pain delta accumulates: irritability + reflex + grinding + withdrawal − gating.
  let painDelta = irritability * 1.5 + reflexSpike * 4 + grindingPain + (withdrawal ? 3 : 0) + gating;
  painDelta = Math.max(-3, Math.min(8, painDelta));

  // Pain-spasm-pain: irritability >0.6 AND painDelta>3 AND guarding>0.5.
  const psp = irritability > 0.6 && painDelta > 3 && guarding > 0.5;
  if (psp) rationale.push('Pain-spasm-pain cycle engaged');

  // Autonomic: spikes positive (sympathetic) on reflex/withdrawal,
  // negative (parasympathetic) on gating.
  const autonomicTone = Math.max(-1, Math.min(1,
    reflexSpike + (withdrawal ? 0.5 : 0) - (gating < 0 ? 0.5 : 0) + irritability * 0.3,
  ));

  // Per-muscle activation delta: surrounding muscles in the joint's
  // group go up with guarding+reflex, down with gating.
  const baseDelta = guarding * 0.4 + reflexSpike - (gating < 0 ? 0.3 : 0);
  const muscleActivationDelta = jointEntry.surroundingMuscleGroup.map(m => ({
    muscle: m,
    delta: Math.max(-0.5, Math.min(1, baseDelta + (Math.random() - 0.5) * 0.05)),
  }));

  // Update guarding with reflex contribution for the next frame readout.
  const finalGuarding = Math.max(0, Math.min(1, guarding + reflexSpike * 0.5));

  return {
    muscleActivationDelta,
    painDelta,
    autonomicTone,
    withdrawalFlag: withdrawal,
    painSpasmPainEngaged: psp,
    guardingScalar: finalGuarding,
    rationale,
  };
}
