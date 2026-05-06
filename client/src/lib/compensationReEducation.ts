/**
 * Compensation Re-Education Engine
 * ---------------------------------
 * Post-processor that takes the raw output of the three existing
 * compensation detectors (jointConstraints, pathologyCompensation,
 * slingEngine) and enriches each compensation with:
 *   - Driver        — WHY the patient is compensating
 *   - Verdict       — what to DO with this compensation clinically
 *   - Cost          — multi-axis cost profile (cervical, AC, energy, risk)
 *   - Better pattern — pointer into the compensationLibrary catalogue
 *   - Retraining plan — phased, gate-criteria-driven plan
 *
 * Pure functions only — no React, no DOM. The Movement Mode Re-Ed UI panel
 * (Task #373) consumes the output of `enrichCompensations` and renders it.
 */

import type { CompensationPattern as ConstraintCompensationPattern, CompensationResult } from './jointConstraints';
import type { ClinicalFinding, PathologyCompensationResult, RomRestriction } from './pathologyCompensationEngine';
import type { SlingAnalysisResult, SlingResult } from './slingEngine';
import {
  type CompensationCostProfile,
  type CompensationPatternEntry,
  type CompensationTarget,
  type RetrainingPlan,
  getCompensationTarget,
  getCompensationTargetsForJoint,
  getCompensationPattern,
  getRetrainingPlan,
} from './compensationLibrary';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CompensationDriver =
  | 'mechanical_block'
  | 'weakness'
  | 'motor_planning'
  | 'pain'
  | 'fear'
  | 'anatomical';

export type CompensationVerdict = 'necessary' | 'optimizable' | 'phase_out' | 'harmful';

export type CompensationSourceDetector = 'joint_constraints' | 'pathology' | 'sling';

/** Minimal pain-marker shape the engine needs. */
export interface ReEdPainMarker {
  nearestBone?: string;
  anatomicalLabel?: string;
  type?: string;
  severity?: number;
}

/** Minimal patient-history flags the engine reads. */
export interface ReEdPatientFlags {
  /** Months since onset, if known. */
  chronicityMonths?: number;
  /** True if a structural/anatomical diagnosis is documented (e.g. OA, post-surgical, frozen shoulder). */
  structuralDiagnosis?: boolean;
  /** True if patient reports protective/avoidant behaviour around the movement. */
  fearAvoidance?: boolean;
}

/**
 * Optional enrichment payload that the Re-Education engine attaches to
 * existing detector outputs (CompensationPattern, ClinicalFinding,
 * SlingResult). Detectors leave this undefined; the post-processor
 * populates it. Anything that consumes a detector output can read
 * `.enrichment` if present without coupling to this module's full type.
 */
export interface CompensationEnrichment {
  driver: CompensationDriver;
  verdict: CompensationVerdict;
  cost: CompensationCostProfile;
  costScore: number;
  betterPatternId: string | null;
  retrainingPlanId: string | null;
}

export interface EnrichedCompensation {
  /** Stable id for React keys / cart linkage. */
  id: string;
  /** Which detector produced this finding. */
  source: CompensationSourceDetector;

  // --- Original detector data, normalised ---
  joint: string;
  movement: string;
  /** Compensator joint (jointConstraints) or muscle/sling (others). */
  compensator: string;
  compensatorMovement?: string;
  additionalLoadPct: number;        // 0-100
  ratio: number;                     // 0-1
  clinicalNote: string;

  // --- Re-ed enrichment ---
  driver: CompensationDriver;
  driverConfidence: number;          // 0-1
  driverEvidence: string[];          // human-readable bullets
  verdict: CompensationVerdict;
  verdictReason: string;             // single sentence

  cost: CompensationCostProfile;
  costScore: number;                 // 0-1 weighted aggregate
  costFlags: string[];               // e.g. "high cervical load", "AC joint at risk"

  matchedPatternId: string | null;
  matchedPatternLabel: string | null;
  betterPatternId: string | null;
  betterPatternLabel: string | null;
  retrainingPlanId: string | null;
}

