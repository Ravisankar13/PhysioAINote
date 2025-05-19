import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import * as THREE from 'three';

type BoneProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color?: string;
};

// Simple bone component to create a basic skeleton representation
function Bone({ position, rotation = [0, 0, 0], scale, color = '#f0e6d8' }: BoneProps) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

type JointProps = {
  position: [number, number, number];
  size?: number;
  color?: string;
};

// Simple joint component
function Joint({ position, size = 0.15, color = '#d1c7b7' }: JointProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

type SkeletonModelProps = {
  rotationSpeed: number;
};

function SimpleSkeletonModel({ rotationSpeed = 0 }: SkeletonModelProps) {
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
      <Bone position={[0, 2, 0]} scale={[0.4, 0.5, 0.4]} />
      
      {/* Neck */}
      <Bone position={[0, 1.6, 0]} scale={[0.2, 0.3, 0.2]} />
      
      {/* Torso */}
      <Bone position={[0, 0.8, 0]} scale={[0.8, 1.2, 0.4]} />
      
      {/* Left Arm */}
      <Joint position={[-0.5, 1.4, 0]} />
      <Bone position={[-0.8, 1.2, 0]} rotation={[0, 0, -0.5]} scale={[0.6, 0.2, 0.2]} />
      <Joint position={[-1.1, 1.0, 0]} />
      <Bone position={[-1.4, 0.8, 0]} rotation={[0, 0, -0.3]} scale={[0.6, 0.18, 0.18]} />
      
      {/* Right Arm */}
      <Joint position={[0.5, 1.4, 0]} />
      <Bone position={[0.8, 1.2, 0]} rotation={[0, 0, 0.5]} scale={[0.6, 0.2, 0.2]} />
      <Joint position={[1.1, 1.0, 0]} />
      <Bone position={[1.4, 0.8, 0]} rotation={[0, 0, 0.3]} scale={[0.6, 0.18, 0.18]} />
      
      {/* Pelvis */}
      <Bone position={[0, 0.2, 0]} scale={[0.6, 0.3, 0.3]} />
      
      {/* Left Leg */}
      <Joint position={[-0.3, 0, 0]} />
      <Bone position={[-0.3, -0.5, 0]} scale={[0.25, 0.8, 0.25]} />
      <Joint position={[-0.3, -1, 0]} />
      <Bone position={[-0.3, -1.5, 0]} scale={[0.22, 0.8, 0.22]} />
      
      {/* Right Leg */}
      <Joint position={[0.3, 0, 0]} />
      <Bone position={[0.3, -0.5, 0]} scale={[0.25, 0.8, 0.25]} />
      <Joint position={[0.3, -1, 0]} />
      <Bone position={[0.3, -1.5, 0]} scale={[0.22, 0.8, 0.22]} />
    </group>
  );
}

export default function SkeletonModelViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Viewer - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container">
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted">Loading 3D Model...</div>}>
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                  <ambientLight intensity={0.8} />
                  <pointLight position={[10, 10, 10]} intensity={0.6} />
                  <pointLight position={[-10, -10, -5]} intensity={0.4} />
                  <SimpleSkeletonModel rotationSpeed={rotationSpeed} />
                  <OrbitControls 
                    enableZoom={true} 
                    enablePan={true} 
                    minDistance={3} 
                    maxDistance={10}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 1.5}
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}