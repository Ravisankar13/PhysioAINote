import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ExternalLink,
  FileText,
  Hand,
  Leaf,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import { usePlanCart, type PlanCartItem, type PlanCartModality } from "@/lib/planCart";
import { useOrchestratePlan } from "@/lib/orchestratePlanContext";
import { useTreatmentRationale, type RationaleClinicalContextInput } from "@/lib/treatmentRationaleContext";
import { getDriverLabelsByItemId } from "@/lib/treatmentRationaleLocal";
import { MasterPlanInputStrip, hasInputContextData } from "@/components/skeleton/MasterPlanInputStrip";
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

export type PillKey = "exercise" | "manual" | "electro" | "adjunct";

export interface MasterPlanPillRefs {
  exercise: RefObject<HTMLElement>;
  manual: RefObject<HTMLElement>;
  electro: RefObject<HTMLElement>;
  adjunct: RefObject<HTMLElement>;
}

const PILL_META: Record<PillKey, { color: string; label: string; icon: typeof Dumbbell }> = {
  exercise: { color: "#a78bfa", label: "Exercise", icon: Dumbbell },
  manual: { color: "#fb7185", label: "Manual", icon: Hand },
  electro: { color: "#fbbf24", label: "EPA", icon: Zap },
  adjunct: { color: "#34d399", label: "Adjunct", icon: Leaf },
};

const CHIP_PALETTE: Record<PillKey, { active: string; dim: string }> = {
  exercise: {
    active: "bg-violet-500/20 text-violet-200 border-violet-500/40",
    dim: "bg-white/5 text-gray-500 border-white/10",
  },
  manual: {
    active: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    dim: "bg-white/5 text-gray-500 border-white/10",
  },
  electro: {
    active: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    dim: "bg-white/5 text-gray-500 border-white/10",
  },
  adjunct: {
    active: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    dim: "bg-white/5 text-gray-500 border-white/10",
  },
};

interface MasterPlanCardProps {
  diagnosis?: string | null;
  pillRefs: MasterPlanPillRefs;
  containerRef: RefObject<HTMLDivElement>;
  /** Optional escape hatch: still let the user open the right-side My Plan
   *  tab. Renders a small "Open in side panel" link at the bottom of the
   *  inline section when provided. */
  onOpenSidePanel?: () => void;
  /** Single-click full-plan auto-build: generate Exercise + Manual + EPA +
   *  Adjunct, auto-add every item to the cart, then trigger AI orchestration. */
  onAutoBuild?: () => void;
  /** True while the auto-build cascade is in flight. Disables the button and
   *  swaps the icon/label to a loading state. */
  autoBuildPending?: boolean;
  /** True when the host has not yet captured enough clinical context for
   *  meaningful generation (no diagnosis / no pain markers / no extraction). */
  autoBuildDisabled?: boolean;
  /** Bumps when the host wants the inline section to expand (e.g. after the
   *  Build-full-plan settle effect finishes). The card reacts only to changes
   *  of this value, so user-toggled collapse is preserved between bumps. */
  expandSignal?: number;
  /** Same clinical context the AI rationale uses. When provided, an input
   *  pill strip is rendered inside the card showing every channel of data
   *  fed to the AI, with lines converging from each pill into the diagnosis
   *  header — the symmetric "what fed this plan" view to the existing
   *  output convergence overlay. */
  clinicalContext?: RationaleClinicalContextInput | null;
}

interface AnchorRefs {
  exercise: RefObject<HTMLSpanElement>;
  manual: RefObject<HTMLSpanElement>;
  electro: RefObject<HTMLSpanElement>;
  adjunct: RefObject<HTMLSpanElement>;
}

// User-resizable card sizing — persisted across sessions.
const SIZE_STORAGE_KEY = "physiogpt:masterPlanCardSize";
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const MIN_HEIGHT = 160;
const MAX_HEIGHT_VH = 0.85;

interface SavedCardSize { width: number; height: number | null }

function loadSavedCardSize(): SavedCardSize {
  if (typeof window === "undefined") return { width: DEFAULT_WIDTH, height: null };
  try {
    const raw = window.localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) return { width: DEFAULT_WIDTH, height: null };
    const parsed = JSON.parse(raw) as Partial<SavedCardSize>;
    const widthNum = typeof parsed.width === "number" ? parsed.width : DEFAULT_WIDTH;
    const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, widthNum));
    let height: number | null = null;
    if (parsed.height !== null && parsed.height !== undefined && Number.isFinite(parsed.height)) {
      const maxH = window.innerHeight * MAX_HEIGHT_VH;
      height = Math.min(maxH, Math.max(MIN_HEIGHT, parsed.height as number));
    }
    return { width, height };
  } catch {
    return { width: DEFAULT_WIDTH, height: null };
  }
}

