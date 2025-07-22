import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Text3DAnimationProps {
  clinicalText: string;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  limbScales?: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
    torso: number;
    overall: number;
  };
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

export default function Text3DAnimation({ clinicalText, isPlaying, onTimeUpdate, limbScales = {
  upperArm: 1.0,
  forearm: 1.0,
  thigh: 1.0,
  shin: 1.0,
  torso: 1.0,
  overall: 1.0
} }: Text3DAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationRef = useRef<number>();
  const skeletonRef = useRef<THREE.Group>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const [animationData, setAnimationData] = useState<AnimationKeyframe[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const bonesRef = useRef<{ [key: string]: THREE.Mesh }>({});

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
    cameraRef.current = camera;

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
      
      // Apply rotation to skeleton
      if (skeletonRef.current) {
        skeletonRef.current.rotation.y = rotation.y;
        skeletonRef.current.rotation.x = rotation.x;
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
  }, [rotation, limbScales]);

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

    // Create main body structure with scaling
    const torsoHeight = 1.2 * limbScales.torso * limbScales.overall;
    const torso = new THREE.CylinderGeometry(0.15, 0.2, torsoHeight, 8);
    const torsoMesh = new THREE.Mesh(torso, boneMaterial);
    torsoMesh.position.y = torsoHeight / 2 + 0.9; // Position based on scaled height
    torsoMesh.name = 'torso';
    skeleton.add(torsoMesh);
    bonesRef.current['torso'] = torsoMesh;

    // Head - position based on scaled torso
    const head = new THREE.SphereGeometry(0.2, 16, 16);
    const headMesh = new THREE.Mesh(head, boneMaterial);
    headMesh.position.y = torsoHeight + 0.9 + 0.3;
    headMesh.name = 'head';
    skeleton.add(headMesh);
    
    // Create anatomically accurate pelvis with hip sockets
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.9, 0);
    pelvisGroup.name = 'pelvisGroup';
    
    // Main pelvis body (butterfly/bowl shape)
    const pelvisShape = new THREE.Shape();
    pelvisShape.moveTo(-0.15, 0);
    pelvisShape.bezierCurveTo(-0.25, 0.05, -0.3, 0.1, -0.35, 0.15); // Left iliac wing
    pelvisShape.lineTo(-0.35, 0.2);
    pelvisShape.bezierCurveTo(-0.3, 0.22, -0.2, 0.2, -0.15, 0.15);
    pelvisShape.lineTo(-0.1, 0.05);
    pelvisShape.lineTo(0.1, 0.05);
    pelvisShape.lineTo(0.15, 0.15);
    pelvisShape.bezierCurveTo(0.2, 0.2, 0.3, 0.22, 0.35, 0.2); // Right iliac wing
    pelvisShape.lineTo(0.35, 0.15);
    pelvisShape.bezierCurveTo(0.3, 0.1, 0.25, 0.05, 0.15, 0);
    pelvisShape.closePath();
    
    const pelvisExtrudeSettings = {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3
    };
    
    const pelvisGeometry = new THREE.ExtrudeGeometry(pelvisShape, pelvisExtrudeSettings);
    const pelvisMesh = new THREE.Mesh(pelvisGeometry, boneMaterial);
    pelvisMesh.rotation.x = -Math.PI / 2;
    pelvisMesh.position.y = -0.1;
    pelvisGroup.add(pelvisMesh);
    
    // Add hip sockets (acetabulum)
    const socketGeometry = new THREE.SphereGeometry(0.06, 16, 16, 0, Math.PI);
    
    // Left hip socket
    const leftSocket = new THREE.Mesh(socketGeometry, boneMaterial);
    leftSocket.rotation.z = -Math.PI / 2;
    leftSocket.position.set(-0.15, -0.05, 0);
    leftSocket.name = 'leftHipSocket';
    pelvisGroup.add(leftSocket);
    
    // Right hip socket
    const rightSocket = new THREE.Mesh(socketGeometry, boneMaterial);
    rightSocket.rotation.z = Math.PI / 2;
    rightSocket.position.set(0.15, -0.05, 0);
    rightSocket.name = 'rightHipSocket';
    pelvisGroup.add(rightSocket);
    
    // Add pubic symphysis (front connection)
    const pubicGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    const pubicBone = new THREE.Mesh(pubicGeometry, boneMaterial);
    pubicBone.rotation.z = Math.PI / 2;
    pubicBone.position.set(0, -0.1, 0.07);
    pelvisGroup.add(pubicBone);
    
    // Add sacrum (tailbone area)
    const sacrumShape = new THREE.Shape();
    sacrumShape.moveTo(-0.05, 0);
    sacrumShape.lineTo(0.05, 0);
    sacrumShape.lineTo(0.03, -0.15);
    sacrumShape.lineTo(-0.03, -0.15);
    sacrumShape.closePath();
    
    const sacrumGeometry = new THREE.ExtrudeGeometry(sacrumShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2
    });
    
    const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
    sacrum.rotation.x = -Math.PI / 2;
    sacrum.position.set(0, 0, -0.08);
    pelvisGroup.add(sacrum);
    
    skeleton.add(pelvisGroup);
    bonesRef.current['pelvis'] = pelvisMesh; // Reference the mesh, not the group

    // Create clavicles (collar bones) to connect shoulders to torso
    const clavicleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const clavicleY = torsoHeight + 0.9 - 0.1; // Just below top of torso
    
    const leftClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    leftClavicle.position.set(-0.13, clavicleY, 0);
    leftClavicle.rotation.z = -Math.PI / 6;
    leftClavicle.name = 'leftClavicle';
    skeleton.add(leftClavicle);

    const rightClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    rightClavicle.position.set(0.13, clavicleY, 0);
    rightClavicle.rotation.z = Math.PI / 6;
    rightClavicle.name = 'rightClavicle';
    skeleton.add(rightClavicle);

    // Arms - Create proper anatomical arm structure with scaling
    const upperArmLength = 0.5 * limbScales.upperArm * limbScales.overall;
    const forearmLength = 0.45 * limbScales.forearm * limbScales.overall;
    const upperArmGeometry = new THREE.CylinderGeometry(0.05, 0.045, upperArmLength, 8);
    const forearmGeometry = new THREE.CylinderGeometry(0.045, 0.04, forearmLength, 8);
    
    // Left arm group for hierarchical transformation
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.25, torsoHeight + 0.9 - 0.15, 0); // Position at shoulder level
    leftArmGroup.name = 'leftArmGroup';
    
    // Left upper arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    leftUpperArm.position.set(0, -upperArmLength / 2, 0);
    leftUpperArm.name = 'leftUpperArm';
    leftArmGroup.add(leftUpperArm);
    bonesRef.current['leftUpperArm'] = leftUpperArm;

    // Left forearm
    const leftForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    leftForearm.position.set(0, -upperArmLength - forearmLength / 2, 0);
    leftForearm.name = 'leftForearm';
    leftArmGroup.add(leftForearm);
    bonesRef.current['leftForearm'] = leftForearm;

    skeleton.add(leftArmGroup);

    // Right arm group for hierarchical transformation
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.25, torsoHeight + 0.9 - 0.15, 0); // Position at shoulder level
    rightArmGroup.name = 'rightArmGroup';
    
    // Right upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    rightUpperArm.position.set(0, -upperArmLength / 2, 0);
    rightUpperArm.name = 'rightUpperArm';
    rightArmGroup.add(rightUpperArm);
    bonesRef.current['rightUpperArm'] = rightUpperArm;

    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    rightForearm.position.set(0, -upperArmLength - forearmLength / 2, 0);
    rightForearm.name = 'rightForearm';
    rightArmGroup.add(rightForearm);
    bonesRef.current['rightForearm'] = rightForearm;

    skeleton.add(rightArmGroup);

    // Add hands
    const handGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    
    const leftHand = new THREE.Mesh(handGeometry, boneMaterial);
    leftHand.position.set(0, -upperArmLength - forearmLength - 0.05, 0);
    leftHand.name = 'leftHand';
    leftArmGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeometry, boneMaterial);
    rightHand.position.set(0, -upperArmLength - forearmLength - 0.05, 0);
    rightHand.name = 'rightHand';
    rightArmGroup.add(rightHand);

    // Add upper body connection bones for better visual connectivity
    const shoulderConnectorGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.08);
    const shoulderConnector = new THREE.Mesh(shoulderConnectorGeometry, boneMaterial);
    shoulderConnector.position.set(0, torsoHeight + 0.9 - 0.15, 0); // At shoulder level
    shoulderConnector.name = 'shoulderConnector';
    skeleton.add(shoulderConnector);

    // Add scapulae (shoulder blades)
    const scapulaGeometry = new THREE.Shape();
    // Create a triangular wing-shaped scapula
    scapulaGeometry.moveTo(0, 0);
    scapulaGeometry.lineTo(0.15, -0.25);
    scapulaGeometry.lineTo(0.05, -0.3);
    scapulaGeometry.lineTo(-0.05, -0.2);
    scapulaGeometry.closePath();
    
    const scapulaExtrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1
    };
    
    const scapula3D = new THREE.ExtrudeGeometry(scapulaGeometry, scapulaExtrudeSettings);
    
    // Left scapula
    const leftScapula = new THREE.Mesh(scapula3D, boneMaterial);
    leftScapula.position.set(-0.22, torsoHeight + 0.9 - 0.25, -0.12); // Behind and to the side of the torso
    leftScapula.rotation.set(0, -0.3, 0); // Angle it appropriately
    leftScapula.name = 'leftScapula';
    skeleton.add(leftScapula);
    
    // Right scapula
    const rightScapula = new THREE.Mesh(scapula3D, boneMaterial);
    rightScapula.position.set(0.22, torsoHeight + 0.9 - 0.25, -0.12); // Behind and to the side of the torso
    rightScapula.rotation.set(0, 0.3, 0); // Angle it appropriately
    rightScapula.scale.x = -1; // Mirror for right side
    rightScapula.name = 'rightScapula';
    skeleton.add(rightScapula);

    // Legs with scaling
    const thighLength = 0.8 * limbScales.thigh * limbScales.overall;
    const shinLength = 0.8 * limbScales.shin * limbScales.overall;
    const thighGeometry = new THREE.CylinderGeometry(0.08, 0.08, thighLength, 8);
    const shinGeometry = new THREE.CylinderGeometry(0.08, 0.08, shinLength, 8);
    
    // Left thigh
    const leftThigh = new THREE.Mesh(thighGeometry, boneMaterial);
    leftThigh.position.set(-0.15, 0.9 - thighLength / 2, 0); // Position based on scaled length
    leftThigh.name = 'leftThigh';
    skeleton.add(leftThigh);
    bonesRef.current['leftThigh'] = leftThigh;

    // Left shin
    const leftShin = new THREE.Mesh(shinGeometry, boneMaterial);
    leftShin.position.set(-0.15, 0.9 - thighLength - shinLength / 2, 0); // Position below thigh
    leftShin.name = 'leftShin';
    skeleton.add(leftShin);
    bonesRef.current['leftShin'] = leftShin;

    // Right thigh
    const rightThigh = new THREE.Mesh(thighGeometry, boneMaterial);
    rightThigh.position.set(0.15, 0.9 - thighLength / 2, 0);
    rightThigh.name = 'rightThigh';
    skeleton.add(rightThigh);
    bonesRef.current['rightThigh'] = rightThigh;

    // Right shin
    const rightShin = new THREE.Mesh(shinGeometry, boneMaterial);
    rightShin.position.set(0.15, 0.9 - thighLength - shinLength / 2, 0);
    rightShin.name = 'rightShin';
    skeleton.add(rightShin);
    bonesRef.current['rightShin'] = rightShin;

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
    leftElbow.position.set(0, -upperArmLength, 0);
    leftElbow.name = 'leftElbow';
    leftArmGroup.add(leftElbow);

    const rightElbow = new THREE.Mesh(jointGeometry, jointMaterial);
    rightElbow.position.set(0, -upperArmLength, 0);
    rightElbow.name = 'rightElbow';
    rightArmGroup.add(rightElbow);

    // Hip joints - Femoral heads (ball joints)
    const femoralHeadGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    
    const leftHip = new THREE.Mesh(femoralHeadGeometry, jointMaterial);
    leftHip.position.set(-0.15, 0.9, 0); // At pelvis level
    leftHip.name = 'leftHip';
    skeleton.add(leftHip);

    const rightHip = new THREE.Mesh(femoralHeadGeometry, jointMaterial);
    rightHip.position.set(0.15, 0.9, 0); // At pelvis level
    rightHip.name = 'rightHip';
    skeleton.add(rightHip);

    // Knee joints - positioned between thigh and shin
    const leftKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    leftKnee.position.set(-0.15, 0.9 - thighLength, 0);
    leftKnee.name = 'leftKnee';
    skeleton.add(leftKnee);

    const rightKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    rightKnee.position.set(0.15, 0.9 - thighLength, 0);
    rightKnee.name = 'rightKnee';
    skeleton.add(rightKnee);

    // Ankle joints - positioned at the end of shin
    const leftAnkle = new THREE.Mesh(jointGeometry, jointMaterial);
    leftAnkle.position.set(-0.15, 0.9 - thighLength - shinLength, 0);
    leftAnkle.name = 'leftAnkle';
    skeleton.add(leftAnkle);

    const rightAnkle = new THREE.Mesh(jointGeometry, jointMaterial);
    rightAnkle.position.set(0.15, 0.9 - thighLength - shinLength, 0);
    rightAnkle.name = 'rightAnkle';
    skeleton.add(rightAnkle);

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.25);
    const footY = 0.9 - thighLength - shinLength - 0.05; // Position below ankle
    
    const leftFoot = new THREE.Mesh(footGeometry, boneMaterial);
    leftFoot.position.set(-0.15, footY, 0.05);
    leftFoot.name = 'leftFoot';
    skeleton.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, boneMaterial);
    rightFoot.position.set(0.15, footY, 0.05);
    rightFoot.name = 'rightFoot';
    skeleton.add(rightFoot);

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
    } else if (lowerText.includes('deadlift')) {
      animationFrames = generateDeadliftAnimation();
    } else if (lowerText.includes('bridge')) {
      animationFrames = generateBridgeAnimation();
    } else if (lowerText.includes('step up') || lowerText.includes('step-up')) {
      animationFrames = generateStepUpAnimation();
    } else if (lowerText.includes('bird dog')) {
      animationFrames = generateBirdDogAnimation();
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          leftKnee: { position: [-0.15, 0.05, 0.1], rotation: [0, 0, 0] }, // Connect thigh to shin
          rightKnee: { position: [0.15, 0.05, 0.1], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.35, 0.1], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          rightArmGroup: { position: [0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          leftClavicle: { position: [-0.13, 1.4, 0.1], rotation: [0.2, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.4, 0.1], rotation: [0.2, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.35, 0.25], rotation: [0.3, 0, 0] }, // Connect shin to foot
          rightAnkle: { position: [0.15, -0.35, 0.25], rotation: [0.3, 0, 0] },
          leftFoot: { position: [-0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.25, -0.02], rotation: [0.2, -0.3, 0] }, // Move down with torso
          rightScapula: { position: [0.22, 1.25, -0.02], rotation: [0.2, 0.3, 0] }
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
          leftKnee: { position: [-0.15, -0.1, 0.15], rotation: [0, 0, 0] }, // Connect thigh to shin
          rightKnee: { position: [0.15, -0.1, 0.15], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.05, 0.2], rotation: [0.3, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.05, 0.2], rotation: [-1.5, 0, 0] },
          rightArmGroup: { position: [0.25, 1.05, 0.2], rotation: [-1.5, 0, 0] },
          leftClavicle: { position: [-0.13, 1.1, 0.2], rotation: [0.3, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.1, 0.2], rotation: [0.3, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.45, 0.35], rotation: [0.4, 0, 0] }, // Connect shin to foot
          rightAnkle: { position: [0.15, -0.45, 0.35], rotation: [0.4, 0, 0] },
          leftFoot: { position: [-0.15, -0.5, 0.4], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.5, 0.4], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 0.95, 0.08], rotation: [0.3, -0.3, 0] }, // Lowest position with torso
          rightScapula: { position: [0.22, 0.95, 0.08], rotation: [0.3, 0.3, 0] }
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
          leftKnee: { position: [-0.15, 0.05, 0.1], rotation: [0, 0, 0] }, // Connect thigh to shin
          rightKnee: { position: [0.15, 0.05, 0.1], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.35, 0.1], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          rightArmGroup: { position: [0.25, 1.35, 0.1], rotation: [-1.4, 0, 0] },
          leftClavicle: { position: [-0.13, 1.4, 0.1], rotation: [0.2, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.4, 0.1], rotation: [0.2, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.35, 0.25], rotation: [0.3, 0, 0] }, // Connect shin to foot
          rightAnkle: { position: [0.15, -0.35, 0.25], rotation: [0.3, 0, 0] },
          leftFoot: { position: [-0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.25, -0.02], rotation: [0.2, -0.3, 0] }, // Mid position
          rightScapula: { position: [0.22, 1.25, -0.02], rotation: [0.2, 0.3, 0] }
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] }, // Back to start
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightArmGroup: { position: [0.25, 1.45, 0], rotation: [0.3, 0, 0] }, // Opposite arm movement
          leftAnkle: { position: [-0.15, -0.7, 0.7], rotation: [1.2, 0, 0] },
          rightAnkle: { position: [0.15, -0.7, -0.3], rotation: [0.3, 0, 0] },
          leftFoot: { position: [-0.15, -0.75, 0.75], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.75, -0.25], rotation: [0.3, 0, 0] }
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
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [-0.2, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          leftAnkle: { position: [-0.65, -0.7, 0], rotation: [0, 0, -0.5] }, // Follow abducted leg
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.7, -0.75, 0.05], rotation: [0, 0, -0.5] }, // Follow abducted leg
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, -0.05] }, // Slight tilt with torso
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, -0.05] }
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
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.3, -0.4], rotation: [2.0, 0, 0] }, // Follow bent knee
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.35, -0.45], rotation: [2.0, 0, 0] }, // Follow bent knee
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.3, -0.4], rotation: [2.0, 0, 0] }, // Follow bent knee
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.35, -0.45], rotation: [2.0, 0, 0] }, // Follow bent knee
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, -1.57, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.5, 0.2] }, // Protraction and upward rotation
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.5, -0.2] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 1.57, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.1, -0.2] }, // Retraction and downward rotation
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.1, 0.2] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-1.57, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.3, 0, 0] }, // Arm swings forward
          leftAnkle: { position: [-0.15, -0.3, 0.45], rotation: [0, 0, 0] }, // Follow raised knee
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.35, 0.5], rotation: [0, 0, 0] }, // Follow raised knee
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] }, // Arm swings back
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.05, 0.4], rotation: [0, 0, 0] }, // Connect to shin properly
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.1, 0.45], rotation: [0, 0, 0] }, // Follow raised ankle
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0.3, 0, 0] },
          leftAnkle: { position: [-0.15, -0.05, 0.4], rotation: [0, 0, 0] }, // Connect to shin properly
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.1, 0.45], rotation: [0, 0, 0] }, // Follow raised ankle
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.3, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
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

  // Deadlift animation
  const generateDeadliftAnimation = (): AnimationKeyframe[] => {
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Bent position - hinge at hips
          head: { position: [0, 1.1, 0.3], rotation: [0.5, 0, 0] },
          torso: { position: [0, 0.8, 0.2], rotation: [1.2, 0, 0] }, // Major hip hinge
          pelvis: { position: [0, 0.6, -0.2], rotation: [1.2, 0, 0] },
          leftThigh: { position: [-0.15, 0.3, -0.1], rotation: [-0.3, 0, 0] },
          rightThigh: { position: [0.15, 0.3, -0.1], rotation: [-0.3, 0, 0] },
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0.2, 0, 0] },
          rightShin: { position: [0.15, -0.4, 0], rotation: [0.2, 0, 0] },
          leftHip: { position: [-0.15, 0.6, -0.2], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.6, -0.2], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, -0.05, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, -0.05, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.8, 0.5], rotation: [0.3, 0, 0] }, // Arms reach down
          rightArmGroup: { position: [0.25, 0.8, 0.5], rotation: [0.3, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to standing
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Bridge exercise animation
  const generateBridgeAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Lying on back position
          head: { position: [0, 0.1, -0.8], rotation: [0, 0, 0] },
          torso: { position: [0, 0.1, -0.4], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.1, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.1, 0.3], rotation: [-1.57, 0, 0] }, // Knees bent
          rightThigh: { position: [0.15, 0.1, 0.3], rotation: [-1.57, 0, 0] },
          leftShin: { position: [-0.15, 0.3, 0.6], rotation: [-1.57, 0, 0] },
          rightShin: { position: [0.15, 0.3, 0.6], rotation: [-1.57, 0, 0] },
          leftHip: { position: [-0.15, 0.1, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.1, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Bridge position - hips raised
          head: { position: [0, 0.1, -0.8], rotation: [0, 0, 0] },
          torso: { position: [0, 0.4, -0.4], rotation: [-0.3, 0, 0] },
          pelvis: { position: [0, 0.6, 0], rotation: [-0.4, 0, 0] }, // Pelvis lifted
          leftThigh: { position: [-0.15, 0.4, 0.3], rotation: [-1.2, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0.3], rotation: [-1.2, 0, 0] },
          leftShin: { position: [-0.15, 0.25, 0.6], rotation: [-1.57, 0, 0] },
          rightShin: { position: [0.15, 0.25, 0.6], rotation: [-1.57, 0, 0] },
          leftHip: { position: [-0.15, 0.6, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.6, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.35, 0.5], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.35, 0.5], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to lying position
          head: { position: [0, 0.1, -0.8], rotation: [0, 0, 0] },
          torso: { position: [0, 0.1, -0.4], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.1, 0], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.1, 0.3], rotation: [-1.57, 0, 0] },
          rightThigh: { position: [0.15, 0.1, 0.3], rotation: [-1.57, 0, 0] },
          leftShin: { position: [-0.15, 0.3, 0.6], rotation: [-1.57, 0, 0] },
          rightShin: { position: [0.15, 0.3, 0.6], rotation: [-1.57, 0, 0] },
          leftHip: { position: [-0.15, 0.1, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.1, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Step-up animation
  const generateStepUpAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing in front of step
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
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          // Right leg stepping up
          head: { position: [0, 2.1, 0.1], rotation: [0, 0, 0] },
          torso: { position: [0, 1.4, 0.1], rotation: [0, 0, 0] },
          pelvis: { position: [0, 1.1, 0.1], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.7, 0.2], rotation: [-0.7, 0, 0] }, // Right thigh lifted
          leftShin: { position: [-0.15, -0.4, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0.1, 0.3], rotation: [0, 0, 0] }, // Right shin vertical
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 1.1, 0.1], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.3, 0.3], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.1, 0.3], rotation: [0, 0, 0] } // Right foot on step
        }
      },
      {
        time: 2000,
        joints: {
          // Both feet on step
          head: { position: [0, 2.3, 0.3], rotation: [0, 0, 0] },
          torso: { position: [0, 1.6, 0.3], rotation: [0, 0, 0] },
          pelvis: { position: [0, 1.3, 0.3], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.8, 0.3], rotation: [0, 0, 0] },
          rightThigh: { position: [0.15, 0.8, 0.3], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, 0, 0.3], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0, 0.3], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 1.2, 0.3], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 1.2, 0.3], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.4, 0.3], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.4, 0.3], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.4, 0.3], rotation: [0, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          // Stepping back down
          head: { position: [0, 2.1, 0.1], rotation: [0, 0, 0] },
          torso: { position: [0, 1.4, 0.1], rotation: [0, 0, 0] },
          pelvis: { position: [0, 1.1, 0.1], rotation: [0, 0, 0] },
          leftThigh: { position: [-0.15, 0.6, 0.1], rotation: [-0.3, 0, 0] },
          rightThigh: { position: [0.15, 0.6, 0.3], rotation: [0, 0, 0] },
          leftShin: { position: [-0.15, -0.2, 0], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, -0.2, 0.3], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 1.0, 0.1], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 1.0, 0.3], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.2, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.2, 0.3], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.6, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.6, 0.3], rotation: [0, 0, 0] }
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
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Bird dog animation
  const generateBirdDogAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Quadruped position
          head: { position: [0, 0.8, -0.4], rotation: [-0.5, 0, 0] },
          torso: { position: [0, 0.6, 0], rotation: [1.57, 0, 0] }, // Horizontal
          pelvis: { position: [0, 0.6, 0.4], rotation: [1.57, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0.6], rotation: [0.7, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0.6], rotation: [0.7, 0, 0] },
          leftShin: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.3, 0.6], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.3, 0.6], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          // Left arm and right leg extended
          head: { position: [0, 0.8, -0.4], rotation: [-0.3, 0, 0] },
          torso: { position: [0, 0.6, 0], rotation: [1.57, 0, 0] },
          pelvis: { position: [0, 0.6, 0.4], rotation: [1.57, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0.6], rotation: [0.7, 0, 0] },
          rightThigh: { position: [0.15, 0.6, 0.8], rotation: [3.14, 0, 0] }, // Extended back
          leftShin: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0.6, 1.2], rotation: [3.14, 0, 0] },
          leftHip: { position: [-0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.3, 0.6], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.6, 1.0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.8], rotation: [0, 0, 0] }, // Extended forward
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.6, 1.4], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          // Return to quadruped
          head: { position: [0, 0.8, -0.4], rotation: [-0.5, 0, 0] },
          torso: { position: [0, 0.6, 0], rotation: [1.57, 0, 0] },
          pelvis: { position: [0, 0.6, 0.4], rotation: [1.57, 0, 0] },
          leftThigh: { position: [-0.15, 0.4, 0.6], rotation: [0.7, 0, 0] },
          rightThigh: { position: [0.15, 0.4, 0.6], rotation: [0.7, 0, 0] },
          leftShin: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightShin: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.6, 0.4], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0.3, 0.6], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0.3, 0.6], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] }
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

      // After updating joint positions, adjust leg bones to maintain connections
      const leftThigh = skeletonRef.current!.getObjectByName('leftThigh') as THREE.Mesh;
      const leftShin = skeletonRef.current!.getObjectByName('leftShin') as THREE.Mesh;
      const leftHip = skeletonRef.current!.getObjectByName('leftHip') as THREE.Mesh;
      const leftKnee = skeletonRef.current!.getObjectByName('leftKnee') as THREE.Mesh;
      const leftAnkle = skeletonRef.current!.getObjectByName('leftAnkle') as THREE.Mesh;
      const leftFoot = skeletonRef.current!.getObjectByName('leftFoot') as THREE.Mesh;

      const rightThigh = skeletonRef.current!.getObjectByName('rightThigh') as THREE.Mesh;
      const rightShin = skeletonRef.current!.getObjectByName('rightShin') as THREE.Mesh;
      const rightHip = skeletonRef.current!.getObjectByName('rightHip') as THREE.Mesh;
      const rightKnee = skeletonRef.current!.getObjectByName('rightKnee') as THREE.Mesh;
      const rightAnkle = skeletonRef.current!.getObjectByName('rightAnkle') as THREE.Mesh;
      const rightFoot = skeletonRef.current!.getObjectByName('rightFoot') as THREE.Mesh;

      // Adjust left leg bones to connect properly
      if (leftThigh && leftHip && leftKnee) {
        // Position thigh between hip and knee
        leftThigh.position.x = (leftHip.position.x + leftKnee.position.x) / 2;
        leftThigh.position.y = (leftHip.position.y + leftKnee.position.y) / 2;
        leftThigh.position.z = (leftHip.position.z + leftKnee.position.z) / 2;
        
        // Calculate thigh length and scale
        const thighLength = leftHip.position.distanceTo(leftKnee.position);
        leftThigh.scale.y = thighLength / 0.8; // 0.8 is the original bone length
        
        // Rotate thigh to point from hip to knee
        const direction = new THREE.Vector3().subVectors(leftKnee.position, leftHip.position).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
        leftThigh.setRotationFromQuaternion(quaternion);
      }

      if (leftShin && leftKnee && leftAnkle) {
        // Position shin between knee and ankle
        leftShin.position.x = (leftKnee.position.x + leftAnkle.position.x) / 2;
        leftShin.position.y = (leftKnee.position.y + leftAnkle.position.y) / 2;
        leftShin.position.z = (leftKnee.position.z + leftAnkle.position.z) / 2;
        
        // Calculate shin length and scale
        const shinLength = leftKnee.position.distanceTo(leftAnkle.position);
        leftShin.scale.y = shinLength / 0.8;
        
        // Rotate shin to point from knee to ankle
        const direction = new THREE.Vector3().subVectors(leftAnkle.position, leftKnee.position).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
        leftShin.setRotationFromQuaternion(quaternion);
      }

      // Adjust right leg bones
      if (rightThigh && rightHip && rightKnee) {
        // Position thigh between hip and knee
        rightThigh.position.x = (rightHip.position.x + rightKnee.position.x) / 2;
        rightThigh.position.y = (rightHip.position.y + rightKnee.position.y) / 2;
        rightThigh.position.z = (rightHip.position.z + rightKnee.position.z) / 2;
        
        // Calculate thigh length and scale
        const thighLength = rightHip.position.distanceTo(rightKnee.position);
        rightThigh.scale.y = thighLength / 0.8;
        
        // Rotate thigh to point from hip to knee
        const direction = new THREE.Vector3().subVectors(rightKnee.position, rightHip.position).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
        rightThigh.setRotationFromQuaternion(quaternion);
      }

      if (rightShin && rightKnee && rightAnkle) {
        // Position shin between knee and ankle
        rightShin.position.x = (rightKnee.position.x + rightAnkle.position.x) / 2;
        rightShin.position.y = (rightKnee.position.y + rightAnkle.position.y) / 2;
        rightShin.position.z = (rightKnee.position.z + rightAnkle.position.z) / 2;
        
        // Calculate shin length and scale
        const shinLength = rightKnee.position.distanceTo(rightAnkle.position);
        rightShin.scale.y = shinLength / 0.8;
        
        // Rotate shin to point from knee to ankle
        const direction = new THREE.Vector3().subVectors(rightAnkle.position, rightKnee.position).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
        rightShin.setRotationFromQuaternion(quaternion);
      }

      // Ensure feet follow ankles
      if (leftFoot && leftAnkle) {
        leftFoot.position.x = leftAnkle.position.x;
        leftFoot.position.y = leftAnkle.position.y - 0.05;
        leftFoot.position.z = leftAnkle.position.z + 0.05;
      }

      if (rightFoot && rightAnkle) {
        rightFoot.position.x = rightAnkle.position.x;
        rightFoot.position.y = rightAnkle.position.y - 0.05;
        rightFoot.position.z = rightAnkle.position.z + 0.05;
      }

      animationFrameId = requestAnimationFrame(updateAnimation);
    };

    updateAnimation();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animationData, isPlaying]);

  // Mouse event handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setRotation({
      x: rotation.x + deltaY * 0.01,
      y: rotation.y + deltaX * 0.01
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative">
      <div 
        ref={mountRef} 
        className="w-full h-[300px] bg-gray-50 rounded-lg overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        3D Clinical Animation
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          Click and drag to rotate
        </div>
        <button
          onClick={() => setRotation({ x: 0, y: 0 })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
        >
          Reset View
        </button>
      </div>
      {animationData.length > 0 && isPlaying && (
        <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs animate-pulse">
          Playing...
        </div>
      )}
    </div>
  );
}