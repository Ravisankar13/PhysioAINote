import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  ExternalLink,
  Flame,
  GitBranch,
  Hand,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Waves,
  X,
  Zap,
  Save,
  Share2,
  FilePlus,
} from "lucide-react";
import {
  type SimulationInput,
  type ScenarioBranch,
  type GoalMode,
  type BaselineMode,
  type TreatmentEffectProfile,
  type Intervention,
  type CustomExerciseInput,
  type CustomManualTechniqueInput,
  type ConditionContext,
  type RecoveryState,
  type AINaturalTimeline,
  TREATMENT_LIBRARY,
  TREATMENT_BY_ID,
  simulateBranch,
  simulateNaturalHistoryBaselines,
  optimizeSequence,
  generateNarrative,
  defaultBranch,
  defaultInput,
  buildCustomTreatmentProfiles,
  buildCustomExerciseId,
  buildCustomTechniqueId,
  isCustomTreatmentId,
  tissueProfileForContext,
  proposeScheduleForTreatment,
  type HealingPhase,
} from "@/lib/recoverySimulationEngine";
import { findConditionProfile } from "@/lib/patientFactorsEngine";
import {
  computeStructuralBiases,
  simulateNaturalDriverModel,
  DRIVER_COLORS,
  DRIVER_LABELS,
  type SkeletonBiasInputs,
  type NaturalDriverProjection,
  type StructuralBias,
  relevantBiasWeight,
} from "@/lib/naturalRecoveryDriverModel";
import { matchModalitiesForPhase, dosingOneLiner } from "@/lib/electroPhaseMatcher";
import {
  assembleUncertaintySignals,
  computeBandHalfWidthByWeek,
  describeUncertainty,
  useAnimatedNumberArray,
} from "@/lib/recoveryUncertainty";
import type { ElectrophysicalPlan } from "@/components/skeleton/ElectrophysicalEngineTab";
import TreatmentTimelinePanel from "@/components/skeleton/TreatmentTimelinePanel";
import WeeklyCheckInPanel, {
  toEngineCheckIns,
  deriveTracking,
  type WeeklyCheckInRecord,
} from "@/components/skeleton/WeeklyCheckInPanel";
import { useQuery } from "@tanstack/react-query";
import { generateGoalProfile, type RecoveryGoalProfile } from "@/lib/goalStateEngine";
import {
  getArchetypeForCondition,
  RECOVERY_ARCHETYPES,
  type RecoveryArchetypeId,
  stageIndexForHealingPhase,
  stageFitForTreatment,
  evaluateStageCriteria,
  earliestStageEntryWeek,
  highestStageMetByCriteria,
  type RecoveryStage,
  type StageGoalDimension,
  type StageCriteriaEvaluation,
} from "@/lib/recoveryArchetypes";
import type {
  CaseSpecificTreatmentPlan,
  CaseSpecificPhasePlan,
  CaseSpecificTreatmentItem,
} from "@shared/schema";

/** Phase context the dashboard hands to the parent so it can build a
 *  phase-specific PrescriptionContext for the engine APIs. The parent
 *  owns the heavy clinical state (mechanism, sling, pain markers, goal
 *  profile, contraindications); the dashboard supplies the per-phase
 *  overrides (which phase index, label, projected pain, achievement). */
export interface PhaseRxRequest {
  phaseId: string;
  phaseLabel: string;
  /** Archetype stage index (0..N-1). Used to override
   *  clinicalState.activePhaseIndex when building the prescription
   *  context so dosage / MT-grade scaling reflects the phase the
   *  clinician is generating Rx for, not the patient's current phase. */
  phaseStageIndex: number;
  /** Engine projection week at the START of this phase (for hybrid /
   *  time-gated stages); falls back to expectedStart for unreached
   *  stages. Used for pain-at-phase predictions. */
  phaseStartWeek: number;
  /** Predicted pain (0-100) at the start of this phase from the active
   *  projection. */
  predictedPainAtPhase: number;
  /** Goal achievement at end of this phase (0-100). */
  predictedGoalAchievementPct: number;
  /** Stage's primary goal dimension label (e.g. "ROM", "Pain"). */
  goalDimensionLabel: string;
  /** Active goal target text (e.g. "≥75%"). */
  goalTargetText: string | null;
}

interface Props {
  initialInput?: Partial<SimulationInput>;
  conditionLabel?: string;
  patientName?: string;
  patientMeta?: string;
  goalLabel?: string;
  goalWeeks?: number;
  onClose: () => void;
  onApplyState?: (info: { week: number; state: RecoveryState; baselineState: RecoveryState; branchName: string }) => void;
  hasClinicalInput?: boolean;
  customExercises?: CustomExerciseInput[] | null;
  customTechniques?: CustomManualTechniqueInput[] | null;
  conditionContext?: ConditionContext | null;
  /** Callback invoked when the central Skeleton View slot DOM element
   *  mounts/unmounts. Parents should React.createPortal the existing
   *  PureThreeGLBViewer into this element so the SAME viewer instance
   *  (with all clinical state + overlays) is reused inside the
   *  dashboard rather than duplicated. */
  onSkeletonSlotMount?: (el: HTMLDivElement | null) => void;
  /** Per-phase Exercise Rx generator. Returns a list of CustomExercise
   *  inputs (already shaped to match the simulation engine's
   *  CustomExerciseInput / the engine API's CustomExercise). The parent
   *  is responsible for building the phase-specific
   *  PrescriptionContext, calling /api/exercise-engine/design-custom,
   *  and threading mechanism/sling/painMarker context. */
  onGeneratePhaseExerciseRx?: (req: PhaseRxRequest) => Promise<CustomExerciseInput[]>;
  /** Per-phase Manual Therapy Rx generator. Same contract as
   *  onGeneratePhaseExerciseRx for the manual-therapy endpoint. */
  onGeneratePhaseManualRx?: (req: PhaseRxRequest) => Promise<CustomManualTechniqueInput[]>;
  /** Task #240 — patient-modifier breakdown produced by
   *  `computePatientModifiers(effectivePatientFactors)`. When provided,
   *  the dashboard renders a "What's affecting this curve" panel that
   *  shows the top contributing factors (sorted by |multiplier-1|). */
  patientModifiers?: import("@/lib/patientFactorsEngine").PatientModifierProfile | null;
  /** Task #240 — count of clinician-edited factors (vs. auto-detected
   *  baseline). Drives a small badge on the "What's affecting" header. */
  patientFactorsOverrideCount?: number;
  /** Task #242 — count of structured patient-context fields the form
   *  reports as "filled" (out of `PATIENT_CONTEXT_TOTAL_FIELDS`).
   *  Drives the curve confidence bands: more filled fields → tighter
   *  band (animated). When omitted, the dashboard falls back to using
   *  `patientFactorsOverrideCount` as a proxy. */
  patientFactorsFilledCount?: number;
  /** Task #240 — derived workDemand / fearAvoidance from the
   *  structured occupational + psychosocial fields. Each may be null
   *  when the form is left at "auto". Shown in the panel as a chip. */
  derivedDrivers?: {
    fearAvoidance: number | null;
    workDemand: number | null;
    fearAvoidanceContributors: string[];
    workDemandContributors: string[];
  };
  /** Promote per-phase generated exercises into the session-wide
   *  customExercises array so the simulation engine consumes them
   *  through buildCustomTreatmentProfiles. Parent merges into its own
   *  customExerciseResult state. */
  onAddCustomExercises?: (items: CustomExerciseInput[]) => void;
  /** Same as onAddCustomExercises for manual techniques. */
  onAddCustomTechniques?: (items: CustomManualTechniqueInput[]) => void;
  /** Remove a custom (user- or AI-added) item from the parent-managed
   *  custom arrays by its deterministic treatmentId (the same id used
   *  to schedule its Intervention). The dashboard invokes this when an
   *  intervention referencing a custom item is removed via the on-chart
   *  controls, so plan list + recovery curve stay consistent. */
  onRemoveCustomItem?: (treatmentId: string) => void;
  /** AI-generated natural-history timeline (per-finding healing verdicts,
   *  recovery windows, residual deficits) used to drive
   *  `simulateNaturalHistoryBaselines` so the no-treatment / rest-only /
   *  usual-care / aggravation curves reflect the actual condition + patient
   *  factors instead of generic heuristics. */
  aiNaturalTimeline?: AINaturalTimeline | null;
  /** True while the parent's natural-timeline request is in flight.
   *  Drives the small "Loading natural history…" hint shown next to the
   *  chart's mode toggle while the AI verdict is being fetched. */
  naturalTimelineLoading?: boolean;
  /** AI-generated case-specific treatment plan keyed per archetype phase.
   *  When present, each phase card replaces its generic
   *  TREATMENT_LIBRARY-derived strategy + treatments with this patient's
   *  actual goal, techniques, exercises, criteria and per-finding
   *  rationale. The existing per-phase Exercise / Manual Rx buttons are
   *  preserved as "Clinician additions" on top of this baseline. */
  caseSpecificPlan?: CaseSpecificTreatmentPlan | null;
  /** True while the parent's case-specific plan request is in flight.
   *  Drives a "Generating…" first-load state per card and a "Refreshing…"
   *  badge when an existing plan is being updated. */
  caseSpecificPlanLoading?: boolean;
  /** Last hard error from the case-specific plan fetch (after stale plan
   *  has been cleared by the hook). When present each phase card shows
   *  a visible failure card with a retry hint. */
  caseSpecificPlanError?: string | null;
  /** Manual refresh trigger surfaced on the failure card. */
  onRetryCaseSpecificPlan?: () => void;
  /** Optional UI element rendered inside the dashboard's left summary
   *  column — used by PhysioGPT to host the Natural Timeline panel
   *  (with Q&A UX) so it sits alongside the recovery curves. */
  naturalTimelineSlot?: React.ReactNode;
  /** Optional patient-context status chip (rendered in the dashboard
   *  header). Tells the clinician whether the recovery simulation +
   *  case-specific plan reflect their latest patient context, are
   *  mid-refresh, or could be improved by adding context. */
  patientContextBadge?: React.ReactNode;
  /** Latest electrophysical-agents plan from the Electrophysical Agents (EPA) tab. When
   *  present, each phase card shows the 1–3 modalities best fitted to
   *  that phase (stage + primary goal + evidence grade). */
  electrophysicalPlan?: ElectrophysicalPlan | null;
  /** Switch the surrounding workspace to the Electrophysical Agents (EPA) tab so the
   *  clinician can see the full modality plan. */
  onOpenElectroTab?: () => void;
  /** Generate an electrophysical agents (EPA) plan pre-filled with the phase's
   *  condition + stage. Surfaced inline on every phase card when no
   *  plan exists yet. */
  onGenerateElectroPlanForPhase?: (req: { condition: string; stage: 'acute' | 'subacute' | 'chronic'; phaseLabel: string }) => void;
  /** Live skeleton snapshot used by the natural-recovery driver model
   *  (Task #189) to derive structural biases (extension/compression,
   *  flexion, valgus/pronation, neural tension, tunnel compression,
   *  compensation burden). When provided, the natural-history baseline
   *  is produced by the four-driver + skeleton-bias engine instead of
   *  the legacy AI-aggregated rate model. Treatment-pathway curves are
   *  unchanged. */
  skeletonBiasInputs?: SkeletonBiasInputs | null;
}

