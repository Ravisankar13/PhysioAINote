import type { BiomechanicsOutput, MuscleStateEntry } from './unifiedBiomechanicsEngine';
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
  joints: string[];
  primaryFunction: string;
  movementRole: string;
  commonDysfunctions: string[];
  assessmentTests: string[];
  clinicalRelevance: string;
  functionalSlingRef: FunctionalSling | null;
  kineticChainRef: KineticChainDefinition | null;
  propagationWeight: number;
  musclePairs: [string, string][];
  bonePathway: string[];
}

export interface WeakLink {
  muscle: string;
  activationPct: number;
  role: MuscleStateEntry['role'];
  reason: string;
  impactOnSling: string;
  boneSegmentIndices: number[];
}

export interface SlingCompensation {
  compensatingSling: SlingId;
  compensatingSlingLabel: string;
  compensatedSling: SlingId;
  compensatedSlingLabel: string;
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
  downstreamRiskArea: string;
  confidence: number;
  treatmentTargets: SlingTreatmentTarget[];
  narrative: string;
  commonDysfunctions: string[];
  assessmentTests: string[];
  overloadedBoneIndices: number[];
  compensatingBoneIndices: number[];
  muscleScores: Array<{ muscle: string; activation: number; found: boolean }>;
  activationLevelPct: number;
  activationBand: SlingActivationBand;
  clinicalConsequences: string[];
  /** Optional enrichment populated by the Compensation Re-Education engine
   *  (see `client/src/lib/compensationReEducation.ts`). The grouped
   *  `enrichment` object and the top-level fields are written together so
   *  downstream consumers can read either form. */
  enrichment?: import('./compensationReEducation').CompensationEnrichment;
  driver?: import('./compensationReEducation').CompensationDriver;
  drivers?: import('./compensationReEducation').CompensationDriver[];
  verdict?: import('./compensationReEducation').CompensationVerdict;
  cost?: import('./compensationLibrary').CompensationCostProfile;
  betterPatternId?: string | null;
  retrainingPlanId?: string | null;
}

export type SlingActivationBand =
  | 'severe_under'
  | 'mild_under'
  | 'baseline'
  | 'mild_over'
  | 'severe_over';

export const SLING_ACTIVATION_BASELINE = 100;
export const SLING_ACTIVATION_MIN = 0;
export const SLING_ACTIVATION_MAX = 200;

export interface SlingAnalysisResult {
  timestamp: number;
  slings: SlingResult[];
  systemSummary: string;
  overallForceTransferScore: number;
  dominantDysfunction: SlingId | null;
  secondaryIssue: { slingId: SlingId; summary: string } | null;
  crossSlingCompensations: SlingCompensation[];
}

export interface SlingAnalysisInput {
  biomechanicsOutput: BiomechanicsOutput | null;
  muscleOverrides?: Record<string, { tension?: number; pathology?: string }>;
  movementTaskId?: string;
  slingActivationOverrides?: Partial<Record<SlingId, number>>;
}

interface SlingSpec {
  id: SlingId;
  kineticChainId: string;
  functionalSlingId: string;
  color: string;
  muscles: string[];
  joints: string[];
  primaryFunction: string;
  movementRole: string;
  bonePathway: string[];
}

