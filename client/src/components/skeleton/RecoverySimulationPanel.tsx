import { useMemo, useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  GitBranch,
  Milestone as MilestoneIcon,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  X,
  Zap,
  Sparkles,
  Calendar,
  AlertCircle,
  Trash2,
  Gauge,
} from "lucide-react";
import {
  type SimulationInput,
  type SimulationProjection,
  type ScenarioBranch,
  type Intervention,
  type GoalMode,
  type BaselineMode,
  type ReversePlanResult,
  type OptimizerResult,
  type Milestone,
  type TreatmentEffectProfile,
  type CustomExerciseInput,
  type CustomManualTechniqueInput,
  type ConditionContext,
  TREATMENT_LIBRARY,
  TREATMENT_BY_ID,
  simulateBranch,
  simulateNaturalHistoryBaselines,
  optimizeSequence,
  reversePlan,
  generateNarrative,
  defaultBranch,
  defaultInput,
  buildCustomTreatmentProfiles,
  tissueProfileForContext,
} from "@/lib/recoverySimulationEngine";

interface Props {
  initialInput?: Partial<SimulationInput>;
  conditionLabel?: string;
  onApplyState?: (info: { week: number; state: import("@/lib/recoverySimulationEngine").RecoveryState; baselineState: import("@/lib/recoverySimulationEngine").RecoveryState; branchName: string }) => void;
  hasClinicalInput?: boolean;
  customExercises?: CustomExerciseInput[] | null;
  customTechniques?: CustomManualTechniqueInput[] | null;
  conditionContext?: ConditionContext | null;
}

type TimelineKey = 'symptoms' | 'tissue' | 'function' | 'biomechanics' | 'risk';
type SymptomLine = 'pain' | 'stiffness' | 'swelling' | 'irritability';

const PALETTE = ['#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];

const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  fastest_relief: 'Fastest relief',
  fastest_function: 'Fastest function',
  fastest_rts: 'Fastest return to sport',
  lowest_flare: 'Lowest flare risk',
  strongest_resilience: 'Strongest resilience',
  realistic_adherence: 'Realistic adherence',
};

const BASELINE_LABELS: Record<BaselineMode, string> = {
  no_treatment: 'No treatment',
  rest_only: 'Rest only',
  usual_care: 'Usual care',
  continued_aggravation: 'Continued aggravation',
};

function MultiLineChart({
  series,
  height = 120,
  width = 420,
  yLabel = '',
  yMin = 0,
  yMax = 100,
  bands,
  bandColor = '#06b6d4',
  scrubWeek,
  onScrub,
  totalWeeks,
  milestoneMarkers = [],
  interventionMarkers = [],
  thresholdLines = [],
  uncertaintyHalfWidth,
  showUncertaintyBands = true,
}: {
  series: { label: string; color: string; values: number[]; dash?: string }[];
  height?: number;
  width?: number;
  yLabel?: string;
  yMin?: number;
  yMax?: number;
  bands?: { best: number[]; expected: number[]; slower: number[]; flareAdjusted: number[] } | null;
  bandColor?: string;
  scrubWeek?: number;
  onScrub?: (w: number) => void;
  totalWeeks: number;
  milestoneMarkers?: { week: number; label: string; achieved: boolean }[];
  interventionMarkers?: { week: number; label: string; type: string; treatmentId?: string }[];
  thresholdLines?: { value: number; color: string; label?: string }[];
  /** Task #242 — per-week half-width (in 0–100 chart units) painted
   *  as a translucent confidence band around each non-dashed series.
   *  Independent of the existing `bands` prop (which carries the
   *  best/expected/slower envelope from `simulateBranch`). */
  uncertaintyHalfWidth?: number[];
  /** Visibility toggle for the uncertainty band — gated by the
   *  parent's "Show bands" control. */
  showUncertaintyBands?: boolean;
}) {
  const padding = { top: 8, right: 6, bottom: 16, left: 24 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;

  const xFor = (w: number) => padding.left + (totalWeeks > 0 ? (w / totalWeeks) * cw : 0);
  const yFor = (v: number) => padding.top + (1 - (v - yMin) / (yMax - yMin)) * ch;

  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
  const areaBetween = (top: number[], bot: number[]) => {
    if (top.length === 0) return '';
    const topPath = top.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
    const botPath = bot.slice().reverse().map((v, i) => {
      const realIdx = bot.length - 1 - i;
      return `L${xFor(realIdx).toFixed(1)},${yFor(v).toFixed(1)}`;
    }).join(' ');
    return `${topPath} ${botPath} Z`;
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onScrub) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const wf = (relX - padding.left) / cw;
    const wk = Math.round(Math.max(0, Math.min(totalWeeks, wf * totalWeeks)));
    onScrub(wk);
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} onClick={handleClick} className={onScrub ? 'cursor-crosshair' : ''}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={padding.left + cw} y2={y} stroke="#374151" strokeWidth={0.4} strokeDasharray="2,2" />
            <text x={padding.left - 3} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={7}>{v}</text>
          </g>
        );
      })}
      {[0, Math.floor(totalWeeks / 2), totalWeeks].map(w => (
        <text key={w} x={xFor(w)} y={height - 3} textAnchor="middle" fill="#6b7280" fontSize={7}>w{w}</text>
      ))}
      {yLabel && <text x={2} y={padding.top + ch / 2} fill="#9ca3af" fontSize={7} transform={`rotate(-90 8 ${padding.top + ch / 2})`}>{yLabel}</text>}

      {bands && (
        <>
          <path d={areaBetween(bands.best, bands.flareAdjusted)} fill={bandColor} opacity={0.06} />
          <path d={areaBetween(bands.best, bands.slower)} fill={bandColor} opacity={0.1} />
          <path d={path(bands.best)} fill="none" stroke={bandColor} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.6} />
          <path d={path(bands.slower)} fill="none" stroke={bandColor} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.6} />
          <path d={path(bands.flareAdjusted)} fill="none" stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.5} />
        </>
      )}

      {/* Task #242 — per-series uncertainty bands. Painted *under* the
          series stroke so the center line is always crisp. */}
      {showUncertaintyBands && uncertaintyHalfWidth && uncertaintyHalfWidth.length > 0 && series.map((s, i) => {
        if (s.dash) return null;
        const upper: { x: number; y: number }[] = [];
        const lower: { x: number; y: number }[] = [];
        for (let j = 0; j < s.values.length; j++) {
          const h = uncertaintyHalfWidth[j] ?? uncertaintyHalfWidth[uncertaintyHalfWidth.length - 1] ?? 0;
          const hi = Math.max(yMin, Math.min(yMax, s.values[j] + h));
          const lo = Math.max(yMin, Math.min(yMax, s.values[j] - h));
          upper.push({ x: xFor(j), y: yFor(hi) });
          lower.push({ x: xFor(j), y: yFor(lo) });
        }
        const top = upper.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const bot = lower.slice().reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        return (
          <path
            key={`ub-${i}`}
            d={`${top} ${bot} Z`}
            fill={s.color}
            opacity={0.13}
            stroke="none"
            style={{ transition: 'opacity 350ms ease-out' }}
          >
            <title>{`${s.label} confidence band`}</title>
          </path>
        );
      })}

      {thresholdLines.map((th, i) => (
        <g key={i}>
          <line x1={padding.left} y1={yFor(th.value)} x2={padding.left + cw} y2={yFor(th.value)} stroke={th.color} strokeWidth={0.6} strokeDasharray="4,3" opacity={0.5} />
          {th.label && <text x={padding.left + cw - 2} y={yFor(th.value) - 2} textAnchor="end" fill={th.color} fontSize={6}>{th.label}</text>}
        </g>
      ))}

      {series.map((s, i) => (
        <path key={i} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={1.4} strokeDasharray={s.dash} />
      ))}

      {interventionMarkers.map((m, i) => {
        const isCustom = m.treatmentId?.startsWith('custom_') ?? false;
        const lineColor = isCustom ? '#22d3ee' : '#a855f7';
        const dotColor = m.type === 'flare' ? '#ef4444' : m.type === 'reaggravate' ? '#f97316' : isCustom ? '#22d3ee' : '#a855f7';
        return (
          <g key={`im-${i}`}>
            <line x1={xFor(m.week)} y1={padding.top} x2={xFor(m.week)} y2={padding.top + ch} stroke={lineColor} strokeWidth={isCustom ? 0.7 : 0.5} strokeDasharray="1,2" opacity={isCustom ? 0.8 : 0.6} />
            <circle cx={xFor(m.week)} cy={padding.top + 4} r={isCustom ? 3 : 2.5} fill={dotColor} stroke={isCustom ? '#0e7490' : 'none'} strokeWidth={isCustom ? 0.6 : 0}>
              <title>{m.label}</title>
            </circle>
            {isCustom && (
              <text x={xFor(m.week)} y={padding.top + 1.5} textAnchor="middle" fontSize={4} fill="#0e7490" fontWeight="bold">✦</text>
            )}
          </g>
        );
      })}
      {milestoneMarkers.map((m, i) => (
        <g key={`mm-${i}`}>
          <circle cx={xFor(m.week)} cy={padding.top + ch - 4} r={2.5} fill={m.achieved ? '#22c55e' : '#6b7280'}>
            <title>{m.label}</title>
          </circle>
        </g>
      ))}

      {scrubWeek !== undefined && (
        <line x1={xFor(scrubWeek)} y1={padding.top} x2={xFor(scrubWeek)} y2={padding.top + ch} stroke="#22d3ee" strokeWidth={1} />
      )}
    </svg>
  );
}

