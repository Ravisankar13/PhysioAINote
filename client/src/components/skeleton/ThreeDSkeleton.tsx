import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDSkeletonProps {
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

// Bone component that uses a cylinder for basic bone geometry
function Bone({ 
  start, 
  end, 
  width = 0.5, 
  color = '#f0f0f0' 
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  width?: number; 
  color?: string 
}) {
  // Calculate the distance between start and end
  const position = useMemo(() => {
    const midpoint = new THREE.Vector3(
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2
    );
    return [midpoint.x, midpoint.y, midpoint.z];
  }, [start, end]);

  // Calculate the rotation to align cylinder with start and end points
  const rotation = useMemo(() => {
    const direction = new THREE.Vector3(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2]
    ).normalize();
    
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, direction);
    
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, [start, end]);

  // Calculate height of cylinder
  const height = useMemo(() => {
    return Math.sqrt(
      Math.pow(end[0] - start[0], 2) +
      Math.pow(end[1] - start[1], 2) +
      Math.pow(end[2] - start[2], 2)
    );
  }, [start, end]);

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[width / 2, width / 2, height, 8]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
    </mesh>
  );
}

// Joint component that uses a sphere
function Joint({ 
  position, 
  size = 0.8, 
  color = '#e0e0e0' 
}: { 
  position: [number, number, number]; 
  size?: number; 
  color?: string 
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
    </mesh>
  );
}

