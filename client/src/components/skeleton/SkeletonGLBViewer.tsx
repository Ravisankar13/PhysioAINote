import { useRef, Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, Loader2 } from 'lucide-react';

interface SkeletonGLBViewerProps {
  modelConfig: any;
  className?: string;
  showControls?: boolean;
}

function SkeletonModel({ modelConfig }: { modelConfig: any }) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/rigged-skeleton.glb');
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = (child.material as THREE.Material).clone();
      }
    });
    return clone;
  }, [scene]);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
    }
  });
  
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

useGLTF.preload('/models/rigged-skeleton.glb');

export default function SkeletonGLBViewer({ modelConfig, className = "", showControls = true }: SkeletonGLBViewerProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
          setErrorMessage('WebGL is not supported in this browser');
          setStatus('error');
          return;
        }

        const response = await fetch('/models/rigged-skeleton.glb', { method: 'HEAD' });
        if (!response.ok) {
          setErrorMessage(`Model file not accessible: HTTP ${response.status}`);
          setStatus('error');
          return;
        }

        setStatus('ready');
      } catch (err) {
        setErrorMessage(`Initialization failed: ${err}`);
        setStatus('error');
      }
    };

    checkSupport();
  }, []);

  if (status === 'checking') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-50 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Initializing 3D viewer...</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-4 ${className}`}>
        <AlertCircle className="h-10 w-10 text-amber-600 mb-3" />
        <h3 className="text-lg font-semibold text-amber-800 mb-2">3D Viewer Error</h3>
        <p className="text-sm text-amber-700 text-center max-w-md">{errorMessage}</p>
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