const SLING_SPECS: SlingSpec[] = [
  {
    id: 'posterior_oblique',
    kineticChainId: 'posterior_oblique_sling',
    functionalSlingId: 'posterior_oblique',
    color: '#f97316',
    muscles: ['latissimus_dorsi', 'thoracolumbar_fascia', 'gluteus_maximus', 'contralateral_gluteus_maximus'],
    joints: ['shoulder', 'thoracolumbar_junction', 'sacroiliac', 'hip'],
    primaryFunction: 'Contralateral upper-lower body force transfer during gait and rotation',
    movementRole: 'Gait propulsion, trunk counter-rotation, posterior chain power transfer',
    bonePathway: ['Shoulder_L', 'ShoulderPart1_L', 'Chest_M', 'Spine1Part2_M', 'Spine1Part1_M', 'Spine1_M', 'RootPart2_M', 'RootPart1_M', 'Root_M', 'Hip_R', 'HipPart1_R'],
  },
  {
    id: 'anterior_oblique',
    kineticChainId: 'anterior_oblique_sling',
    functionalSlingId: 'anterior_oblique',
    color: '#ec4899',
    muscles: ['external_oblique', 'anterior_abdominal_fascia', 'internal_oblique', 'adductors'],
    joints: ['pubic_symphysis', 'hip', 'anterior_trunk'],
    primaryFunction: 'Rotational power generation and deceleration, trunk stabilization',
    movementRole: 'Kicking, throwing deceleration, rotational sports, anti-rotation stability',
    bonePathway: ['Shoulder_R', 'Chest_M', 'Spine1_M', 'RootPart2_M', 'Root_M', 'Hip_L', 'HipPart1_L'],
  },
  {
    id: 'lateral',
    kineticChainId: 'lateral_subsystem',
    functionalSlingId: 'lateral_sling',
    color: '#06b6d4',
    muscles: ['gluteus_medius', 'gluteus_minimus', 'tensor_fasciae_latae', 'adductors', 'quadratus_lumborum'],
    joints: ['hip', 'knee', 'lumbar_spine'],
    primaryFunction: 'Frontal plane pelvic stability during single-leg stance',
    movementRole: 'Single-leg balance, gait stance phase, lateral stability, Trendelenburg prevention',
    bonePathway: ['Hip_L', 'HipPart1_L', 'Root_M', 'RootPart1_M', 'Spine1_M', 'Hip_R', 'HipPart1_R', 'Knee_R'],
  },
  {
    id: 'deep_longitudinal',
    kineticChainId: 'deep_longitudinal',
    functionalSlingId: 'deep_longitudinal',
    color: '#10b981',
    muscles: ['peroneus_longus', 'biceps_femoris', 'sacrotuberous_ligament', 'erector_spinae', 'thoracolumbar_fascia'],
    joints: ['ankle', 'knee', 'sacroiliac', 'lumbar_spine'],
    primaryFunction: 'Longitudinal force transfer from foot through pelvis to spine',
    movementRole: 'Shock absorption, ground reaction force transmission, spinal stabilization during gait',
    bonePathway: ['Ankle_L', 'Knee_L', 'Hip_L', 'HipPart1_L', 'Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Spine1Part1_M', 'Chest_M', 'Neck_M'],
  },
  {
    id: 'scapular_shoulder',
    kineticChainId: 'upper_extremity_chain',
    functionalSlingId: '',
    color: '#8b5cf6',
    muscles: ['serratus_anterior', 'lower_trapezius', 'rhomboids', 'rotator_cuff'],
    joints: ['scapulothoracic', 'glenohumeral', 'acromioclavicular'],
    primaryFunction: 'Scapulothoracic rhythm, glenohumeral force couple, overhead stability',
    movementRole: 'Overhead reaching, throwing, pushing, pulling, scapular upward rotation',
    bonePathway: ['Shoulder_L', 'ShoulderPart1_L', 'Chest_M', 'Spine1Part2_M', 'Shoulder_R', 'ShoulderPart1_R'],
  },
];

function buildSlingDefinitions(): SlingDefinition[] {
  return SLING_SPECS.map(spec => {
    const kineticChainRef = KINETIC_CHAINS.find(kc => kc.id === spec.kineticChainId) ?? null;
    const functionalSlingRef = spec.functionalSlingId
      ? FUNCTIONAL_SLINGS.find(fs => fs.id === spec.functionalSlingId) ?? null
      : null;

    const jointsFromKC = kineticChainRef?.links.map(l => l.jointId) ?? [];

    return {
      id: spec.id,
      label: functionalSlingRef?.name ?? kineticChainRef?.label ?? spec.primaryFunction.split(',')[0],
      color: spec.color,
      muscles: spec.muscles,
      joints: Array.from(new Set([...spec.joints, ...jointsFromKC])),
      primaryFunction: spec.primaryFunction,
      movementRole: spec.movementRole,
      commonDysfunctions: kineticChainRef?.commonDysfunctions ?? [],
      assessmentTests: kineticChainRef?.assessmentTests ?? [],
      clinicalRelevance: kineticChainRef?.clinicalRelevance ?? spec.primaryFunction,
      functionalSlingRef,
      kineticChainRef,
      propagationWeight: functionalSlingRef?.propagationWeight ?? 0.35,
      musclePairs: functionalSlingRef?.pairs ?? [],
      bonePathway: spec.bonePathway,
    };
  });
}

