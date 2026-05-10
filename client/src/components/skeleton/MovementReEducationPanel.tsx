/**
 * Compensation Re-Education panel (Movement Mode).
 *
 * Mirrors the MovementSlingSpotlight layout. Reads the enriched
 * compensations produced by `enrichCompensations` (Re-Ed engine,
 * Task #372) and surfaces:
 *   - driver chip (multi-driver aware) + verdict chip
 *   - 5-axis cost dashboard (cervical, AC, lumbar, energy, secondary risk)
 *   - current pattern vs. better pattern card with rationale
 *   - "Push retraining plan to Plan Cart" CTA (one cart item per phase)
 *
 * The panel does NOT re-run detection or re-classify; it only renders
 * the snapshot it's handed. Hidden when there's nothing actionable.
 */
import { useMemo, useState } from 'react';
import { X, ChevronRight, Sparkles, Target, AlertTriangle, Layers } from 'lucide-react';
import {
  type CompensationDriver,
  type CompensationVerdict,
  type EnrichedCompensation,
  type EnrichmentOutput,
  getRetrainingPlanForCompensation,
} from '@/lib/compensationReEducation';
import { getCompensationPattern } from '@/lib/compensationLibrary';
import { usePlanCart, type PlanCartItem } from '@/lib/planCart';
import { compensationPhasesToCartItems } from '@/lib/compensationCartItems';

const VERDICT_STYLE: Record<CompensationVerdict, { bg: string; ring: string; text: string; label: string; row: string }> = {
  necessary: {
    bg: 'bg-emerald-500/15', ring: 'ring-emerald-400/60', text: 'text-emerald-200',
    label: 'Necessary',
    row: 'border-emerald-700/60 bg-emerald-900/30',
  },
  optimizable: {
    bg: 'bg-amber-500/15', ring: 'ring-amber-400/60', text: 'text-amber-200',
    label: 'Optimizable',
    row: 'border-amber-700/60 bg-amber-900/25',
  },
  harmful: {
    bg: 'bg-rose-500/15', ring: 'ring-rose-400/60', text: 'text-rose-200',
    label: 'Harmful',
    row: 'border-rose-700/60 bg-rose-900/25',
  },
  phase_out: {
    bg: 'bg-slate-500/15', ring: 'ring-slate-400/60', text: 'text-slate-200',
    label: 'Phase out',
    row: 'border-slate-700/60 bg-slate-800/50',
  },
};

const DRIVER_LABEL: Record<CompensationDriver, string> = {
  mechanical_block: 'Mechanical block',
  weakness: 'Weakness',
  motor_planning: 'Motor planning',
  pain: 'Pain avoidance',
  fear: 'Fear / avoidance',
  anatomical: 'Anatomical',
};

const DRIVER_DOT: Record<CompensationDriver, string> = {
  mechanical_block: 'bg-orange-400',
  weakness: 'bg-rose-400',
  motor_planning: 'bg-cyan-400',
  pain: 'bg-amber-400',
  fear: 'bg-fuchsia-400',
  anatomical: 'bg-slate-400',
};

