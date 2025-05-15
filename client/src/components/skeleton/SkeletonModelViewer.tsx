import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PresentationControls } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import * as THREE from 'three';
import { Group } from 'three';

// Import skeleton model - Using a direct URL to the model for reliable loading
const MODEL_PATH = "https://raw.githubusercontent.com/pmndrs/drei-assets/master/models/LittlestTokyo.glb";

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

function Model({ rotationSpeed = 0, ...props }: ModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_PATH);
  
  // Auto-rotate if speed is provided
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} position={[0, -1, 0]} scale={[0.01, 0.01, 0.01]} />
    </group>
  );
}

// Preload the model
useGLTF.preload(MODEL_PATH);

export default function SkeletonModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  
  // Default scales for the temporary model
  const limbScales = {
    arms: 1,
    legs: 1,
    torso: 1,
    hands: 1,
    feet: 1,
    head: 1
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Viewer - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container">
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted">Loading 3D Model...</div>}>
                <Canvas camera={{ position: [5, 2, 5], fov: 50 }}>
                  <ambientLight intensity={0.8} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={0.7} />
                  <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} intensity={0.4} />
                  <PresentationControls
                    global
                    zoom={1}
                    rotation={[0, 0, 0]}
                    polar={[-Math.PI / 3, Math.PI / 3]}
                    azimuth={[-Math.PI / 3, Math.PI / 3]}>
                    <Model rotationSpeed={rotationSpeed} limbScales={limbScales} />
                  </PresentationControls>
                  <OrbitControls enableZoom={true} enablePan={true} />
                  <Environment preset="sunset" />
                </Canvas>
              </Suspense>
            </div>
          </div>
          
          {/* Adjustment Controls - takes up 4/12 columns on medium screens and above */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-lg font-semibold">Adjustment Controls</h3>
            
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
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
                size="sm"
              >
                Stop Rotation
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                This 3D model is a temporary placeholder that will be replaced with
                the skeletal model in an upcoming update. Currently, it's available for
                visualizing spatial relationships and practicing rotation controls.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}