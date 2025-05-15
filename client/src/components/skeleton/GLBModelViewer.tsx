import { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as THREE from 'three';

// Define available models for selection
const models = [
  { name: "Skeletal Rig", path: "/models/skeleton_rig.glb" },
  { name: "Model 1", path: "/models/caf02234-7cac-41a3-b9ac-9f738a212fa6.glb" },
  { name: "Model 2", path: "/models/f13554ef-1daa-49cc-bd2d-ff0cdf430bde.glb" },
];

// Model component that loads and displays the GLB file
function Model({ url, rotation = 0 }: { url: string; rotation: number }) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  
  // Clone the scene to avoid any issues with reusing the same scene
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  // Apply rotation to the model
  useFrame(() => {
    if (ref.current && rotation) {
      ref.current.rotation.y += rotation * 0.01;
    }
  });
  
  return (
    <group ref={ref}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Clear the cache to prevent memory leaks
useGLTF.preload("/models/skeleton_rig.glb");

export default function GLBModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [selectedModel, setSelectedModel] = useState(models[0].path);
  const [loadError, setLoadError] = useState(false);
  
  // Handle errors during model loading
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("3D model loading error:", error);
      setLoadError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (loadError) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center p-8">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-400 mx-auto mb-4"
            >
              <circle cx="12" cy="4" r="2"></circle>
              <line x1="12" y1="6" x2="12" y2="10"></line>
              <line x1="12" y1="10" x2="16" y2="14"></line>
              <line x1="12" y1="10" x2="8" y2="14"></line>
              <line x1="12" y1="10" x2="12" y2="16"></line>
              <line x1="12" y1="16" x2="14" y2="20"></line>
              <line x1="12" y1="16" x2="10" y2="20"></line>
            </svg>
            <h3 className="text-lg font-medium mb-2">Error Loading 3D Model</h3>
            <p className="text-muted-foreground mb-4">
              We encountered an issue while loading the 3D model. 
              This could be due to browser limitations or compatibility issues.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setLoadError(false);
                window.location.reload();
              }}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Viewer - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container">
              {/* The Canvas element for the 3D viewer */}
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="text-center">
                    <div className="inline-flex animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                    <p>Loading 3D Model...</p>
                  </div>
                </div>
              }>
                <Canvas 
                  camera={{ position: [0, 0, 5], fov: 45 }}
                  onError={(e) => {
                    console.error("Canvas error:", e);
                    setLoadError(true);
                  }}
                >
                  <Stage environment="city" intensity={0.5}>
                    <Model url={selectedModel} rotation={rotationSpeed} />
                  </Stage>
                  <OrbitControls 
                    enableZoom={true} 
                    enablePan={true} 
                    minDistance={2} 
                    maxDistance={10}
                  />
                </Canvas>
              </Suspense>
            </div>
          </div>
          
          {/* Adjustment Controls - takes up 4/12 columns on medium screens and above */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-lg font-semibold">Interactive Controls</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-select" className="mb-2 block">Select Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={(value) => setSelectedModel(value)}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.path} value={model.path}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
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
            </div>
            
            <div className="mt-6 space-y-4">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
                size="sm"
                className="w-full"
              >
                Stop Rotation
              </Button>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Interaction Tips:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Drag to rotate the model</li>
                  <li>Scroll to zoom in and out</li>
                  <li>Right-click and drag to pan</li>
                  <li>Double-click to reset the view</li>
                </ul>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-2">Coming Soon:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Movement animations</li>
                  <li>Posture analysis</li>
                  <li>Customizable anatomy</li>
                  <li>Measurement tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}