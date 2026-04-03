import type { BiomechanicsOutput, MuscleStateEntry, CompensationPattern as BiomechCompensation } from './unifiedBiomechanicsEngine';
import { FUNCTIONAL_SLINGS, type FunctionalSling } from './myofascialChains';
import { KINETIC_CHAINS, type KineticChainDefinition } from './kineticChainExplorer';

export type SlingId = 'posterior_oblique' | 'anterior_oblique' | 'lateral' | 'deep_longitudinal' | 'scapular_shoulder';
export type SlingStatus = 'normal' | 'underperforming' | 'overloaded' | 'compensating';
export type ForceTransferQuality = 'good' | 'reduced' | 'poor';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface SlingDefinition {
  id: SlingId;
  label: string;
  color: string;
  muscles: string[];
  primaryFunction: string;
  movementRole: string;
  functionalSlingRef: string | null;
  kineticChainRef: string | null;
  bonePathway: string[];
}

export interface WeakLink {
  muscle: string;
  activationPct: number;
  role: MuscleStateEntry['role'];
  reason: string;
  impactOnSling: string;
}

export interface SlingCompensation {
  compensatingSling: SlingId;
  compensatingSlingLabel: string;
  mechanism: string;
  severity: Severity;
  additionalLoadPct: number;
  clinical: string;
}

export interface ForceReroute {
  fromMuscle: string;
  toMuscle: string;
  reroutePct: number;
  clinical: string;
}

export interface SlingTreatmentTarget {
  muscle: string;
  intervention: 'strengthen' | 'release' | 'activate' | 'stabilize';
  priority: number;
  rationale: string;
}

export interface SlingResult {
  slingId: SlingId;
  label: string;
  color: string;
  status: SlingStatus;
  activationScore: number;
  forceTransferQuality: ForceTransferQuality;
  weakLinks: WeakLink[];
  compensations: SlingCompensation[];
  forceReroutes: ForceReroute[];
  downstreamRisk: Severity | 'none';
  confidence: number;
  treatmentTargets: SlingTreatmentTarget[];
  narrative: string;
}

export interface SlingAnalysisResult {
  timestamp: number;
  slings: SlingResult[];
  systemSummary: string;
  overallForceTransferScore: number;
  dominantDysfunction: SlingId | null;
  crossSlingCompensations: SlingCompensation[];
}

