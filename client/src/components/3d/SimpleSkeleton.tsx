import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface SimpleSkeletonProps {
  patientData?: any;
  className?: string;
  showControls?: boolean;
}

// Simple bone visualization using lines
function BoneStructure() {
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Create bone structure using lines
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    
    // Define skeleton points
    const points = {
      // Head and spine
      head: new THREE.Vector3(0, 1.7, 0),
      neck: new THREE.Vector3(0, 1.5, 0),
      chest: new THREE.Vector3(0, 1.2, 0),
      spine: new THREE.Vector3(0, 0.9, 0),
      hips: new THREE.Vector3(0, 0.8, 0),
      
      // Arms
      leftShoulder: new THREE.Vector3(0.2, 1.4, 0),
      leftElbow: new THREE.Vector3(0.4, 1.1, 0),
      leftHand: new THREE.Vector3(0.5, 0.8, 0),
      rightShoulder: new THREE.Vector3(-0.2, 1.4, 0),
      rightElbow: new THREE.Vector3(-0.4, 1.1, 0),
      rightHand: new THREE.Vector3(-0.5, 0.8, 0),
      
      // Legs
      leftHip: new THREE.Vector3(0.1, 0.8, 0),
      leftKnee: new THREE.Vector3(0.15, 0.4, 0),
      leftFoot: new THREE.Vector3(0.15, 0, 0),
      rightHip: new THREE.Vector3(-0.1, 0.8, 0),
      rightKnee: new THREE.Vector3(-0.15, 0.4, 0),
      rightFoot: new THREE.Vector3(-0.15, 0, 0),
    };
    
    // Create lines for bones
    const lines: THREE.Line[] = [];
    
    // Spine
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.head, points.neck]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.neck, points.chest]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.chest, points.spine]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.spine, points.hips]),
      material
    ));
    
    // Left arm
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.chest, points.leftShoulder]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.leftShoulder, points.leftElbow]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.leftElbow, points.leftHand]),
      material
    ));
    
    // Right arm
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.chest, points.rightShoulder]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.rightShoulder, points.rightElbow]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.rightElbow, points.rightHand]),
      material
    ));
    
    // Left leg
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.hips, points.leftHip]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.leftHip, points.leftKnee]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.leftKnee, points.leftFoot]),
      material
    ));
    
    // Right leg
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.hips, points.rightHip]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.rightHip, points.rightKnee]),
      material
    ));
    lines.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([points.rightKnee, points.rightFoot]),
      material
    ));
    
    // Add all lines to group
    lines.forEach(line => {
      groupRef.current?.add(line);
    });
    
    // Add joint spheres
    const sphereGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    Object.values(points).forEach(point => {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(point);
      groupRef.current?.add(sphere);
    });
    
    // Cleanup function
    return () => {
      while (groupRef.current && groupRef.current.children.length > 0) {
        const child = groupRef.current.children[0];
        groupRef.current.remove(child);
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
    };
  }, []);
  
  // Rotation animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });
  
  return <group ref={groupRef} />;
}

export default function SimpleSkeleton({
  patientData,
  className = '',
  showControls = true
}: SimpleSkeletonProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        style={{ background: '#1a1a1a', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <BoneStructure />
        
        {showControls && (
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        )}
        
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
}