const PALETTE = ['#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];

/** Map a session-wide custom Rx item (exercise or manual technique) onto
 *  the most relevant archetype phase so AI items generated from the
 *  parent Exercise / Manual Therapy tabs surface on the right phase
 *  card — not just on the current phase. Resolution order:
 *    1. Explicit progression-stage metadata produced by the engines
 *       (1-indexed; clamped to phaseCount).
 *    2. Name keyword heuristic (early/protect/isometric → first phase;
 *       return-to-sport / plyometric / power → last phase;
 *       strength/loading/AROM/remodel → middle).
 *    3. Fallback: the patient's current stage. */
function mapItemToPhaseIndex(
  item: {
    name?: string;
    phaseIndex?: number;
    phaseLabel?: string;
    progressionStages?: { stage: number }[] | undefined;
  },
  phaseCount: number,
  currentIdx: number,
  phaseLabels?: string[],
): number {
  if (phaseCount <= 0) return 0;
  // 1. Explicit phase index stamped by per-phase generators wins.
  if (typeof item.phaseIndex === 'number' && Number.isFinite(item.phaseIndex)) {
    return Math.min(Math.max(0, item.phaseIndex), phaseCount - 1);
  }
  // 2. Explicit phase label normalized against the archetype's
  //    stage names (case-insensitive).
  if (item.phaseLabel && phaseLabels && phaseLabels.length > 0) {
    const target = item.phaseLabel.toLowerCase().trim();
    const idx = phaseLabels.findIndex(l => l.toLowerCase().trim() === target);
    if (idx >= 0) return idx;
  }
  // 3. Engine-supplied progression-stage metadata (1-indexed).
  const stage = item.progressionStages?.[0]?.stage;
  if (typeof stage === 'number' && stage >= 1) {
    return Math.min(Math.max(0, stage - 1), phaseCount - 1);
  }
  // 4. Name keyword heuristic (last-resort, brittle by design).
  const n = (item.name ?? '').toLowerCase();
  if (/(early|acute|protect|isometric|prom\b|gentle|settle|offload)/.test(n)) return 0;
  if (/(return.to.sport|return.to.run|plyometric|power|sport.specific|end.stage|maintenance)/.test(n)) {
    return phaseCount - 1;
  }
  if (/(strength|loading|progressive|resisted|arom\b|remodel|eccentric|hsr)/.test(n)) {
    return Math.min(Math.max(1, Math.floor(phaseCount / 2)), phaseCount - 1);
  }
  // 5. Fallback: current stage.
  return Math.min(Math.max(0, currentIdx), phaseCount - 1);
}

/** Build a deterministic stableId for a Case-Specific plan item so it
 *  can be promoted into the session-wide customExercises /
 *  customTechniques arrays AND scheduled as an Intervention on the
 *  active branch without losing identity across re-renders. The "cs_"
 *  prefix lets the dashboard cheaply detect which items were sourced
 *  from the AI case-specific plan vs. authored elsewhere. */
function caseItemStableId(phaseId: string, kind: 'ex' | 'mt', idx: number, name: string): string {
  const s = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return `cs_${phaseId}_${kind}_${idx}_${s || 'item'}`;
}

/** Condition-aware goal headline per stage for the acute-tissue-healing
 *  archetype — preserved verbatim so existing cases (rotator cuff tear, ACL,
 *  ankle sprain, post-surgical, muscle strain) render unchanged. Other
 *  archetypes use their own stage.subtitle which is already
 *  archetype-specific and tissue-aware. */
function acuteStageGoal(stageIdx: number, tissue?: string, painMechanism?: string): string {
  const t = (tissue ?? 'generic').toLowerCase();
  const central = painMechanism === 'central' || painMechanism === 'neuropathic';
  switch (stageIdx) {
    case 0:
      if (central) return 'Desensitize · pain education · gentle movement';
      if (t === 'tendon') return 'Isometric load below pain threshold · offload';
      if (t === 'nerve' || t === 'disc') return 'Decompress · neural glides · positional relief';
      if (t === 'joint') return 'Effusion control · pain-free AROM';
      if (t === 'muscle' || t === 'ligament') return 'Protect · PRICE · pain-free isometrics';
      if (t === 'bone') return 'Immobilize / protect · monitor union';
      return 'Settle pain · protect tissue · gentle motion';
    case 1:
      if (t === 'tendon') return 'Isotonic loading · slow heavy resistance build-up';
      if (t === 'nerve' || t === 'disc') return 'Directional preference · nerve mobility · core endurance';
      if (t === 'joint') return 'Restore ROM · open & closed-chain control';
      if (t === 'muscle') return 'Concentric → eccentric strength · length restore';
      if (t === 'ligament') return 'Proprioception · graded loading in stable range';
      if (t === 'bone') return 'Progressive weight-bearing · early loading';
      return 'Rebuild capacity through progressive loading';
    case 2:
      if (t === 'tendon') return 'Heavy slow resistance · energy-storage prep';
      if (t === 'nerve' || t === 'disc') return 'Multi-plane loading · trunk dissociation';
      if (t === 'joint') return 'End-range strength · symmetric power';
      if (t === 'muscle') return 'High-velocity eccentrics · sport patterns';
      if (t === 'ligament') return 'Reactive control · cutting / pivoting prep';
      if (t === 'bone') return 'Plyo-prep · bone-loading drills';
      return 'Reintroduce impact and power';
    default:
      if (t === 'tendon') return 'Plyometrics · energy-storage · sport drills';
      if (t === 'nerve' || t === 'disc') return 'Full-load tasks · workplace / sport simulation';
      if (t === 'joint') return 'RTS testing · symmetry & confidence';
      if (t === 'muscle') return 'Sport-specific sprint / cut · max-velocity';
      if (t === 'ligament') return 'RTS battery · reactive agility';
      if (t === 'bone') return 'Full-load return · monitor for stress reaction';
      return 'Restore full performance · return to activity';
  }
}

function MiniChart({
  series,
  scrubWeek,
  totalWeeks,
  onScrub,
  height = 220,
  showGrid = true,
  showWeekLabel = true,
  axisUnit = 'WEEK',
  markers,
  onWeekAddClick,
  uncertaintyHalfWidth,
  showBands = true,
  baselineSeries,
  checkInMarkers,
}: {
  series: { label: string; color: string; values: number[]; dash?: string }[];
  /** Task #241 — original (pre-checkin) projection rendered behind the
   *  live series in a faded form, so clinicians can see how the live
   *  curve has bent away from the original prediction. */
  baselineSeries?: { color: string; values: number[] }[];
  /** Task #241 — clinician check-in datapoints rendered as small
   *  pulse circles on the chart. */
  checkInMarkers?: { week: number; pain: number; flare?: boolean }[];
  scrubWeek?: number;
  totalWeeks: number;
  onScrub?: (w: number) => void;
  height?: number;
  showGrid?: boolean;
  showWeekLabel?: boolean;
  /** Optional secondary click handler — fired with the resolved week when
   *  the chart is clicked. Used by the Treatment Timeline Builder to open
   *  the intervention palette directly from a chart click while preserving
   *  the existing scrub behaviour. */
  onWeekAddClick?: (week: number) => void;
  /** Label unit shown on x-axis ticks and the scrub cursor. Set to
   *  'CHECKPOINT' for purely criterion-gated archetypes; default 'WEEK'
   *  preserves the legacy display for time-gated and hybrid archetypes. */
  axisUnit?: 'WEEK' | 'CHECKPOINT';
  /** Optional event markers rendered as colored vertical lines + flag
   *  glyphs at specific weeks. Used by the natural-recovery driver
   *  model to surface plateau / recurrence / chronic detection points
   *  directly on the chart timeline. */
  markers?: { week: number; color: string; label: string; glyph?: string }[];
  /** Task #242 — per-week half-width (in 0–100 chart units) used to
   *  paint a translucent confidence band around each non-dashed
   *  series. When omitted no bands are drawn. The same array is
   *  applied to every solid series; dashed series (e.g. risk
   *  overlays) are left as plain lines to avoid visual noise. */
  uncertaintyHalfWidth?: number[];
  /** Visible toggle for the bands. The toggle UI itself lives in the
   *  parent — this prop just gates rendering. Default true. */
  showBands?: boolean;
}) {
  const width = 720;
  const padding = { top: 14, right: 16, bottom: 26, left: 36 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;
  const yMin = 0;
  const yMax = 100;

  const xFor = (w: number) => padding.left + (totalWeeks > 0 ? (w / totalWeeks) * cw : 0);
  const yFor = (v: number) => padding.top + (1 - (v - yMin) / (yMax - yMin)) * ch;
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');

  /** Build a closed polygon (upper edge → reversed lower edge) for
   *  the confidence band around a single series. Half-widths are
   *  clamped so the polygon never escapes the [0,100] chart range. */
  const bandPath = (vals: number[], halfW: number[]): string => {
    if (vals.length === 0 || halfW.length === 0) return '';
    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      const h = halfW[i] ?? halfW[halfW.length - 1] ?? 0;
      const hi = Math.max(yMin, Math.min(yMax, v + h));
      const lo = Math.max(yMin, Math.min(yMax, v - h));
      upper.push({ x: xFor(i), y: yFor(hi) });
      lower.push({ x: xFor(i), y: yFor(lo) });
    }
    const top = upper.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const bot = lower.slice().reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${top} ${bot} Z`;
  };

  const bandsActive = !!(showBands && uncertaintyHalfWidth && uncertaintyHalfWidth.length > 0);
  // Per-series scrub readouts (expected + low/high when bands are
  // active). Used both by the on-chart dots and the readout panel.
  const scrubReadouts = scrubWeek != null ? series.map(s => {
    const idx = Math.max(0, Math.min(s.values.length - 1, scrubWeek));
    const exp = s.values[idx];
    const h = bandsActive && uncertaintyHalfWidth ? (uncertaintyHalfWidth[idx] ?? 0) : 0;
    return {
      label: s.label,
      color: s.color,
      dash: s.dash,
      expected: exp,
      low: Math.max(yMin, exp - h),
      high: Math.min(yMax, exp + h),
      hasBand: bandsActive && !s.dash,
    };
  }) : [];

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onScrub && !onWeekAddClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (width / rect.width);
    const wf = (relX - padding.left) / cw;
    const wk = Math.round(Math.max(0, Math.min(totalWeeks, wf * totalWeeks)));
    if (onScrub) onScrub(wk);
    if (onWeekAddClick) onWeekAddClick(wk);
  };

  const weekTicks = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * totalWeeks));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleClick}
      className={onScrub ? 'cursor-crosshair' : ''}
      preserveAspectRatio="none"
    >
      {showGrid && [0, 25, 50, 75, 100].map(v => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={padding.left + cw} y2={y} stroke="#1f2937" strokeWidth={0.6} strokeDasharray="3,3" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={9}>{v}%</text>
          </g>
        );
      })}
      {showGrid && weekTicks.map((w, i) => (
        <text key={i} x={xFor(w)} y={height - 8} textAnchor="middle" fill="#6b7280" fontSize={9}>{axisUnit === 'CHECKPOINT' ? 'Checkpoint' : 'Week'} {w}</text>
      ))}

      {bandsActive && uncertaintyHalfWidth && series.map((s, i) => {
        if (s.dash) return null; // Skip dashed/secondary series — band on those is noisy.
        return (
          <path
            key={`band-${i}`}
            d={bandPath(s.values, uncertaintyHalfWidth)}
            fill={s.color}
            opacity={0.13}
            stroke="none"
            style={{ transition: 'opacity 350ms ease-out' }}
          >
            <title>{`${s.label} confidence band — wider where uncertainty is higher`}</title>
          </path>
        );
      })}

      {/* Task #241 — faded original projection drawn behind the live
          series so the clinician can see how check-in data has bent
          the prediction away from the pre-checkin baseline. */}
      {baselineSeries && baselineSeries.map((bs, i) => (
        <path
          key={`baseline-${i}`}
          d={path(bs.values)}
          fill="none"
          stroke={bs.color}
          strokeWidth={1.4}
          strokeDasharray="2,3"
          opacity={0.35}
        />
      ))}

      {series.map((s, i) => (
        <path key={i} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />
      ))}

      {/* Task #241 — actual logged pain values pinned on the chart so
          the live curve visibly anchors through every check-in. */}
      {checkInMarkers && checkInMarkers.map((m, i) => {
        const x = xFor(Math.max(0, Math.min(totalWeeks, m.week)));
        const y = yFor(Math.max(0, Math.min(100, m.pain)));
        return (
          <g key={`ckin-${i}-${m.week}`}>
            <title>{`Logged check-in · week ${m.week} · pain ${m.pain}${m.flare ? ' · flare' : ''}`}</title>
            <circle cx={x} cy={y} r={4} fill="#ef4444" stroke="#ffffff" strokeWidth={1.2} opacity={0.95} />
            {m.flare && (
              <circle cx={x} cy={y} r={7} fill="none" stroke="#fb923c" strokeWidth={1} opacity={0.85} />
            )}
          </g>
        );
      })}

      {scrubWeek != null && scrubReadouts.map((r, i) => {
        const cx = xFor(scrubWeek);
        const cyExp = yFor(r.expected);
        return (
          <g key={`sr-${i}`}>
            {r.hasBand && (
              <line
                x1={cx} y1={yFor(r.high)} x2={cx} y2={yFor(r.low)}
                stroke={r.color} strokeWidth={1} opacity={0.55}
              />
            )}
            <circle cx={cx} cy={cyExp} r={3} fill={r.color} stroke="#0b1220" strokeWidth={1}>
              <title>{`${r.label}: ${r.expected.toFixed(0)}${r.hasBand ? ` (range ${r.low.toFixed(0)}–${r.high.toFixed(0)})` : ''}`}</title>
            </circle>
          </g>
        );
      })}

      {markers && markers.map((m, i) => {
        const x = xFor(Math.max(0, Math.min(totalWeeks, m.week)));
        return (
          <g key={`mk-${i}-${m.week}`}>
            <title>{m.label}</title>
            <line x1={x} y1={padding.top} x2={x} y2={padding.top + ch} stroke={m.color} strokeWidth={1} strokeDasharray="2,2" opacity={0.85} />
            <g transform={`translate(${x - 7}, ${padding.top + 1})`}>
              <rect width={14} height={12} rx={2} fill={m.color} opacity={0.9} />
              <text x={7} y={9} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{m.glyph ?? '!'}</text>
            </g>
          </g>
        );
      })}

      {scrubWeek !== undefined && (
        <g>
          <line x1={xFor(scrubWeek)} y1={padding.top} x2={xFor(scrubWeek)} y2={padding.top + ch} stroke="#a855f7" strokeWidth={1.4} />
          {showWeekLabel && (
            <g transform={`translate(${xFor(scrubWeek) - 30}, ${padding.top - 12})`}>
              <rect width={60} height={16} rx={3} fill="#a855f7" />
              <text x={30} y={11} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">{axisUnit === 'CHECKPOINT' ? 'Checkpoint' : 'Week'} {scrubWeek}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

function MetricBar({ label, value, max = 100, suffix, color, severity }: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  color: string;
  severity?: 'good' | 'mod' | 'bad';
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const sevColor = severity === 'good' ? 'text-emerald-300' : severity === 'bad' ? 'text-red-300' : 'text-amber-300';
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-gray-300">{label}</span>
        <span className={`font-mono ${sevColor}`}>{typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}{suffix ?? ''}</span>
      </div>
      <div className="h-1.5 bg-gray-800/80 rounded">
        <div className="h-1.5 rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function severityFor(value: number, inverse = false): 'good' | 'mod' | 'bad' {
  if (inverse) return value < 30 ? 'good' : value > 60 ? 'bad' : 'mod';
  return value > 70 ? 'good' : value < 30 ? 'bad' : 'mod';
}

/** Per-phase block surfacing 1–3 electrophysical-agent recommendations
 *  filtered + ranked by phase fit. Pure presentational component;
 *  matching logic lives in `@/lib/electroPhaseMatcher`. */
function PhaseElectroBlock({
  phaseId, phaseLabel, phaseIndex, totalPhases, primaryGoal,
  electrophysicalPlan, conditionLabel,
  onOpenElectroTab, onGenerateElectroPlanForPhase,
}: {
  phaseId: string;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  primaryGoal: string;
  electrophysicalPlan: ElectrophysicalPlan | null;
  conditionLabel: string;
  onOpenElectroTab?: () => void;
  onGenerateElectroPlanForPhase?: (req: { condition: string; stage: 'acute' | 'subacute' | 'chronic'; phaseLabel: string }) => void;
}) {
  // Stage chosen for the inline "Generate" CTA: derived from phase
  // position (early → acute, middle → subacute, late → chronic).
  const inferredStage: 'acute' | 'subacute' | 'chronic' = useMemo(() => {
    if (totalPhases <= 1) return 'subacute';
    const ratio = phaseIndex / Math.max(1, totalPhases - 1);
    if (ratio <= 0.25) return 'acute';
    if (ratio >= 0.75) return 'chronic';
    return 'subacute';
  }, [phaseIndex, totalPhases]);

  const matches = useMemo(
    () => matchModalitiesForPhase(electrophysicalPlan, {
      phaseLabel, primaryGoal, phaseIndex, totalPhases,
    }, 3),
    [electrophysicalPlan, phaseLabel, primaryGoal, phaseIndex, totalPhases],
  );

  const gradeChipClass = (g?: string) => {
    if (g === 'A') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (g === 'B') return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    if (g === 'C') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-gray-700/40 text-gray-300 border-gray-600/40';
  };

  // Empty-plan state: surface inline CTA so the clinician can spawn the
  // engine without leaving the timeline.
  if (!electrophysicalPlan) {
    return (
      <div
        className="mt-1 pt-1 border-t border-teal-700/30 flex items-center justify-between gap-2 text-[10px]"
        data-testid={`phase-electro-empty-${phaseId}`}
      >
        <div className="flex items-center gap-1 text-teal-300/80 min-w-0">
          <Waves className="h-3 w-3 shrink-0" />
          <span className="truncate">No Electrophysical Agents plan yet for this case.</span>
        </div>
        {onGenerateElectroPlanForPhase && (
          <button
            type="button"
            onClick={() => onGenerateElectroPlanForPhase({
              condition: conditionLabel,
              stage: inferredStage,
              phaseLabel,
            })}
            className="shrink-0 text-[10px] py-1 px-1.5 rounded border border-teal-600/50 bg-teal-950/40 hover:bg-teal-900/50 text-teal-200 inline-flex items-center gap-1"
            data-testid={`phase-electro-generate-${phaseId}`}
            title={`Generate Electrophysical Agents (EPA) plan for ${conditionLabel || 'this case'} (${inferredStage})`}
          >
            <Sparkles className="h-2.5 w-2.5" />Generate Electrophysical Agents plan
          </button>
        )}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div
        className="mt-1 pt-1 border-t border-teal-700/30 flex items-center justify-between gap-2 text-[10px] text-gray-400"
        data-testid={`phase-electro-nomatch-${phaseId}`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <Waves className="h-3 w-3 text-teal-400/70 shrink-0" />
          <span className="truncate">No modality clearly suited to this phase.</span>
        </div>
        {onOpenElectroTab && (
          <button
            type="button"
            onClick={onOpenElectroTab}
            className="shrink-0 text-[10px] text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
            data-testid={`phase-electro-open-${phaseId}`}
          >
            View full plan<ExternalLink className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-1 pt-1 border-t border-teal-700/30 flex flex-col gap-1"
      data-testid={`phase-electro-${phaseId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-teal-400/80 font-semibold">
          <Waves className="h-3 w-3" />Electrophysical Agents (EPA) for this phase
        </div>
        {onOpenElectroTab && (
          <button
            type="button"
            onClick={onOpenElectroTab}
            className="text-[9px] text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
            data-testid={`phase-electro-open-${phaseId}`}
          >
            View full plan<ExternalLink className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      <ul className="space-y-0.5">
        {matches.map((m, i) => {
          const dose = dosingOneLiner(m.modality);
          return (
            <li
              key={`${m.groupId}-${i}`}
              className="flex items-start gap-1 text-[10px] text-teal-100"
              data-testid={`phase-electro-modality-${phaseId}-${i}`}
            >
              <span className="opacity-60 mt-0.5">•</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-medium truncate">{m.modality.modality}</span>
                  {m.modality.evidenceGrade && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-px rounded-full border ${gradeChipClass(m.modality.evidenceGrade)}`}
                      title={m.modality.evidenceJustification || `Evidence grade ${m.modality.evidenceGrade}`}
                    >
                      <Award className="h-2 w-2" />{m.modality.evidenceGrade}
                    </span>
                  )}
                  {m.matchedOn.length > 0 && (
                    <span className="text-[8px] text-teal-400/70 italic" title={`matched on ${m.matchedOn.join(', ')}`}>
                      fit
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-teal-200/80 leading-snug truncate" title={dose}>
                  {dose}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function RecoverySimulatorDashboard({
  initialInput,
  conditionLabel,
  patientName,
  patientMeta,
  goalLabel,
  goalWeeks,
  onClose,
  onApplyState,
  hasClinicalInput,
  customExercises,
  customTechniques,
  conditionContext,
  onSkeletonSlotMount,
  onGeneratePhaseExerciseRx,
  onGeneratePhaseManualRx,
  onAddCustomExercises,
  onAddCustomTechniques,
  onRemoveCustomItem,
  aiNaturalTimeline,
  caseSpecificPlan,
  caseSpecificPlanLoading,
  caseSpecificPlanError,
  onRetryCaseSpecificPlan,
  naturalTimelineLoading,
  naturalTimelineSlot,
  patientContextBadge,
  electrophysicalPlan,
  onOpenElectroTab,
  onGenerateElectroPlanForPhase,
  skeletonBiasInputs,
  patientModifiers,
  patientFactorsOverrideCount,
  patientFactorsFilledCount,
  derivedDrivers,
}: Props) {
  const [input, setInput] = useState<SimulationInput>(() => ({ ...defaultInput(), ...(initialInput ?? {}) }));
  const [branches, setBranches] = useState<ScenarioBranch[]>(() => [defaultBranch(defaultInput())]);
  const [activeBranchId, setActiveBranchId] = useState<string>('plan_active');
  const [scrubWeek, setScrubWeek] = useState(0);
  const [activeTab, setActiveTab] = useState<'timeline' | 'skeleton'>('timeline');
  const [animate, setAnimate] = useState(false);
  const [autoSyncSkeleton, setAutoSyncSkeleton] = useState(true);
  // Comparison baseline is selected dynamically below as the closest passive
  // baseline to the active projection's trajectory.
  const [goalMode] = useState<GoalMode>('fastest_function');
  const [showInterventionEditor, setShowInterventionEditor] = useState(false);
  const [timelinePaletteWeek, setTimelinePaletteWeek] = useState<number | null>(null);
  const [showRemoveTreatment, setShowRemoveTreatment] = useState(false);
  const [showLoadAdjust, setShowLoadAdjust] = useState(false);
  const [loadAdjustPercent, setLoadAdjustPercent] = useState(20);
  // Per-card expand state for trimmed criteria/treatments lists. Each set
  // holds the phase ids whose list is currently expanded; refreshing the
  // page resets to collapsed.
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(() => new Set());
  const [expandedTreatments, setExpandedTreatments] = useState<Set<string>>(() => new Set());
  // Per-card collapsed state. Cards are expanded by default; collapsing
  // hides everything below the header (status row + phase name).
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(() => new Set());
  const togglePhaseSet = (id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Per-phase Exercise Rx + Manual Therapy Rx state. Each phase id maps
  // to one entry per kind, tracking loading / error / generated items
  // and whether they've been promoted into the simulation's
  // customExercises / customTechniques arrays.
  type PhaseRxKindState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; exercises?: CustomExerciseInput[]; techniques?: CustomManualTechniqueInput[]; added: boolean };
  type PhaseRxEntry = { exercise: PhaseRxKindState; manual: PhaseRxKindState };
  const emptyEntry = (): PhaseRxEntry => ({ exercise: { status: 'idle' }, manual: { status: 'idle' } });
  const [phaseRx, setPhaseRx] = useState<Map<string, PhaseRxEntry>>(() => new Map());
  const updatePhaseRx = useCallback((phaseId: string, kind: 'exercise' | 'manual', state: PhaseRxKindState) => {
    setPhaseRx(prev => {
      const next = new Map(prev);
      const cur = next.get(phaseId) ?? emptyEntry();
      next.set(phaseId, { ...cur, [kind]: state });
      return next;
    });
  }, []);

  // AI Optimizer Recommendation card — concrete exercise + manual
  // therapy items generated for the phase that contains the current
  // scrub week. Mirrors PhaseRxKindState but is scoped to the
  // optimizer card so it lives independently from per-phase generation.
  const [optimizerEx, setOptimizerEx] = useState<PhaseRxKindState>({ status: 'idle' });
  const [optimizerExOpen, setOptimizerExOpen] = useState(true);
  const [optimizerMtOpen, setOptimizerMtOpen] = useState(true);
  const [optimizerMt, setOptimizerMt] = useState<PhaseRxKindState>({ status: 'idle' });

  // Custom (user-authored) treatment composer — funnels into the same
  // customExercises / customTechniques pipeline AI items use, plus
  // schedules an Intervention on the active branch at the chosen week
  // so the recovery curve responds identically.
  const [customOpen, setCustomOpen] = useState(false);
  const [customKind, setCustomKind] = useState<'exercise' | 'manual'>('exercise');
  const [customName, setCustomName] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [customClinicalTarget, setCustomClinicalTarget] = useState('');
  const [customSets, setCustomSets] = useState('3');
  const [customReps, setCustomReps] = useState('10');
  const [customTempo, setCustomTempo] = useState('');
  const [customDuration, setCustomDuration] = useState('30s');
  const [customGrade, setCustomGrade] = useState('III');
  const [customDepth, setCustomDepth] = useState('');
  const [customFrequency, setCustomFrequency] = useState('3x/week');
  const [customStartWeek, setCustomStartWeek] = useState<number | null>(null);
  const [customPhaseIdx, setCustomPhaseIdx] = useState<number | null>(null);
  const [customJustAdded, setCustomJustAdded] = useState<string | null>(null);

  useEffect(() => {
    if (initialInput) setInput(prev => ({ ...prev, ...initialInput }));
  }, [initialInput]);

  // Escape closes dashboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const customProfiles: TreatmentEffectProfile[] = useMemo(
    () => buildCustomTreatmentProfiles(customExercises, customTechniques),
    [customExercises, customTechniques],
  );

  /** stableIds of case-specific exercises/techniques that have already
   *  been promoted into the session-wide custom arrays (and therefore
   *  also exist as bars on the recovery timeline). Drives the
   *  "Add" → "On timeline" toggle on the case-specific phase items. */
  const addedCaseExStableIds = useMemo(() => {
    const s = new Set<string>();
    for (const ex of customExercises ?? []) {
      if (ex.stableId && ex.stableId.startsWith('cs_')) s.add(ex.stableId);
    }
    return s;
  }, [customExercises]);
  const addedCaseMtStableIds = useMemo(() => {
    const s = new Set<string>();
    for (const mt of customTechniques ?? []) {
      if (mt.stableId && mt.stableId.startsWith('cs_')) s.add(mt.stableId);
    }
    return s;
  }, [customTechniques]);
  const treatmentLookup = useMemo(() => {
    if (customProfiles.length === 0) return TREATMENT_BY_ID;
    const m = new Map(TREATMENT_BY_ID);
    for (const p of customProfiles) m.set(p.id, p);
    return m;
  }, [customProfiles]);

  const ctxForSim = conditionContext ?? undefined;

  /** Task #241 — Deterministic per-case identifier so weekly check-ins
   *  persist against the same case across reloads. We hash patient
   *  name + condition (the only identity inputs available at this
   *  level — the dashboard has no formal case entity). When neither is
   *  present we leave it empty so the panel surfaces a "set patient
   *  name & condition" hint instead of writing orphaned rows. */
  const caseId = useMemo(() => {
    const name = (patientName ?? '').trim().toLowerCase();
    const cond = (conditionContext?.conditionId ?? conditionLabel ?? '').trim().toLowerCase();
    if (!name && !cond) return '';
    const slug = `${name || 'patient'}__${cond || 'condition'}`
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64);
    return slug;
  }, [patientName, conditionContext, conditionLabel]);

  /** Task #241 — Live check-ins fetched from the server. Empty array
   *  while loading or when no caseId has been derived yet so all
   *  downstream simulator calls remain pure pre-checkin baselines. */
  const { data: weeklyCheckInRows = [] } = useQuery<WeeklyCheckInRecord[]>({
    queryKey: ['/api/recovery-weekly-check-ins', caseId],
    enabled: !!caseId,
  });
  const engineCheckIns = useMemo(
    () => toEngineCheckIns(weeklyCheckInRows),
    [weeklyCheckInRows],
  );
  const hasCheckIns = engineCheckIns.length > 0;

  /** Original (pre-checkin) projections — drive the faded baseline
   *  curve that sits behind the live curve. Only computed for the
   *  active branch since that's the only curve we mirror live. */
  const originalProjections = useMemo(
    () => branches.map(b => simulateBranch(input, b, 'usual_care', undefined, customProfiles, ctxForSim, aiNaturalTimeline ?? null)),
    [branches, input, customProfiles, ctxForSim, aiNaturalTimeline],
  );
  /** Live (with-checkin) projections — only differ from original
   *  projections once at least one check-in is logged. The check-in
   *  array is intentionally passed unconditionally so every branch
   *  stays in sync with the latest logged state. */
  const projections = useMemo(
    () => branches.map(b => simulateBranch(
      input, b, 'usual_care', undefined, customProfiles, ctxForSim, aiNaturalTimeline ?? null, engineCheckIns,
    )),
    [branches, input, customProfiles, ctxForSim, aiNaturalTimeline, engineCheckIns],
  );
  const activeBranch = useMemo(() => branches.find(b => b.id === activeBranchId) ?? branches[0], [branches, activeBranchId]);
  const activeProjection = useMemo(() => projections.find(p => p.branchId === activeBranchId) ?? projections[0], [projections, activeBranchId]);
  const originalActiveProjection = useMemo(
    () => originalProjections.find(p => p.branchId === activeBranchId) ?? originalProjections[0],
    [originalProjections, activeBranchId],
  );

  /** Pre-checkin pain trajectory used by the tracking-status verdict
   *  and the panel's "ahead / on / behind" chip. Always sourced from
   *  the original (no-checkin) projection so the comparison is
   *  apples-to-apples even after several check-ins have shifted the
   *  live curve. */
  const originalPainSeries = originalActiveProjection.timelines.symptoms.pain;
  const trackingVerdict = useMemo(
    () => deriveTracking(weeklyCheckInRows, originalPainSeries),
    [weeklyCheckInRows, originalPainSeries],
  );

  /** Default prescribed-sessions count for the new check-in form —
   *  derived from the active branch's interventions so the form
   *  reflects the live plan instead of a hard-coded number. */
  const defaultPrescribedPerWeek = useMemo(() => {
    const total = (activeBranch?.interventions ?? [])
      .reduce((sum, iv) => sum + Math.max(0, iv.sessionsPerWeek ?? 1), 0);
    return Math.max(1, Math.round(total));
  }, [activeBranch]);
  const baselines = useMemo(() => simulateNaturalHistoryBaselines(input, ctxForSim, aiNaturalTimeline ?? null), [input, ctxForSim, aiNaturalTimeline]);

  /** Skeleton-derived structural biases (Task #189). Recomputed live
   *  from the supplied skeleton snapshot + condition context so changes
   *  in joint angles, compensations, or pain mechanism flow straight
   *  into the natural-history curve and the bias panel. Not persisted. */
  const structuralBiases: StructuralBias[] = useMemo(
    () => computeStructuralBiases(conditionContext, skeletonBiasInputs ?? null),
    [conditionContext, skeletonBiasInputs],
  );

  /** Natural-history projection produced by the four-driver +
   *  skeleton-bias model. Replaces the old AI-aggregated baseline so
   *  the curve reflects irritability, load-vs-capacity, tissue
   *  capacity and sensitivity dynamics — modulated by the structural
   *  biases above and the case's offload-ability — and resolves into
   *  an A / B / C scenario with plateau, recurrence and chronic
   *  flags. Falls back to null when no condition context is available
   *  yet. */
  const naturalDriverModel: NaturalDriverProjection | null = useMemo(() => {
    if (!conditionContext) return null;
    const aiWeeks = aiNaturalTimeline?.overall_window_weeks?.expected;
    const horizonInput: SimulationInput = {
      ...input,
      totalWeeks: Math.max(4, Math.min(52, Math.round(aiWeeks ?? input.totalWeeks))),
    };
    return simulateNaturalDriverModel(horizonInput, conditionContext, structuralBiases, aiNaturalTimeline ?? null);
  }, [conditionContext, structuralBiases, aiNaturalTimeline, input]);

  const naturalProjection = naturalDriverModel?.projection ?? null;

  /** Mode toggle for the main chart. Defaults to 'natural' the first
   *  time an AI Natural Timeline result becomes available, then stays
   *  wherever the user puts it. Falls back to 'plan' (existing
   *  treatment projection) when no AI data is loaded. */
  const [chartMode, setChartMode] = useState<'natural' | 'plan'>('plan');
  const naturalAutoSetRef = useRef(false);
  useEffect(() => {
    // Auto-flip to "natural" the first time either an AI verdict OR
    // the driver-model natural projection becomes available so the
    // user lands on the new clinically honest baseline by default.
    if ((aiNaturalTimeline || naturalProjection) && !naturalAutoSetRef.current) {
      naturalAutoSetRef.current = true;
      setChartMode('natural');
    }
    if (!aiNaturalTimeline && !naturalProjection) naturalAutoSetRef.current = false;
  }, [aiNaturalTimeline, naturalProjection]);

  const usingNaturalChart = chartMode === 'natural' && !!naturalProjection;
  const displayProjection = usingNaturalChart && naturalProjection ? naturalProjection : activeProjection;
  const displayTotalWeeks = Math.max(1, displayProjection.states.length - 1);

  // Re-clamp scrub when total weeks change so the cursor never points
  // past the end of the displayed projection (e.g. user toggles from a
  // 24-week treatment plan back to a 12-week natural window).
  useEffect(() => {
    setScrubWeek(prev => Math.max(0, Math.min(prev, displayTotalWeeks)));
  }, [displayTotalWeeks]);

  // ─── Task #242: Curve confidence bands ───────────────────────────
  // Visible toggle (default ON) — clinicians can hide the bands when
  // they want a "clean" curve. State is session-scoped only.
  const [showBands, setShowBands] = useState<boolean>(true);
  // Assemble the four uncertainty signals from props the dashboard
  // already receives. Falls back to `patientFactorsOverrideCount` as
  // a proxy for filled-count when the parent hasn't threaded the
  // explicit count yet.
  const uncertaintySignals = useMemo(() => {
    const filledProxy = patientFactorsFilledCount ?? patientFactorsOverrideCount ?? 0;
    return assembleUncertaintySignals({
      patientFactorsFilledCount: filledProxy,
      aiNaturalTimeline: aiNaturalTimeline ?? null,
      naturalTimelineLoading,
      caseSpecificPlanLoading,
      caseSpecificPlanError: caseSpecificPlanError ?? null,
      // No check-in feed wired through to this dashboard yet —
      // Task #241 will bring `weeksSinceLastCheckIn` here once it
      // lands. Until then the helper applies the "no anchor"
      // contribution so the band is honest about the gap.
      weeksSinceLastCheckIn: null,
    });
  }, [
    patientFactorsFilledCount,
    patientFactorsOverrideCount,
    aiNaturalTimeline,
    naturalTimelineLoading,
    caseSpecificPlanLoading,
    caseSpecificPlanError,
  ]);
  // Target half-width per week. Animated via the hook below so the
  // band visibly tightens as the clinician fills more context.
  const targetBandHalfWidth = useMemo(
    () => computeBandHalfWidthByWeek(uncertaintySignals, { totalWeeks: displayTotalWeeks }),
    [uncertaintySignals, displayTotalWeeks],
  );
  const animatedBandHalfWidth = useAnimatedNumberArray(targetBandHalfWidth, 450);
  const uncertaintyDescription = useMemo(() => describeUncertainty(uncertaintySignals), [uncertaintySignals]);
  /** Pick the passive baseline closest to the active projection's trajectory
   *  (sum-of-squared-differences across pain, function, capacity & risk
   *  timelines) so the Compare panel always shows the most informative
   *  contrast for the user's current plan. */
  const baselineProj = useMemo(() => {
    const modes = Object.keys(baselines) as BaselineMode[];
    let best = baselines[modes[0]];
    let bestDist = Infinity;
    for (const m of modes) {
      const b = baselines[m];
      const len = Math.min(activeProjection.timelines.symptoms.pain.length, b.timelines.symptoms.pain.length);
      let d = 0;
      for (let i = 0; i < len; i++) {
        const dp = activeProjection.timelines.symptoms.pain[i] - b.timelines.symptoms.pain[i];
        const df = activeProjection.timelines.function.walking[i] - b.timelines.function.walking[i];
        const dc = activeProjection.timelines.capacity[i] - b.timelines.capacity[i];
        const dr = activeProjection.timelines.risk.reinjury[i] - b.timelines.risk.reinjury[i];
        d += dp * dp + df * df + dc * dc + dr * dr;
      }
      if (d < bestDist) { bestDist = d; best = b; }
    }
    return best;
  }, [baselines, activeProjection]);

  const optimizer = useMemo(
    () => optimizeSequence(input, activeProjection, goalMode, customProfiles, ctxForSim, scrubWeek),
    [input, activeProjection, goalMode, customProfiles, ctxForSim, scrubWeek],
  );
  const narrative = useMemo(() => generateNarrative(activeProjection, baselineProj), [activeProjection, baselineProj]);

  const stateAtScrub = displayProjection.states[Math.min(scrubWeek, displayProjection.states.length - 1)];
  const baselineState = displayProjection.states[0];

  // Auto-sync to skeleton
  useEffect(() => {
    if (autoSyncSkeleton && onApplyState && stateAtScrub && baselineState) {
      onApplyState({ week: scrubWeek, state: stateAtScrub, baselineState, branchName: displayProjection.branchName });
    }
  }, [autoSyncSkeleton, scrubWeek, stateAtScrub, baselineState, onApplyState, displayProjection.branchName]);

  // Animate playback
  const animateRef = useRef<number | null>(null);
  useEffect(() => {
    if (!animate) {
      if (animateRef.current) { clearInterval(animateRef.current); animateRef.current = null; }
      return;
    }
    animateRef.current = window.setInterval(() => {
      setScrubWeek(prev => {
        const next = prev + 1;
        if (next > displayTotalWeeks) { setAnimate(false); return prev; }
        return next;
      });
    }, 1000);
    return () => { if (animateRef.current) { clearInterval(animateRef.current); animateRef.current = null; } };
  }, [animate, displayTotalWeeks]);

  const addBranch = useCallback((mod: Partial<ScenarioBranch> & { name: string }) => {
    const base = activeBranch;
    const newBranch: ScenarioBranch = {
      ...base,
      ...mod,
      id: `branch_${Date.now()}`,
      baseBranchId: base.id,
      color: PALETTE[branches.length % PALETTE.length],
      interventions: [...base.interventions, ...(mod.interventions ?? [])],
      flareEvents: [...base.flareEvents, ...(mod.flareEvents ?? [])],
      reaggravationEvents: [...base.reaggravationEvents, ...(mod.reaggravationEvents ?? [])],
      loadAdjustments: [...base.loadAdjustments, ...(mod.loadAdjustments ?? [])],
      doseChanges: [...(base.doseChanges ?? []), ...(mod.doseChanges ?? [])],
      progressionHoldUntilWeek: mod.progressionHoldUntilWeek ?? base.progressionHoldUntilWeek,
    };
    setBranches(prev => [...prev, newBranch]);
    setActiveBranchId(newBranch.id);
  }, [activeBranch, branches.length]);

  const interventionIdCounterRef = useRef(0);
  const stableIdCounterRef = useRef(0);
  const genStableId = useCallback(() => {
    stableIdCounterRef.current += 1;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now().toString(36)}_${stableIdCounterRef.current}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);
  /** Refs kept in sync with the current archetype and stage index so
   *  the schedule-proposer callbacks (defined here, before those values
   *  are computed in the render body) can read the latest values
   *  without a temporal-dead-zone error. */
  const archetypeRef = useRef<ReturnType<typeof getArchetypeForCondition> | null>(null);
  const currentStageIdxRef = useRef<number>(0);

  const buildScheduleProposal = useCallback((treatmentId: string, startWeek: number) => {
    const customProfiles = buildCustomTreatmentProfiles(customExercises, customTechniques);
    const profile = customProfiles.find(p => p.id === treatmentId)
      ?? TREATMENT_LIBRARY.find(t => t.id === treatmentId);
    if (!profile) return undefined;
    const arch = archetypeRef.current;
    const stageIdx = currentStageIdxRef.current;
    const stage = arch ? arch.stages[Math.min(stageIdx, arch.stages.length - 1)] : undefined;
    // Map SimulationInput.acuity ('acute'|'subacute'|'chronic') to a 0–100
    // acuity score the proposer expects. Combine work + sport demand
    // into a single load-demand axis. Pull region tags from the
    // condition label as a low-effort hint.
    const acuityScore = input.acuity === 'acute' ? 85 : input.acuity === 'subacute' ? 55 : 25;
    const demand = Math.round(((input.workDemand ?? 0) + (input.sportDemand ?? 0)) / 2);
    const regionTags = (conditionContext?.conditionLabel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    return proposeScheduleForTreatment(profile, {
      currentWeek: startWeek,
      archetypeStageTags: stage?.treatmentTags ?? [],
      acuity: acuityScore,
      irritability: Math.round((input.irritability ?? 0) * 100) > 100
        ? input.irritability
        : (input.irritability <= 1 ? input.irritability * 100 : input.irritability),
      severity: input.conditionSeverity <= 1 ? input.conditionSeverity * 100 : input.conditionSeverity,
      primaryTissue: conditionContext?.primaryTissue,
      regionTags,
      age: conditionContext?.ageYears ?? undefined,
      romPercent: conditionContext?.baselineRomPercent,
      workSportDemand: demand,
      adherence: input.patientAdherence,
    });
  }, [customExercises, customTechniques, input.acuity, input.irritability, input.conditionSeverity,
      input.workDemand, input.sportDemand, input.patientAdherence, conditionContext]);

  const addInterventionToActiveBranch = useCallback((treatmentId: string, startWeek: number, endWeek?: number) => {
    interventionIdCounterRef.current += 1;
    const seq = interventionIdCounterRef.current;
    const uid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `${Date.now()}_${seq}_${Math.random().toString(36).slice(2, 8)}`;
    const proposal = buildScheduleProposal(treatmentId, startWeek);
    setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
      ...b,
      interventions: [...b.interventions, {
        id: `i_${uid}`,
        treatmentId,
        startWeek,
        doseMultiplier: 1,
        adherence: input.patientAdherence,
        sessionsPerWeek: proposal?.sessionsPerWeek,
        cadenceWeeks: proposal?.cadenceWeeks,
        endWeek: endWeek ?? proposal?.endWeek,
        taperWeeks: proposal?.taperWeeks,
        taperFinalDose: proposal?.taperFinalDose,
        scheduleSource: endWeek != null ? 'ai' : (proposal ? 'ai' : 'default'),
        scheduleRationale: proposal?.rationale,
      }],
    }));
  }, [activeBranchId, input.patientAdherence, buildScheduleProposal]);

  /** Patch arbitrary schedule fields on one intervention. */
  const updateInterventionSchedule = useCallback((interventionId: string, patch: Partial<Intervention>) => {
    setBranches(prev => prev.map(b => (
      b.id !== activeBranchId ? b : {
        ...b,
        interventions: b.interventions.map(iv => iv.id === interventionId
          ? { ...iv, ...patch, scheduleSource: patch.scheduleSource ?? 'manual' }
          : iv),
      }
    )));
  }, [activeBranchId]);

  /** Diff preview state for bulk re-frequency. Maps interventionId →
   *  the proposed schedule. While set, the UI renders a confirm panel
   *  showing per-field diffs and only commits on user confirmation. */
  type BulkDiffEntry = {
    interventionId: string;
    treatmentId: string;
    treatmentName: string;
    isManual: boolean;
    current: { sessionsPerWeek: number; cadenceWeeks: number; endWeek?: number; taperWeeks?: number; taperFinalDose?: number; oneOff?: boolean };
    proposed: { sessionsPerWeek: number; cadenceWeeks: number; endWeek?: number; taperWeeks?: number; taperFinalDose?: number; oneOff?: boolean };
    rationale: string;
  };
  const [bulkDiff, setBulkDiff] = useState<BulkDiffEntry[] | null>(null);
  const [bulkIncludeManual, setBulkIncludeManual] = useState(false);

  /** Compute proposals for every intervention and stage them in a diff
   *  preview. The preview must be confirmed before the changes are
   *  applied — no silent mutation. By default manual entries are
   *  preserved (skipped); the user can toggle to include them. */
  const reproposeAllSchedules = useCallback(() => {
    const branch = branches.find(b => b.id === activeBranchId);
    if (!branch) return;
    const customProfiles = buildCustomTreatmentProfiles(customExercises, customTechniques);
    const lookup = new Map<string, string>();
    TREATMENT_LIBRARY.forEach(t => lookup.set(t.id, t.name));
    customProfiles.forEach(p => lookup.set(p.id, p.name));
    const entries: BulkDiffEntry[] = branch.interventions.map(iv => {
      const proposal = buildScheduleProposal(iv.treatmentId, iv.startWeek);
      const isManual = iv.scheduleSource === 'manual';
      return {
        interventionId: iv.id,
        treatmentId: iv.treatmentId,
        treatmentName: lookup.get(iv.treatmentId) ?? iv.treatmentId,
        isManual,
        current: {
          sessionsPerWeek: iv.sessionsPerWeek ?? 3,
          cadenceWeeks: iv.cadenceWeeks ?? 1,
          endWeek: iv.endWeek,
          taperWeeks: iv.taperWeeks,
          taperFinalDose: iv.taperFinalDose,
          oneOff: iv.oneOff,
        },
        proposed: proposal ? {
          sessionsPerWeek: proposal.sessionsPerWeek,
          cadenceWeeks: proposal.cadenceWeeks,
          endWeek: proposal.endWeek,
          taperWeeks: proposal.taperWeeks,
          taperFinalDose: proposal.taperFinalDose,
          oneOff: proposal.oneOff,
        } : {
          sessionsPerWeek: iv.sessionsPerWeek ?? 3,
          cadenceWeeks: iv.cadenceWeeks ?? 1,
          endWeek: iv.endWeek,
          taperWeeks: iv.taperWeeks,
          taperFinalDose: iv.taperFinalDose,
          oneOff: iv.oneOff,
        },
        rationale: proposal?.rationale ?? '(no profile resolved)',
      };
    });
    setBulkDiff(entries);
  }, [activeBranchId, branches, customExercises, customTechniques, buildScheduleProposal]);

  /** Commit a previously-staged bulk diff. Manual entries are kept
   *  intact unless the user opted-in via bulkIncludeManual. */
  const commitBulkDiff = useCallback(() => {
    if (!bulkDiff) return;
    const proposalsById = new Map(bulkDiff.map(e => [e.interventionId, e]));
    setBranches(prev => prev.map(b => (
      b.id !== activeBranchId ? b : {
        ...b,
        interventions: b.interventions.map(iv => {
          const entry = proposalsById.get(iv.id);
          if (!entry) return iv;
          if (entry.isManual && !bulkIncludeManual) return iv;
          return {
            ...iv,
            sessionsPerWeek: entry.proposed.sessionsPerWeek,
            cadenceWeeks: entry.proposed.cadenceWeeks,
            endWeek: entry.proposed.endWeek,
            taperWeeks: entry.proposed.taperWeeks,
            taperFinalDose: entry.proposed.taperWeeks
              ? (entry.proposed.taperFinalDose ?? iv.taperFinalDose ?? 0.5)
              : undefined,
            oneOff: entry.proposed.oneOff,
            scheduleSource: 'ai',
            scheduleRationale: entry.rationale,
          };
        }),
      }
    )));
    setBulkDiff(null);
  }, [bulkDiff, activeBranchId, bulkIncludeManual]);

  /** Auto-recompute trigger: when the patient's clinical context
   *  changes materially (acuity, irritability, severity, demand,
   *  adherence, primary tissue, age), open the bulk diff preview so
   *  the clinician can choose to apply or dismiss the recomputed
   *  schedules. Manual fields stay protected by default. */
  const lastContextSigRef = useRef<string>('');
  useEffect(() => {
    const sig = JSON.stringify({
      a: input.acuity,
      i: Math.round((input.irritability ?? 0) * 100) / 100,
      s: Math.round((input.conditionSeverity ?? 0) * 100) / 100,
      w: input.workDemand, sp: input.sportDemand,
      ad: Math.round((input.patientAdherence ?? 0) * 100) / 100,
      t: conditionContext?.primaryTissue,
      ar: conditionContext?.archetypeId,
      age: conditionContext?.ageYears,
    });
    if (lastContextSigRef.current && lastContextSigRef.current !== sig) {
      const branch = branches.find(b => b.id === activeBranchId);
      if (branch && branch.interventions.length > 0) {
        // Defer to next tick so we don't fight an in-flight setBranches.
        setTimeout(() => reproposeAllSchedules(), 0);
      }
    }
    lastContextSigRef.current = sig;
    // Intentionally only react to the context fields — not to branch
    // identity churn — so we don't loop on our own state updates.
  }, [input.acuity, input.irritability, input.conditionSeverity, input.workDemand,
      input.sportDemand, input.patientAdherence, conditionContext?.primaryTissue,
      conditionContext?.archetypeId, conditionContext?.ageYears,
      activeBranchId, branches, reproposeAllSchedules]);

  const removeInterventionFromActive = useCallback((interventionId: string) => {
    // Look up the treatmentId synchronously from current state BEFORE
    // dispatching the update so the parent removal callback runs
    // deterministically (no reliance on updater side effects).
    const branch = branches.find(b => b.id === activeBranchId);
    const removed = branch?.interventions.find(i => i.id === interventionId);
    const removedTreatmentId = removed?.treatmentId;
    setBranches(prev => prev.map(b => (
      b.id !== activeBranchId ? b : { ...b, interventions: b.interventions.filter(i => i.id !== interventionId) }
    )));
    if (removedTreatmentId && onRemoveCustomItem && isCustomTreatmentId(removedTreatmentId)) {
      onRemoveCustomItem(removedTreatmentId);
    }
  }, [activeBranchId, branches, onRemoveCustomItem]);

  const resetSimulation = useCallback(() => {
    setBranches([defaultBranch(defaultInput())]);
    setActiveBranchId('plan_active');
    setScrubWeek(0);
    setAnimate(false);
  }, []);

  // Archetype-driven stage strip. The simulation engine still emits the
  // four biological HealingPhases; the archetype maps those onto its own
  // stages (variable count 3-5) so the dashboard renders condition-
  // appropriate phase cards (tendinopathy load-capacity, OA capacity-build,
  // mechanical-impingement criterion stages, frozen-shoulder freezing/
  // frozen/thawing, etc.) instead of the same four-phase healing model
  // for every condition.
  const archetype = useMemo(() => {
    // Trust the archetypeId precomputed by the classifier when available; only
    // fall back to label-based resolution for legacy contexts that lack it.
    const precomputed = conditionContext?.archetypeId;
    if (precomputed && RECOVERY_ARCHETYPES[precomputed]) {
      return RECOVERY_ARCHETYPES[precomputed];
    }
    return getArchetypeForCondition(conditionContext?.conditionId, conditionContext?.conditionLabel);
  }, [conditionContext?.archetypeId, conditionContext?.conditionId, conditionContext?.conditionLabel]);
  /** Current-stage detection. Time-gated archetypes use the engine's
   *  HealingPhase mapping (legacy behaviour). Criterion-gated archetypes
   *  use the highest stage whose entry criteria are all met at scrub.
   *  Hybrid archetypes take the *minimum* of those two so a patient who
   *  has had enough biological time but hasn't earned the gates is still
   *  shown on the earlier stage (and vice-versa). */
  const scrubbedStageIdx = useMemo(() => {
    const phaseIdx = stageIndexForHealingPhase(archetype, stateAtScrub.healingPhase);
    if (archetype.progressionMode === 'time-gated') return phaseIdx;
    const critIdx = highestStageMetByCriteria(archetype, stateAtScrub);
    if (archetype.progressionMode === 'criterion-gated') return critIdx;
    return Math.min(phaseIdx, critIdx);
  }, [archetype, stateAtScrub]);

  // Keep schedule-proposer refs in sync so callbacks defined earlier
  // in this component body (before archetype/scrubbedStageIdx are
  // computed) can read the latest archetype + current stage at call
  // time without temporal-dead-zone issues.
  useEffect(() => { archetypeRef.current = archetype; }, [archetype]);
  useEffect(() => { currentStageIdxRef.current = scrubbedStageIdx; }, [scrubbedStageIdx]);

  /** Display unit shown on chart axis and current-week badges. Purely
   *  criterion-gated archetypes show "Checkpoint" — the underlying
   *  index is still the engine's week count, but the unit communicates
   *  that progression is gated on milestones, not the calendar. Hybrid
   *  and time-gated archetypes keep the legacy "Week" copy. */
  const axisUnit: 'WEEK' | 'CHECKPOINT' = useMemo(
    () => (archetype.progressionMode === 'criterion-gated' ? 'CHECKPOINT' : 'WEEK'),
    [archetype.progressionMode],
  );
  const unitLabelTitle = axisUnit === 'CHECKPOINT' ? 'Checkpoint' : 'Week';

  /** Phase-bound end options for the per-treatment schedule editor.
   *  Maps each archetype stage label onto one of the engine's three
   *  HealingPhases (the engine cannot represent finer-grained
   *  pathology stages — first stage → inflammatory, last → remodeling,
   *  middle stages → proliferative). When no archetype is loaded we
   *  fall back to the raw biological-phase names. */
  const phaseEndOptions = useMemo<{ label: string; phase: HealingPhase }[]>(() => {
    const stages = archetype?.stages ?? [];
    if (stages.length === 0) {
      return [
        { label: 'inflammatory', phase: 'inflammatory' },
        { label: 'proliferative', phase: 'proliferative' },
        { label: 'remodeling', phase: 'remodeling' },
      ];
    }
    const last = stages.length - 1;
    const out: { label: string; phase: HealingPhase }[] = [];
    const seen = new Set<HealingPhase>();
    stages.forEach((s, idx) => {
      const phase: HealingPhase = idx === 0
        ? 'inflammatory'
        : idx >= last
          ? 'remodeling'
          : 'proliferative';
      // De-duplicate so a 4+ stage archetype doesn't produce two
      // identical "proliferative" rows — keep the first label hit.
      if (seen.has(phase)) return;
      seen.add(phase);
      out.push({ label: s.name.toLowerCase(), phase });
    });
    return out;
  }, [archetype]);

  // Tissue Stress (inverse of loadTolerance — high stress when tolerance is low)
  const tissueStress = useMemo(() => {
    const tol = displayProjection.timelines.tissue.loadTolerance[Math.min(scrubWeek, displayProjection.timelines.tissue.loadTolerance.length - 1)] ?? 0;
    return Math.max(0, Math.min(100, 100 - tol));
  }, [displayProjection, scrubWeek]);

  // Function aggregate
  const functionScore = useMemo(() => (stateAtScrub.walking + stateAtScrub.stairs + stateAtScrub.squat) / 3, [stateAtScrub]);

  // Pain marker scale factor for cue
  const painFactor = useMemo(() => {
    if (!stateAtScrub || !baselineState) return 1;
    return baselineState.pain > 0.001 ? Math.max(0, Math.min(2, stateAtScrub.pain / baselineState.pain)) : (stateAtScrub.pain > 0.001 ? 1 : 0);
  }, [stateAtScrub, baselineState]);

  // Best Next Action from optimizer (week-aware)
  const bestAction = { action: `Introduce ${optimizer.bestNextAction}`, rationale: optimizer.bestNextRationale };
  const altAction = optimizer.alternativeAction;
  const bestActionTreatment = useMemo(() => {
    return TREATMENT_LIBRARY.find(t => t.id === optimizer.bestNextActionId) ?? TREATMENT_LIBRARY[0];
  }, [optimizer.bestNextActionId]);

  // Per-phase view-model. All fields are sourced from the existing
  // simulation projection, the Goal-Driven Recovery Engine
  // (generateGoalProfile) and the Patient-Factors / Condition Recovery
  // profile so each card reflects *this patient's* case rather than a
  // textbook description.
  const tissueProfile = conditionContext ? tissueProfileForContext(conditionContext) : null;
  const conditionProfile = useMemo(
    () => findConditionProfile(conditionLabel ?? conditionContext?.conditionLabel ?? ''),
    [conditionLabel, conditionContext?.conditionLabel],
  );
  const goalProfile: RecoveryGoalProfile | null = useMemo(
    () => (conditionProfile ? generateGoalProfile(conditionProfile) : null),
    [conditionProfile],
  );
  type PhaseInfo = {
    stage: RecoveryStage;
    stageIndex: number;
    start: number;
    end: number;
    reached: boolean;
    isCurrent: boolean;
    expectedStart: number; expectedEnd: number;       // expected weeks from condition profile / archetype
    strategy: string;                                  // tissue/pain-mechanism (acute) or stage subtitle
    goalDimension: string;                             // e.g. "Pain", "ROM", "Capacity"
    goalTargetText: string | null;                     // e.g. "≤2/10", "≥75%"
    goalCurrentText: string | null;                    // current end-of-phase value
    goalAchievement: number | null;                    // 0..1 progress toward target
    tissueLabel: string;                               // dominant compromised dimension label
    tissueStartText: string; tissueEndText: string;    // current → end-of-phase
    tissueImproved: boolean;
    flareNotes: string[];                              // "Flare wk 5 — DOMS"
    loadNotes: string[];                               // "Load +20% wk 8 — return to run"
    patientFactor: string | null;                      // phase-specific badge
    treatments: string[];
    treatmentSource: 'scheduled' | 'attribution' | 'stage_recommended';
    /** Entry-criterion evaluation at the scrub position. Populated for
     *  criterion-gated and hybrid archetypes only; null for time-gated
     *  archetypes (which keep the legacy week-range header). */
    criteriaAtScrub: StageCriteriaEvaluation | null;
    /** Earliest projection week at which this stage's entry criteria are
     *  fully met. null when the projection never satisfies them. Used
     *  for the "Modify Phase" entry-week hint and the projected-entry
     *  copy on locked cards. */
    projectedEntryWeek: number | null;
  };
  const phaseRanges = useMemo<PhaseInfo[]>(() => {
    const stages = archetype.stages;
    const tissue = conditionContext?.primaryTissue;
    const painMech = conditionContext?.painMechanism;
    const tl = activeProjection.timelines;
    const states = activeProjection.states;
    const isAcute = archetype.id === 'acute_tissue_healing';

    // Expected windows per archetype stage. When the bound condition
    // recovery profile has the same number of phases as the archetype,
    // we pull the expected durations from the profile (preserves all
    // existing acute-tissue cases). Otherwise we slice the total recovery
    // weeks using each stage's defaultFraction so 3-stage frozen-shoulder,
    // 5-stage criterion archetypes, etc. all get sensible windows.
    const expectedWindows: { start: number; end: number }[] = stages.map(() => ({ start: 0, end: 0 }));
    if (conditionProfile && conditionProfile.phases.length === stages.length) {
      let cursor = 0;
      stages.forEach((_, i) => {
        const p = conditionProfile.phases[i];
        const dur = (p.durationWeeksMin + p.durationWeeksMax) / 2;
        expectedWindows[i] = { start: Math.round(cursor), end: Math.round(cursor + dur) };
        cursor += dur;
      });
    } else {
      const total = conditionProfile
        ? conditionProfile.phases.reduce((sum, p) => sum + (p.durationWeeksMin + p.durationWeeksMax) / 2, 0)
        : input.totalWeeks;
      let cursor = 0;
      stages.forEach((s, i) => {
        const dur = Math.max(1, Math.round(total * s.defaultFraction));
        expectedWindows[i] = { start: Math.round(cursor), end: Math.round(cursor + dur) };
        cursor += dur;
      });
    }

    // Pick the dominant compromised dimension. Prefer the Goal-Driven
    // Recovery Engine's largest current-vs-target gap when a goal profile
    // is available; otherwise fall back to a tissue heuristic.
    type Dim = StageGoalDimension;
    const tissueDefault: Dim = (() => {
      switch (tissue) {
        case 'nerve':
        case 'disc':
          return 'pain';
        case 'joint':
          return 'rom';
        case 'muscle':
          return 'capacity';
        case 'tendon':
        case 'ligament':
        case 'bone':
        case 'fascia':
          return 'loadTolerance';
        default:
          return 'function';
      }
    })();
    const dominantDim: Dim = (() => {
      if (!goalProfile || activeProjection.states.length === 0) return tissueDefault;
      const s0 = activeProjection.states[0];
      const candidates: { d: Dim; gap: number }[] = [
        { d: 'pain',     gap: Math.max(0, (tl.symptoms.pain[0] / 10) - (goalProfile.painTarget / 10)) / 10 },
        { d: 'rom',      gap: Math.max(0, goalProfile.overallRomRecoveryPercent - s0.romPercent) / 100 },
        { d: 'capacity', gap: Math.max(0, goalProfile.strengthTarget - tl.capacity[0]) / 100 },
        { d: 'function', gap: goalProfile.functionalGoals[0]
            ? Math.max(0, goalProfile.functionalGoals[0].targetValue - tl.function.walking[0]) / 100
            : 0 },
      ];
      const winner = candidates.reduce((b, c) => c.gap > b.gap ? c : b, candidates[0]);
      return winner.gap > 0.05 ? winner.d : tissueDefault;
    })();
    const dimLabel: Record<Dim, string> = {
      pain: 'Pain', rom: 'ROM', capacity: 'Capacity', loadTolerance: 'Load tolerance', function: 'Function',
    };
    const dimUnit: Record<Dim, string> = { pain: '/10', rom: '%', capacity: '%', loadTolerance: '%', function: '%' };
    const lowerIsBetter: Record<Dim, boolean> = { pain: true, rom: false, capacity: false, loadTolerance: false, function: false };
    const readDim = (idx: number, d: Dim): number => {
      switch (d) {
        case 'pain': return tl.symptoms.pain[idx] / 10;
        case 'rom': return states[idx].romPercent;
        case 'capacity': return tl.capacity[idx];
        case 'loadTolerance': return tl.tissue.loadTolerance[idx];
        case 'function': return tl.function.walking[idx];
      }
    };

    // Per-stage milestone target. Each stage gets an evenly-spaced
    // fraction of the patient's current → goal trajectory (e.g. for a
    // 4-stage archetype: 25/50/75/100; for a 3-stage frozen shoulder:
    // 33/66/100). Stages may declare goalDimension to override the
    // dashboard's dominantDim — e.g. frozen shoulder's "Frozen" stage
    // targets ROM regardless of the dominant tissue gap.
    const stageDimFor = (s: RecoveryStage): Dim => s.goalDimension ?? dominantDim;
    const targetForStage = (idx: number, d: Dim): { value: number; text: string } | null => {
      if (!goalProfile) return null;
      const f = (idx + 1) / stages.length;
      const startVal = readDim(0, d);
      let terminal: number | null = null;
      switch (d) {
        // goalProfile.painTarget is on a 0-100 scale (5/10/15/20 typical),
        // while the simulation timeline + the card display use 0-10. Scale
        // here so the rendered text never reads "≤20/10".
        case 'pain': terminal = goalProfile.painTarget / 10; break;
        case 'rom': terminal = goalProfile.overallRomRecoveryPercent; break;
        case 'capacity': terminal = goalProfile.strengthTarget; break;
        case 'loadTolerance': terminal = goalProfile.strengthTarget; break;
        case 'function':
          terminal = goalProfile.functionalGoals[0]?.targetValue ?? null;
          break;
      }
      if (terminal === null || terminal === undefined) return null;
      const milestone = startVal + (terminal - startVal) * f;
      const compare = lowerIsBetter[d] ? '≤' : '≥';
      const r = Math.round(milestone * 10) / 10;
      return { value: milestone, text: `${compare}${r}${dimUnit[d]}` };
    };

    const usesCriteria = archetype.progressionMode !== 'time-gated';
    const ranges: PhaseInfo[] = stages.map((stage, i) => {
      const stageDim = stageDimFor(stage);
      return {
        stage, stageIndex: i,
        start: -1, end: -1, reached: false, isCurrent: false,
        expectedStart: expectedWindows[i].start,
        expectedEnd: expectedWindows[i].end,
        strategy: isAcute
          ? acuteStageGoal(i, tissue, painMech)
          : stage.subtitle,
        goalDimension: dimLabel[stageDim],
        goalTargetText: targetForStage(i, stageDim)?.text ?? null,
        goalCurrentText: null,
        goalAchievement: null,
        tissueLabel: dimLabel[stageDim],
        tissueStartText: '—', tissueEndText: '—', tissueImproved: false,
        flareNotes: [], loadNotes: [],
        patientFactor: null,
        treatments: [], treatmentSource: 'stage_recommended',
        criteriaAtScrub: usesCriteria ? evaluateStageCriteria(stage, stateAtScrub) : null,
        // For criterion-gated stages this is just the earliest week the
        // entry criteria are all satisfied. For hybrid stages it must
        // also respect the biological / time floor: a tendon won't be
        // ready for HSR at week 1 even if symptom scores happen to be
        // low. We patch in max(criteriaWeek, timeFloor) below once the
        // engine's own r.start / r.expectedStart values are known.
        projectedEntryWeek: usesCriteria ? earliestStageEntryWeek(stage, states) : null,
      };
    });

    // Place each simulation state onto its archetype stage by mapping the
    // engine's HealingPhase through the archetype.
    states.forEach((s, i) => {
      const stageIdx = stageIndexForHealingPhase(archetype, s.healingPhase);
      const r = ranges[stageIdx];
      if (r.start === -1) r.start = i;
      r.end = i;
      r.reached = true;
    });
    // The "NOW" indicator on each phase card must follow the same
    // progression-mode-aware rule as the chart's current-stage marker
    // (criterion-gated: highest stage whose entry criteria are met;
    // hybrid: min of phase and criterion indices; time-gated: phase).
    // Using scrubbedStageIdx keeps both UIs in lockstep.
    const currentStageIdx = scrubbedStageIdx;

    // Apply the hybrid time-floor to projected entry weeks. Criterion-met
    // alone can land at week 0, but a hybrid stage can't open before its
    // biological corridor begins — use the engine's actual r.start when
    // the stage was reached, else fall back to the expected start week
    // from the condition profile. Pure criterion-gated archetypes keep
    // the criteria-only week.
    if (archetype.progressionMode === 'hybrid') {
      ranges.forEach(r => {
        if (r.projectedEntryWeek === null) return;
        const timeFloor = r.start !== -1 ? r.start : r.expectedStart;
        r.projectedEntryWeek = Math.max(r.projectedEntryWeek, timeFloor);
      });
    }
    const attribIndex = new Map(activeProjection.attribution.map(a => [a.treatmentId, a.contributionPercent]));

    const fmtDim = (v: number, d: Dim) => `${Math.round(v * 10) / 10}${dimUnit[d]}`;

    ranges.forEach((r, idx) => {
      const stage = r.stage;
      const stageDim = stageDimFor(stage);
      r.isCurrent = idx === currentStageIdx;

      // Window used to map flare / load events onto this card. Reached
      // stages use their actual simulation span; unreached stages fall
      // back to the expected window from the condition profile so a
      // future event still shows on the right card.
      const winStart = r.reached ? r.start : r.expectedStart;
      const winEnd   = r.reached ? r.end   : r.expectedEnd;
      r.flareNotes = activeBranch.flareEvents
        .filter(f => f.week >= winStart && f.week <= winEnd)
        .slice(0, 2)
        .map(f => `Flare wk ${f.week}${f.cause ? ` — ${f.cause}` : ''}`);
      r.loadNotes = activeBranch.loadAdjustments
        .filter(l => l.week >= winStart && l.week <= winEnd)
        .slice(0, 2)
        .map(l => `Load ${l.deltaPercent >= 0 ? '+' : ''}${l.deltaPercent}% wk ${l.week}${l.label ? ` — ${l.label}` : ''}`);

      // Per-stage patient-factor badge: only show when *this* stage's
      // window appears affected.
      const expectedDur = r.expectedEnd - r.expectedStart;
      const actualDur = r.reached ? r.end - r.start + 1 : 0;
      const isLateStage = idx >= stages.length - 2;
      if (r.reached && expectedDur > 0 && actualDur > expectedDur * 1.15) {
        r.patientFactor = `Extended (+${actualDur - expectedDur} wk)`;
      } else if (!r.reached && conditionContext && conditionContext.patientPhaseTimingMult > 1.05) {
        r.patientFactor = `Delayed by patient factors (×${conditionContext.patientPhaseTimingMult.toFixed(2)})`;
      } else if (r.reached && tissueProfile && tissueProfile.phaseDurationMult > 1.15 && isLateStage) {
        r.patientFactor = `Tissue-driven slow phase (×${tissueProfile.phaseDurationMult.toFixed(2)})`;
      }

      // Window for this stage: use the engine's actual reached span when
      // available, otherwise fall back to the expected biological corridor.
      // Using the expected window for unreached stages lets auto-promoted
      // interventions (which place into the expected corridor) still show
      // up as the "scheduled" treatments for that phase card.
      const sIdx = r.reached ? r.start : r.expectedStart;
      const eIdx = r.reached ? r.end : r.expectedEnd;

      if (r.reached) {
        // Tissue status: dominant compromised dimension, current → end of stage
        const startVal = readDim(sIdx, stageDim);
        const endVal = readDim(eIdx, stageDim);
        r.tissueStartText = fmtDim(startVal, stageDim);
        r.tissueEndText = fmtDim(endVal, stageDim);
        r.tissueImproved = lowerIsBetter[stageDim] ? endVal <= startVal : endVal >= startVal;

        // Goal current-vs-target
        const tgt = targetForStage(idx, stageDim);
        r.goalCurrentText = fmtDim(endVal, stageDim);
        if (tgt) {
          r.goalTargetText = tgt.text;
          const range = Math.abs(tgt.value - startVal) || 1;
          const progress = lowerIsBetter[stageDim] ? (startVal - endVal) / range : (endVal - startVal) / range;
          r.goalAchievement = Math.max(0, Math.min(1, progress));
        }

        // Flare events / load adjustments landing in window — show the
        // first one with week + cause/label so it reads as a real event.
        r.flareNotes = activeBranch.flareEvents
          .filter(f => f.week >= sIdx && f.week <= eIdx)
          .slice(0, 2)
          .map(f => `Flare wk ${f.week}${f.cause ? ` — ${f.cause}` : ''}`);
        r.loadNotes = activeBranch.loadAdjustments
          .filter(l => l.week >= sIdx && l.week <= eIdx)
          .slice(0, 2)
          .map(l => `Load ${l.deltaPercent >= 0 ? '+' : ''}${l.deltaPercent}% wk ${l.week}${l.label ? ` — ${l.label}` : ''}`);
      }

      // Single source of truth: every treatment listed in this phase
      // box must correspond to an actual Intervention bar on the Gantt.
      // We derive the box from the active branch's interventions whose
      // startWeek falls in this stage's window. Auto-promotion (below)
      // ensures empty stages get default stage-recommended interventions
      // dropped on the branch — so the simulation curve always reflects
      // what the boxes display, and dragging/resizing/removing a bar
      // immediately re-bends the chart through the existing engine loop.
      // Interval-overlap classification: a bar belongs to this stage's
      // box whenever its [startWeek, endWeek] interval overlaps the
      // stage window — so dragging or resizing a bar (especially an
      // end-resize that extends across a phase boundary) immediately
      // re-classifies it on the right phase card.
      const scheduled = activeBranch.interventions
        .filter(i => {
          const ivStart = i.startWeek;
          const ivEnd = (typeof i.endWeek === 'number' && i.endWeek >= ivStart) ? i.endWeek : ivStart;
          return ivStart <= eIdx && ivEnd >= sIdx;
        })
        .map(i => {
          const t = treatmentLookup.get(i.treatmentId);
          const stageFit = t ? stageFitForTreatment(stage, t.healingStageMultiplier, t.name) : 1;
          return { name: t?.name ?? i.treatmentId, score: (attribIndex.get(i.treatmentId) ?? 0) + stageFit * 5, stageFit };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.name);
      r.treatments = scheduled;
      r.treatmentSource = 'scheduled';
    });
    return ranges;
  }, [archetype, activeProjection, activeBranch.interventions, activeBranch.flareEvents, activeBranch.loadAdjustments, treatmentLookup, conditionContext, tissueProfile, conditionProfile, goalProfile, input.totalWeeks, stateAtScrub, scrubbedStageIdx]);

  // ─── Auto-promote stage-recommended treatments into Gantt bars ──────
  // The phase boxes used to surface up to 3 stage-recommended treatments
  // per stage as plain labels — they were never materialised on the
  // active branch, so they never appeared on the Gantt and never bent
  // the recovery curve. Promoting them here turns each recommendation
  // into a real Intervention dropped on the active branch, anchored
  // inside the matching stage's window. The phase boxes already read
  // from the same `interventions` array, so add / drag / resize / remove
  // stays in lockstep automatically and re-bends the curve through the
  // existing simulateBranch loop.
  //
  // Idempotency: once a stage has been auto-handled for a given branch
  // (whether we promoted defaults or detected pre-existing coverage),
  // it is locked in `autoHandledStageIds` so removing a bar does not
  // silently re-add it. Cloned branches inherit the parent's
  // interventions, including any tagged auto-promotions, so the
  // detection step also marks those stages as handled to avoid doubling.
  const [autoHandledStageIds, setAutoHandledStageIds] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    if (!archetype || phaseRanges.length === 0) return;
    // Per-recommendation handled state: each entry is a `<stageId>::<treatmentId>`
    // pair. Tracking at this granularity (rather than per-stage) means:
    //   - Removing one auto-promoted bar locks ONLY that recommendation,
    //     so the other stage recommendations remain present and can be
    //     materialised on the next render if they're still missing.
    //   - Pre-existing user / cart / AI interventions in the same window
    //     no longer block stage recommendations from being promoted —
    //     recommendations are independent canonical items.
    // Global canonicalization: a treatment recommended for multiple
    // stages becomes ONE bar, deterministically placed on the earliest
    // (lowest-index) stage where it fits. We track every treatmentId
    // already canonicalized on the branch (regardless of source), and
    // every treatmentId we plan to add in this pass.
    const handled = autoHandledStageIds.get(activeBranchId) ?? new Set<string>();
    const newlyHandled = new Set<string>();
    const toAdd: Intervention[] = [];
    const branchTreatmentIds = new Set<string>(activeBranch.interventions.map(iv => iv.treatmentId));
    const planningTreatmentIds = new Set<string>();
    const horizon = input.totalWeeks ?? 24;
    for (const r of phaseRanges) {
      const stage = r.stage;
      // Match the phase-box window strategy exactly: reached stages use
      // the engine's actual span, unreached stages use the expected
      // biological corridor. This guarantees auto-promoted bars land in
      // the same stage's box that classifies them.
      const rawStart = r.reached ? r.start : r.expectedStart;
      const rawEnd = r.reached ? r.end : r.expectedEnd;
      // Clamp sIdx to horizon-1 first so that sIdx+1 (the minimum
      // valid eIdx) cannot overshoot horizon.
      const sIdx = Math.max(0, Math.min(horizon - 1, rawStart));
      const eIdx = Math.min(horizon, Math.max(sIdx + 1, Math.min(horizon, rawEnd)));
      const recs = TREATMENT_LIBRARY
        .filter(t => stageFitForTreatment(stage, t.healingStageMultiplier, t.name) >= 1.1)
        .slice(0, 3);
      for (const t of recs) {
        const recKey = `${stage.id}::${t.id}`;
        if (handled.has(recKey)) continue; // explicitly removed or already promoted
        // Cross-stage canonicalization: this treatmentId already lives
        // on the branch from a previous pass (auto, user, cart, or AI)
        // OR is being added by an earlier stage in this same pass.
        // Either way, only one bar exists for it — mark THIS rec
        // handled so we don't re-add and don't keep retrying.
        if (branchTreatmentIds.has(t.id) || planningTreatmentIds.has(t.id)) {
          newlyHandled.add(recKey);
          continue;
        }
        const proposal = buildScheduleProposal(t.id, sIdx);
        toAdd.push({
          id: `i_auto_${activeBranchId}_${stage.id}_${t.id}`,
          treatmentId: t.id,
          startWeek: sIdx,
          endWeek: proposal?.endWeek ?? eIdx,
          doseMultiplier: 1,
          adherence: input.patientAdherence,
          sessionsPerWeek: proposal?.sessionsPerWeek,
          cadenceWeeks: proposal?.cadenceWeeks,
          taperWeeks: proposal?.taperWeeks,
          taperFinalDose: proposal?.taperFinalDose,
          scheduleSource: 'default',
          scheduleRationale: `auto:phase:${stage.id}`,
        });
        planningTreatmentIds.add(t.id);
        newlyHandled.add(recKey);
      }
    }
    if (newlyHandled.size === 0) return;
    if (toAdd.length > 0) {
      setBranches(prev => prev.map(b =>
        b.id !== activeBranchId ? b : { ...b, interventions: [...b.interventions, ...toAdd] },
      ));
    }
    setAutoHandledStageIds(prev => {
      const next = new Map(prev);
      const merged = new Set<string>(prev.get(activeBranchId) ?? []);
      newlyHandled.forEach(id => merged.add(id));
      next.set(activeBranchId, merged);
      return next;
    });
  }, [phaseRanges, activeBranchId, autoHandledStageIds, archetype, activeBranch.interventions, input.patientAdherence, input.totalWeeks, buildScheduleProposal]);

  // ─── Auto-promote AI Case-Specific plan items into Gantt bars ──────
  // Mirrors the stage-recommended auto-promote above, but for the
  // techniques + exercises returned by the AI Case-Specific Treatment
  // Plan inside each phase card. Each item is materialised as:
  //   1. A CustomExerciseInput / CustomManualTechniqueInput on the
  //      session-wide custom arrays (so the engine consumes its
  //      synthesized profile via buildCustomTreatmentProfiles), AND
  //   2. An Intervention on the active branch anchored inside the
  //      matching stage's window — so it appears as a draggable Gantt
  //      bar and bends the recovery curve like every other treatment.
  // Idempotency: once a case item has been auto-promoted (or detected
  // as pre-existing) it is locked in `autoHandledCaseItems` so
  // removing its bar via the on-chart controls does NOT silently
  // re-add it. The per-item "+ Add" / section "Add all" buttons remain
  // available as a fallback / re-add path after removal.
  const [autoHandledCaseItems, setAutoHandledCaseItems] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    if (!caseSpecificPlan || phaseRanges.length === 0) return;
    if (!onAddCustomExercises && !onAddCustomTechniques) return;
    const handled = autoHandledCaseItems.get(activeBranchId) ?? new Set<string>();
    const newlyHandled = new Set<string>();
    const newExercises: CustomExerciseInput[] = [];
    const newTechniques: CustomManualTechniqueInput[] = [];
    const newInterventions: Intervention[] = [];
    const branchTreatmentIds = new Set<string>(activeBranch.interventions.map(iv => iv.treatmentId));
    const existingExStable = new Set<string>(
      (customExercises ?? []).map(ex => ex.stableId).filter((s): s is string => !!s),
    );
    const existingMtStable = new Set<string>(
      (customTechniques ?? []).map(mt => mt.stableId).filter((s): s is string => !!s),
    );
    const horizon = input.totalWeeks ?? 24;
    const rangeByStageId = new Map(phaseRanges.map(r => [r.stage.id, r]));
    for (const ph of caseSpecificPlan.phases) {
      const r = rangeByStageId.get(ph.phase_id);
      if (!r) continue;
      const rawStart = r.reached ? r.start : r.expectedStart;
      const rawEnd = r.reached ? r.end : r.expectedEnd;
      const sIdx = Math.max(0, Math.min(horizon - 1, rawStart));
      const eIdx = Math.min(horizon, Math.max(sIdx + 1, Math.min(horizon, rawEnd)));
      if (onAddCustomExercises) {
        ph.exercises.forEach((item, i) => {
          const stableId = caseItemStableId(ph.phase_id, 'ex', i, item.name);
          const csKey = `ex::${stableId}`;
          if (handled.has(csKey)) return;
          if (existingExStable.has(stableId)) { newlyHandled.add(csKey); return; }
          const ex: CustomExerciseInput = {
            name: item.name,
            clinicalTarget: item.target,
            dosage: { frequency: item.dosage },
            progressionStages: item.progression ? [{ stage: 1, name: item.progression }] : undefined,
            phaseIndex: r.stageIndex,
            phaseLabel: r.stage.name,
            userAuthored: false,
            stableId,
          };
          const treatmentId = buildCustomExerciseId(ex, 0);
          if (branchTreatmentIds.has(treatmentId)) { newlyHandled.add(csKey); return; }
          newExercises.push(ex);
          newInterventions.push({
            id: `i_cs_${activeBranchId}_${stableId}`,
            treatmentId,
            startWeek: sIdx,
            endWeek: eIdx,
            doseMultiplier: 1,
            adherence: input.patientAdherence,
            scheduleSource: 'ai',
            scheduleRationale: `auto:case:${ph.phase_id}`,
          });
          newlyHandled.add(csKey);
        });
      }
      if (onAddCustomTechniques) {
        ph.techniques.forEach((item, i) => {
          const stableId = caseItemStableId(ph.phase_id, 'mt', i, item.name);
          const csKey = `mt::${stableId}`;
          if (handled.has(csKey)) return;
          if (existingMtStable.has(stableId)) { newlyHandled.add(csKey); return; }
          const mt: CustomManualTechniqueInput = {
            name: item.name,
            clinicalTarget: item.target,
            dosage: { frequency: item.dosage, duration: item.dosage },
            progressionStages: item.progression ? [{ stage: 1, name: item.progression }] : undefined,
            phaseIndex: r.stageIndex,
            phaseLabel: r.stage.name,
            userAuthored: false,
            stableId,
          };
          const treatmentId = buildCustomTechniqueId(mt, 0);
          if (branchTreatmentIds.has(treatmentId)) { newlyHandled.add(csKey); return; }
          newTechniques.push(mt);
          newInterventions.push({
            id: `i_cs_${activeBranchId}_${stableId}`,
            treatmentId,
            startWeek: sIdx,
            endWeek: eIdx,
            doseMultiplier: 1,
            adherence: input.patientAdherence,
            scheduleSource: 'ai',
            scheduleRationale: `auto:case:${ph.phase_id}`,
          });
          newlyHandled.add(csKey);
        });
      }
    }
    if (newlyHandled.size === 0) return;
    if (newExercises.length > 0 && onAddCustomExercises) onAddCustomExercises(newExercises);
    if (newTechniques.length > 0 && onAddCustomTechniques) onAddCustomTechniques(newTechniques);
    if (newInterventions.length > 0) {
      setBranches(prev => prev.map(b =>
        b.id !== activeBranchId ? b : { ...b, interventions: [...b.interventions, ...newInterventions] },
      ));
    }
    setAutoHandledCaseItems(prev => {
      const next = new Map(prev);
      const merged = new Set<string>(prev.get(activeBranchId) ?? []);
      newlyHandled.forEach(id => merged.add(id));
      next.set(activeBranchId, merged);
      return next;
    });
  }, [caseSpecificPlan, phaseRanges, activeBranchId, autoHandledCaseItems, customExercises, customTechniques,
      activeBranch.interventions, input.patientAdherence, input.totalWeeks, onAddCustomExercises, onAddCustomTechniques]);

  // Compute scenario A vs B comparison summary lines from end-of-period deltas
  // Map the current scrub week onto the phase whose [start, end) range
  // contains it. The optimizer recommendation is anchored to this
  // phase — when the slider crosses a boundary we invalidate any
  // previously generated specific Rx so the user always sees items
  // tailored to where the patient currently is.
  const optimizerPhaseIdx = useMemo(() => {
    for (let i = phaseRanges.length - 1; i >= 0; i--) {
      const r = phaseRanges[i];
      const s = r.reached ? r.start : r.expectedStart;
      if (scrubWeek >= s) return i;
    }
    return 0;
  }, [phaseRanges, scrubWeek]);
  const lastOptimizerPhaseIdxRef = useRef(optimizerPhaseIdx);
  useEffect(() => {
    if (lastOptimizerPhaseIdxRef.current !== optimizerPhaseIdx) {
      setOptimizerEx({ status: 'idle' });
      setOptimizerMt({ status: 'idle' });
      lastOptimizerPhaseIdxRef.current = optimizerPhaseIdx;
    }
  }, [optimizerPhaseIdx]);

  const buildOptimizerReq = useCallback((): PhaseRxRequest => {
    // Mirror per-phase buildReq exactly (line 1490-1507 above): use the
    // phase start index for both the dosage anchor (phaseStartWeek) and
    // the pain-at-phase lookup. Slider position is captured in phaseId
    // so generations across weeks within the same phase don't dedupe.
    const r = phaseRanges[optimizerPhaseIdx];
    const startIdx = r ? (r.reached ? r.start : r.expectedStart) : scrubWeek;
    const safeIdx = Math.min(
      Math.max(0, startIdx),
      activeProjection.timelines.symptoms.pain.length - 1,
    );
    const painPct = (activeProjection.timelines.symptoms.pain[safeIdx] ?? 30) * 10;
    return {
      phaseId: `optimizer_idx${r?.stageIndex ?? optimizerPhaseIdx}_wk${scrubWeek}`,
      phaseLabel: r?.stage.name ?? optimizer.currentPhaseLabel,
      phaseStageIndex: r?.stageIndex ?? optimizerPhaseIdx,
      phaseStartWeek: startIdx,
      predictedPainAtPhase: Math.max(0, Math.min(100, painPct)),
      predictedGoalAchievementPct: Math.round(((r?.goalAchievement ?? 0)) * 100),
      goalDimensionLabel: r?.goalDimension ?? '',
      goalTargetText: r?.goalTargetText ?? null,
    };
  }, [phaseRanges, optimizerPhaseIdx, scrubWeek, activeProjection.timelines.symptoms.pain, optimizer.currentPhaseLabel]);

  const runOptimizerExercise = useCallback(async () => {
    if (!onGeneratePhaseExerciseRx) return;
    setOptimizerEx({ status: 'loading' });
    try {
      const items = await onGeneratePhaseExerciseRx(buildOptimizerReq());
      setOptimizerEx({ status: 'ready', exercises: items, added: false });
    } catch (err) {
      setOptimizerEx({ status: 'error', message: err instanceof Error ? err.message : 'Generation failed' });
    }
  }, [onGeneratePhaseExerciseRx, buildOptimizerReq]);

  const runOptimizerManual = useCallback(async () => {
    if (!onGeneratePhaseManualRx) return;
    setOptimizerMt({ status: 'loading' });
    try {
      const items = await onGeneratePhaseManualRx(buildOptimizerReq());
      setOptimizerMt({ status: 'ready', techniques: items, added: false });
    } catch (err) {
      setOptimizerMt({ status: 'error', message: err instanceof Error ? err.message : 'Generation failed' });
    }
  }, [onGeneratePhaseManualRx, buildOptimizerReq]);

  const runOptimizerCombination = useCallback(async () => {
    await Promise.all([
      onGeneratePhaseExerciseRx ? runOptimizerExercise() : Promise.resolve(),
      onGeneratePhaseManualRx ? runOptimizerManual() : Promise.resolve(),
    ]);
  }, [onGeneratePhaseExerciseRx, onGeneratePhaseManualRx, runOptimizerExercise, runOptimizerManual]);

  const scenarioComparison = useMemo(() => {
    const lastIdx = Math.min(
      activeProjection.timelines.symptoms.pain.length - 1,
      baselineProj.timelines.symptoms.pain.length - 1,
    );
    if (lastIdx < 0) return { a: [] as { text: string; tone: string }[], b: [] as { text: string; tone: string }[] };
    const aPain = activeProjection.timelines.symptoms.pain[lastIdx];
    const bPain = baselineProj.timelines.symptoms.pain[lastIdx];
    const aFn = activeProjection.timelines.function.walking[lastIdx];
    const bFn = baselineProj.timelines.function.walking[lastIdx];
    const aCap = activeProjection.timelines.capacity[lastIdx];
    const bCap = baselineProj.timelines.capacity[lastIdx];
    const aRisk = activeProjection.timelines.risk.reinjury[lastIdx];
    const bRisk = baselineProj.timelines.risk.reinjury[lastIdx];

    const tag = (good: boolean, text: string) => ({ tone: good ? 'text-emerald-300' : 'text-amber-300', text });
    const a: { text: string; tone: string }[] = [];
    const b: { text: string; tone: string }[] = [];

    if (aRisk < bRisk - 2) a.push(tag(true, `• Lower Risk (-${(bRisk - aRisk).toFixed(0)})`));
    else if (aRisk > bRisk + 2) a.push(tag(false, `• Higher Risk (+${(aRisk - bRisk).toFixed(0)})`));
    else a.push(tag(true, '• Comparable Risk'));

    if (aFn > bFn + 2) a.push(tag(true, `• Better Function (+${(aFn - bFn).toFixed(0)}%)`));
    else if (aFn < bFn - 2) a.push(tag(false, `• Slower Function (${(aFn - bFn).toFixed(0)}%)`));
    else a.push(tag(true, '• Similar Function'));

    if (aCap > bCap + 2) a.push(tag(true, `• Better Capacity (+${(aCap - bCap).toFixed(0)}%)`));
    else a.push(tag(true, '• Better Long-Term'));

    if (bPain < aPain - 2) b.push({ tone: 'text-emerald-300', text: `• Feels Better Sooner (-${(aPain - bPain).toFixed(0)} pain)` });
    else b.push({ tone: 'text-amber-300', text: '• Slower Symptom Relief' });
    if (bRisk > aRisk + 2) b.push({ tone: 'text-amber-300', text: `• Higher Reinjury Risk (+${(bRisk - aRisk).toFixed(0)})` });
    else b.push({ tone: 'text-emerald-300', text: '• Comparable Risk' });
    if (bCap < aCap - 2) b.push({ tone: 'text-red-300', text: `• Slower Capacity (${(bCap - aCap).toFixed(0)}%)` });
    else b.push({ tone: 'text-emerald-300', text: '• Builds Capacity' });

    return { a, b };
  }, [activeProjection, baselineProj]);

  // Comparison scenario B — closest baseline
  const scenarioBSeries = useMemo(() => {
    const proj = baselineProj;
    return [
      { label: 'Pain',     color: '#ef4444', values: proj.timelines.symptoms.pain },
      { label: 'Function', color: '#06b6d4', values: proj.timelines.function.walking, dash: '3,2' },
      { label: 'Capacity', color: '#a855f7', values: proj.timelines.capacity, dash: '4,2' },
    ];
  }, [baselineProj]);

  const scenarioASeries = useMemo(() => [
    { label: 'Pain',     color: '#ef4444', values: activeProjection.timelines.symptoms.pain },
    { label: 'Function', color: '#06b6d4', values: activeProjection.timelines.function.walking, dash: '3,2' },
    { label: 'Capacity', color: '#a855f7', values: activeProjection.timelines.capacity, dash: '4,2' },
  ], [activeProjection]);

  // Main timeline — Function / Capacity / Pain / Reinjury
  const mainSeries = useMemo(() => [
    { label: 'Function',       color: '#06b6d4', values: displayProjection.timelines.function.walking },
    { label: 'Tendon Capacity', color: '#22c55e', values: displayProjection.timelines.capacity },
    { label: 'Pain',           color: '#ef4444', values: displayProjection.timelines.symptoms.pain },
    { label: 'Reinjury Risk',  color: '#f59e0b', values: displayProjection.timelines.risk.reinjury, dash: '3,2' },
  ], [displayProjection]);

  // Header info
  const initials = (patientName ?? 'PT').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const conditionPill = conditionLabel ?? conditionContext?.conditionLabel ?? '';
  const conditionTag = conditionContext?.conditionId ? conditionContext.conditionId.replace(/_/g, ' ').toUpperCase() : (conditionLabel ?? '').toUpperCase().slice(0, 18);

  // Alert: dominant clinical risk
  const alertCard = useMemo(() => {
    const irr = stateAtScrub.irritability;
    const flare = stateAtScrub.flareRisk;
    const reinj = stateAtScrub.reinjuryRisk;
    if (irr > 60) return { title: `${conditionContext?.primaryTissue ?? 'Tissue'} is Irritable`, body: 'High Risk if Load Increases Too Quickly', color: 'border-red-700/50 bg-red-950/30 text-red-200' };
    if (flare > 50) return { title: 'Elevated Flare Risk', body: `Flare risk ${flare.toFixed(0)} — keep loading conservative`, color: 'border-amber-700/50 bg-amber-950/30 text-amber-200' };
    if (reinj > 40) return { title: 'Watch Reinjury Risk', body: `Reinjury risk ${reinj.toFixed(0)} — gate progressions on capacity`, color: 'border-orange-700/50 bg-orange-950/30 text-orange-200' };
    return { title: 'Stable Loading Window', body: 'Conditions favor progressive loading', color: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200' };
  }, [stateAtScrub, conditionContext]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950/97 backdrop-blur-md text-gray-100" data-testid="recovery-sim-dashboard">
      {/* TOP HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800/80 bg-gray-900/70 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-xs border-violet-500/60 bg-violet-600/15 text-violet-100 hover:bg-violet-600/30 hover:text-white"
            data-testid="dashboard-back-to-skeleton"
            title="Back to Skeleton (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Skeleton
          </Button>
          <div className="h-5 w-px bg-gray-700/70" />
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-[12px]">P</div>
            <span className="text-sm font-semibold text-gray-100">physioGPT</span>
            <span className="text-xs text-gray-400 ml-1">Recovery Simulator</span>
          </div>
          {conditionTag && (
            <Badge className="bg-violet-700/40 text-violet-200 border-violet-600/40 text-[10px] uppercase tracking-wide">{conditionTag}</Badge>
          )}
          {patientContextBadge && (
            <div className="ml-1 flex items-center" data-testid="recovery-sim-patient-context-badge">
              {patientContextBadge}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-300 hover:text-white" data-testid="header-new-case"><FilePlus className="h-3 w-3 mr-1" />New Case</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-300 hover:text-white" data-testid="header-save"><Save className="h-3 w-3 mr-1" />Save</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-300 hover:text-white" data-testid="header-share"><Share2 className="h-3 w-3 mr-1" />Share</Button>
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">JD</div>
          <button onClick={onClose} className="ml-2 h-7 w-7 rounded hover:bg-gray-800/80 flex items-center justify-center text-gray-400 hover:text-white" data-testid="dashboard-close" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* PATIENT BANNER */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-800/80 bg-gray-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">{initials}</div>
          <div>
            <div className="text-sm font-semibold text-gray-100">{patientName ?? 'Patient'}</div>
            <div className="text-[10px] text-gray-400">{patientMeta ?? '—'}</div>
          </div>
        </div>
        <div className="border-l border-gray-700/60 pl-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Condition</div>
          <div className="text-xs text-gray-200 font-semibold">{conditionPill || 'Not set'}</div>
          <div className="text-[10px] text-gray-400">{input.acuity} · {tissueProfile ? `${tissueProfile.healingRateMult.toFixed(2)}× healing rate` : ''}</div>
        </div>
        <div className="border-l border-gray-700/60 pl-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Goal</div>
          <div className="text-xs text-gray-200 font-semibold">{goalLabel ?? 'Return to function'}</div>
          <div className="text-[10px] text-gray-400">in {goalWeeks ?? input.totalWeeks} weeks</div>
        </div>
        <div className="border-l border-gray-700/60 pl-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Optimization Mode</div>
          <div className="text-xs text-amber-300 font-semibold flex items-center gap-1"><Zap className="h-3 w-3" />FASTEST SAFE RETURN</div>
        </div>
      </div>

      {/* BODY GRID */}
      <div className="flex-1 grid gap-3 p-3 overflow-hidden xl:grid-cols-[260px_1fr_280px] grid-cols-1 min-h-0">
        {/* LEFT COLUMN — CURRENT STATE */}
        <aside className="overflow-y-auto space-y-3 pr-1">
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Current State</span>
              <Badge className="bg-violet-700/40 text-violet-200 border-violet-600/40 text-[9px]">Today · {unitLabelTitle} {scrubWeek}</Badge>
            </div>
            <div className={`rounded p-2 border ${alertCard.color} flex items-start gap-2`}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold">{alertCard.title}</div>
                <div className="text-[10px] opacity-90">{alertCard.body}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Key Metrics</div>
            <div className="space-y-2.5">
              {/* Pain is stored 0-100 in the engine but displayed on a 0-10 clinical scale.
                  pct = ((pain/10) / 10) * 100 = pain — bar fill matches engine value. */}
              <MetricBar label="Pain (0-10)" value={stateAtScrub.pain / 10} max={10} color="#ef4444" severity={severityFor(stateAtScrub.pain, true)} />
              <MetricBar label="Irritability" value={stateAtScrub.irritability} suffix="" color="#f97316" severity={severityFor(stateAtScrub.irritability, true)} />
              <MetricBar label="Tissue Capacity" value={stateAtScrub.capacity} suffix="%" color="#06b6d4" severity={severityFor(stateAtScrub.capacity)} />
              <MetricBar label="Function" value={functionScore} suffix="%" color="#22c55e" severity={severityFor(functionScore)} />
              <MetricBar label="Reinjury Risk" value={stateAtScrub.reinjuryRisk} color="#a855f7" severity={severityFor(stateAtScrub.reinjuryRisk, true)} />
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Tissue Snapshot</div>
            <div className="flex gap-2">
              <div className="h-14 w-14 rounded bg-gradient-to-br from-red-900/60 to-orange-700/40 border border-red-700/40 flex items-center justify-center">
                <Activity className="h-5 w-5 text-red-300" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-gray-100 font-semibold">{conditionContext?.primaryTissue ? `${conditionContext.primaryTissue.charAt(0).toUpperCase() + conditionContext.primaryTissue.slice(1)} Tissue` : 'Tissue'}</div>
                <ul className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                  {tissueProfile && <li>↓ Load Tolerance ({(tissueProfile.capacityCeiling).toFixed(0)} cap)</li>}
                  {conditionContext && conditionContext.scarLoad > 0 && <li>Scar load: {conditionContext.scarLoad.toFixed(0)}</li>}
                  {conditionContext && conditionContext.tissueLoad > 0 && <li>Tissue load: {conditionContext.tissueLoad.toFixed(0)}</li>}
                  {!conditionContext && <li className="italic text-gray-500">Add clinical findings to populate</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Task #241 — clinician weekly check-ins. Lives in the
              left aside so it's always visible alongside the chart. */}
          <WeeklyCheckInPanel
            caseId={caseId}
            totalWeeks={Math.max(1, input.totalWeeks)}
            originalPainSeries={originalPainSeries}
            defaultWeek={Math.max(1, scrubWeek || 1)}
            defaultPrescribed={defaultPrescribedPerWeek}
          />

          {!hasClinicalInput && (
            <div className="bg-amber-950/30 border border-amber-700/40 rounded p-2 text-[10px] text-amber-200">
              Add pain markers, scars, or muscle states to the 3D model so the simulation can animate your specific findings.
            </div>
          )}
        </aside>

        {/* CENTER COLUMN — TIMELINE / SKELETON
            overflow-y-auto (not overflow-hidden) so the column scrolls
            cleanly when chart + phase pills + treatment-timeline strip +
            phase cards exceed available height. Without this, the chart
            container's fixed-height children visually bleed under the
            phase-cards row. */}
        <main className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Timeline mode: `flex-1` stretches the card to fill on tall
              viewports; `min-h-[380px]` is an explicit floor that
              guarantees the chart (260px) + headings + legend always fit
              even when the phase-cards row is tall. We deliberately do
              NOT put `overflow-hidden` on the outer card here — in
              flexbox `overflow:hidden` zeroes the automatic min-size,
              which previously collapsed the card to 0px and hid the
              chart entirely. Chart-paint clipping is enforced one level
              down on the chart wrapper itself.
              Skeleton mode: `flex-1 min-h-0 overflow-hidden` so the
              live 3D viewer fills available space and shrinks without
              forcing the column to scroll. */}
          <div className={`bg-gray-900/60 border border-gray-800/80 rounded-lg p-3 flex-1 flex flex-col ${activeTab === 'skeleton' ? 'min-h-0 overflow-hidden' : 'min-h-[380px]'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${activeTab === 'timeline' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  data-testid="tab-timeline"
                >Recovery Timeline</button>
                <button
                  onClick={() => setActiveTab('skeleton')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${activeTab === 'skeleton' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  data-testid="tab-skeleton"
                >Skeleton View</button>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-300 cursor-pointer">
                Animate
                <input
                  type="checkbox"
                  checked={animate}
                  onChange={e => setAnimate(e.target.checked)}
                  className="sr-only"
                />
                <span className={`relative h-4 w-7 rounded-full transition ${animate ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${animate ? 'left-3.5' : 'left-0.5'}`} />
                </span>
              </label>
            </div>

            {activeTab === 'timeline' ? (
              <>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                      {usingNaturalChart ? 'Natural Recovery Trajectory' : 'Recovery Progression'}
                    </div>
                    {usingNaturalChart && aiNaturalTimeline && (
                      <Badge className="bg-violet-700/40 text-violet-200 border-violet-600/40 text-[9px]" data-testid="badge-natural-window">
                        AI window · ~{Math.round(aiNaturalTimeline.overall_window_weeks?.expected ?? displayTotalWeeks)} wk expected
                      </Badge>
                    )}
                    {naturalTimelineLoading && !aiNaturalTimeline && (
                      <span className="text-[9px] text-violet-300 italic flex items-center gap-1" data-testid="natural-timeline-loading-hint">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" />Loading natural history…
                      </span>
                    )}
                  </div>
                  {/* Mode toggle: only meaningful once an AI verdict exists */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Task #242 — confidence-band toggle */}
                    <button
                      onClick={() => setShowBands(v => !v)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${showBands ? 'bg-slate-700/60 border-slate-500/60 text-slate-100' : 'bg-gray-950/60 border-gray-800/80 text-gray-400 hover:text-gray-200'}`}
                      data-testid="toggle-confidence-bands"
                      title={`Confidence bands ${showBands ? 'on' : 'off'} — width reflects how complete & fresh the inputs are. Currently: ${uncertaintyDescription.band} (${uncertaintySignals.filledFactorCount}/${uncertaintySignals.totalFactorCount} fields filled${uncertaintySignals.aiConfidence > 0 ? `, AI confidence ${(uncertaintySignals.aiConfidence * 100).toFixed(0)}%` : ', no AI verdict yet'}${uncertaintySignals.sourceConflict > 0 ? ', source updating' : ''}).`}
                      aria-pressed={showBands}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm"
                          style={{ background: uncertaintyDescription.color, opacity: showBands ? 0.55 : 0.25 }}
                        />
                        Bands · {uncertaintyDescription.band}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 bg-gray-950/60 border border-gray-800/80 rounded p-0.5" role="tablist" aria-label="Chart mode">
                      <button
                        onClick={() => setChartMode('natural')}
                        disabled={!naturalProjection}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${chartMode === 'natural' && naturalProjection ? 'bg-violet-600/40 text-violet-100' : 'text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed'}`}
                        data-testid="chart-mode-natural"
                        title={naturalProjection ? 'Show AI-predicted natural healing trajectory' : 'Generate the natural-history timeline first'}
                      >Natural timeline</button>
                      <button
                        onClick={() => setChartMode('plan')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${chartMode === 'plan' ? 'bg-cyan-600/40 text-cyan-100' : 'text-gray-400 hover:text-gray-200'}`}
                        data-testid="chart-mode-plan"
                        title="Show the projection with the current treatment plan applied"
                      >With current plan</button>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-gray-500 mb-1">
                  {usingNaturalChart
                    ? 'Driver-model natural recovery (irritability, load vs capacity, tissue capacity, sensitivity) modulated by skeleton-derived structural biases — drag to scrub.'
                    : 'Drag timeline or modify treatments to see changes'}
                </div>
                <div className="h-[260px] shrink-0 overflow-hidden">
                  <MiniChart
                    series={mainSeries}
                    scrubWeek={scrubWeek}
                    totalWeeks={displayTotalWeeks}
                    onScrub={setScrubWeek}
                    height={240}
                    axisUnit={axisUnit}
                    onWeekAddClick={(wk) => setTimelinePaletteWeek(wk)}
                    uncertaintyHalfWidth={animatedBandHalfWidth}
                    showBands={showBands}
                    baselineSeries={
                      // Task #241 — only paint the faded "original"
                      // overlay once at least one check-in has bent
                      // the live curve, and only on the plan view
                      // (the natural-history view doesn't consume
                      // check-ins so an overlay would be identical).
                      hasCheckIns && !usingNaturalChart
                        ? [
                            { color: '#06b6d4', values: originalActiveProjection.timelines.function.walking },
                            { color: '#22c55e', values: originalActiveProjection.timelines.capacity },
                            { color: '#ef4444', values: originalActiveProjection.timelines.symptoms.pain },
                          ]
                        : undefined
                    }
                    checkInMarkers={
                      hasCheckIns && !usingNaturalChart
                        ? weeklyCheckInRows.map(c => ({
                            week: c.week,
                            pain: c.pain,
                            flare: (c.flareSeverity ?? 0) > 0,
                          }))
                        : undefined
                    }
                    markers={
                      usingNaturalChart && naturalDriverModel
                        ? [
                            ...(naturalDriverModel.flags.plateau && naturalDriverModel.flags.plateauWeek != null
                              ? [{ week: naturalDriverModel.flags.plateauWeek, color: '#f59e0b', glyph: 'P', label: `Plateau detected w${naturalDriverModel.flags.plateauWeek} — capacity gain stalled` }]
                              : []),
                            ...naturalDriverModel.flags.recurrenceWeeks.map(w => ({
                              week: w, color: '#fb923c', glyph: 'R',
                              label: `Recurrence-risk week ${w} — load > capacity & sensitivity elevated`,
                            })),
                            ...(naturalDriverModel.flags.chronic && naturalDriverModel.flags.chronicOnsetWeek != null
                              ? [{ week: naturalDriverModel.flags.chronicOnsetWeek, color: '#ef4444', glyph: 'C', label: `Chronic pathway onset w${naturalDriverModel.flags.chronicOnsetWeek} — sensitivity stuck high & capacity not improving` }]
                              : []),
                          ]
                        : undefined
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {mainSeries.map(s => (
                    <span key={s.label} className="flex items-center gap-1 text-[9px] text-gray-400">
                      <span className="w-2.5 h-0.5" style={{ background: s.color }} />{s.label}
                    </span>
                  ))}
                  {showBands && (
                    <span
                      className="flex items-center gap-1 text-[9px] text-gray-300 ml-2 pl-2 border-l border-gray-700/60"
                      data-testid="legend-confidence-band"
                      title={`Translucent band = uncertainty range around the expected curve. Tightens as you fill patient context, the AI verdict converges, and check-ins are recorded. Currently ${uncertaintyDescription.band} — ${uncertaintySignals.filledFactorCount}/${uncertaintySignals.totalFactorCount} fields filled${uncertaintySignals.aiConfidence > 0 ? `, AI confidence ${(uncertaintySignals.aiConfidence * 100).toFixed(0)}%` : ', no AI verdict yet'}.`}
                    >
                      <span className="relative inline-block w-3 h-2.5">
                        <span className="absolute inset-0 rounded-sm" style={{ background: '#94a3b8', opacity: 0.18 }} />
                        <span className="absolute left-0 right-0 top-1/2 h-px" style={{ background: '#cbd5e1' }} />
                      </span>
                      Confidence band ({uncertaintyDescription.band.toLowerCase()})
                    </span>
                  )}
                </div>

                {/* Task #242 — explicit low / expected / high readout
                    chip for the currently-scrubbed week. Real DOM
                    tooltip so the values are accessible without
                    relying on the SVG <title> hover. */}
                {showBands && scrubWeek != null && animatedBandHalfWidth.length > 0 && (
                  <div
                    className="mt-1.5 rounded-md border border-gray-700/50 bg-gray-900/60 px-2 py-1.5"
                    data-testid="scrub-band-readout"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[9px] uppercase tracking-wide text-gray-400">
                        At {axisUnit === 'CHECKPOINT' ? 'checkpoint' : 'week'} {scrubWeek}
                      </span>
                      <span className="text-[9px] text-gray-500">low · expected · high</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {mainSeries.map((s, i) => {
                        if (s.dash) return null;
                        const idx = Math.max(0, Math.min(s.values.length - 1, scrubWeek));
                        const exp = s.values[idx] ?? 0;
                        const h = animatedBandHalfWidth[idx] ?? 0;
                        const lo = Math.max(0, exp - h);
                        const hi = Math.min(100, exp + h);
                        return (
                          <span
                            key={`sb-${i}`}
                            className="flex items-center gap-1 text-[10px] text-gray-200 font-mono"
                          >
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />
                            <span className="text-gray-400">{s.label}:</span>
                            <span className="text-gray-500">{lo.toFixed(0)}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-100 font-semibold">{exp.toFixed(0)}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500">{hi.toFixed(0)}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Task #240 — "What's affecting this curve" panel.
                    Surfaces the top patient-factor multipliers (sorted by
                    |multiplier - 1|) so clinicians can see *why* the curve
                    looks the way it does. Driven by the modifierBreakdown
                    array on `patientModifiers`, computed from the
                    structured patient-factors form. */}
                {patientModifiers && patientModifiers.modifierBreakdown.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/15 p-2.5" data-testid="patient-factors-affecting-panel">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-amber-100">What&apos;s affecting this curve</span>
                        {patientFactorsOverrideCount && patientFactorsOverrideCount > 0 ? (
                          <Badge className="bg-amber-700/40 border-amber-600/60 text-amber-100 text-[9px]" title="Number of clinician-edited patient factors vs. auto-detected baseline">
                            {patientFactorsOverrideCount} edited
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-gray-400 italic">auto-detected</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        {/* Both workDemand and fearAvoidance live on the
                            same 0–100 scale used by the simulator
                            (`SimulationInput.workDemand` defaults to 50,
                            `RecoveryState.fearAvoidance` is 0–100). */}
                        {derivedDrivers && derivedDrivers.workDemand !== null && (
                          <Badge className="bg-cyan-800/40 border-cyan-600/60 text-cyan-100 text-[9px]" title={`Derived from: ${derivedDrivers.workDemandContributors.join(', ') || 'occupational fields'}`}>
                            workDemand {Math.round(derivedDrivers.workDemand)}/100
                          </Badge>
                        )}
                        {derivedDrivers && derivedDrivers.fearAvoidance !== null && (
                          <Badge className="bg-rose-800/40 border-rose-600/60 text-rose-100 text-[9px]" title={`Derived from: ${derivedDrivers.fearAvoidanceContributors.join(', ') || 'psychosocial fields'}`}>
                            fearAvoidance {Math.round(derivedDrivers.fearAvoidance)}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        // Top contributors must reflect *actual* applied
                        // model effects, not just any row in the audit
                        // trail. Informational-only rows (`direction:
                        // 'informational'`) are excluded from this top-N
                        // because they describe a factor whose multiplier
                        // is shown for transparency but is not applied
                        // to any model state variable.
                        const ranked = patientModifiers.modifierBreakdown
                          .filter(r => r.direction !== 'informational')
                          .sort((a, b) => Math.abs(b.multiplier - 1) - Math.abs(a.multiplier - 1));
                        const informationalCount = patientModifiers.modifierBreakdown.length - ranked.length;
                        return (
                          <>
                            {ranked.slice(0, 5).map((row, i) => {
                              const delta = row.multiplier - 1;
                              const helping = row.direction === 'helping';
                              // Direction-aware arrow: green up for helping,
                              // red down for hurting, regardless of which
                              // way the multiplier moved (e.g., a 0.85
                              // recurrenceRisk multiplier is helping).
                              const arrow = helping ? '▲' : '▼';
                              const color = helping ? 'text-emerald-300' : 'text-red-300';
                              const pct = Math.round(Math.abs(delta) * 100);
                              return (
                                <div key={`${row.factor}-${i}`} className="flex items-start justify-between gap-2 text-[10px] leading-snug" data-testid={`affecting-row-${i}`}>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-amber-100 font-semibold">{row.factor}</span>
                                    <span className="text-gray-400"> · {row.effect}</span>
                                  </div>
                                  <span className={`shrink-0 font-mono ${color}`} title={`Multiplier ×${row.multiplier.toFixed(2)} on ${row.targetMetric === 'multiple' ? 'multiple metrics' : row.targetMetric}`}>
                                    {arrow} {pct}%
                                  </span>
                                </div>
                              );
                            })}
                            {(ranked.length > 5 || informationalCount > 0) && (
                              <div className="mt-1 text-[9px] text-gray-500 italic">
                                {ranked.length > 5 && (
                                  <>+{ranked.length - 5} more applied factor{ranked.length - 5 === 1 ? '' : 's'} (smaller effect)</>
                                )}
                                {ranked.length > 5 && informationalCount > 0 && ' · '}
                                {informationalCount > 0 && (
                                  <>{informationalCount} informational row{informationalCount === 1 ? '' : 's'}</>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Task #189 — Natural-recovery driver model overlay.
                    Renders the four explicit drivers as a sub-chart, the
                    A/B/C scenario classification, the structural-bias
                    panel (with per-diagnosis relevance), and the
                    plateau / recurrence / chronic flag markers. Only
                    appears in "Natural timeline" mode. */}
                {usingNaturalChart && naturalDriverModel && (
                  <div className="mt-3 rounded-lg border border-violet-700/40 bg-violet-950/15 p-2.5" data-testid="natural-driver-panel">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] uppercase tracking-wide ${
                            naturalDriverModel.scenario === 'A' ? 'bg-emerald-700/40 text-emerald-100 border-emerald-600/60' :
                            naturalDriverModel.scenario === 'B' ? 'bg-amber-700/40 text-amber-100 border-amber-600/60' :
                                                                  'bg-red-700/40 text-red-100 border-red-600/60'
                          }`}
                          data-testid="natural-scenario-badge"
                          title={naturalDriverModel.scenarioRationale}
                        >Scenario {naturalDriverModel.scenarioLabel}</Badge>
                        <span className="text-[10px] text-gray-300">
                          Tissue family: <span className="font-semibold text-violet-200">{naturalDriverModel.family}</span>
                        </span>
                        <span className="text-[10px] text-gray-300" title={naturalDriverModel.offload.rationale}>
                          Offload: <span className={`font-semibold ${
                            naturalDriverModel.offload.label === 'good' ? 'text-emerald-300' :
                            naturalDriverModel.offload.label === 'fair' ? 'text-amber-300' : 'text-red-300'
                          }`}>{naturalDriverModel.offload.label} ({naturalDriverModel.offload.score.toFixed(0)})</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {naturalDriverModel.flags.plateau && (
                          <Badge className="bg-amber-800/40 border-amber-600/60 text-amber-100 text-[9px]" title={`Plateau onset around week ${naturalDriverModel.flags.plateauWeek}`}>
                            Plateau · w{naturalDriverModel.flags.plateauWeek ?? '?'}
                          </Badge>
                        )}
                        {naturalDriverModel.flags.recurrence && (
                          <Badge className="bg-orange-800/40 border-orange-600/60 text-orange-100 text-[9px]" title={`Natural flare cycles at: ${naturalDriverModel.flags.recurrenceWeeks.map(w => `w${w}`).join(', ')}`}>
                            Recurrence ×{naturalDriverModel.flags.recurrenceWeeks.length}
                          </Badge>
                        )}
                        {naturalDriverModel.flags.chronic && (
                          <Badge className="bg-red-800/40 border-red-600/60 text-red-100 text-[9px]" title="Predicted chronic / non-resolving trajectory">
                            Chronic
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-violet-200/80 italic mb-2" data-testid="natural-scenario-rationale">
                      {naturalDriverModel.scenarioRationale}
                    </div>
                    <div className="text-[9px] text-gray-400 mb-2 font-mono" data-testid="natural-trigger-counters">
                      Trigger counters · load&gt;cap streak {naturalDriverModel.flags.triggerCounters.loadOverCapacity}w · sens≥60 streak {naturalDriverModel.flags.triggerCounters.sensitivityStuckHigh}w · cap-stagnant streak {naturalDriverModel.flags.triggerCounters.capacityNotImproving}w
                    </div>

                    {/* Four-driver sub-chart */}
                    <div className="h-[140px] overflow-hidden rounded bg-gray-950/50 border border-gray-800/70">
                      <MiniChart
                        series={[
                          { label: DRIVER_LABELS.tissueCapacity, color: DRIVER_COLORS.tissueCapacity, values: naturalDriverModel.drivers.tissueCapacity },
                          { label: DRIVER_LABELS.loadVsCapacity, color: DRIVER_COLORS.loadVsCapacity, values: naturalDriverModel.drivers.loadVsCapacity, dash: '3,2' },
                          { label: DRIVER_LABELS.irritability,   color: DRIVER_COLORS.irritability,   values: naturalDriverModel.drivers.irritability },
                          { label: DRIVER_LABELS.sensitivity,    color: DRIVER_COLORS.sensitivity,    values: naturalDriverModel.drivers.sensitivity, dash: '4,2' },
                        ]}
                        scrubWeek={Math.min(scrubWeek, naturalDriverModel.drivers.tissueCapacity.length - 1)}
                        totalWeeks={Math.max(1, naturalDriverModel.drivers.tissueCapacity.length - 1)}
                        onScrub={setScrubWeek}
                        height={140}
                        showWeekLabel={false}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(['tissueCapacity','loadVsCapacity','irritability','sensitivity'] as const).map(k => (
                        <span key={k} className="flex items-center gap-1 text-[9px] text-gray-400">
                          <span className="w-2.5 h-0.5" style={{ background: DRIVER_COLORS[k] }} />{DRIVER_LABELS[k]}
                        </span>
                      ))}
                    </div>

                    {/* Task #239 — Dominant joint loads. Surfaces the
                        per-joint vector mix (compression / shear / tension)
                        that drives the vector-aware compensation_burden
                        bias and is the target of `loadModification`
                        treatments. Hidden when no high-status joints. */}
                    {(conditionContext?.jointLoadVectors ?? []).length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] uppercase tracking-wide text-amber-200 font-semibold mb-1.5">
                          Dominant joint loads
                        </div>
                        <div className="flex flex-wrap gap-1.5" data-testid="joint-load-vectors">
                          {(conditionContext!.jointLoadVectors ?? []).slice(0, 3).map(v => {
                            const dominantColor =
                              v.dominantComponent === 'shear' ? 'text-rose-300 border-rose-700/40 bg-rose-950/30' :
                              v.dominantComponent === 'tension' ? 'text-violet-300 border-violet-700/40 bg-violet-950/30' :
                              'text-amber-300 border-amber-700/40 bg-amber-950/30';
                            return (
                              <span
                                key={v.jointId}
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono ${dominantColor}`}
                                data-testid={`joint-load-${v.jointId}`}
                                title={`compression ${v.components.compression.toFixed(2)} • shear ${v.components.shear.toFixed(2)} • tension ${v.components.tension.toFixed(2)} BW`}
                              >
                                <span className="font-semibold">{v.label}</span>
                                <span className="opacity-80">— {v.dominantComponent}, {v.magnitudeBW.toFixed(1)}×BW</span>
                                <span className="opacity-60">· {v.dominantTissue}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Structural-bias panel — biases not relevant to
                        the active diagnosis are shown but de-emphasised
                        (struck-through label + dimmed bar) so the user
                        can see the full skeleton picture without losing
                        sight of which biases actually move the curve. */}
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wide text-violet-200 font-semibold mb-1.5">
                        Skeleton-derived structural biases
                      </div>
                      {naturalDriverModel.biases.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic">
                          No clinically meaningful structural bias detected from the current skeleton state.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5" data-testid="structural-bias-list">
                          {naturalDriverModel.biases.map(b => {
                            const w = relevantBiasWeight(naturalDriverModel.family, b.id);
                            const isRelevant = w > 0;
                            return (
                              <div
                                key={b.id}
                                className={`rounded border p-1.5 ${isRelevant ? 'border-violet-700/40 bg-gray-900/60' : 'border-gray-800/40 bg-gray-900/30 opacity-70'}`}
                                data-testid={`bias-${b.id}`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className={`text-[10px] font-semibold ${isRelevant ? 'text-violet-100' : 'text-gray-400 line-through'}`}>
                                    {b.label}
                                  </span>
                                  <span className={`text-[10px] font-mono ${isRelevant ? 'text-amber-300' : 'text-gray-500'}`}>
                                    {b.magnitude.toFixed(0)}
                                  </span>
                                </div>
                                <div className="h-1 rounded bg-gray-800/80 overflow-hidden mb-1">
                                  <div
                                    className={`h-full ${isRelevant ? 'bg-amber-400' : 'bg-gray-600'}`}
                                    style={{ width: `${b.magnitude}%` }}
                                  />
                                </div>
                                <div className={`text-[9px] ${isRelevant ? 'text-gray-300' : 'text-gray-500'}`}>
                                  {b.explanation}
                                  {!isRelevant && (
                                    <span className="text-gray-500 italic"> · not clinically relevant for {naturalDriverModel.family}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <TreatmentTimelinePanel
                  branch={activeBranch}
                  totalWeeks={displayTotalWeeks}
                  scrubWeek={scrubWeek}
                  treatmentLookup={treatmentLookup}
                  customProfiles={customProfiles}
                  paletteOpenAtWeek={timelinePaletteWeek}
                  onClosePalette={() => setTimelinePaletteWeek(null)}
                  onOpenPaletteAt={(wk) => setTimelinePaletteWeek(wk)}
                  onAddIntervention={(tid, wk, endWk) => addInterventionToActiveBranch(tid, wk, endWk)}
                  onRemoveIntervention={(id) => removeInterventionFromActive(id)}
                  onUpdateInterventionWeek={(id, wk) => {
                    // Bar drag = move the WHOLE window: shift endWeek by the same delta
                    // so duration is preserved, clamped to the simulator horizon.
                    const iv = activeBranch.interventions.find(x => x.id === id);
                    if (!iv) return;
                    const horizon = input.totalWeeks ?? 24;
                    const newStart = Math.max(0, Math.min(horizon - 1, wk));
                    if (iv.endWeek != null) {
                      const dur = Math.max(1, iv.endWeek - iv.startWeek);
                      const newEnd = Math.min(horizon, newStart + dur);
                      updateInterventionSchedule(id, { startWeek: newStart, endWeek: newEnd });
                    } else {
                      updateInterventionSchedule(id, { startWeek: newStart });
                    }
                  }}
                  onResizeIntervention={(id, wk) => {
                    const iv = activeBranch.interventions.find(x => x.id === id);
                    if (!iv) return;
                    const horizon = input.totalWeeks ?? 24;
                    const minEnd = iv.startWeek + 1;
                    updateInterventionSchedule(id, { endWeek: Math.min(horizon, Math.max(minEnd, wk)) });
                  }}
                  onResizeInterventionStart={(id, wk) => {
                    const iv = activeBranch.interventions.find(x => x.id === id);
                    if (!iv) return;
                    const maxStart = iv.endWeek != null ? iv.endWeek - 1 : wk;
                    updateInterventionSchedule(id, { startWeek: Math.max(0, Math.min(maxStart, wk)) });
                  }}
                  onClearInterventions={() => activeBranch.interventions.forEach(iv => removeInterventionFromActive(iv.id))}
                  conditionLabel={conditionLabel}
                />
              </>
            ) : (
              <div className="flex-1 min-h-[240px] rounded overflow-hidden border border-gray-800/60 bg-black relative" data-testid="dashboard-skeleton-slot">
                {/* Parent portals the SAME live PureThreeGLBViewer instance into this slot */}
                <div ref={onSkeletonSlotMount} className="absolute inset-0" data-testid="skeleton-portal-target" />
                {!onSkeletonSlotMount && (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-[11px] text-gray-400 px-4">
                    <div>
                      <Activity className="h-8 w-8 mx-auto text-cyan-400/70 mb-2" />
                      <div className="text-gray-200 font-semibold mb-1">Skeleton View Active</div>
                      <div>Markers ×{painFactor.toFixed(2)} on the underlying 3D skeleton. Close this dashboard to interact.</div>
                    </div>
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 bg-gray-900/70 border border-cyan-700/40 rounded px-1.5 py-0.5 text-[9px] text-cyan-200 pointer-events-none z-10">
                  Live · markers ×{painFactor.toFixed(2)} · {unitLabelTitle.toLowerCase()} {scrubWeek}
                </div>
              </div>
            )}


            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
              <span className="font-semibold">TREATMENT TIMELINE</span>
              <span>· Click any card to edit or drag to reschedule</span>
              <span className="ml-auto flex items-center gap-1">
                <Badge className="bg-violet-700/40 text-violet-200 border-violet-600/40 text-[9px]">{unitLabelTitle} {scrubWeek}</Badge>
                <button
                  onClick={() => setAnimate(!animate)}
                  className="h-5 w-5 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white"
                  data-testid="play-pause"
                  title={animate ? 'Pause' : 'Play'}
                >
                  {animate ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                </button>
                <span className="ml-2 text-[9px]">TISSUE STRESS</span>
                <span className="inline-flex h-1.5 w-20 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 relative">
                  <span className="absolute -top-0.5 h-2.5 w-0.5 bg-white" style={{ left: `${tissueStress}%` }} />
                </span>
                <span className={`text-[9px] ${tissueStress > 60 ? 'text-red-300' : tissueStress > 35 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {tissueStress > 60 ? 'High' : tissueStress > 35 ? 'Mod' : 'Low'}
                </span>
              </span>
            </div>
          {(() => {
            // Strip widths come from each phase's actual week span (reached
            // → simulation window, unreached → expected window from the
            // condition profile) so card boundaries map deterministically to
            // the same week axis the chart above uses.
            const cols = phaseRanges.map(r => {
              const span = r.reached
                ? Math.max(1, r.end - r.start + 1)
                : Math.max(1, r.expectedEnd - r.expectedStart);
              return `minmax(140px, ${span}fr)`;
            }).join(' ');
            return (
              <div
                className="grid gap-2 shrink-0"
                style={{ gridTemplateColumns: cols }}
                data-testid="phase-cards-row"
              >
                {phaseRanges.map((r) => {
                  const p = r.stage;
                  const sourceLabel = r.treatmentSource === 'scheduled' ? 'Scheduled'
                    : r.treatmentSource === 'attribution' ? 'Top driver'
                    : 'Recommended';
                  // Criterion-gated and hybrid archetypes drive their card
                  // headers off entry-criteria evaluation rather than the
                  // engine's week ranges. Time-gated archetypes keep the
                  // legacy "Week X–Y" / "Expected wk X–Y" / "NOT YET"
                  // header (acute, frozen shoulder, bone, post-op,
                  // radicular, disc).
                  const usesCriteriaCard = r.criteriaAtScrub !== null;
                  const crit = r.criteriaAtScrub;
                  const critUnlocked = crit ? crit.allMet : true;
                  const isHybrid = archetype.progressionMode === 'hybrid';
                  // Time-gate at the scrub position: the simulation has
                  // actually reached this stage by the current week.
                  // r.start is set to the first week the engine assigned
                  // this stage; -1 means it hasn't been reached at all.
                  const timeMetAtScrub = r.reached && r.start !== -1 && r.start <= scrubWeek;
                  // Lock semantics:
                  //   time-gated  → engine hasn't reached the stage yet
                  //   criterion   → entry criteria not all met
                  //   hybrid      → BOTH gates required (intersection),
                  //                 so the stage opens only once the soft
                  //                 biological corridor AND the milestone
                  //                 gates are satisfied.
                  const locked = isHybrid
                    ? !(critUnlocked && timeMetAtScrub)
                    : (usesCriteriaCard ? !critUnlocked : !r.reached);
                  const isCardCollapsed = collapsedCards.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg p-2 border ${p.ring} ${p.bg} ${locked ? 'opacity-80' : ''} flex flex-col gap-1`}
                      style={r.isCurrent ? { boxShadow: `0 0 0 2px ${p.color}88` } : undefined}
                      data-testid={`phase-card-${p.id}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-[9px] font-semibold uppercase truncate" style={{ color: p.color }}>
                          {usesCriteriaCard
                            ? (crit && crit.totalCount > 0
                                ? (critUnlocked
                                    ? `Unlocked · ${crit.metCount}/${crit.totalCount} met`
                                    : `Locked · ${crit.metCount}/${crit.totalCount} met`)
                                : 'Starting stage')
                            : (r.reached
                                ? `Week ${r.start}–${r.end}`
                                : `Expected wk ${r.expectedStart}–${r.expectedEnd}`)}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.isCurrent ? (
                            <Badge className="bg-gray-900/70 border-gray-700/60 text-[8px] py-0 px-1.5" style={{ color: p.color }}>NOW</Badge>
                          ) : locked ? (
                            <Badge className="bg-gray-800/70 text-gray-400 border-gray-700/50 text-[8px] py-0 px-1.5">
                              {usesCriteriaCard ? 'LOCKED' : 'NOT YET'}
                            </Badge>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => togglePhaseSet(p.id, setCollapsedCards)}
                            className="h-4 w-4 rounded text-gray-400 hover:text-white hover:bg-gray-800/60 flex items-center justify-center"
                            aria-label={isCardCollapsed ? 'Expand phase card' : 'Collapse phase card'}
                            aria-expanded={!isCardCollapsed}
                            data-testid={`phase-card-toggle-${p.id}`}
                          >
                            {isCardCollapsed
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronUp className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="text-[12px] font-bold text-white leading-tight">{p.name}</div>

                      {!isCardCollapsed && (<>

                      {/* Hybrid archetypes show the soft week corridor as a
                          subtitle so clinicians see "earliest by week N"
                          alongside the milestone gates. */}
                      {usesCriteriaCard && isHybrid && (
                        <div className="text-[9px] text-gray-500" data-testid={`phase-corridor-${p.id}`}>
                          Soft corridor wk {r.expectedStart}–{r.expectedEnd}
                        </div>
                      )}

                      {/* Entry-criteria checklist with met/unmet ticks. Only
                          rendered for criterion/hybrid stages that actually
                          declare entry criteria (the first stage of each
                          archetype has none and is reached by default).
                          Trimmed to 2 items by default with a +N more chip
                          to keep card vertical footprint manageable. */}
                      {usesCriteriaCard && crit && crit.totalCount > 0 && (() => {
                        const isExpanded = expandedCriteria.has(p.id);
                        const visible = isExpanded ? crit.results : crit.results.slice(0, 2);
                        const hidden = crit.results.length - visible.length;
                        return (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <ul className="flex flex-col gap-0.5" data-testid={`phase-criteria-${p.id}`}>
                              {visible.map((res, i) => (
                                <li
                                  key={i}
                                  className={`text-[10px] leading-snug flex items-start gap-1 ${res.met ? 'text-emerald-200' : 'text-gray-300'}`}
                                  data-testid={`phase-criterion-${p.id}-${i}`}
                                >
                                  {res.met
                                    ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0 mt-0.5 text-emerald-400" />
                                    : <X className="h-2.5 w-2.5 shrink-0 mt-0.5 text-gray-500" />}
                                  <span className="truncate">{res.criterion.label}</span>
                                </li>
                              ))}
                            </ul>
                            {(hidden > 0 || isExpanded) && crit.results.length > 2 && (
                              <button
                                type="button"
                                onClick={() => togglePhaseSet(p.id, setExpandedCriteria)}
                                className="self-start text-[9px] text-gray-400 hover:text-gray-200 underline underline-offset-2"
                                data-testid={`phase-criteria-more-${p.id}`}
                              >
                                {isExpanded ? 'Show less' : `+${hidden} more`}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Projected entry hint when the stage is locked but
                          the simulation predicts the gates will be met. */}
                      {usesCriteriaCard && locked && r.projectedEntryWeek !== null && (
                        <div className="text-[9px] text-violet-300" data-testid={`phase-projected-entry-${p.id}`}>
                          Projected entry · {unitLabelTitle.toLowerCase()} {r.projectedEntryWeek}
                        </div>
                      )}

                      {/* Case-specific AI plan for this phase, when present.
                          Replaces the generic strategy line and references the
                          patient's actual tissues + drivers. Rationale +
                          structured Techniques / Exercises / Criteria sections
                          are rendered further down inside the treatments
                          block; here we surface only the Goal line, the
                          first-load state, and any hard-error card. */}
                      {(() => {
                        const csPhase: CaseSpecificPhasePlan | null =
                          caseSpecificPlan?.phases.find((ph: CaseSpecificPhasePlan) => ph.phase_id === p.id) ?? null;
                        const firstLoad =
                          !!caseSpecificPlanLoading && !caseSpecificPlan && !caseSpecificPlanError;
                        return (
                          <>
                            {/* Goal-Driven Recovery Engine target for this phase */}
                            <div className="text-[10px] leading-snug" data-testid={`phase-goal-${p.id}`}>
                              <span className="text-gray-400">Goal · </span>
                              <span className="font-semibold text-cyan-200">{r.goalDimension}</span>
                              {r.goalTargetText && (
                                <>
                                  <span className="text-gray-400"> target </span>
                                  <span className="text-emerald-200 font-semibold">{r.goalTargetText}</span>
                                </>
                              )}
                              {r.reached && r.goalCurrentText && (
                                <>
                                  <span className="text-gray-400"> · now </span>
                                  <span className="text-white font-semibold">{r.goalCurrentText}</span>
                                </>
                              )}
                            </div>

                            {csPhase?.goal && (
                              <div className="text-[10px] text-cyan-100 leading-snug font-medium" data-testid={`phase-case-goal-${p.id}`}>
                                <span className="text-cyan-400/80">▸ </span>{csPhase.goal}
                                {caseSpecificPlanLoading && (
                                  <span className="ml-1 text-[8px] uppercase tracking-wide text-cyan-400/70">Refreshing…</span>
                                )}
                              </div>
                            )}

                            {!csPhase && !firstLoad && !caseSpecificPlanError && (
                              <div className="text-[10px] text-gray-300 leading-snug" data-testid={`phase-strategy-${p.id}`}>
                                {r.strategy}
                              </div>
                            )}

                            {firstLoad && (
                              <div
                                className="text-[10px] text-cyan-200 leading-snug flex items-center gap-1 px-1.5 py-1 rounded border border-cyan-700/40 bg-cyan-950/30"
                                data-testid={`phase-case-loading-${p.id}`}
                              >
                                <RefreshCw className="h-2.5 w-2.5 animate-spin shrink-0" />
                                Generating case-specific plan…
                              </div>
                            )}

                            {caseSpecificPlanError && !csPhase && (
                              <div
                                className="text-[10px] text-red-200 leading-snug flex items-start gap-1 px-1.5 py-1 rounded border border-red-700/50 bg-red-950/40"
                                data-testid={`phase-case-error-${p.id}`}
                              >
                                <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <div>Case-specific plan failed: <span className="text-red-300">{caseSpecificPlanError}</span></div>
                                  {onRetryCaseSpecificPlan && (
                                    <button
                                      type="button"
                                      onClick={onRetryCaseSpecificPlan}
                                      className="mt-0.5 underline hover:text-red-100"
                                      data-testid={`phase-case-retry-${p.id}`}
                                    >
                                      Retry
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Tissue status: dominant compromised dimension current → end-of-phase */}
                      {r.reached && (
                        <div className="text-[10px] text-gray-300" data-testid={`phase-tissue-${p.id}`}>
                          <span className="text-gray-500">{r.tissueLabel} </span>
                          {r.tissueStartText} → <span className={r.tissueImproved ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>{r.tissueEndText}</span>
                        </div>
                      )}

                      {/* Real flare / load-adjustment events with week + context */}
                      {(r.flareNotes.length > 0 || r.loadNotes.length > 0 || r.patientFactor) && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {r.flareNotes.map((note, i) => (
                            <span key={`f${i}`} className="text-[9px] px-1.5 py-0.5 rounded border border-red-700/50 bg-red-950/40 text-red-200 flex items-center gap-1" data-testid={`phase-flare-event-${p.id}-${i}`}>
                              <Flame className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{note}</span>
                            </span>
                          ))}
                          {r.loadNotes.map((note, i) => (
                            <span key={`l${i}`} className="text-[9px] px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-950/40 text-amber-200 truncate" data-testid={`phase-load-event-${p.id}-${i}`}>
                              {note}
                            </span>
                          ))}
                          {r.patientFactor && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-violet-700/50 bg-violet-950/40 text-violet-200 truncate" data-testid={`phase-patient-factor-${p.id}`}>
                              {r.patientFactor}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Treatments list with integrated per-phase AI Rx.
                          Baseline = stage-recommended / scheduled / top-driver
                          treatments. Augmented inline (with an AI badge)
                          by:
                            - Session-wide custom items from the parent
                              Exercise / Manual Therapy tabs that map onto
                              THIS phase via mapItemToPhaseIndex (explicit
                              progressionStages metadata, then name
                              keyword heuristic, then current-phase
                              fallback).
                            - Phase-generated items the clinician
                              produced via the per-phase Generate buttons
                              below but has not yet promoted into the
                              session plan.
                          The "Add to plan" affordance below the list
                          turns the latter into the former. */}
                      {(() => {
                        const entry = phaseRx.get(p.id) ?? emptyEntry();
                        const hasExGen = !!onGeneratePhaseExerciseRx;
                        const hasMtGen = !!onGeneratePhaseManualRx;

                        const buildReq = (): PhaseRxRequest => {
                          const startIdx = r.reached ? r.start : r.expectedStart;
                          const safeIdx = Math.min(
                            Math.max(0, startIdx),
                            activeProjection.timelines.symptoms.pain.length - 1,
                          );
                          const painPct = (activeProjection.timelines.symptoms.pain[safeIdx] ?? 30) * 10;
                          return {
                            phaseId: p.id,
                            phaseLabel: p.name,
                            phaseStageIndex: r.stageIndex,
                            phaseStartWeek: startIdx,
                            predictedPainAtPhase: Math.max(0, Math.min(100, painPct)),
                            predictedGoalAchievementPct: Math.round((r.goalAchievement ?? 0) * 100),
                            goalDimensionLabel: r.goalDimension,
                            goalTargetText: r.goalTargetText,
                          };
                        };

                        const runExercise = async () => {
                          if (!onGeneratePhaseExerciseRx) return;
                          updatePhaseRx(p.id, 'exercise', { status: 'loading' });
                          try {
                            const items = await onGeneratePhaseExerciseRx(buildReq());
                            updatePhaseRx(p.id, 'exercise', { status: 'ready', exercises: items, added: false });
                          } catch (err) {
                            updatePhaseRx(p.id, 'exercise', {
                              status: 'error',
                              message: err instanceof Error ? err.message : 'Generation failed',
                            });
                          }
                        };
                        const runManual = async () => {
                          if (!onGeneratePhaseManualRx) return;
                          updatePhaseRx(p.id, 'manual', { status: 'loading' });
                          try {
                            const items = await onGeneratePhaseManualRx(buildReq());
                            updatePhaseRx(p.id, 'manual', { status: 'ready', techniques: items, added: false });
                          } catch (err) {
                            updatePhaseRx(p.id, 'manual', {
                              status: 'error',
                              message: err instanceof Error ? err.message : 'Generation failed',
                            });
                          }
                        };

                        // Auto-map session-wide custom items onto the
                        // phase whose progression-stage metadata (or
                        // name keywords) best fits — NOT just the
                        // current phase. The same item is therefore
                        // shown on exactly one card.
                        const totalPhases = phaseRanges.length;
                        const phaseLabels = phaseRanges.map(pr => pr.stage.name);
                        const sessionEx = (customExercises ?? []).filter(
                          ex => mapItemToPhaseIndex(ex, totalPhases, scrubbedStageIdx, phaseLabels) === r.stageIndex,
                        );
                        const sessionMt = (customTechniques ?? []).filter(
                          mt => mapItemToPhaseIndex(mt, totalPhases, scrubbedStageIdx, phaseLabels) === r.stageIndex,
                        );
                        const exReady = entry.exercise.status === 'ready' ? entry.exercise.exercises ?? [] : [];
                        const mtReady = entry.manual.status === 'ready' ? entry.manual.techniques ?? [] : [];
                        const exReadyPending = entry.exercise.status === 'ready' && !entry.exercise.added ? exReady : [];
                        const mtReadyPending = entry.manual.status === 'ready' && !entry.manual.added ? mtReady : [];

                        // Case-specific AI plan for this stage (when present).
                        // Replaces the generic baseline treatment list with
                        // patient-specific techniques/exercises that include
                        // dosage + per-finding rationale.
                        const csPhase: CaseSpecificPhasePlan | null =
                          caseSpecificPlan?.phases.find((ph: CaseSpecificPhasePlan) => ph.phase_id === p.id) ?? null;

                        // Phase window used as the default start/end for
                        // Case-Specific items promoted onto the timeline.
                        // Falls back to the soft expected window when the
                        // phase has not been reached by the simulation yet.
                        const csPhaseStart = r.reached ? r.start : r.expectedStart;
                        const csPhaseEnd = Math.max(csPhaseStart + 1, r.reached ? r.end : r.expectedEnd);

                        const addCaseExerciseToTimeline = (item: CaseSpecificTreatmentItem, idx: number) => {
                          const stableId = caseItemStableId(p.id, 'ex', idx, item.name);
                          if (addedCaseExStableIds.has(stableId)) return;
                          const ex: CustomExerciseInput = {
                            name: item.name,
                            clinicalTarget: item.target,
                            dosage: { frequency: item.dosage },
                            progressionStages: item.progression
                              ? [{ stage: 1, name: item.progression }]
                              : undefined,
                            phaseIndex: r.stageIndex,
                            phaseLabel: p.name,
                            userAuthored: false,
                            stableId,
                          };
                          onAddCustomExercises?.([ex]);
                          addInterventionToActiveBranch(
                            buildCustomExerciseId(ex, 0),
                            csPhaseStart,
                            csPhaseEnd,
                          );
                        };
                        const addCaseTechniqueToTimeline = (item: CaseSpecificTreatmentItem, idx: number) => {
                          const stableId = caseItemStableId(p.id, 'mt', idx, item.name);
                          if (addedCaseMtStableIds.has(stableId)) return;
                          const mt: CustomManualTechniqueInput = {
                            name: item.name,
                            clinicalTarget: item.target,
                            dosage: { frequency: item.dosage, duration: item.dosage },
                            progressionStages: item.progression
                              ? [{ stage: 1, name: item.progression }]
                              : undefined,
                            phaseIndex: r.stageIndex,
                            phaseLabel: p.name,
                            userAuthored: false,
                            stableId,
                          };
                          onAddCustomTechniques?.([mt]);
                          addInterventionToActiveBranch(
                            buildCustomTechniqueId(mt, 0),
                            csPhaseStart,
                            csPhaseEnd,
                          );
                        };

                        const csTechniquesAllAdded = !!csPhase && csPhase.techniques.length > 0
                          && csPhase.techniques.every((it, i) => addedCaseMtStableIds.has(caseItemStableId(p.id, 'mt', i, it.name)));
                        const csExercisesAllAdded = !!csPhase && csPhase.exercises.length > 0
                          && csPhase.exercises.every((it, i) => addedCaseExStableIds.has(caseItemStableId(p.id, 'ex', i, it.name)));
                        type CombinedTreatment =
                          | { kind: 'baseline'; label: string }
                          | { kind: 'session-ex'; label: string }
                          | { kind: 'session-mt'; label: string }
                          | { kind: 'ai-ex'; label: string }
                          | { kind: 'ai-mt'; label: string };
                        // When the case-specific plan is present we render
                        // its Techniques and Exercises in their own dedicated
                        // sections (below) rather than in this combined list,
                        // so this list is reserved for clinician additions
                        // (session-wide custom items + pending per-phase AI
                        // items). When no case-specific plan exists, fall
                        // back to the legacy baseline strategy treatments.
                        const baselineList: CombinedTreatment[] = csPhase
                          ? []
                          : r.treatments.map(t => ({ kind: 'baseline' as const, label: t }));
                        const combined: CombinedTreatment[] = [
                          ...baselineList,
                          ...sessionEx.map(ex => ({ kind: 'session-ex' as const, label: ex.name })),
                          ...sessionMt.map(mt => ({ kind: 'session-mt' as const, label: mt.name })),
                          ...exReadyPending.map(ex => ({ kind: 'ai-ex' as const, label: ex.name })),
                          ...mtReadyPending.map(mt => ({ kind: 'ai-mt' as const, label: mt.name })),
                        ];
                        // Preserve baseline pixel-identical behavior: when
                        // no AI / session items map onto this card, keep
                        // the prior 2-item truncation. Cards with AI items
                        // get a slightly higher floor (3) so at least one
                        // AI item is visible without clicking expand.
                        const hasAi = sessionEx.length + sessionMt.length + exReadyPending.length + mtReadyPending.length > 0;
                        const baseLimit = hasAi ? 3 : 2;
                        const isExpanded = expandedTreatments.has(p.id);

                        type CombinedTreatmentExt = CombinedTreatment & { userAuthored?: boolean };
                        // Index session items relative to the actual baseline
                        // segment length (which is 0 in case-specific mode and
                        // r.treatments.length in legacy mode), NOT
                        // r.treatments.length unconditionally.
                        const baselineLen = baselineList.length;
                        const combinedExt: CombinedTreatmentExt[] = combined.map((t, idx) => {
                          if (t.kind === 'session-ex') {
                            return { ...t, userAuthored: !!sessionEx[idx - baselineLen]?.userAuthored };
                          }
                          if (t.kind === 'session-mt') {
                            const mtIdx = idx - baselineLen - sessionEx.length;
                            return { ...t, userAuthored: !!sessionMt[mtIdx]?.userAuthored };
                          }
                          return t;
                        });
                        const visible = isExpanded ? combinedExt : combinedExt.slice(0, baseLimit);
                        const hidden = combinedExt.length - visible.length;

                        const renderItem = (t: CombinedTreatmentExt, i: number) => {
                          const isSession = t.kind === 'session-ex' || t.kind === 'session-mt';
                          const isAi = t.kind === 'ai-ex' || t.kind === 'ai-mt';
                          const tone = (t.kind === 'session-ex' || t.kind === 'ai-ex')
                            ? 'text-violet-200'
                            : (t.kind === 'session-mt' || t.kind === 'ai-mt') ? 'text-cyan-200' : 'text-gray-200';
                          const testid = isAi
                            ? (t.kind === 'ai-ex' ? `phase-rx-item-exercise-${p.id}-${i}` : `phase-rx-item-manual-${p.id}-${i}`)
                            : isSession
                              ? (t.kind === 'session-ex' ? `phase-rx-session-ex-${p.id}-${i}` : `phase-rx-session-mt-${p.id}-${i}`)
                              : undefined;
                          return (
                            <li key={`${t.kind}-${i}`} className={`text-[10px] truncate flex items-center gap-1 ${tone}`} data-testid={testid}>
                              <span className="opacity-60">•</span>
                              {(isSession || isAi) && !t.userAuthored && <Sparkles className="h-2.5 w-2.5 shrink-0 opacity-80" />}
                              <span className="truncate">{t.label}</span>
                              {t.userAuthored && (
                                <span className="ml-auto text-[8px] uppercase tracking-wide px-1 py-px rounded bg-amber-700/30 border border-amber-600/40 text-amber-200 shrink-0" data-testid={`phase-rx-custom-badge-${p.id}-${i}`}>
                                  Custom
                                </span>
                              )}
                              {isAi && !t.userAuthored && (
                                <span className="ml-auto text-[8px] uppercase tracking-wide px-1 py-px rounded border border-current/40 opacity-70 shrink-0">
                                  Pending
                                </span>
                              )}
                            </li>
                          );
                        };

                        const renderCaseItem = (
                          item: CaseSpecificTreatmentItem,
                          i: number,
                          kind: 'case-mt' | 'case-ex',
                        ) => {
                          const isEx = kind === 'case-ex';
                          const tone = isEx ? 'text-violet-200' : 'text-cyan-200';
                          const testid = isEx
                            ? `phase-rx-case-ex-${p.id}-${i}`
                            : `phase-rx-case-mt-${p.id}-${i}`;
                          const stableId = caseItemStableId(p.id, isEx ? 'ex' : 'mt', i, item.name);
                          const isAdded = isEx
                            ? addedCaseExStableIds.has(stableId)
                            : addedCaseMtStableIds.has(stableId);
                          const canAdd = isEx ? !!onAddCustomExercises : !!onAddCustomTechniques;
                          // Surface the bar's CURRENT scheduled window
                          // (from the active branch's intervention) so the
                          // tooltip stays in sync after drag / resize.
                          // Falls back to the original phase window when
                          // no matching intervention is found.
                          const csTreatmentId = isEx
                            ? `custom_ex_s_${stableId}`
                            : `custom_mt_s_${stableId}`;
                          const liveIv = activeBranch.interventions.find(iv => iv.treatmentId === csTreatmentId);
                          const liveStart = liveIv?.startWeek ?? csPhaseStart;
                          const liveEnd = liveIv?.endWeek ?? csPhaseEnd;
                          return (
                            <li key={`${kind}-${i}`} className={`text-[10px] flex flex-col gap-0.5 ${tone}`} data-testid={testid}>
                              <div className="flex items-start gap-1">
                                <span className="opacity-60 mt-0.5">•</span>
                                <span className="font-semibold leading-snug flex-1">{item.name}</span>
                                {canAdd && (
                                  isAdded ? (
                                    <span
                                      className="text-[8px] text-emerald-300 inline-flex items-center gap-0.5 shrink-0 mt-0.5"
                                      data-testid={`${testid}-added`}
                                      title={`Already on the recovery timeline (wk ${liveStart}–${liveEnd})`}
                                    >
                                      <CheckCircle2 className="h-2.5 w-2.5" />On timeline
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => isEx
                                        ? addCaseExerciseToTimeline(item, i)
                                        : addCaseTechniqueToTimeline(item, i)}
                                      className="text-[8px] px-1 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5 shrink-0 mt-0.5"
                                      data-testid={`${testid}-add`}
                                      title={`Add to recovery timeline at wk ${csPhaseStart}–${csPhaseEnd} (drag/resize after)`}
                                    >
                                      <Plus className="h-2.5 w-2.5" />Add
                                    </button>
                                  )
                                )}
                              </div>
                              {(item.dosage || item.target) && (
                                <div className="text-[9px] text-gray-300 leading-snug pl-3">
                                  {item.dosage && <span>{item.dosage}</span>}
                                  {item.dosage && item.target && <span className="text-gray-500"> · </span>}
                                  {item.target && <span className="text-gray-400">→ {item.target}</span>}
                                </div>
                              )}
                              {item.rationale && (
                                <div className="text-[9px] text-gray-400 italic leading-snug pl-3" data-testid={`${testid}-rationale`}>
                                  {item.rationale}
                                </div>
                              )}
                              {item.progression && (
                                <div className="text-[9px] text-emerald-300/80 leading-snug pl-3">
                                  Progress · {item.progression}
                                </div>
                              )}
                            </li>
                          );
                        };

                        return (
                          <>
                            {/* Case-specific structured plan: Techniques,
                                Exercises, Entry/Exit Criteria, Rationale.
                                Each section is rendered only when the AI
                                returned items for it. */}
                            {csPhase && csPhase.techniques.length > 0 && (
                              <div className="mt-0.5" data-testid={`phase-case-techniques-${p.id}`}>
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="text-[8px] uppercase tracking-wide text-cyan-400/80 font-semibold">
                                    Techniques
                                  </div>
                                  {onAddCustomTechniques && (
                                    csTechniquesAllAdded ? (
                                      <span
                                        className="text-[8px] text-emerald-300 inline-flex items-center gap-0.5"
                                        data-testid={`phase-case-techniques-all-added-${p.id}`}
                                      >
                                        <CheckCircle2 className="h-2.5 w-2.5" />All on timeline
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => csPhase.techniques.forEach((it, i) => addCaseTechniqueToTimeline(it, i))}
                                        className="text-[8px] px-1 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                                        data-testid={`phase-case-techniques-add-all-${p.id}`}
                                        title={`Add all techniques to recovery timeline at wk ${csPhaseStart}–${csPhaseEnd}`}
                                      >
                                        <Plus className="h-2.5 w-2.5" />Add all to timeline
                                      </button>
                                    )
                                  )}
                                </div>
                                <ul className="space-y-0.5">
                                  {csPhase.techniques.map((it, i) => renderCaseItem(it, i, 'case-mt'))}
                                </ul>
                              </div>
                            )}
                            {csPhase && csPhase.exercises.length > 0 && (
                              <div className="mt-0.5" data-testid={`phase-case-exercises-${p.id}`}>
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="text-[8px] uppercase tracking-wide text-violet-400/80 font-semibold">
                                    Exercises
                                  </div>
                                  {onAddCustomExercises && (
                                    csExercisesAllAdded ? (
                                      <span
                                        className="text-[8px] text-emerald-300 inline-flex items-center gap-0.5"
                                        data-testid={`phase-case-exercises-all-added-${p.id}`}
                                      >
                                        <CheckCircle2 className="h-2.5 w-2.5" />All on timeline
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => csPhase.exercises.forEach((it, i) => addCaseExerciseToTimeline(it, i))}
                                        className="text-[8px] px-1 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                                        data-testid={`phase-case-exercises-add-all-${p.id}`}
                                        title={`Add all exercises to recovery timeline at wk ${csPhaseStart}–${csPhaseEnd}`}
                                      >
                                        <Plus className="h-2.5 w-2.5" />Add all to timeline
                                      </button>
                                    )
                                  )}
                                </div>
                                <ul className="space-y-0.5">
                                  {csPhase.exercises.map((it, i) => renderCaseItem(it, i, 'case-ex'))}
                                </ul>
                              </div>
                            )}
                            {csPhase && (csPhase.criteria?.length ?? 0) > 0 && (
                              <div className="mt-0.5" data-testid={`phase-case-criteria-${p.id}`}>
                                <div className="text-[8px] uppercase tracking-wide text-emerald-400/80 font-semibold mb-0.5">
                                  Entry / Exit criteria
                                </div>
                                <ul className="space-y-0.5">
                                  {(csPhase.criteria ?? []).map((c, i) => (
                                    <li
                                      key={`crit-${i}`}
                                      className="text-[10px] text-emerald-100 flex items-start gap-1 leading-snug"
                                      data-testid={`phase-case-criterion-${p.id}-${i}`}
                                    >
                                      <span className="opacity-60 mt-0.5">✓</span>
                                      <span>{c}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {csPhase?.rationale && (
                              <div
                                className="mt-0.5 text-[9px] text-gray-400 leading-snug italic"
                                data-testid={`phase-case-rationale-${p.id}`}
                              >
                                <span className="not-italic text-gray-500 font-semibold uppercase tracking-wide text-[8px]">Rationale · </span>
                                {csPhase.rationale}
                              </div>
                            )}

                            <div className="mt-0.5">
                              <div className="text-[8px] uppercase tracking-wide text-gray-500 font-semibold mb-0.5">
                                {csPhase ? 'Clinician additions' : `${sourceLabel} treatments`}
                              </div>
                              {combined.length === 0 ? (
                                <div className="text-[10px] text-gray-500 italic">
                                  {csPhase ? 'No clinician additions yet' : 'No stage-appropriate treatment'}
                                </div>
                              ) : (
                                <>
                                  <ul className="space-y-0.5">{visible.map(renderItem)}</ul>
                                  {(hidden > 0 || isExpanded) && combined.length > baseLimit && (
                                    <button
                                      type="button"
                                      onClick={() => togglePhaseSet(p.id, setExpandedTreatments)}
                                      className="mt-0.5 text-[9px] text-gray-400 hover:text-gray-200 underline underline-offset-2"
                                      data-testid={`phase-treatments-more-${p.id}`}
                                    >
                                      {isExpanded ? 'Show less' : `+${hidden} more`}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Per-phase Electrophysical Agents (EPA) block:
                                surfaces 1–3 modalities from the Electrophysical Agents (EPA)
                                plan that best fit THIS phase (stage label +
                                primary goal + evidence grade), so the
                                clinician does not need to flip back to the
                                Electrophysical Agents (EPA) tab. When no plan exists yet,
                                shows an inline "Generate" CTA pre-filled
                                with the phase's condition + stage. */}
                            <PhaseElectroBlock
                              phaseId={p.id}
                              phaseLabel={p.name}
                              phaseIndex={r.stageIndex}
                              totalPhases={phaseRanges.length}
                              primaryGoal={(p as { primaryGoal?: string; goalSummary?: string }).primaryGoal
                                || (p as { goalSummary?: string }).goalSummary
                                || ''}
                              electrophysicalPlan={electrophysicalPlan ?? null}
                              conditionLabel={conditionLabel || conditionContext?.conditionLabel || ''}
                              onOpenElectroTab={onOpenElectroTab}
                              onGenerateElectroPlanForPhase={onGenerateElectroPlanForPhase}
                            />

                            {/* Per-phase Rx control panel: generator
                                buttons (only the kinds wired up by the
                                parent), error+retry, and Add-to-plan
                                actions for any pending AI items shown in
                                the Treatments list above. */}
                            {(hasExGen || hasMtGen) && (
                              <div className="mt-1 pt-1 border-t border-gray-700/40 flex flex-col gap-1" data-testid={`phase-rx-${p.id}`}>
                                <div className="flex gap-1">
                                  {hasExGen && (
                                    <button
                                      type="button"
                                      onClick={runExercise}
                                      disabled={entry.exercise.status === 'loading'}
                                      className="flex-1 text-[9px] py-1 px-1.5 rounded border border-violet-700/50 bg-violet-950/30 hover:bg-violet-900/40 text-violet-200 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                                      data-testid={`phase-rx-gen-exercise-${p.id}`}
                                    >
                                      {entry.exercise.status === 'loading'
                                        ? <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                        : <Sparkles className="h-2.5 w-2.5" />}
                                      Exercise Rx
                                    </button>
                                  )}
                                  {hasMtGen && (
                                    <button
                                      type="button"
                                      onClick={runManual}
                                      disabled={entry.manual.status === 'loading'}
                                      className="flex-1 text-[9px] py-1 px-1.5 rounded border border-cyan-700/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-200 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                                      data-testid={`phase-rx-gen-manual-${p.id}`}
                                    >
                                      {entry.manual.status === 'loading'
                                        ? <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                        : <Sparkles className="h-2.5 w-2.5" />}
                                      Manual Rx
                                    </button>
                                  )}
                                </div>

                                {entry.exercise.status === 'error' && (
                                  <div className="text-[9px] text-red-300 flex items-center justify-between gap-1" data-testid={`phase-rx-err-exercise-${p.id}`}>
                                    <span className="truncate">Exercise Rx: {entry.exercise.message}</span>
                                    <button type="button" onClick={runExercise} className="underline hover:text-red-200">Retry</button>
                                  </div>
                                )}
                                {entry.manual.status === 'error' && (
                                  <div className="text-[9px] text-red-300 flex items-center justify-between gap-1" data-testid={`phase-rx-err-manual-${p.id}`}>
                                    <span className="truncate">Manual Rx: {entry.manual.message}</span>
                                    <button type="button" onClick={runManual} className="underline hover:text-red-200">Retry</button>
                                  </div>
                                )}

                                {entry.exercise.status === 'ready' && exReady.length > 0 && (
                                  <div className="flex items-center justify-between gap-1" data-testid={`phase-rx-ready-exercise-${p.id}`}>
                                    <span className="text-[9px] text-violet-300/80 inline-flex items-center gap-1">
                                      <Sparkles className="h-2.5 w-2.5" />AI Exercises ({exReady.length})
                                    </span>
                                    {entry.exercise.added ? (
                                      <span className="text-[9px] text-emerald-300 inline-flex items-center gap-0.5">
                                        <CheckCircle2 className="h-2.5 w-2.5" />Added to plan
                                      </span>
                                    ) : onAddCustomExercises ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Stamp phase metadata so the
                                          // dashboard later places these
                                          // session-wide items back on
                                          // THIS card via the explicit
                                          // phaseIndex / phaseLabel path
                                          // in mapItemToPhaseIndex,
                                          // bypassing any name heuristic.
                                          const stamped = exReady.map(ex => ({
                                            ...ex,
                                            phaseIndex: r.stageIndex,
                                            phaseLabel: p.name,
                                            stableId: ex.stableId ?? genStableId(),
                                          }));
                                          onAddCustomExercises(stamped);
                                          updatePhaseRx(p.id, 'exercise', { status: 'ready', exercises: stamped, added: true });
                                        }}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                                        data-testid={`phase-rx-add-exercise-${p.id}`}
                                      >
                                        <Plus className="h-2.5 w-2.5" />Add to plan
                                      </button>
                                    ) : null}
                                  </div>
                                )}
                                {entry.manual.status === 'ready' && mtReady.length > 0 && (
                                  <div className="flex items-center justify-between gap-1" data-testid={`phase-rx-ready-manual-${p.id}`}>
                                    <span className="text-[9px] text-cyan-300/80 inline-flex items-center gap-1">
                                      <Sparkles className="h-2.5 w-2.5" />AI Manual ({mtReady.length})
                                    </span>
                                    {entry.manual.added ? (
                                      <span className="text-[9px] text-emerald-300 inline-flex items-center gap-0.5">
                                        <CheckCircle2 className="h-2.5 w-2.5" />Added to plan
                                      </span>
                                    ) : onAddCustomTechniques ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const stamped = mtReady.map(mt => ({
                                            ...mt,
                                            phaseIndex: r.stageIndex,
                                            phaseLabel: p.name,
                                            stableId: mt.stableId ?? genStableId(),
                                          }));
                                          onAddCustomTechniques(stamped);
                                          updatePhaseRx(p.id, 'manual', { status: 'ready', techniques: stamped, added: true });
                                        }}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                                        data-testid={`phase-rx-add-manual-${p.id}`}
                                      >
                                        <Plus className="h-2.5 w-2.5" />Add to plan
                                      </button>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <button
                        onClick={() => {
                          // Pick the most useful starting week for the
                          // intervention editor.
                          //
                          // For criterion-gated and hybrid stages, the
                          // earliest moment the patient actually unlocks
                          // the stage (`projectedEntryWeek`) is more
                          // meaningful than the engine's biological-phase
                          // mapping — `r.start` here can reflect when the
                          // healing-phase index advanced even though the
                          // milestone gates aren't yet met. Prefer the
                          // criterion-met week, then the simulation start
                          // (if reached), then the soft expected window.
                          //
                          // Time-gated stages keep the legacy behavior:
                          // open at the simulation start once reached,
                          // otherwise at the expected start week.
                          let target: number;
                          if (usesCriteriaCard) {
                            // Criterion / hybrid: prefer the projected
                            // criteria-met week. When the projection
                            // never hits the gates, fall back to the
                            // expected window from the condition profile
                            // rather than the engine's phase-derived
                            // r.start — using r.start would reintroduce
                            // biological-phase bias that the criterion
                            // model is meant to remove.
                            target = r.projectedEntryWeek !== null
                              ? r.projectedEntryWeek
                              : r.expectedStart;
                          } else {
                            target = r.reached ? r.start : r.expectedStart;
                          }
                          setScrubWeek(Math.max(0, target));
                          setShowInterventionEditor(true);
                        }}
                        className="mt-auto w-full text-[10px] text-gray-300 hover:text-white border border-gray-700/60 hover:bg-gray-800/60 rounded py-0.5 flex items-center justify-center gap-1"
                        data-testid={`modify-phase-${p.id}`}
                      >
                        Modify <ChevronRight className="h-3 w-3" />
                      </button>
                      </>)}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>

        </main>

        {/* RIGHT COLUMN — AI OPTIMIZER RECOMMENDATION */}
        <aside className="overflow-y-auto space-y-3 pl-1">
          {/* Recovery phases — compact vertical stack moved out of the
              chart/gantt area so the line chart sits flush with the
              Treatment Timeline gantt below it. The active phase
              (containing the current scrub week) is highlighted in its
              phase color exactly as before. */}
          <div className="bg-gray-900/40 border border-gray-800/60 rounded-lg p-2">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">
              Recovery Phases
            </div>
            <div className="space-y-1" data-testid="phase-stack-sidebar">
              {archetype.stages.map((p, i) => {
                const active = i === scrubbedStageIdx;
                return (
                  <div
                    key={p.id}
                    className={`rounded px-2 py-1 border ${active ? `${p.bg} ${p.ring}` : 'bg-gray-800/40 border-gray-700/40'}`}
                    data-testid={`phase-pill-${p.id}`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[9px] font-semibold" style={{ color: active ? p.color : '#9ca3af' }}>
                        Phase {i + 1}
                      </span>
                      <span className={`text-[10px] font-semibold truncate ${active ? 'text-white' : 'text-gray-400'}`}>
                        {p.name}
                      </span>
                    </div>
                    {p.subtitle && (
                      <div className={`text-[9px] leading-tight mt-0.5 ${active ? 'text-gray-300' : 'text-gray-500'}`}>
                        {p.subtitle}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-900/30 to-cyan-900/20 border border-violet-700/40 rounded-lg p-3">
            <div className="flex items-center gap-1 text-[10px] text-violet-300 font-semibold uppercase tracking-wide mb-2">
              <Sparkles className="h-3 w-3" />AI Optimizer Recommendation
            </div>
            <div className="bg-gray-900/60 border border-gray-800/60 rounded p-2.5 mb-2">
              <div className="flex items-center gap-1 text-[10px] text-emerald-300 mb-1"><Brain className="h-3 w-3" />Best Next Action</div>
              <div className="text-sm font-bold text-white leading-tight uppercase">{bestActionTreatment?.name ?? 'Build Capacity'}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{bestAction?.rationale ?? 'Continue current loading'}</div>
              <Button
                size="sm"
                className="w-full mt-2 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => bestActionTreatment && addInterventionToActiveBranch(bestActionTreatment.id, scrubWeek)}
                data-testid="add-best-action"
              >
                <Plus className="h-3 w-3 mr-1" />Add to Timeline
              </Button>
            </div>

            {/* Specific Rx generator — produces concrete named exercises
                and manual therapy techniques for the phase containing
                the current scrub week, alongside (not replacing) the
                category-level "Best Next Action" above. */}
            {(onGeneratePhaseExerciseRx || onGeneratePhaseManualRx) && (
              <div className="bg-gray-900/40 rounded p-2 mb-2" data-testid="optimizer-rx-panel">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">
                    Specific Combination · Wk {scrubWeek}
                  </div>
                  <span className="text-[9px] text-violet-300/80 truncate ml-2">
                    {phaseRanges[optimizerPhaseIdx]?.stage.name ?? optimizer.currentPhaseLabel}
                  </span>
                </div>
                <div className="flex gap-1 mb-1">
                  {onGeneratePhaseExerciseRx && (
                    <button
                      type="button"
                      onClick={runOptimizerExercise}
                      disabled={optimizerEx.status === 'loading'}
                      className="flex-1 text-[10px] py-1 px-1.5 rounded border border-violet-700/50 bg-violet-950/40 hover:bg-violet-900/50 text-violet-200 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      data-testid="optimizer-generate-exercises"
                    >
                      {optimizerEx.status === 'loading'
                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                        : <Dumbbell className="h-3 w-3" />}
                      Exercises
                    </button>
                  )}
                  {onGeneratePhaseManualRx && (
                    <button
                      type="button"
                      onClick={runOptimizerManual}
                      disabled={optimizerMt.status === 'loading'}
                      className="flex-1 text-[10px] py-1 px-1.5 rounded border border-cyan-700/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      data-testid="optimizer-generate-manual"
                    >
                      {optimizerMt.status === 'loading'
                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                        : <Hand className="h-3 w-3" />}
                      Manual
                    </button>
                  )}
                </div>
                {onGeneratePhaseExerciseRx && onGeneratePhaseManualRx && (
                  <button
                    type="button"
                    onClick={runOptimizerCombination}
                    disabled={optimizerEx.status === 'loading' || optimizerMt.status === 'loading'}
                    className="w-full text-[10px] py-1 px-1.5 rounded border border-emerald-700/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                    data-testid="optimizer-generate-combination"
                  >
                    <Sparkles className="h-3 w-3" />Generate Combination
                  </button>
                )}
                {optimizerEx.status === 'idle' && optimizerMt.status === 'idle' && (
                  <div className="text-[9px] text-gray-500 italic mt-1.5">
                    Generate concrete named exercises + manual techniques tailored to this patient at week {scrubWeek}.
                  </div>
                )}
                {optimizerEx.status === 'error' && (
                  <div className="text-[9px] text-red-300 mt-1 flex items-center justify-between gap-1" data-testid="optimizer-err-exercises">
                    <span className="truncate">Exercises: {optimizerEx.message}</span>
                    <button type="button" onClick={runOptimizerExercise} className="underline hover:text-red-200 shrink-0">Retry</button>
                  </div>
                )}
                {optimizerMt.status === 'error' && (
                  <div className="text-[9px] text-red-300 mt-1 flex items-center justify-between gap-1" data-testid="optimizer-err-manual">
                    <span className="truncate">Manual: {optimizerMt.message}</span>
                    <button type="button" onClick={runOptimizerManual} className="underline hover:text-red-200 shrink-0">Retry</button>
                  </div>
                )}
              </div>
            )}

            {/* Ready-but-empty: generation succeeded with zero items */}
            {optimizerEx.status === 'ready' && (optimizerEx.exercises?.length ?? 0) === 0 && (
              <div className="bg-violet-950/15 border border-violet-800/30 rounded p-2 mb-2 text-[9px] text-violet-200/70 flex items-center justify-between gap-2" data-testid="optimizer-rx-exercises-empty">
                <span>No suitable exercises returned for this phase. Try a different week or refine the patient profile.</span>
                <button type="button" onClick={runOptimizerExercise} className="underline hover:text-violet-100 shrink-0">Retry</button>
              </div>
            )}
            {optimizerMt.status === 'ready' && (optimizerMt.techniques?.length ?? 0) === 0 && (
              <div className="bg-cyan-950/15 border border-cyan-800/30 rounded p-2 mb-2 text-[9px] text-cyan-200/70 flex items-center justify-between gap-2" data-testid="optimizer-rx-manual-empty">
                <span>No suitable manual techniques returned for this phase. Try a different week or refine the patient profile.</span>
                <button type="button" onClick={runOptimizerManual} className="underline hover:text-cyan-100 shrink-0">Retry</button>
              </div>
            )}

            {/* Generated exercises list — named items with sets×reps */}
            {optimizerEx.status === 'ready' && (optimizerEx.exercises?.length ?? 0) > 0 && (
              <div className="bg-violet-950/20 border border-violet-800/40 rounded p-2 mb-2" data-testid="optimizer-rx-exercises">
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => setOptimizerExOpen(o => !o)}
                    className="text-[9px] text-violet-300 uppercase tracking-wide font-semibold inline-flex items-center gap-1 hover:text-violet-100"
                    data-testid="optimizer-toggle-exercises"
                    aria-expanded={optimizerExOpen}
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${optimizerExOpen ? 'rotate-90' : ''}`} />
                    <Dumbbell className="h-3 w-3" />Exercises ({optimizerEx.exercises!.length})
                  </button>
                  {optimizerEx.added ? (
                    <span className="text-[9px] text-emerald-300 inline-flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />Added
                    </span>
                  ) : onAddCustomExercises ? (
                    <button
                      type="button"
                      onClick={() => {
                        const items = optimizerEx.status === 'ready' ? (optimizerEx.exercises ?? []) : [];
                        const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                        const stamped = items.map(ex => ({ ...ex, phaseIndex: optimizerPhaseIdx, phaseLabel, stableId: ex.stableId ?? genStableId() }));
                        const baseIdx = (customExercises ?? []).length;
                        onAddCustomExercises(stamped);
                        stamped.forEach((ex, k) => {
                          addInterventionToActiveBranch(buildCustomExerciseId(ex, baseIdx + k), scrubWeek);
                        });
                        setOptimizerEx({ status: 'ready', exercises: stamped, added: true });
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                      data-testid="optimizer-add-all-exercises"
                      title={`Add to plan & schedule at Wk ${scrubWeek}`}
                    >
                      <Plus className="h-2.5 w-2.5" />Add all to Wk {scrubWeek}
                    </button>
                  ) : null}
                </div>
                {optimizerExOpen && (
                <ul className="space-y-1">
                  {optimizerEx.exercises!.map((ex, i) => {
                    const sets = ex.dosage?.sets;
                    const reps = ex.dosage?.reps;
                    const tempo = ex.dosage?.tempo;
                    const freq = ex.dosage?.frequency;
                    const intensity = ex.forceVector?.resistanceType;
                    // Normalize dosage as "S×R" (e.g. 3×8) when both are numeric,
                    // else fall back to the readable list. Append RPE band if
                    // tempo string contains an explicit RPE marker.
                    const setsNum = typeof sets === 'number' ? sets : Number(sets);
                    const repsRaw = typeof reps === 'string' ? reps : (typeof reps === 'number' ? String(reps) : '');
                    const setsXReps = Number.isFinite(setsNum) && setsNum > 0 && repsRaw
                      ? `${setsNum}×${repsRaw}`
                      : '';
                    const rpeMatch = typeof tempo === 'string' ? tempo.match(/RPE\s*[\d.\-–]+/i) : null;
                    const rpeBand = rpeMatch ? rpeMatch[0] : '';
                    const dose = setsXReps
                      ? [setsXReps, rpeBand || tempo, freq, intensity].filter(Boolean).join(' · ')
                      : [sets && `${sets} sets`, reps && `${reps} reps`, tempo, freq, intensity].filter(Boolean).join(' · ');
                    const region = ex.targetSystem;
                    const meta = [region && `Region: ${region}`, ex.clinicalTarget].filter(Boolean).join(' · ');
                    return (
                      <li key={i} className="text-[10px] flex items-start gap-1" data-testid={`optimizer-exercise-${i}`}>
                        <span className="text-violet-300 mt-px">•</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-violet-100 font-semibold leading-tight">{ex.name}</div>
                          {dose && (
                            <div className="text-[9px] text-violet-300/80 leading-tight">{dose}</div>
                          )}
                          {meta && (
                            <div className="text-[9px] text-gray-400 leading-tight">{meta}</div>
                          )}
                        </div>
                        {!optimizerEx.added && onAddCustomExercises && (
                          <button
                            type="button"
                            onClick={() => {
                              const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                              const idx = (customExercises ?? []).length;
                              const stamped = { ...ex, phaseIndex: optimizerPhaseIdx, phaseLabel, stableId: ex.stableId ?? genStableId() };
                              onAddCustomExercises([stamped]);
                              addInterventionToActiveBranch(buildCustomExerciseId(stamped, idx), scrubWeek);
                            }}
                            className="text-emerald-400 hover:text-emerald-200 shrink-0"
                            data-testid={`optimizer-add-exercise-${i}`}
                            title={`Add to plan & schedule at Wk ${scrubWeek}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
            )}

            {/* Generated manual therapy list — named items with grades */}
            {optimizerMt.status === 'ready' && (optimizerMt.techniques?.length ?? 0) > 0 && (
              <div className="bg-cyan-950/20 border border-cyan-800/40 rounded p-2 mb-2" data-testid="optimizer-rx-manual">
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => setOptimizerMtOpen(o => !o)}
                    className="text-[9px] text-cyan-300 uppercase tracking-wide font-semibold inline-flex items-center gap-1 hover:text-cyan-100"
                    data-testid="optimizer-toggle-manual"
                    aria-expanded={optimizerMtOpen}
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${optimizerMtOpen ? 'rotate-90' : ''}`} />
                    <Hand className="h-3 w-3" />Manual Therapy ({optimizerMt.techniques!.length})
                  </button>
                  {optimizerMt.added ? (
                    <span className="text-[9px] text-emerald-300 inline-flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />Added
                    </span>
                  ) : onAddCustomTechniques ? (
                    <button
                      type="button"
                      onClick={() => {
                        const items = optimizerMt.status === 'ready' ? (optimizerMt.techniques ?? []) : [];
                        const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                        const stamped = items.map(mt => ({ ...mt, phaseIndex: optimizerPhaseIdx, phaseLabel, stableId: mt.stableId ?? genStableId() }));
                        const baseIdx = (customTechniques ?? []).length;
                        onAddCustomTechniques(stamped);
                        stamped.forEach((mt, k) => {
                          addInterventionToActiveBranch(buildCustomTechniqueId(mt, baseIdx + k), scrubWeek);
                        });
                        setOptimizerMt({ status: 'ready', techniques: stamped, added: true });
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                      data-testid="optimizer-add-all-manual"
                      title={`Add to plan & schedule at Wk ${scrubWeek}`}
                    >
                      <Plus className="h-2.5 w-2.5" />Add all to Wk {scrubWeek}
                    </button>
                  ) : null}
                </div>
                {optimizerMtOpen && (
                <ul className="space-y-1">
                  {optimizerMt.techniques!.map((mt, i) => {
                    const grade = mt.forceApplicationSequence?.[0]?.grade;
                    const depth = mt.forceApplicationSequence?.[0]?.depth;
                    const dur = mt.dosage?.duration;
                    const reps = mt.dosage?.repetitions;
                    const sets = mt.dosage?.sets;
                    const freq = mt.dosage?.frequency;
                    // Normalize as Maitland-style "Grade III · 3×30s" when possible.
                    const setsNum = typeof sets === 'number' ? sets : Number(sets);
                    const repsNum = typeof reps === 'number' ? reps : Number(reps);
                    const setsXReps = Number.isFinite(setsNum) && setsNum > 0 && Number.isFinite(repsNum) && repsNum > 0
                      ? `${setsNum}×${repsNum}${dur ? ` (${dur})` : ''}`
                      : '';
                    const dose = setsXReps
                      ? [grade && `Grade ${grade}`, depth, setsXReps, freq].filter(Boolean).join(' · ')
                      : [grade && `Grade ${grade}`, depth, sets && `${sets} sets`, reps && `${reps} reps`, dur, freq].filter(Boolean).join(' · ');
                    const targetStructures = (mt.tissueTargets ?? [])
                      .map(t => t?.goalType)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(', ');
                    const region = mt.targetSystem;
                    const meta = [
                      region && `Target: ${region}`,
                      targetStructures,
                      mt.clinicalTarget,
                    ].filter(Boolean).join(' · ');
                    return (
                      <li key={i} className="text-[10px] flex items-start gap-1" data-testid={`optimizer-manual-${i}`}>
                        <span className="text-cyan-300 mt-px">•</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-cyan-100 font-semibold leading-tight">{mt.name}</div>
                          {dose && (
                            <div className="text-[9px] text-cyan-300/80 leading-tight">{dose}</div>
                          )}
                          {meta && (
                            <div className="text-[9px] text-gray-400 leading-tight">{meta}</div>
                          )}
                        </div>
                        {!optimizerMt.added && onAddCustomTechniques && (
                          <button
                            type="button"
                            onClick={() => {
                              const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                              const idx = (customTechniques ?? []).length;
                              const stamped = { ...mt, phaseIndex: optimizerPhaseIdx, phaseLabel, stableId: mt.stableId ?? genStableId() };
                              onAddCustomTechniques([stamped]);
                              addInterventionToActiveBranch(buildCustomTechniqueId(stamped, idx), scrubWeek);
                            }}
                            className="text-emerald-400 hover:text-emerald-200 shrink-0"
                            data-testid={`optimizer-add-manual-${i}`}
                            title={`Add to plan & schedule at Wk ${scrubWeek}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
            )}

            {altAction && (
              <div className="bg-gray-900/40 rounded p-2 mb-2">
                <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Alternative Option</div>
                <div className="text-[11px] text-gray-200 font-semibold">{altAction.action}</div>
                <div className="text-[10px] text-gray-400">{altAction.rationale}</div>
              </div>
            )}

            <div className="bg-gray-900/40 rounded p-2" data-testid="optimizer-insight">
              <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Optimization Insight</div>
              {(() => {
                const exNames = optimizerEx.status === 'ready' ? (optimizerEx.exercises ?? []).map(e => e.name).filter(Boolean) : [];
                const mtNames = optimizerMt.status === 'ready' ? (optimizerMt.techniques ?? []).map(m => m.name).filter(Boolean) : [];
                const combined = [...exNames.slice(0, 3), ...mtNames.slice(0, 2)];
                const extra = (exNames.length + mtNames.length) - combined.length;
                if (combined.length > 0) {
                  return (
                    <div className="text-[10px] text-gray-200 leading-snug" data-testid="optimizer-combination-summary">
                      <span className="text-emerald-300 font-semibold">Recommend:</span>{' '}
                      {combined.join(' + ')}
                      {extra > 0 ? <span className="text-gray-400"> +{extra} more</span> : null}
                      {' · '}
                      <span className="text-amber-300 font-semibold">Score Δ {(optimizer.expectedScore - optimizer.comparisonScore).toFixed(1)}</span>
                    </div>
                  );
                }
                const sentences = optimizer.narrative.split('.').map(s => s.trim()).filter(Boolean);
                const phaseSentence = sentences.find(s => /week\s+\d+/i.test(s)) ?? sentences[0] ?? optimizer.narrative;
                return (
                  <div className="text-[10px] text-gray-200 leading-snug">
                    {phaseSentence}.{' '}
                    <span className="text-amber-300 font-semibold">Score Δ {(optimizer.expectedScore - optimizer.comparisonScore).toFixed(1)}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* CUSTOM TREATMENT COMPOSER — user-authored exercise / manual
              therapy items that flow through the same custom pipeline
              the AI Optimizer uses, scheduled at the chosen week so the
              recovery curve responds identically. */}
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-700/40 rounded-lg p-3" data-testid="custom-treatment-card">
            <button
              type="button"
              onClick={() => setCustomOpen(o => !o)}
              className="w-full flex items-center justify-between text-[10px] text-amber-200 font-semibold uppercase tracking-wide mb-1 hover:text-amber-100"
              data-testid="custom-treatment-toggle"
              aria-expanded={customOpen}
            >
              <span className="inline-flex items-center gap-1">
                <ChevronRight className={`h-3 w-3 transition-transform ${customOpen ? 'rotate-90' : ''}`} />
                <FilePlus className="h-3 w-3" />Add Your Own Treatment
              </span>
              <span className="text-[9px] text-amber-300/80 normal-case tracking-normal">Wk {scrubWeek}</span>
            </button>
            {!customOpen ? (
              <div className="text-[10px] text-amber-200/70">
                Author exercise or manual therapy. Affects the recovery curve like AI items.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-1" role="tablist" aria-label="Treatment kind">
                  <button
                    type="button"
                    onClick={() => setCustomKind('exercise')}
                    role="tab"
                    aria-selected={customKind === 'exercise'}
                    className={`flex-1 text-[10px] py-1 px-1.5 rounded inline-flex items-center justify-center gap-1 ${customKind === 'exercise' ? 'bg-violet-700/40 border border-violet-600/60 text-violet-100' : 'bg-gray-900/50 border border-gray-700/50 text-gray-300 hover:bg-gray-900/80'}`}
                    data-testid="custom-kind-exercise"
                  >
                    <Dumbbell className="h-2.5 w-2.5" />Exercise
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomKind('manual')}
                    role="tab"
                    aria-selected={customKind === 'manual'}
                    className={`flex-1 text-[10px] py-1 px-1.5 rounded inline-flex items-center justify-center gap-1 ${customKind === 'manual' ? 'bg-cyan-700/40 border border-cyan-600/60 text-cyan-100' : 'bg-gray-900/50 border border-gray-700/50 text-gray-300 hover:bg-gray-900/80'}`}
                    data-testid="custom-kind-manual"
                  >
                    <Hand className="h-2.5 w-2.5" />Manual
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Name (e.g. Bulgarian split squat)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full text-[11px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60"
                  data-testid="custom-name-input"
                />

                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    placeholder="Region (e.g. Knee, Lumbar)"
                    value={customRegion}
                    onChange={e => setCustomRegion(e.target.value)}
                    className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60"
                    data-testid="custom-region-input"
                  />
                  <input
                    type="text"
                    placeholder="Target (e.g. quad strength)"
                    value={customClinicalTarget}
                    onChange={e => setCustomClinicalTarget(e.target.value)}
                    className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60"
                    data-testid="custom-target-input"
                  />
                </div>

                {customKind === 'exercise' ? (
                  <div className="grid grid-cols-3 gap-1">
                    <input type="text" placeholder="Sets" value={customSets} onChange={e => setCustomSets(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-sets-input" />
                    <input type="text" placeholder="Reps" value={customReps} onChange={e => setCustomReps(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-reps-input" />
                    <input type="text" placeholder="Tempo" value={customTempo} onChange={e => setCustomTempo(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-tempo-input" />
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-1">
                    <input type="text" placeholder="Grade" value={customGrade} onChange={e => setCustomGrade(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-grade-input" />
                    <input type="text" placeholder="Depth" value={customDepth} onChange={e => setCustomDepth(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-depth-input" />
                    <input type="text" placeholder="Sets" value={customSets} onChange={e => setCustomSets(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-mt-sets-input" />
                    <input type="text" placeholder="Reps" value={customReps} onChange={e => setCustomReps(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-mt-reps-input" />
                    <input type="text" placeholder="Dur." value={customDuration} onChange={e => setCustomDuration(e.target.value)} className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500" data-testid="custom-duration-input" />
                  </div>
                )}

                <label className="flex items-center gap-1 text-[10px] text-gray-300">
                  <span className="shrink-0 w-12">Phase</span>
                  <select
                    value={customPhaseIdx === null ? '' : customPhaseIdx}
                    onChange={e => {
                      const v = e.target.value;
                      setCustomPhaseIdx(v === '' ? null : parseInt(v, 10));
                    }}
                    className="flex-1 text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100"
                    data-testid="custom-phase-select"
                  >
                    <option value="">Auto (from start week)</option>
                    {phaseRanges.map((r, i) => (
                      <option key={r.stage.id ?? i} value={i}>
                        {`P${i + 1}: ${r.stage.name}`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-1 items-center">
                  <input
                    type="text"
                    placeholder="Frequency (e.g. 3x/week)"
                    value={customFrequency}
                    onChange={e => setCustomFrequency(e.target.value)}
                    className="text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500"
                    data-testid="custom-frequency-input"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-300">
                    <span className="shrink-0">Start Wk</span>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, input.totalWeeks)}
                      placeholder={String(scrubWeek)}
                      value={customStartWeek === null ? '' : customStartWeek}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '') { setCustomStartWeek(null); return; }
                        const n = parseInt(v, 10);
                        if (Number.isFinite(n)) setCustomStartWeek(Math.max(0, Math.min(input.totalWeeks, n)));
                      }}
                      className="w-full text-[10px] py-1 px-1.5 rounded bg-gray-900/60 border border-gray-700/60 text-gray-100 placeholder:text-gray-500"
                      data-testid="custom-start-week-input"
                    />
                  </label>
                </div>

                <Button
                  size="sm"
                  disabled={!customName.trim() || (customKind === 'exercise' ? !onAddCustomExercises : !onAddCustomTechniques)}
                  onClick={() => {
                    const name = customName.trim();
                    if (!name) return;
                    // Precedence: explicit start week ALWAYS wins. The
                    // phase picker is only used when no start week is
                    // entered. Otherwise the phase is derived from the
                    // chosen week so the phase metadata stays consistent
                    // with the actual schedule.
                    let phaseIdx: number;
                    let startWeek: number;
                    if (customStartWeek !== null) {
                      startWeek = Math.max(0, Math.min(input.totalWeeks, customStartWeek));
                      phaseIdx = optimizerPhaseIdx;
                      for (let i = phaseRanges.length - 1; i >= 0; i--) {
                        const r = phaseRanges[i];
                        const s = r.reached ? r.start : r.expectedStart;
                        if (startWeek >= s) { phaseIdx = i; break; }
                      }
                    } else if (customPhaseIdx !== null && phaseRanges[customPhaseIdx]) {
                      phaseIdx = customPhaseIdx;
                      const r = phaseRanges[phaseIdx];
                      startWeek = Math.max(0, Math.min(input.totalWeeks, r.reached ? r.start : r.expectedStart));
                    } else {
                      startWeek = Math.max(0, Math.min(input.totalWeeks, scrubWeek));
                      phaseIdx = optimizerPhaseIdx;
                      for (let i = phaseRanges.length - 1; i >= 0; i--) {
                        const r = phaseRanges[i];
                        const s = r.reached ? r.start : r.expectedStart;
                        if (startWeek >= s) { phaseIdx = i; break; }
                      }
                    }
                    const phaseRange = phaseRanges[phaseIdx];
                    const phaseLabel = phaseRange?.stage.name;
                    const stableId = genStableId();
                    if (customKind === 'exercise' && onAddCustomExercises) {
                      const item: CustomExerciseInput = {
                        name,
                        targetSystem: customRegion.trim() || undefined,
                        clinicalTarget: customClinicalTarget.trim() || undefined,
                        dosage: {
                          sets: customSets.trim() || undefined,
                          reps: customReps.trim() || undefined,
                          tempo: customTempo.trim() || undefined,
                          frequency: customFrequency.trim() || undefined,
                        },
                        phaseIndex: phaseRange?.stageIndex ?? phaseIdx,
                        phaseLabel,
                        userAuthored: true,
                        stableId,
                      };
                      const idx = (customExercises ?? []).length;
                      onAddCustomExercises([item]);
                      addInterventionToActiveBranch(buildCustomExerciseId(item, idx), startWeek);
                    } else if (customKind === 'manual' && onAddCustomTechniques) {
                      const item: CustomManualTechniqueInput = {
                        name,
                        targetSystem: customRegion.trim() || undefined,
                        clinicalTarget: customClinicalTarget.trim() || undefined,
                        forceApplicationSequence: (customGrade.trim() || customDepth.trim())
                          ? [{ grade: customGrade.trim() || undefined, depth: customDepth.trim() || undefined }]
                          : undefined,
                        dosage: {
                          duration: customDuration.trim() || undefined,
                          repetitions: customReps.trim() || undefined,
                          sets: customSets.trim() || undefined,
                          frequency: customFrequency.trim() || undefined,
                        },
                        phaseIndex: phaseRange?.stageIndex ?? phaseIdx,
                        phaseLabel,
                        userAuthored: true,
                        stableId,
                      };
                      const idx = (customTechniques ?? []).length;
                      onAddCustomTechniques([item]);
                      addInterventionToActiveBranch(buildCustomTechniqueId(item, idx), startWeek);
                    }
                    setCustomJustAdded(`${name} · Wk ${startWeek}`);
                    // Full form reset.
                    setCustomName('');
                    setCustomRegion('');
                    setCustomClinicalTarget('');
                    setCustomSets('3');
                    setCustomReps('10');
                    setCustomTempo('');
                    setCustomDuration('30s');
                    setCustomGrade('III');
                    setCustomDepth('');
                    setCustomFrequency('3x/week');
                    setCustomStartWeek(null);
                    setCustomPhaseIdx(null);
                    window.setTimeout(() => setCustomJustAdded(null), 2500);
                  }}
                  className="w-full h-7 text-[11px] bg-amber-600 hover:bg-amber-500 text-white"
                  data-testid="custom-add-button"
                >
                  <Plus className="h-3 w-3 mr-1" />Add to Plan & Schedule at Wk {customStartWeek ?? scrubWeek}
                </Button>
                {customJustAdded && (
                  <div className="text-[10px] text-emerald-300 inline-flex items-center gap-1" data-testid="custom-just-added">
                    <CheckCircle2 className="h-2.5 w-2.5" />Added: {customJustAdded}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* KEY MILESTONES */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
              <Target className="h-3 w-3" />Key Milestones
            </div>
            <div className="space-y-1.5">
              {activeProjection.milestones.slice(0, 6).map(m => (
                <div key={m.id} className="flex items-start gap-2 text-[10px]">
                  {m.achieved ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="h-3 w-3 text-gray-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 font-semibold">Week {m.achieved ? m.weekAchieved : m.expectedWeek}</div>
                    <div className="text-gray-400 truncate" title={m.description}>{m.label}</div>
                  </div>
                </div>
              ))}
              {activeProjection.milestones.length === 0 && (
                <div className="text-[10px] text-gray-500 italic">No milestones yet</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {naturalTimelineSlot && (
        <div className="px-3 pb-3 shrink-0">
          {naturalTimelineSlot}
        </div>
      )}

      {/* COMPARE SCENARIOS ROW */}
      <div className="px-3 pb-3 grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-3 shrink-0">
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Compare Scenarios</div>
              <div className="text-[9px] text-gray-500">See how different choices affect recovery</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] border-violet-700/50 text-violet-200 hover:bg-violet-900/30"
              onClick={() => addBranch({ name: `Scenario ${branches.length + 1}`, flareEvents: [], reaggravationEvents: [], loadAdjustments: [] })}
              data-testid="add-scenario"
            >
              <Plus className="h-3 w-3 mr-1" />Add Scenario
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-950/40 border border-gray-800 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Badge className="bg-emerald-700/40 text-emerald-200 border-emerald-600/40 text-[8px] uppercase">Recommended Plan</Badge>
              </div>
              <div className="text-[11px] font-bold text-white">Scenario A: {activeProjection.branchName}</div>
              <div className="text-[9px] text-gray-400 mb-1">With Progressive Loading</div>
              <MiniChart series={scenarioASeries} totalWeeks={input.totalWeeks} height={120} showWeekLabel={false} />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {scenarioComparison.a.map((line, i) => (
                  <span key={i} className={`text-[9px] ${line.tone}`}>{line.text}</span>
                ))}
              </div>
            </div>
            <div className="bg-gray-950/40 border border-gray-800 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Badge className="bg-amber-700/40 text-amber-200 border-amber-600/40 text-[8px] uppercase">Alternative</Badge>
              </div>
              <div className="text-[11px] font-bold text-white">Scenario B: {baselineProj.branchName}</div>
              <div className="text-[9px] text-gray-400 mb-1">Baseline (no progressive loading additions)</div>
              <MiniChart series={scenarioBSeries} totalWeeks={input.totalWeeks} height={120} showWeekLabel={false} />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {scenarioComparison.b.map((line, i) => (
                  <span key={i} className={`text-[9px] ${line.tone}`}>{line.text}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3 flex flex-col">
          <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-[11px]" data-testid="download-plan">
            <ArrowRight className="h-3 w-3 mr-1" />Download Plan
          </Button>
          <div className="mt-2 text-[10px] text-gray-400">
            Branches: {branches.length} · Active: <span className="text-cyan-300">{activeProjection.branchName}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBranchId(b.id)}
                className={`text-[9px] px-1.5 py-0.5 rounded border ${b.id === activeBranchId ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-200' : 'bg-gray-800/40 border-gray-700/40 text-gray-300'}`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1" style={{ background: b.color }} />{b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SIMULATION CONTROLS BAR */}
      <div className="border-t border-gray-800/80 bg-gray-900/70 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Simulation Controls</span>
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-[10px] text-gray-300">Adherence: <span className="text-cyan-300 font-mono">{Math.round(input.patientAdherence * 100)}%</span></span>
            <div className="w-32">
              <Slider
                value={[Math.round(input.patientAdherence * 100)]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setInput(p => ({ ...p, patientAdherence: v / 100 }))}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-amber-700/50 text-amber-200 hover:bg-amber-900/30"
            onClick={() => setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
              ...b,
              flareEvents: [...b.flareEvents, { week: scrubWeek, severity: 25 }],
            }))}
            data-testid="add-flareup"
          >
            <Flame className="h-3 w-3 mr-1" />Add Flare-Up
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-cyan-700/50 text-cyan-200 hover:bg-cyan-900/30"
            onClick={() => setShowLoadAdjust(true)}
            data-testid="adjust-load"
          >
            <TrendingUp className="h-3 w-3 mr-1" />Adjust Load
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-red-700/50 text-red-200 hover:bg-red-900/30"
            onClick={() => setShowRemoveTreatment(s => !s)}
            data-testid="remove-treatment-toggle"
          >
            <Trash2 className="h-3 w-3 mr-1" />Remove Treatment
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-gray-600/50 text-gray-300 hover:bg-gray-800/60 ml-auto"
            onClick={resetSimulation}
            data-testid="reset-sim"
          >
            <RefreshCw className="h-3 w-3 mr-1" />Reset Simulation
          </Button>
          <label className="flex items-center gap-1 text-[10px] text-emerald-300 cursor-pointer" title="Auto-sync 3D skeleton to scrubbed week">
            <input type="checkbox" checked={autoSyncSkeleton} onChange={e => setAutoSyncSkeleton(e.target.checked)} className="h-3 w-3" />
            Sync 3D · markers ×{painFactor.toFixed(2)}
          </label>
        </div>
        {showRemoveTreatment && (
          <div className="mt-2 bg-gray-950/60 border border-gray-800 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-gray-400">Active Treatments — schedule:</div>
              {activeBranch.interventions.length > 0 && (
                <button
                  onClick={reproposeAllSchedules}
                  className="text-[10px] px-2 py-0.5 rounded bg-violet-900/40 text-violet-100 border border-violet-700/50 hover:bg-violet-800/60 flex items-center gap-1"
                  title="Re-run AI schedule proposer for every active treatment"
                >
                  <Sparkles className="h-2.5 w-2.5" />AI re-propose all
                </button>
              )}
            </div>
            {bulkDiff && (
              <div className="mb-1 rounded border border-violet-700/50 bg-violet-950/30 p-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] text-violet-200 font-semibold flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />Review proposed schedule changes
                  </div>
                  <label className="flex items-center gap-1 text-[9px] text-violet-200/80">
                    <input
                      type="checkbox"
                      checked={bulkIncludeManual}
                      onChange={e => setBulkIncludeManual(e.target.checked)}
                      className="h-3 w-3"
                    />
                    Include manually-edited
                  </label>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {bulkDiff.map(d => {
                    const skipped = d.isManual && !bulkIncludeManual;
                    const fmt = (s: typeof d.current) => `${s.oneOff ? 'one-off' : `${s.sessionsPerWeek}×/wk`}` +
                      `${s.cadenceWeeks > 1 && !s.oneOff ? `, every ${s.cadenceWeeks}w` : ''}` +
                      `${s.endWeek !== undefined ? `, end wk ${s.endWeek}` : ''}` +
                      `${s.taperWeeks ? `, taper ${s.taperWeeks}w` : ''}`;
                    const changed = JSON.stringify(d.current) !== JSON.stringify(d.proposed);
                    return (
                      <div key={d.interventionId} className={`text-[9px] rounded border px-1.5 py-1 ${skipped ? 'border-gray-800 bg-gray-900/40 opacity-60' : changed ? 'border-violet-700/40 bg-violet-900/20' : 'border-gray-800 bg-gray-900/40'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-100 font-medium truncate">{d.treatmentName}</span>
                          {d.isManual && <span className="px-1 rounded border border-amber-700/40 bg-amber-900/30 text-amber-200">manual</span>}
                          {!changed && <span className="text-gray-500">no change</span>}
                        </div>
                        {changed && !skipped && (
                          <div className="mt-0.5 text-gray-400">
                            <span className="line-through text-gray-500">{fmt(d.current)}</span>
                            <span className="text-violet-300"> → {fmt(d.proposed)}</span>
                          </div>
                        )}
                        {changed && skipped && (
                          <div className="mt-0.5 text-gray-500 italic">manual override preserved</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button
                    onClick={() => setBulkDiff(null)}
                    className="text-[10px] px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  >Cancel</button>
                  <button
                    onClick={commitBulkDiff}
                    className="text-[10px] px-2 py-0.5 rounded border border-violet-600 bg-violet-700/60 text-violet-50 hover:bg-violet-600/70"
                  >Apply</button>
                </div>
              </div>
            )}
            {activeBranch.interventions.length === 0 && <div className="text-[10px] text-gray-500 italic">No active treatments</div>}
            <div className="space-y-1">
              {activeBranch.interventions.map(i => {
                const t = treatmentLookup.get(i.treatmentId);
                const sessions = i.sessionsPerWeek ?? t?.defaultSessionsPerWeek ?? 3;
                const cadence = i.cadenceWeeks ?? 1;
                const taperWeeks = i.taperWeeks ?? 0;
                const naturalEnd = t ? i.startWeek + t.peakWeeks + t.durationWeeks : i.startWeek + 6;
                const endWeek = i.endWeek ?? naturalEnd;
                const sourceBadge = i.scheduleSource === 'manual'
                  ? { label: 'manual', cls: 'bg-amber-900/40 text-amber-200 border-amber-700/40' }
                  : i.scheduleSource === 'default'
                    ? { label: 'default', cls: 'bg-gray-800 text-gray-300 border-gray-700' }
                    : { label: 'AI', cls: 'bg-violet-900/40 text-violet-200 border-violet-700/40' };
                return (
                  <div key={i.id} className="bg-gray-900/60 border border-gray-800/60 rounded p-1.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex-1 text-gray-100 font-medium truncate">{t?.name ?? i.treatmentId}</span>
                      <span className={`px-1 rounded border text-[9px] ${sourceBadge.cls}`}>{sourceBadge.label}</span>
                      <button
                        onClick={() => {
                          const proposal = buildScheduleProposal(i.treatmentId, i.startWeek);
                          if (proposal) updateInterventionSchedule(i.id, {
                            sessionsPerWeek: proposal.sessionsPerWeek,
                            cadenceWeeks: proposal.cadenceWeeks,
                            endWeek: proposal.endWeek,
                            taperWeeks: proposal.taperWeeks,
                            taperFinalDose: proposal.taperFinalDose,
                            scheduleSource: 'ai',
                            scheduleRationale: proposal.rationale,
                          });
                        }}
                        className="px-1 rounded text-violet-300 hover:text-violet-100 hover:bg-violet-900/30"
                        title="Re-run AI schedule proposer for this treatment"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => removeInterventionFromActive(i.id)} className="text-red-400 hover:text-red-200" title="Remove">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <div className="mt-1 grid grid-cols-5 gap-1.5 text-[9px] text-gray-400">
                      <label className="flex flex-col gap-0.5">
                        <span>Start wk</span>
                        <input
                          type="number"
                          min={0}
                          max={Math.max(0, (i.endWeek ?? scrubWeek + 52) - 1)}
                          value={i.startWeek}
                          onChange={e => updateInterventionSchedule(i.id, { startWeek: Number(e.target.value), scheduleSource: 'manual' })}
                          className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100 w-full"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span>Sessions/wk</span>
                        <select
                          value={i.oneOff ? 'oneoff' : sessions}
                          disabled={!!i.oneOff}
                          onChange={e => updateInterventionSchedule(i.id, { sessionsPerWeek: Number(e.target.value), scheduleSource: 'manual' })}
                          className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100 disabled:opacity-50"
                        >
                          {i.oneOff && <option value="oneoff">—</option>}
                          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}×</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span>Cadence</span>
                        <select
                          value={i.oneOff ? 'oneoff' : cadence}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === 'oneoff') {
                              updateInterventionSchedule(i.id, {
                                oneOff: true,
                                cadenceWeeks: 1,
                                endWeek: i.startWeek + 1,
                                taperWeeks: undefined,
                                taperFinalDose: undefined,
                                scheduleSource: 'manual',
                              });
                            } else {
                              updateInterventionSchedule(i.id, {
                                oneOff: false,
                                cadenceWeeks: Number(v),
                                scheduleSource: 'manual',
                              });
                            }
                          }}
                          className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100"
                        >
                          <option value="oneoff">one-off</option>
                          <option value={1}>weekly</option>
                          <option value={2}>2-weekly</option>
                          <option value={3}>3-weekly</option>
                          <option value={4}>monthly</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span>End</span>
                        <select
                          value={i.endOnPhaseExit ?? 'numeric'}
                          onChange={e => {
                            const v = e.target.value;
                            const isPhase = (s: string): s is HealingPhase =>
                              s === 'inflammatory' || s === 'proliferative' || s === 'remodeling';
                            if (v === 'numeric') {
                              updateInterventionSchedule(i.id, { endOnPhaseExit: undefined, scheduleSource: 'manual' });
                            } else if (isPhase(v)) {
                              updateInterventionSchedule(i.id, { endOnPhaseExit: v, scheduleSource: 'manual' });
                            }
                          }}
                          className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100"
                        >
                          <option value="numeric">at week…</option>
                          {phaseEndOptions.map(opt => (
                            <option key={opt.phase} value={opt.phase}>end of {opt.label}</option>
                          ))}
                        </select>
                        {!i.endOnPhaseExit && (
                          <input
                            type="number"
                            min={i.startWeek + 1}
                            max={Math.max(i.startWeek + 1, scrubWeek + 52)}
                            value={endWeek}
                            onChange={e => updateInterventionSchedule(i.id, { endWeek: Number(e.target.value), scheduleSource: 'manual' })}
                            className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100 w-full mt-0.5"
                          />
                        )}
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span>Taper wks</span>
                        <select
                          value={taperWeeks}
                          disabled={!!i.oneOff}
                          onChange={e => updateInterventionSchedule(i.id, {
                            taperWeeks: Number(e.target.value) || undefined,
                            taperFinalDose: Number(e.target.value) > 0 ? (i.taperFinalDose ?? 0.5) : undefined,
                            scheduleSource: 'manual',
                          })}
                          className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-100 disabled:opacity-50"
                        >
                          <option value={0}>none</option>
                          <option value={1}>1 wk</option>
                          <option value={2}>2 wks</option>
                          <option value={3}>3 wks</option>
                          <option value={4}>4 wks</option>
                        </select>
                      </label>
                    </div>
                    {i.scheduleRationale && (
                      <div className="mt-1 text-[9px] text-violet-300/80 italic flex items-start gap-1">
                        <Sparkles className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                        <span className="leading-tight">{i.scheduleRationale}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-400">
          <Sparkles className="h-3 w-3 text-violet-300 shrink-0" />
          <span className="text-violet-300 font-semibold uppercase tracking-wide">AI Insight:</span>
          <span className="truncate">{narrative}</span>
        </div>
      </div>

      {/* INTERVENTION EDITOR (lightweight inline) */}
      {showInterventionEditor && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setShowInterventionEditor(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">Modify Treatments @ week {scrubWeek}</div>
              <button onClick={() => setShowInterventionEditor(false)} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="text-[10px] text-gray-400 mb-2">Add a treatment from the library:</div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {TREATMENT_LIBRARY.map(t => (
                <button
                  key={t.id}
                  onClick={() => { addInterventionToActiveBranch(t.id, scrubWeek); setShowInterventionEditor(false); }}
                  className="text-left text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-cyan-900/40 text-gray-200 border border-gray-700/50"
                  title={t.description}
                >
                  + {t.name}
                </button>
              ))}
            </div>
            {customProfiles.length > 0 && (
              <>
                <div className="text-[10px] text-cyan-300 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI-Designed:</div>
                <div className="grid grid-cols-1 gap-1 mb-3">
                  {customProfiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { addInterventionToActiveBranch(p.id, scrubWeek); setShowInterventionEditor(false); }}
                      className="text-left text-[10px] px-2 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-100 border border-cyan-700/40"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="text-[10px] text-gray-400 mb-1">Active treatments on this branch:</div>
            <div className="space-y-1">
              {activeBranch.interventions.length === 0 && <div className="text-[10px] text-gray-500 italic">None</div>}
              {activeBranch.interventions.map(i => {
                const t = treatmentLookup.get(i.treatmentId);
                return (
                  <div key={i.id} className="flex items-center gap-2 bg-gray-800/60 rounded px-2 py-1 text-[10px]">
                    <span className="flex-1 text-gray-200">{t?.name ?? i.treatmentId}</span>
                    <span className="text-gray-500">w{i.startWeek}</span>
                    <button onClick={() => removeInterventionFromActive(i.id)} className="text-red-400 hover:text-red-200"><Trash2 className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showLoadAdjust && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setShowLoadAdjust(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">Adjust Load @ week {scrubWeek}</div>
              <button onClick={() => setShowLoadAdjust(false)} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="text-[11px] text-gray-300 mb-2">
              Apply a one-time load change to the active branch. Positive values increase mechanical demand; negative values deload.
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-gray-300 w-14">Δ Load</span>
              <Slider
                value={[loadAdjustPercent]}
                min={-50}
                max={50}
                step={5}
                onValueChange={([v]) => setLoadAdjustPercent(v)}
              />
              <span className="text-[11px] font-mono text-cyan-300 w-10 text-right">{loadAdjustPercent > 0 ? '+' : ''}{loadAdjustPercent}%</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => {
                  setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
                    ...b,
                    loadAdjustments: [...b.loadAdjustments, {
                      week: scrubWeek,
                      deltaPercent: loadAdjustPercent,
                      label: `${loadAdjustPercent > 0 ? '+' : ''}${loadAdjustPercent}% load`,
                    }],
                  }));
                  setShowLoadAdjust(false);
                }}
                data-testid="apply-load-adjust"
              >Apply</Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setShowLoadAdjust(false)}>Cancel</Button>
            </div>
            {activeBranch.loadAdjustments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-[10px] text-gray-400 mb-1">Existing adjustments on this branch:</div>
                <div className="space-y-1">
                  {activeBranch.loadAdjustments.map((la, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] bg-gray-800/60 rounded px-2 py-1">
                      <span className="text-gray-200">w{la.week} · {la.label}</span>
                      <button
                        onClick={() => setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
                          ...b,
                          loadAdjustments: b.loadAdjustments.filter((_, j) => j !== i),
                        }))}
                        className="text-red-400 hover:text-red-200"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {branches.length > 1 && (
        <div className="absolute top-16 left-3 z-30 flex items-center gap-1 bg-gray-900/80 border border-gray-700/40 rounded px-2 py-0.5">
          <GitBranch className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] text-gray-300">Active branch:</span>
          <span className="text-[9px] text-cyan-300 font-semibold">{activeProjection.branchName}</span>
        </div>
      )}
    </div>
  );
}
