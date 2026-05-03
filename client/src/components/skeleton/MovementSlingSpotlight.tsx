import { useMemo, useState } from 'react';
import { X, Pin, PinOff, Sparkles, Activity, ChevronRight, Check } from 'lucide-react';
import type { SlingAnalysisResult, SlingId, SlingResult } from '@/lib/slingEngine';
import { SLING_ACTIVATION_BASELINE } from '@/lib/slingEngine';
import {
  pickSpotlightSling,
  getSlingParts,
  getPartInterventions,
  type SpotlightInputMarker,
  type SpotlightPart,
  type PartIntervention,
} from '@/lib/movementSlingSpotlight';
import type { SlingDrivenRecommendation } from '@/lib/slingDriverAnalysis';
import { makeCartId, usePlanCart, type PlanCartItem, type PlanCartModality } from '@/lib/planCart';
import type { DriverModality } from '@/lib/slingDriverAnalysis';

const DRIVER_MODALITY_TO_CART: Record<DriverModality, PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

const PART_MODALITY_TO_CART: Record<PartIntervention['modality'], PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

const STATUS_STYLE: Record<string, { bg: string; ring: string; dot: string; label: string }> = {
  underperforming: { bg: 'bg-orange-500/15', ring: 'ring-orange-400/60', dot: 'bg-orange-400', label: 'Underperforming' },
  overloaded: { bg: 'bg-red-500/15', ring: 'ring-red-400/60', dot: 'bg-red-400', label: 'Overloaded' },
  compensating: { bg: 'bg-amber-500/15', ring: 'ring-amber-400/60', dot: 'bg-amber-400', label: 'Compensating' },
  normal: { bg: 'bg-emerald-500/10', ring: 'ring-emerald-400/40', dot: 'bg-emerald-400', label: 'Within range' },
};

