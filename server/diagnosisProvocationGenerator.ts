/**
 * Diagnosis-Driven Provocation Movement Composer
 *
 * Composes diagnosis-specific provocation tests as keyframe animations FROM SCRATCH
 * using the shared joint+property vocabulary. The AI is constrained to the joints
 * and degree ranges in JOINT_VOCABULARY. The sanitizer is REPAIR-FIRST: it
 * normalizes raw AI output (clamps times, clamps values, drops unknown joints
 * and properties, sorts and pads keyframes, normalizes durations) BEFORE Zod
 * validation, so a single out-of-range value never discards a whole movement.
 */

import OpenAI from "openai";
import { z } from "zod";
import {
  JOINT_VOCABULARY,
  ANATOMICAL_REGIONS,
  type AnatomicalRegionId,
  type DiagnosisProvocationMovement,
  type ExpectedProvocationSite,
  type ProvocationContextPainMarker as SharedProvocationContextPainMarker,
  type ProvocationComposeRequest,
  type ProvocationJointTimeline,
  type ProvocationKeyframe,
  type ProvocationSide,
} from "../shared/jointVocabulary";

export const PROVOCATION_VOCAB = JOINT_VOCABULARY;

function buildVocabText(): string {
  const lines: string[] = [];
  for (const [joint, def] of Object.entries(JOINT_VOCABULARY)) {
    const props = Object.entries(def.properties)
      .map(([p, r]) => `${p}(${r.min}..${r.max}°)`)
      .join(", ");
    lines.push(`  ${joint}: ${props}`);
  }
  return lines.join("\n");
}

function buildRegionText(): string {
  return ANATOMICAL_REGIONS.join(", ");
}

const KeyframeSchema = z.object({
  time: z.number(),
  value: z.number(),
});

const TimelineSchema = z.object({
  joint: z.string(),
  property: z.string(),
  keyframes: z.array(KeyframeSchema).min(2),
});

const ExpectedSiteSchema = z.object({
  region: z.string(),
  label: z.string(),
  severity: z.number().optional(),
});

const MovementSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(400),
  duration: z.number(),
  loop: z.boolean().optional(),
  side: z.enum(["left", "right", "bilateral", "n/a"]).optional(),
  setupPosture: z.string().max(280).optional(),
  holdAtPeakMs: z.number().optional(),
  joints: z.array(TimelineSchema).min(1),
  expectedProvocationSites: z.array(ExpectedSiteSchema).optional(),
  clinicalRationale: z.string().min(5).max(500).optional(),
  positiveFinding: z.string().min(5).max(400).optional(),
});

export type ProvocationMovement = DiagnosisProvocationMovement;
export type ProvocationContextPainMarker = SharedProvocationContextPainMarker;
export type ProvocationInput = ProvocationComposeRequest;
export type { ExpectedProvocationSite };

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

const REGION_SET = new Set<string>(ANATOMICAL_REGIONS);

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

interface RepairedMovement {
  name: string;
  description: string;
  duration: number;
  loop: boolean;
  side?: ProvocationSide;
  setupPosture?: string;
  holdAtPeakMs?: number;
  joints: ProvocationJointTimeline[];
  expectedProvocationSites?: ExpectedProvocationSite[];
  clinicalRationale?: string;
  positiveFinding?: string;
}

/** Repair-first pre-processor: clamps numeric fields, drops unknown joints
 *  and properties, sorts/pads keyframes. Operates on the raw object so the
 *  Zod schema only sees already-normalized data. */
