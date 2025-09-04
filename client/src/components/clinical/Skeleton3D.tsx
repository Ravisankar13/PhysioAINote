import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";

interface SkeletonConfig {
  limbLengths: {
    upperArm: number;
    forearm: number;
    hand: number;
    thigh: number;
    shin: number;
    foot: number;
    spine: number;
    neck: number;
  };
  jointAngles: {
    shoulderFlexion: number;
    shoulderAbduction: number;
    elbowFlexion: number;
    wristFlexion: number;
    hipFlexion: number;
    hipAbduction: number;
    kneeFlexion: number;
    ankleFlexion: number;
    spineFlexion: number;
    neckFlexion: number;
  };
  bodyProportions: {
    shoulderWidth: number;
    hipWidth: number;
    chestDepth: number;
    headSize: number;
  };
}

const defaultConfig: SkeletonConfig = {
  limbLengths: {
    upperArm: 30,
    forearm: 28,
    hand: 8,
    thigh: 42,
    shin: 40,
    foot: 10,
    spine: 50,
    neck: 10,
  },
  jointAngles: {
    shoulderFlexion: 0,
    shoulderAbduction: 0,
    elbowFlexion: 0,
    wristFlexion: 0,
    hipFlexion: 0,
    hipAbduction: 0,
    kneeFlexion: 0,
    ankleFlexion: 0,
    spineFlexion: 0,
    neckFlexion: 0,
  },
  bodyProportions: {
    shoulderWidth: 40,
    hipWidth: 30,
    chestDepth: 20,
    headSize: 10,
  },
};

