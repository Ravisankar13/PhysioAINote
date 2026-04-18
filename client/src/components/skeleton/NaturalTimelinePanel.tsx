import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, HelpCircle, Loader2, MessageCircle, Sparkles, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NaturalTimelineResult, NaturalTimelineQA, NaturalTimelineHealingClass } from "@shared/schema";

interface Props {
  result: NaturalTimelineResult | null;
  qaHistory: NaturalTimelineQA[];
  loading: boolean;
  error: string | null;
  hasContext: boolean;
  onAnswer: (questionId: string, answer: string) => void;
}

const HEALING_META: Record<NaturalTimelineHealingClass, { label: string; tone: string; Icon: typeof TrendingUp }> = {
  resolves: { label: "Resolves", tone: "text-emerald-300 bg-emerald-900/30 border-emerald-700/50", Icon: TrendingUp },
  partially_resolves: { label: "Partial", tone: "text-amber-300 bg-amber-900/30 border-amber-700/50", Icon: Minus },
  persists: { label: "Persists", tone: "text-orange-300 bg-orange-900/30 border-orange-700/50", Icon: Activity },
  worsens: { label: "Worsens", tone: "text-red-300 bg-red-900/30 border-red-700/50", Icon: TrendingDown },
};

export default function NaturalTimelinePanel({ result, qaHistory, loading, error, hasContext, onAnswer }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-lg overflow-hidden" data-testid="natural-timeline-panel">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          <div className="text-left">
            <div className="text-[11px] font-semibold text-violet-100">Natural Timeline (No Intervention)</div>
            <div className="text-[9px] text-gray-400">What happens with no manual therapy, exercise, or activity changes</div>
          </div>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-violet-300" />}
          {result && result.follow_up_questions.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && result && (
            <span className="text-[9px] text-violet-300 italic" data-testid="natural-timeline-refreshing">Refreshing…</span>
          )}
          {result && (
            <span className="text-[9px] text-gray-300">
              Confidence <span className="text-violet-300 font-mono">{Math.round(result.confidence_percent)}%</span>
            </span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {!hasContext && (
            <div className="text-[10px] text-gray-500 italic py-3 text-center">
              Add clinical findings (pain markers, compromised tissues, biomechanics) on the skeleton to predict the natural recovery course.
            </div>
          )}

          {hasContext && loading && !result && (
            <div className="flex items-center gap-2 text-[10px] text-gray-400 py-3 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Reasoning about natural healing course…
            </div>
          )}

          {error && (
            <div className="text-[10px] text-red-300 bg-red-950/30 border border-red-800/40 rounded px-2 py-1.5 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                <Metric label="Expected" value={`${Math.round(result.overall_window_weeks.expected)}w`} sub={`${Math.round(result.overall_window_weeks.best)}–${Math.round(result.overall_window_weeks.worst)}w`} tone="violet" />
                <Metric label="Chronicity" value={`${Math.round(result.chronicity_risk_percent)}%`} sub="risk of becoming chronic" tone={result.chronicity_risk_percent > 50 ? "red" : result.chronicity_risk_percent > 25 ? "amber" : "emerald"} />
                <Metric label="Residual" value={`${Math.round(result.residual_deficit_summary.overall_percent)}%`} sub="deficit at end of course" tone={result.residual_deficit_summary.overall_percent > 40 ? "red" : result.residual_deficit_summary.overall_percent > 20 ? "amber" : "emerald"} />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <Metric label="Recurrence (12mo)" value={`${Math.round(result.recurrence_risk_percent)}%`} tone={result.recurrence_risk_percent > 40 ? "red" : "amber"} />
                <Metric label="Flare risk" value={`${Math.round(result.flare_risk_percent)}%`} tone={result.flare_risk_percent > 40 ? "red" : "amber"} />
              </div>

              {result.per_finding.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-gray-400">Per-finding verdict</p>
                  <ScrollArea className="max-h-44 pr-1">
                    <div className="space-y-1">
                      {result.per_finding.map(f => {
                        const meta = HEALING_META[f.healing_class] ?? HEALING_META.partially_resolves;
                        const Icon = meta.Icon;
                        return (
                          <div key={f.finding_id} className={`rounded border ${meta.tone} px-1.5 py-1`}>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-1 min-w-0">
                                <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[10px] font-semibold truncate">{f.label}</div>
                                  <div className="text-[9px] opacity-80 leading-snug">{f.rationale}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[9px] uppercase font-mono">{meta.label}</div>
                                <div className="text-[9px] opacity-80">
                                  {f.expected_weeks_to_resolution !== null ? `${Math.round(f.expected_weeks_to_resolution)}w` : '—'}
                                  {' · '}
                                  res {Math.round(f.residual_deficit_percent)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {result.rationale && (
                <div className="text-[10px] text-gray-300 bg-gray-950/40 border border-gray-800/60 rounded px-2 py-1.5 leading-snug">
                  {result.rationale}
                </div>
              )}

              {result.incorporated_factors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.incorporated_factors.map((f, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-900/30 border border-violet-700/40 text-violet-200">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              )}

              {qaHistory.length > 0 && (
                <div className="border-t border-gray-700/40 pt-1">
                  <button
                    onClick={() => setHistoryOpen(o => !o)}
                    className="text-[9px] text-gray-400 hover:text-gray-200 uppercase tracking-wider flex items-center gap-1"
                  >
                    <MessageCircle className="h-2.5 w-2.5" />
                    Patient factors incorporated ({qaHistory.length})
                    {historyOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                  </button>
                  {historyOpen && (
                    <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                      {qaHistory.map((qa, i) => (
                        <div key={i} className="text-[10px]">
                          <p className="text-gray-400"><span className="text-amber-400">Q:</span> {qa.question}</p>
                          <p className="text-gray-200"><span className="text-emerald-400">A:</span> {qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.follow_up_questions.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-amber-700/30">
                  <p className="text-[9px] text-amber-300 uppercase tracking-wider flex items-center gap-1 font-medium">
                    <HelpCircle className="h-2.5 w-2.5" />
                    Refine the natural timeline ({result.follow_up_questions.length})
                  </p>
                  {result.follow_up_questions.map(fq => (
                    <div key={fq.id} className="rounded bg-amber-900/15 border border-amber-700/25 p-1.5">
                      <p className="text-[10px] text-amber-100 mb-1">{fq.question}</p>
                      {fq.clinical_relevance && (
                        <p className="text-[8px] text-amber-300/70 italic mb-1">{fq.clinical_relevance}</p>
                      )}
                      {fq.options && fq.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {fq.options.map((opt, oi) => (
                            <button
                              key={oi}
                              onClick={() => onAnswer(fq.id, opt)}
                              disabled={loading}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-amber-800/30 hover:bg-amber-700/40 text-amber-100 border border-amber-700/30 transition-colors disabled:opacity-50"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : activeQuestionId === fq.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={answerText}
                            onChange={e => setAnswerText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && answerText.trim()) {
                                onAnswer(fq.id, answerText);
                                setAnswerText("");
                                setActiveQuestionId(null);
                              }
                            }}
                            className="flex-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-gray-700 text-gray-200"
                            placeholder="Type your answer…"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (!answerText.trim()) return;
                              onAnswer(fq.id, answerText);
                              setAnswerText("");
                              setActiveQuestionId(null);
                            }}
                            disabled={!answerText.trim()}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActiveQuestionId(fq.id); setAnswerText(""); }}
                          className="text-[9px] text-amber-200 hover:text-amber-100 underline"
                        >
                          Type an answer →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'violet' | 'amber' | 'red' | 'emerald' }) {
  const toneCls =
    tone === 'red' ? 'text-red-300 border-red-800/50 bg-red-950/30' :
    tone === 'amber' ? 'text-amber-300 border-amber-800/50 bg-amber-950/30' :
    tone === 'emerald' ? 'text-emerald-300 border-emerald-800/50 bg-emerald-950/30' :
    'text-violet-200 border-violet-800/50 bg-violet-950/30';
  return (
    <div className={`rounded border px-1.5 py-1 ${toneCls}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-[12px] font-semibold font-mono">{value}</div>
      {sub && <div className="text-[8px] opacity-60">{sub}</div>}
    </div>
  );
}