const PART_KIND_STYLE: Record<SpotlightPart['kind'], { bg: string; text: string; icon: string }> = {
  muscle: { bg: 'bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border-fuchsia-400/40', text: 'text-fuchsia-100', icon: 'M' },
  link: { bg: 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/40', text: 'text-cyan-100', icon: 'L' },
  attachment: { bg: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40', text: 'text-amber-100', icon: 'A' },
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
  slingActivationOverrides: Partial<Record<SlingId, number>>;
  onApplySlingActivationDelta: (slingId: SlingId, delta: number) => void;
  slingDrivenRecommendations: SlingDrivenRecommendation[];
  partTreatments: Record<string, SlingPartTreatmentRecord>;
  onRecordPartTreatment: (rec: SlingPartTreatmentRecord) => void;
  onClearPartTreatment: (partId: string) => void;
  onClose: () => void;
}

function recToCartItem(rec: SlingDrivenRecommendation): PlanCartItem {
  const modality = DRIVER_MODALITY_TO_CART[rec.modality];
  return {
    id: makeCartId(modality, `sling_${rec.slingId}_${rec.name}`),
    modality,
    name: rec.name,
    targetStructure: rec.target,
    targetFinding: `Sling-driven · ${rec.slingLabel}`,
    dosage: rec.dosage,
    rationale: rec.rationale,
    slingTag: rec.slingLabel,
    slingRole: rec.role,
  };
}

function partToCartItem(
  part: SpotlightPart,
  intv: PartIntervention,
  sling: SlingResult,
): PlanCartItem {
  const modality = PART_MODALITY_TO_CART[intv.modality];
  return {
    id: makeCartId(modality, `sling_part_${sling.slingId}_${intv.id}`),
    modality,
    name: `${intv.label} — ${part.label}`,
    targetStructure: part.label,
    targetFinding: `Sling spotlight · ${sling.label} · per-part`,
    dosage: intv.dosage,
    rationale: intv.rationale,
    slingTag: sling.label,
  };
}

export default function MovementSlingSpotlight(props: Props) {
  const {
    analysis,
    painMarkers,
    pinnedSpotlightSlingId,
    onPin,
    selectedSlingId,
    onSelectSling,
    onExpandDetail,
    slingActivationOverrides,
    onApplySlingActivationDelta,
    slingDrivenRecommendations,
    partTreatments,
    onRecordPartTreatment,
    onClearPartTreatment,
    onClose,
  } = props;
  const { add: addToCart, has: cartHas } = usePlanCart();
  const addItems = (items: PlanCartItem[]) => { for (const it of items) if (!cartHas(it.id)) addToCart(it); };

  const pick = useMemo(
    () => pickSpotlightSling(analysis, painMarkers, pinnedSpotlightSlingId),
    [analysis, painMarkers, pinnedSpotlightSlingId],
  );
  const sling = useMemo(
    () => pick ? analysis.slings.find(s => s.slingId === pick.slingId) ?? null : null,
    [pick, analysis],
  );

  const markerBoneSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of painMarkers) if (m.nearestBone) s.add(m.nearestBone);
    return s;
  }, [painMarkers]);

  const parts = useMemo(() => sling ? getSlingParts(sling, markerBoneSet) : [], [sling, markerBoneSet]);

  const [openPartId, setOpenPartId] = useState<string | null>(null);

  if (!pick || !sling) return null;
  const style = STATUS_STYLE[sling.status] ?? STATUS_STYLE.compensating;
  const isPinned = pinnedSpotlightSlingId === sling.slingId;
  const overrideValue = slingActivationOverrides[sling.slingId];
  const baseline = SLING_ACTIVATION_BASELINE;
  const currentActivation = overrideValue !== undefined ? overrideValue : sling.activationScore;
  const wl = sling.weakLinks[0];

  const slingRecs = slingDrivenRecommendations.filter(r => r.slingId === sling.slingId);

  const handleTreatSling = () => {
    if (slingRecs.length === 0) return;
    const items = slingRecs.map(recToCartItem);
    addItems(items);
  };

  const isSelected = selectedSlingId === sling.slingId;

  return (
    <div
      className={`absolute bottom-2 right-2 z-30 w-[340px] max-h-[70%] overflow-y-auto rounded-lg border-2 bg-slate-900/96 backdrop-blur-sm shadow-2xl ${style.bg}`}
      style={{ borderColor: sling.color }}
      data-testid="movement-sling-spotlight"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-700/70 bg-slate-900/96">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wide">Sling Spotlight</span>
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
        <button
          type="button"
          onClick={() => { onSelectSling(sling.slingId); onExpandDetail(sling.slingId); }}
          className="w-full text-left"
          data-testid="spotlight-header"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sling.color }} />
            <span className="text-[12px] font-semibold text-slate-100 truncate flex-1">{sling.label}</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold ${style.bg} ${style.dot.replace('bg-', 'text-')}`}>
              {style.label}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 italic">{pick.reasonText}</div>
        </button>

        <div className={`rounded p-1.5 ring-1 ${style.ring} bg-slate-900/40 space-y-1`}>
          <div className="flex items-center gap-2 text-[9px] text-slate-300">
            <Activity className="w-3 h-3 text-slate-400" />
            <span>Activation</span>
            <span className="font-mono text-slate-100">{Math.round(currentActivation)}%</span>
            {overrideValue !== undefined && Math.round(overrideValue) !== Math.round(sling.activationScore) && (
              <span className="text-[8px] text-cyan-300">(was {Math.round(sling.activationScore)}%)</span>
            )}
            <span className="ml-auto text-slate-500">FTQ: <span className="text-slate-200 capitalize">{sling.forceTransferQuality}</span></span>
          </div>
          {wl && (
            <div className="text-[9px] text-slate-300">
              <span className="text-slate-500 uppercase tracking-wide mr-1">Weak link:</span>
              <span className="text-orange-300">{wl.muscle}</span>
              <span className="text-slate-500"> ({Math.round(wl.activationPct)}%)</span>
            </div>
          )}
          {sling.clinicalConsequences[0] && (
            <div className="text-[9px] text-slate-400 italic leading-snug">{sling.clinicalConsequences[0]}</div>
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
            <span className="text-slate-500 normal-case font-normal">· tap a chip to choose</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {parts.map(p => {
              const ks = PART_KIND_STYLE[p.kind];
              const treated = !!partTreatments[p.id];
              const isOpen = openPartId === p.id;
              const opacity = isSelected ? Math.max(0.55, p.intensity) : Math.max(0.4, p.intensity * 0.85);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenPartId(prev => prev === p.id ? null : p.id)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${ks.bg} ${ks.text} flex items-center gap-1 transition-all ${
                    isOpen ? 'ring-2 ring-white/40' : ''
                  } ${p.markerBiased ? 'shadow-[0_0_0_1px_rgba(244,63,94,0.6)]' : ''}`}
                  style={{ opacity }}
                  title={`${p.kind} · click for interventions${p.markerBiased ? ' (marker-biased — engine still chooses weak link)' : ''}`}
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
          const treated = partTreatments[p.id];
          return (
            <div className="rounded border border-slate-700/70 bg-slate-950/70 p-1.5 space-y-1.5" data-testid={`spotlight-popover-${p.id}`}>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-200">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="font-medium truncate flex-1">{p.label}</span>
                <span className="text-[8px] text-slate-500 uppercase">{p.kind}</span>
                {treated && (
                  <button
                    type="button"
                    onClick={() => onClearPartTreatment(p.id)}
                    className="text-[8px] text-slate-400 hover:text-slate-100 underline"
                    data-testid={`spotlight-clear-${p.id}`}
                  >
                    Clear
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
                          onClick={() => {
                            onApplySlingActivationDelta(sling.slingId, intv.slingActivationDelta);
                            onRecordPartTreatment({
                              partId: p.id,
                              partKind: p.kind,
                              partLabel: p.label,
                              ref: p.ref,
                              slingId: sling.slingId,
                              interventionId: intv.id,
                              interventionLabel: intv.label,
                              modality: intv.modality,
                              intervention: intv.intervention,
                              rationale: intv.rationale,
                              dosage: intv.dosage,
                              appliedAt: Date.now(),
                            });
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            isApplied
                              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                              : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                          }`}
                          data-testid={`spotlight-apply-${intv.id}`}
                        >
                          {isApplied ? '✓ Applied' : `Apply (${intv.slingActivationDelta >= 0 ? '+' : ''}${intv.slingActivationDelta}%)`}
                        </button>
                        <button
                          type="button"
                          onClick={() => addItems([partToCartItem(p, intv, sling)])}
                          className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                          data-testid={`spotlight-cart-${intv.id}`}
                        >
                          + Plan Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[8px] text-slate-500 italic pt-0.5 border-t border-slate-800">
                Live re-simulation: applying nudges the sling activation override and re-scores the spotlight immediately.
                {p.markerBiased && ' Markers biased this chip but the engine still chose the weak link.'}
              </div>
            </div>
          );
        })()}

        {Object.keys(partTreatments).length > 0 && (
          <div className="text-[8px] text-slate-500 border-t border-slate-800 pt-1">
            {Object.keys(partTreatments).length} per-part treatment{Object.keys(partTreatments).length === 1 ? '' : 's'} active.
            <button
              type="button"
              onClick={() => {
                for (const id of Object.keys(partTreatments)) onClearPartTreatment(id);
                onApplySlingActivationDelta(sling.slingId, -9999);
              }}
              className="ml-1 text-slate-400 hover:text-slate-100 underline"
              data-testid="spotlight-clear-all"
            >
              Reset
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
