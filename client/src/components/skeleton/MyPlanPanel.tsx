import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { usePlanCart, type PlanCartItem, type PlanCartModality } from "@/lib/planCart";
import { useOrchestratePlan } from "@/lib/orchestratePlanContext";
import { useTreatmentRationale } from "@/lib/treatmentRationaleContext";
import {
  CartItemRow,
  ConflictList,
  FrequencyList,
  MODALITY_META,
  OrchestratedSummaryCard,
  PhaseCards,
  RecoveryTimeline,
  SessionOrderStrip,
  TreatmentRationaleSection,
  WeeklyScheduleGrid,
} from "@/components/skeleton/MyPlanRenderBlocks";

// Re-export the type for backwards compatibility with any external imports.
export type { OrchestratedPlanResult } from "@/components/skeleton/MyPlanRenderBlocks";

export default function MyPlanPanel() {
  const { items, remove, clear, count } = usePlanCart();
  const { orchestrated, isPending, error, organize, reset } = useOrchestratePlan();
  const {
    rationale,
    isPending: rationalePending,
    error: rationaleError,
    generate: generateRationale,
    source: rationaleSource,
    isStale: rationaleStale,
  } = useTreatmentRationale();
  const [showCart, setShowCart] = useState(true);

  const grouped = items.reduce<Record<PlanCartModality, PlanCartItem[]>>((acc, it) => {
    (acc[it.modality] ||= []).push(it);
    return acc;
  }, {} as Record<PlanCartModality, PlanCartItem[]>);

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-10">
        <div className="p-3 rounded-full bg-cyan-500/10 mb-3">
          <Sparkles className="h-6 w-6 text-cyan-400/60" />
        </div>
        <p className="text-xs text-gray-300 mb-1">Your plan is empty</p>
        <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">
          Open Exercise, Manual Rx, Electrophysical Agents, or Adjunct Rx, generate items, then click <span className="text-cyan-300 font-medium">+ Add to Plan</span> on any item to bring it in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowCart(s => !s)}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-200"
          data-testid="button-toggle-cart"
        >
          {showCart ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Items in plan ({count})
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clear}
            className="text-[9px] text-gray-400 hover:text-red-300 inline-flex items-center gap-1"
            data-testid="button-clear-cart"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <button
            onClick={organize}
            disabled={isPending || count < 2}
            className="text-[10px] px-3 py-1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            data-testid="button-organize-with-ai"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {orchestrated ? "Re-organize" : "Organize with AI"}
          </button>
        </div>
      </div>

      {/* Treatment Rationale — "Why this plan?" (Task #274). Sits at the
          top of the panel body so the clinician sees the rationale that
          ties the plan back to the clinical picture before scrolling
          through the items themselves. */}
      <TreatmentRationaleSection
        rationale={rationale}
        items={items}
        isPending={rationalePending}
        error={rationaleError}
        onGenerate={generateRationale}
        source={rationaleSource}
        isStale={rationaleStale}
        hasOrchestratedOrder={!!orchestrated && orchestrated.sessionOrder.length > 0}
        hidePerItemBlock
      />

      {showCart && (
        <div className="space-y-2">
          {(Object.keys(grouped) as PlanCartModality[]).map(modality => {
            const meta = MODALITY_META[modality];
            const list = grouped[modality];
            return (
              <div key={modality} className="space-y-1">
                <div className={`text-[9px] uppercase tracking-wider font-semibold ${meta.color}`}>{meta.label} ({list.length})</div>
                <div className="space-y-1">
                  {list.map(it => {
                    const r = rationale?.treatmentRationale.find(x => x.itemId === it.id);
                    return (
                      <CartItemRow
                        key={it.id}
                        item={it}
                        onRemove={() => remove(it.id)}
                        whyText={r?.why}
                        whyAddresses={r?.addresses}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {count < 2 && (
            <p className="text-[9px] text-gray-500 italic">Add at least 2 items, then click Organize with AI.</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-200 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error.message || "Could not organize the plan. Try again."}</span>
        </div>
      )}

      {orchestrated && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <OrchestratedSummaryCard orchestrated={orchestrated} onDiscard={reset} />
          <ConflictList conflicts={orchestrated.conflicts} />
          <SessionOrderStrip steps={orchestrated.sessionOrder} items={items} />
          <FrequencyList frequencies={orchestrated.frequencies} items={items} />
          <WeeklyScheduleGrid schedule={orchestrated.weeklySchedule} items={items} totalWeeks={orchestrated.totalDurationWeeks} frequencies={orchestrated.frequencies} />
          <PhaseCards phases={orchestrated.phases} items={items} />
          <RecoveryTimeline milestones={orchestrated.timeline} totalWeeks={orchestrated.totalDurationWeeks} />
        </div>
      )}
    </div>
  );
}