// Simple bone component
function Bone({ 
  start, 
  end, 
  thickness = 0.025,
  color = "#e0e0e0",
  onClick,
  name 
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  thickness?: number;
  color?: string;
  onClick?: () => void;
  name?: string;
}) {
  const [hovered, setHovered] = useState(false);
  
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = endVec.clone().sub(startVec);
  const length = direction.length();
  const midpoint = startVec.clone().add(direction.clone().multiplyScalar(0.5));
  
  return (
    <>
      <mesh
        position={[midpoint.x, midpoint.y, midpoint.z]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[thickness, thickness, length, 8]} />
        <meshStandardMaterial color={hovered ? "#60a5fa" : color} />
      </mesh>
      
      {/* Joint spheres */}
      <mesh position={start}>
        <sphereGeometry args={[thickness * 1.5, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[thickness * 1.5, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {hovered && name && (
        <Html position={[midpoint.x, midpoint.y + 0.1, midpoint.z]}>
          <Badge className="bg-blue-500 text-white text-xs">
            {name}
          </Badge>
        </Html>
      )}
    </>
  );
}

// Main skeleton model
function SkeletonModel({ config, onBoneSelect }: { 
  config: SkeletonConfig;
  onBoneSelect: (bone: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Convert cm to Three.js units (1 unit = 100cm)
  const scale = 0.01;
  
  // Calculate positions based on config
  const bones = useMemo(() => {
    const { limbLengths, jointAngles, bodyProportions } = config;
    const bones = [];
    
    // Convert degrees to radians
    const toRad = (deg: number) => deg * Math.PI / 180;
    
    // Spine
    bones.push({
      name: "Spine",
      start: [0, 0, 0] as [number, number, number],
      end: [0, limbLengths.spine * scale, 0] as [number, number, number],
      thickness: 0.04,
    });
    
    // Neck
    bones.push({
      name: "Neck",
      start: [0, limbLengths.spine * scale, 0] as [number, number, number],
      end: [0, (limbLengths.spine + limbLengths.neck) * scale, 0] as [number, number, number],
      thickness: 0.03,
    });
    
    // Head
    bones.push({
      name: "Head",
      start: [0, (limbLengths.spine + limbLengths.neck) * scale, 0] as [number, number, number],
      end: [0, (limbLengths.spine + limbLengths.neck + bodyProportions.headSize) * scale, 0] as [number, number, number],
      thickness: 0.05,
    });
    
    // Left arm
    const leftShoulderX = -bodyProportions.shoulderWidth * scale / 2;
    const leftShoulderY = limbLengths.spine * scale;
    
    bones.push({
      name: "Left Clavicle",
      start: [0, leftShoulderY, 0] as [number, number, number],
      end: [leftShoulderX, leftShoulderY, 0] as [number, number, number],
      thickness: 0.02,
    });
    
    const leftElbowX = leftShoulderX - limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction));
    const leftElbowY = leftShoulderY - limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion));
    
    bones.push({
      name: "Left Humerus",
      start: [leftShoulderX, leftShoulderY, 0] as [number, number, number],
      end: [leftElbowX, leftElbowY, 0] as [number, number, number],
      thickness: 0.025,
    });
    
    const leftWristX = leftElbowX - limbLengths.forearm * scale * Math.sin(toRad(jointAngles.elbowFlexion));
    const leftWristY = leftElbowY - limbLengths.forearm * scale;
    
    bones.push({
      name: "Left Forearm",
      start: [leftElbowX, leftElbowY, 0] as [number, number, number],
      end: [leftWristX, leftWristY, 0] as [number, number, number],
      thickness: 0.02,
    });
    
    // Right arm (mirror)
    const rightShoulderX = bodyProportions.shoulderWidth * scale / 2;
    const rightShoulderY = limbLengths.spine * scale;
    
    bones.push({
      name: "Right Clavicle",
      start: [0, rightShoulderY, 0] as [number, number, number],
      end: [rightShoulderX, rightShoulderY, 0] as [number, number, number],
      thickness: 0.02,
    });
    
    const rightElbowX = rightShoulderX + limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction));
    const rightElbowY = rightShoulderY - limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion));
    
    bones.push({
      name: "Right Humerus",
      start: [rightShoulderX, rightShoulderY, 0] as [number, number, number],
      end: [rightElbowX, rightElbowY, 0] as [number, number, number],
      thickness: 0.025,
    });
    
    const rightWristX = rightElbowX + limbLengths.forearm * scale * Math.sin(toRad(jointAngles.elbowFlexion));
    const rightWristY = rightElbowY - limbLengths.forearm * scale;
    
    bones.push({
      name: "Right Forearm",
      start: [rightElbowX, rightElbowY, 0] as [number, number, number],
      end: [rightWristX, rightWristY, 0] as [number, number, number],
      thickness: 0.02,
    });
    
    // Pelvis
    bones.push({
      name: "Pelvis",
      start: [-bodyProportions.hipWidth * scale / 2, 0, 0] as [number, number, number],
      end: [bodyProportions.hipWidth * scale / 2, 0, 0] as [number, number, number],
      thickness: 0.03,
    });
    
    // Left leg
    const leftHipX = -bodyProportions.hipWidth * scale / 2;
    const leftKneeX = leftHipX - limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipAbduction));
    const leftKneeY = -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion));
    
    bones.push({
      name: "Left Femur",
      start: [leftHipX, 0, 0] as [number, number, number],
      end: [leftKneeX, leftKneeY, 0] as [number, number, number],
      thickness: 0.035,
    });
    
    const leftAnkleX = leftKneeX;
    const leftAnkleY = leftKneeY - limbLengths.shin * scale * Math.cos(toRad(jointAngles.kneeFlexion));
    
    bones.push({
      name: "Left Tibia",
      start: [leftKneeX, leftKneeY, 0] as [number, number, number],
      end: [leftAnkleX, leftAnkleY, 0] as [number, number, number],
      thickness: 0.03,
    });
    
    // Right leg (mirror)
    const rightHipX = bodyProportions.hipWidth * scale / 2;
    const rightKneeX = rightHipX + limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipAbduction));
    const rightKneeY = -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion));
    
    bones.push({
      name: "Right Femur",
      start: [rightHipX, 0, 0] as [number, number, number],
      end: [rightKneeX, rightKneeY, 0] as [number, number, number],
      thickness: 0.035,
    });
    
    const rightAnkleX = rightKneeX;
    const rightAnkleY = rightKneeY - limbLengths.shin * scale * Math.cos(toRad(jointAngles.kneeFlexion));
    
    bones.push({
      name: "Right Tibia",
      start: [rightKneeX, rightKneeY, 0] as [number, number, number],
      end: [rightAnkleX, rightAnkleY, 0] as [number, number, number],
      thickness: 0.03,
    });
    
    return bones;
  }, [config]);
  
  // Rotate model slowly
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  return (
    <group ref={groupRef}>
      {bones.map((bone, index) => (
        <Bone
          key={index}
          name={bone.name}
          start={bone.start}
          end={bone.end}
          thickness={bone.thickness}
          onClick={() => onBoneSelect(bone.name)}
        />
      ))}
      
      {/* Grid for reference */}
      <gridHelper args={[2, 20, "#303030", "#303030"]} position={[0, -1, 0]} />
    </group>
  );
}

