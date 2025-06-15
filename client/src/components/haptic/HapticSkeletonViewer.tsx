import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Hand, 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  RotateCcw, 
  Target,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useHapticDevice } from '@/hooks/useHapticDevice';
import { useTissuePhysics } from '@/hooks/useTissuePhysics';
import ManualTherapyLibrary from './ManualTherapyLibrary';

interface HapticSkeletonViewerProps {
  patientData?: any;
  className?: string;
}

interface VirtualHandProps {
  position: THREE.Vector3;
  isContacting: boolean;
  contactIntensity: number;
}

function VirtualHand({ position, isContacting, contactIntensity }: VirtualHandProps) {
  const handRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (handRef.current) {
      // Animate hand based on contact
      const scale = isContacting ? 1.2 + (contactIntensity * 0.3) : 1.0;
      handRef.current.scale.setScalar(scale);
      
      // Color change based on contact intensity
      const material = handRef.current.material as THREE.MeshStandardMaterial;
      if (isContacting) {
        material.color.setRGB(1, 0.5, 0.2); // Orange when contacting
        material.emissive.setRGB(0.2 * contactIntensity, 0.1 * contactIntensity, 0);
      } else {
        material.color.setRGB(0.8, 0.8, 1); // Light blue when not contacting
        material.emissive.setRGB(0, 0, 0);
      }
    }
  });

  return (
    <mesh ref={handRef} position={position}>
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial 
        transparent 
        opacity={0.8}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

interface InteractiveSkeletonProps {
  patientData?: any;
  onTouch: (point: THREE.Vector3, pressure: number) => void;
  currentTechnique?: any;
  limbLengths: any;
}

function InteractiveSkeleton({ patientData, onTouch, currentTechnique, limbLengths }: InteractiveSkeletonProps) {
  const { camera, mouse, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/skeleton.glb');
  const skeletonModel = gltf.scene.clone();
  const [virtualHandPosition, setVirtualHandPosition] = useState(new THREE.Vector3());
  const [isContacting, setIsContacting] = useState(false);
  const [contactIntensity, setContactIntensity] = useState(0);
  const [mousePressed, setMousePressed] = useState(false);

  useEffect(() => {
    if (skeletonModel && groupRef.current) {
      // Scale and position the model
      const heightScale = patientData?.anthropometrics ? patientData.anthropometrics.height / 170 : 1;
      skeletonModel.scale.setScalar(heightScale * 0.05);
      
      // Center the model
      const box = new THREE.Box3().setFromObject(skeletonModel);
      const center = box.getCenter(new THREE.Vector3());
      skeletonModel.position.sub(center);
      skeletonModel.position.y = -0.5;
      
      // Apply limb scaling and materials
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
          
          // Apply pain area highlighting
          const painAreas = patientData?.painAreas || [];
          const isPainArea = painAreas.some((area: string) => 
            boneName.includes(area.toLowerCase()) || 
            area.toLowerCase().includes(boneName)
          );
          
          if (isPainArea) {
            const material = child.material.clone();
            material.color = new THREE.Color('#ff4444');
            material.transparent = true;
            material.opacity = 0.9;
            child.material = material;
          } else {
            const material = child.material.clone();
            material.color = new THREE.Color('#f8f8f8');
            material.transparent = true;
            material.opacity = 0.95;
            child.material = material;
          }
          
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      groupRef.current.add(skeletonModel);
    }
  }, [skeletonModel, patientData, limbLengths]);

  // Handle mouse interactions for haptic feedback
  useFrame((state) => {
    if (groupRef.current && mousePressed) {
      // Convert mouse position to 3D world coordinates
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(groupRef.current, true);
      
      if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        setVirtualHandPosition(intersectionPoint);
        setIsContacting(true);
        
        // Calculate contact intensity based on mouse movement
        const intensity = Math.min(mouse.x * mouse.x + mouse.y * mouse.y, 1.0);
        setContactIntensity(intensity);
        
        // Trigger haptic feedback
        onTouch(intersectionPoint, intensity);
      } else {
        setIsContacting(false);
        setContactIntensity(0);
      }
    } else {
      setIsContacting(false);
      setContactIntensity(0);
    }
  });

  const handlePointerDown = useCallback((event: any) => {
    setMousePressed(true);
    event.stopPropagation();
  }, []);

  const handlePointerUp = useCallback(() => {
    setMousePressed(false);
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown}>
      <VirtualHand 
        position={virtualHandPosition}
        isContacting={isContacting}
        contactIntensity={contactIntensity}
      />
    </group>
  );
}

export default function HapticSkeletonViewer({ patientData, className }: HapticSkeletonViewerProps) {
  const hapticDevice = useHapticDevice();
  const tissuePhysics = useTissuePhysics(patientData);
  const [currentTechnique, setCurrentTechnique] = useState<any>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState({
    score: 0,
    feedback: [] as string[],
    timeRemaining: 0
  });
  const [limbLengths, setLimbLengths] = useState({
    upperArm: 1.0,
    forearm: 1.0,
    thigh: 1.0,
    shin: 1.0,
    spine: 1.0,
    neck: 1.0
  });

  const trainingSessionRef = useRef<any>(null);

  // Handle touch interaction with haptic feedback
  const handleTouch = useCallback((point: THREE.Vector3, pressure: number) => {
    if (!currentTechnique) return;

    const feedback = tissuePhysics.calculateFeedback(
      point,
      pressure,
      new THREE.Vector3(0, 0, 0), // movement vector
      currentTechnique.id
    );

    // Apply haptic feedback
    hapticDevice.applyFeedback({
      force: feedback.force,
      duration: feedback.duration,
      pattern: feedback.pattern,
      frequency: feedback.frequency
    });

    // Update training progress if in training mode
    if (isTraining) {
      updateTrainingProgress(feedback, point, pressure);
    }

    // Add visual feedback text
    if (feedback.region) {
      const newFeedback = [
        `${feedback.region}: ${(feedback.force * 100).toFixed(0)}% pressure`,
        ...trainingProgress.feedback.slice(0, 4)
      ];
      setTrainingProgress(prev => ({ ...prev, feedback: newFeedback }));
    }
  }, [currentTechnique, tissuePhysics, hapticDevice, isTraining, trainingProgress.feedback]);

  // Update training progress based on technique performance
  const updateTrainingProgress = useCallback((feedback: any, point: THREE.Vector3, pressure: number) => {
    if (!currentTechnique) return;

    const { assessmentCriteria, forcePattern, safety } = currentTechnique;
    let score = 0;
    
    // Force control assessment
    const targetForce = forcePattern.peakForce;
    const forceAccuracy = 1 - Math.abs(feedback.force - targetForce) / targetForce;
    score += forceAccuracy * (assessmentCriteria.forceControl / 100);
    
    // Safety assessment
    if (feedback.force > safety.maxForce) {
      score *= 0.5; // Penalize for exceeding safe force
      setTrainingProgress(prev => ({
        ...prev,
        feedback: ['⚠️ Excessive force applied', ...prev.feedback.slice(0, 4)]
      }));
    }
    
    // Region accuracy assessment
    const validTechnique = tissuePhysics.isValidTechnique(point, currentTechnique.id);
    if (validTechnique) {
      score += assessmentCriteria.regionAccuracy / 100;
    }

    setTrainingProgress(prev => ({
      ...prev,
      score: Math.max(0, Math.min(100, score * 100))
    }));
  }, [currentTechnique, tissuePhysics]);

  // Start training session
  const startTraining = useCallback(() => {
    if (!currentTechnique || !hapticDevice.isConnected) return;

    setIsTraining(true);
    setTrainingProgress({
      score: 0,
      feedback: ['Training session started'],
      timeRemaining: currentTechnique.duration
    });

    // Timer for training session
    trainingSessionRef.current = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev.timeRemaining <= 1) {
          setIsTraining(false);
          clearInterval(trainingSessionRef.current);
          return {
            ...prev,
            timeRemaining: 0,
            feedback: [`Training completed! Final score: ${prev.score}%`, ...prev.feedback.slice(0, 4)]
          };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  }, [currentTechnique, hapticDevice.isConnected]);

  // Stop training session
  const stopTraining = useCallback(() => {
    setIsTraining(false);
    if (trainingSessionRef.current) {
      clearInterval(trainingSessionRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (trainingSessionRef.current) {
        clearInterval(trainingSessionRef.current);
      }
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
        {/* 3D Haptic Viewer */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-5 w-5" />
                Haptic Manual Therapy Simulator
                <div className="flex items-center gap-2 ml-auto">
                  {hapticDevice.isConnected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Wifi className="h-3 w-3 mr-1" />
                      Device Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <WifiOff className="h-3 w-3 mr-1" />
                      No Device
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 bg-gray-900 rounded-lg overflow-hidden">
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
                  
                  <InteractiveSkeleton
                    patientData={patientData}
                    onTouch={handleTouch}
                    currentTechnique={currentTechnique}
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
              </div>
            </CardContent>
          </Card>

          {/* Device Status and Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Haptic Device Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hapticDevice.isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    No haptic device detected. Connect a compatible device or use mouse for basic simulation.
                  </div>
                  <Button onClick={hapticDevice.connectDevice} size="sm">
                    Connect Device
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium">{hapticDevice.device?.name}</div>
                    <div className="text-muted-foreground">
                      Capabilities: {hapticDevice.device?.capabilities.vibration ? 'Vibration' : ''} 
                      {hapticDevice.device?.capabilities.force ? ', Force Feedback' : ''}
                      {hapticDevice.device?.capabilities.temperature ? ', Temperature' : ''}
                    </div>
                  </div>
                  
                  {!hapticDevice.isCalibrated && (
                    <Button onClick={hapticDevice.calibrateDevice} size="sm">
                      Calibrate Device
                    </Button>
                  )}
                  
                  <div className="flex gap-2">
                    {currentTechnique && (
                      <>
                        <Button 
                          onClick={isTraining ? stopTraining : startTraining}
                          disabled={!hapticDevice.isCalibrated}
                          size="sm"
                        >
                          {isTraining ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Stop Training
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Training
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => setCurrentTechnique(null)}
                          variant="outline"
                          size="sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Manual Therapy Library and Training */}
        <div className="space-y-4">
          <ManualTherapyLibrary
            onTechniqueSelect={setCurrentTechnique}
            currentTechnique={currentTechnique}
            isTraining={isTraining}
            trainingProgress={trainingProgress}
          />
          
          {/* Current Technique Info */}
          {currentTechnique && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Active Technique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium">{currentTechnique.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {currentTechnique.description}
                  </div>
                </div>
                
                <div className="text-xs space-y-1">
                  <div><strong>Force Range:</strong> {(currentTechnique.forcePattern.initialForce * 100).toFixed(0)}% - {(currentTechnique.forcePattern.peakForce * 100).toFixed(0)}%</div>
                  <div><strong>Pattern:</strong> {currentTechnique.forcePattern.rhythm}</div>
                  <div><strong>Duration:</strong> {currentTechnique.duration}s</div>
                </div>
                
                <div className="text-xs">
                  <strong>Instructions:</strong> Click and drag on the skeleton to apply the technique. 
                  Feel the haptic feedback as you interact with different tissue types.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}