const SLING_DEFINITIONS: SlingDefinition[] = [
  {
    id: 'posterior_oblique',
    label: 'Posterior Oblique Sling',
    color: '#f97316',
    muscles: ['latissimus_dorsi', 'thoracolumbar_fascia', 'gluteus_maximus', 'contralateral_gluteus_maximus'],
    primaryFunction: 'Contralateral upper-lower body force transfer during gait and rotation',
    movementRole: 'Gait propulsion, trunk counter-rotation, posterior chain power transfer',
    functionalSlingRef: 'posterior_oblique',
    kineticChainRef: 'posterior_oblique_sling',
    bonePathway: ['Shoulder_L', 'ShoulderPart1_L', 'Chest_M', 'Spine1Part2_M', 'Spine1Part1_M', 'Spine1_M', 'RootPart2_M', 'RootPart1_M', 'Root_M', 'Hip_R', 'HipPart1_R'],
  },
  {
    id: 'anterior_oblique',
    label: 'Anterior Oblique Sling',
    color: '#ec4899',
    muscles: ['external_oblique', 'anterior_abdominal_fascia', 'internal_oblique', 'adductors'],
    primaryFunction: 'Rotational power generation and deceleration, trunk stabilization',
    movementRole: 'Kicking, throwing deceleration, rotational sports, anti-rotation stability',
    functionalSlingRef: 'anterior_oblique',
    kineticChainRef: 'anterior_oblique_sling',
    bonePathway: ['Shoulder_R', 'Chest_M', 'Spine1_M', 'RootPart2_M', 'Root_M', 'Hip_L', 'HipPart1_L'],
  },
  {
    id: 'lateral',
    label: 'Lateral Subsystem',
    color: '#06b6d4',
    muscles: ['gluteus_medius', 'gluteus_minimus', 'tensor_fasciae_latae', 'adductors', 'quadratus_lumborum'],
    primaryFunction: 'Frontal plane pelvic stability during single-leg stance',
    movementRole: 'Single-leg balance, gait stance phase, lateral stability, Trendelenburg prevention',
    functionalSlingRef: 'lateral_sling',
    kineticChainRef: 'lateral_subsystem',
    bonePathway: ['Hip_L', 'HipPart1_L', 'Root_M', 'RootPart1_M', 'Spine1_M', 'Hip_R', 'HipPart1_R', 'Knee_R'],
  },
  {
    id: 'deep_longitudinal',
    label: 'Deep Longitudinal Sling',
    color: '#10b981',
    muscles: ['peroneus_longus', 'biceps_femoris', 'sacrotuberous_ligament', 'erector_spinae', 'thoracolumbar_fascia'],
    primaryFunction: 'Longitudinal force transfer from foot through pelvis to spine',
    movementRole: 'Shock absorption, ground reaction force transmission, spinal stabilization during gait',
    functionalSlingRef: 'deep_longitudinal',
    kineticChainRef: 'deep_longitudinal',
    bonePathway: ['Ankle_L', 'Knee_L', 'Hip_L', 'HipPart1_L', 'Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Spine1Part1_M', 'Chest_M', 'Neck_M'],
  },
  {
    id: 'scapular_shoulder',
    label: 'Scapular / Shoulder Sling',
    color: '#8b5cf6',
    muscles: ['serratus_anterior', 'lower_trapezius', 'rhomboids', 'rotator_cuff'],
    primaryFunction: 'Scapulothoracic rhythm, glenohumeral force couple, overhead stability',
    movementRole: 'Overhead reaching, throwing, pushing, pulling, scapular upward rotation',
    functionalSlingRef: null,
    kineticChainRef: null,
    bonePathway: ['Shoulder_L', 'ShoulderPart1_L', 'Chest_M', 'Spine1Part2_M', 'Shoulder_R', 'ShoulderPart1_R'],
  },
];

const MUSCLE_ALIASES: Record<string, string[]> = {
  latissimus_dorsi: ['Latissimus dorsi', 'latissimus dorsi', 'lat_dorsi', 'scapula_l', 'scapula_r'],
  thoracolumbar_fascia: ['Thoracolumbar fascia', 'thoracolumbar fascia', 'spine'],
  gluteus_maximus: ['Gluteus maximus', 'gluteus maximus', 'glute_l', 'glute_r', 'Gluteus Maximus'],
  contralateral_gluteus_maximus: ['Gluteus maximus', 'gluteus maximus', 'glute_r', 'glute_l'],
  external_oblique: ['External oblique', 'external oblique', 'Ext Oblique'],
  anterior_abdominal_fascia: ['Linea alba', 'Rectus sheath', 'core', 'Rectus abdominis'],
  internal_oblique: ['Internal oblique', 'internal oblique', 'Int Oblique'],
  adductors: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis', 'adductor'],
  gluteus_medius: ['Gluteus medius', 'gluteus medius', 'Glut Med', 'hip abductor'],
  gluteus_minimus: ['Gluteus minimus', 'gluteus minimus', 'Glut Min'],
  tensor_fasciae_latae: ['Tensor fasciae latae', 'TFL', 'tensor fasciae latae', 'IT band'],
  quadratus_lumborum: ['Quadratus lumborum', 'QL', 'quadratus lumborum'],
  peroneus_longus: ['Peroneus longus', 'peroneus longus', 'Fibularis longus', 'calf_l', 'calf_r'],
  biceps_femoris: ['Biceps femoris', 'biceps femoris', 'hamstring'],
  sacrotuberous_ligament: ['Sacrotuberous ligament', 'sacrotuberous'],
  erector_spinae: ['Erector spinae', 'erector spinae', 'ES', 'spine', 'Multifidus'],
  serratus_anterior: ['Serratus anterior', 'serratus anterior', 'SA'],
  lower_trapezius: ['Lower trapezius', 'lower trapezius', 'Lower Trap', 'Trapezius'],
  rhomboids: ['Rhomboids', 'rhomboids', 'Rhomboid major', 'Rhomboid minor'],
  rotator_cuff: ['Infraspinatus', 'Supraspinatus', 'Subscapularis', 'Teres minor', 'rotator cuff'],
};

