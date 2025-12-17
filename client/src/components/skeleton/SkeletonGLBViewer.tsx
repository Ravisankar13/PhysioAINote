import { useRef, Suspense, useEffect, useState, useMemo, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SkeletonGLBViewerProps {
  modelConfig: any;
  className?: string;
  showControls?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; onError: (error: Error) => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function SkeletonModel({ modelConfig }: { modelConfig: any }) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/rigged-skeleton.glb');
  
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    try {
      const clone = scene.clone(true);
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.material = (child.material as THREE.Material).clone();
        }
      });
      return clone;
    } catch (err) {
      console.error('Failed to clone scene:', err);
      return null;
    }
  }, [scene]);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
    }
  });
  
  useEffect(() => {
    if (!ref.current) return;
    const scale = modelConfig?.limbScales?.overall || 1.0;
    ref.current.scale.set(scale, scale, scale);
  }, [modelConfig?.limbScales?.overall]);

  if (!clonedScene) {
    return null;
  }
  
  return (
    <group ref={ref} position={[0, -1.5, 0]}>
      <primitive object={clonedScene} scale={0.01} />
    </group>
  );
}

function checkWebGLSupport(): { supported: boolean; message?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { supported: false, message: 'WebGL is not supported in this browser' };
    }

    if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer && renderer.toLowerCase().includes('swiftshader')) {
          return { supported: false, message: 'Software WebGL renderer detected - hardware acceleration required' };
        }
      }
    }

    return { supported: true };
  } catch (err) {
    return { supported: false, message: `WebGL check failed: ${err}` };
  }
}

export default function SkeletonGLBViewer({ modelConfig, className = "", showControls = true }: SkeletonGLBViewerProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'rendering' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const webglCheck = checkWebGLSupport();
        if (!webglCheck.supported) {
          setErrorMessage(webglCheck.message || 'WebGL not available');
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
  }, [retryCount]);

  const handleWebGLError = (error: Error) => {
    console.error('WebGL rendering error:', error);
    setErrorMessage(`3D rendering failed: ${error.message || 'Unknown WebGL error'}`);
    setStatus('error');
  };

  const handleRetry = () => {
    setStatus('checking');
    setErrorMessage('');
    setRetryCount(c => c + 1);
  };

  if (status === 'checking') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-900 ${className}`}>
        <div className="flex items-center gap-2 text-green-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Initializing 3D viewer...</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 ${className}`}>
        <div className="w-16 h-16 mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">3D Viewer Requires WebGL</h3>
        <p className="text-sm text-gray-300 text-center max-w-md mb-3">{errorMessage}</p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 max-w-md">
          <p className="text-xs text-blue-300 text-center">
            <strong>Note:</strong> The preview environment has limited WebGL support. 
            The 3D skeleton will work when deployed or viewed in a full browser.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          className="border-green-500 text-green-400 hover:bg-green-500/20"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-slate-900 ${className}`}>
      <WebGLErrorBoundary onError={handleWebGLError}>
        <Canvas 
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ 
            antialias: true, 
            alpha: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: true
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x1a1a2e, 1);
            setStatus('rendering');
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />
            <SkeletonModel modelConfig={modelConfig || {}} />
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
      </WebGLErrorBoundary>
    </div>
  );
}
