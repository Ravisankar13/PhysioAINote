import { useState, useEffect, Suspense, Component, ReactNode, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Copy, AlertCircle, Loader2, ExternalLink, Play, Pause, SkipBack, Activity, Eye, EyeOff, ArrowDown, Zap, Target, User, Lock, FileText, Save, FolderOpen, Trash2, Camera, Video, Brain, Stethoscope } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PureThreeGLBViewer, { AnimationState, AnatomicalRegion, JointGroup } from "@/components/skeleton/PureThreeGLBViewer";
import { MUSCLE_GROUPS } from "@/lib/muscleGroupSplitter";
import { computeAllMuscleStates, applyOverridesAndChains, type MuscleStatesMap, type MuscleStatus, type MuscleOverride, type PathologyType, type LengthOverride, PATHOLOGY_LABELS, PATHOLOGY_EFFECTS } from "@/lib/muscleBiomechanicsEngine";
import { propagateChainEffects, computeWholeBodyTensionScore, getChainMembership, MYOFASCIAL_CHAINS, MUSCLE_BONE_POSITIONS } from "@/lib/myofascialChains";
import { type ScarMarker, type AdhesionBand, SCAR_TYPES, SCAR_SEVERITY_LABELS, SCAR_AGE_LABELS, TISSUE_LAYERS, getScarImpact, type ScarType, type TissueLayer, type ScarAge, type ScarMobility } from "@/lib/scarTissueMapping";
import { computeBidirectionalEffects, applyBidirectionalToModelConfig, mergeReciprocalInhibitions, getAntagonistFor, type BidirectionalResult } from "@/lib/bidirectionalMuscleJoint";
import JointZoomCameras from "@/components/skeleton/JointZoomCameras";
import MultiViewSkeletonLayout from "@/components/skeleton/MultiViewSkeletonLayout";
import CameraPoseCapture from "@/components/skeleton/CameraPoseCapture";
import { Skeleton3DPose } from "@/utils/mediapipeTo3D";
import PatientClonePanel from "@/components/skeleton/PatientClonePanel";
import RegionZoomControls from "@/components/skeleton/RegionZoomControls";
import { RegionInsightsPanel } from "@/components/skeleton/RegionInsightsPanel";
import { JointConstraintsCard } from "@/components/skeleton/JointConstraintsCard";
import { DiagnosticAssessmentPanel } from "@/components/skeleton/DiagnosticAssessmentPanel";
import { JointConstraint, calculateCompensations } from "@/lib/jointConstraints";
import { MOVEMENT_SEQUENCES } from "@/lib/movementSequences";
import BiomechanicsPanel from "@/components/skeleton/BiomechanicsPanel";
import { Grid2X2, Maximize, Layers } from "lucide-react";
import { BiomechanicsVisualizationData } from "@/lib/forceVisualization";
import { calculateFullBiomechanics } from "@/lib/biomechanicsEngine";
import { PatientCloneState } from "@/lib/patientCloneComposer";
import ClinicalIntakePanel, { ClinicalIntakeData } from "@/components/skeleton/ClinicalIntakePanel";
import ClinicalAssessmentResults from "@/components/skeleton/ClinicalAssessmentResults";
import { MovementPatternRecognizer, MovementAnalysisResult } from "@/lib/movementPatternRecognition";
import { StaticPostureAnalyzer } from "@/lib/staticPostureAnalyzer";

interface GLBErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface GLBErrorBoundaryState {
  hasError: boolean;
}

class GLBErrorBoundary extends Component<GLBErrorBoundaryProps, GLBErrorBoundaryState> {
  constructor(props: GLBErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GLBErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.log('GLB Viewer error caught:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
  leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  leftScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  rightScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
  leftWrist: { deviation: number; flexion: number };
  rightWrist: { deviation: number; flexion: number };
}

function InteractiveSVGSkeleton({ modelConfig }: { modelConfig: ModelConfig }) {
  const spineOffset = modelConfig.spine.thoracicKyphosis * 0.3;
  const pelvisTilt = modelConfig.pelvis.tilt * 0.5;
  const leftHipFlex = modelConfig.leftHip.flexion * 0.3;
  const rightHipFlex = modelConfig.rightHip.flexion * 0.3;
  const leftKneeFlex = modelConfig.leftKnee.flexion * 0.3;
  const rightKneeFlex = modelConfig.rightKnee.flexion * 0.3;
  const leftShoulderFlex = modelConfig.leftShoulder.flexion * 0.2;
  const rightShoulderFlex = modelConfig.rightShoulder.flexion * 0.2;
  const leftShoulderAbd = modelConfig.leftShoulder.abduction * 0.15;
  const rightShoulderAbd = modelConfig.rightShoulder.abduction * 0.15;
  const leftElbowFlex = modelConfig.leftElbow.flexion * 0.2;
  const rightElbowFlex = modelConfig.rightElbow.flexion * 0.2;
  const leftHipAbd = modelConfig.leftHip.abduction * 0.2;
  const rightHipAbd = modelConfig.rightHip.abduction * 0.2;
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg relative overflow-hidden">
      <svg viewBox="0 0 200 400" className="w-full h-full max-h-[480px]" style={{ maxWidth: '260px' }}>
        <defs>
          <linearGradient id="boneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        <circle cx="100" cy="35" r="16" fill="none" stroke="url(#boneGradient)" strokeWidth="3" />
        <ellipse cx="100" cy="35" rx="10" ry="12" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
        
        <path 
          d={`M100,51 Q${100 + spineOffset * 0.3},75 ${100 + spineOffset * 0.5},100 Q${100 + spineOffset * 0.3},130 100,160`} 
          stroke="url(#boneGradient)" strokeWidth="4" fill="none" strokeLinecap="round"
        />
        
        <line x1="65" y1="70" x2="135" y2="70" stroke="url(#boneGradient)" strokeWidth="3" strokeLinecap="round" />
        
        <g>
          <line 
            x1="65" y1="70" 
            x2={45 - leftShoulderAbd * 0.4 - leftShoulderFlex * 0.2} 
            y2={105 + leftShoulderFlex * 0.4 - leftShoulderAbd * 0.2} 
            stroke="url(#boneGradient)" strokeWidth="2.5" strokeLinecap="round"
          />
          <line 
            x1={45 - leftShoulderAbd * 0.4 - leftShoulderFlex * 0.2} 
            y1={105 + leftShoulderFlex * 0.4 - leftShoulderAbd * 0.2} 
            x2={35 - leftShoulderAbd * 0.3 - leftElbowFlex * 0.15} 
            y2={145 + leftElbowFlex * 0.25 - leftShoulderAbd * 0.15} 
            stroke="url(#boneGradient)" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx={35 - leftShoulderAbd * 0.3 - leftElbowFlex * 0.15} cy={145 + leftElbowFlex * 0.25 - leftShoulderAbd * 0.15} r="3" fill="#fbbf24" />
        </g>
        
        <g>
          <line 
            x1="135" y1="70" 
            x2={155 + rightShoulderAbd * 0.4 + rightShoulderFlex * 0.2} 
            y2={105 + rightShoulderFlex * 0.4 - rightShoulderAbd * 0.2} 
            stroke="url(#boneGradient)" strokeWidth="2.5" strokeLinecap="round"
          />
          <line 
            x1={155 + rightShoulderAbd * 0.4 + rightShoulderFlex * 0.2} 
            y1={105 + rightShoulderFlex * 0.4 - rightShoulderAbd * 0.2} 
            x2={165 + rightShoulderAbd * 0.3 + rightElbowFlex * 0.15} 
            y2={145 + rightElbowFlex * 0.25 - rightShoulderAbd * 0.15} 
            stroke="url(#boneGradient)" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx={165 + rightShoulderAbd * 0.3 + rightElbowFlex * 0.15} cy={145 + rightElbowFlex * 0.25 - rightShoulderAbd * 0.15} r="3" fill="#fbbf24" />
        </g>
        
        <path 
          d={`M${75 - pelvisTilt * 0.15},${165 + pelvisTilt * 0.2} Q100,${175 + Math.abs(pelvisTilt) * 0.1} ${125 + pelvisTilt * 0.15},${165 - pelvisTilt * 0.2}`}
          stroke="url(#boneGradient)" strokeWidth="4" fill="none" strokeLinecap="round"
        />
        
        <g>
          <line 
            x1={82 - leftHipAbd * 0.3} y1="175" 
            x2={72 - leftHipFlex * 0.15 - leftHipAbd * 0.5} 
            y2={240 + leftHipFlex * 0.35} 
            stroke="url(#boneGradient)" strokeWidth="3" strokeLinecap="round"
          />
          <line 
            x1={72 - leftHipFlex * 0.15 - leftHipAbd * 0.5} 
            y1={240 + leftHipFlex * 0.35} 
            x2={68 - leftKneeFlex * 0.1 - leftHipAbd * 0.4} 
            y2={315 + leftKneeFlex * 0.25} 
            stroke="url(#boneGradient)" strokeWidth="2.5" strokeLinecap="round"
          />
          <ellipse 
            cx={65 - leftHipAbd * 0.35} 
            cy={330 + leftKneeFlex * 0.2} 
            rx="8" ry="4" 
            fill="#dbeafe" stroke="url(#boneGradient)" strokeWidth="1.5"
          />
        </g>
        
        <g>
          <line 
            x1={118 + rightHipAbd * 0.3} y1="175" 
            x2={128 + rightHipFlex * 0.15 + rightHipAbd * 0.5} 
            y2={240 + rightHipFlex * 0.35} 
            stroke="url(#boneGradient)" strokeWidth="3" strokeLinecap="round"
          />
          <line 
            x1={128 + rightHipFlex * 0.15 + rightHipAbd * 0.5} 
            y1={240 + rightHipFlex * 0.35} 
            x2={132 + rightKneeFlex * 0.1 + rightHipAbd * 0.4} 
            y2={315 + rightKneeFlex * 0.25} 
            stroke="url(#boneGradient)" strokeWidth="2.5" strokeLinecap="round"
          />
          <ellipse 
            cx={135 + rightHipAbd * 0.35} 
            cy={330 + rightKneeFlex * 0.2} 
            rx="8" ry="4" 
            fill="#dbeafe" stroke="url(#boneGradient)" strokeWidth="1.5"
          />
        </g>
        
        <circle cx="65" cy="70" r="5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
        <circle cx="135" cy="70" r="5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
        <circle cx={45 - leftShoulderAbd * 0.4 - leftShoulderFlex * 0.2} cy={105 + leftShoulderFlex * 0.4 - leftShoulderAbd * 0.2} r="4" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <circle cx={155 + rightShoulderAbd * 0.4 + rightShoulderFlex * 0.2} cy={105 + rightShoulderFlex * 0.4 - rightShoulderAbd * 0.2} r="4" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <circle cx={82 - leftHipAbd * 0.3} cy="175" r="5" fill="#10b981" stroke="#059669" strokeWidth="1" />
        <circle cx={118 + rightHipAbd * 0.3} cy="175" r="5" fill="#10b981" stroke="#059669" strokeWidth="1" />
        <circle cx={72 - leftHipFlex * 0.15 - leftHipAbd * 0.5} cy={240 + leftHipFlex * 0.35} r="4" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
        <circle cx={128 + rightHipFlex * 0.15 + rightHipAbd * 0.5} cy={240 + rightHipFlex * 0.35} r="4" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
      </svg>
      <div className="absolute bottom-3 left-3 text-xs text-slate-600 bg-white/90 px-3 py-1.5 rounded-md shadow-sm">
        Interactive Skeleton - Move sliders to adjust
      </div>
    </div>
  );
}

export default function TestSkeletonNew() {
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const presentationId = searchParams.get('presentationId');
  
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean | null>(null);
  const [loadedPresentationId, setLoadedPresentationId] = useState<number | null>(null);
  const [presentationSummary, setPresentationSummary] = useState<string | null>(null);
  
  const [linkedSides, setLinkedSides] = useState({
    hips: false,
    knees: false,
    ankles: false,
    shoulders: false,
    elbows: false,
  });

  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentMovement: null,
    progress: 0,
    speed: 1,
  });

  const [forceVisualization, setForceVisualization] = useState({
    showForceArrows: false,
    showStressColors: false,
    showMuscleGlow: false,
  });

  const [muscleVisibility, setMuscleVisibility] = useState({
    enabled: false,
    quadriceps: true,
    hamstrings: true,
    adductors: true,
    calf: true,
    shin: true,
    lateral: true,
    other: true,
    showLabels: false,
  });

  const [muscleLayerVisibility, setMuscleLayerVisibility] = useState({
    enabled: false,
    layers: { muscular_system: true } as { [key: string]: boolean },
    opacity: 0.85,
  });
  
