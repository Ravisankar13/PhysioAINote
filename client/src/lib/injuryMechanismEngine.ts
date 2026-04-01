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
  boneId: string | null;
  forceN: number | null;
  forceStatus: 'low' | 'moderate' | 'high' | 'very_high' | null;
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

export interface FootPressureData {
  leftPct: number;
  rightPct: number;
  anteriorPosterior: 'anterior' | 'neutral' | 'posterior';
  apShiftMm: number;
  clinicalNote: string;
}

export interface CompensationForceImpact {
  joint: string;
  forceChangeN: number;
  direction: 'increased' | 'decreased';
}

export interface CompensationCard {
  id: string;
  title: string;
  primaryDysfunction: string;
  compensatingStructures: string[];
  severity: 'mild' | 'moderate' | 'severe';
  clinicalSignificance: string;
  affectedChains: string[];
  forceImpacts: CompensationForceImpact[];
  recommendation: string;
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
  footPressure: FootPressureData | null;
  compensationCards: CompensationCard[];
  kineticChainDysfunctions: KineticChainDysfunction[];
  topContributors: string[];
  overallMechanismSummary: string;
  causalChainBoneIds: string[];
}

const STRUCTURE_TO_BONE: Record<string, string> = {
  'lumbar': 'Spine1_M', 'lower back': 'Spine1_M', 'erector spinae': 'Spine1_M', 'multifidus': 'Spine1_M',
  'thoracic': 'Chest_M', 'mid back': 'Chest_M', 'rhomboid': 'Chest_M',
  'cervical': 'Neck_M', 'neck': 'Neck_M', 'sternocleidomastoid': 'Neck_M',
  'pelvis': 'Root_M', 'sacrum': 'Root_M', 'core': 'Root_M',
  'left hip': 'Hip_L', 'hip_l': 'Hip_L', 'left glute': 'Hip_L', 'glute_l': 'Hip_L', 'gluteus_l': 'Hip_L',
  'right hip': 'Hip_R', 'hip_r': 'Hip_R', 'right glute': 'Hip_R', 'glute_r': 'Hip_R', 'gluteus_r': 'Hip_R',
  'left knee': 'Knee_L', 'quad_l': 'Knee_L', 'left quad': 'Knee_L',
  'right knee': 'Knee_R', 'quad_r': 'Knee_R', 'right quad': 'Knee_R',
  'left ankle': 'Ankle_L', 'calf_l': 'Ankle_L', 'left calf': 'Ankle_L',
  'right ankle': 'Ankle_R', 'calf_r': 'Ankle_R', 'right calf': 'Ankle_R',
  'left shoulder': 'Shoulder_L', 'deltoid_l': 'Shoulder_L', 'scapula_l': 'Scapula_L',
  'right shoulder': 'Shoulder_R', 'deltoid_r': 'Shoulder_R', 'scapula_r': 'Scapula_R',
  'head': 'Head_M',
};

const STRUCTURE_TO_FORCE_CATEGORY: Record<string, string> = {
  'lumbar': 'lumbar_spine', 'lower back': 'lumbar_spine', 'erector spinae': 'lumbar_spine',
  'thoracic': 'thoracic_spine', 'mid back': 'thoracic_spine',
  'cervical': 'cervical_spine', 'neck': 'cervical_spine',
  'pelvis': 'pelvis_sacrum', 'sacrum': 'pelvis_sacrum',
  'left hip': 'left_hip', 'hip_l': 'left_hip', 'glute_l': 'left_hip',
  'right hip': 'right_hip', 'hip_r': 'right_hip', 'glute_r': 'right_hip',
  'left knee': 'left_knee', 'quad_l': 'left_knee',
  'right knee': 'right_knee', 'quad_r': 'right_knee',
  'left ankle': 'left_ankle', 'calf_l': 'left_ankle',
  'right ankle': 'right_ankle', 'calf_r': 'right_ankle',
  'left shoulder': 'left_shoulder', 'deltoid_l': 'left_shoulder',
  'right shoulder': 'right_shoulder', 'deltoid_r': 'right_shoulder',
};

function resolveStructureBone(structure: string): string | null {
  const lower = structure.toLowerCase();
  for (const [key, bone] of Object.entries(STRUCTURE_TO_BONE)) {
    if (lower.includes(key)) return bone;
  }
  return null;
}

function resolveForceForStructure(
  structure: string,
  forceAnalysis: ForceAnalysisResult | null,
  bodyWeightKg: number
): { forceN: number; status: 'low' | 'moderate' | 'high' | 'very_high' } | null {
  if (!forceAnalysis) return null;
  const lower = structure.toLowerCase();
  for (const [key, category] of Object.entries(STRUCTURE_TO_FORCE_CATEGORY)) {
    if (lower.includes(key)) {
      const joint = forceAnalysis.joints.find(j => j.category === category);
      if (joint) {
        return {
          forceN: Math.round(joint.totalForce * bodyWeightKg * 9.81),
          status: joint.status,
        };
      }
    }
  }
  return null;
}

