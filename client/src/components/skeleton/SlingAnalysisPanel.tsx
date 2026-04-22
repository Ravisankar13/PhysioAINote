import { useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, ChevronDown, ChevronRight,
  Eye, EyeOff, Gauge, GitBranch, RotateCcw, Shield, Stethoscope, Target, TrendingUp, Zap, Link2
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
}: SlingAnalysisPanelProps) {
  const hasModifiedActivations = useMemo(() => {
    if (!slingActivation) return false;
    return Object.values(slingActivation).some(
      v => v !== undefined && Math.round(v) !== SLING_ACTIVATION_BASELINE,
    );
  }, [slingActivation]);

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
      </div>
    </ScrollArea>
  );
}
