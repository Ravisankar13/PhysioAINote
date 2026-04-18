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
  /** Optional stable dedup key. When provided, the hook only refetches
   *  when this signature changes — NOT every time the `context` object
   *  identity changes. Use this to filter out high-frequency live
   *  fields (live joint angles, postural drift, etc.) that should not
   *  trigger a new AI request. The full context is still POSTed; the
   *  signature only controls when to refetch. */
  signature?: string | null;
}

export function useNaturalTimeline({ context, enabled = true, signature }: Args) {
  const [result, setResult] = useState<NaturalTimelineResult | null>(null);
  const [qaHistory, setQaHistory] = useState<NaturalTimelineQA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSigRef = useRef<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  // Latest context lives in a ref so the debounced fetch always reads
  // the freshest snapshot without the effect itself depending on the
  // context object identity (which changes every render).
  const contextRef = useRef<NaturalTimelineRequestContext | null>(context);
  contextRef.current = context;

  // Fall back to JSON.stringify of the context only when no explicit
  // signature is supplied (preserves the legacy behaviour for callers
  // that haven't migrated yet).
  const fallbackSig = useMemo(
    () => (signature !== undefined ? null : context ? JSON.stringify(context) : null),
    [signature, context],
  );
  const effectiveSig = signature !== undefined ? signature : fallbackSig;

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
    if (!enabled || !effectiveSig || !contextRef.current) return;
    if (lastSigRef.current === effectiveSig) return;
    const isFirstFetch = lastSigRef.current === null;
    lastSigRef.current = effectiveSig;
    // IMPORTANT: do NOT clear `result`/`qaHistory` here. Wiping state
    // on every signature change caused the chart to flicker back to
    // "Loading…" while the new request was in flight, even though the
    // previous AI verdict was still clinically valid. We keep the old
    // verdict visible (with `loading=true` acting as a "Refreshing…"
    // signal) and only overwrite once the new response lands.
    setError(null);
    // Debounce so a flurry of state updates after the simulator opens
    // collapses to a single POST. First fetch fires faster (50ms) so
    // the panel doesn't feel sluggish; subsequent refetches use a
    // slightly longer trailing window.
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const delay = isFirstFetch ? 50 : 500;
    debounceRef.current = window.setTimeout(() => {
      const latest = contextRef.current;
      if (!latest) return;
      fetchTimeline(latest, []);
      // Reset Q&A history when the underlying clinical signature
      // actually changes — the new question set is keyed off the new
      // verdict.
      setQaHistory([]);
    }, delay);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [effectiveSig, enabled, fetchTimeline]);

  const answerQuestion = useCallback(async (questionId: string, answer: string) => {
    const ctx = contextRef.current;
    if (!ctx || !result) return;
    const q = result.follow_up_questions.find(fq => fq.id === questionId);
    if (!q || !answer.trim()) return;
    const newHistory = [...qaHistory, { question: q.question, answer: answer.trim() }];
    setQaHistory(newHistory);
    setResult(prev => prev ? { ...prev, follow_up_questions: prev.follow_up_questions.filter(fq => fq.id !== questionId) } : prev);
    await fetchTimeline(ctx, newHistory);
  }, [qaHistory, result, fetchTimeline]);

  const refresh = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    fetchTimeline(ctx, qaHistory);
  }, [qaHistory, fetchTimeline]);

  return {
    result,
    qaHistory,
    loading,
    error,
    answerQuestion,
    refresh,
  };
}
