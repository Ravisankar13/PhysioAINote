/**
 * Movement-Mode AI Simulator (Task #343)
 *
 * Clinician composes one-or-more interventions on the active patient
 * (strengthen / inhibit / lengthen / shorten muscle, restore / restrict
 * joint ROM, change sling activation, or free-text "other"). The panel
 * POSTs the composed plan + current biomechanical context to
 * `/api/movement-sim/predict` and renders the structured prediction:
 *
 *   - biomechanical changes
 *   - sling re-balancing
 *   - compensation shift
 *   - per-painful-tissue load + symptom direction (one row per recorded
 *     painful tissue — the spec requires "plantar fascia" to surface in
 *     the plantar fasciitis example even when the AI omits it)
 *   - net verdict banner (helpful / mixed / harmful / neutral)
 *   - confidence + caveats
 *
 * Targets are bounded to the engine-modelled MUSCLE_TARGETS / JOINT_TARGETS
 * (mirrored from `client/src/lib/whatIfSimulationEngine`) and the five
 * `SlingId`s. Results are cached server-side by deterministic input hash;
 * the cached flag is surfaced inline.
 *
 * This panel is mounted ONLY in Movement Mode and only when the left
 * sidebar is closed — lifecycle gating is handled by the parent.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  ArrowUp, ArrowDown, Equal,
} from 'lucide-react';
import { MUSCLE_TARGETS, JOINT_TARGETS } from '@/lib/whatIfSimulationEngine';

const SLING_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'posterior_oblique', label: 'Posterior Oblique' },
  { id: 'anterior_oblique', label: 'Anterior Oblique' },
  { id: 'lateral', label: 'Lateral' },
  { id: 'deep_longitudinal', label: 'Deep Longitudinal' },
  { id: 'scapular_shoulder', label: 'Scapular / Shoulder' },
];

type InterventionKind =
  | 'strengthen' | 'inhibit' | 'lengthen' | 'shorten'
  | 'restoreROM' | 'restrictROM' | 'changeSling' | 'other';

const KIND_OPTIONS: Array<{ id: InterventionKind; label: string; needs: 'muscle' | 'joint' | 'sling' | 'free' }> = [
  { id: 'strengthen',  label: 'Strengthen muscle',     needs: 'muscle' },
  { id: 'inhibit',     label: 'Inhibit / down-regulate muscle', needs: 'muscle' },
  { id: 'lengthen',    label: 'Lengthen muscle',       needs: 'muscle' },
  { id: 'shorten',     label: 'Shorten muscle',        needs: 'muscle' },
  { id: 'restoreROM',  label: 'Restore joint ROM',     needs: 'joint' },
  { id: 'restrictROM', label: 'Restrict joint ROM',    needs: 'joint' },
  { id: 'changeSling', label: 'Change sling activation', needs: 'sling' },
  { id: 'other',       label: 'Other (free text)',     needs: 'free' },
];

interface Intervention {
  uid: string;
  kind: InterventionKind;
  target?: string;
  magnitude?: number;
  unit?: string;
  slingId?: string;
  freeText?: string;
}

export interface MovementSimResult {
  biomechanicalChanges: string[];
  slingRebalancing: Array<{ slingId: string; directionPct: number; note: string }>;
  compensationShift: string[];
  tissueLoadImpact: Array<{
    tissue: string;
    loadDirection: 'up' | 'down' | 'neutral';
    magnitude: 'mild' | 'moderate' | 'large';
    symptomDirection: 'improve' | 'worsen' | 'neutral';
    mechanism: string;
  }>;
  netVerdict: 'helpful' | 'mixed' | 'harmful' | 'neutral';
  verdictRationale: string;
  confidence: 'low' | 'moderate' | 'high';
  confidenceReason: string;
  caveats: string[];
  hash: string;
  cached: boolean;
}

export interface MovementSimContext {
  condition: string;
  caseSummary: string;
  painfulTissues: Array<{ label: string; severity?: number; type?: string }>;
  postureDeviations: string[];
  slingActivations: Array<{ slingId: string; activation: number }>;
  hudForceSummary: string;
}

export interface MovementAiSimulatorPanelProps {
  context: MovementSimContext;
  onResult: (result: MovementSimResult, plan: Intervention[]) => void;
  className?: string;
}

function newId() { return `iv-${Date.now()}-${Math.floor(Math.random() * 1000)}`; }

function defaultMagnitudeFor(kind: InterventionKind): { magnitude: number; unit: string } | null {
  switch (kind) {
    case 'strengthen':
    case 'inhibit':
      return { magnitude: 20, unit: '%' };
    case 'lengthen':
    case 'shorten':
      return { magnitude: 10, unit: '°' };
    case 'restoreROM':
    case 'restrictROM':
      return { magnitude: 10, unit: '°' };
    case 'changeSling':
      return { magnitude: 15, unit: '%' };
    default:
      return null;
  }
}

const VERDICT_STYLES: Record<MovementSimResult['netVerdict'], { bg: string; border: string; text: string; Icon: typeof CheckCircle2 }> = {
  helpful:  { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-200', Icon: CheckCircle2 },
  mixed:    { bg: 'bg-amber-900/40',   border: 'border-amber-500/50',   text: 'text-amber-200',   Icon: AlertTriangle },
  harmful:  { bg: 'bg-rose-900/40',    border: 'border-rose-500/50',    text: 'text-rose-200',    Icon: XCircle },
  neutral:  { bg: 'bg-slate-800/60',   border: 'border-slate-600/50',   text: 'text-slate-200',   Icon: MinusCircle },
};

const LOAD_ICON: Record<MovementSimResult['tissueLoadImpact'][number]['loadDirection'], typeof ArrowUp> = {
  up: ArrowUp, down: ArrowDown, neutral: Equal,
};
const LOAD_TINT: Record<MovementSimResult['tissueLoadImpact'][number]['loadDirection'], string> = {
  up: 'text-rose-300', down: 'text-emerald-300', neutral: 'text-slate-300',
};
const SYMPTOM_TINT: Record<MovementSimResult['tissueLoadImpact'][number]['symptomDirection'], string> = {
  improve: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  worsen:  'bg-rose-500/20 text-rose-200 border-rose-400/40',
  neutral: 'bg-slate-700/40 text-slate-200 border-slate-500/40',
};

export default function MovementAiSimulatorPanel({ context, onResult, className = '' }: MovementAiSimulatorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([
    { uid: newId(), kind: 'strengthen', target: 'glute_l', magnitude: 20, unit: '%' },
  ]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MovementSimResult | null>(null);

  // Reset everything when the case (and therefore context.condition) changes.
  useEffect(() => {
    setInterventions([{ uid: newId(), kind: 'strengthen', target: 'glute_l', magnitude: 20, unit: '%' }]);
    setResult(null);
    setError(null);
  }, [context.condition]);

  const updateIntervention = useCallback((uid: string, patch: Partial<Intervention>) => {
    setInterventions(prev => prev.map(i => i.uid === uid ? { ...i, ...patch } : i));
  }, []);
  const removeIntervention = useCallback((uid: string) => {
    setInterventions(prev => prev.length <= 1 ? prev : prev.filter(i => i.uid !== uid));
  }, []);
  const addIntervention = useCallback(() => {
    setInterventions(prev => prev.length >= 6 ? prev : [
      ...prev,
      { uid: newId(), kind: 'strengthen', target: 'glute_l', magnitude: 20, unit: '%' },
    ]);
  }, []);
  const onKindChange = useCallback((uid: string, kind: InterventionKind) => {
    const meta = KIND_OPTIONS.find(k => k.id === kind)!;
    const defaults: Partial<Intervention> = { kind, target: undefined, slingId: undefined, freeText: undefined, magnitude: undefined, unit: undefined };
    if (meta.needs === 'muscle') {
      defaults.target = MUSCLE_TARGETS[0].id;
    } else if (meta.needs === 'joint') {
      defaults.target = JOINT_TARGETS[0].id;
    } else if (meta.needs === 'sling') {
      defaults.slingId = SLING_OPTIONS[0].id;
    }
    const m = defaultMagnitudeFor(kind);
    if (m) { defaults.magnitude = m.magnitude; defaults.unit = m.unit; }
    updateIntervention(uid, defaults);
  }, [updateIntervention]);

  const canRun = useMemo(() => {
    if (interventions.length === 0) return false;
    return interventions.every(i => {
      const meta = KIND_OPTIONS.find(k => k.id === i.kind);
      if (!meta) return false;
      if (meta.needs === 'muscle' || meta.needs === 'joint') return !!i.target;
      if (meta.needs === 'sling') return !!i.slingId;
      if (meta.needs === 'free') return !!(i.freeText && i.freeText.trim().length > 0);
      return true;
    });
  }, [interventions]);

  const runSim = useCallback(async () => {
    if (!canRun || running) return;
    setRunning(true);
    setError(null);
    try {
      const body = {
        condition: context.condition,
        caseSummary: context.caseSummary,
        painfulTissues: context.painfulTissues,
        postureDeviations: context.postureDeviations,
        slingActivations: context.slingActivations,
        hudForceSummary: context.hudForceSummary,
        interventions: interventions.map(i => {
          const out: Record<string, unknown> = { kind: i.kind };
          if (i.target) out.target = i.target;
          if (i.slingId) out.slingId = i.slingId;
          if (typeof i.magnitude === 'number') out.magnitude = i.magnitude;
          if (i.unit) out.unit = i.unit;
          if (i.freeText) out.freeText = i.freeText;
          return out;
        }),
      };
      const res = await fetch('/api/movement-sim/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Request failed (${res.status})`);
      }
      const data = await res.json() as MovementSimResult;
      setResult(data);
      onResult(data, interventions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to run prediction';
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [canRun, running, context, interventions, onResult]);

  const ChevIcon = collapsed ? ChevronDown : ChevronUp;

  return (
    <Card
      className={`bg-indigo-950/55 border-indigo-700/50 text-indigo-50 ${className}`}
      data-testid="movement-ai-simulator-panel"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(c => !c)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(c => !c); } }}
        className={`w-full flex items-center justify-between p-3 cursor-pointer select-none hover:bg-indigo-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors ${collapsed ? '' : 'border-b border-indigo-700/40'}`}
        aria-expanded={!collapsed}
        data-testid="movement-sim-toggle"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Movement AI Simulator</div>
          {result && (
            <span
              className={`text-[9px] uppercase tracking-wider rounded border px-1.5 py-0.5 ${VERDICT_STYLES[result.netVerdict].bg} ${VERDICT_STYLES[result.netVerdict].border} ${VERDICT_STYLES[result.netVerdict].text}`}
              data-testid="verdict-pill"
            >
              {result.netVerdict}
            </span>
          )}
        </div>
        <ChevIcon className="h-3.5 w-3.5 text-indigo-300" />
      </div>

      {!collapsed && (
        <ScrollArea className="max-h-[60vh]" data-testid="movement-sim-body">
          <div className="p-3 space-y-3">
            {/* Composer */}
            <div className="space-y-2">
              {interventions.map((iv, idx) => {
                const meta = KIND_OPTIONS.find(k => k.id === iv.kind)!;
                return (
                  <div
                    key={iv.uid}
                    className="rounded-md bg-indigo-900/40 border border-indigo-700/40 p-2 space-y-1.5"
                    data-testid={`intervention-row-${idx}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wide text-indigo-300/80 w-6">#{idx + 1}</span>
                      <Select value={iv.kind} onValueChange={(v) => onKindChange(iv.uid, v as InterventionKind)}>
                        <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-kind-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KIND_OPTIONS.map(k => (
                            <SelectItem key={k.id} value={k.id} className="text-[11px]">{k.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {interventions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIntervention(iv.uid)}
                          className="shrink-0 rounded p-1 text-indigo-300/70 hover:bg-indigo-800/60 hover:text-rose-200"
                          title="Remove intervention"
                          data-testid={`intervention-remove-${idx}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {meta.needs === 'muscle' && (
                      <div className="flex items-center gap-1.5">
                        <Select value={iv.target} onValueChange={(v) => updateIntervention(iv.uid, { target: v })}>
                          <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-target-${idx}`}>
                            <SelectValue placeholder="Muscle…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[260px]">
                            {MUSCLE_TARGETS.map(m => (
                              <SelectItem key={m.id} value={m.id} className="text-[11px]">{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={iv.magnitude ?? 0}
                          onChange={(e) => updateIntervention(iv.uid, { magnitude: Number(e.target.value) })}
                          className="h-7 text-[11px] w-16 bg-indigo-950/70 border-indigo-700/50"
                          data-testid={`intervention-magnitude-${idx}`}
                        />
                        <span className="text-[10px] text-indigo-300 w-3">{iv.unit}</span>
                      </div>
                    )}

                    {meta.needs === 'joint' && (
                      <div className="flex items-center gap-1.5">
                        <Select value={iv.target} onValueChange={(v) => updateIntervention(iv.uid, { target: v })}>
                          <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-target-${idx}`}>
                            <SelectValue placeholder="Joint…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[260px]">
                            {JOINT_TARGETS.map(j => (
                              <SelectItem key={j.id} value={j.id} className="text-[11px]">{j.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={iv.magnitude ?? 0}
                          onChange={(e) => updateIntervention(iv.uid, { magnitude: Number(e.target.value) })}
                          className="h-7 text-[11px] w-16 bg-indigo-950/70 border-indigo-700/50"
                          data-testid={`intervention-magnitude-${idx}`}
                        />
                        <span className="text-[10px] text-indigo-300 w-3">{iv.unit}</span>
                      </div>
                    )}

                    {meta.needs === 'sling' && (
                      <div className="flex items-center gap-1.5">
                        <Select value={iv.slingId} onValueChange={(v) => updateIntervention(iv.uid, { slingId: v })}>
                          <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-sling-${idx}`}>
                            <SelectValue placeholder="Sling…" />
                          </SelectTrigger>
                          <SelectContent>
                            {SLING_OPTIONS.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-[11px]">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={iv.magnitude ?? 0}
                          onChange={(e) => updateIntervention(iv.uid, { magnitude: Number(e.target.value) })}
                          className="h-7 text-[11px] w-16 bg-indigo-950/70 border-indigo-700/50"
                          data-testid={`intervention-magnitude-${idx}`}
                        />
                        <span className="text-[10px] text-indigo-300 w-3">{iv.unit}</span>
                      </div>
                    )}

                    {meta.needs === 'free' && (
                      <Textarea
                        value={iv.freeText ?? ''}
                        onChange={(e) => updateIntervention(iv.uid, { freeText: e.target.value })}
                        placeholder="e.g. Add 5° heel-lift bilaterally; reduce running cadence by 8%…"
                        className="min-h-[44px] text-[11px] bg-indigo-950/70 border-indigo-700/50"
                        data-testid={`intervention-freetext-${idx}`}
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={addIntervention}
                  disabled={interventions.length >= 6}
                  className="h-7 text-[11px] text-indigo-200 hover:bg-indigo-800/60"
                  data-testid="intervention-add"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add intervention
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={runSim}
                  disabled={!canRun || running}
                  className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white"
                  data-testid="intervention-run"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {running ? 'Predicting…' : 'Predict outcome'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded border border-rose-500/40 bg-rose-900/30 p-2 text-[11px] text-rose-200" data-testid="movement-sim-error">
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-2 pt-1 border-t border-indigo-700/40" data-testid="movement-sim-result">
                <VerdictBanner result={result} />

                <ResultSection title="Biomechanical changes" items={result.biomechanicalChanges} testId="bio-changes" />

                {result.slingRebalancing.length > 0 && (
                  <div data-testid="sling-rebalance">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">Sling re-balancing</div>
                    <div className="space-y-1">
                      {result.slingRebalancing.map((s, i) => (
                        <div key={i} className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1">
                          <span className="font-semibold text-indigo-100">{s.slingId.replace(/_/g, ' ')}</span>
                          <span className={`ml-1.5 ${s.directionPct >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {s.directionPct > 0 ? '+' : ''}{Math.round(s.directionPct)}%
                          </span>
                          {s.note && <div className="text-indigo-200/85 mt-0.5">{s.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ResultSection title="Compensation shift" items={result.compensationShift} testId="comp-shift" />

                {result.tissueLoadImpact.length > 0 && (
                  <div data-testid="tissue-impact">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">Tissue load &amp; symptoms</div>
                    <div className="space-y-1">
                      {result.tissueLoadImpact.map((t, i) => {
                        const LIcon = LOAD_ICON[t.loadDirection];
                        return (
                          <div
                            key={i}
                            className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1"
                            data-testid={`tissue-row-${i}`}
                            data-tissue={t.tissue}
                            data-load={t.loadDirection}
                            data-symptom={t.symptomDirection}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-indigo-100">{t.tissue}</span>
                              <span className={`inline-flex items-center gap-0.5 ${LOAD_TINT[t.loadDirection]}`}>
                                <LIcon className="h-3 w-3" />
                                <span className="text-[10px] uppercase tracking-wide">{t.magnitude}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span className={`text-[9px] uppercase tracking-wide rounded border px-1 py-0.5 ${SYMPTOM_TINT[t.symptomDirection]}`}>
                                {t.symptomDirection === 'improve' ? 'symptoms ↓' : t.symptomDirection === 'worsen' ? 'symptoms ↑' : 'symptoms ='}
                              </span>
                            </div>
                            {t.mechanism && <div className="text-indigo-200/85 mt-0.5">{t.mechanism}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-indigo-200/85 rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1.5">
                  <span className="uppercase tracking-wide text-indigo-300/80">Confidence:</span>{' '}
                  <span className="font-semibold text-indigo-100 capitalize">{result.confidence}</span>
                  {result.confidenceReason && <div className="mt-0.5">{result.confidenceReason}</div>}
                </div>

                {result.caveats.length > 0 && (
                  <ResultSection title="Caveats" items={result.caveats} testId="caveats" />
                )}

                {result.cached && (
                  <div className="text-[9px] text-indigo-300/70 italic text-right">
                    Cached prediction · same inputs as a previous run
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function VerdictBanner({ result }: { result: MovementSimResult }) {
  const v = VERDICT_STYLES[result.netVerdict];
  const Icon = v.Icon;
  return (
    <div
      className={`rounded border px-2 py-1.5 ${v.bg} ${v.border} ${v.text}`}
      data-testid="verdict-banner"
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{result.netVerdict}</span>
      </div>
      {result.verdictRationale && (
        <div className="text-[11px] mt-0.5 leading-snug">{result.verdictRationale}</div>
      )}
    </div>
  );
}

function ResultSection({ title, items, testId }: { title: string; items: string[]; testId: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1 text-indigo-100">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
