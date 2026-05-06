/**
 * Task #376 — Treatment-state reducer.
 *
 * Folds a per-technique clinical outcome into the persisted patient
 * treatment state (capsular extensibility ratchet, accessory mobility
 * increment, pain shift). Used by the "Perform" commit handler to
 * derive the new state that will be PATCHed to the server.
 *
 * Pure / deterministic / no React.
 */

import type { ClinicalOutcome } from './treatmentClinicalEngine';
import type { PatientTreatmentState } from './treatmentMechanicalEngine';
import type { TreatmentTechnique } from './treatmentMechanicalEngine';

export interface TreatmentLogEntry {
  id: string;
  technique: string;
  parameters: {
    jointKey: string;
    directionId: string;
    grade: number;
    gradeSystem: 'maitland' | 'kaltenborn';
    amplitudeMm: number;
    frequencyHz: number;
    durationSec: number;
  };
  performedAt: string;
  mechanicalDelta: { translationMm: number; saturated: boolean; lineOfDriveErrorDeg: number };
  clinicalDelta: { romDeltaDeg: number; painDelta: number; capsularExtensibilityDelta: number; effectivenessScore: number };
}

export interface PersistedTreatmentState {
  accessoryMobilityMm: Record<string, number>;
  capsularExtensibility: Record<string, number>;
  log: TreatmentLogEntry[];
}

export function defaultTreatmentState(): PersistedTreatmentState {
  return { accessoryMobilityMm: {}, capsularExtensibility: {}, log: [] };
}

export function applyTreatmentToPatientState(
  current: PersistedTreatmentState,
  outcome: ClinicalOutcome,
  technique: TreatmentTechnique,
): PersistedTreatmentState {
  const next: PersistedTreatmentState = {
    accessoryMobilityMm: { ...current.accessoryMobilityMm },
    capsularExtensibility: { ...current.capsularExtensibility },
    log: [...current.log],
  };
  // Capsular extensibility ratchet (cap at 1.0).
  for (const [key, delta] of Object.entries(outcome.capsularExtensibilityDelta)) {
    const prev = next.capsularExtensibility[key] ?? 0.5;
    next.capsularExtensibility[key] = Math.max(0, Math.min(1.0, prev + delta));
  }
  // Accessory mobility increment: roughly 0.5 mm per +0.1 extensibility.
  const accKey = `${technique.jointKey}:${technique.directionId}`;
  const prevMm = next.accessoryMobilityMm[accKey] ?? 7;
  const extDelta = Object.values(outcome.capsularExtensibilityDelta)[0] ?? 0;
  next.accessoryMobilityMm[accKey] = Math.max(0, prevMm + extDelta * 5);

  return next;
}

export function appendTreatmentLog(
  current: PersistedTreatmentState,
  entry: TreatmentLogEntry,
): PersistedTreatmentState {
  return {
    ...current,
    log: [...current.log, entry],
  };
}

export function buildLogEntry(
  outcome: ClinicalOutcome,
  technique: TreatmentTechnique,
  mechanical: { translationMm: { magnitude: number }; saturated: boolean; lineOfDriveErrorDeg: number },
): TreatmentLogEntry {
  const romDeltaDeg = Object.values(outcome.romDelta)[0] ?? 0;
  const extDelta = Object.values(outcome.capsularExtensibilityDelta)[0] ?? 0;
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    technique: outcome.techniqueString,
    parameters: {
      jointKey: technique.jointKey,
      directionId: technique.directionId,
      grade: technique.grade,
      gradeSystem: technique.gradeSystem,
      amplitudeMm: technique.amplitudeMm,
      frequencyHz: technique.frequencyHz,
      durationSec: technique.durationSec,
    },
    performedAt: new Date().toISOString(),
    mechanicalDelta: {
      translationMm: +mechanical.translationMm.magnitude.toFixed(2),
      saturated: mechanical.saturated,
      lineOfDriveErrorDeg: +mechanical.lineOfDriveErrorDeg.toFixed(1),
    },
    clinicalDelta: {
      romDeltaDeg,
      painDelta: outcome.painDelta,
      capsularExtensibilityDelta: extDelta,
      effectivenessScore: outcome.treatmentEffectivenessScore,
    },
  };
}
