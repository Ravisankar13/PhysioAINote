import type { ForceAnalysisResult, JointSurfaceForce } from './posturalForceEngine';
import type { PathologyCompensationResult, PosturalDeviation, RomRestriction } from './pathologyCompensationEngine';
import type { CrossSystemCorrelationResult, CompensationPattern, PainCorrelation } from './crossSystemCorrelation';
import type { MuscleOverride } from './muscleBiomechanicsEngine';
import { KINETIC_CHAINS } from './kineticChainExplorer';

export interface CausalChainStep {
  step: number;
  structure: string;
  finding: string;
  mechanism: string;
  category: 'root_cause' | 'intermediate' | 'symptom';
  severity: 'mild' | 'moderate' | 'severe';
}

export interface LoadRedistribution {
  joint: string;
  baselineForce: number;
  currentForce: number;
  changePct: number;
  status: 'decreased' | 'normal' | 'increased' | 'overloaded';
}

export interface COMShiftData {
  x: number;
  y: number;
  magnitude: number;
  direction: string;
  clinicalMeaning: string;
}

export interface CompensationCard {
  id: string;
  title: string;
  primaryDysfunction: string;
  compensatingStructures: string[];
  severity: 'mild' | 'moderate' | 'severe';
  clinicalSignificance: string;
  affectedChains: string[];
}

export interface KineticChainDysfunction {
  chainLabel: string;
  chainColor: string;
  dysfunction: string;
  detected: boolean;
  relevance: string;
}

export interface InjuryMechanismResult {
  causalChains: CausalChainStep[][];
  loadRedistribution: LoadRedistribution[];
  comShift: COMShiftData | null;
  compensationCards: CompensationCard[];
  kineticChainDysfunctions: KineticChainDysfunction[];
  topContributors: string[];
  overallMechanismSummary: string;
}

const BASELINE_FORCES: Record<string, number> = {
  cervical_spine: 0.08,
  thoracic_spine: 0.35,
  lumbar_spine: 0.55,
  pelvis_sacrum: 0.55,
  left_hip: 0.5,
  right_hip: 0.5,
  left_knee: 0.45,
  right_knee: 0.45,
  left_ankle: 0.5,
  right_ankle: 0.5,
  left_shoulder: 0.05,
  right_shoulder: 0.05,
};

function getDirectionLabel(x: number, y: number): string {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const parts: string[] = [];
  if (ay > 0.5) parts.push(y > 0 ? 'anterior' : 'posterior');
  if (ax > 0.5) parts.push(x > 0 ? 'right' : 'left');
  return parts.length ? parts.join('-') : 'centered';
}

function getCOMClinicalMeaning(x: number, y: number): string {
  const mag = Math.sqrt(x * x + y * y);
  if (mag < 1) return 'COM well-centered — minimal compensatory demand';
  if (mag < 3) return 'Mild COM deviation — slight asymmetric loading';
  if (mag < 6) return 'Moderate COM shift — increased compensatory muscle activation';
  return 'Significant COM displacement — high compensatory demand, fall risk consideration';
}

function severityFromScore(score: number): 'mild' | 'moderate' | 'severe' {
  if (score < 30) return 'mild';
  if (score < 60) return 'moderate';
  return 'severe';
}

function buildCausalChainsFromCorrelation(correlationResult: CrossSystemCorrelationResult): CausalChainStep[][] {
  const chains: CausalChainStep[][] = [];

  for (const pc of correlationResult.painCorrelations) {
    if (pc.rootCauseChain.length >= 2) {
      const chain: CausalChainStep[] = pc.rootCauseChain.map((step, i) => ({
        step: step.step,
        structure: step.structure,
        finding: step.finding,
        mechanism: step.mechanism,
        category: i === 0 ? 'root_cause' as const : i === pc.rootCauseChain.length - 1 ? 'symptom' as const : 'intermediate' as const,
        severity: i === pc.rootCauseChain.length - 1 ? severityFromScore((pc.severity || 5) * 10) : 'moderate' as const,
      }));
      chains.push(chain);
    }
  }

  return chains;
}

