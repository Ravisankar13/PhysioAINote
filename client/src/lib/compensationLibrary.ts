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
 * Data here is intentionally pure — no React, no engine imports — so it
 * can be unit-tested and consumed by both classifier and UI panel.
 */

export type CostKey = 'cervical' | 'acJoint' | 'lumbar' | 'energy' | 'secondaryRisk';

export interface CompensationCostProfile {
  cervical: number;     // 0-1: load shunted to neck/upper trap
  acJoint: number;      // 0-1: load shunted to AC / scapulothoracic
  lumbar: number;       // 0-1: load shunted to lumbar spine
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
  /** e.g. "left_shoulder:flexion" — matches detector output keys. */
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
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore posterior capsule, lat and pec minor length so the humerus can rotate without scapular hijacking.', gateCriteria: 'Passive shoulder flexion ≥ 150° without thoracic extension assist; sleeper stretch ≥ 70° IR.', exampleInterventions: ['Sleeper stretch 3×30s', 'Pec minor self-release 2 min', 'Lat foam roll 2 min'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach upward rotation and posterior tilt of the scapula in supine / wall slide where gravity can\'t recruit upper trap.', gateCriteria: 'Wall slide to 120° flexion with no audible/visible shrug, 10 reps clean.', exampleInterventions: ['Supine PNF flexion', 'Wall slides', 'Serratus punch in supine'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add light external load while maintaining the new pattern.', gateCriteria: 'Active flexion to 150° with 1-2 kg, no shrug, no painful arc.', exampleInterventions: ['Y-T-W with light dumbbell', 'Landmine press', 'Banded scaption'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer pattern to the patient\'s real-world demand (overhead reach, pressing, throwing).', gateCriteria: 'Patient performs the meaningful task without compensatory shrug for 5 consecutive reps.', exampleInterventions: ['Overhead reach with timer feedback', 'Cable press', 'Sport- or job-specific drill'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'When structural ceiling is reached, optimise the residual compensation rather than chase full ROM.', gateCriteria: 'No further ROM gain over 4 weeks AND patient can complete ADLs pain-free with the residual pattern.', exampleInterventions: ['Endurance training of substituted muscles', 'Ergonomic adjustment', 'Patient education on flare-up triggers'] },
    ],
  },
  shoulder_external_rotation: {
    id: 'shoulder_external_rotation',
    label: 'Re-establish shoulder external rotation control',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore subscapularis and pec major length.', gateCriteria: 'Passive ER at 90° abduction ≥ 70°.', exampleInterventions: ['CRAC subscap stretch', 'Doorway pec stretch', 'Sleeper stretch'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach isolated infraspinatus/teres minor recruitment in side-lying.', gateCriteria: 'Side-lying ER × 15 reps with no scapular substitution.', exampleInterventions: ['Side-lying ER', 'Banded ER at 0°', 'Towel ER'] },
      { id: 'loaded', label: 'Loaded', goal: 'Progress load through the ER arc.', gateCriteria: 'Banded ER at 90° abduction × 12 reps clean.', exampleInterventions: ['Cable ER 90/90', 'Prone Y', 'Lawnmower row to ER'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to throw / serve / brushing-hair tasks.', gateCriteria: 'Sport / ADL task × 5 clean reps.', exampleInterventions: ['Throw progression', 'Serve simulation', 'Hair-brushing drill'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach a safer reduced-arc pattern.', gateCriteria: 'Pain-free ADL tolerance × 4 weeks.', exampleInterventions: ['Arc reduction', 'Endurance work', 'Education'] },
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
  hip_external_rotation: {
    id: 'hip_external_rotation',
    label: 'Re-establish hip external rotation control',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore hip internal-rotator and adductor length.', gateCriteria: 'Prone hip ER ≥ 40°.', exampleInterventions: ['Pigeon stretch', 'Adductor lengthening', 'Hip capsular mobs'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Activate deep external rotators without lumbar/pelvic substitution.', gateCriteria: 'Clamshell × 15 with stable pelvis.', exampleInterventions: ['Clamshells', 'Side-lying hip ER', 'Quadruped fire hydrant'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add resistance, progress to standing.', gateCriteria: 'Banded hip ER in standing × 12 clean.', exampleInterventions: ['Banded ER standing', 'Monster walks', 'Single-leg balance with ER'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to cutting / pivoting / squat.', gateCriteria: 'Single-leg squat with neutral knee × 5.', exampleInterventions: ['Cutting drill', 'Pivot squat', 'Sport-specific'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach safer compensation if structural limit hit.', gateCriteria: 'Pain-free ADL × 4 weeks.', exampleInterventions: ['Bracing', 'Endurance training', 'Education'] },
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
  knee_flexion_control: {
    id: 'knee_flexion_control',
    label: 'Re-establish knee flexion through stance',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore quad / patellar tendon extensibility.', gateCriteria: 'Prone knee flexion ≥ 130°.', exampleInterventions: ['Quad stretch', 'Soft-tissue work patellar tendon', 'Patellar mobs'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach controlled knee bend in supine / supported.', gateCriteria: 'Wall sit at 60° × 30s with no lateral shift.', exampleInterventions: ['Heel slides', 'Supported squat', 'Wall sit short arc'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add load through controlled flexion.', gateCriteria: 'Step-down 10 cm × 10 reps clean.', exampleInterventions: ['Step-down', 'Goblet squat', 'Split squat'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to gait / stairs / sport.', gateCriteria: 'Reciprocal stair descent without compensations × 10.', exampleInterventions: ['Stair descent drill', 'Lunge variations', 'Sport-specific'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach safer reduced-flexion pattern if structurally limited.', gateCriteria: 'Pain-free ADL × 4 weeks.', exampleInterventions: ['Stair-rail use', 'Endurance training', 'Education'] },
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
  lumbar_rotation: {
    id: 'lumbar_rotation',
    label: 'Re-establish thoracic-led trunk rotation',
    phases: [
      { id: 'tissue_extensibility', label: 'Tissue extensibility', goal: 'Restore thoracic rotation and hip rotation ROM.', gateCriteria: 'Seated thoracic rotation ≥ 45°, hip ER ≥ 40°.', exampleInterventions: ['Open-book stretch', 'Thread the needle', 'Hip ER mobility'] },
      { id: 'unloaded_pattern', label: 'Unloaded pattern', goal: 'Teach rotation through thorax with stable lumbar/pelvis.', gateCriteria: 'Quadruped rotation × 10 reps with stable pelvis.', exampleInterventions: ['Quadruped thoracic rotation', 'Side-lying open book', 'Half-kneel rotation'] },
      { id: 'loaded', label: 'Loaded', goal: 'Add resistance / load.', gateCriteria: 'Cable chop × 10 with stable pelvis.', exampleInterventions: ['Cable chop / lift', 'Med-ball rotational throw light', 'Pallof press rotation'] },
      { id: 'functional', label: 'Functional', goal: 'Transfer to sport / occupational rotation.', gateCriteria: 'Sport drill × 5 clean reps.', exampleInterventions: ['Golf swing drill', 'Throwing drill', 'Job-task rotation'] },
      { id: 'accept_residual', label: 'Accept residual', goal: 'Coach safer reduced-arc rotation if structurally limited.', gateCriteria: 'Pain-free ADL × 4 weeks.', exampleInterventions: ['Workstation redesign', 'Endurance training', 'Education'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Compensation pattern catalogue, ordered worst → best per target
// All cost vectors include the full 5 axes (cervical/acJoint/lumbar/energy/secondaryRisk).
// ---------------------------------------------------------------------------

const C = (cervical: number, acJoint: number, lumbar: number, energy: number, secondaryRisk: number): CompensationCostProfile =>
  ({ cervical, acJoint, lumbar, energy, secondaryRisk });

const RAW_TARGETS: CompensationTarget[] = [
  {
    id: 'left_shoulder:flexion', joint: 'left_shoulder', movement: 'flexion',
    patterns: [
      { id: 'left_shoulder_flexion__upper_trap_shrug', label: 'Upper trapezius shrug', description: 'Patient elevates the scapula via upper trap to lift the arm — classic painful arc bypass with high cervical cost.', rank: 0, cost: C(0.85, 0.7, 0.15, 0.6, 0.7), matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike', 'shoulder hike'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_flexion__lumbar_extension', label: 'Lumbar extension assist', description: 'Patient hyperextends the lumbar spine to fake overhead reach — high lumbar facet load.', rank: 1, cost: C(0.2, 0.3, 0.85, 0.55, 0.65), matchKeywords: ['lumbar extension', 'hyperextension', 'low back', 'lordosis'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_flexion__contralateral_lean', label: 'Contralateral trunk lean', description: 'Patient leans the trunk away from the lifting arm so gravity assists abduction — moderate cost.', rank: 2, cost: C(0.15, 0.25, 0.4, 0.45, 0.4), matchKeywords: ['lateral lean', 'trunk lean', 'side bend', 'contralateral'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_flexion__upward_rotation_drive', label: 'Scapular upward rotation drive', description: 'Serratus + lower trap drive scapular upward rotation — the textbook better pattern when GH is partially blocked.', rank: 3, cost: C(0.1, 0.15, 0.05, 0.3, 0.15), matchKeywords: ['serratus', 'upward rotation', 'lower trap', 'scapular drive'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_flexion__bimanual', label: 'Bimanual / contralateral assist', description: 'Use the unaffected arm to guide the affected arm into flexion — safe substitution for ADLs while training continues.', rank: 4, cost: C(0.05, 0.1, 0.05, 0.2, 0.1), matchKeywords: ['bimanual', 'contralateral assist', 'unaffected arm', 'self-assist'], retrainingPlanId: 'scapulohumeral_rhythm' },
    ],
  },
  {
    id: 'right_shoulder:flexion', joint: 'right_shoulder', movement: 'flexion',
    patterns: [
      { id: 'right_shoulder_flexion__upper_trap_shrug', label: 'Upper trapezius shrug', description: 'Right-side scapular elevation to lift the arm.', rank: 0, cost: C(0.85, 0.7, 0.15, 0.6, 0.7), matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__lumbar_extension', label: 'Lumbar extension assist', description: 'Lumbar hyperextension to fake overhead reach.', rank: 1, cost: C(0.2, 0.3, 0.85, 0.55, 0.65), matchKeywords: ['lumbar extension', 'hyperextension', 'low back'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__contralateral_lean', label: 'Contralateral trunk lean', description: 'Trunk leans left so gravity assists right arm.', rank: 2, cost: C(0.15, 0.25, 0.4, 0.45, 0.4), matchKeywords: ['lateral lean', 'trunk lean', 'side bend'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__upward_rotation_drive', label: 'Scapular upward rotation drive', description: 'Serratus + lower trap drive scapular upward rotation.', rank: 3, cost: C(0.1, 0.15, 0.05, 0.3, 0.15), matchKeywords: ['serratus', 'upward rotation', 'lower trap'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'right_shoulder_flexion__bimanual', label: 'Bimanual / contralateral assist', description: 'Unaffected left arm guides right arm into flexion.', rank: 4, cost: C(0.05, 0.1, 0.05, 0.2, 0.1), matchKeywords: ['bimanual', 'contralateral assist'], retrainingPlanId: 'scapulohumeral_rhythm' },
    ],
  },
  {
    id: 'left_shoulder:abduction', joint: 'left_shoulder', movement: 'abduction',
    patterns: [
      { id: 'left_shoulder_abd__upper_trap_shrug', label: 'Upper trapezius shrug', description: 'Scapular elevation dominates abduction.', rank: 0, cost: C(0.85, 0.7, 0.15, 0.6, 0.7), matchKeywords: ['upper trap', 'shrug', 'elevation', 'hike'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__contralateral_lean', label: 'Contralateral lean', description: 'Trunk leans right to lift left arm.', rank: 1, cost: C(0.2, 0.3, 0.5, 0.5, 0.45), matchKeywords: ['lateral lean', 'trunk lean'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__scaption_substitution', label: 'Scaption substitution', description: 'Move to the scapular plane (~30° forward of frontal) — friendlier kinematics.', rank: 2, cost: C(0.1, 0.2, 0.05, 0.35, 0.2), matchKeywords: ['scaption', 'scapular plane'], retrainingPlanId: 'scapulohumeral_rhythm' },
      { id: 'left_shoulder_abd__upward_rotation_drive', label: 'Scapular upward rotation drive', description: 'Serratus / lower trap pattern.', rank: 3, cost: C(0.1, 0.15, 0.05, 0.3, 0.15), matchKeywords: ['serratus', 'upward rotation'], retrainingPlanId: 'scapulohumeral_rhythm' },
    ],
  },
  {
    id: 'left_shoulder:external_rotation', joint: 'left_shoulder', movement: 'external_rotation',
    patterns: [
      { id: 'left_shoulder_er__scapular_retraction', label: 'Scapular retraction substitution', description: 'Patient retracts the scapula instead of rotating the humerus — apparent ER but no GH motion.', rank: 0, cost: C(0.3, 0.7, 0.1, 0.5, 0.55), matchKeywords: ['scapular retraction', 'scap squeeze'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'left_shoulder_er__elbow_flare', label: 'Elbow flare / lat extension', description: 'Lat dorsi extension fakes ER by changing humeral angle.', rank: 1, cost: C(0.15, 0.4, 0.3, 0.45, 0.45), matchKeywords: ['lat', 'elbow flare', 'extension assist'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'left_shoulder_er__trunk_rotation', label: 'Trunk rotation substitution', description: 'Patient rotates the whole trunk to make the arm appear externally rotated.', rank: 2, cost: C(0.1, 0.2, 0.45, 0.4, 0.35), matchKeywords: ['trunk rotation', 'thoracic rotation'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'left_shoulder_er__true_infraspinatus', label: 'True infraspinatus / teres minor drive', description: 'Posterior rotator cuff pattern — the textbook target.', rank: 3, cost: C(0.05, 0.1, 0.05, 0.2, 0.1), matchKeywords: ['infraspinatus', 'teres minor', 'posterior cuff'], retrainingPlanId: 'shoulder_external_rotation' },
    ],
  },
  {
    id: 'right_shoulder:external_rotation', joint: 'right_shoulder', movement: 'external_rotation',
    patterns: [
      { id: 'right_shoulder_er__scapular_retraction', label: 'Scapular retraction substitution', description: 'Scapular retraction fakes ER.', rank: 0, cost: C(0.3, 0.7, 0.1, 0.5, 0.55), matchKeywords: ['scapular retraction', 'scap squeeze'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'right_shoulder_er__elbow_flare', label: 'Elbow flare / lat extension', description: 'Lat extension fakes ER.', rank: 1, cost: C(0.15, 0.4, 0.3, 0.45, 0.45), matchKeywords: ['lat', 'elbow flare'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'right_shoulder_er__trunk_rotation', label: 'Trunk rotation substitution', description: 'Trunk turns to fake ER.', rank: 2, cost: C(0.1, 0.2, 0.45, 0.4, 0.35), matchKeywords: ['trunk rotation', 'thoracic rotation'], retrainingPlanId: 'shoulder_external_rotation' },
      { id: 'right_shoulder_er__true_infraspinatus', label: 'True infraspinatus / teres minor drive', description: 'Posterior cuff pattern.', rank: 3, cost: C(0.05, 0.1, 0.05, 0.2, 0.1), matchKeywords: ['infraspinatus', 'teres minor', 'posterior cuff'], retrainingPlanId: 'shoulder_external_rotation' },
    ],
  },
  {
    id: 'lumbar_spine:flexion', joint: 'lumbar_spine', movement: 'flexion',
    patterns: [
      { id: 'lumbar_flex__lumbar_dominant', label: 'Lumbar-dominant flexion', description: 'Patient flexes the lumbar spine first instead of hinging at the hips — high disc/posterior ligament load.', rank: 0, cost: C(0.05, 0.0, 0.9, 0.4, 0.85), matchKeywords: ['lumbar flexion', 'rounded back', 'lumbar dominant'], retrainingPlanId: 'hip_hinge' },
      { id: 'lumbar_flex__knee_dominant', label: 'Knee-dominant squat down', description: 'Patient drops into a squat with little hip motion — protects spine but loads knees.', rank: 1, cost: C(0.0, 0.0, 0.2, 0.55, 0.5), matchKeywords: ['knee flexion', 'squat down', 'quad dominant'], retrainingPlanId: 'hip_hinge' },
      { id: 'lumbar_flex__hip_hinge', label: 'Hip hinge', description: 'Hip-led forward bend with neutral spine — the textbook better pattern.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.25, 0.1), matchKeywords: ['hip hinge', 'hip flexion', 'neutral spine'], retrainingPlanId: 'hip_hinge' },
    ],
  },
  {
    id: 'lumbar_spine:rotation', joint: 'lumbar_spine', movement: 'rotation',
    patterns: [
      { id: 'lumbar_rot__lumbar_dominant', label: 'Lumbar-driven rotation', description: 'Lumbar segments rotate (only ~5° available) instead of thoracic — high facet/disc shear.', rank: 0, cost: C(0.1, 0.0, 0.85, 0.4, 0.8), matchKeywords: ['lumbar rotation', 'low back twist'], retrainingPlanId: 'lumbar_rotation' },
      { id: 'lumbar_rot__hip_substitution', label: 'Hip rotation substitution', description: 'Stance-leg hip rotates to fake trunk rotation.', rank: 1, cost: C(0.0, 0.0, 0.3, 0.4, 0.4), matchKeywords: ['hip rotation', 'stance hip'], retrainingPlanId: 'lumbar_rotation' },
      { id: 'lumbar_rot__thoracic_drive', label: 'Thoracic-driven rotation', description: 'Thorax turns on stable pelvis — the textbook pattern.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['thoracic rotation', 'open book'], retrainingPlanId: 'lumbar_rotation' },
    ],
  },
  {
    id: 'left_hip:flexion', joint: 'left_hip', movement: 'flexion',
    patterns: [
      { id: 'left_hip_flex__lumbar_flexion', label: 'Lumbar flexion substitution', description: 'Posterior pelvic tilt + lumbar flexion fakes hip flexion.', rank: 0, cost: C(0.0, 0.0, 0.7, 0.4, 0.7), matchKeywords: ['lumbar flexion', 'pelvic tilt'], retrainingPlanId: 'squat_depth' },
      { id: 'left_hip_flex__contralateral_drop', label: 'Contralateral pelvic drop', description: 'Pelvis drops on the right to fake left hip flexion.', rank: 1, cost: C(0.0, 0.0, 0.3, 0.45, 0.5), matchKeywords: ['pelvic drop', 'trendelenburg'], retrainingPlanId: 'squat_depth' },
      { id: 'left_hip_flex__true_hip_flexion', label: 'True hip flexion', description: 'Femur moves on a neutral pelvis.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['hip flexion', 'femur'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'right_hip:flexion', joint: 'right_hip', movement: 'flexion',
    patterns: [
      { id: 'right_hip_flex__lumbar_flexion', label: 'Lumbar flexion substitution', description: 'Posterior pelvic tilt + lumbar flexion fakes hip flexion.', rank: 0, cost: C(0.0, 0.0, 0.7, 0.4, 0.7), matchKeywords: ['lumbar flexion', 'pelvic tilt'], retrainingPlanId: 'squat_depth' },
      { id: 'right_hip_flex__contralateral_drop', label: 'Contralateral pelvic drop', description: 'Pelvis drops on the left to fake right hip flexion.', rank: 1, cost: C(0.0, 0.0, 0.3, 0.45, 0.5), matchKeywords: ['pelvic drop', 'trendelenburg'], retrainingPlanId: 'squat_depth' },
      { id: 'right_hip_flex__true_hip_flexion', label: 'True hip flexion', description: 'Femur moves on a neutral pelvis.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['hip flexion', 'femur'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'left_hip:external_rotation', joint: 'left_hip', movement: 'external_rotation',
    patterns: [
      { id: 'left_hip_er__pelvic_rotation', label: 'Pelvic rotation substitution', description: 'Pelvis rotates anteriorly on stance leg to fake hip ER.', rank: 0, cost: C(0.0, 0.0, 0.6, 0.45, 0.55), matchKeywords: ['pelvic rotation', 'pelvis rotates'], retrainingPlanId: 'hip_external_rotation' },
      { id: 'left_hip_er__trunk_rotation', label: 'Trunk rotation substitution', description: 'Trunk rotates to disguise lack of hip ER.', rank: 1, cost: C(0.05, 0.0, 0.45, 0.4, 0.4), matchKeywords: ['trunk rotation', 'thoracic'], retrainingPlanId: 'hip_external_rotation' },
      { id: 'left_hip_er__true_deep_six', label: 'True deep six rotators', description: 'Piriformis and deep ER pattern — the textbook target.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['piriformis', 'deep six', 'deep external rotators'], retrainingPlanId: 'hip_external_rotation' },
    ],
  },
  {
    id: 'right_hip:external_rotation', joint: 'right_hip', movement: 'external_rotation',
    patterns: [
      { id: 'right_hip_er__pelvic_rotation', label: 'Pelvic rotation substitution', description: 'Pelvis rotates anteriorly to fake hip ER.', rank: 0, cost: C(0.0, 0.0, 0.6, 0.45, 0.55), matchKeywords: ['pelvic rotation', 'pelvis rotates'], retrainingPlanId: 'hip_external_rotation' },
      { id: 'right_hip_er__trunk_rotation', label: 'Trunk rotation substitution', description: 'Trunk rotates to disguise lack of hip ER.', rank: 1, cost: C(0.05, 0.0, 0.45, 0.4, 0.4), matchKeywords: ['trunk rotation', 'thoracic'], retrainingPlanId: 'hip_external_rotation' },
      { id: 'right_hip_er__true_deep_six', label: 'True deep six rotators', description: 'Piriformis and deep ER pattern.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['piriformis', 'deep six', 'deep external rotators'], retrainingPlanId: 'hip_external_rotation' },
    ],
  },
  {
    id: 'left_knee:flexion', joint: 'left_knee', movement: 'flexion',
    patterns: [
      { id: 'left_knee_flex__hip_drop', label: 'Hip drop substitution', description: 'Hip drops to lower the body without knee flexion — quadriceps avoidance.', rank: 0, cost: C(0.0, 0.0, 0.3, 0.55, 0.65), matchKeywords: ['hip drop', 'pelvic drop'], retrainingPlanId: 'knee_flexion_control' },
      { id: 'left_knee_flex__ankle_substitution', label: 'Ankle plantarflexion lift', description: 'Heel lift to avoid knee flexion under load.', rank: 1, cost: C(0.0, 0.0, 0.05, 0.5, 0.5), matchKeywords: ['heel lift', 'plantarflexion'], retrainingPlanId: 'knee_flexion_control' },
      { id: 'left_knee_flex__true_knee_flexion', label: 'True controlled knee flexion', description: 'Quad-controlled tibial/femoral flexion.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['knee flexion', 'quad', 'eccentric'], retrainingPlanId: 'knee_flexion_control' },
    ],
  },
  {
    id: 'right_knee:flexion', joint: 'right_knee', movement: 'flexion',
    patterns: [
      { id: 'right_knee_flex__hip_drop', label: 'Hip drop substitution', description: 'Hip drops to lower the body without knee flexion.', rank: 0, cost: C(0.0, 0.0, 0.3, 0.55, 0.65), matchKeywords: ['hip drop', 'pelvic drop'], retrainingPlanId: 'knee_flexion_control' },
      { id: 'right_knee_flex__ankle_substitution', label: 'Ankle plantarflexion lift', description: 'Heel lift to avoid knee flexion under load.', rank: 1, cost: C(0.0, 0.0, 0.05, 0.5, 0.5), matchKeywords: ['heel lift', 'plantarflexion'], retrainingPlanId: 'knee_flexion_control' },
      { id: 'right_knee_flex__true_knee_flexion', label: 'True controlled knee flexion', description: 'Quad-controlled tibial/femoral flexion.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['knee flexion', 'quad', 'eccentric'], retrainingPlanId: 'knee_flexion_control' },
    ],
  },
  {
    id: 'left_ankle:dorsiflexion', joint: 'left_ankle', movement: 'dorsiflexion',
    patterns: [
      { id: 'left_ankle_df__heel_lift', label: 'Heel lift', description: 'Heel comes off the ground at the bottom of squat — calf/Achilles overload.', rank: 0, cost: C(0.0, 0.0, 0.2, 0.5, 0.6), matchKeywords: ['heel lift', 'plantarflexion', 'calf'], retrainingPlanId: 'squat_depth' },
      { id: 'left_ankle_df__foot_pronation', label: 'Foot pronation cheat', description: 'Foot collapses inward to gain apparent dorsiflexion — medial knee/arch stress.', rank: 1, cost: C(0.0, 0.0, 0.1, 0.4, 0.55), matchKeywords: ['pronation', 'arch collapse', 'valgus'], retrainingPlanId: 'squat_depth' },
      { id: 'left_ankle_df__true_dorsiflexion', label: 'True talocrural dorsiflexion', description: 'Tibia advances over a neutral foot.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['dorsiflexion', 'talocrural'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'right_ankle:dorsiflexion', joint: 'right_ankle', movement: 'dorsiflexion',
    patterns: [
      { id: 'right_ankle_df__heel_lift', label: 'Heel lift', description: 'Heel comes off the ground.', rank: 0, cost: C(0.0, 0.0, 0.2, 0.5, 0.6), matchKeywords: ['heel lift', 'plantarflexion', 'calf'], retrainingPlanId: 'squat_depth' },
      { id: 'right_ankle_df__foot_pronation', label: 'Foot pronation cheat', description: 'Foot collapses inward.', rank: 1, cost: C(0.0, 0.0, 0.1, 0.4, 0.55), matchKeywords: ['pronation', 'arch collapse', 'valgus'], retrainingPlanId: 'squat_depth' },
      { id: 'right_ankle_df__true_dorsiflexion', label: 'True talocrural dorsiflexion', description: 'Tibia advances over a neutral foot.', rank: 2, cost: C(0.0, 0.0, 0.05, 0.2, 0.1), matchKeywords: ['dorsiflexion', 'talocrural'], retrainingPlanId: 'squat_depth' },
    ],
  },
  {
    id: 'cervical_spine:rotation', joint: 'cervical_spine', movement: 'rotation',
    patterns: [
      { id: 'cerv_rot__trunk_rotation', label: 'Trunk rotation substitution', description: 'Patient rotates the whole trunk to look over the shoulder.', rank: 0, cost: C(0.1, 0.0, 0.5, 0.5, 0.4), matchKeywords: ['trunk rotation', 'thoracic rotation', 'whole body turn'], retrainingPlanId: 'cervical_rotation' },
      { id: 'cerv_rot__scm_dominance', label: 'SCM dominance', description: 'Sternocleidomastoid drives rotation with reduced upper-cervical contribution.', rank: 1, cost: C(0.6, 0.0, 0.05, 0.4, 0.3), matchKeywords: ['scm', 'sternocleidomastoid'], retrainingPlanId: 'cervical_rotation' },
      { id: 'cerv_rot__segmental_rotation', label: 'Segmental cervical rotation', description: 'C1-C2 leads rotation with deep neck flexor support.', rank: 2, cost: C(0.05, 0.0, 0.05, 0.15, 0.05), matchKeywords: ['segmental', 'c1 c2', 'deep neck flexor'], retrainingPlanId: 'cervical_rotation' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Index built once at module load
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
