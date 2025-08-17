# Mixamo Model Setup Instructions

To use the Mixamo integration with PhysioGPT, follow these steps:

## 1. Download a Mixamo Model

1. Go to [Mixamo.com](https://www.mixamo.com)
2. Sign in with your Adobe account (free)
3. Select a character (recommended: "Y Bot" or "X Bot" for medical visualization)
4. Download the model:
   - Format: FBX for Unity (.fbx) or GLTF if available
   - Pose: T-pose
   - Click "Download"

## 2. Convert to GLTF (if needed)

If you downloaded an FBX file, convert it to GLTF:
- Use an online converter like [FBX2GLTF](https://github.com/facebookincubator/FBX2glTF)
- Or use Blender: Import FBX → Export as GLTF 2.0

## 3. Place Model File

Save your model as: `base-skeleton.glb` in this directory (`client/public/models/mixamo/`)

## 4. Download Animations (Optional)

For clinical movements, download these animations from Mixamo:
- Walking
- Arm Flexion (or "Raising Hand")
- Squatting
- Standing Idle
- Hip Rotation

Save each animation in: `client/public/models/mixamo/animations/`

## File Structure

```
client/public/models/mixamo/
├── README.md (this file)
├── base-skeleton.glb (main rigged model)
└── animations/
    ├── walking.glb
    ├── arm-flexion.glb
    ├── squat.glb
    └── idle.glb
```

## Model Requirements

- File size: Keep under 10MB for optimal loading
- Format: GLTF 2.0 (.glb) preferred
- Rigging: Must include standard Mixamo bone hierarchy
- Textures: Optional (medical visualization typically uses solid colors)

## Fallback

If no Mixamo model is present, the system will automatically fall back to the procedural skeleton visualization.