function buildCausalChainsFromPathology(
  pathologyCompensation: PathologyCompensationResult,
  compensatedOverrides: Record<string, Partial<MuscleOverride>>
): CausalChainStep[][] {
  const chains: CausalChainStep[][] = [];

  const pathologicalMuscles = Object.entries(compensatedOverrides).filter(
    ([, v]) => v?.pathology && v.pathology !== 'none'
  );

  for (const [muscleId, override] of pathologicalMuscles) {
    const chain: CausalChainStep[] = [];
    chain.push({
      step: 1,
      structure: muscleId.replace(/_/g, ' '),
      finding: `${override.pathology} detected`,
      mechanism: 'Primary tissue pathology',
      category: 'root_cause',
      severity: 'severe',
    });

    const relatedROM = pathologyCompensation.romRestrictions.filter(r =>
      r.reason.toLowerCase().includes(muscleId.replace(/_/g, ' ').toLowerCase())
    );
    if (relatedROM.length > 0) {
      const rom = relatedROM[0];
      chain.push({
        step: 2,
        structure: `${rom.joint} — ${rom.parameter}`,
        finding: `ROM restricted by ${rom.restrictionPercent}%`,
        mechanism: rom.reason,
        category: 'intermediate',
        severity: rom.restrictionPercent > 30 ? 'severe' : rom.restrictionPercent > 15 ? 'moderate' : 'mild',
      });
    }

    const relatedPostural = pathologyCompensation.posturalDeviations.filter(d =>
      d.reason.toLowerCase().includes(muscleId.replace(/_/g, ' ').toLowerCase())
    );
    if (relatedPostural.length > 0) {
      const dev = relatedPostural[0];
      chain.push({
        step: chain.length + 1,
        structure: `${dev.joint} — ${dev.parameter}`,
        finding: `Deviated ${Math.abs(dev.deviationDegrees).toFixed(1)}°`,
        mechanism: dev.reason,
        category: 'symptom',
        severity: Math.abs(dev.deviationDegrees) > 10 ? 'severe' : Math.abs(dev.deviationDegrees) > 5 ? 'moderate' : 'mild',
      });
    }

    if (chain.length >= 2) {
      chains.push(chain);
    }
  }

  return chains;
}

function buildLoadRedistribution(
  forceAnalysis: ForceAnalysisResult,
  bodyWeightKg: number
): LoadRedistribution[] {
  const items: LoadRedistribution[] = [];
  const g = 9.81;

  for (const joint of forceAnalysis.joints) {
    const baseline = BASELINE_FORCES[joint.category] ?? 0.4;
    const baselineN = baseline * bodyWeightKg * g;
    const currentN = joint.totalForce * bodyWeightKg * g;
    const changePct = baselineN > 0 ? ((currentN - baselineN) / baselineN) * 100 : 0;

    let status: LoadRedistribution['status'] = 'normal';
    if (changePct < -15) status = 'decreased';
    else if (changePct > 50) status = 'overloaded';
    else if (changePct > 15) status = 'increased';

    items.push({
      joint: joint.label,
      baselineForce: Math.round(baselineN),
      currentForce: Math.round(currentN),
      changePct: Math.round(changePct),
      status,
    });
  }

  items.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return items.slice(0, 8);
}

function buildCOMShift(forceAnalysis: ForceAnalysisResult): COMShiftData | null {
  const com = forceAnalysis.totalBodyCOM;
  if (!com) return null;
  const magnitude = Math.sqrt(com.x * com.x + com.y * com.y);
  return {
    x: com.x,
    y: com.y,
    magnitude: Math.round(magnitude * 10) / 10,
    direction: getDirectionLabel(com.x, com.y),
    clinicalMeaning: getCOMClinicalMeaning(com.x, com.y),
  };
}

function buildCompensationCards(
  correlationResult: CrossSystemCorrelationResult | null,
  pathologyCompensation: PathologyCompensationResult | null
): CompensationCard[] {
  const cards: CompensationCard[] = [];

  if (correlationResult?.globalCompensations) {
    for (const comp of correlationResult.globalCompensations) {
      cards.push({
        id: comp.id,
        title: comp.label,
        primaryDysfunction: comp.primaryDysfunction,
        compensatingStructures: comp.compensatingStructures,
        severity: comp.severity,
        clinicalSignificance: comp.clinicalSignificance,
        affectedChains: comp.affectedChains,
      });
    }
  }

  if (pathologyCompensation) {
    for (const finding of pathologyCompensation.clinicalFindings) {
      const exists = cards.some(c => c.title === finding.title);
      if (!exists) {
        cards.push({
          id: `pathology_${finding.muscleSource}`,
          title: finding.title,
          primaryDysfunction: `${finding.muscleSource.replace(/_/g, ' ')} — ${finding.pathology}`,
          compensatingStructures: [],
          severity: finding.severity,
          clinicalSignificance: finding.description,
          affectedChains: [],
        });
      }
    }
  }

  return cards;
}

