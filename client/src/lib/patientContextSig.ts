import type { PatientContextPayload } from "@shared/schema";
import type { ClinicalParseResult } from "@/components/skeleton/ClinicalTextInput";

/** Build a deterministic, content-sensitive signature for a patient
 *  context payload. Used by PhysioGPT + the natural-timeline / case-
 *  specific-plan hooks to detect when context actually changed (so
 *  edits that keep the same character count still trigger refetches).
 *  Whitespace is normalized so trivial reformatting is a no-op. */
export function buildPatientContextSig(payload: PatientContextPayload | undefined | null): string {
  if (!payload) return '';
  const normalize = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
  const free = normalize(payload.free_form);
  const ans = (payload.answers ?? [])
    .map(a => `${a.prompt_id}=${normalize(a.answer)}`)
    .filter(s => !s.endsWith('='))
    .sort()
    .join('|');
  if (!free && !ans) return '';
  return `f:${free}||a:${ans}`;
}

/** A deterministic fingerprint for a prediction. We intentionally
 *  base this ONLY on the clinician-authored description (whitespace
 *  normalized) so that:
 *    - prompts are only marked "Stale" when the clinician actually
 *      edits the diagnosis text, AND
 *    - prediction re-runs driven by patient-context changes (which
 *      legitimately mutate AI-derived fields like clinical_summary,
 *      tissue ids, or pain markers) DO NOT falsely invalidate prompts. */
export function predictionFingerprintFor(parse: ClinicalParseResult | null): string | null {
  if (!parse) return null;
  const desc = (parse.original_description ?? "").replace(/\s+/g, ' ').trim();
  if (!desc) return null;
  return desc;
}