function generateRecommendation(severity: 'mild' | 'moderate' | 'severe', primaryDysfunction: string): string {
  if (severity === 'severe') {
    return `Address ${primaryDysfunction} as priority — consider manual therapy, corrective exercise, and load modification`;
  }
  if (severity === 'moderate') {
    return `Monitor ${primaryDysfunction} — targeted strengthening and mobility work recommended`;
  }
  return `Maintain awareness of ${primaryDysfunction} — preventive exercises may help`;
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

function buildCausalChainsFromCorrelation(
  correlationResult: CrossSystemCorrelationResult,
  forceAnalysis: ForceAnalysisResult | null,
  bodyWeightKg: number
): CausalChainStep[][] {
  const chains: CausalChainStep[][] = [];

  for (const pc of correlationResult.painCorrelations) {
    if (pc.rootCauseChain.length >= 2) {
      const chain: CausalChainStep[] = pc.rootCauseChain.map((step, i) => {
        const forceData = resolveForceForStructure(step.structure, forceAnalysis, bodyWeightKg);
        return {
          step: step.step,
          structure: step.structure,
          finding: step.finding,
          mechanism: step.mechanism,
          category: i === 0 ? 'root_cause' as const : i === pc.rootCauseChain.length - 1 ? 'symptom' as const : 'intermediate' as const,
          severity: i === pc.rootCauseChain.length - 1 ? severityFromScore((pc.severity || 5) * 10) : 'moderate' as const,
          boneId: resolveStructureBone(step.structure),
          forceN: forceData?.forceN ?? null,
          forceStatus: forceData?.status ?? null,
        };
      });
      chains.push(chain);
    }
  }

  return chains;
}

function buildCausalChainsFromPathology(
  pathologyCompensation: PathologyCompensationResult,
  compensatedOverrides: Record<string, Partial<MuscleOverride>>,
  forceAnalysis: ForceAnalysisResult | null,
  bodyWeightKg: number
): CausalChainStep[][] {
  const chains: CausalChainStep[][] = [];

  const pathologicalMuscles = Object.entries(compensatedOverrides).filter(
    ([, v]) => v?.pathology && v.pathology !== 'none'
  );

  for (const [muscleId, override] of pathologicalMuscles) {
    const chain: CausalChainStep[] = [];
    const muscleName = muscleId.replace(/_/g, ' ');
    const rootForce = resolveForceForStructure(muscleName, forceAnalysis, bodyWeightKg);
    chain.push({
      step: 1,
      structure: muscleName,
      finding: `${override.pathology} detected`,
      mechanism: 'Primary tissue pathology',
      category: 'root_cause',
      severity: 'severe',
      boneId: resolveStructureBone(muscleName),
      forceN: rootForce?.forceN ?? null,
      forceStatus: rootForce?.status ?? null,
    });

    const relatedROM = pathologyCompensation.romRestrictions.filter(r =>
      r.reason.toLowerCase().includes(muscleName.toLowerCase())
    );
    if (relatedROM.length > 0) {
      const rom = relatedROM[0];
      const romStructure = `${rom.joint} — ${rom.parameter}`;
      const romForce = resolveForceForStructure(rom.joint, forceAnalysis, bodyWeightKg);
      chain.push({
        step: 2,
        structure: romStructure,
        finding: `ROM restricted by ${rom.restrictionPercent}%`,
        mechanism: rom.reason,
        category: 'intermediate',
        severity: rom.restrictionPercent > 30 ? 'severe' : rom.restrictionPercent > 15 ? 'moderate' : 'mild',
        boneId: resolveStructureBone(rom.joint),
        forceN: romForce?.forceN ?? null,
        forceStatus: romForce?.status ?? null,
      });
    }

    const relatedPostural = pathologyCompensation.posturalDeviations.filter(d =>
      d.reason.toLowerCase().includes(muscleName.toLowerCase())
    );
    if (relatedPostural.length > 0) {
      const dev = relatedPostural[0];
      const devStructure = `${dev.joint} — ${dev.parameter}`;
      const devForce = resolveForceForStructure(dev.joint, forceAnalysis, bodyWeightKg);
      chain.push({
        step: chain.length + 1,
        structure: devStructure,
        finding: `Deviated ${Math.abs(dev.deviationDegrees).toFixed(1)}°`,
        mechanism: dev.reason,
        category: 'symptom',
        severity: Math.abs(dev.deviationDegrees) > 10 ? 'severe' : Math.abs(dev.deviationDegrees) > 5 ? 'moderate' : 'mild',
        boneId: resolveStructureBone(dev.joint),
        forceN: devForce?.forceN ?? null,
        forceStatus: devForce?.status ?? null,
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

function buildFootPressure(forceAnalysis: ForceAnalysisResult): FootPressureData | null {
  const com = forceAnalysis.totalBodyCOM;
  if (!com) return null;

  const shift = forceAnalysis.baseSupportShift ?? 0;
  const leftPct = Math.round(Math.max(10, Math.min(90, 50 + com.x * -5)));
  const rightPct = 100 - leftPct;

  const apShiftMm = Math.round(com.y * 10);
  let ap: FootPressureData['anteriorPosterior'] = 'neutral';
  if (apShiftMm > 3) ap = 'anterior';
  else if (apShiftMm < -3) ap = 'posterior';

  let clinicalNote = 'Symmetrical weight distribution';
  const asymmetry = Math.abs(leftPct - 50);
  if (asymmetry > 15) {
    clinicalNote = `Significant ${leftPct > 50 ? 'left' : 'right'}-side loading — assess for lateral shift, hip drop, or scoliosis`;
  } else if (asymmetry > 5) {
    clinicalNote = `Mild ${leftPct > 50 ? 'left' : 'right'}-side predominance`;
  }
  if (ap !== 'neutral') {
    clinicalNote += `. ${ap === 'anterior' ? 'Anterior shift — forefoot loading' : 'Posterior shift — heel loading'}`;
  }

  return { leftPct, rightPct, anteriorPosterior: ap, apShiftMm, clinicalNote };
}

function buildCompensationCards(
  correlationResult: CrossSystemCorrelationResult | null,
  pathologyCompensation: PathologyCompensationResult | null,
  forceAnalysis: ForceAnalysisResult | null,
  bodyWeightKg: number
): CompensationCard[] {
  const cards: CompensationCard[] = [];
  const g = 9.81;

  if (correlationResult?.globalCompensations) {
    for (const comp of correlationResult.globalCompensations) {
      const forceImpacts: CompensationForceImpact[] = [];
      if (forceAnalysis) {
        for (const structure of comp.compensatingStructures) {
          const forceData = resolveForceForStructure(structure, forceAnalysis, bodyWeightKg);
          const baseline = BASELINE_FORCES[
            Object.entries(STRUCTURE_TO_FORCE_CATEGORY).find(([k]) => structure.toLowerCase().includes(k))?.[1] ?? ''
          ];
          if (forceData && baseline) {
            const baselineN = Math.round(baseline * bodyWeightKg * g);
            const changeN = forceData.forceN - baselineN;
            if (Math.abs(changeN) > 20) {
              forceImpacts.push({
                joint: structure,
                forceChangeN: changeN,
                direction: changeN > 0 ? 'increased' : 'decreased',
              });
            }
          }
        }
      }

      cards.push({
        id: comp.id,
        title: comp.label,
        primaryDysfunction: comp.primaryDysfunction,
        compensatingStructures: comp.compensatingStructures,
        severity: comp.severity,
        clinicalSignificance: comp.clinicalSignificance,
        affectedChains: comp.affectedChains,
        forceImpacts,
        recommendation: generateRecommendation(comp.severity, comp.primaryDysfunction),
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
          forceImpacts: [],
          recommendation: generateRecommendation(finding.severity, finding.title),
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
    causalChains = buildCausalChainsFromCorrelation(correlationResult, forceAnalysis, bodyWeightKg);
  }
  if (pathologyCompensation) {
    const pathChains = buildCausalChainsFromPathology(pathologyCompensation, compensatedOverrides, forceAnalysis, bodyWeightKg);
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
  const footPressure = forceAnalysis ? buildFootPressure(forceAnalysis) : null;

  const compensationCards = buildCompensationCards(correlationResult, pathologyCompensation, forceAnalysis, bodyWeightKg);

  const kineticChainDysfunctions = matchKineticChainDysfunctions(
    correlationResult, pathologyCompensation, compensatedOverrides
  );

  const topContributors = buildTopContributors(causalChains, compensationCards, loadRedistribution);

  const overallMechanismSummary = buildMechanismSummary(causalChains, compensationCards, comShift, loadRedistribution);

  const causalChainBoneIds: string[] = [];
  for (const chain of causalChains) {
    for (const step of chain) {
      if (step.boneId && !causalChainBoneIds.includes(step.boneId)) {
        causalChainBoneIds.push(step.boneId);
      }
    }
  }

  return {
    causalChains,
    loadRedistribution,
    comShift,
    footPressure,
    compensationCards,
    kineticChainDysfunctions,
    topContributors,
    overallMechanismSummary,
    causalChainBoneIds,
  };
}
