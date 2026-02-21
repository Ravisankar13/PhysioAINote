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

export interface JointLimits {
  [joint: string]: {
    [property: string]: { min: number; max: number };
  };
}

export const DEFAULT_JOINT_LIMITS: JointLimits = {
  leftHip: {
    flexion: { min: -30, max: 140 },
    extension: { min: 0, max: 30 },
    abduction: { min: -30, max: 45 },
    internalRotation: { min: -45, max: 45 },
  },
  rightHip: {
    flexion: { min: -30, max: 140 },
    extension: { min: 0, max: 30 },
    abduction: { min: -30, max: 45 },
    internalRotation: { min: -45, max: 45 },
  },
  leftKnee: {
    flexion: { min: 0, max: 140 },
    varus: { min: -20, max: 20 },
  },
  rightKnee: {
    flexion: { min: 0, max: 140 },
    varus: { min: -20, max: 20 },
  },
  leftAnkle: {
    dorsiflexion: { min: 0, max: 30 },
    plantarflexion: { min: 0, max: 50 },
    inversion: { min: 0, max: 35 },
    eversion: { min: 0, max: 25 },
  },
  rightAnkle: {
    dorsiflexion: { min: 0, max: 30 },
    plantarflexion: { min: 0, max: 50 },
    inversion: { min: 0, max: 35 },
    eversion: { min: 0, max: 25 },
  },
  leftShoulder: {
    flexion: { min: -180, max: 180 },
    abduction: { min: 0, max: 180 },
    internalRotation: { min: -90, max: 90 },
    externalRotation: { min: 0, max: 90 },
  },
  rightShoulder: {
    flexion: { min: -180, max: 180 },
    abduction: { min: 0, max: 180 },
    internalRotation: { min: -90, max: 90 },
    externalRotation: { min: 0, max: 90 },
  },
  leftElbow: {
    flexion: { min: 0, max: 150 },
    pronation: { min: -90, max: 90 },
  },
  rightElbow: {
    flexion: { min: 0, max: 150 },
    pronation: { min: -90, max: 90 },
  },
  pelvis: {
    tilt: { min: -90, max: 90 },
    obliquity: { min: -20, max: 20 },
    rotation: { min: -45, max: 45 },
    drop: { min: 0, max: 100 }, // Vertical drop for closed-chain movements (squat depth)
  },
  neck: {
    flexion: { min: 0, max: 60 },
    extension: { min: 0, max: 75 },
    rotation: { min: -80, max: 80 },
    lateralFlexion: { min: -45, max: 45 },
  },
  spine: {
    lumbarLordosis: { min: -70, max: 90 },
    thoracicKyphosis: { min: -50, max: 50 },
    thoracicRotation: { min: -45, max: 45 },
    lumbarRotation: { min: -30, max: 30 },
    flexion: { min: -30, max: 90 },
    lateralFlexion: { min: -45, max: 45 },
  },
};

export function applyJointConstraints(
  value: number, 
  joint: string, 
  property: string, 
  customLimits?: JointLimits
): number {
  const limits = customLimits || DEFAULT_JOINT_LIMITS;
  const jointLimits = limits[joint];
  
  if (!jointLimits) return value;
  
  const propLimits = jointLimits[property];
  if (!propLimits) return value;
  
  return Math.max(propLimits.min, Math.min(propLimits.max, value));
}

