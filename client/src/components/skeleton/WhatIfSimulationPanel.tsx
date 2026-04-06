import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  FlaskConical,
  Plus,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Zap,
  Dumbbell,
  StretchHorizontal,
  Move,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  GitCompareArrows,
  Timer,
  Link2,
} from "lucide-react";
import {
  type WhatIfScenario,
  type WhatIfComparisonResult,
  type InterventionType,
  type DecisionEngineIntervention,
  type SlingDelta,
  type TimelinePoint,
  PRESET_SCENARIOS,
  MUSCLE_TARGETS,
  JOINT_TARGETS,
  generateScenariosFromDecisionEngine,
} from "@/lib/whatIfSimulationEngine";

interface WhatIfSimulationPanelProps {
  comparison: WhatIfComparisonResult | null;
  activeScenarios: WhatIfScenario[];
  onAddScenario: (scenario: WhatIfScenario) => void;
  onRemoveScenario: (id: string) => void;
  onClearAll: () => void;
  onApplyToSkeleton: () => void;
  treatmentDecisionData?: { primary: DecisionEngineIntervention[]; adjunct: DecisionEngineIntervention[] } | null;
  comparisonB?: WhatIfComparisonResult | null;
  onSetComparisonB?: (scenarios: WhatIfScenario[]) => void;
  painMarkers?: Array<{ id: string; label: string; severity?: number }>;
}

const INTERVENTION_ICONS: Record<InterventionType, typeof Dumbbell> = {
  strengthen: Dumbbell,
  stretch: StretchHorizontal,
  mobilize: Move,
  offload: Minus,
};

