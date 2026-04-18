import { resolveArchetypeId, type RecoveryArchetypeId } from './recoveryArchetypes';

export type HealingPhase = 'inflammatory' | 'proliferative' | 'remodeling' | 'maturation';

export interface RecoveryState {
  week: number;
  pain: number;
  stiffness: number;
  swelling: number;
  irritability: number;
  inflammation: number;
  healingPhase: HealingPhase;
  healingProgress: number;
  loadTolerance: number;
  structuralIntegrity: number;
  walking: number;
  stairs: number;
  squat: number;
  running: number;
  sport: number;
  workCapacity: number;
  jointLoading: number;
  compensation: number;
  movementQuality: number;
  asymmetry: number;
  reinjuryRisk: number;
  flareRisk: number;
  chronicityRisk: number;
  compensatoryInjuryRisk: number;
  romPercent: number;
  strength: number;
  motorControl: number;
  neuralSensitivity: number;
  fearAvoidance: number;
  sleep: number;
  adherence: number;
  slingFunction: number;
  capacity: number;
  demand: number;
}

export interface TreatmentGate {
  minCapacity?: number;
  maxPain?: number;
  maxFlareRisk?: number;
  minHealingProgress?: number;
  minRomPercent?: number;
  minStrength?: number;
}

export interface TreatmentEffectProfile {
  id: string;
  name: string;
  modality: 'manual' | 'exercise' | 'electrophysical' | 'education' | 'load' | 'rest' | 'taping' | 'medication';
  onsetWeeks: number;
  peakWeeks: number;
  durationWeeks: number;
  carryoverWeeks: number;
  effects: Partial<Record<keyof RecoveryState, number>>;
  healingStageMultiplier?: Partial<Record<HealingPhase, number>>;
  irritabilityPenalty?: number;
  mistimingFlareRisk?: number;
  doseResponseSlope?: number;
  description?: string;
  gates?: TreatmentGate;
  /** Sessions/week the profile's effect magnitudes were calibrated for.
   *  When an Intervention sets a different sessionsPerWeek, the engine
   *  scales the per-week dose by sqrt(sessions / defaultSessionsPerWeek)
   *  (diminishing returns). Defaults to 3 if absent. */
  defaultSessionsPerWeek?: number;
}

export interface Intervention {
  id: string;
  treatmentId: string;
  startWeek: number;
  endWeek?: number;
  doseMultiplier: number;
  adherence: number;
  label?: string;
  /** Sessions/week the patient actually performs this treatment (1, 2, 3, 5, 7).
   *  Scales effect magnitude relative to the profile's defaultSessionsPerWeek.
   *  When undefined, falls back to the profile default (no scaling). */
  sessionsPerWeek?: number;
  /** Cadence in weeks: 1 = every week, 2 = fortnightly, 4 = monthly.
   *  Weeks where (week - startWeek) % cadenceWeeks !== 0 are skipped
   *  (no effect applied that week, but carryover from prior delivery
   *  weeks still decays normally). Default 1. */
  cadenceWeeks?: number;
  /** Optional taper ramp applied as a dose multiplier in the last
   *  taperWeeks of the intervention's active window (before endWeek,
   *  or before the profile's natural duration if no endWeek). Linearly
   *  interpolates dose from 1.0 → taperFinalDose. */
  taperWeeks?: number;
  taperFinalDose?: number;
  /** Single-delivery treatment (e.g., one-off injection, single
   *  education booster). When true the engine applies the effect on
   *  the start week only; carryover still decays normally afterwards. */
  oneOff?: boolean;
  /** Provenance + rationale for the chosen schedule, surfaced in UI. */
  scheduleSource?: 'manual' | 'ai' | 'default';
  scheduleRationale?: string;
}

export type GoalMode =
  | 'fastest_relief'
  | 'fastest_function'
  | 'fastest_rts'
  | 'lowest_flare'
  | 'strongest_resilience'
  | 'realistic_adherence';

export type BaselineMode = 'no_treatment' | 'rest_only' | 'usual_care' | 'continued_aggravation';

export interface FlareEvent { week: number; severity: number; cause?: string }
export interface LoadAdjustment { week: number; deltaPercent: number; label?: string }

export interface DoseChange {
  week: number;
  interventionId: string;
  newDoseMultiplier: number;
}

export interface ScenarioBranch {
  id: string;
  name: string;
  baseBranchId?: string;
  fromWeek: number;
  interventions: Intervention[];
  flareEvents: FlareEvent[];
  reaggravationEvents: { week: number; severityPct: number }[];
  loadAdjustments: LoadAdjustment[];
  adherenceOverride?: number;
  color: string;
  progressionHoldUntilWeek?: number;
  doseChanges?: DoseChange[];
}

export interface Milestone {
  id: string;
  label: string;
  weekAchieved: number | null;
  expectedWeek: number;
  achieved: boolean;
  gateType: 'pain' | 'function' | 'capacity' | 'flare' | 'rom' | 'control' | 'sport';
  description: string;
}

export interface InterventionMarker {
  week: number;
  type: 'introduce' | 'remove' | 'dose_change' | 'flare' | 'reaggravate' | 'load_change' | 'adherence_drop';
  label: string;
  treatmentId?: string;
}

export interface TreatmentAttribution {
  treatmentId: string;
  name: string;
  contributionPercent: number;
  contributesTo: 'pain' | 'function' | 'capacity' | 'risk';
}

export interface UncertaintyBand {
  best: number[];
  expected: number[];
  slower: number[];
  flareAdjusted: number[];
}

export interface ParallelTimelines {
  weeks: number[];
  symptoms: { pain: number[]; stiffness: number[]; swelling: number[]; irritability: number[] };
  tissue: { inflammation: number[]; healing: number[]; loadTolerance: number[]; structural: number[] };
  function: { walking: number[]; stairs: number[]; squat: number[]; running: number[]; sport: number[]; work: number[] };
  biomechanics: { jointLoading: number[]; compensation: number[]; movementQuality: number[]; asymmetry: number[] };
  risk: { reinjury: number[]; flare: number[]; chronicity: number[]; compensatory: number[] };
  capacity: number[];
  demand: number[];
  feelsBetter: number[];
  isBetter: number[];
  capacityRecovery: number[];
}

export interface SimulationProjection {
  branchId: string;
  branchName: string;
  color: string;
  states: RecoveryState[];
  timelines: ParallelTimelines;
  bands: { pain: UncertaintyBand; function: UncertaintyBand; capacity: UncertaintyBand; risk: UncertaintyBand };
  milestones: Milestone[];
  interventionMarkers: InterventionMarker[];
  attribution: TreatmentAttribution[];
  totalWeeks: number;
}

export interface SimulationInput {
  totalWeeks: number;
  initialState?: Partial<RecoveryState>;
  conditionSeverity: number;
  irritability: number;
  acuity: 'acute' | 'subacute' | 'chronic';
  workDemand: number;
  sportDemand: number;
  patientAdherence: number;
}

export interface ReversePlanResult {
  targetGoal: string;
  targetWeek: number;
  required: { milestone: string; deadlineWeek: number; capacityNeeded: number }[];
  status: 'on_track' | 'behind' | 'unsafe';
  gapWeeks: number;
  narrative: string;
}

