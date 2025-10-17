import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
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
  const { scene } = useGLTF('/models/rigged-skeleton.glb');
  const bonesRef = useRef<{
    cervical: THREE.Bone[];
    thoracic: THREE.Bone[];
    lumbar: THREE.Bone[];
    allBones: THREE.Bone[];
  }>({
    cervical: [],
    thoracic: [],
    lumbar: [],
    allBones: []
  });

  useEffect(() => {
    // Debug: Log all bones found in the model
    const allBones: THREE.Bone[] = [];
    const spineBonesMap: { [key: string]: THREE.Bone } = {};
    
    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        allBones.push(child);
        console.log('Found bone:', child.name, 'at position:', child.position);
        
        // Store all spine-related bones
        const boneName = child.name.toLowerCase();
        if (boneName.includes('spine') || boneName.includes('vertebra') || 
            boneName.includes('neck') || boneName.includes('back') || 
            boneName.includes('chest') || boneName.includes('torso')) {
          spineBonesMap[child.name] = child;
        }
      }
    });
    
    console.log('Total bones found:', allBones.length);
    console.log('Spine-related bones:', Object.keys(spineBonesMap));
    
    // Try different bone naming conventions
    // Some models use Spine, Spine1, Spine2 or mixamorig:Spine
    const cervicalBones: THREE.Bone[] = [];
    const thoracicBones: THREE.Bone[] = [];
    const lumbarBones: THREE.Bone[] = [];
    
    allBones.forEach((bone) => {
      const name = bone.name.toLowerCase();
      
      // Check for neck/cervical bones (C1-C7)
      if (name.includes('neck') || name.includes('cervical') || 
          name.includes('head') && name.includes('spine')) {
        cervicalBones.push(bone);
      }
      // Check for chest/thoracic bones (T1-T12)
      else if (name.includes('spine2') || name.includes('chest') || 
               name.includes('thoracic') || name.includes('upper_spine')) {
        thoracicBones.push(bone);
      }
      // Check for lower back/lumbar bones (L1-L5)
      else if (name.includes('spine1') || name.includes('spine') && !name.includes('2') ||
               name.includes('lumbar') || name.includes('lower_spine') || 
               name.includes('hips') && name.includes('spine')) {
        lumbarBones.push(bone);
      }
    });
    
    bonesRef.current = {
      cervical: cervicalBones,
      thoracic: thoracicBones,
      lumbar: lumbarBones,
      allBones: allBones
    };
    
    console.log('Mapped spine bones:', {
      cervical: cervicalBones.map(b => b.name),
      thoracic: thoracicBones.map(b => b.name),
      lumbar: lumbarBones.map(b => b.name)
    });
  }, [scene]);

  useFrame(() => {
    // Apply rotations to spine bones based on slider values
    // Convert degrees to radians and apply incremental rotations
    
    // Cervical lordosis (neck curve)
    bonesRef.current.cervical.forEach((bone, index) => {
      const rotationFactor = (index + 1) / Math.max(bonesRef.current.cervical.length, 1);
      bone.rotation.x = THREE.MathUtils.degToRad(spineConfig.cervicalLordosis * rotationFactor * 0.5);
    });
    
    // Thoracic kyphosis (upper back curve)
    bonesRef.current.thoracic.forEach((bone, index) => {
      const rotationFactor = (index + 1) / Math.max(bonesRef.current.thoracic.length, 1);
      bone.rotation.x = THREE.MathUtils.degToRad(spineConfig.thoracicKyphosis * rotationFactor * 0.5);
    });
    
    // Lumbar lordosis (lower back curve)
    bonesRef.current.lumbar.forEach((bone, index) => {
      const rotationFactor = (index + 1) / Math.max(bonesRef.current.lumbar.length, 1);
      bone.rotation.x = THREE.MathUtils.degToRad(spineConfig.lumbarLordosis * rotationFactor * 0.5);
    });
    
    // If no specific spine bones were found, try to rotate any spine bones generically
    if (bonesRef.current.cervical.length === 0 && 
        bonesRef.current.thoracic.length === 0 && 
        bonesRef.current.lumbar.length === 0) {
      
      bonesRef.current.allBones.forEach((bone) => {
        const name = bone.name.toLowerCase();
        if (name.includes('spine') || name.includes('neck')) {
          // Apply a combined rotation based on all three sliders
          const avgRotation = (spineConfig.cervicalLordosis + 
                              spineConfig.thoracicKyphosis + 
                              spineConfig.lumbarLordosis) / 3;
          bone.rotation.x = THREE.MathUtils.degToRad(avgRotation * 0.3);
        }
      });
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
    console.log(`Slider changed: ${property} = ${value[0]}`);
    setSpineConfig(prev => {
      const newConfig = {
        ...prev,
        [property]: value[0]
      };
      console.log('New spine config:', newConfig);
      return newConfig;
    });
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
            <CardTitle>3D Rigged Skeleton Model</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)]">
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <Canvas 
                camera={{ position: [3, 0, 8], fov: 45 }}
                style={{ background: 'transparent' }}
              >
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
                  <directionalLight position={[-10, 10, -5]} intensity={0.4} />
                  <SkeletonModel spineConfig={spineConfig} />
                  <OrbitControls 
                    enablePan={true} 
                    enableZoom={true} 
                    enableRotate={true} 
                    autoRotate={false}
                    minDistance={3}
                    maxDistance={20}
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
        <p>• Use sliders to adjust spine curvatures and see the changes in real-time</p>
        <p>• The visualization shows cervical (red), thoracic (orange), and lumbar (green) curves</p>
        <p>• Clinical reference ranges are provided for each curve</p>
      </div>
    </div>
  );
}