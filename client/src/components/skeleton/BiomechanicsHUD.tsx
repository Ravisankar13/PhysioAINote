import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Shield, Dumbbell, Scale, X, Gauge, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';
import type { ForceAnalysisResult, WeightDistribution } from '@/lib/posturalForceEngine';
import { computeMuscleBalanceRatios, type MuscleAnalysisResult } from '@/lib/muscleBiomechanicsEngine';

interface ChainIntegrityEntry {
  score: number;
  issues: string[];
  problematicLinks: string[];
  exercises: string[];
}

interface BiomechanicsHUDProps {
  forceAnalysis: ForceAnalysisResult | null;
  weightDistribution: WeightDistribution | null;
  muscleAnalysis: MuscleAnalysisResult | null;
  chainIntegrityScores: Map<string, ChainIntegrityEntry>;
  chainLabels: Map<string, string>;
  onOpenForceOverlay: () => void;
  onOpenMuscleOverlay: () => void;
  onOpenChainExplorer: () => void;
  visible: boolean;
  onToggleVisibility: () => void;
}

function getForceStatusColor(status: string): string {
  switch (status) {
    case 'very_high': return '#ef4444';
    case 'high': return '#f97316';
    case 'moderate': return '#eab308';
    default: return '#22c55e';
  }
}

function getIntegrityColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getAsymmetryBand(pct: number): number {
  if (pct > 15) return 3;
  if (pct > 10) return 2;
  if (pct > 5) return 1;
  return 0;
}

interface FlashState {
  [key: string]: { timestamp: number; direction: 'up' | 'down' };
}

