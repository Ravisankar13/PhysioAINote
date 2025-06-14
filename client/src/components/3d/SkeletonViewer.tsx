import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D,
  Settings,
  Eye,
  Activity,
  Target
} from "lucide-react";
import skeletonModelPath from "@assets/skeleton_rig.glb";

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

interface SkeletonViewerProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

interface SkeletonModelProps {
  anthropometrics?: PatientAnthropometrics;
  jointRestrictions?: JointRestrictions;
  painAreas?: string[];
  selectedJoint?: string;
  animationSpeed: number;
  showJointLimits: boolean;
}

function SkeletonModel({ 
  anthropometrics, 
  jointRestrictions, 
  painAreas = [], 
  selectedJoint,
  animationSpeed,
  showJointLimits 
}: SkeletonModelProps) {
  const { scene, animations } = useGLTF(skeletonModelPath);
  const skeletonRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<THREE.AnimationAction | null>(null);

  // Clone the scene to avoid modifying the original
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    if (!clonedScene || !skeletonRef.current) return;

    // Setup animation mixer
    mixerRef.current = new THREE.AnimationMixer(clonedScene);
    
    // Apply anthropometric scaling
    if (anthropometrics) {
      applyAnthropometricScaling(clonedScene, anthropometrics);
    }

    // Highlight pain areas
    if (painAreas.length > 0) {
      highlightPainAreas(clonedScene, painAreas);
    }

    // Apply joint restrictions visualization
    if (jointRestrictions && showJointLimits) {
      visualizeJointRestrictions(clonedScene, jointRestrictions);
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(clonedScene);
      }
    };
  }, [clonedScene, anthropometrics, painAreas, jointRestrictions, showJointLimits]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta * animationSpeed);
    }
  });

  const applyAnthropometricScaling = (scene: THREE.Object3D, data: PatientAnthropometrics) => {
    // Scale the entire skeleton based on height (baseline 170cm)
    const heightScale = data.height / 170;
    scene.scale.setScalar(heightScale);

    // Find and scale specific bones
    scene.traverse((child) => {
      if (child.name.includes('UpperArm')) {
        child.scale.y = data.limbLengths.upperArm / 30; // Normalize to cm
      }
      if (child.name.includes('ForeArm')) {
        child.scale.y = data.limbLengths.forearm / 25;
      }
      if (child.name.includes('Thigh')) {
        child.scale.y = data.limbLengths.thigh / 40;
      }
      if (child.name.includes('Shin')) {
        child.scale.y = data.limbLengths.shin / 35;
      }
    });
  };

  const highlightPainAreas = (scene: THREE.Object3D, areas: string[]) => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const boneName = child.name.toLowerCase();
        const isPainArea = areas.some(area => boneName.includes(area.toLowerCase()));
        
        if (isPainArea) {
          // Create red highlight material
          const painMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.8,
            emissive: 0x330000
          });
          child.material = painMaterial;
        }
      }
    });
  };

  const visualizeJointRestrictions = (scene: THREE.Object3D, restrictions: JointRestrictions) => {
    // Add visual indicators for joint restrictions
    Object.entries(restrictions).forEach(([jointName, limits]) => {
      scene.traverse((child) => {
        if (child.name.toLowerCase().includes(jointName)) {
          // Add restriction visualization geometry
          const restrictionGeometry = new THREE.SphereGeometry(0.5, 8, 8);
          const restrictionMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6
          });
          const restrictionMesh = new THREE.Mesh(restrictionGeometry, restrictionMaterial);
          
          // Position at joint location
          restrictionMesh.position.copy(child.position);
          scene.add(restrictionMesh);
        }
      });
    });
  };

  const playAnimation = (animationName: string) => {
    if (!mixerRef.current || !animations.length) return;

    // Stop current animation
    if (currentAnimation) {
      currentAnimation.stop();
    }

    // Find and play new animation
    const clip = animations.find(clip => clip.name.includes(animationName));
    if (clip) {
      const action = mixerRef.current.clipAction(clip);
      action.play();
      setCurrentAnimation(action);
    }
  };

  return (
    <group ref={skeletonRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default function SkeletonViewer({ patientData, className }: SkeletonViewerProps) {
  const [selectedJoint, setSelectedJoint] = useState<string>('');
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [showJointLimits, setShowJointLimits] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'normal' | 'xray' | 'anatomy'>('normal');
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const resetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1, 5);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const jointOptions = [
    { value: 'shoulder', label: 'Shoulder', icon: Activity },
    { value: 'elbow', label: 'Elbow', icon: Target },
    { value: 'hip', label: 'Hip', icon: Activity },
    { value: 'knee', label: 'Knee', icon: Target },
  ];

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 3D Viewport */}
        <div className="lg:col-span-3 relative">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">3D Skeleton Model</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetCamera}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Badge variant={viewMode === 'normal' ? 'default' : 'outline'}>
                    {viewMode}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 h-[600px]">
              <div className="w-full h-full border rounded-lg overflow-hidden bg-gray-50">
                <Canvas>
                  <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={[0, 1, 5]}
                    fov={50}
                  />
                  <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={2}
                    maxDistance={10}
                  />
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 10, 5]} intensity={1} />
                  <pointLight position={[-10, -10, -5]} intensity={0.5} />
                  
                  <SkeletonModel
                    anthropometrics={patientData?.anthropometrics}
                    jointRestrictions={patientData?.jointRestrictions}
                    painAreas={patientData?.painAreas}
                    selectedJoint={selectedJoint}
                    animationSpeed={animationSpeed}
                    showJointLimits={showJointLimits}
                  />
                  
                  <Environment preset="studio" />
                </Canvas>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Patient Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Patient Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patientData?.anthropometrics && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Anthropometrics</h4>
                  <div className="text-xs space-y-1">
                    <div>Height: {patientData.anthropometrics.height}cm</div>
                    <div>Weight: {patientData.anthropometrics.weight}kg</div>
                  </div>
                </div>
              )}
              
              {patientData?.painAreas && patientData.painAreas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Pain Areas</h4>
                  <div className="flex flex-wrap gap-1">
                    {patientData.painAreas.map((area, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Joint Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Joint Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selected Joint</label>
                <div className="grid grid-cols-2 gap-2">
                  {jointOptions.map((joint) => (
                    <Button
                      key={joint.value}
                      variant={selectedJoint === joint.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedJoint(joint.value)}
                      className="text-xs"
                    >
                      <joint.icon className="h-3 w-3 mr-1" />
                      {joint.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Animation Speed: {animationSpeed.toFixed(1)}x
                </label>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={(value) => setAnimationSpeed(value[0])}
                  min={0}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Joint Limits</label>
                <Button
                  variant={showJointLimits ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowJointLimits(!showJointLimits)}
                >
                  {showJointLimits ? "On" : "Off"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* View Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Move3D className="h-4 w-4" />
                View Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'xray', 'anatomy'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="text-xs capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetCamera}
                className="w-full text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset View
              </Button>
            </CardContent>
          </Card>

          {/* Joint ROM Display */}
          {selectedJoint && patientData?.jointRestrictions?.[selectedJoint as keyof JointRestrictions] && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">
                  {selectedJoint} ROM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {Object.entries(patientData.jointRestrictions[selectedJoint as keyof JointRestrictions]).map(([movement, degrees]) => (
                    <div key={movement} className="flex justify-between">
                      <span className="capitalize">{movement}:</span>
                      <span className="font-mono">{degrees}°</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Preload the skeleton model
useGLTF.preload(skeletonModelPath);