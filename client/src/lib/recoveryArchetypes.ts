import type { HealingPhase } from './recoverySimulationEngine';

export type RecoveryArchetypeId =
  | 'acute_tissue_healing'
  | 'tendinopathy_load_capacity'
  | 'degenerative_oa'
  | 'mechanical_impingement'
  | 'frozen_shoulder'
  | 'radicular_neuropathic'
  | 'disc_centralisation'
  | 'bone_stress'
  | 'chronic_nociplastic'
  | 'instability_hypermobility';

export type ProgressionMode = 'time-gated' | 'criterion-gated' | 'hybrid';

export type StageGoalDimension = 'pain' | 'rom' | 'capacity' | 'loadTolerance' | 'function';

export interface RecoveryStage {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  ring: string;
  bg: string;
  /** Engine HealingPhases that map onto this stage. Used to (a) place the
   *  current state on the strip and (b) cascade existing TREATMENT_LIBRARY
   *  healingStageMultiplier values onto this stage's treatment-fit score. */
  healingPhases: HealingPhase[];
  /** Default fraction of total recovery this stage occupies, used when the
   *  bound condition profile's phase count differs from the archetype's. */
  defaultFraction: number;
  /** Preferred goal dimension for this stage (overrides the global tissue
   *  default when set). */
  goalDimension?: StageGoalDimension;
  /** Optional textual hints used to bias treatment matching for archetypes
   *  whose stages are not driven by the four-phase healing model. */
  treatmentTags?: string[];
}

export interface RecoveryArchetype {
  id: RecoveryArchetypeId;
  name: string;
  progressionMode: ProgressionMode;
  stages: RecoveryStage[];
}

const PHASE_4: HealingPhase[][] = [
  ['inflammatory'],
  ['proliferative'],
  ['remodeling'],
  ['maturation'],
];

const ACUTE: RecoveryArchetype = {
  id: 'acute_tissue_healing',
  name: 'Acute Tissue Healing',
  progressionMode: 'time-gated',
  stages: [
    { id: 'acute_inflammatory',  name: 'Calm & Prepare',   subtitle: 'Reduce Irritability',     color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.18 },
    { id: 'acute_proliferative', name: 'Build Capacity',   subtitle: 'Progressive Loading',     color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.30 },
    { id: 'acute_remodeling',    name: 'Restore Power',    subtitle: 'Reintroduce Impact',      color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.30 },
    { id: 'acute_maturation',    name: 'Return to Sport',  subtitle: 'Full Performance',        color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.22 },
  ],
};

const TENDINOPATHY: RecoveryArchetype = {
  id: 'tendinopathy_load_capacity',
  name: 'Tendinopathy — Load Capacity',
  progressionMode: 'hybrid',
  stages: [
    { id: 'tend_pain',     name: 'Pain Dominance',         subtitle: 'Settle reactive tendon · isometric load below pain threshold', color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.18, goalDimension: 'pain',         treatmentTags: ['isometric', 'education', 'load management'] },
    { id: 'tend_iso',      name: 'Isometric Loading',      subtitle: 'Build tolerance with sustained isometrics',                    color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.27, goalDimension: 'capacity',     treatmentTags: ['isometric', 'isotonic'] },
    { id: 'tend_hsr',      name: 'Heavy Slow Resistance',  subtitle: 'Slow heavy concentric/eccentric for tendon adaptation',        color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.32, goalDimension: 'capacity',     treatmentTags: ['heavy slow', 'eccentric', 'isotonic', 'resistance'] },
    { id: 'tend_storage',  name: 'Energy Storage / RTS',   subtitle: 'Plyometrics, sport drills, return to high-velocity tasks',     color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.23, goalDimension: 'loadTolerance', treatmentTags: ['plyo', 'sport', 'agility', 'energy storage'] },
  ],
};

