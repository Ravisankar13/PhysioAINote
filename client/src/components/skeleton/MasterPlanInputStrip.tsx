import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  Accessibility,
  Activity,
  Bandage,
  Flame,
  Gauge,
  GitBranch,
  HeartPulse,
  Layers3,
  Link2,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { RationaleClinicalContextInput } from "@/lib/treatmentRationaleContext";

export type InputChannelKey =
  | "diagnosis"
  | "pain"
  | "slings"
  | "fascial"
  | "chain"
  | "tissues"
  | "scar"
  | "force"
  | "posture"
  | "thoracic"
  | "tendons"
  | "risk"
  | "factors";

interface InputChannelMeta {
  label: string;
  icon: LucideIcon;
  /** Hex color used for the pill text/border tint AND the SVG line stroke. */
  color: string;
}

// All hues kept in the cool half of the wheel — cyan / teal / sky / blue /
// indigo / fuchsia / lime / slate. The output convergence overlay uses the
// warm modality palette (violet / rose / amber / emerald), so input lines
// stay perceptually distinct from output lines even when both are visible.
export const INPUT_CHANNEL_META: Record<InputChannelKey, InputChannelMeta> = {
  diagnosis: { label: "Dx",       icon: Stethoscope,    color: "#67e8f9" }, // cyan-300
  pain:      { label: "Pain",     icon: Activity,       color: "#f0abfc" }, // fuchsia-300
  slings:    { label: "Slings",   icon: Link2,          color: "#5eead4" }, // teal-300
  fascial:   { label: "Fascia",   icon: Waves,          color: "#e879f9" }, // fuchsia-400
  chain:     { label: "Chains",   icon: GitBranch,      color: "#a5b4fc" }, // indigo-300
  tissues:   { label: "Tissues",  icon: HeartPulse,     color: "#bae6fd" }, // sky-200
  scar:      { label: "Scars",    icon: Bandage,        color: "#cbd5e1" }, // slate-300
  force:     { label: "Forces",   icon: Gauge,          color: "#94a3b8" }, // slate-400
  posture:   { label: "Posture",  icon: Accessibility,  color: "#7dd3fc" }, // sky-300
  thoracic:  { label: "Thoracic", icon: Layers3,        color: "#93c5fd" }, // blue-300
  tendons:   { label: "Tendons",  icon: Flame,          color: "#a5f3fc" }, // cyan-200
  risk:      { label: "Risk",     icon: TrendingUp,     color: "#bef264" }, // lime-300
  factors:   { label: "Patient",  icon: UserCheck,      color: "#22d3ee" }, // cyan-500
};

const ORDER: InputChannelKey[] = [
  "diagnosis", "pain", "slings", "fascial", "chain", "tissues",
  "scar", "force", "posture", "thoracic", "tendons", "risk", "factors",
];

export interface InputChannel {
  key: InputChannelKey;
  count: number;
  details: string[];
}

