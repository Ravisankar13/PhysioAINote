/**
 * Task #301 — Active Movement Mode
 *
 * Client hook for fetching, generating, and overriding the per-case
 * active-capacity profile. Reads/writes piggyback on the existing
 * `case_research_syntheses` row addressed by `caseId`.
 */
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

export function useActiveCapacities(caseId: string | null, enabled: boolean) {
  const query = useQuery<CaseResearchRow>({
    queryKey: ['/api/case-research', caseId],
    enabled: !!caseId && enabled,
  });

  const generate = useMutation({
    mutationFn: async (refresh: boolean = false) => {
      if (!caseId) throw new Error('No caseId');
      const res = await apiRequest('POST', `/api/active-capacity/${caseId}`, { refresh });
      return res.json();
    },
    onSuccess: () => {
      if (caseId) queryClient.invalidateQueries({ queryKey: ['/api/case-research', caseId] });
    },
  });

  const override = useMutation({
    mutationFn: async (patch: Partial<ActiveCapacityRow> & { joint: string; movement: string }) => {
      if (!caseId) throw new Error('No caseId');
      const res = await apiRequest('PATCH', `/api/active-capacity/${caseId}`, patch);
      return res.json();
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
    onError: (_err, _patch, ctx: any) => {
      if (caseId && ctx?.prev) {
        queryClient.setQueryData(['/api/case-research', caseId], ctx.prev);
      }
    },
    onSettled: () => {
      if (caseId) queryClient.invalidateQueries({ queryKey: ['/api/case-research', caseId] });
    },
  });

  const profile = query.data?.activeCapacities ?? null;
  // Build a fast lookup map keyed by `joint:movement`.
  const profileMap: Record<string, ActiveCapacityRow> = {};
  if (profile) {
    for (const row of profile.rows) profileMap[`${row.joint}:${row.movement}`] = row;
  }

  return {
    profile,
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
