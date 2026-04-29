/**
 * Task #301 — Active Movement Mode
 *
 * Generates per-joint × per-direction active-capacity rows for a case
 * using the literature priors baked into pathologyCompensationEngine
 * plus a single GPT-4o JSON-mode call that overlays case-specific
 * adjustments. The result is persisted on case_research_syntheses
 * (column `active_capacities`) and merged into the same row by the
 * route handler.
 */
import { openai } from '../openai';

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

// Mirror of PASSIVE_ROM_TABLE from client/src/lib/pathologyCompensationEngine.ts
// kept server-side so the service has no client deps.
const PASSIVE_ROM: Record<string, Record<string, [number, number]>> = {
  leftShoulder:   { flexion: [0, 180], abduction: [0, 180], extension: [0, 60], internalRotation: [0, 70], externalRotation: [0, 90] },
  rightShoulder:  { flexion: [0, 180], abduction: [0, 180], extension: [0, 60], internalRotation: [0, 70], externalRotation: [0, 90] },
  leftHip:        { flexion: [0, 120], extension: [0, 30], abduction: [0, 45], adduction: [0, 30], internalRotation: [0, 45], externalRotation: [0, 45] },
  rightHip:       { flexion: [0, 120], extension: [0, 30], abduction: [0, 45], adduction: [0, 30], internalRotation: [0, 45], externalRotation: [0, 45] },
  leftKnee:       { flexion: [0, 140], extension: [0, 0] },
  rightKnee:      { flexion: [0, 140], extension: [0, 0] },
  leftAnkle:      { dorsiflexion: [0, 20], plantarflexion: [0, 50], inversion: [0, 35], eversion: [0, 20] },
  rightAnkle:     { dorsiflexion: [0, 20], plantarflexion: [0, 50], inversion: [0, 35], eversion: [0, 20] },
  lumbar_spine:   { flexion: [0, 60], extension: [0, 25], rotation: [0, 5], lateralFlexion: [0, 25] },
  cervical_spine: { flexion: [0, 50], extension: [0, 60], rotation: [0, 80], lateralFlexion: [0, 45] },
  thoracic_spine: { flexion: [0, 40], extension: [0, 20], rotation: [0, 35], lateralFlexion: [0, 25] },
  leftElbow:      { flexion: [0, 140] },
  rightElbow:     { flexion: [0, 140] },
};

function buildBaselineRows(): ActiveCapacityRow[] {
  const rows: ActiveCapacityRow[] = [];
  for (const [joint, dirs] of Object.entries(PASSIVE_ROM)) {
    for (const [movement, [pmin, pmax]] of Object.entries(dirs)) {
      const span = pmax - pmin;
      rows.push({
        joint, movement,
        passiveRomMin: pmin, passiveRomMax: pmax,
        activeRomMin: pmin, activeRomMax: pmin + span * 0.85,
        painfulArc: null,
        activeStrengthPct: 100,
        painInhibitionFactor: 0,
        source: 'pathology-baseline',
      });
    }
  }
  return rows;
}

const SYSTEM_PROMPT = `You are a senior physiotherapist specialised in assessing active movement capacity. You receive a case (free-text condition + case summary + a short summary of the literature retrieved for the case) and a baseline table of joints × movements with passive ROM and a default active ROM. Your job is to PATCH the table with case-specific active-movement findings.

Return JSON of the shape:
{
  "patches": [
    {
      "joint": "<key from input>",
      "movement": "<key from input>",
      "activeRomMin": <number 0-180>,
      "activeRomMax": <number 0-180>,
      "painfulArc": null | { "start": <number>, "end": <number>, "intensity": <1-10> },
      "activeStrengthPct": <number 0-100>,
      "painInhibitionFactor": <number 0-1>,
      "rationale": "<one short sentence, ≤140 chars, citing pathology mechanism>"
    }
  ],
  "rationaleSummary": "<one short paragraph (≤400 chars) summarising the active-movement profile for this case>"
}

Rules:
- Patch ONLY the joint × movement combinations that are clinically relevant to the case. Leave the rest at baseline by NOT including them.
- activeRomMax must always be ≤ passiveRomMax for that joint/movement.
- Painful arcs only when there is a clear pathomechanical reason (impingement, capsule contracture, meniscus pinching, end-range tendon load, etc.).
- Use evidence from the supplied literature summary when relevant; do not cite papers explicitly.
- Be conservative: prefer mild reductions unless the case clearly warrants severe restriction.
`;

function safeJSONParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

