/**
 * Compensation Re-Education → Plan Cart bridge.
 *
 * Translates the phased retraining plan attached to an enriched
 * compensation into PlanCartItem[] (one item per phase) so the AI
 * Treatment Orchestrator and My Plan can see the progression with
 * full gate criteria, example interventions, and provenance back
 * to the originating compensation.
 *
 * Pure functions — no React, no engine imports beyond library types.
 */
import { makeCartId, type PlanCartItem, type PlanCartModality } from '@/lib/planCart';
import type { RetrainingPhase, RetrainingPlan } from '@/lib/compensationLibrary';
import type { EnrichedCompensation } from '@/lib/compensationReEducation';

const PHASE_LABEL_TAG: Record<RetrainingPhase['id'], string> = {
  tissue_extensibility: 'Phase 1 · Tissue extensibility',
  unloaded_pattern: 'Phase 2 · Unloaded pattern',
  loaded: 'Phase 3 · Loaded',
  functional: 'Phase 4 · Functional',
  accept_residual: 'Phase 5 · Accept residual',
};

/** Phases are coached, hands-on retraining — closest cart modality is exercise. */
const PHASE_MODALITY: PlanCartModality = 'exercise';

export interface CompensationPlanCartContext {
  /** Active movement task id, e.g. "leftShoulder:flexion". */
  movementTaskId: string | null;
}

/** Build one PlanCartItem per phase of the better-pattern's retraining
 *  plan. Items carry stable ids that include the compensation id +
 *  phase id so re-pushing the same plan is idempotent. */
export function compensationPhasesToCartItems(
  comp: EnrichedCompensation,
  plan: RetrainingPlan,
  ctx: CompensationPlanCartContext,
): PlanCartItem[] {
  const taskKey = ctx.movementTaskId ? `task_${ctx.movementTaskId}_` : '';
  const movementLabel = `${comp.joint} ${comp.movement}`.replace(/_/g, ' ').trim();
  const targetFindingBase = `Re-Ed · ${movementLabel} · ${comp.matchedPatternLabel ?? 'compensation'}`;

  return plan.phases.map((phase, idx) => {
    const phaseTag = PHASE_LABEL_TAG[phase.id];
    const exampleLine = phase.exampleInterventions.length
      ? phase.exampleInterventions.slice(0, 3).join(' · ')
      : '';
    return {
      id: makeCartId(PHASE_MODALITY, `re_ed_${taskKey}${comp.id}_${phase.id}`),
      modality: PHASE_MODALITY,
      name: `${phaseTag}: ${phase.label}`,
      targetStructure: comp.betterPatternLabel ?? plan.label,
      targetFinding: `${targetFindingBase}${ctx.movementTaskId ? ` · ${ctx.movementTaskId}` : ''}`,
      dosage: exampleLine,
      rationale: `${phase.goal}${exampleLine ? `  Examples: ${exampleLine}.` : ''}`,
      parameters: `Gate to next phase: ${phase.gateCriteria}`,
      category: `re-ed:phase-${idx + 1}`,
      movementTaskId: ctx.movementTaskId ?? undefined,
    };
  });
}

export const RE_ED_CART_CATEGORY_PREFIX = 're-ed:phase-';
