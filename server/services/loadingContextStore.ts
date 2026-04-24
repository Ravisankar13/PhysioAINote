/**
 * In-memory backend store for Optimal Loading Engine clinician context.
 *
 * Per-user, per-condition, per-session-prescription persistence of:
 *   - Structured patient factors (medications, comorbidities, hormonal
 *     status, prior injury, training history, recovery phase, irritability,
 *     age) used by the loading engine.
 *   - Clinician overrides keyed by (exerciseId, weekIndex).
 *
 * SCOPE: this store lives only for the lifetime of the current Node
 * process. Overrides and the last-computed plan survive recomputes and
 * page reloads (the diff baseline keeps working), but they DO NOT survive
 * a server restart and they are NOT shared across multiple server
 * instances. A follow-up task tracks promoting this to a Drizzle table
 * for true durability — see Task #231 follow-ups.
 */

import type {
  LoadingPatientFactors,
  OptimalLoadPrescription,
  TendinopathyLoadingPlan,
} from '@shared/schema';

export type LoadingOverridePartial =
  Partial<OptimalLoadPrescription> & { exerciseId: string; weekIndex: number };

interface LoadingContextRecord {
  patientFactors?: LoadingPatientFactors;
  overrides: Map<string, LoadingOverridePartial>;
  /** Last successfully-negotiated plan — used for server-side diffing. */
  lastPlan?: TendinopathyLoadingPlan;
  updatedAt: number;
}

const store = new Map<string, LoadingContextRecord>();

function compositeKey(userId: number | string, conditionName: string, sessionPrescriptionNum?: number | null): string {
  const session = sessionPrescriptionNum == null ? '0' : String(sessionPrescriptionNum);
  return `${userId}::${conditionName.toLowerCase().trim()}::${session}`;
}

function overrideKey(o: { exerciseId: string; weekIndex: number }): string {
  return `${o.exerciseId}::w${o.weekIndex}`;
}

function ensure(key: string): LoadingContextRecord {
  let rec = store.get(key);
  if (!rec) {
    rec = { overrides: new Map(), updatedAt: Date.now() };
    store.set(key, rec);
  }
  return rec;
}

export function getLoadingContext(userId: number | string, conditionName: string, sessionPrescriptionNum?: number | null) {
  const rec = store.get(compositeKey(userId, conditionName, sessionPrescriptionNum));
  if (!rec) return { patientFactors: undefined, overrides: [] as LoadingOverridePartial[], updatedAt: 0 };
  return {
    patientFactors: rec.patientFactors,
    overrides: Array.from(rec.overrides.values()),
    updatedAt: rec.updatedAt,
  };
}

export function setLoadingPatientFactors(userId: number | string, conditionName: string, sessionPrescriptionNum: number | null | undefined, patientFactors: LoadingPatientFactors) {
  const rec = ensure(compositeKey(userId, conditionName, sessionPrescriptionNum));
  rec.patientFactors = patientFactors;
  rec.updatedAt = Date.now();
  return rec;
}

export function upsertLoadingOverride(userId: number | string, conditionName: string, sessionPrescriptionNum: number | null | undefined, override: LoadingOverridePartial) {
  const rec = ensure(compositeKey(userId, conditionName, sessionPrescriptionNum));
  const k = overrideKey(override);
  rec.overrides.set(k, { ...rec.overrides.get(k), ...override });
  rec.updatedAt = Date.now();
  return rec.overrides.get(k)!;
}

export function deleteLoadingOverride(userId: number | string, conditionName: string, sessionPrescriptionNum: number | null | undefined, exerciseId: string, weekIndex: number) {
  const rec = store.get(compositeKey(userId, conditionName, sessionPrescriptionNum));
  if (!rec) return false;
  const k = overrideKey({ exerciseId, weekIndex });
  const had = rec.overrides.delete(k);
  if (had) rec.updatedAt = Date.now();
  return had;
}

export function clearAllOverrides(userId: number | string, conditionName: string, sessionPrescriptionNum?: number | null) {
  const rec = store.get(compositeKey(userId, conditionName, sessionPrescriptionNum));
  if (!rec) return 0;
  const n = rec.overrides.size;
  rec.overrides.clear();
  rec.updatedAt = Date.now();
  return n;
}

/** Read the previously-stored plan so server-side diffing can be done. */
export function getLastLoadingPlan(userId: number | string, conditionName: string, sessionPrescriptionNum?: number | null): TendinopathyLoadingPlan | undefined {
  return store.get(compositeKey(userId, conditionName, sessionPrescriptionNum))?.lastPlan;
}

/** Persist the plan that was just produced so the next recompute can diff. */
export function setLastLoadingPlan(userId: number | string, conditionName: string, sessionPrescriptionNum: number | null | undefined, plan: TendinopathyLoadingPlan) {
  const rec = ensure(compositeKey(userId, conditionName, sessionPrescriptionNum));
  rec.lastPlan = plan;
  rec.updatedAt = Date.now();
}