function CountChip({ pillKey, count }: { pillKey: PillKey; count: number }) {
  const meta = PILL_META[pillKey];
  const palette = CHIP_PALETTE[pillKey];
  const Icon = meta.icon;
  const active = count > 0;
  return (
    <span
      className={`text-[9px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 transition-colors ${active ? palette.active : palette.dim}`}
      data-testid={`master-plan-chip-${pillKey}`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="font-semibold">{count}</span>
      <span>{meta.label}</span>
    </span>
  );
}

const MasterPlanCard = forwardRef<HTMLDivElement, MasterPlanCardProps>(function MasterPlanCard(
  { diagnosis, pillRefs, containerRef, onOpenSidePanel, onAutoBuild, autoBuildPending = false, autoBuildDisabled = false, expandSignal, clinicalContext },
  ref,
) {
  const { items, remove, clear } = usePlanCart();
  const { orchestrated, isPending: orchestrating, error: orchestrateError, organize, reset: resetOrchestrated } = useOrchestratePlan();
  const {
    rationale,
    isPending: rationalePending,
    error: rationaleError,
    generate: generateRationale,
    source: rationaleSource,
    isStale: rationaleStale,
  } = useTreatmentRationale();

  // User-resizable card. Width is always explicit (so the box doesn't snap
  // back when items are added). Height is null = auto (sized to content with
  // an inner 60vh cap on the expanded section); once the user drags the
  // bottom edge or corner, height becomes explicit and the inline section
  // fills the remaining space with its own scrollbar.
  const [size, setSize] = useState<SavedCardSize>(() => loadSavedCardSize());
  useEffect(() => {
    try { window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size)); } catch {}
  }, [size]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  // Bridge the forwarded ref + our internal ref.
  const setCardRef = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [ref]);

  const startResize = useCallback((axis: "x" | "y" | "xy") => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = cardRef.current?.getBoundingClientRect().width ?? size.width;
    const startH = cardRef.current?.getBoundingClientRect().height ?? size.height ?? MIN_HEIGHT;
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const maxH = window.innerHeight * MAX_HEIGHT_VH;
    // Keep the convergence overlay's anchor lines glued to the card while
    // the user drags. ResizeObserver on the parent container is not always
    // reliable (the wrapper is block-level and can keep a stable bounding
    // box even when the card grows), so we throttle a window-resize event
    // through rAF on every move tick — the overlay listens for that and
    // recomputes path geometry from the live anchor + pill rects.
    let rafId: number | null = null;
    const pingOverlay = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        window.dispatchEvent(new Event("resize"));
      });
    };
    const onMove = (ev: PointerEvent) => {
      setSize(prev => {
        const next: SavedCardSize = { width: prev.width, height: prev.height };
        if (axis === "x" || axis === "xy") {
          next.width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (ev.clientX - startX)));
        }
        if (axis === "y" || axis === "xy") {
          next.height = Math.min(maxH, Math.max(MIN_HEIGHT, startH + (ev.clientY - startY)));
        }
        return next;
      });
      pingOverlay();
    };
    const onUp = () => {
      try { target.releasePointerCapture(e.pointerId); } catch {}
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Final settle so the overlay lands exactly on the post-drag rects.
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [size]);

  const resetSize = useCallback(() => {
    setSize({ width: DEFAULT_WIDTH, height: null });
    window.dispatchEvent(new Event("resize"));
  }, []);

  // Re-clamp height on viewport changes so the saved size stays valid.
  useEffect(() => {
    const onWinResize = () => {
      setSize(prev => {
        if (prev.height == null) return prev;
        const maxH = window.innerHeight * MAX_HEIGHT_VH;
        if (prev.height <= maxH) return prev;
        return { ...prev, height: maxH };
      });
    };
    window.addEventListener("resize", onWinResize);
    return () => window.removeEventListener("resize", onWinResize);
  }, []);

  const counts = {
    exercise: items.filter(i => i.modality === "exercise" || i.modality === "exercise_custom").length,
    manual: items.filter(i => i.modality === "manual_therapy" || i.modality === "manual_therapy_custom").length,
    electro: items.filter(i => i.modality === "electrophysical").length,
    adjunct: items.filter(i => i.modality === "adjunct").length,
  };
  const total = counts.exercise + counts.manual + counts.electro + counts.adjunct;
  const isEmpty = total === 0;
  // Suppress organize when the card looks empty so its visual state stays consistent.
  const orchestrateEligible = !isEmpty && items.length >= 2;

  const summaryParts: string[] = [];
  if (counts.exercise) summaryParts.push(`${counts.exercise} exercise${counts.exercise === 1 ? "" : "s"}`);
  if (counts.manual) summaryParts.push(`${counts.manual} manual technique${counts.manual === 1 ? "" : "s"}`);
  if (counts.electro) summaryParts.push(`${counts.electro} electrophysical agent${counts.electro === 1 ? "" : "s"}`);
  if (counts.adjunct) summaryParts.push(`${counts.adjunct} adjunct${counts.adjunct === 1 ? "" : "s"}`);
  const summary = summaryParts.length > 0 ? `${summaryParts.join(", ")} ready to organize` : null;

  // Inline expansion. Default collapsed when empty, otherwise stays in sync
  // with the host's expandSignal (bumped by the Build-full-plan settle
  // effect) and the user's manual toggle.
  const [expanded, setExpanded] = useState(false);
  const lastExpandSignalRef = useRef<number | undefined>(expandSignal);
  useEffect(() => {
    if (expandSignal === undefined) return;
    if (expandSignal === lastExpandSignalRef.current) return;
    lastExpandSignalRef.current = expandSignal;
    setExpanded(true);
  }, [expandSignal]);
  // Auto-expand also when an orchestrated result lands so the user can see
  // the AI's plan inline without having to click anything.
  useEffect(() => {
    if (orchestrated) setExpanded(true);
  }, [orchestrated]);

  // Stable AnchorRefs object identity — the overlay's effects depend on this object.
  const anchorRefsBox = useRef<AnchorRefs | null>(null);
  if (anchorRefsBox.current === null) {
    anchorRefsBox.current = {
      exercise: { current: null },
      manual: { current: null },
      electro: { current: null },
      adjunct: { current: null },
    };
  }
  const anchorRefs = anchorRefsBox.current;

  // The input strip OWNS its own convergence anchor (rendered inside the
  // strip as a "↓ Feeds AI Plan" chip beneath the pill row), so the card
  // header no longer needs to host an anchor span. We just decide here
  // whether the strip should be rendered at all — the symmetric "what fed
  // this plan" view should disappear when there is literally nothing on
  // either side: cart is empty AND no clinical context has been captured.
  const showInputStrip = !isEmpty || hasInputContextData(clinicalContext);

  const cExercise = counts.exercise;
  const cManual = counts.manual;
  const cElectro = counts.electro;
  const cAdjunct = counts.adjunct;
  const [animKeys, setAnimKeys] = useState<Record<PillKey, number>>({ exercise: 0, manual: 0, electro: 0, adjunct: 0 });
  const prevCountsRef = useRef({ exercise: cExercise, manual: cManual, electro: cElectro, adjunct: cAdjunct });
  useEffect(() => {
    const prev = prevCountsRef.current;
    setAnimKeys(curr => {
      let changed = false;
      const next = { ...curr };
      if (cExercise > prev.exercise) { next.exercise = curr.exercise + 1; changed = true; }
      if (cManual > prev.manual) { next.manual = curr.manual + 1; changed = true; }
      if (cElectro > prev.electro) { next.electro = curr.electro + 1; changed = true; }
      if (cAdjunct > prev.adjunct) { next.adjunct = curr.adjunct + 1; changed = true; }
      return changed ? next : curr;
    });
    prevCountsRef.current = { exercise: cExercise, manual: cManual, electro: cElectro, adjunct: cAdjunct };
  }, [cExercise, cManual, cElectro, cAdjunct]);

  const cardJustGotItem = Object.values(animKeys).reduce((a, b) => a + b, 0);

  const grouped = items.reduce<Record<PlanCartModality, PlanCartItem[]>>((acc, it) => {
    (acc[it.modality] ||= []).push(it);
    return acc;
  }, {} as Record<PlanCartModality, PlanCartItem[]>);

  const canExpand = !isEmpty;

  return (
    <>
      <ConvergenceOverlay
        containerRef={containerRef}
        cardRef={cardRef}
        pillRefs={pillRefs}
        anchorRefs={anchorRefs}
        counts={counts}
        animKeys={animKeys}
      />
      <div
        ref={setCardRef}
        className={`relative mt-12 max-w-full rounded-lg border p-2.5 transition-colors ${
          size.height != null ? "flex flex-col" : ""
        } ${
          isEmpty
            ? "border-white/10 bg-black/30"
            : "border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-black/40 to-black/40 shadow-lg shadow-cyan-900/20"
        }`}
        style={{
          width: `${size.width}px`,
          ...(size.height != null ? { height: `${size.height}px` } : {}),
        }}
        data-testid="master-plan-card"
      >
        {/* One-shot card flash overlay — re-keyed per add so the animation restarts every time. */}
        {cardJustGotItem > 0 && (
          <div
            key={`flash-${cardJustGotItem}`}
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ animation: "master-plan-flash 700ms ease-out forwards" }}
          />
        )}
        {/* Anchor markers along the top edge — invisible, used as SVG line targets */}
        <div className="absolute inset-x-0 top-0 flex justify-around pointer-events-none">
          <span ref={anchorRefs.exercise} className="block w-px h-px" data-testid="master-plan-anchor-exercise" />
          <span ref={anchorRefs.manual} className="block w-px h-px" data-testid="master-plan-anchor-manual" />
          <span ref={anchorRefs.electro} className="block w-px h-px" data-testid="master-plan-anchor-electro" />
          <span ref={anchorRefs.adjunct} className="block w-px h-px" data-testid="master-plan-anchor-adjunct" />
        </div>

        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-semibold text-gray-100 truncate" data-testid="master-plan-header">
            Treatment Plan
            {diagnosis ? (
              <>
                {" for "}
                <span className="text-cyan-300">{diagnosis}</span>
              </>
            ) : null}
          </span>
        </div>

        <div className={`flex flex-wrap gap-1 mb-1.5 ${isEmpty ? "opacity-60" : ""}`}>
          <CountChip pillKey="exercise" count={counts.exercise} />
          <CountChip pillKey="manual" count={counts.manual} />
          <CountChip pillKey="electro" count={counts.electro} />
          <CountChip pillKey="adjunct" count={counts.adjunct} />
        </div>

        {showInputStrip && (
          <MasterPlanInputStrip
            clinicalContext={clinicalContext}
            cardRef={cardRef}
          />
        )}

        <p className={`text-[10px] italic mb-2 ${isEmpty ? "text-gray-500" : "text-gray-400"}`}>
          {isEmpty
            ? "No treatments added yet — open an engine above and tap Add to Plan."
            : summary}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => canExpand && setExpanded(e => !e)}
            disabled={!canExpand}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 transition-colors"
            data-testid="button-master-plan-toggle"
            title={canExpand ? (expanded ? "Collapse plan" : "Expand plan") : "Add at least one item"}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {expanded ? "Hide plan" : "Show plan"}
          </button>
          {onOpenSidePanel && (
            <button
              onClick={onOpenSidePanel}
              className="flex-1 text-[10px] px-2 py-1 rounded bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 inline-flex items-center justify-center gap-1 transition-colors"
              data-testid="button-master-plan-open"
              title="Open the My Plan tab in the side panel"
            >
              <ExternalLink className="h-3 w-3" />
              Open full plan
            </button>
          )}
          <button
            onClick={organize}
            disabled={!orchestrateEligible || orchestrating}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 transition-colors"
            data-testid="button-master-plan-organize"
            title={!orchestrateEligible ? "Add at least 2 items to organize" : orchestrating ? "Organizing…" : "Send to AI orchestration"}
          >
            {orchestrating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {orchestrated ? "Re-organize" : "Organize with AI"}
          </button>
          {onAutoBuild && (
            <button
              onClick={onAutoBuild}
              disabled={autoBuildPending || autoBuildDisabled}
              className="flex-1 text-[10px] px-2 py-1 rounded bg-gradient-to-r from-violet-500/40 via-fuchsia-500/40 to-amber-500/40 text-white border border-fuchsia-400/50 hover:from-violet-500/55 hover:via-fuchsia-500/55 hover:to-amber-500/55 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 transition-colors shadow-[0_0_8px_rgba(217,70,239,0.25)]"
              data-testid="button-master-plan-auto-build"
              title={autoBuildDisabled ? "Capture a diagnosis first" : autoBuildPending ? "Building plan…" : "Auto-build the full treatment plan and orchestrate"}
            >
              {autoBuildPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Building plan…
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" />
                  Build full plan
                </>
              )}
            </button>
          )}
        </div>

        {expanded && canExpand && (
          <div
            className={`mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5 overflow-y-auto pr-1 master-plan-scroll ${
              size.height != null ? "flex-1 min-h-0" : "max-h-[60vh]"
            }`}
            data-testid="master-plan-inline-section"
          >
            {/* Treatment Rationale — "Why this plan?" (Task #274). Sits at
                the top of the expanded section so the clinician sees the
                rationale before the item list and any orchestrated output. */}
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

            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300">Items in plan ({items.length})</span>
              <button
                onClick={clear}
                className="text-[9px] text-gray-400 hover:text-red-300 inline-flex items-center gap-1"
                data-testid="button-master-plan-clear"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>

            {(() => {
              // Build the mapped-driver lookup ONCE per render so each
              // CartItemRow's "Why?" reveal can show the actual clinical
              // drivers it targets (per Task #274), rather than the
              // item's own structure/finding text.
              const driverLabelsByItemId = getDriverLabelsByItemId(rationale);
              return (
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
                        // Why-pill chips show MAPPED CLINICAL DRIVERS
                        // (derived from drivers.addressedItemIds), not the
                        // item's structure/finding text.
                        const mappedDrivers = driverLabelsByItemId.get(it.id) ?? [];
                        return (
                          <CartItemRow
                            key={it.id}
                            item={it}
                            onRemove={() => remove(it.id)}
                            whyText={r?.why}
                            whyAddresses={mappedDrivers}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {items.length < 2 && !orchestrated && (
                <p className="text-[9px] text-gray-500 italic">Add at least 2 items, then click Organize with AI.</p>
              )}
            </div>
              );
            })()}

            {orchestrateError && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-200 flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{orchestrateError.message || "Could not organize the plan. Try again."}</span>
              </div>
            )}

            {orchestrating && !orchestrated && (
              <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-2 text-[10px] text-cyan-200 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Organizing the plan with AI…
              </div>
            )}

            {orchestrated && (
              <div className="space-y-2 border-t border-white/10 pt-2.5">
                <OrchestratedSummaryCard orchestrated={orchestrated} onDiscard={resetOrchestrated} />
                <ConflictList conflicts={orchestrated.conflicts} />
                <SessionOrderStrip steps={orchestrated.sessionOrder} items={items} />
                <FrequencyList frequencies={orchestrated.frequencies} items={items} />
                <WeeklyScheduleGrid schedule={orchestrated.weeklySchedule} items={items} totalWeeks={orchestrated.totalDurationWeeks} frequencies={orchestrated.frequencies} />
                <PhaseCards phases={orchestrated.phases} items={items} />
                <RecoveryTimeline milestones={orchestrated.timeline} totalWeeks={orchestrated.totalDurationWeeks} />
              </div>
            )}

          </div>
        )}

        {/* Resize handles — right edge, bottom edge, bottom-right corner.
            Double-click the corner to reset to the default size. */}
        <div
          onPointerDown={startResize("x")}
          className="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize group/resize-x"
          style={{ touchAction: "none" }}
          title="Drag to resize width"
          data-testid="master-plan-resize-x"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-full bg-white/10 group-hover/resize-x:bg-cyan-400/70 transition-colors" />
        </div>
        <div
          onPointerDown={startResize("y")}
          className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize group/resize-y"
          style={{ touchAction: "none" }}
          title="Drag to resize height"
          data-testid="master-plan-resize-y"
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white/10 group-hover/resize-y:bg-cyan-400/70 transition-colors" />
        </div>
        <div
          onPointerDown={startResize("xy")}
          onDoubleClick={resetSize}
          className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize group/resize-xy"
          style={{ touchAction: "none" }}
          title="Drag to resize · double-click to reset"
          data-testid="master-plan-resize-corner"
        >
          <svg viewBox="0 0 10 10" className="absolute bottom-0 right-0 h-2.5 w-2.5 text-white/20 group-hover/resize-xy:text-cyan-400/80 transition-colors" aria-hidden="true">
            <path d="M9 1 L9 9 L1 9" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M9 5 L5 9" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
      </div>
    </>
  );
});

