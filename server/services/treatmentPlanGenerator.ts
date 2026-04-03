import type {
  TreatmentDecisionResult,
  RankedIntervention,
  InterventionCategory,
} from './treatmentDecisionEngine';
import type {
  IrritabilityLevel,
  ConditionStageType,
} from './clinicalReasoningEngine';

export interface PlanExercise {
  id: string;
  name: string;
  category: InterventionCategory;
  sets: number;
  reps: string;
  holdSeconds?: number;
  frequency: string;
  painCeiling: string;
  intensity: string;
  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'Expert';
  targetRegions: string[];
  equipment: string[];
  progression: ProgressionRule;
  regression: RegressionRule;
}

export interface ProgressionRule {
  criteria: string;
  nextLevel: string;
  timeframeDays: number;
  parameters: string;
}

export interface RegressionRule {
  trigger: string;
  fallback: string;
  duration: string;
  returnCriteria: string;
}

export interface PlanPhase {
  id: string;
  name: string;
  order: number;
  durationWeeks: string;
  goals: string[];
  exercises: PlanExercise[];
  manualTherapy: PlanExercise[];
  education: string[];
  frequency: string;
  reviewPoint: string;
}

export interface PlanConstraint {
  id: string;
  description: string;
  reason: string;
  severity: 'absolute' | 'relative';
  source: string;
}

export interface TreatmentPlanResult {
  phases: PlanPhase[];
  constraints: PlanConstraint[];
  planSummary: string;
  totalDurationWeeks: string;
  irritabilityBasis: string;
  stageBasis: string;
  topHypothesis: string;
  timestamp: string;
}

export interface TreatmentPlanInput {
  decisionResult: TreatmentDecisionResult;
  painMarkers?: Array<{ region: string; severity?: number; type?: string }>;
  postureState?: Record<string, Record<string, number>>;
}

const IRRITABILITY_ORDER: IrritabilityLevel[] = ['low', 'moderate', 'high'];

function getIrritabilityIdx(level: string): number {
  const idx = IRRITABILITY_ORDER.indexOf(level as IrritabilityLevel);
  return idx >= 0 ? idx : 1;
}