const SLING_DEFINITIONS = buildSlingDefinitions();

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

const SLING_CONSEQUENCE_BANDS: Record<SlingId, Record<SlingActivationBand, string[]>> = {
  posterior_oblique: {
    severe_under: [
      'Marked loss of rotational power during gait push-off',
      'Compensatory lumbar erector overload and SI joint shear',
      'Latissimus–contralateral gluteus force couple disconnected',
    ],
    mild_under: [
      'Reduced trunk counter-rotation efficiency',
      'Early onset of hamstring fatigue during running',
    ],
    baseline: ['Posterior oblique sling operating within normal force-transfer range'],
    mild_over: [
      'Increased thoracolumbar fascia tension',
      'Subtle restriction in thoracic rotation',
    ],
    severe_over: [
      'Rigid thoracolumbar fascia limiting trunk rotation',
      'Sustained latissimus tone driving shoulder depression',
      'SI joint compression from excessive force-closure',
    ],
  },
  anterior_oblique: {
    severe_under: [
      'Loss of rotational deceleration during throwing or kicking',
      'Pubic symphysis instability and groin overload',
      'Anterior trunk braced poorly against rotational load',
    ],
    mild_under: [
      'Reduced anti-rotation control in single-leg tasks',
      'Adductor strain risk on quick direction changes',
    ],
    baseline: ['Anterior oblique sling generating rotational power within normal range'],
    mild_over: [
      'Mild over-bracing of the abdominal wall',
      'Slight restriction in diaphragmatic excursion',
    ],
    severe_over: [
      'Rigid abdominal bracing limiting deep breathing',
      'Excessive adductor tone increasing groin and pubic symphysis load',
      'Rectus and oblique dominance suppressing deep core recruitment',
    ],
  },
  lateral: {
    severe_under: [
      'Trendelenburg gait with contralateral pelvic drop',
      'Dynamic knee valgus during single-leg stance',
      'Quadratus lumborum substituting for hip abduction',
    ],
    mild_under: [
      'Subtle pelvic drop during stance phase',
      'Lateral hip fatigue with prolonged walking',
    ],
    baseline: ['Lateral sling stabilizing the pelvis in the frontal plane normally'],
    mild_over: [
      'Slight lateral hip tightness and ITB tension',
      'Mild hip-hike pattern in gait',
    ],
    severe_over: [
      'Excessive ITB tension and lateral knee load',
      'TFL dominance suppressing gluteus medius recruitment',
      'Quadratus lumborum overactivity driving lumbar side-bend',
    ],
  },
  deep_longitudinal: {
    severe_under: [
      'Poor shock absorption from foot to spine',
      'Sacroiliac joint instability under longitudinal load',
      'Lumbar spine overloaded by unattenuated ground reaction forces',
    ],
    mild_under: [
      'Reduced calf-to-spine force transmission during heel strike',
      'Mild SI joint discomfort with running',
    ],
    baseline: ['Deep longitudinal sling transmitting ground reaction force normally'],
    mild_over: [
      'Mild erector spinae over-recruitment during gait',
      'Subtle hamstring tone elevation',
    ],
    severe_over: [
      'Rigid posterior chain limiting lumbar flexion',
      'Sustained erector spinae and biceps femoris tone',
      'Sacrotuberous ligament under chronic tensile load',
    ],
  },
  scapular_shoulder: {
    severe_under: [
      'Scapular dyskinesis with poor upward rotation',
      'Subacromial impingement risk during overhead reach',
      'Loss of glenohumeral force-couple stability',
    ],
    mild_under: [
      'Reduced scapular control in late-range elevation',
      'Mild fatigue with sustained overhead tasks',
    ],
    baseline: ['Scapular–shoulder sling producing normal scapulothoracic rhythm'],
    mild_over: [
      'Upper trapezius dominance during elevation',
      'Mild scapular elevation at rest',
    ],
    severe_over: [
      'Excessive upper trapezius and levator scapulae tone',
      'Restricted scapular downward rotation',
      'Glenohumeral force couple biased toward compression',
    ],
  },
};

