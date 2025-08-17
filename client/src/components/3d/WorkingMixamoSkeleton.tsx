import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface WorkingMixamoSkeletonProps {
  patientData?: {
    anthropometrics?: {
      height: number;
      weight: number;
      limbLengths?: {
        upperArm: number;
        forearm: number;
        thigh: number;
        shin: number;
      };
    };
    jointRestrictions?: any;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
  showControls?: boolean;
}

// Skeleton component that renders inside the Canvas
function SkeletonModel({ patientData }: { patientData?: any }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create skeleton bones structure
  const bones = useMemo(() => {
    const boneStructure: THREE.Bone[] = [];
    
    // Root/Hips
    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.set(0, 1, 0);
    boneStructure.push(hips);
    
    // Spine
    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, 0.2, 0);
    hips.add(spine);
    boneStructure.push(spine);
    
    // Chest
    const chest = new THREE.Bone();
    chest.name = 'Chest';
    chest.position.set(0, 0.3, 0);
    spine.add(chest);
    boneStructure.push(chest);
    
    // Neck
    const neck = new THREE.Bone();
    neck.name = 'Neck';
    neck.position.set(0, 0.2, 0);
    chest.add(neck);
    boneStructure.push(neck);
    
    // Head
    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.set(0, 0.15, 0);
    neck.add(head);
    boneStructure.push(head);
    
    // Left Arm
    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.set(0.15, 0.15, 0);
    chest.add(leftShoulder);
    boneStructure.push(leftShoulder);
    
    const leftUpperArm = new THREE.Bone();
    leftUpperArm.name = 'LeftUpperArm';
    leftUpperArm.position.set(0.15, 0, 0);
    leftShoulder.add(leftUpperArm);
    boneStructure.push(leftUpperArm);
    
    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForearm';
    leftForearm.position.set(0.25, 0, 0);
    leftUpperArm.add(leftForearm);
    boneStructure.push(leftForearm);
    
    const leftHand = new THREE.Bone();
    leftHand.name = 'LeftHand';
    leftHand.position.set(0.15, 0, 0);
    leftForearm.add(leftHand);
    boneStructure.push(leftHand);
    
    // Right Arm
    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.set(-0.15, 0.15, 0);
    chest.add(rightShoulder);
    boneStructure.push(rightShoulder);
    
    const rightUpperArm = new THREE.Bone();
    rightUpperArm.name = 'RightUpperArm';
    rightUpperArm.position.set(-0.15, 0, 0);
    rightShoulder.add(rightUpperArm);
    boneStructure.push(rightUpperArm);
    
    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForearm';
    rightForearm.position.set(-0.25, 0, 0);
    rightUpperArm.add(rightForearm);
    boneStructure.push(rightForearm);
    
    const rightHand = new THREE.Bone();
    rightHand.name = 'RightHand';
    rightHand.position.set(-0.15, 0, 0);
    rightForearm.add(rightHand);
    boneStructure.push(rightHand);
    
    // Left Leg
    const leftHip = new THREE.Bone();
    leftHip.name = 'LeftHip';
    leftHip.position.set(0.1, 0, 0);
    hips.add(leftHip);
    boneStructure.push(leftHip);
    
    const leftThigh = new THREE.Bone();
    leftThigh.name = 'LeftThigh';
    leftThigh.position.set(0, -0.4, 0);
    leftHip.add(leftThigh);
    boneStructure.push(leftThigh);
    
    const leftShin = new THREE.Bone();
    leftShin.name = 'LeftShin';
    leftShin.position.set(0, -0.35, 0);
    leftThigh.add(leftShin);
    boneStructure.push(leftShin);
    
    const leftFoot = new THREE.Bone();
    leftFoot.name = 'LeftFoot';
    leftFoot.position.set(0, -0.1, 0.1);
    leftShin.add(leftFoot);
    boneStructure.push(leftFoot);
    
    // Right Leg
    const rightHip = new THREE.Bone();
    rightHip.name = 'RightHip';
    rightHip.position.set(-0.1, 0, 0);
    hips.add(rightHip);
    boneStructure.push(rightHip);
    
    const rightThigh = new THREE.Bone();
    rightThigh.name = 'RightThigh';
    rightThigh.position.set(0, -0.4, 0);
    rightHip.add(rightThigh);
    boneStructure.push(rightThigh);
    
    const rightShin = new THREE.Bone();
    rightShin.name = 'RightShin';
    rightShin.position.set(0, -0.35, 0);
    rightThigh.add(rightShin);
    boneStructure.push(rightShin);
    
    const rightFoot = new THREE.Bone();
    rightFoot.name = 'RightFoot';
    rightFoot.position.set(0, -0.1, 0.1);
    rightShin.add(rightFoot);
    boneStructure.push(rightFoot);
    
    return boneStructure;
  }, []);
  
  // Create skeleton from bones
  const skeleton = useMemo(() => {
    return new THREE.Skeleton(bones);
  }, [bones]);
  
  // Create skeleton helper for visualization
  const skeletonHelper = useMemo(() => {
    const helper = new THREE.SkeletonHelper(bones[0]);
    if (helper.material instanceof THREE.LineBasicMaterial) {
      helper.material.linewidth = 3;
    }
    return helper;
  }, [bones]);
  
  // Animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });
  
  return (
    <group ref={groupRef}>
      <primitive object={bones[0]} />
      <primitive object={skeletonHelper} />
      
      {/* Add body mesh */}
      <mesh>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 8]} />
        <meshPhongMaterial 
          color={0xe8d5c4} 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Add head */}
      <Sphere args={[0.15]} position={[0, 1.8, 0]}>
        <meshPhongMaterial color={0xe8d5c4} />
      </Sphere>
      
      {/* Add pain indicators if present */}
      {patientData?.painAreas?.map((area: string, index: number) => {
        let position = [0, 0, 0];
        if (area.toLowerCase().includes('shoulder')) {
          position = [0.3, 1.5, 0];
        } else if (area.toLowerCase().includes('knee')) {
          position = [0.15, 0.4, 0];
        } else if (area.toLowerCase().includes('back')) {
          position = [0, 1, -0.1];
        } else if (area.toLowerCase().includes('hip')) {
          position = [0.1, 0.8, 0];
        }
        
        return (
          <Sphere key={index} args={[0.05]} position={position as [number, number, number]}>
            <meshBasicMaterial color={0xff0000} transparent opacity={0.7} />
          </Sphere>
        );
      })}
    </group>
  );
}

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-green-500">Loading 3D Model...</div>
    </div>
  );
}

// Main component
export default function WorkingMixamoSkeleton({
  patientData,
  className = '',
  showControls = true
}: WorkingMixamoSkeletonProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1a1a1a' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />
          
          <SkeletonModel patientData={patientData} />
          
          {showControls && (
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={10}
              target={[0, 1, 0]}
            />
          )}
          
          <gridHelper args={[10, 10, 0x444444, 0x222222]} />
        </Suspense>
      </Canvas>
    </div>
  );
}