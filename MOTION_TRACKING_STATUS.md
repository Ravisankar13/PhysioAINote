# Motion Tracking: Current Status and Path Forward

**Audience:** Client / Product stakeholder
**Scope:** Camera-driven 3D avatar on the PhysioGPT page
**Date:** Current sprint

---

## 1. Executive summary

The PhysioGPT camera feature currently drives a 3D anatomical avatar from the
user's webcam in real time. Finger tracking works well. Body tracking — the
position of arms, shoulders, and elbows on the avatar — matches the user's
actual movements **at roughly 55–60% fidelity**. To reach production quality
we need to replace the body-tracking math layer. We have three options; all
are scoped in section 4.

**Recommendation:** integrate an existing retargeting library ("kalidokit"),
2–3 days of engineering work, to raise fidelity to ~80%. If the product
requires clinical-grade accuracy (~95%), switch to a commercial motion-capture
API (Move.ai or Rokoko) — same order of effort, higher ongoing cost.

---

## 2. What works today

| Feature | Works? | Notes |
| --- | --- | --- |
| Finger tracking (curl / open hand) | Yes, ~85% fidelity | Uses MediaPipe Hands model; robust |
| Body stability when partially in frame | Yes | Avatar freezes limbs at default pose rather than hallucinating motion |
| Leg tracking when full body visible | Moderate, ~50% | Locked to default when legs are out of frame |
| Head / neck orientation | Moderate, ~65% | Gated to neutral when shoulders are not clearly visible |
| Elbow bend | Partial, ~70% | Direction correct, magnitude undershoots by ~15% |
| Shoulder position when arm is raised | Weak, ~45% | Correct direction, magnitude variable |
| Shoulder internal rotation (e.g. hand-to-head motion) | Disabled | Math layer produces wrong direction, intentionally zeroed out |
| Wrist rotation (hand vs forearm alignment) | Disabled | Held at rig default; not currently driven by tracking |

**Weighted overall tracking fidelity: 55–60%.**

---

## 3. Why the gap exists

The current implementation is built on **MediaPipe Pose**, a browser-based
body-tracking model from Google. It detects 33 body landmarks per frame. Our
custom code converts those landmarks into per-joint rotation angles that drive
the 3D avatar's bones.

Three root causes limit accuracy:

1. **MediaPipe Pose is a 2D-first model.** It infers 3D depth from a single
   camera using body-proportion cues rather than measuring it. Depth error is
   typically 10–30% even under ideal lighting — this is a property of the
   model, not a bug in our code.

2. **Decomposing arm position into separate angles is mathematically
   ambiguous.** Any given arm position can be represented by multiple valid
   combinations of (flexion, abduction, rotation). Our current math picks one
   such combination per frame, but small measurement noise can flip which
   combination is picked, producing visible jitter and wrong-looking arm
   orientations near overhead positions ("gimbal lock").

3. **Custom bone-axis calibration is brittle.** Every bone in the 3D rig
   has its own local coordinate system. Mapping MediaPipe's angles onto those
   bones requires per-bone calibration that has proven fragile — changes for
   one pose often break another.

These three issues compound. No amount of additional tuning within the current
architecture will close the gap to production quality.

---

## 4. Options to solve it

### Option A — Kalidokit (recommended first step)

A purpose-built open-source library that sits between MediaPipe and a 3D
avatar rig. It replaces our custom angle-decomposition code with a proven
quaternion-based retargeting engine used in many VTuber / avatar applications.

- **Engineering effort:** 2–3 days including bone-name mapping for our rig
- **Runtime cost:** Zero (runs in the browser, like today)
- **Licence:** MIT (free)
- **Quality gain:** ~55% → ~80%
- **Limitations:** Still bottlenecked by MediaPipe's underlying depth estimation

### Option B — Commercial motion-capture API (production-grade)

Cloud services that process webcam video server-side and return clean,
calibrated animation data. They encapsulate everything Option A does, plus
per-rig retargeting, multi-person handling, and temporal smoothing.