function buildPhases(
  stage: string,
  irritability: string,
): Array<{ id: string; name: string; order: number; durationWeeks: string; goals: string[]; frequency: string; reviewPoint: string; education: string[] }> {
  const irrIdx = getIrritabilityIdx(irritability);
  const phases: Array<{ id: string; name: string; order: number; durationWeeks: string; goals: string[]; frequency: string; reviewPoint: string; education: string[] }> = [];

  if (stage === 'acute' || stage === 'reactive') {
    phases.push({
      id: 'phase_1',
      name: 'Pain Management & Protection',
      order: 1,
      durationWeeks: irrIdx >= 2 ? '1-2' : '1',
      goals: [
        'Reduce pain to manageable levels (NRS < 4/10)',
        'Protect injured tissues from further aggravation',
        'Maintain general fitness within pain limits',
        'Patient education on condition and prognosis',
      ],
      frequency: irrIdx >= 2 ? '2-3x/week supervised' : '3x/week supervised',
      reviewPoint: irrIdx >= 2 ? '3-5 days' : '1 week',
      education: [
        'Pain neuroscience education — pain does not equal damage',
        'Activity modification guidelines',
        'Sleep hygiene and positioning',
        'Ice/heat application guidance',
      ],
    });
    phases.push({
      id: 'phase_2',
      name: 'Controlled Loading & Mobility',
      order: 2,
      durationWeeks: irrIdx >= 2 ? '2-4' : '2-3',
      goals: [
        'Restore pain-free ROM',
        'Begin controlled loading of affected tissues',
        'Address muscle inhibition patterns',
        'Establish home exercise compliance',
      ],
      frequency: '2-3x/week supervised + daily HEP',
      reviewPoint: '2 weeks',
      education: [
        'Graded return to activity principles',
        'Self-monitoring pain response (24-hour rule)',
        'Importance of compliance with home programme',
      ],
    });
    phases.push({
      id: 'phase_3',
      name: 'Progressive Strengthening & Function',
      order: 3,
      durationWeeks: '3-6',
      goals: [
        'Build load capacity in affected tissues',
        'Correct movement patterns and motor control',
        'Progress to functional activities',
        'Reduce treatment frequency',
      ],
      frequency: '1-2x/week supervised + 3-4x/week independent',
      reviewPoint: '3-4 weeks',
      education: [
        'Self-management strategies for long-term',
        'Flare-up management plan',
        'Return to sport/work criteria',
      ],
    });
  } else if (stage === 'subacute') {
    phases.push({
      id: 'phase_1',
      name: 'Tissue Remodelling & Load Introduction',
      order: 1,
      durationWeeks: irrIdx >= 2 ? '2-3' : '1-2',
      goals: [
        'Progressive tissue loading below symptom threshold',
        'Restore functional ROM',
        'Address underlying muscle imbalances',
        'Begin motor control retraining',
      ],
      frequency: '2-3x/week supervised + daily HEP',
      reviewPoint: '2 weeks',
      education: [
        'Load management principles',
        'Understanding tissue healing timelines',
        '24-hour symptom response monitoring',
      ],
    });
    phases.push({
      id: 'phase_2',
      name: 'Functional Restoration',
      order: 2,
      durationWeeks: '3-6',
      goals: [
        'Build strength to pre-injury levels',
        'Integrate corrective exercises into functional movements',
        'Progress cardiovascular fitness',
        'Achieve independence with exercise programme',
      ],
      frequency: '1-2x/week supervised + 3-5x/week independent',
      reviewPoint: '3-4 weeks',
      education: [
        'Self-progression guidelines',
        'Activity-specific preparation',
        'Injury prevention strategies',
      ],
    });
    phases.push({
      id: 'phase_3',
      name: 'Return to Full Function',
      order: 3,
      durationWeeks: '4-8',
      goals: [
        'Full return to sport/work/daily activities',
        'Maintain gains through independent programme',
        'Address any residual deficits',
        'Establish maintenance routine',
      ],
      frequency: 'Monthly review + independent programme',
      reviewPoint: '4-6 weeks',
      education: [
        'Long-term maintenance programme',
        'When to seek reassessment',
        'Recurrence prevention',
      ],
    });
  } else {
    phases.push({
      id: 'phase_1',
      name: 'Desensitisation & Graded Exposure',
      order: 1,
      durationWeeks: irrIdx >= 2 ? '2-4' : '2-3',
      goals: [
        'Reduce central sensitisation and fear-avoidance',
        'Establish baseline exercise tolerance',
        'Begin graded exposure to feared movements',
        'Address psychosocial factors',
      ],
      frequency: '2-3x/week supervised',
      reviewPoint: '2 weeks',
      education: [
        'Pain neuroscience education — chronic pain mechanisms',
        'Pacing and boom-bust cycle avoidance',
        'Goal-setting and self-efficacy',
        'Stress management techniques',
      ],
    });
    phases.push({
      id: 'phase_2',
      name: 'Progressive Loading & Reconditioning',
      order: 2,
      durationWeeks: '4-8',
      goals: [
        'Progressive overload to rebuild tissue capacity',
        'Restore functional movement patterns',
        'Improve cardiovascular conditioning',
        'Build confidence in movement',
      ],
      frequency: '1-2x/week supervised + 3-5x/week independent',
      reviewPoint: '4 weeks',
      education: [
        'Self-management toolkit',
        'Exercise progression guidelines',
        'Flare-up response plan',
      ],
    });
    phases.push({
      id: 'phase_3',
      name: 'Functional Integration & Maintenance',
      order: 3,
      durationWeeks: '6-12',
      goals: [
        'Full integration into daily activities',
        'Achieve and maintain fitness goals',
        'Independent self-management',
        'Discharge with maintenance plan',
      ],
      frequency: 'Monthly review + independent programme',
      reviewPoint: '6-8 weeks',
      education: [
        'Lifelong activity guidelines',
        'When to return for reassessment',
        'Community exercise resources',
      ],
    });
  }

  return phases;
}

