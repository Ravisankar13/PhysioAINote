import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MinusCircle,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { usePlanCart } from '@/lib/planCart';
import {
  TREATMENT_LIBRARY,
  type Intervention,
  type ScenarioBranch,
  type TreatmentEffectProfile,
} from '@/lib/recoverySimulationEngine';
import { lifestyleTreatmentIdFor } from '@/components/skeleton/LifestyleAdjunctEngineTab';

/** Map a PlanCart item modality+id onto a TREATMENT_LIBRARY id so it can be
 *  dropped on the engine's branch as an Intervention. */
function cartModalityToTreatmentId(modality: string, cartItemId: string): string {
  switch (modality) {
    case 'exercise':
    case 'exercise_custom':
      return 'progressive_strength';
    case 'manual_therapy':
    case 'manual_therapy_custom':
      return 'manual_therapy';
    case 'electrophysical':
      return 'electrophysical';
    case 'adjunct':
      return 'education';
    case 'lifestyle':
      return lifestyleTreatmentIdFor(cartItemId) ?? 'education';
    default:
      return 'education';
  }
}

export interface TimelineReviewVerdict {
  itemId: string;
  verdict: 'help' | 'neutral' | 'hinder';
  score: number;
  reasoning: string;
}

export interface TimelineReviewConflict {
  severity: 'info' | 'warning' | 'critical';
  description: string;
  involvedItemIds: string[];
}

export interface TimelineReviewResponse {
  summary: string;
  verdicts: TimelineReviewVerdict[];
  conflicts: TimelineReviewConflict[];
  generatedAt: string;
}

interface Props {
  branch: ScenarioBranch;
  totalWeeks: number;
  scrubWeek: number;
  treatmentLookup: Map<string, TreatmentEffectProfile>;
  customProfiles: TreatmentEffectProfile[];
  paletteOpenAtWeek: number | null;
  onClosePalette: () => void;
  onOpenPaletteAt: (week: number) => void;
  onAddIntervention: (treatmentId: string, startWeek: number) => void;
  onRemoveIntervention: (interventionId: string) => void;
  onUpdateInterventionWeek: (interventionId: string, startWeek: number) => void;
  onSetWeeksHorizon?: (weeks: number) => void;
  conditionLabel?: string;
}

const VERDICT_STYLE: Record<TimelineReviewVerdict['verdict'], { chip: string; label: string }> = {
  help: { chip: 'bg-emerald-700/40 text-emerald-100 border-emerald-600/60', label: 'Helps' },
  neutral: { chip: 'bg-gray-700/40 text-gray-200 border-gray-600/60', label: 'Neutral' },
  hinder: { chip: 'bg-red-700/40 text-red-100 border-red-600/60', label: 'Hinders' },
};

const SEVERITY_STYLE: Record<TimelineReviewConflict['severity'], string> = {
  info: 'bg-cyan-900/30 border-cyan-700/40 text-cyan-100',
  warning: 'bg-amber-900/30 border-amber-700/40 text-amber-100',
  critical: 'bg-red-900/30 border-red-700/40 text-red-100',
};

