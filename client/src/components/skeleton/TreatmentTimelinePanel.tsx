import { useCallback, useMemo, useRef, useState } from 'react';
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
import { usePlanCart, type PlanCartModality, type PlanCartItem } from '@/lib/planCart';
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

const CART_MODALITY_GROUPS: Array<{ id: PlanCartModality | 'exercise_all' | 'manual_all'; label: string; match: (m: PlanCartModality) => boolean }> = [
  { id: 'exercise_all', label: 'Exercises', match: m => m === 'exercise' || m === 'exercise_custom' },
  { id: 'manual_all', label: 'Manual Therapy', match: m => m === 'manual_therapy' || m === 'manual_therapy_custom' },
  { id: 'electrophysical', label: 'Electrophysical', match: m => m === 'electrophysical' },
  { id: 'adjunct', label: 'Adjunct Rx', match: m => m === 'adjunct' },
  { id: 'lifestyle', label: 'Lifestyle & Adjunct Rx', match: m => m === 'lifestyle' },
];

/** Color a Gantt bar by the engine's treatment modality. */
function modalityBarStyle(modality: TreatmentEffectProfile['modality'] | undefined, verdict?: 'help' | 'neutral' | 'hinder'): string {
  if (verdict === 'hinder') return 'bg-red-700/80 border-red-500';
  if (verdict === 'help') return 'bg-emerald-700/80 border-emerald-500';
  switch (modality) {
    case 'manual': return 'bg-orange-700/80 border-orange-500';
    case 'exercise': return 'bg-blue-700/80 border-blue-500';
    case 'electrophysical': return 'bg-fuchsia-700/80 border-fuchsia-500';
    case 'education': return 'bg-violet-700/80 border-violet-500';
    case 'load': return 'bg-emerald-700/80 border-emerald-500';
    case 'rest': return 'bg-amber-700/80 border-amber-500';
    case 'taping': return 'bg-cyan-700/80 border-cyan-500';
    case 'medication': return 'bg-rose-700/80 border-rose-500';
    default: return 'bg-cyan-700/80 border-cyan-500';
  }
}

export interface TimelineReviewVerdict {
  itemId: string;
  verdict: 'help' | 'neutral' | 'hinder';
  score: number;
  rationale: string;
}

export interface TimelineRescheduleSuggestion {
  itemId: string;
  newStartWeek: number;
}