export interface EnrichmentInput {
  jointConstraints: CompensationResult | null;
  pathology: PathologyCompensationResult | null;
  sling: SlingAnalysisResult | null;
  painMarkers: ReEdPainMarker[];
  patientFlags: ReEdPatientFlags;
  /** Active movement currently under evaluation, e.g. "leftShoulder:flexion". Used to bias verdict scoring. */
  activeMovementId?: string | null;
}

export interface EnrichmentOutput {
  compensations: EnrichedCompensation[];
  /** Movement→count summary for the UI header strip. */
  countsByVerdict: Record<CompensationVerdict, number>;
  /** Total cost across all compensations (0-N). */
  totalCostScore: number;
  /** Detector outputs cloned and stamped with `enrichment` + top-level
   *  optional fields, so existing consumers (Findings Stream, Sling
   *  Spotlight, Plan Cart) can read enrichment without changing how they
   *  iterate the underlying detector arrays. Null when input was null. */
  enrichedDetectorOutputs: {
    jointConstraints: CompensationResult | null;
    pathology: PathologyCompensationResult | null;
    sling: SlingAnalysisResult | null;
  };
}

/** Convert an EnrichedCompensation into the slim CompensationEnrichment payload. */
export function toEnrichmentPayload(c: EnrichedCompensation): CompensationEnrichment {
  return {
    driver: c.driver,
    verdict: c.verdict,
    cost: c.cost,
    costScore: c.costScore,
    betterPatternId: c.betterPatternId,
    retrainingPlanId: c.retrainingPlanId,
  };
}

// ---------------------------------------------------------------------------
// Cost weighting — applied once when computing aggregate score
// ---------------------------------------------------------------------------

const COST_WEIGHTS: Record<keyof CompensationCostProfile, number> = {
  cervical: 1.2,
  acJoint: 1.0,
  lumbar: 1.3,
  energy: 0.6,
  secondaryRisk: 1.5,
};

function weightedCostScore(cost: CompensationCostProfile): number {
  const total =
    cost.cervical * COST_WEIGHTS.cervical +
    cost.acJoint * COST_WEIGHTS.acJoint +
    cost.lumbar * COST_WEIGHTS.lumbar +
    cost.energy * COST_WEIGHTS.energy +
    cost.secondaryRisk * COST_WEIGHTS.secondaryRisk;
  const max =
    COST_WEIGHTS.cervical +
    COST_WEIGHTS.acJoint +
    COST_WEIGHTS.lumbar +
    COST_WEIGHTS.energy +
    COST_WEIGHTS.secondaryRisk;
  return Math.round((total / max) * 100) / 100;
}

function costFlags(cost: CompensationCostProfile): string[] {
  const out: string[] = [];
  if (cost.cervical >= 0.6) out.push('High cervical load');
  if (cost.acJoint >= 0.6) out.push('AC joint at risk');
  if (cost.lumbar >= 0.6) out.push('High lumbar load');
  if (cost.energy >= 0.6) out.push('High metabolic cost');
  if (cost.secondaryRisk >= 0.6) out.push('Downstream injury risk');
  return out;
}

// ---------------------------------------------------------------------------
// Driver inference — single source of truth for "WHY"
// ---------------------------------------------------------------------------

interface DriverInferenceContext {
  joint: string;
  movement: string;
  pathology: PathologyCompensationResult | null;
  painMarkers: ReEdPainMarker[];
  patientFlags: ReEdPatientFlags;
}

/**
 * Normalize joint / region labels so that "left_shoulder", "leftShoulder",
 * "Left Shoulder" and "left-shoulder" all compare equal. Returns an array
 * of tokens (lower-case, alpha-only) so we can do partial / token-overlap
 * matching against pain markers and pathology findings.
 */
function normalizeLabelTokens(s: string | undefined | null): string[] {
  if (!s) return [];
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(t => t.length >= 3); // drop noise like "l", "of", "to"
}

function tokensOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  for (const t of b) if (set.has(t)) return true;
  return false;
}

