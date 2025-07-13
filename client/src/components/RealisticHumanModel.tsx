import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface RealisticHumanModelProps {
  animationFrames?: Array<{
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
  }>;
  isPlaying?: boolean;
  currentFrame?: number;
  onFrameChange?: (frame: number) => void;
  className?: string;
}

const RealisticHumanModel: React.FC<RealisticHumanModelProps> = ({
  animationFrames = [],
  isPlaying = false,
  currentFrame = 0,
  onFrameChange,
  className = ""
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const humanModelRef = useRef<THREE.Group>();
  const animationRef = useRef<number>();

  // Create realistic human body geometry
  const createHumanBody = () => {
    const humanGroup = new THREE.Group();

    // Body parts with realistic proportions
    const bodyParts = {
      // Head
      head: {
        geometry: new THREE.SphereGeometry(0.12, 12, 8),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [0, 1.65, 0]
      },
      
      // Torso
      chest: {
        geometry: new THREE.BoxGeometry(0.35, 0.4, 0.2),
        material: new THREE.MeshLambertMaterial({ color: 0x4a90e2 }),
        position: [0, 1.2, 0]
      },
      
      // Arms
      leftUpperArm: {
        geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.3),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [-0.25, 1.05, 0]
      },
      rightUpperArm: {
        geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.3),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [0.25, 1.05, 0]
      },
      
      leftForearm: {
        geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.25),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [-0.25, 0.75, 0]
      },
      rightForearm: {
        geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.25),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [0.25, 0.75, 0]
      },
      
      // Hands
      leftHand: {
        geometry: new THREE.SphereGeometry(0.05, 8, 6),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [-0.25, 0.55, 0]
      },
      rightHand: {
        geometry: new THREE.SphereGeometry(0.05, 8, 6),
        material: new THREE.MeshLambertMaterial({ color: 0xffdbac }),
        position: [0.25, 0.55, 0]
      },
      
      // Pelvis
      pelvis: {
        geometry: new THREE.BoxGeometry(0.3, 0.15, 0.2),
        material: new THREE.MeshLambertMaterial({ color: 0x4a90e2 }),
        position: [0, 0.85, 0]
      },
      
      // Legs
      leftThigh: {
        geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.4),
        material: new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
        position: [-0.1, 0.5, 0]
      },
      rightThigh: {
        geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.4),
        material: new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
        position: [0.1, 0.5, 0]
      },
      
      leftShin: {
        geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.35),
        material: new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
        position: [-0.1, 0.15, 0]
      },
      rightShin: {
        geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.35),
        material: new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
        position: [0.1, 0.15, 0]
      },
      
      // Feet
      leftFoot: {
        geometry: new THREE.BoxGeometry(0.08, 0.04, 0.2),
        material: new THREE.MeshLambertMaterial({ color: 0x34495e }),
        position: [-0.1, 0.02, 0.05]
      },
      rightFoot: {
        geometry: new THREE.BoxGeometry(0.08, 0.04, 0.2),
        material: new THREE.MeshLambertMaterial({ color: 0x34495e }),
        position: [0.1, 0.02, 0.05]
      }
    };

    // Create and add body parts to group
    Object.entries(bodyParts).forEach(([name, part]) => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.position.set(...part.position);
      mesh.name = name;
      humanGroup.add(mesh);
    });

    // Add joints as small spheres for articulation points
    const jointPositions = [
      { name: 'leftShoulder', pos: [-0.175, 1.35, 0] },
      { name: 'rightShoulder', pos: [0.175, 1.35, 0] },
      { name: 'leftElbow', pos: [-0.25, 0.9, 0] },
      { name: 'rightElbow', pos: [0.25, 0.9, 0] },
      { name: 'leftWrist', pos: [-0.25, 0.6, 0] },
      { name: 'rightWrist', pos: [0.25, 0.6, 0] },
      { name: 'leftHip', pos: [-0.1, 0.78, 0] },
      { name: 'rightHip', pos: [0.1, 0.78, 0] },
      { name: 'leftKnee', pos: [-0.1, 0.3, 0] },
      { name: 'rightKnee', pos: [0.1, 0.3, 0] },
      { name: 'leftAnkle', pos: [-0.1, 0.02, 0] },
      { name: 'rightAnkle', pos: [0.1, 0.02, 0] }
    ];

    jointPositions.forEach(joint => {
      const jointGeometry = new THREE.SphereGeometry(0.02, 8, 6);
      const jointMaterial = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
      const jointMesh = new THREE.Mesh(jointGeometry, jointMaterial);
      jointMesh.position.set(...joint.pos);
      jointMesh.name = joint.name;
      humanGroup.add(jointMesh);
    });

    return humanGroup;
  };

  // Apply animation frame to human model
  const applyAnimationFrame = (frameIndex: number) => {
    if (!animationFrames.length || !humanModelRef.current) return;
    
    const frame = animationFrames[frameIndex % animationFrames.length];
    if (!frame || !frame.landmarks) {
      console.log('Invalid frame or landmarks:', { frame, frameIndex });
      return;
    }

    // Map pose landmarks to body parts with movement restrictions
    const landmarks = frame.landmarks;
    console.log('Applying animation frame:', frameIndex, 'landmarks count:', landmarks.length);
    
    // Apply comprehensive kinematic chain movement patterns
    humanModelRef.current.children.forEach((child) => {
      const childName = child.name;
      
      // Enhanced coordinated movement patterns
      
      // Hip movement coordination
      if (childName === 'hip' && landmarks[23] && landmarks[24]) {
        const hipCenter = {
          x: (landmarks[23].x + landmarks[24].x) / 2,
          y: (landmarks[23].y + landmarks[24].y) / 2,
          z: (landmarks[23].z + landmarks[24].z) / 2
        };
        child.position.set(hipCenter.x, hipCenter.y, hipCenter.z);
        child.rotation.x = hipCenter.y * 0.3; // Hip flexion
      }
      
      // Coordinated thigh movement with hip
      if (childName === 'leftThigh' && landmarks[23] && landmarks[25]) {
        child.position.set(landmarks[23].x, landmarks[23].y, landmarks[23].z);
        // Calculate thigh rotation based on hip-to-knee vector
        const thighAngle = Math.atan2(landmarks[25].y - landmarks[23].y, landmarks[25].z - landmarks[23].z);
        child.rotation.x = thighAngle;
        child.rotation.z = landmarks[23].x * 0.2; // Hip abduction
      }
      
      if (childName === 'rightThigh' && landmarks[24] && landmarks[26]) {
        child.position.set(landmarks[24].x, landmarks[24].y, landmarks[24].z);
        const thighAngle = Math.atan2(landmarks[26].y - landmarks[24].y, landmarks[26].z - landmarks[24].z);
        child.rotation.x = thighAngle;
        child.rotation.z = landmarks[24].x * 0.2;
      }
      
      // Coordinated knee/shin movement
      if (childName === 'leftShin' && landmarks[25] && landmarks[27]) {
        child.position.set(landmarks[25].x, landmarks[25].y, landmarks[25].z);
        const shinAngle = Math.atan2(landmarks[27].y - landmarks[25].y, landmarks[27].z - landmarks[25].z);
        child.rotation.x = shinAngle;
      }
      
      if (childName === 'rightShin' && landmarks[26] && landmarks[28]) {
        child.position.set(landmarks[26].x, landmarks[26].y, landmarks[26].z);
        const shinAngle = Math.atan2(landmarks[28].y - landmarks[26].y, landmarks[28].z - landmarks[26].z);
        child.rotation.x = shinAngle;
      }
      
      // Coordinated shoulder and arm movement
      if (childName === 'leftUpperArm' && landmarks[11] && landmarks[13]) {
        child.position.set(landmarks[11].x, landmarks[11].y, landmarks[11].z);
        const armAngle = Math.atan2(landmarks[13].y - landmarks[11].y, landmarks[13].x - landmarks[11].x);
        child.rotation.z = armAngle;
        child.rotation.y = landmarks[11].z * 0.3; // Arm internal/external rotation
      }
      
      if (childName === 'rightUpperArm' && landmarks[12] && landmarks[14]) {
        child.position.set(landmarks[12].x, landmarks[12].y, landmarks[12].z);
        const armAngle = Math.atan2(landmarks[14].y - landmarks[12].y, landmarks[14].x - landmarks[12].x);
        child.rotation.z = armAngle;
        child.rotation.y = landmarks[12].z * 0.3;
      }
      
      // Coordinated forearm movement
      if (childName === 'leftForearm' && landmarks[13] && landmarks[15]) {
        child.position.set(landmarks[13].x, landmarks[13].y, landmarks[13].z);
        const forearmAngle = Math.atan2(landmarks[15].y - landmarks[13].y, landmarks[15].x - landmarks[13].x);
        child.rotation.z = forearmAngle;
      }
      
      if (childName === 'rightForearm' && landmarks[14] && landmarks[16]) {
        child.position.set(landmarks[14].x, landmarks[14].y, landmarks[14].z);
        const forearmAngle = Math.atan2(landmarks[16].y - landmarks[14].y, landmarks[16].x - landmarks[14].x);
        child.rotation.z = forearmAngle;
      }
      
      // Coordinated torso movement
      if (childName === 'chest' && landmarks[11] && landmarks[12]) {
        const chestCenter = {
          x: (landmarks[11].x + landmarks[12].x) / 2,
          y: (landmarks[11].y + landmarks[12].y) / 2,
          z: (landmarks[11].z + landmarks[12].z) / 2
        };
        child.position.set(chestCenter.x, chestCenter.y, chestCenter.z);
        child.rotation.y = (landmarks[12].x - landmarks[11].x) * 0.3; // Torso rotation
        child.rotation.x = chestCenter.z * 0.2; // Forward/backward lean
      }
      
      // Coordinated head movement
      if (childName === 'head' && landmarks[0]) {
        child.position.set(landmarks[0].x, landmarks[0].y, landmarks[0].z);
        child.rotation.y = landmarks[0].x * 0.2; // Head rotation
        child.rotation.x = landmarks[0].z * 0.2; // Head tilt
      }
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create and add human model
    const humanModel = createHumanBody();
    humanModel.position.set(0, 0, 0);
    humanModelRef.current = humanModel;
    scene.add(humanModel);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(5, 5);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.1;
    plane.receiveShadow = true;
    scene.add(plane);

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (isPlaying && animationFrames.length > 0) {
        applyAnimationFrame(currentFrame);
      }
      
      // Gentle rotation for better viewing (only when not playing animation)
      if (humanModelRef.current && !isPlaying) {
        humanModelRef.current.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update animation when frames or playing state changes
  useEffect(() => {
    if (animationFrames.length > 0) {
      applyAnimationFrame(currentFrame);
    }
  }, [currentFrame, animationFrames]);

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full min-h-[400px] bg-gradient-to-b from-blue-50 to-gray-100 rounded-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

export default RealisticHumanModel;