import type { PainCorrelation } from './crossSystemCorrelation';
import type { MyofascialChain, PropagatedMuscleState, ChainEffect } from './myofascialChains';
import type { ScarMarker, AdhesionBand, ScarImpact, ScarType } from './scarTissueMapping';
import { getScarImpact } from './scarTissueMapping';

export type PainDriverCategory =
  | 'structural'
  | 'biomechanical'
  | 'myofascial'
  | 'fascial_chain'
  | 'scar_tissue'
  | 'referred'
  | 'compensatory';

export type PainDriverSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface PainDriver {
  id: string;
  category: PainDriverCategory;
  label: string;
  description: string;
  evidenceScore: number;
  mechanism: string;
  relatedStructures: string[];
  severity: PainDriverSeverity;
}

export interface PainDriverReport {
  markerId: string;
  region: string;
  drivers: PainDriver[];
  primaryDriver: PainDriver;
  narrative: string;
  totalDriverCount: number;
}

interface ForceData {
  id: string;
  label: string;
  category: string;
  compression: number;
  tension: number;
  shear: number;
  totalForce: number;
  status: 'low' | 'moderate' | 'high' | 'very_high';
  clinical: string;
}

interface MuscleData {
  id: string;
  label: string;
  lengthPercent: number;
  activationPercent: number;
  tightnessPercent: number;
  inhibitionPercent: number;
  clinicalStatus: string;
  clinicalNote: string;
  state: string;
}

interface FascialData {
  chains: MyofascialChain[];
  tensions: Record<string, number>;
  propagatedEffects?: Record<string, PropagatedMuscleState>;
  chainEffects?: ChainEffect[];
}

interface ScarData {
  scars: ScarMarker[];
  adhesions: AdhesionBand[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getSeverity(score: number): PainDriverSeverity {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

function computeStructuralDrivers(
  correlation: PainCorrelation,
  forces: ForceData[]
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const rf of correlation.relatedForces) {
    const statusScore: Record<string, number> = {
      very_high: 85,
      high: 60,
      moderate: 30,
      low: 10,
    };
    const baseScore = statusScore[rf.status] ?? 10;

    const compressionWeight = rf.compression / Math.max(rf.totalForce, 0.01);
    const shearWeight = rf.shear / Math.max(rf.totalForce, 0.01);
    const dominantForce = rf.compression > rf.shear ? 'compressive' : 'shear';
    const dominantValue = Math.max(rf.compression, rf.shear).toFixed(2);

    const proximityBonus = 10;
    const evidenceScore = clamp(baseScore + proximityBonus * compressionWeight + proximityBonus * shearWeight, 0, 100);

    drivers.push({
      id: `structural_${rf.jointId}`,
      category: 'structural',
      label: `${rf.jointLabel} — ${dominantForce} loading at ${dominantValue} BW`,
      description: rf.clinical,
      evidenceScore: Math.round(evidenceScore),
      mechanism: rf.contributionToPin,
      relatedStructures: [rf.jointLabel],
      severity: getSeverity(evidenceScore),
    });
  }

  return drivers;
}

function computeBiomechanicalDrivers(
  correlation: PainCorrelation
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const pattern of correlation.compensationPatterns) {
    const severityScore: Record<string, number> = {
      severe: 70,
      moderate: 45,
      mild: 20,
    };
    const baseScore = severityScore[pattern.severity] ?? 20;
    const structureBonus = Math.min(pattern.involvedStructures.length * 5, 20);
    const evidenceScore = clamp(baseScore + structureBonus, 0, 100);

    drivers.push({
      id: `biomech_${pattern.pattern.replace(/\s+/g, '_').toLowerCase()}`,
      category: 'biomechanical',
      label: pattern.pattern,
      description: pattern.description,
      evidenceScore: Math.round(evidenceScore),
      mechanism: `Postural deviation creating abnormal loading: ${pattern.description}`,
      relatedStructures: pattern.involvedStructures,
      severity: getSeverity(evidenceScore),
    });
  }

  for (const chain of correlation.relatedChains) {
    if (chain.relevanceScore >= 40) {
      const evidenceScore = clamp(chain.relevanceScore * 0.6, 0, 100);
      const muscleList = chain.relevantLinks.flatMap(l => l.muscles);

      drivers.push({
        id: `biomech_chain_${chain.chainId}`,
        category: 'biomechanical',
        label: `${chain.chainLabel} kinetic chain dysfunction`,
        description: chain.relevanceReason,
        evidenceScore: Math.round(evidenceScore),
        mechanism: `Kinetic chain linkage through ${chain.chainLabel} transmitting forces to pain region`,
        relatedStructures: muscleList.slice(0, 5),
        severity: getSeverity(evidenceScore),
      });
    }
  }

  return drivers;
}

function computeMyofascialDrivers(
  correlation: PainCorrelation,
  muscles: MuscleData[]
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const rm of correlation.relatedMuscles) {
    if (rm.contributionType !== 'direct') continue;

    const statusScores: Record<string, number> = {
      shortened: 55,
      lengthened: 45,
      overactive: 60,
      inhibited: 50,
      spasm: 70,
      weak: 40,
      normal: 5,
    };
    const baseScore = statusScores[rm.clinicalStatus] ?? 10;

    const tightnessBonus = rm.tightness > 50 ? (rm.tightness - 50) * 0.4 : 0;
    const inhibitionBonus = rm.inhibition > 30 ? (rm.inhibition - 30) * 0.3 : 0;
    const evidenceScore = clamp(baseScore + tightnessBonus + inhibitionBonus, 0, 100);

    drivers.push({
      id: `myofascial_${rm.muscleId}`,
      category: 'myofascial',
      label: `${rm.muscleLabel} — ${rm.clinicalStatus}`,
      description: rm.explanation,
      evidenceScore: Math.round(evidenceScore),
      mechanism: `${rm.muscleLabel} is ${rm.clinicalStatus}, directly affecting the pain region through altered force production and tissue loading`,
      relatedStructures: [rm.muscleLabel],
      severity: getSeverity(evidenceScore),
    });
  }

