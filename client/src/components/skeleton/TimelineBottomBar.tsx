import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Clock,
} from "lucide-react";
import type { SkeletonClinicalGoal } from "@/lib/clinicalPlanSynthesizer";
import type { RecoveryGoalProfile } from "@/lib/goalStateEngine";

export interface BottomBarSessionData {
  sessionNumber: number;
  dayOffset: number;
  riskScore: number;
  painPrediction: number;
  slingIntegrity: number;
  goalAchievementPct?: number;
  recoveryPhaseLabel: string;
  romPredictions: Array<{ jointId: string; predictedDegrees: number; targetDegrees: number }>;
  compensationResolution: number;
  muscleStatePredictions: Array<{ muscleId: string; predictedTension: number }>;
}

export interface PhaseSegment {
  label: string;
  startSession: number;
  endSession: number;
  durationFraction: number;
}

export interface PlaybackSyncState {
  sessions: BottomBarSessionData[];
  totalSessions: number;
  totalDays: number;
  selectedSession: number;
  isPlaying: boolean;
  appliedSession: number | null;
  activePhaseLabel: string;
  activePhaseGoals: SkeletonClinicalGoal[];
  goalProfile: RecoveryGoalProfile | null;
  phaseSegments: PhaseSegment[];
}

export interface TimelinePlaybackRef {
  selectSession: (n: number) => void;
  togglePlay: () => void;
  applyToSkeleton: () => void;
}

export interface ConditionPhaseInfo {
  name: string;
  durationWeeksMin: number;
  durationWeeksMax: number;
}

const PHASE_COLORS = [
  'bg-teal-600/80',
  'bg-sky-600/80',
  'bg-indigo-600/80',
  'bg-violet-600/80',
  'bg-amber-600/80',
  'bg-rose-600/80',
];

const PHASE_BORDER_COLORS = [
  'border-teal-400/40',
  'border-sky-400/40',
  'border-indigo-400/40',
  'border-violet-400/40',
  'border-amber-400/40',
  'border-rose-400/40',
];

function PhaseSegmentBar({
  segments,
  selectedSession,
  totalSessions,
  onSessionClick,
}: {
  segments: PhaseSegment[];
  selectedSession: number;
  totalSessions: number;
  onSessionClick?: (n: number) => void;
}) {
  const selectedFraction = totalSessions > 1
    ? (selectedSession - 1) / (totalSessions - 1)
    : 0;

  return (
    <div className="relative w-full flex h-6 rounded overflow-hidden gap-px">
      {segments.map((seg, i) => {
        const isActive = selectedSession >= seg.startSession && selectedSession <= seg.endSession;
        return (
          <button
            key={`${seg.label}-${i}`}
            className={`relative flex items-center justify-center overflow-hidden transition-all border-b-2 ${PHASE_COLORS[i % PHASE_COLORS.length]} ${isActive ? PHASE_BORDER_COLORS[i % PHASE_BORDER_COLORS.length] + ' brightness-125' : 'border-transparent opacity-70 hover:opacity-90'}`}
            style={{ flex: seg.durationFraction }}
            onClick={() => {
              if (onSessionClick) {
                const midSession = Math.round((seg.startSession + seg.endSession) / 2);
                onSessionClick(midSession);
              }
            }}
          >
            <span className="text-[9px] font-medium text-white/90 truncate px-1">{seg.label}</span>
          </button>
        );
      })}
      {totalSessions > 1 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 z-10 pointer-events-none"
          style={{ left: `${selectedFraction * 100}%` }}
        />
      )}
    </div>
  );
}

function conditionPhasesToSegments(phases: ConditionPhaseInfo[]): { segments: PhaseSegment[]; totalWeeks: number } {
  const totalWeeks = phases.reduce((sum, p) => sum + (p.durationWeeksMin + p.durationWeeksMax) / 2, 0);
  if (totalWeeks <= 0) return { segments: [], totalWeeks: 0 };

  let cumulativeSession = 1;
  const segments: PhaseSegment[] = phases.map(p => {
    const avgWeeks = (p.durationWeeksMin + p.durationWeeksMax) / 2;
    const fraction = avgWeeks / totalWeeks;
    const sessionSpan = Math.max(1, Math.round(fraction * 10));
    const seg: PhaseSegment = {
      label: p.name,
      startSession: cumulativeSession,
      endSession: cumulativeSession + sessionSpan - 1,
      durationFraction: fraction,
    };
    cumulativeSession += sessionSpan;
    return seg;
  });

  return { segments, totalWeeks };
}