export default function RecoverySimulationPanel({ initialInput, conditionLabel, onApplyState, hasClinicalInput, customExercises, customTechniques, conditionContext }: Props) {
  const [input, setInput] = useState<SimulationInput>(() => ({ ...defaultInput(), ...(initialInput ?? {}) }));
  const [branches, setBranches] = useState<ScenarioBranch[]>(() => [defaultBranch(defaultInput())]);
  const [activeBranchId, setActiveBranchId] = useState<string>('plan_active');
  const [scrubWeek, setScrubWeek] = useState(0);
  const [activeTimeline, setActiveTimeline] = useState<TimelineKey>('symptoms');
  const [showBaselines, setShowBaselines] = useState(true);
  const [activeBaseline, setActiveBaseline] = useState<BaselineMode>('usual_care');
  const [goalMode, setGoalMode] = useState<GoalMode>('fastest_function');
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [reverseGoal, setReverseGoal] = useState({ name: 'Return to tennis', weekTarget: 10, minCapacity: 80, minFunction: 80, maxFlareRisk: 35 });
  const [showReverse, setShowReverse] = useState(false);
  const [showDecisionPoint, setShowDecisionPoint] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [feelsVsIs, setFeelsVsIs] = useState(true);
  const [showCapacityDemand, setShowCapacityDemand] = useState(true);

  useEffect(() => {
    if (initialInput) setInput(prev => ({ ...prev, ...initialInput }));
  }, [initialInput]);

  const [autoSyncSkeleton, setAutoSyncSkeleton] = useState(true);
  const [showCustomPrescriptions, setShowCustomPrescriptions] = useState(true);

  const activeBranch = useMemo(() => branches.find(b => b.id === activeBranchId) ?? branches[0], [branches, activeBranchId]);

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
  const activeProjection = useMemo(() => projections.find(p => p.branchId === activeBranchId) ?? projections[0], [projections, activeBranchId]);
  const baselines = useMemo(() => simulateNaturalHistoryBaselines(input, ctxForSim), [input, ctxForSim]);
  const baselineProj = baselines[activeBaseline];

  const optimizer: OptimizerResult = useMemo(
    () => optimizeSequence(input, activeProjection, goalMode, customProfiles, ctxForSim, scrubWeek),
    [input, activeProjection, goalMode, customProfiles, ctxForSim, scrubWeek],
  );
  const reverse: ReversePlanResult = useMemo(
    () => reversePlan(activeProjection, reverseGoal, ctxForSim),
    [activeProjection, reverseGoal, ctxForSim],
  );
  const narrative = useMemo(() => generateNarrative(activeProjection, baselineProj), [activeProjection, baselineProj]);

  const stateAtScrub = activeProjection.states[Math.min(scrubWeek, activeProjection.states.length - 1)];
  const baselineState = activeProjection.states[0];

  useEffect(() => {
    if (autoSyncSkeleton && onApplyState && stateAtScrub && baselineState) {
      onApplyState({ week: scrubWeek, state: stateAtScrub, baselineState, branchName: activeProjection.branchName });
    }
  }, [autoSyncSkeleton, scrubWeek, stateAtScrub, baselineState, onApplyState, activeProjection.branchName]);

  const symptomSeries = useMemo(() => [
    { label: 'Pain', color: '#ef4444', values: activeProjection.timelines.symptoms.pain },
    { label: 'Stiffness', color: '#f97316', values: activeProjection.timelines.symptoms.stiffness, dash: '3,2' },
    { label: 'Swelling', color: '#06b6d4', values: activeProjection.timelines.symptoms.swelling, dash: '2,2' },
    { label: 'Irritability', color: '#a855f7', values: activeProjection.timelines.symptoms.irritability, dash: '4,2' },
  ], [activeProjection]);
  const tissueSeries = useMemo(() => [
    { label: 'Inflammation', color: '#ef4444', values: activeProjection.timelines.tissue.inflammation },
    { label: 'Healing', color: '#22c55e', values: activeProjection.timelines.tissue.healing, dash: '3,2' },
    { label: 'Load tol.', color: '#06b6d4', values: activeProjection.timelines.tissue.loadTolerance, dash: '2,2' },
    { label: 'Structural', color: '#a855f7', values: activeProjection.timelines.tissue.structural, dash: '4,2' },
  ], [activeProjection]);
  const functionSeries = useMemo(() => [
    { label: 'Walking', color: '#06b6d4', values: activeProjection.timelines.function.walking },
    { label: 'Stairs', color: '#22c55e', values: activeProjection.timelines.function.stairs, dash: '3,2' },
    { label: 'Squat', color: '#a855f7', values: activeProjection.timelines.function.squat, dash: '2,2' },
    { label: 'Running', color: '#f59e0b', values: activeProjection.timelines.function.running, dash: '4,2' },
    { label: 'Sport', color: '#ef4444', values: activeProjection.timelines.function.sport, dash: '5,2' },
    { label: 'Work', color: '#14b8a6', values: activeProjection.timelines.function.work, dash: '1,2' },
  ], [activeProjection]);
  const biomechSeries = useMemo(() => [
    { label: 'Joint loading', color: '#ef4444', values: activeProjection.timelines.biomechanics.jointLoading },
    { label: 'Compensation', color: '#f97316', values: activeProjection.timelines.biomechanics.compensation, dash: '3,2' },
    { label: 'Movement Q', color: '#22c55e', values: activeProjection.timelines.biomechanics.movementQuality, dash: '2,2' },
    { label: 'Asymmetry', color: '#a855f7', values: activeProjection.timelines.biomechanics.asymmetry, dash: '4,2' },
  ], [activeProjection]);
  const riskSeries = useMemo(() => [
    { label: 'Reinjury', color: '#ef4444', values: activeProjection.timelines.risk.reinjury },
    { label: 'Flare', color: '#f97316', values: activeProjection.timelines.risk.flare, dash: '3,2' },
    { label: 'Chronicity', color: '#a855f7', values: activeProjection.timelines.risk.chronicity, dash: '2,2' },
    { label: 'Compensatory', color: '#ec4899', values: activeProjection.timelines.risk.compensatory, dash: '4,2' },
  ], [activeProjection]);

  const seriesByKey: Record<TimelineKey, typeof symptomSeries> = {
    symptoms: symptomSeries,
    tissue: tissueSeries,
    function: functionSeries,
    biomechanics: biomechSeries,
    risk: riskSeries,
  };
  const baselineOverlaySeries = showBaselines && activeTimeline === 'symptoms'
    ? [{ label: `Baseline: ${BASELINE_LABELS[activeBaseline]}`, color: baselineProj.color, values: baselineProj.timelines.symptoms.pain, dash: '1,3' }]
    : showBaselines && activeTimeline === 'function'
    ? [{ label: `Baseline`, color: baselineProj.color, values: baselineProj.timelines.function.walking, dash: '1,3' }]
    : showBaselines && activeTimeline === 'risk'
    ? [{ label: `Baseline`, color: baselineProj.color, values: baselineProj.timelines.risk.reinjury, dash: '1,3' }]
    : [];

  const milestoneMarkers = useMemo(() => activeProjection.milestones
    .filter(m => m.achieved && m.weekAchieved !== null)
    .map(m => ({ week: m.weekAchieved!, label: m.label, achieved: m.achieved })), [activeProjection]);
  const interventionMarkers = useMemo(() => activeProjection.interventionMarkers.map(m => ({ week: m.week, label: m.label, type: m.type, treatmentId: m.treatmentId })), [activeProjection]);

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

  const removeBranch = useCallback((id: string) => {
    if (branches.length <= 1) return;
    setBranches(prev => prev.filter(b => b.id !== id));
    if (activeBranchId === id) setActiveBranchId(branches[0].id);
  }, [branches, activeBranchId]);

  const addInterventionToActiveBranch = useCallback((treatmentId: string, startWeek: number, dose = 1) => {
    setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : {
      ...b,
      interventions: [...b.interventions, { id: `i_${Date.now()}`, treatmentId, startWeek, doseMultiplier: dose, adherence: input.patientAdherence }],
    }));
  }, [activeBranchId, input.patientAdherence]);

  const removeInterventionFromActive = useCallback((interventionId: string) => {
    setBranches(prev => prev.map(b => b.id !== activeBranchId ? b : { ...b, interventions: b.interventions.filter(i => i.id !== interventionId) }));
  }, [activeBranchId]);

  const reverseStatusColor = reverse.status === 'on_track' ? 'text-emerald-400' : reverse.status === 'behind' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-2 text-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-semibold">Recovery Simulation Engine</span>
          {conditionLabel && <Badge variant="outline" className="text-[8px] px-1 py-0 border-cyan-700 text-cyan-300">{conditionLabel}</Badge>}
          {conditionContext && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 border-purple-700 text-purple-300" title={conditionContext.conditionLabel}>
              {conditionContext.conditionId.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="text-[9px] text-gray-400 hover:text-gray-200 flex items-center gap-0.5">
          <Gauge className="h-3 w-3" />Settings{showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {conditionContext && (
        <div className="bg-purple-950/30 border border-purple-800/40 rounded p-1.5 text-[9px] text-gray-300 flex flex-wrap gap-x-2 gap-y-0.5">
          <span><span className="text-purple-300 font-semibold">Tissue:</span> {conditionContext.primaryTissue}</span>
          <span><span className="text-purple-300 font-semibold">Pain mech:</span> {conditionContext.painMechanism}{conditionContext.hasNerveRoot ? ' • nerve root' : ''}</span>
          <span><span className="text-purple-300 font-semibold">ROM:</span> {conditionContext.baselineRomPercent.toFixed(0)}%</span>
          <span><span className="text-purple-300 font-semibold">Capacity:</span> {conditionContext.baselineCapacity.toFixed(0)}</span>
          {(() => { const p = tissueProfileForContext(conditionContext); return (
            <>
              <span title="Pathway-specific capacity ceiling"><span className="text-purple-300 font-semibold">Cap ceil:</span> {p.capacityCeiling.toFixed(0)}</span>
              <span title="Pathway-specific ROM ceiling"><span className="text-purple-300 font-semibold">ROM ceil:</span> {p.romCeiling.toFixed(0)}</span>
              {p.gateRelaxation !== 0 && <span title="Pathway gate threshold shift"><span className="text-purple-300 font-semibold">Gate Δ:</span> {p.gateRelaxation > 0 ? '+' : ''}{p.gateRelaxation}</span>}
            </>
          ); })()}
          {conditionContext.scarLoad > 0 && <span><span className="text-purple-300 font-semibold">Scar:</span> {conditionContext.scarLoad.toFixed(0)}</span>}
          {conditionContext.tissueLoad > 0 && <span><span className="text-purple-300 font-semibold">Tissue load:</span> {conditionContext.tissueLoad.toFixed(0)}</span>}
          {conditionContext.slingWeakLinkSeverity > 0 && (
            <span title={`Per-sling severity: ${(Object.entries(conditionContext.slingSeverities ?? {}) as [string, number][])
              .filter(([, v]) => v > 0)
              .map(([id, v]) => `${id.replace(/_/g, ' ')} ${v.toFixed(0)}`)
              .join(', ')}\nRelevant: ${(conditionContext.relevantSlings ?? []).join(', ')}`}>
              <span className="text-purple-300 font-semibold">Sling (worst):</span> {conditionContext.slingWeakLinkSeverity.toFixed(0)}
            </span>
          )}
          {conditionContext.ageYears !== null && <span><span className="text-purple-300 font-semibold">Age:</span> {conditionContext.ageYears}</span>}
          {conditionContext.patientHealingMult !== 1 && <span title="Patient-factor healing multiplier"><span className="text-purple-300 font-semibold">Heal×:</span> {conditionContext.patientHealingMult.toFixed(2)}</span>}
          {conditionContext.patientPainMult !== 1 && <span title="Patient-factor pain sensitivity multiplier"><span className="text-purple-300 font-semibold">Pain×:</span> {conditionContext.patientPainMult.toFixed(2)}</span>}
          {conditionContext.patientRecurrenceMult !== 1 && <span title="Patient-factor recurrence multiplier"><span className="text-purple-300 font-semibold">Recur×:</span> {conditionContext.patientRecurrenceMult.toFixed(2)}</span>}
          {conditionContext.patientTissueQualityMult !== 1 && <span title="Patient-factor tissue quality"><span className="text-purple-300 font-semibold">Tissue×:</span> {conditionContext.patientTissueQualityMult.toFixed(2)}</span>}
        </div>
      )}

      {showSettings && (
        <div className="bg-gray-900/60 border border-gray-700/40 rounded p-2 space-y-1.5 text-[9px]">
          <SettingRow label="Total weeks" value={input.totalWeeks}>
            <Slider value={[input.totalWeeks]} min={4} max={26} step={1} onValueChange={([v]) => setInput(p => ({ ...p, totalWeeks: v }))} />
          </SettingRow>
          <SettingRow label="Severity" value={input.conditionSeverity}>
            <Slider value={[input.conditionSeverity]} min={0} max={100} step={5} onValueChange={([v]) => setInput(p => ({ ...p, conditionSeverity: v }))} />
          </SettingRow>
          <SettingRow label="Irritability" value={input.irritability}>
            <Slider value={[input.irritability]} min={0} max={100} step={5} onValueChange={([v]) => setInput(p => ({ ...p, irritability: v }))} />
          </SettingRow>
          <SettingRow label="Adherence" value={`${Math.round(input.patientAdherence * 100)}%`}>
            <Slider value={[Math.round(input.patientAdherence * 100)]} min={0} max={100} step={5} onValueChange={([v]) => setInput(p => ({ ...p, patientAdherence: v / 100 }))} />
          </SettingRow>
          <SettingRow label="Sport demand" value={input.sportDemand}>
            <Slider value={[input.sportDemand]} min={0} max={100} step={5} onValueChange={([v]) => setInput(p => ({ ...p, sportDemand: v }))} />
          </SettingRow>
          <SettingRow label="Work demand" value={input.workDemand}>
            <Slider value={[input.workDemand]} min={0} max={100} step={5} onValueChange={([v]) => setInput(p => ({ ...p, workDemand: v }))} />
          </SettingRow>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Acuity:</span>
            {(['acute', 'subacute', 'chronic'] as const).map(a => (
              <button key={a} onClick={() => setInput(p => ({ ...p, acuity: a }))} className={`px-1.5 py-0.5 rounded text-[8px] ${input.acuity === a ? 'bg-cyan-600/40 text-cyan-200' : 'bg-gray-800/60 text-gray-400'}`}>{a}</button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        {branches.map(b => (
          <div key={b.id} className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] border ${b.id === activeBranchId ? 'bg-cyan-900/50 border-cyan-500/50' : 'bg-gray-800/40 border-gray-700/40'}`}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
            <button onClick={() => setActiveBranchId(b.id)} className="text-gray-200">{b.name}</button>
            {branches.length > 1 && (
              <button onClick={() => removeBranch(b.id)} className="text-gray-500 hover:text-red-400"><X className="h-2.5 w-2.5" /></button>
            )}
          </div>
        ))}
        <button onClick={() => addBranch({ name: `Branch ${branches.length + 1}` })} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-dashed border-gray-600/50 text-[9px] text-gray-400 hover:text-gray-200">
          <GitBranch className="h-3 w-3" />Branch from active
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {(['symptoms', 'tissue', 'function', 'biomechanics', 'risk'] as TimelineKey[]).map(k => (
          <button key={k} onClick={() => setActiveTimeline(k)} className={`px-1.5 py-0.5 rounded text-[9px] ${activeTimeline === k ? 'bg-cyan-700/40 text-cyan-200' : 'bg-gray-800/40 text-gray-400'}`}>{k}</button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <label className="flex items-center gap-1 text-[9px] text-gray-400">
            <input type="checkbox" checked={showBaselines} onChange={e => setShowBaselines(e.target.checked)} className="h-2.5 w-2.5" />Baseline
          </label>
          <select value={activeBaseline} onChange={e => setActiveBaseline(e.target.value as BaselineMode)} className="bg-gray-800/60 border border-gray-700/40 rounded text-[9px] text-gray-200 px-1 py-0.5">
            {(Object.keys(BASELINE_LABELS) as BaselineMode[]).map(b => <option key={b} value={b}>{BASELINE_LABELS[b]}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <MultiLineChart
          series={[...seriesByKey[activeTimeline], ...baselineOverlaySeries]}
          totalWeeks={input.totalWeeks}
          bands={activeTimeline === 'symptoms' ? activeProjection.bands.pain : activeTimeline === 'function' ? activeProjection.bands.function : activeTimeline === 'risk' ? activeProjection.bands.risk : null}
          bandColor={activeTimeline === 'symptoms' ? '#ef4444' : activeTimeline === 'function' ? '#22c55e' : '#f97316'}
          scrubWeek={scrubWeek}
          onScrub={setScrubWeek}
          milestoneMarkers={milestoneMarkers}
          interventionMarkers={interventionMarkers}
          height={140}
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {seriesByKey[activeTimeline].map((s, i) => (
            <span key={i} className="flex items-center gap-0.5 text-[7px] text-gray-400">
              <span className="w-2 h-[2px]" style={{ backgroundColor: s.color }} />{s.label}
            </span>
          ))}
          <span className="text-[7px] text-gray-500 ml-2">band: best · expected · slower · flare-adjusted</span>
        </div>
      </div>

      {feelsVsIs && (
        <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-300 font-semibold">"Feels better" vs "Is better"</span>
            <button onClick={() => setFeelsVsIs(false)} className="text-gray-500 hover:text-gray-300"><X className="h-2.5 w-2.5" /></button>
          </div>
          <MultiLineChart
            series={[
              { label: 'Symptom recovery', color: '#22c55e', values: activeProjection.timelines.feelsBetter },
              { label: 'Functional recovery', color: '#06b6d4', values: activeProjection.timelines.function.walking, dash: '3,2' },
              { label: 'Capacity recovery', color: '#a855f7', values: activeProjection.timelines.capacityRecovery, dash: '4,2' },
            ]}
            totalWeeks={input.totalWeeks}
            scrubWeek={scrubWeek}
            onScrub={setScrubWeek}
            height={90}
          />
        </div>
      )}

      {showCapacityDemand && (
        <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-300 font-semibold">Capacity vs Demand</span>
            <button onClick={() => setShowCapacityDemand(false)} className="text-gray-500 hover:text-gray-300"><X className="h-2.5 w-2.5" /></button>
          </div>
          <MultiLineChart
            series={[
              { label: 'Capacity', color: '#22c55e', values: activeProjection.timelines.capacity },
              { label: 'Demand', color: '#ef4444', values: activeProjection.timelines.demand, dash: '3,2' },
            ]}
            totalWeeks={input.totalWeeks}
            scrubWeek={scrubWeek}
            onScrub={setScrubWeek}
            height={80}
          />
          {(() => {
            const overload = activeProjection.timelines.capacity.map((c, i) => activeProjection.timelines.demand[i] > c ? i : -1).filter(i => i >= 0);
            return overload.length > 0 ? (
              <div className="flex items-center gap-1 text-[8px] text-amber-400 mt-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />Overload windows: weeks {overload.join(', ')}
              </div>
            ) : (
              <div className="text-[8px] text-emerald-400 mt-0.5">Capacity stays ahead of demand throughout.</div>
            );
          })()}
        </div>
      )}

      {onApplyState && hasClinicalInput === false && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded p-1.5 text-[9px] text-amber-200">
          Add pain markers, compromised tissues, scars, or muscle states to the 3D model first — the recovery scrubber will then animate those clinical findings over the simulated weeks.
        </div>
      )}

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-gray-300 font-semibold flex items-center gap-1">
            <Calendar className="h-3 w-3" />Week {scrubWeek} of {input.totalWeeks} — {activeProjection.branchName}
            {autoSyncSkeleton && stateAtScrub && baselineState && (() => {
              const pf = baselineState.pain > 0.001 ? Math.max(0, Math.min(2, stateAtScrub.pain / baselineState.pain)) : (stateAtScrub.pain > 0.001 ? 1 : 0);
              const colorClass = pf < 0.95 ? 'text-emerald-300' : pf > 1.05 ? 'text-red-300' : 'text-gray-300';
              return <span className={`ml-1 ${colorClass}`} title="Pain marker scaling factor on the 3D skeleton">• markers ×{pf.toFixed(2)}</span>;
            })()}
          </span>
          <div className="flex items-center gap-1">
            {onApplyState && (
              <>
                <label className="flex items-center gap-0.5 text-[8px] text-emerald-300 cursor-pointer" title="Auto-sync 3D skeleton to scrubbed week">
                  <input type="checkbox" checked={autoSyncSkeleton} onChange={e => setAutoSyncSkeleton(e.target.checked)} className="h-2.5 w-2.5" />Sync
                </label>
                <button
                  onClick={() => onApplyState({ week: scrubWeek, state: stateAtScrub, baselineState, branchName: activeProjection.branchName })}
                  className="text-[9px] text-emerald-400 hover:text-emerald-200 flex items-center gap-0.5 border border-emerald-700/40 bg-emerald-900/20 rounded px-1 py-0.5"
                  title="Update the 3D model to reflect this week's predicted state"
                >
                  <ArrowRight className="h-3 w-3" />Apply
                </button>
              </>
            )}
            <button onClick={() => setShowDecisionPoint(!showDecisionPoint)} className="text-[9px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5">
              <Plus className="h-3 w-3" />Decision point{showDecisionPoint ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 text-[8px]">
          <Stat label="Pain" value={stateAtScrub.pain} />
          <Stat label="Capacity" value={stateAtScrub.capacity} />
          <Stat label="Function" value={(stateAtScrub.walking + stateAtScrub.stairs + stateAtScrub.squat) / 3} />
          <Stat label="Reinjury" value={stateAtScrub.reinjuryRisk} inverse />
          <Stat label="Flare risk" value={stateAtScrub.flareRisk} inverse />
          <Stat label="ROM%" value={stateAtScrub.romPercent} />
          <Stat label="Strength" value={stateAtScrub.strength} />
          <Stat label="Sleep" value={stateAtScrub.sleep} />
        </div>
        <div className="text-[8px] text-gray-500 mt-1">Healing: <span className="text-cyan-300">{stateAtScrub.healingPhase}</span> · Progress {stateAtScrub.healingProgress.toFixed(0)}%</div>

        {showDecisionPoint && (
          <div className="mt-1.5 border-t border-gray-700/40 pt-1.5 space-y-1">
            <div className="text-[9px] text-gray-300 font-semibold">At week {scrubWeek}, branch from active:</div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => addBranch({ name: `Flare wk${scrubWeek}`, flareEvents: [{ week: scrubWeek, severity: 20 }] })} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-700/30 text-amber-200 border border-amber-700/40 flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />Simulate flare</button>
              <button onClick={() => addBranch({ name: `Reaggravation wk${scrubWeek}`, reaggravationEvents: [{ week: scrubWeek, severityPct: 25 }] })} className="text-[8px] px-1.5 py-0.5 rounded bg-red-700/30 text-red-200 border border-red-700/40 flex items-center gap-0.5"><AlertCircle className="h-2.5 w-2.5" />Re-aggravate</button>
              <button onClick={() => addBranch({ name: `+Load wk${scrubWeek}`, loadAdjustments: [{ week: scrubWeek, deltaPercent: 20, label: 'Increase load' }] })} className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-700/30 text-cyan-200 border border-cyan-700/40">+Load</button>
              <button onClick={() => addBranch({ name: `-Load wk${scrubWeek}`, loadAdjustments: [{ week: scrubWeek, deltaPercent: -20, label: 'Reduce load' }] })} className="text-[8px] px-1.5 py-0.5 rounded bg-blue-700/30 text-blue-200 border border-blue-700/40">-Load</button>
              <button onClick={() => addBranch({ name: `Adherence 50%`, adherenceOverride: 0.5 })} className="text-[8px] px-1.5 py-0.5 rounded bg-purple-700/30 text-purple-200 border border-purple-700/40">Adherence 50%</button>
              <button onClick={() => addBranch({ name: `Adherence 0%`, adherenceOverride: 0 })} className="text-[8px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-700/40">Adherence 0%</button>
              <button onClick={() => addBranch({ name: `Hold 2wk`, progressionHoldUntilWeek: scrubWeek + 2 })} className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-700/30 text-yellow-200 border border-yellow-700/40" title="Pause functional progression for 2 weeks (deload/hold)">Hold 2wk</button>
              <button onClick={() => addBranch({ name: `Hold 4wk`, progressionHoldUntilWeek: scrubWeek + 4 })} className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-800/40 text-yellow-200 border border-yellow-700/40" title="Pause functional progression for 4 weeks">Hold 4wk</button>
            </div>
            <div className="text-[9px] text-gray-300 font-semibold mt-1">Add treatment from week {scrubWeek}:</div>
            <div className="flex flex-wrap gap-1">
              {TREATMENT_LIBRARY.map(t => (
                <button key={t.id} title={t.description} onClick={() => addInterventionToActiveBranch(t.id, scrubWeek)} className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/40 hover:bg-cyan-700/30 hover:text-cyan-200 text-gray-300">+ {t.name}</button>
              ))}
            </div>
            <div className="text-[9px] text-gray-300 font-semibold mt-1">Active interventions:</div>
            <div className="space-y-0.5">
              {activeBranch.interventions.map(i => {
                const t = treatmentLookup.get(i.treatmentId);
                const isCustom = i.treatmentId.startsWith('custom_');
                const customKind = i.treatmentId.startsWith('custom_ex_') ? 'Exercise' : i.treatmentId.startsWith('custom_mt_') ? 'Manual' : null;
                const lastDose = (activeBranch.doseChanges ?? []).filter(d => d.interventionId === i.id && d.week <= scrubWeek).sort((a, b) => b.week - a.week)[0]?.newDoseMultiplier ?? i.doseMultiplier;
                const applyDose = (mul: number) => {
                  const newMul = Math.max(0, Math.min(2, lastDose * mul));
                  addBranch({ name: `${t?.name ?? i.treatmentId} dose ×${newMul.toFixed(2)} wk${scrubWeek}`, doseChanges: [{ week: scrubWeek, interventionId: i.id, newDoseMultiplier: newMul }] });
                };
                return (
                  <div key={i.id} className="flex items-center gap-1 text-[8px] bg-gray-800/40 rounded px-1 py-0.5">
                    <span className="text-gray-200 flex-1 truncate" title={t?.name ?? i.treatmentId}>{t?.name ?? i.treatmentId}</span>
                    {isCustom && (
                      <span className="px-1 py-px rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 flex items-center gap-0.5" title={`AI-designed ${customKind?.toLowerCase()} prescription`}>
                        <Sparkles className="h-2 w-2" />{customKind}
                      </span>
                    )}
                    <span className="text-gray-500">w{i.startWeek}{i.endWeek ? `–${i.endWeek}` : '+'}</span>
                    <span className="text-gray-500">×{lastDose.toFixed(2)}</span>
                    <button onClick={() => applyDose(0.5)} className="px-1 rounded bg-blue-900/40 text-blue-200 hover:bg-blue-700/40" title="Halve dose at this week (new branch)">−50%</button>
                    <button onClick={() => applyDose(0.75)} className="px-1 rounded bg-blue-900/30 text-blue-200 hover:bg-blue-700/30" title="Reduce dose 25% at this week (new branch)">−25%</button>
                    <button onClick={() => applyDose(1.25)} className="px-1 rounded bg-cyan-900/30 text-cyan-200 hover:bg-cyan-700/30" title="Increase dose 25% at this week (new branch)">+25%</button>
                    <button onClick={() => applyDose(1.5)} className="px-1 rounded bg-cyan-900/40 text-cyan-200 hover:bg-cyan-700/40" title="Increase dose 50% at this week (new branch)">+50%</button>
                    <button onClick={() => removeInterventionFromActive(i.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                  </div>
                );
              })}
              {activeBranch.interventions.length === 0 && <div className="text-[8px] text-gray-500">(none)</div>}
            </div>
          </div>
        )}
      </div>

      <div className="bg-cyan-950/20 border border-cyan-700/40 rounded p-1.5">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setShowCustomPrescriptions(v => !v)}
            className="text-[9px] text-cyan-200 font-semibold flex items-center gap-1 hover:text-cyan-100"
            title={showCustomPrescriptions ? 'Collapse' : 'Expand'}
          >
            {showCustomPrescriptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <Sparkles className="h-3 w-3 text-cyan-400" />
            AI-Designed Prescriptions ({customProfiles.length})
          </button>
          {showCustomPrescriptions && customProfiles.length > 0 && <span className="text-[8px] text-cyan-400/70">Add to plan @ wk {scrubWeek}</span>}
        </div>
        {!showCustomPrescriptions ? null : customProfiles.length === 0 ? (
          <div className="text-[8px] text-cyan-300/70 leading-tight bg-cyan-950/30 border border-dashed border-cyan-700/40 rounded px-1.5 py-1.5">
            No AI-designed exercises or manual techniques yet. Open the <span className="text-cyan-200 font-semibold">Exercise Engine</span> or <span className="text-cyan-200 font-semibold">Manual Therapy Engine</span> tabs to design patient-specific prescriptions — they will appear here and can be added directly to the recovery plan.
          </div>
        ) : (
          <>
            <div className="text-[8px] text-cyan-300/70 mb-1.5 leading-tight">
              Patient-specific exercises and manual techniques designed by the AI engines, modeled into the recovery curve with synthesized treatment effects. Markers on the chart appear in cyan with a ✦ to distinguish from library treatments.
            </div>
            <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
              {customProfiles.map((p, profileIdx) => {
                const isInPlan = activeBranch.interventions.some(i => i.treatmentId === p.id);
                const kind = p.id.startsWith('custom_ex_') ? 'Exercise' : 'Manual';
                const badgeColor = kind === 'Exercise' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' : 'bg-rose-900/40 text-rose-300 border-rose-700/50';
                const topEffects = Object.entries(p.effects)
                  .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
                  .slice(0, 3)
                  .map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${(v as number).toFixed(1)}`)
                  .join(', ');
                const sourceEx = customExercises?.[profileIdx];
                const sourceMt = customTechniques?.[profileIdx - (customExercises?.length ?? 0)];
                const targetTissue = kind === 'Exercise'
                  ? (sourceEx?.targetSystem ?? sourceEx?.clinicalTarget ?? '—')
                  : (sourceMt?.targetSystem ?? sourceMt?.clinicalTarget ?? '—');
                const dosageText = kind === 'Exercise' && sourceEx?.dosage
                  ? `${sourceEx.dosage.sets ?? '?'}×${sourceEx.dosage.reps ?? '?'}${sourceEx.dosage.frequency ? ` · ${sourceEx.dosage.frequency}` : ''}`
                  : kind === 'Manual' && sourceMt?.dosage
                    ? `${sourceMt.dosage.repetitions ?? sourceMt.dosage.sets ?? '?'}${sourceMt.dosage.duration ? ` × ${sourceMt.dosage.duration}` : ''}${sourceMt.dosage.frequency ? ` · ${sourceMt.dosage.frequency}` : ''}`
                    : '—';
                return (
                  <div key={p.id} className="text-[8px] bg-gray-900/60 rounded px-1 py-0.5 border border-gray-700/40">
                    <div className="flex items-center gap-1">
                      <span className={`px-1 py-px rounded border shrink-0 ${badgeColor}`} title={`AI-designed ${kind.toLowerCase()}`}>{kind}</span>
                      <div className="text-cyan-100 truncate flex-1 min-w-0" title={p.name}>{p.name}</div>
                      {isInPlan ? (
                        <span className="text-emerald-400 px-1 flex items-center gap-0.5 shrink-0" title="Already in active plan">
                          <CheckCircle2 className="h-2.5 w-2.5" />In plan
                        </span>
                      ) : (
                        <button
                          onClick={() => addInterventionToActiveBranch(p.id, scrubWeek)}
                          className="px-1.5 py-0.5 rounded bg-cyan-700/40 text-cyan-200 hover:bg-cyan-600/50 border border-cyan-700/50 flex items-center gap-0.5 shrink-0"
                          title={`Add ${p.name} to active plan starting at week ${scrubWeek}`}
                        >
                          <Plus className="h-2 w-2" />Add @ wk{scrubWeek}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 pl-1">
                      <span className="text-gray-400 shrink-0">Target:</span>
                      <span className="text-gray-200 truncate" title={targetTissue}>{targetTissue}</span>
                    </div>
                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-gray-400 shrink-0">Dose:</span>
                      <span className="text-gray-200 truncate" title={dosageText}>{dosageText}</span>
                    </div>
                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-gray-400 shrink-0">Effects:</span>
                      <span className="text-cyan-300/80 truncate" title={topEffects}>{topEffects}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <div className="flex items-center gap-1 mb-1">
          <MilestoneIcon className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] text-gray-300 font-semibold">Milestones & Progression Gates</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {activeProjection.milestones.map(m => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
        </div>
      </div>

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-300 font-semibold flex items-center gap-1"><Brain className="h-3 w-3 text-emerald-400" />Optimizer</span>
          <button onClick={() => setShowOptimizer(!showOptimizer)} className="text-[9px] text-emerald-400">{showOptimizer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {(Object.keys(GOAL_MODE_LABELS) as GoalMode[]).map(m => (
            <button key={m} onClick={() => setGoalMode(m)} className={`px-1.5 py-0.5 rounded text-[8px] ${goalMode === m ? 'bg-emerald-700/40 text-emerald-200' : 'bg-gray-800/60 text-gray-400'}`}>{GOAL_MODE_LABELS[m]}</button>
          ))}
        </div>
        {showOptimizer && (
          <div className="mt-1 space-y-0.5 text-[8px]">
            <div className="text-emerald-300">Best next action: <span className="font-semibold">{optimizer.bestNextAction}</span></div>
            <div className="text-gray-300">Score Δ vs current plan: <span className={optimizer.expectedScore > optimizer.comparisonScore ? 'text-emerald-300' : 'text-red-300'}>{(optimizer.expectedScore - optimizer.comparisonScore).toFixed(1)}</span></div>
            <div className="text-gray-400 italic">{optimizer.narrative}</div>
            <div className="mt-0.5 space-y-0.5">
              {optimizer.recommendedSequence.slice(0, 8).map((s, i) => (
                <div key={i} className="flex gap-1 text-gray-400"><span className="text-gray-500 w-8">w{s.week}</span><span>{s.action}</span></div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="h-5 text-[8px] mt-1" onClick={() => {
              const newBranch: ScenarioBranch = {
                ...optimizer.optimizedBranchTemplate,
                id: `branch_opt_${Date.now()}`,
                name: `Optimized: ${GOAL_MODE_LABELS[goalMode]}`,
                color: PALETTE[branches.length % PALETTE.length],
              };
              setBranches(prev => [...prev, newBranch]);
              setActiveBranchId(newBranch.id);
            }}>
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />Apply optimized branch
            </Button>
          </div>
        )}
      </div>

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-300 font-semibold flex items-center gap-1"><Target className="h-3 w-3 text-amber-400" />Reverse planning</span>
          <button onClick={() => setShowReverse(!showReverse)} className="text-[9px] text-amber-400">{showReverse ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
        </div>
        {showReverse && (
          <div className="mt-1 space-y-1 text-[8px]">
            <div className="flex gap-1 items-center">
              <input value={reverseGoal.name} onChange={e => setReverseGoal(g => ({ ...g, name: e.target.value }))} className="flex-1 bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-[9px] text-gray-200" />
              <span className="text-gray-400">in</span>
              <input type="number" value={reverseGoal.weekTarget} onChange={e => setReverseGoal(g => ({ ...g, weekTarget: Math.max(1, parseInt(e.target.value) || 1) }))} className="w-12 bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-[9px] text-gray-200" />
              <span className="text-gray-400">weeks</span>
            </div>
            <div className="flex gap-2 text-[8px] text-gray-400">
              <label>Min capacity:<input type="number" value={reverseGoal.minCapacity} onChange={e => setReverseGoal(g => ({ ...g, minCapacity: parseInt(e.target.value) || 0 }))} className="ml-1 w-12 bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-gray-200" /></label>
              <label>Max flare:<input type="number" value={reverseGoal.maxFlareRisk} onChange={e => setReverseGoal(g => ({ ...g, maxFlareRisk: parseInt(e.target.value) || 0 }))} className="ml-1 w-12 bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-gray-200" /></label>
            </div>
            <div className={`font-semibold ${reverseStatusColor}`}>Status: {reverse.status.replace('_', ' ')}{reverse.gapWeeks > 0 ? ` (gap ${reverse.gapWeeks} wk)` : ''}</div>
            <div className="text-gray-400 italic">{reverse.narrative}</div>
            <div className="mt-0.5 space-y-0.5">
              {reverse.required.map((r, i) => (
                <div key={i} className="flex gap-1 text-gray-400"><span className="text-gray-500 w-10">w{r.deadlineWeek}</span><span className="flex-1">{r.milestone}</span><span className="text-cyan-300">cap≥{r.capacityNeeded}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-300 font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3 text-violet-400" />Treatment attribution</span>
          <button onClick={() => setShowAttribution(!showAttribution)} className="text-[9px] text-violet-400">{showAttribution ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
        </div>
        {showAttribution && (
          <div className="mt-1 space-y-0.5 text-[8px]">
            {activeProjection.attribution.length === 0 && <div className="text-gray-500">No active treatments.</div>}
            {activeProjection.attribution.slice(0, 8).map(a => (
              <div key={a.treatmentId} className="flex items-center gap-1">
                <span className="flex-1 text-gray-300">{a.name}</span>
                <div className="w-20 h-1 bg-gray-700/60 rounded">
                  <div className="h-1 bg-violet-500 rounded" style={{ width: `${Math.min(100, a.contributionPercent)}%` }} />
                </div>
                <span className="w-8 text-right text-violet-300">{a.contributionPercent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-cyan-950/30 border border-cyan-700/30 rounded p-2 text-[9px] text-cyan-100 leading-snug">
        <div className="flex items-center gap-1 mb-1 text-cyan-300 font-semibold"><Zap className="h-3 w-3" />Narrative summary</div>
        {narrative}
      </div>

      {projections.length > 1 && (
        <div className="bg-gray-900/40 border border-gray-700/40 rounded p-1.5">
          <div className="text-[9px] text-gray-300 font-semibold mb-1 flex items-center gap-1"><GitBranch className="h-3 w-3" />Scenario comparison ({projections.length})</div>
          <MultiLineChart
            totalWeeks={input.totalWeeks}
            series={projections.map(p => ({ label: p.branchName, color: p.color, values: p.timelines.symptoms.pain }))}
            scrubWeek={scrubWeek}
            onScrub={setScrubWeek}
            height={90}
            yLabel="pain"
          />
          <MultiLineChart
            totalWeeks={input.totalWeeks}
            series={projections.map(p => ({ label: p.branchName, color: p.color, values: p.timelines.capacity }))}
            scrubWeek={scrubWeek}
            onScrub={setScrubWeek}
            height={90}
            yLabel="capacity"
          />
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, value, children }: { label: string; value: number | string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-gray-400"><span>{label}</span><span className="text-cyan-300">{value}</span></div>
      {children}
    </div>
  );
}

function Stat({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const v = Math.round(value);
  const good = inverse ? v < 30 : v > 70;
  const bad = inverse ? v > 60 : v < 30;
  const color = good ? 'text-emerald-300' : bad ? 'text-red-300' : 'text-amber-300';
  return (
    <div className="flex flex-col bg-gray-800/40 rounded px-1 py-0.5">
      <span className="text-gray-500 text-[7px]">{label}</span>
      <span className={`font-mono ${color}`}>{v}</span>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  return (
    <div className="flex items-center gap-1 text-[8px]">
      {milestone.achieved ? (
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
      ) : (
        <RefreshCw className="h-2.5 w-2.5 text-gray-500 shrink-0" />
      )}
      <span className="flex-1 text-gray-300 truncate" title={milestone.description}>{milestone.label}</span>
      <span className={`font-mono ${milestone.achieved ? 'text-emerald-300' : 'text-gray-500'}`}>
        {milestone.achieved ? `w${milestone.weekAchieved}` : '—'}
      </span>
    </div>
  );
}
