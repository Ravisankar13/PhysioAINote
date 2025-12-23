import { useState, useEffect, Component, Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Link, Unlink, Copy, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RiggedAnatomicalSkeleton = lazy(() => import("@/components/3d/RiggedAnatomicalSkeleton"));

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SkeletonErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function TestSkeleton() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);
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
      cervicalLordosis: -40,
      thoracicKyphosis: 35,
      lumbarLordosis: -50,
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
      adduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    rightHip: {
      flexion: 0,
      extension: 0,
      abduction: 0,
      adduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    leftKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      patellaAlta: 0,
      anteriorTranslation: 0,
    },
    rightKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      patellaAlta: 0,
      anteriorTranslation: 0,
    },
    leftAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
      halluxValgus: 0,
    },
    rightAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
      halluxValgus: 0,
    },
    leftShoulder: {
      flexion: 0,
      extension: 0,
      abduction: 0,
      adduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    rightShoulder: {
      flexion: 0,
      extension: 0,
      abduction: 0,
      adduction: 0,
      internalRotation: 0,
      externalRotation: 0,
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    leftElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
      supination: 0,
    },
    rightElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
      supination: 0,
    },
    spinalPathology: {
      spineFlexion: 0,
      spineLateralFlexion: 0,
      spineRotation: 0,
    },
    shoulderPathology: {
      shoulderFlexion: 0,
      shoulderAbduction: 0,
      shoulderRotation: 0,
    },
    lowerLimbPathology: {
      hipFlexion: 0,
      hipAbduction: 0,
      hipRotation: 0,
      kneeFlexion: 0,
      ankleDorsiflexion: 0,
    },
  });

  const updateLimbScale = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      limbScales: {
        ...prev.limbScales,
        [key]: value
      }
    }));
  };

  const updateSpine = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      spine: {
        ...prev.spine,
        [key]: value
      },
      // Update legacy spinalPathology for compatibility
      spinalPathology: {
        spineFlexion: key === 'cervicalLordosis' ? value : prev.spinalPathology.spineFlexion,
        spineLateralFlexion: key === 'scoliosis' ? value : prev.spinalPathology.spineLateralFlexion,
        spineRotation: key === 'lateralShift' ? value : prev.spinalPathology.spineRotation,
      }
    }));
  };

  const updatePelvis = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      pelvis: {
        ...prev.pelvis,
        [key]: value
      }
    }));
  };

  const updateJoint = (joint: string, side: 'left' | 'right', key: string, value: number) => {
    const jointKey = `${side}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    
    setModelConfig(prev => {
      const newConfig = {
        ...prev,
        [jointKey]: {
          ...prev[jointKey],
          [key]: value
        }
      };

      // If sides are linked, update the opposite side too
      if (linkedSides[joint as keyof typeof linkedSides]) {
        const oppositeJointKey = `${side === 'left' ? 'right' : 'left'}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
        newConfig[oppositeJointKey] = {
          ...newConfig[oppositeJointKey],
          [key]: value
        };
      }

      // Update legacy pathology for hips/knees/ankles
      if (joint === 'hip' && key === 'flexion') {
        newConfig.lowerLimbPathology = {
          ...prev.lowerLimbPathology,
          hipFlexion: value
        };
      } else if (joint === 'hip' && key === 'abduction') {
        newConfig.lowerLimbPathology = {
          ...prev.lowerLimbPathology,
          hipAbduction: value
        };
      } else if (joint === 'hip' && key === 'internalRotation') {
        newConfig.lowerLimbPathology = {
          ...prev.lowerLimbPathology,
          hipRotation: value
        };
      } else if (joint === 'knee' && key === 'flexion') {
        newConfig.lowerLimbPathology = {
          ...prev.lowerLimbPathology,
          kneeFlexion: value
        };
      } else if (joint === 'ankle' && key === 'dorsiflexion') {
        newConfig.lowerLimbPathology = {
          ...prev.lowerLimbPathology,
          ankleDorsiflexion: value
        };
      } else if (joint === 'shoulder' && key === 'flexion') {
        newConfig.shoulderPathology = {
          ...prev.shoulderPathology,
          shoulderFlexion: value
        };
      } else if (joint === 'shoulder' && key === 'abduction') {
        newConfig.shoulderPathology = {
          ...prev.shoulderPathology,
          shoulderAbduction: value
        };
      } else if (joint === 'shoulder' && key === 'internalRotation') {
        newConfig.shoulderPathology = {
          ...prev.shoulderPathology,
          shoulderRotation: value
        };
      }

      return newConfig;
    });
  };

  const copyToOpposite = (joint: string, fromSide: 'left' | 'right') => {
    const fromKey = `${fromSide}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    const toKey = `${fromSide === 'left' ? 'right' : 'left'}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    
    setModelConfig(prev => ({
      ...prev,
      [toKey]: { ...prev[fromKey] }
    }));
  };

  const toggleLinkedSides = (joint: keyof typeof linkedSides) => {
    setLinkedSides(prev => ({
      ...prev,
      [joint]: !prev[joint]
    }));
  };

  // Keep old update functions for backward compatibility
  const updateSpinePathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      spinalPathology: {
        ...prev.spinalPathology,
        [key]: value
      }
    }));
  };

  const updateShoulderPathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      shoulderPathology: {
        ...prev.shoulderPathology,
        [key]: value
      }
    }));
  };

  const updateLowerLimbPathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      lowerLimbPathology: {
        ...prev.lowerLimbPathology,
        [key]: value
      }
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
        cervicalLordosis: -40,
        thoracicKyphosis: 35,
        lumbarLordosis: -50,
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
        adduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      rightHip: {
        flexion: 0,
        extension: 0,
        abduction: 0,
        adduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      leftKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        patellaAlta: 0,
        anteriorTranslation: 0,
      },
      rightKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        patellaAlta: 0,
        anteriorTranslation: 0,
      },
      leftAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
        halluxValgus: 0,
      },
      rightAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
        halluxValgus: 0,
      },
      leftShoulder: {
        flexion: 0,
        extension: 0,
        abduction: 0,
        adduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      rightShoulder: {
        flexion: 0,
        extension: 0,
        abduction: 0,
        adduction: 0,
        internalRotation: 0,
        externalRotation: 0,
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      leftElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
        supination: 0,
      },
      rightElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
        supination: 0,
      },
      spinalPathology: {
        spineFlexion: 0,
        spineLateralFlexion: 0,
        spineRotation: 0,
      },
      shoulderPathology: {
        shoulderFlexion: 0,
        shoulderAbduction: 0,
        shoulderRotation: 0,
      },
      lowerLimbPathology: {
        hipFlexion: 0,
        hipAbduction: 0,
        hipRotation: 0,
        kneeFlexion: 0,
        ankleDorsiflexion: 0,
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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">3D Anatomical Skeleton Test - Interactive Controls</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Model Display */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Rigged Skeleton Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[700px] bg-gray-100 rounded-lg overflow-hidden">
              {webglAvailable === null ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                  <span className="ml-2 text-green-400">Checking WebGL support...</span>
                </div>
              ) : webglAvailable === false ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-6">
                  <AlertCircle className="h-12 w-12 text-amber-600 mb-4" />
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">3D Viewer Unavailable</h3>
                  <p className="text-sm text-amber-700 text-center mb-4 max-w-md">
                    WebGL is required to display the 3D skeleton model. The Replit preview environment 
                    may have limited WebGL support.
                  </p>
                  <Alert className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>How to view the 3D model</AlertTitle>
                    <AlertDescription>
                      Open this app in a new browser tab or deploy it to see the full 3D visualization. 
                      The control sliders on the right are still functional.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <SkeletonErrorBoundary
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-6">
                      <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                      <h3 className="text-lg font-semibold text-red-800 mb-2">3D Viewer Error</h3>
                      <p className="text-sm text-red-700 text-center">
                        The 3D viewer encountered an error. Please try opening in a new browser tab.
                      </p>
                    </div>
                  }
                >
                  <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                      <span className="ml-2 text-green-400">Loading 3D Model...</span>
                    </div>
                  }>
                    <RiggedAnatomicalSkeleton 
                      patientData={{
                        anthropometrics: {
                          height: 170,
                          weight: 70,
                        },
                        jointRestrictions: {},
                        painAreas: [],
                        movementPatterns: null
                      }}
                      modelConfig={modelConfig}
                      className="w-full h-full"
                      showControls={false}
                    />
                  </Suspense>
                </SkeletonErrorBoundary>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Control Panel */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Skeleton Controls</CardTitle>
              <Button 
                onClick={resetAll} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="proportions" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="proportions">Proportions</TabsTrigger>
                <TabsTrigger value="spine">Spine & Pelvis</TabsTrigger>
                <TabsTrigger value="lower">Lower Body</TabsTrigger>
                <TabsTrigger value="upper">Upper Body</TabsTrigger>
              </TabsList>

              <TabsContent value="proportions" className="space-y-4">
                <div>
                  <Label>Overall Scale: {modelConfig.limbScales.overall.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.overall]}
                    onValueChange={([value]) => updateLimbScale('overall', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Upper Arm Length: {modelConfig.limbScales.upperArm.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.upperArm]}
                    onValueChange={([value]) => updateLimbScale('upperArm', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Forearm Length: {modelConfig.limbScales.forearm.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.forearm]}
                    onValueChange={([value]) => updateLimbScale('forearm', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Thigh Length: {modelConfig.limbScales.thigh.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.thigh]}
                    onValueChange={([value]) => updateLimbScale('thigh', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Shin Length: {modelConfig.limbScales.shin.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.shin]}
                    onValueChange={([value]) => updateLimbScale('shin', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="joints" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Spine</h3>
                  <div>
                    <Label>Flexion/Extension: {modelConfig.spinalPathology.spineFlexion}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineFlexion]}
                      onValueChange={([value]) => updateSpinePathology('spineFlexion', value)}
                      min={-45}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Lateral Flexion: {modelConfig.spinalPathology.spineLateralFlexion}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineLateralFlexion]}
                      onValueChange={([value]) => updateSpinePathology('spineLateralFlexion', value)}
                      min={-30}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Rotation: {modelConfig.spinalPathology.spineRotation}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineRotation]}
                      onValueChange={([value]) => updateSpinePathology('spineRotation', value)}
                      min={-45}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Shoulder</h3>
                  <div>
                    <Label>Flexion: {modelConfig.shoulderPathology.shoulderFlexion}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderFlexion]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderFlexion', value)}
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Abduction: {modelConfig.shoulderPathology.shoulderAbduction}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderAbduction]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderAbduction', value)}
                      min={0}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Rotation: {modelConfig.shoulderPathology.shoulderRotation}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderRotation]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderRotation', value)}
                      min={-90}
                      max={90}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Hip & Lower Limb</h3>
                  <div>
                    <Label>Hip Flexion: {modelConfig.lowerLimbPathology.hipFlexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.hipFlexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('hipFlexion', value)}
                      min={-30}
                      max={120}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Hip Abduction: {modelConfig.lowerLimbPathology.hipAbduction}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.hipAbduction]}
                      onValueChange={([value]) => updateLowerLimbPathology('hipAbduction', value)}
                      min={0}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Knee Flexion: {modelConfig.lowerLimbPathology.kneeFlexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.kneeFlexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('kneeFlexion', value)}
                      min={0}
                      max={135}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Ankle Dorsiflexion: {modelConfig.lowerLimbPathology.ankleDorsiflexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.ankleDorsiflexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('ankleDorsiflexion', value)}
                      min={-50}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}