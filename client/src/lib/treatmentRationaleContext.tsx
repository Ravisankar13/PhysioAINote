import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePlanCart } from "@/lib/planCart";
import { useOrchestratePlan } from "@/lib/orchestratePlanContext";
import type { OrchestratedSessionStep } from "@/components/skeleton/MyPlanRenderBlocks";

export interface RationaleClinicalContextInput {
  topHypothesis?: string;
  irritability?: string;
  stage?: string;
  recoveryPhase?: string;
  primaryRegion?: string;
  patientFactors?: string[] | Record<string, unknown>;
  constraints?: string[];
  painMarkers?: {
    count?: number;
    structures?: string[];
    mechanisms?: string[];
    severitySummary?: string;
  };
  slingDrivers?: Array<{ sling: string; role?: string; drivingFinding?: string }>;
  fascialTensions?: {
    activeChains?: string[];
    drivingChains?: string[];
    propagationCount?: number;
  };
  chainIntegrity?: Array<{ chain: string; score: number; issues?: string[] }>;
  compromisedTissues?: Array<{ name: string; status?: string; region?: string }>;
  scarLoad?: { scarCount?: number; adhesionCount?: number; regions?: string[] };
  forceHotspots?: Array<{ joint: string; peakForceN?: number; asymmetryIndex?: number; note?: string }>;
  posturalDeviations?: { summary?: string; severity?: string };
  thoracicStiffness?: string;
  tendonInflammation?: string[];
  naturalProgression?: { window?: string; chronicityRiskPercent?: number; recurrenceRiskPercent?: number };
}

export interface TreatmentRationaleDriver {
  label: string;
  detail: string;
  kind?: string;
}

export interface TreatmentRationaleItem {
  itemId: string;
  itemName: string;
  modality: string;
  why: string;
  addresses: string[];
}

export interface TreatmentRationaleResult {
  clinicalPicture: string;
  drivers: TreatmentRationaleDriver[];
  treatmentRationale: TreatmentRationaleItem[];
  orderingRationale: string;
  generatedAt: string;
}

interface TreatmentRationaleContextValue {
  rationale: TreatmentRationaleResult | null;
  isPending: boolean;
  error: Error | null;
  /** In-component trigger (used by the MasterPlanCard "Why this plan?"
   *  Generate / Refresh button). No-op while another request is in flight
   *  or the cart is empty. */
  generate: () => void;
  reset: () => void;
}

const TreatmentRationaleContext = createContext<TreatmentRationaleContextValue | null>(null);

interface TreatmentRationaleProviderProps {
  children: ReactNode;
  clinicalContext: RationaleClinicalContextInput;
  /** When true, automatically (re)generate the rationale every time a new
   *  orchestrated plan lands. Lets the rationale stay in sync with the
   *  AI-organised order without an extra click. Defaults to true. */
  autoOnOrchestrate?: boolean;
}

export function TreatmentRationaleProvider({
  children,
  clinicalContext,
  autoOnOrchestrate = true,
}: TreatmentRationaleProviderProps) {
  const { items } = usePlanCart();
  const { orchestrated } = useOrchestratePlan();
  const [rationale, setRationale] = useState<TreatmentRationaleResult | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const ctxRef = useRef(clinicalContext);
  ctxRef.current = clinicalContext;
  const orchestratedRef = useRef<typeof orchestrated>(orchestrated);
  orchestratedRef.current = orchestrated;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const sessionOrder: OrchestratedSessionStep[] | undefined = orchestratedRef.current?.sessionOrder;
      const result = await apiRequest("/api/treatment-plan/rationale", "POST", {
        items: itemsRef.current,
        clinicalContext: ctxRef.current,
        sessionOrder: sessionOrder && sessionOrder.length > 0 ? sessionOrder : undefined,
      });
      return result as TreatmentRationaleResult;
    },
    onSuccess: (data) => setRationale(data),
  });

  const generate = useCallback(() => {
    if (generateMutation.isPending) return;
    if (itemsRef.current.length < 1) return;
    generateMutation.mutate();
  }, [generateMutation]);

  const reset = useCallback(() => {
    setRationale(null);
    generateMutation.reset();
  }, [generateMutation]);

  // Auto-regenerate whenever a fresh orchestrated plan lands (so the
  // ordering rationale matches the AI's chosen order).
  const isPending = generateMutation.isPending;
  const mutate = generateMutation.mutate;
  const lastOrchestratedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoOnOrchestrate) return;
    if (!orchestrated) return;
    if (orchestrated.generatedAt === lastOrchestratedAtRef.current) return;
    if (itemsRef.current.length < 1) return;
    if (isPending) return;
    lastOrchestratedAtRef.current = orchestrated.generatedAt;
    mutate();
  }, [orchestrated, autoOnOrchestrate, isPending, mutate]);

  // Clear rationale if the cart is emptied, so we don't show stale text.
  useEffect(() => {
    if (items.length === 0 && rationale) {
      setRationale(null);
      lastOrchestratedAtRef.current = null;
    }
  }, [items.length, rationale]);

  const value = useMemo<TreatmentRationaleContextValue>(() => ({
    rationale,
    isPending: generateMutation.isPending,
    error: (generateMutation.error as Error | null) ?? null,
    generate,
    reset,
  }), [rationale, generateMutation.isPending, generateMutation.error, generate, reset]);

  return <TreatmentRationaleContext.Provider value={value}>{children}</TreatmentRationaleContext.Provider>;
}

export function useTreatmentRationale(): TreatmentRationaleContextValue {
  const ctx = useContext(TreatmentRationaleContext);
  if (!ctx) {
    return {
      rationale: null,
      isPending: false,
      error: null,
      generate: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
