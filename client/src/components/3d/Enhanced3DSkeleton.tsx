import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, useFBX } from '@react-three/drei';
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
  animationSpeed
}: {
  anthropometrics?: PatientAnthropometrics;
  jointRestrictions?: JointRestrictions;
  painAreas?: string[];
  showJointLimits: boolean;
  selectedJoint?: string;
  animationSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const skeletonRef = useRef<THREE.Object3D>(null);
  
  // Load the FBX skeleton model
  const fbx = useLoader(FBXLoader, '/skeleton.fbx');
  
  // Clone the model to avoid affecting the original
  const skeletonModel = fbx.clone();
  
  useEffect(() => {
    if (skeletonModel && skeletonRef.current) {
      // Scale the model based on patient anthropometrics
      const heightScale = anthropometrics ? anthropometrics.height / 170 : 1;
      skeletonModel.scale.setScalar(heightScale);
      
      // Center the model
      const box = new THREE.Box3().setFromObject(skeletonModel);
      const center = box.getCenter(new THREE.Vector3());
      skeletonModel.position.sub(center);
      
      // Apply material modifications for pain areas
      skeletonModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const boneName = child.name.toLowerCase();
          
          // Check if this bone is in a pain area
          const isPainArea = painAreas.some(area => 
            boneName.includes(area.toLowerCase()) || 
            area.toLowerCase().includes(boneName)
          );
          
          if (isPainArea) {
            // Create red material for pain areas
            child.material = new THREE.MeshStandardMaterial({
              color: '#ff4444',
              transparent: true,
              opacity: 0.8
            });
          } else {
            // Default bone material
            child.material = new THREE.MeshStandardMaterial({
              color: '#f0f0f0',
              transparent: true,
              opacity: 0.9
            });
          }
        }
      });
    }
  }, [skeletonModel, anthropometrics, painAreas]);

  // Animation frame
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005 * animationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={skeletonRef}>
        <primitive object={skeletonModel} />
        
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

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 3D Viewer */}
        <div className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden">
          <Suspense fallback={<LoadingFallback />}>
            <Canvas camera={{ position: [3, 3, 5], fov: 50 }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <directionalLight position={[-10, -10, -5]} intensity={0.5} />
              <spotLight position={[0, 10, 0]} intensity={0.3} />
              
              <SkeletonModel
                anthropometrics={patientData?.anthropometrics}
                jointRestrictions={patientData?.jointRestrictions}
                painAreas={patientData?.painAreas}
                showJointLimits={showJointLimits}
                selectedJoint={selectedJoint}
                animationSpeed={isAnimating ? animationSpeed : 0}
              />
              
              <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
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