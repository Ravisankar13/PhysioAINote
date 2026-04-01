import { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronDown,
  Send,
  Sparkles,
  RotateCcw,
  Gauge,
  Link2,
  SlidersHorizontal,
  ArrowRight,
  Zap,
  FileText,
  Save,
  Brain,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { classifyPainMechanism, getNerveRootForRegion, MECHANISM_COLORS } from "@/lib/neurologyMap";
import { getKineticChainConnections, type KineticChainConnection } from "@/lib/kineticChainMap";
import type { AnatomicalRegion } from "@/components/skeleton/PureThreeGLBViewer";
import EvidenceCitationInline from "@/components/clinical/EvidenceCitationInline";

export interface EvidenceRef {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  studyType: string;
  pubmedUrl: string;
  abstract?: string;
}

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
    evidenceGrade?: string;
    citation?: string;
  }>;
  exercises: Array<{
    name: string;
    description: string;
    sets?: string;
    reps?: string;
    evidenceGrade?: string;
  }>;
  redFlags: string[];
  evidenceReferences?: EvidenceRef[];
  evidenceGrade?: string;
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
  onHighlightConnections?: (regions: AnatomicalRegion[]) => void;
  onClearConnectionHighlights?: () => void;
  onConnectionClick?: (region: AnatomicalRegion, label: string) => void;
  onTestChain?: (connection: KineticChainConnection, region: string) => void;
  onDataLoaded?: (markerId: string, data: ClinicalBubbleData, severity: string) => void;
  subjectiveHistory?: string;
  onSubjectiveHistoryChange?: (markerId: string, history: string) => void;
}

