import { useState } from "react";
import SkeletonGLBViewer from "@/components/skeleton/SkeletonGLBViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Link, Unlink, Copy, ArrowRight, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function TestSkeletonNew() {
  const [linkedSides, setLinkedSides] = useState({
    hips: false,
    knees: false,
    ankles: false,
    shoulders: false,
    elbows: false,
  });

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
      forwardHead: 0,
      lateralShift: 0,
    },
    pelvis: {
      tilt: 0,
      obliquity: 0,
      rotation: 0,
    },
    leftHip: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    rightHip: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      anteversion: 15,
      neckShaftAngle: 130,
    },
    leftKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      patellaAlta: 0,
    },
    rightKnee: {
      flexion: 0,
      varus: 0,
      tibialTorsion: 0,
      patellaAlta: 0,
    },
    leftAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
    },
    rightAnkle: {
      dorsiflexion: 0,
      plantarflexion: 0,
      inversion: 0,
      eversion: 0,
      archHeight: 0,
    },
    leftShoulder: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    rightShoulder: {
      flexion: 0,
      abduction: 0,
      internalRotation: 0,
      protraction: 0,
      elevation: 0,
      winging: 0,
    },
    leftElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
    },
    rightElbow: {
      flexion: 0,
      carryingAngle: 10,
      pronation: 0,
    },
    // Legacy compatibility
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

  const updateSpine = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      spine: {
        ...prev.spine,
        [key]: value
      },
      // Update legacy spinalPathology for compatibility
      spinalPathology: {
        spineFlexion: key === 'cervicalLordosis' || key === 'thoracicKyphosis' || key === 'lumbarLordosis' 
          ? (prev.spine.cervicalLordosis + prev.spine.thoracicKyphosis + prev.spine.lumbarLordosis) / 3 
          : prev.spinalPathology.spineFlexion,
        spineLateralFlexion: key === 'scoliosis' ? value : prev.spinalPathology.spineLateralFlexion,
        spineRotation: key === 'lateralShift' ? value : prev.spinalPathology.spineRotation,
      }
    }));
  };

  const updatePelvis = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      pelvis: {
        ...prev.pelvis,
        [key]: value
      }
    }));
  };

  const updateLimbScale = (key: string, value: number) => {
    setModelConfig(prev => ({
      ...prev,
      limbScales: {
        ...prev.limbScales,
        [key]: value
      }
    }));
  };

  const updateJoint = (joint: string, side: 'left' | 'right', key: string, value: number) => {
    const jointKey = `${side}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    
    setModelConfig(prev => {
      const newConfig = {
        ...prev,
        [jointKey]: {
          ...(prev as any)[jointKey],
          [key]: value
        }
      } as typeof modelConfig;

      // If sides are linked, update the opposite side too
      if (linkedSides[joint as keyof typeof linkedSides]) {
        const oppositeJointKey = `${side === 'left' ? 'right' : 'left'}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
        (newConfig as any)[oppositeJointKey] = {
          ...(newConfig as any)[oppositeJointKey],
          [key]: value
        };
      }

      // Update legacy pathology for backward compatibility
      if (joint === 'Hip' && key === 'flexion') {
        newConfig.lowerLimbPathology.hipFlexion = value;
      } else if (joint === 'Hip' && key === 'abduction') {
        newConfig.lowerLimbPathology.hipAbduction = value;
      } else if (joint === 'Hip' && key === 'internalRotation') {
        newConfig.lowerLimbPathology.hipRotation = value;
      } else if (joint === 'Knee' && key === 'flexion') {
        newConfig.lowerLimbPathology.kneeFlexion = value;
      } else if (joint === 'Ankle' && key === 'dorsiflexion') {
        newConfig.lowerLimbPathology.ankleDorsiflexion = value;
      } else if (joint === 'Shoulder' && key === 'flexion') {
        newConfig.shoulderPathology.shoulderFlexion = value;
      } else if (joint === 'Shoulder' && key === 'abduction') {
        newConfig.shoulderPathology.shoulderAbduction = value;
      } else if (joint === 'Shoulder' && key === 'internalRotation') {
        newConfig.shoulderPathology.shoulderRotation = value;
      }

      return newConfig;
    });
  };

  const copyToOpposite = (joint: string, fromSide: 'left' | 'right') => {
    const fromKey = `${fromSide}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    const toKey = `${fromSide === 'left' ? 'right' : 'left'}${joint.charAt(0).toUpperCase() + joint.slice(1)}` as keyof typeof modelConfig;
    
    setModelConfig(prev => ({
      ...prev,
      [toKey]: { ...(prev as any)[fromKey] }
    }));
  };

  const toggleLinkedSides = (joint: keyof typeof linkedSides) => {
    setLinkedSides(prev => ({
      ...prev,
      [joint]: !prev[joint]
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
      spine: {
        cervicalLordosis: -40,
        thoracicKyphosis: 35,
        lumbarLordosis: -50,
        scoliosis: 0,
        forwardHead: 0,
        lateralShift: 0,
      },
      pelvis: {
        tilt: 0,
        obliquity: 0,
        rotation: 0,
      },
      leftHip: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      rightHip: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        anteversion: 15,
        neckShaftAngle: 130,
      },
      leftKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        patellaAlta: 0,
      },
      rightKnee: {
        flexion: 0,
        varus: 0,
        tibialTorsion: 0,
        patellaAlta: 0,
      },
      leftAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
      },
      rightAnkle: {
        dorsiflexion: 0,
        plantarflexion: 0,
        inversion: 0,
        eversion: 0,
        archHeight: 0,
      },
      leftShoulder: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      rightShoulder: {
        flexion: 0,
        abduction: 0,
        internalRotation: 0,
        protraction: 0,
        elevation: 0,
        winging: 0,
      },
      leftElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
      },
      rightElbow: {
        flexion: 0,
        carryingAngle: 10,
        pronation: 0,
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
    setLinkedSides({
      hips: false,
      knees: false,
      ankles: false,
      shoulders: false,
      elbows: false,
    });
  };

  const SliderControl = ({ label, value, onChange, min = -90, max = 90, step = 1, unit = "°" }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm text-muted-foreground">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );

  const BilateralControl = ({ title, joint, controls }: any) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToOpposite(joint, 'left')}
            title="Copy left to right"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={linkedSides[joint as keyof typeof linkedSides] ? "default" : "outline"}
            onClick={() => toggleLinkedSides(joint as keyof typeof linkedSides)}
            title="Link sides"
          >
            {linkedSides[joint as keyof typeof linkedSides] ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToOpposite(joint, 'right')}
            title="Copy right to left"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-blue-600">Left Side</Label>
          {controls.map((control: any) => (
            <SliderControl
              key={`left-${control.key}`}
              label={control.label}
              value={(modelConfig as any)[`left${joint}`][control.key]}
              onChange={(v: number) => updateJoint(joint, 'left', control.key, v)}
              min={control.min}
              max={control.max}
              step={control.step}
              unit={control.unit}
            />
          ))}
        </div>
        
        <div className="space-y-3">
          <Label className="text-sm font-medium text-green-600">Right Side</Label>
          {controls.map((control: any) => (
            <SliderControl
              key={`right-${control.key}`}
              label={control.label}
              value={(modelConfig as any)[`right${joint}`][control.key]}
              onChange={(v: number) => updateJoint(joint, 'right', control.key, v)}
              min={control.min}
              max={control.max}
              step={control.step}
              unit={control.unit}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Clinical Pathology Demonstration System</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3D Model Display */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>3D Anatomical Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[700px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden">
              <SkeletonGLBViewer 
                modelConfig={modelConfig}
                className="w-full h-full"
                showControls={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Control Panel */}
        <Card className="w-full max-h-[800px] overflow-y-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Clinical Controls</CardTitle>
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
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="proportions">Proportions</TabsTrigger>
                <TabsTrigger value="spine">Spine & Pelvis</TabsTrigger>
                <TabsTrigger value="lower">Lower Body</TabsTrigger>
                <TabsTrigger value="upper">Upper Body</TabsTrigger>
              </TabsList>

              {/* Proportions Tab */}
              <TabsContent value="proportions" className="space-y-4">
                <h3 className="font-semibold text-lg">Body Proportions</h3>
                <SliderControl
                  label="Overall Scale"
                  value={modelConfig.limbScales.overall}
                  onChange={(v: number) => updateLimbScale('overall', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  unit="x"
                />
                <SliderControl
                  label="Upper Arm Length"
                  value={modelConfig.limbScales.upperArm}
                  onChange={(v: number) => updateLimbScale('upperArm', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  unit="x"
                />
                <SliderControl
                  label="Forearm Length"
                  value={modelConfig.limbScales.forearm}
                  onChange={(v: number) => updateLimbScale('forearm', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  unit="x"
                />
                <SliderControl
                  label="Thigh Length"
                  value={modelConfig.limbScales.thigh}
                  onChange={(v: number) => updateLimbScale('thigh', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  unit="x"
                />
                <SliderControl
                  label="Shin Length"
                  value={modelConfig.limbScales.shin}
                  onChange={(v: number) => updateLimbScale('shin', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  unit="x"
                />
              </TabsContent>

              {/* Spine & Pelvis Tab */}
              <TabsContent value="spine" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Spinal Curves</h3>
                  <SliderControl
                    label="Cervical Lordosis"
                    value={modelConfig.spine.cervicalLordosis}
                    onChange={(v: number) => updateSpine('cervicalLordosis', v)}
                    min={-60}
                    max={-20}
                    unit="° (Normal: -40°)"
                  />
                  <SliderControl
                    label="Thoracic Kyphosis"
                    value={modelConfig.spine.thoracicKyphosis}
                    onChange={(v: number) => updateSpine('thoracicKyphosis', v)}
                    min={10}
                    max={60}
                    unit="° (Normal: 20-45°)"
                  />
                  <SliderControl
                    label="Lumbar Lordosis"
                    value={modelConfig.spine.lumbarLordosis}
                    onChange={(v: number) => updateSpine('lumbarLordosis', v)}
                    min={-70}
                    max={-30}
                    unit="° (Normal: -40 to -60°)"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Spinal Deformities</h3>
                  <SliderControl
                    label="Scoliosis (Cobb Angle)"
                    value={modelConfig.spine.scoliosis}
                    onChange={(v: number) => updateSpine('scoliosis', v)}
                    min={-45}
                    max={45}
                  />
                  <SliderControl
                    label="Forward Head Posture"
                    value={modelConfig.spine.forwardHead}
                    onChange={(v: number) => updateSpine('forwardHead', v)}
                    min={0}
                    max={30}
                    unit="cm"
                  />
                  <SliderControl
                    label="Lateral Shift"
                    value={modelConfig.spine.lateralShift}
                    onChange={(v: number) => updateSpine('lateralShift', v)}
                    min={-20}
                    max={20}
                    unit="cm"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pelvic Orientation</h3>
                  <SliderControl
                    label="Pelvic Tilt (Anterior +/Posterior -)"
                    value={modelConfig.pelvis.tilt}
                    onChange={(v: number) => updatePelvis('tilt', v)}
                    min={-30}
                    max={30}
                  />
                  <SliderControl
                    label="Pelvic Obliquity (Lateral Tilt)"
                    value={modelConfig.pelvis.obliquity}
                    onChange={(v: number) => updatePelvis('obliquity', v)}
                    min={-15}
                    max={15}
                  />
                  <SliderControl
                    label="Pelvic Rotation"
                    value={modelConfig.pelvis.rotation}
                    onChange={(v: number) => updatePelvis('rotation', v)}
                    min={-30}
                    max={30}
                  />
                </div>
              </TabsContent>

              {/* Lower Body Tab */}
              <TabsContent value="lower" className="space-y-6">
                <BilateralControl
                  title="Hip Joint"
                  joint="Hip"
                  controls={[
                    { key: 'flexion', label: 'Flexion/Extension', min: -30, max: 120 },
                    { key: 'abduction', label: 'Abduction/Adduction', min: -30, max: 45 },
                    { key: 'internalRotation', label: 'Internal/External Rotation', min: -45, max: 45 },
                    { key: 'anteversion', label: 'Femoral Anteversion', min: 0, max: 30, unit: '° (Normal: 10-15°)' },
                    { key: 'neckShaftAngle', label: 'Neck-Shaft Angle', min: 110, max: 145, unit: '° (Normal: 125-135°)' },
                  ]}
                />

                <Separator />

                <BilateralControl
                  title="Knee Joint"
                  joint="Knee"
                  controls={[
                    { key: 'flexion', label: 'Flexion', min: 0, max: 140 },
                    { key: 'varus', label: 'Varus/Valgus', min: -20, max: 20, unit: '° (- valgus, + varus)' },
                    { key: 'tibialTorsion', label: 'Tibial Torsion', min: -30, max: 30 },
                    { key: 'patellaAlta', label: 'Patella Alta/Baja', min: -20, max: 20, unit: 'mm' },
                  ]}
                />

                <Separator />

                <BilateralControl
                  title="Ankle & Foot"
                  joint="Ankle"
                  controls={[
                    { key: 'dorsiflexion', label: 'Dorsiflexion/Plantarflexion', min: -50, max: 30 },
                    { key: 'inversion', label: 'Inversion/Eversion', min: -30, max: 20 },
                    { key: 'archHeight', label: 'Arch Height', min: -20, max: 20, unit: 'mm (- flat, + cavus)' },
                  ]}
                />
              </TabsContent>

              {/* Upper Body Tab */}
              <TabsContent value="upper" className="space-y-6">
                <BilateralControl
                  title="Shoulder Complex"
                  joint="Shoulder"
                  controls={[
                    { key: 'flexion', label: 'Flexion/Extension', min: -60, max: 180 },
                    { key: 'abduction', label: 'Abduction/Adduction', min: -30, max: 180 },
                    { key: 'internalRotation', label: 'Internal/External Rotation', min: -90, max: 90 },
                    { key: 'protraction', label: 'Protraction/Retraction', min: -30, max: 30, unit: 'mm' },
                    { key: 'elevation', label: 'Elevation/Depression', min: -20, max: 20, unit: 'mm' },
                    { key: 'winging', label: 'Scapular Winging', min: 0, max: 30 },
                  ]}
                />

                <Separator />

                <BilateralControl
                  title="Elbow Joint"
                  joint="Elbow"
                  controls={[
                    { key: 'flexion', label: 'Flexion', min: 0, max: 145 },
                    { key: 'carryingAngle', label: 'Carrying Angle', min: 0, max: 25, unit: '° (Normal: 5-15°)' },
                    { key: 'pronation', label: 'Pronation/Supination', min: -90, max: 90 },
                  ]}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}