  return drivers;
}

function computeFascialChainDrivers(
  correlation: PainCorrelation,
  fascialData?: FascialData
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const fc of correlation.relatedFascialChains) {
    const tensionDeviation = Math.abs(fc.avgTension - 50);
    if (tensionDeviation < 5) continue;

    const tensionScore = clamp(tensionDeviation * 1.5, 0, 70);
    const propagationBonus = Math.abs(fc.propagationDelta) > 5 ? Math.min(Math.abs(fc.propagationDelta) * 0.5, 20) : 0;
    const evidenceScore = clamp(tensionScore + propagationBonus, 0, 100);

    const direction = fc.avgTension > 50 ? 'elevated' : 'reduced';

    drivers.push({
      id: `fascial_${fc.chainId}`,
      category: 'fascial_chain',
      label: `${fc.chainName} tension ${direction} at ${Math.round(fc.avgTension)}%`,
      description: fc.relevance,
      evidenceScore: Math.round(evidenceScore),
      mechanism: `${fc.chainName} has ${direction} tension (${Math.round(fc.avgTension)}%) propagating through the pain region with a delta of ${fc.propagationDelta.toFixed(1)}`,
      relatedStructures: [fc.chainName],
      severity: getSeverity(evidenceScore),
    });
  }

  if (fascialData?.chainEffects) {
    const seen = new Set(correlation.relatedFascialChains.map(fc => fc.chainId));
    for (const effect of fascialData.chainEffects) {
      if (seen.has(effect.chainId)) continue;
      if (Math.abs(effect.tensionDelta) < 3) continue;

      const evidenceScore = clamp(Math.abs(effect.tensionDelta) * 1.2, 0, 60);
      drivers.push({
        id: `fascial_effect_${effect.chainId}_${effect.sourceMuscle}`,
        category: 'fascial_chain',
        label: `${effect.chainName} tension propagation from ${effect.sourceMuscle}`,
        description: `Tension delta of ${effect.tensionDelta.toFixed(1)} propagated through ${effect.chainName}`,
        evidenceScore: Math.round(evidenceScore),
        mechanism: `${effect.sourceMuscle} creating tension propagation (${effect.tensionDelta.toFixed(1)}) through ${effect.chainName}`,
        relatedStructures: [effect.chainName, effect.sourceMuscle],
        severity: getSeverity(evidenceScore),
      });
    }
  }

  return drivers;
}

