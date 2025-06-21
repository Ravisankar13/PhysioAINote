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
  
  // Create procedural skeleton using Three.js primitives
  const createProceduralSkeleton = () => {
    const skeleton = new THREE.Group();
    
    // Materials
    const boneMaterial = new THREE.MeshStandardMaterial({ 
      color: '#f5f5f5', 
      metalness: 0.1, 
      roughness: 0.9 
    });
    const jointMaterial = new THREE.MeshStandardMaterial({ 
      color: '#e0e0e0', 
      metalness: 0.2, 
      roughness: 0.8 
    });
    
    // Torso (spine)
    const torso = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
    const torsoMesh = new THREE.Mesh(torso, boneMaterial);
    torsoMesh.position.y = 0.3;
    torsoMesh.name = 'torso';
    skeleton.add(torsoMesh);
    
    // Head
    const head = new THREE.SphereGeometry(0.12, 8, 8);
    const headMesh = new THREE.Mesh(head, boneMaterial);
    headMesh.position.y = 0.75;
    headMesh.name = 'head';
    skeleton.add(headMesh);
    
    // Arms
    const createArm = (side: 'left' | 'right') => {
      const x = side === 'left' ? -0.15 : 0.15;
      
      // Upper arm
      const upperArm = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8);
      const upperArmMesh = new THREE.Mesh(upperArm, boneMaterial);
      upperArmMesh.position.set(x, 0.45, 0);
      upperArmMesh.rotation.z = side === 'left' ? Math.PI / 6 : -Math.PI / 6;
      upperArmMesh.name = `${side}_upper_arm`;
      skeleton.add(upperArmMesh);
      
      // Elbow joint
      const elbow = new THREE.SphereGeometry(0.03, 6, 6);
      const elbowMesh = new THREE.Mesh(elbow, jointMaterial);
      elbowMesh.position.set(x * 1.8, 0.15, 0);
      elbowMesh.name = `${side}_elbow`;
      skeleton.add(elbowMesh);
      
      // Forearm
      const foreArm = new THREE.CylinderGeometry(0.03, 0.04, 0.25, 8);
      const foreArmMesh = new THREE.Mesh(foreArm, boneMaterial);
      foreArmMesh.position.set(x * 2.2, -0.05, 0);
      foreArmMesh.name = `${side}_forearm`;
      skeleton.add(foreArmMesh);
      
      // Hand
      const hand = new THREE.BoxGeometry(0.08, 0.12, 0.03);
      const handMesh = new THREE.Mesh(hand, boneMaterial);
      handMesh.position.set(x * 2.2, -0.22, 0);
      handMesh.name = `${side}_hand`;
      skeleton.add(handMesh);
    };
    
    // Legs
    const createLeg = (side: 'left' | 'right') => {
      const x = side === 'left' ? -0.08 : 0.08;
      
      // Hip joint
      const hip = new THREE.SphereGeometry(0.04, 6, 6);
      const hipMesh = new THREE.Mesh(hip, jointMaterial);
      hipMesh.position.set(x, 0, 0);
      hipMesh.name = `${side}_hip`;
      skeleton.add(hipMesh);
      
      // Thigh
      const thigh = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8);
      const thighMesh = new THREE.Mesh(thigh, boneMaterial);
      thighMesh.position.set(x, -0.2, 0);
      thighMesh.name = `${side}_thigh`;
      skeleton.add(thighMesh);
      
      // Knee joint
      const knee = new THREE.SphereGeometry(0.035, 6, 6);
      const kneeMesh = new THREE.Mesh(knee, jointMaterial);
      kneeMesh.position.set(x, -0.4, 0);
      kneeMesh.name = `${side}_knee`;
      skeleton.add(kneeMesh);
      
      // Shin
      const shin = new THREE.CylinderGeometry(0.03, 0.04, 0.35, 8);
      const shinMesh = new THREE.Mesh(shin, boneMaterial);
      shinMesh.position.set(x, -0.575, 0);
      shinMesh.name = `${side}_shin`;
      skeleton.add(shinMesh);
      
      // Ankle
      const ankle = new THREE.SphereGeometry(0.03, 6, 6);
      const ankleMesh = new THREE.Mesh(ankle, jointMaterial);
      ankleMesh.position.set(x, -0.75, 0);
      ankleMesh.name = `${side}_ankle`;
      skeleton.add(ankleMesh);
      
      // Foot
      const foot = new THREE.BoxGeometry(0.06, 0.03, 0.15);
      const footMesh = new THREE.Mesh(foot, boneMaterial);
      footMesh.position.set(x, -0.785, 0.05);
      footMesh.name = `${side}_foot`;
      skeleton.add(footMesh);
    };
    
    createArm('left');
    createArm('right');
    createLeg('left');
    createLeg('right');
    
    return skeleton;
  };
  
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
  
  // Create the procedural skeleton model
  const [skeletonModel, setSkeletonModel] = useState<THREE.Group | null>(null);
  
  useEffect(() => {
    const newSkeleton = createProceduralSkeleton();
    
    // Scale the model based on patient anthropometrics
    const heightScale = anthropometrics ? anthropometrics.height / 170 : 1;
    newSkeleton.scale.setScalar(heightScale);
    
    // Apply pain area highlighting
    newSkeleton.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        const boneName = child.name.toLowerCase();
        
        // Enhanced pain area detection
        const isPainArea = painAreas.some(area => {
          const areaLower = area.toLowerCase().replace('_', ' ');
          return boneName.includes(areaLower) || 
                 areaLower.includes(boneName) ||
                 // Mapping common pain areas to bone names
                 (areaLower.includes('shoulder') && boneName.includes('upper_arm')) ||
                 (areaLower.includes('lower back') && boneName.includes('torso')) ||
                 (areaLower.includes('upper back') && boneName.includes('torso')) ||
                 (areaLower.includes('back') && boneName.includes('torso')) ||
                 (areaLower.includes('upper arm') && boneName.includes('upper_arm')) ||
                 (areaLower.includes('forearm') && boneName.includes('forearm')) ||
                 (areaLower.includes('thigh') && boneName.includes('thigh')) ||
                 (areaLower.includes('shin') && boneName.includes('shin'));
        });
        
        if (isPainArea) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#ff4444'),
            transparent: true,
            opacity: 0.9,
            metalness: 0.2,
            roughness: 0.7
          });
        }
        
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    setSkeletonModel(newSkeleton);
  }, [anthropometrics, painAreas]);

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
{skeletonModel && <primitive object={skeletonModel} position={[0, 0, 0]} />}
        
        {/* Joint indicators for restrictions */}
        {showJointLimits && jointRestrictions && (
          <>
            {/* Shoulder ROM indicators */}
            <mesh position={[-0.3, 0.45, 0]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#ffaa00" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.3, 0.45, 0]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#ffaa00" transparent opacity={0.7} />
            </mesh>
            
            {/* Hip ROM indicators */}
            <mesh position={[-0.08, 0, 0]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color="#00aaff" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.08, 0, 0]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color="#00aaff" transparent opacity={0.7} />
            </mesh>
          </>
        )}
      </group>
      
      {/* Joint labels when enabled */}
      {showJointLimits && (
        <>
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.06}
            color="#333333"
            anchorX="center"
            anchorY="middle"
          >
            Spine
          </Text>
          <Text
            position={[-0.4, 0.5, 0]}
            fontSize={0.05}
            color="#333333"
            anchorX="center"
            anchorY="middle"
          >
            L Shoulder
          </Text>
          <Text
            position={[0.4, 0.5, 0]}
            fontSize={0.05}
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