import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Pin, PinOff, Sparkles, Activity, ChevronRight, Check, ExternalLink } from 'lucide-react';
import type { SlingAnalysisResult, SlingId, SlingResult } from '@/lib/slingEngine';
import { SLING_ACTIVATION_BASELINE } from '@/lib/slingEngine';
import {
  pickSpotlightSling,
  getSlingParts,
  getPartInterventions,
  type SpotlightInputMarker,
  type SpotlightPart,
  type SpotlightPick,
  type PartIntervention,
} from '@/lib/movementSlingSpotlight';
import type { SlingDrivenRecommendation, DriverModality } from '@/lib/slingDriverAnalysis';
import { usePlanCart, type PlanCartItem } from '@/lib/planCart';
import { slingRecToCartItem, slingPartToCartItem } from '@/lib/slingCartItems';
import type { BoneScreenPosition } from '@/components/skeleton/TreatmentOverlay';

const STATUS_STYLE: Record<string, { bg: string; ring: string; dot: string; label: string }> = {
  underperforming: { bg: 'bg-orange-500/15', ring: 'ring-orange-400/60', dot: 'bg-orange-400', label: 'Underperforming' },
  overloaded: { bg: 'bg-red-500/15', ring: 'ring-red-400/60', dot: 'bg-red-400', label: 'Overloaded' },
  compensating: { bg: 'bg-amber-500/15', ring: 'ring-amber-400/60', dot: 'bg-amber-400', label: 'Compensating' },
  normal: { bg: 'bg-emerald-500/10', ring: 'ring-emerald-400/40', dot: 'bg-emerald-400', label: 'Within range' },
};

