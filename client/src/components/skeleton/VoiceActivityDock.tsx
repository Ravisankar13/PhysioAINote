import { useState, useEffect } from "react";
import { Mic, ChevronDown, ChevronUp, Undo2, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type VoiceTriggerReason = "silence_pause" | "interval_pulse";

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

export default function VoiceActivityDock({ entries, isRecording, visible, onUndo }: VoiceActivityDockProps) {
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
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronUp className="h-3 w-3 text-gray-400" />
          )}
        </button>

        {expanded && (
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
        )}
      </div>
    </div>
  );
}
