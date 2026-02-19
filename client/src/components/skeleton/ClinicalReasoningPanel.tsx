import { useState, useEffect, useRef } from "react";
import {
  Brain,
  AlertTriangle,
  Stethoscope,
  Activity,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Target,
  Lightbulb,
  TrendingUp,
  X,
  Sparkles,
  Zap,
} from "lucide-react";

export interface ClinicalHypothesis {
  id: string;
  condition: string;
  confidence: number;
  supportingEvidence: string[];
  rulingOutFactors: string[];
  status: "active" | "ruled_out" | "confirmed";
}

export interface ClinicalFinding {
  id: string;
  category: "symptom" | "sign" | "history" | "aggravating" | "easing" | "functional";
  text: string;
  timestamp: number;
  isNew?: boolean;
}

export interface ClinicalFlag {
  id: string;
  type: "red" | "yellow" | "green";
  text: string;
  action: string;
}

export interface BiomechanicalLink {
  id: string;
  primaryRegion: string;
  connectedRegion: string;
  mechanism: string;
  clinicalRelevance: string;
}

export interface ReasoningStep {
  id: string;
  step: number;
  thought: string;
  type: "observation" | "hypothesis" | "deduction" | "recommendation";
  timestamp: number;
  isNew?: boolean;
}

export interface ClinicalReasoningData {
  hypotheses: ClinicalHypothesis[];
  findings: ClinicalFinding[];
  flags: ClinicalFlag[];
  biomechanicalLinks: BiomechanicalLink[];
  reasoningChain: ReasoningStep[];
  clinicalSummary: string;
  assessmentPriorities: string[];
}

