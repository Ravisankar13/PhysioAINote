import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pin, PinOff, X } from 'lucide-react';

export interface SliderDof {
  configKey: string;
  label: string;
  hardMin: number;
  hardMax: number;
  activeRomMin: number | null;
  activeRomMax: number | null;
  passiveRomMin: number | null;
  passiveRomMax: number | null;
  painfulArc: {
    start: number;
    end: number;
    intensity?: number;
    direction?: 'ascending' | 'descending' | 'either';
    loadingMode?: 'concentric' | 'eccentric' | 'isometric' | 'any';
    label?: string;
  } | null;
  pinned: boolean;
}

export interface MovementJointSliderHUDProps {
  jointKey: string;
  getAnchor: () => { x: number; y: number } | null;
  dofs: SliderDof[];
  getCurrentValue: (configKey: string) => number;
  onDragStart: (configKey: string) => void;
  onDrag: (configKey: string, targetValue: number) => void;
  onDragEnd: (configKey: string) => void;
  onTogglePin: (configKey: string) => void;
  /** Task #322: dismiss the chip (close button + click-outside). */
  onClose: () => void;
  /**
   * Task #322: returns the THREE renderer's canvas element (or null if
   * not yet mounted). The click-outside listener defers to the canvas's
   * own mousedown handler for any click that lands on it, so clicking
   * an arrow gizmo or another bone doesn't dismiss the chip out from
   * under the drag/selection that's about to start.
   */
  getCanvasEl: () => HTMLElement | null;
}

const TRACK_WIDTH_PX = 160;
const TRACK_HEIGHT_PX = 8;

