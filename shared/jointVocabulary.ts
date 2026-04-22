/**
 * Shared joint+property vocabulary for keyframe-driven skeleton animations.
 * Single source of truth used by:
 *   - server/diagnosisProvocationGenerator.ts (constrains AI output)
 *   - client/src/lib/movementSequences.ts (re-exports as DEFAULT_JOINT_LIMITS)
 *
 * Each entry = camelCase joint name -> property -> safe degree range.
 * Safe ranges follow accepted clinical biomechanics ROM literature plus a
 * small permissive buffer for end-range provocation tests.
 */

export interface PropertyRange {
  min: number;
  max: number;
}

export interface JointDef {
  properties: Record<string, PropertyRange>;
}

export const JOINT_VOCABULARY: Record<string, JointDef> = {
  leftHip: {
    properties: {
      flexion: { min: -30, max: 140 },
      extension: { min: 0, max: 30 },
      abduction: { min: -30, max: 45 },
      adduction: { min: 0, max: 30 },
      internalRotation: { min: -45, max: 45 },
      externalRotation: { min: 0, max: 45 },
    },
  },
  rightHip: {
    properties: {
      flexion: { min: -30, max: 140 },
      extension: { min: 0, max: 30 },
      abduction: { min: -30, max: 45 },
      adduction: { min: 0, max: 30 },
      internalRotation: { min: -45, max: 45 },
      externalRotation: { min: 0, max: 45 },
    },
  },
  leftKnee: { properties: { flexion: { min: 0, max: 140 }, varus: { min: -20, max: 20 } } },
  rightKnee: { properties: { flexion: { min: 0, max: 140 }, varus: { min: -20, max: 20 } } },
  leftAnkle: {
    properties: {
      dorsiflexion: { min: 0, max: 30 },
      plantarflexion: { min: 0, max: 50 },
      inversion: { min: 0, max: 35 },
      eversion: { min: 0, max: 25 },
    },
  },
  rightAnkle: {
    properties: {
      dorsiflexion: { min: 0, max: 30 },
      plantarflexion: { min: 0, max: 50 },
      inversion: { min: 0, max: 35 },
      eversion: { min: 0, max: 25 },
    },
  },
  leftShoulder: {
    properties: {
      flexion: { min: -60, max: 180 },
      abduction: { min: 0, max: 180 },
      internalRotation: { min: -90, max: 90 },
      externalRotation: { min: 0, max: 90 },
    },
  },
  rightShoulder: {
    properties: {
      flexion: { min: -60, max: 180 },
      abduction: { min: 0, max: 180 },
      internalRotation: { min: -90, max: 90 },
      externalRotation: { min: 0, max: 90 },
    },
  },
  leftElbow: {
    properties: { flexion: { min: 0, max: 150 }, pronation: { min: -90, max: 90 } },
  },
  rightElbow: {
    properties: { flexion: { min: 0, max: 150 }, pronation: { min: -90, max: 90 } },
  },
  leftWrist: {
    properties: { flexion: { min: -80, max: 80 }, deviation: { min: -30, max: 30 } },
  },
  rightWrist: {
    properties: { flexion: { min: -80, max: 80 }, deviation: { min: -30, max: 30 } },
  },
  leftScapula: {
    properties: {
      protraction: { min: 0, max: 30 },
      retraction: { min: 0, max: 30 },
      elevation: { min: 0, max: 30 },
      depression: { min: 0, max: 15 },
      upwardRotation: { min: 0, max: 60 },
      downwardRotation: { min: 0, max: 30 },
    },
  },
  rightScapula: {
    properties: {
      protraction: { min: 0, max: 30 },
      retraction: { min: 0, max: 30 },
      elevation: { min: 0, max: 30 },
      depression: { min: 0, max: 15 },
      upwardRotation: { min: 0, max: 60 },
      downwardRotation: { min: 0, max: 30 },
    },
  },
  spine: {
    properties: {
      flexion: { min: -30, max: 90 },
      lumbarLordosis: { min: -70, max: 90 },
      thoracicKyphosis: { min: -50, max: 50 },
      thoracicRotation: { min: -45, max: 45 },
      lumbarRotation: { min: -30, max: 30 },
      lateralFlexion: { min: -45, max: 45 },
      cervicalLordosis: { min: -60, max: 75 },
      cervicalRotation: { min: -80, max: 80 },
      cervicalLateralFlexion: { min: -45, max: 45 },
    },
  },
  neck: {
    properties: {
      flexion: { min: 0, max: 60 },
      extension: { min: 0, max: 75 },
      rotation: { min: -80, max: 80 },
      lateralFlexion: { min: -45, max: 45 },
    },
  },
  pelvis: {
    properties: {
      tilt: { min: -30, max: 30 },
      obliquity: { min: -20, max: 20 },
      rotation: { min: -45, max: 45 },
    },
  },
};

export function getPropertyRange(joint: string, property: string): PropertyRange | undefined {
  return JOINT_VOCABULARY[joint]?.properties[property];
}

export type JointVocabRange = ReturnType<typeof getPropertyRange>;

/**
 * AnatomicalRegion identifiers (snake_case) used by the 3D viewer's pain marker
 * system. Provocation movements declare expectedProvocationSites against these.
 */
export interface ProvocationKeyframe {
  time: number;
  value: number;
}

export interface ProvocationJointTimeline {
  joint: string;
  property: string;
  keyframes: ProvocationKeyframe[];
}

export interface ExpectedProvocationSite {
  region: string;
  label: string;
  severity?: number;
}

export type ProvocationSide = "left" | "right" | "bilateral" | "n/a";

export interface DiagnosisProvocationMovement {
  id: string;
  name: string;
  description: string;
  duration: number;
  loop: boolean;
  side?: ProvocationSide;
  setupPosture?: string;
  holdAtPeakMs?: number;
  joints: ProvocationJointTimeline[];
  expectedProvocationSites?: ExpectedProvocationSite[];
  clinicalRationale?: string;
  positiveFinding?: string;
}

export interface ProvocationContextPainMarker {
  region?: string;
  anatomicalLabel?: string;
  symptomType?: string;
  severity?: number;
  description?: string;
}

export interface ProvocationComposeRequest {
  hypothesisId: string;
  condition: string;
  supportingEvidence?: string[];
  rulingOutFactors?: string[];
  region?: string;
  painMarkers?: ProvocationContextPainMarker[];
}

export interface ProvocationComposeResponse {
  movements: DiagnosisProvocationMovement[];
}

export const ANATOMICAL_REGIONS = [
  "full_body",
  "lumbar_spine",
  "thoracic_spine",
  "cervical_spine",
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "pelvis",
  "left_elbow",
  "right_elbow",
  "left_scapula",
  "right_scapula",
  "left_wrist",
  "right_wrist",
  "left_hand",
  "right_hand",
  "head",
  "neck",
  "abdomen",
  "chest",
] as const;
export type AnatomicalRegionId = (typeof ANATOMICAL_REGIONS)[number];
