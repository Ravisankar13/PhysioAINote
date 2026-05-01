import { useState, useEffect } from "react";
import { Mic, ChevronDown, ChevronUp, Undo2, Clock, Activity, Pause, Play, RotateCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export type VoiceTriggerReason = "silence_pause" | "interval_pulse";

export type AutopilotStageId = "parse" | "reason" | "evidence" | "goal" | "research" | "plan";
export type AutopilotStageState =
  | "idle"
  | "running"
  | "done"
  | "skipped"     // dedup — inputs unchanged
  | "converged"  // top hypothesis stable, chain suppressed
  | "error"
  | "blocked";    // paused / not eligible

export interface AutopilotStageStatus {
  id: AutopilotStageId;
  label: string;
  state: AutopilotStageState;
  /** Total times this stage has fired this session. */
  callCount: number;
  /** Recording-time stamp (sec since record start) of the last fire. */
  lastFiredSec: number | null;
  /** Last call duration in ms. */
  lastDurationMs: number | null;
  /** Why the last attempt was skipped (dedup reason). */
  lastSkippedReason?: string | null;
}

export interface AutopilotStability {
  /** The current top working hypothesis label, or null if none yet. */
  topLabel: string | null;
  /** Number of consecutive runs the top hypothesis has been stable for. */
  stableForRuns: number;
  /** True when the chain has converged and further reasoning is suppressed. */
  converged: boolean;
  /** True when stability was just broken by a new finding. */
  destabilized: boolean;
}

export interface VoiceActivityEntry {
  id: string;
  trigger: VoiceTriggerReason;
  /** Seconds since recording started, used for the "00:42" stamp. */
  recordingTimeSec: number;
  /** Wall-clock timestamp when the parse fired. */
  timestamp: number;
  /** The new text since the previous parse — what triggered this one. */
  chunkText: string;
  /** The parse's clinical_summary, surfaced as the AI inference line. */
  clinicalSummary: string;
  /** Counts of what got applied; drives the compact summary line. */
  counts: {
    painMarkers: number;
    muscleOverrides: number;
    posturalDeviations: number;
    regionHighlights: number;
    compromisedTissuesUpdated: boolean;
  };
  /** True if the parse produced no applied changes at all. */
  noChanges: boolean;
  /** True after this entry's contribution has been undone. */
  undone: boolean;
}

interface VoiceActivityDockProps {
  entries: VoiceActivityEntry[];
  isRecording: boolean;
  /** True if any prior session left entries that should be visible. */
  visible: boolean;
  onUndo: (entryId: string) => void;
  // AI Activity Monitor (all optional — when omitted, dock renders as before).
  /** Per-stage status for the orchestrator stages. */
  monitorStages?: AutopilotStageStatus[];
  /** Stability ribbon data (top hypothesis convergence). */
  monitorStability?: AutopilotStability;
  /** Whether the AI orchestrator auto-pilot is enabled. */
  autopilotEnabled?: boolean;
  /** True when the dock's Pause AI is on (queued, not in-flight). */
  paused?: boolean;
  /** Toggle handlers — when omitted, the controls render disabled. */
  onAutopilotToggle?: (next: boolean) => void;
  onPauseToggle?: (next: boolean) => void;
  /** Force-rerun a stage (and downstream) ignoring dedup/convergence. */
  onRerunFromStage?: (stage: AutopilotStageId) => void;
  /** Whether the case is eligible for auto-pilot (snapshot-eligible). */
  autopilotEligible?: boolean;
}

function fmtClock(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function triggerLabel(t: VoiceTriggerReason): string {
  return t === "silence_pause" ? "silence pause" : "interval pulse";
}

function buildSummaryLine(e: VoiceActivityEntry): string {
  if (e.noChanges) return "no changes inferred";
  const parts: string[] = [];
  const c = e.counts;
  if (c.painMarkers > 0) parts.push(`+${c.painMarkers} pain marker${c.painMarkers > 1 ? "s" : ""}`);
  if (c.muscleOverrides > 0) parts.push(`+${c.muscleOverrides} muscle override${c.muscleOverrides > 1 ? "s" : ""}`);
  if (c.posturalDeviations > 0) parts.push(`${c.posturalDeviations} postural deviation${c.posturalDeviations > 1 ? "s" : ""}`);
  if (c.regionHighlights > 0) parts.push(`+${c.regionHighlights} region highlight${c.regionHighlights > 1 ? "s" : ""}`);
  if (c.compromisedTissuesUpdated) parts.push("compromised tissues updated");
  return parts.length > 0 ? parts.join(" · ") : "no changes inferred";
}

function ChunkText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const isLong = text.length > 120;
  const visible = !isLong || open ? text : `${text.slice(0, 120)}…`;
  return (
    <p
      className="text-[10px] text-gray-300 leading-snug italic mt-1 cursor-pointer"
      title={isLong && !open ? text : undefined}
      onClick={() => isLong && setOpen(o => !o)}
    >
      <span className="text-gray-500">"</span>{visible}<span className="text-gray-500">"</span>
      {isLong && (
        <button className="text-blue-300 hover:text-blue-200 ml-1 not-italic">
          {open ? "less" : "more"}
        </button>
      )}
    </p>
  );
}

function stageStateClass(s: AutopilotStageState): string {
  switch (s) {
    case "running":   return "bg-blue-900/40 text-blue-200 border-blue-700/50 animate-pulse";
    case "done":       return "bg-emerald-900/40 text-emerald-200 border-emerald-700/50";
    case "skipped":   return "bg-gray-800/60 text-gray-400 border-gray-700/50";
    case "converged": return "bg-emerald-900/30 text-emerald-300 border-emerald-700/40";
    case "error":     return "bg-rose-900/40 text-rose-200 border-rose-700/50";
    case "blocked":   return "bg-amber-900/30 text-amber-300/80 border-amber-700/40";
    default:           return "bg-gray-900/50 text-gray-400 border-gray-700/40";
  }
}

function stageStateLabel(s: AutopilotStageState): string {
  switch (s) {
    case "running":    return "running";
    case "done":       return "done";
    case "skipped":    return "deduped";
    case "converged":  return "converged";
    case "error":      return "error";
    case "blocked":    return "paused";
    default:           return "idle";
  }
}

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function MonitorBlock(props: {
  stages: AutopilotStageStatus[];
  stability?: AutopilotStability;
  autopilotEnabled: boolean;
  paused: boolean;
  eligible: boolean;
  onPauseToggle?: (next: boolean) => void;
  onRerunFromStage?: (stage: AutopilotStageId) => void;
}) {
  const { stages, stability, autopilotEnabled, paused, eligible, onPauseToggle, onRerunFromStage } = props;
  const ribbonTone =
    !eligible ? "bg-gray-900/40 border-gray-700/40 text-gray-400"
    : stability?.destabilized ? "bg-amber-900/30 border-amber-700/50 text-amber-200"
    : stability?.converged ? "bg-emerald-900/25 border-emerald-700/50 text-emerald-200"
    : "bg-blue-900/20 border-blue-700/40 text-blue-200";
  const ribbonText = !eligible
    ? "Auto-pilot unavailable for this case (legacy chat conversation)"
    : !autopilotEnabled
    ? "Auto-pilot off — voice still parses, but downstream engines won't auto-fire"
    : stability?.topLabel
      ? `Top dx: ${stability.topLabel}${stability.stableForRuns > 0 ? ` · stable for ${stability.stableForRuns} run${stability.stableForRuns > 1 ? 's' : ''}` : ''}${stability.converged ? ' · converged' : stability.destabilized ? ' · re-engaged (new finding)' : ''}`
      : "Listening for working hypothesis…";

  return (
    <div className="border-t border-gray-800/60 bg-gray-950/60 px-2 py-1.5" data-testid="voice-activity-monitor">
      {/* Stability ribbon */}
      <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] ${ribbonTone}`} data-testid="monitor-stability-ribbon">
        {stability?.converged ? <ShieldCheck className="h-3 w-3" /> : stability?.destabilized ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
        <span className="truncate font-medium">{ribbonText}</span>
      </div>

      {/* Stage chips */}
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {stages.map(stage => {
          const cls = stageStateClass(stage.state);
          const tooltipParts = [
            `${stage.callCount} call${stage.callCount === 1 ? '' : 's'} this session`,
            stage.lastFiredSec != null ? `last fired ${fmtClock(stage.lastFiredSec)}` : 'not yet fired',
            stage.lastDurationMs != null ? `last ${fmtMs(stage.lastDurationMs)}` : null,
            stage.lastSkippedReason ? `skipped: ${stage.lastSkippedReason}` : null,
          ].filter(Boolean) as string[];
          return (
            <div
              key={stage.id}
              className={`relative rounded border px-1.5 py-1 ${cls}`}
              title={tooltipParts.join(' · ')}
              data-testid={`monitor-stage-${stage.id}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-tight truncate">{stage.label}</span>
                {onRerunFromStage && (
                  <button
                    className="opacity-60 hover:opacity-100 disabled:opacity-30"
                    onClick={(e) => { e.stopPropagation(); onRerunFromStage(stage.id); }}
                    disabled={!eligible || stage.state === 'running'}
                    title="Re-run from here (force this stage and everything downstream)"
                    data-testid={`monitor-stage-rerun-${stage.id}`}
                  >
                    <RotateCw className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              <div className="text-[8px] opacity-90 mt-0.5 truncate">
                {stageStateLabel(stage.state)}
                {stage.callCount > 0 ? ` · ${stage.callCount}×` : ''}
              </div>
              {stage.lastFiredSec != null && (
                <div className="text-[8px] opacity-60 truncate">@{fmtClock(stage.lastFiredSec)}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pause AI toggle row */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border transition-colors ${paused
            ? "bg-amber-900/40 border-amber-700/50 text-amber-200 hover:bg-amber-900/60"
            : "bg-gray-800/60 border-gray-700/50 text-gray-300 hover:bg-gray-800"}`}
          onClick={() => onPauseToggle?.(!paused)}
          disabled={!onPauseToggle || !eligible || !autopilotEnabled}
          data-testid="monitor-pause-toggle"
        >
          {paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
          {paused ? "Resume AI" : "Pause AI"}
        </button>
        <span className="text-[9px] text-gray-500 truncate">
          {paused ? "queued stages held — in-flight will finish" : autopilotEnabled ? "orchestrator armed" : "manual mode"}
        </span>
      </div>
    </div>
  );
}

export default function VoiceActivityDock({
  entries, isRecording, visible, onUndo,
  monitorStages, monitorStability,
  autopilotEnabled = false, paused = false, autopilotEligible = true,
  onAutopilotToggle, onPauseToggle, onRerunFromStage,
}: VoiceActivityDockProps) {
  const [expanded, setExpanded] = useState(false);
  /** Once the user has manually collapsed at least once, we stop
   *  auto-popping the dock open on new entries. Reset by the page
   *  whenever the session is reset (the dock fully unmounts then). */
  const [userCollapsed, setUserCollapsed] = useState(false);
  /** Number of entries that have landed since the dock was last opened. */
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenIndex, setLastSeenIndex] = useState(0);

  // Auto-open the first time an entry shows up in this session, unless
  // the user has already manually collapsed.
  useEffect(() => {
    if (entries.length === 0) return;
    if (!userCollapsed && !expanded) {
      setExpanded(true);
      setLastSeenIndex(entries.length);
      setUnreadCount(0);
    } else if (!expanded) {
      setUnreadCount(entries.length - lastSeenIndex);
    } else {
      setLastSeenIndex(entries.length);
      setUnreadCount(0);
    }
  }, [entries.length, userCollapsed, expanded, lastSeenIndex]);

  if (!visible) return null;

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      setUserCollapsed(true);
    } else {
      setExpanded(true);
      setLastSeenIndex(entries.length);
      setUnreadCount(0);
    }
  };

  return (
    <div
      className={`fixed bottom-24 right-4 z-40 ${expanded ? "w-80" : "w-auto"}`}
      data-testid="voice-activity-dock"
    >
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-red-500/30 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
          onClick={handleToggle}
          data-testid="button-voice-activity-toggle"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative inline-flex">
              <Mic className={`h-3.5 w-3.5 ${isRecording ? "text-red-400" : "text-gray-400"}`} />
              {isRecording && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </span>
            <span className="text-xs font-semibold text-red-300">Voice activity</span>
            {entries.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 bg-gray-800/70 text-gray-300 border-gray-700/60"
              >
                {entries.length}
              </Badge>
            )}
            {!expanded && unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 bg-red-900/50 text-red-200 border-red-700/50 animate-pulse"
                data-testid="badge-voice-activity-unread"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-pilot toggle in the dock header — only shown when monitor data is present. */}
            {onAutopilotToggle && (
              <span
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                title="When on, voice recording auto-runs the entire case workup (parse → reasoning → evidence → research → master plan)."
              >
                <span className={`text-[9px] uppercase tracking-tight ${autopilotEligible ? 'text-gray-400' : 'text-gray-600'}`}>auto-pilot</span>
                <Switch
                  checked={!!autopilotEnabled}
                  onCheckedChange={(c) => onAutopilotToggle(!!c)}
                  disabled={!autopilotEligible}
                  className="scale-75 origin-right"
                  data-testid="switch-voice-autopilot"
                />
              </span>
            )}
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronUp className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </button>

        {/* AI Activity Monitor — visible at all times during recording so
             the clinician can see autopilot health even when the dock
             is collapsed. Outside the expanded gate by design. */}
        {monitorStages && monitorStages.length > 0 && (isRecording || expanded) && (
          <MonitorBlock
            stages={monitorStages}
            stability={monitorStability}
            autopilotEnabled={!!autopilotEnabled}
            paused={!!paused}
            eligible={autopilotEligible}
            onPauseToggle={onPauseToggle}
            onRerunFromStage={onRerunFromStage}
          />
        )}
        {expanded && (
          <div>
          <div className="border-t border-gray-800/60">
            {entries.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-gray-500 text-center">
                {isRecording
                  ? "Listening — auto-updates will appear here as you speak."
                  : "No voice activity yet."}
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="px-2 py-2 space-y-1.5">
                  {entries.map(entry => {
                    const summary = buildSummaryLine(entry);
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-md border px-2 py-1.5 ${
                          entry.undone
                            ? "bg-gray-800/40 border-gray-700/40 opacity-60"
                            : entry.noChanges
                              ? "bg-gray-800/50 border-gray-700/50"
                              : "bg-red-900/15 border-red-800/30"
                        }`}
                        data-testid={`voice-activity-entry-${entry.id}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-gray-400">
                              {fmtClock(entry.recordingTimeSec)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[8px] px-1 py-0 ${
                                entry.trigger === "silence_pause"
                                  ? "bg-amber-900/40 text-amber-300 border-amber-700/40"
                                  : "bg-blue-900/40 text-blue-300 border-blue-700/40"
                              }`}
                            >
                              {triggerLabel(entry.trigger)}
                            </Badge>
                          </div>
                          {!entry.noChanges && !entry.undone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[9px] gap-0.5 text-gray-300 hover:text-white hover:bg-gray-700/50"
                              onClick={() => onUndo(entry.id)}
                              data-testid={`button-voice-activity-undo-${entry.id}`}
                            >
                              <Undo2 className="h-2.5 w-2.5" />
                              Undo
                            </Button>
                          )}
                          {entry.undone && (
                            <span className="text-[9px] text-gray-500 italic">undone</span>
                          )}
                        </div>

                        <div className="mt-1 flex items-start gap-1">
                          <Activity className="h-2.5 w-2.5 text-gray-500 flex-shrink-0 mt-0.5" />
                          <p className={`text-[10px] leading-snug ${
                            entry.noChanges ? "text-gray-500 italic" : "text-gray-200"
                          }`}>
                            {summary}
                          </p>
                        </div>

                        {entry.clinicalSummary && (
                          <p className="text-[10px] text-blue-300/90 italic leading-snug mt-1">
                            {entry.clinicalSummary}
                          </p>
                        )}

                        <ChunkText text={entry.chunkText} />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
