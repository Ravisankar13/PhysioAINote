import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  Clock,
  Brain,
  Lightbulb,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Stethoscope,
  AlertTriangle,
  Menu,
  X,
  Target,
  Download,
  Dumbbell,
  ClipboardCheck,
  Hand,
  Bone,
  ArrowRight,
  CheckCircle2,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  MapPin,
  Crosshair,
  Ruler,
  Activity,
  Weight,
  Scan,
  Camera,
  CameraOff,
  Pause,
  Sparkles,
  Zap,
  Search,
  Check,
  Scale,
  GitBranch,
  TrendingUp,
  Shield,
  Layers,
  Network,
  Radio,
  Palette,
  Scissors,
  Grid2X2,
  RefreshCw,
  ExternalLink,
  Pill
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import ClinicalResponseDisplay from "@/components/clinical/ClinicalResponseDisplay";
import VisualContentDisplay from "@/components/clinical/VisualContentDisplay";
import EvidenceCitationInline from "@/components/clinical/EvidenceCitationInline";
import PureThreeGLBViewer from "@/components/skeleton/PureThreeGLBViewer";
import type { AnatomicalRegion, PainMarker, PainMarkerType, RomJointDefinition, RomMeasurement, SymptomType, AnimationState, AnimationConstraint } from "@/components/skeleton/PureThreeGLBViewer";
import { REGION_BONE_MAPPING, SYMPTOM_TYPES } from "@/components/skeleton/PureThreeGLBViewer";
import MovementPlayer from "@/components/skeleton/MovementPlayer";
import type { CompensationResult } from "@/lib/jointConstraints";
import FocusedCameraCapture, { type FocusedCameraResult, type FocusedRegion, FOCUSED_REGIONS } from "@/components/skeleton/FocusedCameraCapture";
import ClinicalBubble, { type ClinicalBubbleData } from "@/components/skeleton/ClinicalBubble";
import type { KineticChainConnection } from "@/lib/kineticChainMap";
import ShoulderAssessmentPanel from "@/components/shoulder/ShoulderAssessmentPanel";
import { poseToControllerValues, ControllerSmoother } from "@/utils/poseToControllerMap";
import type { Skeleton3DPose, PartialSkeleton3DPose, PosturalMetrics, CameraViewType } from "@/utils/mediapipeTo3D";
import { ROM_JOINT_DEFINITIONS, ANATOMICAL_VIRTUAL_POINTS } from "@/components/skeleton/PureThreeGLBViewer";
import { pdfGenerator } from "@/services/pdfGenerator";
import ClinicalReasoningPanel, { type ClinicalReasoningData, type BiomechanicalLink, type VisualizationRequest } from "@/components/skeleton/ClinicalReasoningPanel";
import { parseClinicalText, mergeHighlights, HIGHLIGHT_COLORS, type RegionHighlight, type ParsedClinicalContext } from "@/lib/clinicalTextParser";
import { calculatePosturalForces, forceToNewtons, getStatusColor, getThresholdWarnings, computeWeightDistribution, type ForceAnalysisResult, type JointSurfaceForce, type WeightDistribution } from "@/lib/posturalForceEngine";
import { computeFullMuscleAnalysis, computeAllMuscleStates, applyOverridesToAnalysis, getClinicalStatusColor, getClinicalStatusLabel, getToneLabel, getExerciseRecommendations, computeMuscleBalanceRatios, computeTreatmentPriorities, type MuscleAnalysisResult, type IndividualMuscle, type MuscleGroupAnalysis, type ExerciseRecommendation, type MuscleBalanceRatio, type TreatmentPriority, type MuscleOverride, type LengthOverride, type PathologyType, type CrossMuscleEffects, PATHOLOGY_LABELS, PATHOLOGY_EFFECTS } from "@/lib/muscleBiomechanicsEngine";
import { computeBidirectionalEffects, computeMuscleRestrictionEffects, computeChainDrivenJointEffects, MUSCLE_JOINT_ACTIONS, type MuscleRestrictionEffect } from "@/lib/bidirectionalMuscleJoint";
import { computePathologyCompensation, type PathologyCompensationResult } from "@/lib/pathologyCompensationEngine";
import { ENVIRONMENT_PRESETS, DEFAULT_ENVIRONMENT } from "@/lib/environmentPresets";
import { KINETIC_CHAINS, type KineticChainDefinition, CHAIN_BONE_MAPPING, getChainBoneNames } from "@/lib/kineticChainExplorer";
import { computeCrossSystemCorrelation, type CrossSystemCorrelationResult, type PainCorrelation, type CompensationPattern } from "@/lib/crossSystemCorrelation";
import { generateTreatmentPlan, type TreatmentPlan, type PhaseBlock, type ManualTherapyTechnique, type ExercisePrescription, type RecoveryMilestone, type EvidenceGrade, type AITreatmentItem, type AIExerciseItem, type AIAssessmentItem, type AIDifferential, type RootCauseTreatmentPlan, type RootCauseTreatmentStep } from "@/lib/treatmentPathwayEngine";
import { MYOFASCIAL_CHAINS, type MyofascialChain, computeWholeBodyTensionScore, propagateChainEffects, getChainMembership, getChainRecommendations, findChainsForBone, type ChainRecommendation, type PropagatedMuscleState } from "@/lib/myofascialChains";
import { computeInfluenceMap, getInfluencePathwayColor, getInfluencePathwayLabel, getInfluencePathwayAbbrev, getDominantPathway, type InfluenceMap, type InfluencePathway } from "@/lib/muscleInfluenceMap";
import { type ScarMarker, type AdhesionBand, SCAR_TYPES, SCAR_SEVERITY_LABELS, TISSUE_LAYERS, getScarImpact, type ScarType, type TissueLayer, type ScarAge, type ScarMobility } from "@/lib/scarTissueMapping";
import { computePainDrivers, type PainDriverReport } from "@/lib/painDriverEngine";
import { type FascialModifiers } from "@/lib/posturalForceEngine";
import { computeTreatmentPriorities as computeFullTreatmentPriorities, computeJointMobilizationTargets, type TreatmentPriorityResult, type TreatmentTarget, type SyndromeProtocol, type PainMarkerSimple } from "@/lib/treatmentPriorityEngine";
import { computePredictedPain, type PredictedPainSpot } from "@/lib/predictedPainEngine";
import BiomechanicsHUD from "@/components/skeleton/BiomechanicsHUD";
import { TreatmentOverlayBridge, type BoneScreenPosition, getRequiredBoneNames } from "@/components/skeleton/TreatmentOverlay";

const BODY_REGIONS = {
  cervical: {
    name: "Cervical Spine",
    icon: "🦴",
    color: "from-blue-500 to-blue-600",
    skeletonRegion: "cervical_spine" as AnatomicalRegion,
    specialTests: [
      { name: "Spurling's Test", purpose: "Cervical radiculopathy", positive: "Reproduction of arm pain" },
      { name: "Upper Limb Tension Test", purpose: "Neural tension", positive: "Symptom reproduction with sensitizing maneuvers" },
      { name: "Distraction Test", purpose: "Cervical radiculopathy", positive: "Relief of symptoms" },
      { name: "Vertebral Artery Test", purpose: "VBI screening", positive: "Dizziness, nystagmus, nausea" },
      { name: "Sharp-Purser Test", purpose: "Upper cervical instability", positive: "Clunk or patient apprehension" }
    ],
    redFlags: ["Severe trauma", "Progressive neurological deficit", "Bladder/bowel dysfunction", "Bilateral arm symptoms"]
  },
  thoracic: {
    name: "Thoracic Spine",
    icon: "🦴",
    color: "from-purple-500 to-purple-600",
    skeletonRegion: "thoracic_spine" as AnatomicalRegion,
    specialTests: [
      { name: "Slump Test", purpose: "Neural tension", positive: "Symptom reproduction" },
      { name: "First Rib Mobility", purpose: "T1 rib dysfunction", positive: "Restricted mobility" },
      { name: "Rib Spring Test", purpose: "Rib hypomobility", positive: "Reduced spring" },
      { name: "Trunk Rotation", purpose: "Thoracic mobility", positive: "Asymmetry or pain" }
    ],
    redFlags: ["Night pain", "Unexplained weight loss", "History of cancer", "Fever"]
  },
  lumbar: {
    name: "Lumbar Spine",
    icon: "🦴",
    color: "from-green-500 to-green-600",
    skeletonRegion: "lumbar_spine" as AnatomicalRegion,
    specialTests: [
      { name: "Straight Leg Raise", purpose: "Lumbar radiculopathy L4-S1", positive: "Pain 30-70°" },
      { name: "Slump Test", purpose: "Neural tension", positive: "Symptom reproduction" },
      { name: "Prone Instability Test", purpose: "Lumbar instability", positive: "Pain relieved with contraction" },
      { name: "McKenzie Extension", purpose: "Directional preference", positive: "Centralization" },
      { name: "Femoral Nerve Stretch", purpose: "Upper lumbar radiculopathy", positive: "Anterior thigh pain" }
    ],
    redFlags: ["Cauda equina symptoms", "Progressive weakness", "Saddle anesthesia", "Bilateral symptoms"]
  },
  shoulder: {
    name: "Shoulder",
    icon: "💪",
    color: "from-teal-500 to-teal-600",
    skeletonRegion: "left_shoulder" as AnatomicalRegion,
    specialTests: [
      { name: "Neer's Impingement Test", purpose: "Subacromial impingement (Sens 72%, Spec 60%)", positive: "Pain with passive flexion in IR" },
      { name: "Hawkins-Kennedy Test", purpose: "Subacromial impingement (Sens 79%, Spec 59%)", positive: "Pain with passive IR at 90° flexion" },
      { name: "Empty Can (Jobe's) Test", purpose: "Supraspinatus integrity (Sens 69%, Spec 62%)", positive: "Pain/weakness in scapular plane" },
      { name: "Full Can Test", purpose: "Supraspinatus (Sens 77%, Spec 74%)", positive: "Pain/weakness thumbs up" },
      { name: "External Rotation Lag Sign", purpose: "Infraspinatus tear (Sens 46%, Spec 94%)", positive: "Arm drops into IR >5°" },
      { name: "Hornblower's Sign", purpose: "Teres minor tear (Sens 100%, Spec 93%)", positive: "Cannot ER in 90° ABD" },
      { name: "Lift-Off Test", purpose: "Subscapularis tear (Sens 18%, Spec 92%)", positive: "Cannot lift hand off back" },
      { name: "Bear Hug Test", purpose: "Upper subscapularis (Sens 60%, Spec 92%)", positive: "Cannot maintain hand on shoulder" },
      { name: "Apprehension Test", purpose: "Anterior instability (Sens 72%, Spec 96%)", positive: "Apprehension in ABD/ER" },
      { name: "Relocation Test", purpose: "Confirms instability (LR+ 34.0)", positive: "Relief with posterior force" },
      { name: "O'Brien's Test", purpose: "SLAP lesion (Sens 63%, Spec 73%)", positive: "Deep pain reduced with supination" },
      { name: "Cross-Body Adduction", purpose: "AC joint (Sens 77%, Spec 79%)", positive: "Pain at AC joint" },
      { name: "Scapular Assistance Test", purpose: "Scapular dyskinesis contribution", positive: "Pain reduces with manual assist" },
      { name: "Speed's Test", purpose: "Biceps tendinopathy (Sens 32%, Spec 75%)", positive: "Bicipital groove pain" }
    ],
    redFlags: ["Severe trauma with deformity", "Acute dislocation", "Sudden pseudoparalysis", "Progressive neurological deficit", "Night pain unrelieved by any position", "Vascular compromise signs"]
  },
  elbow: {
    name: "Elbow",
    icon: "💪",
    color: "from-orange-500 to-orange-600",
    skeletonRegion: "left_elbow" as AnatomicalRegion,
    specialTests: [
      { name: "Cozen's Test", purpose: "Lateral epicondylalgia", positive: "Lateral elbow pain" },
      { name: "Mill's Test", purpose: "Lateral epicondylalgia", positive: "Lateral elbow pain" },
      { name: "Reverse Cozen's", purpose: "Medial epicondylalgia", positive: "Medial elbow pain" },
      { name: "Valgus Stress Test", purpose: "MCL integrity", positive: "Pain or laxity" },
      { name: "Tinel's Sign (Elbow)", purpose: "Cubital tunnel syndrome", positive: "Tingling into digits 4-5" }
    ],
    redFlags: ["Locked elbow", "Severe swelling", "Obvious deformity", "Loss of pulse"]
  },
  wrist: {
    name: "Wrist & Hand",
    icon: "✋",
    color: "from-pink-500 to-pink-600",
    skeletonRegion: "left_elbow" as AnatomicalRegion,
    specialTests: [
      { name: "Phalen's Test", purpose: "Carpal tunnel syndrome", positive: "Paresthesia in median distribution" },
      { name: "Tinel's Sign (Wrist)", purpose: "Carpal tunnel syndrome", positive: "Tingling into thumb/index/middle" },
      { name: "Finkelstein's Test", purpose: "De Quervain's tenosynovitis", positive: "Pain over radial styloid" },
      { name: "Watson's Test", purpose: "Scapholunate instability", positive: "Clunk or pain" },
      { name: "Grind Test (CMC)", purpose: "CMC joint OA", positive: "Pain with compression/rotation" }
    ],
    redFlags: ["Severe trauma", "Open wounds", "Obvious deformity", "Vascular compromise"]
  },
  hip: {
    name: "Hip",
    icon: "🦵",
    color: "from-indigo-500 to-indigo-600",
    skeletonRegion: "left_hip" as AnatomicalRegion,
    specialTests: [
      { name: "FADIR Test", purpose: "FAI/labral pathology", positive: "Groin pain" },
      { name: "FABER Test", purpose: "Hip/SIJ pathology", positive: "Groin or SIJ pain" },
      { name: "Thomas Test", purpose: "Hip flexor tightness", positive: "Thigh rises from table" },
      { name: "Trendelenburg Test", purpose: "Hip abductor weakness", positive: "Contralateral pelvis drop" },
      { name: "Ober's Test", purpose: "ITB/TFL tightness", positive: "Leg doesn't adduct past neutral" },
      { name: "Resisted External Derotation", purpose: "Gluteal tendinopathy", positive: "Lateral hip pain" }
    ],
    redFlags: ["Severe trauma", "Unable to weight bear", "Night pain", "Groin pain with systemic symptoms"]
  },
  knee: {
    name: "Knee",
    icon: "🦵",
    color: "from-cyan-500 to-cyan-600",
    skeletonRegion: "left_knee" as AnatomicalRegion,
    specialTests: [
      { name: "Lachman's Test", purpose: "ACL integrity", positive: "Soft/absent end-feel" },
      { name: "Anterior Drawer", purpose: "ACL integrity", positive: "Increased translation" },
      { name: "Posterior Drawer", purpose: "PCL integrity", positive: "Increased posterior translation" },
      { name: "Valgus Stress Test", purpose: "MCL integrity", positive: "Pain or laxity" },
      { name: "McMurray's Test", purpose: "Meniscal pathology", positive: "Click or pain" },
      { name: "Thessaly Test", purpose: "Meniscal pathology", positive: "Joint line pain" },
      { name: "Patellar Apprehension", purpose: "Patellar instability", positive: "Patient apprehension" }
    ],
    redFlags: ["Locked knee", "Severe effusion", "Obvious deformity", "Inability to extend"]
  },
  ankle: {
    name: "Ankle & Foot",
    icon: "🦶",
    color: "from-amber-500 to-amber-600",
    skeletonRegion: "left_ankle" as AnatomicalRegion,
    specialTests: [
      { name: "Anterior Drawer (Ankle)", purpose: "ATFL integrity", positive: "Increased translation" },
      { name: "Talar Tilt Test", purpose: "CFL integrity", positive: "Increased inversion" },
      { name: "Squeeze Test", purpose: "Syndesmosis injury", positive: "Distal ankle pain" },
      { name: "External Rotation Test", purpose: "Syndesmosis injury", positive: "Distal ankle pain" },
      { name: "Thompson's Test", purpose: "Achilles rupture", positive: "Absent plantar flexion" },
      { name: "Windlass Test", purpose: "Plantar fasciitis", positive: "Heel pain with toe extension" }
    ],
    redFlags: ["Unable to weight bear", "Severe swelling", "Ottawa Ankle Rules positive", "Obvious deformity"]
  }
};

const PHYSIO_QUICK_ACTIONS = [
  {
    id: "assessment",
    label: "Assessment",
    icon: ClipboardCheck,
    prompt: "What assessment approach and special tests would you recommend for this presentation?",
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100"
  },
  {
    id: "differential",
    label: "Differentials",
    icon: Brain,
    prompt: "What are the differential diagnoses to consider and how do I rule them in/out?",
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100"
  },
  {
    id: "manual",
    label: "Manual Therapy",
    icon: Hand,
    prompt: "What manual therapy techniques would be appropriate and what's the evidence?",
    color: "bg-teal-50 text-teal-700 hover:bg-teal-100"
  },
  {
    id: "exercise",
    label: "Exercise Rx",
    icon: Dumbbell,
    prompt: "Provide a progressive exercise prescription with sets, reps, and dosage guidelines.",
    color: "bg-green-50 text-green-700 hover:bg-green-100"
  },
  {
    id: "education",
    label: "Patient Education",
    icon: BookOpen,
    prompt: "What patient education and self-management strategies should I provide?",
    color: "bg-amber-50 text-amber-700 hover:bg-amber-100"
  },
  {
    id: "redflags",
    label: "Red Flags",
    icon: AlertTriangle,
    prompt: "Screen for red flags and determine if onward referral is needed.",
    color: "bg-red-50 text-red-700 hover:bg-red-100"
  }
];

interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number; flexion: number; lateralFlexion: number; lumbarScoliosis: number; thoracicScoliosis: number; cervicalScoliosis: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number; leftInnominateRotation: number; rightInnominateRotation: number };
  sacrum: { nutation: number; counternutation: number; torsion: number; lateralFlexion: number };
  leftHip: { flexion: number; extension: number; abduction: number; adduction: number; internalRotation: number; externalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; adduction: number; internalRotation: number; externalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; forefootVarus: number; toeExtension: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; forefootVarus: number; toeExtension: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  leftScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  rightScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
  leftWrist: { deviation: number; flexion: number };
  rightWrist: { deviation: number; flexion: number };
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  limbScales: { upperArm: 0, forearm: 0, thigh: 0, shin: 0, overall: 1 },
  spine: { cervicalLordosis: 0, thoracicKyphosis: 0, lumbarLordosis: 0, scoliosis: 0, forwardHead: 0, lateralShift: 0, cervicalRotation: 0, cervicalLateralFlexion: 0, thoracicRotation: 0, lumbarRotation: 0, flexion: 0, lateralFlexion: 0, lumbarScoliosis: 0, thoracicScoliosis: 0, cervicalScoliosis: 0 },
  neck: { flexion: 0, extension: 0, rotation: 0, lateralFlexion: 0, forwardHead: 0 },
  pelvis: { tilt: 0, obliquity: 0, rotation: 0, drop: 0, leftInnominateRotation: 0, rightInnominateRotation: 0 },
  sacrum: { nutation: 0, counternutation: 0, torsion: 0, lateralFlexion: 0 },
  leftHip: { flexion: 0, extension: 0, abduction: 0, adduction: 0, internalRotation: 0, externalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  rightHip: { flexion: 0, extension: 0, abduction: 0, adduction: 0, internalRotation: 0, externalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  leftKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  rightKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  leftAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, forefootVarus: 0, toeExtension: 0, archHeight: 0 },
  rightAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, forefootVarus: 0, toeExtension: 0, archHeight: 0 },
  leftShoulder: { flexion: 0, abduction: -90, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
  rightShoulder: { flexion: 0, abduction: -90, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
  leftScapula: { protraction: 0, retraction: 0, elevation: 0, depression: 0, upwardRotation: 0, downwardRotation: 0, anteriorTilt: 0, posteriorTilt: 0, winging: 0, clavicleRotation: 0 },
  rightScapula: { protraction: 0, retraction: 0, elevation: 0, depression: 0, upwardRotation: 0, downwardRotation: 0, anteriorTilt: 0, posteriorTilt: 0, winging: 0, clavicleRotation: 0 },
  leftElbow: { flexion: 0, carryingAngle: 0, pronation: 0 },
  rightElbow: { flexion: 0, carryingAngle: 0, pronation: 0 },
  leftWrist: { deviation: 0, flexion: 0 },
  rightWrist: { deviation: 0, flexion: 0 },
};

interface PubMedPaper {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  studyType: string;
  pubmedUrl: string;
  abstract?: string;
}

interface PhysioGptResponse {
  response: string;
  conversationId: number;
  suggestions?: string[];
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
  exerciseImages?: Array<{
    exerciseName: string;
    primaryImageUrl: string;
    instructions?: string[];
    tips?: string[];
    category?: string;
  }>;
  visualContent?: any[];
  clinicalSections?: {
    assessment?: string;
    clinicalReasoning?: string;
    treatmentPlan?: string;
    precautions?: string;
    redFlags?: string[];
    differentialDiagnosis?: string[];
    outcomeMeasures?: string[];
  };
  pubmedEvidence?: {
    papers: PubMedPaper[];
    overallGrade: 'A' | 'B' | 'C' | 'D';
    confidence: string;
    source: 'pubmed' | 'fallback';
  };
  contraindications?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
}

export default function PhysioGPT() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [showJointControls, setShowJointControls] = useState(false);
  const [openControlSections, setOpenControlSections] = useState<Set<string>>(new Set());
  const [environmentPreset, setEnvironmentPreset] = useState(DEFAULT_ENVIRONMENT);
  const [showEnvironmentPicker, setShowEnvironmentPicker] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState<keyof typeof BODY_REGIONS | null>(null);
  const [showSpecialTests, setShowSpecialTests] = useState(false);
  const [zoomToRegion, setZoomToRegion] = useState<AnatomicalRegion | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({ ...DEFAULT_MODEL_CONFIG });
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentMovement: null,
    progress: 0,
    speed: 1,
  });
  const [animationConstraints, setAnimationConstraints] = useState<AnimationConstraint[]>([]);
  const handleAnimationProgress = useCallback((progress: number) => {
    const rounded = Math.round(progress * 1000) / 1000;
    setAnimationState(prev => prev.progress === rounded ? prev : { ...prev, progress: rounded });
  }, []);
  const [clinicalHighlights, setClinicalHighlights] = useState<RegionHighlight[]>([]);
  const [painMarkers, setPainMarkers] = useState<PainMarker[]>([]);
  const [painMarkerMode, setPainMarkerMode] = useState(false);
  const [forceMode, setForceMode] = useState(false);
  const [selectedForceJoint, setSelectedForceJoint] = useState<string | null>(null);
  const [bodyWeightKg, setBodyWeightKg] = useState(70);
  const [enabledForceJoints, setEnabledForceJoints] = useState<Set<string>>(new Set());
  const [collapsedForceCategories, setCollapsedForceCategories] = useState<Set<string>>(new Set());
  const [muscleMode, setMuscleMode] = useState(false);
  const [collapsedMuscleGroups, setCollapsedMuscleGroups] = useState<Set<string>>(new Set());
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null);
  const [enabledMuscleGroups, setEnabledMuscleGroups] = useState<Set<string>>(new Set());
  const [muscleStatusFilter, setMuscleStatusFilter] = useState<string | null>(null);
  const [showMuscleExercises, setShowMuscleExercises] = useState<string | null>(null);
  const [clickedMusclePopup, setClickedMusclePopup] = useState<{ groupId: string; screenX: number; screenY: number } | null>(null);
  const [muscleOverrides, setMuscleOverrides] = useState<Record<string, MuscleOverride>>({});
  const [showBalanceRatios, setShowBalanceRatios] = useState(false);
  const [showTreatmentPriority, setShowTreatmentPriority] = useState(false);
  const [chainExplorerMode, setChainExplorerMode] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [expandedChainLink, setExpandedChainLink] = useState<string | null>(null);
  const [forceAiSuggestions, setForceAiSuggestions] = useState<string | null>(null);
  const [forceAiLoading, setForceAiLoading] = useState(false);
  const [activePainMarkerType, setActivePainMarkerType] = useState<PainMarkerType>('point');
  const [activeSymptomType, setActiveSymptomType] = useState<SymptomType>('pain');
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerDescription, setMarkerDescription] = useState('');
  const [romMode, setRomMode] = useState(false);
  const [poseMode, setPoseMode] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraPoseActive, setCameraPoseActive] = useState(false);
  const [posturalMetrics, setPosturalMetrics] = useState<PosturalMetrics | null>(null);
  const [focusedCameraResult, setFocusedCameraResult] = useState<FocusedCameraResult | null>(null);
  const [focusedRegion, setFocusedRegion] = useState<FocusedRegion>(FOCUSED_REGIONS[0]);
  const [showShoulderAssessment, setShowShoulderAssessment] = useState(false);
  const [shoulderAssessmentSide, setShoulderAssessmentSide] = useState<'left' | 'right'>('right');
  const [clinicalBubbleMarker, setClinicalBubbleMarker] = useState<PainMarker | null>(null);
  const [clinicalBubbleSeverity, setClinicalBubbleSeverity] = useState<string>("moderate");
  const [clinicalBubbleResults, setClinicalBubbleResults] = useState<Record<string, { data: ClinicalBubbleData; severity: string; region: string }>>({});
  const [connectionHighlights, setConnectionHighlights] = useState<AnatomicalRegion[]>([]);
  const [testChainActive, setTestChainActive] = useState<{ connection: KineticChainConnection; originalRegion: string } | null>(null);
  const [zoomToolMode, setZoomToolMode] = useState(false);
  const [expandedZoomRegion, setExpandedZoomRegion] = useState<string | null>(null);
  const [correlationMode, setCorrelationMode] = useState(false);
  const [expandedCorrelation, setExpandedCorrelation] = useState<string | null>(null);
  const [correlationTab, setCorrelationTab] = useState<'overview' | 'chains' | 'muscles' | 'root_cause'>('overview');
  const [chainIntegrityMode, setChainIntegrityMode] = useState(false);
  const [expandedChainIntegrity, setExpandedChainIntegrity] = useState<string | null>(null);
  const [bidirectionalMode, setBidirectionalMode] = useState(true);
  const [showChainVisualization, setShowChainVisualization] = useState(false);
  const [activeChainIds, setActiveChainIds] = useState<string[]>(() => MYOFASCIAL_CHAINS.map(c => c.id));
  const [showPropagation, setShowPropagation] = useState(false);
  const [selectedChainNode, setSelectedChainNode] = useState<{ chainId: string; muscleId: string; chainName: string } | null>(null);
  const [showChainRecommendations, setShowChainRecommendations] = useState(false);
  const [manualChainTensions, setManualChainTensions] = useState<Record<string, number>>({});
  const [showScarPanel, setShowScarPanel] = useState(false);
  const [scarMarkers, setScarMarkers] = useState<ScarMarker[]>([]);
  const [adhesionBands, setAdhesionBands] = useState<AdhesionBand[]>([]);
  const [editingScar, setEditingScar] = useState<string | null>(null);
  const [scarPlacementMode, setScarPlacementMode] = useState<ScarType | null>(null);
  const [adhesionPlacementStep, setAdhesionPlacementStep] = useState<'idle' | 'start' | 'end'>('idle');
  const [pendingAdhesionStart, setPendingAdhesionStart] = useState<{ position: { x: number; y: number; z: number }; bone: string } | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'treatment'>('chat');

  const [expandedPhase, setExpandedPhase] = useState<string | null>('acute');
  const [expandedTreatmentSection, setExpandedTreatmentSection] = useState<string | null>(null);
  const skeletonContainerRef = useRef<HTMLDivElement>(null);
  const controllerSmootherRef = useRef(new ControllerSmoother(0.5, 0.015));
  const [selectedRomJoint, setSelectedRomJoint] = useState<RomJointDefinition | null>(null);
  const [romValues, setRomValues] = useState<Record<string, number>>({});
  const [romMeasurements, setRomMeasurements] = useState<RomMeasurement[]>([]);

  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFindings, setVoiceFindings] = useState<any[]>([]);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(true);
  const [clinicalReasoningData, setClinicalReasoningData] = useState<ClinicalReasoningData | null>(null);
  const [clinicalReasoningOpen, setClinicalReasoningOpen] = useState(false);
  const [clinicalReasoningProcessing, setClinicalReasoningProcessing] = useState(false);
  const [clinicalReasoningPaused, setClinicalReasoningPaused] = useState(false);
  const [subjectiveHistoryInput, setSubjectiveHistoryInput] = useState('');
  const subjectiveHistoryRef = useRef('');
  const clinicalReasoningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeBiomechanicalLink, setActiveBiomechanicalLink] = useState<BiomechanicalLink | null>(null);
  const [biomechanicalMuscleHighlights, setBiomechanicalMuscleHighlights] = useState<string[]>([]);
  const [muscleHighlightColors, setMuscleHighlightColors] = useState<Record<string, string>>({});
  const [visualizationBoneHighlights, setVisualizationBoneHighlights] = useState<Array<{ boneName: string; color: number; intensity: number }>>([]);
  const [activeVisualizationId, setActiveVisualizationId] = useState<string | null>(null);
  const lastReasoningTriggerRef = useRef<string>('');
  const compensationDataRef = useRef<{ result: CompensationResult | null; movementName: string | null; restrictions: Record<string, number> }>({ result: null, movementName: null, restrictions: {} });
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceSpeechRecRef = useRef<any>(null);
  const voiceTranscriptRef = useRef('');
  const painMarkersRef = useRef(painMarkers);
  painMarkersRef.current = painMarkers;
  const voiceFindingsRef = useRef(voiceFindings);
  voiceFindingsRef.current = voiceFindings;
  const voiceExtractingRef = useRef(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [evidenceData, setEvidenceData] = useState<Map<number, PhysioGptResponse>>(new Map());

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");
  const lastAnalyzedLengthRef = useRef(0);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);
  const interimAbortRef = useRef<AbortController | null>(null);
  const triggerLiveAnalysisRef = useRef<(transcript: string) => void>(() => {});

  const isStreamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  }>({
    queryKey: [`/api/physiogpt/conversations/${selectedConversationId}`],
    enabled: !!selectedConversationId,
  });

  const messages = conversationData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (interimAbortRef.current) interimAbortRef.current.abort();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const contexts: ParsedClinicalContext[] = [];

      if (messages.length > 0) {
        const recentMessages = messages.slice(-6);
        for (const msg of recentMessages) {
          if (msg.content && msg.role === 'user') {
            contexts.push(parseClinicalText(msg.content));
          }
        }
      }

      

      if (liveTranscript) {
        contexts.push(parseClinicalText(liveTranscript));
      }

      if (contexts.length > 0) {
        const merged = mergeHighlights(contexts);
        setClinicalHighlights(merged.highlights);

        if (merged.highlights.length > 0) {
        }
      } else {
        setClinicalHighlights([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, liveTranscript]);

  const triggerLiveAnalysis = useCallback(async (transcript: string) => {
    if (isAnalyzingRef.current || !transcript.trim() || transcript.length < 30) return;
    isAnalyzingRef.current = true;
    lastAnalyzedLengthRef.current = transcript.length;

    if (interimAbortRef.current) interimAbortRef.current.abort();
    const analysisAbort = new AbortController();
    interimAbortRef.current = analysisAbort;

    try {
      setIsStreaming(true);
      setStreamingContent("");

      const voiceMessage = `[LIVE CLINICAL SESSION - In Progress]\n\nThe following is a real-time transcription of an ongoing clinical physiotherapy session. Provide a concise interim clinical analysis based on what has been discussed so far:\n\n---\n${transcript}\n---\n\nProvide a brief interim analysis:\n1. **Session Summary** - Key points discussed so far and emerging chief complaint\n2. **Clinical Findings** - Relevant findings extracted so far\n3. **Differential Diagnosis** - Preliminary ranked list based on current information\n4. **Assessment** - Initial clinical impression\n5. **Missing Information** - What additional information is still needed`;

      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: voiceMessage,
          conversationId: selectedConversationId,
          isVoiceSession: true,
          isInterimAnalysis: true,
          clinicalContext: {
            bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
            professionalMode: true
          }
        }),
        signal: analysisAbort.signal,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  accumulatedContent += data.data;
                  setStreamingContent(accumulatedContent);
                } else if (data.type === 'conversationId' && !selectedConversationId) {
                  setSelectedConversationId(data.data);
                }
              } catch {}
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Live analysis error:", error);
      }
    } finally {
      isAnalyzingRef.current = false;
      isStreamingRef.current = false;
      setIsStreaming(false);
    }
  }, [selectedConversationId, selectedRegion]);

  triggerLiveAnalysisRef.current = triggerLiveAnalysis;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setLiveTranscript("");
      setInterimTranscript("");
      liveTranscriptRef.current = "";
      lastAnalyzedLengthRef.current = 0;
      isAnalyzingRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let recognitionResultIndex = 0;
        recognition.onresult = (event: any) => {
          let interimText = "";
          for (let i = recognitionResultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              liveTranscriptRef.current += result[0].transcript + " ";
              setLiveTranscript(liveTranscriptRef.current.trim());
              recognitionResultIndex = i + 1;
            } else {
              interimText += result[0].transcript;
            }
          }
          setInterimTranscript(interimText);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error("Speech recognition error:", event.error);
          }
        };

        recognition.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            recognitionResultIndex = 0;
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      analysisTimerRef.current = setInterval(() => {
        const currentTranscript = liveTranscriptRef.current;
        const newContentLength = currentTranscript.length - lastAnalyzedLengthRef.current;
        if (newContentLength > 50 && !isAnalyzingRef.current) {
          triggerLiveAnalysisRef.current(currentTranscript);
        }
      }, 10000);

    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = async () => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }

    if (interimAbortRef.current) {
      interimAbortRef.current.abort();
      interimAbortRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const finalTranscript = liveTranscriptRef.current.trim();
    setStreamingContent("");
    isStreamingRef.current = false;
    setIsStreaming(false);

    if (finalTranscript.length > 20) {
      setIsAnalyzingSession(true);
      const durationMins = Math.floor(recordingDuration / 60);
      const durationSecs = recordingDuration % 60;
      const durationStr = durationMins > 0 ? `${durationMins}m ${durationSecs}s` : `${durationSecs}s`;
      const voiceMessage = `[CLINICAL SESSION RECORDING - Duration: ${durationStr}]\n\nThe following is a transcription of a clinical physiotherapy session. Please analyze this as a professional diagnostician and provide a comprehensive clinical report:\n\n---\n${finalTranscript}\n---\n\nPlease provide:\n1. **Session Summary** - Key points discussed and chief complaint\n2. **Clinical Findings** - Relevant subjective and objective findings extracted\n3. **Differential Diagnosis** - Ranked list with reasoning for each\n4. **Assessment** - Your clinical impression based on the evidence\n5. **Treatment Plan** - Evidence-based interventions with dosage parameters\n6. **Prognosis** - Expected outcomes and timeline\n7. **Missing Information** - What additional information, tests, or assessments are needed to refine the diagnosis\n8. **Red Flags** - Any concerning signs that require urgent attention`;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      isAnalyzingRef.current = false;
      setLiveTranscript("");
      setInterimTranscript("");
      sendMessageStreaming(voiceMessage, true);
    } else if (finalTranscript.length > 0) {
      toast({ title: "Recording too short", description: "Please speak more for a proper clinical analysis", variant: "destructive" });
      setLiveTranscript("");
      setInterimTranscript("");
    } else {
      toast({ title: "No speech detected", description: "Please try recording again. Make sure your microphone is working.", variant: "destructive" });
      setLiveTranscript("");
      setInterimTranscript("");
    }
  };

  const sendMessageStreaming = async (messageContent: string, isVoiceSession: boolean = false) => {
    if (isStreamingRef.current) return;
    isStreamingRef.current = true;
    setIsStreaming(true);
    setStreamingContent("");

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId: selectedConversationId,
          isVoiceSession,
          clinicalContext: {
            bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
            professionalMode: true
          }
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let newConversationId = selectedConversationId;
      let evidenceDataReceived: any = {};

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (data.type) {
                  case 'conversationId':
                    newConversationId = data.data;
                    setSelectedConversationId(newConversationId);
                    break;
                  case 'chunk':
                    accumulatedContent += data.data;
                    setStreamingContent(accumulatedContent);
                    break;
                  case 'evidence':
                    evidenceDataReceived.evidenceSummary = data.data;
                    evidenceDataReceived.evidenceGrade = data.data.evidenceGrade;
                    evidenceDataReceived.confidenceLevel = data.data.confidenceLevel;
                    break;
                  case 'pubmedEvidence':
                    evidenceDataReceived.pubmedEvidence = data.data;
                    break;
                  case 'exercises':
                    evidenceDataReceived.exerciseImages = data.data;
                    break;
                  case 'visualContent':
                    evidenceDataReceived.visualContent = data.data;
                    break;
                  case 'suggestions':
                    setSuggestions(data.data || []);
                    break;
                  case 'clinicalSections':
                    evidenceDataReceived.clinicalSections = data.data;
                    break;
                  case 'done':
                    if (Object.keys(evidenceDataReceived).length > 0 && newConversationId) {
                      setEvidenceData(prev => new Map(prev.set(newConversationId!, {
                        ...evidenceDataReceived,
                        conversationId: newConversationId!,
                        response: accumulatedContent
                      })));
                    }
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
                      queryClient.invalidateQueries({ queryKey: [`/api/physiogpt/conversations/${newConversationId}`] });
                    }, 100);
                    break;
                  case 'error':
                    toast({ title: "Error", description: data.data, variant: "destructive" });
                    break;
                }
              } catch (e) {
                // skip malformed SSE
              }
            }
          }
        }
      }

      setMessage("");
      setStreamingContent("");
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      }
    } finally {
      isStreamingRef.current = false;
      setIsStreaming(false);
      setIsAnalyzingSession(false);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("/api/physiogpt/chat", "POST", {
        message: messageContent,
        conversationId: selectedConversationId,
        clinicalContext: {
          bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
          professionalMode: true
        }
      });
      return response;
    },
    onSuccess: (data: PhysioGptResponse) => {
      if (data.evidenceGrade || data.exerciseImages || data.visualContent) {
        setEvidenceData(prev => new Map(prev.set(data.conversationId, data)));
      }
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        queryClient.invalidateQueries({ queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] });
      }, 100);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest(`/api/physiogpt/conversations/${conversationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      setSelectedConversationId(null);
      setSuggestions([]);
    },
  });

  const zoomRegionLandmarks = useMemo(() => [
    { region: 'cervical_spine' as AnatomicalRegion, label: 'Neck / Cervical', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => ['Head_M','NeckPart1_M','NeckPart2_M','Neck_M'].some(b => p.boneA === b || p.boneB === b) && !p.label.includes('Rib') && !p.label.includes('Sternoclavicular') && !p.label.includes('Manubrium')).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'thoracic_spine' as AnatomicalRegion, label: 'Thoracic / Ribs', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => (['Chest_M','Spine1Part2_M','Spine1Part1_M','Spine1_M'].some(b => p.boneA === b || p.boneB === b) && !p.label.includes('Scapula') && !p.label.includes('Sternoclavicular')) || p.label.includes('Rib') || p.label.includes('Costochondral') || p.label.includes('Costovertebral') || p.label.includes('Xiphoid') || p.label.includes('Manubrium') || p.label.includes('Sternum')).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'lumbar_spine' as AnatomicalRegion, label: 'Lumbar / Spine', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.match(/^L[1-5]|Lumbosacral|Sacrum|Coccyx/) || p.label.includes('Facet Joint')).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'pelvis' as AnatomicalRegion, label: 'Pelvis', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('ASIS') || p.label.includes('PSIS') || p.label.includes('Ischial') || p.label.includes('Iliac Crest') || p.label.includes('Pubic') || p.label.includes('SI Joint') || p.label.includes('Acetabulum') || p.label.includes('Hamstring Origin') || p.label.includes('Adductor Origin')).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'anterior_pelvis' as AnatomicalRegion, label: 'Anterior Pelvis / Inguinal', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Inguinal') || p.label.includes('Femoral Triangle') || p.label.includes('Femoral Canal') || p.label.includes('Hesselbach') || p.label.includes('Conjoint') || p.label.includes('Lacunar') || p.label.includes('Cooper') || p.label.includes('Linea Semil') || p.label.includes('Arcuate Line') || p.label.includes('TFL')).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'left_shoulder' as AnatomicalRegion, label: 'L Shoulder', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Left') && (p.label.includes('Acromioclavicular') || p.label.includes('Coracoid') || p.label.includes('Glenohumeral') || p.label.includes('Subacromial') || p.label.includes('Bicipital Groove') || p.label.includes('Deltoid Tub') || p.label.includes('Infrascapular') || p.label.includes('Sternoclavicular'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'right_shoulder' as AnatomicalRegion, label: 'R Shoulder', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Right') && (p.label.includes('Acromioclavicular') || p.label.includes('Coracoid') || p.label.includes('Glenohumeral') || p.label.includes('Subacromial') || p.label.includes('Bicipital Groove') || p.label.includes('Deltoid Tub') || p.label.includes('Infrascapular') || p.label.includes('Sternoclavicular'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'left_elbow' as AnatomicalRegion, label: 'L Elbow / Wrist', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Left') && (p.label.includes('Epicondyle') || p.label.includes('Olecranon') || p.label.includes('Radial') || p.label.includes('Ulnar Styloid') || p.label.includes('Carpal Tunnel'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'right_elbow' as AnatomicalRegion, label: 'R Elbow / Wrist', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Right') && (p.label.includes('Epicondyle') || p.label.includes('Olecranon') || p.label.includes('Radial') || p.label.includes('Ulnar Styloid') || p.label.includes('Carpal Tunnel'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'left_hip' as AnatomicalRegion, label: 'L Hip / Thigh', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Left') && (p.label.includes('Greater Trochanter') || p.label.includes('Lesser Trochanter') || p.label.includes('IT Band') || p.label.includes('Quadriceps') || p.label.includes('Biceps'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'right_hip' as AnatomicalRegion, label: 'R Hip / Thigh', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Right') && (p.label.includes('Greater Trochanter') || p.label.includes('Lesser Trochanter') || p.label.includes('IT Band') || p.label.includes('Quadriceps') || p.label.includes('Biceps'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'left_knee' as AnatomicalRegion, label: 'L Knee', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Left') && (p.label.includes('Patella') || p.label.includes('Tibial Tuberosity') || p.label.includes('Fibular Head') || p.label.includes('Joint Line') || p.label.includes('Popliteal'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'right_knee' as AnatomicalRegion, label: 'R Knee', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Right') && (p.label.includes('Patella') || p.label.includes('Tibial Tuberosity') || p.label.includes('Fibular Head') || p.label.includes('Joint Line') || p.label.includes('Popliteal'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'left_ankle' as AnatomicalRegion, label: 'L Ankle / Foot', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Left') && (p.label.includes('Malleolus') || p.label.includes('Calcaneus') || p.label.includes('Navicular') || p.label.includes('Metatarsal') || p.label.includes('Plantar') || p.label.includes('Achilles') || p.label.includes('Anterior Tibialis') || p.label.includes('Peroneal') || p.label.includes('Tibial Shaft') || p.label.includes('Calf'))).map(p => ({ label: p.label, boneName: p.boneName })) },
    { region: 'right_ankle' as AnatomicalRegion, label: 'R Ankle / Foot', landmarks: ANATOMICAL_VIRTUAL_POINTS.filter(p => p.label.includes('Right') && (p.label.includes('Malleolus') || p.label.includes('Calcaneus') || p.label.includes('Navicular') || p.label.includes('Metatarsal') || p.label.includes('Plantar') || p.label.includes('Achilles') || p.label.includes('Anterior Tibialis') || p.label.includes('Peroneal') || p.label.includes('Tibial Shaft') || p.label.includes('Calf'))).map(p => ({ label: p.label, boneName: p.boneName })) },
  ], []);

  const handleLandmarkSelect = useCallback((landmark: { label: string; boneName: string; position: { x: number; y: number; z: number } }) => {
    const newMarker: PainMarker = {
      id: `landmark-${Date.now()}`,
      type: 'point',
      position: landmark.position,
      nearestBone: landmark.boneName,
      anatomicalLabel: landmark.label,
      description: `Pain at ${landmark.label}`,
    };
    setPainMarkers(prev => [...prev, newMarker]);
    setClinicalBubbleMarker(newMarker);
    setClinicalBubbleSeverity("moderate");
    toast({ title: "Landmark Marked", description: `Pain marker placed at ${landmark.label}` });
  }, [toast]);

  const activeSymptomTypeRef = useRef(activeSymptomType);
  activeSymptomTypeRef.current = activeSymptomType;

  const handlePainMarkerAdd = useCallback((marker: PainMarker) => {
    const markerWithSymptom = { ...marker, symptomType: activeSymptomTypeRef.current };
    setPainMarkers(prev => [...prev, markerWithSymptom]);
    setClinicalBubbleMarker(markerWithSymptom);
    setClinicalBubbleSeverity("moderate");
  }, []);

  const handlePainMarkerMove = useCallback((id: string, position: { x: number; y: number; z: number }, nearestBone: string, anatomicalLabel: string) => {
    setPainMarkers(prev => prev.map(m => m.id === id ? { ...m, position, nearestBone, anatomicalLabel } : m));
  }, []);

  const handlePainMarkerRemove = useCallback((id: string) => {
    setPainMarkers(prev => prev.filter(m => m.id !== id));
    if (editingMarkerId === id) {
      setEditingMarkerId(null);
      setMarkerDescription('');
    }
    setClinicalBubbleMarker(prev => prev?.id === id ? null : prev);
  }, [editingMarkerId]);

  const handlePainMarkerUpdate = useCallback((id: string, updates: Partial<PainMarker>) => {
    setPainMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const handleClinicalBubbleDeepDive = useCallback((markerId: string, data: ClinicalBubbleData, answers: Record<string, string>) => {
    const marker = painMarkers.find(m => m.id === markerId);
    if (!marker) return;

    const ddxList = data.differentials.map(d => `${d.name} (${d.likelihood}): ${d.reasoning}`).join('\n');
    const answeredQs = Object.entries(answers).map(([q, a]) => `- ${q}: ${a}`).join('\n');
    const assessments = data.assessment.map(a => `- ${a.test}: ${a.purpose}`).join('\n');
    const treatments = data.treatments.map(t => `- ${t.name}: ${t.description}`).join('\n');
    const exercises = data.exercises.map(e => `- ${e.name}: ${e.description}`).join('\n');

    let prompt = `Deep clinical analysis requested for ${marker.type} pain at the ${marker.anatomicalLabel} (severity: ${clinicalBubbleSeverity}).

**Initial Differential Diagnosis:**
${ddxList}`;

    if (marker.subjectiveHistory) {
      prompt += `\n\n**Patient Subjective History (free-text notes):**\n${marker.subjectiveHistory}`;
    }

    if (answeredQs) {
      prompt += `\n\n**Subjective History Gathered:**\n${answeredQs}`;
    }

    prompt += `\n\n**Suggested Assessments:**\n${assessments}`;
    prompt += `\n\n**Initial Treatment Ideas:**\n${treatments}`;
    prompt += `\n\n**Initial Exercise Ideas:**\n${exercises}`;

    if (data.redFlags.length > 0) {
      prompt += `\n\n**Red Flags Identified:**\n${data.redFlags.map(f => `⚠️ ${f}`).join('\n')}`;
    }

    prompt += `\n\nPlease provide a comprehensive deep-dive clinical analysis. Refine the differential diagnosis, suggest a detailed objective examination protocol, provide a structured treatment plan with progression, and prescribe specific exercises with sets/reps/frequency. Address any red flags and provide clinical reasoning for your recommendations.`;

    setClinicalBubbleMarker(null);
    sendMessageStreaming(prompt);
  }, [painMarkers, clinicalBubbleSeverity]);

  const handlePainMarkerDescriptionSubmit = useCallback((markerId: string, description: string) => {
    if (!description.trim() || isStreaming) return;
    let label = 'Unknown area';
    setPainMarkers(prev => {
      const updated = prev.map(m => {
        if (m.id === markerId) {
          label = m.anatomicalLabel;
          return { ...m, description: description.trim() };
        }
        return m;
      });
      return updated;
    });
    setEditingMarkerId(null);
    setMarkerDescription('');

    let markerInfo = '';
    const targetMarker = painMarkers.find(m => m.id === markerId);
    if (targetMarker) {
      const typeLabels: Record<string, string> = { point: 'focal point of', area: 'broad area of', referred: 'referred', line: 'pain along a line near', paint: 'painted region of' };
      markerInfo = typeLabels[targetMarker.type || 'point'] || 'focal point of';
      if (targetMarker.type === 'referred' && targetMarker.referralTargetLabel) {
        markerInfo += ` pain at ${label} referring to ${targetMarker.referralTargetLabel}`;
        label = '';
      }
    }
    const locationDesc = label ? `${markerInfo} pain at the ${label}` : markerInfo;
    const prompt = `The patient has marked ${locationDesc} on the anatomical skeleton and describes it as: "${description.trim()}"\n\nPlease provide a clinical assessment. What are the likely differential diagnoses? What specific assessments, special tests, or imaging would you recommend? Are there any red flags to consider?`;
    sendMessageStreaming(prompt);
  }, [isStreaming]);

  const handleRomJointSelect = useCallback((jointDef: RomJointDefinition) => {
    setSelectedRomJoint(jointDef);
    const defaults: Record<string, number> = {};
    jointDef.movements.forEach(m => {
      const isDeficitType = m.id.includes('deficit') || m.label.toLowerCase().includes('contracture') || m.label.toLowerCase().includes('lag');
      defaults[m.id] = isDeficitType ? 0 : m.normalRange[1];
    });
    setRomValues(defaults);
  }, []);

  const handleRomSave = useCallback(() => {
    if (!selectedRomJoint) return;
    const newMeasurements: RomMeasurement[] = [];
    selectedRomJoint.movements.forEach(movement => {
      const isDeficitType = movement.id.includes('deficit') || movement.label.toLowerCase().includes('contracture') || movement.label.toLowerCase().includes('lag');
      const val = romValues[movement.id];
      const defaultVal = isDeficitType ? 0 : movement.normalRange[1];
      if (val !== undefined && val !== defaultVal) {
        newMeasurements.push({
          jointId: selectedRomJoint.id,
          jointLabel: selectedRomJoint.label,
          movementId: movement.id,
          movementLabel: movement.label,
          measuredValue: val,
          normalRange: movement.normalRange,
          unit: movement.unit,
          timestamp: Date.now(),
        });
      }
    });
    if (newMeasurements.length > 0) {
      setRomMeasurements(prev => [...prev, ...newMeasurements]);
    }
    setSelectedRomJoint(null);
    setRomValues({});
  }, [selectedRomJoint, romValues]);

  const getRomStatus = useCallback((m: RomMeasurement) => {
    const isDeficitType = m.movementId.includes('deficit') || m.movementLabel.toLowerCase().includes('contracture') || m.movementLabel.toLowerCase().includes('lag');
    if (isDeficitType) {
      return m.measuredValue > m.normalRange[1]
        ? `Abnormal (+${m.measuredValue - m.normalRange[1]}${m.unit} beyond acceptable)`
        : 'Within Normal Limits';
    }
    if (m.normalRange[1] === 0) return 'Within Normal Limits';
    const deficit = Math.round(((m.normalRange[1] - m.measuredValue) / m.normalRange[1]) * 100);
    return m.measuredValue >= m.normalRange[1] ? 'Within Normal Limits' : `Restricted (${deficit}% deficit)`;
  }, []);

  const isRomRestricted = useCallback((m: RomMeasurement) => {
    const isDeficitType = m.movementId.includes('deficit') || m.movementLabel.toLowerCase().includes('contracture') || m.movementLabel.toLowerCase().includes('lag');
    if (isDeficitType) return m.measuredValue > m.normalRange[1];
    return m.measuredValue < m.normalRange[1];
  }, []);

  const handleRomSendToChat = useCallback(() => {
    if (romMeasurements.length === 0) return;
    const byJoint = new Map<string, RomMeasurement[]>();
    romMeasurements.forEach(m => {
      const existing = byJoint.get(m.jointLabel) || [];
      existing.push(m);
      byJoint.set(m.jointLabel, existing);
    });

    let prompt = 'The following Range of Motion (ROM) measurements were recorded during the assessment:\n\n';
    byJoint.forEach((measurements, jointLabel) => {
      prompt += `**${jointLabel}:**\n`;
      measurements.forEach(m => {
        const status = getRomStatus(m);
        prompt += `- ${m.movementLabel}: ${m.measuredValue}${m.unit} (Normal: ${m.normalRange[0]}-${m.normalRange[1]}${m.unit}) — ${status}\n`;
      });
      prompt += '\n';
    });
    prompt += 'Please provide a clinical interpretation of these ROM findings. What are the potential causes of any restrictions? What treatment approaches would you recommend? Are there any functional implications?';
    sendMessageStreaming(prompt);
  }, [romMeasurements, getRomStatus]);

  const handleAskAboutPainMarkers = useCallback(() => {
    if (painMarkers.length === 0) return;
    const typeLabels: Record<string, string> = { point: 'focal point', area: 'broad area', referred: 'referred pain pattern', line: 'pain along a line/path', paint: 'painted symptom region' };
    const markerDescriptions = painMarkers.map((m, i) => {
      const desc = m.description ? ` - "${m.description}"` : '';
      const typeInfo = typeLabels[m.type || 'point'] || 'focal point';
      let extra = '';
      if (m.type === 'referred' && m.referralTargetLabel) extra = ` → refers to ${m.referralTargetLabel}`;
      if (m.type === 'line' && m.linePoints) extra = ` (${m.linePoints.length + 1} points along path)`;
      if (m.type === 'area' && m.radius) extra = ` (radius ~${Math.round(m.radius * 100)}mm)`;
      if (m.type === 'paint' && m.paintPoints) extra = ` (free-drawn region with ${m.paintPoints.length} points)`;
      const symptomInfo = m.symptomType && SYMPTOM_TYPES[m.symptomType] ? ` {${SYMPTOM_TYPES[m.symptomType].label}}` : '';
      const subjHx = m.subjectiveHistory ? ` | Subjective Hx: "${m.subjectiveHistory}"` : '';
      return `${i + 1}. ${m.anatomicalLabel} [${typeInfo}]${symptomInfo}${extra}${desc}${subjHx}`;
    }).join('\n');
    const prompt = `The patient has indicated symptoms in the following areas on the anatomical skeleton:\n${markerDescriptions}\n\nPlease provide a clinical assessment considering these symptom locations, types, and patterns. What could be the differential diagnoses? What assessment approach would you recommend? Are there any patterns suggesting a specific condition? Pay special attention to any referred pain patterns, symptom distributions (including non-pain symptoms like numbness, tingling, weakness), and any subjective history provided.`;
    sendMessageStreaming(prompt);
  }, [painMarkers]);

  const BIOMECHANICAL_REGION_TO_MUSCLES: Record<string, string[]> = useMemo(() => ({
    'right shoulder': ['deltoid_r', 'scapula_r'],
    'left shoulder': ['deltoid_l', 'scapula_l'],
    'shoulder': ['deltoid_r', 'deltoid_l', 'scapula_r', 'scapula_l'],
    'right arm': ['deltoid_r', 'bicep_r'],
    'left arm': ['deltoid_l', 'bicep_l'],
    'right elbow': ['bicep_r'],
    'left elbow': ['bicep_l'],
    'right hip': ['glute_r', 'quad_r'],
    'left hip': ['glute_l', 'quad_l'],
    'hip': ['glute_r', 'glute_l', 'quad_r', 'quad_l'],
    'pelvis': ['glute_r', 'glute_l', 'core'],
    'right knee': ['quad_r', 'calf_r'],
    'left knee': ['quad_l', 'calf_l'],
    'knee': ['quad_r', 'quad_l', 'calf_r', 'calf_l'],
    'right ankle': ['calf_r', 'shin_r'],
    'left ankle': ['calf_l', 'shin_l'],
    'ankle': ['calf_r', 'calf_l', 'shin_r', 'shin_l'],
    'right foot': ['shin_r', 'foot_r'],
    'left foot': ['shin_l', 'foot_l'],
    'foot': ['shin_r', 'shin_l', 'foot_r', 'foot_l'],
    'right thigh': ['quad_r'],
    'left thigh': ['quad_l'],
    'right calf': ['calf_r'],
    'left calf': ['calf_l'],
    'right leg': ['quad_r', 'calf_r', 'shin_r'],
    'left leg': ['quad_l', 'calf_l', 'shin_l'],
    'leg': ['quad_r', 'quad_l', 'calf_r', 'calf_l', 'shin_r', 'shin_l'],
    'cervical spine': ['neck'],
    'cervical': ['neck'],
    'neck': ['neck'],
    'thoracic spine': ['spine', 'chest'],
    'thoracic': ['spine', 'chest'],
    'lumbar spine': ['core', 'spine'],
    'lumbar': ['core', 'spine'],
    'lower back': ['core', 'spine'],
    'upper back': ['spine', 'chest', 'scapula_r', 'scapula_l'],
    'back': ['spine', 'core'],
    'spine': ['spine', 'core', 'neck'],
    'chest': ['chest'],
    'core': ['core'],
    'trunk': ['chest', 'spine', 'core'],
    'abdomen': ['core'],
    'gluteal': ['glute_r', 'glute_l'],
    'right gluteal': ['glute_r'],
    'left gluteal': ['glute_l'],
    'hamstring': ['quad_r', 'quad_l'],
    'right hamstring': ['quad_r'],
    'left hamstring': ['quad_l'],
    'quadriceps': ['quad_r', 'quad_l'],
    'right quadriceps': ['quad_r'],
    'left quadriceps': ['quad_l'],
    'right rotator cuff': ['deltoid_r', 'scapula_r'],
    'left rotator cuff': ['deltoid_l', 'scapula_l'],
    'rotator cuff': ['deltoid_r', 'deltoid_l', 'scapula_r', 'scapula_l'],
    'scapula': ['scapula_r', 'scapula_l'],
    'right scapula': ['scapula_r'],
    'left scapula': ['scapula_l'],
    'right deltoid': ['deltoid_r'],
    'left deltoid': ['deltoid_l'],
    'right bicep': ['bicep_r'],
    'left bicep': ['bicep_l'],
    'right forearm': ['bicep_r'],
    'left forearm': ['bicep_l'],
    'wrist': ['bicep_r', 'bicep_l'],
    'right wrist': ['bicep_r'],
    'left wrist': ['bicep_l'],
    'hand': ['bicep_r', 'bicep_l'],
    'right hand': ['bicep_r'],
    'left hand': ['bicep_l'],
    'achilles': ['calf_r', 'calf_l'],
    'right achilles': ['calf_r'],
    'left achilles': ['calf_l'],
    'plantar fascia': ['foot_r', 'foot_l'],
    'right plantar': ['foot_r'],
    'left plantar': ['foot_l'],
    'it band': ['quad_r', 'quad_l', 'glute_r', 'glute_l'],
    'right it band': ['quad_r', 'glute_r'],
    'left it band': ['quad_l', 'glute_l'],
    'sacroiliac': ['core', 'glute_r', 'glute_l'],
    'si joint': ['core', 'glute_r', 'glute_l'],
  }), []);

  const MUSCLE_STATUS_COLORS: Record<string, string> = useMemo(() => ({
    weak: '#4488ff',
    tight: '#ff4444',
    overactive: '#ff8800',
    inhibited: '#9944ff',
    normal: '#44ccaa',
  }), []);

  const inferMuscleStatusFromText = useCallback((text: string): 'weak' | 'tight' | 'overactive' | 'inhibited' | 'normal' => {
    const lower = text.toLowerCase();
    if (/\b(inhibited|inhibition|suppressed)\b/.test(lower)) return 'inhibited';
    if (/\b(overactive|hyperactive|spasm|hypertonic)\b/.test(lower)) return 'overactive';
    if (/\b(weak|weakness|underactive|atrophy)\b/.test(lower)) return 'weak';
    if (/\b(tight|tightness|shortened|contracture|stiff|restricted)\b/.test(lower)) return 'tight';
    return 'normal';
  }, []);

  const handleBiomechanicalLinkClick = useCallback((link: BiomechanicalLink | null) => {
    setVisualizationBoneHighlights([]);
    if (!link) {
      setActiveBiomechanicalLink(null);
      setActiveVisualizationId(null);
      setBiomechanicalMuscleHighlights([]);
      setMuscleHighlightColors({});
      return;
    }
    setActiveBiomechanicalLink(link);
    setActiveVisualizationId(`biolink-${link.primaryRegion}-${link.connectedRegion}`);

    const findMuscles = (regionName: string): string[] => {
      const lower = regionName.toLowerCase().trim();
      if (BIOMECHANICAL_REGION_TO_MUSCLES[lower]) {
        return BIOMECHANICAL_REGION_TO_MUSCLES[lower];
      }
      const words = lower.split(/\s+/);
      let bestMatch: string[] | null = null;
      let bestScore = 0;
      for (const [key, muscles] of Object.entries(BIOMECHANICAL_REGION_TO_MUSCLES)) {
        const keyWords = key.split(/\s+/);
        const matchingWords = keyWords.filter(w => words.includes(w));
        const score = matchingWords.length / Math.max(keyWords.length, words.length);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = muscles;
        }
      }
      return bestMatch || [];
    };

    const primaryMuscles = findMuscles(link.primaryRegion);
    const connectedMuscles = findMuscles(link.connectedRegion);
    const allMuscles = Array.from(new Set([...primaryMuscles, ...connectedMuscles]));

    const linkText = `${link.mechanism} ${link.clinicalRelevance}`;
    const inferredStatus = inferMuscleStatusFromText(linkText);
    const statusColor = MUSCLE_STATUS_COLORS[inferredStatus] || MUSCLE_STATUS_COLORS.normal;
    const colorMap: Record<string, string> = {};
    for (const m of allMuscles) {
      colorMap[m] = statusColor;
    }

    setBiomechanicalMuscleHighlights(allMuscles);
    setMuscleHighlightColors(colorMap);
  }, [BIOMECHANICAL_REGION_TO_MUSCLES, inferMuscleStatusFromText, MUSCLE_STATUS_COLORS]);

  const VISUALIZATION_MUSCLE_MAP: Record<string, string[]> = useMemo(() => ({
    'deltoid': ['deltoid_r', 'deltoid_l'],
    'trapezius': ['scapula_r', 'scapula_l', 'neck'],
    'upper trapezius': ['neck', 'scapula_r', 'scapula_l'],
    'lower trapezius': ['scapula_r', 'scapula_l'],
    'middle trapezius': ['scapula_r', 'scapula_l'],
    'rotator cuff': ['deltoid_r', 'deltoid_l', 'scapula_r', 'scapula_l'],
    'supraspinatus': ['deltoid_r', 'deltoid_l'],
    'infraspinatus': ['scapula_r', 'scapula_l'],
    'subscapularis': ['scapula_r', 'scapula_l'],
    'pectoralis': ['chest'],
    'biceps': ['bicep_r', 'bicep_l'],
    'triceps': ['bicep_r', 'bicep_l'],
    'latissimus': ['spine', 'scapula_r', 'scapula_l'],
    'rhomboid': ['scapula_r', 'scapula_l'],
    'serratus': ['chest', 'scapula_r', 'scapula_l'],
    'levator scapulae': ['neck', 'scapula_r', 'scapula_l'],
    'sternocleidomastoid': ['neck'],
    'scalene': ['neck'],
    'gluteus maximus': ['glute_r', 'glute_l'],
    'gluteus medius': ['glute_r', 'glute_l'],
    'gluteus minimus': ['glute_r', 'glute_l'],
    'piriformis': ['glute_r', 'glute_l'],
    'psoas': ['core', 'quad_r', 'quad_l'],
    'iliacus': ['core', 'quad_r', 'quad_l'],
    'hip flexor': ['core', 'quad_r', 'quad_l'],
    'tensor fasciae latae': ['glute_r', 'glute_l', 'quad_r', 'quad_l'],
    'tfl': ['glute_r', 'glute_l', 'quad_r', 'quad_l'],
    'quadriceps': ['quad_r', 'quad_l'],
    'rectus femoris': ['quad_r', 'quad_l'],
    'vastus lateralis': ['quad_r', 'quad_l'],
    'vastus medialis': ['quad_r', 'quad_l'],
    'hamstring': ['quad_r', 'quad_l'],
    'biceps femoris': ['quad_r', 'quad_l'],
    'semitendinosus': ['quad_r', 'quad_l'],
    'semimembranosus': ['quad_r', 'quad_l'],
    'gastrocnemius': ['calf_r', 'calf_l'],
    'soleus': ['calf_r', 'calf_l'],
    'tibialis anterior': ['shin_r', 'shin_l'],
    'tibialis posterior': ['shin_r', 'shin_l'],
    'peroneal': ['shin_r', 'shin_l'],
    'adductor': ['quad_r', 'quad_l'],
    'abductor': ['glute_r', 'glute_l'],
    'erector spinae': ['spine', 'core'],
    'multifidus': ['spine', 'core'],
    'transverse abdominis': ['core'],
    'oblique': ['core'],
    'rectus abdominis': ['core'],
    'diaphragm': ['core', 'chest'],
  }), []);

  const REGION_TO_BONE_NAMES: Record<string, string[]> = useMemo(() => ({
    'shoulder': ['Shoulder_L', 'Shoulder_R'],
    'knee': ['Knee_L', 'Knee_R'],
    'hip': ['Hip_L', 'Hip_R', 'RootPart1_M'],
    'ankle': ['Ankle_L', 'Ankle_R'],
    'neck': ['Neck_M'],
    'cervical': ['Neck_M'],
    'thoracic': ['Spine1_M', 'Spine2_M'],
    'lumbar': ['RootPart1_M'],
    'low back': ['RootPart1_M'],
    'pelvis': ['RootPart1_M', 'Hip_L', 'Hip_R'],
    'spine': ['RootPart1_M', 'Spine1_M', 'Spine2_M'],
    'elbow': ['Elbow_L', 'Elbow_R'],
    'wrist': ['Elbow_L', 'Elbow_R'],
    'sacroiliac': ['RootPart1_M', 'Hip_L', 'Hip_R'],
    'foot': ['Ankle_L', 'Ankle_R'],
    'hand': ['Elbow_L', 'Elbow_R'],
  }), []);

  const FASCIAL_CHAIN_TO_MUSCLES: Record<string, string[]> = useMemo(() => ({
    'superficial back line': ['calf_r', 'calf_l', 'quad_r', 'quad_l', 'glute_r', 'glute_l', 'core', 'neck'],
    'posterior chain': ['calf_r', 'calf_l', 'quad_r', 'quad_l', 'glute_r', 'glute_l', 'core', 'neck'],
    'superficial front line': ['shin_r', 'shin_l', 'quad_r', 'quad_l', 'core', 'chest', 'neck'],
    'anterior chain': ['shin_r', 'shin_l', 'quad_r', 'quad_l', 'core', 'chest', 'neck'],
    'lateral line': ['shin_r', 'shin_l', 'quad_r', 'quad_l', 'glute_r', 'glute_l', 'core', 'deltoid_r', 'deltoid_l', 'neck'],
    'spiral line': ['shin_r', 'shin_l', 'quad_r', 'quad_l', 'core', 'scapula_r', 'scapula_l', 'neck'],
    'deep front line': ['shin_r', 'shin_l', 'quad_r', 'quad_l', 'core', 'chest', 'neck'],
    'arm lines': ['deltoid_r', 'deltoid_l', 'bicep_l', 'scapula_r', 'scapula_l', 'chest'],
    'functional line': ['glute_r', 'glute_l', 'core', 'chest', 'deltoid_r', 'deltoid_l'],
    'posterior oblique sling': ['glute_r', 'glute_l', 'core', 'scapula_r', 'scapula_l'],
    'anterior oblique sling': ['core', 'quad_r', 'quad_l', 'chest'],
    'lateral sling': ['glute_r', 'glute_l', 'core', 'quad_r', 'quad_l'],
    'deep longitudinal sling': ['shin_r', 'shin_l', 'glute_r', 'glute_l', 'core'],
  }), []);

  const handleVisualizationRequest = useCallback((request: VisualizationRequest | null) => {
    setActiveBiomechanicalLink(null);
    if (!request) {
      setActiveVisualizationId(null);
      setBiomechanicalMuscleHighlights([]);
      setMuscleHighlightColors({});
      setVisualizationBoneHighlights([]);
      return;
    }
    setActiveVisualizationId(request.id);

    const muscleGroupIds = new Set<string>();
    const colorMap: Record<string, string> = {};

    for (const hint of request.muscleHints) {
      const mapped = VISUALIZATION_MUSCLE_MAP[hint.muscle];
      if (mapped) {
        const statusColor = MUSCLE_STATUS_COLORS[hint.status] || MUSCLE_STATUS_COLORS.normal;
        mapped.forEach(m => {
          muscleGroupIds.add(m);
          if (!colorMap[m]) {
            colorMap[m] = statusColor;
          }
        });
      }
    }

    for (const region of request.regions) {
      const lower = region.toLowerCase().trim();
      if (BIOMECHANICAL_REGION_TO_MUSCLES[lower]) {
        BIOMECHANICAL_REGION_TO_MUSCLES[lower].forEach(m => muscleGroupIds.add(m));
      } else {
        let matched = false;
        for (const [key, muscles] of Object.entries(BIOMECHANICAL_REGION_TO_MUSCLES)) {
          if (key.includes(lower) || lower.includes(key)) {
            muscles.forEach(m => muscleGroupIds.add(m));
            matched = true;
            break;
          }
        }
        if (!matched) {
          for (const [chainKey, muscles] of Object.entries(FASCIAL_CHAIN_TO_MUSCLES)) {
            if (lower.includes(chainKey) || chainKey.includes(lower)) {
              muscles.forEach(m => muscleGroupIds.add(m));
              break;
            }
          }
        }
      }
    }

    if (muscleGroupIds.size === 0) {
      const textLower = request.label.toLowerCase();
      for (const [key, muscles] of Object.entries(BIOMECHANICAL_REGION_TO_MUSCLES)) {
        if (textLower.includes(key)) {
          muscles.forEach(m => muscleGroupIds.add(m));
        }
      }
      if (muscleGroupIds.size === 0) {
        for (const [chainKey, muscles] of Object.entries(FASCIAL_CHAIN_TO_MUSCLES)) {
          if (textLower.includes(chainKey)) {
            muscles.forEach(m => muscleGroupIds.add(m));
          }
        }
      }
    }

    const boneHighlights: Array<{ boneName: string; color: number; intensity: number }> = [];
    if (request.type === 'rootCause' || request.type === 'biomechanical' || request.type === 'painDriver') {
      const statusColorHex = request.muscleHints.length > 0
        ? MUSCLE_STATUS_COLORS[request.muscleHints[0].status] || MUSCLE_STATUS_COLORS.normal
        : MUSCLE_STATUS_COLORS.normal;
      const boneColor = parseInt(statusColorHex.replace('#', ''), 16);

      const allText = `${request.label} ${request.regions.join(' ')}`.toLowerCase();
      const boneNames = new Set<string>();
      for (const [key, bones] of Object.entries(REGION_TO_BONE_NAMES)) {
        if (allText.includes(key)) {
          bones.forEach(b => boneNames.add(b));
        }
      }
      for (const region of request.regions) {
        const lower = region.toLowerCase().trim();
        for (const [key, bones] of Object.entries(REGION_TO_BONE_NAMES)) {
          if (key.includes(lower) || lower.includes(key)) {
            bones.forEach(b => boneNames.add(b));
          }
        }
      }
      for (const boneName of boneNames) {
        boneHighlights.push({ boneName, color: boneColor, intensity: 0.6 });
      }
    }

    setBiomechanicalMuscleHighlights(Array.from(muscleGroupIds));
    setMuscleHighlightColors(colorMap);
    setVisualizationBoneHighlights(boneHighlights);
  }, [BIOMECHANICAL_REGION_TO_MUSCLES, VISUALIZATION_MUSCLE_MAP, MUSCLE_STATUS_COLORS, REGION_TO_BONE_NAMES, FASCIAL_CHAIN_TO_MUSCLES]);

  const handlePosturalMetricsUpdate = useCallback((metrics: PosturalMetrics) => {
    if (!cameraPoseActive) return;
    setPosturalMetrics(metrics);

    setModelConfig(prev => ({
      ...prev,
      spine: {
        ...prev.spine,
        thoracicKyphosis: Math.round(metrics.kyphosisAngle),
        lumbarLordosis: Math.round(metrics.lordosisAngle),
        scoliosis: Math.round(metrics.scoliosisAngle) * (metrics.scoliosisDirection === 'left' ? -1 : 1),
        forwardHead: Math.round(metrics.forwardHeadAngle),
        lateralShift: Math.round(metrics.trunkLateralShift),
      },
      pelvis: {
        ...prev.pelvis,
        tilt: Math.round(metrics.anteriorPelvicTilt),
        obliquity: Math.round(metrics.pelvicObliquity),
        rotation: Math.round(metrics.pelvicRotation),
      },
    }));
  }, [cameraPoseActive]);

  const handleCameraPoseUpdate = useCallback((pose: Skeleton3DPose) => {
    if (!cameraPoseActive) return;
    const controllerVals = poseToControllerValues(pose);
    const smoothed = controllerSmootherRef.current.smooth(controllerVals);
    const rad2deg = (r: number) => Math.round((r * 180) / Math.PI);

    setModelConfig(prev => ({
      ...prev,
      leftShoulder: { ...prev.leftShoulder, flexion: rad2deg(smoothed.leftShoulder.flexion), abduction: DEFAULT_MODEL_CONFIG.leftShoulder.abduction + rad2deg(smoothed.leftShoulder.abduction), internalRotation: rad2deg(smoothed.leftShoulder.internalRotation) },
      rightShoulder: { ...prev.rightShoulder, flexion: rad2deg(smoothed.rightShoulder.flexion), abduction: DEFAULT_MODEL_CONFIG.rightShoulder.abduction + rad2deg(smoothed.rightShoulder.abduction), internalRotation: rad2deg(smoothed.rightShoulder.internalRotation) },
      leftElbow: { ...prev.leftElbow, flexion: rad2deg(smoothed.leftElbow.flexion), pronation: rad2deg(smoothed.leftElbow.pronation) },
      rightElbow: { ...prev.rightElbow, flexion: rad2deg(smoothed.rightElbow.flexion), pronation: rad2deg(smoothed.rightElbow.pronation) },
      leftHip: { ...prev.leftHip, flexion: rad2deg(smoothed.leftHip.flexion), abduction: rad2deg(smoothed.leftHip.abduction) },
      rightHip: { ...prev.rightHip, flexion: rad2deg(smoothed.rightHip.flexion), abduction: rad2deg(smoothed.rightHip.abduction) },
      leftKnee: { ...prev.leftKnee, flexion: rad2deg(smoothed.leftKnee.flexion) },
      rightKnee: { ...prev.rightKnee, flexion: rad2deg(smoothed.rightKnee.flexion) },
      neck: { ...prev.neck, flexion: rad2deg(smoothed.neck.flexion), rotation: rad2deg(smoothed.neck.rotation), lateralFlexion: rad2deg(smoothed.neck.lateralFlexion) },
    }));
  }, [cameraPoseActive]);

  const handlePartialPoseUpdate = useCallback((partialPose: PartialSkeleton3DPose) => {
    if (!cameraPoseActive) return;
    const rad2deg = (r: number) => Math.round((r * 180) / Math.PI);

    setModelConfig(prev => {
      const next = { ...prev };
      if (partialPose.leftShoulder) {
        next.leftShoulder = { ...prev.leftShoulder, flexion: rad2deg(partialPose.leftShoulder.x), abduction: DEFAULT_MODEL_CONFIG.leftShoulder.abduction + rad2deg(partialPose.leftShoulder.z), internalRotation: rad2deg(partialPose.leftShoulder.y) };
      }
      if (partialPose.rightShoulder) {
        next.rightShoulder = { ...prev.rightShoulder, flexion: rad2deg(partialPose.rightShoulder.x), abduction: DEFAULT_MODEL_CONFIG.rightShoulder.abduction + rad2deg(partialPose.rightShoulder.z), internalRotation: rad2deg(partialPose.rightShoulder.y) };
      }
      if (partialPose.leftElbow) {
        next.leftElbow = { ...prev.leftElbow, flexion: rad2deg(partialPose.leftElbow.x), pronation: rad2deg(partialPose.leftElbow.y) };
      }
      if (partialPose.rightElbow) {
        next.rightElbow = { ...prev.rightElbow, flexion: rad2deg(partialPose.rightElbow.x), pronation: rad2deg(partialPose.rightElbow.y) };
      }
      if (partialPose.leftHip) {
        next.leftHip = { ...prev.leftHip, flexion: rad2deg(partialPose.leftHip.x), abduction: rad2deg(partialPose.leftHip.z) };
      }
      if (partialPose.rightHip) {
        next.rightHip = { ...prev.rightHip, flexion: rad2deg(partialPose.rightHip.x), abduction: rad2deg(partialPose.rightHip.z) };
      }
      if (partialPose.leftKnee) {
        next.leftKnee = { ...prev.leftKnee, flexion: rad2deg(partialPose.leftKnee.x) };
      }
      if (partialPose.rightKnee) {
        next.rightKnee = { ...prev.rightKnee, flexion: rad2deg(partialPose.rightKnee.x) };
      }
      if (partialPose.spine) {
        next.spine = { ...prev.spine, thoracicKyphosis: rad2deg(partialPose.spine.x), scoliosis: rad2deg(partialPose.spine.z) };
      }
      if (partialPose.neck) {
        next.neck = { ...prev.neck, flexion: rad2deg(partialPose.neck.x), rotation: rad2deg(partialPose.neck.y), lateralFlexion: rad2deg(partialPose.neck.z) };
      }
      return next;
    });
  }, [cameraPoseActive]);

  const toggleCameraMode = useCallback(() => {
    const newMode = !cameraMode;
    setCameraMode(newMode);
    if (newMode) {
      setPainMarkerMode(false);
      setRomMode(false);
      setPoseMode(false);
      setSelectedRomJoint(null);
      setCameraPoseActive(true);
      controllerSmootherRef.current = new ControllerSmoother(0.5, 0.015);
      toast({ title: "Camera Capture", description: "Position the patient in frame. The skeleton will mirror their posture in real-time." });
    } else {
      setCameraPoseActive(false);
      setPosturalMetrics(null);
    }
  }, [cameraMode, toast]);

  const handleCapturePose = useCallback(() => {
    setCameraPoseActive(false);
    setCameraMode(false);
    toast({ title: "Pose Captured", description: "Patient posture has been captured on the skeleton. You can now analyze it or add pain markers." });
  }, [toast]);

  const pendingCameraAnalysisRef = useRef<FocusedCameraResult | null>(null);

  const handleFocusedAnalysisComplete = useCallback((result: FocusedCameraResult) => {
    setFocusedCameraResult(result);
    pendingCameraAnalysisRef.current = result;

    const REGION_BONE_POSITIONS: Record<string, { bone: string; position: { x: number; y: number; z: number } }> = {
      'right ankle': { bone: 'Ankle_R', position: { x: -0.65, y: 0.49, z: -0.15 } },
      'left ankle': { bone: 'Ankle_L', position: { x: 0.65, y: 0.49, z: -0.15 } },
      'right knee': { bone: 'Knee_R', position: { x: -0.55, y: 2.6, z: 0.1 } },
      'left knee': { bone: 'Knee_L', position: { x: 0.55, y: 2.6, z: 0.1 } },
      'right hip': { bone: 'Hip_R', position: { x: -0.5, y: 4.8, z: 0 } },
      'left hip': { bone: 'Hip_L', position: { x: 0.5, y: 4.8, z: 0 } },
      'right shoulder': { bone: 'Shoulder_R', position: { x: -1.2, y: 8.2, z: 0 } },
      'left shoulder': { bone: 'Shoulder_L', position: { x: 1.2, y: 8.2, z: 0 } },
      'right elbow': { bone: 'Elbow_R', position: { x: -1.8, y: 7.0, z: 0 } },
      'left elbow': { bone: 'Elbow_L', position: { x: 1.8, y: 7.0, z: 0 } },
      'right wrist': { bone: 'Wrist_R', position: { x: -2.2, y: 5.8, z: 0 } },
      'left wrist': { bone: 'Wrist_L', position: { x: 2.2, y: 5.8, z: 0 } },
      'neck': { bone: 'Neck_M', position: { x: 0, y: 8.8, z: 0 } },
      'cervical': { bone: 'Neck_M', position: { x: 0, y: 8.8, z: 0 } },
      'lumbar': { bone: 'Spine1_M', position: { x: 0, y: 5.5, z: -0.2 } },
      'lower back': { bone: 'Spine1_M', position: { x: 0, y: 5.5, z: -0.2 } },
      'low back': { bone: 'Spine1_M', position: { x: 0, y: 5.5, z: -0.2 } },
      'thoracic': { bone: 'Chest_M', position: { x: 0, y: 7.2, z: -0.1 } },
      'upper back': { bone: 'Chest_M', position: { x: 0, y: 7.2, z: -0.1 } },
      'pelvis': { bone: 'Root_M', position: { x: 0, y: 4.8, z: 0 } },
      'sacroiliac': { bone: 'Root_M', position: { x: 0.2, y: 4.6, z: -0.2 } },
      'posterior knee': { bone: 'Knee_R', position: { x: -0.55, y: 2.6, z: -0.3 } },
      'popliteal': { bone: 'Knee_R', position: { x: -0.55, y: 2.6, z: -0.3 } },
      'patella': { bone: 'Knee_R', position: { x: -0.55, y: 2.7, z: 0.3 } },
      'achilles': { bone: 'Ankle_R', position: { x: -0.65, y: 0.8, z: -0.2 } },
      'calf': { bone: 'Knee_R', position: { x: -0.55, y: 1.8, z: -0.15 } },
      'quadriceps': { bone: 'HipPart2_R', position: { x: -0.5, y: 3.5, z: 0.2 } },
      'hamstring': { bone: 'HipPart2_R', position: { x: -0.5, y: 3.5, z: -0.2 } },
    };

    if (result.suggestedMarkers && result.suggestedMarkers.length > 0) {
      const symptomTypeMap: Record<string, SymptomType> = {
        pain: 'pain', swelling: 'swelling', stiffness: 'stiffness',
        weakness: 'weakness', numbness: 'numbness', instability: 'instability',
        burning: 'burning', tightness: 'tightness', spasm: 'spasm',
      };

      const newMarkers: PainMarker[] = result.suggestedMarkers.map((sm, idx) => {
        const regionLower = sm.region.toLowerCase();
        let nearestBone = 'Root_M';
        let position = { x: 0, y: 5, z: 0 };
        for (const [key, mapping] of Object.entries(REGION_BONE_POSITIONS)) {
          if (regionLower.includes(key)) {
            nearestBone = mapping.bone;
            position = { ...mapping.position };
            break;
          }
        }
        const symptomType = symptomTypeMap[sm.symptomType] || 'pain';
        return {
          id: `cam_${Date.now()}_${idx}`,
          position,
          nearestBone,
          anatomicalLabel: sm.region,
          type: 'point' as PainMarkerType,
          symptomType,
          description: `[Camera] ${sm.description}`,
        };
      });

      if (newMarkers.length > 0) {
        setPainMarkers(prev => [...prev, ...newMarkers]);
        toast({
          title: "Camera Findings Mapped",
          description: `${newMarkers.length} finding(s) auto-placed on skeleton from camera analysis.`,
        });
      }
    }

    if (result.suggestedPostureAdjustments && Object.keys(result.suggestedPostureAdjustments).length > 0) {
      setModelConfig(prev => {
        const updated = { ...prev };
        for (const [key, value] of Object.entries(result.suggestedPostureAdjustments)) {
          const parts = key.split('.');
          if (parts.length === 2) {
            const [joint, param] = parts;
            if ((updated as any)[joint]) {
              (updated as any)[joint] = { ...(updated as any)[joint], [param]: value };
            }
          }
        }
        return updated;
      });
    }

    const cameraContext = `CAMERA ANALYSIS - ${result.region.label}:\n${result.overallAssessment}\n\nFindings:\n${result.findings.map((f, i) => `${i+1}. [${f.type}] ${f.region}: ${f.description} (${f.severity}, confidence: ${Math.round(f.confidence * 100)}%)`).join('\n')}`;
    subjectiveHistoryRef.current = subjectiveHistoryRef.current
      ? `${subjectiveHistoryRef.current}\n\n${cameraContext}`
      : cameraContext;
    lastReasoningTriggerRef.current = '';
  }, [toast]);

  const pathologyCompensation = useMemo<PathologyCompensationResult | null>(() => {
    const hasPathology = Object.values(muscleOverrides).some(o => o?.isManual && o.pathology !== 'none');
    if (!hasPathology) return null;
    return computePathologyCompensation(muscleOverrides);
  }, [muscleOverrides]);

  const compensatedOverrides = useMemo(() => {
    if (!pathologyCompensation || Object.keys(pathologyCompensation.compensatoryOverrides).length === 0) {
      return muscleOverrides;
    }
    const merged = { ...muscleOverrides };
    for (const [groupId, comp] of Object.entries(pathologyCompensation.compensatoryOverrides)) {
      const existing = merged[groupId];
      if (existing?.isManual) {
        merged[groupId] = {
          ...existing,
          tensionOffset: existing.tensionOffset + (comp.tensionOffset || 0),
          activationOffset: existing.activationOffset + (comp.activationOffset || 0),
        };
      } else {
        merged[groupId] = {
          tensionOffset: comp.tensionOffset || 0,
          activationOffset: comp.activationOffset || 0,
          inhibition: 0,
          lengthOverride: 'none' as const,
          pathology: 'none' as const,
          isManual: true,
        };
      }
    }
    return merged;
  }, [muscleOverrides, pathologyCompensation]);

  const muscleDrivenEffects = useMemo(() => {
    if (!bidirectionalMode) return null;
    const hasManualOverrides = Object.values(compensatedOverrides).some(o => o?.isManual);
    if (!hasManualOverrides) return null;
    return computeBidirectionalEffects(compensatedOverrides, modelConfig);
  }, [compensatedOverrides, modelConfig, bidirectionalMode]);

  const muscleRestrictionEffects = useMemo(() => {
    const effects: MuscleRestrictionEffect[] = [];

    const hasManualOverrides = Object.values(compensatedOverrides).some(o => o?.isManual);
    if (hasManualOverrides) {
      effects.push(...computeMuscleRestrictionEffects(compensatedOverrides));
    }

    if (pathologyCompensation && pathologyCompensation.romRestrictions.length > 0) {
      const camelToSnake: Record<string, string> = {
        leftShoulder: 'left_shoulder', rightShoulder: 'right_shoulder',
        leftHip: 'left_hip', rightHip: 'right_hip',
        leftKnee: 'left_knee', rightKnee: 'right_knee',
        leftAnkle: 'left_ankle', rightAnkle: 'right_ankle',
        leftElbow: 'left_elbow', rightElbow: 'right_elbow',
        leftScapula: 'left_scapula', rightScapula: 'right_scapula',
        spine: 'spine', pelvis: 'pelvis', neck: 'neck',
      };
      for (const restriction of pathologyCompensation.romRestrictions) {
        const snakeJoint = camelToSnake[restriction.joint] || restriction.joint;
        const existing = effects.find(e => e.joint === snakeJoint && e.movement === restriction.parameter);
        if (existing) {
          existing.restrictionPercent = Math.max(existing.restrictionPercent, restriction.restrictionPercent);
        } else {
          effects.push({
            joint: snakeJoint,
            movement: restriction.parameter,
            restrictionPercent: restriction.restrictionPercent,
            reason: restriction.reason,
          });
        }
      }
    }

    return effects.length > 0 ? effects : undefined;
  }, [compensatedOverrides, pathologyCompensation]);

  const effectiveModelConfig = useMemo(() => {
    const config = JSON.parse(JSON.stringify(modelConfig));

    if (muscleDrivenEffects) {
      for (const [joint, params] of Object.entries(muscleDrivenEffects.jointAdjustments)) {
        if (!config[joint]) config[joint] = {};
        for (const [param, value] of Object.entries(params)) {
          const current = config[joint][param] || 0;
          config[joint][param] = current + value;
        }
      }
      for (const [joint, params] of Object.entries(muscleDrivenEffects.couplingEffects)) {
        if (!config[joint]) config[joint] = {};
        for (const [param, value] of Object.entries(params)) {
          const current = config[joint][param] || 0;
          config[joint][param] = current + value;
        }
      }
    }

    if (pathologyCompensation) {
      for (const deviation of pathologyCompensation.posturalDeviations) {
        if (!config[deviation.joint]) config[deviation.joint] = {};
        const current = config[deviation.joint][deviation.parameter] || 0;
        config[deviation.joint][deviation.parameter] = current + deviation.deviationDegrees;
      }

      for (const restriction of pathologyCompensation.romRestrictions) {
        if (!config[restriction.joint]) config[restriction.joint] = {};
        const current = config[restriction.joint][restriction.parameter] || 0;
        const maxAllowed = current * (1 - restriction.restrictionPercent / 100);
        if (Math.abs(current) > Math.abs(maxAllowed) && Math.abs(current) > 0) {
          config[restriction.joint][restriction.parameter] = maxAllowed;
        }
      }
    }

    return config;
  }, [modelConfig, muscleDrivenEffects, pathologyCompensation]);

  const handleAnalyzeSkeleton = useCallback(() => {
    const sections: string[] = [];

    const deviations: string[] = [];
    const mc = modelConfig;
    const addIfNonZero = (label: string, val: number | undefined, unit = '°') => {
      if (val && Math.abs(val) > 0) deviations.push(`${label}: ${val > 0 ? '+' : ''}${val}${unit}`);
    };
    addIfNonZero('Thoracic Kyphosis', mc.spine?.thoracicKyphosis);
    addIfNonZero('Lumbar Lordosis', mc.spine?.lumbarLordosis);
    addIfNonZero('Scoliosis', mc.spine?.scoliosis);
    addIfNonZero('Forward Head', mc.spine?.forwardHead);
    addIfNonZero('Lateral Shift', mc.spine?.lateralShift);
    addIfNonZero('Cervical Rotation', mc.neck?.rotation);
    addIfNonZero('Cervical Flexion', mc.neck?.flexion);
    addIfNonZero('Cervical Lateral Flexion', mc.neck?.lateralFlexion);
    addIfNonZero('Pelvis Tilt', mc.pelvis?.tilt);
    addIfNonZero('Pelvis Obliquity', mc.pelvis?.obliquity);
    addIfNonZero('Pelvis Rotation', mc.pelvis?.rotation);
    addIfNonZero('L Hip Flexion', mc.leftHip?.flexion);
    addIfNonZero('L Hip Abduction', mc.leftHip?.abduction);
    addIfNonZero('L Hip Internal Rotation', mc.leftHip?.internalRotation);
    addIfNonZero('R Hip Flexion', mc.rightHip?.flexion);
    addIfNonZero('R Hip Abduction', mc.rightHip?.abduction);
    addIfNonZero('R Hip Internal Rotation', mc.rightHip?.internalRotation);
    addIfNonZero('L Knee Flexion', mc.leftKnee?.flexion);
    addIfNonZero('L Knee Varus', mc.leftKnee?.varus);
    addIfNonZero('R Knee Flexion', mc.rightKnee?.flexion);
    addIfNonZero('R Knee Varus', mc.rightKnee?.varus);
    addIfNonZero('L Ankle Dorsiflexion', mc.leftAnkle?.dorsiflexion);
    addIfNonZero('L Ankle Plantarflexion', mc.leftAnkle?.plantarflexion);
    addIfNonZero('R Ankle Dorsiflexion', mc.rightAnkle?.dorsiflexion);
    addIfNonZero('R Ankle Plantarflexion', mc.rightAnkle?.plantarflexion);
    addIfNonZero('L Shoulder Flexion', mc.leftShoulder?.flexion);
    addIfNonZero('L Shoulder Abduction', mc.leftShoulder?.abduction);
    addIfNonZero('R Shoulder Flexion', mc.rightShoulder?.flexion);
    addIfNonZero('R Shoulder Abduction', mc.rightShoulder?.abduction);
    addIfNonZero('L Elbow Flexion', mc.leftElbow?.flexion);
    addIfNonZero('R Elbow Flexion', mc.rightElbow?.flexion);

    if (deviations.length > 0) {
      sections.push(`**Current Skeleton Posture / Joint Angles:**\n${deviations.join('\n')}`);
    } else {
      sections.push('**Current Skeleton Posture:** Neutral standing position (all joints at 0°)');
    }

    if (painMarkers.length > 0) {
      const typeLabels: Record<string, string> = { point: 'focal point', area: 'broad area', referred: 'referred pain pattern', line: 'pain along a line/path', paint: 'painted symptom region' };
      const markerLines = painMarkers.map((m, i) => {
        const desc = m.description ? ` - "${m.description}"` : '';
        const typeInfo = typeLabels[m.type || 'point'] || 'focal point';
        let extra = '';
        if (m.type === 'referred' && m.referralTargetLabel) extra = ` → refers to ${m.referralTargetLabel}`;
        if (m.type === 'line' && m.linePoints) extra = ` (${m.linePoints.length + 1} points along path)`;
        if (m.type === 'area' && m.radius) extra = ` (radius ~${Math.round(m.radius * 100)}mm)`;
        if (m.type === 'paint' && m.paintPoints) extra = ` (free-drawn region with ${m.paintPoints.length} points)`;
        const symptomInfo = m.symptomType && SYMPTOM_TYPES[m.symptomType] ? ` {${SYMPTOM_TYPES[m.symptomType].label}}` : '';
        const subjHx = m.subjectiveHistory ? ` | Subjective Hx: "${m.subjectiveHistory}"` : '';
        return `${i + 1}. ${m.anatomicalLabel} [${typeInfo}]${symptomInfo}${extra}${desc}${subjHx}`;
      });
      sections.push(`**Symptom Markers (${painMarkers.length}):**\n${markerLines.join('\n')}`);
    }

    const forces = calculatePosturalForces(effectiveModelConfig);
    const highForces = forces.joints.filter(j => j.status === 'high' || j.status === 'very_high');
    const forceLines = forces.joints.map(j =>
      `- ${j.label}: C=${(j.compression * 100).toFixed(0)}% T=${(j.tension * 100).toFixed(0)}% S=${(j.shear * 100).toFixed(0)}% BW (${forceToNewtons(j.totalForce, bodyWeightKg)}N) — ${j.status}`
    );
    sections.push(`**Estimated Joint Forces (Body Weight: ${bodyWeightKg}kg):**\n${forceLines.join('\n')}`);
    if (highForces.length > 0) {
      sections.push(`**Elevated Loading Detected:** ${highForces.map(j => j.label).join(', ')}`);
    }
    if (forces.baseSupportShift > 0.02) {
      sections.push('**Center of Mass:** Shifted from base of support center');
    }

    if (romMeasurements.length > 0) {
      const romLines = romMeasurements.map(m => {
        const status = getRomStatus(m);
        return `- ${m.jointLabel} ${m.movementLabel}: ${m.measuredValue}${m.unit} (Normal: ${m.normalRange[0]}-${m.normalRange[1]}${m.unit}) — ${status}`;
      });
      sections.push(`**ROM Measurements:**\n${romLines.join('\n')}`);
    }

    const prompt = `I need a comprehensive clinical analysis of the following patient skeleton assessment:\n\n${sections.join('\n\n')}\n\nPlease provide:\n1. **Postural Assessment**: Analyze the overall posture and identify any deviations, asymmetries, or compensatory patterns\n2. **Biomechanical Analysis**: Interpret the joint forces and loading patterns — are any joints at risk?\n3. **Pain Pattern Analysis**: If pain markers are present, correlate them with the postural findings and joint loading\n4. **Differential Diagnoses**: What conditions could explain this presentation?\n5. **Clinical Recommendations**: Assessment priorities, treatment approaches, and exercise prescription\n6. **Red Flags**: Any concerning findings that warrant further investigation`;

    sendMessageStreaming(prompt);
    toast({ title: "Analyzing Skeleton", description: "Sending full skeleton assessment to AI for clinical interpretation..." });
  }, [modelConfig, effectiveModelConfig, painMarkers, bodyWeightKg, romMeasurements, getRomStatus]);

  const handleSendMessage = useCallback((messageContent?: string) => {
    const content = messageContent || message.trim();
    if (!content) return;
    sendMessageStreaming(content);
  }, [message, selectedConversationId, selectedRegion]);

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
    setMessage("");
  };

  const handleRegionSelect = (region: keyof typeof BODY_REGIONS) => {
    setSelectedRegion(region);
    setShowSpecialTests(true);

    const regionData = BODY_REGIONS[region];
    setZoomToRegion(regionData.skeletonRegion);
    setSuggestions([
      `What assessment approach should I use for ${regionData.name.toLowerCase()} pain?`,
      `What are the common differential diagnoses for ${regionData.name.toLowerCase()}?`,
      `What are evidence-based exercises for ${regionData.name.toLowerCase()} rehabilitation?`,
      `What manual therapy techniques are effective for ${regionData.name.toLowerCase()}?`
    ]);

    toast({
      title: `${regionData.name} Selected`,
      description: "Special tests and relevant prompts loaded",
    });
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentRegionData = selectedRegion ? BODY_REGIONS[selectedRegion] : null;

  const updateModelConfig = (path: string, value: number) => {
    setModelConfig(prev => {
      const next = { ...prev };
      const [group, prop] = path.split('.');
      (next as any)[group] = { ...(next as any)[group], [prop]: value };
      return next;
    });
  };

  const applyVoiceFindings = useCallback((data: any) => {
    const newFindings: any[] = [];

    if (data.painLocations && data.painLocations.length > 0) {
      const newMarkers: PainMarker[] = data.painLocations.map((loc: any, index: number) => {
        const regionBones = (REGION_BONE_MAPPING as any)[loc.region];
        const nearestBone = regionBones && regionBones.length > 0 ? regionBones[0] : '';
        const marker: PainMarker = {
          id: `pm_voice_${Date.now()}_${index}`,
          type: loc.type || 'point',
          position: { x: 0, y: 0, z: 0 },
          nearestBone,
          anatomicalLabel: loc.anatomicalLabel || loc.region,
          subjectiveHistory: data.subjectiveHistory || '',
          description: loc.description || '',
        };
        newFindings.push({ id: marker.id, type: 'pain', label: loc.anatomicalLabel || loc.region, region: loc.region, severity: loc.severity });
        return marker;
      });
      setPainMarkers(prev => [...prev, ...newMarkers]);

      if (data.painLocations[0]?.region) {
        setZoomToRegion(data.painLocations[0].region);
      }
    }

    if (data.postureObservations && Object.keys(data.postureObservations).length > 0) {
      setModelConfig(prevConfig => {
        const updatedConfig = { ...prevConfig };
        Object.entries(data.postureObservations).forEach(([path, value]) => {
          const parts = path.split('.');
          if (parts.length === 2) {
            const [group, prop] = parts;
            const groupObj = (updatedConfig as any)[group];
            if (groupObj && prop in groupObj) {
              const previousValue = groupObj[prop];
              newFindings.push({ id: `posture_${path}_${Date.now()}`, type: 'posture', label: path, value, previousValue });
              (updatedConfig as any)[group] = { ...groupObj, [prop]: value };
            }
          }
        });
        return updatedConfig;
      });
    }

    if (data.diagnoses && data.diagnoses.length > 0) {
      data.diagnoses.forEach((d: string, i: number) => {
        newFindings.push({ id: `dx_${Date.now()}_${i}`, type: 'diagnosis', label: d });
      });
    }

    if (data.redFlags && data.redFlags.length > 0) {
      data.redFlags.forEach((rf: string, i: number) => {
        newFindings.push({ id: `rf_${Date.now()}_${i}`, type: 'redFlag', label: rf });
      });
    }

    if (newFindings.length > 0) {
      setVoiceFindings(prev => [...prev, ...newFindings]);
    }

    if (data.clinicalReasoning) {
      const cr = data.clinicalReasoning;
      const hasSubstantiveData = (cr.hypotheses?.length > 0) ||
        (cr.findings?.length > 0) ||
        (cr.flags?.length > 0) ||
        (cr.reasoningChain?.length > 0) ||
        (cr.biomechanicalLinks?.length > 0);

      if (!hasSubstantiveData) return;

      setClinicalReasoningData(prev => {
        const existing = prev || {
          hypotheses: [], findings: [], flags: [],
          biomechanicalLinks: [], reasoningChain: [],
          clinicalSummary: '', assessmentPriorities: [],
        };

        const normalize = (s: string) => s.toLowerCase().trim();

        const mergedHypotheses = cr.hypotheses && cr.hypotheses.length > 0
          ? cr.hypotheses
          : existing.hypotheses;

        const existingFindingTexts = new Set(existing.findings.map((f: any) => normalize(f.text)));
        const newCrFindings = (cr.findings || [])
          .filter((f: any) => f.text && !existingFindingTexts.has(normalize(f.text)))
          .map((f: any) => ({ ...f, isNew: true }));
        const mergedFindings = [
          ...existing.findings.map((f: any) => ({ ...f, isNew: false })),
          ...newCrFindings,
        ];

        const existingFlagTexts = new Set(existing.flags.map((f: any) => normalize(f.text)));
        const newFlags = (cr.flags || []).filter((f: any) => f.text && !existingFlagTexts.has(normalize(f.text)));
        const mergedFlags = [...existing.flags, ...newFlags];

        const existingBioKeys = new Set(existing.biomechanicalLinks.map((b: any) => `${normalize(b.primaryRegion)}-${normalize(b.connectedRegion)}`));
        const newBio = (cr.biomechanicalLinks || []).filter((b: any) => !existingBioKeys.has(`${normalize(b.primaryRegion)}-${normalize(b.connectedRegion)}`));
        const mergedBio = [...existing.biomechanicalLinks, ...newBio];

        const existingThoughts = new Set(existing.reasoningChain.map((r: any) => normalize(r.thought)));
        const newReasoning = (cr.reasoningChain || [])
          .filter((r: any) => r.thought && !existingThoughts.has(normalize(r.thought)))
          .map((r: any, i: number) => ({ ...r, step: existing.reasoningChain.length + i + 1, isNew: true }));
        const mergedReasoning = [
          ...existing.reasoningChain.map((r: any) => ({ ...r, isNew: false })),
          ...newReasoning,
        ];

        return {
          hypotheses: mergedHypotheses,
          findings: mergedFindings,
          flags: mergedFlags,
          biomechanicalLinks: mergedBio,
          reasoningChain: mergedReasoning,
          clinicalSummary: cr.clinicalSummary || existing.clinicalSummary,
          assessmentPriorities: cr.assessmentPriorities && cr.assessmentPriorities.length > 0
            ? cr.assessmentPriorities
            : existing.assessmentPriorities,
        };
      });

      if (!clinicalReasoningOpen) {
        setClinicalReasoningOpen(true);
      }
    }
  }, [clinicalReasoningOpen]);

  const undoVoiceFinding = useCallback((findingId: string) => {
    setVoiceFindings(prev => {
      const finding = prev.find(f => f.id === findingId);
      if (finding?.type === 'pain') {
        setPainMarkers(markers => markers.filter(m => m.id !== findingId));
      }
      if (finding?.type === 'posture' && finding.label) {
        updateModelConfig(finding.label, finding.previousValue ?? 0);
      }
      return prev.filter(f => f.id !== findingId);
    });
  }, []);

  const triggerVoiceExtraction = useCallback(async () => {
    if (voiceExtractingRef.current) return;
    const transcript = voiceTranscriptRef.current;
    if (!transcript || transcript.trim().length < 10) return;

    voiceExtractingRef.current = true;
    setVoiceProcessing(true);
    try {
      const currentMarkers = painMarkersRef.current;
      const currentFindings = voiceFindingsRef.current;
      const extractRes = await fetch('/api/physiogpt/voice-clinical-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          previousFindings: {
            painLocations: currentMarkers.map(m => m.anatomicalLabel),
            diagnoses: currentFindings.filter(f => f.type === 'diagnosis').map(f => f.label)
          }
        })
      });
      if (extractRes.ok) {
        const extractData = await extractRes.json();
        applyVoiceFindings(extractData);
      }
    } catch (err) {
      console.error('Voice extraction error:', err);
    } finally {
      voiceExtractingRef.current = false;
      setVoiceProcessing(false);
    }
  }, [applyVoiceFindings]);

  const voiceExtractionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceSession = useCallback(async () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Not Supported", description: "Your browser doesn't support speech recognition. Please use Chrome or Edge.", variant: "destructive" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceTranscriptRef.current = '';
      voiceExtractingRef.current = false;
      setVoiceTranscript('');
      setVoiceFindings([]);
      setVoicePanelOpen(true);

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      voiceSpeechRecRef.current = recognition;

      let recognitionResultIndex = 0;

      recognition.onresult = (event: any) => {
        let interimText = '';
        for (let i = recognitionResultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            voiceTranscriptRef.current += result[0].transcript + ' ';
            recognitionResultIndex = i + 1;
          } else {
            interimText += result[0].transcript;
          }
        }
        const display = voiceTranscriptRef.current.trim() + (interimText ? ' ' + interimText : '');
        setVoiceTranscript(display);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error("Voice session speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (voiceSpeechRecRef.current === recognition) {
          recognitionResultIndex = 0;
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();

      voiceExtractionTimerRef.current = setInterval(() => {
        triggerVoiceExtraction();
      }, 5000);

      setVoiceSessionActive(true);
      toast({ title: "Voice Session Started", description: "Speak naturally — clinical findings will be extracted automatically." });
    } catch (error) {
      console.error('Mic access error:', error);
      toast({ title: "Microphone Access Denied", description: "Please allow microphone access to use voice extraction.", variant: "destructive" });
    }
  }, [triggerVoiceExtraction, toast]);

  const stopVoiceSession = useCallback(() => {
    if (voiceExtractionTimerRef.current) {
      clearInterval(voiceExtractionTimerRef.current);
      voiceExtractionTimerRef.current = null;
    }
    if (voiceSpeechRecRef.current) {
      const rec = voiceSpeechRecRef.current;
      voiceSpeechRecRef.current = null;
      try { rec.stop(); } catch {}
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(t => t.stop());
      voiceStreamRef.current = null;
    }
    voiceExtractingRef.current = false;
    setVoiceSessionActive(false);

    if (voiceTranscriptRef.current.trim().length > 10) {
      triggerVoiceExtraction();
    }

    toast({ title: "Voice Session Ended", description: `Extracted ${voiceFindingsRef.current.length} findings from session.` });

    lastReasoningTriggerRef.current = '';
  }, [toast, triggerVoiceExtraction]);

  useEffect(() => {
    return () => {
      if (voiceExtractionTimerRef.current) {
        clearInterval(voiceExtractionTimerRef.current);
        voiceExtractionTimerRef.current = null;
      }
      if (voiceSpeechRecRef.current) {
        try { voiceSpeechRecRef.current.stop(); } catch {}
        voiceSpeechRecRef.current = null;
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(t => t.stop());
        voiceStreamRef.current = null;
      }
    };
  }, []);

  const computePostureDeviations = useCallback((config: typeof modelConfig) => {
    const deviations: { region: string; parameter: string; value: number; direction: string; severity: string }[] = [];
    const defaultCfg = DEFAULT_MODEL_CONFIG;
    const regionLabels: Record<string, string> = {
      spine: 'Spine', neck: 'Neck', pelvis: 'Pelvis', sacrum: 'Sacrum',
      leftHip: 'Left Hip', rightHip: 'Right Hip', leftKnee: 'Left Knee', rightKnee: 'Right Knee',
      leftAnkle: 'Left Ankle', rightAnkle: 'Right Ankle', leftShoulder: 'Left Shoulder', rightShoulder: 'Right Shoulder',
      leftScapula: 'Left Scapula', rightScapula: 'Right Scapula', leftElbow: 'Left Elbow', rightElbow: 'Right Elbow',
      leftWrist: 'Left Wrist', rightWrist: 'Right Wrist',
    };
    for (const [regionKey, regionLabel] of Object.entries(regionLabels)) {
      const current = (config as any)[regionKey];
      const defaults = (defaultCfg as any)[regionKey];
      if (!current || !defaults) continue;
      for (const [param, val] of Object.entries(current)) {
        const numVal = val as number;
        const defaultVal = (defaults[param] as number) || 0;
        const diff = Math.abs(numVal - defaultVal);
        if (diff >= 3) {
          const severity = diff >= 20 ? 'significant' : diff >= 10 ? 'moderate' : 'mild';
          const direction = numVal > defaultVal ? 'increased' : 'decreased';
          deviations.push({ region: regionLabel, parameter: param, value: numVal, direction, severity });
        }
      }
    }
    return deviations;
  }, []);

  const triggerClinicalReasoningAnalysis = useCallback(async (forceRefresh = false) => {
    if (clinicalReasoningProcessing) return;
    if (clinicalReasoningPaused) return;

    const markerData = painMarkersRef.current.map(pm => ({
      label: pm.anatomicalLabel || pm.nearestBone,
      type: pm.type,
      severity: (pm as any).severity ?? 5,
      description: pm.description || '',
      subjectiveHistory: pm.subjectiveHistory || '',
    }));

    const postureDeviations = computePostureDeviations(effectiveModelConfig);
    const forces = calculatePosturalForces(effectiveModelConfig);
    const muscles = computeFullMuscleAnalysis(effectiveModelConfig);

    const forcesSummary = forces.joints
      .filter(j => j.status === 'high' || j.status === 'very_high')
      .map(j => ({ joint: j.label, totalForce: Math.round(j.totalForce), status: j.status, compression: Math.round(j.compression), shear: Math.round(j.shear) }));

    const muscleSummary = muscles.allMuscles
      .filter(m => m.clinicalStatus !== 'normal')
      .map(m => ({ muscle: m.label, status: m.clinicalStatus, activation: m.activationPercent, tightness: m.tightnessPercent }));

    const syndromeSummary = muscles.syndromes
      .filter((s: any) => s.detected)
      .map((s: any) => ({ name: s.name, description: s.description }));

    const compData = compensationDataRef.current;
    const compensationSummary = compData.result && compData.result.patterns.length > 0 ? {
      movementName: compData.movementName,
      restrictions: Object.entries(compData.restrictions).filter(([_, v]) => v !== undefined).map(([k, v]) => ({ joint_movement: k, maxROM: v })),
      compensations: compData.result.patterns.map(p => ({
        source: `${p.sourceJoint}:${p.sourceMovement}`,
        compensator: `${p.compensatingJoint}:${p.compensatingMovement}`,
        additionalLoad: Math.round(p.additionalLoad),
        ratio: Math.round(p.compensationRatio * 100),
        note: p.clinicalNote,
      })),
      overloadedStructures: compData.result.overloadedStructures,
      clinicalWarnings: compData.result.clinicalWarnings.map(w => `[${w.severity.toUpperCase()}] ${w.message}`),
      postureNotes: compData.result.postureNotes,
    } : null;

    const localMuscleStates = computeAllMuscleStates(effectiveModelConfig);
    const localTensions: Record<string, number> = {};
    Object.entries(localMuscleStates).forEach(([id, s]) => { localTensions[id] = s.tension; });
    const localPropEffects = propagateChainEffects(localTensions, compensatedOverrides);

    const currentChainEffects = MYOFASCIAL_CHAINS.map(chain => {
      const chainTensions = chain.links.map(l => localTensions[l.muscleId] ?? 50);
      const avgTension = chainTensions.length > 0 ? chainTensions.reduce((a, b) => a + b, 0) / chainTensions.length : 50;
      return { chainId: chain.id, chainName: chain.name, avgTension };
    });

    const fascialChainAnalysis = currentChainEffects
      .filter(ce => ce.avgTension > 55)
      .map(ce => {
        const chain = MYOFASCIAL_CHAINS.find(c => c.id === ce.chainId);
        const propInfo = chain ? chain.links.map(l => {
          const pe = localPropEffects[l.muscleId];
          return pe ? pe.totalChainTension : 0;
        }) : [];
        const avgPropagation = propInfo.length > 0 ? propInfo.reduce((a, b) => a + b, 0) / propInfo.length : 0;
        const level = ce.avgTension >= 75 ? 'critical' : ce.avgTension >= 65 ? 'high' : 'moderate';
        return {
          chainName: ce.chainName,
          avgTension: Math.round(ce.avgTension),
          level,
          avgPropagation: Math.round(avgPropagation * 10) / 10,
        };
      });

    const scarTissueAnalysis = scarMarkers.map(scar => {
      const impact = getScarImpact(scar);
      return {
        type: SCAR_TYPES[scar.type]?.label || scar.type,
        location: scar.anatomicalLabel,
        severity: scar.severity,
        mobility: scar.mobility,
        affectedChains: impact.affectedChains.map(ac => ac.chain.name),
        restrictedMovements: impact.restrictedMovements,
        clinicalNotes: impact.clinicalNotes,
      };
    });

    let painDriverSummary: { category: string; label: string; evidenceScore: number; mechanism: string; severity: string }[] = [];
    if (painMarkers.length > 0) {
      const localPropagatedMap: Record<string, PropagatedMuscleState> = {};
      for (const [id, state] of Object.entries(localPropEffects)) {
        localPropagatedMap[id] = state;
      }

      const corrForDrivers = computeCrossSystemCorrelation({
        painMarkers: painMarkers.map(pm => ({
          id: pm.id,
          position: pm.position,
          label: pm.anatomicalLabel || pm.nearestBone,
          type: pm.type,
          severity: (pm as any).severity ?? 5,
          description: pm.description,
          subjectiveHistory: pm.subjectiveHistory,
        })),
        forces: forces.joints,
        muscles: muscles.allMuscles,
        muscleGroups: muscles.groups,
        syndromes: muscles.syndromes,
        kineticChains: KINETIC_CHAINS,
        bodyWeightKg,
        fascialChainData: {
          chains: MYOFASCIAL_CHAINS,
          tensions: localTensions,
          propagatedEffects: localPropagatedMap,
        },
        scarData: scarMarkers.length > 0 || adhesionBands.length > 0
          ? { scars: scarMarkers, adhesions: adhesionBands }
          : undefined,
      });

      const allDrivers: { category: string; label: string; evidenceScore: number; mechanism: string; severity: string }[] = [];
      for (const pc of corrForDrivers.painCorrelations) {
        const report = computePainDrivers(
          pc,
          forces.joints.map(j => ({ id: j.id, label: j.label, category: j.category, compression: j.compression, tension: j.tension, shear: j.shear, totalForce: j.totalForce, status: j.status, clinical: j.clinical })),
          muscles.allMuscles.map(m => ({ id: m.id, label: m.label, lengthPercent: m.lengthPercent, activationPercent: m.activationPercent, tightnessPercent: m.tightnessPercent, inhibitionPercent: m.inhibitionPercent, clinicalStatus: m.clinicalStatus, clinicalNote: m.clinicalNote, state: m.state })),
          { chains: MYOFASCIAL_CHAINS, tensions: localTensions, propagatedEffects: localPropagatedMap },
          scarMarkers.length > 0 ? { scars: scarMarkers, adhesions: adhesionBands } : undefined,
        );
        for (const d of report.drivers) {
          allDrivers.push({ category: d.category, label: d.label, evidenceScore: d.evidenceScore, mechanism: d.mechanism, severity: d.severity });
        }
      }
      allDrivers.sort((a, b) => b.evidenceScore - a.evidenceScore);
      painDriverSummary = allDrivers.slice(0, 5);
    }

    const triggerKey = JSON.stringify({
      markers: markerData,
      history: subjectiveHistoryRef.current,
      posture: postureDeviations.map(d => `${d.region}.${d.parameter}:${d.value}`).join(','),
      compensation: compensationSummary ? JSON.stringify(compensationSummary.restrictions) : '',
    });
    if (!forceRefresh && triggerKey === lastReasoningTriggerRef.current) return;
    if (markerData.length === 0 && !subjectiveHistoryRef.current.trim() && postureDeviations.length === 0 && !compensationSummary) return;

    lastReasoningTriggerRef.current = triggerKey;
    setClinicalReasoningProcessing(true);

    try {
      const response = await fetch('/api/physiogpt/clinical-reasoning-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          painMarkers: markerData,
          skeletonConfig: modelConfig,
          subjectiveHistory: subjectiveHistoryRef.current,
          romMeasurements: romMeasurements || {},
          postureDeviations,
          forceAnalysis: forcesSummary,
          muscleAnalysis: muscleSummary,
          detectedSyndromes: syndromeSummary,
          compensationAnalysis: compensationSummary,
          fascialChainAnalysis: fascialChainAnalysis.length > 0 ? fascialChainAnalysis : undefined,
          scarTissueAnalysis: scarTissueAnalysis.length > 0 ? scarTissueAnalysis : undefined,
          painDriverSummary: painDriverSummary.length > 0 ? painDriverSummary : undefined,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();

      setClinicalReasoningData({
        hypotheses: data.hypotheses || [],
        findings: data.findings || [],
        flags: data.flags || [],
        biomechanicalLinks: data.biomechanicalLinks || [],
        reasoningChain: data.reasoningChain || [],
        clinicalSummary: data.clinicalSummary || '',
        assessmentPriorities: data.assessmentPriorities || [],
        treatmentPlan: data.treatmentPlan || null,
        posturalAnalysis: data.posturalAnalysis || null,
        evidenceReferences: data.evidenceReferences || [],
      });

      if (!clinicalReasoningOpen) {
        setClinicalReasoningOpen(true);
      }
    } catch (error) {
      console.error('Clinical reasoning analysis error:', error);
    } finally {
      setClinicalReasoningProcessing(false);
    }
  }, [clinicalReasoningProcessing, clinicalReasoningPaused, modelConfig, effectiveModelConfig, romMeasurements, clinicalReasoningOpen, computePostureDeviations]);

  useEffect(() => {
    const hasPostureChanges = Object.entries(modelConfig).some(([key, val]: [string, any]) => {
      const def = (DEFAULT_MODEL_CONFIG as any)[key];
      if (!def || typeof val !== 'object') return false;
      return Object.entries(val).some(([k, v]) => Math.abs((v as number) - ((def[k] as number) || 0)) >= 3);
    });
    if (painMarkers.length === 0 && !hasPostureChanges) return;
    if (voiceSessionActive) return;

    if (clinicalReasoningTimerRef.current) {
      clearTimeout(clinicalReasoningTimerRef.current);
    }
    clinicalReasoningTimerRef.current = setTimeout(() => {
      triggerClinicalReasoningAnalysis();
    }, 2000);

    return () => {
      if (clinicalReasoningTimerRef.current) {
        clearTimeout(clinicalReasoningTimerRef.current);
      }
    };
  }, [painMarkers, modelConfig, triggerClinicalReasoningAnalysis, voiceSessionActive]);

  useEffect(() => {
    if (pendingCameraAnalysisRef.current && focusedCameraResult) {
      pendingCameraAnalysisRef.current = null;
      triggerClinicalReasoningAnalysis(true);
    }
  }, [focusedCameraResult, triggerClinicalReasoningAnalysis]);

  const handleSubjectiveHistorySubmit = useCallback(() => {
    subjectiveHistoryRef.current = subjectiveHistoryInput;
    lastReasoningTriggerRef.current = '';
    triggerClinicalReasoningAnalysis(true);
  }, [subjectiveHistoryInput, triggerClinicalReasoningAnalysis]);

  const handleCompensationChange = useCallback((result: CompensationResult | null, movementName: string | null, restrictions: Record<string, number>) => {
    compensationDataRef.current = { result, movementName, restrictions };
    if (!result || result.patterns.length === 0) return;
    if (clinicalReasoningTimerRef.current) {
      clearTimeout(clinicalReasoningTimerRef.current);
    }
    clinicalReasoningTimerRef.current = setTimeout(() => {
      triggerClinicalReasoningAnalysis(true);
    }, 1500);
  }, [triggerClinicalReasoningAnalysis]);

  const forceAnalysis = useMemo(() => {
    if (!forceMode) return null;
    const result = calculatePosturalForces(effectiveModelConfig);
    if (enabledForceJoints.size === 0 && result.joints.length > 0) {
      const defaultEnabled = new Set(result.joints.map(j => j.id));
      setEnabledForceJoints(defaultEnabled);
    }
    return result;
  }, [effectiveModelConfig, forceMode]);

  const baseMuscleTensions = useMemo(() => {
    const base = computeAllMuscleStates(effectiveModelConfig);
    const tensions: { [id: string]: number } = {};
    Object.entries(base).forEach(([id, s]) => { tensions[id] = s.tension; });
    Object.entries(manualChainTensions).forEach(([id, val]) => {
      tensions[id] = val;
    });
    return { tensions };
  }, [effectiveModelConfig, manualChainTensions]);

  const wholeBodyScore = useMemo(() => {
    return computeWholeBodyTensionScore(baseMuscleTensions.tensions, compensatedOverrides);
  }, [baseMuscleTensions, compensatedOverrides]);

  const chainEffects = useMemo(() => {
    return MYOFASCIAL_CHAINS.map(chain => {
      const tensions = chain.links.map(l => baseMuscleTensions.tensions[l.muscleId] ?? 50);
      const avgTension = tensions.length > 0 ? tensions.reduce((a, b) => a + b, 0) / tensions.length : 50;
      return { chainId: chain.id, avgTension };
    });
  }, [baseMuscleTensions]);

  const chainPropagation = useMemo(() => {
    const hasManualOverrides = Object.values(compensatedOverrides).some(o => o?.isManual);
    const hasManualChainTensions = Object.keys(manualChainTensions).length > 0;
    if (!hasManualOverrides && !hasManualChainTensions) return null;
    return propagateChainEffects(baseMuscleTensions.tensions, compensatedOverrides);
  }, [baseMuscleTensions.tensions, compensatedOverrides, manualChainTensions]);

  const propagatedEffects = useMemo(() => {
    if (!showChainVisualization || !showPropagation) return chainPropagation;
    return chainPropagation;
  }, [showChainVisualization, showPropagation, chainPropagation]);

  const propagationDeltas = useMemo(() => {
    if (!propagatedEffects) return {};
    const deltas: Record<string, number> = {};
    for (const [id, state] of Object.entries(propagatedEffects)) {
      deltas[id] = state.totalChainTension;
    }
    return deltas;
  }, [propagatedEffects]);

  const chainDrivenJointEffects = useMemo(() => {
    if (!chainPropagation || !bidirectionalMode) return null;
    return computeChainDrivenJointEffects(chainPropagation);
  }, [chainPropagation, bidirectionalMode]);

  const finalModelConfig = useMemo(() => {
    if (!chainDrivenJointEffects) return effectiveModelConfig;
    const config = JSON.parse(JSON.stringify(effectiveModelConfig));
    for (const [joint, params] of Object.entries(chainDrivenJointEffects)) {
      if (!config[joint]) config[joint] = {};
      for (const [param, value] of Object.entries(params)) {
        const current = config[joint][param] || 0;
        config[joint][param] = current + value;
      }
    }
    return config;
  }, [effectiveModelConfig, chainDrivenJointEffects]);

  const crossMuscleEffects = useMemo((): CrossMuscleEffects | undefined => {
    const ri = muscleDrivenEffects?.reciprocalInhibitions;
    const cp = chainPropagation;
    const hasRI = ri && Object.keys(ri).length > 0;
    const hasCP = cp && Object.keys(cp).length > 0;
    if (!hasRI && !hasCP) return undefined;
    return {
      reciprocalInhibitions: ri || undefined,
      chainPropagation: cp ? Object.fromEntries(
        Object.entries(cp).map(([id, state]) => [id, { totalChainTension: state.totalChainTension, totalChainActivation: state.totalChainActivation }])
      ) : undefined,
    };
  }, [muscleDrivenEffects, chainPropagation]);

  const influenceMap = useMemo((): InfluenceMap => {
    if (!muscleMode) return {};
    return computeInfluenceMap(muscleOverrides, crossMuscleEffects);
  }, [muscleOverrides, crossMuscleEffects, muscleMode]);

  const muscleAnalysis = useMemo(() => {
    if (!muscleMode) return null;
    const base = computeFullMuscleAnalysis(effectiveModelConfig);
    if (enabledMuscleGroups.size === 0 && base.groups.length > 0) {
      setEnabledMuscleGroups(new Set(base.groups.map(g => g.id)));
    }
    return applyOverridesToAnalysis(base, compensatedOverrides, crossMuscleEffects);
  }, [effectiveModelConfig, muscleMode, compensatedOverrides, crossMuscleEffects]);

  const weightDistribution = useMemo(() => {
    if (!forceMode) return null;
    return computeWeightDistribution(effectiveModelConfig, bodyWeightKg);
  }, [effectiveModelConfig, forceMode, bodyWeightKg]);

  const correlationResult = useMemo(() => {
    if (!correlationMode && !chainIntegrityMode && !chainExplorerMode) return null;
    const forces = calculatePosturalForces(effectiveModelConfig);
    const muscles = computeFullMuscleAnalysis(effectiveModelConfig);
    return computeCrossSystemCorrelation({
      painMarkers: painMarkers.map(pm => ({ id: pm.id, position: pm.position, label: pm.anatomicalLabel || pm.nearestBone, type: pm.type, severity: (pm as any).severity ?? 5, description: pm.description, subjectiveHistory: pm.subjectiveHistory })),
      forces: forces.joints,
      muscles: muscles.allMuscles,
      muscleGroups: muscles.groups,
      syndromes: muscles.syndromes,
      kineticChains: KINETIC_CHAINS,
      bodyWeightKg,
    });
  }, [effectiveModelConfig, painMarkers, bodyWeightKg, correlationMode, chainIntegrityMode, chainExplorerMode]);

  const chainIntegrityScores = useMemo(() => {
    if (!chainExplorerMode && !chainIntegrityMode) return new Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>();
    const baseAnalysis = computeFullMuscleAnalysis(effectiveModelConfig);
    const muscles = applyOverridesToAnalysis(baseAnalysis, compensatedOverrides, crossMuscleEffects);
    const scores = new Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>();
    for (const chain of KINETIC_CHAINS) {
      let totalScore = 100;
      const issues: string[] = [];
      const problematicLinks: string[] = [];
      const exercises: string[] = [];
      for (const link of chain.links) {
        for (const muscName of link.muscles) {
          const muscLower = muscName.toLowerCase();
          const matchedMuscle = muscles.allMuscles.find(m => {
            const mLabel = m.label.toLowerCase();
            const mId = m.id.toLowerCase();
            return mLabel.includes(muscLower) || muscLower.includes(mLabel.replace(/^[lr] /, '')) || mId.includes(muscLower.replace(/ /g, '_')) || muscLower.replace(/ /g, '_').includes(mId.replace(/^[lr]_/, ''));
          });
          if (matchedMuscle && matchedMuscle.clinicalStatus !== 'normal') {
            const penalty = matchedMuscle.clinicalStatus === 'spasm' ? 15 : matchedMuscle.clinicalStatus === 'inhibited' ? 12 : matchedMuscle.clinicalStatus === 'overactive' ? 10 : matchedMuscle.clinicalStatus === 'shortened' ? 8 : matchedMuscle.clinicalStatus === 'weak' ? 10 : matchedMuscle.clinicalStatus === 'lengthened' ? 6 : 3;
            totalScore -= penalty;
            issues.push(`${matchedMuscle.label}: ${matchedMuscle.clinicalStatus}`);
            if (!problematicLinks.includes(link.label)) problematicLinks.push(link.label);
            if (matchedMuscle.clinicalStatus === 'shortened' || matchedMuscle.clinicalStatus === 'overactive') exercises.push(`Stretch/release ${muscName}`);
            else if (matchedMuscle.clinicalStatus === 'inhibited' || matchedMuscle.clinicalStatus === 'weak') exercises.push(`Strengthen/activate ${muscName}`);
            else if (matchedMuscle.clinicalStatus === 'spasm') exercises.push(`Release/manual therapy for ${muscName}`);
          }
          if (matchedMuscle && matchedMuscle.tightnessPercent > 50) totalScore -= 3;
          if (matchedMuscle && matchedMuscle.inhibitionPercent > 40) totalScore -= 4;
        }
      }
      scores.set(chain.id, { score: Math.max(0, Math.min(100, totalScore)), issues: issues.slice(0, 8), problematicLinks: problematicLinks.slice(0, 5), exercises: Array.from(new Set(exercises)).slice(0, 6) });
    }
    return scores;
  }, [effectiveModelConfig, chainExplorerMode, chainIntegrityMode, compensatedOverrides, crossMuscleEffects]);

  const hudForceAnalysis = useMemo(() => {
    if (forceMode && forceAnalysis) return forceAnalysis;
    return calculatePosturalForces(effectiveModelConfig);
  }, [effectiveModelConfig, forceMode, forceAnalysis]);

  const hudWeightDistribution = useMemo(() => {
    if (forceMode && weightDistribution) return weightDistribution;
    return computeWeightDistribution(effectiveModelConfig, bodyWeightKg);
  }, [effectiveModelConfig, bodyWeightKg, forceMode, weightDistribution]);

  const hudMuscleAnalysis = useMemo(() => {
    if (muscleMode && muscleAnalysis) return muscleAnalysis;
    const base = computeFullMuscleAnalysis(effectiveModelConfig);
    return applyOverridesToAnalysis(base, compensatedOverrides, crossMuscleEffects);
  }, [effectiveModelConfig, muscleMode, muscleAnalysis, compensatedOverrides, crossMuscleEffects]);

  const hudChainIntegrity = useMemo(() => {
    if ((chainExplorerMode || chainIntegrityMode) && chainIntegrityScores.size > 0) return chainIntegrityScores;
    if (!hudMuscleAnalysis) return new Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>();
    const scores = new Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>();
    for (const chain of KINETIC_CHAINS) {
      let totalScore = 100;
      const issues: string[] = [];
      const problematicLinks: string[] = [];
      const exercises: string[] = [];
      for (const link of chain.links) {
        for (const muscName of link.muscles) {
          const muscLower = muscName.toLowerCase();
          const matchedMuscle = hudMuscleAnalysis.allMuscles.find(m => {
            const mLabel = m.label.toLowerCase();
            const mId = m.id.toLowerCase();
            return mLabel.includes(muscLower) || muscLower.includes(mLabel.replace(/^[lr] /, '')) || mId.includes(muscLower.replace(/ /g, '_')) || muscLower.replace(/ /g, '_').includes(mId.replace(/^[lr]_/, ''));
          });
          if (matchedMuscle && matchedMuscle.clinicalStatus !== 'normal') {
            const penalty = matchedMuscle.clinicalStatus === 'spasm' ? 15 : matchedMuscle.clinicalStatus === 'inhibited' ? 12 : matchedMuscle.clinicalStatus === 'overactive' ? 10 : matchedMuscle.clinicalStatus === 'shortened' ? 8 : matchedMuscle.clinicalStatus === 'weak' ? 10 : matchedMuscle.clinicalStatus === 'lengthened' ? 6 : 3;
            totalScore -= penalty;
            issues.push(`${matchedMuscle.label}: ${matchedMuscle.clinicalStatus}`);
            if (!problematicLinks.includes(link.label)) problematicLinks.push(link.label);
            if (matchedMuscle.clinicalStatus === 'shortened' || matchedMuscle.clinicalStatus === 'overactive') exercises.push(`Stretch/release ${muscName}`);
            else if (matchedMuscle.clinicalStatus === 'inhibited' || matchedMuscle.clinicalStatus === 'weak') exercises.push(`Strengthen/activate ${muscName}`);
            else if (matchedMuscle.clinicalStatus === 'spasm') exercises.push(`Release/manual therapy for ${muscName}`);
          }
          if (matchedMuscle && matchedMuscle.tightnessPercent > 50) totalScore -= 3;
          if (matchedMuscle && matchedMuscle.inhibitionPercent > 40) totalScore -= 4;
        }
      }
      scores.set(chain.id, { score: Math.max(0, Math.min(100, totalScore)), issues: issues.slice(0, 8), problematicLinks: problematicLinks.slice(0, 5), exercises: Array.from(new Set(exercises)).slice(0, 6) });
    }
    return scores;
  }, [hudMuscleAnalysis, chainExplorerMode, chainIntegrityMode, chainIntegrityScores]);

  const predictedPainSpots = useMemo((): PredictedPainSpot[] => {
    return computePredictedPain(effectiveModelConfig);
  }, [effectiveModelConfig]);

  const [showPredictedPain, setShowPredictedPain] = useState(true);

  const treatmentPriorities = useMemo((): TreatmentPriorityResult => {
    const analysis = muscleAnalysis ?? hudMuscleAnalysis;
    const hasNonNormal = analysis?.allMuscles?.some(m => m.clinicalStatus !== 'normal');
    if (!analysis || !hasNonNormal) {
      return { targets: [], summary: { totalTargets: 0, rootCauses: 0, compensations: 0, criticalChain: null, syndromes: [], treatmentSequence: [], syndromeProtocols: [] } };
    }
    const integrityObj: Record<string, number> = {};
    chainIntegrityScores.forEach((val, key) => { integrityObj[key] = val.score; });

    const combinedPainMarkers: PainMarkerSimple[] = painMarkers.map(pm => ({
      id: pm.id,
      position: pm.position,
      label: pm.anatomicalLabel || pm.nearestBone,
      severity: (pm as unknown as { severity?: number }).severity ?? 5,
      weight: 1.0,
      isPredicted: false,
    }));
    for (const spot of predictedPainSpots) {
      combinedPainMarkers.push({
        id: spot.id,
        position: spot.position,
        label: spot.label,
        severity: Math.max(1, Math.round(spot.severity * 0.6)),
        weight: 0.4,
        isPredicted: true,
      });
    }

    const base = computeFullTreatmentPriorities(analysis, influenceMap, integrityObj, combinedPainMarkers);

    const forces = hudForceAnalysis;
    if (forces) {
      const mobilizationTargets = computeJointMobilizationTargets(forces);
      if (mobilizationTargets.length > 0) {
        base.targets.push(...mobilizationTargets);
        base.targets.sort((a, b) => {
          if (a.isRootCause && !b.isRootCause) return -1;
          if (!a.isRootCause && b.isRootCause) return 1;
          return b.priority - a.priority;
        });
        base.summary.totalTargets = base.targets.length;
      }
    }

    return base;
  }, [muscleAnalysis, hudMuscleAnalysis, influenceMap, chainIntegrityScores, painMarkers, predictedPainSpots, hudForceAnalysis]);

  const [treatmentPanelOpen, setTreatmentPanelOpen] = useState(true);
  const [compensationPanelOpen, setCompensationPanelOpen] = useState(true);
  const [expandedTreatmentTarget, setExpandedTreatmentTarget] = useState<string | null>(null);
  const [aiTreatmentPlan, setAiTreatmentPlan] = useState<string | null>(null);
  const [treatmentEvidenceRefs, setTreatmentEvidenceRefs] = useState<PubMedPaper[]>([]);
  const [liveTargetEvidence, setLiveTargetEvidence] = useState<PubMedPaper[]>([]);
  const [aiTreatmentLoading, setAiTreatmentLoading] = useState(false);
  const [showTreatmentOverlay, setShowTreatmentOverlay] = useState(true);
  const boneScreenPositionsRef = useRef<BoneScreenPosition[]>([]);
  const [skeletonContainerSize, setSkeletonContainerSize] = useState({ width: 0, height: 0 });

  const [stableReevalCounter, setStableReevalCounter] = useState(0);
  const poseRevisionRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const latestAnalysisRef = useRef<{ analysis: typeof muscleAnalysis; forces: typeof hudForceAnalysis; predicted: PredictedPainSpot[]; pain: typeof painMarkers; integrity: typeof chainIntegrityScores; influence: typeof influenceMap } | null>(null);

  latestAnalysisRef.current = {
    analysis: muscleAnalysis ?? hudMuscleAnalysis,
    forces: hudForceAnalysis,
    predicted: predictedPainSpots,
    pain: painMarkers,
    integrity: chainIntegrityScores,
    influence: influenceMap,
  };

  const [debouncedSnapshot, setDebouncedSnapshot] = useState<typeof latestAnalysisRef.current>(null);

  useEffect(() => {
    poseRevisionRef.current += 1;
    const currentRevision = poseRevisionRef.current;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!showTreatmentOverlay && !showPredictedPain) return;

    const captureSnapshot = () => {
      if (poseRevisionRef.current !== currentRevision) return;
      if (latestAnalysisRef.current) {
        setDebouncedSnapshot({ ...latestAnalysisRef.current });
      }
      setStableReevalCounter(c => c + 1);
    };

    debounceTimerRef.current = setTimeout(() => {
      captureSnapshot();
      intervalRef.current = setInterval(() => {
        if (poseRevisionRef.current !== currentRevision) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
        captureSnapshot();
      }, 3000);
    }, 2500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [effectiveModelConfig, showTreatmentOverlay, showPredictedPain]);

  const liveTreatmentPriorities = useMemo((): TreatmentPriorityResult => {
    void stableReevalCounter;
    const snap = debouncedSnapshot;
    if (!snap) {
      return { targets: [], summary: { totalTargets: 0, rootCauses: 0, compensations: 0, criticalChain: null, syndromes: [], treatmentSequence: [], syndromeProtocols: [] } };
    }
    const analysis = snap.analysis;
    const hasNonNormal = analysis?.allMuscles?.some(m => m.clinicalStatus !== 'normal');
    if (!analysis || !hasNonNormal) {
      return { targets: [], summary: { totalTargets: 0, rootCauses: 0, compensations: 0, criticalChain: null, syndromes: [], treatmentSequence: [], syndromeProtocols: [] } };
    }
    const integrityObj: Record<string, number> = {};
    snap.integrity.forEach((val, key) => { integrityObj[key] = val.score; });

    const combinedPainMarkers: PainMarkerSimple[] = snap.pain.map(pm => ({
      id: pm.id,
      position: pm.position,
      label: pm.anatomicalLabel || pm.nearestBone,
      severity: (pm as unknown as { severity?: number }).severity ?? 5,
      weight: 1.0,
      isPredicted: false,
    }));
    for (const spot of snap.predicted) {
      combinedPainMarkers.push({
        id: spot.id,
        position: spot.position,
        label: spot.label,
        severity: Math.max(1, Math.round(spot.severity * 0.6)),
        weight: 0.4,
        isPredicted: true,
      });
    }

    const base = computeFullTreatmentPriorities(analysis, snap.influence, integrityObj, combinedPainMarkers);

    const forces = snap.forces;
    if (forces) {
      const mobilizationTargets = computeJointMobilizationTargets(forces);
      if (mobilizationTargets.length > 0) {
        base.targets.push(...mobilizationTargets);
        base.targets.sort((a, b) => {
          if (a.isRootCause && !b.isRootCause) return -1;
          if (!a.isRootCause && b.isRootCause) return 1;
          return b.priority - a.priority;
        });
        base.summary.totalTargets = base.targets.length;
      }
    }

    return base;
  }, [stableReevalCounter, debouncedSnapshot]);

  useEffect(() => {
    if (treatmentPriorities.targets.length === 0) {
      setLiveTargetEvidence([]);
      return;
    }
    const fetchEvidence = async () => {
      try {
        const response = await apiRequest('/api/physiogpt/treatment-evidence', 'POST', {
          targets: treatmentPriorities.targets.slice(0, 5).map(t => ({
            name: t.targetName,
            status: t.clinicalStatus,
            action: t.treatmentAction,
          })),
        });
        const data = await response.json();
        if (data.papers) setLiveTargetEvidence(data.papers);
      } catch (err) {
        console.warn('Treatment evidence fetch failed:', err);
      }
    };
    fetchEvidence();
  }, [treatmentPriorities.targets.length]);

  const treatmentBoneNames = useMemo((): string[] => {
    const boneNames: string[] = [];
    if (showTreatmentOverlay && liveTreatmentPriorities.targets.length > 0) {
      boneNames.push(...getRequiredBoneNames(liveTreatmentPriorities.targets));
    }
    if (showPredictedPain && predictedPainSpots.length > 0) {
      for (const spot of predictedPainSpots) {
        if (!boneNames.includes(spot.boneName)) boneNames.push(spot.boneName);
      }
    }
    return boneNames;
  }, [showTreatmentOverlay, liveTreatmentPriorities.targets, showPredictedPain, predictedPainSpots]);

  useEffect(() => {
    if (!skeletonContainerRef.current) return;
    const el = skeletonContainerRef.current;
    const update = () => {
      setSkeletonContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleBoneScreenPositions = useCallback((positions: BoneScreenPosition[]) => {
    boneScreenPositionsRef.current = positions;
  }, []);

  const painAffectedChainIds = useMemo(() => {
    if (!showChainVisualization || painMarkers.length === 0) return [];
    const affectedIds = new Set<string>();
    for (const pm of painMarkers) {
      const bone = pm.nearestBone;
      if (!bone) continue;
      const matches = findChainsForBone(bone);
      for (const m of matches) {
        affectedIds.add(m.chainId);
      }
    }
    return Array.from(affectedIds);
  }, [showChainVisualization, painMarkers]);

  const chainRecommendations = useMemo(() => {
    if (!showChainVisualization) return [];
    return getChainRecommendations(chainEffects);
  }, [showChainVisualization, chainEffects]);

  const selectedNodeDetails = useMemo(() => {
    if (!selectedChainNode) return null;
    const muscleStates = computeAllMuscleStates(effectiveModelConfig);
    const state = muscleStates[selectedChainNode.muscleId];
    if (!state) return null;
    const membership = getChainMembership(selectedChainNode.muscleId);
    const propState = propagatedEffects?.[selectedChainNode.muscleId];
    return { state, membership, propState };
  }, [selectedChainNode, effectiveModelConfig, propagatedEffects]);

  const fascialModifiers = useMemo((): FascialModifiers | undefined => {
    const tensions = baseMuscleTensions.tensions;
    const hasElevatedTension = Object.values(tensions).some(t => Math.abs(t - 50) > 5);
    const hasScarRestrictions = scarMarkers.length > 0;
    if (!hasElevatedTension && !hasScarRestrictions) return undefined;
    const scarRestrictions = scarMarkers.map(scar => {
      const mobilityFactor = scar.mobility === 'fixed' ? 0.85 : scar.mobility === 'tethered' ? 0.92 : 0.98;
      return { bone: scar.nearestBone, mobilityFactor };
    });
    return {
      chainTensions: tensions,
      scarRestrictions: scarRestrictions.length > 0 ? scarRestrictions : undefined,
    };
  }, [baseMuscleTensions.tensions, scarMarkers]);

  const painDriverReports = useMemo((): PainDriverReport[] => {
    if (painMarkers.length === 0) return [];
    const forces = calculatePosturalForces(effectiveModelConfig, fascialModifiers);
    const muscles = computeFullMuscleAnalysis(effectiveModelConfig);
    const allPropEffects = propagateChainEffects(baseMuscleTensions.tensions, compensatedOverrides);
    const allChainEffects: import("@/lib/myofascialChains").ChainEffect[] = [];
    for (const state of Object.values(allPropEffects)) {
      allChainEffects.push(...state.chainEffects, ...state.slingEffects);
    }
    const fascialData = {
      chains: MYOFASCIAL_CHAINS,
      tensions: baseMuscleTensions.tensions,
      propagatedEffects: allPropEffects,
      chainEffects: allChainEffects,
    };
    const scarData = scarMarkers.length > 0 || adhesionBands.length > 0
      ? { scars: scarMarkers, adhesions: adhesionBands }
      : undefined;
    const correlation = computeCrossSystemCorrelation({
      painMarkers: painMarkers.map(pm => ({ id: pm.id, position: pm.position, label: pm.anatomicalLabel || pm.nearestBone, type: pm.type, severity: (pm as any).severity ?? 5, description: pm.description, subjectiveHistory: pm.subjectiveHistory })),
      forces: forces.joints,
      muscles: muscles.allMuscles,
      muscleGroups: muscles.groups,
      syndromes: muscles.syndromes,
      kineticChains: KINETIC_CHAINS,
      bodyWeightKg,
      fascialChainData: fascialData,
      scarData,
    });
    const forceData = forces.joints.map(j => ({
      id: j.id,
      label: j.label,
      category: j.category,
      compression: j.compression,
      tension: j.tension,
      shear: j.shear,
      totalForce: j.totalForce,
      status: j.status,
      clinical: j.clinical,
    }));
    const muscleData = muscles.allMuscles.map(m => ({
      id: m.id,
      label: m.label,
      lengthPercent: m.lengthPercent,
      activationPercent: m.activationPercent,
      tightnessPercent: m.tightnessPercent,
      inhibitionPercent: m.inhibitionPercent,
      clinicalStatus: m.clinicalStatus,
      clinicalNote: m.clinicalNote,
      state: m.state,
    }));
    return correlation.painCorrelations.map(pc =>
      computePainDrivers(pc, forceData, muscleData, fascialData, scarData)
    );
  }, [painMarkers, effectiveModelConfig, fascialModifiers, baseMuscleTensions.tensions, compensatedOverrides, scarMarkers, adhesionBands, bodyWeightKg]);

  const painDriverChainIds = useMemo(() => {
    const ids = new Set<string>();
    for (const report of painDriverReports) {
      for (const driver of report.drivers) {
        if (driver.category === 'fascial_chain') {
          const chainIdMatch = driver.id.replace(/^fascial_/, '').replace(/^fascial_effect_/, '');
          const chainId = chainIdMatch.split('_').slice(0, -1).join('_') || chainIdMatch;
          const chain = MYOFASCIAL_CHAINS.find(c => driver.id.includes(c.id));
          if (chain) ids.add(chain.id);
        }
      }
    }
    return Array.from(ids);
  }, [painDriverReports]);

  const fascialChainVizProp = useMemo(() => {
    if (!showChainVisualization) return undefined;
    const combinedPainChains = Array.from(new Set([...painAffectedChainIds, ...painDriverChainIds]));
    return {
      enabled: true,
      chains: MYOFASCIAL_CHAINS,
      tensions: baseMuscleTensions.tensions,
      activeChains: activeChainIds,
      painHighlightChains: combinedPainChains,
      showPropagation,
      propagationDeltas,
    };
  }, [showChainVisualization, baseMuscleTensions.tensions, activeChainIds, painAffectedChainIds, painDriverChainIds, showPropagation, propagationDeltas]);

  const handleChainNodeClick = useCallback((data: { chainId: string; muscleId: string; chainName: string }) => {
    setSelectedChainNode(prev => prev?.muscleId === data.muscleId && prev?.chainId === data.chainId ? null : data);
  }, []);

  const treatmentPlan = useMemo(() => {
    if (rightPanelTab !== 'treatment') return null;
    const forces = calculatePosturalForces(effectiveModelConfig);
    const muscles = computeFullMuscleAnalysis(effectiveModelConfig);
    const corr = computeCrossSystemCorrelation({
      painMarkers: painMarkers.map(pm => ({ id: pm.id, position: pm.position, label: pm.anatomicalLabel || pm.nearestBone, type: pm.type, severity: (pm as any).severity ?? 5, description: pm.description, subjectiveHistory: pm.subjectiveHistory })),
      forces: forces.joints,
      muscles: muscles.allMuscles,
      muscleGroups: muscles.groups,
      syndromes: muscles.syndromes,
      kineticChains: KINETIC_CHAINS,
      bodyWeightKg,
    });
    const clinicalBubbleDataArr = Object.entries(clinicalBubbleResults).map(([markerId, entry]) => ({
      markerId,
      region: entry.region,
      severity: entry.severity,
      differentials: entry.data.differentials || [],
      treatments: entry.data.treatments || [],
      exercises: entry.data.exercises || [],
      assessments: entry.data.assessment || [],
      redFlags: entry.data.redFlags || [],
    }));

    return generateTreatmentPlan({
      correlationResult: corr,
      muscles: muscles.allMuscles,
      forces: forces.joints,
      painMarkers: painMarkers.map(pm => ({ id: pm.id, label: pm.anatomicalLabel || pm.nearestBone, severity: (pm as any).severity ?? 5, region: '', type: pm.type })),
      chainIntegrityScores,
      bodyWeightKg,
      clinicalBubbleData: clinicalBubbleDataArr.length > 0 ? clinicalBubbleDataArr : undefined,
    });
  }, [effectiveModelConfig, painMarkers, bodyWeightKg, rightPanelTab, chainIntegrityScores, clinicalBubbleResults]);

  const getEvidenceGradeColor = (grade: EvidenceGrade) => grade === 'A' ? 'bg-green-500/20 text-green-400 border-green-500/30' : grade === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : grade === 'C' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const getIntegrityColor = (score: number) => score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';

  const chainHighlightBones = useMemo(() => {
    if (!selectedChainId) return undefined;
    const chain = KINETIC_CHAINS.find(c => c.id === selectedChainId);
    if (!chain) return undefined;
    const colorHex = parseInt(chain.color.replace('#', ''), 16);
    const boneNames = getChainBoneNames(selectedChainId, 'both');
    const uniqueBones = Array.from(new Set(boneNames));
    return uniqueBones.map(boneName => ({
      boneName,
      color: colorHex,
      intensity: 0.7,
      glowSize: boneName.includes('Root') || boneName.includes('Spine') || boneName.includes('Chest') ? 0.25 : 0.2,
    }));
  }, [selectedChainId]);

  const muscleOverrideHighlights = useMemo(() => {
    const entries = Object.entries(muscleOverrides).filter(([_, ov]) => ov?.isManual);
    if (entries.length === 0) return [];

    const MUSCLE_TO_BONES: Record<string, string[]> = {
      l_glut_max: ['Hip_L'], l_glut_med: ['Hip_L'], l_glut_min: ['Hip_L'], l_piriformis: ['Hip_L'],
      r_glut_max: ['Hip_R'], r_glut_med: ['Hip_R'], r_glut_min: ['Hip_R'], r_piriformis: ['Hip_R'],
      l_rect_fem: ['Hip_L', 'Knee_L'], l_vast_lat: ['Knee_L'], l_vast_med: ['Knee_L'], l_hamstrings: ['Hip_L', 'Knee_L'],
      r_rect_fem: ['Hip_R', 'Knee_R'], r_vast_lat: ['Knee_R'], r_vast_med: ['Knee_R'], r_hamstrings: ['Hip_R', 'Knee_R'],
      l_hip_flexors: ['Hip_L'], l_adductors: ['Hip_L'],
      r_hip_flexors: ['Hip_R'], r_adductors: ['Hip_R'],
      l_gastroc: ['Knee_L', 'Ankle_L'], l_soleus: ['Ankle_L'],
      r_gastroc: ['Knee_R', 'Ankle_R'], r_soleus: ['Ankle_R'],
      l_tib_ant: ['Ankle_L'], l_peroneals: ['Ankle_L'], l_tib_post: ['Ankle_L'], l_plantar_fascia: ['Ankle_L'],
      r_tib_ant: ['Ankle_R'], r_peroneals: ['Ankle_R'], r_tib_post: ['Ankle_R'], r_plantar_fascia: ['Ankle_R'],
      l_ant_deltoid: ['Shoulder_L'], l_mid_deltoid: ['Shoulder_L'], l_post_deltoid: ['Shoulder_L'], l_supraspinatus: ['Shoulder_L'],
      r_ant_deltoid: ['Shoulder_R'], r_mid_deltoid: ['Shoulder_R'], r_post_deltoid: ['Shoulder_R'], r_supraspinatus: ['Shoulder_R'],
      l_infraspinatus: ['Shoulder_L'], l_upper_trap: ['Shoulder_L', 'Neck_M'], l_lower_trap: ['Shoulder_L'],
      r_infraspinatus: ['Shoulder_R'], r_upper_trap: ['Shoulder_R', 'Neck_M'], r_lower_trap: ['Shoulder_R'],
      l_rhomboids: ['Shoulder_L'], l_serratus_ant: ['Shoulder_L'],
      r_rhomboids: ['Shoulder_R'], r_serratus_ant: ['Shoulder_R'],
      l_biceps: ['Elbow_L'], l_triceps: ['Elbow_L'], l_wrist_flex: ['Elbow_L'], l_wrist_ext: ['Elbow_L'],
      r_biceps: ['Elbow_R'], r_triceps: ['Elbow_R'], r_wrist_flex: ['Elbow_R'], r_wrist_ext: ['Elbow_R'],
      l_pec_major: ['Shoulder_L'], l_pec_minor: ['Shoulder_L'],
      r_pec_major: ['Shoulder_R'], r_pec_minor: ['Shoulder_R'],
      rectus_abdominis: ['RootPart1_M'], transverse_abdominis: ['RootPart1_M'], obliques: ['RootPart1_M'],
      erector_spinae_lumbar: ['RootPart1_M'], erector_spinae_thoracic: ['Spine2_M'],
      multifidus: ['RootPart1_M'],
    };

    const boneAccum: Record<string, { color: number; intensity: number; count: number }> = {};

    for (const [muscleId, ov] of entries) {
      if (!ov) continue;
      const bones = MUSCLE_TO_BONES[muscleId];
      if (!bones) continue;

      let color = 0x22c55e;
      let intensity = 0.4;

      if (ov.pathology !== 'none') {
        color = 0xef4444; intensity = 0.7;
      } else if (ov.inhibition > 30) {
        color = 0xa855f7; intensity = 0.4 + (ov.inhibition / 100) * 0.4;
      } else if (ov.tensionOffset > 15) {
        color = 0xf97316; intensity = 0.5 + (ov.tensionOffset / 40) * 0.3;
      } else if (ov.tensionOffset < -15) {
        color = 0x3b82f6; intensity = 0.5;
      } else if (ov.lengthOverride === 'shortened') {
        color = 0xef4444; intensity = 0.5;
      } else if (ov.lengthOverride === 'lengthened') {
        color = 0x3b82f6; intensity = 0.5;
      } else if (ov.activationOffset > 15) {
        color = 0x22c55e; intensity = 0.5;
      } else if (ov.activationOffset < -15) {
        color = 0xa855f7; intensity = 0.5;
      }

      for (const bone of bones) {
        if (!boneAccum[bone] || intensity > boneAccum[bone].intensity) {
          boneAccum[bone] = { color, intensity, count: (boneAccum[bone]?.count || 0) + 1 };
        }
      }
    }

    return Object.entries(boneAccum).map(([boneName, { color, intensity }]) => ({
      boneName,
      color,
      intensity,
      glowSize: boneName.includes('Root') || boneName.includes('Spine') ? 0.22 : 0.18,
    }));
  }, [muscleOverrides]);

  const influenceHighlights = useMemo(() => {
    const entries = Object.entries(influenceMap);
    if (entries.length === 0) return [];

    const GROUP_TO_BONES: Record<string, string[]> = {
      glute_l: ['Hip_L', 'HipPart1_L'], glute_r: ['Hip_R', 'HipPart1_R'],
      quad_l: ['HipPart2_L', 'Knee_L'], quad_r: ['HipPart2_R', 'Knee_R'],
      calf_l: ['Knee_L', 'Ankle_L'], calf_r: ['Knee_R', 'Ankle_R'],
      shin_l: ['Ankle_L', 'Toes_L'], shin_r: ['Ankle_R', 'Toes_R'],
      deltoid_l: ['Shoulder_L', 'ShoulderPart1_L'], deltoid_r: ['Shoulder_R', 'ShoulderPart1_R'],
      scapula_l: ['Scapula_L', 'Shoulder_L'], scapula_r: ['Scapula_R', 'Shoulder_R'],
      bicep_l: ['Elbow_L', 'ElbowPart1_L'], bicep_r: ['Elbow_R', 'ElbowPart1_R'],
      chest: ['Chest_M', 'Spine1Part2_M'],
      spine: ['Spine1_M', 'Spine1Part1_M', 'RootPart2_M'],
      core: ['RootPart1_M', 'Root_M'],
      neck: ['Neck_M', 'NeckPart1_M'],
    };

    const PATHWAY_COLORS: Record<InfluencePathway, number> = {
      reciprocal_inhibition: 0xeab308,
      fascial_chain: 0x06b6d4,
      kinetic_chain: 0xf97316,
    };

    const boneAccum: Record<string, { color: number; intensity: number }> = {};
    const overrideBones = new Set(muscleOverrideHighlights.map(h => h.boneName));

    for (const [groupId, entry] of entries) {
      const bones = GROUP_TO_BONES[groupId];
      if (!bones) continue;

      const dominant = getDominantPathway(entry);
      const maxDelta = Math.max(...entry.sources.map(s => s.delta));
      const intensity = Math.min(0.6, Math.max(0.15, maxDelta / 60));
      const color = PATHWAY_COLORS[dominant];

      for (const bone of bones) {
        if (overrideBones.has(bone)) continue;
        if (!boneAccum[bone] || intensity > boneAccum[bone].intensity) {
          boneAccum[bone] = { color, intensity };
        }
      }
    }

    return Object.entries(boneAccum).map(([boneName, { color, intensity }]) => ({
      boneName,
      color,
      intensity,
      glowSize: boneName.includes('Root') || boneName.includes('Spine') || boneName.includes('Chest') ? 0.20 : 0.16,
    }));
  }, [influenceMap, muscleOverrideHighlights]);

  const getIntegrityLabel = (score: number) => score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Poor' : 'Critical';
  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe') => severity === 'severe' ? 'text-red-400' : severity === 'moderate' ? 'text-orange-400' : 'text-yellow-400';

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-gray-900 relative overflow-hidden">
      {/* Full-Page Skeleton Viewer */}
      <div className="h-full w-full relative flex">
            {cameraMode && (
              <div className="w-[40%] h-full flex-shrink-0 relative border-r border-gray-700">
                <FocusedCameraCapture
                  onPoseUpdate={handleCameraPoseUpdate}
                  onPartialPoseUpdate={handlePartialPoseUpdate}
                  onPosturalMetrics={handlePosturalMetricsUpdate}
                  isActive={cameraMode}
                  onFocusedAnalysisComplete={handleFocusedAnalysisComplete}
                  onRegionChange={(region) => setFocusedRegion(region)}
                  className="h-full border-0 rounded-none"
                />
                {cameraPoseActive && posturalMetrics && (
                  <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
                    <div className="bg-black/75 backdrop-blur-sm rounded-lg p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cyan-400 font-semibold text-[11px] uppercase tracking-wide">Postural Analysis</span>
                        <Badge variant="outline" className={`text-[10px] h-5 ${
                          posturalMetrics.viewType === 'frontal' ? 'border-green-500 text-green-400' :
                          posturalMetrics.viewType.startsWith('lateral') ? 'border-blue-500 text-blue-400' :
                          posturalMetrics.viewType === 'posterior' ? 'border-purple-500 text-purple-400' :
                          'border-yellow-500 text-yellow-400'
                        }`}>
                          {posturalMetrics.viewType === 'lateral_left' ? 'Left Lateral' :
                           posturalMetrics.viewType === 'lateral_right' ? 'Right Lateral' :
                           posturalMetrics.viewType.charAt(0).toUpperCase() + posturalMetrics.viewType.slice(1)} View
                        </Badge>
                      </div>

                      {(posturalMetrics.viewType === 'lateral_left' || posturalMetrics.viewType === 'lateral_right') && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Kyphosis</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.kyphosisAngle) > 40 ? 'text-red-400' : Math.abs(posturalMetrics.kyphosisAngle) > 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(posturalMetrics.kyphosisAngle)}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Lordosis</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.lordosisAngle) > 45 ? 'text-red-400' : Math.abs(posturalMetrics.lordosisAngle) > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(posturalMetrics.lordosisAngle)}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fwd Head</span>
                            <span className={`font-mono ${posturalMetrics.forwardHeadAngle > 20 ? 'text-red-400' : posturalMetrics.forwardHeadAngle > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(posturalMetrics.forwardHeadAngle)}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pelvic Tilt</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.anteriorPelvicTilt) > 15 ? 'text-red-400' : Math.abs(posturalMetrics.anteriorPelvicTilt) > 8 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(posturalMetrics.anteriorPelvicTilt)}° {posturalMetrics.anteriorPelvicTilt > 0 ? 'ant' : 'post'}
                            </span>
                          </div>
                        </div>
                      )}

                      {(posturalMetrics.viewType === 'frontal' || posturalMetrics.viewType === 'posterior') && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Scoliosis</span>
                            <span className={`font-mono ${posturalMetrics.scoliosisAngle > 10 ? 'text-red-400' : posturalMetrics.scoliosisAngle > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(posturalMetrics.scoliosisAngle)}° {posturalMetrics.scoliosisDirection !== 'none' ? posturalMetrics.scoliosisDirection.charAt(0).toUpperCase() : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Shoulder Level</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.shoulderLevelDifference) > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(Math.abs(posturalMetrics.shoulderLevelDifference))}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pelvic Obliq</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.pelvicObliquity) > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(Math.abs(posturalMetrics.pelvicObliquity))}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Trunk Shift</span>
                            <span className={`font-mono ${Math.abs(posturalMetrics.trunkLateralShift) > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {Math.round(Math.abs(posturalMetrics.trunkLateralShift))}°
                            </span>
                          </div>
                        </div>
                      )}

                      {posturalMetrics.viewType === 'oblique' && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fwd Head</span>
                            <span className="font-mono text-gray-300">{Math.round(posturalMetrics.forwardHeadAngle)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Scoliosis</span>
                            <span className="font-mono text-gray-300">{Math.round(posturalMetrics.scoliosisAngle)}°</span>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-700 pt-1 mt-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-cyan-400/80 text-[10px] font-medium">Scapulohumeral</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400">L Ratio</span>
                            <span className={`font-mono ${posturalMetrics.leftScapuloHumeralRatio < 1.5 || posturalMetrics.leftScapuloHumeralRatio > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {posturalMetrics.leftScapuloHumeralRatio.toFixed(1)}:1
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">R Ratio</span>
                            <span className={`font-mono ${posturalMetrics.rightScapuloHumeralRatio < 1.5 || posturalMetrics.rightScapuloHumeralRatio > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {posturalMetrics.rightScapuloHumeralRatio.toFixed(1)}:1
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">L Scap Elev</span>
                            <span className="font-mono text-gray-300">{Math.round(posturalMetrics.leftScapulaElevation)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">R Scap Elev</span>
                            <span className="font-mono text-gray-300">{Math.round(posturalMetrics.rightScapulaElevation)}°</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-gray-500 italic">
                        {(posturalMetrics.viewType === 'frontal' || posturalMetrics.viewType === 'posterior') ?
                          'Turn sideways for kyphosis/lordosis/pelvic tilt' :
                          'Face camera for scoliosis/shoulder level'}
                      </div>
                    </div>
                  </div>
                )}
                {cameraPoseActive && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                      onClick={handleCapturePose}
                    >
                      <Pause className="h-3.5 w-3.5 mr-1.5" />
                      Capture Pose
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div ref={skeletonContainerRef} className={`${cameraMode ? 'w-[60%]' : 'w-full'} h-full relative`}>
            <PureThreeGLBViewer
              modelPath="/models/skeleton_character.glb"
              modelConfig={finalModelConfig as any}
              zoomToRegion={zoomToRegion}
              className="w-full h-full"
              highlightRegions={[
                ...clinicalHighlights.map(h => ({
                  region: h.region,
                  color: HIGHLIGHT_COLORS[h.type].hex,
                  intensity: 0.3 + h.severity * 0.7,
                })),
                ...connectionHighlights.map(r => ({
                  region: r,
                  color: 0x3b82f6,
                  intensity: 0.5,
                })),
              ]}
              highlightBoneNames={chainHighlightBones || muscleOverrideHighlights.length > 0 || influenceHighlights.length > 0 || visualizationBoneHighlights.length > 0 ? [
                ...(chainHighlightBones || []),
                ...muscleOverrideHighlights,
                ...influenceHighlights,
                ...visualizationBoneHighlights,
              ] : undefined}
              enablePainMarkers={painMarkerMode}
              activePainMarkerType={activePainMarkerType}
              painMarkers={painMarkers}
              onPainMarkerAdd={handlePainMarkerAdd}
              onPainMarkerMove={handlePainMarkerMove}
              onPainMarkerRemove={handlePainMarkerRemove}
              onPainMarkerUpdate={handlePainMarkerUpdate}
              onPainMarkerSelect={(id: string) => {
                const marker = painMarkers.find(m => m.id === id);
                if (marker) setClinicalBubbleMarker(marker);
              }}
              enableRomMode={romMode}
              onRomJointSelect={handleRomJointSelect}
              selectedRomJointId={selectedRomJoint?.id || null}
              enablePoseMode={poseMode}
              onModelConfigChange={updateModelConfig}
              enableZoomTool={zoomToolMode}
              onLandmarkSelect={handleLandmarkSelect}
              forceOverlay={forceMode && forceAnalysis ? forceAnalysis.joints.filter(j => enabledForceJoints.has(j.id)) : null}
              bodyWeightKg={bodyWeightKg}
              selectedForceJoint={selectedForceJoint}
              onForceJointSelect={(joint) => setSelectedForceJoint(prev => prev === joint ? null : joint)}
              muscleStates={muscleMode && muscleAnalysis ? muscleAnalysis.groupStates : undefined}
              enableMuscleInteraction={muscleMode}
              onMuscleGroupClick={(groupId, screenX, screenY) => {
                setClickedMusclePopup(prev => prev?.groupId === groupId ? null : { groupId, screenX, screenY });
              }}
              highlightMuscleGroups={biomechanicalMuscleHighlights.length > 0 ? biomechanicalMuscleHighlights : undefined}
              muscleHighlightColors={Object.keys(muscleHighlightColors).length > 0 ? muscleHighlightColors : undefined}
              animationState={animationState}
              onAnimationProgress={handleAnimationProgress}
              animationConstraints={animationConstraints}
              environmentPreset={environmentPreset}
              fascialChainVisualization={fascialChainVizProp}
              onChainNodeClick={handleChainNodeClick}
              scarMarkers={scarMarkers}
              adhesionBands={adhesionBands}
              onScarMarkerClick={(id) => setEditingScar(id)}
              treatmentBoneNames={treatmentBoneNames}
              onBoneScreenPositions={handleBoneScreenPositions}
              enableSkeletonClick={!!scarPlacementMode || adhesionPlacementStep !== 'idle'}
              onSkeletonClick={(position, nearestBone, anatomicalLabel) => {
                if (scarPlacementMode) {
                  const newScar: ScarMarker = {
                    id: `scar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    position,
                    nearestBone,
                    anatomicalLabel,
                    type: scarPlacementMode,
                    length: 0.08,
                    width: 0.03,
                    orientation: 0,
                    affectedLayers: ['superficial'],
                    severity: 3,
                    age: 'chronic',
                    mobility: 'tethered',
                    painOnPalpation: 3,
                    notes: '',
                  };
                  setScarMarkers(prev => [...prev, newScar]);
                  setEditingScar(newScar.id);
                  setScarPlacementMode(null);
                } else if (adhesionPlacementStep === 'start') {
                  setPendingAdhesionStart({ position, bone: nearestBone });
                  setAdhesionPlacementStep('end');
                } else if (adhesionPlacementStep === 'end' && pendingAdhesionStart) {
                  const newBand: AdhesionBand = {
                    id: `adhesion_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    startPosition: pendingAdhesionStart.position,
                    endPosition: position,
                    startBone: pendingAdhesionStart.bone,
                    endBone: nearestBone,
                    restrictedMovements: [],
                    tensionLevel: 50,
                    depth: 'superficial',
                  };
                  setAdhesionBands(prev => [...prev, newBand]);
                  setAdhesionPlacementStep('idle');
                  setPendingAdhesionStart(null);
                }
              }}
            />

            <MovementPlayer
              animationState={animationState}
              onAnimationStateChange={setAnimationState}
              onConstraintsChange={setAnimationConstraints}
              onCompensationChange={handleCompensationChange}
              modelConfig={finalModelConfig as any}
              muscleRestrictionEffects={muscleRestrictionEffects}
            />

            {/* Joint Controls Overlay */}
            {showJointControls && (() => {
              const toggleSection = (id: string) => {
                setOpenControlSections(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              };
              const isOpen = (id: string) => openControlSections.has(id);
              const S = ({ label, configPath, min, max, step = 1 }: { label: string; configPath: string; min: number; max: number; step?: number }) => {
                const [group, prop] = configPath.split('.');
                const val = (modelConfig as any)[group]?.[prop] ?? 0;
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-[90px] flex-shrink-0 truncate" title={label}>{label}</span>
                    <Slider min={min} max={max} step={step} value={[val]}
                      onValueChange={([v]) => updateModelConfig(configPath, v)} className="flex-1" />
                    <span className="text-[10px] text-gray-400 w-6 text-right">{val}</span>
                  </div>
                );
              };
              const Section = ({ id, title, children }: { id: string; title: string; children: any }) => (
                <div className="border-b border-gray-100 last:border-0">
                  <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-gray-50 rounded transition-colors">
                    <span className="text-[11px] font-semibold text-gray-700">{title}</span>
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen(id) ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen(id) && <div className="space-y-1.5 pb-2 px-1">{children}</div>}
                </div>
              );
              return (
              <div className="absolute top-2 right-2 w-64 bg-white/95 backdrop-blur rounded-lg shadow-lg max-h-[calc(100%-16px)] overflow-y-auto z-10">
                <div className="sticky top-0 bg-white/95 backdrop-blur rounded-t-lg px-3 py-2 border-b border-gray-200 flex items-center justify-between z-10">
                  <span className="text-xs font-bold text-gray-800">Posture Controls</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setOpenControlSections(new Set(['pelvis','sacrum','hip','knee','ankle','lumbar','thoracic','cervical','shoulder','scapula','elbow','wrist']))} className="text-[9px] text-blue-500 hover:text-blue-700 px-1">All</button>
                    <button onClick={() => setOpenControlSections(new Set())} className="text-[9px] text-gray-400 hover:text-gray-600 px-1">None</button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowJointControls(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="px-2 py-1">

                  <Section id="pelvis" title="Pelvis / Innominate">
                    <S label="Anterior/Post Tilt" configPath="pelvis.tilt" min={-20} max={20} />
                    <S label="Lateral Tilt" configPath="pelvis.obliquity" min={-15} max={15} />
                    <S label="Rotation" configPath="pelvis.rotation" min={-20} max={20} />
                    <S label="L Innominate Rot" configPath="pelvis.leftInnominateRotation" min={-15} max={15} />
                    <S label="R Innominate Rot" configPath="pelvis.rightInnominateRotation" min={-15} max={15} />
                  </Section>

                  <Section id="sacrum" title="Sacrum / SI Joint">
                    <S label="Nutation" configPath="sacrum.nutation" min={0} max={20} />
                    <S label="Counternutation" configPath="sacrum.counternutation" min={0} max={20} />
                    <S label="Torsion" configPath="sacrum.torsion" min={-15} max={15} />
                    <S label="Lateral Flexion" configPath="sacrum.lateralFlexion" min={-15} max={15} />
                  </Section>

                  <Section id="hip" title="Hip">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Flexion" configPath="leftHip.flexion" min={0} max={120} />
                    <S label="Extension" configPath="leftHip.extension" min={0} max={30} />
                    <S label="Abduction" configPath="leftHip.abduction" min={0} max={45} />
                    <S label="Adduction" configPath="leftHip.adduction" min={0} max={30} />
                    <S label="Internal Rot" configPath="leftHip.internalRotation" min={0} max={45} />
                    <S label="External Rot" configPath="leftHip.externalRotation" min={0} max={45} />
                    <S label="Anteversion" configPath="leftHip.anteversion" min={-15} max={30} />
                    <S label="Neck-Shaft Angle" configPath="leftHip.neckShaftAngle" min={-15} max={15} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Flexion" configPath="rightHip.flexion" min={0} max={120} />
                    <S label="Extension" configPath="rightHip.extension" min={0} max={30} />
                    <S label="Abduction" configPath="rightHip.abduction" min={0} max={45} />
                    <S label="Adduction" configPath="rightHip.adduction" min={0} max={30} />
                    <S label="Internal Rot" configPath="rightHip.internalRotation" min={0} max={45} />
                    <S label="External Rot" configPath="rightHip.externalRotation" min={0} max={45} />
                    <S label="Anteversion" configPath="rightHip.anteversion" min={-15} max={30} />
                    <S label="Neck-Shaft Angle" configPath="rightHip.neckShaftAngle" min={-15} max={15} />
                  </Section>

                  <Section id="knee" title="Knee">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Flexion" configPath="leftKnee.flexion" min={0} max={140} />
                    <S label="Varus/Valgum" configPath="leftKnee.varus" min={-15} max={15} />
                    <S label="Tibial Torsion" configPath="leftKnee.tibialTorsion" min={-20} max={20} />
                    <S label="Recurvatum" configPath="leftKnee.recurvatum" min={0} max={15} />
                    <S label="Tibial Slope" configPath="leftKnee.tibialSlope" min={0} max={15} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Flexion" configPath="rightKnee.flexion" min={0} max={140} />
                    <S label="Varus/Valgum" configPath="rightKnee.varus" min={-15} max={15} />
                    <S label="Tibial Torsion" configPath="rightKnee.tibialTorsion" min={-20} max={20} />
                    <S label="Recurvatum" configPath="rightKnee.recurvatum" min={0} max={15} />
                    <S label="Tibial Slope" configPath="rightKnee.tibialSlope" min={0} max={15} />
                  </Section>

                  <Section id="ankle" title="Ankle & Foot">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Dorsiflexion" configPath="leftAnkle.dorsiflexion" min={0} max={30} />
                    <S label="Plantarflexion" configPath="leftAnkle.plantarflexion" min={0} max={50} />
                    <S label="Inversion" configPath="leftAnkle.inversion" min={0} max={35} />
                    <S label="Eversion" configPath="leftAnkle.eversion" min={0} max={20} />
                    <S label="Forefoot Varus" configPath="leftAnkle.forefootVarus" min={-15} max={15} />
                    <S label="Toe Extension" configPath="leftAnkle.toeExtension" min={0} max={45} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Dorsiflexion" configPath="rightAnkle.dorsiflexion" min={0} max={30} />
                    <S label="Plantarflexion" configPath="rightAnkle.plantarflexion" min={0} max={50} />
                    <S label="Inversion" configPath="rightAnkle.inversion" min={0} max={35} />
                    <S label="Eversion" configPath="rightAnkle.eversion" min={0} max={20} />
                    <S label="Forefoot Varus" configPath="rightAnkle.forefootVarus" min={-15} max={15} />
                    <S label="Toe Extension" configPath="rightAnkle.toeExtension" min={0} max={45} />
                  </Section>

                  <Section id="lumbar" title="Lumbar Spine">
                    <S label="Lordosis" configPath="spine.lumbarLordosis" min={-30} max={30} />
                    <S label="Flexion" configPath="spine.flexion" min={0} max={60} />
                    <S label="Lateral Flexion" configPath="spine.lateralFlexion" min={-30} max={30} />
                    <S label="Rotation" configPath="spine.lumbarRotation" min={-20} max={20} />
                    <S label="Scoliosis" configPath="spine.lumbarScoliosis" min={-20} max={20} />
                  </Section>

                  <Section id="thoracic" title="Thoracic Spine">
                    <S label="Kyphosis" configPath="spine.thoracicKyphosis" min={-30} max={30} />
                    <S label="Rotation" configPath="spine.thoracicRotation" min={-20} max={20} />
                    <S label="Scoliosis" configPath="spine.thoracicScoliosis" min={-20} max={20} />
                  </Section>

                  <Section id="cervical" title="Cervical Spine">
                    <S label="Lordosis" configPath="spine.cervicalLordosis" min={-20} max={20} />
                    <S label="Flexion" configPath="neck.flexion" min={0} max={50} />
                    <S label="Extension" configPath="neck.extension" min={0} max={60} />
                    <S label="Rotation" configPath="neck.rotation" min={-80} max={80} />
                    <S label="Lateral Flexion" configPath="neck.lateralFlexion" min={-45} max={45} />
                    <S label="Forward Head" configPath="neck.forwardHead" min={0} max={30} />
                    <S label="Scoliosis" configPath="spine.cervicalScoliosis" min={-15} max={15} />
                  </Section>

                  <Section id="shoulder" title="Shoulder">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Flexion" configPath="leftShoulder.flexion" min={0} max={180} />
                    <S label="Abduction" configPath="leftShoulder.abduction" min={0} max={180} />
                    <S label="Internal Rot" configPath="leftShoulder.internalRotation" min={0} max={90} />
                    <S label="External Rot" configPath="leftShoulder.externalRotation" min={0} max={90} />
                    <S label="Retroversion" configPath="leftShoulder.retroversion" min={-20} max={20} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Flexion" configPath="rightShoulder.flexion" min={0} max={180} />
                    <S label="Abduction" configPath="rightShoulder.abduction" min={0} max={180} />
                    <S label="Internal Rot" configPath="rightShoulder.internalRotation" min={0} max={90} />
                    <S label="External Rot" configPath="rightShoulder.externalRotation" min={0} max={90} />
                    <S label="Retroversion" configPath="rightShoulder.retroversion" min={-20} max={20} />
                  </Section>

                  <Section id="scapula" title="Scapula">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Protraction" configPath="leftScapula.protraction" min={0} max={20} />
                    <S label="Retraction" configPath="leftScapula.retraction" min={0} max={20} />
                    <S label="Elevation" configPath="leftScapula.elevation" min={0} max={20} />
                    <S label="Depression" configPath="leftScapula.depression" min={0} max={15} />
                    <S label="Upward Rot" configPath="leftScapula.upwardRotation" min={0} max={30} />
                    <S label="Downward Rot" configPath="leftScapula.downwardRotation" min={0} max={20} />
                    <S label="Anterior Tilt" configPath="leftScapula.anteriorTilt" min={0} max={20} />
                    <S label="Posterior Tilt" configPath="leftScapula.posteriorTilt" min={0} max={20} />
                    <S label="Winging" configPath="leftScapula.winging" min={0} max={20} />
                    <S label="Clavicle Rot" configPath="leftScapula.clavicleRotation" min={-15} max={15} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Protraction" configPath="rightScapula.protraction" min={0} max={20} />
                    <S label="Retraction" configPath="rightScapula.retraction" min={0} max={20} />
                    <S label="Elevation" configPath="rightScapula.elevation" min={0} max={20} />
                    <S label="Depression" configPath="rightScapula.depression" min={0} max={15} />
                    <S label="Upward Rot" configPath="rightScapula.upwardRotation" min={0} max={30} />
                    <S label="Downward Rot" configPath="rightScapula.downwardRotation" min={0} max={20} />
                    <S label="Anterior Tilt" configPath="rightScapula.anteriorTilt" min={0} max={20} />
                    <S label="Posterior Tilt" configPath="rightScapula.posteriorTilt" min={0} max={20} />
                    <S label="Winging" configPath="rightScapula.winging" min={0} max={20} />
                    <S label="Clavicle Rot" configPath="rightScapula.clavicleRotation" min={-15} max={15} />
                  </Section>

                  <Section id="elbow" title="Elbow">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Flexion" configPath="leftElbow.flexion" min={0} max={145} />
                    <S label="Pronation/Sup" configPath="leftElbow.pronation" min={-90} max={90} />
                    <S label="Carrying Angle" configPath="leftElbow.carryingAngle" min={-15} max={25} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Flexion" configPath="rightElbow.flexion" min={0} max={145} />
                    <S label="Pronation/Sup" configPath="rightElbow.pronation" min={-90} max={90} />
                    <S label="Carrying Angle" configPath="rightElbow.carryingAngle" min={-15} max={25} />
                  </Section>

                  <Section id="wrist" title="Wrist & Hand">
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1 mb-0.5">Left</div>
                    <S label="Flexion/Ext" configPath="leftWrist.flexion" min={-80} max={80} />
                    <S label="Ulnar/Radial Dev" configPath="leftWrist.deviation" min={-30} max={30} />
                    <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-2 mb-0.5">Right</div>
                    <S label="Flexion/Ext" configPath="rightWrist.flexion" min={-80} max={80} />
                    <S label="Ulnar/Radial Dev" configPath="rightWrist.deviation" min={-30} max={30} />
                  </Section>

                </div>
              </div>
              );
            })()}

            {clickedMusclePopup && muscleMode && muscleAnalysis && (() => {
              const group = muscleAnalysis.groups.find(g => g.meshGroup === clickedMusclePopup.groupId || g.id === clickedMusclePopup.groupId);
              if (!group) return null;
              const containerRect = skeletonContainerRef.current?.getBoundingClientRect();
              const popupX = containerRect ? clickedMusclePopup.screenX - containerRect.left : clickedMusclePopup.screenX;
              const popupY = containerRect ? clickedMusclePopup.screenY - containerRect.top : clickedMusclePopup.screenY;
              const clampedX = Math.min(Math.max(popupX, 10), (containerRect?.width || 600) - 310);
              const clampedY = Math.min(Math.max(popupY, 10), (containerRect?.height || 400) - 200);
              const groupHasOverrides = group.muscles.some(m => muscleOverrides[m.id]?.isManual);
              const updateOverride = (muscleId: string, partial: Partial<MuscleOverride>) => {
                setMuscleOverrides(prev => {
                  const existing = prev[muscleId] || { tensionOffset: 0, activationOffset: 0, lengthOverride: 'none' as LengthOverride, inhibition: 0, pathology: 'none' as PathologyType, isManual: false };
                  const updated = { ...existing, ...partial, isManual: true };
                  if (updated.tensionOffset === 0 && updated.activationOffset === 0 && updated.lengthOverride === 'none' && updated.inhibition === 0 && updated.pathology === 'none') {
                    const { [muscleId]: _, ...rest } = prev;
                    return rest;
                  }
                  return { ...prev, [muscleId]: updated };
                });
              };
              return (
                <div
                  className="absolute z-30 w-[300px] max-h-[450px] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl scrollbar-thin"
                  style={{ left: clampedX, top: clampedY }}
                >
                  <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-3 py-2 border-b border-white/10 flex items-center justify-between rounded-t-xl z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getClinicalStatusColor(group.dominantStatus) }} />
                      <span className="text-xs font-bold text-white">{group.label}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ color: getClinicalStatusColor(group.dominantStatus), backgroundColor: getClinicalStatusColor(group.dominantStatus) + '25' }}>
                        {getClinicalStatusLabel(group.dominantStatus)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {groupHasOverrides && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMuscleOverrides(prev => {
                              const next = { ...prev };
                              group.muscles.forEach(m => delete next[m.id]);
                              return next;
                            });
                          }}
                          className="text-[8px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20"
                        >
                          Reset
                        </button>
                      )}
                      <button onClick={() => setClickedMusclePopup(null)} className="text-gray-400 hover:text-white p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-1 border-b border-white/5">
                    <div className="flex gap-3 text-[9px] text-gray-400">
                      <span>Avg Activation: <span className="text-green-400 font-medium">{group.avgActivation.toFixed(0)}%</span></span>
                      <span>Tightness: <span className="text-orange-400 font-medium">{group.avgTightness.toFixed(0)}%</span></span>
                      <span>Inhibition: <span className="text-purple-400 font-medium">{group.avgInhibition.toFixed(0)}%</span></span>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 space-y-1">
                    {group.muscles.map(m => {
                      const mColor = getClinicalStatusColor(m.clinicalStatus);
                      const isExpanded = selectedMuscleId === m.id;
                      const override = muscleOverrides[m.id];
                      const hasOverride = override?.isManual;
                      return (
                        <div key={m.id}
                          className={`rounded-lg px-2 py-1.5 cursor-pointer transition-all ${isExpanded ? 'bg-cyan-500/15 ring-1 ring-cyan-500/30' : hasOverride ? 'bg-amber-500/10 ring-1 ring-amber-500/20 hover:bg-amber-500/15' : 'bg-white/5 hover:bg-white/10'}`}
                          onClick={() => setSelectedMuscleId(prev => prev === m.id ? null : m.id)}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: mColor }} />
                            <span className="text-[10px] text-white font-medium flex-1 truncate">{m.label}</span>
                            {hasOverride && <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">modified</span>}
                            <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ color: mColor, backgroundColor: mColor + '20' }}>
                              {getClinicalStatusLabel(m.clinicalStatus)}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {[
                              { label: 'Length', value: m.lengthPercent, color: 'bg-blue-400', textColor: 'text-blue-400' },
                              { label: 'Activ', value: m.activationPercent, color: 'bg-green-400', textColor: 'text-green-400' },
                              { label: 'Tight', value: m.tightnessPercent, color: 'bg-orange-400', textColor: 'text-orange-400' },
                              { label: 'Inhib', value: m.inhibitionPercent, color: 'bg-purple-400', textColor: 'text-purple-400' },
                            ].map(bar => (
                              <div key={bar.label} className="flex items-center gap-1">
                                <span className={`text-[7px] ${bar.textColor} w-7`}>{bar.label}</span>
                                <div className="flex-1 bg-gray-700 rounded-full h-1">
                                  <div className={`${bar.color} h-1 rounded-full`} style={{ width: `${Math.min(100, bar.value)}%` }} />
                                </div>
                                <span className="text-[7px] text-gray-400 w-7 text-right tabular-nums">{bar.value.toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-2" onClick={e => e.stopPropagation()}>
                              <div className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                <SlidersHorizontal className="h-2.5 w-2.5" />
                                Adjust Properties
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] text-blue-400">Length</span>
                                  <span className="text-[8px] text-gray-400">{override?.lengthOverride && override.lengthOverride !== 'none' ? override.lengthOverride : 'auto'}</span>
                                </div>
                                <div className="flex gap-1">
                                  {(['none', 'shortened', 'neutral', 'lengthened'] as LengthOverride[]).map(opt => (
                                    <button
                                      key={opt}
                                      className={`flex-1 text-[7px] py-1 rounded transition-all ${
                                        (override?.lengthOverride || 'none') === opt
                                          ? opt === 'shortened' ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/40'
                                          : opt === 'lengthened' ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/40'
                                          : opt === 'neutral' ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/40'
                                          : 'bg-gray-600/30 text-gray-300 ring-1 ring-gray-500/40'
                                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                      }`}
                                      onClick={() => updateOverride(m.id, { lengthOverride: opt })}
                                    >
                                      {opt === 'none' ? 'Auto' : opt.charAt(0).toUpperCase() + opt.slice(1, 5)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] text-green-400">Activation Offset</span>
                                  <span className="text-[8px] text-gray-400 font-mono">{(override?.activationOffset || 0) > 0 ? '+' : ''}{override?.activationOffset || 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={override?.activationOffset || 0}
                                  onChange={e => updateOverride(m.id, { activationOffset: Number(e.target.value) })}
                                  className="w-full h-1 rounded-full appearance-none cursor-pointer accent-green-400"
                                  style={{ background: `linear-gradient(to right, #ef4444 0%, #374151 50%, #22c55e 100%)` }}
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] text-purple-400">Inhibition</span>
                                  <span className="text-[8px] text-gray-400 font-mono">{override?.inhibition || 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={override?.inhibition || 0}
                                  onChange={e => updateOverride(m.id, { inhibition: Number(e.target.value) })}
                                  className="w-full h-1 rounded-full appearance-none cursor-pointer accent-purple-400"
                                  style={{ background: `linear-gradient(to right, #374151 0%, #a855f7 100%)` }}
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] text-orange-400">Tension Offset</span>
                                  <span className="text-[8px] text-gray-400 font-mono">{(override?.tensionOffset || 0) > 0 ? '+' : ''}{override?.tensionOffset || 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={-40}
                                  max={40}
                                  value={override?.tensionOffset || 0}
                                  onChange={e => updateOverride(m.id, { tensionOffset: Number(e.target.value) })}
                                  className="w-full h-1 rounded-full appearance-none cursor-pointer accent-orange-400"
                                  style={{ background: `linear-gradient(to right, #3b82f6 0%, #374151 50%, #f97316 100%)` }}
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[8px] text-red-400">Pathology</span>
                                </div>
                                <select
                                  value={override?.pathology || 'none'}
                                  onChange={e => updateOverride(m.id, { pathology: e.target.value as PathologyType })}
                                  className="w-full text-[8px] bg-slate-800 border border-white/10 rounded px-1.5 py-1 text-white cursor-pointer focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
                                >
                                  {Object.entries(PATHOLOGY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="pt-1 border-t border-white/10 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-[8px] text-gray-400">Tone</span>
                                  <span className={`text-[8px] font-medium ${m.tone === 'hypertonic' ? 'text-red-400' : m.tone === 'hypotonic' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {getToneLabel(m.tone)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[8px] text-gray-400">Fatigue Risk</span>
                                  <span className={`text-[8px] font-medium ${m.fatigueRisk > 60 ? 'text-red-400' : m.fatigueRisk > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {m.fatigueRisk.toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-[8px] text-gray-400 leading-relaxed">{m.clinicalNote}</p>
                              </div>
                              {MUSCLE_JOINT_ACTIONS[m.meshGroup] && (
                                <div className="pt-1 border-t border-white/10">
                                  <div className="text-[8px] text-gray-500 mb-1">Affected Joints:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {MUSCLE_JOINT_ACTIONS[m.meshGroup].map((action, ai) => (
                                      <span key={ai} className="text-[7px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                        {action.joint} {action.parameter}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="pt-1 border-t border-white/10">
                                <button
                                  className="text-[8px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  onClick={(e) => { e.stopPropagation(); setShowMuscleExercises(prev => prev === m.id ? null : m.id); }}
                                >
                                  <Dumbbell className="h-2.5 w-2.5" />
                                  {showMuscleExercises === m.id ? 'Hide Exercises' : 'Show Exercises'}
                                </button>
                                {showMuscleExercises === m.id && (
                                  <div className="mt-1 space-y-1">
                                    {getExerciseRecommendations(m).map((ex, ei) => (
                                      <div key={ei} className={`rounded px-1.5 py-1 ${ex.priority === 'high' ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
                                        <div className="flex items-center gap-1">
                                          <span className={`text-[7px] px-1 rounded ${ex.type === 'stretch' ? 'bg-blue-500/20 text-blue-400' : ex.type === 'strengthen' ? 'bg-green-500/20 text-green-400' : ex.type === 'release' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {ex.type}
                                          </span>
                                          <span className="text-[8px] text-white flex-1">{ex.name}</span>
                                          <span className="text-[7px] text-gray-500">{ex.duration}</span>
                                        </div>
                                        <p className="text-[7px] text-gray-400 mt-0.5">{ex.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Force Analysis Overlay */}
            {forceMode && forceAnalysis && (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[260px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold text-white">Joint Forces ({forceAnalysis.joints.length} surfaces)</span>
                  </div>
                  <button
                    className="text-[10px] text-gray-400 hover:text-white"
                    onClick={() => setForceMode(false)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 mb-2 bg-white/5 rounded px-2 py-1">
                  <Weight className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] text-gray-300">Body Weight:</span>
                  <input
                    type="number"
                    value={bodyWeightKg}
                    onChange={(e) => setBodyWeightKg(Math.max(20, Math.min(300, Number(e.target.value) || 70)))}
                    className="w-12 bg-transparent border-b border-gray-600 text-white text-[11px] text-center outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-gray-400">kg</span>
                </div>

                {weightDistribution && (
                  <div className="mb-2 bg-white/5 rounded px-2 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-400 font-medium">Weight Distribution</span>
                      <span className={`text-[8px] px-1 py-0.5 rounded ${weightDistribution.asymmetryPercent > 15 ? 'bg-red-500/20 text-red-400' : weightDistribution.asymmetryPercent > 10 ? 'bg-orange-500/20 text-orange-400' : weightDistribution.asymmetryPercent > 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                        {weightDistribution.dominantSide === 'balanced' ? 'Balanced' : `${weightDistribution.asymmetryPercent.toFixed(1)}% asymmetry`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-blue-400 w-6">L</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="flex h-full">
                          <div className="bg-blue-500 h-full transition-all" style={{ width: `${weightDistribution.leftPercent}%` }} />
                          <div className="bg-orange-500 h-full transition-all" style={{ width: `${weightDistribution.rightPercent}%` }} />
                        </div>
                      </div>
                      <span className="text-[8px] text-orange-400 w-6 text-right">R</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[8px] text-blue-400 tabular-nums">{weightDistribution.leftPercent.toFixed(1)}%</span>
                      <span className="text-[8px] text-orange-400 tabular-nums">{weightDistribution.rightPercent.toFixed(1)}%</span>
                    </div>
                    <p className="text-[7px] text-gray-500 mt-0.5">{weightDistribution.clinical}</p>
                  </div>
                )}

                <div className="flex items-center gap-1 mb-2">
                  <button
                    className="text-[9px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 bg-white/5 rounded"
                    onClick={() => setEnabledForceJoints(new Set(forceAnalysis.joints.map(j => j.id)))}
                  >All On</button>
                  <button
                    className="text-[9px] text-gray-400 hover:text-white px-1.5 py-0.5 bg-white/5 rounded"
                    onClick={() => setEnabledForceJoints(new Set())}
                  >All Off</button>
                  <button
                    className="text-[9px] text-gray-400 hover:text-white px-1.5 py-0.5 bg-white/5 rounded ml-auto"
                    onClick={() => setCollapsedForceCategories(new Set())}
                  >Expand</button>
                  <button
                    className="text-[9px] text-gray-400 hover:text-white px-1.5 py-0.5 bg-white/5 rounded"
                    onClick={() => setCollapsedForceCategories(new Set(forceAnalysis.categories.map(c => c.id)))}
                  >Collapse</button>
                </div>

                <div className="space-y-1">
                  {forceAnalysis.categories.map((cat) => {
                    const isCollapsed = collapsedForceCategories.has(cat.id);
                    const enabledCount = cat.joints.filter(j => enabledForceJoints.has(j.id)).length;
                    const highCount = cat.joints.filter(j => j.status === 'high' || j.status === 'very_high').length;
                    const maxForce = Math.max(...cat.joints.map(j => j.totalForce));
                    const maxStatus = maxForce >= 3.0 ? 'very_high' : maxForce >= 1.5 ? 'high' : maxForce >= 0.8 ? 'moderate' : 'low';
                    return (
                      <div key={cat.id} className="bg-white/3 rounded">
                        <button
                          className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                          onClick={() => setCollapsedForceCategories(prev => {
                            const next = new Set(prev);
                            if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id);
                            return next;
                          })}
                        >
                          <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(maxStatus as any) }} />
                          <span className="text-[10px] font-medium text-gray-200 flex-1 text-left">{cat.label}</span>
                          {highCount > 0 && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">{highCount}</span>
                          )}
                          <span className="text-[9px] text-gray-500">{enabledCount}/{cat.joints.length}</span>
                        </button>
                        {!isCollapsed && (
                          <div className="pl-3 pr-1 pb-1.5 space-y-0.5">
                            {cat.joints.map((j) => {
                              const isEnabled = enabledForceJoints.has(j.id);
                              const isSelected = selectedForceJoint === j.id;
                              return (
                                <div key={j.id}>
                                  <div className="flex items-center gap-1">
                                    <button
                                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isEnabled ? 'bg-amber-500/30 border-amber-500' : 'bg-white/5 border-gray-600'}`}
                                      onClick={() => setEnabledForceJoints(prev => {
                                        const next = new Set(prev);
                                        if (next.has(j.id)) next.delete(j.id); else next.add(j.id);
                                        return next;
                                      })}
                                    >
                                      {isEnabled && <Check className="h-2.5 w-2.5 text-amber-400" />}
                                    </button>
                                    <button
                                      onClick={() => setSelectedForceJoint(prev => prev === j.id ? null : j.id)}
                                      className={`flex-1 flex items-center gap-1 py-0.5 px-1 rounded transition-colors ${isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}`}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(j.status) }} />
                                      <span className="text-[9px] text-gray-300 flex-1 truncate text-left">{j.label.replace(/^(Left |Right )/, '').replace(cat.label.replace(/^(Left |Right )/, '').split(' ')[0], '').trim() || j.label}</span>
                                      {getThresholdWarnings(j).exceeded && <AlertTriangle className="h-2 w-2 text-red-400 flex-shrink-0" />}
                                      <span className="text-[10px] font-bold tabular-nums" style={{ color: getStatusColor(j.status) }}>
                                        {(j.totalForce * 100).toFixed(0)}%
                                      </span>
                                      <span className="text-[8px] text-gray-500 w-[32px] text-right tabular-nums">
                                        {forceToNewtons(j.totalForce, bodyWeightKg)}N
                                      </span>
                                    </button>
                                  </div>
                                  {isSelected && (
                                    <div className="ml-5 mt-0.5 mb-1 px-2 py-1.5 bg-white/5 rounded border-l-2 space-y-0.5" style={{ borderColor: getStatusColor(j.status) }}>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8px] text-blue-400 font-medium">Compression</span>
                                        <span className="text-[9px] text-white tabular-nums">{(j.compression * 100).toFixed(0)}% ({forceToNewtons(j.compression, bodyWeightKg)}N)</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8px] text-red-400 font-medium">Tension</span>
                                        <span className="text-[9px] text-white tabular-nums">{(j.tension * 100).toFixed(0)}% ({forceToNewtons(j.tension, bodyWeightKg)}N)</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8px] text-yellow-400 font-medium">Shear</span>
                                        <span className="text-[9px] text-white tabular-nums">{(j.shear * 100).toFixed(0)}% ({forceToNewtons(j.shear, bodyWeightKg)}N)</span>
                                      </div>
                                      <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                                        <div className="flex h-1 rounded-full overflow-hidden">
                                          <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (j.compression / (j.compression + j.tension + j.shear + 0.001)) * 100)}%` }} />
                                          <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (j.tension / (j.compression + j.tension + j.shear + 0.001)) * 100)}%` }} />
                                          <div className="bg-yellow-500 h-full" style={{ width: `${Math.min(100, (j.shear / (j.compression + j.tension + j.shear + 0.001)) * 100)}%` }} />
                                        </div>
                                      </div>
                                      <p className="text-[8px] text-gray-400 leading-relaxed mt-0.5">{j.clinical}</p>
                                      {(() => {
                                        const tw = getThresholdWarnings(j);
                                        if (!tw.exceeded) return null;
                                        return (
                                          <div className="mt-1 pt-1 border-t border-red-500/20 space-y-0.5">
                                            {tw.warnings.map((w, wi) => (
                                              <div key={wi} className="flex items-start gap-1">
                                                <AlertTriangle className="h-2.5 w-2.5 text-red-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                  <span className="text-[8px] text-red-300 font-medium">{w.label}</span>
                                                  <span className="text-[7px] text-red-400 ml-1">({(w.actual * 100).toFixed(0)}% vs {(w.threshold * 100).toFixed(0)}% limit)</span>
                                                  <p className="text-[7px] text-red-400/70">{w.injuryType}</p>
                                                  <p className="text-[7px] text-gray-500 italic">{w.reference}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {forceAnalysis.baseSupportShift > 0.02 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-amber-300">COM shifted from center</span>
                    </div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-white/10">
                  <button
                    className={`w-full text-[9px] px-2 py-1.5 rounded flex items-center gap-1.5 mb-2 transition-colors ${forceAiLoading ? 'bg-purple-500/20 text-purple-300 cursor-wait' : forceAiSuggestions ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    onClick={async () => {
                      if (forceAiLoading) return;
                      if (forceAiSuggestions) { setForceAiSuggestions(null); return; }
                      setForceAiLoading(true);
                      try {
                        const elevated = forceAnalysis.joints.filter(j => j.status === 'high' || j.status === 'very_high');
                        const summary = elevated.length > 0
                          ? elevated.map(j => `${j.label}: ${(j.totalForce * 100).toFixed(0)}% BW (${j.status}) - ${j.clinical}`).join('\n')
                          : 'No significantly elevated forces detected.';
                        const response = await fetch('/api/physio-gpt/quick-analysis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            prompt: `As a physiotherapy biomechanics expert, analyze these elevated joint forces and provide 3-5 specific posture correction suggestions to reduce loading. For each suggestion, specify which joint/slider to adjust and why.\n\nElevated Forces:\n${summary}\n\nBody weight: ${bodyWeightKg}kg\nWeight distribution: ${weightDistribution ? `Left ${weightDistribution.leftPercent.toFixed(1)}% / Right ${weightDistribution.rightPercent.toFixed(1)}%` : 'Not assessed'}\n\nProvide brief, actionable suggestions in bullet points.`
                          })
                        });
                        const data = await response.json();
                        setForceAiSuggestions(data.response || data.message || 'Unable to generate suggestions.');
                      } catch {
                        setForceAiSuggestions('Unable to connect to AI service. Please try again.');
                      } finally {
                        setForceAiLoading(false);
                      }
                    }}
                  >
                    <Brain className="h-3 w-3" />
                    {forceAiLoading ? 'Analyzing...' : forceAiSuggestions ? 'Hide AI Suggestions' : 'AI Posture Corrections'}
                    {forceAiLoading && <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin ml-auto" />}
                  </button>
                  {forceAiSuggestions && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1.5 mb-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        <span className="text-[9px] text-purple-300 font-medium">AI Posture Corrections</span>
                      </div>
                      <div className="text-[8px] text-gray-300 whitespace-pre-wrap leading-relaxed">{forceAiSuggestions}</div>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2 text-[8px]">
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span className="text-gray-400">&lt;80%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                      <span className="text-gray-400">80-150%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-gray-400">150-300%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-gray-400">&gt;300%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[8px]">
                    <div className="flex items-center gap-0.5"><div className="w-2 h-1 bg-blue-500 rounded" /><span className="text-gray-500">Comp</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-2 h-1 bg-red-500 rounded" /><span className="text-gray-500">Tension</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-2 h-1 bg-yellow-500 rounded" /><span className="text-gray-500">Shear</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Muscle Analysis Overlay */}
            {muscleMode && muscleAnalysis && (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[270px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[11px] font-semibold text-white">Muscle Analysis ({muscleAnalysis.allMuscles.length} muscles)</span>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setMuscleMode(false)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {muscleAnalysis.syndromes.filter(s => s.detected).length > 0 && (
                  <div className="mb-2 space-y-1">
                    {muscleAnalysis.syndromes.filter(s => s.detected).map(s => (
                      <div key={s.id} className="bg-red-500/20 border border-red-500/30 rounded px-2 py-1">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-red-300">{s.label}</span>
                          <span className="text-[8px] text-red-400 ml-auto">{(s.severity * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[8px] text-red-300/80 mt-0.5 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-2 bg-indigo-500/10 border border-indigo-500/25 rounded-lg px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 text-indigo-400" />
                      <span className="text-[9px] font-medium text-indigo-300">Muscles Move Bones</span>
                    </div>
                    <button
                      onClick={() => setBidirectionalMode(!bidirectionalMode)}
                      className={`text-[8px] px-2 py-0.5 rounded font-medium transition-colors ${bidirectionalMode ? 'bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/50' : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'}`}
                    >
                      {bidirectionalMode ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {bidirectionalMode && (
                    <p className="text-[7px] text-indigo-400/70 mt-1 leading-relaxed">Muscle changes automatically adjust skeleton joint angles, fascial chains, and kinetic chains</p>
                  )}
                </div>

                {Object.keys(muscleOverrides).length > 0 && (
                  <div className="mb-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <SlidersHorizontal className="h-3 w-3 text-amber-400" />
                        <span className="text-[9px] font-medium text-amber-300">{Object.keys(muscleOverrides).length} muscle{Object.keys(muscleOverrides).length !== 1 ? 's' : ''} modified</span>
                      </div>
                      <button
                        onClick={() => setMuscleOverrides({})}
                        className="text-[8px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25"
                      >
                        Clear All
                      </button>
                    </div>
                    {muscleDrivenEffects && Object.keys(muscleDrivenEffects.jointAdjustments).length > 0 && (
                      <div className="mt-1 pt-1 border-t border-amber-500/20">
                        <span className="text-[8px] text-gray-500">Joint effects:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Object.entries(muscleDrivenEffects.jointAdjustments).map(([joint, params]) => (
                            Object.entries(params).map(([param, val]) => (
                              <span key={`${joint}-${param}`} className={`text-[7px] px-1.5 py-0.5 rounded ${val > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                {joint}.{param} {val > 0 ? '+' : ''}{val.toFixed(1)}°
                              </span>
                            ))
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {pathologyCompensation && pathologyCompensation.clinicalFindings.length > 0 && (
                  <div className="mb-2 bg-orange-500/10 border border-orange-500/25 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCompensationPanelOpen(!compensationPanelOpen)}
                      className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-orange-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-[10px] font-semibold text-orange-300">Pathology Compensation</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                          {pathologyCompensation.clinicalFindings.length} pattern{pathologyCompensation.clinicalFindings.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {pathologyCompensation.clinicalFindings.some(f => f.severity === 'severe') && (
                          <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">severe</span>
                        )}
                        {compensationPanelOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                      </div>
                    </button>
                    {compensationPanelOpen && (
                      <div className="px-2 pb-2 space-y-1.5">
                        {pathologyCompensation.clinicalFindings.map((finding, i) => (
                          <div key={i} className={`rounded px-2 py-1.5 border ${
                            finding.severity === 'severe' ? 'bg-red-500/15 border-red-500/30' :
                            finding.severity === 'moderate' ? 'bg-orange-500/15 border-orange-500/30' :
                            'bg-yellow-500/15 border-yellow-500/30'
                          }`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`text-[7px] px-1 py-0.5 rounded font-medium ${
                                finding.severity === 'severe' ? 'bg-red-500/30 text-red-300' :
                                finding.severity === 'moderate' ? 'bg-orange-500/30 text-orange-300' :
                                'bg-yellow-500/30 text-yellow-300'
                              }`}>{finding.severity}</span>
                              <span className="text-[9px] font-medium text-white">{finding.title}</span>
                            </div>
                            <p className="text-[8px] text-gray-300/80 leading-relaxed">{finding.description}</p>
                          </div>
                        ))}

                        {Object.keys(pathologyCompensation.compensatoryOverrides).length > 0 && (
                          <div className="pt-1 border-t border-orange-500/20">
                            <span className="text-[8px] font-medium text-orange-300">Compensating Muscles:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {Object.entries(pathologyCompensation.compensatoryOverrides).map(([groupId, comp]) => (
                                <span key={groupId} className="text-[7px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/25">
                                  {groupId.replace(/_/g, ' ')} +{comp.tensionOffset || 0}T
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {pathologyCompensation.romRestrictions.length > 0 && (
                          <div className="pt-1 border-t border-orange-500/20">
                            <span className="text-[8px] font-medium text-red-300">ROM Restrictions:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {pathologyCompensation.romRestrictions.map((r, i) => (
                                <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                  {r.joint}.{r.parameter} -{r.restrictionPercent}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {pathologyCompensation.posturalDeviations.length > 0 && (
                          <div className="pt-1 border-t border-orange-500/20">
                            <span className="text-[8px] font-medium text-yellow-300">Postural Deviations:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {pathologyCompensation.posturalDeviations.map((d, i) => (
                                <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                  {d.joint}.{d.parameter} {d.deviationDegrees > 0 ? '+' : ''}{d.deviationDegrees.toFixed(1)}°
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {treatmentPriorities.targets.length > 0 && (
                  <div className="mb-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setTreatmentPanelOpen(!treatmentPanelOpen)}
                      className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-emerald-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[10px] font-semibold text-emerald-300">Treatment Plan</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                          {treatmentPriorities.summary.totalTargets} targets
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {treatmentPriorities.summary.rootCauses > 0 && (
                          <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
                            {treatmentPriorities.summary.rootCauses} root cause{treatmentPriorities.summary.rootCauses > 1 ? 's' : ''}
                          </span>
                        )}
                        {treatmentPanelOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                      </div>
                    </button>

                    {treatmentPanelOpen && (
                      <div className="px-2 pb-2 space-y-1.5">
                        {treatmentPriorities.summary.syndromes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {treatmentPriorities.summary.syndromes.map(s => (
                              <span key={s} className="text-[7px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {treatmentPriorities.summary.syndromeProtocols && treatmentPriorities.summary.syndromeProtocols.length > 0 && (
                          <div className="space-y-1 pt-0.5">
                            {treatmentPriorities.summary.syndromeProtocols.map((protocol: SyndromeProtocol) => (
                              <div key={protocol.syndromeId} className="bg-red-500/5 border border-red-500/20 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => setExpandedTreatmentTarget(expandedTreatmentTarget === `protocol_${protocol.syndromeId}` ? null : `protocol_${protocol.syndromeId}`)}
                                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-red-500/10 transition-colors"
                                >
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3 text-red-400" />
                                    <span className="text-[8px] font-semibold text-red-300">{protocol.protocolName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[7px] text-red-400/70">{protocol.sourceAuthor}</span>
                                    {expandedTreatmentTarget === `protocol_${protocol.syndromeId}` ? <ChevronUp className="h-2.5 w-2.5 text-red-400/50" /> : <ChevronDown className="h-2.5 w-2.5 text-red-400/50" />}
                                  </div>
                                </button>
                                {expandedTreatmentTarget === `protocol_${protocol.syndromeId}` && (
                                  <div className="px-2 pb-2 border-t border-red-500/15 pt-1.5 space-y-1">
                                    <p className="text-[7px] text-gray-400 leading-relaxed">{protocol.description}</p>
                                    <p className="text-[7px] text-amber-400/80 leading-relaxed">{protocol.phaseNotes}</p>
                                    <div className="space-y-0.5 mt-1">
                                      <span className="text-[8px] font-medium text-red-300">Protocol Sequence:</span>
                                      {protocol.techniqueSequence.map((tech, ti) => (
                                        <div key={ti} className="bg-black/20 rounded px-1.5 py-1 mt-0.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[8px] text-white font-medium">{tech.name}</span>
                                            <div className="flex items-center gap-1">
                                              <span className={`text-[6px] px-1 py-0.5 rounded font-bold ${tech.evidenceGrade === 'A' ? 'bg-green-500/25 text-green-300' : tech.evidenceGrade === 'B' ? 'bg-yellow-500/25 text-yellow-300' : 'bg-gray-500/25 text-gray-400'}`}>
                                                {tech.evidenceGrade}
                                              </span>
                                              <span className={`text-[7px] px-1 py-0.5 rounded ${tech.type === 'manual' ? 'bg-purple-500/20 text-purple-300' : tech.type === 'exercise' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                {tech.type}
                                              </span>
                                            </div>
                                          </div>
                                          <p className="text-[7px] text-gray-500 mt-0.5">{tech.dosage}</p>
                                          <p className="text-[7px] text-gray-400 mt-0.5">{tech.rationale}</p>
                                        </div>
                                      ))}
                                    </div>
                                    {protocol.references.length > 0 && (
                                      <div className="mt-1 pt-1 border-t border-red-500/10">
                                        <span className="text-[7px] text-gray-500 font-medium">References:</span>
                                        {protocol.references.map((ref, ri) => (
                                          <div key={ri} className="flex items-start gap-1 mt-0.5">
                                            <span className="text-[6px] text-gray-500 leading-relaxed">
                                              {ref.authors} ({ref.year}). {ref.title}. <em>{ref.journal}</em>.
                                              {ref.pmid && (
                                                <a href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 ml-0.5 inline-flex items-center gap-0.5">
                                                  PubMed <ExternalLink className="h-2 w-2 inline" />
                                                </a>
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {treatmentPriorities.summary.criticalChain && (
                          <div className="flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="h-2.5 w-2.5 text-orange-400 flex-shrink-0" />
                            <span className="text-[8px] text-orange-300">Critical chain: {treatmentPriorities.summary.criticalChain}</span>
                          </div>
                        )}

                        {treatmentPriorities.summary.treatmentSequence.length > 0 && (
                          <div className="bg-black/30 rounded px-1.5 py-1 mt-1">
                            <span className="text-[8px] font-medium text-gray-400">Treatment sequence:</span>
                            {treatmentPriorities.summary.treatmentSequence.map((step, i) => (
                              <p key={i} className="text-[8px] text-gray-300 leading-relaxed mt-0.5">{step}</p>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          {treatmentPriorities.targets.map(target => {
                            const isExpanded = expandedTreatmentTarget === target.targetId;
                            const actionColors: Record<string, string> = {
                              release: 'bg-red-500/25 text-red-300 border-red-500/30',
                              stretch: 'bg-blue-500/25 text-blue-300 border-blue-500/30',
                              strengthen: 'bg-green-500/25 text-green-300 border-green-500/30',
                              activate: 'bg-yellow-500/25 text-yellow-300 border-yellow-500/30',
                              mobilize: 'bg-purple-500/25 text-purple-300 border-purple-500/30',
                              stabilize: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/30',
                            };
                            return (
                              <div
                                key={target.targetId}
                                className={`rounded border transition-colors ${target.isRootCause ? 'border-red-500/30 bg-red-500/5' : target.isCompensation ? 'border-blue-500/20 bg-blue-500/5' : 'border-gray-600/30 bg-white/3'}`}
                              >
                                <button
                                  onClick={() => setExpandedTreatmentTarget(isExpanded ? null : target.targetId)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-white bg-gray-600/50 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                                      {target.priority}
                                    </span>
                                    <span className="text-[9px] font-medium text-white truncate">{target.targetName}</span>
                                    <span className={`text-[7px] px-1 py-0.5 rounded border flex-shrink-0 ${actionColors[target.treatmentAction] || 'bg-gray-500/25 text-gray-300 border-gray-500/30'}`}>
                                      {target.actionLabel}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {target.isRootCause && (
                                      <span className="text-[6px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">ROOT</span>
                                    )}
                                    {target.isCompensation && (
                                      <span className="text-[6px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">COMP</span>
                                    )}
                                    {target.painCorrelations.length > 0 && (
                                      <MapPin className="h-2.5 w-2.5 text-red-400" />
                                    )}
                                    {target.contraindications && target.contraindications.length > 0 && (
                                      <AlertTriangle className={`h-2.5 w-2.5 ${target.contraindications.some(c => c.severity === 'stop') ? 'text-red-500' : target.contraindications.some(c => c.severity === 'warning') ? 'text-orange-400' : 'text-amber-400'}`} />
                                    )}
                                    {isExpanded ? <ChevronUp className="h-2.5 w-2.5 text-gray-500" /> : <ChevronDown className="h-2.5 w-2.5 text-gray-500" />}
                                  </div>
                                </button>

                                <p className="text-[8px] text-gray-400 leading-relaxed px-2 pb-1">{target.rationale}</p>

                                {target.contraindications && target.contraindications.length > 0 && (
                                  <div className="px-2 pb-1 space-y-0.5">
                                    {target.contraindications.map((ci, ciIdx) => (
                                      <div key={ciIdx} className={`flex items-start gap-1 rounded px-1.5 py-1 ${ci.severity === 'stop' ? 'bg-red-500/10 border border-red-500/25' : ci.severity === 'warning' ? 'bg-orange-500/10 border border-orange-500/25' : 'bg-amber-500/10 border border-amber-500/25'}`}>
                                        <AlertTriangle className={`h-2.5 w-2.5 flex-shrink-0 mt-0.5 ${ci.severity === 'stop' ? 'text-red-400' : ci.severity === 'warning' ? 'text-orange-400' : 'text-amber-400'}`} />
                                        <div>
                                          <span className={`text-[7px] font-semibold ${ci.severity === 'stop' ? 'text-red-300' : ci.severity === 'warning' ? 'text-orange-300' : 'text-amber-300'}`}>
                                            {ci.severity === 'stop' ? 'STOP' : ci.severity === 'warning' ? 'WARNING' : 'CAUTION'}: {ci.flag}
                                          </span>
                                          <p className="text-[6px] text-gray-400 leading-relaxed mt-0.5">{ci.reason}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="px-2 pb-2 space-y-1.5 border-t border-gray-600/20 pt-1.5">
                                    {target.techniques.length > 0 && (
                                      <div>
                                        <span className="text-[8px] font-medium text-emerald-400">Techniques:</span>
                                        {target.techniques.map((tech, i) => (
                                          <div key={i} className="mt-0.5 bg-black/20 rounded px-1.5 py-1">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                                <span className={`text-[6px] px-1 py-0.5 rounded font-bold flex-shrink-0 ${tech.evidenceGrade === 'A' ? 'bg-green-500/25 text-green-300 border border-green-500/30' : tech.evidenceGrade === 'B' ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' : tech.evidenceGrade === 'C' ? 'bg-gray-500/25 text-gray-400 border border-gray-500/30' : 'bg-gray-500/15 text-gray-500 border border-gray-500/20'}`}>
                                                  {tech.evidenceGrade}
                                                </span>
                                                <span className="text-[8px] text-white font-medium truncate">{tech.name}</span>
                                              </div>
                                              <span className={`text-[7px] px-1 py-0.5 rounded flex-shrink-0 ${tech.type === 'manual' ? 'bg-purple-500/20 text-purple-300' : tech.type === 'exercise' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                {tech.type}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <p className="text-[7px] text-gray-500">{tech.dosage}</p>
                                              {tech.guidelineSource && (
                                                <span className="text-[6px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400/80 flex-shrink-0">
                                                  {tech.guidelineSource}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[7px] text-gray-400 mt-0.5">{tech.rationale}</p>
                                            {tech.references && tech.references.length > 0 && (
                                              <div className="mt-1 pt-0.5 border-t border-gray-700/30">
                                                {tech.references.map((ref, ri) => {
                                                  const liveMatch = ref.pmid ? liveTargetEvidence.find(le => le.pmid === ref.pmid) : null;
                                                  return (
                                                    <p key={ri} className="text-[6px] text-gray-500 leading-relaxed">
                                                      {ref.authors} ({ref.year}). <em>{ref.journal}</em>
                                                      {ref.pmid && (
                                                        <a href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 ml-0.5 inline-flex items-center gap-0.5">
                                                          <ExternalLink className="h-2 w-2 inline" />
                                                        </a>
                                                      )}
                                                      {liveMatch && (
                                                        <span className="ml-0.5 text-[5px] bg-teal-500/20 text-teal-400 px-1 py-0.5 rounded">live</span>
                                                      )}
                                                    </p>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {target.painCorrelations.length > 0 && (
                                      <div>
                                        <span className="text-[8px] font-medium text-red-400">Pain Links:</span>
                                        {target.painCorrelations.map((pc, i) => (
                                          <div key={i} className="mt-0.5 flex items-start gap-1">
                                            <span className={`text-[7px] px-1 py-0.5 rounded flex-shrink-0 ${pc.mechanism === 'direct' ? 'bg-red-500/20 text-red-300' : pc.mechanism === 'referred' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                              {pc.mechanism}
                                            </span>
                                            <span className="text-[7px] text-gray-400">{pc.explanation}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {target.chainContext.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {target.chainContext.map((cc, i) => (
                                          <span key={i} className={`text-[7px] px-1 py-0.5 rounded border ${cc.integrity < 60 ? 'bg-red-500/10 text-red-400 border-red-500/20' : cc.integrity < 80 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                            {cc.chainName} {cc.integrity}%
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {liveTargetEvidence.length > 0 && (
                          <div className="mb-2 p-2 rounded-lg border border-teal-500/20 bg-teal-500/5">
                            <EvidenceCitationInline
                              papers={liveTargetEvidence}
                              compact={true}
                            />
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            setAiTreatmentLoading(true);
                            setAiTreatmentPlan(null);
                            try {
                              const response = await apiRequest('/api/physiogpt/treatment-synthesis', 'POST', {
                                targets: treatmentPriorities.targets.map(t => ({
                                  name: t.targetName,
                                  status: t.clinicalStatus,
                                  action: t.actionLabel,
                                  isRootCause: t.isRootCause,
                                  isCompensation: t.isCompensation,
                                  rationale: t.rationale,
                                  painLinks: t.painCorrelations.map(p => p.explanation),
                                  chains: t.chainContext.map(c => `${c.chainName} (${c.integrity}%)`),
                                  contraindications: t.contraindications?.map(c => `[${c.severity.toUpperCase()}] ${c.flag}: ${c.reason}`) || [],
                                  techniques: t.techniques.map(tech => `${tech.name} (${tech.evidenceGrade}) - ${tech.dosage}`),
                                })),
                                summary: treatmentPriorities.summary,
                                syndromeProtocols: treatmentPriorities.summary.syndromeProtocols?.map(p => ({ name: p.protocolName, source: p.sourceAuthor, sequence: p.techniqueSequence.map(t => t.name) })) || [],
                                syndromes: muscleAnalysis.syndromes.filter(s => s.detected).map(s => s.label),
                              });
                              const data = await response.json();
                              setAiTreatmentPlan(data.plan);
                              if (data.evidenceReferences) {
                                setTreatmentEvidenceRefs(data.evidenceReferences);
                              }
                            } catch {
                              setAiTreatmentPlan('Failed to generate AI treatment plan. Please try again.');
                            } finally {
                              setAiTreatmentLoading(false);
                            }
                          }}
                          disabled={aiTreatmentLoading}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors text-[9px] font-medium disabled:opacity-50"
                        >
                          {aiTreatmentLoading ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Generating AI Treatment Plan...</>
                          ) : (
                            <><Sparkles className="h-3 w-3" /> Generate AI Treatment Plan</>
                          )}
                        </button>

                        {aiTreatmentPlan && (
                          <div className="bg-black/30 rounded-lg px-2 py-1.5 border border-emerald-500/20">
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="h-3 w-3 text-emerald-400" />
                              <span className="text-[9px] font-medium text-emerald-300">AI Treatment Synthesis</span>
                            </div>
                            <div className="text-[8px] text-gray-300 leading-relaxed whitespace-pre-wrap">{aiTreatmentPlan}</div>
                            {treatmentEvidenceRefs.length > 0 && (
                              <div className="mt-2 border-t border-emerald-500/20 pt-2">
                                <EvidenceCitationInline
                                  papers={treatmentEvidenceRefs}
                                  compact={true}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-gray-400">{muscleAnalysis.groups.length} muscle groups</span>
                  <div className="flex gap-1">
                    <button
                      className="text-[8px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 hover:bg-rose-500/50"
                      onClick={() => setEnabledMuscleGroups(new Set(muscleAnalysis.groups.map(g => g.id)))}
                    >All On</button>
                    <button
                      className="text-[8px] px-1.5 py-0.5 rounded bg-gray-600/50 text-gray-300 hover:bg-gray-600/80"
                      onClick={() => setEnabledMuscleGroups(new Set())}
                    >All Off</button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-1.5">
                  <button
                    className={`text-[7px] px-1.5 py-0.5 rounded ${!muscleStatusFilter ? 'bg-rose-500/30 text-rose-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    onClick={() => setMuscleStatusFilter(null)}
                  >All</button>
                  {(['shortened', 'overactive', 'inhibited', 'lengthened', 'weak', 'spasm'] as const).map(status => (
                    <button
                      key={status}
                      className={`text-[7px] px-1.5 py-0.5 rounded ${muscleStatusFilter === status ? 'text-white' : 'text-gray-400 hover:bg-white/10'}`}
                      style={muscleStatusFilter === status ? { backgroundColor: getClinicalStatusColor(status) + '40', color: getClinicalStatusColor(status) } : {}}
                      onClick={() => setMuscleStatusFilter(prev => prev === status ? null : status)}
                    >
                      {getClinicalStatusLabel(status)} ({muscleAnalysis.allMuscles.filter(m => m.clinicalStatus === status).length})
                    </button>
                  ))}
                </div>

                <div className="space-y-0.5">
                  {muscleAnalysis.groups
                  .filter(group => !muscleStatusFilter || group.muscles.some(m => m.clinicalStatus === muscleStatusFilter))
                  .map(group => {
                    const isCollapsed = collapsedMuscleGroups.has(group.id);
                    const isEnabled = enabledMuscleGroups.has(group.id);
                    const statusColor = getClinicalStatusColor(group.dominantStatus);
                    return (
                      <div key={group.id} className="rounded bg-white/5">
                        <div className="flex items-center gap-1 px-1.5 py-1 cursor-pointer hover:bg-white/10 rounded"
                          onClick={() => {
                            setCollapsedMuscleGroups(prev => {
                              const next = new Set(prev);
                              if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                              return next;
                            });
                          }}
                        >
                          <ChevronDown className={`h-2.5 w-2.5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                          <span className="text-[10px] text-white font-medium flex-1 truncate">{group.label}</span>
                          <span className="text-[8px] px-1 py-0 rounded" style={{ color: statusColor }}>
                            {getClinicalStatusLabel(group.dominantStatus)}
                          </span>
                          {influenceMap[group.id] && (
                            <span className="text-[7px] px-1 py-0 rounded-full font-medium" style={{ backgroundColor: `${getInfluencePathwayColor(getDominantPathway(influenceMap[group.id]))}20`, color: getInfluencePathwayColor(getDominantPathway(influenceMap[group.id])) }}>
                              {influenceMap[group.id].sources.length} influenced
                            </span>
                          )}
                          <button
                            className={`w-4 h-3 rounded-full flex items-center transition-colors ${isEnabled ? 'bg-rose-500' : 'bg-gray-600'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnabledMuscleGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                                return next;
                              });
                            }}
                          >
                            <div className={`w-2 h-2 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-2' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        {!isCollapsed && (
                          <div className="px-2 pb-1.5 space-y-1">
                            <div className="flex gap-2 text-[8px] text-gray-500 mb-0.5">
                              <span>Avg Act: {(group.avgActivation).toFixed(0)}%</span>
                              <span>Tight: {(group.avgTightness).toFixed(0)}%</span>
                              <span>Inhib: {(group.avgInhibition).toFixed(0)}%</span>
                            </div>
                            {group.muscles.filter(m => !muscleStatusFilter || m.clinicalStatus === muscleStatusFilter).map(m => {
                              const mStatusColor = getClinicalStatusColor(m.clinicalStatus);
                              const isSelected = selectedMuscleId === m.id;
                              const mInfluence = influenceMap[m.meshGroup];
                              const mInfluenceBorderColor = mInfluence ? getInfluencePathwayColor(getDominantPathway(mInfluence)) : null;
                              return (
                                <div key={m.id}
                                  className={`rounded px-1.5 py-1 cursor-pointer transition-colors ${isSelected ? 'bg-rose-500/20 ring-1 ring-rose-500/40' : 'bg-white/5 hover:bg-white/10'}`}
                                  style={mInfluenceBorderColor ? { borderLeft: `2px solid ${mInfluenceBorderColor}` } : undefined}
                                  onClick={() => setSelectedMuscleId(prev => prev === m.id ? null : m.id)}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: mStatusColor }} />
                                    <span className="text-[9px] text-white flex-1 truncate">{m.label}</span>
                                    {m.influenceSources?.includes('reciprocal_inhibition') && (
                                      <span className="text-[6px] px-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium" title={`Reciprocal inhibition: +${Math.round(m.riInhibitionDelta ?? 0)}%`}>RI</span>
                                    )}
                                    {m.influenceSources?.includes('fascial_chain') && (
                                      <span className="text-[6px] px-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium" title={`Chain: ${(m.chainTensionDelta ?? 0) > 0 ? '+' : ''}${Math.round(m.chainTensionDelta ?? 0)}% tension`}>FC</span>
                                    )}
                                    <span className="text-[7px] px-1 rounded" style={{ color: mStatusColor, backgroundColor: `${mStatusColor}20` }}>
                                      {getClinicalStatusLabel(m.clinicalStatus)}
                                    </span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] text-blue-400 w-8">Length</span>
                                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                                        <div className="bg-blue-400 h-1 rounded-full" style={{ width: `${Math.min(100, m.lengthPercent)}%` }} />
                                      </div>
                                      <span className="text-[7px] text-gray-400 w-7 text-right tabular-nums">{m.lengthPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] text-green-400 w-8">Activ</span>
                                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                                        <div className="bg-green-400 h-1 rounded-full" style={{ width: `${Math.min(100, m.activationPercent)}%` }} />
                                      </div>
                                      <span className="text-[7px] text-gray-400 w-7 text-right tabular-nums">{m.activationPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] text-orange-400 w-8">Tight</span>
                                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                                        <div className={`h-1 rounded-full ${m.chainTensionDelta && m.chainTensionDelta > 1 ? 'bg-gradient-to-r from-orange-400 to-cyan-400' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, m.tightnessPercent)}%` }} />
                                      </div>
                                      <span className="text-[7px] text-gray-400 w-7 text-right tabular-nums">{m.tightnessPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] text-purple-400 w-8">Inhib</span>
                                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                                        <div className={`h-1 rounded-full ${m.riInhibitionDelta && m.riInhibitionDelta > 2 ? 'bg-gradient-to-r from-purple-400 to-yellow-400' : 'bg-purple-400'}`} style={{ width: `${Math.min(100, m.inhibitionPercent)}%` }} />
                                      </div>
                                      <span className="text-[7px] text-gray-400 w-7 text-right tabular-nums">{m.inhibitionPercent.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  {isSelected && (() => {
                                    const ov = muscleOverrides[m.id];
                                    const doUpdate = (partial: Partial<MuscleOverride>) => {
                                      setMuscleOverrides(prev => {
                                        const existing = prev[m.id] || { tensionOffset: 0, activationOffset: 0, lengthOverride: 'none' as LengthOverride, inhibition: 0, pathology: 'none' as PathologyType, isManual: false };
                                        const updated = { ...existing, ...partial, isManual: true };
                                        if (updated.tensionOffset === 0 && updated.activationOffset === 0 && updated.lengthOverride === 'none' && updated.inhibition === 0 && updated.pathology === 'none') {
                                          const { [m.id]: _, ...rest } = prev;
                                          return rest;
                                        }
                                        return { ...prev, [m.id]: updated };
                                      });
                                    };
                                    return (
                                    <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-2" onClick={e => e.stopPropagation()}>
                                      <div className="text-[8px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                        <SlidersHorizontal className="h-2.5 w-2.5" />
                                        Adjust Properties
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[7px] text-blue-400">Length</span>
                                          <span className="text-[7px] text-gray-400">{ov?.lengthOverride && ov.lengthOverride !== 'none' ? ov.lengthOverride : 'auto'}</span>
                                        </div>
                                        <div className="flex gap-0.5">
                                          {(['none', 'shortened', 'neutral', 'lengthened'] as LengthOverride[]).map(opt => (
                                            <button
                                              key={opt}
                                              className={`flex-1 text-[7px] py-0.5 rounded transition-all ${
                                                (ov?.lengthOverride || 'none') === opt
                                                  ? opt === 'shortened' ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/40'
                                                  : opt === 'lengthened' ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/40'
                                                  : opt === 'neutral' ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/40'
                                                  : 'bg-gray-600/30 text-gray-300 ring-1 ring-gray-500/40'
                                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                              }`}
                                              onClick={() => doUpdate({ lengthOverride: opt })}
                                            >
                                              {opt === 'none' ? 'Auto' : opt.charAt(0).toUpperCase() + opt.slice(1, 5)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[7px] text-green-400">Activation Offset</span>
                                          <span className="text-[7px] text-gray-400 font-mono">{(ov?.activationOffset || 0) > 0 ? '+' : ''}{ov?.activationOffset || 0}%</span>
                                        </div>
                                        <input
                                          type="range" min={-50} max={50} value={ov?.activationOffset || 0}
                                          onChange={e => doUpdate({ activationOffset: Number(e.target.value) })}
                                          className="w-full h-1 rounded-full appearance-none cursor-pointer accent-green-400"
                                          style={{ background: `linear-gradient(to right, #ef4444 0%, #374151 50%, #22c55e 100%)` }}
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[7px] text-purple-400">Inhibition</span>
                                          <span className="text-[7px] text-gray-400 font-mono">{ov?.inhibition || 0}%</span>
                                        </div>
                                        <input
                                          type="range" min={0} max={100} value={ov?.inhibition || 0}
                                          onChange={e => doUpdate({ inhibition: Number(e.target.value) })}
                                          className="w-full h-1 rounded-full appearance-none cursor-pointer accent-purple-400"
                                          style={{ background: `linear-gradient(to right, #374151 0%, #a855f7 100%)` }}
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[7px] text-orange-400">Tension Offset</span>
                                          <span className="text-[7px] text-gray-400 font-mono">{(ov?.tensionOffset || 0) > 0 ? '+' : ''}{ov?.tensionOffset || 0}%</span>
                                        </div>
                                        <input
                                          type="range" min={-40} max={40} value={ov?.tensionOffset || 0}
                                          onChange={e => doUpdate({ tensionOffset: Number(e.target.value) })}
                                          className="w-full h-1 rounded-full appearance-none cursor-pointer accent-orange-400"
                                          style={{ background: `linear-gradient(to right, #3b82f6 0%, #374151 50%, #f97316 100%)` }}
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[7px] text-red-400">Pathology</span>
                                        </div>
                                        <select
                                          value={ov?.pathology || 'none'}
                                          onChange={e => doUpdate({ pathology: e.target.value as PathologyType })}
                                          className="w-full text-[7px] bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-white cursor-pointer focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
                                        >
                                          {Object.entries(PATHOLOGY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="pt-1 border-t border-white/10 space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[7px] text-gray-400">Tone</span>
                                          <span className={`text-[7px] font-medium ${m.tone === 'hypertonic' ? 'text-red-400' : m.tone === 'hypotonic' ? 'text-blue-400' : 'text-green-400'}`}>
                                            {getToneLabel(m.tone)}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[7px] text-gray-400">Fatigue Risk</span>
                                          <span className={`text-[7px] font-medium ${m.fatigueRisk > 60 ? 'text-red-400' : m.fatigueRisk > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {m.fatigueRisk.toFixed(0)}%
                                          </span>
                                        </div>
                                        <p className="text-[7px] text-gray-400 leading-relaxed">{m.clinicalNote}</p>
                                      </div>
                                      {(() => {
                                        const srcGroup = m.meshGroup;
                                        const influencedTargets = Object.entries(influenceMap).filter(([_, entry]) =>
                                          entry.sources.some(s => s.sourceGroupId === srcGroup)
                                        );
                                        if (influencedTargets.length === 0 || !muscleOverrides[m.id]?.isManual) return null;

                                        const byPathway: Record<InfluencePathway, { groupId: string; sources: typeof influenceMap[string]['sources'] }[]> = {
                                          reciprocal_inhibition: [],
                                          fascial_chain: [],
                                          kinetic_chain: [],
                                        };
                                        for (const [gId, entry] of influencedTargets) {
                                          for (const src of entry.sources) {
                                            if (src.sourceGroupId === srcGroup) {
                                              const existing = byPathway[src.pathway].find(e => e.groupId === gId);
                                              if (existing) existing.sources.push(src);
                                              else byPathway[src.pathway].push({ groupId: gId, sources: [src] });
                                            }
                                          }
                                        }

                                        return (
                                          <div className="pt-1.5 border-t border-white/10">
                                            <div className="text-[8px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-1">
                                              <Zap className="h-2.5 w-2.5" />
                                              Influence Ripple ({influencedTargets.length} muscles)
                                            </div>
                                            <div className="space-y-1.5">
                                              {(['reciprocal_inhibition', 'fascial_chain', 'kinetic_chain'] as InfluencePathway[]).map(pathway => {
                                                const items = byPathway[pathway];
                                                if (items.length === 0) return null;
                                                const color = getInfluencePathwayColor(pathway);
                                                return (
                                                  <div key={pathway}>
                                                    <div className="text-[7px] font-medium mb-0.5 flex items-center gap-1" style={{ color }}>
                                                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                      {getInfluencePathwayLabel(pathway)}
                                                    </div>
                                                    <div className="space-y-0.5 pl-2">
                                                      {items.map(item => {
                                                        const targetGroup = muscleAnalysis?.groups.find(g => g.id === item.groupId);
                                                        const targetLabel = targetGroup?.label || item.groupId;
                                                        const src = item.sources[0];
                                                        const targetStatus = targetGroup?.dominantStatus;
                                                        return (
                                                          <div
                                                            key={`${pathway}-${item.groupId}`}
                                                            className="flex items-center gap-1 rounded px-1 py-0.5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              const firstMuscle = targetGroup?.muscles[0];
                                                              if (firstMuscle) setSelectedMuscleId(firstMuscle.id);
                                                            }}
                                                          >
                                                            <span className="text-[7px] px-0.5 rounded font-medium" style={{ backgroundColor: `${color}20`, color }}>{getInfluencePathwayAbbrev(pathway)}</span>
                                                            <span className="text-[8px] text-white flex-1 truncate">{targetLabel}</span>
                                                            <span className="text-[7px] font-mono" style={{ color }}>{src.delta > 0 ? '+' : ''}{src.delta}%</span>
                                                            {targetStatus && targetStatus !== 'normal' && (
                                                              <span className="text-[6px] text-gray-400">→ {getClinicalStatusLabel(targetStatus)}</span>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                      {items[0]?.sources[0]?.chainName && (
                                                        <div className="text-[6px] text-gray-500 italic pl-1">via {items[0].sources[0].chainName}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      <div className="pt-1 border-t border-white/10">
                                        <button
                                          className="text-[7px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                                          onClick={(e) => { e.stopPropagation(); setShowMuscleExercises(prev => prev === m.id ? null : m.id); }}
                                        >
                                          <Dumbbell className="h-2 w-2" />
                                          {showMuscleExercises === m.id ? 'Hide Exercises' : 'Show Exercises'}
                                        </button>
                                        {showMuscleExercises === m.id && (
                                          <div className="mt-1 space-y-1">
                                            {getExerciseRecommendations(m).map((ex, ei) => (
                                              <div key={ei} className={`rounded px-1.5 py-1 ${ex.priority === 'high' ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
                                                <div className="flex items-center gap-1">
                                                  <span className={`text-[7px] px-1 rounded ${ex.type === 'stretch' ? 'bg-blue-500/20 text-blue-400' : ex.type === 'strengthen' ? 'bg-green-500/20 text-green-400' : ex.type === 'release' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {ex.type}
                                                  </span>
                                                  <span className="text-[8px] text-white flex-1">{ex.name}</span>
                                                  <span className="text-[7px] text-gray-500">{ex.duration}</span>
                                                </div>
                                                <p className="text-[7px] text-gray-400 mt-0.5">{ex.description}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  <button
                    className={`w-full text-[9px] px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors ${showBalanceRatios ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setShowBalanceRatios(prev => !prev)}
                  >
                    <Scale className="h-3 w-3" />
                    Muscle Balance Ratios
                    <ChevronDown className={`h-2.5 w-2.5 ml-auto transition-transform ${showBalanceRatios ? '' : '-rotate-90'}`} />
                  </button>
                  {showBalanceRatios && muscleAnalysis && (
                    <div className="space-y-1 pl-1">
                      {computeMuscleBalanceRatios(muscleAnalysis.allMuscles).map(ratio => (
                        <div key={ratio.id} className="bg-white/5 rounded px-2 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-white">{ratio.label}</span>
                            <span className={`text-[9px] font-bold tabular-nums ${ratio.status === 'balanced' ? 'text-green-400' : 'text-orange-400'}`}>
                              {ratio.ratio.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[7px] text-gray-500">{ratio.agonist.label}: {ratio.agonist.avgActivation.toFixed(0)}%</span>
                            <span className="text-[7px] text-gray-600">vs</span>
                            <span className="text-[7px] text-gray-500">{ratio.antagonist.label}: {ratio.antagonist.avgActivation.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1 mt-0.5">
                            <div className={`h-1 rounded-full ${ratio.status === 'balanced' ? 'bg-green-500' : ratio.status === 'agonist_dominant' ? 'bg-orange-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, ratio.ratio * 100)}%` }} />
                          </div>
                          <p className="text-[7px] text-gray-500 mt-0.5">{ratio.clinical}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className={`w-full text-[9px] px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors ${showTreatmentPriority ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setShowTreatmentPriority(prev => !prev)}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Treatment Priorities
                    <ChevronDown className={`h-2.5 w-2.5 ml-auto transition-transform ${showTreatmentPriority ? '' : '-rotate-90'}`} />
                  </button>
                  {showTreatmentPriority && muscleAnalysis && (
                    <div className="space-y-0.5 pl-1">
                      {computeTreatmentPriorities(muscleAnalysis.allMuscles).slice(0, 15).map(tp => (
                        <div key={tp.muscleId} className={`rounded px-2 py-1 ${tp.urgency === 'critical' ? 'bg-red-500/10 border-l-2 border-red-500' : tp.urgency === 'high' ? 'bg-orange-500/10 border-l-2 border-orange-500' : 'bg-white/5'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-white truncate flex-1">{tp.muscleLabel}</span>
                            <span className={`text-[8px] font-bold tabular-nums ${tp.urgency === 'critical' ? 'text-red-400' : tp.urgency === 'high' ? 'text-orange-400' : tp.urgency === 'moderate' ? 'text-yellow-400' : 'text-green-400'}`}>
                              {tp.score.toFixed(0)}
                            </span>
                            <span className={`text-[7px] ml-1 px-1 rounded ${tp.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : tp.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' : tp.urgency === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                              {tp.urgency}
                            </span>
                          </div>
                          <p className="text-[7px] text-gray-500">{tp.recommendedApproach}</p>
                          {tp.factors.length > 0 && (
                            <p className="text-[7px] text-gray-600">Factors: {tp.factors.join(', ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-1.5 text-[7px]">
                    {(['normal', 'shortened', 'lengthened', 'overactive', 'inhibited', 'spasm', 'weak'] as const).map(status => (
                      <div key={status} className="flex items-center gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getClinicalStatusColor(status) }} />
                        <span className="text-gray-400">{getClinicalStatusLabel(status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Kinetic Chain Explorer Overlay */}
            {chainExplorerMode && (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[300px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px] font-semibold text-white">Kinetic Chain Explorer</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className={`text-[7px] px-1.5 py-0.5 rounded transition-colors ${chainIntegrityMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                      onClick={() => setChainIntegrityMode(!chainIntegrityMode)}
                    >
                      <Shield className="h-2.5 w-2.5 inline mr-0.5" />
                      Integrity
                    </button>
                    <button className="text-gray-400 hover:text-white" onClick={() => setChainExplorerMode(false)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[8px] text-gray-400 mb-2">{chainIntegrityMode ? 'Showing chain health scores based on current posture.' : 'Evidence-based kinetic chains. Select a chain to explore its pathway.'}</p>

                <div className="flex flex-wrap gap-1 mb-2">
                  {(['myofascial', 'functional', 'biomechanical'] as const).map(cat => (
                    <span key={cat} className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                      {cat === 'myofascial' ? 'Myofascial Lines' : cat === 'functional' ? 'Functional Slings' : 'Biomechanical'}
                    </span>
                  ))}
                </div>

                <div className="space-y-1">
                  {KINETIC_CHAINS.map(chain => {
                    const isSelected = selectedChainId === chain.id;
                    const integrity = chainIntegrityScores.get(chain.id);
                    const integrityScore = integrity?.score ?? 100;
                    const isIntegrityExpanded = expandedChainIntegrity === chain.id;
                    return (
                      <div key={chain.id} className={`rounded transition-colors ${isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/3'}`}>
                        <button
                          className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                          onClick={() => {
                            setSelectedChainId(prev => prev === chain.id ? null : chain.id);
                            setExpandedChainLink(null);
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2" style={{ borderColor: chain.color, backgroundColor: isSelected ? chain.color : 'transparent' }} />
                          <span className="text-[10px] font-medium text-gray-200 flex-1 text-left">{chain.label}</span>
                          {chainIntegrityMode ? (
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${integrityScore}%`, backgroundColor: getIntegrityColor(integrityScore) }} />
                              </div>
                              <span className="text-[7px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>{integrityScore}%</span>
                            </div>
                          ) : (
                            <span className={`text-[7px] px-1 py-0.5 rounded ${chain.category === 'myofascial' ? 'bg-blue-500/20 text-blue-400' : chain.category === 'functional' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>
                              {chain.category}
                            </span>
                          )}
                          <ChevronDown className={`h-2.5 w-2.5 text-gray-500 transition-transform ${isSelected ? '' : '-rotate-90'}`} />
                        </button>

                        {isSelected && (
                          <div className="px-2 pb-2 space-y-1.5">
                            {chainIntegrityMode && integrity && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 p-1.5 rounded-lg" style={{ backgroundColor: getIntegrityColor(integrityScore) + '15', border: `1px solid ${getIntegrityColor(integrityScore)}30` }}>
                                  <Shield className="h-3 w-3" style={{ color: getIntegrityColor(integrityScore) }} />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>Chain Integrity: {getIntegrityLabel(integrityScore)}</span>
                                      <span className="text-[8px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>{integrityScore}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-700 rounded-full mt-0.5">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${integrityScore}%`, backgroundColor: getIntegrityColor(integrityScore) }} />
                                    </div>
                                  </div>
                                </div>
                                {integrity.problematicLinks.length > 0 && (
                                  <div>
                                    <span className="text-[8px] text-red-400 font-medium">Problematic Links ({integrity.problematicLinks.length})</span>
                                    <div className="mt-0.5 space-y-0.5">
                                      {integrity.problematicLinks.map((link, i) => (
                                        <div key={i} className="flex items-center gap-1 text-[7px] text-red-300/80 bg-red-500/10 px-1.5 py-0.5 rounded">
                                          <AlertTriangle className="h-2 w-2 text-red-400 flex-shrink-0" />
                                          {link}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {integrity.issues.length > 0 && (
                                  <div>
                                    <button className="text-[8px] text-orange-400 font-medium flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setExpandedChainIntegrity(prev => prev === chain.id ? null : chain.id); }}>
                                      <Activity className="h-2.5 w-2.5" />
                                      Muscle Issues ({integrity.issues.length})
                                      <ChevronDown className={`h-2 w-2 transition-transform ${isIntegrityExpanded ? '' : '-rotate-90'}`} />
                                    </button>
                                    {isIntegrityExpanded && (
                                      <div className="mt-0.5 space-y-0.5 ml-1">
                                        {integrity.issues.map((issue, i) => (
                                          <div key={i} className="text-[7px] text-orange-300/70 bg-orange-500/10 px-1.5 py-0.5 rounded">{issue}</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {integrity.exercises.length > 0 && (
                                  <div>
                                    <span className="text-[8px] text-cyan-400 font-medium">Recommended Exercises</span>
                                    <div className="mt-0.5 space-y-0.5">
                                      {integrity.exercises.map((ex, i) => (
                                        <div key={i} className="flex items-center gap-1 text-[7px] text-cyan-300/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                                          <Dumbbell className="h-2 w-2 text-cyan-400 flex-shrink-0" />
                                          {ex}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <p className="text-[8px] text-gray-400 leading-relaxed">{chain.description}</p>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                              <span className="text-[8px] text-emerald-400 font-medium">Clinical Relevance</span>
                              <p className="text-[7px] text-emerald-300/80 mt-0.5 leading-relaxed">{chain.clinicalRelevance}</p>
                            </div>

                            {correlationResult && correlationResult.painCorrelations.length > 0 && (() => {
                              const chainCorrelations = correlationResult.painCorrelations.filter(pc => pc.relatedChains.some(rc => rc.chainId === chain.id));
                              if (chainCorrelations.length === 0) return null;
                              return (
                                <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                                  <span className="text-[8px] text-red-400 font-medium">Pain Markers on This Chain ({chainCorrelations.length})</span>
                                  <div className="mt-0.5 space-y-0.5">
                                    {chainCorrelations.map((pc) => {
                                      const chainData = pc.relatedChains.find(rc => rc.chainId === chain.id);
                                      return (
                                        <div key={pc.markerId} className="text-[7px] text-red-300/80">
                                          <span className="text-red-300">{pc.markerLabel}</span>
                                          <span className="text-gray-500 ml-1">(severity {pc.severity}/10)</span>
                                          {chainData && <span className="text-gray-500 ml-1">- {chainData.relevanceReason}</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            <div>
                              <span className="text-[8px] text-gray-300 font-medium">Chain Pathway ({chain.links.length} links)</span>
                              <div className="mt-1 space-y-0.5">
                                {chain.links.map((link, li) => {
                                  const isExpanded = expandedChainLink === `${chain.id}_${li}`;
                                  const isProblematic = integrity?.problematicLinks.includes(link.label);
                                  return (
                                    <div key={li}>
                                      <button
                                        className={`w-full flex items-center gap-1 px-1.5 py-1 rounded text-left transition-colors ${isExpanded ? 'bg-white/10' : 'hover:bg-white/5'} ${isProblematic ? 'ring-1 ring-red-500/30' : ''}`}
                                        onClick={() => setExpandedChainLink(prev => prev === `${chain.id}_${li}` ? null : `${chain.id}_${li}`)}
                                      >
                                        <div className="flex flex-col items-center flex-shrink-0 w-3">
                                          <div className="w-2 h-2 rounded-full border" style={{ borderColor: isProblematic ? '#ef4444' : chain.color, backgroundColor: isProblematic ? '#ef444480' : (link.role === 'primary' ? chain.color : 'transparent') }} />
                                          {li < chain.links.length - 1 && <div className="w-0.5 h-3 mt-0.5" style={{ backgroundColor: chain.color + '60' }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className={`text-[9px] truncate block ${isProblematic ? 'text-red-300' : 'text-white'}`}>{link.label}</span>
                                          <span className="text-[7px] text-gray-500">{link.region}</span>
                                          {(() => {
                                            const mapping = CHAIN_BONE_MAPPING[chain.id];
                                            if (!mapping) return null;
                                            const hasLeft = mapping.left.length > 0;
                                            const hasRight = mapping.right.length > 0;
                                            const isMidlineRegion = ['spine', 'head', 'neck', 'trunk', 'pelvis', 'core', 'chest', 'sacrum', 'lumbar', 'thoracic', 'cervical'].some(r => link.region.toLowerCase().includes(r));
                                            if (isMidlineRegion) return <span className="text-[6px] text-purple-400/60 ml-1">M</span>;
                                            if (hasLeft && hasRight) return <span className="text-[6px] text-blue-400/60 ml-1">L) R)</span>;
                                            if (hasLeft) return <span className="text-[6px] text-blue-400/60 ml-1">L)</span>;
                                            if (hasRight) return <span className="text-[6px] text-blue-400/60 ml-1">R)</span>;
                                            return null;
                                          })()}
                                        </div>
                                        {isProblematic && <AlertTriangle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />}
                                        <span className={`text-[6px] px-1 rounded ${link.role === 'primary' ? 'bg-white/10 text-gray-300' : 'bg-white/5 text-gray-500'}`}>
                                          {link.role}
                                        </span>
                                      </button>
                                      {isExpanded && (
                                        <div className="ml-5 px-2 py-1 bg-white/5 rounded mb-0.5 border-l-2" style={{ borderColor: chain.color }}>
                                          <div className="text-[7px] text-gray-400 mb-0.5">
                                            <span className="text-gray-300 font-medium">Muscles: </span>
                                            {link.muscles.join(', ')}
                                          </div>
                                          <div className="text-[7px] text-gray-400">
                                            <span className="text-gray-300 font-medium">Force Role: </span>
                                            {link.forceContribution}
                                          </div>
                                          {chainIntegrityMode && (() => {
                                            const linkIssues = integrity?.issues.filter(issue => link.muscles.some(m => issue.toLowerCase().includes(m.toLowerCase().substring(0, 6)))) || [];
                                            if (linkIssues.length === 0) return null;
                                            return (
                                              <div className="mt-1 pt-1 border-t border-white/5">
                                                <span className="text-[7px] text-red-400 font-medium">Issues at this link:</span>
                                                {linkIssues.map((issue, i) => (
                                                  <div key={i} className="text-[6px] text-red-300/70 mt-0.5">{issue}</div>
                                                ))}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <span className="text-[8px] text-red-400 font-medium">Common Dysfunctions</span>
                              <div className="mt-0.5 space-y-0.5">
                                {chain.commonDysfunctions.map((d, di) => (
                                  <div key={di} className="flex items-start gap-1">
                                    <AlertTriangle className="h-2 w-2 text-red-400/60 flex-shrink-0 mt-0.5" />
                                    <span className="text-[7px] text-gray-400 leading-relaxed">{d}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[8px] text-cyan-400 font-medium">Assessment Tests</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {chain.assessmentTests.map((t, ti) => (
                                  <span key={ti} className="text-[7px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/80">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-1 text-[7px]">
                    <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-blue-500/50 border border-blue-500" /><span className="text-gray-400">Myofascial</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-orange-500/50 border border-orange-500" /><span className="text-gray-400">Functional</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-purple-500/50 border border-purple-500" /><span className="text-gray-400">Biomechanical</span></div>
                  </div>
                  {chainIntegrityMode ? (
                    <div className="flex items-center gap-2 mt-1 text-[7px]">
                      <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-green-500" /><span className="text-gray-500">Good</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-yellow-500" /><span className="text-gray-500">Fair</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-orange-500" /><span className="text-gray-500">Poor</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-red-500" /><span className="text-gray-500">Critical</span></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 text-[7px]">
                      <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-gray-500">Primary link</span></div>
                      <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full border border-emerald-500" /><span className="text-gray-500">Secondary link</span></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cross-System Correlation Dashboard */}
            {correlationMode && correlationResult && (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[310px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[11px] font-semibold text-white">Clinical Correlation</span>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setCorrelationMode(false)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg" style={{ backgroundColor: correlationResult.overallRiskScore > 60 ? '#ef444420' : correlationResult.overallRiskScore > 30 ? '#f9731620' : '#22c55e15' }}>
                  <div className="relative w-10 h-10">
                    <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                      <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="#374151" strokeWidth="3" />
                      <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke={correlationResult.overallRiskScore > 60 ? '#ef4444' : correlationResult.overallRiskScore > 30 ? '#f97316' : '#22c55e'} strokeWidth="3" strokeDasharray={`${correlationResult.overallRiskScore}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{correlationResult.overallRiskScore}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-medium text-white">Clinical Risk Score</span>
                    <p className="text-[7px] text-gray-400">{correlationResult.overallRiskScore > 60 ? 'High risk — multiple clinical findings' : correlationResult.overallRiskScore > 30 ? 'Moderate risk — some concerns' : 'Low risk — minimal findings'}</p>
                  </div>
                </div>

                {correlationResult.summaryFindings.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[8px] text-gray-300 font-medium">Key Findings</span>
                    <div className="mt-0.5 space-y-0.5">
                      {correlationResult.summaryFindings.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-start gap-1 text-[7px] text-gray-400">
                          <TrendingUp className="h-2 w-2 text-violet-400 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-0.5 mb-2 bg-white/5 rounded p-0.5">
                  {(['overview', 'chains', 'muscles', 'root_cause'] as const).map(tab => (
                    <button key={tab} className={`flex-1 text-[7px] py-1 px-1 rounded transition-colors ${correlationTab === tab ? 'bg-violet-500/30 text-violet-300' : 'text-gray-400 hover:text-white'}`} onClick={() => setCorrelationTab(tab)}>
                      {tab === 'overview' ? 'Overview' : tab === 'chains' ? 'Chains' : tab === 'muscles' ? 'Muscles' : 'Root Cause'}
                    </button>
                  ))}
                </div>

                {correlationResult.painCorrelations.length === 0 && (
                  <div className="text-center py-4">
                    <Target className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                    <p className="text-[9px] text-gray-400">Place pain markers on the skeleton to see cross-system correlations</p>
                  </div>
                )}

                {correlationResult.painCorrelations.map((pc) => {
                  const isExpanded = expandedCorrelation === pc.markerId;
                  return (
                    <div key={pc.markerId} className="mb-1.5 rounded bg-white/5 overflow-hidden">
                      <button className="w-full flex items-center gap-1.5 p-2 text-left hover:bg-white/5 transition-colors" onClick={() => setExpandedCorrelation(prev => prev === pc.markerId ? null : pc.markerId)}>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-medium text-white truncate block">{pc.markerLabel}</span>
                          <span className="text-[7px] text-gray-500">{pc.region} • severity {pc.severity}/10</span>
                        </div>
                        <div className="flex items-center gap-1 text-[7px]">
                          {pc.relatedChains.length > 0 && <span className="px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{pc.relatedChains.length} chains</span>}
                          {pc.relatedMuscles.length > 0 && <span className="px-1 py-0.5 rounded bg-rose-500/15 text-rose-400">{pc.relatedMuscles.length} muscles</span>}
                        </div>
                        <ChevronDown className={`h-2.5 w-2.5 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      </button>
                      {isExpanded && (
                        <div className="px-2 pb-2 space-y-1.5">
                          {correlationTab === 'overview' && (
                            <>
                              {pc.compensationPatterns.length > 0 && (
                                <div>
                                  <span className="text-[8px] text-orange-400 font-medium">Compensation Patterns</span>
                                  <div className="mt-0.5 space-y-0.5">
                                    {pc.compensationPatterns.map((cp, i) => (
                                      <div key={i} className="bg-orange-500/10 rounded px-1.5 py-1">
                                        <div className="flex items-center gap-1">
                                          <span className={`text-[8px] font-medium ${getSeverityColor(cp.severity)}`}>{cp.pattern}</span>
                                          <span className={`text-[6px] px-1 rounded ${cp.severity === 'severe' ? 'bg-red-500/20 text-red-400' : cp.severity === 'moderate' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{cp.severity}</span>
                                        </div>
                                        <p className="text-[7px] text-gray-400 mt-0.5">{cp.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {pc.relatedForces.length > 0 && (
                                <div>
                                  <span className="text-[8px] text-blue-400 font-medium">Related Joint Forces ({pc.relatedForces.length})</span>
                                  <div className="mt-0.5 space-y-0.5">
                                    {pc.relatedForces.slice(0, 5).map((f, i) => (
                                      <div key={i} className="flex items-center gap-1 text-[7px] bg-blue-500/10 px-1.5 py-0.5 rounded">
                                        <span className={`w-1.5 h-1.5 rounded-full ${f.status === 'very_high' ? 'bg-red-500' : f.status === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                        <span className="text-gray-300 flex-1 truncate">{f.jointLabel}</span>
                                        <span className="text-gray-500">{f.status.replace('_', ' ')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {correlationTab === 'chains' && (
                            <div>
                              <span className="text-[8px] text-emerald-400 font-medium">Kinetic Chains Through Pain Region</span>
                              {pc.relatedChains.length === 0 && <p className="text-[7px] text-gray-500 mt-0.5">No kinetic chains directly associated</p>}
                              <div className="mt-0.5 space-y-1">
                                {pc.relatedChains.sort((a, b) => b.relevanceScore - a.relevanceScore).map((rc, i) => (
                                  <div key={i} className="bg-white/5 rounded px-1.5 py-1">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rc.chainColor }} />
                                      <span className="text-[8px] text-white font-medium flex-1">{rc.chainLabel}</span>
                                      <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${rc.relevanceScore}%`, backgroundColor: rc.chainColor }} />
                                      </div>
                                      <span className="text-[7px] text-gray-400">{rc.relevanceScore}%</span>
                                    </div>
                                    <p className="text-[6px] text-gray-500 mt-0.5">{rc.relevanceReason}</p>
                                    {rc.relevantLinks.length > 0 && (
                                      <div className="mt-0.5">
                                        {rc.relevantLinks.slice(0, 3).map((rl, j) => (
                                          <div key={j} className="text-[6px] text-gray-400 flex items-center gap-0.5">
                                            <ArrowRight className="h-1.5 w-1.5 text-gray-600" />
                                            {rl.linkLabel}: {rl.muscles.slice(0, 2).join(', ')}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {correlationTab === 'muscles' && (
                            <div>
                              <span className="text-[8px] text-rose-400 font-medium">Contributing Muscles</span>
                              {pc.relatedMuscles.length === 0 && <p className="text-[7px] text-gray-500 mt-0.5">No abnormal muscles in this region</p>}
                              <div className="mt-0.5 space-y-0.5">
                                {pc.relatedMuscles.slice(0, 8).map((rm, i) => (
                                  <div key={i} className="bg-white/5 rounded px-1.5 py-1">
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[7px] px-1 rounded ${rm.contributionType === 'direct' ? 'bg-red-500/20 text-red-400' : rm.contributionType === 'referred' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{rm.contributionType}</span>
                                      <span className="text-[8px] text-white flex-1 truncate">{rm.muscleLabel}</span>
                                      <span className="text-[7px] px-1 rounded bg-white/10 text-gray-300">{rm.clinicalStatus}</span>
                                    </div>
                                    <p className="text-[6px] text-gray-500 mt-0.5">{rm.explanation}</p>
                                    <div className="flex gap-2 mt-0.5 text-[6px] text-gray-500">
                                      <span>Tight: {rm.tightness.toFixed(0)}%</span>
                                      <span>Active: {rm.activation.toFixed(0)}%</span>
                                      <span>Inhibited: {rm.inhibition.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {correlationTab === 'root_cause' && (
                            <div>
                              <span className="text-[8px] text-violet-400 font-medium">Root Cause Analysis</span>
                              {pc.rootCauseChain.length === 0 && <p className="text-[7px] text-gray-500 mt-0.5">Insufficient data for root cause analysis</p>}
                              <div className="mt-1 space-y-0">
                                {pc.rootCauseChain.map((step, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i === 0 ? 'bg-red-500 text-white' : i === pc.rootCauseChain.length - 1 ? 'bg-violet-500 text-white' : 'bg-white/10 text-gray-300'}`}>{step.step}</div>
                                      {i < pc.rootCauseChain.length - 1 && <div className="w-0.5 h-4 bg-violet-500/30" />}
                                    </div>
                                    <div className="flex-1 pb-1">
                                      <span className="text-[8px] text-white font-medium">{step.structure}</span>
                                      <p className="text-[7px] text-gray-400">{step.finding}</p>
                                      <p className="text-[6px] text-violet-400/60">{step.mechanism}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {correlationResult.globalCompensations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-[9px] text-orange-400 font-semibold">Global Compensation Patterns</span>
                    <div className="mt-1 space-y-1">
                      {correlationResult.globalCompensations.map((comp) => (
                        <div key={comp.id} className="bg-orange-500/10 border border-orange-500/15 rounded px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5 text-orange-400" />
                            <span className={`text-[8px] font-medium ${getSeverityColor(comp.severity)}`}>{comp.label}</span>
                            <span className={`text-[6px] px-1 rounded ${comp.severity === 'severe' ? 'bg-red-500/20 text-red-400' : comp.severity === 'moderate' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{comp.severity}</span>
                          </div>
                          <p className="text-[7px] text-gray-400 mt-0.5">{comp.description}</p>
                          <p className="text-[6px] text-orange-300/60 mt-0.5">{comp.clinicalSignificance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {correlationResult.clinicalPriorities.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-[9px] text-cyan-400 font-semibold">Clinical Priorities</span>
                    <div className="mt-1 space-y-0.5">
                      {correlationResult.clinicalPriorities.slice(0, 6).map((cp, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[7px]">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0 ${cp.priority === 1 ? 'bg-red-500 text-white' : cp.priority === 2 ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>{cp.priority}</span>
                          <div className="flex-1">
                            <span className="text-gray-300 font-medium">{cp.area}</span>
                            <p className="text-gray-500">{cp.finding}</p>
                            <p className="text-cyan-400/60">{cp.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Zoom Tool Region Navigator with Landmark Browser */}
            {zoomToolMode && (() => {
              const stripSide = (label: string) => label.replace(/^(Left |Right )/, '').replace(/ \(.*\)$/, '');

              return (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[230px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[11px] font-semibold text-white">Anatomy Browser</span>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setZoomToolMode(false)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mb-2">Select a region to zoom in, or expand to pick a specific landmark.</p>
                <div className="space-y-0.5">
                  {zoomRegionLandmarks.map(({ region, label, landmarks }) => {
                    const isExpanded = expandedZoomRegion === region;
                    const isActive = zoomToRegion === region;
                    return (
                      <div key={region} className="rounded-md overflow-hidden">
                        <div className="flex items-center gap-0.5">
                          <button
                            className={`flex-1 flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-l-md transition-colors text-left ${
                              isActive
                                ? 'bg-cyan-500/25 text-cyan-300'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={() => { setZoomToRegion(region); setExpandedZoomRegion(isExpanded ? null : region); }}
                          >
                            <Bone className="h-3 w-3 flex-shrink-0 opacity-60" />
                            <span className="flex-1">{label}</span>
                            <span className="text-[8px] text-gray-500">{landmarks.length}</span>
                          </button>
                          <button
                            className={`px-1.5 py-1.5 rounded-r-md transition-colors ${
                              isExpanded
                                ? 'bg-cyan-500/25 text-cyan-300'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={(e) => { e.stopPropagation(); setExpandedZoomRegion(isExpanded ? null : region); if (!isExpanded) setZoomToRegion(region); }}
                          >
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {isExpanded && landmarks.length > 0 && (
                          <div className="ml-2 mt-0.5 mb-1 border-l border-cyan-500/20 pl-2 space-y-0.5">
                            {landmarks.map((lm) => (
                              <button
                                key={lm.boneName}
                                className="w-full flex items-center gap-1.5 text-[9px] px-1.5 py-1 rounded text-left text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                                onClick={() => {
                                  handleLandmarkSelect({ label: lm.label, boneName: lm.boneName, position: { x: 0, y: 0, z: 0 } });
                                }}
                              >
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0 text-cyan-500/50" />
                                <span className="truncate">{stripSide(lm.label)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  className="w-full mt-2 text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => { setZoomToRegion('full_body'); setExpandedZoomRegion(null); }}
                >
                  Reset to Full Body
                </button>
              </div>
              );
            })()}

            {/* Clinical Highlights Legend */}
            {clinicalHighlights.length > 0 && !forceMode && (
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur rounded-lg px-3 py-2 z-10 max-w-[200px]">
                <p className="text-[10px] text-gray-300 uppercase tracking-wider mb-1.5 font-medium">Detected Regions</p>
                <div className="space-y-1">
                  {clinicalHighlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: HIGHLIGHT_COLORS[h.type].css, boxShadow: `0 0 6px ${HIGHLIGHT_COLORS[h.type].css}` }}
                      />
                      <span className="text-[11px] text-white truncate">{h.label}</span>
                      <span className="text-[9px] text-gray-400 ml-auto">{HIGHLIGHT_COLORS[h.type].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pain Marker List Panel */}
            {painMarkers.length > 0 && (
              <div className="absolute bottom-12 right-2 bg-black/80 backdrop-blur rounded-lg px-3 py-2 z-10 w-64 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-gray-300 uppercase tracking-wider font-medium">Pain Markers ({painMarkers.length})</p>
                  <button
                    className="text-[10px] text-red-400 hover:text-red-300"
                    onClick={() => { setPainMarkers([]); setEditingMarkerId(null); setMarkerDescription(''); setClinicalBubbleMarker(null); }}
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {painMarkers.map((m) => {
                    const typeColors: Record<string, { bg: string; shadow: string; label: string }> = {
                      point: { bg: 'bg-red-500', shadow: '#ff2222', label: 'Point' },
                      area: { bg: 'bg-orange-500', shadow: '#ff6600', label: 'Area' },
                      referred: { bg: 'bg-purple-500', shadow: '#9933ff', label: 'Referred' },
                      line: { bg: 'bg-pink-500', shadow: '#ff4488', label: 'Line' },
                    };
                    const tc = typeColors[m.type || 'point'] || typeColors.point;
                    return (
                    <div key={m.id} className="bg-white/5 rounded px-2 py-1.5">
                      <div className="flex items-center gap-2 group">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tc.bg}`} style={{ boxShadow: `0 0 6px ${tc.shadow}` }} />
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-[11px] text-white truncate block font-medium cursor-pointer hover:text-teal-300 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setClinicalBubbleMarker(m); setClinicalBubbleSeverity("moderate"); }}
                          >{m.anatomicalLabel}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400 uppercase">{tc.label}</span>
                            {m.type === 'referred' && m.referralTargetLabel && (
                              <span className="text-[9px] text-purple-300">→ {m.referralTargetLabel}</span>
                            )}
                            {m.type === 'line' && m.linePoints && (
                              <span className="text-[9px] text-pink-300">{m.linePoints.length + 1} pts</span>
                            )}
                            {m.type === 'area' && m.radius && (
                              <span className="text-[9px] text-orange-300">r={Math.round(m.radius * 100)}mm</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="text-teal-400/70 hover:text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Open clinical analysis"
                          onClick={(e) => { e.stopPropagation(); setClinicalBubbleMarker(m); }}
                        >
                          <Sparkles className="h-3 w-3" />
                        </button>
                        <button
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePainMarkerRemove(m.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {m.description && editingMarkerId !== m.id && (
                        <p className="text-[10px] text-gray-400 mt-1 ml-4 italic cursor-pointer hover:text-gray-300"
                          onClick={() => { setEditingMarkerId(m.id); setMarkerDescription(m.description || ''); }}
                        >
                          "{m.description}"
                        </p>
                      )}
                      {editingMarkerId === m.id ? (
                        <div className="mt-1.5 ml-4">
                          <input
                            type="text"
                            autoFocus
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                            placeholder="Describe the pain (e.g., sharp, dull, radiating...)"
                            value={markerDescription}
                            onChange={(e) => setMarkerDescription(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && markerDescription.trim() && !isStreaming) {
                                handlePainMarkerDescriptionSubmit(m.id, markerDescription);
                              }
                              if (e.key === 'Escape') {
                                setEditingMarkerId(null);
                                setMarkerDescription('');
                              }
                            }}
                          />
                          <div className="flex gap-1 mt-1">
                            <button
                              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] rounded px-2 py-0.5 disabled:opacity-50"
                              disabled={!markerDescription.trim() || isStreaming}
                              onClick={() => handlePainMarkerDescriptionSubmit(m.id, markerDescription)}
                            >
                              Send to Chat
                            </button>
                            <button
                              className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5"
                              onClick={() => { setEditingMarkerId(null); setMarkerDescription(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : !m.description && (
                        <button
                          className="text-[10px] text-teal-400 hover:text-teal-300 mt-1 ml-4"
                          onClick={() => { setEditingMarkerId(m.id); setMarkerDescription(''); }}
                        >
                          + Add description
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleAskAboutPainMarkers}
                  disabled={isStreaming}
                >
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Ask About All Areas
                </Button>
              </div>
            )}

            {/* Clinical Bubble */}
            {clinicalBubbleMarker && (
              <ClinicalBubble
                key={clinicalBubbleMarker.id}
                markerId={clinicalBubbleMarker.id}
                region={clinicalBubbleMarker.anatomicalLabel}
                markerType={clinicalBubbleMarker.type}
                position={{ x: 50, y: 15 }}
                onClose={() => { setClinicalBubbleMarker(null); setConnectionHighlights([]); setTestChainActive(null); }}
                onDeepDive={handleClinicalBubbleDeepDive}
                severity={clinicalBubbleSeverity}
                onSeverityChange={setClinicalBubbleSeverity}
                onDataLoaded={(mId, bubbleData, sev) => {
                  const marker = painMarkers.find(m => m.id === mId);
                  setClinicalBubbleResults(prev => ({
                    ...prev,
                    [mId]: { data: bubbleData, severity: sev, region: marker?.anatomicalLabel || marker?.nearestBone || '' }
                  }));
                }}
                onHighlightConnections={(regions) => setConnectionHighlights(regions)}
                onClearConnectionHighlights={() => setConnectionHighlights([])}
                onConnectionClick={(connRegion, label) => {
                  setZoomToRegion(connRegion);
                  const id = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  const newMarker: PainMarker = {
                    id,
                    type: 'point',
                    position: { x: 0, y: 0, z: 0 },
                    nearestBone: '',
                    anatomicalLabel: label,
                  };
                  setPainMarkers(prev => [...prev, newMarker]);
                  setClinicalBubbleMarker(newMarker);
                  setClinicalBubbleSeverity("moderate");
                }}
                onTestChain={(connection, originalRegion) => {
                  setTestChainActive({ connection, originalRegion });
                  setZoomToRegion(connection.region);
                  setPoseMode(true);
                  setForceMode(true);
                }}
                subjectiveHistory={clinicalBubbleMarker ? (painMarkers.find(m => m.id === clinicalBubbleMarker.id)?.subjectiveHistory || '') : ''}
                onSubjectiveHistoryChange={(mId, history) => {
                  setPainMarkers(prev => prev.map(m => m.id === mId ? { ...m, subjectiveHistory: history } : m));
                }}
              />
            )}

            {/* Test the Chain panel */}
            {testChainActive && (
              <div className="absolute bottom-2 left-2 right-2 bg-amber-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-amber-600/50 p-3 z-50 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-200">Test the Chain</span>
                  </div>
                  <button onClick={() => { setTestChainActive(null); setPoseMode(false); }} className="text-gray-400 hover:text-white p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-amber-300/80 bg-amber-500/20 px-2 py-0.5 rounded-full">{testChainActive.originalRegion}</span>
                  <ArrowRight className="h-3 w-3 text-amber-400/60" />
                  <span className="text-[10px] text-blue-300/80 bg-blue-500/20 px-2 py-0.5 rounded-full">{testChainActive.connection.label}</span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-relaxed mb-2">{testChainActive.connection.testPrompt}</p>
                <p className="text-[10px] text-amber-300/60">Pose mode is active — drag the skeleton joints to test this connection. Watch how changes in the {testChainActive.connection.label.toLowerCase()} affect the {testChainActive.originalRegion.toLowerCase()}.</p>
                <button
                  onClick={() => {
                    const prompt = `I'm examining a patient with ${testChainActive.originalRegion.toLowerCase()} pain. I tested the kinetic chain connection to the ${testChainActive.connection.label} (${testChainActive.connection.relationship}). The clinical reasoning is: ${testChainActive.connection.clinicalReason}. Based on the current skeleton posture, analyze the relationship between these two regions. What does the current posture tell us about the connection? What treatment approach would you recommend to address the ${testChainActive.connection.label}'s contribution to the ${testChainActive.originalRegion.toLowerCase()} pain?`;
                    handleSendMessage(prompt);
                    setTestChainActive(null);
                    setPoseMode(false);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white text-[11px] font-medium rounded-lg py-2 transition-all"
                >
                  <Send className="h-3 w-3" />
                  Send Posture to AI for Analysis
                </button>
              </div>
            )}

            {/* ROM Joint Slider Panel */}
            {selectedRomJoint && romMode && (
              <div className="absolute top-2 right-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2 z-20 w-72 max-h-[calc(100%-16px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-blue-300 uppercase tracking-wider font-medium">ROM Assessment</p>
                    <p className="text-[13px] text-white font-semibold">{selectedRomJoint.label}</p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={() => { setSelectedRomJoint(null); setRomValues({}); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedRomJoint.movements.map(movement => {
                    const isDeficitType = movement.id.includes('deficit') || movement.label.toLowerCase().includes('contracture') || movement.label.toLowerCase().includes('lag');
                    const val = romValues[movement.id] ?? (isDeficitType ? 0 : movement.normalRange[1]);
                    const maxRange = isDeficitType ? Math.max(movement.normalRange[1] * 6, 30) : Math.max(movement.normalRange[1], 10);
                    const restricted = isDeficitType ? val > movement.normalRange[1] : val < movement.normalRange[1];
                    const pct = isDeficitType
                      ? (maxRange > 0 ? Math.round(((maxRange - val) / maxRange) * 100) : 100)
                      : (maxRange > 0 ? Math.round((val / maxRange) * 100) : 100);
                    return (
                      <div key={movement.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-gray-300">{movement.label}</span>
                          <span className={`text-[12px] font-mono font-bold ${restricted ? 'text-amber-400' : 'text-green-400'}`}>
                            {val}{movement.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[val]}
                            min={0}
                            max={maxRange}
                            step={1}
                            onValueChange={([v]) => setRomValues(prev => ({ ...prev, [movement.id]: v }))}
                            className="flex-1"
                          />
                          <span className="text-[9px] text-gray-500 w-14 text-right">
                            {isDeficitType ? 'Accept:' : 'Normal:'} {movement.normalRange[1]}{movement.unit}
                          </span>
                        </div>
                        {restricted && (
                          <div className="mt-0.5 h-1 rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleRomSave}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Save Measurements
                  </Button>
                  <button
                    className="text-[10px] text-gray-400 hover:text-white px-2"
                    onClick={() => { setSelectedRomJoint(null); setRomValues({}); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ROM Measurements List */}
            {romMeasurements.length > 0 && romMode && !selectedRomJoint && (
              <div className="absolute bottom-12 right-2 bg-black/80 backdrop-blur rounded-lg px-3 py-2 z-10 w-72 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-blue-300 uppercase tracking-wider font-medium">ROM Findings ({romMeasurements.length})</p>
                  <button
                    className="text-[10px] text-red-400 hover:text-red-300"
                    onClick={() => setRomMeasurements([])}
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {romMeasurements.map((m, i) => {
                    const restricted = isRomRestricted(m);
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${restricted ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-gray-400">{m.jointLabel}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-white truncate">{m.movementLabel}</span>
                            <span className={`text-[11px] font-mono font-bold ${restricted ? 'text-amber-400' : 'text-green-400'}`}>
                              {m.measuredValue}{m.unit}
                            </span>
                            <span className="text-[9px] text-gray-500">/ {m.normalRange[1]}{m.unit}</span>
                          </div>
                        </div>
                        <button
                          className="text-gray-500 hover:text-red-400"
                          onClick={() => setRomMeasurements(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleRomSendToChat}
                  disabled={isStreaming}
                >
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Send ROM to Chat
                </Button>
              </div>
            )}

            {/* Skeleton controls bar */}
            <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 z-10 pointer-events-none [&>*]:pointer-events-auto">
              {painMarkerMode && (
                <div className="flex items-center gap-1 flex-wrap">
                  <div className="flex items-center bg-red-500/90 rounded-md overflow-hidden h-7">
                    {([
                      { type: 'point' as PainMarkerType, icon: '•', tip: 'Point' },
                      { type: 'area' as PainMarkerType, icon: '◉', tip: 'Area' },
                      { type: 'referred' as PainMarkerType, icon: '→', tip: 'Referred' },
                      { type: 'line' as PainMarkerType, icon: '⁓', tip: 'Line' },
                      { type: 'paint' as PainMarkerType, icon: '✎', tip: 'Paint' },
                    ]).map(({ type, icon, tip }) => (
                      <button
                        key={type}
                        title={tip}
                        className={`px-2 h-full text-xs font-bold transition-colors ${
                          activePainMarkerType === type
                            ? 'bg-white text-red-600'
                            : 'text-white/80 hover:text-white hover:bg-red-600'
                        }`}
                        onClick={() => {
                          setActivePainMarkerType(type);
                          const tips: Record<PainMarkerType, string> = {
                            point: "Click to place a point marker. Drag to reposition.",
                            area: "Click and drag to draw a pain area.",
                            referred: "Click origin, then click referral target.",
                            line: "Click to place points along path. Double-click to finish.",
                            paint: "Click and drag to free-draw symptom areas.",
                          };
                          toast({ title: `${tip} Mode`, description: tips[type] });
                        }}
                      >
                        <span className="text-sm">{icon}</span>
                        <span className="ml-0.5 text-[10px]">{tip}</span>
                      </button>
                    ))}
                  </div>
                  <select
                    value={activeSymptomType}
                    onChange={(e) => setActiveSymptomType(e.target.value as SymptomType)}
                    className="h-7 text-xs bg-gray-800/90 text-gray-200 border border-gray-600/50 rounded-md px-1.5 cursor-pointer max-w-[140px]"
                    title="Symptom Type"
                  >
                    {Object.entries(SYMPTOM_TYPES).map(([key, info]) => (
                      <option key={key} value={key} style={{ color: info.hexColor }}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-1 flex-wrap">
              <div className="relative flex items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`h-7 text-xs shadow-sm ${painMarkerMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                  onClick={() => {
                    const newMode = !painMarkerMode;
                    setPainMarkerMode(newMode);
                    if (newMode) {
                      setRomMode(false);
                      setPoseMode(false);
                      setCameraMode(false);
                      setCameraPoseActive(false);
                      setSelectedRomJoint(null);

                      const tips: Record<PainMarkerType, string> = {
                        point: "Click to place a point marker. Right-click to remove. Drag to reposition.",
                        area: "Click and drag to draw a pain area. Right-click to remove.",
                        referred: "Click to place origin, then click again for referral target. Right-click to cancel/remove.",
                        line: "Click to place points along the pain path. Double-click to finish. Right-click to cancel/remove.",
                        paint: "Click and drag to free-draw symptom areas on the body. Right-click to remove.",
                      };
                      toast({ title: "Pain Marker Mode", description: tips[activePainMarkerType] });
                    }
                  }}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {painMarkerMode ? 'Marking...' : 'Mark Pain'}
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${romMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !romMode;
                  setRomMode(newMode);
                  if (newMode) {
                    setPainMarkerMode(false);
                    setPoseMode(false);
                    setCameraMode(false);
                    setCameraPoseActive(false);
                    toast({ title: "ROM Measurement Mode", description: "Click on a highlighted joint to measure its range of motion." });
                  } else {
                    setSelectedRomJoint(null);
                    setRomValues({});
                  }
                }}
              >
                <Ruler className="h-3 w-3 mr-1" />
                {romMode ? 'Measuring...' : 'Measure ROM'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${poseMode ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !poseMode;
                  setPoseMode(newMode);
                  if (newMode) {
                    setPainMarkerMode(false);
                    setRomMode(false);
                    setCameraMode(false);
                    setCameraPoseActive(false);
                    setSelectedRomJoint(null);
                    toast({ title: "Pose Mode", description: "Click and drag limbs to adjust the skeleton pose. Double-click to reset a joint." });
                  }
                }}
              >
                <Hand className="h-3 w-3 mr-1" />
                {poseMode ? 'Posing...' : 'Pose'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${zoomToolMode ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !zoomToolMode;
                  setZoomToolMode(newMode);
                  if (newMode) {
                    setPainMarkerMode(false);
                    setRomMode(false);
                    setPoseMode(false);
                    setCameraMode(false);
                    setCameraPoseActive(false);
                    toast({ title: "Zoom & Landmark Tool", description: "Scroll to zoom into specific anatomical structures. Click on a labeled landmark to place a pain marker and get AI clinical analysis." });
                  }
                }}
              >
                <Search className="h-3 w-3 mr-1" />
                {zoomToolMode ? 'Zooming...' : 'Zoom'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${forceMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !forceMode;
                  setForceMode(newMode);
                  if (newMode) {
                    toast({ title: "Force Analysis", description: "Showing joint loading as % body weight. Adjust joints to see forces change." });
                  }
                }}
              >
                <Activity className="h-3 w-3 mr-1" />
                {forceMode ? 'Forces On' : 'Forces'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${muscleMode ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !muscleMode;
                  setMuscleMode(newMode);
                  if (newMode) {
                    toast({ title: "Muscle Analysis", description: "Showing muscle length, activation, tightness, and inhibition. Adjust posture to see muscle responses." });
                  }
                }}
              >
                <Dumbbell className="h-3 w-3 mr-1" />
                {muscleMode ? 'Muscles On' : 'Muscles'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${chainExplorerMode ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !chainExplorerMode;
                  setChainExplorerMode(newMode);
                  if (newMode) {
                    toast({ title: "Kinetic Chain Explorer", description: "Explore evidence-based kinetic chains. Select a chain to trace its pathway through the body." });
                  }
                }}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                {chainExplorerMode ? 'Chains On' : 'Chains'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${correlationMode ? 'bg-violet-500 text-white hover:bg-violet-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !correlationMode;
                  setCorrelationMode(newMode);
                  if (newMode) {
                    toast({ title: "Clinical Correlation", description: "Cross-system analysis active. Place pain markers to see correlated chains, muscles, forces, and root cause analysis." });
                  }
                }}
              >
                <Network className="h-3 w-3 mr-1" />
                {correlationMode ? 'Correlate On' : 'Correlate'}
              </Button>
              <div className="w-px h-5 bg-gray-600/50 mx-0.5" />
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showChainVisualization ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !showChainVisualization;
                  setShowChainVisualization(newMode);
                  if (newMode) {
                    toast({ title: "Body Tension Visualization", description: "Showing myofascial chain tension lines on the skeleton. Adjust posture to see tension changes." });
                  }
                }}
              >
                <Activity className="h-3 w-3 mr-1" />
                {showChainVisualization ? 'Tension On' : 'Tension'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showScarPanel ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !showScarPanel;
                  setShowScarPanel(newMode);
                  if (newMode) {
                    toast({ title: "Scar Tissue Mapping", description: "Document surgical scars and adhesion bands on the 3D model. Click placement buttons then click the skeleton." });
                  }
                }}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Scars
                {scarMarkers.length > 0 && (
                  <span className="ml-1 bg-pink-400 text-white text-[9px] rounded-full px-1 leading-tight">{scarMarkers.length}</span>
                )}
              </Button>
              <div className="w-px h-5 bg-gray-600/50 mx-0.5" />
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50 shadow-sm"
                onClick={() => setShowJointControls(!showJointControls)}
              >
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                Controls
              </Button>
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`h-7 text-xs shadow-sm ${showEnvironmentPicker ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                  onClick={() => setShowEnvironmentPicker(!showEnvironmentPicker)}
                >
                  <Palette className="h-3 w-3 mr-1" />
                  Scene
                </Button>
                {showEnvironmentPicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl p-3 w-56 z-50 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold text-white">Virtual Environment</span>
                      <button onClick={() => setShowEnvironmentPicker(false)} className="text-gray-400 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ENVIRONMENT_PRESETS.map(env => (
                        <button
                          key={env.id}
                          onClick={() => {
                            setEnvironmentPreset(env.id);
                            setShowEnvironmentPicker(false);
                          }}
                          className={`group rounded-lg overflow-hidden border transition-all ${
                            environmentPreset === env.id
                              ? 'border-indigo-500 ring-1 ring-indigo-500/40'
                              : 'border-gray-700/50 hover:border-gray-600'
                          }`}
                        >
                          <div
                            className="h-10 w-full"
                            style={{ background: env.thumbnail }}
                          />
                          <div className={`px-2 py-1.5 ${environmentPreset === env.id ? 'bg-indigo-500/15' : 'bg-gray-800/80'}`}>
                            <div className={`text-[10px] font-medium truncate ${environmentPreset === env.id ? 'text-indigo-300' : 'text-gray-300 group-hover:text-white'}`}>
                              {env.name}
                            </div>
                            <div className="text-[8px] text-gray-500 truncate">{env.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50 shadow-sm"
                onClick={() => { setZoomToRegion('full_body'); }}
              >
                Reset View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50 shadow-sm"
                onClick={() => {
                  setModelConfig({ ...DEFAULT_MODEL_CONFIG });
                  setPainMarkers([]);
                  toast({ title: "Skeleton Reset", description: "All joints and pain markers cleared." });
                }}
              >
                <Bone className="h-3 w-3 mr-1" />
                Reset Skeleton
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-sm"
                onClick={handleAnalyzeSkeleton}
                disabled={isStreaming}
              >
                <Scan className="h-3 w-3 mr-1" />
                Analyze Skeleton
              </Button>
              </div>
            </div>

            {showChainVisualization && (
              <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[280px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-[11px] font-semibold text-white">Body Tension</span>
                  </div>
                  <button onClick={() => { setShowChainVisualization(false); setSelectedChainNode(null); }} className="text-gray-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className={`mb-3 p-2 rounded-lg border ${
                  wholeBodyScore.level === 'critical' ? 'border-red-500/50 bg-red-500/10' :
                  wholeBodyScore.level === 'high' ? 'border-orange-500/50 bg-orange-500/10' :
                  wholeBodyScore.level === 'moderate' ? 'border-yellow-500/50 bg-yellow-500/10' :
                  'border-green-500/50 bg-green-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-gray-300">Whole-Body Tension</span>
                    <span className={`text-sm font-bold ${
                      wholeBodyScore.level === 'critical' ? 'text-red-400' :
                      wholeBodyScore.level === 'high' ? 'text-orange-400' :
                      wholeBodyScore.level === 'moderate' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{wholeBodyScore.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${
                      wholeBodyScore.level === 'critical' ? 'bg-red-500' :
                      wholeBodyScore.level === 'high' ? 'bg-orange-500' :
                      wholeBodyScore.level === 'moderate' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} style={{ width: `${wholeBodyScore.score}%` }} />
                  </div>
                </div>

                <div className="flex gap-1 mb-2">
                  <button
                    className={`flex-1 px-2 py-1 rounded text-[8px] font-medium transition-colors ${showPropagation ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
                    onClick={() => setShowPropagation(prev => !prev)}
                  >
                    <Zap className="h-2.5 w-2.5 inline mr-0.5" />
                    Propagation
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 rounded text-[8px] font-medium transition-colors ${showChainRecommendations ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
                    onClick={() => setShowChainRecommendations(prev => !prev)}
                  >
                    <Lightbulb className="h-2.5 w-2.5 inline mr-0.5" />
                    Advice
                  </button>
                </div>

                {painAffectedChainIds.length > 0 && (
                  <div className="mb-2 p-1.5 rounded border border-red-500/30 bg-red-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3 text-red-400" />
                      <span className="text-[9px] font-medium text-red-300">{painAffectedChainIds.length} chain{painAffectedChainIds.length !== 1 ? 's' : ''} through pain areas</span>
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {painAffectedChainIds.map(cid => {
                        const chain = MYOFASCIAL_CHAINS.find(c => c.id === cid);
                        return chain ? (
                          <span key={cid} className="text-[7px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                            {chain.name.replace(/ \([LR]\)$/, '')}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-medium">Myofascial Chains</span>
                  {MYOFASCIAL_CHAINS.map(chain => {
                    const effect = chainEffects.find(e => e.chainId === chain.id);
                    const isActive = activeChainIds.includes(chain.id);
                    const isPainAffected = painAffectedChainIds.includes(chain.id);
                    return (
                      <button
                        key={chain.id}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors ${isPainAffected ? 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/20' : isActive ? 'bg-white/10 hover:bg-white/15' : 'bg-white/3 hover:bg-white/8 opacity-50'}`}
                        onClick={() => setActiveChainIds(prev => prev.includes(chain.id) ? prev.filter(id => id !== chain.id) : [...prev, chain.id])}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isPainAffected ? '#ff4444' : chain.color }} />
                          <span className="text-[9px] text-gray-200">{chain.name}</span>
                          {isPainAffected && <MapPin className="h-2.5 w-2.5 text-red-400" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {showPropagation && effect && (() => {
                            const chainMuscles = chain.links.map(l => l.muscleId);
                            const totalProp = chainMuscles.reduce((sum, mid) => sum + (propagationDeltas[mid] ?? 0), 0);
                            if (Math.abs(totalProp) < 1) return null;
                            return (
                              <span className={`text-[7px] ${totalProp > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                                {totalProp > 0 ? '+' : ''}{Math.round(totalProp)}
                              </span>
                            );
                          })()}
                          {effect && (
                            <span className={`text-[8px] font-medium ${
                              effect.avgTension > 70 || effect.avgTension < 30 ? 'text-red-400' :
                              effect.avgTension > 60 || effect.avgTension < 40 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>{Math.round(effect.avgTension)}%</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedChainNode && selectedNodeDetails && (
                  <div className="mt-2 p-2 rounded-lg border border-teal-500/30 bg-teal-500/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-teal-300">{selectedNodeDetails.state.label}</span>
                      <button onClick={() => setSelectedChainNode(null)} className="text-gray-400 hover:text-white">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mb-1.5">
                      <div className="bg-black/30 rounded p-1">
                        <span className="text-[7px] text-gray-400 block">Tension</span>
                        <span className={`text-[10px] font-bold ${selectedNodeDetails.state.tension > 65 ? 'text-red-400' : selectedNodeDetails.state.tension > 55 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {Math.round(selectedNodeDetails.state.tension)}%
                        </span>
                      </div>
                      <div className="bg-black/30 rounded p-1">
                        <span className="text-[7px] text-gray-400 block">Activation</span>
                        <span className="text-[10px] font-bold text-blue-300">{selectedNodeDetails.state.activation}</span>
                      </div>
                      <div className="bg-black/30 rounded p-1">
                        <span className="text-[7px] text-gray-400 block">State</span>
                        <span className={`text-[10px] font-bold ${selectedNodeDetails.state.state === 'shortened' ? 'text-orange-400' : selectedNodeDetails.state.state === 'lengthened' ? 'text-blue-400' : 'text-green-400'}`}>
                          {selectedNodeDetails.state.state}
                        </span>
                      </div>
                      {selectedNodeDetails.propState && Math.abs(selectedNodeDetails.propState.totalChainTension) > 0.5 && (
                        <div className="bg-black/30 rounded p-1">
                          <span className="text-[7px] text-gray-400 block">Propagation</span>
                          <span className={`text-[10px] font-bold ${selectedNodeDetails.propState.totalChainTension > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                            {selectedNodeDetails.propState.totalChainTension > 0 ? '+' : ''}{Math.round(selectedNodeDetails.propState.totalChainTension)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] text-gray-300 mb-1.5">{selectedNodeDetails.state.description}</p>
                    <div className="mb-2 p-1.5 rounded border border-amber-500/30 bg-amber-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-medium text-amber-300">Introduce Tension</span>
                        {manualChainTensions[selectedChainNode.muscleId] !== undefined && (
                          <button
                            className="text-[7px] text-red-400 hover:text-red-300 underline"
                            onClick={() => setManualChainTensions(prev => {
                              const next = { ...prev };
                              delete next[selectedChainNode.muscleId];
                              return next;
                            })}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={manualChainTensions[selectedChainNode.muscleId] ?? Math.round(selectedNodeDetails.state.tension)}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setManualChainTensions(prev => ({ ...prev, [selectedChainNode.muscleId]: val }));
                          if (!showPropagation) setShowPropagation(true);
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[7px] text-gray-500">Relaxed 0%</span>
                        <span className={`text-[8px] font-bold ${
                          (manualChainTensions[selectedChainNode.muscleId] ?? selectedNodeDetails.state.tension) > 70 ? 'text-red-400' :
                          (manualChainTensions[selectedChainNode.muscleId] ?? selectedNodeDetails.state.tension) > 55 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {manualChainTensions[selectedChainNode.muscleId] ?? Math.round(selectedNodeDetails.state.tension)}%
                        </span>
                        <span className="text-[7px] text-gray-500">100% Max</span>
                      </div>
                    </div>
                    {selectedNodeDetails.membership.length > 0 && (
                      <div>
                        <span className="text-[7px] text-gray-400">Chains through this muscle:</span>
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {selectedNodeDetails.membership.map(c => (
                            <span key={c.id} className="text-[7px] px-1 py-0.5 rounded" style={{ backgroundColor: c.color + '30', color: c.color }}>
                              {c.name.replace(/ \([LR]\)$/, '')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedNodeDetails.propState && selectedNodeDetails.propState.chainEffects.length > 0 && (
                      <div className="mt-1.5">
                        <span className="text-[7px] text-gray-400">Tension sources:</span>
                        {selectedNodeDetails.propState.chainEffects.slice(0, 3).map((eff, i) => (
                          <div key={i} className="flex items-center justify-between mt-0.5">
                            <span className="text-[7px] text-gray-300">via {eff.chainName.replace(/ \([LR]\)$/, '')} from {eff.sourceMuscle}</span>
                            <span className={`text-[7px] font-medium ${eff.tensionDelta > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                              {eff.tensionDelta > 0 ? '+' : ''}{eff.tensionDelta.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showChainRecommendations && chainRecommendations.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-blue-400" />
                      Clinical Recommendations
                    </span>
                    {chainRecommendations.slice(0, 4).map(rec => (
                      <Collapsible key={rec.chainId}>
                        <CollapsibleTrigger className="w-full">
                          <div className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                            rec.level === 'critical' ? 'bg-red-500/15 border border-red-500/30' :
                            rec.level === 'high' ? 'bg-orange-500/15 border border-orange-500/30' :
                            'bg-yellow-500/10 border border-yellow-500/20'
                          }`}>
                            <span className="text-[8px] text-gray-200">{rec.chainName.replace(/ \([LR]\)$/, '')}</span>
                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${
                              rec.level === 'critical' ? 'bg-red-500/30 text-red-300' :
                              rec.level === 'high' ? 'bg-orange-500/30 text-orange-300' :
                              'bg-yellow-500/20 text-yellow-300'
                            }`}>{rec.level}</span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-2 py-1.5 bg-white/5 rounded-b">
                            <p className="text-[7px] text-gray-400 mb-1">{rec.description}</p>
                            <div className="mb-1">
                              <span className="text-[7px] font-medium text-green-400">Stretches:</span>
                              {rec.stretches.map((s, i) => (
                                <span key={i} className="text-[7px] text-gray-300 block ml-1">- {s}</span>
                              ))}
                            </div>
                            <div>
                              <span className="text-[7px] font-medium text-blue-400">Treatment:</span>
                              {rec.treatments.map((t, i) => (
                                <span key={i} className="text-[7px] text-gray-300 block ml-1">- {t}</span>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}

                {showChainRecommendations && chainRecommendations.length === 0 && (
                  <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                    <span className="text-[8px] text-green-300">All chains within normal tension range. No specific interventions needed.</span>
                  </div>
                )}

                {Object.keys(manualChainTensions).length > 0 && (
                  <div className="mt-2 flex items-center justify-between p-1.5 rounded border border-amber-500/20 bg-amber-500/10">
                    <span className="text-[8px] text-amber-300">{Object.keys(manualChainTensions).length} manual tension{Object.keys(manualChainTensions).length !== 1 ? 's' : ''} active</span>
                    <button
                      className="text-[7px] text-red-400 hover:text-red-300 underline"
                      onClick={() => setManualChainTensions({})}
                    >
                      Reset All
                    </button>
                  </div>
                )}

                <div className="mt-2 text-[7px] text-gray-500 text-center">
                  Click chain nodes on skeleton to inspect & inject tension
                </div>
              </div>
            )}

            {showScarPanel && (
              <div className="absolute top-2 right-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[280px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-pink-400" />
                    <span className="text-[11px] font-semibold text-white">Scar Tissue Mapping</span>
                  </div>
                  <button onClick={() => setShowScarPanel(false)} className="text-gray-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {scarPlacementMode && (
                  <div className="mb-2 p-2 rounded-lg bg-pink-500/20 border border-pink-500/30 text-[9px] text-pink-300">
                    Click on the skeleton to place a {SCAR_TYPES[scarPlacementMode].label.toLowerCase()}
                    <button className="ml-2 text-pink-400 hover:text-white underline" onClick={() => setScarPlacementMode(null)}>Cancel</button>
                  </div>
                )}
                {adhesionPlacementStep !== 'idle' && (
                  <div className="mb-2 p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-[9px] text-red-300">
                    {adhesionPlacementStep === 'start' ? 'Click skeleton for adhesion START point' : 'Click skeleton for adhesion END point'}
                    <button className="ml-2 text-red-400 hover:text-white underline" onClick={() => { setAdhesionPlacementStep('idle'); setPendingAdhesionStart(null); }}>Cancel</button>
                  </div>
                )}

                <div className="mb-3">
                  <span className="text-[9px] text-gray-400 font-medium">Place Markers</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Object.entries(SCAR_TYPES) as [ScarType, typeof SCAR_TYPES[ScarType]][]).map(([type, info]) => (
                      <Button
                        key={type}
                        variant="secondary"
                        size="sm"
                        className={`h-6 text-[9px] ${scarPlacementMode === type ? 'bg-pink-500 text-white' : 'bg-gray-800/80 text-gray-300 border border-gray-600/50'}`}
                        onClick={() => setScarPlacementMode(scarPlacementMode === type ? null : type)}
                      >
                        {info.label}
                      </Button>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      className={`h-6 text-[9px] ${adhesionPlacementStep !== 'idle' ? 'bg-red-500 text-white' : 'bg-gray-800/80 text-gray-300 border border-gray-600/50'}`}
                      onClick={() => {
                        if (adhesionPlacementStep !== 'idle') {
                          setAdhesionPlacementStep('idle');
                          setPendingAdhesionStart(null);
                        } else {
                          setAdhesionPlacementStep('start');
                          setScarPlacementMode(null);
                        }
                      }}
                    >
                      Adhesion Band
                    </Button>
                  </div>
                </div>

                {scarMarkers.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[9px] text-gray-400 font-medium">Scars ({scarMarkers.length})</span>
                    <div className="space-y-1 mt-1">
                      {scarMarkers.map(scar => (
                        <div key={scar.id} className={`p-1.5 rounded border transition-colors cursor-pointer ${editingScar === scar.id ? 'border-pink-500/50 bg-pink-500/10' : 'border-gray-700/50 bg-white/5 hover:bg-white/10'}`}>
                          <div className="flex items-center justify-between" onClick={() => setEditingScar(editingScar === scar.id ? null : scar.id)}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCAR_TYPES[scar.type].color }} />
                              <span className="text-[9px] text-gray-200">{SCAR_TYPES[scar.type].label}</span>
                              <span className="text-[8px] text-gray-500">{scar.anatomicalLabel}</span>
                            </div>
                            <button className="text-gray-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setScarMarkers(prev => prev.filter(s => s.id !== scar.id)); if (editingScar === scar.id) setEditingScar(null); }}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          {editingScar === scar.id && (
                            <div className="mt-2 space-y-2 border-t border-gray-700/50 pt-2">
                              <div>
                                <label className="text-[8px] text-gray-400">Severity</label>
                                <Slider value={[scar.severity]} min={1} max={5} step={1} onValueChange={([v]) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, severity: v } : s))} className="mt-0.5" />
                                <span className="text-[8px] text-gray-500">{SCAR_SEVERITY_LABELS[scar.severity as keyof typeof SCAR_SEVERITY_LABELS]?.label}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <div>
                                  <label className="text-[8px] text-gray-400">Age</label>
                                  <select value={scar.age} onChange={(e) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, age: e.target.value as ScarAge } : s))} className="w-full bg-gray-800 border border-gray-700 rounded text-[9px] text-gray-200 px-1 py-0.5">
                                    <option value="acute">Acute</option>
                                    <option value="subacute">Subacute</option>
                                    <option value="chronic">Chronic</option>
                                    <option value="mature">Mature</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[8px] text-gray-400">Mobility</label>
                                  <select value={scar.mobility} onChange={(e) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, mobility: e.target.value as ScarMobility } : s))} className="w-full bg-gray-800 border border-gray-700 rounded text-[9px] text-gray-200 px-1 py-0.5">
                                    <option value="mobile">Mobile</option>
                                    <option value="tethered">Tethered</option>
                                    <option value="fixed">Fixed</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-400">Affected Layers</label>
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                  {(Object.keys(TISSUE_LAYERS) as TissueLayer[]).map(layer => (
                                    <button key={layer} className={`text-[7px] px-1 py-0.5 rounded ${scar.affectedLayers.includes(layer) ? 'bg-pink-500/30 text-pink-300' : 'bg-white/5 text-gray-500'}`} onClick={() => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, affectedLayers: s.affectedLayers.includes(layer) ? s.affectedLayers.filter(l => l !== layer) : [...s.affectedLayers, layer] } : s))}>
                                      {TISSUE_LAYERS[layer].label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-400">Pain on Palpation (0-10)</label>
                                <Slider value={[scar.painOnPalpation]} min={0} max={10} step={1} onValueChange={([v]) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, painOnPalpation: v } : s))} className="mt-0.5" />
                                <span className="text-[8px] text-gray-500">{scar.painOnPalpation}/10</span>
                              </div>
                              {(() => {
                                const impact = getScarImpact(scar);
                                return impact.affectedChains.length > 0 || impact.restrictedMovements.length > 0 ? (
                                  <div className="p-1.5 rounded bg-yellow-500/10 border border-yellow-500/30">
                                    <span className="text-[8px] font-medium text-yellow-400">Clinical Impact</span>
                                    {impact.affectedChains.length > 0 && <p className="text-[7px] text-yellow-300 mt-0.5">Chains: {impact.affectedChains.map(c => c.chain.name).join(', ')}</p>}
                                    {impact.restrictedMovements.length > 0 && <p className="text-[7px] text-yellow-300 mt-0.5">Restrictions: {impact.restrictedMovements.join(', ')}</p>}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adhesionBands.length > 0 && (
                  <div>
                    <span className="text-[9px] text-gray-400 font-medium">Adhesion Bands ({adhesionBands.length})</span>
                    <div className="space-y-1 mt-1">
                      {adhesionBands.map(band => (
                        <div key={band.id} className="p-1.5 rounded border border-gray-700/50 bg-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-gray-200">{band.startBone} → {band.endBone}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[8px] text-gray-500">Tension: {band.tensionLevel}%</span>
                              <span className="text-[8px] text-gray-500">Depth: {band.depth}</span>
                            </div>
                          </div>
                          <button className="text-gray-500 hover:text-red-400" onClick={() => setAdhesionBands(prev => prev.filter(b => b.id !== band.id))}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showShoulderAssessment && (
              <div className="absolute top-2 right-2 z-30 w-80 h-[calc(100%-50px)]">
                <ShoulderAssessmentPanel
                  modelConfig={modelConfig}
                  side={shoulderAssessmentSide}
                  onClose={() => setShowShoulderAssessment(false)}
                  onSendToChat={(msg) => {
                    setShowShoulderAssessment(false);
                    handleSendMessage(msg);
                  }}
                />
              </div>
            )}

            {voiceSessionActive && (
              <div className={`absolute bottom-12 left-2 z-40 animate-in slide-in-from-bottom-2 duration-200 ${clinicalReasoningOpen ? 'right-[330px]' : 'right-2'} transition-all`}>
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden">
                  <button
                    onClick={() => setVoicePanelOpen(!voicePanelOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="animate-pulse h-2 w-2 rounded-full bg-purple-400" />
                      <Radio className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-300">Voice Extraction</span>
                      {voiceProcessing && <Loader2 className="h-3 w-3 animate-spin text-purple-400" />}
                      {voiceFindings.length > 0 && (
                        <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">{voiceFindings.length} findings</span>
                      )}
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${voicePanelOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {voicePanelOpen && (
                    <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                      {voiceTranscript && (
                        <div className="bg-gray-800/60 rounded-lg p-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Transcript</p>
                          <p className="text-[11px] text-gray-300 leading-relaxed max-h-16 overflow-y-auto">{voiceTranscript}</p>
                        </div>
                      )}

                      {!voiceTranscript && (
                        <div className="flex items-center justify-center py-3 gap-2">
                          <span className="animate-pulse h-2 w-2 rounded-full bg-purple-400" />
                          <span className="text-[11px] text-gray-400">Listening...</span>
                        </div>
                      )}

                      {voiceFindings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Applied Findings</p>
                          {voiceFindings.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {f.type === 'pain' && <MapPin className="h-3 w-3 text-red-400 flex-shrink-0" />}
                                {f.type === 'posture' && <SlidersHorizontal className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                                {f.type === 'diagnosis' && <Stethoscope className="h-3 w-3 text-teal-400 flex-shrink-0" />}
                                {f.type === 'redFlag' && <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                                <span className="text-[10px] text-gray-300 truncate">{f.label}</span>
                                {f.severity && <span className="text-[9px] text-gray-500">({f.severity}/10)</span>}
                              </div>
                              <button
                                onClick={() => undoVoiceFinding(f.id)}
                                className="text-gray-500 hover:text-red-400 ml-1 flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <BiomechanicsHUD
              forceAnalysis={hudForceAnalysis}
              weightDistribution={hudWeightDistribution}
              muscleAnalysis={hudMuscleAnalysis}
              chainIntegrityScores={hudChainIntegrity}
              onOpenForceOverlay={() => { setForceMode(true); }}
              onOpenMuscleOverlay={() => { setMuscleMode(true); }}
              onOpenChainExplorer={() => { setChainExplorerMode(true); setChainIntegrityMode(true); }}
            />

            {(liveTreatmentPriorities.targets.length > 0 || predictedPainSpots.length > 0) && (
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
                {liveTreatmentPriorities.targets.length > 0 && (
                  <button
                    onClick={() => setShowTreatmentOverlay(prev => !prev)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      showTreatmentOverlay
                        ? 'bg-teal-500/30 ring-1 ring-teal-500/50 hover:bg-teal-500/40'
                        : 'bg-gray-700/50 ring-1 ring-gray-600/50 hover:bg-gray-600/50'
                    }`}
                    title={showTreatmentOverlay ? 'Hide treatment overlay' : 'Show treatment overlay'}
                  >
                    <Pill className={`h-3.5 w-3.5 ${showTreatmentOverlay ? 'text-teal-300' : 'text-gray-400'}`} />
                  </button>
                )}
                {predictedPainSpots.length > 0 && (
                  <button
                    onClick={() => setShowPredictedPain(prev => !prev)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      showPredictedPain
                        ? 'bg-amber-500/30 ring-1 ring-amber-500/50 hover:bg-amber-500/40'
                        : 'bg-gray-700/50 ring-1 ring-gray-600/50 hover:bg-gray-600/50'
                    }`}
                    title={showPredictedPain ? 'Hide predicted pain spots' : 'Show predicted pain spots'}
                  >
                    <AlertTriangle className={`h-3.5 w-3.5 ${showPredictedPain ? 'text-amber-300' : 'text-gray-400'}`} />
                  </button>
                )}
              </div>
            )}

            <TreatmentOverlayBridge
              treatmentPriorities={liveTreatmentPriorities}
              positionsRef={boneScreenPositionsRef}
              containerWidth={skeletonContainerSize.width}
              containerHeight={skeletonContainerSize.height}
              visible={showTreatmentOverlay && liveTreatmentPriorities.targets.length > 0}
              predictedPainSpots={predictedPainSpots}
              showPredictedPain={showPredictedPain && predictedPainSpots.length > 0}
            />

          </div>
          </div>

      {/* Conversation History Sidebar - floating overlay inside skeleton */}
      <div className={`absolute top-0 left-0 h-full z-30 transition-all duration-300 ${sidebarOpen ? 'w-[260px]' : 'w-0'} overflow-hidden`}>
        <div className="w-[260px] h-full bg-black/90 backdrop-blur-md border-r border-white/10 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-br from-teal-500 to-teal-600 rounded">
                <Stethoscope className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-white text-xs">History</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-2">
            <Button onClick={handleNewConversation} className="w-full bg-teal-600 hover:bg-teal-700 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Consultation
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              {loadingConversations ? (
                <>
                  <Skeleton className="h-10 w-full bg-white/10" />
                  <Skeleton className="h-10 w-full bg-white/10" />
                </>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageCircle className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">No consultations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                      selectedConversationId === conv.id ? 'bg-teal-500/20 border border-teal-500/30' : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">{conv.title}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 absolute right-1 text-gray-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation?")) {
                          deleteConversationMutation.mutate(conv.id);
                        }
                      }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel - Chat & Treatment tabs */}
      <div className={`absolute top-0 right-0 h-full z-30 transition-all duration-300 ${chatPanelOpen ? 'w-[380px]' : 'w-0'} overflow-hidden`}>
        <div className="w-[380px] h-full bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 border-b bg-white">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelTab === 'chat' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setRightPanelTab('chat')}
              >
                <MessageCircle className="h-3 w-3" />
                Chat
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelTab === 'treatment' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setRightPanelTab('treatment')}
              >
                <Stethoscope className="h-3 w-3" />
                Treatment
              </button>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatPanelOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Treatment Panel */}
          {rightPanelTab === 'treatment' && (
            <ScrollArea className="flex-1">
              <div className="p-3">
                {treatmentPlan ? (
                  <div className="space-y-3">
                    {/* Clinical Reasoning Header */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-lg p-3 border border-violet-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-violet-500 rounded">
                          <Brain className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-violet-900 text-xs">Clinical Reasoning</span>
                      </div>
                      <p className="text-[11px] text-gray-700 leading-relaxed mb-2">{treatmentPlan.clinicalReasoning.summary}</p>
                      <div className="bg-white/70 rounded px-2 py-1.5 mb-2">
                        <span className="text-[10px] font-semibold text-violet-800">Primary Diagnosis</span>
                        <p className="text-[11px] text-gray-800 font-medium">{treatmentPlan.clinicalReasoning.primaryDiagnosis}</p>
                      </div>
                      {treatmentPlan.clinicalReasoning.differentials.length > 0 && (
                        <div className="mb-2">
                          <span className="text-[10px] font-semibold text-gray-600">Differential Diagnoses</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {treatmentPlan.clinicalReasoning.differentials.map((d, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/80 text-gray-600 border border-gray-200">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {treatmentPlan.clinicalReasoning.aiDifferentials.length > 0 && (
                        <div className="mb-2">
                          <button className="text-[10px] text-amber-600 font-medium flex items-center gap-1" onClick={() => setExpandedTreatmentSection(prev => prev === 'ai_ddx' ? null : 'ai_ddx')}>
                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                            AI Differential Diagnoses ({treatmentPlan.clinicalReasoning.aiDifferentials.length})
                            <ChevronDown className={`h-2 w-2 ml-1 transition-transform ${expandedTreatmentSection === 'ai_ddx' ? '' : '-rotate-90'}`} />
                          </button>
                          {expandedTreatmentSection === 'ai_ddx' && (
                            <div className="mt-1 space-y-1 ml-3">
                              {treatmentPlan.clinicalReasoning.aiDifferentials.map((ad, i) => (
                                <div key={i} className="bg-amber-50/60 rounded px-2 py-1.5 border-l-2 border-amber-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-amber-800">{ad.name}</span>
                                    <span className={`text-[7px] px-1 py-0.5 rounded ${ad.likelihood === 'high' ? 'bg-red-100 text-red-600' : ad.likelihood === 'moderate' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>{ad.likelihood}</span>
                                  </div>
                                  <p className="text-[8px] text-gray-600 mt-0.5">{ad.reasoning}</p>
                                  <span className="text-[7px] text-amber-500 mt-0.5 block">Source: AI Clinical Bubble — {ad.sourceRegion}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <button className="text-[10px] text-violet-600 font-medium flex items-center gap-1" onClick={() => setExpandedTreatmentSection(prev => prev === 'findings' ? null : 'findings')}>
                        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expandedTreatmentSection === 'findings' ? '' : '-rotate-90'}`} />
                        Key Findings ({treatmentPlan.clinicalReasoning.keyFindings.length})
                      </button>
                      {expandedTreatmentSection === 'findings' && (
                        <div className="mt-1 space-y-1 ml-3">
                          {treatmentPlan.clinicalReasoning.keyFindings.map((kf, i) => (
                            <div key={i} className="bg-white/60 rounded px-2 py-1 border-l-2 border-violet-300">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 text-violet-600">{kf.source}</span>
                                <span className="text-[10px] text-gray-800 font-medium">{kf.finding}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 mt-0.5">{kf.significance}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <button className="text-[10px] text-violet-600 font-medium flex items-center gap-1 mt-1" onClick={() => setExpandedTreatmentSection(prev => prev === 'mechanism' ? null : 'mechanism')}>
                        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expandedTreatmentSection === 'mechanism' ? '' : '-rotate-90'}`} />
                        Mechanism & Prognosis
                      </button>
                      {expandedTreatmentSection === 'mechanism' && (
                        <div className="mt-1 ml-3 space-y-1.5">
                          <div className="bg-white/60 rounded px-2 py-1.5">
                            <span className="text-[9px] font-semibold text-gray-600">Mechanism</span>
                            <p className="text-[10px] text-gray-700 mt-0.5">{treatmentPlan.clinicalReasoning.mechanismOfInjury}</p>
                          </div>
                          <div className="bg-white/60 rounded px-2 py-1.5">
                            <span className="text-[9px] font-semibold text-gray-600">Prognostic Factors</span>
                            <div className="mt-0.5 space-y-0.5">
                              {treatmentPlan.clinicalReasoning.prognosticFactors.map((pf, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${pf.impact === 'positive' ? 'bg-green-500' : pf.impact === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                  <span className="text-[9px] text-gray-600">{pf.factor}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline Overview */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-700">Expected Timeline</span>
                        <span className="text-[10px] font-bold text-violet-600">{treatmentPlan.overallTimeline}</span>
                      </div>
                      <div className="flex gap-0.5 mt-1.5">
                        {treatmentPlan.phases.map((p, i) => (
                          <div key={i} className="flex-1">
                            <div className={`h-1.5 rounded-full ${p.phase === 'acute' ? 'bg-red-400' : p.phase === 'subacute' ? 'bg-orange-400' : 'bg-green-400'}`} />
                            <span className="text-[7px] text-gray-500 mt-0.5 block">{p.timeframe}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phase Blocks */}
                    {treatmentPlan.phases.map((phase) => {
                      const isExpanded = expandedPhase === phase.phase;
                      const phaseColor = phase.phase === 'acute' ? { bg: 'from-red-50 to-orange-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700', icon: 'bg-red-500' } : phase.phase === 'subacute' ? { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', icon: 'bg-orange-500' } : { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-700', icon: 'bg-green-500' };
                      return (
                        <div key={phase.phase} className={`rounded-lg border ${phaseColor.border} overflow-hidden`}>
                          <button
                            className={`w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r ${phaseColor.bg} text-left`}
                            onClick={() => setExpandedPhase(prev => prev === phase.phase ? null : phase.phase)}
                          >
                            <div className={`w-5 h-5 rounded-full ${phaseColor.icon} flex items-center justify-center`}>
                              <span className="text-[8px] font-bold text-white">{phase.phase === 'acute' ? '1' : phase.phase === 'subacute' ? '2' : '3'}</span>
                            </div>
                            <div className="flex-1">
                              <span className={`text-[11px] font-semibold ${phaseColor.text}`}>{phase.label}</span>
                              <span className={`text-[9px] ml-2 px-1.5 py-0.5 rounded ${phaseColor.badge}`}>{phase.timeframe}</span>
                            </div>
                            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>

                          {isExpanded && (
                            <div className="px-3 py-2 space-y-2 bg-white">
                              {/* Goals */}
                              <div>
                                <span className="text-[10px] font-semibold text-gray-700 flex items-center gap-1"><Target className="h-2.5 w-2.5 text-teal-500" /> Goals</span>
                                <div className="mt-0.5 space-y-0.5 ml-3.5">
                                  {phase.goals.map((g, gi) => (
                                    <div key={gi} className="flex items-start gap-1">
                                      <Check className="h-2.5 w-2.5 text-teal-500 flex-shrink-0 mt-0.5" />
                                      <span className="text-[9px] text-gray-600">{g}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Manual Therapy */}
                              {phase.manualTherapy.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-gray-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `mt_${phase.phase}` ? null : `mt_${phase.phase}`)}>
                                    <Activity className="h-2.5 w-2.5 text-blue-500" />
                                    Manual Therapy ({phase.manualTherapy.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `mt_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `mt_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.manualTherapy.map((mt, mi) => (
                                        <div key={mi} className="bg-blue-50/50 rounded-lg px-2.5 py-2 border border-blue-100">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[10px] font-semibold text-blue-800">{mt.name}</span>
                                            <span className={`text-[7px] px-1 py-0.5 rounded border ${getEvidenceGradeColor(mt.grade)}`}>Grade {mt.grade}</span>
                                          </div>
                                          <div className="text-[8px] text-blue-600 font-medium mb-0.5">Target: {mt.targetTissue}</div>
                                          <p className="text-[9px] text-gray-600 mb-1">{mt.description}</p>
                                          <div className="flex items-center gap-2 text-[8px]">
                                            <span className="text-gray-500"><strong className="text-gray-700">Dosage:</strong> {mt.dosage}</span>
                                          </div>
                                          {mt.rationale && (
                                            <div className="mt-1 pt-1 border-t border-blue-100">
                                              <span className="text-[8px] text-violet-600 font-medium">Clinical Rationale: </span>
                                              <span className="text-[8px] text-gray-500">{mt.rationale}</span>
                                            </div>
                                          )}
                                          <div className="mt-1 pt-1 border-t border-blue-100">
                                            <span className="text-[7px] text-gray-400">{mt.evidence.authors} ({mt.evidence.year}). {mt.evidence.title}. <em>{mt.evidence.journal}</em></span>
                                          </div>
                                          {mt.contraindications.length > 0 && (
                                            <div className="mt-0.5 flex flex-wrap gap-0.5">
                                              {mt.contraindications.map((c, ci) => (
                                                <span key={ci} className="text-[7px] px-1 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">CI: {c}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Exercises */}
                              {phase.exercises.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-gray-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `ex_${phase.phase}` ? null : `ex_${phase.phase}`)}>
                                    <Dumbbell className="h-2.5 w-2.5 text-emerald-500" />
                                    Exercise Prescription ({phase.exercises.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `ex_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `ex_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.exercises.map((ex, ei) => (
                                        <div key={ei} className="bg-emerald-50/50 rounded-lg px-2.5 py-2 border border-emerald-100">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[10px] font-semibold text-emerald-800">{ex.name}</span>
                                            <span className={`text-[7px] px-1 py-0.5 rounded border ${getEvidenceGradeColor(ex.grade)}`}>Grade {ex.grade}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[8px] mb-0.5">
                                            <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">{ex.type}</span>
                                            <span className="text-gray-500">for {ex.targetMuscle} ({ex.muscleIssue})</span>
                                          </div>
                                          <div className="grid grid-cols-4 gap-1 my-1">
                                            <div className="bg-white rounded px-1.5 py-1 text-center border border-emerald-100">
                                              <div className="text-[7px] text-gray-400">Sets</div>
                                              <div className="text-[9px] font-bold text-gray-800">{ex.sets}</div>
                                            </div>
                                            <div className="bg-white rounded px-1.5 py-1 text-center border border-emerald-100">
                                              <div className="text-[7px] text-gray-400">Reps</div>
                                              <div className="text-[9px] font-bold text-gray-800">{ex.reps}</div>
                                            </div>
                                            <div className="bg-white rounded px-1.5 py-1 text-center border border-emerald-100">
                                              <div className="text-[7px] text-gray-400">Hold</div>
                                              <div className="text-[9px] font-bold text-gray-800">{ex.hold}</div>
                                            </div>
                                            <div className="bg-white rounded px-1.5 py-1 text-center border border-emerald-100">
                                              <div className="text-[7px] text-gray-400">Freq</div>
                                              <div className="text-[9px] font-bold text-gray-800">{ex.frequency}</div>
                                            </div>
                                          </div>
                                          <div className="text-[8px] text-gray-500">
                                            <strong className="text-gray-700">Progression:</strong> {ex.progression}
                                          </div>
                                          {ex.rationale && (
                                            <div className="mt-1 pt-1 border-t border-emerald-100">
                                              <span className="text-[8px] text-violet-600 font-medium">Clinical Rationale: </span>
                                              <span className="text-[8px] text-gray-500">{ex.rationale}</span>
                                            </div>
                                          )}
                                          <div className="mt-1 pt-1 border-t border-emerald-100">
                                            <span className="text-[7px] text-gray-400">{ex.evidence.authors} ({ex.evidence.year}). <em>{ex.evidence.journal}</em></span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Treatments */}
                              {phase.aiTreatments && phase.aiTreatments.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `ait_${phase.phase}` ? null : `ait_${phase.phase}`)}>
                                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                    AI-Recommended Treatments ({phase.aiTreatments.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `ait_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `ait_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.aiTreatments.map((at, ati) => (
                                        <div key={ati} className="bg-amber-50/50 rounded-lg px-2.5 py-2 border border-amber-200">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                            <span className="text-[10px] font-semibold text-amber-800">{at.name}</span>
                                          </div>
                                          <p className="text-[8px] text-gray-600 mt-0.5 ml-4">{at.description}</p>
                                          <div className="flex items-center gap-2 mt-1 ml-4">
                                            <span className="text-[7px] px-1 py-0.5 rounded bg-amber-100 text-amber-600">From: {at.sourceRegion}</span>
                                            <span className="text-[7px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">Severity {at.sourceSeverity}/10</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Exercises */}
                              {phase.aiExercises && phase.aiExercises.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `aie_${phase.phase}` ? null : `aie_${phase.phase}`)}>
                                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                    AI-Recommended Exercises ({phase.aiExercises.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `aie_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `aie_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.aiExercises.map((ae, aei) => (
                                        <div key={aei} className="bg-amber-50/50 rounded-lg px-2.5 py-2 border border-amber-200">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                            <span className="text-[10px] font-semibold text-amber-800">{ae.name}</span>
                                          </div>
                                          <p className="text-[8px] text-gray-600 mt-0.5 ml-4">{ae.description}</p>
                                          {ae.sets && ae.reps && <p className="text-[8px] text-emerald-600 mt-0.5 ml-4 font-medium">{ae.sets} × {ae.reps}</p>}
                                          <div className="flex items-center gap-2 mt-1 ml-4">
                                            <span className="text-[7px] px-1 py-0.5 rounded bg-amber-100 text-amber-600">From: {ae.sourceRegion}</span>
                                            <span className="text-[7px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">Severity {ae.sourceSeverity}/10</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Assessments */}
                              {phase.aiAssessments && phase.aiAssessments.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `aia_${phase.phase}` ? null : `aia_${phase.phase}`)}>
                                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                    AI-Recommended Assessments ({phase.aiAssessments.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `aia_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `aia_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.aiAssessments.map((aa, aai) => (
                                        <div key={aai} className="bg-amber-50/50 rounded-lg px-2.5 py-2 border border-amber-200">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                            <span className="text-[10px] font-semibold text-amber-800">{aa.test}</span>
                                          </div>
                                          <p className="text-[8px] text-gray-600 mt-0.5 ml-4">{aa.technique || ''}</p>
                                          {aa.purpose && <p className="text-[8px] text-blue-600 mt-0.5 ml-4 italic">{aa.purpose}</p>}
                                          <div className="flex items-center gap-2 mt-1 ml-4">
                                            <span className="text-[7px] px-1 py-0.5 rounded bg-amber-100 text-amber-600">From: {aa.sourceRegion}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Milestones */}
                              {phase.milestones.length > 0 && (
                                <div>
                                  <button className="text-[10px] font-semibold text-gray-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === `ms_${phase.phase}` ? null : `ms_${phase.phase}`)}>
                                    <TrendingUp className="h-2.5 w-2.5 text-violet-500" />
                                    Recovery Milestones ({phase.milestones.length})
                                    <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${expandedTreatmentSection === `ms_${phase.phase}` ? '' : '-rotate-90'}`} />
                                  </button>
                                  {expandedTreatmentSection === `ms_${phase.phase}` && (
                                    <div className="mt-1 space-y-1.5 ml-3.5">
                                      {phase.milestones.map((ms, msi) => (
                                        <div key={msi} className="bg-violet-50/50 rounded-lg px-2.5 py-2 border border-violet-100">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                                              <span className="text-[8px] font-bold text-white">W{ms.week}</span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-violet-800">{ms.title}</span>
                                          </div>
                                          <div className="mt-1 ml-6.5">
                                            <span className="text-[8px] font-medium text-gray-600">Criteria:</span>
                                            <div className="space-y-0.5 mt-0.5">
                                              {ms.criteria.map((c, ci) => (
                                                <div key={ci} className="flex items-start gap-1 text-[8px] text-gray-500">
                                                  <Check className="h-2 w-2 text-violet-400 flex-shrink-0 mt-0.5" />
                                                  {c}
                                                </div>
                                              ))}
                                            </div>
                                            <span className="text-[8px] font-medium text-gray-600 mt-1 block">Expected Outcomes:</span>
                                            <div className="space-y-0.5 mt-0.5">
                                              {ms.expectedOutcomes.map((eo, eoi) => (
                                                <div key={eoi} className="flex items-start gap-1 text-[8px] text-gray-500">
                                                  <TrendingUp className="h-2 w-2 text-green-400 flex-shrink-0 mt-0.5" />
                                                  {eo}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Precautions */}
                              {phase.precautions.length > 0 && (
                                <div className="bg-amber-50/50 rounded px-2 py-1.5 border border-amber-100">
                                  <span className="text-[9px] font-semibold text-amber-700 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Precautions</span>
                                  <div className="mt-0.5 space-y-0.5 ml-3.5">
                                    {phase.precautions.map((pc, pci) => (
                                      <div key={pci} className="text-[8px] text-amber-600">{pc}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Root Cause Treatments */}
                    {treatmentPlan.rootCauseTreatments.length > 0 && (
                      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl px-3 py-3 border border-indigo-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                            <GitBranch className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-bold text-indigo-900 text-xs">Root Cause Treatment Plans</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">{treatmentPlan.rootCauseTreatments.length} chain(s)</span>
                        </div>

                        <div className="space-y-3">
                          {treatmentPlan.rootCauseTreatments.map((rct, rctIdx) => (
                            <div key={rctIdx} className="bg-white/70 rounded-lg px-2.5 py-2 border border-indigo-100">
                              <button
                                className="w-full text-left flex items-center gap-2"
                                onClick={() => setExpandedTreatmentSection(prev => prev === `rct_${rctIdx}` ? null : `rct_${rctIdx}`)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-indigo-800">{rct.region}</span>
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${rct.severity >= 7 ? 'bg-red-100 text-red-600' : rct.severity >= 4 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                      {rct.severity}/10
                                    </span>
                                  </div>
                                  <div className="text-[8px] text-indigo-600 mt-0.5 font-mono">
                                    {rct.chainSummary}
                                  </div>
                                </div>
                                <ChevronDown className={`h-3 w-3 text-indigo-400 transition-transform flex-shrink-0 ${expandedTreatmentSection === `rct_${rctIdx}` ? '' : '-rotate-90'}`} />
                              </button>

                              {expandedTreatmentSection === `rct_${rctIdx}` && (
                                <div className="mt-2 space-y-2">
                                  <p className="text-[9px] text-gray-600 leading-relaxed bg-indigo-50/50 rounded px-2 py-1.5 border-l-2 border-indigo-300">{rct.clinicalReasoning}</p>

                                  {rct.downstreamEffects.length > 0 && (
                                    <div className="bg-orange-50/50 rounded px-2 py-1.5 border border-orange-100">
                                      <span className="text-[9px] font-semibold text-orange-700">Downstream Effects (resolved by treating root cause)</span>
                                      <div className="mt-0.5 space-y-0.5">
                                        {rct.downstreamEffects.map((de, dei) => (
                                          <div key={dei} className="text-[8px] text-orange-600 flex items-start gap-1">
                                            <ArrowRight className="h-2 w-2 text-orange-400 flex-shrink-0 mt-0.5" />
                                            {de}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {rct.steps.map((step, si) => (
                                    <div key={si} className="border border-indigo-100 rounded-lg overflow-hidden">
                                      <div className="bg-indigo-50 px-2.5 py-1.5 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                          <span className="text-[8px] font-bold text-white">{si + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[10px] font-bold text-indigo-800">{step.structure}</span>
                                          <p className="text-[8px] text-indigo-600 truncate">{step.finding}</p>
                                        </div>
                                      </div>

                                      <div className="px-2.5 py-2 space-y-2">
                                        <p className="text-[8px] text-gray-500 italic">{step.mechanism}</p>

                                        {step.treatments.length > 0 && (
                                          <div>
                                            <span className="text-[9px] font-semibold text-teal-700 flex items-center gap-1">
                                              <Stethoscope className="h-2.5 w-2.5" />
                                              Manual Therapy / Interventions
                                            </span>
                                            <div className="mt-1 space-y-1.5">
                                              {step.treatments.map((tx, txi) => (
                                                <div key={txi} className="bg-teal-50/50 rounded px-2 py-1.5 border-l-2 border-teal-400">
                                                  <div className="text-[9px] font-semibold text-teal-800">{tx.name}</div>
                                                  <p className="text-[8px] text-gray-600 mt-0.5">{tx.technique}</p>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[7px] px-1 py-0.5 rounded bg-teal-100 text-teal-600 font-medium">{tx.dosage}</span>
                                                  </div>
                                                  <p className="text-[7px] text-violet-500 mt-0.5 italic">{tx.rationale}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {step.exercises.length > 0 && (
                                          <div>
                                            <span className="text-[9px] font-semibold text-emerald-700 flex items-center gap-1">
                                              <Activity className="h-2.5 w-2.5" />
                                              Corrective Exercises
                                            </span>
                                            <div className="mt-1 space-y-1.5">
                                              {step.exercises.map((ex, exi) => (
                                                <div key={exi} className="bg-emerald-50/50 rounded px-2 py-1.5 border-l-2 border-emerald-400">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-semibold text-emerald-800">{ex.name}</span>
                                                    <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600">{ex.type}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">{ex.dosage}</span>
                                                  </div>
                                                  <p className="text-[7px] text-violet-500 mt-0.5 italic">{ex.rationale}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}

                                  <div className="bg-green-50/60 rounded px-2 py-1.5 border border-green-200">
                                    <span className="text-[9px] font-semibold text-green-700 flex items-center gap-1">
                                      <TrendingUp className="h-2.5 w-2.5" />
                                      Expected Outcome
                                    </span>
                                    <p className="text-[8px] text-green-600 mt-0.5">{rct.expectedOutcome}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Red Flags */}
                    <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                      <button className="text-[10px] font-semibold text-red-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === 'redflags' ? null : 'redflags')}>
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        Red Flags — Screen & Monitor
                        <ChevronDown className={`h-2.5 w-2.5 ml-auto transition-transform ${expandedTreatmentSection === 'redflags' ? '' : '-rotate-90'}`} />
                      </button>
                      {expandedTreatmentSection === 'redflags' && (
                        <div className="mt-1 space-y-0.5 ml-4">
                          {treatmentPlan.redFlags.map((rf, rfi) => (
                            <div key={rfi} className="flex items-start gap-1 text-[9px] text-red-600">
                              <span className="text-red-400 flex-shrink-0">!</span>
                              {rf}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Outcome Measures */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <button className="text-[10px] font-semibold text-gray-700 flex items-center gap-1 w-full text-left" onClick={() => setExpandedTreatmentSection(prev => prev === 'outcomes' ? null : 'outcomes')}>
                        <Scale className="h-2.5 w-2.5 text-gray-500" />
                        Outcome Measures
                        <ChevronDown className={`h-2.5 w-2.5 ml-auto transition-transform ${expandedTreatmentSection === 'outcomes' ? '' : '-rotate-90'}`} />
                      </button>
                      {expandedTreatmentSection === 'outcomes' && (
                        <div className="mt-1 space-y-0.5 ml-3.5">
                          {treatmentPlan.outcomesMeasures.map((om, omi) => (
                            <div key={omi} className="flex items-start gap-1 text-[9px] text-gray-600">
                              <Check className="h-2.5 w-2.5 text-teal-400 flex-shrink-0 mt-0.5" />
                              {om}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[8px] text-gray-400 pt-2 pb-1">
                      Auto-updates with posture, pain markers, and muscle changes
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center min-h-[400px]">
                    <div className="text-center max-w-xs mx-auto">
                      <div className="w-14 h-14 mx-auto bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                        <Stethoscope className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">Treatment Pathway</h3>
                      <p className="text-sm text-gray-500 mb-4">Evidence-based treatment plans that adapt to your clinical findings in real-time.</p>
                      <p className="text-xs text-gray-400">Loading treatment analysis...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Chat Panel Content */}
          {rightPanelTab === 'chat' && (<>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {!selectedConversationId && !isStreaming ? (
                /* Welcome Screen */
                <div className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="mb-6">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Stethoscope className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">PhysioGPT</h2>
                    <p className="text-gray-500 mb-8">How can I help with your clinical case?</p>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What's the best approach for assessing acute low back pain?")}
                      >
                        <CardContent className="p-4">
                          <Bone className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Low Back Pain</p>
                          <p className="text-xs text-gray-500 mt-1">Assessment & management approach</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What are the best special tests for rotator cuff pathology?")}
                      >
                        <CardContent className="p-4">
                          <Target className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Rotator Cuff</p>
                          <p className="text-xs text-gray-500 mt-1">Special tests & assessment</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("How do I differentiate between hip and lumbar pathology?")}
                      >
                        <CardContent className="p-4">
                          <Brain className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Hip vs Lumbar</p>
                          <p className="text-xs text-gray-500 mt-1">Differential diagnosis guide</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What's the evidence for manual therapy in neck pain?")}
                      >
                        <CardContent className="p-4">
                          <BookOpen className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Manual Therapy</p>
                          <p className="text-xs text-gray-500 mt-1">Evidence-based approaches</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Body Region Grid */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Select a body region</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {(Object.keys(BODY_REGIONS) as Array<keyof typeof BODY_REGIONS>).map((region) => {
                          const data = BODY_REGIONS[region];
                          const isSelected = selectedRegion === region;
                          return (
                            <Button
                              key={region}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`flex flex-col h-auto py-2 px-2 text-xs ${isSelected ? `bg-gradient-to-r ${data.color} text-white border-0` : ''}`}
                              onClick={() => handleRegionSelect(region)}
                            >
                              <span className="text-base mb-0.5">{data.icon}</span>
                              <span className="truncate w-full">{data.name.split(' ')[0]}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Streaming response during recording (no conversation yet) */}
                    {isStreaming && streamingContent && (
                      <div className="mt-6 max-w-3xl mx-auto">
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-teal-600 text-white text-xs">
                              <Bot className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[80%] text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 py-0">
                                Live Interim Analysis
                              </Badge>
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                              <ClinicalResponseDisplay content={streamingContent} professionalMode={true} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isStreaming && !streamingContent && (
                      <div className="mt-6 max-w-3xl mx-auto">
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-teal-600 text-white text-xs">
                              <Bot className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : loadingMessages ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-2/3 ml-auto" />
                  <Skeleton className="h-16 w-3/4" />
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-teal-600 text-white text-xs">
                            <Bot className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white border shadow-sm'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <>
                              <ClinicalResponseDisplay
                                content={msg.content}
                                evidenceGrade={
                                  evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                    ? evidenceData.get(selectedConversationId!)?.evidenceGrade
                                    : undefined
                                }
                                confidenceLevel={
                                  evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                    ? evidenceData.get(selectedConversationId!)?.confidenceLevel
                                    : undefined
                                }
                                clinicalSections={
                                  evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                    ? evidenceData.get(selectedConversationId!)?.clinicalSections
                                    : undefined
                                }
                                professionalMode={true}
                              />
                              {evidenceData.has(selectedConversationId!) && index === messages.length - 1 &&
                               evidenceData.get(selectedConversationId!)?.visualContent && (
                                <VisualContentDisplay
                                  visualContent={evidenceData.get(selectedConversationId!)!.visualContent}
                                  exerciseImages={evidenceData.get(selectedConversationId!)?.exerciseImages}
                                />
                              )}
                              {evidenceData.has(selectedConversationId!) && index === messages.length - 1 &&
                               evidenceData.get(selectedConversationId!)?.pubmedEvidence && (
                                <EvidenceCitationInline
                                  papers={evidenceData.get(selectedConversationId!)!.pubmedEvidence!.papers}
                                  overallGrade={evidenceData.get(selectedConversationId!)!.pubmedEvidence!.overallGrade}
                                  confidence={evidenceData.get(selectedConversationId!)!.pubmedEvidence!.confidence}
                                  source={evidenceData.get(selectedConversationId!)!.pubmedEvidence!.source}
                                />
                              )}
                              <div className="mt-2 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    pdfGenerator.downloadPDF({
                                      title: `Clinical Response - ${new Date().toLocaleDateString()}`,
                                      content: msg.content,
                                      type: 'general',
                                      date: new Date().toLocaleDateString(),
                                      therapistName: 'PhysioGPT User'
                                    });
                                    toast({ title: "PDF Generated" });
                                  }}
                                  className="text-xs h-7"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                        <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <Avatar className="h-7 w-7 border border-gray-200 flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-gray-100 text-xs">
                            <User className="h-3.5 w-3.5 text-gray-600" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {/* Streaming response */}
                  {isStreaming && streamingContent && (
                    <div className="flex gap-3">
                      <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-teal-600 text-white text-xs">
                          <Bot className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%]">
                        <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                          <ClinicalResponseDisplay content={streamingContent} professionalMode={true} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typing indicator */}
                  {(sendMessageMutation.isPending || (isStreaming && !streamingContent)) && (
                    <div className="flex gap-3">
                      <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-teal-600 text-white text-xs">
                          <Bot className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Special Tests Panel */}
          {currentRegionData && (
            <Collapsible open={showSpecialTests} onOpenChange={setShowSpecialTests}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-2 bg-white border-t hover:bg-gray-50 text-sm">
                  <span className="flex items-center gap-2 text-teal-700 font-medium">
                    <ClipboardCheck className="h-4 w-4" />
                    Special Tests: {currentRegionData.name}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showSpecialTests ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-2 bg-gray-50 border-t max-h-44 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentRegionData.specialTests.map((test, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-white rounded-lg border hover:border-teal-300 cursor-pointer transition-colors"
                        onClick={() => {
                          const prompt = `How do I perform ${test.name}? What is the sensitivity/specificity and clinical utility for ${test.purpose}?`;
                          setMessage(prompt);
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-gray-800">{test.name}</p>
                          <p className="text-[10px] text-gray-500">{test.purpose}</p>
                          <p className="text-[10px] text-teal-600">+ : {test.positive}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-xs font-medium text-red-700">Red Flags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentRegionData.redFlags.map((flag, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] border-red-300 text-red-700 py-0">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-4 py-2 border-t bg-white">
              <ScrollArea className="w-full">
                <div className="flex gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap hover:bg-teal-50 hover:border-teal-300 h-7 text-xs flex-shrink-0"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      <Lightbulb className="h-3 w-3 mr-1 text-teal-600" />
                      {suggestion.length > 50 ? suggestion.substring(0, 50) + '...' : suggestion}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 py-1.5 border-t bg-gray-50/80">
            <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto">
              {PHYSIO_QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  className={`whitespace-nowrap h-7 text-xs px-2.5 ${action.color}`}
                  onClick={() => handleSendMessage(action.prompt)}
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-3">
            <div className="max-w-3xl mx-auto">
              {/* Recording indicator */}
              {isRecording && (
                <div className="mb-2 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-700 font-semibold">Recording Clinical Session</span>
                        <span className="text-sm text-red-600 font-mono font-bold">{formatRecordingTime(recordingDuration)}</span>
                      </div>
                      <span className="text-xs text-red-500">AI analysis updates live as you speak</span>
                    </div>
                    <Button variant="destructive" size="sm" className="h-7 text-xs px-3" onClick={stopRecording}>
                      <MicOff className="h-3 w-3 mr-1" />
                      Stop & Analyze
                    </Button>
                  </div>
                  {(liveTranscript || interimTranscript) && (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mic className="h-3 w-3 text-gray-500" />
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Live Transcript</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed max-h-20 overflow-y-auto">
                        {liveTranscript}
                        {interimTranscript && <span className="text-gray-400 italic"> {interimTranscript}</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isAnalyzingSession && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
                  <Brain className="h-4 w-4 animate-pulse text-teal-600" />
                  <div>
                    <span className="text-sm text-teal-700 font-medium">Generating final clinical report...</span>
                    <p className="text-xs text-teal-500">Comprehensive diagnosis, assessment, and treatment plan</p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2 items-end"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    currentRegionData
                      ? `Ask about ${currentRegionData.name.toLowerCase()} assessment or treatment...`
                      : "Ask about assessment, treatment, or clinical reasoning..."
                  }
                  disabled={sendMessageMutation.isPending || isStreaming || isRecording || isTranscribing || isAnalyzingSession}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isStreaming || isTranscribing || isAnalyzingSession}
                >
                  {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending || isStreaming || isRecording || isTranscribing || isAnalyzingSession}
                  className="bg-teal-600 hover:bg-teal-700 h-9 w-9 flex-shrink-0"
                  size="icon"
                >
                  {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </form>
            </div>
          </div>
          </>)}
        </div>
      </div>

      {/* Toggle buttons for panels */}
      {!chatPanelOpen && (
        <button
          onClick={() => setChatPanelOpen(true)}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-lg transition-colors text-xs font-medium"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </button>
      )}
      {!sidebarOpen && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/70 hover:bg-black/80 text-white rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur"
          >
            <Clock className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={() => {
              if (voiceSessionActive) {
                stopVoiceSession();
              } else {
                startVoiceSession();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${voiceSessionActive ? 'bg-purple-500 hover:bg-purple-600 text-white animate-pulse' : 'bg-black/70 hover:bg-black/80 text-white'}`}
          >
            {voiceSessionActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {voiceSessionActive ? 'Stop Voice' : 'Voice'}
          </button>
          <button
            onClick={toggleCameraMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${cameraMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-black/70 hover:bg-black/80 text-white'}`}
          >
            {cameraMode ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            {cameraMode ? 'Stop Camera' : 'Camera'}
          </button>
          <button
            onClick={() => setClinicalReasoningOpen(!clinicalReasoningOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${clinicalReasoningOpen ? 'bg-cyan-500 hover:bg-cyan-600 text-white' : 'bg-black/70 hover:bg-black/80 text-white'}`}
          >
            <Brain className="h-3.5 w-3.5" />
            {clinicalReasoningOpen ? 'Hide Reasoning' : 'AI Reasoning'}
            {clinicalReasoningData && (clinicalReasoningData.hypotheses.length > 0 || clinicalReasoningData.findings.length > 0) && !clinicalReasoningOpen && (
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
            {clinicalReasoningProcessing && !clinicalReasoningOpen && (
              <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />
            )}
          </button>
        </div>
      )}

      <ClinicalReasoningPanel
        data={clinicalReasoningData}
        isProcessing={voiceProcessing || clinicalReasoningProcessing}
        isOpen={clinicalReasoningOpen}
        isPaused={clinicalReasoningPaused}
        onToggle={() => setClinicalReasoningOpen(!clinicalReasoningOpen)}
        onClose={() => setClinicalReasoningOpen(false)}
        onPauseToggle={() => setClinicalReasoningPaused(prev => !prev)}
        onReset={() => {
          setClinicalReasoningData(null);
          setClinicalReasoningPaused(false);
          lastReasoningTriggerRef.current = '';
          setActiveVisualizationId(null);
          setMuscleHighlightColors({});
          setBiomechanicalMuscleHighlights([]);
          setVisualizationBoneHighlights([]);
          setTimeout(() => triggerClinicalReasoningAnalysis(true), 100);
        }}
        subjectiveHistory={subjectiveHistoryInput}
        onSubjectiveHistoryChange={setSubjectiveHistoryInput}
        onSubjectiveHistorySubmit={handleSubjectiveHistorySubmit}
        onBiomechanicalLinkClick={handleBiomechanicalLinkClick}
        activeBiomechanicalLinkId={activeBiomechanicalLink?.id || null}
        painDriverReports={painDriverReports}
        onVisualizationRequest={handleVisualizationRequest}
        activeVisualizationId={activeVisualizationId}
      />
    </div>
  );
}