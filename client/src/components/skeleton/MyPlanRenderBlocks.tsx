import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Hand,
  HelpCircle,
  Info,
  Leaf,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PlanCartItem, PlanCartModality } from "@/lib/planCart";
import type { TreatmentRationaleResult, TreatmentRationaleSource } from "@/lib/treatmentRationaleContext";

export interface OrchestratedSessionStep {
  order: number;
  itemId: string;
  itemName: string;
  modality: PlanCartModality;
  durationMinutes: number;
  rationale: string;
}

export interface OrchestratedFrequency {
  itemId: string;
  itemName: string;
  modality: PlanCartModality;
  sessionsPerWeek: number;
  setting: "supervised" | "home" | "either";
  notes?: string;
}

export interface OrchestratedScheduleCell {
  weekIndex: number;
  dayOfWeek: number;
  itemIds: string[];
  label?: string;
}

export interface OrchestratedPhase {
  id: string;
  name: string;
  order: number;
  durationWeeks: string;
  goals: string[];
  itemIds: string[];
  frequency: string;
  reviewPoint: string;
}

export interface OrchestratedTimelineMilestone {
  weekIndex: number;
  title: string;
  description: string;
  phaseId?: string;
}

export interface OrchestratedConflict {
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

export const MODALITY_META: Record<PlanCartModality, { label: string; icon: typeof Dumbbell; color: string; bg: string; border: string }> = {
  exercise: { label: "Exercise", icon: Dumbbell, color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/30" },
  exercise_custom: { label: "Custom Exercise", icon: Sparkles, color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  manual_therapy: { label: "Manual Therapy", icon: Hand, color: "text-rose-300", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  manual_therapy_custom: { label: "Custom Manual Therapy", icon: Sparkles, color: "text-rose-200", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  electrophysical: { label: "Electrophysical Agents", icon: Zap, color: "text-teal-300", bg: "bg-teal-500/15", border: "border-teal-500/30" },
  adjunct: { label: "Adjunct Rx", icon: Leaf, color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  lifestyle: { label: "Lifestyle & Adjunct Rx", icon: Activity, color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30" },
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface CartItemRowProps {
  item: PlanCartItem;
  onRemove: () => void;
  /** Per-item rationale text. When provided, a small "Why?" toggle is
   *  rendered on the row that opens an inline reveal of this text — lets
   *  the clinician explain a single item without scrolling to the
   *  rationale section. (Task #274) */
  whyText?: string;
  /** Optional list of clinical drivers (driver labels) this item addresses,
   *  shown beneath the why text when expanded. */
  whyAddresses?: string[];
}

export function CartItemRow({ item, onRemove, whyText, whyAddresses }: CartItemRowProps) {
  const meta = MODALITY_META[item.modality];
  const Icon = meta.icon;
  const [whyOpen, setWhyOpen] = useState(false);
  const hasWhy = !!whyText && whyText.length > 0;
  return (
    <div className={`group flex flex-col rounded border ${meta.border} ${meta.bg} px-2 py-1.5`}>
      <div className="flex items-start gap-2">
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
        <div className="flex items-center gap-1 shrink-0">
          {hasWhy && (
            <button
              onClick={() => setWhyOpen(o => !o)}
              className={`text-[8px] px-1 py-0.5 rounded inline-flex items-center gap-0.5 transition-colors ${
                whyOpen
                  ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/50'
                  : 'bg-white/5 text-cyan-300 border border-white/10 hover:bg-white/10'
              }`}
              title={whyOpen ? "Hide rationale" : "Why was this chosen?"}
              data-testid={`button-why-${item.id}`}
            >
              <HelpCircle className="h-2.5 w-2.5" />
              Why?
            </button>
          )}
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
            title="Remove from plan"
            data-testid={`button-remove-${item.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {hasWhy && whyOpen && (
        <div
          className="mt-1.5 pl-5 pt-1 border-t border-white/10 text-[9.5px] text-gray-100 leading-snug"
          data-testid={`why-text-${item.id}`}
        >
          <p>{whyText}</p>
          {whyAddresses && whyAddresses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {whyAddresses.map((a, i) => (
                <span
                  key={i}
                  className="text-[8px] px-1 py-0.5 rounded bg-black/40 text-gray-300 border border-white/10 inline-flex items-center gap-0.5"
                >
                  <Target className="h-2 w-2" />
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionOrderStrip({ steps, items }: { steps: OrchestratedSessionStep[]; items: PlanCartItem[] }) {
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

export function WeeklyScheduleGrid({ schedule, items, totalWeeks, frequencies }: { schedule: OrchestratedScheduleCell[]; items: PlanCartItem[]; totalWeeks: number; frequencies: OrchestratedFrequency[] }) {
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

export function FrequencyList({ frequencies, items }: { frequencies: OrchestratedFrequency[]; items: PlanCartItem[] }) {
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

export function PhaseCards({ phases, items }: { phases: OrchestratedPhase[]; items: PlanCartItem[] }) {
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

export function RecoveryTimeline({ milestones, totalWeeks }: { milestones: OrchestratedTimelineMilestone[]; totalWeeks: number }) {
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

export function ConflictList({ conflicts }: { conflicts: OrchestratedConflict[] }) {
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

export function OrchestratedSummaryCard({ orchestrated, onDiscard }: { orchestrated: OrchestratedPlanResult; onDiscard: () => void }) {
  return (
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
          onClick={onDiscard}
          className="text-[8px] text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 ml-auto"
          data-testid="button-discard-orchestrated"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Discard
        </button>
      </div>
    </div>
  );
}

const RATIONALE_KIND_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  pain: { bg: "bg-rose-500/15", text: "text-rose-200", border: "border-rose-500/40" },
  sling: { bg: "bg-cyan-500/15", text: "text-cyan-200", border: "border-cyan-500/40" },
  fascial: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-200", border: "border-fuchsia-500/40" },
  chain: { bg: "bg-violet-500/15", text: "text-violet-200", border: "border-violet-500/40" },
  tissue: { bg: "bg-orange-500/15", text: "text-orange-200", border: "border-orange-500/40" },
  scar: { bg: "bg-amber-500/15", text: "text-amber-200", border: "border-amber-500/40" },
  force: { bg: "bg-yellow-500/15", text: "text-yellow-200", border: "border-yellow-500/40" },
  postural: { bg: "bg-sky-500/15", text: "text-sky-200", border: "border-sky-500/40" },
  tendon: { bg: "bg-red-500/15", text: "text-red-200", border: "border-red-500/40" },
  thoracic: { bg: "bg-indigo-500/15", text: "text-indigo-200", border: "border-indigo-500/40" },
  risk: { bg: "bg-pink-500/15", text: "text-pink-200", border: "border-pink-500/40" },
  other: { bg: "bg-white/5", text: "text-gray-200", border: "border-white/10" },
};

function driverStyle(kind?: string) {
  if (!kind) return RATIONALE_KIND_STYLE.other;
  return RATIONALE_KIND_STYLE[kind.toLowerCase()] ?? RATIONALE_KIND_STYLE.other;
}

interface TreatmentRationaleSectionProps {
  rationale: TreatmentRationaleResult | null;
  items: PlanCartItem[];
  isPending: boolean;
  error: Error | null;
  onGenerate: () => void;
  /** Whether the displayed rationale was synthesised locally or by AI.
   *  Drives a subtle "AI" / "auto" pip in the header. */
  source?: TreatmentRationaleSource;
  /** True when an AI rationale exists but is stale relative to the
   *  current cart/context/order — surfaces a "Stale" pip and changes
   *  the action label to "Regenerate". */
  isStale?: boolean;
  /** When true, the AI-orchestrated session order is available — we surface
   *  a hint that the ordering rationale corresponds to that order. */
  hasOrchestratedOrder?: boolean;
  /** Set this if the section is rendered in a context that already has a
   *  per-item "Why?" toggle on each cart row (MasterPlanCard expanded
   *  section, MyPlanPanel). When true, the in-section per-item block is
   *  hidden to avoid duplication; drivers + clinical picture + ordering
   *  remain. Defaults to false (full per-item block shown). */
  hidePerItemBlock?: boolean;
}

function shortOrderingCue(text: string): string {
  // Distil the ordering paragraph down to a single short phrase for the
  // collapsed summary line (e.g. "modulate → mobilise → activate → load").
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  // Prefer the bit between the first colon and the first full stop.
  const colonIdx = trimmed.indexOf(":");
  const dotIdx = trimmed.indexOf(".", colonIdx >= 0 ? colonIdx : 0);
  if (colonIdx >= 0 && dotIdx > colonIdx) {
    const slice = trimmed.slice(colonIdx + 1, dotIdx).trim();
    if (slice.length > 0 && slice.length <= 80) return slice;
  }
  return trimmed.slice(0, 70) + (trimmed.length > 70 ? "…" : "");
}

export function TreatmentRationaleSection({
  rationale,
  items,
  isPending,
  error,
  onGenerate,
  source = "local",
  isStale = false,
  hasOrchestratedOrder,
  hidePerItemBlock = false,
}: TreatmentRationaleSectionProps) {
  // Per spec: collapsed by default. The summary header shows
  // addressed/unaddressed driver counts plus an ordering cue, and clicking
  // expands the full body.
  const [open, setOpen] = useState(false);
  const [perItemOpen, setPerItemOpen] = useState(false);
  const itemMap = new Map(items.map(i => [i.id, i]));
  const canGenerate = items.length >= 1;

  // No items in cart yet.
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Why this plan?</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Add at least one treatment item to see the rationale that ties the plan back to the patient's clinical picture.
        </p>
      </div>
    );
  }

  // While the cart has items, the local synthesis ALWAYS produces a
  // rationale, so this branch is only hit during the very first render.
  if (!rationale) {
    return (
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 flex items-center gap-2 text-[10px] text-cyan-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Building rationale…
      </div>
    );
  }

  const totalDrivers = rationale.drivers.length;
  const addressedDrivers = rationale.drivers.filter(d => (d.addressedItemIds || []).length > 0).length;
  const unaddressedDrivers = totalDrivers - addressedDrivers;
  const orderingCue = shortOrderingCue(rationale.orderingRationale);

  return (
    <div
      className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-indigo-500/5 to-transparent"
      data-testid="master-plan-rationale-section"
    >
      {/* Collapsible summary header — always rendered; click to expand. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-2.5 flex items-start gap-2 hover:bg-white/5 transition-colors rounded-lg"
        data-testid="button-rationale-toggle"
        aria-expanded={open}
      >
        <div className="mt-0.5 shrink-0">
          {open ? <ChevronDown className="h-3 w-3 text-cyan-300" /> : <ChevronRight className="h-3 w-3 text-cyan-300" />}
        </div>
        <Brain className="h-3.5 w-3.5 text-cyan-300 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-cyan-200 uppercase tracking-wider">Why this plan?</span>
            <span
              className={`text-[8px] px-1 py-0.5 rounded border ${
                source === "ai"
                  ? "bg-violet-500/20 text-violet-200 border-violet-500/40"
                  : "bg-white/5 text-gray-400 border-white/10"
              }`}
              title={source === "ai" ? "Generated by AI" : "Auto-synthesised from clinical context"}
              data-testid="rationale-source-badge"
            >
              {source === "ai" ? "AI" : "Auto"}
            </span>
            {isStale && (
              <span
                className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 inline-flex items-center gap-0.5"
                title="The plan or context has changed since the AI rationale was generated — showing the up-to-date auto rationale. Click Regenerate to refresh."
                data-testid="rationale-stale-badge"
              >
                <AlertTriangle className="h-2 w-2" />
                AI stale
              </span>
            )}
            {error && (
              <span
                className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-500/40 inline-flex items-center gap-0.5"
                title={error.message || "AI rationale unavailable — showing local fallback."}
                data-testid="rationale-error-badge"
              >
                <AlertTriangle className="h-2 w-2" />
                AI offline
              </span>
            )}
          </div>
          <div className="mt-1 text-[9.5px] text-gray-300 leading-snug" data-testid="rationale-summary-line">
            <span
              className={`font-semibold ${unaddressedDrivers > 0 ? "text-amber-300" : "text-emerald-300"}`}
            >
              {addressedDrivers}/{totalDrivers}
            </span>{" "}
            drivers addressed
            {unaddressedDrivers > 0 && (
              <span className="text-amber-300"> · {unaddressedDrivers} gap{unaddressedDrivers === 1 ? "" : "s"}</span>
            )}
            {orderingCue && (
              <>
                {" · "}
                <span className="text-gray-400">order:</span>{" "}
                <span className="text-gray-200">{orderingCue}</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
            disabled={isPending || !canGenerate}
            className={`text-[9px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
              isStale
                ? "bg-amber-500/25 text-amber-100 border-amber-500/50 hover:bg-amber-500/35"
                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
            }`}
            data-testid="button-treatment-rationale-refresh"
            title={
              isStale
                ? "Plan/context changed since the AI rationale was generated — click to regenerate."
                : source === "ai"
                ? "Regenerate AI rationale"
                : "Generate AI rationale"
            }
          >
            {isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
            {isStale ? "Regenerate" : source === "ai" ? "Refresh" : "Use AI"}
          </button>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-white/10">

          {/* Clinical picture */}
          <div className="pt-2">
            <div className="text-[9px] font-semibold text-cyan-300 uppercase tracking-wider mb-0.5">Clinical picture</div>
            <p className="text-[10.5px] text-gray-100 leading-relaxed" data-testid="rationale-clinical-picture">
              {rationale.clinicalPicture}
            </p>
          </div>

          {/* Drivers — each row shows label + detail and the cart items
              that target it (or a "no item targets this yet" gap chip). */}
          {rationale.drivers.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold text-cyan-300 uppercase tracking-wider mb-1">Clinical drivers</div>
              <div className="space-y-1.5">
                {rationale.drivers.map((d, i) => {
                  const s = driverStyle(d.kind);
                  const addressed = d.addressedItemIds || [];
                  return (
                    <div
                      key={i}
                      className={`rounded border ${s.border} ${s.bg} px-1.5 py-1`}
                      data-testid={`rationale-driver-${i}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-semibold ${s.text}`}>{d.label}</div>
                          <div className="text-[9.5px] text-gray-200 leading-snug">{d.detail}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {addressed.length === 0 ? (
                          <span
                            className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/40 inline-flex items-center gap-0.5"
                            data-testid={`rationale-driver-gap-${i}`}
                            title="No item in the plan currently targets this finding."
                          >
                            <AlertTriangle className="h-2 w-2" />
                            No item targets this yet
                          </span>
                        ) : (
                          addressed.map(id => {
                            const it = itemMap.get(id);
                            if (!it) return null;
                            const meta = MODALITY_META[it.modality];
                            const Icon = meta.icon;
                            return (
                              <span
                                key={id}
                                className={`text-[8px] px-1 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border} inline-flex items-center gap-0.5`}
                                title={it.name}
                                data-testid={`rationale-driver-${i}-item-${id}`}
                              >
                                <Icon className="h-2 w-2" />
                                <span className="truncate max-w-[120px]">{it.name}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ordering rationale */}
          <div className="rounded border border-white/10 bg-black/30 p-2">
            <div className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider mb-0.5">
              {hasOrchestratedOrder ? "Why this order" : "Ordering principles"}
            </div>
            <p className="text-[10px] text-gray-200 leading-relaxed" data-testid="rationale-ordering">
              {rationale.orderingRationale}
            </p>
          </div>

          {/* Per-item rationale block — only shown when the host context
              doesn't already provide per-row "Why?" affordances. */}
          {!hidePerItemBlock && rationale.treatmentRationale.length > 0 && (
            <div>
              <button
                onClick={() => setPerItemOpen(o => !o)}
                className="text-[9px] font-semibold text-cyan-300 uppercase tracking-wider inline-flex items-center gap-1 hover:text-cyan-200"
                data-testid="button-rationale-per-item-toggle"
              >
                {perItemOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                Per-item rationale ({rationale.treatmentRationale.length})
              </button>
              {perItemOpen && (
                <div className="space-y-1.5 mt-1">
                  {rationale.treatmentRationale.map(r => {
                    const it = itemMap.get(r.itemId);
                    const meta = it ? MODALITY_META[it.modality] : MODALITY_META.exercise;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={r.itemId}
                        className={`rounded border ${meta.border} ${meta.bg} px-2 py-1.5`}
                        data-testid={`rationale-item-${r.itemId}`}
                      >
                        <div className="flex items-start gap-1.5">
                          <Icon className={`h-3 w-3 ${meta.color} mt-0.5 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-gray-100 truncate">{r.itemName}</div>
                            <p className="text-[9.5px] text-gray-200 leading-snug mt-0.5">{r.why}</p>
                            {r.addresses.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.addresses.map((a, i) => (
                                  <span
                                    key={i}
                                    className="text-[8px] px-1 py-0.5 rounded bg-black/40 text-gray-300 border border-white/10 inline-flex items-center gap-0.5"
                                  >
                                    <Target className="h-2 w-2" />
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subtle hint when local synthesis is in use */}
          {source === "local" && !error && (
            <div className="text-[9px] text-gray-500 italic flex items-start gap-1 pt-1">
              <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              <span>Showing the auto-synthesised rationale. Click "Use AI" for a richer narrative.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