function mapInterventionsToPhases(
  primary: RankedIntervention[],
  adjunct: RankedIntervention[],
  phaseCount: number,
  stage: string,
  irritability: string,
): Map<number, RankedIntervention[]> {
  const phaseMap = new Map<number, RankedIntervention[]>();
  for (let i = 0; i < phaseCount; i++) {
    phaseMap.set(i, []);
  }

  const irrIdx = getIrritabilityIdx(irritability);

  for (const iv of primary) {
    if (iv.category === 'education') {
      phaseMap.get(0)!.push(iv);
      continue;
    }
    if (iv.category === 'manual_therapy' || iv.category === 'modality') {
      phaseMap.get(0)!.push(iv);
      if (phaseCount > 1) phaseMap.get(1)!.push(iv);
      continue;
    }
    if (irrIdx >= 2 && (stage === 'acute' || stage === 'reactive')) {
      if (phaseCount > 1) phaseMap.get(1)!.push(iv);
      else phaseMap.get(0)!.push(iv);
    } else {
      phaseMap.get(0)!.push(iv);
      if (phaseCount > 1) phaseMap.get(1)!.push(iv);
    }
  }

  for (const iv of adjunct) {
    if (iv.category === 'education') {
      phaseMap.get(0)!.push(iv);
      continue;
    }
    const targetPhase = Math.min(1, phaseCount - 1);
    phaseMap.get(targetPhase)!.push(iv);
    if (phaseCount > 2) phaseMap.get(2)!.push(iv);
  }

  return phaseMap;
}

const EXERCISE_LIBRARY: Record<string, {
  name: string;
  category: InterventionCategory;
  equipment: string[];
  baseReps: string;
  baseSets: number;
  baseHold?: number;
  bodyParts: string[];
}> = {
  serratus_wall_slides: { name: 'Serratus Wall Slides', category: 'exercise', equipment: ['Wall'], baseReps: '12', baseSets: 3, bodyParts: ['shoulder'] },
  prone_y_raises: { name: 'Prone Y-Raises', category: 'exercise', equipment: ['Light weights'], baseReps: '12-15', baseSets: 3, bodyParts: ['shoulder'] },
  chin_tucks: { name: 'Chin Tucks', category: 'exercise', equipment: [], baseReps: '10-15', baseSets: 3, baseHold: 5, bodyParts: ['cervical', 'neck'] },
  glute_bridge: { name: 'Glute Bridge', category: 'exercise', equipment: [], baseReps: '15', baseSets: 3, baseHold: 5, bodyParts: ['hip', 'lumbar'] },
  single_leg_bridge: { name: 'Single Leg Glute Bridge', category: 'exercise', equipment: [], baseReps: '10-12', baseSets: 3, bodyParts: ['hip', 'lumbar'] },
  clamshells: { name: 'Clamshells', category: 'exercise', equipment: [], baseReps: '15-20', baseSets: 3, bodyParts: ['hip'] },
  monster_walks: { name: 'Monster Walks', category: 'exercise', equipment: ['Resistance band'], baseReps: '15 steps', baseSets: 3, bodyParts: ['hip', 'knee'] },
  dead_bug: { name: 'Dead Bug', category: 'exercise', equipment: [], baseReps: '10 each side', baseSets: 3, bodyParts: ['lumbar', 'core'] },
  bird_dog: { name: 'Bird Dog', category: 'exercise', equipment: [], baseReps: '10 each side', baseSets: 3, bodyParts: ['lumbar', 'core'] },
  cat_cow: { name: 'Cat-Cow Mobilisation', category: 'exercise', equipment: [], baseReps: '10-12', baseSets: 3, bodyParts: ['thoracic', 'lumbar'] },
  quad_sets: { name: 'Quadriceps Sets', category: 'exercise', equipment: [], baseReps: '10-15', baseSets: 3, baseHold: 5, bodyParts: ['knee'] },
  heel_raises: { name: 'Heel Raises', category: 'exercise', equipment: [], baseReps: '15-20', baseSets: 3, bodyParts: ['ankle'] },
  ankle_dorsiflexion_band: { name: 'Ankle Dorsiflexion with Band', category: 'exercise', equipment: ['Resistance band'], baseReps: '15', baseSets: 3, bodyParts: ['ankle'] },
  wall_squats: { name: 'Wall Squats', category: 'exercise', equipment: ['Wall'], baseReps: '10-15', baseSets: 3, bodyParts: ['knee', 'hip'] },
  hip_flexor_stretch: { name: 'Half-Kneeling Hip Flexor Stretch', category: 'exercise', equipment: [], baseReps: '3', baseSets: 3, baseHold: 30, bodyParts: ['hip', 'lumbar'] },
  doorway_pec_stretch: { name: 'Doorway Pectoral Stretch', category: 'exercise', equipment: ['Doorway'], baseReps: '3', baseSets: 3, baseHold: 30, bodyParts: ['shoulder', 'thoracic'] },
  upper_trap_stretch: { name: 'Upper Trapezius Stretch', category: 'exercise', equipment: [], baseReps: '3', baseSets: 3, baseHold: 30, bodyParts: ['cervical', 'shoulder'] },
  foam_roll_thoracic: { name: 'Thoracic Foam Roll Extension', category: 'exercise', equipment: ['Foam roller'], baseReps: '10-15', baseSets: 2, bodyParts: ['thoracic'] },
  single_leg_balance: { name: 'Single Leg Balance', category: 'exercise', equipment: [], baseReps: '30s', baseSets: 3, bodyParts: ['ankle', 'knee', 'hip'] },
  side_plank: { name: 'Side Plank', category: 'exercise', equipment: [], baseReps: '30s', baseSets: 3, bodyParts: ['lumbar', 'core', 'hip'] },
  pallof_press: { name: 'Pallof Press', category: 'exercise', equipment: ['Resistance band'], baseReps: '12-15', baseSets: 3, bodyParts: ['lumbar', 'core'] },
  isometric_shoulder_er: { name: 'Isometric Shoulder External Rotation', category: 'exercise', equipment: ['Wall/towel'], baseReps: '10', baseSets: 3, baseHold: 10, bodyParts: ['shoulder'] },
  eccentric_heel_drop: { name: 'Eccentric Heel Drop (Alfredson)', category: 'exercise', equipment: ['Step'], baseReps: '15', baseSets: 3, bodyParts: ['ankle'] },
  neural_slider_median: { name: 'Median Nerve Slider', category: 'exercise', equipment: [], baseReps: '10-15', baseSets: 3, bodyParts: ['cervical', 'shoulder', 'elbow'] },
  neural_slider_sciatic: { name: 'Sciatic Nerve Slider', category: 'exercise', equipment: [], baseReps: '10-15', baseSets: 3, bodyParts: ['lumbar', 'hip', 'knee'] },
};

