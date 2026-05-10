/**
 * Task #376 — Treatment Mode v1 joint accessory-motion catalog.
 *
 * Per-joint catalog of accessory directions (anterior glide, posterior
 * glide, inferior distraction, plus joint-specific entries) used by the
 * mechanical / neuromuscular / clinical engines to simulate manual
 * therapy. v1 covers the four high-volume joints: glenohumeral, hip,
 * tibiofemoral, talocrural. Subsequent phases can add per-joint data
 * without code changes.
 *
 * All vectors are expressed in the joint's local anatomical frame:
 *   +X = lateral, -X = medial
 *   +Y = superior, -Y = inferior
 *   +Z = anterior, -Z = posterior
 * Sign of distraction directions encodes pull-away from joint surface.
 *
 * Available accessory range (mm) is healthy-joint literature:
 *   - GHJ posterior glide: ~10 mm (Kaltenborn)
 *   - Hip distraction: ~8 mm
 *   - TFJ AP: ~8 mm
 *   - Talocrural AP: ~6 mm
 */

export type AccessoryDirectionId =
  | 'anterior_glide'
  | 'posterior_glide'
  | 'inferior_distraction'
  | 'lateral_distraction'
  | 'medial_glide'
  | 'lateral_glide'
  | 'superior_glide';

export type CapsularRegion = 'anterior' | 'posterior' | 'inferior' | 'superior';

export interface AccessoryDirection {
  id: AccessoryDirectionId;
  label: string;
  /** Unit vector for the line of drive in the joint's local frame. */
  axis: { x: number; y: number; z: number };
  /** Bone whose surface the clinician grasps (model bone name). */
  contactBone: string;
  /** Default contact region label (clinician-readable). */
  defaultContactRegion: string;
  /** Healthy available accessory translation (mm). */
  availableMobilityMm: number;
  /** Capsular region most strained when this direction is loaded. */
  strainedRegion: CapsularRegion;
  /** Adjacent segment that receives a small fractional sympathy motion. */
  adjacentSegment?: { bone: string; coupling: number };
}

export interface JointAccessoryEntry {
  jointId: 'GHJ' | 'hip' | 'tibiofemoral' | 'talocrural';
  label: string;
  side: 'left' | 'right' | 'either';
  /** Loose-packed (resting) joint-angle map. UI snaps to this on preset. */
  loosePackedPose: Record<string, number>;
  /** Close-packed (max congruence) joint-angle map. Higher guarding. */
  closePackedPose: Record<string, number>;
  /** Surrounding muscle group whose activation reads guarding. */
  surroundingMuscleGroup: string[];
  /** Direction set available for v1. */
  directions: AccessoryDirection[];
  /** Bone whose translation is rendered as the bone-glide ghost. */
  movingBone: string;
  /** ROM degree-of-freedom most directly influenced (display-only). */
  primaryRomDof: { configKey: string; label: string };
}