const INTERVENTION_COLORS: Record<InterventionType, string> = {
  strengthen: 'bg-green-500/20 text-green-400 border-green-500/30',
  stretch: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  mobilize: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  offload: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

let nextCustomId = 0;

export default function WhatIfSimulationPanel({
  comparison,
  activeScenarios,
  onAddScenario,
  onRemoveScenario,
  onClearAll,
  onApplyToSkeleton,
  treatmentDecisionData,
  comparisonB,
  onSetComparisonB,
  painMarkers,
}: WhatIfSimulationPanelProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customTarget, setCustomTarget] = useState(MUSCLE_TARGETS[0].id);
  const [customTargetType, setCustomTargetType] = useState<'muscle' | 'joint'>('muscle');
  const [customIntervention, setCustomIntervention] = useState<InterventionType>('strengthen');
  const [customMagnitude, setCustomMagnitude] = useState(20);
  const [showForceDetails, setShowForceDetails] = useState(false);
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [showMuscleDetails, setShowMuscleDetails] = useState(false);
  const [showSlingDetails, setShowSlingDetails] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState(12);

  const activeIds = useMemo(() => new Set(activeScenarios.map(s => s.id)), [activeScenarios]);

  const recommendedScenarios = useMemo(() => {
    if (!treatmentDecisionData) return [];
    const allInterventions = [
      ...treatmentDecisionData.primary.map(i => ({ ...i, tier: 'primary' })),
      ...treatmentDecisionData.adjunct.map(i => ({ ...i, tier: 'adjunct' })),
    ];
    return generateScenariosFromDecisionEngine(allInterventions);
  }, [treatmentDecisionData]);

  const handleAddCustom = useCallback(() => {
    const targets = customTargetType === 'muscle' ? MUSCLE_TARGETS : JOINT_TARGETS;
    const targetInfo = targets.find(t => t.id === customTarget);
    if (!targetInfo) return;
    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6'];
    const scenario: WhatIfScenario = {
      id: `custom_${++nextCustomId}`,
      label: `${targetInfo.label} ${customIntervention === 'strengthen' ? '+' : ''}${customMagnitude}${customIntervention === 'mobilize' ? '°' : '%'}`,
      description: `${customIntervention} ${targetInfo.label} by ${customMagnitude}${customIntervention === 'mobilize' ? '°' : '%'}`,
      interventionType: customIntervention,
      target: customTarget,
      targetType: customTargetType,
      magnitude: customMagnitude,
      unit: customIntervention === 'mobilize' ? '°' : '%',
      color: colors[nextCustomId % colors.length],
    };
    onAddScenario(scenario);
    setShowCustom(false);
  }, [customTarget, customTargetType, customIntervention, customMagnitude, onAddScenario]);

  const riskColor = (level: string) => {
    if (level === 'critical') return 'text-red-400';
    if (level === 'high') return 'text-orange-400';
    if (level === 'moderate') return 'text-yellow-400';
    if (level === 'low') return 'text-blue-400';
    return 'text-green-400';
  };

  const riskBarColor = (level: string) => {
    if (level === 'critical') return 'bg-red-500';
    if (level === 'high') return 'bg-orange-500';
    if (level === 'moderate') return 'bg-yellow-500';
    if (level === 'low') return 'bg-blue-500';
    return 'bg-green-500';
  };

  const transferColor = (quality: string) => {
    if (quality === 'good') return 'text-green-400';
    if (quality === 'reduced') return 'text-yellow-400';
    return 'text-red-400';
  };

  const timelinePoint = useMemo(() => {
    if (!comparison?.timeline) return null;
    return comparison.timeline.find(t => t.week === timelineWeek) || null;
  }, [comparison, timelineWeek]);

  return (
    <div className="space-y-2">
      {recommendedScenarios.length > 0 && (
        <>
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className="flex items-center justify-between w-full text-[10px] text-amber-300 hover:text-amber-200 mb-1"
          >
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span className="font-semibold">Recommended ({recommendedScenarios.length})</span>
            </div>
            {showRecommended ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showRecommended && (
            <div className="space-y-1 mb-2">
              {recommendedScenarios.map(scenario => {
                const isActive = activeIds.has(scenario.id);
                const Icon = INTERVENTION_ICONS[scenario.interventionType];
                return (
                  <button
                    key={scenario.id}
                    onClick={() => isActive ? onRemoveScenario(scenario.id) : onAddScenario(scenario)}
                    className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-[9px] leading-tight transition-all ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                        : 'border-gray-600/40 bg-gray-800/40 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                    }`}
                    title={scenario.description}
                  >
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    <span className="text-left truncate flex-1">{scenario.label}</span>
                    <Badge variant="outline" className={`text-[7px] px-0.5 py-0 ${
                      scenario.description?.includes('Grade A') || scenario.description?.includes(', A)') ? 'border-green-500/40 text-green-400'
                      : scenario.description?.includes('Grade B') || scenario.description?.includes(', B)') ? 'border-blue-500/40 text-blue-400'
                      : 'border-amber-500/30 text-amber-400'
                    }`}>
                      {scenario.description?.match(/,\s*(A|B|C|Expert)\)/)?.[1] || 'DE'}
                    </Badge>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  for (const s of recommendedScenarios) {
                    if (!activeIds.has(s.id)) onAddScenario(s);
                  }
                }}
                className="w-full text-[9px] py-0.5 text-amber-400/70 hover:text-amber-300 transition-colors"
              >
                Add All Recommended
              </button>
            </div>
          )}
          <Separator className="bg-gray-700/50" />
        </>
      )}

      <div className="grid grid-cols-4 gap-1">
        {PRESET_SCENARIOS.map(preset => {
          const isActive = activeIds.has(preset.id);
          const Icon = INTERVENTION_ICONS[preset.interventionType];
          return (
            <button
              key={preset.id}
              onClick={() => isActive ? onRemoveScenario(preset.id) : onAddScenario(preset)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border text-[9px] leading-tight transition-all ${
                isActive
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-300'
                  : 'border-gray-600/40 bg-gray-800/40 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
              title={preset.description}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />
              <span className="text-center">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowCustom(!showCustom)}
        className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed border-gray-600/50 text-[10px] text-gray-400 hover:text-gray-200 hover:border-gray-500/60 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Custom Scenario
      </button>

      {showCustom && (
        <div className="bg-gray-800/60 rounded-md p-2 space-y-2 border border-gray-700/50">
          <div className="flex gap-1">
            <button
              onClick={() => { setCustomTargetType('muscle'); setCustomTarget(MUSCLE_TARGETS[0].id); setCustomIntervention('strengthen'); }}
              className={`flex-1 text-[9px] py-1 rounded ${customTargetType === 'muscle' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}
            >
              Muscle
            </button>
            <button
              onClick={() => { setCustomTargetType('joint'); setCustomTarget(JOINT_TARGETS[0].id); setCustomIntervention('mobilize'); }}
              className={`flex-1 text-[9px] py-1 rounded ${customTargetType === 'joint' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}
            >
              Joint
            </button>
          </div>

          <select
            value={customTarget}
            onChange={e => setCustomTarget(e.target.value)}
            className="w-full text-[10px] bg-gray-900/60 border border-gray-600/40 rounded px-1.5 py-1 text-gray-200"
          >
            {(customTargetType === 'muscle' ? MUSCLE_TARGETS : JOINT_TARGETS).map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          <div className="flex gap-1">
            {(customTargetType === 'muscle'
              ? ['strengthen', 'stretch'] as InterventionType[]
              : ['mobilize', 'offload'] as InterventionType[]
            ).map(type => {
              const Icon = INTERVENTION_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => setCustomIntervention(type)}
                  className={`flex-1 flex items-center justify-center gap-0.5 text-[9px] py-1 rounded border ${
                    customIntervention === type ? INTERVENTION_COLORS[type] : 'bg-gray-700/40 text-gray-400 border-gray-600/30'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-gray-400">
              <span>Magnitude</span>
              <span className="text-cyan-300 font-mono">{customMagnitude}{customIntervention === 'mobilize' ? '°' : '%'}</span>
            </div>
            <Slider
              value={[customMagnitude]}
              onValueChange={v => setCustomMagnitude(v[0])}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          <Button
            size="sm"
            onClick={handleAddCustom}
            className="w-full h-6 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Scenario
          </Button>
        </div>
      )}

      {activeScenarios.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-300">Active ({activeScenarios.length})</span>
              <div className="flex items-center gap-2">
                {onSetComparisonB && activeScenarios.length > 0 && (
                  <button
                    onClick={() => {
                      setShowCompare(!showCompare);
                      if (!showCompare && onSetComparisonB) {
                        onSetComparisonB(activeScenarios);
                      }
                    }}
                    className={`text-[9px] flex items-center gap-0.5 ${showCompare ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'} transition-colors`}
                    title="Save current as Programme A, then modify scenarios to build Programme B"
                  >
                    <GitCompareArrows className="h-3 w-3" />
                    {showCompare ? 'Hide Compare' : 'Save as A & Compare'}
                  </button>
                )}
                <button onClick={onClearAll} className="text-[9px] text-gray-500 hover:text-red-400 transition-colors">
                  Clear All
                </button>
              </div>
            </div>
            {activeScenarios.map(s => {
              const Icon = INTERVENTION_ICONS[s.interventionType];
              return (
                <div key={s.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-gray-800/50 border border-gray-700/40">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <Icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-[10px] text-gray-200 flex-1 truncate">{s.label}</span>
                  <button onClick={() => onRemoveScenario(s.id)} className="text-gray-500 hover:text-red-400 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {comparison && activeScenarios.length > 0 && (
        <>
          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-gray-200">Simulation Results</span>
            </div>

            <div className="bg-gray-800/60 rounded-md p-2 border border-gray-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-gray-400">Overall Risk</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono ${riskColor(comparison.riskLevelBefore)}`}>
                    {comparison.overallRiskBefore.toFixed(0)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-500" />
                  <span className={`text-[10px] font-mono font-bold ${riskColor(comparison.riskLevelAfter)}`}>
                    {comparison.overallRiskAfter.toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-gray-700/60 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${riskBarColor(comparison.riskLevelBefore)} opacity-40 rounded-full`}
                  style={{ width: `${Math.min(comparison.overallRiskBefore, 100)}%` }}
                />
                <div
                  className={`absolute top-0 left-0 h-full ${riskBarColor(comparison.riskLevelAfter)} rounded-full`}
                  style={{ width: `${Math.min(comparison.overallRiskAfter, 100)}%` }}
                />
              </div>
              {comparison.overallRiskDelta !== 0 && (
                <div className={`flex items-center gap-0.5 mt-1 text-[9px] ${comparison.overallRiskDelta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {comparison.overallRiskDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {comparison.overallRiskDelta < 0 ? '↓' : '↑'}{Math.abs(comparison.overallRiskDelta).toFixed(1)} pts
                </div>
              )}
            </div>

            {comparison.topImprovements.length > 0 && (
              <div className="space-y-0.5">
                {comparison.topImprovements.slice(0, 4).map((imp, i) => (
                  <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                    <span className="text-[9px] text-green-300">{imp}</span>
                  </div>
                ))}
              </div>
            )}

            {comparison.timeline && comparison.timeline.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-300 hover:text-gray-100 mb-1"
                >
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3 text-cyan-400" />
                    <span className="font-semibold">Timeline (0-12 weeks)</span>
                  </div>
                  {showTimeline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showTimeline && (
                  <div className="bg-gray-800/50 rounded-md p-2 border border-gray-700/40 space-y-2">
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>Week {timelineWeek}</span>
                      {timelinePoint && (
                        <span className={riskColor(timelinePoint.riskLevel)}>
                          Risk: {timelinePoint.riskScore}
                        </span>
                      )}
                    </div>
                    <Slider
                      value={[timelineWeek]}
                      onValueChange={v => setTimelineWeek(v[0])}
                      min={0}
                      max={12}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex h-12 items-end gap-px">
                      {comparison.timeline.map(tp => (
                        <div key={tp.week} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-t-sm transition-all ${
                              tp.week === timelineWeek ? 'bg-cyan-400' : riskBarColor(tp.riskLevel) + ' opacity-60'
                            }`}
                            style={{ height: `${Math.max(4, tp.riskScore * 0.4)}px` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[7px] text-gray-500">
                      <span>Wk 0</span>
                      <span>Wk 6</span>
                      <span>Wk 12</span>
                    </div>
                    {timelinePoint && (
                      <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-1 text-[8px]">
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500">Risk</span>
                            <span className={`font-mono font-bold ${riskColor(timelinePoint.riskLevel)}`}>{timelinePoint.riskScore}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500">Force ↓</span>
                            <span className="text-green-400 font-mono">{Math.abs(timelinePoint.forceReduction).toFixed(1)}%</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500">Comp ↓</span>
                            <span className="text-green-400 font-mono">{timelinePoint.compensationResolution.toFixed(0)}%</span>
                          </div>
                        </div>
                        {timelineWeek > 0 && (
                          <div className="text-[7px] text-gray-500 text-center">
                            Dose-response: {Math.round(
                              timelineWeek <= 2 ? 15 * timelineWeek
                              : timelineWeek <= 6 ? 30 + (timelineWeek - 2) * 12
                              : timelineWeek <= 10 ? 78 + (timelineWeek - 6) * 4
                              : 94 + (timelineWeek - 10) * 1.5
                            )}% of intervention effect applied
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {comparison.slingDeltas && comparison.slingDeltas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSlingDetails(!showSlingDetails)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-300 hover:text-gray-100 mb-1"
                >
                  <div className="flex items-center gap-1">
                    <Link2 className="h-3 w-3 text-orange-400" />
                    <span className="font-semibold">Sling Impact</span>
                  </div>
                  {showSlingDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showSlingDetails && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {comparison.forceTransferScoreBefore > 0 && (
                      <div className="flex items-center justify-between text-[8px] bg-gray-800/40 rounded px-1.5 py-0.5 mb-1">
                        <span className="text-gray-400">Overall Force Transfer</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-gray-500">{comparison.forceTransferScoreBefore.toFixed(0)}</span>
                          <ArrowRight className="h-2 w-2 text-gray-600" />
                          <span className={comparison.forceTransferScoreAfter > comparison.forceTransferScoreBefore ? 'text-green-400' : comparison.forceTransferScoreAfter < comparison.forceTransferScoreBefore ? 'text-red-400' : 'text-gray-400'}>
                            {comparison.forceTransferScoreAfter.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                    {comparison.slingDeltas.map((sd: SlingDelta) => (
                      <div key={sd.slingId} className="bg-gray-800/50 rounded p-1.5 border border-gray-700/30 space-y-0.5">
                        <div className="flex items-center gap-1 text-[9px]">
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sd.color }} />
                          <span className="text-gray-300 flex-1 truncate">{sd.label}</span>
                          <span className={`font-mono ${sd.activationDelta > 0 ? 'text-green-400' : sd.activationDelta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {sd.activationDelta > 0 ? '↑' : sd.activationDelta < 0 ? '↓' : '='}{Math.abs(sd.activationDelta).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px]">
                          <span className="text-gray-500">Status:</span>
                          <span className={sd.statusBefore === 'normal' ? 'text-green-400' : 'text-yellow-400'}>{sd.statusBefore}</span>
                          <ArrowRight className="h-2 w-2 text-gray-600" />
                          <span className={sd.statusAfter === 'normal' ? 'text-green-400' : 'text-yellow-400'}>{sd.statusAfter}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px]">
                          <span className="text-gray-500">Transfer:</span>
                          <span className={transferColor(sd.transferBefore)}>{sd.transferBefore}</span>
                          <ArrowRight className="h-2 w-2 text-gray-600" />
                          <span className={transferColor(sd.transferAfter)}>{sd.transferAfter}</span>
                        </div>
                        {sd.weakLinksBefore !== sd.weakLinksAfter && (
                          <div className="text-[8px] text-gray-500">
                            Weak links: {sd.weakLinksBefore} → {sd.weakLinksAfter}
                            {sd.weakLinksAfter < sd.weakLinksBefore && (
                              <span className="text-green-400 ml-1">↓{sd.weakLinksBefore - sd.weakLinksAfter}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {comparison.forceDeltas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowForceDetails(!showForceDetails)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-300 hover:text-gray-100 mb-1"
                >
                  <span className="font-semibold">Force Changes</span>
                  {showForceDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showForceDetails && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {comparison.forceDeltas.filter(fd => Math.abs(fd.deltaPercent) > 1).slice(0, 8).map(fd => (
                      <div key={fd.jointId} className="flex items-center gap-1 text-[9px]">
                        <span className="text-gray-400 w-16 truncate">{fd.jointLabel}</span>
                        <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden relative">
                          <div
                            className={`absolute top-0 h-full rounded-full ${fd.delta < 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Math.abs(fd.deltaPercent), 100)}%`, left: fd.delta < 0 ? undefined : '0', right: fd.delta < 0 ? '0' : undefined }}
                          />
                        </div>
                        <span className={`w-10 text-right font-mono ${fd.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fd.delta < 0 ? '↓' : '↑'}{Math.abs(fd.deltaPercent).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {comparison.muscleDeltas && comparison.muscleDeltas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowMuscleDetails(!showMuscleDetails)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-300 hover:text-gray-100 mb-1"
                >
                  <span className="font-semibold">Muscle Changes</span>
                  {showMuscleDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showMuscleDetails && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {comparison.muscleDeltas.slice(0, 10).map((md) => {
                      const actDelta = md.activationAfter - md.activationBefore;
                      return (
                        <div key={md.muscleId} className="flex items-center gap-1 text-[9px]">
                          <Activity className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-400 w-16 truncate">{md.label}</span>
                          <span className={`w-12 text-right font-mono ${actDelta > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                            {actDelta > 0 ? '↑' : '↓'}{Math.abs(actDelta).toFixed(0)}% act
                          </span>
                          {md.statusBefore !== md.statusAfter && (
                            <Badge variant="outline" className="text-[7px] px-0.5 py-0 text-cyan-400 border-cyan-500/30">
                              {md.statusAfter}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {comparison.riskDeltas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRiskDetails(!showRiskDetails)}
                  className="flex items-center justify-between w-full text-[10px] text-gray-300 hover:text-gray-100 mb-1"
                >
                  <span className="font-semibold">Risk Changes</span>
                  {showRiskDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showRiskDetails && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {comparison.riskDeltas.filter(rd => Math.abs(rd.delta) > 0.5).slice(0, 8).map((rd, i) => (
                      <div key={i} className="flex items-center gap-1 text-[9px]">
                        <span className="text-gray-400 w-20 truncate">{rd.label}</span>
                        <div className="flex items-center gap-0.5">
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${riskColor(rd.levelBefore)} border-current/30`}>{rd.before.toFixed(0)}</Badge>
                          <ArrowRight className="h-2.5 w-2.5 text-gray-500" />
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${riskColor(rd.levelAfter)} border-current/30`}>{rd.after.toFixed(0)}</Badge>
                        </div>
                        <span className={`font-mono ${rd.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {rd.delta < 0 ? '↓' : '↑'}{Math.abs(rd.delta).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {comparison.compensationDeltas.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-gray-300 mb-1 block">Compensation Resolution</span>
                <div className="space-y-1">
                  {comparison.compensationDeltas.filter(cd => cd.resolvedPercent > 0).slice(0, 4).map((cd, i) => (
                    <div key={i} className="flex items-center gap-1 text-[9px]">
                      <span className="text-gray-400 flex-1 truncate">{cd.pattern}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-green-400 border-green-500/30">
                        {cd.resolvedPercent.toFixed(0)}% resolved
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {comparison.causalChainsTotal > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-300 mb-1 block">Injury Mechanism</span>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-gray-400">Causal Chains</span>
                <span className="font-mono text-gray-500">{comparison.causalChainsTotal}</span>
                <ArrowRight className="h-2.5 w-2.5 text-gray-600" />
                <span className={`font-mono font-bold ${comparison.causalChainsResolved > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {comparison.causalChainsTotal - comparison.causalChainsResolved}
                </span>
                {comparison.causalChainsResolved > 0 && (
                  <Badge variant="outline" className="text-[7px] px-0.5 py-0 text-green-400 border-green-500/30">
                    {comparison.causalChainsResolved} resolved
                  </Badge>
                )}
              </div>
              {comparison.mechanismAfter && (
                <p className="text-[8px] text-gray-500 mt-1 line-clamp-2">
                  {comparison.mechanismAfter.overallMechanismSummary}
                </p>
              )}
            </div>
          )}

          {comparison.painPredictions && comparison.painPredictions.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-300 mb-1 block">
                Pain Predictions
                {painMarkers && painMarkers.length > 0 && (
                  <span className="text-[8px] text-gray-500 font-normal ml-1">({painMarkers.length} markers weighted)</span>
                )}
              </span>
              <div className="space-y-1">
                {comparison.painPredictions.slice(0, 6).map((pp, i) => {
                  const relatedMarkers = painMarkers?.filter(pm =>
                    pm.label.toLowerCase().includes(pp.region.toLowerCase())
                  ) || [];
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[9px]">
                        <span className="text-gray-400 flex-1 truncate">{pp.region}</span>
                        <span className="font-mono text-gray-500">{pp.beforeLikelihood}%</span>
                        <ArrowRight className="h-2.5 w-2.5 text-gray-600" />
                        <span className={`font-mono font-bold ${pp.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pp.afterLikelihood}%
                        </span>
                        <Badge variant="outline" className={`text-[7px] px-0.5 py-0 ${pp.delta < 0 ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                          {pp.delta < 0 ? '↓' : '↑'}{Math.abs(pp.delta)}%
                        </Badge>
                      </div>
                      {relatedMarkers.length > 0 && (
                        <div className="flex items-center gap-1 pl-1 text-[7px] text-gray-500">
                          <span>Markers:</span>
                          {relatedMarkers.slice(0, 2).map((m, mi) => (
                            <Badge key={mi} variant="outline" className="text-[6px] px-0.5 py-0 border-gray-600/40 text-gray-400">
                              {m.label} (sev:{m.severity ?? 5})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showCompare && comparisonB && (
            <>
              <Separator className="bg-purple-500/30" />
              <div className="bg-purple-500/10 rounded-md p-2 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] text-purple-300 font-semibold">
                  <GitCompareArrows className="h-3 w-3" />
                  Programme A (saved) vs B (current)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="text-center">
                    <div className="text-gray-400 mb-0.5">A (saved)</div>
                    <div className={`font-mono font-bold text-[11px] ${riskColor(comparisonB.riskLevelAfter)}`}>
                      {comparisonB.overallRiskAfter.toFixed(0)}
                    </div>
                    <div className="text-gray-500">{comparisonB.scenarios.length} scenarios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 mb-0.5">B (current)</div>
                    <div className={`font-mono font-bold text-[11px] ${riskColor(comparison.riskLevelAfter)}`}>
                      {comparison.overallRiskAfter.toFixed(0)}
                    </div>
                    <div className="text-gray-500">{comparison.scenarios.length} scenarios</div>
                  </div>
                </div>
                <div className="text-[8px] text-center">
                  {comparisonB.overallRiskAfter < comparison.overallRiskAfter ? (
                    <span className="text-green-400">Programme A achieves lower risk ({(comparison.overallRiskAfter - comparisonB.overallRiskAfter).toFixed(0)} pts better)</span>
                  ) : comparisonB.overallRiskAfter > comparison.overallRiskAfter ? (
                    <span className="text-purple-400">Programme B achieves lower risk ({(comparisonB.overallRiskAfter - comparison.overallRiskAfter).toFixed(0)} pts better)</span>
                  ) : (
                    <span className="text-gray-400">Both programmes achieve equal risk scores</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[8px] mt-1">
                  <div className="space-y-0.5">
                    <div className="text-gray-500 font-semibold">A Forces</div>
                    {comparisonB.forceDeltas.filter(f => Math.abs(f.deltaPercent) > 2).slice(0, 3).map(fd => (
                      <div key={fd.jointId} className={`font-mono ${fd.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fd.jointLabel}: {fd.delta < 0 ? '↓' : '↑'}{Math.abs(fd.deltaPercent).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-gray-500 font-semibold">B Forces</div>
                    {comparison.forceDeltas.filter(f => Math.abs(f.deltaPercent) > 2).slice(0, 3).map(fd => (
                      <div key={fd.jointId} className={`font-mono ${fd.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fd.jointLabel}: {fd.delta < 0 ? '↓' : '↑'}{Math.abs(fd.deltaPercent).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                </div>
                {(comparison.slingDeltas?.length > 0 || comparisonB.slingDeltas?.length > 0) && (
                  <div className="grid grid-cols-2 gap-1 text-[8px] mt-1">
                    <div className="space-y-0.5">
                      <div className="text-gray-500 font-semibold">A Slings</div>
                      {(comparisonB.slingDeltas || []).slice(0, 3).map(sd => (
                        <div key={sd.slingId} className={`font-mono ${sd.activationDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {sd.label}: {sd.activationDelta > 0 ? '↑' : '↓'}{Math.abs(sd.activationDelta).toFixed(0)}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-gray-500 font-semibold">B Slings</div>
                      {(comparison.slingDeltas || []).slice(0, 3).map(sd => (
                        <div key={sd.slingId} className={`font-mono ${sd.activationDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {sd.label}: {sd.activationDelta > 0 ? '↑' : '↓'}{Math.abs(sd.activationDelta).toFixed(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 text-[8px] mt-1">
                  <div>
                    <span className="text-gray-500">A Compensations: </span>
                    <span className="text-green-400">{comparisonB.compensationDeltas.filter(c => c.resolvedPercent >= 50).length} resolved</span>
                  </div>
                  <div>
                    <span className="text-gray-500">B Compensations: </span>
                    <span className="text-green-400">{comparison.compensationDeltas.filter(c => c.resolvedPercent >= 50).length} resolved</span>
                  </div>
                </div>
                {(comparison.muscleDeltas.length > 0 || comparisonB.muscleDeltas.length > 0) && (
                  <div className="grid grid-cols-2 gap-1 text-[8px] mt-1">
                    <div className="space-y-0.5">
                      <div className="text-gray-500 font-semibold">A Muscles</div>
                      {comparisonB.muscleDeltas.filter(md => Math.abs(md.activationAfter - md.activationBefore) > 3).slice(0, 3).map(md => {
                        const delta = md.activationAfter - md.activationBefore;
                        return (
                          <div key={md.muscleId} className={`font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {md.label}: {delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-gray-500 font-semibold">B Muscles</div>
                      {comparison.muscleDeltas.filter(md => Math.abs(md.activationAfter - md.activationBefore) > 3).slice(0, 3).map(md => {
                        const delta = md.activationAfter - md.activationBefore;
                        return (
                          <div key={md.muscleId} className={`font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {md.label}: {delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 text-[8px] mt-1">
                  <div>
                    <span className="text-gray-500">A Transfer: </span>
                    <span className={comparisonB.forceTransferScoreAfter >= comparisonB.forceTransferScoreBefore ? 'text-green-400' : 'text-red-400'}>
                      {comparisonB.forceTransferScoreAfter.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">B Transfer: </span>
                    <span className={comparison.forceTransferScoreAfter >= comparison.forceTransferScoreBefore ? 'text-green-400' : 'text-red-400'}>
                      {comparison.forceTransferScoreAfter.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-gray-700/50" />

          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={onApplyToSkeleton}
              className="flex-1 h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearAll}
              className="flex-1 h-6 text-[10px] border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </>
      )}

      {activeScenarios.length === 0 && (
        <div className="text-center py-2">
          <FlaskConical className="h-5 w-5 text-gray-600 mx-auto mb-1" />
          <p className="text-[9px] text-gray-500">Select a scenario to simulate</p>
          <p className="text-[8px] text-gray-600">See predicted changes in risk & forces</p>
        </div>
      )}
    </div>
  );
}
