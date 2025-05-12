import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PresentationControls } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as THREE from 'three';
import { Group } from 'three';

// Import skeleton model
const MODEL_PATH = "/caf02234-7cac-41a3-b9ac-9f738a212fa6.glb";

interface ModelProps {
  rotationSpeed?: number;
  limbScales: {
    arms: number;
    legs: number;
    torso: number;
    hands: number;
    feet: number;
    head: number;
  };
  [key: string]: any;
}

function Model({ rotationSpeed = 0, limbScales, ...props }: ModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene, nodes } = useGLTF(MODEL_PATH);
  const { camera } = useThree();
  
  // Clone the scene to avoid mutating the cached original
  const clonedScene = scene.clone();
  
  // Apply different scales to different body parts
  useEffect(() => {
    if (clonedScene) {
      // Find and scale specific bone groups in the model
      clonedScene.traverse((object) => {
        // Scale arms
        if (object.name && (object.name.toLowerCase().includes('arm') || 
                           object.name.toLowerCase().includes('shoulder') ||
                           object.name.toLowerCase().includes('humerus') ||
                           object.name.toLowerCase().includes('radius') ||
                           object.name.toLowerCase().includes('ulna'))) {
          object.scale.set(limbScales.arms, limbScales.arms, limbScales.arms);
        }
        
        // Scale legs
        else if (object.name && (object.name.toLowerCase().includes('leg') || 
                               object.name.toLowerCase().includes('femur') ||
                               object.name.toLowerCase().includes('tibia') ||
                               object.name.toLowerCase().includes('fibula') ||
                               object.name.toLowerCase().includes('thigh'))) {
          object.scale.set(limbScales.legs, limbScales.legs, limbScales.legs);
        }
        
        // Scale torso
        else if (object.name && (object.name.toLowerCase().includes('spine') || 
                               object.name.toLowerCase().includes('rib') ||
                               object.name.toLowerCase().includes('chest') ||
                               object.name.toLowerCase().includes('torso') ||
                               object.name.toLowerCase().includes('pelvis'))) {
          object.scale.set(limbScales.torso, limbScales.torso, limbScales.torso);
        }
        
        // Scale hands
        else if (object.name && (object.name.toLowerCase().includes('hand') || 
                               object.name.toLowerCase().includes('finger') ||
                               object.name.toLowerCase().includes('wrist'))) {
          object.scale.set(limbScales.hands, limbScales.hands, limbScales.hands);
        }
        
        // Scale feet
        else if (object.name && (object.name.toLowerCase().includes('foot') || 
                               object.name.toLowerCase().includes('ankle') ||
                               object.name.toLowerCase().includes('toe'))) {
          object.scale.set(limbScales.feet, limbScales.feet, limbScales.feet);
        }
        
        // Scale head
        else if (object.name && (object.name.toLowerCase().includes('head') || 
                               object.name.toLowerCase().includes('skull') ||
                               object.name.toLowerCase().includes('cranium') ||
                               object.name.toLowerCase().includes('neck'))) {
          object.scale.set(limbScales.head, limbScales.head, limbScales.head);
        }
      });
    }
  }, [limbScales, clonedScene]);
  
  // Auto-rotate if speed is provided
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the model
useGLTF.preload(MODEL_PATH);

export default function SkeletonModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [activeTab, setActiveTab] = useState("view");
  
  // State for limb adjustments
  const [limbScales, setLimbScales] = useState({
    arms: 1,
    legs: 1,
    torso: 1,
    hands: 1,
    feet: 1,
    head: 1
  });
  
  const handleLimbScaleChange = (limbName: string, value: number) => {
    setLimbScales(prev => ({
      ...prev,
      [limbName]: value
    }));
  };
  
  const resetLimbScales = () => {
    setLimbScales({
      arms: 1,
      legs: 1,
      torso: 1,
      hands: 1,
      feet: 1,
      head: 1
    });
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="view" className="flex-1">View Model</TabsTrigger>
            <TabsTrigger value="controls" className="flex-1">Adjust Controls</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="w-full">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border">
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted">Loading 3D Model...</div>}>
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                  <ambientLight intensity={0.7} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                  <PresentationControls
                    global
                    zoom={0.8}
                    rotation={[0, 0, 0]}
                    polar={[-Math.PI / 4, Math.PI / 4]}
                    azimuth={[-Math.PI / 4, Math.PI / 4]}>
                    <Model rotationSpeed={rotationSpeed} limbScales={limbScales} />
                  </PresentationControls>
                  <OrbitControls enableZoom={true} enablePan={true} />
                  <Environment preset="city" />
                </Canvas>
              </Suspense>
            </div>
          </TabsContent>
          
          <TabsContent value="controls" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rotation-speed">Model Rotation Speed</Label>
              <Slider
                id="rotation-speed"
                min={0}
                max={10}
                step={0.1}
                value={[rotationSpeed]}
                onValueChange={(values) => setRotationSpeed(values[0])}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>None</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Limb Size Adjustments</h3>
              
              {Object.entries(limbScales).map(([limb, scale]) => (
                <div key={limb} className="mb-4">
                  <Label htmlFor={`${limb}-scale`} className="capitalize">
                    {limb} Size: <span className="font-medium">{scale.toFixed(2)}</span>
                  </Label>
                  <Slider
                    id={`${limb}-scale`}
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={[scale]}
                    onValueChange={(values) => handleLimbScaleChange(limb, values[0])}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
              >
                Stop Rotation
              </Button>
              <Button
                variant="outline"
                onClick={resetLimbScales}
              >
                Reset Limb Sizes
              </Button>
              <Button
                variant="default"
                className="col-span-2 mt-2"
                onClick={() => {
                  // Reset everything
                  setRotationSpeed(0);
                  resetLimbScales();
                  window.location.reload();
                }}
              >
                Reset All
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}