interface CostBarProps { label: string; value: number; tone: 'cervical' | 'acJoint' | 'lumbar' | 'energy' | 'secondaryRisk'; }
const TONE_FILL: Record<CostBarProps['tone'], string> = {
  cervical: 'bg-rose-400',
  acJoint: 'bg-orange-400',
  lumbar: 'bg-amber-400',
  energy: 'bg-cyan-400',
  secondaryRisk: 'bg-fuchsia-400',
};
function CostBar({ label, value, tone }: CostBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-0.5" data-testid={`re-ed-cost-${tone}`}>
      <div className="flex items-center justify-between text-[8.5px] text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
        <div className={`h-full ${TONE_FILL[tone]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  enrichment: EnrichmentOutput;
  /** Active movement task id, used to bias which compensation gets focus
   *  and to tag cart items. */
  movementTaskId: string | null;
  onClose: () => void;
}

/** Pick the most-actionable compensation: prefer the active-task match,
 *  then the highest costScore, then the first finding. */
function pickFocusCompensation(
  comps: EnrichedCompensation[],
  movementTaskId: string | null,
): EnrichedCompensation | null {
  if (comps.length === 0) return null;
  if (movementTaskId) {
    const [j, m] = movementTaskId.split(':');
    const taskMatch = comps.find(c => c.joint === j && c.movement === m);
    if (taskMatch) return taskMatch;
  }
  const sorted = [...comps].sort((a, b) => b.costScore - a.costScore);
  return sorted[0] ?? null;
}

export default function MovementReEducationPanel({ enrichment, movementTaskId, onClose }: Props) {
  const { items: cartItems, add: addToCart, remove: removeFromCart } = usePlanCart();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const focus = useMemo<EnrichedCompensation | null>(() => {
    if (selectedId) {
      return enrichment.compensations.find(c => c.id === selectedId) ?? pickFocusCompensation(enrichment.compensations, movementTaskId);
    }
    return pickFocusCompensation(enrichment.compensations, movementTaskId);
  }, [enrichment, movementTaskId, selectedId]);

  if (!focus) return null;

  const verdictStyle = VERDICT_STYLE[focus.verdict];
  const matchedPattern = focus.matchedPatternId ? getCompensationPattern(focus.matchedPatternId) : null;
  const betterPattern = focus.betterPatternId ? getCompensationPattern(focus.betterPatternId) : null;
  const plan = getRetrainingPlanForCompensation(focus);
  const phaseItems: PlanCartItem[] = plan
    ? compensationPhasesToCartItems(focus, plan, { movementTaskId })
    : [];
  const cartIdSet = new Set(cartItems.map(i => i.id));
  const phasesInCart = phaseItems.filter(p => cartIdSet.has(p.id));
  const allInCart = phaseItems.length > 0 && phasesInCart.length === phaseItems.length;

  const handlePushPlan = () => {
    if (allInCart) {
      for (const it of phaseItems) removeFromCart(it.id);
    } else {
      for (const it of phaseItems) {
        if (!cartIdSet.has(it.id)) addToCart(it);
      }
    }
  };

  const otherCompensations = enrichment.compensations
    .filter(c => c.id !== focus.id)
    .slice(0, 4);

  return (
    <div
      className="absolute bottom-2 left-2 z-30 w-[340px] max-h-[85%] overflow-y-auto rounded-lg border-2 bg-slate-900/96 backdrop-blur-sm shadow-2xl border-cyan-700/60"
      data-testid="movement-re-ed-panel"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-700/70 bg-slate-900/96">
        <Layers className="w-3 h-3 text-cyan-300" />
        <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wide">Compensation Re-Ed</span>
        <span className="text-[8px] text-slate-500">· {enrichment.compensations.length} total</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto h-6 w-6 rounded hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 flex items-center justify-center"
          title="Hide Re-Ed panel"
          data-testid="re-ed-close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 space-y-2.5">
        {/* Focus compensation header */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Target className="w-3 h-3 text-cyan-300 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-100 truncate flex-1" data-testid="re-ed-focus-label">
              {(matchedPattern?.label ?? focus.matchedPatternLabel ?? 'Compensation')}
              <span className="text-slate-500 font-normal"> · {focus.joint.replace(/_/g, ' ')} {focus.movement}</span>
            </span>
            <span
              className={`text-[8.5px] px-1.5 py-0.5 rounded-full uppercase font-bold ${verdictStyle.bg} ${verdictStyle.text}`}
              data-testid="re-ed-verdict"
            >
              {verdictStyle.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="re-ed-driver-chips">
            {focus.drivers.map((d, i) => (
              <span
                key={d}
                className={`text-[8.5px] px-1.5 py-0.5 rounded border ${i === 0 ? 'border-slate-500/80 bg-slate-800/80 text-slate-100' : 'border-slate-700/70 bg-slate-900/60 text-slate-300'} flex items-center gap-1`}
                title={i === 0 ? 'Primary driver' : 'Contributing driver'}
                data-testid={`re-ed-driver-${d}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${DRIVER_DOT[d]}`} />
                {DRIVER_LABEL[d]}{i === 0 ? ' (primary)' : ''}
              </span>
            ))}
          </div>
          {focus.verdictReason && (
            <div className="text-[9.5px] text-slate-300 leading-snug italic" data-testid="re-ed-verdict-reason">
              {focus.verdictReason}
            </div>
          )}
        </div>

        {/* Cost dashboard */}
        <div className={`rounded p-1.5 ring-1 ${verdictStyle.ring} bg-slate-900/40 space-y-1`} data-testid="re-ed-cost-dashboard">
          <div className="flex items-center gap-2 text-[9px] text-slate-300">
            <AlertTriangle className="w-3 h-3 text-slate-400" />
            <span>Cost profile</span>
            <span className="font-mono text-slate-100 ml-auto">{Math.round(focus.costScore * 100)}/100</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <CostBar label="Cervical" value={focus.cost.cervical} tone="cervical" />
            <CostBar label="AC joint" value={focus.cost.acJoint} tone="acJoint" />
            <CostBar label="Lumbar" value={focus.cost.lumbar} tone="lumbar" />
            <CostBar label="Energy" value={focus.cost.energy} tone="energy" />
            <div className="col-span-2">
              <CostBar label="Secondary risk" value={focus.cost.secondaryRisk} tone="secondaryRisk" />
            </div>
          </div>
          {focus.costFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {focus.costFlags.slice(0, 3).map(f => (
                <span key={f} className="text-[8px] px-1 py-px rounded bg-slate-800 text-slate-300">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Current vs better pattern */}
        {betterPattern && (
          <div className="rounded border border-slate-700/70 bg-slate-950/50 p-1.5 space-y-1.5" data-testid="re-ed-pattern-compare">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">Current vs. better pattern</div>
            <div className="flex items-stretch gap-1.5">
              <div className="flex-1 rounded bg-rose-950/30 border border-rose-800/40 p-1.5 space-y-0.5">
                <div className="text-[8.5px] uppercase tracking-wider text-rose-300 font-semibold">Current</div>
                <div className="text-[10px] text-rose-100 font-medium leading-tight">{matchedPattern?.label ?? focus.matchedPatternLabel ?? '—'}</div>
                {matchedPattern?.description && (
                  <div className="text-[9px] text-rose-200/80 leading-snug">{matchedPattern.description}</div>
                )}
              </div>
              <ChevronRight className="w-3 h-3 text-slate-500 self-center shrink-0" />
              <div className="flex-1 rounded bg-emerald-950/30 border border-emerald-800/40 p-1.5 space-y-0.5">
                <div className="text-[8.5px] uppercase tracking-wider text-emerald-300 font-semibold">Better</div>
                <div className="text-[10px] text-emerald-100 font-medium leading-tight">{betterPattern.label}</div>
                <div className="text-[9px] text-emerald-200/80 leading-snug">{betterPattern.description}</div>
              </div>
            </div>
          </div>
        )}

        {/* Push to Plan Cart */}
        {plan && phaseItems.length > 0 && (
          <button
            type="button"
            onClick={handlePushPlan}
            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-semibold ${
              allInCart
                ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35'
                : 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/30'
            }`}
            data-testid="re-ed-push-plan"
            title={allInCart ? 'Remove the phased plan from Plan Cart' : 'Push the 5-phase retraining plan into Plan Cart'}
          >
            <Sparkles className="w-3 h-3" />
            {allInCart
              ? `✓ Plan in cart (${phaseItems.length} phases) — undo`
              : `Push retraining plan — ${phaseItems.length} phases${phasesInCart.length > 0 ? ` (${phasesInCart.length} already in cart)` : ''}`}
          </button>
        )}
        {plan && phaseItems.length > 0 && (
          <div className="rounded border border-slate-700/70 bg-slate-950/50 p-1.5 space-y-0.5" data-testid="re-ed-phase-list">
            {plan.phases.map((p, i) => {
              const cartItem = phaseItems[i];
              const inCart = cartIdSet.has(cartItem.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-start gap-1.5 text-[9px] rounded px-1.5 py-1 ${
                    inCart ? 'bg-emerald-950/40 text-emerald-100' : 'text-slate-300'
                  }`}
                >
                  <span className="font-mono text-[8.5px] text-slate-500 shrink-0 mt-px">{i + 1}.</span>
                  <div className="flex-1 leading-snug">
                    <span className="font-medium">{p.label}</span>
                    <span className="text-slate-500"> — {p.goal}</span>
                    <div className="text-slate-500 italic mt-0.5">Gate: {p.gateCriteria}</div>
                  </div>
                  {inCart && <span className="text-emerald-300 text-[8.5px] shrink-0">✓</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Other compensations selector */}
        {otherCompensations.length > 0 && (
          <div className="border-t border-slate-800 pt-1.5 space-y-1">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">
              Other compensations on this case ({otherCompensations.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {otherCompensations.map(c => {
                const vs = VERDICT_STYLE[c.verdict];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${vs.bg} ${vs.text} hover:opacity-80 truncate max-w-[160px]`}
                    title={`${c.matchedPatternLabel ?? 'Compensation'} · ${c.joint} ${c.movement} · ${vs.label}`}
                    data-testid={`re-ed-other-${c.id}`}
                  >
                    {(c.matchedPatternLabel ?? c.joint).slice(0, 22)}
                  </button>
                );
              })}
              {selectedId && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-[8.5px] text-slate-400 hover:text-slate-200 underline"
                  data-testid="re-ed-clear-selection"
                >
                  back to top
                </button>
              )}
            </div>
          </div>
        )}

        <div className="text-[8px] text-slate-500 italic border-t border-slate-800 pt-1">
          Driver / verdict / cost computed by the Re-Education engine from the active detector outputs.
          The phased plan reuses progression gates from the better-pattern definition.
        </div>
      </div>
    </div>
  );
}