export function deriveInputChannels(
  ctx: RationaleClinicalContextInput | null | undefined,
): InputChannel[] {
  const out: InputChannel[] = ORDER.map(k => ({ key: k, count: 0, details: [] }));
  if (!ctx) return out;
  const get = (k: InputChannelKey) => out.find(c => c.key === k)!;

  if (ctx.topHypothesis) {
    const c = get("diagnosis");
    c.count = 1;
    c.details.push(ctx.topHypothesis);
    if (ctx.primaryRegion) c.details.push(`Region: ${ctx.primaryRegion}`);
    if (ctx.stage) c.details.push(`Stage: ${ctx.stage}`);
    if (ctx.irritability) c.details.push(`Irritability: ${ctx.irritability}`);
    if (ctx.recoveryPhase) c.details.push(`Phase: ${ctx.recoveryPhase}`);
  }

  const pm = ctx.painMarkers;
  if (pm && (pm.count || pm.structures?.length || pm.severitySummary)) {
    const c = get("pain");
    c.count = pm.count ?? pm.structures?.length ?? 0;
    if (c.count === 0 && pm.severitySummary) c.count = 1;
    if (pm.structures?.length) c.details.push(...pm.structures.slice(0, 6).map(s => `• ${s}`));
    if (pm.mechanisms?.length) c.details.push(`Mechanisms: ${pm.mechanisms.join(", ")}`);
    if (pm.severitySummary) c.details.push(pm.severitySummary);
    // Fallback: if only the count was provided (no structures / mechanisms /
    // severity), ensure the popover reflects that pain data DID feed the
    // plan — otherwise the tooltip would incorrectly say "no data".
    if (c.details.length === 0 && c.count > 0) {
      c.details.push(`${c.count} pain marker${c.count === 1 ? "" : "s"}`);
    }
  }

  if (ctx.slingDrivers?.length) {
    const c = get("slings");
    c.count = ctx.slingDrivers.length;
    c.details.push(
      ...ctx.slingDrivers.slice(0, 6).map(s =>
        `• ${s.sling}${s.role ? ` (${s.role})` : ""}${s.drivingFinding ? ` — ${s.drivingFinding}` : ""}`,
      ),
    );
  }

  const ft = ctx.fascialTensions;
  const ftCount = (ft?.drivingChains?.length ?? 0) + (ft?.activeChains?.length ?? 0);
  if (ft && ftCount > 0) {
    const c = get("fascial");
    c.count = ftCount;
    if (ft.drivingChains?.length) c.details.push(`Driving: ${ft.drivingChains.join(", ")}`);
    if (ft.activeChains?.length) c.details.push(`Active: ${ft.activeChains.join(", ")}`);
    if (ft.propagationCount) c.details.push(`Propagation steps: ${ft.propagationCount}`);
  }

  if (ctx.chainIntegrity?.length) {
    const c = get("chain");
    c.count = ctx.chainIntegrity.length;
    c.details.push(
      ...ctx.chainIntegrity.slice(0, 6).map(ci =>
        `• ${ci.chain}: ${Math.round(ci.score)}/100${ci.issues?.length ? ` — ${ci.issues.slice(0, 2).join(", ")}` : ""}`,
      ),
    );
  }

  if (ctx.compromisedTissues?.length) {
    const c = get("tissues");
    c.count = ctx.compromisedTissues.length;
    c.details.push(
      ...ctx.compromisedTissues.slice(0, 6).map(t =>
        `• ${t.name}${t.status ? ` (${t.status})` : ""}${t.region ? ` — ${t.region}` : ""}`,
      ),
    );
  }

  const sl = ctx.scarLoad;
  const slCount = (sl?.scarCount ?? 0) + (sl?.adhesionCount ?? 0);
  if (sl && slCount > 0) {
    const c = get("scar");
    c.count = slCount;
    if (sl.scarCount) c.details.push(`Scars: ${sl.scarCount}`);
    if (sl.adhesionCount) c.details.push(`Adhesion bands: ${sl.adhesionCount}`);
    if (sl.regions?.length) c.details.push(`Regions: ${sl.regions.join(", ")}`);
  }

  if (ctx.forceHotspots?.length) {
    const c = get("force");
    c.count = ctx.forceHotspots.length;
    c.details.push(
      ...ctx.forceHotspots.slice(0, 6).map(f =>
        `• ${f.joint}${typeof f.peakForceN === "number" ? ` peak ${Math.round(f.peakForceN)}N` : ""}${typeof f.asymmetryIndex === "number" ? ` asym ${Math.round(f.asymmetryIndex * 100)}%` : ""}${f.note ? ` — ${f.note}` : ""}`,
      ),
    );
  }

  if (ctx.posturalDeviations?.summary) {
    const c = get("posture");
    c.count = 1;
    c.details.push(
      `${ctx.posturalDeviations.summary}${ctx.posturalDeviations.severity ? ` (${ctx.posturalDeviations.severity})` : ""}`,
    );
  }

  if (ctx.thoracicStiffness) {
    const c = get("thoracic");
    c.count = 1;
    c.details.push(ctx.thoracicStiffness);
  }

  if (ctx.tendonInflammation?.length) {
    const c = get("tendons");
    c.count = ctx.tendonInflammation.length;
    c.details.push(...ctx.tendonInflammation.slice(0, 6).map(t => `• ${t}`));
  }

  const np = ctx.naturalProgression;
  if (np && ((np.chronicityRiskPercent ?? 0) >= 30 || (np.recurrenceRiskPercent ?? 0) >= 30)) {
    const c = get("risk");
    c.count = 1;
    if (np.window) c.details.push(`Expected window: ${np.window}`);
    if (typeof np.chronicityRiskPercent === "number") {
      c.details.push(`Chronicity: ${Math.round(np.chronicityRiskPercent)}%`);
    }
    if (typeof np.recurrenceRiskPercent === "number") {
      c.details.push(`Recurrence: ${Math.round(np.recurrenceRiskPercent)}%`);
    }
  }

  const factorLabels: string[] = [];
  if (Array.isArray(ctx.patientFactors)) {
    for (const f of ctx.patientFactors) {
      if (typeof f === "string" && f.trim()) factorLabels.push(f.trim());
    }
  } else if (ctx.patientFactors && typeof ctx.patientFactors === "object") {
    for (const [k, v] of Object.entries(ctx.patientFactors as Record<string, unknown>)) {
      if (v === true) factorLabels.push(k);
      else if (typeof v === "string" && v.trim()) factorLabels.push(`${k}: ${v.trim()}`);
      else if (typeof v === "number") factorLabels.push(`${k}: ${v}`);
    }
  }
  for (const c of ctx.constraints || []) {
    if (typeof c === "string" && c.trim()) factorLabels.push(c.trim());
  }
  if (factorLabels.length > 0) {
    const c = get("factors");
    c.count = factorLabels.length;
    c.details.push(...factorLabels.slice(0, 8).map(f => `• ${f}`));
  }

  return out;
}