function painNearJoint(joint: string, painMarkers: ReEdPainMarker[]): ReEdPainMarker | null {
  const jointTokens = normalizeLabelTokens(joint);
  let best: ReEdPainMarker | null = null;
  let bestSev = 0;
  for (const pm of painMarkers) {
    const markerTokens = [
      ...normalizeLabelTokens(pm.nearestBone),
      ...normalizeLabelTokens(pm.anatomicalLabel),
    ];
    if (tokensOverlap(jointTokens, markerTokens) && (pm.severity ?? 0) >= bestSev) {
      best = pm;
      bestSev = pm.severity ?? 0;
    }
  }
  return best;
}

function pathologyRomRestrictionFor(joint: string, movement: string, pathology: PathologyCompensationResult | null): RomRestriction | null {
  if (!pathology) return null;
  const jointTokens = normalizeLabelTokens(joint);
  const mvTokens = normalizeLabelTokens(movement);
  return pathology.romRestrictions.find(r =>
    tokensOverlap(jointTokens, normalizeLabelTokens(r.joint)) &&
    tokensOverlap(mvTokens, normalizeLabelTokens(r.parameter)),
  ) ?? null;
}

function pathologyFindingsFor(joint: string, pathology: PathologyCompensationResult | null): ClinicalFinding[] {
  if (!pathology) return [];
  const jointTokens = normalizeLabelTokens(joint);
  return pathology.clinicalFindings.filter(f =>
    tokensOverlap(jointTokens, normalizeLabelTokens(f.muscleSource)) ||
    tokensOverlap(jointTokens, normalizeLabelTokens(f.title)),
  );
}

function inferDriver(ctx: DriverInferenceContext): { driver: CompensationDriver; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  const rom = pathologyRomRestrictionFor(ctx.joint, ctx.movement, ctx.pathology);
  const findings = pathologyFindingsFor(ctx.joint, ctx.pathology);
  const pain = painNearJoint(ctx.joint, ctx.painMarkers);

  const structuralFinding = findings.find(f => /surgical|frozen|adhesive|osteoarthr|impingement|tear/i.test(f.title + ' ' + f.description));
  if (ctx.patientFlags.structuralDiagnosis || structuralFinding) {
    if (structuralFinding) evidence.push(`Structural finding: ${structuralFinding.title}`);
    if (ctx.patientFlags.structuralDiagnosis) evidence.push('Patient flagged as structural / anatomical');
    return { driver: 'anatomical', confidence: 0.85, evidence };
  }

  if (rom && rom.restrictionPercent >= 40) {
    evidence.push(`Passive ROM restricted ${rom.restrictionPercent}% — ${rom.reason}`);
    return { driver: 'mechanical_block', confidence: Math.min(0.9, 0.5 + rom.restrictionPercent / 100), evidence };
  }

  if (pain && (pain.severity ?? 0) >= 6) {
    evidence.push(`Pain marker at ${pain.anatomicalLabel ?? pain.nearestBone} (severity ${pain.severity})`);
    return { driver: 'pain', confidence: Math.min(0.9, 0.4 + (pain.severity ?? 6) / 20), evidence };
  }

  const weaknessFinding = findings.find(f => /weakness|inhibition|atroph|strain/i.test(f.title + ' ' + f.description));
  if (weaknessFinding) {
    evidence.push(`Weakness pattern: ${weaknessFinding.title}`);
    return { driver: 'weakness', confidence: 0.7, evidence };
  }

  if (ctx.patientFlags.fearAvoidance || (ctx.patientFlags.chronicityMonths ?? 0) >= 6) {
    if (ctx.patientFlags.fearAvoidance) evidence.push('Fear-avoidance behaviour reported');
    if ((ctx.patientFlags.chronicityMonths ?? 0) >= 6) evidence.push(`Chronicity ${ctx.patientFlags.chronicityMonths} months — pattern likely consolidated`);
    return { driver: 'fear', confidence: 0.55, evidence };
  }

  evidence.push('No mechanical, pain or weakness driver detected — likely habitual motor pattern');
  return { driver: 'motor_planning', confidence: 0.5, evidence };
}

// ---------------------------------------------------------------------------
// Library matching — picks the best CompensationPatternEntry for a finding
// ---------------------------------------------------------------------------

