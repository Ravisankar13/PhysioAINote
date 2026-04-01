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
} from "lucide-react";
import {
  type WhatIfScenario,
  type WhatIfComparisonResult,
  type InterventionType,
  PRESET_SCENARIOS,
  MUSCLE_TARGETS,
  JOINT_TARGETS,
} from "@/lib/whatIfSimulationEngine";

interface WhatIfSimulationPanelProps {
  comparison: WhatIfComparisonResult | null;
  activeScenarios: WhatIfScenario[];
  onAddScenario: (scenario: WhatIfScenario) => void;
  onRemoveScenario: (id: string) => void;
  onClearAll: () => void;
  onApplyToSkeleton: () => void;
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
}: WhatIfSimulationPanelProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customTarget, setCustomTarget] = useState(MUSCLE_TARGETS[0].id);
  const [customTargetType, setCustomTargetType] = useState<'muscle' | 'joint'>('muscle');
  const [customIntervention, setCustomIntervention] = useState<InterventionType>('strengthen');
  const [customMagnitude, setCustomMagnitude] = useState(20);
  const [showForceDetails, setShowForceDetails] = useState(false);
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  const activeIds = useMemo(() => new Set(activeScenarios.map(s => s.id)), [activeScenarios]);

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

  return (
    <div className="space-y-2">
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
              onClick={() => setCustomTargetType('muscle')}
              className={`flex-1 text-[9px] py-1 rounded ${customTargetType === 'muscle' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}
            >
              Muscle
            </button>
            <button
              onClick={() => { setCustomTargetType('joint'); setCustomIntervention('mobilize'); setCustomTarget(JOINT_TARGETS[0].id); }}
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

          {customTargetType === 'muscle' && (
            <div className="flex gap-1">
              {(['strengthen', 'stretch', 'offload'] as InterventionType[]).map(type => {
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
          )}

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
              <button onClick={onClearAll} className="text-[9px] text-gray-500 hover:text-red-400 transition-colors">
                Clear All
              </button>
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