  const [multiViewMode, setMultiViewMode] = useState(false);
  const [showPatientClonePanel, setShowPatientClonePanel] = useState(false);
  const [showConstraintsPanel, setShowConstraintsPanel] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [activeJointGroup, setActiveJointGroup] = useState<JointGroup>(null);
  const [showJointZoom, setShowJointZoom] = useState(true);
  const [showMuscleLayer, setShowMuscleLayer] = useState(true);
  const [individualMuscleVisibility, setIndividualMuscleVisibility] = useState<{ [groupId: string]: boolean }>({});
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<string[]>([]);
  const [showMusclePanel, setShowMusclePanel] = useState(false);
  const [muscleOverrides, setMuscleOverrides] = useState<{ [muscleId: string]: MuscleOverride }>({});
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null);
  const [bidirectionalMode, setBidirectionalMode] = useState(true);
  const [livePose, setLivePose] = useState<Skeleton3DPose | null>(null);
  const [zoomToRegion, setZoomToRegion] = useState<AnatomicalRegion | null>(null);
  const [jointConstraints, setJointConstraints] = useState<JointConstraint[]>([]);
  const [showChainVisualization, setShowChainVisualization] = useState(false);
  const [activeChainIds, setActiveChainIds] = useState<string[]>(() => MYOFASCIAL_CHAINS.map(c => c.id));
  const [showScarPanel, setShowScarPanel] = useState(false);
  const [scarMarkers, setScarMarkers] = useState<ScarMarker[]>([]);
  const [adhesionBands, setAdhesionBands] = useState<AdhesionBand[]>([]);
  const [editingScar, setEditingScar] = useState<string | null>(null);
  const [scarPlacementMode, setScarPlacementMode] = useState<ScarType | null>(null);
  const [adhesionPlacementStep, setAdhesionPlacementStep] = useState<'idle' | 'start' | 'end'>('idle');
  const [pendingAdhesionStart, setPendingAdhesionStart] = useState<{ position: { x: number; y: number; z: number }; bone: string } | null>(null);
  
  // Clinical Assessment State
  const [clinicalIntakeData, setClinicalIntakeData] = useState<ClinicalIntakeData | null>(null);
  const [movementAnalysis, setMovementAnalysis] = useState<MovementAnalysisResult | null>(null);
  const [clinicalAssessment, setClinicalAssessment] = useState<any>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const patternRecognizerRef = useRef<MovementPatternRecognizer>(new MovementPatternRecognizer());
  const staticPostureAnalyzerRef = useRef<StaticPostureAnalyzer>(new StaticPostureAnalyzer());
  
  // Save/Load skeleton state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const queryClient = useQueryClient();
  
  // Fetch saved skeletons
  const { data: savedSkeletons = [], isLoading: isLoadingSavedSkeletons } = useQuery<any[]>({
    queryKey: ['/api/saved-skeletons'],
  });
  
  // Save skeleton mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest('/api/saved-skeletons', 'POST', {
        name: data.name,
        description: data.description,
        jointConstraints,
        modelConfig,
        affectedRegions: null,
        clinicalSummary: presentationSummary,
        patientPresentationId: loadedPresentationId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-skeletons'] });
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      toast({
        title: "Skeleton Saved",
        description: "Your skeleton configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save skeleton configuration",
        variant: "destructive",
      });
    },
  });
  
  // Delete skeleton mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/saved-skeletons/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-skeletons'] });
      toast({
        title: "Deleted",
        description: "Saved skeleton configuration has been deleted.",
      });
    },
  });
  
  // Load saved skeleton
  const loadSavedSkeleton = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/saved-skeletons/${id}`);
      if (!response.ok) throw new Error('Failed to load skeleton');
      
      const saved = await response.json();
      
      if (saved.jointConstraints) {
        setJointConstraints(saved.jointConstraints.map((c: any, index: number) => ({
          ...c,
          id: `saved-${id}-${index}`,
        })));
        setShowConstraintsPanel(true);
      }
      
      if (saved.modelConfig) {
        setModelConfig((prev: any) => ({ ...prev, ...saved.modelConfig }));
      }
      
      if (saved.clinicalSummary) {
        setPresentationSummary(saved.clinicalSummary);
      }
      
      if (saved.patientPresentationId) {
        setLoadedPresentationId(saved.patientPresentationId);
      }
      
      setLoadDialogOpen(false);
      toast({
        title: "Skeleton Loaded",
        description: `Loaded "${saved.name}" configuration`,
      });
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Could not load saved skeleton",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const compensationResult = useMemo(() => 
    calculateCompensations(jointConstraints), 
    [jointConstraints]
  );

  // Update movement analysis when live pose changes
  useEffect(() => {
    if (livePose && showCameraCapture) {
      patternRecognizerRef.current.addPose(livePose);
      const analysis = patternRecognizerRef.current.analyze(livePose);
      setMovementAnalysis(analysis);
    }
  }, [livePose, showCameraCapture]);

  // Generate clinical assessment with research evidence
  const generateClinicalAssessment = useCallback(async () => {
    if (!movementAnalysis) {
      toast({
        title: "No Movement Data",
        description: "Please capture some movement data first by using the camera.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAssessment(true);
    try {
      const response = await apiRequest('/api/movement/clinical-assessment', 'POST', {
        intakeData: clinicalIntakeData,
        movementData: {
          patterns: movementAnalysis.patterns,
          asymmetries: movementAnalysis.asymmetries,
          compensations: movementAnalysis.compensations,
          overallMovementQuality: movementAnalysis.overallMovementQuality,
          primaryImpairments: movementAnalysis.primaryImpairments,
          clinicalHypotheses: movementAnalysis.clinicalHypotheses,
          recommendedFocus: movementAnalysis.recommendedFocus,
          peakAngles: patternRecognizerRef.current.getPeakValues(),
        },
      });

      if (response.success) {
        setClinicalAssessment(response.assessment);
        toast({
          title: "Assessment Generated",
          description: "Clinical assessment with research evidence is ready.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Assessment Failed",
        description: error.message || "Could not generate clinical assessment",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAssessment(false);
    }
  }, [movementAnalysis, clinicalIntakeData, toast]);

  // Fetch patient presentation data when presentationId is in URL
  useEffect(() => {
    const fetchPresentation = async () => {
      if (!presentationId || loadedPresentationId === parseInt(presentationId)) {
        return;
      }
      
      try {
        const response = await fetch(`/api/patient-presentations/${presentationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch presentation');
        }
        
        const presentation = await response.json();
        console.log('Loaded patient presentation:', presentation);
        
        // Apply joint constraints from presentation
        if (presentation.jointConstraints && Array.isArray(presentation.jointConstraints)) {
          const constraints: JointConstraint[] = presentation.jointConstraints.map((c: any, index: number) => ({
            id: `presentation-${presentationId}-${index}`,
            joint: c.joint,
            movement: c.movement,
            maxROM: c.maxROM,
            normalROM: c.normalROM,
            reason: c.reason,
            painLevel: c.painLevel || 0,
            isActive: c.isActive !== false,
          }));
          
          setJointConstraints(constraints);
          setShowConstraintsPanel(true);
        }
        
        setLoadedPresentationId(parseInt(presentationId));
        setPresentationSummary(presentation.clinicalSummary || null);
        
        toast({
          title: "Patient Loaded",
          description: `Loaded ${presentation.jointConstraints?.length || 0} movement restrictions from SOAP note`,
          duration: 4000,
        });
      } catch (error) {
        console.error('Error loading presentation:', error);
        toast({
          title: "Load Failed",
          description: "Could not load patient data from SOAP note",
          variant: "destructive",
        });
      }
    };
    
    fetchPresentation();
  }, [presentationId, loadedPresentationId, toast]);

  const [patientAnthropometrics, setPatientAnthropometrics] = useState({
    heightCm: 175,
    weightKg: 75,
  });

  const handlePatientCloneUpdate = useCallback((cloneState: PatientCloneState) => {
    // Merge with defaults to ensure all required properties exist (including new scapula properties)
    setModelConfig(prev => ({
      ...prev,
      ...cloneState.modelConfig,
      leftScapula: (cloneState.modelConfig as any).leftScapula || prev.leftScapula,
      rightScapula: (cloneState.modelConfig as any).rightScapula || prev.rightScapula,
    }));
    if (cloneState.biomechanicsData && cloneState.biomechanicsData.anthropometrics) {
      setPatientAnthropometrics({
        heightCm: cloneState.biomechanicsData.anthropometrics.heightCm,
        weightKg: cloneState.biomechanicsData.anthropometrics.weightKg,
      });
    }
    console.log('Patient clone applied:', {
      hasModelConfig: !!cloneState.modelConfig,
      hasBiomechanics: !!cloneState.biomechanicsData,
      hasClinicalModifiers: !!cloneState.clinicalModifiers,
      hasCapturedAngles: !!cloneState.capturedAngles,
    });
  }, []);

  const handleAnimationFrame = useCallback((jointValues: { [key: string]: { [prop: string]: number } }) => {
    // Only update modelConfig when an animation is actively playing
    // This prevents the GLB bind pose from overwriting neutral defaults on initial load
    if (!animationState.isPlaying) return;
    
    setModelConfig((prev) => {
      const newConfig = { ...prev };
      
      Object.entries(jointValues).forEach(([joint, props]) => {
        if (joint in newConfig) {
          const jointConfig = newConfig[joint as keyof typeof newConfig];
          if (typeof jointConfig === 'object' && jointConfig !== null) {
            Object.entries(props).forEach(([prop, value]) => {
              if (prop in jointConfig) {
                (jointConfig as any)[prop] = value;
              }
            });
          }
        }
      });
      
      return newConfig;
    });
  }, [animationState.isPlaying]);

  const [modelConfig, setModelConfig] = useState({
    limbScales: {
      upperArm: 1.0,
      forearm: 1.0,
      thigh: 1.0,
      shin: 1.0,
      overall: 1.0,
    },
    spine: {
      cervicalLordosis: 0,
      thoracicKyphosis: 0,
      lumbarLordosis: 0,
      scoliosis: 0,
      forwardHead: 0,
      lateralShift: 0,
      cervicalRotation: 0,
      cervicalLateralFlexion: 0,
      thoracicRotation: 0,
      lumbarRotation: 0,
    },
    neck: {
      flexion: 0,
      extension: 0,
      rotation: 0,
      lateralFlexion: 0,
      forwardHead: 0,
    },
    pelvis: {
      tilt: 0,
      obliquity: 0,
      rotation: 0,
      drop: 0,
    },
    leftHip: {
      flexion: 0,
      extension: 0,
      abduction: 0,
      internalRotation: 0,
      anteversion: 0,
      neckShaftAngle: 0,
    },
    rightHip: {
      flexion: 0,
      extension: 0,
      abduction: 0,
      internalRotation: 0,
      anteversion: 0,
      neckShaftAngle: 0,
    },
    leftKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      recurvatum: 0,
      tibialSlope: 0,
      patellaAlta: 0,
    },
    rightKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      recurvatum: 0,
      tibialSlope: 0,
      patellaAlta: 0,
    },
    leftAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
    },
    rightAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
    },
    leftShoulder: {
      flexion: -75,
      abduction: -31,
      internalRotation: 0,
      externalRotation: 27,
      retroversion: -1,
      elevation: 1,
      protraction: 0,
      winging: 0,
      clavicleLength: 0,
    },
    rightShoulder: {
      flexion: 75,
      abduction: -30,
      internalRotation: 0,
      externalRotation: -27,
      retroversion: -1,
      elevation: -10,
      protraction: 0,
      winging: 0,
      clavicleLength: 0,
    },
    leftScapula: {
      protraction: 0,
      retraction: 0,
      elevation: 0,
      depression: 0,
      upwardRotation: 0,
      downwardRotation: 0,
      anteriorTilt: 0,
      posteriorTilt: 0,
      winging: 0,
      clavicleRotation: 0,
    },
    rightScapula: {
      protraction: 0,
      retraction: 0,
      elevation: 0,
      depression: 0,
      upwardRotation: 0,
      downwardRotation: 0,
      anteriorTilt: 0,
      posteriorTilt: 0,
      winging: 0,
      clavicleRotation: 0,
    },
    leftElbow: {
      flexion: 0,
      carryingAngle: 0,
      pronation: 0,
    },
    rightElbow: {
      flexion: 0,
      carryingAngle: 0,
      pronation: 0,
    },
    leftWrist: {
      deviation: 0,
      flexion: 0,
    },
    rightWrist: {
      deviation: 0,
      flexion: 0,
    },
  });

  // Generate clinical assessment from static posture (slider values)
  const generateStaticPostureAssessment = useCallback(async () => {
    setIsGeneratingAssessment(true);
    try {
      const staticInput = {
        modelConfig: {
          spine: {
            lordosis: modelConfig.spine.lumbarLordosis,
            kyphosis: modelConfig.spine.thoracicKyphosis,
            scoliosis: modelConfig.spine.scoliosis,
            cervicalFlexion: modelConfig.spine.forwardHead,
            cervicalLateralFlexion: modelConfig.spine.cervicalLateralFlexion,
          },
          pelvis: modelConfig.pelvis,
          leftHip: modelConfig.leftHip,
          rightHip: modelConfig.rightHip,
          leftKnee: {
            valgus: modelConfig.leftKnee.varus,
            recurvatum: modelConfig.leftKnee.recurvatum,
            tibialTorsion: modelConfig.leftKnee.tibialTorsion,
            tibialSlope: modelConfig.leftKnee.tibialSlope,
          },
          rightKnee: {
            valgus: modelConfig.rightKnee.varus,
            recurvatum: modelConfig.rightKnee.recurvatum,
            tibialTorsion: modelConfig.rightKnee.tibialTorsion,
            tibialSlope: modelConfig.rightKnee.tibialSlope,
          },
          leftAnkle: modelConfig.leftAnkle,
          rightAnkle: modelConfig.rightAnkle,
        },
        jointConstraints,
      };

      const analysis = staticPostureAnalyzerRef.current.analyze(staticInput);
      const peakAngles = staticPostureAnalyzerRef.current.getPeakAnglesFromConfig(staticInput.modelConfig);

      const response = await apiRequest('/api/movement/clinical-assessment', 'POST', {
        intakeData: clinicalIntakeData,
        movementData: {
          patterns: analysis.patterns,
          asymmetries: analysis.asymmetries,
          compensations: analysis.compensations,
          overallMovementQuality: analysis.overallMovementQuality,
          primaryImpairments: analysis.primaryImpairments,
          clinicalHypotheses: analysis.clinicalHypotheses,
          recommendedFocus: analysis.recommendedFocus,
          peakAngles,
          source: 'static_posture',
        },
      });

      if (response.success) {
        setClinicalAssessment(response.assessment);
        setMovementAnalysis(analysis);
        toast({
          title: "Posture Assessment Generated",
          description: "Clinical assessment based on current skeleton configuration is ready.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Assessment Failed",
        description: error.message || "Could not generate posture assessment",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAssessment(false);
    }
  }, [modelConfig, jointConstraints, clinicalIntakeData, toast]);

  useEffect(() => {
    // Check for WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setIsWebGLAvailable(!!gl);
  }, []);

  const handleSliderChange = (joint: string, property: string, value: number[]) => {
    setModelConfig((prev) => ({
      ...prev,
      [joint]: {
        ...prev[joint as keyof typeof prev],
        [property]: value[0],
      },
    }));
    const jointGroup = joint as JointGroup;
    if (jointGroup && jointGroup !== activeJointGroup) {
      setActiveJointGroup(jointGroup);
    }
  };

  // Compute biomechanics data for force visualization
  const biomechanicsData = useMemo((): BiomechanicsVisualizationData | undefined => {
    const { showForceArrows, showStressColors, showMuscleGlow } = forceVisualization;
    
    // Only compute if at least one visualization is enabled
    if (!showForceArrows && !showStressColors && !showMuscleGlow) {
      return undefined;
    }

    // Compute biomechanics based on current posture
    const biomechanics = calculateFullBiomechanics(
      patientAnthropometrics.heightCm,
      patientAnthropometrics.weightKg,
      {
        pelvis: {
          tilt: modelConfig.pelvis.tilt,
          obliquity: modelConfig.pelvis.obliquity,
          rotation: modelConfig.pelvis.rotation,
          drop: modelConfig.pelvis.drop,
        },
        spine: {
          thoracicKyphosis: modelConfig.spine.thoracicKyphosis,
          lumbarLordosis: modelConfig.spine.lumbarLordosis,
          scoliosis: modelConfig.spine.scoliosis,
        },
        leftHip: {
          flexion: modelConfig.leftHip.flexion,
          abduction: modelConfig.leftHip.abduction,
          internalRotation: modelConfig.leftHip.internalRotation,
        },
        rightHip: {
          flexion: modelConfig.rightHip.flexion,
          abduction: modelConfig.rightHip.abduction,
          internalRotation: modelConfig.rightHip.internalRotation,
        },
        leftKnee: {
          flexion: modelConfig.leftKnee.flexion,
          varus: modelConfig.leftKnee.varus,
        },
        rightKnee: {
          flexion: modelConfig.rightKnee.flexion,
          varus: modelConfig.rightKnee.varus,
        },
        leftAnkle: {
          dorsiflexion: modelConfig.leftAnkle.dorsiflexion,
          inversion: modelConfig.leftAnkle.inversion,
        },
        rightAnkle: {
          dorsiflexion: modelConfig.rightAnkle.dorsiflexion,
          inversion: modelConfig.rightAnkle.inversion,
        },
        leftShoulder: {
          flexion: modelConfig.leftShoulder.flexion,
          abduction: modelConfig.leftShoulder.abduction,
          internalRotation: modelConfig.leftShoulder.internalRotation,
        },
        rightShoulder: {
          flexion: modelConfig.rightShoulder.flexion,
          abduction: modelConfig.rightShoulder.abduction,
          internalRotation: modelConfig.rightShoulder.internalRotation,
        },
        leftElbow: {
          flexion: modelConfig.leftElbow.flexion,
          pronation: modelConfig.leftElbow.pronation,
        },
        rightElbow: {
          flexion: modelConfig.rightElbow.flexion,
          pronation: modelConfig.rightElbow.pronation,
        },
      }
    );

    return {
      jointForces: biomechanics.jointForces,
      muscleActivation: biomechanics.muscleActivation,
      showForceArrows,
      showStressColors,
      showMuscleGlow,
    };
  }, [modelConfig, forceVisualization, patientAnthropometrics]);

  const bidirectionalResult = useMemo<BidirectionalResult | null>(() => {
    if (!bidirectionalMode) return null;
    const hasManualOverrides = Object.values(muscleOverrides).some(o => o.isManual);
    if (!hasManualOverrides) return null;
    return computeBidirectionalEffects(muscleOverrides, modelConfig);
  }, [muscleOverrides, bidirectionalMode, modelConfig]);

  const effectiveModelConfig = useMemo(() => {
    if (!bidirectionalResult) return modelConfig;
    return applyBidirectionalToModelConfig(modelConfig, bidirectionalResult);
  }, [modelConfig, bidirectionalResult]);

  const effectiveOverrides = useMemo(() => {
    if (!bidirectionalResult) return muscleOverrides;
    return mergeReciprocalInhibitions(muscleOverrides, bidirectionalResult.reciprocalInhibitions);
  }, [muscleOverrides, bidirectionalResult]);

  const muscleDrivenJoints = useMemo(() => {
    return bidirectionalResult?.muscleDrivenJoints ?? new Set<string>();
  }, [bidirectionalResult]);

  const baseMuscleTensions = useMemo(() => {
    const base = computeAllMuscleStates(effectiveModelConfig);
    const tensions: { [id: string]: number } = {};
    Object.entries(base).forEach(([id, s]) => { tensions[id] = s.tension; });
    return { baseStates: base, tensions };
  }, [effectiveModelConfig]);

  const chainPropagation = useMemo(() => {
    return propagateChainEffects(baseMuscleTensions.tensions, effectiveOverrides);
  }, [baseMuscleTensions.tensions, effectiveOverrides]);

  const muscleStates = useMemo(() => {
    return applyOverridesAndChains(baseMuscleTensions.baseStates, effectiveOverrides, chainPropagation);
  }, [baseMuscleTensions.baseStates, effectiveOverrides, chainPropagation]);

  const wholeBodyScore = useMemo(() => {
    return computeWholeBodyTensionScore(baseMuscleTensions.tensions, effectiveOverrides);
  }, [baseMuscleTensions.tensions, effectiveOverrides]);

  const fascialChainVizProp = useMemo(() => {
    if (!showChainVisualization) return undefined;
    return {
      enabled: true,
      chains: MYOFASCIAL_CHAINS,
      tensions: baseMuscleTensions.tensions,
      activeChains: activeChainIds,
    };
  }, [showChainVisualization, baseMuscleTensions.tensions, activeChainIds]);

  const getMuscleDrivenDelta = useCallback((joint: string, param: string): number | null => {
    if (!bidirectionalResult) return null;
    const adj = bidirectionalResult.jointAdjustments[joint]?.[param] ?? 0;
    const coup = bidirectionalResult.couplingEffects[joint]?.[param] ?? 0;
    const total = adj + coup;
    if (Math.abs(total) < 0.5) return null;
    return Math.round(total);
  }, [bidirectionalResult]);

  const jointLabel = useCallback((label: string, joint: string, param: string, baseValue: number): string => {
    const delta = getMuscleDrivenDelta(joint, param);
    if (delta === null) return `${label} (${baseValue}°)`;
    const effectiveVal = Math.round((effectiveModelConfig as any)[joint]?.[param] ?? baseValue);
    return `${label} (${baseValue}° → ${effectiveVal}°)`;
  }, [getMuscleDrivenDelta, effectiveModelConfig]);

  const resetAll = () => {
    setModelConfig({
      limbScales: {
        upperArm: 1.0,
        forearm: 1.0,
        thigh: 1.0,
        shin: 1.0,
        overall: 1.0,
      },
      spine: {
        cervicalLordosis: 0,
        thoracicKyphosis: 0,
        lumbarLordosis: 0,
        scoliosis: 0,
        forwardHead: 0,
        lateralShift: 0,
        cervicalRotation: 0,
        cervicalLateralFlexion: 0,
        thoracicRotation: 0,
        lumbarRotation: 0,
      },
      neck: {
        flexion: 0,
        extension: 0,
        rotation: 0,
        lateralFlexion: 0,
        forwardHead: 0,
      },
      pelvis: {
        tilt: 0,
        obliquity: 0,
        rotation: 0,
        drop: 0,
      },
      leftHip: {
        flexion: 0,
        extension: 0,
        abduction: 0,
        internalRotation: 0,
        anteversion: 0,
        neckShaftAngle: 0,
      },
      rightHip: {
        flexion: 0,
        extension: 0,
        abduction: 0,
        internalRotation: 0,
        anteversion: 0,
        neckShaftAngle: 0,
      },
      leftKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        recurvatum: 0,
        tibialSlope: 0,
        patellaAlta: 0,
      },
      rightKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        recurvatum: 0,
        tibialSlope: 0,
        patellaAlta: 0,
      },
      leftAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
      },
      rightAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
      },
      leftShoulder: {
        flexion: -75,
        abduction: -31,
        internalRotation: 0,
        externalRotation: 27,
        retroversion: -1,
        elevation: 1,
        protraction: 0,
        winging: 0,
        clavicleLength: 0,
      },
      rightShoulder: {
        flexion: 75,
        abduction: -30,
        internalRotation: 0,
        externalRotation: -27,
        retroversion: -1,
        elevation: -10,
        protraction: 0,
        winging: 0,
        clavicleLength: 0,
      },
      leftScapula: {
        protraction: 0,
        retraction: 0,
        elevation: 0,
        depression: 0,
        upwardRotation: 0,
        downwardRotation: 0,
        anteriorTilt: 0,
        posteriorTilt: 0,
        winging: 0,
        clavicleRotation: 0,
      },
      rightScapula: {
        protraction: 0,
        retraction: 0,
        elevation: 0,
        depression: 0,
        upwardRotation: 0,
        downwardRotation: 0,
        anteriorTilt: 0,
        posteriorTilt: 0,
        winging: 0,
        clavicleRotation: 0,
      },
      leftElbow: {
        flexion: 0,
        carryingAngle: 0,
        pronation: 0,
      },
      rightElbow: {
        flexion: 0,
        carryingAngle: 0,
        pronation: 0,
      },
      leftWrist: {
        deviation: 0,
        flexion: 0,
      },
      rightWrist: {
        deviation: 0,
        flexion: 0,
      },
    });
    setLinkedSides({
      hips: false,
      knees: false,
      ankles: false,
      shoulders: false,
      elbows: false,
    });
    setMuscleOverrides({});
    setExpandedMuscle(null);
  };

  const copyToSide = (fromSide: 'left' | 'right', joint: string) => {
    const fromJoint = `${fromSide}${joint}`;
    const toJoint = `${fromSide === 'left' ? 'right' : 'left'}${joint}`;
    
    setModelConfig((prev) => ({
      ...prev,
      [toJoint]: { ...prev[fromJoint as keyof typeof prev] },
    }));
  };

  // Display a skeleton SVG visualization instead of 3D when WebGL is not available
  const SkeletonVisualization = () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
      <svg
        viewBox="0 0 200 400"
        className="w-full h-full max-h-[500px]"
        style={{ maxWidth: '250px' }}
      >
        {/* Head */}
        <circle cx="100" cy="40" r="20" fill="none" stroke="#4B5563" strokeWidth="2" />
        
        {/* Spine */}
        <line x1="100" y1="60" x2="100" y2="180" stroke="#4B5563" strokeWidth="3" />
        
        {/* Shoulders */}
        <line x1="70" y1="80" x2="130" y2="80" stroke="#4B5563" strokeWidth="2" />
        
        {/* Left Arm */}
        <line x1="70" y1="80" x2="50" y2="120" stroke="#4B5563" strokeWidth="2" />
        <line x1="50" y1="120" x2="40" y2="160" stroke="#4B5563" strokeWidth="2" />
        
        {/* Right Arm */}
        <line x1="130" y1="80" x2="150" y2="120" stroke="#4B5563" strokeWidth="2" />
        <line x1="150" y1="120" x2="160" y2="160" stroke="#4B5563" strokeWidth="2" />
        
        {/* Pelvis */}
        <line x1="80" y1="180" x2="120" y2="180" stroke="#4B5563" strokeWidth="3" />
        
        {/* Left Leg */}
        <line x1="85" y1="180" x2="75" y2="250" stroke="#4B5563" strokeWidth="2" />
        <line x1="75" y1="250" x2="70" y2="330" stroke="#4B5563" strokeWidth="2" />
        <line x1="70" y1="330" x2="60" y2="340" stroke="#4B5563" strokeWidth="2" />
        
        {/* Right Leg */}
        <line x1="115" y1="180" x2="125" y2="250" stroke="#4B5563" strokeWidth="2" />
        <line x1="125" y1="250" x2="130" y2="330" stroke="#4B5563" strokeWidth="2" />
        <line x1="130" y1="330" x2="140" y2="340" stroke="#4B5563" strokeWidth="2" />
        
        {/* Joint markers */}
        {/* Shoulders */}
        <circle cx="70" cy="80" r="4" fill="#EF4444" />
        <circle cx="130" cy="80" r="4" fill="#EF4444" />
        
        {/* Elbows */}
        <circle cx="50" cy="120" r="4" fill="#F59E0B" />
        <circle cx="150" cy="120" r="4" fill="#F59E0B" />
        
        {/* Hips */}
        <circle cx="85" cy="180" r="4" fill="#10B981" />
        <circle cx="115" cy="180" r="4" fill="#10B981" />
        
        {/* Knees */}
        <circle cx="75" cy="250" r="4" fill="#3B82F6" />
        <circle cx="125" cy="250" r="4" fill="#3B82F6" />
        
        {/* Ankles */}
        <circle cx="70" cy="330" r="4" fill="#8B5CF6" />
        <circle cx="130" cy="330" r="4" fill="#8B5CF6" />
      </svg>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Skeleton Configuration Tool</h1>
            <p className="text-muted-foreground">
              Adjust anatomical parameters to create custom skeletal configurations for clinical assessment
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Save Skeleton Button */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="btn-save-skeleton">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Skeleton Configuration</DialogTitle>
                  <DialogDescription>
                    Save the current skeleton state for future use. Give it a descriptive name.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="save-name">Name</Label>
                    <Input
                      id="save-name"
                      placeholder="e.g., Frozen Shoulder Case"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      data-testid="input-save-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="save-description">Description (optional)</Label>
                    <Input
                      id="save-description"
                      placeholder="Brief description..."
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      data-testid="input-save-description"
                    />
                  </div>
                  {loadedPresentationId && (
                    <p className="text-sm text-muted-foreground">
                      This will be linked to the current patient presentation.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => saveMutation.mutate({ name: saveName, description: saveDescription })}
                    disabled={!saveName.trim() || saveMutation.isPending}
                    data-testid="btn-confirm-save"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Configuration
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Load Skeleton Button */}
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="btn-load-skeleton">
                  <FolderOpen className="h-4 w-4" />
                  Load
                  {savedSkeletons.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{savedSkeletons.length}</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Load Saved Skeleton</DialogTitle>
                  <DialogDescription>
                    Select a previously saved skeleton configuration to load.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[400px] overflow-y-auto">
                  {isLoadingSavedSkeletons ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : savedSkeletons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No saved skeletons yet.</p>
                      <p className="text-sm">Save your first configuration using the Save button.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedSkeletons.map((skeleton: any) => (
                        <div 
                          key={skeleton.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{skeleton.name}</p>
                            {skeleton.description && (
                              <p className="text-sm text-muted-foreground truncate">{skeleton.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {skeleton.patientPresentationId && (
                                <Badge variant="outline" className="text-xs">Linked to Patient</Badge>
                              )}
                              {skeleton.jointConstraints?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {skeleton.jointConstraints.length} constraints
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(skeleton.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              size="sm"
                              onClick={() => loadSavedSkeleton(skeleton.id)}
                              data-testid={`btn-load-${skeleton.id}`}
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(skeleton.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`btn-delete-${skeleton.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* WebGL Not Available - Prominent Call to Action */}
      {isWebGLAvailable === false ? (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white text-center md:text-left">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                <AlertCircle className="h-6 w-6" />
                3D Viewer Requires New Tab
              </h2>
              <p className="text-blue-100">
                The Replit preview doesn't support 3D graphics. Click below to open the full interactive skeleton viewer.
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => window.open(window.location.href, '_blank')}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 shadow-md"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Open 3D Viewer
            </Button>
          </div>
        </div>
      ) : (
        /* Standard hint banner when WebGL works */
        <Alert className="mb-4 border-blue-500/50 bg-blue-500/10">
          <ExternalLink className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-300">Tip: Best in New Tab</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-200">
              For smoother 3D performance, consider opening in a new tab.
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(window.location.href, '_blank')}
              className="ml-4 border-blue-500 text-blue-400 hover:bg-blue-500/20"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Patient Presentation Banner - Shows when loaded from SOAP note */}
      {loadedPresentationId && presentationSummary && (
        <Alert className="mb-4 border-teal-500/50 bg-teal-500/10">
          <FileText className="h-4 w-4 text-teal-400" />
          <AlertTitle className="text-teal-300 flex items-center gap-2">
            Patient Data Loaded from SOAP Note
            <Badge variant="outline" className="border-teal-500 text-teal-400">
              {jointConstraints.length} Restrictions
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-teal-200 mt-1">
            {presentationSummary}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* 3D Skeleton Viewer - Full Width */}
        <Card style={{ height: multiViewMode ? 'auto' : '700px' }}>
          <CardHeader className="pb-2 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Skeleton Visualization</CardTitle>
              {!multiViewMode && (
                <>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="force-arrows"
                      checked={forceVisualization.showForceArrows}
                      onCheckedChange={(checked) => 
                        setForceVisualization(prev => ({ ...prev, showForceArrows: checked }))
                      }
                      data-testid="switch-force-arrows"
                    />
                    <Label htmlFor="force-arrows" className="text-xs flex items-center gap-1 cursor-pointer">
                      <ArrowDown className="h-3 w-3" />
                      Forces
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="stress-colors"
                      checked={forceVisualization.showStressColors}
                      onCheckedChange={(checked) => 
                        setForceVisualization(prev => ({ ...prev, showStressColors: checked }))
                      }
                      data-testid="switch-stress-colors"
                    />
                    <Label htmlFor="stress-colors" className="text-xs flex items-center gap-1 cursor-pointer">
                      <Target className="h-3 w-3" />
                      Stress
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="muscle-glow"
                      checked={forceVisualization.showMuscleGlow}
                      onCheckedChange={(checked) => 
                        setForceVisualization(prev => ({ ...prev, showMuscleGlow: checked }))
                      }
                      data-testid="switch-muscle-glow"
                    />
                    <Label htmlFor="muscle-glow" className="text-xs flex items-center gap-1 cursor-pointer">
                      <Zap className="h-3 w-3" />
                      Glow
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="muscle-anatomy"
                      checked={muscleVisibility.enabled}
                      onCheckedChange={(checked) => 
                        setMuscleVisibility(prev => ({ ...prev, enabled: checked }))
                      }
                      data-testid="switch-muscle-anatomy"
                    />
                    <Label htmlFor="muscle-anatomy" className="text-xs flex items-center gap-1 cursor-pointer">
                      <Activity className="h-3 w-3" />
                      Muscles
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="muscle-layer"
                      checked={muscleLayerVisibility.enabled}
                      onCheckedChange={(checked) => 
                        setMuscleLayerVisibility(prev => ({ ...prev, enabled: checked }))
                      }
                      data-testid="switch-muscle-layer"
                    />
                    <Label htmlFor="muscle-layer" className="text-xs flex items-center gap-1 cursor-pointer">
                      <Layers className="h-3 w-3" />
                      3D Muscle
                    </Label>
                  </div>
                </div>
                {muscleLayerVisibility.enabled && (
                  <div className="flex flex-wrap items-center gap-3 mt-1 p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-xs text-slate-400 font-medium">Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={muscleLayerVisibility.opacity * 100}
                      onChange={(e) => setMuscleLayerVisibility(prev => ({ 
                        ...prev, 
                        opacity: Number(e.target.value) / 100 
                      }))}
                      className="w-24 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                      data-testid="slider-muscle-opacity"
                    />
                    <span className="text-xs text-slate-300">{Math.round(muscleLayerVisibility.opacity * 100)}%</span>
                  </div>
                )}
                {muscleVisibility.enabled && (
                  <div className="flex flex-wrap items-center gap-3 mt-1 p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-xs text-slate-400 font-medium">Groups:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.quadriceps}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, quadriceps: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-quadriceps"
                      />
                      <span className="text-xs text-red-400">Quads</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.hamstrings}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, hamstrings: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-hamstrings"
                      />
                      <span className="text-xs text-blue-400">Hams</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.adductors}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, adductors: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-adductors"
                      />
                      <span className="text-xs text-green-400">Adductors</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.calf}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, calf: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-calf"
                      />
                      <span className="text-xs text-purple-400">Calf</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.shin}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, shin: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-shin"
                      />
                      <span className="text-xs text-teal-400">Shin</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.lateral}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, lateral: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-lateral"
                      />
                      <span className="text-xs text-orange-400">Lateral</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muscleVisibility.other}
                        onChange={(e) => setMuscleVisibility(prev => ({ ...prev, other: e.target.checked }))}
                        className="w-3 h-3 rounded"
                        data-testid="checkbox-other"
                      />
                      <span className="text-xs text-yellow-400">Other</span>
                    </label>
                  </div>
                )}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={multiViewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setMultiViewMode(!multiViewMode)}
                className={multiViewMode ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="toggle-multi-view"
              >
                {multiViewMode ? (
                  <><Maximize className="h-4 w-4 mr-1" /> Single View</>
                ) : (
                  <><Grid2X2 className="h-4 w-4 mr-1" /> Multi-View</>
                )}
              </Button>
              <Button
                variant={showJointZoom ? "default" : "outline"}
                size="sm"
                onClick={() => setShowJointZoom(!showJointZoom)}
                className={showJointZoom ? "bg-purple-600 hover:bg-purple-700" : ""}
                data-testid="toggle-joint-zoom"
              >
                <Target className="h-4 w-4 mr-1" />
                {showJointZoom ? "Joint Zoom On" : "Joint Zoom Off"}
              </Button>
              <Button
                variant={showPatientClonePanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPatientClonePanel(!showPatientClonePanel)}
                className={showPatientClonePanel ? "bg-blue-600 hover:bg-blue-700" : ""}
                data-testid="toggle-patient-clone"
              >
                <User className="h-4 w-4 mr-1" />
                Clone Patient
              </Button>
              <Button
                variant={showConstraintsPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowConstraintsPanel(!showConstraintsPanel)}
                className={showConstraintsPanel ? "bg-orange-600 hover:bg-orange-700" : ""}
                data-testid="toggle-constraints"
              >
                <Lock className="h-4 w-4 mr-1" />
                Constraints
                {jointConstraints.length > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">
                    {jointConstraints.length}
                  </span>
                )}
              </Button>
              <Button
                variant={showCameraCapture ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const willShow = !showCameraCapture;
                  setShowCameraCapture(willShow);
                  if (!willShow) {
                    setLivePose(null);
                  } else {
                    const zero = { x: 0, y: 0, z: 0 };
                    setLivePose({
                      spine: zero, neck: zero,
                      leftShoulder: zero, rightShoulder: zero,
                      leftElbow: zero, rightElbow: zero,
                      leftHip: zero, rightHip: zero,
                      leftKnee: zero, rightKnee: zero,
                      leftWrist: zero, rightWrist: zero,
                      leftAnkle: zero, rightAnkle: zero,
                    });
                  }
                }}
                className={showCameraCapture ? "bg-purple-600 hover:bg-purple-700" : ""}
                data-testid="toggle-camera-capture"
              >
                <Video className="h-4 w-4 mr-1" />
                Live Capture
              </Button>
              <Button
                variant={showChainVisualization ? "default" : "outline"}
                size="sm"
                onClick={() => setShowChainVisualization(!showChainVisualization)}
                className={showChainVisualization ? "bg-teal-600 hover:bg-teal-700" : ""}
              >
                <Activity className="h-4 w-4 mr-1" />
                Body Tension
              </Button>
              <Button
                variant={showScarPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowScarPanel(!showScarPanel)}
                className={showScarPanel ? "bg-pink-600 hover:bg-pink-700" : ""}
              >
                <FileText className="h-4 w-4 mr-1" />
                Scar Map
                {scarMarkers.length > 0 && (
                  <span className="ml-1 bg-pink-500 text-white text-xs rounded-full px-1.5">
                    {scarMarkers.length}
                  </span>
                )}
              </Button>
              {!multiViewMode && (
                <RegionZoomControls
                  currentRegion={zoomToRegion}
                  onRegionChange={setZoomToRegion}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className={multiViewMode ? "" : "h-[calc(100%-80px)] relative"}>
            {!multiViewMode && (
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={showMuscleLayer ? "default" : "outline"}
                    size="lg"
                    onClick={() => setShowMuscleLayer(prev => !prev)}
                    className={`shadow-lg font-semibold text-sm px-5 py-2 ${
                      showMuscleLayer 
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                        : 'bg-white/90 hover:bg-white text-gray-800 border-gray-300'
                    }`}
                    data-testid="btn-toggle-muscles"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {showMuscleLayer ? 'Hide Muscles' : 'Show Muscles'}
                  </Button>
                  {showMuscleLayer && availableMuscleGroups.length > 0 && (
                    <Button
                      variant={showMusclePanel ? "default" : "outline"}
                      size="lg"
                      onClick={() => setShowMusclePanel(prev => !prev)}
                      className={`shadow-lg font-semibold text-sm px-4 py-2 ${
                        showMusclePanel
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                          : 'bg-white/90 hover:bg-white text-gray-800 border-gray-300'
                      }`}
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      Individual
                    </Button>
                  )}
                </div>
                {showMusclePanel && showMuscleLayer && availableMuscleGroups.length > 0 && (
                  <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-700 p-3 shadow-xl max-h-[400px] overflow-y-auto w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Muscle Groups</span>
                      <div className="flex gap-1">
                        <button
                          className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20"
                          onClick={() => {
                            const allVisible: { [k: string]: boolean } = {};
                            availableMuscleGroups.forEach(id => { allVisible[id] = true; });
                            setIndividualMuscleVisibility(allVisible);
                          }}
                        >
                          All
                        </button>
                        <button
                          className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20"
                          onClick={() => {
                            const noneVisible: { [k: string]: boolean } = {};
                            availableMuscleGroups.forEach(id => { noneVisible[id] = false; });
                            setIndividualMuscleVisibility(noneVisible);
                          }}
                        >
                          None
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {availableMuscleGroups.map(groupId => {
                        const def = MUSCLE_GROUPS.find(g => g.id === groupId);
                        const label = def?.label || groupId;
                        const color = def?.color || '#888';
                        const isVisible = individualMuscleVisibility[groupId] !== false;
                        return (
                          <button
                            key={groupId}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-all ${
                              isVisible
                                ? 'bg-slate-700/60 text-white hover:bg-slate-700'
                                : 'bg-slate-800/40 text-slate-500 hover:bg-slate-800/60'
                            }`}
                            onClick={() => {
                              setIndividualMuscleVisibility(prev => ({
                                ...prev,
                                [groupId]: !isVisible,
                              }));
                            }}
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 border"
                              style={{
                                backgroundColor: isVisible ? color : 'transparent',
                                borderColor: color,
                                opacity: isVisible ? 1 : 0.4,
                              }}
                            />
                            <span className="flex-1">{label}</span>
                            {isVisible && (
                              <span className="text-[10px] text-green-400">ON</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {multiViewMode ? (
              <MultiViewSkeletonLayout
                modelPath="/models/piriformis.glb"
                modelConfig={effectiveModelConfig}
                animationState={animationState}
                onAnimationFrame={handleAnimationFrame}
                biomechanicsData={biomechanicsData}
              />
            ) : (
              <GLBErrorBoundary
                fallback={
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <ExternalLink className="h-12 w-12 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Open in New Tab for 3D</h3>
                      <p className="text-sm text-slate-400 mb-6 max-w-xs">
                        The 3D skeleton viewer needs to run in a full browser window.
                      </p>
                      <Button 
                        size="lg"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Open 3D Viewer
                      </Button>
                    </div>
                  </div>
                }
              >
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading GLB model...</span>
                  </div>
                }>
                  <PureThreeGLBViewer 
                    modelPath="/models/piriformis.glb" 
                    modelConfig={effectiveModelConfig} 
                    className="w-full h-full"
                    animationState={animationState}
                    onAnimationFrame={handleAnimationFrame}
                    biomechanicsData={biomechanicsData}
                    muscleVisibility={muscleVisibility}
                    muscleLayerVisibility={muscleLayerVisibility}
                    zoomToRegion={zoomToRegion}
                    livePose={livePose}
                    showMuscles={showMuscleLayer}
                    individualMuscleVisibility={individualMuscleVisibility}
                    onMuscleGroupsReady={(groupIds) => {
                      setAvailableMuscleGroups(groupIds);
                      const defaultVis: { [k: string]: boolean } = {};
                      groupIds.forEach(id => { defaultVis[id] = true; });
                      setIndividualMuscleVisibility(defaultVis);
                    }}
                    compensatingJoints={compensationResult.patterns.map(p => ({
                      joint: p.compensatingJoint,
                      loadIncrease: p.additionalLoad
                    }))}
                    animationConstraints={jointConstraints.filter(c => c.isActive).map(c => ({
                      joint: c.joint,
                      movement: c.movement,
                      maxROM: c.maxROM,
                      normalROM: c.normalROM
                    }))}
                    muscleStates={showMuscleLayer ? muscleStates : undefined}
                    fascialChainVisualization={fascialChainVizProp}
                    scarMarkers={scarMarkers}
                    adhesionBands={adhesionBands}
                    onScarMarkerClick={(id) => setEditingScar(id)}
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
                </Suspense>
              </GLBErrorBoundary>
            )}
          </CardContent>
        </Card>

        {/* Joint Zoom Cameras - Show when adjusting sliders */}
        {showJointZoom && activeJointGroup && (
          <div className="space-y-4">
            <JointZoomCameras
              activeJointGroup={activeJointGroup}
              modelConfig={effectiveModelConfig}
              animationState={animationState}
              onClose={() => setActiveJointGroup(null)}
            />
            {/* Clinical Controls - Shown under zoom cameras when active */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clinical Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-lg border border-green-500/20">
                  <h3 className="font-semibold mb-2 text-green-300 flex items-center gap-2 text-sm">
                    <Stethoscope className="h-4 w-4" />
                    Clinical Assessment
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">
                    Generate a clinical assessment based on the current skeleton configuration.
                  </p>
                  <Button
                    onClick={generateStaticPostureAssessment}
                    disabled={isGeneratingAssessment}
                    className="w-full"
                    variant="secondary"
                    size="sm"
                    data-testid="btn-static-posture-assessment-zoom"
                  >
                    {isGeneratingAssessment ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing Posture...</>
                    ) : (
                      <><Brain className="h-4 w-4 mr-2" />Analyze Current Posture</>
                    )}
                  </Button>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                  <h3 className="font-semibold mb-2 text-purple-300 flex items-center gap-2 text-sm">
                    <Play className="h-4 w-4" />
                    Movement Animation
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Select
                        value={animationState.currentMovement || ''}
                        onValueChange={(value) => {
                          setAnimationState(prev => ({
                            ...prev,
                            currentMovement: value || null,
                            progress: 0,
                          }));
                        }}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-movement-zoom">
                          <SelectValue placeholder="Select movement..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOVEMENT_SEQUENCES.map((seq) => (
                            <SelectItem key={seq.id} value={seq.id}>
                              {seq.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={animationState.isPlaying ? "destructive" : "default"}
                        size="sm"
                        onClick={() => {
                          if (!animationState.currentMovement) return;
                          setAnimationState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
                        }}
                        disabled={!animationState.currentMovement}
                        data-testid="button-play-pause-zoom"
                      >
                        {animationState.isPlaying ? (
                          <><Pause className="h-4 w-4 mr-1" /> Pause</>
                        ) : (
                          <><Play className="h-4 w-4 mr-1" /> Play</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAnimationState(prev => ({
                            ...prev,
                            isPlaying: false,
                            progress: 0,
                          }));
                          resetAll();
                        }}
                        data-testid="button-reset-animation-zoom"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Speed: {animationState.speed}x</Label>
                      <Slider
                        value={[animationState.speed]}
                        onValueChange={(value) => setAnimationState(prev => ({ ...prev, speed: value[0] }))}
                        min={0.25}
                        max={2}
                        step={0.25}
                        className="mt-1"
                        data-testid="slider-animation-speed-zoom"
                      />
                    </div>
                    {animationState.currentMovement && (
                      <p className="text-xs text-muted-foreground">
                        {MOVEMENT_SEQUENCES.find(s => s.id === animationState.currentMovement)?.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Patient Clone Panel - Conditionally Shown */}
        {showPatientClonePanel && (
          <PatientClonePanel
            onPatientCloneUpdate={handlePatientCloneUpdate}
            currentModelConfig={modelConfig}
          />
        )}

        {/* Joint Constraints Panel - Conditionally Shown */}
        {showConstraintsPanel && (
          <>
            <JointConstraintsCard
              constraints={jointConstraints}
              onConstraintsChange={setJointConstraints}
            />
            <DiagnosticAssessmentPanel
              constraints={jointConstraints}
              compensationResult={compensationResult}
            />
          </>
        )}

        {/* Scar Tissue Mapping Panel */}
        {showScarPanel && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-pink-400" />
                Scar Tissue & Adhesion Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCAR_TYPES) as ScarType[]).map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={scarPlacementMode === type ? "default" : "outline"}
                    onClick={() => {
                      setScarPlacementMode(scarPlacementMode === type ? null : type);
                      setAdhesionPlacementStep('idle');
                    }}
                    className={scarPlacementMode === type ? "bg-pink-600 hover:bg-pink-700" : ""}
                  >
                    <span className="mr-1">{SCAR_TYPES[type].icon}</span>
                    {SCAR_TYPES[type].label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={adhesionPlacementStep !== 'idle' ? "default" : "outline"}
                  onClick={() => {
                    if (adhesionPlacementStep !== 'idle') {
                      setAdhesionPlacementStep('idle');
                      setPendingAdhesionStart(null);
                    } else {
                      setAdhesionPlacementStep('start');
                      setScarPlacementMode(null);
                    }
                  }}
                  className={adhesionPlacementStep !== 'idle' ? "bg-red-700 hover:bg-red-800" : ""}
                >
                  {adhesionPlacementStep === 'idle' ? '+ Adhesion Band' : adhesionPlacementStep === 'start' ? 'Click Start Point...' : 'Click End Point...'}
                </Button>
              </div>

              {scarPlacementMode && (
                <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                  Click on the 3D skeleton to place a {SCAR_TYPES[scarPlacementMode].label.toLowerCase()}. The marker will appear at the click location.
                </div>
              )}

              {scarMarkers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300">Placed Scars ({scarMarkers.length})</span>
                  {scarMarkers.map(scar => {
                    const impact = getScarImpact(scar);
                    const isEditing = editingScar === scar.id;
                    return (
                      <div key={scar.id} className="p-3 rounded-lg border border-slate-600 bg-slate-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SCAR_TYPES[scar.type].color }}></span>
                            <span className="text-sm font-medium text-slate-200">{SCAR_TYPES[scar.type].label}</span>
                            <span className="text-[10px] text-slate-500">@ {scar.anatomicalLabel}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingScar(isEditing ? null : scar.id)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => setScarMarkers(prev => prev.filter(s => s.id !== scar.id))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-1">
                          <Badge variant="outline" className="text-[9px]">{SCAR_SEVERITY_LABELS[scar.severity]?.label || 'Unknown'}</Badge>
                          <Badge variant="outline" className="text-[9px]">{scar.age}</Badge>
                          <Badge variant="outline" className="text-[9px]">{scar.mobility}</Badge>
                          {scar.affectedLayers.map(l => (
                            <Badge key={l} variant="outline" className="text-[9px] border-pink-500/30 text-pink-300">{l}</Badge>
                          ))}
                        </div>

                        {isEditing && (
                          <div className="mt-2 space-y-2 p-2 rounded bg-slate-700/50">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-slate-400">Severity (1-5)</Label>
                                <input type="range" min={1} max={5} step={1} value={scar.severity}
                                  onChange={(e) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, severity: Number(e.target.value) } : s))}
                                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                  style={{ background: `linear-gradient(to right, #22c55e, #ef4444)` }}
                                />
                                <span className="text-[9px] text-slate-500">{SCAR_SEVERITY_LABELS[scar.severity]?.label}</span>
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-400">Pain on Palpation (0-10)</Label>
                                <input type="range" min={0} max={10} step={1} value={scar.painOnPalpation}
                                  onChange={(e) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, painOnPalpation: Number(e.target.value) } : s))}
                                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                  style={{ background: `linear-gradient(to right, #4ade80, #ef4444)` }}
                                />
                                <span className="text-[9px] text-slate-500">{scar.painOnPalpation}/10</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-slate-400">Age</Label>
                                <Select value={scar.age} onValueChange={(v) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, age: v as ScarAge } : s))}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(SCAR_AGE_LABELS) as ScarAge[]).map(age => (
                                      <SelectItem key={age} value={age}>{SCAR_AGE_LABELS[age].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-400">Mobility</Label>
                                <Select value={scar.mobility} onValueChange={(v) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, mobility: v as ScarMobility } : s))}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mobile">Mobile</SelectItem>
                                    <SelectItem value="tethered">Tethered</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-400">Affected Layers</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(Object.keys(TISSUE_LAYERS) as TissueLayer[]).map(layer => {
                                  const active = scar.affectedLayers.includes(layer);
                                  return (
                                    <button key={layer} onClick={() => {
                                      setScarMarkers(prev => prev.map(s => {
                                        if (s.id !== scar.id) return s;
                                        return { ...s, affectedLayers: active ? s.affectedLayers.filter(l => l !== layer) : [...s.affectedLayers, layer] };
                                      }));
                                    }}
                                    className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${active ? 'border-pink-500 bg-pink-500/20 text-pink-300' : 'border-slate-600 text-slate-500'}`}
                                    >
                                      {TISSUE_LAYERS[layer].label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-400">Notes</Label>
                              <Input className="h-7 text-[10px]" value={scar.notes} onChange={(e) => setScarMarkers(prev => prev.map(s => s.id === scar.id ? { ...s, notes: e.target.value } : s))} placeholder="Clinical notes..." />
                            </div>
                          </div>
                        )}

                        {impact.clinicalNotes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {impact.clinicalNotes.map((note, i) => (
                              <div key={i} className="text-[9px] text-slate-400 flex items-start gap-1">
                                <AlertCircle className="h-2.5 w-2.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                {note}
                              </div>
                            ))}
                          </div>
                        )}
                        {impact.affectedChains.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {impact.affectedChains.map(({ chain }) => (
                              <span key={chain.id} className="text-[8px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: chain.color + '60', color: chain.color }}>
                                {chain.name.replace(/ \([LR]\)$/, '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {adhesionBands.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300">Adhesion Bands ({adhesionBands.length})</span>
                  {adhesionBands.map(band => (
                    <div key={band.id} className="p-2 rounded-lg border border-red-800/40 bg-red-900/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-red-300">{band.startBone} → {band.endBone}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-500">Tension: {band.tensionLevel}%</span>
                          <span className="text-[9px] text-slate-500">Depth: {band.depth}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => setAdhesionBands(prev => prev.filter(b => b.id !== band.id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {scarMarkers.length === 0 && adhesionBands.length === 0 && !scarPlacementMode && adhesionPlacementStep === 'idle' && (
                <div className="text-center py-4 text-slate-500 text-xs">
                  No scars or adhesions mapped. Use the buttons above to start placing markers on the skeleton.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Region Insights Panel - Shows when a region is zoomed */}
        {zoomToRegion && zoomToRegion !== 'full_body' && (
          <RegionInsightsPanel
            selectedRegion={zoomToRegion}
            spineFlexion={
              zoomToRegion === 'cervical_spine' ? -modelConfig.spine.cervicalLordosis :
              zoomToRegion === 'thoracic_spine' ? modelConfig.spine.thoracicKyphosis :
              zoomToRegion === 'left_hip' ? modelConfig.leftHip.flexion :
              zoomToRegion === 'right_hip' ? modelConfig.rightHip.flexion :
              zoomToRegion === 'left_knee' ? modelConfig.leftKnee.flexion :
              zoomToRegion === 'right_knee' ? modelConfig.rightKnee.flexion :
              zoomToRegion === 'left_ankle' ? modelConfig.leftAnkle.dorsiflexion :
              zoomToRegion === 'right_ankle' ? modelConfig.rightAnkle.dorsiflexion :
              -modelConfig.spine.lumbarLordosis
            }
            spineRotation={
              zoomToRegion === 'cervical_spine' ? modelConfig.spine.cervicalRotation :
              zoomToRegion === 'thoracic_spine' ? modelConfig.spine.thoracicRotation :
              zoomToRegion === 'left_hip' ? modelConfig.leftHip.internalRotation :
              zoomToRegion === 'right_hip' ? modelConfig.rightHip.internalRotation :
              zoomToRegion === 'left_knee' ? modelConfig.leftKnee.varus :
              zoomToRegion === 'right_knee' ? modelConfig.rightKnee.varus :
              zoomToRegion === 'left_ankle' ? modelConfig.leftAnkle.inversion :
              zoomToRegion === 'right_ankle' ? modelConfig.rightAnkle.inversion :
              modelConfig.spine.lumbarRotation
            }
            spineLateralFlexion={
              zoomToRegion === 'cervical_spine' ? modelConfig.spine.cervicalLateralFlexion :
              zoomToRegion === 'left_hip' ? modelConfig.leftHip.abduction :
              zoomToRegion === 'right_hip' ? modelConfig.rightHip.abduction :
              zoomToRegion === 'left_knee' ? modelConfig.leftKnee.tibialTorsion :
              zoomToRegion === 'right_knee' ? modelConfig.rightKnee.tibialTorsion :
              zoomToRegion === 'left_ankle' ? modelConfig.leftAnkle.eversion :
              zoomToRegion === 'right_ankle' ? modelConfig.rightAnkle.eversion :
              modelConfig.spine.scoliosis
            }
            pelvisTilt={
              zoomToRegion === 'left_hip' ? modelConfig.leftHip.anteversion :
              zoomToRegion === 'right_hip' ? modelConfig.rightHip.anteversion :
              zoomToRegion === 'left_knee' ? modelConfig.leftKnee.recurvatum :
              zoomToRegion === 'right_knee' ? modelConfig.rightKnee.recurvatum :
              zoomToRegion === 'left_ankle' ? modelConfig.leftAnkle.plantarflexion :
              zoomToRegion === 'right_ankle' ? modelConfig.rightAnkle.plantarflexion :
              modelConfig.pelvis.tilt
            }
            pelvisObliquity={
              zoomToRegion === 'left_hip' ? modelConfig.leftHip.neckShaftAngle :
              zoomToRegion === 'right_hip' ? modelConfig.rightHip.neckShaftAngle :
              zoomToRegion === 'left_knee' ? modelConfig.leftKnee.tibialSlope :
              zoomToRegion === 'right_knee' ? modelConfig.rightKnee.tibialSlope :
              zoomToRegion === 'left_ankle' ? modelConfig.leftAnkle.archHeight :
              zoomToRegion === 'right_ankle' ? modelConfig.rightAnkle.archHeight :
              modelConfig.pelvis.obliquity
            }
            pelvisRotation={modelConfig.pelvis.rotation}
            bodyWeightKg={70}
            compensationPatterns={compensationResult.patterns}
          />
        )}

        {/* Camera Pose Capture Panel */}
        {showCameraCapture && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-purple-500" />
                Live Pose Capture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CameraPoseCapture
                onPoseUpdate={setLivePose}
                isActive={showCameraCapture}
              />
              {livePose && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
                    <Activity className="h-4 w-4" />
                    Live Pose Debug
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-400 font-mono">
                    <div className="border-b border-slate-700 pb-1 mb-1 text-slate-300 font-semibold">Shoulders (Abduction | Flexion)</div>
                    <div className="flex justify-between">
                      <span>L Shoulder X (Abd):</span>
                      <span className="text-cyan-400">{(livePose.leftShoulder.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>L Shoulder Z (Flex):</span>
                      <span className="text-purple-400">{(livePose.leftShoulder.z * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R Shoulder X (Abd):</span>
                      <span className="text-cyan-400">{(livePose.rightShoulder.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R Shoulder Z (Flex):</span>
                      <span className="text-purple-400">{(livePose.rightShoulder.z * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="border-b border-slate-700 pb-1 mb-1 mt-2 text-slate-300 font-semibold">Elbows | Hips | Knees</div>
                    <div className="flex justify-between">
                      <span>L Elbow:</span>
                      <span className="text-green-400">{(livePose.leftElbow.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R Elbow:</span>
                      <span className="text-green-400">{(livePose.rightElbow.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>L Hip:</span>
                      <span className="text-orange-400">{(livePose.leftHip.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R Hip:</span>
                      <span className="text-orange-400">{(livePose.rightHip.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spine:</span>
                      <span className="text-yellow-400">{(livePose.spine.x * 57.3).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Neck:</span>
                      <span className="text-yellow-400">{(livePose.neck.x * 57.3).toFixed(1)}°</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Movement Analysis Summary */}
              {movementAnalysis && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <Stethoscope className="h-4 w-4" />
                      Movement Analysis
                    </div>
                    <Badge variant={movementAnalysis.overallMovementQuality > 70 ? "default" : movementAnalysis.overallMovementQuality > 40 ? "secondary" : "destructive"}>
                      Quality: {movementAnalysis.overallMovementQuality}/100
                    </Badge>
                  </div>
                  {movementAnalysis.patterns.length > 0 && (
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-400">Patterns detected:</p>
                      {movementAnalysis.patterns.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            p.severity === 'severe' ? 'border-red-500/50 text-red-400' :
                            p.severity === 'moderate' ? 'border-yellow-500/50 text-yellow-400' :
                            'border-green-500/50 text-green-400'
                          }>
                            {p.severity}
                          </Badge>
                          <span className="text-slate-300">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {movementAnalysis.asymmetries.length > 0 && (
                    <div className="mt-2 text-xs text-orange-400">
                      {movementAnalysis.asymmetries.length} clinically significant asymmetries detected
                    </div>
                  )}
                </div>
              )}
              
              {/* Generate Assessment Button */}
              {movementAnalysis && (
                <Button
                  onClick={generateClinicalAssessment}
                  disabled={isGeneratingAssessment}
                  className="w-full mt-4"
                  data-testid="btn-generate-assessment"
                >
                  {isGeneratingAssessment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Assessment...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Clinical Assessment
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clinical Intake Panel (Optional) */}
        {showCameraCapture && (
          <ClinicalIntakePanel
            onIntakeChange={setClinicalIntakeData}
          />
        )}

        {/* Clinical Assessment Results */}
        {clinicalAssessment && (
          <ClinicalAssessmentResults
            assessment={clinicalAssessment}
            isLoading={isGeneratingAssessment}
          />
        )}

        {/* Right Panel - Clinical Controls (hidden when zoom cameras are active) */}
        {!(showJointZoom && activeJointGroup) && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Clinical Controls</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Static Posture Assessment Button */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-lg border border-green-500/20">
              <h3 className="font-semibold mb-2 text-green-300 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Clinical Assessment
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Generate a clinical assessment based on the current skeleton configuration and any joint restrictions.
              </p>
              <Button
                onClick={generateStaticPostureAssessment}
                disabled={isGeneratingAssessment}
                className="w-full"
                variant="secondary"
                data-testid="btn-static-posture-assessment"
              >
                {isGeneratingAssessment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Posture...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Current Posture
                  </>
                )}
              </Button>
            </div>

            {/* Movement Animation Controller */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
              <h3 className="font-semibold mb-3 text-purple-300 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Movement Animation
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Select
                    value={animationState.currentMovement || ''}
                    onValueChange={(value) => {
                      setAnimationState(prev => ({
                        ...prev,
                        currentMovement: value || null,
                        progress: 0,
                      }));
                    }}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-movement">
                      <SelectValue placeholder="Select movement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_SEQUENCES.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant={animationState.isPlaying ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      if (!animationState.currentMovement) return;
                      setAnimationState(prev => ({
                        ...prev,
                        isPlaying: !prev.isPlaying,
                      }));
                    }}
                    disabled={!animationState.currentMovement}
                    data-testid="button-play-pause"
                  >
                    {animationState.isPlaying ? (
                      <><Pause className="h-4 w-4 mr-1" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4 mr-1" /> Play</>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnimationState(prev => ({
                        ...prev,
                        isPlaying: false,
                        progress: 0,
                      }));
                      resetAll();
                    }}
                    data-testid="button-reset-animation"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Speed: {animationState.speed}x</Label>
                  <Slider
                    value={[animationState.speed]}
                    onValueChange={(value) => setAnimationState(prev => ({ ...prev, speed: value[0] }))}
                    min={0.25}
                    max={2}
                    step={0.25}
                    className="mt-1"
                    data-testid="slider-animation-speed"
                  />
                </div>
                
                {animationState.currentMovement && (
                  <p className="text-xs text-muted-foreground">
                    {MOVEMENT_SEQUENCES.find(s => s.id === animationState.currentMovement)?.description}
                  </p>
                )}
              </div>
            </div>

          </CardContent>
        </Card>
        )}
      </div>

      {/* Muscle Biomechanics State Panel */}
      {showMuscleLayer && (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Muscle States & Fascial Chains
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Shortened</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Neutral</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Lengthened</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="bidirectional-toggle" className="text-xs text-slate-400 cursor-pointer">Muscles Move Bones</Label>
                <Switch
                  id="bidirectional-toggle"
                  checked={bidirectionalMode}
                  onCheckedChange={setBidirectionalMode}
                />
              </div>
              {Object.keys(muscleOverrides).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setMuscleOverrides({})}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Overrides
                </Button>
              )}
            </div>
          </div>
          {bidirectionalMode && bidirectionalResult && (
            <div className="mt-2 px-1">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(bidirectionalResult.jointAdjustments).map(([joint, params]) => (
                  Object.entries(params).filter(([, v]) => Math.abs(v) > 0.5).map(([param, val]) => (
                    <span key={`${joint}.${param}`} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                      {joint.replace(/([A-Z])/g, ' $1').trim()} {param}: {val > 0 ? '+' : ''}{Math.round(val)}°
                    </span>
                  ))
                ))}
                {Object.entries(bidirectionalResult.reciprocalInhibitions).map(([muscle, amount]) => (
                  <span key={muscle} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                    {muscle.replace(/_/g, ' ')}: {Math.round(amount)}% reciprocal inhib
                  </span>
                ))}
                {Object.entries(bidirectionalResult.couplingEffects).map(([joint, params]) => (
                  Object.entries(params).filter(([, v]) => Math.abs(v) > 0.5).map(([param, val]) => (
                    <span key={`c-${joint}.${param}`} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/25">
                      coupled: {joint.replace(/([A-Z])/g, ' $1').trim()} {param}: {val > 0 ? '+' : ''}{Math.round(val)}°
                    </span>
                  ))
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Whole Body Tension Summary */}
          <div className={`mb-4 p-3 rounded-lg border ${
            wholeBodyScore.level === 'critical' ? 'border-red-500/50 bg-red-500/10' :
            wholeBodyScore.level === 'high' ? 'border-orange-500/50 bg-orange-500/10' :
            wholeBodyScore.level === 'moderate' ? 'border-yellow-500/50 bg-yellow-500/10' :
            'border-green-500/50 bg-green-500/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Whole-Body Tension</span>
              <span className={`text-lg font-bold ${
                wholeBodyScore.level === 'critical' ? 'text-red-400' :
                wholeBodyScore.level === 'high' ? 'text-orange-400' :
                wholeBodyScore.level === 'moderate' ? 'text-yellow-400' :
                'text-green-400'
              }`}>{wholeBodyScore.score}/100</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  wholeBodyScore.level === 'critical' ? 'bg-red-500' :
                  wholeBodyScore.level === 'high' ? 'bg-orange-500' :
                  wholeBodyScore.level === 'moderate' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${wholeBodyScore.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">{wholeBodyScore.description}</p>
          </div>

          {/* Fascial Chain Legend */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Fascial Chains</span>
              {showChainVisualization && (
                <span className="text-[10px] text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full">3D Active</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Map(MYOFASCIAL_CHAINS.map(c => [c.color, c])).values()).map(chain => {
                const baseName = chain.name.replace(/ \([LR]\)$/, '');
                const matchingIds = MYOFASCIAL_CHAINS.filter(c => c.color === chain.color).map(c => c.id);
                const allActive = matchingIds.every(id => activeChainIds.includes(id));
                return (
                  <button
                    key={chain.color}
                    onClick={() => {
                      if (allActive) {
                        setActiveChainIds(prev => prev.filter(id => !matchingIds.includes(id)));
                      } else {
                        setActiveChainIds(prev => [...new Set([...prev, ...matchingIds])]);
                      }
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                      allActive
                        ? 'border-slate-500 text-slate-300 bg-slate-700/50'
                        : 'border-slate-700 text-slate-600 bg-transparent opacity-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: chain.color, opacity: allActive ? 1 : 0.3 }}></span>
                    {baseName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Muscle Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(muscleStates).map((muscle: MuscleStatus) => {
              const stateColor = muscle.state === 'shortened' ? 'border-red-500/40 bg-red-500/5' :
                muscle.state === 'lengthened' ? 'border-blue-500/40 bg-blue-500/5' :
                'border-green-500/40 bg-green-500/5';
              const stateTextColor = muscle.state === 'shortened' ? 'text-red-400' :
                muscle.state === 'lengthened' ? 'text-blue-400' : 'text-green-400';
              const activationColor = muscle.activation === 'high' ? 'bg-orange-500' :
                muscle.activation === 'moderate' ? 'bg-yellow-500' :
                muscle.activation === 'low' ? 'bg-slate-400' : 'bg-slate-600';
              const isExpanded = expandedMuscle === muscle.id;
              const override = muscleOverrides[muscle.id];
              const hasOverride = override?.isManual;
              const chains = getChainMembership(muscle.id);
              const propagated = chainPropagation[muscle.id];
              const hasChainEffects = propagated && (propagated.chainEffects.length > 0 || propagated.slingEffects.length > 0);
              return (
                <div key={muscle.id} className={`rounded-lg border p-3 ${stateColor} transition-all duration-300 ${hasOverride ? 'ring-1 ring-purple-500/50' : ''} ${override?.pathology && override.pathology !== 'none' ? 'ring-1 ring-red-500/40' : ''}`}>
                  <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setExpandedMuscle(isExpanded ? null : muscle.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{muscle.label}</span>
                      {hasOverride && <Lock className="h-3 w-3 text-purple-400" />}
                      {hasChainEffects && <Zap className="h-3 w-3 text-yellow-400" />}
                      {override?.pathology && override.pathology !== 'none' && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                          {PATHOLOGY_LABELS[override.pathology]}
                        </span>
                      )}
                      {override?.inhibition && override.inhibition > 0 && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          {Math.round(override.inhibition)}% inhib
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold uppercase ${stateTextColor}`}>{muscle.state}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tension</span>
                      <span className="text-slate-300">{Math.round(muscle.tension)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          muscle.tension > 70 ? 'bg-red-500' : muscle.tension > 40 ? 'bg-yellow-500' : 'bg-blue-400'
                        }`}
                        style={{ width: `${muscle.tension}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-400">Activation</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${activationColor}`}></div>
                        <span className="text-slate-300 capitalize">{muscle.activation}</span>
                      </div>
                    </div>

                    {/* Chain membership badges */}
                    {chains.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from(new Map(chains.map(c => [c.color, c])).values()).map(chain => (
                          <span key={chain.id} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: chain.color + '20', color: chain.color, border: `1px solid ${chain.color}40` }}>
                            {chain.name.replace(' Line', '').replace('Superficial ', 'S.').replace(/ \([LR]\)$/, '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {muscle.description !== 'neutral resting position' && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight italic">{muscle.description}</p>
                    )}

                    {bidirectionalMode && (() => {
                      const antagonists = getAntagonistFor(muscle.id);
                      const recipInhib = bidirectionalResult?.reciprocalInhibitions[muscle.id];
                      if (antagonists.length === 0 && !recipInhib) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {antagonists.map(ant => (
                            <span key={ant} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50">
                              ↔ {ant.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {recipInhib && recipInhib > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {Math.round(recipInhib)}% reciprocal inhib
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Expanded Override Controls */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Tightness Override</span>
                            <span className="text-slate-300">{override?.tensionOffset ? (override.tensionOffset > 0 ? '+' : '') + Math.round(override.tensionOffset) + '%' : '0%'}</span>
                          </div>
                          <input
                            type="range"
                            min="-40"
                            max="40"
                            step="1"
                            value={override?.tensionOffset ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMuscleOverrides(prev => {
                                const existing = prev[muscle.id];
                                const updated: MuscleOverride = {
                                  tensionOffset: val,
                                  activationOffset: existing?.activationOffset ?? 0,
                                  lengthOverride: existing?.lengthOverride ?? 'none',
                                  inhibition: existing?.inhibition ?? 0,
                                  pathology: existing?.pathology ?? 'none',
                                  isManual: true,
                                };
                                updated.isManual = val !== 0 || updated.activationOffset !== 0 || updated.lengthOverride !== 'none' || updated.inhibition > 0 || updated.pathology !== 'none';
                                return { ...prev, [muscle.id]: updated };
                              });
                            }}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                          />
                          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                            <span>Lengthened</span>
                            <span>Neutral</span>
                            <span>Tight</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Activation Override</span>
                            <span className="text-slate-300">{override?.activationOffset ? (override.activationOffset > 0 ? '+' : '') + Math.round(override.activationOffset) + '%' : '0%'}</span>
                          </div>
                          <input
                            type="range"
                            min="-30"
                            max="50"
                            step="1"
                            value={override?.activationOffset ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMuscleOverrides(prev => {
                                const existing = prev[muscle.id];
                                const updated: MuscleOverride = {
                                  tensionOffset: existing?.tensionOffset ?? 0,
                                  activationOffset: val,
                                  lengthOverride: existing?.lengthOverride ?? 'none',
                                  inhibition: existing?.inhibition ?? 0,
                                  pathology: existing?.pathology ?? 'none',
                                  isManual: true,
                                };
                                updated.isManual = updated.tensionOffset !== 0 || val !== 0 || updated.lengthOverride !== 'none' || updated.inhibition > 0 || updated.pathology !== 'none';
                                return { ...prev, [muscle.id]: updated };
                              });
                            }}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"
                          />
                          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                            <span>Inhibited</span>
                            <span>Normal</span>
                            <span>Overactive</span>
                          </div>
                        </div>

                        {/* Length Override */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Length Override</span>
                            <span className="text-slate-300 capitalize">{override?.lengthOverride === 'none' || !override?.lengthOverride ? 'Auto' : override.lengthOverride}</span>
                          </div>
                          <div className="flex gap-1">
                            {(['none', 'shortened', 'neutral', 'lengthened'] as LengthOverride[]).map(len => (
                              <button
                                key={len}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMuscleOverrides(prev => {
                                    const existing = prev[muscle.id];
                                    const updated: MuscleOverride = {
                                      tensionOffset: existing?.tensionOffset ?? 0,
                                      activationOffset: existing?.activationOffset ?? 0,
                                      lengthOverride: len,
                                      inhibition: existing?.inhibition ?? 0,
                                      pathology: existing?.pathology ?? 'none',
                                      isManual: true,
                                    };
                                    updated.isManual = updated.tensionOffset !== 0 || updated.activationOffset !== 0 || len !== 'none' || updated.inhibition > 0 || updated.pathology !== 'none';
                                    return { ...prev, [muscle.id]: updated };
                                  });
                                }}
                                className={`flex-1 text-[9px] py-1 px-1 rounded border transition-all ${
                                  (override?.lengthOverride ?? 'none') === len
                                    ? len === 'shortened' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                    : len === 'lengthened' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                    : len === 'neutral' ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                    : 'bg-slate-700/50 border-slate-500 text-slate-300'
                                    : 'border-slate-700 text-slate-500 hover:border-slate-500'
                                }`}
                              >
                                {len === 'none' ? 'Auto' : len.charAt(0).toUpperCase() + len.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inhibition Slider */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Inhibition</span>
                            <span className="text-slate-300">{Math.round(override?.inhibition ?? 0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={override?.inhibition ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMuscleOverrides(prev => {
                                const existing = prev[muscle.id];
                                const updated: MuscleOverride = {
                                  tensionOffset: existing?.tensionOffset ?? 0,
                                  activationOffset: existing?.activationOffset ?? 0,
                                  lengthOverride: existing?.lengthOverride ?? 'none',
                                  inhibition: val,
                                  pathology: existing?.pathology ?? 'none',
                                  isManual: true,
                                };
                                updated.isManual = updated.tensionOffset !== 0 || updated.activationOffset !== 0 || updated.lengthOverride !== 'none' || val > 0 || updated.pathology !== 'none';
                                return { ...prev, [muscle.id]: updated };
                              });
                            }}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-yellow-500"
                          />
                          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                            <span>Normal</span>
                            <span>Partial</span>
                            <span>Full</span>
                          </div>
                        </div>

                        {/* Pathology Selector */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-400">Pathology</span>
                            <span className="text-slate-300">{PATHOLOGY_LABELS[override?.pathology ?? 'none']}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(Object.keys(PATHOLOGY_LABELS) as PathologyType[]).map(path => (
                              <button
                                key={path}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMuscleOverrides(prev => {
                                    const existing = prev[muscle.id];
                                    const updated: MuscleOverride = {
                                      tensionOffset: existing?.tensionOffset ?? 0,
                                      activationOffset: existing?.activationOffset ?? 0,
                                      lengthOverride: existing?.lengthOverride ?? 'none',
                                      inhibition: existing?.inhibition ?? 0,
                                      pathology: path,
                                      isManual: true,
                                    };
                                    updated.isManual = updated.tensionOffset !== 0 || updated.activationOffset !== 0 || updated.lengthOverride !== 'none' || updated.inhibition > 0 || path !== 'none';
                                    return { ...prev, [muscle.id]: updated };
                                  });
                                }}
                                className={`text-[8px] py-0.5 px-1.5 rounded-full border transition-all ${
                                  (override?.pathology ?? 'none') === path
                                    ? path === 'none' ? 'bg-slate-700/50 border-slate-500 text-slate-300'
                                    : 'bg-red-500/20 border-red-500/50 text-red-300'
                                    : 'border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'
                                }`}
                              >
                                {PATHOLOGY_LABELS[path]}
                              </button>
                            ))}
                          </div>
                          {override?.pathology && override.pathology !== 'none' && (
                            <div className="mt-1.5 text-[9px] text-slate-500 bg-slate-800/50 rounded p-1.5">
                              <span className="text-red-400 font-medium">{PATHOLOGY_LABELS[override.pathology]}:</span>{' '}
                              {PATHOLOGY_EFFECTS[override.pathology].tensionMod > 0 ? '+' : ''}{PATHOLOGY_EFFECTS[override.pathology].tensionMod}% tension,{' '}
                              {PATHOLOGY_EFFECTS[override.pathology].activationMod > 0 ? '+' : ''}{PATHOLOGY_EFFECTS[override.pathology].activationMod}% activation
                            </div>
                          )}
                        </div>
                        {hasOverride && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-6 text-[10px] text-slate-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMuscleOverrides(prev => {
                                const next = { ...prev };
                                delete next[muscle.id];
                                return next;
                              });
                            }}
                          >
                            Reset This Muscle
                          </Button>
                        )}

                        {/* Chain propagation effects */}
                        {hasChainEffects && propagated && (
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <span className="text-[10px] text-slate-400 font-medium">Chain Effects:</span>
                            <div className="mt-1 space-y-0.5">
                              {propagated.chainEffects.concat(propagated.slingEffects).slice(0, 5).map((effect, i) => (
                                <div key={i} className="flex items-center justify-between text-[9px]">
                                  <span className="text-slate-500">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: effect.chainColor }}></span>
                                    {effect.chainName.replace(' Line', '').replace('Superficial ', 'S.')} via {effect.sourceMuscle.replace('_', ' ')}
                                  </span>
                                  <span className={effect.tensionDelta > 0 ? 'text-red-400' : 'text-blue-400'}>
                                    {effect.tensionDelta > 0 ? '+' : ''}{effect.tensionDelta.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Joint Parameters - Sliders Panel (Above Biomechanics) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Joint Parameters</CardTitle>
            <Button onClick={resetAll} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="spine" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="spine">Spine & Pelvis</TabsTrigger>
              <TabsTrigger value="lower">Lower Body</TabsTrigger>
              <TabsTrigger value="upper">Upper Body</TabsTrigger>
            </TabsList>

            {/* Spine & Pelvis Tab */}
              <TabsContent value="spine" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Spinal Curves</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Cervical Lordosis ({modelConfig.spine.cervicalLordosis}°)</Label>
                      <Slider
                        value={[modelConfig.spine.cervicalLordosis]}
                        onValueChange={(value) => handleSliderChange('spine', 'cervicalLordosis', value)}
                        min={-60}
                        max={20}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>{jointLabel('Thoracic Kyphosis', 'spine', 'thoracicKyphosis', modelConfig.spine.thoracicKyphosis)}</Label>
                      <Slider
                        value={[modelConfig.spine.thoracicKyphosis]}
                        onValueChange={(value) => handleSliderChange('spine', 'thoracicKyphosis', value)}
                        min={-20}
                        max={50}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>{jointLabel('Lumbar Lordosis', 'spine', 'lumbarLordosis', modelConfig.spine.lumbarLordosis)}</Label>
                      <Slider
                        value={[modelConfig.spine.lumbarLordosis]}
                        onValueChange={(value) => handleSliderChange('spine', 'lumbarLordosis', value)}
                        min={-70}
                        max={20}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Scoliosis ({modelConfig.spine.scoliosis}°)</Label>
                      <Slider
                        value={[modelConfig.spine.scoliosis]}
                        onValueChange={(value) => handleSliderChange('spine', 'scoliosis', value)}
                        min={-45}
                        max={45}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-semibold">Spinal Rotation</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Cervical Rotation ({modelConfig.spine.cervicalRotation}°)</Label>
                      <Slider
                        value={[modelConfig.spine.cervicalRotation]}
                        onValueChange={(value) => handleSliderChange('spine', 'cervicalRotation', value)}
                        min={-80}
                        max={80}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Cervical Lateral Flexion ({modelConfig.spine.cervicalLateralFlexion}°)</Label>
                      <Slider
                        value={[modelConfig.spine.cervicalLateralFlexion]}
                        onValueChange={(value) => handleSliderChange('spine', 'cervicalLateralFlexion', value)}
                        min={-45}
                        max={45}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Thoracic Rotation ({modelConfig.spine.thoracicRotation}°)</Label>
                      <Slider
                        value={[modelConfig.spine.thoracicRotation]}
                        onValueChange={(value) => handleSliderChange('spine', 'thoracicRotation', value)}
                        min={-45}
                        max={45}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Lumbar Rotation ({modelConfig.spine.lumbarRotation}°)</Label>
                      <Slider
                        value={[modelConfig.spine.lumbarRotation]}
                        onValueChange={(value) => handleSliderChange('spine', 'lumbarRotation', value)}
                        min={-30}
                        max={30}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-semibold">Head & Neck</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Neck Flexion ({modelConfig.neck.flexion}°)</Label>
                      <Slider
                        value={[modelConfig.neck.flexion]}
                        onValueChange={(value) => handleSliderChange('neck', 'flexion', value)}
                        min={0}
                        max={60}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Neck Extension ({modelConfig.neck.extension}°)</Label>
                      <Slider
                        value={[modelConfig.neck.extension]}
                        onValueChange={(value) => handleSliderChange('neck', 'extension', value)}
                        min={0}
                        max={75}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Neck Rotation ({modelConfig.neck.rotation}°)</Label>
                      <Slider
                        value={[modelConfig.neck.rotation]}
                        onValueChange={(value) => handleSliderChange('neck', 'rotation', value)}
                        min={-80}
                        max={80}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Lateral Flexion ({modelConfig.neck.lateralFlexion}°)</Label>
                      <Slider
                        value={[modelConfig.neck.lateralFlexion]}
                        onValueChange={(value) => handleSliderChange('neck', 'lateralFlexion', value)}
                        min={-45}
                        max={45}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>{jointLabel('Forward Head Posture', 'neck', 'forwardHead', modelConfig.neck.forwardHead)}</Label>
                      <Slider
                        value={[modelConfig.neck.forwardHead]}
                        onValueChange={(value) => handleSliderChange('neck', 'forwardHead', value)}
                        min={0}
                        max={45}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-semibold">Pelvic Alignment</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>{jointLabel('Pelvic Tilt', 'pelvis', 'tilt', modelConfig.pelvis.tilt)}</Label>
                      <Slider
                        value={[modelConfig.pelvis.tilt]}
                        onValueChange={(value) => handleSliderChange('pelvis', 'tilt', value)}
                        min={-30}
                        max={30}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Pelvic Obliquity ({modelConfig.pelvis.obliquity}°)</Label>
                      <Slider
                        value={[modelConfig.pelvis.obliquity]}
                        onValueChange={(value) => handleSliderChange('pelvis', 'obliquity', value)}
                        min={-20}
                        max={20}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Lower Body Tab */}
              <TabsContent value="lower" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Hip Joints</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.hips}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, hips: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  {/* Hip Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Left Hip</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToSide('left', 'Hip')}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">{jointLabel('Flexion', 'leftHip', 'flexion', modelConfig.leftHip.flexion)}</Label>
                        <Slider
                          value={[modelConfig.leftHip.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftHip', 'flexion', value);
                            if (linkedSides.hips) {
                              handleSliderChange('rightHip', 'flexion', value);
                            }
                          }}
                          min={0}
                          max={120}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{jointLabel('Extension', 'leftHip', 'extension', modelConfig.leftHip.extension)}</Label>
                        <Slider
                          value={[modelConfig.leftHip.extension]}
                          onValueChange={(value) => {
                            handleSliderChange('leftHip', 'extension', value);
                            if (linkedSides.hips) {
                              handleSliderChange('rightHip', 'extension', value);
                            }
                          }}
                          min={0}
                          max={120}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Anteversion ({modelConfig.leftHip.anteversion}°)</Label>
                        <Slider
                          value={[modelConfig.leftHip.anteversion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftHip', 'anteversion', value);
                            if (linkedSides.hips) {
                              handleSliderChange('rightHip', 'anteversion', value);
                            }
                          }}
                          min={-20}
                          max={40}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Neck-Shaft Angle ({modelConfig.leftHip.neckShaftAngle}°)</Label>
                        <Slider
                          value={[modelConfig.leftHip.neckShaftAngle]}
                          onValueChange={(value) => {
                            handleSliderChange('leftHip', 'neckShaftAngle', value);
                            if (linkedSides.hips) {
                              handleSliderChange('rightHip', 'neckShaftAngle', value);
                            }
                          }}
                          min={-20}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Right Hip</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToSide('right', 'Hip')}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">{jointLabel('Flexion', 'rightHip', 'flexion', modelConfig.rightHip.flexion)}</Label>
                        <Slider
                          value={[modelConfig.rightHip.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightHip', 'flexion', value);
                            if (linkedSides.hips) {
                              handleSliderChange('leftHip', 'flexion', value);
                            }
                          }}
                          min={0}
                          max={120}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Extension ({modelConfig.rightHip.extension}°)</Label>
                        <Slider
                          value={[modelConfig.rightHip.extension]}
                          onValueChange={(value) => {
                            handleSliderChange('rightHip', 'extension', value);
                            if (linkedSides.hips) {
                              handleSliderChange('leftHip', 'extension', value);
                            }
                          }}
                          min={0}
                          max={120}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Anteversion ({modelConfig.rightHip.anteversion}°)</Label>
                        <Slider
                          value={[modelConfig.rightHip.anteversion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightHip', 'anteversion', value);
                            if (linkedSides.hips) {
                              handleSliderChange('leftHip', 'anteversion', value);
                            }
                          }}
                          min={-20}
                          max={40}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Neck-Shaft Angle ({modelConfig.rightHip.neckShaftAngle}°)</Label>
                        <Slider
                          value={[modelConfig.rightHip.neckShaftAngle]}
                          onValueChange={(value) => {
                            handleSliderChange('rightHip', 'neckShaftAngle', value);
                            if (linkedSides.hips) {
                              handleSliderChange('leftHip', 'neckShaftAngle', value);
                            }
                          }}
                          min={-20}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Knee Joints</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.knees}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, knees: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  {/* Knee Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Knee</Label>
                      <div>
                        <Label className="text-xs">{jointLabel('Flexion', 'leftKnee', 'flexion', modelConfig.leftKnee.flexion)}</Label>
                        <Slider
                          value={[modelConfig.leftKnee.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftKnee', 'flexion', value);
                            if (linkedSides.knees) {
                              handleSliderChange('rightKnee', 'flexion', value);
                            }
                          }}
                          min={-10}
                          max={140}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Varus/Valgum ({modelConfig.leftKnee.varus}°)</Label>
                        <Slider
                          value={[modelConfig.leftKnee.varus]}
                          onValueChange={(value) => {
                            handleSliderChange('leftKnee', 'varus', value);
                            if (linkedSides.knees) {
                              handleSliderChange('rightKnee', 'varus', value);
                            }
                          }}
                          min={-20}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tibial Torsion ({modelConfig.leftKnee.tibialTorsion}°)</Label>
                        <Slider
                          value={[modelConfig.leftKnee.tibialTorsion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftKnee', 'tibialTorsion', value);
                            if (linkedSides.knees) {
                              handleSliderChange('rightKnee', 'tibialTorsion', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Recurvatum ({modelConfig.leftKnee.recurvatum}°)</Label>
                        <Slider
                          value={[modelConfig.leftKnee.recurvatum]}
                          onValueChange={(value) => {
                            handleSliderChange('leftKnee', 'recurvatum', value);
                            if (linkedSides.knees) {
                              handleSliderChange('rightKnee', 'recurvatum', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tibial Slope ({modelConfig.leftKnee.tibialSlope}°)</Label>
                        <Slider
                          value={[modelConfig.leftKnee.tibialSlope]}
                          onValueChange={(value) => {
                            handleSliderChange('leftKnee', 'tibialSlope', value);
                            if (linkedSides.knees) {
                              handleSliderChange('rightKnee', 'tibialSlope', value);
                            }
                          }}
                          min={0}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Knee</Label>
                      <div>
                        <Label className="text-xs">{jointLabel('Flexion', 'rightKnee', 'flexion', modelConfig.rightKnee.flexion)}</Label>
                        <Slider
                          value={[modelConfig.rightKnee.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightKnee', 'flexion', value);
                            if (linkedSides.knees) {
                              handleSliderChange('leftKnee', 'flexion', value);
                            }
                          }}
                          min={-10}
                          max={140}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Varus/Valgum ({modelConfig.rightKnee.varus}°)</Label>
                        <Slider
                          value={[modelConfig.rightKnee.varus]}
                          onValueChange={(value) => {
                            handleSliderChange('rightKnee', 'varus', value);
                            if (linkedSides.knees) {
                              handleSliderChange('leftKnee', 'varus', value);
                            }
                          }}
                          min={-20}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tibial Torsion ({modelConfig.rightKnee.tibialTorsion}°)</Label>
                        <Slider
                          value={[modelConfig.rightKnee.tibialTorsion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightKnee', 'tibialTorsion', value);
                            if (linkedSides.knees) {
                              handleSliderChange('leftKnee', 'tibialTorsion', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Recurvatum ({modelConfig.rightKnee.recurvatum}°)</Label>
                        <Slider
                          value={[modelConfig.rightKnee.recurvatum]}
                          onValueChange={(value) => {
                            handleSliderChange('rightKnee', 'recurvatum', value);
                            if (linkedSides.knees) {
                              handleSliderChange('leftKnee', 'recurvatum', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tibial Slope ({modelConfig.rightKnee.tibialSlope}°)</Label>
                        <Slider
                          value={[modelConfig.rightKnee.tibialSlope]}
                          onValueChange={(value) => {
                            handleSliderChange('rightKnee', 'tibialSlope', value);
                            if (linkedSides.knees) {
                              handleSliderChange('leftKnee', 'tibialSlope', value);
                            }
                          }}
                          min={0}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ankle Controls */}
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Ankle Joints</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.ankles}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, ankles: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Ankle</Label>
                      <div>
                        <Label className="text-xs">{jointLabel('Dorsiflexion', 'leftAnkle', 'dorsiflexion', modelConfig.leftAnkle.dorsiflexion)}</Label>
                        <Slider
                          value={[modelConfig.leftAnkle.dorsiflexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftAnkle', 'dorsiflexion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('rightAnkle', 'dorsiflexion', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Plantarflexion ({modelConfig.leftAnkle.plantarflexion}°)</Label>
                        <Slider
                          value={[modelConfig.leftAnkle.plantarflexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftAnkle', 'plantarflexion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('rightAnkle', 'plantarflexion', value);
                            }
                          }}
                          min={0}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Inversion ({modelConfig.leftAnkle.inversion}°)</Label>
                        <Slider
                          value={[modelConfig.leftAnkle.inversion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftAnkle', 'inversion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('rightAnkle', 'inversion', value);
                            }
                          }}
                          min={0}
                          max={35}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Eversion ({modelConfig.leftAnkle.eversion}°)</Label>
                        <Slider
                          value={[modelConfig.leftAnkle.eversion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftAnkle', 'eversion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('rightAnkle', 'eversion', value);
                            }
                          }}
                          min={0}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Ankle</Label>
                      <div>
                        <Label className="text-xs">{jointLabel('Dorsiflexion', 'rightAnkle', 'dorsiflexion', modelConfig.rightAnkle.dorsiflexion)}</Label>
                        <Slider
                          value={[modelConfig.rightAnkle.dorsiflexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightAnkle', 'dorsiflexion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('leftAnkle', 'dorsiflexion', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Plantarflexion ({modelConfig.rightAnkle.plantarflexion}°)</Label>
                        <Slider
                          value={[modelConfig.rightAnkle.plantarflexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightAnkle', 'plantarflexion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('leftAnkle', 'plantarflexion', value);
                            }
                          }}
                          min={0}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Inversion ({modelConfig.rightAnkle.inversion}°)</Label>
                        <Slider
                          value={[modelConfig.rightAnkle.inversion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightAnkle', 'inversion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('leftAnkle', 'inversion', value);
                            }
                          }}
                          min={0}
                          max={35}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Eversion ({modelConfig.rightAnkle.eversion}°)</Label>
                        <Slider
                          value={[modelConfig.rightAnkle.eversion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightAnkle', 'eversion', value);
                            if (linkedSides.ankles) {
                              handleSliderChange('leftAnkle', 'eversion', value);
                            }
                          }}
                          min={0}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Upper Body Tab */}
              <TabsContent value="upper" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Shoulder Joints</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.shoulders}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, shoulders: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  {/* Shoulder Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Shoulder</Label>
                      <div>
                        <Label className="text-xs">Flexion ({modelConfig.leftShoulder.flexion}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'flexion', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'flexion', value);
                            }
                          }}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Abduction ({modelConfig.leftShoulder.abduction}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.abduction]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'abduction', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'abduction', value);
                            }
                          }}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Internal Rotation ({modelConfig.leftShoulder.internalRotation}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.internalRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'internalRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'internalRotation', value);
                            }
                          }}
                          min={-90}
                          max={90}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">External Rotation ({modelConfig.leftShoulder.externalRotation}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.externalRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'externalRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'externalRotation', value);
                            }
                          }}
                          min={-90}
                          max={90}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Retroversion ({modelConfig.leftShoulder.retroversion}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.retroversion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'retroversion', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'retroversion', value);
                            }
                          }}
                          min={-60}
                          max={60}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Elevation ({modelConfig.leftShoulder.elevation}°)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.elevation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'elevation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'elevation', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clavicle Length ({modelConfig.leftShoulder.clavicleLength}mm)</Label>
                        <Slider
                          value={[modelConfig.leftShoulder.clavicleLength]}
                          onValueChange={(value) => {
                            handleSliderChange('leftShoulder', 'clavicleLength', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightShoulder', 'clavicleLength', value);
                            }
                          }}
                          min={-15}
                          max={15}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Shoulder</Label>
                      <div>
                        <Label className="text-xs">Flexion ({modelConfig.rightShoulder.flexion}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'flexion', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'flexion', value);
                            }
                          }}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Abduction ({modelConfig.rightShoulder.abduction}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.abduction]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'abduction', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'abduction', value);
                            }
                          }}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Internal Rotation ({modelConfig.rightShoulder.internalRotation}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.internalRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'internalRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'internalRotation', value);
                            }
                          }}
                          min={-90}
                          max={90}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">External Rotation ({modelConfig.rightShoulder.externalRotation}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.externalRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'externalRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'externalRotation', value);
                            }
                          }}
                          min={-90}
                          max={90}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Retroversion ({modelConfig.rightShoulder.retroversion}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.retroversion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'retroversion', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'retroversion', value);
                            }
                          }}
                          min={-60}
                          max={60}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Elevation ({modelConfig.rightShoulder.elevation}°)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.elevation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'elevation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'elevation', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clavicle Length ({modelConfig.rightShoulder.clavicleLength}mm)</Label>
                        <Slider
                          value={[modelConfig.rightShoulder.clavicleLength]}
                          onValueChange={(value) => {
                            handleSliderChange('rightShoulder', 'clavicleLength', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftShoulder', 'clavicleLength', value);
                            }
                          }}
                          min={-15}
                          max={15}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Scapula Mechanics</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.shoulders}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, shoulders: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  {/* Scapula Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Scapula</Label>
                      <div>
                        <Label className="text-xs">Protraction ({modelConfig.leftScapula.protraction}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.protraction]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'protraction', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'protraction', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Elevation ({modelConfig.leftScapula.elevation}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.elevation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'elevation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'elevation', value);
                            }
                          }}
                          min={-20}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Upward Rotation ({modelConfig.leftScapula.upwardRotation}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.upwardRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'upwardRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'upwardRotation', value);
                            }
                          }}
                          min={-20}
                          max={60}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Anterior Tilt ({modelConfig.leftScapula.anteriorTilt}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.anteriorTilt]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'anteriorTilt', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'anteriorTilt', value);
                            }
                          }}
                          min={-20}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Winging ({modelConfig.leftScapula.winging}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.winging]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'winging', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'winging', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clavicle Rotation ({modelConfig.leftScapula.clavicleRotation}°)</Label>
                        <Slider
                          value={[modelConfig.leftScapula.clavicleRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('leftScapula', 'clavicleRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('rightScapula', 'clavicleRotation', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Scapula</Label>
                      <div>
                        <Label className="text-xs">Protraction ({modelConfig.rightScapula.protraction}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.protraction]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'protraction', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'protraction', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Elevation ({modelConfig.rightScapula.elevation}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.elevation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'elevation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'elevation', value);
                            }
                          }}
                          min={-20}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Upward Rotation ({modelConfig.rightScapula.upwardRotation}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.upwardRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'upwardRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'upwardRotation', value);
                            }
                          }}
                          min={-20}
                          max={60}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Anterior Tilt ({modelConfig.rightScapula.anteriorTilt}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.anteriorTilt]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'anteriorTilt', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'anteriorTilt', value);
                            }
                          }}
                          min={-20}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Winging ({modelConfig.rightScapula.winging}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.winging]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'winging', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'winging', value);
                            }
                          }}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clavicle Rotation ({modelConfig.rightScapula.clavicleRotation}°)</Label>
                        <Slider
                          value={[modelConfig.rightScapula.clavicleRotation]}
                          onValueChange={(value) => {
                            handleSliderChange('rightScapula', 'clavicleRotation', value);
                            if (linkedSides.shoulders) {
                              handleSliderChange('leftScapula', 'clavicleRotation', value);
                            }
                          }}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Elbow Joints</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={linkedSides.elbows}
                        onCheckedChange={(checked) => 
                          setLinkedSides(prev => ({ ...prev, elbows: checked }))
                        }
                      />
                      <Label className="text-sm">Link Sides</Label>
                    </div>
                  </div>

                  {/* Elbow Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Elbow</Label>
                      <div>
                        <Label className="text-xs">{jointLabel('Flexion', 'leftElbow', 'flexion', modelConfig.leftElbow.flexion)}</Label>
                        <Slider
                          value={[modelConfig.leftElbow.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('leftElbow', 'flexion', value);
                            if (linkedSides.elbows) {
                              handleSliderChange('rightElbow', 'flexion', value);
                            }
                          }}
                          min={0}
                          max={145}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Carrying Angle ({modelConfig.leftElbow.carryingAngle}°)</Label>
                        <Slider
                          value={[modelConfig.leftElbow.carryingAngle]}
                          onValueChange={(value) => {
                            handleSliderChange('leftElbow', 'carryingAngle', value);
                            if (linkedSides.elbows) {
                              handleSliderChange('rightElbow', 'carryingAngle', value);
                            }
                          }}
                          min={-15}
                          max={25}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Elbow</Label>
                      <div>
                        <Label className="text-xs">Flexion ({modelConfig.rightElbow.flexion}°)</Label>
                        <Slider
                          value={[modelConfig.rightElbow.flexion]}
                          onValueChange={(value) => {
                            handleSliderChange('rightElbow', 'flexion', value);
                            if (linkedSides.elbows) {
                              handleSliderChange('leftElbow', 'flexion', value);
                            }
                          }}
                          min={0}
                          max={145}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Carrying Angle ({modelConfig.rightElbow.carryingAngle}°)</Label>
                        <Slider
                          value={[modelConfig.rightElbow.carryingAngle]}
                          onValueChange={(value) => {
                            handleSliderChange('rightElbow', 'carryingAngle', value);
                            if (linkedSides.elbows) {
                              handleSliderChange('leftElbow', 'carryingAngle', value);
                            }
                          }}
                          min={-15}
                          max={25}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-semibold">Wrist Joints</h3>

                  {/* Wrist Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Left Wrist</Label>
                      <div>
                        <Label className="text-xs">Deviation ({modelConfig.leftWrist.deviation}°)</Label>
                        <Slider
                          value={[modelConfig.leftWrist.deviation]}
                          onValueChange={(value) => handleSliderChange('leftWrist', 'deviation', value)}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Flexion ({modelConfig.leftWrist.flexion}°)</Label>
                        <Slider
                          value={[modelConfig.leftWrist.flexion]}
                          onValueChange={(value) => handleSliderChange('leftWrist', 'flexion', value)}
                          min={-80}
                          max={80}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Right Wrist</Label>
                      <div>
                        <Label className="text-xs">Deviation ({modelConfig.rightWrist.deviation}°)</Label>
                        <Slider
                          value={[modelConfig.rightWrist.deviation]}
                          onValueChange={(value) => handleSliderChange('rightWrist', 'deviation', value)}
                          min={-30}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Flexion ({modelConfig.rightWrist.flexion}°)</Label>
                        <Slider
                          value={[modelConfig.rightWrist.flexion]}
                          onValueChange={(value) => handleSliderChange('rightWrist', 'flexion', value)}
                          min={-80}
                          max={80}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      {/* Biomechanical Analysis Panel */}
      <div className="mt-6">
        <BiomechanicsPanel 
          modelConfig={{
            pelvis: modelConfig.pelvis,
            spine: modelConfig.spine,
            leftHip: modelConfig.leftHip,
            rightHip: modelConfig.rightHip,
            leftKnee: modelConfig.leftKnee,
            rightKnee: modelConfig.rightKnee,
            leftAnkle: modelConfig.leftAnkle,
            rightAnkle: modelConfig.rightAnkle,
            leftShoulder: modelConfig.leftShoulder,
            rightShoulder: modelConfig.rightShoulder,
            leftElbow: modelConfig.leftElbow,
            rightElbow: modelConfig.rightElbow,
          }}
        />
      </div>

      {/* Configuration Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium mb-1">Spine</p>
              <p className="text-muted-foreground">
                Cervical: {modelConfig.spine.cervicalLordosis}°<br/>
                Thoracic: {modelConfig.spine.thoracicKyphosis}°<br/>
                Lumbar: {modelConfig.spine.lumbarLordosis}°
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Hips</p>
              <p className="text-muted-foreground">
                L Flexion: {modelConfig.leftHip.flexion}°<br/>
                R Flexion: {modelConfig.rightHip.flexion}°
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Knees</p>
              <p className="text-muted-foreground">
                L Flexion: {modelConfig.leftKnee.flexion}°<br/>
                R Flexion: {modelConfig.rightKnee.flexion}°
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Shoulders</p>
              <p className="text-muted-foreground">
                L Flexion: {modelConfig.leftShoulder.flexion}°<br/>
                R Flexion: {modelConfig.rightShoulder.flexion}°
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}