function computeScarTissueDrivers(
  correlation: PainCorrelation,
  scarData?: ScarData
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const rs of correlation.relatedScars) {
    const severityFactor = rs.impact.clinicalNotes.length > 0 ? 1 : 0.5;
    const mobilityScore: Record<string, number> = {
      fixed: 80,
      tethered: 55,
      mobile: 20,
    };

    const scar = scarData?.scars.find(s => s.id === rs.scarId);
    const mobility = scar?.mobility ?? 'mobile';
    const baseScore = mobilityScore[mobility] ?? 20;
    const layerBonus = rs.impact.restrictedMovements.length * 8;
    const chainBonus = rs.impact.affectedChains.length * 5;
    const evidenceScore = clamp(baseScore * severityFactor + layerBonus + chainBonus, 0, 100);

    const typeLabels: Record<string, string> = {
      surgical_scar: 'Surgical scar',
      adhesion_band: 'Adhesion band',
      fibrotic_area: 'Fibrotic area',
    };
    const typeLabel = typeLabels[rs.type] ?? rs.type;
    const locationLabel = scar?.anatomicalLabel ?? rs.scarId;

    drivers.push({
      id: `scar_${rs.scarId}`,
      category: 'scar_tissue',
      label: `${typeLabel} at ${locationLabel}`,
      description: rs.impact.clinicalNotes.join('; '),
      evidenceScore: Math.round(evidenceScore),
      mechanism: `${typeLabel} (${mobility}) restricting tissue mobility: ${rs.impact.restrictedMovements.join(', ') || 'regional restriction'}. ${rs.impact.affectedChains.length > 0 ? `Disrupting ${rs.impact.affectedChains.length} fascial chain(s)` : ''}`,
      relatedStructures: [
        locationLabel,
        ...rs.impact.affectedChains.map(ac => ac.chain.name).slice(0, 3),
      ],
      severity: getSeverity(evidenceScore),
    });
  }

  return drivers;
}

function computeReferredDrivers(
  correlation: PainCorrelation
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const rm of correlation.relatedMuscles) {
    if (rm.contributionType !== 'referred') continue;

    const statusScores: Record<string, number> = {
      shortened: 40,
      lengthened: 35,
      overactive: 50,
      inhibited: 35,
      spasm: 55,
      weak: 25,
      normal: 5,
    };
    const baseScore = statusScores[rm.clinicalStatus] ?? 10;
    const tightnessBonus = rm.tightness > 40 ? (rm.tightness - 40) * 0.3 : 0;
    const evidenceScore = clamp(baseScore + tightnessBonus, 0, 100);

    drivers.push({
      id: `referred_${rm.muscleId}`,
      category: 'referred',
      label: `Referred from ${rm.muscleLabel} (${rm.clinicalStatus})`,
      description: rm.explanation,
      evidenceScore: Math.round(evidenceScore),
      mechanism: `Tension propagated from ${rm.muscleLabel} via kinetic chain/fascial connection to pain region`,
      relatedStructures: [rm.muscleLabel],
      severity: getSeverity(evidenceScore),
    });
  }

  for (const fc of correlation.relatedFascialChains) {
    if (Math.abs(fc.propagationDelta) > 10 && fc.avgTension > 55) {
      const evidenceScore = clamp(Math.abs(fc.propagationDelta) * 0.8 + (fc.avgTension - 50) * 0.5, 0, 80);
      drivers.push({
        id: `referred_chain_${fc.chainId}`,
        category: 'referred',
        label: `Tension referred via ${fc.chainName}`,
        description: `${fc.chainName} propagating tension (delta: ${fc.propagationDelta.toFixed(1)}) from distant source to pain area`,
        evidenceScore: Math.round(evidenceScore),
        mechanism: `Fascial chain tension propagation from distant dysfunction through ${fc.chainName}`,
        relatedStructures: [fc.chainName],
        severity: getSeverity(evidenceScore),
      });
    }
  }

  return drivers;
}

