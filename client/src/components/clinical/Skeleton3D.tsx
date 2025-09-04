import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls, Text, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, ZoomIn, ZoomOut, Move3d } from "lucide-react";

// Anatomically accurate bone structure with medical measurements
interface BoneData {
  name: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  thickness: number;
  clickable: boolean;
  jointName?: string;
  maxAngle?: number;
  minAngle?: number;
  axis?: "x" | "y" | "z";
}

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
    shoulderRotation: number;
    elbowFlexion: number;
    wristFlexion: number;
    wristDeviation: number;
    hipFlexion: number;
    hipAbduction: number;
    hipRotation: number;
    kneeFlexion: number;
    ankleFlexion: number;
    spineFlexion: number;
    spineLateral: number;
    spineRotation: number;
    neckFlexion: number;
    neckRotation: number;
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
    upperArm: 0.3,
    forearm: 0.28,
    hand: 0.08,
    thigh: 0.42,
    shin: 0.4,
    foot: 0.1,
    spine: 0.5,
    neck: 0.1,
  },
  jointAngles: {
    shoulderFlexion: 0,
    shoulderAbduction: 0,
    shoulderRotation: 0,
    elbowFlexion: 0,
    wristFlexion: 0,
    wristDeviation: 0,
    hipFlexion: 0,
    hipAbduction: 0,
    hipRotation: 0,
    kneeFlexion: 0,
    ankleFlexion: 0,
    spineFlexion: 0,
    spineLateral: 0,
    spineRotation: 0,
    neckFlexion: 0,
    neckRotation: 0,
  },
  bodyProportions: {
    shoulderWidth: 0.4,
    hipWidth: 0.3,
    chestDepth: 0.2,
    headSize: 0.1,
  },
};

