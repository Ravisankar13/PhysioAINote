import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';

interface BasicMixamoSkeletonProps {
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

// Simple skeleton visualization component
function SkeletonMesh({ patientData }: { patientData: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const bonesRef = useRef<THREE.Bone[]>([]);
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Clear existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    // Create a simple skeleton structure
    const bones: THREE.Bone[] = [];
    
    // Root bone (hips)
    const hips = new THREE.Bone();
    hips.position.set(0, 1, 0);
    bones.push(hips);
    
    // Spine
    const spine = new THREE.Bone();
    spine.position.set(0, 0.3, 0);
    hips.add(spine);
    bones.push(spine);
    
    // Chest
    const chest = new THREE.Bone();
    chest.position.set(0, 0.4, 0);
    spine.add(chest);
    bones.push(chest);
    
    // Head
    const neck = new THREE.Bone();
    neck.position.set(0, 0.3, 0);
    chest.add(neck);
    bones.push(neck);
    
    const head = new THREE.Bone();
    head.position.set(0, 0.2, 0);
    neck.add(head);
    bones.push(head);
    
    // Left arm
    const leftShoulder = new THREE.Bone();
    leftShoulder.position.set(0.2, 0.2, 0);
    chest.add(leftShoulder);
    bones.push(leftShoulder);
    
    const leftUpperArm = new THREE.Bone();
    leftUpperArm.position.set(0.3, 0, 0);
    leftShoulder.add(leftUpperArm);
    bones.push(leftUpperArm);
    
    const leftForearm = new THREE.Bone();
    leftForearm.position.set(0.25, 0, 0);
    leftUpperArm.add(leftForearm);
    bones.push(leftForearm);
    
    const leftHand = new THREE.Bone();
    leftHand.position.set(0.15, 0, 0);
    leftForearm.add(leftHand);
    bones.push(leftHand);
    
    // Right arm
    const rightShoulder = new THREE.Bone();
    rightShoulder.position.set(-0.2, 0.2, 0);
    chest.add(rightShoulder);
    bones.push(rightShoulder);
    
    const rightUpperArm = new THREE.Bone();
    rightUpperArm.position.set(-0.3, 0, 0);
    rightShoulder.add(rightUpperArm);
    bones.push(rightUpperArm);
    
    const rightForearm = new THREE.Bone();
    rightForearm.position.set(-0.25, 0, 0);
    rightUpperArm.add(rightForearm);
    bones.push(rightForearm);
    
    const rightHand = new THREE.Bone();
    rightHand.position.set(-0.15, 0, 0);
    rightForearm.add(rightHand);
    bones.push(rightHand);
    
    // Left leg
    const leftThigh = new THREE.Bone();
    leftThigh.position.set(0.1, -0.1, 0);
    hips.add(leftThigh);
    bones.push(leftThigh);
    
    const leftShin = new THREE.Bone();
    leftShin.position.set(0, -0.4, 0);
    leftThigh.add(leftShin);
    bones.push(leftShin);
    
    const leftFoot = new THREE.Bone();
    leftFoot.position.set(0, -0.35, 0.1);
    leftShin.add(leftFoot);
    bones.push(leftFoot);
    
    // Right leg
    const rightThigh = new THREE.Bone();
    rightThigh.position.set(-0.1, -0.1, 0);
    hips.add(rightThigh);
    bones.push(rightThigh);
    
    const rightShin = new THREE.Bone();
    rightShin.position.set(0, -0.4, 0);
    rightThigh.add(rightShin);
    bones.push(rightShin);
    
    const rightFoot = new THREE.Bone();
    rightFoot.position.set(0, -0.35, 0.1);
    rightShin.add(rightFoot);
    bones.push(rightFoot);
    
    // Create skeleton
    const skeleton = new THREE.Skeleton(bones);
    
    // Create a simple mesh for the body
    const geometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xe8d5c4,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.bind(skeleton);
    
    // Create bone helper for visualization
    const helper = new THREE.SkeletonHelper(hips);
    helper.material.linewidth = 2;
    
    // Add to group
    groupRef.current.add(hips);
    groupRef.current.add(mesh);
    groupRef.current.add(helper);
    
    bonesRef.current = bones;
    
    // Apply pathology modifications if provided
    if (patientData?.jointRestrictions?.shoulder?.flexion) {
      const maxFlexion = (patientData.jointRestrictions.shoulder.flexion / 180) * Math.PI;
      leftUpperArm.rotation.z = Math.min(leftUpperArm.rotation.z, maxFlexion);
      rightUpperArm.rotation.z = Math.min(rightUpperArm.rotation.z, maxFlexion);
    }
    
    // Add pain indicators
    if (patientData?.painAreas && patientData.painAreas.length > 0) {
      patientData.painAreas.forEach((area: string) => {
        let targetBone: THREE.Bone | null = null;
        
        if (area.toLowerCase().includes('shoulder')) {
          targetBone = leftShoulder;
        } else if (area.toLowerCase().includes('knee')) {
          targetBone = leftShin;
        } else if (area.toLowerCase().includes('hip')) {
          targetBone = leftThigh;
        } else if (area.toLowerCase().includes('back')) {
          targetBone = spine;
        }
        
        if (targetBone) {
          const painIndicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({ 
              color: 0xff0000,
              transparent: true,
              opacity: 0.6
            })
          );
          targetBone.add(painIndicator);
        }
      });
    }
  }, [patientData]);
  
  // Simple rotation animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  return <group ref={groupRef} />;
}

// Main component
export default function BasicMixamoSkeleton({
  patientData,
  className = '',
  showControls = true
}: BasicMixamoSkeletonProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [3, 3, 3], fov: 50 }}
        style={{ background: '#1a1a1a' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          <SkeletonMesh patientData={patientData} />
          
          {showControls && <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />}
          
          <Grid 
            args={[20, 20]} 
            cellSize={1} 
            cellThickness={0.5} 
            cellColor="#444444" 
            sectionSize={5} 
            sectionThickness={1}
            sectionColor="#888888"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}