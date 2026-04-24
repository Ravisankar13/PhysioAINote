// Time-aware force buffer and derived metrics.
// Stores per-frame snapshots of the (already computed) postural force result
// so the engine can move from "single frozen pose" to "dose / rate / impact
// across time" without rewriting the per-frame engine itself.
//
// Used by Movement Player, live phone camera (MediaPipe), and manual sliders —
// every motion source that pushes a new modelConfig also lands a snapshot here.

import type { ForceAnalysisResult, JointSurfaceForce } from './posturalForceEngine';

export type ForceSource = 'movement_player' | 'camera' | 'manual';

export interface ForceFrameSnapshot {
  /** ms since page load (performance.now()) */
  t: number;
  /** Postural-force-engine COM proxy (BW * normalized shift). */
  com: { x: number; y: number };
  /** Body weight in kg at the time the frame was captured. */
  bodyWeightKg: number;
  /** Compact per-joint force record keyed by joint id. */
  forces: Record<string, {
    label: string;
    category: string;
    boneName: string;
    compression: number;
    tension: number;
    shear: number;
    totalForce: number;
    status: 'low' | 'moderate' | 'high' | 'very_high';
  }>;
  /** Foot-plate positions in screen-space if known (for GRF overlay). */
  footScreen?: {
    left?: { x: number; y: number; visible: boolean };
    right?: { x: number; y: number; visible: boolean };
  };
  source: ForceSource;
  /** Optional movement / sequence id (Movement Player). */
  movementId?: string | null;
}

export interface JointTimeMetric {
  jointId: string;
  label: string;
  /** Newtons-per-second peak rate of loading over the lookback window. */
  peakRateNps: number;
  /** Most recent dF/dt (Newtons-per-second) — smoothed. */
  currentRateNps: number;
  /** Cumulative time (ms) above each band over the buffer window. */
  doseMs: { moderate: number; high: number; very_high: number };
  /** Total force at peak frame (N) and the timestamp (ms relative to first frame). */
  peakForceN: number;
  peakForceAtMs: number;
  peakRateAtMs: number;
}

export interface AsymmetryEntry {
  /** e.g. "hip", "knee", "ankle", "si" */
  pair: string;
  leftAvgN: number;
  rightAvgN: number;
  /** 0..100, |L-R| / max(L,R) * 100 */
  indexPct: number;
  band: 'acceptable' | 'watch' | 'flag';
}

export interface ImpactBreakdown {
  /** Body-mass × COM-acceleration magnitude in Newtons (from second derivative of COM). */
  inertialN: number;
  /** Static gravity component (~bodyWeight * g) in Newtons. */
  gravityN: number;
  /** Impact share = inertial / (gravity + inertial). */
  impactShare: number;
  /** Peak inertial N over the buffer window + when it occurred. */
  peakInertialN: number;
  peakInertialAtMs: number;
}

export interface ConfidenceBand {
  /** ± Newtons one-sigma confidence based on anthropometric uncertainty. */
  oneSigmaN: number;
  /** Display string e.g. "±310 N". */
  label: string;
}

export interface ForceTimeMetrics {
  bufferLengthMs: number;
  frameCount: number;
  joints: JointTimeMetric[];
  asymmetry: AsymmetryEntry[];
  impact: ImpactBreakdown;
  /** Generic confidence band for the whole frame (applied to all joints). */
  confidence: ConfidenceBand;
  /** Most recent frame timestamp (relative to t0). */
  latestRelMs: number;
  /** Earliest frame timestamp (relative to t0). */
  earliestRelMs: number;
  /** Sanity-check warnings collected during derivation. */
  sanityWarnings: string[];
}

export interface BufferConfig {
  /** Maximum age in ms to retain frames. Default 30 s. */
  windowMs: number;
  /** Hard cap on stored frames so large camera bursts don't OOM. */
  maxFrames: number;
}

const G = 9.81;
const DEFAULT_CFG: BufferConfig = { windowMs: 30_000, maxFrames: 1200 };

const PAIR_PATTERNS: { pair: string; left: RegExp; right: RegExp }[] = [
  { pair: 'hip', left: /^left_femoral_head$/, right: /^right_femoral_head$/ },
  { pair: 'knee', left: /^left_tf_/, right: /^right_tf_/ },
  { pair: 'patellofemoral', left: /^left_patellofemoral$/, right: /^right_patellofemoral$/ },
  { pair: 'ankle', left: /^left_talocrural$/, right: /^right_talocrural$/ },
  { pair: 'shoulder', left: /^left_gh$/, right: /^right_gh$/ },
  { pair: 'si', left: /^si_left$/, right: /^si_right$/ },
];

