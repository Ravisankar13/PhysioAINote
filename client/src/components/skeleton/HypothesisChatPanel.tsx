import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Send, ToggleLeft, ToggleRight, Move3D, Loader2, Sparkles, Stethoscope, Link2, ClipboardCheck, HeartPulse, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

export interface HypothesisData {
  id: string;
  condition: string;
  confidence: number;
  supportingEvidence: string[];
  rulingOutFactors: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isInitialSummary?: boolean;
}

interface HypothesisChatPanelProps {
  hypothesis: HypothesisData | null;
  isOpen: boolean;
  onClose: () => void;
  onPoseCommand: (poseData: Record<string, any>) => void;
  subjectiveHistory?: string;
  skeletonData?: {
    posture: Record<string, Record<string, number>>;
    painMarkers: Array<{ label?: string; anatomicalLabel?: string; nearestBone?: string; type?: string; severity?: number }>;
    forces: Array<{ label: string; totalForce?: number; status: string }>;
    muscles: Array<{ name: string; status: string; activation: number }>;
  };
}

const SECTION_DEFS = [
  { key: "clinical_narrative", label: "Clinical Narrative", icon: Stethoscope, borderColor: "border-teal-500/30", bgColor: "bg-teal-500/10", iconColor: "text-teal-400", headerBg: "bg-teal-500/15" },
  { key: "key_findings", label: "Key Findings", icon: Link2, borderColor: "border-blue-500/30", bgColor: "bg-blue-500/10", iconColor: "text-blue-400", headerBg: "bg-blue-500/15" },
  { key: "confirmatory_tests", label: "Confirmatory Tests", icon: ClipboardCheck, borderColor: "border-amber-500/30", bgColor: "bg-amber-500/10", iconColor: "text-amber-400", headerBg: "bg-amber-500/15" },
  { key: "treatment_approach", label: "Treatment Approach", icon: HeartPulse, borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/10", iconColor: "text-emerald-400", headerBg: "bg-emerald-500/15" },
  { key: "red_flags", label: "Red Flags", icon: AlertTriangle, borderColor: "border-red-500/30", bgColor: "bg-red-500/10", iconColor: "text-red-400", headerBg: "bg-red-500/15" },
] as const;

type SectionKey = typeof SECTION_DEFS[number]["key"];

interface ParsedSections {
  preamble: string;
  sections: Record<SectionKey, string>;
}

function parseSections(text: string): ParsedSections {
  const result: ParsedSections = {
    preamble: "",
    sections: {
      clinical_narrative: "",
      key_findings: "",
      confirmatory_tests: "",
      treatment_approach: "",
      red_flags: "",
    },
  };

  const headerPattern = /^##\s+(Clinical Narrative|Key Findings(?:\s+Connection)?|Confirmatory Tests|Treatment Approach|Red Flags)[:\s]*$/im;
  const headerMap: Record<string, SectionKey> = {
    "clinical narrative": "clinical_narrative",
    "key findings": "key_findings",
    "key findings connection": "key_findings",
    "confirmatory tests": "confirmatory_tests",
    "treatment approach": "treatment_approach",
    "red flags": "red_flags",
  };

  const lines = text.split("\n");
  let currentSection: SectionKey | null = null;
  const sectionLines: Record<SectionKey | "preamble", string[]> = {
    preamble: [],
    clinical_narrative: [],
    key_findings: [],
    confirmatory_tests: [],
    treatment_approach: [],
    red_flags: [],
  };

  for (const line of lines) {
    const match = line.match(headerPattern);
    if (match) {
      currentSection = headerMap[match[1].toLowerCase()] || null;
    } else if (currentSection) {
      sectionLines[currentSection].push(line);
    } else {
      sectionLines.preamble.push(line);
    }
  }

  result.preamble = sectionLines.preamble.join("\n").trim();
  for (const def of SECTION_DEFS) {
    result.sections[def.key] = sectionLines[def.key].join("\n").trim();
  }

  return result;
}

function hasAnySections(text: string): boolean {
  return /^##\s+(Clinical Narrative|Key Findings(?:\s+Connection)?|Confirmatory Tests|Treatment Approach|Red Flags)[:\s]*$/im.test(text);
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 70 ? "text-emerald-400 bg-emerald-500/20" :
                confidence >= 40 ? "text-amber-400 bg-amber-500/20" :
                "text-red-400 bg-red-500/20";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {confidence}%
    </span>
  );
}

