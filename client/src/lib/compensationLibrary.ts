/**
 * Compensation Library
 * --------------------
 * Catalogue of known compensation strategies that humans use to achieve a
 * target movement when the prime mover or its supporting tissue is not
 * available. Patterns for each (joint, movement) target are ordered from
 * worst (highest cost, most secondary harm) to best (closest to ideal).
 *
 * The Re-Education Engine matches a live detector finding to one of these
 * patterns by name/keyword, reads its baseline cost profile, and uses the
 * `betterPatternId` chain to recommend the next-best substitution.
 *
 * Data here is intentionally pure — no React, no engine imports — so it can
 * be unit-tested and consumed by both classifier and UI panel.
 */

export type CostKey = 'cervical' | 'acJoint' | 'energy' | 'secondaryRisk';

export interface CompensationCostProfile {
  cervical: number;     // 0-1: load shunted to neck/upper trap
  acJoint: number;      // 0-1: load shunted to AC / scapulothoracic
  energy: number;       // 0-1: extra metabolic cost vs. ideal pattern
  secondaryRisk: number;// 0-1: downstream injury risk if sustained
}

export interface CompensationPatternEntry {
  id: string;
  /** Canonical short label shown in UI chips. */
  label: string;
  /** One-sentence clinical description of the strategy. */
  description: string;
  /** Lower index = worse pattern (rank 0 is worst, last is closest to ideal). */
  rank: number;
  /** Baseline cost profile if this pattern is sustained. */
  cost: CompensationCostProfile;
  /** Keywords used by the classifier to match a detector finding to this entry. */
  matchKeywords: string[];
  /**
   * Pointer to the next-better entry in this same target's pattern list.
   * Null on the lowest-cost entry. Populated by `buildLibraryIndex` so
   * authors only have to maintain rank order.
   */
  betterPatternId?: string | null;
  /** Retraining plan id this pattern unlocks (see RETRAINING_PLANS). */
  retrainingPlanId?: string;
}

export interface CompensationTarget {
  /** e.g. "leftShoulder:flexion" — matches detector output keys. */
  id: string;
  joint: string;
  movement: string;
  patterns: CompensationPatternEntry[];
}

export interface RetrainingPhase {
  id: 'tissue_extensibility' | 'unloaded_pattern' | 'loaded' | 'functional' | 'accept_residual';
  label: string;
  /** Goal of this phase, written in clinician language. */
  goal: string;
  /** Measurable gate the patient must clear before progressing. */
  gateCriteria: string;
  /** 1-3 example interventions, free-text. */
  exampleInterventions: string[];
}

export interface RetrainingPlan {
  id: string;
  label: string;
  /** Ordered phases. */
  phases: RetrainingPhase[];
}

// ---------------------------------------------------------------------------
// Retraining plans — referenced by patterns
// ---------------------------------------------------------------------------

