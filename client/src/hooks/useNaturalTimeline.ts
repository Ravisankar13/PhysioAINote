import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type {
  NaturalTimelineRequestContext,
  NaturalTimelineResult,
  NaturalTimelineQA,
} from "@shared/schema";

interface Args {
  context: NaturalTimelineRequestContext | null;
  enabled?: boolean;
}

export function useNaturalTimeline({ context, enabled = true }: Args) {
  const [result, setResult] = useState<NaturalTimelineResult | null>(null);
  const [qaHistory, setQaHistory] = useState<NaturalTimelineQA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSigRef = useRef<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  const contextSig = useMemo(() => (context ? JSON.stringify(context) : null), [context]);

  const fetchTimeline = useCallback(async (ctx: NaturalTimelineRequestContext, qa: NaturalTimelineQA[]) => {
    if (inFlightRef.current) inFlightRef.current.abort();
    const ac = new AbortController();
    inFlightRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const r = await apiRequest("/api/clinical-text/natural-timeline", "POST", {
        context: ctx,
        qa_history: qa,
      });
      if (!ac.signal.aborted) {
        setResult(r as NaturalTimelineResult);
      }
    } catch (e) {
      if (!ac.signal.aborted) {
        setError(e instanceof Error ? e.message : "Failed to fetch natural timeline");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !context || !contextSig) return;
    if (lastSigRef.current === contextSig) return;
    lastSigRef.current = contextSig;
    // Clear stale timeline + Q&A immediately on context change so the
    // panel cannot momentarily show a verdict that no longer matches
    // the current clinical picture while the new request is in flight.
    setResult(null);
    setQaHistory([]);
    setError(null);
    fetchTimeline(context, []);
  }, [context, contextSig, enabled, fetchTimeline]);

  const answerQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!context || !result) return;
    const q = result.follow_up_questions.find(fq => fq.id === questionId);
    if (!q || !answer.trim()) return;
    const newHistory = [...qaHistory, { question: q.question, answer: answer.trim() }];
    setQaHistory(newHistory);
    setResult(prev => prev ? { ...prev, follow_up_questions: prev.follow_up_questions.filter(fq => fq.id !== questionId) } : prev);
    await fetchTimeline(context, newHistory);
  }, [context, qaHistory, result, fetchTimeline]);

  const refresh = useCallback(() => {
    if (!context) return;
    fetchTimeline(context, qaHistory);
  }, [context, qaHistory, fetchTimeline]);

  return {
    result,
    qaHistory,
    loading,
    error,
    answerQuestion,
    refresh,
  };
}