function repairRawMovement(raw: unknown): RepairedMovement | null {
  if (!isObject(raw)) return null;
  const jointsRaw: unknown[] = Array.isArray(raw.joints) ? raw.joints : [];

  const cleanJoints: ProvocationJointTimeline[] = [];
  for (const t of jointsRaw) {
    if (!isObject(t)) continue;
    const jointName = String(t.joint ?? "");
    const propName = String(t.property ?? "");
    const jointDef = JOINT_VOCABULARY[jointName];
    if (!jointDef) continue;
    const propDef = jointDef.properties[propName];
    if (!propDef) continue;
    const kfRaw: unknown[] = Array.isArray(t.keyframes) ? t.keyframes : [];
    const kfClean: ProvocationKeyframe[] = kfRaw
      .filter(isObject)
      .map((k) => ({
        time: clamp(Number(k.time), 0, 1),
        value: clamp(Number(k.value), propDef.min, propDef.max),
      }))
      .sort((a, b) => a.time - b.time);
    if (kfClean.length === 0) continue;
    if (kfClean[0].time > 0) kfClean.unshift({ time: 0, value: 0 });
    if (kfClean[kfClean.length - 1].time < 1) {
      kfClean.push({ time: 1, value: kfClean[kfClean.length - 1].value });
    }
    if (kfClean.length < 2) {
      kfClean.push({ time: 1, value: kfClean[0].value });
    }
    cleanJoints.push({ joint: jointName, property: propName, keyframes: kfClean.slice(0, 8) });
  }
  if (cleanJoints.length === 0) return null;

  const sitesRaw: unknown[] = Array.isArray(raw.expectedProvocationSites)
    ? raw.expectedProvocationSites
    : [];
  const cleanSites: ExpectedProvocationSite[] = sitesRaw
    .filter(isObject)
    .filter((s) => REGION_SET.has(String(s.region)))
    .slice(0, 5)
    .map((s) => ({
      region: String(s.region),
      label: String(s.label ?? s.region).slice(0, 80),
      severity:
        typeof s.severity === "number" && Number.isFinite(s.severity)
          ? clamp(s.severity, 0, 10)
          : undefined,
    }));

  const sideRaw = String(raw.side ?? "").toLowerCase();
  const side: ProvocationSide | undefined =
    sideRaw === "left" || sideRaw === "right" || sideRaw === "bilateral" || sideRaw === "n/a"
      ? (sideRaw as ProvocationSide)
      : undefined;

  return {
    name: String(raw.name ?? "Unnamed test").slice(0, 120),
    description: String(raw.description ?? "Diagnostic provocation").slice(0, 400),
    duration: clamp(Number(raw.duration ?? 4000), 1500, 8000),
    loop: !!raw.loop,
    side,
    setupPosture: typeof raw.setupPosture === "string" ? raw.setupPosture.slice(0, 280) : undefined,
    holdAtPeakMs:
      typeof raw.holdAtPeakMs === "number" && Number.isFinite(raw.holdAtPeakMs)
        ? clamp(raw.holdAtPeakMs, 0, 5000)
        : undefined,
    joints: cleanJoints.slice(0, 8),
    expectedProvocationSites: cleanSites.length > 0 ? cleanSites : undefined,
    clinicalRationale:
      typeof raw.clinicalRationale === "string" ? raw.clinicalRationale.slice(0, 500) : undefined,
    positiveFinding:
      typeof raw.positiveFinding === "string" ? raw.positiveFinding.slice(0, 400) : undefined,
  };
}

function sanitize(raw: unknown, hypothesisId: string): ProvocationMovement[] {
  const result: ProvocationMovement[] = [];
  const movementsRaw: unknown[] =
    isObject(raw) && Array.isArray(raw.movements) ? raw.movements : [];

  for (const m of movementsRaw.slice(0, 6)) {
    const repaired = repairRawMovement(m);
    if (!repaired) continue;
    const parsed = MovementSchema.safeParse(repaired);
    if (!parsed.success) {
      console.warn("[Provocation] dropped invalid movement:", parsed.error.flatten());
      continue;
    }
    const data = parsed.data;
    result.push({
      id: `prov-${hypothesisId}-${result.length}`,
      name: data.name,
      description: data.description,
      duration: Math.round(data.duration),
      loop: false,
      side: data.side,
      setupPosture: data.setupPosture,
      holdAtPeakMs:
        typeof data.holdAtPeakMs === "number" ? Math.round(data.holdAtPeakMs) : undefined,
      joints: data.joints,
      expectedProvocationSites: data.expectedProvocationSites as ExpectedProvocationSite[] | undefined,
      clinicalRationale: data.clinicalRationale,
      positiveFinding: data.positiveFinding,
    });
  }

  return result;
}

