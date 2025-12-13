import { useState, useEffect, useRef, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Link, Unlink, Copy, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number };
  pelvis: { tilt: number; obliquity: number; rotation: number };
  leftHip: { flexion: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; protraction: number; elevation: number; winging: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; protraction: number; elevation: number; winging: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
}

function RiggedSkeleton({ modelConfig }: { modelConfig: ModelConfig }) {
  const { scene } = useGLTF("/models/rigged-skeleton.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!scene) return;
    
    const degToRad = (deg: number) => deg * (Math.PI / 180);
    
    scene.traverse((child) => {
      if (child instanceof THREE.Bone || child.name) {
        const name = child.name.toLowerCase();
        
        if (name.includes("neck") || name.includes("cervical") || name.includes("head")) {
          child.rotation.x = degToRad(modelConfig.spine.cervicalLordosis);
          child.rotation.z = degToRad(modelConfig.spine.forwardHead);
        }
        if (name.includes("spine") && (name.includes("upper") || name.includes("1") || name.includes("thorac"))) {
          child.rotation.x = degToRad(modelConfig.spine.thoracicKyphosis);
          child.rotation.z = degToRad(modelConfig.spine.scoliosis);
        }
        if (name.includes("spine") && (name.includes("lower") || name.includes("2") || name.includes("lumbar"))) {
          child.rotation.x = degToRad(modelConfig.spine.lumbarLordosis);
          child.rotation.z = degToRad(modelConfig.spine.lateralShift);
        }
        if (name.includes("spine") && !name.includes("upper") && !name.includes("lower") && !name.includes("1") && !name.includes("2") && !name.includes("thorac") && !name.includes("lumbar")) {
          child.rotation.x = degToRad(modelConfig.spine.thoracicKyphosis);
        }
        if (name.includes("pelvis") || name.includes("hips")) {
          child.rotation.x = degToRad(modelConfig.pelvis.tilt);
          child.rotation.z = degToRad(modelConfig.pelvis.obliquity);
          child.rotation.y = degToRad(modelConfig.pelvis.rotation);
        }
        if ((name.includes("thigh") || name.includes("upleg") || name.includes("hip")) && (name.includes("l") || name.includes("left"))) {
          child.rotation.x = degToRad(-modelConfig.leftHip.flexion);
          child.rotation.z = degToRad(-modelConfig.leftHip.abduction);
          child.rotation.y = degToRad(modelConfig.leftHip.internalRotation);
        }
        if ((name.includes("thigh") || name.includes("upleg") || name.includes("hip")) && (name.includes("r") || name.includes("right"))) {
          child.rotation.x = degToRad(-modelConfig.rightHip.flexion);
          child.rotation.z = degToRad(modelConfig.rightHip.abduction);
          child.rotation.y = degToRad(-modelConfig.rightHip.internalRotation);
        }
        if ((name.includes("shin") || name.includes("leg") || name.includes("knee") || name.includes("calf")) && (name.includes("l") || name.includes("left")) && !name.includes("upleg") && !name.includes("thigh")) {
          child.rotation.x = degToRad(modelConfig.leftKnee.flexion);
          child.rotation.z = degToRad(modelConfig.leftKnee.varus);
          child.rotation.y = degToRad(modelConfig.leftKnee.tibialTorsion);
        }
        if ((name.includes("shin") || name.includes("leg") || name.includes("knee") || name.includes("calf")) && (name.includes("r") || name.includes("right")) && !name.includes("upleg") && !name.includes("thigh")) {
          child.rotation.x = degToRad(modelConfig.rightKnee.flexion);
          child.rotation.z = degToRad(-modelConfig.rightKnee.varus);
          child.rotation.y = degToRad(-modelConfig.rightKnee.tibialTorsion);
        }
        if ((name.includes("foot") || name.includes("ankle")) && (name.includes("l") || name.includes("left"))) {
          child.rotation.x = degToRad(-modelConfig.leftAnkle.dorsiflexion + modelConfig.leftAnkle.plantarflexion);
          child.rotation.z = degToRad(modelConfig.leftAnkle.inversion - modelConfig.leftAnkle.eversion);
        }
        if ((name.includes("foot") || name.includes("ankle")) && (name.includes("r") || name.includes("right"))) {
          child.rotation.x = degToRad(-modelConfig.rightAnkle.dorsiflexion + modelConfig.rightAnkle.plantarflexion);
          child.rotation.z = degToRad(-modelConfig.rightAnkle.inversion + modelConfig.rightAnkle.eversion);
        }
        if ((name.includes("shoulder") || name.includes("arm") || name.includes("clavicle")) && (name.includes("l") || name.includes("left")) && !name.includes("forearm") && !name.includes("hand")) {
          child.rotation.x = degToRad(-modelConfig.leftShoulder.flexion);
          child.rotation.z = degToRad(-modelConfig.leftShoulder.abduction);
          child.rotation.y = degToRad(modelConfig.leftShoulder.internalRotation);
        }
        if ((name.includes("shoulder") || name.includes("arm") || name.includes("clavicle")) && (name.includes("r") || name.includes("right")) && !name.includes("forearm") && !name.includes("hand")) {
          child.rotation.x = degToRad(-modelConfig.rightShoulder.flexion);
          child.rotation.z = degToRad(modelConfig.rightShoulder.abduction);
          child.rotation.y = degToRad(-modelConfig.rightShoulder.internalRotation);
        }
        if ((name.includes("forearm") || name.includes("elbow") || name.includes("lowarm")) && (name.includes("l") || name.includes("left"))) {
          child.rotation.x = degToRad(modelConfig.leftElbow.flexion);
          child.rotation.y = degToRad(modelConfig.leftElbow.pronation);
          child.rotation.z = degToRad(modelConfig.leftElbow.carryingAngle - 10);
        }
        if ((name.includes("forearm") || name.includes("elbow") || name.includes("lowarm")) && (name.includes("r") || name.includes("right"))) {
          child.rotation.x = degToRad(modelConfig.rightElbow.flexion);
          child.rotation.y = degToRad(-modelConfig.rightElbow.pronation);
          child.rotation.z = degToRad(-(modelConfig.rightElbow.carryingAngle - 10));
        }
      }
    });
  }, [scene, modelConfig]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={2} position={[0, -2, 0]} />
    </group>
  );
}

function SkeletonScene({ modelConfig }: { modelConfig: ModelConfig }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ background: "linear-gradient(135deg, #f0f4f8 0%, #e8ecf0 100%)" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <RiggedSkeleton modelConfig={modelConfig} />
      </Suspense>
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
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
      abduction: 0,
      internalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    rightHip: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    leftKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      patellaAlta: 0,
    },
    rightKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
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
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    rightShoulder: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    leftElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
    },
    rightElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
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
        abduction: 0,
        internalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      rightHip: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      leftKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        patellaAlta: 0,
      },
      rightKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
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
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      rightShoulder: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      leftElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
      },
      rightElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
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
            {isWebGLAvailable === null ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">Checking visualization capabilities...</p>
                </div>
              </div>
            ) : isWebGLAvailable ? (
              <SkeletonScene modelConfig={modelConfig} />
            ) : (
              <SkeletonVisualization />
            )}
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
                        max={-20}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Thoracic Kyphosis ({modelConfig.spine.thoracicKyphosis}°)</Label>
                      <Slider
                        value={[modelConfig.spine.thoracicKyphosis]}
                        onValueChange={(value) => handleSliderChange('spine', 'thoracicKyphosis', value)}
                        min={20}
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
                        max={-30}
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
                          min={-30}
                          max={120}
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
                          min={-30}
                          max={120}
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