type TabType = "ddx" | "questions" | "subjective" | "assessment" | "treatment" | "exercises" | "behaviour";

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: "ddx", label: "DDx", icon: Stethoscope },
  { id: "questions", label: "Hx", icon: HelpCircle },
  { id: "subjective", label: "Subj", icon: FileText },
  { id: "assessment", label: "Obj", icon: ClipboardCheck },
  { id: "treatment", label: "Tx", icon: Pill },
  { id: "exercises", label: "Ex", icon: Dumbbell },
  { id: "behaviour", label: "Sx", icon: Brain },
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
  onHighlightConnections,
  onClearConnectionHighlights,
  onConnectionClick,
  onTestChain,
  onDataLoaded,
  subjectiveHistory,
  onSubjectiveHistoryChange,
}: ClinicalBubbleProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ddx");
  const [data, setData] = useState<ClinicalBubbleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [localHistory, setLocalHistory] = useState(subjectiveHistory || '');
  const [historySaved, setHistorySaved] = useState(false);
  const [refining, setRefining] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null);
  const [behaviourData, setBehaviourData] = useState<{
    flexion: string; extension: string; loading: string; rest: string;
    morning: string; fatigue: string; aggravatingFactors: string[];
    easingFactors: string[]; clinicalPattern: string;
  } | null>(null);
  const [behaviourLoading, setBehaviourLoading] = useState(false);
  const localHistoryRef = useRef(localHistory);
  localHistoryRef.current = localHistory;

  useEffect(() => {
    setLocalHistory(subjectiveHistory || '');
  }, [markerId, subjectiveHistory]);

  const connections = getKineticChainConnections(region);

  useEffect(() => {
    if (connectionsOpen && connections.length > 0) {
      onHighlightConnections?.(connections.map(c => c.region));
    } else {
      onClearConnectionHighlights?.();
    }
    return () => {
      onClearConnectionHighlights?.();
    };
  }, [connectionsOpen]);

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
          subjectiveHistory: localHistoryRef.current.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to get clinical analysis");

      const result = await response.json();
      setData(result);
      onDataLoaded?.(markerId, result, severity);
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
      setRefining(false);
    }
  }, [region, markerType, severity, markerId]);

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

  const handleClose = () => {
    onClearConnectionHighlights?.();
    onClose();
  };

  const bubbleStyle: React.CSSProperties = {
    position: "absolute",
    left: `${Math.min(Math.max(position.x + 20, 10), 55)}%`,
    top: `${Math.min(Math.max(position.y - 20, 5), 30)}%`,
    zIndex: 50,
  };

  return (
    <div style={bubbleStyle} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden w-[320px] max-w-[340px] flex-shrink-0">
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
            <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-0.5">
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

              {activeTab === "subjective" && (
                <div className="space-y-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileText className="h-3 w-3 text-amber-400" />
                      <span className="text-[11px] text-white font-medium">Patient Subjective History</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mb-2 leading-relaxed">
                      Write any relevant patient history, symptoms, onset details, aggravating/easing factors, or other subjective information. AI will integrate this into all analyses.
                    </p>
                    <textarea
                      value={localHistory}
                      onChange={(e) => { setLocalHistory(e.target.value); setHistorySaved(false); }}
                      placeholder="e.g. Patient reports gradual onset of pain over 3 weeks. Worse with overhead reaching. History of rotator cuff repair 2 years ago. Desk worker, sedentary lifestyle..."
                      className="w-full bg-gray-800/80 border border-gray-600/50 rounded-lg text-[11px] text-gray-200 placeholder-gray-600 px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      rows={5}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          onSubjectiveHistoryChange?.(markerId, localHistory.trim());
                          setHistorySaved(true);
                          setTimeout(() => setHistorySaved(false), 2000);
                        }}
                        className="flex items-center gap-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[10px] font-medium rounded-md px-2.5 py-1.5 transition-colors"
                      >
                        <Save className="h-3 w-3" />
                        Save Notes
                      </button>
                      {localHistory.trim() && (
                        <button
                          onClick={() => {
                            onSubjectiveHistoryChange?.(markerId, localHistory.trim());
                            fetchClinicalData(Object.keys(answers).length > 0 ? answers : undefined);
                          }}
                          className="flex items-center gap-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-[10px] font-medium rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          Re-analyze with History
                        </button>
                      )}
                      {historySaved && (
                        <span className="text-[9px] text-green-400 animate-in fade-in duration-200">Saved</span>
                      )}
                    </div>
                  </div>
                  {localHistory.trim() && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <span className="text-[9px] text-amber-400 font-medium">AI Integration Active</span>
                      <p className="text-[8px] text-amber-300/70 mt-0.5 leading-relaxed">
                        Your subjective notes will be factored into differential diagnoses, assessments, treatments, and exercise recommendations when you re-analyze.
                      </p>
                    </div>
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
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white font-medium">{t.name}</span>
                        {t.evidenceGrade && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            t.evidenceGrade === 'A' ? 'bg-green-500/20 text-green-300' :
                            t.evidenceGrade === 'B' ? 'bg-blue-500/20 text-blue-300' :
                            t.evidenceGrade === 'C' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            Grade {t.evidenceGrade}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{t.description}</p>
                      {t.frequency && (
                        <span className="text-[9px] text-blue-300 mt-1 inline-block">{t.frequency}</span>
                      )}
                      {t.citation && (
                        <p className="text-[8px] text-teal-400/70 mt-0.5 italic">{t.citation}</p>
                      )}
                    </div>
                  ))}
                  {data.evidenceReferences && data.evidenceReferences.length > 0 && (
                    <div className="border-t border-gray-700/30 pt-2 mt-2">
                      <EvidenceCitationInline
                        papers={data.evidenceReferences}
                        overallGrade={data.evidenceGrade as 'A' | 'B' | 'C' | 'D' | undefined}
                        compact={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === "exercises" && (
                <div className="space-y-2">
                  {data.exercises.map((e, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white font-medium">{e.name}</span>
                        {e.evidenceGrade && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            e.evidenceGrade === 'A' ? 'bg-green-500/20 text-green-300' :
                            e.evidenceGrade === 'B' ? 'bg-blue-500/20 text-blue-300' :
                            e.evidenceGrade === 'C' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            Grade {e.evidenceGrade}
                          </span>
                        )}
                      </div>
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

          {activeTab === "behaviour" && (
            <div className="space-y-2">
              {!behaviourData && !behaviourLoading && (
                <button
                  onClick={async () => {
                    setBehaviourLoading(true);
                    try {
                      const mechanism = classifyPainMechanism(region, undefined, markerType);
                      const nerveRoots = getNerveRootForRegion(region);
                      const result = await apiRequest('/api/pain-intelligence/behaviour', 'POST', {
                        region, markerType, mechanism,
                        nerveRoot: nerveRoots[0]?.root,
                      });
                      setBehaviourData(result);
                    } catch {
                      setBehaviourData(null);
                    } finally {
                      setBehaviourLoading(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-medium rounded-lg py-2 transition-colors"
                >
                  <Brain className="h-3 w-3" />
                  Analyze Symptom Behaviour
                </button>
              )}
              {behaviourLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                  <span className="text-[11px] text-gray-400">Analyzing behaviour patterns...</span>
                </div>
              )}
              {behaviourData && (
                <div className="space-y-2">
                  <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                    <span className="text-[9px] text-purple-300 font-semibold uppercase tracking-wide">Clinical Pattern</span>
                    <p className="text-[11px] text-white mt-0.5 leading-relaxed">{behaviourData.clinicalPattern}</p>
                  </div>
                  {[
                    { label: 'Flexion', val: behaviourData.flexion },
                    { label: 'Extension', val: behaviourData.extension },
                    { label: 'Loading', val: behaviourData.loading },
                    { label: 'Rest', val: behaviourData.rest },
                    { label: 'Morning', val: behaviourData.morning },
                    { label: 'Fatigue', val: behaviourData.fatigue },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-purple-300 font-medium">{label}</span>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">{val}</p>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                      <span className="text-[9px] text-red-300 font-semibold">Aggravating</span>
                      <ul className="mt-1 space-y-0.5">
                        {behaviourData.aggravatingFactors.map((f, i) => (
                          <li key={i} className="text-[9px] text-gray-400 flex items-start gap-1">
                            <span className="text-red-400 mt-0.5">•</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                      <span className="text-[9px] text-green-300 font-semibold">Easing</span>
                      <ul className="mt-1 space-y-0.5">
                        {behaviourData.easingFactors.map((f, i) => (
                          <li key={i} className="text-[9px] text-gray-400 flex items-start gap-1">
                            <span className="text-green-400 mt-0.5">•</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                const mechanism = classifyPainMechanism(region, undefined, markerType);
                const mc = MECHANISM_COLORS[mechanism];
                const nerveRoots = getNerveRootForRegion(region);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mc, boxShadow: `0 0 6px ${mc}` }} />
                      <span className="text-[11px] text-white font-medium capitalize">{mechanism.replace(/_/g, ' ')}</span>
                    </div>
                    {nerveRoots.length > 0 && (
                      <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                        <span className="text-[9px] text-blue-300 font-semibold uppercase tracking-wide">Nerve Roots</span>
                        <div className="mt-1 space-y-1">
                          {nerveRoots.slice(0, 3).map(nr => (
                            <div key={nr.root} className="text-[10px]">
                              <span className="text-blue-200 font-medium">{nr.root}</span>
                              <span className="text-gray-400 ml-1.5">{nr.dermatome.sensoryTerritory}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
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

      {connections.length > 0 && !loading && data && (
        <div className="w-[280px] flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-blue-500/30 overflow-hidden">
            <button
              onClick={() => setConnectionsOpen(!connectionsOpen)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-medium text-blue-300">Kinetic Chain Connections</span>
                <span className="text-[9px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">{connections.length}</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${connectionsOpen ? 'rotate-180' : ''}`} />
            </button>

            {connectionsOpen && (
              <div className="px-3 pb-3 space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent border-t border-gray-700/30">
                <p className="text-[9px] text-gray-500 mt-2 mb-2">Pain in the {region.toLowerCase()} may be connected to these areas through the kinetic chain:</p>
                {connections.map((conn) => {
                  const isExpanded = expandedConnection === conn.label;
                  return (
                    <div key={conn.label} className="bg-white/5 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedConnection(isExpanded ? null : conn.label)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" style={{ boxShadow: '0 0 6px #3b82f6' }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-white font-medium block">{conn.label}</span>
                          <span className="text-[9px] text-blue-300/70">{conn.relationship}</span>
                        </div>
                        <ChevronRight className={`h-3 w-3 text-gray-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 space-y-2">
                          <p className="text-[10px] text-gray-400 leading-relaxed">{conn.clinicalReason}</p>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onConnectionClick?.(conn.region, conn.label)}
                              className="flex-1 flex items-center justify-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[10px] font-medium rounded-md py-1.5 transition-colors"
                            >
                              <ArrowRight className="h-3 w-3" />
                              Mark & Analyze
                            </button>
                            {conn.sliderKey && (
                              <button
                                onClick={() => onTestChain?.(conn, region)}
                                className="flex-1 flex items-center justify-center gap-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[10px] font-medium rounded-md py-1.5 transition-colors"
                              >
                                <Zap className="h-3 w-3" />
                                Test the Chain
                              </button>
                            )}
                          </div>

                          {conn.sliderKey && (
                            <div className="flex items-start gap-1.5 bg-amber-500/10 rounded-md px-2 py-1.5">
                              <SlidersHorizontal className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
                              <p className="text-[9px] text-amber-300/80 leading-relaxed">{conn.testPrompt}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