const INTERVENTION_TO_EXERCISES: Record<string, string[]> = {
  isometric_loading: ['isometric_shoulder_er', 'quad_sets', 'glute_bridge'],
  eccentric_programme: ['eccentric_heel_drop'],
  progressive_strengthening: ['wall_squats', 'glute_bridge', 'single_leg_bridge', 'monster_walks', 'heel_raises'],
  motor_control_retraining: ['dead_bug', 'bird_dog', 'chin_tucks', 'pallof_press'],
  stretching_programme: ['hip_flexor_stretch', 'doorway_pec_stretch', 'upper_trap_stretch'],
  graded_exposure: ['cat_cow', 'wall_squats', 'single_leg_balance'],
  proprioceptive_training: ['single_leg_balance', 'clamshells', 'monster_walks'],
  neural_mobilisation: ['neural_slider_median', 'neural_slider_sciatic'],
  activity_modification: [],
  pain_neuroscience_education: [],
  ergonomic_advice: [],
  hydrotherapy: [],
  soft_tissue_release: [],
  trigger_point_therapy: [],
  joint_mob_grade_1_2: [],
  joint_mob_grade_3_4: [],
  thoracic_manipulation: [],
  taping_support: [],
  dry_needling: [],
  refer_imaging: [],
};

function selectExercisesForIntervention(
  intervention: RankedIntervention,
  phase: number,
): string[] {
  const mapped = INTERVENTION_TO_EXERCISES[intervention.id];
  if (mapped && mapped.length > 0) return mapped;

  const regionKeys = intervention.targetRegions.map(r => r.toLowerCase());
  const matches = Object.entries(EXERCISE_LIBRARY).filter(([, ex]) =>
    ex.bodyParts.some(bp => regionKeys.some(rk => rk.includes(bp) || bp.includes(rk)))
  );
  return matches.slice(0, 3).map(([key]) => key);
}

