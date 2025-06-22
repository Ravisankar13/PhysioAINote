import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Settings, Info, Target, Activity } from 'lucide-react';
import { Loader2 } from 'lucide-react';

// Patient data interfaces
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

interface Enhanced3DSkeletonProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

// Functional exercises
const FUNCTIONAL_EXERCISES: FunctionalExercise[] = [
  { id: 'squat', name: 'Squat', category: 'lower_body', description: 'Hip and knee flexion exercise', duration: 3, icon: '🏋️' },
  { id: 'step_up', name: 'Step Up', category: 'lower_body', description: 'Unilateral leg strengthening', duration: 4, icon: '⬆️' },
  { id: 'step_down', name: 'Step Down', category: 'lower_body', description: 'Controlled eccentric movement', duration: 4, icon: '⬇️' },
  { id: 'lunge_forward', name: 'Forward Lunge', category: 'lower_body', description: 'Dynamic leg strengthening', duration: 4, icon: '🚶' },
  { id: 'lunge_side', name: 'Side Lunge', category: 'lower_body', description: 'Lateral movement pattern', duration: 4, icon: '↔️' },
  { id: 'elbow_flexion', name: 'Elbow Flexion', category: 'upper_body', description: 'Bicep strengthening exercise', duration: 3, icon: '💪' },
  { id: 'shoulder_flexion', name: 'Shoulder Flexion', category: 'upper_body', description: 'Forward arm raising', duration: 3, icon: '🙋' },
  { id: 'shoulder_abduction', name: 'Shoulder Abduction', category: 'upper_body', description: 'Lateral arm raising', duration: 3, icon: '🤸' },
  { id: 'walk_forward', name: 'Walk Forward', category: 'gait', description: 'Normal gait pattern', duration: 6, icon: '🚶‍♀️' },
  { id: 'walk_backward', name: 'Walk Backward', category: 'gait', description: 'Reverse gait pattern', duration: 6, icon: '🚶‍♂️' },
  { id: 'single_leg_stance', name: 'Single Leg Stance', category: 'balance', description: 'Balance challenge', duration: 5, icon: '🦵' }
];