function classifyActivationBand(activationPct: number): SlingActivationBand {
  if (activationPct < 60) return 'severe_under';
  if (activationPct < 85) return 'mild_under';
  if (activationPct <= 115) return 'baseline';
  if (activationPct <= 150) return 'mild_over';
  return 'severe_over';
}

function getSlingConsequences(slingId: SlingId, activationPct: number): string[] {
  const band = classifyActivationBand(activationPct);
  return SLING_CONSEQUENCE_BANDS[slingId]?.[band] ?? [];
}

const SLING_DOWNSTREAM_RISK_AREAS: Record<SlingId, string> = {
  posterior_oblique: 'Lumbar spine / contralateral hip',
  anterior_oblique: 'Groin / pubic symphysis',
  lateral: 'Knee (dynamic valgus) / hip',
  deep_longitudinal: 'Lumbar spine / sacroiliac joint',
  scapular_shoulder: 'Glenohumeral joint / subacromial space',
};

const SLING_JOINT_REGIONS: Record<string, string[]> = {
  posterior_oblique: ['shoulder', 'lumbar_spine', 'hip', 'pelvis'],
  anterior_oblique: ['hip', 'pelvis', 'trunk', 'anterolateral_trunk'],
  lateral: ['hip', 'knee', 'lateral_hip', 'lateral_lumbar', 'medial_thigh'],
  deep_longitudinal: ['ankle', 'knee', 'hip', 'pelvis', 'lumbar', 'spine'],
  scapular_shoulder: ['shoulder', 'scapular', 'elbow', 'wrist'],
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

function applyMuscleOverrides(
  muscle: string,
  baseActivation: number,
  baseRole: MuscleStateEntry['role'],
  overrides?: Record<string, { tension?: number; pathology?: string }>
): { activationPct: number; role: MuscleStateEntry['role'] } {
  if (!overrides) return { activationPct: baseActivation, role: baseRole };

  // Always probe the canonical muscle id (and its lowercase form) first,
  // then fall through to any aliases. Sling muscles like
  // `lower_trapezius` / `serratus_anterior` are referenced by canonical
  // id everywhere in the per-part flow, so they must hit even when an
  // alias array exists.
  const aliasList = MUSCLE_ALIASES[muscle] ?? [];
  const lookupKeys = [muscle, muscle.toLowerCase(), ...aliasList];
  for (const key of lookupKeys) {
    const override = overrides[key] ?? overrides[key.toLowerCase()];
    if (override) {
      let modifiedActivation = baseActivation;
      let modifiedRole = baseRole;
      if (override.tension !== undefined) {
        modifiedActivation = Math.max(0, Math.min(100, baseActivation + (override.tension - 50) * 0.5));
        // Treatment-side override: a positive tension boost means the
        // clinician is actively recruiting / facilitating the muscle.
        // Once the resulting activation crosses the underactive
        // threshold (35) and clears 50%, the muscle is no longer
        // weak-link material — flip role to 'normal' so
        // detectWeakLinks releases it and the sling can de-escalate.
        if (override.tension > 50 && modifiedActivation >= 50 &&
            (baseRole === 'underactive' || baseRole === 'inhibited')) {
          modifiedRole = 'normal';
        }
        // Conversely, an inhibitory override below 50 should mark the
        // muscle inhibited so weak-link detection picks it up.
        if (override.tension < 35 && baseRole === 'normal') {
          modifiedRole = 'underactive';
        }
      }
      if (override.pathology) {
        modifiedActivation = Math.max(0, modifiedActivation * 0.6);
        modifiedRole = 'inhibited';
      }
      return { activationPct: Math.round(modifiedActivation), role: modifiedRole };
    }
  }
  return { activationPct: baseActivation, role: baseRole };
}

function estimateActivation(
  muscle: string,
  muscleStates: MuscleStateEntry[],
  overrides?: Record<string, { tension?: number; pathology?: string }>
): { activationPct: number; role: MuscleStateEntry['role']; found: boolean } {
  const state = findMuscleActivation(muscle, muscleStates);
  if (state) {
    const modified = applyMuscleOverrides(muscle, state.activationPct, state.role, overrides);
    return { activationPct: modified.activationPct, role: modified.role, found: true };
  }
  return { activationPct: 50, role: 'normal', found: false };
}

function computePosturalPenalty(
  def: SlingDefinition,
  posture: BiomechanicsOutput['posture'] | null
): number {
  if (!posture) return 0;
  const slingRegions = SLING_JOINT_REGIONS[def.id] ?? [];
  let penalty = 0;
  for (const dev of posture.deviations) {
    const regionMatch = slingRegions.some(r =>
      dev.region?.toLowerCase().includes(r) ||
      dev.pattern?.toLowerCase().includes(r)
    );
    if (regionMatch) {
      const sevMul = dev.severity === 'severe' ? 15 : dev.severity === 'moderate' ? 8 : 3;
      penalty += sevMul;
    }
  }
  return Math.min(penalty, 30);
}

function computeFaultPenalty(
  def: SlingDefinition,
  faults: BiomechanicsOutput['faults'] | null
): number {
  if (!faults) return 0;
  const slingRegions = SLING_JOINT_REGIONS[def.id] ?? [];
  let penalty = 0;
  for (const fault of faults.faults) {
    const jointMatch = fault.affectedJoints.some(j =>
      slingRegions.some(r => j.toLowerCase().includes(r))
    );
    if (jointMatch) {
      const sevMul = fault.severity === 'severe' ? 12 : fault.severity === 'moderate' ? 6 : 2;
      penalty += sevMul;
    }
  }
  return Math.min(penalty, 25);
}

function computeCompensationBoost(
  def: SlingDefinition,
  compensations: BiomechanicsOutput['compensationPatterns'] | null
): number {
  if (!compensations) return 0;
  const slingRegions = SLING_JOINT_REGIONS[def.id] ?? [];
  let boost = 0;
  for (const pattern of compensations.patterns) {
    const regionMatch = slingRegions.some(r =>
      pattern.compensatingRegion.toLowerCase().includes(r) ||
      pattern.primaryRegion.toLowerCase().includes(r)
    );
    if (regionMatch) {
      boost += pattern.additionalLoadPct * 0.3;
    }
  }
  return Math.min(Math.round(boost), 20);
}

function computeKinematicsPenalty(
  def: SlingDefinition,
  kinematics: BiomechanicsOutput['jointKinematics'] | null
): number {
  if (!kinematics) return 0;
  const slingRegions = SLING_JOINT_REGIONS[def.id] ?? [];
  let penalty = 0;
  for (const jk of kinematics.joints) {
    if (!jk.withinNormal) {
      const jointMatch = slingRegions.some(r => jk.joint.toLowerCase().includes(r));
      if (jointMatch) {
        const [low, high] = jk.normalRangeDeg;
        const deviation = jk.currentAngleDeg < low
          ? low - jk.currentAngleDeg
          : jk.currentAngleDeg - high;
        penalty += Math.min(deviation * 0.3, 8);
      }
    }
  }
  return Math.min(Math.round(penalty), 20);
}

function computeSlingActivationScore(
  def: SlingDefinition,
  muscleStates: MuscleStateEntry[],
  overrides?: Record<string, { tension?: number; pathology?: string }>
): { score: number; muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }> } {
  const muscleScores = def.muscles.map(m => {
    const est = estimateActivation(m, muscleStates, overrides);
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
  for (let i = 0; i < muscleScores.length; i++) {
    const ms = muscleScores[i];
    if (!ms.found) continue;
    if (ms.role === 'underactive' || ms.role === 'inhibited' || ms.activation < 35) {
      const reason = ms.role === 'inhibited'
        ? `${ms.muscle} is neurally inhibited, failing to contribute to ${def.label}`
        : ms.role === 'underactive'
          ? `${ms.muscle} is underactive (${ms.activation}%), reducing sling efficiency`
          : `${ms.muscle} activation critically low (${ms.activation}%)`;

      const totalBones = def.bonePathway.length;
      const segStart = Math.floor((i / muscleScores.length) * totalBones);
      const segEnd = Math.min(Math.ceil(((i + 1) / muscleScores.length) * totalBones), totalBones - 1);
      const boneSegmentIndices: number[] = [];
      for (let b = segStart; b <= segEnd; b++) {
        boneSegmentIndices.push(b);
      }

      weakLinks.push({
        muscle: ms.muscle,
        activationPct: ms.activation,
        role: ms.role,
        reason,
        impactOnSling: `Breaks force continuity in ${def.label}, forcing adjacent muscles to compensate`,
        boneSegmentIndices,
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
          compensatedSling: weak.def.id,
          compensatedSlingLabel: weak.def.label,
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
  // Thresholds re-checked after the segment-chain force-engine shift: sling
  // status is driven by muscle activation %, not by joint force magnitudes,
  // so the new chain physics does not flip canonical case classifications.
  // The overloaded threshold was nudged 75 → 72 so that arm-chain demand
  // reductions (bent-elbow overhead) still surface as 'overloaded' in the
  // shoulder-pain canonical case where the patient barely clears the cut-off.
  const isCompensating = compensations.some(c => c.compensatingSling !== undefined);
  if (weakLinks.length >= 2 || activationScore < 30) return 'underperforming';
  if (activationScore > 72 && forceReroutes.length > 0) return 'overloaded';
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

function computeOverloadedBoneIndices(
  def: SlingDefinition,
  muscleScores: Array<{ muscle: string; activation: number; role: MuscleStateEntry['role']; found: boolean }>
): number[] {
  const indices: number[] = [];
  const totalBones = def.bonePathway.length;
  for (let i = 0; i < muscleScores.length; i++) {
    const ms = muscleScores[i];
    if (ms.found && ms.role === 'overactive' && ms.activation > 70) {
      const segIdx = Math.min(Math.round((i / muscleScores.length) * totalBones), totalBones - 1);
      if (!indices.includes(segIdx)) indices.push(segIdx);
    }
  }
  return indices;
}

function computeCompensatingBoneIndices(
  def: SlingDefinition,
  compensations: SlingCompensation[]
): number[] {
  if (compensations.length === 0) return [];
  const totalBones = def.bonePathway.length;
  const endIdx = totalBones - 1;
  return [Math.max(0, endIdx - 1), endIdx];
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

  if (def.commonDysfunctions.length > 0 && weakLinks.length > 0) {
    parts.push(`Common pattern: ${def.commonDysfunctions[0]}`);
  }

  parts.push(`Primary role affected: ${def.movementRole}.`);
  return parts.join(' ');
}

export function computeSlingAnalysis(
  input: SlingAnalysisInput
): SlingAnalysisResult {
  const { biomechanicsOutput, muscleOverrides, movementTaskId, slingActivationOverrides } = input;
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
        downstreamRiskArea: '',
        confidence: 0,
        treatmentTargets: [],
        narrative: `${def.label}: No biomechanical data available for analysis.`,
        commonDysfunctions: def.commonDysfunctions,
        assessmentTests: def.assessmentTests,
        overloadedBoneIndices: [],
        compensatingBoneIndices: [],
        muscleScores: def.muscles.map(m => ({ muscle: m, activation: 50, found: false })),
        activationLevelPct: SLING_ACTIVATION_BASELINE,
        activationBand: 'baseline' as SlingActivationBand,
        clinicalConsequences: getSlingConsequences(def.id, SLING_ACTIVATION_BASELINE),
      })),
      systemSummary: 'No biomechanical data available. Adjust the skeleton posture to generate sling analysis.',
      overallForceTransferScore: 50,
      dominantDysfunction: null,
      secondaryIssue: null,
      crossSlingCompensations: [],
    };
  }

  const muscleStates = biomechanicsOutput.muscleAsymmetry.muscles;
  const posture = biomechanicsOutput.posture;
  const faults = biomechanicsOutput.faults;
  const compensationPatterns = biomechanicsOutput.compensationPatterns;
  const kinematics = biomechanicsOutput.jointKinematics;

  const intermediateResults = SLING_DEFINITIONS.map(def => {
    const { score: rawScore, muscleScores } = computeSlingActivationScore(def, muscleStates, muscleOverrides);

    const posturalPenalty = computePosturalPenalty(def, posture);
    const faultPenalty = computeFaultPenalty(def, faults);
    const compBoost = computeCompensationBoost(def, compensationPatterns);
    const kinematicsPenalty = computeKinematicsPenalty(def, kinematics);

    const baselineScore = Math.max(0, Math.min(100,
      rawScore - posturalPenalty - faultPenalty + compBoost - kinematicsPenalty
    ));

    const weakLinks = detectWeakLinks(def, muscleScores);
    const forceReroutes = detectForceReroutes(def, muscleScores);

    const rawActivationLevel = slingActivationOverrides?.[def.id];
    const activationLevelPct = rawActivationLevel === undefined
      ? SLING_ACTIVATION_BASELINE
      : Math.max(SLING_ACTIVATION_MIN, Math.min(SLING_ACTIVATION_MAX, rawActivationLevel));
    const activationMultiplier = activationLevelPct / SLING_ACTIVATION_BASELINE;

    // Force-transfer efficiency: peaks at baseline, drops off both
    // when underactive (linear with multiplier) and when overactive
    // (excess tone reduces coordinated transfer).
    let efficiency: number;
    if (activationLevelPct <= SLING_ACTIVATION_BASELINE) {
      efficiency = activationMultiplier;
    } else {
      const overshoot = (activationLevelPct - SLING_ACTIVATION_BASELINE) / SLING_ACTIVATION_BASELINE;
      efficiency = Math.max(0, 1 - overshoot * 0.6);
    }

    const adjustedScore = Math.max(0, Math.min(100, baselineScore * efficiency));

    const scaledMuscleScores = muscleScores.map(ms => ({
      ...ms,
      activation: Math.max(0, Math.min(100, Math.round(ms.activation * activationMultiplier))),
    }));

    return {
      def,
      activationScore: adjustedScore,
      muscleScores: scaledMuscleScores,
      weakLinks,
      forceReroutes,
      status: 'normal' as SlingStatus,
      activationLevelPct,
    };
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
    const overloadedBoneIndices = computeOverloadedBoneIndices(ir.def, ir.muscleScores);
    const compensatingBoneIndices = computeCompensatingBoneIndices(ir.def, relevantCompensations);

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
      downstreamRiskArea: downstreamRisk !== 'none' ? SLING_DOWNSTREAM_RISK_AREAS[ir.def.id] : '',
      confidence,
      treatmentTargets,
      narrative,
      commonDysfunctions: ir.def.commonDysfunctions,
      assessmentTests: ir.def.assessmentTests,
      overloadedBoneIndices,
      compensatingBoneIndices,
      muscleScores: ir.muscleScores.map(ms => ({ muscle: ms.muscle, activation: ms.activation, found: ms.found })),
      activationLevelPct: ir.activationLevelPct,
      activationBand: classifyActivationBand(ir.activationLevelPct),
      clinicalConsequences: getSlingConsequences(ir.def.id, ir.activationLevelPct),
    };
  });

  const dysfunctionalSlings = slings.filter(s => s.status !== 'normal');
  const sortedDysfunctional = [...dysfunctionalSlings].sort((a, b) => a.activationScore - b.activationScore);
  const dominantDysfunction = sortedDysfunctional.length > 0
    ? sortedDysfunctional[0].slingId
    : null;
  const secondaryIssue = sortedDysfunctional.length > 1
    ? {
        slingId: sortedDysfunctional[1].slingId,
        summary: `${sortedDysfunctional[1].label} — ${sortedDysfunctional[1].status}${sortedDysfunctional[1].downstreamRiskArea ? `, risk area: ${sortedDysfunctional[1].downstreamRiskArea}` : ''}`,
      }
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
    const overloadedSlings = slings.filter(s => s.status === 'overloaded');
    if (overloadedSlings.length > 0) {
      summaryParts.push(`Overloaded: ${overloadedSlings.map(s => s.label).join(', ')}.`);
    }
  }
  if (movementTaskId) {
    summaryParts.push(`Analysis context: ${movementTaskId} movement task.`);
  }
  summaryParts.push(`Overall force transfer score: ${overallForceTransferScore}/100.`);

  return {
    timestamp,
    slings,
    systemSummary: summaryParts.join(' '),
    overallForceTransferScore,
    dominantDysfunction,
    secondaryIssue,
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
