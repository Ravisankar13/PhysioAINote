/**
 * Natural Recovery Driver Model (Task #189)
 *
 * Replaces the natural-history baseline curve in the Recovery Simulation
 * panel with a clinically honest model driven by four explicit state
 * variables (irritability, load-vs-capacity, tissue capacity, sensitivity)
 * and modulated by skeleton-derived structural biases plus an
 * offload-ability score. The curve resolves into one of three scenarios:
 *
 *   A — Near-full recovery
 *   B — Plateau / flare cycles
 *   C — Chronic / non-resolving
 *
 * Treatment-pathway curves continue to use the existing engine. Only the
 * passive "what happens if we do nothing" baseline is produced here.
 */

import type {
  AINaturalTimeline,
  ConditionContext,
  ConditionTissue,
  HealingPhase,
  JointLoadVector,
  ParallelTimelines,
  RecoveryState,
  SimulationInput,
  SimulationProjection,
} from './recoverySimulationEngine';

// ---------------------------------------------------------------------------
// Skeleton input shape — accepts a partial ModelConfig + optional derived
// signals so the driver model is decoupled from the 3D viewer module.
// ---------------------------------------------------------------------------

export interface SkeletonBiasInputs {
  spine?: {
    lordosis?: number;
    kyphosis?: number;
    scoliosis?: number;
    forwardHead?: number;
    cervicalFlexion?: number;
  };
  pelvis?: {
    tilt?: number;
    obliquity?: number;
    rotation?: number;
  };
  leftHip?: { flexion?: number; internalRotation?: number; anteversion?: number };
  rightHip?: { flexion?: number; internalRotation?: number; anteversion?: number };
  leftKnee?: { valgus?: number; recurvatum?: number };
  rightKnee?: { valgus?: number; recurvatum?: number };
  leftAnkle?: { dorsiflexion?: number; eversion?: number; archHeight?: number };
  rightAnkle?: { dorsiflexion?: number; eversion?: number; archHeight?: number };
  leftShoulder?: { flexion?: number; abduction?: number };
  rightShoulder?: { flexion?: number; abduction?: number };
  /** Derived signals collected elsewhere — all optional. */
  compensationCount?: number;
  jointForceOverloadCount?: number;
  romDeficitPercent?: number;
  /** Task #239 — full per-joint load vectors. When provided, the
   *  compensation_burden bias is computed from the actual load mix
   *  (compression / shear / tension × magnitude) instead of the
   *  legacy `jointForceOverloadCount` count. Two skeletons with the
   *  same overload COUNT but different load DIRECTIONS therefore
   *  produce different bias magnitudes (and different downstream
   *  recovery curves). When absent, falls back to the count path. */
  jointLoadVectors?: JointLoadVector[];
}

// ---------------------------------------------------------------------------
// Bias model
// ---------------------------------------------------------------------------

export type BiasId =
  | 'extension_compression'
  | 'flexion_loading'
  | 'valgus_pronation'
  | 'neural_tension'
  | 'tunnel_compression'
  | 'compensation_burden';

export interface StructuralBias {
  id: BiasId;
  label: string;
  /** 0–100 magnitude; 0 = absent, 100 = severe. */
  magnitude: number;
  /** Plain-language description of which skeleton signals fired this bias. */
  explanation: string;
  /** Tissue families for which this bias is clinically relevant. */
  relevantTissues: ConditionTissue[];
}

export type TissueFamily = 'tendon' | 'muscle' | 'nerve' | 'disc' | 'joint' | 'other';

