import { useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, ChevronDown, ChevronRight,
  Eye, EyeOff, Gauge, GitBranch, RotateCcw, Shield, Stethoscope, Target, TrendingUp, Zap, Link2,
  Brain, Sparkles, ListChecks
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  SlingAnalysisResult, SlingResult, SlingId, WeakLink,
  SlingCompensation, ForceReroute, SlingTreatmentTarget,
  SlingStatus, ForceTransferQuality, Severity, SlingActivationBand
} from '@/lib/slingEngine';
import {
  SLING_ACTIVATION_BASELINE,
  SLING_ACTIVATION_MIN,
  SLING_ACTIVATION_MAX,
} from '@/lib/slingEngine';
import {
  runDriverAnalysis,
  type DriverAnalysisPainMarker,
  type DriverAnalysisResult,
  type SlingHypothesis,
  type SlingDrivenRecommendation,
  type DriverModality,
  type DriverRole,
} from '@/lib/slingDriverAnalysis';
import SlingLoadFlowMap from './SlingLoadFlowMap';
import { AddToPlanButton, makeCartId, usePlanCart, type PlanCartItem, type PlanCartModality } from '@/lib/planCart';

interface SlingAnalysisPanelProps {
  analysis: SlingAnalysisResult | null;
  onSlingSelect?: (slingId: SlingId | null) => void;
  selectedSling?: SlingId | null;
  overlayVisible?: boolean;
  onToggleOverlay?: () => void;
  slingActivation?: Partial<Record<SlingId, number>>;
  onSlingActivationChange?: (slingId: SlingId, value: number) => void;
  onResetSling?: (slingId: SlingId) => void;
  onResetAllSlings?: () => void;
  /** Auto-placed pain markers from the 3D viewer. When non-empty the panel
   *  surfaces the reverse driver-analysis section (Task #235). */
  painMarkers?: DriverAnalysisPainMarker[];
  /** Optional precomputed driver analysis (lets PhysioGPT share the result
   *  with engine tabs). When omitted the panel computes its own. */
  driverAnalysis?: DriverAnalysisResult | null;
}

const DRIVER_MODALITY_TO_CART: Record<DriverModality, PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

const ROLE_LABEL: Record<DriverRole, string> = {
  'restore': 'Restore sling',
  'address-driver': 'Address driver',
  'calm-compensatory': 'Calm compensator',
};

const ROLE_COLOR: Record<DriverRole, string> = {
  'restore': 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  'address-driver': 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
  'calm-compensatory': 'bg-amber-500/20 text-amber-200 border-amber-500/40',
};

const CONFIDENCE_COLOR: Record<SlingHypothesis['confidence'], string> = {
  high: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  moderate: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  low: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
};

function recToCartItem(rec: SlingDrivenRecommendation): PlanCartItem {
  return {
    id: makeCartId(DRIVER_MODALITY_TO_CART[rec.modality], `sling_${rec.slingId}_${rec.name}`),
    modality: DRIVER_MODALITY_TO_CART[rec.modality],
    name: rec.name,
    targetStructure: rec.target,
    targetFinding: `Sling-driven · ${rec.slingLabel}`,
    dosage: rec.dosage,
    rationale: rec.rationale,
    slingTag: rec.slingLabel,
    slingRole: rec.role,
  };
}

function activationBandLabel(band: SlingActivationBand): string {
  switch (band) {
    case 'severe_under': return 'Severely underactive';
    case 'mild_under': return 'Underactive';
    case 'baseline': return 'Baseline';
    case 'mild_over': return 'Overactive';
    case 'severe_over': return 'Severely overactive';
  }
}

function activationBandColor(band: SlingActivationBand): string {
  switch (band) {
    case 'severe_under': return 'text-red-400';
    case 'mild_under': return 'text-amber-400';
    case 'baseline': return 'text-emerald-400';
    case 'mild_over': return 'text-amber-400';
    case 'severe_over': return 'text-red-400';
  }
}

