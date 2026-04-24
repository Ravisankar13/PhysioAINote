import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RefreshCcw, Sparkles, AlertTriangle, ChevronDown, ChevronUp, X, UserCog, ShieldAlert, Activity, Pill, HeartPulse, Coffee, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  PatientContextPrompt,
  PatientContextAnswer,
  PatientContextPayload,
  PatientContextPromptsResult,
} from "@shared/schema";
import type { ClinicalParseResult } from "@/components/skeleton/ClinicalTextInput";

/** Source of truth for the patient-context state lifted into the
 *  PhysioGPT page. The panel is fully controlled by the parent so the
 *  exact same payload can be forwarded to the prediction re-run, the
 *  natural-history hook, the case-specific plan hook, and (downstream)
 *  the recovery sim. */
export interface PatientContextState {
  /** AI-generated prompts, keyed to the prediction fingerprint that
   *  produced them. */
  prompts: PatientContextPrompt[];
  /** Per-prompt clinician answers (id -> answer). */
  answers: Record<string, string>;
  /** Free-form clinician notes about the patient. */
  freeForm: string;
  /** Fingerprint of the prediction these prompts were generated for.
   *  Compared against the live prediction's fingerprint to detect
   *  stale prompts when the clinician edits the description. */
  predictionFingerprint: string | null;
  /** ISO timestamp of the last prompt generation. */
  generatedAt: string | null;
}

export const EMPTY_PATIENT_CONTEXT_STATE: PatientContextState = {
  prompts: [],
  answers: {},
  freeForm: "",
  predictionFingerprint: null,
  generatedAt: null,
};

/** Build the merged payload that downstream AI calls consume. Only
 *  prompts that the clinician actually answered are included. */
export function buildPatientContextPayload(state: PatientContextState): PatientContextPayload {
  const answers: PatientContextAnswer[] = [];
  for (const p of state.prompts) {
    const answer = (state.answers[p.id] ?? "").trim();
    if (!answer) continue;
    answers.push({
      prompt_id: p.id,
      prompt: p.prompt,
      rationale: p.rationale,
      category: p.category,
      answer,
    });
  }
  return {
    free_form: state.freeForm.trim(),
    answers,
  };
}

export function patientContextHasContent(state: PatientContextState): boolean {
  if (state.freeForm.trim().length > 0) return true;
  return Object.values(state.answers).some(a => (a ?? "").trim().length > 0);
}

// Signature + fingerprint helpers live in `@/lib/patientContextSig` so
// they can be consumed from non-UI modules (hooks, page logic) without
// pulling in this component's render dependencies. Re-exported here
// for backward compatibility.
import { buildPatientContextSig, predictionFingerprintFor } from "@/lib/patientContextSig";
export { buildPatientContextSig, predictionFingerprintFor };

