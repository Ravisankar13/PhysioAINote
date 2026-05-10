/**
 * Task #376 — Treatment Mode clinical engine.
 *
 * Integrates the mechanical and neuromuscular responses across the
 * technique's duration and reports immediate clinical outcomes:
 *   - ROM delta at the targeted joint (degrees) per direction
 *   - pain delta (signed)
 *   - capsular extensibility delta per region (0–1)
 *   - treatmentEffectivenessScore (0–100)
 *   - auto-generated technique string for cart / SOAP
 *   - one-sentence clinical summary
 *
 * The clinical outcome is the *integral* of the per-frame mechanical
 * × neuromuscular productivity over the technique duration. A Grade
 * IV with high guarding for 30 s yields less ROM gain than the same
 * Grade IV with low guarding for the same duration.
 *
 * Pure / deterministic / no React.
 */

import type { MechanicalResponse, TreatmentTechnique, PatientTreatmentState } from './treatmentMechanicalEngine';
import type { NeuromuscularResponse } from './treatmentNeuromuscularEngine';
import type { JointAccessoryEntry, AccessoryDirection, CapsularRegion } from './jointAccessoryMotions';

export interface ClinicalOutcome {
  /** ROM deltas in degrees keyed by configKey. */
  romDelta: Record<string, number>;
  painDelta: number;
  capsularExtensibilityDelta: Record<string, number>;
  /** 0–100. */
  treatmentEffectivenessScore: number;
  techniqueString: string;
  clinicalSummary: string;
}

export interface ClinicalEngineInputs {
  mechanical: MechanicalResponse;
  neuromuscular: NeuromuscularResponse;
  technique: TreatmentTechnique;
  patientState: PatientTreatmentState;
  jointEntry: JointAccessoryEntry;
  direction: AccessoryDirection;
  /** Patient label for display ("supine", etc.). */
  positionLabel: string;
}

function gradeLabel(t: TreatmentTechnique): string {
  if (t.gradeSystem === 'maitland') {
    return ['', 'I', 'II', 'III', 'IV', 'V'][Math.max(1, Math.min(5, Math.round(t.grade)))];
  }
  return ['', 'I', 'II', 'III'][Math.max(1, Math.min(3, Math.round(t.grade)))];
}

/**
 * 1 mm of accessory glide → ~1.5° of associated osteokinematic ROM
 * is a clinically reasonable ratio (Maitland 2005, Hengeveld 2014). We
 * tune it per-joint via `romPerMm` below.
 */
const ROM_PER_MM: Partial<Record<JointAccessoryEntry['jointId'], number>> = {
  GHJ: 2.0,
  hip: 1.4,
  tibiofemoral: 1.6,
  talocrural: 2.5,
};

export function computeClinicalOutcome(inputs: ClinicalEngineInputs): ClinicalOutcome {
  const { mechanical, neuromuscular, technique, jointEntry, direction, positionLabel } = inputs;

  // Productivity per second: on-axis translation × low-guarding × within-extensibility.
  const productivity = mechanical.translationMm.magnitude
    * (1 - neuromuscular.guardingScalar)
    * (mechanical.saturated ? 0.5 : 1.0)
    * (1 - Math.min(0.6, mechanical.lineOfDriveErrorDeg / 90));

  // Effective dose: oscillations at frequency add up over duration.
  const effectiveOscillations = technique.frequencyHz * technique.durationSec;
  const integratedMm = productivity * Math.min(60, technique.durationSec) / 60 + productivity * Math.log1p(effectiveOscillations) * 0.05;

  const romPerMm = ROM_PER_MM[jointEntry.jointId] ?? 1.5;
  const romGainDeg = integratedMm * romPerMm * 0.5;

  const romDelta: Record<string, number> = {};
  romDelta[jointEntry.primaryRomDof.configKey] = +(romGainDeg.toFixed(2));

  // Capsular extensibility ratchet: only ~0.3% per mm of productive
  // strain per session, cap at +0.15 per technique bout.
  const extKey = `${technique.jointKey}:${direction.strainedRegion}`;
  const extDelta = Math.min(0.15, integratedMm * 0.012 * (mechanical.saturated ? 0.6 : 1.0));
  const capsularExtensibilityDelta: Record<string, number> = { [extKey]: +(extDelta.toFixed(3)) };

  const painDelta = neuromuscular.painDelta < 0
    ? Math.max(-3, neuromuscular.painDelta * (technique.durationSec / 30))
    : Math.min(6, neuromuscular.painDelta);

  // Effectiveness score 0–100.
  const productivity01 = Math.max(0, Math.min(1, productivity / Math.max(1, mechanical.translationMm.magnitude || 1)));
  const guardingPenalty = neuromuscular.guardingScalar;
  const doseAdequacy = technique.durationSec >= 20 && technique.durationSec <= 90 ? 1
    : technique.durationSec < 20 ? technique.durationSec / 20
      : Math.max(0.5, 90 / technique.durationSec);
  const score = Math.round(100 * productivity01 * (1 - guardingPenalty * 0.7) * doseAdequacy);

  const grade = gradeLabel(technique);
  const techniqueString =
    `${technique.gradeSystem === 'maitland' ? 'Maitland' : 'Kaltenborn'} Grade ${grade} ${direction.label}, ${jointEntry.label}, ${positionLabel || 'as positioned'}, ${technique.frequencyHz.toFixed(1)} Hz, ${technique.amplitudeMm.toFixed(0)} mm, ${Math.round(technique.durationSec)} s`;

  const summaryParts: string[] = [];
  summaryParts.push(`${direction.label} × ${Math.round(technique.durationSec)} s`);
  if (romGainDeg > 0.5) summaryParts.push(`+${romGainDeg.toFixed(1)}° ${jointEntry.primaryRomDof.label}`);
  if (painDelta > 0.5) summaryParts.push(`pain +${painDelta.toFixed(1)}/10`);
  else if (painDelta < -0.5) summaryParts.push(`pain ${painDelta.toFixed(1)}/10`);
  if (extDelta > 0.01) summaryParts.push(`capsule +${(extDelta * 100).toFixed(0)}%`);
  if (neuromuscular.withdrawalFlag) summaryParts.push('withdrawal triggered');
  if (neuromuscular.painSpasmPainEngaged) summaryParts.push('pain-spasm cycle engaged');

  return {
    romDelta,
    painDelta,
    capsularExtensibilityDelta,
    treatmentEffectivenessScore: Math.max(0, Math.min(100, score)),
    techniqueString,
    clinicalSummary: summaryParts.join(' · '),
  };
}

