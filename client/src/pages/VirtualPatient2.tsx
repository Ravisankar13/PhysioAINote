import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        if (boneName.includes('spine') || boneName.includes('vertebra')) {
          if (boneName.includes('cervical') || boneName.includes('neck')) {
            bonesRef.current.cervical = child;
          } else if (boneName.includes('thoracic') || boneName.includes('chest')) {
            bonesRef.current.thoracic = child;
          } else if (boneName.includes('lumbar') || boneName.includes('lower')) {
            bonesRef.current.lumbar = child;
          }
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    // Apply rotations to spine bones based on slider values
    if (bonesRef.current.cervical) {
      bonesRef.current.cervical.rotation.x = THREE.MathUtils.degToRad(spineConfig.cervicalLordosis);
    }
    
    if (bonesRef.current.thoracic) {
      bonesRef.current.thoracic.rotation.x = THREE.MathUtils.degToRad(spineConfig.thoracicKyphosis);
    }
    
    if (bonesRef.current.lumbar) {
      bonesRef.current.lumbar.rotation.x = THREE.MathUtils.degToRad(spineConfig.lumbarLordosis);
    }
  });

  return <primitive object={scene} position={[0, -2, 0]} scale={1} />;
}

// Fallback SVG visualization when WebGL is not available
function SpineVisualization({ spineConfig }: { spineConfig: SpineConfig }) {
  // Calculate curve positions based on configuration
  const cervicalCurve = 50 + (spineConfig.cervicalLordosis + 40) * 0.5;
  const thoracicCurve = 100 - (spineConfig.thoracicKyphosis - 35) * 0.8;
  const lumbarCurve = 50 + (spineConfig.lumbarLordosis + 50) * 0.5;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
      <svg
        viewBox="0 0 300 500"
        className="w-full h-full max-h-[450px]"
        style={{ maxWidth: '300px' }}
      >
        {/* Background grid for reference */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="300" height="500" fill="url(#grid)" />
        
        {/* Spine visualization */}
        <g transform="translate(150, 0)">
          {/* Head */}
          <circle cx="0" cy="40" r="25" fill="none" stroke="#4B5563" strokeWidth="2" />
          
          {/* Cervical spine with curve */}
          <path
            d={`M 0 65 Q ${cervicalCurve - 50} 90 0 120`}
            fill="none"
            stroke="#EF4444"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Thoracic spine with curve */}
          <path
            d={`M 0 120 Q ${thoracicCurve - 100} 180 0 240`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          
          {/* Lumbar spine with curve */}
          <path
            d={`M 0 240 Q ${lumbarCurve - 50} 290 0 340`}
            fill="none"
            stroke="#10B981"
            strokeWidth="5"
            strokeLinecap="round"
          />
          
          {/* Pelvis */}
          <ellipse cx="0" cy="360" rx="40" ry="25" fill="none" stroke="#4B5563" strokeWidth="2" />
          
          {/* Ribs (simplified) */}
          <g stroke="#94A3B8" strokeWidth="1" fill="none">
            <ellipse cx="0" cy="140" rx="60" ry="15" />
            <ellipse cx="0" cy="160" rx="65" ry="17" />
            <ellipse cx="0" cy="180" rx="70" ry="19" />
            <ellipse cx="0" cy="200" rx="68" ry="18" />
            <ellipse cx="0" cy="220" rx="60" ry="15" />
          </g>
          
          {/* Labels */}
          <text x="80" y="95" fontSize="12" fill="#EF4444">Cervical</text>
          <text x="80" y="180" fontSize="12" fill="#F59E0B">Thoracic</text>
          <text x="80" y="290" fontSize="12" fill="#10B981">Lumbar</text>
        </g>
        
        {/* Curve indicators */}
        <g fontSize="10" fill="#6B7280">
          <text x="10" y="480">
            C: {spineConfig.cervicalLordosis}° | T: {spineConfig.thoracicKyphosis}° | L: {spineConfig.lumbarLordosis}°
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function VirtualPatient2() {
  // Default anatomical values
  const defaultSpineConfig: SpineConfig = {
    cervicalLordosis: -40,  // Normal cervical lordosis
    thoracicKyphosis: 35,   // Normal thoracic kyphosis
    lumbarLordosis: -50     // Normal lumbar lordosis
  };

  const [spineConfig, setSpineConfig] = useState<SpineConfig>(defaultSpineConfig);
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setIsWebGLAvailable(!!gl);
  }, []);

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

      {isWebGLAvailable === false && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            3D visualization requires WebGL. Showing simplified spine view with your adjustments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Model Display - Takes up 2 columns */}
        <Card className="h-[600px] lg:col-span-2">
          <CardHeader>
            <CardTitle>Skeleton Model</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)]">
            {isWebGLAvailable === null ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading visualization...</p>
              </div>
            ) : isWebGLAvailable ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <Canvas 
                  camera={{ position: [3, 0, 8], fov: 45 }}
                  style={{ background: 'transparent' }}
                >
                  <Suspense fallback={null}>
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
                    <directionalLight position={[-10, 10, -5]} intensity={0.4} />
                    <SkeletonModel spineConfig={spineConfig} />
                    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate={false} />
                  </Suspense>
                </Canvas>
              </div>
            ) : (
              <SpineVisualization spineConfig={spineConfig} />
            )}
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