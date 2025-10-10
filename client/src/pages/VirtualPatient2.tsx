import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';

interface SpineConfig {
  cervicalLordosis: number;
  thoracicKyphosis: number;
  lumbarLordosis: number;
}

interface SkeletonModelProps {
  spineConfig: SpineConfig;
}

function SkeletonModel({ spineConfig }: SkeletonModelProps) {
  const { scene } = useGLTF('/models/skeleton_rig.glb');
  const bonesRef = useRef<{
    cervical: THREE.Bone | null;
    thoracic: THREE.Bone | null;
    lumbar: THREE.Bone | null;
  }>({
    cervical: null,
    thoracic: null,
    lumbar: null
  });

  useEffect(() => {
    // Find spine bones in the model hierarchy
    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const boneName = child.name.toLowerCase();
        
        // Map bone names to spine regions
        // These are common naming conventions, actual names may vary based on the model
        if (boneName.includes('spine') || boneName.includes('vertebra')) {
          if (boneName.includes('cervical') || boneName.includes('neck') || boneName.includes('c1') || boneName.includes('c7')) {
            bonesRef.current.cervical = child;
          } else if (boneName.includes('thoracic') || boneName.includes('chest') || boneName.includes('t1') || boneName.includes('t12')) {
            bonesRef.current.thoracic = child;
          } else if (boneName.includes('lumbar') || boneName.includes('lower') || boneName.includes('l1') || boneName.includes('l5')) {
            bonesRef.current.lumbar = child;
          }
        }
        
        // Alternative naming convention
        if (boneName === 'spine03' || boneName === 'spine_03') {
          bonesRef.current.cervical = child;
        } else if (boneName === 'spine02' || boneName === 'spine_02') {
          bonesRef.current.thoracic = child;
        } else if (boneName === 'spine01' || boneName === 'spine_01' || boneName === 'pelvis') {
          bonesRef.current.lumbar = child;
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    // Apply rotations to spine bones based on slider values
    if (bonesRef.current.cervical) {
      // Cervical lordosis - negative values indicate lordotic curve (backward)
      bonesRef.current.cervical.rotation.x = THREE.MathUtils.degToRad(spineConfig.cervicalLordosis);
    }
    
    if (bonesRef.current.thoracic) {
      // Thoracic kyphosis - positive values indicate kyphotic curve (forward)
      bonesRef.current.thoracic.rotation.x = THREE.MathUtils.degToRad(spineConfig.thoracicKyphosis);
    }
    
    if (bonesRef.current.lumbar) {
      // Lumbar lordosis - negative values indicate lordotic curve (backward)
      bonesRef.current.lumbar.rotation.x = THREE.MathUtils.degToRad(spineConfig.lumbarLordosis);
    }
  });

  return <primitive object={scene} position={[0, -2, 0]} scale={1} />;
}

export default function VirtualPatient2() {
  // Default anatomical values
  const defaultSpineConfig: SpineConfig = {
    cervicalLordosis: -40,  // Normal cervical lordosis
    thoracicKyphosis: 35,   // Normal thoracic kyphosis
    lumbarLordosis: -50     // Normal lumbar lordosis
  };

  const [spineConfig, setSpineConfig] = useState<SpineConfig>(defaultSpineConfig);

  const handleSliderChange = (property: keyof SpineConfig, value: number[]) => {
    setSpineConfig(prev => ({
      ...prev,
      [property]: value[0]
    }));
  };

  const resetToNormal = () => {
    setSpineConfig(defaultSpineConfig);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Virtual Patient 2</h1>
        <p className="text-muted-foreground">
          3D Skeleton with Adjustable Spine Curvatures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Model Display - Takes up 2 columns */}
        <Card className="h-[600px] lg:col-span-2">
          <CardHeader>
            <CardTitle>Skeleton Model</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)]">
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <Canvas 
                camera={{ position: [3, 0, 8], fov: 45 }}
                style={{ background: 'transparent' }}
              >
                <Suspense fallback={null}>
                  {/* Lighting setup */}
                  <ambientLight intensity={0.6} />
                  <directionalLight 
                    position={[10, 10, 5]} 
                    intensity={0.8} 
                    castShadow 
                  />
                  <directionalLight 
                    position={[-10, 10, -5]} 
                    intensity={0.4} 
                  />
                  
                  {/* 3D Skeleton Model with spine configuration */}
                  <SkeletonModel spineConfig={spineConfig} />
                  
                  {/* Camera Controls - allows rotation and zoom */}
                  <OrbitControls 
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={false}
                  />
                </Suspense>
              </Canvas>
            </div>
          </CardContent>
        </Card>

        {/* Spine Controls Panel - Takes up 1 column */}
        <Card className="h-[600px]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Spine Adjustments</CardTitle>
              <Button 
                onClick={resetToNormal} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cervical Lordosis Slider */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">
                  Cervical Lordosis
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Inward curve of the neck
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reduced</span>
                  <span className="font-mono font-medium">
                    {spineConfig.cervicalLordosis}°
                  </span>
                  <span>Increased</span>
                </div>
                <Slider
                  value={[spineConfig.cervicalLordosis]}
                  onValueChange={(value) => handleSliderChange('cervicalLordosis', value)}
                  min={-60}
                  max={-20}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-center text-muted-foreground">
                  Normal: -40°
                </div>
              </div>
            </div>

            {/* Thoracic Kyphosis Slider */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">
                  Thoracic Kyphosis
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Outward curve of the upper back
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reduced</span>
                  <span className="font-mono font-medium">
                    {spineConfig.thoracicKyphosis}°
                  </span>
                  <span>Increased</span>
                </div>
                <Slider
                  value={[spineConfig.thoracicKyphosis]}
                  onValueChange={(value) => handleSliderChange('thoracicKyphosis', value)}
                  min={20}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-center text-muted-foreground">
                  Normal: 35°
                </div>
              </div>
            </div>

            {/* Lumbar Lordosis Slider */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">
                  Lumbar Lordosis
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Inward curve of the lower back
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reduced</span>
                  <span className="font-mono font-medium">
                    {spineConfig.lumbarLordosis}°
                  </span>
                  <span>Increased</span>
                </div>
                <Slider
                  value={[spineConfig.lumbarLordosis]}
                  onValueChange={(value) => handleSliderChange('lumbarLordosis', value)}
                  min={-70}
                  max={-30}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-center text-muted-foreground">
                  Normal: -50°
                </div>
              </div>
            </div>

            {/* Clinical Interpretation */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Clinical Notes</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                {spineConfig.cervicalLordosis > -35 && (
                  <p>• Reduced cervical lordosis (hypolordosis)</p>
                )}
                {spineConfig.cervicalLordosis < -45 && (
                  <p>• Increased cervical lordosis (hyperlordosis)</p>
                )}
                {spineConfig.thoracicKyphosis > 40 && (
                  <p>• Increased thoracic kyphosis (hyperkyphosis)</p>
                )}
                {spineConfig.thoracicKyphosis < 30 && (
                  <p>• Reduced thoracic kyphosis (flat back)</p>
                )}
                {spineConfig.lumbarLordosis > -45 && (
                  <p>• Reduced lumbar lordosis (hypolordosis)</p>
                )}
                {spineConfig.lumbarLordosis < -55 && (
                  <p>• Increased lumbar lordosis (hyperlordosis)</p>
                )}
                {spineConfig.cervicalLordosis === -40 && 
                 spineConfig.thoracicKyphosis === 35 && 
                 spineConfig.lumbarLordosis === -50 && (
                  <p className="text-green-600">• Normal spinal alignment</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>• Use sliders to adjust spine curvatures</p>
        <p>• Mouse controls: rotate (left-click), zoom (scroll), pan (right-click)</p>
        <p>• Clinical reference ranges are provided for each curve</p>
      </div>
    </div>
  );
}