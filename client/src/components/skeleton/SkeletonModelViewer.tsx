import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PresentationControls } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import * as THREE from 'three';
import { Group } from 'three';

// Import skeleton model
const MODEL_PATH = "/skeleton_rig.glb"; // New skeletal rig from Sketchfab

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
  // useGLTF returns a cached result, so this is efficient
  const { scene } = useGLTF(MODEL_PATH);
  const sceneRef = useRef<THREE.Object3D | null>(null);
  
  // Initialize the scene only once
  useEffect(() => {
    // Clone the scene to avoid mutating the cached original
    if (!sceneRef.current) {
      sceneRef.current = scene.clone();
      
      // Initial positioning and scale for the new skeleton model
      if (sceneRef.current) {
        // Center the model properly - adjusted for the new skeletal model
        sceneRef.current.position.set(0, -0.8, 0);
        
        // Set initial scale for better visibility - adjusted for the new skeletal model
        sceneRef.current.scale.set(1.2, 1.2, 1.2);
        
        // Initial rotation to face forward
        sceneRef.current.rotation.set(0, Math.PI, 0);
      }
    }
  }, [scene]);
  
  // Apply scaling whenever limbScales changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Find and scale specific bone groups in the model
    sceneRef.current.traverse((object) => {
      // Skip if not a mesh (we only want to scale actual visible parts)
      if (!(object instanceof THREE.Mesh)) return;
      
      // Get original scale if not yet set
      if (!object.userData.originalScale) {
        object.userData.originalScale = object.scale.clone();
      }
      
      // Reset to original scale first
      const originalScale = object.userData.originalScale;
      object.scale.copy(originalScale);
      
      const name = object.name.toLowerCase();
      
      // Scale arms - add or modify these conditions based on the actual model structure
      if (name.includes('arm') || name.includes('shoulder') || 
          name.includes('humerus') || name.includes('radius') || 
          name.includes('ulna') || name.includes('upper_arm') || 
          name.includes('forearm')) {
        object.scale.multiplyScalar(limbScales.arms);
      }
      // Scale legs
      else if (name.includes('leg') || name.includes('femur') || 
              name.includes('tibia') || name.includes('fibula') || 
              name.includes('thigh') || name.includes('shin')) {
        object.scale.multiplyScalar(limbScales.legs);
      }
      // Scale torso
      else if (name.includes('spine') || name.includes('rib') || 
              name.includes('chest') || name.includes('torso') || 
              name.includes('pelvis') || name.includes('trunk') ||
              name.includes('vertebrae')) {
        object.scale.multiplyScalar(limbScales.torso);
      }
      // Scale hands
      else if (name.includes('hand') || name.includes('finger') || 
              name.includes('wrist') || name.includes('palm')) {
        object.scale.multiplyScalar(limbScales.hands);
      }
      // Scale feet
      else if (name.includes('foot') || name.includes('ankle') || 
              name.includes('toe') || name.includes('heel')) {
        object.scale.multiplyScalar(limbScales.feet);
      }
      // Scale head
      else if (name.includes('head') || name.includes('skull') || 
              name.includes('cranium') || name.includes('neck') ||
              name.includes('mandible') || name.includes('jaw')) {
        object.scale.multiplyScalar(limbScales.head);
      }
    });
  }, [limbScales]);
  
  // Auto-rotate if speed is provided
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  // Only render if we have a scene
  if (!sceneRef.current) return null;

  return (
    <group ref={groupRef} {...props}>
      <primitive object={sceneRef.current} />
    </group>
  );
}

// Preload the model
useGLTF.preload(MODEL_PATH);

export default function SkeletonModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Viewer - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container">
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted">Loading 3D Model...</div>}>
                <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} key={`canvas-${JSON.stringify(limbScales)}`}>
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
                  <OrbitControls enableZoom={true} enablePan={true} minDistance={2} maxDistance={10} />
                  <Environment preset="sunset" />
                </Canvas>
              </Suspense>
            </div>
            {/* Reset animation styles */}
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
            
            <div className="mt-2">
              <h4 className="text-md font-medium mb-2">Limb Size Adjustments</h4>
              
              {Object.entries(limbScales).map(([limb, scale]) => (
                <div key={limb} className="mb-3">
                  <Label htmlFor={`${limb}-scale`} className="capitalize text-sm">
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
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
                size="sm"
              >
                Stop Rotation
              </Button>
              <Button
                variant="outline"
                onClick={resetLimbScales}
                size="sm"
              >
                Reset Limb Sizes
              </Button>
              <Button
                variant="default"
                className="col-span-2 mt-2"
                size="sm"
                onClick={() => {
                  // Reset everything
                  setRotationSpeed(0);
                  resetLimbScales();
                  // Force a re-render of the model
                  const modelContainer = document.querySelector('.model-container');
                  if (modelContainer) {
                    modelContainer.classList.add('reset-animation');
                    setTimeout(() => {
                      modelContainer.classList.remove('reset-animation');
                    }, 300);
                  }
                }}
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}