export default function TimelineBottomBar({
  playbackState,
  playbackRef,
  conditionPhases,
}: {
  playbackState: PlaybackSyncState | null;
  playbackRef: React.RefObject<TimelinePlaybackRef | null>;
  conditionPhases?: ConditionPhaseInfo[] | null;
}) {
  const conditionDerived = useMemo(() => {
    if (!conditionPhases || conditionPhases.length === 0) return null;
    return conditionPhasesToSegments(conditionPhases);
  }, [conditionPhases]);

  const hasPlayback = !!playbackState;
  const segments = hasPlayback
    ? (playbackState.phaseSegments.length > 0 ? playbackState.phaseSegments : conditionDerived?.segments ?? [])
    : (conditionDerived?.segments ?? []);
  const totalSessions = hasPlayback ? playbackState.totalSessions : (conditionDerived ? segments.reduce((max, s) => Math.max(max, s.endSession), 1) : 1);
  const selectedSession = hasPlayback ? playbackState.selectedSession : 1;
  const isPlaying = hasPlayback ? playbackState.isPlaying : false;
  const activePhaseLabel = hasPlayback ? playbackState.activePhaseLabel : (conditionPhases?.[0]?.name ?? '');

  const currentWeek = useMemo(() => {
    if (hasPlayback && playbackState.sessions.length > 0) {
      const snap = playbackState.sessions.find(s => s.sessionNumber === selectedSession);
      if (snap) return Math.max(1, Math.ceil(snap.dayOffset / 7));
    }
    return 1;
  }, [hasPlayback, playbackState, selectedSession]);

  const totalWeeks = useMemo(() => {
    if (hasPlayback && playbackState.totalDays > 0) {
      return Math.max(1, Math.ceil(playbackState.totalDays / 7));
    }
    if (conditionDerived) return Math.max(1, Math.round(conditionDerived.totalWeeks));
    return 1;
  }, [hasPlayback, playbackState, conditionDerived]);

  if (segments.length === 0 && !hasPlayback) {
    return (
      <div className="w-full bg-gray-950/95 backdrop-blur border-t border-gray-700/60 px-3 py-2 z-40">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] text-gray-400">Recovery Timeline — waiting for condition data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-950/95 backdrop-blur border-t border-gray-700/60 px-3 py-1.5 flex flex-col gap-1 z-40">
      <PhaseSegmentBar
        segments={segments}
        selectedSession={selectedSession}
        totalSessions={totalSessions}
        onSessionClick={hasPlayback ? (n) => playbackRef.current?.selectSession(n) : undefined}
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 min-w-[140px] shrink-0">
          <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
          <span className="text-[10px] text-gray-300 tabular-nums">
            Week {currentWeek} of {totalWeeks}
          </span>
          <span className="text-[10px] text-cyan-400 font-medium truncate max-w-[180px]">
            {activePhaseLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={() => playbackRef.current?.selectSession(Math.max(1, selectedSession - 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 shrink-0 disabled:opacity-30"
            disabled={!hasPlayback || selectedSession <= 1}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => playbackRef.current?.togglePlay()}
            className="p-0.5 rounded hover:bg-gray-700/50 text-cyan-400 hover:text-cyan-300 shrink-0 disabled:opacity-30"
            disabled={!hasPlayback}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1 min-w-0 mx-1">
            <Slider
              value={[selectedSession]}
              onValueChange={(v) => playbackRef.current?.selectSession(v[0])}
              min={1}
              max={totalSessions}
              step={1}
              className="w-full"
              disabled={!hasPlayback}
            />
          </div>
          <button
            onClick={() => playbackRef.current?.selectSession(Math.min(totalSessions, selectedSession + 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 shrink-0 disabled:opacity-30"
            disabled={!hasPlayback || selectedSession >= totalSessions}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-[9px] text-cyan-300/70 tabular-nums shrink-0 border border-cyan-500/20 rounded px-1.5 py-0.5 bg-cyan-900/20">
          {totalWeeks} weeks
        </span>
      </div>
    </div>
  );
}
