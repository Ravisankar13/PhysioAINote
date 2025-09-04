import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
    thigh: number;
    shin: number;
    spine: number;
  };
  jointAngles: {
    shoulderFlexion: number;
    shoulderAbduction: number;
    elbowFlexion: number;
    hipFlexion: number;
    kneeFlexion: number;
  };
  bodyProportions: {
    shoulderWidth: number;
    hipWidth: number;
  };
}

const defaultConfig: SkeletonConfig = {
  limbLengths: {
    upperArm: 30,
    forearm: 28,
    thigh: 42,
    shin: 40,
    spine: 50,
  },
  jointAngles: {
    shoulderFlexion: 0,
    shoulderAbduction: 0,
    elbowFlexion: 0,
    hipFlexion: 0,
    kneeFlexion: 0,
  },
  bodyProportions: {
    shoulderWidth: 40,
    hipWidth: 30,
  },
};

// Simple skeleton model using basic Three.js meshes
function SkeletonModel({ config }: { config: SkeletonConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Rotate model slowly
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  const scale = 0.01;
  const toRad = (deg: number) => deg * Math.PI / 180;
  
  const { limbLengths, jointAngles, bodyProportions } = config;
  
  return (
    <group ref={groupRef}>
      {/* Spine */}
      <mesh position={[0, limbLengths.spine * scale / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, limbLengths.spine * scale, 8]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      
      {/* Pelvis */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, bodyProportions.hipWidth * scale, 8]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      
      {/* Shoulders */}
      <mesh position={[0, limbLengths.spine * scale, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, bodyProportions.shoulderWidth * scale, 8]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, limbLengths.spine * scale + 0.15, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Left Arm */}
      <group position={[-bodyProportions.shoulderWidth * scale / 2, limbLengths.spine * scale, 0]}>
        {/* Upper arm */}
        <mesh 
          position={[
            -limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)) / 2,
            -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)) / 2,
            0
          ]}
          rotation={[0, 0, toRad(-jointAngles.shoulderAbduction)]}
        >
          <cylinderGeometry args={[0.025, 0.025, limbLengths.upperArm * scale, 8]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        
        {/* Forearm */}
        <group position={[
          -limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)),
          -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)),
          0
        ]}>
          <mesh 
            position={[
              -limbLengths.forearm * scale * Math.sin(toRad(jointAngles.elbowFlexion)) / 2,
              -limbLengths.forearm * scale / 2,
              0
            ]}
          >
            <cylinderGeometry args={[0.02, 0.02, limbLengths.forearm * scale, 8]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </group>
      </group>
      
      {/* Right Arm */}
      <group position={[bodyProportions.shoulderWidth * scale / 2, limbLengths.spine * scale, 0]}>
        {/* Upper arm */}
        <mesh 
          position={[
            limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)) / 2,
            -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)) / 2,
            0
          ]}
          rotation={[0, 0, toRad(jointAngles.shoulderAbduction)]}
        >
          <cylinderGeometry args={[0.025, 0.025, limbLengths.upperArm * scale, 8]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        
        {/* Forearm */}
        <group position={[
          limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)),
          -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)),
          0
        ]}>
          <mesh 
            position={[
              limbLengths.forearm * scale * Math.sin(toRad(jointAngles.elbowFlexion)) / 2,
              -limbLengths.forearm * scale / 2,
              0
            ]}
          >
            <cylinderGeometry args={[0.02, 0.02, limbLengths.forearm * scale, 8]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </group>
      </group>
      
      {/* Left Leg */}
      <group position={[-bodyProportions.hipWidth * scale / 2, 0, 0]}>
        {/* Thigh */}
        <mesh 
          position={[
            0,
            -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)) / 2,
            limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion)) / 2
          ]}
          rotation={[toRad(jointAngles.hipFlexion), 0, 0]}
        >
          <cylinderGeometry args={[0.035, 0.035, limbLengths.thigh * scale, 8]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        
        {/* Shin */}
        <group position={[
          0,
          -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)),
          limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion))
        ]}>
          <mesh 
            position={[
              0,
              -limbLengths.shin * scale * Math.cos(toRad(jointAngles.kneeFlexion)) / 2,
              limbLengths.shin * scale * Math.sin(toRad(jointAngles.kneeFlexion)) / 2
            ]}
            rotation={[toRad(jointAngles.kneeFlexion), 0, 0]}
          >
            <cylinderGeometry args={[0.03, 0.03, limbLengths.shin * scale, 8]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </group>
      </group>
      
      {/* Right Leg */}
      <group position={[bodyProportions.hipWidth * scale / 2, 0, 0]}>
        {/* Thigh */}
        <mesh 
          position={[
            0,
            -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)) / 2,
            limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion)) / 2
          ]}
          rotation={[toRad(jointAngles.hipFlexion), 0, 0]}
        >
          <cylinderGeometry args={[0.035, 0.035, limbLengths.thigh * scale, 8]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        
        {/* Shin */}
        <group position={[
          0,
          -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)),
          limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion))
        ]}>
          <mesh 
            position={[
              0,
              -limbLengths.shin * scale * Math.cos(toRad(jointAngles.kneeFlexion)) / 2,
              limbLengths.shin * scale * Math.sin(toRad(jointAngles.kneeFlexion)) / 2
            ]}
            rotation={[toRad(jointAngles.kneeFlexion), 0, 0]}
          >
            <cylinderGeometry args={[0.03, 0.03, limbLengths.shin * scale, 8]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        </group>
      </group>
      
      {/* Floor plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#303030" opacity={0.5} transparent />
      </mesh>
    </group>
  );
}

export default function Skeleton3D({ 
  onPatientDataChange 
}: { 
  onPatientDataChange?: (config: SkeletonConfig) => void 
}) {
  const [config, setConfig] = useState<SkeletonConfig>(defaultConfig);
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
                gl={{ antialias: false, alpha: false }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={0.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.3} />
                
                <SkeletonModel config={config} />
                
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}