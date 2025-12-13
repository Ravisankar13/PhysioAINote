import { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SkeletonGLBViewerProps {
  modelConfig: any;
  className?: string;
  showControls?: boolean;
}

function SkeletonModel({ modelConfig }: { modelConfig: any }) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/rigged-skeleton.glb');
  const clonedScene = scene.clone(true);
  
  // Slow rotation for visualization
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
    }
  });
  
  // Apply overall scale
  useEffect(() => {
    if (!ref.current) return;
    const scale = modelConfig.limbScales?.overall || 1.0;
    ref.current.scale.set(scale, scale, scale);
  }, [modelConfig.limbScales?.overall]);
  
  return (
    <group ref={ref} position={[0, -1.5, 0]}>
      <primitive object={clonedScene} scale={0.01} />
    </group>
  );
}

export default function SkeletonGLBViewer({ modelConfig, className = "", showControls = true }: SkeletonGLBViewerProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setHasWebGL(!!gl);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (hasWebGL === null) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="animate-pulse text-muted-foreground">Checking WebGL...</div>
      </div>
    );
  }

  if (!hasWebGL) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 rounded-lg p-4 ${className}`}>
        <div className="text-red-600 text-lg font-semibold mb-2">WebGL Not Available</div>
        <p className="text-sm text-red-700 text-center">Your browser doesn't support WebGL, which is required for 3D visualization.</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true, 
          preserveDrawingBuffer: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0xf0f0f0, 1);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          <SkeletonModel modelConfig={modelConfig} />
          {showControls && (
            <OrbitControls 
              enableZoom={true} 
              enablePan={true} 
              minDistance={2} 
              maxDistance={15}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

