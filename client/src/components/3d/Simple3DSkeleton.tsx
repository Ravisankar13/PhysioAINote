import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
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
  EyeOff
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

interface SimpleSkeleton3DProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

// Simple skeleton bone component
function Bone({ 
  start, 
  end, 
  color = "#ffffff", 
  thickness = 0.1 
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  color?: string; 
  thickness?: number; 
}) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  const center = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  
  return (
    <mesh position={center.toArray()}>
      <cylinderGeometry args={[thickness, thickness, length, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Joint sphere component
function Joint({ 
  position, 
  color = "#ff6b6b", 
  size = 0.15,
  label
}: { 
  position: [number, number, number]; 
  color?: string; 
  size?: number;
  label?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {label && (
        <Text
          position={[0, size + 0.3, 0]}
          fontSize={0.2}
          color="#333333"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

// Main skeleton component
function SkeletonModel({ 
  anthropometrics, 
  jointRestrictions, 
  painAreas = [],
  showJointLimits,
  selectedJoint
}: {
  anthropometrics?: PatientAnthropometrics;
  jointRestrictions?: JointRestrictions;
  painAreas?: string[];
  showJointLimits: boolean;
  selectedJoint?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Scale factors based on anthropometrics
  const heightScale = anthropometrics ? anthropometrics.height / 170 : 1;
  const limbScale = {
    upperArm: anthropometrics?.limbLengths.upperArm || 30,
    forearm: anthropometrics?.limbLengths.forearm || 25,
    thigh: anthropometrics?.limbLengths.thigh || 40,
    shin: anthropometrics?.limbLengths.shin || 35,
  };

  // Define joint positions (scaled)
  const joints = {
    head: [0, 8 * heightScale, 0] as [number, number, number],
    neck: [0, 7 * heightScale, 0] as [number, number, number],
    leftShoulder: [-1.5 * heightScale, 6.5 * heightScale, 0] as [number, number, number],
    rightShoulder: [1.5 * heightScale, 6.5 * heightScale, 0] as [number, number, number],
    leftElbow: [-1.5 * heightScale, 4.5 * heightScale, 0] as [number, number, number],
    rightElbow: [1.5 * heightScale, 4.5 * heightScale, 0] as [number, number, number],
    leftWrist: [-1.5 * heightScale, 2.5 * heightScale, 0] as [number, number, number],
    rightWrist: [1.5 * heightScale, 2.5 * heightScale, 0] as [number, number, number],
    spine: [0, 5 * heightScale, 0] as [number, number, number],
    pelvis: [0, 3 * heightScale, 0] as [number, number, number],
    leftHip: [-1 * heightScale, 3 * heightScale, 0] as [number, number, number],
    rightHip: [1 * heightScale, 3 * heightScale, 0] as [number, number, number],
    leftKnee: [-1 * heightScale, 1 * heightScale, 0] as [number, number, number],
    rightKnee: [1 * heightScale, 1 * heightScale, 0] as [number, number, number],
    leftAnkle: [-1 * heightScale, -1 * heightScale, 0] as [number, number, number],
    rightAnkle: [1 * heightScale, -1 * heightScale, 0] as [number, number, number],
  };

  // Color coding for pain areas
  const getJointColor = (jointName: string) => {
    if (painAreas.includes(jointName) || painAreas.includes(jointName.replace('left', '').replace('right', '').toLowerCase())) {
      return "#ff4444"; // Red for pain areas
    }
    if (selectedJoint === jointName) {
      return "#4CAF50"; // Green for selected
    }
    return "#ff6b6b"; // Default joint color
  };

  const getBoneColor = (boneName: string) => {
    if (painAreas.some(area => boneName.toLowerCase().includes(area.toLowerCase()))) {
      return "#ffaaaa"; // Light red for affected bones
    }
    return "#ffffff"; // Default bone color
  };

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Skull */}
      <mesh position={joints.head}>
        <sphereGeometry args={[0.4 * heightScale, 16, 16]} />
        <meshStandardMaterial color={getBoneColor('head')} />
      </mesh>

      {/* Spine */}
      <Bone start={joints.neck} end={joints.spine} color={getBoneColor('spine')} />
      <Bone start={joints.spine} end={joints.pelvis} color={getBoneColor('spine')} />

      {/* Arms */}
      <Bone start={joints.leftShoulder} end={joints.leftElbow} color={getBoneColor('arm')} />
      <Bone start={joints.leftElbow} end={joints.leftWrist} color={getBoneColor('arm')} />
      <Bone start={joints.rightShoulder} end={joints.rightElbow} color={getBoneColor('arm')} />
      <Bone start={joints.rightElbow} end={joints.rightWrist} color={getBoneColor('arm')} />

      {/* Legs */}
      <Bone start={joints.leftHip} end={joints.leftKnee} color={getBoneColor('leg')} />
      <Bone start={joints.leftKnee} end={joints.leftAnkle} color={getBoneColor('leg')} />
      <Bone start={joints.rightHip} end={joints.rightKnee} color={getBoneColor('leg')} />
      <Bone start={joints.rightKnee} end={joints.rightAnkle} color={getBoneColor('leg')} />

      {/* Shoulder connections */}
      <Bone start={joints.neck} end={joints.leftShoulder} color={getBoneColor('shoulder')} />
      <Bone start={joints.neck} end={joints.rightShoulder} color={getBoneColor('shoulder')} />

      {/* Hip connections */}
      <Bone start={joints.pelvis} end={joints.leftHip} color={getBoneColor('hip')} />
      <Bone start={joints.pelvis} end={joints.rightHip} color={getBoneColor('hip')} />

      {/* Joints */}
      <Joint position={joints.leftShoulder} color={getJointColor('leftShoulder')} label={showJointLimits ? 'L Shoulder' : undefined} />
      <Joint position={joints.rightShoulder} color={getJointColor('rightShoulder')} label={showJointLimits ? 'R Shoulder' : undefined} />
      <Joint position={joints.leftElbow} color={getJointColor('leftElbow')} label={showJointLimits ? 'L Elbow' : undefined} />
      <Joint position={joints.rightElbow} color={getJointColor('rightElbow')} label={showJointLimits ? 'R Elbow' : undefined} />
      <Joint position={joints.leftHip} color={getJointColor('leftHip')} label={showJointLimits ? 'L Hip' : undefined} />
      <Joint position={joints.rightHip} color={getJointColor('rightHip')} label={showJointLimits ? 'R Hip' : undefined} />
      <Joint position={joints.leftKnee} color={getJointColor('leftKnee')} label={showJointLimits ? 'L Knee' : undefined} />
      <Joint position={joints.rightKnee} color={getJointColor('rightKnee')} label={showJointLimits ? 'R Knee' : undefined} />

      {/* Joint range indicators (when showing limits) */}
      {showJointLimits && jointRestrictions && (
        <>
          {/* Shoulder range indicators */}
          {selectedJoint === 'shoulder' && (
            <group position={joints.leftShoulder}>
              <mesh>
                <ringGeometry args={[1, 1.5, 32]} />
                <meshBasicMaterial color="#4CAF50" transparent opacity={0.3} />
              </mesh>
            </group>
          )}
        </>
      )}
    </group>
  );
}

export default function Simple3DSkeleton({ patientData, className }: SimpleSkeleton3DProps) {
  const [selectedJoint, setSelectedJoint] = useState<string>('');
  const [showJointLimits, setShowJointLimits] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 3D Viewer */}
        <div className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden">
          <Canvas camera={{ position: [5, 5, 10], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            
            <SkeletonModel
              anthropometrics={patientData?.anthropometrics}
              jointRestrictions={patientData?.jointRestrictions}
              painAreas={patientData?.painAreas}
              showJointLimits={showJointLimits}
              selectedJoint={selectedJoint}
            />
            
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          </Canvas>
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
        </div>
      </div>
    </div>
  );
}