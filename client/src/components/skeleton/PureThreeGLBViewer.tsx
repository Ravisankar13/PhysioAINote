import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlertCircle, Loader2, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMovementById, interpolateKeyframes, applyJointConstraints, JointLimits } from '@/lib/movementSequences';
import { initializeLegIK, applySquatIK, LegIKState } from '@/lib/legIKSolver';
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
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number };
  spine?: { cervicalLordosis?: number; thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number };
  neck?: { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number };
  [key: string]: JointConfig | ScapulaConfig | { tilt?: number; obliquity?: number; rotation?: number } | { thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number } | { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number } | undefined;
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

export interface PainMarker {
  id: string;
  position: { x: number; y: number; z: number };
  nearestBone: string;
  anatomicalLabel: string;
}

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
    'lumbar_spine': 'spine',
    'thoracic_spine': 'spine',
    'cervical_spine': 'spine',
    'pelvis': 'pelvis',
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
    if (movement === 'flexion' || movement === 'extension') return 'cervicalLordosis';
    if (movement === 'rotation') return 'cervicalLordosis'; // Maps to lordosis/flexion change
    if (movement === 'lateral_flexion') return 'scoliosis';
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
  painMarkers?: PainMarker[];
  onPainMarkerAdd?: (marker: PainMarker) => void;
  onPainMarkerMove?: (id: string, position: { x: number; y: number; z: number }, nearestBone: string, anatomicalLabel: string) => void;
  onPainMarkerRemove?: (id: string) => void;
  enablePainMarkers?: boolean;
}

