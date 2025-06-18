import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw } from 'lucide-react';

interface BodyRegion {
  name: string;
  displayName: string;
  position: [number, number, number];
  color: string;
}

interface InteractiveSkeletonProps {
  onRegionSelect: (region: string, displayName: string) => void;
  selectedRegion?: string;
}

const bodyRegions: BodyRegion[] = [
  { name: 'head', displayName: 'Head & Neck', position: [0, 1.6, 0], color: '#ef4444' },
  { name: 'shoulder_left', displayName: 'Left Shoulder', position: [-0.3, 1.4, 0], color: '#f97316' },
  { name: 'shoulder_right', displayName: 'Right Shoulder', position: [0.3, 1.4, 0], color: '#f97316' },
  { name: 'chest', displayName: 'Chest & Thorax', position: [0, 1.2, 0], color: '#eab308' },
  { name: 'back', displayName: 'Back & Spine', position: [0, 1.0, -0.1], color: '#84cc16' },
  { name: 'elbow_left', displayName: 'Left Elbow', position: [-0.4, 1.0, 0], color: '#06b6d4' },
  { name: 'elbow_right', displayName: 'Right Elbow', position: [0.4, 1.0, 0], color: '#06b6d4' },
  { name: 'wrist_left', displayName: 'Left Wrist & Hand', position: [-0.5, 0.7, 0], color: '#3b82f6' },
  { name: 'wrist_right', displayName: 'Right Wrist & Hand', position: [0.5, 0.7, 0], color: '#3b82f6' },
  { name: 'sij_left', displayName: 'Left SIJ', position: [-0.12, 0.6, -0.05], color: '#a855f7' },
  { name: 'sij_right', displayName: 'Right SIJ', position: [0.12, 0.6, -0.05], color: '#a855f7' },
  { name: 'hip_left', displayName: 'Left Hip', position: [-0.15, 0.4, 0], color: '#8b5cf6' },
  { name: 'hip_right', displayName: 'Right Hip', position: [0.15, 0.4, 0], color: '#8b5cf6' },
  { name: 'knee_left', displayName: 'Left Knee', position: [-0.15, -0.2, 0], color: '#ec4899' },
  { name: 'knee_right', displayName: 'Right Knee', position: [0.15, -0.2, 0], color: '#ec4899' },
  { name: 'ankle_left', displayName: 'Left Ankle & Foot', position: [-0.15, -0.8, 0], color: '#f43f5e' },
  { name: 'ankle_right', displayName: 'Right Ankle & Foot', position: [0.15, -0.8, 0], color: '#f43f5e' },
];

function SkeletonModel({ onRegionSelect, selectedRegion }: InteractiveSkeletonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Auto-rotate the skeleton slowly
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  const handleRegionClick = (region: BodyRegion) => {
    onRegionSelect(region.name, region.displayName);
  };

  return (
    <group ref={groupRef}>
      {/* Simple skeleton representation using basic geometry */}
      {bodyRegions.map((region) => {
        const isSelected = selectedRegion === region.name;
        const isHovered = hoveredRegion === region.name;
        const scale = isSelected ? 1.5 : isHovered ? 1.2 : 1.0;
        const opacity = isSelected ? 0.9 : isHovered ? 0.8 : 0.6;

        return (
          <mesh
            key={region.name}
            position={region.position}
            scale={[scale, scale, scale]}
            onClick={() => handleRegionClick(region)}
            onPointerEnter={() => setHoveredRegion(region.name)}
            onPointerLeave={() => setHoveredRegion(null)}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={region.color}
              transparent
              opacity={opacity}
              emissive={isSelected ? region.color : '#000000'}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          </mesh>
        );
      })}

      {/* Basic skeleton lines connecting major joints */}
      <group>
        {/* Simplified skeleton representation using cylinders */}
        {/* Spine */}
        <mesh position={[0, 1, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        
        {/* Left arm */}
        <mesh position={[-0.35, 1.2, 0]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-0.45, 0.85, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        
        {/* Right arm */}
        <mesh position={[0.35, 1.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.45, 0.85, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        
        {/* Left leg */}
        <mesh position={[-0.15, 0.1, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-0.15, -0.5, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        
        {/* Right leg */}
        <mesh position={[0.15, 0.1, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.15, -0.5, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* Hovering labels */}
      {hoveredRegion && (
        <mesh position={bodyRegions.find(r => r.name === hoveredRegion)?.position || [0, 0, 0]}>
          <planeGeometry args={[1, 0.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function InteractiveSkeleton({ onRegionSelect, selectedRegion }: InteractiveSkeletonProps) {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([2, 1, 2]);

  const resetView = () => {
    setCameraPosition([2, 1, 2]);
  };

  const getSelectedRegionInfo = () => {
    if (!selectedRegion) return null;
    return bodyRegions.find(r => r.name === selectedRegion);
  };

  const selectedInfo = getSelectedRegionInfo();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Select Body Region</CardTitle>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Click on a body part to add anatomical context to your question
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 relative">
          <Canvas
            camera={{ position: cameraPosition, fov: 45 }}
            style={{ background: '#f8fafc' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <directionalLight position={[-10, -10, -5]} intensity={0.4} />
            
            <Suspense fallback={<LoadingFallback />}>
              <SkeletonModel onRegionSelect={onRegionSelect} selectedRegion={selectedRegion} />
            </Suspense>
            
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxDistance={5}
              minDistance={1}
            />
          </Canvas>
        </div>

        {selectedInfo && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedInfo.color }}
              />
              <Badge variant="secondary" className="text-sm">
                Selected: {selectedInfo.displayName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your next question will include context about the {selectedInfo.displayName.toLowerCase()}
            </p>
          </div>
        )}

        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick regions:</p>
          <div className="flex flex-wrap gap-1">
            {bodyRegions.slice(0, 6).map((region) => (
              <Badge
                key={region.name}
                variant={selectedRegion === region.name ? "default" : "outline"}
                className="text-xs cursor-pointer hover:bg-accent"
                onClick={() => onRegionSelect(region.name, region.displayName)}
              >
                {region.displayName.split(' ')[0]}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}