import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Target,
  AlertTriangle,
  Activity,
  Crosshair,
  Link2,
} from "lucide-react";
import type { ForceAnalysisResult } from "@/lib/posturalForceEngine";
import type { PathologyCompensationResult } from "@/lib/pathologyCompensationEngine";
import type { CrossSystemCorrelationResult } from "@/lib/crossSystemCorrelation";
import type { MuscleOverride } from "@/lib/muscleBiomechanicsEngine";
import {
  analyzeInjuryMechanism,
  type InjuryMechanismResult,
  type CausalChainStep,
  type LoadRedistribution,
  type COMShiftData,
  type CompensationCard,
  type KineticChainDysfunction,
} from "@/lib/injuryMechanismEngine";

interface InjuryMechanismPanelProps {
  forceAnalysis: ForceAnalysisResult | null;
  compensatedOverrides: Record<string, Partial<MuscleOverride>>;
  pathologyCompensation: PathologyCompensationResult | null;
  correlationResult: CrossSystemCorrelationResult | null;
  bodyWeightKg: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  moderate: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  severe: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const CATEGORY_COLORS: Record<string, string> = {
  root_cause: 'border-red-500 bg-red-500/15',
  intermediate: 'border-amber-500 bg-amber-500/15',
  symptom: 'border-blue-500 bg-blue-500/15',
};

const CATEGORY_LABELS: Record<string, string> = {
  root_cause: 'Root Cause',
  intermediate: 'Mechanism',
  symptom: 'Symptom',
};

const LOAD_STATUS_COLORS: Record<string, string> = {
  decreased: 'text-blue-400',
  normal: 'text-gray-400',
  increased: 'text-orange-400',
  overloaded: 'text-red-400',
};

function CausalChainFlow({ chain }: { chain: CausalChainStep[] }) {
  return (
    <div className="space-y-1">
      {chain.map((step, i) => (
        <div key={i}>
          <div className={`rounded border-l-2 px-2 py-1.5 ${CATEGORY_COLORS[step.category]}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                {CATEGORY_LABELS[step.category]}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${SEVERITY_COLORS[step.severity]}`}>
                {step.severity}
              </Badge>
            </div>
            <div className="text-xs font-medium text-gray-100">{step.structure}</div>
            <div className="text-[11px] text-gray-400">{step.finding}</div>
            <div className="text-[10px] text-gray-500 italic mt-0.5">{step.mechanism}</div>
          </div>
          {i < chain.length - 1 && (
            <div className="flex justify-center py-0.5">
              <ArrowRight className="w-3 h-3 text-gray-600 rotate-90" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadBar({ item }: { item: LoadRedistribution }) {
  const maxPct = 100;
  const barWidth = Math.min(Math.abs(item.changePct), maxPct);
  const isPositive = item.changePct >= 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-gray-300" title={item.joint}>{item.joint}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-full bg-gray-600" />
        </div>
        {isPositive ? (
          <div
            className="absolute left-1/2 h-full bg-orange-500/70 rounded-r-full"
            style={{ width: `${barWidth / 2}%` }}
          />
        ) : (
          <div
            className="absolute right-1/2 h-full bg-blue-500/70 rounded-l-full"
            style={{ width: `${barWidth / 2}%` }}
          />
        )}
      </div>
      <span className={`w-14 text-right font-mono text-[11px] ${LOAD_STATUS_COLORS[item.status]}`}>
        {item.changePct > 0 ? '+' : ''}{item.changePct}%
      </span>
    </div>
  );
}

function COMDiagram({ data }: { data: COMShiftData }) {
  const cx = 40 + Math.max(-30, Math.min(30, data.x * 5));
  const cy = 40 + Math.max(-30, Math.min(30, data.y * 5));

  return (
    <div className="flex items-start gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
        <ellipse cx="40" cy="55" rx="18" ry="6" fill="none" stroke="#374151" strokeWidth="1" strokeDasharray="3,2" />
        <ellipse cx="40" cy="25" rx="10" ry="8" fill="none" stroke="#374151" strokeWidth="1" />
        <line x1="40" y1="33" x2="40" y2="48" stroke="#374151" strokeWidth="1" />
        <line x1="30" y1="38" x2="50" y2="38" stroke="#374151" strokeWidth="1" />
        <line x1="35" y1="52" x2="32" y2="70" stroke="#374151" strokeWidth="1" />
        <line x1="45" y1="52" x2="48" y2="70" stroke="#374151" strokeWidth="1" />
        <circle cx="40" cy="40" r="2" fill="#4B5563" />
        <circle cx={cx} cy={cy} r="3" fill="#ef4444" />
        <line x1="40" y1="40" x2={cx} y2={cy} stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 mb-1">
          Shift: <span className="font-medium text-white">{data.magnitude}mm {data.direction}</span>
        </div>
        <div className="text-[10px] text-gray-500">{data.clinicalMeaning}</div>
      </div>
    </div>
  );
}

export default function InjuryMechanismPanel({
  forceAnalysis,
  compensatedOverrides,
  pathologyCompensation,
  correlationResult,
  bodyWeightKg,
}: InjuryMechanismPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    causal: true,
    load: false,
    com: false,
    compensation: false,
    kinetic: false,
  });
  const [copied, setCopied] = useState(false);
  const [selectedChainIdx, setSelectedChainIdx] = useState(0);
  const [engineError, setEngineError] = useState<string | null>(null);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const analysisComputed = useMemo((): { result: InjuryMechanismResult | null; error: string | null } => {
    try {
      return {
        result: analyzeInjuryMechanism({
          forceAnalysis,
          pathologyCompensation,
          correlationResult,
          compensatedOverrides,
          bodyWeightKg,
        }),
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[InjuryMechanism] Engine error:', msg);
      return { result: null, error: msg };
    }
  }, [forceAnalysis, pathologyCompensation, correlationResult, compensatedOverrides, bodyWeightKg]);

  const analysis = analysisComputed.result;

  useEffect(() => {
    setEngineError(analysisComputed.error);
  }, [analysisComputed.error]);

  useEffect(() => {
    if (analysis && selectedChainIdx >= analysis.causalChains.length) {
      setSelectedChainIdx(0);
    }
  }, [analysis, selectedChainIdx]);

  const exportSummary = useCallback(() => {
    if (!analysis) return;
    const lines: string[] = [];
    lines.push('═══ INJURY MECHANISM ANALYSIS ═══');
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(analysis.overallMechanismSummary);
    lines.push('');

    if (analysis.topContributors.length > 0) {
      lines.push('── TOP CONTRIBUTORS ──');
      analysis.topContributors.forEach(c => lines.push(`  • ${c}`));
      lines.push('');
    }

    if (analysis.causalChains.length > 0) {
      lines.push('── CAUSAL CHAINS ──');
      analysis.causalChains.forEach((chain, ci) => {
        lines.push(`  Chain ${ci + 1}:`);
        chain.forEach(step => {
          lines.push(`    ${step.step}. [${step.category}] ${step.structure}: ${step.finding}`);
          lines.push(`       ${step.mechanism}`);
        });
      });
      lines.push('');
    }

    if (analysis.loadRedistribution.length > 0) {
      lines.push('── LOAD REDISTRIBUTION ──');
      analysis.loadRedistribution.forEach(l => {
        lines.push(`  ${l.joint}: ${l.changePct > 0 ? '+' : ''}${l.changePct}% (${l.status})`);
      });
      lines.push('');
    }

    if (analysis.comShift) {
      lines.push('── COM SHIFT ──');
      lines.push(`  ${analysis.comShift.magnitude}mm ${analysis.comShift.direction}`);
      lines.push(`  ${analysis.comShift.clinicalMeaning}`);
      lines.push('');
    }

    if (analysis.compensationCards.length > 0) {
      lines.push('── COMPENSATION PATTERNS ──');
      analysis.compensationCards.forEach(c => {
        lines.push(`  ${c.title} (${c.severity})`);
        lines.push(`    Dysfunction: ${c.primaryDysfunction}`);
        lines.push(`    Significance: ${c.clinicalSignificance}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [analysis]);

  const hasData = analysis && (
    analysis.causalChains.length > 0 ||
    analysis.loadRedistribution.length > 0 ||
    analysis.compensationCards.length > 0 ||
    analysis.comShift
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Injury Mechanism</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
          onClick={exportSummary}
          disabled={!analysis}
        >
          {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Export'}
        </Button>
      </div>

      {engineError && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Engine error: {engineError}</span>
        </div>
      )}

      {analysis && (
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-2.5">
          <span className="text-[11px] text-gray-400">{analysis.overallMechanismSummary}</span>
          {analysis.topContributors.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {analysis.topContributors.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-gray-300">{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasData && !engineError && (
        <div className="text-xs text-gray-500 px-2 py-3 text-center">
          Add pain markers, set pathologies, or adjust posture to see injury mechanism analysis.
        </div>
      )}

      {analysis && analysis.causalChains.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />
          <Collapsible open={expandedSections.causal} onOpenChange={() => toggleSection('causal')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-medium text-gray-200">
                  Causal Chains ({analysis.causalChains.length})
                </span>
              </div>
              {expandedSections.causal ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {analysis.causalChains.length > 1 && (
                <div className="flex gap-1 px-1 mb-2 flex-wrap">
                  {analysis.causalChains.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedChainIdx(i)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        selectedChainIdx === i
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      Chain {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <div className="px-1">
                <CausalChainFlow chain={analysis.causalChains[selectedChainIdx] || []} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {analysis && analysis.loadRedistribution.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />
          <Collapsible open={expandedSections.load} onOpenChange={() => toggleSection('load')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-medium text-gray-200">Load Redistribution</span>
              </div>
              {expandedSections.load ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1.5 mt-1 px-1">
                {analysis.loadRedistribution.map((item, i) => (
                  <LoadBar key={i} item={item} />
                ))}
                <div className="flex items-center justify-center gap-4 text-[9px] text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70" /> Decreased</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500/70" /> Increased</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {analysis && analysis.comShift && (
        <>
          <Separator className="bg-gray-700/50" />
          <Collapsible open={expandedSections.com} onOpenChange={() => toggleSection('com')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-gray-200">COM Shift</span>
              </div>
              {expandedSections.com ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 px-1">
                <COMDiagram data={analysis.comShift} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {analysis && analysis.compensationCards.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />
          <Collapsible open={expandedSections.compensation} onOpenChange={() => toggleSection('compensation')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-medium text-gray-200">
                  Compensation Patterns ({analysis.compensationCards.length})
                </span>
              </div>
              {expandedSections.compensation ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-1 px-1">
                {analysis.compensationCards.map(card => (
                  <div key={card.id} className={`rounded border p-2 ${SEVERITY_COLORS[card.severity]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{card.title}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${SEVERITY_COLORS[card.severity]}`}>
                        {card.severity}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-gray-300 mb-1">{card.primaryDysfunction}</div>
                    {card.compensatingStructures.length > 0 && (
                      <div className="text-[10px] text-gray-500">
                        Compensators: {card.compensatingStructures.join(', ')}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-0.5 italic">{card.clinicalSignificance}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {analysis && analysis.kineticChainDysfunctions.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />
          <Collapsible open={expandedSections.kinetic} onOpenChange={() => toggleSection('kinetic')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-gray-200">
                  Kinetic Chain Dysfunctions ({analysis.kineticChainDysfunctions.length})
                </span>
              </div>
              {expandedSections.kinetic ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1.5 mt-1 px-1">
                {analysis.kineticChainDysfunctions.map((kc, i) => (
                  <div key={i} className="rounded border border-gray-700/50 bg-gray-800/30 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: kc.chainColor }} />
                      <span className="text-[10px] font-medium text-gray-400">{kc.chainLabel}</span>
                    </div>
                    <div className="text-[11px] text-gray-200">{kc.dysfunction}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