const DEGEN_OA: RecoveryArchetype = {
  id: 'degenerative_oa',
  name: 'Degenerative / OA',
  progressionMode: 'hybrid',
  stages: [
    { id: 'oa_settle',   name: 'Symptom Settle',           subtitle: 'Education, pacing, low-impact movement, flare control',        color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.18, goalDimension: 'pain',     treatmentTags: ['education', 'aquatic', 'walking', 'gentle'] },
    { id: 'oa_capacity', name: 'Capacity Build',           subtitle: 'Progressive strengthening of supporting musculature',           color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.30, goalDimension: 'capacity', treatmentTags: ['strengthening', 'resistance'] },
    { id: 'oa_load',     name: 'Load Tolerance',           subtitle: 'Functional task-loading within joint envelope',                 color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.27, goalDimension: 'function', treatmentTags: ['functional', 'loading'] },
    { id: 'oa_maintain', name: 'Flare-Resilient Maintenance', subtitle: 'Long-term self-management, pacing, flare-plan readiness',   color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.25, goalDimension: 'function', treatmentTags: ['home exercise', 'pacing', 'maintenance'] },
  ],
};

const IMPINGEMENT: RecoveryArchetype = {
  id: 'mechanical_impingement',
  name: 'Mechanical Impingement',
  progressionMode: 'criterion-gated',
  stages: [
    { id: 'imp_provocation', name: 'Provocation Control',     subtitle: 'Avoid pinch-positions, settle reactive tissue',              color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.20, goalDimension: 'pain',     treatmentTags: ['education', 'manual', 'positioning'] },
    { id: 'imp_motor',       name: 'Motor Control',            subtitle: 'Scapular / pelvic control to clear the impingement arc',     color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.28, goalDimension: 'rom',      treatmentTags: ['scapular', 'motor control', 'stabilization'] },
    { id: 'imp_strength',    name: 'Strength Under Task',      subtitle: 'Loaded ROM with control through provocative range',          color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.28, goalDimension: 'capacity', treatmentTags: ['strengthening', 'loading'] },
    { id: 'imp_reexposure',  name: 'Sport / Work Re-Exposure', subtitle: 'Graded return to provocative end-range demands',             color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.24, goalDimension: 'function', treatmentTags: ['sport specific', 'overhead', 'functional'] },
  ],
};

const FROZEN: RecoveryArchetype = {
  id: 'frozen_shoulder',
  name: 'Frozen Shoulder',
  progressionMode: 'time-gated',
  stages: [
    { id: 'fs_freezing', name: 'Freezing',  subtitle: 'Painful phase — pain-relief priority, gentle pendulums, education on natural history', color: '#ef4444', ring: 'border-red-500/60',     bg: 'bg-red-950/40',     healingPhases: ['inflammatory'],                   defaultFraction: 0.30, goalDimension: 'pain', treatmentTags: ['education', 'gentle', 'pendulum', 'pain relief'] },
    { id: 'fs_frozen',   name: 'Frozen',    subtitle: 'Stiff phase — progressive stretching, joint mobilisation, mobility work',              color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: ['proliferative', 'remodeling'],    defaultFraction: 0.40, goalDimension: 'rom',  treatmentTags: ['stretching', 'mobilization', 'manual'] },
    { id: 'fs_thawing',  name: 'Thawing',   subtitle: 'Recovery phase — active ROM restoration, strengthening, functional return',            color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: ['maturation'],                     defaultFraction: 0.30, goalDimension: 'function', treatmentTags: ['exercise', 'functional', 'strengthening'] },
  ],
};

const RADICULAR: RecoveryArchetype = {
  id: 'radicular_neuropathic',
  name: 'Radicular / Neuropathic',
  progressionMode: 'time-gated',
  stages: [
    { id: 'rad_desens',   name: 'Neural Desensitisation', subtitle: 'Positional relief, neural-tension management, pain-mechanism education', color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.22, goalDimension: 'pain',     treatmentTags: ['neural', 'traction', 'positioning', 'education'] },
    { id: 'rad_mobility', name: 'Neural Mobility',        subtitle: 'Sliders / tensioners, restore neural glide and nerve-tissue tolerance',  color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.26, goalDimension: 'rom',      treatmentTags: ['neural mobilization', 'mobility'] },
    { id: 'rad_strength', name: 'Myotome Strength',       subtitle: 'Strengthen compromised myotomes, deep stabilisers',                      color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.26, goalDimension: 'capacity', treatmentTags: ['strengthening', 'motor control', 'stabilization'] },
    { id: 'rad_function', name: 'Provocative-Task Tolerance', subtitle: 'Sustained-position tolerance, return to work / sport demands',       color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.26, goalDimension: 'function', treatmentTags: ['functional', 'ergonomic', 'progressive loading'] },
  ],
};

