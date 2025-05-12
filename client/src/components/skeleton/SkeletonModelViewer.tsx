import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  [key: string]: any;
}

function Model({ rotationSpeed = 0, ...props }: ModelProps) {
  const groupRef = useRef<Group>(null);
  
  // Load the GLB model
  let { scene } = useGLTF(MODEL_PATH);
  
  // Clone the scene to avoid mutating the cached original
  scene = scene.clone();
  
  // Auto-rotate if speed is provided
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model
useGLTF.preload(MODEL_PATH);

export default function SkeletonModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [activeTab, setActiveTab] = useState("view");
  
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
                  <ambientLight intensity={0.5} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                  <PresentationControls
                    global
                    zoom={0.8}
                    rotation={[0, 0, 0]}
                    polar={[-Math.PI / 4, Math.PI / 4]}
                    azimuth={[-Math.PI / 4, Math.PI / 4]}>
                    <Model rotationSpeed={rotationSpeed} />
                  </PresentationControls>
                  <OrbitControls enableZoom={true} enablePan={true} />
                  <Environment preset="city" />
                </Canvas>
              </Suspense>
            </div>
          </TabsContent>
          
          <TabsContent value="controls" className="space-y-4">
            <div>
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
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
              >
                Stop Rotation
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset view - this is handled by OrbitControls reset
                  // but we'd need to access its ref to call reset()
                  window.location.reload();
                }}
              >
                Reset View
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}