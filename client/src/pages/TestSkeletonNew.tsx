import { useState, useEffect, Suspense, Component, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Copy, AlertCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PureThreeGLBViewer from "@/components/skeleton/PureThreeGLBViewer";

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
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number };
  pelvis: { tilt: number; obliquity: number; rotation: number };
  leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; protraction: number; elevation: number; winging: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; protraction: number; elevation: number; winging: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
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
    },
    pelvis: {
      tilt: 0,
      obliquity: 0,
      rotation: 0,
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
      retroversion: 0,
      elevation: 0,
      protraction: 0,
      winging: 0,
    },
    rightShoulder: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      retroversion: 0,
      elevation: 0,
      protraction: 0,
      winging: 0,
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
      },
      pelvis: {
        tilt: 0,
        obliquity: 0,
        rotation: 0,
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
        retroversion: 0,
        elevation: 0,
        protraction: 0,
        winging: 0,
      },
      rightShoulder: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        retroversion: 0,
        elevation: 0,
        protraction: 0,
        winging: 0,
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

      {isWebGLAvailable === false && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limited Visualization</AlertTitle>
          <AlertDescription>
            3D visualization requires WebGL which is not available in this environment. 
            Showing simplified skeleton view. The configuration controls are still fully functional.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Visualization */}
        <Card className="h-[600px]">
          <CardHeader>
            <CardTitle>Skeleton Visualization</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)]">
            <GLBErrorBoundary
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-4">
                  <AlertCircle className="h-12 w-12 text-amber-600 mb-4" />
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">3D Viewer Unavailable</h3>
                  <p className="text-sm text-amber-700 text-center mb-4">
                    WebGL is required to display the GLB skeleton model. 
                    The 3D viewer will work when you deploy this app or view it in a browser with WebGL support.
                  </p>
                  <p className="text-xs text-amber-600">
                    GLB Model: /models/skeleton_character.glb
                  </p>
                </div>
              }
            >
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading GLB model...</span>
                </div>
              }>
                <PureThreeGLBViewer modelPath="/models/skeleton_character.glb" modelConfig={modelConfig} className="w-full h-full" />
              </Suspense>
            </GLBErrorBoundary>
          </CardContent>
        </Card>

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