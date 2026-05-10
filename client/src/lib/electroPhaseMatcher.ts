/**
 * Phase ↔ electrophysical-modality matcher.
 *
 * Inputs come from Task #160's ElectrophysicalEngine result and from the
 * Recovery Simulator's per-phase context. The matcher ranks each modality
 * by how well it fits the phase, using:
 *   1. stageAppropriateness text overlap with the phase stage label.
 *   2. goalTitle / goalDescription overlap with the phase primary goal.
 *   3. evidenceGrade (A > B > C).
 *
 * Returns at most `limit` modalities (default 3).
 */

import type {
  ElectrophysicalPlan,
  ModalityItem,
  ModalityGroup,
} from '@/components/skeleton/ElectrophysicalEngineTab';

export type PhaseStage = 'acute' | 'subacute' | 'remodeling' | 'return-to-sport' | 'maintenance' | string;

export interface PhaseMatchInput {
  /** Phase label from the archetype (e.g. "Inflammatory", "Early loading",
   *  "Remodeling", "Return to sport"). Free-form. */
  phaseLabel: string;
  /** Primary goal of the phase, free text (e.g. "pain control",
   *  "tissue healing", "loading capacity"). May be empty. */
  primaryGoal?: string;
  /** Phase index (0-based) in the archetype, used as a secondary stage hint. */
  phaseIndex?: number;
  totalPhases?: number;
}

export interface PhaseModalityMatch {
  groupId: string;
  groupTitle: string;
  modality: ModalityItem;
  score: number;
  matchedOn: string[];
}

const STAGE_KEYWORDS: Record<string, string[]> = {
  acute: ['acute', 'inflammatory', 'protect', 'early', 'freezing', 'irritable', 'flare'],
  subacute: ['subacute', 'proliferative', 'early loading', 'isometric', 'mobilis', 'sub-acute'],
  remodeling: ['remodel', 'maturation', 'strengthen', 'capacity', 'late', 'thawing'],
  'return-to-sport': ['return', 'sport', 'plyo', 'power', 'sport-specific', 'rts', 'performance'],
  maintenance: ['maintenance', 'long-term', 'monitoring'],
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  pain: ['pain', 'analges', 'tens', 'modulation', 'gate'],
  healing: ['heal', 'tissue', 'repair', 'inflammation', 'recovery', 'regeneration'],
  loading: ['load', 'strengthen', 'capacity', 'hypertrophy', 'eccentric', 'nmes', 'activation'],
  mobility: ['mobil', 'rom', 'traction', 'stretch', 'fascial'],
  activation: ['activation', 'recruit', 'nmes', 'fes', 'motor'],
};

function normalize(s: string): string {
  return (s || '').toLowerCase();
}

function inferStageFromLabel(label: string): keyof typeof STAGE_KEYWORDS | null {
  const l = normalize(label);
  for (const [stage, kws] of Object.entries(STAGE_KEYWORDS)) {
    if (kws.some(k => l.includes(k))) return stage as keyof typeof STAGE_KEYWORDS;
  }
  return null;
}

function inferStageFromIndex(phaseIndex?: number, totalPhases?: number): keyof typeof STAGE_KEYWORDS | null {
  if (phaseIndex == null || totalPhases == null || totalPhases <= 0) return null;
  const ratio = phaseIndex / Math.max(1, totalPhases - 1);
  if (ratio <= 0.2) return 'acute';
  if (ratio <= 0.55) return 'subacute';
  if (ratio < 0.85) return 'remodeling';
  return 'return-to-sport';
}

function gradeScore(grade?: string): number {
  if (grade === 'A') return 1.0;
  if (grade === 'B') return 0.6;
  if (grade === 'C') return 0.3;
  return 0;
}

export function matchModalitiesForPhase(
  plan: ElectrophysicalPlan | null,
  phase: PhaseMatchInput,
  limit: number = 3,
): PhaseModalityMatch[] {
  if (!plan || !plan.modalityGroups || plan.modalityGroups.length === 0) return [];

  const stage = inferStageFromLabel(phase.phaseLabel) ?? inferStageFromIndex(phase.phaseIndex, phase.totalPhases);
  const stageKws = stage ? STAGE_KEYWORDS[stage] : [];
  const goalKey = (phase.primaryGoal ?? '').toLowerCase();
  const inferredGoalKey = (Object.keys(GOAL_KEYWORDS) as Array<keyof typeof GOAL_KEYWORDS>).find(k =>
    goalKey.includes(k) || GOAL_KEYWORDS[k].some(kw => goalKey.includes(kw)),
  );
  const goalKws = inferredGoalKey ? GOAL_KEYWORDS[inferredGoalKey] : [];

  const candidates: PhaseModalityMatch[] = [];

  plan.modalityGroups.forEach((group: ModalityGroup) => {
    const groupTitle = group.goalTitle || group.groupId;
    const groupBlob = normalize(`${group.goalTitle} ${group.goalDescription}`);
    group.modalities.forEach(mod => {
      if (mod.notAdvisedReason) return;
      const stageBlob = normalize(mod.stageAppropriateness ?? '');
      const matchedOn: string[] = [];
      let score = 0;

      if (stageKws.length > 0) {
        const hits = stageKws.filter(k => stageBlob.includes(k) || groupBlob.includes(k));
        if (hits.length > 0) {
          score += 1.0 + 0.2 * hits.length;
          matchedOn.push(`stage:${stage}`);
        } else if (stage && !stageBlob && !groupBlob) {
          score += 0.1;
        }
      }

      if (goalKws.length > 0) {
        const goalHits = goalKws.filter(k => groupBlob.includes(k) || normalize(mod.modality).includes(k) || normalize(mod.targetFinding).includes(k));
        if (goalHits.length > 0) {
          score += 0.6 + 0.15 * goalHits.length;
          matchedOn.push(`goal:${inferredGoalKey}`);
        }
      }

      score += gradeScore(mod.evidenceGrade);
      score += Math.max(0, (10 - group.priority) * 0.05);

      candidates.push({
        groupId: group.groupId,
        groupTitle,
        modality: mod,
        score,
        matchedOn,
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate by modality name, prefer highest-scoring instance.
  const seen = new Set<string>();
  const unique: PhaseModalityMatch[] = [];
  for (const c of candidates) {
    const key = c.modality.modality.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
    if (unique.length >= limit) break;
  }
  return unique;
}

/** Extract a one-line dosing summary from the modality's `parameters`
 *  free-text field. We trim, take the first ~80 chars, and strip
 *  common trailing punctuation. */
export function dosingOneLiner(mod: ModalityItem): string {
  const raw = (mod.parameters || '').trim();
  if (!raw) return '—';
  const firstLine = raw.split(/\n|;/)[0].trim();
  if (firstLine.length <= 90) return firstLine;
  return firstLine.slice(0, 87).replace(/[\s,;:]+$/, '') + '…';
}
