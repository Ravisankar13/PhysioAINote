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

interface ModelConfig {
  leftHip?: JointConfig;
  rightHip?: JointConfig;
  leftKnee?: JointConfig;
  rightKnee?: JointConfig;
  leftAnkle?: JointConfig;
  rightAnkle?: JointConfig;
  leftShoulder?: JointConfig;
  rightShoulder?: JointConfig;
  leftElbow?: JointConfig;
  rightElbow?: JointConfig;
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number };
  spine?: { cervicalLordosis?: number; thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number };
  neck?: { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number };
  [key: string]: JointConfig | { tilt?: number; obliquity?: number; rotation?: number } | { thoracicKyphosis?: number; lumbarLordosis?: number; scoliosis?: number } | { flexion?: number; extension?: number; rotation?: number; lateralFlexion?: number; forwardHead?: number } | undefined;
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
  front: { position: { x: 0, y: 1.5, z: 8 }, lookAt: { x: 0, y: 1.5, z: 0 }, label: 'Front View' },
  back: { position: { x: 0, y: 1.5, z: -8 }, lookAt: { x: 0, y: 1.5, z: 0 }, label: 'Back View' },
  left: { position: { x: -8, y: 1.5, z: 0 }, lookAt: { x: 0, y: 1.5, z: 0 }, label: 'Left Side' },
  right: { position: { x: 8, y: 1.5, z: 0 }, lookAt: { x: 0, y: 1.5, z: 0 }, label: 'Right Side' },
  top: { position: { x: 0, y: 10, z: 0.1 }, lookAt: { x: 0, y: 1.2, z: 0 }, label: 'Top View (Transverse)' },
  perspective: { position: { x: 5, y: 3, z: 5 }, lookAt: { x: 0, y: 1.5, z: 0 }, label: '3/4 View' },
  custom: { position: { x: 0, y: 1.5, z: 8 }, lookAt: { x: 0, y: 2, z: 0 }, label: 'Custom' },
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
    position: { x: 0, y: 1.5, z: 5 }, 
    lookAt: { x: 0, y: 1.2, z: 0 }, 
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
  L1_L2: { position: { x: 0.5, y: 0.95, z: 0.8 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2', icon: '🔹', description: 'L1-L2 motion segment' },
  L2_L3: { position: { x: 0.5, y: 0.85, z: 0.8 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3', icon: '🔹', description: 'L2-L3 motion segment' },
  L3_L4: { position: { x: 0.5, y: 0.75, z: 0.8 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4', icon: '🔹', description: 'L3-L4 motion segment' },
  L4_L5: { position: { x: 0.5, y: 0.65, z: 0.8 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5', icon: '🔹', description: 'L4-L5 motion segment - most common disc herniation site' },
  L5_S1: { position: { x: 0.5, y: 0.55, z: 0.8 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1', icon: '🔹', description: 'L5-S1 lumbosacral junction' },
  // Sub-structure views - facet joints (oblique posterolateral view ~45° from behind)
  L1_L2_facet: { position: { x: 0.5, y: 0.95, z: -0.5 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Facet', icon: '◇', description: 'L1-L2 zygapophyseal joints' },
  L2_L3_facet: { position: { x: 0.5, y: 0.85, z: -0.5 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Facet', icon: '◇', description: 'L2-L3 zygapophyseal joints' },
  L3_L4_facet: { position: { x: 0.5, y: 0.75, z: -0.5 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Facet', icon: '◇', description: 'L3-L4 zygapophyseal joints' },
  L4_L5_facet: { position: { x: 0.5, y: 0.65, z: -0.5 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Facet', icon: '◇', description: 'L4-L5 zygapophyseal joints' },
  L5_S1_facet: { position: { x: 0.5, y: 0.55, z: -0.5 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Facet', icon: '◇', description: 'L5-S1 zygapophyseal joints' },
  // Pars interarticularis (oblique "Scotty dog" view - posterior-lateral ~30-45°)
  L1_L2_pars: { position: { x: 0.6, y: 0.95, z: -0.4 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Pars', icon: '🐕', description: 'L1-L2 pars interarticularis' },
  L2_L3_pars: { position: { x: 0.6, y: 0.85, z: -0.4 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Pars', icon: '🐕', description: 'L2-L3 pars interarticularis' },
  L3_L4_pars: { position: { x: 0.6, y: 0.75, z: -0.4 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Pars', icon: '🐕', description: 'L3-L4 pars interarticularis' },
  L4_L5_pars: { position: { x: 0.6, y: 0.65, z: -0.4 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Pars', icon: '🐕', description: 'L4-L5 pars interarticularis - common spondylolysis site' },
  L5_S1_pars: { position: { x: 0.6, y: 0.55, z: -0.4 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Pars', icon: '🐕', description: 'L5-S1 pars interarticularis' },
  // Disc (lateral view)
  L1_L2_disc: { position: { x: 0.8, y: 0.95, z: 0 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Disc', icon: '💿', description: 'L1-L2 intervertebral disc' },
  L2_L3_disc: { position: { x: 0.8, y: 0.85, z: 0 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Disc', icon: '💿', description: 'L2-L3 intervertebral disc' },
  L3_L4_disc: { position: { x: 0.8, y: 0.75, z: 0 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Disc', icon: '💿', description: 'L3-L4 intervertebral disc' },
  L4_L5_disc: { position: { x: 0.8, y: 0.65, z: 0 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Disc', icon: '💿', description: 'L4-L5 intervertebral disc - most common herniation' },
  L5_S1_disc: { position: { x: 0.8, y: 0.55, z: 0 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Disc', icon: '💿', description: 'L5-S1 intervertebral disc' },
  // Vertebral body (anterior view)
  L1_L2_body: { position: { x: 0, y: 0.95, z: 0.8 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Body', icon: '⬜', description: 'L1-L2 vertebral bodies' },
  L2_L3_body: { position: { x: 0, y: 0.85, z: 0.8 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Body', icon: '⬜', description: 'L2-L3 vertebral bodies' },
  L3_L4_body: { position: { x: 0, y: 0.75, z: 0.8 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Body', icon: '⬜', description: 'L3-L4 vertebral bodies' },
  L4_L5_body: { position: { x: 0, y: 0.65, z: 0.8 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Body', icon: '⬜', description: 'L4-L5 vertebral bodies' },
  L5_S1_body: { position: { x: 0, y: 0.55, z: 0.8 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Body', icon: '⬜', description: 'L5-S1 vertebral bodies' },
  // Spinous process (posterior view)
  L1_L2_spinous: { position: { x: 0, y: 0.95, z: -0.6 }, lookAt: { x: 0, y: 0.95, z: 0 }, label: 'L1/L2 Spinous', icon: '▲', description: 'L1-L2 spinous processes' },
  L2_L3_spinous: { position: { x: 0, y: 0.85, z: -0.6 }, lookAt: { x: 0, y: 0.85, z: 0 }, label: 'L2/L3 Spinous', icon: '▲', description: 'L2-L3 spinous processes' },
  L3_L4_spinous: { position: { x: 0, y: 0.75, z: -0.6 }, lookAt: { x: 0, y: 0.75, z: 0 }, label: 'L3/L4 Spinous', icon: '▲', description: 'L3-L4 spinous processes' },
  L4_L5_spinous: { position: { x: 0, y: 0.65, z: -0.6 }, lookAt: { x: 0, y: 0.65, z: 0 }, label: 'L4/L5 Spinous', icon: '▲', description: 'L4-L5 spinous processes' },
  L5_S1_spinous: { position: { x: 0, y: 0.55, z: -0.6 }, lookAt: { x: 0, y: 0.55, z: 0 }, label: 'L5/S1 Spinous', icon: '▲', description: 'L5-S1 spinous processes' },
};

export const REGION_MESH_MAPPING: Record<AnatomicalRegion, string[]> = {
  full_body: [],
  lumbar_spine: ['BONES_SPINE1'],
  thoracic_spine: ['BONES_SPINE1', 'BONES_RIBCAGE1'],
  cervical_spine: ['BONES_SPINE1', 'BONES_HEAD1'],
  left_shoulder: ['BONES_ARML002', 'BONES_ARML1', 'BONES_RIBCAGE1'],
  right_shoulder: ['BONES_ARMR002', 'BONES_ARMR1', 'BONES_RIBCAGE1'],
  left_hip: ['BONES_LEGL002', 'BONES_LEGL1', 'BONES_PELVIS1'],
  right_hip: ['BONES_LEGR002', 'BONES_LEGR1', 'BONES_PELVIS1'],
  pelvis: ['BONES_PELVIS1', 'BONES_SPINE1'],
  left_knee: ['BONES_LEGL002', 'BONES_LEGL1'],
  right_knee: ['BONES_LEGR002', 'BONES_LEGR1'],
  left_ankle: ['BONES_LEGL002', 'BONES_LEGL1'],
  right_ankle: ['BONES_LEGR002', 'BONES_LEGR1'],
  left_elbow: ['BONES_ARML002', 'BONES_ARML1'],
  right_elbow: ['BONES_ARMR002', 'BONES_ARMR1'],
  // Lumbar segment pairs - focus on spine and pelvis meshes
  L1_L2: ['BONES_SPINE1'],
  L2_L3: ['BONES_SPINE1'],
  L3_L4: ['BONES_SPINE1'],
  L4_L5: ['BONES_SPINE1'],
  L5_S1: ['BONES_SPINE1', 'BONES_PELVIS1'],
  // Sub-structures all focus on spine mesh
  L1_L2_facet: ['BONES_SPINE1'], L1_L2_pars: ['BONES_SPINE1'], L1_L2_disc: ['BONES_SPINE1'], L1_L2_body: ['BONES_SPINE1'], L1_L2_spinous: ['BONES_SPINE1'],
  L2_L3_facet: ['BONES_SPINE1'], L2_L3_pars: ['BONES_SPINE1'], L2_L3_disc: ['BONES_SPINE1'], L2_L3_body: ['BONES_SPINE1'], L2_L3_spinous: ['BONES_SPINE1'],
  L3_L4_facet: ['BONES_SPINE1'], L3_L4_pars: ['BONES_SPINE1'], L3_L4_disc: ['BONES_SPINE1'], L3_L4_body: ['BONES_SPINE1'], L3_L4_spinous: ['BONES_SPINE1'],
  L4_L5_facet: ['BONES_SPINE1'], L4_L5_pars: ['BONES_SPINE1'], L4_L5_disc: ['BONES_SPINE1'], L4_L5_body: ['BONES_SPINE1'], L4_L5_spinous: ['BONES_SPINE1'],
  L5_S1_facet: ['BONES_SPINE1', 'BONES_PELVIS1'], L5_S1_pars: ['BONES_SPINE1', 'BONES_PELVIS1'], L5_S1_disc: ['BONES_SPINE1', 'BONES_PELVIS1'], L5_S1_body: ['BONES_SPINE1', 'BONES_PELVIS1'], L5_S1_spinous: ['BONES_SPINE1', 'BONES_PELVIS1'],
};

// Bone-level mapping for individual spinal segments
// Model has spine2-spine20 (19 bones). Lumbar region is roughly spine2-spine7 (lower spine)
// Each segment pair spans ~2-3 bones to represent the motion segment
export const SEGMENT_BONE_MAPPING: Record<string, string[]> = {
  // Lumbar segments - spine2 is lowest (L5), spine7 is highest (L1)
  'L5_S1': ['spine2', 'spine3'],           // L5-S1 junction
  'L4_L5': ['spine3', 'spine4'],           // L4-L5 segment
  'L3_L4': ['spine4', 'spine5'],           // L3-L4 segment
  'L2_L3': ['spine5', 'spine6'],           // L2-L3 segment
  'L1_L2': ['spine6', 'spine7'],           // L1-L2 segment
  // Sub-structures use same bones as their parent segment
  'L5_S1_facet': ['spine2', 'spine3'], 'L5_S1_pars': ['spine2', 'spine3'], 'L5_S1_disc': ['spine2', 'spine3'], 'L5_S1_body': ['spine2', 'spine3'], 'L5_S1_spinous': ['spine2', 'spine3'],
  'L4_L5_facet': ['spine3', 'spine4'], 'L4_L5_pars': ['spine3', 'spine4'], 'L4_L5_disc': ['spine3', 'spine4'], 'L4_L5_body': ['spine3', 'spine4'], 'L4_L5_spinous': ['spine3', 'spine4'],
  'L3_L4_facet': ['spine4', 'spine5'], 'L3_L4_pars': ['spine4', 'spine5'], 'L3_L4_disc': ['spine4', 'spine5'], 'L3_L4_body': ['spine4', 'spine5'], 'L3_L4_spinous': ['spine4', 'spine5'],
  'L2_L3_facet': ['spine5', 'spine6'], 'L2_L3_pars': ['spine5', 'spine6'], 'L2_L3_disc': ['spine5', 'spine6'], 'L2_L3_body': ['spine5', 'spine6'], 'L2_L3_spinous': ['spine5', 'spine6'],
  'L1_L2_facet': ['spine6', 'spine7'], 'L1_L2_pars': ['spine6', 'spine7'], 'L1_L2_disc': ['spine6', 'spine7'], 'L1_L2_body': ['spine6', 'spine7'], 'L1_L2_spinous': ['spine6', 'spine7'],
  // Lumbar spine region - all lumbar bones
  'lumbar_spine': ['spine2', 'spine3', 'spine4', 'spine5', 'spine6', 'spine7'],
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
}

const BONE_MAPPING: { [configKey: string]: { boneName: string; axis: 'x' | 'y' | 'z'; scale: number; isPosition?: boolean }[] } = {
  // === HIP / FEMUR ===
  'leftHip.flexion': [{ boneName: 'Femer_Root_L', axis: 'x', scale: -1 }],
  'leftHip.extension': [{ boneName: 'Femer_Root_L', axis: 'x', scale: 1 }],
  'leftHip.abduction': [{ boneName: 'Femer_Root_L', axis: 'z', scale: -1 }],
  'leftHip.internalRotation': [{ boneName: 'Femer_Root_L', axis: 'y', scale: 1 }],
  'leftHip.anteversion': [{ boneName: 'Femer_Root_L', axis: 'y', scale: 1 }], // Femoral anteversion - causes internal rotation
  'leftHip.neckShaftAngle': [{ boneName: 'Femer_Root_L', axis: 'z', scale: 0.5 }], // Coxa vara/valga
  'rightHip.flexion': [{ boneName: 'Femer_Root_R', axis: 'x', scale: -1 }],
  'rightHip.extension': [{ boneName: 'Femer_Root_R', axis: 'x', scale: 1 }],
  'rightHip.abduction': [{ boneName: 'Femer_Root_R', axis: 'z', scale: 1 }],
  'rightHip.internalRotation': [{ boneName: 'Femer_Root_R', axis: 'y', scale: -1 }],
  'rightHip.anteversion': [{ boneName: 'Femer_Root_R', axis: 'y', scale: -1 }], // Femoral anteversion - causes internal rotation
  'rightHip.neckShaftAngle': [{ boneName: 'Femer_Root_R', axis: 'z', scale: -0.5 }], // Coxa vara/valga
  
  // === KNEE / TIBIA ===
  'leftKnee.flexion': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: 1 }],
  'leftKnee.varus': [{ boneName: 'fibula_tibia_L', axis: 'z', scale: 1 }], // Genu varum (+) / valgum (-)
  'leftKnee.tibialTorsion': [{ boneName: 'fibula_tibia_L', axis: 'y', scale: 1 }], // External/internal tibial rotation
  'leftKnee.recurvatum': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'leftKnee.tibialSlope': [{ boneName: 'fibula_tibia_L', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  'rightKnee.flexion': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: 1 }],
  'rightKnee.varus': [{ boneName: 'fibula_tibia_R', axis: 'z', scale: -1 }], // Genu varum (+) / valgum (-)
  'rightKnee.tibialTorsion': [{ boneName: 'fibula_tibia_R', axis: 'y', scale: -1 }], // External/internal tibial rotation
  'rightKnee.recurvatum': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: -0.5 }], // Knee hyperextension
  'rightKnee.tibialSlope': [{ boneName: 'fibula_tibia_R', axis: 'x', scale: 0.3 }], // Posterior tibial slope
  
  // === ANKLE & FOOT ===
  'leftAnkle.dorsiflexion': [{ boneName: 'foot_L', axis: 'x', scale: -1 }],
  'leftAnkle.plantarflexion': [{ boneName: 'foot_L', axis: 'x', scale: 1 }],
  'leftAnkle.inversion': [{ boneName: 'foot_L', axis: 'z', scale: 1 }],
  'leftAnkle.eversion': [{ boneName: 'foot_L', axis: 'z', scale: -1 }],
  'rightAnkle.dorsiflexion': [{ boneName: 'foot_R', axis: 'x', scale: -1 }],
  'rightAnkle.plantarflexion': [{ boneName: 'foot_R', axis: 'x', scale: 1 }],
  'rightAnkle.inversion': [{ boneName: 'foot_R', axis: 'z', scale: -1 }],
  'rightAnkle.eversion': [{ boneName: 'foot_R', axis: 'z', scale: 1 }],
  
  // === SHOULDER ===
  // In T-pose, arms point laterally. Flexion rotates arm forward (sagittal plane).
  // For left arm pointing left (-X), flexion uses Y-axis rotation
  'leftShoulder.flexion': [{ boneName: 'Humerus_Root_L', axis: 'y', scale: 1 }], // Forward flexion - Y rotation brings arm forward
  'leftShoulder.abduction': [{ boneName: 'Humerus_Root_L', axis: 'z', scale: -1 }], // Abduction - Z rotation for lateral elevation
  'leftShoulder.internalRotation': [{ boneName: 'Humerus_L', axis: 'x', scale: 1 }], // Internal rotation around humerus long axis
  'leftShoulder.externalRotation': [{ boneName: 'Humerus_L', axis: 'x', scale: -1 }], // External rotation around humerus long axis
  'leftShoulder.retroversion': [{ boneName: 'Humerus_L', axis: 'y', scale: 1 }], // Humeral head retroversion
  'leftShoulder.elevation': [
    { boneName: 'Rib_Cage', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Humerus_Root_L', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  // For right arm pointing right (+X), flexion uses Y-axis rotation (opposite sign)
  'rightShoulder.flexion': [{ boneName: 'Humerus_Root_R', axis: 'y', scale: -1 }], // Forward flexion - Y rotation brings arm forward
  'rightShoulder.abduction': [{ boneName: 'Humerus_Root_R', axis: 'z', scale: 1 }], // Abduction - Z rotation for lateral elevation
  'rightShoulder.internalRotation': [{ boneName: 'Humerus_R', axis: 'x', scale: -1 }], // Internal rotation around humerus long axis
  'rightShoulder.externalRotation': [{ boneName: 'Humerus_R', axis: 'x', scale: 1 }], // External rotation around humerus long axis
  'rightShoulder.retroversion': [{ boneName: 'Humerus_R', axis: 'y', scale: -1 }], // Humeral head retroversion
  'rightShoulder.elevation': [
    { boneName: 'Rib_Cage', axis: 'x', scale: -0.15 }, // Slight rib cage tilt
    { boneName: 'Humerus_Root_R', axis: 'x', scale: 0.3 } // Counter-rotate to lift arm
  ],
  
  // === ELBOW ===
  'leftElbow.flexion': [{ boneName: 'Redius_Alna_L', axis: 'x', scale: -1 }],
  'leftElbow.pronation': [{ boneName: 'Redius_Alna_L', axis: 'y', scale: 1 }],
  'leftElbow.carryingAngle': [{ boneName: 'Redius_Alna_L', axis: 'z', scale: -1 }], // Cubitus valgus/varus
  'rightElbow.flexion': [{ boneName: 'Redius_Alna_R', axis: 'x', scale: -1 }],
  'rightElbow.pronation': [{ boneName: 'Redius_Alna_R', axis: 'y', scale: -1 }],
  'rightElbow.carryingAngle': [{ boneName: 'Redius_Alna_R', axis: 'z', scale: 1 }], // Cubitus valgus/varus
  
  // === WRIST ===
  'leftWrist.deviation': [{ boneName: 'Hand_L', axis: 'z', scale: 1 }], // Ulnar (+) / Radial (-) deviation
  'leftWrist.flexion': [{ boneName: 'Hand_L', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  'rightWrist.deviation': [{ boneName: 'Hand_R', axis: 'z', scale: -1 }], // Ulnar (+) / Radial (-) deviation
  'rightWrist.flexion': [{ boneName: 'Hand_R', axis: 'x', scale: 1 }], // Flexion (+) / Extension (-)
  
  // === PELVIS ===
  'pelvis.tilt': [{ boneName: 'Pelvis_Main', axis: 'x', scale: 1 }],
  'pelvis.obliquity': [{ boneName: 'Pelvis_Main', axis: 'z', scale: 1 }],
  'pelvis.rotation': [{ boneName: 'Pelvis_Main', axis: 'y', scale: 1 }],
  'pelvis.drop': [{ boneName: 'Pelvis_Main', axis: 'y', scale: -0.01, isPosition: true }], // Vertical translation for closed-chain movements
  
  // === SPINE ===
  'spine.cervicalLordosis': [
    { boneName: 'spine17', axis: 'x', scale: 0.2 },
    { boneName: 'spine18', axis: 'x', scale: 0.2 },
    { boneName: 'spine19', axis: 'x', scale: 0.2 },
    { boneName: 'spine20', axis: 'x', scale: 0.2 },
  ],
  'spine.thoracicKyphosis': [
    { boneName: 'spine8', axis: 'x', scale: 0.1 },
    { boneName: 'spine9', axis: 'x', scale: 0.1 },
    { boneName: 'spine10', axis: 'x', scale: 0.1 },
    { boneName: 'spine11', axis: 'x', scale: 0.1 },
    { boneName: 'spine12', axis: 'x', scale: 0.1 },
    { boneName: 'spine13', axis: 'x', scale: 0.1 },
    { boneName: 'spine14', axis: 'x', scale: 0.1 },
    { boneName: 'spine15', axis: 'x', scale: 0.1 },
    { boneName: 'spine16', axis: 'x', scale: 0.1 },
  ],
  'spine.lumbarLordosis': [
    { boneName: 'spine2', axis: 'x', scale: 0.2 },
    { boneName: 'spine3', axis: 'x', scale: 0.2 },
    { boneName: 'spine4', axis: 'x', scale: 0.2 },
    { boneName: 'spine5', axis: 'x', scale: 0.2 },
    { boneName: 'spine6', axis: 'x', scale: 0.2 },
    { boneName: 'spine7', axis: 'x', scale: 0.2 },
  ],
  'spine.scoliosis': [
    { boneName: 'spine4', axis: 'z', scale: 0.1 },
    { boneName: 'spine5', axis: 'z', scale: 0.15 },
    { boneName: 'spine6', axis: 'z', scale: 0.2 },
    { boneName: 'spine7', axis: 'z', scale: 0.15 },
    { boneName: 'spine8', axis: 'z', scale: 0.1 },
    { boneName: 'spine10', axis: 'z', scale: -0.1 },
    { boneName: 'spine11', axis: 'z', scale: -0.15 },
    { boneName: 'spine12', axis: 'z', scale: -0.2 },
    { boneName: 'spine13', axis: 'z', scale: -0.15 },
    { boneName: 'spine14', axis: 'z', scale: -0.1 },
  ],
  'spine.cervicalRotation': [
    { boneName: 'spine17', axis: 'y', scale: 0.2 },
    { boneName: 'spine18', axis: 'y', scale: 0.25 },
    { boneName: 'spine19', axis: 'y', scale: 0.3 },
    { boneName: 'spine20', axis: 'y', scale: 0.25 },
  ],
  'spine.cervicalLateralFlexion': [
    { boneName: 'spine17', axis: 'z', scale: 0.2 },
    { boneName: 'spine18', axis: 'z', scale: 0.25 },
    { boneName: 'spine19', axis: 'z', scale: 0.3 },
    { boneName: 'spine20', axis: 'z', scale: 0.25 },
  ],
  'spine.thoracicRotation': [
    { boneName: 'spine8', axis: 'y', scale: 0.08 },
    { boneName: 'spine9', axis: 'y', scale: 0.08 },
    { boneName: 'spine10', axis: 'y', scale: 0.08 },
    { boneName: 'spine11', axis: 'y', scale: 0.08 },
    { boneName: 'spine12', axis: 'y', scale: 0.08 },
    { boneName: 'spine13', axis: 'y', scale: 0.08 },
    { boneName: 'spine14', axis: 'y', scale: 0.08 },
    { boneName: 'spine15', axis: 'y', scale: 0.08 },
    { boneName: 'spine16', axis: 'y', scale: 0.08 },
  ],
  'spine.lumbarRotation': [
    { boneName: 'spine2', axis: 'y', scale: 0.1 },
    { boneName: 'spine3', axis: 'y', scale: 0.1 },
    { boneName: 'spine4', axis: 'y', scale: 0.1 },
    { boneName: 'spine5', axis: 'y', scale: 0.1 },
    { boneName: 'spine6', axis: 'y', scale: 0.1 },
    { boneName: 'spine7', axis: 'y', scale: 0.1 },
  ],

  // === HEAD & NECK (Cervical Spine) ===
  'neck.flexion': [
    { boneName: 'spine17', axis: 'x', scale: -0.25 },
    { boneName: 'spine18', axis: 'x', scale: -0.25 },
    { boneName: 'spine19', axis: 'x', scale: -0.25 },
    { boneName: 'spine20', axis: 'x', scale: -0.25 },
  ],
  'neck.extension': [
    { boneName: 'spine17', axis: 'x', scale: 0.25 },
    { boneName: 'spine18', axis: 'x', scale: 0.25 },
    { boneName: 'spine19', axis: 'x', scale: 0.25 },
    { boneName: 'spine20', axis: 'x', scale: 0.25 },
  ],
  'neck.rotation': [
    { boneName: 'spine17', axis: 'y', scale: 0.2 },
    { boneName: 'spine18', axis: 'y', scale: 0.25 },
    { boneName: 'spine19', axis: 'y', scale: 0.3 },
    { boneName: 'spine20', axis: 'y', scale: 0.25 },
  ],
  'neck.lateralFlexion': [
    { boneName: 'spine17', axis: 'z', scale: 0.2 },
    { boneName: 'spine18', axis: 'z', scale: 0.25 },
    { boneName: 'spine19', axis: 'z', scale: 0.3 },
    { boneName: 'spine20', axis: 'z', scale: 0.25 },
  ],
  'neck.forwardHead': [
    { boneName: 'spine16', axis: 'x', scale: 0.15 },
    { boneName: 'spine17', axis: 'x', scale: -0.2 },
    { boneName: 'spine18', axis: 'x', scale: -0.25 },
    { boneName: 'spine19', axis: 'x', scale: -0.2 },
    { boneName: 'spine20', axis: 'x', scale: -0.15 },
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
  livePose = null
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
  const animationConstraintsRef = useRef<AnimationConstraint[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
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
    
    const { camera, controls, model } = sceneRef.current;
    
    if (!zoomToRegion || zoomToRegion === 'full_body') {
      // Clean up any existing segment markers from bones
      const bones = bonesRef.current;
      Object.values(bones).forEach((bone) => {
        if (bone && bone.children) {
          const markers = bone.children.filter((c: THREE.Object3D) => c.userData.isSegmentMarker);
          markers.forEach((marker: THREE.Object3D) => bone.remove(marker));
        }
      });
      
      if (model) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                mat.opacity = 1;
                mat.transparent = false;
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
    const hasSegmentBones = focusedBones.length > 0;
    const bones = bonesRef.current;
    const sceneData = sceneRef.current;
    const scene = sceneData?.scene;

    // Remove any existing highlight markers from all bones
    Object.values(bones).forEach((bone) => {
      if (bone && bone.children) {
        const markers = bone.children.filter((c: THREE.Object3D) => c.userData.isSegmentMarker);
        markers.forEach((marker: THREE.Object3D) => bone.remove(marker));
      }
    });

    // Create highlight markers for focused bones (spinal segments)
    // Markers are added as children of bones so they move with the skeleton
    if (hasSegmentBones && Object.keys(bones).length > 0) {
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        depthTest: true,
      });
      const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      
      focusedBones.forEach((boneName) => {
        const bone = bones[boneName];
        if (bone) {
          const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
          marker.userData.isSegmentMarker = true;
          
          // Position marker at bone origin (local space)
          marker.position.set(0, 0, 0);
          
          // Add as child of bone so it follows bone movement
          bone.add(marker);
        }
      });
    }

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

      // Mesh-level opacity control
      if (model && focusedMeshes.length > 0) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const meshName = child.name || '';
            const isFocused = focusedMeshes.includes(meshName);
            
            // For segment views, dim non-spine meshes more aggressively
            const baseOpacity = hasSegmentBones ? 0.08 : 0.15;
            const targetOpacity = isFocused ? 1 : baseOpacity + (1 - easeProgress) * (1 - baseOpacity);
            
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                mat.transparent = true;
                mat.opacity = isFocused ? 1 : targetOpacity;
                mat.depthWrite = mat.opacity > 0.5;
              }
            });
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
        const preset = CAMERA_PRESETS[cameraAngle];
        camera.position.set(preset.position.x, preset.position.y, preset.position.z);
        camera.lookAt(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
        console.log('THREE.js camera initialized with angle:', cameraAngle);

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
        controls.target.set(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
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
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale;
            model.position.z = -center.z * scale;
            
            const bones: { [name: string]: THREE.Object3D } = {};
            const boneNames: string[] = [];
            const objectTypes: string[] = [];
            
            let skullMesh: THREE.Object3D | null = null;
            
            model.traverse((child) => {
              objectTypes.push(`${child.name}: ${child.type}`);
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Find skull mesh by name pattern
                const lowerName = child.name.toLowerCase();
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
            
            // Log all meshes for debugging
            console.log('=== ALL MESHES IN MODEL ===');
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                console.log(`Mesh: ${child.name}, parent: ${child.parent?.name || 'none'}`);
              }
            });
            
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
            
            // Compute and store the fixed offset between spine20 and Root in bind pose
            // headOffset = spine20BindInverse * rootBindWorld
            if (bones['Root'] && bones['spine20']) {
              const rootBone = bones['Root'] as THREE.Bone;
              const spine20 = bones['spine20'] as THREE.Bone;
              const spine16 = bones['spine16'] as THREE.Bone;
              const ribCage = bones['Rib_Cage'] as THREE.Bone;
              const armature = rootBone.parent; // Armature
              
              // Update all matrices to get bind pose
              if (armature) armature.updateMatrixWorld(true);
              rootBone.updateMatrixWorld(true);
              spine20.updateMatrixWorld(true);
              if (spine16) spine16.updateMatrixWorld(true);
              
              // Compute headOffset = spine20BindInverse * rootBindWorld
              // This is the fixed spatial relationship between spine20 and Root
              const spine20BindInverse = spine20.matrixWorld.clone().invert();
              const headOffset = spine20BindInverse.clone().multiply(rootBone.matrixWorld);
              (rootBone as any).headOffset = headOffset;
              
              // Store Armature reference and its bind matrix inverse for later
              if (armature) {
                (rootBone as any).armature = armature;
                (rootBone as any).armatureBindInverse = armature.matrixWorld.clone().invert();
              }
              
              // Rib_Cage (shoulders) should follow spine16 (thoracic top), not spine20 (neck)
              // This ensures arms stay connected when thoracic/lumbar spine moves
              if (ribCage && spine16) {
                ribCage.updateMatrixWorld(true);
                const spine16BindInverse = spine16.matrixWorld.clone().invert();
                const ribOffset = spine16BindInverse.clone().multiply(ribCage.matrixWorld);
                (ribCage as any).ribOffset = ribOffset;
                (ribCage as any).spine16Ref = spine16;
                (ribCage as any).armature = armature;
                if (armature) {
                  (ribCage as any).armatureBindInverse = armature.matrixWorld.clone().invert();
                }
              }
              
              // Cache offsets for Humerus bones relative to Rib_Cage so arms follow shoulders
              const humerusL = bones['Humerus_Root_L'] as THREE.Bone;
              const humerusR = bones['Humerus_Root_R'] as THREE.Bone;
              
              if (ribCage) {
                ribCage.updateMatrixWorld(true);
                const ribCageBindInverse = ribCage.matrixWorld.clone().invert();
                
                if (humerusL) {
                  humerusL.updateMatrixWorld(true);
                  const humerusLOffset = ribCageBindInverse.clone().multiply(humerusL.matrixWorld);
                  (humerusL as any).ribCageOffset = humerusLOffset;
                  (humerusL as any).ribCageRef = ribCage;
                  (humerusL as any).armature = armature;
                  
                  // Debug: Log humerus bone local axes to determine correct flexion/abduction axes
                  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(humerusL.quaternion);
                  const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(humerusL.quaternion);
                  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(humerusL.quaternion);
                  console.log('=== LEFT HUMERUS BONE ORIENTATION ===');
                  console.log('Local X-axis (world coords):', xAxis.x.toFixed(3), xAxis.y.toFixed(3), xAxis.z.toFixed(3));
                  console.log('Local Y-axis (world coords):', yAxis.x.toFixed(3), yAxis.y.toFixed(3), yAxis.z.toFixed(3));
                  console.log('Local Z-axis (world coords):', zAxis.x.toFixed(3), zAxis.y.toFixed(3), zAxis.z.toFixed(3));
                  console.log('Initial rotation (Euler):', humerusL.rotation.x.toFixed(3), humerusL.rotation.y.toFixed(3), humerusL.rotation.z.toFixed(3));
                }
                
                if (humerusR) {
                  humerusR.updateMatrixWorld(true);
                  const humerusROffset = ribCageBindInverse.clone().multiply(humerusR.matrixWorld);
                  (humerusR as any).ribCageOffset = humerusROffset;
                  (humerusR as any).ribCageRef = ribCage;
                  (humerusR as any).armature = armature;
                  
                  // Debug: Log humerus bone local axes to determine correct flexion/abduction axes
                  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(humerusR.quaternion);
                  const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(humerusR.quaternion);
                  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(humerusR.quaternion);
                  console.log('=== RIGHT HUMERUS BONE ORIENTATION ===');
                  console.log('Local X-axis (world coords):', xAxis.x.toFixed(3), xAxis.y.toFixed(3), xAxis.z.toFixed(3));
                  console.log('Local Y-axis (world coords):', yAxis.x.toFixed(3), yAxis.y.toFixed(3), yAxis.z.toFixed(3));
                  console.log('Local Z-axis (world coords):', zAxis.x.toFixed(3), zAxis.y.toFixed(3), zAxis.z.toFixed(3));
                  console.log('Initial rotation (Euler):', humerusR.rotation.x.toFixed(3), humerusR.rotation.y.toFixed(3), humerusR.rotation.z.toFixed(3));
                }
              }
              
              console.log('Stored headOffset for Root (relative to spine20), Rib_Cage (relative to spine16), and Humerus bones (relative to Rib_Cage)');
            }
            
            bonesRef.current = bones;
            
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
          
          // Sync Root to follow spine20, and Rib_Cage to follow spine16
          // Formula: boneMatrixWorld = referenceSpine.matrixWorld * offset
          // Then convert to local: boneMatrix = armature.matrixWorld.inverse() * boneMatrixWorld
          const currentBones = bonesRef.current;
          const rootBone = currentBones['Root'] as THREE.Bone;
          const spine20 = currentBones['spine20'] as THREE.Bone;
          const ribCage = currentBones['Rib_Cage'] as THREE.Bone;
          
          if (rootBone && spine20 && (rootBone as any).headOffset) {
            // Update spine20's world matrix after slider rotations
            spine20.updateMatrixWorld(true);
            
            // Compute new world matrix for Root: spine20.matrixWorld * headOffset
            const headOffset = (rootBone as any).headOffset as THREE.Matrix4;
            const newRootWorldMatrix = new THREE.Matrix4();
            newRootWorldMatrix.copy(spine20.matrixWorld).multiply(headOffset);
            
            // Convert to local space (relative to Armature)
            const armature = (rootBone as any).armature as THREE.Object3D;
            if (armature) {
              armature.updateMatrixWorld(true);
              const armatureInverse = new THREE.Matrix4().copy(armature.matrixWorld).invert();
              const newRootLocalMatrix = new THREE.Matrix4();
              newRootLocalMatrix.copy(armatureInverse).multiply(newRootWorldMatrix);
              
              // Decompose and apply to rootBone
              const pos = new THREE.Vector3();
              const quat = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              newRootLocalMatrix.decompose(pos, quat, scale);
              
              rootBone.position.copy(pos);
              rootBone.quaternion.copy(quat);
              rootBone.scale.copy(scale);
              rootBone.matrixWorldNeedsUpdate = true;
            }
            
            // Rib_Cage follows spine16 (not spine20) to keep arms connected during thoracic/lumbar movement
            if (ribCage && (ribCage as any).ribOffset && (ribCage as any).spine16Ref) {
              const spine16 = (ribCage as any).spine16Ref as THREE.Bone;
              spine16.updateMatrixWorld(true);
              
              const ribOffset = (ribCage as any).ribOffset as THREE.Matrix4;
              const newRibWorldMatrix = new THREE.Matrix4();
              newRibWorldMatrix.copy(spine16.matrixWorld).multiply(ribOffset);
              
              const ribArmature = (ribCage as any).armature as THREE.Object3D;
              if (ribArmature) {
                const armatureInverse = new THREE.Matrix4().copy(ribArmature.matrixWorld).invert();
                const newRibLocalMatrix = new THREE.Matrix4();
                newRibLocalMatrix.copy(armatureInverse).multiply(newRibWorldMatrix);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newRibLocalMatrix.decompose(pos, quat, scale);
                
                ribCage.position.copy(pos);
                ribCage.quaternion.copy(quat);
                ribCage.scale.copy(scale);
                ribCage.matrixWorldNeedsUpdate = true;
                ribCage.updateMatrixWorld(true);
              }
            }
            
            // Sync Humerus bones to follow Rib_Cage so arms stay connected to shoulders
            const humerusL = currentBones['Humerus_Root_L'] as THREE.Bone;
            const humerusR = currentBones['Humerus_Root_R'] as THREE.Bone;
            
            if (humerusL && (humerusL as any).ribCageOffset && ribCage) {
              ribCage.updateMatrixWorld(true);
              
              const humerusLOffset = (humerusL as any).ribCageOffset as THREE.Matrix4;
              const newHumerusLWorld = new THREE.Matrix4();
              newHumerusLWorld.copy(ribCage.matrixWorld).multiply(humerusLOffset);
              
              const humerusArmature = (humerusL as any).armature as THREE.Object3D;
              if (humerusArmature) {
                const armatureInverse = new THREE.Matrix4().copy(humerusArmature.matrixWorld).invert();
                const newHumerusLLocal = new THREE.Matrix4();
                newHumerusLLocal.copy(armatureInverse).multiply(newHumerusLWorld);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newHumerusLLocal.decompose(pos, quat, scale);
                
                // Apply clavicle length offset (negative X = laterally outward for left side)
                pos.x -= clavicleOffsetsRef.current.left;
                humerusL.position.copy(pos);
                // Apply slider rotation on top of base quaternion
                const sliderRot = sliderRotationsRef.current['Humerus_Root_L'];
                if (sliderRot) {
                  const sliderQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(sliderRot.x, sliderRot.y, sliderRot.z));
                  quat.multiply(sliderQuat);
                }
                humerusL.quaternion.copy(quat);
                humerusL.scale.copy(scale);
                humerusL.matrixWorldNeedsUpdate = true;
              }
            }
            
            if (humerusR && (humerusR as any).ribCageOffset && ribCage) {
              ribCage.updateMatrixWorld(true);
              
              const humerusROffset = (humerusR as any).ribCageOffset as THREE.Matrix4;
              const newHumerusRWorld = new THREE.Matrix4();
              newHumerusRWorld.copy(ribCage.matrixWorld).multiply(humerusROffset);
              
              const humerusArmature = (humerusR as any).armature as THREE.Object3D;
              if (humerusArmature) {
                const armatureInverse = new THREE.Matrix4().copy(humerusArmature.matrixWorld).invert();
                const newHumerusRLocal = new THREE.Matrix4();
                newHumerusRLocal.copy(armatureInverse).multiply(newHumerusRWorld);
                
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                newHumerusRLocal.decompose(pos, quat, scale);
                
                // Apply clavicle length offset (positive X = laterally outward for right side)
                pos.x += clavicleOffsetsRef.current.right;
                humerusR.position.copy(pos);
                // Apply slider rotation on top of base quaternion
                const sliderRot = sliderRotationsRef.current['Humerus_Root_R'];
                if (sliderRot) {
                  const sliderQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(sliderRot.x, sliderRot.y, sliderRot.z));
                  quat.multiply(sliderQuat);
                }
                humerusR.quaternion.copy(quat);
                humerusR.scale.copy(scale);
                humerusR.matrixWorldNeedsUpdate = true;
              }
            }
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
    const preset = CAMERA_PRESETS[cameraAngle];
    
    // Update camera position and look-at target
    camera.position.set(preset.position.x, preset.position.y, preset.position.z);
    camera.lookAt(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
    
    // Update controls target and enabled state
    controls.target.set(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
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

    // Map joint types to mesh names for compensation highlighting
    const JOINT_TO_MESH: Record<string, string[]> = {
      'lumbar_spine': ['BONES_SPINE1'],
      'thoracic_spine': ['BONES_SPINE1', 'BONES_RIBCAGE1'],
      'cervical_spine': ['BONES_HEAD1'],
      'pelvis': ['BONES_PELVIS1'],
      'left_hip': ['BONES_LEGL1'],
      'right_hip': ['BONES_LEGR1'],
      'left_knee': ['BONES_LEGL002'],
      'right_knee': ['BONES_LEGR002'],
      'left_ankle': ['BONES_LEGL002'],
      'right_ankle': ['BONES_LEGR002'],
      'left_shoulder': ['BONES_ARML1'],
      'right_shoulder': ['BONES_ARMR1'],
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
    
    // Apply rotations to bones (initial + delta, same as slider system)
    Object.entries(boneRotationDeltas).forEach(([boneName, delta]) => {
      const bone = bones[boneName] as THREE.Bone;
      const initial = initialRotations[boneName];
      if (!bone || !initial) return;
      
      bone.rotation.set(
        initial.x + delta.x,
        initial.y + delta.y,
        initial.z + delta.z
      );
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
    'Humerus_Root_L', 'Humerus_Root_R',
    // Elbows
    'Redius_Alna_L', 'Redius_Alna_R',
    // Hips
    'Femer_Root_L', 'Femer_Root_R',
    // Knees
    'fibula_tibia_L', 'fibula_tibia_R',
    // Pelvis
    'Pelvis_Main',
    // Neck (spine17-20 for neck.flexion and neck.lateralFlexion)
    'spine17', 'spine18', 'spine19', 'spine20'
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
    const animationLoopBones = new Set(['Humerus_Root_L', 'Humerus_Root_R', 'HUMERUSL_83', 'HUMERUSR_125']);
    
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
    
    // Apply derived lumbar lordosis to spine2-spine7 (x-axis, same as BONE_MAPPING)
    const lumbarBones = ['spine2', 'spine3', 'spine4', 'spine5', 'spine6', 'spine7'];
    const lumbarScale = 0.2; // Match BONE_MAPPING scale
    lumbarBones.forEach(boneName => {
      if (boneRotations[boneName]) {
        const angleInRadians = (derivedLumbarLordosis * Math.PI) / 180;
        boneRotations[boneName].x += angleInRadians * lumbarScale;
      }
    });
    
    // Apply derived scoliosis to spine4-spine14 (z-axis, with alternating scales)
    const scoliosisMappings = [
      { boneName: 'spine4', scale: 0.1 },
      { boneName: 'spine5', scale: 0.15 },
      { boneName: 'spine6', scale: 0.2 },
      { boneName: 'spine7', scale: 0.2 },
      { boneName: 'spine8', scale: 0.15 },
      { boneName: 'spine9', scale: 0.1 },
      { boneName: 'spine10', scale: -0.1 },
      { boneName: 'spine11', scale: -0.15 },
      { boneName: 'spine12', scale: -0.15 },
      { boneName: 'spine13', scale: -0.1 },
      { boneName: 'spine14', scale: -0.05 },
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
    sliderRotationsRef.current = sliderOnlyRotations;
    
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
  }, [modelConfig, status, livePose]);

  // Sync animation constraints to ref (avoids restarting animation when constraints change)
  useEffect(() => {
    animationConstraintsRef.current = animationConstraints || [];
  }, [animationConstraints]);

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
        const pelvisBone = bones['Pelvis_Main'] as THREE.Bone;
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
          if (boneName.includes('Femer') || boneName.includes('fibula') || boneName.includes('foot')) {
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
