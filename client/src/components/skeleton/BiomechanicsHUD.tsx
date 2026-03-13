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

function abbreviateJoint(name: string): string {
  return name
    .replace(/_[LR]$/, (m) => m === '_L' ? ' L' : ' R')
    .replace(/_M$/, '')
    .replace(/Spine\d/, 'Sp')
    .replace('Shoulder', 'Shld')
    .replace('Elbow', 'Elb')
    .replace('Wrist', 'Wrs')
    .replace('Neck', 'Nck')
    .slice(0, 7);
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
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const dissolveTimerRef = useRef<number | null>(null);
  const prevCounterRef = useRef(manipulationCounter);
  const prevThresholdsRef = useRef<{ forceStatus: string; chainScore: number; syndromes: number }>({ forceStatus: 'normal', chainScore: 100, syndromes: 0 });

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

  useEffect(() => {
    const prev = prevThresholdsRef.current;
    const curForceStatus = forceAnalysis?.joints?.[0]?.status || 'normal';
    const curChainScore = (() => { let min = 100; chainIntegrityScores.forEach(e => { if (e.score < min) min = e.score; }); return min; })();
    const curSyndromes = muscleAnalysis ? computeMuscleBalanceRatios(muscleAnalysis.allMuscles).filter(r => r.syndrome).length : 0;

    const newPulse = new Set<string>();
    if (curForceStatus !== prev.forceStatus && (curForceStatus === 'high' || curForceStatus === 'very_high')) newPulse.add('forces');
    if (curChainScore < 60 && prev.chainScore >= 60) newPulse.add('chains');
    if (curSyndromes > prev.syndromes) newPulse.add('muscle');

    prevThresholdsRef.current = { forceStatus: curForceStatus, chainScore: curChainScore, syndromes: curSyndromes };

    if (newPulse.size > 0) {
      setPulsingIds(newPulse);
      setTimeout(() => setPulsingIds(new Set()), 600);
    }
  }, [forceAnalysis, chainIntegrityScores, muscleAnalysis]);

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
      value: topJoint ? `${abbreviateJoint(topJoint.name)} ${(topJoint.totalForce * 100).toFixed(0)}%` : '--',
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
    <>
    <style>{`@keyframes hud-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }`}</style>
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) scale(${visible ? 1 : 0.85})`,
        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {circles.map((c) => {
        const Icon = c.icon;
        const isPulsing = pulsingIds.has(c.id);
        return (
          <button
            key={c.id}
            onClick={c.onClick}
            className={`w-[60px] h-[60px] rounded-full ${c.bgColor} backdrop-blur-md ring-1 ${c.ringColor} shadow-lg flex flex-col items-center justify-center gap-0.5 hover:scale-110 hover:ring-2 transition-all duration-200 cursor-pointer`}
            style={isPulsing ? { animation: 'hud-pulse 0.3s ease-in-out 2' } : undefined}
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
    </>
  );
}
