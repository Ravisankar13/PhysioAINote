import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Zap,
  Target,
  Activity,
  Shield,
  Clock,
  Bone,
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
}

export interface TimelinePlaybackRef {
  selectSession: (n: number) => void;
  togglePlay: () => void;
  applyToSkeleton: () => void;
}

const GOAL_SOURCE_STYLE: Record<string, string> = {
  pain: 'bg-red-500/20 text-red-300',
  biomechanics: 'bg-blue-500/20 text-blue-300',
  sling: 'bg-orange-500/20 text-orange-300',
  tissue: 'bg-pink-500/20 text-pink-300',
  muscle: 'bg-purple-500/20 text-purple-300',
  posture: 'bg-emerald-500/20 text-emerald-300',
};

type CurveTrack = 'risk' | 'pain' | 'sling' | 'rom';

const TRACK_CFG: Record<CurveTrack, { label: string; color: string; dash?: string }> = {
  risk: { label: 'Risk', color: '#ef4444' },
  pain: { label: 'Pain', color: '#f59e0b', dash: '3,2' },
  sling: { label: 'Sling', color: '#8b5cf6', dash: '2,2' },
  rom: { label: 'ROM', color: '#06b6d4', dash: '4,1' },
};

function CompactRecoveryCurve({
  sessions,
  selectedSession,
  totalSessions,
  goalProfile,
  onSessionClick,
}: {
  sessions: BottomBarSessionData[];
  selectedSession: number;
  totalSessions: number;
  goalProfile: RecoveryGoalProfile | null;
  onSessionClick: (n: number) => void;
}) {
  const [enabledTracks, setEnabledTracks] = useState<Set<CurveTrack>>(() => new Set<CurveTrack>(['risk', 'pain', 'sling']));

  const toggleTrack = useCallback((track: CurveTrack) => {
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

  const width = 220;
  const height = 60;
  const pad = { top: 4, right: 4, bottom: 12, left: 20 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxDay = sessions.length > 0 ? sessions[sessions.length - 1].dayOffset : 1;

  const getX = useCallback((s: BottomBarSessionData) => {
    return pad.left + (maxDay > 0 ? (s.dayOffset / maxDay) : (s.sessionNumber / totalSessions)) * chartW;
  }, [maxDay, totalSessions, chartW]);

  const avgRom = useCallback((s: BottomBarSessionData) => {
    if (s.romPredictions.length === 0) return 50;
    return s.romPredictions.reduce((sum, r) => sum + (r.targetDegrees > 0 ? (r.predictedDegrees / r.targetDegrees) * 100 : 50), 0) / s.romPredictions.length;
  }, []);

  const trackData = useMemo(() => {
    const data: Record<CurveTrack, { x: number; y: number }[]> = { risk: [], pain: [], sling: [], rom: [] };
    for (const s of sessions) {
      const x = getX(s);
      data.risk.push({ x, y: s.riskScore });
      data.pain.push({ x, y: s.painPrediction });
      data.sling.push({ x, y: s.slingIntegrity });
      data.rom.push({ x, y: avgRom(s) });
    }
    return data;
  }, [sessions, getX, avgRom]);

  const toSvg = useCallback((pts: { x: number; y: number }[]) =>
    pts.map(p => ({ x: p.x, y: pad.top + (1 - p.y / 100) * chartH })),
  [chartH]);

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const selectedSnap = sessions.find(s => s.sessionNumber === selectedSession);
  const selectedX = selectedSnap ? getX(selectedSnap) : pad.left;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const frac = (relX - pad.left) / chartW;
    let closest = 0;
    let closestDist = Infinity;
    for (const s of sessions) {
      const sx = maxDay > 0 ? s.dayOffset / maxDay : s.sessionNumber / totalSessions;
      const dist = Math.abs(sx - frac);
      if (dist < closestDist) { closestDist = dist; closest = s.sessionNumber; }
    }
    onSessionClick(closest);
  };

  return (
    <div className="flex flex-col">
      <div className="flex gap-0.5 mb-0.5">
        {(Object.entries(TRACK_CFG) as [CurveTrack, typeof TRACK_CFG.risk][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); toggleTrack(key); }}
            className={`flex items-center gap-0.5 px-1 py-0 rounded text-[6px] transition-colors ${
              enabledTracks.has(key) ? 'bg-gray-700/60 text-gray-200' : 'bg-gray-800/30 text-gray-600'
            }`}
          >
            <div className="w-1.5 h-[2px] rounded" style={{ backgroundColor: enabledTracks.has(key) ? cfg.color : '#4b5563' }} />
            {cfg.label}
          </button>
        ))}
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full cursor-pointer" onClick={handleClick}>
        {[0, 50, 100].map(v => {
          const y = pad.top + (1 - v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />
              <text x={pad.left - 2} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={6}>{v}</text>
            </g>
          );
        })}

        {enabledTracks.has('risk') && (
          <path d={makePath(toSvg(trackData.risk))} fill="none" stroke="#ef4444" strokeWidth={1.2} />
        )}
        {enabledTracks.has('pain') && (
          <path d={makePath(toSvg(trackData.pain))} fill="none" stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3,2" />
        )}
        {enabledTracks.has('sling') && (
          <path d={makePath(toSvg(trackData.sling))} fill="none" stroke="#8b5cf6" strokeWidth={0.8} strokeDasharray="2,2" />
        )}
        {enabledTracks.has('rom') && (
          <path d={makePath(toSvg(trackData.rom))} fill="none" stroke="#06b6d4" strokeWidth={0.8} strokeDasharray="4,1" />
        )}

        {goalProfile && enabledTracks.has('risk') && (
          <line x1={pad.left} y1={pad.top + (1 - goalProfile.riskScoreTarget / 100) * chartH}
            x2={pad.left + chartW} y2={pad.top + (1 - goalProfile.riskScoreTarget / 100) * chartH}
            stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
        )}
        {goalProfile && enabledTracks.has('pain') && (
          <line x1={pad.left} y1={pad.top + (1 - goalProfile.painTarget / 100) * chartH}
            x2={pad.left + chartW} y2={pad.top + (1 - goalProfile.painTarget / 100) * chartH}
            stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
        )}

        <line x1={selectedX} y1={pad.top} x2={selectedX} y2={pad.top + chartH} stroke="#22d3ee" strokeWidth={1} opacity={0.6} />
        {enabledTracks.has('risk') && (() => {
          const pt = toSvg(trackData.risk).find((_, i) => sessions[i]?.sessionNumber === selectedSession);
          return pt ? <circle cx={pt.x} cy={pt.y} r={2.5} fill="#ef4444" stroke="#1f2937" strokeWidth={0.5} /> : null;
        })()}

      </svg>
    </div>
  );
}

