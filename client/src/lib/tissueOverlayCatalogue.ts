import type { TissueIntelligence, HealingStage, Irritability } from '@/lib/tissueIntelligence';

export type TissueAnchorShape =
  | { kind: 'tube_between'; from: string; to: string; radius: number; fromOffset?: [number, number, number]; toOffset?: [number, number, number] }
  | { kind: 'polyline'; bones: string[]; thickness: number; offset?: [number, number, number] }
  | { kind: 'ring'; at: string; radius: number; thickness: number; axis?: 'x' | 'y' | 'z'; offset?: [number, number, number] }
  | { kind: 'sphere_at'; at: string; radius: number; offset?: [number, number, number] }
  | { kind: 'sheet'; from: string; to: string; width: number; offset?: [number, number, number] }
  | { kind: 'crescent'; at: string; radius: number; thickness: number; axis?: 'x' | 'y' | 'z'; arc?: number };

export interface TissueAnchorRecipe {
  shape: TissueAnchorShape;
  isDeep?: boolean;
  displayName?: string;
}

function pair(idBase: string, recipe: (side: 'L' | 'R') => TissueAnchorRecipe): Record<string, TissueAnchorRecipe> {
  return {
    [`${idBase}_l`]: recipe('L'),
    [`${idBase}_r`]: recipe('R'),
  };
}

