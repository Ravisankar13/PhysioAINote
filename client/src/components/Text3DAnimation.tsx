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

  // Generate animation from clinical text
  useEffect(() => {
    if (clinicalText) {
      generateAnimationFromText(clinicalText);
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

    // Create clavicles (collar bones) to connect shoulders to torso
    const clavicleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    
    const leftClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    leftClavicle.position.set(-0.13, 1.7, 0);
    leftClavicle.rotation.z = -Math.PI / 6;
    leftClavicle.name = 'leftClavicle';
    skeleton.add(leftClavicle);

    const rightClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    rightClavicle.position.set(0.13, 1.7, 0);
    rightClavicle.rotation.z = Math.PI / 6;
    rightClavicle.name = 'rightClavicle';
    skeleton.add(rightClavicle);

    // Arms - Create proper anatomical arm structure with better proportions
    const upperArmGeometry = new THREE.CylinderGeometry(0.05, 0.045, 0.5, 8);
    const forearmGeometry = new THREE.CylinderGeometry(0.045, 0.04, 0.45, 8);
    
    // Left arm group for hierarchical transformation
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.25, 1.65, 0);
    leftArmGroup.name = 'leftArmGroup';
    
    // Left upper arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    leftUpperArm.position.set(0, -0.25, 0);
    leftUpperArm.name = 'leftUpperArm';
    leftArmGroup.add(leftUpperArm);

    // Left forearm
    const leftForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    leftForearm.position.set(0, -0.7, 0);
    leftForearm.name = 'leftForearm';
    leftArmGroup.add(leftForearm);

    skeleton.add(leftArmGroup);

    // Right arm group for hierarchical transformation
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.25, 1.65, 0);
    rightArmGroup.name = 'rightArmGroup';
    
    // Right upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    rightUpperArm.position.set(0, -0.25, 0);
    rightUpperArm.name = 'rightUpperArm';
    rightArmGroup.add(rightUpperArm);

    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    rightForearm.position.set(0, -0.7, 0);
    rightForearm.name = 'rightForearm';
    rightArmGroup.add(rightForearm);

    skeleton.add(rightArmGroup);

    // Add hands
    const handGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    
    const leftHand = new THREE.Mesh(handGeometry, boneMaterial);
    leftHand.position.set(0, -0.95, 0);
    leftHand.name = 'leftHand';
    leftArmGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeometry, boneMaterial);
    rightHand.position.set(0, -0.95, 0);
    rightHand.name = 'rightHand';
    rightArmGroup.add(rightHand);

    // Add upper body connection bones for better visual connectivity
    const shoulderConnectorGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.08);
    const shoulderConnector = new THREE.Mesh(shoulderConnectorGeometry, boneMaterial);
    shoulderConnector.position.set(0, 1.65, 0);
    shoulderConnector.name = 'shoulderConnector';
    skeleton.add(shoulderConnector);

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
    
    // Shoulder joints - positioned at the connection point
    const leftShoulder = new THREE.Mesh(jointGeometry, jointMaterial);
    leftShoulder.position.set(0, 0, 0);
    leftShoulder.name = 'leftShoulder';
    leftArmGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(jointGeometry, jointMaterial);
    rightShoulder.position.set(0, 0, 0);
    rightShoulder.name = 'rightShoulder';
    rightArmGroup.add(rightShoulder);

    // Elbow joints - positioned between upper arm and forearm
    const leftElbow = new THREE.Mesh(jointGeometry, jointMaterial);
    leftElbow.position.set(0, -0.5, 0);
    leftElbow.name = 'leftElbow';
    leftArmGroup.add(leftElbow);

    const rightElbow = new THREE.Mesh(jointGeometry, jointMaterial);
    rightElbow.position.set(0, -0.5, 0);
    rightElbow.name = 'rightElbow';
    rightArmGroup.add(rightElbow);

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
    if (lowerText.includes('squat')) {
      animationFrames = generateSquatAnimation();
    } else if (lowerText.includes('lunge')) {
      animationFrames = generateLungeAnimation();
    } else if (lowerText.includes('arm raise')) {
      animationFrames = generateArmRaiseAnimation();
    } else if (lowerText.includes('hip abduction')) {
      animationFrames = generateHipAbductionAnimation();
    } else if (lowerText.includes('knee flexion')) {
      animationFrames = generateKneeFlexionAnimation();
    } else if (lowerText.includes('shoulder rotation')) {
      animationFrames = generateShoulderRotationAnimation();
    } else if (lowerText.includes('standing march') || lowerText.includes('march')) {
      animationFrames = generateStandingMarchAnimation();
    } else if (lowerText.includes('heel raise')) {
      animationFrames = generateHeelRaiseAnimation();
    } else if (bodyParts.shoulder && limitations.limited) {
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.8] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 2000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 1.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.05] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.2] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.8] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 4000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] },
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.3, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.1, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.1, 0, -0.2] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.1, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.1, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.05, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.05, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.05, 0, -0.2] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.05, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.05, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0.2, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0.15, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.1, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.1, 0, -0.2] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [-0.1, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [-0.1, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] },
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] }
        }
      },
      {
        time: 1000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0.2, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.5] }
        }
      },
      {
        time: 2000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] }
        }
      }
    ];
  };

  const generateSquatAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.2, 0, 0] }, // Arms forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.2, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] }
        }
      },
      {
        time: 1000,
        joints: {
          // Mid-squat position
          head: { position: [0, 1.5, 0.1], rotation: [0.1, 0, 0] },
          torso: { position: [0, 0.9, -0.1], rotation: [0.2, 0, 0] }, // Slight forward lean
          pelvis: { position: [0, 0.5, -0.2], rotation: [0.3, 0, 0] }, // Hips back
          leftThigh: { position: [-0.15, 0.2, -0.1], rotation: [-1.0, 0, 0] }, // Thigh horizontal
          rightThigh: { position: [0.15, 0.2, -0.1], rotation: [-1.0, 0, 0] },
          leftShin: { position: [-0.15, -0.2, 0.2], rotation: [1.3, 0, 0] }, // Shin angle
          rightShin: { position: [0.15, -0.2, 0.2], rotation: [1.3, 0, 0] },
          leftHip: { position: [-0.15, 0.5, -0.2], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.5, -0.2], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0.05], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0.05], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.35, 0.1], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          rightArmGroup: { position: [0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          leftClavicle: { position: [-0.13, 1.4, 0.1], rotation: [0.2, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.4, 0.1], rotation: [0.2, 0, 0.52] }
        }
      },
      {
        time: 2000,
        joints: {
          // Bottom position - parallel squat
          head: { position: [0, 1.2, 0.15], rotation: [0.1, 0, 0] },
          torso: { position: [0, 0.6, -0.15], rotation: [0.3, 0, 0] },
          pelvis: { position: [0, 0.2, -0.3], rotation: [0.4, 0, 0] }, // Hips at knee level
          leftThigh: { position: [-0.15, 0.0, -0.2], rotation: [-1.4, 0, 0] }, // Thigh past horizontal
          rightThigh: { position: [0.15, 0.0, -0.2], rotation: [-1.4, 0, 0] },
          leftShin: { position: [-0.15, -0.3, 0.3], rotation: [1.5, 0, 0] }, // Full knee bend
          rightShin: { position: [0.15, -0.3, 0.3], rotation: [1.5, 0, 0] },
          leftHip: { position: [-0.15, 0.2, -0.3], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.2, -0.3], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, -0.15, 0.05], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, -0.15, 0.05], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.05, 0.2], rotation: [0.3, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.05, 0.2], rotation: [-1.5, 0, 0] },
          rightArmGroup: { position: [0.25, 1.05, 0.2], rotation: [-1.5, 0, 0] },
          leftClavicle: { position: [-0.13, 1.1, 0.2], rotation: [0.3, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.1, 0.2], rotation: [0.3, 0, 0.52] }
        }
      },
      {
        time: 3000,
        joints: {
          // Mid-return position
          head: { position: [0, 1.5, 0.1], rotation: [0.1, 0, 0] },
          torso: { position: [0, 0.9, -0.1], rotation: [0.2, 0, 0] },
          pelvis: { position: [0, 0.5, -0.2], rotation: [0.3, 0, 0] },
          leftThigh: { position: [-0.15, 0.2, -0.1], rotation: [-1.0, 0, 0] },
          rightThigh: { position: [0.15, 0.2, -0.1], rotation: [-1.0, 0, 0] },
          leftShin: { position: [-0.15, -0.2, 0.2], rotation: [1.3, 0, 0] },
          rightShin: { position: [0.15, -0.2, 0.2], rotation: [1.3, 0, 0] },
          leftHip: { position: [-0.15, 0.5, -0.2], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.5, -0.2], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0.05], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0.05], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.35, 0.1], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          rightArmGroup: { position: [0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          leftClavicle: { position: [-0.13, 1.4, 0.1], rotation: [0.2, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.4, 0.1], rotation: [0.2, 0, 0.52] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.2, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.2, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] }
        }
      }
    ];
  };

  const generateLungeAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Lunge position - left leg forward
          head: { position: [0, 1.7, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.0, 0], rotation: [0.05, 0, 0] },
          pelvis: { position: [0, 0.7, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.3, 0.4], rotation: [-1.2, 0, 0] }, // Front leg bent
          rightThigh: { position: [0.15, 0.3, -0.4], rotation: [0.4, 0, 0] }, // Back leg extended
          leftShin: { position: [-0.15, -0.3, 0.6], rotation: [1.4, 0, 0] },
          rightShin: { position: [0.15, -0.4, -0.3], rotation: [0.3, 0, 0] },
          leftHip: { position: [-0.15, 0.7, 0.4], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.7, -0.4], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0.5], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, -0.1, -0.35], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.45, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.45, 0], rotation: [-0.3, 0, 0] },
          rightArmGroup: { position: [0.25, 1.45, 0], rotation: [0.3, 0, 0] } // Opposite arm movement
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateArmRaiseAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - arms at sides
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] }
        }
      },
      {
        time: 1500,
        joints: {
          // Arms raised forward to 90 degrees (shoulder flexion)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.57, 0, 0] }, // 90 degrees forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] }
        }
      },
      {
        time: 3000,
        joints: {
          // Arms raised overhead to 180 degrees (full shoulder flexion)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-3.14, 0, 0] }, // 180 degrees forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-3.14, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [-0.2, 0, -0.52] }, // Slight elevation
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [-0.2, 0, 0.52] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] }
        }
      }
    ];
  };

  const generateHipAbductionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Left leg abducted
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, -0.05] }, // Slight lean right
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, -0.05] },
          leftThigh: { position: [-0.4, 0.4, 0], rotation: [0, 0, -0.5] }, // Leg out to side
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.6, -0.3, 0], rotation: [0, 0, -0.5] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.4, 0.8, 0], rotation: [0, 0, -0.5] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.5, 0.05, 0], rotation: [0, 0, -0.5] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, -0.05] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, -0.8] }, // Arms for balance
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0.2] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateKneeFlexionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Left knee flexed (heel to butt)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.1, -0.3], rotation: [2.0, 0, 0] }, // Knee bent
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          // Right knee flexed
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.1, -0.3], rotation: [2.0, 0, 0] }, // Knee bent
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateShoulderRotationAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - arms at 90 degrees
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.57, 0, 0] }, // Arms forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          // External rotation
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.57, 1.57, 0] }, // External rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, -1.57, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Internal rotation
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.57, -1.57, 0] }, // Internal rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 1.57, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          // Return to starting
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-1.57, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };



  const generateStandingMarchAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.3, 0, 0] }, // Opposite arm swing
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          // Left knee raised
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.5, 0.3], rotation: [-1.2, 0, 0] }, // Knee raised to 90 degrees
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, 0.1, 0.4], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.9, 0.3], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.3, 0.35], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-0.3, 0, 0] }, // Arm swings back
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.3, 0, 0] } // Arm swings forward
        }
      },
      {
        time: 2000,
        joints: {
          // Right knee raised
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.5, 0.3], rotation: [-1.2, 0, 0] }, // Knee raised to 90 degrees
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0.1, 0.4], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.9, 0.3], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.3, 0.35], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.3, 0, 0] }, // Arm swings forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] } // Arm swings back
        }
      },
      {
        time: 3000,
        joints: {
          // Left knee raised again
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.5, 0.3], rotation: [-1.2, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, 0.1, 0.4], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.9, 0.3], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.3, 0.35], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-0.3, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.3, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0.3, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] }
        }
      }
    ];
  };

  const generateHeelRaiseAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Raised on toes - entire body moves up
          head: { position: [0, 2.05, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.35, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 1.05, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.55, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.55, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.25, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.25, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.95, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.95, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.15, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.15, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.8, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Animation update effect that runs when animationData or isPlaying changes
  useEffect(() => {
    if (!skeletonRef.current || animationData.length === 0 || !isPlaying) return;

    let startTime = Date.now();
    let animationFrameId: number;

    const updateAnimation = () => {
      const elapsed = Date.now() - startTime;
      const loopTime = elapsed % 4000; // 4 second loop
      
      onTimeUpdate?.(loopTime / 1000);

      // Find current animation frame
      let currentFrame = animationData[0];
      let nextFrame = animationData[1] || animationData[0];

      for (let i = 0; i < animationData.length - 1; i++) {
        if (loopTime >= animationData[i].time && loopTime <= animationData[i + 1].time) {
          currentFrame = animationData[i];
          nextFrame = animationData[i + 1];
          break;
        }
      }

      // Calculate smooth interpolation factor
      const timeDiff = nextFrame.time - currentFrame.time;
      let t = timeDiff > 0 ? (loopTime - currentFrame.time) / timeDiff : 0;
      
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

      animationFrameId = requestAnimationFrame(updateAnimation);
    };

    updateAnimation();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animationData, isPlaying]);

  return (
    <div className="relative">
      <div ref={mountRef} className="w-full h-[300px] bg-gray-50 rounded-lg overflow-hidden" />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        3D Clinical Animation
      </div>
      {animationData.length > 0 && isPlaying && (
        <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs animate-pulse">
          Playing...
        </div>
      )}
    </div>
  );
}