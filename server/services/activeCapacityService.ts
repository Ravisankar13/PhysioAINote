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
  // Task #301 — set when a clinician overrides this row from the
  // Active Capacities side panel. Used by the AI / Manual / Default
  // badge and to skip overwriting on re-generation.
  editedAt?: string;
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
  // Stamped server-side; clients may also send to preserve a prior
  // edit timestamp during reconciliation.
  editedAt?: string;
};

// Passive ROM table. Single-axis bidirectional DOFs (e.g. shoulder
// flexion/extension on the same DOF channel, hip ab/adduction, ankle
// dorsi/plantarflexion, ankle inv/eversion, spine rotation/lateral
// flexion) are encoded with **signed** ranges so Movement Mode can
// clamp the cursor symmetrically without losing the opposite
// direction. Convention:
//   flexion        : [-extensionMax, +flexionMax]
//   abduction      : [-adductionMax, +abductionMax]
//   dorsiflexion   : [-plantarflexionMax, +dorsiflexionMax]
//   inversion      : [-eversionMax, +inversionMax]
//   internalRotation: [-externalRotationMax, +internalRotationMax]
//   rotation       : [-rotationMax, +rotationMax]
//   lateralFlexion : [-lateralFlexionMax, +lateralFlexionMax]
const PASSIVE_ROM: Record<string, Record<string, [number, number]>> = {
  leftShoulder:   { flexion: [-60, 180], abduction: [0, 180], internalRotation: [-90, 70] },
  rightShoulder:  { flexion: [-60, 180], abduction: [0, 180], internalRotation: [-90, 70] },
  leftHip:        { flexion: [-30, 120], abduction: [-30, 45], internalRotation: [-45, 45] },
  rightHip:       { flexion: [-30, 120], abduction: [-30, 45], internalRotation: [-45, 45] },
  leftKnee:       { flexion: [0, 140] },
  rightKnee:      { flexion: [0, 140] },
  leftAnkle:      { dorsiflexion: [-50, 20], inversion: [-20, 35] },
  rightAnkle:     { dorsiflexion: [-50, 20], inversion: [-20, 35] },
  lumbar_spine:   { flexion: [-25, 60], rotation: [-5, 5], lateralFlexion: [-25, 25] },
  cervical_spine: { flexion: [-60, 50], rotation: [-80, 80], lateralFlexion: [-45, 45] },
  thoracic_spine: { flexion: [-20, 40], rotation: [-35, 35], lateralFlexion: [-25, 25] },
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
      // Signed-aware default active band: shrink each end of the
      // passive range by 15 % of the *signed* extent on that side so
      // bidirectional DOFs preserve both directions instead of
      // collapsing toward the positive end.
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
          // Signed-aware: scale the positive (max) end toward zero,
          // preserving sign so a negative-leaning DOF (e.g. shoulder
          // extension) still gets restricted instead of flipping.
          next.activeRomMax = Math.round(row.passiveRomMax * patch.activeRomMaxFactor);
          // Mirror the restriction onto the negative end so painful
          // pathologies don't spuriously expand the opposite direction.
          if (row.passiveRomMin < 0) {
            next.activeRomMin = Math.round(row.passiveRomMin * patch.activeRomMaxFactor);
          }
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
      "activeRomMin": <signed number, can be negative for bidirectional DOFs>,
      "activeRomMax": <signed number>,
      "painfulArc": null | { "start": <signed number>, "end": <signed number>, "intensity": <1-10> },
      "activeStrengthPct": <number 0-100>,
      "painInhibitionFactor": <number 0-1>,
      "rationale": "<one short sentence, ≤140 chars, citing pathology mechanism>"
    }
  ],
  "rationaleSummary": "<one short paragraph (≤400 chars) summarising the active-movement profile for this case>"
}

Signed-DOF convention:
- Many DOFs are bidirectional on a single channel: e.g. shoulder.flexion spans extension (negative) → flexion (positive); hip.abduction spans adduction (negative) → abduction (positive); ankle.dorsiflexion spans plantarflexion (negative) → dorsiflexion. Use the baseline's passiveRomMin / passiveRomMax to read the signed range — do NOT collapse to absolute magnitudes.
- activeRomMin must satisfy passiveRomMin ≤ activeRomMin, and activeRomMax must satisfy activeRomMax ≤ passiveRomMax.
- A pathology that restricts the positive end (e.g. capsular flexion loss) should NOT expand the negative end. Mirror the restriction proportionally if both directions are clinically affected.
- Painful arc start/end are in the same signed coordinate as the DOF.

Rules:
- Patch ONLY the joint × movement combinations that are clinically relevant. Leave the rest at baseline by NOT including them.
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
    // Signed clamping: AI may emit negative values for bidirectional
    // DOFs (per the prompt). Clamp into the signed passive band.
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
    const next: ActiveCapacityRow = { ...r, source: 'manual', editedAt: new Date().toISOString() };
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