export const TISSUE_ANCHOR_CATALOGUE: Record<string, TissueAnchorRecipe> = {
  // --- Tendons (catalogue ids) ---
  ...pair('achilles', (s) => ({
    shape: { kind: 'tube_between', from: `HipPart2_${s}`, to: `Ankle_${s}`, radius: 0.012, fromOffset: [0, -0.05, -0.03], toOffset: [0, 0.02, -0.03] },
    isDeep: false,
    displayName: 'Achilles tendon',
  })),
  ...pair('patellar', (s) => ({
    shape: { kind: 'tube_between', from: `Knee_${s}`, to: `HipPart2_${s}`, radius: 0.011, fromOffset: [0, 0.01, 0.025], toOffset: [0, 0.05, 0.03] },
    displayName: 'Patellar tendon',
  })),
  ...pair('supraspinatus', (s) => ({
    shape: { kind: 'ring', at: `Shoulder_${s}`, radius: 0.05, thickness: 0.008, axis: 'y' },
    isDeep: true,
    displayName: 'Supraspinatus insertion',
  })),
  ...pair('biceps_long_head', (s) => ({
    shape: { kind: 'tube_between', from: `Shoulder_${s}`, to: `Elbow_${s}`, radius: 0.009, fromOffset: [0, 0.01, 0.025], toOffset: [0, 0.0, 0.02] },
    displayName: 'Biceps long head',
  })),
  ...pair('common_extensor', (s) => ({
    shape: { kind: 'sphere_at', at: `Elbow_${s}`, radius: 0.022, offset: [s === 'L' ? -0.03 : 0.03, 0, 0] },
    displayName: 'Common extensor origin',
  })),
  ...pair('common_flexor', (s) => ({
    shape: { kind: 'sphere_at', at: `Elbow_${s}`, radius: 0.022, offset: [s === 'L' ? 0.03 : -0.03, 0, 0] },
    displayName: 'Common flexor origin',
  })),
  ...pair('gluteus_medius', (s) => ({
    shape: { kind: 'sphere_at', at: `Hip_${s}`, radius: 0.03, offset: [s === 'L' ? -0.04 : 0.04, 0.02, 0] },
    isDeep: true,
    displayName: 'Gluteus medius insertion',
  })),
  ...pair('plantar_fascia', (s) => ({
    shape: { kind: 'sheet', from: `Ankle_${s}`, to: `Toes_${s}`, width: 0.05, offset: [0, -0.015, 0] },
    displayName: 'Plantar fascia',
  })),

  // --- Joint surfaces / capsules / labrum / menisci ---
  ...pair('glenohumeral', (s) => ({
    shape: { kind: 'ring', at: `Shoulder_${s}`, radius: 0.06, thickness: 0.006, axis: 'y' },
    displayName: 'GH capsule',
  })),
  ...pair('hip', (s) => ({
    shape: { kind: 'ring', at: `Hip_${s}`, radius: 0.07, thickness: 0.007, axis: 'y' },
    isDeep: true,
    displayName: 'Hip joint',
  })),
  ...pair('tibiofemoral', (s) => ({
    shape: { kind: 'ring', at: `Knee_${s}`, radius: 0.05, thickness: 0.008, axis: 'y' },
    displayName: 'Tibiofemoral joint',
  })),
  ...pair('talocrural', (s) => ({
    shape: { kind: 'ring', at: `Ankle_${s}`, radius: 0.035, thickness: 0.006, axis: 'y' },
    displayName: 'Talocrural joint',
  })),
  ...pair('humeroulnar', (s) => ({
    shape: { kind: 'ring', at: `Elbow_${s}`, radius: 0.03, thickness: 0.005, axis: 'x' },
    displayName: 'Humeroulnar joint',
  })),
  ...pair('si', (s) => ({
    shape: { kind: 'sphere_at', at: `Hip_${s}`, radius: 0.04, offset: [s === 'L' ? 0.02 : -0.02, 0.06, -0.03] },
    isDeep: true,
    displayName: 'SI joint',
  })),
  facet_lumbar: {
    shape: { kind: 'polyline', bones: ['Spine1_M', 'RootPart1_M'], thickness: 0.012, offset: [0, 0, -0.04] },
    isDeep: true,
    displayName: 'Lumbar facet joints',
  },
  facet_cervical: {
    shape: { kind: 'polyline', bones: ['Neck_M', 'NeckPart1_M', 'NeckPart2_M'], thickness: 0.01, offset: [0, 0, -0.025] },
    isDeep: true,
    displayName: 'Cervical facet joints',
  },

  // --- Nerves (procedural polylines + entrapment markers) ---
  ...pair('median', (s) => ({
    shape: { kind: 'polyline', bones: [`Shoulder_${s}`, `Elbow_${s}`, `Wrist_${s}`], thickness: 0.006 },
    displayName: 'Median nerve',
  })),
  ...pair('ulnar', (s) => ({
    shape: { kind: 'polyline', bones: [`Shoulder_${s}`, `Elbow_${s}`, `Wrist_${s}`], thickness: 0.006, offset: [s === 'L' ? 0.015 : -0.015, 0, 0] },
    displayName: 'Ulnar nerve',
  })),
  ...pair('radial', (s) => ({
    shape: { kind: 'polyline', bones: [`Shoulder_${s}`, `Elbow_${s}`, `Wrist_${s}`], thickness: 0.006, offset: [s === 'L' ? -0.015 : 0.015, 0, 0] },
    displayName: 'Radial nerve',
  })),
  ...pair('sciatic', (s) => ({
    shape: { kind: 'polyline', bones: [`Hip_${s}`, `HipPart1_${s}`, `HipPart2_${s}`, `Knee_${s}`], thickness: 0.008, offset: [0, 0, -0.025] },
    isDeep: true,
    displayName: 'Sciatic nerve',
  })),
  ...pair('femoral', (s) => ({
    shape: { kind: 'polyline', bones: [`Hip_${s}`, `HipPart1_${s}`, `HipPart2_${s}`], thickness: 0.007, offset: [0, 0, 0.025] },
    isDeep: true,
    displayName: 'Femoral nerve',
  })),
  ...pair('peroneal', (s) => ({
    shape: { kind: 'polyline', bones: [`Knee_${s}`, `Ankle_${s}`], thickness: 0.005, offset: [s === 'L' ? -0.025 : 0.025, 0, 0] },
    displayName: 'Common peroneal nerve',
  })),

  // --- Fascial chains ---
  sbl: { shape: { kind: 'polyline', bones: ['Ankle_L', 'Knee_L', 'Hip_L', 'Root_M', 'Spine1_M', 'Neck_M'], thickness: 0.009, offset: [0, 0, -0.04] }, displayName: 'Superficial Back Line' },
  sfl: { shape: { kind: 'polyline', bones: ['Toes_L', 'Knee_L', 'Hip_L', 'Root_M', 'Spine1_M', 'Neck_M'], thickness: 0.009, offset: [0, 0, 0.04] }, displayName: 'Superficial Front Line' },
  dfl: { shape: { kind: 'polyline', bones: ['Ankle_L', 'Knee_L', 'Hip_L', 'Root_M', 'Spine1_M'], thickness: 0.008, offset: [0, 0, 0] }, isDeep: true, displayName: 'Deep Front Line' },
  lateral_l: { shape: { kind: 'polyline', bones: ['Ankle_L', 'Knee_L', 'Hip_L', 'Spine1_M'], thickness: 0.008, offset: [-0.05, 0, 0] }, displayName: 'Lateral Line (L)' },
  lateral_r: { shape: { kind: 'polyline', bones: ['Ankle_R', 'Knee_R', 'Hip_R', 'Spine1_M'], thickness: 0.008, offset: [0.05, 0, 0] }, displayName: 'Lateral Line (R)' },
  spiral: { shape: { kind: 'polyline', bones: ['Ankle_L', 'Knee_R', 'Hip_L', 'Spine1_M', 'Shoulder_R'], thickness: 0.008 }, displayName: 'Spiral Line' },
  front_arm_l: { shape: { kind: 'polyline', bones: ['Spine1_M', 'Shoulder_L', 'Elbow_L', 'Wrist_L'], thickness: 0.008, offset: [0, 0, 0.025] }, displayName: 'Front Arm Line (L)' },
  front_arm_r: { shape: { kind: 'polyline', bones: ['Spine1_M', 'Shoulder_R', 'Elbow_R', 'Wrist_R'], thickness: 0.008, offset: [0, 0, 0.025] }, displayName: 'Front Arm Line (R)' },
};

