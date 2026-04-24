// Ground reaction force vector + base-of-support helpers.
// Consumed by the GRFOverlay component to draw a live arrow on the 3D
// skeleton and turn it red when the COM projection leaves the patient's
// base of support polygon.

import type { ForceFrameSnapshot } from './forceTimeBuffer';

const G = 9.81;

export interface FootScreenPos {
  x: number;
  y: number;
}

export interface GRFResult {
  /** Magnitude of the resultant ground reaction force in Newtons. */
  magnitudeN: number;
  /** Direction from foot upward in screen space; +x right, +y up. */
  direction: { x: number; y: number };
  /** True when the COM projection falls outside the base of support polygon. */
  outsideBaseOfSupport: boolean;
  /** Screen position of the assumed COM projection point (if foot anchors known). */
  comProjScreen: FootScreenPos | null;
  /** Proportion of body weight currently on each foot (left, right). */
  share: { left: number; right: number };
}

export interface GRFInput {
  bodyWeightKg: number;
  /** Last few snapshots for a 2nd derivative on COM (impact). */
  history: ForceFrameSnapshot[];
  /** Foot screen positions (front/back of stance). */
  leftFoot?: FootScreenPos;
  rightFoot?: FootScreenPos;
  /** Optional left/right load share (0..1 each). When omitted, splits 50/50. */
  shareLeft?: number;
  shareRight?: number;
}

/**
 * Compute a ground-reaction-force estimate in screen-overlay coordinates.
 * The horizontal component comes from COM acceleration (m·a), the vertical
 * component from gravity (m·g) plus inertial vertical acceleration. Magnitude
 * is therefore meaningful in Newtons but direction is overlay-friendly.
 */
export function computeGRF(input: GRFInput): GRFResult {
  const { bodyWeightKg, history } = input;
  const m = bodyWeightKg;
  let ax = 0;
  let ay = 0;
  if (history.length >= 3) {
    const a = history[history.length - 3];
    const b = history[history.length - 2];
    const c = history[history.length - 1];
    const dt1 = (b.t - a.t) / 1000;
    const dt2 = (c.t - b.t) / 1000;
    if (dt1 > 0 && dt2 > 0) {
      const dtAvg = (dt1 + dt2) / 2;
      ax = ((c.com.x - 2 * b.com.x + a.com.x) / (dtAvg * dtAvg)) * 0.7;
      ay = ((c.com.y - 2 * b.com.y + a.com.y) / (dtAvg * dtAvg)) * 0.7;
    }
  }
  const fx = -m * ax;        // Newton's 3rd: GRF opposes COM accel.
  const fy = m * G + m * (-ay); // Vertical: gravity + inertial.
  const magnitudeN = Math.hypot(fx, fy);

  // Base-of-support polygon: left/right foot positions form a horizontal line.
  // COM projection is mid-stance plus the latest com.x shift (in screen-x).
  let outsideBaseOfSupport = false;
  let comProjScreen: FootScreenPos | null = null;
  if (input.leftFoot && input.rightFoot) {
    const midX = (input.leftFoot.x + input.rightFoot.x) / 2;
    const midY = (input.leftFoot.y + input.rightFoot.y) / 2;
    const halfWidth = Math.abs(input.rightFoot.x - input.leftFoot.x) / 2;
    // com.x is in body-shift units (~0..0.5); scale to half-stance width pixels.
    const lastCom = history[history.length - 1]?.com.x ?? 0;
    const projX = midX + lastCom * halfWidth * 5;
    comProjScreen = { x: projX, y: midY };
    outsideBaseOfSupport = Math.abs(projX - midX) > halfWidth + 6;
  }

  // Direction is for the overlay arrow: screen-y goes down so we flip vertical.
  const dir = magnitudeN > 0
    ? { x: fx / magnitudeN, y: -(fy / magnitudeN) }
    : { x: 0, y: -1 };

  return {
    magnitudeN,
    direction: dir,
    outsideBaseOfSupport,
    comProjScreen,
    share: {
      left: input.shareLeft ?? 0.5,
      right: input.shareRight ?? 0.5,
    },
  };
}

/** Format Newtons as a short HUD label, e.g. "780 N" or "1.2 kN". */
export function formatNewtons(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)} kN`;
  return `${Math.round(n)} N`;
}

// ─── Linked-segment force propagation ────────────────────────────────────
// Bottom-up Newton sum: each level carries the body weight above it plus
// the inertial contribution from the COM acceleration. This is a simplified
// rigid-body chain (Newton's 2nd law per segment), not full inverse dynamics
// (no moment arms or joint torques), but it gives a clinically useful sense
// of how load grows from foot → trunk and how it changes when the patient
// is moving vs. holding a static pose. Segment masses use de Leva (1996)
// fractions of body mass.

export interface SegmentLevel {
  /** Display name. */
  name: string;
  /** Cumulative axial force at this level (Newtons). */
  axialN: number;
  /** Mass above this level (kg). */
  massAboveKg: number;
}

const SEGMENT_FRACTIONS = [
  { name: 'Foot',   massFrac: 0.0145 },   // each foot
  { name: 'Shank',  massFrac: 0.0465 },   // each shank
  { name: 'Thigh',  massFrac: 0.1000 },   // each thigh
  { name: 'Pelvis', massFrac: 0.1117 },   // pelvis
  { name: 'Trunk',  massFrac: 0.4346 },   // thorax + abdomen
  { name: 'Head/Arms', massFrac: 0.1592 }, // head + neck + both upper extremities
];

/**
 * Propagate force from foot up through the kinetic chain.
 * `inertialMagN` is the additional inertial component (m·a) from the COM
 * (use `ImpactBreakdown.inertialN` from the buffer metrics).
 */
export function propagateLinkedSegments(
  bodyWeightKg: number,
  inertialMagN: number,
): SegmentLevel[] {
  const G = 9.81;
  // Walk top → bottom, accumulating mass above each joint level.
  const levels: SegmentLevel[] = [];
  let massAbove = 0;
  // We start at the head and walk down; each loop iteration represents the
  // joint *below* the segment we just added.
  for (let i = SEGMENT_FRACTIONS.length - 1; i >= 0; i--) {
    massAbove += SEGMENT_FRACTIONS[i].massFrac * bodyWeightKg;
    // Inertial contribution scales with the mass above (each segment "feels"
    // the same COM acceleration, so its inertial share is its mass above × a).
    const massAboveShare = bodyWeightKg > 0 ? massAbove / bodyWeightKg : 0;
    const axialN = massAbove * G + inertialMagN * massAboveShare;
    levels.push({
      name: SEGMENT_FRACTIONS[i].name,
      axialN,
      massAboveKg: massAbove,
    });
  }
  // Reverse so result is foot → trunk (bottom-up display).
  return levels.reverse();
}

