import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useMixamoLoader } from './MixamoLoader';
import AnimationController from './AnimationController';
import SliderIntegration from './SliderIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, Info, Download, Upload } from 'lucide-react';
import Simple3DSkeleton from './Simple3DSkeleton';

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

interface MixamoSkeletonProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
  modelPath?: string;
  showControls?: boolean;
}

// 3D Scene Component
function MixamoScene({ 
  modelData, 
  painAreas = [],
  onBonesReady 
}: { 
  modelData: any; 
  painAreas: string[];
  onBonesReady?: (bones: Map<string, THREE.Bone>) => void;
}) {
  const { scene: camera } = useThree();
  const modelRef = useRef<THREE.Group>();
  const [bones, setBones] = useState<Map<string, THREE.Bone>>(new Map());

  useEffect(() => {
    if (modelData && modelData.scene) {
      // Extract and store bones
      const bonesMap = modelData.bones || new Map();
      setBones(bonesMap);
      
      if (onBonesReady) {
        onBonesReady(bonesMap);
      }

      // Apply initial setup
      modelData.scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          // Store original materials
          if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = mesh.material;
          }
        }
      });
    }
  }, [modelData, onBonesReady]);

  // Highlight pain areas
  useEffect(() => {
    if (!bones.size || !painAreas.length) return;

    painAreas.forEach(area => {
      const bonesToHighlight: string[] = [];
      
      switch (area.toLowerCase()) {
        case 'shoulder':
          bonesToHighlight.push('leftShoulder', 'rightShoulder');
          break;
        case 'elbow':
          bonesToHighlight.push('leftElbow', 'rightElbow');
          break;
        case 'knee':
          bonesToHighlight.push('leftKnee', 'rightKnee');
          break;
        case 'hip':
          bonesToHighlight.push('leftHip', 'rightHip');
          break;
        case 'back':
        case 'spine':
          bonesToHighlight.push('spine', 'spine1', 'spine2');
          break;
      }

      bonesToHighlight.forEach(boneName => {
        const bone = bones.get(boneName);
        if (bone) {
          // Add pain indicator sphere
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 16),
            new THREE.MeshBasicMaterial({ 
              color: 0xff0000, 
              transparent: true, 
              opacity: 0.6,
              emissive: 0xff0000,
              emissiveIntensity: 0.5
            })
          );
          sphere.name = `pain_indicator_${boneName}`;
          bone.add(sphere);
        }
      });
    });

    // Cleanup function
    return () => {
      bones.forEach(bone => {
        const painIndicators = bone.children.filter(
          child => child.name.startsWith('pain_indicator_')
        );
        painIndicators.forEach(indicator => bone.remove(indicator));
      });
    };
  }, [bones, painAreas]);

  // Animation frame update
  useFrame((state, delta) => {
    if (modelData?.mixer) {
      modelData.mixer.update(delta);
    }
  });

  if (!modelData || !modelData.scene) {
    return null;
  }

  return (
    <>
      <primitive 
        ref={modelRef}
        object={modelData.scene} 
        scale={[0.01, 0.01, 0.01]}
        position={[0, 0, 0]}
      />
      <Grid 
        args={[10, 10]} 
        cellSize={0.5} 
        cellThickness={0.5} 
        cellColor="#6b7280" 
        sectionSize={2} 
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={10}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0, 0]}
      />
    </>
  );
}

export default function MixamoSkeleton({
  patientData,
  className = '',
  modelPath,
  showControls = true
}: MixamoSkeletonProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [bones, setBones] = useState<Map<string, THREE.Bone>>(new Map());

  // Try to load Mixamo model
  const { loading, model, error } = useMixamoLoader({
    modelPath: modelPath || '/models/mixamo/base-skeleton.glb',
    onProgress: setLoadingProgress,
    onError: (err) => {
      console.error('Failed to load Mixamo model:', err);
      setUseFallback(true);
    }
  });

  // If Mixamo model fails or is not available, use fallback
  if (useFallback || error) {
    return (
      <div className={className}>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Using simplified skeleton model. Mixamo model not available.
          </AlertDescription>
        </Alert>
        <Simple3DSkeleton patientData={patientData} className={className} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Loading 3D Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-[400px] flex flex-col items-center justify-center">
              <Skeleton className="h-32 w-32 rounded-full mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Loading anatomical model...
              </p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(loadingProgress)}% complete
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 3D Viewport */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Mixamo 3D Patient Model
            </div>
            <div className="flex gap-2">
              {patientData?.painAreas && patientData.painAreas.length > 0 && (
                <Badge variant="destructive">
                  {patientData.painAreas.length} Pain Areas
                </Badge>
              )}
              <Badge variant="outline">Interactive</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden">
            <Canvas shadows>
              <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[2, 2, 5]} fov={45} />
                <OrbitControls 
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={1}
                  maxDistance={10}
                  target={[0, 1, 0]}
                />
                
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight 
                  position={[5, 5, 5]} 
                  intensity={0.8}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                />
                <directionalLight position={[-5, 3, -5]} intensity={0.3} />
                
                {/* Environment for better lighting */}
                <Environment preset="studio" />
                
                {/* Mixamo Model */}
                <MixamoScene 
                  modelData={model} 
                  painAreas={patientData?.painAreas || []}
                  onBonesReady={setBones}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* Model Info */}
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium">Professional Rigged Model</p>
                <p className="text-xs text-muted-foreground">
                  This model uses Mixamo's industry-standard rigging for accurate anatomical representation.
                  Adjust patient-specific parameters using the controls below.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && model && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Animation Controller */}
          <AnimationController
            mixer={model.mixer}
            animations={model.animations}
            onAnimationChange={(name) => console.log('Animation changed:', name)}
          />

          {/* Slider Integration */}
          <SliderIntegration
            bones={bones}
            jointRestrictions={patientData?.jointRestrictions}
            limbLengths={patientData?.anthropometrics?.limbLengths}
            onJointChange={(joint, type, value) => {
              console.log(`Joint ${joint} ${type}: ${value}`);
            }}
            onLimbChange={(limb, value) => {
              console.log(`Limb ${limb}: ${value}`);
            }}
          />
        </div>
      )}

      {/* Export/Import Controls */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Model Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Configuration
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}