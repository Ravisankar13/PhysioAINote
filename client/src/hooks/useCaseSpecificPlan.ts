import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { buildPatientContextSig } from "@/lib/patientContextSig";
import type {
  CaseSpecificTreatmentPlan,
  CaseSpecificTreatmentPlanRequest,
  NaturalTimelineQA,
  NaturalTimelineRequestContext,
  NaturalTimelineResult,
  PatientContextPayload,
} from "@shared/schema";

interface Args {
  context: NaturalTimelineRequestContext | null;
  naturalTimeline: NaturalTimelineResult | null;
  phases: Array<{ id: string; name: string; subtitle?: string }>;
  archetypeId?: string;
  conditionLabel?: string;
  qaHistory?: NaturalTimelineQA[];
  enabled?: boolean;
  /** Stable dedup signature. The hook only refetches when this signature
   *  changes — NOT every time the context object identity changes. The
   *  full context is still POSTed; the signature only controls when to
   *  refetch. Mirrors the natural-timeline hook so live skeleton drift
   *  cannot retrigger an AI fetch. */
  signature?: string | null;
  /** Optional AI-curated patient-context payload. Forwarded into the
   *  AI as `patient_context` so the case-specific prescription is
   *  personalised (dosage, contraindication-safe technique selection,
   *  adherence-friendly modalities). */
  patientContext?: PatientContextPayload;
}

export function useCaseSpecificPlan({
  context,
  naturalTimeline,
  phases,
  archetypeId,
  conditionLabel,
  qaHistory,
  enabled = true,
  signature,
  patientContext,
}: Args) {
  const [result, setResult] = useState<CaseSpecificTreatmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** PatientContext signature that the *current* `result` was generated
   *  with. Lets consumers tell whether the displayed plan already
   *  reflects the latest clinician-supplied context, or is mid-refresh. */
  const [appliedPatientContextSig, setAppliedPatientContextSig] = useState<string>('');
  const lastSigRef = useRef<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Latest inputs live in refs so the debounced fetch always reads the
  // freshest snapshot without the effect itself depending on object
  // identity (which changes every render).
  const ctxRef = useRef(context);
  const ntRef = useRef(naturalTimeline);
  const phasesRef = useRef(phases);
  const qaRef = useRef(qaHistory ?? []);
  const archIdRef = useRef(archetypeId);
  const condRef = useRef(conditionLabel);
  const patientContextRef = useRef<PatientContextPayload | undefined>(patientContext);
  ctxRef.current = context;
  ntRef.current = naturalTimeline;
  phasesRef.current = phases;
  qaRef.current = qaHistory ?? [];
  archIdRef.current = archetypeId;
  condRef.current = conditionLabel;
  patientContextRef.current = patientContext;

  const patientContextSig = useMemo(
    () => buildPatientContextSig(patientContext),
    [patientContext],
  );

  const fallbackSig = useMemo(
    () => (signature !== undefined
      ? null
      : (context && naturalTimeline && phases.length > 0)
        ? JSON.stringify({ c: context, n: naturalTimeline, p: phases })
        : null),
    [signature, context, naturalTimeline, phases],
  );
  const baseSig = signature !== undefined ? signature : fallbackSig;
  const effectiveSig = useMemo(
    () => (baseSig === null ? null : `${baseSig}::pc=${patientContextSig}`),
    [baseSig, patientContextSig],
  );

  const fetchPlan = useCallback(async () => {
    const ctx = ctxRef.current;
    const nt = ntRef.current;
    const ph = phasesRef.current;
    if (!ctx || !nt || !ph || ph.length === 0) return;
    if (inFlightRef.current) inFlightRef.current.abort();
    const ac = new AbortController();
    inFlightRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const pc = patientContextRef.current;
      const pcPayload = pc && ((pc.free_form ?? '').trim() || (pc.answers && pc.answers.length > 0)) ? pc : undefined;
      const body: CaseSpecificTreatmentPlanRequest = {
        context: ctx,
        natural_timeline: nt,
        phases: ph,
        archetype_id: archIdRef.current,
        condition_label: condRef.current,
        qa_history: qaRef.current,
        patient_context: pcPayload,
      };
      const r = await apiRequest("/api/clinical-text/case-specific-treatment-plan", "POST", body);
      if (!ac.signal.aborted) {
        setResult(r as CaseSpecificTreatmentPlan);
        setAppliedPatientContextSig(buildPatientContextSig(pcPayload));
      }
    } catch (e) {
      if (!ac.signal.aborted) {
        setError(e instanceof Error ? e.message : "Failed to fetch case-specific treatment plan");
        // Hard error: clear stale plan so the UI doesn't keep showing
        // a result that no longer reflects the current inputs.
        setResult(null);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !effectiveSig) return;
    if (!ctxRef.current || !ntRef.current || phasesRef.current.length === 0) return;
    if (lastSigRef.current === effectiveSig) return;
    lastSigRef.current = effectiveSig;
    // Keep prior result visible while a refresh is in flight
    // (`loading=true` acts as a "Refreshing…" signal).
    setError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void fetchPlan();
    }, 500);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [effectiveSig, enabled, fetchPlan]);

  const refresh = useCallback(() => {
    void fetchPlan();
  }, [fetchPlan]);

  return {
    result,
    loading,
    error,
    refresh,
    appliedPatientContextSig,
    currentPatientContextSig: patientContextSig,
  };
}
