import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Text3DAnimationProps {
  clinicalText: string;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
}

interface AnimationKeyframe {
  time: number;
  joints: {
    [key: string]: {
      position: [number, number, number];
      rotation: [number, number, number];
    };
  };
}

export default function Text3DAnimation({ clinicalText, isPlaying, onTimeUpdate }: Text3DAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationRef = useRef<number>();
  const skeletonRef = useRef<THREE.Group>();
  const [animationData, setAnimationData] = useState<AnimationKeyframe[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 1, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create 3D skeleton
    createSkeleton(scene);

    // Render loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Always update animation if data is available and playing
      if (animationData.length > 0) {
        updateAnimation();
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Generate animation from clinical text and auto-play
  useEffect(() => {
    if (clinicalText) {
      generateAnimationFromText(clinicalText);
      // Auto-start animation when text changes
      setTimeout(() => {
        setCurrentTime(0);
      }, 100);
    }
  }, [clinicalText]);

  const createSkeleton = (scene: THREE.Scene) => {
    const skeleton = new THREE.Group();
    skeletonRef.current = skeleton;

    // Bone material
    const boneMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xF5DEB3,
      shininess: 30
    });

    // Joint material
    const jointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xe74c3c,
      shininess: 50
    });

    // Create main body structure
    const torso = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8);
    const torsoMesh = new THREE.Mesh(torso, boneMaterial);
    torsoMesh.position.y = 1.2;
    torsoMesh.name = 'torso';
    skeleton.add(torsoMesh);

    // Head
    const head = new THREE.SphereGeometry(0.2, 16, 16);
    const headMesh = new THREE.Mesh(head, boneMaterial);
    headMesh.position.y = 2.1;
    headMesh.name = 'head';
    skeleton.add(headMesh);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
    
    // Left upper arm
    const leftUpperArm = new THREE.Mesh(armGeometry, boneMaterial);
    leftUpperArm.position.set(-0.4, 1.5, 0);
    leftUpperArm.rotation.z = Math.PI / 6;
    leftUpperArm.name = 'leftUpperArm';
    skeleton.add(leftUpperArm);

    // Left forearm
    const leftForearm = new THREE.Mesh(armGeometry, boneMaterial);
    leftForearm.position.set(-0.7, 1.0, 0);
    leftForearm.rotation.z = Math.PI / 4;
    leftForearm.name = 'leftForearm';
    skeleton.add(leftForearm);

    // Right upper arm
    const rightUpperArm = new THREE.Mesh(armGeometry, boneMaterial);
    rightUpperArm.position.set(0.4, 1.5, 0);
    rightUpperArm.rotation.z = -Math.PI / 6;
    rightUpperArm.name = 'rightUpperArm';
    skeleton.add(rightUpperArm);

    // Right forearm
    const rightForearm = new THREE.Mesh(armGeometry, boneMaterial);
    rightForearm.position.set(0.7, 1.0, 0);
    rightForearm.rotation.z = -Math.PI / 4;
    rightForearm.name = 'rightForearm';
    skeleton.add(rightForearm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    
    // Left thigh
    const leftThigh = new THREE.Mesh(legGeometry, boneMaterial);
    leftThigh.position.set(-0.15, 0.4, 0);
    leftThigh.name = 'leftThigh';
    skeleton.add(leftThigh);

    // Left shin
    const leftShin = new THREE.Mesh(legGeometry, boneMaterial);
    leftShin.position.set(-0.15, -0.4, 0);
    leftShin.name = 'leftShin';
    skeleton.add(leftShin);

    // Right thigh
    const rightThigh = new THREE.Mesh(legGeometry, boneMaterial);
    rightThigh.position.set(0.15, 0.4, 0);
    rightThigh.name = 'rightThigh';
    skeleton.add(rightThigh);

    // Right shin
    const rightShin = new THREE.Mesh(legGeometry, boneMaterial);
    rightShin.position.set(0.15, -0.4, 0);
    rightShin.name = 'rightShin';
    skeleton.add(rightShin);

    // Joints
    const jointGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    
    // Shoulder joints
    const leftShoulder = new THREE.Mesh(jointGeometry, jointMaterial);
    leftShoulder.position.set(-0.25, 1.7, 0);
    leftShoulder.name = 'leftShoulder';
    skeleton.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(jointGeometry, jointMaterial);
    rightShoulder.position.set(0.25, 1.7, 0);
    rightShoulder.name = 'rightShoulder';
    skeleton.add(rightShoulder);

    // Hip joints
    const leftHip = new THREE.Mesh(jointGeometry, jointMaterial);
    leftHip.position.set(-0.15, 0.8, 0);
    leftHip.name = 'leftHip';
    skeleton.add(leftHip);

    const rightHip = new THREE.Mesh(jointGeometry, jointMaterial);
    rightHip.position.set(0.15, 0.8, 0);
    rightHip.name = 'rightHip';
    skeleton.add(rightHip);

    // Knee joints
    const leftKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    leftKnee.position.set(-0.15, 0, 0);
    leftKnee.name = 'leftKnee';
    skeleton.add(leftKnee);

    const rightKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    rightKnee.position.set(0.15, 0, 0);
    rightKnee.name = 'rightKnee';
    skeleton.add(rightKnee);

    scene.add(skeleton);
  };

  const generateAnimationFromText = (text: string) => {
    const lowerText = text.toLowerCase();
    let animationFrames: AnimationKeyframe[] = [];

    // Analyze text for body parts and movement types
    const bodyParts = {
      shoulder: lowerText.includes('shoulder') || lowerText.includes('arm'),
      back: lowerText.includes('back') || lowerText.includes('spine'),
      knee: lowerText.includes('knee') || lowerText.includes('leg'),
      hip: lowerText.includes('hip'),
      neck: lowerText.includes('neck') || lowerText.includes('head'),
      ankle: lowerText.includes('ankle') || lowerText.includes('foot')
    };

    const limitations = {
      limited: lowerText.includes('limited') || lowerText.includes('restricted'),
      stiff: lowerText.includes('stiff') || lowerText.includes('tight'),
      pain: lowerText.includes('pain') || lowerText.includes('sore'),
      weak: lowerText.includes('weak') || lowerText.includes('instability')
    };

    // Generate animation based on analysis
    if (bodyParts.shoulder && limitations.limited) {
      animationFrames = generateShoulderLimitationAnimation();
    } else if (bodyParts.back && limitations.stiff) {
      animationFrames = generateBackStiffnessAnimation();
    } else if (bodyParts.knee && limitations.pain) {
      animationFrames = generateKneePainAnimation();
    } else if (bodyParts.hip) {
      animationFrames = generateHipMovementAnimation();
    } else {
      animationFrames = generateGeneralMovementAnimation();
    }

    setAnimationData(animationFrames);
  };

  const generateShoulderLimitationAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 6] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 6] },
          leftForearm: { position: [-0.7, 1.0, 0], rotation: [0, 0, Math.PI / 4] },
          rightForearm: { position: [0.7, 1.0, 0], rotation: [0, 0, -Math.PI / 4] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0.2] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, -0.2] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 3] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 5] },
          leftForearm: { position: [-0.7, 1.0, 0], rotation: [0, 0, Math.PI / 2] },
          rightForearm: { position: [0.7, 1.0, 0], rotation: [0, 0, -Math.PI / 6] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 2000,
        joints: {
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0.4] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, -0.1] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 2] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 8] },
          leftForearm: { position: [-0.7, 1.0, 0], rotation: [0, 0, Math.PI / 3] },
          rightForearm: { position: [0.7, 1.0, 0], rotation: [0, 0, -Math.PI / 8] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.2] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0.2] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, -0.2] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 3] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 5] },
          leftForearm: { position: [-0.7, 1.0, 0], rotation: [0, 0, Math.PI / 2] },
          rightForearm: { position: [0.7, 1.0, 0], rotation: [0, 0, -Math.PI / 6] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 4000,
        joints: {
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 6] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 6] },
          leftForearm: { position: [-0.7, 1.0, 0], rotation: [0, 0, Math.PI / 4] },
          rightForearm: { position: [0.7, 1.0, 0], rotation: [0, 0, -Math.PI / 4] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateBackStiffnessAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.3, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.2, 0, 0] },
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0.1, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0.1, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.1, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.1, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.05, 0, 0] },
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0.05, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0.05, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.05, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.05, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.2, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.15, 0, 0] },
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0.1, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0.1, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.1, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          leftShoulder: { position: [-0.25, 1.7, 0], rotation: [0, 0, 0] },
          rightShoulder: { position: [0.25, 1.7, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateKneePainAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [-0.6, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [-0.3, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0.3, 0, 0.1] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0.1, 0, -0.05] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0.3, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0.1, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 2000,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [-0.4, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [-0.6, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0.2, 0, 0.05] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0.3, 0, -0.1] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0.2, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0.3, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, -0.05] }
        }
      },
      {
        time: 3000,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [-0.2, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [-0.2, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0.1, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0.1, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0.1, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0.1, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateHipMovementAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0.3, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.3, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0.1, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateGeneralMovementAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 6] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 6] }
        }
      },
      {
        time: 1000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0.2, 0] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 3] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 3] }
        }
      },
      {
        time: 2000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftUpperArm: { position: [-0.4, 1.5, 0], rotation: [0, 0, Math.PI / 6] },
          rightUpperArm: { position: [0.4, 1.5, 0], rotation: [0, 0, -Math.PI / 6] }
        }
      }
    ];
  };

  const updateAnimation = () => {
    if (!skeletonRef.current || animationData.length === 0) return;

    // Increment time automatically for continuous animation
    const newTime = (currentTime + 16) % 4000; // 4 second loop
    setCurrentTime(newTime);
    onTimeUpdate?.(newTime / 1000);

    // Find current animation frame
    let currentFrame = animationData[0];
    let nextFrame = animationData[1] || animationData[0];

    for (let i = 0; i < animationData.length - 1; i++) {
      if (newTime >= animationData[i].time && newTime <= animationData[i + 1].time) {
        currentFrame = animationData[i];
        nextFrame = animationData[i + 1];
        break;
      }
    }

    // Calculate smooth interpolation factor
    const timeDiff = nextFrame.time - currentFrame.time;
    let t = timeDiff > 0 ? (newTime - currentFrame.time) / timeDiff : 0;
    
    // Apply easing for more natural movement
    t = t * t * (3.0 - 2.0 * t); // Smoothstep interpolation

    // Apply interpolated transformations to all joints
    Object.keys(currentFrame.joints).forEach(jointName => {
      const bone = skeletonRef.current!.getObjectByName(jointName);
      if (bone) {
        const currentJoint = currentFrame.joints[jointName];
        const nextJoint = nextFrame.joints[jointName] || currentJoint;

        // Smooth position interpolation
        bone.position.x = THREE.MathUtils.lerp(currentJoint.position[0], nextJoint.position[0], t);
        bone.position.y = THREE.MathUtils.lerp(currentJoint.position[1], nextJoint.position[1], t);
        bone.position.z = THREE.MathUtils.lerp(currentJoint.position[2], nextJoint.position[2], t);

        // Smooth rotation interpolation  
        bone.rotation.x = THREE.MathUtils.lerp(currentJoint.rotation[0], nextJoint.rotation[0], t);
        bone.rotation.y = THREE.MathUtils.lerp(currentJoint.rotation[1], nextJoint.rotation[1], t);
        bone.rotation.z = THREE.MathUtils.lerp(currentJoint.rotation[2], nextJoint.rotation[2], t);
      }
    });
  };

  return (
    <div className="relative">
      <div ref={mountRef} className="w-full h-[300px] bg-gray-50 rounded-lg overflow-hidden" />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        3D Clinical Animation
      </div>
      {animationData.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
          {Math.round((currentTime / 1000) * 10) / 10}s
        </div>
      )}
    </div>
  );
}