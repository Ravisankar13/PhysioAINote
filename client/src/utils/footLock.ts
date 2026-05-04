/**
 * Foot Lock Tracker
 *
 * Detects per-foot support phase (planted / swinging) from MediaPipe pose
 * landmark velocity, visibility, and vertical position, then exposes:
 *   - support state for each foot
 *   - a hip-translation offset that keeps the planted foot pinned to its
 *     first-planted screen location (root re-anchoring)
 *   - a low-pass-filtered torso basis (up/forward/right) so hip-angle
 *     dot products don't wobble with torso noise.
 *
 * The offset is exposed in `hipMidNorm` coordinate space (x=raw,
 * y=-raw, z=-raw) so callers can add it directly to their hipMidNorm
 * vector before computing globalTranslation.
 */

import { NormalizedLandmark } from '@mediapipe/pose';

export type FootSupportPhase = 'planted' | 'swinging';

export interface FootSupportState {
  left: FootSupportPhase;
  right: FootSupportPhase;
}

export interface FootLockOffset {
  x: number;
  y: number;
  z: number;
}

export interface FootVisibilityState {
  left: boolean;
  right: boolean;
}

export interface FootLockUpdate {
  support: FootSupportState;
  hipOffset: FootLockOffset;
  hasAnchor: boolean;
  leftAnchor: Vec3 | null;
  rightAnchor: Vec3 | null;
  feetVisible: FootVisibilityState;
}

export interface IKLandmarks {
  knee: Vec3;
  ankle: Vec3;
}

/**
 * Two-bone IK solver for a single leg.
 * Given a fixed hip and a target ankle position (the planted-foot anchor),
 * returns the knee and ankle positions whose bone lengths exactly match
 * `thighLen` and `shinLen`. The `kneePoleHint` (typically the current raw
 * knee landmark) decides which side the knee bends toward when the leg
 * isn't fully extended; if the hint projects to zero on the bend plane,
 * we fall back to camera-forward (+z) so knees bend forward.
 */
export function solveLegIK(
  hip: Vec3,
  kneePoleHint: Vec3,
  anchor: Vec3,
  thighLen: number,
  shinLen: number
): IKLandmarks {
  const v = { x: anchor.x - hip.x, y: anchor.y - hip.y, z: anchor.z - hip.z };
  let d = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const maxD = thighLen + shinLen - 1e-4;
  const minD = Math.abs(thighLen - shinLen) + 1e-4;

  // Unreachable: clamp ankle along the line and put knee on it
  if (d > maxD) {
    const k = maxD / Math.max(d, 1e-6);
    const newAnkle: Vec3 = { x: hip.x + v.x * k, y: hip.y + v.y * k, z: hip.z + v.z * k };
    const tk = thighLen / maxD;
    const newKnee: Vec3 = { x: hip.x + v.x * k * tk, y: hip.y + v.y * k * tk, z: hip.z + v.z * k * tk };
    return { knee: newKnee, ankle: newAnkle };
  }
  if (d < minD) d = minD;

  const vNorm: Vec3 = { x: v.x / d, y: v.y / d, z: v.z / d };
  const cosA = (thighLen * thighLen + d * d - shinLen * shinLen) / (2 * thighLen * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));

  // Pole direction: project (current_knee - midpoint(hip, anchor)) onto plane perpendicular to v
  const mid: Vec3 = { x: (hip.x + anchor.x) / 2, y: (hip.y + anchor.y) / 2, z: (hip.z + anchor.z) / 2 };
  let pole: Vec3 = { x: kneePoleHint.x - mid.x, y: kneePoleHint.y - mid.y, z: kneePoleHint.z - mid.z };
  const pDotV = pole.x * vNorm.x + pole.y * vNorm.y + pole.z * vNorm.z;
  pole = { x: pole.x - pDotV * vNorm.x, y: pole.y - pDotV * vNorm.y, z: pole.z - pDotV * vNorm.z };
  let pMag = Math.sqrt(pole.x * pole.x + pole.y * pole.y + pole.z * pole.z);
  if (pMag < 1e-6) {
    pole = { x: 0, y: 0, z: 1 };
    pMag = 1;
  }
  pole = { x: pole.x / pMag, y: pole.y / pMag, z: pole.z / pMag };

  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const newKnee: Vec3 = {
    x: hip.x + thighLen * (ca * vNorm.x + sa * pole.x),
    y: hip.y + thighLen * (ca * vNorm.y + sa * pole.y),
    z: hip.z + thighLen * (ca * vNorm.z + sa * pole.z),
  };
  return { knee: newKnee, ankle: { ...anchor } };
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface FootState {
  prevPos: Vec3 | null;
  velocityHistory: number[];
  visibilityHistory: number[];
  phase: FootSupportPhase;
  anchor: Vec3 | null;
  framesInPhase: number;
}

