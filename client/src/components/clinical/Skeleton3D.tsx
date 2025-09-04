import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, User } from "lucide-react";

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

// 2D SVG Skeleton Visualization as fallback
function SkeletonVisualization({ config }: { config: SkeletonConfig }) {
  const scale = 2;
  const centerX = 200;
  const centerY = 50;
  
  const { limbLengths, jointAngles, bodyProportions } = config;
  
  // Calculate positions
  const shoulderY = centerY + limbLengths.spine * scale;
  const leftShoulderX = centerX - (bodyProportions.shoulderWidth * scale) / 2;
  const rightShoulderX = centerX + (bodyProportions.shoulderWidth * scale) / 2;
  
  const leftHipX = centerX - (bodyProportions.hipWidth * scale) / 2;
  const rightHipX = centerX + (bodyProportions.hipWidth * scale) / 2;
  
  // Calculate arm positions with angles
  const leftElbowX = leftShoulderX - Math.sin(jointAngles.shoulderAbduction * Math.PI / 180) * limbLengths.upperArm * scale;
  const leftElbowY = shoulderY + Math.cos(jointAngles.shoulderFlexion * Math.PI / 180) * limbLengths.upperArm * scale;
  
  const leftWristX = leftElbowX - Math.sin((jointAngles.shoulderAbduction + jointAngles.elbowFlexion) * Math.PI / 180) * limbLengths.forearm * scale;
  const leftWristY = leftElbowY + limbLengths.forearm * scale;
  
  const rightElbowX = rightShoulderX + Math.sin(jointAngles.shoulderAbduction * Math.PI / 180) * limbLengths.upperArm * scale;
  const rightElbowY = shoulderY + Math.cos(jointAngles.shoulderFlexion * Math.PI / 180) * limbLengths.upperArm * scale;
  
  const rightWristX = rightElbowX + Math.sin((jointAngles.shoulderAbduction + jointAngles.elbowFlexion) * Math.PI / 180) * limbLengths.forearm * scale;
  const rightWristY = rightElbowY + limbLengths.forearm * scale;
  
  // Calculate leg positions
  const hipY = centerY + limbLengths.spine * scale;
  
  const leftKneeX = leftHipX - Math.sin(jointAngles.hipFlexion * Math.PI / 180) * limbLengths.thigh * scale * 0.2;
  const leftKneeY = hipY + limbLengths.thigh * scale;
  
  const leftAnkleX = leftKneeX - Math.sin(jointAngles.kneeFlexion * Math.PI / 180) * limbLengths.shin * scale * 0.2;
  const leftAnkleY = leftKneeY + limbLengths.shin * scale;
  
  const rightKneeX = rightHipX + Math.sin(jointAngles.hipFlexion * Math.PI / 180) * limbLengths.thigh * scale * 0.2;
  const rightKneeY = hipY + limbLengths.thigh * scale;
  
  const rightAnkleX = rightKneeX + Math.sin(jointAngles.kneeFlexion * Math.PI / 180) * limbLengths.shin * scale * 0.2;
  const rightAnkleY = rightKneeY + limbLengths.shin * scale;
  
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {/* Grid background */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="1" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="400" height="400" fill="#111827" />
      <rect width="400" height="400" fill="url(#grid)" />
      
      {/* Head */}
      <circle cx={centerX} cy={centerY - 15} r="15" fill="#e0e0e0" stroke="#60a5fa" strokeWidth="2" />
      
      {/* Spine */}
      <line 
        x1={centerX} 
        y1={centerY} 
        x2={centerX} 
        y2={shoulderY} 
        stroke="#e0e0e0" 
        strokeWidth="6"
      />
      
      {/* Shoulders */}
      <line 
        x1={leftShoulderX} 
        y1={shoulderY} 
        x2={rightShoulderX} 
        y2={shoulderY} 
        stroke="#e0e0e0" 
        strokeWidth="4"
      />
      
      {/* Left Arm */}
      <line 
        x1={leftShoulderX} 
        y1={shoulderY} 
        x2={leftElbowX} 
        y2={leftElbowY} 
        stroke="#e0e0e0" 
        strokeWidth="4"
      />
      <circle cx={leftElbowX} cy={leftElbowY} r="4" fill="#60a5fa" />
      <line 
        x1={leftElbowX} 
        y1={leftElbowY} 
        x2={leftWristX} 
        y2={leftWristY} 
        stroke="#e0e0e0" 
        strokeWidth="3"
      />
      <circle cx={leftWristX} cy={leftWristY} r="3" fill="#60a5fa" />
      
      {/* Right Arm */}
      <line 
        x1={rightShoulderX} 
        y1={shoulderY} 
        x2={rightElbowX} 
        y2={rightElbowY} 
        stroke="#e0e0e0" 
        strokeWidth="4"
      />
      <circle cx={rightElbowX} cy={rightElbowY} r="4" fill="#60a5fa" />
      <line 
        x1={rightElbowX} 
        y1={rightElbowY} 
        x2={rightWristX} 
        y2={rightWristY} 
        stroke="#e0e0e0" 
        strokeWidth="3"
      />
      <circle cx={rightWristX} cy={rightWristY} r="3" fill="#60a5fa" />
      
      {/* Pelvis */}
      <line 
        x1={leftHipX} 
        y1={hipY} 
        x2={rightHipX} 
        y2={hipY} 
        stroke="#e0e0e0" 
        strokeWidth="5"
      />
      
      {/* Left Leg */}
      <line 
        x1={leftHipX} 
        y1={hipY} 
        x2={leftKneeX} 
        y2={leftKneeY} 
        stroke="#e0e0e0" 
        strokeWidth="5"
      />
      <circle cx={leftKneeX} cy={leftKneeY} r="5" fill="#60a5fa" />
      <line 
        x1={leftKneeX} 
        y1={leftKneeY} 
        x2={leftAnkleX} 
        y2={leftAnkleY} 
        stroke="#e0e0e0" 
        strokeWidth="4"
      />
      <circle cx={leftAnkleX} cy={leftAnkleY} r="4" fill="#60a5fa" />
      
      {/* Right Leg */}
      <line 
        x1={rightHipX} 
        y1={hipY} 
        x2={rightKneeX} 
        y2={rightKneeY} 
        stroke="#e0e0e0" 
        strokeWidth="5"
      />
      <circle cx={rightKneeX} cy={rightKneeY} r="5" fill="#60a5fa" />
      <line 
        x1={rightKneeX} 
        y1={rightKneeY} 
        x2={rightAnkleX} 
        y2={rightAnkleY} 
        stroke="#e0e0e0" 
        strokeWidth="4"
      />
      <circle cx={rightAnkleX} cy={rightAnkleY} r="4" fill="#60a5fa" />
      
      {/* Labels */}
      <text x="10" y="20" fill="#9ca3af" fontSize="12">Front View</text>
      <text x="10" y="390" fill="#9ca3af" fontSize="10">Measurements in cm | Angles in degrees</text>
    </svg>
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
      {/* Visualization */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <div className="h-full relative bg-gray-900 rounded-lg flex items-center justify-center">
              <SkeletonVisualization config={config} />
              
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
              
              <div className="absolute top-4 right-4">
                <Badge className="bg-blue-500 text-white flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Patient Model
                </Badge>
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
                  
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Current Configuration Summary</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Total Height: ~{(config.limbLengths.spine + config.limbLengths.thigh + config.limbLengths.shin + 20)}cm</p>
                      <p>• Arm Span: ~{(config.bodyProportions.shoulderWidth + (config.limbLengths.upperArm + config.limbLengths.forearm) * 2)}cm</p>
                      <p>• Body Type: {config.bodyProportions.shoulderWidth > config.bodyProportions.hipWidth ? 'V-Shape' : 'Balanced'}</p>
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