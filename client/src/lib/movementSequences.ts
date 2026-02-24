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
  useIK?: boolean;
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
  leftScapula: {
    upwardRotation: { min: 0, max: 60 },
    elevation: { min: 0, max: 30 },
    clavicleRotation: { min: 0, max: 30 },
    protraction: { min: 0, max: 30 },
    posteriorTilt: { min: 0, max: 20 },
  },
  rightScapula: {
    upwardRotation: { min: 0, max: 60 },
    elevation: { min: 0, max: 30 },
    clavicleRotation: { min: 0, max: 30 },
    protraction: { min: 0, max: 30 },
    posteriorTilt: { min: 0, max: 20 },
  },
  pelvis: {
    tilt: { min: -90, max: 90 },
    obliquity: { min: -20, max: 20 },
    rotation: { min: -45, max: 45 },
    drop: { min: 0, max: 100 }, // Vertical drop for closed-chain movements (squat depth)
    zShift: { min: -100, max: 100 }, // Forward/backward pelvis shift for lunges
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
    description: 'Parallel squat with hip/knee/ankle flexion and feet planted on floor',
    duration: 4000,
    loop: true,
    joints: [
      {
        joint: 'pelvis',
        property: 'drop',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 5 },
          { time: 0.35, value: 40 },
          { time: 0.5, value: 55 },
          { time: 0.65, value: 40 },
          { time: 0.9, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 8 },
          { time: 0.35, value: 55 },
          { time: 0.5, value: 80 },
          { time: 0.65, value: 55 },
          { time: 0.9, value: 8 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 8 },
          { time: 0.35, value: 55 },
          { time: 0.5, value: 80 },
          { time: 0.65, value: 55 },
          { time: 0.9, value: 8 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 10 },
          { time: 0.35, value: 70 },
          { time: 0.5, value: 100 },
          { time: 0.65, value: 70 },
          { time: 0.9, value: 10 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightKnee',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 10 },
          { time: 0.35, value: 70 },
          { time: 0.5, value: 100 },
          { time: 0.65, value: 70 },
          { time: 0.9, value: 10 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 3 },
          { time: 0.35, value: 18 },
          { time: 0.5, value: 25 },
          { time: 0.65, value: 18 },
          { time: 0.9, value: 3 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightAnkle',
        property: 'dorsiflexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 3 },
          { time: 0.35, value: 18 },
          { time: 0.5, value: 25 },
          { time: 0.65, value: 18 },
          { time: 0.9, value: 3 },
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
        property: 'abduction',
        keyframes: [
          { time: 0, value: -70 },
          { time: 1, value: -70 },
        ],
      },
      {
        joint: 'rightShoulder',
        property: 'abduction',
        keyframes: [
          { time: 0, value: -70 },
          { time: 1, value: -70 },
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
          { time: 0, value: 25 },
          { time: 0.5, value: 15 },
          { time: 1, value: 25 },
        ],
      },
      {
        joint: 'rightElbow',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 15 },
          { time: 0.5, value: 25 },
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
    description: 'Alternating forward lunges with IK-driven body lowering',
    duration: 5000,
    loop: true,
    useIK: true,
    joints: [
      {
        joint: 'pelvis',
        property: 'drop',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 15 },
          { time: 0.2, value: 45 },
          { time: 0.25, value: 60 },
          { time: 0.3, value: 45 },
          { time: 0.4, value: 15 },
          { time: 0.5, value: 0 },
          { time: 0.6, value: 15 },
          { time: 0.7, value: 45 },
          { time: 0.75, value: 60 },
          { time: 0.8, value: 45 },
          { time: 0.9, value: 15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'pelvis',
        property: 'zShift',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.1, value: 20 },
          { time: 0.2, value: 45 },
          { time: 0.25, value: 55 },
          { time: 0.3, value: 45 },
          { time: 0.4, value: 20 },
          { time: 0.5, value: 0 },
          { time: 0.6, value: -20 },
          { time: 0.7, value: -45 },
          { time: 0.75, value: -55 },
          { time: 0.8, value: -45 },
          { time: 0.9, value: -20 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 5 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 3 },
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
    description: 'Shoulder circumduction exercise with scapulohumeral rhythm',
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
      {
        joint: 'leftScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 1 },
          { time: 0.25, value: 5 },
          { time: 0.5, value: 1 },
          { time: 0.75, value: 3 },
          { time: 1, value: 1 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 1 },
          { time: 0.25, value: 5 },
          { time: 0.5, value: 1 },
          { time: 0.75, value: 3 },
          { time: 1, value: 1 },
        ],
      },
      {
        joint: 'leftScapula',
        property: 'elevation',
        keyframes: [
          { time: 0, value: 1 },
          { time: 0.25, value: 3 },
          { time: 0.5, value: 1 },
          { time: 0.75, value: 2 },
          { time: 1, value: 1 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'elevation',
        keyframes: [
          { time: 0, value: 1 },
          { time: 0.25, value: 3 },
          { time: 0.5, value: 1 },
          { time: 0.75, value: 2 },
          { time: 1, value: 1 },
        ],
      },
      {
        joint: 'leftScapula',
        property: 'protraction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 3 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -2 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'protraction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 3 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: -2 },
          { time: 1, value: 0 },
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
        joint: 'neck',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 45 },
          { time: 0.6, value: 45 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 60 },
          { time: 0.6, value: 60 },
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
        joint: 'neck',
        property: 'extension',
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
    description: 'Bilateral arms raising overhead through shoulder flexion with scapulohumeral rhythm',
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
      {
        joint: 'leftScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.6, value: 15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.6, value: 15 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftScapula',
        property: 'posteriorTilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 5 },
          { time: 0.6, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'posteriorTilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 5 },
          { time: 0.6, value: 5 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicKyphosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: -10 },
          { time: 0.6, value: -10 },
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
        joint: 'spine',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 70 },
          { time: 0.6, value: 70 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'lumbarLordosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.4, value: 15 },
          { time: 0.6, value: 15 },
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
    ],
  },
  {
    id: 'shoulderAbduction',
    name: 'Shoulder Abduction',
    description: 'Bilateral shoulder abduction with scapulohumeral rhythm - arms raise laterally to overhead',
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
      {
        joint: 'leftScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 6 },
          { time: 0.5, value: 12 },
          { time: 0.65, value: 6 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'upwardRotation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 6 },
          { time: 0.5, value: 12 },
          { time: 0.65, value: 6 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftScapula',
        property: 'posteriorTilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 3 },
          { time: 0.5, value: 5 },
          { time: 0.65, value: 3 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'posteriorTilt',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 3 },
          { time: 0.5, value: 5 },
          { time: 0.65, value: 3 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'leftScapula',
        property: 'elevation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 3 },
          { time: 0.5, value: 5 },
          { time: 0.65, value: 3 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightScapula',
        property: 'elevation',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: 3 },
          { time: 0.5, value: 5 },
          { time: 0.65, value: 3 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'thoracicKyphosis',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.35, value: -5 },
          { time: 0.5, value: -10 },
          { time: 0.65, value: -5 },
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
        property: 'abduction',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 45 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'rightHip',
        property: 'flexion',
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
          { time: 0.25, value: 60 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 0 },
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
          { time: 0.75, value: 45 },
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
          { time: 0.75, value: 60 },
          { time: 1, value: 0 },
        ],
      },
      {
        joint: 'spine',
        property: 'flexion',
        keyframes: [
          { time: 0, value: 0 },
          { time: 0.25, value: 10 },
          { time: 0.5, value: 0 },
          { time: 0.75, value: 10 },
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

export interface MovementRestriction {
  joint: string;
  movement: string;
  label: string;
  defaultMaxROM: number;
}

export const MOVEMENT_RESTRICTIONS: Record<string, MovementRestriction[]> = {
  squat: [
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 80 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 80 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 100 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 100 },
    { joint: 'left_ankle', movement: 'dorsiflexion', label: 'L Ankle Dorsiflexion', defaultMaxROM: 25 },
    { joint: 'right_ankle', movement: 'dorsiflexion', label: 'R Ankle Dorsiflexion', defaultMaxROM: 25 },
    { joint: 'lumbar_spine', movement: 'flexion', label: 'Trunk Flexion', defaultMaxROM: 20 },
  ],
  lunge: [
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 90 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 90 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 90 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 90 },
    { joint: 'left_ankle', movement: 'dorsiflexion', label: 'L Ankle Dorsiflexion', defaultMaxROM: 25 },
    { joint: 'right_ankle', movement: 'dorsiflexion', label: 'R Ankle Dorsiflexion', defaultMaxROM: 25 },
    { joint: 'lumbar_spine', movement: 'flexion', label: 'Trunk Flexion', defaultMaxROM: 15 },
  ],
  forwardBend: [
    { joint: 'lumbar_spine', movement: 'flexion', label: 'Lumbar Flexion', defaultMaxROM: 70 },
    { joint: 'thoracic_spine', movement: 'flexion', label: 'Thoracic Flexion', defaultMaxROM: 50 },
    { joint: 'neck', movement: 'flexion', label: 'Neck Flexion', defaultMaxROM: 45 },
    { joint: 'spine', movement: 'flexion', label: 'Hip/Trunk Flexion', defaultMaxROM: 60 },
  ],
  backwardBend: [
    { joint: 'lumbar_spine', movement: 'extension', label: 'Lumbar Extension', defaultMaxROM: 30 },
    { joint: 'thoracic_spine', movement: 'extension', label: 'Thoracic Extension', defaultMaxROM: 25 },
    { joint: 'neck', movement: 'extension', label: 'Neck Extension', defaultMaxROM: 20 },
  ],
  hipHinge: [
    { joint: 'spine', movement: 'flexion', label: 'Trunk Flexion', defaultMaxROM: 60 },
    { joint: 'lumbar_spine', movement: 'flexion', label: 'Lumbar Flexion', defaultMaxROM: 60 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 15 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 15 },
  ],
  walk: [
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 30 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 30 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 40 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 40 },
    { joint: 'left_ankle', movement: 'plantarflexion', label: 'L Ankle Plantarflexion', defaultMaxROM: 20 },
    { joint: 'right_ankle', movement: 'plantarflexion', label: 'R Ankle Plantarflexion', defaultMaxROM: 20 },
    { joint: 'spine', movement: 'thoracicRotation', label: 'Trunk Rotation', defaultMaxROM: 8 },
  ],
  trunkRotation: [
    { joint: 'spine', movement: 'thoracicRotation', label: 'Thoracic Rotation', defaultMaxROM: 30 },
    { joint: 'spine', movement: 'lumbarRotation', label: 'Lumbar Rotation', defaultMaxROM: 20 },
    { joint: 'pelvis', movement: 'rotation', label: 'Pelvis Rotation', defaultMaxROM: 15 },
  ],
  lateralFlexion: [
    { joint: 'spine', movement: 'lateralFlexion', label: 'Spine Lateral Flexion', defaultMaxROM: 35 },
    { joint: 'pelvis', movement: 'obliquity', label: 'Pelvis Obliquity', defaultMaxROM: 15 },
    { joint: 'neck', movement: 'lateralFlexion', label: 'Neck Lateral Flexion', defaultMaxROM: 10 },
  ],
  neckMobility: [
    { joint: 'neck', movement: 'flexion', label: 'Neck Flexion', defaultMaxROM: 30 },
    { joint: 'neck', movement: 'extension', label: 'Neck Extension', defaultMaxROM: 25 },
    { joint: 'neck', movement: 'rotation', label: 'Neck Rotation', defaultMaxROM: 45 },
    { joint: 'neck', movement: 'lateralFlexion', label: 'Neck Lateral Flexion', defaultMaxROM: 30 },
  ],
  lateralLunge: [
    { joint: 'left_hip', movement: 'abduction', label: 'L Hip Abduction', defaultMaxROM: 45 },
    { joint: 'right_hip', movement: 'abduction', label: 'R Hip Abduction', defaultMaxROM: 45 },
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 60 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 60 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 90 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 90 },
    { joint: 'lumbar_spine', movement: 'flexion', label: 'Trunk Flexion', defaultMaxROM: 15 },
  ],
  armElevations: [
    { joint: 'left_shoulder', movement: 'flexion', label: 'L GH Flexion', defaultMaxROM: 170 },
    { joint: 'right_shoulder', movement: 'flexion', label: 'R GH Flexion', defaultMaxROM: 170 },
    { joint: 'left_scapula', movement: 'upwardRotation', label: 'L Scapula Upward Rotation', defaultMaxROM: 15 },
    { joint: 'right_scapula', movement: 'upwardRotation', label: 'R Scapula Upward Rotation', defaultMaxROM: 15 },
    { joint: 'thoracic_spine', movement: 'extension', label: 'Thoracic Extension', defaultMaxROM: 20 },
  ],
  shoulderAbduction: [
    { joint: 'left_shoulder', movement: 'abduction', label: 'L GH Abduction', defaultMaxROM: 170 },
    { joint: 'right_shoulder', movement: 'abduction', label: 'R GH Abduction', defaultMaxROM: 170 },
    { joint: 'left_scapula', movement: 'upwardRotation', label: 'L Scapula Upward Rotation', defaultMaxROM: 12 },
    { joint: 'right_scapula', movement: 'upwardRotation', label: 'R Scapula Upward Rotation', defaultMaxROM: 12 },
    { joint: 'thoracic_spine', movement: 'extension', label: 'Thoracic Extension', defaultMaxROM: 20 },
  ],
  shoulderCircles: [
    { joint: 'left_shoulder', movement: 'flexion', label: 'L Shoulder Flexion', defaultMaxROM: 30 },
    { joint: 'right_shoulder', movement: 'flexion', label: 'R Shoulder Flexion', defaultMaxROM: 30 },
    { joint: 'left_shoulder', movement: 'abduction', label: 'L Shoulder Abduction', defaultMaxROM: 30 },
    { joint: 'right_shoulder', movement: 'abduction', label: 'R Shoulder Abduction', defaultMaxROM: 30 },
  ],
  elbowFlexion: [
    { joint: 'left_elbow', movement: 'flexion', label: 'L Elbow Flexion', defaultMaxROM: 135 },
    { joint: 'right_elbow', movement: 'flexion', label: 'R Elbow Flexion', defaultMaxROM: 135 },
  ],
  singleLegBalance: [
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 45 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 45 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 90 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 90 },
    { joint: 'pelvis', movement: 'obliquity', label: 'Pelvis Drop', defaultMaxROM: 10 },
  ],
  hipCircles: [
    { joint: 'pelvis', movement: 'anterior_tilt', label: 'Pelvis Tilt', defaultMaxROM: 20 },
    { joint: 'pelvis', movement: 'obliquity', label: 'Pelvis Obliquity', defaultMaxROM: 15 },
  ],
  calfRaises: [
    { joint: 'left_ankle', movement: 'plantarflexion', label: 'L Plantarflexion', defaultMaxROM: 45 },
    { joint: 'right_ankle', movement: 'plantarflexion', label: 'R Plantarflexion', defaultMaxROM: 45 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 10 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 10 },
  ],
  stepUp: [
    { joint: 'left_hip', movement: 'flexion', label: 'L Hip Flexion', defaultMaxROM: 70 },
    { joint: 'right_hip', movement: 'flexion', label: 'R Hip Flexion', defaultMaxROM: 70 },
    { joint: 'left_knee', movement: 'flexion', label: 'L Knee Flexion', defaultMaxROM: 90 },
    { joint: 'right_knee', movement: 'flexion', label: 'R Knee Flexion', defaultMaxROM: 90 },
  ],
};

export function getMovementById(id: string): MovementSequence | undefined {
  return MOVEMENT_SEQUENCES.find(m => m.id === id);
}

export function getMovementCategories(): typeof MOVEMENT_CATEGORIES {
  return MOVEMENT_CATEGORIES;
}