const PART_KIND_STYLE: Record<SpotlightPart['kind'], { fill: string; ring: string; text: string; icon: string }> = {
  muscle: { fill: 'bg-fuchsia-500', ring: 'ring-fuchsia-300', text: 'text-fuchsia-50', icon: 'M' },
  link: { fill: 'bg-cyan-500', ring: 'ring-cyan-300', text: 'text-cyan-50', icon: 'L' },
  attachment: { fill: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-50', icon: 'A' },
};

export interface SlingPartTreatmentRecord {
  partId: string;
  partKind: SpotlightPart['kind'];
  partLabel: string;
  ref: string;
  slingId: SlingId;
  interventionId: string;
  interventionLabel: string;
  modality: PartIntervention['modality'];
  intervention: PartIntervention['intervention'];
  rationale: string;
  dosage: string;
  /** Activation delta the engine layer applied so undo can reverse it. */
  appliedActivationDelta: number;
  /** Optional muscle override patch composed into the engine when applied. */
  appliedMuscleOverridePatch?: PartIntervention['muscleOverridePatch'];
  /** Cart item id added when applied so undo can also remove the cart item. */
  cartItemId?: string;
  movementTaskId?: string | null;
  appliedAt: number;
}

interface Props {
  analysis: SlingAnalysisResult;
  painMarkers: SpotlightInputMarker[];
  pinnedSpotlightSlingId: SlingId | null;
  onPin: (slingId: SlingId | null) => void;
  selectedSlingId: SlingId | null;
  onSelectSling: (slingId: SlingId) => void;
  onExpandDetail: (slingId: SlingId) => void;
  /** Pre-computed pick from PhysioGPT — kept in sync with the 3D
   *  highlight via slingPathwayVisualization.activeSlingId. */
  spotlightPick: SpotlightPick;
  movementTaskId: string | null;
  primaryPainRegion?: string | null;
  slingActivationOverrides: Partial<Record<SlingId, number>>;
  onApplyPartTreatment: (rec: SlingPartTreatmentRecord, cartItem: PlanCartItem) => void;
  onClearPartTreatment: (partId: string) => void;
  slingDrivenRecommendations: SlingDrivenRecommendation[];
  partTreatments: Record<string, SlingPartTreatmentRecord>;
  /** Live bone screen positions ref from the 3D viewer. Used to anchor
   *  per-part hotspot dots over the skeleton. */
  boneScreenPositionsRef: React.MutableRefObject<BoneScreenPosition[]>;
  /** Switches the right side panel to the Sling Analysis tab so the
   *  clinician can dive into the full breakdown. */
  onJumpToSlingTab?: () => void;
  /** True when the active sling failure scenario is at its failure
   *  frame — hotspots whose anchor bone is in failureBoneSet pulse to
   *  flag the symptom-cause beat link. */
  pulseAtFailureBeat?: boolean;
  failureBoneSet?: Set<string>;
  onClose: () => void;
}

const recToCartItem = slingRecToCartItem;
const partToCartItem = slingPartToCartItem;

export default function MovementSlingSpotlight(props: Props) {
  const {
    analysis,
    pinnedSpotlightSlingId,
    onPin,
    selectedSlingId,
    onSelectSling,
    onExpandDetail,
    spotlightPick,
    movementTaskId,
    primaryPainRegion,
    slingActivationOverrides,
    onApplyPartTreatment,
    onClearPartTreatment,
    slingDrivenRecommendations,
    partTreatments,
    boneScreenPositionsRef,
    onJumpToSlingTab,
    pulseAtFailureBeat,
    failureBoneSet,
    onClose,
  } = props;
  const { add: addToCart, has: cartHas, remove: removeFromCart } = usePlanCart();

  const sling = useMemo(
    () => analysis.slings.find(s => s.slingId === spotlightPick.slingId) ?? null,
    [spotlightPick, analysis],
  );

  const markerBoneSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of props.painMarkers) if (m.nearestBone) s.add(m.nearestBone);
    return s;
  }, [props.painMarkers]);

  const parts = useMemo(() => sling ? getSlingParts(sling, markerBoneSet) : [], [sling, markerBoneSet]);

  const [openPartId, setOpenPartId] = useState<string | null>(null);

  // Live screen-position polling for 3D hotspots (60 ms tick — the viewer
  // emits bone positions every 5 frames, so this is plenty smooth without
  // re-rendering on every animation frame).
  const [hotspotPositions, setHotspotPositions] = useState<BoneScreenPosition[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastSnapshotRef = useRef<string>('');
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const incoming = boneScreenPositionsRef.current;
      const sig = incoming.map(p => `${p.boneName}:${Math.round(p.screenX)}:${Math.round(p.screenY)}:${p.visible ? 1 : 0}`).join('|');
      if (sig !== lastSnapshotRef.current) {
        lastSnapshotRef.current = sig;
        setHotspotPositions(incoming);
      }
      rafRef.current = window.setTimeout(tick, 80) as unknown as number;
    };
    rafRef.current = window.setTimeout(tick, 80) as unknown as number;
    return () => {
      cancelled = true;
      if (rafRef.current !== null) window.clearTimeout(rafRef.current);
    };
  }, [boneScreenPositionsRef]);

  if (!sling) return null;
  const style = STATUS_STYLE[sling.status] ?? STATUS_STYLE.compensating;
  const isPinned = pinnedSpotlightSlingId === sling.slingId;
  const overrideLevel = slingActivationOverrides[sling.slingId];
  const isBoosted = overrideLevel !== undefined && overrideLevel > SLING_ACTIVATION_BASELINE + 0.5;
  const isReduced = overrideLevel !== undefined && overrideLevel < SLING_ACTIVATION_BASELINE - 0.5;
  const wl = sling.weakLinks[0];
  const isSelected = selectedSlingId === sling.slingId;
  // Treatment state is movement-scoped: per-part records are keyed by
  // `${movementTaskId}::${partId}` so the same anatomical part treated
  // under different movements stays distinct.
  const partKey = (id: string) => `${movementTaskId ?? 'no_task'}::${id}`;
  const slingPartTreatments = useMemo(
    () => Object.values(partTreatments).filter(
      rec => rec.slingId === sling.slingId && (rec.movementTaskId ?? null) === (movementTaskId ?? null),
    ),
    [partTreatments, sling.slingId, movementTaskId],
  );

  const slingRecs = slingDrivenRecommendations.filter(r => r.slingId === sling.slingId);

  const handleTreatSling = () => {
    if (slingRecs.length === 0) return;
    for (const r of slingRecs) {
      const item = recToCartItem(r, movementTaskId);
      if (!cartHas(item.id)) addToCart(item);
    }
  };

  const posByBone = new Map<string, BoneScreenPosition>();
  for (const p of hotspotPositions) if (p.visible) posByBone.set(p.boneName, p);

  const hotspotForPart = (part: SpotlightPart): { x: number; y: number } | null => {
    if (part.anchorBones.length === 0) return null;
    const positions = part.anchorBones.map(b => posByBone.get(b)).filter((p): p is BoneScreenPosition => !!p);
    if (positions.length === 0) return null;
    const x = positions.reduce((s, p) => s + p.screenX, 0) / positions.length;
    const y = positions.reduce((s, p) => s + p.screenY, 0) / positions.length;
    return { x, y };
  };

  const applyIntervention = (part: SpotlightPart, intv: PartIntervention) => {
    const cartItem = partToCartItem(part, intv, sling, movementTaskId);
    const rec: SlingPartTreatmentRecord = {
      partId: partKey(part.id),
      partKind: part.kind,
      partLabel: part.label,
      ref: part.ref,
      slingId: sling.slingId,
      interventionId: intv.id,
      interventionLabel: intv.label,
      modality: intv.modality,
      intervention: intv.intervention,
      rationale: intv.rationale,
      dosage: intv.dosage,
      appliedActivationDelta: intv.slingActivationDelta,
      appliedMuscleOverridePatch: intv.muscleOverridePatch,
      cartItemId: cartItem.id,
      movementTaskId: movementTaskId ?? undefined,
      appliedAt: Date.now(),
    };
    onApplyPartTreatment(rec, cartItem);
  };

  const clearTreatment = (key: string) => {
    const rec = partTreatments[key];
    if (rec?.cartItemId) removeFromCart(rec.cartItemId);
    onClearPartTreatment(key);
  };

  return (
    <>
      {/* ---- 3D hotspot dots anchored to bone screen positions ---- */}
      <div className="absolute inset-0 z-20 pointer-events-none" data-testid="spotlight-hotspot-layer">
        {parts.map(p => {
          const pos = hotspotForPart(p);
          if (!pos) return null;
          const ks = PART_KIND_STYLE[p.kind];
          const treated = !!partTreatments[partKey(p.id)];
          const isOpen = openPartId === p.id;
          const size = 14 + Math.round(p.intensity * 8);
          const pulsing = !!pulseAtFailureBeat && (
            !failureBoneSet || failureBoneSet.size === 0 ||
            p.anchorBones.some(b => failureBoneSet.has(b))
          );
          return (
            <button
              key={`hotspot-${p.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPartId(prev => prev === p.id ? null : p.id);
              }}
              data-pulsing={pulsing ? 'true' : 'false'}
              className={`absolute rounded-full ${ks.fill} ${ks.text} font-mono text-[8px] font-bold flex items-center justify-center pointer-events-auto shadow-lg ring-2 ring-white/40 hover:ring-white/80 transition-all ${
                isOpen ? `ring-2 ${ks.ring} scale-110` : ''
              } ${p.markerBiased ? 'shadow-[0_0_0_2px_rgba(244,63,94,0.7)]' : ''} ${treated ? 'after:content-["✓"] after:absolute after:-bottom-1 after:-right-1 after:w-3 after:h-3 after:rounded-full after:bg-emerald-500 after:text-white after:text-[7px] after:flex after:items-center after:justify-center' : ''} ${pulsing ? 'animate-pulse ring-rose-400 shadow-[0_0_14px_4px_rgba(244,63,94,0.55)]' : ''}`}
              style={{
                left: `${pos.x - size / 2}px`,
                top: `${pos.y - size / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.5 + p.intensity * 0.5,
              }}
              title={`${p.label} · ${p.kind} · ${treated ? 'treated — click to review' : (p.intensity > 0.5 ? 'needs work' : 'looks ok')}${p.markerBiased ? ' · marker-biased' : ''}`}
              data-testid={`spotlight-hotspot-${p.id}`}
            >
              {ks.icon}
            </button>
          );
        })}
      </div>

      {/* ---- Spotlight overlay panel ---- */}
      <div
        className={`absolute bottom-2 right-2 z-30 w-[340px] max-h-[75%] overflow-y-auto rounded-lg border-2 bg-slate-900/96 backdrop-blur-sm shadow-2xl ${style.bg}`}
        style={{ borderColor: sling.color }}
        data-testid="movement-sling-spotlight"
      >
        <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-700/70 bg-slate-900/96">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wide">Sling Spotlight</span>
          <span className="text-[8px] text-slate-500" data-testid="spotlight-confidence">
            · {Math.round(spotlightPick.confidence * 100)}% conf.
          </span>
          <button
            type="button"
            onClick={() => onPin(isPinned ? null : sling.slingId)}
            className={`ml-auto h-6 px-1.5 rounded border text-[9px] flex items-center gap-1 ${
              isPinned
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-600/60 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
            }`}
            title={isPinned ? 'Unpin spotlight' : 'Pin this sling so the spotlight stays here'}
            data-testid="spotlight-pin-toggle"
          >
            {isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 flex items-center justify-center"
            title="Hide spotlight"
            data-testid="spotlight-close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sling.color }} />
            <button
              type="button"
              onClick={() => onSelectSling(sling.slingId)}
              className="text-[12px] font-semibold text-slate-100 truncate flex-1 text-left hover:underline"
              data-testid="spotlight-header"
            >
              {sling.label}
            </button>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold ${style.bg} ${style.dot.replace('bg-', 'text-')}`}>
              {style.label}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 italic" data-testid="spotlight-reason">
            {spotlightPick.reasonText}
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectSling(sling.slingId);
              onExpandDetail(sling.slingId);
              onJumpToSlingTab?.();
            }}
            className="w-full flex items-center justify-center gap-1 px-1.5 py-1 rounded border border-slate-600/60 bg-slate-800/60 hover:bg-slate-700/70 text-slate-200 text-[9px]"
            data-testid="spotlight-open-full"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Open full sling analysis
          </button>

          <div className={`rounded p-1.5 ring-1 ${style.ring} bg-slate-900/40 space-y-1`}>
            <div className="flex items-center gap-2 text-[9px] text-slate-300">
              <Activity className="w-3 h-3 text-slate-400" />
              <span>Activation</span>
              <span className="font-mono text-slate-100">{Math.round(sling.activationScore)}%</span>
              {(isBoosted || isReduced) && (
                <span className={`text-[8px] ${isBoosted ? 'text-emerald-300' : 'text-rose-300'}`} title={`Treatment level ${Math.round(overrideLevel!)}% (baseline ${SLING_ACTIVATION_BASELINE}%)`}>
                  ({isBoosted ? '+' : ''}{Math.round(overrideLevel! - SLING_ACTIVATION_BASELINE)}% Rx)
                </span>
              )}
              <span className="ml-auto text-slate-500">FTQ: <span className="text-slate-200 capitalize">{sling.forceTransferQuality}</span></span>
            </div>
            {wl && (
              <div className="text-[9px] text-slate-300" data-testid="spotlight-weak-link">
                <span className="text-slate-500 uppercase tracking-wide mr-1">Weak link:</span>
                <span className="text-orange-300">{wl.muscle}</span>
                <span className="text-slate-500"> ({Math.round(wl.activationPct)}%)</span>
                <span className="text-slate-500 italic ml-1">— engine-detected</span>
              </div>
            )}
            {sling.clinicalConsequences[0] && (
              <div className="text-[9px] text-slate-400 italic leading-snug">{sling.clinicalConsequences[0]}</div>
            )}
            {(movementTaskId || primaryPainRegion) && (
              <div className="text-[8px] text-slate-500 flex flex-wrap gap-1.5">
                {movementTaskId && <span>Task: <span className="text-slate-300">{movementTaskId}</span></span>}
                {primaryPainRegion && <span>Pain: <span className="text-rose-300">{primaryPainRegion}</span></span>}
              </div>
            )}
          </div>

          {slingRecs.length > 0 && (
            <button
              type="button"
              onClick={handleTreatSling}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-[10px] font-semibold"
              data-testid="spotlight-treat-sling"
            >
              <Sparkles className="w-3 h-3" />
              Treat this sling — drop {slingRecs.length} item{slingRecs.length === 1 ? '' : 's'} into Plan Cart
            </button>
          )}

          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1.5">
              <span>Per-part interventions</span>
              <span className="text-slate-500 normal-case font-normal">· tap a hotspot or chip</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {parts.map(p => {
                const ks = PART_KIND_STYLE[p.kind];
                const treated = !!partTreatments[partKey(p.id)];
                const isOpen = openPartId === p.id;
                const opacity = isSelected ? Math.max(0.55, p.intensity) : Math.max(0.4, p.intensity * 0.85);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpenPartId(prev => prev === p.id ? null : p.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${ks.fill}/15 ${ks.text} hover:${ks.fill}/25 flex items-center gap-1 transition-all ${
                      isOpen ? `ring-2 ${ks.ring}` : ''
                    } ${p.markerBiased ? 'shadow-[0_0_0_1px_rgba(244,63,94,0.6)]' : ''}`}
                    style={{ opacity }}
                    title={`${p.kind} · ${treated ? 'treated — click to review' : (p.intensity > 0.5 ? 'needs work' : 'looks ok')} · click for interventions${p.markerBiased ? ' (marker-biased — engine still chooses weak link)' : ''}`}
                    data-testid={`spotlight-part-${p.id}`}
                  >
                    <span className="font-mono opacity-60">{ks.icon}</span>
                    <span>{p.label}</span>
                    {treated && <Check className="w-2.5 h-2.5 text-emerald-300" />}
                  </button>
                );
              })}
            </div>
          </div>

          {openPartId && (() => {
            const p = parts.find(x => x.id === openPartId);
            if (!p) return null;
            const interventions = getPartInterventions(p, sling);
            const treated = partTreatments[partKey(p.id)];
            return (
              <div className="rounded border border-slate-700/70 bg-slate-950/70 p-1.5 space-y-1.5" data-testid={`spotlight-popover-${p.id}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-200">
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                  <span className="font-medium truncate flex-1">{p.label}</span>
                  <span className="text-[8px] text-slate-500 uppercase">{p.kind}</span>
                  {treated && (
                    <button
                      type="button"
                      onClick={() => clearTreatment(partKey(p.id))}
                      className="text-[8px] text-slate-400 hover:text-slate-100 underline"
                      data-testid={`spotlight-clear-${p.id}`}
                    >
                      Undo
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {interventions.map(intv => {
                    const isApplied = treated?.interventionId === intv.id;
                    return (
                      <div
                        key={intv.id}
                        className={`rounded border p-1.5 space-y-0.5 ${
                          isApplied ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700/60 bg-slate-900/60'
                        }`}
                        data-testid={`spotlight-intv-${intv.id}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-slate-100 flex-1">{intv.label}</span>
                          <span className="text-[8px] px-1 py-px rounded bg-slate-800 text-slate-300 capitalize">{intv.modality.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 leading-snug">{intv.rationale}</div>
                        <div className="text-[8px] text-slate-500">Dosage: {intv.dosage}</div>
                        <div className="flex gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => isApplied ? clearTreatment(partKey(p.id)) : applyIntervention(p, intv)}
                            className={`flex-1 text-[9px] px-1.5 py-1 rounded border font-medium ${
                              isApplied
                                ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-100'
                                : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/30'
                            }`}
                            data-testid={`spotlight-treat-${intv.id}`}
                          >
                            {isApplied
                              ? '✓ Treating — undo'
                              : `Treat (re-sim ${intv.slingActivationDelta >= 0 ? '+' : ''}${intv.slingActivationDelta}% + add to cart)`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[8px] text-slate-500 italic pt-0.5 border-t border-slate-800">
                  Live re-simulation: Treat composes the per-part patch into the engine, re-scores the spotlight, and tags the cart item.
                  {p.markerBiased && ' Markers biased this chip but the engine still chose the weak link.'}
                </div>
              </div>
            );
          })()}

          {slingPartTreatments.length > 0 && (
            <div className="border-t border-slate-800 pt-1 space-y-1" data-testid="spotlight-active-treatments">
              <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1">
                <span>Active per-part ({slingPartTreatments.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    for (const rec of slingPartTreatments) clearTreatment(rec.partId);
                  }}
                  className="ml-auto text-[8px] text-slate-400 hover:text-slate-100 underline normal-case font-normal"
                  data-testid="spotlight-clear-all"
                  title="Remove all per-part treatments for this sling"
                >
                  Reset sling
                </button>
              </div>
              <ul className="space-y-0.5">
                {slingPartTreatments.map(rec => (
                  <li
                    key={rec.partId}
                    className="flex items-center gap-1.5 text-[9px] text-slate-300 bg-slate-950/50 rounded px-1.5 py-0.5"
                    data-testid={`spotlight-active-${rec.partId}`}
                  >
                    <span className="font-mono text-[8px] text-slate-500 uppercase">{rec.partKind[0]}</span>
                    <span className="truncate flex-1">
                      <span className="text-slate-100">{rec.partLabel}</span>
                      <span className="text-slate-500"> · {rec.interventionLabel}</span>
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono shrink-0">
                      {rec.appliedActivationDelta >= 0 ? '+' : ''}{rec.appliedActivationDelta}%
                    </span>
                    <button
                      type="button"
                      onClick={() => clearTreatment(rec.partId)}
                      className="text-slate-500 hover:text-rose-300 shrink-0"
                      title="Remove this per-part treatment"
                      data-testid={`spotlight-active-remove-${rec.partId}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
