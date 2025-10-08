import { useRef, Suspense, useEffect } from 'react';
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
  const { scene, nodes, materials } = useGLTF('/models/skeleton_character.glb');
  
  // Apply transformations based on modelConfig
  useEffect(() => {
    if (!ref.current) return;
    
    // Apply overall scale
    const scale = modelConfig.limbScales?.overall || 1.0;
    ref.current.scale.set(scale, scale, scale);
    
    // Find and manipulate bones if the model has a skeleton
    ref.current.traverse((child: any) => {
      if (child.isBone) {
        // Apply spine transformations
        if (child.name.toLowerCase().includes('spine')) {
          if (modelConfig.spine?.scoliosis) {
            child.rotation.z = THREE.MathUtils.degToRad(modelConfig.spine.scoliosis);
          }
        }
        
        // Apply hip transformations
        if (child.name.toLowerCase().includes('hip') || child.name.toLowerCase().includes('thigh')) {
          if (child.name.toLowerCase().includes('left')) {
            if (modelConfig.leftHip?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.leftHip.flexion);
            }
            if (modelConfig.leftHip?.abduction) {
              child.rotation.z = THREE.MathUtils.degToRad(-modelConfig.leftHip.abduction);
            }
          } else if (child.name.toLowerCase().includes('right')) {
            if (modelConfig.rightHip?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.rightHip.flexion);
            }
            if (modelConfig.rightHip?.abduction) {
              child.rotation.z = THREE.MathUtils.degToRad(modelConfig.rightHip.abduction);
            }
          }
        }
        
        // Apply knee transformations
        if (child.name.toLowerCase().includes('knee') || child.name.toLowerCase().includes('shin')) {
          if (child.name.toLowerCase().includes('left')) {
            if (modelConfig.leftKnee?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(modelConfig.leftKnee.flexion);
            }
          } else if (child.name.toLowerCase().includes('right')) {
            if (modelConfig.rightKnee?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(modelConfig.rightKnee.flexion);
            }
          }
        }
        
        // Apply shoulder transformations
        if (child.name.toLowerCase().includes('shoulder') || child.name.toLowerCase().includes('arm')) {
          if (child.name.toLowerCase().includes('left')) {
            if (modelConfig.leftShoulder?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.leftShoulder.flexion);
            }
            if (modelConfig.leftShoulder?.abduction) {
              child.rotation.z = THREE.MathUtils.degToRad(-modelConfig.leftShoulder.abduction);
            }
          } else if (child.name.toLowerCase().includes('right')) {
            if (modelConfig.rightShoulder?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.rightShoulder.flexion);
            }
            if (modelConfig.rightShoulder?.abduction) {
              child.rotation.z = THREE.MathUtils.degToRad(modelConfig.rightShoulder.abduction);
            }
          }
        }
        
        // Apply elbow transformations
        if (child.name.toLowerCase().includes('elbow') || child.name.toLowerCase().includes('forearm')) {
          if (child.name.toLowerCase().includes('left')) {
            if (modelConfig.leftElbow?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.leftElbow.flexion);
            }
          } else if (child.name.toLowerCase().includes('right')) {
            if (modelConfig.rightElbow?.flexion) {
              child.rotation.x = THREE.MathUtils.degToRad(-modelConfig.rightElbow.flexion);
            }
          }
        }
        
        // Apply ankle transformations
        if (child.name.toLowerCase().includes('ankle') || child.name.toLowerCase().includes('foot')) {
          if (child.name.toLowerCase().includes('left')) {
            if (modelConfig.leftAnkle?.dorsiflexion) {
              child.rotation.x = THREE.MathUtils.degToRad(modelConfig.leftAnkle.dorsiflexion);
            }
          } else if (child.name.toLowerCase().includes('right')) {
            if (modelConfig.rightAnkle?.dorsiflexion) {
              child.rotation.x = THREE.MathUtils.degToRad(modelConfig.rightAnkle.dorsiflexion);
            }
          }
        }
      }
      
      // Apply limb scaling to mesh parts
      if (child.isMesh) {
        if (child.name.toLowerCase().includes('arm')) {
          if (child.name.toLowerCase().includes('upper')) {
            const scale = modelConfig.limbScales?.upperArm || 1.0;
            child.scale.y = scale;
          } else if (child.name.toLowerCase().includes('fore')) {
            const scale = modelConfig.limbScales?.forearm || 1.0;
            child.scale.y = scale;
          }
        }
        if (child.name.toLowerCase().includes('thigh')) {
          const scale = modelConfig.limbScales?.thigh || 1.0;
          child.scale.y = scale;
        }
        if (child.name.toLowerCase().includes('shin')) {
          const scale = modelConfig.limbScales?.shin || 1.0;
          child.scale.y = scale;
        }
      }
    });
  }, [modelConfig]);
  
  // Slow rotation for visualization
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
    }
  });
  
  return (
    <group ref={ref} position={[0, -2, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function SkeletonGLBViewer({ modelConfig, className = "", showControls = true }: SkeletonGLBViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <SkeletonModel modelConfig={modelConfig} />
          {showControls && (
            <OrbitControls 
              enableZoom={true} 
              enablePan={true} 
              minDistance={3} 
              maxDistance={20}
              maxPolarAngle={Math.PI * 0.85}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