const DISC: RecoveryArchetype = {
  id: 'disc_centralisation',
  name: 'Disc / Centralisation',
  progressionMode: 'time-gated',
  stages: [
    { id: 'disc_central',  name: 'Centralise',                  subtitle: 'Find directional preference, centralise referred symptoms', color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.20, goalDimension: 'pain',     treatmentTags: ['directional preference', 'mckenzie', 'centralization', 'education'] },
    { id: 'disc_loading',  name: 'Directional-Preference Load', subtitle: 'Progressive loading in pain-easing direction',              color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.28, goalDimension: 'rom',      treatmentTags: ['loading', 'motor control', 'core'] },
    { id: 'disc_function', name: 'Functional Restoration',      subtitle: 'Restore movement variability, deep-stabiliser endurance',   color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.28, goalDimension: 'capacity', treatmentTags: ['functional', 'core stability', 'strengthening'] },
    { id: 'disc_return',   name: 'Return to Load',              subtitle: 'Loaded lifting, sustained sitting, full-task tolerance',     color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.24, goalDimension: 'function', treatmentTags: ['lifting', 'functional', 'progressive loading'] },
  ],
};

const BONE: RecoveryArchetype = {
  id: 'bone_stress',
  name: 'Bone Stress / Fracture',
  progressionMode: 'time-gated',
  stages: [
    { id: 'bone_offload',  name: 'Offload',               subtitle: 'Protect, immobilise as required, manage pain',                   color: '#ef4444', ring: 'border-red-500/60',     bg: 'bg-red-950/40',     healingPhases: PHASE_4[0], defaultFraction: 0.20, goalDimension: 'pain',         treatmentTags: ['protection', 'immobilization', 'offload'] },
    { id: 'bone_callus',   name: 'Callus / Consolidation', subtitle: 'Bone consolidation, gentle weight-bearing as tolerated',         color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[1], defaultFraction: 0.30, goalDimension: 'loadTolerance', treatmentTags: ['weight bearing', 'gentle loading'] },
    { id: 'bone_loading',  name: 'Progressive Loading',   subtitle: 'Graded mechanical loading to drive bone remodelling',             color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.28, goalDimension: 'capacity',     treatmentTags: ['progressive loading', 'strengthening'] },
    { id: 'bone_impact',   name: 'Return to Impact',      subtitle: 'Plyometric prep, return to running / impact sport',              color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.22, goalDimension: 'function',     treatmentTags: ['plyo', 'impact', 'running'] },
  ],
};

const CHRONIC: RecoveryArchetype = {
  id: 'chronic_nociplastic',
  name: 'Chronic / Nociplastic',
  progressionMode: 'criterion-gated',
  stages: [
    { id: 'chronic_education', name: 'Education + Desensitisation', subtitle: 'Pain-neuroscience education, graded sensory desensitisation', color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.22, goalDimension: 'pain',     treatmentTags: ['education', 'pain neuroscience', 'desensitization'] },
    { id: 'chronic_pacing',    name: 'Pacing',                       subtitle: 'Establish baseline tolerances, structured activity pacing',   color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.26, goalDimension: 'function', treatmentTags: ['pacing', 'activity scheduling'] },
    { id: 'chronic_exposure',  name: 'Graded Exposure',              subtitle: 'Graded exposure to feared / avoided movements',               color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.28, goalDimension: 'function', treatmentTags: ['graded exposure', 'functional'] },
    { id: 'chronic_recon',     name: 'Reconceptualisation',          subtitle: 'Reconceptualise pain meaning, build long-term self-efficacy',  color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.24, goalDimension: 'function', treatmentTags: ['self management', 'maintenance'] },
  ],
};

