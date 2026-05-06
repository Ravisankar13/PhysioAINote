import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, Plus } from "lucide-react";

export type PlanCartModality =
  | "exercise"
  | "exercise_custom"
  | "manual_therapy"
  | "manual_therapy_custom"
  | "electrophysical"
  | "adjunct"
  | "lifestyle";

export interface PlanCartItem {
  id: string;
  modality: PlanCartModality;
  name: string;
  targetStructure?: string;
  targetFinding?: string;
  dosage?: string;
  rationale?: string;
  evidenceGrade?: string;
  contraindications?: string;
  parameters?: string;
  patientPosition?: string;
  category?: string;
  // Electrophysical Agents (EPA) structured fields — populated by the EPA
  // engine card so My Plan and downstream consumers can read the full
  // 4-dimension reasoning + structured dosing without re-parsing free text.
  mechanism?: 'electrical' | 'acoustic' | 'thermal' | 'photonic' | 'electromagnetic' | 'radiofrequency';
  targetTissue?: 'muscle' | 'tendon' | 'nerve' | 'bone' | 'joint' | 'skin_fascia';
  desiredEffect?: 'pain_reduction' | 'healing_stimulation' | 'muscle_activation' | 'swelling_reduction' | 'tissue_extensibility' | 'bone_healing';
  evidenceStrength?: 'strong' | 'moderate' | 'weak';
  dosing?: {
    intensity?: string;
    frequency_hz?: number;
    pulse_width_us?: number;
    duration_min?: number;
    sessions_per_week?: number;
    total_sessions?: number;
    placement?: string;
  };
  // Sling driver-analysis tags (Task #235). Set when an item was added either
  // (a) directly from the SlingAnalysisPanel "Plan from this analysis" CTA,
  // or (b) from an engine tab whose card matched a slingDrivenRecommendation.
  // Additive — existing items omit these without consequence.
  slingTag?: string;
  slingRole?: 'restore' | 'calm-compensatory' | 'address-driver';
  // Movement-mode sling spotlight tags (Task #345). Set when an item is added
  // from the per-part "Treat" action so downstream consumers can group items
  // by failing sling, by pathway part, and by the movement task that exposed
  // the dysfunction. Optional — pre-existing call sites omit these.
  slingId?: string;
  partId?: string;
  partKind?: 'muscle' | 'link' | 'attachment';
  movementTaskId?: string;
  // Task #376 — Treatment Mode structured preload. Set when an item is
  // committed from the Treatment HUD's "Perform" so the cart's
  // "Simulate" launcher can re-open Treatment Mode with the exact joint
  // / direction / grade / dose instead of falling back to text inference.
  treatmentParams?: {
    jointKey: string;
    directionId: string;
    grade: number;
    gradeSystem: 'maitland' | 'kaltenborn';
    amplitudeMm: number;
    frequencyHz: number;
    durationSec: number;
    holdSec: number;
    liveAxis: { x: number; y: number; z: number };
    contactRegion: string;
    positionPreset: string;
  };
}

interface PlanCartContextValue {
  items: PlanCartItem[];
  add: (item: PlanCartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  count: number;
  replaceAll: (items: PlanCartItem[]) => void;
}

const PlanCartContext = createContext<PlanCartContextValue | null>(null);

export function PlanCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PlanCartItem[]>([]);

  const add = useCallback((item: PlanCartItem) => {
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item]);
  }, []);
  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id: string) => items.some(i => i.id === id), [items]);
  const replaceAll = useCallback((next: PlanCartItem[]) => {
    setItems(Array.isArray(next) ? next : []);
  }, []);

  const value = useMemo(() => ({ items, add, remove, clear, has, count: items.length, replaceAll }), [items, add, remove, clear, has, replaceAll]);
  return <PlanCartContext.Provider value={value}>{children}</PlanCartContext.Provider>;
}

export function usePlanCart(): PlanCartContextValue {
  const ctx = useContext(PlanCartContext);
  if (!ctx) {
    return {
      items: [],
      add: () => {},
      remove: () => {},
      clear: () => {},
      has: () => false,
      count: 0,
      replaceAll: () => {},
    };
  }
  return ctx;
}

export function AddToPlanButton({ item, size = "sm" }: { item: PlanCartItem; size?: "sm" | "xs" }) {
  const { add, remove, has } = usePlanCart();
  const inPlan = has(item.id);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inPlan) remove(item.id);
    else add(item);
  };
  const sizing = size === "xs"
    ? "px-1.5 py-0.5 text-[8px]"
    : "px-2 py-0.5 text-[9px]";
  return (
    <button
      onClick={handleClick}
      className={`${sizing} rounded-full inline-flex items-center gap-1 transition-colors border ${
        inPlan
          ? "bg-emerald-500/25 text-emerald-200 border-emerald-500/50 hover:bg-emerald-500/35"
          : "bg-white/5 text-gray-300 border-white/10 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400/40"
      }`}
      title={inPlan ? "Remove from plan" : "Add to plan"}
      data-testid={`button-add-to-plan-${item.id}`}
    >
      {inPlan ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
      {inPlan ? "Added" : "Add to Plan"}
    </button>
  );
}

export function makeCartId(modality: PlanCartModality, key: string): string {
  return `${modality}::${key.replace(/\s+/g, "_").toLowerCase()}`;
}
