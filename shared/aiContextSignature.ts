/** Stable hash of the painMarkers + intakeContext payload that the
 *  active-capacity AI generator actually consumes. Used by both the
 *  client (to detect stale persisted profiles) and the server (to
 *  short-circuit duplicate refresh requests). MUST normalize to the
 *  exact same shape on both sides. */

export type AiContextMarkerInput = {
  location?: string | null;
  type?: string | null;
  symptomType?: string | null;
  description?: string | null;
  subjectiveHistory?: string | null;
  painMechanism?: string | null;
  nerveRoot?: string | null;
  severity?: number | null;
};

export type AiContextIntakeInput = Record<string, string | number | boolean | null | undefined>;

const clip = (v: unknown, n: number): string =>
  typeof v === 'string' ? v.trim().slice(0, n) : '';

/** Build the exact normalized payload that we forward to the AI, so the
 *  signature reflects every field the model can actually see. */
export function normalizeAiContext(
  markers: AiContextMarkerInput[] | undefined,
  intake: AiContextIntakeInput | undefined,
): { markers: unknown[]; intake: Record<string, string | number | boolean> } {
  const m = (markers || [])
    .slice(0, 24)
    .map(x => [
      clip(x.location, 120),
      clip(x.type, 40),
      clip(x.symptomType, 40),
      clip(x.description, 300),
      clip(x.subjectiveHistory, 300),
      clip(x.painMechanism, 60),
      clip(x.nerveRoot, 20),
      typeof x.severity === 'number' ? x.severity : null,
    ]);
  const i: Record<string, string | number | boolean> = {};
  if (intake) {
    const sortedKeys = Object.keys(intake).sort();
    for (const k of sortedKeys) {
      const v = intake[k];
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) continue;
        i[k] = t.slice(0, 400);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        i[k] = v;
      }
    }
  }
  return { markers: m, intake: i };
}

export function computeAiContextSignature(
  markers: AiContextMarkerInput[] | undefined,
  intake: AiContextIntakeInput | undefined,
): string {
  const norm = normalizeAiContext(markers, intake);
  const json = JSON.stringify(norm);
  let h = 2166136261 >>> 0;
  for (let k = 0; k < json.length; k++) {
    h ^= json.charCodeAt(k);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
