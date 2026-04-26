import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Hand,
  Leaf,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { usePlanCart, type PlanCartItem, type PlanCartModality } from "@/lib/planCart";

interface OrchestratedSessionStep {
  order: number;
  itemId: string;
  itemName: string;
  modality: PlanCartModality;
  durationMinutes: number;
  rationale: string;
}

interface OrchestratedFrequency {
  itemId: string;
  itemName: string;
  modality: PlanCartModality;
  sessionsPerWeek: number;
  setting: "supervised" | "home" | "either";
  notes?: string;
}

interface OrchestratedScheduleCell {
  weekIndex: number;
  dayOfWeek: number;
  itemIds: string[];
  label?: string;
}

interface OrchestratedPhase {
  id: string;
  name: string;
  order: number;
  durationWeeks: string;
  goals: string[];
  itemIds: string[];
  frequency: string;
  reviewPoint: string;
}

interface OrchestratedTimelineMilestone {
  weekIndex: number;
  title: string;
  description: string;
  phaseId?: string;
}

interface OrchestratedConflict {
  severity: "info" | "warning" | "critical";
  description: string;
  involvedItemIds: string[];
}

export interface OrchestratedPlanResult {
  planSummary: string;
  totalDurationWeeks: number;
  sessionOrder: OrchestratedSessionStep[];
  frequencies: OrchestratedFrequency[];
  weeklySchedule: OrchestratedScheduleCell[];
  phases: OrchestratedPhase[];
  timeline: OrchestratedTimelineMilestone[];
  conflicts: OrchestratedConflict[];
  generatedAt: string;
}

interface ClinicalContextInput {
  topHypothesis?: string;
  irritability?: string;
  stage?: string;
  recoveryPhase?: string;
  patientFactors?: string[] | Record<string, unknown>;
  constraints?: string[];
  primaryRegion?: string;
}

interface MyPlanPanelProps {
  clinicalContext: ClinicalContextInput;
  // Optional one-shot trigger: when this nonce changes (and ≥2 items are in the cart),
  // the panel auto-fires the same orchestration request as the in-panel "Organize with AI" button.
  // Used by the Master Plan convergence card so its "Organize with AI" button can drive this panel.
  autoOrganizeKey?: number | null;
  // Called once the panel has actually dispatched an orchestration in response
  // to a new autoOrganizeKey, so the parent can clear the key and prevent
  // re-fires across panel remounts (tab switches / modal reopens).
  onAutoOrganizeConsumed?: () => void;
}

