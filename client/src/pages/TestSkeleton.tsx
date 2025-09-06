import { useState } from "react";
import RiggedAnatomicalSkeleton from "@/components/3d/RiggedAnatomicalSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function TestSkeleton() {
  const [modelConfig, setModelConfig] = useState({
    limbScales: {
      upperArm: 1.0,
      forearm: 1.0,
      thigh: 1.0,
      shin: 1.0,
      overall: 1.0,
    },
    spinalPathology: {
      spineFlexion: 0,
      spineLateralFlexion: 0,
      spineRotation: 0,
    },
    shoulderPathology: {
      shoulderFlexion: 0,
      shoulderAbduction: 0,
      shoulderRotation: 0,
    },
    lowerLimbPathology: {
      hipFlexion: 0,
      hipAbduction: 0,
      hipRotation: 0,
      kneeFlexion: 0,
      ankleDorsiflexion: 0,
    },
  });

  const updateLimbScale = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      limbScales: {
        ...prev.limbScales,
        [key]: value
      }
    }));
  };

  const updateSpinePathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      spinalPathology: {
        ...prev.spinalPathology,
        [key]: value
      }
    }));
  };

  const updateShoulderPathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      shoulderPathology: {
        ...prev.shoulderPathology,
        [key]: value
      }
    }));
  };

  const updateLowerLimbPathology = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      lowerLimbPathology: {
        ...prev.lowerLimbPathology,
        [key]: value
      }
    }));
  };

  const resetAll = () => {
    setModelConfig({
      limbScales: {
        upperArm: 1.0,
        forearm: 1.0,
        thigh: 1.0,
        shin: 1.0,
        overall: 1.0,
      },
      spinalPathology: {
        spineFlexion: 0,
        spineLateralFlexion: 0,
        spineRotation: 0,
      },
      shoulderPathology: {
        shoulderFlexion: 0,
        shoulderAbduction: 0,
        shoulderRotation: 0,
      },
      lowerLimbPathology: {
        hipFlexion: 0,
        hipAbduction: 0,
        hipRotation: 0,
        kneeFlexion: 0,
        ankleDorsiflexion: 0,
      },
    });
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">3D Anatomical Skeleton Test - Interactive Controls</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Model Display */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Rigged Skeleton Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[700px] bg-gray-100 rounded-lg overflow-hidden">
              <RiggedAnatomicalSkeleton 
                patientData={{
                  anthropometrics: {
                    height: 170,
                    weight: 70,
                  },
                  jointRestrictions: {},
                  painAreas: [],
                  movementPatterns: null
                }}
                modelConfig={modelConfig}
                className="w-full h-full"
                showControls={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Control Panel */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Skeleton Controls</CardTitle>
              <Button 
                onClick={resetAll} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="proportions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="proportions">Proportions</TabsTrigger>
                <TabsTrigger value="joints">Joint Rotations</TabsTrigger>
              </TabsList>

              <TabsContent value="proportions" className="space-y-4">
                <div>
                  <Label>Overall Scale: {modelConfig.limbScales.overall.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.overall]}
                    onValueChange={([value]) => updateLimbScale('overall', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Upper Arm Length: {modelConfig.limbScales.upperArm.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.upperArm]}
                    onValueChange={([value]) => updateLimbScale('upperArm', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Forearm Length: {modelConfig.limbScales.forearm.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.forearm]}
                    onValueChange={([value]) => updateLimbScale('forearm', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Thigh Length: {modelConfig.limbScales.thigh.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.thigh]}
                    onValueChange={([value]) => updateLimbScale('thigh', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Shin Length: {modelConfig.limbScales.shin.toFixed(2)}</Label>
                  <Slider
                    value={[modelConfig.limbScales.shin]}
                    onValueChange={([value]) => updateLimbScale('shin', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="joints" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Spine</h3>
                  <div>
                    <Label>Flexion/Extension: {modelConfig.spinalPathology.spineFlexion}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineFlexion]}
                      onValueChange={([value]) => updateSpinePathology('spineFlexion', value)}
                      min={-45}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Lateral Flexion: {modelConfig.spinalPathology.spineLateralFlexion}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineLateralFlexion]}
                      onValueChange={([value]) => updateSpinePathology('spineLateralFlexion', value)}
                      min={-30}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Rotation: {modelConfig.spinalPathology.spineRotation}°</Label>
                    <Slider
                      value={[modelConfig.spinalPathology.spineRotation]}
                      onValueChange={([value]) => updateSpinePathology('spineRotation', value)}
                      min={-45}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Shoulder</h3>
                  <div>
                    <Label>Flexion: {modelConfig.shoulderPathology.shoulderFlexion}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderFlexion]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderFlexion', value)}
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Abduction: {modelConfig.shoulderPathology.shoulderAbduction}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderAbduction]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderAbduction', value)}
                      min={0}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Rotation: {modelConfig.shoulderPathology.shoulderRotation}°</Label>
                    <Slider
                      value={[modelConfig.shoulderPathology.shoulderRotation]}
                      onValueChange={([value]) => updateShoulderPathology('shoulderRotation', value)}
                      min={-90}
                      max={90}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Hip & Lower Limb</h3>
                  <div>
                    <Label>Hip Flexion: {modelConfig.lowerLimbPathology.hipFlexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.hipFlexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('hipFlexion', value)}
                      min={-30}
                      max={120}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Hip Abduction: {modelConfig.lowerLimbPathology.hipAbduction}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.hipAbduction]}
                      onValueChange={([value]) => updateLowerLimbPathology('hipAbduction', value)}
                      min={0}
                      max={45}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Knee Flexion: {modelConfig.lowerLimbPathology.kneeFlexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.kneeFlexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('kneeFlexion', value)}
                      min={0}
                      max={135}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Ankle Dorsiflexion: {modelConfig.lowerLimbPathology.ankleDorsiflexion}°</Label>
                    <Slider
                      value={[modelConfig.lowerLimbPathology.ankleDorsiflexion]}
                      onValueChange={([value]) => updateLowerLimbPathology('ankleDorsiflexion', value)}
                      min={-50}
                      max={20}
                      step={1}
                      className="mt-2"
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