export function tissueFamilyFor(ctx?: ConditionContext | null): TissueFamily {
  if (!ctx) return 'other';
  switch (ctx.primaryTissue) {
    case 'tendon': return 'tendon';
    case 'muscle': return 'muscle';
    case 'nerve': return 'nerve';
    case 'disc': return 'disc';
    case 'joint':
    case 'ligament':
    case 'bone':
    case 'fascia':
      return 'joint';
    default:
      return 'other';
  }
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const abs = Math.abs;

function pushBias(
  list: StructuralBias[],
  id: BiasId,
  label: string,
  magnitude: number,
  explanation: string,
  relevantTissues: ConditionTissue[],
) {
  const m = clamp(magnitude);
  if (m < 5) return;
  list.push({ id, label, magnitude: m, explanation, relevantTissues });
}

/** Build the full structural-bias list from the live skeleton snapshot
 *  + condition context. Each bias carries the human-readable signals
 *  that fired it so the UI can show "why". */
export function computeStructuralBiases(
  ctx?: ConditionContext | null,
  skel?: SkeletonBiasInputs | null,
): StructuralBias[] {
  const out: StructuralBias[] = [];
  const s = skel ?? {};

  // -- Extension / compression bias --------------------------------------
  // Driven by lordosis and pelvic anterior tilt; loads posterior elements,
  // disc annulus posteriorly, and narrows neuroforamina.
  const lordosis = abs(s.spine?.lordosis ?? 0);
  const pelvicTilt = s.pelvis?.tilt ?? 0; // + anterior
  const extScore = clamp(
    Math.max(0, lordosis - 30) * 1.4 + Math.max(0, pelvicTilt) * 1.6,
  );
  if (extScore >= 5) {
    const sigs: string[] = [];
    if (lordosis > 30) sigs.push(`lumbar lordosis ${lordosis.toFixed(0)}°`);
    if (pelvicTilt > 5) sigs.push(`anterior pelvic tilt ${pelvicTilt.toFixed(0)}°`);
    pushBias(out, 'extension_compression', 'Extension / compression load',
      extScore,
      sigs.length ? sigs.join(' • ') : 'mild postural extension bias',
      ['disc', 'joint', 'nerve']);
  }

  // -- Flexion loading bias ---------------------------------------------
  // Thoracic kyphosis + forward head + posterior pelvic tilt — flexes the
  // spine, increases anterior disc compression, loads posterior tissues.
  const kyphosis = abs(s.spine?.kyphosis ?? 0);
  const fwdHead = abs(s.spine?.forwardHead ?? 0);
  const posteriorTilt = Math.max(0, -pelvicTilt);
  const flexScore = clamp(
    Math.max(0, kyphosis - 35) * 1.2 + fwdHead * 1.0 + posteriorTilt * 1.2,
  );
  if (flexScore >= 5) {
    const sigs: string[] = [];
    if (kyphosis > 35) sigs.push(`thoracic kyphosis ${kyphosis.toFixed(0)}°`);
    if (fwdHead > 3) sigs.push(`forward head ${fwdHead.toFixed(0)}°`);
    if (posteriorTilt > 5) sigs.push(`posterior pelvic tilt ${posteriorTilt.toFixed(0)}°`);
    pushBias(out, 'flexion_loading', 'Flexion loading bias',
      flexScore,
      sigs.length ? sigs.join(' • ') : 'mild postural flexion bias',
      ['disc', 'tendon', 'joint']);
  }

  // -- Valgus / pronation chain ------------------------------------------
  const valgL = abs(s.leftKnee?.valgus ?? 0);
  const valgR = abs(s.rightKnee?.valgus ?? 0);
  const pronL = Math.max(0, s.leftAnkle?.eversion ?? 0);
  const pronR = Math.max(0, s.rightAnkle?.eversion ?? 0);
  const archL = Math.max(0, -(s.leftAnkle?.archHeight ?? 0));
  const archR = Math.max(0, -(s.rightAnkle?.archHeight ?? 0));
  const valgScore = clamp((Math.max(valgL, valgR)) * 4 + Math.max(pronL, pronR) * 3 + Math.max(archL, archR) * 2);
  if (valgScore >= 5) {
    const sigs: string[] = [];
    const v = Math.max(valgL, valgR);
    const p = Math.max(pronL, pronR);
    if (v > 2) sigs.push(`knee valgus ${v.toFixed(0)}°`);
    if (p > 2) sigs.push(`foot pronation ${p.toFixed(0)}°`);
    pushBias(out, 'valgus_pronation', 'Valgus / pronation chain',
      valgScore,
      sigs.length ? sigs.join(' • ') : 'mild lower-limb alignment fault',
      ['tendon', 'joint', 'muscle']);
  }

  // -- Neural tension bias -----------------------------------------------
  // Driven by nerve-root involvement, neuropathic pain mechanism, or a
  // forward-head + thoracic-kyphosis combo (cervical traction).
  let neural = 0;
  const nSigs: string[] = [];
  if (ctx?.hasNerveRoot) { neural += 50; nSigs.push('nerve-root involvement'); }
  if (ctx?.painMechanism === 'neuropathic') { neural += 30; nSigs.push('neuropathic pain mechanism'); }
  if (ctx?.painMechanism === 'central') { neural += 15; nSigs.push('central sensitization'); }
  if (fwdHead > 5 && kyphosis > 35) { neural += 15; nSigs.push('upper-quarter neural tension posture'); }
  if (neural >= 5) {
    pushBias(out, 'neural_tension', 'Neural tension bias',
      neural,
      nSigs.join(' • '),
      ['nerve', 'disc']);
  }

  // -- Tunnel compression bias -------------------------------------------
  // Stenosis-like or anatomic narrowing — extension load + nerve tissue +
  // declared archetype.
  let tunnel = 0;
  const tSigs: string[] = [];
  const archetype = ctx?.archetypeId;
  if (archetype && /stenosis|radicular|disc|myelopath/i.test(archetype)) {
    tunnel += 35; tSigs.push('canal/foramen narrowing condition');
  }
  if (extScore > 25 && (ctx?.primaryTissue === 'nerve' || ctx?.hasNerveRoot)) {
    tunnel += 25; tSigs.push('extension load on neural structures');
  }
  if ((ctx?.scarLoad ?? 0) > 30) {
    tunnel += 15; tSigs.push(`adhesive load ${ctx!.scarLoad.toFixed(0)}`);
  }
  if (tunnel >= 5) {
    pushBias(out, 'tunnel_compression', 'Tunnel / foraminal compression',
      tunnel,
      tSigs.join(' • '),
      ['nerve']);
  }

  // -- Compensation burden ----------------------------------------------
  // Task #239 — when joint load vectors are available we replace the
  // count-based `overload * 6` term with a direction-aware sum:
  //   load = Σ ( shear × 1.5 + compression × 1.0 + tension × 0.8 ) × 2.5
  // The component weights reflect tissue tolerance (shear is the most
  // injurious component for cartilage/labrum/disc, tension the least);
  // the ×2.5 calibration keeps the typical-case magnitude inside the
  // same ~5–30 band the legacy `count * 6` produced (so the rest of the
  // tuned curves are preserved). When vectors are absent we fall back
  // to the legacy count path verbatim.
  let comp = 0;
  const cSigs: string[] = [];
  const compCount = s.compensationCount ?? 0;
  const sling = ctx?.slingWeakLinkSeverity ?? 0;
  const obliquity = abs(s.pelvis?.obliquity ?? 0);
  if (compCount > 0) { comp += compCount * 8; cSigs.push(`${compCount} compensation pattern${compCount > 1 ? 's' : ''}`); }
  if (sling > 20) { comp += sling * 0.5; cSigs.push(`sling weak-link ${sling.toFixed(0)}`); }

  const vectors = s.jointLoadVectors;
  if (vectors && vectors.length > 0) {
    let vectorLoad = 0;
    for (const v of vectors) {
      vectorLoad += v.components.shear * 1.5
                  + v.components.compression * 1.0
                  + v.components.tension * 0.8;
    }
    vectorLoad *= 2.5; // calibration: ~equal to legacy count*6 at typical magnitudes
    if (vectorLoad >= 1) {
      comp += vectorLoad;
      // Surface up to two dominant vectors as human-readable signals so
      // the bias card explains *why* the same overload count produces
      // different bias magnitudes for two different skeletons.
      const top = vectors.slice(0, 2).map(v =>
        `${v.label} ${v.dominantComponent} ${v.magnitudeBW.toFixed(1)}×BW`
      );
      cSigs.push(`${vectors.length} loaded joint${vectors.length > 1 ? 's' : ''} (${top.join(', ')})`);
    }
  } else {
    const overload = s.jointForceOverloadCount ?? 0;
    if (overload > 0) { comp += overload * 6; cSigs.push(`${overload} overloaded joint${overload > 1 ? 's' : ''}`); }
  }

  if (obliquity > 4) { comp += obliquity * 1.5; cSigs.push(`pelvic obliquity ${obliquity.toFixed(0)}°`); }
  if (comp >= 5) {
    pushBias(out, 'compensation_burden', 'Compensation burden',
      comp,
      cSigs.length ? cSigs.join(' • ') : 'asymmetric loading detected',
      ['muscle', 'tendon', 'joint']);
  }

  return out;
}

/** Per-tissue-family weight assigned to each bias. Biases not relevant to
 *  the active diagnosis still appear in the panel but contribute 0 to the
 *  driver penalty (so the UI can show them de-emphasised). */
const TISSUE_BIAS_WEIGHTS: Record<TissueFamily, Partial<Record<BiasId, number>>> = {
  tendon: { valgus_pronation: 0.9, compensation_burden: 0.7, flexion_loading: 0.4 },
  muscle: { compensation_burden: 0.9, valgus_pronation: 0.5 },
  nerve:  { neural_tension: 1.0, tunnel_compression: 0.9, extension_compression: 0.7, flexion_loading: 0.4 },
  disc:   { extension_compression: 0.9, flexion_loading: 0.9, neural_tension: 0.5 },
  joint:  { extension_compression: 0.7, flexion_loading: 0.6, valgus_pronation: 0.7, compensation_burden: 0.6 },
  other:  { compensation_burden: 0.4 },
};

export function relevantBiasWeight(family: TissueFamily, id: BiasId): number {
  return TISSUE_BIAS_WEIGHTS[family]?.[id] ?? 0;
}

/** Aggregate bias load (0–100) for the active tissue family. */
export function biasLoadForFamily(biases: StructuralBias[], family: TissueFamily): number {
  let load = 0;
  for (const b of biases) {
    const w = relevantBiasWeight(family, b.id);
    load += b.magnitude * w * 0.4;
  }
  return clamp(load);
}

/** Offload-ability — how readily this case can shed mechanical load. High
 *  irritability, high tissue load, dense compensations, and a stenotic /
 *  joint-replacement archetype all reduce offload-ability. */
export interface OffloadScore {
  score: number; // 0–100, higher = easier to offload
  label: 'good' | 'fair' | 'poor';
  rationale: string;
}

export function computeOffloadability(
  ctx: ConditionContext | null | undefined,
  biases: StructuralBias[],
  input: SimulationInput,
): OffloadScore {
  let s = 70;
  const reasons: string[] = [];
  if (ctx) {
    s -= (ctx.tissueLoad ?? 0) * 0.2;
    s -= (ctx.scarLoad ?? 0) * 0.15;
    s -= Math.max(0, 60 - ctx.baselineCapacity) * 0.3;
    if (ctx.painMechanism === 'central') { s -= 15; reasons.push('central sensitization limits load shedding'); }
    if (ctx.archetypeId && /stenosis|chronic|frozen|joint_replacement/i.test(ctx.archetypeId)) {
      s -= 12; reasons.push('archetype with reduced offload window');
    }
  }
  s -= input.irritability * 0.15;
  const compBias = biases.find(b => b.id === 'compensation_burden');
  if (compBias) { s -= compBias.magnitude * 0.2; reasons.push('compensation burden caps load shedding'); }
  if (input.workDemand > 70) { s -= 10; reasons.push('high work demand'); }
  if (input.sportDemand > 70) { s -= 8; reasons.push('high sport demand'); }
  s = clamp(s);
  const label: OffloadScore['label'] = s >= 65 ? 'good' : s >= 40 ? 'fair' : 'poor';
  if (reasons.length === 0) reasons.push(label === 'good' ? 'mechanical load can be reduced' : 'limited capacity to offload');
  return { score: s, label, rationale: reasons.join(' • ') };
}

// ---------------------------------------------------------------------------
// Driver model
// ---------------------------------------------------------------------------

export type RecoveryScenario = 'A' | 'B' | 'C';

export interface NaturalDriverProjection {
  /** SimulationProjection-compatible payload so it slots in for the
   *  existing chart pipeline. */
  projection: SimulationProjection;
  /** Per-week trajectories of the four explicit drivers. */
  drivers: {
    irritability: number[];
    loadVsCapacity: number[]; // 0–100, higher = capacity exceeds demand
    tissueCapacity: number[]; // 0–100
    sensitivity: number[];    // 0–100, lower = better
  };
  scenario: RecoveryScenario;
  scenarioLabel: string;
  scenarioRationale: string;
  flags: {
    plateau: boolean;
    plateauWeek: number | null;
    recurrence: boolean;
    recurrenceWeeks: number[];
    chronic: boolean;
    chronicOnsetWeek: number | null;
    /** Per-week trigger counters surfaced for transparency: how many
     *  consecutive weeks each detection rule has been satisfied at the
     *  end of the projection. */
    triggerCounters: {
      loadOverCapacity: number;
      sensitivityStuckHigh: number;
      capacityNotImproving: number;
    };
  };
  biases: StructuralBias[];
  family: TissueFamily;
  offload: OffloadScore;
}

interface DriverWeekState {
  irritability: number;
  loadVsCapacity: number;
  tissueCapacity: number;
  sensitivity: number;
}

function initialDriverState(
  input: SimulationInput,
  ctx: ConditionContext | null | undefined,
  ai: AINaturalTimeline | null | undefined,
  biases: StructuralBias[],
  family: TissueFamily,
): DriverWeekState {
  const sev = input.conditionSeverity;
  const irrInit = clamp(input.irritability + (ctx?.painMechanism === 'central' ? 12 : 0)
    + (ctx?.painMechanism === 'neuropathic' ? 8 : 0)
    + (ctx?.tissueLoad ?? 0) * 0.1);
  const tissueCap = clamp((ctx?.baselineCapacity ?? 50) - sev * 0.2 - biasLoadForFamily(biases, family) * 0.2);
  const demand = (input.workDemand + input.sportDemand) / 2;
  const lvc = clamp(tissueCap - demand + 50);
  const sens = clamp(40 + irrInit * 0.3
    + (ctx?.hasNerveRoot ? 15 : 0)
    + (ctx?.painMechanism === 'central' ? 25 : ctx?.painMechanism === 'neuropathic' ? 15 : 0));
  // AI seed nudges
  if (ai?.flare_risk_percent) {
    return { irritability: Math.max(irrInit, ai.flare_risk_percent), loadVsCapacity: lvc, tissueCapacity: tissueCap, sensitivity: Math.max(sens, (ai.chronicity_risk_percent ?? sens) * 0.6) };
  }
  return { irritability: irrInit, loadVsCapacity: lvc, tissueCapacity: tissueCap, sensitivity: sens };
}

interface DriverParams {
  baseHealRate: number;       // per-week tissue capacity gain when calm
  baseIrritabilityDecay: number;
  baseSensitivityDecay: number;
  plateauCeiling: number;     // upper bound on tissueCapacity in absence of treatment
  chronicTendency: number;    // 0–1, drives scenario classifier
}

function deriveDriverParams(
  ctx: ConditionContext | null | undefined,
  ai: AINaturalTimeline | null | undefined,
  biases: StructuralBias[],
  family: TissueFamily,
  offload: OffloadScore,
  input: SimulationInput,
): DriverParams {
  // Tissue-family base healing (per-week tissue capacity gain, percent)
  const familyBase: Record<TissueFamily, { heal: number; ceiling: number; chronic: number; recur: number }> = {
    muscle:  { heal: 4.5, ceiling: 92, chronic: 0.05, recur: 0.04 },
    tendon:  { heal: 1.4, ceiling: 78, chronic: 0.30, recur: 0.10 },
    nerve:   { heal: 1.0, ceiling: 70, chronic: 0.45, recur: 0.08 },
    disc:    { heal: 1.6, ceiling: 75, chronic: 0.35, recur: 0.12 },
    joint:   { heal: 1.8, ceiling: 80, chronic: 0.25, recur: 0.07 },
    other:   { heal: 2.2, ceiling: 85, chronic: 0.15, recur: 0.06 },
  };
  const fb = familyBase[family];

  const biasLoad = biasLoadForFamily(biases, family); // 0–100
  // Each bias point shaves ~0.012%/wk healing, drops ceiling ~0.15pp,
  // and lifts chronic tendency ~0.0035 — calibrated against the
  // family-specific defaults.
  let heal = fb.heal * (1 - biasLoad * 0.005) * (offload.score / 70);
  let ceiling = fb.ceiling - biasLoad * 0.15;
  // Family-specific recurrence priors are folded into chronicTendency
  // so the per-tissue tendency to re-flare biases scenario classification
  // (recurrence weeks themselves come from the explicit load>capacity +
  // sensitivity rule in the simulation loop, not a stochastic draw).
  let chronic = fb.chronic + biasLoad * 0.0035 + (1 - offload.score / 100) * 0.25 + fb.recur * 0.5;

  // AI overrides (per-tissue if present)
  if (ai) {
    const win = ai.overall_window_weeks?.expected;
    if (win && win > 0) {
      const speed = Math.max(0.4, Math.min(2.5, 12 / win));
      heal *= speed;
    }
    if (typeof ai.chronicity_risk_percent === 'number') chronic = Math.max(chronic, ai.chronicity_risk_percent / 100);
    if (typeof ai.recurrence_risk_percent === 'number') chronic = Math.max(chronic, ai.recurrence_risk_percent / 100 * 0.4);
    const residual = ai.residual_deficit_summary?.overall_percent ?? 0;
    ceiling = Math.min(ceiling, 100 - residual * 0.9);
  }

  // Patient factor multipliers
  if (ctx) {
    heal *= ctx.patientHealingMult;
    ceiling *= ctx.patientTissueQualityMult;
    chronic *= ctx.patientRecurrenceMult;
  }

  // Acuity nudge — chronic presentations heal slower than acute
  if (input.acuity === 'chronic') { heal *= 0.7; chronic += 0.1; }
  else if (input.acuity === 'acute') heal *= 1.1;

  return {
    baseHealRate: Math.max(0.05, heal),
    baseIrritabilityDecay: 1.2 * (offload.score / 70),
    baseSensitivityDecay: 0.8 * (offload.score / 70),
    plateauCeiling: clamp(ceiling, 35, 100),
    chronicTendency: Math.max(0, Math.min(1, chronic)),
  };
}

function classifyScenario(
  params: DriverParams,
  finalCap: number,
  recurrenceCount: number,
  rules: { plateauWeek: number | null; chronicOnsetWeek: number | null; finalSens: number; ruleChronic: boolean },
): { scenario: RecoveryScenario; label: string; rationale: string } {
  // C — chronic / non-resolving. Either the explicit rule fired
  // (sensitivity stuck high AND capacity not improving for ≥4 wks) or
  // the underlying parameters / final capacity force a non-resolving
  // verdict.
  if (rules.ruleChronic || params.chronicTendency > 0.55 || finalCap < 55) {
    const reason = rules.ruleChronic
      ? `Chronic-pathway rule fired at week ${rules.chronicOnsetWeek} — sensitivity stuck ≥ 60 (final ${rules.finalSens.toFixed(0)}) while capacity gain < 0.2 pp/wk for ≥ 4 weeks.`
      : `Final tissue capacity ${finalCap.toFixed(0)} with chronic tendency ${(params.chronicTendency * 100).toFixed(0)}% — natural history predicts persistent deficit.`;
    return { scenario: 'C', label: 'C · Chronic / non-resolving', rationale: reason };
  }
  // B — plateau / flare cycles. Driven by the explicit plateau rule
  // OR ≥ 1 natural recurrence-risk week (load > capacity sustained).
  if (rules.plateauWeek !== null || recurrenceCount >= 1 || params.chronicTendency > 0.25 || finalCap < 78) {
    const bits: string[] = [];
    if (rules.plateauWeek !== null) bits.push(`plateau at w${rules.plateauWeek} (capacity gain < 0.3 pp/wk × 3)`);
    if (recurrenceCount > 0) bits.push(`${recurrenceCount} recurrence-risk week${recurrenceCount === 1 ? '' : 's'} (load > capacity × 2 wks + sensitivity ≥ 55)`);
    if (bits.length === 0) bits.push(`final capacity ${finalCap.toFixed(0)} below 78`);
    return { scenario: 'B', label: 'B · Plateau & flare cycles', rationale: `Triggers: ${bits.join('; ')}.` };
  }
  // A — near-full natural recovery
  return { scenario: 'A', label: 'A · Near-full natural recovery',
    rationale: `No trigger fired — capacity climbed steadily to ${finalCap.toFixed(0)} with sensitivity decaying and load < capacity throughout.` };
}

/** Convert driver-state trajectories into a SimulationProjection so it
 *  plugs into the existing chart pipeline without UI rewrites. */
function buildProjectionFromDrivers(
  driverStates: DriverWeekState[],
  scenarioColor: string,
  branchName: string,
  totalWeeks: number,
  ctx: ConditionContext | null | undefined,
  flareWeeks: Set<number>,
  plateauWeek: number | null,
  chronic: boolean,
): SimulationProjection {
  const N = driverStates.length;
  const states: RecoveryState[] = [];
  const phaseFor = (i: number): HealingPhase => {
    const f = i / Math.max(1, N - 1);
    if (f < 0.15) return 'inflammatory';
    if (f < 0.45) return 'proliferative';
    if (f < 0.8) return 'remodeling';
    return 'maturation';
  };
  for (let i = 0; i < N; i++) {
    const d = driverStates[i];
    const cap = d.tissueCapacity;
    const lvc = d.loadVsCapacity;
    const irr = d.irritability;
    const sens = d.sensitivity;
    // Map drivers → existing RecoveryState fields so all downstream
    // consumers (pain charts, milestones, scrubber stats) work unchanged.
    const pain = clamp(20 + sens * 0.5 + irr * 0.3 + Math.max(0, 60 - cap) * 0.4);
    const fn = clamp(40 + cap * 0.5 + Math.max(0, lvc - 50) * 0.3 - irr * 0.15);
    const flare = clamp(20 + irr * 0.5 + (100 - lvc) * 0.2);
    const reinj = clamp(15 + (100 - cap) * 0.4 + (100 - lvc) * 0.2);
    const chron = clamp((chronic ? 65 : 25) + sens * 0.3);
    states.push({
      week: i,
      pain,
      stiffness: clamp(30 + (100 - cap) * 0.3),
      swelling: clamp(Math.max(0, 50 - i * 3)),
      irritability: irr,
      inflammation: clamp(Math.max(0, 55 - i * 2.5) + (flareWeeks.has(i) ? 25 : 0)),
      healingPhase: phaseFor(i),
      healingProgress: clamp((i / Math.max(1, N - 1)) * 100),
      loadTolerance: cap,
      structuralIntegrity: clamp(50 + cap * 0.4),
      walking: clamp(60 + cap * 0.3 - irr * 0.2),
      stairs: clamp(50 + cap * 0.35 - irr * 0.2),
      squat: clamp(40 + cap * 0.45 - irr * 0.2),
      running: clamp(Math.max(0, cap - 35) * 0.8 - irr * 0.2),
      sport: clamp(Math.max(0, cap - 50) * 0.9 - irr * 0.2),
      workCapacity: clamp(50 + cap * 0.4 - irr * 0.2),
      jointLoading: clamp(50 + (100 - lvc) * 0.3),
      compensation: clamp(30 + (100 - cap) * 0.3),
      movementQuality: clamp(40 + cap * 0.4),
      asymmetry: clamp(20 + (100 - cap) * 0.25),
      reinjuryRisk: reinj,
      flareRisk: flare,
      chronicityRisk: chron,
      compensatoryInjuryRisk: clamp(20 + (100 - cap) * 0.3),
      romPercent: clamp(60 + cap * 0.3),
      strength: clamp(50 + cap * 0.4),
      motorControl: clamp(50 + cap * 0.3),
      neuralSensitivity: sens,
      fearAvoidance: clamp(25 + sens * 0.3),
      sleep: 65,
      adherence: 1,
      slingFunction: clamp(50 + cap * 0.3),
      capacity: cap,
      demand: clamp(100 - lvc + 50),
    });
  }
  const arr = (key: keyof RecoveryState) => states.map(s => s[key] as number);
  const timelines: ParallelTimelines = {
    weeks: states.map(s => s.week),
    symptoms: { pain: arr('pain'), stiffness: arr('stiffness'), swelling: arr('swelling'), irritability: arr('irritability') },
    tissue: { inflammation: arr('inflammation'), healing: arr('healingProgress'), loadTolerance: arr('loadTolerance'), structural: arr('structuralIntegrity') },
    function: { walking: arr('walking'), stairs: arr('stairs'), squat: arr('squat'), running: arr('running'), sport: arr('sport'), work: arr('workCapacity') },
    biomechanics: { jointLoading: arr('jointLoading'), compensation: arr('compensation'), movementQuality: arr('movementQuality'), asymmetry: arr('asymmetry') },
    risk: { reinjury: arr('reinjuryRisk'), flare: arr('flareRisk'), chronicity: arr('chronicityRisk'), compensatory: arr('compensatoryInjuryRisk') },
    capacity: arr('capacity'),
    demand: arr('demand'),
    feelsBetter: states.map(s => clamp(80 - s.pain * 0.6)),
    isBetter: states.map(s => clamp(60 + s.capacity * 0.3 - s.pain * 0.2)),
    capacityRecovery: arr('capacity'),
  };
  const band = (vals: number[], delta = 8): { best: number[]; expected: number[]; slower: number[]; flareAdjusted: number[] } => ({
    best: vals.map(v => clamp(v - delta)),
    expected: vals,
    slower: vals.map(v => clamp(v + delta * 0.7)),
    flareAdjusted: vals.map(v => clamp(v + delta * 1.4)),
  });
  const bandUp = (vals: number[], delta = 8) => ({
    best: vals.map(v => clamp(v + delta)),
    expected: vals,
    slower: vals.map(v => clamp(v - delta)),
    flareAdjusted: vals.map(v => clamp(v - delta * 1.4)),
  });
  return {
    branchId: 'baseline_natural_driver',
    branchName,
    color: scenarioColor,
    states,
    timelines,
    bands: { pain: band(arr('pain')), function: bandUp(arr('walking')), capacity: bandUp(arr('capacity')), risk: band(arr('reinjuryRisk')) },
    milestones: [],
    interventionMarkers: [
      ...Array.from(flareWeeks).sort((a, b) => a - b).map(w => ({
        week: w, type: 'flare' as const, label: 'Natural flare cycle',
      })),
      ...(plateauWeek !== null ? [{ week: plateauWeek, type: 'load_change' as const, label: `Plateau onset (capacity ~${states[plateauWeek].capacity.toFixed(0)})` }] : []),
    ],
    attribution: [],
    totalWeeks,
  };
}

/** Main entry — produces the full natural-recovery driver projection. */
export function simulateNaturalDriverModel(
  input: SimulationInput,
  ctx: ConditionContext | null | undefined,
  biases: StructuralBias[],
  ai?: AINaturalTimeline | null,
): NaturalDriverProjection {
  const family = tissueFamilyFor(ctx);
  const offload = computeOffloadability(ctx, biases, input);
  const params = deriveDriverParams(ctx, ai, biases, family, offload, input);

  // Choose the projection length: prefer AI window if present, else use
  // input.totalWeeks. Cap at 52 weeks for the natural-history horizon.
  const aiWeeks = ai?.overall_window_weeks?.expected;
  const horizon = Math.max(4, Math.min(52, Math.round(aiWeeks ?? input.totalWeeks)));

  let state = initialDriverState(input, ctx, ai, biases, family);
  const trajectory: DriverWeekState[] = [{ ...state }];
  const flareWeeks = new Set<number>();

  // -----------------------------------------------------------------
  // Explicit per-week trigger rules (Task #189):
  //   • plateau              → capacity gain < 0.3 pp/wk for ≥ 3 wks
  //   • recurrence-risk week → load > capacity (loadVsCapacity < 50)
  //                            sustained ≥ 2 wks AND sensitivity ≥ 55
  //   • chronic pathway      → sensitivity stuck ≥ 60 AND capacity
  //                            not improving (gain < 0.2 pp/wk) — both
  //                            for ≥ 4 consecutive weeks.
  // Counters are kept on the state machine and the first week each
  // rule fires is recorded so the chart can flag the exact point.
  // -----------------------------------------------------------------
  let stagnantStreak = 0;       // capacity gain < 0.3 pp/wk
  let lowGainStreak = 0;        // capacity gain < 0.2 pp/wk (chronic rule)
  let highSensStreak = 0;       // sensitivity ≥ 60 sustained
  let loadOverCapStreak = 0;    // loadVsCapacity < 50 sustained
  let plateauWeek: number | null = null;
  let chronicOnsetWeek: number | null = null;
  const RECURRENCE_COOLDOWN = 3; // wks between flagged recurrence weeks

  for (let w = 1; w <= horizon; w++) {
    const prev = state;
    // Tissue capacity asymptotes toward params.plateauCeiling
    const headroom = Math.max(0, params.plateauCeiling - prev.tissueCapacity);
    const healGain = params.baseHealRate * (headroom / Math.max(15, params.plateauCeiling)) * (1 - prev.irritability * 0.005);
    let nextCap = clamp(prev.tissueCapacity + healGain, 0, params.plateauCeiling);

    const irrDecay = params.baseIrritabilityDecay * (1 - prev.sensitivity * 0.005);
    let nextIrr = clamp(prev.irritability - irrDecay);

    const sensDecay = params.baseSensitivityDecay * (1 - params.chronicTendency * 0.6);
    let nextSens = clamp(prev.sensitivity - sensDecay);

    let nextLvc = clamp(prev.loadVsCapacity + (nextCap - prev.tissueCapacity) * 0.6 + 0.4);

    // ---- Recurrence-risk rule: load > capacity sustained + sens high
    //      Triggers a natural flare cycle the *first* week the
    //      sustained-condition is met (with a cooldown so we don't
    //      flag every consecutive week of the same episode).
    const loadOverCap = nextLvc < 50;
    loadOverCapStreak = loadOverCap ? loadOverCapStreak + 1 : 0;
    const lastFlare = Array.from(flareWeeks).pop() ?? -RECURRENCE_COOLDOWN;
    const cooldownOk = w - lastFlare >= RECURRENCE_COOLDOWN;
    const recurrenceTriggered = loadOverCapStreak >= 2 && nextSens >= 55 && cooldownOk;
    if (recurrenceTriggered) {
      flareWeeks.add(w);
      nextIrr = clamp(nextIrr + 25);
      nextSens = clamp(nextSens + 12);
      nextCap = clamp(nextCap - 6);
      nextLvc = clamp(nextLvc - 18);
      loadOverCapStreak = 0;
    }

    state = { irritability: nextIrr, loadVsCapacity: nextLvc, tissueCapacity: nextCap, sensitivity: nextSens };
    trajectory.push({ ...state });

    // ---- Plateau rule: capacity gain < 0.3 pp/wk for ≥ 3 wks
    if (healGain < 0.3) {
      stagnantStreak++;
      if (stagnantStreak >= 3 && plateauWeek === null && w >= 4) plateauWeek = w - 2;
    } else {
      stagnantStreak = 0;
    }

    // ---- Chronic rule: sensitivity ≥ 60 AND capacity not improving
    //      (gain < 0.2 pp/wk) — both for ≥ 4 consecutive weeks.
    highSensStreak = nextSens >= 60 ? highSensStreak + 1 : 0;
    lowGainStreak = healGain < 0.2 ? lowGainStreak + 1 : 0;
    if (
      chronicOnsetWeek === null &&
      highSensStreak >= 4 &&
      lowGainStreak >= 4 &&
      w >= 4
    ) {
      chronicOnsetWeek = w - 3;
    }
  }

  const finalCap = trajectory[trajectory.length - 1].tissueCapacity;
  const finalSens = trajectory[trajectory.length - 1].sensitivity;
  const recurrenceCount = flareWeeks.size;
  // Chronic flag is now driven by the explicit rule firing OR the
  // pre-existing chronicTendency / final-capacity floor — whichever
  // triggers — so the chart and the badge agree on a single source.
  const ruleChronic = chronicOnsetWeek !== null;
  const cls = classifyScenario(
    params,
    finalCap,
    recurrenceCount,
    { plateauWeek, chronicOnsetWeek, finalSens, ruleChronic },
  );
  const chronic = cls.scenario === 'C';

  const colorByScenario: Record<RecoveryScenario, string> = {
    A: '#22c55e', B: '#f59e0b', C: '#ef4444',
  };

  const projection = buildProjectionFromDrivers(
    trajectory,
    colorByScenario[cls.scenario],
    `Natural · ${cls.label}`,
    horizon,
    ctx,
    flareWeeks,
    plateauWeek,
    chronic,
  );

  return {
    projection,
    drivers: {
      irritability: trajectory.map(t => t.irritability),
      loadVsCapacity: trajectory.map(t => t.loadVsCapacity),
      tissueCapacity: trajectory.map(t => t.tissueCapacity),
      sensitivity: trajectory.map(t => t.sensitivity),
    },
    scenario: cls.scenario,
    scenarioLabel: cls.label,
    scenarioRationale: cls.rationale,
    flags: {
      plateau: plateauWeek !== null,
      plateauWeek,
      recurrence: recurrenceCount > 0,
      recurrenceWeeks: Array.from(flareWeeks).sort((a, b) => a - b),
      chronic,
      chronicOnsetWeek,
      triggerCounters: {
        loadOverCapacity: loadOverCapStreak,
        sensitivityStuckHigh: highSensStreak,
        capacityNotImproving: lowGainStreak,
      },
    },
    biases,
    family,
    offload,
  };
}

export const DRIVER_LABELS = {
  irritability: 'Irritability',
  loadVsCapacity: 'Load vs capacity',
  tissueCapacity: 'Tissue capacity',
  sensitivity: 'Sensitivity',
} as const;

export const DRIVER_COLORS = {
  irritability: '#ef4444',
  loadVsCapacity: '#06b6d4',
  tissueCapacity: '#22c55e',
  sensitivity: '#a855f7',
} as const;