export default function BiomechanicsHUD({
  forceAnalysis,
  weightDistribution,
  muscleAnalysis,
  chainIntegrityScores,
  chainLabels,
  onOpenForceOverlay,
  onOpenMuscleOverlay,
  onOpenChainExplorer,
  visible,
  onToggleVisibility,
}: BiomechanicsHUDProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [flashStates, setFlashStates] = useState<FlashState>({});
  const prevValuesRef = useRef<Record<string, { status: string; value: number }>>({});
  const prevChainScoresRef = useRef<Record<string, number>>({});
  const prevAsymmetryBandRef = useRef<number>(0);
  const prevSyndromeCountRef = useRef<number>(0);
  const prevImbalanceCountRef = useRef<number>(0);
  const flashTimerRef = useRef<number | null>(null);

  const topJoints = useMemo(() => {
    if (!forceAnalysis) return [];
    return [...forceAnalysis.joints]
      .sort((a, b) => b.totalForce - a.totalForce)
      .slice(0, 5);
  }, [forceAnalysis]);

  const stressedChains = useMemo(() => {
    const entries: Array<{ id: string; label: string; score: number }> = [];
    chainIntegrityScores.forEach((entry, id) => {
      entries.push({ id, label: chainLabels.get(id) || id, score: entry.score });
    });
    return entries.sort((a, b) => a.score - b.score).slice(0, 5);
  }, [chainIntegrityScores, chainLabels]);

  const detectedSyndromes = useMemo(() => {
    if (!muscleAnalysis) return [];
    return muscleAnalysis.syndromes.filter(s => s.detected);
  }, [muscleAnalysis]);

  const imbalancedRatios = useMemo(() => {
    if (!muscleAnalysis) return [];
    const ratios = computeMuscleBalanceRatios(muscleAnalysis.allMuscles);
    return ratios.filter(r => r.status !== 'balanced').slice(0, 2);
  }, [muscleAnalysis]);

  useEffect(() => {
    const newFlashes: FlashState = {};
    const now = Date.now();

    if (forceAnalysis) {
      for (const j of forceAnalysis.joints) {
        const prev = prevValuesRef.current[j.id];
        if (prev) {
          const statusOrder = { low: 0, moderate: 1, high: 2, very_high: 3 };
          const prevOrder = statusOrder[prev.status as keyof typeof statusOrder] ?? 0;
          const currOrder = statusOrder[j.status] ?? 0;
          if (currOrder > prevOrder && currOrder >= 2) {
            newFlashes[`force_${j.id}`] = { timestamp: now, direction: 'up' };
          } else if (currOrder < prevOrder) {
            newFlashes[`force_${j.id}`] = { timestamp: now, direction: 'down' };
          }
        }
        prevValuesRef.current[j.id] = { status: j.status, value: j.totalForce };
      }
    }

    chainIntegrityScores.forEach((entry, id) => {
      const prev = prevChainScoresRef.current[id];
      if (prev !== undefined) {
        if (entry.score < prev && entry.score < 60) {
          newFlashes[`chain_${id}`] = { timestamp: now, direction: 'down' };
        } else if (entry.score > prev && prev < 60) {
          newFlashes[`chain_${id}`] = { timestamp: now, direction: 'up' };
        }
      }
      prevChainScoresRef.current[id] = entry.score;
    });

    if (weightDistribution) {
      const currentBand = getAsymmetryBand(weightDistribution.asymmetryPercent);
      const prevBand = prevAsymmetryBandRef.current;
      if (prevBand !== undefined && currentBand !== prevBand) {
        newFlashes['weight_asymmetry'] = { timestamp: now, direction: currentBand > prevBand ? 'up' : 'down' };
      }
      prevAsymmetryBandRef.current = currentBand;
    }

    const curSyndromes = detectedSyndromes.length;
    const curImbalances = imbalancedRatios.length;
    if (curSyndromes > prevSyndromeCountRef.current) {
      newFlashes['muscle_balance'] = { timestamp: now, direction: 'up' };
    } else if (curSyndromes < prevSyndromeCountRef.current) {
      newFlashes['muscle_balance'] = { timestamp: now, direction: 'down' };
    } else if (curImbalances > prevImbalanceCountRef.current) {
      newFlashes['muscle_balance'] = { timestamp: now, direction: 'up' };
    } else if (curImbalances < prevImbalanceCountRef.current) {
      newFlashes['muscle_balance'] = { timestamp: now, direction: 'down' };
    }
    prevSyndromeCountRef.current = curSyndromes;
    prevImbalanceCountRef.current = curImbalances;

    if (Object.keys(newFlashes).length > 0) {
      setFlashStates(prev => ({ ...prev, ...newFlashes }));
      flashTimerRef.current = window.setTimeout(() => {
        setFlashStates(prev => {
          const next = { ...prev };
          for (const key of Object.keys(newFlashes)) {
            if (next[key]?.timestamp === now) delete next[key];
          }
          return next;
        });
      }, 1200);
    }
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [forceAnalysis, chainIntegrityScores, weightDistribution, detectedSyndromes, imbalancedRatios]);

  const getFlashClass = useCallback((key: string) => {
    const flash = flashStates[key];
    if (!flash) return '';
    return flash.direction === 'up' ? 'animate-pulse ring-1 ring-red-400/50' : 'animate-pulse ring-1 ring-green-400/50';
  }, [flashStates]);

  if (!visible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-black/90 transition-colors border border-white/10 shadow-lg"
      >
        <Gauge className="h-3 w-3 text-teal-400" />
        <span className="text-[9px] font-medium text-teal-300">Show HUD</span>
        <Maximize2 className="h-2.5 w-2.5 text-gray-400" />
      </button>
    );
  }

  const hasData = forceAnalysis || muscleAnalysis || chainIntegrityScores.size > 0 || weightDistribution;
  if (!hasData) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-black/90 transition-colors border border-white/10 shadow-lg"
      >
        <Gauge className="h-3 w-3 text-teal-400" />
        <span className="text-[9px] font-medium text-teal-300">Biomechanics HUD</span>
        <Maximize2 className="h-2.5 w-2.5 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none">
      <div className="pointer-events-auto bg-black/85 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl max-w-[calc(100%-16px)] mx-auto overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3 w-3 text-teal-400" />
            <span className="text-[10px] font-semibold text-teal-300">Biomechanics HUD</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(true)} className="text-gray-500 hover:text-gray-300 transition-colors p-0.5">
              <Minimize2 className="h-3 w-3" />
            </button>
            <button onClick={onToggleVisibility} className="text-gray-500 hover:text-gray-300 transition-colors p-0.5">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
          <button
            onClick={onOpenForceOverlay}
            className="bg-black/40 hover:bg-white/5 transition-colors px-2.5 py-2 text-left group"
          >
            <div className="flex items-center gap-1 mb-1.5">
              <Activity className="h-3 w-3 text-amber-400" />
              <span className="text-[8px] font-semibold text-amber-300 uppercase tracking-wider">Top Forces</span>
            </div>
            {topJoints.length > 0 ? (
              <div className="space-y-0.5">
                {topJoints.map(j => (
                  <div
                    key={j.id}
                    className={`flex items-center gap-1 rounded px-0.5 transition-all ${getFlashClass(`force_${j.id}`)}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getForceStatusColor(j.status) }} />
                    <span className="text-[8px] text-gray-400 truncate flex-1">{j.label.replace(/^(Left |Right )/, '').slice(0, 20)}</span>
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: getForceStatusColor(j.status) }}>
                      {(j.totalForce * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[8px] text-gray-500 italic">No force data</span>
            )}
            <div className="text-[7px] text-gray-600 mt-1 group-hover:text-teal-400 transition-colors">Click for details</div>
          </button>

          <button
            onClick={onOpenChainExplorer}
            className="bg-black/40 hover:bg-white/5 transition-colors px-2.5 py-2 text-left group"
          >
            <div className="flex items-center gap-1 mb-1.5">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="text-[8px] font-semibold text-emerald-300 uppercase tracking-wider">Chain Status</span>
            </div>
            {stressedChains.length > 0 ? (
              <div className="space-y-1">
                {stressedChains.map(chain => (
                  <div
                    key={chain.id}
                    className={`flex items-center gap-1 rounded px-0.5 transition-all ${getFlashClass(`chain_${chain.id}`)}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] text-gray-400 truncate block">{chain.label.slice(0, 18)}</span>
                    </div>
                    <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${chain.score}%`, backgroundColor: getIntegrityColor(chain.score) }}
                      />
                    </div>
                    <span className="text-[8px] font-bold tabular-nums w-6 text-right" style={{ color: getIntegrityColor(chain.score) }}>
                      {chain.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[8px] text-gray-500 italic">No chain data</span>
            )}
            <div className="text-[7px] text-gray-600 mt-1 group-hover:text-teal-400 transition-colors">Click for details</div>
          </button>

          <button
            onClick={onOpenMuscleOverlay}
            className={`bg-black/40 hover:bg-white/5 transition-colors px-2.5 py-2 text-left group ${getFlashClass('muscle_balance')}`}
          >
            <div className="flex items-center gap-1 mb-1.5">
              <Dumbbell className="h-3 w-3 text-rose-400" />
              <span className="text-[8px] font-semibold text-rose-300 uppercase tracking-wider">Muscle Balance</span>
            </div>
            {muscleAnalysis ? (
              <div className="space-y-0.5">
                {detectedSyndromes.map(s => (
                  <div key={s.id} className="flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />
                    <span className="text-[8px] text-red-300 truncate flex-1">{s.label}</span>
                    <span className="text-[8px] font-bold text-red-400 tabular-nums">{(s.severity * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {imbalancedRatios.map(r => (
                  <div key={r.id} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === 'agonist_dominant' ? 'bg-amber-400' : 'bg-purple-400'}`} />
                    <span className="text-[8px] text-gray-400 truncate flex-1">{r.label}</span>
                    <span className={`text-[8px] font-bold tabular-nums ${r.status === 'agonist_dominant' ? 'text-amber-400' : 'text-purple-400'}`}>
                      {r.ratio.toFixed(2)}
                    </span>
                  </div>
                ))}
                {detectedSyndromes.length === 0 && imbalancedRatios.length === 0 && (
                  <span className="text-[8px] text-green-400">Balanced</span>
                )}
              </div>
            ) : (
              <span className="text-[8px] text-gray-500 italic">No muscle data</span>
            )}
            <div className="text-[7px] text-gray-600 mt-1 group-hover:text-teal-400 transition-colors">Click for details</div>
          </button>

          <button
            onClick={onOpenForceOverlay}
            className={`bg-black/40 hover:bg-white/5 transition-colors px-2.5 py-2 rounded text-left group ${getFlashClass('weight_asymmetry')}`}
          >
            <div className="flex items-center gap-1 mb-1.5">
              <Scale className="h-3 w-3 text-blue-400" />
              <span className="text-[8px] font-semibold text-blue-300 uppercase tracking-wider">Weight Dist.</span>
            </div>
            {weightDistribution ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-blue-400 w-3">L</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="flex h-full">
                      <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${weightDistribution.leftPercent}%` }} />
                      <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${weightDistribution.rightPercent}%` }} />
                    </div>
                  </div>
                  <span className="text-[8px] text-orange-400 w-3 text-right">R</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-blue-400 tabular-nums">{weightDistribution.leftPercent.toFixed(1)}%</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded ${
                    weightDistribution.asymmetryPercent > 15 ? 'bg-red-500/20 text-red-400' :
                    weightDistribution.asymmetryPercent > 10 ? 'bg-orange-500/20 text-orange-400' :
                    weightDistribution.asymmetryPercent > 5 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {weightDistribution.dominantSide === 'balanced' ? 'Balanced' : `${weightDistribution.asymmetryPercent.toFixed(1)}% asym.`}
                  </span>
                  <span className="text-[9px] font-bold text-orange-400 tabular-nums">{weightDistribution.rightPercent.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <span className="text-[8px] text-gray-500 italic">No weight data</span>
            )}
            <div className="text-[7px] text-gray-600 mt-1 group-hover:text-teal-400 transition-colors">Click for details</div>
          </button>
        </div>
      </div>
    </div>
  );
}
