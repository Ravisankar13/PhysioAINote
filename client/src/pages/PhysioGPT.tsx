import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle,
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
  Pill,
  Microscope,
  Link2,
  FlaskConical,
  GraduationCap,
  Leaf,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage, NaturalTimelineRequestContext } from "@shared/schema";
import { useNaturalTimeline } from "@/hooks/useNaturalTimeline";
import { useCaseSpecificPlan } from "@/hooks/useCaseSpecificPlan";
import { RECOVERY_ARCHETYPES, getArchetypeForCondition } from "@/lib/recoveryArchetypes";
const NaturalTimelinePanel = lazy(() => import("@/components/skeleton/NaturalTimelinePanel"));
import ClinicalResponseDisplay from "@/components/clinical/ClinicalResponseDisplay";
import VisualContentDisplay from "@/components/clinical/VisualContentDisplay";
import EvidenceCitationInline from "@/components/clinical/EvidenceCitationInline";
import PureThreeGLBViewer from "@/components/skeleton/PureThreeGLBViewer";
import type { AnatomicalRegion, PainMarker, PainMarkerType, RomJointDefinition, RomMeasurement, SymptomType, AnimationState, AnimationConstraint } from "@/components/skeleton/PureThreeGLBViewer";
import { REGION_BONE_MAPPING, SYMPTOM_TYPES } from "@/components/skeleton/PureThreeGLBViewer";
import ActiveCapacitiesPanel from "@/components/skeleton/ActiveCapacitiesPanel";
import MovementFindingsStream, { type MovementFinding } from "@/components/skeleton/MovementFindingsStream";
import { useActiveCapacities } from "@/hooks/useActiveCapacities";
import type {
  DiagnosisProvocationMovement,
  ProvocationComposeResponse,
  ProvocationContextPainMarker,
} from "@shared/jointVocabulary";
import type { CompensationResult } from "@/lib/jointConstraints";
import { type FocusedRegion, FOCUSED_REGIONS } from "@/lib/focusedRegions";
import { type FocusedCameraResult } from "@/components/skeleton/FocusedCameraCapture";
import { type ClinicalBubbleData } from "@/components/skeleton/ClinicalBubble";
import type { KineticChainConnection } from "@/lib/kineticChainMap";
import { poseToControllerValues, ControllerSmoother } from "@/utils/poseToControllerMap";
import type { ExtendedPoseInput } from "@/utils/poseToControllerMap";
import type { Skeleton3DPose, SmoothedPoseOutput, PartialSkeleton3DPose, PosturalMetrics, CameraViewType, SpineSegmentation, BodyProportions } from "@/utils/mediapipeTo3D";
import { ROM_JOINT_DEFINITIONS, ANATOMICAL_VIRTUAL_POINTS } from "@/components/skeleton/PureThreeGLBViewer";
import type { ClinicalReasoningData, BiomechanicalLink, VisualizationRequest, ClinicalHypothesis } from "@/components/skeleton/ClinicalReasoningPanel";
import type { StructuredReasoningResult, ReasoningHypothesis as StructuredHypothesis } from "@/components/skeleton/StructuredReasoningTab";
import type { TreatmentDecisionResult } from "@/components/skeleton/DecisionTab";
import type { TreatmentPlanResult } from "@/components/skeleton/PlanTab";
import { type HypothesisData, type RefinedHypothesisSuggestion } from "@/components/skeleton/HypothesisChatPanel";
import HypothesisTestBench, { type BenchHypothesisInput, type BenchSkeletonOverlay, type BenchUpdate, type HypothesisFingerprint } from "@/components/skeleton/HypothesisTestBench";
import type { ClinicalExtractionResult } from "@shared/clinicalIntakeTypes";
import { parseClinicalText, mergeHighlights, HIGHLIGHT_COLORS, type RegionHighlight, type HighlightType, type ParsedClinicalContext } from "@/lib/clinicalTextParser";
import { calculatePosturalForces, forceToNewtons, getStatusColor, getThresholdWarnings, computeWeightDistribution, type ForceAnalysisResult, type JointSurfaceForce, type WeightDistribution } from "@/lib/posturalForceEngine";
import { computeFullMuscleAnalysis, computeAllMuscleStates, applyOverridesToAnalysis, getClinicalStatusColor, getClinicalStatusLabel, getToneLabel, getExerciseRecommendations, computeMuscleBalanceRatios, computeTreatmentPriorities, type MuscleAnalysisResult, type IndividualMuscle, type MuscleGroupAnalysis, type ExerciseRecommendation, type MuscleBalanceRatio, type TreatmentPriority, type MuscleOverride, type LengthOverride, type PathologyType, type CrossMuscleEffects, PATHOLOGY_LABELS, PATHOLOGY_EFFECTS } from "@/lib/muscleBiomechanicsEngine";
import { computeBidirectionalEffects, computeMuscleRestrictionEffects, computeChainDrivenJointEffects, MUSCLE_JOINT_ACTIONS, type MuscleRestrictionEffect } from "@/lib/bidirectionalMuscleJoint";
import { computePathologyCompensation, type PathologyCompensationResult } from "@/lib/pathologyCompensationEngine";
import { ENVIRONMENT_PRESETS, DEFAULT_ENVIRONMENT } from "@/lib/environmentPresets";
import { getClinicalPresetCategories, applyPresetToConfig, type ClinicalPosturePreset } from "@/lib/clinicalPosturePresets";
import { KINETIC_CHAINS, type KineticChainDefinition, CHAIN_BONE_MAPPING, getChainBoneNames } from "@/lib/kineticChainExplorer";
import { computeCrossSystemCorrelation, type CrossSystemCorrelationResult, type PainCorrelation, type CompensationPattern } from "@/lib/crossSystemCorrelation";
import { generateTreatmentPlan, type TreatmentPlan, type PhaseBlock, type ManualTherapyTechnique, type ExercisePrescription, type RecoveryMilestone, type EvidenceGrade, type AITreatmentItem, type AIExerciseItem, type AIAssessmentItem, type AIDifferential, type RootCauseTreatmentPlan, type RootCauseTreatmentStep } from "@/lib/treatmentPathwayEngine";
import { MYOFASCIAL_CHAINS, FUNCTIONAL_SLINGS, type MyofascialChain, computeWholeBodyTensionScore, propagateChainEffects, getChainMembership, getChainRecommendations, findChainsForBone, type ChainRecommendation, type PropagatedMuscleState, rankPainTensionContributors, computeClinicalConsequences, type ClinicalConsequenceResult } from "@/lib/myofascialChains";
import { computeInfluenceMap, getInfluencePathwayColor, getInfluencePathwayLabel, getInfluencePathwayAbbrev, getDominantPathway, type InfluenceMap, type InfluencePathway } from "@/lib/muscleInfluenceMap";
import { type ScarMarker, type AdhesionBand, SCAR_TYPES, SCAR_SEVERITY_LABELS, TISSUE_LAYERS, getScarImpact, type ScarType, type TissueLayer, type ScarAge, type ScarMobility } from "@/lib/scarTissueMapping";
import { computePainDrivers, type PainDriverReport } from "@/lib/painDriverEngine";
import { type FascialModifiers } from "@/lib/posturalForceEngine";
import { classifyPainMechanism } from "@/lib/neurologyMap";
import { computeTreatmentPriorities as computeFullTreatmentPriorities, computeJointMobilizationTargets, type TreatmentPriorityResult, type TreatmentTarget, type SyndromeProtocol, type PainMarkerSimple } from "@/lib/treatmentPriorityEngine";
import { computePredictedPain, type PredictedPainSpot } from "@/lib/predictedPainEngine";
import BiomechanicsHUD from "@/components/skeleton/BiomechanicsHUD";
import ForceTimePanel from "@/components/skeleton/ForceTimePanel";
import GRFOverlay from "@/components/skeleton/GRFOverlay";
import { forceTimeBuffer, type ForceTimeMetrics, subscribeForceBuffer, augmentForceAnalysisDynamics, EMPTY_FORCE_RESULT } from "@/lib/forceTimeBuffer";
import type { PatientState } from "@/lib/forceCitations";
import { TreatmentOverlayBridge, type BoneScreenPosition, getRequiredBoneNames } from "@/components/skeleton/TreatmentOverlay";
import { type ClinicalParseResult, type CompromisedTissue, type ClinicalTextInputHandle, type FollowUpQuestion } from "@/components/skeleton/ClinicalTextInput";
import {
  type AutopilotStability,
  type AutopilotStageId,
  type AutopilotStageStatus,
  type VoiceActivityEntry,
  type VoiceTriggerReason,
} from "@/components/skeleton/VoiceActivityDock";
import type { CaseResearchPanelHandle } from "@/components/skeleton/CaseResearchPanel";
import type { CaseResearchContext } from "@shared/schema";
import {
  PatientContextPanel,
  EMPTY_PATIENT_CONTEXT_STATE,
  buildPatientContextPayload,
  patientContextHasContent,
  type PatientContextState,
} from "@/components/skeleton/PatientContextPanel";
import { buildPatientContextSig, predictionFingerprintFor } from "@/lib/patientContextSig";
import { PatientContextStatusBadge } from "@/components/skeleton/PatientContextStatusBadge";
import { computeUnifiedBiomechanics, type BiomechanicsOutput, type FaultRuleConfig } from "@/lib/unifiedBiomechanicsEngine";
import { generateMechanismTreatments } from "@/lib/mechanismTreatmentEngine";
import { analyzeInjuryMechanism } from "@/lib/injuryMechanismEngine";
import { type WhatIfScenario, type WhatIfComparisonResult, computeWhatIfComparison } from "@/lib/whatIfSimulationEngine";
import { type TissueViewMode, type NervePathwayEntry, type TendonEntry, type JointSurfaceEntry, type FascialLayerEntry, TISSUE_MODE_COLORS, getAllHighlightBonesForMode, getTissueEntriesForMode, getEntryByBone, getAllEntriesForBone, TENDON_DATA, NERVE_PATHWAY_DATA, JOINT_SURFACE_DATA, FASCIAL_LAYER_DATA } from "@/lib/tissueViewData";
import { aggregateTissueIntelligence, filterInflammationIntelligence, type TissueIntelligence } from "@/lib/tissueIntelligence";
import { tissueIntelligenceToOverlayHighlight, paletteForState } from "@/lib/tissueOverlayCatalogue";
import { computeSlingAnalysis, getSlingBonePathway, SLING_ACTIVATION_BASELINE, type SlingAnalysisResult, type SlingId, type SlingAnalysisInput } from "@/lib/slingEngine";
import { runDriverAnalysis as runSlingDriverAnalysis } from "@/lib/slingDriverAnalysis";
import { computeSlingTissueRisks, type SlingTissueRisk } from "@/lib/slingTissuePressure";
import { synthesizeClinicalPlan, type ClinicalPlanResult } from "@/lib/clinicalPlanSynthesizer";

const MovementPlayer = lazy(() => import("@/components/skeleton/MovementPlayer"));
const FocusedCameraCapture = lazy(() => import("@/components/skeleton/FocusedCameraCapture"));
const ClinicalBubble = lazy(() => import("@/components/skeleton/ClinicalBubble"));
const ShoulderAssessmentPanel = lazy(() => import("@/components/shoulder/ShoulderAssessmentPanel"));
const ClinicalReasoningPanel = lazy(() => import("@/components/skeleton/ClinicalReasoningPanel"));
const HypothesisChatPanel = lazy(() => import("@/components/skeleton/HypothesisChatPanel"));
const ExtractionResultsPanel = lazy(() => import("@/components/skeleton/ExtractionResultsPanel"));
const UnifiedChainPanel = lazy(() => import("@/components/skeleton/UnifiedChainPanel"));
const PainIntelligencePanel = lazy(() => import("@/components/skeleton/PainIntelligencePanel"));
const TissueViewSelector = lazy(() => import("@/components/skeleton/TissueViewSelector"));
const RiskPrognosisDashboard = lazy(() => import("@/components/skeleton/RiskPrognosisDashboard"));
const InjuryMechanismPanel = lazy(() => import("@/components/skeleton/InjuryMechanismPanel"));
const ExerciseEngineTab = lazy(() => import("@/components/skeleton/ExerciseEngineTab"));
const ManualTherapyEngineTab = lazy(() => import("@/components/skeleton/ManualTherapyEngineTab"));
import type { TissueTarget } from "@/components/skeleton/ManualTherapyEngineTab";
const ElectrophysicalEngineTab = lazy(() => import("@/components/skeleton/ElectrophysicalEngineTab"));
const PatientEducationEngineTab = lazy(() => import("@/components/skeleton/PatientEducationEngineTab"));
const MyPlanPanel = lazy(() => import("@/components/skeleton/MyPlanPanel"));
import MasterPlanCard from "@/components/skeleton/MasterPlanCard";
import { PlanCartProvider, usePlanCart, type PlanCartItem } from "@/lib/planCart";
import { OrchestratePlanProvider } from "@/lib/orchestratePlanContext";
import { TreatmentRationaleProvider, type RationaleClinicalContextInput } from "@/lib/treatmentRationaleContext";
import type { PhysioGptCaseSnapshot } from "@shared/schema";

/** Bridges the plan cart context to refs/state in the parent PhysioGPT
 *  component so case-snapshot persistence can read the cart contents and
 *  call replaceAll on restore without restructuring the whole page. */
function PlanCartHydrationBridge({
  onItemsChange,
  registerReplaceAll,
}: {
  onItemsChange: (items: PlanCartItem[]) => void;
  registerReplaceAll: (fn: ((items: PlanCartItem[]) => void) | null) => void;
}) {
  const { items, replaceAll } = usePlanCart();
  useEffect(() => {
    onItemsChange(items);
  }, [items, onItemsChange]);
  useEffect(() => {
    registerReplaceAll(replaceAll);
    return () => registerReplaceAll(null);
  }, [replaceAll, registerReplaceAll]);
  return null;
}

function MyPlanTabButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { count } = usePlanCart();
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${active ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
      data-testid="button-tab-my-plan"
    >
      <Sparkles className="h-3 w-3" />
      My Plan
      {count > 0 && (
        <span className="ml-0.5 text-[9px] font-bold px-1 rounded-full bg-cyan-400/30 text-cyan-100 min-w-[14px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}
const AdjunctTherapiesEngineTab = lazy(() => import("@/components/skeleton/AdjunctTherapiesEngineTab"));
const LifestyleAdjunctEngineTab = lazy(() => import("@/components/skeleton/LifestyleAdjunctEngineTab"));
const UnifiedBiomechanicsPanel = lazy(() => import("@/components/skeleton/UnifiedBiomechanicsPanel"));
const WhatIfSimulationPanel = lazy(() => import("@/components/skeleton/WhatIfSimulationPanel"));
const SimulationTimelinePanel = lazy(() => import("@/components/skeleton/SimulationTimelinePanel"));
const RecoverySimulationPanel = lazy(() => import("@/components/skeleton/RecoverySimulationPanel"));
const RecoverySimulatorDashboard = lazy(() => import("@/components/skeleton/RecoverySimulatorDashboard"));
const MechanicsAnalyserDashboard = lazy(() => import("@/components/skeleton/MechanicsAnalyserDashboard"));
import { buildConditionContext, buildCustomExerciseId, buildCustomTechniqueId, classifyCondition, extractJointLoadVectors, MAX_SIMULATION_WEEKS, type ConditionContext, type CustomExerciseInput, type CustomManualTechniqueInput, type JointLoadVector } from "@/lib/recoverySimulationEngine";
import { computeNaturalProgression, resolveNaturalProgressionConditionId } from "@/lib/naturalProgressionEngine";
import { buildPrescriptionContext } from "@/lib/prescriptionAdapterEngine";
import type { PhaseRxRequest } from "@/components/skeleton/RecoverySimulatorDashboard";
import { DEFAULT_PATIENT_FACTORS, autoPopulateFromPipeline, computePatientModifiers, derivePsychosocialAndOccupationalDrivers, type PatientFactors } from "@/lib/patientFactorsEngine";
const PatientFactorsForm = lazy(() => import("@/components/skeleton/PatientFactorsForm"));
import { countFactorOverrides } from "@/components/skeleton/PatientFactorsForm";
import { CaseResearchPanel } from "@/components/skeleton/CaseResearchPanel";
import { computePatientFactorsFilledCount } from "@/lib/recoveryUncertainty";
const TimelineBottomBar = lazy(() => import("@/components/skeleton/TimelineBottomBar"));
import type { PlaybackSyncState, TimelinePlaybackRef, ConditionPhaseInfo } from "@/components/skeleton/TimelineBottomBar";
const MechanismTreatmentTab = lazy(() => import("@/components/skeleton/MechanismTreatmentTab"));
const SlingAnalysisPanel = lazy(() => import("@/components/skeleton/SlingAnalysisPanel"));
const ClinicalTextInput = lazy(() => import("@/components/skeleton/ClinicalTextInput"));
const VoiceActivityDock = lazy(() => import("@/components/skeleton/VoiceActivityDock"));

const LazyPanelFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
  </div>
);

const loadPdfGenerator = () => import("@/services/pdfGenerator").then(m => m.pdfGenerator);

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
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number; xShift: number; yShift: number; zShift: number; leftInnominateRotation: number; rightInnominateRotation: number };
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
  pelvis: { tilt: 0, obliquity: 0, rotation: 0, drop: 0, xShift: 0, yShift: 0, zShift: 0, leftInnominateRotation: 0, rightInnominateRotation: 0 },
  sacrum: { nutation: 0, counternutation: 0, torsion: 0, lateralFlexion: 0 },
  leftHip: { flexion: 0, extension: 0, abduction: 0, adduction: 0, internalRotation: 0, externalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  rightHip: { flexion: 0, extension: 0, abduction: 0, adduction: 0, internalRotation: 0, externalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  leftKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  rightKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  leftAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, forefootVarus: 0, toeExtension: 0, archHeight: 0 },
  rightAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, forefootVarus: 0, toeExtension: 0, archHeight: 0 },
  leftShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
  rightShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
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

  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [computationsReady, setComputationsReady] = useState(false);
  const [computeStage, setComputeStage] = useState(0);
  const [uiStage, setUiStage] = useState<0 | 1 | 2 | 3>(0);
  const [liteMode, setLiteMode] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const perf = performance as Performance & { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number } };
    const isLowMem = (nav.deviceMemory && nav.deviceMemory <= 4) ||
      (perf.memory && perf.memory.jsHeapSizeLimit < 2 * 1024 * 1024 * 1024);
    if (isLowMem) {
      setLiteMode(true);
      console.log('[PhysioGPT] Low memory device detected — lite mode enabled');
    }
  }, []);

  const handleModelLoadProgress = useCallback((progress: number) => {
    setModelLoadProgress(progress);
  }, []);

  const handleModelReady = useCallback(() => {
    setModelReady(true);
    setModelLoadProgress(100);
    setModelLoadError(null);
  }, []);

  useEffect(() => {
    if (!modelReady) return;
    let cancelled = false;
    const idleIds: number[] = [];
    const timers: number[] = [];

    const scheduleIdle = (fn: () => void, fallbackMs: number) => {
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(() => { if (!cancelled) fn(); }, { timeout: fallbackMs });
        idleIds.push(id);
      } else {
        timers.push(window.setTimeout(() => { if (!cancelled) fn(); }, fallbackMs));
      }
    };

    requestAnimationFrame(() => {
      if (cancelled) return;
      setUiStage(1);
      requestAnimationFrame(() => {
        if (cancelled) return;
        setUiStage(2);
        scheduleIdle(() => {
          setUiStage(3);
          setComputeStage(1);
          scheduleIdle(() => {
            setComputeStage(2);
            scheduleIdle(() => {
              setComputeStage(3);
              scheduleIdle(() => {
                setComputeStage(4);
                setComputationsReady(true);
              }, 600);
            }, 600);
          }, 600);
        }, 500);
      });
    });
    return () => {
      cancelled = true;
      idleIds.forEach(id => {
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id);
      });
      timers.forEach(t => clearTimeout(t));
    };
  }, [modelReady]);

  const handleModelLoadError = useCallback((error: string) => {
    setModelLoadError(error);
    setModelReady(false);
    setComputationsReady(false);
    setComputeStage(0);
    setUiStage(0);
  }, []);

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [hypothesisChatOpen, setHypothesisChatOpen] = useState(false);
  const [selectedHypothesisForChat, setSelectedHypothesisForChat] = useState<HypothesisData | null>(null);
  const [lastRefinedCommit, setLastRefinedCommit] = useState<{ id: string; condition: string; supportingEvidence: string[]; rulingOutFactors: string[] } | null>(null);
  const [testBenchOpen, setTestBenchOpen] = useState(false);
  const [testBenchHypothesis, setTestBenchHypothesis] = useState<BenchHypothesisInput | null>(null);
  const benchSnapshotRef = useRef<{
    modelConfig: ModelConfig;
    painMarkers: PainMarker[];
    biomechanicalMuscleHighlights: string[];
    muscleHighlightColors: Record<string, string>;
    visualizationBoneHighlights: Array<{ boneName: string; color: number; intensity: number }>;
  } | null>(null);
  const [showJointControls, setShowJointControls] = useState(false);
  const [showClinicalPresets, setShowClinicalPresets] = useState(false);
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
  const [showForceTimePanel, setShowForceTimePanel] = useState(false);
  const [patientForceState, setPatientForceState] = useState<PatientState>('default');
  const [forceTimeMetrics, setForceTimeMetrics] = useState<ForceTimeMetrics | null>(null);
  const [grfOverlayEnabled, setGrfOverlayEnabled] = useState(true);
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
  const [showUnifiedChainPanel, setShowUnifiedChainPanel] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
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
  const [poseTrackingQuality, setPoseTrackingQuality] = useState<{ overall: number; estimatedJoints: string[] }>({ overall: 1, estimatedJoints: [] });
  const [posturalMetrics, setPosturalMetrics] = useState<PosturalMetrics | null>(null);
  const [focusedCameraResult, setFocusedCameraResult] = useState<FocusedCameraResult | null>(null);
  const [focusedRegion, setFocusedRegion] = useState<FocusedRegion>(FOCUSED_REGIONS[0]);
  const [showShoulderAssessment, setShowShoulderAssessment] = useState(false);
  const [shoulderAssessmentSide, setShoulderAssessmentSide] = useState<'left' | 'right'>('right');
  const [clinicalBubbleMarker, setClinicalBubbleMarker] = useState<PainMarker | null>(null);
  const [clinicalBubbleSeverity, setClinicalBubbleSeverity] = useState<string>("moderate");
  const [clinicalBubbleResults, setClinicalBubbleResults] = useState<Record<string, { data: ClinicalBubbleData; severity: string; region: string }>>({});
  const [showPainIntelligence, setShowPainIntelligence] = useState(false);
  const [dermatomeHighlightBones, setDermatomeHighlightBones] = useState<string[]>([]);
  const [nerveRootLabels, setNerveRootLabels] = useState<Array<{ root: string; boneName: string }>>([]);
  const [referralZoneBones, setReferralZoneBones] = useState<string[]>([]);
  const [tissueViewMode, setTissueViewMode] = useState<TissueViewMode>(null);
  const [selectedTissueEntry, setSelectedTissueEntry] = useState<string | null>(null);
  const [tissueDisambiguationEntries, setTissueDisambiguationEntries] = useState<Array<{ id: string; label: string }>>([]);
  const [compromisedTissues, setCompromisedTissues] = useState<CompromisedTissue[]>([]);
  const tissueViewManualRef = useRef(false);
  const [showRiskDashboard, setShowRiskDashboard] = useState(false);
  const [showInjuryMechanism, setShowInjuryMechanism] = useState(false);
  const [showSimTimeline, setShowSimTimeline] = useState(false);
  const [showRecoverySim, setShowRecoverySim] = useState(false);
  const [skeletonMode, setSkeletonMode] = useState<'posture' | 'movement'>('posture');
  const [movementFindings, setMovementFindings] = useState<MovementFinding[]>([]);
  /** When the Recovery Sim dashboard is mounted with its Skeleton View tab,
   *  it gives us a DOM container into which we portal the SAME live
   *  PureThreeGLBViewer instance — so the user is never looking at a
   *  duplicated viewer; the existing one is reparented into the dashboard. */
  const [recoverySimSlot, setRecoverySimSlot] = useState<HTMLDivElement | null>(null);
  // Task #294 — Mechanics Analyser bottom-tab dashboard. Same portal pattern
  // as Recovery Sim: the live PureThreeGLBViewer is reparented into the
  // dashboard's central skeleton slot so the analyser shares the SAME viewer
  // instance + overlays + animation state instead of mounting a duplicate.
  const [showMechanicsAnalyser, setShowMechanicsAnalyser] = useState(false);
  const [mechanicsAnalyserSlot, setMechanicsAnalyserSlot] = useState<HTMLDivElement | null>(null);
  const [mechanicsOverlay, setMechanicsOverlay] = useState<{
    comTrail: boolean; stabilityCone: boolean; plantarHeatmap: boolean; jointReactionArrows: boolean;
  }>({ comTrail: true, stabilityCone: true, plantarHeatmap: false, jointReactionArrows: true });
  const [timelinePlaybackState, setTimelinePlaybackState] = useState<PlaybackSyncState | null>(null);
  const [conditionPhases, setConditionPhases] = useState<ConditionPhaseInfo[] | null>(null);
  const timelinePlaybackRef = useRef<TimelinePlaybackRef | null>(null);
  const [mechanismActiveTab, setMechanismActiveTab] = useState<'mechanism' | 'treatment' | 'whatif' | 'exercise' | 'manualRx' | 'electroRx' | 'adjunctRx' | 'lifestyleRx' | 'patientEd' | 'myPlan'>('mechanism');
  // Lifted Electrophysical Agents (EPA) state so the Recovery Simulator phase cards can read
  // the latest plan without re-fetching, and so phase-card "Generate" CTAs
  // can pre-fill the Electro tab and auto-run the engine.
  const [electroPlan, setElectroPlan] = useState<import('@/components/skeleton/ElectrophysicalEngineTab').ElectrophysicalPlan | null>(null);
  const [electroPrefill, setElectroPrefill] = useState<{ condition: string; stage: 'acute' | 'subacute' | 'chronic'; nonce: number } | null>(null);
  const [hasClinicalTextData, setHasClinicalTextData] = useState(false);
  const hasClinicalTextDataRef = useRef(hasClinicalTextData);
  hasClinicalTextDataRef.current = hasClinicalTextData;
  // Master Plan auto-organize: nonce bumped only when the "Build full plan"
  // settle effect needs the OrchestratePlanProvider to fire orchestration on
  // its own (no click). Manual "Organize with AI" clicks call the provider's
  // organize() directly. Cleared once the provider consumes the nonce.
  const [orchestrateAutoNonce, setOrchestrateAutoNonce] = useState<number | null>(null);
  // Bump signal that asks MasterPlanCard to expand its inline section
  // (e.g. after a successful Build-full-plan cascade). The card only reacts
  // to *changes* of this value, so manual collapse is preserved between
  // bumps.
  const [masterPlanExpandSignal, setMasterPlanExpandSignal] = useState(0);
  // ----- Master Plan auto-build (Task #267) -----
  // When the user clicks "Build full plan", the four engines are mounted as
  // hidden phantom instances (alongside any visible tab) and triggered to
  // generate concurrently. As each engine returns, its `autoAddOnGenerate`
  // path adds every generated item to the plan cart in a staggered cascade
  // (~110ms per item) so the existing MasterPlanCard flash + line-draw
  // animations fire item-by-item. When all four engines settle we hold a
  // brief tick (so the last cart-add animations can paint) before navigating
  // to My Plan and bumping the existing organize nonce.
  //
  // State machine: 'idle' → 'generating' (all four engines in flight) →
  //                'organizing' (post-settle nav + nonce bump) → 'idle'.
  // Re-clicking the button is a no-op while state !== 'idle'.
  type AutoBuildState = 'idle' | 'generating' | 'organizing';
  const [autoBuildState, setAutoBuildState] = useState<AutoBuildState>('idle');
  const autoBuildStateRef = useRef<AutoBuildState>('idle');
  autoBuildStateRef.current = autoBuildState;
  // One-shot trigger flags driving each engine's `pendingGenerate` prop.
  // Cleared by the engine's `onGenerateStarted` callback as soon as
  // generation begins — they say nothing about completion.
  const [autoBuildTriggerExercise, setAutoBuildTriggerExercise] = useState(false);
  const [autoBuildTriggerMT, setAutoBuildTriggerMT] = useState(false);
  const [autoBuildTriggerAdjunct, setAutoBuildTriggerAdjunct] = useState(false);
  // In-flight flags for each engine. Set true alongside the trigger on click,
  // cleared only when the engine fires `onGenerateComplete` (which itself is
  // deferred until after the staggered cart-add cascade finishes). The settle
  // effect transitions to 'organizing' only when ALL four are false.
  const [autoBuildInFlightExercise, setAutoBuildInFlightExercise] = useState(false);
  const [autoBuildInFlightMT, setAutoBuildInFlightMT] = useState(false);
  const [autoBuildInFlightEPA, setAutoBuildInFlightEPA] = useState(false);
  const [autoBuildInFlightAdjunct, setAutoBuildInFlightAdjunct] = useState(false);
  // EPA uses a monotonic nonce instead of a boolean trigger (per its existing
  // autoGenerate contract). Bumped on each click; engine de-dupes via its
  // own lastNonceRef.
  const [autoBuildElectroNonce, setAutoBuildElectroNonce] = useState(0);
  // Names of engines that returned an error during the current build (cleared
  // when state cycles back to 'idle'). Drives the failure toast.
  const [autoBuildFailures, setAutoBuildFailures] = useState<Set<string>>(new Set());
  // Refs for the 4 quick-launch pills (Exercise/Manual/Electro/Adjunct) and the
  // wrapping container so the convergence overlay can compute SVG anchor points.
  // pillRefs object is memoized so its identity is stable across renders — this
  // prevents the overlay's effects from re-initializing on every parent render.
  const masterPlanContainerRef = useRef<HTMLDivElement>(null);
  const masterPlanExerciseRef = useRef<HTMLButtonElement>(null);
  const masterPlanManualRef = useRef<HTMLButtonElement>(null);
  const masterPlanElectroRef = useRef<HTMLButtonElement>(null);
  const masterPlanAdjunctRef = useRef<HTMLButtonElement>(null);
  const masterPlanPillRefs = useMemo(
    () => ({
      exercise: masterPlanExerciseRef,
      manual: masterPlanManualRef,
      electro: masterPlanElectroRef,
      adjunct: masterPlanAdjunctRef,
    }),
    [],
  );
  // Latest clinical-text parse result, retained at page level so the
  // Patient Context panel can fingerprint the prediction (for stale
  // detection) and the AI prompt-generation request can quote the
  // findings the parse produced. Distinct from `clinicalTextAppliedRef`
  // which only tracks what was applied to the skeleton.
  const [lastClinicalParseResult, setLastClinicalParseResult] = useState<ClinicalParseResult | null>(null);
  // AI-driven Patient Context state — session-level only (intentionally
  // not persisted across reloads, per task spec).
  const [patientContextState, setPatientContextState] = useState<PatientContextState>(EMPTY_PATIENT_CONTEXT_STATE);
  // Task #240 — Structured Patient Factors live alongside the AI Q&A
  // panel. They start as the pipeline-derived auto-population and are
  // overridden by the clinician via the new PatientFactorsForm. The
  // overrides are persisted to localStorage keyed by case fingerprint
  // so opening the same case in a future session restores the edits.
  const [patientFactorOverrides, setPatientFactorOverrides] = useState<Partial<PatientFactors> | null>(null);
  // Hoisted from later in the component so the patient-factors memos
  // below (autoDetectedPatientFactors / effectivePatientFactors) can
  // read these values without hitting a temporal dead zone.
  const [extractionResult, setExtractionResult] = useState<ClinicalExtractionResult | null>(null);
  const [extractionResultsOpen, setExtractionResultsOpen] = useState(false);
  const [structuredReasoningData, setStructuredReasoningData] = useState<StructuredReasoningResult | null>(null);
  const patientContextPayload = useMemo(
    () => buildPatientContextPayload(patientContextState),
    [patientContextState],
  );
  const hasPatientContext = useMemo(
    () => patientContextHasContent(patientContextState),
    [patientContextState],
  );
  /** True when the prompts were generated against an older prediction
   *  text — mirrored to the downstream panel header badges so the
   *  clinician sees the "regenerate prompts" hint everywhere, not only
   *  on the Patient Context card. */
  const patientContextPromptsStale = useMemo(() => {
    if (!patientContextState.predictionFingerprint) return false;
    const live = predictionFingerprintFor(lastClinicalParseResult);
    if (!live) return false;
    return live !== patientContextState.predictionFingerprint;
  }, [patientContextState.predictionFingerprint, lastClinicalParseResult]);

  // ───── Task #240 — Effective patient factors + persistence ─────
  // The pipeline-derived `autoFactors` is the baseline; clinician edits
  // are stored in `patientFactorOverrides` and merged on top. We
  // persist overrides to localStorage keyed by case fingerprint so the
  // same case re-opened in a future session restores its structured
  // patient context.
  const patientFactorsCaseKey = useMemo(() => {
    const fp = predictionFingerprintFor(lastClinicalParseResult);
    return fp ? `physiogpt:patientFactors:${fp}` : null;
  }, [lastClinicalParseResult]);

  const autoDetectedPatientFactors = useMemo(() => {
    return autoPopulateFromPipeline(
      extractionResult ?? null,
      structuredReasoningData ?? null,
      DEFAULT_PATIENT_FACTORS,
    );
  }, [extractionResult, structuredReasoningData]);

  const effectivePatientFactors = useMemo<PatientFactors>(() => {
    if (!patientFactorOverrides) return autoDetectedPatientFactors;
    return {
      ...autoDetectedPatientFactors,
      ...patientFactorOverrides,
      currentMedications: {
        ...autoDetectedPatientFactors.currentMedications,
        ...(patientFactorOverrides.currentMedications ?? {}),
      },
    };
  }, [autoDetectedPatientFactors, patientFactorOverrides]);

  // Load persisted overrides whenever the case fingerprint changes
  useEffect(() => {
    if (!patientFactorsCaseKey) {
      setPatientFactorOverrides(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(patientFactorsCaseKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setPatientFactorOverrides(parsed as Partial<PatientFactors>);
          return;
        }
      }
    } catch {/* ignore localStorage failures */}
    setPatientFactorOverrides(null);
  }, [patientFactorsCaseKey]);

  // Persist overrides on change
  useEffect(() => {
    if (!patientFactorsCaseKey) return;
    try {
      if (patientFactorOverrides && Object.keys(patientFactorOverrides).length > 0) {
        window.localStorage.setItem(patientFactorsCaseKey, JSON.stringify(patientFactorOverrides));
      } else {
        window.localStorage.removeItem(patientFactorsCaseKey);
      }
    } catch {/* ignore localStorage failures (quota, private mode) */}
  }, [patientFactorsCaseKey, patientFactorOverrides]);

  // Compute overrides as the diff between user-edited factors and the
  // auto-detected baseline so persistence stays minimal and the
  // clinician can always click Reset to drop back to pipeline values.
  const handlePatientFactorsChange = useCallback((next: PatientFactors) => {
    const auto = autoDetectedPatientFactors;
    const overrides: Partial<PatientFactors> = {};
    const keys: (keyof PatientFactors)[] = [
      // Pre-existing fields now exposed in the form
      "diabetes", "smoking", "previousEpisodes", "sleepQuality",
      // Group 1–5 structured fields
      "menopausalStatus", "bmiNumeric", "timeSinceLastEpisodeMonths", "priorSurgeryArea",
      "keyImagingFindings", "sleepHours", "proteinIntake", "dailyStepsBand", "trainingAgeYears",
      "kinesiophobia", "painCatastrophizing", "selfEfficacy", "perceivedStress", "socialSupport",
      "sittingHoursPerDay", "liftingFrequency", "repetitiveTaskExposure", "sportPosition", "sportSurface",
    ];
    for (const k of keys) {
      if (JSON.stringify(next[k]) !== JSON.stringify(auto[k])) {
        // @ts-expect-error — generic key copy across union types
        overrides[k] = next[k];
      }
    }
    if (JSON.stringify(next.currentMedications) !== JSON.stringify(auto.currentMedications)) {
      overrides.currentMedications = next.currentMedications;
    }
    setPatientFactorOverrides(Object.keys(overrides).length > 0 ? overrides : null);
  }, [autoDetectedPatientFactors]);

  // Pre-computed modifiers + derived workDemand/fearAvoidance for the
  // recovery sim and the "What's affecting this curve" panel.
  const effectivePatientModifiers = useMemo(() => {
    return computePatientModifiers(effectivePatientFactors, null);
  }, [effectivePatientFactors]);

  const derivedDrivers = useMemo(() => {
    // The engine returns weighted contributors as {factor, weight}[]
    // for traceability, but the downstream dashboard panel only needs
    // human-readable strings — flatten here so the prop contract is
    // a plain `string[]` and the chip tooltips render real labels.
    const raw = derivePsychosocialAndOccupationalDrivers(effectivePatientFactors);
    return {
      fearAvoidance: raw.fearAvoidance,
      workDemand: raw.workDemand,
      fearAvoidanceContributors: raw.fearAvoidanceContributors.map(c => `${c.factor} (w${c.weight})`),
      workDemandContributors: raw.workDemandContributors.map(c => `${c.factor} (+${c.weight})`),
    };
  }, [effectivePatientFactors]);

  const patientFactorsOverrideCount = useMemo(() => {
    return countFactorOverrides(effectivePatientFactors, autoDetectedPatientFactors);
  }, [effectivePatientFactors, autoDetectedPatientFactors]);
  /** Task #242 — total filled (clinician- or pipeline-set) structured
   *  fields, used by the recovery dashboards' confidence-band model.
   *  Lines up 1:1 with the "X filled" badge on PatientFactorsForm. */
  const patientFactorsFilledCount = useMemo(() => {
    return computePatientFactorsFilledCount(effectivePatientFactors);
  }, [effectivePatientFactors]);
  // ─────────────────────────────────────────────────────────────────

  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenario[]>([]);
  const [whatIfComparisonBScenarios, setWhatIfComparisonBScenarios] = useState<WhatIfScenario[]>([]);
  const [mechanismBoneIds, setMechanismBoneIds] = useState<string[]>([]);
  const mechanismHighlightBones = useMemo(() => {
    if (!showInjuryMechanism || mechanismBoneIds.length === 0) return [];
    return mechanismBoneIds.map(boneName => ({
      boneName,
      color: 0xff6b35,
      intensity: 0.9,
      glowSize: 0.28,
    }));
  }, [showInjuryMechanism, mechanismBoneIds]);
  const [connectionHighlights, setConnectionHighlights] = useState<AnatomicalRegion[]>([]);
  const [testChainActive, setTestChainActive] = useState<{ connection: KineticChainConnection; originalRegion: string } | null>(null);
  const [zoomToolMode, setZoomToolMode] = useState(false);
  const [expandedZoomRegion, setExpandedZoomRegion] = useState<string | null>(null);
  const [correlationMode, setCorrelationMode] = useState(false);
  const [expandedCorrelation, setExpandedCorrelation] = useState<string | null>(null);
  const [correlationTab, setCorrelationTab] = useState<'overview' | 'chains' | 'muscles' | 'root_cause'>('overview');
  const [bidirectionalMode, setBidirectionalMode] = useState(true);
  const [activeChainIds, setActiveChainIds] = useState<string[]>(() => MYOFASCIAL_CHAINS.map(c => c.id));
  const [showPropagation, setShowPropagation] = useState(false);
  const [tensionTabActive, setTensionTabActive] = useState(false);
  const [selectedChainNode, setSelectedChainNode] = useState<{ chainId: string; muscleId: string; chainName: string } | null>(null);
  const [manualChainTensions, setManualChainTensions] = useState<Record<string, number>>({});
  const [showScarPanel, setShowScarPanel] = useState(false);
  const [scarMarkers, setScarMarkers] = useState<ScarMarker[]>([]);
  const [adhesionBands, setAdhesionBands] = useState<AdhesionBand[]>([]);
  const [editingScar, setEditingScar] = useState<string | null>(null);
  const [scarPlacementMode, setScarPlacementMode] = useState<ScarType | null>(null);
  const [adhesionPlacementStep, setAdhesionPlacementStep] = useState<'idle' | 'start' | 'end'>('idle');
  const [pendingAdhesionStart, setPendingAdhesionStart] = useState<{ position: { x: number; y: number; z: number }; bone: string } | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'treatment' | 'biomechanics' | 'slings'>('chat');
  const [reasoningRequestedTab, setReasoningRequestedTab] = useState<'analysis' | 'structured' | 'decision' | 'plan' | 'evidence' | null>(null);
  const [reasoningActiveTab, setReasoningActiveTab] = useState<'analysis' | 'structured' | 'decision' | 'plan' | 'evidence'>('analysis');
  const [selectedSlingId, setSelectedSlingId] = useState<SlingId | null>(null);
  const [slingOverlayVisible, setSlingOverlayVisible] = useState(true);
  const [expandedSlingDetailId, setExpandedSlingDetailId] = useState<string | null>(null);
  const [unifiedBiomechanicsMovementTask, setUnifiedBiomechanicsMovementTask] = useState<string | undefined>(undefined);
  const [unifiedBiomechanicsProgress, setUnifiedBiomechanicsProgress] = useState(0.5);
  const [unifiedBiomechanicsFaultOverrides, setUnifiedBiomechanicsFaultOverrides] = useState<Partial<FaultRuleConfig>[]>([]);
  const [previousBiomechanicsOutput, setPreviousBiomechanicsOutput] = useState<BiomechanicsOutput | null>(null);
  const [cachedBiomechanicsOutput, setCachedBiomechanicsOutput] = useState<BiomechanicsOutput | null>(null);

  const [evidenceEngineResult, setEvidenceEngineResult] = useState<{
    options: Array<{
      id: string; name: string; category: string; evidenceGrade: string;
      relevanceScore: number; description: string; dosage: string; rationale: string;
      mechanismOfAction: string; targetRegions: string[]; stageAppropriateness: boolean;
      loadCompatibility: boolean; riskFlags: string[]; contraindications: string[];
      tissueMatch: boolean; references: Array<{ authors: string; year: number; title: string; journal: string; pmid?: string }>;
      sourceLibrary: string; expertApproach?: string;
    }>;
    queryContext: { diagnosis: string; regions: string[]; stage: string; irritability: string; mechanism: string; problemClass: string };
    gradeDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    timestamp: string;
    pubmedPapers?: Array<{ title: string; authors: string; journal: string; year: number; pmid: string; doi?: string; abstract: string; studyType: string; evidenceGrade: string; relevanceScore: number; pubmedUrl: string; sources?: string[]; citationCount?: number; openAccessUrl?: string; pedroScore?: number }>;
    pubmedOverallGrade?: string | null;
    pubmedConfidence?: string | null;
    pubmedSource?: string | null;
    pubmedSearchQuery?: string | null;
    pubmedUnavailable?: boolean;
    sourcesSearched?: Array<{ name: string; searched: boolean; resultCount: number; error?: string }>;
    totalSourcesQueried?: number;
    totalSourcesReturned?: number;
  } | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const [expandedPhase, setExpandedPhase] = useState<string | null>('acute');
  const [expandedTreatmentSection, setExpandedTreatmentSection] = useState<string | null>(null);
  const skeletonContainerRef = useRef<HTMLDivElement>(null);
  const controllerSmootherRef = useRef(new ControllerSmoother(0.5, 0.015));
  const [selectedRomJoint, setSelectedRomJoint] = useState<RomJointDefinition | null>(null);
  const [romValues, setRomValues] = useState<Record<string, number>>({});
  const [romMeasurements, setRomMeasurements] = useState<RomMeasurement[]>([]);

  const [clinicalReasoningData, setClinicalReasoningData] = useState<ClinicalReasoningData | null>(null);
  const [clinicalReasoningOpen, setClinicalReasoningOpen] = useState(false);
  const [clinicalReasoningProcessing, setClinicalReasoningProcessing] = useState(false);
  const [clinicalReasoningPaused, setClinicalReasoningPaused] = useState(false);
  // `structuredReasoningData` was hoisted above to avoid a TDZ in the
  // patient-factors memos near the top of the component. Do not
  // redeclare here.
  const [structuredReasoningLoading, setStructuredReasoningLoading] = useState(false);
  const [treatmentDecisionData, setTreatmentDecisionData] = useState<TreatmentDecisionResult | null>(null);
  const [treatmentDecisionLoading, setTreatmentDecisionLoading] = useState(false);
  const [treatmentPlanData, setTreatmentPlanData] = useState<TreatmentPlanResult | null>(null);
  const [treatmentPlanLoading, setTreatmentPlanLoading] = useState(false);
  // Bumped to force a re-fetch of /api/treatment-plan/generate after a
  // clinician override or explicit "Recalculate now" — Optimal Loading Engine.
  const [treatmentPlanReloadKey, setTreatmentPlanReloadKey] = useState(0);
  const [customExerciseResult, setCustomExerciseResult] = useState<import("@/components/skeleton/ExerciseEngineTab").CustomExerciseResult | null>(null);
  const [customManualTherapyResult, setCustomManualTherapyResult] = useState<import("@/components/skeleton/ManualTherapyEngineTab").CustomManualTherapyResult | null>(null);
  const [activeGoalProfile, setActiveGoalProfile] = useState<import("@/lib/goalStateEngine").RecoveryGoalProfile | null>(null);
  const [activeGoalGap, setActiveGoalGap] = useState<import("@/lib/goalStateEngine").GoalGapAnalysis | null>(null);
  const [sessionPrescriptionCtx, setSessionPrescriptionCtx] = useState<import("@/lib/prescriptionAdapterEngine").PrescriptionContext | null>(null);
  const [sessionPrescriptionNum, setSessionPrescriptionNum] = useState<number | null>(null);
  const [pendingExerciseGenerate, setPendingExerciseGenerate] = useState(false);
  const [pendingMTGenerate, setPendingMTGenerate] = useState(false);
  const [exerciseGeneratingSession, setExerciseGeneratingSession] = useState<number | null>(null);
  const [mtGeneratingSession, setMtGeneratingSession] = useState<number | null>(null);
  const [exerciseGeneratedSessions, setExerciseGeneratedSessions] = useState<Set<number>>(new Set());
  const [mtGeneratedSessions, setMtGeneratedSessions] = useState<Set<number>>(new Set());
  // `extractionResult` / `extractionResultsOpen` were hoisted above to
  // avoid a TDZ in the patient-factors memos near the top of the
  // component. Do not redeclare here.
  const [subjectiveHistoryInput, setSubjectiveHistoryInput] = useState('');
  const subjectiveHistoryRef = useRef('');
  const clinicalReasoningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slingAnalysisRef = useRef<ReturnType<typeof computeSlingAnalysis> | null>(null);
  const [slingActivationOverrides, setSlingActivationOverrides] = useState<Partial<Record<SlingId, number>>>({});
  const triggerClinicalReasoningAnalysisRef = useRef<(forceRefresh?: boolean) => void>(() => {});
  const handleEvidenceQueryRef = useRef<() => void>(() => {});
  /** Forward-declared autopilot chain — implementation is bound near
   *  `handleAutoBuildClick` (which depends on later state). The
   *  reasoning trigger calls into this via the ref to avoid hoisting. */
  const chainAutopilotAfterReasoningRef = useRef<(data: ClinicalReasoningData) => void>(() => {});
  /** Forward-declared so the rerun-from-stage handler can fire master-
   *  plan auto-build without depending on its render-order position. */
  const handleAutoBuildClickRef = useRef<() => void>(() => {});
  /** Forward-declared so the rerun-from-stage handler (declared early
   *  for stable dock prop identity) can call into the stage tracker
   *  helpers (declared a bit later in render order). */
  const markStageStartRef = useRef<(id: AutopilotStageId) => void>(() => {});
  const markStageEndRef = useRef<(id: AutopilotStageId, outcome: 'done' | 'error' | 'converged' | 'skipped', reason?: string) => void>(() => {});
  const autoEvidenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evidenceAbortRef = useRef<AbortController | null>(null);
  const evidenceQueryIdRef = useRef(0);
  const [activeBiomechanicalLink, setActiveBiomechanicalLink] = useState<BiomechanicalLink | null>(null);
  const [biomechanicalMuscleHighlights, setBiomechanicalMuscleHighlights] = useState<string[]>([]);
  const [muscleHighlightColors, setMuscleHighlightColors] = useState<Record<string, string>>({});
  const [manualTherapyAnnotations, setManualTherapyAnnotations] = useState<TissueTarget[] | null>(null);
  const [visualizationBoneHighlights, setVisualizationBoneHighlights] = useState<Array<{ boneName: string; color: number; intensity: number }>>([]);
  const [activeVisualizationId, setActiveVisualizationId] = useState<string | null>(null);
  const lastReasoningTriggerRef = useRef<string>('');
  const compensationDataRef = useRef<{ result: CompensationResult | null; movementName: string | null; restrictions: Record<string, number> }>({ result: null, movementName: null, restrictions: {} });
  const painMarkersRef = useRef(painMarkers);
  painMarkersRef.current = painMarkers;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [evidenceData, setEvidenceData] = useState<Map<number, PhysioGptResponse>>(new Map());

  const VOICE_MIN_PARSE_LENGTH = 10;
  const VOICE_SILENCE_DEBOUNCE_MS = 3000;
  const VOICE_STOP_DEBOUNCE_MS = 300;
  const VOICE_INTERVAL_MS = 10000;
  const VOICE_INTERVAL_MIN_NEW_CHARS = 50;

  /** Anchor used to compute "00:42"-style stamps for voice-driven
   *  events. Set when recording starts, cleared when recording stops.
   *  Hoisted so the autopilot governor below can reference it. */
  const recordingStartedAtRef = useRef<number | null>(null);

  // ─── Task #313 — AI Call Governor + Activity Monitor ────────────────
  // The autopilot orchestrates the full case-workup chain (parse →
  // reason → evidence → research → master-plan) off voice triggers.
  // The governor prevents runaway AI calls via two cheap checks:
  //   (1) input-hash dedup — skip a stage if its structural inputs
  //       haven't changed since the previous run.
  //   (2) convergence — once the top hypothesis is stable for ≥2
  //       consecutive runs (and confidence ≥ 0.6) the chain is
  //       suppressed until inputs shift again.
  const AUTOPILOT_STORAGE_KEY = 'physiogpt:voice-autopilot:enabled';
  const CONVERGENCE_RUNS = 2;
  const CONVERGENCE_MIN_CONFIDENCE = 0.6;

  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(AUTOPILOT_STORAGE_KEY);
      if (raw === null) return true; // default ON
      return JSON.parse(raw) === true;
    } catch { return true; }
  });
  const [autopilotPaused, setAutopilotPaused] = useState<boolean>(false);
  const autopilotEnabledRef = useRef(autopilotEnabled);
  autopilotEnabledRef.current = autopilotEnabled;
  const autopilotPausedRef = useRef(autopilotPaused);
  autopilotPausedRef.current = autopilotPaused;

  const handleAutopilotToggle = useCallback((next: boolean) => {
    setAutopilotEnabled(next);
    try { window.localStorage.setItem(AUTOPILOT_STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);
  const handleAutopilotPauseToggle = useCallback((next: boolean) => {
    setAutopilotPaused(next);
  }, []);
  /** Re-run the AI chain starting from a specific stage. The chain
   *  itself owns ordering — this just fires the right entry point and
   *  invalidates downstream input-hash cache so the dedup governor
   *  doesn't short-circuit it. */
  const handleAutopilotRerunFromStage = useCallback((id: AutopilotStageId) => {
    // Invalidate cached input hashes for this stage and all downstream
    // ones so the dedup governor doesn't short-circuit the re-run.
    const order: AutopilotStageId[] = ['parse', 'reason', 'evidence', 'research', 'plan'];
    const fromIdx = order.indexOf(id);
    if (fromIdx >= 0) {
      for (let i = fromIdx; i < order.length; i++) {
        delete stageInputHashRef.current[order[i]];
      }
    }
    if (id === 'reason') {
      // reasoning trigger reads `lastReasoningTriggerRef`; reset it so
      // the same structural inputs aren't treated as already-handled.
      lastReasoningTriggerRef.current = '';
      triggerClinicalReasoningAnalysisRef.current(true);
      return;
    }
    if (id === 'evidence') {
      handleEvidenceQueryRef.current();
      return;
    }
    if (id === 'research') {
      caseResearchPanelRef.current?.trigger(true);
      return;
    }
    if (id === 'plan') {
      // Calling `handleAutoBuildClick` directly is fine — the autopilot
      // monitor effect (above) flips the chip back to done/error when
      // the build settles.
      markStageStartRef.current('plan');
      try { handleAutoBuildClickRef.current(); }
      catch (e) { markStageEndRef.current('plan', 'error', e instanceof Error ? e.message : 'auto-build failed'); }
      return;
    }
    if (id === 'parse') {
      clinicalTextInputRef.current?.triggerIncrementalParse();
      return;
    }
  }, []);

  // 5 stage chip statuses, keyed by stage id. Ordered for the dock.
  const initialMonitorStages: AutopilotStageStatus[] = useMemo(() => ([
    { id: 'parse',    label: 'Parse',     state: 'idle', callCount: 0, lastFiredSec: null, lastDurationMs: null },
    { id: 'reason',   label: 'Reason',    state: 'idle', callCount: 0, lastFiredSec: null, lastDurationMs: null },
    { id: 'evidence', label: 'Evidence',  state: 'idle', callCount: 0, lastFiredSec: null, lastDurationMs: null },
    { id: 'research', label: 'Research',  state: 'idle', callCount: 0, lastFiredSec: null, lastDurationMs: null },
    { id: 'plan',     label: 'Plan',      state: 'idle', callCount: 0, lastFiredSec: null, lastDurationMs: null },
  ]), []);
  const [monitorStages, setMonitorStages] = useState<AutopilotStageStatus[]>(initialMonitorStages);
  const [monitorStability, setMonitorStability] = useState<AutopilotStability>({
    topLabel: null, stableForRuns: 0, converged: false, destabilized: false,
  });
  const monitorStabilityRef = useRef(monitorStability);
  monitorStabilityRef.current = monitorStability;

  // Per-stage input-hash for dedup. Key: stage id → last hash run.
  const stageInputHashRef = useRef<Partial<Record<AutopilotStageId, string>>>({});
  // Stage start timestamps so we can compute duration on completion.
  const stageStartedAtRef = useRef<Partial<Record<AutopilotStageId, number>>>({});

  /** Compute a recording-time stamp for a stage chip. */
  const recordingTimeSec = useCallback((): number | null => {
    return recordingStartedAtRef.current
      ? (Date.now() - recordingStartedAtRef.current) / 1000
      : null;
  }, []);

  /** Stable monitor-stage mutator. Merges patch into the named stage. */
  const updateStage = useCallback((id: AutopilotStageId, patch: Partial<AutopilotStageStatus>) => {
    setMonitorStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  /** Mark a stage as starting. Bumps callCount, stamps start time, sets state=running. */
  const markStageStart = useCallback((id: AutopilotStageId) => {
    stageStartedAtRef.current[id] = Date.now();
    setMonitorStages(prev => prev.map(s => s.id === id
      ? { ...s, state: 'running', callCount: s.callCount + 1, lastFiredSec: recordingTimeSec(), lastSkippedReason: null }
      : s));
  }, [recordingTimeSec]);

  /** Mark a stage as finished (state=done|error|converged|skipped). */
  const markStageEnd = useCallback((id: AutopilotStageId, outcome: 'done' | 'error' | 'converged' | 'skipped', reason?: string) => {
    const startedAt = stageStartedAtRef.current[id];
    const dur = startedAt ? Date.now() - startedAt : null;
    delete stageStartedAtRef.current[id];
    setMonitorStages(prev => prev.map(s => s.id === id
      ? { ...s, state: outcome, lastDurationMs: dur, lastSkippedReason: reason ?? null }
      : s));
  }, []);
  // Bind the refs forward-declared above so the rerun-from-stage
  // handler (which has to be defined earlier in render order to keep
  // the dock's prop identity stable) can call into these helpers.
  markStageStartRef.current = markStageStart;
  markStageEndRef.current = markStageEnd;

  /**
   * Cheap structural hash for governor dedup. Inputs are rounded /
   * sorted so cosmetic noise (transient float jitter, marker order)
   * doesn't bust the cache.
   */
  const computeStructuralHash = useCallback((parts: unknown): string => {
    try {
      const json = JSON.stringify(parts);
      // FNV-1a 32-bit
      let h = 0x811c9dc5 >>> 0;
      for (let i = 0; i < json.length; i++) {
        h ^= json.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return h.toString(16);
    } catch { return String(Date.now()); }
  }, []);


  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const clinicalTextInputRef = useRef<ClinicalTextInputHandle>(null);
  /** Imperative ref into the Case-Aware Research panel (Task #313).
   *  Lets the autopilot programmatically (re-)trigger a search after
   *  the reasoning chain stabilises a top hypothesis. */
  const caseResearchPanelRef = useRef<CaseResearchPanelHandle>(null);
  /** Scroll target for the Patient Context panel — used by the
   *  "No patient context" badge on downstream AI panels so the
   *  clinician can jump straight to filling in answers. */
  const patientContextSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingFollowUpQuestionsRef = useRef<FollowUpQuestion[]>([]);
  const voiceAutoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // ─── Case-Snapshot Persistence ─────────────────────────────────────────────
  // Mirror plan cart contents into local state so the snapshot memo recomputes
  // when the cart changes; provide an imperative replaceAll handle for restore.
  const [planCartItemsState, setPlanCartItemsState] = useState<PlanCartItem[]>([]);
  const planCartReplaceAllRef = useRef<((items: PlanCartItem[]) => void) | null>(null);
  const handlePlanCartItemsChange = useCallback((items: PlanCartItem[]) => {
    setPlanCartItemsState(items);
  }, []);
  const handlePlanCartRegisterReplaceAll = useCallback(
    (fn: ((items: PlanCartItem[]) => void) | null) => {
      planCartReplaceAllRef.current = fn;
    },
    [],
  );

  // Tracks which conversation id has had its caseSnapshot applied so we don't
  // re-hydrate (or skip auto-save) erroneously across selection changes.
  const hydratedConversationIdRef = useRef<number | null>(null);
  const isHydratingRef = useRef<boolean>(false);
  const lastSavedSnapshotRef = useRef<string>("");
  const snapshotSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [snapshotSaveCounter, setSnapshotSaveCounter] = useState(0);
  // Snapshot eligibility — only conversations created after this feature
  // shipped (or that already have a snapshot persisted) are auto-saved.
  // Legacy chat-only conversations stay chat-only even after interaction;
  // they are NEVER backfilled by use, per the task requirement.
  const snapshotEligibleRef = useRef<Set<number>>(new Set());
  // Deterministic cutoff: any conversation created at or after this instant
  // is automatically eligible regardless of whether the first snapshot write
  // has succeeded yet. Conversations created strictly before are legacy.
  const SNAPSHOT_FEATURE_CUTOFF_MS = Date.UTC(2026, 3, 29, 0, 0, 0); // 2026-04-29

  // Build the live snapshot. Captures workspace inputs AND the
  // treatment/timeline/right-panel state explicitly called out in the task —
  // anything outside this snapshot is either recomputed deterministically from
  // these inputs or considered transient UI noise.
  const currentCaseSnapshot = useMemo<PhysioGptCaseSnapshot>(() => ({
    version: 2,
    modelConfig,
    painMarkers,
    compromisedTissues,
    scarMarkers,
    adhesionBands,
    romMeasurements,
    muscleOverrides,
    slingActivationOverrides,
    bodyWeightKg,
    clinicalHighlights,
    subjectiveHistoryInput,
    patientContextState,
    patientFactorOverrides,
    movementFindings,
    selectedRegion: selectedRegion ?? null,
    planCartItems: planCartItemsState,
    // Treatment / timeline / right-panel state
    rightPanelTab,
    mechanismActiveTab,
    expandedTreatmentSection,
    treatmentDecisionData,
    treatmentPlanData,
    showSimTimeline,
    timelinePlaybackState,
    showForceTimePanel,
    showTreatmentPriority,
    showUnifiedChainPanel,
    unifiedBiomechanicsMovementTask: unifiedBiomechanicsMovementTask ?? null,
    unifiedBiomechanicsProgress,
    unifiedBiomechanicsFaultOverrides,
    // v2 — AI-generated outputs and skeleton interaction flags so reopening
    // a case restores the full clinical workspace, not just the inputs.
    extractionResult,
    structuredReasoningData,
    clinicalReasoningData,
    evidenceEngineResult,
    customExerciseResult,
    customManualTherapyResult,
    activeGoalProfile,
    activeGoalGap,
    whatIfScenarios,
    whatIfComparisonBScenarios,
    mechanismBoneIds,
    connectionHighlights,
    testChainActive,
    selectedRomJoint,
    romValues,
  }), [
    modelConfig,
    painMarkers,
    compromisedTissues,
    scarMarkers,
    adhesionBands,
    romMeasurements,
    muscleOverrides,
    slingActivationOverrides,
    bodyWeightKg,
    clinicalHighlights,
    subjectiveHistoryInput,
    patientContextState,
    patientFactorOverrides,
    movementFindings,
    selectedRegion,
    planCartItemsState,
    rightPanelTab,
    mechanismActiveTab,
    expandedTreatmentSection,
    treatmentDecisionData,
    treatmentPlanData,
    showSimTimeline,
    timelinePlaybackState,
    showForceTimePanel,
    showTreatmentPriority,
    showUnifiedChainPanel,
    unifiedBiomechanicsMovementTask,
    unifiedBiomechanicsProgress,
    unifiedBiomechanicsFaultOverrides,
    extractionResult,
    structuredReasoningData,
    clinicalReasoningData,
    evidenceEngineResult,
    customExerciseResult,
    customManualTherapyResult,
    activeGoalProfile,
    activeGoalGap,
    whatIfScenarios,
    whatIfComparisonBScenarios,
    mechanismBoneIds,
    connectionHighlights,
    testChainActive,
    selectedRomJoint,
    romValues,
  ]);

  // Hydrate the workspace from caseSnapshot when the loaded conversation
  // changes. We ALWAYS reset every snapshot-participating field to its default
  // first so that opening a legacy (no-snapshot) conversation, or a snapshot
  // that omits some fields, never inherits stale values from a previously
  // selected case.
  useEffect(() => {
    if (!selectedConversationId) return;
    if (!conversationData?.conversation) return;
    if (hydratedConversationIdRef.current === selectedConversationId) return;

    const snap = conversationData.conversation.caseSnapshot ?? null;
    isHydratingRef.current = true;
    // Eligibility:
    //   1) If a snapshot is already persisted → eligible (continue round-trip).
    //   2) Else if the conversation was created on/after the feature cutoff
    //      → eligible (covers the edge case where the very first snapshot
    //      write failed; subsequent edits should still persist).
    //   3) Otherwise legacy chat-only — never auto-save / never backfill.
    const createdAt = conversationData.conversation.createdAt
      ? new Date(conversationData.conversation.createdAt).getTime()
      : 0;
    const postRollout = createdAt >= SNAPSHOT_FEATURE_CUTOFF_MS;
    if (snap || postRollout) {
      snapshotEligibleRef.current.add(selectedConversationId);
    } else {
      snapshotEligibleRef.current.delete(selectedConversationId);
    }

    // Step 1 — reset every snapshot-participating field to its default.
    setModelConfig({ ...DEFAULT_MODEL_CONFIG });
    setPainMarkers([]);
    setCompromisedTissues([]);
    setScarMarkers([]);
    setAdhesionBands([]);
    setRomMeasurements([]);
    setMuscleOverrides({});
    setSlingActivationOverrides({});
    setBodyWeightKg(70);
    setClinicalHighlights([]);
    setSubjectiveHistoryInput('');
    setPatientContextState(EMPTY_PATIENT_CONTEXT_STATE);
    setPatientFactorOverrides(null);
    setMovementFindings([]);
    setSelectedRegion(null);
    planCartReplaceAllRef.current?.([]);
    setRightPanelTab('chat');
    setMechanismActiveTab('mechanism');
    setExpandedTreatmentSection(null);
    setTreatmentDecisionData(null);
    setTreatmentPlanData(null);
    setShowSimTimeline(false);
    setTimelinePlaybackState(null);
    setShowForceTimePanel(false);
    setShowTreatmentPriority(false);
    setShowUnifiedChainPanel(false);
    setUnifiedBiomechanicsMovementTask(undefined);
    setUnifiedBiomechanicsProgress(0.5);
    setUnifiedBiomechanicsFaultOverrides([]);
    // v2 — AI-output and skeleton-flag defaults.
    setExtractionResult(null);
    setStructuredReasoningData(null);
    setClinicalReasoningData(null);
    setEvidenceEngineResult(null);
    setCustomExerciseResult(null);
    setCustomManualTherapyResult(null);
    setActiveGoalProfile(null);
    setActiveGoalGap(null);
    setWhatIfScenarios([]);
    setWhatIfComparisonBScenarios([]);
    setMechanismBoneIds([]);
    setConnectionHighlights([]);
    setTestChainActive(null);
    setSelectedRomJoint(null);
    setRomValues({});

    // Step 2 — overlay snapshot values where present.
    if (snap && typeof snap === 'object') {
      if (snap.modelConfig && typeof snap.modelConfig === 'object') {
        setModelConfig({ ...DEFAULT_MODEL_CONFIG, ...(snap.modelConfig as Partial<ModelConfig>) });
      }
      if (Array.isArray(snap.painMarkers)) setPainMarkers(snap.painMarkers as PainMarker[]);
      if (Array.isArray(snap.compromisedTissues)) setCompromisedTissues(snap.compromisedTissues as CompromisedTissue[]);
      if (Array.isArray(snap.scarMarkers)) setScarMarkers(snap.scarMarkers as ScarMarker[]);
      if (Array.isArray(snap.adhesionBands)) setAdhesionBands(snap.adhesionBands as AdhesionBand[]);
      if (Array.isArray(snap.romMeasurements)) setRomMeasurements(snap.romMeasurements as RomMeasurement[]);
      if (snap.muscleOverrides && typeof snap.muscleOverrides === 'object') {
        setMuscleOverrides(snap.muscleOverrides as Record<string, MuscleOverride>);
      }
      if (snap.slingActivationOverrides && typeof snap.slingActivationOverrides === 'object') {
        setSlingActivationOverrides(snap.slingActivationOverrides as Partial<Record<SlingId, number>>);
      }
      if (typeof snap.bodyWeightKg === 'number') setBodyWeightKg(snap.bodyWeightKg);
      if (Array.isArray(snap.clinicalHighlights)) setClinicalHighlights(snap.clinicalHighlights as RegionHighlight[]);
      if (typeof snap.subjectiveHistoryInput === 'string') setSubjectiveHistoryInput(snap.subjectiveHistoryInput);
      if (snap.patientContextState && typeof snap.patientContextState === 'object') {
        setPatientContextState(snap.patientContextState as PatientContextState);
      }
      if (snap.patientFactorOverrides && typeof snap.patientFactorOverrides === 'object') {
        setPatientFactorOverrides(snap.patientFactorOverrides as Partial<PatientFactors>);
      }
      if (Array.isArray(snap.movementFindings)) setMovementFindings(snap.movementFindings as MovementFinding[]);
      if (typeof snap.selectedRegion === 'string' && snap.selectedRegion in BODY_REGIONS) {
        setSelectedRegion(snap.selectedRegion as keyof typeof BODY_REGIONS);
      }
      if (Array.isArray(snap.planCartItems)) {
        planCartReplaceAllRef.current?.(snap.planCartItems as PlanCartItem[]);
      }
      if (snap.rightPanelTab === 'chat' || snap.rightPanelTab === 'treatment' || snap.rightPanelTab === 'biomechanics' || snap.rightPanelTab === 'slings') {
        setRightPanelTab(snap.rightPanelTab);
      }
      const validMechanismTabs = ['mechanism', 'treatment', 'whatif', 'exercise', 'manualRx', 'electroRx', 'adjunctRx', 'lifestyleRx', 'patientEd', 'myPlan'] as const;
      if (typeof snap.mechanismActiveTab === 'string' && (validMechanismTabs as readonly string[]).includes(snap.mechanismActiveTab)) {
        setMechanismActiveTab(snap.mechanismActiveTab as typeof validMechanismTabs[number]);
      }
      if (typeof snap.expandedTreatmentSection === 'string' || snap.expandedTreatmentSection === null) {
        setExpandedTreatmentSection(snap.expandedTreatmentSection as string | null);
      }
      if (snap.treatmentDecisionData && typeof snap.treatmentDecisionData === 'object') {
        setTreatmentDecisionData(snap.treatmentDecisionData as TreatmentDecisionResult);
      }
      if (snap.treatmentPlanData && typeof snap.treatmentPlanData === 'object') {
        setTreatmentPlanData(snap.treatmentPlanData as TreatmentPlanResult);
      }
      if (typeof snap.showSimTimeline === 'boolean') setShowSimTimeline(snap.showSimTimeline);
      if (snap.timelinePlaybackState && typeof snap.timelinePlaybackState === 'object') {
        setTimelinePlaybackState(snap.timelinePlaybackState as PlaybackSyncState);
      }
      if (typeof snap.showForceTimePanel === 'boolean') setShowForceTimePanel(snap.showForceTimePanel);
      if (typeof snap.showTreatmentPriority === 'boolean') setShowTreatmentPriority(snap.showTreatmentPriority);
      if (typeof snap.showUnifiedChainPanel === 'boolean') setShowUnifiedChainPanel(snap.showUnifiedChainPanel);
      if (typeof snap.unifiedBiomechanicsMovementTask === 'string') {
        setUnifiedBiomechanicsMovementTask(snap.unifiedBiomechanicsMovementTask);
      }
      if (typeof snap.unifiedBiomechanicsProgress === 'number') {
        setUnifiedBiomechanicsProgress(snap.unifiedBiomechanicsProgress);
      }
      if (Array.isArray(snap.unifiedBiomechanicsFaultOverrides)) {
        setUnifiedBiomechanicsFaultOverrides(snap.unifiedBiomechanicsFaultOverrides as Partial<FaultRuleConfig>[]);
      }
      // v2 — AI outputs and skeleton interaction flags. The schema's open
      // shape means older v1 snapshots simply lack these keys, in which
      // case the defaults from Step 1 stand.
      if (snap.extractionResult && typeof snap.extractionResult === 'object') {
        setExtractionResult(snap.extractionResult as ClinicalExtractionResult);
      }
      if (snap.structuredReasoningData && typeof snap.structuredReasoningData === 'object') {
        setStructuredReasoningData(snap.structuredReasoningData as StructuredReasoningResult);
      }
      if (snap.clinicalReasoningData && typeof snap.clinicalReasoningData === 'object') {
        setClinicalReasoningData(snap.clinicalReasoningData as ClinicalReasoningData);
      }
      if (snap.evidenceEngineResult && typeof snap.evidenceEngineResult === 'object') {
        setEvidenceEngineResult(snap.evidenceEngineResult as typeof evidenceEngineResult);
      }
      if (snap.customExerciseResult && typeof snap.customExerciseResult === 'object') {
        setCustomExerciseResult(snap.customExerciseResult as typeof customExerciseResult);
      }
      if (snap.customManualTherapyResult && typeof snap.customManualTherapyResult === 'object') {
        setCustomManualTherapyResult(snap.customManualTherapyResult as typeof customManualTherapyResult);
      }
      if (snap.activeGoalProfile && typeof snap.activeGoalProfile === 'object') {
        setActiveGoalProfile(snap.activeGoalProfile as typeof activeGoalProfile);
      }
      if (snap.activeGoalGap && typeof snap.activeGoalGap === 'object') {
        setActiveGoalGap(snap.activeGoalGap as typeof activeGoalGap);
      }
      if (Array.isArray(snap.whatIfScenarios)) {
        setWhatIfScenarios(snap.whatIfScenarios as WhatIfScenario[]);
      }
      if (Array.isArray(snap.whatIfComparisonBScenarios)) {
        setWhatIfComparisonBScenarios(snap.whatIfComparisonBScenarios as WhatIfScenario[]);
      }
      if (Array.isArray(snap.mechanismBoneIds)) {
        setMechanismBoneIds(snap.mechanismBoneIds as string[]);
      }
      if (Array.isArray(snap.connectionHighlights)) {
        setConnectionHighlights(snap.connectionHighlights as AnatomicalRegion[]);
      }
      if (snap.testChainActive && typeof snap.testChainActive === 'object') {
        setTestChainActive(snap.testChainActive as { connection: KineticChainConnection; originalRegion: string });
      }
      if (snap.selectedRomJoint && typeof snap.selectedRomJoint === 'object') {
        setSelectedRomJoint(snap.selectedRomJoint as RomJointDefinition);
      }
      if (snap.romValues && typeof snap.romValues === 'object' && !Array.isArray(snap.romValues)) {
        setRomValues(snap.romValues as Record<string, number>);
      }
    }

    hydratedConversationIdRef.current = selectedConversationId;
    // Use the next-saved-snapshot serialization as the baseline so the
    // immediately-following auto-save effect skips the redundant write.
    try {
      lastSavedSnapshotRef.current = JSON.stringify(snap ?? {});
    } catch {
      lastSavedSnapshotRef.current = "";
    }
    // Release the hydration guard after React has settled the batched setters.
    const releaseTimer = setTimeout(() => { isHydratingRef.current = false; }, 200);
    return () => clearTimeout(releaseTimer);
  }, [selectedConversationId, conversationData]);

  // Debounced auto-save of the snapshot to the conversation row.
  useEffect(() => {
    if (!selectedConversationId) return;
    if (isHydratingRef.current) return;
    if (hydratedConversationIdRef.current !== selectedConversationId) return;
    // Hard gate: never auto-save (and therefore never backfill) a legacy
    // conversation that did not have a snapshot at load time.
    if (!snapshotEligibleRef.current.has(selectedConversationId)) return;

    let serialized: string;
    try {
      serialized = JSON.stringify(currentCaseSnapshot);
    } catch {
      return;
    }
    if (serialized === lastSavedSnapshotRef.current) return;

    if (snapshotSaveTimerRef.current) clearTimeout(snapshotSaveTimerRef.current);
    const conversationIdForSave = selectedConversationId;
    snapshotSaveTimerRef.current = setTimeout(async () => {
      snapshotSaveTimerRef.current = null;
      try {
        await apiRequest(
          `/api/physiogpt/conversations/${conversationIdForSave}`,
          "PATCH",
          { caseSnapshot: currentCaseSnapshot },
        );
        lastSavedSnapshotRef.current = serialized;
      } catch {
        // best-effort; the next state change will retry
      }
    }, 1500);

    return () => {
      if (snapshotSaveTimerRef.current) {
        clearTimeout(snapshotSaveTimerRef.current);
        snapshotSaveTimerRef.current = null;
      }
    };
  }, [selectedConversationId, currentCaseSnapshot, snapshotSaveCounter]);

  // Best-effort flush on tab close / navigation away. Uses fetch with
  // `keepalive: true` because navigator.sendBeacon doesn't support PATCH.
  useEffect(() => {
    const handler = () => {
      if (!selectedConversationId) return;
      if (hydratedConversationIdRef.current !== selectedConversationId) return;
      // Same eligibility gate as the debounced autosave — never backfill a
      // legacy conversation on tab close.
      if (!snapshotEligibleRef.current.has(selectedConversationId)) return;
      try {
        fetch(`/api/physiogpt/conversations/${selectedConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseSnapshot: currentCaseSnapshot }),
          keepalive: true,
          credentials: "include",
        }).catch(() => {});
      } catch {}
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [selectedConversationId, currentCaseSnapshot]);
  // ───────────────────────────────────────────────────────────────────────────

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
      if (autoEvidenceTimerRef.current) clearTimeout(autoEvidenceTimerRef.current);
      if (evidenceAbortRef.current) evidenceAbortRef.current.abort();
      if (voiceAutoSubmitTimerRef.current) clearTimeout(voiceAutoSubmitTimerRef.current);
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
                  if (data.data != null) {
                    hydratedConversationIdRef.current = data.data;
                    snapshotEligibleRef.current.add(data.data);
                    lastSavedSnapshotRef.current = "";
                    setSnapshotSaveCounter(c => c + 1);
                  }
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
      // Voice Activity dock: anchor recording-time stamps for this
      // session. Do NOT clear prior entries — the spec requires the
      // log to persist across stop/start until an explicit session
      // reset wipes it. Keeping the existing entries also keeps any
      // outstanding Undo buttons functional.
      recordingStartedAtRef.current = Date.now();
      setVoiceDockVisible(true);
      pendingVoiceTriggerRef.current = null;

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
          let hadFinal = false;
          for (let i = recognitionResultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              liveTranscriptRef.current += result[0].transcript + " ";
              setLiveTranscript(liveTranscriptRef.current.trim());
              recognitionResultIndex = i + 1;
              hadFinal = true;
            } else {
              interimText += result[0].transcript;
            }
          }
          setInterimTranscript(interimText);

          if (hadFinal) {
            if (voiceAutoSubmitTimerRef.current) clearTimeout(voiceAutoSubmitTimerRef.current);
            voiceAutoSubmitTimerRef.current = setTimeout(() => {
              voiceAutoSubmitTimerRef.current = null;
              const transcript = liveTranscriptRef.current.trim();
              if (transcript.length < VOICE_MIN_PARSE_LENGTH || !clinicalTextInputRef.current) return;
              const pendingQs = pendingFollowUpQuestionsRef.current;
              const newContentLength = transcript.length - lastAnalyzedLengthRef.current;
              if (pendingQs.length > 0) {
                const newContent = transcript.slice(lastAnalyzedLengthRef.current).trim();
                if (newContent.length > 5) {
                  const matched = tryMatchFollowUpAnswer(newContent, pendingQs);
                  if (matched) {
                    lastAnalyzedLengthRef.current = transcript.length;
                  }
                }
              } else if (newContentLength > 10 && !isAnalyzingRef.current) {
                const chunk = transcript.slice(lastAnalyzedLengthRef.current).trim();
                pendingVoiceTriggerRef.current = {
                  trigger: 'silence_pause',
                  chunkText: chunk,
                  timestamp: Date.now(),
                  recordingTimeSec: recordingStartedAtRef.current
                    ? (Date.now() - recordingStartedAtRef.current) / 1000
                    : 0,
                };
                const dispatched = clinicalTextInputRef.current.triggerIncrementalParse(transcript);
                if (dispatched) {
                  lastAnalyzedLengthRef.current = transcript.length;
                } else {
                  // Parse was skipped (already in flight, too short).
                  // Drop the staged trigger so it can't be misattributed
                  // to a later, unrelated parse.
                  pendingVoiceTriggerRef.current = null;
                }
              }
            }, VOICE_SILENCE_DEBOUNCE_MS);
          }
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
        const currentTranscript = liveTranscriptRef.current.trim();
        const newContentLength = currentTranscript.length - lastAnalyzedLengthRef.current;
        if (newContentLength > VOICE_INTERVAL_MIN_NEW_CHARS && !isAnalyzingRef.current && currentTranscript.length >= VOICE_MIN_PARSE_LENGTH) {
          if (clinicalTextInputRef.current) {
            const pendingQs = pendingFollowUpQuestionsRef.current;
            if (pendingQs.length > 0) {
              const newText = currentTranscript.slice(lastAnalyzedLengthRef.current).trim();
              if (newText.length > 10) {
                const matched = tryMatchFollowUpAnswer(newText, pendingQs);
                if (matched) {
                  lastAnalyzedLengthRef.current = currentTranscript.length;
                }
              }
            } else {
              const chunk = currentTranscript.slice(lastAnalyzedLengthRef.current).trim();
              pendingVoiceTriggerRef.current = {
                trigger: 'interval_pulse',
                chunkText: chunk,
                timestamp: Date.now(),
                recordingTimeSec: recordingStartedAtRef.current
                  ? (Date.now() - recordingStartedAtRef.current) / 1000
                  : 0,
              };
              const dispatched = clinicalTextInputRef.current.triggerIncrementalParse(currentTranscript);
              if (dispatched) {
                lastAnalyzedLengthRef.current = currentTranscript.length;
              } else {
                pendingVoiceTriggerRef.current = null;
              }
            }
          }
        }
      }, VOICE_INTERVAL_MS);

    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const handleVoiceFollowUpQuestionsChange = useCallback((questions: FollowUpQuestion[]) => {
    pendingFollowUpQuestionsRef.current = questions;
  }, []);

  // Task #313 — in-flight tier-3 GPT requests, keyed by spoken text
  // hash, so we don't fire concurrent requests for the same chunk
  // while the user is still talking.
  const followUpGptInFlightRef = useRef<Set<string>>(new Set());
  const tryMatchFollowUpAnswer = useCallback((spokenText: string, questions: FollowUpQuestion[]): boolean => {
    if (!clinicalTextInputRef.current || questions.length === 0) return false;
    const spoken = spokenText.toLowerCase().trim();
    if (spoken.length < 3) return false;

    // Tier 1 — exact option string match (multiple-choice questions).
    for (const fq of questions) {
      if (fq.options && fq.options.length > 0) {
        const matchedOption = fq.options.find(opt =>
          spoken.includes(opt.toLowerCase())
        );
        if (matchedOption) {
          clinicalTextInputRef.current.submitFollowUpAnswer(fq.id, matchedOption);
          toast({ title: "Follow-up Answered", description: `"${fq.question.substring(0, 50)}..." answered with "${matchedOption}"` });
          return true;
        }
      }
    }

    // Tier 2 — keyword overlap heuristic (open-text questions).
    for (const fq of questions) {
      if (fq.options && fq.options.length > 0) continue;
      const questionKeywords = fq.question.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['what', 'does', 'have', 'this', 'that', 'with', 'from', 'they', 'been', 'were', 'your'].includes(w));
      const matchCount = questionKeywords.filter(kw => spoken.includes(kw)).length;
      if (questionKeywords.length > 0 && matchCount / questionKeywords.length > 0.3) {
        clinicalTextInputRef.current.submitFollowUpAnswer(fq.id, spokenText.trim());
        toast({ title: "Follow-up Answered", description: `Answered: "${fq.question.substring(0, 50)}..."` });
        return true;
      }
    }

    if (questions.length === 1 && spoken.length >= 8) {
      clinicalTextInputRef.current.submitFollowUpAnswer(questions[0].id, spokenText.trim());
      toast({ title: "Follow-up Answered", description: `Answered: "${questions[0].question.substring(0, 50)}..."` });
      return true;
    }

    // Tier 3 — GPT-backed semantic match. Fire-and-forget so the
    // sync caller (transcript loop) keeps its existing pointer; if
    // the model reports a confident match we apply it asynchronously
    // and surface it via toast. Fail-soft on any error.
    if (spoken.length >= 8) {
      const inflightKey = `${spoken}::${questions.map(q => q.id).join(',')}`;
      if (!followUpGptInFlightRef.current.has(inflightKey)) {
        followUpGptInFlightRef.current.add(inflightKey);
        (async () => {
          try {
            const res = await fetch('/api/clinical-text/answer-followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spokenText,
                questions: questions.map(q => ({
                  id: q.id, question: q.question, options: q.options,
                })),
              }),
            });
            if (!res.ok) return;
            const data = await res.json();
            const matchedId: string | undefined = data?.questionId;
            const answer: string | undefined = data?.answer;
            const confidence: number = typeof data?.confidence === 'number' ? data.confidence : 0;
            if (!matchedId || !answer || confidence < 0.7) return;
            const fq = questions.find(q => q.id === matchedId);
            if (!fq) return;
            // Re-check the question is still pending — the user may
            // have already answered it manually while we were waiting.
            const stillPending = pendingFollowUpQuestionsRef.current.some(q => q.id === matchedId);
            if (!stillPending) return;
            clinicalTextInputRef.current?.submitFollowUpAnswer(matchedId, answer);
            toast({
              title: 'Follow-up Answered',
              description: `Answered: "${fq.question.substring(0, 50)}..."`,
            });
          } catch { /* fail-soft */ }
          finally { followUpGptInFlightRef.current.delete(inflightKey); }
        })();
      }
    }

    return false;
  }, [toast]);

  const stopRecording = async () => {
    if (voiceAutoSubmitTimerRef.current) {
      clearTimeout(voiceAutoSubmitTimerRef.current);
      voiceAutoSubmitTimerRef.current = null;
    }
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

    if (finalTranscript.length > VOICE_MIN_PARSE_LENGTH) {
      const pendingQuestions = pendingFollowUpQuestionsRef.current;
      if (pendingQuestions.length > 0) {
        const matched = tryMatchFollowUpAnswer(finalTranscript, pendingQuestions);
        if (matched) {
          setLiveTranscript("");
          setInterimTranscript("");
          return;
        }
      }

      voiceAutoSubmitTimerRef.current = setTimeout(() => {
        if (clinicalTextInputRef.current) {
          // Voice transcript no longer mirrors into the Clinical
          // Prediction textarea, so feed the final transcript through
          // the incremental-parse path with a textOverride. Tag it as
          // a silence_pause so it shows up in the Voice Activity dock
          // alongside any in-flight chunks.
          const tailChunk = finalTranscript.slice(lastAnalyzedLengthRef.current).trim() || finalTranscript;
          pendingVoiceTriggerRef.current = {
            trigger: 'silence_pause',
            chunkText: tailChunk,
            timestamp: Date.now(),
            recordingTimeSec: recordingStartedAtRef.current
              ? (Date.now() - recordingStartedAtRef.current) / 1000
              : 0,
          };
          const dispatched = clinicalTextInputRef.current.triggerIncrementalParse(finalTranscript);
          if (dispatched) {
            lastAnalyzedLengthRef.current = finalTranscript.length;
            toast({ title: "Analyzing Voice Input", description: "Updating skeleton from your clinical description..." });
          } else {
            pendingVoiceTriggerRef.current = null;
          }
        }
        voiceAutoSubmitTimerRef.current = null;
      }, VOICE_STOP_DEBOUNCE_MS);
      isAnalyzingRef.current = false;
      setLiveTranscript("");
      setInterimTranscript("");
    } else if (finalTranscript.length > 0 && finalTranscript.length <= VOICE_MIN_PARSE_LENGTH) {
      toast({ title: "Recording too short", description: "Please speak a bit more for clinical analysis", variant: "destructive" });
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
          },
          currentPoseState: modelConfig
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
                    // The conversation that was just created is initialised
                    // FROM the current workspace state, so treat it as already
                    // hydrated and trigger an immediate snapshot save instead
                    // of waiting for the next user-driven state change.
                    if (newConversationId != null) {
                      hydratedConversationIdRef.current = newConversationId;
                      snapshotEligibleRef.current.add(newConversationId);
                      lastSavedSnapshotRef.current = "";
                      setSnapshotSaveCounter(c => c + 1);
                    }
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
                  case 'poseCommand':
                    applyPoseCommand(data.data);
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
    const mechanism = classifyPainMechanism(landmark.label, `Pain at ${landmark.label}`, 'point');
    const newMarker: PainMarker = {
      id: `landmark-${Date.now()}`,
      type: 'point',
      position: landmark.position,
      nearestBone: landmark.boneName,
      anatomicalLabel: landmark.label,
      description: `Pain at ${landmark.label}`,
      painMechanism: mechanism,
    };
    setPainMarkers(prev => [...prev, newMarker]);
    setClinicalBubbleMarker(newMarker);
    setClinicalBubbleSeverity("moderate");
    toast({ title: "Landmark Marked", description: `Pain marker placed at ${landmark.label}` });
  }, [toast]);

  const activeSymptomTypeRef = useRef(activeSymptomType);
  activeSymptomTypeRef.current = activeSymptomType;

  const handlePainMarkerAdd = useCallback((marker: PainMarker) => {
    const mechanism = classifyPainMechanism(
      marker.anatomicalLabel,
      marker.description,
      marker.type,
      activeSymptomTypeRef.current
    );
    const markerWithSymptom = { ...marker, symptomType: activeSymptomTypeRef.current, painMechanism: mechanism };
    setPainMarkers(prev => [...prev, markerWithSymptom]);
    setClinicalBubbleMarker(markerWithSymptom);
    setClinicalBubbleSeverity("moderate");
  }, []);

  const clinicalTextAppliedRef = useRef<{
    markerIds: string[];
    muscleIds: string[];
    deviationKeys: string[];
    /** Legacy/fallback: clear-all uses these for highlights inserted
     *  without an instanceId. */
    highlightLabels: string[];
    /** Per-highlight instance ids stamped at insert time. Clear-all
     *  removes these specific instances; per-entry undo also removes
     *  them so subsequent clear-all stays correct. Required to avoid
     *  label-collision regressions when fallback labels like
     *  `ctp_${region}_${type}` repeat across parses. */
    highlightInstanceIds: string[];
    predictionText: string;
  } | null>(null);

  // Per-entry voice activity log + per-entry undo bookkeeping. Lives
  // alongside the cumulative clinicalTextAppliedRef so "Clear All" still
  // wipes everything voice has touched in one shot, while individual
  // dock entries can be rolled back surgically.
  interface VoiceActivityEntryRecord extends VoiceActivityEntry {
    /** Marker ids this entry added (used to undo just this entry). */
    appliedMarkerIds: string[];
    /** Muscle overrides this entry set: id → exact value applied. Only
     *  reverted by undo if the current override still equals what we set
     *  (otherwise a later entry has overwritten it). */
    appliedMuscleOverrides: Record<string, MuscleOverride>;
    /** Postural deviations this entry wrote: dotPath → { prev, set }.
     *  Undo restores `prev` only if the current value still equals
     *  `set`. */
    appliedDeviations: Record<string, { prev: number; set: number }>;
    /** Region highlight labels this entry added (kept for diagnostics
     *  / parity with the cumulative ref). */
    appliedHighlightLabels: string[];
    /** Per-highlight instance ids stamped at insert time. Used by
     *  undo to remove only the highlights this entry contributed,
     *  even when later entries reuse the same fallback label. */
    appliedHighlightInstanceIds: string[];
    /** Compromised tissues snapshot taken BEFORE this entry overwrote
     *  them. Undo restores this snapshot only if this entry was the
     *  most recent one to overwrite the list. */
    prevCompromisedTissues: CompromisedTissue[] | null;
    /** True if this entry overwrote the compromised tissues list. */
    overwroteCompromisedTissues: boolean;
  }
  const [voiceActivityEntries, setVoiceActivityEntries] = useState<VoiceActivityEntryRecord[]>([]);
  const voiceActivityEntriesRef = useRef<VoiceActivityEntryRecord[]>([]);
  voiceActivityEntriesRef.current = voiceActivityEntries;
  const [voiceDockVisible, setVoiceDockVisible] = useState(false);
  /** Bumped on session reset; used as a React key so the dock fully
   *  remounts and clears its internal collapse/unread preferences. */
  const [voiceDockSessionKey, setVoiceDockSessionKey] = useState(0);
  // (recordingStartedAtRef hoisted above the autopilot governor.)
  /** Trigger metadata set by the silence-debounce / interval-pulse paths
   *  immediately before they call triggerIncrementalParse. The next call
   *  to handleClinicalTextParse consumes it (and clears it). */
  const pendingVoiceTriggerRef = useRef<{
    trigger: VoiceTriggerReason;
    chunkText: string;
    timestamp: number;
    recordingTimeSec: number;
  } | null>(null);
  // Mirrored refs so handleClinicalTextParse can snapshot prior state
  // (deviations, compromised tissues) without changing its useCallback
  // identity each render.
  const modelConfigRef = useRef(modelConfig);
  modelConfigRef.current = modelConfig;
  const muscleOverridesRef = useRef(muscleOverrides);
  muscleOverridesRef.current = muscleOverrides;
  const compromisedTissuesRef = useRef(compromisedTissues);
  compromisedTissuesRef.current = compromisedTissues;
  const skeletonModeRef = useRef<'posture' | 'movement'>(skeletonMode);
  skeletonModeRef.current = skeletonMode;

  const handleClinicalTextParse = useCallback((result: ClinicalParseResult) => {
    // Retain the latest parse for the Patient Context panel (used for
    // stale-fingerprint comparison + condition-specific prompt
    // generation).
    setLastClinicalParseResult(result);
    const applied: { markerIds: string[]; muscleIds: string[]; deviationKeys: string[]; highlightLabels: string[] } = {
      markerIds: [], muscleIds: [], deviationKeys: [], highlightLabels: [],
    };
    // Per-entry tracking for the Voice Activity dock — only consumed if
    // the parse came from a voice trigger (pendingVoiceTriggerRef set).
    const perEntry: {
      muscleOverridesSet: Record<string, MuscleOverride>;
      deviationsSet: Record<string, { prev: number; set: number }>;
      highlightInstanceIds: string[];
      prevCompromisedTissues: CompromisedTissue[] | null;
      overwroteCompromisedTissues: boolean;
    } = {
      muscleOverridesSet: {},
      deviationsSet: {},
      highlightInstanceIds: [],
      prevCompromisedTissues: null,
      overwroteCompromisedTissues: false,
    };

    if (result.pain_markers.length > 0) {
      const newMarkers: PainMarker[] = result.pain_markers.map((pm, idx) => {
        const vp = ANATOMICAL_VIRTUAL_POINTS.find(
          p => p.label.toLowerCase().includes(pm.anatomical_label.toLowerCase()) ||
               pm.anatomical_label.toLowerCase().includes(p.label.toLowerCase().split(' (')[0])
        );
        const markerId = `ctp_${Date.now()}_${idx}`;
        applied.markerIds.push(markerId);
        const mType = (pm.type || 'point') as PainMarkerType;
        const sType = (pm.symptom_type || 'pain') as SymptomType;
        const mechanism = classifyPainMechanism(
          vp ? vp.label : pm.anatomical_label,
          pm.description,
          mType,
          sType
        );
        if (vp) {
          return {
            id: markerId,
            type: mType,
            symptomType: sType,
            position: { x: 0, y: 0, z: 0 },
            nearestBone: vp.boneName,
            anatomicalLabel: vp.label,
            description: pm.description,
            painMechanism: mechanism,
          };
        }
        return {
          id: markerId,
          type: mType,
          symptomType: sType,
          position: { x: 0, y: 0, z: 0 },
          nearestBone: 'Root_M',
          anatomicalLabel: pm.anatomical_label,
          description: pm.description,
          painMechanism: mechanism,
        };
      });
      setPainMarkers(prev => [...prev, ...newMarkers]);
    }

    if (result.muscle_states.length > 0) {
      setMuscleOverrides(prev => {
        const updated = { ...prev };
        for (const ms of result.muscle_states) {
          applied.muscleIds.push(ms.muscle_id);
          const next: MuscleOverride = {
            tensionOffset: ms.tension_offset || 0,
            activationOffset: ms.activation_offset || 0,
            lengthOverride: 'normal' as LengthOverride,
            inhibition: ms.inhibition || 0,
            pathology: (ms.pathology || 'none') as PathologyType,
            isManual: true,
          };
          updated[ms.muscle_id] = next;
          perEntry.muscleOverridesSet[ms.muscle_id] = next;
        }
        return updated;
      });
    }

    if (Object.keys(result.postural_deviations).length > 0) {
      applied.deviationKeys = Object.keys(result.postural_deviations);
      setModelConfig(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const prevAny = prev as unknown as Record<string, Record<string, number> | unknown>;
        for (const [dotPath, value] of Object.entries(result.postural_deviations)) {
          const parts = dotPath.split('.');
          if (parts.length === 2) {
            const [joint, param] = parts;
            if (updated[joint] && typeof updated[joint] === 'object') {
              const prevJoint = prevAny[joint];
              const prevVal = prevJoint && typeof prevJoint === 'object'
                ? (prevJoint as Record<string, number>)[param] ?? 0
                : 0;
              perEntry.deviationsSet[dotPath] = { prev: prevVal, set: value };
              updated[joint][param] = value;
            }
          }
        }
        return updated;
      });
    }

    if (result.region_highlights.length > 0) {
      const typeMap: Record<string, HighlightType> = {
        pain: 'pain', pathology: 'dysfunction', movement_loss: 'stiffness',
        weakness: 'weakness', instability: 'dysfunction', stiffness: 'stiffness',
        dysfunction: 'dysfunction', referral: 'referral',
      };
      const highlights: RegionHighlight[] = result.region_highlights.map((rh, idx) => {
        const label = rh.label || `ctp_${rh.region}_${rh.type}`;
        // Stamp a unique instanceId so per-entry undo can remove
        // exactly the highlights this parse contributed without
        // clobbering newer highlights that happen to share a fallback
        // label like `ctp_${region}_${type}`.
        const instanceId = `vh_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
        applied.highlightLabels.push(label);
        perEntry.highlightInstanceIds.push(instanceId);
        return {
          region: rh.region as AnatomicalRegion,
          type: typeMap[rh.type] || 'pain',
          severity: rh.severity,
          label,
          instanceId,
        };
      });
      setClinicalHighlights(prev => [...prev, ...highlights]);
    }

    // Compromised tissues: any mutation of the list (including
    // clearing it to empty when the parse returned none) counts as an
    // overwrite for undo purposes — otherwise voice-driven clears
    // would silently strip a previous parse's tissues with no way to
    // restore them.
    if (result.compromised_tissues && result.compromised_tissues.length > 0) {
      const validatedTissues = result.compromised_tissues
        .filter((ct: CompromisedTissue) => {
          const validEntries = getTissueEntriesForMode(ct.tissue_type);
          return validEntries.some(e => e.id === ct.tissue_id);
        })
        .map((ct: CompromisedTissue) => ({
          ...ct,
          severity: Math.max(0, Math.min(1, ct.severity)),
        }));
      perEntry.prevCompromisedTissues = compromisedTissuesRef.current;
      perEntry.overwroteCompromisedTissues = true;
      setCompromisedTissues(validatedTissues);
      if (validatedTissues.length > 0 && !tissueViewManualRef.current) {
        const typeCounts: Record<string, number> = {};
        const typeSeverity: Record<string, number> = {};
        for (const ct of validatedTissues) {
          typeCounts[ct.tissue_type] = (typeCounts[ct.tissue_type] || 0) + 1;
          typeSeverity[ct.tissue_type] = Math.max(typeSeverity[ct.tissue_type] || 0, ct.severity);
        }
        let bestMode: "tendon" | "nerve" | "joint" | "fascia" = "tendon";
        let bestScore = -1;
        for (const [type, count] of Object.entries(typeCounts)) {
          const score = count * 2 + (typeSeverity[type] || 0) * 3;
          if (score > bestScore) {
            bestScore = score;
            bestMode = type as typeof bestMode;
          }
        }
        setTissueViewMode(bestMode);
        setSelectedTissueEntry(null);
      }
    } else {
      // Empty-result branch: still counts as an overwrite when there
      // were tissues before, so the entry can be undone.
      const prevTissues = compromisedTissuesRef.current;
      if (prevTissues.length > 0) {
        perEntry.prevCompromisedTissues = prevTissues;
        perEntry.overwroteCompromisedTissues = true;
      }
      setCompromisedTissues([]);
    }

    const originalDesc = result.original_description || '';
    const summary = result.clinical_summary || '';
    const predictionText = (originalDesc || summary)
      ? `[Clinical Prediction] ${originalDesc}${summary && originalDesc ? '\n' : ''}${summary !== originalDesc ? summary : ''}`
      : '';

    if (predictionText) {
      const previousPrediction = clinicalTextAppliedRef.current?.predictionText || '';
      if (previousPrediction && subjectiveHistoryRef.current.includes(previousPrediction)) {
        subjectiveHistoryRef.current = subjectiveHistoryRef.current.replace(previousPrediction, '').trim();
      }
      const updated = subjectiveHistoryRef.current
        ? `${subjectiveHistoryRef.current}\n\n${predictionText}`
        : predictionText;
      subjectiveHistoryRef.current = updated;
      setSubjectiveHistoryInput(updated);
      lastReasoningTriggerRef.current = '';
      setTimeout(() => triggerClinicalReasoningAnalysisRef.current(true), 300);
    }

    const prev = clinicalTextAppliedRef.current;
    clinicalTextAppliedRef.current = {
      markerIds: [...(prev?.markerIds || []), ...applied.markerIds],
      muscleIds: [...(prev?.muscleIds || []), ...applied.muscleIds],
      deviationKeys: [...(prev?.deviationKeys || []), ...applied.deviationKeys],
      highlightLabels: [...(prev?.highlightLabels || []), ...applied.highlightLabels],
      highlightInstanceIds: [...(prev?.highlightInstanceIds || []), ...perEntry.highlightInstanceIds],
      predictionText,
    };
    const hasFindings = applied.markerIds.length > 0 || applied.muscleIds.length > 0 || applied.highlightLabels.length > 0;
    if (hasFindings) {
      setHasClinicalTextData(true);
    }

    // If this parse came from a voice trigger (silence pause / interval
    // pulse), record an entry into the Voice Activity dock so the
    // clinician can see exactly what fired and undo it surgically.
    const triggerCtx = pendingVoiceTriggerRef.current;
    pendingVoiceTriggerRef.current = null;
    if (triggerCtx) {
      const counts = {
        painMarkers: applied.markerIds.length,
        muscleOverrides: applied.muscleIds.length,
        posturalDeviations: applied.deviationKeys.length,
        regionHighlights: applied.highlightLabels.length,
        compromisedTissuesUpdated: perEntry.overwroteCompromisedTissues,
      };
      const noChanges =
        counts.painMarkers === 0 &&
        counts.muscleOverrides === 0 &&
        counts.posturalDeviations === 0 &&
        counts.regionHighlights === 0 &&
        !counts.compromisedTissuesUpdated;
      const entry: VoiceActivityEntryRecord = {
        id: `va_${triggerCtx.timestamp}_${Math.random().toString(36).slice(2, 7)}`,
        trigger: triggerCtx.trigger,
        recordingTimeSec: triggerCtx.recordingTimeSec,
        timestamp: triggerCtx.timestamp,
        chunkText: triggerCtx.chunkText,
        clinicalSummary: result.clinical_summary || '',
        counts,
        noChanges,
        undone: false,
        appliedMarkerIds: [...applied.markerIds],
        appliedMuscleOverrides: perEntry.muscleOverridesSet,
        appliedDeviations: perEntry.deviationsSet,
        appliedHighlightLabels: [...applied.highlightLabels],
        appliedHighlightInstanceIds: [...perEntry.highlightInstanceIds],
        prevCompromisedTissues: perEntry.prevCompromisedTissues,
        overwroteCompromisedTissues: perEntry.overwroteCompromisedTissues,
      };
      // Prepend so the most recent entry is at the top.
      setVoiceActivityEntries(prevEntries => [entry, ...prevEntries]);
      setVoiceDockVisible(true);
    }
  }, []);

  const handleClinicalTextClear = useCallback(() => {
    const applied = clinicalTextAppliedRef.current;
    if (!applied) return;

    if (applied.markerIds.length > 0) {
      setPainMarkers(prev => prev.filter(m => !applied.markerIds.includes(m.id)));
    }
    if (applied.muscleIds.length > 0) {
      setMuscleOverrides(prev => {
        const updated = { ...prev };
        for (const id of applied.muscleIds) {
          delete updated[id];
        }
        return updated;
      });
    }
    if (applied.deviationKeys.length > 0) {
      setModelConfig(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const defaults = JSON.parse(JSON.stringify(DEFAULT_MODEL_CONFIG));
        for (const dotPath of applied.deviationKeys) {
          const parts = dotPath.split('.');
          if (parts.length === 2) {
            const [joint, param] = parts;
            if (updated[joint] && defaults[joint]) {
              updated[joint][param] = defaults[joint][param] ?? 0;
            }
          }
        }
        return updated;
      });
    }
    if (applied.highlightInstanceIds.length > 0 || applied.highlightLabels.length > 0) {
      const idsToRemove = new Set(applied.highlightInstanceIds);
      const labelsToRemove = new Set(applied.highlightLabels);
      // Prefer instance-id matching (correct under fallback-label
      // collisions); fall back to label match only for highlights
      // that have no instanceId (legacy / non-voice insertions).
      setClinicalHighlights(prev => prev.filter(h => {
        if (h.instanceId) return !idsToRemove.has(h.instanceId);
        return !labelsToRemove.has(h.label || '');
      }));
    }

    if (applied.predictionText && subjectiveHistoryRef.current.includes(applied.predictionText)) {
      const cleaned = subjectiveHistoryRef.current.replace(applied.predictionText, '').replace(/\n{3,}/g, '\n\n').trim();
      subjectiveHistoryRef.current = cleaned;
      setSubjectiveHistoryInput(cleaned);
      lastReasoningTriggerRef.current = '';
      setTimeout(() => triggerClinicalReasoningAnalysisRef.current(true), 300);
    }

    setCompromisedTissues([]);
    tissueViewManualRef.current = false;

    clinicalTextAppliedRef.current = null;
    setHasClinicalTextData(false);
    // Drop the lifted parse + patient-context state — clearing the
    // skeleton means we no longer have a prediction the prompts apply
    // to.
    setLastClinicalParseResult(null);
    setPatientContextState(EMPTY_PATIENT_CONTEXT_STATE);
  }, []);

  /**
   * Per-entry undo for the Voice Activity dock.
   *
   * Reverts only the contributions of a single dock entry:
   *   - Removes the pain markers it added.
   *   - Deletes muscle overrides it set (only when the current value
   *     still matches what this entry set — otherwise a later entry has
   *     overwritten it and we leave it alone).
   *   - Restores postural-deviation values to the pre-entry value
   *     (again only when the current value still matches what this
   *     entry set).
   *   - Removes the region highlights this entry added by label.
   *   - Restores the compromised-tissues snapshot if this entry was the
   *     most recent one to overwrite that list (otherwise leave alone).
   *
   * Also updates the cumulative `clinicalTextAppliedRef` so that a
   * later "Clear All" doesn't try to re-undo the same things and so it
   * still cleans up everything that's still attributable to voice.
   */
  const handleVoiceActivityUndo = useCallback((entryId: string) => {
    const entries = voiceActivityEntriesRef.current;
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.undone) return;

    if (entry.appliedMarkerIds.length > 0) {
      const ids = new Set(entry.appliedMarkerIds);
      setPainMarkers(prev => prev.filter(m => !ids.has(m.id)));
    }

    const muscleEntries = Object.entries(entry.appliedMuscleOverrides);
    if (muscleEntries.length > 0) {
      setMuscleOverrides(prev => {
        const updated = { ...prev };
        for (const [id, setVal] of muscleEntries) {
          const curr = updated[id];
          if (!curr) continue;
          // Only revert if still equal to what this entry set.
          if (
            curr.tensionOffset === setVal.tensionOffset &&
            curr.activationOffset === setVal.activationOffset &&
            curr.lengthOverride === setVal.lengthOverride &&
            curr.inhibition === setVal.inhibition &&
            curr.pathology === setVal.pathology
          ) {
            delete updated[id];
          }
        }
        return updated;
      });
    }

    const deviationEntries = Object.entries(entry.appliedDeviations);
    if (deviationEntries.length > 0) {
      setModelConfig(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        for (const [dotPath, { prev: prevVal, set: setVal }] of deviationEntries) {
          const parts = dotPath.split('.');
          if (parts.length !== 2) continue;
          const [joint, param] = parts;
          if (!updated[joint] || typeof updated[joint] !== 'object') continue;
          const currVal = (updated[joint] as Record<string, number>)[param];
          if (currVal === setVal) {
            (updated[joint] as Record<string, number>)[param] = prevVal;
          }
        }
        return updated;
      });
    }

    if (entry.appliedHighlightInstanceIds.length > 0) {
      const ids = new Set(entry.appliedHighlightInstanceIds);
      // Remove only the exact highlight instances this entry inserted.
      // Filtering by label would clobber newer highlights that share
      // a fallback label like `ctp_${region}_${type}`.
      setClinicalHighlights(prev => prev.filter(h => !h.instanceId || !ids.has(h.instanceId)));
    }

    if (entry.overwroteCompromisedTissues) {
      // Only restore if no later entry has since overwritten the
      // compromised-tissues list. Entries are stored newest-first so
      // a later overwrite would appear *before* this entry in the
      // array.
      const later = entries.findIndex(e => e.id === entryId);
      const hasLaterOverwrite = entries.slice(0, later).some(e => e.overwroteCompromisedTissues && !e.undone);
      if (!hasLaterOverwrite) {
        setCompromisedTissues(entry.prevCompromisedTissues || []);
      }
    }

    // Update cumulative ref so a later "Clear All" doesn't try to
    // undo the same things, and so it still cleans up the rest of
    // what's still attributable to voice.
    const prevApplied = clinicalTextAppliedRef.current;
    if (prevApplied) {
      const removedMarkers = new Set(entry.appliedMarkerIds);
      const removedMuscles = new Set(Object.keys(entry.appliedMuscleOverrides));
      const removedDeviations = new Set(Object.keys(entry.appliedDeviations));
      const removedInstanceIds = new Set(entry.appliedHighlightInstanceIds);
      // For label-only entries we have to remove labels one-per-undo so
      // we don't strip labels that belong to other still-active entries
      // (fallback labels like `ctp_${region}_${type}` repeat across
      // parses). Drop one occurrence per appliedHighlightLabels entry.
      let remainingLabels = [...prevApplied.highlightLabels];
      for (const lbl of entry.appliedHighlightLabels) {
        const idx = remainingLabels.indexOf(lbl);
        if (idx >= 0) remainingLabels.splice(idx, 1);
      }
      clinicalTextAppliedRef.current = {
        markerIds: prevApplied.markerIds.filter(id => !removedMarkers.has(id)),
        muscleIds: prevApplied.muscleIds.filter(id => !removedMuscles.has(id)),
        deviationKeys: prevApplied.deviationKeys.filter(k => !removedDeviations.has(k)),
        highlightLabels: remainingLabels,
        highlightInstanceIds: prevApplied.highlightInstanceIds.filter(id => !removedInstanceIds.has(id)),
        predictionText: prevApplied.predictionText,
      };
    }

    setVoiceActivityEntries(prev => prev.map(e => e.id === entryId ? { ...e, undone: true } : e));
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
    'thoracic': ['Spine1_M', 'Spine1Part2_M', 'Chest_M'],
    'lumbar': ['RootPart1_M'],
    'low back': ['RootPart1_M'],
    'pelvis': ['RootPart1_M', 'Hip_L', 'Hip_R'],
    'spine': ['RootPart1_M', 'Spine1_M', 'Spine1Part2_M', 'Chest_M'],
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

  const handleDecisionTargetClick = useCallback((regions: string[]) => {
    const muscleGroupIds = new Set<string>();
    const boneHighlights: Array<{ boneName: string; color: number; intensity: number }> = [];
    const highlightColor = 0x10b981;

    for (const region of regions) {
      const lower = region.toLowerCase().trim();
      if (BIOMECHANICAL_REGION_TO_MUSCLES[lower]) {
        BIOMECHANICAL_REGION_TO_MUSCLES[lower].forEach(m => muscleGroupIds.add(m));
      } else {
        for (const [key, muscles] of Object.entries(BIOMECHANICAL_REGION_TO_MUSCLES)) {
          if (key.includes(lower) || lower.includes(key)) {
            muscles.forEach(m => muscleGroupIds.add(m));
            break;
          }
        }
      }

      for (const [key, bones] of Object.entries(REGION_TO_BONE_NAMES)) {
        if (key.includes(lower) || lower.includes(key)) {
          bones.forEach(b => boneHighlights.push({ boneName: b, color: highlightColor, intensity: 0.6 }));
        }
      }
    }

    const colorMap: Record<string, string> = {};
    muscleGroupIds.forEach(m => { colorMap[m] = '#10b981'; });
    setBiomechanicalMuscleHighlights(Array.from(muscleGroupIds));
    setMuscleHighlightColors(colorMap);
    setVisualizationBoneHighlights(boneHighlights);
  }, [BIOMECHANICAL_REGION_TO_MUSCLES, REGION_TO_BONE_NAMES]);

  // Optimal Loading Engine — clinician-facing handlers (Task #231).
  // Persist override → bump reload key → /api/treatment-plan/generate refetches
  // and the engine handshake re-runs with the new override applied.
  const handlePlanLoadingRecalculate = useCallback(() => {
    setTreatmentPlanReloadKey(k => k + 1);
  }, []);

  const handlePlanLoadingOverride = useCallback(async (
    override: import('@/components/skeleton/PlanTab').LoadingOverridePayload,
  ) => {
    const condition = extractionResult?.mainComplaint;
    if (!condition) return;
    try {
      await apiRequest(`/api/loading-context/${encodeURIComponent(condition)}/overrides`, 'PUT', {
        override,
        sessionPrescriptionNum: sessionPrescriptionNum ?? undefined,
      });
      setTreatmentPlanReloadKey(k => k + 1);
    } catch (e) {
      console.error('Failed to save loading override:', e);
    }
  }, [extractionResult?.mainComplaint, sessionPrescriptionNum]);

  const handlePlanLoadingClearOverride = useCallback(async (
    exerciseId: string,
    weekIndex: number,
  ) => {
    const condition = extractionResult?.mainComplaint;
    if (!condition) return;
    try {
      const qs = sessionPrescriptionNum != null ? `?sessionPrescriptionNum=${sessionPrescriptionNum}` : '';
      await apiRequest(
        `/api/loading-context/${encodeURIComponent(condition)}/overrides/${encodeURIComponent(exerciseId)}/${weekIndex}${qs}`,
        'DELETE',
      );
      setTreatmentPlanReloadKey(k => k + 1);
    } catch (e) {
      console.error('Failed to clear loading override:', e);
    }
  }, [extractionResult?.mainComplaint, sessionPrescriptionNum]);

  const handleEvidenceQuery = useCallback(() => {
    if (evidenceAbortRef.current) {
      evidenceAbortRef.current.abort();
    }

    const firstBubble = Object.values(clinicalBubbleResults)[0];
    const bubbleDiagnosis = firstBubble?.data?.hypotheses?.[0]?.condition;
    const reasoningDiagnosis = clinicalReasoningData?.hypotheses?.[0]?.condition;
    const diagnosis = bubbleDiagnosis || reasoningDiagnosis || '';

    const regions: string[] = [];
    painMarkers.forEach(pm => {
      const r = (pm.anatomicalLabel || pm.nearestBone || '').toLowerCase();
      if (r && !regions.includes(r)) regions.push(r);
    });

    if (!diagnosis && regions.length === 0) return;

    const abortController = new AbortController();
    evidenceAbortRef.current = abortController;
    evidenceQueryIdRef.current += 1;
    const currentQueryId = evidenceQueryIdRef.current;

    setEvidenceLoading(true);
    const sa = slingAnalysisRef.current;
    const slingCtx = sa ? {
      weakLinks: sa.slings.filter((s: { status: string }) => s.status === 'underperforming').flatMap((s: { weakLinks: string[] }) => s.weakLinks),
      forceTransferScore: sa.overallForceTransferScore,
      dominantDysfunction: sa.dominantDysfunction,
    } : undefined;
    const irritabilityLevel = firstBubble?.data?.irritability?.level || structuredReasoningData?.irritability?.level;
    fetch('/api/evidence-engine/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: abortController.signal,
      body: JSON.stringify({
        diagnosis,
        bodyRegions: regions.length > 0 ? regions : undefined,
        structuredReasoning: structuredReasoningData || firstBubble?.data || undefined,
        sling: slingCtx,
        tissueType: tissueViewMode || undefined,
        loadTolerance: irritabilityLevel === 'high' ? 'low' : irritabilityLevel === 'low' ? 'high' : 'moderate',
        patientContext: {
          goals: firstBubble?.data?.problemClass ? [firstBubble.data.problemClass.primary] : undefined,
        },
      }),
    })
    .then(r => { if (!r.ok) throw new Error('Evidence query failed'); return r.json(); })
    .then(data => {
      if (evidenceQueryIdRef.current === currentQueryId) {
        setEvidenceEngineResult(data);
      }
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return;
      if (evidenceQueryIdRef.current === currentQueryId) {
        toast({ title: 'Evidence query failed', description: 'Could not fetch evidence catalog results.', variant: 'destructive' });
      }
    })
    .finally(() => {
      if (evidenceQueryIdRef.current === currentQueryId) {
        setEvidenceLoading(false);
        if (evidenceAbortRef.current === abortController) {
          evidenceAbortRef.current = null;
        }
      }
    });
  }, [painMarkers, clinicalBubbleResults, clinicalReasoningData, structuredReasoningData, tissueViewMode, toast]);

  handleEvidenceQueryRef.current = handleEvidenceQuery;

  const handleManualEvidenceQuery = useCallback((params: { diagnosis?: string; bodyRegions?: string[]; stage?: string; irritability?: string; mechanism?: string }) => {
    if (evidenceLoading) return;
    setEvidenceLoading(true);
    fetch('/api/evidence-engine/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diagnosis: params.diagnosis,
        bodyRegions: params.bodyRegions,
        stage: params.stage,
        irritability: params.irritability,
        mechanism: params.mechanism,
      }),
    })
    .then(r => { if (!r.ok) throw new Error('Evidence query failed'); return r.json(); })
    .then(data => setEvidenceEngineResult(data))
    .catch(() => { toast({ title: 'Evidence query failed', description: 'Could not fetch evidence results.', variant: 'destructive' }); })
    .finally(() => setEvidenceLoading(false));
  }, [evidenceLoading, toast]);

  const handleHypothesisClick = useCallback((hypothesis: ClinicalHypothesis) => {
    setSelectedHypothesisForChat({
      id: hypothesis.id,
      condition: hypothesis.condition,
      confidence: hypothesis.confidence,
      supportingEvidence: hypothesis.supportingEvidence,
      rulingOutFactors: hypothesis.rulingOutFactors,
    });
    setHypothesisChatOpen(true);
  }, []);

  const handleTestHypothesisClick = useCallback((hypothesis: ClinicalHypothesis) => {
    setTestBenchHypothesis({
      id: hypothesis.id,
      condition: hypothesis.condition,
      confidence: hypothesis.confidence,
      supportingEvidence: hypothesis.supportingEvidence,
      rulingOutFactors: hypothesis.rulingOutFactors,
    });
    setTestBenchOpen(true);
  }, []);

  const handleTestStructuredHypothesisClick = useCallback((hypothesis: StructuredHypothesis) => {
    setTestBenchHypothesis({
      id: hypothesis.id,
      condition: hypothesis.condition,
      confidence: hypothesis.confidence,
      supportingEvidence: hypothesis.supporting.map(s => s.feature),
      rulingOutFactors: hypothesis.contradicting.map(c => c.feature),
    });
    setTestBenchOpen(true);
  }, []);

  const handleStructuredHypothesisClick = useCallback((hypothesis: StructuredHypothesis) => {
    const ctx = structuredReasoningData;
    setSelectedHypothesisForChat({
      id: hypothesis.id,
      condition: hypothesis.condition,
      confidence: hypothesis.confidence,
      supportingEvidence: hypothesis.supporting.map(s => s.feature),
      rulingOutFactors: hypothesis.contradicting.map(c => c.feature),
      structuredContext: {
        dominantDriver: ctx?.dominantSymptomDriver?.driver,
        mechanism: ctx?.dominantMechanism?.mechanism,
        stage: ctx?.stage?.stage,
        irritability: ctx?.irritability?.level,
        modifiers: ctx?.modifiers?.flatMap(m => (m.modifiers ?? []).map(i => `${m.category}: ${i}`)),
        mustNotMiss: ctx?.mustNotMiss?.map(m => m.condition),
        fingerprintMatchScore: hypothesis.fingerprintMatchScore,
      },
    });
    setHypothesisChatOpen(true);
  }, [structuredReasoningData]);

  useEffect(() => {
    if (!structuredReasoningData) {
      setTreatmentDecisionData(null);
      return;
    }
    const abortController = new AbortController();
    setTreatmentDecisionData(null);
    setTreatmentDecisionLoading(true);
    const bioSrc = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput;
    const biomechanicsCtx = bioSrc ? {
      faults: bioSrc.faults.faults.map(f => ({ label: f.label, severity: f.severity, category: f.category, clinical: f.clinical, corrective: f.corrective })),
      deviations: bioSrc.posture.deviations.map(d => ({ pattern: d.pattern, region: d.region, severity: d.severity, angleDeg: d.angleDeg })),
      peakJoint: bioSrc.forces.peakJoint,
      peakForceBW: bioSrc.forces.peakForceBW,
      qualityScore: bioSrc.qualityScore,
      clinicalSummary: bioSrc.clinicalSummary,
      movementTaskId: unifiedBiomechanicsMovementTask ?? undefined,
    } : undefined;
    const slingInput: SlingAnalysisInput = {
      biomechanicsOutput: bioSrc,
      muscleOverrides: muscleOverrides as Record<string, { tension?: number; pathology?: string }> | undefined,
      movementTaskId: unifiedBiomechanicsMovementTask ?? undefined,
    };
    const currentSlingAnalysis = computeSlingAnalysis(slingInput);
    const slingCtx = currentSlingAnalysis ? {
      overallForceTransferScore: currentSlingAnalysis.overallForceTransferScore,
      dominantDysfunction: currentSlingAnalysis.dominantDysfunction,
      dysfunctionalSlings: currentSlingAnalysis.slings
        .filter(s => s.status !== 'normal')
        .map(s => ({
          sling: s.label,
          status: s.status,
          activationScore: s.activationScore,
          forceTransfer: s.forceTransferQuality,
          weakLinks: s.weakLinks.map(w => w.muscle),
          treatmentTargets: s.treatmentTargets.map(t => ({ muscle: t.muscle, intervention: t.intervention, rationale: t.rationale })),
        })),
    } : undefined;
    const currentMechanismResult = mechanismAnalysisResult;
    const mechCtx = currentMechanismResult ? (() => {
      try {
        const mechTx = generateMechanismTreatments(currentMechanismResult);
        return {
          topTargets: mechTx.targets.slice(0, 8).map(t => ({
            structure: t.structure,
            category: t.category,
            roles: t.roles ?? [t.category],
            severity: t.severity,
            action: t.action,
            finding: t.finding,
            mechanism: t.mechanism,
            techniques: t.techniques.map(tech => ({
              name: tech.name,
              type: tech.type,
              dosage: tech.dosage,
              rationale: tech.rationale,
              evidenceGrade: tech.evidenceGrade,
            })),
          })),
          overallSummary: mechTx.summary.overallPlan,
          topContributors: currentMechanismResult.topContributors,
          overloadedJointCount: mechTx.summary.overloadedJoints,
          compensationCount: mechTx.summary.compensations,
          rootCauseCount: mechTx.summary.rootCauses,
        };
      } catch (err) {
        console.warn('[MechanismContext] Failed to generate mechanism context for Decision Engine:', err);
        return undefined;
      }
    })() : undefined;
    const input: Record<string, unknown> = {
      structuredReasoning: structuredReasoningData,
      painMarkers: painMarkers.map(pm => ({
        region: pm.anatomicalLabel || pm.nearestBone || '',
        severity: pm.severity ?? 5,
        type: pm.type,
      })),
      postureState: modelConfig,
      extractionContext: extractionResult ?? undefined,
      biomechanicsContext: biomechanicsCtx,
      slingContext: slingCtx,
      mechanismContext: mechCtx,
    };
    fetch('/api/treatment-decision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: abortController.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(result => { if (result && !abortController.signal.aborted) setTreatmentDecisionData(result); })
      .catch(err => { if (err.name !== 'AbortError') console.error('Treatment decision error:', err); })
      .finally(() => { if (!abortController.signal.aborted) setTreatmentDecisionLoading(false); });
    return () => abortController.abort();
  }, [structuredReasoningData, extractionResult]);

  useEffect(() => {
    if (!treatmentDecisionData) {
      setTreatmentPlanData(null);
      setTreatmentPlanLoading(false);
      return;
    }
    const abortController = new AbortController();
    setTreatmentPlanData(null);
    setTreatmentPlanLoading(true);
    const planBioSrc = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput;
    const planBioCtx = planBioSrc ? {
      faults: planBioSrc.faults.faults.map(f => ({ label: f.label, severity: f.severity, corrective: f.corrective })),
      deviations: planBioSrc.posture.deviations.map(d => ({ pattern: d.pattern, region: d.region, angleDeg: d.angleDeg })),
      qualityScore: planBioSrc.qualityScore,
      movementTaskId: unifiedBiomechanicsMovementTask ?? undefined,
    } : undefined;
    let planSlingCtx: Record<string, unknown> | undefined;
    const currentSlingAnalysis = slingAnalysisRef.current;
    if (currentSlingAnalysis) {
      planSlingCtx = {
        overallForceTransferScore: currentSlingAnalysis.overallForceTransferScore,
        dominantDysfunction: currentSlingAnalysis.dominantDysfunction,
        dysfunctionalSlings: currentSlingAnalysis.slings
          .filter(s => s.status !== 'normal')
          .map(s => ({
            sling: s.label,
            status: s.status,
            activationScore: s.activationScore,
            forceTransfer: s.forceTransferQuality,
            weakLinks: s.weakLinks.map(w => w.muscle),
            treatmentTargets: s.treatmentTargets.map(t => ({ muscle: t.muscle, intervention: t.intervention, rationale: t.rationale })),
          })),
      };
    }
    const input = {
      decisionResult: treatmentDecisionData,
      painMarkers: painMarkers.map(pm => ({
        region: pm.anatomicalLabel || pm.nearestBone || '',
        severity: pm.severity ?? 5,
        type: pm.type,
      })),
      postureState: modelConfig,
      extractionContext: extractionResult ?? undefined,
      biomechanicsContext: planBioCtx,
      slingContext: planSlingCtx,
      // Loading-engine handshake (Task #231): when the condition is a
      // tendinopathy, the plan endpoint will replace exercise dosages with
      // engine-prescribed loads.
      conditionName: extractionResult?.mainComplaint ?? undefined,
      sessionPrescriptionNum: sessionPrescriptionNum ?? undefined,
      loadingPatientFactors: extractionResult ? (() => {
        const er = extractionResult;
        const corpus = [er.priorTreatment ?? '', ...(er.relevantHistory ?? [])].join(' \n ').toLowerCase();
        const has = (re: RegExp) => re.test(corpus);
        const sexRaw = (er.patientSex ?? '').toLowerCase();
        const sex: 'male' | 'female' | 'other' | undefined =
          sexRaw.startsWith('m') ? 'male' :
          sexRaw.startsWith('f') ? 'female' :
          sexRaw ? 'other' : undefined;
        return {
          age: er.patientAge ? Number(er.patientAge) : undefined,
          irritability: (er.irritability as 'low' | 'moderate' | 'high' | undefined) ?? undefined,
          recoveryPhase: er.duration === 'acute' ? 'reactive' as const :
            er.duration === 'subacute' ? 'disrepair' as const :
            (er.duration === 'chronic' || er.duration === 'recurrent') ? 'remodelling' as const : undefined,
          history: {
            medicationFlags: {
              statins: has(/\bstatin|atorvastatin|simvastatin|rosuvastatin|pravastatin/),
              fluoroquinolones: has(/\bfluoroquinolone|ciprofloxacin|levofloxacin|moxifloxacin|ofloxacin/),
              corticosteroids: has(/\bcorticosteroid|prednisolone|prednisone|dexamethasone|methylprednisolone|cortisone|hydrocortisone/),
              aromataseInhibitors: has(/\baromatase inhibitor|anastrozole|letrozole|exemestane/),
            },
            metabolicConditions: {
              diabetes: has(/\bdiabetes|t1dm|t2dm|hba1c|insulin\b/),
              thyroid: has(/\bhypothyroid|hyperthyroid|thyroid\b/),
              hypercholesterolaemia: has(/\bcholesterol|hyperlipid|dyslipid/),
              obesity: has(/\bobese|obesity|bmi\s*[34][0-9]/),
            },
            hormonalStatus: sex ? { sex, onHrt: has(/\bhrt\b|hormone replacement|oestrogen|estrogen replac/) } : undefined,
            priorInjurySameSite: has(/\bprior\b|previous|recurr|reinjur|history of/),
            trainingHistory: {
              deconditioned: has(/\bdecondition|sedentary|inactive|bed rest/),
              recentLoadSpikePct: has(/\bspike|sudden increase|ramped up|load spike/) ? 30 : undefined,
            },
          },
        };
      })() : undefined,
    };
    fetch('/api/treatment-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal: abortController.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(result => { if (result && !abortController.signal.aborted) setTreatmentPlanData(result); })
      .catch(err => { if (err.name !== 'AbortError') console.error('Treatment plan error:', err); })
      .finally(() => { if (!abortController.signal.aborted) setTreatmentPlanLoading(false); });
    return () => abortController.abort();
  }, [treatmentDecisionData, JSON.stringify(painMarkers.map(pm => ({ r: pm.anatomicalLabel || pm.nearestBone, t: pm.type }))), modelConfig?.spine?.thoracicKyphosis, modelConfig?.spine?.forwardHead, modelConfig?.pelvis?.tilt, treatmentPlanReloadKey]);

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

  const handleCameraPoseUpdate = useCallback((pose: SmoothedPoseOutput) => {
    if (!cameraPoseActive) return;
    const extendedPose: ExtendedPoseInput = {
      ...pose,
      pelvisTilt: pose.pelvisTilt,
      pelvisObliquity: pose.pelvisObliquity,
      pelvisRotation: pose.pelvisRotation,
      scapulaData: pose.scapulaData,
      jointConfidence: pose.jointConfidence,
      globalTranslation: pose.globalTranslation,
    };
    const controllerVals = poseToControllerValues(extendedPose);
    const smoothed = controllerSmootherRef.current.smooth(controllerVals);
    const rad2deg = (r: number) => Math.round((r * 180) / Math.PI);

    if (pose.jointConfidence) {
      const conf = pose.jointConfidence;
      const LOW_CONF_THRESHOLD = 0.4;
      const jointNames: (keyof typeof conf)[] = ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle', 'leftWrist', 'rightWrist', 'spine', 'neck'];
      const confidenceValues = jointNames.map(k => conf[k] ?? 0.7);
      const avgConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;
      const estimated = jointNames.filter(k => (conf[k] ?? 0.7) < LOW_CONF_THRESHOLD);
      setPoseTrackingQuality({ overall: avgConfidence, estimatedJoints: estimated as string[] });
    }

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
      leftAnkle: { ...prev.leftAnkle, dorsiflexion: rad2deg(smoothed.leftAnkle.dorsiflexion), inversion: rad2deg(smoothed.leftAnkle.inversion) },
      rightAnkle: { ...prev.rightAnkle, dorsiflexion: rad2deg(smoothed.rightAnkle.dorsiflexion), inversion: rad2deg(smoothed.rightAnkle.inversion) },
      leftWrist: { ...prev.leftWrist, flexion: rad2deg(smoothed.leftWrist.flexion), deviation: rad2deg(smoothed.leftWrist.deviation) },
      rightWrist: { ...prev.rightWrist, flexion: rad2deg(smoothed.rightWrist.flexion), deviation: rad2deg(smoothed.rightWrist.deviation) },
      pelvis: {
        ...prev.pelvis,
        tilt: rad2deg(smoothed.pelvis.tilt),
        obliquity: rad2deg(smoothed.pelvis.obliquity),
        rotation: rad2deg(smoothed.pelvis.rotation),
        zShift: pose.globalTranslation ? Math.round(pose.globalTranslation.lateralShift * 100) : (prev.pelvis?.zShift ?? 0),
        yShift: pose.globalTranslation ? Math.round(pose.globalTranslation.forwardShift * 100) : (prev.pelvis?.yShift ?? 0),
        xShift: pose.globalTranslation ? Math.round(pose.globalTranslation.verticalShift * 100) : (prev.pelvis?.xShift ?? 0),
      },
      spine: {
        ...prev.spine,
        flexion: rad2deg(smoothed.spine.flexion),
        lateralFlexion: rad2deg(smoothed.spine.lateralFlexion),
        thoracicKyphosis: rad2deg(smoothed.spine.kyphosis),
        scoliosis: rad2deg(smoothed.spine.scoliosis),
        forwardHead: rad2deg(smoothed.spine.forwardHead),
        lateralShift: rad2deg(smoothed.spine.lateralShift),
        cervicalRotation: rad2deg(smoothed.spine.cervicalRotation),
        cervicalLateralFlexion: rad2deg(smoothed.spine.cervicalLateralFlexion),
        thoracicRotation: rad2deg(smoothed.spine.thoracicRotation),
        lumbarRotation: rad2deg(smoothed.spine.lumbarRotation),
        lumbarScoliosis: rad2deg(smoothed.spine.lumbarLateralFlexion),
        thoracicScoliosis: rad2deg(smoothed.spine.thoracicLateralFlexion),
        cervicalScoliosis: rad2deg(smoothed.spine.cervicalLateralFlexion),
      },
      limbScales: pose.bodyProportions ? {
        upperArm: Math.round((pose.bodyProportions.upperArmRatio - 0.55) * 100),
        forearm: Math.round((pose.bodyProportions.forearmRatio - 0.45) * 100),
        thigh: Math.round((pose.bodyProportions.thighRatio - 0.75) * 100),
        shin: Math.round((pose.bodyProportions.shinRatio - 0.7) * 100),
        overall: prev.limbScales.overall,
      } : prev.limbScales,
      neck: { ...prev.neck, flexion: rad2deg(smoothed.neck.flexion), rotation: rad2deg(smoothed.neck.rotation), lateralFlexion: rad2deg(smoothed.neck.lateralFlexion) },
      leftScapula: { ...prev.leftScapula, elevation: rad2deg(smoothed.scapula.leftElevation), protraction: rad2deg(smoothed.scapula.leftProtraction), upwardRotation: rad2deg(smoothed.scapula.leftUpwardRotation) },
      rightScapula: { ...prev.rightScapula, elevation: rad2deg(smoothed.scapula.rightElevation), protraction: rad2deg(smoothed.scapula.rightProtraction), upwardRotation: rad2deg(smoothed.scapula.rightUpwardRotation) },
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
      if (partialPose.leftAnkle) {
        next.leftAnkle = { ...prev.leftAnkle, dorsiflexion: rad2deg(partialPose.leftAnkle.x), inversion: rad2deg(partialPose.leftAnkle.z) };
      }
      if (partialPose.rightAnkle) {
        next.rightAnkle = { ...prev.rightAnkle, dorsiflexion: rad2deg(partialPose.rightAnkle.x), inversion: rad2deg(partialPose.rightAnkle.z) };
      }
      if (partialPose.leftWrist) {
        next.leftWrist = { ...prev.leftWrist, flexion: rad2deg(partialPose.leftWrist.x), deviation: rad2deg(partialPose.leftWrist.z) };
      }
      if (partialPose.rightWrist) {
        next.rightWrist = { ...prev.rightWrist, flexion: rad2deg(partialPose.rightWrist.x), deviation: rad2deg(partialPose.rightWrist.z) };
      }
      if (partialPose.spine) {
        next.spine = { ...prev.spine, flexion: rad2deg(partialPose.spine.x), lateralFlexion: rad2deg(partialPose.spine.z), thoracicKyphosis: rad2deg(partialPose.spine.x * 0.6), scoliosis: rad2deg(partialPose.spine.z * 1.2) };
      }
      if (partialPose.neck) {
        next.neck = { ...prev.neck, flexion: rad2deg(partialPose.neck.x), rotation: rad2deg(partialPose.neck.y), lateralFlexion: rad2deg(partialPose.neck.z) };
      }
      if (partialPose.pelvisTilt !== undefined || partialPose.pelvisObliquity !== undefined || partialPose.pelvisRotation !== undefined) {
        next.pelvis = {
          ...prev.pelvis,
          tilt: partialPose.pelvisTilt !== undefined ? rad2deg(partialPose.pelvisTilt) : (prev.pelvis?.tilt ?? 0),
          obliquity: partialPose.pelvisObliquity !== undefined ? rad2deg(partialPose.pelvisObliquity) : (prev.pelvis?.obliquity ?? 0),
          rotation: partialPose.pelvisRotation !== undefined ? rad2deg(partialPose.pelvisRotation) : (prev.pelvis?.rotation ?? 0),
        };
      }
      if (partialPose.scapulaData) {
        next.leftScapula = { ...prev.leftScapula, elevation: rad2deg(partialPose.scapulaData.leftElevation), protraction: rad2deg(partialPose.scapulaData.leftProtraction) };
        next.rightScapula = { ...prev.rightScapula, elevation: rad2deg(partialPose.scapulaData.rightElevation), protraction: rad2deg(partialPose.scapulaData.rightProtraction) };
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
    if (!computationsReady) return modelConfig;
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
  }, [modelConfig, muscleDrivenEffects, pathologyCompensation, computationsReady]);

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
    // Cancel any pending snapshot save targeted at the now-stale conversation.
    if (snapshotSaveTimerRef.current) {
      clearTimeout(snapshotSaveTimerRef.current);
      snapshotSaveTimerRef.current = null;
    }
    // Mark as hydrating so the auto-save effect bails while we batch the
    // resets below — otherwise the resets themselves would trigger a save
    // back to the just-cleared conversation.
    isHydratingRef.current = true;
    hydratedConversationIdRef.current = null;
    lastSavedSnapshotRef.current = "";

    setSelectedConversationId(null);
    setSuggestions([]);
    setMessage("");
    setChatPanelOpen(true);
    setSlingActivationOverrides({});
    // Reset every panel that participates in the case snapshot so the new
    // case starts from defaults instead of inheriting the previous one.
    setModelConfig({ ...DEFAULT_MODEL_CONFIG });
    setPainMarkers([]);
    setCompromisedTissues([]);
    setScarMarkers([]);
    setAdhesionBands([]);
    setRomMeasurements([]);
    setMuscleOverrides({});
    setBodyWeightKg(70);
    setClinicalHighlights([]);
    setSubjectiveHistoryInput('');
    setPatientContextState(EMPTY_PATIENT_CONTEXT_STATE);
    setPatientFactorOverrides(null);
    setMovementFindings([]);
    setSelectedRegion(null);
    planCartReplaceAllRef.current?.([]);
    setRightPanelTab('chat');
    setMechanismActiveTab('mechanism');
    setExpandedTreatmentSection(null);
    setTreatmentDecisionData(null);
    setTreatmentPlanData(null);
    setShowSimTimeline(false);
    setTimelinePlaybackState(null);
    setShowForceTimePanel(false);
    setShowTreatmentPriority(false);
    setShowUnifiedChainPanel(false);
    setUnifiedBiomechanicsMovementTask(undefined);
    setUnifiedBiomechanicsProgress(0.5);
    setUnifiedBiomechanicsFaultOverrides([]);
    // v2 — AI outputs and skeleton interaction flags.
    setExtractionResult(null);
    setStructuredReasoningData(null);
    setClinicalReasoningData(null);
    setEvidenceEngineResult(null);
    setCustomExerciseResult(null);
    setCustomManualTherapyResult(null);
    setActiveGoalProfile(null);
    setActiveGoalGap(null);
    setWhatIfScenarios([]);
    setWhatIfComparisonBScenarios([]);
    setMechanismBoneIds([]);
    setConnectionHighlights([]);
    setTestChainActive(null);
    setSelectedRomJoint(null);
    setRomValues({});

    // Release the hydration guard once the resets have committed.
    setTimeout(() => { isHydratingRef.current = false; }, 100);
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

  const lastPosedHypothesisRef = useRef<{ id: string; condition: string } | null>(null);
  const [stalePoseHint, setStalePoseHint] = useState<{ replacedFromId: string; newId: string; condition: string } | null>(null);

  const applyPoseCommand = useCallback((poseData: Record<string, any>) => {
    if (!poseData || typeof poseData !== 'object') return;
    const isIncremental = poseData.mode === 'incremental';
    const isReset = Object.keys(poseData).length === 0 || (Object.keys(poseData).length === 1 && poseData.mode);

    if (isReset) {
      setModelConfig({ ...DEFAULT_MODEL_CONFIG });
      toast({ title: "Pose Reset", description: "Skeleton returned to neutral position" });
      return;
    }

    const validGroups = Object.keys(DEFAULT_MODEL_CONFIG);
    let appliedCount = 0;

    setModelConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const [jointKey, params] of Object.entries(poseData)) {
        if (jointKey === 'mode') continue;
        if (!validGroups.includes(jointKey)) continue;
        if (typeof params !== 'object' || params === null) continue;
        const validParams = Object.keys((DEFAULT_MODEL_CONFIG as any)[jointKey]);
        for (const [param, value] of Object.entries(params as Record<string, number>)) {
          if (typeof value !== 'number') continue;
          if (!validParams.includes(param)) continue;
          if (isIncremental) {
            next[jointKey][param] = (next[jointKey][param] || 0) + value;
          } else {
            next[jointKey][param] = value;
          }
          appliedCount++;
        }
      }
      return next;
    });

    if (appliedCount > 0) {
      toast({ title: "Pose Updated", description: isIncremental ? "Skeleton adjusted incrementally" : "Skeleton pose applied from AI" });
      const ctxId = (poseData as any).__hypothesisId;
      const ctxCondition = (poseData as any).__hypothesisCondition;
      if (typeof ctxId === 'string' && typeof ctxCondition === 'string') {
        lastPosedHypothesisRef.current = { id: ctxId, condition: ctxCondition };
      }
    }
  }, [toast]);

  const handleBenchApplyOverlay = useCallback((overlay: BenchSkeletonOverlay | null) => {
    if (!overlay) {
      const snap = benchSnapshotRef.current;
      if (snap) {
        setModelConfig(snap.modelConfig);
        setPainMarkers(snap.painMarkers);
        setBiomechanicalMuscleHighlights(snap.biomechanicalMuscleHighlights);
        setMuscleHighlightColors(snap.muscleHighlightColors);
        setVisualizationBoneHighlights(snap.visualizationBoneHighlights);
        benchSnapshotRef.current = null;
      }
      return;
    }
    if (!benchSnapshotRef.current) {
      benchSnapshotRef.current = {
        modelConfig: JSON.parse(JSON.stringify(modelConfig)),
        painMarkers: [...painMarkers],
        biomechanicalMuscleHighlights: [...biomechanicalMuscleHighlights],
        muscleHighlightColors: { ...muscleHighlightColors },
        visualizationBoneHighlights: [...visualizationBoneHighlights],
      };
    }
    const fp = overlay.fingerprint;
    const boneHl = (fp.expectedHighlights.bones || []).map(b => ({ boneName: b, color: 0x22d3ee, intensity: 0.9 }));
    const regionBones = (fp.expectedHighlights.regions || []).map(r => ({ boneName: r, color: 0x60a5fa, intensity: 0.6 }));
    setVisualizationBoneHighlights([...boneHl, ...regionBones]);
    const muscles = fp.expectedHighlights.muscleGroups || [];
    setBiomechanicalMuscleHighlights(muscles);
    const colorMap: Record<string, string> = {};
    muscles.forEach(m => { colorMap[m] = "#22d3ee"; });
    setMuscleHighlightColors(colorMap);
    if (!fp.expectedPainMarkers || fp.expectedPainMarkers.length === 0) {
      setPainMarkers([]);
    } else {
      const predictedMarkers: PainMarker[] = fp.expectedPainMarkers.map((pm, idx) => {
        const labelLc = (pm.anatomicalLabel || '').toLowerCase();
        const vp = ANATOMICAL_VIRTUAL_POINTS.find(
          p => p.label.toLowerCase().includes(labelLc) ||
               (labelLc && labelLc.includes(p.label.toLowerCase().split(' (')[0]))
        );
        return {
          id: `bench-predicted-${fp.hypothesisId}-${idx}`,
          position: { x: 0, y: 0, z: 0 },
          nearestBone: vp ? vp.boneName : 'Root_M',
          anatomicalLabel: vp ? vp.label : pm.anatomicalLabel,
          type: (pm.type as PainMarkerType) || 'sharp',
          severity: pm.severity || 5,
          symptomType: 'pain' as SymptomType,
          description: pm.label || `Predicted: ${pm.anatomicalLabel}`,
        };
      });
      setPainMarkers(predictedMarkers);
    }
    if (fp.expectedPosture && Object.keys(fp.expectedPosture).length > 0) {
      applyPoseCommand(fp.expectedPosture);
    }
  }, [modelConfig, painMarkers, biomechanicalMuscleHighlights, muscleHighlightColors, visualizationBoneHighlights, applyPoseCommand]);

  const handleBenchCommit = useCallback((update: BenchUpdate) => {
    const positives = update.appliedTests.filter(t => t.outcome === 'positive');
    const negatives = update.appliedTests.filter(t => t.outcome === 'negative');
    const positiveLines = positives.map(t => `Bench: ${t.name} positive (LR+ ${t.lrApplied.toFixed(1)})`);
    const negativeLines = negatives.map(t => `Bench: ${t.name} negative (LR− ${t.lrApplied.toFixed(2)})`);
    setClinicalReasoningData(prev => {
      if (!prev) return prev;
      const idx = prev.hypotheses.findIndex(h => h.id === update.hypothesisId);
      if (idx < 0) return prev;
      const updated = [...prev.hypotheses];
      updated[idx] = {
        ...updated[idx],
        confidence: Math.round(update.newConfidence),
        supportingEvidence: [...updated[idx].supportingEvidence, ...positiveLines, `Bench summary: ${update.rationale}`],
        rulingOutFactors: [...updated[idx].rulingOutFactors, ...negativeLines],
      };
      return { ...prev, hypotheses: updated };
    });
    setStructuredReasoningData(prev => {
      if (!prev) return prev;
      const idx = prev.hypotheses.findIndex(h => h.id === update.hypothesisId);
      if (idx < 0) return prev;
      const updated = [...prev.hypotheses];
      updated[idx] = {
        ...updated[idx],
        confidence: Math.round(update.newConfidence),
        supporting: [
          ...updated[idx].supporting,
          ...positives.map(t => ({ feature: `Bench: ${t.name} positive (LR+ ${t.lrApplied.toFixed(1)})`, weight: 3 })),
        ],
        contradicting: [
          ...updated[idx].contradicting,
          ...negatives.map(t => ({ feature: `Bench: ${t.name} negative (LR− ${t.lrApplied.toFixed(2)})`, weight: 3 })),
        ],
      };
      return { ...prev, hypotheses: updated };
    });
    toast({ title: 'Hypothesis updated', description: `Confidence → ${Math.round(update.newConfidence)}% (${positives.length}+ / ${negatives.length}−)` });
  }, [toast]);

  const handleRefinedHypothesisCommit = useCallback((
    refined: RefinedHypothesisSuggestion,
    action: "replace" | "add",
    originalId: string,
  ) => {
    const newId = `refined-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const supportingFromFindings = refined.keyFindings.map(f => `Refined: ${f}`);
    const supportingFromRationale = `Refined rationale: ${refined.rationale}`;

    setClinicalReasoningData(prev => {
      if (!prev) return prev;
      const idx = prev.hypotheses.findIndex(h => h.id === originalId);
      const newCR: ClinicalHypothesis = {
        id: action === "add" ? newId : (idx >= 0 ? prev.hypotheses[idx].id : newId),
        condition: refined.condition,
        confidence: Math.round(refined.confidenceSuggestion),
        supportingEvidence: [...supportingFromFindings, supportingFromRationale],
        rulingOutFactors: idx >= 0 ? [...prev.hypotheses[idx].rulingOutFactors] : [],
        status: "active",
      };
      const updated = [...prev.hypotheses];
      if (action === "replace" && idx >= 0) {
        updated[idx] = newCR;
      } else {
        updated.push(newCR);
      }
      return { ...prev, hypotheses: updated };
    });

    setStructuredReasoningData(prev => {
      if (!prev) return prev;
      const idx = prev.hypotheses.findIndex(h => h.id === originalId);
      const supporting = refined.keyFindings.map(f => ({ feature: `Refined: ${f}`, weight: 3 }));
      const newSR: StructuredHypothesis = {
        id: action === "add" ? newId : (idx >= 0 ? prev.hypotheses[idx].id : newId),
        condition: refined.condition,
        confidence: Math.round(refined.confidenceSuggestion),
        supporting: [...supporting, { feature: `Refined rationale: ${refined.rationale}`, weight: 4 }],
        contradicting: idx >= 0 ? [...prev.hypotheses[idx].contradicting] : [],
        fingerprintMatchScore: idx >= 0 ? prev.hypotheses[idx].fingerprintMatchScore : 0,
        structuralHypothesis: idx >= 0 ? prev.hypotheses[idx].structuralHypothesis : refined.condition,
        dominantClinicalDriver: idx >= 0 ? prev.hypotheses[idx].dominantClinicalDriver : (prev.dominantSymptomDriver?.driver || ''),
      };
      const updated = [...prev.hypotheses];
      if (action === "replace" && idx >= 0) {
        updated[idx] = newSR;
      } else {
        updated.push(newSR);
      }
      const sorted = [...updated].sort((a, b) => b.confidence - a.confidence);
      return { ...prev, hypotheses: sorted };
    });

    const promotedId = action === "add" ? newId : originalId;
    const promotedCondition = refined.condition;

    setSelectedHypothesisForChat(prev => prev && prev.id === originalId ? {
      ...prev,
      id: action === "add" ? originalId : prev.id,
      condition: action === "replace" ? refined.condition : prev.condition,
      confidence: action === "replace" ? Math.round(refined.confidenceSuggestion) : prev.confidence,
      supportingEvidence: action === "replace"
        ? [...supportingFromFindings, supportingFromRationale]
        : prev.supportingEvidence,
    } : prev);

    if (action === "replace" && lastPosedHypothesisRef.current?.id === originalId) {
      setStalePoseHint({ replacedFromId: originalId, newId: promotedId, condition: promotedCondition });
    }

    setLastRefinedCommit({
      id: promotedId,
      condition: promotedCondition,
      supportingEvidence: [...supportingFromFindings, supportingFromRationale],
      rulingOutFactors: [],
    });
  }, []);

  /**
   * Trigger contract (per task spec): only confirmed or refine-committed
   * hypotheses cause provocation composition. Chat-selected hypotheses are
   * intentionally NOT a trigger — clinicians may open chats on speculative
   * differentials and we don't want to spend AI credits on those.
   * Priority:
   *   1. Most recent refine-commit (clinician just promoted/replaced).
   *   2. Top-confidence hypothesis with status === "confirmed" — no
   *      additional confidence gate; "confirmed" is itself the clinician's
   *      sign-off, so we honour it regardless of numeric confidence.
   */
  const provocationHypothesis = useMemo<{ id: string; condition: string; supportingEvidence?: string[]; rulingOutFactors?: string[] } | null>(() => {
    if (lastRefinedCommit) return lastRefinedCommit;
    const hyps = clinicalReasoningData?.hypotheses ?? [];
    const confirmed = hyps
      .filter(h => h.status === "confirmed")
      .sort((a, b) => b.confidence - a.confidence);
    if (confirmed.length > 0) {
      const h = confirmed[0];
      return { id: h.id, condition: h.condition, supportingEvidence: h.supportingEvidence, rulingOutFactors: h.rulingOutFactors };
    }
    return null;
  }, [lastRefinedCommit, clinicalReasoningData?.hypotheses]);
  const provocationQueryEnabled = !!provocationHypothesis && !!provocationHypothesis.id && !!provocationHypothesis.condition;
  const {
    data: provocationData,
    isFetching: provocationLoading,
    error: provocationError,
  } = useQuery<ProvocationComposeResponse>({
    queryKey: [
      "/api/diagnosis-provocations/compose",
      provocationHypothesis?.id,
      provocationHypothesis?.condition,
    ],
    enabled: provocationQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!provocationHypothesis) return { movements: [] };
      const res = await fetch("/api/diagnosis-provocations/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hypothesisId: provocationHypothesis.id,
          condition: provocationHypothesis.condition,
          supportingEvidence: provocationHypothesis.supportingEvidence,
          rulingOutFactors: provocationHypothesis.rulingOutFactors,
          region: provocationFocusedRegion,
          painMarkers: provocationMarkerContext,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to compose provocations");
      }
      return res.json();
    },
  });
  const provocationMovements: DiagnosisProvocationMovement[] = useMemo(() => {
    return Array.isArray(provocationData?.movements) ? provocationData.movements : [];
  }, [provocationData]);
  const handleRegenerateProvocations = useCallback(() => {
    if (!provocationHypothesis) return;
    queryClient.invalidateQueries({
      queryKey: [
        "/api/diagnosis-provocations/compose",
        provocationHypothesis.id,
        provocationHypothesis.condition,
      ],
    });
  }, [provocationHypothesis, queryClient]);

  const provocationMarkerContext: ProvocationContextPainMarker[] = useMemo(() => {
    return painMarkers
      .filter(m => !m.id.startsWith("prov-flash-"))
      .slice(0, 24)
      .map(m => ({
        anatomicalLabel: m.anatomicalLabel,
        symptomType: m.symptomType,
        severity: m.severity,
        description: m.description,
      }));
  }, [painMarkers]);

  const provocationFocusedRegion = useMemo(() => {
    return selectedRegion ? BODY_REGIONS[selectedRegion]?.name : undefined;
  }, [selectedRegion]);

  /**
   * Transient expected-site pain markers.
   * When a provocation movement is actively playing, inject one marker per
   * expectedProvocationSite into the viewer's painMarkers using the bone
   * positions from REGION_BONE_MAPPING. All transient markers are id-prefixed
   * `prov-flash-` so they can be removed cleanly without touching clinician
   * markers when playback stops or the active movement changes.
   */
  useEffect(() => {
    const isPlaying = animationState.isPlaying;
    const currentId = animationState.currentMovement;
    const active = currentId && isPlaying
      ? provocationMovements.find(m => m.id === currentId)
      : undefined;
    const sites = active?.expectedProvocationSites ?? [];

    if (!active || sites.length === 0) {
      setPainMarkers(prev =>
        prev.some(m => m.id.startsWith("prov-flash-"))
          ? prev.filter(m => !m.id.startsWith("prov-flash-"))
          : prev,
      );
      return;
    }

    const transient: PainMarker[] = sites.flatMap((site, idx) => {
      const region = site.region as AnatomicalRegion;
      const bones = REGION_BONE_MAPPING[region];
      const nearestBone = bones && bones.length > 0 ? bones[0] : undefined;
      if (!nearestBone) return [];
      return [{
        id: `prov-flash-${active.id}-${idx}`,
        type: "point" as PainMarkerType,
        symptomType: "pain" as SymptomType,
        position: { x: 0, y: 0, z: 0 },
        nearestBone,
        anatomicalLabel: site.label,
        description: `Expected provocation site for ${active.name}`,
        severity: typeof site.severity === "number" ? site.severity : 6,
      }];
    });

    setPainMarkers(prev => {
      const kept = prev.filter(m => !m.id.startsWith("prov-flash-"));
      return [...kept, ...transient];
    });
  }, [animationState.isPlaying, animationState.currentMovement, provocationMovements]);

  useEffect(() => {
    return () => {
      setPainMarkers(prev =>
        prev.some(m => m.id.startsWith("prov-flash-"))
          ? prev.filter(m => !m.id.startsWith("prov-flash-"))
          : prev,
      );
    };
  }, []);

  const handleRePoseToRefined = useCallback(() => {
    if (!stalePoseHint) return;
    const targetId = stalePoseHint.newId;
    const target = structuredReasoningData?.hypotheses.find(h => h.id === targetId)
      || clinicalReasoningData?.hypotheses.find(h => h.id === targetId);
    if (!target) {
      setStalePoseHint(null);
      return;
    }
    const hypForChat: HypothesisData = {
      id: target.id,
      condition: target.condition,
      confidence: target.confidence,
      supportingEvidence: 'supporting' in target
        ? (target as StructuredHypothesis).supporting.map(s => s.feature)
        : (target as ClinicalHypothesis).supportingEvidence,
      rulingOutFactors: 'contradicting' in target
        ? (target as StructuredHypothesis).contradicting.map(c => c.feature)
        : (target as ClinicalHypothesis).rulingOutFactors,
    };
    setSelectedHypothesisForChat(hypForChat);
    setHypothesisChatOpen(true);
    setStalePoseHint(null);
    toast({ title: "Re-pose ready", description: `Use "Pose to Hypothesis" for ${stalePoseHint.condition}` });
  }, [stalePoseHint, structuredReasoningData, clinicalReasoningData, toast]);

  const applyClinicalPreset = useCallback((preset: ClinicalPosturePreset) => {
    const newConfig = applyPresetToConfig(modelConfig, preset, DEFAULT_MODEL_CONFIG);
    setModelConfig(newConfig as ModelConfig);
    toast({ title: "Preset Applied", description: `${preset.name} posture loaded` });
  }, [modelConfig, toast]);


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
    if (skeletonModeRef.current === 'movement') return;

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
    if (!forceRefresh && triggerKey === lastReasoningTriggerRef.current) {
      // Governor: same structural inputs as the last successful run —
      // no work to do. Surface the skip in the activity monitor so
      // clinicians can see the AI didn't burn another call.
      markStageEnd('reason', 'skipped', 'inputs unchanged');
      return;
    }
    if (markerData.length === 0 && !subjectiveHistoryRef.current.trim() && postureDeviations.length === 0 && !compensationSummary) return;

    lastReasoningTriggerRef.current = triggerKey;
    setClinicalReasoningProcessing(true);
    markStageStart('reason');

    if (evidenceAbortRef.current) {
      evidenceAbortRef.current.abort();
      evidenceAbortRef.current = null;
    }
    if (autoEvidenceTimerRef.current) {
      clearTimeout(autoEvidenceTimerRef.current);
      autoEvidenceTimerRef.current = null;
    }
    setEvidenceEngineResult(null);
    setEvidenceLoading(false);

    const structuredInput: Record<string, unknown> = {
      subjectiveHistory: subjectiveHistoryRef.current || '',
      symptoms: markerData.map(m => m.label).filter(Boolean),
      aggravatingFactors: [] as string[],
      easingFactors: [] as string[],
      painMarkers: markerData.map(m => ({
        region: m.label || '',
        severity: m.severity,
        type: m.type,
      })),
      postureState: modelConfig,
      muscleOverrides: Object.entries(muscleOverrides || {}).map(([muscle, override]) => ({
        muscle,
        ...(override || {}),
      })),
      biomechanicalData: {
        postureDeviations,
        forceAnalysis: forcesSummary,
        muscleAnalysis: muscleSummary,
      },
      duration: undefined,
      onset: undefined,
      nightPain: undefined,
      restingPain: undefined,
      sleepAffected: undefined,
      previousEpisodes: undefined,
      extractionContext: extractionResult ?? undefined,
    };

    const subjectiveLower = (subjectiveHistoryRef.current || '').toLowerCase();
    if (subjectiveLower.includes('night pain') || subjectiveLower.includes('wakes at night')) {
      structuredInput.nightPain = true;
    }
    if (subjectiveLower.includes('rest pain') || subjectiveLower.includes('pain at rest')) {
      structuredInput.restingPain = true;
    }
    if (subjectiveLower.includes('sleep') || subjectiveLower.includes('can\'t sleep')) {
      structuredInput.sleepAffected = true;
    }
    if (subjectiveLower.includes('previous') || subjectiveLower.includes('recurrent') || subjectiveLower.includes('had before')) {
      structuredInput.previousEpisodes = true;
    }
    const durationMatches = subjectiveLower.match(/(for|since|past|last)\s+([\w\s]+?(days?|weeks?|months?|years?))/);
    if (durationMatches) {
      structuredInput.duration = durationMatches[2];
    }

    setStructuredReasoningLoading(true);
    fetch('/api/clinical-reasoning/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(structuredInput),
    })
      .then(r => r.ok ? r.json() : null)
      .then(result => { if (result) setStructuredReasoningData(result); })
      .catch(err => console.error('Structured reasoning error:', err))
      .finally(() => setStructuredReasoningLoading(false));

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
          extractionContext: extractionResult ?? undefined,
          biomechanicsContext: unifiedBiomechanicsOutput ? {
            faults: unifiedBiomechanicsOutput.faults.faults.map(f => ({ label: f.label, severity: f.severity, category: f.category, corrective: f.corrective })),
            deviations: unifiedBiomechanicsOutput.posture.deviations.map(d => ({ pattern: d.pattern, region: d.region, severity: d.severity, angleDeg: d.angleDeg })),
            overallRiskScore: unifiedBiomechanicsOutput.faults.overallRiskScore,
            qualityScore: unifiedBiomechanicsOutput.qualityScore,
            clinicalSummary: unifiedBiomechanicsOutput.clinicalSummary,
            movementTaskId: unifiedBiomechanicsMovementTask,
            jointKinematics: {
              totalMobilityScore: unifiedBiomechanicsOutput.jointKinematics.totalMobilityScore,
              restrictedJoints: unifiedBiomechanicsOutput.jointKinematics.restrictedJoints,
              hypermobileJoints: unifiedBiomechanicsOutput.jointKinematics.hypermobileJoints,
            },
            compensationPatterns: {
              totalCompensationScore: unifiedBiomechanicsOutput.compensationPatterns.totalCompensationScore,
              primaryDrivers: unifiedBiomechanicsOutput.compensationPatterns.primaryDrivers,
              patterns: unifiedBiomechanicsOutput.compensationPatterns.patterns.slice(0, 5).map(p => ({
                label: p.label, severity: p.severity, primaryRegion: p.primaryRegion,
                compensatingRegion: p.compensatingRegion, additionalLoadPct: p.additionalLoadPct,
              })),
            },
          } : undefined,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();

      const reasoningSnapshot: ClinicalReasoningData = {
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
      };
      setClinicalReasoningData(reasoningSnapshot);
      markStageEnd('reason', 'done');

      if (!clinicalReasoningOpen) {
        setClinicalReasoningOpen(true);
      }

      autoEvidenceTimerRef.current = setTimeout(() => {
        handleEvidenceQueryRef.current();
      }, 500);

      // Task #313 — autopilot chain. Convergence + stability are
      // computed inside; this is a no-op when the autopilot toggle
      // is off or when the chain is paused.
      try { chainAutopilotAfterReasoningRef.current(reasoningSnapshot); } catch { /* fail-soft */ }
    } catch (error) {
      console.error('Clinical reasoning analysis error:', error);
      markStageEnd('reason', 'error', error instanceof Error ? error.message : 'request failed');
    } finally {
      setClinicalReasoningProcessing(false);
    }
  }, [clinicalReasoningProcessing, clinicalReasoningPaused, modelConfig, effectiveModelConfig, romMeasurements, clinicalReasoningOpen, computePostureDeviations, markStageStart, markStageEnd]);

  triggerClinicalReasoningAnalysisRef.current = triggerClinicalReasoningAnalysis;

  useEffect(() => {
    const hasPostureChanges = Object.entries(modelConfig).some(([key, val]: [string, any]) => {
      const def = (DEFAULT_MODEL_CONFIG as any)[key];
      if (!def || typeof val !== 'object') return false;
      return Object.entries(val).some(([k, v]) => Math.abs((v as number) - ((def[k] as number) || 0)) >= 3);
    });
    if (painMarkers.length === 0 && !hasPostureChanges) return;
    if (isRecording) return;
    if (skeletonMode === 'movement') return;

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
  }, [painMarkers, modelConfig, triggerClinicalReasoningAnalysis, isRecording, skeletonMode]);

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
    if (!forceMode || (liteMode && computeStage < 2)) return null;
    const result = calculatePosturalForces(effectiveModelConfig);
    if (enabledForceJoints.size === 0 && result.joints.length > 0) {
      const defaultEnabled = new Set(result.joints.map(j => j.id));
      setEnabledForceJoints(defaultEnabled);
    }
    return result;
  }, [effectiveModelConfig, forceMode, liteMode, computeStage]);

  const baseMuscleTensions = useMemo(() => {
    if (computeStage < 1) return { tensions: {} as { [id: string]: number }, computedTensions: {} as { [id: string]: number } };
    const base = computeAllMuscleStates(effectiveModelConfig);
    const computedTensions: { [id: string]: number } = {};
    Object.entries(base).forEach(([id, s]) => { computedTensions[id] = s.tension; });
    const tensions = { ...computedTensions };
    Object.entries(manualChainTensions).forEach(([id, val]) => {
      tensions[id] = val;
    });
    return { tensions, computedTensions };
  }, [effectiveModelConfig, manualChainTensions, computeStage]);

  const wholeBodyScore = useMemo(() => {
    if (computeStage < 1) return { overallScore: 50, regionScores: {}, syndromes: [] };
    return computeWholeBodyTensionScore(baseMuscleTensions.tensions, compensatedOverrides);
  }, [baseMuscleTensions, compensatedOverrides, computeStage]);

  const chainEffects = useMemo(() => {
    if (computeStage < 1) return [];
    return MYOFASCIAL_CHAINS.map(chain => {
      const tensions = chain.links.map(l => baseMuscleTensions.tensions[l.muscleId] ?? 50);
      const avgTension = tensions.length > 0 ? tensions.reduce((a, b) => a + b, 0) / tensions.length : 50;
      return { chainId: chain.id, avgTension };
    });
  }, [baseMuscleTensions, computeStage]);

  const chainPropagation = useMemo(() => {
    const hasManualOverrides = Object.values(compensatedOverrides).some(o => o?.isManual);
    const hasManualChainTensions = Object.keys(manualChainTensions).length > 0;
    if (!hasManualOverrides && !hasManualChainTensions) return null;
    return propagateChainEffects(baseMuscleTensions.tensions, compensatedOverrides);
  }, [baseMuscleTensions.tensions, compensatedOverrides, manualChainTensions]);

  const propagatedEffects = useMemo(() => {
    if (!showUnifiedChainPanel || !showPropagation) return chainPropagation;
    return chainPropagation;
  }, [showUnifiedChainPanel, showPropagation, chainPropagation]);

  const scarSummaryForGoals = useMemo(() => {
    if (scarMarkers.length === 0) return undefined;
    return scarMarkers.map(scar => ({
      region: scar.anatomicalLabel || scar.nearestBone,
      severity: scar.severity,
      mobility: scar.mobility,
      nearestBone: scar.nearestBone,
      affectedLayers: scar.affectedLayers,
    }));
  }, [scarMarkers]);

  const currentRomForGoals = useMemo(() => {
    if (romMeasurements.length === 0) return undefined;
    const romMap: Record<string, number> = {};
    for (const m of romMeasurements) {
      const key = m.movementId;
      if (!romMap[key] || m.measuredValue > romMap[key]) {
        romMap[key] = m.measuredValue;
      }
    }
    return Object.entries(romMap).map(([jointId, currentDegrees]) => ({ jointId, currentDegrees }));
  }, [romMeasurements]);

  const postureMeasurementsForGoals = useMemo(() => {
    const mc = effectiveModelConfig;
    if (!mc) return undefined;
    const spine = mc['spine'];
    const neck = mc['neck'];
    const pelvis = mc['pelvis'];
    if (!spine && !neck && !pelvis) return undefined;
    return {
      kyphosisAngle: (spine?.['thoracicKyphosis'] ?? 0) as number,
      lordosisAngle: (spine?.['lumbarLordosis'] ?? 0) as number,
      forwardHeadAngle: (spine?.['forwardHead'] ?? neck?.['forwardHead'] ?? 0) as number,
      pelvicTiltAngle: (pelvis?.['tilt'] ?? 0) as number,
      lateralShift: (spine?.['lateralShift'] ?? 0) as number,
      scoliosisAngle: (spine?.['scoliosis'] ?? 0) as number,
    };
  }, [effectiveModelConfig]);

  const propagationDeltas = useMemo(() => {
    if (!propagatedEffects) return {};
    const deltas: Record<string, number> = {};
    for (const [id, state] of Object.entries(propagatedEffects)) {
      deltas[id] = state.totalChainTension;
    }
    return deltas;
  }, [propagatedEffects]);

  const clinicalConsequences = useMemo(() => {
    if (computeStage < 2) return { jointEffects: [], postureRisks: [], functionalLimitations: [] };
    return computeClinicalConsequences(
      baseMuscleTensions.computedTensions,
      manualChainTensions,
      propagationDeltas
    );
  }, [baseMuscleTensions.computedTensions, manualChainTensions, propagationDeltas, computeStage]);

  const chainDrivenJointEffects = useMemo(() => {
    if (!chainPropagation || !bidirectionalMode) return null;
    return computeChainDrivenJointEffects(chainPropagation);
  }, [chainPropagation, bidirectionalMode]);

  const whatIfSimulatedConfig = useMemo(() => {
    if (whatIfScenarios.length === 0) return null;
    const pmForComparison = painMarkers.map(pm => ({
      id: pm.id,
      position: pm.position,
      label: pm.anatomicalLabel || pm.nearestBone,
      type: pm.type as 'point' | 'area' | 'referred' | 'line' | 'paint',
      severity: (pm as unknown as Record<string, unknown>).severity as number ?? 5,
      description: pm.description,
    }));
    const baseMuscles = computeFullMuscleAnalysis(effectiveModelConfig);
    const appliedMuscles = applyOverridesToAnalysis(baseMuscles, compensatedOverrides);
    return computeWhatIfComparison(effectiveModelConfig, compensatedOverrides, pmForComparison, bodyWeightKg, whatIfScenarios, appliedMuscles, cachedBiomechanicsOutput);
  }, [whatIfScenarios, effectiveModelConfig, compensatedOverrides, painMarkers, bodyWeightKg, cachedBiomechanicsOutput]);

  const whatIfComparisonB = useMemo(() => {
    if (whatIfComparisonBScenarios.length === 0) return null;
    const pmForComparison = painMarkers.map(pm => ({
      id: pm.id,
      position: pm.position,
      label: pm.anatomicalLabel || pm.nearestBone,
      type: pm.type as 'point' | 'area' | 'referred' | 'line' | 'paint',
      severity: (pm as unknown as Record<string, unknown>).severity as number ?? 5,
      description: pm.description,
    }));
    const baseMuscles = computeFullMuscleAnalysis(effectiveModelConfig);
    const appliedMuscles = applyOverridesToAnalysis(baseMuscles, compensatedOverrides);
    return computeWhatIfComparison(effectiveModelConfig, compensatedOverrides, pmForComparison, bodyWeightKg, whatIfComparisonBScenarios, appliedMuscles, cachedBiomechanicsOutput);
  }, [whatIfComparisonBScenarios, effectiveModelConfig, compensatedOverrides, painMarkers, bodyWeightKg, cachedBiomechanicsOutput]);

  const finalModelConfig = useMemo(() => {
    const baseConfig = (whatIfSimulatedConfig?.simulatedModelConfig)
      ? whatIfSimulatedConfig.simulatedModelConfig
      : effectiveModelConfig;
    if (!chainDrivenJointEffects) return baseConfig;
    const config = JSON.parse(JSON.stringify(baseConfig));
    for (const [joint, params] of Object.entries(chainDrivenJointEffects)) {
      if (!config[joint]) config[joint] = {};
      for (const [param, value] of Object.entries(params)) {
        const current = config[joint][param] || 0;
        config[joint][param] = current + value;
      }
    }
    return config;
  }, [effectiveModelConfig, chainDrivenJointEffects, whatIfSimulatedConfig]);

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

  const effectiveOverrides = useMemo(() => {
    if (whatIfSimulatedConfig?.simulatedOverrides) {
      return whatIfSimulatedConfig.simulatedOverrides as Record<string, MuscleOverride>;
    }
    return compensatedOverrides;
  }, [compensatedOverrides, whatIfSimulatedConfig]);

  const muscleAnalysis = useMemo(() => {
    if (!muscleMode) return null;
    const base = computeFullMuscleAnalysis(finalModelConfig);
    if (enabledMuscleGroups.size === 0 && base.groups.length > 0) {
      setEnabledMuscleGroups(new Set(base.groups.map(g => g.id)));
    }
    return applyOverridesToAnalysis(base, effectiveOverrides, crossMuscleEffects);
  }, [finalModelConfig, muscleMode, effectiveOverrides, crossMuscleEffects]);

  const weightDistribution = useMemo(() => {
    if (!forceMode) return null;
    return computeWeightDistribution(effectiveModelConfig, bodyWeightKg);
  }, [effectiveModelConfig, forceMode, bodyWeightKg]);

  const correlationResult = useMemo(() => {
    if (liteMode && !correlationMode) return null;
    if (!correlationMode && !showUnifiedChainPanel && !showInjuryMechanism) return null;
    const forces = calculatePosturalForces(finalModelConfig);
    const baseAnalysis = computeFullMuscleAnalysis(finalModelConfig);
    const muscles = applyOverridesToAnalysis(baseAnalysis, effectiveOverrides);
    return computeCrossSystemCorrelation({
      painMarkers: painMarkers.map(pm => ({ id: pm.id, position: pm.position, label: pm.anatomicalLabel || pm.nearestBone, type: pm.type, severity: (pm as unknown as Record<string, unknown>).severity as number ?? 5, description: pm.description, subjectiveHistory: pm.subjectiveHistory })),
      forces: forces.joints,
      muscles: muscles.allMuscles,
      muscleGroups: muscles.groups,
      syndromes: muscles.syndromes,
      kineticChains: KINETIC_CHAINS,
      bodyWeightKg,
    });
  }, [finalModelConfig, effectiveOverrides, painMarkers, bodyWeightKg, correlationMode, showUnifiedChainPanel, showInjuryMechanism, liteMode]);

  const handleAddWhatIfScenario = useCallback((scenario: WhatIfScenario) => {
    setWhatIfScenarios(prev => {
      if (prev.find(s => s.id === scenario.id)) return prev;
      return [...prev, scenario];
    });
  }, []);

  const handleRemoveWhatIfScenario = useCallback((id: string) => {
    setWhatIfScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleClearWhatIfScenarios = useCallback(() => {
    setWhatIfScenarios([]);
  }, []);

  const handleApplyWhatIfToSkeleton = useCallback(() => {
    if (!whatIfSimulatedConfig) return;
    const simConfig = whatIfSimulatedConfig.simulatedModelConfig;
    const newModelConfig = JSON.parse(JSON.stringify(modelConfig));
    for (const [joint, params] of Object.entries(simConfig)) {
      if (typeof params === 'object' && params !== null) {
        if (!newModelConfig[joint]) newModelConfig[joint] = {};
        const effectiveJoint = (effectiveModelConfig[joint] as Record<string, number> | undefined) ?? {};
        const rawJoint = (modelConfig[joint] as Record<string, number> | undefined) ?? {};
        for (const [param, simVal] of Object.entries(params as Record<string, number>)) {
          const effectiveVal = effectiveJoint[param] ?? 0;
          const rawVal = rawJoint[param] ?? 0;
          const delta = (simVal as number) - effectiveVal;
          if (Math.abs(delta) > 0.001) {
            newModelConfig[joint][param] = rawVal + delta;
          }
        }
      }
    }
    setModelConfig(newModelConfig);
    for (const [key, val] of Object.entries(whatIfSimulatedConfig.simulatedOverrides)) {
      setMuscleOverrides(prev => ({ ...prev, [key]: { ...prev[key], ...val } }));
    }
    setWhatIfScenarios([]);
    setMechanismActiveTab('mechanism');
  }, [whatIfSimulatedConfig, modelConfig, effectiveModelConfig]);

  const [goalOverlayData, setGoalOverlayData] = useState<{
    enabled: boolean;
    painTargets?: Array<{ boneName: string; targetIntensity: number; currentIntensity: number }>;
    muscleTargets?: Array<{ groupId: string; targetTension: number; currentTension: number }>;
    postureTargets?: Array<{ boneName: string; targetAngle: number; currentAngle: number; axis: 'x' | 'y' | 'z' }>;
    romTargets?: Array<{ boneName: string; targetDegrees: number; currentDegrees: number; label: string }>;
    overallPct?: number;
  } | null>(null);

  const handleGoalOverlayChange = useCallback((overlay: typeof goalOverlayData) => {
    setGoalOverlayData(overlay);
  }, []);

  const handleGoalProfileChange = useCallback((profile: import("@/lib/goalStateEngine").RecoveryGoalProfile | null, gap: import("@/lib/goalStateEngine").GoalGapAnalysis | null) => {
    setActiveGoalProfile(profile);
    setActiveGoalGap(gap);
  }, []);

  const handleSessionPrescriptionSelect = useCallback((ctx: import("@/lib/prescriptionAdapterEngine").PrescriptionContext | null, sessionNumber: number | null) => {
    setSessionPrescriptionCtx(ctx);
    setSessionPrescriptionNum(sessionNumber);
  }, []);

  const handleTriggerExerciseGenerate = useCallback((sessionNumber: number) => {
    setShowInjuryMechanism(true);
    setMechanismActiveTab('exercise');
    setPendingExerciseGenerate(true);
    setExerciseGeneratingSession(sessionNumber);
  }, []);

  const handleTriggerMTGenerate = useCallback((sessionNumber: number) => {
    setShowInjuryMechanism(true);
    setMechanismActiveTab('manualRx');
    setPendingMTGenerate(true);
    setMtGeneratingSession(sessionNumber);
  }, []);

  const handleExerciseGenerateStarted = useCallback(() => {
    setPendingExerciseGenerate(false);
  }, []);

  const handleMTGenerateStarted = useCallback(() => {
    setPendingMTGenerate(false);
  }, []);

  const handleExerciseGenerateComplete = useCallback((success: boolean) => {
    if (success && exerciseGeneratingSession !== null) {
      setExerciseGeneratedSessions(prev => new Set(prev).add(exerciseGeneratingSession));
    }
    setExerciseGeneratingSession(null);
  }, [exerciseGeneratingSession]);

  const handleMTGenerateComplete = useCallback((success: boolean) => {
    if (success && mtGeneratingSession !== null) {
      setMtGeneratedSessions(prev => new Set(prev).add(mtGeneratingSession));
    }
    setMtGeneratingSession(null);
  }, [mtGeneratingSession]);

  // ----- Master Plan auto-build handlers (Task #267) -----
  // onGenerateStarted: clears ONLY the trigger flag (so the engine's effect
  // doesn't fire generation twice). Critically, this does NOT clear the
  // in-flight flag — completion is tracked separately and only flips when
  // the engine's onGenerateComplete fires after the cart cascade.
  const handleAutoBuildStartExercise = useCallback(() => setAutoBuildTriggerExercise(false), []);
  const handleAutoBuildStartMT = useCallback(() => setAutoBuildTriggerMT(false), []);
  const handleAutoBuildStartAdjunct = useCallback(() => setAutoBuildTriggerAdjunct(false), []);
  const recordAutoBuildFailure = useCallback((engineLabel: string) => {
    setAutoBuildFailures(prev => {
      if (prev.has(engineLabel)) return prev;
      const next = new Set(prev);
      next.add(engineLabel);
      return next;
    });
  }, []);
  const handleAutoBuildCompleteExercise = useCallback((success: boolean) => {
    if (!success) recordAutoBuildFailure('Exercise Rx');
    setAutoBuildInFlightExercise(false);
  }, [recordAutoBuildFailure]);
  const handleAutoBuildCompleteMT = useCallback((success: boolean) => {
    if (!success) recordAutoBuildFailure('Manual Therapy');
    setAutoBuildInFlightMT(false);
  }, [recordAutoBuildFailure]);
  const handleAutoBuildCompleteEPA = useCallback((success: boolean) => {
    if (!success) recordAutoBuildFailure('Electrophysical Agents');
    setAutoBuildInFlightEPA(false);
  }, [recordAutoBuildFailure]);
  const handleAutoBuildCompleteAdjunct = useCallback((success: boolean) => {
    if (!success) recordAutoBuildFailure('Adjunct Rx');
    setAutoBuildInFlightAdjunct(false);
  }, [recordAutoBuildFailure]);
  const handleAutoBuildClick = useCallback(() => {
    // No-op while a build is anywhere in flight (generating OR organizing) or
    // before clinical context is captured.
    if (autoBuildState !== 'idle') return;
    if (!hasClinicalTextData) return;
    setAutoBuildFailures(new Set());
    setAutoBuildState('generating');
    // Trigger flags drive the one-shot pendingGenerate prop on each engine.
    setAutoBuildTriggerExercise(true);
    setAutoBuildTriggerMT(true);
    setAutoBuildTriggerAdjunct(true);
    // In-flight flags gate the settle effect. Stay true until the engine
    // emits onGenerateComplete (after its staggered cart-add cascade).
    setAutoBuildInFlightExercise(true);
    setAutoBuildInFlightMT(true);
    setAutoBuildInFlightEPA(true);
    setAutoBuildInFlightAdjunct(true);
    setAutoBuildElectroNonce(prev => prev + 1);
  }, [autoBuildState, hasClinicalTextData]);
  // Bind for the autopilot rerun-from-stage handler (defined earlier
  // in render order to keep stable references for the dock).
  handleAutoBuildClickRef.current = handleAutoBuildClick;

  // ─── Task #313 — Autopilot chain implementation ──────────────────────
  // Wired into `chainAutopilotAfterReasoningRef` so the reasoning trigger
  // can call back here without a hoisting problem (this depends on
  // `handleAutoBuildClick` + research panel ref which are defined later
  // than the trigger). Runs convergence checks, updates the stability
  // ribbon, then schedules research + master-plan stages.
  const chainAutopilotAfterReasoning = useCallback((data: ClinicalReasoningData) => {
    if (!autopilotEnabledRef.current) return;
    if (autopilotPausedRef.current) return;

    const top = (data.hypotheses || []).find(h => h.status !== 'ruled_out') ?? data.hypotheses?.[0];
    const stab = monitorStabilityRef.current;
    const topLabel = top?.condition?.trim() || null;
    const topConfidence = typeof top?.confidence === 'number' ? top.confidence : 0;
    const wasSame = !!topLabel && stab.topLabel === topLabel;
    const newRuns = wasSame ? stab.stableForRuns + 1 : (topLabel ? 1 : 0);
    const justConverged = newRuns >= CONVERGENCE_RUNS && topConfidence >= CONVERGENCE_MIN_CONFIDENCE;

    setMonitorStability({
      topLabel,
      stableForRuns: newRuns,
      converged: justConverged,
      destabilized: stab.topLabel !== null && !wasSame,
    });

    if (justConverged && wasSame) {
      // Convergence: stop spending AI calls. Surface in the chips so
      // the clinician can re-run from a stage manually if they want.
      markStageEnd('research', 'converged', `top hypothesis stable (${topLabel})`);
      markStageEnd('plan', 'converged', `top hypothesis stable (${topLabel})`);
      return;
    }

    if (!topLabel) return;

    // Stage: case-research (delayed so evidence settles first).
    window.setTimeout(() => {
      if (!autopilotEnabledRef.current || autopilotPausedRef.current) return;
      const r = caseResearchPanelRef.current;
      if (!r) return;
      if (r.isRunning()) return;
      markStageStart('research');
      try {
        r.trigger(false);
        // No completion callback from the panel; mark done after a
        // generous window so the chip leaves "running".
        window.setTimeout(() => markStageEnd('research', 'done'), 8000);
      } catch (e) {
        markStageEnd('research', 'error', e instanceof Error ? e.message : 'trigger failed');
      }
    }, 1500);

    // Stage: master plan auto-build. Only fires when there's clinical
    // data on the skeleton (so engines have something to build from)
    // and no build is currently in flight.
    window.setTimeout(() => {
      if (!autopilotEnabledRef.current || autopilotPausedRef.current) return;
      if (!hasClinicalTextDataRef.current) return;
      if (autoBuildStateRef.current !== 'idle') return;
      markStageStart('plan');
      try {
        handleAutoBuildClick();
        // The build settles to 'idle' via existing effects; the auto-
        // build state effect (below) flips the chip to done.
      } catch (e) {
        markStageEnd('plan', 'error', e instanceof Error ? e.message : 'auto-build failed');
      }
    }, 3500);
  }, [handleAutoBuildClick, markStageEnd, markStageStart]);

  // Bind the actual implementation to the ref so the reasoning
  // trigger (defined earlier in render order) can call it.
  chainAutopilotAfterReasoningRef.current = chainAutopilotAfterReasoning;

  // Settle (Phase 1): detect when all four phantom engines have settled
  // (success or failure) and their staggered cart-add cascades have
  // completed (onGenerateComplete is deferred until after the last add).
  // Promote the state machine to 'organizing' and surface a failure toast if
  // anything errored. Phase 2 (below) schedules the nav + orchestrate timers
  // — splitting them prevents this effect's own state update from triggering
  // its cleanup and cancelling the timers before they fire.
  useEffect(() => {
    if (autoBuildState !== 'generating') return;
    if (autoBuildInFlightExercise || autoBuildInFlightMT || autoBuildInFlightEPA || autoBuildInFlightAdjunct) return;
    setAutoBuildState('organizing');
    if (autoBuildFailures.size > 0) {
      toast({
        title: "Some engines couldn't generate",
        description: `Plan still built — ${Array.from(autoBuildFailures).join(', ')} did not respond. Re-run the affected tab manually if needed.`,
        variant: 'destructive',
      });
    }
  }, [autoBuildState, autoBuildInFlightExercise, autoBuildInFlightMT, autoBuildInFlightEPA, autoBuildInFlightAdjunct, autoBuildFailures, toast]);
  // Settle (Phase 2): once we're in 'organizing', schedule a short tick so
  // the last cart-add flash/line animation can paint, then expand the
  // MasterPlanCard's inline section, scroll it into view, and bump the
  // orchestrate auto-trigger nonce so the OrchestratePlanProvider fires the
  // request. We deliberately do NOT navigate to the right-side My Plan tab
  // any more — the result lands inside the Master Plan card itself
  // (Task #270). Reset to 'idle' is driven primarily by the provider's
  // onAutoTriggerConsumed; we keep a 4 s safety fallback for the edge case
  // where the cart ended up with < 2 items so the button doesn't stay
  // stranded disabled.
  //
  // This effect's only dep is `autoBuildState`, so cleanup only fires when
  // the state actually leaves 'organizing' (not as an artifact of the
  // setState call inside the same effect).
  useEffect(() => {
    if (autoBuildState !== 'organizing') return;
    const settleTimer = window.setTimeout(() => {
      setMasterPlanExpandSignal(s => s + 1);
      setOrchestrateAutoNonce(prev => (prev ?? 0) + 1);
      // Best-effort scroll the card into view so the inline plan is visible.
      const el = masterPlanContainerRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
    const safetyIdleTimer = window.setTimeout(() => {
      setAutoBuildState(prev => (prev === 'organizing' ? 'idle' : prev));
      setAutoBuildFailures(new Set());
    }, 4000);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(safetyIdleTimer);
    };
  }, [autoBuildState]);

  // Task #313 — flip the autopilot "Plan" stage chip to done/error
  // when the auto-build finishes. The chip is moved to "running" by
  // the chain orchestrator when it calls `handleAutoBuildClick`.
  useEffect(() => {
    if (autoBuildState !== 'idle') return;
    setMonitorStages(prev => prev.map(s => {
      if (s.id !== 'plan' || s.state !== 'running') return s;
      const failed = autoBuildFailures.size > 0;
      const startedAt = stageStartedAtRef.current['plan'];
      const dur = startedAt ? Date.now() - startedAt : null;
      delete stageStartedAtRef.current['plan'];
      return {
        ...s,
        state: failed ? 'error' : 'done',
        lastDurationMs: dur,
        lastSkippedReason: failed ? Array.from(autoBuildFailures).join(', ') : null,
      };
    }));
  }, [autoBuildState, autoBuildFailures]);

  const exerciseMtActivePhaseIndex = useMemo(() => {
    if (!treatmentPlanData || !treatmentPlanData.phases || treatmentPlanData.phases.length === 0) return 0;
    const planCreated = treatmentPlanData.timestamp ? new Date(treatmentPlanData.timestamp).getTime() : Date.now();
    const daysSinceStart = Math.max(0, Math.floor((Date.now() - planCreated) / (1000 * 60 * 60 * 24)));
    let cumDays = 0;
    for (let i = 0; i < treatmentPlanData.phases.length; i++) {
      const weeks = parseFloat(treatmentPlanData.phases[i].durationWeeks) || 2;
      cumDays += weeks * 7;
      if (daysSinceStart < cumDays) return i;
    }
    return treatmentPlanData.phases.length - 1;
  }, [treatmentPlanData]);

  const exerciseMtClinicalState = useMemo<import("@/lib/goalStateEngine").ClinicalStateInput>(() => ({
    painMarkers: painMarkers.map(pm => ({
      boneName: pm.nearestBone || pm.anatomicalLabel || 'unknown',
      intensity: typeof pm.severity === 'number' ? pm.severity : 50,
    })),
    posturalDeviations: [],
    activePhaseIndex: exerciseMtActivePhaseIndex,
  }), [painMarkers, exerciseMtActivePhaseIndex]);

  const handleApplySimTimelineWeek = useCallback((payload: import('@/lib/simulationTimelineEngine').SessionApplyPayload) => {
    const newModelConfig = JSON.parse(JSON.stringify(modelConfig));
    for (const [joint, params] of Object.entries(payload.modelConfig)) {
      if (typeof params === 'object' && params !== null) {
        if (!newModelConfig[joint]) newModelConfig[joint] = {};
        const effectiveJoint = (effectiveModelConfig[joint] as Record<string, number> | undefined) ?? {};
        const rawJoint = (modelConfig[joint] as Record<string, number> | undefined) ?? {};
        for (const [param, simVal] of Object.entries(params as Record<string, number>)) {
          const effectiveVal = effectiveJoint[param] ?? 0;
          const rawVal = rawJoint[param] ?? 0;
          const delta = (simVal as number) - effectiveVal;
          if (Math.abs(delta) > 0.001) {
            newModelConfig[joint][param] = rawVal + delta;
          }
        }
      }
    }
    setModelConfig(newModelConfig);
    for (const [key, val] of Object.entries(payload.overrides)) {
      setMuscleOverrides(prev => ({ ...prev, [key]: { ...prev[key], ...val } }));
    }
    if (payload.painMarkerUpdates.length > 0) {
      setPainMarkers(prev => prev.map(m => {
        const update = payload.painMarkerUpdates.find(u => u.markerId === m.id);
        if (update) {
          return { ...m, severity: Math.max(0, Math.min(10, update.predictedSeverity)) };
        }
        return m;
      }));
    }
    if (payload.posturalUpdates.length > 0) {
      const posturalConfig = JSON.parse(JSON.stringify(newModelConfig));
      if (!posturalConfig['posture']) posturalConfig['posture'] = {};
      for (const pu of payload.posturalUpdates) {
        posturalConfig['posture'][pu.sliderId] = pu.predictedValue;
      }
      setModelConfig(posturalConfig);
    }
    if (payload.compensationUpdates.length > 0) {
      for (const cu of payload.compensationUpdates) {
        const resolutionFactor = cu.resolutionPercent / 100;
        const overrideKey = cu.patternId.replace(/[^a-zA-Z0-9_]/g, '_');
        setMuscleOverrides(prev => {
          const existing = prev[overrideKey];
          if (existing) {
            const tensionReduction = -Math.round(resolutionFactor * 15);
            return {
              ...prev,
              [overrideKey]: {
                ...existing,
                tensionOffset: (existing.tensionOffset ?? 0) + tensionReduction,
              },
            };
          }
          return prev;
        });
      }
    }
  }, [modelConfig, effectiveModelConfig]);

  const recoverySimBaselineRef = useRef<{
    painMarkers: Array<{ id: string; severity: number }>;
    compromisedTissues: Array<{ key: string; severity: number }>;
    scarMarkers: Array<{ id: string; severity: number; painOnPalpation: number }>;
    muscleOverrides: Array<{ key: string; tensionOffset: number; activationOffset: number; inhibition: number }>;
    modelConfigDeviations: Array<{ joint: string; param: string; value: number }>;
  } | null>(null);
  const recoverySimBranchRef = useRef<string | null>(null);
  const recoverySimCompromisedTissuesRef = useRef(compromisedTissues);
  const recoverySimScarMarkersRef = useRef(scarMarkers);
  const recoverySimMuscleOverridesRef = useRef(muscleOverrides);
  const recoverySimModelConfigRef = useRef(modelConfig);
  const handleApplySimTimelineWeekRef = useRef(handleApplySimTimelineWeek);
  useEffect(() => { recoverySimCompromisedTissuesRef.current = compromisedTissues; }, [compromisedTissues]);
  useEffect(() => { recoverySimScarMarkersRef.current = scarMarkers; }, [scarMarkers]);
  useEffect(() => { recoverySimMuscleOverridesRef.current = muscleOverrides; }, [muscleOverrides]);
  useEffect(() => { recoverySimModelConfigRef.current = modelConfig; }, [modelConfig]);
  useEffect(() => { handleApplySimTimelineWeekRef.current = handleApplySimTimelineWeek; }, [handleApplySimTimelineWeek]);
  useEffect(() => {
    if (!showRecoverySim) {
      recoverySimBaselineRef.current = null;
      recoverySimBranchRef.current = null;
    }
  }, [showRecoverySim]);

  const collectModelConfigDeviations = useCallback((mc: unknown): Array<{ joint: string; param: string; value: number }> => {
    const out: Array<{ joint: string; param: string; value: number }> = [];
    if (!mc || typeof mc !== 'object') return out;
    for (const [joint, params] of Object.entries(mc as Record<string, unknown>)) {
      if (params && typeof params === 'object') {
        for (const [param, val] of Object.entries(params as Record<string, unknown>)) {
          if (typeof val === 'number' && Math.abs(val) > 0.001) {
            out.push({ joint, param, value: val });
          }
        }
      }
    }
    return out;
  }, []);

  const handleApplyRecoverySimState = useCallback((info: { week: number; state: import('@/lib/recoverySimulationEngine').RecoveryState; baselineState: import('@/lib/recoverySimulationEngine').RecoveryState; branchName: string }) => {
    const { state, baselineState, branchName } = info;
    if (recoverySimBranchRef.current !== branchName) {
      recoverySimBaselineRef.current = null;
      recoverySimBranchRef.current = branchName;
    }
    if (!recoverySimBaselineRef.current) {
      const pm = painMarkersRef.current;
      const ct = recoverySimCompromisedTissuesRef.current;
      const sm = recoverySimScarMarkersRef.current;
      const mo = recoverySimMuscleOverridesRef.current;
      const modelConfigDeviations = collectModelConfigDeviations(recoverySimModelConfigRef.current);
      recoverySimBaselineRef.current = {
        painMarkers: pm.map(m => ({ id: m.id, severity: typeof m.severity === 'number' ? m.severity : 5 })),
        compromisedTissues: ct.map(t => ({ key: `${t.tissue_type}:${t.tissue_id}`, severity: t.severity })),
        scarMarkers: sm.map(s => ({ id: s.id, severity: s.severity, painOnPalpation: s.painOnPalpation })),
        muscleOverrides: Object.entries(mo)
          // Only scale pathology-driven overrides; leave clinician-intent manual neutral overrides untouched
          .filter(([, ov]) => ov && ov.pathology && ov.pathology !== 'none')
          .map(([key, ov]) => ({
            key,
            tensionOffset: ov.tensionOffset ?? 0,
            activationOffset: ov.activationOffset ?? 0,
            inhibition: ov.inhibition ?? 0,
          })),
        modelConfigDeviations,
      };
    }
    const baseline = recoverySimBaselineRef.current;

    const painFactor = baselineState.pain > 0.001
      ? Math.max(0, Math.min(2, state.pain / baselineState.pain))
      : (state.pain > 0.001 ? 1 : 0);
    const healingFactor = Math.max(0, Math.min(1.2, 1 - Math.max(0, state.healingProgress - baselineState.healingProgress) / 100));
    const romGap = Math.max(1, 100 - baselineState.romPercent);
    const romFactor = Math.max(0, Math.min(1.2, (100 - state.romPercent) / romGap));
    const motorGap = Math.max(1, 100 - baselineState.motorControl);
    const motorFactor = Math.max(0, Math.min(1.2, (100 - state.motorControl) / motorGap));

    // Build SessionApplyPayload for fields the existing handler supports
    const modelConfigPayload: Record<string, Record<string, number>> = {};
    for (const d of baseline.modelConfigDeviations) {
      if (!modelConfigPayload[d.joint]) modelConfigPayload[d.joint] = {};
      modelConfigPayload[d.joint][d.param] = d.value * romFactor;
    }

    const overridesPayload: Record<string, Partial<import('@/lib/muscleBiomechanicsEngine').MuscleOverride>> = {};
    for (const b of baseline.muscleOverrides) {
      overridesPayload[b.key] = {
        tensionOffset: Math.round(b.tensionOffset * motorFactor),
        activationOffset: Math.round(b.activationOffset * motorFactor),
        inhibition: Math.round(b.inhibition * motorFactor),
      };
    }

    const baselinePainMap = new Map(baseline.painMarkers.map(b => [b.id, b.severity]));
    const painMarkerUpdates = painMarkersRef.current
      .filter(m => baselinePainMap.has(m.id))
      .map(m => ({
        markerId: m.id,
        predictedSeverity: Math.max(0, Math.min(10, (baselinePainMap.get(m.id) ?? 5) * painFactor)),
      }));

    handleApplySimTimelineWeekRef.current({
      modelConfig: modelConfigPayload,
      overrides: overridesPayload,
      painMarkerUpdates,
      posturalUpdates: [],
      compensationUpdates: [],
    });

    // Compromised tissues + scar markers: not part of SessionApplyPayload shape; apply via setters
    if (baseline.compromisedTissues.length > 0) {
      const map = new Map(baseline.compromisedTissues.map(b => [b.key, b.severity]));
      setCompromisedTissues(prev => prev.map(t => {
        const base = map.get(`${t.tissue_type}:${t.tissue_id}`);
        if (base === undefined) return t;
        return { ...t, severity: Math.max(0, Math.min(10, base * healingFactor)) };
      }));
    }

    if (baseline.scarMarkers.length > 0) {
      const map = new Map(baseline.scarMarkers.map(b => [b.id, b]));
      setScarMarkers(prev => prev.map(s => {
        const base = map.get(s.id);
        if (!base) return s;
        return {
          ...s,
          severity: Math.max(1, Math.min(5, Math.round(base.severity * healingFactor))) as 1 | 2 | 3 | 4 | 5,
          painOnPalpation: Math.max(0, Math.min(10, Math.round(base.painOnPalpation * painFactor))),
        };
      }));
    }
  }, [collectModelConfigDeviations]);

  const recoverySimHasClinicalInput = useMemo(() => (
    painMarkers.length > 0 ||
    compromisedTissues.length > 0 ||
    scarMarkers.length > 0 ||
    Object.keys(muscleOverrides).length > 0 ||
    collectModelConfigDeviations(modelConfig).length > 0
  ), [painMarkers, compromisedTissues, scarMarkers, muscleOverrides, modelConfig, collectModelConfigDeviations]);

  const chainIntegrityScores = useMemo(() => {
    if (!showUnifiedChainPanel || (liteMode && computeStage < 3)) return new Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>();
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
  }, [effectiveModelConfig, showUnifiedChainPanel, compensatedOverrides, crossMuscleEffects, liteMode, computeStage]);

  // Live-updating signal for scrub state (rebuilds hudForceAnalysis when the
  // user pauses the timeline and drags). The actual playback time is read
  // synchronously from `forceTimeBuffer` so the engine output stays consistent
  // with what the buffer is reporting.
  const scrubPlaybackMs = forceTimeMetrics ? forceTimeBuffer.getPlaybackTime() : null;
  const isScrubbing = scrubPlaybackMs != null;

  /**
   * Base (un-augmented) force analysis — comes either from the live engine
   * or, while the user is scrubbing the time buffer, from the buffered frame
   * at the playback time. This is what gets pushed back into the buffer so
   * we never feed augmented values back into the dynamics layer (no loop).
   */
  const baseHudForceAnalysis = useMemo<ForceAnalysisResult>(() => {
    if (computeStage < 2) return EMPTY_FORCE_RESULT;
    if (isScrubbing) {
      const scrubbed = forceTimeBuffer.getScrubbedAnalysis();
      if (scrubbed) return scrubbed;
    }
    const hasActiveSimulation = whatIfSimulatedConfig && whatIfScenarios.length > 0;
    const base = (forceMode && forceAnalysis && !hasActiveSimulation)
      ? forceAnalysis
      : calculatePosturalForces(finalModelConfig);
    if (hasActiveSimulation && whatIfSimulatedConfig.forceMultiplier !== 1.0) {
      const multiplier = whatIfSimulatedConfig.forceMultiplier;
      const adjusted = JSON.parse(JSON.stringify(base));
      for (const j of adjusted.joints) {
        j.compression *= multiplier;
        j.tension *= multiplier;
        j.shear *= multiplier;
        j.totalForce *= multiplier;
        const maxBw = Math.max(j.compression, j.tension);
        if (maxBw < 0.8) j.status = 'low';
        else if (maxBw < 1.5) j.status = 'moderate';
        else if (maxBw < 3.0) j.status = 'high';
        else j.status = 'very_high';
      }
      return adjusted;
    }
    return base;
  }, [finalModelConfig, forceMode, forceAnalysis, whatIfScenarios, whatIfSimulatedConfig, computeStage, isScrubbing, scrubPlaybackMs]);

  /**
   * Dynamics-augmented force analysis consumed by every downstream surface
   * (HUD, mechanism analysis, panels, overlays). Adds the inertial m·a per
   * joint via `jointMassAboveFraction` (linked-segment chain), and reclassifies
   * `status` using the patient-state-aware threshold table so the HUD colors
   * respect post-op / osteoporotic / pediatric / athlete bands.
   */
  const hudForceAnalysis = useMemo<ForceAnalysisResult>(() => {
    if (!baseHudForceAnalysis || !baseHudForceAnalysis.joints?.length) return baseHudForceAnalysis;
    // Frame-accurate inertial during scrub: read the centred 2nd-derivative
    // |a| at the active scrubbed frame so the augmentation reflects the
    // selected timestamp, not the live-engine global peak. In live mode we
    // let the augment helper read `getLatestComAccelMag()` itself by passing
    // `undefined`, which keeps the HUD synced with the live impact reading.
    const comAccelMps2 = isScrubbing
      ? forceTimeBuffer.getComAccelMagAtActive()
      : undefined;
    return augmentForceAnalysisDynamics(baseHudForceAnalysis, {
      bodyWeightKg,
      patientState: patientForceState,
      comAccelMagN: comAccelMps2,
    });
    // NOTE: do NOT depend on `forceTimeMetrics` here — it would create a
    // feedback loop (push augmented frame → subscribe fires →
    // setForceTimeMetrics → re-memo → push again at ~60Hz even when no
    // genuine motion frame arrived). The augment helper reads
    // `forceTimeBuffer.getLatestComAccelMag()` / `getComAccelMagAtActive()`
    // directly, so it's already in sync without needing metrics in deps.
  }, [baseHudForceAnalysis, bodyWeightKg, patientForceState, isScrubbing, scrubPlaybackMs]);

  // ─── Time-aware force buffer push ────────────────────────────────────
  // Capture every recompute of the AUGMENTED analysis (chain-axial +
  // inertial m·a + patient-state status) so cumulative dose, rate of
  // loading, asymmetry, and peak markers are all derived from the same
  // canonical force model the HUD shows. Pushing the *augmented* result
  // (not the raw engine output) is what makes the trust + time layers
  // share one source of truth across Movement Player, phone camera, and
  // manual sliders. While scrubbing, do NOT push — we'd be writing past
  // frames as if they were live and corrupting the timeline.
  useEffect(() => {
    if (forceTimeBuffer.getPlaybackTime() != null) return;
    if (!hudForceAnalysis || !hudForceAnalysis.joints || hudForceAnalysis.joints.length === 0) return;
    const source: 'movement_player' | 'camera' | 'manual' =
      animationState.isPlaying ? 'movement_player'
      : cameraPoseActive ? 'camera'
      : 'manual';
    forceTimeBuffer.push({
      result: hudForceAnalysis,
      bodyWeightKg,
      source,
      movementId: animationState.currentMovement ?? null,
      // Capture the playhead so scrub-back can seek the Movement Player
      // back to the same frame and the 3D skeleton mirrors the HUD.
      movementProgress: animationState.isPlaying ? animationState.progress : null,
    });
  }, [hudForceAnalysis, bodyWeightKg, animationState.isPlaying, animationState.currentMovement, animationState.progress, cameraPoseActive]);

  // ─── Scrub-back seeks the Movement Player ────────────────────────────
  // When the clinician pauses and scrubs the time buffer, look up the active
  // snapshot. If it has a captured movement playhead, pause the Movement
  // Player and seek it to the same `progress` so the 3D skeleton renders the
  // pose that produced the scrubbed forces. This is what makes the HUD and
  // the skeleton time-consistent during scrub-back.
  useEffect(() => {
    if (!isScrubbing) return;
    const snap = forceTimeBuffer.getActiveSnapshot();
    if (!snap || !snap.movementId || snap.movementProgress == null) return;
    if (
      animationState.isPlaying ||
      animationState.currentMovement !== snap.movementId ||
      Math.abs((animationState.progress ?? 0) - snap.movementProgress) > 0.001
    ) {
      setAnimationState({
        isPlaying: false,
        currentMovement: snap.movementId,
        progress: snap.movementProgress,
        speed: animationState.speed,
      });
    }
  }, [isScrubbing, scrubPlaybackMs]);

  // Push patient state into the buffer so threshold / band lookups inside
  // `getMetrics()` use the same context as the HUD.
  useEffect(() => {
    forceTimeBuffer.setPatientState(patientForceState);
  }, [patientForceState]);

  // Subscribe React state to buffer-derived metrics (used by HUD circle + panel).
  useEffect(() => {
    setForceTimeMetrics(forceTimeBuffer.getMetrics());
    return subscribeForceBuffer(() => {
      setForceTimeMetrics(forceTimeBuffer.getMetrics());
    });
  }, []);

  const mechanismAnalysisResult = useMemo(() => {
    if (!showInjuryMechanism) return null;
    try {
      return analyzeInjuryMechanism({
        forceAnalysis: hudForceAnalysis,
        pathologyCompensation,
        correlationResult,
        compensatedOverrides,
        bodyWeightKg,
      });
    } catch { return null; }
  }, [showInjuryMechanism, hudForceAnalysis, pathologyCompensation, correlationResult, compensatedOverrides, bodyWeightKg]);

  const hudWeightDistribution = useMemo(() => {
    if (computeStage < 2) return null;
    if (forceMode && weightDistribution) return weightDistribution;
    return computeWeightDistribution(finalModelConfig, bodyWeightKg);
  }, [finalModelConfig, bodyWeightKg, forceMode, weightDistribution, computeStage]);

  const hudMuscleAnalysis = useMemo(() => {
    if (computeStage < 2) return null;
    if (muscleMode && muscleAnalysis) return muscleAnalysis;
    const base = computeFullMuscleAnalysis(finalModelConfig);
    return applyOverridesToAnalysis(base, effectiveOverrides, crossMuscleEffects);
  }, [finalModelConfig, muscleMode, muscleAnalysis, effectiveOverrides, crossMuscleEffects, computeStage]);

  const unifiedBiomechanicsOutput = useMemo(() => {
    if (computeStage < 3) return null;
    return computeUnifiedBiomechanics({
      modelConfig: finalModelConfig,
      heightCm: 170,
      weightKg: bodyWeightKg,
      muscleOverrides: compensatedOverrides,
      movementTaskId: unifiedBiomechanicsMovementTask,
      movementProgress: unifiedBiomechanicsProgress,
      faultRuleOverrides: unifiedBiomechanicsFaultOverrides.length > 0 ? unifiedBiomechanicsFaultOverrides : undefined,
      previousOutput: previousBiomechanicsOutput,
    });
  }, [finalModelConfig, bodyWeightKg, compensatedOverrides, unifiedBiomechanicsMovementTask, unifiedBiomechanicsProgress, unifiedBiomechanicsFaultOverrides, previousBiomechanicsOutput, computeStage]);

  useEffect(() => {
    if (unifiedBiomechanicsOutput) {
      setCachedBiomechanicsOutput(unifiedBiomechanicsOutput);
    }
  }, [unifiedBiomechanicsOutput]);

  const slingAnalysis = useMemo(() => {
    if (computeStage < 3) return null;
    const bioSrc = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput;
    const slingInput: SlingAnalysisInput = {
      biomechanicsOutput: bioSrc,
      muscleOverrides: muscleOverrides as Record<string, { tension?: number; pathology?: string }> | undefined,
      movementTaskId: unifiedBiomechanicsMovementTask ?? undefined,
      slingActivationOverrides,
    };
    const result = computeSlingAnalysis(slingInput);
    slingAnalysisRef.current = result;
    return result;
  }, [unifiedBiomechanicsOutput, cachedBiomechanicsOutput, muscleOverrides, unifiedBiomechanicsMovementTask, computeStage, slingActivationOverrides]);

  const slingTissueRisks = useMemo(() => computeSlingTissueRisks(slingAnalysis), [slingAnalysis]);

  // Reverse-reasoning sling driver analysis (Task #235). Pure deterministic;
  // shared between SlingAnalysisPanel and the engine tabs so both see the same
  // hypotheses + sling-driven recommendations.
  const slingDriverAnalysisResult = useMemo(() => {
    return runSlingDriverAnalysis(
      painMarkers.map(pm => ({
        id: pm.id,
        nearestBone: pm.nearestBone,
        anatomicalLabel: pm.anatomicalLabel || pm.nearestBone,
        severity: pm.severity,
        type: pm.type,
      })),
      slingAnalysis,
    );
  }, [painMarkers, slingAnalysis]);
  const slingDrivenRecommendations = slingDriverAnalysisResult.recommendations;

  const recoverySimConditionContext = useMemo<ConditionContext | null>(() => {
    if (!recoverySimHasClinicalInput && !extractionResult?.mainComplaint && !structuredReasoningData) return null;

    const compromisedTissueInputs = compromisedTissues.map(ct => ({
      type: ct.tissue_type as string,
      severity: ct.severity,
    }));

    const mechCounts: Record<string, number> = {};
    let nerveRootHit = false;
    for (const pm of painMarkers as Array<{ painMechanism?: string; anatomicalLabel?: string; description?: string }>) {
      const m = (pm.painMechanism ?? '').toString().toLowerCase();
      if (m) mechCounts[m] = (mechCounts[m] ?? 0) + 1;
      const lbl = `${pm.anatomicalLabel ?? ''} ${pm.description ?? ''}`.toLowerCase();
      if (/nerve root|radicul|sciatic|c[3-8]|l[3-5]|s1/.test(lbl)) nerveRootHit = true;
    }
    let dominantMech = Object.entries(mechCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (!dominantMech && structuredReasoningData?.dominantMechanism?.mechanism) {
      dominantMech = structuredReasoningData.dominantMechanism.mechanism.toLowerCase();
    }
    const reasoningText = structuredReasoningData
      ? `${structuredReasoningData.dominantMechanism?.label ?? ''} ${structuredReasoningData.problemClass?.label ?? ''} ${structuredReasoningData.dominantSymptomDriver?.driver ?? ''}`.toLowerCase()
      : '';
    if (!nerveRootHit && /radicul|nerve root|sciatic|c[3-8]|l[3-5]|s1/.test(reasoningText)) {
      nerveRootHit = true;
    }

    let romPct: number | null = null;
    if (romMeasurements.length > 0) {
      const ratios: number[] = [];
      for (const m of romMeasurements) {
        const upper = m.normalRange[1];
        if (upper > 0) {
          ratios.push(Math.max(0, Math.min(120, (m.measuredValue / upper) * 100)));
        }
      }
      if (ratios.length > 0) {
        romPct = ratios.reduce((s, v) => s + v, 0) / ratios.length;
      }
    }

    // Per-sling severity (0–100 each). Each sling contributes its
    // own weak-link count + a small bump for status, plus its
    // activation-override deviation from baseline. The aggregate is
    // derived as the max across the per-sling values.
    const slingSeverityById: Partial<Record<SlingId, number>> = {};
    if (slingAnalysis) {
      for (const s of slingAnalysis.slings) {
        const dys = (s.status === 'underperforming' || s.status === 'compensating') ? 10 : 0;
        slingSeverityById[s.slingId] = Math.min(100, s.weakLinks.length * 12 + dys);
      }
    }
    let activationDeficitLoad = 0;
    for (const [id, raw] of Object.entries(slingActivationOverrides)) {
      if (raw === undefined) continue;
      const pct = Math.max(0, Math.min(200, raw));
      const dev = pct - SLING_ACTIVATION_BASELINE;
      const localLoad = dev < 0 ? Math.abs(dev) : dev * 0.6;
      activationDeficitLoad += localLoad;
      // Fold into the matching sling's severity so per-sling
      // routing/gating reflects the override.
      const slingId = id as SlingId;
      const localAdd = Math.min(60, localLoad * 0.4);
      slingSeverityById[slingId] = Math.min(100, (slingSeverityById[slingId] ?? 0) + localAdd);
    }
    let slingSeverity = 0;
    for (const v of Object.values(slingSeverityById)) {
      if ((v ?? 0) > slingSeverity) slingSeverity = v ?? 0;
    }

    const deviations = collectModelConfigDeviations(modelConfig);
    let deviationMag = 0;
    for (const d of deviations) deviationMag += Math.abs(d.value);
    const deviationLoad = Math.min(40, deviationMag * 8);
    if (romPct === null && deviations.length > 0) {
      romPct = Math.max(40, 100 - deviationLoad * 1.5);
    }

    const baselineCap = compromisedTissueInputs.length > 0
      ? Math.max(20, 60 - compromisedTissueInputs.reduce((s, t) => s + t.severity, 0) * 0.3 - deviationLoad * 0.4)
      : Math.max(25, 50 - deviationLoad * 0.4);
    const baselineMotor = Math.max(25, (slingSeverity > 0 ? 70 - slingSeverity * 0.4 : 60) - deviationLoad * 0.5);

    const pathologyParts: string[] = [];
    if (extractionResult?.mainComplaint) pathologyParts.push(extractionResult.mainComplaint);
    const topHypothesis = structuredReasoningData?.hypotheses?.[0]?.condition;
    if (topHypothesis) pathologyParts.push(topHypothesis);
    if (structuredReasoningData?.problemClass?.label) pathologyParts.push(structuredReasoningData.problemClass.label);
    if (structuredReasoningData?.reasoningLayers?.tissueFamilySuspicion) {
      pathologyParts.push(structuredReasoningData.reasoningLayers.tissueFamilySuspicion);
    }
    const pathologyText = pathologyParts.length > 0 ? pathologyParts.join(' | ') : null;

    // Task #240 — use the effective (auto-populated + clinician-edited)
    // patient factors so structured-form edits flow into the sim.
    const factors = effectivePatientFactors;
    const mods = effectivePatientModifiers;

    // Task #255 — Natural Progression Layer. Resolve conditionId
    // from the pathology text the same way `buildConditionContext`
    // will, then compute the literature-derived prior + shifters and
    // pass them into the context so `simulateBranch` can anchor the
    // baseline branch (and lightly modulate the treated branch) to
    // the natural-history curve. We size the curve to the simulator's
    // hard upper-bound horizon (`MAX_SIMULATION_WEEKS`) — the
    // dashboard clamps `input.totalWeeks` to that value, and the
    // engine's per-week loop truncates to whatever the user picks.
    // Step 1: classify the complaint string. For most diagnoses this
    // is the final id. For LBP variants (acute_lbp / subacute_lbp /
    // chronic_lbp), the classifier picks a default from the text and
    // the bridge below refines it using structured patient factors so
    // a plain "low back pain" complaint plus a chronic chronicity
    // stage routes to chronic_lbp instead of the subacute default.
    const classifiedNpId = classifyCondition(pathologyText).id;
    const npConditionId = resolveNaturalProgressionConditionId(classifiedNpId, factors);
    const naturalProgression = computeNaturalProgression({
      conditionId: npConditionId,
      factors,
      totalWeeks: MAX_SIMULATION_WEEKS,
    });

    return buildConditionContext({
      mainComplaint: pathologyText,
      compromisedTissues: compromisedTissueInputs,
      scarSeverityList: scarMarkers.map(s => s.severity ?? 0),
      adhesionCount: adhesionBands.length,
      painMechanism: dominantMech,
      hasNerveRoot: nerveRootHit,
      currentRomPercent: romPct,
      baselineMotorControl: baselineMotor,
      baselineCapacity: baselineCap,
      slingWeakLinkSeverity: slingSeverity,
      slingSeverities: Object.keys(slingSeverityById).length > 0 ? slingSeverityById : null,
      ageYears: extractionResult?.patientAge ?? factors.age ?? null,
      patientHealingMult: mods.healingRateMultiplier,
      patientPainMult: mods.painSensitivityMultiplier,
      patientRecurrenceMult: mods.recurrenceRiskMultiplier,
      patientTissueQualityMult: mods.tissueQualityMultiplier,
      patientPhaseTimingMult: mods.phaseTimingMultiplier,
      patientRomCeiling: mods.romCeilingAdjustment,
      // Task #239 — pipe per-joint load vectors into the ConditionContext
      // so treatments declaring `loadModification` (rest_offload, taping_bracing,
      // motor_control, manual_therapy, …) can target the actual dominant
      // load components on the active skeleton.
      jointLoadVectors: extractJointLoadVectors(hudForceAnalysis ?? null, { topN: 6 }),
      naturalProgression,
    });
  }, [recoverySimHasClinicalInput, extractionResult, painMarkers, compromisedTissues, scarMarkers, adhesionBands, romMeasurements, structuredReasoningData, slingAnalysis, modelConfig, slingActivationOverrides, collectModelConfigDeviations, hudForceAnalysis, effectivePatientFactors, effectivePatientModifiers]);

  const naturalTimelineRequestContext = useMemo<NaturalTimelineRequestContext | null>(() => {
    if (!showRecoverySim) return null;
    const hasInput = recoverySimHasClinicalInput || !!extractionResult?.mainComplaint || !!structuredReasoningData;
    if (!hasInput) return null;
    const factors = autoPopulateFromPipeline(extractionResult ?? null, structuredReasoningData ?? null, DEFAULT_PATIENT_FACTORS);
    return {
      clinical_summary: structuredReasoningData
        ? `${structuredReasoningData.dominantMechanism?.label ?? ''} | ${structuredReasoningData.problemClass?.label ?? ''} | ${structuredReasoningData.dominantSymptomDriver?.driver ?? ''}`.trim()
        : undefined,
      main_complaint: extractionResult?.mainComplaint ?? undefined,
      pain_markers: (painMarkers as unknown as Array<Record<string, unknown>>).map(pm => ({
        anatomical_label: String(pm.anatomicalLabel ?? ''),
        symptom_type: pm.symptomType ? String(pm.symptomType) : undefined,
        pain_mechanism: pm.painMechanism ? String(pm.painMechanism) : undefined,
        description: pm.description ? String(pm.description) : undefined,
        severity: typeof pm.severity === 'number' ? pm.severity : undefined,
      })),
      compromised_tissues: compromisedTissues.map(ct => {
        const r = ct as unknown as Record<string, unknown>;
        return {
          tissue_type: String(ct.tissue_type),
          tissue_id: String(r.tissue_id ?? r.id ?? ct.tissue_type),
          severity: ct.severity,
          rationale: r.rationale ? String(r.rationale) : undefined,
        };
      }),
      has_nerve_root: /nerve root|radicul|sciatic/.test(JSON.stringify(painMarkers).toLowerCase()),
      sling_weak_links: slingAnalysis
        ? slingAnalysis.slings.flatMap(s =>
            (s.weakLinks ?? []).map(wl => ({
              sling: s.label ?? s.slingId ?? 'sling',
              weakLink: typeof wl === 'string' ? wl : String(wl),
              severity: s.status === 'compensating' ? 70 : s.status === 'underperforming' ? 55 : 30,
            }))
          )
        : undefined,
      sling_activation_overrides: (() => {
        const labelById = new Map<string, string>();
        if (slingAnalysis) {
          for (const s of slingAnalysis.slings) labelById.set(s.slingId, s.label ?? s.slingId);
        }
        const entries: Array<{ sling: string; activation_percent: number; band: string; deficit_severity: number }> = [];
        for (const [id, raw] of Object.entries(slingActivationOverrides)) {
          if (raw === undefined) continue;
          const pct = Math.max(0, Math.min(200, raw));
          if (pct === SLING_ACTIVATION_BASELINE) continue;
          const dev = pct - SLING_ACTIVATION_BASELINE;
          const band =
            pct < SLING_ACTIVATION_BASELINE
              ? (pct <= 30 ? 'severe_under' : 'mild_under')
              : (pct >= 170 ? 'severe_over' : 'mild_over');
          const deficit_severity = Math.min(100, Math.round(dev < 0 ? Math.abs(dev) : dev * 0.6));
          entries.push({
            sling: labelById.get(id) ?? id,
            activation_percent: Math.round(pct),
            band,
            deficit_severity,
          });
        }
        return entries.length > 0 ? entries : undefined;
      })(),
      joint_deviations: collectModelConfigDeviations(modelConfig).map(d => ({
        joint: d.joint,
        parameter: d.param,
        degrees: d.value,
      })),
      postural_deviations: collectModelConfigDeviations(modelConfig).reduce<Record<string, number>>((acc, d) => {
        acc[`${d.joint}.${d.param}`] = d.value;
        return acc;
      }, {}),
      region_highlights: [
        ...scarMarkers.map(s => ({ region: String((s as unknown as Record<string, unknown>).anatomicalLabel ?? 'scar'), type: 'scar', severity: s.severity ?? 0 })),
        ...adhesionBands.map(b => ({ region: String((b as unknown as Record<string, unknown>).anatomicalLabel ?? 'adhesion'), type: 'adhesion', severity: ((b as unknown as Record<string, unknown>).severity as number) ?? 0 })),
        ...romMeasurements.map(m => ({
          region: String((m as unknown as Record<string, unknown>).joint ?? (m as unknown as Record<string, unknown>).movement ?? 'rom'),
          type: 'rom_restriction',
          severity: m.normalRange[1] > 0 ? Math.max(0, Math.round(100 - (m.measuredValue / m.normalRange[1]) * 100)) : undefined,
          label: `${(m as unknown as Record<string, unknown>).movement ?? ''}: ${m.measuredValue}/${m.normalRange[1]}°`,
        })),
      ],
      patient_factors: {
        age: factors.age ?? extractionResult?.patientAge ?? null,
        bmi: factors.bmi,
        smoking: factors.smoking,
        diabetes: factors.diabetes,
        activity_level: factors.activityLevel,
        sleep_quality: factors.sleepQuality,
        psychological_risk: factors.psychologicalRisk,
        previous_episodes: factors.previousEpisodes,
        chronicity: factors.chronicity,
        compliance_percent: factors.compliance,
        symptom_duration: extractionResult?.duration ?? null,
        irritability: extractionResult?.irritability ?? null,
      },
    };
  }, [showRecoverySim, recoverySimHasClinicalInput, extractionResult, structuredReasoningData, painMarkers, compromisedTissues, slingAnalysis, modelConfig, scarMarkers, adhesionBands, romMeasurements, slingActivationOverrides, collectModelConfigDeviations]);

  /** Stable dedup signature for the natural-timeline request. Built
   *  from clinically meaningful fields only (with quantized numeric
   *  values) so trivial floating-point drift from the live 3D model
   *  state — driven by the simulator's auto-sync skeleton wiring —
   *  cannot retrigger an AI fetch. The full live context is still
   *  POSTed to the server; this signature just controls when we
   *  *consider* the request inputs to have meaningfully changed. */
  const naturalTimelineSignature = useMemo<string | null>(() => {
    if (!naturalTimelineRequestContext) return null;
    const ctx = naturalTimelineRequestContext;
    const bucket = (n: number | null | undefined, step: number) =>
      n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n / step) * step;
    const sigPainMarkers = (ctx.pain_markers ?? [])
      .map(pm => [
        pm.anatomical_label ?? '',
        pm.symptom_type ?? '',
        pm.pain_mechanism ?? '',
        bucket(pm.severity, 5),
      ].join('|'))
      .sort();
    const sigTissues = (ctx.compromised_tissues ?? [])
      .map(t => [t.tissue_id, t.tissue_type, bucket(t.severity, 5)].join('|'))
      .sort();
    const sigSlings = (ctx.sling_weak_links ?? [])
      .map(s => [s.sling, s.weakLink, bucket(s.severity, 10)].join('|'))
      .sort();
    const sigSlingActivation = (ctx.sling_activation_overrides ?? [])
      .map(o => [o.sling, bucket(o.activation_percent, 10), o.band].join('|'))
      .sort();
    const sigRegions = (ctx.region_highlights ?? [])
      .map(r => [r.region, r.type, bucket(r.severity ?? null, 10)].join('|'))
      .sort();
    const f: Record<string, string | number | boolean | null | undefined> = ctx.patient_factors ?? {};
    const num = (v: string | number | boolean | null | undefined): number | null =>
      typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) ? Number(v) : null;
    const str = (v: string | number | boolean | null | undefined): string =>
      v === null || v === undefined ? '' : String(v);
    const sigFactors = [
      bucket(num(f.age), 5),
      bucket(num(f.bmi), 2),
      str(f.smoking),
      str(f.diabetes),
      str(f.activity_level),
      str(f.sleep_quality),
      str(f.psychological_risk),
      bucket(num(f.previous_episodes), 1),
      str(f.chronicity),
      bucket(num(f.compliance_percent), 10),
      str(f.symptom_duration),
      str(f.irritability),
    ].join('|');
    return JSON.stringify({
      cs: ctx.clinical_summary ?? '',
      mc: ctx.main_complaint ?? '',
      pm: sigPainMarkers,
      tis: sigTissues,
      nr: !!ctx.has_nerve_root,
      sl: sigSlings,
      sla: sigSlingActivation,
      rh: sigRegions,
      pf: sigFactors,
      // joint_deviations + postural_deviations intentionally OMITTED:
      // they are driven by the live skeleton state and would otherwise
      // retrigger an AI fetch on every chart scrub.
    });
  }, [naturalTimelineRequestContext]);

  const naturalTimeline = useNaturalTimeline({
    context: naturalTimelineRequestContext,
    enabled: showRecoverySim,
    signature: naturalTimelineSignature,
    patientContext: patientContextPayload,
  });

  /** Resolve the same archetype the dashboard will render so the
   *  case-specific plan request sends matching phase ids/names. The
   *  dashboard mirrors this resolution: trust the precomputed
   *  archetypeId on conditionContext if available, otherwise fall back
   *  to label-based resolution. */
  const recoverySimArchetype = useMemo(() => {
    if (!recoverySimConditionContext) return null;
    const precomputed = recoverySimConditionContext.archetypeId;
    if (precomputed && RECOVERY_ARCHETYPES[precomputed]) return RECOVERY_ARCHETYPES[precomputed];
    return getArchetypeForCondition(recoverySimConditionContext.conditionId, recoverySimConditionContext.conditionLabel);
  }, [recoverySimConditionContext]);

  const recoverySimPhases = useMemo(() => {
    if (!recoverySimArchetype) return [] as Array<{ id: string; name: string; subtitle?: string }>;
    return recoverySimArchetype.stages.map(s => ({ id: s.id, name: s.name, subtitle: s.subtitle }));
  }, [recoverySimArchetype]);

  /** Case-specific plan signature. Reuses the natural-timeline signature
   *  (which already excludes high-frequency live skeleton fields) and
   *  adds the natural-timeline verdict + archetype phase ids so the
   *  plan refetches whenever the verdict or archetype changes. */
  const caseSpecificPlanSignature = useMemo<string | null>(() => {
    if (!naturalTimelineSignature || !naturalTimeline.result || recoverySimPhases.length === 0) return null;
    const nt = naturalTimeline.result;
    const ntSig = JSON.stringify({
      pf: nt.per_finding.map(f => [f.finding_id, f.healing_class, f.expected_weeks_to_resolution, Math.round(f.residual_deficit_percent / 5) * 5].join('|')).sort(),
      ow: [Math.round(nt.overall_window_weeks.expected), Math.round(nt.overall_window_weeks.best), Math.round(nt.overall_window_weeks.worst)],
      cr: Math.round(nt.chronicity_risk_percent / 10) * 10,
      rr: Math.round(nt.recurrence_risk_percent / 10) * 10,
      fr: Math.round(nt.flare_risk_percent / 10) * 10,
    });
    return JSON.stringify({
      base: naturalTimelineSignature,
      arch: recoverySimArchetype?.id ?? '',
      phases: recoverySimPhases.map(p => p.id),
      nt: ntSig,
    });
  }, [naturalTimelineSignature, naturalTimeline.result, recoverySimPhases, recoverySimArchetype]);

  const caseSpecificPlan = useCaseSpecificPlan({
    context: naturalTimelineRequestContext,
    naturalTimeline: naturalTimeline.result,
    phases: recoverySimPhases,
    archetypeId: recoverySimArchetype?.id,
    conditionLabel: recoverySimConditionContext?.conditionLabel ?? extractionResult?.mainComplaint ?? undefined,
    qaHistory: naturalTimeline.qaHistory,
    enabled: showRecoverySim && !!naturalTimeline.result && recoverySimPhases.length > 0,
    signature: caseSpecificPlanSignature,
    patientContext: patientContextPayload,
  });

  /** Derive a downstream patient-context status for each AI panel.
   *  - "absent"   : prediction exists but the clinician hasn't supplied
   *                 any patient context yet (non-blocking accuracy hint).
   *  - "updating" : the clinician has context, but the panel is mid-
   *                 refresh OR the displayed result was generated with
   *                 a different (stale) context signature.
   *  - "applied"  : the displayed result already reflects the latest
   *                 patient context. */
  const patientContextAnsweredCount = patientContextPayload.answers.length;
  const naturalTimelinePcStatus = useMemo<"absent" | "updating" | "applied">(() => {
    if (!hasPatientContext) return "absent";
    if (naturalTimeline.loading) return "updating";
    if (naturalTimeline.appliedPatientContextSig !== naturalTimeline.currentPatientContextSig) return "updating";
    if (!naturalTimeline.result) return "updating";
    return "applied";
  }, [
    hasPatientContext,
    naturalTimeline.loading,
    naturalTimeline.result,
    naturalTimeline.appliedPatientContextSig,
    naturalTimeline.currentPatientContextSig,
  ]);
  const caseSpecificPlanPcStatus = useMemo<"absent" | "updating" | "applied">(() => {
    if (!hasPatientContext) return "absent";
    if (caseSpecificPlan.loading) return "updating";
    if (caseSpecificPlan.appliedPatientContextSig !== caseSpecificPlan.currentPatientContextSig) return "updating";
    if (!caseSpecificPlan.result) return "updating";
    return "applied";
  }, [
    hasPatientContext,
    caseSpecificPlan.loading,
    caseSpecificPlan.result,
    caseSpecificPlan.appliedPatientContextSig,
    caseSpecificPlan.currentPatientContextSig,
  ]);
  /** The recovery-simulation chip rolls up both downstream calls — if
   *  EITHER is still mid-refresh we show "updating" so the clinician
   *  knows the simulation isn't yet a complete reflection of the new
   *  context. */
  const recoverySimPcStatus = useMemo<"absent" | "updating" | "applied">(() => {
    if (!hasPatientContext) return "absent";
    if (naturalTimelinePcStatus === "updating" || caseSpecificPlanPcStatus === "updating") return "updating";
    return "applied";
  }, [hasPatientContext, naturalTimelinePcStatus, caseSpecificPlanPcStatus]);

  /** When the patient-context payload changes, debounce-fire an
   *  incremental parse so the PREDICTION refreshes alongside the
   *  natural-timeline / case-specific-plan / recovery-sim hooks (which
   *  already auto-refire via their dedup signature). This makes the
   *  "submit / update context" experience consistent across all four
   *  AI surfaces — no manual button required.
   *
   *  We only fire when:
   *    - a prediction has actually been made (a parse result exists), AND
   *    - the patient-context payload signature genuinely changed
   *      (prevents auto-fire on initial mount or empty -> empty churn). */
  const patientContextSig = useMemo(
    () => buildPatientContextSig(patientContextPayload),
    [patientContextPayload],
  );

  // ─── Active Movement Mode wiring ──────────────────────
  // Compute a stable per-case ID from the same FNV hash used by the
  // CaseResearchPanel below, so the active-capacity profile lives on
  // the same case row.
  const activeCaseId = useMemo(() => {
    const desc = (lastClinicalParseResult?.original_description || '').replace(/\s+/g, ' ').trim();
    if (!desc) return null;
    const fnv32 = (s: string) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    };
    return `case-${fnv32(desc)}`;
  }, [lastClinicalParseResult]);

  const activeCapacitiesEnabled = skeletonMode === 'movement' && !!activeCaseId;
  const { profile: activeCapacityProfile, effectiveProfile: activeCapacityEffective, profileMap: activeCapacityMap, generate: generateActiveCapacity, generating: generatingActiveCapacity }
    = useActiveCapacities(activeCaseId, activeCapacitiesEnabled);
  void activeCapacityEffective;

  // Auto-generate the capacity profile the first time the clinician
  // enters Movement Mode for a case that has a research synthesis but
  // no active-capacity rows yet.
  useEffect(() => {
    if (skeletonMode !== 'movement') return;
    if (!activeCaseId) return;
    if (activeCapacityProfile) return;
    if (generatingActiveCapacity) return;
    const t = window.setTimeout(() => {
      generateActiveCapacity.mutate(false);
    }, 250);
    return () => window.clearTimeout(t);
    // generateActiveCapacity is a stable mutation object from React Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skeletonMode, activeCaseId, activeCapacityProfile, generatingActiveCapacity]);

  const [painfulArcFlares, setPainfulArcFlares] = useState<Array<{
    joint: string; movement: string; angle: number; intensity: number; arcStart: number; arcEnd: number; timestamp: number;
  }>>([]);
  const handlePainfulArcFlare = useCallback((flare: {
    joint: string; movement: string; angle: number; intensity: number; arcStart: number; arcEnd: number;
  }) => {
    if (skeletonModeRef.current !== 'movement') return;
    const now = Date.now();
    setPainfulArcFlares(prev => [
      { ...flare, timestamp: now },
      ...prev.filter(f => now - f.timestamp < 8000),
    ].slice(0, 6));
  }, []);

  const handleActiveMovementAttempt = useCallback(async (attempt: {
    joint: string;
    movement: string;
    achievedAngle: number;
    activeRomMax: number;
    passiveRomMax: number;
    inPainfulArc: boolean;
    exceededActiveLimit: boolean;
    compensationsTriggered: string[];
  }) => {
    if (skeletonModeRef.current !== 'movement') return;
    const desc = (lastClinicalParseResult?.original_description || '').replace(/\s+/g, ' ').trim();
    const summary = (lastClinicalParseResult?.clinical_summary || '').replace(/\s+/g, ' ').trim();
    const condition = (summary && summary.length <= 240 ? summary : desc).slice(0, 240) || 'Unspecified condition';
    const id = `mf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const placeholder: MovementFinding = {
      id,
      timestamp: Date.now(),
      joint: attempt.joint,
      movement: attempt.movement,
      achievedAngle: attempt.achievedAngle,
      inPainfulArc: attempt.inPainfulArc,
      exceededActiveLimit: attempt.exceededActiveLimit,
      sentence: '',
      loading: true,
    };
    // Cap stream at 12 most-recent findings.
    setMovementFindings(prev => [placeholder, ...prev].slice(0, 12));
    try {
      const res = await fetch('/api/movement-findings/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          condition,
          caseSummaryShort: summary ? summary.slice(0, 800) : undefined,
          ...attempt,
        }),
      });
      const data = res.ok ? await res.json() : null;
      const sentence = (data?.sentence as string) || `${attempt.joint} ${attempt.movement} reached ${Math.round(attempt.achievedAngle)}°.`;
      setMovementFindings(prev => prev.map(f => f.id === id ? { ...f, sentence, loading: false } : f));
    } catch (err) {
      setMovementFindings(prev => prev.map(f => f.id === id ? { ...f, sentence: `${attempt.joint} ${attempt.movement} reached ${Math.round(attempt.achievedAngle)}° (offline).`, loading: false } : f));
    }
  }, [lastClinicalParseResult]);

  // Lightweight reshape of the capacity map → the prop expected by
  // PureThreeGLBViewer (lookup by `joint:movement`). We pass the
  // *effective* profile (passive×0.85 fallback while AI is generating)
  // so dragging is gated immediately when the clinician flips into
  // Movement Mode rather than waiting for the request to return.
  const viewerActiveCapacities = useMemo(() => {
    if (skeletonMode !== 'movement') return null;
    if (activeCapacityMap) return activeCapacityMap;
    if (activeCapacityEffective) {
      const m: Record<string, typeof activeCapacityEffective.rows[number]> = {};
      for (const r of activeCapacityEffective.rows) m[`${r.joint}:${r.movement}`] = r;
      return m;
    }
    return null;
  }, [skeletonMode, activeCapacityMap, activeCapacityEffective]);

  const lastAppliedPcSigRef = useRef<string>('');
  const pcAutoApplyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // When the case is cleared (no parse result), reset the applied-sig
    // ref so the next case doesn't inherit a stale signature and trigger
    // an unnecessary incremental parse on first context entry.
    if (!lastClinicalParseResult) {
      lastAppliedPcSigRef.current = '';
      if (pcAutoApplyTimerRef.current) {
        window.clearTimeout(pcAutoApplyTimerRef.current);
        pcAutoApplyTimerRef.current = null;
      }
      return;
    }
    if (lastAppliedPcSigRef.current === patientContextSig) return;
    if (pcAutoApplyTimerRef.current) window.clearTimeout(pcAutoApplyTimerRef.current);
    pcAutoApplyTimerRef.current = window.setTimeout(() => {
      lastAppliedPcSigRef.current = patientContextSig;
      clinicalTextInputRef.current?.triggerIncrementalParse();
    }, 900);
    return () => {
      if (pcAutoApplyTimerRef.current) {
        window.clearTimeout(pcAutoApplyTimerRef.current);
        pcAutoApplyTimerRef.current = null;
      }
    };
  }, [patientContextSig, lastClinicalParseResult]);

  const clinicalPlan = useMemo<ClinicalPlanResult | null>(() => {
    const bioSrc = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput;
    const hasPain = painMarkers.length > 0;
    const hasBio = !!bioSrc;
    const hasSling = !!slingAnalysis;
    const hasMuscle = Object.keys(muscleOverrides).length > 0;
    const hasPosture = Object.keys(modelConfig).some(g => {
      const vals = modelConfig[g];
      return vals && Object.values(vals).some(v => Math.abs(v) > 3);
    });
    if (!hasPain && !hasBio && !hasSling && !hasMuscle && !hasPosture) return null;

    return synthesizeClinicalPlan({
      painMarkers: painMarkers.map(pm => ({
        id: pm.id,
        label: pm.anatomicalLabel || pm.nearestBone,
        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
        type: pm.type,
        description: pm.description,
      })),
      biomechanics: bioSrc ? {
        faults: bioSrc.faults.faults.map(f => ({
          label: f.label,
          severity: f.severity,
          category: f.category,
          clinical: f.clinical,
          corrective: f.corrective,
        })),
        deviations: bioSrc.posture.deviations.map(d => ({
          pattern: d.pattern,
          region: d.region,
          severity: d.severity,
          angleDeg: d.angleDeg,
        })),
        qualityScore: bioSrc.qualityScore,
        clinicalSummary: bioSrc.clinicalSummary,
      } : undefined,
      slingAnalysis: slingAnalysis ?? undefined,
      slingTissueRisks,
      muscleOverrides: muscleOverrides as Record<string, Partial<{ tensionOffset: number; pathology: string }>>,
      postureState: modelConfig,
      compromisedTissues: compromisedTissues.length > 0 ? compromisedTissues.map(ct => ({
        tissue_type: ct.tissue_type,
        tissue_id: ct.tissue_id,
        severity: ct.severity,
        rationale: ct.rationale,
      })) : undefined,
    });
  }, [painMarkers, unifiedBiomechanicsOutput, cachedBiomechanicsOutput, slingAnalysis, slingTissueRisks, muscleOverrides, modelConfig, compromisedTissues]);

  const mergedCompromisedTissues = useMemo(() => {
    const clinicalMap = new Map<string, CompromisedTissue>();
    for (const ct of compromisedTissues) {
      const key = `${ct.tissue_type}:${ct.tissue_id}`;
      const existing = clinicalMap.get(key);
      if (!existing || ct.severity > existing.severity) {
        clinicalMap.set(key, ct);
      }
    }
    for (const sr of slingTissueRisks) {
      const key = `${sr.tissue_type}:${sr.tissue_id}`;
      const existing = clinicalMap.get(key);
      if (!existing || sr.severity > existing.severity) {
        clinicalMap.set(key, {
          tissue_type: sr.tissue_type,
          tissue_id: sr.tissue_id,
          severity: sr.severity,
          rationale: sr.rationale,
          confidence: sr.confidence,
        });
      }
    }
    return Array.from(clinicalMap.values()).sort((a, b) => b.severity - a.severity);
  }, [compromisedTissues, slingTissueRisks]);

  const tissueIntelligenceMap = useMemo(() => {
    const map = new Map<string, TissueIntelligence>();
    try {
      const jointForceData = hudForceAnalysis?.joints?.map((f: JointSurfaceForce) => ({
        boneName: f.boneName,
        totalForce: f.totalForce,
        status: f.status,
        label: f.label,
      })) ?? [];

      const chainScores = Array.from(chainIntegrityScores.entries()).map(([chainId, val]) => ({
        chainId,
        score: val.score,
        issues: val.issues,
      }));

      const postureDeviations: Record<string, number> = {};
      if (modelConfig?.spine?.thoracicKyphosis !== undefined) postureDeviations['thoracicKyphosis'] = modelConfig.spine.thoracicKyphosis as number;
      if (modelConfig?.spine?.forwardHead !== undefined) postureDeviations['forwardHead'] = modelConfig.spine.forwardHead as number;
      if (modelConfig?.spine?.lumbarLordosis !== undefined) postureDeviations['lumbarLordosis'] = modelConfig.spine.lumbarLordosis as number;
      if (modelConfig?.pelvis?.tilt !== undefined) postureDeviations['pelvicTilt'] = modelConfig.pelvis.tilt as number;

      const painMarkersInput = painMarkers.map(pm => ({
        label: pm.anatomicalLabel || pm.nearestBone,
        severity: ((pm as unknown as Record<string, unknown>).severity as number | undefined) ?? 5,
        type: pm.type,
        description: pm.description,
      }));

      const mapChainToFasciaIds = (chainId: string): string[] => {
        const c = chainId.toLowerCase();
        if (c.startsWith('superficial_back')) return ['sbl'];
        if (c.startsWith('superficial_front')) return ['sfl'];
        if (c.startsWith('deep_front')) return ['dfl'];
        if (c.startsWith('lateral_line_l')) return ['lateral_l'];
        if (c.startsWith('lateral_line_r')) return ['lateral_r'];
        if (c.startsWith('lateral_line')) return ['lateral_l', 'lateral_r'];
        if (c.startsWith('spiral')) return ['spiral'];
        if (c.startsWith('arm_line_l')) return ['front_arm_l'];
        if (c.startsWith('arm_line_r')) return ['front_arm_r'];
        if (c.startsWith('arm_line')) return ['front_arm_l', 'front_arm_r'];
        return [];
      };
      const scarTissueIds: string[] = [];
      for (const scar of scarMarkers) {
        try {
          const impact = getScarImpact(scar);
          for (const ac of impact.affectedChains) {
            const cid = (ac.chain as { id?: string }).id;
            if (cid) scarTissueIds.push(...mapChainToFasciaIds(cid));
          }
        } catch {
          /* ignore */
        }
      }
      for (const ad of adhesionBands) {
        if (ad.depth === 'deep') scarTissueIds.push('dfl');
        scarTissueIds.push('sfl');
      }

      const results = aggregateTissueIntelligence({
        aiCompromisedTissues: compromisedTissues,
        slingTissueRisks,
        jointForceData,
        muscleOverrides: compensatedOverrides as unknown as Record<string, { pathology?: string; inhibition?: number; isManual?: boolean }>,
        painMarkers: painMarkersInput,
        chainIntegrityScores: chainScores,
        scarTissueIds: scarTissueIds.length > 0 ? Array.from(new Set(scarTissueIds)) : undefined,
        postureDeviations,
      });
      for (const r of results) {
        map.set(`${r.tissueType}:${r.tissueId}`, r);
      }
    } catch (err) {
      console.warn('[TissueIntelligence] aggregation failed', err);
    }
    return map;
  }, [compromisedTissues, slingTissueRisks, hudForceAnalysis, chainIntegrityScores, modelConfig, painMarkers, compensatedOverrides, scarMarkers, adhesionBands]);

  const inflammationIntelligenceMap = useMemo(() => {
    const list = filterInflammationIntelligence(Array.from(tissueIntelligenceMap.values()), 6);
    const map = new Map<string, TissueIntelligence>();
    for (const r of list) map.set(`${r.tissueType}:${r.tissueId}`, r);
    return map;
  }, [tissueIntelligenceMap]);

  const hubCompromisedTissues = useMemo(() => {
    const map = new Map<string, CompromisedTissue>();
    for (const ct of compromisedTissues) {
      const key = `${ct.tissue_type}:${ct.tissue_id}`;
      const existing = map.get(key);
      if (!existing || ct.severity > existing.severity) {
        map.set(key, ct);
      }
    }
    for (const intel of Array.from(inflammationIntelligenceMap.values())) {
      const key = `${intel.tissueType}:${intel.tissueId}`;
      const existing = map.get(key);
      const sev = Math.max(0, Math.min(1, intel.severity ?? 0));
      const conf: 'confirmed' | 'predicted' = intel.confidence === 'high' ? 'confirmed' : 'predicted';
      const rationale = intel.rationale || (intel.evidence[0]?.note ?? 'Clinical inflammation');
      if (!existing) {
        map.set(key, {
          tissue_type: intel.tissueType as CompromisedTissue['tissue_type'],
          tissue_id: intel.tissueId,
          severity: sev,
          rationale,
          confidence: conf,
        });
      } else if (sev > existing.severity) {
        map.set(key, { ...existing, severity: sev });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.severity - a.severity).slice(0, 6);
  }, [compromisedTissues, inflammationIntelligenceMap]);

  const [causalChainTissueId, setCausalChainTissueId] = useState<string | null>(null);
  const handleTissueCausalChainSelect = useCallback((tissueId: string) => {
    setCausalChainTissueId(prev => (prev === tissueId ? null : tissueId));
  }, []);

  const causalChainHighlights = useMemo(() => {
    if (!causalChainTissueId) return [];
    let intel: import('@/lib/tissueIntelligence').TissueIntelligence | undefined;
    for (const v of Array.from(tissueIntelligenceMap.values())) {
      if (v.tissueId === causalChainTissueId) { intel = v; break; }
    }
    if (!intel) return [];
    const REGION_TO_BONES: Record<string, string[]> = {
      'lumbar spine': ['RootPart1_M', 'RootPart2_M', 'Spine1_M'],
      'thoracic spine': ['Spine1_M', 'Chest_M'],
      'cervical spine': ['NeckPart1_M', 'NeckPart2_M', 'Head_M'],
      'thoracolumbar fascia': ['RootPart1_M', 'Spine1_M'],
      'pelvis': ['Root_M', 'Hip_L', 'Hip_R'],
      'hip': ['Hip_L', 'Hip_R'],
      'knee': ['Knee_L', 'Knee_R'],
      'ankle': ['Ankle_L', 'Ankle_R'],
      'foot': ['Toes_L', 'Toes_R'],
      'plantar fascia': ['Ankle_L', 'Ankle_R', 'Toes_L', 'Toes_R'],
      'quadriceps': ['Hip_L', 'Hip_R', 'Knee_L', 'Knee_R'],
      'hamstrings': ['Hip_L', 'Hip_R', 'Knee_L', 'Knee_R'],
      'calf': ['Knee_L', 'Knee_R', 'Ankle_L', 'Ankle_R'],
      'shoulder': ['Shoulder_L', 'Shoulder_R'],
      'scapular stabilisers': ['Scapula_L', 'Scapula_R'],
      'scapula': ['Scapula_L', 'Scapula_R'],
      'elbow': ['Elbow_L', 'Elbow_R'],
      'wrist': ['Wrist_L', 'Wrist_R'],
    };
    const lookupBones = (region: string): string[] => {
      const r = region.toLowerCase().trim();
      if (REGION_TO_BONES[r]) return REGION_TO_BONES[r];
      for (const [k, v] of Object.entries(REGION_TO_BONES)) {
        if (r.includes(k) || k.includes(r)) return v;
      }
      return [];
    };
    const out: Array<{ boneName: string; color: number; intensity: number; glowSize?: number }> = [];
    const seen = new Set<string>();
    for (const b of intel.bones || []) {
      if (seen.has(b)) continue;
      seen.add(b);
      out.push({ boneName: b, color: 0xa855f7, intensity: 0.95, glowSize: 1.6 });
    }
    for (const up of intel.compensation.upstream) {
      for (const b of lookupBones(up.region)) {
        if (seen.has(b)) continue;
        seen.add(b);
        out.push({ boneName: b, color: 0x3b82f6, intensity: 0.7, glowSize: 1.3 });
      }
    }
    for (const dn of intel.compensation.downstream) {
      for (const b of lookupBones(dn.region)) {
        if (seen.has(b)) continue;
        seen.add(b);
        out.push({ boneName: b, color: 0xfb923c, intensity: 0.7, glowSize: 1.3 });
      }
    }
    return out;
  }, [causalChainTissueId, tissueIntelligenceMap]);

  // Tissue-specific highlight set (replaces the legacy "inflammation cloud"). Only emits
  // when in a non-muscle tissue view and at least one clinical input exists. The viewer
  // renders catalogued tissues as procedural geometry and falls back to a labelled generic
  // ring on the first available bone for tissues without a catalogue recipe.
  const tissueIntelligenceHighlights = useMemo(() => {
    if (!tissueViewMode || tissueViewMode === 'muscle') return [] as ReturnType<typeof tissueIntelligenceToOverlayHighlight>[];
    const hasClinicalInput =
      painMarkers.length > 0 ||
      compromisedTissues.length > 0 ||
      scarMarkers.length > 0 ||
      adhesionBands.length > 0 ||
      Object.keys(compensatedOverrides || {}).length > 0;
    if (!hasClinicalInput) return [];
    return Array.from(inflammationIntelligenceMap.values())
      .filter(intel => (intel.severity ?? 0) >= 0.25)
      .map(tissueIntelligenceToOverlayHighlight);
  }, [inflammationIntelligenceMap, tissueViewMode, painMarkers, compromisedTissues, scarMarkers, adhesionBands, compensatedOverrides]);

  const slingOverlayActive = rightPanelTab === 'slings' && slingOverlayVisible && !!slingAnalysis;
  useEffect(() => {
    if (!slingOverlayActive) setExpandedSlingDetailId(null);
  }, [slingOverlayActive]);

  const biomechanicsFaultHighlights = useMemo(() => {
    const FAULT_JOINT_TO_BONE: Record<string, string> = {
      left_hip: 'Hip_L', right_hip: 'Hip_R',
      left_knee: 'Knee_L', right_knee: 'Knee_R',
      left_ankle: 'Ankle_L', right_ankle: 'Ankle_R',
      left_shoulder: 'Shoulder_L', right_shoulder: 'Shoulder_R',
      lumbar_spine: 'RootPart1_M', thoracic_spine: 'Spine1_M',
      cervical_spine: 'Neck_M', pelvis: 'Root_M',
    };
    const bioSrc = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput;
    if (!bioSrc || rightPanelTab !== 'biomechanics') return undefined;
    const highlights: Array<{ boneName: string; color: number; intensity: number; label: string }> = [];
    for (const fault of bioSrc.faults.faults) {
      for (const joint of fault.affectedJoints) {
        const boneName = FAULT_JOINT_TO_BONE[joint];
        if (boneName) {
          highlights.push({
            boneName,
            color: fault.severity === 'severe' ? 0xff3333 : fault.severity === 'moderate' ? 0xff9933 : 0x3399ff,
            intensity: fault.severity === 'severe' ? 0.9 : fault.severity === 'moderate' ? 0.7 : 0.4,
            label: fault.label,
          });
        }
      }
    }
    const deduped = highlights.filter((h, i, arr) =>
      arr.findIndex(x => x.boneName === h.boneName) === i
    );
    return deduped.length > 0 ? deduped : undefined;
  }, [unifiedBiomechanicsOutput, cachedBiomechanicsOutput, rightPanelTab]);

  const hudChainIntegrity = useMemo(() => {
    if (showUnifiedChainPanel && chainIntegrityScores.size > 0) return chainIntegrityScores;
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
  }, [hudMuscleAnalysis, showUnifiedChainPanel, chainIntegrityScores]);

  const predictedPainSpots = useMemo((): PredictedPainSpot[] => {
    const base = computeStage < 4 ? [] : computePredictedPain(effectiveModelConfig);
    if (skeletonMode !== 'movement' || painfulArcFlares.length === 0) return base;
    const now = Date.now();
    const jointToBone: Record<string, string> = {
      leftShoulder: 'mixamorig:LeftShoulder', rightShoulder: 'mixamorig:RightShoulder',
      leftHip: 'mixamorig:LeftUpLeg', rightHip: 'mixamorig:RightUpLeg',
      leftKnee: 'mixamorig:LeftLeg', rightKnee: 'mixamorig:RightLeg',
      leftAnkle: 'mixamorig:LeftFoot', rightAnkle: 'mixamorig:RightFoot',
      leftElbow: 'mixamorig:LeftForeArm', rightElbow: 'mixamorig:RightForeArm',
      lumbar_spine: 'mixamorig:Spine', thoracic_spine: 'mixamorig:Spine1', cervical_spine: 'mixamorig:Neck',
    };
    const flareSpots: PredictedPainSpot[] = painfulArcFlares
      .filter(f => now - f.timestamp < 8000)
      .map(f => ({
        id: `flare-${f.joint}-${f.movement}-${f.timestamp}`,
        boneName: jointToBone[f.joint] || 'mixamorig:Hips',
        label: `${f.joint} ${f.movement} painful arc`,
        confidence: 0.85,
        severity: f.intensity,
        rationale: `Active movement entered painful arc ${f.arcStart}–${f.arcEnd}° at ${Math.round(f.angle)}°`,
        category: 'muscular',
        position: { x: 0, y: 0, z: 0 },
      }));
    return [...base, ...flareSpots];
  }, [effectiveModelConfig, computeStage, skeletonMode, painfulArcFlares]);

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
      severity: pm.severity ?? 5,
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
      severity: pm.severity ?? 5,
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

  const tissueViewOverlay = useMemo(() => {
    if (!tissueViewMode || tissueViewMode === 'muscle') return null;
    if (liteMode && computeStage < 3) return null;
    const modeColor = TISSUE_MODE_COLORS[tissueViewMode];

    type OverlayResult = {
      bones: string[];
      color: number;
      label: string;
      markers?: Array<{ boneName: string; color: number; size: number; label: string }>;
      pathwayLines?: Array<{ boneSequence: string[]; color: number; label: string }>;
      loadIndicators?: Array<{ boneName: string; loadPercent: number; color: number }>;
    };

    const deriveCookStage = (t: TendonEntry): 1 | 2 | 3 | undefined => {
      const regionMuscles = Object.entries(compensatedOverrides).filter(([key]) => {
        const entryRegion = t.region.toLowerCase();
        const keyLower = key.toLowerCase();
        return keyLower.includes(entryRegion) ||
          t.bones.some(b => keyLower.includes(b.replace(/_[LR]$/, '').toLowerCase()));
      });
      const hasPathology = regionMuscles.some(([, v]) => v?.pathology && v.pathology !== 'none');
      const hasHighTension = regionMuscles.some(([, v]) => (v?.tension ?? 50) > 75);
      if (hasPathology) return 3;
      if (hasHighTension) return 2;
      return t.cookStage;
    };

    const buildTendonMarkers = (entries: TendonEntry[]): OverlayResult['markers'] => {
      return entries.flatMap(t => {
        const stageColors: Record<number, number> = { 1: 0x33cc33, 2: 0xffaa33, 3: 0xff3333 };
        const effectiveStage = deriveCookStage(t);
        const color = effectiveStage ? stageColors[effectiveStage] : 0xe6a832;
        return t.bones.map(boneName => ({
          boneName,
          color,
          size: 0.01,
          label: t.label + (effectiveStage ? ` (Stage ${effectiveStage})` : ''),
        }));
      });
    };

    const getClinicallyAffectedNerves = (): Set<string> => {
      const affected = new Set<string>();
      for (const pm of painMarkers) {
        const mechanism = classifyPainMechanism(
          pm.anatomicalLabel || pm.nearestBone,
          pm.description || `Pain at ${pm.anatomicalLabel || pm.nearestBone}`,
          pm.type
        );
        if (mechanism === 'neuropathic') {
          for (const nerve of NERVE_PATHWAY_DATA) {
            const pmBone = pm.nearestBone;
            if (nerve.bones.includes(pmBone) || nerve.pathway.includes(pmBone)) {
              affected.add(nerve.id);
            }
          }
        }
      }
      return affected;
    };

    const buildNervePathways = (entries: NervePathwayEntry[]): OverlayResult['pathwayLines'] => {
      const clinicallyAffected = getClinicallyAffectedNerves();
      return entries.map(n => ({
        boneSequence: n.pathway,
        color: clinicallyAffected.has(n.id) ? 0xff4444 : 0xaacc33,
        label: n.label + (clinicallyAffected.has(n.id) ? ' ⚠ Clinical finding' : ''),
      }));
    };

    const buildNerveEntrapmentMarkers = (entries: NervePathwayEntry[]): OverlayResult['markers'] => {
      const clinicallyAffected = getClinicallyAffectedNerves();
      return entries.flatMap(n => {
        return n.entrapmentSites.map(site => ({
          boneName: site.boneName,
          color: clinicallyAffected.has(n.id) ? 0xff4444 : 0xff6600,
          size: clinicallyAffected.has(n.id) ? 0.014 : 0.01,
          label: `${site.name} (${site.clinicalTest.split(',')[0]})`,
        }));
      });
    };

    const buildJointLoadIndicators = (): OverlayResult['loadIndicators'] => {
      const forces = hudForceAnalysis;
      if (!forces || !forces.joints) return [];
      const jointEntries = selectedTissueEntry
        ? JOINT_SURFACE_DATA.filter(j => j.id === selectedTissueEntry)
        : JOINT_SURFACE_DATA;
      const indicators: OverlayResult['loadIndicators'] = [];
      for (const joint of jointEntries) {
        const matchedForce = forces.joints.find((f: JointSurfaceForce) =>
          joint.bones.includes(f.boneName) || f.label.toLowerCase().includes(joint.region)
        );
        if (matchedForce) {
          const loadPct = Math.min(100, (matchedForce.totalForce / 4.0) * 100);
          indicators.push({
            boneName: joint.bones[0],
            loadPercent: loadPct,
            color: modeColor.hex,
          });
        } else {
          indicators.push({
            boneName: joint.bones[0],
            loadPercent: 25,
            color: modeColor.hex,
          });
        }
      }
      return indicators;
    };

    const buildFasciaChainLines = (entries: FascialLayerEntry[]): OverlayResult['pathwayLines'] => {
      return entries.map(f => {
        const chainScore = hudChainIntegrity.size > 0
          ? Array.from(hudChainIntegrity.entries()).find(([key]) =>
              key.toLowerCase().includes(f.chainName.toLowerCase().split(' ')[0]) ||
              f.chainName.toLowerCase().includes(key.toLowerCase().split(' ')[0])
            )
          : null;
        const hasIssues = chainScore && chainScore[1].score < 80;
        return {
          boneSequence: f.bones,
          color: hasIssues ? (chainScore[1].score < 60 ? 0xff3333 : 0xffaa33) : 0xcc66cc,
          label: f.chainName + (hasIssues ? ` (${chainScore[1].score}% integrity)` : ''),
        };
      });
    };

    const buildFasciaRestrictionMarkers = (entries: FascialLayerEntry[]): OverlayResult['markers'] => {
      if (hudChainIntegrity.size === 0) return [];
      const markers: OverlayResult['markers'] = [];
      for (const f of entries) {
        const chainScore = Array.from(hudChainIntegrity.entries()).find(([key]) =>
          key.toLowerCase().includes(f.chainName.toLowerCase().split(' ')[0]) ||
          f.chainName.toLowerCase().includes(key.toLowerCase().split(' ')[0])
        );
        if (!chainScore || chainScore[1].score >= 80) continue;
        const problematic = chainScore[1].problematicLinks || [];
        for (const bone of f.bones) {
          const isProblematic = problematic.some(pl =>
            pl.toLowerCase().includes(bone.replace(/_[LRM]$/, '').toLowerCase())
          );
          if (isProblematic) {
            markers.push({
              boneName: bone,
              color: chainScore[1].score < 60 ? 0xff3333 : 0xffaa33,
              size: 0.012,
              label: `Restriction: ${f.chainName}`,
            });
          }
        }
        if (markers.length === 0 && chainScore[1].score < 60) {
          const midBone = f.bones[Math.floor(f.bones.length / 2)];
          markers.push({
            boneName: midBone,
            color: 0xff3333,
            size: 0.014,
            label: `Chain dysfunction: ${f.chainName}`,
          });
        }
      }
      return markers;
    };

    const deriveJointDegeneration = (joint: JointSurfaceEntry): { klGrade: 0|1|2|3|4; label: string; color: number } => {
      const forces = hudForceAnalysis;
      if (!forces || !forces.joints) return { klGrade: 0, label: 'Normal', color: 0x33cc33 };
      const matchedForce = forces.joints.find((f: JointSurfaceForce) =>
        joint.bones.includes(f.boneName)
      );
      if (!matchedForce) return { klGrade: 0, label: 'Normal', color: 0x33cc33 };
      const bw = matchedForce.totalForce;
      if (bw > 3.5) return { klGrade: 4, label: 'Severe (KL-4)', color: 0xff0000 };
      if (bw > 2.5) return { klGrade: 3, label: 'Moderate (KL-3)', color: 0xff6633 };
      if (bw > 1.5) return { klGrade: 2, label: 'Mild (KL-2)', color: 0xffaa33 };
      if (bw > 0.8) return { klGrade: 1, label: 'Doubtful (KL-1)', color: 0xcccc33 };
      return { klGrade: 0, label: 'Normal', color: 0x33cc33 };
    };

    const buildJointInstabilityMarkers = (entries: JointSurfaceEntry[]): OverlayResult['markers'] => {
      const forces = hudForceAnalysis;
      if (!forces || !forces.joints) return [];
      return entries.flatMap(joint => {
        const matchedForce = forces.joints.find((f: JointSurfaceForce) =>
          joint.bones.includes(f.boneName)
        );
        const degen = deriveJointDegeneration(joint);
        const markers: Array<{ boneName: string; color: number; size: number; label: string }> = [];
        if (degen.klGrade > 0) {
          markers.push({
            boneName: joint.bones[0],
            color: degen.color,
            size: 0.008 + degen.klGrade * 0.002,
            label: `${joint.label} — ${degen.label}`,
          });
        }
        if (matchedForce && matchedForce.status !== 'low') {
          const severityColors: Record<string, number> = {
            moderate: 0xffaa33,
            high: 0xff6633,
            very_high: 0xff0000,
          };
          markers.push({
            boneName: joint.bones[joint.bones.length > 1 ? 1 : 0],
            color: severityColors[matchedForce.status] || 0xffaa33,
            size: matchedForce.status === 'very_high' ? 0.015 : 0.012,
            label: `${joint.label} — ${matchedForce.status} load`,
          });
        }
        return markers;
      });
    };

    if (selectedTissueEntry) {
      const entries = getTissueEntriesForMode(tissueViewMode);
      const entry = entries.find(e => e.id === selectedTissueEntry);
      if (entry) {
        const result: OverlayResult = { bones: entry.bones, color: modeColor.hex, label: entry.label };
        if (tissueViewMode === 'tendon') {
          result.markers = buildTendonMarkers([entry as TendonEntry]);
        } else if (tissueViewMode === 'nerve') {
          result.pathwayLines = buildNervePathways([entry as NervePathwayEntry]);
          result.markers = buildNerveEntrapmentMarkers([entry as NervePathwayEntry]);
        } else if (tissueViewMode === 'joint') {
          result.loadIndicators = buildJointLoadIndicators();
          result.markers = buildJointInstabilityMarkers([entry as JointSurfaceEntry]);
        } else if (tissueViewMode === 'fascia') {
          result.pathwayLines = buildFasciaChainLines([entry as FascialLayerEntry]);
          result.markers = buildFasciaRestrictionMarkers([entry as FascialLayerEntry]);
        }
        return result;
      }
    }

    const relevantCompromised = mergedCompromisedTissues.filter(ct => ct.tissue_type === tissueViewMode);
    const compromisedIds = new Set(relevantCompromised.map(ct => ct.tissue_id));
    const hasCompromised = relevantCompromised.length > 0;

    const allEntries = getTissueEntriesForMode(tissueViewMode);
    const compromisedEntries = hasCompromised ? allEntries.filter(e => compromisedIds.has(e.id)) : [];
    const nonCompromisedEntries = hasCompromised ? allEntries.filter(e => !compromisedIds.has(e.id)) : [];

    const allBones = getAllHighlightBonesForMode(tissueViewMode);
    const dimmedColor = 0x555566;
    const resultColor = hasCompromised ? dimmedColor : modeColor.hex;
    const result: OverlayResult = { bones: allBones, color: resultColor, label: modeColor.label };

    if (tissueViewMode === 'tendon') {
      if (hasCompromised) {
        const dimmedMarkers = buildTendonMarkers(nonCompromisedEntries as TendonEntry[]).map(m => ({
          ...m, color: dimmedColor, size: 0.006, label: m.label + ' (unaffected)',
        }));
        const brightMarkers = buildTendonMarkers(compromisedEntries as TendonEntry[]);
        result.markers = [...dimmedMarkers, ...brightMarkers];
      } else {
        result.markers = buildTendonMarkers(TENDON_DATA);
      }
    } else if (tissueViewMode === 'nerve') {
      if (hasCompromised) {
        const dimmedPaths = buildNervePathways(nonCompromisedEntries as NervePathwayEntry[]).map(p => ({
          ...p, color: dimmedColor, label: p.label + ' (unaffected)',
        }));
        const brightPaths = buildNervePathways(compromisedEntries as NervePathwayEntry[]).map(p => {
          const entry = compromisedEntries.find(e => p.label.startsWith(e.label));
          const ct = entry ? relevantCompromised.find(c => c.tissue_id === entry.id) : null;
          const sColor = ct ? (ct.severity >= 0.7 ? 0xff2222 : ct.severity >= 0.4 ? 0xff8800 : 0xffcc00) : p.color;
          return { ...p, color: sColor };
        });
        result.pathwayLines = [...dimmedPaths, ...brightPaths];
        const dimmedEntrap = buildNerveEntrapmentMarkers(nonCompromisedEntries as NervePathwayEntry[]).map(m => ({
          ...m, color: dimmedColor, size: 0.006,
        }));
        const brightEntrap = buildNerveEntrapmentMarkers(compromisedEntries as NervePathwayEntry[]);
        result.markers = [...dimmedEntrap, ...brightEntrap];
      } else {
        result.pathwayLines = buildNervePathways(NERVE_PATHWAY_DATA);
        result.markers = buildNerveEntrapmentMarkers(NERVE_PATHWAY_DATA);
      }
    } else if (tissueViewMode === 'joint') {
      result.loadIndicators = buildJointLoadIndicators();
      if (hasCompromised) {
        const dimmedJoints = buildJointInstabilityMarkers(nonCompromisedEntries as JointSurfaceEntry[]).map(m => ({
          ...m, color: dimmedColor, size: 0.006,
        }));
        const brightJoints = buildJointInstabilityMarkers(compromisedEntries as JointSurfaceEntry[]);
        result.markers = [...dimmedJoints, ...brightJoints];
      } else {
        result.markers = buildJointInstabilityMarkers(JOINT_SURFACE_DATA);
      }
    } else if (tissueViewMode === 'fascia') {
      if (hasCompromised) {
        const dimmedChains = buildFasciaChainLines(nonCompromisedEntries as FascialLayerEntry[]).map(p => ({
          ...p, color: dimmedColor, label: p.label + ' (unaffected)',
        }));
        const brightChains = buildFasciaChainLines(compromisedEntries as FascialLayerEntry[]).map(p => {
          const entry = compromisedEntries.find(e => p.label.startsWith(e.label));
          const ct = entry ? relevantCompromised.find(c => c.tissue_id === entry.id) : null;
          const sColor = ct ? (ct.severity >= 0.7 ? 0xff2222 : ct.severity >= 0.4 ? 0xff8800 : 0xffcc00) : p.color;
          return { ...p, color: sColor };
        });
        result.pathwayLines = [...dimmedChains, ...brightChains];
        const dimmedRestrict = buildFasciaRestrictionMarkers(nonCompromisedEntries as FascialLayerEntry[]).map(m => ({
          ...m, color: dimmedColor, size: 0.006,
        }));
        const brightRestrict = buildFasciaRestrictionMarkers(compromisedEntries as FascialLayerEntry[]);
        result.markers = [...dimmedRestrict, ...brightRestrict];
      } else {
        result.pathwayLines = buildFasciaChainLines(FASCIAL_LAYER_DATA);
        result.markers = buildFasciaRestrictionMarkers(FASCIAL_LAYER_DATA);
      }
    }

    if (hasCompromised) {
      const compromisedMarkers: Array<{ boneName: string; color: number; size: number; label: string }> = [];
      for (const ct of relevantCompromised) {
        const matched = allEntries.find(e => e.id === ct.tissue_id);
        if (matched && matched.bones.length > 0) {
          const severityHex = ct.severity >= 0.7 ? 0xff2222 : ct.severity >= 0.4 ? 0xff8800 : 0xffcc00;
          compromisedMarkers.push({
            boneName: matched.bones[0],
            color: severityHex,
            size: 0.012 + ct.severity * 0.008,
            label: `⚠ ${matched.label} — compromised (${Math.round(ct.severity * 100)}%)`,
          });
        }
      }
      if (compromisedMarkers.length > 0) {
        result.markers = [...(result.markers || []), ...compromisedMarkers];
      }
    }

    return result;
  }, [tissueViewMode, selectedTissueEntry, hudForceAnalysis, compensatedOverrides, painMarkers, hudChainIntegrity, mergedCompromisedTissues, liteMode, computeStage]);

  const clinicallyAffectedNerves = useMemo(() => {
    const affected = new Set<string>();
    for (const pm of painMarkers) {
      const mechanism = classifyPainMechanism(
        pm.anatomicalLabel || pm.nearestBone,
        pm.description || `Pain at ${pm.anatomicalLabel || pm.nearestBone}`,
        pm.type
      );
      if (mechanism === 'neuropathic') {
        for (const nerve of NERVE_PATHWAY_DATA) {
          const pmBone = pm.nearestBone;
          if (nerve.bones.includes(pmBone) || nerve.pathway.includes(pmBone)) {
            affected.add(nerve.id);
          }
        }
      }
    }
    return affected;
  }, [painMarkers]);

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
    if (!showUnifiedChainPanel || painMarkers.length === 0) return [];
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
  }, [showUnifiedChainPanel, painMarkers]);

  const chainRecommendations = useMemo(() => {
    if (!showUnifiedChainPanel) return [];
    return getChainRecommendations(chainEffects);
  }, [showUnifiedChainPanel, chainEffects]);

  const painTensionContributors = useMemo(() => {
    if (!showUnifiedChainPanel || painMarkers.length === 0) return [];
    return rankPainTensionContributors(
      painMarkers.map(pm => ({ id: pm.id, nearestBone: pm.nearestBone, anatomicalLabel: pm.anatomicalLabel })),
      baseMuscleTensions.tensions,
      chainEffects
    );
  }, [showUnifiedChainPanel, painMarkers, baseMuscleTensions.tensions, chainEffects]);

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

  const hasManualTensions = Object.keys(manualChainTensions).length > 0;
  const fascialChainVizProp = useMemo(() => {
    if (!showUnifiedChainPanel) return undefined;
    if (!tensionTabActive && !hasManualTensions) return undefined;
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
  }, [showUnifiedChainPanel, tensionTabActive, hasManualTensions, baseMuscleTensions.tensions, activeChainIds, painAffectedChainIds, painDriverChainIds, showPropagation, propagationDeltas]);

  const chainMuscleHighlights = useMemo<{ groups: string[]; colors: Record<string, string> }>(() => {
    if (!fascialChainVizProp) return { groups: [], colors: {} };
    const orderedChainIds: string[] = [];
    const chainSeen = new Set<string>();
    for (const id of [...activeChainIds, ...painAffectedChainIds, ...painDriverChainIds]) {
      if (chainSeen.has(id)) continue;
      chainSeen.add(id);
      orderedChainIds.push(id);
    }
    if (orderedChainIds.length === 0) return { groups: [], colors: {} };
    const groups: string[] = [];
    const colors: Record<string, string> = {};
    const seen = new Set<string>();
    for (const chainId of orderedChainIds) {
      const chain = MYOFASCIAL_CHAINS.find(c => c.id === chainId);
      if (!chain) continue;
      for (const link of chain.links) {
        if (seen.has(link.muscleId)) continue;
        seen.add(link.muscleId);
        groups.push(link.muscleId);
        colors[link.muscleId] = chain.color;
      }
    }
    return { groups, colors };
  }, [fascialChainVizProp, activeChainIds, painAffectedChainIds, painDriverChainIds]);

  const slingMuscleHighlights = useMemo<{ groups: string[]; colors: Record<string, string> }>(() => {
    if (!slingOverlayActive || !slingAnalysis) return { groups: [], colors: {} };
    const orderedSlingIds: string[] = [];
    if (selectedSlingId) {
      orderedSlingIds.push(selectedSlingId);
    }
    if (orderedSlingIds.length === 0) return { groups: [], colors: {} };
    const groups: string[] = [];
    const colors: Record<string, string> = {};
    const seen = new Set<string>();
    for (const slingId of orderedSlingIds) {
      const slingDef = FUNCTIONAL_SLINGS.find(s => s.id === slingId);
      if (!slingDef) continue;
      const slingMeta = slingAnalysis.slings.find(s => s.slingId === slingId);
      const color = slingMeta?.color ?? '#a855f7';
      for (const [a, b] of slingDef.pairs) {
        for (const muscleId of [a, b]) {
          if (seen.has(muscleId)) continue;
          seen.add(muscleId);
          groups.push(muscleId);
          colors[muscleId] = color;
        }
      }
    }
    return { groups, colors };
  }, [slingOverlayActive, slingAnalysis, selectedSlingId]);

  const mergedHighlightMuscleGroups = useMemo<string[] | undefined>(() => {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const g of biomechanicalMuscleHighlights) {
      if (!seen.has(g)) { seen.add(g); merged.push(g); }
    }
    for (const g of chainMuscleHighlights.groups) {
      if (!seen.has(g)) { seen.add(g); merged.push(g); }
    }
    for (const g of slingMuscleHighlights.groups) {
      if (!seen.has(g)) { seen.add(g); merged.push(g); }
    }
    return merged.length > 0 ? merged : undefined;
  }, [biomechanicalMuscleHighlights, chainMuscleHighlights, slingMuscleHighlights]);

  const mergedMuscleHighlightColors = useMemo<Record<string, string> | undefined>(() => {
    const merged: Record<string, string> = { ...slingMuscleHighlights.colors, ...chainMuscleHighlights.colors, ...muscleHighlightColors };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [slingMuscleHighlights, chainMuscleHighlights, muscleHighlightColors]);

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
      erector_spinae_lumbar: ['RootPart1_M'], erector_spinae_thoracic: ['Spine1Part2_M'],
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

  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe') => severity === 'severe' ? 'text-red-400' : severity === 'moderate' ? 'text-orange-400' : 'text-yellow-400';

  // Plan factors / modifiers / constraints — lifted to component scope so the
  // OrchestratePlanProvider's clinicalContext can be assembled at the top
  // level (the inline-rendered Master Plan card needs the same context the
  // right-side My Plan tab uses, but the card is mounted unconditionally so
  // the derivation must live outside the per-tab render branch).
  const planFactors = useMemo(
    () => autoPopulateFromPipeline(extractionResult ?? null, structuredReasoningData ?? null, DEFAULT_PATIENT_FACTORS),
    [extractionResult, structuredReasoningData],
  );
  const planMods = useMemo(() => computePatientModifiers(planFactors, null), [planFactors]);
  const planConstraints = useMemo<string[]>(() => {
    const out: string[] = [];
    const er = extractionResult as unknown as Record<string, unknown> | undefined;
    const collectStrings = (v: unknown) => {
      if (!v) return;
      if (Array.isArray(v)) {
        v.forEach(item => {
          if (typeof item === 'string' && item.trim()) out.push(item.trim());
          else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            const label = obj.label ?? obj.name ?? obj.description ?? obj.flag;
            if (typeof label === 'string' && label.trim()) out.push(label.trim());
          }
        });
      } else if (typeof v === 'string' && v.trim()) {
        out.push(v.trim());
      }
    };
    if (er) {
      collectStrings(er.redFlags);
      collectStrings(er.yellowFlags);
      collectStrings(er.precautions);
      collectStrings(er.contraindications);
      collectStrings(er.comorbidities);
      collectStrings(er.currentMedications);
      collectStrings(er.relevantHistory);
    }
    return out;
  }, [extractionResult]);
  const orchestrateClinicalContext = useMemo(() => {
    const archetypePhase = recoverySimArchetype?.id || (recoverySimArchetype?.stages?.[0]?.id ?? undefined);
    return {
      topHypothesis:
        structuredReasoningData?.hypotheses?.[0]?.condition
        || extractionResult?.mainComplaint
        || mechanismAnalysisResult?.overallMechanismSummary?.split(/[.,;]/)[0]?.trim()
        || undefined,
      irritability: extractionResult?.irritability || undefined,
      stage: extractionResult?.duration || undefined,
      recoveryPhase: archetypePhase || extractionResult?.duration || undefined,
      primaryRegion:
        (mechanismAnalysisResult?.topContributors?.[0] as { region?: string } | undefined)?.region
        || painMarkers[0]?.anatomicalLabel
        || painMarkers[0]?.nearestBone
        || undefined,
      patientFactors: {
        age: planFactors.age ?? undefined,
        healingMultiplier: planMods.healingRateMultiplier,
        painSensitivityMultiplier: planMods.painSensitivityMultiplier,
        tissueQualityMultiplier: planMods.tissueQualityMultiplier,
        phaseTimingMultiplier: planMods.phaseTimingMultiplier,
        recurrenceRiskMultiplier: planMods.recurrenceRiskMultiplier,
        romCeilingAdjustment: planMods.romCeilingAdjustment,
        archetypeId: recoverySimArchetype?.id,
        archetypeName: recoverySimArchetype?.name,
      },
      constraints: planConstraints.length > 0 ? planConstraints.slice(0, 12) : undefined,
    };
  }, [structuredReasoningData, extractionResult, mechanismAnalysisResult, recoverySimArchetype, painMarkers, planFactors, planMods, planConstraints]);

  // ===== Treatment Rationale clinical-context bundle (Task #274) =====
  // Extends the orchestrate context with rich clinical signals (pain
  // markers, sling drivers, fascial chain tensions, kinetic-chain
  // integrity, compromised tissues, scars/adhesions, force hotspots,
  // postural deviations, natural progression) so the rationale endpoint
  // can tie each treatment back to the actual clinical picture.
  const rationaleClinicalContext = useMemo<RationaleClinicalContextInput>(() => {
    // Pain markers — count, structures, mechanisms, severity summary.
    const painStructures = Array.from(new Set(
      painMarkers
        .map(m => m.anatomicalLabel || m.nearestBone || '')
        .filter(s => s && s.length > 0)
    )).slice(0, 12);
    const painMechanisms = Array.from(new Set(
      painMarkers
        .map(m => (m as { mechanism?: string }).mechanism)
        .filter((s): s is string => !!s && s.length > 0)
    )).slice(0, 6);
    const severities = painMarkers
      .map(m => (m as { severity?: number; intensity?: number }).severity ?? (m as { intensity?: number }).intensity)
      .filter((n): n is number => typeof n === 'number');
    const severitySummary = severities.length > 0
      ? `${severities.length} marker${severities.length === 1 ? '' : 's'}, peak ${Math.max(...severities)}/10, avg ${Math.round((severities.reduce((a, b) => a + b, 0) / severities.length) * 10) / 10}/10`
      : undefined;

    // Sling drivers — pull from slingAnalysisRef (latest computed result).
    const sa = slingAnalysisRef.current;
    const slingDrivers: RationaleClinicalContextInput['slingDrivers'] = [];
    if (sa) {
      const dom = sa.dominantDysfunction
        ? sa.slings.find(s => s.slingId === sa.dominantDysfunction)
        : null;
      if (dom) {
        slingDrivers.push({
          sling: dom.label,
          role: 'dominant-dysfunction',
          drivingFinding: dom.narrative?.slice(0, 180) || dom.weakLinks?.[0]?.muscle || dom.commonDysfunctions?.[0],
        });
      }
      if (sa.secondaryIssue) {
        const sec = sa.slings.find(s => s.slingId === sa.secondaryIssue!.slingId);
        slingDrivers.push({
          sling: sec?.label || sa.secondaryIssue.slingId,
          role: 'secondary',
          drivingFinding: sa.secondaryIssue.summary?.slice(0, 180),
        });
      }
    }

    // Fascial chain tensions — driving + active chain ids → labels.
    let fascialTensions: RationaleClinicalContextInput['fascialTensions'] | undefined;
    if (fascialChainVizProp) {
      const chainLabel = (id: string) => MYOFASCIAL_CHAINS.find(c => c.id === id)?.name || id;
      const driving = (fascialChainVizProp.painHighlightChains || []).map(chainLabel).slice(0, 6);
      const active = (fascialChainVizProp.activeChains || []).map(chainLabel).slice(0, 6);
      const propagationCount = fascialChainVizProp.propagationDeltas
        ? Object.keys(fascialChainVizProp.propagationDeltas as Record<string, unknown>).length
        : undefined;
      fascialTensions = { drivingChains: driving, activeChains: active, propagationCount };
    }

    // Kinetic-chain integrity — surface only chains with score < 80.
    const chainIntegrity: RationaleClinicalContextInput['chainIntegrity'] = [];
    hudChainIntegrity.forEach((entry, chainId) => {
      if (entry.score < 80) {
        chainIntegrity.push({
          chain: chainId.replace(/_/g, ' '),
          score: entry.score,
          issues: (entry.issues || []).slice(0, 4),
        });
      }
    });
    const chainIntegrityTrim = chainIntegrity
      .sort((a, b) => a.score - b.score)
      .slice(0, 6);

    // Compromised tissues — name, status, region.
    const compromisedTissuesSummary = compromisedTissues.slice(0, 12).map(t => {
      const rawStatus = (t as { status?: string }).status;
      const rawSeverity = (t as { severity?: unknown }).severity;
      let statusStr: string | undefined;
      if (typeof rawStatus === "string" && rawStatus.trim().length > 0) {
        statusStr = rawStatus.trim();
      } else if (typeof rawSeverity === "string" && rawSeverity.trim().length > 0) {
        statusStr = rawSeverity.trim();
      } else if (typeof rawSeverity === "number" && Number.isFinite(rawSeverity)) {
        const n = rawSeverity;
        if (n >= 0 && n <= 1) {
          const pct = Math.round(n * 100);
          const band = n >= 0.66 ? "high" : n >= 0.33 ? "moderate" : "low";
          statusStr = `${band} (${pct}%)`;
        } else if (n >= 0 && n <= 100) {
          const pct = Math.round(n);
          const band = pct >= 66 ? "high" : pct >= 33 ? "moderate" : "low";
          statusStr = `${band} (${pct}%)`;
        } else {
          statusStr = String(Math.round(n));
        }
      }
      if (statusStr && statusStr.length > 60) statusStr = statusStr.slice(0, 60);
      return {
        name: (t as { name?: string; tissue?: string }).name || (t as { tissue?: string }).tissue || 'tissue',
        status: statusStr,
        region: (t as { region?: string; location?: string }).region || (t as { location?: string }).location,
      };
    });

    // Scar / adhesion load.
    let scarLoad: RationaleClinicalContextInput['scarLoad'] | undefined;
    if (scarMarkers.length > 0 || adhesionBands.length > 0) {
      const regions = Array.from(new Set([
        ...scarMarkers.map(s => (s as { region?: string; nearestBone?: string }).region || (s as { nearestBone?: string }).nearestBone || ''),
        ...adhesionBands.map(a => (a as { region?: string }).region || ''),
      ].filter(s => s && s.length > 0))).slice(0, 6);
      scarLoad = {
        scarCount: scarMarkers.length,
        adhesionCount: adhesionBands.length,
        regions,
      };
    }

    // Force hotspots — top joints by peak force / asymmetry from hudForceAnalysis.
    let forceHotspots: RationaleClinicalContextInput['forceHotspots'] | undefined;
    const fa = hudForceAnalysis as unknown as {
      joints?: Array<{ jointName?: string; jointId?: string; peakForceN?: number; forceN?: number; asymmetryIndex?: number; asymmetry?: number }>;
    } | undefined;
    if (fa?.joints && fa.joints.length > 0) {
      const sorted = [...fa.joints]
        .map(j => ({
          joint: j.jointName || j.jointId || 'joint',
          peakForceN: j.peakForceN ?? j.forceN,
          asymmetryIndex: j.asymmetryIndex ?? j.asymmetry,
        }))
        .filter(j => (typeof j.peakForceN === 'number' && j.peakForceN > 0) || (typeof j.asymmetryIndex === 'number' && j.asymmetryIndex > 0.1))
        .sort((a, b) => (b.peakForceN || 0) - (a.peakForceN || 0))
        .slice(0, 5);
      if (sorted.length > 0) forceHotspots = sorted;
    }

    // Postural deviations summary.
    let posturalDeviations: RationaleClinicalContextInput['posturalDeviations'] | undefined;
    if (posturalMetrics) {
      const pm = posturalMetrics as unknown as {
        summary?: string;
        overallScore?: number;
        score?: number;
        deviations?: Array<{ name?: string; severity?: string }>;
      };
      const summaryBits: string[] = [];
      if (pm.summary) summaryBits.push(pm.summary);
      if (pm.deviations?.length) {
        summaryBits.push(pm.deviations.slice(0, 4).map(d => `${d.name}${d.severity ? ` (${d.severity})` : ''}`).join(', '));
      }
      const score = pm.overallScore ?? pm.score;
      const severity = typeof score === 'number'
        ? (score < 50 ? 'severe' : score < 75 ? 'moderate' : 'mild')
        : undefined;
      if (summaryBits.length > 0 || severity) {
        posturalDeviations = {
          summary: summaryBits.join(' · ').slice(0, 280) || undefined,
          severity,
        };
      }
    }

    // Natural progression risks.
    let naturalProgression: RationaleClinicalContextInput['naturalProgression'] | undefined;
    if (naturalTimeline?.result) {
      const nt = naturalTimeline.result;
      naturalProgression = {
        window: nt.overall_window_weeks
          ? `${Math.round(nt.overall_window_weeks.best)}–${Math.round(nt.overall_window_weeks.worst)} wk (expected ${Math.round(nt.overall_window_weeks.expected)})`
          : undefined,
        chronicityRiskPercent: nt.chronicity_risk_percent,
        recurrenceRiskPercent: nt.recurrence_risk_percent,
      };
    }

    // Tendon inflammation — pull from compromised tissues whose name mentions tendon/bursa/fasciitis.
    const tendonInflammation = compromisedTissues
      .filter(t => /tendon|bursa|fasciitis|tendinosis|tendinopathy/i.test((t as { name?: string }).name || ''))
      .map(t => (t as { name?: string }).name)
      .filter((n): n is string => !!n)
      .slice(0, 6);

    // Thoracic stiffness — derive from chain integrity entries that mention thoracic.
    const thoracicEntry = chainIntegrityTrim.find(c => /thoracic|trunk/i.test(c.chain));
    const thoracicStiffness = thoracicEntry
      ? `${thoracicEntry.chain} integrity ${Math.round(thoracicEntry.score)}/100${thoracicEntry.issues?.length ? ` — ${thoracicEntry.issues.slice(0, 2).join(', ')}` : ''}`
      : undefined;

    return {
      ...orchestrateClinicalContext,
      painMarkers: painMarkers.length > 0 ? {
        count: painMarkers.length,
        structures: painStructures,
        mechanisms: painMechanisms.length > 0 ? painMechanisms : undefined,
        severitySummary,
      } : undefined,
      slingDrivers: slingDrivers.length > 0 ? slingDrivers : undefined,
      fascialTensions,
      chainIntegrity: chainIntegrityTrim.length > 0 ? chainIntegrityTrim : undefined,
      compromisedTissues: compromisedTissuesSummary.length > 0 ? compromisedTissuesSummary : undefined,
      scarLoad,
      forceHotspots,
      posturalDeviations,
      thoracicStiffness,
      tendonInflammation: tendonInflammation.length > 0 ? tendonInflammation : undefined,
      naturalProgression,
    };
  }, [
    orchestrateClinicalContext,
    painMarkers,
    fascialChainVizProp,
    hudChainIntegrity,
    compromisedTissues,
    scarMarkers,
    adhesionBands,
    hudForceAnalysis,
    posturalMetrics,
    naturalTimeline?.result,
  ]);

  return (
    <Suspense fallback={<LazyPanelFallback />}>
    <PlanCartProvider>
    <PlanCartHydrationBridge
      onItemsChange={handlePlanCartItemsChange}
      registerReplaceAll={handlePlanCartRegisterReplaceAll}
    />
    <OrchestratePlanProvider
      clinicalContext={orchestrateClinicalContext}
      autoOrganizeNonce={orchestrateAutoNonce}
      onAutoTriggerConsumed={() => {
        setOrchestrateAutoNonce(null);
        // The build cascade's auto-trigger has been consumed — return the
        // state machine to 'idle' so the Build-full-plan button re-enables.
        setAutoBuildState(prev => (prev === 'organizing' ? 'idle' : prev));
        setAutoBuildFailures(new Set());
      }}
    >
    <TreatmentRationaleProvider clinicalContext={rationaleClinicalContext}>
    <div className="h-[calc(100vh-4rem)] w-full bg-gray-900 flex flex-col overflow-hidden">
    <div className="flex-1 relative overflow-hidden min-h-0">
      {!modelReady && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="flex flex-col items-center gap-6 max-w-md w-full px-8">
            {modelLoadError ? (
              <>
                <div className="w-20 h-20 rounded-full border-4 border-red-500/50 flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Model Load Failed</h2>
                  <p className="text-sm text-slate-400 mb-4">{modelLoadError}</p>
                </div>
                <Button
                  variant="outline"
                  className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => {
                    setModelLoadError(null);
                    setModelLoadProgress(0);
                    setModelReady(false);
                    window.location.reload();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Stethoscope className="h-8 w-8 text-emerald-400" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">PhysioGPT</h2>
                  <p className="text-sm text-slate-400 mb-6">
                    {modelLoadProgress > 0
                      ? 'Loading anatomical model...'
                      : 'Initializing clinical workspace...'}
                  </p>
                </div>
                <div className="w-full">
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(modelLoadProgress, 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {modelLoadProgress < 10 ? 'Preparing 3D engine...' :
                       modelLoadProgress < 50 ? 'Downloading skeleton model...' :
                       modelLoadProgress < 90 ? 'Processing anatomical structures...' :
                       'Finalizing...'}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">{modelLoadProgress}%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-4 text-center">
                  138MB high-fidelity model with 94 bones and 25+ muscle groups
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {/* Full-Page Skeleton Viewer */}
      <div className="h-full w-full relative flex">
            {liteMode && computationsReady && (
              <div className="absolute top-2 right-2 z-30 bg-amber-900/80 backdrop-blur-sm text-amber-200 text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Lite Mode
              </div>
            )}
            {cameraMode && (
              <div className="w-[40%] h-full flex-shrink-0 relative border-r border-gray-700">
                <Suspense fallback={<LazyPanelFallback />}>
                <FocusedCameraCapture
                  onPoseUpdate={handleCameraPoseUpdate}
                  onPartialPoseUpdate={handlePartialPoseUpdate}
                  onPosturalMetrics={handlePosturalMetricsUpdate}
                  isActive={cameraMode}
                  onFocusedAnalysisComplete={handleFocusedAnalysisComplete}
                  onRegionChange={(region) => setFocusedRegion(region)}
                  className="h-full border-0 rounded-none"
                />
                </Suspense>
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
                  <div className="absolute bottom-12 left-2 right-2 z-20 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-sm rounded-md px-2.5 py-1.5 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        poseTrackingQuality.overall >= 0.7 ? 'bg-green-400 animate-pulse' :
                        poseTrackingQuality.overall >= 0.4 ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400 animate-pulse'
                      }`} />
                      <span className="text-[10px] text-gray-300 font-medium">
                        {poseTrackingQuality.overall >= 0.7 ? 'Tracked' :
                         poseTrackingQuality.overall >= 0.4 ? 'Partial' : 'Estimated'}
                      </span>
                      <span className="text-[10px] text-gray-500">{Math.round(poseTrackingQuality.overall * 100)}%</span>
                      {poseTrackingQuality.estimatedJoints.length > 0 && (
                        <span className="text-[9px] text-yellow-400/80 ml-1">
                          Est: {poseTrackingQuality.estimatedJoints.map(j => j.replace('left', 'L ').replace('right', 'R ')).join(', ')}
                        </span>
                      )}
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
            {(() => { const __viewer = (
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
              highlightBoneNames={chainHighlightBones || muscleOverrideHighlights.length > 0 || influenceHighlights.length > 0 || visualizationBoneHighlights.length > 0 || mechanismHighlightBones.length > 0 || causalChainHighlights.length > 0 ? [
                ...(chainHighlightBones || []),
                ...muscleOverrideHighlights,
                ...influenceHighlights,
                ...visualizationBoneHighlights,
                ...(mechanismHighlightBones as Array<{ boneName: string; color: number; intensity: number; glowSize?: number }>),
                ...causalChainHighlights,
              ] : undefined}
              tissueIntelligenceHighlights={tissueIntelligenceHighlights.length > 0 ? tissueIntelligenceHighlights : undefined}
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
              skeletonMode={skeletonMode}
              activeCapacities={viewerActiveCapacities}
              onActiveMovementAttempt={handleActiveMovementAttempt}
              onPainfulArcFlare={handlePainfulArcFlare}
              enableZoomTool={zoomToolMode}
              onLandmarkSelect={handleLandmarkSelect}
              forceOverlay={(() => {
                if (showMechanicsAnalyser && !mechanicsOverlay.jointReactionArrows) return null;
                const activeForceData = hudForceAnalysis ?? (forceMode && forceAnalysis ? forceAnalysis : null);
                if (forceMode && activeForceData) {
                  const base = activeForceData.joints.filter(j => enabledForceJoints.has(j.id));
                  if (showInjuryMechanism && mechanismBoneIds.length > 0) {
                    const boneSet = new Set(mechanismBoneIds);
                    const mechanismJoints = activeForceData.joints.filter(j => boneSet.has(j.boneName) && !enabledForceJoints.has(j.id));
                    return [...base, ...mechanismJoints];
                  }
                  return base;
                }
                if (showInjuryMechanism && mechanismBoneIds.length > 0 && hudForceAnalysis) {
                  const boneSet = new Set(mechanismBoneIds);
                  return hudForceAnalysis.joints.filter((j: { boneName: string }) => boneSet.has(j.boneName));
                }
                if (showMechanicsAnalyser && mechanicsOverlay.jointReactionArrows && hudForceAnalysis) {
                  return hudForceAnalysis.joints;
                }
                return null;
              })()}
              bodyWeightKg={bodyWeightKg}
              selectedForceJoint={selectedForceJoint}
              onForceJointSelect={(joint) => setSelectedForceJoint(prev => prev === joint ? null : joint)}
              muscleStates={muscleMode && muscleAnalysis ? muscleAnalysis.groupStates : undefined}
              enableMuscleInteraction={muscleMode}
              onMuscleGroupClick={(groupId, screenX, screenY) => {
                setClickedMusclePopup(prev => prev?.groupId === groupId ? null : { groupId, screenX, screenY });
              }}
              highlightMuscleGroups={mergedHighlightMuscleGroups}
              muscleHighlightColors={mergedMuscleHighlightColors}
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
              dermatomeHighlightBones={dermatomeHighlightBones}
              nerveRootLabels={nerveRootLabels}
              referralZoneBones={referralZoneBones}
              tissueViewOverlay={tissueViewOverlay}
              biomechanicsFaultHighlights={biomechanicsFaultHighlights}
              onModelLoadProgress={handleModelLoadProgress}
              onModelReady={handleModelReady}
              onModelLoadError={handleModelLoadError}
              slingPathwayVisualization={rightPanelTab === 'slings' && slingOverlayVisible && slingAnalysis ? {
                enabled: true,
                activeSlingId: selectedSlingId,
                slings: slingAnalysis.slings.map(s => ({
                  id: s.slingId,
                  label: s.label,
                  color: s.color,
                  bonePathway: getSlingBonePathway(s.slingId),
                  status: s.status,
                  activationScore: s.activationScore,
                  forceTransferQuality: s.forceTransferQuality,
                  weakLinkBoneIndices: s.weakLinks.flatMap(wl => wl.boneSegmentIndices),
                  overloadedBoneIndices: s.overloadedBoneIndices,
                  compensatingBoneIndices: s.compensatingBoneIndices,
                  narrative: s.narrative,
                  downstreamRiskArea: s.downstreamRiskArea,
                  weakLinks: s.weakLinks.map(wl => ({ muscle: wl.muscle, activationPct: wl.activationPct, reason: wl.reason, impactOnSling: wl.impactOnSling })),
                  compensations: s.compensations.map(c => ({ compensatingSlingLabel: c.compensatingSlingLabel, mechanism: c.mechanism, severity: c.severity, clinical: c.clinical })),
                  treatmentTargets: s.treatmentTargets.map(t => ({ muscle: t.muscle, intervention: t.intervention, priority: t.priority, rationale: t.rationale })),
                  muscleScores: s.muscleScores.map(ms => ({ muscle: ms.muscle, activation: ms.activation, found: ms.found })),
                  forceReroutes: s.forceReroutes.map(fr => ({ fromMuscle: fr.fromMuscle, toMuscle: fr.toMuscle, reroutePct: fr.reroutePct })),
                })),
                crossSlingCompensations: slingAnalysis.crossSlingCompensations.map(c => ({
                  compensatingSling: c.compensatingSling,
                  compensatingSlingLabel: c.compensatingSlingLabel,
                  compensatedSling: c.compensatedSling,
                  compensatedSlingLabel: c.compensatedSlingLabel,
                  severity: c.severity,
                  additionalLoadPct: c.additionalLoadPct,
                  mechanism: c.mechanism,
                })),
              } : null}
              onSlingLabelClick={(slingId: string) => {
                setExpandedSlingDetailId(prevId => prevId === slingId ? null : slingId);
                setSelectedSlingId(slingId as SlingId);
              }}
              onTissueBoneClick={tissueViewMode && tissueViewMode !== 'muscle' ? (boneName: string) => {
                const matches = getAllEntriesForBone(tissueViewMode, boneName);
                if (matches.length === 0) return;
                if (matches.length === 1) {
                  setSelectedTissueEntry(matches[0].id === selectedTissueEntry ? null : matches[0].id);
                  setTissueDisambiguationEntries([]);
                } else {
                  setTissueDisambiguationEntries(matches.map(m => ({ id: m.id, label: m.label })));
                }
              } : undefined}
              enableSkeletonClick={!!scarPlacementMode || adhesionPlacementStep !== 'idle' || (!!tissueViewMode && tissueViewMode !== 'muscle')}
              goalStateOverlay={goalOverlayData}
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
            ); if (showRecoverySim && recoverySimSlot) return createPortal(__viewer, recoverySimSlot); if (showMechanicsAnalyser && mechanicsAnalyserSlot) return createPortal(__viewer, mechanicsAnalyserSlot); if (skeletonMode === 'movement') return (
              <div className="relative w-full h-full ring-2 ring-emerald-500/70 ring-inset rounded-md" data-testid="movement-mode-frame">
                {__viewer}
                <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold shadow-lg" data-testid="movement-mode-pill">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Active Movement Mode
                  {generatingActiveCapacity && <span className="text-emerald-100 font-normal">· generating capacities…</span>}
                </div>
              </div>
            ); return __viewer; })()}

            {expandedSlingDetailId && slingAnalysis && (() => {
              const slingData = slingAnalysis.slings.find(s => s.slingId === expandedSlingDetailId);
              if (!slingData) return null;
              const ftqColor = slingData.forceTransferQuality === 'good' ? 'text-emerald-400' : slingData.forceTransferQuality === 'reduced' ? 'text-amber-400' : 'text-red-400';
              const statusColor = slingData.status === 'underperforming' ? 'border-red-500' : slingData.status === 'overloaded' ? 'border-amber-500' : slingData.status === 'compensating' ? 'border-yellow-500' : 'border-slate-600';
              const scoreColor = slingData.activationScore >= 70 ? 'text-emerald-400' : slingData.activationScore >= 45 ? 'text-amber-400' : 'text-red-400';
              return (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div
                    className="pointer-events-auto bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl max-w-md w-full max-h-[80%] overflow-y-auto border-2 border-l-4"
                    style={{ borderColor: slingData.color }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 bg-slate-900/98 backdrop-blur z-10 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slingData.color }} />
                        <h3 className="text-white font-bold text-base">{slingData.label}</h3>
                      </div>
                      <button
                        onClick={() => setExpandedSlingDetailId(null)}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className={`text-xl font-bold ${scoreColor}`}>{Math.round(slingData.activationScore)}%</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Activation</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className={`text-sm font-semibold capitalize ${statusColor.replace('border-', 'text-')}`}>{slingData.status}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Status</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className={`text-sm font-semibold capitalize ${ftqColor}`}>{slingData.forceTransferQuality}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Transfer</div>
                        </div>
                      </div>

                      <div className="bg-slate-800/60 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-300 mb-1.5">Clinical Narrative</div>
                        <p className="text-xs text-gray-400 leading-relaxed">{slingData.narrative}</p>
                      </div>

                      {slingData.downstreamRiskArea && (
                        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-red-400 mb-1">Downstream Risk Area</div>
                          <p className="text-xs text-red-300/80">{slingData.downstreamRiskArea}</p>
                        </div>
                      )}

                      {slingData.weakLinks.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-2">Weak Links ({slingData.weakLinks.length})</div>
                          <div className="space-y-2">
                            {slingData.weakLinks.map((wl, i) => (
                              <div key={i} className="bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-red-300 capitalize">{wl.muscle.replace(/_/g, ' ')}</span>
                                  <span className="text-xs text-red-400 font-mono">{wl.activationPct}%</span>
                                </div>
                                <p className="text-[10px] text-gray-400">{wl.reason}</p>
                                <p className="text-[10px] text-red-400/70 mt-1">{wl.impactOnSling}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {slingData.compensations.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-2">Compensation Patterns</div>
                          <div className="space-y-2">
                            {slingData.compensations.map((comp, i) => (
                              <div key={i} className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-amber-300">{comp.compensatingSlingLabel}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${comp.severity === 'severe' ? 'bg-red-900/50 text-red-300' : comp.severity === 'moderate' ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-700 text-gray-300'}`}>{comp.severity}</span>
                                </div>
                                <p className="text-[10px] text-gray-400">{comp.mechanism}</p>
                                <p className="text-[10px] text-amber-400/70 mt-1">{comp.clinical}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {slingData.treatmentTargets.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-2">Treatment Targets</div>
                          <div className="space-y-1.5">
                            {[...slingData.treatmentTargets].sort((a, b) => a.priority - b.priority).map((t, i) => (
                              <div key={i} className="bg-slate-800 rounded-lg p-2.5 flex items-start gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${t.intervention === 'strengthen' ? 'bg-emerald-900/50 text-emerald-300' : t.intervention === 'release' ? 'bg-blue-900/50 text-blue-300' : t.intervention === 'activate' ? 'bg-purple-900/50 text-purple-300' : 'bg-slate-700 text-gray-300'}`}>{t.intervention}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-200 capitalize">{t.muscle.replace(/_/g, ' ')}</div>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{t.rationale}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 -z-10 pointer-events-auto" onClick={() => setExpandedSlingDetailId(null)} />
                </div>
              );
            })()}

            <MovementPlayer
              animationState={animationState}
              onAnimationStateChange={setAnimationState}
              onConstraintsChange={setAnimationConstraints}
              onCompensationChange={handleCompensationChange}
              modelConfig={finalModelConfig as any}
              muscleRestrictionEffects={muscleRestrictionEffects}
              diagnosisMovements={provocationMovements}
              diagnosisCondition={provocationHypothesis?.condition || null}
              diagnosisLoading={provocationLoading}
              diagnosisError={provocationError ? (provocationError as Error).message : null}
              onRegenerateDiagnosisMovements={provocationQueryEnabled ? handleRegenerateProvocations : undefined}
            />

            {/* Clinical Presets Panel */}
            {showClinicalPresets && (
              <div className="absolute top-2 left-2 w-60 bg-white/95 backdrop-blur rounded-lg shadow-lg max-h-[calc(100%-16px)] overflow-y-auto z-10">
                <div className="sticky top-0 bg-white/95 backdrop-blur rounded-t-lg px-3 py-2 border-b border-gray-200 flex items-center justify-between z-10">
                  <span className="text-xs font-bold text-gray-800">Clinical Presets</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setModelConfig({ ...DEFAULT_MODEL_CONFIG });
                        toast({ title: "Reset", description: "Skeleton returned to neutral" });
                      }}
                      className="text-[9px] text-blue-500 hover:text-blue-700 px-1"
                    >
                      Reset
                    </button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowClinicalPresets(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="px-2 py-1">
                  {getClinicalPresetCategories().map(category => (
                    <div key={category.id} className="mb-2">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 py-1">{category.label}</div>
                      <div className="space-y-0.5">
                        {category.presets.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => applyClinicalPreset(preset)}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-50 transition-colors group"
                            title={preset.description}
                          >
                            <div className="text-[11px] font-medium text-gray-700 group-hover:text-emerald-700">{preset.name}</div>
                            <div className="text-[9px] text-gray-400 group-hover:text-emerald-500 leading-tight line-clamp-2">{preset.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              const POSTURE_TO_MUSCLES: Record<string, string[]> = {
                'pelvis.tilt': ['core', 'glute_l', 'glute_r', 'quad_l', 'quad_r', 'spine'],
                'pelvis.obliquity': ['core', 'glute_l', 'glute_r'],
                'pelvis.rotation': ['core', 'spine'],
                'spine.lumbarLordosis': ['spine', 'core'],
                'spine.thoracicKyphosis': ['spine', 'chest'],
                'spine.scoliosis': ['spine', 'core'],
                'spine.flexion': ['spine', 'core'],
                'spine.lateralFlexion': ['spine', 'core'],
                'spine.lumbarRotation': ['spine'],
                'spine.lumbarScoliosis': ['spine', 'core'],
                'spine.thoracicRotation': ['spine'],
                'spine.thoracicScoliosis': ['spine'],
                'spine.cervicalLordosis': ['neck'],
                'spine.cervicalScoliosis': ['neck'],
                'neck.flexion': ['neck'],
                'neck.extension': ['neck'],
                'neck.rotation': ['neck'],
                'neck.lateralFlexion': ['neck'],
                'neck.forwardHead': ['neck'],
                'leftHip.flexion': ['glute_l', 'quad_l'],
                'leftHip.extension': ['glute_l', 'quad_l'],
                'leftHip.abduction': ['glute_l', 'quad_l'],
                'leftHip.adduction': ['quad_l'],
                'rightHip.flexion': ['glute_r', 'quad_r'],
                'rightHip.extension': ['glute_r', 'quad_r'],
                'rightHip.abduction': ['glute_r', 'quad_r'],
                'rightHip.adduction': ['quad_r'],
                'leftKnee.flexion': ['quad_l', 'calf_l'],
                'rightKnee.flexion': ['quad_r', 'calf_r'],
                'leftAnkle.dorsiflexion': ['calf_l', 'shin_l'],
                'rightAnkle.dorsiflexion': ['calf_r', 'shin_r'],
                'leftShoulder.flexion': ['deltoid_l', 'scapula_l'],
                'leftShoulder.abduction': ['deltoid_l', 'scapula_l'],
                'rightShoulder.flexion': ['deltoid_r', 'scapula_r'],
                'rightShoulder.abduction': ['deltoid_r', 'scapula_r'],
              };
              const S = ({ label, configPath, min, max, step = 1 }: { label: string; configPath: string; min: number; max: number; step?: number }) => {
                const [group, prop] = configPath.split('.');
                const val = (modelConfig as any)[group]?.[prop] ?? 0;
                const relatedMuscles = POSTURE_TO_MUSCLES[configPath] || [];
                const affectedManualMuscles = relatedMuscles.filter(m => manualChainTensions[m] !== undefined);
                const hasManualTensionOverride = affectedManualMuscles.length > 0;
                let estDeg = 0;
                if (hasManualTensionOverride) {
                  const totalDelta = affectedManualMuscles.reduce((sum, m) => {
                    const manual = manualChainTensions[m];
                    const computed = baseMuscleTensions.computedTensions[m] ?? 50;
                    return sum + (manual - computed);
                  }, 0);
                  const range = max - min;
                  estDeg = Math.round((totalDelta / 50) * (range * 0.3));
                }
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] w-[90px] flex-shrink-0 truncate ${hasManualTensionOverride ? 'text-amber-600 font-medium' : 'text-gray-500'}`} title={hasManualTensionOverride ? `${label} — tension override active on ${affectedManualMuscles.join(', ')}` : label}>
                      {hasManualTensionOverride && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-0.5 align-middle" />}
                      {label}
                    </span>
                    <Slider min={min} max={max} step={step} value={[val]}
                      onValueChange={([v]) => updateModelConfig(configPath, v)} className="flex-1" />
                    <span className="text-[10px] text-gray-400 w-6 text-right">{val}</span>
                    {hasManualTensionOverride && Math.abs(estDeg) > 0 && (
                      <span className={`text-[7px] font-bold w-8 text-right ${estDeg > 0 ? 'text-red-500' : 'text-blue-500'}`} title={`Estimated posture equivalent from tension override`}>
                        {estDeg > 0 ? '+' : ''}{estDeg}°
                      </span>
                    )}
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
                {Object.keys(manualChainTensions).length > 0 && (
                  <div className="mx-2 mt-1 px-2 py-1.5 rounded bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[9px] font-medium text-amber-700">Manual tension overrides active</span>
                    </div>
                    <span className="text-[8px] text-amber-600 mt-0.5 block">Slider values show baseline posture model. Amber-highlighted sliders have related tension overrides in the Chains panel.</span>
                  </div>
                )}
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

            {manualTherapyAnnotations && manualTherapyAnnotations.length > 0 && (
              <div className="absolute bottom-2 left-2 z-20 w-[240px] max-h-[280px] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-rose-500/40 rounded-xl shadow-2xl scrollbar-thin">
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-3 py-2 border-b border-white/10 flex items-center gap-2 rounded-t-xl z-10">
                  <Hand className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-[10px] font-bold text-white">Manual Therapy Targets</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 ml-auto">{manualTherapyAnnotations.length}</span>
                </div>
                <div className="px-2.5 py-2 space-y-1.5">
                  {manualTherapyAnnotations.map((target, i) => {
                    const goalColors: Record<string, { bg: string; text: string; border: string }> = {
                      release: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
                      mobilize: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
                      activate: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
                      stabilize: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
                      decompress: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
                    };
                    const style = goalColors[target.goalType] || goalColors.mobilize;
                    return (
                      <div key={i} className={`rounded-lg border ${style.border} ${style.bg} px-2.5 py-1.5`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-semibold text-white">{target.tissueName.replace(/_/g, ' ')}</span>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border} font-medium uppercase tracking-wider`}>
                            {target.goalType}
                          </span>
                        </div>
                        <div className={`text-[8px] ${style.text} leading-relaxed`}>{target.goalText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

            {showUnifiedChainPanel && (
              <UnifiedChainPanel
                chainIntegrityScores={chainIntegrityScores}
                wholeBodyScore={wholeBodyScore}
                chainEffects={chainEffects}
                propagationDeltas={propagationDeltas}
                painMarkers={painMarkers}
                correlationResult={correlationResult}
                manualChainTensions={manualChainTensions}
                setManualChainTensions={setManualChainTensions}
                baseMuscleTensions={baseMuscleTensions}
                chainRecommendations={chainRecommendations}
                selectedChainNode={selectedChainNode}
                setSelectedChainNode={setSelectedChainNode}
                selectedNodeDetails={selectedNodeDetails}
                activeChainIds={activeChainIds}
                setActiveChainIds={setActiveChainIds}
                painAffectedChainIds={painAffectedChainIds}
                showPropagation={showPropagation}
                setShowPropagation={setShowPropagation}
                onClose={() => { setShowUnifiedChainPanel(false); setSelectedChainNode(null); setTensionTabActive(false); }}
                onTensionTabActive={(active) => { setTensionTabActive(active); if (active) setShowPropagation(() => true); }}
                painTensionContributors={painTensionContributors}
                selectedChainId={selectedChainId}
                setSelectedChainId={setSelectedChainId}
                clinicalConsequences={clinicalConsequences}
              />
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
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] text-gray-400 uppercase">{tc.label}</span>
                            {m.painMechanism && (
                              <span className={`text-[8px] px-1 rounded ${m.painMechanism === 'neuropathic' ? 'bg-blue-900/40 text-blue-300' : m.painMechanism === 'myofascial' ? 'bg-orange-900/40 text-orange-300' : m.painMechanism === 'central_sensitization' ? 'bg-pink-900/40 text-pink-300' : 'bg-red-900/40 text-red-300'}`}>
                                {m.painMechanism === 'central_sensitization' ? 'central' : m.painMechanism}
                              </span>
                            )}
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
                          className="text-blue-400/70 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Pain intelligence"
                          onClick={(e) => { e.stopPropagation(); setClinicalBubbleMarker(m); setShowPainIntelligence(true); }}
                        >
                          <Brain className="h-3 w-3" />
                        </button>
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
              <Suspense fallback={<LazyPanelFallback />}>
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
                    painMechanism: classifyPainMechanism(label, undefined, 'point'),
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
              </Suspense>
            )}

            {showPainIntelligence && clinicalBubbleMarker && (
              <div className="absolute top-2 right-2 z-50 animate-in slide-in-from-right-2 duration-200">
                <PainIntelligencePanel
                  marker={clinicalBubbleMarker}
                  onClose={() => { setShowPainIntelligence(false); setDermatomeHighlightBones([]); setNerveRootLabels([]); setReferralZoneBones([]); }}
                  onHighlightBones={setDermatomeHighlightBones}
                  onClearHighlights={() => { setDermatomeHighlightBones([]); setNerveRootLabels([]); setReferralZoneBones([]); }}
                  onNerveRootLabels={setNerveRootLabels}
                  onReferralZoneBones={setReferralZoneBones}
                />
              </div>
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
                className={`h-7 text-xs shadow-sm ${showUnifiedChainPanel ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const newMode = !showUnifiedChainPanel;
                  setShowUnifiedChainPanel(newMode);
                  if (newMode) {
                    toast({ title: "Chains & Tension", description: "Explore kinetic chains, myofascial tension, and treatment recommendations in one panel." });
                  }
                }}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                {showUnifiedChainPanel ? 'Chains On' : 'Chains & Tension'}
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
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${tissueViewMode ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  if (tissueViewMode) {
                    setTissueViewMode(null);
                    setSelectedTissueEntry(null);
                    tissueViewManualRef.current = false;
                  } else {
                    setTissueViewMode('muscle');
                    tissueViewManualRef.current = true;
                  }
                }}
              >
                <Microscope className="h-3 w-3 mr-1" />
                Tissue
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showRiskDashboard ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => setShowRiskDashboard(!showRiskDashboard)}
              >
                <Shield className="h-3 w-3 mr-1" />
                Risk
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showInjuryMechanism ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => setShowInjuryMechanism(!showInjuryMechanism)}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Mechanism
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showSimTimeline ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  if (showSimTimeline) {
                    setTimelinePlaybackState(null);
                    setConditionPhases(null);
                  }
                  setShowSimTimeline(!showSimTimeline);
                }}
              >
                <Clock className="h-3 w-3 mr-1" />
                Timeline
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showRecoverySim ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const next = !showRecoverySim;
                  setShowRecoverySim(next);
                  if (next && showMechanicsAnalyser) setShowMechanicsAnalyser(false);
                  if (next && skeletonMode === 'movement') setSkeletonMode('posture');
                }}
              >
                <Activity className="h-3 w-3 mr-1" />
                Recovery Sim
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showMechanicsAnalyser ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  const next = !showMechanicsAnalyser;
                  setShowMechanicsAnalyser(next);
                  if (next && showRecoverySim) setShowRecoverySim(false);
                  if (next && skeletonMode === 'movement') setSkeletonMode('posture');
                }}
                data-testid="toggle-mechanics-analyser"
              >
                <span className="font-serif italic mr-1 text-[12px] leading-none">Σ</span>
                Mechanics Analyser
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${skeletonMode === 'movement' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  setSkeletonMode(prev => {
                    const next = prev === 'movement' ? 'posture' : 'movement';
                    // entering Movement Mode closes the
                    // sibling viewer panels (Recovery Sim + Mechanics
                    // Analyser) so the static-posture clinical pipeline
                    // and movement gating cannot run side-by-side.
                    if (next === 'movement') {
                      if (showRecoverySim) setShowRecoverySim(false);
                      if (showMechanicsAnalyser) setShowMechanicsAnalyser(false);
                    }
                    return next;
                  });
                }}
                data-testid="toggle-skeleton-mode"
                title={skeletonMode === 'movement' ? 'Switch back to Posture Mode' : 'Switch to Active Movement Mode'}
              >
                <Activity className="h-3 w-3 mr-1" />
                {skeletonMode === 'movement' ? 'Movement Mode' : 'Posture Mode'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${clinicalReasoningOpen && reasoningActiveTab === 'evidence' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => {
                  if (clinicalReasoningOpen && reasoningActiveTab === 'evidence') {
                    setClinicalReasoningOpen(false);
                  } else {
                    setClinicalReasoningOpen(true);
                    setReasoningRequestedTab('evidence');
                  }
                }}
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Evidence
                {evidenceLoading && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse inline-block" />}
                {!evidenceLoading && evidenceEngineResult && (() => {
                  const totalCount = (evidenceEngineResult.pubmedPapers?.length || 0) + (evidenceEngineResult.options?.length || 0);
                  return totalCount > 0 ? (
                    <span className="ml-1 text-[7px] px-1 py-0.5 rounded-full bg-amber-500/30 text-amber-200 min-w-[14px] text-center inline-block">{totalCount}</span>
                  ) : (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-300 inline-block" />
                  );
                })()}
              </Button>
              <div className="w-px h-5 bg-gray-600/50 mx-0.5" />
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${showClinicalPresets ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 hover:text-white border border-gray-600/50'}`}
                onClick={() => setShowClinicalPresets(!showClinicalPresets)}
              >
                <Layers className="h-3 w-3 mr-1" />
                Presets
              </Button>
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
                  setMuscleOverrides({});
                  setClinicalHighlights([]);
                  setScarMarkers([]);
                  setAdhesionBands([]);

                  setClinicalReasoningData(null);
                  setClinicalReasoningProcessing(false);
                  setClinicalReasoningPaused(false);
                  setStructuredReasoningData(null);
                  setStructuredReasoningLoading(false);
                  setTreatmentDecisionData(null);
                  setTreatmentDecisionLoading(false);
                  setTreatmentPlanData(null);
                  setTreatmentPlanLoading(false);
                  setEvidenceEngineResult(null);
                  setEvidenceLoading(false);
                  setExtractionResult(null);
                  setExtractionResultsOpen(false);
                  setClinicalBubbleResults({});

                  setPreviousBiomechanicsOutput(null);
                  setCachedBiomechanicsOutput(null);
                  setPosturalMetrics(null);
                  setFocusedCameraResult(null);
                  setUnifiedBiomechanicsMovementTask(undefined);
                  setUnifiedBiomechanicsProgress(0.5);
                  setUnifiedBiomechanicsFaultOverrides([]);

                  setCustomExerciseResult(null);
                  setCustomManualTherapyResult(null);
                  setWhatIfScenarios([]);
                  setWhatIfComparisonBScenarios([]);
                  setShowInjuryMechanism(false);
                  setShowSimTimeline(false);
                  setMechanismActiveTab('mechanism');
                  setMechanismBoneIds([]);

                  setCorrelationMode(false);
                  setExpandedCorrelation(null);
                  setCorrelationTab('overview');
                  setSelectedSlingId(null);
                  setSlingOverlayVisible(true);

                  setShowPainIntelligence(false);
                  setDermatomeHighlightBones([]);
                  setNerveRootLabels([]);
                  setReferralZoneBones([]);
                  setTissueViewMode(null);
                  setSelectedTissueEntry(null);
                  setTissueDisambiguationEntries([]);

                  setConnectionHighlights([]);
                  setTestChainActive(null);
                  setShowRiskDashboard(false);
                  setShowShoulderAssessment(false);

                  setRomMeasurements([]);
                  setRomValues({});
                  setSelectedRomJoint(null);

                  setSubjectiveHistoryInput('');

                  setForceAiSuggestions(null);
                  setForceAiLoading(false);
                  setActiveBiomechanicalLink(null);
                  setBiomechanicalMuscleHighlights([]);
                  setMuscleHighlightColors({});
                  setVisualizationBoneHighlights([]);
                  setActiveVisualizationId(null);

                  setSelectedRegion(null);
                  setZoomToRegion(null);
                  setSelectedChainId(null);
                  setManualChainTensions({});
                  setSelectedChainNode(null);

                  setAnimationState({ isPlaying: false, currentMovement: null, progress: 0, speed: 1 });
                  setAnimationConstraints([]);

                  setPainMarkerMode(false);
                  setForceMode(false);
                  setMuscleMode(false);
                  setRomMode(false);
                  setPoseMode(false);
                  setZoomToolMode(false);
                  setScarPlacementMode(null);
                  setAdhesionPlacementStep('idle');
                  setPendingAdhesionStart(null);

                  clinicalTextAppliedRef.current = null;
                  // Voice Activity dock: session reset clears the
                  // entry log, hides the dock, and bumps the session
                  // key so the dock fully remounts and forgets any
                  // collapse/unread state from the previous session.
                  setVoiceActivityEntries([]);
                  setVoiceDockVisible(false);
                  setVoiceDockSessionKey(k => k + 1);
                  pendingVoiceTriggerRef.current = null;
                  lastReasoningTriggerRef.current = '';
                  slingAnalysisRef.current = null;
                  setSlingActivationOverrides({});
                  compensationDataRef.current = { result: null, movementName: null, restrictions: {} };
                  subjectiveHistoryRef.current = '';
                  if (clinicalReasoningTimerRef.current) {
                    clearTimeout(clinicalReasoningTimerRef.current);
                    clinicalReasoningTimerRef.current = null;
                  }
                  if (autoEvidenceTimerRef.current) {
                    clearTimeout(autoEvidenceTimerRef.current);
                    autoEvidenceTimerRef.current = null;
                  }
                  if (evidenceAbortRef.current) {
                    evidenceAbortRef.current.abort();
                    evidenceAbortRef.current = null;
                  }

                  toast({ title: "Skeleton Reset", description: "All joints, markers, analysis results, and clinical findings cleared." });
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

            {tissueViewMode && (
              <div className="absolute top-2 right-2 z-30 w-[280px] animate-in slide-in-from-right-2 duration-200">
                <div className="bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 max-h-[calc(100vh-2rem)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 sticky top-0 z-10 bg-black/85 -mx-3 px-3 -mt-2.5 pt-2.5 pb-1">
                    <div className="flex items-center gap-2">
                      <Microscope className="h-3.5 w-3.5 text-teal-400" />
                      <span className="text-xs font-semibold text-gray-200">Tissue View</span>
                    </div>
                    <button
                      onClick={() => { setTissueViewMode(null); setSelectedTissueEntry(null); tissueViewManualRef.current = false; }}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <TissueViewSelector
                    activeMode={tissueViewMode}
                    onModeChange={(mode) => { setTissueViewMode(mode); if (mode) tissueViewManualRef.current = true; }}
                    compromisedTissues={hubCompromisedTissues}
                    slingTissueRisks={slingTissueRisks}
                    selectedEntryId={selectedTissueEntry}
                    onEntrySelect={(id) => { setSelectedTissueEntry(id); setTissueDisambiguationEntries([]); }}
                    chainIntegrityScores={hudChainIntegrity}
                    jointForceData={hudForceAnalysis?.joints?.map((f: JointSurfaceForce) => ({
                      boneName: f.boneName,
                      totalForce: f.totalForce,
                      status: f.status,
                      label: f.label,
                    }))}
                    musclePathologyData={compensatedOverrides}
                    clinicallyAffectedNerves={clinicallyAffectedNerves}
                    tissueIntelligenceMap={inflammationIntelligenceMap}
                    onSelectCausalChain={handleTissueCausalChainSelect}
                  />
                  {tissueDisambiguationEntries.length > 1 && (
                    <div className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground px-1">Select structure:</div>
                      {tissueDisambiguationEntries.map(e => (
                        <button
                          key={e.id}
                          className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/70 transition-colors"
                          onClick={() => {
                            setSelectedTissueEntry(e.id);
                            setTissueDisambiguationEntries([]);
                          }}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showRiskDashboard && (
              <div className="absolute top-2 right-2 z-30 w-[280px] max-h-[calc(100%-50px)] overflow-y-auto animate-in slide-in-from-right-2 duration-200">
                <div className="bg-black/85 backdrop-blur rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold text-gray-200">Risk & Prognosis</span>
                    </div>
                    <button
                      onClick={() => setShowRiskDashboard(false)}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <RiskPrognosisDashboard
                    forceAnalysis={hudForceAnalysis}
                    compensatedOverrides={effectiveOverrides}
                    pathologyCompensation={pathologyCompensation}
                    chainIntegrityScores={hudChainIntegrity}
                    painMarkers={painMarkers}
                    modelConfig={finalModelConfig}
                    bodyWeightKg={bodyWeightKg}
                    muscleAnalysis={hudMuscleAnalysis?.allMuscles}
                    correlationResult={correlationResult}
                  />
                </div>
              </div>
            )}

            {showInjuryMechanism && (
              <div className="absolute top-2 right-2 z-30 w-[280px] max-h-[calc(100%-50px)] overflow-y-auto animate-in slide-in-from-right-2 duration-200">
                <div className="bg-black/85 backdrop-blur rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-gray-200">Injury Mechanism</span>
                    </div>
                    <button
                      onClick={() => setShowInjuryMechanism(false)}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1 mb-2">
                    <button
                      onClick={() => { setMechanismActiveTab('mechanism'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors ${mechanismActiveTab === 'mechanism' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      Mechanism
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('treatment'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'treatment' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <Stethoscope className="h-3 w-3" />
                      Treatment
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('whatif'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'whatif' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <FlaskConical className="h-3 w-3" />
                      What-If
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('exercise'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'exercise' ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <Dumbbell className="h-3 w-3" />
                      Exercise
                    </button>
                    <button
                      onClick={() => setMechanismActiveTab('manualRx')}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'manualRx' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <Hand className="h-3 w-3" />
                      Manual Rx
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('electroRx'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'electroRx' ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <Zap className="h-3 w-3" />
                      Electrophysical Agents
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('adjunctRx'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'adjunctRx' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <Leaf className="h-3 w-3" />
                      Adjunct Rx
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('lifestyleRx'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'lifestyleRx' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                      data-testid="tab-lifestyle-rx"
                    >
                      <Activity className="h-3 w-3" />
                      Lifestyle
                    </button>
                    <button
                      onClick={() => { setMechanismActiveTab('patientEd'); setManualTherapyAnnotations(null); }}
                      className={`flex-1 text-[10px] py-1 rounded transition-colors flex items-center justify-center gap-1 ${mechanismActiveTab === 'patientEd' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'}`}
                    >
                      <GraduationCap className="h-3 w-3" />
                      Patient Ed
                    </button>
                    <MyPlanTabButton
                      active={mechanismActiveTab === 'myPlan'}
                      onClick={() => { setMechanismActiveTab('myPlan'); setManualTherapyAnnotations(null); }}
                    />
                  </div>
                  {mechanismActiveTab === 'mechanism' && (
                    <InjuryMechanismPanel
                      forceAnalysis={hudForceAnalysis}
                      compensatedOverrides={compensatedOverrides}
                      pathologyCompensation={pathologyCompensation}
                      correlationResult={correlationResult}
                      bodyWeightKg={bodyWeightKg}
                      onHighlightBones={setMechanismBoneIds}
                    />
                  )}
                  {mechanismActiveTab === 'treatment' && (
                    <Suspense fallback={<LazyPanelFallback />}>
                    <MechanismTreatmentTab
                      analysis={mechanismAnalysisResult}
                      onNavigateToDecisionTab={() => {
                        setRightPanelTab('treatment');
                        setReasoningRequestedTab('decision');
                      }}
                    />
                    </Suspense>
                  )}
                  {mechanismActiveTab === 'whatif' && (
                    <Suspense fallback={<LazyPanelFallback />}>
                    <WhatIfSimulationPanel
                      comparison={whatIfSimulatedConfig}
                      activeScenarios={whatIfScenarios}
                      onAddScenario={handleAddWhatIfScenario}
                      onRemoveScenario={handleRemoveWhatIfScenario}
                      onClearAll={handleClearWhatIfScenarios}
                      onApplyToSkeleton={handleApplyWhatIfToSkeleton}
                      treatmentDecisionData={treatmentDecisionData ? {
                        primary: treatmentDecisionData.primary.map(i => ({
                          id: i.id, name: i.name, category: i.category,
                          tier: i.tier, targetRegions: i.targetRegions,
                          dosage: i.dosage, evidenceGrade: i.evidenceGrade, score: i.score,
                        })),
                        adjunct: treatmentDecisionData.adjunct.map(i => ({
                          id: i.id, name: i.name, category: i.category,
                          tier: i.tier, targetRegions: i.targetRegions,
                          dosage: i.dosage, evidenceGrade: i.evidenceGrade, score: i.score,
                        })),
                      } : null}
                      comparisonB={whatIfComparisonB}
                      onSetComparisonB={(scenarios) => setWhatIfComparisonBScenarios(scenarios)}
                      painMarkers={painMarkers.map(pm => ({
                        id: pm.id,
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                      }))}
                    />
                    </Suspense>
                  )}
                  {mechanismActiveTab === 'exercise' && (
                    <ExerciseEngineTab
                      mechanismAnalysis={mechanismAnalysisResult}
                      slingAnalysis={slingAnalysis}
                      painMarkers={painMarkers.map(pm => ({
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        type: pm.type,
                      }))}
                      slingDrivenRecommendations={slingDrivenRecommendations}
                      onCustomExerciseResult={setCustomExerciseResult}
                      goalProfile={activeGoalProfile}
                      clinicalState={exerciseMtClinicalState}
                      goalGap={activeGoalGap}
                      sessionPrescription={sessionPrescriptionCtx}
                      sessionPrescriptionNum={sessionPrescriptionNum}
                      pendingGenerate={pendingExerciseGenerate}
                      onGenerateStarted={handleExerciseGenerateStarted}
                      onGenerateComplete={handleExerciseGenerateComplete}
                      conditionName={extractionResult?.mainComplaint ?? undefined}
                      loadingPatientFactors={(() => {
                        // Derive a richer loadingPatientFactors object from
                        // the clinical extraction by keyword-scanning the
                        // free-text history fields. Lets the engine personalise
                        // for medications, comorbidities, hormonal status,
                        // prior injury and training history without forcing
                        // the clinician to re-enter data.
                        const er = extractionResult;
                        if (!er) return undefined;
                        const corpus = [er.priorTreatment ?? '', ...(er.relevantHistory ?? [])].join(' \n ').toLowerCase();
                        const has = (re: RegExp) => re.test(corpus);
                        const sexRaw = (er.patientSex ?? '').toLowerCase();
                        const sex: 'male' | 'female' | 'other' | undefined =
                          sexRaw.startsWith('m') ? 'male' :
                          sexRaw.startsWith('f') ? 'female' :
                          sexRaw ? 'other' : undefined;
                        const phaseFromDuration: 'reactive' | 'disrepair' | 'remodelling' | 'return_to_sport' | undefined =
                          er.duration === 'acute' ? 'reactive' :
                          er.duration === 'subacute' ? 'disrepair' :
                          er.duration === 'chronic' ? 'remodelling' :
                          er.duration === 'recurrent' ? 'remodelling' : undefined;
                        return {
                          age: er.patientAge ? Number(er.patientAge) : undefined,
                          irritability: (er.irritability as 'low' | 'moderate' | 'high' | undefined) ?? undefined,
                          recoveryPhase: phaseFromDuration,
                          history: {
                            medicationFlags: {
                              statins: has(/\bstatin|atorvastatin|simvastatin|rosuvastatin|pravastatin/),
                              fluoroquinolones: has(/\bfluoroquinolone|ciprofloxacin|levofloxacin|moxifloxacin|ofloxacin/),
                              corticosteroids: has(/\bcorticosteroid|prednisolone|prednisone|dexamethasone|methylprednisolone|cortisone|hydrocortisone/),
                              aromataseInhibitors: has(/\baromatase inhibitor|anastrozole|letrozole|exemestane/),
                            },
                            metabolicConditions: {
                              diabetes: has(/\bdiabetes|t1dm|t2dm|hba1c|insulin\b/),
                              thyroid: has(/\bhypothyroid|hyperthyroid|thyroid\b/),
                              hypercholesterolaemia: has(/\bcholesterol|hypercholesterol|hyperlipid|dyslipid/),
                              obesity: has(/\bobese|obesity|bmi\s*[34][0-9]/),
                            },
                            hormonalStatus: sex ? {
                              sex,
                              menopauseStatus: has(/\bpostmenopaus|post-menopaus/) ? 'postmenopausal' :
                                               has(/\bperimenopaus|peri-menopaus/) ? 'perimenopausal' :
                                               has(/\bpremenopaus|pre-menopaus/) ? 'premenopausal' :
                                               (sex === 'female' && er.patientAge && er.patientAge >= 50) ? 'postmenopausal' :
                                               (sex === 'female' && er.patientAge && er.patientAge < 45) ? 'premenopausal' : undefined,
                              onHrt: has(/\bhrt\b|hormone replacement|oestrogen|estrogen replac/),
                            } : undefined,
                            priorInjurySameSite: has(/\bprior\b|previous|recurr|reinjur|history of/),
                            trainingHistory: {
                              deconditioned: has(/\bdecondition|sedentary|inactive|bed rest/),
                              recentLoadSpikePct: has(/\bspike|sudden increase|ramped up|load spike/) ? 30 : undefined,
                            },
                          },
                        };
                      })()}
                    />
                  )}
                  {mechanismActiveTab === 'manualRx' && (
                    <ManualTherapyEngineTab
                      mechanismAnalysis={mechanismAnalysisResult}
                      slingAnalysis={slingAnalysis}
                      painMarkers={painMarkers.map(pm => ({
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        type: pm.type,
                      }))}
                      slingDrivenRecommendations={slingDrivenRecommendations}
                      scarMarkers={scarMarkers}
                      adhesionBands={adhesionBands}
                      musclePathologies={Object.entries(compensatedOverrides)
                        .filter(([, ov]) => ov?.pathology && ov.pathology !== 'none')
                        .map(([muscleId, ov]) => ({
                          muscleId,
                          label: muscleId.replace(/_/g, ' '),
                          pathology: ov!.pathology as string,
                          severity: ov!.tensionOffset > 20 ? 'severe' : ov!.tensionOffset > 10 ? 'moderate' : 'mild',
                        }))}
                      onHighlightMuscles={setBiomechanicalMuscleHighlights}
                      onSetMuscleHighlightColors={setMuscleHighlightColors}
                      onSetManualTherapyAnnotations={setManualTherapyAnnotations}
                      onCustomManualTherapyResult={setCustomManualTherapyResult}
                      goalProfile={activeGoalProfile}
                      clinicalState={exerciseMtClinicalState}
                      goalGap={activeGoalGap}
                      sessionPrescription={sessionPrescriptionCtx}
                      sessionPrescriptionNum={sessionPrescriptionNum}
                      pendingGenerate={pendingMTGenerate}
                      onGenerateStarted={handleMTGenerateStarted}
                      onGenerateComplete={handleMTGenerateComplete}
                    />
                  )}
                  {mechanismActiveTab === 'electroRx' && (
                    <ElectrophysicalEngineTab
                      mechanismAnalysis={mechanismAnalysisResult}
                      slingAnalysis={slingAnalysis}
                      painMarkers={painMarkers.map(pm => ({
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        type: pm.type,
                      }))}
                      slingDrivenRecommendations={slingDrivenRecommendations}
                      onPlanChange={setElectroPlan}
                      initialCondition={electroPrefill?.condition}
                      initialStage={electroPrefill?.stage}
                      autoGenerateNonce={electroPrefill?.nonce}
                      autoGenerate={!!electroPrefill}
                      onAutoGenerateConsumed={() => setElectroPrefill(null)}
                      patientId={selectedConversationId ?? null}
                    />
                  )}
                  {mechanismActiveTab === 'adjunctRx' && (
                    <AdjunctTherapiesEngineTab
                      mechanismAnalysis={mechanismAnalysisResult}
                      painMarkers={painMarkers.map(pm => ({
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        type: pm.type,
                      }))}
                      diagnosis={extractionResult?.mainComplaint || undefined}
                      recoveryPhase={extractionResult?.duration || undefined}
                      irritability={extractionResult?.irritability || undefined}
                    />
                  )}
                  {mechanismActiveTab === 'lifestyleRx' && (
                    <Suspense fallback={<LazyPanelFallback />}>
                      <LifestyleAdjunctEngineTab
                        mechanismAnalysis={mechanismAnalysisResult}
                        painMarkers={painMarkers.map(pm => ({
                          label: pm.anatomicalLabel || pm.nearestBone,
                          severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                          type: pm.type,
                        }))}
                        diagnosis={extractionResult?.mainComplaint || undefined}
                        recoveryPhase={extractionResult?.duration || undefined}
                        irritability={extractionResult?.irritability || undefined}
                        slingDrivenRecommendations={slingDrivenRecommendations}
                      />
                    </Suspense>
                  )}
                  {mechanismActiveTab === 'patientEd' && (
                    <PatientEducationEngineTab
                      mechanismAnalysis={mechanismAnalysisResult}
                      slingAnalysis={slingAnalysis}
                      painMarkers={painMarkers.map(pm => ({
                        label: pm.anatomicalLabel || pm.nearestBone,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        type: pm.type,
                      }))}
                    />
                  )}
                  {mechanismActiveTab === 'myPlan' && (
                    <Suspense fallback={<div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-cyan-400" /></div>}>
                      {/* Clinical context + orchestrate state are now owned
                          by the OrchestratePlanProvider wrapping the whole
                          page, so MyPlanPanel reads them via the shared
                          context instead of taking them as props. */}
                      <MyPlanPanel />
                    </Suspense>
                  )}
                </div>
              </div>
            )}

            {showSimTimeline && (
              <div className="absolute top-2 right-2 z-30 w-[460px] max-h-[calc(100%-16px)] overflow-y-auto animate-in slide-in-from-right-2 duration-200">
                <div className="bg-black/85 backdrop-blur rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-xs font-semibold text-gray-200">Recovery Timeline</span>
                    </div>
                    <button
                      onClick={() => setShowSimTimeline(false)}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Suspense fallback={<LazyPanelFallback />}>
                    <SimulationTimelinePanel
                      treatmentPlan={treatmentPlanData}
                      baseModelConfig={effectiveModelConfig}
                      baseOverrides={compensatedOverrides}
                      painMarkers={painMarkers.map(pm => ({
                        id: pm.id,
                        position: pm.position,
                        label: pm.anatomicalLabel || pm.nearestBone,
                        type: pm.type,
                        severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                        description: pm.description,
                      }))}
                      bodyWeightKg={bodyWeightKg}
                      biomechanicsOutput={unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput}
                      onApplyWeekToSkeleton={handleApplySimTimelineWeek}
                      customExercises={customExerciseResult?.customExercises ?? null}
                      customTechniques={customManualTherapyResult?.customTechniques ?? null}
                      extractionResult={extractionResult}
                      structuredReasoning={structuredReasoningData}
                      onGoalOverlayChange={handleGoalOverlayChange}
                      onGoalProfileChange={handleGoalProfileChange}
                      onSessionPrescriptionSelect={handleSessionPrescriptionSelect}
                      onTriggerExerciseGenerate={handleTriggerExerciseGenerate}
                      onTriggerMTGenerate={handleTriggerMTGenerate}
                      exerciseGeneratingSession={exerciseGeneratingSession}
                      mtGeneratingSession={mtGeneratingSession}
                      exerciseGeneratedSessions={exerciseGeneratedSessions}
                      mtGeneratedSessions={mtGeneratedSessions}
                      scarSummary={scarSummaryForGoals}
                      chainTensionAverages={chainEffects.length > 0 ? chainEffects : undefined}
                      postureMeasurements={postureMeasurementsForGoals}
                      currentRom={currentRomForGoals}
                      clinicalPlan={clinicalPlan}
                      playbackRef={timelinePlaybackRef}
                      onPlaybackStateChange={setTimelinePlaybackState}
                      onConditionPhasesChange={setConditionPhases}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {showRecoverySim && (() => {
              /** Build the shared engine payload once per call from
               *  PhysioGPT's clinical state (mechanism / sling / pain
               *  markers / scar / adhesion / muscle pathology), then
               *  override the recoveryGoalContext per phase so the AI
               *  knows the dosage / MT-grade ceiling and gap focus for
               *  THIS phase rather than the patient's current phase. */
              const buildEnginePayload = (req: PhaseRxRequest, kind: 'exercise' | 'manual'): Record<string, unknown> => {
                const ma = mechanismAnalysisResult;
                const payload: Record<string, unknown> = {
                  mechanismSummary: ma?.overallMechanismSummary ?? '',
                  causalChains: (ma?.causalChains ?? []).map(chain =>
                    chain.map(s => ({
                      step: s.step,
                      structure: s.structure,
                      finding: s.finding,
                      mechanism: s.mechanism ?? '',
                      category: s.category ?? '',
                      severity: s.severity ?? '',
                    })),
                  ),
                  compensationCards: (ma?.compensationCards ?? []).map(c => ({
                    title: c.title,
                    description: c.clinicalSignificance ?? '',
                    severity: c.severity ?? '',
                    primaryRegion: c.primaryDysfunction ?? '',
                    compensatingRegion: c.compensatingStructures?.join(', ') ?? '',
                  })),
                  loadRedistribution: (ma?.loadRedistribution ?? []).map(l => ({
                    joint: l.joint,
                    change: `${l.changePct > 0 ? '+' : ''}${l.changePct}%`,
                    clinical: l.status,
                  })),
                  topContributors: ma?.topContributors ?? [],
                  kineticChainDysfunctions: (ma?.kineticChainDysfunctions ?? []).map(k => ({
                    chain: k.chainLabel ?? '',
                    dysfunction: k.dysfunction ?? '',
                    clinical: k.relevance ?? '',
                  })),
                  painMarkers: painMarkers.map(pm => ({
                    label: pm.anatomicalLabel || pm.nearestBone,
                    severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                    type: pm.type,
                  })),
                };
                if (slingAnalysis) {
                  payload.slingData = {
                    systemSummary: slingAnalysis.systemSummary,
                    overallForceTransferScore: slingAnalysis.overallForceTransferScore,
                    slings: slingAnalysis.slings.map(s => ({
                      label: s.label,
                      status: s.status,
                      activationScore: s.activationScore,
                      forceTransferQuality: s.forceTransferQuality,
                      weakLinks: s.weakLinks.map(w => ({ muscle: w.muscle, activationPct: w.activationPct, reason: w.reason })),
                      forceReroutes: s.forceReroutes.map(r => ({ fromMuscle: r.fromMuscle, toMuscle: r.toMuscle, reroutePct: r.reroutePct, clinical: r.clinical })),
                      treatmentTargets: s.treatmentTargets.map(t => ({ muscle: t.muscle, intervention: t.intervention, rationale: t.rationale })),
                      narrative: s.narrative,
                    })),
                  };
                }
                if (kind === 'manual') {
                  if (scarMarkers.length > 0) {
                    payload.scarMarkers = scarMarkers.map(s => ({
                      anatomicalLabel: s.anatomicalLabel,
                      type: s.type,
                      severity: s.severity,
                      age: s.age,
                      mobility: s.mobility,
                      affectedLayers: s.affectedLayers,
                      painOnPalpation: s.painOnPalpation,
                      nearestBone: s.nearestBone,
                    }));
                  }
                  if (adhesionBands.length > 0) {
                    payload.adhesionBands = adhesionBands.map(b => ({
                      startBone: b.startBone,
                      endBone: b.endBone,
                      tensionLevel: b.tensionLevel,
                      depth: b.depth,
                      restrictedMovements: b.restrictedMovements,
                    }));
                  }
                  const musclePathologies = Object.entries(compensatedOverrides)
                    .filter(([, ov]) => ov?.pathology && ov.pathology !== 'none')
                    .map(([muscleId, ov]) => ({
                      muscleId,
                      label: muscleId.replace(/_/g, ' '),
                      pathology: ov!.pathology as string,
                      severity: (ov!.tensionOffset > 20 ? 'severe' : ov!.tensionOffset > 10 ? 'moderate' : 'mild'),
                    }));
                  if (musclePathologies.length > 0) payload.musclePathologies = musclePathologies;
                }

                // Build a phase-specific PrescriptionContext by overriding
                // clinicalState.activePhaseIndex with the requested phase
                // so dosage scaling + MT-grade guidance reflect THIS
                // phase rather than the patient's current phase.
                if (activeGoalProfile) {
                  const phaseClinicalState = {
                    ...exerciseMtClinicalState,
                    activePhaseIndex: req.phaseStageIndex,
                    painMarkers: (exerciseMtClinicalState.painMarkers ?? []).map(pm => ({
                      ...pm,
                      // Use the projected pain at the start of this phase
                      // so the AI gets phase-appropriate irritability.
                      intensity: req.predictedPainAtPhase,
                    })),
                  };
                  // Pass the live goal-gap snapshot so ctx.goalGaps
                  // reflects the actual ROM / strength / functional
                  // shortfalls at this phase start (not an empty list).
                  const ctx = buildPrescriptionContext(activeGoalProfile, phaseClinicalState, activeGoalGap ?? null, null);
                  const goalCtx: Record<string, unknown> = {
                    condition: ctx.conditionName,
                    phaseLabel: req.phaseLabel,
                    // Engine prompts use phaseStartWeek to anchor
                    // dosage / progression language temporally
                    // (e.g. "by wk 4") rather than just by phase.
                    phaseStartWeek: req.phaseStartWeek,
                    goalAchievementPct: req.predictedGoalAchievementPct,
                    painCurrent: Math.round(req.predictedPainAtPhase),
                    painTarget: ctx.painTarget,
                    dosageIntensity: ctx.dosageScaling.intensityLabel,
                    dosageRationale: ctx.dosageScaling.rationale,
                    painCeiling: ctx.dosageScaling.painCeiling,
                    priorityBodyParts: ctx.priorityBodyParts,
                    contraindications: ctx.contraindications,
                    topGaps: ctx.goalGaps.slice(0, 5).map(g => ({
                      label: g.label,
                      gapPercent: Math.round(g.gapPercent),
                      priority: g.priority,
                      categories: g.recommendedCategories,
                    })),
                  };
                  if (kind === 'manual') {
                    // Manual-therapy generator needs the phase's
                    // Maitland/Mulligan grade ceiling so it doesn't
                    // prescribe Grade IV mobs in an inflammatory phase
                    // or stay at Grade I when the patient can tolerate
                    // end-range loading.
                    goalCtx.mtGradeRange = {
                      min: ctx.mtGradeGuidance.minGrade,
                      max: ctx.mtGradeGuidance.maxGrade,
                    };
                    goalCtx.mtGradeRationale = ctx.mtGradeGuidance.rationale;
                    goalCtx.mtPreferSustained = ctx.mtGradeGuidance.preferSustained;
                  }
                  payload.recoveryGoalContext = goalCtx;
                }
                return payload;
              };

              const handleGeneratePhaseExerciseRx = async (req: PhaseRxRequest): Promise<CustomExerciseInput[]> => {
                const payload = buildEnginePayload(req, 'exercise');
                const result = await apiRequest('/api/exercise-engine/design-custom', 'POST', payload) as { customExercises?: CustomExerciseInput[] };
                return result.customExercises ?? [];
              };
              const handleGeneratePhaseManualRx = async (req: PhaseRxRequest): Promise<CustomManualTechniqueInput[]> => {
                const payload = buildEnginePayload(req, 'manual');
                const result = await apiRequest('/api/manual-therapy-engine/design-custom', 'POST', payload) as { customTechniques?: CustomManualTechniqueInput[] };
                return result.customTechniques ?? [];
              };
              const handleAddCustomExercises = (items: CustomExerciseInput[]) => {
                setCustomExerciseResult(prev => {
                  const existing = prev?.customExercises ?? [];
                  // De-dupe by stableId only when present so that
                  // user-authored items with the same name remain
                  // distinct (each gets its own backing profile and
                  // can be scheduled independently).
                  const existingStableIds = new Set(existing.map(e => e.stableId).filter(Boolean) as string[]);
                  const merged = [...existing, ...items.filter(i => !i.stableId || !existingStableIds.has(i.stableId))];
                  return {
                    customExercises: merged as typeof existing,
                    designRationale: prev?.designRationale ?? '',
                    safetyNotes: prev?.safetyNotes ?? '',
                  };
                });
              };
              const handleAddCustomTechniques = (items: CustomManualTechniqueInput[]) => {
                setCustomManualTherapyResult(prev => {
                  const existing = prev?.customTechniques ?? [];
                  const existingStableIds = new Set(existing.map(t => t.stableId).filter(Boolean) as string[]);
                  const merged = [...existing, ...items.filter(i => !i.stableId || !existingStableIds.has(i.stableId))];
                  return {
                    customTechniques: merged as typeof existing,
                    designRationale: prev?.designRationale ?? '',
                    safetyNotes: prev?.safetyNotes ?? '',
                  };
                });
              };
              const handleRemoveCustomItem = (treatmentId: string) => {
                setCustomExerciseResult(prev => {
                  if (!prev?.customExercises?.length) return prev;
                  const next = prev.customExercises.filter((ex, idx) => buildCustomExerciseId(ex, idx) !== treatmentId);
                  if (next.length === prev.customExercises.length) return prev;
                  return { ...prev, customExercises: next as typeof prev.customExercises };
                });
                setCustomManualTherapyResult(prev => {
                  if (!prev?.customTechniques?.length) return prev;
                  const next = prev.customTechniques.filter((tech, idx) => buildCustomTechniqueId(tech, idx) !== treatmentId);
                  if (next.length === prev.customTechniques.length) return prev;
                  return { ...prev, customTechniques: next as typeof prev.customTechniques };
                });
              };

              return (
              <Suspense fallback={<LazyPanelFallback />}>
                <RecoverySimulatorDashboard
                  conditionLabel={extractionResult?.mainComplaint || undefined}
                  conditionContext={recoverySimConditionContext}
                  patientName={'Patient'}
                  patientMeta={[extractionResult?.patientAge ? `Age ${extractionResult.patientAge}` : null, extractionResult?.duration].filter(Boolean).join(' · ') || undefined}
                  goalLabel={extractionResult?.mainComplaint || 'Return to function'}
                  onClose={() => setShowRecoverySim(false)}
                  onApplyState={handleApplyRecoverySimState}
                  hasClinicalInput={recoverySimHasClinicalInput}
                  customExercises={customExerciseResult?.customExercises ?? null}
                  customTechniques={customManualTherapyResult?.customTechniques ?? null}
                  onSkeletonSlotMount={setRecoverySimSlot}
                  onGeneratePhaseExerciseRx={handleGeneratePhaseExerciseRx}
                  onGeneratePhaseManualRx={handleGeneratePhaseManualRx}
                  onAddCustomExercises={handleAddCustomExercises}
                  onAddCustomTechniques={handleAddCustomTechniques}
                  onRemoveCustomItem={handleRemoveCustomItem}
                  aiNaturalTimeline={naturalTimeline.result ?? null}
                  naturalTimelineLoading={naturalTimeline.loading}
                  caseSpecificPlan={caseSpecificPlan.result ?? null}
                  caseSpecificPlanLoading={caseSpecificPlan.loading}
                  caseSpecificPlanError={caseSpecificPlan.error ?? null}
                  onRetryCaseSpecificPlan={caseSpecificPlan.refresh}
                  patientContextBadge={lastClinicalParseResult ? (
                    <PatientContextStatusBadge
                      status={recoverySimPcStatus}
                      answeredCount={patientContextAnsweredCount}
                      surfaceLabel="Recovery simulation"
                      promptsStale={patientContextPromptsStale}
                      onAddContextClick={() => {
                        setShowRecoverySim(false);
                        setTimeout(() => {
                          patientContextSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 200);
                      }}
                      size="sm"
                    />
                  ) : null}
                  electrophysicalPlan={electroPlan}
                  onOpenElectroTab={() => { setShowInjuryMechanism(true); setMechanismActiveTab('electroRx'); }}
                  onGenerateElectroPlanForPhase={(req) => {
                    setElectroPrefill({
                      condition: req.condition || extractionResult?.mainComplaint || '',
                      stage: req.stage,
                      nonce: Date.now(),
                    });
                    setShowInjuryMechanism(true);
                    setMechanismActiveTab('electroRx');
                  }}
                  skeletonBiasInputs={{
                    spine: {
                      lordosis: modelConfig?.spine?.lumbarLordosis,
                      kyphosis: modelConfig?.spine?.thoracicKyphosis,
                      scoliosis: modelConfig?.spine?.scoliosis,
                      forwardHead: modelConfig?.spine?.forwardHead,
                      cervicalFlexion: modelConfig?.spine?.cervicalLateralFlexion,
                    },
                    pelvis: {
                      tilt: modelConfig?.pelvis?.tilt,
                      obliquity: modelConfig?.pelvis?.obliquity,
                      rotation: modelConfig?.pelvis?.rotation,
                    },
                    leftHip: {
                      flexion: modelConfig?.leftHip?.flexion,
                      internalRotation: modelConfig?.leftHip?.internalRotation,
                      anteversion: modelConfig?.leftHip?.anteversion,
                    },
                    rightHip: {
                      flexion: modelConfig?.rightHip?.flexion,
                      internalRotation: modelConfig?.rightHip?.internalRotation,
                      anteversion: modelConfig?.rightHip?.anteversion,
                    },
                    leftKnee: {
                      valgus: -(modelConfig?.leftKnee?.varus ?? 0),
                      recurvatum: modelConfig?.leftKnee?.recurvatum,
                    },
                    rightKnee: {
                      valgus: -(modelConfig?.rightKnee?.varus ?? 0),
                      recurvatum: modelConfig?.rightKnee?.recurvatum,
                    },
                    leftAnkle: {
                      dorsiflexion: modelConfig?.leftAnkle?.dorsiflexion,
                      eversion: modelConfig?.leftAnkle?.eversion,
                      archHeight: modelConfig?.leftAnkle?.archHeight,
                    },
                    rightAnkle: {
                      dorsiflexion: modelConfig?.rightAnkle?.dorsiflexion,
                      eversion: modelConfig?.rightAnkle?.eversion,
                      archHeight: modelConfig?.rightAnkle?.archHeight,
                    },
                    leftShoulder: {
                      flexion: modelConfig?.leftShoulder?.flexion,
                      abduction: modelConfig?.leftShoulder?.abduction,
                    },
                    rightShoulder: {
                      flexion: modelConfig?.rightShoulder?.flexion,
                      abduction: modelConfig?.rightShoulder?.abduction,
                    },
                    // Live derived signals — flow through to driver model
                    // so compensations / overloaded joints / ROM deficit
                    // bend irritability, capacity & chronicity even when
                    // the joint angles themselves look benign.
                    compensationCount: mechanismAnalysisResult?.compensationCards?.length ?? 0,
                    jointForceOverloadCount: (hudForceAnalysis?.joints ?? []).filter(
                      (j: { status?: string }) => j.status === 'high' || j.status === 'very_high'
                    ).length,
                    // Task #239 — full per-joint load vectors (compression /
                    // shear / tension × magnitude) drive the vector-aware
                    // compensation_burden bias, so two skeletons with the
                    // same overload count but different load directions
                    // produce different recovery curves.
                    jointLoadVectors: extractJointLoadVectors(hudForceAnalysis ?? null, { topN: 6 }),
                  }}
                  naturalTimelineSlot={
                    <Suspense fallback={null}>
                      <NaturalTimelinePanel
                        result={naturalTimeline.result}
                        qaHistory={naturalTimeline.qaHistory}
                        loading={naturalTimeline.loading}
                        error={naturalTimeline.error}
                        hasContext={!!naturalTimelineRequestContext}
                        onAnswer={naturalTimeline.answerQuestion}
                        patientContextBadge={lastClinicalParseResult ? (
                          <PatientContextStatusBadge
                            status={naturalTimelinePcStatus}
                            answeredCount={patientContextAnsweredCount}
                            surfaceLabel="Natural timeline"
                            promptsStale={patientContextPromptsStale}
                            onAddContextClick={() => {
                              setShowRecoverySim(false);
                              setTimeout(() => {
                                patientContextSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 200);
                            }}
                          />
                        ) : null}
                      />
                    </Suspense>
                  }
                  initialInput={{
                    conditionSeverity: painMarkers.length > 0
                      ? Math.round(((painMarkers.reduce((s, p) => s + ((p as unknown as Record<string, unknown>).severity as number ?? 5), 0) / Math.max(1, painMarkers.length)) / 10) * 100)
                      : 50,
                    irritability: extractionResult?.irritability === 'high' ? 75 : extractionResult?.irritability === 'low' ? 25 : 50,
                    acuity: extractionResult?.duration === 'acute' ? 'acute' : extractionResult?.duration === 'chronic' ? 'chronic' : 'subacute',
                    patientAdherence: 0.8,
                    // Task #240 — derived from the structured Patient
                    // Factors form (occupational specifics) when set;
                    // otherwise the dashboard's own default takes over.
                    ...(derivedDrivers.workDemand !== null ? { workDemand: derivedDrivers.workDemand } : {}),
                    ...(derivedDrivers.fearAvoidance !== null ? { initialState: { fearAvoidance: derivedDrivers.fearAvoidance } } : {}),
                  }}
                  patientModifiers={effectivePatientModifiers}
                  patientFactorsOverrideCount={patientFactorsOverrideCount}
                  patientFactorsFilledCount={patientFactorsFilledCount}
                  derivedDrivers={derivedDrivers}
                />
              </Suspense>
              );
            })()}

            {showMechanicsAnalyser && (
              <Suspense fallback={<LazyPanelFallback />}>
                <MechanicsAnalyserDashboard
                  onClose={() => setShowMechanicsAnalyser(false)}
                  onSkeletonSlotMount={setMechanicsAnalyserSlot}
                  onOverlayChange={setMechanicsOverlay}
                  modelConfig={finalModelConfig as Record<string, Record<string, number | undefined> | undefined>}
                  bodyWeightKg={bodyWeightKg}
                  forceAnalysis={hudForceAnalysis ?? null}
                  animationState={animationState}
                  setAnimationState={setAnimationState}
                  patientMeta={[
                    extractionResult?.patientAge ? `Age ${extractionResult.patientAge}` : null,
                    extractionResult?.duration,
                  ].filter(Boolean).join(' · ') || undefined}
                  conditionLabel={extractionResult?.mainComplaint || undefined}
                />
              </Suspense>
            )}

            {showShoulderAssessment && (
              <div className="absolute top-2 right-2 z-30 w-80 h-[calc(100%-50px)]">
                <Suspense fallback={<LazyPanelFallback />}>
                <ShoulderAssessmentPanel
                  modelConfig={modelConfig}
                  side={shoulderAssessmentSide}
                  onClose={() => setShowShoulderAssessment(false)}
                  onSendToChat={(msg) => {
                    setShowShoulderAssessment(false);
                    handleSendMessage(msg);
                  }}
                />
                </Suspense>
              </div>
            )}

            <BiomechanicsHUD
              forceAnalysis={hudForceAnalysis}
              weightDistribution={hudWeightDistribution}
              muscleAnalysis={hudMuscleAnalysis}
              chainIntegrityScores={hudChainIntegrity}
              slingAnalysis={slingAnalysis}
              biomechanicsOutput={unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput}
              romRestrictionCount={unifiedBiomechanicsOutput?.posture?.romRestrictions?.length ?? cachedBiomechanicsOutput?.posture?.romRestrictions?.length ?? 0}
              tissueConcernCount={(() => { const bio = unifiedBiomechanicsOutput ?? cachedBiomechanicsOutput; if (!bio) return 0; const romCount = bio.posture.romRestrictions.filter(r => r.deficitPct > 20).length; const compCount = bio.compensationPatterns.patterns.filter(p => p.severity === 'moderate' || p.severity === 'severe').length; return romCount + compCount; })()}
              onOpenForceOverlay={() => { setForceMode(true); }}
              onOpenMuscleOverlay={() => { setMuscleMode(true); }}
              onOpenChainExplorer={() => { setShowUnifiedChainPanel(true); }}
              onOpenSlings={() => { setRightPanelTab('slings'); }}
              onOpenBiomechanics={() => { setRightPanelTab('biomechanics'); }}
              onToggleTissueView={() => { setTissueViewMode(prev => prev ? null : 'tendon'); }}
              timeMetrics={forceTimeMetrics}
              onOpenForceTime={() => setShowForceTimePanel(true)}
              patientForceState={patientForceState}
              bodyWeightKg={bodyWeightKg}
            />

            {showForceTimePanel && (
              <ForceTimePanel
                patientState={patientForceState}
                onPatientStateChange={setPatientForceState}
                onClose={() => setShowForceTimePanel(false)}
                onScrub={() => {/* scrub-back is local to the buffer */}}
                bodyWeightKg={bodyWeightKg}
              />
            )}

            <GRFOverlay
              positions={boneScreenPositionsRef.current}
              bodyWeightKg={bodyWeightKg}
              width={skeletonContainerSize.width}
              height={skeletonContainerSize.height}
              visible={grfOverlayEnabled && (forceMode || cameraPoseActive || animationState.isPlaying)}
            />

            {(liveTreatmentPriorities.targets.length > 0 || predictedPainSpots.length > 0) && (
              <div className={`absolute right-4 z-20 flex flex-col gap-1.5 transition-all duration-200 ${tissueViewMode ? 'top-[320px]' : 'top-4'}`}>
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

            <Suspense fallback={null}>
            <TreatmentOverlayBridge
              treatmentPriorities={liveTreatmentPriorities}
              positionsRef={boneScreenPositionsRef}
              containerWidth={skeletonContainerSize.width}
              containerHeight={skeletonContainerSize.height}
              visible={showTreatmentOverlay && liveTreatmentPriorities.targets.length > 0}
              predictedPainSpots={predictedPainSpots}
              showPredictedPain={showPredictedPain && predictedPainSpots.length > 0}
            />
            </Suspense>

          </div>
          </div>

      {/* Conversation History Sidebar - floating overlay inside skeleton */}
      {uiStage >= 1 && <div className={`absolute top-0 left-0 h-full z-30 transition-all duration-300 ${sidebarOpen ? 'w-[260px]' : 'w-0'} overflow-hidden`}>
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
                    onClick={() => { setSelectedConversationId(conv.id); setChatPanelOpen(true); }}
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
      </div>}

      {/* Right Panel - Chat & Treatment tabs */}
      {uiStage >= 2 && <div className={`absolute top-0 right-0 h-full z-30 transition-all duration-300 ${chatPanelOpen ? 'w-[380px]' : 'w-0'} overflow-hidden`}>
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
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelTab === 'biomechanics' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  if (rightPanelTab === 'biomechanics' && unifiedBiomechanicsOutput) {
                    setPreviousBiomechanicsOutput(unifiedBiomechanicsOutput);
                  }
                  setRightPanelTab('biomechanics');
                }}
              >
                <Activity className="h-3 w-3" />
                Biomech
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelTab === 'slings' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setRightPanelTab('slings')}
              >
                <GitBranch className="h-3 w-3" />
                Slings
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

          {rightPanelTab === 'biomechanics' && (
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<LazyPanelFallback />}>
              <UnifiedBiomechanicsPanel
                output={unifiedBiomechanicsOutput}
                onMovementTaskChange={setUnifiedBiomechanicsMovementTask}
                onMovementProgressChange={setUnifiedBiomechanicsProgress}
                onFaultRuleOverride={setUnifiedBiomechanicsFaultOverrides}
                selectedMovementTask={unifiedBiomechanicsMovementTask}
                movementProgress={unifiedBiomechanicsProgress}
              />
              </Suspense>
            </div>
          )}

          {rightPanelTab === 'slings' && (
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<LazyPanelFallback />}>
              <SlingAnalysisPanel
                analysis={slingAnalysis}
                onSlingSelect={setSelectedSlingId}
                selectedSling={selectedSlingId}
                overlayVisible={slingOverlayVisible}
                onToggleOverlay={() => setSlingOverlayVisible(v => !v)}
                slingActivation={slingActivationOverrides}
                onSlingActivationChange={(slingId, val) => {
                  setSlingActivationOverrides(prev => ({ ...prev, [slingId]: val }));
                }}
                onResetSling={(slingId) => {
                  setSlingActivationOverrides(prev => {
                    const { [slingId]: _omit, ...rest } = prev;
                    return rest;
                  });
                }}
                onResetAllSlings={() => setSlingActivationOverrides({})}
                painMarkers={painMarkers.map(pm => ({
                  id: pm.id,
                  nearestBone: pm.nearestBone,
                  anatomicalLabel: pm.anatomicalLabel || pm.nearestBone,
                  severity: pm.severity,
                  type: pm.type,
                }))}
                driverAnalysis={slingDriverAnalysisResult}
              />
              </Suspense>
            </div>
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
                                  onClick={async () => {
                                    const gen = await loadPdfGenerator();
                                    gen.downloadPDF({
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
      </div>}

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
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-black/70 hover:bg-black/80 text-white'}`}
          >
            {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {isRecording ? 'Stop Voice' : 'Voice'}
          </button>
          <button
            onClick={toggleCameraMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${cameraMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-black/70 hover:bg-black/80 text-white'}`}
          >
            {cameraMode ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            {cameraMode ? 'Stop Camera' : 'Camera'}
          </button>
          {extractionResult && (
            <button
              onClick={() => setExtractionResultsOpen(!extractionResultsOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg transition-colors text-xs font-medium backdrop-blur ${extractionResultsOpen ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-black/70 hover:bg-black/80 text-white'}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {extractionResultsOpen ? 'Hide Results' : 'Extraction Results'}
              {!extractionResultsOpen && (
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          )}
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

      <div className={`absolute top-14 z-30 transition-all duration-300 ${sidebarOpen ? 'left-[270px]' : 'left-3'}`}>
        <Suspense fallback={<LazyPanelFallback />}>
        <ClinicalTextInput
          ref={clinicalTextInputRef}
          onParseResult={handleClinicalTextParse}
          onParseError={() => {
            // Clear any staged voice trigger metadata so the next
            // successful parse isn't misattributed to a failed one.
            pendingVoiceTriggerRef.current = null;
          }}
          onClearFindings={handleClinicalTextClear}
          onFollowUpQuestionsChange={handleVoiceFollowUpQuestionsChange}
          patientContext={patientContextPayload}
          chainIntegrityScores={(() => {
            const integrity = hudChainIntegrity;
            if (!integrity || integrity.size === 0) return undefined;
            const arr: Array<{ chainId: string; score: number; issues: string[] }> = [];
            integrity.forEach((val, key) => { arr.push({ chainId: key, score: val.score, issues: val.issues }); });
            return arr;
          })()}
          forceAnalysis={(() => {
            const forces = hudForceAnalysis;
            if (!forces || !forces.joints) return undefined;
            return forces.joints.filter((j: { status: string }) => j.status === 'high' || j.status === 'very_high').map((j: { label: string; totalForce: number }) => ({ joint: j.label, force_percent: Math.round(j.totalForce * 100) }));
          })()}
        />
        </Suspense>
        {/* AI-driven Patient Context — appears under the Clinical
            Prediction box once a prediction has been generated, asks
            condition-specific questions, and pipes the merged answers
            into the prediction re-run, the natural-history timeline,
            the case-specific treatment plan and the recovery sim. */}
        {lastClinicalParseResult && (
          <div ref={patientContextSectionRef} className="mt-2 animate-in fade-in slide-in-from-top-1 duration-300 space-y-2">
            <PatientContextPanel
              parseResult={lastClinicalParseResult}
              state={patientContextState}
              onChange={setPatientContextState}
              onApply={() => {
                // Re-run the prediction with the latest patient
                // context. The natural-timeline and case-specific
                // plan hooks pick up patient-context changes via
                // their own signature so they refresh automatically.
                // (A debounced auto-apply also fires whenever the PC
                // payload changes, so this manual button is only an
                // "apply now" shortcut.)
                clinicalTextInputRef.current?.triggerIncrementalParse();
              }}
            />
            {/* Task #240 — Structured Patient Factors form. Lives next
                to the AI Q&A panel; edits flow into the recovery sim's
                multipliers via `effectivePatientFactors`. */}
            <Suspense fallback={<LazyPanelFallback />}>
              <PatientFactorsForm
                factors={effectivePatientFactors}
                autoDetected={autoDetectedPatientFactors}
                overriddenCount={patientFactorsOverrideCount}
                onChange={handlePatientFactorsChange}
              />
            </Suspense>
            {/* Task #281 — Case-Aware Research Engine v1. Mounted next to
                Patient Context so the synthesis is anchored to the same
                inputs the clinician has just curated. caseId is a stable
                hash of the original description (so "the same case"
                across edits stays addressable), while contentHash mixes
                description + patient context sig so any meaningful
                change marks the cached synthesis stale. */}
            {(() => {
              const desc = (lastClinicalParseResult?.original_description || '').replace(/\s+/g, ' ').trim();
              const summary = (lastClinicalParseResult?.clinical_summary || '').replace(/\s+/g, ' ').trim();
              if (!desc) return null;
              // Tiny, deterministic FNV-1a 32-bit hash → 8-char hex.
              const fnv32 = (s: string) => {
                let h = 0x811c9dc5;
                for (let i = 0; i < s.length; i++) {
                  h ^= s.charCodeAt(i);
                  h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
                }
                return h.toString(16).padStart(8, '0');
              };
              const caseId = `case-${fnv32(desc)}`;
              // Condition seed: prefer the AI's clinical_summary (short
              // clinician-style framing, typically containing a working
              // diagnosis) over the raw clinician description (which can
              // be a paragraph). Either way we cap at 160 chars and pass
              // it UNQUOTED so the engine can use it as a free-text seed.
              const conditionSeed = (summary && summary.length <= 240 ? summary : desc).trim();
              const condition = conditionSeed.length > 160 ? conditionSeed.slice(0, 160).trim() : conditionSeed;
              const caseSummary = [
                `Description: ${desc}`,
                summary && summary !== desc ? `Clinical summary: ${summary}` : '',
                patientContextSig ? `Patient context: ${patientContextSig}` : '',
              ].filter(Boolean).join('\n\n');
              // Task #313 — case-aware research context. Built inline
              // (cheap, deterministic) from the same inputs Patient
              // Context + Clinical Reasoning are reading. Only fields
              // we can confidently fill are emitted; everything else is
              // omitted so the engine falls back to seed parsing. The
              // hash folds caseContext in so a new top hypothesis or a
              // new chronicity stage invalidates cached synthesis.
              const topHypoForCtx = (clinicalReasoningData?.hypotheses || [])
                .find(h => h.status !== 'ruled_out') ?? clinicalReasoningData?.hypotheses?.[0];
              const painRegionsForCtx = Array.from(new Set(
                (lastClinicalParseResult?.pain_markers || [])
                  .map(m => (m.anatomical_label || '').trim())
                  .filter(Boolean)
              )).slice(0, 12);
              const lateralityCounts = (lastClinicalParseResult?.pain_markers || []).reduce(
                (acc: { left: number; right: number }, m) => {
                  const lbl = (m.anatomical_label || '').toLowerCase();
                  if (/\bleft\b|_l_|_l$/.test(lbl)) acc.left += 1;
                  if (/\bright\b|_r_|_r$/.test(lbl)) acc.right += 1;
                  return acc;
                },
                { left: 0, right: 0 }
              );
              const lateralityForCtx: 'left' | 'right' | 'bilateral' | 'unspecified' =
                lateralityCounts.left > 0 && lateralityCounts.right > 0 ? 'bilateral'
                : lateralityCounts.left > 0 ? 'left'
                : lateralityCounts.right > 0 ? 'right'
                : 'unspecified';
              const patientFactorsForCtx = [
                effectivePatientFactors?.age != null ? `age:${effectivePatientFactors.age}` : null,
                effectivePatientFactors?.activityLevel ? `activity:${effectivePatientFactors.activityLevel}` : null,
                effectivePatientFactors?.bmi ? `bmi:${effectivePatientFactors.bmi}` : null,
              ]
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                .map(s => s.slice(0, 80))
                .slice(0, 12);
              const caseContext: CaseResearchContext = {
                ...(topHypoForCtx?.condition && typeof topHypoForCtx.confidence === 'number'
                  ? { topHypothesis: { label: topHypoForCtx.condition.slice(0, 200), confidence: Math.max(0, Math.min(1, topHypoForCtx.confidence)) } }
                  : {}),
                ...(summary ? { mainComplaint: summary.slice(0, 200) } : (desc ? { mainComplaint: desc.slice(0, 200) } : {})),
                ...(painRegionsForCtx.length > 0 ? { region: painRegionsForCtx[0].slice(0, 80) } : {}),
                ...(lateralityForCtx !== 'unspecified' ? { laterality: lateralityForCtx } : {}),
                ...(effectivePatientFactors?.chronicityStage
                  ? { chronicity: String(effectivePatientFactors.chronicityStage).slice(0, 40) }
                  : {}),
                ...(painRegionsForCtx.length > 0 ? { painRegions: painRegionsForCtx } : {}),
                ...(patientFactorsForCtx.length > 0 ? { patientFactors: patientFactorsForCtx } : {}),
              };
              const ctxSig = JSON.stringify(caseContext);
              const contentHash = fnv32(`${desc}\u241F${summary}\u241F${patientContextSig}\u241F${ctxSig}`);
              return (
                <CaseResearchPanel
                  ref={caseResearchPanelRef}
                  caseId={caseId}
                  condition={condition}
                  caseSummary={caseSummary}
                  contentHash={contentHash}
                  caseContext={caseContext}
                  className="w-full"
                />
              );
            })()}
            {/* Movement Mode side panel. The Active
                Capacities table lives in the case-research column.
                The Findings stream is rendered as a right-rail (mirror
                of ClinicalReasoningPanel) below so it occupies the same
                visual slot as the static-posture reasoning panel it
                replaces. */}
            {skeletonMode === 'movement' && activeCaseId && (
              <div className="mt-3 space-y-3" data-testid="movement-mode-panels">
                <ActiveCapacitiesPanel caseId={activeCaseId} />
              </div>
            )}
          </div>
        )}
        {hasClinicalTextData && (
          <div ref={masterPlanContainerRef} className="relative mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex gap-1.5">
              <Button
                ref={masterPlanPillRefs.exercise}
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] bg-violet-600/90 text-white hover:bg-violet-500 border border-violet-400/30 shadow-lg shadow-violet-900/30"
                onClick={() => { setShowInjuryMechanism(true); setMechanismActiveTab('exercise'); }}
              >
                <Dumbbell className="h-3 w-3 mr-1" />
                Exercise Rx
              </Button>
              <Button
                ref={masterPlanPillRefs.manual}
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/30 shadow-lg shadow-rose-900/30"
                onClick={() => { setShowInjuryMechanism(true); setMechanismActiveTab('manualRx'); }}
              >
                <Hand className="h-3 w-3 mr-1" />
                Manual Therapy
              </Button>
              <Button
                ref={masterPlanPillRefs.electro}
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] bg-amber-600/90 text-white hover:bg-amber-500 border border-amber-400/30 shadow-lg shadow-amber-900/30"
                onClick={() => { setShowInjuryMechanism(true); setMechanismActiveTab('electroRx'); }}
              >
                <Zap className="h-3 w-3 mr-1" />
                Electrophysical Agents
              </Button>
              <Button
                ref={masterPlanPillRefs.adjunct}
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] bg-emerald-600/90 text-white hover:bg-emerald-500 border border-emerald-400/30 shadow-lg shadow-emerald-900/30"
                onClick={() => { setShowInjuryMechanism(true); setMechanismActiveTab('adjunctRx'); }}
                data-testid="button-adjunct-rx-quick"
              >
                <Leaf className="h-3 w-3 mr-1" />
                Adjunct Rx
              </Button>
            </div>
            <MasterPlanCard
              diagnosis={extractionResult?.mainComplaint ?? null}
              pillRefs={masterPlanPillRefs}
              containerRef={masterPlanContainerRef}
              onOpenSidePanel={() => {
                // Optional escape hatch — let users still pop the right-side
                // tab open if they prefer. The card no longer auto-navigates
                // when "Build full plan" finishes; the inline section
                // surfaces the result in place (Task #270).
                setShowInjuryMechanism(true);
                setMechanismActiveTab('myPlan');
              }}
              onAutoBuild={handleAutoBuildClick}
              autoBuildPending={autoBuildState !== 'idle'}
              autoBuildDisabled={!hasClinicalTextData}
              expandSignal={masterPlanExpandSignal}
              clinicalContext={rationaleClinicalContext}
            />
            {/* Phantom engines (Task #267): hidden, mount only during auto-build
                so each engine's autoAddOnGenerate cascade fires without forcing
                the user to leave their current tab. Each engine adds its
                generated items to the shared plan cart, which drives the
                MasterPlanCard's per-modality flash + line-draw animations.
                Mounted during 'generating' AND 'organizing' so the final
                paint tick still owns the same React tree. */}
            {autoBuildState !== 'idle' && (
              <div className="hidden" aria-hidden="true" data-testid="master-plan-auto-build-phantoms">
                <Suspense fallback={null}>
                  <ExerciseEngineTab
                    mechanismAnalysis={mechanismAnalysisResult}
                    slingAnalysis={slingAnalysis}
                    painMarkers={painMarkers.map(pm => ({
                      label: pm.anatomicalLabel || pm.nearestBone,
                      severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                      type: pm.type,
                    }))}
                    slingDrivenRecommendations={slingDrivenRecommendations}
                    onCustomExerciseResult={() => { /* phantom: ignore */ }}
                    pendingGenerate={autoBuildTriggerExercise}
                    onGenerateStarted={handleAutoBuildStartExercise}
                    onGenerateComplete={handleAutoBuildCompleteExercise}
                    autoAddOnGenerate
                    conditionName={extractionResult?.mainComplaint ?? undefined}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <ManualTherapyEngineTab
                    mechanismAnalysis={mechanismAnalysisResult}
                    slingAnalysis={slingAnalysis}
                    painMarkers={painMarkers.map(pm => ({
                      label: pm.anatomicalLabel || pm.nearestBone,
                      severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                      type: pm.type,
                    }))}
                    slingDrivenRecommendations={slingDrivenRecommendations}
                    scarMarkers={scarMarkers}
                    adhesionBands={adhesionBands}
                    musclePathologies={Object.entries(compensatedOverrides)
                      .filter(([, ov]) => ov?.pathology && ov.pathology !== 'none')
                      .map(([muscleId, ov]) => ({
                        muscleId,
                        label: muscleId.replace(/_/g, ' '),
                        pathology: ov!.pathology as string,
                        severity: ov!.tensionOffset > 20 ? 'severe' : ov!.tensionOffset > 10 ? 'moderate' : 'mild',
                      }))}
                    onHighlightMuscles={() => { /* phantom: ignore */ }}
                    onSetMuscleHighlightColors={() => { /* phantom: ignore */ }}
                    onSetManualTherapyAnnotations={() => { /* phantom: ignore */ }}
                    onCustomManualTherapyResult={() => { /* phantom: ignore */ }}
                    pendingGenerate={autoBuildTriggerMT}
                    onGenerateStarted={handleAutoBuildStartMT}
                    onGenerateComplete={handleAutoBuildCompleteMT}
                    autoAddOnGenerate
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <ElectrophysicalEngineTab
                    mechanismAnalysis={mechanismAnalysisResult}
                    slingAnalysis={slingAnalysis}
                    painMarkers={painMarkers.map(pm => ({
                      label: pm.anatomicalLabel || pm.nearestBone,
                      severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                      type: pm.type,
                    }))}
                    slingDrivenRecommendations={slingDrivenRecommendations}
                    onPlanChange={() => { /* phantom: ignore */ }}
                    initialCondition={extractionResult?.mainComplaint ?? ''}
                    initialStage={(extractionResult?.duration === 'acute' ? 'acute'
                      : extractionResult?.duration === 'subacute' ? 'subacute'
                      : extractionResult?.duration === 'chronic' || extractionResult?.duration === 'recurrent' ? 'chronic'
                      : 'subacute') as 'acute' | 'subacute' | 'chronic'}
                    autoGenerateNonce={autoBuildElectroNonce}
                    autoGenerate
                    autoAddOnGenerate
                    onGenerateComplete={handleAutoBuildCompleteEPA}
                    patientId={selectedConversationId ?? null}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <AdjunctTherapiesEngineTab
                    mechanismAnalysis={mechanismAnalysisResult}
                    painMarkers={painMarkers.map(pm => ({
                      label: pm.anatomicalLabel || pm.nearestBone,
                      severity: (pm as unknown as Record<string, unknown>).severity as number | undefined,
                      type: pm.type,
                    }))}
                    diagnosis={extractionResult?.mainComplaint || undefined}
                    recoveryPhase={extractionResult?.duration || undefined}
                    irritability={extractionResult?.irritability || undefined}
                    pendingGenerate={autoBuildTriggerAdjunct}
                    onGenerateStarted={handleAutoBuildStartAdjunct}
                    onGenerateComplete={handleAutoBuildCompleteAdjunct}
                    autoAddOnGenerate
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}
      </div>


      {extractionResultsOpen && extractionResult && (
        <div className="absolute top-14 z-[31] w-[400px] max-h-[calc(100vh-80px)]" style={{ right: '420px' }}>
          <ExtractionResultsPanel
            result={extractionResult}
            onClose={() => setExtractionResultsOpen(false)}
            onUpdateResult={(updated) => {
              setExtractionResult(updated);
            }}
            buildIntakePayload={() => {
              return { sources: [], manualForm: null, freeText: "", voiceTranscription: "", painMarkers: [], mechanismOfInjury: "", patientAge: null, patientSex: "", relevantHistory: "" };
            }}
          />
        </div>
      )}

      {/* In Active Movement Mode the static-posture
          clinical reasoning AI pipeline is gated off; the per-movement
          Findings stream renders into the same right-rail slot the
          ClinicalReasoningPanel normally occupies. */}
      {skeletonMode === 'movement' && (
        <div className="absolute top-0 right-0 h-full w-[340px] z-30 animate-in slide-in-from-right-2 duration-300 p-2 pointer-events-auto" data-testid="movement-findings-rail">
          <MovementFindingsStream
            findings={movementFindings}
            onClear={() => setMovementFindings([])}
            className="h-full"
          />
        </div>
      )}
      {skeletonMode !== 'movement' && (
      <ClinicalReasoningPanel
        data={clinicalReasoningData}
        isProcessing={clinicalReasoningProcessing}
        isOpen={clinicalReasoningOpen}
        isPaused={clinicalReasoningPaused}
        onToggle={() => setClinicalReasoningOpen(!clinicalReasoningOpen)}
        onClose={() => setClinicalReasoningOpen(false)}
        onPauseToggle={() => setClinicalReasoningPaused(prev => !prev)}
        onReset={() => {
          setClinicalReasoningData(null);
          setStructuredReasoningData(null);
          setTreatmentDecisionData(null);
          setTreatmentPlanData(null);
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
        onHypothesisClick={handleHypothesisClick}
        onTestHypothesisClick={handleTestHypothesisClick}
        structuredData={structuredReasoningData}
        structuredLoading={structuredReasoningLoading}
        onStructuredHypothesisClick={handleStructuredHypothesisClick}
        onTestStructuredHypothesisClick={handleTestStructuredHypothesisClick}
        decisionData={treatmentDecisionData}
        decisionLoading={treatmentDecisionLoading}
        onDecisionTargetClick={handleDecisionTargetClick}
        planData={treatmentPlanData}
        planLoading={treatmentPlanLoading}
        onPlanTargetClick={handleDecisionTargetClick}
        onPlanLoadingRecalculate={handlePlanLoadingRecalculate}
        onPlanLoadingOverride={handlePlanLoadingOverride}
        onPlanLoadingClearOverride={handlePlanLoadingClearOverride}
        evidenceData={evidenceEngineResult}
        evidenceLoading={evidenceLoading}
        onEvidenceQuery={handleEvidenceQuery}
        onManualEvidenceQuery={handleManualEvidenceQuery}
        requestedTab={reasoningRequestedTab}
        onRequestedTabHandled={() => setReasoningRequestedTab(null)}
        onActiveTabChange={setReasoningActiveTab}
      />
      )}

      <HypothesisTestBench
        isOpen={testBenchOpen}
        hypothesis={testBenchHypothesis}
        context={{
          subjectiveHistory: subjectiveHistoryInput,
          painMarkers: painMarkers.map(pm => ({
            anatomicalLabel: pm.anatomicalLabel || pm.nearestBone,
            type: pm.type,
            severity: pm.severity ?? 5,
          })),
          posture: modelConfig as unknown as Record<string, Record<string, number>>,
        }}
        candidatesForCompare={[
          ...((clinicalReasoningData?.hypotheses || []).filter(h => h.status !== 'ruled_out').map(h => ({
            id: h.id, condition: h.condition, confidence: h.confidence,
          }))),
          ...((structuredReasoningData?.hypotheses || []).map(h => ({
            id: h.id, condition: h.condition, confidence: h.confidence,
          }))),
        ]}
        onClose={() => { handleBenchApplyOverlay(null); setTestBenchOpen(false); }}
        onApplyOverlay={handleBenchApplyOverlay}
        onCommit={handleBenchCommit}
      />

      {stalePoseHint && (
        <div className="fixed top-4 right-[440px] z-50 max-w-xs bg-amber-950/90 border border-amber-500/40 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="text-[11px] text-amber-200 font-semibold mb-1">Skeleton may be stale</div>
          <div className="text-[11px] text-amber-100/90 mb-2">
            You replaced the hypothesis the skeleton was posed to. Re-pose to <span className="font-semibold">{stalePoseHint.condition}</span>?
          </div>
          <div className="flex gap-1.5">
            <button
              className="text-[11px] px-2 py-1 bg-amber-500 hover:bg-amber-400 text-gray-900 rounded font-medium"
              onClick={handleRePoseToRefined}
            >
              Re-pose
            </button>
            <button
              className="text-[11px] px-2 py-1 text-amber-200/80 hover:text-amber-100"
              onClick={() => setStalePoseHint(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <HypothesisChatPanel
        hypothesis={selectedHypothesisForChat}
        isOpen={hypothesisChatOpen}
        onClose={() => setHypothesisChatOpen(false)}
        onPoseCommand={applyPoseCommand}
        onRefinedHypothesisCommit={handleRefinedHypothesisCommit}
        subjectiveHistory={subjectiveHistoryInput}
        skeletonData={{
          posture: modelConfig,
          painMarkers: painMarkers.map(pm => ({
            label: pm.anatomicalLabel || pm.nearestBone,
            anatomicalLabel: pm.anatomicalLabel,
            nearestBone: pm.nearestBone,
            type: pm.type,
            severity: pm.severity ?? 5,
          })),
          forces: hudForceAnalysis?.joints?.map((f: JointSurfaceForce) => ({
            label: f.label,
            totalForce: f.totalForce,
            status: f.status,
          })) || [],
          muscles: hudMuscleAnalysis?.groups?.flatMap((g: MuscleGroupAnalysis) =>
            g.muscles.map((m: IndividualMuscle) => ({
              name: m.label,
              status: m.clinicalStatus,
              activation: m.activationPercent,
            }))
          ) || [],
        }}
      />
    </div>

    {showSimTimeline && (
      <Suspense fallback={null}>
        <TimelineBottomBar
          playbackState={timelinePlaybackState}
          playbackRef={timelinePlaybackRef}
          conditionPhases={conditionPhases}
        />
      </Suspense>
    )}
    <Suspense fallback={null}>
      <VoiceActivityDock
        key={voiceDockSessionKey}
        entries={voiceActivityEntries}
        isRecording={isRecording}
        visible={voiceDockVisible}
        onUndo={handleVoiceActivityUndo}
        monitorStages={monitorStages}
        monitorStability={monitorStability}
        autopilotEnabled={autopilotEnabled}
        autopilotEligible={isRecording || hasClinicalTextData}
        paused={autopilotPaused}
        onAutopilotToggle={handleAutopilotToggle}
        onPauseToggle={handleAutopilotPauseToggle}
        onRerunFromStage={handleAutopilotRerunFromStage}
      />
    </Suspense>
    </div>
    </TreatmentRationaleProvider>
    </OrchestratePlanProvider>
    </PlanCartProvider>
    </Suspense>
  );
}