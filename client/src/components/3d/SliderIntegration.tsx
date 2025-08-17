import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Ruler, AlertCircle } from 'lucide-react';

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

interface LimbLengths {
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
}

interface SliderIntegrationProps {
  bones: Map<string, THREE.Bone>;
  jointRestrictions?: JointRestrictions;
  limbLengths?: LimbLengths;
  onJointChange?: (joint: string, type: string, value: number) => void;
  onLimbChange?: (limb: string, value: number) => void;
}

// Default physiological ranges
const DEFAULT_RANGES = {
  shoulder: {
    flexion: { min: 0, max: 180, default: 180 },
    extension: { min: 0, max: 60, default: 60 },
    abduction: { min: 0, max: 180, default: 180 },
    adduction: { min: 0, max: 30, default: 30 },
  },
  elbow: {
    flexion: { min: 0, max: 145, default: 145 },
    extension: { min: -10, max: 0, default: 0 },
  },
  hip: {
    flexion: { min: 0, max: 120, default: 120 },
    extension: { min: 0, max: 30, default: 30 },
    abduction: { min: 0, max: 45, default: 45 },
    adduction: { min: 0, max: 30, default: 30 },
  },
  knee: {
    flexion: { min: 0, max: 140, default: 140 },
    extension: { min: -5, max: 0, default: 0 },
  },
};

// Default limb proportions (in cm)
const DEFAULT_LIMB_LENGTHS = {
  upperArm: { min: 20, max: 40, default: 30 },
  forearm: { min: 15, max: 35, default: 25 },
  thigh: { min: 30, max: 50, default: 40 },
  shin: { min: 25, max: 45, default: 35 },
};