function matchPatternFromKeywords(target: CompensationTarget, haystack: string): CompensationPatternEntry | null {
  const lc = haystack.toLowerCase();
  let best: { entry: CompensationPatternEntry; hits: number } | null = null;
  for (const entry of target.patterns) {
    let hits = 0;
    for (const kw of entry.matchKeywords) if (lc.includes(kw.toLowerCase())) hits++;
    if (hits > 0 && (!best || hits > best.hits)) best = { entry, hits };
  }
  return best?.entry ?? null;
}

function pickBetterPattern(target: CompensationTarget, current: CompensationPatternEntry | null, driver: CompensationDriver): { id: string | null; label: string | null; planId: string | null } {
  // If current is the lowest-cost pattern, no upgrade.
  if (current && current.betterPatternId === null) {
    return { id: null, label: null, planId: current.retrainingPlanId ?? null };
  }
  // Mechanical_block / anatomical: skip patterns that require ROM headroom we don't have.
  // Heuristic — prefer "bimanual" / "accept residual" style entries which are highest rank.
  if (driver === 'mechanical_block' || driver === 'anatomical') {
    const safe = [...target.patterns].reverse().find(p =>
      /bimanual|assist|substitut|accept/i.test(p.id + ' ' + p.label),
    );
    if (safe) return { id: safe.id, label: safe.label, planId: safe.retrainingPlanId ?? null };
  }
  // Otherwise step up one rank.
  if (current?.betterPatternId) {
    const next = getCompensationPattern(current.betterPatternId);
    if (next) return { id: next.id, label: next.label, planId: next.retrainingPlanId ?? null };
  }
  // Fall back to the rank-3 (textbook) pattern if no current match.
  const textbook = target.patterns.find(p => p.rank >= 2) ?? target.patterns[target.patterns.length - 1];
  return { id: textbook?.id ?? null, label: textbook?.label ?? null, planId: textbook?.retrainingPlanId ?? null };
}

// ---------------------------------------------------------------------------
// Verdict scoring
// ---------------------------------------------------------------------------

function computeVerdict(args: {
  driver: CompensationDriver;
  costScore: number;
  betterPatternId: string | null;
  pain: ReEdPainMarker | null;
}): { verdict: CompensationVerdict; reason: string } {
  const { driver, costScore, betterPatternId, pain } = args;

  if (costScore >= 0.6) {
    return { verdict: 'harmful', reason: 'High aggregate cost — sustained use risks secondary injury.' };
  }
  if (driver === 'mechanical_block' || driver === 'anatomical') {
    return { verdict: 'necessary', reason: 'Underlying tissue restriction means this compensation is the patient\'s only path to the movement right now.' };
  }
  if (driver === 'pain' && pain && (pain.severity ?? 0) >= 6) {
    return { verdict: 'phase_out', reason: 'Pain-driven guarding — should resolve as the irritant settles; do not reinforce.' };
  }
  if (betterPatternId) {
    return { verdict: 'optimizable', reason: 'A lower-cost pattern is available — re-train toward the better strategy.' };
  }
  return { verdict: 'optimizable', reason: 'Pattern can be improved with motor re-education.' };
}

// ---------------------------------------------------------------------------
// Detector → normalized iterator
// ---------------------------------------------------------------------------

interface NormalizedFinding {
  id: string;
  source: CompensationSourceDetector;
  joint: string;
  movement: string;
  compensator: string;
  compensatorMovement?: string;
  additionalLoadPct: number;
  ratio: number;
  clinicalNote: string;
  /** Free-text used by the keyword matcher to pick a library pattern. */
  matchHaystack: string;
}

function fromJointConstraints(result: CompensationResult | null): NormalizedFinding[] {
  if (!result) return [];
  return result.patterns.map((p: ConstraintCompensationPattern, i) => ({
    id: `jc-${p.sourceJoint}-${p.sourceMovement}-${p.compensatingJoint}-${p.compensatingMovement}-${i}`,
    source: 'joint_constraints' as const,
    joint: p.sourceJoint,
    movement: p.sourceMovement,
    compensator: p.compensatingJoint,
    compensatorMovement: p.compensatingMovement,
    additionalLoadPct: p.additionalLoad,
    ratio: p.compensationRatio,
    clinicalNote: p.clinicalNote,
    matchHaystack: `${p.compensatingJoint} ${p.compensatingMovement} ${p.clinicalNote}`,
  }));
}