export default function Skeleton3D({ 
  onPatientDataChange 
}: { 
  onPatientDataChange?: (config: SkeletonConfig) => void 
}) {
  const [config, setConfig] = useState<SkeletonConfig>(defaultConfig);
  const [selectedBone, setSelectedBone] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState("limbs");
  
  const updateLimbLength = (limb: keyof typeof config.limbLengths, value: number) => {
    const newConfig = {
      ...config,
      limbLengths: {
        ...config.limbLengths,
        [limb]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const updateJointAngle = (joint: keyof typeof config.jointAngles, value: number) => {
    const newConfig = {
      ...config,
      jointAngles: {
        ...config.jointAngles,
        [joint]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const updateBodyProportion = (prop: keyof typeof config.bodyProportions, value: number) => {
    const newConfig = {
      ...config,
      bodyProportions: {
        ...config.bodyProportions,
        [prop]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const resetToDefault = () => {
    setConfig(defaultConfig);
    onPatientDataChange?.(defaultConfig);
    setSelectedBone("");
  };
  
  const saveConfiguration = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `patient-skeleton-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[700px]">
      {/* 3D Viewport */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <div className="h-full relative bg-gray-900 rounded-lg">
              <Canvas
                camera={{ position: [1.5, 0.5, 1.5], fov: 50 }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={0.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.3} />
                
                <SkeletonModel
                  config={config}
                  onBoneSelect={setSelectedBone}
                />
                
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={1}
                  maxDistance={5}
                />
              </Canvas>
              
              <div className="absolute top-4 left-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={saveConfiguration}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
              
              {selectedBone && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white">
                    Selected: {selectedBone}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls Panel */}
      <div className="lg:col-span-1">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Patient Configuration</h3>
            
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="limbs">Limbs</TabsTrigger>
                <TabsTrigger value="joints">Joints</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
              </TabsList>
              
              {/* Limb Length Controls */}
              <TabsContent value="limbs" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Upper Body (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Upper Arm: {config.limbLengths.upperArm}cm</Label>
                    <Slider
                      value={[config.limbLengths.upperArm]}
                      onValueChange={([v]) => updateLimbLength("upperArm", v)}
                      min={20}
                      max={40}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Forearm: {config.limbLengths.forearm}cm</Label>
                    <Slider
                      value={[config.limbLengths.forearm]}
                      onValueChange={([v]) => updateLimbLength("forearm", v)}
                      min={20}
                      max={35}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Lower Body (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Thigh: {config.limbLengths.thigh}cm</Label>
                    <Slider
                      value={[config.limbLengths.thigh]}
                      onValueChange={([v]) => updateLimbLength("thigh", v)}
                      min={35}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Shin: {config.limbLengths.shin}cm</Label>
                    <Slider
                      value={[config.limbLengths.shin]}
                      onValueChange={([v]) => updateLimbLength("shin", v)}
                      min={35}
                      max={45}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Core (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine: {config.limbLengths.spine}cm</Label>
                    <Slider
                      value={[config.limbLengths.spine]}
                      onValueChange={([v]) => updateLimbLength("spine", v)}
                      min={40}
                      max={60}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Neck: {config.limbLengths.neck}cm</Label>
                    <Slider
                      value={[config.limbLengths.neck]}
                      onValueChange={([v]) => updateLimbLength("neck", v)}
                      min={8}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Joint Angle Controls */}
              <TabsContent value="joints" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Shoulder</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.shoulderFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.shoulderFlexion]}
                      onValueChange={([v]) => updateJointAngle("shoulderFlexion", v)}
                      min={-180}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Abduction: {config.jointAngles.shoulderAbduction}°</Label>
                    <Slider
                      value={[config.jointAngles.shoulderAbduction]}
                      onValueChange={([v]) => updateJointAngle("shoulderAbduction", v)}
                      min={0}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Elbow</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.elbowFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.elbowFlexion]}
                      onValueChange={([v]) => updateJointAngle("elbowFlexion", v)}
                      min={0}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Hip</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.hipFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.hipFlexion]}
                      onValueChange={([v]) => updateJointAngle("hipFlexion", v)}
                      min={-20}
                      max={120}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Abduction: {config.jointAngles.hipAbduction}°</Label>
                    <Slider
                      value={[config.jointAngles.hipAbduction]}
                      onValueChange={([v]) => updateJointAngle("hipAbduction", v)}
                      min={0}
                      max={45}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Knee</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.kneeFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.kneeFlexion]}
                      onValueChange={([v]) => updateJointAngle("kneeFlexion", v)}
                      min={0}
                      max={135}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Body Proportion Controls */}
              <TabsContent value="body" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Shoulder Width: {config.bodyProportions.shoulderWidth}cm</Label>
                    <Slider
                      value={[config.bodyProportions.shoulderWidth]}
                      onValueChange={([v]) => updateBodyProportion("shoulderWidth", v)}
                      min={30}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Hip Width: {config.bodyProportions.hipWidth}cm</Label>
                    <Slider
                      value={[config.bodyProportions.hipWidth]}
                      onValueChange={([v]) => updateBodyProportion("hipWidth", v)}
                      min={25}
                      max={40}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Chest Depth: {config.bodyProportions.chestDepth}cm</Label>
                    <Slider
                      value={[config.bodyProportions.chestDepth]}
                      onValueChange={([v]) => updateBodyProportion("chestDepth", v)}
                      min={15}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Head Size: {config.bodyProportions.headSize}cm</Label>
                    <Slider
                      value={[config.bodyProportions.headSize]}
                      onValueChange={([v]) => updateBodyProportion("headSize", v)}
                      min={8}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}