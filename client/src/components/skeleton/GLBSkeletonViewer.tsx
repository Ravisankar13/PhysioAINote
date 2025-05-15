import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as THREE from 'three';

// Create a basic skeleton model using primitives
function SkeletonModel({ rotationSpeed = 0 }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Auto-rotate if speed is provided
  useFrame(() => {
    if (groupRef.current && rotationSpeed) {
      groupRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Skull */}
      <mesh position={[0, 2, 0]} scale={[0.4, 0.5, 0.4]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.6, 0]} scale={[0.2, 0.3, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Torso */}
      <mesh position={[0, 0.8, 0]} scale={[0.8, 1.2, 0.4]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Left Arm */}
      <mesh position={[-0.5, 1.4, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[-0.8, 1.2, 0]} rotation={[0, 0, -0.5]} scale={[0.6, 0.2, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      <mesh position={[-1.1, 1.0, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[-1.4, 0.8, 0]} rotation={[0, 0, -0.3]} scale={[0.6, 0.18, 0.18]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Right Arm */}
      <mesh position={[0.5, 1.4, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[0.8, 1.2, 0]} rotation={[0, 0, 0.5]} scale={[0.6, 0.2, 0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      <mesh position={[1.1, 1.0, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[1.4, 0.8, 0]} rotation={[0, 0, 0.3]} scale={[0.6, 0.18, 0.18]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Pelvis */}
      <mesh position={[0, 0.2, 0]} scale={[0.6, 0.3, 0.3]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.3, 0, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[-0.3, -0.5, 0]} scale={[0.25, 0.8, 0.25]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      <mesh position={[-0.3, -1, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[-0.3, -1.5, 0]} scale={[0.22, 0.8, 0.22]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.3, 0, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[0.3, -0.5, 0]} scale={[0.25, 0.8, 0.25]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
      <mesh position={[0.3, -1, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#d1c7b7" />
      </mesh>
      <mesh position={[0.3, -1.5, 0]} scale={[0.22, 0.8, 0.22]}>
        <boxGeometry />
        <meshStandardMaterial color="#f0e6d8" />
      </mesh>
    </group>
  );
}

export default function GLBSkeletonViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);

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
                >
                  <ambientLight intensity={0.7} />
                  <pointLight position={[10, 10, 10]} intensity={0.5} />
                  <pointLight position={[-10, -10, -5]} intensity={0.5} />
                  
                  <SkeletonModel rotationSpeed={rotationSpeed} />
                  
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
                  <li>Detailed anatomical model</li>
                  <li>Movement animations</li>
                  <li>Posture analysis</li>
                  <li>Customizable anatomy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}