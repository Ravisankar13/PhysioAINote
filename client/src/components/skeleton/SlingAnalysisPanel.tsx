import { useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, ChevronDown, ChevronRight,
  Gauge, GitBranch, Shield, Target, TrendingUp, Zap, Link2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  SlingAnalysisResult, SlingResult, SlingId, WeakLink,
  SlingCompensation, ForceReroute, SlingTreatmentTarget,
  SlingStatus, ForceTransferQuality, Severity
} from '@/lib/slingEngine';

interface SlingAnalysisPanelProps {
  analysis: SlingAnalysisResult | null;
  onSlingSelect?: (slingId: SlingId | null) => void;
  selectedSling?: SlingId | null;
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
}: {
  sling: SlingResult;
  isSelected: boolean;
  onSelect: () => void;
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
}: SlingAnalysisPanelProps) {
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
                Primary dysfunction: {analysis.slings.find(s => s.slingId === analysis.dominantDysfunction)?.label}
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