const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT_INDEX = 31;
const RIGHT_FOOT_INDEX = 32;

const HISTORY_SIZE = 5;
const VELOCITY_PLANTED_THRESHOLD = 0.012;   // normalized landmark units / frame
const VELOCITY_SWING_THRESHOLD = 0.025;
const VISIBILITY_MIN = 0.45;
const Y_PLANTED_TOLERANCE = 0.07;            // foot must be within ~7% y of lowest point
const FRAMES_TO_PLANT = 3;
const FRAMES_TO_SWING = 2;
const TORSO_BASIS_ALPHA = 0.18;              // heavier low-pass on torso frame
const BASELINE_FLOOR_RISE = 0.05;            // baseline tracks slowly toward newly-observed lower foot
const BASELINE_FLOOR_FALL = 0.0005;          // baseline drifts up extremely slowly, and ONLY while both feet
                                              //   are clearly above it — prevents long-run decay from eroding
                                              //   the airborne reference under quiet standing.
const AIRBORNE_GAP = 0.10;                   // both feet >10% above baseline floor → airborne, force swinging

export class FootLockTracker {
  private left: FootState = makeFootState();
  private right: FootState = makeFootState();
  private smoothedUp: Vec3 | null = null;
  private smoothedFwd: Vec3 | null = null;
  private smoothedRight: Vec3 | null = null;
  // Absolute floor baseline (in MediaPipe normalized y, where larger = lower
  // on screen). Tracks the lowest stable foot position seen this session so
  // we can detect true "both feet airborne" frames (e.g., during a jump or
  // when the camera tilts sharply) and avoid mis-classifying them as
  // planted just because the two feet happen to be at similar heights.
  private baselineFloorY: number | null = null;

  reset(): void {
    this.left = makeFootState();
    this.right = makeFootState();
    this.smoothedUp = null;
    this.smoothedFwd = null;
    this.smoothedRight = null;
    this.baselineFloorY = null;
  }

  /**
   * Low-pass filter the torso basis vectors to absorb torso wobble that
   * otherwise corrupts hip / knee dot-product calculations.
   *
   * `valid` lets the caller signal that this frame's basis is degenerate
   * (e.g., torso landmarks below visibility threshold, or up/right
   * vectors near-parallel so the cross product is meaningless). When
   * `valid === false` we don't update internal state — we just return
   * the previously held basis. This prevents single-frame flips/twists
   * from a partially-occluded torso polluting every downstream dot
   * product. If we have no previous basis yet (first frame), we accept
   * the input regardless to avoid returning a zero vector.
   */
  smoothTorsoBasis(up: Vec3, forward: Vec3, right: Vec3, valid: boolean = true): { up: Vec3; forward: Vec3; right: Vec3 } {
    if (!valid && this.smoothedUp && this.smoothedFwd && this.smoothedRight) {
      return {
        up: normalize(this.smoothedUp),
        forward: normalize(this.smoothedFwd),
        right: normalize(this.smoothedRight),
      };
    }
    const a = TORSO_BASIS_ALPHA;
    if (!this.smoothedUp) this.smoothedUp = { ...up };
    else {
      this.smoothedUp.x += (up.x - this.smoothedUp.x) * a;
      this.smoothedUp.y += (up.y - this.smoothedUp.y) * a;
      this.smoothedUp.z += (up.z - this.smoothedUp.z) * a;
    }
    if (!this.smoothedFwd) this.smoothedFwd = { ...forward };
    else {
      this.smoothedFwd.x += (forward.x - this.smoothedFwd.x) * a;
      this.smoothedFwd.y += (forward.y - this.smoothedFwd.y) * a;
      this.smoothedFwd.z += (forward.z - this.smoothedFwd.z) * a;
    }
    if (!this.smoothedRight) this.smoothedRight = { ...right };
    else {
      this.smoothedRight.x += (right.x - this.smoothedRight.x) * a;
      this.smoothedRight.y += (right.y - this.smoothedRight.y) * a;
      this.smoothedRight.z += (right.z - this.smoothedRight.z) * a;
    }
    return {
      up: normalize(this.smoothedUp),
      forward: normalize(this.smoothedFwd),
      right: normalize(this.smoothedRight),
    };
  }

