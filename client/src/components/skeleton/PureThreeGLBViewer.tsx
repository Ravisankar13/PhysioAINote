import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlertCircle, Loader2, RotateCcw, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMovementById, interpolateKeyframes, applyJointConstraints, JointLimits } from '@/lib/movementSequences';
import { initializeLegIK, applySquatIK, applyLegIK, LEG_IK_CONFIG, LegIKState } from '@/lib/legIKSolver';
import { ForceVisualizationManager, BiomechanicsVisualizationData, HoverData } from '@/lib/forceVisualization';
import { MuscleVisualizationManager, MuscleActivationLevels } from '@/lib/muscleVisualization';
import { MuscleLayerManager, MuscleLayerConfig } from '@/lib/muscleLayerManager';
import { classifyMuscleMeshes, setMuscleGroupVisibility, setAllMuscleGroupsVisibility, disposeMuscleGroups, MUSCLE_GROUPS, type SplitMuscleGroup } from '@/lib/muscleGroupSplitter';
import { type MuscleStatesMap, getMuscleColor } from '@/lib/muscleBiomechanicsEngine';
import { getEnvironmentPreset, type EnvironmentPreset } from '@/lib/environmentPresets';
import { MUSCLE_BONE_POSITIONS, type MyofascialChain } from '@/lib/myofascialChains';
import { type ScarMarker, type AdhesionBand, SCAR_TYPES } from '@/lib/scarTissueMapping';
import { TISSUE_ANCHOR_CATALOGUE, paletteForState, SUPERFICIAL_MUSCLE_PATTERNS } from '@/lib/tissueOverlayCatalogue';
import { Skeleton3DPose } from '@/utils/mediapipeTo3D';
import { poseToControllerValues, ControllerValues } from '@/utils/poseToControllerMap';
import { DOF_SPECS } from '@/components/skeleton/JointAngleEditor';
import { COMPENSATION_CHAINS } from '@/lib/jointConstraints';
import MovementJointSliderHUD, { type SliderDof } from '@/components/skeleton/MovementJointSliderHUD';

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
  pelvis?: { tilt?: number; obliquity?: number; rotation?: number; drop?: number; zShift?: number; xShift?: number; yShift?: number; leftInnominateRotation?: number; rightInnominateRotation?: number };
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
  | 'left_hand'
  | 'right_hand'
  | 'left_foot'
  | 'right_foot'
  | 'anterior_pelvis'
  | 'head'
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
  left_hand: {
    position: { x: -2.5, y: 0.8, z: 1.0 },
    lookAt: { x: -1.5, y: 0.8, z: 0 },
    label: 'Left Hand',
    icon: '🤚',
    description: 'Carpal bones, metacarpals, phalanges'
  },
  right_hand: {
    position: { x: 2.5, y: 0.8, z: 1.0 },
    lookAt: { x: 1.5, y: 0.8, z: 0 },
    label: 'Right Hand',
    icon: '🤚',
    description: 'Carpal bones, metacarpals, phalanges'
  },
  left_foot: {
    position: { x: -0.5, y: -0.8, z: 1.0 },
    lookAt: { x: -0.15, y: -0.8, z: 0 },
    label: 'Left Foot',
    icon: '🦶',
    description: 'Tarsal bones, metatarsals, phalanges'
  },
  right_foot: {
    position: { x: 0.5, y: -0.8, z: 1.0 },
    lookAt: { x: 0.15, y: -0.8, z: 0 },
    label: 'Right Foot',
    icon: '🦶',
    description: 'Tarsal bones, metatarsals, phalanges'
  },
  anterior_pelvis: {
    position: { x: 0, y: 0.3, z: 2.2 },
    lookAt: { x: 0, y: 0.3, z: 0 },
    label: 'Anterior Pelvis',
    icon: '🔲',
    description: 'Inguinal region, femoral triangle, hernia landmarks'
  },
  head: {
    position: { x: 0, y: 2.4, z: 1.5 },
    lookAt: { x: 0, y: 2.2, z: 0 },
    label: 'Head',
    icon: '🦴',
    description: 'Cranial landmarks, TMJ, occipital region'
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
  left_hand: ['Wrist_L', 'MiddleFinger1_L', 'MiddleFinger2_L', 'IndexFinger1_L', 'ThumbFinger1_L', 'PinkyFinger1_L', 'RingFinger1_L'],
  right_hand: ['Wrist_R', 'MiddleFinger1_R', 'MiddleFinger2_R', 'IndexFinger1_R', 'ThumbFinger1_R', 'PinkyFinger1_R', 'RingFinger1_R'],
  left_foot: ['Ankle_L', 'Toes_L', 'ToesEnd_L'],
  right_foot: ['Ankle_R', 'Toes_R', 'ToesEnd_R'],
  anterior_pelvis: ['Root_M', 'RootPart1_M', 'RootPart2_M', 'Hip_L', 'Hip_R'],
  head: ['Head_M', 'Neck_M'],
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

export type PainMechanismType = 'nociceptive' | 'neuropathic' | 'central_sensitization' | 'myofascial';

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
  painMechanism?: PainMechanismType;
  nerveRoot?: string;
  severity?: number;
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

  // ========== HAND/WRIST MARKERS ==========
  { label: 'Left Scaphoid', boneName: 'virt_scaphoid_L', boneA: 'Wrist_L', boneB: 'IndexFinger1_L', t: 0.15, offsetX: -0.01, offsetZ: 0.01 },
  { label: 'Right Scaphoid', boneName: 'virt_scaphoid_R', boneA: 'Wrist_R', boneB: 'IndexFinger1_R', t: 0.15, offsetX: 0.01, offsetZ: 0.01 },
  { label: 'Left Lunate', boneName: 'virt_lunate_L', boneA: 'Wrist_L', boneB: 'MiddleFinger1_L', t: 0.12, offsetZ: 0.01 },
  { label: 'Right Lunate', boneName: 'virt_lunate_R', boneA: 'Wrist_R', boneB: 'MiddleFinger1_R', t: 0.12, offsetZ: 0.01 },
  { label: 'Left Triquetrum', boneName: 'virt_triquetrum_L', boneA: 'Wrist_L', boneB: 'PinkyFinger1_L', t: 0.12, offsetX: 0.01 },
  { label: 'Right Triquetrum', boneName: 'virt_triquetrum_R', boneA: 'Wrist_R', boneB: 'PinkyFinger1_R', t: 0.12, offsetX: -0.01 },
  { label: 'Left Pisiform', boneName: 'virt_pisiform_L', boneA: 'Wrist_L', boneB: 'PinkyFinger1_L', t: 0.1, offsetX: 0.02, offsetZ: 0.02 },
  { label: 'Right Pisiform', boneName: 'virt_pisiform_R', boneA: 'Wrist_R', boneB: 'PinkyFinger1_R', t: 0.1, offsetX: -0.02, offsetZ: 0.02 },
  { label: 'Left Trapezium', boneName: 'virt_trapezium_L', boneA: 'Wrist_L', boneB: 'ThumbFinger1_L', t: 0.15 },
  { label: 'Right Trapezium', boneName: 'virt_trapezium_R', boneA: 'Wrist_R', boneB: 'ThumbFinger1_R', t: 0.15 },
  { label: 'Left Trapezoid', boneName: 'virt_trapezoid_L', boneA: 'Wrist_L', boneB: 'IndexFinger1_L', t: 0.2 },
  { label: 'Right Trapezoid', boneName: 'virt_trapezoid_R', boneA: 'Wrist_R', boneB: 'IndexFinger1_R', t: 0.2 },
  { label: 'Left Capitate', boneName: 'virt_capitate_L', boneA: 'Wrist_L', boneB: 'MiddleFinger1_L', t: 0.2 },
  { label: 'Right Capitate', boneName: 'virt_capitate_R', boneA: 'Wrist_R', boneB: 'MiddleFinger1_R', t: 0.2 },
  { label: 'Left Hamate (Hook)', boneName: 'virt_hamate_L', boneA: 'Wrist_L', boneB: 'RingFinger1_L', t: 0.18, offsetX: 0.01, offsetZ: 0.02 },
  { label: 'Right Hamate (Hook)', boneName: 'virt_hamate_R', boneA: 'Wrist_R', boneB: 'RingFinger1_R', t: 0.18, offsetX: -0.01, offsetZ: 0.02 },
  { label: "Left Guyon's Canal", boneName: 'virt_guyon_L', boneA: 'Wrist_L', boneB: 'PinkyFinger1_L', t: 0.08, offsetZ: 0.03 },
  { label: "Right Guyon's Canal", boneName: 'virt_guyon_R', boneA: 'Wrist_R', boneB: 'PinkyFinger1_R', t: 0.08, offsetZ: 0.03 },
  { label: "Left De Quervain's Compartment", boneName: 'virt_dequervain_L', boneA: 'Wrist_L', boneB: 'ThumbFinger1_L', t: 0.05, offsetX: -0.02 },
  { label: "Right De Quervain's Compartment", boneName: 'virt_dequervain_R', boneA: 'Wrist_R', boneB: 'ThumbFinger1_R', t: 0.05, offsetX: 0.02 },
  { label: 'Left Anatomical Snuffbox', boneName: 'virt_snuffbox_L', boneA: 'Wrist_L', boneB: 'ThumbFinger1_L', t: 0.1, offsetZ: -0.02 },
  { label: 'Right Anatomical Snuffbox', boneName: 'virt_snuffbox_R', boneA: 'Wrist_R', boneB: 'ThumbFinger1_R', t: 0.1, offsetZ: -0.02 },
  { label: "Left Dorsal Tubercle (Lister's)", boneName: 'virt_lister_L', boneA: 'ElbowPart2_L', boneB: 'Wrist_L', t: 0.95, offsetZ: -0.02 },
  { label: "Right Dorsal Tubercle (Lister's)", boneName: 'virt_lister_R', boneA: 'ElbowPart2_R', boneB: 'Wrist_R', t: 0.95, offsetZ: -0.02 },
  { label: 'Left DRUJ', boneName: 'virt_druj_L', boneA: 'ElbowPart2_L', boneB: 'Wrist_L', t: 0.92 },
  { label: 'Right DRUJ', boneName: 'virt_druj_R', boneA: 'ElbowPart2_R', boneB: 'Wrist_R', t: 0.92 },
  { label: 'Left Thenar Eminence', boneName: 'virt_thenar_L', boneA: 'Wrist_L', boneB: 'ThumbFinger1_L', t: 0.25, offsetZ: 0.03 },
  { label: 'Right Thenar Eminence', boneName: 'virt_thenar_R', boneA: 'Wrist_R', boneB: 'ThumbFinger1_R', t: 0.25, offsetZ: 0.03 },
  { label: 'Left Hypothenar Eminence', boneName: 'virt_hypothenar_L', boneA: 'Wrist_L', boneB: 'PinkyFinger1_L', t: 0.25, offsetZ: 0.03 },
  { label: 'Right Hypothenar Eminence', boneName: 'virt_hypothenar_R', boneA: 'Wrist_R', boneB: 'PinkyFinger1_R', t: 0.25, offsetZ: 0.03 },
  { label: 'Left 1st MCP Joint', boneName: 'virt_mcp1_L', boneA: 'ThumbFinger1_L', boneB: 'ThumbFinger2_L', t: 0.5 },
  { label: 'Right 1st MCP Joint', boneName: 'virt_mcp1_R', boneA: 'ThumbFinger1_R', boneB: 'ThumbFinger2_R', t: 0.5 },
  { label: 'Left 2nd MCP Joint', boneName: 'virt_mcp2_L', boneA: 'IndexFinger1_L', boneB: 'IndexFinger2_L', t: 0.8 },
  { label: 'Right 2nd MCP Joint', boneName: 'virt_mcp2_R', boneA: 'IndexFinger1_R', boneB: 'IndexFinger2_R', t: 0.8 },
  { label: 'Left 3rd MCP Joint', boneName: 'virt_mcp3_L', boneA: 'MiddleFinger1_L', boneB: 'MiddleFinger2_L', t: 0.8 },
  { label: 'Right 3rd MCP Joint', boneName: 'virt_mcp3_R', boneA: 'MiddleFinger1_R', boneB: 'MiddleFinger2_R', t: 0.8 },
  { label: 'Left 4th MCP Joint', boneName: 'virt_mcp4_L', boneA: 'RingFinger1_L', boneB: 'RingFinger2_L', t: 0.8 },
  { label: 'Right 4th MCP Joint', boneName: 'virt_mcp4_R', boneA: 'RingFinger1_R', boneB: 'RingFinger2_R', t: 0.8 },
  { label: 'Left 5th MCP Joint', boneName: 'virt_mcp5_L', boneA: 'PinkyFinger1_L', boneB: 'PinkyFinger2_L', t: 0.8 },
  { label: 'Right 5th MCP Joint', boneName: 'virt_mcp5_R', boneA: 'PinkyFinger1_R', boneB: 'PinkyFinger2_R', t: 0.8 },
  { label: 'Left 2nd PIP Joint', boneName: 'virt_pip2_L', boneA: 'IndexFinger2_L', boneB: 'IndexFinger3_L', t: 0.8 },
  { label: 'Right 2nd PIP Joint', boneName: 'virt_pip2_R', boneA: 'IndexFinger2_R', boneB: 'IndexFinger3_R', t: 0.8 },
  { label: 'Left 3rd PIP Joint', boneName: 'virt_pip3_L', boneA: 'MiddleFinger2_L', boneB: 'MiddleFinger3_L', t: 0.8 },
  { label: 'Right 3rd PIP Joint', boneName: 'virt_pip3_R', boneA: 'MiddleFinger2_R', boneB: 'MiddleFinger3_R', t: 0.8 },
  { label: 'Left 4th PIP Joint', boneName: 'virt_pip4_L', boneA: 'RingFinger2_L', boneB: 'RingFinger3_L', t: 0.8 },
  { label: 'Right 4th PIP Joint', boneName: 'virt_pip4_R', boneA: 'RingFinger2_R', boneB: 'RingFinger3_R', t: 0.8 },
  { label: 'Left 5th PIP Joint', boneName: 'virt_pip5_L', boneA: 'PinkyFinger2_L', boneB: 'PinkyFinger3_L', t: 0.8 },
  { label: 'Right 5th PIP Joint', boneName: 'virt_pip5_R', boneA: 'PinkyFinger2_R', boneB: 'PinkyFinger3_R', t: 0.8 },
  { label: 'Left 2nd DIP Joint', boneName: 'virt_dip2_L', boneA: 'IndexFinger3_L', boneB: 'IndexFinger4_L', t: 0.8 },
  { label: 'Right 2nd DIP Joint', boneName: 'virt_dip2_R', boneA: 'IndexFinger3_R', boneB: 'IndexFinger4_R', t: 0.8 },
  { label: 'Left 3rd DIP Joint', boneName: 'virt_dip3_L', boneA: 'MiddleFinger3_L', boneB: 'MiddleFinger4_L', t: 0.8 },
  { label: 'Right 3rd DIP Joint', boneName: 'virt_dip3_R', boneA: 'MiddleFinger3_R', boneB: 'MiddleFinger4_R', t: 0.8 },
  { label: 'Left 4th DIP Joint', boneName: 'virt_dip4_L', boneA: 'RingFinger3_L', boneB: 'RingFinger4_L', t: 0.8 },
  { label: 'Right 4th DIP Joint', boneName: 'virt_dip4_R', boneA: 'RingFinger3_R', boneB: 'RingFinger4_R', t: 0.8 },
  { label: 'Left 5th DIP Joint', boneName: 'virt_dip5_L', boneA: 'PinkyFinger3_L', boneB: 'PinkyFinger4_L', t: 0.8 },
  { label: 'Right 5th DIP Joint', boneName: 'virt_dip5_R', boneA: 'PinkyFinger3_R', boneB: 'PinkyFinger4_R', t: 0.8 },
  { label: 'Left Thumb IP Joint', boneName: 'virt_thumb_ip_L', boneA: 'ThumbFinger2_L', boneB: 'ThumbFinger3_L', t: 0.8 },
  { label: 'Right Thumb IP Joint', boneName: 'virt_thumb_ip_R', boneA: 'ThumbFinger2_R', boneB: 'ThumbFinger3_R', t: 0.8 },

  // ========== FOOT/ANKLE DETAILED MARKERS ==========
  { label: 'Left Talus', boneName: 'virt_talus_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.1, offsetY: 0.02 },
  { label: 'Right Talus', boneName: 'virt_talus_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.1, offsetY: 0.02 },
  { label: 'Left Calcaneal Tuberosity', boneName: 'virt_calc_tub_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.08, offsetZ: -0.08, offsetY: -0.02 },
  { label: 'Right Calcaneal Tuberosity', boneName: 'virt_calc_tub_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.08, offsetZ: -0.08, offsetY: -0.02 },
  { label: 'Left Sustentaculum Tali', boneName: 'virt_sustent_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.12, offsetX: 0.03, offsetY: -0.01 },
  { label: 'Right Sustentaculum Tali', boneName: 'virt_sustent_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.12, offsetX: -0.03, offsetY: -0.01 },
  { label: 'Left Cuboid', boneName: 'virt_cuboid_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.35, offsetX: -0.03 },
  { label: 'Right Cuboid', boneName: 'virt_cuboid_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.35, offsetX: 0.03 },
  { label: 'Left Navicular Tuberosity', boneName: 'virt_navic_tub_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.25, offsetX: 0.03, offsetZ: 0.02 },
  { label: 'Right Navicular Tuberosity', boneName: 'virt_navic_tub_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.25, offsetX: -0.03, offsetZ: 0.02 },
  { label: 'Left Medial Cuneiform', boneName: 'virt_med_cune_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.4, offsetX: 0.02 },
  { label: 'Right Medial Cuneiform', boneName: 'virt_med_cune_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.4, offsetX: -0.02 },
  { label: 'Left Intermediate Cuneiform', boneName: 'virt_int_cune_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.4 },
  { label: 'Right Intermediate Cuneiform', boneName: 'virt_int_cune_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.4 },
  { label: 'Left Lateral Cuneiform', boneName: 'virt_lat_cune_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.4, offsetX: -0.02 },
  { label: 'Right Lateral Cuneiform', boneName: 'virt_lat_cune_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.4, offsetX: 0.02 },
  { label: 'Left Lisfranc Joint', boneName: 'virt_lisfranc_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.5, offsetZ: 0.02 },
  { label: 'Right Lisfranc Joint', boneName: 'virt_lisfranc_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.5, offsetZ: 0.02 },
  { label: 'Left Chopart Joint', boneName: 'virt_chopart_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.25, offsetZ: 0.02 },
  { label: 'Right Chopart Joint', boneName: 'virt_chopart_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.25, offsetZ: 0.02 },
  { label: 'Left Sinus Tarsi', boneName: 'virt_sinus_tarsi_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.15, offsetX: -0.04, offsetZ: 0.01 },
  { label: 'Right Sinus Tarsi', boneName: 'virt_sinus_tarsi_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.15, offsetX: 0.04, offsetZ: 0.01 },
  { label: 'Left Spring Ligament', boneName: 'virt_spring_lig_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.2, offsetX: 0.02, offsetY: -0.02 },
  { label: 'Right Spring Ligament', boneName: 'virt_spring_lig_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.2, offsetX: -0.02, offsetY: -0.02 },
  { label: 'Left Deltoid Ligament (Ankle)', boneName: 'virt_deltoid_lig_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.06, offsetX: 0.04 },
  { label: 'Right Deltoid Ligament (Ankle)', boneName: 'virt_deltoid_lig_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.06, offsetX: -0.04 },
  { label: 'Left ATFL', boneName: 'virt_atfl_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.06, offsetX: -0.04, offsetZ: 0.02 },
  { label: 'Right ATFL', boneName: 'virt_atfl_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.06, offsetX: 0.04, offsetZ: 0.02 },
  { label: 'Left CFL', boneName: 'virt_cfl_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.06, offsetX: -0.04, offsetY: -0.02 },
  { label: 'Right CFL', boneName: 'virt_cfl_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.06, offsetX: 0.04, offsetY: -0.02 },
  { label: 'Left Peroneal Tendons (Ankle)', boneName: 'virt_peroneal_tend_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.08, offsetX: -0.04, offsetZ: -0.01 },
  { label: 'Right Peroneal Tendons (Ankle)', boneName: 'virt_peroneal_tend_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.08, offsetX: 0.04, offsetZ: -0.01 },
  { label: 'Left Posterior Tibial Tendon', boneName: 'virt_post_tib_tend_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.08, offsetX: 0.03, offsetZ: -0.02 },
  { label: 'Right Posterior Tibial Tendon', boneName: 'virt_post_tib_tend_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.08, offsetX: -0.03, offsetZ: -0.02 },
  { label: 'Left Flexor Hallucis Longus', boneName: 'virt_fhl_L', boneA: 'Ankle_L', boneB: 'Toes_L', t: 0.1, offsetX: 0.01, offsetZ: -0.03 },
  { label: 'Right Flexor Hallucis Longus', boneName: 'virt_fhl_R', boneA: 'Ankle_R', boneB: 'Toes_R', t: 0.1, offsetX: -0.01, offsetZ: -0.03 },
  { label: 'Left 2nd MTP Joint', boneName: 'virt_mtp2_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3, offsetX: 0.01 },
  { label: 'Right 2nd MTP Joint', boneName: 'virt_mtp2_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3, offsetX: -0.01 },
  { label: 'Left 3rd MTP Joint', boneName: 'virt_mtp3_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3 },
  { label: 'Right 3rd MTP Joint', boneName: 'virt_mtp3_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3 },
  { label: 'Left 4th MTP Joint', boneName: 'virt_mtp4_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3, offsetX: -0.01 },
  { label: 'Right 4th MTP Joint', boneName: 'virt_mtp4_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3, offsetX: 0.01 },
  { label: 'Left 5th MTP Joint', boneName: 'virt_mtp5_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3, offsetX: -0.03 },
  { label: 'Right 5th MTP Joint', boneName: 'virt_mtp5_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3, offsetX: 0.03 },
  { label: 'Left Sesamoids (1st MTP)', boneName: 'virt_sesamoid_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.25, offsetX: 0.03, offsetY: -0.02 },
  { label: 'Right Sesamoids (1st MTP)', boneName: 'virt_sesamoid_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.25, offsetX: -0.03, offsetY: -0.02 },
  { label: 'Left 1st MTP Joint', boneName: 'virt_mtp1_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.3, offsetX: 0.04 },
  { label: 'Right 1st MTP Joint', boneName: 'virt_mtp1_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.3, offsetX: -0.04 },
  { label: 'Left 1st Intermetatarsal Space', boneName: 'virt_ims1_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.2, offsetX: 0.025, offsetY: 0.01 },
  { label: 'Right 1st Intermetatarsal Space', boneName: 'virt_ims1_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.2, offsetX: -0.025, offsetY: 0.01 },
  { label: 'Left 2nd Intermetatarsal Space', boneName: 'virt_ims2_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.2, offsetX: 0.01, offsetY: 0.01 },
  { label: 'Right 2nd Intermetatarsal Space', boneName: 'virt_ims2_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.2, offsetX: -0.01, offsetY: 0.01 },
  { label: 'Left 3rd Intermetatarsal Space', boneName: 'virt_ims3_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.2, offsetX: -0.005, offsetY: 0.01 },
  { label: 'Right 3rd Intermetatarsal Space', boneName: 'virt_ims3_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.2, offsetX: 0.005, offsetY: 0.01 },
  { label: 'Left 4th Intermetatarsal Space', boneName: 'virt_ims4_L', boneA: 'Toes_L', boneB: 'ToesEnd_L', t: 0.2, offsetX: -0.02, offsetY: 0.01 },
  { label: 'Right 4th Intermetatarsal Space', boneName: 'virt_ims4_R', boneA: 'Toes_R', boneB: 'ToesEnd_R', t: 0.2, offsetX: 0.02, offsetY: 0.01 },

  // ========== ROTATOR CUFF & SHOULDER DETAIL ==========
  { label: 'Left Supraspinatus Insertion', boneName: 'virt_suprasp_ins_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.05, offsetY: 0.04 },
  { label: 'Right Supraspinatus Insertion', boneName: 'virt_suprasp_ins_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.05, offsetY: 0.04 },
  { label: 'Left Infraspinatus Insertion', boneName: 'virt_infrasp_ins_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.05, offsetZ: -0.04, offsetY: 0.02 },
  { label: 'Right Infraspinatus Insertion', boneName: 'virt_infrasp_ins_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.05, offsetZ: -0.04, offsetY: 0.02 },
  { label: 'Left Teres Minor Insertion', boneName: 'virt_teres_min_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.08, offsetZ: -0.04, offsetY: -0.01 },
  { label: 'Right Teres Minor Insertion', boneName: 'virt_teres_min_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.08, offsetZ: -0.04, offsetY: -0.01 },
  { label: 'Left Subscapularis Insertion', boneName: 'virt_subscap_ins_L', boneA: 'Shoulder_L', boneB: 'ShoulderPart1_L', t: 0.05, offsetZ: 0.04 },
  { label: 'Right Subscapularis Insertion', boneName: 'virt_subscap_ins_R', boneA: 'Shoulder_R', boneB: 'ShoulderPart1_R', t: 0.05, offsetZ: 0.04 },
  { label: 'Left Long Head Biceps Origin', boneName: 'virt_lhb_origin_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.7, offsetY: 0.04 },
  { label: 'Right Long Head Biceps Origin', boneName: 'virt_lhb_origin_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.7, offsetY: 0.04 },
  { label: 'Left Superior Labrum', boneName: 'virt_sup_labrum_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.75, offsetY: 0.03 },
  { label: 'Right Superior Labrum', boneName: 'virt_sup_labrum_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.75, offsetY: 0.03 },
  { label: 'Left Inferior Glenohumeral Ligament', boneName: 'virt_ighl_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.85, offsetY: -0.03 },
  { label: 'Right Inferior Glenohumeral Ligament', boneName: 'virt_ighl_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.85, offsetY: -0.03 },
  { label: 'Left Coracohumeral Ligament', boneName: 'virt_chl_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.55, offsetZ: 0.04, offsetY: 0.02 },
  { label: 'Right Coracohumeral Ligament', boneName: 'virt_chl_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.55, offsetZ: 0.04, offsetY: 0.02 },
  { label: 'Left Suprascapular Notch', boneName: 'virt_suprascap_notch_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.3, offsetY: 0.05, offsetZ: -0.03 },
  { label: 'Right Suprascapular Notch', boneName: 'virt_suprascap_notch_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.3, offsetY: 0.05, offsetZ: -0.03 },
  { label: 'Left Spine of Scapula', boneName: 'virt_scap_spine_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.3, offsetZ: -0.06, offsetY: 0.02 },
  { label: 'Right Spine of Scapula', boneName: 'virt_scap_spine_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.3, offsetZ: -0.06, offsetY: 0.02 },
  { label: 'Left Inferior Angle of Scapula', boneName: 'virt_inf_angle_scap_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.1, offsetZ: -0.08, offsetY: -0.1 },
  { label: 'Right Inferior Angle of Scapula', boneName: 'virt_inf_angle_scap_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.1, offsetZ: -0.08, offsetY: -0.1 },
  { label: 'Left Medial Border of Scapula', boneName: 'virt_med_border_scap_L', boneA: 'Scapula_L', boneB: 'Shoulder_L', t: 0.15, offsetZ: -0.06, offsetX: 0.04 },
  { label: 'Right Medial Border of Scapula', boneName: 'virt_med_border_scap_R', boneA: 'Scapula_R', boneB: 'Shoulder_R', t: 0.15, offsetZ: -0.06, offsetX: -0.04 },

  // ========== CRANIAL & CERVICAL DETAIL ==========
  { label: 'Vertex', boneName: 'virt_vertex', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetY: 0.12 },
  { label: 'Bregma', boneName: 'virt_bregma', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetY: 0.1, offsetZ: 0.03 },
  { label: 'Lambda', boneName: 'virt_lambda', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetY: 0.08, offsetZ: -0.06 },
  { label: 'Inion (External Occipital Protuberance)', boneName: 'virt_inion', boneA: 'Head_M', boneB: 'Neck_M', t: 0.1, offsetZ: -0.08, offsetY: 0.02 },
  { label: 'Glabella', boneName: 'virt_glabella', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetY: 0.06, offsetZ: 0.08 },
  { label: 'Left Zygomatic Arch', boneName: 'virt_zygomatic_L', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetX: -0.07, offsetZ: 0.04 },
  { label: 'Right Zygomatic Arch', boneName: 'virt_zygomatic_R', boneA: 'Head_M', boneB: 'Head_M', t: 0.5, offsetX: 0.07, offsetZ: 0.04 },
  { label: 'Left Mandibular Angle', boneName: 'virt_mandible_L', boneA: 'Head_M', boneB: 'Neck_M', t: 0.2, offsetX: -0.06, offsetZ: 0.02 },
  { label: 'Right Mandibular Angle', boneName: 'virt_mandible_R', boneA: 'Head_M', boneB: 'Neck_M', t: 0.2, offsetX: 0.06, offsetZ: 0.02 },
  { label: 'Left Suboccipital Triangle', boneName: 'virt_suboccip_L', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.3, offsetX: -0.04, offsetZ: -0.06 },
  { label: 'Right Suboccipital Triangle', boneName: 'virt_suboccip_R', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.3, offsetX: 0.04, offsetZ: -0.06 },
  { label: 'Left Greater Occipital Nerve', boneName: 'virt_gon_L', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.25, offsetX: -0.03, offsetZ: -0.05 },
  { label: 'Right Greater Occipital Nerve', boneName: 'virt_gon_R', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.25, offsetX: 0.03, offsetZ: -0.05 },
  { label: 'Left C2 Transverse Process', boneName: 'virt_C2_TP_L', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.5, offsetX: -0.04 },
  { label: 'Right C2 Transverse Process', boneName: 'virt_C2_TP_R', boneA: 'Head_M', boneB: 'NeckPart1_M', t: 0.5, offsetX: 0.04 },
  { label: 'Left C3-C4 Transverse Process', boneName: 'virt_C34_TP_L', boneA: 'NeckPart1_M', boneB: 'NeckPart2_M', t: 0.5, offsetX: -0.04 },
  { label: 'Right C3-C4 Transverse Process', boneName: 'virt_C34_TP_R', boneA: 'NeckPart1_M', boneB: 'NeckPart2_M', t: 0.5, offsetX: 0.04 },
  { label: 'Left C5-C6 Transverse Process', boneName: 'virt_C56_TP_L', boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.3, offsetX: -0.04 },
  { label: 'Right C5-C6 Transverse Process', boneName: 'virt_C56_TP_R', boneA: 'NeckPart2_M', boneB: 'Chest_M', t: 0.3, offsetX: 0.04 },

  // ========== LOWER BACK & ANTERIOR PELVIS / INGUINAL MARKERS ==========
  { label: 'Left Inguinal Ligament', boneName: 'virt_inguinal_lig_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.3, offsetZ: 0.14, offsetY: -0.04 },
  { label: 'Right Inguinal Ligament', boneName: 'virt_inguinal_lig_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.3, offsetZ: 0.14, offsetY: -0.04 },
  { label: 'Left Superficial Inguinal Ring', boneName: 'virt_sup_ing_ring_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.2, offsetZ: 0.14, offsetX: -0.02, offsetY: -0.03 },
  { label: 'Right Superficial Inguinal Ring', boneName: 'virt_sup_ing_ring_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.2, offsetZ: 0.14, offsetX: 0.02, offsetY: -0.03 },
  { label: 'Left Deep Inguinal Ring', boneName: 'virt_deep_ing_ring_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.35, offsetZ: 0.13, offsetY: -0.02 },
  { label: 'Right Deep Inguinal Ring', boneName: 'virt_deep_ing_ring_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.35, offsetZ: 0.13, offsetY: -0.02 },
  { label: 'Left Femoral Triangle', boneName: 'virt_fem_triangle_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.45, offsetZ: 0.12, offsetY: -0.06 },
  { label: 'Right Femoral Triangle', boneName: 'virt_fem_triangle_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.45, offsetZ: 0.12, offsetY: -0.06 },
  { label: 'Left Femoral Canal', boneName: 'virt_fem_canal_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.4, offsetZ: 0.13, offsetX: 0.02, offsetY: -0.05 },
  { label: 'Right Femoral Canal', boneName: 'virt_fem_canal_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.4, offsetZ: 0.13, offsetX: -0.02, offsetY: -0.05 },
  { label: "Left Hesselbach's Triangle", boneName: 'virt_hesselbach_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.25, offsetZ: 0.13, offsetY: -0.03 },
  { label: "Right Hesselbach's Triangle", boneName: 'virt_hesselbach_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.25, offsetZ: 0.13, offsetY: -0.03 },
  { label: 'Left Conjoint Tendon', boneName: 'virt_conjoint_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.2, offsetZ: 0.12, offsetY: -0.01 },
  { label: 'Right Conjoint Tendon', boneName: 'virt_conjoint_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.2, offsetZ: 0.12, offsetY: -0.01 },
  { label: 'Left Lacunar Ligament', boneName: 'virt_lacunar_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.35, offsetZ: 0.14, offsetX: 0.03, offsetY: -0.04 },
  { label: 'Right Lacunar Ligament', boneName: 'virt_lacunar_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.35, offsetZ: 0.14, offsetX: -0.03, offsetY: -0.04 },
  { label: "Left Cooper's Ligament (Pectineal)", boneName: 'virt_cooper_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.38, offsetZ: 0.12, offsetY: -0.02 },
  { label: "Right Cooper's Ligament (Pectineal)", boneName: 'virt_cooper_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.38, offsetZ: 0.12, offsetY: -0.02 },
  { label: 'Left Linea Semilunaris', boneName: 'virt_linea_semil_L', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.5, offsetX: -0.1, offsetZ: 0.1 },
  { label: 'Right Linea Semilunaris', boneName: 'virt_linea_semil_R', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.5, offsetX: 0.1, offsetZ: 0.1 },
  { label: 'Left Arcuate Line', boneName: 'virt_arcuate_L', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.7, offsetX: -0.06, offsetZ: 0.08 },
  { label: 'Right Arcuate Line', boneName: 'virt_arcuate_R', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.7, offsetX: 0.06, offsetZ: 0.08 },
  { label: 'Left L1 Transverse Process', boneName: 'virt_L1_TP_L', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.15, offsetX: -0.05 },
  { label: 'Right L1 Transverse Process', boneName: 'virt_L1_TP_R', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.15, offsetX: 0.05 },
  { label: 'Left L2 Transverse Process', boneName: 'virt_L2_TP_L', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.35, offsetX: -0.05 },
  { label: 'Right L2 Transverse Process', boneName: 'virt_L2_TP_R', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.35, offsetX: 0.05 },
  { label: 'Left L3 Transverse Process', boneName: 'virt_L3_TP_L', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.55, offsetX: -0.05 },
  { label: 'Right L3 Transverse Process', boneName: 'virt_L3_TP_R', boneA: 'Spine1_M', boneB: 'RootPart1_M', t: 0.55, offsetX: 0.05 },
  { label: 'Left L4 Transverse Process', boneName: 'virt_L4_TP_L', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.3, offsetX: -0.05 },
  { label: 'Right L4 Transverse Process', boneName: 'virt_L4_TP_R', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.3, offsetX: 0.05 },
  { label: 'Left L5 Transverse Process', boneName: 'virt_L5_TP_L', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.6, offsetX: -0.05 },
  { label: 'Right L5 Transverse Process', boneName: 'virt_L5_TP_R', boneA: 'RootPart1_M', boneB: 'RootPart2_M', t: 0.6, offsetX: 0.05 },
  { label: 'Left Iliolumbar Ligament', boneName: 'virt_iliolumbar_L', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.3, offsetX: -0.06 },
  { label: 'Right Iliolumbar Ligament', boneName: 'virt_iliolumbar_R', boneA: 'RootPart2_M', boneB: 'Root_M', t: 0.3, offsetX: 0.06 },
  { label: 'Left Sacrospinous Ligament', boneName: 'virt_sacrospinous_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.35, offsetZ: -0.08, offsetY: -0.04 },
  { label: 'Right Sacrospinous Ligament', boneName: 'virt_sacrospinous_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.35, offsetZ: -0.08, offsetY: -0.04 },
  { label: 'Left Sacrotuberous Ligament', boneName: 'virt_sacrotuberous_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.42, offsetZ: -0.1, offsetY: -0.06 },
  { label: 'Right Sacrotuberous Ligament', boneName: 'virt_sacrotuberous_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.42, offsetZ: -0.1, offsetY: -0.06 },

  // ========== DEEP TRUNK & CORE MUSCLE MARKERS ==========
  { label: 'Left Thoracic Erector Spinae', boneName: 'virt_erector_thor_L', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.5, offsetX: -0.05, offsetZ: -0.06 },
  { label: 'Right Thoracic Erector Spinae', boneName: 'virt_erector_thor_R', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.5, offsetX: 0.05, offsetZ: -0.06 },
  { label: 'Left Lumbar Erector Spinae', boneName: 'virt_erector_lumb_L', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.4, offsetX: -0.04, offsetZ: -0.05 },
  { label: 'Right Lumbar Erector Spinae', boneName: 'virt_erector_lumb_R', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.4, offsetX: 0.04, offsetZ: -0.05 },
  { label: 'Left Quadratus Lumborum', boneName: 'virt_ql_L', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.5, offsetX: -0.08, offsetZ: -0.03 },
  { label: 'Right Quadratus Lumborum', boneName: 'virt_ql_R', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.5, offsetX: 0.08, offsetZ: -0.03 },
  { label: 'Left Psoas Major', boneName: 'virt_psoas_L', boneA: 'Spine1_M', boneB: 'Hip_L', t: 0.4, offsetZ: 0.05 },
  { label: 'Right Psoas Major', boneName: 'virt_psoas_R', boneA: 'Spine1_M', boneB: 'Hip_R', t: 0.4, offsetZ: 0.05 },
  { label: 'Left Transverse Abdominis', boneName: 'virt_tva_L', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.5, offsetX: -0.12, offsetZ: 0.06 },
  { label: 'Right Transverse Abdominis', boneName: 'virt_tva_R', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.5, offsetX: 0.12, offsetZ: 0.06 },
  { label: 'Left Internal Oblique', boneName: 'virt_int_oblique_L', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.4, offsetX: -0.13, offsetZ: 0.08 },
  { label: 'Right Internal Oblique', boneName: 'virt_int_oblique_R', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.4, offsetX: 0.13, offsetZ: 0.08 },
  { label: 'Left External Oblique', boneName: 'virt_ext_oblique_L', boneA: 'Spine1Part2_M', boneB: 'Root_M', t: 0.4, offsetX: -0.15, offsetZ: 0.08 },
  { label: 'Right External Oblique', boneName: 'virt_ext_oblique_R', boneA: 'Spine1Part2_M', boneB: 'Root_M', t: 0.4, offsetX: 0.15, offsetZ: 0.08 },
  { label: 'Upper Rectus Abdominis', boneName: 'virt_rectus_upper', boneA: 'Spine1Part2_M', boneB: 'Spine1Part1_M', t: 0.5, offsetZ: 0.12 },
  { label: 'Lower Rectus Abdominis', boneName: 'virt_rectus_lower', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.5, offsetZ: 0.1 },
  { label: 'Linea Alba', boneName: 'virt_linea_alba', boneA: 'Spine1Part1_M', boneB: 'Root_M', t: 0.5, offsetZ: 0.11 },
  { label: 'Left Thoracolumbar Fascia', boneName: 'virt_tlf_L', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.4, offsetX: -0.06, offsetZ: -0.07 },
  { label: 'Right Thoracolumbar Fascia', boneName: 'virt_tlf_R', boneA: 'Spine1_M', boneB: 'Root_M', t: 0.4, offsetX: 0.06, offsetZ: -0.07 },
  { label: 'Diaphragm Attachment', boneName: 'virt_diaphragm', boneA: 'Spine1Part2_M', boneB: 'Spine1Part1_M', t: 0.4, offsetZ: 0.08 },
  { label: 'Left Serratus Anterior', boneName: 'virt_serratus_L', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.3, offsetX: -0.15, offsetZ: 0.04 },
  { label: 'Right Serratus Anterior', boneName: 'virt_serratus_R', boneA: 'Chest_M', boneB: 'Spine1Part1_M', t: 0.3, offsetX: 0.15, offsetZ: 0.04 },

  // ========== ADDITIONAL UPPER/LOWER LIMB SOFT TISSUE ==========
  { label: 'Left Triceps Long Head', boneName: 'virt_triceps_long_L', boneA: 'Shoulder_L', boneB: 'Elbow_L', t: 0.4, offsetZ: -0.04 },
  { label: 'Right Triceps Long Head', boneName: 'virt_triceps_long_R', boneA: 'Shoulder_R', boneB: 'Elbow_R', t: 0.4, offsetZ: -0.04 },
  { label: 'Left Triceps Lateral Head', boneName: 'virt_triceps_lat_L', boneA: 'Shoulder_L', boneB: 'Elbow_L', t: 0.5, offsetX: -0.03, offsetZ: -0.03 },
  { label: 'Right Triceps Lateral Head', boneName: 'virt_triceps_lat_R', boneA: 'Shoulder_R', boneB: 'Elbow_R', t: 0.5, offsetX: 0.03, offsetZ: -0.03 },
  { label: 'Left Brachioradialis', boneName: 'virt_brachiorad_L', boneA: 'Elbow_L', boneB: 'Wrist_L', t: 0.3, offsetX: -0.02, offsetZ: 0.02 },
  { label: 'Right Brachioradialis', boneName: 'virt_brachiorad_R', boneA: 'Elbow_R', boneB: 'Wrist_R', t: 0.3, offsetX: 0.02, offsetZ: 0.02 },
  { label: 'Left Pronator Teres', boneName: 'virt_pronator_L', boneA: 'Elbow_L', boneB: 'Wrist_L', t: 0.15, offsetZ: 0.03 },
  { label: 'Right Pronator Teres', boneName: 'virt_pronator_R', boneA: 'Elbow_R', boneB: 'Wrist_R', t: 0.15, offsetZ: 0.03 },
  { label: 'Left Common Flexor Origin', boneName: 'virt_cfo_L', boneA: 'ShoulderPart2_L', boneB: 'Elbow_L', t: 0.95, offsetX: 0.03, offsetZ: 0.02 },
  { label: 'Right Common Flexor Origin', boneName: 'virt_cfo_R', boneA: 'ShoulderPart2_R', boneB: 'Elbow_R', t: 0.95, offsetX: -0.03, offsetZ: 0.02 },
  { label: 'Left Common Extensor Origin', boneName: 'virt_ceo_L', boneA: 'ShoulderPart2_L', boneB: 'Elbow_L', t: 0.95, offsetX: -0.03, offsetZ: -0.01 },
  { label: 'Right Common Extensor Origin', boneName: 'virt_ceo_R', boneA: 'ShoulderPart2_R', boneB: 'Elbow_R', t: 0.95, offsetX: 0.03, offsetZ: -0.01 },
  { label: 'Left TFL (Tensor Fasciae Latae)', boneName: 'virt_tfl_L', boneA: 'Root_M', boneB: 'Hip_L', t: 0.3, offsetX: -0.06, offsetZ: 0.06 },
  { label: 'Right TFL (Tensor Fasciae Latae)', boneName: 'virt_tfl_R', boneA: 'Root_M', boneB: 'Hip_R', t: 0.3, offsetX: 0.06, offsetZ: 0.06 },
  { label: 'Left Sartorius', boneName: 'virt_sartorius_L', boneA: 'Hip_L', boneB: 'Knee_L', t: 0.3, offsetX: 0.02, offsetZ: 0.04 },
  { label: 'Right Sartorius', boneName: 'virt_sartorius_R', boneA: 'Hip_R', boneB: 'Knee_R', t: 0.3, offsetX: -0.02, offsetZ: 0.04 },
  { label: 'Left Adductor Canal', boneName: 'virt_add_canal_L', boneA: 'HipPart1_L', boneB: 'Knee_L', t: 0.5, offsetX: 0.03, offsetZ: 0.02 },
  { label: 'Right Adductor Canal', boneName: 'virt_add_canal_R', boneA: 'HipPart1_R', boneB: 'Knee_R', t: 0.5, offsetX: -0.03, offsetZ: 0.02 },
  { label: 'Left Hamstring Mid-Belly', boneName: 'virt_hamstring_mid_L', boneA: 'HipPart1_L', boneB: 'Knee_L', t: 0.5, offsetZ: -0.04 },
  { label: 'Right Hamstring Mid-Belly', boneName: 'virt_hamstring_mid_R', boneA: 'HipPart1_R', boneB: 'Knee_R', t: 0.5, offsetZ: -0.04 },
  { label: 'Left Soleus', boneName: 'virt_soleus_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.5, offsetZ: -0.03 },
  { label: 'Right Soleus', boneName: 'virt_soleus_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.5, offsetZ: -0.03 },
  { label: 'Left Tibialis Posterior', boneName: 'virt_tib_post_L', boneA: 'Knee_L', boneB: 'Ankle_L', t: 0.6, offsetX: 0.02, offsetZ: -0.02 },
  { label: 'Right Tibialis Posterior', boneName: 'virt_tib_post_R', boneA: 'Knee_R', boneB: 'Ankle_R', t: 0.6, offsetX: -0.02, offsetZ: -0.02 },
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
    'left_scapula': 'leftScapula',
    'right_scapula': 'rightScapula',
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

const getContralateralCamelJoint = (camelJoint: string): string | null => {
  if (camelJoint.startsWith('left')) return 'right' + camelJoint.slice(4);
  if (camelJoint.startsWith('right')) return 'left' + camelJoint.slice(5);
  return null;
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
  // Shoulder flexion restrictions - GH joint restricted → compensate via scapula, thoracic, lumbar
  'left_shoulder:flexion': [
    { targetJoint: 'leftScapula', targetMovement: 'upwardRotation', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.2 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.15 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.3 },
  ],
  'right_shoulder:flexion': [
    { targetJoint: 'rightScapula', targetMovement: 'upwardRotation', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.2 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.15 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.3 },
  ],
  // Shoulder abduction restrictions - similar compensation chain
  'left_shoulder:abduction': [
    { targetJoint: 'leftScapula', targetMovement: 'upwardRotation', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.15 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.1 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.2 },
  ],
  'right_shoulder:abduction': [
    { targetJoint: 'rightScapula', targetMovement: 'upwardRotation', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.15 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.1 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.2 },
  ],
  // Scapula upward rotation restricted → compensate via GH, thoracic, lumbar
  'left_scapula:upwardRotation': [
    { targetJoint: 'leftShoulder', targetMovement: 'flexion', ratio: 0.2 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.25 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.2 },
  ],
  'right_scapula:upwardRotation': [
    { targetJoint: 'rightShoulder', targetMovement: 'flexion', ratio: 0.2 },
    { targetJoint: 'spine', targetMovement: 'thoracicKyphosis', ratio: -0.25 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.2 },
  ],
  // Thoracic extension restricted → lumbar takes over
  'thoracic_spine:extension': [
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: -0.4 },
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.2 },
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
  'left_shoulder:internalRotation': [
    { targetJoint: 'leftScapula', targetMovement: 'protraction', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicRotation', ratio: 0.25 },
  ],
  'right_shoulder:internalRotation': [
    { targetJoint: 'rightScapula', targetMovement: 'protraction', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicRotation', ratio: 0.25 },
  ],
  'left_hip:abduction': [
    { targetJoint: 'pelvis', targetMovement: 'obliquity', ratio: 0.5 },
    { targetJoint: 'spine', targetMovement: 'lateralFlexion', ratio: 0.3 },
  ],
  'right_hip:abduction': [
    { targetJoint: 'pelvis', targetMovement: 'obliquity', ratio: -0.5 },
    { targetJoint: 'spine', targetMovement: 'lateralFlexion', ratio: -0.3 },
  ],
  'left_hip:extension': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.4 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: 0.3 },
  ],
  'right_hip:extension': [
    { targetJoint: 'pelvis', targetMovement: 'tilt', ratio: -0.4 },
    { targetJoint: 'spine', targetMovement: 'lumbarLordosis', ratio: 0.3 },
  ],
  'left_knee:extension': [
    { targetJoint: 'leftHip', targetMovement: 'flexion', ratio: -0.3 },
    { targetJoint: 'leftAnkle', targetMovement: 'plantarflexion', ratio: 0.25 },
  ],
  'right_knee:extension': [
    { targetJoint: 'rightHip', targetMovement: 'flexion', ratio: -0.3 },
    { targetJoint: 'rightAnkle', targetMovement: 'plantarflexion', ratio: 0.25 },
  ],
  'left_ankle:plantarflexion': [
    { targetJoint: 'leftKnee', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'right_ankle:plantarflexion': [
    { targetJoint: 'rightKnee', targetMovement: 'flexion', ratio: 0.3 },
  ],
  'left_shoulder:externalRotation': [
    { targetJoint: 'leftScapula', targetMovement: 'retraction', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicRotation', ratio: -0.2 },
  ],
  'right_shoulder:externalRotation': [
    { targetJoint: 'rightScapula', targetMovement: 'retraction', ratio: 0.3 },
    { targetJoint: 'spine', targetMovement: 'thoracicRotation', ratio: 0.2 },
  ],
  'left_hip:internalRotation': [
    { targetJoint: 'leftKnee', targetMovement: 'varus', ratio: -0.3 },
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.25 },
  ],
  'right_hip:internalRotation': [
    { targetJoint: 'rightKnee', targetMovement: 'varus', ratio: -0.3 },
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: -0.25 },
  ],
  'left_hip:externalRotation': [
    { targetJoint: 'leftKnee', targetMovement: 'varus', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: -0.25 },
  ],
  'right_hip:externalRotation': [
    { targetJoint: 'rightKnee', targetMovement: 'varus', ratio: 0.3 },
    { targetJoint: 'pelvis', targetMovement: 'rotation', ratio: 0.25 },
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
  onAnimationProgress?: (progress: number) => void;
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
  skeletonMode?: 'posture' | 'movement';
  activeCapacities?: Record<string, {
    activeRomMin?: number;
    activeRomMax: number;
    passiveRomMin?: number;
    passiveRomMax: number;
    painfulArc?: { start: number; end: number; intensity?: number } | null;
    strengthGrade?: string;
    inhibitionLevel?: number;
    notes?: string;
  }> | null;
  /** Fired on mouseUp at the end of a movement-mode drag, so the
   *  page can stream the attempt into the Movement Findings AI. */
  onActiveMovementAttempt?: (attempt: {
    joint: string;
    movement: string;
    achievedAngle: number;
    activeRomMax: number;
    passiveRomMax: number;
    inPainfulArc: boolean;
    exceededActiveLimit: boolean;
    compensationsTriggered: string[];
  }) => void;
  /** Fired the moment a movement-mode drag enters a painful arc, so
   *  the predicted-pain layer can register a transient flare on the
   *  affected joint/movement. Fires once per arc entry (not per frame). */
  onPainfulArcFlare?: (flare: {
    joint: string;
    movement: string;
    angle: number;
    intensity: number;
    arcStart: number;
    arcEnd: number;
  }) => void;
  /** Externally controlled bone-segment selection (Task #212). When provided, the viewer mirrors this selection and emits changes via onSelectedBoneSegmentChange. */
  selectedBoneSegmentId?: BoneSegmentId | null;
  onSelectedBoneSegmentChange?: (id: BoneSegmentId | null) => void;
  enableZoomTool?: boolean;
  onLandmarkSelect?: (landmark: { label: string; boneName: string; position: { x: number; y: number; z: number } }) => void;
  forceOverlay?: { id: string; label: string; boneName: string; compression: number; tension: number; shear: number; totalForce: number; status: 'low' | 'moderate' | 'high' | 'very_high'; clinical: string }[] | null;
  bodyWeightKg?: number;
  selectedForceJoint?: string | null;
  onForceJointSelect?: (joint: string) => void;
  enableMuscleInteraction?: boolean;
  onMuscleGroupClick?: (groupId: string, screenX: number, screenY: number) => void;
  highlightMuscleGroups?: string[];
  muscleHighlightColors?: Record<string, string>;
  environmentPreset?: string;
  fascialChainVisualization?: {
    enabled: boolean;
    chains: MyofascialChain[];
    tensions: Record<string, number>;
    activeChains: string[];
    painHighlightChains?: string[];
    showPropagation?: boolean;
    propagationDeltas?: Record<string, number>;
  };
  onChainNodeClick?: (data: { chainId: string; muscleId: string; chainName: string }) => void;
  scarMarkers?: ScarMarker[];
  adhesionBands?: AdhesionBand[];
  onScarMarkerClick?: (id: string) => void;
  onSkeletonClick?: (position: { x: number; y: number; z: number }, nearestBone: string, anatomicalLabel: string) => void;
  enableSkeletonClick?: boolean;
  treatmentBoneNames?: string[];
  onBoneScreenPositions?: (positions: Array<{ boneName: string; screenX: number; screenY: number; visible: boolean }>) => void;
  dermatomeHighlightBones?: string[];
  nerveRootLabels?: Array<{ root: string; boneName: string }>;
  referralZoneBones?: string[];
  tissueViewOverlay?: {
    bones: string[];
    color: number;
    label: string;
    markers?: Array<{ boneName: string; color: number; size: number; label: string }>;
    pathwayLines?: Array<{ boneSequence: string[]; color: number; label: string }>;
    loadIndicators?: Array<{ boneName: string; loadPercent: number; color: number }>;
  } | null;
  onTissueBoneClick?: (boneName: string) => void;
  biomechanicsFaultHighlights?: Array<{
    boneName: string;
    color: number;
    intensity: number;
    label: string;
  }>;
  tissueIntelligenceHighlights?: Array<{
    tissueId: string;
    tissueType: 'tendon' | 'joint' | 'nerve' | 'fascia';
    label: string;
    bones: string[];
    severity: number;
    healingStage: 'acute' | 'subacute' | 'chronic' | 'degenerative' | 'baseline';
    irritability: 'low' | 'moderate' | 'high';
    isDeep: boolean;
    aggravators?: Array<{
      kind: 'position' | 'movement' | 'load' | 'environment';
      label: string;
      boneAnchor?: string;
      predicate?:
        | { kind: 'shoulderAbductionAbove'; side: 'L' | 'R'; threshold: number }
        | { kind: 'kneeFlexionAbove'; side: 'L' | 'R'; threshold: number }
        | { kind: 'kneeFlexionBelow'; side: 'L' | 'R'; threshold: number }
        | { kind: 'hipFlexionAbove'; side: 'L' | 'R'; threshold: number }
        | { kind: 'spineFlexionAbove'; threshold: number }
        | { kind: 'spineExtensionAbove'; threshold: number }
        | { kind: 'forwardHeadAbove'; threshold: number }
        | { kind: 'always' };
    }>;
  }>;
  slingPathwayVisualization?: {
    enabled: boolean;
    activeSlingId: string | null;
    slings: Array<{
      id: string;
      label: string;
      color: string;
      bonePathway: string[];
      status: string;
      activationScore: number;
      forceTransferQuality: string;
      weakLinkBoneIndices: number[];
      overloadedBoneIndices: number[];
      compensatingBoneIndices: number[];
      narrative: string;
      downstreamRiskArea: string;
      weakLinks: Array<{ muscle: string; activationPct: number; reason: string; impactOnSling: string }>;
      compensations: Array<{ compensatingSlingLabel: string; mechanism: string; severity: string; clinical: string }>;
      treatmentTargets: Array<{ muscle: string; intervention: string; priority: number; rationale: string }>;
      muscleScores: Array<{ muscle: string; activation: number; found: boolean }>;
      forceReroutes: Array<{ fromMuscle: string; toMuscle: string; reroutePct: number }>;
    }>;
    crossSlingCompensations: Array<{ compensatingSling: string; compensatingSlingLabel: string; compensatedSling: string; compensatedSlingLabel: string; severity: string; additionalLoadPct: number; mechanism: string }>;
  } | null;
  onSlingLabelClick?: (slingId: string) => void;
  onModelLoadProgress?: (progress: number) => void;
  onModelReady?: () => void;
  onModelLoadError?: (error: string) => void;
  goalStateOverlay?: {
    enabled: boolean;
    painTargets?: Array<{ boneName: string; targetIntensity: number; currentIntensity: number }>;
    muscleTargets?: Array<{ groupId: string; targetTension: number; currentTension: number }>;
    postureTargets?: Array<{ boneName: string; targetAngle: number; currentAngle: number; axis: 'x' | 'y' | 'z' }>;
    romTargets?: Array<{ boneName: string; targetDegrees: number; currentDegrees: number; label: string }>;
    overallPct?: number;
  } | null;
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

const BONE_MAPPING: { [configKey: string]: { boneName: string; axis: 'x' | 'y' | 'z'; scale: number; isPosition?: boolean; customAxis?: { x: number; y: number; z: number } }[] } = {
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
  // customAxis: single axis-angle rotation avoids Euler non-linearity at large angles
  // Axis normalize(0, 0.86, 1.0) = (0, 0.651, 0.759) cancels lateral displacement
  'leftKnee.flexion': [{ boneName: 'Knee_L', axis: 'z', scale: -1, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  'leftKnee.varus': [{ boneName: 'Knee_L', axis: 'y', scale: 1 }],
  'leftKnee.tibialTorsion': [{ boneName: 'Knee_L', axis: 'x', scale: 1 }],
  'leftKnee.recurvatum': [{ boneName: 'Knee_L', axis: 'z', scale: 0.5, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  'leftKnee.tibialSlope': [{ boneName: 'Knee_L', axis: 'z', scale: -0.3, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  'rightKnee.flexion': [{ boneName: 'Knee_R', axis: 'z', scale: -1, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  'rightKnee.varus': [{ boneName: 'Knee_R', axis: 'y', scale: -1 }],
  'rightKnee.tibialTorsion': [{ boneName: 'Knee_R', axis: 'x', scale: -1 }],
  'rightKnee.recurvatum': [{ boneName: 'Knee_R', axis: 'z', scale: 0.5, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  'rightKnee.tibialSlope': [{ boneName: 'Knee_R', axis: 'z', scale: -0.3, customAxis: { x: 0, y: 0.651, z: 0.759 } }],
  
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
  'rightScapula.elevation': [{ boneName: 'Scapula_R', axis: 'y', scale: -1 }],    // Same sign as left (local axes not mirrored)
  'rightScapula.depression': [{ boneName: 'Scapula_R', axis: 'y', scale: 1 }],
  
  // Upward/Downward Rotation: Glenoid points up (Z-axis rotation - frontal plane rotation)
  // Inferior angle moves laterally when glenoid faces upward
  'leftScapula.upwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: 1 }],    // Inferior angle moves lateral, glenoid faces up
  'leftScapula.downwardRotation': [{ boneName: 'Scapula_L', axis: 'z', scale: -1 }], // Inferior angle moves medial
  'rightScapula.upwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: 1 }],   // Same sign as left (local axes not mirrored)
  'rightScapula.downwardRotation': [{ boneName: 'Scapula_R', axis: 'z', scale: -1 }],
  
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
    { boneName: 'Scapula_R', axis: 'z', scale: 0.4 }    // Same Z sign as left (local axes not mirrored)
  ],
  
  // Clavicle axial rotation - simulates rotation along clavicle's long axis
  // Posterior rotation: clavicle rotates backward, elevating acromial end
  // Anterior rotation: clavicle rotates forward, depressing acromial end
  'leftScapula.clavicleRotation': [
    { boneName: 'Scapula_L', axis: 'z', scale: 0.8 },   // Primary rotation axis (upward/downward rotation plane)
    { boneName: 'Scapula_L', axis: 'x', scale: -0.3 }   // Secondary forward tilt component
  ],
  'rightScapula.clavicleRotation': [
    { boneName: 'Scapula_R', axis: 'z', scale: 0.8 },   // Same Z sign as left (local axes not mirrored)
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
  'pelvis.xShift': [{ boneName: 'Root_M', axis: 'x', scale: 0.01, isPosition: true }],
  'pelvis.yShift': [{ boneName: 'Root_M', axis: 'y', scale: 0.01, isPosition: true }],
  
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

function applyCustomAxisRotation(
  boneRotations: { [boneName: string]: { x: number; y: number; z: number } },
  boneName: string,
  customAxis: { x: number; y: number; z: number },
  adjustedAngle: number,
  initialRotations: { [key: string]: { x: number; y: number; z: number } }
) {
  if (!boneRotations[boneName]) {
    const initial = initialRotations[boneName];
    if (!initial) return;
    boneRotations[boneName] = { x: initial.x, y: initial.y, z: initial.z };
  }
  const current = boneRotations[boneName];
  const axisVec = new THREE.Vector3(customAxis.x, customAxis.y, customAxis.z).normalize();
  const currentQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(current.x, current.y, current.z, 'XYZ')
  );
  const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, adjustedAngle);
  const resultQuat = new THREE.Quaternion().multiplyQuaternions(deltaQuat, currentQuat);
  const resultEuler = new THREE.Euler().setFromQuaternion(resultQuat, 'XYZ');
  boneRotations[boneName].x = resultEuler.x;
  boneRotations[boneName].y = resultEuler.y;
  boneRotations[boneName].z = resultEuler.z;
}

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

// Per-joint movement (DOF) arrows shown around the selected joint dot.
// `direction` is the world-space vector along which the distal segment moves
// when the underlying configKey value increases (assuming the model is in an
// upright T-pose facing +Z, with +X to the model's left, +Y up).
// `scale: -1` flips that — used when one DOF spec covers both directions
// of motion (e.g. signed abduction range from -45..45).
//
// Limits/labels are NOT defined here — they are sourced at runtime from the
// canonical DOF_SPECS registry exported by JointAngleEditor, and arrows whose
// `configKey` is not present in the registry are filtered out. This guarantees
// arrow ranges, sidebar editor ranges, and engine constraints can never drift.
interface MovementArrowDef {
  configKey: string;
  label: string;
  direction: [number, number, number];
  sensitivity: number;
  scale?: number;
}

// Index DOF_SPECS by id for O(1) lookup of canonical limits/labels.
const DOF_LIMIT_INDEX: Map<string, { min: number; max: number; label: string }> = (() => {
  const m = new Map<string, { min: number; max: number; label: string }>();
  for (const spec of DOF_SPECS) {
    m.set(spec.id, { min: spec.min, max: spec.max, label: spec.label });
  }
  return m;
})();

const COMPENSATION_CHAIN_BY_KEY: Map<string, typeof COMPENSATION_CHAINS[number]['compensators']> = (() => {
  const m = new Map<string, typeof COMPENSATION_CHAINS[number]['compensators']>();
  for (const chain of COMPENSATION_CHAINS) m.set(`${chain.source.joint}:${chain.source.movement}`, chain.compensators);
  return m;
})();
function camelToSnake(s: string): string { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }
function snakeToCamel(s: string): string { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }

type ActivationKey = keyof MuscleActivationLevels;
const MOVEMENT_MUSCLE_AGONISTS: Record<string, { agonists: ActivationKey[]; antagonists: ActivationKey[] }> = {
  'leftHip.flexion+':   { agonists: ['rectusFemoris', 'sartorius', 'tensorFasciaeLatae'], antagonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'] },
  'rightHip.flexion+':  { agonists: ['rectusFemoris', 'sartorius', 'tensorFasciaeLatae'], antagonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'] },
  'leftHip.flexion-':   { agonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'], antagonists: ['rectusFemoris', 'sartorius'] },
  'rightHip.flexion-':  { agonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'], antagonists: ['rectusFemoris', 'sartorius'] },
  'leftHip.abduction+': { agonists: ['tensorFasciaeLatae'], antagonists: ['adductorMagnus', 'adductorLongus'] },
  'rightHip.abduction+':{ agonists: ['tensorFasciaeLatae'], antagonists: ['adductorMagnus', 'adductorLongus'] },
  'leftHip.abduction-': { agonists: ['adductorMagnus', 'adductorLongus'], antagonists: ['tensorFasciaeLatae'] },
  'rightHip.abduction-':{ agonists: ['adductorMagnus', 'adductorLongus'], antagonists: ['tensorFasciaeLatae'] },
  'leftKnee.flexion+':  { agonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'], antagonists: ['rectusFemoris', 'vastusLateralis', 'vastusMedialis', 'vastusIntermedius'] },
  'rightKnee.flexion+': { agonists: ['bicepsFemoris', 'semimembranosus', 'semitendinosus'], antagonists: ['rectusFemoris', 'vastusLateralis', 'vastusMedialis', 'vastusIntermedius'] },
  'leftAnkle.dorsiflexion+':  { agonists: ['tibialisAnterior', 'extensorDigitorumLongus', 'extensorHallucisLongus'], antagonists: ['gastrocnemiusMedial', 'gastrocnemiusLateral', 'soleus'] },
  'rightAnkle.dorsiflexion+': { agonists: ['tibialisAnterior', 'extensorDigitorumLongus', 'extensorHallucisLongus'], antagonists: ['gastrocnemiusMedial', 'gastrocnemiusLateral', 'soleus'] },
  'leftAnkle.dorsiflexion-':  { agonists: ['gastrocnemiusMedial', 'gastrocnemiusLateral', 'soleus', 'plantaris'], antagonists: ['tibialisAnterior'] },
  'rightAnkle.dorsiflexion-': { agonists: ['gastrocnemiusMedial', 'gastrocnemiusLateral', 'soleus', 'plantaris'], antagonists: ['tibialisAnterior'] },
};

function computeMovementMuscleActivation(
  configKey: string,
  startValue: number,
  currentValue: number,
  activeRomMin: number,
  activeRomMax: number,
  painInhibitionFactor: number,
): MuscleActivationLevels | null {
  const direction: '+' | '-' = currentValue >= startValue ? '+' : '-';
  const lookupKey = `${configKey}${direction}`;
  const map = MOVEMENT_MUSCLE_AGONISTS[lookupKey];
  if (!map) return null;
  const side: 'left' | 'right' = configKey.startsWith('left') ? 'left' : 'right';
  const targetLimit = direction === '+' ? activeRomMax : activeRomMin;
  const denom = Math.max(1, Math.abs(targetLimit - startValue));
  const progress = Math.min(1, Math.abs(currentValue - startValue) / denom);
  const agonistLevel = Math.max(0, progress * (1 - 0.6 * painInhibitionFactor));
  const antagonistLevel = Math.min(0.6, 0.15 + 0.4 * progress + 0.3 * painInhibitionFactor);
  const out: MuscleActivationLevels = {};
  for (const m of map.agonists) {
    out[m] = { ...(out[m] ?? { left: 0, right: 0 }), [side]: agonistLevel } as { left: number; right: number };
  }
  for (const m of map.antagonists) {
    out[m] = { ...(out[m] ?? { left: 0, right: 0 }), [side]: antagonistLevel } as { left: number; right: number };
  }
  return out;
}

const JOINT_MOVEMENT_DEFS: Record<string, MovementArrowDef[]> = {
  // Hip: signed abduction (-45..45) and signed internalRotation (-45..45) are
  // each a single DOF — the second arrow uses scale: -1 to drive the same key
  // in the opposite direction. flexion and extension are SEPARATE DOFs.
  leftHip: [
    { configKey: 'leftHip.flexion',          label: 'Flex', direction: [0, 0, 1],         sensitivity: 0.5 },
    { configKey: 'leftHip.extension',        label: 'Ext',  direction: [0, 0, -1],        sensitivity: 0.5 },
    { configKey: 'leftHip.abduction',        label: 'Abd',  direction: [-1, 0, 0],        sensitivity: 0.5 },
    { configKey: 'leftHip.abduction',        label: 'Add',  direction: [1, 0, 0],         sensitivity: 0.5, scale: -1 },
    { configKey: 'leftHip.internalRotation', label: 'IR',   direction: [0.7, -0.5, 0.3],  sensitivity: 0.5 },
    { configKey: 'leftHip.internalRotation', label: 'ER',   direction: [-0.7, -0.5, 0.3], sensitivity: 0.5, scale: -1 },
  ],
  rightHip: [
    { configKey: 'rightHip.flexion',          label: 'Flex', direction: [0, 0, 1],         sensitivity: 0.5 },
    { configKey: 'rightHip.extension',        label: 'Ext',  direction: [0, 0, -1],        sensitivity: 0.5 },
    { configKey: 'rightHip.abduction',        label: 'Abd',  direction: [1, 0, 0],         sensitivity: 0.5 },
    { configKey: 'rightHip.abduction',        label: 'Add',  direction: [-1, 0, 0],        sensitivity: 0.5, scale: -1 },
    { configKey: 'rightHip.internalRotation', label: 'IR',   direction: [-0.7, -0.5, 0.3], sensitivity: 0.5 },
    { configKey: 'rightHip.internalRotation', label: 'ER',   direction: [0.7, -0.5, 0.3],  sensitivity: 0.5, scale: -1 },
  ],
  // Knee: only 'flexion' DOF in the registry (range -10..140 covers
  // recurvatum). The Ext arrow simply drags the same DOF in reverse.
  leftKnee: [
    { configKey: 'leftKnee.flexion', label: 'Flex', direction: [0, 0, -1], sensitivity: 0.6 },
    { configKey: 'leftKnee.flexion', label: 'Ext',  direction: [0, 0, 1],  sensitivity: 0.6, scale: -1 },
  ],
  rightKnee: [
    { configKey: 'rightKnee.flexion', label: 'Flex', direction: [0, 0, -1], sensitivity: 0.6 },
    { configKey: 'rightKnee.flexion', label: 'Ext',  direction: [0, 0, 1],  sensitivity: 0.6, scale: -1 },
  ],
  // Ankle: dorsi/plantar and inversion/eversion are SEPARATE DOFs in the
  // registry (each unsigned 0..max).
  leftAnkle: [
    { configKey: 'leftAnkle.dorsiflexion',   label: 'DF',  direction: [0, 0.5, 1],  sensitivity: 0.4 },
    { configKey: 'leftAnkle.plantarflexion', label: 'PF',  direction: [0, -0.5, 1], sensitivity: 0.4 },
    { configKey: 'leftAnkle.inversion',      label: 'Inv', direction: [1, 0, 0],    sensitivity: 0.4 },
    { configKey: 'leftAnkle.eversion',       label: 'Ev',  direction: [-1, 0, 0],   sensitivity: 0.4 },
  ],
  rightAnkle: [
    { configKey: 'rightAnkle.dorsiflexion',   label: 'DF',  direction: [0, 0.5, 1],  sensitivity: 0.4 },
    { configKey: 'rightAnkle.plantarflexion', label: 'PF',  direction: [0, -0.5, 1], sensitivity: 0.4 },
    { configKey: 'rightAnkle.inversion',      label: 'Inv', direction: [-1, 0, 0],   sensitivity: 0.4 },
    { configKey: 'rightAnkle.eversion',       label: 'Ev',  direction: [1, 0, 0],    sensitivity: 0.4 },
  ],
  // Shoulder: flexion (-180..180) and abduction (-180..180) are each signed
  // single DOFs. IR and ER are SEPARATE DOFs. The DOF model has no horizontal
  // ab/adduction key, so no H.Abd/H.Add arrows are exposed.
  leftShoulder: [
    { configKey: 'leftShoulder.flexion',          label: 'Flex', direction: [0, 0, 1],         sensitivity: 0.7 },
    { configKey: 'leftShoulder.flexion',          label: 'Ext',  direction: [0, 0, -1],        sensitivity: 0.7, scale: -1 },
    { configKey: 'leftShoulder.abduction',        label: 'Abd',  direction: [-1, 0, 0],        sensitivity: 0.7 },
    { configKey: 'leftShoulder.abduction',        label: 'Add',  direction: [1, 0, 0],         sensitivity: 0.7, scale: -1 },
    { configKey: 'leftShoulder.internalRotation', label: 'IR',   direction: [0.6, -0.5, 0.6],  sensitivity: 0.5 },
    { configKey: 'leftShoulder.externalRotation', label: 'ER',   direction: [-0.6, -0.5, 0.6], sensitivity: 0.5 },
  ],
  rightShoulder: [
    { configKey: 'rightShoulder.flexion',          label: 'Flex', direction: [0, 0, 1],         sensitivity: 0.7 },
    { configKey: 'rightShoulder.flexion',          label: 'Ext',  direction: [0, 0, -1],        sensitivity: 0.7, scale: -1 },
    { configKey: 'rightShoulder.abduction',        label: 'Abd',  direction: [1, 0, 0],         sensitivity: 0.7 },
    { configKey: 'rightShoulder.abduction',        label: 'Add',  direction: [-1, 0, 0],        sensitivity: 0.7, scale: -1 },
    { configKey: 'rightShoulder.internalRotation', label: 'IR',   direction: [-0.6, -0.5, 0.6], sensitivity: 0.5 },
    { configKey: 'rightShoulder.externalRotation', label: 'ER',   direction: [0.6, -0.5, 0.6],  sensitivity: 0.5 },
  ],
  // Elbow: only flexion (0..145) and signed pronation (-90..90) DOFs.
  leftElbow: [
    { configKey: 'leftElbow.flexion',   label: 'Flex', direction: [0, 0, 1],  sensitivity: 0.5 },
    { configKey: 'leftElbow.flexion',   label: 'Ext',  direction: [0, 0, -1], sensitivity: 0.5, scale: -1 },
    { configKey: 'leftElbow.pronation', label: 'Pro',  direction: [1, 0, 0],  sensitivity: 0.4 },
    { configKey: 'leftElbow.pronation', label: 'Sup',  direction: [-1, 0, 0], sensitivity: 0.4, scale: -1 },
  ],
  rightElbow: [
    { configKey: 'rightElbow.flexion',   label: 'Flex', direction: [0, 0, 1],  sensitivity: 0.5 },
    { configKey: 'rightElbow.flexion',   label: 'Ext',  direction: [0, 0, -1], sensitivity: 0.5, scale: -1 },
    { configKey: 'rightElbow.pronation', label: 'Pro',  direction: [-1, 0, 0], sensitivity: 0.4 },
    { configKey: 'rightElbow.pronation', label: 'Sup',  direction: [1, 0, 0],  sensitivity: 0.4, scale: -1 },
  ],
  leftWrist: [
    { configKey: 'leftWrist.flexion',   label: 'Flex', direction: [0, 0, 1],  sensitivity: 0.4 },
    { configKey: 'leftWrist.flexion',   label: 'Ext',  direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
    { configKey: 'leftWrist.deviation', label: 'Rad',  direction: [-1, 0, 0], sensitivity: 0.3 },
    { configKey: 'leftWrist.deviation', label: 'Uln',  direction: [1, 0, 0],  sensitivity: 0.3, scale: -1 },
  ],
  rightWrist: [
    { configKey: 'rightWrist.flexion',   label: 'Flex', direction: [0, 0, 1],  sensitivity: 0.4 },
    { configKey: 'rightWrist.flexion',   label: 'Ext',  direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
    { configKey: 'rightWrist.deviation', label: 'Rad',  direction: [1, 0, 0],  sensitivity: 0.3 },
    { configKey: 'rightWrist.deviation', label: 'Uln',  direction: [-1, 0, 0], sensitivity: 0.3, scale: -1 },
  ],
  pelvis: [
    { configKey: 'pelvis.tilt',      label: 'AntTilt',  direction: [0, 0, 1],      sensitivity: 0.3 },
    { configKey: 'pelvis.tilt',      label: 'PostTilt', direction: [0, 0, -1],     sensitivity: 0.3, scale: -1 },
    { configKey: 'pelvis.obliquity', label: 'Obl L',    direction: [-1, 0, 0],     sensitivity: 0.3 },
    { configKey: 'pelvis.obliquity', label: 'Obl R',    direction: [1, 0, 0],      sensitivity: 0.3, scale: -1 },
    { configKey: 'pelvis.rotation',  label: 'Rot L',    direction: [-0.7, 0, 0.7], sensitivity: 0.3 },
    { configKey: 'pelvis.rotation',  label: 'Rot R',    direction: [0.7, 0, 0.7],  sensitivity: 0.3, scale: -1 },
  ],
  // Spine: only DOFs that exist in the canonical registry are exposed.
  // (No spine.lateralFlexion key — see DOF_SPECS — so no LatFx arrows.)
  spine: [
    { configKey: 'spine.lumbarLordosis',   label: 'Flex',  direction: [0, 0, 1],  sensitivity: 0.3, scale: -1 },
    { configKey: 'spine.lumbarLordosis',   label: 'Ext',   direction: [0, 0, -1], sensitivity: 0.3 },
    { configKey: 'spine.thoracicRotation', label: 'Rot L', direction: [-1, 0, 0], sensitivity: 0.4 },
    { configKey: 'spine.thoracicRotation', label: 'Rot R', direction: [1, 0, 0],  sensitivity: 0.4, scale: -1 },
  ],
  neck: [
    { configKey: 'neck.flexion',        label: 'Flex',    direction: [0, 0, 1],      sensitivity: 0.3 },
    { configKey: 'neck.extension',      label: 'Ext',     direction: [0, 0, -1],     sensitivity: 0.3 },
    { configKey: 'neck.rotation',       label: 'Rot L',   direction: [-1, 0, 0],     sensitivity: 0.4 },
    { configKey: 'neck.rotation',       label: 'Rot R',   direction: [1, 0, 0],      sensitivity: 0.4, scale: -1 },
    { configKey: 'neck.lateralFlexion', label: 'LatFx L', direction: [-0.6, 0.6, 0], sensitivity: 0.3 },
    { configKey: 'neck.lateralFlexion', label: 'LatFx R', direction: [0.6, 0.6, 0],  sensitivity: 0.3, scale: -1 },
  ],
};

// Bone-segment morphology controls (Task #212).
// Anchored to the midpoint of the long bone, these arrows drive the
// "structural" DOFs that describe bone shape (anteversion / torsion)
// or limb alignment (genu varum/valgum, coxa vara/valga). They live in
// a separate registry from JOINT_MOVEMENT_DEFS so bone-morphology arrows
// never collide with joint-movement arrows for the adjacent joint.
export type BoneSegmentId =
  | 'leftFemur'  | 'rightFemur'
  | 'leftTibia'  | 'rightTibia'
  | 'leftHumerus' | 'rightHumerus';

export interface BoneSegmentSpec {
  id: BoneSegmentId;
  label: string;
  side: 'L' | 'R';
  proximalBone: string;
  distalBone: string;
  /** GLB bone names that resolve to this segment when the user clicks. */
  pickBones: string[];
  morphology: MovementArrowDef[];
}

export const BONE_SEGMENT_SPECS: BoneSegmentSpec[] = [
  {
    id: 'leftFemur', label: 'L Femur', side: 'L',
    proximalBone: 'Hip_L', distalBone: 'Knee_L',
    pickBones: ['Hip_L', 'HipPart1_L'],
    morphology: [
      { configKey: 'leftHip.anteversion',    label: 'Antev', direction: [0, 0, 1],  sensitivity: 0.4 },
      { configKey: 'leftHip.anteversion',    label: 'Retro', direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
      { configKey: 'leftHip.neckShaftAngle', label: 'Valga', direction: [-1, 0, 0], sensitivity: 0.4 },
      { configKey: 'leftHip.neckShaftAngle', label: 'Vara',  direction: [1, 0, 0],  sensitivity: 0.4, scale: -1 },
    ],
  },
  {
    id: 'rightFemur', label: 'R Femur', side: 'R',
    proximalBone: 'Hip_R', distalBone: 'Knee_R',
    pickBones: ['Hip_R', 'HipPart1_R'],
    morphology: [
      { configKey: 'rightHip.anteversion',    label: 'Antev', direction: [0, 0, 1],  sensitivity: 0.4 },
      { configKey: 'rightHip.anteversion',    label: 'Retro', direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
      { configKey: 'rightHip.neckShaftAngle', label: 'Valga', direction: [1, 0, 0],  sensitivity: 0.4 },
      { configKey: 'rightHip.neckShaftAngle', label: 'Vara',  direction: [-1, 0, 0], sensitivity: 0.4, scale: -1 },
    ],
  },
  {
    id: 'leftTibia', label: 'L Tibia', side: 'L',
    proximalBone: 'Knee_L', distalBone: 'Ankle_L',
    pickBones: ['Knee_L'],
    morphology: [
      { configKey: 'leftKnee.tibialTorsion', label: 'ExtTor', direction: [0, 0, 1],  sensitivity: 0.4 },
      { configKey: 'leftKnee.tibialTorsion', label: 'IntTor', direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
      { configKey: 'leftKnee.varus',         label: 'Valgus', direction: [-1, 0, 0], sensitivity: 0.4 },
      { configKey: 'leftKnee.varus',         label: 'Varus',  direction: [1, 0, 0],  sensitivity: 0.4, scale: -1 },
    ],
  },
  {
    id: 'rightTibia', label: 'R Tibia', side: 'R',
    proximalBone: 'Knee_R', distalBone: 'Ankle_R',
    pickBones: ['Knee_R'],
    morphology: [
      { configKey: 'rightKnee.tibialTorsion', label: 'ExtTor', direction: [0, 0, 1],  sensitivity: 0.4 },
      { configKey: 'rightKnee.tibialTorsion', label: 'IntTor', direction: [0, 0, -1], sensitivity: 0.4, scale: -1 },
      { configKey: 'rightKnee.varus',         label: 'Valgus', direction: [1, 0, 0],  sensitivity: 0.4 },
      { configKey: 'rightKnee.varus',         label: 'Varus',  direction: [-1, 0, 0], sensitivity: 0.4, scale: -1 },
    ],
  },
  {
    id: 'leftHumerus', label: 'L Humerus', side: 'L',
    proximalBone: 'Shoulder_L', distalBone: 'Elbow_L',
    pickBones: ['Shoulder_L', 'ShoulderPart1_L'],
    morphology: [
      { configKey: 'leftShoulder.retroversion', label: 'Retro', direction: [0, 0, -1], sensitivity: 0.4 },
      { configKey: 'leftShoulder.retroversion', label: 'Antev', direction: [0, 0, 1],  sensitivity: 0.4, scale: -1 },
    ],
  },
  {
    id: 'rightHumerus', label: 'R Humerus', side: 'R',
    proximalBone: 'Shoulder_R', distalBone: 'Elbow_R',
    pickBones: ['Shoulder_R', 'ShoulderPart1_R'],
    morphology: [
      { configKey: 'rightShoulder.retroversion', label: 'Retro', direction: [0, 0, -1], sensitivity: 0.4 },
      { configKey: 'rightShoulder.retroversion', label: 'Antev', direction: [0, 0, 1],  sensitivity: 0.4, scale: -1 },
    ],
  },
];

const BONE_SEGMENT_BY_PICK_BONE: Record<string, BoneSegmentSpec> = (() => {
  const m: Record<string, BoneSegmentSpec> = {};
  for (const spec of BONE_SEGMENT_SPECS) {
    for (const b of spec.pickBones) m[b] = spec;
  }
  return m;
})();

const BONE_SEGMENT_BY_ID: Record<BoneSegmentId, BoneSegmentSpec> = (() => {
  const m = {} as Record<BoneSegmentId, BoneSegmentSpec>;
  for (const spec of BONE_SEGMENT_SPECS) m[spec.id] = spec;
  return m;
})();

function getJointKeyFromBone(boneName: string): string | null {
  const cfg = POSE_BONE_MAP[boneName];
  if (!cfg) return null;
  return cfg.configKey.split('.')[0];
}

export default function PureThreeGLBViewer({ 
  modelPath = '/models/rigged-skeleton.glb',
  modelConfig,
  className = '',
  animationState,
  onAnimationProgress,
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
  skeletonMode = 'posture',
  activeCapacities = null,
  onActiveMovementAttempt,
  onPainfulArcFlare,
  selectedBoneSegmentId: selectedBoneSegmentIdProp,
  onSelectedBoneSegmentChange,
  enableZoomTool = false,
  onLandmarkSelect,
  forceOverlay = null,
  bodyWeightKg = 70,
  selectedForceJoint = null,
  onForceJointSelect,
  enableMuscleInteraction = false,
  onMuscleGroupClick,
  highlightMuscleGroups,
  muscleHighlightColors,
  environmentPreset = 'clinical_dark',
  fascialChainVisualization,
  onChainNodeClick,
  scarMarkers = [],
  adhesionBands = [],
  onScarMarkerClick,
  onSkeletonClick,
  enableSkeletonClick = false,
  treatmentBoneNames,
  onBoneScreenPositions,
  dermatomeHighlightBones,
  nerveRootLabels,
  referralZoneBones,
  tissueViewOverlay,
  onTissueBoneClick,
  biomechanicsFaultHighlights,
  tissueIntelligenceHighlights,
  slingPathwayVisualization,
  onSlingLabelClick,
  onModelLoadProgress,
  onModelReady,
  onModelLoadError,
  goalStateOverlay = null,
}: PureThreeGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'checking' | 'loading' | 'ready' | 'error'>('checking');
  // Bumps when the GLB model finishes loading so dependent effects (e.g. tissue overlays)
  // re-run once bones become available — guarantees first-load rendering when highlights
  // were already provided before the model was ready.
  const [modelReadyTick, setModelReadyTick] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const bonesRef = useRef<{ [name: string]: THREE.Object3D }>({});
  const initialRotationsRef = useRef<{ [name: string]: THREE.Euler }>({});
  const bindPoseQuaternionsRef = useRef<{ [name: string]: THREE.Quaternion }>({});
  const sliderRotationsRef = useRef<{ [boneName: string]: { x: number; y: number; z: number } }>({});
  const clavicleOffsetsRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const legIKStateRef = useRef<LegIKState | null>(null);
  const modelScaleRef = useRef<number>(0.02);
  const footGroundDebugRef = useRef<number>(0);
  const forceVisualizationRef = useRef<ForceVisualizationManager | null>(null);
  const muscleVisualizationRef = useRef<MuscleVisualizationManager | null>(null);
  const muscleLayerManagerRef = useRef<MuscleLayerManager | null>(null);
  const muscleMeshesRef = useRef<THREE.Object3D[]>([]);
  const hiddenGeometryCacheRef = useRef<Map<string, { attrs: Record<string, { array: ArrayLike<number>; itemSize: number; normalized: boolean }>; index: { array: ArrayLike<number>; itemSize: number } | null; boundingSphere: THREE.Sphere | null }>>(new Map());
  const splitMuscleGroupsRef = useRef<Map<string, SplitMuscleGroup>>(new Map());
  const muscleHitProxiesRef = useRef<{ mesh: THREE.Mesh; groupId: string }[]>([]);
  const muscleGroupCentersRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const animationConstraintsRef = useRef<AnimationConstraint[]>([]);
  const animationProgressRef = useRef<{ callback: ((p: number) => void) | undefined; lastReport: number }>({ callback: onAnimationProgress, lastReport: 0 });
  animationProgressRef.current.callback = onAnimationProgress;
  const livePoseActiveRef = useRef<boolean>(false);
  const defaultShoulderAnglesRef = useRef<{ left: { flexionRad: number; abductionRad: number; intRotRad: number; extRotRad: number; retroversionRad: number }; right: { flexionRad: number; abductionRad: number; intRotRad: number; extRotRad: number; retroversionRad: number } } | null>(null);
  const animationPlayingRef = useRef<boolean>(false);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const highlightedMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; originalEmissive: THREE.Color; originalIntensity: number }[]>>(new Map());
  const biomechanicalHighlightRef = useRef<{ mesh: THREE.Mesh; origMaterial: THREE.Material; wasVisible: boolean }[]>([]);
  const highlightOverlaysRef = useRef<THREE.Mesh[]>([]);
  const chainHighlightOverlaysRef = useRef<THREE.Mesh[]>([]);
  const tissueOverlayGroupRef = useRef<THREE.Group | null>(null);
  const tissueFadedMaterialsRef = useRef<Array<{ mesh: THREE.Mesh; origMaterial: THREE.Material | THREE.Material[] }>>([]);
  const tissueOverlayUpdatersRef = useRef<Array<() => void>>([]);
  const tissueOverlayRafRef = useRef<number | null>(null);
  const fascialChainGroupRef = useRef<THREE.Group | null>(null);
  const slingPathwayGroupRef = useRef<THREE.Group | null>(null);
  const slingLabelSpritesRef = useRef<THREE.Sprite[]>([]);
  const onSlingLabelClickRef = useRef(onSlingLabelClick);
  onSlingLabelClickRef.current = onSlingLabelClick;
  const scarMarkerGroupRef = useRef<THREE.Group | null>(null);
  const onScarMarkerClickRef = useRef(onScarMarkerClick);
  onScarMarkerClickRef.current = onScarMarkerClick;
  const onChainNodeClickRef = useRef(onChainNodeClick);
  onChainNodeClickRef.current = onChainNodeClick;
  const onSkeletonClickRef = useRef(onSkeletonClick);
  onSkeletonClickRef.current = onSkeletonClick;
  const onTissueBoneClickRef = useRef(onTissueBoneClick);
  onTissueBoneClickRef.current = onTissueBoneClick;
  const enableSkeletonClickRef = useRef(enableSkeletonClick);
  enableSkeletonClickRef.current = enableSkeletonClick;
  const onBoneScreenPositionsRef = useRef(onBoneScreenPositions);
  onBoneScreenPositionsRef.current = onBoneScreenPositions;
  const treatmentBoneNamesRef = useRef(treatmentBoneNames);
  treatmentBoneNamesRef.current = treatmentBoneNames;
  const treatmentFrameCounter = useRef(0);
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
  // External bone-segment selection wiring (Task #212). The pose-mode
  // useEffect reads from selectedBoneSegmentExternalRef each frame so the
  // 3D selection tracks an externally-controlled value (e.g. from
  // JointAngleEditor's bone chips), and reports back via the change ref.
  const selectedBoneSegmentExternalRef = useRef<BoneSegmentId | null | undefined>(selectedBoneSegmentIdProp);
  selectedBoneSegmentExternalRef.current = selectedBoneSegmentIdProp;
  const onSelectedBoneSegmentChangeRef = useRef(onSelectedBoneSegmentChange);
  onSelectedBoneSegmentChangeRef.current = onSelectedBoneSegmentChange;
  // Set inside the pose-mode useEffect so a prop-driven effect can call it
  // without re-mounting the whole pose-mode setup.
  const applyExternalBoneSelectionRef = useRef<((next: BoneSegmentId | null | undefined) => void) | null>(null);
  const modelConfigRef = useRef(modelConfig);
  modelConfigRef.current = modelConfig;
  const [poseModeTooltip, setPoseModeTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const [movementSelectedJoint, setMovementSelectedJoint] = useState<{ key: string; x: number; y: number } | null>(null);
  const [painToast, setPainToast] = useState<{ angle: number; intensity: number; movement: string; expiresAt: number } | null>(null);
  const lastPainfulArcStateRef = useRef<boolean>(false);
  const [movementMuscleActivation, setMovementMuscleActivation] = useState<MuscleActivationLevels | null>(null);
  const poseDragRef = useRef<{
    configKey: string;
    startX: number;
    startY: number;
    startValue: number;
    screenDirX: number;
    screenDirY: number;
    scale: number;
    sensitivity: number;
    label: string;
    min: number;
    max: number;
    activeRow?: {
      activeRomMin: number;
      activeRomMax: number;
      passiveRomMax: number;
      painfulArc?: { start: number; end: number; intensity: number } | null;
      painInhibitionFactor?: number;
    } | null;
    lastValue?: number;
    attemptedExceeded?: boolean;
    lastPainfulArc?: boolean;
    compensationsTriggered?: string[];
    /** Snapshot of pre-drag values for the primary configKey + each
     * compensation-chain target — used by Movement Mode hold-to-test
     * spring-back on mouseUp (Task #319). `undefined` means no
     * spring-back (e.g. Posture Mode, or this joint is double-click
     * locked in Movement Mode). */
    springBackValues?: Record<string, number>;
  } | null>(null);
  // Movement Mode hold-to-test (Task #319): joints whose primary configKey
  // is in this set are exempt from spring-back when the user releases the
  // mouse — the value persists like Posture Mode. Toggle via double-click.
  const [lockedMovementConfigKeys, setLockedMovementConfigKeys] = useState<Set<string>>(() => new Set());
  const lockedMovementConfigKeysRef = useRef(lockedMovementConfigKeys);
  lockedMovementConfigKeysRef.current = lockedMovementConfigKeys;
  const skeletonModeRef = useRef(skeletonMode);
  skeletonModeRef.current = skeletonMode;
  const activeCapacitiesRef = useRef(activeCapacities);
  activeCapacitiesRef.current = activeCapacities;
  const onActiveMovementAttemptRef = useRef(onActiveMovementAttempt);
  onActiveMovementAttemptRef.current = onActiveMovementAttempt;
  const onPainfulArcFlareRef = useRef(onPainfulArcFlare);
  onPainfulArcFlareRef.current = onPainfulArcFlare;
  const movementSettleTimerRef = useRef<number | null>(null);
  const pendingMovementAttemptRef = useRef<Parameters<NonNullable<typeof onActiveMovementAttempt>>[0] | null>(null);
  // Task #321: per-frame screen-projected anchor for the currently-selected
  // Movement Mode joint, so the slider HUD chip follows the camera without
  // forcing the whole viewer to re-render on every frame. Updated inside
  // animateGlows; nulled when no joint is selected or mode != 'movement'.
  const selectedJointAnchorRef = useRef<{ x: number; y: number } | null>(null);
  // Task #321: imperative API exposed by the THREE setup so the slider HUD
  // can drive the same poseDragRef pipeline as the 3D arrow drag (constraint,
  // friction, painful arc, exceeded-limit, compensation chain, spring-back,
  // movement-attempt settle).
  const sliderHudApiRef = useRef<{
    getCurrentValue: (configKey: string) => number;
    beginDrag: (configKey: string) => void;
    applyValue: (configKey: string, targetRaw: number) => void;
    endDrag: () => void;
    /** Task #322: imperative dismiss for the slider HUD. */
    deselect: () => void;
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

    const mergedHighlights = [
      ...(highlightBoneNames ?? []),
      ...(biomechanicsFaultHighlights ?? []).map(h => ({ boneName: h.boneName, color: h.color, intensity: h.intensity, glowSize: 0.15 })),
    ];
    if (mergedHighlights.length === 0 || !model) return;

    model.updateMatrixWorld(true);

    const bones: Record<string, THREE.Object3D> = {};
    model.traverse((child) => {
      if ((child as any).isBone || child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });

    for (const highlight of mergedHighlights) {
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
      const isMechanismGlow = glowSize > 0.25 && highlight.color === 0xff6b35;
      if (isMechanismGlow) {
        glowMesh.userData.isMechanismPulse = true;
        glowMesh.userData.baseOpacity = intensity * 0.5;
        glowMesh.userData.baseScale = 1.0;
      }
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
      if (isMechanismGlow) {
        outerGlow.userData.isMechanismPulse = true;
        outerGlow.userData.baseOpacity = intensity * 0.15;
        outerGlow.userData.baseScale = 1.0;
      }
      scene.add(outerGlow);
      chainHighlightOverlaysRef.current.push(outerGlow);
    }
  }, [highlightBoneNames, biomechanicsFaultHighlights]);

  useEffect(() => {
    const overlays = chainHighlightOverlaysRef.current;
    const hasPulse = overlays.some(m => m.userData.isMechanismPulse);
    if (!hasPulse) return;

    let pulseFrameId: number;
    const animatePulse = () => {
      const t = performance.now() / 1000;
      for (const mesh of overlays) {
        if (!mesh.userData.isMechanismPulse) continue;
        const pulse = 0.6 + Math.sin(t * 2.5) * 0.4;
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity = mesh.userData.baseOpacity * pulse;
        }
        const scale = 1.0 + Math.sin(t * 2.5) * 0.15;
        mesh.scale.setScalar(scale);
      }
      pulseFrameId = requestAnimationFrame(animatePulse);
    };
    pulseFrameId = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(pulseFrameId);
  }, [highlightBoneNames, biomechanicsFaultHighlights]);

  // Tissue-specific procedural overlays — replaces the generic "inflammation cloud".
  // Renders tissue-anchored geometry (tubes for tendons/ligaments, polylines for nerves,
  // rings for joints/labrum/menisci, spheres for focal points, sheets for fascia/retinacula)
  // and fades superficial muscles when a deep tissue is highlighted.
  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;

    const cleanupGroup = tissueOverlayGroupRef.current;
    if (cleanupGroup) {
      cleanupGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
      scene.remove(cleanupGroup);
      tissueOverlayGroupRef.current = null;
    }
    for (const entry of tissueFadedMaterialsRef.current) {
      const cur = entry.mesh.material;
      entry.mesh.material = entry.origMaterial;
      if (cur && cur !== entry.origMaterial) {
        if (Array.isArray(cur)) cur.forEach(m => m.dispose());
        else (cur as THREE.Material).dispose();
      }
    }
    tissueFadedMaterialsRef.current = [];
    tissueOverlayUpdatersRef.current = [];
    if (tissueOverlayRafRef.current != null) {
      cancelAnimationFrame(tissueOverlayRafRef.current);
      tissueOverlayRafRef.current = null;
    }

    if (!tissueIntelligenceHighlights || tissueIntelligenceHighlights.length === 0 || !model) return;

    model.updateMatrixWorld(true);
    const bRef = bonesRef.current;
    const overlayGroup = new THREE.Group();
    overlayGroup.name = '__tissue_overlay_group';
    overlayGroup.renderOrder = 990;
    scene.add(overlayGroup);
    tissueOverlayGroupRef.current = overlayGroup;

    // Resolve a bone's world position, applying any offset in the bone's LOCAL frame
    // (so offsets follow the bone's rotation as the skeleton animates rather than
    // drifting along world axes).
    const worldOf = (boneName: string, offset?: [number, number, number]): THREE.Vector3 | null => {
      const b = bRef[boneName];
      if (!b) return null;
      if (!offset) {
        const v = new THREE.Vector3();
        b.getWorldPosition(v);
        return v;
      }
      const local = new THREE.Vector3(offset[0], offset[1], offset[2]);
      return b.localToWorld(local);
    };
    const worldQuatOf = (boneName: string): THREE.Quaternion | null => {
      const b = bRef[boneName];
      if (!b) return null;
      const q = new THREE.Quaternion();
      b.getWorldQuaternion(q);
      return q;
    };

    const buildLabelSprite = (text: string, color: number): THREE.Sprite | null => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const css = '#' + color.toString(16).padStart(6, '0');
      ctx.fillStyle = 'rgba(15,15,25,0.85)';
      ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 10); ctx.fill();
      ctx.strokeStyle = css; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 10); ctx.stroke();
      ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const short = text.length > 26 ? text.slice(0, 24) + '…' : text;
      ctx.fillText(short, 128, 32);
      const tex = new THREE.CanvasTexture(canvas); tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.14, 0.035, 1);
      sp.renderOrder = 999;
      return sp;
    };

    let anyDeep = false;

    for (const h of tissueIntelligenceHighlights) {
      if (h.isDeep) anyDeep = true;
      const recipe = TISSUE_ANCHOR_CATALOGUE[h.tissueId];
      const palette = paletteForState(h.healingStage, h.irritability, h.severity);
      const color = palette.color;
      const opacity = palette.opacity;
      const emissive = palette.emissive;

      const matFactory = () => new THREE.MeshStandardMaterial({
        color, emissive: new THREE.Color(color), emissiveIntensity: emissive,
        transparent: true, opacity, depthWrite: false, depthTest: true,
        roughness: 0.4, metalness: 0.1,
      });

      let anchorPos: THREE.Vector3 | null = null;
      const built: THREE.Object3D[] = [];

      // Each primitive registers an updater so its transform tracks live bone positions
      // every frame. Geometry is built once; only position/rotation/scale are updated.
      const updaters = tissueOverlayUpdatersRef.current;
      let labelAnchorFn: (() => THREE.Vector3 | null) | null = null;

      const addTubeBetween = (from: string, to: string, radius: number, fromOff?: [number, number, number], toOff?: [number, number, number], asSheet?: number) => {
        const a0 = worldOf(from, fromOff); const b0 = worldOf(to, toOff);
        if (!a0 || !b0 || a0.distanceTo(b0) < 1e-4) return null;
        const geo = asSheet
          ? new THREE.PlaneGeometry(asSheet, 1)
          : new THREE.CylinderGeometry(radius, radius, 1, 12, 1, true);
        const mat = matFactory();
        if (asSheet) mat.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(geo, mat);
        const update = () => {
          const a = worldOf(from, fromOff); const b = worldOf(to, toOff);
          if (!a || !b) { mesh.visible = false; return; }
          const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
          if (len < 1e-4) { mesh.visible = false; return; }
          mesh.visible = true;
          mesh.position.copy(a).add(b).multiplyScalar(0.5);
          mesh.scale.set(1, len, 1);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        };
        update(); updaters.push(update);
        built.push(mesh);
        return new THREE.Vector3().addVectors(a0, b0).multiplyScalar(0.5);
      };

      // Single-bone primitives (rings/spheres). The mesh's local rotation (from axis hints)
      // is captured once and re-applied on top of the bone's world quaternion every frame
      // so the ring stays oriented relative to the moving bone.
      const addAtBone = (bone: string, offset: [number, number, number] | undefined, mesh: THREE.Mesh) => {
        const c0 = worldOf(bone, offset);
        if (!c0) return null;
        const localRot = mesh.quaternion.clone();
        const update = () => {
          const c = worldOf(bone, offset);
          if (!c) { mesh.visible = false; return; }
          mesh.visible = true;
          mesh.position.copy(c);
          const q = worldQuatOf(bone);
          if (q) mesh.quaternion.copy(q).multiply(localRot);
        };
        update(); updaters.push(update);
        built.push(mesh);
        return c0;
      };

      if (recipe) {
        const s = recipe.shape;
        if (s.kind === 'tube_between') {
          const mid = addTubeBetween(s.from, s.to, s.radius, s.fromOffset, s.toOffset);
          if (mid) {
            anchorPos = mid;
            labelAnchorFn = () => {
              const a = worldOf(s.from, s.fromOffset); const b = worldOf(s.to, s.toOffset);
              return (a && b) ? a.clone().add(b).multiplyScalar(0.5) : null;
            };
          }
        } else if (s.kind === 'polyline') {
          for (let i = 0; i < s.bones.length - 1; i++) {
            addTubeBetween(s.bones[i], s.bones[i + 1], s.thickness, s.offset, s.offset);
          }
          const midBone = s.bones[Math.floor(s.bones.length / 2)];
          labelAnchorFn = () => worldOf(midBone, s.offset);
          anchorPos = labelAnchorFn();
        } else if (s.kind === 'sheet') {
          const mid = addTubeBetween(s.from, s.to, 0, s.offset, s.offset, s.width);
          if (mid) {
            anchorPos = mid;
            labelAnchorFn = () => {
              const a = worldOf(s.from, s.offset); const b = worldOf(s.to, s.offset);
              return (a && b) ? a.clone().add(b).multiplyScalar(0.5) : null;
            };
          }
        } else if (s.kind === 'ring' || s.kind === 'crescent') {
          const isCrescent = s.kind === 'crescent';
          const arc = isCrescent ? (s.arc ?? Math.PI) : Math.PI * 2;
          const ringOffset = s.kind === 'ring' ? s.offset : undefined;
          const geo = new THREE.TorusGeometry(s.radius, s.thickness, 10, isCrescent ? 24 : 32, arc);
          const mesh = new THREE.Mesh(geo, matFactory());
          if (s.axis === 'x') mesh.rotation.y = Math.PI / 2;
          else if (s.axis === 'z') mesh.rotation.x = Math.PI / 2;
          const c0 = addAtBone(s.at, ringOffset, mesh);
          if (c0) { anchorPos = c0; labelAnchorFn = () => worldOf(s.at, ringOffset); }
        } else if (s.kind === 'sphere_at') {
          const geo = new THREE.SphereGeometry(s.radius, 16, 12);
          const mesh = new THREE.Mesh(geo, matFactory());
          const c0 = addAtBone(s.at, s.offset, mesh);
          if (c0) { anchorPos = c0; labelAnchorFn = () => worldOf(s.at, s.offset); }
        }
      }

      // Fallback: no catalogue recipe (or none built). Drop a labelled generic ring on the
      // first available bone. PhysioGPT additionally emits a bone-glow entry through the
      // highlightBoneNames pipeline so visibility never regresses for catalogue gaps.
      if (built.length === 0) {
        for (const bn of h.bones) {
          const c0 = worldOf(bn);
          if (!c0) continue;
          const geo = new THREE.TorusGeometry(0.045, 0.006, 8, 24);
          const mesh = new THREE.Mesh(geo, matFactory());
          built.push(mesh);
          const update = () => {
            const c = worldOf(bn);
            if (!c) { mesh.visible = false; return; }
            mesh.visible = true; mesh.position.copy(c);
          };
          update(); updaters.push(update);
          labelAnchorFn = () => worldOf(bn);
          anchorPos = c0;
          break;
        }
      }

      for (const obj of built) {
        obj.userData.tissueId = h.tissueId;
        obj.renderOrder = 990;
        overlayGroup.add(obj);
      }

      if (anchorPos && labelAnchorFn) {
        const sprite = buildLabelSprite(`${h.label} · ${palette.stageLabel}`, color);
        if (sprite) {
          sprite.position.copy(anchorPos).add(new THREE.Vector3(0, 0.06, 0));
          overlayGroup.add(sprite);
          const lf = labelAnchorFn;
          const upd = () => { const p = lf(); if (p) sprite.position.copy(p).add(new THREE.Vector3(0, 0.06, 0)); };
          updaters.push(upd);
        }
      }
    }

    // Trigger pips — small flashing spheres that appear on bones whose current pose
    // matches an aggravator predicate, so the user can SEE which scenarios the
    // highlighted tissue would dislike.
    type PipEntry = {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      anchor: string;
      evaluate: () => boolean;
    };
    const pipEntries: PipEntry[] = [];

    const worldPos = (boneName: string): THREE.Vector3 | null => {
      const b = bRef[boneName];
      if (!b) return null;
      const v = new THREE.Vector3();
      b.getWorldPosition(v);
      return v;
    };
    const angleAtVertex = (a: string, b: string, c: string): number | null => {
      const A = worldPos(a); const B = worldPos(b); const C = worldPos(c);
      if (!A || !B || !C) return null;
      const v1 = A.clone().sub(B); const v2 = C.clone().sub(B);
      if (v1.lengthSq() < 1e-6 || v2.lengthSq() < 1e-6) return null;
      return THREE.MathUtils.radToDeg(v1.angleTo(v2));
    };
    // Deviation (in degrees) of the from->to bone vector from world up.
    // For an upright skeleton, Root_M->Spine1_M and Neck_M->Head_M point up, so
    // neutral posture returns ~0° and any tilt/lean grows the value.
    const verticalDeviation = (from: string, to: string): number | null => {
      const A = worldPos(from); const B = worldPos(to);
      if (!A || !B) return null;
      const dir = B.clone().sub(A);
      if (dir.lengthSq() < 1e-6) return null;
      return THREE.MathUtils.radToDeg(dir.angleTo(new THREE.Vector3(0, 1, 0)));
    };

    const evalPredicate = (
      p: NonNullable<NonNullable<typeof tissueIntelligenceHighlights>[number]['aggravators']>[number]['predicate']
    ): boolean => {
      if (!p) return false;
      switch (p.kind) {
        case 'always': return true;
        case 'shoulderAbductionAbove': {
          const a = angleAtVertex(`Hip_${p.side}`, `Shoulder_${p.side}`, `Elbow_${p.side}`);
          return a != null && a > p.threshold;
        }
        case 'kneeFlexionAbove': {
          const a = angleAtVertex(`Hip_${p.side}`, `Knee_${p.side}`, `Ankle_${p.side}`);
          return a != null && (180 - a) > p.threshold;
        }
        case 'kneeFlexionBelow': {
          const a = angleAtVertex(`Hip_${p.side}`, `Knee_${p.side}`, `Ankle_${p.side}`);
          return a != null && (180 - a) < p.threshold;
        }
        case 'hipFlexionAbove': {
          const a = angleAtVertex('Spine1_M', `Hip_${p.side}`, `Knee_${p.side}`);
          return a != null && (180 - a) > p.threshold;
        }
        case 'spineFlexionAbove': {
          const a = angleAtVertex('Root_M', 'Spine1_M', 'Neck_M');
          // At rest a ≈ 180; flexion forward decreases it.
          return a != null && (180 - a) > p.threshold;
        }
        case 'spineExtensionAbove': {
          // Trunk deviation from upright (lumbar facet load grows with extension/lean)
          const tilt = verticalDeviation('Root_M', 'Spine1_M');
          return tilt != null && tilt > p.threshold;
        }
        case 'forwardHeadAbove': {
          // Head-vector deviation from upright; neutral ≈ 0, forward-head grows
          const a = verticalDeviation('Neck_M', 'Head_M');
          return a != null && a > p.threshold;
        }
      }
    };

    for (const h of tissueIntelligenceHighlights) {
      if (!h.aggravators) continue;
      const palette = paletteForState(h.healingStage, h.irritability, h.severity);
      // Scale pip size + max-opacity by irritability so high-irritability tissues
      // produce more visually obvious triggers.
      const irrScale = h.irritability === 'high' ? 1.6 : h.irritability === 'moderate' ? 1.2 : 1.0;
      const pipRadius = 0.018 * irrScale;
      const opacityCap = Math.min(1, 0.55 + (h.irritability === 'high' ? 0.4 : h.irritability === 'moderate' ? 0.25 : 0.1));
      for (const ag of h.aggravators) {
        if (!ag.predicate || !ag.boneAnchor) continue;
        const anchorPos0 = worldPos(ag.boneAnchor);
        if (!anchorPos0) continue;
        const geo = new THREE.SphereGeometry(pipRadius, 12, 10);
        const mat = new THREE.MeshBasicMaterial({
          color: palette.color,
          transparent: true,
          opacity: 0,
          depthTest: false,
          depthWrite: false,
        });
        const pip = new THREE.Mesh(geo, mat);
        pip.renderOrder = 998;
        pip.position.copy(anchorPos0).add(new THREE.Vector3(0, 0.04, 0));
        pip.userData.tissueId = h.tissueId;
        pip.userData.aggravator = ag.label;
        pip.userData.opacityCap = opacityCap;
        overlayGroup.add(pip);
        const anchorBone = ag.boneAnchor;
        const predicate = ag.predicate;
        pipEntries.push({
          mesh: pip,
          mat,
          anchor: anchorBone,
          evaluate: () => evalPredicate(predicate),
        });
      }
    }

    // Per-frame transform updater — keeps every primitive glued to its bone(s) as the
    // skeleton animates, and flashes trigger pips whose predicate currently matches.
    const tick = () => {
      const updaters = tissueOverlayUpdatersRef.current;
      for (let i = 0; i < updaters.length; i++) updaters[i]();
      const tNow = performance.now();
      const flash = 0.55 + 0.45 * Math.sin(tNow * 0.012);
      for (const e of pipEntries) {
        const pos = worldPos(e.anchor);
        if (pos) e.mesh.position.copy(pos).add(new THREE.Vector3(0, 0.04, 0));
        const active = e.evaluate();
        const cap = (e.mesh.userData.opacityCap as number | undefined) ?? 1;
        e.mat.opacity = active ? flash * cap : 0;
        e.mesh.visible = active;
      }
      tissueOverlayRafRef.current = requestAnimationFrame(tick);
    };
    tissueOverlayRafRef.current = requestAnimationFrame(tick);

    // Auto deep-tissue fade — when any highlighted tissue is deep, drop superficial muscle
    // groups to ~0.25 opacity so the deep structures aren't occluded.
    if (anyDeep && splitMuscleGroupsRef.current.size > 0) {
      for (const [groupId, group] of Array.from(splitMuscleGroupsRef.current.entries())) {
        const isSuperficial = SUPERFICIAL_MUSCLE_PATTERNS.some(p => groupId.toLowerCase().includes(p));
        if (!isSuperficial) continue;
        for (const mesh of group.meshes) {
          if (!(mesh instanceof THREE.Mesh)) continue;
          const orig = mesh.material;
          if (Array.isArray(orig)) continue;
          const cloned = (orig as THREE.MeshStandardMaterial).clone();
          cloned.transparent = true;
          cloned.opacity = 0.25;
          cloned.depthWrite = false;
          cloned.needsUpdate = true;
          tissueFadedMaterialsRef.current.push({ mesh, origMaterial: orig });
          mesh.material = cloned;
        }
      }
    }
    return () => {
      if (tissueOverlayRafRef.current != null) {
        cancelAnimationFrame(tissueOverlayRafRef.current);
        tissueOverlayRafRef.current = null;
      }
      tissueOverlayUpdatersRef.current = [];
      const grp = tissueOverlayGroupRef.current;
      if (grp) {
        grp.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) child.material.dispose();
          }
          if (child instanceof THREE.Sprite) {
            child.material.map?.dispose();
            child.material.dispose();
          }
        });
        scene.remove(grp);
        tissueOverlayGroupRef.current = null;
      }
      for (const entry of tissueFadedMaterialsRef.current) {
        const cur = entry.mesh.material;
        entry.mesh.material = entry.origMaterial;
        if (cur && cur !== entry.origMaterial) {
          if (Array.isArray(cur)) cur.forEach(m => m.dispose());
          else (cur as THREE.Material).dispose();
        }
      }
      tissueFadedMaterialsRef.current = [];
    };
  }, [tissueIntelligenceHighlights, modelReadyTick]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;

    if (fascialChainGroupRef.current) {
      fascialChainGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      scene.remove(fascialChainGroupRef.current);
      fascialChainGroupRef.current = null;
    }

    if (!fascialChainVisualization?.enabled || !model) return;
    if (fascialChainVisualization.activeChains.length === 0) return;

    model.updateMatrixWorld(true);

    const bones: Record<string, THREE.Object3D> = {};
    model.traverse((child) => {
      if ((child as any).isBone || child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });

    const group = new THREE.Group();
    group.userData.isFascialChainGroup = true;

    const painChains = fascialChainVisualization.painHighlightChains || [];
    const showProp = fascialChainVisualization.showPropagation || false;
    const propDeltas = fascialChainVisualization.propagationDeltas || {};
    const time = Date.now() * 0.001;

    for (const chain of fascialChainVisualization.chains) {
      if (!fascialChainVisualization.activeChains.includes(chain.id)) continue;

      const isPainChain = painChains.includes(chain.id);
      const positions: THREE.Vector3[] = [];
      const tensionValues: number[] = [];
      const muscleIds: string[] = [];

      for (const link of chain.links) {
        const boneName = MUSCLE_BONE_POSITIONS[link.muscleId];
        if (!boneName || !bones[boneName]) continue;
        const worldPos = new THREE.Vector3();
        bones[boneName].getWorldPosition(worldPos);
        positions.push(worldPos);
        const tension = fascialChainVisualization.tensions[link.muscleId] ?? 50;
        tensionValues.push(tension);
        muscleIds.push(link.muscleId);
      }

      if (positions.length < 2) continue;

      const chainColor = new THREE.Color(chain.color);

      const avgTension = tensionValues.reduce((a, b) => a + b, 0) / tensionValues.length;
      const tensionIntensity = Math.abs(avgTension - 50) / 50;

      const curvePoints: THREE.Vector3[] = [];
      for (let i = 0; i < positions.length - 1; i++) {
        const start = positions[i];
        const end = positions[i + 1];
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          curvePoints.push(new THREE.Vector3().lerpVectors(start, end, t));
        }
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const lineOpacity = isPainChain ? 0.6 + tensionIntensity * 0.4 : 0.3 + tensionIntensity * 0.5;
      const lineMat = new THREE.LineBasicMaterial({
        color: isPainChain ? new THREE.Color('#ff4444') : chainColor,
        transparent: true,
        opacity: lineOpacity,
        linewidth: 1,
        depthTest: true,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 990;
      group.add(line);

      if (isPainChain) {
        const pulseGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const pulseMat = new THREE.LineBasicMaterial({
          color: new THREE.Color('#ff0000'),
          transparent: true,
          opacity: 0.3,
          linewidth: 1,
          depthTest: true,
          depthWrite: false,
        });
        const pulseLine = new THREE.Line(pulseGeo, pulseMat);
        pulseLine.renderOrder = 992;
        pulseLine.userData = { type: 'pulseLine' };
        group.add(pulseLine);
      }

      for (let i = 0; i < positions.length; i++) {
        const tension = tensionValues[i];
        const deviation = Math.abs(tension - 50) / 50;
        const nodeSize = 0.012 + deviation * 0.02;
        const nodeGeo = new THREE.SphereGeometry(nodeSize, 10, 8);
        const nodeColor = isPainChain ? new THREE.Color('#ff4444') : chainColor;
        const nodeMat = new THREE.MeshBasicMaterial({
          color: nodeColor,
          transparent: true,
          opacity: 0.25 + deviation * 0.35,
          depthWrite: false,
        });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.copy(positions[i]);
        node.renderOrder = 991;
        node.userData = {
          type: 'chainNode',
          chainId: chain.id,
          muscleId: muscleIds[i],
          chainName: chain.name,
        };
        group.add(node);

        if (showProp && muscleIds[i]) {
          const delta = propDeltas[muscleIds[i]] ?? 0;
          if (Math.abs(delta) > 1) {
            const propSize = 0.015 + Math.min(Math.abs(delta) / 30, 1) * 0.025;
            const propGeo = new THREE.RingGeometry(propSize, propSize + 0.005, 16);
            const propMat = new THREE.MeshBasicMaterial({
              color: delta > 0 ? new THREE.Color('#ff6b6b') : new THREE.Color('#4ecdc4'),
              transparent: true,
              opacity: 0.3 + Math.sin(time * 4 + i) * 0.2,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            const propRing = new THREE.Mesh(propGeo, propMat);
            propRing.position.copy(positions[i]);
            propRing.renderOrder = 993;
            group.add(propRing);
          }
        }

        if (deviation > 0.3) {
          const glowGeo = new THREE.SphereGeometry(nodeSize * 2.5, 8, 6);
          const glowMat = new THREE.MeshBasicMaterial({
            color: isPainChain ? new THREE.Color('#ff0000') : chainColor,
            transparent: true,
            opacity: deviation * 0.2,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.copy(positions[i]);
          glow.renderOrder = 989;
          group.add(glow);
        }
      }

      for (let i = 0; i < positions.length - 1; i++) {
        const segTension = (tensionValues[i] + tensionValues[i + 1]) / 2;
        const segDeviation = Math.abs(segTension - 50) / 50;
        if (segDeviation > 0.25 || isPainChain) {
          const effDeviation = isPainChain ? Math.max(segDeviation, 0.3) : segDeviation;
          const mid = new THREE.Vector3().lerpVectors(positions[i], positions[i + 1], 0.5);
          const tubeRadius = 0.004 + effDeviation * 0.008;
          const dir = new THREE.Vector3().subVectors(positions[i + 1], positions[i]);
          const segLen = dir.length();
          const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, segLen, 6, 1);
          const tubeMat = new THREE.MeshBasicMaterial({
            color: isPainChain ? new THREE.Color('#ff4444') : chainColor,
            transparent: true,
            opacity: 0.08 + effDeviation * 0.18,
            depthWrite: false,
          });
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          tube.position.copy(mid);
          dir.normalize();
          const up = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
          tube.setRotationFromQuaternion(quat);
          tube.renderOrder = 988;
          group.add(tube);
        }

        if (showProp && i < muscleIds.length - 1) {
          const srcDelta = Math.abs(propDeltas[muscleIds[i]] ?? 0);
          const tgtDelta = Math.abs(propDeltas[muscleIds[i + 1]] ?? 0);
          if (srcDelta > 2 || tgtDelta > 2) {
            const flowGeo = new THREE.SphereGeometry(0.012, 6, 4);
            const flowMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color('#ffdd57'),
              transparent: true,
              opacity: 0.6,
              depthWrite: false,
            });
            const flowDot = new THREE.Mesh(flowGeo, flowMat);
            flowDot.position.copy(positions[i]);
            flowDot.renderOrder = 994;
            flowDot.userData = { type: 'flowDot', startPos: positions[i].clone(), endPos: positions[i + 1].clone(), segIndex: i };
            group.add(flowDot);
          }
        }
      }
    }

    scene.add(group);
    fascialChainGroupRef.current = group;
  }, [fascialChainVisualization]);

  useEffect(() => {
    if (!fascialChainVisualization?.showPropagation && !fascialChainVisualization?.painHighlightChains?.length) return;
    if (!fascialChainVisualization?.enabled) return;
    let animFrameId: number;
    const animate = () => {
      if (fascialChainGroupRef.current) {
        const t = Date.now() * 0.001;
        fascialChainGroupRef.current.traverse((child) => {
          if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line)) return;
          const ud = child.userData;
          if (ud.type === 'flowDot' && child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            const flowT = ((t * 2 + (ud.segIndex || 0) * 0.5) % 1);
            child.position.lerpVectors(ud.startPos, ud.endPos, flowT);
            child.material.opacity = 0.4 + Math.sin(t * 5 + (ud.segIndex || 0)) * 0.3;
          } else if (ud.type === 'pulseLine' && child instanceof THREE.Line && child.material instanceof THREE.LineBasicMaterial) {
            child.material.opacity = 0.15 + Math.sin(t * 3) * 0.15;
          } else if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial && child.geometry instanceof THREE.RingGeometry) {
            child.material.opacity = 0.3 + Math.sin(t * 4) * 0.2;
            const scale = 1 + Math.sin(t * 3) * 0.15;
            child.scale.set(scale, scale, scale);
          }
        });
      }
      animFrameId = requestAnimationFrame(animate);
    };
    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, [fascialChainVisualization?.showPropagation, fascialChainVisualization?.painHighlightChains, fascialChainVisualization?.enabled]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;

    if (slingPathwayGroupRef.current) {
      slingPathwayGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
        if (child instanceof THREE.Sprite) {
          const mat = child.material as THREE.SpriteMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      scene.remove(slingPathwayGroupRef.current);
      slingPathwayGroupRef.current = null;
      slingLabelSpritesRef.current = [];
    }

    if (!slingPathwayVisualization?.enabled || !model) return;
    if (slingPathwayVisualization.slings.length === 0) return;

    model.updateMatrixWorld(true);
    const boneMap = new Map<string, THREE.Object3D>();
    model.traverse((child: THREE.Object3D) => {
      if (child.name) boneMap.set(child.name, child);
    });

    const group = new THREE.Group();
    group.userData.isSlingGroup = true;
    const labelSprites: THREE.Sprite[] = [];

    for (const sling of slingPathwayVisualization.slings) {
      const isActive = slingPathwayVisualization.activeSlingId === sling.id;
      const isDimmed = slingPathwayVisualization.activeSlingId !== null && !isActive;
      const colorHex = parseInt(sling.color.replace('#', ''), 16);
      const opacity = isDimmed ? 0.15 : isActive ? 0.9 : 0.5;

      const positions: THREE.Vector3[] = [];
      for (const boneName of sling.bonePathway) {
        const bone = boneMap.get(boneName);
        if (bone) {
          const worldPos = new THREE.Vector3();
          bone.getWorldPosition(worldPos);
          positions.push(worldPos);
        }
      }

      if (positions.length < 2) continue;

      const weakSet = new Set(sling.weakLinkBoneIndices ?? []);
      const overloadSet = new Set(sling.overloadedBoneIndices ?? []);
      const compSet = new Set(sling.compensatingBoneIndices ?? []);

      const muscleScores = sling.muscleScores ?? [];
      const totalBones = sling.bonePathway.length;
      const slingBaseColor = new THREE.Color(colorHex);

      const getSegmentActivation = (segIdx: number): { activation: number; found: boolean } => {
        if (muscleScores.length === 0) return { activation: 50, found: false };
        const muscleIdx = Math.min(Math.floor((segIdx / totalBones) * muscleScores.length), muscleScores.length - 1);
        const ms = muscleScores[muscleIdx];
        return { activation: ms?.activation ?? 50, found: ms?.found ?? false };
      };

      const activationToColor = (activation: number, found: boolean): THREE.Color => {
        const t = Math.max(0, Math.min(1, activation / 100));
        const lowColor = new THREE.Color(0xff2222);
        const midColor = new THREE.Color(0xffbb00);
        const highColor = new THREE.Color(0x22dd66);
        let heatColor: THREE.Color;
        if (t < 0.5) {
          heatColor = lowColor.clone().lerp(midColor, t * 2);
        } else {
          heatColor = midColor.clone().lerp(highColor, (t - 0.5) * 2);
        }
        if (!found) {
          heatColor.lerp(slingBaseColor, 0.5);
        } else {
          heatColor.lerp(slingBaseColor, 0.2);
        }
        return heatColor;
      };

      for (let seg = 0; seg < positions.length - 1; seg++) {
        const segStart = positions[seg];
        const segEnd = positions[seg + 1];
        const isWeakSeg = weakSet.has(seg) || weakSet.has(seg + 1);

        const segCurve = new THREE.CatmullRomCurve3([segStart, segEnd], false, 'catmullrom', 0.5);

        const seg0Data = getSegmentActivation(seg);
        const seg1Data = getSegmentActivation(seg + 1);

        if (isWeakSeg && !isDimmed) {
          const dashCount = 6;
          const weakOpacity = isActive ? 0.7 : 0.4;
          for (let d = 0; d < dashCount; d++) {
            const t0 = (d * 2) / (dashCount * 2);
            const t1 = (d * 2 + 1) / (dashCount * 2);
            const dashPts = [segCurve.getPoint(t0), segCurve.getPoint(t1)];
            const dashGeom = new THREE.BufferGeometry().setFromPoints(dashPts);
            const segT = (t0 + t1) / 2;
            const interpAct = seg0Data.activation + (seg1Data.activation - seg0Data.activation) * segT;
            const interpFound = segT < 0.5 ? seg0Data.found : seg1Data.found;
            const dashMat = new THREE.LineBasicMaterial({
              color: activationToColor(interpAct, interpFound),
              opacity: weakOpacity,
              transparent: true,
              depthTest: false,
            });
            const dashLine = new THREE.Line(dashGeom, dashMat);
            dashLine.renderOrder = 997;
            group.add(dashLine);
          }
        } else {
          const subSegCount = 6;
          for (let ss = 0; ss < subSegCount; ss++) {
            const t0 = ss / subSegCount;
            const t1 = (ss + 1) / subSegCount;
            const p0 = segCurve.getPoint(t0);
            const p1 = segCurve.getPoint(t1);
            const ssGeom = new THREE.BufferGeometry().setFromPoints([p0, p1]);
            const segT = (t0 + t1) / 2;
            const interpAct = seg0Data.activation + (seg1Data.activation - seg0Data.activation) * segT;
            const interpFound = segT < 0.5 ? seg0Data.found : seg1Data.found;
            const ssMat = new THREE.LineBasicMaterial({
              color: activationToColor(interpAct, interpFound),
              opacity: isDimmed ? 0.15 : isActive ? 0.9 : 0.5,
              transparent: true,
              depthTest: false,
            });
            const ssLine = new THREE.Line(ssGeom, ssMat);
            ssLine.renderOrder = 997;
            group.add(ssLine);
          }
        }
      }

      const forceReroutes = sling.forceReroutes ?? [];
      const hasReroutes = forceReroutes.length > 0;

      if (!hasReroutes && positions.length >= 3) {
        const flowArrowCount = Math.min(3, Math.floor(positions.length / 2));
        for (let fa = 0; fa < flowArrowCount; fa++) {
          const tPos = (fa + 1) / (flowArrowCount + 1);
          const posIdx = Math.floor(tPos * (positions.length - 1));
          const nextIdx = Math.min(posIdx + 1, positions.length - 1);
          if (posIdx === nextIdx) continue;
          const flowFrom = positions[posIdx];
          const flowTo = positions[nextIdx];
          const flowDir = flowTo.clone().sub(flowFrom);
          if (flowDir.length() < 0.005) continue;
          flowDir.normalize();

          const flowConeGeom = new THREE.ConeGeometry(0.006, 0.018, 5);
          const flowConeMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            opacity: isDimmed ? 0.08 : isActive ? 0.6 : 0.3,
            transparent: true,
            depthTest: false,
          });
          const flowCone = new THREE.Mesh(flowConeGeom, flowConeMat);
          flowCone.position.copy(flowFrom.clone().lerp(flowTo, 0.5));
          const flowQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), flowDir);
          flowCone.quaternion.copy(flowQuat);
          flowCone.renderOrder = 998;
          group.add(flowCone);
        }
      }

      if (hasReroutes) {
        for (const reroute of forceReroutes) {
          const fromIdx = muscleScores.findIndex(ms => ms.muscle === reroute.fromMuscle);
          const toIdx = muscleScores.findIndex(ms => ms.muscle === reroute.toMuscle);
          if (fromIdx < 0 || toIdx < 0) continue;

          const fromBoneIdx = Math.min(Math.floor((fromIdx / muscleScores.length) * totalBones), totalBones - 1);
          const toBoneIdx = Math.min(Math.floor((toIdx / muscleScores.length) * totalBones), totalBones - 1);
          if (fromBoneIdx >= positions.length || toBoneIdx >= positions.length) continue;

          const fromPos = positions[fromBoneIdx];
          const toPos = positions[toBoneIdx];
          if (fromPos.distanceTo(toPos) < 0.005) continue;

          const midPt = fromPos.clone().lerp(toPos, 0.5);
          const offsetDir = new THREE.Vector3().crossVectors(
            new THREE.Vector3(0, 1, 0),
            toPos.clone().sub(fromPos).normalize()
          ).normalize();
          midPt.add(offsetDir.multiplyScalar(0.04));
          midPt.z += 0.03;

          const arrowCurve = new THREE.QuadraticBezierCurve3(fromPos, midPt, toPos);
          const arrowPts = arrowCurve.getPoints(16);
          const arrowGeom = new THREE.BufferGeometry().setFromPoints(arrowPts);
          const arrowOpacity = isDimmed ? 0.12 : isActive ? 0.85 : 0.5;
          const arrowMat = new THREE.LineBasicMaterial({
            color: 0xff8800,
            opacity: arrowOpacity,
            transparent: true,
            depthTest: false,
          });
          const arrowLine = new THREE.Line(arrowGeom, arrowMat);
          arrowLine.renderOrder = 998;
          group.add(arrowLine);

          const lastPt = arrowPts[arrowPts.length - 1];
          const prevPt = arrowPts[arrowPts.length - 3];
          const arrowDir = lastPt.clone().sub(prevPt).normalize();
          const coneGeom = new THREE.ConeGeometry(0.008, 0.025, 6);
          const coneMat = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            opacity: isDimmed ? 0.12 : isActive ? 0.9 : 0.5,
            transparent: true,
            depthTest: false,
          });
          const cone = new THREE.Mesh(coneGeom, coneMat);
          cone.position.copy(lastPt);
          const upVec = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion().setFromUnitVectors(upVec, arrowDir);
          cone.quaternion.copy(quat);
          cone.renderOrder = 998;
          group.add(cone);

          const rerouteLabelCanvas = document.createElement('canvas');
          rerouteLabelCanvas.width = 128;
          rerouteLabelCanvas.height = 48;
          const rlCtx = rerouteLabelCanvas.getContext('2d');
          if (rlCtx) {
            rlCtx.fillStyle = 'rgba(10, 10, 28, 0.9)';
            rlCtx.beginPath();
            rlCtx.roundRect(2, 2, 124, 44, 8);
            rlCtx.fill();
            rlCtx.strokeStyle = '#ff8800';
            rlCtx.lineWidth = 2;
            rlCtx.beginPath();
            rlCtx.roundRect(2, 2, 124, 44, 8);
            rlCtx.stroke();
            rlCtx.font = 'bold 22px sans-serif';
            rlCtx.fillStyle = '#ff8800';
            rlCtx.textAlign = 'center';
            rlCtx.textBaseline = 'middle';
            rlCtx.fillText(`+${reroute.reroutePct}%`, 64, 24);
          }
          const rerouteTexture = new THREE.CanvasTexture(rerouteLabelCanvas);
          rerouteTexture.needsUpdate = true;
          const rerouteMat = new THREE.SpriteMaterial({
            map: rerouteTexture,
            transparent: true,
            depthTest: false,
            opacity: isDimmed ? 0.1 : isActive ? 0.95 : 0.5,
          });
          const rerouteSprite = new THREE.Sprite(rerouteMat);
          rerouteSprite.position.copy(midPt);
          rerouteSprite.scale.set(0.08, 0.03, 1);
          rerouteSprite.renderOrder = 999;
          group.add(rerouteSprite);
        }
      }

      const statusColor = sling.status === 'underperforming' ? 0xff4444 :
        sling.status === 'overloaded' ? 0xff9933 :
        sling.status === 'compensating' ? 0xffcc00 : colorHex;

      for (let pi = 0; pi < positions.length; pi++) {
        const pos = positions[pi];
        const isWeak = weakSet.has(pi);
        const isOverloaded = overloadSet.has(pi);
        const isComp = compSet.has(pi);

        let dotColor = statusColor;
        let dotSize = isActive ? 0.012 : 0.008;

        if (isActive && isOverloaded) {
          dotColor = 0xff3300;
          dotSize = 0.018;
        } else if (isActive && isWeak) {
          dotColor = 0xff4444;
          dotSize = 0.006;
        } else if (isActive && isComp) {
          dotColor = 0xffcc00;
          dotSize = 0.015;
        }

        const dotGeom = new THREE.SphereGeometry(dotSize, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({
          color: dotColor,
          opacity: isDimmed ? 0.2 : 0.8,
          transparent: true,
          depthTest: false,
        });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        dot.position.copy(pos);
        dot.renderOrder = 998;
        group.add(dot);

        if (isActive && isOverloaded) {
          const ringGeom = new THREE.RingGeometry(0.02, 0.025, 16);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            opacity: 0.6,
            transparent: true,
            side: 2,
            depthTest: false,
          });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.position.copy(pos);
          ring.lookAt(pos.x, pos.y + 1, pos.z);
          ring.renderOrder = 999;
          group.add(ring);
        }
      }

      const midIdx = Math.floor(positions.length / 2);
      const anchorPos = positions[midIdx].clone();

      const slingLabel = sling.label || sling.id.replace(/_/g, ' ');
      const scoreText = `${Math.round(sling.activationScore)}%`;
      const statusText = sling.status.charAt(0).toUpperCase() + sling.status.slice(1);
      const ftqText = sling.forceTransferQuality === 'good' ? 'Good' : sling.forceTransferQuality === 'reduced' ? 'Reduced' : 'Poor';
      const hasWeakLinks = (sling.weakLinkBoneIndices?.length ?? 0) > 0;
      const needsAttention = sling.status === 'underperforming' || sling.status === 'overloaded' || hasWeakLinks;

      const labelCanvas = document.createElement('canvas');
      const cw = 640;
      const ch = 240;
      labelCanvas.width = cw;
      labelCanvas.height = ch;
      const lctx = labelCanvas.getContext('2d');
      if (lctx) {
        const statusBorderColor = sling.status === 'underperforming' ? '#ef4444'
          : sling.status === 'overloaded' ? '#f59e0b'
          : sling.status === 'compensating' ? '#eab308'
          : sling.color;

        lctx.fillStyle = 'rgba(10, 10, 28, 0.94)';
        lctx.beginPath();
        lctx.roundRect(4, 4, cw - 8, ch - 8, 14);
        lctx.fill();

        lctx.strokeStyle = statusBorderColor;
        lctx.lineWidth = needsAttention ? 5 : 3;
        lctx.beginPath();
        lctx.roundRect(4, 4, cw - 8, ch - 8, 14);
        lctx.stroke();

        const accentBarH = 6;
        lctx.fillStyle = sling.color;
        lctx.fillRect(14, 10, cw - 28, accentBarH);

        lctx.font = 'bold 38px sans-serif';
        lctx.fillStyle = '#ffffff';
        lctx.textAlign = 'left';
        lctx.textBaseline = 'top';
        lctx.fillText(slingLabel, 20, 26);

        lctx.font = 'bold 52px sans-serif';
        const scoreColor = sling.activationScore >= 70 ? '#34d399'
          : sling.activationScore >= 45 ? '#fbbf24'
          : '#ef4444';
        lctx.fillStyle = scoreColor;
        lctx.textAlign = 'right';
        lctx.fillText(scoreText, cw - 20, 20);

        lctx.font = '30px sans-serif';
        lctx.textAlign = 'left';
        lctx.fillStyle = statusBorderColor;
        lctx.fillText(statusText, 20, 76);

        const ftqColor = sling.forceTransferQuality === 'good' ? '#34d399'
          : sling.forceTransferQuality === 'reduced' ? '#fbbf24' : '#ef4444';
        lctx.font = '28px sans-serif';
        lctx.fillStyle = '#9ca3af';
        lctx.fillText('Force Transfer: ', 20, 118);
        const transferPrefixW = lctx.measureText('Force Transfer: ').width;
        lctx.fillStyle = ftqColor;
        lctx.font = 'bold 28px sans-serif';
        lctx.fillText(ftqText, 20 + transferPrefixW, 118);

        if (hasWeakLinks) {
          lctx.font = '26px sans-serif';
          lctx.fillStyle = '#f87171';
          lctx.textAlign = 'left';
          lctx.fillText(`\u26A0 ${sling.weakLinkBoneIndices.length} weak link${sling.weakLinkBoneIndices.length > 1 ? 's' : ''}`, 20, 158);
        }

        if (needsAttention) {
          lctx.font = 'bold 26px sans-serif';
          lctx.fillStyle = '#ef4444';
          lctx.textAlign = 'right';
          lctx.fillText('\u26A0 Needs Attention', cw - 20, 158);
        }

        lctx.font = '22px sans-serif';
        lctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        lctx.textAlign = 'center';
        lctx.fillText('Click for details', cw / 2, 200);
      }

      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      labelTexture.needsUpdate = true;
      const labelMat = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
        opacity: isDimmed ? 0.15 : isActive ? 1.0 : 0.85,
      });
      const labelSprite = new THREE.Sprite(labelMat);
      labelSprite.userData.slingId = sling.id;
      labelSprite.userData.isSlingLabel = true;

      const labelOffsetX = sling.id === 'lateral' ? -0.38
        : sling.id === 'anterior_oblique' ? -0.35
        : sling.id === 'scapular_shoulder' ? 0.35
        : sling.id === 'deep_longitudinal' ? 0.35
        : 0.35;
      const labelOffsetY = sling.id === 'scapular_shoulder' ? 0.14
        : sling.id === 'deep_longitudinal' ? -0.08
        : sling.id === 'lateral' ? -0.02
        : sling.id === 'anterior_oblique' ? 0.06
        : 0.06;
      const labelPos = anchorPos.clone().add(new THREE.Vector3(labelOffsetX, labelOffsetY, 0.12));

      labelSprite.position.copy(labelPos);
      labelSprite.scale.set(0.36, 0.135, 1);
      labelSprite.renderOrder = 1000;
      group.add(labelSprite);
      labelSprites.push(labelSprite);

      const leaderMidpoint = anchorPos.clone().lerp(labelPos, 0.5).add(new THREE.Vector3(0, 0.02, 0.03));
      const leaderCurve = new THREE.QuadraticBezierCurve3(anchorPos, leaderMidpoint, labelPos);
      const leaderPts = leaderCurve.getPoints(12);
      const leaderGeom = new THREE.BufferGeometry().setFromPoints(leaderPts);
      const leaderMat = new THREE.LineBasicMaterial({
        color: colorHex,
        opacity: isDimmed ? 0.1 : 0.6,
        transparent: true,
        depthTest: false,
      });
      const leaderLine = new THREE.Line(leaderGeom, leaderMat);
      leaderLine.renderOrder = 999;
      group.add(leaderLine);

      const anchorDotGeom = new THREE.SphereGeometry(0.006, 8, 8);
      const anchorDotMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        opacity: isDimmed ? 0.15 : 0.7,
        transparent: true,
        depthTest: false,
      });
      const anchorDot = new THREE.Mesh(anchorDotGeom, anchorDotMat);
      anchorDot.position.copy(anchorPos);
      anchorDot.renderOrder = 999;
      group.add(anchorDot);
    }

    const slingMidpoints = new Map<string, THREE.Vector3>();
    for (const sl of slingPathwayVisualization.slings) {
      const slPositions: THREE.Vector3[] = [];
      for (const bn of sl.bonePathway) {
        const bone = boneMap.get(bn);
        if (bone) {
          const wp = new THREE.Vector3();
          bone.getWorldPosition(wp);
          slPositions.push(wp);
        }
      }
      if (slPositions.length > 0) {
        const mid = slPositions[Math.floor(slPositions.length / 2)].clone();
        slingMidpoints.set(sl.id, mid);
      }
    }

    const activeSlingId = slingPathwayVisualization.activeSlingId;
    const crossComps = slingPathwayVisualization.crossSlingCompensations ?? [];

    if (crossComps.length > 0) {
      for (const comp of crossComps) {
        const fromId = comp.compensatedSling;
        const toId = comp.compensatingSling;

        const fromMid = slingMidpoints.get(fromId);
        const toMid = slingMidpoints.get(toId);
        if (!fromMid || !toMid) continue;
        if (fromMid.distanceTo(toMid) < 0.01) continue;

        const bridgeInvolvesActive = activeSlingId === null || activeSlingId === fromId || activeSlingId === toId;
        const bridgeOpacityMul = bridgeInvolvesActive ? 1.0 : 0.15;

        const bridgeSeverityColor = comp.severity === 'severe' ? 0xff3333
          : comp.severity === 'moderate' ? 0xffaa00 : 0x4488ff;

        const bridgeMidPt = fromMid.clone().lerp(toMid, 0.5);
        const bridgeDir = toMid.clone().sub(fromMid);
        const bridgeDirLen = bridgeDir.length();
        if (bridgeDirLen < 0.001) continue;
        bridgeDir.normalize();
        const bridgePerp = new THREE.Vector3().crossVectors(bridgeDir, new THREE.Vector3(0, 0, 1));
        const perpLen = bridgePerp.length();
        if (perpLen > 0.001) {
          bridgePerp.normalize();
          bridgeMidPt.add(bridgePerp.multiplyScalar(0.06));
        }
        bridgeMidPt.z += 0.05;

        const bridgeCurve = new THREE.QuadraticBezierCurve3(fromMid, bridgeMidPt, toMid);
        const dashSegments = 12;
        for (let d = 0; d < dashSegments; d++) {
          const dt0 = (d * 2) / (dashSegments * 2);
          const dt1 = (d * 2 + 1) / (dashSegments * 2);
          const dp0 = bridgeCurve.getPoint(dt0);
          const dp1 = bridgeCurve.getPoint(dt1);
          const bdGeom = new THREE.BufferGeometry().setFromPoints([dp0, dp1]);
          const bdMat = new THREE.LineBasicMaterial({
            color: bridgeSeverityColor,
            opacity: 0.7 * bridgeOpacityMul,
            transparent: true,
            depthTest: false,
          });
          const bdLine = new THREE.Line(bdGeom, bdMat);
          bdLine.renderOrder = 996;
          group.add(bdLine);
        }

        const bridgeLabelCanvas = document.createElement('canvas');
        bridgeLabelCanvas.width = 320;
        bridgeLabelCanvas.height = 96;
        const blCtx = bridgeLabelCanvas.getContext('2d');
        if (blCtx) {
          blCtx.fillStyle = 'rgba(10, 10, 28, 0.92)';
          blCtx.beginPath();
          blCtx.roundRect(2, 2, 316, 92, 10);
          blCtx.fill();
          const borderHex = comp.severity === 'severe' ? '#ff3333'
            : comp.severity === 'moderate' ? '#ffaa00' : '#4488ff';
          blCtx.strokeStyle = borderHex;
          blCtx.lineWidth = 2;
          blCtx.beginPath();
          blCtx.roundRect(2, 2, 316, 92, 10);
          blCtx.stroke();
          blCtx.font = 'bold 16px sans-serif';
          blCtx.fillStyle = '#cccccc';
          blCtx.textAlign = 'center';
          blCtx.textBaseline = 'top';
          const compLabel = `${comp.compensatingSlingLabel}`;
          blCtx.fillText(compLabel, 160, 8);
          blCtx.font = '14px sans-serif';
          blCtx.fillStyle = '#9ca3af';
          blCtx.fillText(`compensating for ${comp.compensatedSlingLabel}`, 160, 30);
          blCtx.font = 'bold 18px sans-serif';
          blCtx.fillStyle = borderHex;
          blCtx.fillText(`+${comp.additionalLoadPct}% load`, 160, 52);
          blCtx.font = '13px sans-serif';
          blCtx.fillStyle = borderHex;
          blCtx.fillText(comp.severity.toUpperCase(), 160, 76);
        }
        const bridgeTexture = new THREE.CanvasTexture(bridgeLabelCanvas);
        bridgeTexture.needsUpdate = true;
        const bridgeSpriteMat = new THREE.SpriteMaterial({
          map: bridgeTexture,
          transparent: true,
          depthTest: false,
          opacity: 0.9 * bridgeOpacityMul,
        });
        const bridgeSprite = new THREE.Sprite(bridgeSpriteMat);
        bridgeSprite.position.copy(bridgeMidPt);
        bridgeSprite.scale.set(0.16, 0.048, 1);
        bridgeSprite.renderOrder = 999;
        group.add(bridgeSprite);
      }
    }

    const adjacencyMap: Record<string, string[]> = {
      posterior_oblique: ['deep_longitudinal', 'lateral', 'scapular_shoulder'],
      anterior_oblique: ['lateral', 'deep_longitudinal'],
      lateral: ['posterior_oblique', 'anterior_oblique', 'deep_longitudinal'],
      deep_longitudinal: ['posterior_oblique', 'anterior_oblique', 'lateral'],
      scapular_shoulder: ['posterior_oblique', 'anterior_oblique'],
    };

    const activeCompPairs = new Set<string>();
    for (const comp of crossComps) {
      const pairKey = [comp.compensatedSling, comp.compensatingSling].sort().join('|');
      activeCompPairs.add(pairKey);
    }

    const drawnAdjPairs = new Set<string>();
    for (const sl of slingPathwayVisualization.slings) {
      const adjacent = adjacencyMap[sl.id] ?? [];
      for (const adjId of adjacent) {
        const pairKey = [sl.id, adjId].sort().join('|');
        if (drawnAdjPairs.has(pairKey)) continue;
        if (activeCompPairs.has(pairKey)) continue;
        drawnAdjPairs.add(pairKey);

        const fromMid = slingMidpoints.get(sl.id);
        const toMid = slingMidpoints.get(adjId);
        if (!fromMid || !toMid) continue;
        if (fromMid.distanceTo(toMid) < 0.01) continue;

        const involvesActive = activeSlingId === null || activeSlingId === sl.id || activeSlingId === adjId;
        const adjOpacity = involvesActive ? 0.2 : 0.06;

        const adjMidPt = fromMid.clone().lerp(toMid, 0.5);
        const adjDir = toMid.clone().sub(fromMid);
        if (adjDir.length() < 0.001) continue;
        adjDir.normalize();
        const adjPerp = new THREE.Vector3().crossVectors(adjDir, new THREE.Vector3(0, 0, 1));
        if (adjPerp.length() > 0.001) {
          adjPerp.normalize();
          adjMidPt.add(adjPerp.multiplyScalar(0.04));
        }
        adjMidPt.z += 0.03;

        const adjCurve = new THREE.QuadraticBezierCurve3(fromMid, adjMidPt, toMid);
        const adjDashCount = 8;
        for (let d = 0; d < adjDashCount; d++) {
          const dt0 = (d * 2) / (adjDashCount * 2);
          const dt1 = (d * 2 + 1) / (adjDashCount * 2);
          const dp0 = adjCurve.getPoint(dt0);
          const dp1 = adjCurve.getPoint(dt1);
          const adjLineGeom = new THREE.BufferGeometry().setFromPoints([dp0, dp1]);
          const adjLineMat = new THREE.LineBasicMaterial({
            color: 0x6688aa,
            opacity: adjOpacity,
            transparent: true,
            depthTest: false,
          });
          const adjLine = new THREE.Line(adjLineGeom, adjLineMat);
          adjLine.renderOrder = 995;
          group.add(adjLine);
        }

        const adjLabelCanvas = document.createElement('canvas');
        adjLabelCanvas.width = 192;
        adjLabelCanvas.height = 48;
        const alCtx = adjLabelCanvas.getContext('2d');
        if (alCtx) {
          alCtx.fillStyle = 'rgba(10, 10, 28, 0.7)';
          alCtx.beginPath();
          alCtx.roundRect(2, 2, 188, 44, 8);
          alCtx.fill();
          alCtx.strokeStyle = 'rgba(100, 130, 170, 0.4)';
          alCtx.lineWidth = 1;
          alCtx.beginPath();
          alCtx.roundRect(2, 2, 188, 44, 8);
          alCtx.stroke();
          alCtx.font = '14px sans-serif';
          alCtx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          alCtx.textAlign = 'center';
          alCtx.textBaseline = 'middle';
          alCtx.fillText('linked', 96, 24);
        }
        const adjTexture = new THREE.CanvasTexture(adjLabelCanvas);
        adjTexture.needsUpdate = true;
        const adjSpriteMat = new THREE.SpriteMaterial({
          map: adjTexture,
          transparent: true,
          depthTest: false,
          opacity: involvesActive ? 0.5 : 0.15,
        });
        const adjSprite = new THREE.Sprite(adjSpriteMat);
        adjSprite.position.copy(adjMidPt);
        adjSprite.scale.set(0.08, 0.02, 1);
        adjSprite.renderOrder = 996;
        group.add(adjSprite);
      }
    }

    slingLabelSpritesRef.current = labelSprites;
    scene.add(group);
    slingPathwayGroupRef.current = group;
  }, [slingPathwayVisualization]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { renderer, camera } = sceneRef.current;
    if (!renderer) return;
    const domElement = renderer.domElement;

    const onClickSlingLabel = (e: MouseEvent) => {
      if (slingLabelSpritesRef.current.length === 0) return;
      const rect = domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(slingLabelSpritesRef.current, false);
      if (hits.length > 0 && hits[0].object.userData.isSlingLabel) {
        const slingId = hits[0].object.userData.slingId;
        if (slingId) {
          onSlingLabelClickRef.current?.(slingId);
        }
      }
    };

    domElement.addEventListener('click', onClickSlingLabel);
    return () => { domElement.removeEventListener('click', onClickSlingLabel); };
  }, [slingPathwayVisualization?.enabled]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, model } = sceneRef.current;

    if (scarMarkerGroupRef.current) {
      scarMarkerGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      scene.remove(scarMarkerGroupRef.current);
      scarMarkerGroupRef.current = null;
    }

    if (scarMarkers.length === 0 && adhesionBands.length === 0) return;
    if (!model) return;

    model.updateMatrixWorld(true);
    const group = new THREE.Group();
    group.userData.isScarGroup = true;

    for (const scar of scarMarkers) {
      const scarTypeInfo = SCAR_TYPES[scar.type];
      const color = new THREE.Color(scarTypeInfo.color);

      const length = Math.max(scar.length || 0.08, 0.04);
      const width = Math.max(scar.width || 0.03, 0.015);
      const scarGeo = new THREE.SphereGeometry(1, 12, 8);
      scarGeo.scale(length / 2, width / 2, width / 3);

      const scarMat = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.6 + (scar.severity / 5) * 0.3,
        emissive: color,
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      });

      const scarMesh = new THREE.Mesh(scarGeo, scarMat);
      scarMesh.position.set(scar.position.x, scar.position.y, scar.position.z);

      if (scar.orientation) {
        scarMesh.rotation.z = (scar.orientation * Math.PI) / 180;
      }

      scarMesh.renderOrder = 992;
      scarMesh.userData.scarId = scar.id;
      scarMesh.userData.isScarMarker = true;
      group.add(scarMesh);

      const outlineGeo = new THREE.SphereGeometry(1, 12, 8);
      outlineGeo.scale(length / 2 + 0.005, width / 2 + 0.005, width / 3 + 0.005);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
      outlineMesh.position.copy(scarMesh.position);
      outlineMesh.rotation.copy(scarMesh.rotation);
      outlineMesh.renderOrder = 991;
      group.add(outlineMesh);
    }

    for (const band of adhesionBands) {
      const start = new THREE.Vector3(band.startPosition.x, band.startPosition.y, band.startPosition.z);
      const end = new THREE.Vector3(band.endPosition.x, band.endPosition.y, band.endPosition.z);
      const tensionFactor = band.tensionLevel / 100;

      const bandColor = new THREE.Color('#8b0000');
      bandColor.lerp(new THREE.Color('#ff4444'), tensionFactor);

      const dir = new THREE.Vector3().subVectors(end, start);
      const segLen = dir.length();
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
      const radius = 0.006 + tensionFactor * 0.01;
      const tubeGeo = new THREE.CylinderGeometry(radius, radius, segLen, 6, 1);
      const tubeMat = new THREE.MeshPhongMaterial({
        color: bandColor,
        transparent: true,
        opacity: 0.5 + tensionFactor * 0.4,
        emissive: bandColor,
        emissiveIntensity: tensionFactor * 0.3,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.copy(mid);
      dir.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      tube.setRotationFromQuaternion(quat);
      tube.renderOrder = 992;
      tube.userData.adhesionId = band.id;
      group.add(tube);

      [start, end].forEach(pos => {
        const dotGeo = new THREE.SphereGeometry(radius * 2, 8, 6);
        const dotMat = new THREE.MeshBasicMaterial({
          color: bandColor,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(pos);
        dot.renderOrder = 993;
        group.add(dot);
      });
    }

    scene.add(group);
    scarMarkerGroupRef.current = group;
  }, [scarMarkers, adhesionBands]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene } = sceneRef.current;

    const applyPainMarkerSeverity = (
      meshes: { inner: THREE.Mesh; outer: THREE.Mesh; extra?: THREE.Object3D[] },
      marker: PainMarker,
      markerType: string,
    ) => {
      const sevRaw = typeof marker.severity === 'number' ? marker.severity : 5;
      const sev = Math.max(0, Math.min(10, sevRaw));
      const ghost = sev < 0.5;
      const s = ghost ? 0.4 : 0.4 + (sev / 10) * 0.8;
      const o = ghost ? 0.07 : 0.5 + (sev / 10) * 0.5;

      meshes.inner.scale.setScalar(s);
      const innerMat = meshes.inner.material as THREE.MeshBasicMaterial;
      const innerBase = (innerMat.userData.baseOpacity as number | undefined) ?? 0.7;
      innerMat.opacity = innerBase * o;
      innerMat.transparent = true;

      const baseRadius = (meshes.outer.userData.baseRadius as number | undefined) ?? (markerType === 'area' ? (marker.radius || 0.15) : 0.1);
      if (markerType === 'area' && marker.radius && baseRadius > 0) {
        meshes.outer.scale.setScalar((marker.radius / baseRadius) * s);
      } else {
        meshes.outer.scale.setScalar(s);
      }
      const outerMat = meshes.outer.material as THREE.MeshBasicMaterial;
      const outerBase = (outerMat.userData.baseOpacity as number | undefined) ?? (markerType === 'area' ? 0.25 : 0.2);
      outerMat.opacity = outerBase * o;
      outerMat.transparent = true;

      if (meshes.extra) {
        for (const obj of meshes.extra) {
          if (obj instanceof THREE.Mesh) {
            obj.scale.setScalar(s);
            const m = obj.material as THREE.MeshBasicMaterial;
            const base = (m.userData.baseOpacity as number | undefined) ?? m.opacity;
            m.opacity = base * o;
            m.transparent = true;
          } else if (obj instanceof THREE.Line) {
            const m = obj.material as THREE.LineBasicMaterial;
            const base = (m.userData.baseOpacity as number | undefined) ?? m.opacity;
            m.opacity = base * o;
            m.transparent = true;
          }
        }
      }
    };

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
            lineMat.userData.baseOpacity = 0.85;
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
              dotMat.userData.baseOpacity = 0.4;
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

        applyPainMarkerSeverity(meshes, marker, markerType);
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
      innerMat.userData.baseOpacity = 0.7;
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.copy(pos);
      innerMesh.renderOrder = 1001;
      innerMesh.userData.isPainMarker = true;
      innerMesh.userData.markerId = marker.id;
      innerMesh.userData.role = 'inner';

      let outerGeo: THREE.BufferGeometry;
      let baseOuterRadius: number;
      if (markerType === 'area') {
        baseOuterRadius = marker.radius || 0.15;
        outerGeo = new THREE.SphereGeometry(baseOuterRadius, 20, 14);
      } else {
        baseOuterRadius = 0.1;
        outerGeo = new THREE.SphereGeometry(baseOuterRadius, 12, 8);
      }
      const outerMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: markerType === 'area' ? 0.25 : 0.2,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      outerMat.userData.baseOpacity = markerType === 'area' ? 0.25 : 0.2;
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      outerMesh.position.copy(pos);
      outerMesh.renderOrder = 1000;
      outerMesh.userData.isPainMarker = true;
      outerMesh.userData.markerId = marker.id;
      outerMesh.userData.role = 'outer';
      outerMesh.userData.markerKind = markerType;
      outerMesh.userData.baseRadius = baseOuterRadius;

      scene.add(innerMesh);
      scene.add(outerMesh);

      const extraObjects: THREE.Object3D[] = [];

      if (markerType === 'referred' && marker.referralTarget) {
        const tp = new THREE.Vector3(marker.referralTarget.x, marker.referralTarget.y, marker.referralTarget.z);

        const tInnerGeo = new THREE.SphereGeometry(0.05, 12, 8);
        const tInnerMat = new THREE.MeshBasicMaterial({ color: 0xcc66ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
        tInnerMat.userData.baseOpacity = 0.6;
        const tInnerMesh = new THREE.Mesh(tInnerGeo, tInnerMat);
        tInnerMesh.position.copy(tp);
        tInnerMesh.renderOrder = 1001;
        tInnerMesh.userData.isPainMarker = true;
        tInnerMesh.userData.markerId = marker.id;

        const tOuterGeo = new THREE.SphereGeometry(0.08, 10, 6);
        const tOuterMat = new THREE.MeshBasicMaterial({ color: 0xcc66ff, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
        tOuterMat.userData.baseOpacity = 0.15;
        const tOuterMesh = new THREE.Mesh(tOuterGeo, tOuterMat);
        tOuterMesh.position.copy(tp);
        tOuterMesh.renderOrder = 1000;
        tOuterMesh.userData.isPainMarker = true;
        tOuterMesh.userData.markerId = marker.id;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, tp]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0xcc66ff, dashSize: 0.04, gapSize: 0.02, transparent: true, opacity: 0.7, depthTest: true, depthWrite: false });
        lineMat.userData.baseOpacity = 0.7;
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
        lineMat.userData.baseOpacity = 0.8;
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 999;
        scene.add(line);
        extraObjects.push(line);

        for (const lp of marker.linePoints) {
          const dotGeo = new THREE.SphereGeometry(0.03, 8, 6);
          const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
          dotMat.userData.baseOpacity = 0.5;
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
        lineMat.userData.baseOpacity = 0.85;
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 999;
        scene.add(line);
        extraObjects.push(line);

        const tubePts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
        for (const tp of tubePts) {
          const dotGeo = new THREE.SphereGeometry(0.025, 6, 4);
          const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
          dotMat.userData.baseOpacity = 0.4;
          const dotMesh = new THREE.Mesh(dotGeo, dotMat);
          dotMesh.position.copy(tp);
          dotMesh.renderOrder = 1000;
          dotMesh.userData.isPainMarker = true;
          dotMesh.userData.markerId = marker.id;
          scene.add(dotMesh);
          extraObjects.push(dotMesh);
        }
      }

      const newMeshes = { inner: innerMesh, outer: outerMesh, extra: extraObjects.length > 0 ? extraObjects : undefined };
      painMarkerMeshesRef.current.set(marker.id, newMeshes);
      applyPainMarkerSeverity(newMeshes, marker, markerType);
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
    if (!sceneRef.current || (!enablePainMarkers && !enableSkeletonClick)) return;
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
      if (enableSkeletonClickRef.current && e.button === 0) {
        const ndc = getMouseNDC(e);
        const hitPoint = raycastModel(ndc);
        if (hitPoint) {
          const boneInfo = findNearestBone(hitPoint);
          if (onTissueBoneClickRef.current) {
            onTissueBoneClickRef.current(boneInfo.boneName);
            e.preventDefault();
            return;
          }
          onSkeletonClickRef.current?.({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, boneInfo.boneName, boneInfo.label);
          e.preventDefault();
          return;
        }
      }
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
  }, [enablePainMarkers, enableSkeletonClick, findNearestBone]);

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
    let selectedJointKey: string | null = null;
    let selectedAnchorBoneName: string | null = null;
    let arrowsGroup: THREE.Group | null = null;
    let arrowPickMeshes: { mesh: THREE.Mesh; def: MovementArrowDef; dirWorld: THREE.Vector3 }[] = [];
    let hoveredArrowIdx: number = -1;
    // Bone-segment selection (Task #212): orthogonal to joint selection — at
    // most one of (selectedJointKey, selectedBoneSegmentId) is set at a time.
    let selectedBoneSegmentId: BoneSegmentId | null = null;
    let isShiftHeld = false;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftHeld = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftHeld = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

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

    // ---------------------------------------------------------------------
    // Movement Mode hold-to-test spring-back (Task #319)
    // ---------------------------------------------------------------------
    // When a Movement Mode drag releases, we tween the dragged DOF (and any
    // compensation-chain targets it pulled along) back to their pre-drag
    // values over ~300 ms. Locked joints (double-click) skip the tween.
    let springBackAnimFrame = 0;
    const cancelSpringBack = () => {
      if (springBackAnimFrame) {
        cancelAnimationFrame(springBackAnimFrame);
        springBackAnimFrame = 0;
      }
    };
    const startSpringBack = (targets: Record<string, number>) => {
      cancelSpringBack();
      const fromValues: Record<string, number> = {};
      for (const k of Object.keys(targets)) fromValues[k] = getCurrentValue(k);
      const t0 = performance.now();
      const duration = 300;
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        // ease-out cubic for a natural-feeling settle.
        const eased = 1 - Math.pow(1 - t, 3);
        for (const k of Object.keys(targets)) {
          const v = Math.round(fromValues[k] + (targets[k] - fromValues[k]) * eased);
          onModelConfigChangeRef.current?.(k, v);
        }
        if (t < 1) {
          springBackAnimFrame = requestAnimationFrame(tick);
        } else {
          springBackAnimFrame = 0;
        }
      };
      springBackAnimFrame = requestAnimationFrame(tick);
    };
    /** Snapshot the current values of `primaryConfigKey` plus every
     * compensation-chain target it might drive, so the spring-back tween
     * can revert all of them on release. */
    const captureSpringBack = (primaryConfigKey: string): Record<string, number> => {
      const snap: Record<string, number> = {};
      // Task #321: filter pinned DOFs out of the snapshot so the
      // spring-back tween never reverts a key the clinician pinned via
      // slider or double-click. The outer arrow-drag guard already skips
      // capture when the primary itself is pinned; this protects chain
      // targets (and the slider drag, which calls capture for whichever
      // DOF the clinician released).
      if (!lockedMovementConfigKeysRef.current.has(primaryConfigKey)) {
        snap[primaryConfigKey] = getCurrentValue(primaryConfigKey);
      }
      const [j, mv] = primaryConfigKey.split('.');
      const chainKey = `${camelToSnake(j)}:${camelToSnake(mv)}`;
      const chain = COMPENSATION_CHAIN_BY_KEY.get(chainKey);
      if (chain) {
        for (const c of chain) {
          const k = `${snakeToCamel(c.joint)}.${snakeToCamel(c.movement)}`;
          if (lockedMovementConfigKeysRef.current.has(k)) continue;
          if (!(k in snap)) snap[k] = getCurrentValue(k);
        }
      }
      return snap;
    };

    // Task #321: shared value-update pipeline. Both the 3D arrow drag
    // (onMouseMove) and the slider HUD call this with the unclamped raw
    // target value the user is attempting to set, so they share the same
    // constraint, friction-near-active-limit, painful-arc, exceeded-limit,
    // compensation-chain, and muscle-activation behaviour. Returns the
    // clamped final value, or null if no drag is active.
    const applyDragTarget = (targetRaw: number): number | null => {
      const drag = poseDragRef.current;
      if (!drag) return null;
      const lim = DOF_LIMIT_INDEX.get(drag.configKey);
      const lo = lim ? lim.min : drag.min;
      const hi = lim ? lim.max : drag.max;
      let newValue = Math.max(lo, Math.min(hi, Math.round(targetRaw)));
      let inPainfulArc = false;
      let exceededActiveLimit = false;
      let frictionApplied = false;
      const row = drag.activeRow;
      if (skeletonModeRef.current === 'movement' && row) {
        const aMin = row.activeRomMin;
        const aMax = row.activeRomMax;
        const delta = targetRaw - drag.startValue;
        const approachingHigh = delta > 0;
        const distanceToLimit = approachingHigh ? aMax - newValue : newValue - aMin;
        if (distanceToLimit <= 15 && distanceToLimit > 0) {
          const friction = Math.max(0.3, distanceToLimit / 15);
          const frictionedDelta = delta * friction;
          newValue = Math.round(drag.startValue + frictionedDelta);
          frictionApplied = true;
        }
        if (targetRaw > aMax + 0.5 || targetRaw < aMin - 0.5) exceededActiveLimit = true;
        newValue = Math.max(aMin, Math.min(aMax, newValue));
        if (row.painfulArc) {
          const lo2 = Math.min(row.painfulArc.start, row.painfulArc.end);
          const hi2 = Math.max(row.painfulArc.start, row.painfulArc.end);
          if (newValue >= lo2 && newValue <= hi2) inPainfulArc = true;
        }
      }
      drag.lastValue = newValue;
      if (exceededActiveLimit) drag.attemptedExceeded = true;
      if (inPainfulArc) drag.lastPainfulArc = true;
      if (skeletonModeRef.current === 'movement' && row) {
        const activation = computeMovementMuscleActivation(
          drag.configKey,
          drag.startValue,
          newValue,
          row.activeRomMin,
          row.activeRomMax,
          row.painInhibitionFactor ?? 0,
        );
        if (activation) setMovementMuscleActivation(activation);
      }
      if (inPainfulArc && !lastPainfulArcStateRef.current && row?.painfulArc) {
        const [j, mv] = drag.configKey.split('.');
        setPainToast({
          angle: newValue,
          intensity: row.painfulArc.intensity,
          movement: mv,
          expiresAt: Date.now() + 1800,
        });
        onPainfulArcFlareRef.current?.({
          joint: j,
          movement: mv,
          angle: newValue,
          intensity: row.painfulArc.intensity,
          arcStart: row.painfulArc.start,
          arcEnd: row.painfulArc.end,
        });
      }
      lastPainfulArcStateRef.current = inPainfulArc;
      onModelConfigChangeRef.current?.(drag.configKey, newValue);

      if (exceededActiveLimit && skeletonModeRef.current === 'movement' && row && !frictionApplied) {
        const [j, m] = drag.configKey.split('.');
        const chain = COMPENSATION_CHAIN_BY_KEY.get(`${camelToSnake(j)}:${camelToSnake(m)}`);
        if (chain) {
          const residual = targetRaw > row.activeRomMax
            ? targetRaw - row.activeRomMax
            : targetRaw < row.activeRomMin
              ? row.activeRomMin - targetRaw
              : 0;
          const dragSign = targetRaw >= row.activeRomMax ? 1 : -1;
          const triggered: string[] = [];
          for (const c of chain) {
            const targetKey = `${snakeToCamel(c.joint)}.${snakeToCamel(c.movement)}`;
            const currentVal = (modelConfigRef.current as Record<string, number>)[targetKey] || 0;
            const compDelta = Math.round(residual * c.ratio) * dragSign;
            const lim2 = DOF_LIMIT_INDEX.get(targetKey);
            const next = Math.max(lim2?.min ?? -180, Math.min(lim2?.max ?? 180, currentVal + compDelta));
            if (next !== currentVal) {
              onModelConfigChangeRef.current?.(targetKey, next);
              triggered.push(`${snakeToCamel(c.joint)}.${snakeToCamel(c.movement)}`);
            }
          }
          drag.compensationsTriggered = triggered;
        }
      }
      return newValue;
    };

    // Task #321: shared release path. Both onMouseUp and the slider HUD
    // drag-end call this so the movement-attempt settle timer fires with
    // the achieved angle and the spring-back tween (which already filters
    // pinned DOFs through captureSpringBack) plays for un-pinned keys.
    const releaseDrag = () => {
      if (!poseDragRef.current) return;
      const drag = poseDragRef.current;
      if (skeletonModeRef.current === 'movement' && drag.activeRow && onActiveMovementAttemptRef.current) {
        const [joint, movement] = drag.configKey.split('.');
        const achievedAngle = drag.lastValue ?? drag.startValue;
        const arc = drag.activeRow.painfulArc;
        const inPainfulArc = !!drag.lastPainfulArc || !!(arc
          && achievedAngle >= Math.min(arc.start, arc.end)
          && achievedAngle <= Math.max(arc.start, arc.end));
        pendingMovementAttemptRef.current = {
          joint,
          movement,
          achievedAngle,
          activeRomMax: drag.activeRow.activeRomMax,
          passiveRomMax: drag.activeRow.passiveRomMax,
          inPainfulArc,
          exceededActiveLimit: !!drag.attemptedExceeded,
          compensationsTriggered: drag.compensationsTriggered ?? [],
        };
        if (movementSettleTimerRef.current !== null) window.clearTimeout(movementSettleTimerRef.current);
        movementSettleTimerRef.current = window.setTimeout(() => {
          const payload = pendingMovementAttemptRef.current;
          pendingMovementAttemptRef.current = null;
          movementSettleTimerRef.current = null;
          if (payload) onActiveMovementAttemptRef.current?.(payload);
        }, 800);
      }
      if (drag.springBackValues) {
        startSpringBack(drag.springBackValues);
      }
      poseDragRef.current = null;
      controls.enabled = true;
      domElement.style.cursor = enablePoseModeRef.current ? 'grab' : '';
      lastPainfulArcStateRef.current = false;
      setMovementMuscleActivation(null);
    };

    // Task #321: imperative API for the slider HUD. Mounted onto a ref so
    // the JSX-rendered chip can call into the same drag pipeline as the
    // mouse handlers without lifting THREE state out of this useEffect.
    sliderHudApiRef.current = {
      getCurrentValue,
      // Wrap so the assignment doesn't enter the temporal dead zone of
      // deselectJoint (declared further down in this useEffect closure).
      deselect: () => deselectJoint(),
      beginDrag: (configKey: string) => {
        // Cancel any pending movement-attempt settle timer + in-flight
        // spring-back so the new slider drag takes precedence cleanly.
        if (movementSettleTimerRef.current !== null) {
          window.clearTimeout(movementSettleTimerRef.current);
          movementSettleTimerRef.current = null;
          pendingMovementAttemptRef.current = null;
        }
        cancelSpringBack();
        // If a previous drag is somehow still active (e.g. arrow drag
        // never released), drop it without recording — the slider takes
        // precedence on its own mouseDown.
        if (poseDragRef.current) {
          poseDragRef.current = null;
          setMovementMuscleActivation(null);
        }
        const startValue = getCurrentValue(configKey);
        const lim = DOF_LIMIT_INDEX.get(configKey);
        let activeRow: {
          activeRomMin: number;
          activeRomMax: number;
          passiveRomMax: number;
          painfulArc: { start: number; end: number; intensity: number } | null;
          painInhibitionFactor: number;
        } | null = null;
        if (skeletonModeRef.current === 'movement' && activeCapacitiesRef.current) {
          const lookupKey = configKey.replace('.', ':');
          const r = activeCapacitiesRef.current[lookupKey];
          if (r) {
            activeRow = {
              activeRomMin: r.activeRomMin ?? 0,
              activeRomMax: r.activeRomMax,
              passiveRomMax: r.passiveRomMax,
              painfulArc: r.painfulArc
                ? { start: r.painfulArc.start, end: r.painfulArc.end, intensity: r.painfulArc.intensity ?? 5 }
                : null,
              painInhibitionFactor: (r as { painInhibitionFactor?: number }).painInhibitionFactor ?? 0,
            };
          }
        }
        poseDragRef.current = {
          configKey,
          startX: 0,
          startY: 0,
          startValue,
          screenDirX: 0,
          screenDirY: 0,
          scale: 1,
          sensitivity: 1,
          label: lim?.label ?? configKey,
          min: lim ? lim.min : -180,
          max: lim ? lim.max : 180,
          activeRow,
          lastValue: startValue,
          attemptedExceeded: false,
          lastPainfulArc: false,
          compensationsTriggered: [],
          springBackValues:
            skeletonModeRef.current === 'movement' && !lockedMovementConfigKeysRef.current.has(configKey)
              ? captureSpringBack(configKey)
              : undefined,
        };
        lastPainfulArcStateRef.current = false;
        controls.enabled = false;
      },
      applyValue: (configKey: string, targetRaw: number) => {
        if (!poseDragRef.current || poseDragRef.current.configKey !== configKey) return;
        applyDragTarget(targetRaw);
      },
      endDrag: () => releaseDrag(),
    };

    // Arrow gizmo helpers --------------------------------------------------
    const ARROW_LENGTH = 0.18;
    const ARROW_BASE_OFFSET = 0.06;
    const ARROW_BASE_COLOR = 0x33ddff;
    const ARROW_HOVER_COLOR = 0xffe066;

    const labelTexCache = new Map<string, THREE.CanvasTexture>();
    const createLabelSprite = (text: string): THREE.Sprite => {
      let tex = labelTexCache.get(text);
      if (!tex) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.fillStyle = '#ccffff';
        ctx.strokeText(text, 64, 32);
        ctx.fillText(text, 64, 32);
        tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        labelTexCache.set(text, tex);
      }
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.09, 0.045, 1);
      sprite.renderOrder = 1003;
      return sprite;
    };

    const createArrow = (def: MovementArrowDef): { group: THREE.Group; pickMesh: THREE.Mesh; visualMats: THREE.MeshBasicMaterial[]; dirNorm: THREE.Vector3 } => {
      const group = new THREE.Group();
      const dir = new THREE.Vector3(def.direction[0], def.direction[1], def.direction[2]).normalize();

      const shaftMat = new THREE.MeshBasicMaterial({ color: ARROW_BASE_COLOR, transparent: true, opacity: 0.85, depthTest: false });
      const headMat = new THREE.MeshBasicMaterial({ color: ARROW_BASE_COLOR, transparent: true, opacity: 0.95, depthTest: false });

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, ARROW_LENGTH * 0.7, 8), shaftMat);
      shaft.position.y = ARROW_BASE_OFFSET + ARROW_LENGTH * 0.35;
      shaft.renderOrder = 1002;
      group.add(shaft);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, ARROW_LENGTH * 0.3, 12), headMat);
      head.position.y = ARROW_BASE_OFFSET + ARROW_LENGTH * 0.85;
      head.renderOrder = 1002;
      group.add(head);

      // Invisible pick proxy (larger cylinder) for forgiving hit-testing
      const pickMat = new THREE.MeshBasicMaterial({ visible: false, depthTest: false });
      const pickMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ARROW_LENGTH + ARROW_BASE_OFFSET, 6), pickMat);
      pickMesh.position.y = ARROW_BASE_OFFSET + ARROW_LENGTH * 0.5;
      pickMesh.renderOrder = 1002;
      group.add(pickMesh);

      // Label sprite at the tip
      const sprite = createLabelSprite(def.label);
      sprite.position.y = ARROW_BASE_OFFSET + ARROW_LENGTH + 0.04;
      group.add(sprite);

      // Default geometry points along +Y; rotate group so +Y aligns with dir
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion();
      const dotUp = up.dot(dir);
      if (dotUp < -0.9999) {
        // Opposite direction: rotate 180° around X
        quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
      } else {
        quat.setFromUnitVectors(up, dir);
      }
      group.quaternion.copy(quat);

      return { group, pickMesh, visualMats: [shaftMat, headMat], dirNorm: dir };
    };

    const disposeArrows = () => {
      if (arrowsGroup) {
        arrowsGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = (m as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
            else (mat as THREE.Material).dispose();
          }
        });
        scene.remove(arrowsGroup);
        arrowsGroup = null;
      }
      arrowPickMeshes = [];
      hoveredArrowIdx = -1;
    };

    const buildArrowsForJoint = (jointKey: string, anchorWorldPos: THREE.Vector3) => {
      disposeArrows();
      const allDefs = JOINT_MOVEMENT_DEFS[jointKey];
      if (!allDefs || allDefs.length === 0) return;
      // Drop arrows whose configKey is not in the canonical DOF registry —
      // this prevents UI controls from claiming to drive movements that the
      // model/sidebar do not actually expose.
      const defs = allDefs.filter((d) => DOF_LIMIT_INDEX.has(d.configKey));
      if (defs.length === 0) return;
      const grp = new THREE.Group();
      grp.position.copy(anchorWorldPos);
      scene.add(grp);
      arrowsGroup = grp;
      defs.forEach((def, idx) => {
        const arr = createArrow(def);
        arr.pickMesh.userData.movementDef = def;
        arr.pickMesh.userData.dirNorm = arr.dirNorm;
        arr.pickMesh.userData.visualMats = arr.visualMats;
        arr.pickMesh.userData.arrowIdx = idx;
        arr.pickMesh.userData.baseColor = ARROW_BASE_COLOR;
        grp.add(arr.group);
        arrowPickMeshes.push({ mesh: arr.pickMesh, def, dirWorld: arr.dirNorm.clone() });
      });
    };

    const setArrowColor = (idx: number, color: number) => {
      if (idx < 0 || idx >= arrowPickMeshes.length) return;
      const mats = arrowPickMeshes[idx].mesh.userData.visualMats as THREE.MeshBasicMaterial[];
      mats?.forEach((m) => m.color.setHex(color));
    };
    const restoreArrowColor = (idx: number) => {
      if (idx < 0 || idx >= arrowPickMeshes.length) return;
      const base = (arrowPickMeshes[idx].mesh.userData.baseColor as number) ?? ARROW_BASE_COLOR;
      setArrowColor(idx, base);
    };

    const findArrowFromRaycast = (ndc: THREE.Vector2): number => {
      if (arrowPickMeshes.length === 0) return -1;
      raycasterRef.current.setFromCamera(ndc, camera);
      const meshes = arrowPickMeshes.map((a) => a.mesh);
      const hits = raycasterRef.current.intersectObjects(meshes, false);
      if (hits.length === 0) return -1;
      return (hits[0].object.userData.arrowIdx as number) ?? -1;
    };

    const computeScreenDir = (anchorWorld: THREE.Vector3, dirWorld: THREE.Vector3): { x: number; y: number } => {
      const a = anchorWorld.clone().project(camera);
      const b = anchorWorld.clone().add(dirWorld).project(camera);
      const rect = domElement.getBoundingClientRect();
      const ax = (a.x + 1) * 0.5 * rect.width;
      const ay = (1 - (a.y + 1) * 0.5) * rect.height;
      const bx = (b.x + 1) * 0.5 * rect.width;
      const by = (1 - (b.y + 1) * 0.5) * rect.height;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / len, y: dy / len };
    };

    // Task #322: imperative deselect — mirrors the background-miss path
    // in the canvas mousedown handler (see "Deselect" branch below). Used
    // by the slider HUD's close button and click-outside listener so the
    // chip, ROM pill, lock badge, glow, and arrows all unmount together.
    // Bails out while any drag is mid-flight so a release outside the
    // chip never closes it.
    const deselectJoint = () => {
      if (poseDragRef.current) return;
      const hadJointSelection = !!selectedJointKey || !!selectedAnchorBoneName;
      const hadBoneSelection = !!selectedBoneSegmentId;
      if (!hadJointSelection && !hadBoneSelection) return;
      removeGlow(selectedGlow);
      selectedGlow = null;
      disposeArrows();
      selectedJointKey = null;
      selectedAnchorBoneName = null;
      selectedBoneSegmentId = null;
      poseSelectedBoneRef.current = null;
      poseHighlightMeshRef.current = null;
      setPoseModeTooltip(null);
      setMovementSelectedJoint(null);
      if (hadBoneSelection) onSelectedBoneSegmentChangeRef.current?.(null);
    };

    const selectJoint = (boneName: string) => {
      const jointKey = getJointKeyFromBone(boneName);
      if (!jointKey) return;
      const hadBoneSelection = !!selectedBoneSegmentId;
      removeGlow(selectedGlow);
      selectedGlow = createGlowSphere(boneName, 0x00ff88, 0.7);
      selectedAnchorBoneName = boneName;
      selectedJointKey = jointKey;
      selectedBoneSegmentId = null;
      poseSelectedBoneRef.current = boneName;
      poseHighlightMeshRef.current = selectedGlow;
      const wp = new THREE.Vector3();
      bones[boneName]?.getWorldPosition(wp);
      buildArrowsForJoint(jointKey, wp);
      if (skeletonModeRef.current === 'movement') {
        const screen = wp.clone().project(camera);
        const rect = domElement.getBoundingClientRect();
        const sx = (screen.x * 0.5 + 0.5) * rect.width;
        const sy = (-screen.y * 0.5 + 0.5) * rect.height;
        setMovementSelectedJoint({ key: jointKey, x: sx, y: sy });
      } else {
        setMovementSelectedJoint(null);
      }
      // Notify any external bone-selection consumer that the bone slot is now
      // empty. Without this, a parent-controlled selection would re-apply on
      // the next sync tick and clobber the joint we just selected.
      if (hadBoneSelection) onSelectedBoneSegmentChangeRef.current?.(null);
    };

    // --- Bone-segment selection (Task #212) ---------------------------------
    const computeBoneSegmentAnchor = (spec: BoneSegmentSpec): THREE.Vector3 | null => {
      const a = bones[spec.proximalBone];
      const b = bones[spec.distalBone];
      if (!a || !b) return null;
      const pa = new THREE.Vector3();
      const pb = new THREE.Vector3();
      a.getWorldPosition(pa);
      b.getWorldPosition(pb);
      return pa.add(pb).multiplyScalar(0.5);
    };

    const buildArrowsForBoneSegment = (spec: BoneSegmentSpec) => {
      disposeArrows();
      const anchor = computeBoneSegmentAnchor(spec);
      if (!anchor) return;
      const defs = spec.morphology.filter((d) => DOF_LIMIT_INDEX.has(d.configKey));
      if (defs.length === 0) return;
      const grp = new THREE.Group();
      grp.position.copy(anchor);
      scene.add(grp);
      arrowsGroup = grp;
      defs.forEach((def, idx) => {
        const arr = createArrow(def);
        arr.pickMesh.userData.movementDef = def;
        arr.pickMesh.userData.dirNorm = arr.dirNorm;
        arr.pickMesh.userData.visualMats = arr.visualMats;
        arr.pickMesh.userData.arrowIdx = idx;
        // Tint morphology arrows blue to differentiate from joint-movement (cyan) arrows
        const morphColor = 0x6699ff;
        arr.pickMesh.userData.baseColor = morphColor;
        arr.visualMats.forEach((m) => m.color.setHex(morphColor));
        grp.add(arr.group);
        arrowPickMeshes.push({ mesh: arr.pickMesh, def, dirWorld: arr.dirNorm.clone() });
      });
    };

    const selectBoneSegment = (spec: BoneSegmentSpec, opts?: { silent?: boolean }) => {
      // Clear any joint selection so the two interactions don't overlap.
      removeGlow(selectedGlow);
      selectedGlow = null;
      selectedJointKey = null;
      selectedAnchorBoneName = null;
      poseSelectedBoneRef.current = null;
      poseHighlightMeshRef.current = null;
      disposeArrows();

      selectedBoneSegmentId = spec.id;
      const anchor = computeBoneSegmentAnchor(spec);
      if (anchor) {
        const geo = new THREE.SphereGeometry(0.05, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.7, depthTest: false });
        selectedGlow = new THREE.Mesh(geo, mat);
        selectedGlow.renderOrder = 1001;
        selectedGlow.position.copy(anchor);
        scene.add(selectedGlow);
        poseHighlightMeshRef.current = selectedGlow;
      }
      buildArrowsForBoneSegment(spec);
      if (!opts?.silent) onSelectedBoneSegmentChangeRef.current?.(spec.id);
    };

    const clearBoneSegmentSelection = (opts?: { silent?: boolean }) => {
      removeGlow(selectedGlow);
      selectedGlow = null;
      disposeArrows();
      selectedBoneSegmentId = null;
      poseHighlightMeshRef.current = null;
      if (!opts?.silent) onSelectedBoneSegmentChangeRef.current?.(null);
    };

    /** Resolve the bone-segment under the cursor, or null. */
    const findBoneSegmentFromRaycast = (ndc: THREE.Vector2): BoneSegmentSpec | null => {
      // Match the clicked bone shaft to a registered pick-bone in
      // BONE_SEGMENT_BY_PICK_BONE. We pick the pick-bone closest to the hit
      // point (or the nearest model-plane projection if no mesh hit).
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(cachedMeshes, true);
      const refPoint = new THREE.Vector3();
      if (hits.length > 0) {
        refPoint.copy(hits[0].point);
      } else {
        const modelCenter = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(model);
        box.getCenter(modelCenter);
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          cameraDir.clone().negate(),
          modelCenter
        );
        if (!raycasterRef.current.ray.intersectPlane(plane, refPoint)) return null;
      }
      const wp = new THREE.Vector3();
      let bestSpec: BoneSegmentSpec | null = null;
      let bestDist = Infinity;
      // 1) Prefer the registered pick-bone closest to the hit. This honors
      //    BONE_SEGMENT_BY_PICK_BONE so the clicked shaft drives the result.
      for (const pickBoneName of Object.keys(BONE_SEGMENT_BY_PICK_BONE)) {
        const bone = bones[pickBoneName];
        if (!bone) continue;
        bone.getWorldPosition(wp);
        const d = refPoint.distanceTo(wp);
        if (d < bestDist) {
          bestDist = d;
          bestSpec = BONE_SEGMENT_BY_PICK_BONE[pickBoneName];
        }
      }
      if (bestSpec && bestDist <= MAX_BONE_DISTANCE) return bestSpec;
      // 2) Fallback: nearest segment midpoint (covers segments whose
      //    pick-bones aren't present in this rig).
      bestSpec = null;
      bestDist = Infinity;
      for (const spec of BONE_SEGMENT_SPECS) {
        const a = bones[spec.proximalBone];
        const b = bones[spec.distalBone];
        if (!a || !b) continue;
        const pa = new THREE.Vector3(); a.getWorldPosition(pa);
        const pb = new THREE.Vector3(); b.getWorldPosition(pb);
        wp.copy(pa).add(pb).multiplyScalar(0.5);
        const d = refPoint.distanceTo(wp);
        if (d < bestDist) {
          bestDist = d;
          bestSpec = spec;
        }
      }
      return bestDist <= MAX_BONE_DISTANCE ? bestSpec : null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!enablePoseModeRef.current) return;

      // Active arrow drag
      if (poseDragRef.current) {
        const dx = e.clientX - poseDragRef.current.startX;
        const dy = e.clientY - poseDragRef.current.startY;
        const along = dx * poseDragRef.current.screenDirX + dy * poseDragRef.current.screenDirY;
        const delta = along * poseDragRef.current.sensitivity * poseDragRef.current.scale;
        // Task #321: hand the unclamped raw target to the shared pipeline
        // so arrow drag and slider drag follow the exact same constraint /
        // friction / painful-arc / exceeded-limit / compensation behaviour.
        const targetRaw = poseDragRef.current.startValue + delta;
        const newValue = applyDragTarget(targetRaw);
        if (newValue == null) return;
        const row = poseDragRef.current.activeRow;
        const exceededActiveLimit = !!poseDragRef.current.attemptedExceeded;
        const inPainfulArc = !!poseDragRef.current.lastPainfulArc;

        const rect = domElement.getBoundingClientRect();
        // In movement mode add a small annotation to the tooltip so
        // the clinician sees why the joint stopped moving.
        let tooltipValue = `${newValue}°`;
        if (skeletonModeRef.current === 'movement' && row) {
          const tag = exceededActiveLimit ? ' • active limit'
            : inPainfulArc ? ' • painful arc' : '';
          tooltipValue = `${newValue}° / ${Math.round(row.activeRomMax)}° active${tag}`;
        }
        setPoseModeTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
          label: poseDragRef.current.label,
          value: tooltipValue,
        });
        return;
      }

      const ndc = getMouseNDC(e);

      // First check arrow hover (when a joint OR bone-segment is selected)
      if (selectedJointKey || selectedBoneSegmentId) {
        const arrowIdx = findArrowFromRaycast(ndc);
        if (arrowIdx !== hoveredArrowIdx) {
          if (hoveredArrowIdx >= 0) restoreArrowColor(hoveredArrowIdx);
          if (arrowIdx >= 0) setArrowColor(arrowIdx, ARROW_HOVER_COLOR);
          hoveredArrowIdx = arrowIdx;
        }
        if (arrowIdx >= 0) {
          const a = arrowPickMeshes[arrowIdx];
          const val = getCurrentValue(a.def.configKey);
          const rect = domElement.getBoundingClientRect();
          setPoseModeTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 40,
            label: a.def.label,
            value: `${val}°`,
          });
          domElement.style.cursor = 'grab';
          // Clear hover-bone glow if any
          if (hoverGlow) { removeGlow(hoverGlow); hoverGlow = null; hoveredBone = null; }
          return;
        }
      }

      // Bone-segment hover when Shift is held: highlight the segment that
      // would be selected and show a "Shift-click for bone" hint.
      if (isShiftHeld) {
        const segSpec = findBoneSegmentFromRaycast(ndc);
        const hoverKey = segSpec ? `seg:${segSpec.id}` : null;
        if (hoverKey !== hoveredBone) {
          removeGlow(hoverGlow);
          hoverGlow = null;
          hoveredBone = hoverKey;
          if (segSpec) {
            const anchor = computeBoneSegmentAnchor(segSpec);
            if (anchor) {
              const geo = new THREE.SphereGeometry(0.04, 16, 16);
              const mat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.45, depthTest: false });
              hoverGlow = new THREE.Mesh(geo, mat);
              hoverGlow.renderOrder = 1001;
              hoverGlow.position.copy(anchor);
              scene.add(hoverGlow);
            }
            domElement.style.cursor = 'pointer';
            const rect = domElement.getBoundingClientRect();
            setPoseModeTooltip({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 40,
              label: segSpec.label,
              value: 'Shift-click: bone',
            });
          } else {
            domElement.style.cursor = '';
            if (!selectedJointKey && !selectedBoneSegmentId) setPoseModeTooltip(null);
          }
        }
        return;
      }

      // Otherwise hover a bone for joint selection
      const boneName = findBoneFromRaycast(ndc);

      if (boneName !== hoveredBone) {
        removeGlow(hoverGlow);
        hoverGlow = null;
        hoveredBone = boneName;

        if (boneName && POSE_BONE_MAP[boneName] && boneName !== selectedAnchorBoneName) {
          hoverGlow = createGlowSphere(boneName, 0x66ffcc, 0.4);
          domElement.style.cursor = 'pointer';
          const jointKey = getJointKeyFromBone(boneName);
          const rect = domElement.getBoundingClientRect();
          setPoseModeTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 40,
            label: jointKey || POSE_BONE_MAP[boneName].label,
            value: 'Click to select',
          });
        } else {
          domElement.style.cursor = '';
          if (!selectedJointKey && !selectedBoneSegmentId) setPoseModeTooltip(null);
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!enablePoseModeRef.current || e.button !== 0) return;
      const ndc = getMouseNDC(e);

      // Arrow drag takes priority when either a joint or bone-segment is selected
      if (selectedJointKey || selectedBoneSegmentId) {
        const arrowIdx = findArrowFromRaycast(ndc);
        if (arrowIdx >= 0) {
          const a = arrowPickMeshes[arrowIdx];
          const anchor = new THREE.Vector3();
          if (selectedBoneSegmentId) {
            const spec = BONE_SEGMENT_BY_ID[selectedBoneSegmentId];
            const segAnchor = spec ? computeBoneSegmentAnchor(spec) : null;
            if (segAnchor) anchor.copy(segAnchor);
          } else if (selectedAnchorBoneName) {
            bones[selectedAnchorBoneName]?.getWorldPosition(anchor);
          }
          const screenDir = computeScreenDir(anchor, a.dirWorld);
          const startValue = getCurrentValue(a.def.configKey);
          const lim = DOF_LIMIT_INDEX.get(a.def.configKey);
          let activeRow: { activeRomMin: number; activeRomMax: number; passiveRomMax: number; painfulArc: { start: number; end: number; intensity: number } | null; painInhibitionFactor: number } | null = null;
          if (skeletonModeRef.current === 'movement' && activeCapacitiesRef.current) {
            const lookupKey = a.def.configKey.replace('.', ':');
            const r = activeCapacitiesRef.current[lookupKey];
            if (r) {
              activeRow = {
                activeRomMin: r.activeRomMin ?? 0,
                activeRomMax: r.activeRomMax,
                passiveRomMax: r.passiveRomMax,
                painfulArc: r.painfulArc
                  ? { start: r.painfulArc.start, end: r.painfulArc.end, intensity: r.painfulArc.intensity ?? 5 }
                  : null,
                painInhibitionFactor: (r as { painInhibitionFactor?: number }).painInhibitionFactor ?? 0,
              };
            }
          }
          if (movementSettleTimerRef.current !== null) {
            window.clearTimeout(movementSettleTimerRef.current);
            movementSettleTimerRef.current = null;
            pendingMovementAttemptRef.current = null;
          }
          // Cancel any in-flight spring-back so a new drag on the same
          // joint takes precedence cleanly.
          cancelSpringBack();
          poseDragRef.current = {
            configKey: a.def.configKey,
            startX: e.clientX,
            startY: e.clientY,
            startValue,
            screenDirX: screenDir.x,
            screenDirY: screenDir.y,
            scale: a.def.scale ?? 1,
            sensitivity: a.def.sensitivity,
            label: a.def.label,
            min: lim ? lim.min : -180,
            max: lim ? lim.max : 180,
            activeRow,
            lastValue: startValue,
            attemptedExceeded: false,
            lastPainfulArc: false,
            compensationsTriggered: [],
            // Movement Mode hold-to-test: snapshot pre-drag values for the
            // dragged DOF + its compensation-chain targets so mouseUp can
            // spring back. Locked joints opt out (value persists).
            springBackValues:
              skeletonModeRef.current === 'movement' && !lockedMovementConfigKeysRef.current.has(a.def.configKey)
                ? captureSpringBack(a.def.configKey)
                : undefined,
          };
          lastPainfulArcStateRef.current = false;
          if (skeletonModeRef.current !== 'movement') setMovementMuscleActivation(null);
          controls.enabled = false;
          domElement.style.cursor = 'grabbing';
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Shift+click selects a bone segment instead of a joint.
      if (isShiftHeld) {
        const segSpec = findBoneSegmentFromRaycast(ndc);
        if (segSpec) {
          selectBoneSegment(segSpec);
          if (hoverGlow) { removeGlow(hoverGlow); hoverGlow = null; hoveredBone = null; }
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // Otherwise: select a joint. In Movement Mode the same mouse-down
      // also begins an immediate hold-to-test drag of the bone's primary
      // degree of freedom, removing the click-to-select-then-click-arrow
      // ceremony (Task #319). In Posture Mode this remains a plain
      // selection — the clinician must subsequently click an arrow.
      const boneName = findBoneFromRaycast(ndc);
      if (boneName && POSE_BONE_MAP[boneName]) {
        selectJoint(boneName);
        if (skeletonModeRef.current === 'movement') {
          const primaryConfigKey = POSE_BONE_MAP[boneName].configKey;
          // selectJoint just rebuilt arrowPickMeshes via buildArrowsForJoint.
          // Pick the arrow matching the bone's primary configKey, preferring
          // the +ve direction (scale != -1) so a flexion bone drags flexion,
          // not extension.
          const candidates = arrowPickMeshes.filter(a => a.def.configKey === primaryConfigKey);
          const primaryArrow = candidates.find(a => (a.def.scale ?? 1) >= 0) ?? candidates[0];
          if (primaryArrow) {
            const anchor = new THREE.Vector3();
            bones[boneName]?.getWorldPosition(anchor);
            const screenDir = computeScreenDir(anchor, primaryArrow.dirWorld);
            const startValue = getCurrentValue(primaryArrow.def.configKey);
            const lim = DOF_LIMIT_INDEX.get(primaryArrow.def.configKey);
            let activeRow: { activeRomMin: number; activeRomMax: number; passiveRomMax: number; painfulArc: { start: number; end: number; intensity: number } | null; painInhibitionFactor: number } | null = null;
            if (activeCapacitiesRef.current) {
              const lookupKey = primaryArrow.def.configKey.replace('.', ':');
              const r = activeCapacitiesRef.current[lookupKey];
              if (r) {
                activeRow = {
                  activeRomMin: r.activeRomMin ?? 0,
                  activeRomMax: r.activeRomMax,
                  passiveRomMax: r.passiveRomMax,
                  painfulArc: r.painfulArc
                    ? { start: r.painfulArc.start, end: r.painfulArc.end, intensity: r.painfulArc.intensity ?? 5 }
                    : null,
                  painInhibitionFactor: (r as { painInhibitionFactor?: number }).painInhibitionFactor ?? 0,
                };
              }
            }
            if (movementSettleTimerRef.current !== null) {
              window.clearTimeout(movementSettleTimerRef.current);
              movementSettleTimerRef.current = null;
              pendingMovementAttemptRef.current = null;
            }
            cancelSpringBack();
            poseDragRef.current = {
              configKey: primaryArrow.def.configKey,
              startX: e.clientX,
              startY: e.clientY,
              startValue,
              screenDirX: screenDir.x,
              screenDirY: screenDir.y,
              scale: primaryArrow.def.scale ?? 1,
              sensitivity: primaryArrow.def.sensitivity,
              label: primaryArrow.def.label,
              min: lim ? lim.min : -180,
              max: lim ? lim.max : 180,
              activeRow,
              lastValue: startValue,
              attemptedExceeded: false,
              lastPainfulArc: false,
              compensationsTriggered: [],
              springBackValues: lockedMovementConfigKeysRef.current.has(primaryArrow.def.configKey)
                ? undefined
                : captureSpringBack(primaryArrow.def.configKey),
            };
            lastPainfulArcStateRef.current = false;
            controls.enabled = false;
            domElement.style.cursor = 'grabbing';
          }
        }
        // clear hover glow now that this bone is selected
        if (hoverGlow) { removeGlow(hoverGlow); hoverGlow = null; hoveredBone = null; }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onMouseUp = (_e: MouseEvent) => {
      // Task #321: delegate to the shared releaseDrag so arrow drag and
      // slider drag run the exact same settle + spring-back path.
      if (poseDragRef.current) releaseDrag();
    };

    const onDblClick = (e: MouseEvent) => {
      if (!enablePoseModeRef.current) return;
      const ndc = getMouseNDC(e);
      // Movement Mode (Task #319): double-click on any draggable bone
      // toggles a per-joint lock. Locked joints skip the spring-back tween
      // on mouseUp, so the clinician can pin a position without holding
      // the mouse. Takes priority over arrow-reset because in Movement
      // Mode a "reset to 0" is meaningless — release already restores.
      if (skeletonModeRef.current === 'movement') {
        const boneName = findBoneFromRaycast(ndc);
        if (boneName && POSE_BONE_MAP[boneName]) {
          const primaryConfigKey = POSE_BONE_MAP[boneName].configKey;
          setLockedMovementConfigKeys(prev => {
            const next = new Set(prev);
            if (next.has(primaryConfigKey)) next.delete(primaryConfigKey);
            else next.add(primaryConfigKey);
            return next;
          });
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      // Reset the DOF associated with a hovered arrow, if any
      if (selectedJointKey || selectedBoneSegmentId) {
        const arrowIdx = findArrowFromRaycast(ndc);
        if (arrowIdx >= 0) {
          const a = arrowPickMeshes[arrowIdx];
          onModelConfigChangeRef.current?.(a.def.configKey, 0);
          setPoseModeTooltip(null);
          return;
        }
      }
      // Otherwise, double-click on empty area / non-arrow deselects the joint or bone
      const boneName = findBoneFromRaycast(ndc);
      if (!boneName || !POSE_BONE_MAP[boneName]) {
        // Deselect (and notify any external bone-selection consumer).
        const hadBoneSelection = !!selectedBoneSegmentId;
        removeGlow(selectedGlow);
        selectedGlow = null;
        disposeArrows();
        selectedJointKey = null;
        selectedAnchorBoneName = null;
        selectedBoneSegmentId = null;
        poseSelectedBoneRef.current = null;
        poseHighlightMeshRef.current = null;
        setPoseModeTooltip(null);
        if (hadBoneSelection) onSelectedBoneSegmentChangeRef.current?.(null);
      }
    };

    /** Apply an externally-controlled bone-segment selection. */
    const applyExternalBoneSelection = (next: BoneSegmentId | null | undefined) => {
      if (next === undefined) return; // uncontrolled
      if (next === selectedBoneSegmentId) return;
      if (next === null) {
        clearBoneSegmentSelection({ silent: true });
        return;
      }
      const spec = BONE_SEGMENT_BY_ID[next];
      if (spec) selectBoneSegment(spec, { silent: true });
    };
    // Sync once on mount in case parent already passed a selection.
    applyExternalBoneSelection(selectedBoneSegmentExternalRef.current);
    // Expose the applier so the prop-driven useEffect below can call it
    // whenever selectedBoneSegmentIdProp changes — no polling required.
    applyExternalBoneSelectionRef.current = applyExternalBoneSelection;

    const poseGlowAnimFrame = { current: 0 };
    // Task #321: throttle the joint-occlusion raycast to ~10 Hz so the
    // per-frame slider-HUD anchor update stays cheap. We cache the last
    // visibility result and reuse it between checks.
    let occlusionFrameCounter = 0;
    let lastJointOccluded = false;
    const animateGlows = () => {
      poseGlowAnimFrame.current = requestAnimationFrame(animateGlows);
      const wp = new THREE.Vector3();
      if (selectedGlow && selectedAnchorBoneName) {
        const bone = bones[selectedAnchorBoneName];
        if (bone) {
          bone.getWorldPosition(wp);
          selectedGlow.position.copy(wp);
          if (arrowsGroup) arrowsGroup.position.copy(wp);
          // Task #321: re-project the selected joint to screen space so
          // the slider HUD chip follows the camera (and the underlying
          // skeleton) on every frame. We write to a ref so this does not
          // force a viewer-wide re-render — the slider HUD reads it via
          // a getter and re-renders itself on its own raf tick.
          if (skeletonModeRef.current === 'movement') {
            const screen = wp.clone().project(camera);
            const rect = domElement.getBoundingClientRect();
            const sx = (screen.x * 0.5 + 0.5) * rect.width;
            const sy = (-screen.y * 0.5 + 0.5) * rect.height;
            // Hide the chip when the joint is behind the camera or
            // outside the canvas — projected NDC.z > 1 means behind.
            const offscreen = screen.z > 1
              || sx < -40 || sy < -40
              || sx > rect.width + 40 || sy > rect.height + 40;
            // Throttled occlusion check: cast camera→joint and see if a
            // body mesh sits clearly in front of the joint. Skipped during
            // an active drag (clinician needs the HUD to stay put even
            // when geometry temporarily occludes the bone mid-motion).
            occlusionFrameCounter = (occlusionFrameCounter + 1) % 6;
            if (occlusionFrameCounter === 0 && !poseDragRef.current) {
              const ndc = new THREE.Vector2(screen.x, screen.y);
              raycasterRef.current.setFromCamera(ndc, camera);
              const camPos = new THREE.Vector3();
              camera.getWorldPosition(camPos);
              const jointDist = camPos.distanceTo(wp);
              const hits = raycasterRef.current.intersectObjects(cachedMeshes, true);
              // Allow a generous epsilon — many bones live just inside
              // the surface, so a hit ≤ jointDist is fine; only flag as
              // occluded when a surface is meaningfully in front.
              const occluder = hits.find(h => h.distance < jointDist - 0.04);
              lastJointOccluded = !!occluder;
            }
            selectedJointAnchorRef.current = (offscreen || lastJointOccluded)
              ? null
              : { x: sx, y: sy };
          } else {
            selectedJointAnchorRef.current = null;
          }
        }
      } else if (selectedGlow && selectedBoneSegmentId) {
        // Track the bone-segment midpoint as the underlying skeleton moves.
        const spec = BONE_SEGMENT_BY_ID[selectedBoneSegmentId];
        const segAnchor = spec ? computeBoneSegmentAnchor(spec) : null;
        if (segAnchor) {
          selectedGlow.position.copy(segAnchor);
          if (arrowsGroup) arrowsGroup.position.copy(segAnchor);
        }
      }
      if (hoverGlow && hoveredBone) {
        if (hoveredBone.startsWith('seg:')) {
          const segId = hoveredBone.slice(4) as BoneSegmentId;
          const spec = BONE_SEGMENT_BY_ID[segId];
          const a = spec ? computeBoneSegmentAnchor(spec) : null;
          if (a) hoverGlow.position.copy(a);
        } else {
          const bone = bones[hoveredBone];
          if (bone) {
            bone.getWorldPosition(wp);
            hoverGlow.position.copy(wp);
          }
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
      applyExternalBoneSelectionRef.current = null;
      // Task #321: tear down the slider HUD API so unmounted-viewer
      // chips can never call into stale closures.
      sliderHudApiRef.current = null;
      selectedJointAnchorRef.current = null;
      if (movementSettleTimerRef.current !== null) {
        window.clearTimeout(movementSettleTimerRef.current);
        movementSettleTimerRef.current = null;
      }
      pendingMovementAttemptRef.current = null;
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelSpringBack();
      removeGlow(hoverGlow);
      removeGlow(selectedGlow);
      disposeArrows();
      labelTexCache.forEach((t) => t.dispose());
      labelTexCache.clear();
      hoverGlow = null;
      selectedGlow = null;
      hoveredBone = null;
      selectedJointKey = null;
      selectedAnchorBoneName = null;
      selectedBoneSegmentId = null;
      poseSelectedBoneRef.current = null;
      poseHighlightMeshRef.current = null;
      poseDragRef.current = null;
      controls.enabled = true;
      domElement.style.cursor = '';
      setPoseModeTooltip(null);
    };
  }, [enablePoseMode, status]);

  // Movement Mode hold-to-test (Task #319): clear all per-joint locks
  // whenever the clinician leaves Movement Mode, so locks don't survive
  // into Posture Mode where they have no meaning.
  useEffect(() => {
    if (skeletonMode !== 'movement') {
      setLockedMovementConfigKeys(prev => (prev.size > 0 ? new Set() : prev));
    }
  }, [skeletonMode]);

  // Prop-driven external bone-selection sync (Task #212). Runs whenever the
  // controlled selection prop changes; the inner pose-mode effect installs
  // applyExternalBoneSelectionRef.current while it's mounted.
  useEffect(() => {
    applyExternalBoneSelectionRef.current?.(selectedBoneSegmentIdProp);
  }, [selectedBoneSegmentIdProp]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (sceneRef.current) return;

    const container = containerRef.current;
    let animationId: number;
    let isDisposed = false;
    let activeXhr: XMLHttpRequest | null = null;

    const init = async () => {
      try {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        const scene = new THREE.Scene();
        const envPreset = getEnvironmentPreset(environmentPreset);
        scene.background = new THREE.Color(envPreset.background);
        if (envPreset.fog) {
          scene.fog = new THREE.Fog(envPreset.fog.color, envPreset.fog.near, envPreset.fog.far);
        }

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

        const nav = navigator as Navigator & { deviceMemory?: number };
        const isLowMemDevice = nav.deviceMemory ? nav.deviceMemory <= 4 : false;
        const initialDPR = isLowMemDevice ? 1.0 : Math.min(window.devicePixelRatio, 1.25);

        const renderer = new THREE.WebGLRenderer({ 
          antialias: false,
          alpha: false,
          powerPreference: 'low-power',
          precision: 'mediump',
          failIfMajorPerformanceCaveat: false
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(initialDPR);
        renderer.shadowMap.enabled = false;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.info.autoReset = false;
        container.appendChild(renderer.domElement);

        renderer.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('WebGL context lost');
          setErrorMessage('WebGL context was lost - please retry');
          setStatus('error');
        });

        const ambientLight = new THREE.AmbientLight(envPreset.ambientLight.color, envPreset.ambientLight.intensity);
        ambientLight.name = '__env_ambient';
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(envPreset.directionalLight.color, envPreset.directionalLight.intensity);
        directionalLight.position.set(...envPreset.directionalLight.position);
        directionalLight.castShadow = false;
        directionalLight.name = '__env_directional';
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(envPreset.backLight.color, envPreset.backLight.intensity);
        backLight.position.set(...envPreset.backLight.position);
        backLight.name = '__env_back';
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

        const gridHelper = new THREE.GridHelper(envPreset.grid.size, envPreset.grid.divisions, envPreset.grid.color1, envPreset.grid.color2);
        gridHelper.position.set(-0.15, -1.2, 0);
        gridHelper.name = '__env_grid';
        scene.add(gridHelper);

        if (envPreset.floor) {
          const floorGeo = new THREE.PlaneGeometry(envPreset.grid.size, envPreset.grid.size);
          const floorMat = new THREE.MeshBasicMaterial({ color: envPreset.floor.color, transparent: true, opacity: envPreset.floor.opacity, side: THREE.DoubleSide });
          const floorMesh = new THREE.Mesh(floorGeo, floorMat);
          floorMesh.rotation.x = -Math.PI / 2;
          floorMesh.position.set(-0.15, -1.21, 0);
          floorMesh.name = '__env_floor';
          scene.add(floorMesh);
        }

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
        
        const processGltf = (gltf: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF) => {
            if (isDisposed) return;
            
            const model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4 / maxDim;
            model.scale.setScalar(scale);
            modelScaleRef.current = scale;
            
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale - 0.5;
            model.position.z = -center.z * scale;
            
            const bones: { [name: string]: THREE.Object3D } = {};
            const boneNames: string[] = [];
            
            const muscleMeshes: THREE.Object3D[] = [];
            
            const BONE_MATERIAL_NAMES = new Set(['lambert4']);
            const MUSCLE_MATERIAL_NAMES = new Set(['Skings', 'lambert2', 'lambert5']);
            const KNOWN_MUSCLE_MESH_NAMES = new Set([
              'Deltoid1', 'supraspinatus', 'Infraspinatus1', 'Lat_Dorsi',
              'Trapezius', 'Trapezius_lower', 'Trapezius_mid', 'Trapezius_upper',
              'Pec_major', 'Pec_minor', 'Teres_major', 'Teres_minor',
              'Levator_scapula', 'Rhomboid_major_minor', 'Gluteus_maximus',
              'Gluteus_medius1', 'Gluteus_Minimus', 'Piriformis',
              'Obturator_externus', 'Quadratus_femoris', 'Gemelli_inferior',
              'Rectus_abdominus', 'External_obliques', 'Internal_obliques',
              'Quadratus_lumborum',
            ]);
            
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                
                const lowerName = child.name.toLowerCase();
                const getMaterialNames = (): string[] => {
                  if (!child.material) return [];
                  if (Array.isArray(child.material)) return child.material.map((m: THREE.Material) => m.name);
                  return [(child.material as THREE.Material).name];
                };
                const matNames = getMaterialNames();
                const isNamedMuscle = KNOWN_MUSCLE_MESH_NAMES.has(child.name);
                const hasMuscleMaterial = matNames.some(n => MUSCLE_MATERIAL_NAMES.has(n));
                const hasBoneMaterial = matNames.length > 0 && matNames.every(n => BONE_MATERIAL_NAMES.has(n));
                const isMuscle = isNamedMuscle || hasMuscleMaterial || !hasBoneMaterial;
                
                if (isMuscle) {
                  muscleMeshes.push(child);
                  child.visible = showMuscles;
                  child.frustumCulled = true;
                  if (child.geometry) {
                    child.geometry.computeBoundingSphere();
                    if (child.geometry.boundingSphere) {
                      child.geometry.boundingSphere.radius = Math.max(child.geometry.boundingSphere.radius * 2.5, 5);
                    }
                  }
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
            
            const materialCache = new Map<string, THREE.Material>();
            model.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const mat = child.material as THREE.Material;
                if (!mat.name) return;
                const cached = materialCache.get(mat.name);
                if (cached && cached !== mat) {
                  mat.dispose();
                  child.material = cached;
                } else {
                  materialCache.set(mat.name, mat);
                }
              }
            });
            
            if (!showMuscles) {
              muscleMeshes.forEach((obj) => {
                const m = obj as THREE.Mesh;
                if (m.geometry) {
                  const key = m.uuid;
                  const origGeo = m.geometry;
                  const savedAttrs: Record<string, { array: ArrayLike<number>; itemSize: number; normalized: boolean }> = {};
                  for (const attrName of Object.keys(origGeo.attributes)) {
                    const attr = origGeo.getAttribute(attrName);
                    if (attr && 'array' in attr) {
                      savedAttrs[attrName] = {
                        array: (attr as THREE.BufferAttribute).array,
                        itemSize: (attr as THREE.BufferAttribute).itemSize,
                        normalized: (attr as THREE.BufferAttribute).normalized,
                      };
                    }
                  }
                  const savedIndex = origGeo.index
                    ? { array: origGeo.index.array, itemSize: origGeo.index.itemSize }
                    : null;
                  const savedBoundingSphere = origGeo.boundingSphere?.clone() || null;
                  hiddenGeometryCacheRef.current.set(key, { attrs: savedAttrs, index: savedIndex, boundingSphere: savedBoundingSphere });
                  origGeo.dispose();
                  const placeholder = new THREE.BufferGeometry();
                  placeholder.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
                  if (savedBoundingSphere) {
                    placeholder.boundingSphere = savedBoundingSphere.clone();
                  }
                  m.geometry = placeholder;
                }
              });
            }

            const textureSet = new Set<THREE.Texture>();
            model.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshLambertMaterial) {
                    if (mat.map) textureSet.add(mat.map);
                    if ((mat as THREE.MeshStandardMaterial).normalMap) textureSet.add((mat as THREE.MeshStandardMaterial).normalMap!);
                    if ((mat as THREE.MeshStandardMaterial).roughnessMap) textureSet.add((mat as THREE.MeshStandardMaterial).roughnessMap!);
                  }
                }
              }
            });
            const textures = Array.from(textureSet);
            if (textures.length > 4) {
              textures.forEach((tex, i) => {
                if (i >= 4) {
                  tex.generateMipmaps = false;
                  tex.minFilter = THREE.LinearFilter;
                }
              });
            }

            model.updateMatrixWorld(true);
            
            boneNames.forEach((name) => {
              const bone = bones[name];
              initialRotationsRef.current[name] = bone.rotation.clone();
              bindPoseQuaternionsRef.current[name] = bone.quaternion.clone();
            });
            console.log(`Model loaded: ${boneNames.length} bones, ${muscleMeshes.length} muscles`);
            
            bonesRef.current = bones;
            muscleMeshesRef.current = muscleMeshes;
            
            model.position.set(-0.15, -1.2, 0);
            scene.add(model);
            model.updateMatrixWorld(true);

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

                muscleHitProxiesRef.current.forEach(p => {
                  p.mesh.geometry.dispose();
                  if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                });
                muscleHitProxiesRef.current = [];
                muscleGroupCentersRef.current.clear();

                const PROXY_SIZES: Record<string, [number, number, number]> = {
                  chest: [1.0, 0.8, 0.5],
                  core: [0.8, 0.7, 0.5],
                  spine: [0.6, 0.8, 0.4],
                  neck: [0.4, 0.5, 0.4],
                  deltoid_l: [0.5, 0.5, 0.5], deltoid_r: [0.5, 0.5, 0.5],
                  scapula_l: [0.5, 0.6, 0.4], scapula_r: [0.5, 0.6, 0.4],
                  bicep_l: [0.4, 0.6, 0.4], bicep_r: [0.4, 0.6, 0.4],
                  glute_l: [0.5, 0.5, 0.5], glute_r: [0.5, 0.5, 0.5],
                  quad_l: [0.5, 0.8, 0.5], quad_r: [0.5, 0.8, 0.5],
                  calf_l: [0.4, 0.7, 0.4], calf_r: [0.4, 0.7, 0.4],
                  shin_l: [0.4, 0.6, 0.4], shin_r: [0.4, 0.6, 0.4],
                  foot_l: [0.4, 0.3, 0.5], foot_r: [0.4, 0.3, 0.5],
                };

                groups.forEach((group, groupId) => {
                  if (groupId === 'other' || group.meshes.length === 0) return;

                  const groupDef = MUSCLE_GROUPS.find(g => g.id === groupId);
                  if (!groupDef || groupDef.bones.length === 0) return;

                  const bonePositions: THREE.Vector3[] = [];
                  for (const boneName of groupDef.bones) {
                    const bone = bones[boneName];
                    if (bone) {
                      const worldPos = new THREE.Vector3();
                      bone.getWorldPosition(worldPos);
                      bonePositions.push(worldPos);
                    }
                  }

                  if (bonePositions.length === 0) return;

                  const groupCenter = new THREE.Vector3();
                  for (const pos of bonePositions) {
                    groupCenter.add(pos);
                  }
                  groupCenter.divideScalar(bonePositions.length);

                  muscleGroupCentersRef.current.set(groupId, groupCenter.clone());

                  const proxySize = PROXY_SIZES[groupId] || [0.5, 0.5, 0.5];
                  const proxyGeo = new THREE.BoxGeometry(proxySize[0], proxySize[1], proxySize[2]);
                  const proxyMat = new THREE.MeshBasicMaterial({
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                  });
                  const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
                  proxyMesh.renderOrder = -1;
                  proxyMesh.userData.muscleGroupId = groupId;

                  const parentBone = bones[groupDef.bones[0]];
                  if (parentBone) {
                    parentBone.updateWorldMatrix(true, false);
                    const boneWorldInverse = new THREE.Matrix4().copy(parentBone.matrixWorld).invert();
                    const localPos = groupCenter.clone().applyMatrix4(boneWorldInverse);
                    proxyMesh.position.copy(localPos);
                    parentBone.add(proxyMesh);
                  } else {
                    proxyMesh.position.copy(groupCenter);
                    scene.add(proxyMesh);
                  }

                  muscleHitProxiesRef.current.push({ mesh: proxyMesh, groupId });
                });

                console.log(`Created ${muscleHitProxiesRef.current.length} muscle hit proxies for improved hover detection`);

              } catch (err) {
                console.error('Failed to split muscle meshes:', err);
              }
            }
            
            legIKStateRef.current = initializeLegIK(bones as { [name: string]: THREE.Bone });
            
            if (sceneRef.current) {
              sceneRef.current.model = model;
            }
            
            setStatus('ready');
            setModelReadyTick(t => t + 1);
            onModelReady?.();
            
            if (initialDPR < window.devicePixelRatio && !isLowMemDevice) {
              const upgradeDPR = () => {
                if (!isDisposed && sceneRef.current) {
                  const targetDPR = Math.min(window.devicePixelRatio, 1.5);
                  sceneRef.current.renderer.setPixelRatio(targetDPR);
                  if (containerRef.current) {
                    sceneRef.current.renderer.setSize(
                      containerRef.current.clientWidth,
                      containerRef.current.clientHeight
                    );
                  }
                }
              };
              if (typeof requestIdleCallback === 'function') {
                setTimeout(() => {
                  if (!isDisposed) requestIdleCallback(upgradeDPR, { timeout: 3000 });
                }, 4000);
              } else {
                setTimeout(upgradeDPR, 5000);
              }
            }
        };

        activeXhr = new XMLHttpRequest();
        const xhr = activeXhr;
        xhr.open('GET', modelPath, true);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setLoadProgress(progress);
            onModelLoadProgress?.(progress);
          } else if (event.loaded) {
            const estimatedTotal = 145000000;
            const progress = Math.min(95, Math.round((event.loaded / estimatedTotal) * 100));
            setLoadProgress(progress);
            onModelLoadProgress?.(progress);
          }
        };
        xhr.onload = () => {
          if (isDisposed) { activeXhr = null; return; }
          if (xhr.status >= 200 && xhr.status < 300) {
            let buffer: ArrayBuffer | null = xhr.response as ArrayBuffer;
            activeXhr = null;
            loader.parse(buffer!, '', (gltf) => {
              buffer = null;
              processGltf(gltf);
            }, (error: unknown) => {
              buffer = null;
              console.error('Error parsing GLB:', error);
              const errorMsg = error instanceof Error ? error.message : String(error);
              setErrorMessage(`Failed to parse model: ${errorMsg || 'Unknown error'}`);
              setStatus('error');
              onModelLoadError?.(`Failed to parse model: ${errorMsg || 'Unknown error'}`);
            });
          } else {
            activeXhr = null;
            setErrorMessage(`Failed to load model: HTTP ${xhr.status}`);
            setStatus('error');
            onModelLoadError?.(`Failed to load model: HTTP ${xhr.status}`);
          }
        };
        xhr.onerror = () => {
          activeXhr = null;
          console.error('Error loading GLB');
          setErrorMessage('Failed to load model: network error');
          setStatus('error');
          onModelLoadError?.('Failed to load model: network error');
        };
        xhr.send();

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
          
          // Apply stored rotations to shoulder bones from sliderRotationsRef
          // Skip when movement animation is playing or live pose is active
          // (live pose useEffect directly sets bone rotations, don't overwrite)
          if (!animationPlayingRef.current && !livePoseActiveRef.current) {
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

          treatmentFrameCounter.current++;
          if (treatmentFrameCounter.current % 5 === 0 && treatmentBoneNamesRef.current && treatmentBoneNamesRef.current.length > 0 && onBoneScreenPositionsRef.current && containerRef.current) {
            const bones = bonesRef.current;
            const cam = sceneRef.current.camera;
            const rect = containerRef.current.getBoundingClientRect();
            const tmpV = new THREE.Vector3();
            const projV2 = new THREE.Vector3();
            const positions: Array<{ boneName: string; screenX: number; screenY: number; visible: boolean }> = [];
            const seenTreatmentBones = new Set<string>();
            for (const boneName of treatmentBoneNamesRef.current) {
              if (seenTreatmentBones.has(boneName)) continue;
              seenTreatmentBones.add(boneName);
              const bone = bones[boneName];
              if (!bone) continue;
              bone.getWorldPosition(tmpV);
              projV2.copy(tmpV).project(cam);
              const sx = (projV2.x * 0.5 + 0.5) * rect.width;
              const sy = (-projV2.y * 0.5 + 0.5) * rect.height;
              const isVisible = projV2.z > 0 && projV2.z < 1 && sx > -50 && sx < rect.width + 50 && sy > -50 && sy < rect.height + 50;
              positions.push({ boneName, screenX: sx, screenY: sy, visible: isVisible });
            }
            onBoneScreenPositionsRef.current(positions);
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
          sceneRef.current.renderer.info.reset();
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
      if (activeXhr) {
        try { activeXhr.abort(); } catch {}
        activeXhr = null;
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      hiddenGeometryCacheRef.current.clear();
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

  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene } = sceneRef.current;
    const env = getEnvironmentPreset(environmentPreset);

    scene.background = new THREE.Color(env.background);

    if (env.fog) {
      scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far);
    } else {
      scene.fog = null;
    }

    const ambient = scene.getObjectByName('__env_ambient') as THREE.AmbientLight | undefined;
    if (ambient) {
      ambient.color.set(env.ambientLight.color);
      ambient.intensity = env.ambientLight.intensity;
    }

    const dir = scene.getObjectByName('__env_directional') as THREE.DirectionalLight | undefined;
    if (dir) {
      dir.color.set(env.directionalLight.color);
      dir.intensity = env.directionalLight.intensity;
      dir.position.set(...env.directionalLight.position);
    }

    const back = scene.getObjectByName('__env_back') as THREE.DirectionalLight | undefined;
    if (back) {
      back.color.set(env.backLight.color);
      back.intensity = env.backLight.intensity;
      back.position.set(...env.backLight.position);
    }

    const oldGrid = scene.getObjectByName('__env_grid') as THREE.GridHelper | undefined;
    if (oldGrid) {
      scene.remove(oldGrid);
      oldGrid.geometry.dispose();
      (oldGrid.material as THREE.Material).dispose();
    }
    const newGrid = new THREE.GridHelper(env.grid.size, env.grid.divisions, env.grid.color1, env.grid.color2);
    newGrid.position.set(-0.15, -1.2, 0);
    newGrid.name = '__env_grid';
    scene.add(newGrid);

    const oldFloor = scene.getObjectByName('__env_floor');
    if (oldFloor) {
      scene.remove(oldFloor);
      if ((oldFloor as THREE.Mesh).geometry) (oldFloor as THREE.Mesh).geometry.dispose();
      if ((oldFloor as THREE.Mesh).material) ((oldFloor as THREE.Mesh).material as THREE.Material).dispose();
    }
    if (env.floor) {
      const floorGeo = new THREE.PlaneGeometry(env.grid.size, env.grid.size);
      const floorMat = new THREE.MeshBasicMaterial({ color: env.floor.color, transparent: true, opacity: env.floor.opacity, side: THREE.DoubleSide });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(-0.15, -1.21, 0);
      floorMesh.name = '__env_floor';
      scene.add(floorMesh);
    }
  }, [environmentPreset]);

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

  useEffect(() => {
    if (status !== 'ready' || !livePose) return;
    
    const bones = bonesRef.current;
    const initialRotations = initialRotationsRef.current;
    
    if (Object.keys(bones).length === 0) return;

    const controllerValues = poseToControllerValues(livePose);
    
    if (!defaultShoulderAnglesRef.current) {
      const lShoulder = modelConfig?.leftShoulder as Record<string, number> | undefined;
      const rShoulder = modelConfig?.rightShoulder as Record<string, number> | undefined;
      const T_POSE_ABDUCTION = -90;
      defaultShoulderAnglesRef.current = {
        left: {
          flexionRad: ((lShoulder?.flexion ?? 0) * Math.PI) / 180,
          abductionRad: ((lShoulder?.abduction ?? T_POSE_ABDUCTION) * Math.PI) / 180,
          intRotRad: ((lShoulder?.internalRotation ?? 0) * Math.PI) / 180,
          extRotRad: ((lShoulder?.externalRotation ?? 0) * Math.PI) / 180,
          retroversionRad: ((lShoulder?.retroversion ?? 0) * Math.PI) / 180,
        },
        right: {
          flexionRad: ((rShoulder?.flexion ?? 0) * Math.PI) / 180,
          abductionRad: ((rShoulder?.abduction ?? T_POSE_ABDUCTION) * Math.PI) / 180,
          intRotRad: ((rShoulder?.internalRotation ?? 0) * Math.PI) / 180,
          extRotRad: ((rShoulder?.externalRotation ?? 0) * Math.PI) / 180,
          retroversionRad: ((rShoulder?.retroversion ?? 0) * Math.PI) / 180,
        },
      };
    }
    const shoulderDefaults = defaultShoulderAnglesRef.current;

    const livePoseConfig: { [key: string]: number } = {
      'leftShoulder.flexion': shoulderDefaults.left.flexionRad + controllerValues.leftShoulder.flexion,
      'leftShoulder.abduction': shoulderDefaults.left.abductionRad + controllerValues.leftShoulder.abduction,
      'leftShoulder.internalRotation': shoulderDefaults.left.intRotRad + controllerValues.leftShoulder.internalRotation,
      'leftShoulder.externalRotation': shoulderDefaults.left.extRotRad,
      'leftShoulder.retroversion': shoulderDefaults.left.retroversionRad,
      'rightShoulder.flexion': shoulderDefaults.right.flexionRad + controllerValues.rightShoulder.flexion,
      'rightShoulder.abduction': shoulderDefaults.right.abductionRad + controllerValues.rightShoulder.abduction,
      'rightShoulder.internalRotation': shoulderDefaults.right.intRotRad + controllerValues.rightShoulder.internalRotation,
      'rightShoulder.externalRotation': shoulderDefaults.right.extRotRad,
      'rightShoulder.retroversion': shoulderDefaults.right.retroversionRad,
      'leftElbow.flexion': controllerValues.leftElbow.flexion,
      'rightElbow.flexion': controllerValues.rightElbow.flexion,
      'leftHip.flexion': controllerValues.leftHip.flexion,
      'leftHip.abduction': controllerValues.leftHip.abduction,
      'rightHip.flexion': controllerValues.rightHip.flexion,
      'rightHip.abduction': controllerValues.rightHip.abduction,
      'leftKnee.flexion': controllerValues.leftKnee.flexion,
      'rightKnee.flexion': controllerValues.rightKnee.flexion,
      'leftAnkle.dorsiflexion': controllerValues.leftAnkle.dorsiflexion,
      'rightAnkle.dorsiflexion': controllerValues.rightAnkle.dorsiflexion,
      'leftWrist.flexion': controllerValues.leftWrist.flexion,
      'rightWrist.flexion': controllerValues.rightWrist.flexion,
      'pelvis.tilt': controllerValues.pelvis.tilt,
      'pelvis.obliquity': controllerValues.pelvis.obliquity,
      'spine.flexion': controllerValues.spine.flexion,
      'spine.lateralFlexion': controllerValues.spine.lateralFlexion,
      'neck.flexion': controllerValues.neck.flexion,
      'neck.rotation': controllerValues.neck.rotation,
      'neck.lateralFlexion': controllerValues.neck.lateralFlexion,
    };
    
    const boneRotationDeltas: { [boneName: string]: { x: number; y: number; z: number } } = {};
    const customAxisAccum: { [boneName: string]: { axis: THREE.Vector3; angle: number } } = {};
    
    Object.entries(livePoseConfig).forEach(([configKey, value]) => {
      const mappings = BONE_MAPPING[configKey];
      if (!mappings) return;
      
      mappings.forEach(({ boneName, axis, scale, isPosition, customAxis }) => {
        if (isPosition) return;
        
        const adjustedAngle = value * scale;
        
        if (customAxis) {
          if (!customAxisAccum[boneName]) {
            customAxisAccum[boneName] = { axis: new THREE.Vector3(customAxis.x, customAxis.y, customAxis.z).normalize(), angle: 0 };
          }
          customAxisAccum[boneName].angle += adjustedAngle;
        } else {
          if (!boneRotationDeltas[boneName]) {
            boneRotationDeltas[boneName] = { x: 0, y: 0, z: 0 };
          }
          if (axis === 'x') boneRotationDeltas[boneName].x += adjustedAngle;
          else if (axis === 'y') boneRotationDeltas[boneName].y += adjustedAngle;
          else if (axis === 'z') boneRotationDeltas[boneName].z += adjustedAngle;
        }
      });
    });
    
    Object.entries(customAxisAccum).forEach(([boneName, { axis: axisVec, angle }]) => {
      const initial = initialRotations[boneName];
      if (!initial) return;
      const initQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
      );
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);
      const resultQuat = new THREE.Quaternion().multiplyQuaternions(deltaQuat, initQuat);
      const resultEuler = new THREE.Euler().setFromQuaternion(resultQuat, 'XYZ');
      if (!boneRotationDeltas[boneName]) {
        boneRotationDeltas[boneName] = { x: 0, y: 0, z: 0 };
      }
      boneRotationDeltas[boneName].x += resultEuler.x - initial.x;
      boneRotationDeltas[boneName].y += resultEuler.y - initial.y;
      boneRotationDeltas[boneName].z += resultEuler.z - initial.z;
    });
    
    const animationLoopBones = new Set(['Shoulder_L', 'Shoulder_R', 'ShoulderPart1_L', 'ShoulderPart1_R']);
    const quaternionComposeBones = new Set(['Hip_L', 'Hip_R', 'Shoulder_L', 'Shoulder_R']);

    Object.entries(boneRotationDeltas).forEach(([boneName, delta]) => {
      const bone = bones[boneName] as THREE.Bone;
      const initial = initialRotations[boneName];
      if (!bone || !initial) return;
      
      if (quaternionComposeBones.has(boneName)) {
        const initialQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(delta.x, delta.y, delta.z, 'XYZ')
        );
        const targetQuat = initialQuat.clone().multiply(deltaQuat);
        const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
        bone.rotation.set(targetEuler.x, targetEuler.y, targetEuler.z);
        if (animationLoopBones.has(boneName)) {
          sliderRotationsRef.current[boneName] = {
            x: targetEuler.x - initial.x,
            y: targetEuler.y - initial.y,
            z: targetEuler.z - initial.z
          };
        }
      } else if (animationLoopBones.has(boneName)) {
        bone.rotation.set(
          initial.x + delta.x,
          initial.y + delta.y,
          initial.z + delta.z
        );
        sliderRotationsRef.current[boneName] = { x: delta.x, y: delta.y, z: delta.z };
      } else {
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
    
    if (wasLivePoseActive && isNowInactive && status === 'ready') {
      const bones = bonesRef.current;
      const initialRotations = initialRotationsRef.current;
      const sliderRotations = sliderRotationsRef.current;
      const quatComposeBones = new Set(['Hip_L', 'Hip_R', 'Shoulder_L', 'Shoulder_R']);
      
      LIVE_CONTROLLED_BONES.forEach(boneName => {
        const bone = bones[boneName] as THREE.Bone;
        const initial = initialRotations[boneName];
        if (!bone || !initial) return;
        
        const sliderOffset = sliderRotations[boneName] || { x: 0, y: 0, z: 0 };
        
        if (quatComposeBones.has(boneName)) {
          const initialQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
          );
          const deltaQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(sliderOffset.x, sliderOffset.y, sliderOffset.z, 'XYZ')
          );
          const targetQuat = initialQuat.clone().multiply(deltaQuat);
          const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
          bone.rotation.set(targetEuler.x, targetEuler.y, targetEuler.z);
        } else {
          bone.rotation.set(
            initial.x + sliderOffset.x,
            initial.y + sliderOffset.y,
            initial.z + sliderOffset.z
          );
        }
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
      
      mappings.forEach(({ boneName, axis, scale, isPosition, customAxis }) => {
        if (isPosition) {
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
          const adjustedAngle = angleInRadians * scale;
          
          if (animationLoopBones.has(boneName)) {
            if (customAxis) {
              applyCustomAxisRotation(sliderOnlyRotations, boneName, customAxis, adjustedAngle, { [boneName]: { x: 0, y: 0, z: 0 } });
            } else {
              if (axis === 'x') {
                sliderOnlyRotations[boneName].x += adjustedAngle;
              } else if (axis === 'y') {
                sliderOnlyRotations[boneName].y += adjustedAngle;
              } else if (axis === 'z') {
                sliderOnlyRotations[boneName].z += adjustedAngle;
              }
            }
          } else {
            if (!boneRotations[boneName]) return;
            if (customAxis) {
              applyCustomAxisRotation(boneRotations, boneName, customAxis, adjustedAngle, initialRotations);
            } else {
              if (axis === 'x') {
                boneRotations[boneName].x += adjustedAngle;
              } else if (axis === 'y') {
                boneRotations[boneName].y += adjustedAngle;
              } else if (axis === 'z') {
                boneRotations[boneName].z += adjustedAngle;
              }
            }
          }
        }
      });
    });
    
    // Quaternion composition for shoulder and hip bones to match camera path behavior
    // Prevents Euler gimbal issues when multiple rotations are combined (e.g. flexion + abduction)
    const quaternionComposeBones = new Set(['Shoulder_L', 'Shoulder_R', 'Hip_L', 'Hip_R']);
    
    quaternionComposeBones.forEach(boneName => {
      const initial = initialRotations[boneName];
      if (!initial) return;
      
      if (animationLoopBones.has(boneName)) {
        const delta = sliderOnlyRotations[boneName];
        if (!delta || (Math.abs(delta.x) < 0.001 && Math.abs(delta.y) < 0.001 && Math.abs(delta.z) < 0.001)) return;
        const initialQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(delta.x, delta.y, delta.z, 'XYZ')
        );
        const targetQuat = initialQuat.clone().multiply(deltaQuat);
        const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
        sliderOnlyRotations[boneName] = {
          x: targetEuler.x - initial.x,
          y: targetEuler.y - initial.y,
          z: targetEuler.z - initial.z
        };
      } else {
        const rot = boneRotations[boneName];
        if (!rot) return;
        const dx = rot.x - initial.x;
        const dy = rot.y - initial.y;
        const dz = rot.z - initial.z;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001 && Math.abs(dz) < 0.001) return;
        const initialQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(dx, dy, dz, 'XYZ')
        );
        const targetQuat = initialQuat.clone().multiply(deltaQuat);
        const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
        boneRotations[boneName] = {
          x: targetEuler.x,
          y: targetEuler.y,
          z: targetEuler.z
        };
      }
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

  useEffect(() => {
    livePoseActiveRef.current = livePose !== null;
    if (livePose === null) {
      defaultShoulderAnglesRef.current = null;
    }
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
          mappings.forEach(({ boneName, axis, scale, isPosition, customAxis }) => {
            if (isPosition) return;
            const adjustedAngle = angleInRadians * scale;
            if (!animBoneRotations[boneName]) return;
            if (customAxis) {
              applyCustomAxisRotation(animBoneRotations, boneName, customAxis, adjustedAngle, initialRotations);
            } else {
              if (axis === 'x') animBoneRotations[boneName].x += adjustedAngle;
              else if (axis === 'y') animBoneRotations[boneName].y += adjustedAngle;
              else if (axis === 'z') animBoneRotations[boneName].z += adjustedAngle;
            }
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
          
          mappings.forEach(({ boneName, axis, scale, isPosition, customAxis }) => {
            if (isPosition) {
              const positionOffset = value * scale;
              if (!animBonePositions[boneName]) {
                animBonePositions[boneName] = { x: 0, y: 0, z: 0 };
              }
              if (axis === 'x') animBonePositions[boneName].x += positionOffset;
              else if (axis === 'y') animBonePositions[boneName].y += positionOffset;
              else if (axis === 'z') animBonePositions[boneName].z += positionOffset;
            } else {
              const adjustedAngle = angleInRadians * scale;
              if (!animBoneRotations[boneName]) {
                const initial = initialRotations[boneName];
                animBoneRotations[boneName] = initial ? { ...initial } : { x: 0, y: 0, z: 0 };
              }
              if (customAxis) {
                applyCustomAxisRotation(animBoneRotations, boneName, customAxis, adjustedAngle, initialRotations);
              } else {
                if (axis === 'x') animBoneRotations[boneName].x += adjustedAngle;
                else if (axis === 'y') animBoneRotations[boneName].y += adjustedAngle;
                else if (axis === 'z') animBoneRotations[boneName].z += adjustedAngle;
              }
            }
          });
        });
      });
      
      // Quaternion composition for shoulder and hip bones (matches slider and camera paths)
      ['Shoulder_L', 'Shoulder_R', 'Hip_L', 'Hip_R'].forEach(boneName => {
        const initial = initialRotations[boneName];
        const anim = animBoneRotations[boneName];
        if (!initial || !anim) return;
        
        const dx = anim.x - initial.x;
        const dy = anim.y - initial.y;
        const dz = anim.z - initial.z;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001 && Math.abs(dz) < 0.001) return;
        
        const initialQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(dx, dy, dz, 'XYZ')
        );
        const targetQuat = initialQuat.clone().multiply(deltaQuat);
        const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
        
        anim.x = targetEuler.x;
        anim.y = targetEuler.y;
        anim.z = targetEuler.z;
      });
      
      const pelvisDropValue = jointValues['pelvis']?.['drop'] || 0;
      const pelvisZShiftValue = jointValues['pelvis']?.['zShift'] || 0;
      const isClosedChainMovement = movement.useIK === true && legIKStateRef.current?.initialized;
      
      if (isClosedChainMovement && legIKStateRef.current) {
        const pelvisBone = bones['Root_M'] as THREE.Bone;
        const ikState = legIKStateRef.current;
        const leftThigh = ikState.leftLegLengths?.thighLength || 0.5;
        const leftShin = ikState.leftLegLengths?.shinLength || 0.5;
        const rightThigh = ikState.rightLegLengths?.thighLength || 0.5;
        const rightShin = ikState.rightLegLengths?.shinLength || 0.5;
        const totalLegLength = leftThigh + leftShin;
        
        const dropFraction = Math.max(0, Math.min(1, pelvisDropValue / 100));
        const dropAmount = dropFraction * totalLegLength * 0.55;
        const zShiftFraction = pelvisZShiftValue / 100;
        const footShiftAmount = zShiftFraction * totalLegLength * 0.35;
        const mScale = modelScaleRef.current || 0.02;
        
        const pelvisBoneNames = ['Root_M', 'RootPart1_M', 'RootPart2_M'];
        pelvisBoneNames.forEach(boneName => {
          const rotation = animBoneRotations[boneName];
          if (rotation) {
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
        
        const computeLegAngles = (thighL: number, shinL: number, drop: number, footZOffset: number): { hipAngle: number; kneeAngle: number } => {
          if (drop < 0.001 && Math.abs(footZOffset) < 0.001) {
            return { hipAngle: 0, kneeAngle: 0 };
          }
          const verticalDist = (thighL + shinL) - drop;
          const hipToFoot = Math.sqrt(verticalDist * verticalDist + footZOffset * footZOffset);
          const clampedDist = Math.max(Math.abs(thighL - shinL) + 0.01, Math.min(thighL + shinL - 0.01, hipToFoot));
          
          const cosKnee = (thighL * thighL + shinL * shinL - clampedDist * clampedDist) / (2 * thighL * shinL);
          const kneeAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosKnee)));
          
          const cosHip = (thighL * thighL + clampedDist * clampedDist - shinL * shinL) / (2 * thighL * clampedDist);
          const hipAngleFromTarget = Math.acos(Math.max(-1, Math.min(1, cosHip)));
          
          const footAngle = Math.atan2(footZOffset, verticalDist);
          const hipAngle = hipAngleFromTarget + footAngle;
          
          return { hipAngle, kneeAngle };
        };
        
        const leftAngles = computeLegAngles(leftThigh, leftShin, dropAmount, footShiftAmount);
        const rightAngles = computeLegAngles(rightThigh, rightShin, dropAmount, -footShiftAmount);
        
        if (pelvisBone) {
          if (!(pelvisBone as any).initialPosition) {
            (pelvisBone as any).initialPosition = pelvisBone.position.clone();
          }
          const initialPos = (pelvisBone as any).initialPosition as THREE.Vector3;
          pelvisBone.position.y = initialPos.y - dropAmount / mScale;
          
          const leftShinAngle = leftAngles.hipAngle - leftAngles.kneeAngle;
          const rightShinAngle = rightAngles.hipAngle - rightAngles.kneeAngle;
          const avgAnkleZ = 0.5 * (
            leftThigh * Math.sin(leftAngles.hipAngle) + leftShin * Math.sin(leftShinAngle) +
            rightThigh * Math.sin(rightAngles.hipAngle) + rightShin * Math.sin(rightShinAngle)
          );
          pelvisBone.position.z = initialPos.z - avgAnkleZ / mScale;
        }
        
        const applyFlexionQuaternion = (
          bone: THREE.Bone, 
          initial: { x: number; y: number; z: number }, 
          angle: number
        ) => {
          if (Math.abs(angle) < 0.001) {
            bone.rotation.set(initial.x, initial.y, initial.z);
            return;
          }
          if (!bone.parent) {
            bone.rotation.set(initial.x, initial.y, initial.z);
            return;
          }
          bone.parent.updateWorldMatrix(true, false);
          const parentWorldQ = new THREE.Quaternion();
          bone.parent.getWorldQuaternion(parentWorldQ);
          const parentWorldQInv = parentWorldQ.clone().invert();
          const worldFlexAxis = new THREE.Vector3(-1, 0, 0);
          const localFlexAxis = worldFlexAxis.clone().applyQuaternion(parentWorldQInv).normalize();
          const qInit = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(initial.x, initial.y, initial.z, 'XYZ')
          );
          const qFlex = new THREE.Quaternion().setFromAxisAngle(localFlexAxis, angle);
          const qResult = new THREE.Quaternion().multiplyQuaternions(qFlex, qInit);
          const eulerResult = new THREE.Euler().setFromQuaternion(qResult, 'XYZ');
          bone.rotation.set(eulerResult.x, eulerResult.y, eulerResult.z);
        };
        
        const legBones = [
          { hip: 'Hip_L', knee: 'Knee_L', ankle: 'Ankle_L', angles: leftAngles },
          { hip: 'Hip_R', knee: 'Knee_R', ankle: 'Ankle_R', angles: rightAngles },
        ];
        
        legBones.forEach(({ hip, knee, ankle, angles }) => {
          const hipBone = bones[hip] as THREE.Bone;
          const kneeBone = bones[knee] as THREE.Bone;
          const ankleBone = bones[ankle] as THREE.Bone;
          const hipInitial = initialRotations[hip];
          const kneeInitial = initialRotations[knee];
          const ankleInitial = initialRotations[ankle];
          
          if (hipBone && hipInitial) {
            applyFlexionQuaternion(hipBone, hipInitial, angles.hipAngle);
            hipBone.updateWorldMatrix(true, false);
          }
          if (kneeBone && kneeInitial) {
            applyFlexionQuaternion(kneeBone, kneeInitial, -angles.kneeAngle);
            kneeBone.updateWorldMatrix(true, false);
          }
          if (ankleBone && ankleInitial) {
            const ankleDorsiflexion = angles.kneeAngle - angles.hipAngle;
            applyFlexionQuaternion(ankleBone, ankleInitial, ankleDorsiflexion);
          }
        });
        
        if (pelvisBone) {
          pelvisBone.updateMatrixWorld(true);
          const leftAnkleBone = bones['Ankle_L'] as THREE.Bone;
          const rightAnkleBone = bones['Ankle_R'] as THREE.Bone;
          if (leftAnkleBone && rightAnkleBone && ikState.leftInitialFootPos && ikState.rightInitialFootPos) {
            const actualLeftPos = new THREE.Vector3();
            const actualRightPos = new THREE.Vector3();
            leftAnkleBone.getWorldPosition(actualLeftPos);
            rightAnkleBone.getWorldPosition(actualRightPos);
            const actualLowestY = Math.min(actualLeftPos.y, actualRightPos.y);
            const targetLowestY = Math.min(ikState.leftInitialFootPos.y, ikState.rightInitialFootPos.y);
            const footYError = actualLowestY - targetLowestY;
            if (Math.abs(footYError) > 0.001) {
              pelvisBone.position.y -= footYError / mScale;
            }
            const avgActualZ = 0.5 * (actualLeftPos.z + actualRightPos.z);
            const avgTargetZ = 0.5 * (ikState.leftInitialFootPos.z + ikState.rightInitialFootPos.z);
            const footZError = avgActualZ - avgTargetZ;
            if (Math.abs(footZError) > 0.001) {
              pelvisBone.position.z -= footZError / mScale;
            }
          }
        }
        
        Object.entries(animBoneRotations).forEach(([boneName, rotation]) => {
          if (boneName.includes('Hip') || boneName.includes('Knee') || boneName.includes('Toes') || boneName.includes('Ankle')) {
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
        
        if (pelvisBone) {
          pelvisBone.updateMatrixWorld(true);
          const leftAnkleBone = bones['Ankle_L'] as THREE.Bone;
          const rightAnkleBone = bones['Ankle_R'] as THREE.Bone;
          if (leftAnkleBone && rightAnkleBone && ikState.leftInitialFootPos && ikState.rightInitialFootPos) {
            const postLeftPos = new THREE.Vector3();
            const postRightPos = new THREE.Vector3();
            leftAnkleBone.getWorldPosition(postLeftPos);
            rightAnkleBone.getWorldPosition(postRightPos);
            const postLowestY = Math.min(postLeftPos.y, postRightPos.y);
            const targetLowestY = Math.min(ikState.leftInitialFootPos.y, ikState.rightInitialFootPos.y);
            const postYError = postLowestY - targetLowestY;
            if (Math.abs(postYError) > 0.001) {
              pelvisBone.position.y -= postYError / mScale;
            }
            const postAvgZ = 0.5 * (postLeftPos.z + postRightPos.z);
            const postTargetZ = 0.5 * (ikState.leftInitialFootPos.z + ikState.rightInitialFootPos.z);
            const postZError = postAvgZ - postTargetZ;
            if (Math.abs(postZError) > 0.001) {
              pelvisBone.position.z -= postZError / mScale;
            }
            pelvisBone.updateMatrixWorld(true);
            
            if (footGroundDebugRef.current % 60 === 0 && dropFraction > 0.01) {
              leftAnkleBone.getWorldPosition(postLeftPos);
              rightAnkleBone.getWorldPosition(postRightPos);
              const finalYErr = Math.min(postLeftPos.y, postRightPos.y) - targetLowestY;
              console.log(`[SquatIK] drop=${(dropFraction*100).toFixed(0)}% pelvisLocalY=${pelvisBone.position.y.toFixed(1)} ankleYErr=${finalYErr.toFixed(4)} scale=${mScale.toFixed(4)}`);
            }
            footGroundDebugRef.current++;
          }
        }
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
      
      const progressRef = animationProgressRef.current;
      if (progressRef.callback && currentTime - progressRef.lastReport > 80) {
        progressRef.lastReport = currentTime;
        progressRef.callback(normalizedTime);
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

    const effectiveActivation = (skeletonMode === 'movement' && movementMuscleActivation)
      ? movementMuscleActivation
      : (muscleActivation || {});
    const showMuscles = muscleVisibility?.enabled || (skeletonMode === 'movement' && !!movementMuscleActivation);
    if (showMuscles) {
      muscleVisualizationRef.current.setShowLabels(muscleVisibility?.showLabels || false);
      muscleVisualizationRef.current.updateMuscles(
        effectiveActivation,
        {
          quadriceps: muscleVisibility?.quadriceps ?? true,
          hamstrings: muscleVisibility?.hamstrings ?? true,
          adductors: muscleVisibility?.adductors ?? true,
          calf: muscleVisibility?.calf ?? true,
          shin: muscleVisibility?.shin ?? true,
          lateral: muscleVisibility?.lateral ?? true,
          other: muscleVisibility?.other ?? true
        }
      );
    } else {
      muscleVisualizationRef.current.clearMuscles();
    }

    return () => {
      // Clear visualization when component updates
    };
  }, [muscleVisibility, muscleActivation, status, skeletonMode, movementMuscleActivation]);

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
    if (showMuscles && hiddenGeometryCacheRef.current.size > 0) {
      muscleMeshesRef.current.forEach((obj) => {
        const m = obj as THREE.Mesh;
        const cached = hiddenGeometryCacheRef.current.get(m.uuid);
        if (cached) {
          const placeholder = m.geometry;
          const rebuilt = new THREE.BufferGeometry();
          for (const [attrName, data] of Object.entries(cached.attrs)) {
            const typedArray = data.array instanceof Float32Array ? data.array
              : data.array instanceof Uint16Array ? data.array
              : data.array instanceof Uint8Array ? data.array
              : data.array instanceof Int16Array ? data.array
              : new Float32Array(data.array as number[]);
            rebuilt.setAttribute(attrName, new THREE.BufferAttribute(
              typedArray,
              data.itemSize,
              data.normalized
            ));
          }
          if (cached.index) {
            rebuilt.setIndex(new THREE.BufferAttribute(
              cached.index.array instanceof Uint16Array ? cached.index.array
                : cached.index.array instanceof Uint32Array ? cached.index.array
                : new Uint16Array(cached.index.array as number[]),
              cached.index.itemSize
            ));
          }
          if (cached.boundingSphere) {
            rebuilt.boundingSphere = cached.boundingSphere.clone();
          }
          rebuilt.computeBoundingSphere();
          m.geometry = rebuilt;
          placeholder.dispose();
          hiddenGeometryCacheRef.current.delete(m.uuid);
        }
      });
    }
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
      const colorHex = muscleHighlightColors?.[groupId] || '#00ffff';
      for (const mesh of group.meshes) {
        if (mesh instanceof THREE.Mesh) {
          const origMat = mesh.material as THREE.MeshStandardMaterial;
          if (origMat) {
            const clonedMat = origMat.clone() as THREE.MeshStandardMaterial;
            clonedMat.emissive = new THREE.Color(colorHex);
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
  }, [highlightMuscleGroups, muscleHighlightColors]);

  const dermatomeHighlightRef = useRef<Array<{ mesh: THREE.Mesh; origMaterial: THREE.Material; wasVisible: boolean }>>([]);

  useEffect(() => {
    for (const entry of dermatomeHighlightRef.current) {
      const clonedMat = entry.mesh.material as THREE.MeshStandardMaterial;
      entry.mesh.material = entry.origMaterial;
      if (!entry.wasVisible) entry.mesh.visible = false;
      clonedMat.dispose();
    }
    dermatomeHighlightRef.current = [];

    if (!dermatomeHighlightBones || dermatomeHighlightBones.length === 0) return;
    if (!sceneRef.current) return;

    const bRef = bonesRef.current;
    const highlightColor = new THREE.Color(0x44aaff);

    for (const boneName of dermatomeHighlightBones) {
      const bone = bRef[boneName];
      if (!bone) continue;

      bone.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material) && child.material instanceof THREE.MeshStandardMaterial) {
          const origMat = child.material;
          const clonedMat = origMat.clone();
          clonedMat.emissive = highlightColor;
          clonedMat.emissiveIntensity = 0.6;
          clonedMat.transparent = true;
          clonedMat.opacity = 0.7;
          clonedMat.needsUpdate = true;

          dermatomeHighlightRef.current.push({
            mesh: child,
            origMaterial: origMat,
            wasVisible: child.visible,
          });

          child.material = clonedMat;
          child.visible = true;
        }
      });
    }
  }, [dermatomeHighlightBones]);

  const nerveRootLabelSpritesRef = useRef<THREE.Sprite[]>([]);

  useEffect(() => {
    for (const sprite of nerveRootLabelSpritesRef.current) {
      sprite.parent?.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    nerveRootLabelSpritesRef.current = [];

    if (!nerveRootLabels || nerveRootLabels.length === 0) return;
    if (!sceneRef.current) return;

    const bRef = bonesRef.current;

    for (const { root, boneName } of nerveRootLabels) {
      const bone = bRef[boneName];
      if (!bone) continue;

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = 'rgba(30, 30, 60, 0.85)';
      ctx.beginPath();
      ctx.roundRect(4, 4, 120, 56, 10);
      ctx.fill();
      ctx.strokeStyle = '#44aaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(4, 4, 120, 56, 10);
      ctx.stroke();

      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = '#88ccff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(root, 64, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.08, 0.04, 1);
      sprite.position.set(0.03, 0.02, 0);
      sprite.renderOrder = 999;

      bone.add(sprite);
      nerveRootLabelSpritesRef.current.push(sprite);
    }
  }, [nerveRootLabels]);

  const referralZoneHighlightRef = useRef<Array<{ mesh: THREE.Mesh; origMaterial: THREE.Material; wasVisible: boolean }>>([]);

  useEffect(() => {
    for (const entry of referralZoneHighlightRef.current) {
      const clonedMat = entry.mesh.material as THREE.MeshStandardMaterial;
      entry.mesh.material = entry.origMaterial;
      if (!entry.wasVisible) entry.mesh.visible = false;
      clonedMat.dispose();
    }
    referralZoneHighlightRef.current = [];

    if (!referralZoneBones || referralZoneBones.length === 0) return;
    if (!sceneRef.current) return;

    const bRef = bonesRef.current;
    const referralColor = new THREE.Color(0xff6644);

    for (const boneName of referralZoneBones) {
      const bone = bRef[boneName];
      if (!bone) continue;

      bone.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material) && child.material instanceof THREE.MeshStandardMaterial) {
          const origMat = child.material;
          const clonedMat = origMat.clone();
          clonedMat.emissive = referralColor;
          clonedMat.emissiveIntensity = 0.5;
          clonedMat.transparent = true;
          clonedMat.opacity = 0.5;
          clonedMat.needsUpdate = true;

          referralZoneHighlightRef.current.push({
            mesh: child,
            origMaterial: origMat,
            wasVisible: child.visible,
          });

          child.material = clonedMat;
          child.visible = true;
        }
      });
    }
  }, [referralZoneBones]);

  const tissueViewHighlightRef = useRef<Array<{ mesh: THREE.Mesh; origMaterial: THREE.Material; wasVisible: boolean }>>([]);
  const tissueMarkerMeshesRef = useRef<THREE.Object3D[]>([]);
  const tissuePathwayLinesRef = useRef<THREE.Object3D[]>([]);
  const tissueLoadIndicatorsRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    for (const entry of tissueViewHighlightRef.current) {
      const clonedMat = entry.mesh.material as THREE.MeshStandardMaterial;
      entry.mesh.material = entry.origMaterial;
      if (!entry.wasVisible) entry.mesh.visible = false;
      clonedMat.dispose();
    }
    tissueViewHighlightRef.current = [];

    for (const obj of tissueMarkerMeshesRef.current) {
      obj.parent?.remove(obj);
      obj.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
    }
    tissueMarkerMeshesRef.current = [];

    for (const obj of tissuePathwayLinesRef.current) {
      obj.parent?.remove(obj);
      if ((obj as THREE.Line).geometry) (obj as THREE.Line).geometry.dispose();
      if ((obj as THREE.Line).material instanceof THREE.Material) ((obj as THREE.Line).material as THREE.Material).dispose();
    }
    tissuePathwayLinesRef.current = [];

    for (const obj of tissueLoadIndicatorsRef.current) {
      obj.parent?.remove(obj);
      obj.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }
    tissueLoadIndicatorsRef.current = [];

    if (!tissueViewOverlay || !tissueViewOverlay.bones || tissueViewOverlay.bones.length === 0) return;
    if (!sceneRef.current) return;

    const bRef = bonesRef.current;
    const overlayColor = new THREE.Color(tissueViewOverlay.color);

    for (const boneName of tissueViewOverlay.bones) {
      const bone = bRef[boneName];
      if (!bone) continue;

      bone.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material) && child.material instanceof THREE.MeshStandardMaterial) {
          const origMat = child.material;
          const clonedMat = origMat.clone();
          clonedMat.emissive = overlayColor;
          clonedMat.emissiveIntensity = 0.45;
          clonedMat.transparent = true;
          clonedMat.opacity = 0.65;
          clonedMat.needsUpdate = true;

          tissueViewHighlightRef.current.push({
            mesh: child,
            origMaterial: origMat,
            wasVisible: child.visible,
          });

          child.material = clonedMat;
          child.visible = true;
        }
      });
    }

    if (tissueViewOverlay.markers) {
      for (const marker of tissueViewOverlay.markers) {
        const bone = bRef[marker.boneName];
        if (!bone) continue;

        const group = new THREE.Group();

        const sphereGeo = new THREE.SphereGeometry(marker.size, 12, 12);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(marker.color),
          emissive: new THREE.Color(marker.color),
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.85,
          depthTest: true,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.roundRect(4, 4, 248, 56, 8);
          ctx.fill();
          ctx.font = 'bold 22px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const shortLabel = marker.label.length > 24 ? marker.label.slice(0, 22) + '...' : marker.label;
          ctx.fillText(shortLabel, 128, 32);
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(0.12, 0.03, 1);
          sprite.position.set(0, marker.size + 0.02, 0);
          sprite.renderOrder = 998;
          group.add(sprite);
        }

        group.position.set(0, 0.01, 0);
        bone.add(group);
        tissueMarkerMeshesRef.current.push(group);
      }
    }

    if (tissueViewOverlay.pathwayLines) {
      for (const pathway of tissueViewOverlay.pathwayLines) {
        const points: THREE.Vector3[] = [];
        for (const boneName of pathway.boneSequence) {
          const bone = bRef[boneName];
          if (bone) {
            const worldPos = new THREE.Vector3();
            bone.getWorldPosition(worldPos);
            points.push(worldPos);
          }
        }
        if (points.length < 2) continue;

        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(points.length * 10);
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(pathway.color),
          linewidth: 2,
          transparent: true,
          opacity: 0.8,
          depthTest: true,
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 997;

        sceneRef.current.scene.add(line);
        tissuePathwayLinesRef.current.push(line);

        const entrapmentGeo = new THREE.OctahedronGeometry(0.012, 0);
        for (let i = 0; i < pathway.boneSequence.length; i++) {
          const bone = bRef[pathway.boneSequence[i]];
          if (!bone) continue;
          const entrapmentMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xff6600),
            emissive: new THREE.Color(0xff6600),
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
          });
          const diamond = new THREE.Mesh(entrapmentGeo, entrapmentMat);
          diamond.position.set(0, 0.02, 0);
          bone.add(diamond);
          tissuePathwayLinesRef.current.push(diamond);
        }
      }
    }

    if (tissueViewOverlay.loadIndicators) {
      for (const indicator of tissueViewOverlay.loadIndicators) {
        const bone = bRef[indicator.boneName];
        if (!bone) continue;

        const ringGeo = new THREE.RingGeometry(0.025, 0.035, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(indicator.color),
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0, 0);
        ring.renderOrder = 996;
        bone.add(ring);
        tissueLoadIndicatorsRef.current.push(ring);

        const arcAngle = (indicator.loadPercent / 100) * Math.PI * 2;
        const arcGeo = new THREE.RingGeometry(0.026, 0.034, 32, 1, 0, arcAngle);
        const arcColor = indicator.loadPercent > 75 ? 0xff3333 : indicator.loadPercent > 50 ? 0xffaa33 : 0x33cc33;
        const arcMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(arcColor),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const arc = new THREE.Mesh(arcGeo, arcMat);
        arc.rotation.x = -Math.PI / 2;
        arc.position.set(0, 0.001, 0);
        arc.renderOrder = 997;
        bone.add(arc);
        tissueLoadIndicatorsRef.current.push(arc);
      }
    }
  }, [tissueViewOverlay]);

  const goalOverlayObjectsRef = useRef<THREE.Object3D[]>([]);
  const goalSavedEmissivesRef = useRef<Map<string, THREE.Color>>(new Map());
  useEffect(() => {
    for (const obj of goalOverlayObjectsRef.current) {
      obj.parent?.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    }
    goalOverlayObjectsRef.current = [];

    const savedEmissives = goalSavedEmissivesRef.current;
    const groups = splitMuscleGroupsRef.current;
    for (const [meshKey, originalColor] of savedEmissives) {
      const [groupId, meshIdx] = meshKey.split('|');
      const group = groups.get(groupId);
      if (!group) continue;
      const mesh = group.meshes[parseInt(meshIdx)];
      if (mesh instanceof THREE.Mesh && mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissive.copy(originalColor);
      }
    }
    savedEmissives.clear();

    if (!goalStateOverlay?.enabled || !sceneRef.current) return;

    const bones = bonesRef.current;

    if (goalStateOverlay.painTargets) {
      for (const pt of goalStateOverlay.painTargets) {
        const bone = bones[pt.boneName];
        if (!bone) continue;
        const gap = Math.max(0, pt.currentIntensity - pt.targetIntensity);
        if (gap <= 0) continue;
        const ringGeo = new THREE.RingGeometry(0.6, 0.8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.33 * (1 - gap / 100), 0.8, 0.5),
          transparent: true,
          opacity: 0.35 + gap * 0.004,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.renderOrder = 998;
        ring.rotation.x = -Math.PI / 2;
        bone.add(ring);
        goalOverlayObjectsRef.current.push(ring);
      }
    }

    if (goalStateOverlay.muscleTargets) {
      for (const mt of goalStateOverlay.muscleTargets) {
        const group = groups.get(mt.groupId);
        if (!group) continue;
        const gap = Math.abs(mt.currentTension - mt.targetTension);
        if (gap < 5) continue;
        const hue = mt.currentTension > mt.targetTension ? 0 : 0.6;
        const ghostColor = new THREE.Color().setHSL(hue, 0.4, 0.6);
        group.meshes.forEach((mesh, meshIdx) => {
          if (mesh instanceof THREE.Mesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              const key = `${mt.groupId}|${meshIdx}`;
              if (!savedEmissives.has(key)) {
                savedEmissives.set(key, mat.emissive.clone());
              }
              mat.emissive.lerp(ghostColor, Math.min(gap / 100, 0.4));
            }
          }
        });
      }
    }

    if (goalStateOverlay.postureTargets) {
      for (const pt of goalStateOverlay.postureTargets) {
        const bone = bones[pt.boneName];
        if (!bone) continue;
        const angleDiff = Math.abs(pt.currentAngle - pt.targetAngle);
        if (angleDiff < 2) continue;
        const arrowLen = 0.4 + angleDiff * 0.01;
        const arrowDir = new THREE.Vector3(
          pt.axis === 'x' ? 1 : 0,
          pt.axis === 'y' ? 1 : 0,
          pt.axis === 'z' ? 1 : 0,
        );
        const arrowColor = angleDiff > 15 ? 0xff4444 : angleDiff > 8 ? 0xffaa00 : 0x44ff44;
        const arrow = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(0, 0, 0), arrowLen, arrowColor, 0.12, 0.08);
        arrow.renderOrder = 997;
        bone.add(arrow);
        goalOverlayObjectsRef.current.push(arrow);
      }
    }

    if (goalStateOverlay.romTargets) {
      for (const rt of goalStateOverlay.romTargets) {
        const bone = bones[rt.boneName];
        if (!bone) continue;
        const pct = rt.targetDegrees > 0 ? Math.min(rt.currentDegrees / rt.targetDegrees, 1) : 1;
        if (pct >= 0.95) continue;
        const arcAngle = (Math.PI * 2) * pct;
        const arcGeo = new THREE.RingGeometry(0.4, 0.5, 24, 1, 0, arcAngle);
        const arcColor = pct >= 0.8 ? 0x22c55e : pct >= 0.6 ? 0xeab308 : 0xef4444;
        const arcMat = new THREE.MeshBasicMaterial({
          color: arcColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const arc = new THREE.Mesh(arcGeo, arcMat);
        arc.renderOrder = 996;
        arc.rotation.x = -Math.PI / 2;
        bone.add(arc);
        goalOverlayObjectsRef.current.push(arc);

        const fullGeo = new THREE.RingGeometry(0.4, 0.5, 24, 1, 0, Math.PI * 2);
        const fullMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const full = new THREE.Mesh(fullGeo, fullMat);
        full.renderOrder = 995;
        full.rotation.x = -Math.PI / 2;
        bone.add(full);
        goalOverlayObjectsRef.current.push(full);
      }
    }
  }, [goalStateOverlay]);

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
      muscleHitProxiesRef.current.forEach(p => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      });
      muscleHitProxiesRef.current = [];
      muscleGroupCentersRef.current.clear();
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

    const findMuscleGroupByProxy = (hitMesh: THREE.Object3D): { groupId: string; label: string } | null => {
      const gId = hitMesh.userData.muscleGroupId as string | undefined;
      if (!gId) return null;
      const group = splitMuscleGroupsRef.current.get(gId);
      if (!group) return null;
      return { groupId: gId, label: group.label };
    };

    const findClosestMuscleGroupByScreenDistance = (
      screenX: number,
      screenY: number,
      cam: THREE.Camera,
      rect: DOMRect,
      maxPixelDistance: number = 60
    ): { groupId: string; label: string } | null => {
      const groups = splitMuscleGroupsRef.current;
      if (groups.size === 0) return null;

      let closestGroupId: string | null = null;
      let closestLabel = '';
      let closestDist = Infinity;
      const tempVec = new THREE.Vector3();

      groups.forEach((group, groupId) => {
        if (groupId === 'other') return;
        const hasVisible = group.meshes.some(m => m.visible);
        if (!hasVisible) return;

        let centerWorld: THREE.Vector3 | null = null;
        const proxy = muscleHitProxiesRef.current.find(p => p.groupId === groupId);
        if (proxy) {
          tempVec.setFromMatrixPosition(proxy.mesh.matrixWorld);
          centerWorld = tempVec.clone();
        } else {
          const stored = muscleGroupCentersRef.current.get(groupId);
          if (stored) centerWorld = stored.clone();
        }
        if (!centerWorld) return;

        const projected = centerWorld.clone().project(cam);
        const sx = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
        const sy = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;

        if (projected.z < 0 || projected.z > 1) return;

        const dist = Math.sqrt((screenX - sx) ** 2 + (screenY - sy) ** 2);
        if (dist < closestDist && dist < maxPixelDistance) {
          closestDist = dist;
          closestGroupId = groupId;
          closestLabel = group.label;
        }
      });

      if (closestGroupId) {
        return { groupId: closestGroupId, label: closestLabel };
      }
      return null;
    };

    const highlightMuscleGroup = (info: { groupId: string; label: string }, screenX: number, screenY: number) => {
      if (info.groupId === hoveredGroupId) {
        setMuscleHoverInfo(prev => prev ? { ...prev, screenX, screenY } : null);
        return;
      }
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
      setMuscleHoverInfo({ groupId: info.groupId, label: info.label, screenX, screenY });
      canvas.style.cursor = 'pointer';
    };

    const detectMuscleGroup = (
      ndc: THREE.Vector2,
      cam: THREE.Camera,
      rect: DOMRect,
      screenX: number,
      screenY: number
    ): { groupId: string; label: string } | null => {
      const allMuscleMeshes = muscleMeshesRef.current.filter(m => m.visible);
      raycasterRef.current.setFromCamera(ndc, cam);

      if (allMuscleMeshes.length > 0) {
        const directHits = raycasterRef.current.intersectObjects(allMuscleMeshes, true);
        if (directHits.length > 0) {
          const info = findMuscleGroupForMesh(directHits[0].object);
          if (info) return info;
        }
      }

      const proxyMeshes = muscleHitProxiesRef.current
        .filter(p => {
          const group = splitMuscleGroupsRef.current.get(p.groupId);
          return group && group.meshes.some(m => m.visible);
        })
        .map(p => p.mesh);
      if (proxyMeshes.length > 0) {
        const proxyHits = raycasterRef.current.intersectObjects(proxyMeshes, false);
        if (proxyHits.length > 0) {
          const info = findMuscleGroupByProxy(proxyHits[0].object);
          if (info) return info;
        }
      }

      return findClosestMuscleGroupByScreenDistance(screenX, screenY, cam, rect);
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
      if (allMuscleMeshes.length === 0 && muscleHitProxiesRef.current.length === 0) {
        if (hoveredGroupId) { clearMuscleHover(); setMuscleHoverInfo(null); canvas.style.cursor = ''; }
        return;
      }
      if (!sceneRef.current) return;
      const cam = sceneRef.current.camera;

      const info = detectMuscleGroup(ndc, cam, rect, e.clientX, e.clientY);
      if (info) {
        highlightMuscleGroup(info, e.clientX, e.clientY);
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
      if (!sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const cam = sceneRef.current.camera;
      raycasterRef.current.setFromCamera(ndc, cam);

      if (fascialChainGroupRef.current && onChainNodeClickRef.current) {
        const chainMeshes: THREE.Object3D[] = [];
        fascialChainGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.userData.type === 'chainNode') {
            chainMeshes.push(child);
          }
        });
        if (chainMeshes.length > 0) {
          const chainHits = raycasterRef.current.intersectObjects(chainMeshes, false);
          if (chainHits.length > 0) {
            const ud = chainHits[0].object.userData;
            onChainNodeClickRef.current({ chainId: ud.chainId, muscleId: ud.muscleId, chainName: ud.chainName });
            return;
          }
        }
      }

      if (!enableMuscleInteractionRef.current || otherToolActive) return;

      const info = detectMuscleGroup(ndc, cam, rect, e.clientX, e.clientY);
      if (info && onMuscleGroupClickRef.current) {
        onMuscleGroupClickRef.current(info.groupId, e.clientX, e.clientY);
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
            <div className="flex flex-col items-center gap-1">
              <div className="w-48 bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{loadProgress}%</span>
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
      {/* Skeleton-mode pill: always-visible, unambiguous indicator
          of the current interaction mode (Posture vs Movement). */}
      <div
        className={`absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider shadow-lg backdrop-blur ${
          skeletonMode === 'movement'
            ? 'bg-emerald-500/95 text-white border border-emerald-300/50'
            : 'bg-slate-800/90 text-slate-200 border border-slate-600/50'
        }`}
        data-testid={`skeleton-mode-pill-${skeletonMode}`}
        title={skeletonMode === 'movement'
          ? 'Drags simulate active patient movement gated by capacity'
          : 'Drags reposition posture without active gating'}
      >
        {skeletonMode === 'movement' ? '● Movement Mode' : '○ Posture Mode'}
      </div>
      
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
      {/* Pose mode hint: how to select bones vs joints (Task #212).
          Movement Mode (Task #319) shows hold-to-test instructions instead. */}
      {enablePoseMode && (
        <div
          className="absolute top-2 left-2 z-10 pointer-events-none px-2 py-1 rounded-md bg-slate-900/80 backdrop-blur text-[10px] text-emerald-100 border border-emerald-500/30 shadow"
          data-testid="pose-mode-hint"
        >
          {skeletonMode === 'movement' ? (
            <div><span className="text-emerald-300">Hold</span> any joint to move · release to relax · <span className="text-amber-300">double-click</span> to lock</div>
          ) : (
            <div><span className="text-emerald-300">Click</span> joint dot · <span className="text-blue-300">Shift+Click</span> bone shaft</div>
          )}
        </div>
      )}
      {/* Movement Mode lock summary (Task #319): a small pill listing how
          many joints are pinned, so the clinician can see locks at a glance
          even when those joints aren't currently selected. */}
      {enablePoseMode && skeletonMode === 'movement' && lockedMovementConfigKeys.size > 0 && (
        <div
          className="absolute top-2 left-2 z-10 pointer-events-none px-2 py-1 rounded-md bg-amber-500/15 backdrop-blur text-[10px] text-amber-100 border border-amber-500/40 shadow flex items-center gap-1"
          style={{ marginTop: 26 }}
          data-testid="movement-locks-pill"
        >
          <Lock className="h-2.5 w-2.5" />
          <span>{lockedMovementConfigKeys.size} joint{lockedMovementConfigKeys.size === 1 ? '' : 's'} locked · double-click to unlock</span>
        </div>
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
      {skeletonMode === 'movement' && movementSelectedJoint && activeCapacities && (() => {
        const rows = Object.entries(activeCapacities)
          .filter(([k]) => k.startsWith(`${movementSelectedJoint.key}:`))
          .slice(0, 3);
        if (rows.length === 0) return null;
        // Task #319: surface a Locked badge inside this HUD when any
        // configKey under the currently-selected joint is pinned.
        const selectedJointLocked = Array.from(lockedMovementConfigKeys).some(
          k => k.startsWith(`${movementSelectedJoint.key}.`)
        );
        return (
          <div
            className="absolute pointer-events-none z-20"
            style={{ left: movementSelectedJoint.x, top: movementSelectedJoint.y - 18, transform: 'translate(-50%, -100%)' }}
            data-testid="movement-rom-pill"
          >
            <div className="px-2.5 py-1.5 rounded-md shadow-lg bg-slate-900/95 backdrop-blur border border-emerald-500/40 text-white text-[11px] leading-tight space-y-0.5">
              {rows.map(([k, r]) => {
                const mv = k.split(':')[1];
                const aMin = r.activeRomMin ?? 0;
                const pMin = r.passiveRomMin ?? 0;
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-emerald-300 capitalize">{mv.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold tabular-nums">Active {Math.round(aMin)}–{Math.round(r.activeRomMax)}°</span>
                    <span className="text-slate-400 tabular-nums">/ Passive {Math.round(pMin)}–{Math.round(r.passiveRomMax)}°</span>
                  </div>
                );
              })}
              {selectedJointLocked && (
                <div
                  className="flex items-center gap-1 mt-1 pt-1 border-t border-amber-500/40 text-amber-200"
                  data-testid="movement-rom-pill-lock"
                >
                  <Lock className="h-2.5 w-2.5" />
                  <span>Locked · double-click joint to unlock</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* Task #319: selected-joint lock badge that does NOT depend on
          activeCapacities rows — guarantees the clinician always sees a
          near-joint Locked indicator when a joint is pinned, even if its
          ROM rows aren't loaded. Suppressed when the ROM-pill above is
          already rendering (which has its own lock row) to avoid
          stacking duplicate badges on the same joint. */}
      {skeletonMode === 'movement' && movementSelectedJoint && (() => {
        const selectedJointLocked = Array.from(lockedMovementConfigKeys).some(
          k => k.startsWith(`${movementSelectedJoint.key}.`)
        );
        if (!selectedJointLocked) return null;
        const romPillVisible = !!activeCapacities && Object.keys(activeCapacities).some(
          k => k.startsWith(`${movementSelectedJoint.key}:`)
        );
        if (romPillVisible) return null;
        return (
          <div
            className="absolute pointer-events-none z-20"
            style={{ left: movementSelectedJoint.x, top: movementSelectedJoint.y - 18, transform: 'translate(-50%, -100%)' }}
            data-testid="movement-joint-lock-badge"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-md shadow-lg bg-amber-500/15 backdrop-blur border border-amber-500/40 text-amber-200 text-[11px] leading-tight">
              <Lock className="h-2.5 w-2.5" />
              <span>Locked · double-click joint to unlock</span>
            </div>
          </div>
        );
      })()}
      {skeletonMode === 'movement' && movementSelectedJoint && painToast && Date.now() < painToast.expiresAt && (
        <div
          className="absolute pointer-events-none z-20 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: movementSelectedJoint.x, top: movementSelectedJoint.y, transform: 'translate(-50%, -50%)' }}
          data-testid="painful-arc-wedge"
        >
          <div
            className="rounded-full border-2 border-red-500 bg-red-500/25 animate-pulse"
            style={{ width: 44, height: 44, clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)' }}
          />
        </div>
      )}
      {/* Task #321: Movement Mode slider HUD — one slider per unique DOF
          on the selected joint, drives the same constraint /
          compensation / painful-arc / exceeded-limit pipeline as the 3D
          arrow drag. Pin toggle reuses lockedMovementConfigKeys so a
          pinned slider DOF skips spring-back. The 3D arrow gizmo stays
          rendered as the fallback. */}
      {skeletonMode === 'movement' && movementSelectedJoint && (() => {
        const seen = new Set<string>();
        const dofs: SliderDof[] = (JOINT_MOVEMENT_DEFS[movementSelectedJoint.key] ?? [])
          .filter(def => DOF_LIMIT_INDEX.has(def.configKey))
          .filter(def => {
            if (seen.has(def.configKey)) return false;
            seen.add(def.configKey);
            return true;
          })
          .map(def => {
            const lim = DOF_LIMIT_INDEX.get(def.configKey)!;
            const lookup = def.configKey.replace('.', ':');
            const row = activeCapacities?.[lookup];
            return {
              configKey: def.configKey,
              label: def.label,
              hardMin: lim.min,
              hardMax: lim.max,
              activeRomMin: row?.activeRomMin ?? null,
              activeRomMax: row?.activeRomMax ?? null,
              passiveRomMin: row?.passiveRomMin ?? null,
              passiveRomMax: row?.passiveRomMax ?? null,
              painfulArc: row?.painfulArc
                ? { start: row.painfulArc.start, end: row.painfulArc.end, intensity: row.painfulArc.intensity }
                : null,
              pinned: lockedMovementConfigKeys.has(def.configKey),
            };
          });
        if (dofs.length === 0) return null;
        const fallbackAnchor = { x: movementSelectedJoint.x, y: movementSelectedJoint.y };
        return (
          <MovementJointSliderHUD
            jointKey={movementSelectedJoint.key}
            getAnchor={() => selectedJointAnchorRef.current ?? fallbackAnchor}
            dofs={dofs}
            getCurrentValue={(k) => sliderHudApiRef.current?.getCurrentValue(k) ?? 0}
            onDragStart={(k) => sliderHudApiRef.current?.beginDrag(k)}
            onDrag={(k, v) => sliderHudApiRef.current?.applyValue(k, v)}
            onDragEnd={() => sliderHudApiRef.current?.endDrag()}
            onTogglePin={(k) => {
              setLockedMovementConfigKeys(prev => {
                const next = new Set(prev);
                if (next.has(k)) next.delete(k);
                else next.add(k);
                return next;
              });
            }}
            onClose={() => sliderHudApiRef.current?.deselect()}
          />
        );
      })()}
      {painToast && Date.now() < painToast.expiresAt && (
        <div
          className="absolute pointer-events-none z-30 top-3 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200"
          data-testid="pain-toast"
        >
          <div className={`px-3 py-1.5 rounded-lg shadow-xl backdrop-blur text-white text-sm font-medium border ${
            painToast.intensity >= 7 ? 'bg-red-600/90 border-red-300' :
            painToast.intensity >= 4 ? 'bg-orange-500/90 border-orange-200' :
            'bg-amber-500/90 border-amber-200'
          }`}>
            <span className="text-[10px] uppercase tracking-wider opacity-80 mr-1.5">Painful arc</span>
            <span className="font-bold">{painToast.movement.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="ml-1.5 tabular-nums">{painToast.angle}° · {painToast.intensity}/10</span>
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
      {goalStateOverlay?.enabled && goalStateOverlay.overallPct !== undefined && (
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <div className="px-2 py-1 rounded-lg bg-slate-900/85 backdrop-blur-sm border border-green-500/30 shadow-lg">
            <div className="text-[8px] text-green-400 uppercase tracking-wider mb-0.5">Goal</div>
            <div className={`text-sm font-bold ${
              goalStateOverlay.overallPct >= 90 ? 'text-green-400' :
              goalStateOverlay.overallPct >= 70 ? 'text-emerald-400' :
              goalStateOverlay.overallPct >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {goalStateOverlay.overallPct}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
