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
  animationSpeed,
  currentExercise,
  isPerformingExercise
}: {
  anthropometrics?: PatientAnthropometrics;
  jointRestrictions?: JointRestrictions;
  painAreas?: string[];
  showJointLimits: boolean;
  selectedJoint?: string;
  animationSpeed: number;
  currentExercise?: string | null;
  isPerformingExercise?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const skeletonRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  
  // Load the GLB skeleton model
  const gltf = useGLTF('/Skeleton Raw Rigging 004_1750007377355.glb');
  
  // Create animation functions for different exercises
  const createExerciseAnimation = (exerciseId: string, skeleton: THREE.Group) => {
    const animations: { [key: string]: (progress: number) => void } = {
      squat: (progress) => {
        // Simulate squat movement - hip and knee flexion
        const phase = Math.sin(progress * Math.PI * 2);
        const flexionAngle = Math.max(0, phase) * Math.PI / 3; // 0 to 60 degrees
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // More comprehensive bone matching for squat movement
            if (boneName.includes('hip') || boneName.includes('pelvis') || boneName.includes('spine')) {
              child.rotation.x = -flexionAngle * 0.3;
            }
            if (boneName.includes('thigh') || boneName.includes('femur') || boneName.includes('upper_leg')) {
              child.rotation.x = flexionAngle;
            }
            if (boneName.includes('calf') || boneName.includes('shin') || boneName.includes('lower_leg')) {
              child.rotation.x = flexionAngle * 0.8;
            }
          }
        });
      },
      
      step_up: (progress) => {
        // Simulate step-up movement
        const liftPhase = Math.max(0, Math.sin(progress * Math.PI));
        const hipFlexion = liftPhase * Math.PI / 4; // 45 degrees max
        const kneeFlexion = liftPhase * Math.PI / 3; // 60 degrees max
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Right leg step-up
            if (boneName.includes('thigh') && (boneName.includes('r') || boneName.includes('right'))) {
              child.rotation.x = hipFlexion;
            }
            if (boneName.includes('calf') && (boneName.includes('r') || boneName.includes('right'))) {
              child.rotation.x = kneeFlexion;
            }
          }
        });
      },
      
      step_down: (progress) => {
        // Simulate step-down movement (controlled descent)
        const descendPhase = Math.max(0, -Math.sin(progress * Math.PI));
        const hipFlexion = descendPhase * Math.PI / 6; // 30 degrees max
        const kneeFlexion = descendPhase * Math.PI / 4; // 45 degrees max
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Left leg step-down
            if (boneName.includes('thigh') && (boneName.includes('l') || boneName.includes('left'))) {
              child.rotation.x = hipFlexion;
            }
            if (boneName.includes('calf') && (boneName.includes('l') || boneName.includes('left'))) {
              child.rotation.x = kneeFlexion;
            }
          }
        });
      },
      
      walk_forward: (progress) => {
        // Simulate walking gait pattern
        const leftLegPhase = Math.sin(progress * Math.PI * 4);
        const rightLegPhase = Math.sin((progress * Math.PI * 4) + Math.PI);
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Left leg movement
            if (boneName.includes('thigh') && (boneName.includes('l') || boneName.includes('left'))) {
              child.rotation.x = leftLegPhase * Math.PI / 6; // 30 degrees swing
            }
            // Right leg movement
            if (boneName.includes('thigh') && (boneName.includes('r') || boneName.includes('right'))) {
              child.rotation.x = rightLegPhase * Math.PI / 6;
            }
          }
        });
        
        // Move skeleton forward
        if (groupRef.current) {
          groupRef.current.position.z = progress * 2 - 1;
        }
      },
      
      walk_backward: (progress) => {
        // Simulate backward walking
        const leftLegPhase = -Math.sin(progress * Math.PI * 4);
        const rightLegPhase = -Math.sin((progress * Math.PI * 4) + Math.PI);
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            if (boneName.includes('thigh') && (boneName.includes('l') || boneName.includes('left'))) {
              child.rotation.x = leftLegPhase * Math.PI / 8;
            }
            if (boneName.includes('thigh') && (boneName.includes('r') || boneName.includes('right'))) {
              child.rotation.x = rightLegPhase * Math.PI / 8;
            }
          }
        });
        
        // Move skeleton backward
        if (groupRef.current) {
          groupRef.current.position.z = -progress * 2 + 1;
        }
      },
      
      elbow_flexion: (progress) => {
        // Simulate bicep curl
        const flexionAngle = Math.sin(progress * Math.PI * 2) * Math.PI / 2; // 0 to 90 degrees
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Target forearm bones for elbow flexion
            if (boneName.includes('forearm') || boneName.includes('lower_arm') || 
                boneName.includes('ulna') || boneName.includes('radius')) {
              child.rotation.z = Math.max(0, flexionAngle);
            }
          }
        });
      },
      
      elbow_extension: (progress) => {
        // Simulate tricep extension
        const extensionAngle = Math.sin(progress * Math.PI * 2) * Math.PI / 3; // 0 to 60 degrees
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            if (boneName.includes('forearm') || boneName.includes('lower_arm')) {
              child.rotation.z = -Math.max(0, extensionAngle);
            }
          }
        });
      },
      
      shoulder_flexion: (progress) => {
        // Simulate shoulder forward raise
        const flexionAngle = Math.sin(progress * Math.PI * 2) * Math.PI / 2; // 0 to 90 degrees
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Target upper arm bones for shoulder flexion
            if (boneName.includes('upper_arm') || boneName.includes('humerus') || 
                boneName.includes('arm') && !boneName.includes('fore')) {
              child.rotation.x = Math.max(0, flexionAngle);
            }
          }
        });
      },
      
      single_leg_stance: (progress) => {
        // Simulate balance challenge with subtle sway
        const sway = Math.sin(progress * Math.PI * 6) * 0.1; // Subtle movement
        
        skeleton.traverse((child: any) => {
          if (child.isBone) {
            const boneName = child.name?.toLowerCase() || '';
            // Add subtle sway to spine/torso
            if (boneName.includes('spine') || boneName.includes('torso') || boneName.includes('chest')) {
              child.rotation.x = sway;
              child.rotation.z = sway * 0.5;
            }
            // Lift left leg slightly
            if (boneName.includes('thigh') && (boneName.includes('l') || boneName.includes('left'))) {
              child.rotation.x = Math.PI / 12; // 15 degrees hip flexion
            }
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
      
      // Debug: Log all bone names and bone structure to help with animation mapping
      console.log("=== Skeleton Model Structure ===");
      const boneNames: string[] = [];
      const meshNames: string[] = [];
      skeletonModel.traverse((child: any) => {
        if (child.isBone) {
          boneNames.push(child.name);
        }
        if (child instanceof THREE.Mesh && child.name) {
          meshNames.push(child.name);
        }
      });
      console.log("Available bone names:", boneNames);
      console.log("Available mesh names:", meshNames);
      console.log("Pain areas to highlight:", painAreas);
      
      // Apply material modifications for pain areas
      skeletonModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          const boneName = child.name.toLowerCase();
          
          // Enhanced pain area detection with more comprehensive matching
          const isPainArea = painAreas.some(area => {
            const areaLower = area.toLowerCase();
            // Check direct matches and common anatomical terms
            return boneName.includes(areaLower) || 
                   areaLower.includes(boneName) ||
                   // Check for common bone/area mappings
                   (areaLower.includes('shoulder') && (boneName.includes('humerus') || boneName.includes('scapula') || boneName.includes('clavicle'))) ||
                   (areaLower.includes('elbow') && (boneName.includes('radius') || boneName.includes('ulna') || boneName.includes('humerus'))) ||
                   (areaLower.includes('hip') && (boneName.includes('femur') || boneName.includes('pelvis'))) ||
                   (areaLower.includes('knee') && (boneName.includes('tibia') || boneName.includes('fibula') || boneName.includes('femur'))) ||
                   (areaLower.includes('spine') && (boneName.includes('vertebra') || boneName.includes('spine'))) ||
                   (areaLower.includes('wrist') && (boneName.includes('radius') || boneName.includes('ulna') || boneName.includes('carpal'))) ||
                   (areaLower.includes('ankle') && (boneName.includes('tibia') || boneName.includes('fibula') || boneName.includes('talus')));
          });
          
          // Create new material instead of cloning to ensure it applies
          if (isPainArea) {
            console.log(`Applying red material to pain area: ${boneName}`);
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#ff2222'),
              transparent: true,
              opacity: 0.95,
              metalness: 0.1,
              roughness: 0.8
            });
          } else {
            // Default bone material
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#f5f5f5'),
              transparent: true,
              opacity: 0.92,
              metalness: 0.1,
              roughness: 0.9
            });
          }
          
          // Enable shadows
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [skeletonModel, anthropometrics, painAreas]);

  // Function to reset all bone rotations to default state
  const resetBoneRotations = (skeleton: THREE.Group) => {
    skeleton.traverse((child: any) => {
      if (child.isBone) {
        child.rotation.set(0, 0, 0);
      }
    });
    
    // Reset group position for walking exercises
    if (groupRef.current) {
      groupRef.current.position.set(0, 0, 0);
    }
  };

  // Animation frame
  useFrame((state, delta) => {
    if (groupRef.current && !isPerformingExercise) {
      groupRef.current.rotation.y += 0.005 * animationSpeed;
    }
    
    // Handle exercise animations
    if (isPerformingExercise && currentExercise && skeletonModel) {
      const exercise = FUNCTIONAL_EXERCISES.find(ex => ex.id === currentExercise);
      if (exercise) {
        // Reset bone rotations before applying new animation
        resetBoneRotations(skeletonModel);
        
        const newProgress = (exerciseProgress + delta / exercise.duration) % 1;
        setExerciseProgress(newProgress);
        
        const animationFn = createExerciseAnimation(currentExercise, skeletonModel);
        if (animationFn) {
          animationFn(newProgress);
        }
      }
    } else if (skeletonModel) {
      // Reset to default pose when not exercising
      resetBoneRotations(skeletonModel);
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
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseCategory, setExerciseCategory] = useState<string>('all');
  const [isPerformingExercise, setIsPerformingExercise] = useState(false);

  const filteredExercises = exerciseCategory === 'all' 
    ? FUNCTIONAL_EXERCISES 
    : FUNCTIONAL_EXERCISES.filter(ex => ex.category === exerciseCategory);

  const handleStartExercise = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setIsPerformingExercise(true);
    setIsAnimating(false); // Stop regular rotation
  };

  const handleStopExercise = () => {
    setIsPerformingExercise(false);
    setSelectedExercise('');
    setIsAnimating(true); // Resume regular rotation
  };

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
                currentExercise={isPerformingExercise ? selectedExercise : null}
                isPerformingExercise={isPerformingExercise}
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

          {/* Functional Movement Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Functional Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <span className="text-xs">Exercise Category</span>
                <Select value={exerciseCategory} onValueChange={setExerciseCategory}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exercises</SelectItem>
                    <SelectItem value="lower_body">Lower Body</SelectItem>
                    <SelectItem value="upper_body">Upper Body</SelectItem>
                    <SelectItem value="gait">Gait Patterns</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs">Available Exercises</span>
                <div className="grid gap-1 max-h-32 overflow-y-auto">
                  {filteredExercises.map((exercise) => (
                    <Button
                      key={exercise.id}
                      variant={selectedExercise === exercise.id ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs justify-start"
                      onClick={() => 
                        selectedExercise === exercise.id && isPerformingExercise 
                          ? handleStopExercise() 
                          : handleStartExercise(exercise.id)
                      }
                    >
                      {exercise.icon === 'ArrowDown' && <ArrowDown className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'ArrowUp' && <ArrowUp className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'ChevronRight' && <ChevronRight className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'ChevronLeft' && <ChevronLeft className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'Dumbbell' && <Dumbbell className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'TrendingUp' && <TrendingUp className="h-3 w-3 mr-1" />}
                      {exercise.icon === 'Activity' && <Activity className="h-3 w-3 mr-1" />}
                      {exercise.name}
                    </Button>
                  ))}
                </div>
              </div>

              {isPerformingExercise && selectedExercise && (
                <div className="space-y-2 p-2 bg-blue-50 rounded">
                  <div className="text-xs font-medium">Now Performing:</div>
                  <div className="text-xs text-blue-700">
                    {FUNCTIONAL_EXERCISES.find(ex => ex.id === selectedExercise)?.name}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                    onClick={handleStopExercise}
                  >
                    Stop Exercise
                  </Button>
                </div>
              )}
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