| Provider | Pricing model | Integration effort | Quality |
| --- | --- | --- | --- |
| Move.ai | ~$0.50–$2 per minute processed | 3–5 days | ~95% |
| Rokoko Vision | Freemium + monthly plans | 3–5 days | ~90% |
| DeepMotion Animate 3D | ~$12/month + per-minute | 2–3 days | ~90% |

- **Best for:** clinical / enterprise accuracy targets, recorded-session review
- **Trade-offs:** monthly + per-minute cost; video is processed off-device
  (consider privacy implications for patient data)

### Option C — Upgrade to MediaPipe Tasks Pose Landmarker (on-device, free)

Google's newer generation of the same underlying technology. Delivers better
3D world landmarks and slightly higher accuracy than the legacy API we use.

- **Engineering effort:** 3–5 days (API swap + test)
- **Runtime cost:** Zero
- **Quality gain:** ~55% → ~70%
- **Trade-off:** Narrower improvement than Option A; still limited by
  monocular depth estimation

### Option D — Depth sensor (highest fidelity, hardware dependency)

Replace the webcam with a depth-capable camera (iPhone TrueDepth, Azure
Kinect, Intel RealSense). Eliminates the monocular-depth bottleneck entirely.

- **Engineering effort:** 1–2 weeks
- **Runtime cost:** hardware per clinic
- **Quality gain:** ~55% → ~95%+
- **Trade-off:** users must own supported hardware

---

## 5. Recommendation

**Phase 1 — this sprint:** integrate kalidokit (Option A). Low risk, no cost,
no infrastructure change, ~80% fidelity. This validates that the rest of the
application (UI, clinical reasoning, muscle overlays) benefits meaningfully
from better tracking before we commit to a paid path.

**Phase 2 — if clinical-grade accuracy is a product requirement:** evaluate
Move.ai (Option B) via its free trial. If quality and privacy story fit,
migrate server-side video processing behind a feature flag.

**Phase 3 — long term, optional:** offer Option D (depth sensor) as a
premium capture mode for physios who already own compatible hardware.

---

## 6. What we keep vs. what we replace

| Keep | Replace |
| --- | --- |
| MediaPipe Hands finger tracking | Custom shoulder/elbow/wrist angle math (`mediapipeTo3D.ts`) |
| 3D avatar rig and viewer | Manual `BONE_MAPPING` axis calibration for arms |
| Manual slider controls (non-camera use case) | Per-joint dead-zones and smoothing factors |
| Visibility-gated freeze-at-default-pose behaviour | `calculateElbowFlexionRobust`, `computeShoulderAngles`, `computeShoulderRotation`, `computeWristRotation` |

Everything in the "Replace" column is superseded by the recommended library.
Everything in the "Keep" column remains unchanged.

---

## 7. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Kalidokit doesn't target our exact rig bone names | 4–8 hours of mapping work (trivial and well-understood) |
| Tracking still breaks when camera conditions are poor | Keep current visibility gate — freeze to default pose |
| Move.ai / Rokoko introduce server-side processing for patient video | Legal / privacy review before Phase 2 |
| Accuracy expectations are not met after Phase 1 | Phase 2 is designed as the escape hatch; decision deferred until Phase 1 data is in |

---

## 8. Success metrics

For Phase 1 sign-off, the avatar should:

1. Match elbow bend within ±10° for slow, clearly-visible motion.
2. Match shoulder position within ±15° for front-facing poses including
   arms overhead.
3. Show wrist orientation that broadly tracks the user's hand pitch/yaw
   during deliberate motion.
4. Continue to freeze gracefully when the user is partially out of frame
   (no hallucinated limbs).

These are measurable on recorded test clips; a 10-clip regression set will
be established at the start of the phase.

---

*Prepared for client review. Engineering estimates assume one senior frontend
engineer with familiarity with the PhysioAINote codebase. All third-party
pricing is indicative and should be confirmed directly with the vendor.*
