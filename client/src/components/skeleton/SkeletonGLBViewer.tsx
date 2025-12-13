import { useRef, Suspense, useEffect, useState, Component, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, Loader2 } from 'lucide-react';

interface SkeletonGLBViewerProps {
  modelConfig: any;
  className?: string;
  showControls?: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ThreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Three.js Error:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function SkeletonModel({ modelConfig, onError }: { modelConfig: any; onError: (msg: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  let gltf;
  try {
    gltf = useGLTF('/models/rigged-skeleton.glb');
  } catch (err) {
    console.error('useGLTF error:', err);
    onError(`Failed to load model: ${err}`);
    return null;
  }

  const clonedScene = gltf.scene.clone(true);
  
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

function SceneContent({ modelConfig, onError }: { modelConfig: any; onError: (msg: string) => void }) {
  const { gl } = useThree();
  
  useEffect(() => {
    console.log('WebGL Renderer info:', {
      renderer: gl.info.render,
      memory: gl.info.memory,
      programs: gl.info.programs?.length
    });
  }, [gl]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <ThreeErrorBoundary onError={(e) => onError(e.message)}>
        <SkeletonModel modelConfig={modelConfig} onError={onError} />
      </ThreeErrorBoundary>
    </>
  );
}

useGLTF.preload('/models/rigged-skeleton.glb');

export default function SkeletonGLBViewer({ modelConfig, className = "", showControls = true }: SkeletonGLBViewerProps) {
  const [status, setStatus] = useState<'checking' | 'loading' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkWebGL = async () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          setErrorMessage('WebGL is not supported in this browser');
          setStatus('error');
          return;
        }

        const response = await fetch('/models/rigged-skeleton.glb', { method: 'HEAD' });
        if (!response.ok) {
          setErrorMessage(`GLB file not accessible: HTTP ${response.status}`);
          setStatus('error');
          return;
        }

        console.log('WebGL and GLB file check passed');
        setStatus('loading');
        
        setTimeout(() => {
          if (status === 'loading') {
            setStatus('ready');
          }
        }, 500);
        
      } catch (err) {
        console.error('Initialization error:', err);
        setErrorMessage(`Initialization failed: ${err}`);
        setStatus('error');
      }
    };

    checkWebGL();
  }, []);

  const handleError = (msg: string) => {
    console.error('3D Viewer error:', msg);
    setErrorMessage(msg);
    setStatus('error');
  };

  if (status === 'checking') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-50 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking WebGL support...</span>
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
          preserveDrawingBuffer: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0xf0f0f0, 1);
          console.log('Canvas created successfully');
          setStatus('ready');
        }}
        onError={(e) => {
          console.error('Canvas error:', e);
          handleError('Canvas rendering failed');
        }}
      >
        <Suspense fallback={null}>
          <SceneContent modelConfig={modelConfig} onError={handleError} />
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
