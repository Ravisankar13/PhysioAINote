import { makeCartId, type PlanCartItem, type PlanCartModality } from '@/lib/planCart';
import type { SlingDrivenRecommendation, DriverModality } from '@/lib/slingDriverAnalysis';
import type { SlingResult } from '@/lib/slingEngine';
import type { SpotlightPart, PartIntervention } from '@/lib/movementSlingSpotlight';

export const SLING_DRIVER_MODALITY_TO_CART: Record<DriverModality, PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

export const SLING_PART_MODALITY_TO_CART: Record<PartIntervention['modality'], PlanCartModality> = {
  exercise: 'exercise',
  manual_therapy: 'manual_therapy',
  electrophysical: 'electrophysical',
  lifestyle: 'lifestyle',
};

export function slingRecToCartItem(rec: SlingDrivenRecommendation, movementTaskId: string | null = null): PlanCartItem {
  const modality = SLING_DRIVER_MODALITY_TO_CART[rec.modality];
  return {
    id: makeCartId(modality, `sling_${rec.slingId}_${rec.name}`),
    modality,
    name: rec.name,
    targetStructure: rec.target,
    targetFinding: `Sling-driven · ${rec.slingLabel}${movementTaskId ? ` · ${movementTaskId}` : ''}`,
    dosage: rec.dosage,
    rationale: rec.rationale,
    slingTag: rec.slingLabel,
    slingRole: rec.role,
    slingId: rec.slingId,
    movementTaskId: movementTaskId ?? undefined,
  };
}

export function slingPartToCartItem(
  part: SpotlightPart,
  intv: PartIntervention,
  sling: SlingResult,
  movementTaskId: string | null,
): PlanCartItem {
  const modality = SLING_PART_MODALITY_TO_CART[intv.modality];
  return {
    id: makeCartId(modality, `sling_part_${sling.slingId}_${intv.id}`),
    modality,
    name: `${intv.label} — ${part.label}`,
    targetStructure: part.label,
    targetFinding: `Sling spotlight · ${sling.label} · ${part.kind}${movementTaskId ? ` · ${movementTaskId}` : ''}`,
    dosage: intv.dosage,
    rationale: intv.rationale,
    slingTag: sling.label,
    slingId: sling.slingId,
    partId: part.id,
    partKind: part.kind,
    movementTaskId: movementTaskId ?? undefined,
  };
}
