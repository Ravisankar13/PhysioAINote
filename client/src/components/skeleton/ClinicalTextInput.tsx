import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Brain, Sparkles, X, ChevronDown, ChevronUp, MessageCircle, HelpCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface ParsedPainMarker {
  anatomical_label: string;
  type: "point" | "area" | "referred";
  symptom_type: string;
  description: string;
  confidence?: "confirmed" | "predicted";
}

export interface ParsedMuscleState {
  muscle_id: string;
  pathology: string;
  tension_offset: number;
  activation_offset: number;
  inhibition: number;
  confidence?: "confirmed" | "predicted";
}

export interface ParsedRegionHighlight {
  region: string;
  type: string;
  severity: number;
  label: string;
  confidence?: "confirmed" | "predicted";
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  options?: string[];
  clinical_relevance: string;
}

export interface ClinicalParseResult {
  pain_markers: ParsedPainMarker[];
  muscle_states: ParsedMuscleState[];
  postural_deviations: Record<string, number>;
  region_highlights: ParsedRegionHighlight[];
  clinical_summary: string;
  follow_up_questions?: FollowUpQuestion[];
  predictions_confidence?: "high" | "moderate" | "low";
}

interface QAEntry {
  question: string;
  answer: string;
}

interface ClinicalTextInputProps {
  onParseResult: (result: ClinicalParseResult) => void;
  onClearFindings?: () => void;
  disabled?: boolean;
}

const EXAMPLE_DESCRIPTIONS = [
  "Baastrup's disease with anterior pelvic tilt",
  "45-year-old with rotator cuff tear, forward head posture",
  "Runner with bilateral IT band syndrome and overpronation",
  "Office worker with upper crossed syndrome and low back pain",
  "Elderly patient with lumbar spinal stenosis and kyphosis",
];

