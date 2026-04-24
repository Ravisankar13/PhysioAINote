import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Shield, Dumbbell, Scale, Lock, Link2, Brain, Layers, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import type { ForceAnalysisResult, WeightDistribution } from '@/lib/posturalForceEngine';
import { computeMuscleBalanceRatios, type MuscleAnalysisResult } from '@/lib/muscleBiomechanicsEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';
import type { BiomechanicsOutput } from '@/lib/unifiedBiomechanicsEngine';
import type { ForceTimeMetrics } from '@/lib/forceTimeBuffer';

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
  slingAnalysis: SlingAnalysisResult | null;
  biomechanicsOutput: BiomechanicsOutput | null;
  romRestrictionCount: number;
  tissueConcernCount: number;
  onOpenForceOverlay: () => void;
  onOpenMuscleOverlay: () => void;
  onOpenChainExplorer: () => void;
  onOpenSlings: () => void;
  onOpenBiomechanics: () => void;
  onToggleTissueView: () => void;
  timeMetrics?: ForceTimeMetrics | null;
  onOpenForceTime?: () => void;
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

function getScoreColor(score: number): string {
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
  slingAnalysis,
  biomechanicsOutput,
  romRestrictionCount,
  tissueConcernCount,
  onOpenForceOverlay,
  onOpenMuscleOverlay,
  onOpenChainExplorer,
  onOpenSlings,
  onOpenBiomechanics,
  onToggleTissueView,
  timeMetrics,
  onOpenForceTime,
}: BiomechanicsHUDProps) {
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [directions, setDirections] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevThresholdsRef = useRef<{
    forceStatus: string;
    chainScore: number;
    syndromes: number;
    slingScore: number;
    bioScore: number;
    romCount: number;
    tissueCount: number;
  }>({
    forceStatus: 'normal',
    chainScore: 100,
    syndromes: 0,
    slingScore: 100,
    bioScore: 100,
    romCount: 0,
    tissueCount: 0,
  });
  const prevNumericRef = useRef<Record<string, number>>({});
  const directionTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const prev = prevThresholdsRef.current;
    const curForceStatus = forceAnalysis?.joints?.[0]?.status || 'normal';
    const curChainScore = (() => { let min = 100; chainIntegrityScores.forEach(e => { if (e.score < min) min = e.score; }); return min; })();
    const curSyndromes = muscleAnalysis ? computeMuscleBalanceRatios(muscleAnalysis.allMuscles).filter(r => r.syndrome).length : 0;
    const curSlingScore = slingAnalysis?.overallForceTransferScore ?? 100;
    const curBioScore = biomechanicsOutput?.qualityScore ?? 100;
    const curRomCount = romRestrictionCount;
    const curTissueCount = tissueConcernCount;

    const newPulse = new Set<string>();
    if (curForceStatus !== prev.forceStatus && (curForceStatus === 'high' || curForceStatus === 'very_high')) newPulse.add('forces');
    if (curChainScore < 60 && prev.chainScore >= 60) newPulse.add('chains');
    if (curSyndromes > prev.syndromes) newPulse.add('muscle');
    if (curSlingScore < prev.slingScore - 10) newPulse.add('slings');
    if (curBioScore < prev.bioScore - 10) newPulse.add('biomechanics');
    if (curRomCount > prev.romCount) newPulse.add('controls');
    if (curTissueCount > prev.tissueCount) newPulse.add('tissue');

    prevThresholdsRef.current = {
      forceStatus: curForceStatus,
      chainScore: curChainScore,
      syndromes: curSyndromes,
      slingScore: curSlingScore,
      bioScore: curBioScore,
      romCount: curRomCount,
      tissueCount: curTissueCount,
    };

    // Track numeric value changes for ALL circles to drive pulse + direction indicator on any edit.
    const numericNow: Record<string, number> = {
      controls: curRomCount,
      slings: curSlingScore,
      biomechanics: curBioScore,
      tissue: curTissueCount,
      forces: forceAnalysis?.joints?.[0]?.totalForce ?? 0,
      chains: curChainScore,
      muscle: curSyndromes,
      weight: weightDistribution?.asymmetryPercent ?? 0,
    };
    const dirThresholds: Record<string, number> = {
      controls: 0.5, slings: 0.5, biomechanics: 0.5, tissue: 0.5,
      forces: 0.005, chains: 0.5, muscle: 0.5, weight: 0.3,
    };
    const directionDeltas: Record<string, 'up' | 'down'> = {};
    Object.entries(numericNow).forEach(([id, v]) => {
      const prevV = prevNumericRef.current[id];
      if (prevV !== undefined && Math.abs(v - prevV) >= (dirThresholds[id] ?? 0.5)) {
        newPulse.add(id);
        directionDeltas[id] = v > prevV ? 'up' : 'down';
      }
      prevNumericRef.current[id] = v;
    });

    if (newPulse.size > 0) {
      setPulsingIds(prev => {
        const next = new Set(prev);
        newPulse.forEach(id => next.add(id));
        return next;
      });
      setTimeout(() => {
        setPulsingIds(prev => {
          const next = new Set(prev);
          newPulse.forEach(id => next.delete(id));
          return next;
        });
      }, 600);
    }

    if (Object.keys(directionDeltas).length > 0) {
      setDirections(prev => ({ ...prev, ...directionDeltas }));
      Object.keys(directionDeltas).forEach(id => {
        if (directionTimeoutsRef.current[id]) clearTimeout(directionTimeoutsRef.current[id]);
        directionTimeoutsRef.current[id] = setTimeout(() => {
          setDirections(prev => ({ ...prev, [id]: null }));
        }, 900);
      });
    }
  }, [forceAnalysis, chainIntegrityScores, muscleAnalysis, slingAnalysis, biomechanicsOutput, romRestrictionCount, tissueConcernCount, weightDistribution]);

  useEffect(() => () => {
    Object.values(directionTimeoutsRef.current).forEach(t => clearTimeout(t));
  }, []);

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

  const slingScore = slingAnalysis?.overallForceTransferScore ?? null;
  const bioQualityScore = biomechanicsOutput?.qualityScore ?? null;

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
      id: 'controls',
      icon: Lock,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/15',
      ringColor: 'ring-orange-500/30',
      label: 'Controls',
      value: romRestrictionCount > 0 ? `${romRestrictionCount}` : 'OK',
      valueColor: romRestrictionCount >= 4 ? '#ef4444' : romRestrictionCount >= 2 ? '#f97316' : romRestrictionCount >= 1 ? '#eab308' : '#22c55e',
      onClick: onOpenForceOverlay,
    },
    {
      id: 'slings',
      icon: Link2,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/15',
      ringColor: 'ring-violet-500/30',
      label: 'Slings',
      value: slingScore !== null ? `${Math.round(slingScore)}%` : '--',
      valueColor: slingScore !== null ? getScoreColor(slingScore) : '#6b7280',
      onClick: onOpenSlings,
    },
    {
      id: 'biomechanics',
      icon: Brain,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/15',
      ringColor: 'ring-cyan-500/30',
      label: 'Biomech',
      value: bioQualityScore !== null ? `${Math.round(bioQualityScore)}%` : '--',
      valueColor: bioQualityScore !== null ? getScoreColor(bioQualityScore) : '#6b7280',
      onClick: onOpenBiomechanics,
    },
    {
      id: 'tissue',
      icon: Layers,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/15',
      ringColor: 'ring-pink-500/30',
      label: 'Tissue',
      value: tissueConcernCount > 0 ? `${tissueConcernCount}` : 'OK',
      valueColor: tissueConcernCount >= 5 ? '#ef4444' : tissueConcernCount >= 3 ? '#f97316' : tissueConcernCount >= 1 ? '#eab308' : '#22c55e',
      onClick: onToggleTissueView,
    },
    {
      id: 'forces',
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      ringColor: 'ring-amber-500/30',
      label: 'Forces',
      value: topJoint ? `${abbreviateJoint(topJoint.label)} ${(topJoint.totalForce * 100).toFixed(0)}%` : '--',
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
    ...(onOpenForceTime ? [{
      id: 'time',
      icon: Clock,
      color: 'text-amber-300',
      bgColor: 'bg-amber-300/15',
      ringColor: 'ring-amber-300/30',
      label: 'Time',
      value: (() => {
        if (!timeMetrics || timeMetrics.frameCount < 2) return '—';
        const worstAsym = timeMetrics.asymmetry.reduce((mx, a) => Math.max(mx, a.indexPct), 0);
        const peakImpact = timeMetrics.impact.peakInertialN;
        if (peakImpact > 0) {
          if (peakImpact >= 1000) return `${(peakImpact / 1000).toFixed(1)}kN`;
          return `${Math.round(peakImpact)}N`;
        }
        if (worstAsym > 5) return `${worstAsym.toFixed(0)}%Δ`;
        return 'live';
      })(),
      valueColor: (() => {
        if (!timeMetrics || timeMetrics.frameCount < 2) return '#6b7280';
        const worstAsym = timeMetrics.asymmetry.reduce((mx, a) => Math.max(mx, a.indexPct), 0);
        const share = timeMetrics.impact.impactShare;
        if (worstAsym > 20 || share > 0.4) return '#ef4444';
        if (worstAsym > 10 || share > 0.2) return '#f97316';
        if (worstAsym > 5 || share > 0.1) return '#eab308';
        return '#22c55e';
      })(),
      onClick: onOpenForceTime,
    }] : []),
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
    <style>{`
      @keyframes hud-pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); } 50% { transform: scale(1.2); box-shadow: 0 0 0 6px rgba(255,255,255,0.18); } }
      @keyframes hud-arrow-fade { 0% { opacity: 0; transform: translateY(4px); } 20%,80% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-4px); } }
    `}</style>
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 flex-wrap justify-center max-w-[500px]"
    >
      {circles.map((c) => {
        const Icon = c.icon;
        const isPulsing = pulsingIds.has(c.id);
        const dir = directions[c.id];
        return (
          <button
            key={c.id}
            onClick={c.onClick}
            className={`relative w-[52px] h-[52px] rounded-full ${c.bgColor} backdrop-blur-md ring-1 ${isPulsing ? 'ring-2 ring-white/70' : c.ringColor} shadow-lg flex flex-col items-center justify-center gap-0.5 hover:scale-110 hover:ring-2 transition-all duration-200 cursor-pointer`}
            style={isPulsing ? { animation: 'hud-pulse 0.3s ease-in-out 2' } : undefined}
            title={c.label}
            data-testid={`hud-circle-${c.id}`}
            data-pulsing={isPulsing ? 'true' : 'false'}
            data-direction={dir ?? 'none'}
          >
            <Icon className={`h-3 w-3 ${c.color}`} />
            <span
              className="text-[10px] font-bold tabular-nums leading-none"
              style={{ color: c.valueColor }}
            >
              {c.value}
            </span>
            <span className="text-[6px] text-gray-400 uppercase tracking-wider leading-none">
              {c.label}
            </span>
            {dir && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full shadow"
                style={{
                  background: dir === 'up' ? '#ef4444' : '#22c55e',
                  animation: 'hud-arrow-fade 0.9s ease-in-out forwards',
                }}
                aria-label={dir === 'up' ? 'increased' : 'decreased'}
              >
                {dir === 'up' ? <ArrowUp className="h-2.5 w-2.5 text-white" /> : <ArrowDown className="h-2.5 w-2.5 text-white" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
    </>
  );
}
