import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  FlaskConical,
  Eye,
  ClipboardList,
  GitCompare,
  Loader2,
  Check,
  Minus,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  updatePosterior,
  type TestOutcome,
  type BayesTestEntry,
} from "@/lib/hypothesisBayes";

export interface BenchHypothesisInput {
  id: string;
  condition: string;
  confidence: number;
  supportingEvidence: string[];
  rulingOutFactors: string[];
}

export interface BenchSkeletonContext {
  subjectiveHistory?: string;
  posture?: Record<string, Record<string, number>>;
  painMarkers?: Array<{
    label?: string;
    anatomicalLabel?: string;
    nearestBone?: string;
    type?: string;
    severity?: number;
  }>;
}

export interface FingerprintTest {
  id: string;
  name: string;
  instruction: string;
  sensitivity: number;
  specificity: number;
  lrPositive: number;
  lrNegative: number;
  evidenceCitation?: string;
  targetRegion?: string;
}

export interface HypothesisFingerprint {
  hypothesisId: string;
  condition: string;
  expectedHighlights: {
    regions: string[];
    bones: string[];
    muscleGroups: string[];
  };
  expectedPainMarkers: Array<{
    anatomicalLabel: string;
    type: string;
    severity: number;
    label?: string;
  }>;
  expectedPosture: Record<string, Record<string, number>>;
  confirmatoryTests: FingerprintTest[];
  whatWouldConfirm: string[];
  whatWouldRuleOut: string[];
  fingerprintSummary: string;
}

export interface BenchSkeletonOverlay {
  fingerprint: HypothesisFingerprint;
  source: "predicted" | "current";
}

export interface BenchUpdate {
  hypothesisId: string;
  newConfidence: number;
  rationale: string;
  appliedTests: Array<{
    name: string;
    outcome: TestOutcome;
    lrApplied: number;
  }>;
  fingerprintSummary?: string;
}

interface CompareCandidate {
  id: string;
  condition: string;
  confidence: number;
}

interface HypothesisTestBenchProps {
  isOpen: boolean;
  hypothesis: BenchHypothesisInput | null;
  context: BenchSkeletonContext;
  candidatesForCompare: CompareCandidate[];
  onClose: () => void;
  onApplyOverlay: (overlay: BenchSkeletonOverlay | null) => void;
  onCommit: (update: BenchUpdate) => void;
}

type Mode = "predicted" | "test" | "compare";

const MODE_DEFS: Array<{ key: Mode; label: string; icon: typeof Eye; description: string }> = [
  { key: "predicted", label: "Predicted Presentation", icon: Eye, description: "Light up the skeleton with what this hypothesis would look like." },
  { key: "test", label: "Test & Challenge", icon: ClipboardList, description: "Run confirmatory tests; confidence updates by Bayesian LR+/LR−." },
  { key: "compare", label: "Compare", icon: GitCompare, description: "Diff fingerprints between two hypotheses." },
];

function OutcomePill({ outcome }: { outcome: TestOutcome }) {
  if (outcome === "positive") return <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">+ Positive</span>;
  if (outcome === "negative") return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">− Negative</span>;
  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/40 text-gray-400 border border-gray-700/40">Skip</span>;
}

function ConfidenceArrow({ from, to }: { from: number; to: number }) {
  const delta = Math.round(to - from);
  if (delta === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Minus className="h-3 w-3" />
        <span>{Math.round(from)}% → {Math.round(to)}%</span>
      </div>
    );
  }
  const Up = delta > 0;
  const Icon = Up ? TrendingUp : TrendingDown;
  const color = Up ? "text-emerald-400" : "text-red-400";
  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="font-medium">{Math.round(from)}% → {Math.round(to)}%</span>
      <span className="text-[10px] opacity-80">({delta > 0 ? "+" : ""}{delta}%)</span>
    </div>
  );
}