export default function TreatmentTimelinePanel({
  branch,
  totalWeeks,
  scrubWeek,
  treatmentLookup,
  customProfiles,
  paletteOpenAtWeek,
  onClosePalette,
  onOpenPaletteAt,
  onAddIntervention,
  onRemoveIntervention,
  onUpdateInterventionWeek,
  conditionLabel,
}: Props) {
  const { items: cartItems } = usePlanCart();
  const [aiStarterLoading, setAiStarterLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [review, setReview] = useState<TimelineReviewResponse | null>(null);
  const [conflictsOpen, setConflictsOpen] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const interventions = branch.interventions;

  const weekColWidth = useMemo(() => 100 / Math.max(1, totalWeeks), [totalWeeks]);

  const verdictById = useMemo(() => {
    const m = new Map<string, TimelineReviewVerdict>();
    for (const v of review?.verdicts ?? []) m.set(v.itemId, v);
    return m;
  }, [review]);

  /** Given a click x in the gantt area, return the week. */
  const weekFromX = useCallback((rect: DOMRect, clientX: number) => {
    const relX = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(totalWeeks, Math.round(relX * totalWeeks)));
  }, [totalWeeks]);

  const handleEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId) return;
    const target = e.currentTarget as HTMLDivElement;
    const wk = weekFromX(target.getBoundingClientRect(), e.clientX);
    onOpenPaletteAt(wk);
  };

  const handleBarDragStart = (id: string) => setDraggingId(id);
  const handleBarDragEnd = () => setDraggingId(null);
  const handleRowDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleRowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wk = weekFromX(rect, e.clientX);
    onUpdateInterventionWeek(draggingId, wk);
    setDraggingId(null);
  };

  const generateStarter = useCallback(async () => {
    setAiError(null);
    if (cartItems.length === 0) {
      setAiError('Add items to your plan from the engine tabs first.');
      return;
    }
    setAiStarterLoading(true);
    try {
      const res = await apiRequest('POST', '/api/treatment-plan/orchestrate', {
        items: cartItems,
        clinicalContext: {
          topHypothesis: conditionLabel,
          primaryRegion: conditionLabel,
        },
      });
      const data = await res.json();
      // Convert phases → interventions starting at each phase week.
      // Phases are sequential; estimate cumulative start week from durationWeeks.
      let cursor = 0;
      const phases: Array<{ itemIds: string[]; durationWeeks: string | number }> = data.phases ?? [];
      for (const ph of phases) {
        const dur = typeof ph.durationWeeks === 'number'
          ? ph.durationWeeks
          : parseInt(String(ph.durationWeeks).match(/\d+/)?.[0] ?? '4', 10);
        for (const itemId of ph.itemIds) {
          const cartItem = cartItems.find(c => c.id === itemId);
          if (!cartItem) continue;
          const tid = cartModalityToTreatmentId(cartItem.modality, cartItem.id);
          onAddIntervention(tid, cursor);
        }
        cursor = Math.min(totalWeeks, cursor + Math.max(1, dur));
      }
      if (phases.length === 0) {
        // Fallback: drop everything at week 0
        for (const ci of cartItems) {
          onAddIntervention(cartModalityToTreatmentId(ci.modality, ci.id), 0);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate starter plan');
    } finally {
      setAiStarterLoading(false);
    }
  }, [cartItems, onAddIntervention, conditionLabel, totalWeeks]);

  const reviewPlan = useCallback(async () => {
    setAiError(null);
    if (interventions.length === 0) {
      setAiError('Add interventions to the timeline first.');
      return;
    }
    setAiReviewLoading(true);
    try {
      const items = interventions.map(iv => {
        const t = treatmentLookup.get(iv.treatmentId);
        return {
          id: iv.id,
          treatmentId: iv.treatmentId,
          name: t?.name ?? iv.treatmentId,
          startWeek: iv.startWeek,
          endWeek: iv.endWeek,
          sessionsPerWeek: iv.sessionsPerWeek,
          doseMultiplier: iv.doseMultiplier,
          rationale: t?.description,
        };
      });
      const res = await apiRequest('POST', '/api/treatment-timeline/review', {
        items,
        context: {
          conditionLabel,
          totalWeeks,
        },
      });
      const data = (await res.json()) as TimelineReviewResponse;
      setReview(data);
      setConflictsOpen(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to review plan');
    } finally {
      setAiReviewLoading(false);
    }
  }, [interventions, treatmentLookup, conditionLabel, totalWeeks]);

  return (
    <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/15 p-2.5 mt-3" data-testid="treatment-timeline-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-cyan-300" />
          <span className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wide">Treatment Timeline Builder</span>
          <Badge className="bg-cyan-700/40 text-cyan-100 border-cyan-600/40 text-[9px]">
            {interventions.length} interventions · {totalWeeks}w horizon
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="h-6 text-[10px] bg-violet-700 hover:bg-violet-600 text-white"
            onClick={generateStarter}
            disabled={aiStarterLoading || cartItems.length === 0}
            title={cartItems.length === 0 ? 'Add items to My Plan first' : 'Generate AI starter plan from current cart items'}
            data-testid="btn-ai-starter"
          >
            {aiStarterLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            AI starter
          </Button>
          <Button
            size="sm"
            className="h-6 text-[10px] bg-cyan-700 hover:bg-cyan-600 text-white"
            onClick={reviewPlan}
            disabled={aiReviewLoading || interventions.length === 0}
            title="Score each item help/neutral/hinder + flag conflicts"
            data-testid="btn-ai-review"
          >
            {aiReviewLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            AI review
          </Button>
        </div>
      </div>

      {aiError && (
        <div className="mb-2 text-[10px] text-red-300 bg-red-950/40 border border-red-800/60 rounded px-2 py-1">
          {aiError}
        </div>
      )}

      {/* Week ruler */}
      <div className="relative mt-1 mb-1 select-none">
        <div className="flex text-[8px] text-gray-400">
          {Array.from({ length: totalWeeks + 1 }, (_, i) => i).filter(i => i % Math.max(1, Math.round(totalWeeks / 12)) === 0 || i === totalWeeks).map(i => (
            <span
              key={i}
              className="absolute"
              style={{ left: `${(i / Math.max(1, totalWeeks)) * 100}%`, transform: 'translateX(-50%)' }}
            >
              w{i}
            </span>
          ))}
          <span className="invisible">w0</span>
        </div>
      </div>

      {/* Gantt rows */}
      <div className="space-y-1" data-testid="timeline-gantt">
        {interventions.length === 0 && (
          <div
            className="relative h-7 rounded border border-dashed border-cyan-700/40 bg-cyan-950/20 text-[10px] text-cyan-200/80 flex items-center justify-center cursor-pointer hover:bg-cyan-900/30"
            onClick={handleEmptyClick}
            data-testid="timeline-empty-row"
            title="Click anywhere on this row to drop an intervention at that week"
          >
            <Plus className="h-3 w-3 mr-1" /> Click anywhere to drop an intervention · or use AI starter
          </div>
        )}
        {interventions.map(iv => {
          const t = treatmentLookup.get(iv.treatmentId);
          const start = Math.max(0, Math.min(totalWeeks, iv.startWeek));
          const end = iv.endWeek != null
            ? Math.max(start + 1, Math.min(totalWeeks, iv.endWeek))
            : Math.min(totalWeeks, start + Math.max(1, t?.durationWeeks ?? 4));
          const left = (start / Math.max(1, totalWeeks)) * 100;
          const width = Math.max(2, ((end - start) / Math.max(1, totalWeeks)) * 100);
          const verdict = verdictById.get(iv.id);
          const scrubInside = scrubWeek >= start && scrubWeek <= end;
          return (
            <div
              key={iv.id}
              className="relative h-7 rounded border border-gray-700/50 bg-gray-900/50 cursor-pointer hover:bg-gray-900/70"
              onClick={handleEmptyClick}
              onDragOver={handleRowDragOver}
              onDrop={handleRowDrop}
              data-testid={`timeline-row-${iv.id}`}
            >
              {/* Scrub cursor line */}
              {scrubInside && (
                <span
                  className="absolute top-0 bottom-0 w-px bg-violet-300/70 pointer-events-none"
                  style={{ left: `${(scrubWeek / Math.max(1, totalWeeks)) * 100}%` }}
                />
              )}
              <div
                draggable
                onDragStart={(e) => { e.stopPropagation(); handleBarDragStart(iv.id); }}
                onDragEnd={handleBarDragEnd}
                onClick={e => e.stopPropagation()}
                className={`absolute top-0.5 bottom-0.5 rounded px-1 flex items-center gap-1 text-[10px] text-white shadow ${verdict?.verdict === 'hinder' ? 'bg-red-700/80 border border-red-500' : verdict?.verdict === 'help' ? 'bg-emerald-700/80 border border-emerald-500' : 'bg-cyan-700/80 border border-cyan-500'}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${t?.name ?? iv.treatmentId} · w${start}–w${end}${verdict ? ` · AI: ${verdict.verdict} (${verdict.reasoning})` : ''}`}
              >
                <span className="truncate flex-1">{t?.name ?? iv.treatmentId}</span>
                {verdict && (
                  <span className={`text-[8px] px-1 rounded border ${VERDICT_STYLE[verdict.verdict].chip}`}>
                    {VERDICT_STYLE[verdict.verdict].label}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveIntervention(iv.id); }}
                  className="text-white/70 hover:text-white"
                  title="Remove"
                  data-testid={`timeline-remove-${iv.id}`}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 text-[9px] text-gray-400">
        Click an empty area to drop an intervention at that week · drag a bar to reschedule
      </div>

      {/* Palette popover */}
      {paletteOpenAtWeek != null && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center"
          onClick={onClosePalette}
          data-testid="timeline-palette"
        >
          <div className="bg-gray-900 border border-cyan-700/40 rounded-lg p-3 w-[460px] max-w-[92vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">Drop intervention @ week {paletteOpenAtWeek}</div>
              <button onClick={onClosePalette} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {cartItems.length > 0 && (
              <>
                <div className="text-[10px] text-violet-200 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />From My Plan ({cartItems.length})</div>
                <div className="grid grid-cols-1 gap-1 mb-3">
                  {cartItems.map(ci => (
                    <button
                      key={ci.id}
                      onClick={() => {
                        onAddIntervention(cartModalityToTreatmentId(ci.modality, ci.id), paletteOpenAtWeek);
                        onClosePalette();
                      }}
                      className="text-left text-[10px] px-2 py-1 rounded bg-violet-950/40 hover:bg-violet-900/60 text-violet-100 border border-violet-700/40"
                      data-testid={`palette-cart-${ci.id}`}
                    >
                      + <span className="font-semibold">{ci.modality}</span> · {ci.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="text-[10px] text-gray-400 mb-1">Treatment library</div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {TREATMENT_LIBRARY.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onAddIntervention(t.id, paletteOpenAtWeek); onClosePalette(); }}
                  className="text-left text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-cyan-900/40 text-gray-200 border border-gray-700/50"
                  title={t.description}
                  data-testid={`palette-lib-${t.id}`}
                >
                  + {t.name}
                </button>
              ))}
            </div>
            {customProfiles.length > 0 && (
              <>
                <div className="text-[10px] text-cyan-300 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI-Designed</div>
                <div className="grid grid-cols-1 gap-1">
                  {customProfiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { onAddIntervention(p.id, paletteOpenAtWeek); onClosePalette(); }}
                      className="text-left text-[10px] px-2 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-100 border border-cyan-700/40"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI review summary */}
      {review && (
        <div className="mt-2 rounded border border-violet-700/40 bg-violet-950/20 p-2" data-testid="timeline-review">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3 w-3 text-violet-300" />
            <span className="text-[10px] font-semibold text-violet-200 uppercase tracking-wide">AI Plan Review</span>
            <Badge className="bg-violet-700/40 text-violet-100 border-violet-600/40 text-[9px]">
              {review.verdicts.filter(v => v.verdict === 'help').length} help · {review.verdicts.filter(v => v.verdict === 'neutral').length} neutral · {review.verdicts.filter(v => v.verdict === 'hinder').length} hinder
            </Badge>
          </div>
          <div className="text-[10px] text-gray-200 italic mb-1.5">{review.summary}</div>
          {review.conflicts.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setConflictsOpen(o => !o)}
                className="text-[10px] flex items-center gap-1 text-amber-200 hover:text-amber-100"
              >
                {conflictsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <AlertTriangle className="h-3 w-3" />
                {review.conflicts.length} conflict{review.conflicts.length > 1 ? 's' : ''} flagged
              </button>
              {conflictsOpen && review.conflicts.map((c, idx) => (
                <div key={idx} className={`rounded border px-2 py-1 text-[10px] ${SEVERITY_STYLE[c.severity]}`} data-testid={`timeline-conflict-${idx}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-semibold uppercase tracking-wide text-[8px]">{c.severity}</span>
                    {c.involvedItemIds.length > 0 && (
                      <span className="text-[8px] opacity-80">· {c.involvedItemIds.length} item{c.involvedItemIds.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div>{c.description}</div>
                </div>
              ))}
            </div>
          )}
          {review.verdicts.some(v => v.verdict === 'hinder') && (
            <div className="mt-1.5 text-[9px] text-red-200/90 flex items-start gap-1">
              <MinusCircle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>Items flagged as <em>hinder</em> are likely to slow recovery for this patient — consider rescheduling, dosage change, or removal.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