// Individual bone component with hover and click detection
function Bone({ 
  data, 
  selected, 
  onSelect,
  color = "#e0e0e0" 
}: { 
  data: BoneData; 
  selected: boolean; 
  onSelect: () => void;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const direction = data.end.clone().sub(data.start);
  const length = direction.length();
  const midpoint = data.start.clone().add(direction.clone().multiplyScalar(0.5));
  
  // Create cylinder geometry aligned with bone direction
  const geometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(
      data.thickness,
      data.thickness,
      length,
      8
    );
    return geom;
  }, [data.thickness, length]);

  // Calculate rotation to align cylinder with bone direction
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction.clone().normalize());
    return quaternion;
  }, [direction]);

  return (
    <>
      <mesh
        ref={meshRef}
        position={midpoint}
        quaternion={quaternion}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          if (data.clickable) onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (data.clickable) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={selected ? "#4ade80" : hovered ? "#60a5fa" : color}
          emissive={selected ? "#22c55e" : hovered ? "#3b82f6" : "#000000"}
          emissiveIntensity={selected || hovered ? 0.2 : 0}
        />
      </mesh>
      
      {/* Joint spheres at bone ends */}
      <mesh position={data.start}>
        <sphereGeometry args={[data.thickness * 1.2, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={data.end}>
        <sphereGeometry args={[data.thickness * 1.2, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Label for selected bone */}
      {selected && (
        <Html position={midpoint}>
          <Badge className="bg-green-500 text-white">
            {data.name}
          </Badge>
        </Html>
      )}
    </>
  );
}

// Main skeleton assembly
function SkeletonModel({ 
  config, 
  onBoneSelect,
  selectedBone 
}: { 
  config: SkeletonConfig;
  onBoneSelect: (bone: string) => void;
  selectedBone: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate bone positions based on config
  const bones = useMemo<BoneData[]>(() => {
    const { limbLengths, jointAngles, bodyProportions } = config;
    const bones: BoneData[] = [];
    
    // Spine and core
    const pelvisPos = new THREE.Vector3(0, 0, 0);
    const spineTop = new THREE.Vector3(0, limbLengths.spine, 0);
    
    bones.push({
      name: "Spine",
      start: pelvisPos,
      end: spineTop,
      thickness: 0.04,
      clickable: true,
      jointName: "spine",
    });
    
    // Neck and head
    const neckTop = new THREE.Vector3(0, limbLengths.spine + limbLengths.neck, 0);
    bones.push({
      name: "Neck",
      start: spineTop,
      end: neckTop,
      thickness: 0.03,
      clickable: true,
      jointName: "neck",
    });
    
    // Head
    const headTop = new THREE.Vector3(0, limbLengths.spine + limbLengths.neck + bodyProportions.headSize, 0);
    bones.push({
      name: "Head",
      start: neckTop,
      end: headTop,
      thickness: 0.05,
      clickable: true,
    });
    
    // Shoulders (clavicles)
    const leftShoulderStart = new THREE.Vector3(0, limbLengths.spine, 0);
    const leftShoulderEnd = new THREE.Vector3(-bodyProportions.shoulderWidth/2, limbLengths.spine, 0);
    const rightShoulderEnd = new THREE.Vector3(bodyProportions.shoulderWidth/2, limbLengths.spine, 0);
    
    bones.push({
      name: "Left Clavicle",
      start: leftShoulderStart,
      end: leftShoulderEnd,
      thickness: 0.02,
      clickable: true,
    });
    
    bones.push({
      name: "Right Clavicle",
      start: leftShoulderStart,
      end: rightShoulderEnd,
      thickness: 0.02,
      clickable: true,
    });
    
    // Arms
    const leftElbow = new THREE.Vector3(
      -bodyProportions.shoulderWidth/2 - limbLengths.upperArm * Math.cos(jointAngles.shoulderAbduction * Math.PI / 180),
      limbLengths.spine - limbLengths.upperArm * Math.sin(jointAngles.shoulderFlexion * Math.PI / 180),
      limbLengths.upperArm * Math.sin(jointAngles.shoulderAbduction * Math.PI / 180)
    );
    
    bones.push({
      name: "Left Humerus",
      start: leftShoulderEnd,
      end: leftElbow,
      thickness: 0.025,
      clickable: true,
      jointName: "leftShoulder",
    });
    
    const leftWrist = new THREE.Vector3(
      leftElbow.x - limbLengths.forearm * Math.cos(jointAngles.elbowFlexion * Math.PI / 180),
      leftElbow.y - limbLengths.forearm,
      leftElbow.z
    );
    
    bones.push({
      name: "Left Radius/Ulna",
      start: leftElbow,
      end: leftWrist,
      thickness: 0.02,
      clickable: true,
      jointName: "leftElbow",
    });
    
    const leftHand = new THREE.Vector3(
      leftWrist.x,
      leftWrist.y - limbLengths.hand,
      leftWrist.z
    );
    
    bones.push({
      name: "Left Hand",
      start: leftWrist,
      end: leftHand,
      thickness: 0.015,
      clickable: true,
      jointName: "leftWrist",
    });
    
    // Right arm (mirror of left)
    const rightElbow = new THREE.Vector3(
      bodyProportions.shoulderWidth/2 + limbLengths.upperArm * Math.cos(jointAngles.shoulderAbduction * Math.PI / 180),
      limbLengths.spine - limbLengths.upperArm * Math.sin(jointAngles.shoulderFlexion * Math.PI / 180),
      limbLengths.upperArm * Math.sin(jointAngles.shoulderAbduction * Math.PI / 180)
    );
    
    bones.push({
      name: "Right Humerus",
      start: rightShoulderEnd,
      end: rightElbow,
      thickness: 0.025,
      clickable: true,
      jointName: "rightShoulder",
    });
    
    const rightWrist = new THREE.Vector3(
      rightElbow.x + limbLengths.forearm * Math.cos(jointAngles.elbowFlexion * Math.PI / 180),
      rightElbow.y - limbLengths.forearm,
      rightElbow.z
    );
    
    bones.push({
      name: "Right Radius/Ulna",
      start: rightElbow,
      end: rightWrist,
      thickness: 0.02,
      clickable: true,
      jointName: "rightElbow",
    });
    
    const rightHand = new THREE.Vector3(
      rightWrist.x,
      rightWrist.y - limbLengths.hand,
      rightWrist.z
    );
    
    bones.push({
      name: "Right Hand",
      start: rightWrist,
      end: rightHand,
      thickness: 0.015,
      clickable: true,
      jointName: "rightWrist",
    });
    
    // Pelvis
    const leftHipJoint = new THREE.Vector3(-bodyProportions.hipWidth/2, 0, 0);
    const rightHipJoint = new THREE.Vector3(bodyProportions.hipWidth/2, 0, 0);
    
    bones.push({
      name: "Pelvis",
      start: leftHipJoint,
      end: rightHipJoint,
      thickness: 0.03,
      clickable: true,
    });
    
    // Legs
    const leftKnee = new THREE.Vector3(
      -bodyProportions.hipWidth/2 - limbLengths.thigh * Math.sin(jointAngles.hipAbduction * Math.PI / 180),
      -limbLengths.thigh * Math.cos(jointAngles.hipFlexion * Math.PI / 180),
      limbLengths.thigh * Math.sin(jointAngles.hipFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Left Femur",
      start: leftHipJoint,
      end: leftKnee,
      thickness: 0.035,
      clickable: true,
      jointName: "leftHip",
    });
    
    const leftAnkle = new THREE.Vector3(
      leftKnee.x,
      leftKnee.y - limbLengths.shin * Math.cos(jointAngles.kneeFlexion * Math.PI / 180),
      leftKnee.z + limbLengths.shin * Math.sin(jointAngles.kneeFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Left Tibia/Fibula",
      start: leftKnee,
      end: leftAnkle,
      thickness: 0.03,
      clickable: true,
      jointName: "leftKnee",
    });
    
    const leftFoot = new THREE.Vector3(
      leftAnkle.x,
      leftAnkle.y - limbLengths.foot * Math.sin(jointAngles.ankleFlexion * Math.PI / 180),
      leftAnkle.z + limbLengths.foot * Math.cos(jointAngles.ankleFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Left Foot",
      start: leftAnkle,
      end: leftFoot,
      thickness: 0.025,
      clickable: true,
      jointName: "leftAnkle",
    });
    
    // Right leg (mirror of left)
    const rightKnee = new THREE.Vector3(
      bodyProportions.hipWidth/2 + limbLengths.thigh * Math.sin(jointAngles.hipAbduction * Math.PI / 180),
      -limbLengths.thigh * Math.cos(jointAngles.hipFlexion * Math.PI / 180),
      limbLengths.thigh * Math.sin(jointAngles.hipFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Right Femur",
      start: rightHipJoint,
      end: rightKnee,
      thickness: 0.035,
      clickable: true,
      jointName: "rightHip",
    });
    
    const rightAnkle = new THREE.Vector3(
      rightKnee.x,
      rightKnee.y - limbLengths.shin * Math.cos(jointAngles.kneeFlexion * Math.PI / 180),
      rightKnee.z + limbLengths.shin * Math.sin(jointAngles.kneeFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Right Tibia/Fibula",
      start: rightKnee,
      end: rightAnkle,
      thickness: 0.03,
      clickable: true,
      jointName: "rightKnee",
    });
    
    const rightFoot = new THREE.Vector3(
      rightAnkle.x,
      rightAnkle.y - limbLengths.foot * Math.sin(jointAngles.ankleFlexion * Math.PI / 180),
      rightAnkle.z + limbLengths.foot * Math.cos(jointAngles.ankleFlexion * Math.PI / 180)
    );
    
    bones.push({
      name: "Right Foot",
      start: rightAnkle,
      end: rightFoot,
      thickness: 0.025,
      clickable: true,
      jointName: "rightAnkle",
    });
    
    // Ribs (simplified)
    for (let i = 0; i < 6; i++) {
      const ribY = limbLengths.spine * (0.4 + i * 0.08);
      const ribWidth = bodyProportions.shoulderWidth * (0.7 + i * 0.05);
      
      bones.push({
        name: `Left Rib ${i + 1}`,
        start: new THREE.Vector3(0, ribY, 0),
        end: new THREE.Vector3(-ribWidth/2, ribY, bodyProportions.chestDepth/2),
        thickness: 0.01,
        clickable: false,
      });
      
      bones.push({
        name: `Right Rib ${i + 1}`,
        start: new THREE.Vector3(0, ribY, 0),
        end: new THREE.Vector3(ribWidth/2, ribY, bodyProportions.chestDepth/2),
        thickness: 0.01,
        clickable: false,
      });
    }
    
    return bones;
  }, [config]);
  
  // Rotate skeleton slowly for better viewing
  useFrame((state, delta) => {
    if (groupRef.current && !selectedBone) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });
  
  return (
    <group ref={groupRef}>
      {bones.map((bone, index) => (
        <Bone
          key={index}
          data={bone}
          selected={selectedBone === bone.name}
          onSelect={() => onBoneSelect(bone.name)}
          color={bone.clickable ? "#e0e0e0" : "#a0a0a0"}
        />
      ))}
      
      {/* Grid floor for reference */}
      <gridHelper args={[4, 20, "#303030", "#303030"]} position={[0, -1, 0]} />
    </group>
  );
}

// Main component
export default function Skeleton3D({ 
  onPatientDataChange 
}: { 
  onPatientDataChange?: (config: SkeletonConfig) => void 
}) {
  const [config, setConfig] = useState<SkeletonConfig>(defaultConfig);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("limbs");
  
  // Update limb length
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
  
  // Update joint angle
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
  
  // Update body proportions
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
  
  // Reset to default
  const resetToDefault = () => {
    setConfig(defaultConfig);
    onPatientDataChange?.(defaultConfig);
    setSelectedBone(null);
  };
  
  // Save configuration
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[800px]">
      {/* 3D Viewport */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <div className="h-full relative">
              <Canvas
                camera={{ position: [2, 1, 2], fov: 50 }}
                style={{ background: '#1a1a1a' }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={0.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.3} />
                
                <SkeletonModel
                  config={config}
                  selectedBone={selectedBone}
                  onBoneSelect={setSelectedBone}
                />
                
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={1}
                  maxDistance={10}
                />
              </Canvas>
              
              {/* Viewport controls */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetToDefault}
                  className="bg-white/90 hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={saveConfiguration}
                  className="bg-white/90 hover:bg-white"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
              
              {/* Selected bone indicator */}
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
            
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="limbs">Limbs</TabsTrigger>
                <TabsTrigger value="joints">Joints</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
              </TabsList>
              
              {/* Limb Length Controls */}
              <TabsContent value="limbs" className="space-y-4 overflow-y-auto max-h-[650px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Upper Body</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Upper Arm Length: {(config.limbLengths.upperArm * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.upperArm]}
                      onValueChange={([v]) => updateLimbLength("upperArm", v)}
                      min={0.2}
                      max={0.4}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Forearm Length: {(config.limbLengths.forearm * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.forearm]}
                      onValueChange={([v]) => updateLimbLength("forearm", v)}
                      min={0.2}
                      max={0.35}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Hand Length: {(config.limbLengths.hand * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.hand]}
                      onValueChange={([v]) => updateLimbLength("hand", v)}
                      min={0.05}
                      max={0.12}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Lower Body</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Thigh Length: {(config.limbLengths.thigh * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.thigh]}
                      onValueChange={([v]) => updateLimbLength("thigh", v)}
                      min={0.35}
                      max={0.5}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Shin Length: {(config.limbLengths.shin * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.shin]}
                      onValueChange={([v]) => updateLimbLength("shin", v)}
                      min={0.35}
                      max={0.45}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Foot Length: {(config.limbLengths.foot * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.foot]}
                      onValueChange={([v]) => updateLimbLength("foot", v)}
                      min={0.08}
                      max={0.15}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Core</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine Length: {(config.limbLengths.spine * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.spine]}
                      onValueChange={([v]) => updateLimbLength("spine", v)}
                      min={0.4}
                      max={0.6}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Neck Length: {(config.limbLengths.neck * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.limbLengths.neck]}
                      onValueChange={([v]) => updateLimbLength("neck", v)}
                      min={0.08}
                      max={0.15}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Joint Angle Controls */}
              <TabsContent value="joints" className="space-y-4 overflow-y-auto max-h-[650px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Shoulder</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Shoulder Flexion: {config.jointAngles.shoulderFlexion}°</Label>
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
                    <Label className="text-xs">Shoulder Abduction: {config.jointAngles.shoulderAbduction}°</Label>
                    <Slider
                      value={[config.jointAngles.shoulderAbduction]}
                      onValueChange={([v]) => updateJointAngle("shoulderAbduction", v)}
                      min={0}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Elbow & Wrist</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Elbow Flexion: {config.jointAngles.elbowFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.elbowFlexion]}
                      onValueChange={([v]) => updateJointAngle("elbowFlexion", v)}
                      min={0}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Wrist Flexion: {config.jointAngles.wristFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.wristFlexion]}
                      onValueChange={([v]) => updateJointAngle("wristFlexion", v)}
                      min={-70}
                      max={80}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Hip</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Hip Flexion: {config.jointAngles.hipFlexion}°</Label>
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
                    <Label className="text-xs">Hip Abduction: {config.jointAngles.hipAbduction}°</Label>
                    <Slider
                      value={[config.jointAngles.hipAbduction]}
                      onValueChange={([v]) => updateJointAngle("hipAbduction", v)}
                      min={0}
                      max={45}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Knee & Ankle</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Knee Flexion: {config.jointAngles.kneeFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.kneeFlexion]}
                      onValueChange={([v]) => updateJointAngle("kneeFlexion", v)}
                      min={0}
                      max={135}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Ankle Flexion: {config.jointAngles.ankleFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.ankleFlexion]}
                      onValueChange={([v]) => updateJointAngle("ankleFlexion", v)}
                      min={-20}
                      max={45}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Spine</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine Flexion: {config.jointAngles.spineFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.spineFlexion]}
                      onValueChange={([v]) => updateJointAngle("spineFlexion", v)}
                      min={-30}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine Lateral Flexion: {config.jointAngles.spineLateral}°</Label>
                    <Slider
                      value={[config.jointAngles.spineLateral]}
                      onValueChange={([v]) => updateJointAngle("spineLateral", v)}
                      min={-45}
                      max={45}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine Rotation: {config.jointAngles.spineRotation}°</Label>
                    <Slider
                      value={[config.jointAngles.spineRotation]}
                      onValueChange={([v]) => updateJointAngle("spineRotation", v)}
                      min={-45}
                      max={45}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Body Proportion Controls */}
              <TabsContent value="body" className="space-y-4 overflow-y-auto max-h-[650px] mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Shoulder Width: {(config.bodyProportions.shoulderWidth * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.bodyProportions.shoulderWidth]}
                      onValueChange={([v]) => updateBodyProportion("shoulderWidth", v)}
                      min={0.3}
                      max={0.5}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Hip Width: {(config.bodyProportions.hipWidth * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.bodyProportions.hipWidth]}
                      onValueChange={([v]) => updateBodyProportion("hipWidth", v)}
                      min={0.25}
                      max={0.4}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Chest Depth: {(config.bodyProportions.chestDepth * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.bodyProportions.chestDepth]}
                      onValueChange={([v]) => updateBodyProportion("chestDepth", v)}
                      min={0.15}
                      max={0.3}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Head Size: {(config.bodyProportions.headSize * 100).toFixed(0)}cm</Label>
                    <Slider
                      value={[config.bodyProportions.headSize]}
                      onValueChange={([v]) => updateBodyProportion("headSize", v)}
                      min={0.08}
                      max={0.15}
                      step={0.01}
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