function computeDosage(
  exerciseKey: string,
  irritability: string,
  stage: string,
  phase: number,
): { sets: number; reps: string; holdSeconds?: number; frequency: string; intensity: string; painCeiling: string } {
  const ex = EXERCISE_LIBRARY[exerciseKey];
  const irrIdx = getIrritabilityIdx(irritability);
  const isAcute = stage === 'acute' || stage === 'reactive';

  let sets = ex?.baseSets ?? 3;
  let reps = ex?.baseReps ?? '10-12';
  let holdSeconds = ex?.baseHold;
  let frequency: string;
  let intensity: string;
  let painCeiling: string;

  if (irrIdx >= 2) {
    sets = Math.max(1, sets - 1);
    painCeiling = 'Pain \u2264 2/10';
    intensity = 'Low — symptom-guided';
    frequency = isAcute ? 'Daily, short bouts' : 'Every 2nd day';
    if (holdSeconds) holdSeconds = Math.max(3, holdSeconds - 2);
  } else if (irrIdx === 1) {
    painCeiling = 'Pain \u2264 3/10';
    intensity = 'Moderate — controlled';
    frequency = isAcute ? 'Daily' : '3-4x/week';
  } else {
    sets = Math.min(4, sets + 1);
    painCeiling = 'Pain \u2264 4/10';
    intensity = 'Moderate-high — progressive overload';
    frequency = '3-5x/week';
    if (holdSeconds) holdSeconds = Math.min(15, holdSeconds + 3);
  }

  if (phase >= 2) {
    sets = Math.min(4, sets + 1);
    intensity = 'Progressive — RPE 6-8';
    frequency = '3-5x/week';
    painCeiling = 'Pain \u2264 4/10';
  }

  return { sets, reps, holdSeconds, frequency, intensity, painCeiling };
}

function buildProgression(
  exerciseKey: string,
  phase: number,
  irritability: string,
): ProgressionRule {
  const irrIdx = getIrritabilityIdx(irritability);
  const timeframeDays = irrIdx >= 2 ? 14 : irrIdx === 1 ? 10 : 7;

  const ex = EXERCISE_LIBRARY[exerciseKey];
  if (!ex) {
    return {
      criteria: 'Symptoms settle within 24 hours of exercise',
      nextLevel: 'Increase resistance or complexity',
      timeframeDays,
      parameters: 'Add 1 set or increase resistance by 10-15%',
    };
  }

  if (ex.baseHold) {
    return {
      criteria: `Complete ${ex.baseSets}x${ex.baseHold}s holds with pain \u2264 2/10, no symptom flare within 24h`,
      nextLevel: 'Increase hold duration by 5s, then add external load',
      timeframeDays,
      parameters: `Progress hold to ${(ex.baseHold || 5) + 5}s, then add light resistance`,
    };
  }

  return {
    criteria: `Complete all sets with proper form, pain \u2264 3/10, symptoms settle within 24h`,
    nextLevel: phase < 2 ? 'Increase resistance or reduce stability' : 'Progress to sport-specific loading',
    timeframeDays,
    parameters: 'Increase load by 10-15% or add 1 set, or reduce base of support',
  };
}

function buildRegression(
  exerciseKey: string,
  irritability: string,
): RegressionRule {
  const irrIdx = getIrritabilityIdx(irritability);

  if (irrIdx >= 2) {
    return {
      trigger: 'Pain increases > 2 points above baseline during or within 24h after exercise',
      fallback: 'Reduce to isometric-only at 50% effort, pain-free range only',
      duration: '3-5 days',
      returnCriteria: 'Baseline symptoms restored for 48 hours, then resume at previous successful level',
    };
  }

  if (irrIdx === 1) {
    return {
      trigger: 'Symptoms do not settle within 24 hours, or pain exceeds 4/10 during exercise',
      fallback: 'Reduce load by 30%, decrease sets by 1, maintain frequency',
      duration: '5-7 days',
      returnCriteria: 'Complete regressed programme for 3 consecutive sessions without flare, then progress back',
    };
  }

  return {
    trigger: 'Symptom flare lasting > 24 hours after session',
    fallback: 'Reduce load by 20%, drop intensity to RPE 5-6',
    duration: '3-5 days',
    returnCriteria: 'Return to previous parameters once symptoms settle for 48h',
  };
}

