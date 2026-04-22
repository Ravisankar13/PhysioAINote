/**
 * Diagnosis-Driven Provocation Movement Composer
 *
 * Composes diagnosis-specific provocation tests as keyframe animations FROM SCRATCH
 * using the InteractiveSkeleton's existing joint+property vocabulary. The AI is
 * constrained to only the joints/properties listed in PROVOCATION_VOCAB and to the
 * safe degree ranges per property. Unknown keys are dropped, values are clamped,
 * and timelines are normalized so the MovementPlayer can play them directly.
 */

import OpenAI from "openai";
import { z } from "zod";

export const PROVOCATION_VOCAB: Record<
  string,
  { properties: Record<string, { min: number; max: number }> }
> = {
  leftHip: {
    properties: {
      flexion: { min: -30, max: 140 },
      extension: { min: 0, max: 30 },
      abduction: { min: -30, max: 45 },
      adduction: { min: 0, max: 30 },
      internalRotation: { min: -45, max: 45 },
      externalRotation: { min: 0, max: 45 },
    },
  },
  rightHip: {
    properties: {
      flexion: { min: -30, max: 140 },
      extension: { min: 0, max: 30 },
      abduction: { min: -30, max: 45 },
      adduction: { min: 0, max: 30 },
      internalRotation: { min: -45, max: 45 },
      externalRotation: { min: 0, max: 45 },
    },
  },
  leftKnee: { properties: { flexion: { min: 0, max: 140 }, varus: { min: -20, max: 20 } } },
  rightKnee: { properties: { flexion: { min: 0, max: 140 }, varus: { min: -20, max: 20 } } },
  leftAnkle: {
    properties: {
      dorsiflexion: { min: 0, max: 30 },
      plantarflexion: { min: 0, max: 50 },
      inversion: { min: 0, max: 35 },
      eversion: { min: 0, max: 25 },
    },
  },
  rightAnkle: {
    properties: {
      dorsiflexion: { min: 0, max: 30 },
      plantarflexion: { min: 0, max: 50 },
      inversion: { min: 0, max: 35 },
      eversion: { min: 0, max: 25 },
    },
  },
  leftShoulder: {
    properties: {
      flexion: { min: -60, max: 180 },
      abduction: { min: 0, max: 180 },
      internalRotation: { min: -90, max: 90 },
      externalRotation: { min: 0, max: 90 },
    },
  },
  rightShoulder: {
    properties: {
      flexion: { min: -60, max: 180 },
      abduction: { min: 0, max: 180 },
      internalRotation: { min: -90, max: 90 },
      externalRotation: { min: 0, max: 90 },
    },
  },
  leftElbow: {
    properties: { flexion: { min: 0, max: 150 }, pronation: { min: -90, max: 90 } },
  },
  rightElbow: {
    properties: { flexion: { min: 0, max: 150 }, pronation: { min: -90, max: 90 } },
  },
  leftWrist: {
    properties: { flexion: { min: -80, max: 80 }, deviation: { min: -30, max: 30 } },
  },
  rightWrist: {
    properties: { flexion: { min: -80, max: 80 }, deviation: { min: -30, max: 30 } },
  },
  leftScapula: {
    properties: {
      protraction: { min: 0, max: 30 },
      retraction: { min: 0, max: 30 },
      elevation: { min: 0, max: 30 },
      depression: { min: 0, max: 15 },
      upwardRotation: { min: 0, max: 60 },
      downwardRotation: { min: 0, max: 30 },
    },
  },
  rightScapula: {
    properties: {
      protraction: { min: 0, max: 30 },
      retraction: { min: 0, max: 30 },
      elevation: { min: 0, max: 30 },
      depression: { min: 0, max: 15 },
      upwardRotation: { min: 0, max: 60 },
      downwardRotation: { min: 0, max: 30 },
    },
  },
  spine: {
    properties: {
      flexion: { min: -30, max: 90 },
      lumbarLordosis: { min: -70, max: 90 },
      thoracicKyphosis: { min: -50, max: 50 },
      thoracicRotation: { min: -45, max: 45 },
      lumbarRotation: { min: -30, max: 30 },
      lateralFlexion: { min: -45, max: 45 },
      cervicalLordosis: { min: -60, max: 75 },
      cervicalRotation: { min: -80, max: 80 },
      cervicalLateralFlexion: { min: -45, max: 45 },
    },
  },
  neck: {
    properties: {
      flexion: { min: 0, max: 60 },
      extension: { min: 0, max: 75 },
      rotation: { min: -80, max: 80 },
      lateralFlexion: { min: -45, max: 45 },
    },
  },
  pelvis: {
    properties: {
      tilt: { min: -30, max: 30 },
      obliquity: { min: -20, max: 20 },
      rotation: { min: -45, max: 45 },
    },
  },
};

function buildVocabText(): string {
  const lines: string[] = [];
  for (const [joint, def] of Object.entries(PROVOCATION_VOCAB)) {
    const props = Object.entries(def.properties)
      .map(([p, r]) => `${p}(${r.min}..${r.max}°)`)
      .join(", ");
    lines.push(`  ${joint}: ${props}`);
  }
  return lines.join("\n");
}

const KeyframeSchema = z.object({
  time: z.number().min(0).max(1),
  value: z.number().min(-200).max(200),
});

