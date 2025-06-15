import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Settings,
  Eye,
  EyeOff,
  Loader2,
  Activity,
  Dumbbell,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft
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

interface FunctionalExercise {
  id: string;
  name: string;
  category: 'lower_body' | 'upper_body' | 'gait' | 'balance';
  description: string;
  duration: number; // seconds
  icon: string;
}

const FUNCTIONAL_EXERCISES: FunctionalExercise[] = [
  {
    id: 'squat',
    name: 'Squat',
    category: 'lower_body',
    description: 'Hip and knee flexion/extension movement',
    duration: 4,
    icon: 'ArrowDown'
  },
  {
    id: 'step_up',
    name: 'Step Up',
    category: 'lower_body',
    description: 'Unilateral lower extremity strengthening',
    duration: 3,
    icon: 'ArrowUp'
  },
  {
    id: 'step_down',
    name: 'Step Down',
    category: 'lower_body',
    description: 'Controlled eccentric movement',
    duration: 3,
    icon: 'ArrowDown'
  },
  {
    id: 'walk_forward',
    name: 'Walk Forward',
    category: 'gait',
    description: 'Forward gait pattern',
    duration: 6,
    icon: 'ChevronRight'
  },
  {
    id: 'walk_backward',
    name: 'Walk Backward',
    category: 'gait',
    description: 'Backward gait pattern',
    duration: 6,
    icon: 'ChevronLeft'
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion',
    category: 'upper_body',
    description: 'Bicep curl movement',
    duration: 3,
    icon: 'Dumbbell'
  },
  {
    id: 'elbow_extension',
    name: 'Elbow Extension',
    category: 'upper_body',
    description: 'Tricep extension movement',
    duration: 3,
    icon: 'Dumbbell'
  },
  {
    id: 'shoulder_flexion',
    name: 'Shoulder Flexion',
    category: 'upper_body',
    description: 'Forward arm raise',
    duration: 4,
    icon: 'TrendingUp'
  },
  {
    id: 'single_leg_stance',
    name: 'Single Leg Stance',
    category: 'balance',
    description: 'Static balance challenge',
    duration: 5,
    icon: 'Activity'
  }
];

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
  const skeletonRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [isPerformingExercise, setIsPerformingExercise] = useState(false);
  
  // Load the GLB skeleton model
  const gltf = useGLTF('/skeleton.glb');
  
  // Create animation functions for different exercises
  const createExerciseAnimation = (exerciseId: string, skeleton: THREE.Group) => {
    const animations: { [key: string]: (progress: number) => void } = {
      squat: (progress) => {
        // Simulate squat movement - hip and knee flexion
        const phase = Math.sin(progress * Math.PI * 2);
        const flexionAngle = Math.max(0, phase) * Math.PI / 3; // 0 to 60 degrees
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('hip') || child.name?.toLowerCase().includes('pelvis')) {
            child.rotation.x = -flexionAngle * 0.3;
          }
          if (child.name?.toLowerCase().includes('knee') || child.name?.toLowerCase().includes('thigh')) {
            child.rotation.x = flexionAngle;
          }
          if (child.name?.toLowerCase().includes('ankle')) {
            child.rotation.x = -flexionAngle * 0.5;
          }
        });
      },
      
      step_up: (progress) => {
        // Simulate step-up movement
        const liftPhase = Math.max(0, Math.sin(progress * Math.PI));
        const hipFlexion = liftPhase * Math.PI / 4; // 45 degrees max
        const kneeFlexion = liftPhase * Math.PI / 3; // 60 degrees max
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('hip_r') || child.name?.toLowerCase().includes('right_hip')) {
            child.rotation.x = hipFlexion;
          }
          if (child.name?.toLowerCase().includes('knee_r') || child.name?.toLowerCase().includes('right_knee')) {
            child.rotation.x = kneeFlexion;
          }
        });
      },
      
      walk_forward: (progress) => {
        // Simulate walking gait pattern
        const leftLegPhase = Math.sin(progress * Math.PI * 4);
        const rightLegPhase = Math.sin((progress * Math.PI * 4) + Math.PI);
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('hip_l') || child.name?.toLowerCase().includes('left_hip')) {
            child.rotation.x = leftLegPhase * Math.PI / 6; // 30 degrees swing
          }
          if (child.name?.toLowerCase().includes('hip_r') || child.name?.toLowerCase().includes('right_hip')) {
            child.rotation.x = rightLegPhase * Math.PI / 6;
          }
        });
        
        // Move skeleton forward
        if (groupRef.current) {
          groupRef.current.position.z = progress * 2 - 1;
        }
      },
      
      elbow_flexion: (progress) => {
        // Simulate bicep curl
        const flexionAngle = Math.sin(progress * Math.PI * 2) * Math.PI / 2; // 0 to 90 degrees
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('elbow') || child.name?.toLowerCase().includes('forearm')) {
            child.rotation.z = Math.max(0, flexionAngle);
          }
        });
      },
      
      shoulder_flexion: (progress) => {
        // Simulate shoulder forward raise
        const flexionAngle = Math.sin(progress * Math.PI * 2) * Math.PI / 2; // 0 to 90 degrees
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('shoulder') || child.name?.toLowerCase().includes('humerus')) {
            child.rotation.x = Math.max(0, flexionAngle);
          }
        });
      },
      
      single_leg_stance: (progress) => {
        // Simulate balance challenge with subtle sway
        const sway = Math.sin(progress * Math.PI * 6) * 0.1; // Subtle movement
        
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('spine') || child.name?.toLowerCase().includes('torso')) {
            child.rotation.x = sway;
            child.rotation.z = sway * 0.5;
          }
        });
        
        // Lift one leg slightly
        skeleton.traverse((child: any) => {
          if (child.name?.toLowerCase().includes('hip_l') || child.name?.toLowerCase().includes('left_hip')) {
            child.rotation.x = Math.PI / 12; // 15 degrees hip flexion
          }
        });
      }
    };
    
    return animations[exerciseId];
  };
  
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
      
      // Apply material modifications for pain areas
      skeletonModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          const boneName = child.name.toLowerCase();
          
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
  }, [skeletonModel, anthropometrics, painAreas]);

  // Animation frame
  useFrame((state, delta) => {
    if (groupRef.current && !isPerformingExercise) {
      groupRef.current.rotation.y += 0.005 * animationSpeed;
    }
    
    // Handle exercise animations
    if (isPerformingExercise && currentExercise && skeletonModel) {
      const exercise = FUNCTIONAL_EXERCISES.find(ex => ex.id === currentExercise);
      if (exercise) {
        const newProgress = (exerciseProgress + delta / exercise.duration) % 1;
        setExerciseProgress(newProgress);
        
        const animationFn = createExerciseAnimation(currentExercise, skeletonModel);
        if (animationFn) {
          animationFn(newProgress);
        }
      }
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