// Simple skeleton model component
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
  const [exerciseProgress, setExerciseProgress] = useState(0);

  // Simple rotation animation for basic functionality
  useFrame((state, delta) => {
    if (groupRef.current && !isPerformingExercise) {
      groupRef.current.rotation.y += 0.005 * animationSpeed;
    }
    
    if (isPerformingExercise && currentExercise) {
      const newProgress = (exerciseProgress + delta * 0.5) % 1;
      setExerciseProgress(newProgress);
    }
  });

  // Get exercise-specific animation values
  const getExerciseAnimation = () => {
    if (!isPerformingExercise || !currentExercise) return {};
    
    const phase = exerciseProgress * Math.PI * 2;
    const halfPhase = exerciseProgress * Math.PI;
    
    switch (currentExercise) {
      case 'squat':
        const squatDepth = Math.sin(phase) * 0.4;
        return {
          bodyY: squatDepth,
          legRotX: Math.abs(squatDepth) * 0.8,
          torsoRotX: Math.abs(squatDepth) * 0.2
        };
        
      case 'shoulder_flexion':
        const shoulderFlex = Math.sin(phase) * Math.PI / 3;
        return {
          leftArmRotX: shoulderFlex,
          rightArmRotX: shoulderFlex
        };
        
      case 'shoulder_abduction':
        const shoulderAbd = Math.sin(phase) * Math.PI / 4;
        return {
          leftArmRotZ: shoulderAbd,
          rightArmRotZ: -shoulderAbd
        };
        
      case 'elbow_flexion':
        const elbowFlex = (Math.sin(phase) + 1) / 2 * Math.PI / 2;
        return {
          leftArmRotX: elbowFlex,
          rightArmRotX: elbowFlex
        };
        
      case 'lunge_forward':
        const lungeFlex = Math.sin(phase) * 0.3;
        return {
          leftLegRotX: lungeFlex,
          rightLegRotX: -lungeFlex * 0.8,
          bodyZ: Math.abs(lungeFlex) * 0.2
        };
        
      case 'lunge_side':
        const sideLunge = Math.sin(phase) * 0.3;
        return {
          leftLegRotZ: sideLunge,
          rightLegRotZ: -sideLunge * 0.5,
          bodyX: sideLunge * 0.1
        };
        
      case 'step_up':
        const stepHeight = Math.max(0, Math.sin(halfPhase)) * 0.4;
        return {
          rightLegRotX: stepHeight,
          bodyY: stepHeight * 0.3
        };
        
      case 'step_down':
        const stepDown = Math.max(0, Math.sin(halfPhase + Math.PI)) * 0.3;
        return {
          rightLegRotX: -stepDown,
          bodyY: -stepDown * 0.2
        };
        
      case 'walk_forward':
        const walkPhase = exerciseProgress * Math.PI * 4;
        const leftStep = Math.sin(walkPhase) * 0.3;
        const rightStep = Math.sin(walkPhase + Math.PI) * 0.3;
        return {
          leftLegRotX: leftStep,
          rightLegRotX: rightStep,
          leftArmRotX: -leftStep * 0.5,
          rightArmRotX: -rightStep * 0.5
        };
        
      case 'walk_backward':
        const backPhase = exerciseProgress * Math.PI * 4;
        const leftBack = -Math.sin(backPhase) * 0.2;
        const rightBack = -Math.sin(backPhase + Math.PI) * 0.2;
        return {
          leftLegRotX: leftBack,
          rightLegRotX: rightBack,
          leftArmRotX: leftBack * 0.3,
          rightArmRotX: rightBack * 0.3
        };
        
      case 'single_leg_stance':
        const sway = Math.sin(phase * 3) * 0.1;
        return {
          leftLegRotX: 0.3,
          bodyRotZ: sway,
          leftArmRotZ: sway * 0.5,
          rightArmRotZ: -sway * 0.5
        };
        
      default:
        return {};
    }
  };

  const animation = getExerciseAnimation();

  return (
    <group 
      ref={groupRef} 
      position={[
        animation.bodyX || 0, 
        animation.bodyY || 0, 
        animation.bodyZ || 0
      ]}
      rotation={[
        animation.torsoRotX || 0,
        0,
        animation.bodyRotZ || 0
      ]}
    >
      {/* Head */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Torso */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.35, 0.7, 0.18]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Pelvis */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.2]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left shoulder */}
      <mesh position={[-0.2, 1.45, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Left upper arm */}
      <mesh 
        position={[-0.25, 1.25, 0]}
        rotation={[animation.leftArmRotX || 0, 0, animation.leftArmRotZ || 0]}
      >
        <cylinderGeometry args={[0.035, 0.045, 0.25, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left elbow */}
      <mesh position={[-0.25, 1.1, 0]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Left forearm */}
      <mesh position={[-0.25, 0.95, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.22, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left hand */}
      <mesh position={[-0.25, 0.8, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.02]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right shoulder */}
      <mesh position={[0.2, 1.45, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Right upper arm */}
      <mesh 
        position={[0.25, 1.25, 0]}
        rotation={[animation.rightArmRotX || 0, 0, animation.rightArmRotZ || 0]}
      >
        <cylinderGeometry args={[0.035, 0.045, 0.25, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right elbow */}
      <mesh position={[0.25, 1.1, 0]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Right forearm */}
      <mesh position={[0.25, 0.95, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.22, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right hand */}
      <mesh position={[0.25, 0.8, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.02]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left hip */}
      <mesh position={[-0.12, 0.72, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Left thigh */}
      <mesh 
        position={[-0.12, 0.45, 0]}
        rotation={[animation.leftLegRotX || 0, 0, animation.leftLegRotZ || 0]}
      >
        <cylinderGeometry args={[0.045, 0.055, 0.35, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left knee */}
      <mesh position={[-0.12, 0.25, 0]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Left shin */}
      <mesh position={[-0.12, 0.05, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.3, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Left foot */}
      <mesh position={[-0.12, -0.12, 0.05]}>
        <boxGeometry args={[0.08, 0.04, 0.18]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right hip */}
      <mesh position={[0.12, 0.72, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Right thigh */}
      <mesh 
        position={[0.12, 0.45, 0]}
        rotation={[animation.rightLegRotX || 0, 0, animation.rightLegRotZ || 0]}
      >
        <cylinderGeometry args={[0.045, 0.055, 0.35, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right knee */}
      <mesh position={[0.12, 0.25, 0]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#e8dcc6" />
      </mesh>
      
      {/* Right shin */}
      <mesh position={[0.12, 0.05, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.3, 8]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Right foot */}
      <mesh position={[0.12, -0.12, 0.05]}>
        <boxGeometry args={[0.08, 0.04, 0.18]} />
        <meshStandardMaterial color="#f4e6d7" />
      </mesh>
      
      {/* Pain area indicators */}
      {painAreas.map((area, index) => {
        let position: [number, number, number] = [0, 0, 0];
        switch (area.toLowerCase()) {
          case 'shoulder':
          case 'shoulders':
            position = [index % 2 === 0 ? -0.2 : 0.2, 1.45, 0];
            break;
          case 'back':
          case 'spine':
            position = [0, 1.2, -0.12];
            break;
          case 'hip':
          case 'hips':
            position = [index % 2 === 0 ? -0.12 : 0.12, 0.72, 0];
            break;
          case 'knee':
          case 'knees':
            position = [index % 2 === 0 ? -0.12 : 0.12, 0.25, 0];
            break;
          case 'ankle':
          case 'ankles':
            position = [index % 2 === 0 ? -0.12 : 0.12, -0.08, 0];
            break;
          default:
            position = [0, 1, 0];
        }
        
        return (
          <mesh key={`pain-${index}`} position={position}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial 
              color="#ff4444" 
              transparent 
              opacity={0.8}
              emissive="#ff2222"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
      
      {/* Joint restriction indicators */}
      {showJointLimits && jointRestrictions && (
        <>
          <mesh position={[-0.2, 1.45, 0]}>
            <ringGeometry args={[0.08, 0.1, 8]} />
            <meshStandardMaterial color="#ffaa00" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.2, 1.45, 0]}>
            <ringGeometry args={[0.08, 0.1, 8]} />
            <meshStandardMaterial color="#ffaa00" transparent opacity={0.6} />
          </mesh>
        </>
      )}
      
      {/* Exercise name display */}
      {isPerformingExercise && (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.15}
          color="#3b82f6"
          anchorX="center"
          anchorY="middle"
          font="/fonts/roboto-regular.woff"
        >
          {FUNCTIONAL_EXERCISES.find(ex => ex.id === currentExercise)?.name || 'Exercise'}
        </Text>
      )}
      
      {/* Selected joint highlight */}
      {selectedJoint && (
        <Text
          position={[0, 2.0, 0]}
          fontSize={0.08}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
        >
          Selected: {selectedJoint}
        </Text>
      )}
    </group>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D skeleton model...</p>
      </div>
    </div>
  );
}

// Error boundary for 3D components
class Canvas3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.log('3D Canvas Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default function Enhanced3DSkeleton({ patientData, className }: Enhanced3DSkeletonProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showJointLimits, setShowJointLimits] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [isPerformingExercise, setIsPerformingExercise] = useState(false);

  const handleExerciseStart = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setIsPerformingExercise(true);
  };

  const handleExerciseStop = () => {
    setIsPerformingExercise(false);
    setSelectedExercise('');
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 3D Viewer */}
        <div className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden">
          <Canvas3DErrorBoundary 
            fallback={
              <div className="flex items-center justify-center h-full bg-gray-800 text-white">
                <div className="text-center">
                  <div className="mb-4">3D Skeleton Viewer</div>
                  <div className="text-sm text-gray-400">WebGL not available or 3D rendering disabled</div>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            }
          >
            <Suspense fallback={<LoadingFallback />}>
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [2, 2, 5], fov: 50 }}
                gl={{ 
                  antialias: false,
                  powerPreference: "high-performance",
                  alpha: false,
                  depth: true,
                  stencil: false,
                  premultipliedAlpha: false
                }}
                onCreated={({ gl, scene, camera }) => {
                  try {
                    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    gl.setClearColor('#1f2937');
                    scene.background = new THREE.Color('#1f2937');
                  } catch (error) {
                    console.warn('WebGL setup warning:', error);
                  }
                }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight 
                  position={[10, 10, 5]} 
                  intensity={1}
                  castShadow={false}
                />
                <pointLight position={[-10, -10, -5]} intensity={0.3} />
                
                <SkeletonModel
                  anthropometrics={patientData?.anthropometrics}
                  jointRestrictions={patientData?.jointRestrictions}
                  painAreas={patientData?.painAreas || []}
                  showJointLimits={showJointLimits}
                  selectedJoint={selectedJoint}
                  animationSpeed={isAnimating ? animationSpeed : 0}
                  currentExercise={isPerformingExercise ? selectedExercise : null}
                  isPerformingExercise={isPerformingExercise}
                />
                
                <OrbitControls 
                  makeDefault
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={2}
                  maxDistance={20}
                  target={[0, 1, 0]}
                />
              </Canvas>
            </Suspense>
          </Canvas3DErrorBoundary>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Animation Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Animation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="animation-toggle">Auto Rotate</Label>
                <Switch
                  id="animation-toggle"
                  checked={isAnimating}
                  onCheckedChange={setIsAnimating}
                />
              </div>
              
              {isAnimating && (
                <div>
                  <Label className="text-sm font-medium">Speed: {animationSpeed}x</Label>
                  <Slider
                    value={[animationSpeed]}
                    onValueChange={(value) => setAnimationSpeed(value[0])}
                    max={3}
                    min={0.1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label htmlFor="joint-limits">Show Joint Limits</Label>
                <Switch
                  id="joint-limits"
                  checked={showJointLimits}
                  onCheckedChange={setShowJointLimits}
                />
              </div>
            </CardContent>
          </Card>

          {/* Functional Movements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Functional Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(
                FUNCTIONAL_EXERCISES.reduce((acc, exercise) => {
                  if (!acc[exercise.category]) acc[exercise.category] = [];
                  acc[exercise.category].push(exercise);
                  return acc;
                }, {} as Record<string, FunctionalExercise[]>)
              ).map(([category, exercises]) => (
                <div key={category} className="space-y-2">
                  <Badge variant="outline" className="capitalize">
                    {category.replace('_', ' ')}
                  </Badge>
                  <div className="grid grid-cols-1 gap-2">
                    {exercises.map((exercise) => (
                      <Button
                        key={exercise.id}
                        variant={selectedExercise === exercise.id ? "default" : "outline"}
                        size="sm"
                        className="text-xs p-2 h-auto"
                        onClick={() => 
                          isPerformingExercise && selectedExercise === exercise.id
                            ? handleExerciseStop()
                            : handleExerciseStart(exercise.id)
                        }
                      >
                        <div className="text-left w-full">
                          <div className="font-medium">{exercise.name}</div>
                          <div className="text-xs opacity-70">{exercise.description}</div>
                        </div>
                        {isPerformingExercise && selectedExercise === exercise.id ? (
                          <Pause className="h-3 w-3 ml-1" />
                        ) : (
                          <Play className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              
              {isPerformingExercise && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-3"
                  onClick={handleExerciseStop}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Exercise
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Patient Info */}
          {patientData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Patient Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {patientData.anthropometrics && (
                  <div className="text-sm">
                    <p><strong>Height:</strong> {patientData.anthropometrics.height}cm</p>
                    <p><strong>Weight:</strong> {patientData.anthropometrics.weight}kg</p>
                  </div>
                )}
                
                {patientData.painAreas && patientData.painAreas.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Pain Areas:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patientData.painAreas.map((area, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}