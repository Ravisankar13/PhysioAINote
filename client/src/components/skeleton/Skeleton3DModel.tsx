import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Skeleton3DModelProps {
  adjustments: {
    femurLength: number;
    tibiaLength: number;
    humerusLength: number;
    radiusLength: number;
    spineLength: number;
    ribcageWidth: number;
    pelvisWidth: number;
  };
}

// Main model component that renders bones
function SkeletonModel({ adjustments }: Skeleton3DModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create a simple 3D skeleton with basic geometry
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Add subtle animation
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Skull */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.85, 0]} scale={[0.1, 0.15, 0.1]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Spine */}
      <mesh position={[0, 1.5, 0]} scale={[0.1, adjustments.spineLength * 0.7, 0.1]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Ribcage */}
      <mesh position={[0, 1.6, 0]} scale={[adjustments.ribcageWidth * 0.4, 0.5, 0.25]}>
        <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} wireframe={true} />
      </mesh>
      
      {/* Pelvis */}
      <mesh position={[0, 1.15, 0]} scale={[adjustments.pelvisWidth * 0.3, 0.15, 0.2]}>
        <torusGeometry args={[1, 0.4, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Arms */}
      {/* Left Arm - Upper */}
      <mesh position={[-0.3, 1.7, 0]} rotation={[0, 0, -Math.PI / 4]} scale={[0.08, adjustments.humerusLength * 0.4, 0.08]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Left Arm - Lower */}
      <mesh position={[-0.5, 1.4, 0]} rotation={[0, 0, -Math.PI / 4]} scale={[0.07, adjustments.radiusLength * 0.4, 0.07]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Right Arm - Upper */}
      <mesh position={[0.3, 1.7, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.08, adjustments.humerusLength * 0.4, 0.08]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Right Arm - Lower */}
      <mesh position={[0.5, 1.4, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.07, adjustments.radiusLength * 0.4, 0.07]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Legs */}
      {/* Left Leg - Upper */}
      <mesh position={[-0.15, 0.9, 0]} scale={[0.09, adjustments.femurLength * 0.5, 0.09]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Left Leg - Lower */}
      <mesh position={[-0.15, 0.4, 0]} scale={[0.08, adjustments.tibiaLength * 0.4, 0.08]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Right Leg - Upper */}
      <mesh position={[0.15, 0.9, 0]} scale={[0.09, adjustments.femurLength * 0.5, 0.09]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Right Leg - Lower */}
      <mesh position={[0.15, 0.4, 0]} scale={[0.08, adjustments.tibiaLength * 0.4, 0.08]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Joints */}
      <mesh position={[-0.3, 1.7, 0]} scale={[0.1, 0.1, 0.1]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      <mesh position={[0.3, 1.7, 0]} scale={[0.1, 0.1, 0.1]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.3} metalness={0.1} />
      </mesh>
      
      <mesh position={[-0.15, 1.15, 0]} scale={[0.12, 0.12, 0.12]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#ff5252" roughness={0.3} metalness={0.1} />
      </mesh>
      
      <mesh position={[0.15, 1.15, 0]} scale={[0.12, 0.12, 0.12]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#ff5252" roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}

export function Skeleton3DModel({ adjustments }: Skeleton3DModelProps) {
  return (
    <div className="w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        <SkeletonModel adjustments={adjustments} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[10, 20, 0x222222, 0x444444]} position={[0, -0.5, 0]} />
        <axesHelper args={[1]} />
      </Canvas>
    </div>
  );
}