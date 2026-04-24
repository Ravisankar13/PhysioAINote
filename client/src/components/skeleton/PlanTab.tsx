import { useState } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XOctagon,
  Dumbbell,
  Hand,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Shield,
  Sparkles,
  Activity,
  Calendar,
  Zap,
} from "lucide-react";

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

export interface PlanExercise {
  id: string;
  name: string;
  category: string;
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
  slingTarget?: string;
  targetStructure?: string;
  mobilisationGrade?: string;
  // Optimal Loading Engine annotations (Task #231) — present only when
  // the engine is the dosage source of truth for this exercise.
  optimalLoad?: import('@shared/schema').OptimalLoadPrescription;
  loadingProjection?: import('@shared/schema').OptimalLoadPrescription[];
  swapNotice?: { from: string; reason: string };
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
  // Optimal Loading Engine handshake (Task #231)
  loadingPlan?: import('@shared/schema').TendinopathyLoadingPlan;
  loadingEngine?: {
    applicable: boolean;
    reason?: string;
    site?: import('@shared/schema').TendinopathySite;
  };
  /** Server-computed diff against the previously-stored plan. */
  loadingDiff?: import('@shared/schema').LoadingPlanDiff;
}

export type LoadingOverridePayload =
  Pick<import('@shared/schema').OptimalLoadPrescription, 'exerciseId' | 'weekIndex'>
  & Partial<import('@shared/schema').OptimalLoadPrescription>;

interface PlanTabProps {
  data: TreatmentPlanResult | null;
  isLoading: boolean;
  onTargetRegionClick?: (regions: string[]) => void;
  /** Recompute now — clinician explicit trigger. */
  onLoadingRecalculate?: () => void;
  /** Persist a clinician override and trigger a recompute. */
  onLoadingOverride?: (override: LoadingOverridePayload) => void;
  /** Clear an override line. */
  onLoadingClearOverride?: (exerciseId: string, weekIndex: number) => void;
}

const PHASE_COLORS = [
  'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30',
  'from-teal-500/10 to-teal-600/5 border-teal-500/30',
  'from-emerald-500/10 to-emerald-600/5 border-emerald-500/30',
];

const PHASE_ACCENT = [
  'text-cyan-400',
  'text-teal-400',
  'text-emerald-400',
];

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-blue-500/20 text-blue-400',
  C: 'bg-amber-500/20 text-amber-400',
  Expert: 'bg-gray-500/20 text-gray-400',
};

const CONFIDENCE_LABELS: Record<NonNullable<PlanExercise['optimalLoad']>['confidence'], string> = {
  rct_supported: 'RCT-supported',
  protocol_supported: 'Protocol-supported',
  expert_consensus: 'Expert consensus',
  extrapolation: 'Extrapolated',
};

