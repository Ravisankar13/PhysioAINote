/**
 * Task #376 — Patient irritability profile.
 *
 * Derives a per-region irritability scalar (0 = calm, 1 = highly
 * irritable) from existing pain-marker severity, predicted-pain-layer
 * spots, and any acuity tag in the case context. Read by the
 * neuromuscular engine to scale guarding response and the threshold
 * for the withdrawal reflex.
 *
 * Pure / deterministic. No React. No AI calls.
 */

export type IrritabilityInput = {
  /** Existing pain-marker severities (0–10) keyed by anatomical region. */
  painMarkers: Array<{ region: string; severity: number; bone?: string }>;
  /** Predicted-pain layer scores (0–1) keyed by region. */
  predictedPain?: Record<string, number>;
  /** Optional acuity tag from case context. */
  acuity?: 'acute' | 'subacute' | 'chronic' | null;
};

export type RegionIrritability = {
  /** Region label, lowercased. */
  region: string;
  /** 0 = calm, 1 = highly irritable. */
  scalar: number;
  /** Brief rationale for the HUD. */
  rationale: string;
};

/** Map a model-bone name to a coarse anatomical region label. */
export function regionForBone(bone: string | undefined): string {
  if (!bone) return 'unknown';
  const b = bone.toLowerCase();
  if (b.includes('arm') || b.includes('shoulder')) return 'shoulder';
  if (b.includes('forearm') || b.includes('hand')) return 'elbow';
  if (b.includes('upleg')) return 'hip';
  if (b.includes('leg') && !b.includes('upleg')) return 'knee';
  if (b.includes('foot')) return 'ankle';
  if (b.includes('spine') || b.includes('back')) return 'spine';
  return b;
}

export function deriveIrritabilityProfile(input: IrritabilityInput): RegionIrritability[] {
  const buckets = new Map<string, { sum: number; n: number; max: number }>();
  for (const pm of input.painMarkers) {
    const region = (pm.region || regionForBone(pm.bone)).toLowerCase();
    const sev = Math.max(0, Math.min(10, pm.severity));
    const cur = buckets.get(region) ?? { sum: 0, n: 0, max: 0 };
    cur.sum += sev;
    cur.n += 1;
    cur.max = Math.max(cur.max, sev);
    buckets.set(region, cur);
  }
  if (input.predictedPain) {
    for (const [region, score] of Object.entries(input.predictedPain)) {
      const cur = buckets.get(region.toLowerCase()) ?? { sum: 0, n: 0, max: 0 };
      cur.sum += score * 6;
      cur.n += 1;
      cur.max = Math.max(cur.max, score * 10);
      buckets.set(region.toLowerCase(), cur);
    }
  }
  const acuityBoost = input.acuity === 'acute' ? 0.30 : input.acuity === 'subacute' ? 0.15 : 0;
  const out: RegionIrritability[] = [];
  for (const [region, b] of buckets.entries()) {
    const avg = b.sum / Math.max(1, b.n);
    const blended = (avg * 0.5 + b.max * 0.5) / 10;
    const scalar = Math.max(0, Math.min(1, blended + acuityBoost));
    const tag =
      scalar >= 0.7 ? 'high (acute / severe)'
        : scalar >= 0.4 ? 'moderate'
          : scalar >= 0.2 ? 'low'
            : 'minimal';
    out.push({ region, scalar, rationale: `Pain max ${Math.round(b.max)}/10, avg ${avg.toFixed(1)} → ${tag}` });
  }
  return out;
}

export function getRegionIrritability(profile: RegionIrritability[], region: string): number {
  const r = region.toLowerCase();
  const hit = profile.find(p => p.region === r);
  return hit?.scalar ?? 0;
}