function findMuscleActivation(
  muscle: string,
  muscleStates: MuscleStateEntry[]
): MuscleStateEntry | null {
  const aliases = MUSCLE_ALIASES[muscle] ?? [muscle];
  for (const alias of aliases) {
    const found = muscleStates.find(
      m => m.muscle.toLowerCase() === alias.toLowerCase()
    );
    if (found) return found;
  }
  return null;
}

function estimateActivation(
  muscle: string,
  muscleStates: MuscleStateEntry[]
): { activationPct: number; role: MuscleStateEntry['role']; found: boolean } {
  const state = findMuscleActivation(muscle, muscleStates);
  if (state) return { activationPct: state.activationPct, role: state.role, found: true };
  return { activationPct: 50, role: 'normal', found: false };
}

function computeSlingActivationScore(
  def: SlingDefinition,
  muscleStates: MuscleStateEntry[]
): { score: number; muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }> } {
  const muscleScores = def.muscles.map(m => {
    const est = estimateActivation(m, muscleStates);
    return { muscle: m, activation: est.activationPct, role: est.role, found: est.found };
  });
  const totalFound = muscleScores.filter(s => s.found).length;
  if (totalFound === 0) return { score: 50, muscleScores };
  const weights = muscleScores.map(s => s.found ? 1.0 : 0.3);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = muscleScores.reduce((sum, s, i) => sum + s.activation * weights[i], 0);
  return { score: Math.round(weightedSum / totalWeight), muscleScores };
}

function detectWeakLinks(
  def: SlingDefinition,
  muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }>
): WeakLink[] {
  const weakLinks: WeakLink[] = [];
  for (const ms of muscleScores) {
    if (!ms.found) continue;
    if (ms.role === 'underactive' || ms.role === 'inhibited' || ms.activation < 35) {
      const reason = ms.role === 'inhibited'
        ? `${ms.muscle} is neurally inhibited, failing to contribute to ${def.label}`
        : ms.role === 'underactive'
          ? `${ms.muscle} is underactive (${ms.activation}%), reducing sling efficiency`
          : `${ms.muscle} activation critically low (${ms.activation}%)`;
      weakLinks.push({
        muscle: ms.muscle,
        activationPct: ms.activation,
        role: ms.role,
        reason,
        impactOnSling: `Breaks force continuity in ${def.label}, forcing adjacent muscles to compensate`,
      });
    }
  }
  return weakLinks;
}

function detectForceReroutes(
  def: SlingDefinition,
  muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }>
): ForceReroute[] {
  const reroutes: ForceReroute[] = [];
  const underactive = muscleScores.filter(m => m.found && (m.role === 'underactive' || m.role === 'inhibited'));
  const overactive = muscleScores.filter(m => m.found && m.role === 'overactive');

  for (const weak of underactive) {
    for (const strong of overactive) {
      const deficit = 50 - weak.activation;
      const surplus = strong.activation - 50;
      const reroutePct = Math.round(Math.min(deficit, surplus) * 0.6);
      if (reroutePct > 5) {
        reroutes.push({
          fromMuscle: weak.muscle,
          toMuscle: strong.muscle,
          reroutePct,
          clinical: `Force normally carried by ${weak.muscle} is rerouted through ${strong.muscle}, increasing its load by ~${reroutePct}%`,
        });
      }
    }
  }
  return reroutes;
}

