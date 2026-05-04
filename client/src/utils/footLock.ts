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

export interface FootLockUpdate {
  support: FootSupportState;
  hipOffset: FootLockOffset;
  hasAnchor: boolean;
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

export class FootLockTracker {
  private left: FootState = makeFootState();
  private right: FootState = makeFootState();
  private smoothedUp: Vec3 | null = null;
  private smoothedFwd: Vec3 | null = null;
  private smoothedRight: Vec3 | null = null;

  reset(): void {
    this.left = makeFootState();
    this.right = makeFootState();
    this.smoothedUp = null;
    this.smoothedFwd = null;
    this.smoothedRight = null;
  }

  /**
   * Low-pass filter the torso basis vectors to absorb torso wobble that
   * otherwise corrupts hip / knee dot-product calculations.
   */
  smoothTorsoBasis(up: Vec3, forward: Vec3, right: Vec3): { up: Vec3; forward: Vec3; right: Vec3 } {
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
      };
    }

    const lFoot = footCentroid(landmarks, LEFT_ANKLE, LEFT_HEEL, LEFT_FOOT_INDEX);
    const rFoot = footCentroid(landmarks, RIGHT_ANKLE, RIGHT_HEEL, RIGHT_FOOT_INDEX);
    const lVis = lAnkle.visibility ?? 1.0;
    const rVis = rAnkle.visibility ?? 1.0;
    const maxY = Math.max(lFoot.y, rFoot.y);

    this.updateFoot(this.left, lFoot, lVis, maxY);
    this.updateFoot(this.right, rFoot, rVis, maxY);

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
    phase: 'planted',
    anchor: null,
    framesInPhase: 0,
  };
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
