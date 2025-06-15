import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Settings,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

interface PatientAnthropometrics {
  height: number;
  weight: number;
  limbLengths: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
  };
}

interface JointRestrictions {
  shoulder: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  elbow: {
    flexion: number;
    extension: number;
  };
  hip: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  knee: {
    flexion: number;
    extension: number;
  };
}

interface Enhanced3DSkeletonProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

// Skeleton model component that loads the FBX file
function SkeletonModel({ 
  anthropometrics, 
  jointRestrictions, 
  painAreas = [],
  showJointLimits,
  selectedJoint,
  animationSpeed,
  limbLengths
}: {
  anthropometrics?: PatientAnthropometrics;
  jointRestrictions?: JointRestrictions;
  painAreas?: string[];
  showJointLimits: boolean;
  selectedJoint?: string;
  animationSpeed: number;
  limbLengths?: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
    spine: number;
    neck: number;
  };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const skeletonRef = useRef<THREE.Group>(null);
  
  // Load the GLB skeleton model
  const gltf = useGLTF('/skeleton.glb');
  
  // Clone the model to avoid affecting the original
  const skeletonModel = gltf.scene.clone();
  
  useEffect(() => {
    if (skeletonModel && skeletonRef.current) {
      // Scale the model based on patient anthropometrics
      const heightScale = anthropometrics ? anthropometrics.height / 170 : 1;
      skeletonModel.scale.setScalar(heightScale * 0.05); // Increased scale for better visibility
      
      // Center the model
      const box = new THREE.Box3().setFromObject(skeletonModel);
      const center = box.getCenter(new THREE.Vector3());
      skeletonModel.position.sub(center);
      skeletonModel.position.y = -0.5; // Better vertical positioning for closer view
      
      // Apply material modifications for pain areas and limb scaling
      skeletonModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          const boneName = child.name.toLowerCase();
          
          // Apply limb length scaling
          if (limbLengths) {
            if (boneName.includes('upper') && boneName.includes('arm')) {
              child.scale.y = limbLengths.upperArm;
            } else if (boneName.includes('forearm') || boneName.includes('lower') && boneName.includes('arm')) {
              child.scale.y = limbLengths.forearm;
            } else if (boneName.includes('thigh') || boneName.includes('upper') && boneName.includes('leg')) {
              child.scale.y = limbLengths.thigh;
            } else if (boneName.includes('shin') || boneName.includes('lower') && boneName.includes('leg')) {
              child.scale.y = limbLengths.shin;
            } else if (boneName.includes('spine') || boneName.includes('vertebra')) {
              child.scale.y = limbLengths.spine;
            } else if (boneName.includes('neck')) {
              child.scale.y = limbLengths.neck;
            }
          }
          
          // Check if this bone is in a pain area
          const isPainArea = painAreas.some(area => 
            boneName.includes(area.toLowerCase()) || 
            area.toLowerCase().includes(boneName)
          );
          
          if (isPainArea) {
            // Create red material for pain areas
            const material = child.material.clone();
            material.color = new THREE.Color('#ff4444');
            material.transparent = true;
            material.opacity = 0.9;
            child.material = material;
          } else {
            // Enhance default material
            if (child.material) {
              const material = child.material.clone();
              material.color = new THREE.Color('#f8f8f8');
              material.transparent = true;
              material.opacity = 0.95;
              child.material = material;
            }
          }
          
          // Enable shadows
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [skeletonModel, anthropometrics, painAreas, limbLengths]);

  // Animation frame
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005 * animationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={skeletonRef}>
        <primitive object={skeletonModel} position={[0, 0, 0]} />
        
        {/* Joint indicators for restrictions */}
        {showJointLimits && jointRestrictions && (
          <>
            {/* Add joint range visualization spheres at key locations */}
            {/* These would be positioned based on the actual bone hierarchy */}
          </>
        )}
      </group>
      
      {/* Joint labels when enabled */}
      {showJointLimits && (
        <>
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.1}
            color="#333333"
            anchorX="center"
            anchorY="middle"
          >
            Spine
          </Text>
          <Text
            position={[-0.5, 1.2, 0]}
            fontSize={0.08}
            color="#333333"
            anchorX="center"
            anchorY="middle"
          >
            L Shoulder
          </Text>
          <Text
            position={[0.5, 1.2, 0]}
            fontSize={0.08}
            color="#333333"
            anchorX="center"
            anchorY="middle"
          >
            R Shoulder
          </Text>
        </>
      )}
    </group>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D skeleton model...</p>
      </div>
    </div>
  );
}