function detectCrossSlingCompensations(
  slingResults: Array<{ def: SlingDefinition; status: SlingStatus; weakLinks: WeakLink[]; activationScore: number }>
): SlingCompensation[] {
  const compensations: SlingCompensation[] = [];
  const dysfunctional = slingResults.filter(s => s.status === 'underperforming' || s.weakLinks.length > 0);
  const overloaded = slingResults.filter(s => s.status === 'overloaded' || s.activationScore > 70);

  for (const weak of dysfunctional) {
    for (const strong of overloaded) {
      if (weak.def.id === strong.def.id) continue;
      const sharedMuscles = weak.def.muscles.filter(m => strong.def.muscles.includes(m));
      const hasFunctionalOverlap = sharedMuscles.length > 0;
      const isAdjacentSystem = areSlingsAdjacent(weak.def.id, strong.def.id);

      if (hasFunctionalOverlap || isAdjacentSystem) {
        const severityVal = weak.weakLinks.length;
        const severity: Severity = severityVal >= 3 ? 'severe' : severityVal >= 1 ? 'moderate' : 'mild';
        const loadIncrease = Math.round((70 - weak.activationScore) * 0.4);
        compensations.push({
          compensatingSling: strong.def.id,
          compensatingSlingLabel: strong.def.label,
          mechanism: hasFunctionalOverlap
            ? `${strong.def.label} compensates for ${weak.def.label} dysfunction via shared muscles (${sharedMuscles.join(', ')})`
            : `${strong.def.label} takes on additional frontal/sagittal load due to ${weak.def.label} underperformance`,
          severity,
          additionalLoadPct: Math.max(5, loadIncrease),
          clinical: `Compensation pattern: ${weak.def.label} dysfunction drives overload of ${strong.def.label}. This creates secondary injury risk in the compensating sling.`,
        });
      }
    }
  }
  return compensations;
}

function areSlingsAdjacent(a: SlingId, b: SlingId): boolean {
  const adjacencyMap: Record<SlingId, SlingId[]> = {
    posterior_oblique: ['deep_longitudinal', 'lateral', 'scapular_shoulder'],
    anterior_oblique: ['lateral', 'deep_longitudinal'],
    lateral: ['posterior_oblique', 'anterior_oblique', 'deep_longitudinal'],
    deep_longitudinal: ['posterior_oblique', 'anterior_oblique', 'lateral'],
    scapular_shoulder: ['posterior_oblique', 'anterior_oblique'],
  };
  return adjacencyMap[a]?.includes(b) ?? false;
}

function classifySlingStatus(
  activationScore: number,
  weakLinks: WeakLink[],
  compensations: SlingCompensation[],
  forceReroutes: ForceReroute[]
): SlingStatus {
  const isCompensating = compensations.some(c => c.compensatingSling !== undefined);
  if (weakLinks.length >= 2 || activationScore < 30) return 'underperforming';
  if (activationScore > 75 && forceReroutes.length > 0) return 'overloaded';
  if (isCompensating || forceReroutes.length > 0) return 'compensating';
  if (weakLinks.length > 0 || activationScore < 45) return 'underperforming';
  return 'normal';
}

function classifyForceTransfer(
  activationScore: number,
  weakLinks: WeakLink[],
  forceReroutes: ForceReroute[]
): ForceTransferQuality {
  if (weakLinks.length >= 2 || activationScore < 30) return 'poor';
  if (weakLinks.length >= 1 || forceReroutes.length > 0 || activationScore < 50) return 'reduced';
  return 'good';
}

function classifyDownstreamRisk(
  status: SlingStatus,
  weakLinks: WeakLink[],
  compensations: SlingCompensation[]
): Severity | 'none' {
  if (status === 'underperforming' && weakLinks.length >= 2) return 'severe';
  if (status === 'overloaded' && compensations.length > 0) return 'moderate';
  if (status === 'compensating' || weakLinks.length > 0) return 'mild';
  return 'none';
}

function computeConfidence(
  muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }>
): number {
  const foundCount = muscleScores.filter(s => s.found).length;
  const total = muscleScores.length;
  if (total === 0) return 0;
  return Math.round((foundCount / total) * 100);
}

