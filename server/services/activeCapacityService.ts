/**
 * Active Movement Mode
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

export type PainfulArc = {
  start: number;
  end: number;
  intensity: number;
  /** Direction of joint motion that triggers pain. `ascending` = pain when the
   *  angle is increasing (e.g. lifting arm into abduction), `descending` =
   *  pain when decreasing (e.g. lowering arm — classic impingement),
   *  `either` / omitted = pain regardless of direction. */
  direction?: 'ascending' | 'descending' | 'either';
  /** Dominant agonist contraction mode that triggers pain. `eccentric` =
   *  lengthening under load (e.g. quad on squat descent for PFPS),
   *  `concentric` = shortening under load, `isometric` = no length change,
   *  `any` / omitted = pain regardless of contraction mode. */
  loadingMode?: 'concentric' | 'eccentric' | 'isometric' | 'any';
  /** Short clinical phrase surfaced in the on-body halo (e.g. "Painful on
   *  descent" or "Impingement zone"). ≤60 chars. Optional. */
  label?: string;
};

export type ActiveCapacityRow = {
  joint: string;
  movement: string;
  passiveRomMin: number;
  passiveRomMax: number;
  activeRomMin: number;
  activeRomMax: number;
  painfulArc: PainfulArc | null;
  activeStrengthPct: number;
  painInhibitionFactor: number;
  source: 'pathology-baseline' | 'ai' | 'manual';
  rationale?: string;
  editedAt?: string;
};

export type ActiveCapacityProfile = {
  rows: ActiveCapacityRow[];
  generatedAt: string;
  rationaleSummary?: string;
  /** Stable hash of the painMarkers + intakeContext used to generate
   *  this profile. Lets the client detect stale profiles when the
   *  clinical picture changes outside Movement Mode and refresh on
   *  next entry without firing duplicate refreshes for unchanged
   *  context. Empty string when no context was supplied. */
  aiContextSignature?: string;
};

export type ActiveCapacityOverridePatch = {
  joint: string;
  movement: string;
  activeRomMin?: number;
  activeRomMax?: number;
  painfulArc?: PainfulArc | null;
  activeStrengthPct?: number;
  painInhibitionFactor?: number;
  editedAt?: string;
};

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
          next.activeRomMax = Math.round(row.passiveRomMax * patch.activeRomMaxFactor);
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