function SlingActivationSlider({
  slingColor,
  value,
  band,
  onChange,
  onReset,
}: {
  slingColor: string;
  value: number;
  band: SlingActivationBand;
  onChange: (val: number) => void;
  onReset: () => void;
}) {
  const isModified = Math.round(value) !== SLING_ACTIVATION_BASELINE;
  return (
    <div
      className="mt-1.5 p-1.5 rounded border bg-slate-900/40"
      style={{ borderColor: slingColor + '40' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] text-slate-300 font-medium uppercase tracking-wide">Sling activation</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold tabular-nums ${activationBandColor(band)}`}>
            {Math.round(value)}%
          </span>
          {isModified && (
            <button
              onClick={onReset}
              className="flex items-center gap-0.5 text-[8px] text-slate-400 hover:text-white px-1 py-0.5 rounded hover:bg-slate-700/50"
              data-testid="sling-slider-reset"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={SLING_ACTIVATION_MIN}
        max={SLING_ACTIVATION_MAX}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: slingColor }}
        data-testid="sling-activation-slider"
      />
      <div className="flex justify-between mt-0.5 text-[7px] text-slate-500">
        <span>0%</span>
        <span className={activationBandColor(band)}>{activationBandLabel(band)}</span>
        <span>200%</span>
      </div>
    </div>
  );
}

function statusBadge(status: SlingStatus) {
  const config: Record<SlingStatus, { variant: 'destructive' | 'secondary' | 'outline' | 'default'; label: string }> = {
    normal: { variant: 'outline', label: 'Normal' },
    underperforming: { variant: 'destructive', label: 'Underperforming' },
    overloaded: { variant: 'secondary', label: 'Overloaded' },
    compensating: { variant: 'default', label: 'Compensating' },
  };
  const c = config[status];
  return <Badge variant={c.variant} className="text-[9px] px-1.5 py-0">{c.label}</Badge>;
}

function ftqColor(quality: ForceTransferQuality): string {
  return quality === 'good' ? 'text-green-400' : quality === 'reduced' ? 'text-amber-400' : 'text-red-400';
}

function severityColor(severity: Severity | 'none'): string {
  if (severity === 'none') return 'text-green-400';
  if (severity === 'severe') return 'text-red-400';
  if (severity === 'moderate') return 'text-amber-400';
  return 'text-yellow-300';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function interventionBadge(intervention: SlingTreatmentTarget['intervention']) {
  const colors: Record<string, string> = {
    strengthen: 'border-green-500/50 text-green-400',
    release: 'border-red-500/50 text-red-400',
    activate: 'border-cyan-500/50 text-cyan-400',
    stabilize: 'border-blue-500/50 text-blue-400',
  };
  return (
    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${colors[intervention] ?? ''}`}>
      {intervention}
    </Badge>
  );
}

function SlingCard({
  sling,
  isSelected,
  onSelect,
  activationValue,
  onActivationChange,
  onActivationReset,
}: {
  sling: SlingResult;
  isSelected: boolean;
  onSelect: () => void;
  activationValue: number;
  onActivationChange: (val: number) => void;
  onActivationReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-cyan-500/60 bg-slate-800/60'
          : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/50'
      }`}
    >
      <div className="p-2.5" onClick={onSelect}>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: sling.color }}
          />
          <span className="text-[11px] font-medium text-slate-200 flex-1 truncate">
            {sling.label}
          </span>
          {statusBadge(sling.status)}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-1.5">
          <div className="text-center">
            <div className="text-[9px] text-slate-500">Activation</div>
            <div className={`text-[11px] font-bold ${scoreColor(sling.activationScore)}`}>
              {sling.activationScore}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-500">Transfer</div>
            <div className={`text-[11px] font-bold ${ftqColor(sling.forceTransferQuality)}`}>
              {sling.forceTransferQuality}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-500">Risk</div>
            <div className={`text-[11px] font-bold ${severityColor(sling.downstreamRisk)}`}>
              {sling.downstreamRisk}
            </div>
            {sling.downstreamRiskArea && (
              <div className="text-[9px] text-slate-500 mt-0.5">{sling.downstreamRiskArea}</div>
            )}
          </div>
        </div>

        <Progress
          value={sling.activationScore}
          className="h-1"
        />

        {sling.confidence < 100 && (
          <div className="text-[9px] text-slate-600 mt-1">
            Confidence: {sling.confidence}%
          </div>
        )}

        <SlingActivationSlider
          slingColor={sling.color}
          value={activationValue}
          band={sling.activationBand}
          onChange={onActivationChange}
          onReset={onActivationReset}
        />

        {sling.clinicalConsequences.length > 0 && (
          <div
            className="mt-1.5 space-y-0.5"
            onClick={(e) => e.stopPropagation()}
            data-testid={`sling-consequences-${sling.slingId}`}
          >
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Stethoscope className="w-2.5 h-2.5" />
              Clinical consequences
            </div>
            <ul className="space-y-0.5">
              {sling.clinicalConsequences.map((c, i) => (
                <li
                  key={i}
                  className={`text-[9px] pl-2 border-l ${
                    sling.activationBand === 'baseline'
                      ? 'border-emerald-500/40 text-slate-400'
                      : sling.activationBand === 'mild_under' || sling.activationBand === 'mild_over'
                        ? 'border-amber-500/40 text-slate-300'
                        : 'border-red-500/50 text-slate-200'
                  }`}
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-2.5 pb-1">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 w-full"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? 'Hide details' : `Details (${sling.weakLinks.length} weak, ${sling.forceReroutes.length} reroutes)`}
        </button>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/30 pt-2">
          {sling.weakLinks.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Weak Links
              </div>
              {sling.weakLinks.map((wl, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300">{wl.muscle}</span>
                    <span className="text-[10px] text-red-400">{wl.activationPct}%</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{wl.reason}</div>
                </div>
              ))}
            </div>
          )}

          {sling.forceReroutes.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-amber-400 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Force Reroutes
              </div>
              {sling.forceReroutes.map((fr, i) => (
                <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-red-400">{fr.fromMuscle}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-amber-400">{fr.toMuscle}</span>
                    <span className="text-slate-500 ml-auto">+{fr.reroutePct}%</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{fr.clinical}</div>
                </div>
              ))}
            </div>
          )}

          {sling.compensations.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-cyan-400 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Cross-Sling Compensation
              </div>
              {sling.compensations.map((comp, i) => (
                <div key={i} className="bg-cyan-500/10 border border-cyan-500/20 rounded p-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300">{comp.compensatingSlingLabel}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                      comp.severity === 'severe' ? 'border-red-500/50 text-red-400' :
                      comp.severity === 'moderate' ? 'border-amber-500/50 text-amber-400' :
                      'border-blue-500/50 text-blue-400'
                    }`}>
                      {comp.severity}
                    </Badge>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{comp.mechanism}</div>
                </div>
              ))}
            </div>
          )}

          {sling.treatmentTargets.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-green-400 flex items-center gap-1">
                <Target className="w-3 h-3" /> Treatment Targets
              </div>
              {sling.treatmentTargets.map((tt, i) => (
                <div key={i} className="flex items-center gap-1.5 py-0.5">
                  {interventionBadge(tt.intervention)}
                  <span className="text-[10px] text-slate-300 flex-1 truncate">{tt.muscle}</span>
                  <span className="text-[9px] text-slate-600">P{tt.priority}</span>
                </div>
              ))}
            </div>
          )}

          {sling.commonDysfunctions && sling.commonDysfunctions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-purple-400 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Common Dysfunctions
              </div>
              {sling.commonDysfunctions.slice(0, 3).map((cd, i) => (
                <div key={i} className="text-[9px] text-slate-500 pl-3 border-l border-purple-500/20">
                  {cd}
                </div>
              ))}
            </div>
          )}

          {sling.assessmentTests && sling.assessmentTests.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-blue-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Assessment Tests
              </div>
              <div className="flex flex-wrap gap-1">
                {sling.assessmentTests.map((test, i) => (
                  <Badge key={i} variant="outline" className="text-[8px] px-1.5 py-0 border-blue-500/30 text-blue-400">
                    {test}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="text-[9px] text-slate-500 italic pt-1 border-t border-slate-700/20">
            {sling.narrative}
          </div>
        </div>
      )}
    </div>
  );
}

function DriverAnalysisSection({ result }: { result: DriverAnalysisResult }) {
  const [expanded, setExpanded] = useState(true);
  if (!result.hasMarkers) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700/50 bg-slate-900/30 p-2.5 text-[10px] text-slate-500" data-testid="sling-driver-empty">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-300 font-medium">Driver Analysis</span>
        </div>
        {result.fallbackNote ?? 'Place pain markers on the 3D skeleton to surface culpable-sling hypotheses.'}
      </div>
    );
  }

  if (result.hypotheses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] text-amber-200/80" data-testid="sling-driver-empty">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[11px] text-amber-200 font-medium">Driver Analysis</span>
        </div>
        {result.fallbackNote ?? 'No sling matched the marker pattern.'}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 to-cyan-950/30 p-2.5 space-y-2" data-testid="sling-driver-section">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-1.5 text-left"
      >
        <Brain className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
        <span className="text-[11px] text-cyan-100 font-semibold flex-1">
          Driver Analysis · {result.markerCount} marker{result.markerCount === 1 ? '' : 's'}
        </span>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
          {result.hypotheses.length} hypothes{result.hypotheses.length === 1 ? 'is' : 'es'}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3 text-cyan-300" /> : <ChevronRight className="w-3 h-3 text-cyan-300" />}
      </button>
      {expanded && (
        <div className="space-y-2">
          {result.predictionQuality.note && (
            <div
              className={`rounded border px-2 py-1 text-[9px] leading-snug ${
                result.predictionQuality.band === 'high'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                  : result.predictionQuality.band === 'moderate'
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
                  : 'border-rose-500/30 bg-rose-500/5 text-rose-200'
              }`}
              data-testid={`sling-prediction-quality-${result.predictionQuality.band}`}
            >
              <span className="font-semibold uppercase tracking-wide mr-1">
                Prediction · {result.predictionQuality.band}
              </span>
              {result.predictionQuality.note}
            </div>
          )}
          {result.hypotheses.slice(0, 3).map((h, idx) => (
            <div
              key={h.slingId}
              className={`rounded border p-2 ${idx === 0 ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-slate-700/40 bg-slate-900/40'}`}
              data-testid={`sling-hypothesis-${h.slingId}`}
            >
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                <span className="text-[10px] font-semibold text-slate-100 flex-1 truncate">
                  {idx === 0 ? '★ ' : `#${idx + 1} `}{h.slingLabel}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_COLOR[h.confidence]}`}>
                  {h.confidence}
                </span>
                <span className="text-[8px] text-slate-400 tabular-nums">score {h.score}</span>
              </div>
              <div className="text-[9px] text-slate-300 mb-1">{h.rationale}</div>
              <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                <div className="rounded bg-slate-800/50 border border-slate-700/30 p-1.5">
                  <div className="text-emerald-300 mb-0.5 font-medium">Intended</div>
                  <div className="text-slate-300 leading-snug">{h.intendedRole}</div>
                </div>
                <div className="rounded bg-slate-800/50 border border-slate-700/30 p-1.5">
                  <div className="text-red-300 mb-0.5 font-medium">Actual</div>
                  <div className="text-slate-300 leading-snug">{h.actualPattern}</div>
                </div>
              </div>
              {h.supportingMarkers.length > 0 && (
                <div className="mt-1 flex items-start gap-1 text-[9px]">
                  <Target className="w-2.5 h-2.5 text-amber-300 mt-0.5 shrink-0" />
                  <div className="text-slate-400">
                    Supporting markers:{' '}
                    {h.supportingMarkers.slice(0, 4).map((m, i) => (
                      <span key={m.id}>
                        <span className="text-slate-200">{m.label}</span>
                        {i < Math.min(3, h.supportingMarkers.length - 1) ? ', ' : ''}
                      </span>
                    ))}
                    {h.supportingMarkers.length > 4 && <span> +{h.supportingMarkers.length - 4} more</span>}
                  </div>
                </div>
              )}
              {h.differentiationTests.length > 0 && (
                <div className="mt-1 flex items-start gap-1 text-[9px]">
                  <Shield className="w-2.5 h-2.5 text-blue-300 mt-0.5 shrink-0" />
                  <div className="text-slate-400">
                    Differentiate with:{' '}
                    {h.differentiationTests.slice(0, 3).map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[8px] px-1 py-0 mr-1 border-blue-500/30 text-blue-200">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanFromAnalysisSection({ recommendations }: { recommendations: SlingDrivenRecommendation[] }) {
  const [open, setOpen] = useState(false);
  const { add, has } = usePlanCart();

  // Group by sling THEN by role. Per-group "Add all" performs a batched
  // drop into the Plan Cart so the clinician can adopt a whole sub-plan
  // (e.g. "all restore items for the posterior oblique") in one click.
  // Recommendations are session-scoped and de-duplicated by id inside add().
  const groupedBySling = useMemo(() => {
    const slingMap = new Map<
      SlingId,
      {
        label: string;
        color: string;
        roles: Map<DriverRole, SlingDrivenRecommendation[]>;
      }
    >();
    for (const r of recommendations) {
      if (!slingMap.has(r.slingId)) {
        slingMap.set(r.slingId, {
          label: r.slingLabel,
          color: r.slingColor,
          roles: new Map(),
        });
      }
      const slingEntry = slingMap.get(r.slingId)!;
      if (!slingEntry.roles.has(r.role)) slingEntry.roles.set(r.role, []);
      slingEntry.roles.get(r.role)!.push(r);
    }
    return Array.from(slingMap.entries()).map(([sid, s]) => ({
      slingId: sid,
      label: s.label,
      color: s.color,
      roleGroups: Array.from(s.roles.entries()).sort((a, b) => {
        const order: DriverRole[] = ['address-driver', 'restore', 'calm-compensatory'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      }),
    }));
  }, [recommendations]);

  if (recommendations.length === 0) return null;

  const addAllInGroup = (items: SlingDrivenRecommendation[]) => {
    for (const rec of items) {
      const cartItem = recToCartItem(rec);
      if (!has(cartItem.id)) add(cartItem);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 overflow-hidden" data-testid="sling-plan-from-analysis">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 p-2.5 text-left hover:bg-emerald-500/10 transition-colors"
      >
        <ListChecks className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
        <span className="text-[11px] font-semibold text-emerald-100 flex-1">
          Plan from this analysis
        </span>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
          {recommendations.length} item{recommendations.length === 1 ? '' : 's'}
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-emerald-300" /> : <ChevronRight className="w-3 h-3 text-emerald-300" />}
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-2 border-t border-emerald-500/20">
          <div className="text-[9px] text-emerald-200/80 italic">
            One-click drop into the Plan Cart — items are tagged with the driving sling and role.
          </div>
          {groupedBySling.map(g => (
            <div
              key={g.slingId}
              className="rounded border border-slate-700/40 bg-slate-900/40 p-1.5"
              data-testid={`sling-plan-group-${g.slingId}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <span className="text-[10px] font-medium text-slate-200">{g.label}</span>
              </div>
              <div className="space-y-1.5">
                {g.roleGroups.map(([role, items]) => {
                  const allInPlan = items.every(rec => has(recToCartItem(rec).id));
                  return (
                    <div
                      key={role}
                      className="rounded-sm border border-slate-700/30 bg-slate-900/30 p-1"
                      data-testid={`sling-plan-role-${g.slingId}-${role}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[8px] px-1 py-0 rounded-full border ${ROLE_COLOR[role]}`}>
                          {ROLE_LABEL[role]}
                        </span>
                        <span className="text-[8px] text-slate-500">
                          {items.length} item{items.length === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => addAllInGroup(items)}
                          disabled={allInPlan}
                          className={`ml-auto text-[8px] px-1.5 py-0.5 rounded border transition-colors ${
                            allInPlan
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300/60 cursor-default'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          }`}
                          data-testid={`sling-plan-add-all-${g.slingId}-${role}`}
                        >
                          {allInPlan ? 'All added' : `Add all ${items.length}`}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {items.map(rec => (
                          <div key={rec.id} className="flex items-start gap-1.5 p-1 rounded hover:bg-slate-800/40">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-300 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-slate-100">{rec.name}</span>
                                <span className="text-[8px] text-slate-500 capitalize">· {rec.modality.replace('_', ' ')}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 leading-snug">{rec.rationale}</div>
                              {rec.dosage && (
                                <div className="text-[8px] text-slate-500 mt-0.5">Dosage: {rec.dosage}</div>
                              )}
                            </div>
                            <AddToPlanButton size="xs" item={recToCartItem(rec)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SlingAnalysisPanel({
  analysis,
  onSlingSelect,
  selectedSling,
  overlayVisible = true,
  onToggleOverlay,
  slingActivation,
  onSlingActivationChange,
  onResetSling,
  onResetAllSlings,
  painMarkers,
  driverAnalysis,
}: SlingAnalysisPanelProps) {
  const hasModifiedActivations = useMemo(() => {
    if (!slingActivation) return false;
    return Object.values(slingActivation).some(
      v => v !== undefined && Math.round(v) !== SLING_ACTIVATION_BASELINE,
    );
  }, [slingActivation]);

  // Reverse-reasoning driver analysis. Use the precomputed result when the
  // host page passes one (so engine tabs read the same payload), otherwise
  // compute locally from the markers + forward analysis.
  const computedDriverAnalysis = useMemo(() => {
    if (driverAnalysis !== undefined && driverAnalysis !== null) return driverAnalysis;
    return runDriverAnalysis(painMarkers, analysis);
  }, [driverAnalysis, painMarkers, analysis]);

  if (!analysis) {
    return (
      <div className="p-4 text-center text-[11px] text-slate-500">
        No sling analysis available. Adjust the skeleton to generate biomechanical data.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          {onToggleOverlay ? (
            <>
              <span className="text-[10px] text-slate-500">3D Sling Overlay</span>
              <button
                onClick={onToggleOverlay}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                  overlayVisible
                    ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                    : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/70'
                }`}
              >
                {overlayVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {overlayVisible ? 'Visible' : 'Hidden'}
              </button>
            </>
          ) : <span />}
          {onResetAllSlings && hasModifiedActivations && (
            <button
              onClick={onResetAllSlings}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              data-testid="sling-reset-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all activations
            </button>
          )}
        </div>

        <DriverAnalysisSection result={computedDriverAnalysis} />
        {computedDriverAnalysis.topFlowGraph && (
          <SlingLoadFlowMap graph={computedDriverAnalysis.topFlowGraph} />
        )}

        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Gauge className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] text-slate-400">System Force Transfer</span>
            <span className={`text-sm font-bold ml-auto ${scoreColor(analysis.overallForceTransferScore)}`}>
              {analysis.overallForceTransferScore}/100
            </span>
          </div>
          <Progress value={analysis.overallForceTransferScore} className="h-1.5 mb-1.5" />
          <div className="text-[10px] text-slate-500">{analysis.systemSummary}</div>
          {analysis.dominantDysfunction && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400">
                Primary: {analysis.slings.find(s => s.slingId === analysis.dominantDysfunction)?.label}
              </span>
            </div>
          )}
          {analysis.secondaryIssue && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400">
                Secondary: {analysis.secondaryIssue.summary}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {analysis.slings.map(sling => (
            <SlingCard
              key={sling.slingId}
              sling={sling}
              isSelected={selectedSling === sling.slingId}
              onSelect={() => onSlingSelect?.(selectedSling === sling.slingId ? null : sling.slingId)}
              activationValue={slingActivation?.[sling.slingId] ?? sling.activationLevelPct ?? SLING_ACTIVATION_BASELINE}
              onActivationChange={(val) => onSlingActivationChange?.(sling.slingId, val)}
              onActivationReset={() => onResetSling?.(sling.slingId)}
            />
          ))}
        </div>

        {analysis.crossSlingCompensations.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 space-y-1.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> System-Level Compensations ({analysis.crossSlingCompensations.length})
            </div>
            {analysis.crossSlingCompensations.map((comp, i) => (
              <div key={i} className="text-[10px] text-slate-500 flex items-start gap-1">
                <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span>{comp.clinical}</span>
              </div>
            ))}
          </div>
        )}

        <PlanFromAnalysisSection recommendations={computedDriverAnalysis.recommendations} />
      </div>
    </ScrollArea>
  );
}
