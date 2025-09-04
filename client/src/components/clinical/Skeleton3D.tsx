import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Simple 3D bone component using basic geometries only
function Bone3D({ 
  position, 
  rotation, 
  length, 
  thickness = 0.025,
  color = "#e0e0e0"
}: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[thickness, length, thickness]} />
        <meshStandardMaterial color={hovered ? "#60a5fa" : color} />
      </mesh>
      {/* Joint sphere */}
      <mesh position={[0, length/2, 0]}>
        <sphereGeometry args={[thickness * 0.8, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// 3D skeleton model - simplified to prevent crashes
function SkeletonModel({ config }: { config: SkeletonConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Slow rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  const scale = 0.01;
  const { limbLengths, jointAngles, bodyProportions } = config;
  
  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  return (
    <group ref={groupRef}>
      {/* Spine/Torso */}
      <Bone3D
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        length={limbLengths.spine * scale}
        thickness={0.04}
      />
      
      {/* Head */}
      <mesh position={[0, (limbLengths.spine + 10) * scale, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Shoulders */}
      <group position={[0, limbLengths.spine * scale, 0]}>
        {/* Left shoulder to arm */}
        <Bone3D
          position={[-bodyProportions.shoulderWidth * scale / 2, 0, 0]}
          rotation={[0, 0, toRad(90)]}
          length={bodyProportions.shoulderWidth * scale / 2}
          thickness={0.03}
        />
        {/* Right shoulder to arm */}
        <Bone3D
          position={[bodyProportions.shoulderWidth * scale / 2, 0, 0]}
          rotation={[0, 0, toRad(-90)]}
          length={bodyProportions.shoulderWidth * scale / 2}
          thickness={0.03}
        />
      </group>
      
      {/* Left Arm */}
      <group position={[-bodyProportions.shoulderWidth * scale / 2, limbLengths.spine * scale, 0]}>
        {/* Upper arm */}
        <Bone3D
          position={[0, 0, 0]}
          rotation={[toRad(jointAngles.shoulderFlexion), 0, toRad(jointAngles.shoulderAbduction)]}
          length={limbLengths.upperArm * scale}
          thickness={0.025}
        />
        {/* Forearm at elbow position */}
        <group 
          position={[
            -limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)),
            -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)),
            0
          ]}
        >
          <Bone3D
            position={[0, 0, 0]}
            rotation={[toRad(jointAngles.elbowFlexion), 0, 0]}
            length={limbLengths.forearm * scale}
            thickness={0.02}
          />
        </group>
      </group>
      
      {/* Right Arm */}
      <group position={[bodyProportions.shoulderWidth * scale / 2, limbLengths.spine * scale, 0]}>
        {/* Upper arm */}
        <Bone3D
          position={[0, 0, 0]}
          rotation={[toRad(jointAngles.shoulderFlexion), 0, toRad(-jointAngles.shoulderAbduction)]}
          length={limbLengths.upperArm * scale}
          thickness={0.025}
        />
        {/* Forearm at elbow position */}
        <group 
          position={[
            limbLengths.upperArm * scale * Math.sin(toRad(jointAngles.shoulderAbduction)),
            -limbLengths.upperArm * scale * Math.cos(toRad(jointAngles.shoulderFlexion)),
            0
          ]}
        >
          <Bone3D
            position={[0, 0, 0]}
            rotation={[toRad(jointAngles.elbowFlexion), 0, 0]}
            length={limbLengths.forearm * scale}
            thickness={0.02}
          />
        </group>
      </group>
      
      {/* Pelvis */}
      <Bone3D
        position={[0, 0, 0]}
        rotation={[0, 0, toRad(90)]}
        length={bodyProportions.hipWidth * scale}
        thickness={0.035}
      />
      
      {/* Left Leg */}
      <group position={[-bodyProportions.hipWidth * scale / 2, 0, 0]}>
        {/* Thigh */}
        <Bone3D
          position={[0, 0, 0]}
          rotation={[toRad(jointAngles.hipFlexion), 0, 0]}
          length={limbLengths.thigh * scale}
          thickness={0.035}
        />
        {/* Shin at knee position */}
        <group 
          position={[
            0,
            -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)),
            limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion))
          ]}
        >
          <Bone3D
            position={[0, 0, 0]}
            rotation={[toRad(jointAngles.kneeFlexion), 0, 0]}
            length={limbLengths.shin * scale}
            thickness={0.03}
          />
        </group>
      </group>
      
      {/* Right Leg */}
      <group position={[bodyProportions.hipWidth * scale / 2, 0, 0]}>
        {/* Thigh */}
        <Bone3D
          position={[0, 0, 0]}
          rotation={[toRad(jointAngles.hipFlexion), 0, 0]}
          length={limbLengths.thigh * scale}
          thickness={0.035}
        />
        {/* Shin at knee position */}
        <group 
          position={[
            0,
            -limbLengths.thigh * scale * Math.cos(toRad(jointAngles.hipFlexion)),
            limbLengths.thigh * scale * Math.sin(toRad(jointAngles.hipFlexion))
          ]}
        >
          <Bone3D
            position={[0, 0, 0]}
            rotation={[toRad(jointAngles.kneeFlexion), 0, 0]}
            length={limbLengths.shin * scale}
            thickness={0.03}
          />
        </group>
      </group>
      
      {/* Simple ground plane - no gridHelper to avoid crashes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.5} />
      </mesh>
      
      {/* Manual grid lines using simple line segments */}
      {[-1, -0.5, 0, 0.5, 1].map((pos) => (
        <group key={`grid-${pos}`}>
          {/* Horizontal lines */}
          <mesh position={[0, -0.99, pos]}>
            <boxGeometry args={[2, 0.002, 0.002]} />
            <meshBasicMaterial color="#303030" />
          </mesh>
          {/* Vertical lines */}
          <mesh position={[pos, -0.99, 0]}>
            <boxGeometry args={[0.002, 0.002, 2]} />
            <meshBasicMaterial color="#303030" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
      <Alert className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          3D rendering encountered an issue. Please refresh the page or try a different browser.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Canvas wrapper with error boundary and crash prevention
function Canvas3D({ config }: { config: SkeletonConfig }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return <ErrorFallback />;
  }
  
  return (
    <div className="h-full w-full bg-gray-900 rounded-lg">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading 3D model...</div>
        </div>
      }>
        <Canvas
          camera={{ position: [1.5, 0.5, 1.5], fov: 50 }}
          onCreated={({ gl }) => {
            // Set background color
            gl.setClearColor('#111827');
            // Limit pixel ratio to prevent performance issues
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }}
          onError={(error) => {
            console.error('Canvas error:', error);
            setHasError(true);
          }}
          // Add performance settings
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
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
      </Suspense>
    </div>
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
            <div className="h-full relative">
              <Canvas3D config={config} />
              
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
                      min={-90}
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
                  
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Patient Measurements</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Height estimate: ~{(config.limbLengths.spine + config.limbLengths.thigh + config.limbLengths.shin + 20)}cm</p>
                      <p>• Arm reach: ~{(config.limbLengths.upperArm + config.limbLengths.forearm) * 2}cm</p>
                      <p>• Shoulder-to-hip ratio: {(config.bodyProportions.shoulderWidth / config.bodyProportions.hipWidth).toFixed(2)}</p>
                    </div>
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