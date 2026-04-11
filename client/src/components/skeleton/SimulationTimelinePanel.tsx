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
  Dumbbell,
  Hand,
  Lightbulb,
  User,
  Heart,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Gauge,
  Brain,
  Bone,
  Flame,
  Trophy,
  Layers,
} from "lucide-react";
import {
  buildSimulationTimeline,
  buildSessionTimeline,
  type SimulationTimelineResult,
  type WeekSnapshot,
  type SimulationMilestone,
  type SessionTimelineResult,
  type SessionSnapshot,
  type SessionModification,
  type SessionTreatment,
  type RomPrediction,
  type PainMarkerPrediction,
  type MuscleStatePrediction,
  type SlingPrediction,
  type PosturalPrediction,
  type CompensationPrediction,
  type FunctionalMilestone,
  type InterSessionHealing,
} from "@/lib/simulationTimelineEngine";
import {
  type PatientFactors,
  type PatientModifierProfile,
  type ConditionRecoveryProfile,
  DEFAULT_PATIENT_FACTORS,
  computePatientModifiers,
  autoPopulateFromPipeline,
  autoDetectCondition,
  findConditionProfile,
  adjustProfileForPatient,
  CONDITION_RECOVERY_PROFILES,
} from "@/lib/patientFactorsEngine";
import type { ClinicalExtractionResult } from "@shared/clinicalIntakeTypes";
import type { StructuredReasoningResult } from "./StructuredReasoningTab";
import type { TreatmentPlanResult } from "./PlanTab";
import type { MuscleOverride } from "@/lib/muscleBiomechanicsEngine";
import type { CustomExercise } from "./ExerciseEngineTab";
import type { CustomTechnique } from "./ManualTherapyEngineTab";

