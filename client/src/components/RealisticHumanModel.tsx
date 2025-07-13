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

  // Set neutral standing position for human model
  const setNeutralStandingPose = (humanModel: THREE.Group) => {
    humanModel.children.forEach((child) => {
      const childName = child.name;
      
      // Reset to neutral standing positions using exact body part names from createHumanBody
      if (childName === 'head') {
        child.position.set(0, 1.65, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'chest') {
        child.position.set(0, 1.2, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftUpperArm') {
        child.position.set(-0.25, 1.05, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightUpperArm') {
        child.position.set(0.25, 1.05, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftForearm') {
        child.position.set(-0.25, 0.75, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightForearm') {
        child.position.set(0.25, 0.75, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftHand') {
        child.position.set(-0.25, 0.55, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightHand') {
        child.position.set(0.25, 0.55, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'pelvis') {
        child.position.set(0, 0.85, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftThigh') {
        child.position.set(-0.1, 0.5, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightThigh') {
        child.position.set(0.1, 0.5, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftShin') {
        child.position.set(-0.1, 0.15, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightShin') {
        child.position.set(0.1, 0.15, 0);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'leftFoot') {
        child.position.set(-0.1, 0.02, 0.05);
        child.rotation.set(0, 0, 0);
      } else if (childName === 'rightFoot') {
        child.position.set(0.1, 0.02, 0.05);
        child.rotation.set(0, 0, 0);
      }
    });
  };

  // Apply animation frame to human model with proper coordinate mapping
  const applyAnimationFrame = (frameIndex: number) => {
    if (!animationFrames.length || !humanModelRef.current) return;
    
    const frame = animationFrames[frameIndex % animationFrames.length];
    if (!frame || !frame.landmarks) return;

    const landmarks = frame.landmarks;
    
    // Apply animation while maintaining proper body structure
    humanModelRef.current.children.forEach((child) => {
      const childName = child.name;
      
      // Only apply selective movements that maintain proper body structure
      if (childName === 'head' && landmarks[0]) {
        child.position.set(landmarks[0].x, landmarks[0].y, landmarks[0].z);
      }
      
      if (childName === 'chest' && landmarks[11] && landmarks[12]) {
        const chestCenter = {
          x: (landmarks[11].x + landmarks[12].x) / 2,
          y: (landmarks[11].y + landmarks[12].y) / 2 - 0.15,
          z: (landmarks[11].z + landmarks[12].z) / 2
        };
        child.position.set(chestCenter.x, chestCenter.y, chestCenter.z);
      }
      
      if (childName === 'pelvis' && landmarks[23] && landmarks[24]) {
        const pelvisCenter = {
          x: (landmarks[23].x + landmarks[24].x) / 2,
          y: (landmarks[23].y + landmarks[24].y) / 2 + 0.07,
          z: (landmarks[23].z + landmarks[24].z) / 2
        };
        child.position.set(pelvisCenter.x, pelvisCenter.y, pelvisCenter.z);
      }
      
      // Arms - use center points for stability
      if (childName === 'leftUpperArm' && landmarks[11] && landmarks[13]) {
        const armCenter = {
          x: (landmarks[11].x + landmarks[13].x) / 2,
          y: (landmarks[11].y + landmarks[13].y) / 2,
          z: (landmarks[11].z + landmarks[13].z) / 2
        };
        child.position.set(armCenter.x, armCenter.y, armCenter.z);
      }
      
      if (childName === 'rightUpperArm' && landmarks[12] && landmarks[14]) {
        const armCenter = {
          x: (landmarks[12].x + landmarks[14].x) / 2,
          y: (landmarks[12].y + landmarks[14].y) / 2,
          z: (landmarks[12].z + landmarks[14].z) / 2
        };
        child.position.set(armCenter.x, armCenter.y, armCenter.z);
      }
      
      if (childName === 'leftForearm' && landmarks[13] && landmarks[15]) {
        const forearmCenter = {
          x: (landmarks[13].x + landmarks[15].x) / 2,
          y: (landmarks[13].y + landmarks[15].y) / 2,
          z: (landmarks[13].z + landmarks[15].z) / 2
        };
        child.position.set(forearmCenter.x, forearmCenter.y, forearmCenter.z);
      }
      
      if (childName === 'rightForearm' && landmarks[14] && landmarks[16]) {
        const forearmCenter = {
          x: (landmarks[14].x + landmarks[16].x) / 2,
          y: (landmarks[14].y + landmarks[16].y) / 2,
          z: (landmarks[14].z + landmarks[16].z) / 2
        };
        child.position.set(forearmCenter.x, forearmCenter.y, forearmCenter.z);
      }
      
      if (childName === 'leftHand' && landmarks[15]) {
        child.position.set(landmarks[15].x, landmarks[15].y, landmarks[15].z);
      }
      
      if (childName === 'rightHand' && landmarks[16]) {
        child.position.set(landmarks[16].x, landmarks[16].y, landmarks[16].z);
      }
      
      // Legs - use center points for stability  
      if (childName === 'leftThigh' && landmarks[23] && landmarks[25]) {
        const thighCenter = {
          x: (landmarks[23].x + landmarks[25].x) / 2,
          y: (landmarks[23].y + landmarks[25].y) / 2,
          z: (landmarks[23].z + landmarks[25].z) / 2
        };
        child.position.set(thighCenter.x, thighCenter.y, thighCenter.z);
      }
      
      if (childName === 'rightThigh' && landmarks[24] && landmarks[26]) {
        const thighCenter = {
          x: (landmarks[24].x + landmarks[26].x) / 2,
          y: (landmarks[24].y + landmarks[26].y) / 2,
          z: (landmarks[24].z + landmarks[26].z) / 2
        };
        child.position.set(thighCenter.x, thighCenter.y, thighCenter.z);
      }
      
      if (childName === 'leftShin' && landmarks[25] && landmarks[27]) {
        const shinCenter = {
          x: (landmarks[25].x + landmarks[27].x) / 2,
          y: (landmarks[25].y + landmarks[27].y) / 2,
          z: (landmarks[25].z + landmarks[27].z) / 2
        };
        child.position.set(shinCenter.x, shinCenter.y, shinCenter.z);
      }
      
      if (childName === 'rightShin' && landmarks[26] && landmarks[28]) {
        const shinCenter = {
          x: (landmarks[26].x + landmarks[28].x) / 2,
          y: (landmarks[26].y + landmarks[28].y) / 2,
          z: (landmarks[26].z + landmarks[28].z) / 2
        };
        child.position.set(shinCenter.x, shinCenter.y, shinCenter.z);
      }
      
      if (childName === 'leftFoot' && landmarks[27]) {
        child.position.set(landmarks[27].x, landmarks[27].y, landmarks[27].z + 0.05);
      }
      
      if (childName === 'rightFoot' && landmarks[28]) {
        child.position.set(landmarks[28].x, landmarks[28].y, landmarks[28].z + 0.05);
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

    // Set initial neutral standing position
    setNeutralStandingPose(humanModel);
    
    console.log('Human model created with neutral pose:', humanModel.children.map(child => ({ name: child.name, position: child.position })));

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
    if (animationFrames.length > 0 && humanModelRef.current && isPlaying) {
      applyAnimationFrame(currentFrame);
    } else if (humanModelRef.current && !isPlaying && animationFrames.length === 0) {
      // Reset to neutral pose when not playing and no animation loaded
      console.log('Resetting to neutral pose');
      setNeutralStandingPose(humanModelRef.current);
    }
  }, [currentFrame, animationFrames, isPlaying]);

  // Set initial neutral pose when component first loads
  useEffect(() => {
    if (humanModelRef.current && animationFrames.length === 0) {
      console.log('Setting initial neutral pose on mount');
      setNeutralStandingPose(humanModelRef.current);
    }
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full min-h-[400px] bg-gradient-to-b from-blue-50 to-gray-100 rounded-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

export default RealisticHumanModel;