const BONE_MAPPING: { [configKey: string]: { boneName: string; axis: 'x' | 'y' | 'z'; scale: number; isPosition?: boolean }[] } = {
  // === HIP / FEMUR ===
  'leftHip.flexion': [{ boneName: 'Hip_L', axis: 'x', scale: -1 }],
  'leftHip.extension': [{ boneName: 'Hip_L', axis: 'x', scale: 1 }],
  'leftHip.abduction': [{ boneName: 'Hip_L', axis: 'z', scale: -1 }],
  'leftHip.internalRotation': [{ boneName: 'Hip_L', axis: 'y', scale: 1 }],
  'leftHip.anteversion': [{ boneName: 'Hip_L', axis: 'y', scale: 1 }], // Femoral anteversion - causes internal rotation
  'leftHip.neckShaftAngle': [{ boneName: 'Hip_L', axis: 'z', scale: 0.5 }], // Coxa vara/valga
  'rightHip.flexion': [{ boneName: 'Hip_R', axis: 'x', scale: -1 }],
  'rightHip.extension': [{ boneName: 'Hip_R', axis: 'x', scale: 1 }],
  'rightHip.abduction': [{ boneName: 'Hip_R', axis: 'z', scale: 1 }],
  'rightHip.internalRotation': [{ boneName: 'Hip_R', axis: 'y', scale: -1 }],
  'rightHip.anteversion': [{ boneName: 'Hip_R', axis: 'y', scale: -1 }], // Femoral anteversion - causes internal rotation
  'rightHip.neckShaftAngle': [{ boneName: 'Hip_R', axis: 'z', scale: -0.5 }], // Coxa vara/valga
  
  // === KNEE / TIBIA ===
  'leftKnee.flexion': [{ boneName: 'Knee_L', axis: 'x', scale: 1 }],
  'leftKnee.varus': [{ boneName: 'Knee_L', axis: 'z', scale: 1 }], // Genu varum (+) / valgum (-)
  'leftKnee.tibialTorsion': [{ boneName: 'Knee_L', axis: 'y', scale: 1 }], // External/internal tibial rotation
  'leftKnee.recurvatum': [{ boneName: 'Knee_L', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'leftKnee.tibialSlope': [{ boneName: 'Knee_L', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  'rightKnee.flexion': [{ boneName: 'Knee_R', axis: 'x', scale: 1 }],
  'rightKnee.varus': [{ boneName: 'Knee_R', axis: 'z', scale: -1 }], // Genu varum (+) / valgum (-)
  'rightKnee.tibialTorsion': [{ boneName: 'Knee_R', axis: 'y', scale: -1 }], // External/internal tibial rotation
  'rightKnee.recurvatum': [{ boneName: 'Knee_R', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'rightKnee.tibialSlope': [{ boneName: 'Knee_R', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  
  // === ANKLE & FOOT ===
  'leftAnkle.dorsiflexion': [{ boneName: 'Ankle_L', axis: 'x', scale: -1 }],
  'leftAnkle.plantarflexion': [{ boneName: 'Ankle_L', axis: 'x', scale: 1 }],
  'leftAnkle.inversion': [{ boneName: 'Ankle_L', axis: 'z', scale: 1 }],
  'leftAnkle.eversion': [{ boneName: 'Ankle_L', axis: 'z', scale: -1 }],
  'rightAnkle.dorsiflexion': [{ boneName: 'Ankle_R', axis: 'x', scale: -1 }],
  'rightAnkle.plantarflexion': [{ boneName: 'Ankle_R', axis: 'x', scale: 1 }],
  'rightAnkle.inversion': [{ boneName: 'Ankle_R', axis: 'z', scale: -1 }],
  'rightAnkle.eversion': [{ boneName: 'Ankle_R', axis: 'z', scale: 1 }],
  
  // === SHOULDER ===
  // In T-pose, arms point laterally. Flexion rotates arm forward (sagittal plane).
  // For left arm pointing left (-X), flexion uses Y-axis rotation
  'leftShoulder.flexion': [{ boneName: 'Shoulder_L', axis: 'y', scale: -1 }], // Forward flexion - Y rotation brings arm forward (negative for correct direction)
  'leftShoulder.abduction': [{ boneName: 'Shoulder_L', axis: 'z', scale: 1 }], // Abduction - Z rotation for lateral elevation (positive for live pose)
  'leftShoulder.internalRotation': [{ boneName: 'ShoulderPart1_L', axis: 'x', scale: 1 }], // Internal rotation around humerus long axis
  'leftShoulder.externalRotation': [{ boneName: 'ShoulderPart1_L', axis: 'x', scale: -1 }], // External rotation around humerus long axis
  'leftShoulder.retroversion': [{ boneName: 'ShoulderPart1_L', axis: 'y', scale: 1 }], // Humeral head retroversion
  'leftShoulder.elevation': [
    { boneName: 'Chest_M', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Shoulder_L', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  // For right arm pointing right (+X), flexion uses Y-axis rotation (opposite sign)
  'rightShoulder.flexion': [{ boneName: 'Shoulder_R', axis: 'y', scale: 1 }], // Forward flexion - Y rotation brings arm forward (positive for live pose)
  'rightShoulder.abduction': [{ boneName: 'Shoulder_R', axis: 'z', scale: 1 }], // Abduction - Z rotation for lateral elevation
  'rightShoulder.internalRotation': [{ boneName: 'ShoulderPart1_R', axis: 'x', scale: -1 }], // Internal rotation around humerus long axis
  'rightShoulder.externalRotation': [{ boneName: 'ShoulderPart1_R', axis: 'x', scale: 1 }], // External rotation around humerus long axis
  'rightShoulder.retroversion': [{ boneName: 'ShoulderPart1_R', axis: 'y', scale: -1 }], // Humeral head retroversion
  'rightShoulder.elevation': [
    { boneName: 'Chest_M', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Shoulder_R', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  
  // === SCAPULA ===
  // Scapula movements on the thorax - critical for scapulohumeral rhythm
  // Note: Scapula_L/R are children of Chest_M in the bone hierarchy
  //
  // Scapula local axes (observed from bone hierarchy):
  // - X axis: Points laterally (left for L, right for R)
  // - Y axis: Points superiorly (up)  
  // - Z axis: Points anteriorly (forward)
  //
  // Protraction/Retraction: Scapula moves around ribcage (Y-axis rotation - internal/external rotation of scapula)
  // Protraction = scapula rotates forward around vertical axis
  'leftScapula.protraction': [{ boneName: 'Scapula_L', axis: 'y', scale: 1 }],   // Scapula rotates forward around vertical axis
  'leftScapula.retraction': [{ boneName: 'Scapula_L', axis: 'y', scale: -1 }],   // Scapula rotates backward
  'rightScapula.protraction': [{ boneName: 'Scapula_R', axis: 'y', scale: -1 }], // Opposite direction for right
  'rightScapula.retraction': [{ boneName: 'Scapula_R', axis: 'y', scale: 1 }],
  
  // Elevation/Depression: Scapula moves up/down (X-axis rotation - tips the scapula to elevate glenoid)
  // In the local frame, X-axis rotation tips the scapula for elevation effect
  'leftScapula.elevation': [{ boneName: 'Scapula_L', axis: 'x', scale: -1 }],    // Shrug - scapula elevates
  'leftScapula.depression': [{ boneName: 'Scapula_L', axis: 'x', scale: 1 }],    // Push down
  'rightScapula.elevation': [{ boneName: 'Scapula_R', axis: 'x', scale: -1 }],   // Same direction for right (symmetric motion)
  'rightScapula.depression': [{ boneName: 'Scapula_R', axis: 'x', scale: 1 }],
  
  // Upward/Downward Rotation: Glenoid points up (Z-axis rotation - frontal plane rotation)
  // Inferior angle moves laterally when glenoid faces upward
  'leftScapula.upwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: 1 }],    // Inferior angle moves lateral, glenoid faces up
  'leftScapula.downwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: -1 }], // Inferior angle moves medial
  'rightScapula.upwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: -1 }],  // Opposite for right side
  'rightScapula.downwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: 1 }],
  
  // Anterior/Posterior Tilt: Inferior angle tips forward/backward (X-axis rotation)
  // Different from elevation - this is pure sagittal plane tilt
  'leftScapula.anteriorTilt': [{ boneName: 'Scapula_L', axis: 'x', scale: 0.5 }],    // Inferior angle tips forward (anterior)
  'leftScapula.posteriorTilt': [{ boneName: 'Scapula_L', axis: 'x', scale: -0.5 }],  // Inferior angle tips backward (posterior)
  'rightScapula.anteriorTilt': [{ boneName: 'Scapula_R', axis: 'x', scale: 0.5 }],
  'rightScapula.posteriorTilt': [{ boneName: 'Scapula_R', axis: 'x', scale: -0.5 }],
  
  // Winging: Medial border lifts off ribcage (common dysfunction - combination of movements)
  // Primary: Y rotation (protraction) + Z rotation (helps lift medial border)
  'leftScapula.winging': [
    { boneName: 'Scapula_L', axis: 'y', scale: 0.6 },  // Protraction component
    { boneName: 'Scapula_L', axis: 'z', scale: 0.4 }   // Upward rotation component (lifts medial border)
  ],
  'rightScapula.winging': [
    { boneName: 'Scapula_R', axis: 'y', scale: -0.6 }, // Opposite rotation for right
    { boneName: 'Scapula_R', axis: 'z', scale: -0.4 }
  ],
  
  // Clavicle axial rotation - simulates rotation along clavicle's long axis
  // Posterior rotation: clavicle rotates backward, elevating acromial end
  // Anterior rotation: clavicle rotates forward, depressing acromial end
  'leftScapula.clavicleRotation': [
    { boneName: 'Scapula_L', axis: 'z', scale: 0.8 },  // Primary rotation axis
    { boneName: 'Scapula_L', axis: 'x', scale: 0.3 }   // Secondary tilt component
  ],
  'rightScapula.clavicleRotation': [
    { boneName: 'Scapula_R', axis: 'z', scale: -0.8 }, // Mirrored for right side
    { boneName: 'Scapula_R', axis: 'x', scale: 0.3 }   // Same tilt direction
  ],
  
  // === ELBOW ===
  'leftElbow.flexion': [{ boneName: 'Elbow_L', axis: 'x', scale: -1 }],
  'leftElbow.pronation': [{ boneName: 'Elbow_L', axis: 'y', scale: 1 }],
  'leftElbow.carryingAngle': [{ boneName: 'Elbow_L', axis: 'z', scale: -1 }], // Cubitus valgus/varus
  'rightElbow.flexion': [{ boneName: 'Elbow_R', axis: 'x', scale: -1 }],
  'rightElbow.pronation': [{ boneName: 'Elbow_R', axis: 'y', scale: -1 }],
  'rightElbow.carryingAngle': [{ boneName: 'Elbow_R', axis: 'z', scale: 1 }], // Cubitus valgus/varus
  
  // === WRIST ===
  'leftWrist.deviation': [{ boneName: 'Wrist_L', axis: 'z', scale: 1 }], // Ulnar (+) / Radial (-) deviation
  'leftWrist.flexion': [{ boneName: 'Wrist_L', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  'rightWrist.deviation': [{ boneName: 'Wrist_R', axis: 'z', scale: -1 }], // Ulnar (+) / Radial (-) deviation
  'rightWrist.flexion': [{ boneName: 'Wrist_R', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  
  // === PELVIS ===
  'pelvis.tilt': [{ boneName: 'Root_M', axis: 'x', scale: 1 }],
  'pelvis.obliquity': [{ boneName: 'Root_M', axis: 'z', scale: 1 }],
  'pelvis.rotation': [{ boneName: 'Root_M', axis: 'y', scale: 1 }],
  'pelvis.drop': [{ boneName: 'Root_M', axis: 'y', scale: -0.01, isPosition: true }], // Vertical translation for closed-chain movements
  
  // === SPINE (Sagittal plane curves - use Y-axis for forward/backward movement) ===
  // Note: X = frontal plane (lateral), Z = lateral flexion/scoliosis, Y = sagittal plane
  'spine.cervicalLordosis': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.2 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.2 },
  ],
  'spine.thoracicKyphosis': [
    { boneName: 'Chest_M', axis: 'y', scale: 0.3 },
    { boneName: 'Spine1Part2_M', axis: 'y', scale: 0.2 },
    { boneName: 'Spine1Part1_M', axis: 'y', scale: 0.2 },
  ],
  'spine.lumbarLordosis': [
    { boneName: 'Spine1_M', axis: 'y', scale: 0.3 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.2 },
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.2 },
  ],
  'spine.scoliosis': [
    { boneName: 'RootPart1_M', axis: 'z', scale: 0.15 },
    { boneName: 'RootPart2_M', axis: 'z', scale: 0.2 },
    { boneName: 'Spine1_M', axis: 'z', scale: 0.15 },
    { boneName: 'Spine1Part1_M', axis: 'z', scale: -0.15 },
    { boneName: 'Spine1Part2_M', axis: 'z', scale: -0.2 },
    { boneName: 'Chest_M', axis: 'z', scale: -0.15 },
  ],
  'spine.cervicalRotation': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.2 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.2 },
  ],
  'spine.cervicalLateralFlexion': [
    { boneName: 'Neck_M', axis: 'z', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: 0.25 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: 0.2 },
  ],
  'spine.thoracicRotation': [
    { boneName: 'Chest_M', axis: 'y', scale: 0.2 },
    { boneName: 'Spine1Part2_M', axis: 'y', scale: 0.15 },
    { boneName: 'Spine1Part1_M', axis: 'y', scale: 0.15 },
  ],
  'spine.lumbarRotation': [
    { boneName: 'Spine1_M', axis: 'y', scale: 0.2 },
    { boneName: 'RootPart2_M', axis: 'y', scale: 0.15 },
    { boneName: 'RootPart1_M', axis: 'y', scale: 0.15 },
  ],
  'spine.flexion': [
    { boneName: 'RootPart1_M', axis: 'x', scale: 0.15 },
    { boneName: 'RootPart2_M', axis: 'x', scale: 0.15 },
    { boneName: 'Spine1_M', axis: 'x', scale: 0.12 },
    { boneName: 'Spine1Part1_M', axis: 'x', scale: 0.1 },
    { boneName: 'Spine1Part2_M', axis: 'x', scale: 0.08 },
    { boneName: 'Chest_M', axis: 'x', scale: 0.05 },
  ],
  'spine.lateralFlexion': [
    { boneName: 'RootPart1_M', axis: 'z', scale: 0.12 },
    { boneName: 'RootPart2_M', axis: 'z', scale: 0.12 },
    { boneName: 'Spine1_M', axis: 'z', scale: 0.1 },
    { boneName: 'Spine1Part1_M', axis: 'z', scale: 0.08 },
    { boneName: 'Spine1Part2_M', axis: 'z', scale: 0.06 },
    { boneName: 'Chest_M', axis: 'z', scale: 0.04 },
  ],

  // === HEAD & NECK (Cervical Spine) ===
  'neck.flexion': [
    { boneName: 'Neck_M', axis: 'x', scale: -0.3 },
    { boneName: 'NeckPart1_M', axis: 'x', scale: -0.25 },
    { boneName: 'NeckPart2_M', axis: 'x', scale: -0.2 },
    { boneName: 'Head_M', axis: 'x', scale: -0.15 },
  ],
  'neck.extension': [
    { boneName: 'Neck_M', axis: 'x', scale: 0.3 },
    { boneName: 'NeckPart1_M', axis: 'x', scale: 0.25 },
    { boneName: 'NeckPart2_M', axis: 'x', scale: 0.2 },
    { boneName: 'Head_M', axis: 'x', scale: 0.15 },
  ],
  'neck.rotation': [
    { boneName: 'Neck_M', axis: 'y', scale: 0.25 },
    { boneName: 'NeckPart1_M', axis: 'y', scale: 0.3 },
    { boneName: 'NeckPart2_M', axis: 'y', scale: 0.25 },
    { boneName: 'Head_M', axis: 'y', scale: 0.2 },
  ],
  'neck.lateralFlexion': [
    { boneName: 'Neck_M', axis: 'z', scale: 0.25 },
    { boneName: 'NeckPart1_M', axis: 'z', scale: 0.3 },
    { boneName: 'NeckPart2_M', axis: 'z', scale: 0.25 },
    { boneName: 'Head_M', axis: 'z', scale: 0.2 },
  ],
  'neck.forwardHead': [
    { boneName: 'Chest_M', axis: 'x', scale: 0.15 },
    { boneName: 'Neck_M', axis: 'x', scale: -0.25 },
    { boneName: 'NeckPart1_M', axis: 'x', scale: -0.2 },
    { boneName: 'NeckPart2_M', axis: 'x', scale: -0.15 },
    { boneName: 'Head_M', axis: 'x', scale: -0.1 },
  ],
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
  painMarkers = [],
  onPainMarkerAdd,
  onPainMarkerMove,
  onPainMarkerRemove,
  enablePainMarkers = false
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
  const highlightOverlaysRef = useRef<THREE.Mesh[]>([]);
  const painMarkerMeshesRef = useRef<Map<string, { inner: THREE.Mesh; outer: THREE.Mesh }>>(new Map());
  const draggingMarkerRef = useRef<{ id: string; mesh: THREE.Mesh; outerMesh: THREE.Mesh } | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const painMarkerCallbacksRef = useRef({ onPainMarkerAdd, onPainMarkerMove, onPainMarkerRemove });
  painMarkerCallbacksRef.current = { onPainMarkerAdd, onPainMarkerMove, onPainMarkerRemove };
  const enablePainMarkersRef = useRef(enablePainMarkers);
  enablePainMarkersRef.current = enablePainMarkers;

  const findNearestBone = useCallback((position: THREE.Vector3): { boneName: string; label: string } => {
    const bones = bonesRef.current;
    let minDist = Infinity;
    let nearest = 'Root_M';
    const worldPos = new THREE.Vector3();

    for (const [name, bone] of Object.entries(bones)) {
      if (!BONE_ANATOMICAL_LABELS[name]) continue;
      bone.getWorldPosition(worldPos);
      const dist = position.distanceTo(worldPos);
      if (dist < minDist) {
        minDist = dist;
        nearest = name;
      }
    }

    return { boneName: nearest, label: BONE_ANATOMICAL_LABELS[nearest] || nearest };
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
        painMarkerMeshesRef.current.delete(id);
      }
    });

    for (const marker of painMarkers) {
      if (painMarkerMeshesRef.current.has(marker.id)) {
        const meshes = painMarkerMeshesRef.current.get(marker.id)!;
        meshes.inner.position.set(marker.position.x, marker.position.y, marker.position.z);
        meshes.outer.position.set(marker.position.x, marker.position.y, marker.position.z);
        continue;
      }

      const pos = new THREE.Vector3(marker.position.x, marker.position.y, marker.position.z);

      const innerGeo = new THREE.SphereGeometry(0.06, 16, 12);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xff2222,
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

      const outerGeo = new THREE.SphereGeometry(0.1, 12, 8);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff2222,
        transparent: true,
        opacity: 0.2,
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
      painMarkerMeshesRef.current.set(marker.id, { inner: innerMesh, outer: outerMesh });
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

    const raycastModel = (ndc: THREE.Vector2): THREE.Vector3 | null => {
      raycasterRef.current.setFromCamera(ndc, camera);
      const meshes: THREE.Mesh[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.visible) meshes.push(child);
      });
      const hits = raycasterRef.current.intersectObjects(meshes, false);
      if (hits.length > 0) return hits[0].point.clone();
      return null;
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
          painMarkerCallbacksRef.current.onPainMarkerRemove?.(markerId);
          return;
        }
      }

      if (e.button === 0) {
        const ndc = getMouseNDC(e);
        const markerId = raycastPainMarkers(ndc);
        if (markerId) {
          const meshes = painMarkerMeshesRef.current.get(markerId);
          if (meshes) {
            draggingMarkerRef.current = { id: markerId, mesh: meshes.inner, outerMesh: meshes.outer };
            controls.enabled = false;
            domElement.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
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
        const hitPoint = raycastModel(ndc);
        if (hitPoint) {
          draggingMarkerRef.current.mesh.position.copy(hitPoint);
          draggingMarkerRef.current.outerMesh.position.copy(hitPoint);
        }
        e.preventDefault();
        return;
      }

      if (!enablePainMarkersRef.current) return;
      const ndc = getMouseNDC(e);
      const markerId = raycastPainMarkers(ndc);
      domElement.style.cursor = markerId ? 'grab' : '';
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      if (draggingMarkerRef.current) {
        finishDrag();
        mouseDownPosRef.current = null;
        return;
      }

      if (!enablePainMarkersRef.current) return;
      const downPos = mouseDownPosRef.current;

      if (e.button === 0 && downPos) {
        const dx = e.clientX - downPos.x;
        const dy = e.clientY - downPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          const ndc = getMouseNDC(e);
          const existingMarker = raycastPainMarkers(ndc);
          if (!existingMarker) {
            const hitPoint = raycastModel(ndc);
            if (hitPoint) {
              const boneInfo = findNearestBone(hitPoint);
              const marker: PainMarker = {
                id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                position: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
                nearestBone: boneInfo.boneName,
                anatomicalLabel: boneInfo.label,
              };
              painMarkerCallbacksRef.current.onPainMarkerAdd?.(marker);
            }
          }
        }
      }

      mouseDownPosRef.current = null;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!enablePainMarkersRef.current) return;
      const ndc = getMouseNDC(e);
      const markerId = raycastPainMarkers(ndc);
      if (markerId) {
        e.preventDefault();
      }
    };

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    domElement.addEventListener('contextmenu', onContextMenu);

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      domElement.removeEventListener('contextmenu', onContextMenu);
      if (draggingMarkerRef.current) {
        draggingMarkerRef.current = null;
        controls.enabled = true;
        domElement.style.cursor = '';
      }
    };
  }, [enablePainMarkers, findNearestBone]);

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
                  console.log('Found muscle mesh:', child.name);
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
            
            // Initialize leg IK solver after bones are loaded
            legIKStateRef.current = initializeLegIK(bones as { [name: string]: THREE.Bone });
            
            model.position.set(-0.15, -1.2, 0);
            scene.add(model);
            
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
          
          // Always apply stored rotations to shoulder bones (live pose effect stores values here too)
          ['Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R'].forEach(boneName => {
            const bone = currentBones[boneName] as THREE.Bone;
            const sliderRot = sliderRotations[boneName];
            const initialRot = initialRots[boneName];
            
            if (bone && sliderRot && initialRot) {
              // Apply rotation delta on top of initial rotation
              bone.rotation.x = initialRot.x + sliderRot.x;
              bone.rotation.y = initialRot.y + sliderRot.y;
              bone.rotation.z = initialRot.z + sliderRot.z;
            }
          });
          
          // Update muscle visualization to follow skeleton movement
          if (muscleVisualizationRef.current) {
            const now = performance.now();
            const lastTime = (muscleVisualizationRef.current as any).lastFrameTime || now;
            const delta = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms to prevent large jumps
            (muscleVisualizationRef.current as any).lastFrameTime = now;
            muscleVisualizationRef.current.updateFrame(delta);
          }
          
          sceneRef.current.controls.update();
          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        };
        
        animate();

        const handleResize = () => {
          if (!sceneRef.current || !containerRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          sceneRef.current.camera.aspect = width / height;
          sceneRef.current.camera.updateProjectionMatrix();
          sceneRef.current.renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
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
    
    // Apply derived lumbar lordosis to spine bones (x-axis, same as BONE_MAPPING)
    const lumbarBones = ['Root_M', 'RootPart1_M', 'RootPart2_M', 'Spine1_M', 'Spine1Part1_M', 'Spine1Part2_M'];
    const lumbarScale = 0.2; // Match BONE_MAPPING scale
    lumbarBones.forEach(boneName => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedLumbarLordosis * Math.PI) / 180;
        boneRotations[boneName].x += angleInRadians * lumbarScale;
      }
    });
    
    // Apply derived scoliosis to spine/chest bones (z-axis, with alternating scales)
    const scoliosisMappings = [
      { boneName: 'Root_M', scale: 0.1 },
      { boneName: 'RootPart1_M', scale: 0.15 },
      { boneName: 'RootPart2_M', scale: 0.2 },
      { boneName: 'Spine1_M', scale: 0.2 },
      { boneName: 'Spine1Part1_M', scale: 0.15 },
      { boneName: 'Spine1Part2_M', scale: 0.1 },
      { boneName: 'Chest_M', scale: -0.1 },
    ];
    scoliosisMappings.forEach(({ boneName, scale }) => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedScoliosis * Math.PI) / 180;
        boneRotations[boneName].z += angleInRadians * scale;
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
    // Disable animation playback when live pose is active
    if (livePose) return;
    
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
      
      // Initialize rotations from initial state
      Object.keys(bones).forEach(boneName => {
        const initial = initialRotations[boneName];
        if (initial) {
          animBoneRotations[boneName] = { x: initial.x, y: initial.y, z: initial.z };
        }
      });
      
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
      
      // Check if this is a closed-chain movement (squat) that needs IK
      const pelvisDropValue = jointValues['pelvis']?.['drop'] || 0;
      const isClosedChainMovement = pelvisDropValue > 0 && legIKStateRef.current?.initialized;
      
      if (isClosedChainMovement && legIKStateRef.current) {
        // CLOSED-CHAIN: Use IK to keep feet planted while pelvis drops
        // First apply pelvis position (body lowers)
        const pelvisBone = bones['Root_M'] as THREE.Bone;
        if (pelvisBone) {
          if (!(pelvisBone as any).initialPosition) {
            (pelvisBone as any).initialPosition = pelvisBone.position.clone();
          }
          const initialPos = (pelvisBone as any).initialPosition as THREE.Vector3;
          const dropAmount = pelvisDropValue * 0.01; // Convert degrees-like value to units
          pelvisBone.position.y = initialPos.y - dropAmount;
          pelvisBone.updateMatrixWorld(true);
        }
        
        // Apply IK to calculate leg angles that keep feet planted
        const ikInitialRotations: { [name: string]: { x: number; y: number; z: number } } = {};
        Object.entries(initialRotations).forEach(([name, euler]) => {
          ikInitialRotations[name] = { x: euler.x, y: euler.y, z: euler.z };
        });
        
        applySquatIK(
          bones as { [name: string]: THREE.Bone },
          ikInitialRotations,
          legIKStateRef.current
        );
        
        // Apply non-leg rotations (spine, shoulders, etc.) from FK animation
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          // Skip leg bones - they're controlled by IK
          if (boneName.includes('Hip') || boneName.includes('Knee') || boneName.includes('Ankle') || boneName.includes('Toes')) {
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
        // OPEN-CHAIN: Standard FK animation (walking, lunges, etc.)
        // Apply rotations to bones
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          const bone = bones[boneName];
          if (bone) {
            bone.rotation.x = rotation.x;
            bone.rotation.y = rotation.y;
            bone.rotation.z = rotation.z;
          }
        });
        
        // Apply positions to bones
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
        
        // Also reset positions for bones with position mappings when animation resets to 0
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

      const color = getMuscleColor(state);

      group.meshes.forEach((mesh) => {
        if (mesh instanceof THREE.SkinnedMesh || mesh instanceof THREE.Mesh) {
          if (!originalMaterialsRef.current.has(mesh)) {
            originalMaterialsRef.current.set(mesh, (mesh.material as THREE.Material).clone());
          }
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.color) {
            mat.color.setRGB(color.r, color.g, color.b);
            mat.emissive?.setRGB(color.r * 0.15, color.g * 0.15, color.b * 0.15);
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [muscleStates]);

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
    </div>
  );
}