function renderMarkdownLine(line: string, key: number) {
  const parts: Array<string | JSX.Element> = [];
  let remaining = line;
  let partIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`(.*?)`/);
    const italicMatch = remaining.match(/\*(.*?)\*/);

    let firstMatch: { idx: number; len: number; el: JSX.Element } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      const el = <strong key={`b${partIdx}`} className="text-teal-300 font-semibold">{boldMatch[1]}</strong>;
      if (!firstMatch || boldMatch.index < firstMatch.idx) {
        firstMatch = { idx: boldMatch.index, len: boldMatch[0].length, el };
      }
    }
    if (codeMatch && codeMatch.index !== undefined) {
      const el = <code key={`c${partIdx}`} className="bg-gray-700/50 px-1 rounded text-xs">{codeMatch[1]}</code>;
      if (!firstMatch || codeMatch.index < firstMatch.idx) {
        firstMatch = { idx: codeMatch.index, len: codeMatch[0].length, el };
      }
    }
    if (italicMatch && italicMatch.index !== undefined && (!boldMatch || italicMatch.index !== boldMatch.index)) {
      const el = <em key={`i${partIdx}`}>{italicMatch[1]}</em>;
      if (!firstMatch || italicMatch.index < firstMatch.idx) {
        firstMatch = { idx: italicMatch.index, len: italicMatch[0].length, el };
      }
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.idx > 0) {
      parts.push(remaining.slice(0, firstMatch.idx));
    }
    parts.push(firstMatch.el);
    partIdx++;
    remaining = remaining.slice(firstMatch.idx + firstMatch.len);
  }

  return <span key={key}>{parts}</span>;
}

function FormattedContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="whitespace-pre-wrap leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const bulletMatch = line.match(/^- (.*)/);
        if (bulletMatch) {
          return (
            <div key={idx} className="block pl-2 border-l-2 border-teal-500/30 ml-1 mb-1">
              {renderMarkdownLine(bulletMatch[1], idx)}
            </div>
          );
        }
        const numberedMatch = line.match(/^(\d+)\. (.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="block pl-2 ml-1 mb-1">
              <span className="text-teal-400 mr-1">{numberedMatch[1]}.</span>
              {renderMarkdownLine(numberedMatch[2], idx)}
            </div>
          );
        }
        return <div key={idx}>{renderMarkdownLine(line, idx)}</div>;
      })}
    </div>
  );
}