function buildConstraints(
  avoidDefer: RankedIntervention[],
  stage: string,
  irritability: string,
): PlanConstraint[] {
  const constraints: PlanConstraint[] = [];
  const irrIdx = getIrritabilityIdx(irritability);

  for (const iv of avoidDefer) {
    constraints.push({
      id: `constraint_${iv.id}`,
      description: `Avoid: ${iv.name}`,
      reason: iv.riskFlags.length > 0 ? iv.riskFlags[0] : iv.rationale,
      severity: iv.riskFlags.some(f => f.toLowerCase().includes('must-not-miss') || f.toLowerCase().includes('contraindication'))
        ? 'absolute'
        : 'relative',
      source: 'Decision Engine — Risk Filter',
    });
  }

  if (stage === 'acute' || stage === 'reactive') {
    constraints.push({
      id: 'constraint_no_end_range',
      description: 'Avoid end-range loaded positions',
      reason: 'Acute tissue healing — end-range loading may exceed tissue tolerance',
      severity: 'relative',
      source: 'Stage-based precaution',
    });
  }

  if (irrIdx >= 2) {
    constraints.push({
      id: 'constraint_high_irritability',
      description: 'Avoid high-intensity or prolonged loading',
      reason: 'High irritability — tissues are easily provoked, limit exposure to 50-60% capacity',
      severity: 'relative',
      source: 'Irritability-based precaution',
    });
    constraints.push({
      id: 'constraint_symptom_monitor',
      description: 'Monitor 24-hour symptom response to every session',
      reason: 'High irritability requires strict symptom tracking to prevent flare-ups',
      severity: 'absolute',
      source: 'Clinical guideline',
    });
  }

  return constraints;
}

function convertToExercise(
  exerciseKey: string,
  intervention: RankedIntervention,
  phase: number,
  irritability: string,
  stage: string,
): PlanExercise {
  const ex = EXERCISE_LIBRARY[exerciseKey];
  const dosage = computeDosage(exerciseKey, irritability, stage, phase);
  const progression = buildProgression(exerciseKey, phase, irritability);
  const regression = buildRegression(exerciseKey, irritability);

  return {
    id: `${intervention.id}_${exerciseKey}_p${phase}`,
    name: ex?.name ?? intervention.name,
    category: intervention.category,
    sets: dosage.sets,
    reps: dosage.reps,
    holdSeconds: dosage.holdSeconds,
    frequency: dosage.frequency,
    painCeiling: dosage.painCeiling,
    intensity: dosage.intensity,
    rationale: intervention.rationale,
    evidenceGrade: intervention.evidenceGrade,
    targetRegions: intervention.targetRegions,
    equipment: ex?.equipment ?? [],
    progression,
    regression,
  };
}

function convertManualTherapy(
  intervention: RankedIntervention,
  phase: number,
  irritability: string,
): PlanExercise {
  const irrIdx = getIrritabilityIdx(irritability);
  return {
    id: `${intervention.id}_manual_p${phase}`,
    name: intervention.name,
    category: intervention.category,
    sets: 1,
    reps: intervention.dosage,
    frequency: phase === 0 ? (irrIdx >= 2 ? '2-3x/week' : '2x/week') : '1x/week',
    painCeiling: irrIdx >= 2 ? 'Pain \u2264 2/10' : 'Pain \u2264 3/10',
    intensity: irrIdx >= 2 ? 'Gentle — Grade I-II' : 'Moderate',
    rationale: intervention.rationale,
    evidenceGrade: intervention.evidenceGrade,
    targetRegions: intervention.targetRegions,
    equipment: [],
    progression: {
      criteria: 'Positive response: increased ROM, reduced pain post-treatment',
      nextLevel: phase === 0 ? 'Progress to Grade III-IV or deeper technique' : 'Reduce frequency, increase home programme',
      timeframeDays: irrIdx >= 2 ? 14 : 7,
      parameters: 'Increase grade/intensity if symptoms allow',
    },
    regression: {
      trigger: 'Symptom flare lasting > 24h post-treatment',
      fallback: 'Reduce to Grade I-II, shorten treatment duration',
      duration: '1-2 sessions',
      returnCriteria: 'Return to previous technique once symptoms settle',
    },
  };
}