const INSTABILITY: RecoveryArchetype = {
  id: 'instability_hypermobility',
  name: 'Instability / Hypermobility',
  progressionMode: 'criterion-gated',
  stages: [
    { id: 'inst_proprio',  name: 'Proprioception',     subtitle: 'Joint position sense, low-load balance and awareness',            color: '#a855f7', ring: 'border-purple-500/60',  bg: 'bg-purple-950/40',  healingPhases: PHASE_4[0], defaultFraction: 0.22, goalDimension: 'rom',      treatmentTags: ['proprioception', 'balance'] },
    { id: 'inst_cocontract', name: 'Co-Contraction',    subtitle: 'Stabiliser co-activation, controlled mid-range loading',          color: '#06b6d4', ring: 'border-cyan-500/60',    bg: 'bg-cyan-950/40',    healingPhases: PHASE_4[1], defaultFraction: 0.26, goalDimension: 'capacity', treatmentTags: ['stabilization', 'motor control'] },
    { id: 'inst_strength', name: 'Strength',            subtitle: 'Build through-range strength to support lax joint capsule',       color: '#22c55e', ring: 'border-emerald-500/60', bg: 'bg-emerald-950/40', healingPhases: PHASE_4[2], defaultFraction: 0.28, goalDimension: 'capacity', treatmentTags: ['strengthening', 'resistance'] },
    { id: 'inst_reactive', name: 'Reactive Stability',  subtitle: 'Reactive control under perturbation and sport-specific demands',  color: '#f59e0b', ring: 'border-amber-500/60',   bg: 'bg-amber-950/40',   healingPhases: PHASE_4[3], defaultFraction: 0.24, goalDimension: 'function', treatmentTags: ['reactive', 'agility', 'sport specific'] },
  ],
};

export const RECOVERY_ARCHETYPES: Record<RecoveryArchetypeId, RecoveryArchetype> = {
  acute_tissue_healing:       ACUTE,
  tendinopathy_load_capacity: TENDINOPATHY,
  degenerative_oa:            DEGEN_OA,
  mechanical_impingement:     IMPINGEMENT,
  frozen_shoulder:            FROZEN,
  radicular_neuropathic:      RADICULAR,
  disc_centralisation:        DISC,
  bone_stress:                BONE,
  chronic_nociplastic:        CHRONIC,
  instability_hypermobility:  INSTABILITY,
};

/** Map condition IDs (from both classifyCondition and CONDITION_RECOVERY_PROFILES)
 *  to their archetype. Default fallback is acute_tissue_healing. */
const CONDITION_ARCHETYPE_MAP: Record<string, RecoveryArchetypeId> = {
  // Tendinopathies — load capacity
  rotator_cuff_tendinopathy: 'tendinopathy_load_capacity',
  achilles_tendinopathy:     'tendinopathy_load_capacity',
  patellar_tendinopathy:     'tendinopathy_load_capacity',
  gluteal_tendinopathy:      'tendinopathy_load_capacity',
  lateral_epicondylalgia:    'tendinopathy_load_capacity',
  plantar_fasciitis:         'tendinopathy_load_capacity',

  // Frozen shoulder — its own natural-history archetype
  frozen_shoulder:           'frozen_shoulder',

  // Mechanical impingements
  subacromial_impingement:   'mechanical_impingement',
  patellofemoral_pain:       'mechanical_impingement',

  // Degenerative / OA
  osteoarthritis:            'degenerative_oa',
  hip_oa:                    'degenerative_oa',

  // Radicular / neuropathic / stenosis / myelopathy
  radiculopathy:             'radicular_neuropathic',
  cervical_radiculopathy:    'radicular_neuropathic',
  lumbar_stenosis:           'radicular_neuropathic',
  cervical_myelopathy:       'radicular_neuropathic',
  nerve_entrapment:          'radicular_neuropathic',

  // Disc-driven LBP
  disc_herniation:           'disc_centralisation',
  lumbar_disc_herniation:    'disc_centralisation',
  spondylolisthesis:         'disc_centralisation',

  // Bone stress / fracture
  bone_stress:               'bone_stress',

  // Chronic / nociplastic
  chronic_pain:              'chronic_nociplastic',

  // Instability / hypermobility
  joint_instability:         'instability_hypermobility',

  // Acute tissue healing — tears, sprains, post-surgical, joint replacement, meniscal
  rotator_cuff_tear:         'acute_tissue_healing',
  muscle_strain:             'acute_tissue_healing',
  ankle_sprain_lateral:      'acute_tissue_healing',
  acl_reconstruction:        'acute_tissue_healing',
  meniscal_injury:           'acute_tissue_healing',
  post_surgical:             'acute_tissue_healing',
  joint_replacement:         'acute_tissue_healing',
  whiplash:                  'acute_tissue_healing',
  generic:                   'acute_tissue_healing',
};