async function fetchFingerprint(
  hypothesis: BenchHypothesisInput,
  context: BenchSkeletonContext,
): Promise<HypothesisFingerprint> {
  return await apiRequest("/api/clinical-reasoning/hypothesis-fingerprint", "POST", {
    hypothesis: {
      id: hypothesis.id,
      condition: hypothesis.condition,
      confidence: hypothesis.confidence,
      supportingEvidence: hypothesis.supportingEvidence,
      rulingOutFactors: hypothesis.rulingOutFactors,
    },
    context: {
      subjectiveHistory: context.subjectiveHistory,
      painMarkers: context.painMarkers,
      posture: context.posture,
    },
  });
}

function diffPosture(a: Record<string, Record<string, number>>, b: Record<string, Record<string, number>>): string[] {
  const diffs: string[] = [];
  const allKeys = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})]));
  for (const group of allKeys) {
    const ga = a[group] || {};
    const gb = b[group] || {};
    const params = Array.from(new Set([...Object.keys(ga), ...Object.keys(gb)]));
    for (const p of params) {
      const va = ga[p] ?? 0;
      const vb = gb[p] ?? 0;
      if (Math.abs(va - vb) >= 3) {
        diffs.push(`${group}.${p}: ${va.toFixed(0)}° vs ${vb.toFixed(0)}°`);
      }
    }
  }
  return diffs;
}

