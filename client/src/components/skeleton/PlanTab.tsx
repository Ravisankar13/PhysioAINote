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

interface PlanTabProps {
  data: TreatmentPlanResult | null;
  isLoading: boolean;
  onTargetRegionClick?: (regions: string[]) => void;
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

function ExerciseCard({ exercise, onTargetClick }: { exercise: PlanExercise; onTargetClick?: (regions: string[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isManual = exercise.category === 'manual_therapy' || exercise.category === 'modality';

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
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
              {exercise.frequency}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {exercise.painCeiling}
            </span>
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

function PhaseCard({ phase, idx, onTargetClick }: { phase: PlanPhase; idx: number; onTargetClick?: (regions: string[]) => void }) {
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
                  <ExerciseCard key={ex.id} exercise={ex} onTargetClick={onTargetClick} />
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
                  <ExerciseCard key={ex.id} exercise={ex} onTargetClick={onTargetClick} />
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

export default function PlanTab({ data, isLoading, onTargetRegionClick }: PlanTabProps) {
  const [constraintsExpanded, setConstraintsExpanded] = useState(false);

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
        <PhaseCard key={phase.id} phase={phase} idx={idx} onTargetClick={onTargetRegionClick} />
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
