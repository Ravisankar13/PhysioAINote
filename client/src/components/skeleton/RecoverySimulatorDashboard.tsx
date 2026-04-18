import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
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
  type CustomExerciseInput,
  type CustomManualTechniqueInput,
  type ConditionContext,
  type RecoveryState,
  TREATMENT_LIBRARY,
  TREATMENT_BY_ID,
  simulateBranch,
  simulateNaturalHistoryBaselines,
  optimizeSequence,
  generateNarrative,
  defaultBranch,
  defaultInput,
  buildCustomTreatmentProfiles,
  tissueProfileForContext,
} from "@/lib/recoverySimulationEngine";
import { findConditionProfile } from "@/lib/patientFactorsEngine";
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
  /** Promote per-phase generated exercises into the session-wide
   *  customExercises array so the simulation engine consumes them
   *  through buildCustomTreatmentProfiles. Parent merges into its own
   *  customExerciseResult state. */
  onAddCustomExercises?: (items: CustomExerciseInput[]) => void;
  /** Same as onAddCustomExercises for manual techniques. */
  onAddCustomTechniques?: (items: CustomManualTechniqueInput[]) => void;
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
}: {
  series: { label: string; color: string; values: number[]; dash?: string }[];
  scrubWeek?: number;
  totalWeeks: number;
  onScrub?: (w: number) => void;
  height?: number;
  showGrid?: boolean;
  showWeekLabel?: boolean;
  /** Label unit shown on x-axis ticks and the scrub cursor. Set to
   *  'CHECKPOINT' for purely criterion-gated archetypes; default 'WEEK'
   *  preserves the legacy display for time-gated and hybrid archetypes. */
  axisUnit?: 'WEEK' | 'CHECKPOINT';
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

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onScrub) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (width / rect.width);
    const wf = (relX - padding.left) / cw;
    const wk = Math.round(Math.max(0, Math.min(totalWeeks, wf * totalWeeks)));
    onScrub(wk);
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

      {series.map((s, i) => (
        <path key={i} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />
      ))}

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
  const [optimizerMt, setOptimizerMt] = useState<PhaseRxKindState>({ status: 'idle' });

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
  const treatmentLookup = useMemo(() => {
    if (customProfiles.length === 0) return TREATMENT_BY_ID;
    const m = new Map(TREATMENT_BY_ID);
    for (const p of customProfiles) m.set(p.id, p);
    return m;
  }, [customProfiles]);

  const ctxForSim = conditionContext ?? undefined;
  const projections = useMemo(
    () => branches.map(b => simulateBranch(input, b, 'usual_care', undefined, customProfiles, ctxForSim)),
    [branches, input, customProfiles, ctxForSim],
  );
  const activeBranch = useMemo(() => branches.find(b => b.id === activeBranchId) ?? branches[0], [branches, activeBranchId]);
  const activeProjection = useMemo(() => projections.find(p => p.branchId === activeBranchId) ?? projections[0], [projections, activeBranchId]);
  const baselines = useMemo(() => simulateNaturalHistoryBaselines(input, ctxForSim), [input, ctxForSim]);
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

  const stateAtScrub = activeProjection.states[Math.min(scrubWeek, activeProjection.states.length - 1)];
  const baselineState = activeProjection.states[0];

  // Auto-sync to skeleton
  useEffect(() => {
    if (autoSyncSkeleton && onApplyState && stateAtScrub && baselineState) {
      onApplyState({ week: scrubWeek, state: stateAtScrub, baselineState, branchName: activeProjection.branchName });
    }
  }, [autoSyncSkeleton, scrubWeek, stateAtScrub, baselineState, onApplyState, activeProjection.branchName]);

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
        if (next > input.totalWeeks) { setAnimate(false); return prev; }
        return next;
      });
    }, 1000);
    return () => { if (animateRef.current) { clearInterval(animateRef.current); animateRef.current = null; } };
  }, [animate, input.totalWeeks]);

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

  const addInterventionToActiveBranch = useCallback((treatmentId: string, startWeek: number) => {
    setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
      ...b,
      interventions: [...b.interventions, { id: `i_${Date.now()}`, treatmentId, startWeek, doseMultiplier: 1, adherence: input.patientAdherence }],
    }));
  }, [activeBranchId, input.patientAdherence]);

  const removeInterventionFromActive = useCallback((interventionId: string) => {
    setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : { ...b, interventions: b.interventions.filter(i => i.id !== interventionId) }));
  }, [activeBranchId]);

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

  // Tissue Stress (inverse of loadTolerance — high stress when tolerance is low)
  const tissueStress = useMemo(() => {
    const tol = activeProjection.timelines.tissue.loadTolerance[Math.min(scrubWeek, activeProjection.timelines.tissue.loadTolerance.length - 1)] ?? 0;
    return Math.max(0, Math.min(100, 100 - tol));
  }, [activeProjection, scrubWeek]);

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

      if (!r.reached) {
        r.treatments = TREATMENT_LIBRARY
          .filter(t => stageFitForTreatment(stage, t.healingStageMultiplier, t.name) >= 1.1)
          .slice(0, 3)
          .map(t => t.name);
        r.treatmentSource = 'stage_recommended';
        return;
      }

      const sIdx = r.start;
      const eIdx = r.end;

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

      // Top-3 stage-fit treatments. Stage-fit cascades the existing
      // healingStageMultiplier metadata onto every archetype by taking
      // the max multiplier across the engine phases that map onto this
      // stage, with an optional bonus for treatment-tag matches.
      const scheduled = activeBranch.interventions
        .filter(i => i.startWeek >= sIdx && i.startWeek <= eIdx)
        .map(i => {
          const t = treatmentLookup.get(i.treatmentId);
          const stageFit = t ? stageFitForTreatment(stage, t.healingStageMultiplier, t.name) : 1;
          return { name: t?.name ?? i.treatmentId, score: (attribIndex.get(i.treatmentId) ?? 0) + stageFit * 5, stageFit };
        })
        .filter(x => x.stageFit >= 0.9)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.name);
      if (scheduled.length > 0) {
        r.treatments = scheduled;
        r.treatmentSource = 'scheduled';
        return;
      }
      const attributionFit = [...activeProjection.attribution]
        .map(a => {
          const t = treatmentLookup.get(a.treatmentId);
          const stageFit = t ? stageFitForTreatment(stage, t.healingStageMultiplier, t.name) : 1;
          return { name: a.name, score: a.contributionPercent * stageFit, stageFit };
        })
        .filter(x => x.stageFit >= 0.9)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.name);
      if (attributionFit.length > 0) {
        r.treatments = attributionFit;
        r.treatmentSource = 'attribution';
        return;
      }
      r.treatments = TREATMENT_LIBRARY
        .filter(t => stageFitForTreatment(stage, t.healingStageMultiplier, t.name) >= 1.1)
        .slice(0, 3)
        .map(t => t.name);
      r.treatmentSource = 'stage_recommended';
    });
    return ranges;
  }, [archetype, activeProjection, activeBranch.interventions, activeBranch.flareEvents, activeBranch.loadAdjustments, treatmentLookup, conditionContext, tissueProfile, conditionProfile, goalProfile, input.totalWeeks, stateAtScrub, scrubbedStageIdx]);

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
      phaseStartWeek: scrubWeek,
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
    { label: 'Function',       color: '#06b6d4', values: activeProjection.timelines.function.walking },
    { label: 'Tendon Capacity', color: '#22c55e', values: activeProjection.timelines.capacity },
    { label: 'Pain',           color: '#ef4444', values: activeProjection.timelines.symptoms.pain },
    { label: 'Reinjury Risk',  color: '#f59e0b', values: activeProjection.timelines.risk.reinjury, dash: '3,2' },
  ], [activeProjection]);

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
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Recovery Progression</div>
                <div className="text-[9px] text-gray-500 mb-1">Drag timeline or modify treatments to see changes</div>
                <div className="h-[260px] shrink-0 overflow-hidden">
                  <MiniChart series={mainSeries} scrubWeek={scrubWeek} totalWeeks={input.totalWeeks} onScrub={setScrubWeek} height={240} axisUnit={axisUnit} />
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {mainSeries.map(s => (
                    <span key={s.label} className="flex items-center gap-1 text-[9px] text-gray-400">
                      <span className="w-2.5 h-0.5" style={{ background: s.color }} />{s.label}
                    </span>
                  ))}
                </div>
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

            {/* Phase pills row + tissue stress */}
            <div
              className="grid gap-1.5 mt-3"
              style={{ gridTemplateColumns: `repeat(${archetype.stages.length}, minmax(0, 1fr))` }}
            >
              {archetype.stages.map((p, i) => {
                const active = i === scrubbedStageIdx;
                return (
                  <div
                    key={p.id}
                    className={`rounded p-1.5 border text-center ${active ? `${p.bg} ${p.ring}` : 'bg-gray-800/40 border-gray-700/40'}`}
                    data-testid={`phase-pill-${p.id}`}
                  >
                    <div className="text-[9px] font-semibold" style={{ color: active ? p.color : '#9ca3af' }}>Phase {i + 1}</div>
                    <div className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-gray-400'}`}>{p.name}</div>
                  </div>
                );
              })}
            </div>

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

                      <div className="text-[10px] text-gray-300 leading-snug" data-testid={`phase-strategy-${p.id}`}>
                        {r.strategy}
                      </div>

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

                        type CombinedTreatment =
                          | { kind: 'baseline'; label: string }
                          | { kind: 'session-ex'; label: string }
                          | { kind: 'session-mt'; label: string }
                          | { kind: 'ai-ex'; label: string }
                          | { kind: 'ai-mt'; label: string };
                        const combined: CombinedTreatment[] = [
                          ...r.treatments.map(t => ({ kind: 'baseline' as const, label: t })),
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
                        const visible = isExpanded ? combined : combined.slice(0, baseLimit);
                        const hidden = combined.length - visible.length;

                        const renderItem = (t: CombinedTreatment, i: number) => {
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
                              {(isSession || isAi) && <Sparkles className="h-2.5 w-2.5 shrink-0 opacity-80" />}
                              <span className="truncate">{t.label}</span>
                              {isAi && (
                                <span className="ml-auto text-[8px] uppercase tracking-wide px-1 py-px rounded border border-current/40 opacity-70 shrink-0">
                                  Pending
                                </span>
                              )}
                            </li>
                          );
                        };

                        return (
                          <>
                            <div className="mt-0.5">
                              <div className="text-[8px] uppercase tracking-wide text-gray-500 font-semibold mb-0.5">
                                {sourceLabel} treatments
                              </div>
                              {combined.length === 0 ? (
                                <div className="text-[10px] text-gray-500 italic">No stage-appropriate treatment</div>
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
                                          }));
                                          onAddCustomExercises(stamped);
                                          updatePhaseRx(p.id, 'exercise', { status: 'ready', exercises: exReady, added: true });
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
                                          }));
                                          onAddCustomTechniques(stamped);
                                          updatePhaseRx(p.id, 'manual', { status: 'ready', techniques: mtReady, added: true });
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
        </main>

        {/* RIGHT COLUMN — AI OPTIMIZER RECOMMENDATION */}
        <aside className="overflow-y-auto space-y-3 pl-1">
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

            {/* Generated exercises list — named items with sets×reps */}
            {optimizerEx.status === 'ready' && (optimizerEx.exercises?.length ?? 0) > 0 && (
              <div className="bg-violet-950/20 border border-violet-800/40 rounded p-2 mb-2" data-testid="optimizer-rx-exercises">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] text-violet-300 uppercase tracking-wide font-semibold inline-flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />Exercises ({optimizerEx.exercises!.length})
                  </div>
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
                        const stamped = items.map(ex => ({ ...ex, phaseIndex: optimizerPhaseIdx, phaseLabel }));
                        onAddCustomExercises(stamped);
                        setOptimizerEx({ status: 'ready', exercises: items, added: true });
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                      data-testid="optimizer-add-all-exercises"
                    >
                      <Plus className="h-2.5 w-2.5" />Add all
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {optimizerEx.exercises!.map((ex, i) => {
                    const sets = ex.dosage?.sets;
                    const reps = ex.dosage?.reps;
                    const tempo = ex.dosage?.tempo;
                    const freq = ex.dosage?.frequency;
                    const dose = [sets && `${sets} sets`, reps && `${reps} reps`, tempo, freq].filter(Boolean).join(' · ');
                    return (
                      <li key={i} className="text-[10px] flex items-start gap-1" data-testid={`optimizer-exercise-${i}`}>
                        <span className="text-violet-300 mt-px">•</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-violet-100 font-semibold leading-tight">{ex.name}</div>
                          {(dose || ex.clinicalTarget) && (
                            <div className="text-[9px] text-gray-400 leading-tight">
                              {dose}{dose && ex.clinicalTarget ? ' · ' : ''}{ex.clinicalTarget ?? ''}
                            </div>
                          )}
                        </div>
                        {!optimizerEx.added && onAddCustomExercises && (
                          <button
                            type="button"
                            onClick={() => {
                              const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                              onAddCustomExercises([{ ...ex, phaseIndex: optimizerPhaseIdx, phaseLabel }]);
                            }}
                            className="text-emerald-400 hover:text-emerald-200 shrink-0"
                            data-testid={`optimizer-add-exercise-${i}`}
                            title="Add to plan"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Generated manual therapy list — named items with grades */}
            {optimizerMt.status === 'ready' && (optimizerMt.techniques?.length ?? 0) > 0 && (
              <div className="bg-cyan-950/20 border border-cyan-800/40 rounded p-2 mb-2" data-testid="optimizer-rx-manual">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] text-cyan-300 uppercase tracking-wide font-semibold inline-flex items-center gap-1">
                    <Hand className="h-3 w-3" />Manual Therapy ({optimizerMt.techniques!.length})
                  </div>
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
                        const stamped = items.map(mt => ({ ...mt, phaseIndex: optimizerPhaseIdx, phaseLabel }));
                        onAddCustomTechniques(stamped);
                        setOptimizerMt({ status: 'ready', techniques: items, added: true });
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/30 hover:bg-emerald-600/40 text-emerald-200 inline-flex items-center gap-0.5"
                      data-testid="optimizer-add-all-manual"
                    >
                      <Plus className="h-2.5 w-2.5" />Add all
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {optimizerMt.techniques!.map((mt, i) => {
                    const grade = mt.forceApplicationSequence?.[0]?.grade;
                    const depth = mt.forceApplicationSequence?.[0]?.depth;
                    const dur = mt.dosage?.duration;
                    const reps = mt.dosage?.repetitions;
                    const sets = mt.dosage?.sets;
                    const dose = [grade, depth, sets && `${sets} sets`, reps && `${reps} reps`, dur].filter(Boolean).join(' · ');
                    return (
                      <li key={i} className="text-[10px] flex items-start gap-1" data-testid={`optimizer-manual-${i}`}>
                        <span className="text-cyan-300 mt-px">•</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-cyan-100 font-semibold leading-tight">{mt.name}</div>
                          {(dose || mt.clinicalTarget) && (
                            <div className="text-[9px] text-gray-400 leading-tight">
                              {dose}{dose && mt.clinicalTarget ? ' · ' : ''}{mt.clinicalTarget ?? ''}
                            </div>
                          )}
                        </div>
                        {!optimizerMt.added && onAddCustomTechniques && (
                          <button
                            type="button"
                            onClick={() => {
                              const phaseLabel = phaseRanges[optimizerPhaseIdx]?.stage.name;
                              onAddCustomTechniques([{ ...mt, phaseIndex: optimizerPhaseIdx, phaseLabel }]);
                            }}
                            className="text-emerald-400 hover:text-emerald-200 shrink-0"
                            data-testid={`optimizer-add-manual-${i}`}
                            title="Add to plan"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {altAction && (
              <div className="bg-gray-900/40 rounded p-2 mb-2">
                <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Alternative Option</div>
                <div className="text-[11px] text-gray-200 font-semibold">{altAction.action}</div>
                <div className="text-[10px] text-gray-400">{altAction.rationale}</div>
              </div>
            )}

            <div className="bg-gray-900/40 rounded p-2">
              <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">Optimization Insight</div>
              <div className="text-[10px] text-gray-200 leading-snug">
                {(() => {
                  const sentences = optimizer.narrative.split('.').map(s => s.trim()).filter(Boolean);
                  const phaseSentence = sentences.find(s => /week\s+\d+/i.test(s)) ?? sentences[0] ?? optimizer.narrative;
                  return `${phaseSentence}.`;
                })()} <span className="text-amber-300 font-semibold">Score Δ {(optimizer.expectedScore - optimizer.comparisonScore).toFixed(1)}</span>
              </div>
            </div>
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
            <div className="text-[10px] text-gray-400 mb-1">Active Treatments — click to remove:</div>
            <div className="flex flex-wrap gap-1">
              {activeBranch.interventions.length === 0 && <div className="text-[10px] text-gray-500 italic">No active treatments</div>}
              {activeBranch.interventions.map(i => {
                const t = treatmentLookup.get(i.treatmentId);
                return (
                  <button
                    key={i.id}
                    onClick={() => removeInterventionFromActive(i.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-200 border border-red-700/40 hover:bg-red-800/40 flex items-center gap-1"
                  >
                    <Trash2 className="h-2.5 w-2.5" />{t?.name ?? i.treatmentId} · w{i.startWeek}
                  </button>
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
