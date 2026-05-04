import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Shield, Dumbbell, Scale, Lock, Link2, Brain, Layers, ArrowUp, ArrowDown, Clock, ChevronRight, Weight } from 'lucide-react';
import type { ForceAnalysisResult, WeightDistribution } from '@/lib/posturalForceEngine';
import { computeMuscleBalanceRatios, type MuscleAnalysisResult } from '@/lib/muscleBiomechanicsEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';
import type { BiomechanicsOutput } from '@/lib/unifiedBiomechanicsEngine';
import type { ForceTimeMetrics } from '@/lib/forceTimeBuffer';
import { citationFor, getThresholdsFor, type PatientState } from '@/lib/forceCitations';

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
  /** Task #323: when true, the on-skeleton sling overlay is pinned and the
   * Slings circle renders in a pressed/active visual state. Independent of
   * which side-panel tab is active. */
  slingsOverlayPinned?: boolean;
  /** Task #323: primary-click handler on the Slings circle. Toggles the
   * on-skeleton sling overlay. `onOpenSlings` is preserved as a secondary
   * affordance (chevron button + double-click). */
  onToggleSlingsOverlay?: () => void;
  /** Task #323 — review-3 fix: when false, the Slings circle is omitted
   * from the HUD entirely. PhysioGPT passes `false` outside Movement
   * Mode so the toggle control isn't visible where it has no meaning. */
  showSlings?: boolean;
  onOpenBiomechanics: () => void;
  onToggleTissueView: () => void;
  timeMetrics?: ForceTimeMetrics | null;
  onOpenForceTime?: () => void;
  patientForceState?: PatientState;
  /** Live patient body weight (kg). Used to dual-label tooltip values in
   * both BW multiples and Newtons so units stay consistent. */
  bodyWeightKg?: number;
  /** Task #364: total carried external load (kg) summed across both hands.
   * Drives the new Load HUD circle's display value. */
  externalLoadKg?: number;
  /** Task #364: which hand(s) the load is assigned to. */
  externalLoadHand?: 'left' | 'right' | 'both';
  /** Task #364: callback when the user picks a new load preset / hand from
   * the Load circle popover. PhysioGPT owns the actual force re-computation. */
  onChangeExternalLoad?: (kg: number, hand: 'left' | 'right' | 'both') => void;
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
  slingsOverlayPinned = false,
  onToggleSlingsOverlay,
  showSlings = true,
  onOpenBiomechanics,
  onToggleTissueView,
  timeMetrics,
  onOpenForceTime,
  patientForceState,
  bodyWeightKg = 70,
  externalLoadKg = 0,
  externalLoadHand = 'both',
  onChangeExternalLoad,
}: BiomechanicsHUDProps) {
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  // Task #364: popover state for the Load circle (preset kg + hand selector).
  const [loadPopoverOpen, setLoadPopoverOpen] = useState(false);
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
    onDoubleClick?: () => void;
    tooltip?: string;
    /** Task #323: render a pressed/active visual state for togglable circles. */
    pressed?: boolean;
    /** Task #323: a small secondary affordance rendered in the bottom-right
     * of the circle (used for the Slings chevron that opens the side panel
     * while the primary click toggles the on-skeleton overlay). */
    secondary?: { tooltip: string; onClick: () => void; icon: typeof Activity; testId: string };
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
      // Task #323: primary click toggles the on-skeleton sling overlay
      // (when a toggle handler is provided), regardless of side-panel
      // tab. Falls back to opening the panel when no toggle wired up.
      onClick: onToggleSlingsOverlay ?? onOpenSlings,
      // Task #323: double-click is the keyboard-free secondary affordance
      // mirroring the chevron — opens the full Slings side panel.
      onDoubleClick: onToggleSlingsOverlay ? onOpenSlings : undefined,
      pressed: !!slingsOverlayPinned,
      tooltip: onToggleSlingsOverlay
        ? `${slingsOverlayPinned ? 'Hide' : 'Show'} on-skeleton sling overlay (chevron / double-click for panel)`
        : 'Slings',
      secondary: onToggleSlingsOverlay
        ? { tooltip: 'Open Slings panel', onClick: onOpenSlings, icon: ChevronRight, testId: 'hud-slings-open-panel' }
        : undefined,
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
      // Inline citation + ±7% anthropometric confidence band so every HUD
      // force readout carries provenance (the trust-layer requirement).
      tooltip: (() => {
        if (!topJoint) return 'Forces';
        const cit = citationFor(topJoint.id);
        const band = patientForceState ? getThresholdsFor(topJoint.id, patientForceState) : null;
        const bw = topJoint.totalForce;
        const bwLow = bw * 0.93;
        const bwHigh = bw * 1.07;
        // Body weight in Newtons (g = 9.81) so every value can be shown in
        // both BW multiples and N (clinicians read both).
        const bwN = (bodyWeightKg > 0 ? bodyWeightKg : 70) * 9.81;
        const peakN = bw * bwN;
        const lowN = bwLow * bwN;
        const highN = bwHigh * bwN;
        const fmt = (b: number, n: number) => `${b.toFixed(2)} BW (${Math.round(n)} N)`;
        const lines: string[] = [
          `Peak: ${abbreviateJoint(topJoint.label)} ${fmt(bw, peakN)}`,
          `Confidence ±7% (de Leva 1996): ${fmt(bwLow, lowN)} – ${fmt(bwHigh, highN)}`,
        ];
        if (band) {
          const safeBw = band.safeN / bwN;
          const warnBw = band.warnN / bwN;
          lines.push(
            `Safe < ${fmt(safeBw, band.safeN)} · Warn ${fmt(warnBw, band.warnN)} — ${band.note}`
          );
        }
        if (cit) {
          lines.push(`Source: ${cit.authors} (${cit.year}). ${cit.title}. ${cit.source}`);
        }
        return lines.join('\n');
      })(),
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
    ...(onChangeExternalLoad ? [{
      id: 'load',
      icon: Weight,
      color: 'text-yellow-300',
      bgColor: 'bg-yellow-500/15',
      ringColor: 'ring-yellow-500/30',
      label: 'Load',
      value: externalLoadKg > 0 ? `${externalLoadKg}kg` : '0',
      valueColor: externalLoadKg >= 20 ? '#ef4444'
                : externalLoadKg >= 10 ? '#f97316'
                : externalLoadKg >= 5  ? '#eab308'
                : externalLoadKg > 0   ? '#a3e635'
                : '#6b7280',
      onClick: () => setLoadPopoverOpen(v => !v),
      tooltip: externalLoadKg > 0
        ? `Carrying ${externalLoadKg} kg in ${externalLoadHand} hand(s) — click to change`
        : 'Add a hand-held load (click to choose kg + hand)',
      pressed: loadPopoverOpen || externalLoadKg > 0,
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
      {circles.filter((c) => c.id !== 'slings' || showSlings).map((c) => {
        const Icon = c.icon;
        const isPulsing = pulsingIds.has(c.id);
        const dir = directions[c.id];
        const SecondaryIcon = c.secondary?.icon;
        // Task #323: pressed circles get a brighter ring + an inset glow so
        // the toggle state reads at a glance even while a pulse is firing.
        const ringClass = c.pressed
          ? 'ring-2 ring-white/80'
          : isPulsing ? 'ring-2 ring-white/70' : c.ringColor;
        return (
          <button
            key={c.id}
            onClick={c.onClick}
            onDoubleClick={c.onDoubleClick}
            className={`relative w-[52px] h-[52px] rounded-full ${c.bgColor} backdrop-blur-md ring-1 ${ringClass} shadow-lg flex flex-col items-center justify-center gap-0.5 hover:scale-110 hover:ring-2 transition-all duration-200 cursor-pointer ${c.pressed ? 'shadow-inner brightness-125' : ''}`}
            style={isPulsing ? { animation: 'hud-pulse 0.3s ease-in-out 2' } : undefined}
            title={c.tooltip ?? c.label}
            data-testid={`hud-circle-${c.id}`}
            data-pulsing={isPulsing ? 'true' : 'false'}
            data-direction={dir ?? 'none'}
            data-pressed={c.pressed ? 'true' : 'false'}
            aria-pressed={c.pressed === undefined ? undefined : c.pressed}
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
            {c.secondary && SecondaryIcon && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); c.secondary!.onClick(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    c.secondary!.onClick();
                  }
                }}
                className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-slate-900/90 ring-1 ring-white/30 text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
                title={c.secondary.tooltip}
                data-testid={c.secondary.testId}
                aria-label={c.secondary.tooltip}
              >
                <SecondaryIcon className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
    {loadPopoverOpen && onChangeExternalLoad && (
      <div
        className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md ring-1 ring-yellow-500/40 rounded-lg shadow-xl p-3 min-w-[260px]"
        data-testid="hud-load-popover"
      >
        <div className="text-[11px] font-semibold text-yellow-300 uppercase tracking-wider mb-2">
          External Load (Hand-Held)
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {[0, 2.5, 5, 10, 20].map((kg) => (
            <button
              key={kg}
              onClick={() => onChangeExternalLoad(kg, externalLoadHand)}
              className={`px-1 py-1.5 rounded text-[11px] font-bold tabular-nums transition-colors ${
                externalLoadKg === kg
                  ? 'bg-yellow-500 text-slate-900'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              data-testid={`hud-load-preset-${kg}`}
            >
              {kg === 0 ? 'Off' : `${kg}kg`}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Carried in</div>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {(['left', 'both', 'right'] as const).map((h) => (
            <button
              key={h}
              onClick={() => onChangeExternalLoad(externalLoadKg, h)}
              className={`px-1 py-1.5 rounded text-[11px] font-medium capitalize transition-colors ${
                externalLoadHand === h
                  ? 'bg-yellow-500 text-slate-900'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              data-testid={`hud-load-hand-${h}`}
            >
              {h}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-400 leading-snug">
          Total {externalLoadKg} kg → {externalLoadHand === 'both'
            ? `${(externalLoadKg / 2).toFixed(1)} kg per hand`
            : `${externalLoadKg} kg in ${externalLoadHand} hand`}.
          Lever physics: de Leva 1996; lumbar amplification: Marras 1995.
        </div>
        <button
          onClick={() => setLoadPopoverOpen(false)}
          className="mt-2 w-full py-1 text-[10px] text-slate-400 hover:text-slate-200 uppercase tracking-wider"
        >
          Close
        </button>
      </div>
    )}
    </>
  );
}
