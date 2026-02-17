import { useState, useEffect, useCallback } from "react";
import {
  X,
  Stethoscope,
  HelpCircle,
  ClipboardCheck,
  Pill,
  Dumbbell,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Send,
  Sparkles,
  RotateCcw,
  Gauge,
} from "lucide-react";

export interface ClinicalBubbleData {
  differentials: Array<{
    name: string;
    likelihood: string;
    reasoning: string;
  }>;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
  }>;
  assessment: Array<{
    test: string;
    purpose: string;
    technique?: string;
  }>;
  treatments: Array<{
    name: string;
    description: string;
    frequency?: string;
  }>;
  exercises: Array<{
    name: string;
    description: string;
    sets?: string;
    reps?: string;
  }>;
  redFlags: string[];
}

interface ClinicalBubbleProps {
  markerId: string;
  region: string;
  markerType: string;
  position: { x: number; y: number };
  onClose: () => void;
  onDeepDive: (markerId: string, data: ClinicalBubbleData, answers: Record<string, string>) => void;
  severity: string;
  onSeverityChange: (severity: string) => void;
}

type TabType = "ddx" | "questions" | "assessment" | "treatment" | "exercises";

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: "ddx", label: "DDx", icon: Stethoscope },
  { id: "questions", label: "Hx", icon: HelpCircle },
  { id: "assessment", label: "Obj", icon: ClipboardCheck },
  { id: "treatment", label: "Tx", icon: Pill },
  { id: "exercises", label: "Ex", icon: Dumbbell },
];

export default function ClinicalBubble({
  markerId,
  region,
  markerType,
  position,
  onClose,
  onDeepDive,
  severity,
  onSeverityChange,
}: ClinicalBubbleProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ddx");
  const [data, setData] = useState<ClinicalBubbleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [refining, setRefining] = useState(false);

  const fetchClinicalData = useCallback(async (answeredQuestions?: Record<string, string>) => {
    const isRefine = !!answeredQuestions && Object.keys(answeredQuestions).length > 0;
    if (isRefine) {
      setRefining(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/physiogpt/clinical-bubble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          markerType,
          severity,
          answeredQuestions: answeredQuestions || {},
        }),
      });

      if (!response.ok) throw new Error("Failed to get clinical analysis");

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
      setRefining(false);
    }
  }, [region, markerType, severity]);

  useEffect(() => {
    fetchClinicalData();
  }, [region, markerType]);

  useEffect(() => {
    if (data) {
      fetchClinicalData(Object.keys(answers).length > 0 ? answers : undefined);
    }
  }, [severity]);

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };

  const handleRefine = () => {
    if (Object.keys(answers).length > 0) {
      fetchClinicalData(answers);
    }
  };

  const bubbleStyle: React.CSSProperties = {
    position: "absolute",
    left: `${Math.min(Math.max(position.x + 20, 10), 55)}%`,
    top: `${Math.min(Math.max(position.y - 20, 5), 30)}%`,
    zIndex: 50,
    maxWidth: "340px",
    width: "320px",
  };

  return (
    <div style={bubbleStyle} className="animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-teal-600/30 to-blue-600/30 border-b border-gray-700/50">
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-white truncate">{region}</span>
          </div>
          <div className="flex items-center gap-1">
            {data?.redFlags && data.redFlags.length > 0 && (
              <div className="flex items-center gap-1 bg-red-500/20 rounded px-1.5 py-0.5 mr-1">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-[9px] text-red-300 font-medium">{data.redFlags.length} Red Flag{data.redFlags.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {data?.redFlags && data.redFlags.length > 0 && (
          <div className="px-3 py-1.5 bg-red-900/30 border-b border-red-700/30">
            {data.redFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-300">
                <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-3 py-1.5 border-b border-gray-700/50 flex items-center gap-2">
          <Gauge className="h-3 w-3 text-gray-400" />
          <span className="text-[10px] text-gray-400">Severity:</span>
          {["mild", "moderate", "severe"].map((s) => (
            <button
              key={s}
              onClick={() => onSeverityChange(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full capitalize transition-colors ${
                severity === s
                  ? s === "mild"
                    ? "bg-green-500/30 text-green-300 ring-1 ring-green-500/50"
                    : s === "moderate"
                    ? "bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-500/50"
                    : "bg-red-500/30 text-red-300 ring-1 ring-red-500/50"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex border-b border-gray-700/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-teal-400 bg-teal-500/10 border-b-2 border-teal-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-3 max-h-[280px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-5 w-5 text-teal-400 animate-spin" />
              <span className="text-[11px] text-gray-400">Analyzing {region}...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-[11px] text-red-300">{error}</span>
              <button
                onClick={() => fetchClinicalData()}
                className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : data ? (
            <>
              {refining && (
                <div className="flex items-center gap-2 mb-2 bg-teal-500/10 rounded px-2 py-1.5">
                  <Loader2 className="h-3 w-3 text-teal-400 animate-spin" />
                  <span className="text-[10px] text-teal-300">Refining based on your answers...</span>
                </div>
              )}

              {activeTab === "ddx" && (
                <div className="space-y-2">
                  {data.differentials.map((d, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white font-medium">{d.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          d.likelihood === "high" ? "bg-red-500/20 text-red-300" :
                          d.likelihood === "moderate" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-green-500/20 text-green-300"
                        }`}>
                          {d.likelihood}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{d.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "questions" && (
                <div className="space-y-3">
                  {data.questions.map((q) => (
                    <div key={q.id} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[11px] text-white font-medium mb-1.5">{q.question}</p>
                      <div className="flex flex-wrap gap-1">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => handleAnswer(q.id, opt)}
                            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                              answers[q.id] === opt
                                ? "bg-teal-500/30 text-teal-300 ring-1 ring-teal-500/50"
                                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(answers).length > 0 && (
                    <button
                      onClick={handleRefine}
                      disabled={refining}
                      className="w-full flex items-center justify-center gap-1.5 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 text-[11px] font-medium rounded-lg py-2 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      Refine with {Object.keys(answers).length} Answer{Object.keys(answers).length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}

              {activeTab === "assessment" && (
                <div className="space-y-2">
                  {data.assessment.map((a, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 text-teal-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[11px] text-white font-medium">{a.test}</span>
                          <p className="text-[10px] text-gray-400 mt-0.5">{a.purpose}</p>
                          {a.technique && (
                            <p className="text-[10px] text-teal-400/70 mt-0.5 italic">{a.technique}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "treatment" && (
                <div className="space-y-2">
                  {data.treatments.map((t, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2">
                      <span className="text-[11px] text-white font-medium">{t.name}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{t.description}</p>
                      {t.frequency && (
                        <span className="text-[9px] text-blue-300 mt-1 inline-block">📅 {t.frequency}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "exercises" && (
                <div className="space-y-2">
                  {data.exercises.map((e, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2">
                      <span className="text-[11px] text-white font-medium">{e.name}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{e.description}</p>
                      {(e.sets || e.reps) && (
                        <span className="text-[9px] text-green-300 mt-1 inline-block">
                          {e.sets && `${e.sets} sets`}{e.sets && e.reps && " × "}{e.reps && `${e.reps} reps`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="px-3 py-2 border-t border-gray-700/50 flex gap-2">
          <button
            onClick={() => data && onDeepDive(markerId, data, answers)}
            disabled={!data || loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[11px] font-medium rounded-lg py-2 transition-all disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            Deep Dive with AI
          </button>
        </div>
      </div>
    </div>
  );
}