const SYSTEM_PROMPT = `You are a senior physiotherapist specialised in assessing active movement capacity. You receive a case (free-text condition + case summary + AI-inferred phenotype variables + a literature summary + clinician-placed pain markers + the live patient-context intake) and a deterministic baseline table of joints × movements with passive ROM and a literature-anchored default active ROM. Your job is to PATCH the table with case-specific active-movement findings AND infer painful arcs for ANY plausible diagnosis — not only pre-coded ones.

Return JSON of the shape:
{
  "patches": [
    {
      "joint": "<key from input>",
      "movement": "<key from input>",
      "activeRomMin": <signed number, can be negative for bidirectional DOFs>,
      "activeRomMax": <signed number>,
      "painfulArc": null | {
        "start": <signed number>,
        "end": <signed number>,
        "intensity": <1-10>,
        "direction": "ascending" | "descending" | "either",
        "loadingMode": "concentric" | "eccentric" | "isometric" | "any",
        "label": "<≤60-char clinical phrase, e.g. 'Impingement on lowering' or 'PFPS on squat descent'>"
      },
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

Direction & loading-mode encoding (CRITICAL — this drives the on-body pain visualisation):
- "direction" describes how the JOINT ANGLE is changing when pain is reproduced:
  * "ascending"  = pain when the angle is INCREASING (e.g. lifting arm into abduction; flexing knee into a deeper squat).
  * "descending" = pain when the angle is DECREASING (e.g. LOWERING the arm — classic subacromial impingement; extending knee on stair-up — PFPS on stair ascent).
  * "either"     = pain in both directions across the arc (default if unsure).
- "loadingMode" describes what the dominant agonist is doing when pain occurs:
  * "concentric" = agonist shortening under load.
  * "eccentric"  = agonist lengthening under load (e.g. quad on squat DESCENT — PFPS; deltoid on arm LOWERING — impingement; hamstring on terminal swing).
  * "isometric"  = no length change (e.g. plank holds, isometric grip).
  * "any"        = pain regardless of contraction mode.
- "label" is the short clinical phrase the on-body halo will display. Be specific: "Impingement on lowering", "PFPS on squat descent", "Frozen capsule end-range", "Baastrup's pinch on extension", "Hamstring eccentric overload".

Universal pain-arc inference (this is the core capability — do not restrict to a small named list):
- ANY condition that mechanically loads tissue can produce a painful arc. Always reason about WHICH motion direction (ascending vs descending) and WHICH contraction mode loads the suspected pain generator.
- Examples (illustrative — apply the same reasoning to ANY diagnosis you encounter):
  * Subacromial impingement: shoulder abduction 60-120°, direction="descending" (lowering pinches the bursa), loadingMode="eccentric".
  * Patellofemoral pain (PFPS): knee flexion 60°+, direction="ascending" (going DOWN into squat — angle increasing), loadingMode="eccentric"; OR knee extension descending direction on stair-up.
  * Baastrup's syndrome (kissing spines): lumbar extension 10°+, direction="ascending", loadingMode="concentric" (use "isometric" if pain holds at end-range without further motion).
  * Frozen shoulder (adhesive capsulitis): end-range abduction/external-rotation, direction="ascending", loadingMode="any" (capsular block in both phases).
  * Achilles tendinopathy: calf raise descent, direction="descending" plantarflexion, loadingMode="eccentric".
  * Hip labral tear: deep flexion + IR, direction="ascending", loadingMode="any".
  * Cervical facet sprain: rotation toward painful side, direction="ascending", loadingMode="any".
- Use the painMarkers (location + symptomType + severity + mechanism) as a PRIMARY signal — they tell you exactly where the patient hurts and the irritability. Cross-reference with the intake (aggravating activities, easing positions, time of day, occupation) to deduce the loading mode.

Pain-marker integration:
- A painMarker with type="referred" + a nerveRoot suggests neuropathic source — keep painfulArc null on the joint itself unless mechanical loading reproduces it.
- High severity (≥7) painMarkers with mechanical descriptions in the intake → set higher intensity (7-9) and tighter painInhibitionFactor (0.5-0.8).
- Multiple painMarkers in the same anatomical region → likely a single pathology — generate consistent arcs across the related DOFs (e.g. shoulder flexion + abduction + ER all painful for impingement).

Rules:
- Patch ONLY the joint × movement combinations that are clinically relevant. Leave the rest at baseline by NOT including them.
- Painful arcs only when there is a clear pathomechanical reason inferable from the case + markers + intake.
- Use the case's age, sex and inferred pathologies as context for severity and irritability.
- Be conservative on ROM reduction: prefer mild reductions unless the case clearly warrants severe restriction. Be DIRECTIONAL on painful arcs: ALWAYS specify direction + loadingMode when you set a painful arc.
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
        const arc: PainfulArc = {
          start: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, start)),
          end: Math.max(row.passiveRomMin, Math.min(row.passiveRomMax, end)),
          intensity: Math.max(1, Math.min(10, Math.round(intensity))),
        };
        const dir = pa.direction;
        arc.direction = (dir === 'ascending' || dir === 'descending' || dir === 'either') ? dir : 'either';
        const lm = pa.loadingMode;
        arc.loadingMode = (lm === 'concentric' || lm === 'eccentric' || lm === 'isometric' || lm === 'any') ? lm : 'any';
        if (typeof pa.label === 'string') {
          const trimmed = pa.label.trim();
          if (trimmed) arc.label = trimmed.slice(0, 80);
        }
        next.painfulArc = arc;
      }
    }
    if (typeof patch.activeStrengthPct === 'number') next.activeStrengthPct = Math.max(0, Math.min(100, patch.activeStrengthPct));
    if (typeof patch.painInhibitionFactor === 'number') next.painInhibitionFactor = Math.max(0, Math.min(1, patch.painInhibitionFactor));
    if (typeof patch.rationale === 'string') next.rationale = patch.rationale.slice(0, 240);
    map.set(key, next);
  }
  return Array.from(map.values());
}

/** Slim shape of a clinician-placed pain marker that we forward to the AI. */
export type PainMarkerHint = {
  /** anatomical label (e.g. "Right anterolateral knee") or nearest bone name */
  location: string;
  /** point | area | referred | line | paint */
  type?: string;
  /** pain | tingling | numbness | weakness | stiffness | etc. */
  symptomType?: string;
  /** clinician-entered description / patient quote */
  description?: string;
  /** patient-reported subjective history fragment */
  subjectiveHistory?: string;
  /** free-text mechanism if assigned (mechanical | inflammatory | neuropathic | …) */
  painMechanism?: string;
  /** dermatomal nerve root (C5, L5, …) if classified */
  nerveRoot?: string;
  /** 0-10 clinician-assigned severity if set */
  severity?: number;
};

/** Slim shape of the patient-context intake we forward as additional grounding. */
export type IntakeContextHint = {
  occupation?: string;
  hand_dominance?: string;
  sport_activity?: string;
  aggravating_activities?: string;
  easing_positions?: string;
  time_of_day_pattern?: string;
  comorbidities?: string;
  medications?: string;
  prior_episodes?: string;
  red_flag_screen?: string;
  goals?: string;
  // Free-form catch-all so callers can pass extra fields without us throwing.
  [extra: string]: string | number | boolean | undefined;
};

export async function generateActiveCapacities(input: {
  condition: string;
  caseSummary: string;
  literatureSummary?: string;
  age?: number;
  sex?: string;
  inferredPathologies?: string[];
  /** Clinician-placed pain markers. Drive painful-arc
   *  inference for ANY diagnosis, not just pre-coded ones. */
  painMarkers?: PainMarkerHint[];
  /** Patient-context intake for additional grounding
   *  (aggravating activities, easing positions, occupation, …). */
  intakeContext?: IntakeContextHint;
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

  // Cap the marker list to 24 to keep the prompt bounded.
  const markersPayload = (input.painMarkers || []).slice(0, 24).map(m => ({
    location: (m.location || '').slice(0, 120),
    type: m.type,
    symptomType: m.symptomType,
    description: typeof m.description === 'string' ? m.description.slice(0, 300) : undefined,
    subjectiveHistory: typeof m.subjectiveHistory === 'string' ? m.subjectiveHistory.slice(0, 300) : undefined,
    painMechanism: m.painMechanism,
    nerveRoot: m.nerveRoot,
    severity: typeof m.severity === 'number' ? m.severity : undefined,
  }));

  // Strip empty/undefined intake fields and clamp string values to 400 chars.
  const intakePayload: Record<string, string | number | boolean> = {};
  if (input.intakeContext) {
    for (const [k, v] of Object.entries(input.intakeContext)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) continue;
        intakePayload[k] = trimmed.slice(0, 400);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        intakePayload[k] = v;
      }
    }
  }

  const userPrompt = JSON.stringify({
    condition: input.condition,
    age: input.age,
    sex: input.sex,
    inferredPathologies: input.inferredPathologies || [],
    caseSummary: input.caseSummary.slice(0, 6000),
    literatureSummary: (input.literatureSummary || '').slice(0, 4000),
    painMarkers: markersPayload,
    intakeContext: intakePayload,
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
      aiContextSignature: computeAiContextSignature(input.painMarkers, input.intakeContext),
    };
  } catch (err) {
    console.error('[activeCapacityService] AI generation failed, returning deterministic baseline:', err);
    return {
      rows: baseline,
      generatedAt: new Date().toISOString(),
      rationaleSummary: 'Deterministic baseline (AI synthesis unavailable).',
      aiContextSignature: computeAiContextSignature(input.painMarkers, input.intakeContext),
    };
  }
}

function computeAiContextSignature(
  markers?: PainMarkerHint[],
  intake?: IntakeContextHint,
): string {
  const m = (markers || []).map(x => [x.location, x.type, x.symptomType, x.severity, (x.description || '').slice(0, 40)]);
  const i = intake || {};
  const json = JSON.stringify({ m, i });
  let h = 2166136261 >>> 0;
  for (let k = 0; k < json.length; k++) {
    h ^= json.charCodeAt(k);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
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