export async function composeProvocationMovements(
  input: ProvocationInput,
): Promise<ProvocationMovement[]> {
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;
  const client = new OpenAI({ apiKey, baseURL });

  const vocab = buildVocabText();
  const regions = buildRegionText();
  const evidence = input.supportingEvidence?.length
    ? input.supportingEvidence.join("; ")
    : "none recorded";
  const ruling = input.rulingOutFactors?.length
    ? input.rulingOutFactors.join("; ")
    : "none recorded";

  const systemPrompt = `You are a senior physiotherapy clinician composing diagnosis-specific provocation movements as keyframe animations for a 3D skeleton model. A provocation movement is a clinical special test that, if positive, would support the working hypothesis (Slump test for tibial nerve tension, Hawkins-Kennedy for shoulder impingement, FABER (Patrick's) for FAI / hip OA, Spurling for cervical radiculopathy, McMurray for meniscal tear, resisted forearm pronation for pronator syndrome, Thomas test, Phalen's, Tinel's, drop-arm, ULTT, etc.).

You compose movements ENTIRELY FROM SCRATCH — there is no library to choose from. You define keyframe timelines using ONLY the joint+property vocabulary below. Any joint or property not in this list will be silently dropped.

JOINT/PROPERTY VOCABULARY (with safe degree ranges):
${vocab}

ANATOMICAL REGIONS (for expectedProvocationSites — use exact snake_case ids):
${regions}

OUTPUT JSON ONLY in this exact shape:
{
  "movements": [
    {
      "name": "Hawkins-Kennedy Test",
      "description": "Shoulder flexed to 90°, elbow bent 90°, then forced internal rotation",
      "duration": 4000,
      "loop": false,
      "side": "right",
      "setupPosture": "Patient seated, examiner stabilises scapula",
      "holdAtPeakMs": 1500,
      "joints": [
        { "joint": "rightShoulder", "property": "flexion", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":90}, {"time":1,"value":90} ] },
        { "joint": "rightElbow", "property": "flexion", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":90}, {"time":1,"value":90} ] },
        { "joint": "rightShoulder", "property": "internalRotation", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":0}, {"time":0.8,"value":70}, {"time":1,"value":70} ] }
      ],
      "expectedProvocationSites": [
        { "region": "right_shoulder", "label": "Anterior subacromial pain", "severity": 6 }
      ],
      "clinicalRationale": "Internal rotation in 90° flexion drives the greater tubercle under the coracoacromial arch.",
      "positiveFinding": "Sharp anterior shoulder pain at end-range internal rotation."
    }
  ]
}

RULES:
- 3 to 6 provocation movements per hypothesis. Pick the most diagnostic. Order from most to least specific.
- duration: 2000–6000 ms typical (max 8000). Each test is one set-up-and-hold cycle.
- keyframes: 2–6 per timeline. \`time\` is 0..1 (fraction of duration). The skeleton interpolates smoothly between keyframes; combine multiple joint timelines so the body clearly performs the manoeuvre (set-up phase → end-range → hold).
- All values must stay within the safe degree ranges shown above. Use realistic clinical end-range positions (Hawkins-Kennedy ≈ 90° shoulder flexion + 90° elbow flexion + 60–80° internal rotation; FABER ≈ 45° hip flexion + 30° abduction + 30° external rotation with knee flexed; Slump ≈ spine flexion 60° + neck flexion 40° + knee flexion → extension 0°).
- side: "left", "right", "bilateral", or "n/a" — derive from the hypothesis evidence; default "right" if unclear.
- setupPosture: short patient-position description (sitting, supine, prone, side-lying, etc.).
- holdAtPeakMs: 0–5000 ms hold at end-range (the clinician keeps pressure on while watching for symptoms). 0 if no sustained hold.
- expectedProvocationSites: 1–3 anatomical regions where a positive test typically reproduces symptoms. Use ONLY the snake_case region ids listed above. severity is 0–10 expected pain rating.
- name: short clinical test name. description: 1–2 sentence physical description. clinicalRationale: why this discriminates this hypothesis. positiveFinding: what a positive test looks/feels like.
- Do NOT invent joints, properties, or regions. Do NOT include extra fields.`;

  const regionContext = input.region ? `Currently focused region: ${input.region}` : "Currently focused region: (none)";

  const markerLines = (input.painMarkers ?? [])
    .slice(0, 12)
    .map((m, i) => {
      const parts: string[] = [];
      if (m.anatomicalLabel) parts.push(m.anatomicalLabel);
      else if (m.region) parts.push(m.region);
      else parts.push(`marker ${i + 1}`);
      if (m.symptomType) parts.push(`type=${m.symptomType}`);
      if (typeof m.severity === "number") parts.push(`severity=${m.severity}/10`);
      if (m.description) parts.push(`note="${String(m.description).slice(0, 80)}"`);
      return `  - ${parts.join(", ")}`;
    })
    .join("\n");
  const markerContext = markerLines.length > 0
    ? `Clinician-placed pain markers on the model:\n${markerLines}`
    : "Clinician-placed pain markers on the model: (none)";

  const userPrompt = `WORKING HYPOTHESIS
Condition: ${input.condition}
Supporting evidence: ${evidence}
Ruling-out factors: ${ruling}

CONTEXT
${regionContext}
${markerContext}

Compose 3–6 diagnostic provocation movements specific to this condition. Bias your selection and side toward the clinician's focused region and the locations of any pain markers above when relevant. Return JSON only.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2400,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed JSON");
  }

  const movements = sanitize(parsed, input.hypothesisId);
  if (movements.length < 3) {
    throw new Error(
      `Provocation composition produced only ${movements.length} valid movement(s); need at least 3.`,
    );
  }
  return movements;
}