export default function HypothesisTestBench({
  isOpen,
  hypothesis,
  context,
  candidatesForCompare,
  onClose,
  onApplyOverlay,
  onCommit,
}: HypothesisTestBenchProps) {
  const [mode, setMode] = useState<Mode>("predicted");
  const [fingerprint, setFingerprint] = useState<HypothesisFingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, TestOutcome>>({});
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [compareFingerprint, setCompareFingerprint] = useState<HypothesisFingerprint | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [distinguishingSummary, setDistinguishingSummary] = useState<string>("");
  const [distinguishingLoading, setDistinguishingLoading] = useState(false);

  const cacheRef = useRef<Record<string, HypothesisFingerprint>>({});
  const lastHypothesisIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Reset on hypothesis change
  useEffect(() => {
    if (!hypothesis) return;
    if (hypothesis.id === lastHypothesisIdRef.current) return;
    lastHypothesisIdRef.current = hypothesis.id;
    setFingerprint(null);
    setOutcomes({});
    setExpandedTest(null);
    setMode("predicted");
    setError(null);
    setOverlayActive(false);
    setCompareTargetId(null);
    setCompareFingerprint(null);
    setDistinguishingSummary("");
  }, [hypothesis?.id]);

  // Fetch fingerprint when opened
  useEffect(() => {
    if (!isOpen || !hypothesis) return;
    if (fingerprint && fingerprint.hypothesisId === hypothesis.id) return;

    const cached = cacheRef.current[hypothesis.id];
    if (cached) {
      setFingerprint(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFingerprint(hypothesis, context)
      .then((fp) => {
        if (cancelled) return;
        cacheRef.current[hypothesis.id] = fp;
        setFingerprint(fp);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Hypothesis fingerprint error:", err);
        setError("Could not generate the predicted presentation. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, hypothesis?.id]);

  // When closed, ensure overlay restored
  useEffect(() => {
    if (!isOpen && overlayActive) {
      onApplyOverlay(null);
      setOverlayActive(false);
    }
  }, [isOpen]);

  const bayes = useMemo(() => {
    if (!fingerprint || !hypothesis) return null;
    const entries: BayesTestEntry[] = fingerprint.confirmatoryTests
      .map((t) => {
        const outcome = outcomes[t.id] || "skip";
        return {
          testId: t.id,
          name: t.name,
          outcome,
          lrPositive: t.lrPositive,
          lrNegative: t.lrNegative,
        };
      });
    return updatePosterior(hypothesis.confidence, entries);
  }, [fingerprint, hypothesis, outcomes]);

  const handleToggleOverlay = useCallback(() => {
    if (!fingerprint) return;
    if (overlayActive) {
      onApplyOverlay(null);
      setOverlayActive(false);
    } else {
      onApplyOverlay({ fingerprint, source: "predicted" });
      setOverlayActive(true);
    }
  }, [fingerprint, overlayActive, onApplyOverlay]);

  const handleResetToCurrent = useCallback(() => {
    onApplyOverlay(null);
    setOverlayActive(false);
  }, [onApplyOverlay]);

  const handleSetOutcome = useCallback((testId: string, outcome: TestOutcome) => {
    setOutcomes((prev) => ({ ...prev, [testId]: outcome }));
  }, []);

  const handleCommit = useCallback(() => {
    if (!hypothesis || !bayes) return;
    const appliedTests = bayes.steps.map((s) => ({
      name: s.name,
      outcome: s.outcome,
      lrApplied: s.lrApplied,
    }));
    onCommit({
      hypothesisId: hypothesis.id,
      newConfidence: bayes.posteriorPct,
      rationale: bayes.rationale,
      appliedTests,
      fingerprintSummary: fingerprint?.fingerprintSummary,
    });
    toast({
      title: "Confidence updated",
      description: `${hypothesis.condition}: ${Math.round(hypothesis.confidence)}% → ${Math.round(bayes.posteriorPct)}%`,
    });
    handleResetToCurrent();
    onClose();
  }, [hypothesis, bayes, fingerprint, onCommit, onClose, toast, handleResetToCurrent]);

  // Compare mode handling
  useEffect(() => {
    if (mode !== "compare" || !compareTargetId || !hypothesis) return;
    const target = candidatesForCompare.find((c) => c.id === compareTargetId);
    if (!target) return;

    const cached = cacheRef.current[target.id];
    if (cached) {
      setCompareFingerprint(cached);
      return;
    }
    setCompareLoading(true);
    fetchFingerprint(
      { id: target.id, condition: target.condition, confidence: target.confidence, supportingEvidence: [], rulingOutFactors: [] },
      context,
    )
      .then((fp) => {
        cacheRef.current[target.id] = fp;
        setCompareFingerprint(fp);
      })
      .catch((err) => {
        console.error("Compare fingerprint error:", err);
        toast({ title: "Error", description: "Could not load comparison fingerprint", variant: "destructive" });
      })
      .finally(() => setCompareLoading(false));
  }, [compareTargetId, mode, hypothesis?.id]);

  // Distinguishing summary (one-line, GPT-backed)
  useEffect(() => {
    if (mode !== "compare" || !fingerprint || !compareFingerprint) {
      setDistinguishingSummary("");
      return;
    }
    let cancelled = false;
    setDistinguishingLoading(true);
    apiRequest("/api/clinical-reasoning/hypothesis-distinguish", "POST", {
      a: { condition: fingerprint.condition, fingerprintSummary: fingerprint.fingerprintSummary, expectedHighlights: fingerprint.expectedHighlights, confirmatoryTests: fingerprint.confirmatoryTests.map(t => t.name) },
      b: { condition: compareFingerprint.condition, fingerprintSummary: compareFingerprint.fingerprintSummary, expectedHighlights: compareFingerprint.expectedHighlights, confirmatoryTests: compareFingerprint.confirmatoryTests.map(t => t.name) },
    })
      .then((res: { summary?: string }) => {
        if (cancelled) return;
        setDistinguishingSummary(res?.summary || "");
      })
      .catch(() => {
        if (cancelled) return;
        setDistinguishingSummary("");
      })
      .finally(() => {
        if (!cancelled) setDistinguishingLoading(false);
      });
    return () => { cancelled = true; };
  }, [mode, fingerprint?.hypothesisId, compareFingerprint?.hypothesisId]);

  if (!isOpen || !hypothesis) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400/70">Hypothesis Test Bench</p>
            <p className="text-sm font-semibold text-gray-100 truncate">{hypothesis.condition}</p>
          </div>
          <Badge variant="secondary" className="ml-2 text-[10px] bg-gray-800 text-gray-300 border-gray-700">
            {Math.round(hypothesis.confidence)}% start
          </Badge>
        </div>
        <button
          onClick={() => {
            handleResetToCurrent();
            onClose();
          }}
          className="p-1 rounded hover:bg-gray-800/50 text-gray-400 hover:text-white"
          data-testid="button-test-bench-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-700/50">
        {MODE_DEFS.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-300 border-b-2 border-cyan-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              data-testid={`button-test-bench-mode-${m.key}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Building predicted presentation...
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && fingerprint && (
            <>
              {mode === "predicted" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-300 leading-relaxed">{fingerprint.fingerprintSummary}</p>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleToggleOverlay}
                      className={overlayActive ? "bg-amber-600 hover:bg-amber-500" : "bg-cyan-600 hover:bg-cyan-500"}
                      data-testid="button-test-bench-toggle-overlay"
                    >
                      {overlayActive ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Reset to current findings
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Light up predicted presentation
                        </>
                      )}
                    </Button>
                    {overlayActive && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
                        Overlay active
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                      <p className="text-[10px] text-cyan-300 uppercase tracking-wider mb-1">Expected Regions</p>
                      <div className="flex flex-wrap gap-1">
                        {fingerprint.expectedHighlights.regions.map((r) => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">{r.replace(/_/g, " ")}</span>
                        ))}
                        {fingerprint.expectedHighlights.regions.length === 0 && <span className="text-[10px] text-gray-500 italic">none</span>}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                      <p className="text-[10px] text-orange-300 uppercase tracking-wider mb-1">Expected Muscles</p>
                      <div className="flex flex-wrap gap-1">
                        {fingerprint.expectedHighlights.muscleGroups.map((m) => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-500/30">{m}</span>
                        ))}
                        {fingerprint.expectedHighlights.muscleGroups.length === 0 && <span className="text-[10px] text-gray-500 italic">none</span>}
                      </div>
                    </div>
                  </div>

                  {fingerprint.expectedPainMarkers.length > 0 && (
                    <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                      <p className="text-[10px] text-red-300 uppercase tracking-wider mb-1">Predicted Pain Markers</p>
                      <div className="flex flex-wrap gap-1">
                        {fingerprint.expectedPainMarkers.map((pm, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-200 border border-red-500/30">
                            {pm.anatomicalLabel} <span className="opacity-60">({pm.type}, {pm.severity}/10)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(fingerprint.expectedPosture).length > 0 && (
                    <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                      <p className="text-[10px] text-purple-300 uppercase tracking-wider mb-1">Antalgic / Postural Set</p>
                      <ul className="text-[10px] text-gray-300 space-y-0.5">
                        {Object.entries(fingerprint.expectedPosture).map(([group, params]) =>
                          Object.entries(params).map(([p, v]) => (
                            <li key={`${group}.${p}`}>
                              <span className="text-purple-300">{group}.{p}</span>: {v.toFixed(0)}°
                            </li>
                          )),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {mode === "test" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-cyan-900/30 to-emerald-900/20 border border-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-300" />
                      <div>
                        <p className="text-[10px] text-cyan-300 uppercase tracking-wider">Bayesian update</p>
                        {bayes && <ConfidenceArrow from={bayes.startPct} to={bayes.posteriorPct} />}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCommit}
                      disabled={!bayes || bayes.steps.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs"
                      data-testid="button-test-bench-commit"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save to reasoning
                    </Button>
                  </div>

                  {bayes && bayes.steps.length > 0 && (
                    <div className="text-[10px] text-gray-400 italic px-1">{bayes.rationale}</div>
                  )}

                  <div className="space-y-1.5">
                    {fingerprint.confirmatoryTests.map((t) => {
                      const current = outcomes[t.id] || "skip";
                      const isExpanded = expandedTest === t.id;
                      return (
                        <div
                          key={t.id}
                          className="rounded-lg border border-gray-700/50 bg-gray-800/40 overflow-hidden"
                        >
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800/70 transition-colors"
                            onClick={() => setExpandedTest(isExpanded ? null : t.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                            <span className="text-xs text-gray-200 flex-1 text-left truncate">{t.name}</span>
                            <span className="text-[9px] text-gray-500">LR+ {t.lrPositive.toFixed(1)} / LR− {t.lrNegative.toFixed(1)}</span>
                            <OutcomePill outcome={current} />
                          </button>
                          {isExpanded && (
                            <div className="px-3 py-2 bg-black/20 border-t border-gray-700/40 space-y-2">
                              <p className="text-[10px] text-gray-300 leading-relaxed">{t.instruction}</p>
                              <div className="flex items-center gap-3 text-[9px] text-gray-500">
                                <span>Sn {(t.sensitivity * 100).toFixed(0)}%</span>
                                <span>Sp {(t.specificity * 100).toFixed(0)}%</span>
                                {t.targetRegion && <span>Target: {t.targetRegion}</span>}
                              </div>
                              {t.evidenceCitation && (
                                <p className="text-[9px] text-gray-500 italic">{t.evidenceCitation}</p>
                              )}
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  onClick={() => handleSetOutcome(t.id, "positive")}
                                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${current === "positive" ? "bg-emerald-500/30 border-emerald-400 text-emerald-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-500/50"}`}
                                  data-testid={`button-test-positive-${t.id}`}
                                >
                                  <Check className="h-3 w-3 inline mr-1" /> Positive
                                </button>
                                <button
                                  onClick={() => handleSetOutcome(t.id, "negative")}
                                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${current === "negative" ? "bg-red-500/30 border-red-400 text-red-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-red-500/50"}`}
                                  data-testid={`button-test-negative-${t.id}`}
                                >
                                  <X className="h-3 w-3 inline mr-1" /> Negative
                                </button>
                                <button
                                  onClick={() => handleSetOutcome(t.id, "skip")}
                                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${current === "skip" ? "bg-gray-700 border-gray-500 text-gray-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}
                                  data-testid={`button-test-skip-${t.id}`}
                                >
                                  <Minus className="h-3 w-3 inline mr-1" /> Skip
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {fingerprint.confirmatoryTests.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-4">No tests generated for this hypothesis.</p>
                    )}
                  </div>
                </div>
              )}

              {mode === "compare" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Compare with:</span>
                    <select
                      value={compareTargetId || ""}
                      onChange={(e) => setCompareTargetId(e.target.value || null)}
                      className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200"
                      data-testid="select-test-bench-compare"
                    >
                      <option value="">Select another hypothesis...</option>
                      {candidatesForCompare
                        .filter((c) => c.id !== hypothesis.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.condition} ({Math.round(c.confidence)}%)</option>
                        ))}
                    </select>
                  </div>

                  {compareLoading && (
                    <div className="flex items-center justify-center py-6 text-gray-400 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading comparison...
                    </div>
                  )}

                  {compareFingerprint && !compareLoading && (
                    <>
                      {distinguishingLoading ? (
                        <div className="text-[10px] text-gray-400 italic flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Generating distinguishing line...
                        </div>
                      ) : distinguishingSummary && (
                        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-xs text-cyan-200 italic">
                          {distinguishingSummary}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                          <p className="text-cyan-300 font-semibold mb-1 truncate">{fingerprint.condition}</p>
                          <p className="text-gray-400 mb-1">Regions: {fingerprint.expectedHighlights.regions.join(", ") || "—"}</p>
                          <p className="text-gray-400 mb-1">Muscles: {fingerprint.expectedHighlights.muscleGroups.join(", ") || "—"}</p>
                          <p className="text-gray-400 mb-1">Tests: {fingerprint.confirmatoryTests.map(t => t.name).join(", ") || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                          <p className="text-purple-300 font-semibold mb-1 truncate">{compareFingerprint.condition}</p>
                          <p className="text-gray-400 mb-1">Regions: {compareFingerprint.expectedHighlights.regions.join(", ") || "—"}</p>
                          <p className="text-gray-400 mb-1">Muscles: {compareFingerprint.expectedHighlights.muscleGroups.join(", ") || "—"}</p>
                          <p className="text-gray-400 mb-1">Tests: {compareFingerprint.confirmatoryTests.map(t => t.name).join(", ") || "—"}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-2">
                        <p className="text-[10px] text-amber-300 uppercase tracking-wider mb-1">Postural diff</p>
                        <ul className="text-[10px] text-gray-300 space-y-0.5">
                          {diffPosture(fingerprint.expectedPosture, compareFingerprint.expectedPosture).map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                          {diffPosture(fingerprint.expectedPosture, compareFingerprint.expectedPosture).length === 0 && (
                            <li className="italic text-gray-500">No meaningful postural differences (≥3°).</li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