/**
 * Bands (in body-weight multiples) used by getStatus in the postural force engine.
 * Mirrored here so we can map dose without re-running the engine.
 */
const BAND_THRESHOLD_BW = { moderate: 0.8, high: 1.5, very_high: 3.0 };

class ForceTimeBufferImpl {
  private snapshots: ForceFrameSnapshot[] = [];
  private cfg: BufferConfig = { ...DEFAULT_CFG };
  private listeners = new Set<() => void>();
  private playbackTime: number | null = null;
  /** Snapshot of the most recent metrics, recomputed lazily. */
  private metricsCache: { sig: number; value: ForceTimeMetrics } | null = null;

  configure(cfg: Partial<BufferConfig>) {
    this.cfg = { ...this.cfg, ...cfg };
    this.evict();
    this.invalidate();
  }

  getConfig(): BufferConfig {
    return this.cfg;
  }

  /** Capture a frame. Pass the full ForceAnalysisResult; only what's needed is stored. */
  push(input: {
    result: ForceAnalysisResult;
    bodyWeightKg: number;
    source: ForceSource;
    movementId?: string | null;
    footScreen?: ForceFrameSnapshot['footScreen'];
    t?: number;
  }) {
    if (!input.result) return;
    const t = input.t ?? performance.now();
    const last = this.snapshots[this.snapshots.length - 1];
    // Throttle: don't store more than ~60Hz.
    if (last && t - last.t < 14) return;
    const compactForces: ForceFrameSnapshot['forces'] = {};
    for (const j of input.result.joints) {
      compactForces[j.id] = {
        label: j.label,
        category: j.category,
        boneName: j.boneName,
        compression: j.compression,
        tension: j.tension,
        shear: j.shear,
        totalForce: j.totalForce,
        status: j.status,
      };
    }
    const snap: ForceFrameSnapshot = {
      t,
      com: { x: input.result.totalBodyCOM.x, y: input.result.totalBodyCOM.y },
      bodyWeightKg: input.bodyWeightKg,
      forces: compactForces,
      footScreen: input.footScreen,
      source: input.source,
      movementId: input.movementId ?? null,
    };
    this.snapshots.push(snap);
    this.evict();
    this.invalidate();
  }

  clear() {
    this.snapshots = [];
    this.playbackTime = null;
    this.invalidate();
  }

  /** All snapshots, oldest → newest. */
  list(): ForceFrameSnapshot[] {
    return this.snapshots;
  }

  count(): number {
    return this.snapshots.length;
  }

  /**
   * Set scrub-back playback time (relative to first frame, ms). Pass null to follow live.
   * The closest snapshot to that time is returned by getActiveSnapshot().
   */
  setPlaybackTime(relMs: number | null) {
    this.playbackTime = relMs;
    this.invalidate();
  }

  getPlaybackTime(): number | null {
    return this.playbackTime;
  }

