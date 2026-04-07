export interface FocusedRegion {
  id: string;
  label: string;
  joints: string[];
  landmarkIndices: number[];
  description: string;
  clinicalFocus: string[];
  icon: string;
}

export const FOCUSED_REGIONS: FocusedRegion[] = [
  {
    id: 'full_body',
    label: 'Full Body',
    joints: ['all'],
    landmarkIndices: [],
    description: 'Full body posture and movement capture',
    clinicalFocus: ['Overall posture', 'Gait pattern', 'Movement symmetry'],
    icon: '🧍'
  },
  {
    id: 'right_ankle',
    label: 'Right Ankle',
    joints: ['rightKnee', 'rightAnkle'],
    landmarkIndices: [24, 26, 28, 30, 32],
    description: 'Right ankle joint complex',
    clinicalFocus: ['Dorsiflexion ROM', 'Inversion/Eversion', 'Swelling', 'Alignment', 'Weight bearing'],
    icon: '🦶'
  },
  {
    id: 'left_ankle',
    label: 'Left Ankle',
    joints: ['leftKnee', 'leftAnkle'],
    landmarkIndices: [23, 25, 27, 29, 31],
    description: 'Left ankle joint complex',
    clinicalFocus: ['Dorsiflexion ROM', 'Inversion/Eversion', 'Swelling', 'Alignment', 'Weight bearing'],
    icon: '🦶'
  },
  {
    id: 'right_knee',
    label: 'Right Knee',
    joints: ['rightHip', 'rightKnee'],
    landmarkIndices: [24, 26, 28],
    description: 'Right knee joint',
    clinicalFocus: ['Extension deficit', 'Valgus/Varus alignment', 'Effusion', 'Patellar tracking', 'Hyperextension'],
    icon: '🦵'
  },
  {
    id: 'left_knee',
    label: 'Left Knee',
    joints: ['leftHip', 'leftKnee'],
    landmarkIndices: [23, 25, 27],
    description: 'Left knee joint',
    clinicalFocus: ['Extension deficit', 'Valgus/Varus alignment', 'Effusion', 'Patellar tracking', 'Hyperextension'],
    icon: '🦵'
  },
  {
    id: 'right_hip',
    label: 'Right Hip',
    joints: ['rightHip', 'pelvis'],
    landmarkIndices: [23, 24, 26, 12],
    description: 'Right hip and pelvic region',
    clinicalFocus: ['Hip flexion/extension', 'Trendelenburg sign', 'Pelvic obliquity', 'Gait deviation'],
    icon: '🦴'
  },
  {
    id: 'left_hip',
    label: 'Left Hip',
    joints: ['leftHip', 'pelvis'],
    landmarkIndices: [23, 24, 25, 11],
    description: 'Left hip and pelvic region',
    clinicalFocus: ['Hip flexion/extension', 'Trendelenburg sign', 'Pelvic obliquity', 'Gait deviation'],
    icon: '🦴'
  },
  {
    id: 'right_shoulder',
    label: 'Right Shoulder',
    joints: ['rightShoulder', 'rightElbow'],
    landmarkIndices: [12, 14, 16, 11],
    description: 'Right shoulder complex',
    clinicalFocus: ['Elevation ROM', 'Scapular rhythm', 'Impingement signs', 'Rotator cuff function'],
    icon: '💪'
  },
  {
    id: 'left_shoulder',
    label: 'Left Shoulder',
    joints: ['leftShoulder', 'leftElbow'],
    landmarkIndices: [11, 13, 15, 12],
    description: 'Left shoulder complex',
    clinicalFocus: ['Elevation ROM', 'Scapular rhythm', 'Impingement signs', 'Rotator cuff function'],
    icon: '💪'
  },
  {
    id: 'cervical_spine',
    label: 'Neck / Cervical',
    joints: ['neck'],
    landmarkIndices: [0, 7, 8, 11, 12],
    description: 'Cervical spine and head position',
    clinicalFocus: ['Forward head posture', 'Cervical ROM', 'Lateral flexion', 'Rotation deficit'],
    icon: '🗣️'
  },
  {
    id: 'lumbar_spine',
    label: 'Low Back / Lumbar',
    joints: ['spine', 'pelvis'],
    landmarkIndices: [11, 12, 23, 24],
    description: 'Lumbar spine and pelvis',
    clinicalFocus: ['Lordosis', 'Flexion ROM', 'Lateral shift', 'Pelvic tilt', 'Movement control'],
    icon: '🔙'
  },
  {
    id: 'right_leg',
    label: 'Right Leg (Full)',
    joints: ['rightHip', 'rightKnee'],
    landmarkIndices: [24, 26, 28, 30, 32],
    description: 'Full right lower extremity',
    clinicalFocus: ['Limb alignment', 'Movement mechanics', 'Weight distribution', 'Step pattern'],
    icon: '🦿'
  },
  {
    id: 'left_leg',
    label: 'Left Leg (Full)',
    joints: ['leftHip', 'leftKnee'],
    landmarkIndices: [23, 25, 27, 29, 31],
    description: 'Full left lower extremity',
    clinicalFocus: ['Limb alignment', 'Movement mechanics', 'Weight distribution', 'Step pattern'],
    icon: '🦿'
  },
];
