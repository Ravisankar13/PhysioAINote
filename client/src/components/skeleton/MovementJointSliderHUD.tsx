import { useEffect, useRef, useState } from 'react';
import { Pin, PinOff } from 'lucide-react';

export interface SliderDof {
  configKey: string;
  label: string;
  hardMin: number;
  hardMax: number;
  activeRomMin: number | null;
  activeRomMax: number | null;
  passiveRomMin: number | null;
  passiveRomMax: number | null;
  painfulArc: { start: number; end: number; intensity?: number } | null;
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

  const anchor = getAnchor();
  if (!anchor || dofs.length === 0) return null;

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
      className="absolute z-30 pointer-events-auto select-none"
      style={{
        left: anchor.x + 32,
        top: anchor.y,
        transform: 'translate(0, -50%)',
      }}
      data-testid="movement-slider-hud"
    >
      <div className="rounded-lg shadow-xl bg-slate-900/95 backdrop-blur border border-emerald-500/40 p-2 space-y-1.5 min-w-[260px]">
        <div className="text-[10px] uppercase tracking-wide text-emerald-300/80 px-1 pb-0.5 border-b border-emerald-500/20">
          {jointDisplayName(jointKey)} · drive
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
                {dof.painfulArc && arcHi > arcLo && (
                  <div
                    className="absolute rounded-full bg-red-500/65"
                    style={{
                      top: 5,
                      height: TRACK_HEIGHT_PX,
                      left: `${valueToPct(arcLo, dof.hardMin, dof.hardMax)}%`,
                      width: `${Math.max(0, valueToPct(arcHi, dof.hardMin, dof.hardMax) - valueToPct(arcLo, dof.hardMin, dof.hardMax))}%`,
                    }}
                  />
                )}
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