const MODALITY_META: Record<PlanCartModality, { label: string; icon: typeof Dumbbell; color: string; bg: string; border: string }> = {
  exercise: { label: "Exercise", icon: Dumbbell, color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/30" },
  exercise_custom: { label: "Custom Exercise", icon: Sparkles, color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  manual_therapy: { label: "Manual Therapy", icon: Hand, color: "text-rose-300", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  manual_therapy_custom: { label: "Custom Manual Therapy", icon: Sparkles, color: "text-rose-200", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  electrophysical: { label: "Electrophysical Agents", icon: Zap, color: "text-teal-300", bg: "bg-teal-500/15", border: "border-teal-500/30" },
  adjunct: { label: "Adjunct Rx", icon: Leaf, color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  lifestyle: { label: "Lifestyle & Adjunct Rx", icon: Activity, color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CartItemRow({ item, onRemove }: { item: PlanCartItem; onRemove: () => void }) {
  const meta = MODALITY_META[item.modality];
  const Icon = meta.icon;
  return (
    <div className={`group flex items-start gap-2 rounded border ${meta.border} ${meta.bg} px-2 py-1.5`}>
      <Icon className={`h-3 w-3 ${meta.color} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-gray-100 truncate" title={item.name}>{item.name}</div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {item.targetStructure && (
            <span className="text-[8px] text-gray-400 truncate" title={item.targetStructure}>
              <Target className="h-2 w-2 inline-block mr-0.5" />
              {item.targetStructure}
            </span>
          )}
          {item.dosage && (
            <span className="text-[8px] text-gray-400 truncate">{item.dosage}</span>
          )}
          {item.evidenceGrade && (
            <span className="text-[8px] px-1 rounded bg-black/30 text-amber-300">Grade {item.evidenceGrade}</span>
          )}
          {item.slingTag && (
            <span
              className={`text-[8px] px-1 rounded border ${
                item.slingRole === 'address-driver'
                  ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40'
                  : item.slingRole === 'restore'
                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                  : item.slingRole === 'calm-compensatory'
                  ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40'
              }`}
              title={
                item.slingRole === 'calm-compensatory'
                  ? `Calm compensatory load on the ${item.slingTag} sling — secondary, not the driver.`
                  : item.slingRole === 'restore'
                  ? `Restore intended function of the ${item.slingTag} sling.`
                  : item.slingRole === 'address-driver'
                  ? `Addresses the driving sling: ${item.slingTag}.`
                  : `Sling-driven · ${item.slingTag}`
              }
              data-testid={`cart-sling-tag-${item.id}`}
            >
              Sling · {item.slingTag}
              {item.slingRole && (
                <span className="ml-0.5 opacity-80">
                  {item.slingRole === 'address-driver'
                    ? ' (driver)'
                    : item.slingRole === 'restore'
                    ? ' (restore)'
                    : ' (calm)'}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
        title="Remove from plan"
        data-testid={`button-remove-${item.id}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function SessionOrderStrip({ steps, items }: { steps: OrchestratedSessionStep[]; items: PlanCartItem[] }) {
  if (steps.length === 0) return null;
  const itemMap = new Map(items.map(i => [i.id, i]));
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Activity className="h-3 w-3 text-cyan-400" />
        <span className="text-[9px] font-semibold text-cyan-300 uppercase tracking-wider">Per-Session Order</span>
      </div>
      <div className="space-y-1.5">
        {steps.map(step => {
          const item = itemMap.get(step.itemId);
          const meta = MODALITY_META[step.modality] || MODALITY_META.exercise;
          const Icon = meta.icon;
          return (
            <div key={step.order} className="flex items-start gap-2">
              <div className="flex flex-col items-center pt-0.5">
                <div className={`h-5 w-5 rounded-full ${meta.bg} ${meta.color} text-[9px] font-bold flex items-center justify-center border ${meta.border}`}>
                  {step.order}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <Icon className={`h-2.5 w-2.5 ${meta.color}`} />
                  <span className="text-[10px] font-medium text-gray-100 truncate">{item?.name || step.itemName}</span>
                  <span className="text-[8px] text-gray-500">· {step.durationMinutes} min</span>
                </div>
                <div className="text-[9px] text-gray-400 italic mt-0.5">{step.rationale}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyScheduleGrid({ schedule, items, totalWeeks, frequencies }: { schedule: OrchestratedScheduleCell[]; items: PlanCartItem[]; totalWeeks: number; frequencies: OrchestratedFrequency[] }) {
  const [activeWeek, setActiveWeek] = useState(0);
  if (schedule.length === 0) return null;
  const itemMap = new Map(items.map(i => [i.id, i]));
  const freqMap = new Map(frequencies.map(f => [f.itemId, f]));
  const weeks = Array.from({ length: Math.max(1, totalWeeks) }, (_, i) => i);
  const cellsByDay = (week: number) => DAY_LABELS.map((_, day) => {
    return schedule.find(c => c.weekIndex === week && c.dayOfWeek === day);
  });

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-sky-400" />
          <span className="text-[9px] font-semibold text-sky-300 uppercase tracking-wider">Weekly Schedule</span>
        </div>
        <div className="flex gap-0.5">
          {weeks.map(w => (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${activeWeek === w ? "bg-sky-500/30 text-sky-200" : "text-gray-400 hover:text-gray-200"}`}
              data-testid={`button-week-${w + 1}`}
            >
              W{w + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cellsByDay(activeWeek).map((cell, day) => (
          <div key={day} className="rounded border border-white/5 bg-white/5 p-1 min-h-[60px]">
            <div className="text-[8px] text-gray-500 font-semibold mb-0.5">{DAY_LABELS[day]}</div>
            {cell?.itemIds.map((id, i) => {
              const it = itemMap.get(id);
              if (!it) return null;
              const meta = MODALITY_META[it.modality];
              const Icon = meta.icon;
              const f = freqMap.get(id);
              return (
                <div key={i} className={`flex items-center gap-0.5 text-[8px] ${meta.color} truncate`} title={`${it.name}${f ? ` · ${f.setting}` : ""}`}>
                  <Icon className="h-2 w-2 shrink-0" />
                  <span className="truncate">{it.name}</span>
                </div>
              );
            })}
            {cell && cell.label && <div className="text-[8px] text-gray-500 italic truncate">{cell.label}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FrequencyList({ frequencies, items }: { frequencies: OrchestratedFrequency[]; items: PlanCartItem[] }) {
  if (frequencies.length === 0) return null;
  const itemMap = new Map(items.map(i => [i.id, i]));
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="h-3 w-3 text-amber-400" />
        <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider">Frequency</span>
      </div>
      <div className="space-y-1">
        {frequencies.map(f => {
          const it = itemMap.get(f.itemId);
          const meta = MODALITY_META[f.modality] || MODALITY_META.exercise;
          const Icon = meta.icon;
          return (
            <div key={f.itemId} className="flex items-center gap-2 text-[10px]">
              <Icon className={`h-2.5 w-2.5 ${meta.color}`} />
              <span className="text-gray-200 flex-1 truncate">{it?.name || f.itemName}</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300">{f.sessionsPerWeek}×/wk</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] ${f.setting === "home" ? "bg-emerald-500/15 text-emerald-300" : f.setting === "supervised" ? "bg-sky-500/15 text-sky-300" : "bg-gray-500/15 text-gray-300"}`}>
                {f.setting}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseCards({ phases, items }: { phases: OrchestratedPhase[]; items: PlanCartItem[] }) {
  const itemMap = new Map(items.map(i => [i.id, i]));
  if (phases.length === 0) return null;
  return (
    <div className="space-y-2">
      {phases.map(phase => (
        <div key={phase.id} className="rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-white/10 text-[10px] font-bold text-white flex items-center justify-center">{phase.order}</div>
              <span className="text-[10px] font-semibold text-cyan-300">{phase.name}</span>
              <span className="text-[8px] text-gray-400">{phase.durationWeeks} weeks · {phase.frequency}</span>
            </div>
          </div>
          {phase.goals.length > 0 && (
            <div className="mb-1.5">
              {phase.goals.map((g, i) => (
                <div key={i} className="flex items-start gap-1 text-[9px] text-gray-300">
                  <CheckCircle2 className="h-2.5 w-2.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {phase.itemIds.map(id => {
              const it = itemMap.get(id);
              if (!it) return null;
              const meta = MODALITY_META[it.modality];
              const Icon = meta.icon;
              return (
                <span key={id} className={`text-[8px] px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border} inline-flex items-center gap-1`}>
                  <Icon className="h-2 w-2" />
                  {it.name}
                </span>
              );
            })}
          </div>
          <div className="text-[8px] text-gray-500 mt-1.5 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Review: {phase.reviewPoint}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecoveryTimeline({ milestones, totalWeeks }: { milestones: OrchestratedTimelineMilestone[]; totalWeeks: number }) {
  if (milestones.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingUp className="h-3 w-3 text-emerald-400" />
        <span className="text-[9px] font-semibold text-emerald-300 uppercase tracking-wider">Recovery Timeline · ~{totalWeeks} weeks</span>
      </div>
      <div className="space-y-1.5">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px]">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">W{m.weekIndex}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-200">{m.title}</div>
              <div className="text-[9px] text-gray-400">{m.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictList({ conflicts }: { conflicts: OrchestratedConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle className="h-3 w-3 text-amber-400" />
        <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider">Conflicts & Cautions ({conflicts.length})</span>
      </div>
      <div className="space-y-1">
        {conflicts.map((c, i) => (
          <div key={i} className={`text-[9px] flex items-start gap-1 ${c.severity === "critical" ? "text-red-300" : c.severity === "warning" ? "text-amber-300" : "text-gray-300"}`}>
            <span className="font-bold uppercase">[{c.severity}]</span>
            <span>{c.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyPlanPanel({ clinicalContext, autoOrganizeKey, onAutoOrganizeConsumed }: MyPlanPanelProps) {
  const { items, remove, clear, count } = usePlanCart();
  const [orchestrated, setOrchestrated] = useState<OrchestratedPlanResult | null>(null);
  const [showCart, setShowCart] = useState(true);

  const orchestrate = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/treatment-plan/orchestrate", "POST", {
        items,
        clinicalContext,
      });
      return result as OrchestratedPlanResult;
    },
    onSuccess: (data) => setOrchestrated(data),
  });

  // External trigger from Master Plan convergence card: fire orchestration once
  // per nonce change. The parent owns the lifecycle — once we dispatch, we call
  // `onAutoOrganizeConsumed` so the parent clears the nonce. This makes the
  // trigger truly one-shot even if this panel unmounts/remounts on tab switches
  // or modal close+reopen (the local "seen" ref would reset on remount, but the
  // parent's cleared key prevents a re-fire).
  useEffect(() => {
    if (autoOrganizeKey == null) return;
    if (count < 2) return;
    if (orchestrate.isPending) return; // wait — parent's key is still set, we'll re-eval when isPending flips
    orchestrate.mutate();
    onAutoOrganizeConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOrganizeKey, count, orchestrate.isPending]);

  const grouped = items.reduce<Record<PlanCartModality, PlanCartItem[]>>((acc, it) => {
    (acc[it.modality] ||= []).push(it);
    return acc;
  }, {} as Record<PlanCartModality, PlanCartItem[]>);

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-10">
        <div className="p-3 rounded-full bg-cyan-500/10 mb-3">
          <Sparkles className="h-6 w-6 text-cyan-400/60" />
        </div>
        <p className="text-xs text-gray-300 mb-1">Your plan is empty</p>
        <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">
          Open Exercise, Manual Rx, Electrophysical Agents, or Adjunct Rx, generate items, then click <span className="text-cyan-300 font-medium">+ Add to Plan</span> on any item to bring it in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowCart(s => !s)}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-200"
          data-testid="button-toggle-cart"
        >
          {showCart ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Items in plan ({count})
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clear}
            className="text-[9px] text-gray-400 hover:text-red-300 inline-flex items-center gap-1"
            data-testid="button-clear-cart"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <button
            onClick={() => orchestrate.mutate()}
            disabled={orchestrate.isPending || count < 2}
            className="text-[10px] px-3 py-1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            data-testid="button-organize-with-ai"
          >
            {orchestrate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {orchestrated ? "Re-organize" : "Organize with AI"}
          </button>
        </div>
      </div>

      {showCart && (
        <div className="space-y-2">
          {(Object.keys(grouped) as PlanCartModality[]).map(modality => {
            const meta = MODALITY_META[modality];
            const list = grouped[modality];
            return (
              <div key={modality} className="space-y-1">
                <div className={`text-[9px] uppercase tracking-wider font-semibold ${meta.color}`}>{meta.label} ({list.length})</div>
                <div className="space-y-1">
                  {list.map(it => (
                    <CartItemRow key={it.id} item={it} onRemove={() => remove(it.id)} />
                  ))}
                </div>
              </div>
            );
          })}
          {count < 2 && (
            <p className="text-[9px] text-gray-500 italic">Add at least 2 items, then click Organize with AI.</p>
          )}
        </div>
      )}

      {orchestrate.error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-200 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{(orchestrate.error as Error).message || "Could not organize the plan. Try again."}</span>
        </div>
      )}

      {orchestrated && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">AI-Organized Plan</span>
            </div>
            <p className="text-[10px] text-gray-200 leading-relaxed">{orchestrated.planSummary}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-200">~{orchestrated.totalDurationWeeks} weeks</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-200">{orchestrated.phases.length} phases</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-200">{orchestrated.sessionOrder.length} steps/session</span>
              <button
                onClick={() => { setOrchestrated(null); orchestrate.reset(); }}
                className="text-[8px] text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Discard
              </button>
            </div>
          </div>

          <ConflictList conflicts={orchestrated.conflicts} />
          <SessionOrderStrip steps={orchestrated.sessionOrder} items={items} />
          <FrequencyList frequencies={orchestrated.frequencies} items={items} />
          <WeeklyScheduleGrid schedule={orchestrated.weeklySchedule} items={items} totalWeeks={orchestrated.totalDurationWeeks} frequencies={orchestrated.frequencies} />
          <PhaseCards phases={orchestrated.phases} items={items} />
          <RecoveryTimeline milestones={orchestrated.timeline} totalWeeks={orchestrated.totalDurationWeeks} />
        </div>
      )}
    </div>
  );
}
