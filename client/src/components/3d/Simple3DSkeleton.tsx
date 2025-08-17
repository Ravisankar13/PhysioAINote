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

// Simple skeleton bone component with proper alignment
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
  
  // Calculate rotation to align cylinder with the bone direction
  const orientation = new THREE.Matrix4();
  orientation.lookAt(startVec, endVec, new THREE.Vector3(0, 1, 0));
  orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  
  const quaternion = new THREE.Quaternion();
  quaternion.setFromRotationMatrix(orientation);
  
  return (
    <mesh 
      position={center.toArray()}
      quaternion={quaternion}
    >
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

  // Define joint positions (scaled) - anatomically correct proportions
  const joints = {
    // Head and neck
    head: [0, 8.5 * heightScale, 0] as [number, number, number],
    neck: [0, 7.5 * heightScale, 0] as [number, number, number],
    
    // Upper body - shoulders aligned with clavicles
    leftShoulder: [-1.8 * heightScale, 6.8 * heightScale, 0] as [number, number, number],
    rightShoulder: [1.8 * heightScale, 6.8 * heightScale, 0] as [number, number, number],
    
    // Arms - natural hanging position
    leftElbow: [-2.2 * heightScale, 4.5 * heightScale, 0.2] as [number, number, number],
    rightElbow: [2.2 * heightScale, 4.5 * heightScale, 0.2] as [number, number, number],
    leftWrist: [-2.3 * heightScale, 2.5 * heightScale, 0.3] as [number, number, number],
    rightWrist: [2.3 * heightScale, 2.5 * heightScale, 0.3] as [number, number, number],
    
    // Spine and core
    upperSpine: [0, 6 * heightScale, 0] as [number, number, number],
    midSpine: [0, 4.5 * heightScale, 0] as [number, number, number],
    lowerSpine: [0, 3.5 * heightScale, 0] as [number, number, number],
    pelvis: [0, 2.8 * heightScale, 0] as [number, number, number],
    
    // Hips - anatomically correct width
    leftHip: [-0.9 * heightScale, 2.6 * heightScale, 0] as [number, number, number],
    rightHip: [0.9 * heightScale, 2.6 * heightScale, 0] as [number, number, number],
    
    // Legs - natural stance
    leftKnee: [-0.95 * heightScale, 0.5 * heightScale, 0.1] as [number, number, number],
    rightKnee: [0.95 * heightScale, 0.5 * heightScale, 0.1] as [number, number, number],
    leftAnkle: [-1 * heightScale, -1.8 * heightScale, 0] as [number, number, number],
    rightAnkle: [1 * heightScale, -1.8 * heightScale, 0] as [number, number, number],
    
    // Feet
    leftFoot: [-1 * heightScale, -2.2 * heightScale, 0.3] as [number, number, number],
    rightFoot: [1 * heightScale, -2.2 * heightScale, 0.3] as [number, number, number],
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

      {/* Spine - multi-segment for better anatomical accuracy */}
      <Bone start={joints.neck} end={joints.upperSpine} color={getBoneColor('spine')} thickness={0.15} />
      <Bone start={joints.upperSpine} end={joints.midSpine} color={getBoneColor('spine')} thickness={0.18} />
      <Bone start={joints.midSpine} end={joints.lowerSpine} color={getBoneColor('spine')} thickness={0.2} />
      <Bone start={joints.lowerSpine} end={joints.pelvis} color={getBoneColor('spine')} thickness={0.22} />

      {/* Shoulder connections - clavicles */}
      <Bone start={joints.upperSpine} end={joints.leftShoulder} color={getBoneColor('clavicle')} thickness={0.08} />
      <Bone start={joints.upperSpine} end={joints.rightShoulder} color={getBoneColor('clavicle')} thickness={0.08} />
      
      {/* Ribcage - simplified representation */}
      {[0, 0.3, 0.6, 0.9].map((offset, index) => {
        const ribY = joints.upperSpine[1] - offset * heightScale;
        const ribWidth = (1.2 - index * 0.1) * heightScale;
        return (
          <group key={`rib-${index}`}>
            <Bone 
              start={[0, ribY, 0]} 
              end={[-ribWidth, ribY - 0.2 * heightScale, 0.3 * heightScale]} 
              color={getBoneColor('rib')} 
              thickness={0.05} 
            />
            <Bone 
              start={[0, ribY, 0]} 
              end={[ribWidth, ribY - 0.2 * heightScale, 0.3 * heightScale]} 
              color={getBoneColor('rib')} 
              thickness={0.05} 
            />
          </group>
        );
      })}

      {/* Arms - upper arm (humerus) */}
      <Bone start={joints.leftShoulder} end={joints.leftElbow} color={getBoneColor('arm')} thickness={0.12} />
      <Bone start={joints.rightShoulder} end={joints.rightElbow} color={getBoneColor('arm')} thickness={0.12} />
      
      {/* Arms - forearm (radius/ulna) */}
      <Bone start={joints.leftElbow} end={joints.leftWrist} color={getBoneColor('arm')} thickness={0.1} />
      <Bone start={joints.rightElbow} end={joints.rightWrist} color={getBoneColor('arm')} thickness={0.1} />

      {/* Pelvis structure */}
      <Bone start={joints.pelvis} end={joints.leftHip} color={getBoneColor('pelvis')} thickness={0.15} />
      <Bone start={joints.pelvis} end={joints.rightHip} color={getBoneColor('pelvis')} thickness={0.15} />
      <Bone start={joints.leftHip} end={joints.rightHip} color={getBoneColor('pelvis')} thickness={0.12} />

      {/* Legs - femur (thigh bone) */}
      <Bone start={joints.leftHip} end={joints.leftKnee} color={getBoneColor('leg')} thickness={0.14} />
      <Bone start={joints.rightHip} end={joints.rightKnee} color={getBoneColor('leg')} thickness={0.14} />
      
      {/* Legs - tibia/fibula (shin bones) */}
      <Bone start={joints.leftKnee} end={joints.leftAnkle} color={getBoneColor('leg')} thickness={0.12} />
      <Bone start={joints.rightKnee} end={joints.rightAnkle} color={getBoneColor('leg')} thickness={0.12} />
      
      {/* Feet */}
      <Bone start={joints.leftAnkle} end={joints.leftFoot} color={getBoneColor('foot')} thickness={0.08} />
      <Bone start={joints.rightAnkle} end={joints.rightFoot} color={getBoneColor('foot')} thickness={0.08} />

      {/* Joints - all major joints for anatomical accuracy */}
      {/* Head and neck */}
      <Joint position={joints.neck} color={getJointColor('neck')} size={0.12} />
      
      {/* Spine joints */}
      <Joint position={joints.upperSpine} color={getJointColor('upperSpine')} size={0.14} />
      <Joint position={joints.midSpine} color={getJointColor('midSpine')} size={0.16} />
      <Joint position={joints.lowerSpine} color={getJointColor('lowerSpine')} size={0.18} />
      <Joint position={joints.pelvis} color={getJointColor('pelvis')} size={0.2} />
      
      {/* Shoulder joints */}
      <Joint position={joints.leftShoulder} color={getJointColor('leftShoulder')} label={showJointLimits ? 'L Shoulder' : undefined} />
      <Joint position={joints.rightShoulder} color={getJointColor('rightShoulder')} label={showJointLimits ? 'R Shoulder' : undefined} />
      
      {/* Elbow joints */}
      <Joint position={joints.leftElbow} color={getJointColor('leftElbow')} label={showJointLimits ? 'L Elbow' : undefined} />
      <Joint position={joints.rightElbow} color={getJointColor('rightElbow')} label={showJointLimits ? 'R Elbow' : undefined} />
      
      {/* Wrist joints */}
      <Joint position={joints.leftWrist} color={getJointColor('leftWrist')} size={0.1} label={showJointLimits ? 'L Wrist' : undefined} />
      <Joint position={joints.rightWrist} color={getJointColor('rightWrist')} size={0.1} label={showJointLimits ? 'R Wrist' : undefined} />
      
      {/* Hip joints */}
      <Joint position={joints.leftHip} color={getJointColor('leftHip')} label={showJointLimits ? 'L Hip' : undefined} />
      <Joint position={joints.rightHip} color={getJointColor('rightHip')} label={showJointLimits ? 'R Hip' : undefined} />
      
      {/* Knee joints */}
      <Joint position={joints.leftKnee} color={getJointColor('leftKnee')} label={showJointLimits ? 'L Knee' : undefined} />
      <Joint position={joints.rightKnee} color={getJointColor('rightKnee')} label={showJointLimits ? 'R Knee' : undefined} />
      
      {/* Ankle joints */}
      <Joint position={joints.leftAnkle} color={getJointColor('leftAnkle')} size={0.12} label={showJointLimits ? 'L Ankle' : undefined} />
      <Joint position={joints.rightAnkle} color={getJointColor('rightAnkle')} size={0.12} label={showJointLimits ? 'R Ankle' : undefined} />
      
      {/* Foot joints */}
      <Joint position={joints.leftFoot} color={getJointColor('leftFoot')} size={0.1} />
      <Joint position={joints.rightFoot} color={getJointColor('rightFoot')} size={0.1} />

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