export const RETRAINING_PLANS: Record<string, RetrainingPlan> = {
  scapulohumeral_rhythm: {
    id: 'scapulohumeral_rhythm',
    label: 'Re-establish scapulohumeral rhythm',
    phases: [
      {
        id: 'tissue_extensibility',
        label: 'Tissue extensibility',
        goal: 'Restore posterior capsule, lat and pec minor length so the humerus can rotate without scapular hijacking.',
        gateCriteria: 'Passive shoulder flexion ≥ 150° without thoracic extension assist; sleeper stretch ≥ 70° IR.',
        exampleInterventions: ['Sleeper stretch 3×30s', 'Pec minor self-release 2 min', 'Lat foam roll 2 min'],
      },
      {
        id: 'unloaded_pattern',
        label: 'Unloaded pattern',
        goal: 'Teach upward rotation and posterior tilt of the scapula in supine / wall slide where gravity can\'t recruit upper trap.',
        gateCriteria: 'Wall slide to 120° flexion with no audible/visible shrug, 10 reps clean.',
        exampleInterventions: ['Supine PNF flexion', 'Wall slides', 'Serratus punch in supine'],
      },
      {
        id: 'loaded',
        label: 'Loaded',
        goal: 'Add light external load while maintaining the new pattern.',
        gateCriteria: 'Active flexion to 150° with 1-2 kg, no shrug, no painful arc.',
        exampleInterventions: ['Y-T-W with light dumbbell', 'Landmine press', 'Banded scaption'],
      },
      {
        id: 'functional',
        label: 'Functional',
        goal: 'Transfer pattern to the patient\'s real-world demand (overhead reach, pressing, throwing).',
        gateCriteria: 'Patient performs the meaningful task without compensatory shrug for 5 consecutive reps.',
        exampleInterventions: ['Overhead reach with timer feedback', 'Cable press', 'Sport- or job-specific drill'],
      },
      {
        id: 'accept_residual',
        label: 'Accept residual',
        goal: 'When structural ceiling is reached, optimise the residual compensation rather than chase full ROM.',
        gateCriteria: 'No further ROM gain over 4 weeks AND patient can complete ADLs pain-free with the residual pattern.',
        exampleInterventions: ['Endurance training of substituted muscles', 'Ergonomic adjustment', 'Patient education on flare-up triggers'],
      },
    ],
  },
  hip_hinge: {
    id: 'hip_hinge',
    label: 'Re-establish hip hinge for forward bending',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore hamstring and posterior capsule length.', gateCriteria: 'SLR ≥ 70°, hip flexion ≥ 110° passive.', exampleInterventions: ['90/90 hamstring stretch', 'Hip flexor lengthening', 'Lumbar PA mobs'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach hip-led flexion with neutral lumbar in 4-point or supported standing.', gateCriteria: 'Wall hinge with dowel maintains 3-point spine contact for 10 reps.', exampleInterventions: ['Wall hinge', 'Dowel hinge', 'Cat-cow → hip dominant pattern'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add light load while preserving hip-dominant pattern.', gateCriteria: 'Kettlebell deadlift 8 kg × 10 with neutral spine.', exampleInterventions: ['KB deadlift', 'Romanian deadlift bar only', 'Single-leg RDL bodyweight'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to patient\'s task — lifting children, gardening, sport.', gateCriteria: 'Patient lifts target load × 5 reps with hip-dominant pattern.', exampleInterventions: ['Loaded carry', 'Sport-specific drill', 'Job task simulation'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach a safer end-range strategy when full hinge isn\'t restorable.', gateCriteria: 'Stable pain-free task tolerance for 4 weeks with the residual pattern.', exampleInterventions: ['Mechanical aid use', 'Endurance training of compensators', 'Activity pacing'] },
    ],
  },
  squat_depth: {
    id: 'squat_depth',
    label: 'Re-establish squat depth via ankle/hip mobility',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore ankle dorsiflexion and hip flexion ROM.', gateCriteria: 'Knee-to-wall ≥ 10 cm; deep squat reachable with heel support.', exampleInterventions: ['Calf stretch', 'Banded ankle mobs', 'Couch stretch hip flexors'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach upright torso squat with heels supported.', gateCriteria: 'Goblet squat to parallel with neutral spine, no heel lift.', exampleInterventions: ['Heel-elevated squat', 'TRX-supported squat', 'Wall-facing squat'] },
      { id: 'loaded', label: 'Loaded', goal: 'Progress load while preserving depth.', gateCriteria: 'Goblet squat to parallel × 10 reps with 10 kg.', exampleInterventions: ['Goblet squat', 'Front squat', 'Tempo squat'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to patient task.', gateCriteria: 'Patient can perform target task 5× clean.', exampleInterventions: ['Step-up', 'Lunge', 'Sport-specific drill'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Optimise the partial-depth pattern when full depth is structurally limited.', gateCriteria: 'Pain-free partial squat tolerance × 4 weeks.', exampleInterventions: ['Box squat', 'Endurance training', 'Equipment / ergonomic adjustment'] },
    ],
  },
  cervical_rotation: {
    id: 'cervical_rotation',
    label: 'Re-establish cervical rotation independent of the trunk',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore upper-cervical and SCM length.', gateCriteria: 'Cervical rotation ≥ 70° passive, both sides.', exampleInterventions: ['SCM release', 'Suboccipital release', 'C1-C2 self-mob'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach segmental cervical rotation in supine.', gateCriteria: 'Supine head turn ≥ 70° each side, no SCM dominance.', exampleInterventions: ['Supine chin nod + rotation', 'Deep neck flexor activation', 'Mirror feedback rotation'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add light resistance / longer dwell.', gateCriteria: 'Sustained 30s end-range rotation, both sides.', exampleInterventions: ['Banded resisted rotation', 'Isometric holds', 'PNF chops'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to driving / over-shoulder tasks.', gateCriteria: 'Patient performs reverse-park or sport check without trunk substitution.', exampleInterventions: ['Driving simulation', 'Sport-specific drill', 'Workstation rotation drill'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach safe trunk-assisted rotation when isolated cervical motion is structurally limited.', gateCriteria: 'Pain-free trunk-assisted rotation × 4 weeks.', exampleInterventions: ['Mirror adjustment', 'Workstation redesign', 'Education'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Compensation pattern catalogue, ordered worst → best per target
// ---------------------------------------------------------------------------

const RAW_TARGETS: CompensationTarget[] = [
  {
    id: 'leftShoulder:flexion',
    joint: 'leftShoulder',
    movement: 'flexion',
    patterns: [
      {
        id: 'left_shoulder_flexion__upper_trap_shrug',
        label: 'Upper trapezius shrug',
        description: 'Patient elevates the scapula via upper trap to lift the arm — classic painful arc bypass with high cervical cost.',
        rank: 0,
        cost: { cervical: 0.85, acJoint: 0.7, energy: 0.6, secondaryRisk: 0.7 },
        matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike', 'shoulder hike'],
        retrainingPlanId: 'scapulohumeral_rhythm',
      },
      {
        id: 'left_shoulder_flexion__lumbar_extension',
        label: 'Lumbar extension assist',
        description: 'Patient hyperextends the lumbar spine to fake overhead reach — high lumbar facet load.',
        rank: 1,
        cost: { cervical: 0.2, acJoint: 0.3, energy: 0.55, secondaryRisk: 0.65 },
        matchKeywords: ['lumbar extension', 'hyperextension', 'low back', 'lordosis'],
        retrainingPlanId: 'scapulohumeral_rhythm',
      },
      {
        id: 'left_shoulder_flexion__contralateral_lean',
        label: 'Contralateral trunk lean',
        description: 'Patient leans the trunk away from the lifting arm so gravity assists abduction — moderate cost, easy fix.',
        rank: 2,
        cost: { cervical: 0.15, acJoint: 0.25, energy: 0.45, secondaryRisk: 0.4 },
        matchKeywords: ['lateral lean', 'trunk lean', 'side bend', 'contralateral'],
        retrainingPlanId: 'scapulohumeral_rhythm',
      },
      {
        id: 'left_shoulder_flexion__upward_rotation_drive',
        label: 'Scapular upward rotation drive',
        description: 'Serratus + lower trap drive scapular upward rotation — the textbook better pattern when GH is partially blocked.',
        rank: 3,
        cost: { cervical: 0.1, acJoint: 0.15, energy: 0.3, secondaryRisk: 0.15 },
        matchKeywords: ['serratus', 'upward rotation', 'lower trap', 'scapular drive'],
        retrainingPlanId: 'scapulohumeral_rhythm',
      },
      {
        id: 'left_shoulder_flexion__bimanual',
        label: 'Bimanual / contralateral assist',
        description: 'Use the unaffected arm to guide the affected arm into flexion — safe substitution for ADLs while training continues.',
        rank: 4,
        cost: { cervical: 0.05, acJoint: 0.1, energy: 0.2, secondaryRisk: 0.1 },
        matchKeywords: ['bimanual', 'contralateral assist', 'unaffected arm', 'self-assist'],
        retrainingPlanId: 'scapulohumeral_rhythm',
      },
    ],
  },
  {
    id: 'rightShoulder:flexion',
    joint: 'rightShoulder',
    movement: 'flexion',
    patterns: [
      { id: 'right_shoulder_flexion__upper_trap_shrug', label: 'Upper trapezius shrug', description: 'Right-side scapular elevation to lift the arm.', rank: 0, cost: { cervical: 0.85, acJoint: 0.7, energy: 0.6, secondaryRisk: 0.7 }, matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__lumbar_extension', label: 'Lumbar extension assist', description: 'Lumbar hyperextension to fake overhead reach.', rank: 1, cost: { cervical: 0.2, acJoint: 0.3, energy: 0.55, secondaryRisk: 0.65 }, matchKeywords: ['lumbar extension', 'hyperextension', 'low back'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__contralateral_lean', label: 'Contralateral trunk lean', description: 'Trunk leans left so gravity assists right arm.', rank: 2, cost: { cervical: 0.15, acJoint: 0.25, energy: 0.45, secondaryRisk: 0.4 }, matchKeywords: ['lateral lean', 'trunk lean', 'side bend'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__upward_rotation_drive', label: 'Scapular upward rotation drive', description: 'Serratus + lower trap drive scapular upward rotation.', rank: 3, cost: { cervical: 0.1, acJoint: 0.15, energy: 0.3, secondaryRisk: 0.15 }, matchKeywords: ['serratus', 'upward rotation', 'lower trap'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__bimanual', label: 'Bimanual / contralateral assist', description: 'Unaffected left arm guides right arm into flexion.', rank: 4, cost: { cervical: 0.05, acJoint: 0.1, energy: 0.2, secondaryRisk: 0.1 }, matchKeywords: ['bimanual', 'contralateral assist'], retrainingPlanId: 'scapulohumeral_rhythm' },
    ],
  },
  {
    id: 'leftShoulder:abduction',
    joint: 'leftShoulder',
    movement: 'abduction',
    patterns: [
      { id: 'left_shoulder_abd__upper_trap_shrug', label: 'Upper trapezius shrug', description: 'Scapular elevation dominates abduction.', rank: 0, cost: { cervical: 0.85, acJoint: 0.7, energy: 0.6, secondaryRisk: 0.7 }, matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__contralateral_lean', label: 'Contralateral lean', description: 'Trunk leans right to lift left arm.', rank: 1, cost: { cervical: 0.2, acJoint: 0.3, energy: 0.5, secondaryRisk: 0.45 }, matchKeywords: ['lateral lean', 'trunk lean'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__scaption_substitution', label: 'Scaption substitution', description: 'Move to the scapular plane (~30° forward of frontal) — friendlier kinematics.', rank: 2, cost: { cervical: 0.1, acJoint: 0.2, energy: 0.35, secondaryRisk: 0.2 }, matchKeywords: ['scaption', 'scapular plane'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__upward_rotation_drive', label: 'Scapular upward rotation drive', description: 'Serratus / lower trap pattern.', rank: 3, cost: { cervical: 0.1, acJoint: 0.15, energy: 0.3, secondaryRisk: 0.15 }, matchKeywords: ['serratus', 'upward rotation'], retrainingPlanId: 'scapulohumeral_rhythm' },
    ],
  },
  {
    id: 'lumbar_spine:flexion',
    joint: 'lumbar_spine',
    movement: 'flexion',
    patterns: [
      { id: 'lumbar_flex__lumbar_dominant', label: 'Lumbar-dominant flexion', description: 'Patient flexes the lumbar spine first instead of hinging at the hips — high disc/posterior ligament load.', rank: 0, cost: { cervical: 0.05, acJoint: 0.0, energy: 0.4, secondaryRisk: 0.85 }, matchKeywords: ['lumbar flexion', 'rounded back', 'lumbar dominant'], retrainingPlanId: 'hip_hinge' },
      { id: 'lumbar_flex__knee_dominant', label: 'Knee-dominant squat down', description: 'Patient drops into a squat with little hip motion — protects spine but loads knees.', rank: 1, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.55, secondaryRisk: 0.5 }, matchKeywords: ['knee flexion', 'squat down', 'quad dominant'], retrainingPlanId: 'hip_hinge' },
      { id: 'lumbar_flex__hip_hinge', label: 'Hip hinge', description: 'Hip-led forward bend with neutral spine — the textbook better pattern.', rank: 2, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.25, secondaryRisk: 0.1 }, matchKeywords: ['hip hinge', 'hip flexion', 'neutral spine'], retrainingPlanId: 'hip_hinge' },
    ],
  },
  {
    id: 'left_hip:flexion',
    joint: 'left_hip',
    movement: 'flexion',
    patterns: [
      { id: 'left_hip_flex__lumbar_flexion', label: 'Lumbar flexion substitution', description: 'Posterior pelvic tilt + lumbar flexion fakes hip flexion.', rank: 0, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.4, secondaryRisk: 0.7 }, matchKeywords: ['lumbar flexion', 'pelvic tilt'], retrainingPlanId: 'squat_depth' },
      { id: 'left_hip_flex__contralateral_drop', label: 'Contralateral pelvic drop', description: 'Pelvis drops on the right to fake left hip flexion.', rank: 1, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.45, secondaryRisk: 0.5 }, matchKeywords: ['pelvic drop', 'trendelenburg'], retrainingPlanId: 'squat_depth' },
      { id: 'left_hip_flex__true_hip_flexion', label: 'True hip flexion', description: 'Femur moves on a neutral pelvis.', rank: 2, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.2, secondaryRisk: 0.1 }, matchKeywords: ['hip flexion', 'femur'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'left_ankle:dorsiflexion',
    joint: 'left_ankle',
    movement: 'dorsiflexion',
    patterns: [
      { id: 'left_ankle_df__heel_lift', label: 'Heel lift', description: 'Heel comes off the ground at the bottom of squat — calf/Achilles overload.', rank: 0, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.5, secondaryRisk: 0.6 }, matchKeywords: ['heel lift', 'plantarflexion', 'calf'], retrainingPlanId: 'squat_depth' },
      { id: 'left_ankle_df__foot_pronation', label: 'Foot pronation cheat', description: 'Foot collapses inward to gain apparent dorsiflexion — medial knee/arch stress.', rank: 1, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.4, secondaryRisk: 0.55 }, matchKeywords: ['pronation', 'arch collapse', 'valgus'], retrainingPlanId: 'squat_depth' },
      { id: 'left_ankle_df__true_dorsiflexion', label: 'True talocrural dorsiflexion', description: 'Tibia advances over a neutral foot.', rank: 2, cost: { cervical: 0.0, acJoint: 0.0, energy: 0.2, secondaryRisk: 0.1 }, matchKeywords: ['dorsiflexion', 'talocrural'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'cervical_spine:rotation',
    joint: 'cervical_spine',
    movement: 'rotation',
    patterns: [
      { id: 'cerv_rot__trunk_rotation', label: 'Trunk rotation substitution', description: 'Patient rotates the whole trunk to look over the shoulder.', rank: 0, cost: { cervical: 0.1, acJoint: 0.0, energy: 0.5, secondaryRisk: 0.4 }, matchKeywords: ['trunk rotation', 'thoracic rotation', 'whole body turn'], retrainingPlanId: 'cervical_rotation' },
      { id: 'cerv_rot__scm_dominance', label: 'SCM dominance', description: 'Sternocleidomastoid drives rotation with reduced upper-cervical contribution.', rank: 1, cost: { cervical: 0.6, acJoint: 0.0, energy: 0.4, secondaryRisk: 0.3 }, matchKeywords: ['scm', 'sternocleidomastoid'], retrainingPlanId: 'cervical_rotation' },
      { id: 'cerv_rot__segmental_rotation', label: 'Segmental cervical rotation', description: 'C1-C2 leads rotation with deep neck flexor support.', rank: 2, cost: { cervical: 0.05, acJoint: 0.0, energy: 0.15, secondaryRisk: 0.05 }, matchKeywords: ['segmental', 'c1 c2', 'deep neck flexor'], retrainingPlanId: 'cervical_rotation' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Index built once at module load — patterns get .betterPatternId pointers,
// targets get a fast lookup map by detector key, and a flat keyword index
// is built for the classifier.
// ---------------------------------------------------------------------------

interface LibraryIndex {
  targets: CompensationTarget[];
  byTargetId: Map<string, CompensationTarget>;
  byJoint: Map<string, CompensationTarget[]>;
}

function buildLibraryIndex(raw: CompensationTarget[]): LibraryIndex {
  const targets = raw.map(t => {
    const sorted = [...t.patterns].sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].betterPatternId = i + 1 < sorted.length ? sorted[i + 1].id : null;
    }
    return { ...t, patterns: sorted };
  });
  const byTargetId = new Map(targets.map(t => [t.id, t] as const));
  const byJoint = new Map<string, CompensationTarget[]>();
  for (const t of targets) {
    const list = byJoint.get(t.joint) ?? [];
    list.push(t);
    byJoint.set(t.joint, list);
  }
  return { targets, byTargetId, byJoint };
}

const INDEX = buildLibraryIndex(RAW_TARGETS);

export const COMPENSATION_TARGETS: ReadonlyArray<CompensationTarget> = INDEX.targets;

export function getCompensationTarget(joint: string, movement: string): CompensationTarget | null {
  return INDEX.byTargetId.get(`${joint}:${movement}`) ?? null;
}

export function getCompensationTargetsForJoint(joint: string): CompensationTarget[] {
  return INDEX.byJoint.get(joint) ?? [];
}

export function getCompensationPattern(id: string): CompensationPatternEntry | null {
  for (const t of INDEX.targets) {
    const found = t.patterns.find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

export function getRetrainingPlan(id: string | undefined | null): RetrainingPlan | null {
  if (!id) return null;
  return RETRAINING_PLANS[id] ?? null;
}
