/**
 * Active Movement Mode
 *
 * Client hook for fetching, generating, and overriding the per-case
 * active-capacity profile. While the server profile loads (or while
 * the case has no profile yet), the hook returns a deterministic
 * passive×0.85 fallback so the viewer never has to handle a "null"
 * capacity map mid-drag.
 */
import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export type ActiveCapacityRow = {
  joint: string;
  movement: string;
  passiveRomMin: number;
  passiveRomMax: number;
  activeRomMin: number;
  activeRomMax: number;
  painfulArc: { start: number; end: number; intensity: number } | null;
  activeStrengthPct: number;
  painInhibitionFactor: number;
  source: 'pathology-baseline' | 'ai' | 'manual';
  rationale?: string;
};

export type ActiveCapacityProfile = {
  rows: ActiveCapacityRow[];
  generatedAt: string;
  rationaleSummary?: string;
};

type CaseResearchRow = {
  id: number;
  caseId: string;
  activeCapacities: ActiveCapacityProfile | null;
};

// Mirrors server PASSIVE_ROM: signed bidirectional DOFs (e.g. flexion
// covers extension on the negative side) so fallback rows match the
// viewer's signed drag-channel expectations and don't clamp out
// valid opposite-direction movement.
const PASSIVE_ROM: Record<string, Record<string, [number, number]>> = {
  leftShoulder:   { flexion: [-60, 180], abduction: [0, 180], internalRotation: [-90, 70], externalRotation: [0, 90], extension: [0, 60] },
  rightShoulder:  { flexion: [-60, 180], abduction: [0, 180], internalRotation: [-90, 70], externalRotation: [0, 90], extension: [0, 60] },
  leftHip:        { flexion: [-30, 120], abduction: [-30, 45], internalRotation: [-45, 45], extension: [0, 30] },
  rightHip:       { flexion: [-30, 120], abduction: [-30, 45], internalRotation: [-45, 45], extension: [0, 30] },
  leftKnee:       { flexion: [0, 140] },
  rightKnee:      { flexion: [0, 140] },
  leftAnkle:      { dorsiflexion: [-50, 20], inversion: [-20, 35], plantarflexion: [0, 50] },
  rightAnkle:     { dorsiflexion: [-50, 20], inversion: [-20, 35], plantarflexion: [0, 50] },
  lumbar_spine:   { flexion: [-25, 60], rotation: [-5, 5], lateralFlexion: [-25, 25], extension: [0, 25] },
  cervical_spine: { flexion: [-60, 50], rotation: [-80, 80], lateralFlexion: [-45, 45], extension: [0, 60] },
  thoracic_spine: { flexion: [-20, 40], rotation: [-35, 35], lateralFlexion: [-25, 25], extension: [0, 20] },
  leftElbow:      { flexion: [0, 140] },
  rightElbow:     { flexion: [0, 140] },
};

function buildFallbackProfile(): ActiveCapacityProfile {
  const rows: ActiveCapacityRow[] = [];
  for (const [joint, dirs] of Object.entries(PASSIVE_ROM)) {
    for (const [movement, [pmin, pmax]] of Object.entries(dirs)) {
      // Signed-aware default active band: shrink each end of the
      // passive range by 15% of its signed extent so bidirectional
      // DOFs preserve both directions instead of collapsing toward
      // the positive end.
      const aMin = Math.round(pmin * 0.85);
      const aMax = Math.round(pmax * 0.85);
      rows.push({
        joint, movement,
        passiveRomMin: pmin, passiveRomMax: pmax,
        activeRomMin: aMin, activeRomMax: aMax,
        painfulArc: null,
        activeStrengthPct: 100,
        painInhibitionFactor: 0,
        source: 'pathology-baseline',
      });
    }
  }
  return { rows, generatedAt: new Date(0).toISOString(), rationaleSummary: 'Loading… showing default passive×0.85 capacity.' };
}

export function useActiveCapacities(caseId: string | null, enabled: boolean) {
  const query = useQuery<CaseResearchRow>({
    queryKey: ['/api/case-research', caseId],
    queryFn: async () => {
      const res = await fetch(`/api/case-research/${caseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!caseId && enabled,
  });

  const generate = useMutation({
    mutationFn: async (refresh: boolean = false) => {
      if (!caseId) throw new Error('No caseId');
      return apiRequest(`/api/active-capacity/${caseId}`, 'POST', { refresh });
    },
    onSuccess: () => {
      if (caseId) queryClient.invalidateQueries({ queryKey: ['/api/case-research', caseId] });
    },
  });

  const override = useMutation({
    mutationFn: async (patch: Partial<ActiveCapacityRow> & { joint: string; movement: string }) => {
      if (!caseId) throw new Error('No caseId');
      return apiRequest(`/api/active-capacity/${caseId}`, 'PATCH', patch);
    },
    onMutate: async (patch) => {
      if (!caseId) return;
      await queryClient.cancelQueries({ queryKey: ['/api/case-research', caseId] });
      const prev = queryClient.getQueryData<CaseResearchRow>(['/api/case-research', caseId]);
      if (prev?.activeCapacities) {
        const nextRows = prev.activeCapacities.rows.map(r => {
          if (r.joint !== patch.joint || r.movement !== patch.movement) return r;
          return { ...r, ...patch, source: 'manual' as const };
        });
        queryClient.setQueryData(['/api/case-research', caseId], {
          ...prev,
          activeCapacities: { ...prev.activeCapacities, rows: nextRows },
        });
      }
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      const c = ctx as { prev?: CaseResearchRow } | undefined;
      if (caseId && c?.prev) {
        queryClient.setQueryData(['/api/case-research', caseId], c.prev);
      }
    },
    onSettled: () => {
      if (caseId) queryClient.invalidateQueries({ queryKey: ['/api/case-research', caseId] });
    },
  });

  const fallbackProfile = useMemo(() => buildFallbackProfile(), []);
  const serverProfile = query.data?.activeCapacities ?? null;
  const profile = serverProfile;
  // Effective profile is what callers should use to drive the viewer:
  // it falls back to the deterministic passive×0.85 baseline while
  // the server query is still loading or the case has no profile yet.
  const effectiveProfile = serverProfile ?? fallbackProfile;
  const profileMap: Record<string, ActiveCapacityRow> = {};
  for (const row of effectiveProfile.rows) profileMap[`${row.joint}:${row.movement}`] = row;

  return {
    profile,
    effectiveProfile,
    profileMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    generate,
    override,
    generating: generate.isPending,
    overriding: override.isPending,
  };
}