export default function Enhanced3DSkeleton({ patientData, className }: Enhanced3DSkeletonProps) {
  const [selectedJoint, setSelectedJoint] = useState<string>('');
  const [showJointLimits, setShowJointLimits] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [limbLengths, setLimbLengths] = useState({
    upperArm: 1.0,
    forearm: 1.0,
    thigh: 1.0,
    shin: 1.0,
    spine: 1.0,
    neck: 1.0
  });

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 3D Viewer */}
        <div className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden">
          <Suspense fallback={<LoadingFallback />}>
            <Canvas 
              camera={{ position: [1.5, 1, 1.5], fov: 60 }}
              shadows
            >
              <ambientLight intensity={0.6} />
              <directionalLight 
                position={[10, 10, 5]} 
                intensity={1.2} 
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
              />
              <directionalLight position={[-5, 5, -5]} intensity={0.4} />
              <pointLight position={[0, 3, 0]} intensity={0.3} />
              
              {/* Ground plane for shadows */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <shadowMaterial opacity={0.3} />
              </mesh>
              
              <SkeletonModel
                anthropometrics={patientData?.anthropometrics}
                jointRestrictions={patientData?.jointRestrictions}
                painAreas={patientData?.painAreas}
                showJointLimits={showJointLimits}
                selectedJoint={selectedJoint}
                animationSpeed={isAnimating ? animationSpeed : 0}
                limbLengths={limbLengths}
              />
              
              <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true}
                minDistance={0.5}
                maxDistance={5}
                target={[0, 0, 0]}
              />
            </Canvas>
          </Suspense>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Patient Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patientData?.anthropometrics && (
                <>
                  <div className="text-xs">
                    <span className="font-medium">Height:</span> {patientData.anthropometrics.height}cm
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Weight:</span> {patientData.anthropometrics.weight}kg
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">View Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Animation</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnimating(!isAnimating)}
                >
                  {isAnimating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs">Joint Labels</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJointLimits(!showJointLimits)}
                >
                  {showJointLimits ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs">Animation Speed</span>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={(value) => setAnimationSpeed(value[0])}
                  max={3}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Limb Length Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Upper Arms</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.upperArm.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.upperArm]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, upperArm: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Forearms</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.forearm.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.forearm]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, forearm: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Thighs</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.thigh.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.thigh]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, thigh: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Shins</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.shin.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.shin]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, shin: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Spine</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.spine.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.spine]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, spine: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Neck</span>
                  <span className="text-xs text-muted-foreground">{limbLengths.neck.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[limbLengths.neck]}
                  onValueChange={(value) => setLimbLengths(prev => ({ ...prev, neck: value[0] }))}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimbLengths({
                  upperArm: 1.0,
                  forearm: 1.0,
                  thigh: 1.0,
                  shin: 1.0,
                  spine: 1.0,
                  neck: 1.0
                })}
                className="w-full mt-2"
              >
                Reset to Default
              </Button>
            </CardContent>
          </Card>

          {patientData?.painAreas && patientData.painAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pain Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {patientData.painAreas.map((area, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Red highlighted areas on skeleton
                </p>
              </CardContent>
            </Card>
          )}

          {patientData?.jointRestrictions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Joint Restrictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs space-y-1">
                  <div><strong>Shoulder:</strong> Flex {patientData.jointRestrictions.shoulder.flexion}°</div>
                  <div><strong>Elbow:</strong> Flex {patientData.jointRestrictions.elbow.flexion}°</div>
                  <div><strong>Hip:</strong> Flex {patientData.jointRestrictions.hip.flexion}°</div>
                  <div><strong>Knee:</strong> Flex {patientData.jointRestrictions.knee.flexion}°</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Model Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                <p>High-fidelity 3D skeleton model</p>
                <p>Interactive controls: drag to rotate, scroll to zoom</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}