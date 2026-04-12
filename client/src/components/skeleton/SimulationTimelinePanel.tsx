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
  ClipboardCheck,
  ListOrdered,
} from "lucide-react";
import {
  buildSimulationTimeline,
  buildSessionTimeline,
  buildSessionTimelineAsync,
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
  type SessionApplyPayload,
  type ActualSessionOutcome,
  type CorrectionFactors,
  type TreatmentPhaseBlock,
  type PhaseProgressEvent,
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
import { computeGoalGap, generateGoalProfile, generateGenericGoalProfile, detectPathologyOverride, type RecoveryGoalProfile, type GoalGapAnalysis, type ClinicalStateInput, type ScarSummaryEntry, type ChainTensionEntry, type PostureMeasurements } from "@/lib/goalStateEngine";
import { computeTimelinePrescriptions, getExerciseById, type TimelinePrescriptionSummary, type PrescriptionContext } from "@/lib/prescriptionAdapterEngine";

interface GoalOverlayData {
  enabled: boolean;
  painTargets?: Array<{ boneName: string; targetIntensity: number; currentIntensity: number }>;
  muscleTargets?: Array<{ groupId: string; targetTension: number; currentTension: number }>;
  postureTargets?: Array<{ boneName: string; targetAngle: number; currentAngle: number; axis: 'x' | 'y' | 'z' }>;
  romTargets?: Array<{ boneName: string; targetDegrees: number; currentDegrees: number; label: string }>;
  overallPct?: number;
}

const LABEL_TO_BONE_MAP: Record<string, string> = {
  shoulder: 'UpperArm_L', 'l shoulder': 'UpperArm_L', 'r shoulder': 'UpperArm_R',
  'left shoulder': 'UpperArm_L', 'right shoulder': 'UpperArm_R',
  knee: 'LowerLeg_L', 'l knee': 'LowerLeg_L', 'r knee': 'LowerLeg_R',
  'left knee': 'LowerLeg_L', 'right knee': 'LowerLeg_R',
  hip: 'UpperLeg_L', 'l hip': 'UpperLeg_L', 'r hip': 'UpperLeg_R',
  'left hip': 'UpperLeg_L', 'right hip': 'UpperLeg_R',
  ankle: 'Foot_L', 'l ankle': 'Foot_L', 'r ankle': 'Foot_R',
  'left ankle': 'Foot_L', 'right ankle': 'Foot_R',
  elbow: 'LowerArm_L', 'l elbow': 'LowerArm_L', 'r elbow': 'LowerArm_R',
  'left elbow': 'LowerArm_L', 'right elbow': 'LowerArm_R',
  wrist: 'Hand_L', 'l wrist': 'Hand_L', 'r wrist': 'Hand_R',
  neck: 'Neck_M', cervical: 'Neck_M',
  'lower back': 'Spine1_M', lumbar: 'Spine1_M',
  'upper back': 'Spine2_M', thoracic: 'Spine2_M',
  back: 'Spine1_M', spine: 'Spine1_M',
  head: 'Head_M', jaw: 'Head_M',
};

function mapLabelToBone(label: string): string {
  const lower = label.toLowerCase().trim();
  if (LABEL_TO_BONE_MAP[lower]) return LABEL_TO_BONE_MAP[lower];
  for (const [key, bone] of Object.entries(LABEL_TO_BONE_MAP)) {
    if (lower.includes(key)) return bone;
  }
  return 'Spine1_M';
}

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
  onApplyWeekToSkeleton?: (payload: SessionApplyPayload) => void;
  customExercises?: CustomExercise[] | null;
  customTechniques?: CustomTechnique[] | null;
  extractionResult?: ClinicalExtractionResult | null;
  structuredReasoning?: StructuredReasoningResult | null;
  onGoalOverlayChange?: (overlay: GoalOverlayData | null) => void;
  onGoalProfileChange?: (profile: RecoveryGoalProfile | null, gap: GoalGapAnalysis | null) => void;
  onSessionPrescriptionSelect?: (ctx: PrescriptionContext | null, sessionNumber: number | null) => void;
  scarSummary?: ScarSummaryEntry[];
  chainTensionAverages?: ChainTensionEntry[];
  postureMeasurements?: PostureMeasurements;
  currentRom?: Array<{ jointId: string; currentDegrees: number }>;
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

type SessionCurveTrack = 'risk' | 'pain' | 'sling' | 'rom' | 'comp' | 'muscle' | 'goal';

const SESSION_TRACK_CONFIG: Record<SessionCurveTrack, { label: string; color: string; dash?: string }> = {
  risk: { label: 'Risk', color: '#ef4444' },
  pain: { label: 'Pain', color: '#f59e0b', dash: '3,2' },
  sling: { label: 'Sling', color: '#8b5cf6', dash: '2,2' },
  rom: { label: 'ROM', color: '#06b6d4', dash: '4,1' },
  muscle: { label: 'Muscle', color: '#10b981', dash: '3,3' },
  comp: { label: 'Comp', color: '#f472b6', dash: '2,3' },
  goal: { label: 'Goal%', color: '#22c55e', dash: '5,2' },
};

const ROM_JOINT_COLORS = ['#06b6d4', '#0ea5e9', '#38bdf8', '#7dd3fc', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'];

function SessionRecoveryCurve({
  sessions,
  selectedSession,
  totalSessions,
  milestones,
  modifications,
  onSessionClick,
  goalProfile,
}: {
  sessions: SessionSnapshot[];
  selectedSession: number;
  totalSessions: number;
  milestones: SimulationMilestone[];
  modifications: SessionModification[];
  onSessionClick: (session: number) => void;
  goalProfile?: RecoveryGoalProfile | null;
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

  const safeRomPct = useCallback((r: RomPrediction) => r.targetDegrees > 0 ? (r.predictedDegrees / r.targetDegrees) * 100 : 50, []);

  const avgRom = useCallback((s: SessionSnapshot) => {
    if (s.romPredictions.length === 0) return 50;
    return s.romPredictions.reduce((sum, r) => sum + safeRomPct(r), 0) / s.romPredictions.length;
  }, [safeRomPct]);

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
      risk: [], pain: [], sling: [], rom: [], muscle: [], comp: [], goal: [],
    };
    for (const s of sessions) {
      const x = getX(s);
      data.risk.push({ x, y: s.riskScore, session: s.sessionNumber });
      data.pain.push({ x, y: s.painPrediction, session: s.sessionNumber });
      data.sling.push({ x, y: s.slingIntegrity, session: s.sessionNumber });
      data.rom.push({ x, y: avgRom(s), session: s.sessionNumber });
      data.muscle.push({ x, y: avgMuscleTension(s), session: s.sessionNumber });
      data.comp.push({ x, y: 100 - s.compensationResolution, session: s.sessionNumber });
      data.goal.push({ x, y: s.goalAchievementPct ?? 0, session: s.sessionNumber });
    }
    return data;
  }, [sessions, getX, avgRom, avgMuscleTension]);

  const perJointRomData = useMemo(() => {
    if (!showPerJointRom || !enabledTracks.has('rom')) return [];
    return allJointIds.map((jointId, idx) => {
      const pts = sessions.map(s => {
        const rom = s.romPredictions.find(r => r.jointId === jointId);
        const pct = rom ? safeRomPct(rom) : 50;
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
        {goalProfile && enabledTracks.has('risk') && (
          <line
            x1={padding.left}
            y1={padding.top + (1 - goalProfile.riskScoreTarget / 100) * chartH}
            x2={padding.left + chartW}
            y2={padding.top + (1 - goalProfile.riskScoreTarget / 100) * chartH}
            stroke="#ef4444"
            strokeWidth={0.6}
            strokeDasharray="4,4"
            opacity={0.4}
          />
        )}
        {goalProfile && enabledTracks.has('pain') && (
          <line
            x1={padding.left}
            y1={padding.top + (1 - goalProfile.painTarget / 100) * chartH}
            x2={padding.left + chartW}
            y2={padding.top + (1 - goalProfile.painTarget / 100) * chartH}
            stroke="#f59e0b"
            strokeWidth={0.6}
            strokeDasharray="4,4"
            opacity={0.4}
          />
        )}
        {goalProfile && enabledTracks.has('sling') && goalProfile.slingTargets.length > 0 && (() => {
          const avgSlingTarget = goalProfile.slingTargets.reduce((s, t) => s + t.targetIntegrity, 0) / goalProfile.slingTargets.length;
          return (
            <line
              x1={padding.left}
              y1={padding.top + (1 - avgSlingTarget / 100) * chartH}
              x2={padding.left + chartW}
              y2={padding.top + (1 - avgSlingTarget / 100) * chartH}
              stroke="#8b5cf6"
              strokeWidth={0.6}
              strokeDasharray="4,4"
              opacity={0.4}
            />
          );
        })()}
        {goalProfile && enabledTracks.has('rom') && (
          <line
            x1={padding.left}
            y1={padding.top + (1 - goalProfile.overallRomRecoveryPercent / 100) * chartH}
            x2={padding.left + chartW}
            y2={padding.top + (1 - goalProfile.overallRomRecoveryPercent / 100) * chartH}
            stroke="#06b6d4"
            strokeWidth={0.6}
            strokeDasharray="4,4"
            opacity={0.4}
          />
        )}
        {goalProfile && enabledTracks.has('muscle') && goalProfile.muscleTensionTargets.length > 0 && (() => {
          const avgMusTarget = goalProfile.muscleTensionTargets.reduce(
            (s, t) => s + (t.targetTensionMin + t.targetTensionMax) / 2, 0
          ) / goalProfile.muscleTensionTargets.length;
          return (
            <line
              x1={padding.left}
              y1={padding.top + (1 - avgMusTarget / 100) * chartH}
              x2={padding.left + chartW}
              y2={padding.top + (1 - avgMusTarget / 100) * chartH}
              stroke="#10b981"
              strokeWidth={0.6}
              strokeDasharray="4,4"
              opacity={0.4}
            />
          );
        })()}
        {goalProfile && enabledTracks.has('comp') && (
          <line
            x1={padding.left}
            y1={padding.top + (1 - (100 - goalProfile.compensationResolutionTarget) / 100) * chartH}
            x2={padding.left + chartW}
            y2={padding.top + (1 - (100 - goalProfile.compensationResolutionTarget) / 100) * chartH}
            stroke="#f472b6"
            strokeWidth={0.6}
            strokeDasharray="4,4"
            opacity={0.4}
          />
        )}
        {enabledTracks.has('goal') && trackData.goal.length > 0 && (
          <>
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left + chartW}
              y2={padding.top}
              stroke="#22c55e"
              strokeWidth={0.8}
              strokeDasharray="6,3"
              opacity={0.5}
            />
            <text x={padding.left + chartW - 2} y={padding.top - 2} textAnchor="end" fill="#22c55e" fontSize={7} opacity={0.7}>100% Goal</text>
            <path d={makePath(toSvgPoints(trackData.goal))} fill="none" stroke="#22c55e" strokeWidth={1.2} strokeDasharray="5,2" />
          </>
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

function CorrectionTrendBadge({ factors }: { factors: CorrectionFactors }) {
  const { overall } = factors;
  const trendColor = overall.trend === 'faster' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : overall.trend === 'slower' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-gray-300 border-gray-500/30 bg-gray-500/10';
  const trendIcon = overall.trend === 'faster' ? <TrendingUp className="h-2.5 w-2.5" />
    : overall.trend === 'slower' ? <TrendingDown className="h-2.5 w-2.5" />
    : <ArrowRight className="h-2.5 w-2.5" />;
  const trendLabel = overall.trend === 'faster' ? 'Responding Faster'
    : overall.trend === 'slower' ? 'Responding Slower'
    : 'As Expected';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[8px] font-medium ${trendColor}`}>
      {trendIcon}
      <span>{trendLabel}</span>
      {overall.magnitude > 0 && (
        <span className="opacity-70">({overall.magnitude}%)</span>
      )}
      <span className="text-gray-500 ml-auto">{overall.sessionCount} recorded</span>
    </div>
  );
}

function ActualOutcomeInput({
  session,
  existingOutcome,
  onSave,
}: {
  session: SessionSnapshot;
  existingOutcome?: ActualSessionOutcome;
  onSave: (outcome: ActualSessionOutcome) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [romValues, setRomValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of session.romPredictions.slice(0, 4)) {
      init[r.jointId] = existingOutcome?.actualRom?.[r.jointId]?.toString() ?? '';
    }
    return init;
  });
  const [painValues, setPainValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of session.painMarkerPredictions.slice(0, 3)) {
      init[p.markerId] = existingOutcome?.actualPain?.[p.markerId]?.toString() ?? '';
    }
    return init;
  });
  const [muscleValues, setMuscleValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of session.muscleStatePredictions.slice(0, 3)) {
      init[m.muscleId] = existingOutcome?.actualMuscleTension?.[m.muscleId]?.toString() ?? '';
    }
    return init;
  });
  const [compliance, setCompliance] = useState(existingOutcome?.complianceRating?.toString() ?? '1');
  const [notes, setNotes] = useState(existingOutcome?.notes ?? '');

  const handleSave = useCallback(() => {
    const actualRom: Record<string, number> = {};
    for (const [k, v] of Object.entries(romValues)) {
      const n = parseFloat(v);
      if (!isNaN(n) && n >= 0) actualRom[k] = n;
    }
    const actualPain: Record<string, number> = {};
    for (const [k, v] of Object.entries(painValues)) {
      const n = parseFloat(v);
      if (!isNaN(n) && n >= 0 && n <= 10) actualPain[k] = n;
    }
    const actualMuscleTension: Record<string, number> = {};
    for (const [k, v] of Object.entries(muscleValues)) {
      const n = parseFloat(v);
      if (!isNaN(n) && n >= 0 && n <= 100) actualMuscleTension[k] = n;
    }
    onSave({
      sessionNumber: session.sessionNumber,
      actualRom: Object.keys(actualRom).length > 0 ? actualRom : undefined,
      actualPain: Object.keys(actualPain).length > 0 ? actualPain : undefined,
      actualMuscleTension: Object.keys(actualMuscleTension).length > 0 ? actualMuscleTension : undefined,
      complianceRating: parseFloat(compliance) || 1,
      notes: notes.trim() || undefined,
    });
    setIsEditing(false);
  }, [romValues, painValues, muscleValues, compliance, notes, session.sessionNumber, onSave]);

  if (!isEditing && !existingOutcome) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full flex items-center justify-center gap-1 text-[8px] text-cyan-400/70 hover:text-cyan-400 py-1 mt-1 border border-dashed border-cyan-500/20 rounded hover:border-cyan-500/40 transition-colors"
      >
        <ClipboardCheck className="h-2.5 w-2.5" />
        Record Actual Outcome
      </button>
    );
  }

  if (!isEditing && existingOutcome) {
    return (
      <div className="mt-1 border border-emerald-500/20 rounded bg-emerald-500/5 p-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] text-emerald-400 font-medium flex items-center gap-1">
            <ClipboardCheck className="h-2.5 w-2.5" />
            Actual Outcome Recorded
          </span>
          <button onClick={() => setIsEditing(true)} className="text-[7px] text-gray-500 hover:text-gray-300">Edit</button>
        </div>
        <div className="space-y-0.5">
          {session.romPredictions.slice(0, 4).map(r => {
            const actual = existingOutcome.actualRom?.[r.jointId];
            if (actual === undefined) return null;
            const diff = actual - r.predictedDegrees;
            return (
              <div key={r.jointId} className="flex items-center justify-between text-[7px]">
                <span className="text-gray-500 truncate max-w-[40%]">{r.jointLabel}</span>
                <span className="text-gray-400">Pred: {r.predictedDegrees.toFixed(0)}°</span>
                <span className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  Act: {actual.toFixed(0)}° ({diff >= 0 ? '+' : ''}{diff.toFixed(0)}°)
                </span>
              </div>
            );
          })}
          {session.painMarkerPredictions.slice(0, 3).map(p => {
            const actual = existingOutcome.actualPain?.[p.markerId];
            if (actual === undefined) return null;
            const diff = actual - p.predictedSeverity;
            return (
              <div key={p.markerId} className="flex items-center justify-between text-[7px]">
                <span className="text-gray-500 truncate max-w-[40%]">{p.markerLabel}</span>
                <span className="text-gray-400">Pred: {p.predictedSeverity.toFixed(1)}</span>
                <span className={diff <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  Act: {actual.toFixed(1)} ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                </span>
              </div>
            );
          })}
          {session.muscleStatePredictions.slice(0, 3).map(m => {
            const actual = existingOutcome.actualMuscleTension?.[m.muscleId];
            if (actual === undefined) return null;
            const diff = actual - m.predictedTension;
            const normalDist = Math.abs(actual - 50);
            const predNormalDist = Math.abs(m.predictedTension - 50);
            const isBetter = normalDist < predNormalDist;
            return (
              <div key={m.muscleId} className="flex items-center justify-between text-[7px]">
                <span className="text-gray-500 truncate max-w-[40%]">{m.muscleLabel}</span>
                <span className="text-gray-400">Pred: {m.predictedTension}%</span>
                <span className={isBetter ? 'text-emerald-400' : 'text-amber-400'}>
                  Act: {actual}% ({diff > 0 ? '+' : ''}{diff}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 border border-cyan-500/20 rounded bg-cyan-500/5 p-1.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-cyan-400 font-medium">Record Actual Measurements</span>
        <button onClick={() => setIsEditing(false)} className="text-[7px] text-gray-500 hover:text-gray-300">Cancel</button>
      </div>
      {session.romPredictions.length > 0 && (
        <div>
          <div className="text-[7px] text-gray-500 mb-0.5">ROM (degrees)</div>
          <div className="space-y-0.5">
            {session.romPredictions.slice(0, 4).map(r => (
              <div key={r.jointId} className="flex items-center gap-1 text-[7px]">
                <span className="text-gray-400 w-[45%] truncate">{r.jointLabel}</span>
                <span className="text-gray-600 text-[6px]">pred:{r.predictedDegrees.toFixed(0)}°</span>
                <input
                  type="number"
                  min="0"
                  max="360"
                  step="1"
                  value={romValues[r.jointId] ?? ''}
                  onChange={e => setRomValues(prev => ({ ...prev, [r.jointId]: e.target.value }))}
                  className="flex-1 bg-gray-800/60 border border-gray-600/40 rounded px-1 py-0.5 text-[8px] text-gray-200 w-12"
                  placeholder="°"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {session.painMarkerPredictions.length > 0 && (
        <div>
          <div className="text-[7px] text-gray-500 mb-0.5">Pain (0-10)</div>
          <div className="space-y-0.5">
            {session.painMarkerPredictions.slice(0, 3).map(p => (
              <div key={p.markerId} className="flex items-center gap-1 text-[7px]">
                <span className="text-gray-400 w-[45%] truncate">{p.markerLabel}</span>
                <span className="text-gray-600 text-[6px]">pred:{p.predictedSeverity.toFixed(1)}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={painValues[p.markerId] ?? ''}
                  onChange={e => setPainValues(prev => ({ ...prev, [p.markerId]: e.target.value }))}
                  className="flex-1 bg-gray-800/60 border border-gray-600/40 rounded px-1 py-0.5 text-[8px] text-gray-200 w-12"
                  placeholder="/10"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {session.muscleStatePredictions.length > 0 && (
        <div>
          <div className="text-[7px] text-gray-500 mb-0.5">Muscle Tension (0-100%)</div>
          <div className="space-y-0.5">
            {session.muscleStatePredictions.slice(0, 3).map(m => (
              <div key={m.muscleId} className="flex items-center gap-1 text-[7px]">
                <span className="text-gray-400 w-[45%] truncate">{m.muscleLabel}</span>
                <span className="text-gray-600 text-[6px]">pred:{m.predictedTension}%</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={muscleValues[m.muscleId] ?? ''}
                  onChange={e => setMuscleValues(prev => ({ ...prev, [m.muscleId]: e.target.value }))}
                  className="flex-1 bg-gray-800/60 border border-gray-600/40 rounded px-1 py-0.5 text-[8px] text-gray-200 w-12"
                  placeholder="%"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 text-[7px]">
        <span className="text-gray-400">Compliance:</span>
        <select
          value={compliance}
          onChange={e => setCompliance(e.target.value)}
          className="bg-gray-800/60 border border-gray-600/40 rounded px-1 py-0.5 text-[8px] text-gray-200"
        >
          <option value="1.2">Excellent</option>
          <option value="1.0">Good</option>
          <option value="0.8">Fair</option>
          <option value="0.6">Poor</option>
        </select>
      </div>
      <div>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Session notes (optional)"
          className="w-full bg-gray-800/60 border border-gray-600/40 rounded px-1.5 py-0.5 text-[8px] text-gray-200 placeholder-gray-600"
        />
      </div>
      <button
        onClick={handleSave}
        className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-[8px] py-1 rounded border border-cyan-500/30 transition-colors"
      >
        Save Outcome
      </button>
    </div>
  );
}

function SessionCard({
  session,
  isExpanded,
  onToggle,
  actualOutcome,
  onRecordOutcome,
}: {
  session: SessionSnapshot;
  isExpanded: boolean;
  onToggle: () => void;
  actualOutcome?: ActualSessionOutcome;
  onRecordOutcome?: (outcome: ActualSessionOutcome) => void;
}) {
  const exerciseCount = session.treatments.filter(t => t.type === 'exercise').length;
  const manualCount = session.treatments.filter(t => t.type === 'manual_therapy').length;
  const isRestSession = session.treatments.length === 0;
  const avgRomPct = session.romPredictions.length > 0
    ? (session.romPredictions.reduce((s, r) => s + (r.targetDegrees > 0 ? r.predictedDegrees / r.targetDegrees * 100 : 50), 0) / session.romPredictions.length).toFixed(0)
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
        {session.goalAchievementPct !== undefined && session.goalAchievementPct > 0 && (
          <span className={`text-[8px] font-medium ${
            session.goalAchievementPct >= 90 ? 'text-green-400' :
            session.goalAchievementPct >= 70 ? 'text-emerald-400' :
            session.goalAchievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {session.goalAchievementPct}%
          </span>
        )}
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
          {session.goalAchievementPct !== undefined && session.goalAchievementPct > 0 && (
            <div className="border-t border-green-700/20 pt-1 mt-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] text-gray-600 uppercase">Goal Achievement</span>
                <span className={`text-[8px] font-medium ${
                  session.goalAchievementPct >= 90 ? 'text-green-400' :
                  session.goalAchievementPct >= 70 ? 'text-emerald-400' :
                  session.goalAchievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {session.goalAchievementPct}%
                </span>
              </div>
              {session.goalDimensions && session.goalDimensions.length > 0 && (
                <div className="space-y-0.5">
                  {session.goalDimensions.filter(d => !d.dimension.startsWith('muscle_')).slice(0, 6).map(d => (
                    <div key={d.dimension} className="flex items-center gap-1 text-[7px]">
                      <span className="text-gray-500 truncate max-w-[40%]">{d.label}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-[3px] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            d.achievementPct >= 90 ? 'bg-green-500' :
                            d.achievementPct >= 70 ? 'bg-emerald-500' :
                            d.achievementPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(d.achievementPct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[6px] min-w-[24px] text-right ${
                        d.achievementPct >= 90 ? 'text-green-400' :
                        d.achievementPct >= 70 ? 'text-emerald-400' :
                        d.achievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {d.achievementPct}%
                        {d.trend === 'improving' ? '↑' : d.trend === 'worsening' ? '↓' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {session.recoveryPhaseLabel && (
            <div className="text-[7px] text-gray-500 mt-0.5">
              Phase: <span className="text-gray-300">{session.recoveryPhaseLabel}</span>
            </div>
          )}
          {session.goalDimensions && session.goalDimensions.length > 0 && session.treatments.length > 0 && (
            <div className="border-t border-violet-700/20 pt-1 mt-1">
              <div className="text-[7px] text-gray-600 uppercase mb-0.5 flex items-center gap-1">
                <Sparkles className="h-2 w-2 text-violet-400" />
                Rx Adaptation
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dosage</span>
                  <span className="text-cyan-400">{(session.doseResponseFraction * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Intensity</span>
                  <span className={session.painPrediction > 40 ? 'text-amber-400' : 'text-emerald-400'}>
                    {session.painPrediction > 50 ? 'Conservative' : session.painPrediction > 25 ? 'Moderate' : 'Progressive'}
                  </span>
                </div>
                {(() => {
                  const topGap = session.goalDimensions
                    ?.filter(d => d.achievementPct < 80 && !d.dimension.startsWith('muscle_'))
                    .sort((a, b) => a.achievementPct - b.achievementPct)[0];
                  return topGap ? (
                    <div className="col-span-2 flex justify-between">
                      <span className="text-gray-500">Priority</span>
                      <span className="text-violet-400 truncate max-w-[70%]">{topGap.label} ({topGap.achievementPct}%)</span>
                    </div>
                  ) : null;
                })()}
                {exerciseCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ex focus</span>
                    <span className="text-violet-300">
                      {session.treatments.filter(t => t.type === 'exercise').some(t => t.interventionType === 'strengthen') ? 'Strength' :
                       session.treatments.filter(t => t.type === 'exercise').some(t => t.interventionType === 'stretch') ? 'Mobility' : 'Function'}
                    </span>
                  </div>
                )}
                {manualCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">MT focus</span>
                    <span className="text-rose-300">
                      {session.painPrediction > 40 ? 'Grade I-II' : session.painPrediction > 20 ? 'Grade III-IV' : 'Grade IV-V'}
                    </span>
                  </div>
                )}
              </div>
              {session.treatments.length > 0 && (
                <div className="mt-1 pt-1 border-t border-violet-700/15 space-y-0.5">
                  <div className="text-[6px] text-gray-600 uppercase tracking-wider">Session Rx Preview</div>
                  {session.treatments.filter(t => t.type === 'exercise').slice(0, 3).map((t, i) => (
                    <div key={`ex-${i}`} className="flex items-center gap-1 text-[7px]">
                      <Dumbbell className="h-2 w-2 text-violet-400 shrink-0" />
                      <span className="text-gray-300 truncate flex-1">{t.name}</span>
                      <span className="text-gray-500 shrink-0">{t.dosageLabel}</span>
                    </div>
                  ))}
                  {session.treatments.filter(t => t.type === 'manual_therapy').slice(0, 2).map((t, i) => (
                    <div key={`mt-${i}`} className="flex items-center gap-1 text-[7px]">
                      <Hand className="h-2 w-2 text-rose-400 shrink-0" />
                      <span className="text-gray-300 truncate flex-1">{t.name}</span>
                      <span className="text-gray-500 shrink-0">{t.dosageLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {onRecordOutcome && (
            <ActualOutcomeInput
              session={session}
              existingOutcome={actualOutcome}
              onSave={onRecordOutcome}
            />
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

function PhaseTransitionCard({ phase }: { phase: TreatmentPhaseBlock }) {
  const [expanded, setExpanded] = useState(false);
  const st = phase.predictedStateAtTransition;

  return (
    <div className="border border-cyan-600/40 rounded bg-gradient-to-r from-cyan-950/30 to-gray-900/40 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-cyan-900/20 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-semibold text-cyan-300">{phase.phaseLabel} Phase</span>
          <Badge variant="outline" className="text-[7px] px-1 py-0 border-cyan-600/40 text-cyan-400">
            S{phase.startSession}–S{phase.endSession}
          </Badge>
          {phase.exercises.length > 0 && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-emerald-600/40 text-emerald-400">
              {phase.exercises.length} exercises
            </Badge>
          )}
          {phase.techniques.length > 0 && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-purple-600/40 text-purple-400">
              {phase.techniques.length} techniques
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          {st && (
            <div className="grid grid-cols-5 gap-1">
              <div className="bg-gray-800/40 rounded px-1.5 py-1 text-center">
                <div className="text-[7px] text-gray-500">Pain</div>
                <div className="text-[10px] font-bold text-red-400">{st.avgPain}/10</div>
              </div>
              <div className="bg-gray-800/40 rounded px-1.5 py-1 text-center">
                <div className="text-[7px] text-gray-500">ROM</div>
                <div className="text-[10px] font-bold text-blue-400">{st.avgRomPercent}%</div>
              </div>
              <div className="bg-gray-800/40 rounded px-1.5 py-1 text-center">
                <div className="text-[7px] text-gray-500">Sling</div>
                <div className="text-[10px] font-bold text-amber-400">{st.avgSlingIntegrity}%</div>
              </div>
              <div className="bg-gray-800/40 rounded px-1.5 py-1 text-center">
                <div className="text-[7px] text-gray-500">Comp</div>
                <div className="text-[10px] font-bold text-emerald-400">{st.avgCompensationResolution}%</div>
              </div>
              <div className="bg-gray-800/40 rounded px-1.5 py-1 text-center">
                <div className="text-[7px] text-gray-500">Risk</div>
                <div className={`text-[10px] font-bold ${st.riskScore >= 60 ? 'text-red-400' : st.riskScore >= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{st.riskScore}</div>
              </div>
            </div>
          )}

          {st?.correctionTrend && st.correctionTrend !== 'as_expected' && (
            <div className={`flex items-center gap-1 text-[8px] ${st.correctionTrend === 'faster' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {st.correctionTrend === 'faster' ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              Patient responding {st.correctionTrend} than predicted
            </div>
          )}

          {phase.phaseGoals && (
            <div className="text-[8px] text-gray-400 bg-gray-800/30 rounded px-1.5 py-1">
              <span className="text-cyan-400 font-medium">Goals: </span>{phase.phaseGoals}
            </div>
          )}

          {phase.designRationale && phase.phaseIndex > 0 && (
            <div className="text-[8px] text-gray-400 bg-gray-800/30 rounded px-1.5 py-1">
              <span className="text-purple-400 font-medium">AI Rationale: </span>{phase.designRationale}
            </div>
          )}

          {phase.safetyNotes && (
            <div className="text-[8px] text-amber-400/80 bg-amber-950/20 rounded px-1.5 py-1 flex items-start gap-1">
              <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              {phase.safetyNotes}
            </div>
          )}

          {phase.previousProgressionStages.length > 0 && phase.phaseIndex > 0 && (
            <div className="space-y-0.5">
              <div className="text-[7px] font-medium text-red-400 flex items-center gap-1">
                <TrendingDown className="h-2.5 w-2.5" /> Retiring from Previous Phase
              </div>
              {phase.previousProgressionStages.map((prev, pi) => (
                <div key={pi} className="text-[8px] text-gray-500 bg-red-950/10 rounded px-1.5 py-0.5">
                  <span className="text-red-400/70 line-through">{prev.exerciseName}</span>
                  {prev.stages.length > 0 && (
                    <span className="text-gray-600 ml-1 text-[7px]">
                      (reached: {prev.stages[prev.stages.length - 1]?.name ?? 'N/A'})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase.exercises.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[7px] font-medium text-emerald-400 flex items-center gap-1">
                <Dumbbell className="h-2.5 w-2.5" /> {phase.phaseIndex > 0 ? 'New Exercises Introduced' : 'Exercises'}
              </div>
              {phase.exercises.map((ex, ei) => (
                <div key={ei} className="text-[8px] text-gray-300 bg-emerald-950/10 rounded px-1.5 py-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-500">+</span>
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-gray-500">— {ex.targetSystem}</span>
                  </div>
                  {ex.progressionStages && ex.progressionStages.length > 0 && (
                    <div className="text-[7px] text-gray-600 ml-3 mt-0.5">
                      Stages: {ex.progressionStages.map(s => s.name).join(' → ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase.techniques.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[7px] font-medium text-purple-400 flex items-center gap-1">
                <Hand className="h-2.5 w-2.5" /> {phase.phaseIndex > 0 ? 'New Techniques Introduced' : 'Manual Therapy'}
              </div>
              {phase.techniques.map((t, ti) => (
                <div key={ti} className="text-[8px] text-gray-300 bg-purple-950/10 rounded px-1.5 py-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-purple-500">+</span>
                    <span className="font-medium">{t.name}</span>
                    <span className="text-gray-500">— {t.targetSystem}</span>
                  </div>
                  {t.progressionStages && t.progressionStages.length > 0 && (
                    <div className="text-[7px] text-gray-600 ml-3 mt-0.5">
                      Stages: {t.progressionStages.map(s => s.name).join(' → ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {st?.achievedMilestones && st.achievedMilestones.length > 0 && (
            <div className="text-[8px] text-amber-400 flex items-center gap-1 flex-wrap">
              <Trophy className="h-2.5 w-2.5 shrink-0" />
              {st.achievedMilestones.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecoveryGoalHeroCard({ goalProfile, totalWeeks, totalSessions, finalGoalGap, isLoading }: {
  goalProfile: RecoveryGoalProfile;
  totalWeeks?: number;
  totalSessions?: number;
  finalGoalGap?: GoalGapAnalysis | null;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-green-500/40 bg-gradient-to-b from-green-950/40 via-gray-900/60 to-gray-900/40 p-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-cyan-500/5 pointer-events-none" />
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500/20 overflow-hidden">
          <div className="h-full w-1/3 bg-green-400/60 animate-pulse rounded-full" />
        </div>
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-green-400" />
            <span className="text-[11px] font-bold text-green-300">Final Recovery Goal</span>
            {isLoading && (
              <span className="text-[9px] text-green-400/60 animate-pulse ml-1">AI refining...</span>
            )}
          </div>
          {finalGoalGap && (
            <div className={`text-sm font-bold ${
              finalGoalGap.overallAchievementPct >= 85 ? 'text-green-400' :
              finalGoalGap.overallAchievementPct >= 65 ? 'text-emerald-400' :
              finalGoalGap.overallAchievementPct >= 45 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {finalGoalGap.overallAchievementPct}%
            </div>
          )}
        </div>

        <div className="text-center mb-2.5">
          <div className="text-lg font-bold text-white">
            {finalGoalGap
              ? `${finalGoalGap.overallAchievementPct}% Recovery`
              : totalWeeks
                ? `${totalWeeks}-Week Plan`
                : `AI Recovery Targets`}
          </div>
          <div className="text-[10px] text-gray-400">
            {totalWeeks
              ? `Predicted in ~${totalWeeks} weeks${totalSessions ? ` (${totalSessions} sessions)` : ''}`
              : `Realistic targets for ${goalProfile.conditionName}`}
          </div>
        </div>

        {finalGoalGap && (
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${
                finalGoalGap.overallAchievementPct >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                finalGoalGap.overallAchievementPct >= 65 ? 'bg-gradient-to-r from-emerald-500 to-yellow-400' :
                finalGoalGap.overallAchievementPct >= 45 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
              }`}
              style={{ width: `${finalGoalGap.overallAchievementPct}%` }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-500">Pain</span>
            <span className="text-[10px] font-semibold text-green-400">≤ {goalProfile.painTarget}/100</span>
          </div>
          {goalProfile.riskScoreTarget !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-500">Risk</span>
              <span className="text-[10px] font-semibold text-emerald-400">≤ {goalProfile.riskScoreTarget}</span>
            </div>
          )}
          {goalProfile.strengthTarget !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-500">Strength</span>
              <span className="text-[10px] font-semibold text-cyan-400">≥ {goalProfile.strengthTarget}%</span>
            </div>
          )}
          {goalProfile.compensationResolutionTarget !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-500">Comp. Resolved</span>
              <span className="text-[10px] font-semibold text-emerald-400">≥ {goalProfile.compensationResolutionTarget}%</span>
            </div>
          )}
        </div>

        {goalProfile.romTargets && goalProfile.romTargets.length > 0 && (
          <div className="border-t border-gray-700/40 pt-1.5 mb-1.5">
            <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">ROM Targets</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {goalProfile.romTargets.slice(0, 6).map(rt => (
                <div key={rt.jointId} className="flex items-center justify-between text-[9px]">
                  <span className="text-gray-400 truncate max-w-[60%]">{rt.label || rt.jointId}</span>
                  <span className="text-cyan-400 font-medium">≥ {rt.targetDegrees}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {((goalProfile.slingTargets && goalProfile.slingTargets.length > 0) || (goalProfile.muscleTensionTargets && goalProfile.muscleTensionTargets.length > 0)) && (
          <div className="border-t border-gray-700/40 pt-1.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {goalProfile.slingTargets && goalProfile.slingTargets.length > 0 && (
                <div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Slings</div>
                  {goalProfile.slingTargets.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[9px]">
                      <span className="text-gray-400 truncate max-w-[60%]">{st.slingName}</span>
                      <span className="text-violet-400 font-medium">≥ {st.targetIntegrity}%</span>
                    </div>
                  ))}
                </div>
              )}
              {goalProfile.muscleTensionTargets && goalProfile.muscleTensionTargets.length > 0 && (
                <div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Muscles</div>
                  {goalProfile.muscleTensionTargets.slice(0, 4).map((mt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[9px]">
                      <span className="text-gray-400 truncate max-w-[55%]">{mt.muscleId.replace(/_/g, ' ')}</span>
                      <span className="text-emerald-400 font-medium">{mt.targetTensionMin}-{mt.targetTensionMax}%</span>
                    </div>
                  ))}
                  {goalProfile.muscleTensionTargets.length > 4 && (
                    <div className="text-[7px] text-gray-600">+{goalProfile.muscleTensionTargets.length - 4} more</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {goalProfile.functionalGoals && goalProfile.functionalGoals.length > 0 && (
          <div className="border-t border-gray-700/40 pt-1.5 mt-1">
            <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Functional Goals</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {goalProfile.functionalGoals.map((fg, idx) => (
                <div key={idx} className="flex items-center justify-between text-[9px]">
                  <span className="text-gray-400 truncate max-w-[60%]">{fg.label}</span>
                  <span className="text-emerald-400 font-medium">≥ {fg.targetValue} {fg.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {finalGoalGap && finalGoalGap.dimensions.length > 0 && (
          <div className="border-t border-gray-700/40 pt-1.5 mt-1.5">
            <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Predicted Final State</div>
            <div className="space-y-1">
              {finalGoalGap.dimensions.map(d => (
                <div key={d.dimension} className="flex items-center gap-2 text-[9px]">
                  <span className={`w-[35%] truncate ${
                    d.priority === 'high' ? 'text-red-400' :
                    d.priority === 'medium' ? 'text-amber-400' : 'text-gray-400'
                  }`}>{d.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        d.achievementPct >= 90 ? 'bg-green-500' :
                        d.achievementPct >= 70 ? 'bg-emerald-500' :
                        d.achievementPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(d.achievementPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-8 text-right">{d.achievementPct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
  actualOutcomes,
  onRecordOutcome,
  onGoalOverlayChange,
  clinicalState,
  aiGoalProfileOverride,
  aiGoalLoading: aiGoalLoadingProp,
  timelinePrescriptions,
  onSessionPrescriptionSelect,
}: {
  sessionTimeline: SessionTimelineResult;
  baseModelConfig: Record<string, Record<string, number>>;
  baseOverrides: Record<string, Partial<MuscleOverride>>;
  onApplyToSkeleton?: (payload: SessionApplyPayload) => void;
  activeCondition?: ConditionRecoveryProfile | null;
  modifiers?: PatientModifierProfile | null;
  actualOutcomes: ActualSessionOutcome[];
  onRecordOutcome: (outcome: ActualSessionOutcome) => void;
  onGoalOverlayChange?: (overlay: GoalOverlayData | null) => void;
  clinicalState?: ClinicalStateInput | null;
  aiGoalProfileOverride: RecoveryGoalProfile | null;
  aiGoalLoading?: boolean;
  timelinePrescriptions?: TimelinePrescriptionSummary | null;
  onSessionPrescriptionSelect?: (sessionNumber: number | null) => void;
}) {
  const [selectedSession, setSelectedSession] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'curve' | 'sessions' | 'modifications' | 'summary' | 'multidim' | 'funcmilestones' | 'healing' | 'phases' | 'goals' | 'rxplan' | null>('curve');
  const [expandedSessionCard, setExpandedSessionCard] = useState<number | null>(null);
  const [appliedSession, setAppliedSession] = useState<number | null>(null);
  const [goalOverlayEnabled, setGoalOverlayEnabled] = useState(false);
  const [rxDrivingSession, setRxDrivingSession] = useState<number | null>(null);
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

  const selectSession = useCallback((sessionNum: number) => {
    setSelectedSession(sessionNum);
    setRxDrivingSession(sessionNum);
    onSessionPrescriptionSelect?.(sessionNum);
  }, [onSessionPrescriptionSelect]);

  const handleSessionChange = useCallback((value: number[]) => {
    selectSession(value[0]);
  }, [selectSession]);

  const buildApplyPayload = useCallback((snap: SessionSnapshot): SessionApplyPayload => ({
    modelConfig: snap.modelConfig,
    overrides: snap.overrides,
    painMarkerUpdates: snap.painMarkerPredictions.map(p => ({ markerId: p.markerId, predictedSeverity: p.predictedSeverity })),
    posturalUpdates: snap.posturalPredictions.map(p => ({ sliderId: p.sliderId, predictedValue: p.predictedValue })),
    compensationUpdates: snap.compensationPredictions.map(c => ({ patternId: c.patternId, predictedSeverity: c.predictedSeverity, resolutionPercent: c.resolutionPercent })),
  }), []);

  const handleApply = useCallback(() => {
    if (!currentSnapshot || !onApplyToSkeleton) return;
    onApplyToSkeleton(buildApplyPayload(currentSnapshot));
    setAppliedSession(selectedSession);
  }, [currentSnapshot, onApplyToSkeleton, selectedSession, buildApplyPayload]);

  useEffect(() => {
    if (isPlaying && currentSnapshot && onApplyToSkeleton) {
      onApplyToSkeleton(buildApplyPayload(currentSnapshot));
      setAppliedSession(currentSnapshot.sessionNumber);
    }
  }, [isPlaying, currentSnapshot, onApplyToSkeleton, buildApplyPayload]);

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
      onApplyToSkeleton(buildApplyPayload(currentSnapshot));
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
      selectSession(sess);
    }, 600);
    playIntervalRef.current = interval;
  }, [isPlaying, selectedSession, sessionTimeline.totalSessions, currentSnapshot, onApplyToSkeleton, buildApplyPayload, selectSession]);

  const toggleSection = (section: 'curve' | 'sessions' | 'modifications' | 'summary' | 'multidim' | 'funcmilestones' | 'healing' | 'phases' | 'goals' | 'rxplan') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const riskDelta = sessionTimeline.startingState.riskScore - (currentSnapshot?.riskScore ?? sessionTimeline.startingState.riskScore);
  const slingDelta = (currentSnapshot?.slingIntegrity ?? sessionTimeline.startingState.slingIntegrity) - sessionTimeline.startingState.slingIntegrity;

  const lastSession = sessionTimeline.sessions.length > 0 ? sessionTimeline.sessions[sessionTimeline.sessions.length - 1] : null;

  const currentMods = sessionTimeline.modifications.filter(m => m.sessionNumber === selectedSession);
  const nearbyMods = sessionTimeline.modifications.filter(m =>
    Math.abs(m.sessionNumber - selectedSession) <= 2 && m.sessionNumber !== selectedSession
  );

  const goalProfile = aiGoalProfileOverride ?? null;

  const currentGoalGap = useMemo<GoalGapAnalysis | null>(() => {
    if (!goalProfile || !currentSnapshot) return null;
    const prevSnap = selectedSession > 1
      ? sessionTimeline.sessions.find(s => s.sessionNumber === selectedSession - 1) ?? null
      : null;
    return computeGoalGap(goalProfile, currentSnapshot, prevSnap);
  }, [goalProfile, currentSnapshot, selectedSession, sessionTimeline.sessions]);

  const finalGoalGap = useMemo<GoalGapAnalysis | null>(() => {
    if (!goalProfile || !lastSession) return null;
    const prevLast = sessionTimeline.sessions.length > 1
      ? sessionTimeline.sessions[sessionTimeline.sessions.length - 2]
      : null;
    return computeGoalGap(goalProfile, lastSession, prevLast);
  }, [goalProfile, lastSession, sessionTimeline.sessions]);

  const goalPlateauWarning = useMemo(() => {
    if (!currentSnapshot || !currentSnapshot.goalDimensions) return null;
    const stalled = currentSnapshot.goalDimensions.filter(
      d => d.trend === 'stalled' && d.achievementPct < 80 && d.priority === 'high'
    );
    if (stalled.length === 0) return null;
    return stalled;
  }, [currentSnapshot]);

  useEffect(() => {
    if (!onGoalOverlayChange) return;
    if (!goalOverlayEnabled || !currentGoalGap || !goalProfile) {
      onGoalOverlayChange(null);
      return;
    }
    const painBones: string[] = clinicalState?.painMarkers?.map(pm => pm.boneName) ?? [];
    const uniquePainBones = painBones.length > 0 ? Array.from(new Set(painBones)) : ['Spine1_M'];
    const painTargets = currentSnapshot
      ? uniquePainBones.map(boneName => ({
          boneName,
          targetIntensity: goalProfile.painTarget,
          currentIntensity: currentSnapshot.painPrediction,
        }))
      : undefined;

    const muscleTargets = goalProfile.muscleTensionTargets?.map(mt => {
      const sessionPred = currentSnapshot?.muscleStatePredictions?.find(m =>
        m.muscleId.toLowerCase().includes(mt.muscleId.toLowerCase()) ||
        mt.muscleId.toLowerCase().includes(m.muscleId.toLowerCase())
      );
      const midTarget = (mt.targetTensionMin + mt.targetTensionMax) / 2;
      return {
        groupId: mt.muscleId,
        targetTension: midTarget,
        currentTension: sessionPred?.predictedTension ?? midTarget,
      };
    });
    const ROM_JOINT_BONE_MAP: Record<string, string> = {
      shoulder_flexion: 'UpperArm_L', shoulder_abduction: 'UpperArm_L',
      shoulder_er: 'UpperArm_L', shoulder_ir: 'UpperArm_L',
      elbow_flexion: 'LowerArm_L',
      hip_flexion: 'UpperLeg_L', hip_abduction: 'UpperLeg_L',
      hip_er: 'UpperLeg_L', hip_ir: 'UpperLeg_L',
      knee_flexion: 'LowerLeg_L', knee_extension: 'LowerLeg_L',
      ankle_dorsiflexion: 'Foot_L', ankle_plantarflexion: 'Foot_L',
      cervical_flexion: 'Neck_M', cervical_rotation: 'Neck_M',
      lumbar_flexion: 'Spine1_M', lumbar_extension: 'Spine1_M',
      thoracic_rotation: 'Spine2_M',
    };

    const romTargets = currentSnapshot && goalProfile.romTargets.length > 0
      ? goalProfile.romTargets.map(rt => {
          const pred = currentSnapshot.romPredictions.find(r => r.jointId === rt.jointId);
          return {
            boneName: ROM_JOINT_BONE_MAP[rt.jointId] ?? 'Spine1_M',
            targetDegrees: rt.targetDegrees,
            currentDegrees: pred?.predictedDegrees ?? 0,
            label: rt.label,
          };
        }).filter(rt => rt.currentDegrees < rt.targetDegrees * 0.95)
      : undefined;

    const postureTargets = goalProfile.postureTargets.length > 0
      ? goalProfile.postureTargets.map(pt => {
          const sessionNum = currentSnapshot?.sessionNumber ?? 1;
          const totalSessions = sessionTimeline.sessions.length || 12;
          const progressRatio = Math.min(sessionNum / totalSessions, 1);
          const initialDeviation = 15;
          const currentAngle = pt.targetAngle + initialDeviation * (1 - progressRatio * 0.7);
          return {
            boneName: pt.boneName,
            targetAngle: pt.targetAngle,
            currentAngle: Math.round(currentAngle * 10) / 10,
            axis: pt.axis,
          };
        })
      : undefined;

    onGoalOverlayChange({
      enabled: true,
      painTargets,
      muscleTargets,
      romTargets,
      postureTargets,
      overallPct: currentGoalGap.overallAchievementPct,
    });
  }, [goalOverlayEnabled, currentGoalGap, goalProfile, currentSnapshot, onGoalOverlayChange, clinicalState]);

  return (
    <div className="flex flex-col gap-2 text-[10px] max-h-full overflow-y-auto custom-scrollbar">
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

      {sessionTimeline.correctionFactors && (
        <CorrectionTrendBadge factors={sessionTimeline.correctionFactors} />
      )}

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

      {goalProfile && (
        <RecoveryGoalHeroCard
          goalProfile={goalProfile}
          totalWeeks={Math.round(sessionTimeline.totalDays / 7)}
          totalSessions={sessionTimeline.totalSessions}
          finalGoalGap={finalGoalGap}
          isLoading={aiGoalLoadingProp}
        />
      )}
      {!goalProfile && aiGoalLoadingProp && (
        <div className="rounded-lg border border-green-500/20 bg-gray-900/40 p-4 text-center">
          <RefreshCw className="h-5 w-5 text-green-400 animate-spin mx-auto mb-2" />
          <span className="text-[10px] text-gray-400">Generating recovery goals...</span>
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
          onSessionClick={selectSession}
        />

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => selectSession(Math.max(1, selectedSession - 1))}
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
            onClick={() => selectSession(Math.min(sessionTimeline.totalSessions, selectedSession + 1))}
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

      {currentSnapshot && currentSnapshot.goalAchievementPct !== undefined && currentSnapshot.goalAchievementPct > 0 && (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded p-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-green-400 font-medium flex items-center gap-1">
              <Target className="h-3 w-3" />
              Recovery Goal Progress
            </span>
            <span className={`text-[10px] font-bold ${
              currentSnapshot.goalAchievementPct >= 90 ? 'text-green-400' :
              currentSnapshot.goalAchievementPct >= 70 ? 'text-emerald-400' :
              currentSnapshot.goalAchievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {currentSnapshot.goalAchievementPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                currentSnapshot.goalAchievementPct >= 90 ? 'bg-green-500' :
                currentSnapshot.goalAchievementPct >= 70 ? 'bg-emerald-500' :
                currentSnapshot.goalAchievementPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${currentSnapshot.goalAchievementPct}%` }}
            />
          </div>
          {currentSnapshot.goalDimensions && currentSnapshot.goalDimensions.filter(d => d.priority === 'high').length > 0 && (
            <div className="mt-1 space-y-0.5">
              {currentSnapshot.goalDimensions.filter(d => d.priority === 'high').slice(0, 3).map(d => (
                <div key={d.dimension} className="flex items-center justify-between text-[7px]">
                  <span className="text-red-400 truncate max-w-[60%]">{d.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{d.achievementPct}%</span>
                    <span className={d.trend === 'improving' ? 'text-green-500' : d.trend === 'worsening' ? 'text-red-500' : 'text-gray-600'}>
                      {d.trend === 'improving' ? '↑' : d.trend === 'worsening' ? '↓' : '→'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              onSessionClick={selectSession}
              goalProfile={goalProfile}
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
                onSessionClick={selectSession}
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
            {(() => {
              const visibleSessions = sessionTimeline.sessions
                .filter(s => s.sessionNumber >= Math.max(0, selectedSession - 2) && s.sessionNumber <= selectedSession + 3);
              const phases = sessionTimeline.treatmentPhases ?? [];
              const elements: Array<{ type: 'session' | 'phase'; key: string; session?: SessionSnapshot; phase?: TreatmentPhaseBlock }> = [];

              for (const s of visibleSessions) {
                const matchingPhase = phases.find(p => p.phaseIndex > 0 && p.startSession === s.sessionNumber);
                if (matchingPhase) {
                  elements.push({ type: 'phase', key: `phase-${matchingPhase.phaseIndex}`, phase: matchingPhase });
                }
                elements.push({ type: 'session', key: `session-${s.sessionNumber}`, session: s });
              }

              return elements.map(el => {
                if (el.type === 'phase' && el.phase) {
                  return <PhaseTransitionCard key={el.key} phase={el.phase} />;
                }
                if (el.type === 'session' && el.session) {
                  return (
                    <SessionCard
                      key={el.key}
                      session={el.session}
                      isExpanded={expandedSessionCard === el.session.sessionNumber}
                      onToggle={() => setExpandedSessionCard(expandedSessionCard === el.session!.sessionNumber ? null : el.session!.sessionNumber)}
                      actualOutcome={actualOutcomes.find(o => o.sessionNumber === el.session!.sessionNumber)}
                      onRecordOutcome={el.session.sessionNumber <= selectedSession ? onRecordOutcome : undefined}
                    />
                  );
                }
                return null;
              });
            })()}
            {sessionTimeline.sessions.length > 6 && (
              <div className="text-[8px] text-gray-600 text-center pt-1">
                Showing sessions near S{selectedSession}. Use scrubber to navigate.
              </div>
            )}
          </div>
        )}
      </div>

      {sessionTimeline.treatmentPhases && sessionTimeline.treatmentPhases.length > 1 && (
        <div className="border border-cyan-700/30 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('phases')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-cyan-950/20 hover:bg-cyan-950/30 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Treatment Phases ({sessionTimeline.treatmentPhases.length})
            </span>
            {expandedSection === 'phases' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'phases' && (
            <div className="p-2 bg-gray-900/30 space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
              {sessionTimeline.treatmentPhases.map(phase => (
                <PhaseTransitionCard key={phase.phaseIndex} phase={phase} />
              ))}
            </div>
          )}
        </div>
      )}

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
                    onClick={() => selectSession(mod.sessionNumber)}
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

      {goalProfile && (
        <div className="border border-green-700/30 rounded overflow-hidden">
          <button
            onClick={() => toggleSection('goals')}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-green-950/20 hover:bg-green-950/30 text-gray-300"
          >
            <span className="text-[9px] font-medium flex items-center gap-1">
              <Target className="h-3 w-3 text-green-400" />
              Recovery Goals
              {currentGoalGap && (
                <Badge variant="outline" className={`text-[7px] px-1 py-0 ml-1 ${
                  currentGoalGap.overallAchievementPct >= 90 ? 'border-green-500 text-green-400' :
                  currentGoalGap.overallAchievementPct >= 70 ? 'border-emerald-500 text-emerald-400' :
                  currentGoalGap.overallAchievementPct >= 50 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'
                }`}>
                  {currentGoalGap.overallAchievementPct}%
                </Badge>
              )}
            </span>
            {expandedSection === 'goals' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'goals' && (
            <div className="p-2 bg-gray-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">End-State Targets</span>
                <button
                  onClick={() => setGoalOverlayEnabled(!goalOverlayEnabled)}
                  className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors ${
                    goalOverlayEnabled
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {goalOverlayEnabled ? '3D On' : '3D Off'}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-gray-400">Pain Target</span>
                  <span className="text-green-400 font-medium">≤ {goalProfile.painTarget}/100</span>
                </div>
                {goalProfile.romTargets && goalProfile.romTargets.length > 0 && (
                  <div className="space-y-0.5">
                    {goalProfile.romTargets.slice(0, 4).map(rt => (
                      <div key={rt.jointId} className="flex items-center justify-between text-[8px]">
                        <span className="text-gray-400 truncate max-w-[55%]">{rt.jointId} ROM</span>
                        <span className="text-cyan-400 font-medium">≥ {rt.targetDegrees}°</span>
                      </div>
                    ))}
                    {goalProfile.romTargets.length > 4 && (
                      <div className="text-[7px] text-gray-600">+{goalProfile.romTargets.length - 4} more</div>
                    )}
                  </div>
                )}
                {goalProfile.riskScoreTarget !== undefined && (
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">Risk Score</span>
                    <span className="text-emerald-400 font-medium">≤ {goalProfile.riskScoreTarget}</span>
                  </div>
                )}
                {goalProfile.strengthTarget !== undefined && (
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">Strength</span>
                    <span className="text-cyan-400 font-medium">≥ {goalProfile.strengthTarget}%</span>
                  </div>
                )}
                {goalProfile.jointStressTarget !== undefined && (
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">Joint Stress</span>
                    <span className="text-amber-400 font-medium">≤ {goalProfile.jointStressTarget}</span>
                  </div>
                )}
                {goalProfile.compensationResolutionTarget !== undefined && (
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">Compensation Resolved</span>
                    <span className="text-emerald-400 font-medium">≥ {goalProfile.compensationResolutionTarget}%</span>
                  </div>
                )}
                {goalProfile.postureTargets && goalProfile.postureTargets.length > 0 && (
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-400">Posture Corrections</span>
                    <span className="text-pink-400 font-medium">{goalProfile.postureTargets.length} targets</span>
                  </div>
                )}
                {goalProfile.functionalGoals && goalProfile.functionalGoals.length > 0 && (
                  <div className="space-y-0.5">
                    {goalProfile.functionalGoals.slice(0, 3).map((fg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[8px]">
                        <span className="text-gray-400 truncate max-w-[55%]">{fg.label}</span>
                        <span className="text-emerald-400 font-medium">≥ {fg.targetValue} {fg.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
                {goalProfile.muscleTensionTargets && goalProfile.muscleTensionTargets.length > 0 && (
                  <div className="space-y-0.5">
                    {goalProfile.muscleTensionTargets.slice(0, 4).map((mt, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[8px]">
                        <span className="text-gray-400 truncate max-w-[55%]">{mt.muscleId.replace(/_/g, ' ')}</span>
                        <span className="text-emerald-400 font-medium">{mt.targetTensionMin}-{mt.targetTensionMax}%</span>
                      </div>
                    ))}
                    {goalProfile.muscleTensionTargets.length > 4 && (
                      <div className="text-[7px] text-gray-600">+{goalProfile.muscleTensionTargets.length - 4} more</div>
                    )}
                  </div>
                )}
                {goalProfile.slingTargets && goalProfile.slingTargets.length > 0 && (
                  <div className="space-y-0.5">
                    {goalProfile.slingTargets.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[8px]">
                        <span className="text-gray-400 truncate max-w-[55%]">{st.slingName}</span>
                        <span className="text-violet-400 font-medium">≥ {st.targetIntegrity}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentGoalGap && (
                <div className="border-t border-gray-700/30 pt-1.5 space-y-1">
                  <div className="text-[8px] text-gray-500 uppercase tracking-wider">Gap Analysis (S{selectedSession})</div>
                  {currentGoalGap.dimensions.map(d => (
                    <div key={d.dimension} className="flex items-center justify-between text-[8px]">
                      <span className={`truncate max-w-[50%] ${
                        d.priority === 'high' ? 'text-red-400' :
                        d.priority === 'medium' ? 'text-amber-400' : 'text-gray-400'
                      }`}>{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.achievementPct >= 90 ? 'bg-green-500' :
                              d.achievementPct >= 70 ? 'bg-emerald-500' :
                              d.achievementPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${d.achievementPct}%` }}
                          />
                        </div>
                        <span className="text-gray-500 w-6 text-right">{d.achievementPct}%</span>
                        <span className={`text-[7px] ${
                          d.trend === 'improving' ? 'text-green-500' :
                          d.trend === 'worsening' ? 'text-red-500' : 'text-gray-600'
                        }`}>
                          {d.trend === 'improving' ? '↑' : d.trend === 'worsening' ? '↓' : '→'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {goalPlateauWarning && goalPlateauWarning.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded p-1.5">
                  <div className="flex items-center gap-1 text-[8px] text-amber-400 font-medium mb-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    Plateau Warning
                  </div>
                  {goalPlateauWarning.map(d => (
                    <div key={d.dimension} className="text-[7px] text-amber-300/80">
                      {d.label}: stalled at {d.achievementPct}% — consider treatment adjustment
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {timelinePrescriptions && (
        <div className="bg-gray-800/30 rounded border border-gray-700/30 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-2 text-[9px] font-medium text-gray-300 hover:bg-gray-700/20"
            onClick={() => setExpandedSection(expandedSection === 'rxplan' ? null : 'rxplan')}
          >
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="h-3 w-3 text-violet-400" />
              Rx Evolution
              <Badge variant="outline" className="text-[7px] px-1 py-0 border-violet-500/40 text-violet-400 ml-1">
                {timelinePrescriptions.exerciseProgression.length} Ex + {timelinePrescriptions.manualProgression.length} MT
              </Badge>
            </span>
            {expandedSection === 'rxplan' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expandedSection === 'rxplan' && (
            <div className="p-2 bg-gray-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">Treatment Progression</span>
                {rxDrivingSession !== null ? (
                  <button
                    onClick={() => { setRxDrivingSession(null); onSessionPrescriptionSelect?.(null); }}
                    className="text-[7px] px-1.5 py-0.5 rounded border bg-violet-500/20 border-violet-500/50 text-violet-400"
                  >
                    Driving S{rxDrivingSession} — Clear
                  </button>
                ) : (
                  <span className="text-[7px] text-gray-600">Click session to drive Exercise/MT tabs</span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-[8px] text-gray-400 font-medium flex items-center gap-1">
                  <Dumbbell className="h-3 w-3 text-cyan-400" /> Exercise Progression
                </div>
                {timelinePrescriptions.exerciseProgression.length === 0 ? (
                  <div className="text-[8px] text-gray-600 italic">No exercises prescribed</div>
                ) : (
                  <div className="space-y-1">
                    {timelinePrescriptions.exerciseProgression.map(ep => (
                      <div key={ep.exerciseId} className="bg-gray-800/50 rounded border border-gray-700/30 p-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-gray-200 font-medium truncate max-w-[60%]">{ep.exerciseName}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[6px] px-1 py-0 ${
                              ep.status === 'active' ? 'border-green-500/40 text-green-400' : 'border-gray-600/40 text-gray-500'
                            }`}>
                              {ep.status === 'active' ? 'Active' : 'Discontinued'}
                            </Badge>
                            <span className="text-[7px] text-gray-500">S{ep.firstSession}–S{ep.lastSession}</span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 items-center">
                          {sessionTimeline.sessions.map(s => {
                            const range = ep.sessionRanges.find(r => s.sessionNumber >= r.startSession && s.sessionNumber <= r.endSession);
                            if (!range) return (
                              <div key={s.sessionNumber} className="h-2 flex-1 rounded-sm bg-gray-800/80" title={`S${s.sessionNumber}: not prescribed`} />
                            );
                            const isNew = range.startSession === s.sessionNumber && s.sessionNumber === ep.firstSession;
                            const isProgressed = range.startSession === s.sessionNumber && s.sessionNumber > ep.firstSession;
                            return (
                              <div
                                key={s.sessionNumber}
                                className={`h-2 flex-1 rounded-sm cursor-pointer transition-all ${
                                  range.dosageLabel === 'light' ? 'bg-blue-400/60' :
                                  range.dosageLabel === 'light-moderate' ? 'bg-cyan-400/60' :
                                  range.dosageLabel === 'moderate' ? 'bg-green-400/60' :
                                  range.dosageLabel === 'progressive' ? 'bg-amber-400/60' : 'bg-violet-400/60'
                                } ${rxDrivingSession === s.sessionNumber ? 'ring-1 ring-violet-400 scale-y-150' : 'hover:scale-y-125'}`}
                                title={`S${s.sessionNumber}: ${range.dosageLabel}${isNew ? ' (New)' : isProgressed ? ' (Progressed)' : ''}`}
                                onClick={() => { setRxDrivingSession(s.sessionNumber); onSessionPrescriptionSelect?.(s.sessionNumber); }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[6px] text-gray-600">{ep.category}</span>
                          <span className="text-[6px] text-gray-700">|</span>
                          <span className="text-[6px] text-gray-600">{ep.bodyParts.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-[8px] text-gray-400 font-medium flex items-center gap-1">
                  <Hand className="h-3 w-3 text-pink-400" /> Manual Therapy Progression
                </div>
                {timelinePrescriptions.manualProgression.length === 0 ? (
                  <div className="text-[8px] text-gray-600 italic">No manual therapy prescribed</div>
                ) : (
                  <div className="space-y-1">
                    {timelinePrescriptions.manualProgression.map(mp => (
                      <div key={mp.exerciseId} className="bg-gray-800/50 rounded border border-gray-700/30 p-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-gray-200 font-medium truncate max-w-[60%]">{mp.techniqueName}</span>
                          <span className="text-[7px] text-gray-500">S{mp.firstSession}–S{mp.lastSession}</span>
                        </div>
                        <div className="flex gap-0.5 items-center">
                          {sessionTimeline.sessions.map(s => {
                            const isInRange = s.sessionNumber >= mp.firstSession && s.sessionNumber <= mp.lastSession;
                            const gradeEntry = mp.gradeProgression.find((g, i) => {
                              const next = mp.gradeProgression[i + 1];
                              return s.sessionNumber >= g.session && (!next || s.sessionNumber < next.session);
                            });
                            if (!isInRange || !gradeEntry) return (
                              <div key={s.sessionNumber} className="h-2 flex-1 rounded-sm bg-gray-800/80" title={`S${s.sessionNumber}: not prescribed`} />
                            );
                            const gradeNum = gradeEntry.maxGrade.replace('Grade ', '');
                            return (
                              <div
                                key={s.sessionNumber}
                                className={`h-2 flex-1 rounded-sm cursor-pointer transition-all ${
                                  gradeNum.includes('I') && !gradeNum.includes('II') ? 'bg-blue-400/60' :
                                  gradeNum === 'II' ? 'bg-cyan-400/60' :
                                  gradeNum.includes('III') ? 'bg-amber-400/60' : 'bg-red-400/60'
                                } ${rxDrivingSession === s.sessionNumber ? 'ring-1 ring-violet-400 scale-y-150' : 'hover:scale-y-125'}`}
                                title={`S${s.sessionNumber}: ${gradeEntry.minGrade}–${gradeEntry.maxGrade}`}
                                onClick={() => { setRxDrivingSession(s.sessionNumber); onSessionPrescriptionSelect?.(s.sessionNumber); }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {mp.gradeProgression.map((g, i) => (
                            <Badge key={i} variant="outline" className={`text-[6px] px-1 py-0 ${
                              i === mp.gradeProgression.length - 1 ? 'border-emerald-500/40 text-emerald-400' : 'border-gray-600/40 text-gray-500'
                            }`}>
                              S{g.session}: {g.minGrade}–{g.maxGrade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {timelinePrescriptions.sessionChanges.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[8px] text-gray-400 font-medium flex items-center gap-1">
                    <ListOrdered className="h-3 w-3 text-violet-400" /> Per-Session Changes
                  </div>
                  <div className="space-y-0.5">
                    {timelinePrescriptions.sessionChanges.map(sc => {
                      const hasChanges = sc.newExercises.length > 0 || sc.progressedExercises.length > 0 || sc.discontinuedExercises.length > 0 || sc.dosageChange || sc.gradeChange;
                      if (!hasChanges) return null;
                      return (
                        <div
                          key={sc.sessionNumber}
                          className={`flex items-start gap-1.5 text-[7px] bg-gray-800/40 rounded px-1.5 py-0.5 cursor-pointer ${rxDrivingSession === sc.sessionNumber ? 'ring-1 ring-violet-500/60' : 'hover:bg-gray-800/60'}`}
                          onClick={() => selectSession(sc.sessionNumber)}
                        >
                          <span className="text-gray-400 font-medium shrink-0 w-4">S{sc.sessionNumber}</span>
                          <div className="flex flex-wrap gap-1 items-center">
                            {sc.newExercises.length > 0 && (
                              <Badge variant="outline" className="text-[6px] px-1 py-0 border-green-500/40 text-green-400">
                                +{sc.newExercises.length} New
                              </Badge>
                            )}
                            {sc.progressedExercises.length > 0 && (
                              <Badge variant="outline" className="text-[6px] px-1 py-0 border-amber-500/40 text-amber-400">
                                ↑{sc.progressedExercises.length} Progressed
                              </Badge>
                            )}
                            {sc.discontinuedExercises.length > 0 && (
                              <Badge variant="outline" className="text-[6px] px-1 py-0 border-red-500/40 text-red-400">
                                −{sc.discontinuedExercises.length} Disc.
                              </Badge>
                            )}
                            {sc.dosageChange && (
                              <span className="text-cyan-400/70">dose: {sc.dosageChange}</span>
                            )}
                            {sc.gradeChange && (
                              <span className="text-pink-400/70">grade: {sc.gradeChange}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700/30 pt-1.5">
                <div className="text-[7px] text-gray-600 mb-1">Dosage Legend</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Light', color: 'bg-blue-400/60' },
                    { label: 'Light-Mod', color: 'bg-cyan-400/60' },
                    { label: 'Moderate', color: 'bg-green-400/60' },
                    { label: 'Progressive', color: 'bg-amber-400/60' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-0.5">
                      <div className={`w-2 h-2 rounded-sm ${l.color}`} />
                      <span className="text-[6px] text-gray-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                value={`${(sessionTimeline.baseline.romBaselines.reduce((s, r) => s + (r.targetDegrees > 0 ? r.predictedDegrees / r.targetDegrees * 100 : 50), 0) / sessionTimeline.baseline.romBaselines.length).toFixed(0)}%`}
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
                value={`${(lastSession.romPredictions.reduce((s, r) => s + (r.targetDegrees > 0 ? r.predictedDegrees / r.targetDegrees * 100 : 50), 0) / lastSession.romPredictions.length).toFixed(0)}%`}
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
                const baseRom = sessionTimeline.baseline.romBaselines.reduce((s, r) => s + (r.targetDegrees > 0 ? r.predictedDegrees / r.targetDegrees * 100 : 50), 0) / sessionTimeline.baseline.romBaselines.length;
                const finalRom = lastSession.romPredictions.reduce((s, r) => s + (r.targetDegrees > 0 ? r.predictedDegrees / r.targetDegrees * 100 : 50), 0) / lastSession.romPredictions.length;
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
        {lastSession && lastSession.goalAchievementPct !== undefined && lastSession.goalAchievementPct > 0 && (
          <div className="mt-1 pt-1 border-t border-green-700/20">
            <div className="text-[7px] text-gray-600 uppercase mb-0.5">Goal Achievement (Final)</div>
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-gray-400">Overall Goal</span>
              <span className={`font-medium ${
                lastSession.goalAchievementPct >= 90 ? 'text-green-400' :
                lastSession.goalAchievementPct >= 70 ? 'text-emerald-400' :
                lastSession.goalAchievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {lastSession.goalAchievementPct}%
              </span>
            </div>
            {lastSession.goalDimensions && lastSession.goalDimensions.length > 0 && (
              <div className="space-y-0.5 mt-0.5">
                {lastSession.goalDimensions.map(d => (
                  <div key={d.dimension} className="flex items-center justify-between text-[7px]">
                    <span className="text-gray-500 truncate max-w-[55%]">{d.label}</span>
                    <span className={
                      d.achievementPct >= 90 ? 'text-green-400' :
                      d.achievementPct >= 70 ? 'text-emerald-400' :
                      d.achievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }>
                      {d.achievementPct}%
                      {d.trend === 'improving' ? ' ↑' : d.trend === 'worsening' ? ' ↓' : d.trend === 'stalled' ? ' →' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
  onGoalOverlayChange,
  onGoalProfileChange,
  onSessionPrescriptionSelect,
  scarSummary,
  chainTensionAverages,
  postureMeasurements,
  currentRom,
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
  const [actualOutcomes, setActualOutcomes] = useState<ActualSessionOutcome[]>([]);

  const handleRecordOutcome = useCallback((outcome: ActualSessionOutcome) => {
    setActualOutcomes(prev => {
      const filtered = prev.filter(o => o.sessionNumber !== outcome.sessionNumber);
      return [...filtered, outcome].sort((a, b) => a.sessionNumber - b.sessionNumber);
    });
  }, []);

  const activeCondition = useMemo(() => {
    if (conditionOverrideId) {
      return CONDITION_RECOVERY_PROFILES.find(p => p.conditionId === conditionOverrideId) ?? detectedCondition;
    }
    return detectedCondition;
  }, [conditionOverrideId, detectedCondition]);

  const clinicalStateForGoals = useMemo<ClinicalStateInput | null>(() => {
    const state: ClinicalStateInput = {};
    if (painMarkers && painMarkers.length > 0) {
      state.painMarkers = painMarkers.map(pm => ({
        boneName: mapLabelToBone(pm.label),
        intensity: (pm.severity ?? 5) * 10,
      }));
    }
    if (baseOverrides && Object.keys(baseOverrides).length > 0) {
      state.muscleStates = Object.entries(baseOverrides)
        .filter(([, ov]) => ov.tensionOffset !== undefined)
        .map(([muscleId, ov]) => ({
          muscleId,
          tension: 50 + (ov.tensionOffset ?? 0),
        }));
    }
    if (extractionResult) {
      if (extractionResult.functionalLimitations && extractionResult.functionalLimitations.length > 0) {
        state.compensationPatterns = extractionResult.functionalLimitations.map(fl => fl.limitation);
      }
    }
    if (structuredReasoning) {
      const modLabels = structuredReasoning.modifiers
        ?.filter(m => m.label?.toLowerCase().includes('postur') || m.label?.toLowerCase().includes('compensat'))
        .map(m => m.label) ?? [];
      if (modLabels.length > 0) {
        state.posturalDeviations = modLabels;
      }
    }
    if (scarSummary && scarSummary.length > 0) {
      state.scarSummary = scarSummary;
    }
    if (chainTensionAverages && chainTensionAverages.length > 0) {
      state.chainTensionAverages = chainTensionAverages;
    }
    if (postureMeasurements) {
      state.postureMeasurements = postureMeasurements;
    }
    if (currentRom && currentRom.length > 0) {
      state.currentRom = currentRom;
    }
    if (activeCondition && activeCondition.phases.length > 0) {
      const chronicity = patientFactors?.chronicity ?? 'unknown';
      const estimatedWeeks: Record<string, number> = {
        acute: 2,
        subacute: 6,
        chronic: 16,
        recurrent: 12,
        unknown: 0,
      };
      const weeksElapsed = estimatedWeeks[chronicity] ?? 0;
      let cumulativeWeeks = 0;
      let derivedPhase = 0;
      for (let i = 0; i < activeCondition.phases.length; i++) {
        const avgDuration = (activeCondition.phases[i].durationWeeksMin + activeCondition.phases[i].durationWeeksMax) / 2;
        cumulativeWeeks += avgDuration;
        if (weeksElapsed >= cumulativeWeeks && i < activeCondition.phases.length - 1) {
          derivedPhase = i + 1;
        }
      }
      state.activePhaseIndex = derivedPhase;
    }

    const hasData = state.painMarkers || state.muscleStates || state.compensationPatterns
      || state.posturalDeviations || state.scarSummary || state.chainTensionAverages
      || state.postureMeasurements || state.currentRom;
    return hasData ? state : null;
  }, [painMarkers, baseOverrides, extractionResult, structuredReasoning, scarSummary, chainTensionAverages, postureMeasurements, currentRom, activeCondition, patientFactors]);

  const modifiers = useMemo(() => computePatientModifiers(patientFactors, activeCondition), [patientFactors, activeCondition]);

  const adjustedProfile = useMemo(() => {
    if (!activeCondition) return null;
    return adjustProfileForPatient(activeCondition, modifiers);
  }, [activeCondition, modifiers]);

  const [aiGoalProfile, setAiGoalProfile] = useState<RecoveryGoalProfile | null>(null);
  const [aiGoalLoading, setAiGoalLoading] = useState(false);
  const aiGoalAbortRef = useRef<AbortController | null>(null);
  const aiGoalCacheRef = useRef<{ key: string; profile: RecoveryGoalProfile } | null>(null);
  const aiGoalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conditionNameForAi = useMemo(() => {
    if (structuredReasoning && structuredReasoning.hypotheses.length > 0) {
      return structuredReasoning.hypotheses[0].condition;
    }
    return null;
  }, [structuredReasoning]);

  const goalEffectKey = useMemo(() => {
    const quantize = (v: number, step: number) => Math.round(v / step) * step;
    return JSON.stringify({
      cn: conditionNameForAi ?? '',
      pf: patientFactors,
      pm: clinicalStateForGoals ? {
        p: clinicalStateForGoals.painMarkers?.map(m => `${m.boneName}:${quantize(m.intensity, 5)}`).sort() ?? [],
        m: clinicalStateForGoals.muscleStates?.map(s => `${s.muscleId}:${quantize(s.tension, 5)}`).sort() ?? [],
        c: [...(clinicalStateForGoals.compensationPatterns ?? [])].sort(),
        d: [...(clinicalStateForGoals.posturalDeviations ?? [])].sort(),
      } : null,
      sr: structuredReasoning?.hypotheses?.map(h => `${h.condition}:${h.likelihood}`).sort() ?? [],
      er: extractionResult ? [
        extractionResult.bodyRegions?.join(',') ?? '',
        extractionResult.symptoms?.join(',') ?? '',
        extractionResult.duration ?? '',
        extractionResult.mechanism ?? '',
      ].join('|') : '',
    });
  }, [conditionNameForAi, patientFactors, clinicalStateForGoals, structuredReasoning, extractionResult]);

  useEffect(() => {
    if (!conditionNameForAi) {
      setAiGoalProfile(null);
      setAiGoalLoading(false);
      return;
    }

    const quantize = (v: number, step: number) => Math.round(v / step) * step;
    const cacheKey = JSON.stringify({
      cn: conditionNameForAi,
      pf: patientFactors,
      pm: clinicalStateForGoals ? {
        p: clinicalStateForGoals.painMarkers?.map(m => `${m.boneName}:${quantize(m.intensity, 5)}`).sort() ?? [],
        m: clinicalStateForGoals.muscleStates?.map(s => `${s.muscleId}:${quantize(s.tension, 5)}`).sort() ?? [],
        c: [...(clinicalStateForGoals.compensationPatterns ?? [])].sort(),
        d: [...(clinicalStateForGoals.posturalDeviations ?? [])].sort(),
        sc: clinicalStateForGoals.scarSummary?.map(s => `${s.region}:${s.severity}:${s.mobility}:${s.nearestBone}`).sort() ?? [],
        ct: clinicalStateForGoals.chainTensionAverages?.map(c => `${c.chainId}:${c.avgTension}`).sort() ?? [],
        pm2: clinicalStateForGoals.postureMeasurements ? `${clinicalStateForGoals.postureMeasurements.kyphosisAngle ?? 0}:${clinicalStateForGoals.postureMeasurements.lordosisAngle ?? 0}:${clinicalStateForGoals.postureMeasurements.forwardHeadAngle ?? 0}:${clinicalStateForGoals.postureMeasurements.pelvicTiltAngle ?? 0}:${clinicalStateForGoals.postureMeasurements.scoliosisAngle ?? 0}` : '',
        cr: clinicalStateForGoals.currentRom?.map(r => `${r.jointId}:${r.currentDegrees}`).sort() ?? [],
        api: clinicalStateForGoals.activePhaseIndex ?? -1,
      } : null,
    });

    if (aiGoalCacheRef.current && aiGoalCacheRef.current.key === cacheKey) {
      setAiGoalProfile(aiGoalCacheRef.current.profile);
      setAiGoalLoading(false);
      return;
    }

    const localConditionProfile = findConditionProfile(conditionNameForAi);
    const localGoals = localConditionProfile
      ? generateGoalProfile(localConditionProfile, modifiers, undefined, clinicalStateForGoals, conditionNameForAi)
      : generateGenericGoalProfile(conditionNameForAi, clinicalStateForGoals, modifiers);
    setAiGoalProfile(localGoals);

    const hasPathologyOverride = !!detectPathologyOverride(conditionNameForAi);
    if (localConditionProfile && hasPathologyOverride) {
      aiGoalCacheRef.current = { key: cacheKey, profile: localGoals };
      setAiGoalLoading(false);
      return;
    }

    if (aiGoalDebounceRef.current) {
      clearTimeout(aiGoalDebounceRef.current);
    }

    aiGoalDebounceRef.current = setTimeout(() => {
      if (aiGoalAbortRef.current) {
        aiGoalAbortRef.current.abort();
      }
      const controller = new AbortController();
      aiGoalAbortRef.current = controller;
      setAiGoalLoading(true);

      const hypotheses = structuredReasoning?.hypotheses?.map(h => ({
        condition: h.condition,
        likelihood: h.likelihood,
        reasoning: h.reasoning,
      })) ?? [];

      const extractionSummary = extractionResult
        ? [
            extractionResult.bodyRegions?.length ? `Regions: ${extractionResult.bodyRegions.join(', ')}` : '',
            extractionResult.symptoms?.length ? `Symptoms: ${extractionResult.symptoms.join(', ')}` : '',
            extractionResult.duration ? `Duration: ${extractionResult.duration}` : '',
            extractionResult.mechanism ? `Mechanism: ${extractionResult.mechanism}` : '',
            extractionResult.aggravatingFactors?.length ? `Aggravating: ${extractionResult.aggravatingFactors.join(', ')}` : '',
            extractionResult.easingFactors?.length ? `Easing: ${extractionResult.easingFactors.join(', ')}` : '',
            extractionResult.functionalLimitations?.length ? `Functional limitations: ${extractionResult.functionalLimitations.map(f => f.limitation).join(', ')}` : '',
          ].filter(Boolean).join('. ')
        : '';

      fetch('/api/recovery-goals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          conditionName: conditionNameForAi,
          hypotheses,
          painMarkers: clinicalStateForGoals?.painMarkers ?? [],
          muscleStates: clinicalStateForGoals?.muscleStates ?? [],
          compensationPatterns: clinicalStateForGoals?.compensationPatterns ?? [],
          posturalDeviations: clinicalStateForGoals?.posturalDeviations ?? [],
          slingAnalysis: clinicalStateForGoals?.slingAnalysis ?? [],
          patientFactors,
          extractionSummary,
        }),
      })
        .then(r => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.json();
        })
        .then(profile => {
          if (!controller.signal.aborted) {
            setAiGoalProfile(profile);
            aiGoalCacheRef.current = { key: cacheKey, profile };
            setAiGoalLoading(false);
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError' && !controller.signal.aborted) {
            console.error('AI goal refinement failed, keeping local goals:', err);
            setAiGoalLoading(false);
          }
        });
    }, 1500);

    return () => {
      if (aiGoalDebounceRef.current) {
        clearTimeout(aiGoalDebounceRef.current);
      }
      if (aiGoalAbortRef.current) {
        aiGoalAbortRef.current.abort();
      }
    };
  }, [goalEffectKey, modifiers]);

  const parentGoalProfile = aiGoalProfile;

  const hasCustomTreatments = (customExercises && customExercises.length > 0) || (customTechniques && customTechniques.length > 0);

  const [sessionTimeline, setSessionTimeline] = useState<SessionTimelineResult | null>(null);
  const [sessionTimelineLoading, setSessionTimelineLoading] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgressEvent | null>(null);
  const [enableReQuery, setEnableReQuery] = useState(true);

  const currentStateGap = useMemo<GoalGapAnalysis | null>(() => {
    if (!aiGoalProfile || !sessionTimeline || sessionTimeline.sessions.length === 0) return null;
    const baseline = sessionTimeline.sessions[0];
    return computeGoalGap(aiGoalProfile, baseline, null);
  }, [aiGoalProfile, sessionTimeline]);

  useEffect(() => {
    if (!onGoalProfileChange) return;
    onGoalProfileChange(aiGoalProfile, currentStateGap);
  }, [aiGoalProfile, currentStateGap, onGoalProfileChange]);

  const timelinePrescriptions = useMemo<TimelinePrescriptionSummary | null>(() => {
    if (!sessionTimeline || !aiGoalProfile || sessionTimeline.sessions.length === 0) return null;
    try {
      const result = computeTimelinePrescriptions(sessionTimeline.sessions, aiGoalProfile, currentStateGap);
      for (let i = 0; i < sessionTimeline.sessions.length; i++) {
        if (i < result.sessionPrescriptions.length) {
          sessionTimeline.sessions[i].prescriptionContext = result.sessionPrescriptions[i];
        }
      }
      return result;
    } catch (e) {
      console.warn('[SimTimeline] Prescription computation failed:', e);
      return null;
    }
  }, [sessionTimeline, aiGoalProfile, currentStateGap]);

  const handleSessionPrescriptionSelect = useCallback((sessionNumber: number | null) => {
    if (!onSessionPrescriptionSelect) return;
    if (sessionNumber === null || !timelinePrescriptions) {
      onSessionPrescriptionSelect(null, null);
      return;
    }
    const ctx = timelinePrescriptions.sessionPrescriptions.find(p => p.sessionNumber === sessionNumber) ?? null;
    onSessionPrescriptionSelect(ctx, sessionNumber);
  }, [onSessionPrescriptionSelect, timelinePrescriptions]);

  useEffect(() => {
    if (!hasCustomTreatments) {
      setSessionTimeline(null);
      setSessionTimelineLoading(false);
      setPhaseProgress(null);
      return;
    }

    const abortController = new AbortController();

    if (enableReQuery) {
      setSessionTimelineLoading(true);
      setPhaseProgress({ phaseIndex: 0, phaseLabel: 'Initial', status: 'building', message: 'Building initial timeline...' });

      buildSessionTimelineAsync(
        customExercises ?? [],
        customTechniques ?? [],
        baseModelConfig,
        baseOverrides,
        painMarkers,
        bodyWeightKg,
        biomechanicsOutput,
        modifiers,
        adjustedProfile,
        actualOutcomes.length > 0 ? actualOutcomes : undefined,
        (event) => { if (!abortController.signal.aborted) setPhaseProgress(event); },
        abortController.signal,
        (partial) => { if (!abortController.signal.aborted) setSessionTimeline(partial); },
        clinicalStateForGoals,
      ).then(result => {
        if (!abortController.signal.aborted) {
          setSessionTimeline(result);
          setSessionTimelineLoading(false);
          setPhaseProgress(null);
        }
      }).catch(err => {
        if (!abortController.signal.aborted) {
          console.warn('[SimTimeline] Async session build failed:', err);
          try {
            const fallback = buildSessionTimeline(
              customExercises ?? [], customTechniques ?? [], baseModelConfig, baseOverrides,
              painMarkers, bodyWeightKg, biomechanicsOutput, modifiers, adjustedProfile,
              actualOutcomes.length > 0 ? actualOutcomes : undefined,
              clinicalStateForGoals,
            );
            setSessionTimeline(fallback);
          } catch (e2) {
            console.warn('[SimTimeline] Fallback also failed:', e2);
            setSessionTimeline(null);
          }
          setSessionTimelineLoading(false);
          setPhaseProgress(null);
        }
      });
    } else {
      setSessionTimelineLoading(false);
      setPhaseProgress(null);
      try {
        const result = buildSessionTimeline(
          customExercises ?? [], customTechniques ?? [], baseModelConfig, baseOverrides,
          painMarkers, bodyWeightKg, biomechanicsOutput, modifiers, adjustedProfile,
          actualOutcomes.length > 0 ? actualOutcomes : undefined,
          clinicalStateForGoals,
        );
        setSessionTimeline(result);
      } catch (e) {
        console.warn('[SimTimeline] Session build failed:', e);
        setSessionTimeline(null);
      }
    }

    return () => { abortController.abort(); };
  }, [hasCustomTreatments, customExercises, customTechniques, baseModelConfig, baseOverrides, painMarkers, bodyWeightKg, biomechanicsOutput, modifiers, adjustedProfile, actualOutcomes, enableReQuery, clinicalStateForGoals]);

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

  if (hasCustomTreatments && (sessionTimeline || sessionTimelineLoading)) {
    return (
      <div className="flex flex-col gap-2">
        {patientFactorsPanel}
        {!sessionTimelineLoading && (
          <div className="border border-cyan-700/30 rounded bg-cyan-950/20 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[9px] text-gray-300">
                {enableReQuery ? 'Auto-evolving treatments at phase transitions' : 'Auto-evolve treatments at phase transitions'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`h-5 text-[8px] px-2 ${enableReQuery ? 'border-emerald-600/40 text-emerald-400 hover:bg-emerald-900/30' : 'border-cyan-600/40 text-cyan-400 hover:bg-cyan-900/30'}`}
              onClick={() => setEnableReQuery(!enableReQuery)}
            >
              {enableReQuery ? 'Disable Re-Query' : 'Enable Re-Query'}
            </Button>
          </div>
        )}
        {sessionTimelineLoading && phaseProgress && (
          <div className="border border-cyan-700/30 rounded bg-cyan-950/20 px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              <span className="text-[10px] font-medium text-gray-200">Re-Query Engine Active</span>
              <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                phaseProgress.status === 'requerying' ? 'border-purple-500/40 text-purple-400' :
                phaseProgress.status === 'building' ? 'border-cyan-500/40 text-cyan-400' :
                'border-emerald-500/40 text-emerald-400'
              }`}>
                {phaseProgress.status === 'requerying' ? 'AI Generating' : phaseProgress.status === 'building' ? 'Computing' : 'Done'}
              </Badge>
            </div>
            <p className="text-[8px] text-gray-500 mb-1">{phaseProgress.message}</p>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((phaseProgress.phaseIndex + 1) / 4) * 100, 95)}%` }}
              />
            </div>
          </div>
        )}
        {sessionTimeline && (
          <SessionTimelineView
            sessionTimeline={sessionTimeline}
            baseModelConfig={baseModelConfig}
            baseOverrides={baseOverrides}
            onApplyToSkeleton={onApplyWeekToSkeleton}
            activeCondition={activeCondition}
            modifiers={modifiers}
            actualOutcomes={actualOutcomes}
            onRecordOutcome={handleRecordOutcome}
            onGoalOverlayChange={onGoalOverlayChange}
            clinicalState={clinicalStateForGoals}
            aiGoalProfileOverride={aiGoalProfile}
            aiGoalLoading={aiGoalLoading}
            timelinePrescriptions={timelinePrescriptions}
            onSessionPrescriptionSelect={handleSessionPrescriptionSelect}
          />
        )}
        {sessionTimelineLoading && !sessionTimeline && (
          <div className="border border-gray-700/40 rounded bg-gray-900/40 p-4 text-center">
            <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin mx-auto mb-2" />
            <span className="text-[10px] text-gray-400">Building initial timeline...</span>
          </div>
        )}
      </div>
    );
  }

  if (weekTimeline) {
    return (
      <div className="flex flex-col gap-2">
        {patientFactorsPanel}
        {parentGoalProfile && (
          <RecoveryGoalHeroCard
            goalProfile={parentGoalProfile}
            totalWeeks={Math.round(weekTimeline.totalDays / 7)}
            totalSessions={weekTimeline.totalSessions}
            isLoading={aiGoalLoading}
          />
        )}
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
      {parentGoalProfile && (
        <RecoveryGoalHeroCard
          goalProfile={parentGoalProfile}
          isLoading={aiGoalLoading}
        />
      )}
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
  onApplyWeekToSkeleton?: (payload: SessionApplyPayload) => void;
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
    onApplyWeekToSkeleton({
      modelConfig: currentSnapshot.modelConfig,
      overrides: currentSnapshot.overrides,
      painMarkerUpdates: [],
      posturalUpdates: [],
      compensationUpdates: [],
    });
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
    <div className="flex flex-col gap-2 text-[10px] max-h-full overflow-y-auto custom-scrollbar">
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
