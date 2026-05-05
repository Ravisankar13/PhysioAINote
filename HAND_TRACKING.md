# Hand Tracking Integration

Per-finger tracking in PhysioGPT's camera capture, running `@mediapipe/hands`
alongside the existing `@mediapipe/pose` model.

## Why

MediaPipe **Pose** only exposes 3 wrist-area landmarks per hand
(`INDEX`, `PINKY`, `THUMB` base) — no finger articulation. Users reported that
hand/finger movements were not captured. MediaPipe's separate **Hands** model
returns 21 landmarks per hand, enough to animate the rig's finger bones.

## What changed

| File | Change |
| --- | --- |
| `package.json` | Added `@mediapipe/hands` dependency. |
| `client/src/utils/mediapipeLoader.ts` | Loads `hands.js` from CDN; gates "loaded" on `window.Hands` in addition to `window.Pose`. |
| `client/src/config/mediapipe.ts` | Adds `MEDIAPIPE_CONFIG.hands` — `maxNumHands: 2`, `modelComplexity: 1`, `min{Detection,Tracking}Confidence: 0.5`. |
| `client/src/utils/mediapipeTo3D.ts` | New `HandBoneRotations` type, `buildHandBoneRotations(landmarks, handedness)` that converts 21 landmarks into per-bone Euler deltas. `SmoothedPoseOutput` gains optional `handBoneRotations`. |
| `client/src/components/skeleton/CameraPoseCapture.tsx` | Instantiates `Hands` alongside `Pose`; the MediaPipe `Camera` onFrame feeds both models in parallel via `Promise.all`; a 0.5-EMA ref smooths the per-bone rotations; the rotations ride along on every `onPoseUpdate`. New `enableHandTracking` prop (default `true`). |
| `client/src/components/skeleton/PureThreeGLBViewer.tsx` | Widens `livePose` type to include `handBoneRotations`, merges them into the existing `boneRotationDeltas` loop so finger bones animate through the same apply pipeline as everything else. |

## How it works

```
                Camera frame
                 /         \
            Pose.send    Hands.send     (parallel, same RAF)
                |            |
       pose onResults   hands onResults
                |            |
    convertMediaPipeTo3D   buildHandBoneRotations (per detected hand)
                |            |
         Posesmoother    EMA-smoothed bone map
                 \         /
          SmoothedPoseOutput  { ...jointRotations, handBoneRotations }
                     |
            PureThreeGLBViewer
        (merges handBoneRotations into boneRotationDeltas)
```

### Bone mapping

`buildHandBoneRotations` emits Euler deltas for the rig's existing bones:

- `ThumbFinger1_{L,R}`, `ThumbFinger2_{L,R}`
- `IndexFinger1_{L,R}`, `IndexFinger2_{L,R}`
- `MiddleFinger1_{L,R}`, `MiddleFinger2_{L,R}`
- `RingFinger1_{L,R}`, `RingFinger2_{L,R}`
- `PinkyFinger1_{L,R}`, `PinkyFinger2_{L,R}`

The viewer silently skips any bone that doesn't exist on the loaded rig
(e.g. the skeleton currently only has `MiddleFinger2_*` among the 2nd-segment
bones; the others are emitted but dropped).

### Curl math

For each finger the total curl is
`angle( wrist→MCP , MCP→TIP )` — near `0` when extended, near `π` when fully
curled into a fist. This scalar is split:

- Thumb: 90% to `ThumbFinger1_*`, 10% to `ThumbFinger2_*`
- Other fingers: 55% to `Finger1_*`, 45% to `Finger2_*`

The curl is applied on the bone's local `x` axis with a `-1` sign (flexion).

## Known limitations and tuning points

1. **Axis guess.** The curl axis (`x`, negative) is a reasonable default for
   this rig but was not verified against a reference pose. If fingers bend
   sideways or extend backwards, flip `flexSign` or change the axis in
   `buildHandBoneRotations` (`client/src/utils/mediapipeTo3D.ts`).
2. **CPU cost.** Running Pose + Hands per frame roughly doubles inference cost.
   If FPS drops on lower-end machines:
   - Pass `enableHandTracking={false}` to `CameraPoseCapture` — the viewer falls
     back to wrist-only tracking.
   - Lower `MEDIAPIPE_CONFIG.hands.options.modelComplexity` from `1` to `0`.
3. **Rig constraint.** The rig has at most 2 bones per finger, so individual
   PIP vs DIP articulation cannot be shown even though the 21 landmarks
   contain that data. Full per-joint animation would require rigging
   additional finger bones into the GLB.
4. **Handedness semantics.** MediaPipe labels handedness from the camera's
   point of view. On a non-selfie feed those labels match anatomical
   left/right and feed directly into the rig's `_L`/`_R` suffix. If the
   camera is flipped to selfie mode upstream, the labels will need inverting.

## Toggling at runtime

```tsx
<CameraPoseCapture
  onPoseUpdate={setLivePose}
  enableHandTracking={false}  // wrist-only mode
/>
```

When `enableHandTracking` is `false`, the Hands model is not instantiated at
all — no extra CPU cost, no CDN download.