interface SimulationTimelinePanelProps {
  treatmentPlan: TreatmentPlanResult | null;
  baseModelConfig: Record<string, Record<string, number>>;
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
  biomechanicsOutput?: unknown | null;
  onApplyWeekToSkeleton?: (modelConfig: Record<string, Record<string, number>>, overrides: Record<string, Partial<MuscleOverride>>) => void;
  customExercises?: CustomExercise[] | null;
  customTechniques?: CustomTechnique[] | null;
  extractionResult?: ClinicalExtractionResult | null;
  structuredReasoning?: StructuredReasoningResult | null;
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

type SessionCurveTrack = 'risk' | 'pain' | 'sling' | 'rom' | 'comp' | 'muscle';

const SESSION_TRACK_CONFIG: Record<SessionCurveTrack, { label: string; color: string; dash?: string }> = {
  risk: { label: 'Risk', color: '#ef4444' },
  pain: { label: 'Pain', color: '#f59e0b', dash: '3,2' },
  sling: { label: 'Sling', color: '#8b5cf6', dash: '2,2' },
  rom: { label: 'ROM', color: '#06b6d4', dash: '4,1' },
  muscle: { label: 'Muscle', color: '#10b981', dash: '3,3' },
  comp: { label: 'Comp', color: '#f472b6', dash: '2,3' },
};

const ROM_JOINT_COLORS = ['#06b6d4', '#0ea5e9', '#38bdf8', '#7dd3fc', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'];

function SessionRecoveryCurve({
  sessions,
  selectedSession,
  totalSessions,
  milestones,
  modifications,
  onSessionClick,
}: {
  sessions: SessionSnapshot[];
  selectedSession: number;
  totalSessions: number;
  milestones: SimulationMilestone[];
  modifications: SessionModification[];
  onSessionClick: (session: number) => void;
}) {
  const [enabledTracks, setEnabledTracks] = useState<Set<SessionCurveTrack>>(() => new Set<SessionCurveTrack>(['risk', 'pain', 'sling']));

  const toggleTrack = useCallback((track: SessionCurveTrack) => {
    setEnabledTracks(prev => {
      const next = new Set(prev);
      if (next.has(track)) {
        if (next.size > 1) next.delete(track);
      } else {
        next.add(track);
      }
      return next;
    });
  }, []);

  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 22, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxDay = sessions.length > 0 ? sessions[sessions.length - 1].dayOffset : 1;

  const getX = useCallback((s: SessionSnapshot) => {
    return padding.left + (maxDay > 0 ? (s.dayOffset / maxDay) : (s.sessionNumber / totalSessions)) * chartW;
  }, [maxDay, totalSessions, chartW]);

  const avgRom = useCallback((s: SessionSnapshot) => {
    if (s.romPredictions.length === 0) return 50;
    return s.romPredictions.reduce((sum, r) => sum + r.predictedDegrees / r.targetDegrees * 100, 0) / s.romPredictions.length;
  }, []);

  const avgMuscleTension = useCallback((s: SessionSnapshot) => {
    if (s.muscleStatePredictions.length === 0) return 50;
    return s.muscleStatePredictions.reduce((sum, m) => sum + m.predictedTension, 0) / s.muscleStatePredictions.length;
  }, []);

  const allJointIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sessions) {
      for (const r of s.romPredictions) ids.add(r.jointId);
    }
    return Array.from(ids).slice(0, 8);
  }, [sessions]);

  const [showPerJointRom, setShowPerJointRom] = useState(false);

  const trackData = useMemo(() => {
    const data: Record<SessionCurveTrack, { x: number; y: number; session: number }[]> = {
      risk: [], pain: [], sling: [], rom: [], muscle: [], comp: [],
    };
    for (const s of sessions) {
      const x = getX(s);
      data.risk.push({ x, y: s.riskScore, session: s.sessionNumber });
      data.pain.push({ x, y: s.painPrediction, session: s.sessionNumber });
      data.sling.push({ x, y: s.slingIntegrity, session: s.sessionNumber });
      data.rom.push({ x, y: avgRom(s), session: s.sessionNumber });
      data.muscle.push({ x, y: avgMuscleTension(s), session: s.sessionNumber });
      data.comp.push({ x, y: 100 - s.compensationResolution, session: s.sessionNumber });
    }
    return data;
  }, [sessions, getX, avgRom, avgMuscleTension]);

  const perJointRomData = useMemo(() => {
    if (!showPerJointRom || !enabledTracks.has('rom')) return [];
    return allJointIds.map((jointId, idx) => {
      const pts = sessions.map(s => {
        const rom = s.romPredictions.find(r => r.jointId === jointId);
        const pct = rom ? (rom.predictedDegrees / rom.targetDegrees) * 100 : 50;
        return { x: getX(s), y: pct, session: s.sessionNumber };
      });
      return { jointId, color: ROM_JOINT_COLORS[idx % ROM_JOINT_COLORS.length], pts };
    });
  }, [showPerJointRom, enabledTracks, allJointIds, sessions, getX]);

  const toSvgPoints = useCallback((pts: { x: number; y: number; session: number }[]) => {
    return pts.map(p => ({
      x: p.x,
      y: padding.top + (1 - p.y / 100) * chartH,
      session: p.session,
    }));
  }, [chartH]);

  const makePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  };

  const makeAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const base = padding.top + chartH;
    return `${makePath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  };

  const selectedSnap = sessions.find(s => s.sessionNumber === selectedSession);
  const selectedX = selectedSnap ? getX(selectedSnap) : padding.left;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const frac = (relX - padding.left) / chartW;
    let closest = 0;
    let closestDist = Infinity;
    for (const s of sessions) {
      const sx = maxDay > 0 ? s.dayOffset / maxDay : s.sessionNumber / totalSessions;
      const dist = Math.abs(sx - frac);
      if (dist < closestDist) {
        closestDist = dist;
        closest = s.sessionNumber;
      }
    }
    onSessionClick(closest);
  };

  const modSessions = new Set(modifications.map(m => m.sessionNumber));
  const breakthroughSessions = sessions.filter(s => s.isBreakthroughSession);
  const setbackSessions = sessions.filter(s => s.isSetbackSession);
  const funcMilestoneAchieved = sessions.filter(s => s.functionalMilestones.some(m => m.achieved && m.triggeredAtSession === s.sessionNumber));

  const phaseTransitions = useMemo(() => {
    const transitions: Array<{ session: SessionSnapshot; fromPhase: string; toPhase: string }> = [];
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i].recoveryPhaseLabel && sessions[i - 1].recoveryPhaseLabel && sessions[i].recoveryPhaseLabel !== sessions[i - 1].recoveryPhaseLabel) {
        transitions.push({
          session: sessions[i],
          fromPhase: sessions[i - 1].recoveryPhaseLabel,
          toPhase: sessions[i].recoveryPhaseLabel,
        });
      }
    }
    return transitions;
  }, [sessions]);

  return (
    <div>
      <div className="flex gap-0.5 mb-1 flex-wrap">
        {(Object.entries(SESSION_TRACK_CONFIG) as [SessionCurveTrack, typeof SESSION_TRACK_CONFIG.risk][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); toggleTrack(key); }}
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] transition-colors ${
              enabledTracks.has(key) ? 'bg-gray-700/60 text-gray-200' : 'bg-gray-800/30 text-gray-600'
            }`}
          >
            <div className="w-2 h-[2px] rounded" style={{ backgroundColor: enabledTracks.has(key) ? cfg.color : '#4b5563' }} />
            {cfg.label}
          </button>
        ))}
        {enabledTracks.has('rom') && allJointIds.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowPerJointRom(!showPerJointRom); }}
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] transition-colors ${
              showPerJointRom ? 'bg-cyan-700/40 text-cyan-300' : 'bg-gray-800/30 text-gray-600'
            }`}
          >
            <Bone className="h-2 w-2" />
            Joints ({allJointIds.length})
          </button>
        )}
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-pointer"
        onClick={handleClick}
      >
        {[0, 25, 50, 75, 100].map(v => {
          const y = padding.top + (1 - v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />
              <text x={padding.left - 3} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={7}>{v}</text>
            </g>
          );
        })}

        {enabledTracks.has('risk') && (
          <>
            <path d={makeAreaPath(toSvgPoints(trackData.risk))} fill="url(#sessRiskGrad)" opacity={0.2} />
            <path d={makePath(toSvgPoints(trackData.risk))} fill="none" stroke="#ef4444" strokeWidth={1.5} />
          </>
        )}
        {enabledTracks.has('pain') && (
          <path d={makePath(toSvgPoints(trackData.pain))} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
        )}
        {enabledTracks.has('sling') && (
          <path d={makePath(toSvgPoints(trackData.sling))} fill="none" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="2,2" />
        )}
        {enabledTracks.has('rom') && (
          <path d={makePath(toSvgPoints(trackData.rom))} fill="none" stroke="#06b6d4" strokeWidth={1} strokeDasharray="4,1" />
        )}
        {enabledTracks.has('muscle') && (
          <path d={makePath(toSvgPoints(trackData.muscle))} fill="none" stroke="#10b981" strokeWidth={1} strokeDasharray="3,3" />
        )}
        {enabledTracks.has('comp') && (
          <path d={makePath(toSvgPoints(trackData.comp))} fill="none" stroke="#f472b6" strokeWidth={1} strokeDasharray="2,3" />
        )}

        {perJointRomData.map(jd => (
          <path
            key={`rom-${jd.jointId}`}
            d={makePath(toSvgPoints(jd.pts))}
            fill="none"
            stroke={jd.color}
            strokeWidth={0.7}
            strokeDasharray="2,2"
            opacity={0.6}
          />
        ))}

        {sessions.filter(s => modSessions.has(s.sessionNumber)).map(s => {
          const mx = getX(s);
          return (
            <line key={`mod-${s.sessionNumber}`} x1={mx} y1={padding.top} x2={mx} y2={padding.top + chartH} stroke="#f59e0b" strokeWidth={0.6} strokeDasharray="2,2" opacity={0.4} />
          );
        })}

        {breakthroughSessions.map(s => {
          const bx = getX(s);
          return (
            <g key={`bt-${s.sessionNumber}`}>
              <line x1={bx} y1={padding.top} x2={bx} y2={padding.top + chartH} stroke="#10b981" strokeWidth={0.6} strokeDasharray="3,3" opacity={0.6} />
              <polygon points={`${bx},${padding.top + 2} ${bx - 3},${padding.top + 8} ${bx + 3},${padding.top + 8}`} fill="#10b981" opacity={0.8} />
            </g>
          );
        })}

        {setbackSessions.map(s => {
          const sx = getX(s);
          return (
            <g key={`sb-${s.sessionNumber}`}>
              <line x1={sx} y1={padding.top} x2={sx} y2={padding.top + chartH} stroke="#ef4444" strokeWidth={0.6} strokeDasharray="3,3" opacity={0.6} />
              <polygon points={`${sx},${padding.top + chartH - 2} ${sx - 3},${padding.top + chartH - 8} ${sx + 3},${padding.top + chartH - 8}`} fill="#ef4444" opacity={0.8} />
            </g>
          );
        })}

        {funcMilestoneAchieved.map(s => {
          const mx = getX(s);
          const ms = s.functionalMilestones.find(m => m.achieved && m.triggeredAtSession === s.sessionNumber);
          return (
            <g key={`fm-${s.sessionNumber}`}>
              <circle cx={mx} cy={padding.top + chartH + 3} r={2.5} fill="#eab308" stroke="#fff" strokeWidth={0.5} opacity={0.9} />
              {ms && (
                <text x={mx} y={padding.top + chartH + 10} textAnchor="middle" fill="#eab308" fontSize={5} opacity={0.7}>
                  {ms.label.length > 12 ? ms.label.substring(0, 12) + '…' : ms.label}
                </text>
              )}
            </g>
          );
        })}

        {phaseTransitions.map((pt, i) => {
          const px = getX(pt.session);
          return (
            <g key={`pt-${i}`}>
              <line x1={px} y1={padding.top} x2={px} y2={padding.top + chartH} stroke="#06b6d4" strokeWidth={1} strokeDasharray="4,2" opacity={0.7} />
              <rect x={px - 1} y={padding.top - 1} width={2} height={chartH + 2} fill="#06b6d4" opacity={0.08} />
              <title>{`Phase: ${pt.fromPhase} → ${pt.toPhase} (S${pt.session.sessionNumber})`}</title>
              <circle cx={px} cy={padding.top + 1} r={2} fill="#06b6d4" stroke="#1e293b" strokeWidth={0.5} />
            </g>
          );
        })}

        <line x1={selectedX} y1={padding.top} x2={selectedX} y2={padding.top + chartH} stroke="#22d3ee" strokeWidth={1.5} />
        {enabledTracks.has('risk') && toSvgPoints(trackData.risk).find(p => p.session === selectedSession) && (
          <circle
            cx={toSvgPoints(trackData.risk).find(p => p.session === selectedSession)!.x}
            cy={toSvgPoints(trackData.risk).find(p => p.session === selectedSession)!.y}
            r={3}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={1}
          />
        )}

        {sessions.length > 0 && (
          <>
            <text x={padding.left} y={height - 2} fill="#6b7280" fontSize={7}>Day 0</text>
            <text x={padding.left + chartW} y={height - 2} textAnchor="end" fill="#6b7280" fontSize={7}>Day {maxDay}</text>
            <text x={padding.left + chartW / 2} y={height - 2} textAnchor="middle" fill="#4b5563" fontSize={6}>{totalSessions} sessions</text>
          </>
        )}

        <defs>
          <linearGradient id="sessRiskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

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

function SessionTreatmentBar({
  sessions,
  selectedSession,
  totalSessions,
  onSessionClick,
}: {
  sessions: SessionSnapshot[];
  selectedSession: number;
  totalSessions: number;
  onSessionClick: (session: number) => void;
}) {
  const maxDay = sessions.length > 0 ? sessions[sessions.length - 1].dayOffset : 1;

  const phaseTransitions = useMemo(() => {
    const pts: Array<{ session: SessionSnapshot; toPhase: string }> = [];
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i].recoveryPhaseLabel && sessions[i - 1].recoveryPhaseLabel && sessions[i].recoveryPhaseLabel !== sessions[i - 1].recoveryPhaseLabel) {
        pts.push({ session: sessions[i], toPhase: sessions[i].recoveryPhaseLabel });
      }
    }
    return pts;
  }, [sessions]);

  const milestoneAchievedSessions = useMemo(() => {
    return sessions.filter(s => s.functionalMilestones.some(m => m.achieved && m.triggeredAtSession === s.sessionNumber));
  }, [sessions]);

  const getLeftPct = (s: SessionSnapshot) =>
    maxDay > 0 ? (s.dayOffset / maxDay) * 100 : (s.sessionNumber / totalSessions) * 100;

  return (
    <div className="relative w-full h-12 bg-gray-800/30 rounded border border-gray-700/40 overflow-hidden">
      {phaseTransitions.map((pt, i) => {
        const leftPct = getLeftPct(pt.session);
        return (
          <div
            key={`phase-${i}`}
            className="absolute top-0 bottom-0 w-px bg-cyan-500/50 z-5 pointer-events-none"
            style={{ left: `${leftPct}%` }}
            title={`Phase: ${pt.toPhase}`}
          >
            <div className="absolute -top-0.5 -left-[3px] w-[7px] h-[7px] bg-cyan-500 rounded-full border border-gray-900" title={pt.toPhase} />
          </div>
        );
      })}

      {milestoneAchievedSessions.map(s => {
        const leftPct = getLeftPct(s);
        const ms = s.functionalMilestones.find(m => m.achieved && m.triggeredAtSession === s.sessionNumber);
        return (
          <div
            key={`ms-${s.sessionNumber}`}
            className="absolute bottom-0 z-6 pointer-events-none"
            style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
            title={ms ? ms.label : 'Milestone'}
          >
            <div className="w-[6px] h-[6px] bg-amber-400 rotate-45 border border-gray-900" />
          </div>
        );
      })}

      {sessions.map(s => {
        const leftPct = getLeftPct(s);
        const isSelected = s.sessionNumber === selectedSession;
        const hasExercise = s.treatments.some(t => t.type === 'exercise');
        const hasManual = s.treatments.some(t => t.type === 'manual_therapy');

        return (
          <button
            key={s.sessionNumber}
            className={`absolute top-1.5 flex flex-col items-center gap-0.5 transition-all ${isSelected ? 'scale-125 z-10' : 'hover:scale-110'}`}
            style={{ left: `${leftPct}%`, transform: `translateX(-50%) ${isSelected ? 'scale(1.25)' : ''}` }}
            onClick={() => onSessionClick(s.sessionNumber)}
          >
            {s.isBreakthroughSession && (
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-emerald-400 mb-[-2px]" />
            )}
            {s.isSetbackSession && (
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-red-400 mb-[-2px]" />
            )}
            {hasExercise && (
              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-violet-400' : 'bg-violet-500/60'}`} />
            )}
            {hasManual && (
              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-rose-400' : 'bg-rose-500/60'}`} />
            )}
            {!hasExercise && !hasManual && (
              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gray-300' : 'bg-gray-600'}`} />
            )}
          </button>
        );
      })}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
        style={{ left: `${maxDay > 0 ? ((sessions.find(s => s.sessionNumber === selectedSession)?.dayOffset ?? 0) / maxDay) * 100 : (selectedSession / totalSessions) * 100}%` }}
      />
      <div className="absolute bottom-0.5 left-1 text-[7px] text-gray-600">Day 0</div>
      <div className="absolute bottom-0.5 right-1 text-[7px] text-gray-600">Day {maxDay}</div>
    </div>
  );
}

