import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Text } from '@react-three/drei';
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

// Standard bone material
const boneMaterial = {
  color: new THREE.Color('#f0e6d8'),
  roughness: 0.3,
  metalness: 0.1,
  envMapIntensity: 0.5
};

function BoneSegment({ 
  position, 
  rotation, 
  scale, 
  boneColor = boneMaterial.color,
  name = ''
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <cylinderGeometry args={[1, 1, 1, 8]} />
      <meshStandardMaterial 
        color={boneColor} 
        roughness={boneMaterial.roughness} 
        metalness={boneMaterial.metalness} 
        envMapIntensity={boneMaterial.envMapIntensity}
      />
      {name && (
        <Text
          position={[0, 0, 1.1]}
          fontSize={0.2}
          color="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      )}
    </mesh>
  );
}

function JointSphere({ position, scale, boneColor = '#e8e0d0' }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        color={boneColor} 
        roughness={boneMaterial.roughness} 
        metalness={boneMaterial.metalness} 
      />
    </mesh>
  );
}

// Main model component that renders bones
function SkeletonModel({ adjustments }: Skeleton3DModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [showLabels, setShowLabels] = useState(false);
  
  // Create a realistic 3D skeleton with detailed anatomy
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Add subtle breathing-like movement
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Skull */}
      <group position={[0, 2.1, 0]}>
        {/* Cranium */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Face structure */}
        <mesh position={[0, -0.08, 0.05]}>
          <boxGeometry args={[0.18, 0.15, 0.16]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Jaw */}
        <mesh position={[0, -0.17, 0.03]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.16, 0.06, 0.14]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Eye sockets */}
        <mesh position={[-0.05, -0.05, 0.13]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#302f2f" roughness={0.8} />
        </mesh>
        <mesh position={[0.05, -0.05, 0.13]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#302f2f" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Cervical Vertebrae */}
      <group position={[0, 1.9, 0]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`cervical-${i}`} position={[0, -i * 0.035, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 0.025, 8]} />
            <meshStandardMaterial {...boneMaterial} />
          </mesh>
        ))}
      </group>
      
      {/* Spine with vertebrae */}
      <group position={[0, 1.65, 0]}>
        {Array.from({ length: Math.floor(12 * adjustments.spineLength) }).map((_, i) => (
          <mesh key={`thoracic-${i}`} position={[0, -i * 0.04, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.03, 8]} />
            <meshStandardMaterial {...boneMaterial} />
          </mesh>
        ))}
      </group>
      
      {/* Lumbar vertebrae */}
      <group position={[0, 1.17, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`lumbar-${i}`} position={[0, -i * 0.05, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.035, 8]} />
            <meshStandardMaterial {...boneMaterial} />
          </mesh>
        ))}
      </group>
      
      {/* Ribcage */}
      <group position={[0, 1.6, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={`rib-${i}`} position={[0, -i * 0.055, 0]}>
            {/* Left rib */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI * 0.1]}>
              <torusGeometry args={[adjustments.ribcageWidth * 0.18, 0.015, 8, 12, Math.PI * 0.8]} />
              <meshStandardMaterial {...boneMaterial} />
            </mesh>
            {/* Right rib */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI * 0.1]}>
              <torusGeometry args={[adjustments.ribcageWidth * 0.18, 0.015, 8, 12, Math.PI * 0.8]} />
              <meshStandardMaterial {...boneMaterial} />
            </mesh>
          </group>
        ))}
        
        {/* Sternum */}
        <mesh position={[0.12 * adjustments.ribcageWidth, -0.22, 0.06]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.25, 0.02]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
      </group>
      
      {/* Pelvis */}
      <group position={[0, 0.9, 0]}>
        {/* Iliac crest */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[adjustments.pelvisWidth * 0.22, 0.04, 16, 24, Math.PI]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Hip sockets */}
        <JointSphere 
          position={[-0.18 * adjustments.pelvisWidth, -0.02, 0]} 
          scale={[0.08, 0.08, 0.08]} 
        />
        <JointSphere 
          position={[0.18 * adjustments.pelvisWidth, -0.02, 0]} 
          scale={[0.08, 0.08, 0.08]} 
        />
        
        {/* Sacrum */}
        <mesh position={[0, -0.1, -0.02]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
      </group>
      
      {/* Shoulders - Clavicles */}
      <group position={[0, 1.7, 0]}>
        {/* Left clavicle */}
        <mesh position={[-0.15, 0, 0]} rotation={[0, 0, -Math.PI * 0.15]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Right clavicle */}
        <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI * 0.15]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Shoulder joints */}
        <JointSphere 
          position={[-0.3, 0, 0]} 
          scale={[0.07, 0.07, 0.07]} 
        />
        <JointSphere 
          position={[0.3, 0, 0]} 
          scale={[0.07, 0.07, 0.07]} 
        />
      </group>
      
      {/* Arms */}
      {/* Left Arm - Humerus */}
      <BoneSegment
        position={[-0.3, 1.5, 0]}
        rotation={[0, 0, -Math.PI * 0.1]}
        scale={[0.05, adjustments.humerusLength * 0.4, 0.05]}
        name={showLabels ? 'Humerus' : ''}
      />
      
      {/* Left Elbow */}
      <JointSphere 
        position={[-0.35, 1.3, 0]} 
        scale={[0.06, 0.06, 0.06]} 
      />
      
      {/* Left Forearm - Radius & Ulna */}
      <group position={[-0.4, 1.1, 0]} rotation={[0, 0, -Math.PI * 0.1]}>
        <BoneSegment
          position={[0, 0, 0.02]}
          rotation={[0, 0, 0]}
          scale={[0.035, adjustments.radiusLength * 0.4, 0.035]}
          name={showLabels ? 'Radius' : ''}
        />
        <BoneSegment
          position={[0, 0, -0.02]}
          rotation={[0, 0, 0]}
          scale={[0.035, adjustments.radiusLength * 0.4, 0.035]}
          name={showLabels ? 'Ulna' : ''}
        />
      </group>
      
      {/* Left Hand */}
      <group position={[-0.45, 0.9, 0]}>
        {/* Wrist */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.03, 0.12]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Fingers */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`leftfinger-${i}`} position={[(i - 2) * 0.02 - 0.02, -0.08, 0.01]} rotation={[Math.PI * 0.1, 0, 0]} scale={[0.015, 0.12, 0.015]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial {...boneMaterial} />
          </mesh>
        ))}
      </group>
      
      {/* Right Arm - Humerus */}
      <BoneSegment
        position={[0.3, 1.5, 0]}
        rotation={[0, 0, Math.PI * 0.1]}
        scale={[0.05, adjustments.humerusLength * 0.4, 0.05]}
        name={showLabels ? 'Humerus' : ''}
      />
      
      {/* Right Elbow */}
      <JointSphere 
        position={[0.35, 1.3, 0]} 
        scale={[0.06, 0.06, 0.06]} 
      />
      
      {/* Right Forearm - Radius & Ulna */}
      <group position={[0.4, 1.1, 0]} rotation={[0, 0, Math.PI * 0.1]}>
        <BoneSegment
          position={[0, 0, 0.02]}
          rotation={[0, 0, 0]}
          scale={[0.035, adjustments.radiusLength * 0.4, 0.035]}
        />
        <BoneSegment
          position={[0, 0, -0.02]}
          rotation={[0, 0, 0]}
          scale={[0.035, adjustments.radiusLength * 0.4, 0.035]}
        />
      </group>
      
      {/* Right Hand */}
      <group position={[0.45, 0.9, 0]}>
        {/* Wrist */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.03, 0.12]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
        
        {/* Fingers */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`rightfinger-${i}`} position={[(i - 2) * 0.02 + 0.02, -0.08, 0.01]} rotation={[Math.PI * 0.1, 0, 0]} scale={[0.015, 0.12, 0.015]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial {...boneMaterial} />
          </mesh>
        ))}
      </group>
      
      {/* Legs */}
      {/* Left Hip Joint */}
      <JointSphere 
        position={[-0.18 * adjustments.pelvisWidth, 0.88, 0]} 
        scale={[0.08, 0.08, 0.08]} 
      />
      
      {/* Left Leg - Femur */}
      <BoneSegment
        position={[-0.18, 0.6, 0]}
        rotation={[0, 0, 0]}
        scale={[0.06, adjustments.femurLength * 0.5, 0.06]}
        name={showLabels ? 'Femur' : ''}
      />
      
      {/* Left Knee */}
      <group position={[-0.18, 0.3, 0]}>
        <JointSphere 
          position={[0, 0, 0]} 
          scale={[0.07, 0.07, 0.07]} 
        />
        
        {/* Patella */}
        <mesh position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
      </group>
      
      {/* Left Leg - Tibia and Fibula */}
      <BoneSegment
        position={[-0.18, 0.1, 0.01]}
        rotation={[0, 0, 0]}
        scale={[0.05, adjustments.tibiaLength * 0.4, 0.05]}
        name={showLabels ? 'Tibia' : ''}
      />
      
      <BoneSegment
        position={[-0.18, 0.1, -0.02]}
        rotation={[0, 0, 0]}
        scale={[0.035, adjustments.tibiaLength * 0.38, 0.035]}
        name={showLabels ? 'Fibula' : ''}
      />
      
      {/* Left Ankle */}
      <JointSphere 
        position={[-0.18, -0.1, 0]} 
        scale={[0.05, 0.05, 0.05]} 
      />
      
      {/* Left Foot */}
      <mesh position={[-0.18, -0.15, 0.08]} rotation={[Math.PI * 0.05, 0, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.2]} />
        <meshStandardMaterial {...boneMaterial} />
      </mesh>
      
      {/* Right Hip Joint */}
      <JointSphere 
        position={[0.18 * adjustments.pelvisWidth, 0.88, 0]} 
        scale={[0.08, 0.08, 0.08]} 
      />
      
      {/* Right Leg - Femur */}
      <BoneSegment
        position={[0.18, 0.6, 0]}
        rotation={[0, 0, 0]}
        scale={[0.06, adjustments.femurLength * 0.5, 0.06]}
      />
      
      {/* Right Knee */}
      <group position={[0.18, 0.3, 0]}>
        <JointSphere 
          position={[0, 0, 0]} 
          scale={[0.07, 0.07, 0.07]} 
        />
        
        {/* Patella */}
        <mesh position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial {...boneMaterial} />
        </mesh>
      </group>
      
      {/* Right Leg - Tibia and Fibula */}
      <BoneSegment
        position={[0.18, 0.1, 0.01]}
        rotation={[0, 0, 0]}
        scale={[0.05, adjustments.tibiaLength * 0.4, 0.05]}
      />
      
      <BoneSegment
        position={[0.18, 0.1, -0.02]}
        rotation={[0, 0, 0]}
        scale={[0.035, adjustments.tibiaLength * 0.38, 0.035]}
      />
      
      {/* Right Ankle */}
      <JointSphere 
        position={[0.18, -0.1, 0]} 
        scale={[0.05, 0.05, 0.05]} 
      />
      
      {/* Right Foot */}
      <mesh position={[0.18, -0.15, 0.08]} rotation={[Math.PI * 0.05, 0, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.2]} />
        <meshStandardMaterial {...boneMaterial} />
      </mesh>
      
      {/* Toggle labels button */}
      <mesh 
        position={[0, -0.5, 1]} 
        onClick={() => setShowLabels(!showLabels)}
      >
        <planeGeometry args={[0.4, 0.1]} />
        <meshStandardMaterial color={showLabels ? "#8bc34a" : "#9e9e9e"} />
        <Text position={[0, 0, 0.01]} fontSize={0.05} color="#ffffff">
          {showLabels ? "HIDE LABELS" : "SHOW LABELS"}
        </Text>
      </mesh>
    </group>
  );
}

export function Skeleton3DModel({ adjustments }: Skeleton3DModelProps) {
  return (
    <div className="w-full h-[500px] bg-zinc-100 rounded-lg overflow-hidden shadow-inner">
      <Canvas camera={{ position: [0, 1, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        <SkeletonModel adjustments={adjustments} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}