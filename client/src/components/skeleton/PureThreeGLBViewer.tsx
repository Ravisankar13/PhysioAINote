import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlertCircle, Loader2, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMovementById, interpolateKeyframes, applyJointConstraints, JointLimits } from '@/lib/movementSequences';
import { initializeLegIK, applySquatIK, applyLegIK, LEG_IK_CONFIG, LegIKState } from '@/lib/legIKSolver';
import { ForceVisualizationManager, BiomechanicsVisualizationData, HoverData } from '@/lib/forceVisualization';
import { MuscleVisualizationManager, MuscleActivationLevels } from '@/lib/muscleVisualization';
import { MuscleLayerManager, MuscleLayerConfig } from '@/lib/muscleLayerManager';
import { classifyMuscleMeshes, setMuscleGroupVisibility, setAllMuscleGroupsVisibility, disposeMuscleGroups, MUSCLE_GROUPS, type SplitMuscleGroup } from '@/lib/muscleGroupSplitter';
import { type MuscleStatesMap, getMuscleColor } from '@/lib/muscleBiomechanicsEngine';
import { Skeleton3DPose } from '@/utils/mediapipeTo3D';
import { poseToControllerValues, ControllerValues } from '@/utils/poseToControllerMap';

interface JointConfig {
  flexion?: number;
  extension?: number;
  abduction?: number;
  internalRotation?: number;
  pronation?: number;
  carryingAngle?: number;
  dorsiflexion?: number;
  plantarflexion?: number;
  inversion?: number;
  eversion?: number;
  clavicleLength?: number;
  [key: string]: number | undefined;
}

interface ScapulaConfig {
  protraction?: number;     // Forward movement (shoulder blade moving away from spine)
  retraction?: number;      // Backward movement (shoulder blade moving toward spine)
  elevation?: number;       // Upward movement (shrugging)
  depression?: number;      // Downward movement
  upwardRotation?: number;  // Glenoid facing upward (occurs with arm elevation)
  downwardRotation?: number; // Glenoid facing downward
  anteriorTilt?: number;    // Forward tilt of inferior angle
  posteriorTilt?: number;   // Backward tilt of inferior angle
  winging?: number;         // Medial border lifting off ribcage
  clavicleRotation?: number; // Axial rotation of clavicle (posterior/anterior rotation)
}

interface ModelConfig {
  leftHip?: JointConfig;
  rightHip?: JointConfig;
  leftKnee?: JointConfig;
  rightKnee?: JointConfig;
  leftAnkle?: JointConfig;
  rightAnkle?: JointConfig;
  leftShoulder?: JointConfig;
  rightShoulder?: JointConfig;
  leftScapula?: ScapulaConfig;
  rightScapula?: ScapulaConfig;
  leftElbow?: JointConfig;
  rightElbow?: JointConfig;
  leftWrist?: JointConfig;
  rightWrist?: JointConfig;
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number; drop?: number; zShift?: number; leftInnominateRotation?: number; rightInnominateRotation?: number };
  sacrum?: { nutation?: number; counternutation?: number; torsion?: number; lateralFlexion?: number };
  spine?: { cervicalLordosis?: number; thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number; forwardHead?: number; lateralShift?: number; cervicalRotation?: number; cervicalLateralFlexion?: number; thoracicRotation?: number; lumbarRotation?: number; flexion?: number; lateralFlexion?: number; lumbarScoliosis?: number; thoracicScoliosis?: number; cervicalScoliosis?: number };
  neck?: { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number };
  [key: string]: JointConfig | ScapulaConfig | Record<string, number | undefined> | undefined;
}

export interface AnimationState {
  isPlaying: boolean;
  currentMovement: string | null;
  progress: number;
  speed: number;
}

export type CameraAngle = 'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | 'custom';

export interface CameraAngleConfig {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  label: string;
}