function generateTreatmentTargets(
  def: SlingDefinition,
  weakLinks: WeakLink[],
  forceReroutes: ForceReroute[],
  muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }>
): SlingTreatmentTarget[] {
  const targets: SlingTreatmentTarget[] = [];

  for (const wl of weakLinks) {
    if (wl.role === 'inhibited') {
      targets.push({
        muscle: wl.muscle,
        intervention: 'activate',
        priority: 1,
        rationale: `${wl.muscle} is inhibited — needs neuromuscular activation before strengthening`,
      });
    } else {
      targets.push({
        muscle: wl.muscle,
        intervention: 'strengthen',
        priority: 2,
        rationale: `${wl.muscle} underactive at ${wl.activationPct}% — progressive strengthening to restore sling force contribution`,
      });
    }
  }

  for (const rr of forceReroutes) {
    const alreadyTargeted = targets.some(t => t.muscle === rr.toMuscle);
    if (!alreadyTargeted) {
      targets.push({
        muscle: rr.toMuscle,
        intervention: 'release',
        priority: 2,
        rationale: `${rr.toMuscle} overloaded by ${rr.reroutePct}% due to force rerouting — release hypertonic tissue before retraining pattern`,
      });
    }
  }

  const overactiveNoReroute = muscleScores.filter(
    m => m.found && m.role === 'overactive' && !forceReroutes.some(r => r.toMuscle === m.muscle)
  );
  for (const oa of overactiveNoReroute) {
    targets.push({
      muscle: oa.muscle,
      intervention: 'release',
      priority: 3,
      rationale: `${oa.muscle} is overactive at ${oa.activation}% — soft tissue release to normalize tone`,
    });
  }

  return targets.sort((a, b) => a.priority - b.priority);
}

function generateNarrative(
  def: SlingDefinition,
  status: SlingStatus,
  activationScore: number,
  forceTransfer: ForceTransferQuality,
  weakLinks: WeakLink[],
  compensations: SlingCompensation[],
  forceReroutes: ForceReroute[]
): string {
  if (status === 'normal') {
    return `${def.label} is functioning within normal parameters. Force transfer quality is ${forceTransfer} with adequate muscle activation across all chain members.`;
  }

  const parts: string[] = [];
  parts.push(`${def.label} is ${status} (activation ${activationScore}%, force transfer: ${forceTransfer}).`);

  if (weakLinks.length > 0) {
    const names = weakLinks.map(w => w.muscle).join(', ');
    parts.push(`Weak link${weakLinks.length > 1 ? 's' : ''} identified: ${names}.`);
  }

  if (forceReroutes.length > 0) {
    parts.push(`Force is being rerouted through ${forceReroutes.map(r => r.toMuscle).join(', ')}, increasing their injury risk.`);
  }

  if (compensations.length > 0) {
    parts.push(`Cross-sling compensation detected: ${compensations.map(c => c.compensatingSlingLabel).join(', ')} taking on additional load.`);
  }

  parts.push(`Primary role affected: ${def.movementRole}.`);
  return parts.join(' ');
}

