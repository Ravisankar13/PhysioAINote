import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Network,
  AlertTriangle,
  GitBranch,
  Zap,
  Stethoscope,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import type { PainStoryline, PainStoryStepKind } from '@/lib/painStorylineEngine';
import {
  AddToPlanButton,
  makeCartId,
  type PlanCartItem,
  type PlanCartModality,
} from '@/lib/planCart';
import type {
  SlingDrivenRecommendation,
  DriverModality,
} from '@/lib/slingDriverAnalysis';

interface Props {
  storyline: PainStoryline;
  /** When true the storyline is rendered inline (no border / heading bar) so
   *  it can sit inside an existing card such as the per-SlingCard "Why this
   *  hurts" expansion. */
  variant?: 'standalone' | 'inline';
  /** Override default expanded state. */
  defaultExpanded?: boolean;
}

const STEP_ICON: Record<PainStoryStepKind, typeof MapPin> = {
  'pain-here': MapPin,
  'compromised-sling': Network,
  'weak-link': AlertTriangle,
  compensator: GitBranch,
  'overloaded-tissue': Zap,
  'why-it-hurts': Stethoscope,
  fix: Sparkles,
};

const STEP_TONE: Record<PainStoryStepKind, string> = {
  'pain-here': 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  'compromised-sling': 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  'weak-link': 'text-red-300 border-red-500/40 bg-red-500/10',
  compensator: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  'overloaded-tissue': 'text-orange-300 border-orange-500/40 bg-orange-500/10',
  'why-it-hurts': 'text-purple-300 border-purple-500/40 bg-purple-500/10',
  fix: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
};

const CONFIDENCE_BADGE: Record<PainStoryline['confidence'], string> = {
  high: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  moderate: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  low: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
};

const DRIVER_MODALITY_TO_CART: Record<DriverModality, PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

function recToCartItem(rec: SlingDrivenRecommendation): PlanCartItem {
  return {
    id: makeCartId(DRIVER_MODALITY_TO_CART[rec.modality], `sling_${rec.slingId}_${rec.name}`),
    modality: DRIVER_MODALITY_TO_CART[rec.modality],
    name: rec.name,
    targetStructure: rec.target,
    targetFinding: `Sling-driven · ${rec.slingLabel}`,
    dosage: rec.dosage,
    rationale: rec.rationale,
    slingTag: rec.slingLabel,
    slingRole: rec.role,
  };
}

export default function PainStorylineCard({
  storyline,
  variant = 'standalone',
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isInline = variant === 'inline';

  const wrapperClasses = isInline
    ? 'rounded-md border border-slate-700/40 bg-slate-900/40 p-2 space-y-2'
    : 'rounded-lg border border-rose-500/30 bg-gradient-to-br from-slate-900/80 to-rose-950/20 p-2.5 space-y-2';

  return (
    <div
      className={wrapperClasses}
      data-testid={`pain-storyline-${storyline.slingId}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-1.5 text-left"
      >
        <HelpCircle
          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isInline ? 'text-slate-300' : 'text-rose-300'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] font-semibold ${isInline ? 'text-slate-100' : 'text-rose-100'}`}
            >
              Why this hurts
            </span>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: storyline.slingColor }}
            />
            <span className="text-[10px] text-slate-300 truncate">{storyline.slingLabel}</span>
            <span
              className={`text-[8px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_BADGE[storyline.confidence]}`}
              data-testid={`pain-storyline-confidence-${storyline.confidence}`}
            >
              {storyline.confidence} confidence
            </span>
          </div>
          {!expanded && (
            <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{storyline.headline}</div>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
        )}
      </button>

      {expanded && (
        <ol className="space-y-1.5 pl-0.5">
          {storyline.steps.map((step, i) => {
            const Icon = STEP_ICON[step.kind];
            const isFix = step.kind === 'fix';
            return (
              <li
                key={`${step.kind}-${i}`}
                className="relative flex items-start gap-2"
                data-testid={`pain-storyline-step-${step.kind}`}
              >
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold tabular-nums ${STEP_TONE[step.kind]}`}
                  >
                    {i + 1}
                  </div>
                  {i < storyline.steps.length - 1 && (
                    <div className="w-px flex-1 min-h-[12px] bg-slate-700/50 mt-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon className={`w-2.5 h-2.5 ${STEP_TONE[step.kind].split(' ')[0]}`} />
                    <span
                      className={`text-[9px] uppercase tracking-wide font-semibold ${STEP_TONE[step.kind].split(' ')[0]}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-100 leading-snug">{step.body}</div>
                  {step.detail && (
                    <div className="text-[9px] text-slate-400 leading-snug mt-0.5">{step.detail}</div>
                  )}
                  {isFix && storyline.recommendations.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {storyline.recommendations.map(rec => (
                        <div
                          key={rec.id}
                          className="flex items-start gap-1.5 p-1 rounded bg-emerald-500/5 border border-emerald-500/20"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-emerald-300 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-100">{rec.name}</div>
                            <div className="text-[9px] text-slate-400 leading-snug">{rec.rationale}</div>
                          </div>
                          <AddToPlanButton size="xs" item={recToCartItem(rec)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