function matchKineticChainDysfunctions(
  correlationResult: CrossSystemCorrelationResult | null,
  pathologyCompensation: PathologyCompensationResult | null,
  compensatedOverrides: Record<string, Partial<MuscleOverride>>
): KineticChainDysfunction[] {
  const results: KineticChainDysfunction[] = [];

  const findingTexts: string[] = [];
  if (correlationResult) {
    for (const pc of correlationResult.painCorrelations) {
      for (const step of pc.rootCauseChain) {
        findingTexts.push(step.finding.toLowerCase());
        findingTexts.push(step.mechanism.toLowerCase());
      }
    }
    for (const comp of correlationResult.globalCompensations) {
      findingTexts.push(comp.primaryDysfunction.toLowerCase());
      findingTexts.push(comp.clinicalSignificance.toLowerCase());
    }
  }
  if (pathologyCompensation) {
    for (const dev of pathologyCompensation.posturalDeviations) {
      findingTexts.push(dev.reason.toLowerCase());
    }
    for (const rom of pathologyCompensation.romRestrictions) {
      findingTexts.push(rom.reason.toLowerCase());
    }
  }
  for (const [id, ov] of Object.entries(compensatedOverrides)) {
    if (ov?.pathology && ov.pathology !== 'none') {
      findingTexts.push(`${id.replace(/_/g, ' ')} ${ov.pathology}`.toLowerCase());
    }
  }

  const allText = findingTexts.join(' ');

  for (const chain of KINETIC_CHAINS) {
    for (const dysfunction of chain.commonDysfunctions) {
      const keywords = dysfunction.toLowerCase().split(/[→,\s]+/).filter(w => w.length > 3);
      const matchCount = keywords.filter(kw => allText.includes(kw)).length;
      const detected = matchCount >= Math.max(2, Math.floor(keywords.length * 0.3));

      results.push({
        chainLabel: chain.label,
        chainColor: chain.color,
        dysfunction,
        detected,
        relevance: detected ? 'Active pattern detected in current findings' : 'Not currently detected',
      });
    }
  }

  return results.filter(r => r.detected);
}

function buildMechanismSummary(
  causalChains: CausalChainStep[][],
  compensationCards: CompensationCard[],
  comShift: COMShiftData | null,
  loadRedistribution: LoadRedistribution[]
): string {
  const parts: string[] = [];

  if (causalChains.length > 0) {
    const rootCauses = causalChains.map(c => c[0]?.structure).filter(Boolean);
    const unique = [...new Set(rootCauses)];
    parts.push(`${unique.length} root cause${unique.length > 1 ? 's' : ''} identified (${unique.slice(0, 3).join(', ')})`);
  }

  const overloaded = loadRedistribution.filter(l => l.status === 'overloaded');
  if (overloaded.length > 0) {
    parts.push(`${overloaded.length} joint${overloaded.length > 1 ? 's' : ''} overloaded`);
  }

  if (comShift && comShift.magnitude > 1) {
    parts.push(`COM shifted ${comShift.direction}`);
  }

  const severeComps = compensationCards.filter(c => c.severity === 'severe');
  if (severeComps.length > 0) {
    parts.push(`${severeComps.length} severe compensation pattern${severeComps.length > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) return 'No significant injury mechanisms detected in current configuration.';
  return parts.join(' · ');
}

function buildTopContributors(
  causalChains: CausalChainStep[][],
  compensationCards: CompensationCard[],
  loadRedistribution: LoadRedistribution[]
): string[] {
  const contributors: string[] = [];

  for (const chain of causalChains) {
    if (chain[0]) {
      contributors.push(`${chain[0].structure}: ${chain[0].finding}`);
    }
  }

  for (const card of compensationCards) {
    if (card.severity === 'severe' || card.severity === 'moderate') {
      contributors.push(`${card.title}: ${card.primaryDysfunction}`);
    }
  }

  const overloaded = loadRedistribution.filter(l => l.status === 'overloaded');
  for (const ol of overloaded) {
    contributors.push(`${ol.joint}: +${ol.changePct}% load increase`);
  }

  return [...new Set(contributors)].slice(0, 5);
}

export function analyzeInjuryMechanism(input: {
  forceAnalysis: ForceAnalysisResult | null;
  pathologyCompensation: PathologyCompensationResult | null;
  correlationResult: CrossSystemCorrelationResult | null;
  compensatedOverrides: Record<string, Partial<MuscleOverride>>;
  bodyWeightKg: number;
}): InjuryMechanismResult {
  const { forceAnalysis, pathologyCompensation, correlationResult, compensatedOverrides, bodyWeightKg } = input;

  let causalChains: CausalChainStep[][] = [];
  if (correlationResult) {
    causalChains = buildCausalChainsFromCorrelation(correlationResult);
  }
  if (pathologyCompensation) {
    const pathChains = buildCausalChainsFromPathology(pathologyCompensation, compensatedOverrides);
    for (const pc of pathChains) {
      const isDuplicate = causalChains.some(
        existing => existing[0]?.structure === pc[0]?.structure && existing[0]?.finding === pc[0]?.finding
      );
      if (!isDuplicate) causalChains.push(pc);
    }
  }

  const loadRedistribution = forceAnalysis
    ? buildLoadRedistribution(forceAnalysis, bodyWeightKg)
    : [];

  const comShift = forceAnalysis ? buildCOMShift(forceAnalysis) : null;

  const compensationCards = buildCompensationCards(correlationResult, pathologyCompensation);

  const kineticChainDysfunctions = matchKineticChainDysfunctions(
    correlationResult, pathologyCompensation, compensatedOverrides
  );

  const topContributors = buildTopContributors(causalChains, compensationCards, loadRedistribution);

  const overallMechanismSummary = buildMechanismSummary(causalChains, compensationCards, comShift, loadRedistribution);

  return {
    causalChains,
    loadRedistribution,
    comShift,
    compensationCards,
    kineticChainDysfunctions,
    topContributors,
    overallMechanismSummary,
  };
}