// Muscle group ids (substring match on splitMuscleGroupsRef keys) treated as superficial
// — when any deep tissue is highlighted these fade to ~0.25 opacity to reveal deep structures.
export const SUPERFICIAL_MUSCLE_PATTERNS: string[] = [
  'trapezius',
  'deltoid',
  'latissimus',
  'pectoralis_major',
  'rectus_abdominis',
  'external_oblique',
  'biceps_brachii',
  'triceps_brachii',
  'rectus_femoris',
  'vastus_lateralis',
  'vastus_medialis',
  'gastrocnemius',
  'gluteus_maximus',
  'sternocleidomastoid',
];

export interface StatePalette {
  /** core color (THREE hex) */
  color: number;
  /** emissive intensity 0..1 */
  emissive: number;
  /** opacity 0..1 */
  opacity: number;
  /** legend chip label */
  stageLabel: string;
}

export function paletteForState(
  stage: HealingStage,
  irritability: Irritability,
  severity: number,
): StatePalette {
  // Stage-driven base color (acute = warm red/orange, chronic = magenta/violet, degenerative = deep crimson)
  let color: number;
  let stageLabel: string;
  switch (stage) {
    case 'acute':
      color = 0xff4d2d; stageLabel = 'Acute'; break;
    case 'subacute':
      color = 0xff8a3d; stageLabel = 'Subacute'; break;
    case 'chronic':
      color = 0xb45cff; stageLabel = 'Chronic'; break;
    case 'degenerative':
      color = 0xa31621; stageLabel = 'Degenerative'; break;
    case 'baseline':
    default:
      color = 0xeab308; stageLabel = 'At-risk'; break;
  }
  const irrBoost = irritability === 'high' ? 0.35 : irritability === 'moderate' ? 0.2 : 0.1;
  const sev = Math.max(0, Math.min(1, severity));
  const emissive = Math.min(1, irrBoost + sev * 0.55);
  const opacity = 0.55 + sev * 0.35;
  return { color, emissive, opacity, stageLabel };
}

export interface TissueOverlayHighlight {
  tissueId: string;
  tissueType: 'tendon' | 'joint' | 'nerve' | 'fascia';
  label: string;
  bones: string[];
  severity: number;
  healingStage: HealingStage;
  irritability: Irritability;
  isDeep: boolean;
}

export function tissueIntelligenceToOverlayHighlight(intel: TissueIntelligence): TissueOverlayHighlight {
  const recipe = TISSUE_ANCHOR_CATALOGUE[intel.tissueId];
  return {
    tissueId: intel.tissueId,
    tissueType: intel.tissueType,
    label: intel.label,
    bones: intel.bones,
    severity: intel.severity,
    healingStage: intel.state.healingStage,
    irritability: intel.state.irritability,
    isDeep: !!recipe?.isDeep,
  };
}

export function getAnchorRecipe(tissueId: string): TissueAnchorRecipe | null {
  return TISSUE_ANCHOR_CATALOGUE[tissueId] ?? null;
}