const CONFIDENCE_COLORS: Record<NonNullable<PlanExercise['optimalLoad']>['confidence'], string> = {
  rct_supported: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  protocol_supported: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  expert_consensus: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  extrapolation: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function LoadingDoseEditor({
  optimalLoad,
  onSave,
  onClear,
  onClose,
}: {
  optimalLoad: NonNullable<PlanExercise['optimalLoad']>;
  onSave: (override: LoadingOverridePayload) => void;
  onClear?: () => void;
  onClose: () => void;
}) {
  const [sets, setSets] = useState<number>(optimalLoad.sets);
  const [reps, setReps] = useState<string>(optimalLoad.reps);
  const [days, setDays] = useState<number>(optimalLoad.daysPerWeek);
  const [pain, setPain] = useState<number>(optimalLoad.painCeilingNrs);
  return (
    <div className="rounded-md p-2 bg-slate-900/50 border border-slate-600/30 space-y-1.5" data-testid={`editor-loading-override-${optimalLoad.exerciseId}`}>
      <div className="grid grid-cols-2 gap-1.5 text-[9px]">
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Sets</span>
          <input type="number" min={1} max={10} value={sets} onChange={e => setSets(Number(e.target.value) || 1)} className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100" data-testid={`input-override-sets-${optimalLoad.exerciseId}`} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Reps</span>
          <input value={reps} onChange={e => setReps(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100" data-testid={`input-override-reps-${optimalLoad.exerciseId}`} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Days/wk</span>
          <input type="number" min={1} max={7} value={days} onChange={e => setDays(Number(e.target.value) || 1)} className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100" data-testid={`input-override-days-${optimalLoad.exerciseId}`} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Pain ceiling NRS</span>
          <input type="number" min={0} max={10} value={pain} onChange={e => setPain(Number(e.target.value) || 0)} className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100" data-testid={`input-override-pain-${optimalLoad.exerciseId}`} />
        </label>
      </div>
      <div className="flex items-center justify-end gap-1">
        {onClear && (
          <button onClick={onClear} className="px-2 py-0.5 text-[9px] bg-red-900/30 text-red-300 border border-red-700/30 rounded hover:bg-red-900/60" data-testid={`button-clear-override-${optimalLoad.exerciseId}`}>Clear override</button>
        )}
        <button onClick={onClose} className="px-2 py-0.5 text-[9px] bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700">Cancel</button>
        <button
          onClick={() => onSave({ exerciseId: optimalLoad.exerciseId, weekIndex: optimalLoad.weekIndex, sets, reps, daysPerWeek: days, painCeilingNrs: pain })}
          className="px-2 py-0.5 text-[9px] bg-emerald-900/40 text-emerald-200 border border-emerald-700/40 rounded hover:bg-emerald-900/60"
          data-testid={`button-save-override-${optimalLoad.exerciseId}`}
        >Save & recompute</button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  onTargetClick,
  onLoadingOverride,
  onLoadingClearOverride,
}: {
  exercise: PlanExercise;
  onTargetClick?: (regions: string[]) => void;
  onLoadingOverride?: (override: LoadingOverridePayload) => void;
  onLoadingClearOverride?: (exerciseId: string, weekIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingOverride, setEditingOverride] = useState(false);
  const [showProjection, setShowProjection] = useState(false);
  const isManual = exercise.category === 'manual_therapy' || exercise.category === 'modality';
  const ol = exercise.optimalLoad;

  const handleClick = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && exercise.targetRegions.length > 0) {
      onTargetClick?.(exercise.targetRegions);
    }
  };

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 overflow-hidden hover:border-cyan-500/20 transition-colors">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-cyan-500/10">
          {isManual ? <Hand className="h-3.5 w-3.5 text-cyan-400" /> : <Dumbbell className="h-3.5 w-3.5 text-teal-400" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] font-semibold text-gray-200 truncate">{exercise.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {exercise.sets} &times; {exercise.reps}{exercise.holdSeconds ? ` (${exercise.holdSeconds}s hold)` : ''}
            </span>
            {exercise.mobilisationGrade && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {exercise.mobilisationGrade}
              </span>
            )}
            {exercise.targetStructure && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-300">
                {exercise.targetStructure}
              </span>
            )}
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
              {exercise.frequency}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {exercise.painCeiling}
            </span>
            {exercise.slingTarget && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                <Zap className="h-2 w-2" />
                {exercise.slingTarget}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Intensity</p>
              <p className="text-[9px] text-gray-300">{exercise.intensity}</p>
            </div>
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Evidence</p>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${GRADE_COLOR[exercise.evidenceGrade]}`}>
                Grade {exercise.evidenceGrade}
              </span>
            </div>
          </div>

          {exercise.swapNotice && (
            <div className="rounded p-2 bg-purple-500/5 border border-purple-500/20" data-testid={`swap-notice-${exercise.id}`}>
              <p className="text-[8px] text-purple-300 uppercase tracking-wider font-semibold mb-0.5">Engine swap</p>
              <p className="text-[9px] text-gray-300">Replaces <span className="text-purple-300">"{exercise.swapNotice.from}"</span></p>
              <p className="text-[9px] text-gray-500 mt-0.5">{exercise.swapNotice.reason}</p>
            </div>
          )}

          {ol && (
            <div className="rounded p-2 bg-cyan-500/5 border border-cyan-500/20 space-y-1.5" data-testid={`why-dose-${exercise.id}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-cyan-300" />
                  <p className="text-[8px] text-cyan-300 uppercase tracking-wider font-semibold">Why this dose</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_COLORS[ol.confidence]}`} data-testid={`confidence-band-${exercise.id}`}>
                    {CONFIDENCE_LABELS[ol.confidence]} · Tier {ol.evidenceTier}
                  </span>
                  {ol.isOverride && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30" data-testid={`override-pill-${exercise.id}`}>
                      Clinician override
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-gray-300 leading-relaxed">{ol.rationale}</p>
              {ol.factorContributions.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wider">Factor contributions</p>
                  {ol.factorContributions.map((fc, i) => (
                    <div key={i} className="text-[9px] text-gray-400">
                      <span className="text-cyan-300">{fc.factor}</span>: <span className="text-gray-300">{fc.effect}</span>
                      {fc.rationale && <span className="text-gray-500"> — {fc.rationale}</span>}
                    </div>
                  ))}
                </div>
              )}
              {onLoadingOverride && !editingOverride && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingOverride(true); }}
                    className="px-2 py-0.5 text-[9px] bg-cyan-900/30 text-cyan-200 border border-cyan-700/30 rounded hover:bg-cyan-900/60"
                    data-testid={`button-edit-override-${exercise.id}`}
                  >
                    Edit dose
                  </button>
                </div>
              )}
              {editingOverride && onLoadingOverride && (
                <LoadingDoseEditor
                  optimalLoad={ol}
                  onSave={(o) => { onLoadingOverride(o); setEditingOverride(false); }}
                  onClear={ol.isOverride && onLoadingClearOverride
                    ? () => { onLoadingClearOverride(ol.exerciseId, ol.weekIndex); setEditingOverride(false); }
                    : undefined}
                  onClose={() => setEditingOverride(false)}
                />
              )}
            </div>
          )}

          {ol && exercise.loadingProjection && exercise.loadingProjection.length > 0 && (
            <div className="rounded p-2 bg-slate-900/40 border border-slate-700/30" data-testid={`projection-${exercise.id}`}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowProjection(v => !v); }}
                className="w-full flex items-center justify-between text-[8px] text-slate-300 uppercase tracking-wider font-semibold"
              >
                <span>Projected weeks ({exercise.loadingProjection.length})</span>
                {showProjection ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showProjection && (
                <div className="mt-1 space-y-0.5">
                  {exercise.loadingProjection.map((p, i) => (
                    <div key={i} className="text-[9px] text-gray-400 flex items-center justify-between gap-2">
                      <span className="text-slate-200">Wk {p.weekIndex + 1}</span>
                      <span className="text-gray-300">{p.sets}×{p.reps}</span>
                      <span className="text-gray-400">{p.intensity.label}</span>
                      <span className="text-amber-300">NRS ≤ {p.painCeilingNrs}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {exercise.equipment.length > 0 && (
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Equipment</p>
              <p className="text-[9px] text-gray-300">{exercise.equipment.join(', ')}</p>
            </div>
          )}

          <div className="rounded p-2 bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
              <p className="text-[8px] text-emerald-400 uppercase tracking-wider font-semibold">Progression</p>
            </div>
            <p className="text-[9px] text-gray-300">{exercise.progression.criteria}</p>
            <p className="text-[9px] text-emerald-400/70 mt-0.5">
              Next: {exercise.progression.nextLevel}
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {exercise.progression.parameters} — review at {exercise.progression.timeframeDays} days
            </p>
          </div>

          <div className="rounded p-2 bg-amber-500/5 border border-amber-500/15">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="h-2.5 w-2.5 text-amber-400" />
              <p className="text-[8px] text-amber-400 uppercase tracking-wider font-semibold">Regression</p>
            </div>
            <p className="text-[9px] text-gray-300">{exercise.regression.trigger}</p>
            <p className="text-[9px] text-amber-400/70 mt-0.5">
              Fallback: {exercise.regression.fallback}
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              Duration: {exercise.regression.duration} — return when: {exercise.regression.returnCriteria}
            </p>
          </div>

          {exercise.targetRegions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {exercise.targetRegions.map(r => (
                <button
                  key={r}
                  onClick={(e) => { e.stopPropagation(); onTargetClick?.([r]); }}
                  className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <p className="text-[9px] text-gray-500 italic">{exercise.rationale}</p>
        </div>
      )}
    </div>
  );
}

function PhaseCard({
  phase,
  idx,
  onTargetClick,
  onLoadingOverride,
  onLoadingClearOverride,
}: {
  phase: PlanPhase;
  idx: number;
  onTargetClick?: (regions: string[]) => void;
  onLoadingOverride?: (override: LoadingOverridePayload) => void;
  onLoadingClearOverride?: (exerciseId: string, weekIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(idx === 0);
  const colorSet = PHASE_COLORS[idx % PHASE_COLORS.length];
  const accent = PHASE_ACCENT[idx % PHASE_ACCENT.length];

  return (
    <div className={`rounded-lg border bg-gradient-to-br ${colorSet} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center h-6 w-6 rounded-full bg-white/10 text-[10px] font-bold text-white`}>
            {phase.order}
          </div>
          <div className="text-left">
            <p className={`text-[10px] font-semibold ${accent}`}>{phase.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />{phase.durationWeeks} weeks
              </span>
              <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                <Activity className="h-2.5 w-2.5" />{phase.frequency}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-3">
          {phase.goals.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target className="h-2.5 w-2.5" />Goals
              </p>
              <div className="space-y-0.5">
                {phase.goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <CheckCircle2 className={`h-2.5 w-2.5 ${accent} mt-0.5 flex-shrink-0`} />
                    <span className="text-[10px] text-gray-300">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase.manualTherapy.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Hand className="h-2.5 w-2.5" />Manual Therapy ({phase.manualTherapy.length})
              </p>
              <div className="space-y-1.5">
                {phase.manualTherapy.map(ex => (
                  <ExerciseCard key={ex.id} exercise={ex} onTargetClick={onTargetClick} onLoadingOverride={onLoadingOverride} onLoadingClearOverride={onLoadingClearOverride} />
                ))}
              </div>
            </div>
          )}

          {phase.exercises.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Dumbbell className="h-2.5 w-2.5" />Exercises ({phase.exercises.length})
              </p>
              <div className="space-y-1.5">
                {phase.exercises.map(ex => (
                  <ExerciseCard key={ex.id} exercise={ex} onTargetClick={onTargetClick} onLoadingOverride={onLoadingOverride} onLoadingClearOverride={onLoadingClearOverride} />
                ))}
              </div>
            </div>
          )}

          {phase.education.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <BookOpen className="h-2.5 w-2.5" />Patient Education
              </p>
              <div className="space-y-0.5">
                {phase.education.map((e, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] text-gray-300">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
            <Clock className="h-2.5 w-2.5 text-gray-500" />
            <span className="text-[9px] text-gray-500">Review at: {phase.reviewPoint}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanTab({
  data,
  isLoading,
  onTargetRegionClick,
  onLoadingRecalculate,
  onLoadingOverride,
  onLoadingClearOverride,
}: PlanTabProps) {
  const [constraintsExpanded, setConstraintsExpanded] = useState(false);
  const [diffDismissed, setDiffDismissed] = useState<string | null>(null);
  const [projectionExpanded, setProjectionExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs text-gray-400">Generating treatment plan...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <div className="p-3 rounded-full bg-cyan-500/10 mb-3">
          <Zap className="h-6 w-6 text-cyan-500/50" />
        </div>
        <p className="text-xs text-gray-400 mb-1">Treatment Plan Generator</p>
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Run the Decision engine first — the plan builds on those intervention targets
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {data.loadingEngine && !data.loadingEngine.applicable && data.loadingEngine.reason && (
        <div
          className="flex items-start gap-1.5 text-[10px] bg-slate-900/40 border border-slate-700/40 rounded px-2 py-1.5 text-slate-200"
          data-testid="banner-plan-loading-engine-not-applicable"
        >
          <Shield className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
          <span>{data.loadingEngine.reason}</span>
        </div>
      )}
      {data.loadingEngine?.applicable && (
        <div
          className="flex items-center justify-between gap-2 text-[10px] bg-emerald-950/30 border border-emerald-700/30 rounded px-2 py-1 text-emerald-200"
          data-testid="banner-plan-loading-engine-active"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-emerald-300" />
            <span>
              Optimal Loading Engine active{data.loadingEngine.site ? ` · ${data.loadingEngine.site.replace(/_/g, ' ')} tendinopathy` : ''}{data.loadingPlan?.recoveryPhaseLabel ? ` · ${data.loadingPlan.recoveryPhaseLabel}` : ''}{data.loadingPlan?.irritability ? ` · ${data.loadingPlan.irritability} irritability` : ''}
            </span>
          </div>
          {onLoadingRecalculate && (
            <button
              onClick={onLoadingRecalculate}
              className="px-2 py-0.5 text-[9px] bg-emerald-900/40 text-emerald-100 border border-emerald-700/40 rounded hover:bg-emerald-900/70"
              data-testid="button-plan-loading-recalculate"
            >
              Recalculate now
            </button>
          )}
        </div>
      )}

      {data.loadingDiff && data.loadingDiff.changes.length > 0 && data.loadingDiff.afterHash !== diffDismissed && (
        <div className="rounded p-2 bg-amber-950/30 border border-amber-700/40" data-testid="banner-plan-loading-diff">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-300" />
              <span className="text-[10px] font-semibold text-amber-200">
                Loading plan recomputed — {data.loadingDiff.changes.length} change{data.loadingDiff.changes.length === 1 ? '' : 's'}
              </span>
              <span className="text-[9px] text-amber-300/70">({data.loadingDiff.triggerReason})</span>
            </div>
            <button
              onClick={() => setDiffDismissed(data.loadingDiff!.afterHash)}
              className="text-[9px] text-amber-300/70 hover:text-amber-100"
              data-testid="button-plan-loading-diff-dismiss"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {data.loadingDiff.changes.map((c, i) => (
              <div key={i} className="text-[9px] text-amber-100/90">
                <span className="text-amber-300">{c.exerciseName}</span>
                <span className="text-amber-300/70"> · wk {c.weekIndex + 1} · {c.field}</span>
                : <span className="line-through text-amber-300/50">{c.before}</span> → <span className="text-amber-50">{c.after}</span>
                <span className="text-amber-300/60"> — {c.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.loadingPlan && data.loadingPlan.applicability === 'tendinopathy' && (
        <div className="rounded-lg border border-cyan-700/30 bg-cyan-950/20 p-2.5" data-testid="panel-plan-loading">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-[10px] font-semibold text-cyan-200 uppercase tracking-wider">Optimal Loading Engine</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
              Commit {data.loadingPlan.commitWindowWeeks} wk · Horizon {data.loadingPlan.horizonWeeks} wk
            </span>
          </div>
          <p className="text-[9px] text-gray-300 leading-relaxed mb-1.5">{data.loadingPlan.planRationale}</p>
          {data.loadingPlan.committed.length > 0 && (
            <div className="space-y-1">
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Committed window (weeks 1–{data.loadingPlan.commitWindowWeeks})</p>
              {data.loadingPlan.committed.map(p => (
                <div key={p.id} className="rounded bg-cyan-900/20 border border-cyan-700/20 px-2 py-1 flex items-center justify-between gap-2 flex-wrap" data-testid={`committed-line-${p.exerciseId}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-cyan-100 truncate">{p.exerciseName}</p>
                    <p className="text-[8px] text-gray-400">Wk {p.weekIndex + 1} · {p.sets}×{p.reps} · {p.intensity.label} · {p.daysPerWeek}×/wk · NRS ≤ {p.painCeilingNrs}</p>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_COLORS[p.confidence]}`}>
                    {CONFIDENCE_LABELS[p.confidence]}
                  </span>
                  {p.isOverride && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">override</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {data.loadingPlan.projected.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setProjectionExpanded(v => !v)}
                className="w-full flex items-center justify-between text-[8px] text-gray-400 uppercase tracking-wider font-semibold py-1"
                data-testid="button-plan-loading-projection-toggle"
              >
                <span>Projected weeks ({data.loadingPlan.projected.length})</span>
                {projectionExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {projectionExpanded && (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {data.loadingPlan.projected.map(p => (
                    <div key={p.id} className="text-[9px] text-gray-300 flex items-center justify-between gap-2 px-2 py-0.5 bg-slate-900/30 rounded">
                      <span className="text-slate-200 w-10 shrink-0">Wk {p.weekIndex + 1}</span>
                      <span className="flex-1 truncate text-gray-300">{p.exerciseName}</span>
                      <span className="text-gray-400 text-[8px]">{p.sets}×{p.reps} · {p.intensity.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {data.loadingPlan.recomputeTriggers.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-cyan-800/30">
              <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Auto-recompute when</p>
              <p className="text-[9px] text-gray-400">{data.loadingPlan.recomputeTriggers.join(' · ')}</p>
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Plan Summary</span>
        </div>
        <p className="text-[9px] text-gray-300 leading-relaxed">{data.planSummary}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.stageBasis} stage
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.irritabilityBasis} irritability
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {data.totalDurationWeeks} weeks total
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.phases.length} phases
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        {data.phases.map((phase, idx) => (
          <div key={phase.id} className="flex items-center gap-1">
            {idx > 0 && <div className="w-3 h-px bg-gray-700" />}
            <div className={`text-[8px] px-2 py-0.5 rounded-full border ${PHASE_COLORS[idx % PHASE_COLORS.length].split(' ').slice(2).join(' ')} ${PHASE_ACCENT[idx % PHASE_ACCENT.length]}`}>
              {phase.name.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>

      {data.phases.map((phase, idx) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          idx={idx}
          onTargetClick={onTargetRegionClick}
          onLoadingOverride={onLoadingOverride}
          onLoadingClearOverride={onLoadingClearOverride}
        />
      ))}

      {data.constraints.length > 0 && (
        <div className="rounded-lg border border-red-500/20 overflow-hidden">
          <button
            onClick={() => setConstraintsExpanded(!constraintsExpanded)}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                Constraints & Precautions
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                {data.constraints.length}
              </span>
            </div>
            {constraintsExpanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
          </button>
          {constraintsExpanded && (
            <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-white/5 pt-2">
              {data.constraints.map(c => (
                <div key={c.id} className={`rounded p-2 border ${c.severity === 'absolute' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                  <div className="flex items-start gap-1.5">
                    {c.severity === 'absolute' ? (
                      <XOctagon className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-[10px] font-medium ${c.severity === 'absolute' ? 'text-red-400' : 'text-amber-400'}`}>
                        {c.description}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{c.reason}</p>
                      <p className="text-[8px] text-gray-600 mt-0.5">Source: {c.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