interface PathSpec {
  d: string;
  midX: number;
  midY: number;
}

interface MasterPlanInputStripProps {
  /** Same clinical context the AI rationale uses. Drives counts + popovers. */
  clinicalContext: RationaleClinicalContextInput | null | undefined;
  /** The resizable card body — the SVG overlay sits absolutely over it. */
  cardRef: RefObject<HTMLElement>;
}

/** True when at least one input channel carries data. Used by the parent
 *  card to gate render so the strip + overlay disappear when both the
 *  cart and the clinical context are empty. */
export function hasInputContextData(
  ctx: RationaleClinicalContextInput | null | undefined,
): boolean {
  if (!ctx) return false;
  return deriveInputChannels(ctx).some(c => c.count > 0);
}

export function MasterPlanInputStrip({ clinicalContext, cardRef }: MasterPlanInputStripProps) {
  const channels = useMemo(() => deriveInputChannels(clinicalContext), [clinicalContext]);

  // Stable per-channel button refs.
  const pillRefsBox = useRef<Record<InputChannelKey, RefObject<HTMLButtonElement>> | null>(null);
  if (pillRefsBox.current === null) {
    const all = {} as Record<InputChannelKey, RefObject<HTMLButtonElement>>;
    for (const k of ORDER) all[k] = { current: null } as RefObject<HTMLButtonElement>;
    pillRefsBox.current = all;
  }
  const pillRefs = pillRefsBox.current;

  // The strip OWNS its convergence anchor — a small chip rendered directly
  // beneath the pill row, labelled "→ AI Plan". Lines drawn by the input
  // overlay flow downward from each pill into this chip, keeping the input
  // story visually self-contained inside the card body and clearly separate
  // from the output convergence overlay (which targets anchors at the card's
  // top edge so output lines flow down to the pills below the card).
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const [hovered, setHovered] = useState<InputChannelKey | null>(null);

  // Pulse animation: bump the per-channel key whenever its content signature
  // changes (count delta OR detail delta). Per spec the pulse must fire on
  // 0→N transitions AND on memo updates that swap underlying data while the
  // count stays constant. The first observation of each key is "primed" so
  // the initial mount does not pulse.
  const [animKeys, setAnimKeys] = useState<Record<InputChannelKey, number>>(() => {
    const m = {} as Record<InputChannelKey, number>;
    for (const k of ORDER) m[k] = 0;
    return m;
  });
  const channelSig = useCallback(
    (c: InputChannel) => `${c.count}|${c.details.join("\u0001")}`,
    [],
  );
  const prevSigRef = useRef<Partial<Record<InputChannelKey, string>>>({});
  useEffect(() => {
    setAnimKeys(curr => {
      const next = { ...curr };
      let changed = false;
      for (const c of channels) {
        const sig = channelSig(c);
        const prev = prevSigRef.current[c.key];
        // Skip first observation (priming) so we don't pulse on mount.
        if (prev !== undefined && prev !== sig && c.count > 0) {
          next[c.key] = curr[c.key] + 1;
          changed = true;
        }
        prevSigRef.current[c.key] = sig;
      }
      return changed ? next : curr;
    });
  }, [channels, channelSig]);

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1 mb-1"
        data-testid="master-plan-input-strip"
        onMouseLeave={() => setHovered(null)}
      >
        <span className="text-[8.5px] uppercase tracking-wider text-gray-500 font-semibold mr-0.5 shrink-0">
          Inputs
        </span>
        {channels.map(c => {
          const meta = INPUT_CHANNEL_META[c.key];
          const Icon = meta.icon;
          const active = c.count > 0;
          return (
            <button
              key={c.key}
              ref={pillRefs[c.key]}
              type="button"
              onMouseEnter={() => setHovered(c.key)}
              onFocus={() => setHovered(c.key)}
              onBlur={() => setHovered(prev => (prev === c.key ? null : prev))}
              className={`relative inline-flex items-center gap-0.5 rounded-full border text-[9px] px-1.5 py-0.5 transition-all ${
                active
                  ? "bg-black/30 hover:bg-black/40"
                  : "border-dashed border-white/10 bg-transparent text-gray-500 opacity-55 hover:opacity-85"
              }`}
              style={
                active
                  ? { color: meta.color, borderColor: `${meta.color}66` }
                  : undefined
              }
              data-testid={`input-pill-${c.key}`}
              aria-label={`${meta.label} input${active ? `, ${c.count} item${c.count === 1 ? "" : "s"}` : ", none"}`}
              title={`${meta.label}${active ? ` · ${c.count}` : " · no data"}`}
            >
              <Icon className="h-2.5 w-2.5" />
              <span>{meta.label}</span>
              {active && (
                <span
                  className="ml-0.5 px-1 rounded-full text-[8px] bg-black/50 font-semibold"
                  style={{ color: meta.color }}
                >
                  {c.count}
                </span>
              )}
              {hovered === c.key && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 pointer-events-none"
                  role="tooltip"
                  data-testid={`input-pill-popover-${c.key}`}
                >
                  <div className="rounded-md border border-white/15 bg-black/90 backdrop-blur p-1.5 shadow-xl min-w-[180px] max-w-[280px] text-left">
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="h-3 w-3" style={{ color: meta.color }} />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {active ? (
                        <span className="text-[9px] text-gray-400 ml-auto">
                          {c.count} item{c.count === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-500 italic ml-auto">
                          no data
                        </span>
                      )}
                    </div>
                    {active && c.details.length > 0 ? (
                      <ul className="text-[9px] text-gray-200 leading-snug space-y-0.5">
                        {c.details.slice(0, 8).map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9px] text-gray-500 italic">
                        No {meta.label.toLowerCase()} data was sent to the AI for this plan.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {/* Convergence anchor chip — every input line flows DOWN into this
          target. Visually distinct from the output convergence (which targets
          anchors at the card's top edge so output lines flow downward to the
          modality pills below the card). */}
      <div
        className="flex items-center justify-center mb-1.5"
        data-testid="master-plan-input-anchor-row"
      >
        <span
          className="inline-flex items-center gap-1 text-[8.5px] uppercase tracking-wider font-semibold rounded-full px-1.5 py-0.5 border border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
          title="Inputs above feed the AI treatment plan"
        >
          <span className="opacity-70">↓</span>
          <span>Feeds AI Plan</span>
          <span
            ref={anchorRef}
            className="inline-block w-px h-px"
            data-testid="master-plan-input-anchor"
          />
        </span>
      </div>
      <InputConvergenceOverlay
        cardRef={cardRef}
        pillRefs={pillRefs}
        anchorRef={anchorRef}
        channels={channels}
        animKeys={animKeys}
        hovered={hovered}
      />
    </>
  );
}

interface InputOverlayProps {
  cardRef: RefObject<HTMLElement | null>;
  pillRefs: Record<InputChannelKey, RefObject<HTMLButtonElement | null>>;
  anchorRef: RefObject<HTMLElement | null>;
  channels: InputChannel[];
  animKeys: Record<InputChannelKey, number>;
  hovered: InputChannelKey | null;
}

function InputConvergenceOverlay({
  cardRef,
  pillRefs,
  anchorRef,
  channels,
  animKeys,
  hovered,
}: InputOverlayProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<Partial<Record<InputChannelKey, PathSpec>>>({});

  const recompute = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();

    setSize(prev => {
      const w = Math.round(rect.width * 2) / 2;
      const h = Math.round(rect.height * 2) / 2;
      if (prev.w === w && prev.h === h) return prev;
      return { w, h };
    });

    const anchor = anchorRef.current;
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    const ax = a.left + a.width / 2 - rect.left;
    const ay = a.top + a.height / 2 - rect.top;

    const next: Partial<Record<InputChannelKey, PathSpec>> = {};
    for (const c of channels) {
      const pill = pillRefs[c.key]?.current;
      if (!pill) continue;
      const p = pill.getBoundingClientRect();
      const x1 = p.left + p.width / 2 - rect.left;
      // Bottom edge of pill — line exits downward toward the anchor that
      // sits beneath the pill row in the strip's own anchor chip.
      const y1 = p.bottom - rect.top;
      const midY = (y1 + ay) / 2;
      const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${x1.toFixed(2)} ${midY.toFixed(2)}, ${ax.toFixed(2)} ${midY.toFixed(2)}, ${ax.toFixed(2)} ${ay.toFixed(2)}`;
      next[c.key] = { d, midX: (x1 + ax) / 2, midY };
    }

    setPaths(prev => {
      let same = true;
      for (const c of channels) {
        if (prev[c.key]?.d !== next[c.key]?.d) {
          same = false;
          break;
        }
      }
      if (same) return prev;
      return next;
    });
  }, [cardRef, anchorRef, pillRefs, channels]);

  useLayoutEffect(() => {
    recompute();
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
  }, [recompute]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(card);
    Object.values(pillRefs).forEach(r => {
      if (r.current) ro.observe(r.current);
    });
    if (anchorRef.current) ro.observe(anchorRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, cardRef, pillRefs, anchorRef]);

  if (size.w === 0 || size.h === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden="true"
      data-testid="master-plan-input-overlay"
    >
      <defs>
        {channels.map(c => (
          <filter
            key={`iglow-${c.key}`}
            id={`master-plan-input-glow-${c.key}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>
      {channels.map(c => {
        const meta = INPUT_CHANNEL_META[c.key];
        const path = paths[c.key];
        if (!path?.d) return null;
        const active = c.count > 0;
        const isHovered = hovered === c.key;
        const animKey = animKeys[c.key];
        return (
          <g key={c.key}>
            <path
              d={path.d}
              stroke={meta.color}
              strokeWidth={isHovered ? 2 : active ? 1.25 : 0.75}
              strokeDasharray={active ? "none" : "3 3"}
              opacity={isHovered ? 0.95 : active ? 0.7 : 0.25}
              fill="none"
              strokeLinecap="round"
            />
            {animKey > 0 && active && (
              <g key={`${c.key}-ianim-${animKey}`}>
                <path
                  d={path.d}
                  stroke={meta.color}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  pathLength={1}
                  filter={`url(#master-plan-input-glow-${c.key})`}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: "master-plan-line-draw 600ms ease-out forwards",
                  }}
                />
                <circle
                  r={2.5}
                  fill={meta.color}
                  filter={`url(#master-plan-input-glow-${c.key})`}
                  style={{
                    offsetPath: `path('${path.d}')`,
                    animation: "master-plan-pulse-travel 800ms ease-out forwards",
                  } as CSSProperties}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