  /** Snapshot at scrub time, or the latest if not scrubbing. */
  getActiveSnapshot(): ForceFrameSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (this.playbackTime == null) return this.snapshots[this.snapshots.length - 1];
    const t0 = this.snapshots[0].t;
    const target = t0 + this.playbackTime;
    let best = this.snapshots[0];
    let bestDt = Math.abs(best.t - target);
    for (const s of this.snapshots) {
      const dt = Math.abs(s.t - target);
      if (dt < bestDt) { best = s; bestDt = dt; }
    }
    return best;
  }

  /** Reactive subscribe — returns unsubscribe. */
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Derive metrics across the whole buffer window. */
  getMetrics(): ForceTimeMetrics {
    const sig = this.snapshots.length === 0 ? 0 : this.snapshots[this.snapshots.length - 1].t;
    if (this.metricsCache && this.metricsCache.sig === sig) return this.metricsCache.value;
    const value = this.deriveMetrics();
    this.metricsCache = { sig, value };
    return value;
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private evict() {
    const now = performance.now();
    while (this.snapshots.length > 0 && now - this.snapshots[0].t > this.cfg.windowMs) {
      this.snapshots.shift();
    }
    while (this.snapshots.length > this.cfg.maxFrames) {
      this.snapshots.shift();
    }
  }

  private invalidate() {
    this.metricsCache = null;
    this.listeners.forEach(l => {
      try { l(); } catch { /* listener errors must not break the buffer */ }
    });
  }

  private deriveMetrics(): ForceTimeMetrics {
    const sanityWarnings: string[] = [];
    if (this.snapshots.length === 0) {
      return {
        bufferLengthMs: 0,
        frameCount: 0,
        joints: [],
        asymmetry: [],
        impact: { inertialN: 0, gravityN: 0, impactShare: 0, peakInertialN: 0, peakInertialAtMs: 0 },
        confidence: { oneSigmaN: 0, label: '±0 N' },
        latestRelMs: 0,
        earliestRelMs: 0,
        sanityWarnings,
      };
    }
    const t0 = this.snapshots[0].t;
    const tNow = this.snapshots[this.snapshots.length - 1].t;
    const bufferLengthMs = tNow - t0;
    const latestBW = this.snapshots[this.snapshots.length - 1].bodyWeightKg;

    // Per-joint metrics: walk the buffer once.
    const jointAcc = new Map<string, {
      label: string;
      lastN: number;
      smoothRate: number;
      peakRate: number;
      peakRateAt: number;
      peakForce: number;
      peakForceAt: number;
      doseMs: { moderate: number; high: number; very_high: number };
      lastT: number;
      seen: boolean;
    }>();

    let prevSnap: ForceFrameSnapshot | null = null;
    for (const snap of this.snapshots) {
      const bw = snap.bodyWeightKg;
      const dt = prevSnap ? (snap.t - prevSnap.t) / 1000 : 0; // seconds
      for (const id of Object.keys(snap.forces)) {
        const f = snap.forces[id];
        const totalN = f.totalForce * bw * G;
        // Sanity: forces never negative.
        if (totalN < 0) {
          sanityWarnings.push(`negative force on ${id}`);
        }
        let entry = jointAcc.get(id);
        if (!entry) {
          entry = {
            label: f.label,
            lastN: totalN,
            smoothRate: 0,
            peakRate: 0,
            peakRateAt: 0,
            peakForce: totalN,
            peakForceAt: snap.t - t0,
            doseMs: { moderate: 0, high: 0, very_high: 0 },
            lastT: snap.t,
            seen: true,
          };
          jointAcc.set(id, entry);
        } else {
          if (dt > 0) {
            const instRate = (totalN - entry.lastN) / dt;
            // EWMA smoothing (alpha 0.4) so single noisy frames don't dominate.
            entry.smoothRate = entry.smoothRate * 0.6 + instRate * 0.4;
            const absRate = Math.abs(entry.smoothRate);
            if (absRate > entry.peakRate) {
              entry.peakRate = absRate;
              entry.peakRateAt = snap.t - t0;
            }
          }
          if (totalN > entry.peakForce) {
            entry.peakForce = totalN;
            entry.peakForceAt = snap.t - t0;
          }
          // Cumulative dose: time spent above each band threshold.
          if (prevSnap && dt > 0) {
            const dtMs = dt * 1000;
            const totalBW = f.totalForce; // already body-weight multiples
            if (totalBW >= BAND_THRESHOLD_BW.very_high) entry.doseMs.very_high += dtMs;
            else if (totalBW >= BAND_THRESHOLD_BW.high) entry.doseMs.high += dtMs;
            else if (totalBW >= BAND_THRESHOLD_BW.moderate) entry.doseMs.moderate += dtMs;
          }
          entry.lastN = totalN;
          entry.lastT = snap.t;
        }
      }
      prevSnap = snap;
    }

    const joints: JointTimeMetric[] = [];
    jointAcc.forEach((e, id) => {
      // Sanity: dose must be non-negative.
      if (e.doseMs.high < 0 || e.doseMs.moderate < 0 || e.doseMs.very_high < 0) {
        sanityWarnings.push(`negative dose on ${id}`);
      }
      joints.push({
        jointId: id,
        label: e.label,
        peakRateNps: e.peakRate,
        currentRateNps: e.smoothRate,
        doseMs: e.doseMs,
        peakForceN: e.peakForce,
        peakForceAtMs: e.peakForceAt,
        peakRateAtMs: e.peakRateAt,
      });
    });
    joints.sort((a, b) => b.peakForceN - a.peakForceN);

    // ─── Impact / inertial via 2nd derivative of COM ──────────────────────
    const impact = this.computeImpact(latestBW);

    // ─── Asymmetry: average force over buffer per pair ────────────────────
    const sums = new Map<string, { sumN: number; n: number }>();
    for (const snap of this.snapshots) {
      const bw = snap.bodyWeightKg;
      for (const id of Object.keys(snap.forces)) {
        const totalN = snap.forces[id].totalForce * bw * G;
        const key = id;
        const entry = sums.get(key) ?? { sumN: 0, n: 0 };
        entry.sumN += totalN;
        entry.n += 1;
        sums.set(key, entry);
      }
    }
    const avg = (id: string) => {
      const e = sums.get(id);
      return e && e.n > 0 ? e.sumN / e.n : 0;
    };
    const asymmetry: AsymmetryEntry[] = [];
    for (const def of PAIR_PATTERNS) {
      let lSum = 0, lN = 0, rSum = 0, rN = 0;
      sums.forEach((v, k) => {
        if (def.left.test(k)) { lSum += v.sumN; lN += v.n; }
        else if (def.right.test(k)) { rSum += v.sumN; rN += v.n; }
      });
      const lAvg = lN > 0 ? lSum / lN : 0;
      const rAvg = rN > 0 ? rSum / rN : 0;
      const denom = Math.max(lAvg, rAvg);
      if (denom <= 0) continue;
      const idx = (Math.abs(lAvg - rAvg) / denom) * 100;
      // Sanity: idx ∈ [0, 100].
      if (idx < 0 || idx > 100.0001) sanityWarnings.push(`asymmetry out of bounds for ${def.pair}`);
      const band: AsymmetryEntry['band'] = idx < 10 ? 'acceptable' : idx < 20 ? 'watch' : 'flag';
      asymmetry.push({
        pair: def.pair,
        leftAvgN: lAvg,
        rightAvgN: rAvg,
        indexPct: Math.min(100, Math.max(0, idx)),
        band,
      });
    }
    void avg; // silence unused

    // ─── Confidence band: anthropometric uncertainty ──────────────────────
    // Segment-mass percentages have ~4–6% std (de Leva 1996 reanalysis of
    // Zatsiorsky / Seluyanov), height-derived lever arms add another ~3%.
    // Assume ~7% one-sigma on every Newton-derived force.
    const peakN = joints.length > 0 ? joints[0].peakForceN : 0;
    const oneSigma = peakN * 0.07;
    const confidence: ConfidenceBand = {
      oneSigmaN: oneSigma,
      label: `±${Math.round(oneSigma)} N`,
    };

    return {
      bufferLengthMs,
      frameCount: this.snapshots.length,
      joints,
      asymmetry,
      impact,
      confidence,
      latestRelMs: tNow - t0,
      earliestRelMs: 0,
      sanityWarnings,
    };
  }

  /**
   * Estimate impact / inertial force from the second derivative of the
   * postural-engine COM proxy. The proxy is in normalized "shift" units;
   * scale by body height in metres so that a 1-unit shift ≈ 1 metre.
   */
  private computeImpact(latestBW: number): ImpactBreakdown {
    const gravityN = latestBW * G;
    if (this.snapshots.length < 3) {
      return { inertialN: 0, gravityN, impactShare: 0, peakInertialN: 0, peakInertialAtMs: 0 };
    }
    const t0 = this.snapshots[0].t;
    let peakInertial = 0;
    let peakAt = 0;
    let last = 0;
    for (let i = 2; i < this.snapshots.length; i++) {
      const a = this.snapshots[i - 2];
      const b = this.snapshots[i - 1];
      const c = this.snapshots[i];
      const dt1 = (b.t - a.t) / 1000;
      const dt2 = (c.t - b.t) / 1000;
      if (dt1 <= 0 || dt2 <= 0) continue;
      // Centred 2nd derivative on (x, y) of the COM proxy (units = body-shifts).
      // Multiply by ~0.7 m to roughly convert proxy → metres; this is a
      // first-order estimate, refined in clinic by patient-state thresholds.
      const ax = ((c.com.x - 2 * b.com.x + a.com.x) / ((dt1 + dt2) / 2) ** 2) * 0.7;
      const ay = ((c.com.y - 2 * b.com.y + a.com.y) / ((dt1 + dt2) / 2) ** 2) * 0.7;
      const aMag = Math.hypot(ax, ay);
      const inertialN = c.bodyWeightKg * aMag;
      if (inertialN > peakInertial) { peakInertial = inertialN; peakAt = c.t - t0; }
      last = inertialN;
    }
    return {
      inertialN: last,
      gravityN,
      impactShare: gravityN + last > 0 ? last / (gravityN + last) : 0,
      peakInertialN: peakInertial,
      peakInertialAtMs: peakAt,
    };
  }
}

export const forceTimeBuffer = new ForceTimeBufferImpl();

/**
 * React-friendly wrapper: subscribe and re-render when the buffer changes.
 * (Caller must use it from inside a React component via useSyncExternalStore.)
 */
export function subscribeForceBuffer(cb: () => void) {
  return forceTimeBuffer.subscribe(cb);
}

export function getForceBufferSnapshot() {
  return forceTimeBuffer.list();
}