  /**
   * Update support phases and return per-foot state plus a hip-translation
   * correction in hipMidNorm coordinates (x=raw, y=-raw, z=-raw).
   */
  update(landmarks: NormalizedLandmark[]): FootLockUpdate {
    const lAnkle = landmarks[LEFT_ANKLE];
    const rAnkle = landmarks[RIGHT_ANKLE];
    if (!lAnkle || !rAnkle) {
      return {
        support: { left: this.left.phase, right: this.right.phase },
        hipOffset: { x: 0, y: 0, z: 0 },
        hasAnchor: false,
        leftAnchor: this.left.anchor ? { ...this.left.anchor } : null,
        rightAnchor: this.right.anchor ? { ...this.right.anchor } : null,
        feetVisible: { left: false, right: false },
      };
    }

    const lFoot = footCentroid(landmarks, LEFT_ANKLE, LEFT_HEEL, LEFT_FOOT_INDEX);
    const rFoot = footCentroid(landmarks, RIGHT_ANKLE, RIGHT_HEEL, RIGHT_FOOT_INDEX);
    // Blend visibility across the same three landmarks the centroid uses
    // (ankle + heel + foot-index) instead of ankle-only, so the gate
    // doesn't drop the foot to "low confidence" when the ankle is
    // briefly occluded but the heel/forefoot remain clearly visible
    // (e.g., long pants over the malleoli).
    const lVis = footVisibility(landmarks, LEFT_ANKLE, LEFT_HEEL, LEFT_FOOT_INDEX);
    const rVis = footVisibility(landmarks, RIGHT_ANKLE, RIGHT_HEEL, RIGHT_FOOT_INDEX);

    // Off-frame + ankle-visibility check FIRST so we can short-circuit
    // phase updates and IK for feet the camera literally can't see.
    // MediaPipe will happily extrapolate ankle landmarks past the image
    // edges (often with surprisingly high visibility scores) and the
    // tracker would otherwise capture a "planted" anchor against that
    // ghost position, holding the avatar foot to a phantom point. Pre-
    // condition for any planted state: feetVisible must be true.
    const lOnFrame = lFoot.x >= -0.05 && lFoot.x <= 1.05 && lFoot.y >= -0.05 && lFoot.y <= 1.05;
    const rOnFrame = rFoot.x >= -0.05 && rFoot.x <= 1.05 && rFoot.y >= -0.05 && rFoot.y <= 1.05;
    const lAnkleVis = (landmarks[LEFT_ANKLE]?.visibility ?? 0) >= VISIBILITY_MIN;
    const rAnkleVis = (landmarks[RIGHT_ANKLE]?.visibility ?? 0) >= VISIBILITY_MIN;
    const leftVisible = lOnFrame && lAnkleVis;
    const rightVisible = rOnFrame && rAnkleVis;

    const maxY = Math.max(lFoot.y, rFoot.y);

    // Update absolute floor baseline. React quickly when a foot lands
    // *at or below* the current baseline (rise toward maxY). Only allow
    // the baseline to drift upward when BOTH feet are clearly above it
    // (true airborne) — quiet-standing frames where maxY hovers a hair
    // below the baseline must NOT erode the reference, otherwise long
    // sessions slowly invalidate airborne detection.
    if (this.baselineFloorY === null) {
      this.baselineFloorY = maxY;
    } else if (maxY > this.baselineFloorY) {
      this.baselineFloorY += (maxY - this.baselineFloorY) * BASELINE_FLOOR_RISE;
    }

    if (leftVisible) {
      this.updateFoot(this.left, lFoot, lVis, maxY);
    } else {
      // Force swinging + drop anchor + reset velocity history origin so
      // when the foot reappears we don't read a giant velocity from the
      // off-frame gap and accidentally re-plant on the wrong frame.
      this.left.phase = 'swinging';
      this.left.framesInPhase = 0;
      this.left.anchor = null;
      this.left.prevPos = null;
      this.left.velocityHistory = [];
      this.left.visibilityHistory = [];
    }
    if (rightVisible) {
      this.updateFoot(this.right, rFoot, rVis, maxY);
    } else {
      this.right.phase = 'swinging';
      this.right.framesInPhase = 0;
      this.right.anchor = null;
      this.right.prevPos = null;
      this.right.velocityHistory = [];
      this.right.visibilityHistory = [];
    }

    // Airborne guard: if BOTH feet are clearly above the baseline floor,
    // force both to 'swinging' so the avatar falls back to hip-driven
    // translation instead of locking to stale anchors. Bypasses the
    // FRAMES_TO_SWING hysteresis because airborne is unambiguous. Also
    // the only condition under which the baseline is allowed to decay
    // upward (drift toward the airborne foot positions slowly).
    const airborneL = (this.baselineFloorY - lFoot.y) > AIRBORNE_GAP;
    const airborneR = (this.baselineFloorY - rFoot.y) > AIRBORNE_GAP;
    if (airborneL && airborneR) {
      this.baselineFloorY -= BASELINE_FLOOR_FALL;
      if (this.left.phase === 'planted') {
        this.left.phase = 'swinging';
        this.left.framesInPhase = 0;
        this.left.anchor = null;
      }
      if (this.right.phase === 'planted') {
        this.right.phase = 'swinging';
        this.right.framesInPhase = 0;
        this.right.anchor = null;
      }
    }

    let dxRaw = 0, dyRaw = 0, dzRaw = 0, count = 0;
    if (this.left.phase === 'planted' && this.left.anchor) {
      dxRaw += this.left.anchor.x - lFoot.x;
      dyRaw += this.left.anchor.y - lFoot.y;
      dzRaw += this.left.anchor.z - lFoot.z;
      count++;
    }
    if (this.right.phase === 'planted' && this.right.anchor) {
      dxRaw += this.right.anchor.x - rFoot.x;
      dyRaw += this.right.anchor.y - rFoot.y;
      dzRaw += this.right.anchor.z - rFoot.z;
      count++;
    }
    if (count > 0) {
      dxRaw /= count; dyRaw /= count; dzRaw /= count;
    }

    return {
      support: { left: this.left.phase, right: this.right.phase },
      hipOffset: { x: dxRaw, y: -dyRaw, z: -dzRaw },
      hasAnchor: count > 0,
      leftAnchor: this.left.anchor ? { ...this.left.anchor } : null,
      rightAnchor: this.right.anchor ? { ...this.right.anchor } : null,
      feetVisible: { left: leftVisible, right: rightVisible },
    };
  }