interface ClinicalReasoningPanelProps {
  data: ClinicalReasoningData | null;
  isProcessing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const EMPTY_DATA: ClinicalReasoningData = {
  hypotheses: [],
  findings: [],
  flags: [],
  biomechanicalLinks: [],
  reasoningChain: [],
  clinicalSummary: "",
  assessmentPriorities: [],
};

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70
      ? "bg-teal-400"
      : value >= 40
        ? "bg-amber-400"
        : "bg-gray-500";
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400 w-7 text-right">{value}%</span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  color,
  isOpen,
  onToggle,
}: {
  icon: any;
  title: string;
  count: number;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
          {title}
        </span>
        {count > 0 && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full ${color.replace("text-", "bg-").replace("400", "500/20")} ${color}`}
          >
            {count}
          </span>
        )}
      </div>
      {isOpen ? (
        <ChevronUp className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />
      ) : (
        <ChevronDown className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />
      )}
    </button>
  );
}

export default function ClinicalReasoningPanel({
  data,
  isProcessing,
  isOpen,
  onToggle,
  onClose,
}: ClinicalReasoningPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hypotheses: true,
    findings: true,
    flags: true,
    biomechanical: false,
    reasoning: true,
    priorities: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const d = data || EMPTY_DATA;
  const hasContent =
    d.hypotheses.length > 0 ||
    d.findings.length > 0 ||
    d.flags.length > 0 ||
    d.reasoningChain.length > 0;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (scrollRef.current && hasContent) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 100);
      }
    }
  }, [d.reasoningChain.length, d.findings.length, hasContent]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full z-30 w-[320px] animate-in slide-in-from-right-2 duration-300">
      <div className="h-full bg-gray-950/95 backdrop-blur-xl border-l border-cyan-500/20 flex flex-col shadow-2xl shadow-cyan-500/5">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-gradient-to-r from-cyan-900/20 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-br from-cyan-500 to-blue-600 rounded">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs">Clinical Reasoning</span>
              <p className="text-[9px] text-gray-500">AI real-time analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isProcessing && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-cyan-400" />
                <span className="text-[9px] text-cyan-400">Analyzing</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {!hasContent && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-3 rounded-full bg-cyan-500/10 mb-3">
                <Brain className="h-6 w-6 text-cyan-500/50" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Waiting for clinical data</p>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Start speaking about the patient and the AI will analyze the clinical reasoning in real-time
              </p>
            </div>
          )}

          {!hasContent && isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-3" />
              <p className="text-xs text-gray-400">Processing clinical input...</p>
            </div>
          )}

          {d.flags.length > 0 && (
            <div>
              <SectionHeader
                icon={Shield}
                title="Clinical Flags"
                count={d.flags.length}
                color={d.flags.some((f) => f.type === "red") ? "text-red-400" : "text-amber-400"}
                isOpen={expandedSections.flags}
                onToggle={() => toggleSection("flags")}
              />
              {expandedSections.flags && (
                <div className="space-y-1 mt-1 ml-1">
                  {d.flags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`rounded-lg p-2 border ${
                        flag.type === "red"
                          ? "bg-red-500/10 border-red-500/30"
                          : flag.type === "yellow"
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-green-500/10 border-green-500/30"
                      } animate-in fade-in-0 slide-in-from-right-1 duration-300`}
                    >
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle
                          className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                            flag.type === "red"
                              ? "text-red-400"
                              : flag.type === "yellow"
                                ? "text-amber-400"
                                : "text-green-400"
                          }`}
                        />
                        <div>
                          <p className="text-[10px] font-medium text-gray-200">{flag.text}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">{flag.action}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {d.hypotheses.length > 0 && (
            <div>
              <SectionHeader
                icon={Stethoscope}
                title="Working Hypotheses"
                count={d.hypotheses.length}
                color="text-teal-400"
                isOpen={expandedSections.hypotheses}
                onToggle={() => toggleSection("hypotheses")}
              />
              {expandedSections.hypotheses && (
                <div className="space-y-1.5 mt-1 ml-1">
                  {d.hypotheses
                    .filter((h) => h.status !== "ruled_out")
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((hypothesis, idx) => (
                      <div
                        key={hypothesis.id}
                        className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30 animate-in fade-in-0 slide-in-from-right-1 duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-bold text-teal-400/70">#{idx + 1}</span>
                            <p className="text-[10px] font-medium text-gray-200 truncate">
                              {hypothesis.condition}
                            </p>
                          </div>
                          {hypothesis.status === "confirmed" && (
                            <span className="text-[8px] px-1 py-0.5 bg-teal-500/20 text-teal-400 rounded">
                              Confirmed
                            </span>
                          )}
                        </div>
                        <ConfidenceBar value={hypothesis.confidence} />
                        {hypothesis.supportingEvidence.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {hypothesis.supportingEvidence.map((ev, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="text-teal-500 text-[8px] mt-0.5">+</span>
                                <span className="text-[9px] text-gray-400">{ev}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {hypothesis.rulingOutFactors.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {hypothesis.rulingOutFactors.map((rf, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="text-red-500 text-[8px] mt-0.5">-</span>
                                <span className="text-[9px] text-gray-500">{rf}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  {d.hypotheses.filter((h) => h.status === "ruled_out").length > 0 && (
                    <div className="mt-1">
                      <p className="text-[9px] text-gray-600 mb-1">Ruled Out:</p>
                      {d.hypotheses
                        .filter((h) => h.status === "ruled_out")
                        .map((h) => (
                          <span
                            key={h.id}
                            className="inline-block text-[9px] text-gray-600 line-through mr-2"
                          >
                            {h.condition}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {d.findings.length > 0 && (
            <div>
              <SectionHeader
                icon={Target}
                title="Key Findings"
                count={d.findings.length}
                color="text-blue-400"
                isOpen={expandedSections.findings}
                onToggle={() => toggleSection("findings")}
              />
              {expandedSections.findings && (
                <div className="space-y-0.5 mt-1 ml-1">
                  {d.findings.map((finding, idx) => {
                    const categoryColors: Record<string, string> = {
                      symptom: "text-orange-400 bg-orange-500/10",
                      sign: "text-blue-400 bg-blue-500/10",
                      history: "text-purple-400 bg-purple-500/10",
                      aggravating: "text-red-400 bg-red-500/10",
                      easing: "text-green-400 bg-green-500/10",
                      functional: "text-cyan-400 bg-cyan-500/10",
                    };
                    const colors = categoryColors[finding.category] || "text-gray-400 bg-gray-500/10";
                    return (
                      <div
                        key={finding.id}
                        className={`flex items-start gap-1.5 px-2 py-1 rounded ${finding.isNew ? "animate-in fade-in-0 slide-in-from-right-2 duration-500 bg-blue-500/5" : ""}`}
                      >
                        <span
                          className={`text-[8px] px-1 py-0.5 rounded mt-0.5 flex-shrink-0 ${colors}`}
                        >
                          {finding.category.charAt(0).toUpperCase() + finding.category.slice(1)}
                        </span>
                        <span className="text-[10px] text-gray-300">{finding.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {d.biomechanicalLinks.length > 0 && (
            <div>
              <SectionHeader
                icon={GitBranch}
                title="Biomechanical Links"
                count={d.biomechanicalLinks.length}
                color="text-purple-400"
                isOpen={expandedSections.biomechanical}
                onToggle={() => toggleSection("biomechanical")}
              />
              {expandedSections.biomechanical && (
                <div className="space-y-1 mt-1 ml-1">
                  {d.biomechanicalLinks.map((link) => (
                    <div
                      key={link.id}
                      className="bg-gray-800/30 rounded-lg p-2 border border-purple-500/10 animate-in fade-in-0 duration-300"
                    >
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-purple-300 font-medium">{link.primaryRegion}</span>
                        <Zap className="h-2.5 w-2.5 text-purple-500" />
                        <span className="text-purple-300 font-medium">{link.connectedRegion}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-0.5">{link.mechanism}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 italic">{link.clinicalRelevance}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {d.reasoningChain.length > 0 && (
            <div>
              <SectionHeader
                icon={Lightbulb}
                title="Reasoning Chain"
                count={d.reasoningChain.length}
                color="text-amber-400"
                isOpen={expandedSections.reasoning}
                onToggle={() => toggleSection("reasoning")}
              />
              {expandedSections.reasoning && (
                <div className="mt-1 ml-1 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/30 via-cyan-500/20 to-transparent" />
                  <div className="space-y-1.5">
                    {d.reasoningChain.map((step, idx) => {
                      const typeIcons: Record<string, { icon: any; color: string }> = {
                        observation: { icon: Target, color: "text-blue-400 bg-blue-500/20" },
                        hypothesis: { icon: Lightbulb, color: "text-amber-400 bg-amber-500/20" },
                        deduction: { icon: Brain, color: "text-cyan-400 bg-cyan-500/20" },
                        recommendation: { icon: Sparkles, color: "text-teal-400 bg-teal-500/20" },
                      };
                      const typeConfig = typeIcons[step.type] || typeIcons.observation;
                      const StepIcon = typeConfig.icon;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-start gap-2 pl-1 ${step.isNew ? "animate-in fade-in-0 slide-in-from-right-2 duration-500" : ""}`}
                        >
                          <div
                            className={`p-0.5 rounded flex-shrink-0 mt-0.5 ${typeConfig.color}`}
                          >
                            <StepIcon className="h-2.5 w-2.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-300 leading-relaxed">
                              {step.thought}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {d.assessmentPriorities.length > 0 && (
            <div>
              <SectionHeader
                icon={TrendingUp}
                title="Assessment Priorities"
                count={d.assessmentPriorities.length}
                color="text-cyan-400"
                isOpen={expandedSections.priorities}
                onToggle={() => toggleSection("priorities")}
              />
              {expandedSections.priorities && (
                <div className="space-y-0.5 mt-1 ml-1">
                  {d.assessmentPriorities.map((priority, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 px-2 py-1">
                      <span className="text-[9px] font-bold text-cyan-500/60 mt-0.5">
                        {idx + 1}.
                      </span>
                      <span className="text-[10px] text-gray-300">{priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {d.clinicalSummary && (
            <div className="mt-2 mx-1 p-2 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold text-cyan-300">Clinical Summary</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{d.clinicalSummary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