const TimelineSchema = z.object({
  joint: z.string(),
  property: z.string(),
  keyframes: z.array(KeyframeSchema).min(2).max(8),
});

const MovementSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(280),
  duration: z.number().min(1500).max(8000),
  loop: z.boolean().optional().default(false),
  joints: z.array(TimelineSchema).min(1).max(8),
  clinicalRationale: z.string().min(5).max(400).optional(),
  positiveFinding: z.string().min(5).max(280).optional(),
});

export interface ProvocationMovement {
  id: string;
  name: string;
  description: string;
  duration: number;
  loop: boolean;
  joints: { joint: string; property: string; keyframes: { time: number; value: number }[] }[];
  clinicalRationale?: string;
  positiveFinding?: string;
}

export interface ProvocationInput {
  hypothesisId: string;
  condition: string;
  supportingEvidence?: string[];
  rulingOutFactors?: string[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sanitize(raw: any, hypothesisId: string): ProvocationMovement[] {
  const result: ProvocationMovement[] = [];
  const movementsRaw = Array.isArray(raw?.movements) ? raw.movements : [];

  movementsRaw.slice(0, 3).forEach((m: any, idx: number) => {
    const parsed = MovementSchema.safeParse(m);
    if (!parsed.success) {
      console.warn("[Provocation] dropped invalid movement:", parsed.error.flatten());
      return;
    }
    const data = parsed.data;

    const cleanJoints = data.joints
      .map((t) => {
        const jointDef = PROVOCATION_VOCAB[t.joint];
        if (!jointDef) {
          console.warn(`[Provocation] dropped unknown joint: ${t.joint}`);
          return null;
        }
        const propDef = jointDef.properties[t.property];
        if (!propDef) {
          console.warn(`[Provocation] dropped unknown property: ${t.joint}.${t.property}`);
          return null;
        }
        const sortedKf = [...t.keyframes]
          .sort((a, b) => a.time - b.time)
          .map((kf) => ({
            time: clamp(kf.time, 0, 1),
            value: clamp(kf.value, propDef.min, propDef.max),
          }));
        if (sortedKf[0].time > 0) {
          sortedKf.unshift({ time: 0, value: 0 });
        }
        if (sortedKf[sortedKf.length - 1].time < 1) {
          sortedKf.push({ time: 1, value: sortedKf[sortedKf.length - 1].value });
        }
        return { joint: t.joint, property: t.property, keyframes: sortedKf };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    if (cleanJoints.length === 0) return;

    result.push({
      id: `prov-${hypothesisId}-${idx}`,
      name: data.name,
      description: data.description,
      duration: Math.round(clamp(data.duration, 1500, 8000)),
      loop: false,
      joints: cleanJoints,
      clinicalRationale: data.clinicalRationale,
      positiveFinding: data.positiveFinding,
    });
  });

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

OUTPUT JSON ONLY in this exact shape:
{
  "movements": [
    {
      "name": "Hawkins-Kennedy Test",
      "description": "Shoulder flexed to 90°, elbow bent 90°, then forced internal rotation",
      "duration": 4000,
      "loop": false,
      "joints": [
        { "joint": "rightShoulder", "property": "flexion", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":90}, {"time":1,"value":90} ] },
        { "joint": "rightElbow", "property": "flexion", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":90}, {"time":1,"value":90} ] },
        { "joint": "rightShoulder", "property": "internalRotation", "keyframes": [ {"time":0,"value":0}, {"time":0.4,"value":0}, {"time":0.8,"value":70}, {"time":1,"value":70} ] }
      ],
      "clinicalRationale": "Internal rotation in 90° flexion drives the greater tubercle under the coracoacromial arch.",
      "positiveFinding": "Sharp anterior shoulder pain at end-range internal rotation."
    }
  ]
}

RULES:
- 1 to 3 provocation movements per hypothesis. Pick the most diagnostic.
- duration: 2000–6000 ms typical (max 8000). Each test is one set-up-and-hold cycle.
- keyframes: 2–6 per timeline. \`time\` is 0..1 (fraction of duration). The skeleton interpolates smoothly between keyframes; combine multiple joint timelines so the body clearly performs the manoeuvre (set-up phase → end-range → hold).
- All values must stay within the safe degree ranges shown above. Use realistic clinical end-range positions (Hawkins-Kennedy ≈ 90° shoulder flexion + 90° elbow flexion + 60–80° internal rotation; FABER ≈ 45° hip flexion + 30° abduction + 30° external rotation with knee flexed; Slump ≈ spine flexion 60° + neck flexion 40° + knee flexion → extension 0°).
- name: short clinical test name. description: 1–2 sentence physical description. clinicalRationale: why this discriminates this hypothesis. positiveFinding: what a positive test looks/feels like.
- Use the side ("left" / "right") implied by the hypothesis evidence. If side is unknown, default to right.
- Do NOT invent joints or properties. Only use the vocabulary above. Do NOT include extra fields.`;

  const userPrompt = `WORKING HYPOTHESIS
Condition: ${input.condition}
Supporting evidence: ${evidence}
Ruling-out factors: ${ruling}

Compose 1–3 diagnostic provocation movements specific to this condition. Return JSON only.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed JSON");
  }

  const movements = sanitize(parsed, input.hypothesisId);
  if (movements.length === 0) {
    throw new Error("No valid provocation movements could be composed");
  }
  return movements;
}
