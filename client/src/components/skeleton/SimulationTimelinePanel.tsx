import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Clock,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Zap,
  Shield,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Milestone,
} from "lucide-react";
import {
  buildSimulationTimeline,
  type SimulationTimelineResult,
  type WeekSnapshot,
  type SimulationMilestone,
} from "@/lib/simulationTimelineEngine";
import type { TreatmentPlanResult } from "./PlanTab";
import type { MuscleOverride } from "@/lib/muscleBiomechanicsEngine";

interface SimulationTimelinePanelProps {
  treatmentPlan: TreatmentPlanResult | null;
  baseModelConfig: Record<string, any>;
  baseOverrides: Record<string, Partial<MuscleOverride>>;
  painMarkers: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    label: string;
    type: 'point' | 'area' | 'referred' | 'line' | 'paint';
    severity?: number;
    description?: string;
  }>;
  bodyWeightKg: number;
  biomechanicsOutput?: any | null;
  onApplyWeekToSkeleton?: (modelConfig: Record<string, any>, overrides: Record<string, Partial<MuscleOverride>>) => void;
}

const PHASE_COLORS = [
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-300', fill: '#06b6d4' },
  { bg: 'bg-teal-500/20', border: 'border-teal-500/40', text: 'text-teal-300', fill: '#14b8a6' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', fill: '#10b981' },
  { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-300', fill: '#8b5cf6' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300', fill: '#f59e0b' },
];

const MILESTONE_ICONS: Record<string, typeof CheckCircle2> = {
  phase_transition: ArrowRight,
  risk_reduction: Shield,
  pain_milestone: Target,
  sling_improvement: Activity,
};

const MILESTONE_COLORS: Record<string, string> = {
  phase_transition: 'text-cyan-400',
  risk_reduction: 'text-emerald-400',
  pain_milestone: 'text-amber-400',
  sling_improvement: 'text-violet-400',
};

function MiniRecoveryCurve({
  snapshots,
  selectedWeek,
  totalWeeks,
  phases,
  milestones,
  onWeekClick,
}: {
  snapshots: WeekSnapshot[];
  selectedWeek: number;
  totalWeeks: number;
  phases: SimulationTimelineResult['phases'];
  milestones: SimulationMilestone[];
  onWeekClick: (week: number) => void;
}) {
  const width = 280;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 18, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxRisk = Math.max(100, ...snapshots.map(s => s.riskScore));

  const riskPoints = snapshots.map(s => ({
    x: padding.left + (s.week / totalWeeks) * chartW,
    y: padding.top + (1 - s.riskScore / maxRisk) * chartH,
    week: s.week,
  }));

  const painPoints = snapshots.map(s => ({
    x: padding.left + (s.week / totalWeeks) * chartW,
    y: padding.top + (1 - s.painPrediction / maxRisk) * chartH,
  }));

  const slingPoints = snapshots.map(s => ({
    x: padding.left + (s.week / totalWeeks) * chartW,
    y: padding.top + (1 - s.slingIntegrity / maxRisk) * chartH,
  }));

  const makePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  };

  const makeAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const base = padding.top + chartH;
    return `${makePath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  };

  const selectedX = padding.left + (selectedWeek / totalWeeks) * chartW;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const weekFrac = (relX - padding.left) / chartW;
    const weekNum = Math.round(weekFrac * totalWeeks);
    if (weekNum >= 0 && weekNum <= totalWeeks) {
      onWeekClick(weekNum);
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full cursor-pointer"
      onClick={handleClick}
    >
      {phases.map((phase, i) => {
        const x1 = padding.left + (phase.startWeek / totalWeeks) * chartW;
        const x2 = padding.left + (phase.endWeek / totalWeeks) * chartW;
        const color = PHASE_COLORS[i % PHASE_COLORS.length];
        return (
          <rect
            key={phase.id}
            x={x1}
            y={padding.top}
            width={x2 - x1}
            height={chartH}
            fill={color.fill}
            opacity={0.08}
          />
        );
      })}

      {[0, 25, 50, 75, 100].map(v => {
        const y = padding.top + (1 - v / maxRisk) * chartH;
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />
            <text x={padding.left - 3} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={7}>{v}</text>
          </g>
        );
      })}

      <path d={makeAreaPath(riskPoints)} fill="url(#riskGrad)" opacity={0.3} />
      <path d={makePath(riskPoints)} fill="none" stroke="#ef4444" strokeWidth={1.5} />
      <path d={makePath(painPoints)} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <path d={makePath(slingPoints)} fill="none" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="2,2" />

      {milestones.map((m, i) => {
        const mx = padding.left + (m.week / totalWeeks) * chartW;
        return (
          <line key={i} x1={mx} y1={padding.top} x2={mx} y2={padding.top + chartH} stroke={m.type === 'phase_transition' ? '#06b6d4' : '#10b981'} strokeWidth={0.8} strokeDasharray="3,2" />
        );
      })}

      <line x1={selectedX} y1={padding.top} x2={selectedX} y2={padding.top + chartH} stroke="#22d3ee" strokeWidth={1.5} />
      {riskPoints.find(p => p.week === selectedWeek) && (
        <circle
          cx={riskPoints.find(p => p.week === selectedWeek)!.x}
          cy={riskPoints.find(p => p.week === selectedWeek)!.y}
          r={3}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={1}
        />
      )}

      {snapshots.length > 0 && (
        <>
          <text x={padding.left} y={height - 2} fill="#6b7280" fontSize={7}>Wk 0</text>
          <text x={padding.left + chartW} y={height - 2} textAnchor="end" fill="#6b7280" fontSize={7}>Wk {totalWeeks}</text>
        </>
      )}

      <defs>
        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PhaseTimeline({
  phases,
  selectedWeek,
  totalWeeks,
  milestones,
}: {
  phases: SimulationTimelineResult['phases'];
  selectedWeek: number;
  totalWeeks: number;
  milestones: SimulationMilestone[];
}) {
  return (
    <div className="relative w-full h-8">
      <div className="absolute inset-0 flex rounded overflow-hidden">
        {phases.map((phase, i) => {
          const widthPct = ((phase.endWeek - phase.startWeek) / totalWeeks) * 100;
          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          const isActive = selectedWeek >= phase.startWeek && selectedWeek < phase.endWeek;
          return (
            <div
              key={phase.id}
              className={`relative flex items-center justify-center ${color.bg} border-r ${color.border} ${isActive ? 'ring-1 ring-white/20' : ''}`}
              style={{ width: `${widthPct}%` }}
            >
              <span className={`text-[8px] font-medium ${color.text} truncate px-1`}>
                {phase.name.length > 12 ? phase.name.slice(0, 10) + '..' : phase.name}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
        style={{ left: `${(selectedWeek / totalWeeks) * 100}%` }}
      />
      {milestones.filter(m => m.type === 'phase_transition').map((m, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px bg-white/30 z-5"
          style={{ left: `${(m.week / totalWeeks) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function SimulationTimelinePanel({
  treatmentPlan,
  baseModelConfig,
  baseOverrides,
  painMarkers,
  bodyWeightKg,
  biomechanicsOutput,
  onApplyWeekToSkeleton,
}: SimulationTimelinePanelProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'curve' | 'phases' | 'summary' | null>('curve');
  const [appliedWeek, setAppliedWeek] = useState<number | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, []);

  const timeline = useMemo(() => {
    if (!treatmentPlan || treatmentPlan.phases.length === 0) return null;
    try {
      return buildSimulationTimeline(
        treatmentPlan,
        baseModelConfig,
        baseOverrides,
        painMarkers,
        bodyWeightKg,
        biomechanicsOutput,
      );
    } catch (e) {
      console.warn('[SimTimeline] Build failed:', e);
      return null;
    }
  }, [treatmentPlan, baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, biomechanicsOutput]);

  const currentSnapshot = useMemo(() => {
    if (!timeline) return null;
    return timeline.weekSnapshots.find(s => s.week === selectedWeek) ?? timeline.weekSnapshots[0] ?? null;
  }, [timeline, selectedWeek]);

  const handleWeekChange = useCallback((value: number[]) => {
    setSelectedWeek(value[0]);
  }, []);

  const handleApply = useCallback(() => {
    if (!currentSnapshot || !onApplyWeekToSkeleton) return;
    onApplyWeekToSkeleton(currentSnapshot.modelConfig, currentSnapshot.overrides);
    setAppliedWeek(selectedWeek);
  }, [currentSnapshot, onApplyWeekToSkeleton, selectedWeek]);

  const handlePlay = useCallback(() => {
    if (!timeline) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    setIsPlaying(true);
    let week = selectedWeek;
    const interval = setInterval(() => {
      week++;
      if (week > timeline.totalDurationWeeks) {
        clearInterval(interval);
        playIntervalRef.current = null;
        setIsPlaying(false);
        return;
      }
      setSelectedWeek(week);
    }, 500);
    playIntervalRef.current = interval;
  }, [timeline, isPlaying, selectedWeek]);

  if (!treatmentPlan || treatmentPlan.phases.length === 0) {
    return (
      <div className="p-3 text-center">
        <div className="text-gray-500 text-[10px] mb-2">No treatment plan available</div>
        <div className="text-gray-600 text-[9px]">
          Generate a treatment plan from the Treatment tab first, then return here to simulate the recovery timeline.
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="p-3 text-center">
        <div className="text-gray-500 text-[10px]">Computing simulation timeline...</div>
      </div>
    );
  }

  const riskDelta = timeline.startingState.riskScore - (currentSnapshot?.riskScore ?? timeline.startingState.riskScore);
  const slingDelta = (currentSnapshot?.slingIntegrity ?? timeline.startingState.slingIntegrity) - timeline.startingState.slingIntegrity;

  const toggleSection = (section: 'curve' | 'phases' | 'summary') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="flex flex-col gap-2 text-[10px] max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-cyan-300">Recovery Timeline</span>
        </div>
        <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-400 px-1.5 py-0">
          {timeline.totalDurationWeeks} weeks
        </Badge>
      </div>

      <div className="bg-gray-800/50 rounded border border-gray-700/50 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-[9px]">Week {selectedWeek} of {timeline.totalDurationWeeks}</span>
          {currentSnapshot && (
            <span className={`text-[9px] font-medium ${PHASE_COLORS[(timeline.phases.findIndex(p => p.id === currentSnapshot.phaseId)) % PHASE_COLORS.length]?.text || 'text-gray-300'}`}>
              {currentSnapshot.phaseName}
            </span>
          )}
        </div>

        <PhaseTimeline
          phases={timeline.phases}
          selectedWeek={selectedWeek}
          totalWeeks={timeline.totalDurationWeeks}
          milestones={timeline.milestones}
        />

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
            disabled={selectedWeek === 0}
          >
            <SkipBack className="h-3 w-3" />
          </button>
          <button
            onClick={handlePlay}
            className="p-0.5 rounded hover:bg-gray-700/50 text-cyan-400 hover:text-cyan-300"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <div className="flex-1">
            <Slider
              value={[selectedWeek]}
              onValueChange={handleWeekChange}
              min={0}
              max={timeline.totalDurationWeeks}
              step={1}
              className="w-full"
            />
          </div>
          <button
            onClick={() => setSelectedWeek(Math.min(timeline.totalDurationWeeks, selectedWeek + 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
            disabled={selectedWeek >= timeline.totalDurationWeeks}
          >
            <SkipForward className="h-3 w-3" />
          </button>
        </div>
      </div>

      {currentSnapshot && (
        <div className="grid grid-cols-3 gap-1.5">
          <MetricCard
            label="Risk"
            value={currentSnapshot.riskScore}
            unit=""
            delta={-riskDelta}
            color={currentSnapshot.riskScore > 60 ? 'red' : currentSnapshot.riskScore > 30 ? 'amber' : 'emerald'}
            icon={<Shield className="h-3 w-3" />}
          />
          <MetricCard
            label="Pain"
            value={currentSnapshot.painPrediction}
            unit=""
            delta={-(timeline.startingState.painBaseline - currentSnapshot.painPrediction)}
            color={currentSnapshot.painPrediction > 50 ? 'red' : currentSnapshot.painPrediction > 25 ? 'amber' : 'emerald'}
            icon={<Target className="h-3 w-3" />}
          />
          <MetricCard
            label="Sling"
            value={currentSnapshot.slingIntegrity}
            unit="%"
            delta={slingDelta}
            color={currentSnapshot.slingIntegrity > 70 ? 'emerald' : currentSnapshot.slingIntegrity > 40 ? 'amber' : 'red'}
            invertDelta
            icon={<Activity className="h-3 w-3" />}
          />
        </div>
      )}

      {currentSnapshot && (
        <div className="flex gap-1.5">
          <div className="flex-1 bg-gray-800/40 rounded border border-gray-700/40 p-1.5">
            <div className="text-gray-500 text-[8px] mb-0.5">Force ↓</div>
            <div className="text-emerald-400 text-[10px] font-medium">{currentSnapshot.forceReduction.toFixed(1)}%</div>
          </div>
          <div className="flex-1 bg-gray-800/40 rounded border border-gray-700/40 p-1.5">
            <div className="text-gray-500 text-[8px] mb-0.5">Comp. Resolved</div>
            <div className="text-violet-400 text-[10px] font-medium">{currentSnapshot.compensationResolution.toFixed(0)}%</div>
          </div>
          <div className="flex-1 bg-gray-800/40 rounded border border-gray-700/40 p-1.5">
            <div className="text-gray-500 text-[8px] mb-0.5">Dose Response</div>
            <div className="text-cyan-400 text-[10px] font-medium">{(currentSnapshot.doseResponseFraction * 100).toFixed(0)}%</div>
          </div>
        </div>
      )}

      <Button
        onClick={handleApply}
        disabled={!currentSnapshot || !onApplyWeekToSkeleton}
        size="sm"
        className="w-full h-7 text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30"
        variant="outline"
      >
        <Zap className="h-3 w-3 mr-1" />
        {appliedWeek === selectedWeek ? `Applied Week ${selectedWeek}` : `Apply Week ${selectedWeek} to Skeleton`}
      </Button>

      <div className="border border-gray-700/40 rounded overflow-hidden">
        <button
          onClick={() => toggleSection('curve')}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
        >
          <span className="text-[9px] font-medium flex items-center gap-1">
            <Activity className="h-3 w-3 text-red-400" />
            Recovery Curve
          </span>
          {expandedSection === 'curve' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expandedSection === 'curve' && (
          <div className="p-2 bg-gray-900/30">
            <MiniRecoveryCurve
              snapshots={timeline.weekSnapshots}
              selectedWeek={selectedWeek}
              totalWeeks={timeline.totalDurationWeeks}
              phases={timeline.phases}
              milestones={timeline.milestones}
              onWeekClick={(w) => setSelectedWeek(w)}
            />
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] bg-red-500" />
                <span className="text-[7px] text-gray-500">Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] bg-amber-500 border-dashed" style={{ borderTop: '1px dashed #f59e0b', height: 0 }} />
                <span className="text-[7px] text-gray-500">Pain</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] bg-violet-500 border-dashed" style={{ borderTop: '1px dashed #8b5cf6', height: 0 }} />
                <span className="text-[7px] text-gray-500">Sling</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {timeline.milestones.length > 0 && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('phases')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Milestone className="h-3 w-3 text-cyan-400" />
              Milestones ({timeline.milestones.length})
            </span>
            {expandedSection === 'phases' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'phases' && (
            <div className="p-2 bg-gray-900/30 space-y-1">
              {timeline.milestones.map((m, i) => {
                const MIcon = MILESTONE_ICONS[m.type] || CheckCircle2;
                const mColor = MILESTONE_COLORS[m.type] || 'text-gray-400';
                const isPast = m.week <= selectedWeek;
                return (
                  <div
                    key={i}
                    className={`px-1.5 py-1 rounded cursor-pointer hover:bg-gray-800/40 ${isPast ? 'opacity-100' : 'opacity-50'}`}
                    onClick={() => setSelectedWeek(m.week)}
                  >
                    <div className="flex items-center gap-1.5 text-[9px]">
                      <MIcon className={`h-3 w-3 ${mColor} flex-shrink-0`} />
                      <span className="text-gray-400">Wk {m.week}</span>
                      <span className={`flex-1 truncate ${isPast ? 'text-gray-200' : 'text-gray-500'}`}>{m.label}</span>
                      {isPast && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />}
                    </div>
                    {m.criteria && (
                      <div className="ml-[18px] mt-0.5 text-[8px] text-gray-500 italic truncate">
                        Criteria: {m.criteria}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="border border-gray-700/40 rounded overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
        >
          <span className="text-[9px] font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3 text-amber-400" />
            Before / After Summary
          </span>
          {expandedSection === 'summary' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expandedSection === 'summary' && (
          <div className="p-2 bg-gray-900/30">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[8px] text-gray-500 font-medium uppercase tracking-wider">Before (Wk 0)</div>
                <SummaryRow label="Risk Score" value={timeline.startingState.riskScore} color="red" />
                <SummaryRow label="Risk Level" value={timeline.startingState.riskLevel} color="red" />
                <SummaryRow label="Sling Integrity" value={`${timeline.startingState.slingIntegrity}%`} color="amber" />
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-gray-500 font-medium uppercase tracking-wider">After (Wk {timeline.totalDurationWeeks})</div>
                <SummaryRow label="Risk Score" value={timeline.endState.riskScore} color="emerald" />
                <SummaryRow label="Risk Level" value={timeline.endState.riskLevel} color="emerald" />
                <SummaryRow label="Sling Integrity" value={`${timeline.endState.slingIntegrity}%`} color="emerald" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/30">
              <div className="flex items-center gap-1 text-[9px]">
                <TrendingDown className="h-3 w-3 text-emerald-400" />
                <span className="text-gray-400">Est. recovery to low risk:</span>
                <span className="text-emerald-300 font-medium">{timeline.endState.estimatedRecoveryWeeks} weeks</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {currentSnapshot && currentSnapshot.activeScenarios.length > 0 && (
        <div className="bg-gray-800/30 rounded border border-gray-700/30 p-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Active Interventions (Wk {selectedWeek})</div>
          <div className="flex flex-wrap gap-1">
            {currentSnapshot.activeScenarios.slice(0, 8).map(sc => (
              <Badge
                key={sc.id}
                variant="outline"
                className="text-[7px] py-0 px-1 border-gray-600/40"
                style={{ color: sc.color, borderColor: sc.color + '40' }}
              >
                {sc.label}
              </Badge>
            ))}
            {currentSnapshot.activeScenarios.length > 8 && (
              <Badge variant="outline" className="text-[7px] py-0 px-1 border-gray-600/40 text-gray-500">
                +{currentSnapshot.activeScenarios.length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  color,
  invertDelta,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number;
  color: 'red' | 'amber' | 'emerald';
  invertDelta?: boolean;
  icon: React.ReactNode;
}) {
  const colorMap = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  };
  const borderMap = {
    red: 'border-red-500/20',
    amber: 'border-amber-500/20',
    emerald: 'border-emerald-500/20',
  };

  const isGood = invertDelta ? delta > 0 : delta < 0;
  const absDelta = Math.abs(delta);

  return (
    <div className={`bg-gray-800/40 rounded border ${borderMap[color]} p-1.5`}>
      <div className="flex items-center gap-1 mb-0.5">
        <span className={colorMap[color]}>{icon}</span>
        <span className="text-gray-500 text-[8px]">{label}</span>
      </div>
      <div className={`text-[12px] font-bold ${colorMap[color]}`}>
        {Math.round(value)}{unit}
      </div>
      {absDelta > 0.5 && (
        <div className={`flex items-center gap-0.5 text-[8px] ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
          {isGood ? <TrendingDown className="h-2 w-2" /> : <TrendingUp className="h-2 w-2" />}
          {absDelta.toFixed(0)} pts
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClass = color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className="flex items-center justify-between text-[9px]">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}
