import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SkeletonModel() {
  const { scene } = useGLTF('/models/skeleton_rig.glb');
  return <primitive object={scene} position={[0, -2, 0]} scale={1} />;
}

export default function VirtualPatient2() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Virtual Patient 2</h1>
        <p className="text-muted-foreground">
          3D Skeleton Visualization
        </p>
      </div>

      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle>Skeleton Model</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-80px)]">
          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <Canvas 
              camera={{ position: [0, 0, 8], fov: 45 }}
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
                
                {/* 3D Skeleton Model */}
                <SkeletonModel />
                
                {/* Camera Controls - allows rotation and zoom */}
                <OrbitControls 
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  autoRotate={true}
                  autoRotateSpeed={1}
                />
              </Suspense>
            </Canvas>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>• Use mouse to rotate the model</p>
        <p>• Scroll to zoom in/out</p>
        <p>• Right-click and drag to pan</p>
      </div>
    </div>
  );
}