function SkeletonModel({ adjustments }: ThreeDSkeletonProps) {
  const skeletonRef = useRef<THREE.Group>(null);
  
  // Rotate the skeleton model over time
  useFrame(({ clock }) => {
    if (skeletonRef.current) {
      skeletonRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  // Calculate skeleton coordinates based on adjustments
  const skeleton = useMemo(() => {
    // Head/spine positions
    const head: [number, number, number] = [0, 16, 0];
    const neck: [number, number, number] = [0, 14, 0];
    const spine: [number, number, number][] = [
      neck,
      [0, 14 - 10 * adjustments.spineLength, 0] // End of spine/top of pelvis
    ];
    
    // Shoulder positions
    const shoulderWidth = 5 * adjustments.ribcageWidth;
    const shoulderLeftPos: [number, number, number] = [-shoulderWidth/2, 13, 0];
    const shoulderRightPos: [number, number, number] = [shoulderWidth/2, 13, 0];
    
    // Elbow positions
    const elbowHeight = 13 - 5 * adjustments.humerusLength;
    const elbowLeftPos: [number, number, number] = [-shoulderWidth/2 - 1, elbowHeight, 2];
    const elbowRightPos: [number, number, number] = [shoulderWidth/2 + 1, elbowHeight, 2];
    
    // Wrist positions
    const wristHeight = elbowHeight - 5 * adjustments.radiusLength;
    const wristLeftPos: [number, number, number] = [-shoulderWidth/2 - 2, wristHeight, 1];
    const wristRightPos: [number, number, number] = [shoulderWidth/2 + 2, wristHeight, 1];
    
    // Hip positions
    const pelvisWidth = 4 * adjustments.pelvisWidth;
    const hipLeftPos: [number, number, number] = [-pelvisWidth/2, spine[1][1], 0];
    const hipRightPos: [number, number, number] = [pelvisWidth/2, spine[1][1], 0];
    
    // Knee positions
    const kneeHeight = spine[1][1] - 7 * adjustments.femurLength;
    const kneeLeftPos: [number, number, number] = [-pelvisWidth/2 + 0.5, kneeHeight, 1];
    const kneeRightPos: [number, number, number] = [pelvisWidth/2 - 0.5, kneeHeight, 1];
    
    // Ankle positions
    const ankleHeight = kneeHeight - 7 * adjustments.tibiaLength;
    const ankleLeftPos: [number, number, number] = [-pelvisWidth/2 + 1, ankleHeight, 0];
    const ankleRightPos: [number, number, number] = [pelvisWidth/2 - 1, ankleHeight, 0];
    
    // Ribcage dimensions
    const ribcageTop = neck[1] - 1;
    const ribcageBottom = spine[1][1] + 3;
    const ribcageWidth = 5 * adjustments.ribcageWidth;
    const ribcageDepth = 3 * adjustments.ribcageWidth;

    return {
      head,
      neck,
      spine,
      
      shoulderLeft: shoulderLeftPos,
      shoulderRight: shoulderRightPos,
      
      elbowLeft: elbowLeftPos,
      elbowRight: elbowRightPos,
      
      wristLeft: wristLeftPos,
      wristRight: wristRightPos,
      
      hipLeft: hipLeftPos,
      hipRight: hipRightPos,
      
      kneeLeft: kneeLeftPos,
      kneeRight: kneeRightPos,
      
      ankleLeft: ankleLeftPos,
      ankleRight: ankleRightPos,
      
      ribcage: {
        top: ribcageTop,
        bottom: ribcageBottom,
        width: ribcageWidth,
        depth: ribcageDepth
      }
    };
  }, [adjustments]);

  return (
    <group ref={skeletonRef}>
      {/* Skull */}
      <mesh position={[0, 17, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.2} />
      </mesh>
      
      {/* Spine bones */}
      <Bone start={skeleton.neck} end={skeleton.spine[1]} width={0.8} />
      
      {/* Ribs - simplified representation using boxes for visualization */}
      <group>
        {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => {
          const y = skeleton.ribcage.top + (skeleton.ribcage.bottom - skeleton.ribcage.top) * t;
          const scale = Math.sin(Math.PI * t);
          
          return (
            <mesh 
              key={`rib-${i}`} 
              position={[0, y, 0]}
              scale={[skeleton.ribcage.width * scale, 0.3, skeleton.ribcage.depth * scale]}
            >
              <ringGeometry args={[0.8, 1, 16]} />
              <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.2} />
            </mesh>
          );
        })}
      </group>
      
      {/* Pelvis */}
      <mesh position={[0, skeleton.spine[1][1] - 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[skeleton.hipLeft[0] * -1.5, 0.8, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.2} />
      </mesh>
      
      {/* Shoulders */}
      <Bone start={skeleton.shoulderLeft} end={skeleton.neck} width={0.6} />
      <Bone start={skeleton.shoulderRight} end={skeleton.neck} width={0.6} />
      
      {/* Arms */}
      <Bone start={skeleton.shoulderLeft} end={skeleton.elbowLeft} width={0.7} />
      <Bone start={skeleton.shoulderRight} end={skeleton.elbowRight} width={0.7} />
      <Bone start={skeleton.elbowLeft} end={skeleton.wristLeft} width={0.6} />
      <Bone start={skeleton.elbowRight} end={skeleton.wristRight} width={0.6} />
      
      {/* Legs */}
      <Bone start={skeleton.hipLeft} end={skeleton.kneeLeft} width={0.9} />
      <Bone start={skeleton.hipRight} end={skeleton.kneeRight} width={0.9} />
      <Bone start={skeleton.kneeLeft} end={skeleton.ankleLeft} width={0.8} />
      <Bone start={skeleton.kneeRight} end={skeleton.ankleRight} width={0.8} />
      
      {/* Joints */}
      <Joint position={skeleton.neck} />
      <Joint position={skeleton.shoulderLeft} />
      <Joint position={skeleton.shoulderRight} />
      <Joint position={skeleton.elbowLeft} />
      <Joint position={skeleton.elbowRight} />
      <Joint position={skeleton.wristLeft} size={0.6} />
      <Joint position={skeleton.wristRight} size={0.6} />
      <Joint position={skeleton.hipLeft} color="#ff5252" />
      <Joint position={skeleton.hipRight} color="#ff5252" />
      <Joint position={skeleton.kneeLeft} />
      <Joint position={skeleton.kneeRight} />
      <Joint position={skeleton.ankleLeft} size={0.6} />
      <Joint position={skeleton.ankleRight} size={0.6} />
    </group>
  );
}

export function ThreeDSkeleton({ adjustments }: ThreeDSkeletonProps) {
  return (
    <div className="w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 30], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <SkeletonModel adjustments={adjustments} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[30, 30, 0x222222, 0x444444]} position={[0, -10, 0]} />
      </Canvas>
    </div>
  );
}