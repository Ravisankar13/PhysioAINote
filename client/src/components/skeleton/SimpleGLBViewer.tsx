import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

interface SimpleGLBViewerProps {
  modelConfig: any;
  className?: string;
}

function Model({ url }: { url: string }) {
  const ref = useRef<any>();
  const { scene } = useGLTF(url);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
    }
  });
  
  return <primitive ref={ref} object={scene} position={[0, -2, 0]} />;
}

export default function SimpleGLBViewer({ modelConfig, className = "" }: SimpleGLBViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Model url="/models/skeleton_rig.glb" />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}