function jointDisplayName(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

export default function MovementJointSliderHUD({
  jointKey,
  getAnchor,
  dofs,
  getCurrentValue,
  onDragStart,
  onDrag,
  onDragEnd,
  onTogglePin,
  onClose,
  getCanvasEl,
}: MovementJointSliderHUDProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick(t => (t + 1) & 0xffff);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const draggingRef = useRef<{
    configKey: string;
    trackEl: HTMLDivElement;
    hardMin: number;
    hardMax: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Task #322: keep latest onClose / getCanvasEl in refs so the
  // click-outside listener never reattaches as the parent re-renders.
  // The viewer re-renders on selection changes only, but the chip
  // itself raf-ticks every frame — keeping deps stable avoids churn.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const getCanvasElRef = useRef(getCanvasEl);
  getCanvasElRef.current = getCanvasEl;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const rect = drag.trackEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const t = x / Math.max(1, rect.width);
      const value = drag.hardMin + t * (drag.hardMax - drag.hardMin);
      onDrag(drag.configKey, value);
    };
    const onUp = () => {
      const drag = draggingRef.current;
      if (!drag) return;
      onDragEnd(drag.configKey);
      draggingRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onDrag, onDragEnd]);

  // Task #322: window-level click-outside to dismiss. Capture phase so
  // we see the gesture before any nested handler can stopPropagation.
  // We bail in three cases:
  //  1. A slider drag is mid-flight (releasing the mouse outside the
  //     chip should not close it; the viewer's deselect also guards
  //     poseDragRef for the arrow case).
  //  2. The click landed inside the chip itself.
  //  3. The click landed on the THREE canvas — the canvas's own
  //     mousedown handler already does the right thing (pick a new
  //     joint, start an arrow drag, or background-deselect). Dismissing
  //     here would race with arrow-drag start and break it.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (draggingRef.current) return;
      const root = containerRef.current;
      if (!root) return;
      if (!(e.target instanceof Node)) return;
      if (root.contains(e.target)) return;
      const canvasEl = getCanvasElRef.current();
      if (canvasEl && canvasEl.contains(e.target)) return;
      onCloseRef.current();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  // Task #385 — measured chip box, refreshed every frame after layout so
  // placement math has the actual rendered width/height. Defaults are
  // close to the real size to avoid a first-frame jump.
  const measuredRef = useRef({ width: 280, height: 80 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measuredRef.current = { width: el.offsetWidth, height: el.offsetHeight };
  });

  const anchor = getAnchor();
  if (!anchor || dofs.length === 0) return null;

  // Task #385 — side-aware placement so the chip never sits on top of
  // the figure. We dock to whichever side has empty space, treating the
  // central ~40% of the canvas as a "skeleton safe zone".
  const parentEl = (containerRef.current?.offsetParent as HTMLElement | null) ?? null;
  const viewportW = parentEl?.clientWidth ?? window.innerWidth;
  const viewportH = parentEl?.clientHeight ?? window.innerHeight;
  const { width: chipW, height: chipH } = measuredRef.current;
  const GAP = 32;
  const EDGE_PAD = 8;
  const safeHalfW = viewportW * 0.2; // 40% wide, centred
  const safeLeftEdge = viewportW / 2 - safeHalfW;
  const safeRightEdge = viewportW / 2 + safeHalfW;

  const rightLeftPx = anchor.x + GAP;
  const rightRightPx = rightLeftPx + chipW;
  const leftRightPx = anchor.x - GAP;
  const leftLeftPx = leftRightPx - chipW;

  const intrudes = (l: number, r: number) => r > safeLeftEdge && l < safeRightEdge;
  const rightOverflows = rightRightPx > viewportW - EDGE_PAD;
  const leftOverflows = leftLeftPx < EDGE_PAD;
  const rightIntrudes = intrudes(rightLeftPx, rightRightPx);
  const leftIntrudes = intrudes(leftLeftPx, leftRightPx);

  let placement: 'left' | 'right' = 'right';
  if (rightOverflows || rightIntrudes) {
    if (!leftOverflows && !leftIntrudes) {
      placement = 'left';
    } else {
      // Both sides have a constraint — pick the side with more open space.
      const rightSpace = viewportW - anchor.x;
      const leftSpace = anchor.x;
      placement = rightSpace >= leftSpace ? 'right' : 'left';
    }
  }

  let chipLeft: number;
  if (placement === 'right') {
    chipLeft = anchor.x + GAP;
    // Push outward past the safe zone if needed, then clamp to viewport.
    if (intrudes(chipLeft, chipLeft + chipW)) {
      chipLeft = Math.max(chipLeft, safeRightEdge);
    }
    chipLeft = Math.min(chipLeft, viewportW - chipW - EDGE_PAD);
    chipLeft = Math.max(chipLeft, EDGE_PAD);
  } else {
    chipLeft = anchor.x - GAP - chipW;
    if (intrudes(chipLeft, chipLeft + chipW)) {
      chipLeft = Math.min(chipLeft, safeLeftEdge - chipW);
    }
    chipLeft = Math.max(chipLeft, EDGE_PAD);
    chipLeft = Math.min(chipLeft, viewportW - chipW - EDGE_PAD);
  }
  const chipTop = Math.max(EDGE_PAD, Math.min(viewportH - chipH - EDGE_PAD, anchor.y - chipH / 2));

  // Connector geometry — drawn inside the container, so coordinates are
  // relative to (chipLeft, chipTop). Show whenever the chip is more than
  // ~1.5× the standard gap from the joint, which only happens when
  // placement was pushed by a safe-zone or viewport clamp.
  const chipEdgeViewportX = placement === 'right' ? chipLeft : chipLeft + chipW;
  const distFromAnchor = Math.hypot(chipEdgeViewportX - anchor.x, (chipTop + chipH / 2) - anchor.y);
  const showConnector = distFromAnchor > GAP * 1.5;
  const jointRelX = anchor.x - chipLeft;
  const jointRelY = anchor.y - chipTop;
  const edgeRelX = placement === 'right' ? 0 : chipW;
  const edgeRelY = chipH / 2;

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>, dof: SliderDof) => {
    e.preventDefault();
    e.stopPropagation();
    const trackEl = e.currentTarget;
    const rect = trackEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const t = x / Math.max(1, rect.width);
    const value = dof.hardMin + t * (dof.hardMax - dof.hardMin);
    draggingRef.current = {
      configKey: dof.configKey,
      trackEl,
      hardMin: dof.hardMin,
      hardMax: dof.hardMax,
    };
    onDragStart(dof.configKey);
    onDrag(dof.configKey, value);
  };

  const valueToPct = (value: number, hardMin: number, hardMax: number) => {
    const span = Math.max(0.0001, hardMax - hardMin);
    return Math.max(0, Math.min(100, ((value - hardMin) / span) * 100));
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-30 pointer-events-auto select-none"
      style={{
        left: chipLeft,
        top: chipTop,
      }}
      data-testid="movement-slider-hud"
      data-placement={placement}
    >
      {showConnector && (
        <svg
          className="absolute pointer-events-none"
          style={{
            left: Math.min(edgeRelX, jointRelX) - 2,
            top: Math.min(edgeRelY, jointRelY) - 2,
            width: Math.abs(edgeRelX - jointRelX) + 4,
            height: Math.abs(edgeRelY - jointRelY) + 4,
            overflow: 'visible',
          }}
          aria-hidden="true"
        >
          <line
            x1={edgeRelX - (Math.min(edgeRelX, jointRelX) - 2)}
            y1={edgeRelY - (Math.min(edgeRelY, jointRelY) - 2)}
            x2={jointRelX - (Math.min(edgeRelX, jointRelX) - 2)}
            y2={jointRelY - (Math.min(edgeRelY, jointRelY) - 2)}
            stroke="rgba(16,185,129,0.55)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
      )}
      <div className="rounded-lg shadow-xl bg-slate-900/95 backdrop-blur border border-emerald-500/40 p-2 space-y-1.5 min-w-[260px]">
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5 border-b border-emerald-500/20">
          <span className="text-[10px] uppercase tracking-wide text-emerald-300/80">
            {jointDisplayName(jointKey)} · drive
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onMouseDown={e => e.stopPropagation()}
            className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-700/70 hover:text-slate-100 transition-colors"
            title="Close"
            aria-label="Close joint slider"
            data-testid="slider-close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {dofs.map(dof => {
          const current = getCurrentValue(dof.configKey);
          const aMin = dof.activeRomMin ?? dof.hardMin;
          const aMax = dof.activeRomMax ?? dof.hardMax;
          const pMin = dof.passiveRomMin ?? aMin;
          const pMax = dof.passiveRomMax ?? aMax;
          const arcLo = dof.painfulArc ? Math.min(dof.painfulArc.start, dof.painfulArc.end) : 0;
          const arcHi = dof.painfulArc ? Math.max(dof.painfulArc.start, dof.painfulArc.end) : 0;
          return (
            <div
              key={dof.configKey}
              className="flex items-center gap-1.5"
              data-testid={`slider-row-${dof.configKey}`}
            >
              <div className="text-[10px] text-emerald-200 w-10 shrink-0 capitalize tabular-nums">
                {dof.label}
              </div>
              <div
                className="relative cursor-pointer"
                style={{ width: TRACK_WIDTH_PX, height: 18 }}
                onMouseDown={e => handleTrackMouseDown(e, dof)}
                data-testid={`slider-track-${dof.configKey}`}
              >
                <div
                  className="absolute left-0 right-0 rounded-full bg-slate-700/70"
                  style={{ top: 5, height: TRACK_HEIGHT_PX }}
                />
                <div
                  className="absolute rounded-full bg-emerald-500/20"
                  style={{
                    top: 5,
                    height: TRACK_HEIGHT_PX,
                    left: `${valueToPct(pMin, dof.hardMin, dof.hardMax)}%`,
                    width: `${Math.max(0, valueToPct(pMax, dof.hardMin, dof.hardMax) - valueToPct(pMin, dof.hardMin, dof.hardMax))}%`,
                  }}
                />
                <div
                  className="absolute rounded-full bg-emerald-400/55"
                  style={{
                    top: 5,
                    height: TRACK_HEIGHT_PX,
                    left: `${valueToPct(aMin, dof.hardMin, dof.hardMax)}%`,
                    width: `${Math.max(0, valueToPct(aMax, dof.hardMin, dof.hardMax) - valueToPct(aMin, dof.hardMin, dof.hardMax))}%`,
                  }}
                />
                {dof.painfulArc && arcHi > arcLo && (() => {
                  // Directional shading + chevron + loading-mode pill +
                  // intensity meter for the painful-arc band.
                  const arcLeftPct = valueToPct(arcLo, dof.hardMin, dof.hardMax);
                  const arcRightPct = valueToPct(arcHi, dof.hardMin, dof.hardMax);
                  const arcWidthPct = Math.max(0, arcRightPct - arcLeftPct);
                  const dir = dof.painfulArc.direction;
                  const lm = dof.painfulArc.loadingMode;
                  const arcIntensity = dof.painfulArc.intensity ?? 5;
                  const stripeAngle = dir === 'descending' ? '-45deg' : dir === 'ascending' ? '45deg' : null;
                  const bandStyle: React.CSSProperties = {
                    top: 5,
                    height: TRACK_HEIGHT_PX,
                    left: `${arcLeftPct}%`,
                    width: `${arcWidthPct}%`,
                  };
                  if (stripeAngle) {
                    bandStyle.background = `repeating-linear-gradient(${stripeAngle}, rgba(239,68,68,0.85) 0, rgba(239,68,68,0.85) 3px, rgba(220,38,38,0.55) 3px, rgba(220,38,38,0.55) 6px)`;
                  }
                  const chevron = dir === 'ascending' ? '▶' : dir === 'descending' ? '◀' : null;
                  const chevronLeftPct = dir === 'ascending' ? arcLeftPct : dir === 'descending' ? arcRightPct : null;
                  const lmShort = lm === 'eccentric' ? 'ECC'
                    : lm === 'concentric' ? 'CON'
                      : lm === 'isometric' ? 'ISO'
                        : null;
                  // Intensity meter fills as the live angle approaches the
                  // arc midpoint (height = arcIntensity × proximity).
                  const arcMid = (arcLo + arcHi) / 2;
                  const arcHalf = Math.max(1, (arcHi - arcLo) / 2);
                  const inArc = current >= arcLo && current <= arcHi;
                  const proximity = inArc ? Math.max(0, 1 - Math.abs(current - arcMid) / arcHalf) : 0;
                  const meterPct = Math.round(proximity * (arcIntensity / 10) * 100);
                  const meterTint = arcIntensity >= 7
                    ? 'bg-red-500'
                    : arcIntensity >= 4
                      ? 'bg-orange-400'
                      : 'bg-amber-400';
                  return (
                    <>
                      <div
                        className={stripeAngle ? 'absolute rounded-full' : 'absolute rounded-full bg-red-500/65'}
                        style={bandStyle}
                        data-testid={`slider-painful-arc-${dof.configKey}`}
                        data-direction={dir || 'either'}
                        data-loading-mode={lm || 'any'}
                        title={dof.painfulArc.label || 'Painful arc'}
                      />
                      {chevron && chevronLeftPct !== null && (
                        <div
                          className="absolute text-[9px] leading-none text-red-200 font-bold drop-shadow"
                          style={{
                            top: 4,
                            left: `calc(${chevronLeftPct}% - 4px)`,
                          }}
                          data-testid={`slider-painful-arc-chevron-${dof.configKey}`}
                        >
                          {chevron}
                        </div>
                      )}
                      {lmShort && (
                        <div
                          className="absolute text-[8px] leading-none px-1 py-0.5 rounded bg-red-600/90 text-white font-bold tracking-wider border border-red-300/60"
                          style={{
                            top: -8,
                            left: `calc(${arcLeftPct + arcWidthPct / 2}% - 10px)`,
                          }}
                          data-testid={`slider-painful-arc-loading-${dof.configKey}`}
                          title={`Painful on ${lm} loading`}
                        >
                          {lmShort}
                        </div>
                      )}
                      <div
                        className="absolute right-[-10px] top-0 w-[5px] h-[18px] rounded-sm bg-slate-900/70 border border-slate-700/60 overflow-hidden"
                        title={`Pain intensity meter (max ${arcIntensity}/10)`}
                        data-testid={`slider-pain-intensity-meter-${dof.configKey}`}
                        data-meter-pct={meterPct}
                      >
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${meterTint} transition-[height] duration-100 ease-out`}
                          style={{ height: `${meterPct}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
                {dof.hardMin < 0 && dof.hardMax > 0 && (
                  <div
                    className="absolute bg-slate-400/50"
                    style={{
                      top: 2,
                      height: 14,
                      width: 1,
                      left: `${valueToPct(0, dof.hardMin, dof.hardMax)}%`,
                    }}
                  />
                )}
                <div
                  className={`absolute rounded-full border-2 shadow ${dof.pinned ? 'bg-amber-300 border-amber-100' : 'bg-emerald-200 border-emerald-50'}`}
                  style={{
                    top: 1,
                    width: 16,
                    height: 16,
                    left: `calc(${valueToPct(current, dof.hardMin, dof.hardMax)}% - 8px)`,
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <div className="text-[10px] font-semibold tabular-nums text-white w-9 text-right">
                {Math.round(current)}°
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTogglePin(dof.configKey); }}
                onMouseDown={e => e.stopPropagation()}
                className={`shrink-0 rounded-md p-1 transition-colors ${dof.pinned ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40' : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/70 hover:text-slate-100'}`}
                title={dof.pinned ? 'Unpin (allow spring-back)' : 'Pin (skip spring-back)'}
                data-testid={`slider-pin-${dof.configKey}`}
              >
                {dof.pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
              </button>
            </div>
          );
        })}
        <div className="text-[9px] text-slate-400 px-1 pt-0.5 border-t border-slate-700/40">
          Drag to test · release springs back · pin to keep
        </div>
      </div>
    </div>
  );
}
