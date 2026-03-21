import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, ToggleLeft, ToggleRight, Move3D, Loader2, Sparkles, AlertTriangle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
        isUser
          ? "bg-teal-600/30 border border-teal-500/30 text-gray-100"
          : "bg-gray-800/60 border border-gray-700/30 text-gray-200"
      }`}>
        <div className="whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none
          [&_strong]:text-teal-300 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-700/50 px-1 rounded text-xs">$1</code>')
    .replace(/^- (.*)/gm, '<span class="block pl-2 border-l-2 border-teal-500/30 ml-1 mb-1">$1</span>')
    .replace(/^(\d+)\. (.*)/gm, '<span class="block pl-2 ml-1 mb-1"><span class="text-teal-400 mr-1">$1.</span>$2</span>');
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
  const [initialSummaryLoaded, setInitialSummaryLoaded] = useState(false);
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
      setInitialSummaryLoaded(false);
      fetchInitialSummary(hypothesis);
    }
  }, [hypothesis?.id, isOpen]);

  const streamRequest = useCallback(async (
    hyp: HypothesisData,
    chatMessages: ChatMessage[],
    opts?: { poseToHypothesis?: boolean }
  ) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);
    setStreamingContent("");

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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

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
        setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
      }
      setStreamingContent("");
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [includeSkeletonData, skeletonData, subjectiveHistory, onPoseCommand, toast]);

  const fetchInitialSummary = useCallback(async (hyp: HypothesisData) => {
    const initialMsg: ChatMessage = {
      role: "user",
      content: `Provide a comprehensive clinical summary for the hypothesis: "${hyp.condition}" (${hyp.confidence}% confidence). Include clinical narrative, how findings connect, confirmatory tests, treatment approach, and red flags.`
    };
    await streamRequest(hyp, [initialMsg]);
    setInitialSummaryLoaded(true);
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

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/30 text-gray-200">
              <div className="whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none
                [&_strong]:text-teal-300 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent) }}
              />
              <span className="inline-block w-1.5 h-4 bg-teal-400 animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="rounded-lg px-3 py-2 bg-gray-800/60 border border-gray-700/30">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing hypothesis...
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