function SessionCard({
  session,
  isExpanded,
  onToggle,
}: {
  session: SessionSnapshot;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const exerciseCount = session.treatments.filter(t => t.type === 'exercise').length;
  const manualCount = session.treatments.filter(t => t.type === 'manual_therapy').length;
  const isRestSession = session.treatments.length === 0;
  const avgRomPct = session.romPredictions.length > 0
    ? (session.romPredictions.reduce((s, r) => s + r.predictedDegrees / r.targetDegrees * 100, 0) / session.romPredictions.length).toFixed(0)
    : null;

  return (
    <div className={`border rounded overflow-hidden transition-colors ${isExpanded ? 'border-cyan-500/40 bg-gray-800/60' : 'border-gray-700/30 bg-gray-800/30'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-700/20"
      >
        <span className="text-[9px] font-mono text-cyan-500/70 min-w-[28px]">S{session.sessionNumber}</span>
        <span className="text-[8px] text-gray-500">Day {session.dayOffset}</span>
        <div className="flex-1 flex items-center gap-1">
          {session.isBreakthroughSession && (
            <span className="text-[7px] text-emerald-400">★</span>
          )}
          {session.isSetbackSession && (
            <span className="text-[7px] text-red-400">▼</span>
          )}
          {exerciseCount > 0 && (
            <Badge variant="outline" className="text-[7px] py-0 px-1 border-violet-500/30 text-violet-400">
              <Dumbbell className="h-2 w-2 mr-0.5" />
              {exerciseCount}
            </Badge>
          )}
          {manualCount > 0 && (
            <Badge variant="outline" className="text-[7px] py-0 px-1 border-rose-500/30 text-rose-400">
              <Hand className="h-2 w-2 mr-0.5" />
              {manualCount}
            </Badge>
          )}
          {isRestSession && (
            <Badge variant="outline" className="text-[7px] py-0 px-1 border-gray-500/30 text-gray-400">
              <RefreshCw className="h-2 w-2 mr-0.5" />
              Rest
            </Badge>
          )}
        </div>
        <div className={`text-[9px] font-medium ${session.riskScore > 60 ? 'text-red-400' : session.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
          Risk {session.riskScore}
        </div>
        {isExpanded ? <ChevronUp className="h-2.5 w-2.5 text-gray-500" /> : <ChevronDown className="h-2.5 w-2.5 text-gray-500" />}
      </button>
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          {isRestSession && session.interSessionHealing && (
            <div className="bg-emerald-500/10 rounded border border-emerald-500/20 px-2 py-1">
              <div className="text-[8px] text-emerald-300 font-medium mb-0.5">Natural Healing (Rest Day)</div>
              <div className="grid grid-cols-3 gap-1 text-[7px]">
                <div>
                  <span className="text-gray-500">Tissue: </span>
                  <span className="text-emerald-400">+{session.interSessionHealing.tissueRemodeling.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Inflam: </span>
                  <span className="text-cyan-400">-{session.interSessionHealing.inflammationResolution.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Net: </span>
                  <span className={session.interSessionHealing.netHealingDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {session.interSessionHealing.netHealingDelta > 0 ? '+' : ''}{session.interSessionHealing.netHealingDelta.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
          {session.treatments.map((t, i) => {
            const contribs: Array<{ label: string; value: string; color: string }> = [];
            if (t.interventionType === 'stretch') {
              contribs.push({ label: 'ROM', value: `+${(t.magnitude * 3).toFixed(0)}°`, color: 'text-cyan-400' });
              contribs.push({ label: 'tension', value: `-${(t.magnitude * 5).toFixed(0)}%`, color: 'text-violet-400' });
            } else if (t.interventionType === 'mobilize') {
              contribs.push({ label: 'ROM', value: `+${(t.magnitude * 4).toFixed(0)}°`, color: 'text-cyan-400' });
              contribs.push({ label: 'pain', value: `-${(t.magnitude * 1.5).toFixed(1)}`, color: 'text-amber-400' });
            } else if (t.interventionType === 'strengthen') {
              contribs.push({ label: 'activation', value: `+${(t.magnitude * 6).toFixed(0)}%`, color: 'text-emerald-400' });
              contribs.push({ label: 'sling', value: `+${(t.magnitude * 2).toFixed(0)}%`, color: 'text-violet-400' });
            } else if (t.interventionType === 'offload') {
              contribs.push({ label: 'pain', value: `-${(t.magnitude * 2.5).toFixed(1)}`, color: 'text-amber-400' });
              contribs.push({ label: 'force', value: `-${(t.magnitude * 4).toFixed(0)}%`, color: 'text-emerald-400' });
            }
            return (
              <div key={i} className="flex items-start gap-1.5 text-[9px]">
                {t.type === 'exercise' ? (
                  <Dumbbell className="h-2.5 w-2.5 text-violet-400 shrink-0 mt-0.5" />
                ) : (
                  <Hand className="h-2.5 w-2.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200 font-medium truncate">{t.name}</div>
                  <div className="text-gray-500 text-[8px]">{t.dosageLabel}</div>
                  {contribs.length > 0 && (
                    <div className="flex gap-1.5 mt-0.5 items-center">
                      <span className="text-[6px] text-gray-600 italic">est.</span>
                      {contribs.map((c, ci) => (
                        <span key={ci} className={`text-[7px] ${c.color}`}>{c.value} {c.label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-[7px] py-0 px-1 border-gray-600/40 text-gray-400 shrink-0">
                  {t.interventionType}
                </Badge>
              </div>
            );
          })}
          <div className="grid grid-cols-5 gap-1 mt-1">
            <div className="text-center">
              <div className="text-[7px] text-gray-500">Pain</div>
              <div className={`text-[9px] font-medium ${session.painPrediction > 50 ? 'text-red-400' : session.painPrediction > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {session.painPrediction}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[7px] text-gray-500">Sling</div>
              <div className={`text-[9px] font-medium ${session.slingIntegrity > 70 ? 'text-emerald-400' : session.slingIntegrity > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {session.slingIntegrity}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-[7px] text-gray-500">Dose</div>
              <div className="text-[9px] font-medium text-cyan-400">
                {(session.doseResponseFraction * 100).toFixed(0)}%
              </div>
            </div>
            {avgRomPct && (
              <div className="text-center">
                <div className="text-[7px] text-gray-500">ROM</div>
                <div className="text-[9px] font-medium text-cyan-300">{avgRomPct}%</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-[7px] text-gray-500">Comp</div>
              <div className="text-[9px] font-medium text-pink-400">{session.compensationResolution.toFixed(0)}%</div>
            </div>
          </div>
          {(session.romPredictions.length > 0 || session.painMarkerPredictions.length > 0 || session.muscleStatePredictions.length > 0) && (
            <div className="border-t border-gray-700/20 pt-1 mt-1">
              <div className="text-[7px] text-gray-600 uppercase mb-0.5">Predicted Deltas</div>
              <div className="space-y-0.5 text-[7px]">
                {session.romPredictions.slice(0, 3).map(r => (
                  <div key={r.jointId} className="flex items-center justify-between">
                    <span className="text-gray-500 truncate max-w-[60%]">{r.jointLabel}</span>
                    <span className={r.deltaFromBaseline >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {r.deltaFromBaseline >= 0 ? '+' : ''}{r.deltaFromBaseline.toFixed(1)}° → {r.predictedDegrees.toFixed(0)}°
                    </span>
                  </div>
                ))}
                {session.painMarkerPredictions.slice(0, 2).map(p => (
                  <div key={p.markerId} className="flex items-center justify-between">
                    <span className="text-gray-500 truncate max-w-[60%]">{p.markerLabel}</span>
                    <span className={p.deltaFromBaseline <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {p.deltaFromBaseline > 0 ? '+' : ''}{p.deltaFromBaseline.toFixed(1)} → {p.predictedSeverity.toFixed(1)}
                    </span>
                  </div>
                ))}
                {session.muscleStatePredictions.slice(0, 2).map(m => (
                  <div key={m.muscleId} className="flex items-center justify-between">
                    <span className="text-gray-500 truncate max-w-[60%]">{m.muscleLabel}</span>
                    <span className={m.trendDirection === 'improving' ? 'text-emerald-400' : m.trendDirection === 'worsening' ? 'text-red-400' : 'text-gray-400'}>
                      T:{m.predictedTension.toFixed(0)}% A:{m.predictedActivation.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {session.recoveryPhaseLabel && (
            <div className="text-[7px] text-gray-500 mt-0.5">
              Phase: <span className="text-gray-300">{session.recoveryPhaseLabel}</span>
            </div>
          )}
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
    <div className="flex items-center justify-between">
      <span className="text-[8px] text-gray-500">{label}</span>
      <span className={`text-[9px] font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

function SessionStatusBadges({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant="outline" className="text-[7px] py-0 px-1 border-gray-600/30 text-gray-400">
        {snapshot.recoveryPhaseLabel}
      </Badge>
      {snapshot.isBreakthroughSession && (
        <Badge variant="outline" className="text-[7px] py-0 px-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
          <Sparkles className="h-2 w-2 mr-0.5" />Breakthrough
        </Badge>
      )}
      {snapshot.isPlateauSession && (
        <Badge variant="outline" className="text-[7px] py-0 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10">
          <AlertTriangle className="h-2 w-2 mr-0.5" />Plateau
        </Badge>
      )}
      {snapshot.isSetbackSession && (
        <Badge variant="outline" className="text-[7px] py-0 px-1 border-red-500/40 text-red-400 bg-red-500/10">
          <AlertCircle className="h-2 w-2 mr-0.5" />Setback
        </Badge>
      )}
    </div>
  );
}

function RomPredictionsSection({ predictions }: { predictions: RomPrediction[] }) {
  if (predictions.length === 0) return null;
  return (
    <div className="space-y-1">
      {predictions.map(rom => {
        const pct = rom.targetDegrees > 0 ? (rom.predictedDegrees / rom.targetDegrees) * 100 : 0;
        const deltaColor = rom.deltaFromBaseline > 0 ? 'text-emerald-400' : rom.deltaFromBaseline < -1 ? 'text-red-400' : 'text-gray-500';
        return (
          <div key={rom.jointId} className="bg-gray-800/30 rounded px-1.5 py-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-gray-300 truncate flex-1">{rom.jointLabel}</span>
              <span className="text-[8px] text-gray-400 ml-1">{Math.round(rom.predictedDegrees)}° / {rom.targetDegrees}°</span>
            </div>
            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] text-gray-600">{rom.limitingFactor}</span>
              {Math.abs(rom.deltaFromBaseline) > 0.5 && (
                <span className={`text-[7px] font-medium ${deltaColor}`}>
                  {rom.deltaFromBaseline > 0 ? '+' : ''}{rom.deltaFromBaseline.toFixed(1)}°
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PainPredictionsSection({ predictions }: { predictions: PainMarkerPrediction[] }) {
  if (predictions.length === 0) return null;
  return (
    <div className="space-y-1">
      {predictions.map(pm => {
        const sevColor = pm.predictedSeverity > 6 ? 'text-red-400' : pm.predictedSeverity > 3 ? 'text-amber-400' : 'text-emerald-400';
        const deltaColor = pm.deltaFromBaseline < 0 ? 'text-emerald-400' : pm.deltaFromBaseline > 0.5 ? 'text-red-400' : 'text-gray-500';
        const barPct = (pm.predictedSeverity / 10) * 100;
        return (
          <div key={pm.markerId} className="bg-gray-800/30 rounded px-1.5 py-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-gray-300 truncate flex-1">{pm.markerLabel}</span>
              <span className={`text-[8px] font-medium ${sevColor}`}>{pm.predictedSeverity.toFixed(1)}/10</span>
            </div>
            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pm.predictedSeverity > 6 ? 'bg-red-500' : pm.predictedSeverity > 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] text-gray-600">{pm.mechanism}</span>
              {Math.abs(pm.deltaFromBaseline) > 0.1 && (
                <span className={`text-[7px] font-medium ${deltaColor}`}>
                  {pm.deltaFromBaseline > 0 ? '+' : ''}{pm.deltaFromBaseline.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MuscleStatePredictionsSection({ predictions }: { predictions: MuscleStatePrediction[] }) {
  if (predictions.length === 0) return null;
  const trendIcon = (dir: string) =>
    dir === 'improving' ? <TrendingDown className="h-2 w-2 text-emerald-400" />
    : dir === 'worsening' ? <TrendingUp className="h-2 w-2 text-red-400" />
    : <ArrowRight className="h-2 w-2 text-gray-500" />;
  return (
    <div className="space-y-1">
      {predictions.map(ms => {
        const tensionColor = ms.predictedTension > 70 ? 'text-red-400' : ms.predictedTension < 30 ? 'text-blue-400' : 'text-emerald-400';
        return (
          <div key={ms.muscleId} className="bg-gray-800/30 rounded px-1.5 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {trendIcon(ms.trendDirection)}
                <span className="text-[8px] text-gray-300">{ms.muscleLabel}</span>
              </div>
              <span className={`text-[8px] font-medium ${tensionColor}`}>{ms.predictedTension}%</span>
            </div>
            <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full ${ms.predictedTension > 70 ? 'bg-red-500' : ms.predictedTension < 30 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                style={{ width: `${ms.predictedTension}%` }}
              />
            </div>
            <div className="text-[7px] text-gray-600 mt-0.5">{ms.clinicalNote}</div>
          </div>
        );
      })}
    </div>
  );
}

function SlingPredictionsSection({ predictions }: { predictions: SlingPrediction[] }) {
  if (predictions.length === 0) return null;
  return (
    <div className="space-y-1">
      {predictions.map(sl => {
        const intColor = sl.predictedIntegrity >= 70 ? 'text-emerald-400' : sl.predictedIntegrity >= 40 ? 'text-amber-400' : 'text-red-400';
        const deltaColor = sl.deltaFromBaseline > 0 ? 'text-emerald-400' : sl.deltaFromBaseline < -2 ? 'text-red-400' : 'text-gray-500';
        return (
          <div key={sl.slingId} className="bg-gray-800/30 rounded px-1.5 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-gray-300 truncate flex-1">{sl.slingName}</span>
              <div className="flex items-center gap-1">
                <span className={`text-[8px] font-medium ${intColor}`}>{sl.predictedIntegrity}%</span>
                {Math.abs(sl.deltaFromBaseline) > 0.5 && (
                  <span className={`text-[7px] ${deltaColor}`}>
                    ({sl.deltaFromBaseline > 0 ? '+' : ''}{sl.deltaFromBaseline})
                  </span>
                )}
              </div>
            </div>
            <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full ${sl.predictedIntegrity >= 70 ? 'bg-emerald-500' : sl.predictedIntegrity >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${sl.predictedIntegrity}%` }}
              />
            </div>
            {sl.weakLinks.length > 0 && (
              <div className="text-[7px] text-amber-400/70 mt-0.5">
                Weak: {sl.weakLinks.join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PosturalPredictionsSection({ predictions }: { predictions: PosturalPrediction[] }) {
  if (predictions.length === 0) return null;
  return (
    <div className="space-y-1">
      {predictions.map(pp => {
        const corrColor = pp.correctionPercent >= 70 ? 'text-emerald-400' : pp.correctionPercent >= 30 ? 'text-amber-400' : 'text-gray-400';
        return (
          <div key={pp.sliderId} className="flex items-center justify-between bg-gray-800/30 rounded px-1.5 py-1">
            <span className="text-[8px] text-gray-300">{pp.sliderLabel}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] text-gray-500">{pp.predictedValue.toFixed(1)}</span>
              <div className="w-10 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(pp.correctionPercent, 100)}%` }} />
              </div>
              <span className={`text-[7px] font-medium ${corrColor}`}>{pp.correctionPercent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompensationPredictionsSection({ predictions }: { predictions: CompensationPrediction[] }) {
  if (predictions.length === 0) return null;
  return (
    <div className="space-y-1">
      {predictions.map(cp => {
        const resColor = cp.resolutionPercent >= 70 ? 'text-emerald-400' : cp.resolutionPercent >= 30 ? 'text-amber-400' : 'text-red-400';
        return (
          <div key={cp.patternId} className="bg-gray-800/30 rounded px-1.5 py-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-gray-300 truncate flex-1">{cp.patternLabel}</span>
              <span className={`text-[8px] font-medium ${resColor}`}>{cp.resolutionPercent}% resolved</span>
            </div>
            <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${cp.resolutionPercent}%` }} />
            </div>
            {cp.contributingFactors.length > 0 && (
              <div className="text-[7px] text-gray-600 mt-0.5 truncate">
                {cp.contributingFactors.join(' | ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunctionalMilestonesSection({
  milestones,
  selectedSession,
  onSessionClick,
}: {
  milestones: FunctionalMilestone[];
  selectedSession: number;
  onSessionClick: (s: number) => void;
}) {
  if (milestones.length === 0) return null;
  const achieved = milestones.filter(m => m.achieved);
  const pending = milestones.filter(m => !m.achieved);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[8px] text-gray-500">{achieved.length}/{milestones.length} achieved</span>
        <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${milestones.length > 0 ? (achieved.length / milestones.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      {achieved.map(fm => (
        <div
          key={fm.id}
          className="flex items-start gap-1.5 px-1.5 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15"
          onClick={() => fm.triggeredAtSession !== null && onSessionClick(fm.triggeredAtSession)}
        >
          <Trophy className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[8px] text-emerald-300 font-medium">{fm.label}</div>
            <div className="text-[7px] text-gray-500">{fm.description}</div>
          </div>
          {fm.triggeredAtSession !== null && (
            <span className="text-[7px] text-emerald-400/70 shrink-0">S{fm.triggeredAtSession}</span>
          )}
        </div>
      ))}
      {pending.map(fm => {
        const progressPct = fm.thresholdType === 'pain'
          ? Math.max(0, 100 - (fm.currentValue / Math.max(fm.thresholdValue, 0.01)) * 100)
          : Math.min(100, (fm.currentValue / Math.max(fm.thresholdValue, 0.01)) * 100);
        return (
          <div key={fm.id} className="px-1.5 py-1 bg-gray-800/30 rounded">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-gray-400">{fm.label}</span>
              <span className="text-[7px] text-gray-600">{Math.round(progressPct)}%</span>
            </div>
            <div className="w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterSessionHealingSection({ healing }: { healing: InterSessionHealing }) {
  const components = [
    { label: 'Tissue Remodeling', value: healing.tissueRemodeling, color: 'text-emerald-400', icon: <Bone className="h-2.5 w-2.5" /> },
    { label: 'Exercise Carry-Over', value: healing.exerciseCarryOver, color: 'text-cyan-400', icon: <Dumbbell className="h-2.5 w-2.5" /> },
    { label: 'Inflammation Resolution', value: healing.inflammationResolution, color: 'text-amber-400', icon: <Flame className="h-2.5 w-2.5" /> },
  ];
  const netColor = healing.netHealingDelta > 0 ? 'text-emerald-400' : healing.netHealingDelta < -0.5 ? 'text-red-400' : 'text-gray-400';
  return (
    <div className="space-y-1">
      {components.map(c => (
        <div key={c.label} className="flex items-center justify-between px-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <span className={c.color}>{c.icon}</span>
            <span className="text-[8px] text-gray-400">{c.label}</span>
          </div>
          <span className={`text-[8px] font-medium ${c.value > 0 ? 'text-emerald-400' : c.value < -0.5 ? 'text-red-400' : 'text-gray-500'}`}>
            {c.value > 0 ? '+' : ''}{c.value.toFixed(2)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-gray-700/30 mt-0.5 pt-0.5">
        <span className="text-[8px] text-gray-300 font-medium">Net Healing</span>
        <span className={`text-[9px] font-bold ${netColor}`}>
          {healing.netHealingDelta > 0 ? '+' : ''}{healing.netHealingDelta.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

type MultiDimTab = 'rom' | 'pain' | 'muscle' | 'sling' | 'posture' | 'comp';

function MultiDimensionalPredictions({ snapshot }: { snapshot: SessionSnapshot }) {
  const [activeTab, setActiveTab] = useState<MultiDimTab>('rom');

  const allTabs: Array<{ id: MultiDimTab; label: string; icon: typeof Bone; count: number }> = [
    { id: 'rom', label: 'ROM', icon: Gauge, count: snapshot.romPredictions.length },
    { id: 'pain', label: 'Pain', icon: Target, count: snapshot.painMarkerPredictions.length },
    { id: 'muscle', label: 'Muscle', icon: Activity, count: snapshot.muscleStatePredictions.length },
    { id: 'sling', label: 'Sling', icon: Layers, count: snapshot.slingPredictions.length },
    { id: 'posture', label: 'Posture', icon: Brain, count: snapshot.posturalPredictions.length },
    { id: 'comp', label: 'Comp', icon: Shield, count: snapshot.compensationPredictions.length },
  ];
  const tabs = allTabs.filter(t => t.count > 0);

  if (tabs.length === 0) return null;

  const effectiveTab = tabs.find(t => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'rom');

  return (
    <div>
      <div className="flex gap-0.5 mb-1.5 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = effectiveTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] transition-colors ${
                isActive ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-gray-800/40 text-gray-500 border border-transparent hover:text-gray-300'
              }`}
            >
              <Icon className="h-2.5 w-2.5" />
              {t.label}
              <span className="text-[6px] opacity-60">{t.count}</span>
            </button>
          );
        })}
      </div>
      <div className="max-h-36 overflow-y-auto custom-scrollbar">
        {effectiveTab === 'rom' && <RomPredictionsSection predictions={snapshot.romPredictions} />}
        {effectiveTab === 'pain' && <PainPredictionsSection predictions={snapshot.painMarkerPredictions} />}
        {effectiveTab === 'muscle' && <MuscleStatePredictionsSection predictions={snapshot.muscleStatePredictions} />}
        {effectiveTab === 'sling' && <SlingPredictionsSection predictions={snapshot.slingPredictions} />}
        {effectiveTab === 'posture' && <PosturalPredictionsSection predictions={snapshot.posturalPredictions} />}
        {effectiveTab === 'comp' && <CompensationPredictionsSection predictions={snapshot.compensationPredictions} />}
      </div>
    </div>
  );
}

function SessionTimelineView({
  sessionTimeline,
  baseModelConfig,
  baseOverrides,
  onApplyToSkeleton,
  activeCondition,
  modifiers,
}: {
  sessionTimeline: SessionTimelineResult;
  baseModelConfig: Record<string, Record<string, number>>;
  baseOverrides: Record<string, Partial<MuscleOverride>>;
  onApplyToSkeleton?: (modelConfig: Record<string, Record<string, number>>, overrides: Record<string, Partial<MuscleOverride>>) => void;
  activeCondition?: ConditionRecoveryProfile | null;
  modifiers?: PatientModifierProfile | null;
}) {
  const [selectedSession, setSelectedSession] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'curve' | 'sessions' | 'modifications' | 'summary' | 'multidim' | 'funcmilestones' | 'healing' | null>('curve');
  const [expandedSessionCard, setExpandedSessionCard] = useState<number | null>(null);
  const [appliedSession, setAppliedSession] = useState<number | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, []);

  const currentSnapshot = useMemo(() => {
    return sessionTimeline.sessions.find(s => s.sessionNumber === selectedSession) ?? sessionTimeline.sessions[0] ?? null;
  }, [sessionTimeline, selectedSession]);

  const handleSessionChange = useCallback((value: number[]) => {
    setSelectedSession(value[0]);
  }, []);

  const handleApply = useCallback(() => {
    if (!currentSnapshot || !onApplyToSkeleton) return;
    onApplyToSkeleton(currentSnapshot.modelConfig, currentSnapshot.overrides);
    setAppliedSession(selectedSession);
  }, [currentSnapshot, onApplyToSkeleton, selectedSession]);

  useEffect(() => {
    if (isPlaying && currentSnapshot && onApplyToSkeleton) {
      onApplyToSkeleton(currentSnapshot.modelConfig, currentSnapshot.overrides);
      setAppliedSession(currentSnapshot.sessionNumber);
    }
  }, [isPlaying, currentSnapshot, onApplyToSkeleton]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    setIsPlaying(true);
    if (currentSnapshot && onApplyToSkeleton) {
      onApplyToSkeleton(currentSnapshot.modelConfig, currentSnapshot.overrides);
      setAppliedSession(selectedSession);
    }
    let sess = selectedSession;
    const interval = setInterval(() => {
      sess++;
      if (sess > sessionTimeline.totalSessions) {
        clearInterval(interval);
        playIntervalRef.current = null;
        setIsPlaying(false);
        return;
      }
      setSelectedSession(sess);
    }, 600);
    playIntervalRef.current = interval;
  }, [isPlaying, selectedSession, sessionTimeline.totalSessions, currentSnapshot, onApplyToSkeleton]);

  const toggleSection = (section: 'curve' | 'sessions' | 'modifications' | 'summary' | 'multidim' | 'funcmilestones' | 'healing') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const riskDelta = sessionTimeline.startingState.riskScore - (currentSnapshot?.riskScore ?? sessionTimeline.startingState.riskScore);
  const slingDelta = (currentSnapshot?.slingIntegrity ?? sessionTimeline.startingState.slingIntegrity) - sessionTimeline.startingState.slingIntegrity;

  const lastSession = sessionTimeline.sessions.length > 0 ? sessionTimeline.sessions[sessionTimeline.sessions.length - 1] : null;

  const currentMods = sessionTimeline.modifications.filter(m => m.sessionNumber === selectedSession);
  const nearbyMods = sessionTimeline.modifications.filter(m =>
    Math.abs(m.sessionNumber - selectedSession) <= 2 && m.sessionNumber !== selectedSession
  );

  return (
    <div className="flex flex-col gap-2 text-[10px] max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-cyan-300">Session Timeline</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-400 px-1.5 py-0">
            {sessionTimeline.totalSessions} sessions
          </Badge>
          <Badge variant="outline" className="text-[8px] border-gray-600/30 text-gray-400 px-1.5 py-0">
            ~{Math.round(sessionTimeline.totalDays / 7)} weeks
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 mb-1">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Dumbbell className="h-2.5 w-2.5 text-violet-400" />
          <span className="text-[8px] text-violet-300">{sessionTimeline.treatments.filter(t => t.type === 'exercise').length} exercises</span>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
          <Hand className="h-2.5 w-2.5 text-rose-400" />
          <span className="text-[8px] text-rose-300">{sessionTimeline.treatments.filter(t => t.type === 'manual_therapy').length} techniques</span>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-700/30 border border-gray-600/20">
          <Calendar className="h-2.5 w-2.5 text-gray-400" />
          <span className="text-[8px] text-gray-400">every {sessionTimeline.sessionIntervalDays}d</span>
        </div>
      </div>

      {(activeCondition || modifiers) && (
        <div className="bg-gray-800/40 rounded border border-gray-700/40 p-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            {activeCondition && (
              <Badge variant="outline" className="text-[7px] py-0 px-1.5 border-cyan-500/30 text-cyan-400">
                <Target className="h-2 w-2 mr-0.5" />
                {activeCondition.conditionName}
              </Badge>
            )}
            {currentSnapshot?.recoveryPhaseLabel && (
              <Badge variant="outline" className="text-[7px] py-0 px-1.5 border-violet-500/30 text-violet-400">
                {currentSnapshot.recoveryPhaseLabel}
              </Badge>
            )}
            {modifiers && (
              <>
                {modifiers.overallRecoveryMultiplier < 0.85 && (
                  <Badge variant="outline" className="text-[7px] py-0 px-1 border-red-500/30 text-red-400">
                    Recovery ×{modifiers.overallRecoveryMultiplier.toFixed(2)}
                  </Badge>
                )}
                {modifiers.overallRecoveryMultiplier >= 0.85 && modifiers.overallRecoveryMultiplier <= 1.15 && (
                  <Badge variant="outline" className="text-[7px] py-0 px-1 border-gray-500/30 text-gray-400">
                    Recovery ×{modifiers.overallRecoveryMultiplier.toFixed(2)}
                  </Badge>
                )}
                {modifiers.overallRecoveryMultiplier > 1.15 && (
                  <Badge variant="outline" className="text-[7px] py-0 px-1 border-emerald-500/30 text-emerald-400">
                    Recovery ×{modifiers.overallRecoveryMultiplier.toFixed(2)}
                  </Badge>
                )}
                {modifiers.painSensitivityMultiplier > 1.2 && (
                  <Badge variant="outline" className="text-[7px] py-0 px-1 border-amber-500/30 text-amber-400">
                    Pain ×{modifiers.painSensitivityMultiplier.toFixed(1)}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 rounded border border-gray-700/50 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-[9px]">
            Session {selectedSession} of {sessionTimeline.totalSessions}
            {currentSnapshot && <span className="text-gray-600"> (Day {currentSnapshot.dayOffset})</span>}
          </span>
        </div>

        <SessionTreatmentBar
          sessions={sessionTimeline.sessions}
          selectedSession={selectedSession}
          totalSessions={sessionTimeline.totalSessions}
          onSessionClick={setSelectedSession}
        />

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setSelectedSession(Math.max(1, selectedSession - 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
            disabled={selectedSession <= 1}
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
              value={[selectedSession]}
              onValueChange={handleSessionChange}
              min={1}
              max={sessionTimeline.totalSessions}
              step={1}
              className="w-full"
            />
          </div>
          <button
            onClick={() => setSelectedSession(Math.min(sessionTimeline.totalSessions, selectedSession + 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
            disabled={selectedSession >= sessionTimeline.totalSessions}
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
            delta={-(sessionTimeline.startingState.painBaseline - currentSnapshot.painPrediction)}
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

      {currentSnapshot && (
        <SessionStatusBadges snapshot={currentSnapshot} />
      )}

      {currentMods.length > 0 && (
        <div className="bg-amber-500/10 rounded border border-amber-500/30 p-2 space-y-1">
          {currentMods.map((mod, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Lightbulb className={`h-3 w-3 shrink-0 mt-0.5 ${mod.type === 'regress' ? 'text-red-400' : mod.type === 'plateau' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <div>
                <div className="text-[9px] text-gray-200">{mod.message}</div>
                <div className="text-[8px] text-amber-300/70 mt-0.5">{mod.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <Button
          onClick={handleApply}
          disabled={!currentSnapshot || !onApplyToSkeleton}
          size="sm"
          className="w-full h-7 text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30"
          variant="outline"
        >
          <Zap className="h-3 w-3 mr-1" />
          {appliedSession === selectedSession ? `Applied Session ${selectedSession}` : `Apply Session ${selectedSession} to Skeleton`}
        </Button>
        {currentSnapshot && (
          <div className="flex gap-1 mt-0.5 flex-wrap justify-center">
            <span className="text-[7px] text-gray-600">Applies:</span>
            <span className="text-[7px] text-gray-500">posture</span>
            <span className="text-[7px] text-gray-500">muscle tension</span>
            {currentSnapshot.romPredictions.length > 0 && <span className="text-[7px] text-gray-500">ROM ({currentSnapshot.romPredictions.length})</span>}
            {currentSnapshot.painMarkerPredictions.length > 0 && <span className="text-[7px] text-gray-500">pain ({currentSnapshot.painMarkerPredictions.length})</span>}
            {currentSnapshot.compensationPredictions.length > 0 && <span className="text-[7px] text-gray-500">comp ({currentSnapshot.compensationPredictions.length})</span>}
          </div>
        )}
      </div>

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
            <SessionRecoveryCurve
              sessions={sessionTimeline.sessions}
              selectedSession={selectedSession}
              totalSessions={sessionTimeline.totalSessions}
              milestones={sessionTimeline.milestones}
              modifications={sessionTimeline.modifications}
              onSessionClick={setSelectedSession}
            />
          </div>
        )}
      </div>

      {currentSnapshot && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('multidim')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Layers className="h-3 w-3 text-cyan-400" />
              Multi-Dimensional Predictions
            </span>
            {expandedSection === 'multidim' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'multidim' && (
            <div className="p-2 bg-gray-900/30">
              <MultiDimensionalPredictions snapshot={currentSnapshot} />
            </div>
          )}
        </div>
      )}

      {currentSnapshot && currentSnapshot.functionalMilestones.length > 0 && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('funcmilestones')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-400" />
              Functional Milestones ({currentSnapshot.functionalMilestones.filter(m => m.achieved).length}/{currentSnapshot.functionalMilestones.length})
            </span>
            {expandedSection === 'funcmilestones' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'funcmilestones' && (
            <div className="p-2 bg-gray-900/30">
              <FunctionalMilestonesSection
                milestones={currentSnapshot.functionalMilestones}
                selectedSession={selectedSession}
                onSessionClick={setSelectedSession}
              />
            </div>
          )}
        </div>
      )}

      {currentSnapshot?.interSessionHealing && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('healing')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-400" />
              Inter-Session Healing
              <span className={`text-[8px] ml-1 ${currentSnapshot.interSessionHealing.netHealingDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ({currentSnapshot.interSessionHealing.netHealingDelta > 0 ? '+' : ''}{currentSnapshot.interSessionHealing.netHealingDelta.toFixed(1)})
              </span>
            </span>
            {expandedSection === 'healing' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'healing' && (
            <div className="p-2 bg-gray-900/30">
              <InterSessionHealingSection healing={currentSnapshot.interSessionHealing} />
            </div>
          )}
        </div>
      )}

      <div className="border border-gray-700/40 rounded overflow-hidden">
        <button
          onClick={() => toggleSection('sessions')}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
        >
          <span className="text-[9px] font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3 text-cyan-400" />
            Session Details
          </span>
          {expandedSection === 'sessions' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expandedSection === 'sessions' && (
          <div className="p-2 bg-gray-900/30 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {sessionTimeline.sessions
              .filter(s => s.sessionNumber >= Math.max(0, selectedSession - 2) && s.sessionNumber <= selectedSession + 3)
              .map(s => (
                <SessionCard
                  key={s.sessionNumber}
                  session={s}
                  isExpanded={expandedSessionCard === s.sessionNumber}
                  onToggle={() => setExpandedSessionCard(expandedSessionCard === s.sessionNumber ? null : s.sessionNumber)}
                />
              ))}
            {sessionTimeline.sessions.length > 6 && (
              <div className="text-[8px] text-gray-600 text-center pt-1">
                Showing sessions near S{selectedSession}. Use scrubber to navigate.
              </div>
            )}
          </div>
        )}
      </div>

      {sessionTimeline.modifications.length > 0 && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('modifications')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              Modifications ({sessionTimeline.modifications.length})
            </span>
            {expandedSection === 'modifications' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'modifications' && (
            <div className="p-2 bg-gray-900/30 space-y-1">
              {sessionTimeline.modifications.map((mod, i) => {
                const isPast = mod.sessionNumber <= selectedSession;
                return (
                  <div
                    key={i}
                    className={`px-1.5 py-1 rounded cursor-pointer hover:bg-gray-800/40 ${isPast ? 'opacity-100' : 'opacity-50'}`}
                    onClick={() => setSelectedSession(mod.sessionNumber)}
                  >
                    <div className="flex items-center gap-1.5 text-[9px]">
                      {mod.type === 'regress' ? (
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                      ) : mod.type === 'plateau' ? (
                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      )}
                      <span className="text-gray-400">S{mod.sessionNumber}</span>
                      <span className={`flex-1 truncate ${isPast ? 'text-gray-200' : 'text-gray-500'}`}>{mod.message}</span>
                    </div>
                    <div className="ml-[18px] mt-0.5 text-[8px] text-amber-300/60 italic truncate">
                      {mod.suggestion}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sessionTimeline.milestones.length > 0 && (
        <div className="border border-gray-700/40 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Milestone className="h-3 w-3 text-cyan-400" />
              Milestones ({sessionTimeline.milestones.length})
            </span>
            {expandedSection === 'summary' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'summary' && (
            <div className="p-2 bg-gray-900/30 space-y-1">
              {sessionTimeline.milestones.map((m, i) => {
                const MIcon = MILESTONE_ICONS[m.type] || CheckCircle2;
                const mColor = MILESTONE_COLORS[m.type] || 'text-gray-400';
                return (
                  <div key={i} className="px-1.5 py-1 rounded text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <MIcon className={`h-3 w-3 ${mColor} shrink-0`} />
                      <span className="text-gray-400">Day {m.week * 7}</span>
                      <span className="flex-1 truncate text-gray-200">{m.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-800/30 rounded border border-gray-700/30 p-2">
        <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Before / After — Multi-Dimensional</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <div className="text-[7px] text-gray-600 uppercase">Baseline (S1)</div>
            <SummaryRow label="Risk" value={sessionTimeline.startingState.riskScore} color="red" />
            <SummaryRow label="Pain" value={sessionTimeline.startingState.painBaseline} color="amber" />
            <SummaryRow label="Sling" value={`${sessionTimeline.startingState.slingIntegrity}%`} color="amber" />
            {sessionTimeline.baseline.romBaselines.length > 0 && (
              <SummaryRow
                label="Avg ROM"
                value={`${(sessionTimeline.baseline.romBaselines.reduce((s, r) => s + r.predictedDegrees / r.targetDegrees * 100, 0) / sessionTimeline.baseline.romBaselines.length).toFixed(0)}%`}
                color="amber"
              />
            )}
            {sessionTimeline.baseline.compensationBaselines.length > 0 && (
              <SummaryRow
                label="Comp"
                value={`${sessionTimeline.baseline.compensationBaselines.length} active`}
                color="red"
              />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-[7px] text-gray-600 uppercase">Final (S{sessionTimeline.totalSessions})</div>
            <SummaryRow label="Risk" value={sessionTimeline.endState.riskScore} color="emerald" />
            {lastSession && <SummaryRow label="Pain" value={lastSession.painPrediction} color={lastSession.painPrediction > 30 ? 'amber' : 'emerald'} />}
            <SummaryRow label="Sling" value={`${sessionTimeline.endState.slingIntegrity}%`} color="emerald" />
            {lastSession && lastSession.romPredictions.length > 0 && (
              <SummaryRow
                label="Avg ROM"
                value={`${(lastSession.romPredictions.reduce((s, r) => s + r.predictedDegrees / r.targetDegrees * 100, 0) / lastSession.romPredictions.length).toFixed(0)}%`}
                color="emerald"
              />
            )}
            {lastSession && (
              <SummaryRow
                label="Comp"
                value={`${lastSession.compensationResolution.toFixed(0)}% resolved`}
                color="emerald"
              />
            )}
          </div>
        </div>
        {lastSession && (
          <div className="mt-1 pt-1 border-t border-gray-700/20">
            <div className="text-[7px] text-gray-600 uppercase mb-0.5">Dimension Improvement</div>
            <div className="space-y-0.5 text-[7px]">
              {(() => {
                const riskDelta = sessionTimeline.startingState.riskScore - sessionTimeline.endState.riskScore;
                const riskPct = sessionTimeline.startingState.riskScore > 0 ? (riskDelta / sessionTimeline.startingState.riskScore * 100).toFixed(0) : '0';
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Risk</span>
                    <span className={riskDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {riskDelta > 0 ? '↓' : '↑'}{Math.abs(riskDelta)} pts ({riskPct}%)
                    </span>
                  </div>
                );
              })()}
              {(() => {
                const painDelta = sessionTimeline.startingState.painBaseline - lastSession.painPrediction;
                const painPct = sessionTimeline.startingState.painBaseline > 0 ? (painDelta / sessionTimeline.startingState.painBaseline * 100).toFixed(0) : '0';
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Pain</span>
                    <span className={painDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {painDelta > 0 ? '↓' : '↑'}{Math.abs(painDelta).toFixed(0)} ({painPct}%)
                    </span>
                  </div>
                );
              })()}
              {(() => {
                const slingDelta = sessionTimeline.endState.slingIntegrity - sessionTimeline.startingState.slingIntegrity;
                const slingPct = sessionTimeline.startingState.slingIntegrity > 0 ? (slingDelta / sessionTimeline.startingState.slingIntegrity * 100).toFixed(0) : '0';
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Sling</span>
                    <span className={slingDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {slingDelta > 0 ? '↑' : '↓'}{Math.abs(slingDelta)}% ({slingPct}%)
                    </span>
                  </div>
                );
              })()}
              {sessionTimeline.baseline.romBaselines.length > 0 && lastSession.romPredictions.length > 0 && (() => {
                const baseRom = sessionTimeline.baseline.romBaselines.reduce((s, r) => s + r.predictedDegrees / r.targetDegrees * 100, 0) / sessionTimeline.baseline.romBaselines.length;
                const finalRom = lastSession.romPredictions.reduce((s, r) => s + r.predictedDegrees / r.targetDegrees * 100, 0) / lastSession.romPredictions.length;
                const romDelta = finalRom - baseRom;
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Avg ROM</span>
                    <span className={romDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {romDelta > 0 ? '↑' : '↓'}{Math.abs(romDelta).toFixed(1)}% ({baseRom > 0 ? (romDelta / baseRom * 100).toFixed(0) : '0'}%)
                    </span>
                  </div>
                );
              })()}
              {sessionTimeline.baseline.muscleBaselines.length > 0 && lastSession.muscleStatePredictions.length > 0 && (() => {
                const baseTension = sessionTimeline.baseline.muscleBaselines.reduce((s, m) => s + m.predictedTension, 0) / sessionTimeline.baseline.muscleBaselines.length;
                const finalTension = lastSession.muscleStatePredictions.reduce((s, m) => s + m.predictedTension, 0) / lastSession.muscleStatePredictions.length;
                const tensionDelta = baseTension - finalTension;
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Muscle Tension</span>
                    <span className={tensionDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {tensionDelta > 0 ? '↓' : '↑'}{Math.abs(tensionDelta).toFixed(1)}% ({baseTension > 0 ? (tensionDelta / baseTension * 100).toFixed(0) : '0'}%)
                    </span>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Compensation</span>
                <span className="text-emerald-400">
                  ↓{lastSession.compensationResolution.toFixed(0)}% resolved
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="mt-1.5 pt-1.5 border-t border-gray-700/30 flex items-center gap-1 text-[9px]">
          <TrendingDown className="h-3 w-3 text-emerald-400" />
          <span className="text-gray-400">Est. recovery:</span>
          <span className="text-emerald-300 font-medium">{sessionTimeline.endState.estimatedRecoverySessions} sessions</span>
          {sessionTimeline.functionalMilestones.length > 0 && (
            <span className="text-gray-500 ml-1">
              ({sessionTimeline.functionalMilestones.filter(m => m.achieved).length}/{sessionTimeline.functionalMilestones.length} milestones)
            </span>
          )}
        </div>
      </div>

      {currentSnapshot && currentSnapshot.activeScenarios.length > 0 && (
        <div className="bg-gray-800/30 rounded border border-gray-700/30 p-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Active Interventions (S{selectedSession})</div>
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

function PatientFactorsForm({
  factors,
  onChange,
  onAutoPopulate,
  hasAutoPopulateData,
  modifiers,
  detectedCondition,
  adjustedProfile,
  conditionOverrideId,
  onConditionOverrideChange,
  autoPopulatedFields,
}: {
  factors: PatientFactors;
  onChange: (updated: PatientFactors) => void;
  onAutoPopulate: () => void;
  hasAutoPopulateData: boolean;
  modifiers: PatientModifierProfile;
  detectedCondition: ConditionRecoveryProfile | null;
  adjustedProfile: ConditionRecoveryProfile | null;
  conditionOverrideId: string | null;
  onConditionOverrideChange: (id: string | null) => void;
  autoPopulatedFields: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModifiers, setShowModifiers] = useState(false);
  const [showCondition, setShowCondition] = useState(false);

  const updateField = <K extends keyof PatientFactors>(key: K, value: PatientFactors[K]) => {
    onChange({ ...factors, [key]: value });
  };

  const autoFieldBorder = (field: string) =>
    autoPopulatedFields.has(field) ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-gray-700/40';

  const autoFieldLabel = (field: string, label: string) => (
    <label className="text-[8px] text-gray-500 block mb-0.5">
      {label}
      {autoPopulatedFields.has(field) && (
        <span className="ml-1 text-[6px] text-violet-400 font-medium">AUTO</span>
      )}
    </label>
  );

  const overallColor = modifiers.overallRecoveryMultiplier >= 0.85
    ? 'text-emerald-400' : modifiers.overallRecoveryMultiplier >= 0.6
    ? 'text-amber-400' : 'text-red-400';

  const overallBg = modifiers.overallRecoveryMultiplier >= 0.85
    ? 'bg-emerald-500/10 border-emerald-500/30' : modifiers.overallRecoveryMultiplier >= 0.6
    ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';

  return (
    <div className="border border-gray-700/40 rounded overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 text-gray-300"
      >
        <span className="text-[9px] font-medium flex items-center gap-1">
          <User className="h-3 w-3 text-violet-400" />
          Patient Factors
          {factors.age !== null && (
            <Badge variant="outline" className="text-[7px] py-0 px-1 border-violet-500/30 text-violet-300 ml-1">
              {factors.age}y
            </Badge>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] font-medium ${overallColor}`}>
            {(modifiers.overallRecoveryMultiplier * 100).toFixed(0)}% recovery
          </span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-2 bg-gray-900/30 space-y-2">
          {hasAutoPopulateData && (
            <Button
              onClick={onAutoPopulate}
              size="sm"
              variant="outline"
              className="w-full h-6 text-[9px] bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/30"
            >
              <RefreshCw className="h-2.5 w-2.5 mr-1" />
              Auto-fill from Clinical Pipeline
            </Button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('age', 'Age')}
              <input
                type="number"
                value={factors.age ?? ''}
                onChange={e => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('age')} rounded px-1.5 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
                placeholder="Age"
                min={1}
                max={120}
              />
            </div>
            <div>
              {autoFieldLabel('bmi', 'BMI')}
              <select
                value={factors.bmi}
                onChange={e => updateField('bmi', e.target.value as PatientFactors['bmi'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('bmi')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="underweight">Underweight</option>
                <option value="normal">Normal</option>
                <option value="overweight">Overweight</option>
                <option value="obese">Obese</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('diabetes', 'Diabetes')}
              <select
                value={factors.diabetes}
                onChange={e => updateField('diabetes', e.target.value as PatientFactors['diabetes'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('diabetes')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="none">None</option>
                <option value="prediabetic">Pre-diabetic</option>
                <option value="type2">Type 2</option>
                <option value="type1">Type 1</option>
              </select>
            </div>
            <div>
              {autoFieldLabel('thyroid', 'Thyroid')}
              <select
                value={factors.thyroid}
                onChange={e => updateField('thyroid', e.target.value as PatientFactors['thyroid'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('thyroid')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="normal">Normal</option>
                <option value="hypothyroid">Hypothyroid</option>
                <option value="hyperthyroid">Hyperthyroid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('smoking', 'Smoking')}
              <select
                value={factors.smoking}
                onChange={e => updateField('smoking', e.target.value as PatientFactors['smoking'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('smoking')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </div>
            <div>
              {autoFieldLabel('activityLevel', 'Activity Level')}
              <select
                value={factors.activityLevel}
                onChange={e => updateField('activityLevel', e.target.value as PatientFactors['activityLevel'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('activityLevel')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="athletic">Athletic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('chronicity', 'Chronicity')}
              <select
                value={factors.chronicity}
                onChange={e => updateField('chronicity', e.target.value as PatientFactors['chronicity'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('chronicity')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="acute">Acute</option>
                <option value="subacute">Subacute</option>
                <option value="chronic">Chronic</option>
                <option value="recurrent">Recurrent</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              {autoFieldLabel('irritability', 'Irritability')}
              <select
                value={factors.irritability}
                onChange={e => updateField('irritability', e.target.value as PatientFactors['irritability'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('irritability')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('psychologicalRisk', 'Psych Risk')}
              <select
                value={factors.psychologicalRisk}
                onChange={e => updateField('psychologicalRisk', e.target.value as PatientFactors['psychologicalRisk'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('psychologicalRisk')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              {autoFieldLabel('sleepQuality', 'Sleep Quality')}
              <select
                value={factors.sleepQuality}
                onChange={e => updateField('sleepQuality', e.target.value as PatientFactors['sleepQuality'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('sleepQuality')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              {autoFieldLabel('sideAffected', 'Side Affected')}
              <select
                value={factors.sideAffected}
                onChange={e => updateField('sideAffected', e.target.value as PatientFactors['sideAffected'])}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('sideAffected')} rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
              >
                <option value="dominant">Dominant</option>
                <option value="non_dominant">Non-dominant</option>
                <option value="bilateral">Bilateral</option>
                <option value="axial">Axial</option>
              </select>
            </div>
            <div>
              {autoFieldLabel('previousEpisodes', 'Previous Episodes')}
              <input
                type="number"
                value={factors.previousEpisodes}
                onChange={e => updateField('previousEpisodes', Math.max(0, parseInt(e.target.value) || 0))}
                className={`w-full bg-gray-800/60 border ${autoFieldBorder('previousEpisodes')} rounded px-1.5 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none`}
                min={0}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[8px] text-gray-500">Compliance ({factors.compliance}%)</label>
            </div>
            <Slider
              value={[factors.compliance]}
              onValueChange={v => updateField('compliance', v[0])}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[9px] text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={factors.steroidInjectionHistory}
                onChange={e => {
                  updateField('steroidInjectionHistory', e.target.checked);
                  if (!e.target.checked) updateField('steroidInjectionCount', 0);
                }}
                className="rounded border-gray-600 bg-gray-800 text-violet-500 h-3 w-3"
              />
              Steroid injections
            </label>
            {factors.steroidInjectionHistory && (
              <input
                type="number"
                value={factors.steroidInjectionCount}
                onChange={e => updateField('steroidInjectionCount', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-12 bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-violet-500/50 focus:outline-none"
                min={0}
                placeholder="count"
              />
            )}
          </div>

          <div className={`rounded p-1.5 border ${overallBg}`}>
            <button
              onClick={() => setShowModifiers(!showModifiers)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-rose-400" />
                <span className="text-[9px] font-medium text-gray-200">Recovery Modifier Impact</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-bold ${overallColor}`}>
                  {(modifiers.overallRecoveryMultiplier * 100).toFixed(0)}%
                </span>
                {showModifiers ? <ChevronUp className="h-2.5 w-2.5 text-gray-500" /> : <ChevronDown className="h-2.5 w-2.5 text-gray-500" />}
              </div>
            </button>
            {showModifiers && (
              <div className="mt-1.5 space-y-1 border-t border-gray-700/30 pt-1.5">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Healing</div>
                    <div className={`text-[9px] font-medium ${modifiers.healingRateMultiplier >= 0.9 ? 'text-emerald-400' : modifiers.healingRateMultiplier >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.healingRateMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Tissue</div>
                    <div className={`text-[9px] font-medium ${modifiers.tissueQualityMultiplier >= 0.9 ? 'text-emerald-400' : modifiers.tissueQualityMultiplier >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.tissueQualityMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Pain Sens.</div>
                    <div className={`text-[9px] font-medium ${modifiers.painSensitivityMultiplier <= 1.0 ? 'text-emerald-400' : modifiers.painSensitivityMultiplier <= 1.2 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.painSensitivityMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Compliance</div>
                    <div className={`text-[9px] font-medium ${modifiers.complianceMultiplier >= 0.8 ? 'text-emerald-400' : modifiers.complianceMultiplier >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.complianceMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Recurrence</div>
                    <div className={`text-[9px] font-medium ${modifiers.recurrenceRiskMultiplier <= 1.0 ? 'text-emerald-400' : modifiers.recurrenceRiskMultiplier <= 1.3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.recurrenceRiskMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Psychosocial</div>
                    <div className={`text-[9px] font-medium ${modifiers.psychosocialMultiplier >= 0.85 ? 'text-emerald-400' : modifiers.psychosocialMultiplier >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.psychosocialMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-0.5">
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Duration</div>
                    <div className={`text-[9px] font-medium ${modifiers.durationMultiplier <= 1.1 ? 'text-emerald-400' : modifiers.durationMultiplier <= 1.5 ? 'text-amber-400' : 'text-red-400'}`}>
                      ×{modifiers.durationMultiplier.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">Dose Scale</div>
                    <div className={`text-[9px] font-medium ${modifiers.perSessionDoseScale >= 0.8 ? 'text-emerald-400' : modifiers.perSessionDoseScale >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.perSessionDoseScale * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-gray-500">ROM Ceiling</div>
                    <div className={`text-[9px] font-medium ${modifiers.romCeilingAdjustment >= 0.85 ? 'text-emerald-400' : modifiers.romCeilingAdjustment >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(modifiers.romCeilingAdjustment * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {modifiers.modifierBreakdown.length > 0 && (
                  <div className="space-y-0.5 mt-1">
                    {modifiers.modifierBreakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-[8px]">
                        <span className="text-gray-400">{b.factor}</span>
                        <span className="text-gray-500">{b.effect}</span>
                        <span className={b.multiplier >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>
                          ×{b.multiplier.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {modifiers.riskFlags.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {modifiers.riskFlags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-1 text-[8px]">
                        <AlertCircle className="h-2.5 w-2.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-red-300/80">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {modifiers.positiveFactors.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {modifiers.positiveFactors.map((pf, i) => (
                      <div key={i} className="flex items-start gap-1 text-[8px]">
                        <Sparkles className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-emerald-300/80">{pf}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-1.5">
            <div className="mb-1.5">
              <label className="text-[8px] text-gray-500 block mb-0.5">Condition Profile</label>
              <select
                value={conditionOverrideId ?? ""}
                onChange={e => onConditionOverrideChange(e.target.value || null)}
                className="w-full bg-gray-800/60 border border-gray-700/40 rounded px-1 py-0.5 text-[9px] text-gray-200 focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="">
                  {detectedCondition ? `Auto-detect: ${detectedCondition.conditionName}` : "Auto-detect (none found)"}
                </option>
                {CONDITION_RECOVERY_PROFILES.map(p => (
                  <option key={p.conditionId} value={p.conditionId}>
                    {p.conditionName}
                  </option>
                ))}
              </select>
            </div>

            {detectedCondition && (
              <>
                <button
                  onClick={() => setShowCondition(!showCondition)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-cyan-400" />
                    <span className="text-[9px] font-medium text-cyan-300">{detectedCondition.conditionName}</span>
                    {conditionOverrideId && (
                      <Badge variant="outline" className="text-[6px] py-0 px-0.5 border-cyan-500/30 text-cyan-400/60">MANUAL</Badge>
                    )}
                  </div>
                  {showCondition ? <ChevronUp className="h-2.5 w-2.5 text-gray-500" /> : <ChevronDown className="h-2.5 w-2.5 text-gray-500" />}
                </button>
                {showCondition && (
                  <div className="mt-1.5 space-y-1.5 border-t border-cyan-500/20 pt-1.5">
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-gray-500">Recovery:</span>
                      <span className="text-cyan-300">
                        {adjustedProfile ? `${adjustedProfile.totalRecoveryWeeksMin}–${adjustedProfile.totalRecoveryWeeksMax}` : `${detectedCondition.totalRecoveryWeeksMin}–${detectedCondition.totalRecoveryWeeksMax}`} weeks
                      </span>
                      {adjustedProfile && adjustedProfile.totalRecoveryWeeksMax !== detectedCondition.totalRecoveryWeeksMax && (
                        <span className="text-gray-600 line-through text-[7px]">
                          {detectedCondition.totalRecoveryWeeksMin}–{detectedCondition.totalRecoveryWeeksMax}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-gray-500">ROM recovery:</span>
                      <span className="text-cyan-300">{adjustedProfile?.expectedRomRecoveryPercent ?? detectedCondition.expectedRomRecoveryPercent}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-gray-500">Recurrence risk:</span>
                      <span className={`${(adjustedProfile?.recurrenceRiskPercent ?? detectedCondition.recurrenceRiskPercent) > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {adjustedProfile?.recurrenceRiskPercent ?? detectedCondition.recurrenceRiskPercent}%
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[7px] text-gray-500 uppercase">Phases</div>
                      {(adjustedProfile ?? detectedCondition).phases.map((ph, i) => (
                        <div key={i} className="flex items-center gap-1 text-[8px]">
                          <div className={`w-1.5 h-1.5 rounded-full ${PHASE_COLORS[i % PHASE_COLORS.length].bg.replace('/20', '')}`} />
                          <span className="text-gray-300 flex-1 truncate">{ph.name}</span>
                          <span className="text-gray-500 shrink-0">{ph.durationWeeksMin}–{ph.durationWeeksMax}w</span>
                        </div>
                      ))}
                    </div>
                    {detectedCondition.keyPrognosticFactors.length > 0 && (
                      <div className="space-y-0.5">
                        <div className="text-[7px] text-gray-500 uppercase">Key Prognostic Factors</div>
                        <div className="flex flex-wrap gap-1">
                          {detectedCondition.keyPrognosticFactors.map((kpf, i) => (
                            <Badge key={i} variant="outline" className="text-[7px] py-0 px-1 border-cyan-500/20 text-cyan-400/70">
                              {kpf}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {detectedCondition.contraindicatedInterventions.length > 0 && (
                      <div className="space-y-0.5">
                        <div className="text-[7px] text-gray-500 uppercase">Contraindicated</div>
                        {detectedCondition.contraindicatedInterventions.map((ci, i) => (
                          <div key={i} className="flex items-start gap-1 text-[8px]">
                            <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-red-300/70">{ci}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
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
  customExercises,
  customTechniques,
  extractionResult,
  structuredReasoning,
}: SimulationTimelinePanelProps) {
  const [patientFactors, setPatientFactors] = useState<PatientFactors>(DEFAULT_PATIENT_FACTORS);
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<Set<string>>(new Set());

  const hasAutoPopulateData = !!(extractionResult || structuredReasoning);

  const detectAutoFields = useCallback((before: PatientFactors, after: PatientFactors): Set<string> => {
    const fields = new Set<string>();
    for (const key of Object.keys(after) as (keyof PatientFactors)[]) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        fields.add(key);
      }
    }
    return fields;
  }, []);

  useEffect(() => {
    if (hasAutoPopulateData && !hasAutoPopulated) {
      const populated = autoPopulateFromPipeline(extractionResult ?? null, structuredReasoning ?? null, DEFAULT_PATIENT_FACTORS);
      const isDifferent = JSON.stringify(populated) !== JSON.stringify(DEFAULT_PATIENT_FACTORS);
      if (isDifferent) {
        setAutoPopulatedFields(detectAutoFields(DEFAULT_PATIENT_FACTORS, populated));
        setPatientFactors(populated);
        setHasAutoPopulated(true);
      }
    }
  }, [extractionResult, structuredReasoning, hasAutoPopulateData, hasAutoPopulated, detectAutoFields]);

  const handleAutoPopulate = useCallback(() => {
    const populated = autoPopulateFromPipeline(extractionResult ?? null, structuredReasoning ?? null, patientFactors);
    setAutoPopulatedFields(detectAutoFields(patientFactors, populated));
    setPatientFactors(populated);
    setHasAutoPopulated(true);
  }, [extractionResult, structuredReasoning, patientFactors, detectAutoFields]);

  const detectedCondition = useMemo(() => autoDetectCondition(structuredReasoning ?? null), [structuredReasoning]);

  const [conditionOverrideId, setConditionOverrideId] = useState<string | null>(null);

  const activeCondition = useMemo(() => {
    if (conditionOverrideId) {
      return CONDITION_RECOVERY_PROFILES.find(p => p.conditionId === conditionOverrideId) ?? detectedCondition;
    }
    return detectedCondition;
  }, [conditionOverrideId, detectedCondition]);

  const modifiers = useMemo(() => computePatientModifiers(patientFactors, activeCondition), [patientFactors, activeCondition]);

  const adjustedProfile = useMemo(() => {
    if (!activeCondition) return null;
    return adjustProfileForPatient(activeCondition, modifiers);
  }, [activeCondition, modifiers]);

  const hasCustomTreatments = (customExercises && customExercises.length > 0) || (customTechniques && customTechniques.length > 0);

  const sessionTimeline = useMemo(() => {
    if (!hasCustomTreatments) return null;
    try {
      return buildSessionTimeline(
        customExercises ?? [],
        customTechniques ?? [],
        baseModelConfig,
        baseOverrides,
        painMarkers,
        bodyWeightKg,
        biomechanicsOutput,
        modifiers,
        adjustedProfile,
      );
    } catch (e) {
      console.warn('[SimTimeline] Session build failed:', e);
      return null;
    }
  }, [hasCustomTreatments, customExercises, customTechniques, baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, biomechanicsOutput, modifiers, adjustedProfile]);

  const weekTimeline = useMemo(() => {
    if (hasCustomTreatments) return null;
    if (!treatmentPlan || treatmentPlan.phases.length === 0) return null;
    try {
      return buildSimulationTimeline(
        treatmentPlan,
        baseModelConfig,
        baseOverrides,
        painMarkers,
        bodyWeightKg,
        biomechanicsOutput,
        modifiers,
        adjustedProfile,
      );
    } catch (e) {
      console.warn('[SimTimeline] Week build failed:', e);
      return null;
    }
  }, [hasCustomTreatments, treatmentPlan, baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, biomechanicsOutput, modifiers, adjustedProfile]);

  const patientFactorsPanel = (
    <PatientFactorsForm
      factors={patientFactors}
      onChange={setPatientFactors}
      onAutoPopulate={handleAutoPopulate}
      hasAutoPopulateData={hasAutoPopulateData}
      modifiers={modifiers}
      detectedCondition={activeCondition}
      adjustedProfile={adjustedProfile}
      conditionOverrideId={conditionOverrideId}
      onConditionOverrideChange={setConditionOverrideId}
      autoPopulatedFields={autoPopulatedFields}
    />
  );

  if (hasCustomTreatments && sessionTimeline) {
    return (
      <div className="flex flex-col gap-2">
        {patientFactorsPanel}
        <SessionTimelineView
          sessionTimeline={sessionTimeline}
          baseModelConfig={baseModelConfig}
          baseOverrides={baseOverrides}
          onApplyToSkeleton={onApplyWeekToSkeleton}
          activeCondition={activeCondition}
          modifiers={modifiers}
        />
      </div>
    );
  }

  if (weekTimeline) {
    return (
      <div className="flex flex-col gap-2">
        {patientFactorsPanel}
        <WeekTimelineView
          timeline={weekTimeline}
          onApplyWeekToSkeleton={onApplyWeekToSkeleton}
        />
      </div>
    );
  }

  return (
    <div className="p-3 text-center space-y-3">
      {patientFactorsPanel}
      <div className="text-gray-500 text-[10px] mb-2">No simulation data available</div>
      <div className="bg-gray-800/40 rounded border border-gray-700/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
          <Dumbbell className="h-3.5 w-3.5 text-violet-400" />
          <span>Design custom exercises in the <span className="text-violet-300 font-medium">Exercise Rx</span> tab</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
          <Hand className="h-3.5 w-3.5 text-rose-400" />
          <span>Design manual therapy in the <span className="text-rose-300 font-medium">Manual Rx</span> tab</span>
        </div>
        <div className="text-[9px] text-gray-500 mt-1">
          Then return here to simulate recovery across sessions
        </div>
      </div>
      {treatmentPlan && treatmentPlan.phases.length > 0 && (
        <div className="text-[9px] text-gray-600">
          Or generate a Treatment Plan from the Plan tab to use week-based simulation.
        </div>
      )}
    </div>
  );
}

function WeekTimelineView({
  timeline,
  onApplyWeekToSkeleton,
}: {
  timeline: SimulationTimelineResult;
  onApplyWeekToSkeleton?: (modelConfig: Record<string, Record<string, number>>, overrides: Record<string, Partial<MuscleOverride>>) => void;
}) {
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

  const currentSnapshot = useMemo(() => {
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
