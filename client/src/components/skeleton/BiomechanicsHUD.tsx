import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Shield, Dumbbell, Scale } from 'lucide-react';
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
  manipulationCounter: number;
}

function getForceColor(status: string): string {
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

export default function BiomechanicsHUD({
  forceAnalysis,
  weightDistribution,
  muscleAnalysis,
  chainIntegrityScores,
  onOpenForceOverlay,
  onOpenMuscleOverlay,
  onOpenChainExplorer,
  manipulationCounter,
}: BiomechanicsHUDProps) {
  const [visible, setVisible] = useState(false);
  const dissolveTimerRef = useRef<number | null>(null);
  const prevCounterRef = useRef(manipulationCounter);

  useEffect(() => {
    if (manipulationCounter !== prevCounterRef.current) {
      prevCounterRef.current = manipulationCounter;
      setVisible(true);
      if (dissolveTimerRef.current) clearTimeout(dissolveTimerRef.current);
      dissolveTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
    return () => {
      if (dissolveTimerRef.current) clearTimeout(dissolveTimerRef.current);
    };
  }, [manipulationCounter]);

  const topJoint = useMemo(() => {
    if (!forceAnalysis) return null;
    const sorted = [...forceAnalysis.joints].sort((a, b) => b.totalForce - a.totalForce);
    return sorted[0] || null;
  }, [forceAnalysis]);

  const lowestChain = useMemo(() => {
    let lowest: { label: string; score: number } | null = null;
    chainIntegrityScores.forEach((entry, id) => {
      if (!lowest || entry.score < lowest.score) {
        lowest = { label: id, score: entry.score };
      }
    });
    return lowest;
  }, [chainIntegrityScores]);

  const syndromeCount = useMemo(() => {
    if (!muscleAnalysis) return 0;
    return muscleAnalysis.syndromes.filter(s => s.detected).length;
  }, [muscleAnalysis]);

  const imbalanceCount = useMemo(() => {
    if (!muscleAnalysis) return 0;
    const ratios = computeMuscleBalanceRatios(muscleAnalysis.allMuscles);
    return ratios.filter(r => r.status !== 'balanced').length;
  }, [muscleAnalysis]);

  const hasData = forceAnalysis || muscleAnalysis || chainIntegrityScores.size > 0 || weightDistribution;
  if (!hasData) return null;

  const circles: Array<{
    id: string;
    icon: typeof Activity;
    color: string;
    bgColor: string;
    ringColor: string;
    label: string;
    value: string;
    valueColor: string;
    onClick: () => void;
  }> = [
    {
      id: 'forces',
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      ringColor: 'ring-amber-500/30',
      label: 'Forces',
      value: topJoint ? `${(topJoint.totalForce * 100).toFixed(0)}%` : '--',
      valueColor: topJoint ? getForceColor(topJoint.status) : '#6b7280',
      onClick: onOpenForceOverlay,
    },
    {
      id: 'chains',
      icon: Shield,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      ringColor: 'ring-emerald-500/30',
      label: 'Chains',
      value: lowestChain ? `${(lowestChain as { label: string; score: number }).score}%` : '--',
      valueColor: lowestChain ? getIntegrityColor((lowestChain as { label: string; score: number }).score) : '#6b7280',
      onClick: onOpenChainExplorer,
    },
    {
      id: 'muscle',
      icon: Dumbbell,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15',
      ringColor: 'ring-rose-500/30',
      label: 'Balance',
      value: syndromeCount > 0 ? `${syndromeCount} syn` : imbalanceCount > 0 ? `${imbalanceCount} imb` : 'OK',
      valueColor: syndromeCount > 0 ? '#ef4444' : imbalanceCount > 0 ? '#f97316' : '#22c55e',
      onClick: onOpenMuscleOverlay,
    },
    {
      id: 'weight',
      icon: Scale,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      ringColor: 'ring-blue-500/30',
      label: 'Weight',
      value: weightDistribution
        ? weightDistribution.asymmetryPercent > 3
          ? `${weightDistribution.asymmetryPercent.toFixed(0)}%`
          : 'Even'
        : '--',
      valueColor: weightDistribution
        ? weightDistribution.asymmetryPercent > 15 ? '#ef4444'
          : weightDistribution.asymmetryPercent > 10 ? '#f97316'
          : weightDistribution.asymmetryPercent > 5 ? '#eab308'
          : '#22c55e'
        : '#6b7280',
      onClick: onOpenForceOverlay,
    },
  ];

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) scale(${visible ? 1 : 0.85})`,
        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
      }}
    >
      {circles.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            onClick={c.onClick}
            className={`pointer-events-auto w-[60px] h-[60px] rounded-full ${c.bgColor} backdrop-blur-md ring-1 ${c.ringColor} shadow-lg flex flex-col items-center justify-center gap-0.5 hover:scale-110 hover:ring-2 transition-all duration-200 cursor-pointer`}
            title={c.label}
          >
            <Icon className={`h-3.5 w-3.5 ${c.color}`} />
            <span
              className="text-[11px] font-bold tabular-nums leading-none"
              style={{ color: c.valueColor }}
            >
              {c.value}
            </span>
            <span className="text-[7px] text-gray-400 uppercase tracking-wider leading-none">
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