export const CAMERA_PRESETS: Record<CameraAngle, CameraAngleConfig> = {
  front: { position: { x: 0, y: -0.3, z: 2.5 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Front View' },
  back: { position: { x: 0, y: -0.3, z: -2.5 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Back View' },
  left: { position: { x: -2.5, y: -0.3, z: 0 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Left Side' },
  right: { position: { x: 2.5, y: -0.3, z: 0 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Right Side' },
  top: { position: { x: 0, y: 5, z: 0.1 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Top View (Transverse)' },
  perspective: { position: { x: 2, y: 0.2, z: 2 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: '3/4 View' },
  custom: { position: { x: 0, y: -0.3, z: 2.5 }, lookAt: { x: 0, y: -0.3, z: 0 }, label: 'Custom' },
};

export type AnatomicalRegion = 
  | 'full_body' 
  | 'lumbar_spine' 
  | 'thoracic_spine' 
  | 'cervical_spine' 
  | 'left_shoulder' 
  | 'right_shoulder' 
  | 'left_hip' 
  | 'right_hip' 
  | 'left_knee' 
  | 'right_knee' 
  | 'left_ankle' 
  | 'right_ankle'
  | 'pelvis'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_scapula'
  | 'right_scapula'
  | 'left_wrist'
  | 'right_wrist'
  // Lumbar segment pairs
  | 'L1_L2'
  | 'L2_L3'
  | 'L3_L4'
  | 'L4_L5'
  | 'L5_S1'
  // Sub-structure views
  | 'L1_L2_facet' | 'L1_L2_pars' | 'L1_L2_disc' | 'L1_L2_body' | 'L1_L2_spinous'
  | 'L2_L3_facet' | 'L2_L3_pars' | 'L2_L3_disc' | 'L2_L3_body' | 'L2_L3_spinous'
  | 'L3_L4_facet' | 'L3_L4_pars' | 'L3_L4_disc' | 'L3_L4_body' | 'L3_L4_spinous'
  | 'L4_L5_facet' | 'L4_L5_pars' | 'L4_L5_disc' | 'L4_L5_body' | 'L4_L5_spinous'
  | 'L5_S1_facet' | 'L5_S1_pars' | 'L5_S1_disc' | 'L5_S1_body' | 'L5_S1_spinous';

export type SpinalSegment = 'L1_L2' | 'L2_L3' | 'L3_L4' | 'L4_L5' | 'L5_S1';
export type SubStructure = 'facet' | 'pars' | 'disc' | 'body' | 'spinous';

export const LUMBAR_SEGMENTS: SpinalSegment[] = ['L1_L2', 'L2_L3', 'L3_L4', 'L4_L5', 'L5_S1'];
export const SUB_STRUCTURES: { id: SubStructure; label: string; description: string }[] = [
  { id: 'facet', label: 'Facet Joints', description: 'Zygapophyseal joints - posterior articulations' },
  { id: 'pars', label: 'Pars Interarticularis', description: 'Isthmus connecting superior and inferior articular processes' },
  { id: 'disc', label: 'Intervertebral Disc', description: 'Nucleus pulposus and annulus fibrosus' },
  { id: 'body', label: 'Vertebral Body', description: 'Anterior weight-bearing structure' },
  { id: 'spinous', label: 'Spinous Process', description: 'Posterior bony projection' },
];

export interface AnatomicalRegionConfig {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  label: string;
  icon: string;
  description: string;
}

export const ANATOMICAL_REGION_PRESETS: Record<AnatomicalRegion, AnatomicalRegionConfig> = {
  full_body: { 
    position: { x: 0, y: -0.3, z: 2.2 }, 
    lookAt: { x: 0, y: -0.3, z: 0 }, 
    label: 'Full Body',
    icon: '🦴',
    description: 'Complete skeleton view'
  },
  lumbar_spine: { 
    position: { x: 0.8, y: 0.8, z: 1.5 }, 
    lookAt: { x: 0, y: 0.8, z: 0 }, 
    label: 'Lumbar Spine',
    icon: '🔻',
    description: 'L1-L5 vertebrae, lower back'
  },
  thoracic_spine: { 
    position: { x: 0.8, y: 1.4, z: 1.5 }, 
    lookAt: { x: 0, y: 1.4, z: 0 }, 
    label: 'Thoracic Spine',
    icon: '🔷',
    description: 'T1-T12 vertebrae, mid back'
  },
  cervical_spine: { 
    position: { x: 0.6, y: 2.0, z: 1.2 }, 
    lookAt: { x: 0, y: 2.0, z: 0 }, 
    label: 'Cervical Spine',
    icon: '🔹',
    description: 'C1-C7 vertebrae, neck'
  },
  left_shoulder: { 
    position: { x: -1.5, y: 1.8, z: 1.8 }, 
    lookAt: { x: -0.5, y: 1.65, z: 0 }, 
    label: 'Left Shoulder',
    icon: '⬅️',
    description: 'Glenohumeral joint, rotator cuff'
  },
  right_shoulder: { 
    position: { x: 1.5, y: 1.8, z: 1.8 }, 
    lookAt: { x: 0.5, y: 1.65, z: 0 }, 
    label: 'Right Shoulder',
    icon: '➡️',
    description: 'Glenohumeral joint, rotator cuff'
  },
  left_hip: { 
    position: { x: -1.2, y: 0.5, z: 1.8 }, 
    lookAt: { x: -0.25, y: 0.5, z: 0 }, 
    label: 'Left Hip',
    icon: '⬅️',
    description: 'Acetabulofemoral joint'
  },
  right_hip: { 
    position: { x: 1.2, y: 0.5, z: 1.8 }, 
    lookAt: { x: 0.25, y: 0.5, z: 0 }, 
    label: 'Right Hip',
    icon: '➡️',
    description: 'Acetabulofemoral joint'
  },
  pelvis: { 
    position: { x: 0, y: 0.5, z: 2.0 }, 
    lookAt: { x: 0, y: 0.5, z: 0 }, 
    label: 'Pelvis',
    icon: '🔲',
    description: 'SI joints, pubic symphysis'
  },
  left_knee: { 
    position: { x: -0.8, y: 0.0, z: 1.5 }, 
    lookAt: { x: -0.15, y: 0.0, z: 0 }, 
    label: 'Left Knee',
    icon: '⬅️',
    description: 'Tibiofemoral, patellofemoral joints'
  },
  right_knee: { 
    position: { x: 0.8, y: 0.0, z: 1.5 }, 
    lookAt: { x: 0.15, y: 0.0, z: 0 }, 
    label: 'Right Knee',
    icon: '➡️',
    description: 'Tibiofemoral, patellofemoral joints'
  },
  left_ankle: { 
    position: { x: -0.6, y: -0.5, z: 1.2 }, 
    lookAt: { x: -0.15, y: -0.5, z: 0 }, 
    label: 'Left Ankle',
    icon: '⬅️',
    description: 'Talocrural, subtalar joints'
  },
  right_ankle: { 
    position: { x: 0.6, y: -0.5, z: 1.2 }, 
    lookAt: { x: 0.15, y: -0.5, z: 0 }, 
    label: 'Right Ankle',
    icon: '➡️',
    description: 'Talocrural, subtalar joints'
  },
  left_elbow: { 
    position: { x: -1.8, y: 1.3, z: 1.2 }, 
    lookAt: { x: -0.8, y: 1.3, z: 0 }, 
    label: 'Left Elbow',
    icon: '⬅️',
    description: 'Humeroulnar, radioulnar joints'
  },
  right_elbow: { 
    position: { x: 1.8, y: 1.3, z: 1.2 }, 
    lookAt: { x: 0.8, y: 1.3, z: 0 }, 
    label: 'Right Elbow',
    icon: '➡️',
    description: 'Humeroulnar, radioulnar joints'
  },
  left_scapula: {
    position: { x: -1.2, y: 1.7, z: -1.2 },
    lookAt: { x: -0.4, y: 1.7, z: 0 },
    label: 'Left Scapula',
    icon: '⬅️',
    description: 'Left shoulder blade'
  },
  right_scapula: {
    position: { x: 1.2, y: 1.7, z: -1.2 },
    lookAt: { x: 0.4, y: 1.7, z: 0 },
    label: 'Right Scapula',
    icon: '➡️',
    description: 'Right shoulder blade'
  },
  left_wrist: {
    position: { x: -2.2, y: 1.0, z: 1.2 },
    lookAt: { x: -1.2, y: 1.0, z: 0 },
    label: 'Left Wrist',
    icon: '⬅️',
    description: 'Left wrist and hand'
  },
  right_wrist: {
    position: { x: 2.2, y: 1.0, z: 1.2 },
    lookAt: { x: 1.2, y: 1.0, z: 0 },
    label: 'Right Wrist',
    icon: '➡️',
    description: 'Right wrist and hand'
  },
  // Lumbar segment pairs - each segment is ~3cm apart, L1 at ~y=1.0, L5 at ~y=0.5
  L1_L2: { position: { x: 0.3, y: 0.95, z: 0.4 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2', icon: '🔹', description: 'L1-L2 motion segment' },
  L2_L3: { position: { x: 0.3, y: 0.85, z: 0.4 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3', icon: '🔹', description: 'L2-L3 motion segment' },
  L3_L4: { position: { x: 0.3, y: 0.75, z: 0.4 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4', icon: '🔹', description: 'L3-L4 motion segment' },
  L4_L5: { position: { x: 0.3, y: 0.65, z: 0.4 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5', icon: '🔹', description: 'L4-L5 motion segment - most common disc herniation site' },
  L5_S1: { position: { x: 0.3, y: 0.55, z: 0.4 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1', icon: '🔹', description: 'L5-S1 lumbosacral junction' },
  // Sub-structure views - facet joints (oblique posterolateral view ~45° from behind)
  L1_L2_facet: { position: { x: 0.3, y: 0.95, z: -0.3 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Facet', icon: '◇', description: 'L1-L2 zygapophyseal joints' },
  L2_L3_facet: { position: { x: 0.3, y: 0.85, z: -0.3 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Facet', icon: '◇', description: 'L2-L3 zygapophyseal joints' },
  L3_L4_facet: { position: { x: 0.3, y: 0.75, z: -0.3 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Facet', icon: '◇', description: 'L3-L4 zygapophyseal joints' },
  L4_L5_facet: { position: { x: 0.3, y: 0.65, z: -0.3 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Facet', icon: '◇', description: 'L4-L5 zygapophyseal joints' },
  L5_S1_facet: { position: { x: 0.3, y: 0.55, z: -0.3 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Facet', icon: '◇', description: 'L5-S1 zygapophyseal joints' },
  // Pars interarticularis (oblique "Scotty dog" view - posterior-lateral ~30-45°)
  L1_L2_pars: { position: { x: 0.35, y: 0.95, z: -0.25 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Pars', icon: '🐕', description: 'L1-L2 pars interarticularis' },
  L2_L3_pars: { position: { x: 0.35, y: 0.85, z: -0.25 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Pars', icon: '🐕', description: 'L2-L3 pars interarticularis' },
  L3_L4_pars: { position: { x: 0.35, y: 0.75, z: -0.25 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Pars', icon: '🐕', description: 'L3-L4 pars interarticularis' },
  L4_L5_pars: { position: { x: 0.35, y: 0.65, z: -0.25 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Pars', icon: '🐕', description: 'L4-L5 pars interarticularis - common spondylolysis site' },
  L5_S1_pars: { position: { x: 0.35, y: 0.55, z: -0.25 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Pars', icon: '🐕', description: 'L5-S1 pars interarticularis' },
  // Disc (lateral view - close up)
  L1_L2_disc: { position: { x: 0.4, y: 0.95, z: 0.1 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Disc', icon: '💿', description: 'L1-L2 intervertebral disc' },
  L2_L3_disc: { position: { x: 0.4, y: 0.85, z: 0.1 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Disc', icon: '💿', description: 'L2-L3 intervertebral disc' },
  L3_L4_disc: { position: { x: 0.4, y: 0.75, z: 0.1 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Disc', icon: '💿', description: 'L3-L4 intervertebral disc' },
  L4_L5_disc: { position: { x: 0.4, y: 0.65, z: 0.1 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Disc', icon: '💿', description: 'L4-L5 intervertebral disc - most common herniation' },
  L5_S1_disc: { position: { x: 0.4, y: 0.55, z: 0.1 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Disc', icon: '💿', description: 'L5-S1 intervertebral disc' },
  // Vertebral body (anterior view - close up)
  L1_L2_body: { position: { x: 0, y: 0.95, z: 0.4 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Body', icon: '⬜', description: 'L1-L2 vertebral bodies' },
  L2_L3_body: { position: { x: 0, y: 0.85, z: 0.4 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Body', icon: '⬜', description: 'L2-L3 vertebral bodies' },
  L3_L4_body: { position: { x: 0, y: 0.75, z: 0.4 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Body', icon: '⬜', description: 'L3-L4 vertebral bodies' },
  L4_L5_body: { position: { x: 0, y: 0.65, z: 0.4 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Body', icon: '⬜', description: 'L4-L5 vertebral bodies' },
  L5_S1_body: { position: { x: 0, y: 0.55, z: 0.4 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Body', icon: '⬜', description: 'L5-S1 vertebral bodies' },
  // Spinous process (posterior view - close up)
  L1_L2_spinous: { position: { x: 0, y: 0.95, z: -0.35 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Spinous', icon: '▲', description: 'L1-L2 spinous processes' },
  L2_L3_spinous: { position: { x: 0, y: 0.85, z: -0.35 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Spinous', icon: '▲', description: 'L2-L3 spinous processes' },
  L3_L4_spinous: { position: { x: 0, y: 0.75, z: -0.35 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Spinous', icon: '▲', description: 'L3-L4 spinous processes' },
  L4_L5_spinous: { position: { x: 0, y: 0.65, z: -0.35 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Spinous', icon: '▲', description: 'L4-L5 spinous processes' },
  L5_S1_spinous: { position: { x: 0, y: 0.55, z: -0.35 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Spinous', icon: '▲', description: 'L5-S1 spinous processes' },
};

// Joint group types for slider-based camera zooming
export type JointGroup = 
  | 'leftHip' 
  | 'rightHip' 
  | 'leftKnee' 
  | 'rightKnee' 
  | 'leftAnkle' 
  | 'rightAnkle'
  | 'leftShoulder' 
  | 'rightShoulder' 
  | 'leftScapula'
  | 'rightScapula'
  | 'leftElbow' 
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'pelvis'
  | 'spine'
  | 'neck'
  | null;

// Multi-angle camera presets for each joint group
// Each joint has 2-3 optimal viewing angles for clinical assessment
export interface JointZoomCamera {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  label: string;
}

export const JOINT_ZOOM_CAMERAS: Record<Exclude<JointGroup, null>, JointZoomCamera[]> = {
  leftHip: [
    { position: { x: 0, y: 0.5, z: 1.2 }, lookAt: { x: -0.2, y: 0.5, z: 0 }, label: 'Anterior' },
    { position: { x: -1.2, y: 0.5, z: 0 }, lookAt: { x: -0.2, y: 0.5, z: 0 }, label: 'Lateral' },
    { position: { x: -0.8, y: 0.5, z: -0.8 }, lookAt: { x: -0.2, y: 0.5, z: 0 }, label: 'Posterior-Lateral' },
  ],
  rightHip: [
    { position: { x: 0, y: 0.5, z: 1.2 }, lookAt: { x: 0.2, y: 0.5, z: 0 }, label: 'Anterior' },
    { position: { x: 1.2, y: 0.5, z: 0 }, lookAt: { x: 0.2, y: 0.5, z: 0 }, label: 'Lateral' },
    { position: { x: 0.8, y: 0.5, z: -0.8 }, lookAt: { x: 0.2, y: 0.5, z: 0 }, label: 'Posterior-Lateral' },
  ],
  leftKnee: [
    { position: { x: 0, y: 0, z: 1.0 }, lookAt: { x: -0.15, y: 0, z: 0 }, label: 'Anterior' },
    { position: { x: -1.0, y: 0, z: 0 }, lookAt: { x: -0.15, y: 0, z: 0 }, label: 'Lateral' },
    { position: { x: -0.5, y: 0.5, z: 0.8 }, lookAt: { x: -0.15, y: 0, z: 0 }, label: 'Patellar' },
  ],
  rightKnee: [
    { position: { x: 0, y: 0, z: 1.0 }, lookAt: { x: 0.15, y: 0, z: 0 }, label: 'Anterior' },
    { position: { x: 1.0, y: 0, z: 0 }, lookAt: { x: 0.15, y: 0, z: 0 }, label: 'Lateral' },
    { position: { x: 0.5, y: 0.5, z: 0.8 }, lookAt: { x: 0.15, y: 0, z: 0 }, label: 'Patellar' },
  ],
  leftAnkle: [
    { position: { x: 0, y: -0.5, z: 0.8 }, lookAt: { x: -0.12, y: -0.5, z: 0 }, label: 'Anterior' },
    { position: { x: -0.8, y: -0.5, z: 0 }, lookAt: { x: -0.12, y: -0.5, z: 0 }, label: 'Lateral' },
    { position: { x: 0.4, y: -0.5, z: 0.4 }, lookAt: { x: -0.12, y: -0.5, z: 0 }, label: 'Medial' },
  ],
  rightAnkle: [
    { position: { x: 0, y: -0.5, z: 0.8 }, lookAt: { x: 0.12, y: -0.5, z: 0 }, label: 'Anterior' },
    { position: { x: 0.8, y: -0.5, z: 0 }, lookAt: { x: 0.12, y: -0.5, z: 0 }, label: 'Lateral' },
    { position: { x: -0.4, y: -0.5, z: 0.4 }, lookAt: { x: 0.12, y: -0.5, z: 0 }, label: 'Medial' },
  ],
  leftShoulder: [
    { position: { x: -0.3, y: 1.65, z: 1.2 }, lookAt: { x: -0.5, y: 1.65, z: 0 }, label: 'Anterior' },
    { position: { x: -1.5, y: 1.65, z: 0 }, lookAt: { x: -0.5, y: 1.65, z: 0 }, label: 'Lateral' },
    { position: { x: -0.3, y: 1.65, z: -1.0 }, lookAt: { x: -0.5, y: 1.65, z: 0 }, label: 'Posterior' },
  ],
  rightShoulder: [
    { position: { x: 0.3, y: 1.65, z: 1.2 }, lookAt: { x: 0.5, y: 1.65, z: 0 }, label: 'Anterior' },
    { position: { x: 1.5, y: 1.65, z: 0 }, lookAt: { x: 0.5, y: 1.65, z: 0 }, label: 'Lateral' },
    { position: { x: 0.3, y: 1.65, z: -1.0 }, lookAt: { x: 0.5, y: 1.65, z: 0 }, label: 'Posterior' },
  ],
  leftScapula: [
    { position: { x: -0.5, y: 1.5, z: -1.2 }, lookAt: { x: -0.4, y: 1.5, z: 0 }, label: 'Posterior' },
    { position: { x: -1.4, y: 1.5, z: -0.3 }, lookAt: { x: -0.4, y: 1.5, z: 0 }, label: 'Lateral-Posterior' },
    { position: { x: -0.3, y: 2.2, z: -0.5 }, lookAt: { x: -0.4, y: 1.5, z: 0 }, label: 'Superior' },
  ],
  rightScapula: [
    { position: { x: 0.5, y: 1.5, z: -1.2 }, lookAt: { x: 0.4, y: 1.5, z: 0 }, label: 'Posterior' },
    { position: { x: 1.4, y: 1.5, z: -0.3 }, lookAt: { x: 0.4, y: 1.5, z: 0 }, label: 'Lateral-Posterior' },
    { position: { x: 0.3, y: 2.2, z: -0.5 }, lookAt: { x: 0.4, y: 1.5, z: 0 }, label: 'Superior' },
  ],
  leftElbow: [
    { position: { x: -0.5, y: 1.2, z: 1.0 }, lookAt: { x: -0.7, y: 1.2, z: 0 }, label: 'Anterior' },
    { position: { x: -1.5, y: 1.2, z: 0 }, lookAt: { x: -0.7, y: 1.2, z: 0 }, label: 'Lateral' },
    { position: { x: -0.5, y: 1.2, z: -0.8 }, lookAt: { x: -0.7, y: 1.2, z: 0 }, label: 'Posterior' },
  ],
  rightElbow: [
    { position: { x: 0.5, y: 1.2, z: 1.0 }, lookAt: { x: 0.7, y: 1.2, z: 0 }, label: 'Anterior' },
    { position: { x: 1.5, y: 1.2, z: 0 }, lookAt: { x: 0.7, y: 1.2, z: 0 }, label: 'Lateral' },
    { position: { x: 0.5, y: 1.2, z: -0.8 }, lookAt: { x: 0.7, y: 1.2, z: 0 }, label: 'Posterior' },
  ],
  leftWrist: [
    { position: { x: -0.5, y: 0.9, z: 0.8 }, lookAt: { x: -0.8, y: 0.9, z: 0 }, label: 'Dorsal' },
    { position: { x: -1.3, y: 0.9, z: 0 }, lookAt: { x: -0.8, y: 0.9, z: 0 }, label: 'Lateral' },
  ],
  rightWrist: [
    { position: { x: 0.5, y: 0.9, z: 0.8 }, lookAt: { x: 0.8, y: 0.9, z: 0 }, label: 'Dorsal' },
    { position: { x: 1.3, y: 0.9, z: 0 }, lookAt: { x: 0.8, y: 0.9, z: 0 }, label: 'Lateral' },
  ],
  pelvis: [
    { position: { x: 0, y: 0.6, z: 1.2 }, lookAt: { x: 0, y: 0.6, z: 0 }, label: 'Anterior' },
    { position: { x: 1.0, y: 0.6, z: 0.6 }, lookAt: { x: 0, y: 0.6, z: 0 }, label: 'Oblique' },
    { position: { x: 0, y: 0.6, z: -1.0 }, lookAt: { x: 0, y: 0.6, z: 0 }, label: 'Posterior' },
  ],
  spine: [
    { position: { x: 1.0, y: 1.0, z: 0 }, lookAt: { x: 0, y: 1.0, z: 0 }, label: 'Lateral' },
    { position: { x: 0, y: 1.0, z: -1.2 }, lookAt: { x: 0, y: 1.0, z: 0 }, label: 'Posterior' },
    { position: { x: 0.7, y: 1.0, z: -0.7 }, lookAt: { x: 0, y: 1.0, z: 0 }, label: 'Oblique' },
  ],
  neck: [
    { position: { x: 0, y: 1.9, z: 1.0 }, lookAt: { x: 0, y: 1.9, z: 0 }, label: 'Anterior' },
    { position: { x: 0.8, y: 1.9, z: 0 }, lookAt: { x: 0, y: 1.9, z: 0 }, label: 'Lateral' },
    { position: { x: 0, y: 1.9, z: -0.8 }, lookAt: { x: 0, y: 1.9, z: 0 }, label: 'Posterior' },
  ],
};

// Map joint group to display label
export const JOINT_GROUP_LABELS: Record<Exclude<JointGroup, null>, string> = {
  leftHip: 'Left Hip',
  rightHip: 'Right Hip',
  leftKnee: 'Left Knee',
  rightKnee: 'Right Knee',
  leftAnkle: 'Left Ankle',
  rightAnkle: 'Right Ankle',
  leftShoulder: 'Left Shoulder',
  rightShoulder: 'Right Shoulder',
  leftScapula: 'Left Scapula',
  rightScapula: 'Right Scapula',
  leftElbow: 'Left Elbow',
  rightElbow: 'Right Elbow',
  leftWrist: 'Left Wrist',
  rightWrist: 'Right Wrist',
  pelvis: 'Pelvis',
  spine: 'Spine',
  neck: 'Neck',
};

export const REGION_BONE_MAPPING: Record<AnatomicalRegion, string[]> = {
  full_body: [],
  lumbar_spine: ['Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M'],
  thoracic_spine: ['Chest_M', 'Spine1Part2_M'],
  cervical_spine: ['Neck_M', 'NeckPart1_M', 'NeckPart2_M'],
  left_shoulder: ['Shoulder_L', 'ShoulderPart1_L'],
  right_shoulder: ['Shoulder_R', 'ShoulderPart1_R'],
  left_hip: ['Hip_L', 'HipPart1_L'],
  right_hip: ['Hip_R', 'HipPart1_R'],
  pelvis: ['Root_M', 'RootPart1_M', 'RootPart2_M'],
  left_knee: ['Knee_L'],
  right_knee: ['Knee_R'],
  left_ankle: ['Ankle_L'],
  right_ankle: ['Ankle_R'],
  left_elbow: ['Elbow_L', 'ElbowPart1_L'],
  right_elbow: ['Elbow_R', 'ElbowPart1_R'],
  left_scapula: ['Scapula_L'],
  right_scapula: ['Scapula_R'],
  left_wrist: ['Wrist_L'],
  right_wrist: ['Wrist_R'],
  L1_L2: ['Spine1Part1_M'],
  L2_L3: ['Spine1_M'],
  L3_L4: ['RootPart2_M'],
  L4_L5: ['RootPart1_M'],
  L5_S1: ['Root_M'],
  L1_L2_facet: ['Spine1Part1_M'], L1_L2_pars: ['Spine1Part1_M'], L1_L2_disc: ['Spine1Part1_M'], L1_L2_body: ['Spine1Part1_M'], L1_L2_spinous: ['Spine1Part1_M'],
  L2_L3_facet: ['Spine1_M'], L2_L3_pars: ['Spine1_M'], L2_L3_disc: ['Spine1_M'], L2_L3_body: ['Spine1_M'], L2_L3_spinous: ['Spine1_M'],
  L3_L4_facet: ['RootPart2_M'], L3_L4_pars: ['RootPart2_M'], L3_L4_disc: ['RootPart2_M'], L3_L4_body: ['RootPart2_M'], L3_L4_spinous: ['RootPart2_M'],
  L4_L5_facet: ['RootPart1_M'], L4_L5_pars: ['RootPart1_M'], L4_L5_disc: ['RootPart1_M'], L4_L5_body: ['RootPart1_M'], L4_L5_spinous: ['RootPart1_M'],
  L5_S1_facet: ['Root_M'], L5_S1_pars: ['Root_M'], L5_S1_disc: ['Root_M'], L5_S1_body: ['Root_M'], L5_S1_spinous: ['Root_M'],
};

export const REGION_MESH_MAPPING = REGION_BONE_MAPPING;

// Bone-level mapping for individual spinal segments
// New model has simplified spine: Root_M, RootPart1/2_M (pelvis), Spine1_M, Spine1Part1/2_M, Chest_M
// Lumbar segments mapped to available bones
export const SEGMENT_BONE_MAPPING: Record<string, string[]> = {
  // Lumbar segments - Root_M is lowest, Spine1_M is higher lumbar
  'L5_S1': ['Root_M', 'RootPart1_M'],           // L5-S1 junction
  'L4_L5': ['RootPart1_M', 'RootPart2_M'],      // L4-L5 segment
  'L3_L4': ['RootPart2_M', 'Spine1_M'],         // L3-L4 segment
  'L2_L3': ['Spine1_M', 'Spine1Part1_M'],       // L2-L3 segment
  'L1_L2': ['Spine1Part1_M', 'Spine1Part2_M'],  // L1-L2 segment
  // Sub-structures use same bones as their parent segment
  'L5_S1_facet': ['Root_M', 'RootPart1_M'], 'L5_S1_pars': ['Root_M', 'RootPart1_M'], 'L5_S1_disc': ['Root_M', 'RootPart1_M'], 'L5_S1_body': ['Root_M', 'RootPart1_M'], 'L5_S1_spinous': ['Root_M', 'RootPart1_M'],
  'L4_L5_facet': ['RootPart1_M', 'RootPart2_M'], 'L4_L5_pars': ['RootPart1_M', 'RootPart2_M'], 'L4_L5_disc': ['RootPart1_M', 'RootPart2_M'], 'L4_L5_body': ['RootPart1_M', 'RootPart2_M'], 'L4_L5_spinous': ['RootPart1_M', 'RootPart2_M'],
  'L3_L4_facet': ['RootPart2_M', 'Spine1_M'], 'L3_L4_pars': ['RootPart2_M', 'Spine1_M'], 'L3_L4_disc': ['RootPart2_M', 'Spine1_M'], 'L3_L4_body': ['RootPart2_M', 'Spine1_M'], 'L3_L4_spinous': ['RootPart2_M', 'Spine1_M'],
  'L2_L3_facet': ['Spine1_M', 'Spine1Part1_M'], 'L2_L3_pars': ['Spine1_M', 'Spine1Part1_M'], 'L2_L3_disc': ['Spine1_M', 'Spine1Part1_M'], 'L2_L3_body': ['Spine1_M', 'Spine1Part1_M'], 'L2_L3_spinous': ['Spine1_M', 'Spine1Part1_M'],
  'L1_L2_facet': ['Spine1Part1_M', 'Spine1Part2_M'], 'L1_L2_pars': ['Spine1Part1_M', 'Spine1Part2_M'], 'L1_L2_disc': ['Spine1Part1_M', 'Spine1Part2_M'], 'L1_L2_body': ['Spine1Part1_M', 'Spine1Part2_M'], 'L1_L2_spinous': ['Spine1Part1_M', 'Spine1Part2_M'],
  // Lumbar spine region - all lumbar bones
  'lumbar_spine': ['Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M'],
};

// Helper to check if a region is a spinal segment (L1_L2, L4_L5, etc.) or sub-structure
export const isSpinalSegmentView = (region: string | null): boolean => {
  if (!region) return false;
  return /^L[1-5]_(L[1-5]|S1)(_facet|_pars|_disc|_body|_spinous)?$/.test(region);
};

// Get parent segment from sub-structure view
export const getParentSegment = (region: string): string | null => {
  const match = region.match(/^(L[1-5]_(L[1-5]|S1))(_facet|_pars|_disc|_body|_spinous)?$/);
  return match ? match[1] : null;
};

// Get sub-structure type from view
export const getSubStructureType = (region: string): SubStructure | null => {
  const match = region.match(/_(facet|pars|disc|body|spinous)$/);
  return match ? match[1] as SubStructure : null;
};

// Anatomical sub-structure overlay configurations
export interface SubStructureOverlay {
  type: SubStructure;
  geometry: 'cylinder' | 'box' | 'sphere' | 'capsule';
  color: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  opacity: number;
  label: string;
}

export const SUB_STRUCTURE_OVERLAYS: Record<SubStructure, SubStructureOverlay> = {
  disc: {
    type: 'disc',
    geometry: 'cylinder',
    color: 0x4fc3f7,
    position: { x: 0, y: 0.03, z: 0.02 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 0.08, y: 0.025, z: 0.08 },
    opacity: 0.85,
    label: 'Intervertebral Disc'
  },
  facet: {
    type: 'facet',
    geometry: 'sphere',
    color: 0xffb74d,
    position: { x: 0.03, y: 0.02, z: -0.04 },
    rotation: { x: 0.3, y: 0, z: 0 },
    scale: { x: 0.025, y: 0.015, z: 0.02 },
    opacity: 0.85,
    label: 'Facet Joint'
  },
  pars: {
    type: 'pars',
    geometry: 'cylinder',
    color: 0xef5350,
    position: { x: 0.025, y: 0.01, z: -0.025 },
    rotation: { x: 0.5, y: 0.3, z: 0 },
    scale: { x: 0.01, y: 0.03, z: 0.01 },
    opacity: 0.85,
    label: 'Pars Interarticularis'
  },
  body: {
    type: 'body',
    geometry: 'box',
    color: 0xe0e0e0,
    position: { x: 0, y: 0, z: 0.04 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 0.06, y: 0.05, z: 0.05 },
    opacity: 0.7,
    label: 'Vertebral Body'
  },
  spinous: {
    type: 'spinous',
    geometry: 'box',
    color: 0xbdbdbd,
    position: { x: 0, y: 0.01, z: -0.08 },
    rotation: { x: -0.3, y: 0, z: 0 },
    scale: { x: 0.015, y: 0.03, z: 0.04 },
    opacity: 0.85,
    label: 'Spinous Process'
  }
};

export type PainMarkerType = 'point' | 'area' | 'referred' | 'line' | 'paint';

export type SymptomType =
  | 'pain'
  | 'pins_needles'
  | 'numbness'
  | 'stiffness'
  | 'tightness'
  | 'weakness'
  | 'instability'
  | 'clicking'
  | 'locking'
  | 'swelling'
  | 'burning'
  | 'heaviness'
  | 'spasm'
  | 'radiating'
  | 'catching';

export const SYMPTOM_TYPES: Record<SymptomType, { label: string; color: number; hexColor: string; icon: string; description: string }> = {
  pain: { label: 'Pain', color: 0xff2222, hexColor: '#ff2222', icon: '🔴', description: 'Sharp, dull, aching pain' },
  pins_needles: { label: 'Pins & Needles', color: 0xffaa00, hexColor: '#ffaa00', icon: '⚡', description: 'Tingling / paresthesia' },
  numbness: { label: 'Numbness', color: 0x8888ff, hexColor: '#8888ff', icon: '🔵', description: 'Loss of sensation' },
  stiffness: { label: 'Stiffness', color: 0x44aaff, hexColor: '#44aaff', icon: '🧊', description: 'Restricted movement / rigidity' },
  tightness: { label: 'Tightness', color: 0xff8844, hexColor: '#ff8844', icon: '🔶', description: 'Muscular tension / pulling' },
  weakness: { label: 'Weakness', color: 0xaaaa44, hexColor: '#aaaa44', icon: '💤', description: 'Lack of strength / activation' },
  instability: { label: 'Instability', color: 0xff44ff, hexColor: '#ff44ff', icon: '⚠️', description: 'Giving way / unreliable joint' },
  clicking: { label: 'Clicking / Crepitus', color: 0x88ddaa, hexColor: '#88ddaa', icon: '🔊', description: 'Popping, grinding, snapping' },
  locking: { label: 'Locking', color: 0xdd4488, hexColor: '#dd4488', icon: '🔒', description: 'Joint gets stuck mid-range' },
  swelling: { label: 'Swelling', color: 0x44dddd, hexColor: '#44dddd', icon: '💧', description: 'Localized or diffuse swelling' },
  burning: { label: 'Burning', color: 0xff6600, hexColor: '#ff6600', icon: '🔥', description: 'Burning / hot sensation' },
  heaviness: { label: 'Heaviness', color: 0x8866aa, hexColor: '#8866aa', icon: '⬇️', description: 'Limb heaviness / fatigue' },
  spasm: { label: 'Spasm / Cramping', color: 0xee4444, hexColor: '#ee4444', icon: '💥', description: 'Involuntary muscle contraction' },
  radiating: { label: 'Radiating', color: 0x9933ff, hexColor: '#9933ff', icon: '↗️', description: 'Symptoms traveling along a path' },
  catching: { label: 'Catching', color: 0xddaa44, hexColor: '#ddaa44', icon: '⏸️', description: 'Brief catch during movement' },
};

export interface PainMarker {
  id: string;
  type: PainMarkerType;
  symptomType?: SymptomType;
  position: { x: number; y: number; z: number };
  nearestBone: string;
  anatomicalLabel: string;
  description?: string;
  subjectiveHistory?: string;
  radius?: number;
  referralTarget?: { x: number; y: number; z: number };
  referralTargetBone?: string;
  referralTargetLabel?: string;
  linePoints?: Array<{ x: number; y: number; z: number }>;
  paintPoints?: Array<{ x: number; y: number; z: number }>;
}

export interface RomMovement {
  id: string;
  label: string;
  normalRange: [number, number];
  unit: string;
}

export interface RomJointDefinition {
  id: string;
  label: string;
  boneName: string;
  movements: RomMovement[];
}

export interface RomMeasurement {
  jointId: string;
  jointLabel: string;
  movementId: string;
  movementLabel: string;
  measuredValue: number;
  normalRange: [number, number];
  unit: string;
  timestamp: number;
}

export const ROM_JOINT_DEFINITIONS: RomJointDefinition[] = [
  {
    id: 'left_shoulder', label: 'Left Shoulder', boneName: 'Shoulder_L',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 180], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 60], unit: '°' },
      { id: 'abduction', label: 'Abduction', normalRange: [0, 180], unit: '°' },
      { id: 'internal_rotation', label: 'Internal Rotation', normalRange: [0, 70], unit: '°' },
      { id: 'external_rotation', label: 'External Rotation', normalRange: [0, 90], unit: '°' },
    ]
  },
  {
    id: 'right_shoulder', label: 'Right Shoulder', boneName: 'Shoulder_R',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 180], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 60], unit: '°' },
      { id: 'abduction', label: 'Abduction', normalRange: [0, 180], unit: '°' },
      { id: 'internal_rotation', label: 'Internal Rotation', normalRange: [0, 70], unit: '°' },
      { id: 'external_rotation', label: 'External Rotation', normalRange: [0, 90], unit: '°' },
    ]
  },
  {
    id: 'left_elbow', label: 'Left Elbow', boneName: 'Elbow_L',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 150], unit: '°' },
      { id: 'extension', label: 'Extension (Hyperextension)', normalRange: [0, 10], unit: '°' },
      { id: 'pronation', label: 'Pronation', normalRange: [0, 80], unit: '°' },
      { id: 'supination', label: 'Supination', normalRange: [0, 80], unit: '°' },
    ]
  },
  {
    id: 'right_elbow', label: 'Right Elbow', boneName: 'Elbow_R',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 150], unit: '°' },
      { id: 'extension', label: 'Extension (Hyperextension)', normalRange: [0, 10], unit: '°' },
      { id: 'pronation', label: 'Pronation', normalRange: [0, 80], unit: '°' },
      { id: 'supination', label: 'Supination', normalRange: [0, 80], unit: '°' },
    ]
  },
  {
    id: 'left_wrist', label: 'Left Wrist', boneName: 'Wrist_L',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 80], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 70], unit: '°' },
      { id: 'radial_deviation', label: 'Radial Deviation', normalRange: [0, 20], unit: '°' },
      { id: 'ulnar_deviation', label: 'Ulnar Deviation', normalRange: [0, 30], unit: '°' },
    ]
  },
  {
    id: 'right_wrist', label: 'Right Wrist', boneName: 'Wrist_R',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 80], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 70], unit: '°' },
      { id: 'radial_deviation', label: 'Radial Deviation', normalRange: [0, 20], unit: '°' },
      { id: 'ulnar_deviation', label: 'Ulnar Deviation', normalRange: [0, 30], unit: '°' },
    ]
  },
  {
    id: 'left_hip', label: 'Left Hip', boneName: 'Hip_L',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 120], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 30], unit: '°' },
      { id: 'abduction', label: 'Abduction', normalRange: [0, 45], unit: '°' },
      { id: 'adduction', label: 'Adduction', normalRange: [0, 30], unit: '°' },
      { id: 'internal_rotation', label: 'Internal Rotation', normalRange: [0, 45], unit: '°' },
      { id: 'external_rotation', label: 'External Rotation', normalRange: [0, 45], unit: '°' },
    ]
  },
  {
    id: 'right_hip', label: 'Right Hip', boneName: 'Hip_R',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 120], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 30], unit: '°' },
      { id: 'abduction', label: 'Abduction', normalRange: [0, 45], unit: '°' },
      { id: 'adduction', label: 'Adduction', normalRange: [0, 30], unit: '°' },
      { id: 'internal_rotation', label: 'Internal Rotation', normalRange: [0, 45], unit: '°' },
      { id: 'external_rotation', label: 'External Rotation', normalRange: [0, 45], unit: '°' },
    ]
  },
  {
    id: 'left_knee', label: 'Left Knee', boneName: 'Knee_L',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 135], unit: '°' },
      { id: 'extension_deficit', label: 'Extension Lag / Contracture', normalRange: [0, 5], unit: '°' },
    ]
  },
  {
    id: 'right_knee', label: 'Right Knee', boneName: 'Knee_R',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 135], unit: '°' },
      { id: 'extension_deficit', label: 'Extension Lag / Contracture', normalRange: [0, 5], unit: '°' },
    ]
  },
  {
    id: 'left_ankle', label: 'Left Ankle', boneName: 'Ankle_L',
    movements: [
      { id: 'dorsiflexion', label: 'Dorsiflexion', normalRange: [0, 20], unit: '°' },
      { id: 'plantarflexion', label: 'Plantarflexion', normalRange: [0, 50], unit: '°' },
      { id: 'inversion', label: 'Inversion', normalRange: [0, 35], unit: '°' },
      { id: 'eversion', label: 'Eversion', normalRange: [0, 15], unit: '°' },
    ]
  },
  {
    id: 'right_ankle', label: 'Right Ankle', boneName: 'Ankle_R',
    movements: [
      { id: 'dorsiflexion', label: 'Dorsiflexion', normalRange: [0, 20], unit: '°' },
      { id: 'plantarflexion', label: 'Plantarflexion', normalRange: [0, 50], unit: '°' },
      { id: 'inversion', label: 'Inversion', normalRange: [0, 35], unit: '°' },
      { id: 'eversion', label: 'Eversion', normalRange: [0, 15], unit: '°' },
    ]
  },
  {
    id: 'cervical_spine', label: 'Cervical Spine', boneName: 'Neck_M',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 50], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 60], unit: '°' },
      { id: 'rotation_left', label: 'Rotation Left', normalRange: [0, 80], unit: '°' },
      { id: 'rotation_right', label: 'Rotation Right', normalRange: [0, 80], unit: '°' },
      { id: 'lateral_flexion_left', label: 'Lateral Flexion Left', normalRange: [0, 45], unit: '°' },
      { id: 'lateral_flexion_right', label: 'Lateral Flexion Right', normalRange: [0, 45], unit: '°' },
    ]
  },
  {
    id: 'lumbar_spine', label: 'Lumbar Spine', boneName: 'Spine1_M',
    movements: [
      { id: 'flexion', label: 'Flexion', normalRange: [0, 60], unit: '°' },
      { id: 'extension', label: 'Extension', normalRange: [0, 25], unit: '°' },
      { id: 'lateral_flexion_left', label: 'Lateral Flexion Left', normalRange: [0, 25], unit: '°' },
      { id: 'lateral_flexion_right', label: 'Lateral Flexion Right', normalRange: [0, 25], unit: '°' },
      { id: 'rotation_left', label: 'Rotation Left', normalRange: [0, 10], unit: '°' },
      { id: 'rotation_right', label: 'Rotation Right', normalRange: [0, 10], unit: '°' },
    ]
  },
];

const BONE_ANATOMICAL_LABELS: Record<string, string> = {
  'Head_M': 'Head',
  'Neck_M': 'Neck (Cervical)',
  'NeckPart1_M': 'Upper Cervical',
  'NeckPart2_M': 'Lower Cervical',
  'Chest_M': 'Thoracic Spine / Chest',
  'Spine1_M': 'Upper Lumbar',
  'Spine1Part1_M': 'Mid Lumbar',
  'Spine1Part2_M': 'Lower Thoracic',
  'Root_M': 'Pelvis / Sacrum',
  'RootPart1_M': 'Lower Lumbar',
  'RootPart2_M': 'Lumbosacral Junction',
  'Shoulder_L': 'Left Shoulder',
  'Shoulder_R': 'Right Shoulder',
  'ShoulderPart1_L': 'Left Upper Arm',
  'ShoulderPart1_R': 'Right Upper Arm',
  'ShoulderPart2_L': 'Left Mid Arm',
  'ShoulderPart2_R': 'Right Mid Arm',
  'Scapula_L': 'Left Scapula',
  'Scapula_R': 'Right Scapula',
  'Elbow_L': 'Left Elbow',
  'Elbow_R': 'Right Elbow',
  'Wrist_L': 'Left Wrist / Hand',
  'Wrist_R': 'Right Wrist / Hand',
  'Hip_L': 'Left Hip',
  'Hip_R': 'Right Hip',
  'HipPart1_L': 'Left Upper Thigh',
  'HipPart1_R': 'Right Upper Thigh',
  'Knee_L': 'Left Knee',
  'Knee_R': 'Right Knee',
  'Ankle_L': 'Left Ankle',
  'Ankle_R': 'Right Ankle',
  'Toes_L': 'Left Foot',
  'Toes_R': 'Right Foot',
};

export const ANATOMICAL_VIRTUAL_POINTS: Array<{ label: string; boneName: string; boneA: string; boneB: string; t: number; offsetX?: number; offsetY?: number; offsetZ?: number }> = [
  { label: 'C1-C2 (Upper Cervical)', boneName: 'virt_C1C2', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.5 },
  { label: 'C3-C4 (Mid Cervical)', boneName: 'virt_C3C4', boneA: 'NeckPart1_M', boneB: 'NeckPart2_M', t: 0.5 },
  { label: 'C5-C6 (Lower Cervical)', boneName: 'virt_C5C6', boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.3 },
  { label: 'C7-T1 (Cervicothoracic Junction)', boneName: 'virt_C7T1', boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.6 },
  { label: 'T1-T4 (Upper Thoracic)', boneName: 'virt_T1T4', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.2 },
  { label: 'T5-T8 (Mid Thoracic)', boneName: 'virt_T5T8', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.6 },
  { label: 'T9-T10 (Lower Thoracic)', boneName: 'virt_T9T10', boneA: 'Spine1Part2_M', boneB: 'Spine1Part1_M', t: 0.5 },
  { label: 'T11-T12 (Thoracolumbar Junction)', boneName: 'virt_T11T12', boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.3 },
  { label: 'L1-L2 (Upper Lumbar)', boneName: 'virt_L1L2', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.2 },
  { label: 'L3 (Mid Lumbar)', boneName: 'virt_L3', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.5 },
  { label: 'L4-L5 (Lower Lumbar)', boneName: 'virt_L4L5', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.3 },
  { label: 'L5-S1 (Lumbosacral Junction)', boneName: 'virt_L5S1', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.4 },
  { label: 'Sacrum', boneName: 'virt_sacrum', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.7 },
  { label: 'Coccyx', boneName: 'virt_coccyx', boneA: 'Root_M', boneB: 'Root_M', t: 1.0 },
  { label: 'Left Upper Ribs (1-4)', boneName: 'virt_ribs_upper_L', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: -0.15 },
  { label: 'Right Upper Ribs (1-4)', boneName: 'virt_ribs_upper_R', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: 0.15 },
  { label: 'Left Mid Ribs (5-8)', boneName: 'virt_ribs_mid_L', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.5, offsetX: -0.18 },
  { label: 'Right Mid Ribs (5-8)', boneName: 'virt_ribs_mid_R', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.5, offsetX: 0.18 },
  { label: 'Left Lower Ribs (9-12)', boneName: 'virt_ribs_lower_L', boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.5, offsetX: -0.15 },
  { label: 'Right Lower Ribs (9-12)', boneName: 'virt_ribs_lower_R', boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.5, offsetX: 0.15 },
  { label: 'Sternum', boneName: 'virt_sternum', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: 0 },
  { label: 'Left SI Joint', boneName: 'virt_SI_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.3 },
  { label: 'Right SI Joint', boneName: 'virt_SI_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.3 },
  { label: 'Left Greater Trochanter', boneName: 'virt_GT_L', boneA: 'Hip_L', boneB: 'HipPart1_L', t: 0.2 },
  { label: 'Right Greater Trochanter', boneName: 'virt_GT_R', boneA: 'Hip_R', boneB: 'HipPart1_R', t: 0.2 },
  { label: 'Left IT Band', boneName: 'virt_ITB_L', boneA: 'HipPart1_L', boneB: 'Knee_L', t: 0.5, offsetX: -0.05 },
  { label: 'Right IT Band', boneName: 'virt_ITB_R', boneA: 'HipPart1_R', boneB: 'Knee_R', t: 0.5, offsetX: 0.05 },
  { label: 'Left Calf / Gastrocnemius', boneName: 'virt_calf_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.4 },
  { label: 'Right Calf / Gastrocnemius', boneName: 'virt_calf_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.4 },
  { label: 'Left Achilles Tendon', boneName: 'virt_achilles_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.85 },
  { label: 'Right Achilles Tendon', boneName: 'virt_achilles_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.85 },
  { label: 'Left Forearm', boneName: 'virt_forearm_L', boneA: 'Elbow_L', boneB: 'Wrist_L', t: 0.5 },
  { label: 'Right Forearm', boneName: 'virt_forearm_R', boneA: 'Elbow_R', boneB: 'Wrist_R', t: 0.5 },
  { label: 'Left Biceps', boneName: 'virt_biceps_L', boneA: 'Shoulder_L', boneB: 'Elbow_L', t: 0.5 },
  { label: 'Right Biceps', boneName: 'virt_biceps_R', boneA: 'Shoulder_R', boneB: 'Elbow_R', t: 0.5 },
  { label: 'Left ASIS (Anterior Superior Iliac Spine)', boneName: 'virt_ASIS_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.15, offsetZ: 0.12 },
  { label: 'Right ASIS (Anterior Superior Iliac Spine)', boneName: 'virt_ASIS_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.15, offsetZ: 0.12 },
  { label: 'Left PSIS (Posterior Superior Iliac Spine)', boneName: 'virt_PSIS_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.15, offsetZ: -0.1 },
  { label: 'Right PSIS (Posterior Superior Iliac Spine)', boneName: 'virt_PSIS_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.15, offsetZ: -0.1 },
  { label: 'Left Ischial Tuberosity', boneName: 'virt_ischial_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.4, offsetY: -0.08, offsetZ: -0.05 },
  { label: 'Right Ischial Tuberosity', boneName: 'virt_ischial_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.4, offsetY: -0.08, offsetZ: -0.05 },
  { label: 'Pubic Symphysis', boneName: 'virt_pubic_symphysis', boneA: 'Hip_L', boneB: 'Hip_R', t: 0.5, offsetZ: 0.15, offsetY: -0.05 },
  { label: 'Left Iliac Crest', boneName: 'virt_iliac_crest_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.1, offsetY: 0.03, offsetX: -0.08 },
  { label: 'Right Iliac Crest', boneName: 'virt_iliac_crest_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.1, offsetY: 0.03, offsetX: 0.08 },
  { label: 'Left Acetabulum (Hip Socket)', boneName: 'virt_acetabulum_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.5 },
  { label: 'Right Acetabulum (Hip Socket)', boneName: 'virt_acetabulum_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.5 },
  { label: 'Left Lesser Trochanter', boneName: 'virt_lesser_troch_L', boneA: 'Hip_L', boneB: 'HipPart1_L', t: 0.15, offsetZ: -0.03, offsetX: 0.02 },
  { label: 'Right Lesser Trochanter', boneName: 'virt_lesser_troch_R', boneA: 'Hip_R', boneB: 'HipPart1_R', t: 0.15, offsetZ: -0.03, offsetX: -0.02 },
  { label: 'Left Tibial Tuberosity', boneName: 'virt_tib_tub_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.08, offsetZ: 0.04 },
  { label: 'Right Tibial Tuberosity', boneName: 'virt_tib_tub_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.08, offsetZ: 0.04 },
  { label: 'Left Fibular Head', boneName: 'virt_fib_head_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.06, offsetX: -0.04 },
  { label: 'Right Fibular Head', boneName: 'virt_fib_head_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.06, offsetX: 0.04 },
  { label: 'Left Patella', boneName: 'virt_patella_L', boneA: 'HipPart2_L', boneB: 'Knee_L', t: 0.95, offsetZ: 0.06 },
  { label: 'Right Patella', boneName: 'virt_patella_R', boneA: 'HipPart2_R', boneB: 'Knee_R', t: 0.95, offsetZ: 0.06 },
  { label: 'Left Medial Knee Joint Line', boneName: 'virt_med_knee_L', boneA: 'HipPart2_L', boneB: 'Knee_L', t: 0.98, offsetX: 0.03 },
  { label: 'Right Medial Knee Joint Line', boneName: 'virt_med_knee_R', boneA: 'HipPart2_R', boneB: 'Knee_R', t: 0.98, offsetX: -0.03 },
  { label: 'Left Lateral Knee Joint Line', boneName: 'virt_lat_knee_L', boneA: 'HipPart2_L', boneB: 'Knee_L', t: 0.98, offsetX: -0.03 },
  { label: 'Right Lateral Knee Joint Line', boneName: 'virt_lat_knee_R', boneA: 'HipPart2_R', boneB: 'Knee_R', t: 0.98, offsetX: 0.03 },
  { label: 'Left Popliteal Fossa', boneName: 'virt_popliteal_L', boneA: 'HipPart2_L', boneB: 'Knee_L', t: 0.98, offsetZ: -0.05 },
  { label: 'Right Popliteal Fossa', boneName: 'virt_popliteal_R', boneA: 'HipPart2_R', boneB: 'Knee_R', t: 0.98, offsetZ: -0.05 },
  { label: 'Left Medial Malleolus', boneName: 'virt_med_mall_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.05, offsetX: 0.03 },
  { label: 'Right Medial Malleolus', boneName: 'virt_med_mall_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.05, offsetX: -0.03 },
  { label: 'Left Lateral Malleolus', boneName: 'virt_lat_mall_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.05, offsetX: -0.03 },
  { label: 'Right Lateral Malleolus', boneName: 'virt_lat_mall_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.05, offsetX: 0.03 },
  { label: 'Left Calcaneus (Heel)', boneName: 'virt_calcaneus_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.15, offsetZ: -0.06 },
  { label: 'Right Calcaneus (Heel)', boneName: 'virt_calcaneus_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.15, offsetZ: -0.06 },
  { label: 'Left Navicular', boneName: 'virt_navicular_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.3, offsetX: 0.02, offsetZ: 0.02 },
  { label: 'Right Navicular', boneName: 'virt_navicular_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.3, offsetX: -0.02, offsetZ: 0.02 },
  { label: 'Left 1st Metatarsal Head', boneName: 'virt_1st_met_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3, offsetX: 0.03 },
  { label: 'Right 1st Metatarsal Head', boneName: 'virt_1st_met_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3, offsetX: -0.03 },
  { label: 'Left 5th Metatarsal Base', boneName: 'virt_5th_met_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.5, offsetX: -0.04 },
  { label: 'Right 5th Metatarsal Base', boneName: 'virt_5th_met_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.5, offsetX: 0.04 },
  { label: 'Left Plantar Fascia', boneName: 'virt_plantar_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.5, offsetY: -0.03 },
  { label: 'Right Plantar Fascia', boneName: 'virt_plantar_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.5, offsetY: -0.03 },
  { label: 'Left Acromioclavicular Joint', boneName: 'virt_AC_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.5, offsetY: 0.04 },
  { label: 'Right Acromioclavicular Joint', boneName: 'virt_AC_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.5, offsetY: 0.04 },
  { label: 'Left Coracoid Process', boneName: 'virt_coracoid_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.4, offsetZ: 0.06 },
  { label: 'Right Coracoid Process', boneName: 'virt_coracoid_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.4, offsetZ: 0.06 },
  { label: 'Left Glenohumeral Joint', boneName: 'virt_GH_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.8 },
  { label: 'Right Glenohumeral Joint', boneName: 'virt_GH_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.8 },
  { label: 'Left Subacromial Space', boneName: 'virt_subacr_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.6, offsetY: 0.03 },
  { label: 'Right Subacromial Space', boneName: 'virt_subacr_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.6, offsetY: 0.03 },
  { label: 'Left Bicipital Groove', boneName: 'virt_bicip_groove_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.1, offsetZ: 0.04 },
  { label: 'Right Bicipital Groove', boneName: 'virt_bicip_groove_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.1, offsetZ: 0.04 },
  { label: 'Left Deltoid Tuberosity', boneName: 'virt_deltoid_tub_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.4, offsetX: -0.03 },
  { label: 'Right Deltoid Tuberosity', boneName: 'virt_deltoid_tub_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.4, offsetX: 0.03 },
  { label: 'Left Lateral Epicondyle', boneName: 'virt_lat_epic_L', boneA: 'ShoulderPart2_L', boneB: 'Elbow_L', t: 0.9, offsetX: -0.03 },
  { label: 'Right Lateral Epicondyle', boneName: 'virt_lat_epic_R', boneA: 'ShoulderPart2_R', boneB: 'Elbow_R', t: 0.9, offsetX: 0.03 },
  { label: 'Left Medial Epicondyle', boneName: 'virt_med_epic_L', boneA: 'ShoulderPart2_L', boneB: 'Elbow_L', t: 0.9, offsetX: 0.03 },
  { label: 'Right Medial Epicondyle', boneName: 'virt_med_epic_R', boneA: 'ShoulderPart2_R', boneB: 'Elbow_R', t: 0.9, offsetX: -0.03 },
  { label: 'Left Olecranon', boneName: 'virt_olecranon_L', boneA: 'Elbow_L', boneB: 'ElbowPart1_L', t: 0.05, offsetZ: -0.04 },
  { label: 'Right Olecranon', boneName: 'virt_olecranon_R', boneA: 'Elbow_R', boneB: 'ElbowPart1_R', t: 0.05, offsetZ: -0.04 },
  { label: 'Left Radial Head', boneName: 'virt_radial_head_L', boneA: 'Elbow_L', boneB: 'ElbowPart1_L', t: 0.05, offsetX: -0.03, offsetZ: 0.02 },
  { label: 'Right Radial Head', boneName: 'virt_radial_head_R', boneA: 'Elbow_R', boneB: 'ElbowPart1_R', t: 0.05, offsetX: 0.03, offsetZ: 0.02 },
  { label: 'Left Radial Styloid', boneName: 'virt_rad_styloid_L', boneA: 'ElbowPart2_L', boneB: 'Wrist_L', t: 0.9, offsetX: -0.02 },
  { label: 'Right Radial Styloid', boneName: 'virt_rad_styloid_R', boneA: 'ElbowPart2_R', boneB: 'Wrist_R', t: 0.9, offsetX: 0.02 },
  { label: 'Left Ulnar Styloid', boneName: 'virt_uln_styloid_L', boneA: 'ElbowPart2_L', boneB: 'Wrist_L', t: 0.9, offsetX: 0.02 },
  { label: 'Right Ulnar Styloid', boneName: 'virt_uln_styloid_R', boneA: 'ElbowPart2_R', boneB: 'Wrist_R', t: 0.9, offsetX: -0.02 },
  { label: 'Left Carpal Tunnel', boneName: 'virt_carpal_tunnel_L', boneA: 'Wrist_L', boneB: 'MiddleFinger1_L', t: 0.2, offsetZ: 0.02 },
  { label: 'Right Carpal Tunnel', boneName: 'virt_carpal_tunnel_R', boneA: 'Wrist_R', boneB: 'MiddleFinger1_R', t: 0.2, offsetZ: 0.02 },
  { label: 'L1-L2 Disc', boneName: 'virt_L1L2_disc', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.2, offsetZ: 0.04 },
  { label: 'L2-L3 Disc', boneName: 'virt_L2L3_disc', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.5, offsetZ: 0.04 },
  { label: 'L3-L4 Disc', boneName: 'virt_L3L4_disc', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.2, offsetZ: 0.04 },
  { label: 'L4-L5 Disc', boneName: 'virt_L4L5_disc', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.5, offsetZ: 0.04 },
  { label: 'L5-S1 Disc', boneName: 'virt_L5S1_disc', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.4, offsetZ: 0.04 },
  { label: 'L1-L2 Facet Joint (Left)', boneName: 'virt_L1L2_facet_L', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.2, offsetZ: -0.04, offsetX: -0.03 },
  { label: 'L1-L2 Facet Joint (Right)', boneName: 'virt_L1L2_facet_R', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.2, offsetZ: -0.04, offsetX: 0.03 },
  { label: 'L2-L3 Facet Joint (Left)', boneName: 'virt_L2L3_facet_L', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.5, offsetZ: -0.04, offsetX: -0.03 },
  { label: 'L2-L3 Facet Joint (Right)', boneName: 'virt_L2L3_facet_R', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.5, offsetZ: -0.04, offsetX: 0.03 },
  { label: 'L3-L4 Facet Joint (Left)', boneName: 'virt_L3L4_facet_L', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.2, offsetZ: -0.04, offsetX: -0.03 },
  { label: 'L3-L4 Facet Joint (Right)', boneName: 'virt_L3L4_facet_R', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.2, offsetZ: -0.04, offsetX: 0.03 },
  { label: 'L4-L5 Facet Joint (Left)', boneName: 'virt_L4L5_facet_L', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.5, offsetZ: -0.04, offsetX: -0.03 },
  { label: 'L4-L5 Facet Joint (Right)', boneName: 'virt_L4L5_facet_R', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.5, offsetZ: -0.04, offsetX: 0.03 },
  { label: 'L5-S1 Facet Joint (Left)', boneName: 'virt_L5S1_facet_L', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.4, offsetZ: -0.04, offsetX: -0.03 },
  { label: 'L5-S1 Facet Joint (Right)', boneName: 'virt_L5S1_facet_R', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.4, offsetZ: -0.04, offsetX: 0.03 },
  { label: 'TMJ (Left Temporomandibular Joint)', boneName: 'virt_TMJ_L', boneA: 'Head_M', boneB: 'Neck_M', t: 0.1, offsetX: -0.06, offsetZ: 0.04 },
  { label: 'TMJ (Right Temporomandibular Joint)', boneName: 'virt_TMJ_R', boneA: 'Head_M', boneB: 'Neck_M', t: 0.1, offsetX: 0.06, offsetZ: 0.04 },
  { label: 'Occiput (Base of Skull)', boneName: 'virt_occiput', boneA: 'Head_M', boneB: 'Neck_M', t: 0.15, offsetZ: -0.06 },
  { label: 'Mastoid Process (Left)', boneName: 'virt_mastoid_L', boneA: 'Head_M', boneB: 'Neck_M', t: 0.15, offsetX: -0.06 },
  { label: 'Mastoid Process (Right)', boneName: 'virt_mastoid_R', boneA: 'Head_M', boneB: 'Neck_M', t: 0.15, offsetX: 0.06 },
  { label: 'Hyoid Bone', boneName: 'virt_hyoid', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.6, offsetZ: 0.06 },
  { label: 'C7 Spinous Process', boneName: 'virt_C7_SP', boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.5, offsetZ: -0.06 },
  { label: 'Left Costochondral Junction (Ribs 1-3)', boneName: 'virt_costo_upper_L', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.2, offsetX: -0.08, offsetZ: 0.1 },
  { label: 'Right Costochondral Junction (Ribs 1-3)', boneName: 'virt_costo_upper_R', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.2, offsetX: 0.08, offsetZ: 0.1 },
  { label: 'Left Costovertebral Joint (T1-T6)', boneName: 'virt_costov_upper_L', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: -0.06, offsetZ: -0.04 },
  { label: 'Right Costovertebral Joint (T1-T6)', boneName: 'virt_costov_upper_R', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: 0.06, offsetZ: -0.04 },
  { label: 'Left Costovertebral Joint (T7-T12)', boneName: 'virt_costov_lower_L', boneA: 'Spine1Part2_M', boneB: 'Spine1_M', t: 0.5, offsetX: -0.06, offsetZ: -0.04 },
  { label: 'Right Costovertebral Joint (T7-T12)', boneName: 'virt_costov_lower_R', boneA: 'Spine1Part2_M', boneB: 'Spine1_M', t: 0.5, offsetX: 0.06, offsetZ: -0.04 },
  { label: 'Xiphoid Process', boneName: 'virt_xiphoid', boneA: 'Spine1Part2_M', boneB: 'Spine1Part1_M', t: 0.3, offsetZ: 0.12 },
  { label: 'Manubrium', boneName: 'virt_manubrium', boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.15, offsetZ: 0.1 },
  { label: 'Left Sternoclavicular Joint', boneName: 'virt_SC_L', boneA: 'Chest_M', boneB: 'Scapula_L', t: 0.15, offsetZ: 0.08 },
  { label: 'Right Sternoclavicular Joint', boneName: 'virt_SC_R', boneA: 'Chest_M', boneB: 'Scapula_R', t: 0.15, offsetZ: 0.08 },
  { label: 'Left Infrascapular Region', boneName: 'virt_infrascap_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.2, offsetZ: -0.08, offsetY: -0.08 },
  { label: 'Right Infrascapular Region', boneName: 'virt_infrascap_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.2, offsetZ: -0.08, offsetY: -0.08 },
  { label: 'Left Hamstring Origin', boneName: 'virt_hamstring_origin_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.45, offsetZ: -0.08 },
  { label: 'Right Hamstring Origin', boneName: 'virt_hamstring_origin_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.45, offsetZ: -0.08 },
  { label: 'Left Adductor Origin', boneName: 'virt_adductor_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.45, offsetX: 0.03, offsetZ: 0.03 },
  { label: 'Right Adductor Origin', boneName: 'virt_adductor_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.45, offsetX: -0.03, offsetZ: 0.03 },
  { label: 'Left Mid-Thigh (Quadriceps)', boneName: 'virt_quad_L', boneA: 'HipPart1_L', boneB: 'Knee_L', t: 0.4, offsetZ: 0.04 },
  { label: 'Right Mid-Thigh (Quadriceps)', boneName: 'virt_quad_R', boneA: 'HipPart1_R', boneB: 'Knee_R', t: 0.4, offsetZ: 0.04 },
  { label: 'Left Tibial Shaft (Mid)', boneName: 'virt_tib_shaft_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.5, offsetZ: 0.03 },
  { label: 'Right Tibial Shaft (Mid)', boneName: 'virt_tib_shaft_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.5, offsetZ: 0.03 },
  { label: 'Left Anterior Tibialis', boneName: 'virt_ant_tib_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.3, offsetX: -0.02, offsetZ: 0.03 },
  { label: 'Right Anterior Tibialis', boneName: 'virt_ant_tib_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.3, offsetX: 0.02, offsetZ: 0.03 },
  { label: 'Left Peroneal Region', boneName: 'virt_peroneal_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.4, offsetX: -0.04 },
  { label: 'Right Peroneal Region', boneName: 'virt_peroneal_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.4, offsetX: 0.04 },
];

export interface CompensatingJointInfo {
  joint: string;
  loadIncrease: number;
}

export interface AnimationConstraint {
  joint: string;
  movement: string;
  maxROM: number;
  normalROM: number;
}

// Convert snake_case joint names (constraint system) to camelCase (animation system)
// Animation uses: leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle, leftShoulder, rightShoulder, pelvis, spine
const snakeToCamelJoint = (snake: string): string => {
  const mappings: Record<string, string> = {
    'left_hip': 'leftHip',
    'right_hip': 'rightHip',
    'left_knee': 'leftKnee',
    'right_knee': 'rightKnee',
    'left_ankle': 'leftAnkle',
    'right_ankle': 'rightAnkle',
    'left_shoulder': 'leftShoulder',
    'right_shoulder': 'rightShoulder',
    'left_elbow': 'leftElbow',
    'right_elbow': 'rightElbow',
    'lumbar_spine': 'spine',
    'thoracic_spine': 'spine',
    'cervical_spine': 'neck',
    'pelvis': 'pelvis',
    'neck': 'neck',
  };
  return mappings[snake] || snake;
};

// Convert constraint system movement names to animation property names
// Animation uses: flexion, extension, abduction, internalRotation, tilt, obliquity, rotation, thoracicKyphosis, lumbarLordosis, thoracicRotation, cervicalLordosis
const snakeToCamelMovement = (joint: string, movement: string): string => {
  // Spine-specific mappings - animation uses different property names for spinal movements
  if (joint === 'lumbar_spine') {
    if (movement === 'flexion' || movement === 'extension') return 'lumbarLordosis';
    if (movement === 'rotation') return 'thoracicRotation'; // Lumbar doesn't rotate much, maps to thoracic
    if (movement === 'lateral_flexion') return 'scoliosis';
  }
  if (joint === 'thoracic_spine') {
    if (movement === 'flexion' || movement === 'extension') return 'thoracicKyphosis';
    if (movement === 'rotation') return 'thoracicRotation';
    if (movement === 'lateral_flexion') return 'scoliosis';
  }
  if (joint === 'cervical_spine') {
    if (movement === 'flexion') return 'flexion';
    if (movement === 'extension') return 'extension';
    if (movement === 'rotation') return 'rotation';
    if (movement === 'lateral_flexion') return 'lateralFlexion';
  }
  // Pelvis-specific mappings
  if (joint === 'pelvis') {
    if (movement === 'anterior_tilt' || movement === 'posterior_tilt') return 'tilt';
    if (movement === 'obliquity') return 'obliquity';
    if (movement === 'rotation') return 'rotation';
  }
  // General movement mappings (hip, knee, ankle, shoulder)
  const movementMappings: Record<string, string> = {
    'internal_rotation': 'internalRotation',
    'external_rotation': 'externalRotation',
    'lateral_flexion': 'lateralFlexion',
  };
  return movementMappings[movement] || movement;
};

// Animation compensation mapping - when a joint is constrained, adjacent joints compensate
// Keys use snake_case (matching constraint system), values use BONE_MAPPING keys (camelCase.property)
// This bridges the constraint system (snake_case) to the animation system (camelCase)
const ANIMATION_COMPENSATION_MAPPING: Record<string, Array<{ targetJoint: string; targetMovement: string; ratio: number }>> = {
  // Lumbar spine restrictions - targets use BONE_MAPPING format (pelvis.tilt, leftHip.flexion)
  'lumbar_spine:flexion': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.4 },
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: 0.3 },
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'lumbar_spine:extension': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.35 },
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: -0.25 },
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: -0.25 },
  ],
  'lumbar_spine:rotation': [
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.5 },
  ],
  // Hip restrictions
  'left_hip:flexion': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.4 },
    { targetJoint: 'leftKnee', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'right_hip:flexion': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.4 },
    { targetJoint: 'rightKnee', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'left_hip:internal_rotation': [
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.35 },
    { targetJoint: 'leftKnee', targetMovement: 'varus', ratio: 0.25 },
  ],
  'right_hip:internal_rotation': [
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.35 },
    { targetJoint: 'rightKnee', targetMovement: 'varus', ratio: 0.25 },
  ],
  // Knee restrictions
  'left_knee:flexion': [
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: 0.4 },
    { targetJoint: 'leftAnkle', targetMovement: 'dorsiflexion', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.2 },
  ],
  'right_knee:flexion': [
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: 0.4 },
    { targetJoint: 'rightAnkle', targetMovement: 'dorsiflexion', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.2 },
  ],
  // Ankle restrictions
  'left_ankle:dorsiflexion': [
    { targetJoint: 'leftKnee', targetMovement: 'flexion', ratio: 0.35 },
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.2 },
  ],
  'right_ankle:dorsiflexion': [
    { targetJoint: 'rightKnee', targetMovement: 'flexion', ratio: 0.35 },
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: 0.2 },
  ],
  // Shoulder restrictions
  'left_shoulder:flexion': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.3 },
  ],
  'right_shoulder:flexion': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.3 },
  ],
  'spine:flexion': [
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: 0.3 },
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'spine:lateralFlexion': [
    { targetJoint: 'pelvis', targetMovement: 'obliquity', ratio: 0.4 },
  ],
  'spine:thoracicRotation': [
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.4 },
  ],
  'spine:lumbarRotation': [
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.5 },
  ],
  'neck:flexion': [
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: 0.3 },
  ],
  'neck:extension': [
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.2 },
  ],
  'neck:lateralFlexion': [
    { targetJoint: 'spine', targetMovement: 'lateralFlexion', ratio: 0.3 },
  ],
  'pelvis:obliquity': [
    { targetJoint: 'spine', targetMovement: 'lateralFlexion', ratio: 0.4 },
  ],
};

export interface MuscleVisibilityConfig {
  enabled: boolean;
  quadriceps: boolean;
  hamstrings: boolean;
  adductors: boolean;
  calf: boolean;
  shin: boolean;
  lateral: boolean;
  other: boolean;
  showLabels: boolean;
}

export interface MuscleLayerVisibility {
  enabled: boolean;
  layers: { [layerId: string]: boolean };
  opacity: number;
}

interface PureThreeGLBViewerProps {
  modelPath?: string;
  modelConfig?: ModelConfig;
  className?: string;
  animationState?: AnimationState;
  onAnimationFrame?: (jointValues: { [key: string]: { [prop: string]: number } }) => void;
  jointLimits?: JointLimits;
  biomechanicsData?: BiomechanicsVisualizationData;
  muscleActivation?: MuscleActivationLevels;
  muscleVisibility?: MuscleVisibilityConfig;
  muscleLayerVisibility?: MuscleLayerVisibility;
  muscleLayerConfigs?: MuscleLayerConfig[];
  cameraAngle?: CameraAngle;
  disableControls?: boolean;
  showLabel?: boolean;
  zoomToRegion?: AnatomicalRegion | null;
  compensatingJoints?: CompensatingJointInfo[];
  animationConstraints?: AnimationConstraint[];
  livePose?: Skeleton3DPose | null;
  fixedCameraPosition?: { x: number; y: number; z: number };
  fixedCameraLookAt?: { x: number; y: number; z: number };
  showLoadingSpinner?: boolean;
  showMuscles?: boolean;
  individualMuscleVisibility?: { [groupId: string]: boolean };
  onMuscleGroupsReady?: (groupIds: string[]) => void;
  muscleStates?: MuscleStatesMap;
  highlightRegions?: Array<{
    region: AnatomicalRegion;
    color: number;
    intensity: number;
  }>;
  highlightBoneNames?: Array<{
    boneName: string;
    color: number;
    intensity: number;
    glowSize?: number;
  }>;
  painMarkers?: PainMarker[];
  onPainMarkerAdd?: (marker: PainMarker) => void;
  onPainMarkerMove?: (id: string, position: { x: number; y: number; z: number }, nearestBone: string, anatomicalLabel: string) => void;
  onPainMarkerRemove?: (id: string) => void;
  onPainMarkerUpdate?: (id: string, updates: Partial<PainMarker>) => void;
  onPainMarkerSelect?: (id: string) => void;
  enablePainMarkers?: boolean;
  activePainMarkerType?: PainMarkerType;
  enableRomMode?: boolean;
  onRomJointSelect?: (jointDef: RomJointDefinition) => void;
  selectedRomJointId?: string | null;
  enablePoseMode?: boolean;
  onModelConfigChange?: (path: string, value: number) => void;
  enableZoomTool?: boolean;
  onLandmarkSelect?: (landmark: { label: string; boneName: string; position: { x: number; y: number; z: number } }) => void;
  forceOverlay?: { id: string; label: string; boneName: string; compression: number; tension: number; shear: number; totalForce: number; status: 'low' | 'moderate' | 'high' | 'very_high'; clinical: string }[] | null;
  bodyWeightKg?: number;
  selectedForceJoint?: string | null;
  onForceJointSelect?: (joint: string) => void;
  enableMuscleInteraction?: boolean;
  onMuscleGroupClick?: (groupId: string, screenX: number, screenY: number) => void;
  highlightMuscleGroups?: string[];
}

const FORCE_JOINT_TO_BONE: Record<string, string> = {
  cervical: 'Neck_M',
  lumbar: 'RootPart1_M',
  leftHip: 'Hip_L',
  rightHip: 'Hip_R',
  leftKnee: 'Knee_L',
  rightKnee: 'Knee_R',
  leftAnkle: 'Ankle_L',
  rightAnkle: 'Ankle_R',
  leftShoulder: 'Shoulder_L',
  rightShoulder: 'Shoulder_R',
  leftElbow: 'Elbow_L',
  rightElbow: 'Elbow_R',
};

const BONE_MAPPING: { [configKey: string]: { boneName: string; axis: 'x' | 'y' | 'z'; scale: number; isPosition?: boolean }[] } = {
  // === HIP / FEMUR ===
  // Empirically verified with Euler angle addition (matching viewer behavior):
  // Hip_L: Y-30=OUTWARD, Y+30=INWARD; Hip_R: Y+30=OUTWARD, Y-30=INWARD (mirrored initial orientations)
  // Hip flexion = leg forward = positive Z for both sides
  'leftHip.flexion': [{ boneName: 'Hip_L', axis: 'z', scale: 1 }],
  'leftHip.extension': [{ boneName: 'Hip_L', axis: 'z', scale: -1 }],
  'leftHip.abduction': [{ boneName: 'Hip_L', axis: 'y', scale: -1 }],
  'leftHip.internalRotation': [{ boneName: 'Hip_L', axis: 'x', scale: 1 }],
  'leftHip.anteversion': [{ boneName: 'Hip_L', axis: 'x', scale: 1 }],
  'leftHip.neckShaftAngle': [{ boneName: 'Hip_L', axis: 'y', scale: -0.5 }],
  'rightHip.flexion': [{ boneName: 'Hip_R', axis: 'z', scale: 1 }],
  'rightHip.extension': [{ boneName: 'Hip_R', axis: 'z', scale: -1 }],
  'rightHip.abduction': [{ boneName: 'Hip_R', axis: 'y', scale: 1 }],
  'rightHip.internalRotation': [{ boneName: 'Hip_R', axis: 'x', scale: -1 }],
  'rightHip.anteversion': [{ boneName: 'Hip_R', axis: 'x', scale: -1 }],
  'rightHip.neckShaftAngle': [{ boneName: 'Hip_R', axis: 'y', scale: -0.5 }],
  'leftHip.adduction': [{ boneName: 'Hip_L', axis: 'y', scale: 1 }],
  'leftHip.externalRotation': [{ boneName: 'Hip_L', axis: 'x', scale: -1 }],
  'rightHip.adduction': [{ boneName: 'Hip_R', axis: 'y', scale: -1 }],
  'rightHip.externalRotation': [{ boneName: 'Hip_R', axis: 'x', scale: 1 }],
  
  // === KNEE / TIBIA ===
  // Empirically verified: Knee_L/R Z+30 = FORWARD (ankle moves forward)
  // Knee flexion = ankle moves backward = negative Z
  'leftKnee.flexion': [{ boneName: 'Knee_L', axis: 'z', scale: -1 }],
  'leftKnee.varus': [{ boneName: 'Knee_L', axis: 'y', scale: 1 }],
  'leftKnee.tibialTorsion': [{ boneName: 'Knee_L', axis: 'x', scale: 1 }],
  'leftKnee.recurvatum': [{ boneName: 'Knee_L', axis: 'z', scale: 0.5 }],
  'leftKnee.tibialSlope': [{ boneName: 'Knee_L', axis: 'z', scale: -0.3 }],
  'rightKnee.flexion': [{ boneName: 'Knee_R', axis: 'z', scale: -1 }],
  'rightKnee.varus': [{ boneName: 'Knee_R', axis: 'y', scale: -1 }],
  'rightKnee.tibialTorsion': [{ boneName: 'Knee_R', axis: 'x', scale: -1 }],
  'rightKnee.recurvatum': [{ boneName: 'Knee_R', axis: 'z', scale: 0.5 }],
  'rightKnee.tibialSlope': [{ boneName: 'Knee_R', axis: 'z', scale: -0.3 }],
  
  // === ANKLE & FOOT ===
  // Empirically verified: Ankle_L/R Z+30 = UP (toes go up)
  // Dorsiflexion = toes up = positive Z; Plantarflexion = toes down = negative Z
  // Ankle_L X+30 = RIGHT (medial/inversion); Ankle_R X+30 = LEFT (medial/inversion)
  'leftAnkle.dorsiflexion': [{ boneName: 'Ankle_L', axis: 'z', scale: 1 }],
  'leftAnkle.plantarflexion': [{ boneName: 'Ankle_L', axis: 'z', scale: -1 }],
  'leftAnkle.inversion': [{ boneName: 'Ankle_L', axis: 'x', scale: 1 }],
  'leftAnkle.eversion': [{ boneName: 'Ankle_L', axis: 'x', scale: -1 }],
  'rightAnkle.dorsiflexion': [{ boneName: 'Ankle_R', axis: 'z', scale: 1 }],
  'rightAnkle.plantarflexion': [{ boneName: 'Ankle_R', axis: 'z', scale: -1 }],
  'rightAnkle.inversion': [{ boneName: 'Ankle_R', axis: 'x', scale: 1 }],
  'rightAnkle.eversion': [{ boneName: 'Ankle_R', axis: 'x', scale: -1 }],
  'leftAnkle.forefootVarus': [{ boneName: 'Toes_L', axis: 'y', scale: 0.5 }],
  'leftAnkle.toeExtension': [{ boneName: 'Toes_L', axis: 'z', scale: -1 }],
  'rightAnkle.forefootVarus': [{ boneName: 'Toes_R', axis: 'y', scale: -0.5 }],
  'rightAnkle.toeExtension': [{ boneName: 'Toes_R', axis: 'z', scale: -1 }],
  
  // === SHOULDER ===
  // Shoulder axes empirically verified via child displacement tests
  // Empirically verified: Shoulder_L/R Z+30 = FORWARD, Y-30 = UP
  // Flexion (forward/backward arm swing) = Z axis, scale 1 (Z+ = forward)
  // Abduction (arm lifts away from body) = Y axis, scale -1 (Y- = up)
  'leftShoulder.flexion': [{ boneName: 'Shoulder_L', axis: 'z', scale: 1 }],
  'leftShoulder.abduction': [{ boneName: 'Shoulder_L', axis: 'y', scale: -1 }],
  'leftShoulder.internalRotation': [{ boneName: 'ShoulderPart1_L', axis: 'x', scale: -1 }],
  'leftShoulder.externalRotation': [{ boneName: 'ShoulderPart1_L', axis: 'x', scale: 1 }],
  'leftShoulder.retroversion': [{ boneName: 'ShoulderPart1_L', axis: 'z', scale: -1 }],
  'leftShoulder.elevation': [
    { boneName: 'Chest_M', axis: 'z', scale: -0.15 },
    { boneName: 'Shoulder_L', axis: 'y', scale: 0.3 }
  ],
  'rightShoulder.flexion': [{ boneName: 'Shoulder_R', axis: 'z', scale: 1 }],
  'rightShoulder.abduction': [{ boneName: 'Shoulder_R', axis: 'y', scale: -1 }],
  'rightShoulder.internalRotation': [{ boneName: 'ShoulderPart1_R', axis: 'x', scale: 1 }],
  'rightShoulder.externalRotation': [{ boneName: 'ShoulderPart1_R', axis: 'x', scale: -1 }],
  'rightShoulder.retroversion': [{ boneName: 'ShoulderPart1_R', axis: 'z', scale: -1 }],
  'rightShoulder.elevation': [
    { boneName: 'Chest_M', axis: 'z', scale: -0.15 },
    { boneName: 'Shoulder_R', axis: 'y', scale: -0.3 }
  ],
  
  // === SCAPULA ===
  // Scapula movements on the thorax - critical for scapulohumeral rhythm
  // Note: Scapula_L/R are children of Chest_M in the bone hierarchy
  //
  // Scapula local axes (verified from observed behavior):
  // - X axis: Rotation moves scapula forward/backward (protraction/retraction)
  // - Y axis: Rotation moves scapula up/down (elevation/depression)
  // - Z axis: Rotation tilts glenoid up/down (upward/downward rotation)
  //
  // Protraction/Retraction: Scapula wraps around ribcage (X-axis rotation)
  'leftScapula.protraction': [{ boneName: 'Scapula_L', axis: 'x', scale: -1 }],   // Scapula moves forward around ribcage
  'leftScapula.retraction': [{ boneName: 'Scapula_L', axis: 'x', scale: 1 }],     // Scapula moves backward toward spine
  'rightScapula.protraction': [{ boneName: 'Scapula_R', axis: 'x', scale: -1 }],  // Same direction for right (symmetric motion)
  'rightScapula.retraction': [{ boneName: 'Scapula_R', axis: 'x', scale: 1 }],
  
  // Elevation/Depression: Scapula moves up/down (Y-axis rotation)
  'leftScapula.elevation': [{ boneName: 'Scapula_L', axis: 'y', scale: -1 }],     // Shrug - scapula elevates
  'leftScapula.depression': [{ boneName: 'Scapula_L', axis: 'y', scale: 1 }],     // Push down
  'rightScapula.elevation': [{ boneName: 'Scapula_R', axis: 'y', scale: 1 }],     // Opposite sign for right (mirrored)
  'rightScapula.depression': [{ boneName: 'Scapula_R', axis: 'y', scale: -1 }],
  
  // Upward/Downward Rotation: Glenoid points up (Z-axis rotation - frontal plane rotation)
  // Inferior angle moves laterally when glenoid faces upward
  'leftScapula.upwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: 1 }],    // Inferior angle moves lateral, glenoid faces up
  'leftScapula.downwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: -1 }], // Inferior angle moves medial
  'rightScapula.upwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: -1 }],  // Opposite for right side
  'rightScapula.downwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: 1 }],
  
  // Anterior/Posterior Tilt: Inferior angle tips forward/backward (X-axis = forward/backward)
  // Different from protraction - this is a smaller sagittal plane tilt of the scapula body
  'leftScapula.anteriorTilt': [{ boneName: 'Scapula_L', axis: 'x', scale: -0.5 }],   // Inferior angle tips forward (anterior)
  'leftScapula.posteriorTilt': [{ boneName: 'Scapula_L', axis: 'x', scale: 0.5 }],   // Inferior angle tips backward (posterior)
  'rightScapula.anteriorTilt': [{ boneName: 'Scapula_R', axis: 'x', scale: -0.5 }],
  'rightScapula.posteriorTilt': [{ boneName: 'Scapula_R', axis: 'x', scale: 0.5 }],
  
  // Winging: Medial border lifts off ribcage (common dysfunction - combination of movements)
  // Primary: X rotation (forward tilt/protraction) + Z rotation (helps lift medial border)
  'leftScapula.winging': [
    { boneName: 'Scapula_L', axis: 'x', scale: -0.6 },  // Forward tilt component (protraction direction)
    { boneName: 'Scapula_L', axis: 'z', scale: 0.4 }    // Upward rotation component (lifts medial border)
  ],
  'rightScapula.winging': [
    { boneName: 'Scapula_R', axis: 'x', scale: -0.6 },  // Same forward direction for right (symmetric)
    { boneName: 'Scapula_R', axis: 'z', scale: -0.4 }   // Opposite Z for right side
  ],
  
  // Clavicle axial rotation - simulates rotation along clavicle's long axis
  // Posterior rotation: clavicle rotates backward, elevating acromial end
  // Anterior rotation: clavicle rotates forward, depressing acromial end
  'leftScapula.clavicleRotation': [
    { boneName: 'Scapula_L', axis: 'z', scale: 0.8 },   // Primary rotation axis (upward/downward rotation plane)
    { boneName: 'Scapula_L', axis: 'x', scale: -0.3 }   // Secondary forward tilt component
  ],
  'rightScapula.clavicleRotation': [
    { boneName: 'Scapula_R', axis: 'z', scale: -0.8 },  // Mirrored Z for right side
    { boneName: 'Scapula_R', axis: 'x', scale: -0.3 }   // Same forward direction (symmetric)
  ],
  
  // === ELBOW ===
  // Empirically verified: Elbow_L/R Z+30 = FORWARD (both same direction)
  // Elbow flexion = forearm curls forward/up = positive Z (same sign for both sides)
  'leftElbow.flexion': [{ boneName: 'Elbow_L', axis: 'z', scale: 1 }],
  'leftElbow.pronation': [{ boneName: 'Elbow_L', axis: 'x', scale: -1 }],
  'leftElbow.carryingAngle': [{ boneName: 'Elbow_L', axis: 'y', scale: -1 }],
  'rightElbow.flexion': [{ boneName: 'Elbow_R', axis: 'z', scale: 1 }],
  'rightElbow.pronation': [{ boneName: 'Elbow_R', axis: 'x', scale: -1 }],
  'rightElbow.carryingAngle': [{ boneName: 'Elbow_R', axis: 'y', scale: -1 }],
  
  // === WRIST ===
  // Wrist Z follows same pattern as elbow - both Z+30 go FORWARD (same direction)
  'leftWrist.deviation': [{ boneName: 'Wrist_L', axis: 'y', scale: 1 }],
  'leftWrist.flexion': [{ boneName: 'Wrist_L', axis: 'z', scale: 1 }],
  'rightWrist.deviation': [{ boneName: 'Wrist_R', axis: 'y', scale: -1 }],
  'rightWrist.flexion': [{ boneName: 'Wrist_R', axis: 'z', scale: 1 }],
  
  // === PELVIS ===
  // Pelvis tilt/obliquity/rotation use Hip bones (like innominate rotations but symmetrical)
  // This isolates pelvis movement without moving the trunk or legs
  'pelvis.tilt': [
    { boneName: 'Hip_L', axis: 'z', scale: 0.3 },
    { boneName: 'Hip_R', axis: 'z', scale: -0.3 },
  ],
  'pelvis.obliquity': [
    { boneName: 'Hip_L', axis: 'y', scale: 0.3 },
    { boneName: 'Hip_R', axis: 'y', scale: 0.3 },
  ],
  'pelvis.rotation': [
    { boneName: 'Hip_L', axis: 'x', scale: 0.3 },
    { boneName: 'Hip_R', axis: 'x', scale: -0.3 },
  ],
  'pelvis.drop': [{ boneName: 'Root_M', axis: 'y', scale: -0.01, isPosition: true }],
  'pelvis.zShift': [{ boneName: 'Root_M', axis: 'z', scale: 0.01, isPosition: true }],
  
  // === SACRUM / SI JOINT ===
  // Verified axes (midline bones): LONG=x(Up), FLEX=z(Right), ABD=y(Fwd), ROT=x
  // Nutation: sacral base tilts anteriorly = sagittal plane = Z axis
  'sacrum.nutation': [
    { boneName: 'RootPart1_M', axis: 'z', scale: 0.4 },
    { boneName: 'RootPart2_M', axis: 'z', scale: 0.3 },
  ],
  'sacrum.counternutation': [
    { boneName: 'RootPart1_M', axis: 'z', scale: -0.4 },
    { boneName: 'RootPart2_M', axis: 'z', scale: -0.3 },
  ],
  // Sacral torsion: rotation on oblique axis = transverse plane = X axis
  'sacrum.torsion': [
    { boneName: 'RootPart1_M', axis: 'x', scale: 0.3 },
    { boneName: 'RootPart2_M', axis: 'x', scale: 0.2 },
  ],
  // Sacral lateral flexion = frontal plane = Y axis
  'sacrum.lateralFlexion': [
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.3 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.2 },
  ],

  // === INNOMINATE ===
  // Innominate anterior/posterior rotation (relative to sacrum)
  // Uses Hip bones since they're children of Root_M (pelvis)
  'pelvis.leftInnominateRotation': [
    { boneName: 'Hip_L', axis: 'z', scale: 0.3 },
  ],
  'pelvis.rightInnominateRotation': [
    { boneName: 'Hip_R', axis: 'z', scale: -0.3 },
  ],
  
  // === SPINE (Sagittal plane curves) ===
  // Axis convention for midline spine bones: Z = sagittal (flexion/extension), X = transverse (rotation), Y = frontal (lateral flexion)
  // Lordosis = extension (backward curve), Kyphosis = flexion (forward curve)
  'spine.cervicalLordosis': [
    { boneName: 'Neck_M', axis: 'z', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: 0.2 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: 0.2 },
  ],
  'spine.thoracicKyphosis': [
    { boneName: 'Chest_M', axis: 'z', scale: 0.3 },
    { boneName: 'Spine1Part2_M', axis: 'z', scale: 0.2 },
    { boneName: 'Spine1Part1_M', axis: 'z', scale: 0.2 },
  ],
  'spine.lumbarLordosis': [
    { boneName: 'Spine1_M', axis: 'z', scale: -0.3 },
    { boneName: 'RootPart2_M', axis: 'z', scale: -0.2 },
    { boneName: 'RootPart1_M', axis: 'z', scale: -0.2 },
  ],
  'spine.scoliosis': [
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.15 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.2 },
    { boneName: 'Spine1_M', axis: 'y', scale: 0.15 },
    { boneName: 'Spine1Part1_M', axis: 'y', scale: -0.15 },
    { boneName: 'Spine1Part2_M', axis: 'y', scale: -0.2 },
    { boneName: 'Chest_M', axis: 'y', scale: -0.15 },
  ],
  'spine.cervicalRotation': [
    { boneName: 'Neck_M', axis: 'x', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'x', scale: 0.2 },
    { boneName: 'NeckPart2_M', axis: 'x', scale: 0.2 },
  ],
  'spine.cervicalLateralFlexion': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.25 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.2 },
  ],
  'spine.thoracicRotation': [
    { boneName: 'Chest_M', axis: 'x', scale: 0.2 },
    { boneName: 'Spine1Part2_M', axis: 'x', scale: 0.15 },
    { boneName: 'Spine1Part1_M', axis: 'x', scale: 0.15 },
  ],
  'spine.lumbarRotation': [
    { boneName: 'Spine1_M', axis: 'x', scale: 0.2 },
    { boneName: 'RootPart2_M', axis: 'x', scale: 0.15 },
    { boneName: 'RootPart1_M', axis: 'x', scale: 0.15 },
  ],
  'spine.flexion': [
    { boneName: 'RootPart1_M', axis: 'z', scale: 0.15 },
    { boneName: 'RootPart2_M', axis: 'z', scale: 0.15 },
    { boneName: 'Spine1_M', axis: 'z', scale: 0.12 },
    { boneName: 'Spine1Part1_M', axis: 'z', scale: 0.1 },
    { boneName: 'Spine1Part2_M', axis: 'z', scale: 0.08 },
    { boneName: 'Chest_M', axis: 'z', scale: 0.05 },
  ],
  'spine.lateralFlexion': [
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.12 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.12 },
    { boneName: 'Spine1_M', axis: 'y', scale: 0.1 },
    { boneName: 'Spine1Part1_M', axis: 'y', scale: 0.08 },
    { boneName: 'Spine1Part2_M', axis: 'y', scale: 0.06 },
    { boneName: 'Chest_M', axis: 'y', scale: 0.04 },
  ],
  'spine.lumbarScoliosis': [
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.15 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.2 },
    { boneName: 'Spine1_M', axis: 'y', scale: 0.15 },
  ],
  'spine.thoracicScoliosis': [
    { boneName: 'Spine1Part1_M', axis: 'y', scale: 0.15 },
    { boneName: 'Spine1Part2_M', axis: 'y', scale: 0.2 },
    { boneName: 'Chest_M', axis: 'y', scale: 0.15 },
  ],
  'spine.cervicalScoliosis': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.2 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.15 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.1 },
  ],

  // === HEAD & NECK (Cervical Spine) ===
  'neck.flexion': [
    { boneName: 'Neck_M', axis: 'z', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: 0.25 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: 0.2 },
    { boneName: 'Head_M', axis: 'z', scale: 0.15 },
  ],
  'neck.extension': [
    { boneName: 'Neck_M', axis: 'z', scale: -0.3 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: -0.25 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: -0.2 },
    { boneName: 'Head_M', axis: 'z', scale: -0.15 },
  ],
  'neck.rotation': [
    { boneName: 'Neck_M', axis: 'x', scale: 0.25 },
    { boneName: 'NeckPart1_M', axis: 'x', scale: 0.3 },
    { boneName: 'NeckPart2_M', axis: 'x', scale: 0.25 },
    { boneName: 'Head_M', axis: 'x', scale: 0.2 },
  ],
  'neck.lateralFlexion': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.25 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.3 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.25 },
    { boneName: 'Head_M', axis: 'y', scale: 0.2 },
  ],
  'neck.forwardHead': [
    { boneName: 'Chest_M', axis: 'z', scale: -0.15 },
    { boneName: 'Neck_M', axis: 'z', scale: 0.25 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: 0.2 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: 0.15 },
    { boneName: 'Head_M', axis: 'z', scale: 0.1 },
  ],
};

interface PoseBoneConfig {
  configKey: string;
  label: string;
  axis: 'x' | 'y' | 'z';
  scale: number;
  minValue: number;
  maxValue: number;
  sensitivity: number;
}

const POSE_BONE_MAP: Record<string, PoseBoneConfig> = {
  'Hip_L': { configKey: 'leftHip.flexion', label: 'L Hip Flexion', axis: 'z', scale: -1, minValue: 0, maxValue: 120, sensitivity: 0.5 },
  'HipPart1_L': { configKey: 'leftHip.flexion', label: 'L Hip Flexion', axis: 'z', scale: -1, minValue: 0, maxValue: 120, sensitivity: 0.5 },
  'Hip_R': { configKey: 'rightHip.flexion', label: 'R Hip Flexion', axis: 'z', scale: -1, minValue: 0, maxValue: 120, sensitivity: 0.5 },
  'HipPart1_R': { configKey: 'rightHip.flexion', label: 'R Hip Flexion', axis: 'z', scale: -1, minValue: 0, maxValue: 120, sensitivity: 0.5 },
  'Knee_L': { configKey: 'leftKnee.flexion', label: 'L Knee Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 140, sensitivity: 0.5 },
  'Knee_R': { configKey: 'rightKnee.flexion', label: 'R Knee Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 140, sensitivity: 0.5 },
  'Ankle_L': { configKey: 'leftAnkle.dorsiflexion', label: 'L Ankle Dorsiflexion', axis: 'z', scale: -1, minValue: 0, maxValue: 30, sensitivity: 0.3 },
  'Ankle_R': { configKey: 'rightAnkle.dorsiflexion', label: 'R Ankle Dorsiflexion', axis: 'z', scale: -1, minValue: 0, maxValue: 30, sensitivity: 0.3 },
  'Shoulder_L': { configKey: 'leftShoulder.flexion', label: 'L Shoulder Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 180, sensitivity: 0.6 },
  'ShoulderPart1_L': { configKey: 'leftShoulder.flexion', label: 'L Shoulder Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 180, sensitivity: 0.6 },
  'Shoulder_R': { configKey: 'rightShoulder.flexion', label: 'R Shoulder Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 180, sensitivity: 0.6 },
  'ShoulderPart1_R': { configKey: 'rightShoulder.flexion', label: 'R Shoulder Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 180, sensitivity: 0.6 },
  'Elbow_L': { configKey: 'leftElbow.flexion', label: 'L Elbow Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 150, sensitivity: 0.5 },
  'Elbow_R': { configKey: 'rightElbow.flexion', label: 'R Elbow Flexion', axis: 'z', scale: -1, minValue: 0, maxValue: 150, sensitivity: 0.5 },
  'Wrist_L': { configKey: 'leftWrist.flexion', label: 'L Wrist Flexion', axis: 'z', scale: 1, minValue: -80, maxValue: 80, sensitivity: 0.3 },
  'Wrist_R': { configKey: 'rightWrist.flexion', label: 'R Wrist Flexion', axis: 'z', scale: -1, minValue: -80, maxValue: 80, sensitivity: 0.3 },
  'Root_M': { configKey: 'pelvis.tilt', label: 'Pelvis Tilt', axis: 'z', scale: 1, minValue: -20, maxValue: 20, sensitivity: 0.3 },
  'RootPart1_M': { configKey: 'pelvis.tilt', label: 'Pelvis Tilt', axis: 'z', scale: 1, minValue: -20, maxValue: 20, sensitivity: 0.3 },
  'RootPart2_M': { configKey: 'pelvis.tilt', label: 'Pelvis Tilt', axis: 'z', scale: 1, minValue: -20, maxValue: 20, sensitivity: 0.3 },
  'Spine1_M': { configKey: 'spine.lumbarLordosis', label: 'Lumbar Lordosis', axis: 'z', scale: -1, minValue: -30, maxValue: 30, sensitivity: 0.3 },
  'Spine1Part1_M': { configKey: 'spine.lumbarLordosis', label: 'Lumbar Lordosis', axis: 'z', scale: -1, minValue: -30, maxValue: 30, sensitivity: 0.3 },
  'Spine1Part2_M': { configKey: 'spine.thoracicKyphosis', label: 'Thoracic Kyphosis', axis: 'z', scale: 1, minValue: -30, maxValue: 30, sensitivity: 0.3 },
  'Chest_M': { configKey: 'spine.thoracicKyphosis', label: 'Thoracic Kyphosis', axis: 'z', scale: 1, minValue: -30, maxValue: 30, sensitivity: 0.3 },
  'Neck_M': { configKey: 'neck.flexion', label: 'Neck Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 50, sensitivity: 0.3 },
  'NeckPart1_M': { configKey: 'neck.flexion', label: 'Neck Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 50, sensitivity: 0.3 },
  'NeckPart2_M': { configKey: 'neck.flexion', label: 'Neck Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 50, sensitivity: 0.3 },
  'Head_M': { configKey: 'neck.flexion', label: 'Neck Flexion', axis: 'z', scale: 1, minValue: 0, maxValue: 50, sensitivity: 0.3 },
  'Scapula_L': { configKey: 'leftShoulder.abduction', label: 'L Shoulder Abduction', axis: 'z', scale: -1, minValue: 0, maxValue: 180, sensitivity: 0.5 },
  'Scapula_R': { configKey: 'rightShoulder.abduction', label: 'R Shoulder Abduction', axis: 'z', scale: 1, minValue: 0, maxValue: 180, sensitivity: 0.5 },
};

export default function PureThreeGLBViewer({ 
  modelPath = '/models/rigged-skeleton.glb',
  modelConfig,
  className = '',
  animationState,
  onAnimationFrame,
  jointLimits,
  biomechanicsData,
  muscleActivation,
  muscleVisibility,
  muscleLayerVisibility,
  muscleLayerConfigs,
  cameraAngle = 'custom',
  disableControls = false,
  showLabel = false,
  zoomToRegion = null,
  compensatingJoints = [],
  animationConstraints = [],
  livePose = null,
  fixedCameraPosition,
  fixedCameraLookAt,
  showLoadingSpinner = true,
  showMuscles = true,
  individualMuscleVisibility,
  onMuscleGroupsReady,
  muscleStates,
  highlightRegions,
  highlightBoneNames,
  painMarkers = [],
  onPainMarkerAdd,
  onPainMarkerMove,
  onPainMarkerRemove,
  onPainMarkerUpdate,
  onPainMarkerSelect,
  enablePainMarkers = false,
  activePainMarkerType = 'point',
  enableRomMode = false,
  onRomJointSelect,
  selectedRomJointId = null,
  enablePoseMode = false,
  onModelConfigChange,
  enableZoomTool = false,
  onLandmarkSelect,
  forceOverlay = null,
  bodyWeightKg = 70,
  selectedForceJoint = null,
  onForceJointSelect,
  enableMuscleInteraction = false,
  onMuscleGroupClick,
  highlightMuscleGroups,
}: PureThreeGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'checking' | 'loading' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const bonesRef = useRef<{ [name: string]: THREE.Object3D }>({});
  const initialRotationsRef = useRef<{ [name: string]: THREE.Euler }>({});
  const bindPoseQuaternionsRef = useRef<{ [name: string]: THREE.Quaternion }>({});
  const sliderRotationsRef = useRef<{ [boneName: string]: { x: number; y: number; z: number } }>({});
  const clavicleOffsetsRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const legIKStateRef = useRef<LegIKState | null>(null);
  const footGroundDebugRef = useRef<number>(0);
  const forceVisualizationRef = useRef<ForceVisualizationManager | null>(null);
  const muscleVisualizationRef = useRef<MuscleVisualizationManager | null>(null);
  const muscleLayerManagerRef = useRef<MuscleLayerManager | null>(null);
  const muscleMeshesRef = useRef<THREE.Object3D[]>([]);
  const splitMuscleGroupsRef = useRef<Map<string, SplitMuscleGroup>>(new Map());
  const animationConstraintsRef = useRef<AnimationConstraint[]>([]);
  const livePoseActiveRef = useRef<boolean>(false);
  const animationPlayingRef = useRef<boolean>(false);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const highlightedMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; originalEmissive: THREE.Color; originalIntensity: number }[]>>(new Map());
  const biomechanicalHighlightRef = useRef<{ mesh: THREE.Mesh; origMaterial: THREE.Material; wasVisible: boolean }[]>([]);
  const highlightOverlaysRef = useRef<THREE.Mesh[]>([]);
  const chainHighlightOverlaysRef = useRef<THREE.Mesh[]>([]);
  const painMarkerMeshesRef = useRef<Map<string, { inner: THREE.Mesh; outer: THREE.Mesh; extra?: THREE.Object3D[] }>>(new Map());
  const draggingMarkerRef = useRef<{ id: string; mesh: THREE.Mesh; outerMesh: THREE.Mesh; hasMoved: boolean } | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const painMarkerCallbacksRef = useRef({ onPainMarkerAdd, onPainMarkerMove, onPainMarkerRemove, onPainMarkerUpdate, onPainMarkerSelect });
  painMarkerCallbacksRef.current = { onPainMarkerAdd, onPainMarkerMove, onPainMarkerRemove, onPainMarkerUpdate, onPainMarkerSelect };
  const enablePainMarkersRef = useRef(enablePainMarkers);
  enablePainMarkersRef.current = enablePainMarkers;
  const activePainMarkerTypeRef = useRef(activePainMarkerType);
  activePainMarkerTypeRef.current = activePainMarkerType;
  const [landmarkLabels, setLandmarkLabels] = useState<Array<{ label: string; boneName: string; screenX: number; screenY: number; worldPos: { x: number; y: number; z: number }; distance: number }>>([]);
  const [forceLabels, setForceLabels] = useState<Array<{ joint: string; label: string; totalForce: number; status: string; screenX: number; screenY: number }>>([]);
  const forceOverlayRef = useRef(forceOverlay);
  forceOverlayRef.current = forceOverlay;
  const onForceJointSelectRef = useRef(onForceJointSelect);
  onForceJointSelectRef.current = onForceJointSelect;
  const forceFrameCounter = useRef(0);
  const enableZoomToolRef = useRef(enableZoomTool);
  enableZoomToolRef.current = enableZoomTool;
  const landmarkSelectRef = useRef(onLandmarkSelect);
  landmarkSelectRef.current = onLandmarkSelect;
  const landmarkFrameCounter = useRef(0);
  useEffect(() => {
    if (!enableZoomTool) {
      setLandmarkLabels([]);
    }
  }, [enableZoomTool]);
  const pendingReferralRef = useRef<PainMarker | null>(null);
  const pendingLineRef = useRef<PainMarker | null>(null);
  const areaDragRef = useRef<{ startPoint: THREE.Vector3; markerId: string } | null>(null);
  const paintingRef = useRef<{ id: string; points: Array<{ x: number; y: number; z: number }>; lastSampleTime: number } | null>(null);

  useEffect(() => {
    pendingReferralRef.current = null;
    pendingLineRef.current = null;
    areaDragRef.current = null;
  }, [activePainMarkerType, enablePainMarkers]);

  const enableRomModeRef = useRef(enableRomMode);
  enableRomModeRef.current = enableRomMode;
  const onRomJointSelectRef = useRef(onRomJointSelect);
  onRomJointSelectRef.current = onRomJointSelect;
  const romHighlightMeshesRef = useRef<THREE.Mesh[]>([]);
  const enablePoseModeRef = useRef(enablePoseMode);
  enablePoseModeRef.current = enablePoseMode;
  const onModelConfigChangeRef = useRef(onModelConfigChange);
  onModelConfigChangeRef.current = onModelConfigChange;
  const modelConfigRef = useRef(modelConfig);
  modelConfigRef.current = modelConfig;
  const [poseModeTooltip, setPoseModeTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const poseDragRef = useRef<{
    boneName: string;
    configKey: string;
    startX: number;
    startY: number;
    startValue: number;
    axis: 'x' | 'y' | 'z';
    scale: number;
    sensitivity: number;
    label: string;
  } | null>(null);
  const poseSelectedBoneRef = useRef<string | null>(null);
  const poseHighlightMeshRef = useRef<THREE.Mesh | null>(null);
  const [muscleHoverInfo, setMuscleHoverInfo] = useState<{ groupId: string; label: string; screenX: number; screenY: number } | null>(null);
  const enableMuscleInteractionRef = useRef(enableMuscleInteraction);
  enableMuscleInteractionRef.current = enableMuscleInteraction;
  const onMuscleGroupClickRef = useRef(onMuscleGroupClick);
  onMuscleGroupClickRef.current = onMuscleGroupClick;
  const muscleHoverMeshRef = useRef<THREE.Object3D | null>(null);
  const muscleOriginalEmissiveRef = useRef<Map<THREE.Mesh, { color: THREE.Color; intensity: number }>>(new Map());

  const findNearestBone = useCallback((position: THREE.Vector3): { boneName: string; label: string } => {
    const bones = bonesRef.current;
    let minDist = Infinity;
    let nearestLabel = 'Pelvis / Sacrum';
    let nearestBone = 'Root_M';
    const worldPos = new THREE.Vector3();

    for (const [name, bone] of Object.entries(bones)) {
      if (!BONE_ANATOMICAL_LABELS[name]) continue;
      bone.getWorldPosition(worldPos);
      const dist = position.distanceTo(worldPos);
      if (dist < minDist) {
        minDist = dist;
        nearestBone = name;
        nearestLabel = BONE_ANATOMICAL_LABELS[name];
      }
    }

    const virtualPoints = ANATOMICAL_VIRTUAL_POINTS;

    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    const virtPos = new THREE.Vector3();

    for (const vp of virtualPoints) {
      const boneA = bones[vp.boneA];
      const boneB = bones[vp.boneB];
      if (!boneA || !boneB) continue;
      boneA.getWorldPosition(posA);
      boneB.getWorldPosition(posB);
      virtPos.lerpVectors(posA, posB, vp.t);
      if (vp.offsetX) virtPos.x += vp.offsetX;
      if (vp.offsetY) virtPos.y += vp.offsetY;
      if (vp.offsetZ) virtPos.z += vp.offsetZ;
      const dist = position.distanceTo(virtPos);
      if (dist < minDist) {
        minDist = dist;
        nearestBone = vp.boneName;
        nearestLabel = vp.label;
      }
    }

    return { boneName: nearestBone, label: nearestLabel };
  }, []);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    model: THREE.Group | null;
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    const checkWebGL = (): boolean => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          setErrorMessage('WebGL is not supported in this browser');
          setStatus('error');
          return false;
        }
        return true;
      } catch (e) {
        setErrorMessage('Failed to check WebGL support');
        setStatus('error');
        return false;
      }
    };

    if (!checkWebGL()) return;
    setStatus('loading');
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { camera, controls, model, scene } = sceneRef.current;
    const bones = bonesRef.current;
    
    // Helper function to clean up all segment overlays and markers
    const cleanupSegmentVisuals = () => {
      // Remove markers from bones
      Object.values(bones).forEach((bone) => {
        if (bone && bone.children) {
          const markers = bone.children.filter((c: THREE.Object3D) => 
            c.userData.isSegmentMarker || c.userData.isSubStructureOverlay
          );
          markers.forEach((marker: THREE.Object3D) => bone.remove(marker));
        }
      });
      // Remove scene-level overlays
      if (scene) {
        const overlays = scene.children.filter((c: THREE.Object3D) => 
          c.userData.isSegmentMarker || c.userData.isSubStructureOverlay
        );
        overlays.forEach((overlay: THREE.Object3D) => scene.remove(overlay));
      }
    };
    
    // Helper to create sub-structure overlay geometry
    const createSubStructureOverlay = (config: SubStructureOverlay, bone: THREE.Object3D, isLeft: boolean = false) => {
      let geometry: THREE.BufferGeometry;
      switch (config.geometry) {
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(config.scale.x, config.scale.x, config.scale.y, 16);
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(config.scale.x, 16, 16);
          break;
        case 'box':
          geometry = new THREE.BoxGeometry(config.scale.x, config.scale.y, config.scale.z);
          break;
        default:
          geometry = new THREE.SphereGeometry(config.scale.x, 16, 16);
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isSubStructureOverlay = true;
      mesh.userData.overlayType = config.type;
      mesh.userData.label = config.label;
      mesh.renderOrder = 999;
      
      // Position in local bone space
      const xOffset = isLeft ? -config.position.x : config.position.x;
      mesh.position.set(xOffset, config.position.y, config.position.z);
      mesh.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
      
      return mesh;
    };
    
    if (!zoomToRegion || zoomToRegion === 'full_body') {
      // Clean up all segment visualizations
      cleanupSegmentVisuals();
      
      // Restore all mesh visibility - must explicitly set visible=true, opacity=1, transparent=false, depthWrite=true
      if (model) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.visible = true;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                mat.opacity = 1;
                mat.transparent = false;
                mat.depthWrite = true;
              }
            });
          }
        });
      }
      
      if (zoomToRegion === 'full_body') {
        const regionConfig = ANATOMICAL_REGION_PRESETS.full_body;
        const startPosition = camera.position.clone();
        const endPosition = new THREE.Vector3(regionConfig.position.x, regionConfig.position.y, regionConfig.position.z);
        const startTarget = controls.target.clone();
        const endTarget = new THREE.Vector3(regionConfig.lookAt.x, regionConfig.lookAt.y, regionConfig.lookAt.z);
        const duration = 800;
        const startTime = Date.now();

        const animateReset = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          camera.position.lerpVectors(startPosition, endPosition, easeProgress);
          controls.target.lerpVectors(startTarget, endTarget, easeProgress);
          controls.update();
          if (progress < 1) requestAnimationFrame(animateReset);
        };
        animateReset();
      }
      return;
    }
    
    const regionConfig = ANATOMICAL_REGION_PRESETS[zoomToRegion];
    if (!regionConfig) return;

    const focusedMeshes = REGION_MESH_MAPPING[zoomToRegion] || [];
    const focusedBones = SEGMENT_BONE_MAPPING[zoomToRegion] || [];
    const isSegmentView = isSpinalSegmentView(zoomToRegion);
    const subStructureType = getSubStructureType(zoomToRegion);
    const parentSegment = getParentSegment(zoomToRegion);

    // Clean up previous segment visuals before creating new ones
    cleanupSegmentVisuals();
    
    // Restore all mesh visibility before starting new zoom to prevent stale hidden meshes
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.visible = true;
          child.renderOrder = 0;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
              mat.opacity = 1;
              mat.transparent = false;
              mat.depthWrite = true;
            }
          });
        }
      });
    }

    // For segment views, create anatomical overlays
    if (isSegmentView && focusedBones.length > 0 && Object.keys(bones).length > 0) {
      const lowerBoneName = focusedBones[0]; // e.g., RootPart1_M for L4_L5
      const upperBoneName = focusedBones[1]; // e.g., RootPart2_M for L4_L5
      const lowerBone = bones[lowerBoneName];
      const upperBone = bones[upperBoneName];
      
      if (lowerBone && upperBone) {
        // Create segment vertebral body representations
        const bodyConfig = SUB_STRUCTURE_OVERLAYS.body;
        const lowerBody = createSubStructureOverlay(bodyConfig, lowerBone);
        const upperBody = createSubStructureOverlay(bodyConfig, upperBone);
        lowerBone.add(lowerBody);
        upperBone.add(upperBody);
        
        // Create intervertebral disc between the two vertebrae
        const discConfig = SUB_STRUCTURE_OVERLAYS.disc;
        const disc = createSubStructureOverlay(discConfig, lowerBone);
        disc.position.y = 0.05; // Position between vertebrae
        lowerBone.add(disc);
        
        // Create bilateral facet joints (posterior)
        const facetConfig = SUB_STRUCTURE_OVERLAYS.facet;
        const leftFacet = createSubStructureOverlay(facetConfig, upperBone, true);
        const rightFacet = createSubStructureOverlay(facetConfig, upperBone, false);
        upperBone.add(leftFacet);
        upperBone.add(rightFacet);
        
        // Create pars interarticularis (bilateral)
        const parsConfig = SUB_STRUCTURE_OVERLAYS.pars;
        const leftPars = createSubStructureOverlay(parsConfig, upperBone, true);
        const rightPars = createSubStructureOverlay(parsConfig, upperBone, false);
        upperBone.add(leftPars);
        upperBone.add(rightPars);
        
        // Create spinous process
        const spinousConfig = SUB_STRUCTURE_OVERLAYS.spinous;
        const spinous = createSubStructureOverlay(spinousConfig, upperBone);
        upperBone.add(spinous);
        
        // If viewing a specific sub-structure, highlight it
        if (subStructureType) {
          // Dim all overlays except the selected sub-structure type
          [lowerBone, upperBone].forEach((bone) => {
            bone.children.forEach((child) => {
              if (child.userData.isSubStructureOverlay) {
                const mesh = child as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (child.userData.overlayType !== subStructureType) {
                  mat.opacity = 0.15;
                } else {
                  mat.opacity = 1.0;
                  mat.emissive = new THREE.Color(0x333333);
                }
              }
            });
          });
        }
      }
    }

    // Camera animation
    const startPosition = camera.position.clone();
    const endPosition = new THREE.Vector3(
      regionConfig.position.x,
      regionConfig.position.y,
      regionConfig.position.z
    );
    
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(
      regionConfig.lookAt.x,
      regionConfig.lookAt.y,
      regionConfig.lookAt.z
    );

    const duration = 800;
    const startTime = Date.now();

    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPosition, endPosition, easeProgress);
      controls.target.lerpVectors(startTarget, endTarget, easeProgress);
      controls.update();

      // Mesh-level visibility and opacity control
      if (model) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const meshName = child.name || '';
            const isFocusedMesh = focusedMeshes.includes(meshName);
            
            // For segment views, hide all non-spine meshes completely
            if (isSegmentView) {
              if (!isFocusedMesh) {
                // Completely hide non-focused meshes
                const currentOpacity = 1 - easeProgress;
                
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                    mat.transparent = true;
                    mat.opacity = currentOpacity;
                    mat.depthWrite = false;
                    if (progress >= 1) {
                      child.visible = false;
                    }
                  }
                });
              } else {
                // Keep spine mesh visible but semi-transparent to show overlays on top
                child.visible = true;
                child.renderOrder = 0;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                    mat.transparent = true;
                    mat.opacity = 0.25;
                    mat.depthWrite = true;
                    mat.depthTest = true;
                  }
                });
              }
            } else {
              // Standard region zoom behavior
              const baseOpacity = 0.15;
              const targetOpacity = isFocusedMesh ? 1 : baseOpacity + (1 - easeProgress) * (1 - baseOpacity);
              
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                  mat.transparent = !isFocusedMesh || targetOpacity < 1;
                  mat.opacity = isFocusedMesh ? 1 : targetOpacity;
                  mat.depthWrite = mat.opacity > 0.5;
                }
              });
            }
          }
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      }
    };

    animateZoom();
  }, [zoomToRegion]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;
    if (!model) return;

    highlightOverlaysRef.current.forEach((overlay) => {
      scene.remove(overlay);
      overlay.geometry.dispose();
      if (overlay.material instanceof THREE.Material) overlay.material.dispose();
    });
    highlightOverlaysRef.current = [];

    if (!highlightRegions || highlightRegions.length === 0) return;

    model.updateMatrixWorld(true);

    const bones: Record<string, THREE.Object3D> = {};
    model.traverse((child) => {
      if ((child as any).isBone || child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });

    const REGION_GLOW_SIZE: Partial<Record<AnatomicalRegion, number>> = {
      lumbar_spine: 0.35,
      thoracic_spine: 0.4,
      cervical_spine: 0.2,
      pelvis: 0.4,
      left_shoulder: 0.25,
      right_shoulder: 0.25,
      left_hip: 0.3,
      right_hip: 0.3,
      left_knee: 0.2,
      right_knee: 0.2,
      left_ankle: 0.15,
      right_ankle: 0.15,
      left_elbow: 0.18,
      right_elbow: 0.18,
    };

    for (const highlight of highlightRegions) {
      const boneNames = REGION_MESH_MAPPING[highlight.region] || [];
      if (boneNames.length === 0) continue;

      const color = new THREE.Color(highlight.color);
      const glowSize = REGION_GLOW_SIZE[highlight.region] || 0.25;
      const intensity = Math.max(highlight.intensity, 0.6);

      for (const boneName of boneNames) {
        const bone = bones[boneName];
        if (!bone) continue;

        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);

        const geo = new THREE.SphereGeometry(glowSize, 16, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: intensity * 0.45,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
        });

        const glowMesh = new THREE.Mesh(geo, mat);
        glowMesh.position.copy(worldPos);
        glowMesh.renderOrder = 999;
        glowMesh.userData.isHighlightOverlay = true;

        scene.add(glowMesh);
        highlightOverlaysRef.current.push(glowMesh);

        const outerGeo = new THREE.SphereGeometry(glowSize * 1.6, 12, 8);
        const outerMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: intensity * 0.15,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
        });
        const outerGlow = new THREE.Mesh(outerGeo, outerMat);
        outerGlow.position.copy(worldPos);
        outerGlow.renderOrder = 998;
        outerGlow.userData.isHighlightOverlay = true;
        scene.add(outerGlow);
        highlightOverlaysRef.current.push(outerGlow);
      }
    }
  }, [highlightRegions]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;

    chainHighlightOverlaysRef.current.forEach((overlay) => {
      scene.remove(overlay);
      overlay.geometry.dispose();
      if (overlay.material instanceof THREE.Material) overlay.material.dispose();
    });
    chainHighlightOverlaysRef.current = [];

    if (!highlightBoneNames || highlightBoneNames.length === 0 || !model) return;

    model.updateMatrixWorld(true);

    const bones: Record<string, THREE.Object3D> = {};
    model.traverse((child) => {
      if ((child as any).isBone || child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });

    for (const highlight of highlightBoneNames) {
      const bone = bones[highlight.boneName];
      if (!bone) continue;

      const worldPos = new THREE.Vector3();
      bone.getWorldPosition(worldPos);

      const glowSize = highlight.glowSize || 0.2;
      const color = new THREE.Color(highlight.color);
      const intensity = Math.max(highlight.intensity, 0.5);

      const geo = new THREE.SphereGeometry(glowSize, 16, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: intensity * 0.5,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const glowMesh = new THREE.Mesh(geo, mat);
      glowMesh.position.copy(worldPos);
      glowMesh.renderOrder = 997;
      glowMesh.userData.isChainHighlight = true;
      scene.add(glowMesh);
      chainHighlightOverlaysRef.current.push(glowMesh);

      const outerGeo = new THREE.SphereGeometry(glowSize * 1.8, 12, 8);
      const outerMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: intensity * 0.15,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const outerGlow = new THREE.Mesh(outerGeo, outerMat);
      outerGlow.position.copy(worldPos);
      outerGlow.renderOrder = 996;
      outerGlow.userData.isChainHighlight = true;
      scene.add(outerGlow);
      chainHighlightOverlaysRef.current.push(outerGlow);
    }
  }, [highlightBoneNames]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene } = sceneRef.current;

    const existingIds = new Set(painMarkers.map(m => m.id));
    painMarkerMeshesRef.current.forEach((meshes, id) => {
      if (!existingIds.has(id)) {
        scene.remove(meshes.inner);
        scene.remove(meshes.outer);
        meshes.inner.geometry.dispose();
        meshes.outer.geometry.dispose();
        (meshes.inner.material as THREE.Material).dispose();
        (meshes.outer.material as THREE.Material).dispose();
        if (meshes.extra) {
          meshes.extra.forEach(obj => {
            scene.remove(obj);
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            } else if (obj instanceof THREE.Line) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
          });
        }
        painMarkerMeshesRef.current.delete(id);
      }
    });

    for (const marker of painMarkers) {
      let pos = new THREE.Vector3(marker.position.x, marker.position.y, marker.position.z);
      if (pos.lengthSq() < 0.0001 && marker.nearestBone) {
        const bRef = bonesRef.current;
        if (marker.nearestBone.startsWith('virt_')) {
          const vp = ANATOMICAL_VIRTUAL_POINTS.find(v => v.boneName === marker.nearestBone);
          if (vp && bRef[vp.boneA] && bRef[vp.boneB]) {
            const pA = new THREE.Vector3();
            const pB = new THREE.Vector3();
            bRef[vp.boneA].getWorldPosition(pA);
            bRef[vp.boneB].getWorldPosition(pB);
            pos.lerpVectors(pA, pB, vp.t);
            if (vp.offsetX) pos.x += vp.offsetX;
            if (vp.offsetY) pos.y += vp.offsetY;
            if (vp.offsetZ) pos.z += vp.offsetZ;
          }
        } else if (bRef[marker.nearestBone]) {
          bRef[marker.nearestBone].getWorldPosition(pos);
        }
      }
      const markerType = marker.type || 'point';

      if (painMarkerMeshesRef.current.has(marker.id)) {
        const meshes = painMarkerMeshesRef.current.get(marker.id)!;
        meshes.inner.position.copy(pos);
        meshes.outer.position.copy(pos);

        if (markerType === 'area' && marker.radius) {
          const r = marker.radius;
          meshes.outer.scale.set(r / 0.1, r / 0.1, r / 0.1);
        }

        if (markerType === 'referred' && marker.referralTarget && meshes.extra && meshes.extra.length >= 3) {
          const tp = new THREE.Vector3(marker.referralTarget.x, marker.referralTarget.y, marker.referralTarget.z);
          meshes.extra[0].position.copy(tp);
          meshes.extra[1].position.copy(tp);
          const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, tp]);
          (meshes.extra[2] as THREE.Line).geometry.dispose();
          (meshes.extra[2] as THREE.Line).geometry = lineGeo;
          (meshes.extra[2] as THREE.Line).computeLineDistances();
        }

        if (markerType === 'line' && marker.linePoints && meshes.extra) {
          const pts = [pos, ...marker.linePoints.map(p => new THREE.Vector3(p.x, p.y, p.z))];
          const lineObj = meshes.extra.find(o => o instanceof THREE.Line) as THREE.Line | undefined;
          if (lineObj) {
            lineObj.geometry.dispose();
            lineObj.geometry = new THREE.BufferGeometry().setFromPoints(pts);
          }
          const dotMeshes = meshes.extra.filter(o => o instanceof THREE.Mesh) as THREE.Mesh[];
          dotMeshes.forEach((dm, i) => {
            if (i < marker.linePoints!.length) {
              dm.position.set(marker.linePoints![i].x, marker.linePoints![i].y, marker.linePoints![i].z);
              dm.visible = true;
            } else {
              dm.visible = false;
            }
          });
        }

        if (markerType === 'paint' && marker.paintPoints && marker.paintPoints.length > 0) {
          const pts = [pos, ...marker.paintPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))];
          const symptomClr = marker.symptomType ? SYMPTOM_TYPES[marker.symptomType]?.color : null;
          const clr = symptomClr || 0xff2222;

          if (!meshes.extra) meshes.extra = [];
          let lineObj = meshes.extra.find(o => o instanceof THREE.Line) as THREE.Line | undefined;
          if (lineObj) {
            lineObj.geometry.dispose();
            lineObj.geometry = new THREE.BufferGeometry().setFromPoints(pts);
          } else if (sceneRef.current) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color: clr, transparent: true, opacity: 0.85, depthTest: true, depthWrite: false, linewidth: 3 });
            lineObj = new THREE.Line(lineGeo, lineMat);
            lineObj.renderOrder = 999;
            sceneRef.current.scene.add(lineObj);
            meshes.extra.push(lineObj);
          }

          const existingDotCount = meshes.extra.filter(o => o instanceof THREE.Mesh).length;
          const currentPointCount = marker.paintPoints.length;
          const neededDots = Math.floor(currentPointCount / 2) + 1;
          if (neededDots > existingDotCount && sceneRef.current) {
            for (let i = existingDotCount; i < neededDots && i * 2 < marker.paintPoints.length; i++) {
              const pp = marker.paintPoints[i * 2];
              const dotGeo = new THREE.SphereGeometry(0.025, 6, 4);
              const dotMat = new THREE.MeshBasicMaterial({ color: clr, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
              const dotMesh = new THREE.Mesh(dotGeo, dotMat);
              dotMesh.position.set(pp.x, pp.y, pp.z);
              dotMesh.renderOrder = 1000;
              dotMesh.userData.isPainMarker = true;
              dotMesh.userData.markerId = marker.id;
              sceneRef.current.scene.add(dotMesh);
              meshes.extra.push(dotMesh);
            }
          }
        }
        continue;
      }

      const MARKER_TYPE_COLORS: Record<string, number> = {
        point: 0xff2222,
        area: 0xff6600,
        referred: 0x9933ff,
        line: 0xff4488,
        paint: 0xff2222,
      };
      const symptomColor = marker.symptomType ? SYMPTOM_TYPES[marker.symptomType]?.color : null;
      const color = symptomColor || MARKER_TYPE_COLORS[markerType] || MARKER_TYPE_COLORS.point;

      const innerGeo = new THREE.SphereGeometry(0.06, 16, 12);
      const innerMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.copy(pos);
      innerMesh.renderOrder = 1001;
      innerMesh.userData.isPainMarker = true;
      innerMesh.userData.markerId = marker.id;

      let outerGeo: THREE.BufferGeometry;
      if (markerType === 'area') {
        const r = marker.radius || 0.15;
        outerGeo = new THREE.SphereGeometry(r, 20, 14);
      } else {
        outerGeo = new THREE.SphereGeometry(0.1, 12, 8);
      }
      const outerMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: markerType === 'area' ? 0.25 : 0.2,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      outerMesh.position.copy(pos);
      outerMesh.renderOrder = 1000;
      outerMesh.userData.isPainMarker = true;
      outerMesh.userData.markerId = marker.id;

      scene.add(innerMesh);
      scene.add(outerMesh);

      const extraObjects: THREE.Object3D[] = [];

      if (markerType === 'referred' && marker.referralTarget) {
        const tp = new THREE.Vector3(marker.referralTarget.x, marker.referralTarget.y, marker.referralTarget.z);

        const tInnerGeo = new THREE.SphereGeometry(0.05, 12, 8);
        const tInnerMat = new THREE.MeshBasicMaterial({ color: 0xcc66ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
        const tInnerMesh = new THREE.Mesh(tInnerGeo, tInnerMat);
        tInnerMesh.position.copy(tp);
        tInnerMesh.renderOrder = 1001;
        tInnerMesh.userData.isPainMarker = true;
        tInnerMesh.userData.markerId = marker.id;

        const tOuterGeo = new THREE.SphereGeometry(0.08, 10, 6);
        const tOuterMat = new THREE.MeshBasicMaterial({ color: 0xcc66ff, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
        const tOuterMesh = new THREE.Mesh(tOuterGeo, tOuterMat);
        tOuterMesh.position.copy(tp);
        tOuterMesh.renderOrder = 1000;
        tOuterMesh.userData.isPainMarker = true;
        tOuterMesh.userData.markerId = marker.id;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, tp]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0xcc66ff, dashSize: 0.04, gapSize: 0.02, transparent: true, opacity: 0.7, depthTest: true, depthWrite: false });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        line.renderOrder = 999;

        scene.add(tInnerMesh);
        scene.add(tOuterMesh);
        scene.add(line);
        extraObjects.push(tInnerMesh, tOuterMesh, line);
      }

      if (markerType === 'line' && marker.linePoints && marker.linePoints.length > 0) {
        const pts = [pos, ...marker.linePoints.map(p => new THREE.Vector3(p.x, p.y, p.z))];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, depthTest: true, depthWrite: false, linewidth: 2 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 999;
        scene.add(line);
        extraObjects.push(line);

        for (const lp of marker.linePoints) {
          const dotGeo = new THREE.SphereGeometry(0.03, 8, 6);
          const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
          const dotMesh = new THREE.Mesh(dotGeo, dotMat);
          dotMesh.position.set(lp.x, lp.y, lp.z);
          dotMesh.renderOrder = 1001;
          dotMesh.userData.isPainMarker = true;
          dotMesh.userData.markerId = marker.id;
          scene.add(dotMesh);
          extraObjects.push(dotMesh);
        }
      }

      if (markerType === 'paint' && marker.paintPoints && marker.paintPoints.length > 0) {
        const pts = [pos, ...marker.paintPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: true, depthWrite: false, linewidth: 3 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 999;
        scene.add(line);
        extraObjects.push(line);

        const tubePts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
        for (const tp of tubePts) {
          const dotGeo = new THREE.SphereGeometry(0.025, 6, 4);
          const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
          const dotMesh = new THREE.Mesh(dotGeo, dotMat);
          dotMesh.position.copy(tp);
          dotMesh.renderOrder = 1000;
          dotMesh.userData.isPainMarker = true;
          dotMesh.userData.markerId = marker.id;
          scene.add(dotMesh);
          extraObjects.push(dotMesh);
        }
      }

      painMarkerMeshesRef.current.set(marker.id, { inner: innerMesh, outer: outerMesh, extra: extraObjects.length > 0 ? extraObjects : undefined });
    }
  }, [painMarkers]);

  useEffect(() => {
    return () => {
      painMarkerMeshesRef.current.forEach((meshes) => {
        if (meshes.inner.parent) meshes.inner.parent.remove(meshes.inner);
        if (meshes.outer.parent) meshes.outer.parent.remove(meshes.outer);
        meshes.inner.geometry.dispose();
        meshes.outer.geometry.dispose();
        (meshes.inner.material as THREE.Material).dispose();
        (meshes.outer.material as THREE.Material).dispose();
        if (meshes.extra) {
          meshes.extra.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
            else if (obj instanceof THREE.Line) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
          });
        }
      });
      painMarkerMeshesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !enablePainMarkers) return;
    const { renderer, camera, scene, model, controls } = sceneRef.current;
    if (!model || !renderer) return;
    const domElement = renderer.domElement;

    const getMouseNDC = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const cachedModelMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        cachedModelMeshes.push(child);
        if (child.geometry) {
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat) mat.side = THREE.DoubleSide;
        });
      }
    });
    const getVisibleMeshes = () => cachedModelMeshes.filter(m => m.visible);
    const getAllMeshes = () => cachedModelMeshes;

    const vertexCacheRef = { verts: null as THREE.Vector3[] | null, normals: null as THREE.Vector3[] | null, matrixHash: '', useAll: false };
    const getMatrixHash = (useAll: boolean) => {
      let h = useAll ? 'ALL:' : 'VIS:';
      for (let i = 0; i < Math.min(cachedModelMeshes.length, 5); i++) {
        const m = cachedModelMeshes[i].matrixWorld.elements;
        h += m[12].toFixed(3) + m[13].toFixed(3) + m[14].toFixed(3);
      }
      return h;
    };
    const buildVertexCache = (useAll = false) => {
      const hash = getMatrixHash(useAll);
      if (vertexCacheRef.verts && vertexCacheRef.matrixHash === hash) return;
      const meshes = useAll ? getAllMeshes() : getVisibleMeshes();
      for (const mesh of meshes) {
        mesh.updateMatrixWorld(true);
      }
      vertexCacheRef.verts = [];
      vertexCacheRef.normals = [];
      vertexCacheRef.useAll = useAll;
      const tempV = new THREE.Vector3();
      const tempN = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3();
      for (const mesh of meshes) {
        const geo = mesh.geometry;
        if (!geo || !geo.attributes.position) continue;
        const posAttr = geo.attributes.position;
        const normalAttr = geo.attributes.normal;
        normalMatrix.getNormalMatrix(mesh.matrixWorld);
        for (let i = 0; i < posAttr.count; i++) {
          tempV.fromBufferAttribute(posAttr, i);
          tempV.applyMatrix4(mesh.matrixWorld);
          vertexCacheRef.verts.push(tempV.clone());
          if (normalAttr) {
            tempN.fromBufferAttribute(normalAttr, i);
            tempN.applyMatrix3(normalMatrix).normalize();
            vertexCacheRef.normals!.push(tempN.clone());
          } else {
            vertexCacheRef.normals!.push(new THREE.Vector3(0, 0, 1));
          }
        }
      }
      vertexCacheRef.matrixHash = hash;
    };

    const findNearestSurfaceVertex = (ray: THREE.Ray, meshes: THREE.Mesh[]): THREE.Vector3 | null => {
      let bestPoint: THREE.Vector3 | null = null;
      let bestDist = 0.8;
      const worldVert = new THREE.Vector3();
      const closestOnRay = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const viewDir = ray.direction;
      for (const mesh of meshes) {
        if (!mesh.visible) continue;
        const geom = mesh.geometry;
        const posAttr = geom.attributes.position;
        const normalAttr = geom.attributes.normal;
        if (!posAttr) continue;
        const isSkinned = (mesh as any).isSkinnedMesh;
        if (isSkinned) {
          const sm = mesh as THREE.SkinnedMesh;
          if (sm.skeleton) {
            sm.skeleton.update();
          }
        }
        const stride = Math.max(1, Math.floor(posAttr.count / 800));
        for (let i = 0; i < posAttr.count; i += stride) {
          worldVert.fromBufferAttribute(posAttr, i);
          if (isSkinned) {
            try {
              (mesh as THREE.SkinnedMesh).applyBoneTransform(i, worldVert);
              mesh.localToWorld(worldVert);
            } catch {
              mesh.localToWorld(worldVert);
            }
          } else {
            mesh.localToWorld(worldVert);
          }
          ray.closestPointToPoint(worldVert, closestOnRay);
          const d = worldVert.distanceTo(closestOnRay);
          if (d >= bestDist) continue;
          if (!isSkinned && normalAttr) {
            normal.fromBufferAttribute(normalAttr, i);
            normal.transformDirection(mesh.matrixWorld);
            if (normal.dot(viewDir) > 0.3) continue;
          }
          if (isSkinned) {
            const toVert = worldVert.clone().sub(closestOnRay).normalize();
            if (toVert.dot(viewDir) > 0.5) continue;
          }
          bestDist = d;
          bestPoint = worldVert.clone();
        }
      }
      return bestPoint;
    };

    const raycastBonePosition = (ndc: THREE.Vector2): THREE.Vector3 | null => {
      const bones = bonesRef.current;
      if (!bones || Object.keys(bones).length === 0) return null;
      raycasterRef.current.setFromCamera(ndc, camera);
      const ray = raycasterRef.current.ray;
      const worldPos = new THREE.Vector3();
      const closestOnRay = new THREE.Vector3();
      let bestBonePos: THREE.Vector3 | null = null;
      let bestRayPos: THREE.Vector3 | null = null;
      let bestDist = 2.0;
      for (const [name, bone] of Object.entries(bones)) {
        if (!BONE_ANATOMICAL_LABELS[name]) continue;
        bone.getWorldPosition(worldPos);
        ray.closestPointToPoint(worldPos, closestOnRay);
        const d = worldPos.distanceTo(closestOnRay);
        if (d < bestDist) {
          bestDist = d;
          bestBonePos = worldPos.clone();
          bestRayPos = closestOnRay.clone();
        }
      }
      const virtualPoints: Array<{ boneA: string; boneB: string; t: number; offsetX?: number; offsetZ?: number }> = [
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.2 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.5 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.8 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: -0.15 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetX: 0.15 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetZ: 0.1 },
        { boneA: 'Chest_M', boneB: 'Spine1Part2_M', t: 0.3, offsetZ: -0.1 },
        { boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.3, offsetX: -0.18 },
        { boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.3, offsetX: 0.18 },
        { boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.5 },
        { boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.7 },
        { boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.3, offsetX: -0.15 },
        { boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.3, offsetX: 0.15 },
        { boneA: 'Spine1Part1_M', boneB: 'Spine1_M', t: 0.5 },
        { boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.3 },
        { boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.7 },
        { boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.3 },
        { boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.7 },
        { boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.5 },
        { boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.5 },
        { boneA: 'NeckPart1_M', boneB: 'NeckPart2_M', t: 0.5 },
        { boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.3 },
        { boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.7 },
        { boneA: 'Root_M', boneB: 'Hip_L', t: 0.3 },
        { boneA: 'Root_M', boneB: 'Hip_R', t: 0.3 },
        { boneA: 'Hip_L', boneB: 'HipPart1_L', t: 0.5 },
        { boneA: 'Hip_R', boneB: 'HipPart1_R', t: 0.5 },
        { boneA: 'HipPart1_L', boneB: 'Knee_L', t: 0.5 },
        { boneA: 'HipPart1_R', boneB: 'Knee_R', t: 0.5 },
        { boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.3 },
        { boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.7 },
        { boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.3 },
        { boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.7 },
        { boneA: 'Shoulder_L', boneB: 'Elbow_L', t: 0.3 },
        { boneA: 'Shoulder_L', boneB: 'Elbow_L', t: 0.7 },
        { boneA: 'Shoulder_R', boneB: 'Elbow_R', t: 0.3 },
        { boneA: 'Shoulder_R', boneB: 'Elbow_R', t: 0.7 },
        { boneA: 'Elbow_L', boneB: 'Wrist_L', t: 0.5 },
        { boneA: 'Elbow_R', boneB: 'Wrist_R', t: 0.5 },
      ];
      const posA = new THREE.Vector3();
      const posB = new THREE.Vector3();
      const virtPos = new THREE.Vector3();
      for (const vp of virtualPoints) {
        const bA = bones[vp.boneA];
        const bB = bones[vp.boneB];
        if (!bA || !bB) continue;
        bA.getWorldPosition(posA);
        bB.getWorldPosition(posB);
        virtPos.lerpVectors(posA, posB, vp.t);
        if (vp.offsetX) virtPos.x += vp.offsetX;
        if (vp.offsetZ) virtPos.z += vp.offsetZ;
        ray.closestPointToPoint(virtPos, closestOnRay);
        const d = virtPos.distanceTo(closestOnRay);
        if (d < bestDist) {
          bestDist = d;
          bestBonePos = virtPos.clone();
          bestRayPos = closestOnRay.clone();
        }
      }
      if (!bestBonePos || !bestRayPos) return null;
      const nearestSurfaceVert = findNearestSurfaceVertex(ray, cachedModelMeshes);
      if (nearestSurfaceVert) return nearestSurfaceVert;
      const modelBox = new THREE.Box3().setFromObject(model);
      const entryPoint = new THREE.Vector3();
      if (ray.intersectBox(modelBox, entryPoint)) return entryPoint;
      return bestRayPos;
    };

    const raycastModel = (ndc: THREE.Vector2, preciseOnly = false): THREE.Vector3 | null => {
      const allMeshes = getAllMeshes();
      const visibleMeshes = getVisibleMeshes();
      const primaryMeshes = visibleMeshes.length > 0 ? visibleMeshes : allMeshes;
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(primaryMeshes, true);
      if (hits.length > 0) return hits[0].point.clone();

      if (visibleMeshes.length < allMeshes.length) {
        const allHits = raycasterRef.current.intersectObjects(allMeshes, true);
        if (allHits.length > 0) return allHits[0].point.clone();
      }

      const boneHit = raycastBonePosition(ndc);
      if (boneHit) return boneHit;

      if (preciseOnly) return null;

      const modelBox = new THREE.Box3().setFromObject(model);
      const modelSize = modelBox.getSize(new THREE.Vector3()).length();
      const camDist = camera.position.distanceTo(modelBox.getCenter(new THREE.Vector3()));
      const spread = Math.max(0.015, Math.min(0.08, (modelSize / camDist) * 0.025));

      const offsets: number[][] = [];
      const rings = [0.3, 0.5, 0.7, 1, 1.5, 2, 2.5, 3, 4, 5];
      for (const r of rings) {
        const steps = r <= 1 ? 6 : 10;
        for (let a = 0; a < steps; a++) {
          const angle = (a / steps) * Math.PI * 2;
          offsets.push([Math.cos(angle) * spread * r, Math.sin(angle) * spread * r]);
        }
      }
      const tempNdc = new THREE.Vector2();
      let closestHit: THREE.Vector3 | null = null;
      let closestDist = Infinity;
      for (const [dx, dy] of offsets) {
        tempNdc.set(ndc.x + dx, ndc.y + dy);
        raycasterRef.current.setFromCamera(tempNdc, camera);
        const spreadHits = raycasterRef.current.intersectObjects(allMeshes, true);
        if (spreadHits.length > 0) {
          const pt = spreadHits[0].point;
          const d = pt.distanceTo(camera.position);
          if (d < closestDist) {
            closestDist = d;
            closestHit = pt.clone();
          }
        }
      }
      if (closestHit) return closestHit;

      buildVertexCache(true);
      if (!vertexCacheRef.verts || !vertexCacheRef.normals) return null;

      raycasterRef.current.setFromCamera(ndc, camera);
      const ray = raycasterRef.current.ray;
      let bestPoint: THREE.Vector3 | null = null;
      let bestScore = Infinity;
      const closestOnRay = new THREE.Vector3();
      const maxSnapDist = 1.5;
      for (let i = 0; i < vertexCacheRef.verts.length; i++) {
        const v = vertexCacheRef.verts[i];
        ray.closestPointToPoint(v, closestOnRay);
        const d = v.distanceTo(closestOnRay);
        if (d > maxSnapDist) continue;
        const normal = vertexCacheRef.normals[i];
        const viewDir = ray.direction;
        const facing = normal.dot(viewDir);
        const score = d + (facing < 0 ? 0 : 0.15);
        if (score < bestScore) {
          bestScore = score;
          bestPoint = v.clone();
        }
      }
      return bestPoint;
    };

    const raycastPainMarkers = (ndc: THREE.Vector2): string | null => {
      raycasterRef.current.setFromCamera(ndc, camera);
      const markerMeshes: THREE.Mesh[] = [];
      painMarkerMeshesRef.current.forEach((meshes) => {
        markerMeshes.push(meshes.inner);
      });
      const hits = raycasterRef.current.intersectObjects(markerMeshes, false);
      if (hits.length > 0) return hits[0].object.userData.markerId;
      return null;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!enablePainMarkersRef.current) return;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      if (e.button === 2) {
        const ndc = getMouseNDC(e);
        const markerId = raycastPainMarkers(ndc);
        if (markerId) {
          e.preventDefault();
          e.stopPropagation();
          pendingReferralRef.current = null;
          pendingLineRef.current = null;
          areaDragRef.current = null;
          painMarkerCallbacksRef.current.onPainMarkerRemove?.(markerId);
          return;
        }
        pendingReferralRef.current = null;
        pendingLineRef.current = null;
        areaDragRef.current = null;
        return;
      }

      if (e.button === 0) {
        const ndc = getMouseNDC(e);
        const markerId = raycastPainMarkers(ndc);
        if (markerId && !pendingReferralRef.current && !pendingLineRef.current) {
          const meshes = painMarkerMeshesRef.current.get(markerId);
          if (meshes) {
            draggingMarkerRef.current = { id: markerId, mesh: meshes.inner, outerMesh: meshes.outer, hasMoved: false };
            controls.enabled = false;
            domElement.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }

        if (activePainMarkerTypeRef.current === 'area') {
          const hitPoint = raycastModel(ndc);
          if (hitPoint) {
            const boneInfo = findNearestBone(hitPoint);
            const id = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            areaDragRef.current = { startPoint: hitPoint.clone(), markerId: id };
            controls.enabled = false;
            const marker: PainMarker = {
              id,
              type: 'area',
              position: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
              nearestBone: boneInfo.boneName,
              anatomicalLabel: boneInfo.label,
              radius: 0.05,
            };
            painMarkerCallbacksRef.current.onPainMarkerAdd?.(marker);
            e.preventDefault();
          }
        }

        if (activePainMarkerTypeRef.current === 'paint') {
          const hitPoint = raycastModel(ndc);
          if (hitPoint) {
            const boneInfo = findNearestBone(hitPoint);
            const id = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            paintingRef.current = { id, points: [], lastSampleTime: Date.now() };
            controls.enabled = false;
            const marker: PainMarker = {
              id,
              type: 'paint',
              position: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
              nearestBone: boneInfo.boneName,
              anatomicalLabel: boneInfo.label,
              paintPoints: [],
            };
            painMarkerCallbacksRef.current.onPainMarkerAdd?.(marker);
            domElement.style.cursor = 'crosshair';
            e.preventDefault();
          }
        }
      }
    };

    const finishDrag = () => {
      if (!draggingMarkerRef.current) return;
      const drag = draggingMarkerRef.current;
      const pos = drag.mesh.position;
      const boneInfo = findNearestBone(pos);
      painMarkerCallbacksRef.current.onPainMarkerMove?.(
        drag.id,
        { x: pos.x, y: pos.y, z: pos.z },
        boneInfo.boneName,
        boneInfo.label
      );
      draggingMarkerRef.current = null;
      controls.enabled = true;
      domElement.style.cursor = '';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (draggingMarkerRef.current) {
        const ndc = getMouseNDC(e);
        const hitPoint = raycastModel(ndc, true);
        if (hitPoint) {
          draggingMarkerRef.current.hasMoved = true;
          draggingMarkerRef.current.mesh.position.copy(hitPoint);
          draggingMarkerRef.current.outerMesh.position.copy(hitPoint);
        }
        e.preventDefault();
        return;
      }

      if (areaDragRef.current) {
        const ndc = getMouseNDC(e);
        const hitPoint = raycastModel(ndc, true);
        if (hitPoint) {
          const radius = Math.max(0.05, areaDragRef.current.startPoint.distanceTo(hitPoint));
          painMarkerCallbacksRef.current.onPainMarkerUpdate?.(areaDragRef.current.markerId, { radius });
        }
        e.preventDefault();
        return;
      }

      if (paintingRef.current) {
        const now = Date.now();
        if (now - paintingRef.current.lastSampleTime < 40) return;
        const ndc = getMouseNDC(e);
        const hitPoint = raycastModel(ndc, true);
        if (hitPoint) {
          paintingRef.current.lastSampleTime = now;
          paintingRef.current.points.push({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z });
          if (paintingRef.current.points.length % 3 === 0) {
            painMarkerCallbacksRef.current.onPainMarkerUpdate?.(paintingRef.current.id, {
              paintPoints: [...paintingRef.current.points],
            });
          }
        }
        e.preventDefault();
        return;
      }

      if (!enablePainMarkersRef.current) return;
      const ndc = getMouseNDC(e);
      const markerId = raycastPainMarkers(ndc);
      domElement.style.cursor = markerId ? 'grab' : (pendingReferralRef.current || pendingLineRef.current ? 'crosshair' : '');
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      if (draggingMarkerRef.current) {
        const drag = draggingMarkerRef.current;
        const hasMoved = drag.hasMoved;
        const markerId = drag.id;
        finishDrag();
        mouseDownPosRef.current = null;
        if (!hasMoved) {
          painMarkerCallbacksRef.current.onPainMarkerSelect?.(markerId);
        }
        return;
      }

      if (areaDragRef.current) {
        areaDragRef.current = null;
        controls.enabled = true;
        mouseDownPosRef.current = null;
        return;
      }

      if (paintingRef.current) {
        if (paintingRef.current.points.length > 0) {
          painMarkerCallbacksRef.current.onPainMarkerUpdate?.(paintingRef.current.id, {
            paintPoints: [...paintingRef.current.points],
          });
        }
        paintingRef.current = null;
        controls.enabled = true;
        domElement.style.cursor = '';
        mouseDownPosRef.current = null;
        return;
      }

      if (!enablePainMarkersRef.current) return;
      const downPos = mouseDownPosRef.current;

      if (e.button === 0 && downPos) {
        const dx = e.clientX - downPos.x;
        const dy = e.clientY - downPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          const ndc = getMouseNDC(e);
          const existingMarker = raycastPainMarkers(ndc);
          const mType = activePainMarkerTypeRef.current;

          if (mType === 'referred' && pendingReferralRef.current) {
            if (!existingMarker) {
              const hitPoint = raycastModel(ndc);
              if (hitPoint) {
                const boneInfo = findNearestBone(hitPoint);
                painMarkerCallbacksRef.current.onPainMarkerUpdate?.(pendingReferralRef.current.id, {
                  referralTarget: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
                  referralTargetBone: boneInfo.boneName,
                  referralTargetLabel: boneInfo.label,
                });
                pendingReferralRef.current = null;
                domElement.style.cursor = '';
              }
            }
            mouseDownPosRef.current = null;
            return;
          }

          if (mType === 'line' && pendingLineRef.current) {
            if (!existingMarker) {
              const hitPoint = raycastModel(ndc);
              if (hitPoint) {
                const existing = pendingLineRef.current.linePoints || [];
                painMarkerCallbacksRef.current.onPainMarkerUpdate?.(pendingLineRef.current.id, {
                  linePoints: [...existing, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }],
                });
                pendingLineRef.current = { ...pendingLineRef.current, linePoints: [...existing, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }] };
              }
            }
            mouseDownPosRef.current = null;
            return;
          }

          if (!existingMarker && mType !== 'area' && mType !== 'paint') {
            const hitPoint = raycastModel(ndc);
            if (hitPoint) {
              const boneInfo = findNearestBone(hitPoint);
              const marker: PainMarker = {
                id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: mType,
                position: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
                nearestBone: boneInfo.boneName,
                anatomicalLabel: boneInfo.label,
              };

              if (mType === 'referred') {
                pendingReferralRef.current = marker;
                domElement.style.cursor = 'crosshair';
              }
              if (mType === 'line') {
                marker.linePoints = [];
                pendingLineRef.current = marker;
                domElement.style.cursor = 'crosshair';
              }

              painMarkerCallbacksRef.current.onPainMarkerAdd?.(marker);
            }
          }
        }
      }

      mouseDownPosRef.current = null;
    };

    const onDblClick = (e: MouseEvent) => {
      if (!enablePainMarkersRef.current) return;
      if (pendingLineRef.current) {
        pendingLineRef.current = null;
        domElement.style.cursor = '';
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!enablePainMarkersRef.current) return;
      const ndc = getMouseNDC(e);
      const markerId = raycastPainMarkers(ndc);
      if (markerId) {
        e.preventDefault();
      }
    };

    const cleanupPaintDrag = () => {
      if (paintingRef.current) {
        if (paintingRef.current.points.length > 0) {
          painMarkerCallbacksRef.current.onPainMarkerUpdate?.(paintingRef.current.id, {
            paintPoints: [...paintingRef.current.points],
          });
        }
        paintingRef.current = null;
        controls.enabled = true;
        domElement.style.cursor = '';
      }
      if (areaDragRef.current) {
        areaDragRef.current = null;
        controls.enabled = true;
      }
    };

    const onMouseLeave = () => {
      cleanupPaintDrag();
      if (draggingMarkerRef.current) {
        finishDrag();
      }
    };

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    domElement.addEventListener('dblclick', onDblClick);
    domElement.addEventListener('contextmenu', onContextMenu);
    domElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      domElement.removeEventListener('dblclick', onDblClick);
      domElement.removeEventListener('contextmenu', onContextMenu);
      domElement.removeEventListener('mouseleave', onMouseLeave);
      if (draggingMarkerRef.current) {
        draggingMarkerRef.current = null;
        controls.enabled = true;
        domElement.style.cursor = '';
      }
      areaDragRef.current = null;
      paintingRef.current = null;
      pendingReferralRef.current = null;
      pendingLineRef.current = null;
    };
  }, [enablePainMarkers, findNearestBone]);

  useEffect(() => {
    if (!sceneRef.current || !enableRomMode) return;
    const { scene } = sceneRef.current;
    const bones = bonesRef.current;

    romHighlightMeshesRef.current.forEach(m => { scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
    romHighlightMeshesRef.current = [];

    ROM_JOINT_DEFINITIONS.forEach(jointDef => {
      const bone = bones[jointDef.boneName];
      if (!bone) return;
      const isSelected = selectedRomJointId === jointDef.id;
      const geo = new THREE.SphereGeometry(isSelected ? 0.045 : 0.035, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00e5ff : 0x4fc3f7,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.5,
        depthTest: false,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.userData.romJointId = jointDef.id;
      sphere.userData.romBoneName = jointDef.boneName;
      sphere.renderOrder = 999;
      const worldPos = new THREE.Vector3();
      bone.getWorldPosition(worldPos);
      sphere.position.copy(worldPos);
      scene.add(sphere);
      romHighlightMeshesRef.current.push(sphere);
    });

    const updatePositions = () => {
      if (!enableRomModeRef.current) return;
      const wp = new THREE.Vector3();
      romHighlightMeshesRef.current.forEach(sphere => {
        const bn = sphere.userData.romBoneName as string;
        const b = bonesRef.current[bn];
        if (b) {
          b.getWorldPosition(wp);
          sphere.position.copy(wp);
        }
      });
      romAnimFrameRef.current = requestAnimationFrame(updatePositions);
    };
    const romAnimFrameRef = { current: requestAnimationFrame(updatePositions) };

    return () => {
      cancelAnimationFrame(romAnimFrameRef.current);
      romHighlightMeshesRef.current.forEach(m => { scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      romHighlightMeshesRef.current = [];
    };
  }, [enableRomMode, selectedRomJointId]);

  useEffect(() => {
    if (!enableRomMode || !sceneRef.current) return;
    const domElement = sceneRef.current.renderer.domElement;
    const camera = sceneRef.current.camera;

    const onClick = (e: MouseEvent) => {
      if (!enableRomModeRef.current) return;
      const rect = domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(romHighlightMeshesRef.current, false);
      if (hits.length > 0) {
        const jointId = hits[0].object.userData.romJointId;
        const jointDef = ROM_JOINT_DEFINITIONS.find(j => j.id === jointId);
        if (jointDef) {
          onRomJointSelectRef.current?.(jointDef);
        }
      }
    };

    domElement.addEventListener('click', onClick);
    return () => { domElement.removeEventListener('click', onClick); };
  }, [enableRomMode]);

  useEffect(() => {
    if (!sceneRef.current || !enablePoseMode) return;
    const { renderer, camera, scene, model, controls } = sceneRef.current;
    if (!model || !renderer) return;
    const domElement = renderer.domElement;
    const bones = bonesRef.current;

    let hoveredBone: string | null = null;
    let hoverGlow: THREE.Mesh | null = null;
    let selectedGlow: THREE.Mesh | null = null;

    const cachedMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) cachedMeshes.push(child);
    });

    const poseBoneNames = Object.keys(POSE_BONE_MAP).filter(name => !!bones[name]);
    console.log('[PoseMode] Initialized with', cachedMeshes.length, 'meshes,', poseBoneNames.length, 'pose bones:', poseBoneNames);

    const getMouseNDC = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const MAX_BONE_DISTANCE = 1.5;

    const findBoneFromRaycast = (ndc: THREE.Vector2): string | null => {
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(cachedMeshes, true);
      if (hits.length === 0) {
        const modelCenter = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(model);
        box.getCenter(modelCenter);
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          cameraDir.clone().negate(),
          modelCenter
        );
        const planeHit = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(plane, planeHit)) {
          const worldPos = new THREE.Vector3();
          let nearestBone = '';
          let nearestDist = Infinity;
          for (const name of poseBoneNames) {
            const bone = bones[name];
            bone.getWorldPosition(worldPos);
            const d = planeHit.distanceTo(worldPos);
            if (d < nearestDist) {
              nearestDist = d;
              nearestBone = name;
            }
          }
          if (nearestDist <= MAX_BONE_DISTANCE) return nearestBone;
        }
        return null;
      }
      const hitPoint = hits[0].point;
      const worldPos = new THREE.Vector3();
      let nearestBone = '';
      let nearestDist = Infinity;
      for (const name of poseBoneNames) {
        const bone = bones[name];
        bone.getWorldPosition(worldPos);
        const d = hitPoint.distanceTo(worldPos);
        if (d < nearestDist) {
          nearestDist = d;
          nearestBone = name;
        }
      }
      if (nearestDist > MAX_BONE_DISTANCE) return null;
      return nearestBone || null;
    };

    const createGlowSphere = (boneName: string, color: number, opacity: number): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(0.05, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 1001;
      const bone = bones[boneName];
      if (bone) {
        const wp = new THREE.Vector3();
        bone.getWorldPosition(wp);
        mesh.position.copy(wp);
      }
      scene.add(mesh);
      return mesh;
    };

    const removeGlow = (mesh: THREE.Mesh | null) => {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    };

    const getCurrentValue = (configKey: string): number => {
      const cfg = modelConfigRef.current;
      if (!cfg) return 0;
      const [group, prop] = configKey.split('.');
      const groupObj = (cfg as any)[group];
      return groupObj?.[prop] ?? 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!enablePoseModeRef.current) return;

      if (poseDragRef.current) {
        const dx = e.clientX - poseDragRef.current.startX;
        const dy = e.clientY - poseDragRef.current.startY;
        const useVertical = poseDragRef.current.axis === 'x';
        const rawDelta = useVertical ? -dy : dx;
        const dragDistance = rawDelta * poseDragRef.current.scale * poseDragRef.current.sensitivity;
        const cfg = POSE_BONE_MAP[poseDragRef.current.boneName];
        if (!cfg) return;
        let newValue = poseDragRef.current.startValue + dragDistance;
        newValue = Math.max(cfg.minValue, Math.min(cfg.maxValue, Math.round(newValue)));
        onModelConfigChangeRef.current?.(cfg.configKey, newValue);

        const rect = domElement.getBoundingClientRect();
        setPoseModeTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
          label: cfg.label,
          value: `${newValue}°`,
        });

        if (selectedGlow) {
          const bone = bones[poseDragRef.current.boneName];
          if (bone) {
            const wp = new THREE.Vector3();
            bone.getWorldPosition(wp);
            selectedGlow.position.copy(wp);
          }
        }
        return;
      }

      const ndc = getMouseNDC(e);
      const boneName = findBoneFromRaycast(ndc);

      if (boneName !== hoveredBone) {
        removeGlow(hoverGlow);
        hoverGlow = null;
        hoveredBone = boneName;

        if (boneName && POSE_BONE_MAP[boneName] && boneName !== poseSelectedBoneRef.current) {
          hoverGlow = createGlowSphere(boneName, 0x66ffcc, 0.4);
          domElement.style.cursor = 'grab';
          const cfg = POSE_BONE_MAP[boneName];
          const val = getCurrentValue(cfg.configKey);
          const rect = domElement.getBoundingClientRect();
          setPoseModeTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 40,
            label: cfg.label,
            value: `${val}°`,
          });
        } else {
          domElement.style.cursor = '';
          setPoseModeTooltip(null);
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!enablePoseModeRef.current || e.button !== 0) return;
      const ndc = getMouseNDC(e);
      const boneName = findBoneFromRaycast(ndc);
      if (!boneName || !POSE_BONE_MAP[boneName]) return;

      const cfg = POSE_BONE_MAP[boneName];
      const currentVal = getCurrentValue(cfg.configKey);

      removeGlow(selectedGlow);
      selectedGlow = createGlowSphere(boneName, 0x00ff88, 0.7);
      poseSelectedBoneRef.current = boneName;
      poseHighlightMeshRef.current = selectedGlow;

      poseDragRef.current = {
        boneName,
        configKey: cfg.configKey,
        startX: e.clientX,
        startY: e.clientY,
        startValue: currentVal,
        axis: cfg.axis,
        scale: cfg.scale,
        sensitivity: cfg.sensitivity,
        label: cfg.label,
      };

      controls.enabled = false;
      domElement.style.cursor = 'grabbing';
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (poseDragRef.current) {
        poseDragRef.current = null;
        controls.enabled = true;
        domElement.style.cursor = enablePoseModeRef.current ? 'grab' : '';
        setPoseModeTooltip(null);
      }
    };

    const onDblClick = (e: MouseEvent) => {
      if (!enablePoseModeRef.current) return;
      const ndc = getMouseNDC(e);
      const boneName = findBoneFromRaycast(ndc);
      if (!boneName || !POSE_BONE_MAP[boneName]) return;
      const cfg = POSE_BONE_MAP[boneName];
      onModelConfigChangeRef.current?.(cfg.configKey, 0);
      setPoseModeTooltip(null);
    };

    const poseGlowAnimFrame = { current: 0 };
    const animateGlows = () => {
      poseGlowAnimFrame.current = requestAnimationFrame(animateGlows);
      const wp = new THREE.Vector3();
      if (selectedGlow && poseSelectedBoneRef.current) {
        const bone = bones[poseSelectedBoneRef.current];
        if (bone) {
          bone.getWorldPosition(wp);
          selectedGlow.position.copy(wp);
        }
      }
      if (hoverGlow && hoveredBone) {
        const bone = bones[hoveredBone];
        if (bone) {
          bone.getWorldPosition(wp);
          hoverGlow.position.copy(wp);
        }
      }
    };
    poseGlowAnimFrame.current = requestAnimationFrame(animateGlows);

    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('dblclick', onDblClick);

    return () => {
      cancelAnimationFrame(poseGlowAnimFrame.current);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('dblclick', onDblClick);
      removeGlow(hoverGlow);
      removeGlow(selectedGlow);
      hoverGlow = null;
      selectedGlow = null;
      hoveredBone = null;
      poseSelectedBoneRef.current = null;
      poseHighlightMeshRef.current = null;
      poseDragRef.current = null;
      controls.enabled = true;
      domElement.style.cursor = '';
      setPoseModeTooltip(null);
    };
  }, [enablePoseMode, status]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (sceneRef.current) return;

    const container = containerRef.current;
    let animationId: number;
    let isDisposed = false;

    const init = async () => {
      try {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        // Use fixed camera position if provided, otherwise use preset
        if (fixedCameraPosition && fixedCameraLookAt) {
          camera.position.set(fixedCameraPosition.x, fixedCameraPosition.y, fixedCameraPosition.z);
          camera.lookAt(fixedCameraLookAt.x, fixedCameraLookAt.y, fixedCameraLookAt.z);
        } else {
          const preset = CAMERA_PRESETS[cameraAngle];
          camera.position.set(preset.position.x, preset.position.y, preset.position.z);
          camera.lookAt(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
        }

        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        renderer.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('WebGL context lost');
          setErrorMessage('WebGL context was lost - please retry');
          setStatus('error');
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, -5, -5);
        scene.add(backLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 20;
        // Set controls target based on camera lookAt
        const lookAtTarget = fixedCameraLookAt || CAMERA_PRESETS[cameraAngle].lookAt;
        controls.target.set(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
        controls.enabled = !disableControls;
        if (disableControls) {
          controls.enableRotate = false;
          controls.enableZoom = false;
          controls.enablePan = false;
          renderer.domElement.style.pointerEvents = 'none';
        }
        controls.update();

        const gridHelper = new THREE.GridHelper(10, 10, 0x333366, 0x222244);
        gridHelper.position.set(-0.15, -1.2, 0);
        scene.add(gridHelper);

        renderer.render(scene, camera);

        sceneRef.current = {
          scene,
          camera,
          renderer,
          controls,
          model: null,
          animationId: null
        };

        const loader = new GLTFLoader();
        
        loader.load(
          modelPath,
          (gltf) => {
            if (isDisposed) return;
            
            const model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4 / maxDim;
            model.scale.setScalar(scale);
            
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale - 0.5;
            model.position.z = -center.z * scale;
            
            const bones: { [name: string]: THREE.Object3D } = {};
            const boneNames: string[] = [];
            const objectTypes: string[] = [];
            
            let skullMesh: THREE.Object3D | null = null;
            
            const muscleMeshes: THREE.Object3D[] = [];
            
            const BONE_MATERIAL_NAME = 'lambert4';
            
            model.traverse((child) => {
              objectTypes.push(`${child.name}: ${child.type}`);
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                const lowerName = child.name.toLowerCase();
                const hasBoneMaterial = child.material
                  ? Array.isArray(child.material)
                    ? child.material.every((m: THREE.Material) => m.name === BONE_MATERIAL_NAME)
                    : (child.material as THREE.Material).name === BONE_MATERIAL_NAME
                  : false;
                const isMuscle = !hasBoneMaterial;
                
                if (isMuscle) {
                  muscleMeshes.push(child);
                  child.visible = showMuscles;
                  if (child.geometry) {
                    child.geometry.computeBoundingSphere();
                    child.geometry.computeBoundingBox();
                    if (child.geometry.boundingSphere) {
                      child.geometry.boundingSphere.radius = Math.max(child.geometry.boundingSphere.radius * 5, 10);
                    }
                  }
                }
                
                if (lowerName.includes('skull') || lowerName.includes('head') || lowerName.includes('cranium')) {
                  skullMesh = child;
                  console.log('Found skull mesh:', child.name);
                }
              }
              if (child instanceof THREE.Bone) {
                bones[child.name] = child;
                boneNames.push(child.name);
              }
              if ((child as any).isBone) {
                if (!bones[child.name]) {
                  bones[child.name] = child;
                  boneNames.push(child.name);
                }
              }
            });
            
            model.updateMatrixWorld(true);
            
            // Analyze skull mesh skeleton to find the controlling bone
            if (skullMesh !== null) {
              const skull = skullMesh as THREE.SkinnedMesh;
              console.log('=== SKULL MESH ANALYSIS ===');
              console.log('Is SkinnedMesh:', skull instanceof THREE.SkinnedMesh);
              if (skull instanceof THREE.SkinnedMesh && skull.skeleton) {
                console.log('Skull skeleton bones:', skull.skeleton.bones.map(b => b.name));
                
                // Analyze bone weights to find which bones actually affect the skull
                const geometry = skull.geometry;
                if (geometry.attributes.skinIndex && geometry.attributes.skinWeight) {
                  const skinIndices = geometry.attributes.skinIndex;
                  const skinWeights = geometry.attributes.skinWeight;
                  const usedBoneIndices = new Set<number>();
                  
                  // Sample first 100 vertices to find active bones
                  const sampleCount = Math.min(100, skinIndices.count);
                  for (let i = 0; i < sampleCount; i++) {
                    for (let j = 0; j < 4; j++) {
                      const weight = skinWeights.getComponent(i, j);
                      if (weight > 0.01) {
                        usedBoneIndices.add(skinIndices.getComponent(i, j));
                      }
                    }
                  }
                  
                  const usedBoneNames = Array.from(usedBoneIndices).map(idx => skull.skeleton.bones[idx]?.name || `unknown-${idx}`);
                  console.log('=== BONES THAT CONTROL SKULL VERTICES ===');
                  console.log('Active bone indices:', Array.from(usedBoneIndices));
                  console.log('Active bone names:', usedBoneNames);
                }
              }
            }
            
            console.log('=== AVAILABLE BONES IN MODEL ===');
            console.log('Total bones found:', boneNames.length);
            boneNames.forEach((name, i) => {
              const bone = bones[name];
              console.log(`${i + 1}. ${name} (parent: ${bone.parent?.name || 'none'})`);
              initialRotationsRef.current[name] = bone.rotation.clone();
              // Also store bind-pose quaternion for quaternion-based live pose tracking
              bindPoseQuaternionsRef.current[name] = bone.quaternion.clone();
            });
            console.log('=================================');
            
            
            // New skeleton model has proper bone parenting:
            // Chest_M → Scapula_L/R → Shoulder_L/R
            // Arms follow chest naturally through the bone hierarchy - no manual syncing needed
            console.log('New skeleton model loaded with proper bone hierarchy - arms follow chest naturally');
            
            // Default arm position is now set via modelConfig default slider values in TestSkeletonNew.tsx
            // Left arm defaults: Flexion(-16°), Abduction(38°), ExtRotation(27°), Retroversion(-1°), Elevation(-10°), ClavicleLength(-3mm)
            // Right arm uses the same values mirrored
            console.log('Arms will be positioned by default slider values from modelConfig');
            
            bonesRef.current = bones;
            muscleMeshesRef.current = muscleMeshes;
            console.log(`Found ${muscleMeshes.length} muscle meshes, visibility: ${showMuscles}`);
            
            if (muscleMeshes.length > 0 && splitMuscleGroupsRef.current.size === 0) {
              try {
                const groups = classifyMuscleMeshes(muscleMeshes);
                splitMuscleGroupsRef.current = groups;
                const groupIds = Array.from(groups.keys());
                console.log('Muscle groups split successfully:', groupIds);
                if (onMuscleGroupsReady) {
                  onMuscleGroupsReady(groupIds);
                }
                if (individualMuscleVisibility) {
                  groupIds.forEach(id => {
                    const visible = individualMuscleVisibility[id] !== false;
                    setMuscleGroupVisibility(groups, id, visible);
                  });
                }
              } catch (err) {
                console.error('Failed to split muscle meshes:', err);
              }
            }
            
            model.position.set(-0.15, -1.2, 0);
            scene.add(model);
            
            model.updateMatrixWorld(true);
            
            legIKStateRef.current = initializeLegIK(bones as { [name: string]: THREE.Bone });
            
            if (sceneRef.current) {
              sceneRef.current.model = model;
            }
            
            console.log('GLB model loaded successfully:', modelPath);
            setStatus('ready');
          },
          (xhr) => {
            if (xhr.lengthComputable) {
              const progress = Math.round((xhr.loaded / xhr.total) * 100);
              setLoadProgress(progress);
            }
          },
          (error: unknown) => {
            console.error('Error loading GLB:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setErrorMessage(`Failed to load model: ${errorMsg || 'Unknown error'}`);
            setStatus('error');
          }
        );

        const animate = () => {
          if (isDisposed || !sceneRef.current) return;
          
          animationId = requestAnimationFrame(animate);
          
          // New skeleton model has proper bone hierarchy:
          // Chest_M → Scapula_L/R → Shoulder_L/R
          // Arms follow chest naturally - no manual syncing needed
          
          // Apply rotations to shoulder bones from sliderRotationsRef
          // These are stored there by either: 1) sliders (when no live pose/animation) or 2) live pose effect
          const sliderRotations = sliderRotationsRef.current;
          const currentBones = bonesRef.current;
          const initialRots = initialRotationsRef.current;
          
          // Apply stored rotations to shoulder bones (live pose effect stores values here too)
          // Skip when movement animation is playing - the animation loop handles shoulders directly
          if (!animationPlayingRef.current) {
            ['Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R'].forEach(boneName => {
              const bone = currentBones[boneName] as THREE.Bone;
              const sliderRot = sliderRotations[boneName];
              const initialRot = initialRots[boneName];
              
              if (bone && sliderRot && initialRot) {
                bone.rotation.x = initialRot.x + sliderRot.x;
                bone.rotation.y = initialRot.y + sliderRot.y;
                bone.rotation.z = initialRot.z + sliderRot.z;
              }
            });
          }
          
          // Update muscle visualization to follow skeleton movement
          if (muscleVisualizationRef.current) {
            const now = performance.now();
            const lastTime = (muscleVisualizationRef.current as any).lastFrameTime || now;
            const delta = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms to prevent large jumps
            (muscleVisualizationRef.current as any).lastFrameTime = now;
            muscleVisualizationRef.current.updateFrame(delta);
          }
          
          sceneRef.current.controls.update();

          landmarkFrameCounter.current++;
          if (landmarkFrameCounter.current % 6 === 0) {
            if (enableZoomToolRef.current && containerRef.current) {
              const cam = sceneRef.current.camera;
              const ctrl = sceneRef.current.controls;
              const cameraPos = cam.position;
              const targetPos = ctrl.target;
              const viewDistance = cameraPos.distanceTo(targetPos);
              const LANDMARK_VISIBILITY_THRESHOLD = 2.5;

              if (viewDistance < LANDMARK_VISIBILITY_THRESHOLD) {
                const bones = bonesRef.current;
                const rect = containerRef.current.getBoundingClientRect();
                const projectedLabels: Array<{ label: string; boneName: string; screenX: number; screenY: number; worldPos: { x: number; y: number; z: number }; distance: number }> = [];
                const tempPosA = new THREE.Vector3();
                const tempPosB = new THREE.Vector3();
                const tempVirt = new THREE.Vector3();
                const projVec = new THREE.Vector3();

                for (const [name, bone] of Object.entries(bones)) {
                  if (!BONE_ANATOMICAL_LABELS[name]) continue;
                  bone.getWorldPosition(tempVirt);
                  const dist = cameraPos.distanceTo(tempVirt);
                  if (dist > 3) continue;
                  projVec.copy(tempVirt).project(cam);
                  const sx = (projVec.x * 0.5 + 0.5) * rect.width;
                  const sy = (-projVec.y * 0.5 + 0.5) * rect.height;
                  if (projVec.z > 0 && projVec.z < 1 && sx > 0 && sx < rect.width && sy > 0 && sy < rect.height) {
                    projectedLabels.push({
                      label: BONE_ANATOMICAL_LABELS[name],
                      boneName: name,
                      screenX: sx,
                      screenY: sy,
                      worldPos: { x: tempVirt.x, y: tempVirt.y, z: tempVirt.z },
                      distance: dist
                    });
                  }
                }

                for (const vp of ANATOMICAL_VIRTUAL_POINTS) {
                  const boneA = bones[vp.boneA];
                  const boneB = bones[vp.boneB];
                  if (!boneA || !boneB) continue;
                  boneA.getWorldPosition(tempPosA);
                  boneB.getWorldPosition(tempPosB);
                  tempVirt.lerpVectors(tempPosA, tempPosB, vp.t);
                  if (vp.offsetX) tempVirt.x += vp.offsetX;
                  if (vp.offsetY) tempVirt.y += vp.offsetY;
                  if (vp.offsetZ) tempVirt.z += vp.offsetZ;
                  const dist = cameraPos.distanceTo(tempVirt);
                  if (dist > 3) continue;
                  projVec.copy(tempVirt).project(cam);
                  const sx = (projVec.x * 0.5 + 0.5) * rect.width;
                  const sy = (-projVec.y * 0.5 + 0.5) * rect.height;
                  if (projVec.z > 0 && projVec.z < 1 && sx > 0 && sx < rect.width && sy > 0 && sy < rect.height) {
                    projectedLabels.push({
                      label: vp.label,
                      boneName: vp.boneName,
                      screenX: sx,
                      screenY: sy,
                      worldPos: { x: tempVirt.x, y: tempVirt.y, z: tempVirt.z },
                      distance: dist
                    });
                  }
                }

                projectedLabels.sort((a, b) => a.distance - b.distance);
                setLandmarkLabels(projectedLabels.slice(0, 15));
              } else {
                setLandmarkLabels(prev => prev.length > 0 ? [] : prev);
              }
            } else {
              setLandmarkLabels(prev => prev.length > 0 ? [] : prev);
            }
          }

          forceFrameCounter.current++;
          if (forceFrameCounter.current % 3 === 0 && forceOverlayRef.current && forceOverlayRef.current.length > 0 && containerRef.current) {
            const bones = bonesRef.current;
            const cam = sceneRef.current.camera;
            const rect = containerRef.current.getBoundingClientRect();
            const projectedForces: Array<{ joint: string; label: string; totalForce: number; status: string; screenX: number; screenY: number }> = [];
            const tmpVec = new THREE.Vector3();
            const projV = new THREE.Vector3();
            const seenBones = new Set<string>();

            for (const fj of forceOverlayRef.current) {
              const boneName = fj.boneName || FORCE_JOINT_TO_BONE[fj.id];
              if (!boneName) continue;
              if (seenBones.has(boneName + fj.id)) continue;
              seenBones.add(boneName + fj.id);
              const bone = bones[boneName];
              if (!bone) continue;
              bone.getWorldPosition(tmpVec);
              projV.copy(tmpVec).project(cam);
              const sx = (projV.x * 0.5 + 0.5) * rect.width;
              const sy = (-projV.y * 0.5 + 0.5) * rect.height;
              if (projV.z > 0 && projV.z < 1 && sx > -20 && sx < rect.width + 20 && sy > -20 && sy < rect.height + 20) {
                projectedForces.push({
                  joint: fj.id,
                  label: fj.label,
                  totalForce: fj.totalForce,
                  status: fj.status,
                  screenX: sx,
                  screenY: sy,
                });
              }
            }
            setForceLabels(projectedForces);
          } else if (!forceOverlayRef.current || forceOverlayRef.current.length === 0) {
            setForceLabels(prev => prev.length > 0 ? [] : prev);
          }

          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        };
        
        animate();

        const handleResize = () => {
          if (!sceneRef.current || !containerRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          if (width === 0 || height === 0) return;
          
          sceneRef.current.camera.aspect = width / height;
          sceneRef.current.camera.updateProjectionMatrix();
          sceneRef.current.renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(container);

        return () => {
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
        };

      } catch (error) {
        console.error('3D initialization error:', error);
        setErrorMessage(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        setStatus('error');
      }
    };

    init();

    return () => {
      isDisposed = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (sceneRef.current) {
        sceneRef.current.controls.dispose();
        sceneRef.current.renderer.dispose();
        if (container.contains(sceneRef.current.renderer.domElement)) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current = null;
      }
    };
  }, [modelPath]);

  // Update camera and controls when cameraAngle or disableControls props change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { camera, controls, renderer } = sceneRef.current;
    
    // Use fixed camera position if provided, otherwise use preset
    if (fixedCameraPosition && fixedCameraLookAt) {
      camera.position.set(fixedCameraPosition.x, fixedCameraPosition.y, fixedCameraPosition.z);
      camera.lookAt(fixedCameraLookAt.x, fixedCameraLookAt.y, fixedCameraLookAt.z);
      controls.target.set(fixedCameraLookAt.x, fixedCameraLookAt.y, fixedCameraLookAt.z);
    } else {
      const preset = CAMERA_PRESETS[cameraAngle];
      camera.position.set(preset.position.x, preset.position.y, preset.position.z);
      camera.lookAt(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
      controls.target.set(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
    }
    
    // Update controls enabled state
    controls.enabled = !disableControls;
    
    // Fully lock the view when controls are disabled - block all pointer events on canvas
    if (disableControls) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      renderer.domElement.style.pointerEvents = 'none';
    } else {
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
      renderer.domElement.style.pointerEvents = 'auto';
    }
    
    controls.update();
  }, [cameraAngle, disableControls]);

  // Compensation highlighting effect - color joints that are compensating for restrictions
  useEffect(() => {
    if (!sceneRef.current || status !== 'ready') return;
    if (!compensatingJoints || compensatingJoints.length === 0) {
      // Reset all materials to original when no compensations
      if (originalMaterialsRef.current.size > 0) {
        sceneRef.current.model?.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const originalMat = originalMaterialsRef.current.get(child);
            if (originalMat) {
              child.material = originalMat;
            }
          }
        });
      }
      return;
    }

    const JOINT_TO_MESH: Record<string, string[]> = {
      'lumbar_spine': ['Spine1_M'],
      'thoracic_spine': ['Chest_M'],
      'cervical_spine': ['Neck_M'],
      'pelvis': ['Root_M'],
      'left_hip': ['Hip_L'],
      'right_hip': ['Hip_R'],
      'left_knee': ['Knee_L'],
      'right_knee': ['Knee_R'],
      'left_ankle': ['Ankle_L'],
      'right_ankle': ['Ankle_R'],
      'left_shoulder': ['Shoulder_L'],
      'right_shoulder': ['Shoulder_R'],
    };

    // Collect all meshes that should be highlighted
    const meshesToHighlight = new Map<string, number>(); // meshName -> max load increase
    compensatingJoints.forEach(({ joint, loadIncrease }) => {
      const meshNames = JOINT_TO_MESH[joint] || [];
      meshNames.forEach(meshName => {
        const current = meshesToHighlight.get(meshName) || 0;
        meshesToHighlight.set(meshName, Math.max(current, loadIncrease));
      });
    });

    // Apply yellow/orange/red emissive glow to compensating meshes
    sceneRef.current.model?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const meshName = child.name || '';
        const loadIncrease = meshesToHighlight.get(meshName);
        
        if (loadIncrease !== undefined) {
          // Store original material if not already stored
          if (!originalMaterialsRef.current.has(child)) {
            originalMaterialsRef.current.set(child, child.material);
          }
          
          // Create emissive material based on load increase
          const intensity = Math.min(loadIncrease / 40, 1); // Normalize 0-40% to 0-1
          const color = intensity > 0.6 
            ? new THREE.Color(0xff4400) // Red-orange for high load
            : intensity > 0.3 
              ? new THREE.Color(0xff8800) // Orange for medium load
              : new THREE.Color(0xffcc00); // Yellow for low load
          
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive = color;
              mat.emissiveIntensity = 0.3 + intensity * 0.4;
            }
          });
        } else {
          // Reset non-compensating meshes to original
          const originalMat = originalMaterialsRef.current.get(child);
          if (originalMat) {
            child.material = originalMat;
          }
        }
      }
    });
  }, [compensatingJoints, status]);

  // Apply live pose from camera capture using BONE_MAPPING directly
  // Converts Skeleton3DPose to controller values and applies using the same infrastructure as sliders
  useEffect(() => {
    if (status !== 'ready' || !livePose) return;
    
    const bones = bonesRef.current;
    const initialRotations = initialRotationsRef.current;
    
    if (Object.keys(bones).length === 0) return;

    /**
     * BONE_MAPPING-BASED LIVE POSE APPLICATION
     * 
     * Converts the MediaPipe pose to controller values, then applies
     * using the exact same BONE_MAPPING infrastructure as the sliders.
     * 
     * This guarantees consistency because we're using the same code path.
     */
    
    // Convert raw pose to controller-compatible values
    const controllerValues = poseToControllerValues(livePose);
    
    // Map controller values to BONE_MAPPING keys (values in radians, matching slider behavior)
    const livePoseConfig: { [key: string]: number } = {
      // Shoulders - flexion and abduction
      'leftShoulder.flexion': controllerValues.leftShoulder.flexion,
      'leftShoulder.abduction': controllerValues.leftShoulder.abduction,
      'rightShoulder.flexion': controllerValues.rightShoulder.flexion,
      'rightShoulder.abduction': controllerValues.rightShoulder.abduction,
      // Elbows - flexion only
      'leftElbow.flexion': controllerValues.leftElbow.flexion,
      'rightElbow.flexion': controllerValues.rightElbow.flexion,
      // Hips - flexion and abduction
      'leftHip.flexion': controllerValues.leftHip.flexion,
      'leftHip.abduction': controllerValues.leftHip.abduction,
      'rightHip.flexion': controllerValues.rightHip.flexion,
      'rightHip.abduction': controllerValues.rightHip.abduction,
      // Knees - flexion only
      'leftKnee.flexion': controllerValues.leftKnee.flexion,
      'rightKnee.flexion': controllerValues.rightKnee.flexion,
      // Pelvis
      'pelvis.tilt': controllerValues.pelvis.tilt,
      'pelvis.obliquity': controllerValues.pelvis.obliquity,
      // Spine - forward/lateral bending distributed across spine bones
      'spine.flexion': controllerValues.spine.flexion,
      'spine.lateralFlexion': controllerValues.spine.lateralFlexion,
      // Neck - yaw/pitch/roll for head tracking
      'neck.flexion': controllerValues.neck.flexion,
      'neck.rotation': controllerValues.neck.rotation,
      'neck.lateralFlexion': controllerValues.neck.lateralFlexion,
    };
    
    // Track rotation deltas per bone (same approach as slider system)
    const boneRotationDeltas: { [boneName: string]: { x: number; y: number; z: number } } = {};
    
    // Process each live pose config through BONE_MAPPING
    Object.entries(livePoseConfig).forEach(([configKey, value]) => {
      const mappings = BONE_MAPPING[configKey];
      if (!mappings) return;
      
      // Value is already in radians (from poseToControllerValues)
      // Apply the BONE_MAPPING scale directly (no degree conversion needed)
      mappings.forEach(({ boneName, axis, scale, isPosition }) => {
        if (isPosition) return; // Skip position-based for now
        
        const adjustedAngle = value * scale;
        
        if (!boneRotationDeltas[boneName]) {
          boneRotationDeltas[boneName] = { x: 0, y: 0, z: 0 };
        }
        
        if (axis === 'x') boneRotationDeltas[boneName].x += adjustedAngle;
        else if (axis === 'y') boneRotationDeltas[boneName].y += adjustedAngle;
        else if (axis === 'z') boneRotationDeltas[boneName].z += adjustedAngle;
      });
    });
    
    // Bones that are handled by the animation loop (need rotations stored in sliderRotationsRef)
    const animationLoopBones = new Set(['Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R']);
    
    // Apply rotations to bones (initial + delta, same as slider system)
    Object.entries(boneRotationDeltas).forEach(([boneName, delta]) => {
      const bone = bones[boneName] as THREE.Bone;
      const initial = initialRotations[boneName];
      if (!bone || !initial) return;
      
      if (animationLoopBones.has(boneName)) {
        // For animation loop bones, merge deltas into sliderRotationsRef for the animation loop to use
        // This is critical because the animation loop overwrites direct bone rotations
        sliderRotationsRef.current[boneName] = delta;
      } else {
        // For regular bones, apply directly
        bone.rotation.set(
          initial.x + delta.x,
          initial.y + delta.y,
          initial.z + delta.z
        );
      }
    });

  }, [livePose, status]);
  
  // Track if live pose is active (to disable slider conflicts)
  const isLivePoseActive = livePose !== null;
  
  // Store previous livePose ref to detect when live mode exits
  const prevLivePoseRef = useRef<typeof livePose>(null);
  
  // List of all bones controlled by live pose (for restoration)
  // These are all bones that can be affected by BONE_MAPPING keys used in livePoseConfig
  const LIVE_CONTROLLED_BONES = [
    // Shoulders
    'Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R',
    // Elbows
    'Elbow_L', 'Elbow_R',
    // Wrists
    'Wrist_L', 'Wrist_R',
    // Hips
    'Hip_L', 'Hip_R', 'HipPart1_L', 'HipPart1_R',
    // Knees
    'Knee_L', 'Knee_R',
    // Ankles
    'Ankle_L', 'Ankle_R',
    // Pelvis
    'Root_M', 'RootPart1_M', 'RootPart2_M',
    // Spine
    'Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M', 'Chest_M',
    // Neck
    'Neck_M', 'NeckPart1_M', 'NeckPart2_M', 'Head_M'
  ];
  
  // Restore all controlled bones when live pose mode exits
  useEffect(() => {
    const wasLivePoseActive = prevLivePoseRef.current !== null;
    const isNowInactive = livePose === null;
    
    // Update ref
    prevLivePoseRef.current = livePose;
    
    // If we just exited live mode, restore ALL controlled bones to bind + slider state
    if (wasLivePoseActive && isNowInactive && status === 'ready') {
      const bones = bonesRef.current;
      const initialRotations = initialRotationsRef.current;
      const sliderRotations = sliderRotationsRef.current;
      
      // Reset ALL bones that were controlled by live pose
      LIVE_CONTROLLED_BONES.forEach(boneName => {
        const bone = bones[boneName] as THREE.Bone;
        const initial = initialRotations[boneName];
        if (!bone || !initial) return;
        
        // Get slider offset if any, otherwise use zero
        const sliderOffset = sliderRotations[boneName] || { x: 0, y: 0, z: 0 };
        
        // Restore to initial (bind) pose + any slider adjustments
        bone.rotation.set(
          initial.x + sliderOffset.x,
          initial.y + sliderOffset.y,
          initial.z + sliderOffset.z
        );
      });
    }
  }, [livePose, status]);

  useEffect(() => {
    if (status !== 'ready' || !modelConfig) return;
    
    // SKIP slider-based bone control when live pose is active
    // Live pose takes full control of these bones
    if (livePose) return;
    
    const bones = bonesRef.current;
    const initialRotations = initialRotationsRef.current;
    
    if (Object.keys(bones).length === 0) return;
    
    // First, collect all rotation contributions per bone per axis
    const boneRotations: { [boneName: string]: { x: number; y: number; z: number } } = {};
    const bonePositions: { [boneName: string]: { x: number; y: number; z: number } } = {};
    
    // Initialize all bones to their initial rotation
    Object.keys(bones).forEach(boneName => {
      const initial = initialRotations[boneName];
      if (initial) {
        boneRotations[boneName] = { x: initial.x, y: initial.y, z: initial.z };
      }
      // Store initial positions for position-based transforms
      const bone = bones[boneName];
      if (bone) {
        if (!bonePositions[boneName]) {
          bonePositions[boneName] = { x: 0, y: 0, z: 0 }; // Store offsets from initial
        }
      }
    });
    
    // Bones that are handled by animation loop (need slider rotations stored separately)
    const animationLoopBones = new Set(['Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R']);
    
    // Track slider-only rotations (relative to initial) for animation loop bones
    const sliderOnlyRotations: { [boneName: string]: { x: number; y: number; z: number } } = {};
    animationLoopBones.forEach(boneName => {
      sliderOnlyRotations[boneName] = { x: 0, y: 0, z: 0 };
    });
    
    // === PELVIS-SPINE COUPLING ===
    // Biomechanically, pelvic tilt influences lumbar lordosis, and pelvic obliquity influences scoliosis
    // These are derived values that add to any manual spine adjustments
    const PELVIS_LUMBAR_RATIO = 0.6;  // ~0.6° lumbar lordosis change per 1° pelvic tilt
    const PELVIS_SCOLIOSIS_RATIO = 0.5; // ~0.5° scoliosis per 1° pelvic obliquity
    
    // Get pelvis values in degrees (from modelConfig)
    const pelvisConfig = modelConfig.pelvis as { tilt?: number; obliquity?: number } | undefined;
    const pelvisTilt = pelvisConfig?.tilt || 0;
    const pelvisObliquity = pelvisConfig?.obliquity || 0;
    
    // Compute derived spine adjustments (additive to any existing spine values)
    const derivedLumbarLordosis = pelvisTilt * PELVIS_LUMBAR_RATIO;
    const derivedScoliosis = pelvisObliquity * PELVIS_SCOLIOSIS_RATIO;
    
    // Apply derived lumbar lordosis to spine bones (z-axis, same as BONE_MAPPING)
    const lumbarBones = ['Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M'];
    const lumbarScale = 0.2;
    lumbarBones.forEach(boneName => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedLumbarLordosis * Math.PI) / 180;
        boneRotations[boneName].z += angleInRadians * lumbarScale;
      }
    });
    
    // Apply derived scoliosis to spine/chest bones (y-axis for lumbar, z-axis for thoracic)
    const scoliosisLumbarMappings = [
      { boneName: 'Root_M', scale: 0.1 },
      { boneName: 'RootPart1_M', scale: 0.15 },
      { boneName: 'RootPart2_M', scale: 0.2 },
      { boneName: 'Spine1_M', scale: 0.2 },
    ];
    const scoliosisThoracicMappings = [
      { boneName: 'Spine1Part1_M', scale: 0.15 },
      { boneName: 'Spine1Part2_M', scale: 0.1 },
      { boneName: 'Chest_M', scale: -0.1 },
    ];
    scoliosisLumbarMappings.forEach(({ boneName, scale }) => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedScoliosis * Math.PI) / 180;
        boneRotations[boneName].y += angleInRadians * scale;
      }
    });
    scoliosisThoracicMappings.forEach(({ boneName, scale }) => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedScoliosis * Math.PI) / 180;
        boneRotations[boneName].y += angleInRadians * scale;
      }
    });
    
    // Accumulate rotations from all sliders
    Object.entries(BONE_MAPPING).forEach(([configKey, mappings]) => {
      const [jointName, propertyName] = configKey.split('.');
      const jointConfig = modelConfig[jointName];
      
      if (!jointConfig) return;
      
      const value = (jointConfig as any)[propertyName];
      if (value === undefined) return;
      
      const angleInRadians = (value * Math.PI) / 180;
      
      mappings.forEach(({ boneName, axis, scale, isPosition }) => {
        if (isPosition) {
          // Handle position-based transformations (e.g., pelvis drop)
          const positionOffset = value * scale;
          if (!bonePositions[boneName]) {
            bonePositions[boneName] = { x: 0, y: 0, z: 0 };
          }
          if (axis === 'x') {
            bonePositions[boneName].x += positionOffset;
          } else if (axis === 'y') {
            bonePositions[boneName].y += positionOffset;
          } else if (axis === 'z') {
            bonePositions[boneName].z += positionOffset;
          }
        } else {
          // Handle rotation-based transformations
          const adjustedAngle = angleInRadians * scale;
          
          // For animation loop bones, store slider rotations separately
          if (animationLoopBones.has(boneName)) {
            if (axis === 'x') {
              sliderOnlyRotations[boneName].x += adjustedAngle;
            } else if (axis === 'y') {
              sliderOnlyRotations[boneName].y += adjustedAngle;
            } else if (axis === 'z') {
              sliderOnlyRotations[boneName].z += adjustedAngle;
            }
          } else {
            // For regular bones, accumulate to boneRotations
            if (!boneRotations[boneName]) return;
            if (axis === 'x') {
              boneRotations[boneName].x += adjustedAngle;
            } else if (axis === 'y') {
              boneRotations[boneName].y += adjustedAngle;
            } else if (axis === 'z') {
              boneRotations[boneName].z += adjustedAngle;
            }
          }
        }
      });
    });
    
    // Store slider rotations for animation loop to use
    // Only update if live pose is NOT active (live pose effect sets these values itself)
    if (!livePose) {
      sliderRotationsRef.current = sliderOnlyRotations;
    }
    
    // Extract and store clavicle length offsets (in mm, convert to scene units)
    // Positive value = longer clavicle = shoulder moves laterally outward
    const leftClavicle = (modelConfig.leftShoulder as any)?.clavicleLength || 0;
    const rightClavicle = (modelConfig.rightShoulder as any)?.clavicleLength || 0;
    // Convert mm to scene units (model scale is ~2/maxDim, typical skeleton height ~1.8m)
    // Scene unit conversion factor: 1mm ≈ 0.001 in real world, but model is scaled
    // Use a reasonable multiplier for visible effect (0.002 per mm seems good for this scale)
    const mmToSceneUnit = 0.002;
    clavicleOffsetsRef.current = {
      left: leftClavicle * mmToSceneUnit,
      right: rightClavicle * mmToSceneUnit
    };
    
    // Apply accumulated rotations to bones (skip animation loop bones)
    Object.entries(boneRotations).forEach(([boneName, rotation]) => {
      if (animationLoopBones.has(boneName)) return; // Animation loop handles these
      const bone = bones[boneName];
      if (bone) {
        bone.rotation.x = rotation.x;
        bone.rotation.y = rotation.y;
        bone.rotation.z = rotation.z;
      }
    });
    
    // Apply position offsets to bones (for closed-chain movements like squat)
    // Track which bones have position mappings so we can always apply them (even when returning to 0)
    const bonesWithPositionMappings = new Set<string>();
    Object.entries(BONE_MAPPING).forEach(([, mappings]) => {
      mappings.forEach(({ boneName, isPosition }) => {
        if (isPosition) {
          bonesWithPositionMappings.add(boneName);
        }
      });
    });
    
    bonesWithPositionMappings.forEach((boneName) => {
      const bone = bones[boneName];
      if (bone) {
        // Store initial position on first access
        if (!(bone as any).initialPosition) {
          (bone as any).initialPosition = bone.position.clone();
        }
        const initialPos = (bone as any).initialPosition as THREE.Vector3;
        const posOffset = bonePositions[boneName] || { x: 0, y: 0, z: 0 };
        
        // Always apply position (even when 0, to reset to initial position)
        bone.position.x = initialPos.x + posOffset.x;
        bone.position.y = initialPos.y + posOffset.y;
        bone.position.z = initialPos.z + posOffset.z;
      }
    });
    
    // Apply clavicle length offsets to move scapula/shoulder laterally
    // Positive clavicle length = shoulder moves outward (wider shoulders)
    const scapulaL = bones['Scapula_L'];
    const scapulaR = bones['Scapula_R'];
    
    if (scapulaL) {
      // Store initial position on first access
      if (!(scapulaL as any).clavicleInitialX) {
        (scapulaL as any).clavicleInitialX = scapulaL.position.x;
      }
      // Left scapula moves in positive X direction (outward)
      scapulaL.position.x = (scapulaL as any).clavicleInitialX + clavicleOffsetsRef.current.left;
    }
    
    if (scapulaR) {
      // Store initial position on first access
      if (!(scapulaR as any).clavicleInitialX) {
        (scapulaR as any).clavicleInitialX = scapulaR.position.x;
      }
      // Right scapula moves in negative X direction (outward)
      scapulaR.position.x = (scapulaR as any).clavicleInitialX - clavicleOffsetsRef.current.right;
    }
  }, [modelConfig, status, livePose]);

  // Sync animation constraints to ref (avoids restarting animation when constraints change)
  useEffect(() => {
    animationConstraintsRef.current = animationConstraints || [];
  }, [animationConstraints]);

  // Keep refs updated for animation loop access
  useEffect(() => {
    livePoseActiveRef.current = livePose !== null;
  }, [livePose]);

  useEffect(() => {
    animationPlayingRef.current = animationState?.isPlaying || false;
  }, [animationState?.isPlaying]);

  useEffect(() => {
    if (!animationState || !animationState.isPlaying || !animationState.currentMovement) return;
    if (status !== 'ready') return;
    if (livePose) return;
    
    // Set immediately so render loop doesn't override shoulder bones
    animationPlayingRef.current = true;
    
    const movement = getMovementById(animationState.currentMovement);
    if (!movement) return;
    
    const bones = bonesRef.current;
    const initialRotations = initialRotationsRef.current;
    
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulatedTime = animationState.progress * movement.duration;
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) * animationState.speed;
      lastTime = currentTime;
      accumulatedTime += deltaTime;
      
      let normalizedTime = accumulatedTime / movement.duration;
      
      if (movement.loop) {
        normalizedTime = normalizedTime % 1;
        if (normalizedTime < 0) normalizedTime = 1 + normalizedTime;
      } else {
        normalizedTime = Math.min(1, Math.max(0, normalizedTime));
      }
      
      const jointValues: { [key: string]: { [prop: string]: number } } = {};
      const compensationValues: { [key: string]: { [prop: string]: number } } = {};
      
      // First pass: Calculate unconstrained values and detect constraints
      const unconstrainedValues: { [key: string]: { [prop: string]: number } } = {};
      movement.joints.forEach(timeline => {
        const value = interpolateKeyframes(timeline.keyframes, normalizedTime);
        if (!unconstrainedValues[timeline.joint]) {
          unconstrainedValues[timeline.joint] = {};
        }
        unconstrainedValues[timeline.joint][timeline.property] = value;
      });
      
      // Second pass: Apply constraints and calculate compensation
      movement.joints.forEach(timeline => {
        let value = unconstrainedValues[timeline.joint][timeline.property];
        
        // Apply existing jointLimits
        value = applyJointConstraints(value, timeline.joint, timeline.property, jointLimits);
        
        // Apply animation constraints (from joint restrictions)
        // Constraints use snake_case (left_hip, flexion) while animation uses camelCase (leftHip.flexion)
        // Use ref to avoid restarting animation when constraints change
        const currentConstraints = animationConstraintsRef.current;
        if (currentConstraints && currentConstraints.length > 0) {
          // Find constraint that matches this timeline by converting constraint names to animation names
          const constraint = currentConstraints.find(c => {
            const camelJoint = snakeToCamelJoint(c.joint);
            const camelMovement = snakeToCamelMovement(c.joint, c.movement);
            return camelJoint === timeline.joint && camelMovement === timeline.property;
          });
          
          if (constraint) {
            // Calculate constrained value - handle both positive and negative values
            // Safeguard: Only apply constraint if maxROM is meaningful (> 5 degrees)
            // This prevents complete freezing when maxROM = 0
            const absValue = Math.abs(value);
            const effectiveMaxROM = Math.max(constraint.maxROM, 5); // Minimum 5 degrees to prevent freezing
            const constrainedValue = Math.min(absValue, effectiveMaxROM);
            const blockedAmount = absValue - constrainedValue;
            
            // Preserve the original sign when clamping
            value = value >= 0 ? constrainedValue : -constrainedValue;
            
            // If movement was blocked, calculate compensation for adjacent joints
            if (blockedAmount > 0) {
              // Get compensation patterns using snake_case key (matches constraint system)
              const compensationPatterns = ANIMATION_COMPENSATION_MAPPING[`${constraint.joint}:${constraint.movement}`];
              if (compensationPatterns) {
                compensationPatterns.forEach(({ targetJoint, targetMovement, ratio }) => {
                  // Check if target bone mapping exists before adding compensation
                  const configKey = `${targetJoint}.${targetMovement}`;
                  if (BONE_MAPPING[configKey]) {
                    if (!compensationValues[targetJoint]) {
                      compensationValues[targetJoint] = {};
                    }
                    const compensationAmount = blockedAmount * ratio;
                    compensationValues[targetJoint][targetMovement] = 
                      (compensationValues[targetJoint][targetMovement] || 0) + compensationAmount;
                  }
                });
              }
            }
          }
        }
        
        if (!jointValues[timeline.joint]) {
          jointValues[timeline.joint] = {};
        }
        jointValues[timeline.joint][timeline.property] = value;
      });
      
      // Merge compensation values into joint values
      Object.entries(compensationValues).forEach(([joint, props]) => {
        if (!jointValues[joint]) {
          jointValues[joint] = {};
        }
        Object.entries(props).forEach(([prop, additionalValue]) => {
          jointValues[joint][prop] = (jointValues[joint][prop] || 0) + additionalValue;
        });
      });
      
      // Directly apply animation values to bones for immediate response
      // This bypasses React state updates for smoother animation
      const animBoneRotations: { [boneName: string]: { x: number; y: number; z: number } } = {};
      const animBonePositions: { [boneName: string]: { x: number; y: number; z: number } } = {};
      
      // Initialize rotations from initial state + current control slider offsets
      // This preserves the user's current pose (e.g., forward head, kyphosis) as the base
      Object.keys(bones).forEach(boneName => {
        const initial = initialRotations[boneName];
        if (initial) {
          animBoneRotations[boneName] = { x: initial.x, y: initial.y, z: initial.z };
        }
      });
      
      // Layer current modelConfig slider values on top of initial rotations
      const currentConfig = modelConfigRef.current;
      if (currentConfig) {
        Object.entries(BONE_MAPPING).forEach(([configKey, mappings]) => {
          const [jointName, propertyName] = configKey.split('.');
          const jointConfig = currentConfig[jointName];
          if (!jointConfig) return;
          const sliderValue = (jointConfig as any)[propertyName];
          if (sliderValue === undefined || sliderValue === 0) return;
          const angleInRadians = (sliderValue * Math.PI) / 180;
          mappings.forEach(({ boneName, axis, scale, isPosition }) => {
            if (isPosition) return;
            const adjustedAngle = angleInRadians * scale;
            if (!animBoneRotations[boneName]) return;
            if (axis === 'x') animBoneRotations[boneName].x += adjustedAngle;
            else if (axis === 'y') animBoneRotations[boneName].y += adjustedAngle;
            else if (axis === 'z') animBoneRotations[boneName].z += adjustedAngle;
          });
        });
      }
      
      // Apply animation values through bone mappings
      Object.entries(jointValues).forEach(([joint, props]) => {
        Object.entries(props).forEach(([property, value]) => {
          const configKey = `${joint}.${property}`;
          const mappings = BONE_MAPPING[configKey];
          
          if (!mappings) return;
          
          const angleInRadians = (value * Math.PI) / 180;
          
          mappings.forEach(({ boneName, axis, scale, isPosition }) => {
            if (isPosition) {
              // Handle position-based transformations
              const positionOffset = value * scale;
              if (!animBonePositions[boneName]) {
                animBonePositions[boneName] = { x: 0, y: 0, z: 0 };
              }
              if (axis === 'x') animBonePositions[boneName].x += positionOffset;
              else if (axis === 'y') animBonePositions[boneName].y += positionOffset;
              else if (axis === 'z') animBonePositions[boneName].z += positionOffset;
            } else {
              // Handle rotation-based transformations
              const adjustedAngle = angleInRadians * scale;
              if (!animBoneRotations[boneName]) {
                const initial = initialRotations[boneName];
                animBoneRotations[boneName] = initial ? { ...initial } : { x: 0, y: 0, z: 0 };
              }
              if (axis === 'x') animBoneRotations[boneName].x += adjustedAngle;
              else if (axis === 'y') animBoneRotations[boneName].y += adjustedAngle;
              else if (axis === 'z') animBoneRotations[boneName].z += adjustedAngle;
            }
          });
        });
      });
      
      // Hip flexion fix: Use world mediolateral (X) axis for hip flexion
      // to ensure pure sagittal plane movement at ALL angles (no lateral drift)
      // The world X axis has zero lateral component, preventing leg crossing
      // at large flexion angles (e.g., squat at 80°)
      ['Hip_L', 'Hip_R'].forEach(boneName => {
        const initial = initialRotations[boneName];
        const anim = animBoneRotations[boneName];
        if (!initial || !anim) return;
        
        const zDelta = anim.z - initial.z;
        if (Math.abs(zDelta) < 0.001) return;
        
        const bone = bones[boneName] as THREE.Bone;
        if (!bone || !bone.parent) return;
        
        bone.parent.updateWorldMatrix(true, false);
        const parentWorldQ = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentWorldQ);
        const parentWorldQInv = parentWorldQ.clone().invert();
        
        const worldFlexAxis = new THREE.Vector3(-1, 0, 0);
        const localFlexAxis = worldFlexAxis.clone().applyQuaternion(parentWorldQInv).normalize();
        
        const qInit = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
        );
        const qFlex = new THREE.Quaternion().setFromAxisAngle(localFlexAxis, zDelta);
        const qResult = new THREE.Quaternion().multiplyQuaternions(qFlex, qInit);
        const eulerResult = new THREE.Euler().setFromQuaternion(qResult, 'XYZ');
        
        anim.x = eulerResult.x;
        anim.y = eulerResult.y;
        anim.z = eulerResult.z;
      });
      
      const pelvisDropValue = jointValues['pelvis']?.['drop'] || 0;
      const pelvisZShiftValue = jointValues['pelvis']?.['zShift'] || 0;
      const isClosedChainMovement = movement.useIK === true && legIKStateRef.current?.initialized;
      
      if (isClosedChainMovement && legIKStateRef.current) {
        const pelvisBone = bones['Root_M'] as THREE.Bone;
        const totalLegLength = (legIKStateRef.current.leftLegLengths?.thighLength || 2) + 
                                (legIKStateRef.current.leftLegLengths?.shinLength || 2);
        if (pelvisBone) {
          if (!(pelvisBone as any).initialPosition) {
            (pelvisBone as any).initialPosition = pelvisBone.position.clone();
          }
          const initialPos = (pelvisBone as any).initialPosition as THREE.Vector3;
          const dropFraction = pelvisDropValue / 100;
          const dropAmount = dropFraction * totalLegLength * 0.55;
          pelvisBone.position.y = initialPos.y - dropAmount;
          pelvisBone.position.z = initialPos.z;
        }
        
        const pelvisBoneNames = ['Root_M', 'RootPart1_M', 'RootPart2_M'];
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          if (pelvisBoneNames.includes(boneName)) {
            const bone = bones[boneName];
            if (bone) {
              bone.rotation.x = rotation.x;
              bone.rotation.y = rotation.y;
              bone.rotation.z = rotation.z;
            }
          }
        });
        
        if (pelvisBone) {
          pelvisBone.updateMatrixWorld(true);
        }
        
        const ikInitialRotations: { [name: string]: { x: number; y: number; z: number } } = {};
        Object.entries(initialRotations).forEach(([name, euler]) => {
          ikInitialRotations[name] = { x: euler.x, y: euler.y, z: euler.z };
        });
        
        const ikState = legIKStateRef.current;
        const zShiftFraction = pelvisZShiftValue / 100;
        const footShiftAmount = zShiftFraction * totalLegLength * 0.35;
        
        if (Math.abs(footShiftAmount) > 0.001 && ikState.leftInitialFootPos && ikState.rightInitialFootPos) {
          const leftFootTarget = ikState.leftInitialFootPos.clone();
          const rightFootTarget = ikState.rightInitialFootPos.clone();
          
          leftFootTarget.z += footShiftAmount;
          rightFootTarget.z -= footShiftAmount;
          
          if (ikState.leftLegLengths) {
            applyLegIK(
              bones as { [name: string]: THREE.Bone },
              ikInitialRotations,
              LEG_IK_CONFIG.left,
              leftFootTarget,
              ikState.leftLegLengths,
              ikState.leftStandingAngles
            );
          }
          if (ikState.rightLegLengths) {
            applyLegIK(
              bones as { [name: string]: THREE.Bone },
              ikInitialRotations,
              LEG_IK_CONFIG.right,
              rightFootTarget,
              ikState.rightLegLengths,
              ikState.rightStandingAngles
            );
          }
        } else {
          applySquatIK(
            bones as { [name: string]: THREE.Bone },
            ikInitialRotations,
            ikState
          );
        }
        
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          if (boneName.includes('Hip') || boneName.includes('Knee') || boneName.includes('Toes')) {
            return;
          }
          if (pelvisBoneNames.includes(boneName)) {
            return;
          }
          const bone = bones[boneName];
          if (bone) {
            bone.rotation.x = rotation.x;
            bone.rotation.y = rotation.y;
            bone.rotation.z = rotation.z;
          }
        });
      } else {
        // OPEN-CHAIN: Standard FK animation (walking, etc.)
        const kneeBoneNames = new Set(['Knee_L', 'Knee_R']);
        
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          if (kneeBoneNames.has(boneName)) return;
          const bone = bones[boneName];
          if (bone) {
            bone.rotation.x = rotation.x;
            bone.rotation.y = rotation.y;
            bone.rotation.z = rotation.z;
          }
        });
        
        ['Hip_L', 'HipPart1_L', 'HipPart2_L', 'Hip_R', 'HipPart1_R', 'HipPart2_R'].forEach(name => {
          const b = bones[name] as THREE.Bone;
          if (b) b.updateWorldMatrix(true, false);
        });
        
        kneeBoneNames.forEach(boneName => {
          const initial = initialRotations[boneName];
          const anim = animBoneRotations[boneName];
          if (!initial || !anim) return;
          
          const bone = bones[boneName] as THREE.Bone;
          if (!bone || !bone.parent) return;
          
          const zDelta = anim.z - initial.z;
          if (Math.abs(zDelta) < 0.001) {
            bone.rotation.x = initial.x;
            bone.rotation.y = initial.y;
            bone.rotation.z = initial.z;
            return;
          }
          
          const parentWorldQ = new THREE.Quaternion();
          bone.parent.getWorldQuaternion(parentWorldQ);
          const parentWorldQInv = parentWorldQ.clone().invert();
          
          const worldFlexAxis = new THREE.Vector3(-1, 0, 0);
          const localFlexAxis = worldFlexAxis.clone().applyQuaternion(parentWorldQInv).normalize();
          
          const qInit = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
          );
          const qFlex = new THREE.Quaternion().setFromAxisAngle(localFlexAxis, zDelta);
          const qResult = new THREE.Quaternion().multiplyQuaternions(qFlex, qInit);
          const eulerResult = new THREE.Euler().setFromQuaternion(qResult, 'XYZ');
          
          bone.rotation.x = eulerResult.x;
          bone.rotation.y = eulerResult.y;
          bone.rotation.z = eulerResult.z;
        });
        
        Object.entries(animBonePositions).forEach(([boneName, posOffset]) => {
          const bone = bones[boneName];
          if (bone) {
            if (!(bone as any).initialPosition) {
              (bone as any).initialPosition = bone.position.clone();
            }
            const initialPos = (bone as any).initialPosition as THREE.Vector3;
            bone.position.x = initialPos.x + posOffset.x;
            bone.position.y = initialPos.y + posOffset.y;
            bone.position.z = initialPos.z + posOffset.z;
          }
        });
        
        Object.entries(BONE_MAPPING).forEach(([, mappings]) => {
          mappings.forEach(({ boneName, isPosition }) => {
            if (isPosition && !animBonePositions[boneName]) {
              const bone = bones[boneName];
              if (bone && (bone as any).initialPosition) {
                const initialPos = (bone as any).initialPosition as THREE.Vector3;
                bone.position.x = initialPos.x;
                bone.position.y = initialPos.y;
                bone.position.z = initialPos.z;
              }
            }
          });
        });
      }
      
      if (onAnimationFrame) {
        onAnimationFrame(jointValues);
      }
      
      if (animationState.isPlaying) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationPlayingRef.current = false;
    };
  }, [animationState?.isPlaying, animationState?.currentMovement, animationState?.speed, status, onAnimationFrame, jointLimits]);

  // Force visualization effect
  useEffect(() => {
    if (status !== 'ready' || !sceneRef.current || Object.keys(bonesRef.current).length === 0) {
      return;
    }

    // Initialize force visualization manager if not already
    if (!forceVisualizationRef.current) {
      forceVisualizationRef.current = new ForceVisualizationManager(
        sceneRef.current.scene,
        bonesRef.current
      );
    }

    // Set camera for raycasting
    forceVisualizationRef.current.setCamera(sceneRef.current.camera);

    // Update visualization if biomechanics data is provided
    if (biomechanicsData) {
      forceVisualizationRef.current.updateVisualization(biomechanicsData);
    } else {
      forceVisualizationRef.current.clearVisualization();
    }

    return () => {
      // Clear visualization when component updates
    };
  }, [biomechanicsData, status]);

  // Muscle visualization effect
  useEffect(() => {
    if (status !== 'ready' || !sceneRef.current || Object.keys(bonesRef.current).length === 0) {
      return;
    }

    // Initialize muscle visualization manager if not already
    if (!muscleVisualizationRef.current) {
      muscleVisualizationRef.current = new MuscleVisualizationManager(
        sceneRef.current.scene,
        bonesRef.current
      );
    }

    // Update muscle visualization based on visibility config
    if (muscleVisibility?.enabled) {
      muscleVisualizationRef.current.setShowLabels(muscleVisibility.showLabels || false);
      muscleVisualizationRef.current.updateMuscles(
        muscleActivation || {},
        {
          quadriceps: muscleVisibility.quadriceps ?? true,
          hamstrings: muscleVisibility.hamstrings ?? true,
          adductors: muscleVisibility.adductors ?? true,
          calf: muscleVisibility.calf ?? true,
          shin: muscleVisibility.shin ?? true,
          lateral: muscleVisibility.lateral ?? true,
          other: muscleVisibility.other ?? true
        }
      );
    } else {
      muscleVisualizationRef.current.clearMuscles();
    }

    return () => {
      // Clear visualization when component updates
    };
  }, [muscleVisibility, muscleActivation, status]);

  // Muscle layer (GLB model) effect
  useEffect(() => {
    if (status !== 'ready' || !sceneRef.current) {
      return;
    }

    // Initialize muscle layer manager if not already
    if (!muscleLayerManagerRef.current) {
      muscleLayerManagerRef.current = new MuscleLayerManager(
        sceneRef.current.scene,
        muscleLayerConfigs
      );
      muscleLayerManagerRef.current.initialize().then(() => {
        if (muscleLayerVisibility?.enabled) {
          muscleLayerManagerRef.current?.loadAllLayers();
        }
      });
    }

    // Update visibility for each layer
    if (muscleLayerManagerRef.current) {
      const layers = muscleLayerManagerRef.current.getAllLayers();
      
      if (muscleLayerVisibility?.enabled) {
        // Load any layers that need loading
        layers.forEach(layer => {
          if (!layer.loaded) {
            muscleLayerManagerRef.current?.loadLayer(layer.id);
          }
        });
        
        // Update visibility and opacity for each layer
        Object.entries(muscleLayerVisibility.layers || {}).forEach(([layerId, visible]) => {
          muscleLayerManagerRef.current?.setLayerVisible(layerId, visible);
        });
        
        // Update opacity
        if (muscleLayerVisibility.opacity !== undefined) {
          layers.forEach(layer => {
            muscleLayerManagerRef.current?.setLayerOpacity(layer.id, muscleLayerVisibility.opacity);
          });
        }
      } else {
        // Hide all layers when disabled
        layers.forEach(layer => {
          muscleLayerManagerRef.current?.setLayerVisible(layer.id, false);
        });
      }
    }

    return () => {
      // Cleanup handled in unmount effect
    };
  }, [muscleLayerVisibility, muscleLayerConfigs, status]);

  useEffect(() => {
    if (splitMuscleGroupsRef.current.size > 0) {
      setAllMuscleGroupsVisibility(splitMuscleGroupsRef.current, showMuscles);
      if (showMuscles && individualMuscleVisibility) {
        Array.from(splitMuscleGroupsRef.current.keys()).forEach(id => {
          const visible = individualMuscleVisibility[id] !== false;
          setMuscleGroupVisibility(splitMuscleGroupsRef.current, id, visible);
        });
      }
    }
  }, [showMuscles]);

  useEffect(() => {
    if (!individualMuscleVisibility || splitMuscleGroupsRef.current.size === 0) return;
    Array.from(splitMuscleGroupsRef.current.keys()).forEach(id => {
      const visible = individualMuscleVisibility[id] !== false;
      setMuscleGroupVisibility(splitMuscleGroupsRef.current, id, visible);
    });
  }, [individualMuscleVisibility]);

  useEffect(() => {
    if (splitMuscleGroupsRef.current.size === 0) return;

    if (!muscleStates) {
      originalMaterialsRef.current.forEach((originalMat, mesh) => {
        mesh.material = originalMat;
      });
      return;
    }

    splitMuscleGroupsRef.current.forEach((group, groupId) => {
      const state = muscleStates[groupId];
      if (!state) return;

      const hasIssue = state.state !== 'neutral' ||
        state.tension > 50 || state.activationPercent > 60;

      group.meshes.forEach((mesh) => {
        if (mesh instanceof THREE.SkinnedMesh || mesh instanceof THREE.Mesh) {
          if (!originalMaterialsRef.current.has(mesh)) {
            originalMaterialsRef.current.set(mesh, (mesh.material as THREE.Material).clone());
          }
          if (!hasIssue) {
            const orig = originalMaterialsRef.current.get(mesh) as THREE.Material | undefined;
            if (orig) {
              mesh.material = orig.clone();
            }
            return;
          }
          const color = getMuscleColor(state);
          const orig = originalMaterialsRef.current.get(mesh) as THREE.Material | undefined;
          const mat = orig ? orig.clone() as THREE.MeshStandardMaterial : (mesh.material as THREE.MeshStandardMaterial);
          mat.color.setRGB(color.r, color.g, color.b);
          if (mat.emissive) mat.emissive.setRGB(color.r * 0.15, color.g * 0.15, color.b * 0.15);
          mat.needsUpdate = true;
          mesh.material = mat;
        }
      });
    });
  }, [muscleStates]);

  useEffect(() => {
    for (const entry of biomechanicalHighlightRef.current) {
      const clonedMat = entry.mesh.material as THREE.Material;
      entry.mesh.material = entry.origMaterial;
      entry.mesh.visible = entry.wasVisible;
      if (clonedMat !== entry.origMaterial) {
        clonedMat.dispose();
      }
    }
    biomechanicalHighlightRef.current = [];

    if (!highlightMuscleGroups || highlightMuscleGroups.length === 0 || splitMuscleGroupsRef.current.size === 0) return;

    for (const groupId of highlightMuscleGroups) {
      const group = splitMuscleGroupsRef.current.get(groupId);
      if (!group) continue;
      for (const mesh of group.meshes) {
        if (mesh instanceof THREE.Mesh) {
          const origMat = mesh.material as THREE.MeshStandardMaterial;
          if (origMat) {
            const clonedMat = origMat.clone() as THREE.MeshStandardMaterial;
            clonedMat.emissive = new THREE.Color(0x00ffff);
            clonedMat.emissiveIntensity = 0.5;
            clonedMat.transparent = true;
            clonedMat.opacity = 0.85;
            clonedMat.needsUpdate = true;

            biomechanicalHighlightRef.current.push({
              mesh,
              origMaterial: origMat,
              wasVisible: mesh.visible,
            });

            mesh.material = clonedMat;
            mesh.visible = true;
          }
        }
      }
    }
  }, [highlightMuscleGroups]);

  // Mouse move handler for hover tooltips
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!forceVisualizationRef.current || !containerRef.current || !biomechanicsData) {
      setHoverData(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const hover = forceVisualizationRef.current.checkHover(mouse, rect);
    setHoverData(hover);
  }, [biomechanicsData]);

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
  }, []);

  // Cleanup force and muscle visualization on unmount
  useEffect(() => {
    return () => {
      if (forceVisualizationRef.current) {
        forceVisualizationRef.current.dispose();
        forceVisualizationRef.current = null;
      }
      if (muscleVisualizationRef.current) {
        muscleVisualizationRef.current.dispose();
        muscleVisualizationRef.current = null;
      }
      if (muscleLayerManagerRef.current) {
        muscleLayerManagerRef.current.dispose();
        muscleLayerManagerRef.current = null;
      }
      if (splitMuscleGroupsRef.current.size > 0) {
        disposeMuscleGroups(splitMuscleGroupsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || status !== 'ready') return;
    const container = containerRef.current;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    let hoveredGroupId: string | null = null;

    const clearMuscleHover = () => {
      muscleOriginalEmissiveRef.current.forEach((orig, mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          mat.emissive.copy(orig.color);
          mat.emissiveIntensity = orig.intensity;
          mat.needsUpdate = true;
        }
      });
      muscleOriginalEmissiveRef.current.clear();
      hoveredGroupId = null;
    };

    const findMuscleGroupForMesh = (hitMesh: THREE.Object3D): { groupId: string; label: string } | null => {
      const groups = splitMuscleGroupsRef.current;
      const entries = Array.from(groups.entries());
      let current: THREE.Object3D | null = hitMesh;
      while (current) {
        for (let i = 0; i < entries.length; i++) {
          const [id, group] = entries[i];
          for (let j = 0; j < group.meshes.length; j++) {
            const mesh = group.meshes[j];
            if (mesh === current || mesh.uuid === current.uuid) {
              return { groupId: id, label: group.label };
            }
          }
        }
        current = current.parent;
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      const otherToolActive = enablePainMarkersRef.current || enableRomModeRef.current || enablePoseModeRef.current || enableZoomToolRef.current;
      if (!enableMuscleInteractionRef.current || otherToolActive) {
        if (hoveredGroupId) {
          clearMuscleHover();
          setMuscleHoverInfo(null);
          canvas.style.cursor = '';
        }
        return;
      }
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const allMuscleMeshes = muscleMeshesRef.current.filter(m => m.visible);
      if (allMuscleMeshes.length === 0) {
        if (hoveredGroupId) { clearMuscleHover(); setMuscleHoverInfo(null); canvas.style.cursor = ''; }
        return;
      }
      if (!sceneRef.current) return;
      const cam = sceneRef.current.camera;
      raycasterRef.current.setFromCamera(ndc, cam);
      const hits = raycasterRef.current.intersectObjects(allMuscleMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const info = findMuscleGroupForMesh(hit.object);
        if (info && info.groupId !== hoveredGroupId) {
          clearMuscleHover();
          hoveredGroupId = info.groupId;
          const group = splitMuscleGroupsRef.current.get(info.groupId);
          if (group) {
            for (const mesh of group.meshes) {
              if (mesh instanceof THREE.Mesh) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat && mat.emissive) {
                  muscleOriginalEmissiveRef.current.set(mesh, {
                    color: mat.emissive.clone(),
                    intensity: mat.emissiveIntensity,
                  });
                  mat.emissive.set(0x00ffff);
                  mat.emissiveIntensity = 0.4;
                  mat.needsUpdate = true;
                }
              }
            }
          }
          setMuscleHoverInfo({ groupId: info.groupId, label: info.label, screenX: e.clientX, screenY: e.clientY });
          canvas.style.cursor = 'pointer';
        } else if (info) {
          setMuscleHoverInfo(prev => prev ? { ...prev, screenX: e.clientX, screenY: e.clientY } : null);
        }
      } else {
        if (hoveredGroupId) {
          clearMuscleHover();
          setMuscleHoverInfo(null);
          canvas.style.cursor = '';
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const otherToolActive = enablePainMarkersRef.current || enableRomModeRef.current || enablePoseModeRef.current || enableZoomToolRef.current;
      if (!enableMuscleInteractionRef.current || otherToolActive) return;
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const allMuscleMeshes = muscleMeshesRef.current.filter(m => m.visible);
      if (allMuscleMeshes.length === 0) return;
      if (!sceneRef.current) return;
      const cam = sceneRef.current.camera;
      raycasterRef.current.setFromCamera(ndc, cam);
      const hits = raycasterRef.current.intersectObjects(allMuscleMeshes, true);
      if (hits.length > 0) {
        const info = findMuscleGroupForMesh(hits[0].object);
        if (info && onMuscleGroupClickRef.current) {
          onMuscleGroupClickRef.current(info.groupId, e.clientX, e.clientY);
        }
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      clearMuscleHover();
    };
  }, [status]);

  const handleRetry = () => {
    setStatus('checking');
    setErrorMessage('');
    setLoadProgress(0);
  };

  if (status === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 ${className}`}>
        <div className="w-16 h-16 mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">3D Viewer Error</h3>
        <p className="text-sm text-gray-300 text-center max-w-md mb-3">{errorMessage}</p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 max-w-md">
          <p className="text-xs text-blue-300 text-center">
            <strong>Tip:</strong> The preview environment may have limited WebGL support. 
            Try opening in a new browser tab or deploy the app for full 3D support.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="border-green-500 text-green-400 hover:bg-green-500/20"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(window.location.href, '_blank')}
            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'safe': return 'bg-green-500 text-green-50';
      case 'warning': return 'bg-yellow-500 text-yellow-50';
      case 'critical': return 'bg-red-500 text-red-50';
    }
  };

  return (
    <div 
      className={`w-full h-full relative bg-slate-900 rounded-lg ${className}`} 
      style={{ minHeight: '400px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
      {(status === 'checking' || status === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-green-400 mb-3" />
          <span className="text-green-400 mb-2">
            {status === 'checking' ? 'Initializing 3D...' : 'Loading 3D Model...'}
          </span>
          {loadProgress > 0 && (
            <div className="w-48 bg-slate-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      {/* View label */}
      {showLabel && (
        <div 
          className="absolute top-2 left-2 z-10 px-2 py-1 bg-slate-800/90 rounded text-xs font-medium text-slate-300"
          data-testid={`view-label-${cameraAngle}`}
        >
          {CAMERA_PRESETS[cameraAngle].label}
        </div>
      )}
      
      {enableZoomTool && landmarkLabels.length > 0 && (
        <>
          {landmarkLabels.map((lm) => (
            <button
              key={lm.boneName}
              className="absolute z-15 transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: lm.screenX, top: lm.screenY, pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                landmarkSelectRef.current?.({
                  label: lm.label,
                  boneName: lm.boneName,
                  position: lm.worldPos
                });
              }}
            >
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 border border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.6)] group-hover:shadow-[0_0_10px_rgba(34,211,238,0.9)] group-hover:scale-150 transition-all" />
                <div className="px-1.5 py-0.5 rounded bg-slate-900/85 backdrop-blur-sm border border-cyan-500/30 text-[9px] font-medium text-cyan-300 whitespace-nowrap opacity-80 group-hover:opacity-100 group-hover:bg-slate-800/95 group-hover:border-cyan-400/60 group-hover:text-cyan-200 transition-all shadow-lg max-w-[140px] truncate">
                  {lm.label}
                </div>
              </div>
            </button>
          ))}
        </>
      )}
      {/* Force overlay labels on joints */}
      {forceLabels.length > 0 && (
        <>
          {forceLabels.map((fl) => {
            const pct = (fl.totalForce * 100).toFixed(0);
            const isSelected = selectedForceJoint === fl.joint;
            const statusColor = fl.status === 'very_high' ? '#ef4444' : fl.status === 'high' ? '#f97316' : fl.status === 'moderate' ? '#eab308' : '#22c55e';
            const bgOpacity = isSelected ? '95' : '80';
            return (
              <button
                key={fl.joint}
                className={`absolute z-15 transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                style={{ left: fl.screenX, top: fl.screenY, pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onForceJointSelectRef.current?.(fl.joint);
                }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white/60"
                    style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}, 0 0 16px ${statusColor}40` }}
                  />
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-lg backdrop-blur-sm ${isSelected ? 'ring-1 ring-white/50' : ''}`}
                    style={{ backgroundColor: `${statusColor}${bgOpacity}`, color: fl.status === 'low' ? '#052e16' : '#fff' }}
                  >
                    {pct}% BW
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}
      {/* Pose mode tooltip */}
      {poseModeTooltip && enablePoseMode && (
        <div
          className="absolute pointer-events-none z-20"
          style={{ left: poseModeTooltip.x, top: poseModeTooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="px-3 py-1.5 rounded-lg shadow-lg bg-emerald-600/90 backdrop-blur text-white text-sm font-medium">
            <div className="text-[10px] text-emerald-200 uppercase tracking-wider">{poseModeTooltip.label}</div>
            <div className="text-base font-bold">{poseModeTooltip.value}</div>
          </div>
        </div>
      )}
      {/* Force value tooltip */}
      {hoverData && (
        <div 
          className="absolute pointer-events-none z-20"
          style={{ 
            left: hoverData.position.x + 10, 
            top: hoverData.position.y - 40,
            transform: 'translateX(-50%)'
          }}
          data-testid="force-tooltip"
        >
          <div className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${getStatusColor(hoverData.status)}`}>
            <div className="font-semibold">{hoverData.label}</div>
            <div className="text-lg font-bold">
              {hoverData.value.toFixed(0)} {hoverData.unit}
            </div>
            <div className="text-xs opacity-80 capitalize">{hoverData.status}</div>
          </div>
        </div>
      )}
      {muscleHoverInfo && enableMuscleInteraction && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: muscleHoverInfo.screenX - (containerRef.current?.getBoundingClientRect().left || 0) + 15,
            top: muscleHoverInfo.screenY - (containerRef.current?.getBoundingClientRect().top || 0) - 10,
          }}
        >
          <div className="px-3 py-1.5 rounded-lg shadow-lg bg-cyan-600/90 backdrop-blur text-white text-sm font-medium whitespace-nowrap">
            {muscleHoverInfo.label}
            <div className="text-[9px] text-cyan-200">Click for details</div>
          </div>
        </div>
      )}
    </div>
  );
}