export default function TimelineBottomBar({
  playbackState,
  playbackRef,
}: {
  playbackState: PlaybackSyncState | null;
  playbackRef: React.RefObject<TimelinePlaybackRef | null>;
}) {
  if (!playbackState) return null;

  const {
    sessions,
    totalSessions,
    selectedSession,
    isPlaying,
    appliedSession,
    activePhaseLabel,
    activePhaseGoals,
    goalProfile,
  } = playbackState;

  const currentSnap = sessions.find(s => s.sessionNumber === selectedSession);

  const handleSliderChange = (value: number[]) => {
    playbackRef.current?.selectSession(value[0]);
  };

  const primaryGoals = activePhaseGoals.filter(g => g.priority >= 60).slice(0, 3);

  return (
    <div className="w-full bg-gray-950/95 backdrop-blur border-t border-gray-700/60 px-3 py-1.5 flex items-stretch gap-3 z-40">
      <div className="flex flex-col justify-center gap-0.5 min-w-[180px] max-w-[220px] shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
          <span className="text-[9px] font-semibold text-cyan-300 truncate">{activePhaseLabel || 'Recovery Timeline'}</span>
        </div>
        {primaryGoals.length > 0 && (
          <div className="space-y-0 ml-4">
            {primaryGoals.map(g => (
              <div key={g.id} className="flex items-center gap-1 text-[7px]">
                <div className={`w-1 h-1 rounded-full shrink-0 ${g.isCarryForward ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <span className="text-gray-300 truncate">{g.target}</span>
                <span className={`text-[5px] px-0.5 rounded shrink-0 ${GOAL_SOURCE_STYLE[g.source] ?? 'bg-gray-500/20 text-gray-300'}`}>{g.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => playbackRef.current?.selectSession(Math.max(1, selectedSession - 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 shrink-0"
            disabled={selectedSession <= 1}
          >
            <SkipBack className="h-3 w-3" />
          </button>
          <button
            onClick={() => playbackRef.current?.togglePlay()}
            className="p-0.5 rounded hover:bg-gray-700/50 text-cyan-400 hover:text-cyan-300 shrink-0"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <div className="flex-1 min-w-0">
            <Slider
              value={[selectedSession]}
              onValueChange={handleSliderChange}
              min={1}
              max={totalSessions}
              step={1}
              className="w-full"
            />
          </div>
          <button
            onClick={() => playbackRef.current?.selectSession(Math.min(totalSessions, selectedSession + 1))}
            className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 shrink-0"
            disabled={selectedSession >= totalSessions}
          >
            <SkipForward className="h-3 w-3" />
          </button>
          <span className="text-[8px] text-gray-400 tabular-nums shrink-0 w-[50px] text-right">
            S{selectedSession}/{totalSessions}
            {currentSnap && <span className="text-gray-600 block text-[7px]">Day {currentSnap.dayOffset}</span>}
          </span>
        </div>

        {currentSnap && (
          <div className="flex items-center gap-2 text-[8px]">
            <div className="flex items-center gap-0.5">
              <Shield className="h-2.5 w-2.5 text-red-400" />
              <span className={currentSnap.riskScore > 60 ? 'text-red-400' : currentSnap.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}>
                {Math.round(currentSnap.riskScore)}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Target className="h-2.5 w-2.5 text-amber-400" />
              <span className={currentSnap.painPrediction > 50 ? 'text-red-400' : currentSnap.painPrediction > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                {Math.round(currentSnap.painPrediction)}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Activity className="h-2.5 w-2.5 text-violet-400" />
              <span className={currentSnap.slingIntegrity > 70 ? 'text-emerald-400' : currentSnap.slingIntegrity > 40 ? 'text-amber-400' : 'text-red-400'}>
                {Math.round(currentSnap.slingIntegrity)}%
              </span>
            </div>
            {currentSnap.goalAchievementPct !== undefined && currentSnap.goalAchievementPct > 0 && (
              <div className="flex items-center gap-0.5">
                <Bone className="h-2.5 w-2.5 text-green-400" />
                <span className={currentSnap.goalAchievementPct >= 70 ? 'text-green-400' : currentSnap.goalAchievementPct >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {currentSnap.goalAchievementPct}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 hidden lg:block w-[180px]">
        <CompactRecoveryCurve
          sessions={sessions}
          selectedSession={selectedSession}
          totalSessions={totalSessions}
          goalProfile={goalProfile}
          onSessionClick={(n) => playbackRef.current?.selectSession(n)}
        />
      </div>

      <div className="flex flex-col justify-center shrink-0">
        <Button
          onClick={() => playbackRef.current?.applyToSkeleton()}
          disabled={!currentSnap || !playbackRef.current?.applyToSkeleton}
          size="sm"
          className="h-7 text-[9px] px-3 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30"
          variant="outline"
        >
          <Zap className="h-3 w-3 mr-1" />
          {appliedSession === selectedSession ? 'Applied' : 'Apply'}
        </Button>
      </div>
    </div>
  );
}