export interface OptimizerResult {
  mode: GoalMode;
  bestNextAction: string;
  bestNextActionId: string;
  bestNextRationale: string;
  currentPhaseLabel: string;
  alternativeAction?: { action: string; actionId: string; rationale: string };
  recommendedSequence: { week: number; action: string; rationale: string }[];
  expectedScore: number;
  comparisonScore: number;
  narrative: string;
  optimizedInterventions: Intervention[];
  optimizedBranchTemplate: ScenarioBranch;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export const TREATMENT_LIBRARY: TreatmentEffectProfile[] = [
  {
    id: 'rest_offload',
    name: 'Rest / Offload',
    modality: 'rest',
    onsetWeeks: 0,
    peakWeeks: 1,
    durationWeeks: 12,
    carryoverWeeks: 1,
    effects: { pain: -3, swelling: -4, inflammation: -5, irritability: -4, loadTolerance: -1.5, strength: -1, fearAvoidance: 1 },
    healingStageMultiplier: { inflammatory: 1.4, proliferative: 1.0, remodeling: 0.6, maturation: 0.3 },
    irritabilityPenalty: 0,
    mistimingFlareRisk: 0,
    description: 'Acute offloading reduces inflammation and irritability; loses value in remodeling.',
    defaultSessionsPerWeek: 7,
  },
  {
    id: 'manual_therapy',
    name: 'Manual Therapy / Mobilization',
    modality: 'manual',
    onsetWeeks: 0,
    peakWeeks: 2,
    durationWeeks: 8,
    carryoverWeeks: 1,
    effects: { pain: -4, stiffness: -6, romPercent: 5, neuralSensitivity: -3, movementQuality: 3, irritability: -1 },
    healingStageMultiplier: { inflammatory: 0.5, proliferative: 1.0, remodeling: 1.2, maturation: 1.0 },
    irritabilityPenalty: 0.4,
    mistimingFlareRisk: 8,
    description: 'Improves ROM and reduces stiffness; cautious in inflammatory phase.',
    defaultSessionsPerWeek: 2,
  },
  {
    id: 'isometric_load',
    name: 'Isometric Loading',
    modality: 'load',
    onsetWeeks: 0,
    peakWeeks: 2,
    durationWeeks: 6,
    carryoverWeeks: 2,
    effects: { pain: -3, loadTolerance: 4, strength: 2, motorControl: 2, fearAvoidance: -2 },
    healingStageMultiplier: { inflammatory: 0.7, proliferative: 1.2, remodeling: 1.0, maturation: 0.8 },
    irritabilityPenalty: 0.5,
    mistimingFlareRisk: 10,
    description: 'Analgesic and load-tolerance building without high tissue stress.',
    defaultSessionsPerWeek: 5,
  },
  {
    id: 'progressive_strength',
    name: 'Progressive Strengthening',
    modality: 'exercise',
    onsetWeeks: 1,
    peakWeeks: 6,
    durationWeeks: 12,
    carryoverWeeks: 4,
    effects: { strength: 5, loadTolerance: 5, structuralIntegrity: 3, capacity: 5, asymmetry: -2, motorControl: 2, slingFunction: 3 },
    healingStageMultiplier: { inflammatory: 0.4, proliferative: 0.9, remodeling: 1.3, maturation: 1.2 },
    irritabilityPenalty: 0.7,
    mistimingFlareRisk: 14,
    description: 'Builds strength and capacity; primary driver of "is better".',
    gates: { maxPain: 65, minHealingProgress: 25 },
    defaultSessionsPerWeek: 3,
  },
  {
    id: 'motor_control',
    name: 'Motor Control / Sling Re-education',
    modality: 'exercise',
    onsetWeeks: 0,
    peakWeeks: 4,
    durationWeeks: 10,
    carryoverWeeks: 3,
    effects: { motorControl: 5, slingFunction: 5, compensation: -4, movementQuality: 4, asymmetry: -3 },
    healingStageMultiplier: { inflammatory: 0.7, proliferative: 1.1, remodeling: 1.2, maturation: 1.0 },
    irritabilityPenalty: 0.2,
    mistimingFlareRisk: 4,
    description: 'Restores coordinated function and reduces compensation.',
    defaultSessionsPerWeek: 4,
  },
  {
    id: 'plyometric_rts',
    name: 'Plyometric / RTS Training',
    modality: 'exercise',
    onsetWeeks: 1,
    peakWeeks: 4,
    durationWeeks: 8,
    carryoverWeeks: 3,
    effects: { sport: 5, running: 4, capacity: 3, structuralIntegrity: 2, fearAvoidance: -3, reinjuryRisk: -3 },
    healingStageMultiplier: { inflammatory: 0.1, proliferative: 0.4, remodeling: 1.0, maturation: 1.4 },
    irritabilityPenalty: 1.0,
    mistimingFlareRisk: 22,
    description: 'High-load reactive training; only safe when capacity gates met.',
    gates: { minCapacity: 65, maxPain: 35, maxFlareRisk: 40, minHealingProgress: 60, minRomPercent: 80, minStrength: 70 },
    defaultSessionsPerWeek: 2,
  },
  {
    id: 'electrophysical',
    name: 'Electrophysical (TENS / US / shockwave)',
    modality: 'electrophysical',
    onsetWeeks: 0,
    peakWeeks: 2,
    durationWeeks: 6,
    carryoverWeeks: 1,
    effects: { pain: -3, inflammation: -2, neuralSensitivity: -2, swelling: -2 },
    healingStageMultiplier: { inflammatory: 1.0, proliferative: 1.1, remodeling: 1.0, maturation: 0.7 },
    irritabilityPenalty: 0.1,
    mistimingFlareRisk: 2,
    description: 'Symptomatic relief and modulation; supports adherence.',
    defaultSessionsPerWeek: 3,
  },
  {
    id: 'education',
    name: 'Education / Pain Neuroscience',
    modality: 'education',
    onsetWeeks: 0,
    peakWeeks: 3,
    durationWeeks: 12,
    carryoverWeeks: 12,
    effects: { fearAvoidance: -5, adherence: 4, pain: -2, neuralSensitivity: -2, chronicityRisk: -3 },
    healingStageMultiplier: { inflammatory: 1.0, proliferative: 1.0, remodeling: 1.0, maturation: 1.0 },
    irritabilityPenalty: 0,
    mistimingFlareRisk: 0,
    description: 'Reduces fear-avoidance and chronicity risk; long carryover.',
    defaultSessionsPerWeek: 1,
  },
  {
    id: 'taping_bracing',
    name: 'Taping / Bracing',
    modality: 'taping',
    onsetWeeks: 0,
    peakWeeks: 1,
    durationWeeks: 4,
    carryoverWeeks: 0,
    effects: { pain: -2, jointLoading: -3, compensation: 2, fearAvoidance: -2, walking: 3 },
    healingStageMultiplier: { inflammatory: 1.2, proliferative: 1.0, remodeling: 0.7, maturation: 0.4 },
    irritabilityPenalty: 0,
    mistimingFlareRisk: 0,
    description: 'Short-term offloading and proprioception; remove as capacity returns.',
    defaultSessionsPerWeek: 7,
  },
  {
    id: 'graded_load',
    name: 'Graded Loading / Progression',
    modality: 'load',
    onsetWeeks: 0,
    peakWeeks: 3,
    durationWeeks: 8,
    carryoverWeeks: 4,
    effects: { loadTolerance: 4, capacity: 4, structuralIntegrity: 2, walking: 3, stairs: 3 },
    healingStageMultiplier: { inflammatory: 0.5, proliferative: 1.0, remodeling: 1.3, maturation: 1.1 },
    irritabilityPenalty: 0.6,
    mistimingFlareRisk: 12,
    description: 'Drives the "is better" line — capacity outpaces symptom curve.',
    gates: { maxPain: 65, minHealingProgress: 15 },
    defaultSessionsPerWeek: 4,
  },
];

export const TREATMENT_BY_ID = new Map(TREATMENT_LIBRARY.map(t => [t.id, t]));

export interface CustomExerciseInput {
  name: string;
  targetSystem?: string;
  clinicalTarget?: string;
  activationPattern?: { role?: string; muscle?: string }[];
  forceVector?: { resistanceType?: string; direction?: string };
  dosage?: { sets?: string; reps?: string; tempo?: string; frequency?: string };
  progressionStages?: { stage: number; name: string }[];
  /** Optional explicit recovery-phase metadata stamped by per-phase
   *  generators so the simulator dashboard can surface this item on
   *  the originating phase card without resorting to keyword
   *  heuristics. Items generated from non-phase contexts may omit. */
  phaseIndex?: number;
  phaseLabel?: string;
  /** Marks items authored by the practitioner (vs AI-generated) so the
   *  UI can show a "Custom" badge. Engine math ignores this field. */
  userAuthored?: boolean;
  /** Stable identity for removal/lookup. When present,
   *  buildCustomExerciseId uses this instead of the positional
   *  index, so removing one item from the middle of the list does
   *  not invalidate the deterministic IDs of the others. */
  stableId?: string;
}

export interface CustomManualTechniqueInput {
  name: string;
  targetSystem?: string;
  clinicalTarget?: string;
  forceApplicationSequence?: { grade?: string; depth?: string }[];
  dosage?: { duration?: string; repetitions?: string; sets?: string; frequency?: string };
  progressionStages?: { stage: number; name: string }[];
  tissueTargets?: { goalType?: string }[];
  phaseIndex?: number;
  phaseLabel?: string;
  /** Marks items authored by the practitioner (vs AI-generated) so the
   *  UI can show a "Custom" badge. Engine math ignores this field. */
  userAuthored?: boolean;
  /** Stable identity for removal/lookup. See CustomExerciseInput. */
  stableId?: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

const containsAny = (s: string | undefined, words: string[]): boolean => {
  if (!s) return false;
  const lower = s.toLowerCase();
  return words.some(w => lower.includes(w));
};

const firstNumber = (s: string | undefined): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

const parseFrequencyPerWeek = (s: string | undefined): number => {
  if (!s) return 3;
  const lower = s.toLowerCase();
  const dailyMatch = /(\d+)\s*(?:x|times)?\s*\/?\s*(?:per\s*)?day|daily/.test(lower);
  if (dailyMatch) return 7;
  const m = lower.match(/(\d+)\s*(?:x|times)?\s*\/?\s*(?:per\s*)?(?:wk|week)/);
  if (m) return parseInt(m[1]);
  const n = firstNumber(s);
  return n ?? 3;
};

export function buildCustomExerciseId(ex: CustomExerciseInput, idx: number): string {
  if (ex.stableId) return `custom_ex_s_${ex.stableId}`;
  return `custom_ex_${idx}_${slug(ex.name) || 'untitled'}`;
}

export function buildCustomTechniqueId(tech: CustomManualTechniqueInput, idx: number): string {
  if (tech.stableId) return `custom_mt_s_${tech.stableId}`;
  return `custom_mt_${idx}_${slug(tech.name) || 'untitled'}`;
}

/** True when the given treatmentId belongs to a user/AI-promoted custom
 *  item (either stableId-based or legacy index-based form). */
export function isCustomTreatmentId(treatmentId: string): boolean {
  return treatmentId.startsWith('custom_ex_') || treatmentId.startsWith('custom_mt_');
}

type TissueClass = 'tendon' | 'muscle' | 'joint' | 'fascia' | 'nerve' | 'generic';

function detectTissueClass(target: string): TissueClass {
  const t = target.toLowerCase();
  if (/(tendon|tendinopathy|tendinosis|tenosynovitis|achilles|patellar tendon|rotator cuff)/.test(t)) return 'tendon';
  if (/(nerve|neural|neurodynamic|sciatic|median|ulnar|radial|peroneal|radicul)/.test(t)) return 'nerve';
  if (/(fascia|fascial|myofascial|thoracolumbar|plantar fascia|iliotibial|it band)/.test(t)) return 'fascia';
  if (/(joint|capsule|capsular|articular|arthrokinematic|cartilage|meniscus|labrum)/.test(t)) return 'joint';
  if (/(muscle|muscular|myo(?!fascial)|strain|fiber|hypertrophy|sarcomere)/.test(t)) return 'muscle';
  return 'generic';
}

interface TissueBias {
  effectScale: Partial<Record<keyof RecoveryState, number>>;
  onsetDelta: number;
  peakDelta: number;
  durationDelta: number;
  carryoverDelta: number;
}

function exerciseTissueBias(cls: TissueClass): TissueBias {
  switch (cls) {
    case 'tendon':
      return {
        effectScale: { loadTolerance: 1.5, structuralIntegrity: 1.4, strength: 1.2, capacity: 1.3, pain: 0.7, romPercent: 0.7, stiffness: 0.8 },
        onsetDelta: 1, peakDelta: 2, durationDelta: 4, carryoverDelta: 2,
      };
    case 'muscle':
      return {
        effectScale: { strength: 1.5, capacity: 1.3, motorControl: 1.2, asymmetry: 1.3, romPercent: 0.9 },
        onsetDelta: 0, peakDelta: 0, durationDelta: 0, carryoverDelta: 1,
      };
    case 'joint':
      return {
        effectScale: { romPercent: 1.4, stiffness: 1.4, jointLoading: 1.2, structuralIntegrity: 1.1, pain: 1.1, motorControl: 1.1 },
        onsetDelta: 1, peakDelta: 1, durationDelta: 2, carryoverDelta: 1,
      };
    case 'fascia':
      return {
        effectScale: { stiffness: 1.4, romPercent: 1.3, slingFunction: 1.3, compensation: 1.2, movementQuality: 1.2 },
        onsetDelta: 0, peakDelta: 0, durationDelta: 1, carryoverDelta: 0,
      };
    case 'nerve':
      return {
        effectScale: { neuralSensitivity: 1.5, pain: 1.3, fearAvoidance: 1.2, romPercent: 1.1 },
        onsetDelta: 1, peakDelta: 1, durationDelta: 2, carryoverDelta: 1,
      };
    default:
      return { effectScale: {}, onsetDelta: 0, peakDelta: 0, durationDelta: 0, carryoverDelta: 0 };
  }
}

function manualTissueBias(cls: TissueClass): TissueBias {
  switch (cls) {
    case 'tendon':
      return {
        effectScale: { pain: 1.2, stiffness: 1.2, structuralIntegrity: 1.1, romPercent: 0.9 },
        onsetDelta: 0, peakDelta: 1, durationDelta: 2, carryoverDelta: 1,
      };
    case 'muscle':
      return {
        effectScale: { stiffness: 1.4, pain: 1.3, motorControl: 1.2, asymmetry: 1.2, romPercent: 1.2 },
        onsetDelta: 0, peakDelta: 0, durationDelta: 0, carryoverDelta: 0,
      };
    case 'joint':
      return {
        effectScale: { romPercent: 1.5, stiffness: 1.4, jointLoading: 1.3, movementQuality: 1.2, pain: 1.1 },
        onsetDelta: 0, peakDelta: 0, durationDelta: 1, carryoverDelta: 0,
      };
    case 'fascia':
      return {
        effectScale: { stiffness: 1.5, romPercent: 1.3, slingFunction: 1.3, compensation: 1.2 },
        onsetDelta: 0, peakDelta: 0, durationDelta: 0, carryoverDelta: 0,
      };
    case 'nerve':
      return {
        effectScale: { neuralSensitivity: 1.6, pain: 1.4, fearAvoidance: 1.2 },
        onsetDelta: 0, peakDelta: 1, durationDelta: 1, carryoverDelta: 1,
      };
    default:
      return { effectScale: {}, onsetDelta: 0, peakDelta: 0, durationDelta: 0, carryoverDelta: 0 };
  }
}

function applyTissueBias(effects: Partial<Record<keyof RecoveryState, number>>, bias: TissueBias): void {
  for (const [k, mult] of Object.entries(bias.effectScale) as [keyof RecoveryState, number][]) {
    if (effects[k] !== undefined) effects[k] = (effects[k] as number) * mult;
  }
}

export function synthesizeCustomExerciseProfile(ex: CustomExerciseInput, idx: number): TreatmentEffectProfile {
  const id = buildCustomExerciseId(ex, idx);
  const target = `${ex.targetSystem ?? ''} ${ex.clinicalTarget ?? ''}`;
  const tissueClass = detectTissueClass(target);
  const tissueBias = exerciseTissueBias(tissueClass);
  const roles = (ex.activationPattern ?? []).map(a => (a.role ?? '').toLowerCase());
  const hasStabilizer = roles.includes('stabilizer');
  const hasPrimeMover = roles.includes('prime_mover');
  const hasForceTransmitter = roles.includes('force_transmitter');
  const hasDecelerator = roles.includes('decelerator');
  const isIsometric = (ex.forceVector?.resistanceType ?? '').toLowerCase().includes('isometric');
  const isPlyo = containsAny(target, ['plyo', 'reactive', 'jump', 'sprint', 'ballistic']);
  const isMobility = containsAny(target, ['mobility', 'rom', 'range', 'flexibility', 'stretch']);
  const isMotorControl = containsAny(target, ['motor control', 'coordination', 'sling', 'stability', 'neuromuscular']);
  const stages = (ex.progressionStages ?? []).length || 3;
  const setsNum = firstNumber(ex.dosage?.sets) ?? 3;
  const repsNum = firstNumber(ex.dosage?.reps) ?? 10;
  const freqPerWeek = parseFrequencyPerWeek(ex.dosage?.frequency);
  const volumeFactor = Math.min(2.0, Math.max(0.4, (setsNum * repsNum * freqPerWeek) / 90));

  const effects: Partial<Record<keyof RecoveryState, number>> = {
    motorControl: 1.5,
    capacity: 1.5,
    fearAvoidance: -1,
    asymmetry: -0.8,
    movementQuality: 1,
  };
  if (hasStabilizer || isMotorControl) {
    effects.motorControl = (effects.motorControl ?? 0) + 2.5;
    effects.slingFunction = (effects.slingFunction ?? 0) + 3;
    effects.compensation = (effects.compensation ?? 0) - 1.5;
  }
  if (hasPrimeMover) {
    effects.strength = (effects.strength ?? 0) + 3;
    effects.loadTolerance = (effects.loadTolerance ?? 0) + 2.5;
    effects.structuralIntegrity = (effects.structuralIntegrity ?? 0) + 1.5;
  }
  if (hasForceTransmitter) {
    effects.slingFunction = (effects.slingFunction ?? 0) + 2;
    effects.compensation = (effects.compensation ?? 0) - 1;
  }
  if (hasDecelerator) {
    effects.motorControl = (effects.motorControl ?? 0) + 1.5;
    effects.reinjuryRisk = (effects.reinjuryRisk ?? 0) - 1;
  }
  if (isIsometric) {
    effects.pain = (effects.pain ?? 0) - 2.5;
    effects.loadTolerance = (effects.loadTolerance ?? 0) + 2.5;
  }
  if (isMobility) {
    effects.romPercent = (effects.romPercent ?? 0) + 4;
    effects.stiffness = (effects.stiffness ?? 0) - 3;
  }
  if (isPlyo) {
    effects.sport = (effects.sport ?? 0) + 4;
    effects.running = (effects.running ?? 0) + 3;
    effects.capacity = (effects.capacity ?? 0) + 2;
  }
  effects.strength = (effects.strength ?? 0) + Math.min(2.5, setsNum * 0.4);
  applyTissueBias(effects, tissueBias);
  for (const k of Object.keys(effects) as (keyof RecoveryState)[]) {
    if (effects[k] !== undefined) effects[k] = (effects[k] as number) * volumeFactor;
  }

  const baseOnset = isIsometric ? 0 : 1;
  const basePeak = Math.max(2, Math.min(8, stages * 2));
  const baseDuration = Math.max(6, basePeak + 4);
  const baseCarryover = 3;
  return {
    id,
    name: ex.name,
    modality: 'exercise',
    onsetWeeks: Math.max(0, baseOnset + tissueBias.onsetDelta),
    peakWeeks: Math.max(1, basePeak + tissueBias.peakDelta),
    durationWeeks: Math.max(baseDuration, baseDuration + tissueBias.durationDelta),
    carryoverWeeks: Math.max(0, baseCarryover + tissueBias.carryoverDelta),
    effects,
    healingStageMultiplier: isPlyo
      ? { inflammatory: 0.1, proliferative: 0.4, remodeling: 1.0, maturation: 1.4 }
      : isIsometric
        ? { inflammatory: 0.7, proliferative: 1.2, remodeling: 1.0, maturation: 0.8 }
        : { inflammatory: 0.5, proliferative: 1.0, remodeling: 1.2, maturation: 1.0 },
    irritabilityPenalty: isPlyo ? 1.0 : isIsometric ? 0.3 : 0.6,
    mistimingFlareRisk: isPlyo ? 20 : 10,
    description: `AI-designed exercise targeting ${ex.targetSystem ?? 'patient-specific dysfunction'} (${tissueClass}).`,
    gates: isPlyo
      ? { minCapacity: 60, maxPain: 40, maxFlareRisk: 40, minHealingProgress: 55, minRomPercent: 75, minStrength: 65 }
      : { maxPain: 70, minHealingProgress: 15 },
    defaultSessionsPerWeek: freqPerWeek,
  };
}

export function synthesizeCustomManualTechniqueProfile(tech: CustomManualTechniqueInput, idx: number): TreatmentEffectProfile {
  const id = buildCustomTechniqueId(tech, idx);
  const target = `${tech.targetSystem ?? ''} ${tech.clinicalTarget ?? ''}`;
  const tissueClass = detectTissueClass(target);
  const tissueBias = manualTissueBias(tissueClass);
  const goalTypes = (tech.tissueTargets ?? []).map(t => (t.goalType ?? '').toLowerCase());
  const isNeural = tissueClass === 'nerve';
  const isFascial = tissueClass === 'fascia';
  const isJointMob = tissueClass === 'joint';
  const stages = (tech.progressionStages ?? []).length || 3;
  const repsNum = firstNumber(tech.dosage?.repetitions) ?? firstNumber(tech.dosage?.sets) ?? 3;
  const durationSec = firstNumber(tech.dosage?.duration) ?? 30;
  const freqPerWeek = parseFrequencyPerWeek(tech.dosage?.frequency);
  const doseLoad = (repsNum * Math.max(1, durationSec / 30) * freqPerWeek) / 30;
  const intensityFactor = Math.min(1.8, Math.max(0.5, doseLoad));

  const effects: Partial<Record<keyof RecoveryState, number>> = {
    pain: -2,
    movementQuality: 1.5,
  };
  if (goalTypes.includes('release') || isFascial) {
    effects.stiffness = (effects.stiffness ?? 0) - 4;
    effects.romPercent = (effects.romPercent ?? 0) + 3;
    effects.neuralSensitivity = (effects.neuralSensitivity ?? 0) - 2;
    effects.pain = (effects.pain ?? 0) - 2;
  }
  if (goalTypes.includes('mobilize') || isJointMob) {
    effects.romPercent = (effects.romPercent ?? 0) + 4;
    effects.stiffness = (effects.stiffness ?? 0) - 3;
    effects.movementQuality = (effects.movementQuality ?? 0) + 1.5;
  }
  if (goalTypes.includes('activate')) {
    effects.motorControl = (effects.motorControl ?? 0) + 2.5;
    effects.slingFunction = (effects.slingFunction ?? 0) + 2;
  }
  if (goalTypes.includes('stabilize')) {
    effects.motorControl = (effects.motorControl ?? 0) + 2.5;
    effects.slingFunction = (effects.slingFunction ?? 0) + 2.5;
    effects.compensation = (effects.compensation ?? 0) - 2;
  }
  if (goalTypes.includes('decompress') || isNeural) {
    effects.pain = (effects.pain ?? 0) - 2;
    effects.jointLoading = (effects.jointLoading ?? 0) - 2;
    effects.neuralSensitivity = (effects.neuralSensitivity ?? 0) - 3;
  }
  if (Object.keys(effects).length <= 2) {
    effects.stiffness = -3;
    effects.romPercent = 3;
  }
  applyTissueBias(effects, tissueBias);
  for (const k of Object.keys(effects) as (keyof RecoveryState)[]) {
    if (effects[k] !== undefined) effects[k] = (effects[k] as number) * intensityFactor;
  }
  const basePeak = Math.max(1, Math.min(4, Math.ceil(stages * 0.8)));
  const baseDuration = Math.max(4, basePeak + 3);

  return {
    id,
    name: tech.name,
    modality: 'manual',
    onsetWeeks: Math.max(0, 0 + tissueBias.onsetDelta),
    peakWeeks: Math.max(1, basePeak + tissueBias.peakDelta),
    durationWeeks: Math.max(baseDuration, baseDuration + tissueBias.durationDelta),
    carryoverWeeks: Math.max(0, 1 + tissueBias.carryoverDelta),
    effects,
    healingStageMultiplier: isNeural
      ? { inflammatory: 0.4, proliferative: 1.0, remodeling: 1.2, maturation: 1.0 }
      : { inflammatory: 0.6, proliferative: 1.0, remodeling: 1.1, maturation: 0.9 },
    irritabilityPenalty: isNeural ? 0.6 : 0.4,
    mistimingFlareRisk: isNeural ? 12 : 8,
    description: `AI-designed manual therapy targeting ${tech.targetSystem ?? 'patient-specific tissue restrictions'} (${tissueClass}).`,
    defaultSessionsPerWeek: freqPerWeek,
  };
}

export function buildCustomTreatmentProfiles(
  customExercises?: CustomExerciseInput[] | null,
  customTechniques?: CustomManualTechniqueInput[] | null,
): TreatmentEffectProfile[] {
  const out: TreatmentEffectProfile[] = [];
  (customExercises ?? []).forEach((ex, i) => out.push(synthesizeCustomExerciseProfile(ex, i)));
  (customTechniques ?? []).forEach((t, i) => out.push(synthesizeCustomManualTechniqueProfile(t, i)));
  return out;
}

function buildLookup(custom?: TreatmentEffectProfile[] | null): Map<string, TreatmentEffectProfile> {
  if (!custom || custom.length === 0) return TREATMENT_BY_ID;
  const m = new Map(TREATMENT_BY_ID);
  for (const p of custom) m.set(p.id, p);
  return m;
}

export interface ScheduleProposal {
  startWeek: number;
  endWeek?: number;
  sessionsPerWeek: number;
  cadenceWeeks: number;
  taperWeeks?: number;
  taperFinalDose?: number;
  oneOff?: boolean;
  rationale: string;
}

/** Patient + skeleton context the proposer can reason over. Every
 *  field is optional; the proposer degrades gracefully (modality +
 *  defaults) when no context is supplied. */
export interface ScheduleProposerContext {
  /** Engine sim week the schedule is anchored to. */
  currentWeek?: number;
  /** Treatment-tag list from the patient's currently-active archetype
   *  stage (e.g., ['plyo', 'sport'] or ['education', 'manual']). */
  archetypeStageTags?: string[];
  /** Coarse delivery intensity preference. */
  intensity?: 'low' | 'standard' | 'high';
  /** 0–100; high acuity → more frequent early hands-on, shorter
   *  duration window. */
  acuity?: number;
  /** 0–100; high irritability → reduced sessions/wk for high-load
   *  modalities, more frequent for analgesic ones. */
  irritability?: number;
  /** 0–100; severity raises duration and biases towards in-clinic
   *  manual/electrophysical cadence. */
  severity?: number;
  /** Primary tissue class — bone/disc bias to longer windows; nerve
   *  to gentler, more spaced cadences. */
  primaryTissue?: ConditionTissue;
  /** Free-form region/joint hints (lower-back, shoulder, etc.) used
   *  to apply region-specific carryover heuristics. */
  regionTags?: string[];
  /** Patient age in years; <18 and >65 reduce per-session load
   *  tolerance, biasing towards smaller bouts × more days. */
  age?: number;
  /** Current ROM percent (0–100); low ROM → daily mobility cadence. */
  romPercent?: number;
  /** Work / sport demand 0–100; high demand → keep RTS / plyo at
   *  prescribed frequency, extend program duration. */
  workSportDemand?: number;
  /** 0–100 (or 0–1); low adherence → cap sessions/wk to a realistic
   *  ceiling and prefer daily-cue modalities (taping, education). */
  adherence?: number;
}

/**
 * Heuristic AI-style schedule proposer for a treatment. Uses modality,
 * the profile's calibrated default sessions/week, and (when available)
 * the patient's clinical + skeleton context (acuity, irritability,
 * severity, primary tissue, region, age, ROM, demand, adherence) to
 * suggest a realistic dosing schedule with a short rationale.
 *
 * The proposer is intentionally local + deterministic so it runs
 * instantly when treatments are added and can be re-run as a "bulk
 * re-frequency" action without hitting the network.
 */
export function proposeScheduleForTreatment(
  profile: TreatmentEffectProfile,
  opts?: ScheduleProposerContext,
): ScheduleProposal {
  const startWeek = Math.max(0, Math.round(opts?.currentWeek ?? 0));
  const intensity = opts?.intensity ?? 'standard';
  const intensityScale = intensity === 'high' ? 1.25 : intensity === 'low' ? 0.8 : 1;
  const baseSessions = profile.defaultSessionsPerWeek ?? 3;
  const naturalDuration = profile.peakWeeks + profile.durationWeeks;
  // Normalise context inputs to the [0,1] / sane-default ranges the
  // heuristics below expect.
  const acuity = clampRange(opts?.acuity, 0, 100, 50) / 100;
  const irritability = clampRange(opts?.irritability, 0, 100, 40) / 100;
  const severity = clampRange(opts?.severity, 0, 100, 50) / 100;
  const adherenceRaw = opts?.adherence ?? 80;
  const adherence = (adherenceRaw > 1 ? adherenceRaw : adherenceRaw * 100) / 100;
  const demand = clampRange(opts?.workSportDemand, 0, 100, 50) / 100;
  const romFrac = clampRange(opts?.romPercent, 0, 100, 80) / 100;
  const age = opts?.age;
  const tissue = opts?.primaryTissue;
  const region = (opts?.regionTags ?? []).map(r => r.toLowerCase());

  // Adherence ceiling — clinicians realistically can't prescribe 7×/wk
  // to a patient with sub-50% adherence and expect compliance.
  const adherenceSessionCap = adherence < 0.4 ? 2 : adherence < 0.6 ? 4 : adherence < 0.8 ? 5 : 7;
  // Tissue-specific duration bias — bone / disc / nerve heal slower
  // and need a longer active window than soft-tissue dominant cases.
  const tissueDurationMul = tissue === 'bone' ? 1.6
    : tissue === 'disc' ? 1.4
      : tissue === 'nerve' ? 1.3
        : tissue === 'ligament' ? 1.2
          : 1.0;
  // Age load-tolerance modifier — paediatric / older adults benefit
  // from smaller per-session loads spread across more days.
  const ageSpreadBonus = (age !== undefined && (age < 16 || age > 65)) ? 1 : 0;
  // High-irritability damping for high-load modalities.
  const irritDamp = irritability > 0.7 ? 0.7 : irritability > 0.5 ? 0.85 : 1;
  // Region-specific carryover boost for chronic spinal cases
  // (education + pacing keeps low cadence but long carryover).
  const isSpinalRegion = region.some(r => r.includes('back') || r.includes('lumbar') || r.includes('cervical') || r.includes('spine'));

  let sessionsPerWeek = Math.max(1, Math.round(baseSessions * intensityScale));
  let cadenceWeeks = 1;
  let endWeek: number | undefined = startWeek + naturalDuration;
  let taperWeeks: number | undefined;
  let taperFinalDose: number | undefined;
  let rationale = '';

  let oneOff: boolean | undefined;
  // Composite duration multiplier from clinical context.
  const ctxDurationMul = tissueDurationMul * (1 + 0.4 * severity) * (demand > 0.7 ? 1.2 : 1);
  const adjDuration = (base: number) => Math.max(1, Math.round(base * ctxDurationMul));
  // Tagging the rationale with the clinical drivers used.
  const drivers: string[] = [];
  if (acuity > 0.7) drivers.push('high acuity');
  if (irritability > 0.7) drivers.push('high irritability');
  if (severity > 0.7) drivers.push('high severity');
  if (adherence < 0.6) drivers.push('low adherence');
  if (demand > 0.7) drivers.push('high work/sport demand');
  if (age !== undefined && age < 16) drivers.push('paediatric');
  else if (age !== undefined && age > 65) drivers.push('older adult');
  if (tissue && tissue !== 'generic') drivers.push(`${tissue} tissue`);
  const driverTag = drivers.length ? ` (${drivers.join(', ')})` : '';

  switch (profile.modality) {
    case 'rest': {
      // Higher acuity → longer offload; lower acuity → very short
      sessionsPerWeek = 7; cadenceWeeks = 1;
      const restWks = Math.max(1, Math.min(4, Math.round(1 + acuity * 3)));
      endWeek = startWeek + Math.min(restWks, naturalDuration);
      taperWeeks = 1; taperFinalDose = 0.3;
      rationale = `Daily offload for ${restWks} wk(s) then taper to avoid deconditioning${driverTag}.`;
      break;
    }
    case 'manual': {
      // Clinic cadence: 2-3×/wk for high-irritability acute, 1-2×/wk
      // standard, fortnightly maintenance for low-irritability chronic.
      let weekly = Math.round(baseSessions * intensityScale);
      if (acuity > 0.7 || severity > 0.7) weekly = Math.max(weekly, 2);
      if (irritability > 0.7) weekly = Math.max(weekly, 2);
      if (acuity < 0.3 && irritability < 0.3) {
        cadenceWeeks = 2; weekly = 1;
      }
      sessionsPerWeek = Math.max(1, Math.min(adherenceSessionCap, weekly));
      const dur = adjDuration(Math.min(6, naturalDuration));
      endWeek = startWeek + dur;
      taperWeeks = Math.min(2, Math.max(1, Math.round(dur / 4)));
      taperFinalDose = 0.5;
      rationale = `${cadenceWeeks > 1 ? 'Fortnightly' : `${sessionsPerWeek}×/wk`} clinic hands-on across ${dur} wks; taper as patient self-manages${driverTag}.`;
      break;
    }
    case 'electrophysical': {
      // High irritability → 3-5×/wk early; low irritability → 2×/wk
      sessionsPerWeek = Math.min(adherenceSessionCap, irritability > 0.6 ? 4 : 3);
      cadenceWeeks = 1;
      const dur = adjDuration(Math.min(4, naturalDuration));
      endWeek = startWeek + dur;
      taperWeeks = 1; taperFinalDose = 0.4;
      rationale = `${sessionsPerWeek}×/wk symptomatic modulation while irritable; taper as pain resolves${driverTag}.`;
      break;
    }
    case 'education': {
      // Intensive weekly start, then carryover monthly checkpoint.
      sessionsPerWeek = 1; cadenceWeeks = 1;
      const intensiveWks = isSpinalRegion ? 4 : 3;
      endWeek = startWeek + Math.min(intensiveWks, naturalDuration);
      // Long carryover from education means a single follow-up
      // booster is more realistic than continued weekly contact.
      rationale = `Weekly pain-neuroscience / pacing education for ${intensiveWks} wks, then re-add a one-off booster monthly${driverTag}.`;
      break;
    }
    case 'taping': {
      sessionsPerWeek = 7; cadenceWeeks = 1;
      const wearWks = Math.min(4, Math.max(2, Math.round(2 + severity * 2)));
      endWeek = startWeek + Math.min(wearWks, naturalDuration);
      taperWeeks = Math.min(2, wearWks - 1); taperFinalDose = 0;
      rationale = `Daily wear ${wearWks} wks; taper as capacity returns${driverTag}.`;
      break;
    }
    case 'medication': {
      sessionsPerWeek = 7; cadenceWeeks = 1;
      endWeek = startWeek + Math.min(2, naturalDuration);
      taperWeeks = 1; taperFinalDose = 0.5;
      rationale = `Short daily symptomatic course; taper to minimum effective dose${driverTag}.`;
      break;
    }
    case 'load': {
      // Isometric loading vs graded load — both are home/gym programs
      let weekly = Math.max(3, Math.round(baseSessions * intensityScale));
      // High irritability + load → reduce to keep below pain threshold
      weekly = Math.round(weekly * irritDamp);
      // Low ROM → add a daily gentle bout via spreading
      if (romFrac < 0.6) weekly = Math.max(weekly, 5);
      // Older adults / paediatric → spread the load
      weekly = Math.min(adherenceSessionCap, weekly + ageSpreadBonus);
      sessionsPerWeek = Math.max(2, weekly);
      cadenceWeeks = 1;
      endWeek = startWeek + adjDuration(naturalDuration);
      rationale = `Home loading ${sessionsPerWeek}×/wk through capacity-build phase${driverTag}.`;
      break;
    }
    case 'exercise': {
      const tags = (opts?.archetypeStageTags ?? []).map(t => t.toLowerCase());
      const isPlyo = tags.some(t => t.includes('plyo') || t.includes('energy storage') || t.includes('rts'));
      const isMotor = tags.some(t => t.includes('motor') || t.includes('control') || t.includes('stabili'));
      if (isPlyo) {
        // Plyo cadence sensitive to irritability and demand.
        const weekly = irritability > 0.5 ? 1 : (demand > 0.7 ? 3 : 2);
        sessionsPerWeek = Math.min(adherenceSessionCap, weekly);
        cadenceWeeks = 1;
        endWeek = startWeek + adjDuration(naturalDuration);
        rationale = `Plyometric / RTS at ${sessionsPerWeek}×/wk to allow recovery between high-load sessions${driverTag}.`;
      } else if (isMotor) {
        let weekly = Math.max(4, Math.round(baseSessions * intensityScale));
        if (romFrac < 0.6) weekly = Math.min(adherenceSessionCap, weekly + 1);
        sessionsPerWeek = Math.min(adherenceSessionCap, weekly);
        cadenceWeeks = 1;
        endWeek = startWeek + adjDuration(naturalDuration);
        rationale = `Motor-control work ${sessionsPerWeek}×/wk — short low-load sets, daily-tolerant${driverTag}.`;
      } else {
        let weekly = Math.max(3, Math.round(baseSessions * intensityScale));
        weekly = Math.round(weekly * irritDamp);
        sessionsPerWeek = Math.min(adherenceSessionCap, Math.max(2, weekly));
        cadenceWeeks = 1;
        endWeek = startWeek + adjDuration(naturalDuration);
        rationale = `Strength / loading program ${sessionsPerWeek}×/wk through the active phase${driverTag}.`;
      }
      break;
    }
  }

  return { startWeek, endWeek, sessionsPerWeek, cadenceWeeks, taperWeeks, taperFinalDose, oneOff, rationale };
}

/** Local helper used by proposeScheduleForTreatment — clamp a number
 *  to a range, falling back to a default when the input is undefined
 *  or non-finite. Kept inline to keep the proposer self-contained. */
function clampRange(v: number | undefined, lo: number, hi: number, dflt: number): number {
  if (v === undefined || !Number.isFinite(v)) return dflt;
  return Math.max(lo, Math.min(hi, v));
}

export type ConditionTissue = 'tendon' | 'ligament' | 'muscle' | 'nerve' | 'joint' | 'fascia' | 'disc' | 'bone' | 'generic';
export type PainMechanismKind = 'nociceptive' | 'neuropathic' | 'central' | 'mixed' | 'unknown';

export interface ConditionContext {
  conditionId: string;
  conditionLabel: string;
  /** Recovery archetype ID resolved from conditionId + label. The dashboard
   *  uses this to render condition-appropriate stage models (tendinopathy
   *  load-capacity, OA, frozen shoulder, mechanical impingement, radicular,
   *  disc, bone stress, chronic, instability) instead of the default
   *  4-phase acute tissue healing layout. */
  archetypeId: RecoveryArchetypeId;
  primaryTissue: ConditionTissue;
  tissueLoad: number;
  scarLoad: number;
  painMechanism: PainMechanismKind;
  hasNerveRoot: boolean;
  baselineRomPercent: number;
  baselineMotorControl: number;
  baselineCapacity: number;
  slingWeakLinkSeverity: number;
  patientHealingMult: number;
  patientPainMult: number;
  patientRecurrenceMult: number;
  patientTissueQualityMult: number;
  patientPhaseTimingMult: number;
  patientRomCeiling: number;
  ageYears: number | null;
}

export interface TissueHealingProfile {
  healingRateMult: number;
  phaseDurationMult: number;
  reinjurySensitivity: number;
  painDecayMult: number;
  romRecoveryMult: number;
  capacityRampMult: number;
  flareRiskBase: number;
  romCeiling: number;
  capacityCeiling: number;
  gateRelaxation: number;
}

const TISSUE_HEALING: Record<ConditionTissue, TissueHealingProfile> = {
  muscle:   { healingRateMult: 1.20, phaseDurationMult: 0.80, reinjurySensitivity: 0.9, painDecayMult: 1.10, romRecoveryMult: 1.10, capacityRampMult: 1.10, flareRiskBase: 0,  romCeiling: 100, capacityCeiling: 100, gateRelaxation: 0 },
  ligament: { healingRateMult: 0.80, phaseDurationMult: 1.30, reinjurySensitivity: 1.2, painDecayMult: 0.90, romRecoveryMult: 0.90, capacityRampMult: 0.85, flareRiskBase: 4, romCeiling: 95, capacityCeiling: 92, gateRelaxation: -2 },
  tendon:   { healingRateMult: 0.60, phaseDurationMult: 1.60, reinjurySensitivity: 1.4, painDecayMult: 0.85, romRecoveryMult: 0.90, capacityRampMult: 0.80, flareRiskBase: 8, romCeiling: 95, capacityCeiling: 88, gateRelaxation: -5 },
  nerve:    { healingRateMult: 0.50, phaseDurationMult: 1.80, reinjurySensitivity: 1.3, painDecayMult: 0.70, romRecoveryMult: 0.80, capacityRampMult: 0.70, flareRiskBase: 10, romCeiling: 90, capacityCeiling: 80, gateRelaxation: 5 },
  joint:    { healingRateMult: 0.70, phaseDurationMult: 1.40, reinjurySensitivity: 1.1, painDecayMult: 0.95, romRecoveryMult: 0.70, capacityRampMult: 0.85, flareRiskBase: 5, romCeiling: 90, capacityCeiling: 85, gateRelaxation: 3 },
  fascia:   { healingRateMult: 1.00, phaseDurationMult: 1.00, reinjurySensitivity: 0.9, painDecayMult: 1.00, romRecoveryMult: 1.10, capacityRampMult: 0.95, flareRiskBase: 2, romCeiling: 95, capacityCeiling: 95, gateRelaxation: 0 },
  disc:     { healingRateMult: 0.55, phaseDurationMult: 1.70, reinjurySensitivity: 1.4, painDecayMult: 0.80, romRecoveryMult: 0.85, capacityRampMult: 0.80, flareRiskBase: 8, romCeiling: 85, capacityCeiling: 80, gateRelaxation: 5 },
  bone:     { healingRateMult: 0.70, phaseDurationMult: 1.50, reinjurySensitivity: 1.0, painDecayMult: 0.90, romRecoveryMult: 0.85, capacityRampMult: 0.80, flareRiskBase: 4, romCeiling: 92, capacityCeiling: 90, gateRelaxation: -3 },
  generic:  { healingRateMult: 1.00, phaseDurationMult: 1.00, reinjurySensitivity: 1.0, painDecayMult: 1.00, romRecoveryMult: 1.00, capacityRampMult: 1.00, flareRiskBase: 0, romCeiling: 100, capacityCeiling: 100, gateRelaxation: 0 },
};

interface ConditionOverride {
  primaryTissue: ConditionTissue;
  healingRateMult?: number;
  flareRiskBase?: number;
  romCeiling?: number;
  capacityCeiling?: number;
  capacityRampMult?: number;
  painDecayMult?: number;
  initialPainAdd?: number;
  initialRomAdd?: number;
  initialCapacityAdd?: number;
  chronicityRiskAdd?: number;
  initialIrritabilityAdd?: number;
  initialDemandAdd?: number;
  gateRelaxation?: number;
}

// Order matters: more specific patterns must come before more general ones so
// e.g. "subacromial impingement" maps to subacromial_impingement (mechanical
// impingement archetype) instead of falling through to rotator_cuff_tendinopathy.
const CONDITION_OVERRIDES: { match: RegExp; id: string; override: ConditionOverride }[] = [
  // Frozen shoulder — must precede the generic shoulder/impingement matches
  { match: /(frozen shoulder|adhesive capsulitis)/i, id: 'frozen_shoulder', override: { primaryTissue: 'joint', healingRateMult: 0.55, romCeiling: 70, capacityCeiling: 75, painDecayMult: 0.70, initialRomAdd: -25, capacityRampMult: 0.70, chronicityRiskAdd: 15, initialIrritabilityAdd: 15, gateRelaxation: 8 } },
  // Mechanical impingement — must precede rotator_cuff_tendinopathy
  { match: /(subacromial impinge|subacromial pain|shoulder impinge)/i, id: 'subacromial_impingement', override: { primaryTissue: 'joint', healingRateMult: 0.85, painDecayMult: 0.95, flareRiskBase: 5 } },
  { match: /(patellofemoral|pfps|runner'?s knee)/i, id: 'patellofemoral_pain', override: { primaryTissue: 'joint', healingRateMult: 0.85, romCeiling: 95, painDecayMult: 0.95 } },
  { match: /(femoroacetabular|^fai\b|hip impinge)/i, id: 'subacromial_impingement', override: { primaryTissue: 'joint', healingRateMult: 0.80, romCeiling: 90, capacityRampMult: 0.85 } },
  // Rotator cuff TEAR — must precede rotator_cuff_tendinopathy so tears stay
  // on the acute 4-phase model (legacy parity requirement).
  { match: /(rotator cuff tear|cuff tear|full[- ]thickness tear|partial[- ]thickness tear|supraspinatus tear)/i, id: 'rotator_cuff_tear', override: { primaryTissue: 'tendon', healingRateMult: 0.65, romCeiling: 90, capacityCeiling: 85, initialRomAdd: -15, capacityRampMult: 0.80, initialIrritabilityAdd: 8 } },
  // Tendinopathies
  { match: /(rotator cuff tendin|supraspinatus tendin|rotator cuff)/i, id: 'rotator_cuff_tendinopathy', override: { primaryTissue: 'tendon', romCeiling: 95, flareRiskBase: 8 } },
  { match: /(achilles)/i, id: 'achilles_tendinopathy', override: { primaryTissue: 'tendon', healingRateMult: 0.55, romCeiling: 90, flareRiskBase: 10, capacityRampMult: 0.75 } },
  { match: /(patellar tendin|jumper'?s knee)/i, id: 'patellar_tendinopathy', override: { primaryTissue: 'tendon', healingRateMult: 0.60, flareRiskBase: 9 } },
  { match: /(gluteal tendin|greater trochanteric|trochanteric pain)/i, id: 'gluteal_tendinopathy', override: { primaryTissue: 'tendon', healingRateMult: 0.65, flareRiskBase: 8 } },
  { match: /(lateral epicond|tennis elbow)/i, id: 'lateral_epicondylalgia', override: { primaryTissue: 'tendon', healingRateMult: 0.65, flareRiskBase: 7 } },
  { match: /(medial epicond|golfer'?s elbow)/i, id: 'lateral_epicondylalgia', override: { primaryTissue: 'tendon', healingRateMult: 0.65, flareRiskBase: 7 } },
  // Radicular / nerve / stenosis / myelopathy
  { match: /(stenosis)/i, id: 'lumbar_stenosis', override: { primaryTissue: 'nerve', healingRateMult: 0.45, romCeiling: 75, capacityCeiling: 75, capacityRampMult: 0.65, chronicityRiskAdd: 15, initialDemandAdd: -10, gateRelaxation: 8 } },
  { match: /(cervical radicul)/i, id: 'cervical_radiculopathy', override: { primaryTissue: 'nerve', healingRateMult: 0.55, painDecayMult: 0.70, flareRiskBase: 10, initialPainAdd: 10, initialIrritabilityAdd: 10, gateRelaxation: 5 } },
  { match: /(radicul|sciatica|nerve root)/i, id: 'radiculopathy', override: { primaryTissue: 'nerve', healingRateMult: 0.55, painDecayMult: 0.70, flareRiskBase: 10, initialPainAdd: 10, initialIrritabilityAdd: 10, gateRelaxation: 5 } },
  { match: /(myelopath)/i, id: 'cervical_myelopathy', override: { primaryTissue: 'nerve', healingRateMult: 0.40, romCeiling: 70, capacityCeiling: 70, capacityRampMult: 0.60, chronicityRiskAdd: 20, initialDemandAdd: -15, gateRelaxation: 10 } },
  // Disc / spondy
  { match: /(disc herniat|prolaps|disc bulge|lumbar disc)/i, id: 'lumbar_disc_herniation', override: { primaryTissue: 'disc', healingRateMult: 0.60, painDecayMult: 0.85, initialPainAdd: 5, initialIrritabilityAdd: 8 } },
  { match: /(spondylolisthe)/i, id: 'spondylolisthesis', override: { primaryTissue: 'joint', healingRateMult: 0.60, romCeiling: 80, capacityCeiling: 80, capacityRampMult: 0.70, gateRelaxation: 5 } },
  // OA
  { match: /(hip osteoarthr|hip arthritis|hip oa)/i, id: 'hip_oa', override: { primaryTissue: 'joint', healingRateMult: 0.60, romCeiling: 80, capacityCeiling: 78, painDecayMult: 0.85, capacityRampMult: 0.75, chronicityRiskAdd: 10, gateRelaxation: 5 } },
  { match: /(osteoarthr|^oa\b|knee arthritis)/i, id: 'osteoarthritis', override: { primaryTissue: 'joint', healingRateMult: 0.60, romCeiling: 80, capacityCeiling: 78, painDecayMult: 0.85, capacityRampMult: 0.75, chronicityRiskAdd: 10, gateRelaxation: 5 } },
  // Surgical / acute tissue healing
  { match: /(replacement|arthroplasty|tkr|thr|tka)/i, id: 'joint_replacement', override: { primaryTissue: 'joint', healingRateMult: 0.65, romCeiling: 85, capacityCeiling: 80, initialRomAdd: -25, initialCapacityAdd: -20, capacityRampMult: 0.75, initialIrritabilityAdd: 12, initialDemandAdd: -10, gateRelaxation: 8 } },
  { match: /(acl reconstruct|acl repair)/i, id: 'acl_reconstruction', override: { primaryTissue: 'ligament', healingRateMult: 0.65, romCeiling: 95, capacityCeiling: 90, initialRomAdd: -20, initialCapacityAdd: -25, capacityRampMult: 0.80, initialIrritabilityAdd: 10, gateRelaxation: 5 } },
  { match: /(post[- ]?surg|post[- ]?op|reconstruction|repair surgery)/i, id: 'post_surgical', override: { primaryTissue: 'joint', healingRateMult: 0.70, romCeiling: 90, capacityCeiling: 85, initialRomAdd: -20, initialCapacityAdd: -15, capacityRampMult: 0.80, initialIrritabilityAdd: 10, gateRelaxation: 5 } },
  { match: /(meniscal|meniscus)/i, id: 'meniscal_injury', override: { primaryTissue: 'joint', healingRateMult: 0.70, romCeiling: 92, painDecayMult: 0.90 } },
  { match: /(ankle sprain|lateral ligament)/i, id: 'ankle_sprain_lateral', override: { primaryTissue: 'ligament', healingRateMult: 0.85, flareRiskBase: 5 } },
  { match: /(whiplash|wad)/i, id: 'whiplash', override: { primaryTissue: 'muscle', healingRateMult: 0.85, painDecayMult: 0.90 } },
  { match: /(hamstring strain|muscle strain|grade [12] tear)/i, id: 'muscle_strain', override: { primaryTissue: 'muscle', healingRateMult: 1.10, capacityRampMult: 1.10 } },
  // Fascia / nerve entrapment
  { match: /(plantar fasc)/i, id: 'plantar_fasciitis', override: { primaryTissue: 'fascia', healingRateMult: 0.85, painDecayMult: 0.90, flareRiskBase: 5 } },
  { match: /(carpal tunnel|cubital tunnel|tarsal tunnel|nerve entrap)/i, id: 'nerve_entrapment', override: { primaryTissue: 'nerve', healingRateMult: 0.60, painDecayMult: 0.80, flareRiskBase: 8 } },
  // Bone stress / fracture
  { match: /(stress fracture|stress reaction|bone stress|fracture)/i, id: 'bone_stress', override: { primaryTissue: 'bone', healingRateMult: 0.65, romCeiling: 92, flareRiskBase: 4 } },
  // Chronic / nociplastic
  { match: /(fibromyalg|chronic pain|chronic widespread|central sensit|cps|nociplastic)/i, id: 'chronic_pain', override: { primaryTissue: 'generic', healingRateMult: 0.70, painDecayMult: 0.75, chronicityRiskAdd: 25 } },
  // Instability / hypermobility
  { match: /(hypermobil|eds|ehlers[- ]danlos|joint instab|multidirectional instab|shoulder instab)/i, id: 'joint_instability', override: { primaryTissue: 'ligament', healingRateMult: 0.85, capacityRampMult: 0.90 } },
];

export function classifyCondition(mainComplaint?: string | null): { id: string; label: string; override: ConditionOverride } {
  const text = (mainComplaint ?? '').trim();
  for (const entry of CONDITION_OVERRIDES) {
    if (entry.match.test(text)) {
      return { id: entry.id, label: text || entry.id, override: entry.override };
    }
  }
  return { id: 'generic', label: text || 'Generic musculoskeletal', override: { primaryTissue: 'generic' } };
}

export function buildConditionContext(args: {
  mainComplaint?: string | null;
  compromisedTissues?: { type: string; severity: number }[];
  scarSeverityList?: number[];
  adhesionCount?: number;
  painMechanism?: string | null;
  hasNerveRoot?: boolean;
  currentRomPercent?: number | null;
  baselineMotorControl?: number | null;
  baselineCapacity?: number | null;
  slingWeakLinkSeverity?: number | null;
  patientHealingMult?: number;
  patientPainMult?: number;
  patientRecurrenceMult?: number;
  patientTissueQualityMult?: number;
  patientPhaseTimingMult?: number;
  patientRomCeiling?: number;
  ageYears?: number | null;
}): ConditionContext {
  const cls = classifyCondition(args.mainComplaint);
  let tissueLoad = 0;
  let pickedTissue: ConditionTissue = cls.override.primaryTissue;
  let topSev = 0;
  for (const t of args.compromisedTissues ?? []) {
    tissueLoad += t.severity;
    if (t.severity > topSev) {
      topSev = t.severity;
      const norm = t.type.toLowerCase();
      if (['tendon','ligament','muscle','nerve','joint','fascia','disc','bone'].includes(norm) && cls.override.primaryTissue === 'generic') {
        pickedTissue = norm as ConditionTissue;
      }
    }
  }
  tissueLoad = Math.min(100, tissueLoad);

  const scarLoad = Math.min(100,
    (args.scarSeverityList ?? []).reduce((s, v) => s + v * 12, 0) +
    (args.adhesionCount ?? 0) * 8,
  );

  const pmRaw = (args.painMechanism ?? '').toString().toLowerCase();
  const painMechanism: PainMechanismKind =
    pmRaw.includes('neuro') ? 'neuropathic' :
    pmRaw.includes('central') ? 'central' :
    pmRaw.includes('myofas') || pmRaw.includes('nocicep') ? 'nociceptive' :
    pmRaw.includes('mixed') ? 'mixed' : 'unknown';

  return {
    conditionId: cls.id,
    conditionLabel: cls.label,
    archetypeId: resolveArchetypeId(cls.id, cls.label),
    primaryTissue: pickedTissue,
    tissueLoad,
    scarLoad,
    painMechanism,
    hasNerveRoot: !!args.hasNerveRoot,
    baselineRomPercent: args.currentRomPercent ?? 70,
    baselineMotorControl: args.baselineMotorControl ?? 60,
    baselineCapacity: args.baselineCapacity ?? 50,
    slingWeakLinkSeverity: args.slingWeakLinkSeverity ?? 0,
    patientHealingMult: args.patientHealingMult ?? 1,
    patientPainMult: args.patientPainMult ?? 1,
    patientRecurrenceMult: args.patientRecurrenceMult ?? 1,
    patientTissueQualityMult: args.patientTissueQualityMult ?? 1,
    patientPhaseTimingMult: args.patientPhaseTimingMult ?? 1,
    patientRomCeiling: args.patientRomCeiling ?? 1,
    ageYears: args.ageYears ?? null,
  };
}

export function tissueProfileForContext(ctx: ConditionContext): TissueHealingProfile {
  const base = TISSUE_HEALING[ctx.primaryTissue] ?? TISSUE_HEALING.generic;
  const o = classifyCondition(ctx.conditionLabel || ctx.conditionId).override;
  return {
    healingRateMult: (o.healingRateMult ?? base.healingRateMult) * ctx.patientHealingMult,
    phaseDurationMult: base.phaseDurationMult * ctx.patientPhaseTimingMult,
    reinjurySensitivity: base.reinjurySensitivity * ctx.patientRecurrenceMult,
    painDecayMult: (o.painDecayMult ?? base.painDecayMult) / Math.max(0.5, ctx.patientPainMult),
    romRecoveryMult: base.romRecoveryMult,
    capacityRampMult: o.capacityRampMult ?? base.capacityRampMult,
    flareRiskBase: o.flareRiskBase ?? base.flareRiskBase,
    romCeiling: Math.min(o.romCeiling ?? base.romCeiling, base.romCeiling) * ctx.patientRomCeiling,
    capacityCeiling: Math.min(o.capacityCeiling ?? base.capacityCeiling, base.capacityCeiling) * ctx.patientTissueQualityMult,
    gateRelaxation: (o.gateRelaxation ?? base.gateRelaxation),
  };
}

function defaultInitialState(input: SimulationInput, ctx?: ConditionContext): RecoveryState {
  const sev = input.conditionSeverity;
  const o = ctx ? classifyCondition(ctx.conditionLabel || ctx.conditionId).override : { primaryTissue: 'generic' as ConditionTissue };
  const profile = ctx ? tissueProfileForContext(ctx) : TISSUE_HEALING.generic;
  const irrCtxAdd = ctx ? ((o.initialIrritabilityAdd ?? 0)
    + (ctx.painMechanism === 'central' ? 12 : ctx.painMechanism === 'neuropathic' ? 8 : 0)
    + ctx.scarLoad * 0.1
    + ctx.tissueLoad * 0.08) : 0;
  const irr = clamp(input.irritability + irrCtxAdd);
  const acuityFactor = input.acuity === 'acute' ? 1 : input.acuity === 'subacute' ? 0.7 : 0.5;

  const baselineRom = ctx ? clamp(ctx.baselineRomPercent + (o.initialRomAdd ?? 0)) : clamp(70 - sev * 0.3);
  const baselineMotor = ctx ? clamp(ctx.baselineMotorControl) : clamp(60 - sev * 0.3);
  const baselineCap = ctx ? clamp(ctx.baselineCapacity + (o.initialCapacityAdd ?? 0)) : clamp(45 - sev * 0.3);
  const painAdd = ctx ? ((o.initialPainAdd ?? 0) + (ctx.painMechanism === 'neuropathic' ? 8 : ctx.painMechanism === 'central' ? 12 : 0)) : 0;
  const neuralBoost = ctx && (ctx.painMechanism === 'neuropathic' || ctx.hasNerveRoot) ? 25 : ctx?.painMechanism === 'central' ? 30 : 0;
  const fearBoost = ctx?.painMechanism === 'central' ? 20 : 0;
  const chronicityBoost = ctx ? ((o.chronicityRiskAdd ?? 0) + (ctx.painMechanism === 'central' ? 15 : 0)) : 0;
  const slingPenalty = ctx ? ctx.slingWeakLinkSeverity * 0.3 : 0;
  const scarPenalty = ctx ? ctx.scarLoad * 0.25 : 0;
  const tissueLoadPenalty = ctx ? ctx.tissueLoad * 0.15 : 0;

  return {
    week: 0,
    pain: clamp(50 + sev * 0.4 + painAdd),
    stiffness: clamp(40 + sev * 0.3 + scarPenalty * 0.5),
    swelling: clamp(input.acuity === 'acute' ? 50 : 20),
    irritability: irr,
    inflammation: clamp(input.acuity === 'acute' ? 65 : 25),
    healingPhase: input.acuity === 'acute' ? 'inflammatory' : input.acuity === 'subacute' ? 'proliferative' : 'remodeling',
    healingProgress: input.acuity === 'acute' ? 5 : input.acuity === 'subacute' ? 30 : 60,
    loadTolerance: clamp(50 - sev * 0.4 - tissueLoadPenalty),
    structuralIntegrity: clamp(80 - sev * 0.3 - tissueLoadPenalty - scarPenalty * 0.6),
    walking: clamp(70 - sev * 0.3),
    stairs: clamp(60 - sev * 0.4),
    squat: clamp(50 - sev * 0.45),
    running: clamp(30 - sev * 0.3),
    sport: clamp(15 - sev * 0.15),
    workCapacity: clamp(60 - sev * 0.3),
    jointLoading: clamp(50 + sev * 0.3),
    compensation: clamp(30 + sev * 0.3 + slingPenalty),
    movementQuality: clamp(70 - sev * 0.3 - slingPenalty * 0.5),
    asymmetry: clamp(20 + sev * 0.3 + slingPenalty * 0.5),
    reinjuryRisk: clamp(30 + sev * 0.3 * acuityFactor + profile.flareRiskBase * 0.5),
    flareRisk: clamp(40 + irr * 0.3 + profile.flareRiskBase),
    chronicityRisk: clamp((input.acuity === 'chronic' ? 60 : 25) + chronicityBoost),
    compensatoryInjuryRisk: clamp(20 + sev * 0.2 + slingPenalty * 0.4),
    romPercent: baselineRom,
    strength: clamp(60 - sev * 0.3 - tissueLoadPenalty * 0.5),
    motorControl: baselineMotor,
    neuralSensitivity: clamp(40 + irr * 0.3 + neuralBoost),
    fearAvoidance: clamp(30 + irr * 0.3 + fearBoost),
    sleep: 65,
    adherence: input.patientAdherence,
    slingFunction: clamp(60 - sev * 0.3 - slingPenalty),
    capacity: baselineCap,
    demand: clamp((input.workDemand + input.sportDemand) / 2 + (ctx ? (o.initialDemandAdd ?? 0) : 0)),
    ...(input.initialState ?? {}),
  };
}

function effectRamp(treatment: TreatmentEffectProfile, weeksActive: number, weeksSinceStop: number | null): number {
  if (weeksSinceStop !== null) {
    if (weeksSinceStop > treatment.carryoverWeeks) return 0;
    return 1 - weeksSinceStop / Math.max(1, treatment.carryoverWeeks);
  }
  if (weeksActive < treatment.onsetWeeks) return 0.1 * (weeksActive / Math.max(0.5, treatment.onsetWeeks));
  if (weeksActive < treatment.peakWeeks) {
    const t = (weeksActive - treatment.onsetWeeks) / Math.max(0.5, treatment.peakWeeks - treatment.onsetWeeks);
    return 0.1 + 0.9 * t;
  }
  if (weeksActive < treatment.peakWeeks + treatment.durationWeeks) return 1;
  const decayWindow = treatment.durationWeeks * 0.5;
  return Math.max(0, 1 - (weeksActive - treatment.peakWeeks - treatment.durationWeeks) / Math.max(1, decayWindow));
}

function advanceHealingPhase(state: RecoveryState, baselineProgressPerWeek: number): { phase: HealingPhase; progress: number } {
  const newProgress = clamp(state.healingProgress + baselineProgressPerWeek);
  let phase: HealingPhase;
  if (newProgress < 15) phase = 'inflammatory';
  else if (newProgress < 45) phase = 'proliferative';
  else if (newProgress < 80) phase = 'remodeling';
  else phase = 'maturation';
  return { phase, progress: newProgress };
}

function naturalProgressionRate(mode: BaselineMode, state: RecoveryState, profile?: TissueHealingProfile): number {
  const base =
    mode === 'no_treatment' ? 1.5 :
    mode === 'rest_only' ? 2.5 :
    mode === 'usual_care' ? 3.5 :
    -2;
  const irrPenalty = state.irritability > 60 ? -0.5 : 0;
  const sleepBoost = state.sleep > 70 ? 0.3 : -0.2;
  const tissueMult = profile?.healingRateMult ?? 1;
  const sign = base >= 0 ? 1 : -1;
  return ((base + irrPenalty + sleepBoost)) * (sign > 0 ? tissueMult : 1);
}

interface SimContext {
  branch: ScenarioBranch;
  baselineMode: BaselineMode;
  input: SimulationInput;
  noiseSeed: number;
  lookup: Map<string, TreatmentEffectProfile>;
  conditionContext?: ConditionContext;
  profile?: TissueHealingProfile;
}

function applyTreatmentEffects(
  state: RecoveryState,
  ctx: SimContext,
  week: number,
): { newState: RecoveryState; markers: InterventionMarker[]; attribution: Map<string, number> } {
  const next: RecoveryState = { ...state, week };
  const markers: InterventionMarker[] = [];
  const attribution = new Map<string, number>();

  const naturalRate = naturalProgressionRate(ctx.baselineMode, state, ctx.profile);
  const phaseAdvance = (ctx.profile?.healingRateMult ?? 1) / Math.max(0.4, ctx.profile?.phaseDurationMult ?? 1);
  const phaseUpdate = advanceHealingPhase(state, naturalRate * 1.2 * phaseAdvance);
  next.healingPhase = phaseUpdate.phase;
  next.healingProgress = phaseUpdate.progress;

  const painDecay = ctx.profile?.painDecayMult ?? 1;
  next.inflammation = clamp(next.inflammation - (ctx.baselineMode === 'continued_aggravation' ? -3 : 2.5));
  next.swelling = clamp(next.swelling - (ctx.baselineMode === 'continued_aggravation' ? -2 : 2));
  next.pain = clamp(next.pain - (ctx.baselineMode === 'continued_aggravation' ? -2 : 1 * painDecay));
  next.irritability = clamp(next.irritability - 0.5);

  for (const intv of ctx.branch.interventions) {
    if (week < intv.startWeek) continue;
    const ended = intv.endWeek !== undefined && week >= intv.endWeek;
    const weeksActive = ended ? (intv.endWeek! - intv.startWeek) : (week - intv.startWeek);
    const weeksSinceStop = ended ? week - intv.endWeek! : null;
    const treatment = ctx.lookup.get(intv.treatmentId);
    if (!treatment) continue;

    // One-off treatments only fire on the start week. Skip effect
    // application entirely on every other week — only the remove
    // marker (if scheduled) is allowed through.
    if (intv.oneOff && week !== intv.startWeek) {
      if (intv.endWeek === week) {
        markers.push({ week, type: 'remove', label: `Stop ${treatment.name}`, treatmentId: treatment.id });
      }
      continue;
    }
    {
      // Cadence gate — fortnightly/monthly treatments only deliver on
      // their schedule weeks. The intro marker still fires on startWeek
      // (which is by definition a delivery week) so the chart still
      // shows when the treatment was added.
      const cadence = Math.max(1, Math.round(intv.cadenceWeeks ?? 1));
      if (!ended && cadence > 1) {
        const offset = week - intv.startWeek;
        if (offset > 0 && offset % cadence !== 0) {
          // Skip effect application this week, but still let the
          // remove marker fire below if it's the endWeek.
          if (intv.endWeek === week) {
            markers.push({ week, type: 'remove', label: `Stop ${treatment.name}`, treatmentId: treatment.id });
          }
          continue;
        }
      }
    }

    const ramp = effectRamp(treatment, weeksActive, weeksSinceStop);
    if (ramp <= 0) continue;

    const phaseMul = treatment.healingStageMultiplier?.[next.healingPhase] ?? 1;
    const adherenceRaw = ctx.branch.adherenceOverride !== undefined ? ctx.branch.adherenceOverride : intv.adherence;
    const adherence = adherenceRaw > 1 ? adherenceRaw / 100 : adherenceRaw;
    const applicableDoseChanges = (ctx.branch.doseChanges ?? []).filter(d => d.interventionId === intv.id && d.week <= week).sort((a, b) => b.week - a.week);
    const effectiveDoseMultiplier = applicableDoseChanges[0]?.newDoseMultiplier ?? intv.doseMultiplier;
    if (applicableDoseChanges.length > 0 && applicableDoseChanges[0].week === week) {
      markers.push({ week, type: 'dose_change', label: `${treatment.name} dose → ×${effectiveDoseMultiplier.toFixed(2)}`, treatmentId: treatment.id });
    }
    // Sessions/week scalar — diminishing returns relative to the
    // profile's calibrated default (sqrt ratio so doubling sessions
    // gives ~1.41× effect, halving gives ~0.71×).
    const defaultSessions = Math.max(0.5, treatment.defaultSessionsPerWeek ?? 3);
    const sessions = Math.max(0.25, intv.sessionsPerWeek ?? defaultSessions);
    const sessionScalar = Math.sqrt(sessions / defaultSessions);

    // Taper scalar — linear ramp 1 → taperFinalDose over the last
    // taperWeeks of the active window (capped at endWeek if set,
    // otherwise the profile's natural duration end).
    let taperScalar = 1;
    if (intv.taperWeeks && intv.taperWeeks > 0) {
      const taperFinal = Math.max(0, Math.min(1, intv.taperFinalDose ?? 0.5));
      const naturalEnd = intv.startWeek + treatment.peakWeeks + treatment.durationWeeks;
      const intvEnd = intv.endWeek ?? naturalEnd;
      const taperStart = intvEnd - intv.taperWeeks;
      if (week >= taperStart && week < intvEnd) {
        const t = (week - taperStart) / Math.max(1, intv.taperWeeks);
        taperScalar = 1 + (taperFinal - 1) * t;
      }
    }

    const dose = effectiveDoseMultiplier * adherence;

    let gateBlocked = false;
    const gateFailures: string[] = [];
    if (treatment.gates) {
      const g = treatment.gates;
      if (g.minCapacity !== undefined && state.capacity < g.minCapacity) gateFailures.push(`capacity ${state.capacity.toFixed(0)}<${g.minCapacity}`);
      if (g.maxPain !== undefined && state.pain > g.maxPain) gateFailures.push(`pain ${state.pain.toFixed(0)}>${g.maxPain}`);
      if (g.maxFlareRisk !== undefined && state.flareRisk > g.maxFlareRisk) gateFailures.push(`flareRisk ${state.flareRisk.toFixed(0)}>${g.maxFlareRisk}`);
      if (g.minHealingProgress !== undefined && state.healingProgress < g.minHealingProgress) gateFailures.push(`healing ${state.healingProgress.toFixed(0)}%<${g.minHealingProgress}%`);
      if (g.minRomPercent !== undefined && state.romPercent < g.minRomPercent) gateFailures.push(`ROM ${state.romPercent.toFixed(0)}%<${g.minRomPercent}%`);
      if (g.minStrength !== undefined && state.strength < g.minStrength) gateFailures.push(`strength ${state.strength.toFixed(0)}<${g.minStrength}`);
      if (gateFailures.length > 0) gateBlocked = true;
    }

    let totalScale = ramp * phaseMul * dose * sessionScalar * taperScalar;
    if (gateBlocked) {
      totalScale *= 0.15;
      const overload = (treatment.mistimingFlareRisk ?? 8) * dose * 0.5;
      next.flareRisk = clamp(next.flareRisk + overload);
      next.pain = clamp(next.pain + overload * 0.4);
      next.reinjuryRisk = clamp(next.reinjuryRisk + overload * 0.3);
      next.irritability = clamp(next.irritability + overload * 0.3);
      const flareTriggerThreshold = (treatment.mistimingFlareRisk ?? 0) > 15 ? 0.55 : 0.8;
      if (Math.random() < flareTriggerThreshold * Math.min(1, dose)) {
        const flareSev = Math.min(25, 8 + overload);
        next.pain = clamp(next.pain + flareSev);
        next.swelling = clamp(next.swelling + flareSev * 0.5);
        next.inflammation = clamp(next.inflammation + flareSev * 0.6);
        next.loadTolerance = clamp(next.loadTolerance - flareSev * 0.3);
        markers.push({ week, type: 'flare', label: `Gate-violation flare: ${treatment.name} [${gateFailures.join(', ')}]` });
      } else {
        markers.push({ week, type: 'adherence_drop', label: `Gated: ${treatment.name} attenuated [${gateFailures.join(', ')}]`, treatmentId: treatment.id });
      }
    }

    if (week === intv.startWeek) {
      const provenance = treatment.id.startsWith('custom_ex_') ? '✦ AI Exercise: ' : treatment.id.startsWith('custom_mt_') ? '✦ AI Manual: ' : '';
      markers.push({ week, type: 'introduce', label: gateBlocked ? `${provenance}${treatment.name} (gated)` : `${provenance}${treatment.name}`, treatmentId: treatment.id });
    }
    if (intv.endWeek === week) {
      markers.push({ week, type: 'remove', label: `Stop ${treatment.name}`, treatmentId: treatment.id });
    }

    for (const [key, val] of Object.entries(treatment.effects)) {
      const k = key as keyof RecoveryState;
      const cur = next[k];
      if (typeof cur === 'number') {
        (next as unknown as Record<string, number>)[k] = clamp(cur + val * totalScale);
      }
    }

    if (treatment.irritabilityPenalty && state.irritability > 60) {
      const overshoot = treatment.irritabilityPenalty * (state.irritability - 60) / 40 * dose;
      next.flareRisk = clamp(next.flareRisk + overshoot * 5);
      next.pain = clamp(next.pain + overshoot * 2);
    }

    let contribution = 0;
    for (const v of Object.values(treatment.effects)) contribution += Math.abs(v) * totalScale;
    attribution.set(treatment.id, (attribution.get(treatment.id) ?? 0) + contribution);
  }

  for (const flare of ctx.branch.flareEvents) {
    if (flare.week === week) {
      next.pain = clamp(next.pain + flare.severity);
      next.swelling = clamp(next.swelling + flare.severity * 0.6);
      next.inflammation = clamp(next.inflammation + flare.severity * 0.7);
      next.irritability = clamp(next.irritability + flare.severity * 0.5);
      next.loadTolerance = clamp(next.loadTolerance - flare.severity * 0.4);
      next.flareRisk = clamp(next.flareRisk + flare.severity * 0.3);
      markers.push({ week, type: 'flare', label: `Flare-up (+${flare.severity})` });
    }
  }
  for (const reagg of ctx.branch.reaggravationEvents) {
    if (reagg.week === week) {
      next.pain = clamp(next.pain + reagg.severityPct);
      next.structuralIntegrity = clamp(next.structuralIntegrity - reagg.severityPct * 0.3);
      next.healingProgress = clamp(next.healingProgress - reagg.severityPct * 0.4);
      next.reinjuryRisk = clamp(next.reinjuryRisk + reagg.severityPct * 0.3);
      markers.push({ week, type: 'reaggravate', label: `Re-aggravation (-${reagg.severityPct}%)` });
    }
  }
  for (const load of ctx.branch.loadAdjustments) {
    if (load.week === week) {
      next.demand = clamp(next.demand + load.deltaPercent);
      markers.push({ week, type: 'load_change', label: load.label ?? `Load ${load.deltaPercent > 0 ? '+' : ''}${load.deltaPercent}%` });
    }
  }

  const capCeilingPctOfFull = ctx.profile?.capacityCeiling ?? 100;
  const rawCap = 0.45 * next.loadTolerance + 0.25 * next.strength + 0.2 * next.motorControl + 0.1 * next.slingFunction;
  next.capacity = Math.min(capCeilingPctOfFull, clamp(rawCap));
  next.loadTolerance = Math.min(capCeilingPctOfFull, next.loadTolerance);

  const branchProgressionHold = ctx.branch.progressionHoldUntilWeek !== undefined && week < ctx.branch.progressionHoldUntilWeek;
  const holdMultiplier = branchProgressionHold ? 0 : 1;

  const gateRelax = ctx.profile?.gateRelaxation ?? 0;
  const passWalking = next.inflammation < (50 + gateRelax) && next.pain < (70 + gateRelax);
  const passStairs = passWalking && next.walking >= (55 - gateRelax) && next.pain < (60 + gateRelax);
  const passSquat = next.pain < (55 + gateRelax) && next.romPercent >= (65 - gateRelax) && next.healingProgress >= 20;
  const passRunning = next.pain < (40 + Math.max(0, gateRelax * 0.5)) && next.capacity >= (60 - gateRelax) && next.healingProgress >= 50 && next.romPercent >= (75 - gateRelax) && next.flareRisk < (45 + Math.max(0, gateRelax * 0.5)) && next.running >= 0;
  const passSport = passRunning && next.running >= (55 - gateRelax) && next.capacity >= (75 - gateRelax) && next.healingProgress >= 70 && next.flareRisk < (35 + Math.max(0, gateRelax * 0.5)) && next.reinjuryRisk < 40;

  const capRamp = ctx.profile?.capacityRampMult ?? 1;
  const romMult = ctx.profile?.romRecoveryMult ?? 1;
  const romCeil = ctx.profile?.romCeiling ?? 100;
  next.walking = clamp(next.walking + (passWalking ? 1.5 : -0.3) * holdMultiplier * capRamp);
  next.stairs = clamp(next.stairs + (passStairs ? 1.2 : -0.3) * holdMultiplier * capRamp);
  next.squat = clamp(next.squat + (passSquat ? 1.0 : -0.2) * holdMultiplier * capRamp);
  next.running = clamp(next.running + (passRunning ? 2.0 : (next.running > 5 ? -0.5 : 0)) * holdMultiplier * capRamp);
  next.sport = clamp(next.sport + (passSport ? 2.0 : (next.sport > 5 ? -0.6 : 0)) * holdMultiplier * capRamp);
  next.workCapacity = clamp(next.workCapacity + (next.pain < 55 ? 1.0 : -0.2) * holdMultiplier * capRamp);
  next.romPercent = Math.min(romCeil, clamp(next.romPercent + (next.inflammation < 60 ? 1.5 : 0.2) * holdMultiplier * romMult));
  next.strength = clamp(next.strength + 0.5 * holdMultiplier * capRamp);
  next.compensation = clamp(next.compensation - 0.5 * holdMultiplier);
  next.asymmetry = clamp(next.asymmetry - 0.4 * holdMultiplier);
  next.movementQuality = clamp(next.movementQuality + 0.6 * holdMultiplier);
  next.jointLoading = clamp(next.jointLoading - 0.5 * holdMultiplier);

  if (!passRunning && next.running > 60) {
    markers.push({ week, type: 'adherence_drop', label: `Running progression held: gates not met (pain ${next.pain.toFixed(0)}/cap ${next.capacity.toFixed(0)}/flare ${next.flareRisk.toFixed(0)})` });
  }
  if (!passSport && next.sport > 70) {
    markers.push({ week, type: 'adherence_drop', label: `Sport progression held: gates not met (cap ${next.capacity.toFixed(0)}/flare ${next.flareRisk.toFixed(0)})` });
  }
  if (branchProgressionHold) {
    markers.push({ week, type: 'load_change', label: `Progression hold (until w${ctx.branch.progressionHoldUntilWeek})` });
  }

  const flareFloor = ctx.profile?.flareRiskBase ?? 0;
  const reinjurySens = ctx.profile?.reinjurySensitivity ?? 1;
  next.reinjuryRisk = clamp((0.5 * next.flareRisk + 0.3 * (100 - next.capacity) + 0.2 * next.compensation - 5) * reinjurySens);
  next.flareRisk = Math.max(flareFloor, clamp(0.6 * next.irritability + 0.2 * (next.demand - next.capacity) + 0.2 * next.fearAvoidance));
  next.chronicityRisk = clamp(0.4 * next.fearAvoidance + 0.3 * next.pain + 0.3 * (100 - next.adherence));
  next.compensatoryInjuryRisk = clamp(0.5 * next.compensation + 0.3 * next.asymmetry + 0.2 * (100 - next.movementQuality));

  return { newState: next, markers, attribution };
}

export function simulateBranch(
  input: SimulationInput,
  branch: ScenarioBranch,
  baselineMode: BaselineMode = 'usual_care',
  initialOverride?: RecoveryState,
  customProfiles?: TreatmentEffectProfile[] | null,
  conditionContext?: ConditionContext,
): SimulationProjection {
  const states: RecoveryState[] = [];
  const allMarkers: InterventionMarker[] = [];
  const totalAttribution = new Map<string, number>();
  let state = initialOverride ? { ...initialOverride } : defaultInitialState(input, conditionContext);
  states.push({ ...state, week: 0 });

  const lookup = buildLookup(customProfiles);
  const profile = conditionContext ? tissueProfileForContext(conditionContext) : undefined;
  const ctx: SimContext = { branch, baselineMode, input, noiseSeed: 42, lookup, conditionContext, profile };

  for (let w = 1; w <= input.totalWeeks; w++) {
    const { newState, markers, attribution } = applyTreatmentEffects(state, ctx, w);
    state = newState;
    states.push({ ...state });
    allMarkers.push(...markers);
    attribution.forEach((v, k) => totalAttribution.set(k, (totalAttribution.get(k) ?? 0) + v));
  }

  const weeks = states.map(s => s.week);
  const arr = (sel: (s: RecoveryState) => number) => states.map(sel);

  const timelines: ParallelTimelines = {
    weeks,
    symptoms: { pain: arr(s => s.pain), stiffness: arr(s => s.stiffness), swelling: arr(s => s.swelling), irritability: arr(s => s.irritability) },
    tissue: { inflammation: arr(s => s.inflammation), healing: arr(s => s.healingProgress), loadTolerance: arr(s => s.loadTolerance), structural: arr(s => s.structuralIntegrity) },
    function: { walking: arr(s => s.walking), stairs: arr(s => s.stairs), squat: arr(s => s.squat), running: arr(s => s.running), sport: arr(s => s.sport), work: arr(s => s.workCapacity) },
    biomechanics: { jointLoading: arr(s => s.jointLoading), compensation: arr(s => s.compensation), movementQuality: arr(s => s.movementQuality), asymmetry: arr(s => s.asymmetry) },
    risk: { reinjury: arr(s => s.reinjuryRisk), flare: arr(s => s.flareRisk), chronicity: arr(s => s.chronicityRisk), compensatory: arr(s => s.compensatoryInjuryRisk) },
    capacity: arr(s => s.capacity),
    demand: arr(s => s.demand),
    feelsBetter: arr(s => 100 - s.pain),
    isBetter: arr(s => 0.5 * (100 - s.pain) + 0.5 * s.capacity),
    capacityRecovery: arr(s => s.capacity),
  };

  const expectedPain = arr(s => s.pain);
  const expectedFunction = arr(s => (s.walking + s.stairs + s.squat) / 3);
  const expectedCapacity = arr(s => s.capacity);
  const expectedRisk = arr(s => s.reinjuryRisk);

  const band = (expected: number[], betterDelta = 8, worseDelta = 12, flareDelta = 18): UncertaintyBand => ({
    best: expected.map(v => clamp(v - betterDelta)),
    expected,
    slower: expected.map(v => clamp(v + worseDelta * 0.5)),
    flareAdjusted: expected.map(v => clamp(v + flareDelta * 0.6)),
  });
  const bandUp = (expected: number[]): UncertaintyBand => ({
    best: expected.map(v => clamp(v + 8)),
    expected,
    slower: expected.map(v => clamp(v - 8)),
    flareAdjusted: expected.map(v => clamp(v - 14)),
  });

  const bands = {
    pain: band(expectedPain),
    function: bandUp(expectedFunction),
    capacity: bandUp(expectedCapacity),
    risk: band(expectedRisk),
  };

  const milestones: Milestone[] = [];
  const findFirstWeek = (predicate: (s: RecoveryState) => boolean): number | null => {
    const idx = states.findIndex(predicate);
    return idx === -1 ? null : states[idx].week;
  };
  const finalState = states[states.length - 1];
  const m = (id: string, label: string, gate: Milestone['gateType'], expectedWeek: number, predicate: (s: RecoveryState) => boolean, description: string) => {
    const w = findFirstWeek(predicate);
    milestones.push({ id, label, gateType: gate, expectedWeek, weekAchieved: w, achieved: w !== null, description });
  };
  m('pain_at_rest', 'Pain at rest < 3/10', 'pain', 3, s => s.pain < 30, 'Resting pain controlled enough to progress loading.');
  m('walking_normal', 'Normal walking tolerance', 'function', 4, s => s.walking >= 80, 'Symmetric pain-free gait achieved.');
  m('rom_full', 'Functional ROM restored', 'rom', 5, s => s.romPercent >= 85, 'Range of motion adequate for daily tasks.');
  m('squat_depth', 'Squat to functional depth', 'function', 6, s => s.squat >= 75, 'Lower-limb capacity supports squat.');
  m('stairs', 'Stairs without compensation', 'function', 5, s => s.stairs >= 80 && s.compensation < 25, 'Functional symmetry on stairs.');
  m('jogging', 'Jogging tolerance', 'capacity', 8, s => s.running >= 60 && s.flareRisk < 40, 'Single-leg capacity adequate for impact.');
  m('sport_drills', 'Sport-specific drills', 'sport', 10, s => s.sport >= 70 && s.flareRisk < 35, 'Capacity meets sport demand thresholds.');
  m('rts', 'Return to full sport', 'sport', 12, s => s.sport >= 85 && s.reinjuryRisk < 25, 'Reinjury risk acceptable, capacity > demand.');
  m('flare_clear', 'No flare > 24h for 2 weeks', 'flare', 4, s => s.flareRisk < 30, 'Tissue tolerance consolidated.');

  const totalAttribContribution = Array.from(totalAttribution.values()).reduce((a, b) => a + b, 0) || 1;
  const attribution: TreatmentAttribution[] = Array.from(totalAttribution.entries()).map(([id, v]) => ({
    treatmentId: id,
    name: lookup.get(id)?.name ?? id,
    contributionPercent: (v / totalAttribContribution) * 100,
    contributesTo: 'function' as const,
  })).sort((a, b) => b.contributionPercent - a.contributionPercent);

  return {
    branchId: branch.id,
    branchName: branch.name,
    color: branch.color,
    states,
    timelines,
    bands,
    milestones,
    interventionMarkers: allMarkers,
    attribution,
    totalWeeks: input.totalWeeks,
  };
}

export function simulateNaturalHistoryBaselines(input: SimulationInput, conditionContext?: ConditionContext): Record<BaselineMode, SimulationProjection> {
  const result = {} as Record<BaselineMode, SimulationProjection>;
  for (const mode of ['no_treatment', 'rest_only', 'usual_care', 'continued_aggravation'] as BaselineMode[]) {
    const branch: ScenarioBranch = {
      id: `baseline_${mode}`,
      name: mode.replace(/_/g, ' '),
      fromWeek: 0,
      interventions: mode === 'usual_care' ? [
        { id: 'uc1', treatmentId: 'education', startWeek: 0, doseMultiplier: 0.6, adherence: 0.7 },
        { id: 'uc2', treatmentId: 'electrophysical', startWeek: 0, doseMultiplier: 0.5, adherence: 0.6 },
      ] : [],
      flareEvents: mode === 'continued_aggravation'
        ? Array.from({ length: Math.floor(input.totalWeeks / 3) }, (_, i) => ({ week: 2 + i * 3, severity: 12, cause: 'Continued overload' }))
        : [],
      reaggravationEvents: [],
      loadAdjustments: [],
      color: mode === 'no_treatment' ? '#6b7280' : mode === 'rest_only' ? '#a78bfa' : mode === 'usual_care' ? '#94a3b8' : '#ef4444',
    };
    result[mode] = simulateBranch(input, branch, mode, undefined, null, conditionContext);
  }
  return result;
}

export function reversePlan(
  projection: SimulationProjection,
  goal: { name: string; weekTarget: number; minCapacity: number; minFunction: number; maxFlareRisk: number },
  conditionContext?: ConditionContext,
): ReversePlanResult {
  const { weekTarget, minCapacity, minFunction, maxFlareRisk } = goal;
  // tissueProfileForContext already folds in patient phase-timing and ROM-ceiling
  // multipliers, so we use the profile values directly here (no double application).
  const profile = conditionContext ? tissueProfileForContext(conditionContext) : null;
  const phaseScale = profile ? profile.phaseDurationMult : 1;
  // romCeiling is a percent (e.g., 70–100). Convert to a 0–1 ratio so milestone
  // capacity targets are nudged downward for stiffer/lower-ceiling tissues
  // rather than blown past the 100 clamp.
  const ceilingRatio = profile ? Math.max(0.5, Math.min(1.05, profile.romCeiling / 100)) : 1;
  const scaleWeek = (frac: number, min: number) => Math.max(min, Math.floor(weekTarget * frac * phaseScale));
  const scaleCap = (cap: number) => Math.max(10, Math.min(100, Math.round(cap * ceilingRatio)));
  const requiredMilestones: ReversePlanResult['required'] = [
    { milestone: 'Pain at rest < 3/10', deadlineWeek: scaleWeek(0.25, 1), capacityNeeded: scaleCap(30) },
    { milestone: 'Normal walking', deadlineWeek: scaleWeek(0.4, 2), capacityNeeded: scaleCap(50) },
    { milestone: 'Functional ROM', deadlineWeek: scaleWeek(0.5, 2), capacityNeeded: scaleCap(60) },
    { milestone: 'Jogging tolerance', deadlineWeek: scaleWeek(0.7, 3), capacityNeeded: scaleCap(70) },
    { milestone: 'Sport drills', deadlineWeek: scaleWeek(0.85, 4), capacityNeeded: scaleCap(80) },
    { milestone: goal.name, deadlineWeek: weekTarget, capacityNeeded: minCapacity },
  ];

  const stateAtTarget = projection.states[Math.min(weekTarget, projection.states.length - 1)];
  const functionAtTarget = (stateAtTarget.walking + stateAtTarget.stairs + stateAtTarget.squat) / 3;
  const onTrack = stateAtTarget.capacity >= minCapacity && functionAtTarget >= minFunction && stateAtTarget.flareRisk <= maxFlareRisk;
  const unsafe = stateAtTarget.flareRisk > maxFlareRisk + 20 || stateAtTarget.reinjuryRisk > 60;

  let gapWeeks = 0;
  for (let w = weekTarget; w < projection.states.length; w++) {
    const s = projection.states[w];
    const f = (s.walking + s.stairs + s.squat) / 3;
    if (s.capacity >= minCapacity && f >= minFunction && s.flareRisk <= maxFlareRisk) {
      gapWeeks = w - weekTarget;
      break;
    }
    gapWeeks = w - weekTarget + 1;
  }

  const status: ReversePlanResult['status'] = unsafe ? 'unsafe' : onTrack ? 'on_track' : 'behind';
  const narrative = onTrack
    ? `Plan tracks toward "${goal.name}" by week ${weekTarget}. Capacity ${stateAtTarget.capacity.toFixed(0)} ≥ required ${minCapacity}. Flare risk ${stateAtTarget.flareRisk.toFixed(0)} within tolerance.`
    : unsafe
      ? `Plan is UNSAFE for "${goal.name}" by week ${weekTarget}. Reinjury risk ${stateAtTarget.reinjuryRisk.toFixed(0)} and flare risk ${stateAtTarget.flareRisk.toFixed(0)} exceed safe thresholds. Delay target by ~${gapWeeks} weeks or reduce demand.`
      : `Plan is BEHIND target by ~${gapWeeks} weeks. Capacity ${stateAtTarget.capacity.toFixed(0)} vs required ${minCapacity}. Add load progression and motor control work to close the gap.`;

  return { targetGoal: goal.name, targetWeek: weekTarget, required: requiredMilestones, status, gapWeeks, narrative };
}

const CANDIDATE_TREATMENTS = ['rest_offload', 'manual_therapy', 'isometric_load', 'progressive_strength', 'motor_control', 'plyometric_rts', 'electrophysical', 'education', 'taping_bracing', 'graded_load'];

function scoreProjection(p: SimulationProjection, mode: GoalMode): number {
  const final = p.states[p.states.length - 1];
  const finalFunction = (final.walking + final.stairs + final.squat + final.running + final.sport) / 5;
  const weeksToPainRelief = p.milestones.find(m => m.id === 'pain_at_rest')?.weekAchieved ?? p.totalWeeks;
  const weeksToFunction = p.milestones.find(m => m.id === 'walking_normal')?.weekAchieved ?? p.totalWeeks;
  const weeksToRTS = p.milestones.find(m => m.id === 'rts')?.weekAchieved ?? p.totalWeeks * 1.5;
  const avgFlare = p.timelines.risk.flare.reduce((a, b) => a + b, 0) / p.timelines.risk.flare.length;

  switch (mode) {
    case 'fastest_relief': return -weeksToPainRelief * 4 + (100 - final.pain) * 0.5;
    case 'fastest_function': return -weeksToFunction * 4 + finalFunction * 0.5;
    case 'fastest_rts': return -weeksToRTS * 3 + final.sport * 0.4;
    case 'lowest_flare': return -avgFlare * 2 + (100 - final.flareRisk);
    case 'strongest_resilience': return final.capacity * 0.6 + final.structuralIntegrity * 0.3 - final.reinjuryRisk * 0.4;
    case 'realistic_adherence': return final.adherence * 0.4 + finalFunction * 0.4 - avgFlare * 0.5;
  }
}

export function optimizeSequence(
  input: SimulationInput,
  baselineProjection: SimulationProjection,
  mode: GoalMode,
  customProfiles?: TreatmentEffectProfile[] | null,
  conditionContext?: ConditionContext,
  currentWeek: number = 0,
): OptimizerResult {
  const lookup = buildLookup(customProfiles);
  const sequence: { week: number; action: string; rationale: string }[] = [];
  const phases: { startWeek: number; endWeek: number; preferred: string[]; rationale: string; label: string }[] = [
    { startWeek: 0, endWeek: 2, preferred: ['rest_offload', 'education', 'electrophysical', 'taping_bracing'], rationale: 'Acute / inflammatory: settle symptoms, control load.', label: 'Acute / inflammatory' },
    { startWeek: 2, endWeek: 5, preferred: ['isometric_load', 'manual_therapy', 'motor_control', 'education'], rationale: 'Subacute / proliferative: restore tolerance and ROM.', label: 'Subacute / proliferative' },
    { startWeek: 5, endWeek: 9, preferred: ['progressive_strength', 'graded_load', 'motor_control'], rationale: 'Remodeling: build capacity and tissue strength.', label: 'Remodeling' },
    { startWeek: 9, endWeek: input.totalWeeks, preferred: ['plyometric_rts', 'progressive_strength', 'graded_load'], rationale: 'Maturation: sport-specific load and reactive capacity.', label: 'Maturation / return-to-sport' },
  ];

  if (mode === 'lowest_flare') {
    phases.forEach(p => p.preferred = p.preferred.filter(t => !['plyometric_rts'].includes(t) || p.startWeek >= 10));
  }
  if (mode === 'realistic_adherence') {
    phases.forEach(p => { if (!p.preferred.includes('education')) p.preferred.push('education'); });
  }

  const interventions: Intervention[] = [];
  let id = 0;
  for (const phase of phases) {
    if (phase.startWeek >= input.totalWeeks) continue;
    for (const tid of phase.preferred) {
      const tr = lookup.get(tid);
      if (!tr) continue;
      interventions.push({
        id: `opt_${id++}`,
        treatmentId: tid,
        startWeek: phase.startWeek,
        endWeek: Math.min(phase.endWeek, input.totalWeeks),
        doseMultiplier: mode === 'fastest_rts' ? 1.2 : 1.0,
        adherence: input.patientAdherence,
      });
      sequence.push({ week: phase.startWeek, action: `Introduce ${tr.name}`, rationale: phase.rationale });
    }
  }

  const optimizedBranch: ScenarioBranch = {
    id: `optimizer_${mode}`,
    name: `Optimized (${mode.replace(/_/g, ' ')})`,
    fromWeek: 0,
    interventions,
    flareEvents: [],
    reaggravationEvents: [],
    loadAdjustments: [],
    color: '#22c55e',
  };
  const optimizedProj = simulateBranch(input, optimizedBranch, 'usual_care', undefined, customProfiles, conditionContext);
  const optScore = scoreProjection(optimizedProj, mode);
  const baseScore = scoreProjection(baselineProjection, mode);

  const clampedWeek = Math.max(0, Math.min(currentWeek, input.totalWeeks));
  const currentPhase =
    phases.find(p => clampedWeek >= p.startWeek && clampedWeek < p.endWeek) ??
    [...phases].reverse().find(p => clampedWeek >= p.startWeek) ??
    phases[phases.length - 1];

  const stateIdx = Math.min(clampedWeek, baselineProjection.states.length - 1);
  const projectedState = baselineProjection.states[stateIdx];
  const projectedLoadTol =
    baselineProjection.timelines.tissue.loadTolerance[
      Math.min(clampedWeek, baselineProjection.timelines.tissue.loadTolerance.length - 1)
    ] ?? projectedState?.loadTolerance ?? 0;

  // Safety gates: block plyometric/RTS work until load tolerance is sufficient
  // and irritability has settled. If gated, fall back to the next preferred
  // treatment in the current phase.
  const isGatedPlyometric = (tid: string) =>
    tid === 'plyometric_rts' && (projectedLoadTol < 65 || (projectedState?.irritability ?? 100) > 45);

  const safePreferred = currentPhase.preferred.filter(tid => !isGatedPlyometric(tid));
  const bestNextActionId = safePreferred[0] ?? currentPhase.preferred[0] ?? 'education';
  const nextLabel = lookup.get(bestNextActionId)?.name ?? bestNextActionId;
  const altId = safePreferred[1] ?? currentPhase.preferred.find(t => t !== bestNextActionId);
  const altLabel = altId ? (lookup.get(altId)?.name ?? altId) : undefined;

  const gateNote =
    currentPhase.preferred.includes('plyometric_rts') && bestNextActionId !== 'plyometric_rts'
      ? ` Plyometric / return-to-sport work is held back at week ${clampedWeek} (load tolerance ${projectedLoadTol.toFixed(0)}, irritability ${(projectedState?.irritability ?? 0).toFixed(0)}) until capacity gates pass.`
      : '';

  const bestNextRationale = `Week ${clampedWeek} · ${currentPhase.label}: ${currentPhase.rationale}${gateNote}`;

  const capStr = projectedState ? projectedState.capacity.toFixed(0) : '—';
  const irrStr = projectedState ? projectedState.irritability.toFixed(0) : '—';
  const tolStr = projectedLoadTol.toFixed(0);

  const narrative = `Under "${mode.replace(/_/g, ' ')}", the optimized sequence improves outcome score by ${(optScore - baseScore).toFixed(1)} pts vs baseline. At week ${clampedWeek} the patient is in the ${currentPhase.label.toLowerCase()} phase (capacity ${capStr}, irritability ${irrStr}, load tolerance ${tolStr}). Best next action: ${nextLabel}.${gateNote} The plan progresses through inflammatory → proliferative → remodeling → maturation, holding back high-load reactive work until capacity gates pass.`;

  return {
    mode,
    bestNextAction: nextLabel,
    bestNextActionId,
    bestNextRationale,
    currentPhaseLabel: currentPhase.label,
    alternativeAction: altId && altLabel ? { action: `Introduce ${altLabel}`, actionId: altId, rationale: currentPhase.rationale } : undefined,
    recommendedSequence: sequence,
    expectedScore: optScore,
    comparisonScore: baseScore,
    narrative,
    optimizedInterventions: interventions,
    optimizedBranchTemplate: optimizedBranch,
  };
}

export function generateNarrative(active: SimulationProjection, baseline: SimulationProjection): string {
  const final = active.states[active.states.length - 1];
  const baseFinal = baseline.states[baseline.states.length - 1];
  const painRelief = active.milestones.find(m => m.id === 'pain_at_rest');
  const funcMile = active.milestones.find(m => m.id === 'walking_normal');
  const sportMile = active.milestones.find(m => m.id === 'sport_drills');

  const lines: string[] = [];
  lines.push(`Expected trajectory: moderate recovery over ${active.totalWeeks - 2}–${active.totalWeeks + 2} weeks (uncertainty band).`);
  if (painRelief?.achieved) {
    lines.push(`Pain may reduce within ${painRelief.weekAchieved} week(s), but tissue load tolerance is likely to lag — capacity reaches ${final.capacity.toFixed(0)} vs symptoms at ${(100 - final.pain).toFixed(0)}.`);
  } else {
    lines.push(`Pain reduction is slower than typical; symptom relief may not stabilize within the modeled window.`);
  }
  if (funcMile?.achieved) lines.push(`Functional recovery (walking, stairs) by week ~${funcMile.weekAchieved}.`);
  if (sportMile?.achieved) lines.push(`Sport-specific drills feasible by week ~${sportMile.weekAchieved}, contingent on flare risk staying < 35.`);
  lines.push(`Versus baseline (${baseline.branchName}): pain ${(baseFinal.pain - final.pain).toFixed(0)} pts lower, capacity ${(final.capacity - baseFinal.capacity).toFixed(0)} pts higher.`);
  if (final.flareRisk > 40) lines.push(`Risk warning: flare risk remains elevated (${final.flareRisk.toFixed(0)}). Pace progressions and reinforce sleep + adherence.`);
  if (final.chronicityRisk > 50) lines.push(`Chronicity risk is meaningful (${final.chronicityRisk.toFixed(0)}). Education and graded exposure should remain in the plan.`);
  return lines.join(' ');
}

export function defaultBranch(input: SimulationInput): ScenarioBranch {
  return {
    id: 'plan_active',
    name: 'Active Plan',
    fromWeek: 0,
    interventions: [
      { id: 'p1', treatmentId: 'education', startWeek: 0, doseMultiplier: 1, adherence: input.patientAdherence },
      { id: 'p2', treatmentId: 'isometric_load', startWeek: 1, endWeek: 4, doseMultiplier: 1, adherence: input.patientAdherence },
      { id: 'p3', treatmentId: 'manual_therapy', startWeek: 1, endWeek: 5, doseMultiplier: 1, adherence: input.patientAdherence },
      { id: 'p4', treatmentId: 'motor_control', startWeek: 2, endWeek: 8, doseMultiplier: 1, adherence: input.patientAdherence },
      { id: 'p5', treatmentId: 'progressive_strength', startWeek: 3, endWeek: input.totalWeeks, doseMultiplier: 1, adherence: input.patientAdherence },
      { id: 'p6', treatmentId: 'graded_load', startWeek: 4, endWeek: input.totalWeeks, doseMultiplier: 1, adherence: input.patientAdherence },
    ],
    flareEvents: [],
    reaggravationEvents: [],
    loadAdjustments: [],
    color: '#06b6d4',
  };
}

export function defaultInput(): SimulationInput {
  return {
    totalWeeks: 12,
    conditionSeverity: 50,
    irritability: 45,
    acuity: 'subacute',
    workDemand: 50,
    sportDemand: 60,
    patientAdherence: 0.8,
  };
}