interface ConvergenceOverlayProps {
  containerRef: RefObject<HTMLDivElement>;
  /** Direct ref to the resizable card element so the overlay can observe
   *  it and recompute paths the moment width/height changes — the
   *  containerRef wrapper is block-level and may not always observably
   *  resize when only the card grows. */
  cardRef: RefObject<HTMLDivElement>;
  pillRefs: MasterPlanPillRefs;
  anchorRefs: AnchorRefs;
  counts: Record<PillKey, number>;
  animKeys: Record<PillKey, number>;
}

interface PathSpec {
  d: string;
  midX: number;
  midY: number;
}

function ConvergenceOverlay({ containerRef, cardRef, pillRefs, anchorRefs, counts, animKeys }: ConvergenceOverlayProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<Record<PillKey, PathSpec>>({
    exercise: { d: "", midX: 0, midY: 0 },
    manual: { d: "", midX: 0, midY: 0 },
    electro: { d: "", midX: 0, midY: 0 },
    adjunct: { d: "", midX: 0, midY: 0 },
  });

  const recompute = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();

    setSize(prev => {
      const w = Math.round(rect.width * 2) / 2;
      const h = Math.round(rect.height * 2) / 2;
      if (prev.w === w && prev.h === h) return prev;
      return { w, h };
    });

    const compute = (pill: HTMLElement | null, anchor: HTMLElement | null): PathSpec => {
      if (!pill || !anchor) return { d: "", midX: 0, midY: 0 };
      const p = pill.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      const x1 = p.left + p.width / 2 - rect.left;
      const y1 = p.bottom - rect.top;
      const x2 = a.left - rect.left;
      const y2 = a.top - rect.top;
      const midY = (y1 + y2) / 2;
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${x1.toFixed(2)} ${midY.toFixed(2)}, ${x2.toFixed(2)} ${midY.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      return { d, midX: (x1 + x2) / 2, midY };
    };

    const next = {
      exercise: compute(pillRefs.exercise.current, anchorRefs.exercise.current),
      manual: compute(pillRefs.manual.current, anchorRefs.manual.current),
      electro: compute(pillRefs.electro.current, anchorRefs.electro.current),
      adjunct: compute(pillRefs.adjunct.current, anchorRefs.adjunct.current),
    };

    setPaths(prev => {
      const same = (["exercise", "manual", "electro", "adjunct"] as const).every(
        k => prev[k].d === next[k].d,
      );
      if (same) return prev;
      return next;
    });
  }, [containerRef, pillRefs, anchorRefs]);

  useLayoutEffect(() => {
    recompute();
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
  }, [recompute]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(c);
    // Observe the resizable card itself so the moment its width or height
    // changes (user dragging a handle) the overlay recomputes — the parent
    // container is a block-level wrapper that can stay the same size even
    // when the card grows.
    if (cardRef.current) ro.observe(cardRef.current);
    Object.values(pillRefs).forEach(r => {
      if (r.current) ro.observe(r.current as Element);
    });
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, containerRef, cardRef, pillRefs]);

  if (size.w === 0 || size.h === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden="true"
      data-testid="master-plan-convergence-overlay"
    >
      <defs>
        {(["exercise", "manual", "electro", "adjunct"] as const).map(k => (
          <filter key={`glow-${k}`} id={`master-plan-glow-${k}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {(["exercise", "manual", "electro", "adjunct"] as const).map(k => {
        const meta = PILL_META[k];
        const path = paths[k];
        const active = counts[k] > 0;
        const animKey = animKeys[k];
        if (!path.d) return null;

        return (
          <g key={k}>
            {/* Static line */}
            <path
              d={path.d}
              stroke={meta.color}
              strokeWidth={active ? 1.75 : 1.25}
              strokeDasharray={active ? "none" : "4 3"}
              opacity={active ? 0.85 : 0.4}
              fill="none"
              strokeLinecap="round"
            />

            {/* One-shot animated overlay — re-keyed per add to replay. */}
            {animKey > 0 && (
              <g key={`${k}-anim-${animKey}`}>
                <path
                  d={path.d}
                  stroke={meta.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  pathLength={1}
                  filter={`url(#master-plan-glow-${k})`}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: "master-plan-line-draw 600ms ease-out forwards",
                  }}
                />
                {/* Traveling pulse dot using offset-path */}
                <circle
                  r={3.5}
                  fill={meta.color}
                  filter={`url(#master-plan-glow-${k})`}
                  style={{
                    offsetPath: `path('${path.d}')`,
                    animation: "master-plan-pulse-travel 800ms ease-out forwards",
                  } as CSSProperties}
                />
              </g>
            )}

            {/* Mid-line count badge (only when active) */}
            {active && path.midX > 0 && (
              <g transform={`translate(${path.midX} ${path.midY})`}>
                <circle r={8} fill="rgba(0,0,0,0.75)" stroke={meta.color} strokeWidth={1} />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={meta.color}
                  style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                >
                  {counts[k]}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default MasterPlanCard;