function computeCompensatoryDrivers(
  correlation: PainCorrelation
): PainDriver[] {
  const drivers: PainDriver[] = [];

  for (const rm of correlation.relatedMuscles) {
    if (rm.contributionType !== 'compensatory') continue;

    const statusScores: Record<string, number> = {
      shortened: 45,
      lengthened: 30,
      overactive: 55,
      inhibited: 30,
      spasm: 50,
      weak: 25,
      normal: 10,
    };
    const baseScore = statusScores[rm.clinicalStatus] ?? 10;
    const tightnessBonus = rm.tightness > 40 ? (rm.tightness - 40) * 0.3 : 0;
    const activationBonus = rm.activation > 60 ? (rm.activation - 60) * 0.2 : 0;
    const evidenceScore = clamp(baseScore + tightnessBonus + activationBonus, 0, 100);

    drivers.push({
      id: `compensatory_${rm.muscleId}`,
      category: 'compensatory',
      label: `${rm.muscleLabel} compensating (${rm.clinicalStatus})`,
      description: rm.explanation,
      evidenceScore: Math.round(evidenceScore),
      mechanism: `${rm.muscleLabel} in adjacent region is ${rm.clinicalStatus}, compensating for dysfunction and contributing to overload in the pain region`,
      relatedStructures: [rm.muscleLabel],
      severity: getSeverity(evidenceScore),
    });
  }

  return drivers;
}

function generateNarrative(drivers: PainDriver[], region: string): string {
  if (drivers.length === 0) {
    return `No significant pain drivers identified for the ${region} region.`;
  }

  const topDrivers = drivers.slice(0, 5);
  const primary = topDrivers[0];
  const parts: string[] = [];

  parts.push(`The primary driver of ${region} pain appears to be ${primary.label.toLowerCase()} (evidence score: ${primary.evidenceScore}/100).`);
  parts.push(primary.mechanism + '.');

  const contributing = topDrivers.slice(1);
  if (contributing.length > 0) {
    const categoryLabels: Record<string, string> = {
      structural: 'structural loading',
      biomechanical: 'biomechanical dysfunction',
      myofascial: 'myofascial involvement',
      fascial_chain: 'fascial chain tension',
      scar_tissue: 'scar tissue restriction',
      referred: 'referred pain mechanism',
      compensatory: 'compensatory pattern',
    };

    const contributingDescriptions = contributing.map(
      d => `${d.label.toLowerCase()} (${categoryLabels[d.category] ?? d.category}, score: ${d.evidenceScore})`
    );

    parts.push(`Contributing factors include ${contributingDescriptions.join('; ')}.`);
  }

  const categories = new Set(topDrivers.map(d => d.category));
  if (categories.size >= 3) {
    parts.push('This presentation involves multiple system interactions, suggesting a complex, multi-factorial pain mechanism requiring a comprehensive treatment approach.');
  } else if (categories.size === 2) {
    const cats = Array.from(categories);
    const categoryLabels: Record<string, string> = {
      structural: 'structural',
      biomechanical: 'biomechanical',
      myofascial: 'myofascial',
      fascial_chain: 'fascial chain',
      scar_tissue: 'scar tissue',
      referred: 'referred',
      compensatory: 'compensatory',
    };
    parts.push(`The interplay between ${categoryLabels[cats[0]] ?? cats[0]} and ${categoryLabels[cats[1]] ?? cats[1]} factors suggests targeted intervention addressing both systems.`);
  }

  return parts.join(' ');
}

export function computePainDrivers(
  correlation: PainCorrelation,
  forces: ForceData[],
  muscles: MuscleData[],
  fascialData?: FascialData,
  scarData?: ScarData
): PainDriverReport {
  const allDrivers: PainDriver[] = [];

  allDrivers.push(...computeStructuralDrivers(correlation, forces));
  allDrivers.push(...computeBiomechanicalDrivers(correlation));
  allDrivers.push(...computeMyofascialDrivers(correlation, muscles));
  allDrivers.push(...computeFascialChainDrivers(correlation, fascialData));
  allDrivers.push(...computeScarTissueDrivers(correlation, scarData));
  allDrivers.push(...computeReferredDrivers(correlation));
  allDrivers.push(...computeCompensatoryDrivers(correlation));

  allDrivers.sort((a, b) => b.evidenceScore - a.evidenceScore);

  const primaryDriver: PainDriver = allDrivers[0] ?? {
    id: 'none',
    category: 'structural',
    label: 'No significant drivers identified',
    description: 'Insufficient data to determine pain drivers',
    evidenceScore: 0,
    mechanism: 'No mechanism identified',
    relatedStructures: [],
    severity: 'low',
  };

  const narrative = generateNarrative(allDrivers, correlation.region);

  return {
    markerId: correlation.markerId,
    region: correlation.region,
    drivers: allDrivers,
    primaryDriver,
    narrative,
    totalDriverCount: allDrivers.length,
  };
}
