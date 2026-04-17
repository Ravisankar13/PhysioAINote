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
}

export interface Intervention {
  id: string;
  treatmentId: string;
  startWeek: number;
  endWeek?: number;
  doseMultiplier: number;
  adherence: number;
  label?: string;
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
  },
];

export const TREATMENT_BY_ID = new Map(TREATMENT_LIBRARY.map(t => [t.id, t]));

function defaultInitialState(input: SimulationInput): RecoveryState {
  const sev = input.conditionSeverity;
  const irr = input.irritability;
  const acuityFactor = input.acuity === 'acute' ? 1 : input.acuity === 'subacute' ? 0.7 : 0.5;
  return {
    week: 0,
    pain: clamp(50 + sev * 0.4),
    stiffness: clamp(40 + sev * 0.3),
    swelling: clamp(input.acuity === 'acute' ? 50 : 20),
    irritability: irr,
    inflammation: clamp(input.acuity === 'acute' ? 65 : 25),
    healingPhase: input.acuity === 'acute' ? 'inflammatory' : input.acuity === 'subacute' ? 'proliferative' : 'remodeling',
    healingProgress: input.acuity === 'acute' ? 5 : input.acuity === 'subacute' ? 30 : 60,
    loadTolerance: clamp(50 - sev * 0.4),
    structuralIntegrity: clamp(80 - sev * 0.3),
    walking: clamp(70 - sev * 0.3),
    stairs: clamp(60 - sev * 0.4),
    squat: clamp(50 - sev * 0.45),
    running: clamp(30 - sev * 0.3),
    sport: clamp(15 - sev * 0.15),
    workCapacity: clamp(60 - sev * 0.3),
    jointLoading: clamp(50 + sev * 0.3),
    compensation: clamp(30 + sev * 0.3),
    movementQuality: clamp(70 - sev * 0.3),
    asymmetry: clamp(20 + sev * 0.3),
    reinjuryRisk: clamp(30 + sev * 0.3 * acuityFactor),
    flareRisk: clamp(40 + irr * 0.3),
    chronicityRisk: clamp(input.acuity === 'chronic' ? 60 : 25),
    compensatoryInjuryRisk: clamp(20 + sev * 0.2),
    romPercent: clamp(70 - sev * 0.3),
    strength: clamp(60 - sev * 0.3),
    motorControl: clamp(60 - sev * 0.3),
    neuralSensitivity: clamp(40 + irr * 0.3),
    fearAvoidance: clamp(30 + irr * 0.3),
    sleep: 65,
    adherence: input.patientAdherence,
    slingFunction: clamp(60 - sev * 0.3),
    capacity: clamp(45 - sev * 0.3),
    demand: clamp((input.workDemand + input.sportDemand) / 2),
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

function naturalProgressionRate(mode: BaselineMode, state: RecoveryState): number {
  const base =
    mode === 'no_treatment' ? 1.5 :
    mode === 'rest_only' ? 2.5 :
    mode === 'usual_care' ? 3.5 :
    -2;
  const irrPenalty = state.irritability > 60 ? -0.5 : 0;
  const sleepBoost = state.sleep > 70 ? 0.3 : -0.2;
  return base + irrPenalty + sleepBoost;
}

interface SimContext {
  branch: ScenarioBranch;
  baselineMode: BaselineMode;
  input: SimulationInput;
  noiseSeed: number;
}

function applyTreatmentEffects(
  state: RecoveryState,
  ctx: SimContext,
  week: number,
): { newState: RecoveryState; markers: InterventionMarker[]; attribution: Map<string, number> } {
  const next: RecoveryState = { ...state, week };
  const markers: InterventionMarker[] = [];
  const attribution = new Map<string, number>();

  const naturalRate = naturalProgressionRate(ctx.baselineMode, state);
  const phaseUpdate = advanceHealingPhase(state, naturalRate * 1.2);
  next.healingPhase = phaseUpdate.phase;
  next.healingProgress = phaseUpdate.progress;

  next.inflammation = clamp(next.inflammation - (ctx.baselineMode === 'continued_aggravation' ? -3 : 2.5));
  next.swelling = clamp(next.swelling - (ctx.baselineMode === 'continued_aggravation' ? -2 : 2));
  next.pain = clamp(next.pain - (ctx.baselineMode === 'continued_aggravation' ? -2 : 1));
  next.irritability = clamp(next.irritability - 0.5);

  for (const intv of ctx.branch.interventions) {
    if (week < intv.startWeek) continue;
    const ended = intv.endWeek !== undefined && week >= intv.endWeek;
    const weeksActive = ended ? (intv.endWeek! - intv.startWeek) : (week - intv.startWeek);
    const weeksSinceStop = ended ? week - intv.endWeek! : null;
    const treatment = TREATMENT_BY_ID.get(intv.treatmentId);
    if (!treatment) continue;

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

    let totalScale = ramp * phaseMul * dose;
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
      markers.push({ week, type: 'introduce', label: gateBlocked ? `${treatment.name} (gated)` : treatment.name, treatmentId: treatment.id });
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

  next.capacity = clamp(0.45 * next.loadTolerance + 0.25 * next.strength + 0.2 * next.motorControl + 0.1 * next.slingFunction);

  const branchProgressionHold = ctx.branch.progressionHoldUntilWeek !== undefined && week < ctx.branch.progressionHoldUntilWeek;
  const holdMultiplier = branchProgressionHold ? 0 : 1;

  const passWalking = next.inflammation < 50 && next.pain < 70;
  const passStairs = passWalking && next.walking >= 55 && next.pain < 60;
  const passSquat = next.pain < 55 && next.romPercent >= 65 && next.healingProgress >= 20;
  const passRunning = next.pain < 40 && next.capacity >= 60 && next.healingProgress >= 50 && next.romPercent >= 75 && next.flareRisk < 45 && next.running >= 0;
  const passSport = passRunning && next.running >= 55 && next.capacity >= 75 && next.healingProgress >= 70 && next.flareRisk < 35 && next.reinjuryRisk < 40;

  next.walking = clamp(next.walking + (passWalking ? 1.5 : -0.3) * holdMultiplier);
  next.stairs = clamp(next.stairs + (passStairs ? 1.2 : -0.3) * holdMultiplier);
  next.squat = clamp(next.squat + (passSquat ? 1.0 : -0.2) * holdMultiplier);
  next.running = clamp(next.running + (passRunning ? 2.0 : (next.running > 5 ? -0.5 : 0)) * holdMultiplier);
  next.sport = clamp(next.sport + (passSport ? 2.0 : (next.sport > 5 ? -0.6 : 0)) * holdMultiplier);
  next.workCapacity = clamp(next.workCapacity + (next.pain < 55 ? 1.0 : -0.2) * holdMultiplier);
  next.romPercent = clamp(next.romPercent + (next.inflammation < 60 ? 1.5 : 0.2) * holdMultiplier);
  next.strength = clamp(next.strength + 0.5 * holdMultiplier);
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

  next.reinjuryRisk = clamp(0.5 * next.flareRisk + 0.3 * (100 - next.capacity) + 0.2 * next.compensation - 5);
  next.flareRisk = clamp(0.6 * next.irritability + 0.2 * (next.demand - next.capacity) + 0.2 * next.fearAvoidance);
  next.chronicityRisk = clamp(0.4 * next.fearAvoidance + 0.3 * next.pain + 0.3 * (100 - next.adherence));
  next.compensatoryInjuryRisk = clamp(0.5 * next.compensation + 0.3 * next.asymmetry + 0.2 * (100 - next.movementQuality));

  return { newState: next, markers, attribution };
}

export function simulateBranch(
  input: SimulationInput,
  branch: ScenarioBranch,
  baselineMode: BaselineMode = 'usual_care',
  initialOverride?: RecoveryState,
): SimulationProjection {
  const states: RecoveryState[] = [];
  const allMarkers: InterventionMarker[] = [];
  const totalAttribution = new Map<string, number>();
  let state = initialOverride ? { ...initialOverride } : defaultInitialState(input);
  states.push({ ...state, week: 0 });

  const ctx: SimContext = { branch, baselineMode, input, noiseSeed: 42 };

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
    name: TREATMENT_BY_ID.get(id)?.name ?? id,
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

export function simulateNaturalHistoryBaselines(input: SimulationInput): Record<BaselineMode, SimulationProjection> {
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
    result[mode] = simulateBranch(input, branch, mode);
  }
  return result;
}

export function reversePlan(
  projection: SimulationProjection,
  goal: { name: string; weekTarget: number; minCapacity: number; minFunction: number; maxFlareRisk: number },
): ReversePlanResult {
  const { weekTarget, minCapacity, minFunction, maxFlareRisk } = goal;
  const requiredMilestones: ReversePlanResult['required'] = [
    { milestone: 'Pain at rest < 3/10', deadlineWeek: Math.max(1, Math.floor(weekTarget * 0.25)), capacityNeeded: 30 },
    { milestone: 'Normal walking', deadlineWeek: Math.max(2, Math.floor(weekTarget * 0.4)), capacityNeeded: 50 },
    { milestone: 'Functional ROM', deadlineWeek: Math.max(2, Math.floor(weekTarget * 0.5)), capacityNeeded: 60 },
    { milestone: 'Jogging tolerance', deadlineWeek: Math.max(3, Math.floor(weekTarget * 0.7)), capacityNeeded: 70 },
    { milestone: 'Sport drills', deadlineWeek: Math.max(4, Math.floor(weekTarget * 0.85)), capacityNeeded: 80 },
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
): OptimizerResult {
  const sequence: { week: number; action: string; rationale: string }[] = [];
  const phases: { startWeek: number; endWeek: number; preferred: string[]; rationale: string }[] = [
    { startWeek: 0, endWeek: 2, preferred: ['rest_offload', 'education', 'electrophysical', 'taping_bracing'], rationale: 'Acute / inflammatory: settle symptoms, control load.' },
    { startWeek: 2, endWeek: 5, preferred: ['isometric_load', 'manual_therapy', 'motor_control', 'education'], rationale: 'Subacute / proliferative: restore tolerance and ROM.' },
    { startWeek: 5, endWeek: 9, preferred: ['progressive_strength', 'graded_load', 'motor_control'], rationale: 'Remodeling: build capacity and tissue strength.' },
    { startWeek: 9, endWeek: input.totalWeeks, preferred: ['plyometric_rts', 'progressive_strength', 'graded_load'], rationale: 'Maturation: sport-specific load and reactive capacity.' },
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
      const tr = TREATMENT_BY_ID.get(tid);
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
  const optimizedProj = simulateBranch(input, optimizedBranch);
  const optScore = scoreProjection(optimizedProj, mode);
  const baseScore = scoreProjection(baselineProjection, mode);

  const bestNextAction = phases.find(p => p.startWeek <= 0 && p.endWeek > 0)?.preferred[0] ?? 'education';
  const nextLabel = TREATMENT_BY_ID.get(bestNextAction)?.name ?? bestNextAction;

  const narrative = `Under "${mode.replace(/_/g, ' ')}", the optimized sequence improves outcome score by ${(optScore - baseScore).toFixed(1)} pts vs baseline. Best next action: ${nextLabel}. The plan progresses through inflammatory → proliferative → remodeling → maturation, holding back high-load reactive work until capacity gates pass.`;

  return { mode, bestNextAction: nextLabel, recommendedSequence: sequence, expectedScore: optScore, comparisonScore: baseScore, narrative, optimizedInterventions: interventions, optimizedBranchTemplate: optimizedBranch };
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