function computeMaxPainSeverity(
  painMarkers?: TreatmentPlanInput['painMarkers'],
  targetRegions?: string[],
): number {
  if (!painMarkers || painMarkers.length === 0) return 5;
  if (!targetRegions || targetRegions.length === 0) {
    return Math.max(...painMarkers.map(pm => pm.severity ?? 5));
  }
  const regionLower = targetRegions.map(r => r.toLowerCase());
  const relevant = painMarkers.filter(pm =>
    regionLower.some(r => pm.region.toLowerCase().includes(r) || r.includes(pm.region.toLowerCase()))
  );
  if (relevant.length === 0) return 3;
  return Math.max(...relevant.map(pm => pm.severity ?? 5));
}

function derivePosturalConstraints(
  postureState?: Record<string, Record<string, number>>,
): PlanConstraint[] {
  if (!postureState) return [];
  const constraints: PlanConstraint[] = [];
  const spine = postureState.spine;
  if (spine) {
    if (Math.abs(spine.thoracicKyphosis ?? 0) > 45) {
      constraints.push({
        id: 'posture_kyphosis',
        description: 'Avoid overhead loading in early phases',
        reason: `Significant thoracic kyphosis (${spine.thoracicKyphosis}°) — overhead positions increase impingement risk`,
        severity: 'relative',
        source: 'Postural analysis',
      });
    }
    if (Math.abs(spine.forwardHead ?? 0) > 20) {
      constraints.push({
        id: 'posture_fhp',
        description: 'Prioritise cervical retraction before loaded cervical exercises',
        reason: `Forward head posture (${spine.forwardHead}°) — loaded flexion may aggravate cervicogenic symptoms`,
        severity: 'relative',
        source: 'Postural analysis',
      });
    }
  }
  const pelvis = postureState.pelvis;
  if (pelvis) {
    if (Math.abs(pelvis.tilt ?? 0) > 15) {
      constraints.push({
        id: 'posture_apt',
        description: 'Address pelvic alignment before aggressive hip flexor or lumbar loading',
        reason: `Anterior pelvic tilt (${pelvis.tilt}°) — may overload lumbar facets during extension-based exercises`,
        severity: 'relative',
        source: 'Postural analysis',
      });
    }
  }
  return constraints;
}

function adjustDosageForPainSeverity(
  dosage: ReturnType<typeof computeDosage>,
  painSeverity: number,
): ReturnType<typeof computeDosage> {
  if (painSeverity >= 7) {
    return {
      ...dosage,
      sets: Math.max(1, dosage.sets - 1),
      intensity: 'Very low — pain-guided',
      painCeiling: 'Pain \u2264 2/10',
      frequency: 'Every 2nd day, short bouts',
    };
  }
  if (painSeverity >= 5) {
    return {
      ...dosage,
      painCeiling: 'Pain \u2264 3/10',
      intensity: dosage.intensity.includes('high') ? 'Moderate — symptom-guided' : dosage.intensity,
    };
  }
  return dosage;
}

