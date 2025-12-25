import { useState, useEffect, Suspense, Component, ReactNode, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Copy, AlertCircle, Loader2, ExternalLink, Play, Pause, SkipBack, Activity, Eye, EyeOff, ArrowDown, Zap, Target, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PureThreeGLBViewer, { AnimationState, AnatomicalRegion } from "@/components/skeleton/PureThreeGLBViewer";
import MultiViewSkeletonLayout from "@/components/skeleton/MultiViewSkeletonLayout";
import PatientClonePanel from "@/components/skeleton/PatientClonePanel";
import RegionZoomControls from "@/components/skeleton/RegionZoomControls";
import { RegionInsightsPanel } from "@/components/skeleton/RegionInsightsPanel";
import { MOVEMENT_SEQUENCES } from "@/lib/movementSequences";
import BiomechanicsPanel from "@/components/skeleton/BiomechanicsPanel";
import { Grid2X2, Maximize } from "lucide-react";
import { BiomechanicsVisualizationData } from "@/lib/forceVisualization";
import { calculateFullBiomechanics } from "@/lib/biomechanicsEngine";
import { PatientCloneState } from "@/lib/patientCloneComposer";

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
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean | null>(null);
  
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
  
  const [multiViewMode, setMultiViewMode] = useState(false);
  const [showPatientClonePanel, setShowPatientClonePanel] = useState(false);
  const [zoomToRegion, setZoomToRegion] = useState<AnatomicalRegion | null>(null);

  const [patientAnthropometrics, setPatientAnthropometrics] = useState({
    heightCm: 175,
    weightKg: 75,
  });

  const handlePatientCloneUpdate = useCallback((cloneState: PatientCloneState) => {
    setModelConfig(cloneState.modelConfig);
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
  }, []);

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
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      retroversion: 0,
      elevation: 0,
      protraction: 0,
      winging: 0,
      clavicleLength: 0,
    },
    rightShoulder: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      retroversion: 0,
      elevation: 0,
      protraction: 0,
      winging: 0,
      clavicleLength: 0,
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
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        retroversion: 0,
        elevation: 0,
        protraction: 0,
        winging: 0,
        clavicleLength: 0,
      },
      rightShoulder: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        retroversion: 0,
        elevation: 0,
        protraction: 0,
        winging: 0,
        clavicleLength: 0,
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
        <h1 className="text-3xl font-bold mb-2">Skeleton Configuration Tool</h1>
        <p className="text-muted-foreground">
          Adjust anatomical parameters to create custom skeletal configurations for clinical assessment
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Visualization */}
        <Card className={multiViewMode ? "col-span-2" : ""} style={{ height: multiViewMode ? 'auto' : '600px' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Skeleton Visualization
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
                  variant={showPatientClonePanel ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPatientClonePanel(!showPatientClonePanel)}
                  className={showPatientClonePanel ? "bg-blue-600 hover:bg-blue-700" : ""}
                  data-testid="toggle-patient-clone"
                >
                  <User className="h-4 w-4 mr-1" />
                  Clone Patient
                </Button>
                {!multiViewMode && (
                  <RegionZoomControls
                    currentRegion={zoomToRegion}
                    onRegionChange={setZoomToRegion}
                  />
                )}
              </CardTitle>
              {!multiViewMode && (
                <div className="flex items-center gap-3">
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
                      Muscles
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className={multiViewMode ? "" : "h-[calc(100%-80px)]"}>
            {multiViewMode ? (
              <MultiViewSkeletonLayout
                modelPath="/models/skeleton_character.glb"
                modelConfig={modelConfig}
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
                    modelPath="/models/skeleton_character.glb" 
                    modelConfig={modelConfig} 
                    className="w-full h-full"
                    animationState={animationState}
                    onAnimationFrame={handleAnimationFrame}
                    biomechanicsData={biomechanicsData}
                    zoomToRegion={zoomToRegion}
                  />
                </Suspense>
              </GLBErrorBoundary>
            )}
          </CardContent>
        </Card>

        {/* Patient Clone Panel - Conditionally Shown */}
        {showPatientClonePanel && (
          <PatientClonePanel
            onPatientCloneUpdate={handlePatientCloneUpdate}
            currentModelConfig={modelConfig}
            className="col-span-2 lg:col-span-1"
          />
        )}

        {/* Region Insights Panel - Shows when a region is zoomed */}
        {zoomToRegion && zoomToRegion !== 'full_body' && (
          <RegionInsightsPanel
            selectedRegion={zoomToRegion}
            spineFlexion={-modelConfig.spine.lumbarLordosis}
            spineRotation={modelConfig.spine.lumbarRotation}
            spineLateralFlexion={modelConfig.spine.scoliosis}
            pelvisTilt={modelConfig.pelvis.tilt}
            bodyWeightKg={70}
            className="col-span-2 lg:col-span-1"
          />
        )}

        {/* Right Panel - Controls */}
        <Card className="h-[600px] overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Joint Parameters</CardTitle>
              <Button onClick={resetAll} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto h-[calc(100%-80px)]">
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

            <Separator className="my-4" />

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
                      <Label>Thoracic Kyphosis ({modelConfig.spine.thoracicKyphosis}°)</Label>
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
                      <Label>Lumbar Lordosis ({modelConfig.spine.lumbarLordosis}°)</Label>
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
                      <Label>Forward Head Posture ({modelConfig.neck.forwardHead}°)</Label>
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
                      <Label>Pelvic Tilt ({modelConfig.pelvis.tilt}°)</Label>
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
                        <Label className="text-xs">Flexion ({modelConfig.leftHip.flexion}°)</Label>
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
                        <Label className="text-xs">Extension ({modelConfig.leftHip.extension}°)</Label>
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
                        <Label className="text-xs">Flexion ({modelConfig.rightHip.flexion}°)</Label>
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
                        <Label className="text-xs">Flexion ({modelConfig.leftKnee.flexion}°)</Label>
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
                        <Label className="text-xs">Flexion ({modelConfig.rightKnee.flexion}°)</Label>
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
                        <Label className="text-xs">Dorsiflexion ({modelConfig.leftAnkle.dorsiflexion}°)</Label>
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
                        <Label className="text-xs">Dorsiflexion ({modelConfig.rightAnkle.dorsiflexion}°)</Label>
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
                          min={-60}
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
                          min={0}
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
                          min={0}
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
                          min={0}
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
                          min={-30}
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
                          min={-20}
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
                          min={-60}
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
                          min={0}
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
                          min={0}
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
                          min={0}
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
                          min={-30}
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
                          min={-20}
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
                        <Label className="text-xs">Flexion ({modelConfig.leftElbow.flexion}°)</Label>
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
      </div>

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