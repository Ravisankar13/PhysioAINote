import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Dumbbell, FileText, Hand, Leaf, Sparkles, Zap } from "lucide-react";
import { usePlanCart } from "@/lib/planCart";

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
  onOpenPlan: () => void;
  onOrganize: () => void;
}

interface AnchorRefs {
  exercise: RefObject<HTMLSpanElement>;
  manual: RefObject<HTMLSpanElement>;
  electro: RefObject<HTMLSpanElement>;
  adjunct: RefObject<HTMLSpanElement>;
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
  { diagnosis, pillRefs, containerRef, onOpenPlan, onOrganize },
  ref,
) {
  const { items } = usePlanCart();

  const counts = {
    exercise: items.filter(i => i.modality === "exercise" || i.modality === "exercise_custom").length,
    manual: items.filter(i => i.modality === "manual_therapy" || i.modality === "manual_therapy_custom").length,
    electro: items.filter(i => i.modality === "electrophysical").length,
    adjunct: items.filter(i => i.modality === "adjunct").length,
  };
  const total = counts.exercise + counts.manual + counts.electro + counts.adjunct;
  const isEmpty = total === 0;
  // Organize-enable mirrors My Plan's true orchestration eligibility, which
  // looks at the full cart (lifestyle included), not just the four card buckets.
  const orchestrateEligible = items.length >= 2;

  const summaryParts: string[] = [];
  if (counts.exercise) summaryParts.push(`${counts.exercise} exercise${counts.exercise === 1 ? "" : "s"}`);
  if (counts.manual) summaryParts.push(`${counts.manual} manual technique${counts.manual === 1 ? "" : "s"}`);
  if (counts.electro) summaryParts.push(`${counts.electro} electrophysical agent${counts.electro === 1 ? "" : "s"}`);
  if (counts.adjunct) summaryParts.push(`${counts.adjunct} adjunct${counts.adjunct === 1 ? "" : "s"}`);
  const summary = summaryParts.length > 0 ? `${summaryParts.join(", ")} ready to organize` : null;

  // Anchor refs are created once and stored in a ref so the AnchorRefs object
  // identity stays stable across renders — the overlay depends on this object
  // and we don't want to re-init its observers on every render.
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

  // Track previous counts to trigger one-shot per-line animations on add.
  const [animKeys, setAnimKeys] = useState<Record<PillKey, number>>({ exercise: 0, manual: 0, electro: 0, adjunct: 0 });
  const prevCountsRef = useRef(counts);
  useEffect(() => {
    const prev = prevCountsRef.current;
    const next = counts;
    let changed = false;
    const updated: Record<PillKey, number> = { ...animKeys };
    (["exercise", "manual", "electro", "adjunct"] as const).forEach(k => {
      if (next[k] > prev[k]) {
        updated[k] = animKeys[k] + 1;
        changed = true;
      }
    });
    if (changed) setAnimKeys(updated);
    prevCountsRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.exercise, counts.manual, counts.electro, counts.adjunct]);

  const cardJustGotItem = Object.values(animKeys).reduce((a, b) => a + b, 0);

  return (
    <>
      <ConvergenceOverlay
        containerRef={containerRef}
        pillRefs={pillRefs}
        anchorRefs={anchorRefs}
        counts={counts}
        animKeys={animKeys}
      />
      <div
        ref={ref}
        className={`relative mt-12 rounded-lg border p-2.5 transition-all ${
          isEmpty
            ? "border-white/10 bg-black/30"
            : "border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-black/40 to-black/40 shadow-lg shadow-cyan-900/20"
        }`}
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

        <p className={`text-[10px] italic mb-2 ${isEmpty ? "text-gray-500" : "text-gray-400"}`}>
          {isEmpty
            ? "No treatments added yet — open an engine above and tap Add to Plan."
            : summary}
        </p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenPlan}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 inline-flex items-center justify-center gap-1 transition-colors"
            data-testid="button-master-plan-open"
          >
            <FileText className="h-3 w-3" />
            Open full plan
          </button>
          <button
            onClick={onOrganize}
            disabled={!orchestrateEligible}
            className="flex-1 text-[10px] px-2 py-1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 transition-colors"
            data-testid="button-master-plan-organize"
            title={!orchestrateEligible ? "Add at least 2 items to organize" : "Send to AI orchestration"}
          >
            <Sparkles className="h-3 w-3" />
            Organize with AI
          </button>
        </div>
      </div>

      {/* Keyframes — scoped via a single style tag is fine since this component is conditionally rendered */}
      <style>{`
        @keyframes master-plan-line-draw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes master-plan-pulse-travel {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes master-plan-flash {
          0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.0); transform: translateY(0); }
          30% { box-shadow: 0 0 24px 4px rgba(34, 211, 238, 0.5); transform: translateY(-1px); }
          100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.0); transform: translateY(0); }
        }
      `}</style>
    </>
  );
});

interface ConvergenceOverlayProps {
  containerRef: RefObject<HTMLDivElement>;
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

function ConvergenceOverlay({ containerRef, pillRefs, anchorRefs, counts, animKeys }: ConvergenceOverlayProps) {
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

    // Guarded size update — only commit when width/height actually changed
    // (rounded to 0.5px), otherwise we'd churn state on every paint.
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
      // S-curve via cubic Bézier so each line "leaves" the pill straight down then "enters" the card straight down
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

    // Guarded path update — bail out when every modality's d-string is unchanged
    // so we don't enter a render → effect → setState → render loop.
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
    // Re-run after a microtask so card mount + layout settle for the very first paint.
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
  }, [recompute]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(c);
    // Also observe each pill so any size changes (e.g. font load) reflow lines.
    Object.values(pillRefs).forEach(r => {
      if (r.current) ro.observe(r.current as Element);
    });
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, containerRef, pillRefs]);

  if (size.w === 0 || size.h === 0) {
    return (
      <svg
        ref={() => {}}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
        aria-hidden="true"
      />
    );
  }

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