export const JOINT_ACCESSORY_CATALOG: Record<string, JointAccessoryEntry> = {
  GHJ_R: {
    jointId: 'GHJ',
    label: 'Right Glenohumeral',
    side: 'right',
    loosePackedPose: {
      'rightArm.abduction': 55,
      'rightArm.flexion': 30,
      'rightArm.rotation': 0,
      'rightForeArm.flexion': 0,
    },
    closePackedPose: {
      'rightArm.abduction': 90,
      'rightArm.flexion': 0,
      'rightArm.rotation': 90,
      'rightForeArm.flexion': 0,
    },
    surroundingMuscleGroup: ['rotatorCuff_R', 'deltoid_R', 'pectoralisMajor_R', 'latissimusDorsi_R', 'upperTrapezius_R'],
    movingBone: 'RightArm',
    primaryRomDof: { configKey: 'rightArm.abduction', label: 'Abduction' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'RightArm',
        defaultContactRegion: 'Posterior humeral head',
        availableMobilityMm: 8, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'RightShoulder', coupling: 0.15 } },
      { id: 'posterior_glide', label: 'Posterior Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'RightArm',
        defaultContactRegion: 'Anterior humeral head',
        availableMobilityMm: 10, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'RightShoulder', coupling: 0.15 } },
      { id: 'inferior_distraction', label: 'Inferior Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'RightArm',
        defaultContactRegion: 'Lateral humerus, axillary border',
        availableMobilityMm: 12, strainedRegion: 'superior',
        adjacentSegment: { bone: 'RightShoulder', coupling: 0.10 } },
    ],
  },
  GHJ_L: {
    jointId: 'GHJ',
    label: 'Left Glenohumeral',
    side: 'left',
    loosePackedPose: {
      'leftArm.abduction': 55,
      'leftArm.flexion': 30,
      'leftArm.rotation': 0,
      'leftForeArm.flexion': 0,
    },
    closePackedPose: {
      'leftArm.abduction': 90,
      'leftArm.flexion': 0,
      'leftArm.rotation': 90,
      'leftForeArm.flexion': 0,
    },
    surroundingMuscleGroup: ['rotatorCuff_L', 'deltoid_L', 'pectoralisMajor_L', 'latissimusDorsi_L', 'upperTrapezius_L'],
    movingBone: 'LeftArm',
    primaryRomDof: { configKey: 'leftArm.abduction', label: 'Abduction' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'LeftArm',
        defaultContactRegion: 'Posterior humeral head',
        availableMobilityMm: 8, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'LeftShoulder', coupling: 0.15 } },
      { id: 'posterior_glide', label: 'Posterior Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'LeftArm',
        defaultContactRegion: 'Anterior humeral head',
        availableMobilityMm: 10, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'LeftShoulder', coupling: 0.15 } },
      { id: 'inferior_distraction', label: 'Inferior Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'LeftArm',
        defaultContactRegion: 'Lateral humerus, axillary border',
        availableMobilityMm: 12, strainedRegion: 'superior',
        adjacentSegment: { bone: 'LeftShoulder', coupling: 0.10 } },
    ],
  },
  hip_R: {
    jointId: 'hip',
    label: 'Right Hip',
    side: 'right',
    loosePackedPose: {
      'rightUpLeg.flexion': 30,
      'rightUpLeg.abduction': 30,
      'rightUpLeg.rotation': 0,
      'rightLeg.flexion': 30,
    },
    closePackedPose: {
      'rightUpLeg.flexion': 0,
      'rightUpLeg.abduction': 0,
      'rightUpLeg.rotation': -10,
      'rightLeg.flexion': 0,
    },
    surroundingMuscleGroup: ['glutealsDeep_R', 'iliopsoas_R', 'adductors_R', 'tflItb_R', 'piriformis_R'],
    movingBone: 'RightUpLeg',
    primaryRomDof: { configKey: 'rightUpLeg.flexion', label: 'Flexion' },
    directions: [
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'RightUpLeg',
        defaultContactRegion: 'Distal femur / supracondylar',
        availableMobilityMm: 8, strainedRegion: 'superior',
        adjacentSegment: { bone: 'Hips', coupling: 0.20 } },
      { id: 'posterior_glide', label: 'Posterior Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'RightUpLeg',
        defaultContactRegion: 'Anterior proximal femur',
        availableMobilityMm: 6, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'Hips', coupling: 0.10 } },
      { id: 'lateral_distraction', label: 'Lateral Distraction',
        axis: { x: 1, y: 0, z: 0 }, contactBone: 'RightUpLeg',
        defaultContactRegion: 'Medial proximal femur',
        availableMobilityMm: 5, strainedRegion: 'inferior',
        adjacentSegment: { bone: 'Hips', coupling: 0.15 } },
    ],
  },
  hip_L: {
    jointId: 'hip',
    label: 'Left Hip',
    side: 'left',
    loosePackedPose: {
      'leftUpLeg.flexion': 30,
      'leftUpLeg.abduction': 30,
      'leftUpLeg.rotation': 0,
      'leftLeg.flexion': 30,
    },
    closePackedPose: {
      'leftUpLeg.flexion': 0,
      'leftUpLeg.abduction': 0,
      'leftUpLeg.rotation': -10,
      'leftLeg.flexion': 0,
    },
    surroundingMuscleGroup: ['glutealsDeep_L', 'iliopsoas_L', 'adductors_L', 'tflItb_L', 'piriformis_L'],
    movingBone: 'LeftUpLeg',
    primaryRomDof: { configKey: 'leftUpLeg.flexion', label: 'Flexion' },
    directions: [
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'LeftUpLeg',
        defaultContactRegion: 'Distal femur / supracondylar',
        availableMobilityMm: 8, strainedRegion: 'superior',
        adjacentSegment: { bone: 'Hips', coupling: 0.20 } },
      { id: 'posterior_glide', label: 'Posterior Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'LeftUpLeg',
        defaultContactRegion: 'Anterior proximal femur',
        availableMobilityMm: 6, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'Hips', coupling: 0.10 } },
      { id: 'lateral_distraction', label: 'Lateral Distraction',
        axis: { x: -1, y: 0, z: 0 }, contactBone: 'LeftUpLeg',
        defaultContactRegion: 'Medial proximal femur',
        availableMobilityMm: 5, strainedRegion: 'inferior',
        adjacentSegment: { bone: 'Hips', coupling: 0.15 } },
    ],
  },
  tibiofemoral_R: {
    jointId: 'tibiofemoral',
    label: 'Right Knee (TFJ)',
    side: 'right',
    loosePackedPose: {
      'rightLeg.flexion': 25,
      'rightUpLeg.flexion': 30,
      'rightUpLeg.rotation': 0,
    },
    closePackedPose: {
      'rightLeg.flexion': 0,
      'rightUpLeg.rotation': 10,
    },
    surroundingMuscleGroup: ['quadricepsFemoris_R', 'hamstrings_R', 'gastrocnemius_R', 'popliteus_R'],
    movingBone: 'RightLeg',
    primaryRomDof: { configKey: 'rightLeg.flexion', label: 'Flexion' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Tibial Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'RightLeg',
        defaultContactRegion: 'Posterior proximal tibia',
        availableMobilityMm: 8, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'RightUpLeg', coupling: 0.05 } },
      { id: 'posterior_glide', label: 'Posterior Tibial Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'RightLeg',
        defaultContactRegion: 'Anterior proximal tibia (tibial tuberosity)',
        availableMobilityMm: 8, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'RightUpLeg', coupling: 0.05 } },
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'RightLeg',
        defaultContactRegion: 'Distal tibia',
        availableMobilityMm: 6, strainedRegion: 'superior',
        adjacentSegment: { bone: 'RightUpLeg', coupling: 0.10 } },
    ],
  },
  tibiofemoral_L: {
    jointId: 'tibiofemoral',
    label: 'Left Knee (TFJ)',
    side: 'left',
    loosePackedPose: {
      'leftLeg.flexion': 25,
      'leftUpLeg.flexion': 30,
      'leftUpLeg.rotation': 0,
    },
    closePackedPose: {
      'leftLeg.flexion': 0,
      'leftUpLeg.rotation': 10,
    },
    surroundingMuscleGroup: ['quadricepsFemoris_L', 'hamstrings_L', 'gastrocnemius_L', 'popliteus_L'],
    movingBone: 'LeftLeg',
    primaryRomDof: { configKey: 'leftLeg.flexion', label: 'Flexion' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Tibial Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'LeftLeg',
        defaultContactRegion: 'Posterior proximal tibia',
        availableMobilityMm: 8, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'LeftUpLeg', coupling: 0.05 } },
      { id: 'posterior_glide', label: 'Posterior Tibial Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'LeftLeg',
        defaultContactRegion: 'Anterior proximal tibia (tibial tuberosity)',
        availableMobilityMm: 8, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'LeftUpLeg', coupling: 0.05 } },
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'LeftLeg',
        defaultContactRegion: 'Distal tibia',
        availableMobilityMm: 6, strainedRegion: 'superior',
        adjacentSegment: { bone: 'LeftUpLeg', coupling: 0.10 } },
    ],
  },
  talocrural_R: {
    jointId: 'talocrural',
    label: 'Right Talocrural',
    side: 'right',
    loosePackedPose: {
      'rightFoot.dorsiflexion': -10,
      'rightLeg.flexion': 25,
    },
    closePackedPose: {
      'rightFoot.dorsiflexion': 20,
    },
    surroundingMuscleGroup: ['gastrocnemius_R', 'soleus_R', 'tibialisAnterior_R', 'peroneals_R'],
    movingBone: 'RightFoot',
    primaryRomDof: { configKey: 'rightFoot.dorsiflexion', label: 'Dorsiflexion' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Talar Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'RightFoot',
        defaultContactRegion: 'Posterior calcaneus / talar dome',
        availableMobilityMm: 5, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'RightLeg', coupling: 0.04 } },
      { id: 'posterior_glide', label: 'Posterior Talar Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'RightFoot',
        defaultContactRegion: 'Anterior talar neck',
        availableMobilityMm: 6, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'RightLeg', coupling: 0.04 } },
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'RightFoot',
        defaultContactRegion: 'Calcaneus + talus, two-handed cup',
        availableMobilityMm: 4, strainedRegion: 'superior',
        adjacentSegment: { bone: 'RightLeg', coupling: 0.06 } },
    ],
  },
  talocrural_L: {
    jointId: 'talocrural',
    label: 'Left Talocrural',
    side: 'left',
    loosePackedPose: {
      'leftFoot.dorsiflexion': -10,
      'leftLeg.flexion': 25,
    },
    closePackedPose: {
      'leftFoot.dorsiflexion': 20,
    },
    surroundingMuscleGroup: ['gastrocnemius_L', 'soleus_L', 'tibialisAnterior_L', 'peroneals_L'],
    movingBone: 'LeftFoot',
    primaryRomDof: { configKey: 'leftFoot.dorsiflexion', label: 'Dorsiflexion' },
    directions: [
      { id: 'anterior_glide', label: 'Anterior Talar Glide',
        axis: { x: 0, y: 0, z: 1 }, contactBone: 'LeftFoot',
        defaultContactRegion: 'Posterior calcaneus / talar dome',
        availableMobilityMm: 5, strainedRegion: 'posterior',
        adjacentSegment: { bone: 'LeftLeg', coupling: 0.04 } },
      { id: 'posterior_glide', label: 'Posterior Talar Glide',
        axis: { x: 0, y: 0, z: -1 }, contactBone: 'LeftFoot',
        defaultContactRegion: 'Anterior talar neck',
        availableMobilityMm: 6, strainedRegion: 'anterior',
        adjacentSegment: { bone: 'LeftLeg', coupling: 0.04 } },
      { id: 'inferior_distraction', label: 'Long-Axis Distraction',
        axis: { x: 0, y: -1, z: 0 }, contactBone: 'LeftFoot',
        defaultContactRegion: 'Calcaneus + talus, two-handed cup',
        availableMobilityMm: 4, strainedRegion: 'superior',
        adjacentSegment: { bone: 'LeftLeg', coupling: 0.06 } },
    ],
  },
};

