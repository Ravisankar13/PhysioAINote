/**
 * Task #301 — Active Movement Mode
 *
 * One-sentence per-movement findings used while the clinician is in
 * Movement Mode. Each call summarises a single drag (joint, movement,
 * angle achieved, whether the active limit was passed, painful-arc
 * entry, etc.) into a single clinically-useful sentence (≤180 chars).
 *
 * Designed to be cheap and fast: gpt-4o, temperature 0.3, ~80 output
 * tokens, no JSON mode. Falls back to a deterministic sentence if the
 * model call fails.
 */
import { openai } from '../openai';

export interface MovementFindingInput {
  condition: string;
  caseSummaryShort?: string;
  joint: string;
  movement: string;
  achievedAngle: number;
  activeRomMax: number;
  passiveRomMax: number;
  inPainfulArc: boolean;
  exceededActiveLimit: boolean;
  compensationsTriggered: string[];
}

export async function summariseMovementFinding(input: MovementFindingInput): Promise<string> {
  const fallback = buildFallbackSentence(input);
  try {
    const userText = `Case condition: ${input.condition}.
${input.caseSummaryShort ? `Case context: ${input.caseSummaryShort.slice(0, 300)}.\n` : ''}Movement attempt: ${input.joint} ${input.movement}, achieved ${Math.round(input.achievedAngle)}° (active limit ${Math.round(input.activeRomMax)}°, passive ${Math.round(input.passiveRomMax)}°).
Painful arc entered: ${input.inPainfulArc ? 'yes' : 'no'}.
Active limit exceeded: ${input.exceededActiveLimit ? 'yes' : 'no'}.
Compensations triggered: ${input.compensationsTriggered.join(', ') || 'none'}.

Write ONE clinical sentence (≤180 characters) describing what this active movement attempt tells the clinician. Use plain physiotherapy language, present tense. Do not start with "The patient".`;
    const response = await openai.chat.completions.create({
      // gpt-4o is the standard model used across this codebase.
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 90,
      messages: [
        { role: 'system', content: 'You are a senior physiotherapist generating one-sentence active-movement findings. Be specific and clinical. Never exceed 180 characters.' },
        { role: 'user', content: userText },
      ],
    });
    const sentence = (response.choices[0]?.message?.content || '').trim().replace(/^"|"$/g, '');
    if (!sentence) return fallback;
    return sentence.length > 200 ? sentence.slice(0, 197) + '…' : sentence;
  } catch (err) {
    console.error('[movementFindingsService] AI summary failed, returning fallback:', err);
    return fallback;
  }
}

function buildFallbackSentence(input: MovementFindingInput): string {
  const j = humanise(input.joint);
  const m = input.movement;
  const a = Math.round(input.achievedAngle);
  if (input.exceededActiveLimit) {
    const compNote = input.compensationsTriggered.length
      ? ` with compensation via ${input.compensationsTriggered.slice(0, 2).join(' and ')}`
      : '';
    return `${j} ${m} reached ${a}° beyond the active limit${compNote}.`;
  }
  if (input.inPainfulArc) {
    return `${j} ${m} entered the painful arc at ${a}°.`;
  }
  return `${j} ${m} active range demonstrated to ${a}°.`;
}

function humanise(joint: string): string {
  return joint
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
