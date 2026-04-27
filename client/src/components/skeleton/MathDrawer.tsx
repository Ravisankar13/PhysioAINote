import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Sigma, X, BookOpen } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { MathReadout } from '@/lib/mechanicsAnalyserMath';

interface KatexProps {
  expression: string;
  block?: boolean;
  className?: string;
}

export function Katex({ expression, block, className }: KatexProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(expression, ref.current, {
        throwOnError: false,
        displayMode: !!block,
        output: 'html',
      });
    } catch {
      if (ref.current) ref.current.textContent = expression;
    }
  }, [expression, block]);
  return <span ref={ref} className={className} />;
}

interface MathChipProps {
  readout: MathReadout | null | undefined;
  /** Optional override label (default "ƒx Show math"). */
  label?: string;
  /** Compact size for inline use. */
  size?: 'xs' | 'sm';
  /** Optional title used in the drawer header. */
  title?: string;
}

export function MathChip({ readout, label = 'ƒx', size = 'xs', title }: MathChipProps) {
  const [open, setOpen] = useState(false);
  if (!readout) return null;

  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]';
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-0.5 ${padding} font-mono rounded-full bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 hover:text-cyan-200 border border-cyan-500/30 transition-colors`}
        data-testid="math-chip"
        title="Show derivation"
      >
        <Sigma className="h-2.5 w-2.5" />
        {label}
      </button>
      {open && (
        <MathDrawer
          readout={readout}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface MathDrawerProps {
  readout: MathReadout;
  title?: string;
  onClose: () => void;
}

export function MathDrawer({ readout, title, onClose }: MathDrawerProps) {
  useEffect(() => {
    // Listen in capture phase and stop immediate propagation so an Esc
    // press only closes the drawer — never simultaneously the parent
    // workspace (e.g. Mechanics Analyser) that may also bind Esc.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      data-testid="math-drawer"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border border-cyan-500/30 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-gray-100">{title ?? 'Derivation'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono text-cyan-300">{Number.isFinite(readout.value) ? readout.value : '—'}</span>
            <span className="text-sm text-gray-400">{readout.units}</span>
            {readout.normativeRange && (
              <span className="ml-auto text-[10px] text-gray-400 italic">
                normative: {readout.normativeRange[0]}–{readout.normativeRange[1]} {readout.units}
              </span>
            )}
          </div>

          {readout.interpretation && (
            <div className="text-xs text-gray-300 leading-snug border-l-2 border-cyan-500/40 pl-2">
              {readout.interpretation}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Formula</div>
            <div className="bg-gray-800/60 border border-gray-700/40 rounded p-3 overflow-x-auto">
              <Katex expression={readout.formula} block />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Substituted</div>
            <div className="bg-gray-800/60 border border-gray-700/40 rounded p-3 overflow-x-auto">
              <Katex expression={readout.substitutions} block />
            </div>
          </div>

          {readout.assumptions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Assumptions</div>
              <ul className="text-[11px] text-gray-300 space-y-0.5 list-disc list-inside">
                {readout.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {readout.citations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                <BookOpen className="h-3 w-3" />
                Citations
              </div>
              <ul className="text-[11px] text-cyan-300/90 space-y-0.5">
                {readout.citations.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface MetricRowProps {
  label: ReactNode;
  value: number | string;
  units?: string;
  status?: 'good' | 'warning' | 'bad' | 'neutral';
  normativeRange?: [number, number] | null;
  readout?: MathReadout | null;
  /** Optional custom title for the math drawer (defaults to `label`). */
  drawerTitle?: string;
  /** Compact mode for dense panels. */
  dense?: boolean;
}

const STATUS_COLORS: Record<NonNullable<MetricRowProps['status']>, string> = {
  good: 'text-emerald-300',
  warning: 'text-amber-300',
  bad: 'text-rose-300',
  neutral: 'text-gray-200',
};

export function MetricRow({ label, value, units, status = 'neutral', normativeRange, readout, drawerTitle, dense }: MetricRowProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${dense ? 'py-0.5' : 'py-1'} border-b border-gray-700/30 last:border-b-0`}>
      <div className="text-[10px] text-gray-400 truncate flex-1">{label}</div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`font-mono ${dense ? 'text-[11px]' : 'text-xs'} ${STATUS_COLORS[status]}`}>
          {value}{units && <span className="ml-0.5 text-[9px] text-gray-500">{units}</span>}
        </span>
        {normativeRange && (
          <span className="text-[8px] text-gray-500 hidden md:inline">({normativeRange[0]}–{normativeRange[1]})</span>
        )}
        {readout && <MathChip readout={readout} title={drawerTitle ?? (typeof label === 'string' ? label : undefined)} />}
      </div>
    </div>
  );
}