export const MOVEMENT_SEQUENCES: MovementSequence[] = [
  {
    id: 'squat',
    name: 'Squat',
    description: 'Closed-chain parallel squat - feet planted, IK-driven hip/knee flexion',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'pelvis',
        property: 'drop',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 5 },
          { time: 0.35, value: 55 },
          { time: 0.5, value: 65 },
          { time: 0.65, value: 55 },
          { time: 0.9, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 2 },
          { time: 0.35, value: 18 },
          { time: 0.5, value: 22 },
          { time: 0.65, value: 18 },
          { time: 0.9, value: 2 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 2 },
          { time: 0.35, value: 15 },
          { time: 0.5, value: 20 },
          { time: 0.65, value: 15 },
          { time: 0.9, value: 2 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 2 },
          { time: 0.35, value: 15 },
          { time: 0.5, value: 20 },
          { time: 0.65, value: 15 },
          { time: 0.9, value: 2 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 2 },
          { time: 0.35, value: 15 },
          { time: 0.5, value: 20 },
          { time: 0.65, value: 15 },
          { time: 0.9, value: 2 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 5 },
          { time: 0.35, value: 55 },
          { time: 0.5, value: 70 },
          { time: 0.65, value: 55 },
          { time: 0.9, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 5 },
          { time: 0.35, value: 55 },
          { time: 0.5, value: 70 },
          { time: 0.65, value: 55 },
          { time: 0.9, value: 5 },
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
  {
    id: 'forwardBend',
    name: 'Forward Bend',
    description: 'Deep standing trunk flexion - hands touch floor',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'spine',
        property: 'lumbarLordosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: -70 },
          { time: 0.6, value: -70 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicKyphosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 50 },
          { time: 0.6, value: 50 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: -90 },
          { time: 0.6, value: -90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'neck',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 45 },
          { time: 0.6, value: 45 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'backwardBend',
    name: 'Backward Bend',
    description: 'Standing trunk extension - spine only, feet stay planted',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'spine',
        property: 'lumbarLordosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 50 },
          { time: 0.6, value: 50 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicKyphosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: -40 },
          { time: 0.6, value: -40 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 45 },
          { time: 0.6, value: 45 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'neck',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 25 },
          { time: 0.6, value: 25 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'calfRaises',
    name: 'Calf Raises',
    description: 'Bilateral heel raises through ankle plantarflexion',
    duration: 2000,
    loop: true,
    joints: [
      // Left ankle plantarflexion (heels lift)
      {
        joint: 'leftAnkle',
        property: 'plantarflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 40 },
          { time: 0.6, value: 40 },
          { time: 1, value: 0 },
        ],
      },
      // Right ankle plantarflexion
      {
        joint: 'rightAnkle',
        property: 'plantarflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 40 },
          { time: 0.6, value: 40 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'armElevations',
    name: 'Arm Elevations',
    description: 'Bilateral arms raising overhead through shoulder flexion',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 180 },
          { time: 0.6, value: 180 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 180 },
          { time: 0.6, value: 180 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'hipHinge',
    name: 'Hip Hinge',
    description: 'Deadlift pattern - hinging at the hips with minimal knee bend',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 80 },
          { time: 0.6, value: 80 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 80 },
          { time: 0.6, value: 80 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.6, value: 15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.6, value: 15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'tilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 25 },
          { time: 0.6, value: 25 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicKyphosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 10 },
          { time: 0.6, value: 10 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'shoulderAbduction',
    name: 'Shoulder Abduction',
    description: 'Bilateral shoulder abduction - arms raise laterally to overhead',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 90 },
          { time: 0.5, value: 170 },
          { time: 0.65, value: 90 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 90 },
          { time: 0.5, value: 170 },
          { time: 0.65, value: 90 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'lateralLunge',
    name: 'Lateral Lunge',
    description: 'Side lunge alternating left and right',
    duration: 5000,
    loop: true,
    joints: [
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 60 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 30 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 70 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 60 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftHip',
        property: 'abduction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 30 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 70 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'obliquity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 5 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -5 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'trunkRotation',
    name: 'Trunk Rotation',
    description: 'Standing thoracolumbar rotation left and right',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'spine',
        property: 'thoracicRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 35 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -35 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'lumbarRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 15 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'rotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: -10 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 10 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 15 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -10 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: -10 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 15 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'lateralFlexion',
    name: 'Lateral Flexion',
    description: 'Standing side bending left and right',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'spine',
        property: 'lateralFlexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 35 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -35 },
          { time: 1, value: 0 },
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
        joint: 'neck',
        property: 'lateralFlexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 10 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -10 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'elbowFlexion',
    name: 'Elbow Flexion',
    description: 'Bilateral bicep curl movement pattern',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftElbow',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 130 },
          { time: 0.6, value: 130 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightElbow',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 130 },
          { time: 0.6, value: 130 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'stepUp',
    name: 'Step Up',
    description: 'Alternating step-up pattern simulating stair climbing',
    duration: 3000,
    loop: true,
    joints: [
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.2, value: 70 },
          { time: 0.4, value: 40 },
          { time: 0.5, value: 0 },
          { time: 0.7, value: -10 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.2, value: -10 },
          { time: 0.5, value: 0 },
          { time: 0.7, value: 70 },
          { time: 0.9, value: 40 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.2, value: 80 },
          { time: 0.4, value: 30 },
          { time: 0.5, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.5, value: 0 },
          { time: 0.7, value: 80 },
          { time: 0.9, value: 30 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.2, value: -20 },
          { time: 0.5, value: 0 },
          { time: 0.7, value: 20 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.2, value: 20 },
          { time: 0.5, value: 0 },
          { time: 0.7, value: -20 },
          { time: 1, value: 0 },
        ],
      },
    ],
  },
];

export const MOVEMENT_CATEGORIES: { id: string; name: string; movements: string[] }[] = [
  { id: 'lower', name: 'Lower Body', movements: ['squat', 'lunge', 'hipHinge', 'lateralLunge', 'calfRaises'] },
  { id: 'upper', name: 'Upper Body', movements: ['armElevations', 'shoulderAbduction', 'shoulderCircles', 'elbowFlexion'] },
  { id: 'spine', name: 'Spine & Core', movements: ['forwardBend', 'backwardBend', 'trunkRotation', 'lateralFlexion', 'neckMobility'] },
  { id: 'functional', name: 'Functional', movements: ['walk', 'singleLegBalance', 'hipCircles', 'stepUp'] },
];

export function getMovementById(id: string): MovementSequence | undefined {
  return MOVEMENT_SEQUENCES.find(m => m.id === id);
}

export function getMovementCategories(): typeof MOVEMENT_CATEGORIES {
  return MOVEMENT_CATEGORIES;
}