function applyPatches(baseline: ActiveCapacityRow[], patches: any[]): ActiveCapacityRow[] {
  if (!Array.isArray(patches)) return baseline;
  const map = new Map<string, ActiveCapacityRow>();
  for (const r of baseline) map.set(`${r.joint}:${r.movement}`, r);
  for (const p of patches) {
    if (!p || typeof p !== 'object') continue;
    const key = `${p.joint}:${p.movement}`;
    const row = map.get(key);
    if (!row) continue;
    const next: ActiveCapacityRow = { ...row, source: 'ai' };
    if (typeof p.activeRomMin === 'number') next.activeRomMin = Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, p.activeRomMin));
    if (typeof p.activeRomMax === 'number') next.activeRomMax = Math.max(next.activeRomMin, Math.min(row.passiveRomMax, p.activeRomMax));
    if (p.painfulArc === null) next.painfulArc = null;
    else if (p.painfulArc && typeof p.painfulArc === 'object') {
      const start = Number(p.painfulArc.start);
      const end = Number(p.painfulArc.end);
      const intensity = Number(p.painfulArc.intensity);
      if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(intensity)) {
        next.painfulArc = {
          start: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, start)),
          end: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, end)),
          intensity: Math.max(1, Math.min(10, Math.round(intensity))),
        };
      }
    }
    if (typeof p.activeStrengthPct === 'number') next.activeStrengthPct = Math.max(0, Math.min(100, p.activeStrengthPct));
    if (typeof p.painInhibitionFactor === 'number') next.painInhibitionFactor = Math.max(0, Math.min(1, p.painInhibitionFactor));
    if (typeof p.rationale === 'string') next.rationale = p.rationale.slice(0, 240);
    map.set(key, next);
  }
  return Array.from(map.values());
}

export async function generateActiveCapacities(input: {
  condition: string;
  caseSummary: string;
  literatureSummary?: string;
}): Promise<ActiveCapacityProfile> {
  const baseline = buildBaselineRows();
  const baselinePayload = baseline.map(r => ({
    joint: r.joint,
    movement: r.movement,
    passiveRomMin: r.passiveRomMin,
    passiveRomMax: r.passiveRomMax,
    defaultActiveRomMin: r.activeRomMin,
    defaultActiveRomMax: r.activeRomMax,
  }));

  const userPrompt = JSON.stringify({
    condition: input.condition,
    caseSummary: input.caseSummary.slice(0, 6000),
    literatureSummary: (input.literatureSummary || '').slice(0, 4000),
    baseline: baselinePayload,
  });

  try {
    const response = await openai.chat.completions.create({
      // gpt-4o is the standard model used across this codebase.
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = safeJSONParse(content) || {};
    const rows = applyPatches(baseline, parsed.patches || []);
    return {
      rows,
      generatedAt: new Date().toISOString(),
      rationaleSummary: typeof parsed.rationaleSummary === 'string'
        ? parsed.rationaleSummary.slice(0, 800)
        : undefined,
    };
  } catch (err) {
    console.error('[activeCapacityService] AI generation failed, returning baseline:', err);
    return {
      rows: baseline,
      generatedAt: new Date().toISOString(),
      rationaleSummary: 'Baseline active capacity (AI generation unavailable).',
    };
  }
}

export function applyManualOverride(
  profile: ActiveCapacityProfile,
  patch: Partial<ActiveCapacityRow> & { joint: string; movement: string }
): ActiveCapacityProfile {
  const rows = profile.rows.map(r => {
    if (r.joint !== patch.joint || r.movement !== patch.movement) return r;
    const next: ActiveCapacityRow = { ...r, source: 'manual' };
    if (typeof patch.activeRomMin === 'number') next.activeRomMin = Math.max(r.passiveRomMin, Math.min(r.passiveRomMax, patch.activeRomMin));
    if (typeof patch.activeRomMax === 'number') next.activeRomMax = Math.max(next.activeRomMin, Math.min(r.passiveRomMax, patch.activeRomMax));
    if (patch.painfulArc === null) next.painfulArc = null;
    else if (patch.painfulArc) next.painfulArc = patch.painfulArc;
    if (typeof patch.activeStrengthPct === 'number') next.activeStrengthPct = Math.max(0, Math.min(100, patch.activeStrengthPct));
    if (typeof patch.painInhibitionFactor === 'number') next.painInhibitionFactor = Math.max(0, Math.min(1, patch.painInhibitionFactor));
    return next;
  });
  return { ...profile, rows };
}