function SectionCard({ sectionDef, content, isStreaming, isUpcoming, showAlways, defaultExpanded }: {
  sectionDef: typeof SECTION_DEFS[number];
  content: string;
  isStreaming: boolean;
  isUpcoming?: boolean;
  showAlways?: boolean;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = sectionDef.icon;
  const hasContent = content.length > 0;

  useEffect(() => {
    if (hasContent && defaultExpanded) {
      setIsExpanded(true);
    }
  }, [hasContent, defaultExpanded]);

  if (!hasContent && !isStreaming && !isUpcoming && !showAlways) {
    return null;
  }

  if (isUpcoming && !hasContent) {
    return (
      <div className={`rounded-lg border ${sectionDef.borderColor} overflow-hidden mb-2 opacity-40`}>
        <div className={`flex items-center gap-2 px-3 py-2 ${sectionDef.headerBg}`}>
          <Icon className={`h-3.5 w-3.5 ${sectionDef.iconColor} flex-shrink-0`} />
          <span className="text-xs font-semibold text-gray-100 flex-1 text-left">{sectionDef.label}</span>
          <div className="h-1.5 w-8 bg-gray-600/50 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={`rounded-lg border ${sectionDef.borderColor} overflow-hidden mb-2`}>
        <CollapsibleTrigger asChild>
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 ${sectionDef.headerBg} hover:brightness-110 transition-all`}
          >
            <Icon className={`h-3.5 w-3.5 ${sectionDef.iconColor} flex-shrink-0`} />
            <span className="text-xs font-semibold text-gray-100 flex-1 text-left">{sectionDef.label}</span>
            {isStreaming && hasContent && (
              <span className="inline-block w-1.5 h-3 bg-teal-400 animate-pulse rounded-sm" />
            )}
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={`px-3 py-2 ${sectionDef.bgColor}`}>
            {hasContent ? (
              <div className="text-xs text-gray-200 leading-relaxed">
                <FormattedContent text={content} />
              </div>
            ) : isStreaming ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">No data available for this section.</div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StructuredSummaryView({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const parsed = useMemo(() => parseSections(content), [content]);

  const activeSectionIdx = useMemo(() => {
    for (let i = SECTION_DEFS.length - 1; i >= 0; i--) {
      if (parsed.sections[SECTION_DEFS[i].key].length > 0) return i;
    }
    return -1;
  }, [parsed]);

  return (
    <div className="space-y-0">
      {parsed.preamble && (
        <div className="text-xs text-gray-300 mb-2 leading-relaxed">
          <FormattedContent text={parsed.preamble} />
        </div>
      )}
      {SECTION_DEFS.map((def, idx) => {
        const sectionContent = parsed.sections[def.key];
        const isActivelyStreaming = isStreaming && idx === activeSectionIdx;
        const isUpcoming = isStreaming && idx > activeSectionIdx;
        const showAlways = !isStreaming;

        return (
          <SectionCard
            key={def.key}
            sectionDef={def}
            content={sectionContent}
            isStreaming={isActivelyStreaming}
            isUpcoming={isUpcoming && !sectionContent}
            showAlways={showAlways}
            defaultExpanded={idx === 0 || idx === activeSectionIdx}
          />
        );
      })}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
        isUser
          ? "bg-teal-600/30 border border-teal-500/30 text-gray-100"
          : "bg-gray-800/60 border border-gray-700/30 text-gray-200"
      }`}>
        <FormattedContent text={message.content} />
      </div>
    </div>
  );
}

export default function HypothesisChatPanel({
  hypothesis,
  isOpen,
  onClose,
  onPoseCommand,
  subjectiveHistory,
  skeletonData,
}: HypothesisChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [includeSkeletonData, setIncludeSkeletonData] = useState(true);
  const [isPosing, setIsPosing] = useState(false);
  const [isInitialStream, setIsInitialStream] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevHypothesisIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    if (hypothesis && isOpen && hypothesis.id !== prevHypothesisIdRef.current) {
      prevHypothesisIdRef.current = hypothesis.id;
      setMessages([]);
      setStreamingContent("");
      setInputValue("");
      setIsInitialStream(false);
      fetchInitialSummary(hypothesis);
    }
    if (!isOpen && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [hypothesis?.id, isOpen]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const streamRequest = useCallback(async (
    hyp: HypothesisData,
    chatMessages: ChatMessage[],
    opts?: { poseToHypothesis?: boolean; isInitial?: boolean }
  ) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);
    setStreamingContent("");
    if (opts?.isInitial) setIsInitialStream(true);

    try {
      const response = await fetch("/api/physiogpt/hypothesis-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hypothesis: {
            condition: hyp.condition,
            confidence: hyp.confidence,
            supportingEvidence: hyp.supportingEvidence,
            rulingOutFactors: hyp.rulingOutFactors,
          },
          messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
          subjectiveHistory,
          skeletonData: includeSkeletonData ? skeletonData : undefined,
          includeSkeletonData,
          poseToHypothesis: opts?.poseToHypothesis || false,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to stream");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (data.type) {
                  case "chunk":
                    accumulated += data.data;
                    setStreamingContent(accumulated);
                    break;
                  case "poseCommand":
                    onPoseCommand(data.data);
                    break;
                  case "error":
                    toast({ title: "Error", description: data.data, variant: "destructive" });
                    break;
                  case "done":
                    break;
                }
              } catch {}
            }
          }
        }
      }

      if (accumulated) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: accumulated,
          isInitialSummary: opts?.isInitial,
        }]);
      }
      setStreamingContent("");
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
      setIsInitialStream(false);
    }
  }, [includeSkeletonData, skeletonData, subjectiveHistory, onPoseCommand, toast]);

  const fetchInitialSummary = useCallback(async (hyp: HypothesisData) => {
    const initialMsg: ChatMessage = {
      role: "user",
      content: `Provide a comprehensive clinical summary for the hypothesis: "${hyp.condition}" (${hyp.confidence}% confidence). Include clinical narrative, how findings connect, confirmatory tests, treatment approach, and red flags.`,
      isInitialSummary: true,
    };
    await streamRequest(hyp, [initialMsg], { isInitial: true });
  }, [streamRequest]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !hypothesis || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: inputValue.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    await streamRequest(hypothesis, updatedMessages);
  }, [inputValue, hypothesis, isStreaming, messages, streamRequest]);

  const handlePoseToHypothesis = useCallback(async () => {
    if (!hypothesis || isStreaming) return;
    setIsPosing(true);
    const poseMsg: ChatMessage = {
      role: "user",
      content: `Pose the 3D skeleton to match the typical clinical presentation of "${hypothesis.condition}". Show the characteristic postural deviations and compensations.`
    };
    const updatedMessages = [...messages, poseMsg];
    setMessages(updatedMessages);
    await streamRequest(hypothesis, updatedMessages, { poseToHypothesis: true });
    setIsPosing(false);
  }, [hypothesis, isStreaming, messages, streamRequest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen || !hypothesis) return null;

  const initialSummaryMsg = messages.find(m => m.isInitialSummary && m.role === "assistant");
  const followUpMessages = messages.filter(m => !m.isInitialSummary);
  const hasFollowUps = followUpMessages.length > 0;

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right-5 duration-300">
      <div className="flex-shrink-0 border-b border-gray-700/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Stethoscope className="h-4 w-4 text-teal-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-100 truncate">{hypothesis.condition}</h3>
            <ConfidenceBadge confidence={hypothesis.confidence} />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeSkeletonData(!includeSkeletonData)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
              includeSkeletonData
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:border-gray-600/50"
            }`}
          >
            {includeSkeletonData ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            Skeleton Data
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 gap-1"
            onClick={handlePoseToHypothesis}
            disabled={isStreaming || isPosing}
          >
            {isPosing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Move3D className="h-3 w-3" />}
            Pose to Hypothesis
          </Button>
        </div>

        {hypothesis.supportingEvidence.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hypothesis.supportingEvidence.slice(0, 3).map((ev, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                {ev.length > 40 ? ev.slice(0, 40) + "..." : ev}
              </span>
            ))}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && !streamingContent && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Sparkles className="h-8 w-8 mb-2 text-teal-500/40" />
            <p className="text-xs">Generating clinical summary...</p>
          </div>
        )}

        {isInitialStream && isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="rounded-lg px-3 py-2 bg-gray-800/60 border border-gray-700/30">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing hypothesis...
              </div>
            </div>
          </div>
        )}

        {isInitialStream && streamingContent && (
          hasAnySections(streamingContent) ? (
            <div className="mb-3">
              <StructuredSummaryView content={streamingContent} isStreaming={true} />
            </div>
          ) : (
            <div className="flex justify-start mb-3">
              <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/30 text-gray-200">
                <FormattedContent text={streamingContent} />
                <span className="inline-block w-1.5 h-4 bg-teal-400 animate-pulse ml-0.5" />
              </div>
            </div>
          )
        )}

        {!isInitialStream && initialSummaryMsg && hasAnySections(initialSummaryMsg.content) && (
          <div className="mb-3">
            <StructuredSummaryView content={initialSummaryMsg.content} isStreaming={false} />
          </div>
        )}

        {!isInitialStream && initialSummaryMsg && !hasAnySections(initialSummaryMsg.content) && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/30 text-gray-200">
              <FormattedContent text={initialSummaryMsg.content} />
            </div>
          </div>
        )}

        {!isInitialStream && hasFollowUps && initialSummaryMsg && (
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-gray-700/50" />
            <span className="text-[10px] text-gray-500 font-medium">Follow-up</span>
            <div className="flex-1 h-px bg-gray-700/50" />
          </div>
        )}

        {!isInitialStream && followUpMessages.map((msg, idx) => (
          <MessageBubble key={`followup-${idx}`} message={msg} />
        ))}

        {!isInitialStream && streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/30 text-gray-200">
              <FormattedContent text={streamingContent} />
              <span className="inline-block w-1.5 h-4 bg-teal-400 animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        {!isInitialStream && isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="rounded-lg px-3 py-2 bg-gray-800/60 border border-gray-700/30">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-700/50 p-3">
        <div className="flex items-center gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this hypothesis..."
            className="flex-1 bg-gray-800/50 border border-gray-700/30 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-teal-500/50 min-h-[38px] max-h-[80px]"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="h-9 w-9 bg-teal-600 hover:bg-teal-700 flex-shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
