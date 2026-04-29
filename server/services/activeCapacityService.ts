/**
 * Task #301 — Active Movement Mode
 *
 * Two-stage active-capacity profile:
 *   1. A DETERMINISTIC baseline composed of passive×0.85 default
 *      active ROM, then overlaid with literature-derived restriction
 *      profiles for any AI-inferred pathologies on the case (e.g.
 *      adhesive capsulitis, RC tendinopathy, plantar fasciitis).
 *      This mirrors the client `getActiveCapacityFromPathologies`
 *      helper so the result is the same with or without the AI call.
 *   2. A single GPT-4o JSON-mode patch step that adjusts only the
 *      joint × movement combinations the case clinically warrants.
 *
 * The baseline always renders even if the AI call fails so the UI
 * is never blank.
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

export type ActiveCapacityOverridePatch = {
  joint: string;
  movement: string;
  activeRomMin?: number;
  activeRomMax?: number;
  painfulArc?: { start: number; end: number; intensity: number } | null;
  activeStrengthPct?: number;
  painInhibitionFactor?: number;
};

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

// Mirrors LITERATURE_ACTIVE_OVERLAYS in pathologyCompensationEngine.ts.
// Keys are normalised pathology slugs that the upstream phenotype
// extractor emits (see phenotypeService prompts). Each entry lists
// per-joint × movement multipliers/painful-arcs for the deterministic
// baseline.
type Overlay = {
  joints: Record<string, Record<string, {
    activeRomMaxFactor?: number;
    activeStrengthPct?: number;
    painInhibitionFactor?: number;
    painfulArc?: { start: number; end: number; intensity: number };
    rationale?: string;
  }>>;
};

const LITERATURE_OVERLAYS: Record<string, Overlay> = {
  adhesive_capsulitis_left: { joints: {
    leftShoulder: {
      flexion: { activeRomMaxFactor: 0.55, activeStrengthPct: 70, painInhibitionFactor: 0.4, painfulArc: { start: 90, end: 130, intensity: 7 }, rationale: 'Capsular contracture limits AROM with painful end-range.' },
      abduction: { activeRomMaxFactor: 0.45, activeStrengthPct: 60, painInhibitionFactor: 0.5, painfulArc: { start: 80, end: 120, intensity: 8 }, rationale: 'Marked AROM loss in capsular pattern.' },
      externalRotation: { activeRomMaxFactor: 0.4, activeStrengthPct: 55, painInhibitionFactor: 0.5, rationale: 'External rotation loss is hallmark.' },
    },
  } },
  adhesive_capsulitis_right: { joints: {
    rightShoulder: {
      flexion: { activeRomMaxFactor: 0.55, activeStrengthPct: 70, painInhibitionFactor: 0.4, painfulArc: { start: 90, end: 130, intensity: 7 } },
      abduction: { activeRomMaxFactor: 0.45, activeStrengthPct: 60, painInhibitionFactor: 0.5, painfulArc: { start: 80, end: 120, intensity: 8 } },
      externalRotation: { activeRomMaxFactor: 0.4, activeStrengthPct: 55, painInhibitionFactor: 0.5 },
    },
  } },
  rotator_cuff_tendinopathy_left: { joints: {
    leftShoulder: {
      abduction: { activeRomMaxFactor: 0.85, activeStrengthPct: 70, painInhibitionFactor: 0.3, painfulArc: { start: 60, end: 120, intensity: 6 }, rationale: 'Classic painful arc 60–120° from subacromial impingement.' },
      flexion: { activeRomMaxFactor: 0.9, activeStrengthPct: 75, painInhibitionFactor: 0.25 },
    },
  } },
  rotator_cuff_tendinopathy_right: { joints: {
    rightShoulder: {
      abduction: { activeRomMaxFactor: 0.85, activeStrengthPct: 70, painInhibitionFactor: 0.3, painfulArc: { start: 60, end: 120, intensity: 6 } },
      flexion: { activeRomMaxFactor: 0.9, activeStrengthPct: 75, painInhibitionFactor: 0.25 },
    },
  } },
  meniscus_tear_left: { joints: {
    leftKnee: { flexion: { activeRomMaxFactor: 0.75, activeStrengthPct: 70, painInhibitionFactor: 0.4, painfulArc: { start: 90, end: 130, intensity: 6 } } },
  } },
  meniscus_tear_right: { joints: {
    rightKnee: { flexion: { activeRomMaxFactor: 0.75, activeStrengthPct: 70, painInhibitionFactor: 0.4, painfulArc: { start: 90, end: 130, intensity: 6 } } },
  } },
  achilles_tendinopathy_left: { joints: {
    leftAnkle: { dorsiflexion: { activeRomMaxFactor: 0.7, activeStrengthPct: 70, painInhibitionFactor: 0.3, rationale: 'Painful loaded dorsiflexion from achilles tendinopathy.' } },
  } },
  achilles_tendinopathy_right: { joints: {
    rightAnkle: { dorsiflexion: { activeRomMaxFactor: 0.7, activeStrengthPct: 70, painInhibitionFactor: 0.3 } },
  } },
  plantar_fasciitis_left: { joints: {
    leftAnkle: { dorsiflexion: { activeRomMaxFactor: 0.8, activeStrengthPct: 80, painInhibitionFactor: 0.2 } },
  } },
  plantar_fasciitis_right: { joints: {
    rightAnkle: { dorsiflexion: { activeRomMaxFactor: 0.8, activeStrengthPct: 80, painInhibitionFactor: 0.2 } },
  } },
  acute_lbp: { joints: {
    lumbar_spine: {
      flexion: { activeRomMaxFactor: 0.5, activeStrengthPct: 60, painInhibitionFactor: 0.5, rationale: 'Acute LBP typically loses lumbar flexion most.' },
      extension: { activeRomMaxFactor: 0.6, activeStrengthPct: 65, painInhibitionFactor: 0.4 },
      rotation: { activeRomMaxFactor: 0.6, activeStrengthPct: 70, painInhibitionFactor: 0.4 },
    },
  } },
  lumbar_disc_herniation: { joints: {
    lumbar_spine: {
      flexion: { activeRomMaxFactor: 0.45, activeStrengthPct: 55, painInhibitionFactor: 0.6, painfulArc: { start: 30, end: 60, intensity: 7 }, rationale: 'Disc-related flexion intolerance.' },
    },
  } },
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

// Deterministic equivalent of the client `getActiveCapacityFromPathologies`.
function applyPathologyBaseline(rows: ActiveCapacityRow[], pathologies: string[]): ActiveCapacityRow[] {
  if (!pathologies?.length) return rows;
  const map = new Map<string, ActiveCapacityRow>();
  for (const r of rows) map.set(`${r.joint}:${r.movement}`, r);
  for (const slug of pathologies) {
    const overlay = LITERATURE_OVERLAYS[slug];
    if (!overlay) continue;
    for (const [joint, dirs] of Object.entries(overlay.joints)) {
      for (const [movement, patch] of Object.entries(dirs)) {
        const key = `${joint}:${movement}`;
        const row = map.get(key);
        if (!row) continue;
        const next: ActiveCapacityRow = { ...row };
        if (typeof patch.activeRomMaxFactor === 'number') {
          next.activeRomMax = Math.round(row.passiveRomMax * patch.activeRomMaxFactor);
        }
        if (typeof patch.activeStrengthPct === 'number') next.activeStrengthPct = patch.activeStrengthPct;
        if (typeof patch.painInhibitionFactor === 'number') next.painInhibitionFactor = patch.painInhibitionFactor;
        if (patch.painfulArc) next.painfulArc = patch.painfulArc;
        if (patch.rationale) next.rationale = patch.rationale;
        map.set(key, next);
      }
    }
  }
  return Array.from(map.values());
}

const SYSTEM_PROMPT = `You are a senior physiotherapist specialised in assessing active movement capacity. You receive a case (free-text condition + case summary + AI-inferred phenotype variables + a short literature summary) and a deterministic baseline table of joints × movements with passive ROM and a literature-anchored default active ROM. Your job is to PATCH the table with case-specific active-movement findings.

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
- Patch ONLY the joint × movement combinations that are clinically relevant. Leave the rest at baseline by NOT including them.
- activeRomMax must always be ≤ passiveRomMax for that joint/movement.
- Painful arcs only when there is a clear pathomechanical reason.
- Use the case's age, sex and inferred pathologies as context for severity and irritability.
- Be conservative: prefer mild reductions unless the case clearly warrants severe restriction.
`;

function safeJSONParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function applyPatches(baseline: ActiveCapacityRow[], patches: unknown): ActiveCapacityRow[] {
  if (!Array.isArray(patches)) return baseline;
  const map = new Map<string, ActiveCapacityRow>();
  for (const r of baseline) map.set(`${r.joint}:${r.movement}`, r);
  for (const p of patches) {
    if (!p || typeof p !== 'object') continue;
    const patch = p as Record<string, unknown>;
    const key = `${patch.joint}:${patch.movement}`;
    const row = map.get(key);
    if (!row) continue;
    const next: ActiveCapacityRow = { ...row, source: 'ai' };
    if (typeof patch.activeRomMin === 'number') next.activeRomMin = Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, patch.activeRomMin));
    if (typeof patch.activeRomMax === 'number') next.activeRomMax = Math.max(next.activeRomMin, Math.min(row.passiveRomMax, patch.activeRomMax));
    if (patch.painfulArc === null) next.painfulArc = null;
    else if (patch.painfulArc && typeof patch.painfulArc === 'object') {
      const pa = patch.painfulArc as Record<string, unknown>;
      const start = Number(pa.start);
      const end = Number(pa.end);
      const intensity = Number(pa.intensity);
      if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(intensity)) {
        next.painfulArc = {
          start: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, start)),
          end: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, end)),
          intensity: Math.max(1, Math.min(10, Math.round(intensity))),
        };
      }
    }
    if (typeof patch.activeStrengthPct === 'number') next.activeStrengthPct = Math.max(0, Math.min(100, patch.activeStrengthPct));
    if (typeof patch.painInhibitionFactor === 'number') next.painInhibitionFactor = Math.max(0, Math.min(1, patch.painInhibitionFactor));
    if (typeof patch.rationale === 'string') next.rationale = patch.rationale.slice(0, 240);
    map.set(key, next);
  }
  return Array.from(map.values());
}

export async function generateActiveCapacities(input: {
  condition: string;
  caseSummary: string;
  literatureSummary?: string;
  age?: number;
  sex?: string;
  inferredPathologies?: string[];
}): Promise<ActiveCapacityProfile> {
  // Compose the deterministic baseline first so the result is never blank.
  const baseline = applyPathologyBaseline(buildBaselineRows(), input.inferredPathologies || []);
  const baselinePayload = baseline.map(r => ({
    joint: r.joint,
    movement: r.movement,
    passiveRomMin: r.passiveRomMin,
    passiveRomMax: r.passiveRomMax,
    defaultActiveRomMin: r.activeRomMin,
    defaultActiveRomMax: r.activeRomMax,
    painfulArc: r.painfulArc,
    activeStrengthPct: r.activeStrengthPct,
    painInhibitionFactor: r.painInhibitionFactor,
  }));

  const userPrompt = JSON.stringify({
    condition: input.condition,
    age: input.age,
    sex: input.sex,
    inferredPathologies: input.inferredPathologies || [],
    caseSummary: input.caseSummary.slice(0, 6000),
    literatureSummary: (input.literatureSummary || '').slice(0, 4000),
    baseline: baselinePayload,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = (safeJSONParse(content) as Record<string, unknown> | null) || {};
    const rows = applyPatches(baseline, parsed.patches);
    return {
      rows,
      generatedAt: new Date().toISOString(),
      rationaleSummary: typeof parsed.rationaleSummary === 'string'
        ? (parsed.rationaleSummary as string).slice(0, 800)
        : undefined,
    };
  } catch (err) {
    console.error('[activeCapacityService] AI generation failed, returning deterministic baseline:', err);
    return {
      rows: baseline,
      generatedAt: new Date().toISOString(),
      rationaleSummary: 'Deterministic baseline (AI synthesis unavailable).',
    };
  }
}

export function applyManualOverride(
  profile: ActiveCapacityProfile,
  patch: ActiveCapacityOverridePatch,
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