export default function SliderIntegration({
  bones,
  jointRestrictions = {
    shoulder: { flexion: 180, extension: 60, abduction: 180, adduction: 30 },
    elbow: { flexion: 145, extension: 0 },
    hip: { flexion: 120, extension: 30, abduction: 45, adduction: 30 },
    knee: { flexion: 140, extension: 0 },
  },
  limbLengths = {
    upperArm: 30,
    forearm: 25,
    thigh: 40,
    shin: 35,
  },
  onJointChange,
  onLimbChange,
}: SliderIntegrationProps) {
  const previousValues = useRef<{
    joints: JointRestrictions;
    limbs: LimbLengths;
  }>({
    joints: jointRestrictions,
    limbs: limbLengths,
  });

  // Apply joint restrictions to bones
  const applyJointRestrictions = (joint: string, type: string, value: number) => {
    const bone = bones.get(joint);
    if (!bone) return;

    // Convert degrees to radians
    const radians = THREE.MathUtils.degToRad(value);

    // Apply rotation based on movement type
    switch (type) {
      case 'flexion':
        // Flexion typically rotates around X axis
        bone.rotation.x = Math.min(radians, bone.rotation.x);
        break;
      case 'extension':
        // Extension is opposite of flexion
        bone.rotation.x = Math.max(-radians, bone.rotation.x);
        break;
      case 'abduction':
        // Abduction typically rotates around Z axis
        bone.rotation.z = Math.min(radians, bone.rotation.z);
        break;
      case 'adduction':
        // Adduction is opposite of abduction
        bone.rotation.z = Math.max(-radians, bone.rotation.z);
        break;
    }

    // Store the restriction in bone's userData for animation system
    if (!bone.userData.restrictions) {
      bone.userData.restrictions = {};
    }
    bone.userData.restrictions[type] = value;
  };

  // Apply limb length scaling
  const applyLimbScaling = (limbName: string, length: number) => {
    const boneMappings: Record<string, string[]> = {
      upperArm: ['leftUpperArm', 'rightUpperArm'],
      forearm: ['leftForearm', 'rightForearm'],
      thigh: ['leftThigh', 'rightThigh'],
      shin: ['leftShin', 'rightShin'],
    };

    const boneNames = boneMappings[limbName];
    if (!boneNames) return;

    boneNames.forEach(boneName => {
      const bone = bones.get(boneName);
      if (!bone) return;

      // Calculate scale factor based on default length
      const defaultLength = DEFAULT_LIMB_LENGTHS[limbName as keyof typeof DEFAULT_LIMB_LENGTHS].default;
      const scaleFactor = length / defaultLength;

      // Apply scaling along the bone's length (usually Y axis)
      bone.scale.y = scaleFactor;

      // Adjust child bone positions to maintain connectivity
      bone.children.forEach(child => {
        if (child instanceof THREE.Bone) {
          child.position.y = child.userData.originalPosition?.y * scaleFactor || child.position.y;
        }
      });

      // Store the scale in userData
      bone.userData.limbLength = length;
    });
  };

  // Apply all current settings
  useEffect(() => {
    // Apply joint restrictions
    Object.entries(jointRestrictions).forEach(([joint, restrictions]) => {
      Object.entries(restrictions).forEach(([type, value]) => {
        applyJointRestrictions(joint, type, value);
      });
    });

    // Apply limb lengths
    Object.entries(limbLengths).forEach(([limb, length]) => {
      applyLimbScaling(limb, length);
    });
  }, [bones, jointRestrictions, limbLengths]);

  const handleJointChange = (joint: string, type: string, value: number) => {
    applyJointRestrictions(joint, type, value);
    if (onJointChange) {
      onJointChange(joint, type, value);
    }
  };

  const handleLimbChange = (limb: string, value: number) => {
    applyLimbScaling(limb, value);
    if (onLimbChange) {
      onLimbChange(limb, value);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Patient-Specific Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="restrictions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="restrictions">Joint Restrictions</TabsTrigger>
            <TabsTrigger value="proportions">Body Proportions</TabsTrigger>
          </TabsList>

          {/* Joint Restrictions Tab */}
          <TabsContent value="restrictions" className="space-y-4">
            <div className="space-y-4">
              {/* Shoulder Controls */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  Shoulder
                  <Badge variant="outline">L/R</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {jointRestrictions.shoulder.flexion}°</Label>
                    <Slider
                      value={[jointRestrictions.shoulder.flexion]}
                      onValueChange={([v]) => handleJointChange('shoulder', 'flexion', v)}
                      min={0}
                      max={180}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Extension: {jointRestrictions.shoulder.extension}°</Label>
                    <Slider
                      value={[jointRestrictions.shoulder.extension]}
                      onValueChange={([v]) => handleJointChange('shoulder', 'extension', v)}
                      min={0}
                      max={60}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Abduction: {jointRestrictions.shoulder.abduction}°</Label>
                    <Slider
                      value={[jointRestrictions.shoulder.abduction]}
                      onValueChange={([v]) => handleJointChange('shoulder', 'abduction', v)}
                      min={0}
                      max={180}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Adduction: {jointRestrictions.shoulder.adduction}°</Label>
                    <Slider
                      value={[jointRestrictions.shoulder.adduction]}
                      onValueChange={([v]) => handleJointChange('shoulder', 'adduction', v)}
                      min={0}
                      max={30}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              {/* Elbow Controls */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  Elbow
                  <Badge variant="outline">L/R</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {jointRestrictions.elbow.flexion}°</Label>
                    <Slider
                      value={[jointRestrictions.elbow.flexion]}
                      onValueChange={([v]) => handleJointChange('elbow', 'flexion', v)}
                      min={0}
                      max={145}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Extension: {jointRestrictions.elbow.extension}°</Label>
                    <Slider
                      value={[jointRestrictions.elbow.extension]}
                      onValueChange={([v]) => handleJointChange('elbow', 'extension', v)}
                      min={-10}
                      max={0}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              {/* Hip Controls */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  Hip
                  <Badge variant="outline">L/R</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {jointRestrictions.hip.flexion}°</Label>
                    <Slider
                      value={[jointRestrictions.hip.flexion]}
                      onValueChange={([v]) => handleJointChange('hip', 'flexion', v)}
                      min={0}
                      max={120}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Extension: {jointRestrictions.hip.extension}°</Label>
                    <Slider
                      value={[jointRestrictions.hip.extension]}
                      onValueChange={([v]) => handleJointChange('hip', 'extension', v)}
                      min={0}
                      max={30}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              {/* Knee Controls */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  Knee
                  <Badge variant="outline">L/R</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {jointRestrictions.knee.flexion}°</Label>
                    <Slider
                      value={[jointRestrictions.knee.flexion]}
                      onValueChange={([v]) => handleJointChange('knee', 'flexion', v)}
                      min={0}
                      max={140}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Extension: {jointRestrictions.knee.extension}°</Label>
                    <Slider
                      value={[jointRestrictions.knee.extension]}
                      onValueChange={([v]) => handleJointChange('knee', 'extension', v)}
                      min={-5}
                      max={0}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Restriction Summary */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium">Active Restrictions</p>
                  <p className="text-xs text-muted-foreground">
                    These values represent the maximum range of motion for each joint.
                    Reduced values indicate pathological limitations.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Body Proportions Tab */}
          <TabsContent value="proportions" className="space-y-4">
            <div className="space-y-4">
              {/* Upper Body */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Upper Body Proportions
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Upper Arm Length: {limbLengths.upperArm}cm</Label>
                    <Slider
                      value={[limbLengths.upperArm]}
                      onValueChange={([v]) => handleLimbChange('upperArm', v)}
                      min={20}
                      max={40}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Forearm Length: {limbLengths.forearm}cm</Label>
                    <Slider
                      value={[limbLengths.forearm]}
                      onValueChange={([v]) => handleLimbChange('forearm', v)}
                      min={15}
                      max={35}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* Lower Body */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Lower Body Proportions
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Thigh Length: {limbLengths.thigh}cm</Label>
                    <Slider
                      value={[limbLengths.thigh]}
                      onValueChange={([v]) => handleLimbChange('thigh', v)}
                      min={30}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Shin Length: {limbLengths.shin}cm</Label>
                    <Slider
                      value={[limbLengths.shin]}
                      onValueChange={([v]) => handleLimbChange('shin', v)}
                      min={25}
                      max={45}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Proportion Info */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Ruler className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium">Anthropometric Data</p>
                  <p className="text-xs text-muted-foreground">
                    Adjust limb segments to match patient's actual measurements.
                    Values are automatically applied to both sides.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}