export interface TimelineReviewConflict {
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  interventionIds: string[];
  suggestedReschedule?: TimelineRescheduleSuggestion[];
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
  onAddIntervention: (treatmentId: string, startWeek: number, endWeek?: number) => void;
  onRemoveIntervention: (interventionId: string) => void;
  onUpdateInterventionWeek: (interventionId: string, startWeek: number) => void;
  onResizeIntervention?: (interventionId: string, endWeek: number) => void;
  onResizeInterventionStart?: (interventionId: string, startWeek: number) => void;
  onClearInterventions?: () => void;
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
  onResizeIntervention,
  onResizeInterventionStart,
  onClearInterventions,
  conditionLabel,
}: Props) {
  const { items: cartItems } = usePlanCart();
  const [aiStarterLoading, setAiStarterLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [review, setReview] = useState<TimelineReviewResponse | null>(null);
  const [conflictsOpen, setConflictsOpen] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [confirmStarter, setConfirmStarter] = useState(false);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const interventions = branch.interventions;

  const verdictById = useMemo(() => {
    const m = new Map<string, TimelineReviewVerdict>();
    for (const v of review?.verdicts ?? []) m.set(v.itemId, v);
    return m;
  }, [review]);

  /** Build per-week tick array for the "+ at week N" quick-add row. */
  const weekTicks = useMemo(() => {
    // Show every Nth so we never crowd: target ~12 ticks
    const stride = Math.max(1, Math.round(totalWeeks / 12));
    const out: number[] = [];
    for (let w = 0; w <= totalWeeks; w += stride) out.push(w);
    if (out[out.length - 1] !== totalWeeks) out.push(totalWeeks);
    return out;
  }, [totalWeeks]);

  /** Group cart items by 5 modality buckets. */
  const groupedCart = useMemo(() => {
    return CART_MODALITY_GROUPS.map(g => ({
      ...g,
      items: cartItems.filter(ci => g.match(ci.modality)),
    })).filter(g => g.items.length > 0);
  }, [cartItems]);

  /** Given a click x in the gantt area, return the week. */
  const weekFromX = useCallback((rect: DOMRect, clientX: number) => {
    const relX = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(totalWeeks, Math.round(relX * totalWeeks)));
  }, [totalWeeks]);

  const handleEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId || resizingId) return;
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

  /** Edge resize via mouse — `edge: 'left'` shortens/extends the start week,
   *  `edge: 'right'` shortens/extends the end week. */
  const beginResize = (e: React.MouseEvent, id: string, edge: 'left' | 'right') => {
    if (edge === 'right' && !onResizeIntervention) return;
    if (edge === 'left' && !onResizeInterventionStart) return;
    e.stopPropagation();
    e.preventDefault();
    setResizingId(id);
    const rowEl = rowRefs.current.get(id);
    if (!rowEl) return;
    const onMove = (mv: MouseEvent) => {
      const rect = rowEl.getBoundingClientRect();
      const wk = weekFromX(rect, mv.clientX);
      const iv = interventions.find(x => x.id === id);
      if (!iv) return;
      if (edge === 'right') {
        const minEnd = iv.startWeek + 1;
        onResizeIntervention!(id, Math.max(minEnd, wk));
      } else {
        const maxStart = (iv.endWeek ?? iv.startWeek + 1) - 1;
        onResizeInterventionStart!(id, Math.max(0, Math.min(maxStart, wk)));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setResizingId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const doGenerateStarter = useCallback(async (replace: boolean) => {
    setAiError(null);
    setConfirmStarter(false);
    if (cartItems.length === 0) {
      setAiError('Add items to your plan from the engine tabs first.');
      return;
    }
    setAiStarterLoading(true);
    try {
      const data = await apiRequest('/api/treatment-plan/orchestrate', 'POST', {
        items: cartItems,
        clinicalContext: {
          topHypothesis: conditionLabel,
          primaryRegion: conditionLabel,
        },
      });
      if (replace && onClearInterventions) {
        onClearInterventions();
      }
      let cursor = 0;
      const phases: Array<{ itemIds: string[]; durationWeeks: string | number }> = data.phases ?? [];
      for (const ph of phases) {
        const dur = typeof ph.durationWeeks === 'number'
          ? ph.durationWeeks
          : parseInt(String(ph.durationWeeks).match(/\d+/)?.[0] ?? '4', 10);
        const phaseEnd = Math.min(totalWeeks, cursor + Math.max(1, dur));
        for (const itemId of ph.itemIds) {
          const cartItem = cartItems.find(c => c.id === itemId);
          if (!cartItem) continue;
          const tid = cartModalityToTreatmentId(cartItem.modality, cartItem.id);
          // Pass the AI-derived phase end so each intervention gets a real
          // startWeek + endWeek window (not just a cursor placement).
          onAddIntervention(tid, cursor, phaseEnd);
        }
        cursor = phaseEnd;
      }
      if (phases.length === 0) {
        for (const ci of cartItems) {
          onAddIntervention(cartModalityToTreatmentId(ci.modality, ci.id), 0);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate starter plan');
    } finally {
      setAiStarterLoading(false);
    }
  }, [cartItems, onAddIntervention, onClearInterventions, conditionLabel, totalWeeks]);

  const onClickGenerateStarter = useCallback(() => {
    setAiError(null);
    if (interventions.length > 0) {
      setConfirmStarter(true);
    } else {
      void doGenerateStarter(false);
    }
  }, [interventions.length, doGenerateStarter]);

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
      const data = (await apiRequest('/api/treatment-timeline/review', 'POST', {
        items,
        context: {
          conditionLabel,
          totalWeeks,
        },
      })) as TimelineReviewResponse;
      setReview(data);
      setConflictsOpen(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to review plan');
    } finally {
      setAiReviewLoading(false);
    }
  }, [interventions, treatmentLookup, conditionLabel, totalWeeks]);

  const applyReschedule = (suggestions: TimelineRescheduleSuggestion[]) => {
    for (const s of suggestions) onUpdateInterventionWeek(s.itemId, s.newStartWeek);
  };

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
            onClick={onClickGenerateStarter}
            disabled={aiStarterLoading || cartItems.length === 0}
            title={cartItems.length === 0 ? 'Add items to My Plan first' : interventions.length > 0 ? 'Regenerate AI starter plan (will replace current timeline)' : 'Generate AI starter plan from My Plan'}
            data-testid="btn-ai-starter"
          >
            {aiStarterLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {interventions.length > 0 ? 'AI regenerate' : 'AI starter'}
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

      {confirmStarter && (
        <div className="mb-2 text-[10px] text-amber-100 bg-amber-950/40 border border-amber-700/60 rounded px-2 py-1.5 flex items-center gap-2 flex-wrap" data-testid="starter-confirm">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span className="flex-1">Replace the current {interventions.length} intervention{interventions.length === 1 ? '' : 's'} with an AI-generated starter plan from My Plan?</span>
          <Button size="sm" className="h-5 text-[9px] bg-amber-700 hover:bg-amber-600 text-white" onClick={() => doGenerateStarter(true)} data-testid="btn-confirm-starter">
            Replace
          </Button>
          <Button size="sm" variant="outline" className="h-5 text-[9px] border-gray-600 text-gray-200" onClick={() => setConfirmStarter(false)} data-testid="btn-cancel-starter">
            Cancel
          </Button>
        </div>
      )}

      {/* Quick-add row: per-week "+ Add at week N" affordances */}
      <div className="relative mt-1 mb-1.5 select-none">
        <div className="text-[8px] text-gray-500 uppercase tracking-wide mb-0.5">+ Add at week</div>
        <div className="relative h-5">
          {weekTicks.map(w => (
            <button
              key={w}
              onClick={(e) => { e.stopPropagation(); onOpenPaletteAt(w); }}
              className="absolute top-0 -translate-x-1/2 h-5 px-1 rounded text-[9px] text-cyan-200 bg-cyan-900/40 hover:bg-cyan-700/70 border border-cyan-700/40 flex items-center"
              style={{ left: `${(w / Math.max(1, totalWeeks)) * 100}%` }}
              title={`Add at week ${w}`}
              data-testid={`btn-week-add-${w}`}
            >
              <Plus className="h-2.5 w-2.5" />w{w}
            </button>
          ))}
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
              ref={el => { rowRefs.current.set(iv.id, el); }}
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
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveIntervention(iv.id); }}
                className={`absolute top-0.5 bottom-0.5 rounded pl-3 pr-3 flex items-center gap-1 text-[10px] text-white shadow border ${modalityBarStyle(t?.modality, verdict?.verdict)}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${t?.name ?? iv.treatmentId} · w${start}–w${end}${verdict ? ` · AI: ${verdict.verdict} (${verdict.rationale})` : ''}\nRight-click to remove · drag edges to resize`}
              >
                {/* Left-edge resize handle */}
                {onResizeInterventionStart && (
                  <div
                    onMouseDown={(e) => beginResize(e, iv.id, 'left')}
                    onClick={e => e.stopPropagation()}
                    className="absolute top-0 left-0 h-full w-2 cursor-ew-resize bg-white/20 hover:bg-white/50 rounded-l"
                    title="Drag left edge to change start week"
                    data-testid={`timeline-resize-start-${iv.id}`}
                  />
                )}
                <span className="truncate flex-1">{t?.name ?? iv.treatmentId}</span>
                {verdict && (
                  <span className={`text-[8px] px-1 rounded border ${VERDICT_STYLE[verdict.verdict].chip}`}>
                    {VERDICT_STYLE[verdict.verdict].label}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveIntervention(iv.id); }}
                  className="text-white/70 hover:text-white"
                  title="Remove (or right-click bar)"
                  data-testid={`timeline-remove-${iv.id}`}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
                {/* Right-edge resize handle */}
                {onResizeIntervention && (
                  <div
                    onMouseDown={(e) => beginResize(e, iv.id, 'right')}
                    onClick={e => e.stopPropagation()}
                    className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/20 hover:bg-white/50 rounded-r"
                    title="Drag right edge to resize duration"
                    data-testid={`timeline-resize-${iv.id}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 text-[9px] text-gray-400">
        Click an empty area or a "+ wN" button to add · drag a bar to reschedule · drag either edge to resize · right-click a bar to remove
      </div>

      {/* Palette popover */}
      {paletteOpenAtWeek != null && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center"
          onClick={onClosePalette}
          data-testid="timeline-palette"
        >
          <div className="bg-gray-900 border border-cyan-700/40 rounded-lg p-3 w-[480px] max-w-[92vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">Drop intervention @ week {paletteOpenAtWeek}</div>
              <button onClick={onClosePalette} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {groupedCart.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="text-[10px] text-violet-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />From My Plan ({cartItems.length})
                </div>
                {groupedCart.map(g => (
                  <div key={String(g.id)} data-testid={`palette-group-${g.id}`}>
                    <div className="text-[9px] uppercase tracking-wide text-violet-300/80 mb-0.5">{g.label} · {g.items.length}</div>
                    <div className="grid grid-cols-1 gap-1">
                      {g.items.map((ci: PlanCartItem) => (
                        <button
                          key={ci.id}
                          onClick={() => {
                            onAddIntervention(cartModalityToTreatmentId(ci.modality, ci.id), paletteOpenAtWeek);
                            onClosePalette();
                          }}
                          className="text-left text-[10px] px-2 py-1 rounded bg-violet-950/40 hover:bg-violet-900/60 text-violet-100 border border-violet-700/40"
                          data-testid={`palette-cart-${ci.id}`}
                        >
                          + {ci.name}
                          {ci.dosage && <span className="text-[8px] text-violet-300/80 ml-1">· {ci.dosage}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
              {conflictsOpen && review.conflicts.map((c, idx) => {
                const fixes = (c.suggestedReschedule ?? []).filter(s =>
                  interventions.some(iv => iv.id === s.itemId)
                );
                return (
                  <div key={idx} className={`rounded border px-2 py-1 text-[10px] ${SEVERITY_STYLE[c.severity]}`} data-testid={`timeline-conflict-${idx}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-semibold uppercase tracking-wide text-[8px]">{c.severity}</span>
                      {c.interventionIds.length > 0 && (
                        <span className="text-[8px] opacity-80">· {c.interventionIds.length} item{c.interventionIds.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div>{c.summary}</div>
                    {fixes.length > 0 && (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] opacity-90">Suggested fix:</span>
                        {fixes.map((f, fi) => {
                          const iv = interventions.find(x => x.id === f.itemId);
                          const name = iv ? (treatmentLookup.get(iv.treatmentId)?.name ?? iv.treatmentId) : f.itemId;
                          return (
                            <span key={fi} className="text-[9px] opacity-90">
                              {name}: w{iv?.startWeek ?? '?'} → w{f.newStartWeek}
                            </span>
                          );
                        })}
                        <Button
                          size="sm"
                          className="h-5 text-[9px] bg-emerald-700 hover:bg-emerald-600 text-white"
                          onClick={() => applyReschedule(fixes)}
                          data-testid={`timeline-apply-fix-${idx}`}
                        >
                          Apply reschedule
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
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

export type { Intervention };