/** Natural-language fallback rules used when a conditionId is unknown
 *  (e.g. classifyCondition fell through to 'generic'). Patterns are checked
 *  in order; the first hit wins. */
const NL_ARCHETYPE_FALLBACKS: { match: RegExp; archetype: RecoveryArchetypeId }[] = [
  { match: /(frozen shoulder|adhesive capsulitis)/i,                                           archetype: 'frozen_shoulder' },
  { match: /(tendinopath|tendinos|tendinitis|tendonitis)/i,                                    archetype: 'tendinopathy_load_capacity' },
  { match: /(impinge|fai|patellofemoral|pfps)/i,                                               archetype: 'mechanical_impingement' },
  { match: /(osteoarthr|degenerat|^oa\b|joint arthritis|hip arthritis|knee arthritis|spondylos|facet (arthropath|joint|syndrome)|baastrup|kissing spine|chondromal|chondral)/i, archetype: 'degenerative_oa' },
  { match: /(radicul|sciatica|nerve root|stenosis|myelopath|nerve entrap|carpal tunnel)/i,     archetype: 'radicular_neuropathic' },
  { match: /(disc|prolaps|herniat|spondylolisthe)/i,                                           archetype: 'disc_centralisation' },
  { match: /(stress fracture|stress reaction|bone stress|fracture)/i,                          archetype: 'bone_stress' },
  { match: /(fibromyalg|chronic pain|chronic widespread|central sensit|nociplastic|cps)/i,     archetype: 'chronic_nociplastic' },
  { match: /(hypermobil|ehlers[- ]danlos|eds|joint instab|multidirectional instab|subluxation)/i, archetype: 'instability_hypermobility' },
];

/** Resolve an archetype ID from a condition ID and/or a free-text label.
 *  Order of resolution:
 *   1. Direct conditionId → CONDITION_ARCHETYPE_MAP lookup.
 *   2. Natural-language regex against the label (or the conditionId itself).
 *   3. Fallback to acute_tissue_healing. */
export function resolveArchetypeId(
  conditionId?: string | null,
  conditionLabel?: string | null,
): RecoveryArchetypeId {
  if (conditionId && CONDITION_ARCHETYPE_MAP[conditionId]) {
    return CONDITION_ARCHETYPE_MAP[conditionId];
  }
  const text = `${conditionLabel ?? ''} ${conditionId ?? ''}`.trim();
  if (text) {
    for (const rule of NL_ARCHETYPE_FALLBACKS) {
      if (rule.match.test(text)) return rule.archetype;
    }
  }
  return 'acute_tissue_healing';
}

export function getArchetypeForCondition(
  conditionId?: string | null,
  conditionLabel?: string | null,
): RecoveryArchetype {
  return RECOVERY_ARCHETYPES[resolveArchetypeId(conditionId, conditionLabel)];
}

/** Index of the archetype stage that contains a given engine HealingPhase.
 *  Returns 0 when not found so the strip never breaks. */
export function stageIndexForHealingPhase(archetype: RecoveryArchetype, phase: HealingPhase): number {
  const idx = archetype.stages.findIndex(s => s.healingPhases.includes(phase));
  return idx >= 0 ? idx : 0;
}

/** Stage-fit score for a treatment, given its healingStageMultiplier map.
 *  Cascades the existing TREATMENT_LIBRARY metadata onto every archetype by
 *  taking the max multiplier across the engine phases that map onto this
 *  stage. Returns 1 when no multiplier is defined. */
export function stageFitForTreatment(
  stage: RecoveryStage,
  healingStageMultiplier?: Partial<Record<HealingPhase, number>>,
  treatmentName?: string,
): number {
  let fit = 1;
  if (healingStageMultiplier) {
    fit = Math.max(
      ...stage.healingPhases.map(p => healingStageMultiplier[p] ?? 1),
    );
  }
  if (stage.treatmentTags && treatmentName) {
    const lower = treatmentName.toLowerCase();
    if (stage.treatmentTags.some(tag => lower.includes(tag.toLowerCase()))) {
      fit = Math.max(fit, 1.2);
    }
  }
  return fit;
}