export function generateTreatmentPlan(input: TreatmentPlanInput): TreatmentPlanResult {
  const { decisionResult, painMarkers, postureState } = input;
  const stage = decisionResult.stage || 'subacute';
  const irritability = decisionResult.irritability || 'moderate';

  const phaseTemplates = buildPhases(stage, irritability);

  const interventionMap = mapInterventionsToPhases(
    decisionResult.primary,
    decisionResult.adjunct,
    phaseTemplates.length,
    stage,
    irritability,
  );

  const affectedRegions = painMarkers?.map(pm => pm.region).filter(Boolean) ?? [];

  const phases: PlanPhase[] = phaseTemplates.map((template, idx) => {
    const phaseInterventions = interventionMap.get(idx) || [];

    const exercises: PlanExercise[] = [];
    const manualTherapy: PlanExercise[] = [];
    const seen = new Set<string>();

    for (const iv of phaseInterventions) {
      if (iv.category === 'manual_therapy' || iv.category === 'modality') {
        if (!seen.has(iv.id)) {
          seen.add(iv.id);
          manualTherapy.push(convertManualTherapy(iv, idx, irritability));
        }
        continue;
      }
      if (iv.category === 'education' || iv.category === 'pharmacological_referral') {
        continue;
      }

      const exerciseKeys = selectExercisesForIntervention(iv, idx);
      const regionPainSeverity = computeMaxPainSeverity(painMarkers, iv.targetRegions);

      for (const key of exerciseKeys) {
        if (!seen.has(`${iv.id}_${key}`)) {
          seen.add(`${iv.id}_${key}`);
          const ex = convertToExercise(key, iv, idx, irritability, stage);
          const adjustedDosage = adjustDosageForPainSeverity(
            { sets: ex.sets, reps: ex.reps, holdSeconds: ex.holdSeconds, frequency: ex.frequency, intensity: ex.intensity, painCeiling: ex.painCeiling },
            regionPainSeverity,
          );
          exercises.push({
            ...ex,
            sets: adjustedDosage.sets,
            frequency: adjustedDosage.frequency,
            painCeiling: adjustedDosage.painCeiling,
            intensity: adjustedDosage.intensity,
          });
        }
      }

      if (exerciseKeys.length === 0 && !seen.has(iv.id)) {
        seen.add(iv.id);
        let dosage = computeDosage('', irritability, stage, idx);
        dosage = adjustDosageForPainSeverity(dosage, regionPainSeverity);
        exercises.push({
          id: `${iv.id}_generic_p${idx}`,
          name: iv.name,
          category: iv.category,
          sets: dosage.sets,
          reps: iv.dosage || dosage.reps,
          frequency: dosage.frequency,
          painCeiling: dosage.painCeiling,
          intensity: dosage.intensity,
          rationale: iv.rationale,
          evidenceGrade: iv.evidenceGrade,
          targetRegions: iv.targetRegions,
          equipment: [],
          progression: buildProgression('', idx, irritability),
          regression: buildRegression('', irritability),
        });
      }
    }

    const education = [...template.education];
    if (idx === 0 && affectedRegions.length > 0) {
      education.push(`Region-specific precautions for: ${affectedRegions.join(', ')}`);
    }

    return {
      id: template.id,
      name: template.name,
      order: template.order,
      durationWeeks: template.durationWeeks,
      goals: template.goals,
      exercises,
      manualTherapy,
      education,
      frequency: template.frequency,
      reviewPoint: template.reviewPoint,
    };
  });

  const decisionConstraints = buildConstraints(decisionResult.avoidDefer, stage, irritability);
  const posturalConstraints = derivePosturalConstraints(postureState);
  const constraints = [...decisionConstraints, ...posturalConstraints];

  const totalWeeks = phases.reduce((acc, p) => {
    const match = p.durationWeeks.match(/(\d+)/g);
    if (match && match.length >= 2) return acc + parseInt(match[1]);
    if (match) return acc + parseInt(match[0]);
    return acc + 4;
  }, 0);

  const regionSummary = affectedRegions.length > 0
    ? ` Affected regions: ${affectedRegions.slice(0, 3).join(', ')}.`
    : '';

  return {
    phases,
    constraints,
    planSummary: `${phases.length}-phase ${stage} rehabilitation plan for ${decisionResult.topHypothesis}. ` +
      `${irritability} irritability drives dosage ceilings.${regionSummary} ` +
      `Primary focus: ${decisionResult.primary.slice(0, 2).map(p => p.name).join(', ') || 'symptom management'}. ` +
      `Total estimated duration: ${totalWeeks} weeks.`,
    totalDurationWeeks: `${totalWeeks}`,
    irritabilityBasis: irritability,
    stageBasis: stage,
    topHypothesis: decisionResult.topHypothesis,
    timestamp: new Date().toISOString(),
  };
}