const CATEGORY_META: Record<string, { label: string; Icon: typeof UserCog; tone: string }> = {
  healing_time: { label: "Healing time", Icon: HeartPulse, tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  red_flag: { label: "Red flag", Icon: ShieldAlert, tone: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  exercise_dosing: { label: "Exercise dosing", Icon: Activity, tone: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  contraindication: { label: "Contraindication", Icon: Pill, tone: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  compensation: { label: "Compensation", Icon: UserCog, tone: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  lifestyle: { label: "Lifestyle", Icon: Coffee, tone: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  other: { label: "Other", Icon: UserCog, tone: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

function categoryMeta(cat: string | undefined) {
  return CATEGORY_META[cat ?? "other"] ?? CATEGORY_META.other;
}

interface PatientContextPanelProps {
  /** Latest prediction parse result. Drives the prompt-generation
   *  request and the stale fingerprint comparison. */
  parseResult: ClinicalParseResult | null;
  /** Lifted state — the panel is fully controlled. */
  state: PatientContextState;
  onChange: (next: PatientContextState) => void;
  /** Called after the clinician explicitly applies / regenerates
   *  prompts so the parent can trigger the dependent AI calls
   *  (prediction re-run, natural timeline, case-specific plan). */
  onApply?: () => void;
  /** Hide the panel entirely when no prediction has been made yet. */
  visible?: boolean;
  className?: string;
}

export function PatientContextPanel({
  parseResult,
  state,
  onChange,
  onApply,
  visible = true,
  className,
}: PatientContextPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const liveFingerprint = useMemo(() => predictionFingerprintFor(parseResult), [parseResult]);
  const isStale = useMemo(() => {
    if (!state.predictionFingerprint || !liveFingerprint) return false;
    return state.predictionFingerprint !== liveFingerprint;
  }, [state.predictionFingerprint, liveFingerprint]);

  const generatePrompts = useCallback(async (opts: { keepAnswers: boolean }) => {
    if (!parseResult || !liveFingerprint) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/patient-context/prompts", "POST", {
        description: parseResult.original_description ?? "",
        clinical_summary: parseResult.clinical_summary ?? "",
        pain_markers: (parseResult.pain_markers ?? []).map(pm => ({
          anatomical_label: pm.anatomical_label,
          description: pm.description,
          symptom_type: pm.symptom_type,
        })),
        compromised_tissues: (parseResult.compromised_tissues ?? []).map(ct => ({
          tissue_type: ct.tissue_type,
          tissue_id: ct.tissue_id,
          rationale: ct.rationale,
        })),
        region_highlights: (parseResult.region_highlights ?? []).map(rh => ({
          region: rh.region,
          type: rh.type,
          label: rh.label,
        })),
      }) as PatientContextPromptsResult;

      const newPrompts = Array.isArray(data?.prompts) ? data.prompts : [];
      // Preserve answers whose prompt id survives across regenerations
      // (e.g. "diabetes" prompt stays asked when only the description
      // changed slightly), unless the caller explicitly asked for a
      // clean slate.
      const survivingAnswers: Record<string, string> = {};
      if (opts.keepAnswers) {
        const newIds = new Set(newPrompts.map(p => p.id));
        for (const [id, ans] of Object.entries(state.answers)) {
          if (newIds.has(id) && (ans ?? "").trim()) survivingAnswers[id] = ans;
        }
      }

      onChange({
        prompts: newPrompts,
        answers: survivingAnswers,
        freeForm: state.freeForm,
        predictionFingerprint: liveFingerprint,
        generatedAt: data.generated_at ?? new Date().toISOString(),
      });

      if (newPrompts.length === 0) {
        toast({
          title: "No condition-specific prompts needed",
          description: "The AI didn't suggest any extra patient-context questions for this case.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate prompts";
      setError(msg);
      toast({ title: "Prompt generation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [parseResult, liveFingerprint, state.answers, state.freeForm, onChange, toast]);

  // Auto-generate prompts the first time we see a prediction. We only
  // auto-fire when there are no prompts at all — never to overwrite a
  // clinician's existing answers. Stale-after-edit always requires an
  // explicit click (so we don't blow away their work).
  const autoGenFiredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!parseResult || !liveFingerprint) return;
    if (state.prompts.length > 0) return;
    if (autoGenFiredFor.current === liveFingerprint) return;
    autoGenFiredFor.current = liveFingerprint;
    void generatePrompts({ keepAnswers: false });
  }, [parseResult, liveFingerprint, state.prompts.length, generatePrompts]);

  const setAnswer = useCallback((promptId: string, answer: string) => {
    onChange({ ...state, answers: { ...state.answers, [promptId]: answer } });
  }, [state, onChange]);

  const setFreeForm = useCallback((value: string) => {
    onChange({ ...state, freeForm: value });
  }, [state, onChange]);

  const clearAll = useCallback(() => {
    onChange({
      prompts: state.prompts,
      answers: {},
      freeForm: "",
      predictionFingerprint: state.predictionFingerprint,
      generatedAt: state.generatedAt,
    });
  }, [state, onChange]);

  const answeredCount = useMemo(
    () => state.prompts.reduce((n, p) => n + ((state.answers[p.id] ?? "").trim() ? 1 : 0), 0),
    [state.prompts, state.answers],
  );
  const hasContent = patientContextHasContent(state);

  if (!visible) return null;

  return (
    <Card
      className={cn(
        "w-[420px] max-w-[calc(100vw-32px)] bg-slate-950/85 border-slate-700/70 backdrop-blur shadow-xl text-slate-100",
        className,
      )}
      data-testid="card-patient-context"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-violet-300 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-200 truncate">
            Patient Context
          </span>
          {answeredCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] border-violet-400/40 text-violet-200 bg-violet-500/10">
              {answeredCount} answered
            </Badge>
          )}
          {isStale && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] gap-1 border-amber-400/50 text-amber-200 bg-amber-500/15"
                    data-testid="badge-patient-context-stale"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Stale
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                  The clinical prediction has changed since these prompts were generated. Regenerate to get new prompts for the current picture (your existing answers will be preserved when their question survives).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-slate-100"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand patient context" : "Collapse patient context"}
            data-testid="button-patient-context-toggle"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
          {!parseResult && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Submit a clinical prediction above and PhysioGPT will ask you the condition-specific patient questions that would change the prediction, timeline, treatment plan and recovery sim.
            </p>
          )}

          {parseResult && state.prompts.length === 0 && loading && (
            <div className="flex items-center gap-2 text-[11px] text-slate-300" data-testid="status-patient-context-loading">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
              Generating condition-specific prompts…
            </div>
          )}

          {parseResult && state.prompts.length === 0 && !loading && error && (
            <div className="text-[11px] text-rose-300">
              {error}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-[11px] h-auto p-0 ml-1 text-rose-200 hover:text-rose-100"
                onClick={() => void generatePrompts({ keepAnswers: false })}
              >
                Try again
              </Button>
            </div>
          )}

          {parseResult && state.prompts.length === 0 && !loading && !error && (
            <p className="text-[11px] text-slate-400">
              No condition-specific prompts were generated. You can still add free-form context below.
            </p>
          )}

          {state.prompts.length > 0 && (
            <ul className="space-y-2.5" data-testid="list-patient-context-prompts">
              {state.prompts.map(prompt => {
                const meta = categoryMeta(prompt.category);
                const answer = state.answers[prompt.id] ?? "";
                const isAnswered = answer.trim().length > 0;
                return (
                  <li
                    key={prompt.id}
                    className={cn(
                      "rounded-md border bg-slate-900/60 px-2.5 py-2 transition-colors",
                      isAnswered ? "border-violet-500/40" : "border-slate-700/60",
                    )}
                    data-testid={`item-patient-context-prompt-${prompt.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border shrink-0", meta.tone)}>
                        <meta.Icon className="h-2.5 w-2.5" />
                        {meta.label}
                      </span>
                      <p className="text-[12px] leading-snug text-slate-100 flex-1">{prompt.prompt}</p>
                      {prompt.rationale && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="shrink-0 text-slate-400 hover:text-slate-100 transition-colors"
                                aria-label="Why this question matters"
                                data-testid={`tooltip-rationale-${prompt.id}`}
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                              <span className="block text-slate-300 italic">Why this matters:</span>
                              {prompt.rationale}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {prompt.options && prompt.options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {prompt.options.map(opt => {
                            const selected = answer.trim() === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setAnswer(prompt.id, selected ? "" : opt)}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10.5px] border transition-colors",
                                  selected
                                    ? "bg-violet-500/30 border-violet-300/60 text-violet-50"
                                    : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-violet-500/40 hover:text-violet-100",
                                )}
                                data-testid={`button-patient-context-option-${prompt.id}-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <Input
                        value={answer}
                        onChange={(e) => setAnswer(prompt.id, e.target.value)}
                        placeholder={prompt.options && prompt.options.length > 0 ? "…or type your own" : "Your answer"}
                        className="h-7 text-[11.5px] bg-slate-950/70 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
                        data-testid={`input-patient-context-answer-${prompt.id}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-slate-300">
              Free-form patient notes
            </label>
            <Textarea
              value={state.freeForm}
              onChange={(e) => setFreeForm(e.target.value)}
              placeholder="Anything else about this patient that would change your plan (job demands, sleep, mental load, prior episodes, beliefs about pain, goals)…"
              className="min-h-[64px] text-[11.5px] bg-slate-950/70 border-slate-700/70 text-slate-100 placeholder:text-slate-500 resize-y"
              data-testid="textarea-patient-context-free-form"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-7 text-[11px]",
                isStale
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
                  : "bg-violet-600 hover:bg-violet-500 text-white",
              )}
              disabled={!parseResult || loading}
              onClick={() => void generatePrompts({ keepAnswers: true })}
              data-testid="button-patient-context-regenerate"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCcw className="h-3 w-3 mr-1" />
              )}
              {isStale ? "Regenerate for current prediction" : (state.prompts.length > 0 ? "Regenerate prompts" : "Generate prompts")}
            </Button>
            {hasContent && onApply && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[11px] bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-100"
                onClick={onApply}
                data-testid="button-patient-context-apply"
                title="The prediction, timeline, treatment plan and recovery sim auto-refresh when you edit context — click to apply immediately."
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Apply now
              </Button>
            )}
            {hasContent && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-slate-400 hover:text-slate-100"
                onClick={clearAll}
                data-testid="button-patient-context-clear"
              >
                <X className="h-3 w-3 mr-1" />
                Clear answers
              </Button>
            )}
          </div>

          {state.generatedAt && (
            <p className="text-[10px] text-slate-500">
              Prompts generated {new Date(state.generatedAt).toLocaleTimeString()} for the current prediction. Answers persist for this session.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
