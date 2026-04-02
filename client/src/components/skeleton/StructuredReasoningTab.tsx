import { useState, useCallback } from "react";
import {
  Brain,
  AlertTriangle,
  Stethoscope,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Target,
  Lightbulb,
  TrendingUp,
  Zap,
  HelpCircle,
  Thermometer,
  Layers,
  Crosshair,
  Clock,
  Settings,
  Search,
  ArrowRight,
} from "lucide-react";

export interface ReasoningHypothesis {
  id: string;
  condition: string;
  confidence: number;
  supporting: { feature: string; weight: number }[];
  contradicting: { feature: string; weight: number }[];
  fingerprintMatchScore: number;
  structuralHypothesis: string;
  dominantClinicalDriver: string;
}

export interface IrritabilityAssessment {
  level: "low" | "moderate" | "high";
  score: number;
  reasons: string[];
}

export interface ConditionStage {
  stage: string;
  label: string;
  conditionSpecific: boolean;
  reasoning: string;
}

export interface ModifierBucket {
  category: "load" | "behavioural" | "recovery" | "structural" | "context";
  label: string;
  modifiers: string[];
}

export interface MustNotMissCondition {
  condition: string;
  likelihood: "low" | "moderate" | "unclear" | "possible";
  reasoning: string;
  screeningNeeded: string[];
}

export interface MissingDataItem {
  question: string;
  purpose: string;
  priority: number;
  category: "subjective" | "objective" | "history" | "screening";
}

export interface StructuredReasoningResult {
  hypotheses: ReasoningHypothesis[];
  dominantSymptomDriver: {
    driver: string;
    mechanism: string;
    reasoning: string;
  };
  irritability: IrritabilityAssessment;
  stage: ConditionStage;
  problemClass: {
    primary: string;
    secondary?: string;
    label: string;
  };
  dominantMechanism: {
    mechanism: string;
    label: string;
    reasoning: string;
  };
  modifiers: ModifierBucket[];
  mustNotMiss: MustNotMissCondition[];
  missingData: MissingDataItem[];
  reasoningLayers: {
    presentation: string;
    symptomPattern: string;
    mechanismPattern: string;
    tissueFamilySuspicion: string;
    differentialSummary: string;
  };
  timestamp: string;
}

interface StructuredReasoningTabProps {
  data: StructuredReasoningResult | null;
  isLoading: boolean;
  onHypothesisClick?: (hypothesis: ReasoningHypothesis) => void;
}

function ConfBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct >= 70 ? "bg-teal-400" : pct >= 40 ? "bg-amber-400" : "bg-gray-500";
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-gray-400 w-7 text-right">{Math.round(value)}%</span>
    </div>
  );
}

