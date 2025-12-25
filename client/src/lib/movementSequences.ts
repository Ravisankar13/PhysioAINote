export interface JointKeyframe {
  time: number;
  value: number;
}

export interface JointTimeline {
  joint: string;
  property: string;
  keyframes: JointKeyframe[];
}

export interface MovementSequence {
  id: string;
  name: string;
  description: string;
  duration: number;
  loop: boolean;
  joints: JointTimeline[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function interpolateKeyframes(keyframes: JointKeyframe[], time: number): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;
  
  if (time <= keyframes[0].time) return keyframes[0].value;
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i];
    const next = keyframes[i + 1];
    
    if (time >= current.time && time <= next.time) {
      const segmentDuration = next.time - current.time;
      const segmentProgress = (time - current.time) / segmentDuration;
      const easedProgress = easeInOutQuad(segmentProgress);
      return lerp(current.value, next.value, easedProgress);
    }
  }
  
  return keyframes[keyframes.length - 1].value;
}

export const MOVEMENT_SEQUENCES: MovementSequence[] = [
  {
    id: 'squat',
    name: 'Squat',
    description: 'Full bodyweight squat with proper form',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 100 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 100 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 120 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 120 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 25 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 25 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: -15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'lumbarLordosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: -20 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'walk',
    name: 'Walking Gait',
    description: 'Normal walking cycle',
    duration: 2000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 30 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: -15 },
          { time: 0.75, value: 0 },
          { time: 1, value: 30 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: -15 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 30 },
          { time: 0.75, value: 0 },
          { time: 1, value: -15 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 10 },
          { time: 0.15, value: 60 },
          { time: 0.35, value: 5 },
          { time: 0.65, value: 5 },
          { time: 0.85, value: 10 },
          { time: 1, value: 10 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 5 },
          { time: 0.15, value: 5 },
          { time: 0.35, value: 10 },
          { time: 0.5, value: 10 },
          { time: 0.65, value: 60 },
          { time: 0.85, value: 5 },
          { time: 1, value: 5 },
        ],
      },
      {
        joint: 'leftAnkle',
        property: 'plantarflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.5, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightAnkle',
        property: 'plantarflexion',
        keyframes: [
          { time: 0, value: 5 },
          { time: 0.5, value: 0 },
          { time: 0.9, value: 15 },
          { time: 1, value: 5 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'rotation',
        keyframes: [
          { time: 0, value: 8 },
          { time: 0.5, value: -8 },
          { time: 1, value: 8 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'obliquity',
        keyframes: [
          { time: 0, value: 4 },
          { time: 0.5, value: -4 },
          { time: 1, value: 4 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: -20 },
          { time: 0.5, value: 20 },
          { time: 1, value: -20 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 20 },
          { time: 0.5, value: -20 },
          { time: 1, value: 20 },
        ],
      },
      {
        joint: 'leftElbow',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 30 },
          { time: 0.5, value: 15 },
          { time: 1, value: 30 },
        ],
      },
      {
        joint: 'rightElbow',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 15 },
          { time: 0.5, value: 30 },
          { time: 1, value: 15 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicRotation',
        keyframes: [
          { time: 0, value: -5 },
          { time: 0.5, value: 5 },
          { time: 1, value: -5 },
        ],
      },
    ],
  },
  {
    id: 'lunge',
    name: 'Forward Lunge',
    description: 'Alternating forward lunges',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -20 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: -20 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 20 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 20 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: -10 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -10 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'singleLegBalance',
    name: 'Single Leg Balance',
    description: 'Alternating single leg stance',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 45 },
          { time: 0.75, value: 45 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 45 },
          { time: 0.25, value: 45 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 45 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 90 },
          { time: 0.75, value: 90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 90 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 90 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'obliquity',
        keyframes: [
          { time: 0, value: 5 },
          { time: 0.25, value: 5 },
          { time: 0.5, value: -5 },
          { time: 0.75, value: -5 },
          { time: 1, value: 5 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 10 },
          { time: 0.5, value: 30 },
          { time: 1, value: 10 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 30 },
          { time: 0.5, value: 10 },
          { time: 1, value: 30 },
        ],
      },
    ],
  },
  {
    id: 'hipCircles',
    name: 'Hip Circles',
    description: 'Circular hip mobility exercise',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 15 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: -15 },
          { time: 0.75, value: 0 },
          { time: 1, value: 15 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'obliquity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 15 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'lumbarLordosis',
        keyframes: [
          { time: 0, value: -20 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 10 },
          { time: 0.75, value: 0 },
          { time: 1, value: -20 },
        ],
      },
    ],
  },
  {
    id: 'shoulderCircles',
    name: 'Shoulder Circles',
    description: 'Shoulder circumduction exercise',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -30 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 90 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -30 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 30 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 30 },
          { time: 0.75, value: 60 },
          { time: 1, value: 30 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 30 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 30 },
          { time: 0.75, value: 60 },
          { time: 1, value: 30 },
        ],
      },
    ],
  },
  {
    id: 'neckMobility',
    name: 'Neck Mobility',
    description: 'Cervical spine mobility sequence',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'neck',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.125, value: 30 },
          { time: 0.25, value: 0 },
          { time: 0.375, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.625, value: 0 },
          { time: 0.75, value: 0 },
          { time: 0.875, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'neck',
        property: 'extension',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.125, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.375, value: 25 },
          { time: 0.5, value: 0 },
          { time: 0.625, value: 0 },
          { time: 0.75, value: 0 },
          { time: 0.875, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'neck',
        property: 'rotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.125, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.375, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.625, value: 45 },
          { time: 0.75, value: 0 },
          { time: 0.875, value: -45 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'neck',
        property: 'lateralFlexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 30 },
          { time: 0.75, value: 0 },
          { time: 0.875, value: -30 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
];

export function getMovementById(id: string): MovementSequence | undefined {
  return MOVEMENT_SEQUENCES.find(m => m.id === id);
}