  private updateFoot(foot: FootState, pos: Vec3, vis: number, maxY: number): void {
    let velocity = 0;
    if (foot.prevPos) {
      const dx = pos.x - foot.prevPos.x;
      const dy = pos.y - foot.prevPos.y;
      const dz = pos.z - foot.prevPos.z;
      velocity = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    foot.prevPos = { ...pos };

    foot.velocityHistory.push(velocity);
    if (foot.velocityHistory.length > HISTORY_SIZE) foot.velocityHistory.shift();
    foot.visibilityHistory.push(vis);
    if (foot.visibilityHistory.length > HISTORY_SIZE) foot.visibilityHistory.shift();

    const avgVel = foot.velocityHistory.reduce((s, v) => s + v, 0) / foot.velocityHistory.length;
    const avgVis = foot.visibilityHistory.reduce((s, v) => s + v, 0) / foot.visibilityHistory.length;
    const nearFloor = (maxY - pos.y) < Y_PLANTED_TOLERANCE;

    const wantPlanted = avgVel < VELOCITY_PLANTED_THRESHOLD && avgVis >= VISIBILITY_MIN && nearFloor;
    const wantSwinging = avgVel > VELOCITY_SWING_THRESHOLD || avgVis < VISIBILITY_MIN || !nearFloor;

    if (foot.phase === 'planted') {
      if (wantSwinging) {
        foot.framesInPhase++;
        if (foot.framesInPhase >= FRAMES_TO_SWING) {
          foot.phase = 'swinging';
          foot.framesInPhase = 0;
          foot.anchor = null;
        }
      } else {
        foot.framesInPhase = 0;
        if (!foot.anchor) foot.anchor = { ...pos };
      }
    } else {
      if (wantPlanted) {
        foot.framesInPhase++;
        if (foot.framesInPhase >= FRAMES_TO_PLANT) {
          foot.phase = 'planted';
          foot.framesInPhase = 0;
          foot.anchor = { ...pos };
        }
      } else {
        foot.framesInPhase = 0;
      }
    }
  }
}

function makeFootState(): FootState {
  return {
    prevPos: null,
    velocityHistory: [],
    visibilityHistory: [],
    // Start as 'swinging' so the leg only enters the planted/IK path after
    // FRAMES_TO_PLANT consecutive low-velocity frames have actually
    // captured a stable anchor. Defaulting to 'planted' caused the first
    // few frames to over-damp and apply IK against a null anchor.
    phase: 'swinging',
    anchor: null,
    framesInPhase: 0,
  };
}

function footVisibility(lms: NormalizedLandmark[], ai: number, hi: number, fi: number): number {
  const av = lms[ai]?.visibility ?? 0;
  const hv = lms[hi]?.visibility ?? av;
  const fv = lms[fi]?.visibility ?? av;
  // Use the max of the three so a single-landmark dropout doesn't
  // immediately push the foot into the swinging gate.
  return Math.max(av, hv, fv);
}

function footCentroid(lms: NormalizedLandmark[], ai: number, hi: number, fi: number): Vec3 {
  const a = lms[ai];
  const h = lms[hi] || a;
  const f = lms[fi] || a;
  return {
    x: (a.x + h.x + f.x) / 3,
    y: (a.y + h.y + f.y) / 3,
    z: (a.z + h.z + f.z) / 3,
  };
}

function normalize(v: Vec3): Vec3 {
  const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}
