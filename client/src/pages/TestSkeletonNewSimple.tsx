import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function TestSkeletonNewSimple() {
  const [modelConfig, setModelConfig] = useState({
    limbScales: {
      upperArm: 1.0,
      forearm: 1.0,
      thigh: 1.0,
      shin: 1.0,
      overall: 1.0,
    },
    spine: {
      cervicalLordosis: -40,
      thoracicKyphosis: 35,
      lumbarLordosis: -50,
      scoliosis: 0,
    },
    leftHip: {
      flexion: 0,
      abduction: 0,
    },
    rightHip: {
      flexion: 0,
      abduction: 0,
    },
    leftKnee: {
      flexion: 0,
    },
    rightKnee: {
      flexion: 0,
    },
    leftAnkle: {
      dorsiflexion: 0,
    },
    rightAnkle: {
      dorsiflexion: 0,
    },
    leftShoulder: {
      flexion: 0,
      abduction: 0,
    },
    rightShoulder: {
      flexion: 0,
      abduction: 0,
    },
    leftElbow: {
      flexion: 0,
    },
    rightElbow: {
      flexion: 0,
    },
  });

  const resetAllValues = () => {
    setModelConfig({
      limbScales: {
        upperArm: 1.0,
        forearm: 1.0,
        thigh: 1.0,
        shin: 1.0,
        overall: 1.0,
      },
      spine: {
        cervicalLordosis: -40,
        thoracicKyphosis: 35,
        lumbarLordosis: -50,
        scoliosis: 0,
      },
      leftHip: { flexion: 0, abduction: 0 },
      rightHip: { flexion: 0, abduction: 0 },
      leftKnee: { flexion: 0 },
      rightKnee: { flexion: 0 },
      leftAnkle: { dorsiflexion: 0 },
      rightAnkle: { dorsiflexion: 0 },
      leftShoulder: { flexion: 0, abduction: 0 },
      rightShoulder: { flexion: 0, abduction: 0 },
      leftElbow: { flexion: 0 },
      rightElbow: { flexion: 0 },
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Left Panel - 3D Model Display */}
      <div className="flex-1 p-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>3D Anatomical Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[700px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">🦴</div>
                <h3 className="text-xl font-semibold text-gray-700">3D Skeleton Model</h3>
                <p className="text-gray-500">The 3D model will load here</p>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600">Model Configuration:</p>
                  <pre className="text-xs mt-2 text-left overflow-auto max-h-40">
                    {JSON.stringify(modelConfig, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Clinical Controls */}
      <div className="w-[450px] bg-white border-l overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Clinical Controls</h2>
            <Button 
              onClick={resetAllValues} 
              variant="outline" 
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="joints" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="joints">Joint Angles</TabsTrigger>
              <TabsTrigger value="proportions">Proportions</TabsTrigger>
              <TabsTrigger value="spine">Spine</TabsTrigger>
            </TabsList>

            <TabsContent value="joints" className="space-y-6">
              {/* Shoulders */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-blue-900">Shoulders</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                    <Label className="text-sm font-medium">Left Shoulder</Label>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Flexion</span>
                          <span>{modelConfig.leftShoulder.flexion}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.leftShoulder.flexion]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            leftShoulder: { ...prev.leftShoulder, flexion: v }
                          }))}
                          min={-180}
                          max={180}
                          step={1}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Abduction</span>
                          <span>{modelConfig.leftShoulder.abduction}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.leftShoulder.abduction]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            leftShoulder: { ...prev.leftShoulder, abduction: v }
                          }))}
                          min={0}
                          max={180}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                    <Label className="text-sm font-medium">Right Shoulder</Label>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Flexion</span>
                          <span>{modelConfig.rightShoulder.flexion}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.rightShoulder.flexion]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            rightShoulder: { ...prev.rightShoulder, flexion: v }
                          }))}
                          min={-180}
                          max={180}
                          step={1}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Abduction</span>
                          <span>{modelConfig.rightShoulder.abduction}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.rightShoulder.abduction]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            rightShoulder: { ...prev.rightShoulder, abduction: v }
                          }))}
                          min={0}
                          max={180}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Hips */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-blue-900">Hips</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                    <Label className="text-sm font-medium">Left Hip</Label>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Flexion</span>
                          <span>{modelConfig.leftHip.flexion}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.leftHip.flexion]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            leftHip: { ...prev.leftHip, flexion: v }
                          }))}
                          min={-30}
                          max={120}
                          step={1}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Abduction</span>
                          <span>{modelConfig.leftHip.abduction}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.leftHip.abduction]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            leftHip: { ...prev.leftHip, abduction: v }
                          }))}
                          min={-30}
                          max={45}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                    <Label className="text-sm font-medium">Right Hip</Label>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Flexion</span>
                          <span>{modelConfig.rightHip.flexion}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.rightHip.flexion]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            rightHip: { ...prev.rightHip, flexion: v }
                          }))}
                          min={-30}
                          max={120}
                          step={1}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Abduction</span>
                          <span>{modelConfig.rightHip.abduction}°</span>
                        </div>
                        <Slider
                          value={[modelConfig.rightHip.abduction]}
                          onValueChange={([v]) => setModelConfig(prev => ({
                            ...prev,
                            rightHip: { ...prev.rightHip, abduction: v }
                          }))}
                          min={-30}
                          max={45}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Knees */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-blue-900">Knees</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                    <Label className="text-sm font-medium">Left Knee</Label>
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Flexion</span>
                        <span>{modelConfig.leftKnee.flexion}°</span>
                      </div>
                      <Slider
                        value={[modelConfig.leftKnee.flexion]}
                        onValueChange={([v]) => setModelConfig(prev => ({
                          ...prev,
                          leftKnee: { ...prev.leftKnee, flexion: v }
                        }))}
                        min={0}
                        max={135}
                        step={1}
                      />
                    </div>
                  </div>
                  <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                    <Label className="text-sm font-medium">Right Knee</Label>
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Flexion</span>
                        <span>{modelConfig.rightKnee.flexion}°</span>
                      </div>
                      <Slider
                        value={[modelConfig.rightKnee.flexion]}
                        onValueChange={([v]) => setModelConfig(prev => ({
                          ...prev,
                          rightKnee: { ...prev.rightKnee, flexion: v }
                        }))}
                        min={0}
                        max={135}
                        step={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="proportions" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Body Proportions</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Overall Scale</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Smaller</span>
                      <span>{modelConfig.limbScales.overall.toFixed(2)}x</span>
                      <span>Larger</span>
                    </div>
                    <Slider
                      value={[modelConfig.limbScales.overall]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        limbScales: { ...prev.limbScales, overall: v }
                      }))}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Limb Proportions</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Upper Arm Length</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Shorter</span>
                      <span>{modelConfig.limbScales.upperArm.toFixed(2)}x</span>
                      <span>Longer</span>
                    </div>
                    <Slider
                      value={[modelConfig.limbScales.upperArm]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        limbScales: { ...prev.limbScales, upperArm: v }
                      }))}
                      min={0.8}
                      max={1.2}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Forearm Length</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Shorter</span>
                      <span>{modelConfig.limbScales.forearm.toFixed(2)}x</span>
                      <span>Longer</span>
                    </div>
                    <Slider
                      value={[modelConfig.limbScales.forearm]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        limbScales: { ...prev.limbScales, forearm: v }
                      }))}
                      min={0.8}
                      max={1.2}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Thigh Length</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Shorter</span>
                      <span>{modelConfig.limbScales.thigh.toFixed(2)}x</span>
                      <span>Longer</span>
                    </div>
                    <Slider
                      value={[modelConfig.limbScales.thigh]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        limbScales: { ...prev.limbScales, thigh: v }
                      }))}
                      min={0.8}
                      max={1.2}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Shin Length</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Shorter</span>
                      <span>{modelConfig.limbScales.shin.toFixed(2)}x</span>
                      <span>Longer</span>
                    </div>
                    <Slider
                      value={[modelConfig.limbScales.shin]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        limbScales: { ...prev.limbScales, shin: v }
                      }))}
                      min={0.8}
                      max={1.2}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="spine" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Spinal Curves</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Cervical Lordosis</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Decreased</span>
                      <span>{modelConfig.spine.cervicalLordosis}°</span>
                      <span>Increased</span>
                    </div>
                    <Slider
                      value={[modelConfig.spine.cervicalLordosis]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        spine: { ...prev.spine, cervicalLordosis: v }
                      }))}
                      min={-60}
                      max={-20}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Thoracic Kyphosis</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Decreased</span>
                      <span>{modelConfig.spine.thoracicKyphosis}°</span>
                      <span>Increased</span>
                    </div>
                    <Slider
                      value={[modelConfig.spine.thoracicKyphosis]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        spine: { ...prev.spine, thoracicKyphosis: v }
                      }))}
                      min={20}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Lumbar Lordosis</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Decreased</span>
                      <span>{modelConfig.spine.lumbarLordosis}°</span>
                      <span>Increased</span>
                    </div>
                    <Slider
                      value={[modelConfig.spine.lumbarLordosis]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        spine: { ...prev.spine, lumbarLordosis: v }
                      }))}
                      min={-70}
                      max={-30}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Scoliosis (Lateral Curve)</Label>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Left</span>
                      <span>{modelConfig.spine.scoliosis}°</span>
                      <span>Right</span>
                    </div>
                    <Slider
                      value={[modelConfig.spine.scoliosis]}
                      onValueChange={([v]) => setModelConfig(prev => ({
                        ...prev,
                        spine: { ...prev.spine, scoliosis: v }
                      }))}
                      min={-30}
                      max={30}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}