export function computeSlingAnalysis(
  biomechanicsOutput: BiomechanicsOutput | null
): SlingAnalysisResult {
  const timestamp = Date.now();

  if (!biomechanicsOutput) {
    return {
      timestamp,
      slings: SLING_DEFINITIONS.map(def => ({
        slingId: def.id,
        label: def.label,
        color: def.color,
        status: 'normal' as SlingStatus,
        activationScore: 50,
        forceTransferQuality: 'good' as ForceTransferQuality,
        weakLinks: [],
        compensations: [],
        forceReroutes: [],
        downstreamRisk: 'none' as const,
        confidence: 0,
        treatmentTargets: [],
        narrative: `${def.label}: No biomechanical data available for analysis.`,
      })),
      systemSummary: 'No biomechanical data available. Adjust the skeleton posture to generate sling analysis.',
      overallForceTransferScore: 50,
      dominantDysfunction: null,
      crossSlingCompensations: [],
    };
  }

  const muscleStates = biomechanicsOutput.muscleAsymmetry.muscles;

  const intermediateResults = SLING_DEFINITIONS.map(def => {
    const { score, muscleScores } = computeSlingActivationScore(def, muscleStates);
    const weakLinks = detectWeakLinks(def, muscleScores);
    const forceReroutes = detectForceReroutes(def, muscleScores);

    return { def, activationScore: score, muscleScores, weakLinks, forceReroutes, status: 'normal' as SlingStatus };
  });

  intermediateResults.forEach(ir => {
    ir.status = classifySlingStatus(ir.activationScore, ir.weakLinks, [], ir.forceReroutes);
  });

  const crossCompensations = detectCrossSlingCompensations(intermediateResults);

  const slings: SlingResult[] = intermediateResults.map(ir => {
    const relevantCompensations = crossCompensations.filter(
      c => c.compensatingSling === ir.def.id
    );

    const status = classifySlingStatus(ir.activationScore, ir.weakLinks, relevantCompensations, ir.forceReroutes);
    const forceTransfer = classifyForceTransfer(ir.activationScore, ir.weakLinks, ir.forceReroutes);
    const downstreamRisk = classifyDownstreamRisk(status, ir.weakLinks, relevantCompensations);
    const confidence = computeConfidence(ir.muscleScores);
    const treatmentTargets = generateTreatmentTargets(ir.def, ir.weakLinks, ir.forceReroutes, ir.muscleScores);
    const narrative = generateNarrative(ir.def, status, ir.activationScore, forceTransfer, ir.weakLinks, relevantCompensations, ir.forceReroutes);

    return {
      slingId: ir.def.id,
      label: ir.def.label,
      color: ir.def.color,
      status,
      activationScore: ir.activationScore,
      forceTransferQuality: forceTransfer,
      weakLinks: ir.weakLinks,
      compensations: relevantCompensations,
      forceReroutes: ir.forceReroutes,
      downstreamRisk,
      confidence,
      treatmentTargets,
      narrative,
    };
  });

  const dysfunctionalSlings = slings.filter(s => s.status !== 'normal');
  const dominantDysfunction = dysfunctionalSlings.length > 0
    ? dysfunctionalSlings.sort((a, b) => a.activationScore - b.activationScore)[0].slingId
    : null;

  const forceScores = slings.map(s =>
    s.forceTransferQuality === 'good' ? 100 : s.forceTransferQuality === 'reduced' ? 60 : 30
  );
  const overallForceTransferScore = Math.round(forceScores.reduce((a, b) => a + b, 0) / forceScores.length);

  const summaryParts: string[] = [];
  if (dysfunctionalSlings.length === 0) {
    summaryParts.push('All 5 functional slings are operating within normal parameters.');
  } else {
    summaryParts.push(`${dysfunctionalSlings.length} of 5 slings show dysfunction.`);
    const underperf = slings.filter(s => s.status === 'underperforming');
    if (underperf.length > 0) {
      summaryParts.push(`Underperforming: ${underperf.map(s => s.label).join(', ')}.`);
    }
    const overloaded = slings.filter(s => s.status === 'overloaded');
    if (overloaded.length > 0) {
      summaryParts.push(`Overloaded: ${overloaded.map(s => s.label).join(', ')}.`);
    }
  }
  summaryParts.push(`Overall force transfer score: ${overallForceTransferScore}/100.`);

  return {
    timestamp,
    slings,
    systemSummary: summaryParts.join(' '),
    overallForceTransferScore,
    dominantDysfunction,
    crossSlingCompensations: crossCompensations,
  };
}

export function getSlingDefinitions(): SlingDefinition[] {
  return SLING_DEFINITIONS;
}

export function getSlingBonePathway(slingId: SlingId): string[] {
  const def = SLING_DEFINITIONS.find(d => d.id === slingId);
  return def?.bonePathway ?? [];
}

export function getSlingColor(slingId: SlingId): string {
  const def = SLING_DEFINITIONS.find(d => d.id === slingId);
  return def?.color ?? '#888888';
}