export default function ClinicalTextInput({ onParseResult, onClearFindings, disabled }: ClinicalTextInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ClinicalParseResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const originalTextRef = useRef("");
  const { toast } = useToast();

  const doParseRequest = useCallback(async (inputText: string, context: QAEntry[]) => {
    setLoading(true);
    try {
      const result: ClinicalParseResult = await apiRequest("/api/clinical-text/parse", "POST", {
        text: inputText.trim(),
        context: context.length > 0 ? context : undefined,
      });
      setLastResult(result);
      onParseResult(result);

      if (result.follow_up_questions && result.follow_up_questions.length > 0) {
        setFollowUpQuestions(result.follow_up_questions);
      } else {
        setFollowUpQuestions([]);
      }

      const counts = [];
      if (result.pain_markers.length > 0) counts.push(`${result.pain_markers.length} pain marker${result.pain_markers.length > 1 ? "s" : ""}`);
      if (result.muscle_states.length > 0) counts.push(`${result.muscle_states.length} muscle state${result.muscle_states.length > 1 ? "s" : ""}`);
      const deviationCount = Object.keys(result.postural_deviations).length;
      if (deviationCount > 0) counts.push(`${deviationCount} postural change${deviationCount > 1 ? "s" : ""}`);
      if (result.region_highlights.length > 0) counts.push(`${result.region_highlights.length} region${result.region_highlights.length > 1 ? "s" : ""}`);

      const hasQuestions = result.follow_up_questions && result.follow_up_questions.length > 0;
      toast({
        title: hasQuestions ? "Skeleton Updated — Follow-up Questions Available" : "Skeleton Updated",
        description: counts.length > 0 ? `Applied: ${counts.join(", ")}` : "No specific findings detected.",
      });
    } catch (err) {
      console.error("Clinical text parse error:", err);
      toast({ title: "Parse Error", description: "Failed to analyze the clinical description. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [onParseResult, toast]);

  const handleParse = useCallback(async () => {
    if (!text.trim() || text.trim().length < 3) {
      toast({ title: "Too Short", description: "Please enter a more detailed clinical description.", variant: "destructive" });
      return;
    }
    originalTextRef.current = text.trim();
    setQaHistory([]);
    setFollowUpQuestions([]);
    setActiveQuestionId(null);
    await doParseRequest(text.trim(), []);
  }, [text, doParseRequest, toast]);

  const handleAnswerSubmit = useCallback(async (questionId: string, answer: string) => {
    const q = followUpQuestions.find(fq => fq.id === questionId);
    if (!q || !answer.trim()) return;

    const newEntry: QAEntry = { question: q.question, answer: answer.trim() };
    const updatedHistory = [...qaHistory, newEntry];
    setQaHistory(updatedHistory);
    setAnswerText("");
    setActiveQuestionId(null);
    setFollowUpQuestions(prev => prev.filter(fq => fq.id !== questionId));

    await doParseRequest(originalTextRef.current, updatedHistory);
  }, [followUpQuestions, qaHistory, doParseRequest]);

  const handleOptionClick = useCallback(async (questionId: string, option: string) => {
    await handleAnswerSubmit(questionId, option);
  }, [handleAnswerSubmit]);

  const handleExampleClick = useCallback((example: string) => {
    setText(example);
    setShowExamples(false);
  }, []);

  const handleClearText = useCallback(() => {
    setText("");
  }, []);

  const handleClearFindings = useCallback(() => {
    setText("");
    setLastResult(null);
    setFollowUpQuestions([]);
    setQaHistory([]);
    setActiveQuestionId(null);
    originalTextRef.current = "";
    if (onClearFindings) onClearFindings();
  }, [onClearFindings]);

  const confirmedCount = lastResult ? {
    pain: lastResult.pain_markers.filter(p => p.confidence === 'confirmed').length,
    predicted_pain: lastResult.pain_markers.filter(p => p.confidence === 'predicted').length,
    muscles: lastResult.muscle_states.filter(m => m.confidence === 'confirmed').length,
    predicted_muscles: lastResult.muscle_states.filter(m => m.confidence === 'predicted').length,
  } : null;

  return (
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-blue-500/30 overflow-hidden w-72">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">Clinical Prediction</span>
          {lastResult && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-900/40 text-blue-300 border-blue-700/40">
              Active
            </Badge>
          )}
          {followUpQuestions.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Describe patient or diagnosis... e.g., 'Baastrup's disease, large gluteal mass, elderly patient'"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[60px] text-xs bg-black/40 border-gray-700 resize-none pr-7 text-gray-200 placeholder:text-gray-500"
              disabled={loading || disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleParse();
                }
              }}
            />
            {text && (
              <button
                onClick={handleClearText}
                className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-gray-700/60 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleParse}
              disabled={loading || !text.trim() || disabled}
              className="h-6 text-[11px] gap-1 bg-blue-600 hover:bg-blue-500 flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Predict & Visualize
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExamples(!showExamples)}
              className="h-6 text-[11px] px-2 border-gray-700 text-gray-400 hover:text-white"
            >
              Examples
            </Button>
          </div>

          {showExamples && (
            <div className="space-y-1">
              {EXAMPLE_DESCRIPTIONS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex)}
                  className="w-full text-left text-[10px] px-2 py-1.5 rounded bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors border border-gray-700/50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {qaHistory.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-gray-700/40">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <MessageCircle className="h-2.5 w-2.5" /> Follow-up History
              </p>
              <ScrollArea className="max-h-20">
                {qaHistory.map((qa, i) => (
                  <div key={i} className="mb-1 text-[10px]">
                    <p className="text-gray-400"><span className="text-amber-400">Q:</span> {qa.question}</p>
                    <p className="text-gray-300"><span className="text-green-400">A:</span> {qa.answer}</p>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {followUpQuestions.length > 0 && !loading && (
            <div className="space-y-1.5 pt-1 border-t border-amber-700/30">
              <p className="text-[9px] text-amber-400 uppercase tracking-wider flex items-center gap-1 font-medium">
                <HelpCircle className="h-2.5 w-2.5" />
                Help refine the prediction ({followUpQuestions.length})
              </p>
              {followUpQuestions.map((fq) => (
                <div key={fq.id} className="rounded bg-amber-900/15 border border-amber-700/25 p-1.5">
                  <p className="text-[10px] text-amber-200 mb-1">{fq.question}</p>
                  {fq.clinical_relevance && (
                    <p className="text-[8px] text-amber-400/60 italic mb-1">{fq.clinical_relevance}</p>
                  )}
                  {fq.options && fq.options.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {fq.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => handleOptionClick(fq.id, opt)}
                          disabled={loading}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-800/30 hover:bg-amber-700/40 text-amber-200 border border-amber-700/30 transition-colors disabled:opacity-50"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    activeQuestionId === fq.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAnswerSubmit(fq.id, answerText);
                          }}
                          className="flex-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-gray-700 text-gray-200"
                          placeholder="Type your answer..."
                          autoFocus
                        />
                        <button
                          onClick={() => handleAnswerSubmit(fq.id, answerText)}
                          disabled={!answerText.trim()}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActiveQuestionId(fq.id); setAnswerText(""); }}
                        className="text-[9px] text-amber-300 hover:text-amber-200 underline"
                      >
                        Answer this question
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {lastResult && (
            <div className="space-y-1.5 pt-1 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                {lastResult.clinical_summary && (
                  <p className="text-[10px] text-blue-300 italic flex-1 leading-tight">{lastResult.clinical_summary}</p>
                )}
                <button
                  onClick={handleClearFindings}
                  className="text-[9px] text-red-400 hover:text-red-300 whitespace-nowrap ml-2 px-1.5 py-0.5 rounded hover:bg-red-900/30 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {lastResult.predictions_confidence && (
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-2.5 w-2.5 text-gray-500" />
                  <span className={`text-[9px] ${
                    lastResult.predictions_confidence === 'high' ? 'text-green-400' :
                    lastResult.predictions_confidence === 'moderate' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {lastResult.predictions_confidence === 'high' ? 'High' :
                     lastResult.predictions_confidence === 'moderate' ? 'Moderate' : 'Low'} prediction confidence
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {lastResult.pain_markers.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-red-900/30 text-red-300 border-red-700/30 gap-0.5">
                    {lastResult.pain_markers.length} Pain
                    {confirmedCount && confirmedCount.predicted_pain > 0 && (
                      <span className="text-amber-300 ml-0.5">({confirmedCount.predicted_pain} predicted)</span>
                    )}
                  </Badge>
                )}
                {lastResult.muscle_states.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-orange-900/30 text-orange-300 border-orange-700/30 gap-0.5">
                    {lastResult.muscle_states.length} Muscles
                    {confirmedCount && confirmedCount.predicted_muscles > 0 && (
                      <span className="text-amber-300 ml-0.5">({confirmedCount.predicted_muscles} predicted)</span>
                    )}
                  </Badge>
                )}
                {Object.keys(lastResult.postural_deviations).length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-purple-900/30 text-purple-300 border-purple-700/30">
                    {Object.keys(lastResult.postural_deviations).length} Posture
                  </Badge>
                )}
                {lastResult.region_highlights.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-green-900/30 text-green-300 border-green-700/30">
                    {lastResult.region_highlights.length} Regions
                  </Badge>
                )}
              </div>

              {lastResult.pain_markers.length > 0 && (
                <div className="space-y-0.5">
                  {lastResult.pain_markers.map((pm, i) => (
                    <div key={i} className="flex items-center gap-1 text-[9px]">
                      {pm.confidence === 'predicted' ? (
                        <Lightbulb className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                      )}
                      <span className="text-gray-300 truncate">{pm.anatomical_label}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-400 truncate">{pm.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
