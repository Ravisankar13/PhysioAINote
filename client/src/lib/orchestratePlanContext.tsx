import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePlanCart } from "@/lib/planCart";
import type { OrchestratedPlanResult } from "@/components/skeleton/MyPlanRenderBlocks";

export interface ClinicalContextInput {
  topHypothesis?: string;
  irritability?: string;
  stage?: string;
  recoveryPhase?: string;
  patientFactors?: string[] | Record<string, unknown>;
  constraints?: string[];
  primaryRegion?: string;
}

interface OrchestratePlanContextValue {
  orchestrated: OrchestratedPlanResult | null;
  isPending: boolean;
  error: Error | null;
  /** In-component trigger (used by the MasterPlanCard / MyPlanPanel
   *  "Organize with AI" buttons). No-op while another request is in flight
   *  or the cart has fewer than 2 items. */
  organize: () => void;
  reset: () => void;
}

const OrchestratePlanContext = createContext<OrchestratePlanContextValue | null>(null);

interface OrchestratePlanProviderProps {
  children: ReactNode;
  clinicalContext: ClinicalContextInput;
  /** Optional external auto-trigger nonce. When this number changes
   *  (and the cart has >= 2 items), the provider fires one orchestration
   *  request — useful for the "Build full plan" cascade which needs to kick
   *  off orchestration without a click. Pass `null` to suppress. */
  autoOrganizeNonce?: number | null;
  /** Fired once the auto-trigger nonce has been consumed (i.e. the mutation
   *  was actually dispatched). Lets the host clear its nonce so re-mounts
   *  don't re-fire and so its state machine can return to idle. */
  onAutoTriggerConsumed?: () => void;
}

export function OrchestratePlanProvider({
  children,
  clinicalContext,
  autoOrganizeNonce,
  onAutoTriggerConsumed,
}: OrchestratePlanProviderProps) {
  const { items, count } = usePlanCart();
  const [orchestrated, setOrchestrated] = useState<OrchestratedPlanResult | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const ctxRef = useRef(clinicalContext);
  ctxRef.current = clinicalContext;

  const orchestrate = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/treatment-plan/orchestrate", "POST", {
        items: itemsRef.current,
        clinicalContext: ctxRef.current,
      });
      return result as OrchestratedPlanResult;
    },
    onSuccess: (data) => setOrchestrated(data),
  });

  const organize = useCallback(() => {
    if (orchestrate.isPending) return;
    if (itemsRef.current.length < 2) return;
    orchestrate.mutate();
  }, [orchestrate]);

  const reset = useCallback(() => {
    setOrchestrated(null);
    orchestrate.reset();
  }, [orchestrate]);

  // Consume the external auto-trigger nonce.
  const onConsumedRef = useRef(onAutoTriggerConsumed);
  useEffect(() => {
    onConsumedRef.current = onAutoTriggerConsumed;
  }, [onAutoTriggerConsumed]);
  const lastFiredNonceRef = useRef<number | null>(null);
  const isPending = orchestrate.isPending;
  const mutate = orchestrate.mutate;
  useEffect(() => {
    if (autoOrganizeNonce == null) return;
    if (autoOrganizeNonce === lastFiredNonceRef.current) return;
    if (count < 2) return;
    if (isPending) return;
    lastFiredNonceRef.current = autoOrganizeNonce;
    mutate();
    onConsumedRef.current?.();
  }, [autoOrganizeNonce, count, isPending, mutate]);

  const value = useMemo<OrchestratePlanContextValue>(() => ({
    orchestrated,
    isPending: orchestrate.isPending,
    error: (orchestrate.error as Error | null) ?? null,
    organize,
    reset,
  }), [orchestrated, orchestrate.isPending, orchestrate.error, organize, reset]);

  return <OrchestratePlanContext.Provider value={value}>{children}</OrchestratePlanContext.Provider>;
}

export function useOrchestratePlan(): OrchestratePlanContextValue {
  const ctx = useContext(OrchestratePlanContext);
  if (!ctx) {
    return {
      orchestrated: null,
      isPending: false,
      error: null,
      organize: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