function fromPathology(result: PathologyCompensationResult | null): NormalizedFinding[] {
  if (!result) return [];
  // Use clinical findings + their related rom restrictions as the unit.
  return result.clinicalFindings.flatMap((f, i) => {
    const sevLoad = f.severity === 'severe' ? 35 : f.severity === 'moderate' ? 20 : 10;
    // Map muscleSource to joint-ish key — pathology engine uses muscle ids like "deltoid_l".
    const joint = f.muscleSource;
    return [{
      id: `pa-${f.muscleSource}-${f.pathology}-${i}`,
      source: 'pathology' as const,
      joint,
      movement: 'multiple',
      compensator: f.title,
      additionalLoadPct: sevLoad,
      ratio: f.severity === 'severe' ? 0.6 : f.severity === 'moderate' ? 0.4 : 0.2,
      clinicalNote: f.description,
      matchHaystack: `${f.title} ${f.description}`,
    }];
  });
}

function fromSling(result: SlingAnalysisResult | null): NormalizedFinding[] {
  if (!result) return [];
  return result.slings
    .filter((s: SlingResult) => s.status === 'compensating' || s.status === 'overloaded' || s.status === 'underperforming')
    .flatMap((s, i) => {
      const wl = s.weakLinks[0];
      if (!wl) return [];
      return [{
        id: `sl-${s.slingId}-${wl.muscle}-${i}`,
        source: 'sling' as const,
        joint: s.slingId,
        movement: 'sling_recruitment',
        compensator: wl.muscle,
        additionalLoadPct: Math.max(10, 100 - (s.activationScore ?? 50)),
        ratio: s.status === 'overloaded' ? 0.6 : 0.4,
        clinicalNote: s.clinicalConsequences?.[0] ?? `${s.label} is ${s.status}`,
        matchHaystack: `${s.label} ${wl.muscle} ${s.clinicalConsequences?.join(' ') ?? ''}`,
      }];
    });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function enrichCompensations(input: EnrichmentInput): EnrichmentOutput {
  const findings: NormalizedFinding[] = [
    ...fromJointConstraints(input.jointConstraints),
    ...fromPathology(input.pathology),
    ...fromSling(input.sling),
  ];

  const compensations: EnrichedCompensation[] = findings.map(f => {
    const target = getCompensationTarget(f.joint, f.movement)
      ?? getCompensationTargetsForJoint(f.joint)[0]
      ?? null;

    const matched = target ? matchPatternFromKeywords(target, f.matchHaystack) : null;
    const baseCost: CompensationCostProfile = matched?.cost ?? {
      cervical: 0.2,
      acJoint: 0.2,
      lumbar: 0.2,
      energy: Math.min(1, f.additionalLoadPct / 100),
      secondaryRisk: Math.min(1, f.additionalLoadPct / 80),
    };

    // Blend library baseline with live additionalLoad signal so a pattern
    // that the detector says is loading the system harder reflects in cost.
    const liveLoad = Math.min(1, f.additionalLoadPct / 100);
    const cost: CompensationCostProfile = {
      cervical: Math.min(1, baseCost.cervical + (matched?.cost.cervical ?? 0) * liveLoad * 0.3),
      acJoint: Math.min(1, baseCost.acJoint + (matched?.cost.acJoint ?? 0) * liveLoad * 0.3),
      lumbar: Math.min(1, baseCost.lumbar + (matched?.cost.lumbar ?? 0) * liveLoad * 0.3),
      energy: Math.min(1, baseCost.energy * 0.6 + liveLoad * 0.4),
      secondaryRisk: Math.min(1, baseCost.secondaryRisk * 0.7 + liveLoad * 0.3),
    };

    const driverInfo = inferDriver({
      joint: f.joint,
      movement: f.movement,
      pathology: input.pathology,
      painMarkers: input.painMarkers,
      patientFlags: input.patientFlags,
    });

    const better = target
      ? pickBetterPattern(target, matched, driverInfo.driver)
      : { id: null, label: null, planId: null };

    const costScore = weightedCostScore(cost);
    const flags = costFlags(cost);

    const pain = painNearJoint(f.joint, input.painMarkers);
    const verdictInfo = computeVerdict({
      driver: driverInfo.driver,
      costScore,
      betterPatternId: better.id,
      pain,
    });

    return {
      id: f.id,
      source: f.source,
      joint: f.joint,
      movement: f.movement,
      compensator: f.compensator,
      compensatorMovement: f.compensatorMovement,
      additionalLoadPct: f.additionalLoadPct,
      ratio: f.ratio,
      clinicalNote: f.clinicalNote,

      driver: driverInfo.driver,
      driverConfidence: driverInfo.confidence,
      driverEvidence: driverInfo.evidence,
      verdict: verdictInfo.verdict,
      verdictReason: verdictInfo.reason,

      cost,
      costScore,
      costFlags: flags,

      matchedPatternId: matched?.id ?? null,
      matchedPatternLabel: matched?.label ?? null,
      betterPatternId: better.id,
      betterPatternLabel: better.label,
      retrainingPlanId: better.planId ?? matched?.retrainingPlanId ?? null,
    };
  });

  const countsByVerdict: Record<CompensationVerdict, number> = {
    necessary: 0, optimizable: 0, phase_out: 0, harmful: 0,
  };
  let totalCostScore = 0;
  const byId = new Map<string, EnrichedCompensation>();
  for (const c of compensations) {
    countsByVerdict[c.verdict]++;
    totalCostScore += c.costScore;
    byId.set(c.id, c);
  }

  // Stamp enrichment back onto cloned detector outputs so downstream
  // consumers (Findings Stream / Sling Spotlight / Plan Cart) can read
  // `.enrichment` + top-level optional fields directly off the same
  // arrays they already iterate.
  const enrichedJC: CompensationResult | null = input.jointConstraints
    ? {
        ...input.jointConstraints,
        patterns: input.jointConstraints.patterns.map((p, i) => {
          const id = `jc-${p.sourceJoint}-${p.sourceMovement}-${p.compensatingJoint}-${p.compensatingMovement}-${i}`;
          const c = byId.get(id);
          if (!c) return p;
          const e = toEnrichmentPayload(c);
          return { ...p, enrichment: e, driver: e.driver, verdict: e.verdict, cost: e.cost, betterPatternId: e.betterPatternId, retrainingPlanId: e.retrainingPlanId };
        }),
      }
    : null;
  const enrichedPath: PathologyCompensationResult | null = input.pathology
    ? {
        ...input.pathology,
        clinicalFindings: input.pathology.clinicalFindings.map((f, i) => {
          const id = `pa-${f.muscleSource}-${f.pathology}-${i}`;
          const c = byId.get(id);
          if (!c) return f;
          const e = toEnrichmentPayload(c);
          return { ...f, enrichment: e, driver: e.driver, verdict: e.verdict, cost: e.cost, betterPatternId: e.betterPatternId, retrainingPlanId: e.retrainingPlanId };
        }),
      }
    : null;
  const enrichedSling: SlingAnalysisResult | null = input.sling
    ? {
        ...input.sling,
        slings: input.sling.slings.map((s, i) => {
          const wl = s.weakLinks[0];
          if (!wl) return s;
          const id = `sl-${s.slingId}-${wl.muscle}-${i}`;
          const c = byId.get(id);
          if (!c) return s;
          const e = toEnrichmentPayload(c);
          return { ...s, enrichment: e, driver: e.driver, verdict: e.verdict, cost: e.cost, betterPatternId: e.betterPatternId, retrainingPlanId: e.retrainingPlanId };
        }),
      }
    : null;

  return {
    compensations,
    countsByVerdict,
    totalCostScore: Math.round(totalCostScore * 10) / 10,
    enrichedDetectorOutputs: { jointConstraints: enrichedJC, pathology: enrichedPath, sling: enrichedSling },
  };
}

export function getRetrainingPlanForCompensation(c: EnrichedCompensation): RetrainingPlan | null {
  return getRetrainingPlan(c.retrainingPlanId);
}