export interface TechniqueQualityScorecard {
  positionCorrectness: { score: number; rationale: string };
  gradeAppropriateness: { score: number; rationale: string };
  lineOfDriveAccuracy: { score: number; rationale: string };
  contraindicationCheck: { score: number; rationale: string };
  doseAdequacy: { score: number; rationale: string };
  overall: number;
}

export function computeTechniqueQuality(
  technique: TreatmentTechnique,
  mechanical: MechanicalResponse,
  irritability: number,
  contraindications: string[],
): TechniqueQualityScorecard {
  const positionCorrectness = {
    score: Math.round(mechanical.positionAdvantage * 100),
    rationale: mechanical.positionAdvantage > 0.85
      ? 'Loose-packed — optimal joint play'
      : mechanical.positionAdvantage > 0.5
        ? 'Mid-range — acceptable accessory motion'
        : 'Close-packed — accessory motion limited',
  };

  let gradeScore: number;
  let gradeRationale: string;
  if (technique.gradeSystem === 'maitland' && technique.grade >= 5 && irritability > 0.4) {
    gradeScore = 20;
    gradeRationale = 'Grade V contraindicated on irritable joint';
  } else if (technique.grade >= 4 && irritability > 0.7) {
    gradeScore = 40;
    gradeRationale = 'Grade ≥IV is aggressive on highly irritable patient';
  } else if (irritability > 0.5 && technique.grade <= 2) {
    gradeScore = 95;
    gradeRationale = 'Low-grade chosen for irritable presentation — appropriate';
  } else {
    gradeScore = 80;
    gradeRationale = 'Grade matches presentation';
  }

  const lineOfDriveAccuracy = {
    score: Math.max(0, Math.round(100 - mechanical.lineOfDriveErrorDeg * 2)),
    rationale: mechanical.lineOfDriveErrorDeg < 5
      ? 'On true accessory axis'
      : mechanical.lineOfDriveErrorDeg < 15
        ? `${mechanical.lineOfDriveErrorDeg.toFixed(0)}° off — within tolerance`
        : `${mechanical.lineOfDriveErrorDeg.toFixed(0)}° off — re-align line of drive`,
  };

  const contraindicationCheck = {
    score: contraindications.length === 0 ? 100 : 0,
    rationale: contraindications.length === 0 ? 'No flagged contraindications' : `Flagged: ${contraindications.join(', ')}`,
  };

  const adequateDose = technique.durationSec >= 20 && technique.durationSec <= 120;
  const doseAdequacy = {
    score: adequateDose ? 90 : technique.durationSec < 20 ? Math.round((technique.durationSec / 20) * 80) : 60,
    rationale: adequateDose
      ? 'Within evidence-based dosing window (20–120 s per bout)'
      : technique.durationSec < 20 ? 'Bout under-dosed — extend to ≥20 s' : 'Bout over-dosed — split into shorter sets',
  };

  const overall = Math.round(
    (positionCorrectness.score + gradeScore + lineOfDriveAccuracy.score + contraindicationCheck.score + doseAdequacy.score) / 5,
  );

  return {
    positionCorrectness,
    gradeAppropriateness: { score: gradeScore, rationale: gradeRationale },
    lineOfDriveAccuracy,
    contraindicationCheck,
    doseAdequacy,
    overall,
  };
}