export type JointKey = keyof typeof JOINT_ACCESSORY_CATALOG;

export function getJointEntry(key: string): JointAccessoryEntry | undefined {
  return JOINT_ACCESSORY_CATALOG[key];
}

export function listJointKeys(): string[] {
  return Object.keys(JOINT_ACCESSORY_CATALOG);
}

/** Normalize a 3D vector. */
export function normalize(v: { x: number; y: number; z: number }) {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

/** Angle between two unit vectors in degrees. */
export function angleBetweenDeg(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  const an = normalize(a);
  const bn = normalize(b);
  const dot = Math.max(-1, Math.min(1, an.x * bn.x + an.y * bn.y + an.z * bn.z));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Position-advantage: how favourable the current pose is for executing
 * the requested glide. 1.0 = patient is loose-packed (max joint play),
 * 0.5 = mid, 0.2 = close-packed (no accessory motion available).
 */
export function computePositionAdvantage(
  entry: JointAccessoryEntry,
  currentPose: Record<string, number>,
): number {
  const looseKeys = Object.keys(entry.loosePackedPose);
  if (looseKeys.length === 0) return 1.0;
  let totalDistance = 0;
  let totalSpan = 0;
  for (const key of looseKeys) {
    const loose = entry.loosePackedPose[key];
    const close = entry.closePackedPose[key] ?? loose;
    const current = currentPose[key] ?? loose;
    const span = Math.max(1, Math.abs(close - loose));
    totalDistance += Math.abs(current - loose);
    totalSpan += span;
  }
  // 0 (perfect loose-packed) → 1.0 advantage; 1 (full close-packed) → 0.2.
  const proximity = Math.max(0, Math.min(1, totalDistance / Math.max(1, totalSpan)));
  return 1.0 - 0.8 * proximity;
}