function Section({ icon: Icon, title, color, badge, defaultOpen = false, children }: {
  icon: React.ElementType;
  title: string;
  color: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3 w-3 ${color}`} />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
          {badge !== undefined && badge !== 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${color.replace("text-", "bg-").replace("400", "500/20")} ${color}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-3 w-3 text-gray-500 group-hover:text-gray-300" /> : <ChevronDown className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />}
      </button>
      {open && <div className="mt-1 ml-1 space-y-1">{children}</div>}
    </div>
  );
}

const IRRITABILITY_COLORS: Record<string, string> = {
  low: "text-green-400 bg-green-500/10 border-green-500/30",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  high: "text-red-400 bg-red-500/10 border-red-500/30",
};

const MNM_COLORS: Record<string, string> = {
  possible: "text-red-400 bg-red-500/10 border-red-500/30",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  unclear: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  low: "text-gray-400 bg-gray-500/10 border-gray-600/30",
};

const MODIFIER_ICONS: Record<string, React.ElementType> = {
  load: Activity,
  behavioural: Brain,
  recovery: Clock,
  structural: Layers,
  context: Settings,
};

export default function StructuredReasoningTab({ data, isLoading, onHypothesisClick }: StructuredReasoningTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400 mb-3" />
        <p className="text-[10px] text-gray-400">Running structured clinical reasoning...</p>
        <p className="text-[9px] text-gray-600 mt-1">Fingerprint matching, irritability, staging, mechanism analysis</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="p-3 rounded-full bg-violet-500/10 mb-3">
          <Layers className="h-5 w-5 text-violet-500/50" />
        </div>
        <p className="text-[10px] text-gray-400 mb-1">Structured Reasoning Engine</p>
        <p className="text-[9px] text-gray-600 leading-relaxed">
          Answers 8 core clinical questions with weighted fingerprint scoring, irritability/staging, modifiers, and missing data planning.
        </p>
      </div>
    );
  }

  const { hypotheses, dominantSymptomDriver, irritability, stage, problemClass, dominantMechanism, modifiers, mustNotMiss, missingData, reasoningLayers } = data;
  const urgentMNM = mustNotMiss.filter(m => m.likelihood !== "low");

  return (
    <div className="space-y-1">
      {reasoningLayers.presentation && (
        <div className="rounded-lg p-2 bg-violet-900/10 border border-violet-500/20 mb-2">
          <p className="text-[9px] text-violet-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><Lightbulb className="h-2.5 w-2.5" />Reasoning Layers</p>
          <div className="space-y-1">
            {reasoningLayers.presentation && (
              <div className="flex items-start gap-1.5">
                <ArrowRight className="h-2.5 w-2.5 text-violet-400/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[8px] text-violet-500 uppercase">Presentation</span>
                  <p className="text-[9px] text-gray-300">{reasoningLayers.presentation}</p>
                </div>
              </div>
            )}
            {reasoningLayers.symptomPattern && (
              <div className="flex items-start gap-1.5">
                <ArrowRight className="h-2.5 w-2.5 text-violet-400/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[8px] text-violet-500 uppercase">Symptom Pattern</span>
                  <p className="text-[9px] text-gray-300">{reasoningLayers.symptomPattern}</p>
                </div>
              </div>
            )}
            {reasoningLayers.mechanismPattern && (
              <div className="flex items-start gap-1.5">
                <ArrowRight className="h-2.5 w-2.5 text-violet-400/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[8px] text-violet-500 uppercase">Mechanism</span>
                  <p className="text-[9px] text-gray-300">{reasoningLayers.mechanismPattern}</p>
                </div>
              </div>
            )}
            {reasoningLayers.tissueFamilySuspicion && (
              <div className="flex items-start gap-1.5">
                <ArrowRight className="h-2.5 w-2.5 text-violet-400/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[8px] text-violet-500 uppercase">Tissue Family</span>
                  <p className="text-[9px] text-gray-300">{reasoningLayers.tissueFamilySuspicion}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Section icon={Stethoscope} title="Q1: Top Hypotheses" color="text-teal-400" badge={hypotheses.length} defaultOpen={true}>
        {hypotheses.map((h, idx) => (
          <div
            key={h.id}
            className="rounded-lg p-2 border bg-gray-800/40 border-gray-700/30 hover:border-teal-500/30 transition-colors cursor-pointer"
            onClick={() => onHypothesisClick?.(h)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] font-bold text-teal-400/70">#{idx + 1}</span>
                <p className="text-[10px] font-medium text-gray-200 truncate">{h.condition}</p>
              </div>
              {h.fingerprintMatchScore > 0 && (
                <span className="text-[8px] px-1 py-0.5 bg-violet-500/15 text-violet-400 rounded shrink-0" title="Fingerprint match">
                  FP {h.fingerprintMatchScore}%
                </span>
              )}
            </div>
            <ConfBar value={h.confidence} />
            <div className="mt-1">
              <p className="text-[8px] text-gray-500 uppercase">Structural: <span className="text-gray-300 normal-case">{h.structuralHypothesis}</span></p>
              <p className="text-[8px] text-gray-500 uppercase mt-0.5">Driver: <span className="text-cyan-300 normal-case">{h.dominantClinicalDriver}</span></p>
            </div>
            {h.supporting.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {h.supporting.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-teal-500 text-[8px] mt-0.5">+</span>
                    <span className="text-[9px] text-gray-400">{s.feature}</span>
                    <span className="text-[8px] text-gray-600 shrink-0">w{s.weight}</span>
                  </div>
                ))}
              </div>
            )}
            {h.contradicting.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {h.contradicting.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-red-500 text-[8px] mt-0.5">-</span>
                    <span className="text-[9px] text-gray-500">{c.feature}</span>
                    <span className="text-[8px] text-gray-600 shrink-0">w{c.weight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section icon={Zap} title="Q2: Dominant Symptom Driver" color="text-cyan-400" defaultOpen={true}>
        <div className="rounded-lg p-2 border bg-cyan-900/10 border-cyan-500/20">
          <p className="text-[10px] font-semibold text-cyan-300">{dominantSymptomDriver.driver}</p>
          <p className="text-[9px] text-gray-400 mt-1">
            <span className="text-gray-500">Mechanism:</span> {dominantSymptomDriver.mechanism}
          </p>
          {dominantSymptomDriver.reasoning && (
            <p className="text-[9px] text-gray-500 mt-1 italic">{dominantSymptomDriver.reasoning}</p>
          )}
        </div>
      </Section>

      <Section icon={Clock} title="Q3: Stage" color="text-purple-400" defaultOpen={true}>
        <div className="rounded-lg p-2 border bg-purple-900/10 border-purple-500/20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-purple-300">{stage.label}</span>
            {stage.conditionSpecific && (
              <span className="text-[8px] px-1 py-0.5 bg-purple-500/15 text-purple-400 rounded">Condition-Specific</span>
            )}
          </div>
          <p className="text-[9px] text-gray-400 mt-1">{stage.reasoning}</p>
        </div>
      </Section>

      <Section icon={Thermometer} title="Q4: Irritability" color={irritability.level === "high" ? "text-red-400" : irritability.level === "moderate" ? "text-amber-400" : "text-green-400"} defaultOpen={true}>
        <div className={`rounded-lg p-2 border ${IRRITABILITY_COLORS[irritability.level]}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold capitalize">{irritability.level} Irritability</span>
            <span className="text-[9px] opacity-80">{irritability.score}/100</span>
          </div>
          <div className="mt-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${irritability.level === "high" ? "bg-red-400" : irritability.level === "moderate" ? "bg-amber-400" : "bg-green-400"}`}
              style={{ width: `${irritability.score}%` }}
            />
          </div>
          <div className="mt-1.5 space-y-0.5">
            {irritability.reasons.map((r, i) => (
              <p key={i} className="text-[9px] text-gray-400 flex items-start gap-1">
                <span className="text-gray-600 mt-0.5 shrink-0">•</span>
                {r}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section icon={Target} title="Q5: Problem Class & Mechanism" color="text-blue-400" defaultOpen={true}>
        <div className="rounded-lg p-2 border bg-blue-900/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <Crosshair className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-semibold text-blue-300">{problemClass.label}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Activity className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-300">{dominantMechanism.label}</span>
          </div>
          <p className="text-[9px] text-gray-500 mt-1 italic">{dominantMechanism.reasoning}</p>
        </div>
      </Section>

      {modifiers.length > 0 && (
        <Section icon={Settings} title="Q6: Key Modifiers" color="text-amber-400" badge={modifiers.reduce((sum, b) => sum + b.modifiers.length, 0)} defaultOpen={false}>
          {modifiers.map((bucket, bi) => {
            const BucketIcon = MODIFIER_ICONS[bucket.category] || Settings;
            return (
              <div key={bi} className="rounded-lg p-2 border bg-gray-800/30 border-gray-700/20">
                <p className="text-[9px] text-amber-400 font-semibold flex items-center gap-1 mb-1">
                  <BucketIcon className="h-2.5 w-2.5" />
                  {bucket.label}
                </p>
                <div className="space-y-0.5">
                  {bucket.modifiers.map((m, mi) => (
                    <p key={mi} className="text-[9px] text-gray-400 flex items-start gap-1">
                      <span className="text-amber-500/60 mt-0.5 shrink-0">•</span>
                      {m}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      <Section
        icon={Shield}
        title="Q7: Must-Not-Miss"
        color={urgentMNM.length > 0 ? "text-red-400" : "text-gray-400"}
        badge={urgentMNM.length > 0 ? urgentMNM.length : undefined}
        defaultOpen={urgentMNM.length > 0}
      >
        {mustNotMiss.map((m, i) => (
          <div key={i} className={`rounded-lg p-2 border ${MNM_COLORS[m.likelihood]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {m.likelihood !== "low" && <AlertTriangle className="h-3 w-3 shrink-0" />}
                <p className="text-[10px] font-medium">{m.condition}</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded capitalize opacity-80 border border-current/20 shrink-0">
                {m.likelihood}
              </span>
            </div>
            <p className="text-[9px] text-gray-400 mt-1">{m.reasoning}</p>
            {m.screeningNeeded.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.screeningNeeded.map((s, si) => (
                  <span key={si} className="text-[8px] px-1.5 py-0.5 bg-black/20 rounded text-gray-400">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      {missingData.length > 0 && (
        <Section icon={Search} title="Q8: Missing Data" color="text-orange-400" badge={missingData.length} defaultOpen={false}>
          {missingData.slice(0, 8).map((md, i) => (
            <div key={i} className="rounded-lg p-2 border bg-gray-800/30 border-orange-500/15">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <HelpCircle className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-gray-300">{md.question}</p>
                </div>
                <span className="text-[8px] px-1 py-0.5 bg-orange-500/10 text-orange-400 rounded shrink-0">{md.category}</span>
              </div>
              <p className="text-[8px] text-gray-500 mt-1 ml-4">{md.purpose}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
