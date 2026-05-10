/**
 * Task #376 — Treatment Mode mechanical engine.
 *
 * Pure deterministic function that, given a manual technique and the
 * patient's current state, returns the mechanical response: targeted
 * bone translation in mm, capsular strain per region, joint
 * compression/distraction, force transmitted to adjacent segments, and
 * a position-advantage scalar.
 *
 * Translation magnitude formula:
 *   t_mm = grade × availableMobility × positionAdvantage × (1 - guardingPenalty)
 * clamped at the available accessory range. `availableMobility` is the
 * patient's *current* per-direction accessory mobility (mm) which may
 * already be reduced by pathology. `positionAdvantage` ranges 0.2–1.0
 * (loose-packed = 1.0).
 *
 * No React. No AI. Safe to call at 60 Hz.
 */

import {
  type JointAccessoryEntry,
  type AccessoryDirection,
  type CapsularRegion,
  angleBetweenDeg,
  normalize,
  computePositionAdvantage,
} from './jointAccessoryMotions';

export type GradeSystem = 'maitland' | 'kaltenborn';

export interface TreatmentTechnique {
  jointKey: string;
  directionId: string;
  /** Live line-of-drive (clinician may rotate off-axis). */
  liveAxis: { x: number; y: number; z: number };
  gradeSystem: GradeSystem;
  /** Maitland I–V or Kaltenborn I–III. */
  grade: number;
  /** 0–10 mm amplitude of the oscillation. */
  amplitudeMm: number;
  /** Hz. */
  frequencyHz: number;
  /** Seconds of the technique bout. */
  durationSec: number;
  /** Hold time at end-range, sec (Kaltenborn-style sustained). */
  holdSec: number;
}

export interface PatientTreatmentState {
  /** Current per-direction accessory mobility (mm). Indexed `${jointKey}:${directionId}`. */
  accessoryMobilityMm: Record<string, number>;
  /** Capsular extensibility per region (0–1) keyed `${jointKey}:${region}`. */
  capsularExtensibility: Record<string, number>;
  /** Current pose snapshot (joint-angle map). */
  pose: Record<string, number>;
  /** Region-level guarding scalar 0–1 (set by neuromuscular layer). */
  guardingScalar: number;
}

export interface MechanicalResponse {
  translationMm: { x: number; y: number; z: number; magnitude: number };
  /** Strain 0–1 per region; >1 = overstretched. */
  capsularStrain: Record<CapsularRegion, { value: number; overstretched: boolean }>;
  /** Negative = distraction, positive = compression. */
  compressionScalar: number;
  /** Sympathy force transmitted to adjacent segment (unitless 0–1). */
  adjacentForce: { bone: string; magnitude: number; axis: { x: number; y: number; z: number } } | null;
  positionAdvantage: number;
  /** Degrees off the canonical accessory axis. */
  lineOfDriveErrorDeg: number;
  /** True when translation hit its capsular cap. */
  saturated: boolean;
}

export interface MechanicalEngineInputs {
  technique: TreatmentTechnique;
  patientState: PatientTreatmentState;
  jointEntry: JointAccessoryEntry;
  direction: AccessoryDirection;
}

const EMPTY_REGIONS: CapsularRegion[] = ['anterior', 'posterior', 'inferior', 'superior'];

function gradeNormalised(t: TreatmentTechnique): number {
  if (t.gradeSystem === 'maitland') return Math.max(0, Math.min(1, t.grade / 5));
  // Kaltenborn I–III, with III being end-range stretch.
  return Math.max(0, Math.min(1, t.grade / 3));
}

export function computeMechanicalResponse(inputs: MechanicalEngineInputs): MechanicalResponse {
  const { technique, patientState, jointEntry, direction } = inputs;
  const liveAxis = normalize(technique.liveAxis);
  const canonical = normalize(direction.axis);
  const errorDeg = angleBetweenDeg(liveAxis, canonical);

  // Off-axis component bleeds energy into shear; only the on-axis
  // projection contributes to glide translation.
  const onAxisProjection = Math.max(0, liveAxis.x * canonical.x + liveAxis.y * canonical.y + liveAxis.z * canonical.z);

  const grade01 = gradeNormalised(technique);
  const positionAdv = computePositionAdvantage(jointEntry, patientState.pose);
  const guardingPenalty = Math.max(0, Math.min(0.9, patientState.guardingScalar));

  const mobilityKey = `${technique.jointKey}:${direction.id}`;
  const availableMm = patientState.accessoryMobilityMm[mobilityKey] ?? direction.availableMobilityMm * 0.7;

  const rawMm = grade01 * availableMm * positionAdv * (1 - guardingPenalty) * onAxisProjection;
  const magnitude = Math.max(0, Math.min(availableMm * 1.05, rawMm));
  const saturated = magnitude >= availableMm * 0.99;

  const translationMm = {
    x: liveAxis.x * magnitude,
    y: liveAxis.y * magnitude,
    z: liveAxis.z * magnitude,
    magnitude,
  };

  // Capsular strain: the strained region absorbs (magnitude / available) load.
  // Off-axis components leak into the orthogonal regions as small strain.
  const capsular: Record<CapsularRegion, { value: number; overstretched: boolean }> = {
    anterior: { value: 0, overstretched: false },
    posterior: { value: 0, overstretched: false },
    inferior: { value: 0, overstretched: false },
    superior: { value: 0, overstretched: false },
  };
  const strainBase = magnitude / Math.max(1, availableMm);
  const extensibility = patientState.capsularExtensibility[`${technique.jointKey}:${direction.strainedRegion}`] ?? 0.5;
  // Lower extensibility means the same translation produces more strain.
  const strain = strainBase * (1.4 - extensibility);
  capsular[direction.strainedRegion] = { value: strain, overstretched: strain > 1.0 };

  // Off-axis error spreads strain into adjacent regions.
  if (errorDeg > 5) {
    const leak = Math.min(0.6, errorDeg / 90);
    for (const r of EMPTY_REGIONS) {
      if (r !== direction.strainedRegion) {
        capsular[r].value = Math.min(1.2, capsular[r].value + strainBase * leak * 0.4);
        capsular[r].overstretched = capsular[r].value > 1.0;
      }
    }
  }

  // Compression vs distraction: distraction directions point inferiorly
  // or laterally away from joint; their dot with the joint's "into-surface"
  // vector (treat +Y as compression for distal joints) is negative.
  const compressionScalar = -(translationMm.y) / Math.max(1, availableMm);

  let adjacentForce: MechanicalResponse['adjacentForce'] = null;
  if (direction.adjacentSegment) {
    adjacentForce = {
      bone: direction.adjacentSegment.bone,
      magnitude: magnitude * direction.adjacentSegment.coupling,
      axis: liveAxis,
    };
  }

  return {
    translationMm,
    capsularStrain: capsular,
    compressionScalar,
    adjacentForce,
    positionAdvantage: positionAdv,
    lineOfDriveErrorDeg: errorDeg,
    saturated,
  };
}
