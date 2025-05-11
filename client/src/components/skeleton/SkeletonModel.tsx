import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Model component that renders the actual skeleton
function Model({ 
  position = [0, 0, 0],
  scale = 1,
  limbAdjustments = {
    femurLength: 1,
    tibiaLength: 1,
    humerusLength: 1,
    radiusLength: 1,
    spineLength: 1
  }
}) {
  // In a real implementation, we'd use a proper model URL 
  // For this example, we'll create a simplified skeleton using Three.js primitives
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.1; // Gentle rotation for visualization
    }
  });

  // Create a simplified skeletal structure
  const createSkeleton = () => {
    const boneColor = new THREE.Color('#f0f0f0');
    const jointColor = new THREE.Color('#c0c0c0');
    
    // Apply adjustments to bone lengths
    const { femurLength, tibiaLength, humerusLength, radiusLength, spineLength } = limbAdjustments;

    return (
      <group ref={ref} position={position} scale={scale}>
        {/* Spine */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.2, 1 * spineLength, 0.2]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Pelvis */}
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.6, 0.2, 0.3]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Left femur */}
        <mesh position={[-0.3, -1.0, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.15, 0.8 * femurLength, 0.15]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Right femur */}
        <mesh position={[0.3, -1.0, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.15, 0.8 * femurLength, 0.15]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Left knee */}
        <mesh position={[-0.35, -1.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Right knee */}
        <mesh position={[0.35, -1.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Left tibia */}
        <mesh position={[-0.35, -2.0, 0]}>
          <boxGeometry args={[0.12, 0.8 * tibiaLength, 0.12]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Right tibia */}
        <mesh position={[0.35, -2.0, 0]}>
          <boxGeometry args={[0.12, 0.8 * tibiaLength, 0.12]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Shoulders */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.9, 0.2, 0.2]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Left humerus */}
        <mesh position={[-0.5, 0.0, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.15, 0.7 * humerusLength, 0.15]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Right humerus */}
        <mesh position={[0.5, 0.0, 0]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[0.15, 0.7 * humerusLength, 0.15]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Left elbow */}
        <mesh position={[-0.55, -0.4, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Right elbow */}
        <mesh position={[0.55, -0.4, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color={jointColor} />
        </mesh>
        
        {/* Left radius/ulna */}
        <mesh position={[-0.6, -0.8, 0]}>
          <boxGeometry args={[0.12, 0.6 * radiusLength, 0.12]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Right radius/ulna */}
        <mesh position={[0.6, -0.8, 0]}>
          <boxGeometry args={[0.12, 0.6 * radiusLength, 0.12]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
        
        {/* Head */}
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.25]} />
          <meshStandardMaterial color={boneColor} />
        </mesh>
      </group>
    );
  };

  return createSkeleton();
}

export function SkeletonModel() {
  const [adjustments, setAdjustments] = useState({
    femurLength: 1,
    tibiaLength: 1,
    humerusLength: 1,
    radiusLength: 1,
    spineLength: 1
  });

  const handleAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdjustments(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  return (
    <div className="flex flex-col md:flex-row w-full gap-4">
      <div className="w-full md:w-3/4 h-[600px] border rounded-lg overflow-hidden">
        <Canvas shadows>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <Model limbAdjustments={adjustments} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>
      
      <div className="w-full md:w-1/4 p-4 border rounded-lg bg-white">
        <h2 className="text-lg font-bold mb-4">Adjust Skeletal Model</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Femur Length: {adjustments.femurLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="femurLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.femurLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Tibia Length: {adjustments.tibiaLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="tibiaLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.tibiaLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Humerus Length: {adjustments.humerusLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="humerusLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.humerusLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Radius Length: {adjustments.radiusLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="radiusLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.radiusLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Spine Length: {adjustments.spineLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="spineLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.spineLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <button
            onClick={() => setAdjustments({
              femurLength: 1,
              tibiaLength: 1,
              humerusLength: 1,
              radiusLength: 1,
              spineLength: 1
            })}
            className="w-full bg-primary text-white py-2 rounded-md mt-4"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}