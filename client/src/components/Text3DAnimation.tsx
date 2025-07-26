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
  hipPathology?: {
    neckAngle: number;
    anteversion: number;
    acetabularCoverage: number;
  };
  kneePathology?: {
    varusValgus: number;
    patellaHeight: number;
    tibialTorsion: number;
  };
  shoulderPathology?: {
    scapularWinging: number;
    acSeparation: number;
    ghSubluxation: number;
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
}, hipPathology = {
  neckAngle: 130,
  anteversion: 12,
  acetabularCoverage: 75
}, kneePathology = {
  varusValgus: 3,
  patellaHeight: 1.0,
  tibialTorsion: 10
}, shoulderPathology = {
  scapularWinging: 3,
  acSeparation: 0,
  ghSubluxation: 0
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
    
    // Add hip sockets (acetabulum) with pathology-based coverage
    const coverageAngle = (hipPathology.acetabularCoverage / 100) * Math.PI; // Convert percentage to radians
    const socketGeometry = new THREE.SphereGeometry(0.06, 16, 16, 0, coverageAngle);
    
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
    const clavicleY = 1.55; // Position at upper chest level, just below shoulders (1.65)
    
    const leftClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    leftClavicle.position.set(-0.13, clavicleY, 0.05); // Slightly forward
    leftClavicle.rotation.z = -Math.PI / 6;
    leftClavicle.name = 'leftClavicle';
    skeleton.add(leftClavicle);

    const rightClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    rightClavicle.position.set(0.13, clavicleY, 0.05); // Slightly forward
    rightClavicle.rotation.z = Math.PI / 6;
    rightClavicle.name = 'rightClavicle';
    skeleton.add(rightClavicle);

    // Arms - Create proper anatomical arm structure with scaling
    const upperArmLength = 0.5 * limbScales.upperArm * limbScales.overall;
    const forearmLength = 0.45 * limbScales.forearm * limbScales.overall;
    const upperArmGeometry = new THREE.CylinderGeometry(0.05, 0.045, upperArmLength, 8);
    const forearmGeometry = new THREE.CylinderGeometry(0.045, 0.04, forearmLength, 8);
    
    // Left arm group for hierarchical transformation with pathology
    const leftArmGroup = new THREE.Group();
    const baseShoulderHeight = torsoHeight + 0.9 - 0.15;
    
    // Apply AC separation (vertical displacement)
    const acSeparationOffset = shoulderPathology.acSeparation * 0.02; // Each grade adds 2cm
    
    // Apply GH subluxation (inferior displacement and forward translation)
    const ghSubluxationOffset = (shoulderPathology.ghSubluxation / 100) * 0.1; // Percentage to offset
    
    leftArmGroup.position.set(
      -0.25, 
      baseShoulderHeight - acSeparationOffset - ghSubluxationOffset, 
      ghSubluxationOffset * 0.5  // Forward displacement with subluxation
    );
    leftArmGroup.name = 'leftArmGroup';
    
    // Left upper arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    leftUpperArm.position.set(0, -upperArmLength / 2, 0);
    leftUpperArm.name = 'leftUpperArm';
    leftArmGroup.add(leftUpperArm);
    bonesRef.current['leftUpperArm'] = leftUpperArm;

    // Left elbow group - for proper forearm hierarchy
    const leftElbowGroup = new THREE.Group();
    leftElbowGroup.position.set(0, -upperArmLength, 0); // Position at elbow joint
    leftElbowGroup.name = 'leftElbowGroup';
    leftArmGroup.add(leftElbowGroup);

    // Add visible elbow joint
    const elbowJointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const elbowJointMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red color
    const leftElbowJoint = new THREE.Mesh(elbowJointGeometry, elbowJointMaterial);
    leftElbowJoint.position.set(0, 0, 0); // At elbow group origin
    leftElbowJoint.name = 'leftElbowJoint';
    leftElbowGroup.add(leftElbowJoint);

    // Left forearm attached to elbow group
    const leftForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    leftForearm.position.set(0, -forearmLength / 2, 0);
    leftForearm.name = 'leftForearm';
    leftElbowGroup.add(leftForearm);
    bonesRef.current['leftForearm'] = leftForearm;

    skeleton.add(leftArmGroup);

    // Right arm group for hierarchical transformation with pathology
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(
      0.25, 
      baseShoulderHeight - acSeparationOffset - ghSubluxationOffset, 
      ghSubluxationOffset * 0.5  // Forward displacement with subluxation
    );
    rightArmGroup.name = 'rightArmGroup';
    
    // Right upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, boneMaterial);
    rightUpperArm.position.set(0, -upperArmLength / 2, 0);
    rightUpperArm.name = 'rightUpperArm';
    rightArmGroup.add(rightUpperArm);
    bonesRef.current['rightUpperArm'] = rightUpperArm;

    // Right elbow group - for proper forearm hierarchy
    const rightElbowGroup = new THREE.Group();
    rightElbowGroup.position.set(0, -upperArmLength, 0); // Position at elbow joint
    rightElbowGroup.name = 'rightElbowGroup';
    rightArmGroup.add(rightElbowGroup);

    // Add visible elbow joint
    const rightElbowJoint = new THREE.Mesh(elbowJointGeometry, elbowJointMaterial);
    rightElbowJoint.position.set(0, 0, 0); // At elbow group origin
    rightElbowJoint.name = 'rightElbowJoint';
    rightElbowGroup.add(rightElbowJoint);

    // Right forearm attached to elbow group
    const rightForearm = new THREE.Mesh(forearmGeometry, boneMaterial);
    rightForearm.position.set(0, -forearmLength / 2, 0);
    rightForearm.name = 'rightForearm';
    rightElbowGroup.add(rightForearm);
    bonesRef.current['rightForearm'] = rightForearm;

    skeleton.add(rightArmGroup);

    // Add hands
    const handGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    
    const leftHand = new THREE.Mesh(handGeometry, boneMaterial);
    leftHand.position.set(0, -forearmLength - 0.05, 0);
    leftHand.name = 'leftHand';
    leftElbowGroup.add(leftHand); // Attach to elbow group

    const rightHand = new THREE.Mesh(handGeometry, boneMaterial);
    rightHand.position.set(0, -forearmLength - 0.05, 0);
    rightHand.name = 'rightHand';
    rightElbowGroup.add(rightHand); // Attach to elbow group

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
    
    // Left scapula with winging pathology
    const leftScapula = new THREE.Mesh(scapula3D, boneMaterial);
    leftScapula.position.set(-0.22, torsoHeight + 0.9 - 0.25, -0.12); // Behind and to the side of the torso
    
    // Apply scapular winging
    const wingingRad = (shoulderPathology.scapularWinging * Math.PI) / 180;
    leftScapula.rotation.set(0, -0.3 - wingingRad, 0); // Add winging rotation
    leftScapula.position.z = -0.12 - (wingingRad * 0.1); // Move backward with winging
    
    leftScapula.name = 'leftScapula';
    skeleton.add(leftScapula);
    
    // Right scapula with winging pathology
    const rightScapula = new THREE.Mesh(scapula3D, boneMaterial);
    rightScapula.position.set(0.22, torsoHeight + 0.9 - 0.25, -0.12); // Behind and to the side of the torso
    
    // Apply scapular winging
    rightScapula.rotation.set(0, 0.3 + wingingRad, 0); // Add winging rotation
    rightScapula.position.z = -0.12 - (wingingRad * 0.1); // Move backward with winging
    
    rightScapula.scale.x = -1; // Mirror for right side
    rightScapula.name = 'rightScapula';
    skeleton.add(rightScapula);

    // Legs with scaling
    const thighLength = 0.8 * limbScales.thigh * limbScales.overall;
    const shinLength = 0.8 * limbScales.shin * limbScales.overall;
    const thighGeometry = new THREE.CylinderGeometry(0.08, 0.08, thighLength, 8);
    const shinGeometry = new THREE.CylinderGeometry(0.08, 0.08, shinLength, 8);
    
    // Left leg group for hierarchical transformation
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.15, 0.8, 0); // Position at hip joint (below pelvis at 0.9)
    leftLegGroup.name = 'leftLegGroup';
    
    // Left thigh attached to leg group
    const leftThigh = new THREE.Mesh(thighGeometry, boneMaterial);
    leftThigh.position.set(0, -thighLength / 2, 0); // Relative to leg group
    
    // Apply femoral neck angle (coxa vara/valga)
    const neckAngleRad = ((hipPathology.neckAngle - 130) * Math.PI) / 180; // Convert deviation from normal to radians
    leftThigh.rotation.z = -neckAngleRad * 0.5; // Apply half the angle for natural look
    
    // Apply femoral anteversion
    const anteversionRad = (hipPathology.anteversion * Math.PI) / 180;
    leftThigh.rotation.y = anteversionRad * 0.3; // Apply 30% of angle for subtlety
    
    leftThigh.name = 'leftThigh';
    leftLegGroup.add(leftThigh);
    bonesRef.current['leftThigh'] = leftThigh;
    bonesRef.current['leftLegGroup'] = leftLegGroup;

    // Left knee group - for proper shin hierarchy
    const leftKneeGroup = new THREE.Group();
    leftKneeGroup.position.set(0, -thighLength, 0); // Position at knee joint
    leftKneeGroup.name = 'leftKneeGroup';
    leftLegGroup.add(leftKneeGroup);

    // Add visible knee joint
    const kneeJointGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const kneeJointMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 }); // Green color
    const leftKneeJoint = new THREE.Mesh(kneeJointGeometry, kneeJointMaterial);
    leftKneeJoint.position.set(0, 0, 0); // At knee group origin
    leftKneeJoint.name = 'leftKneeJoint';
    leftKneeGroup.add(leftKneeJoint);
    bonesRef.current['leftKneeGroup'] = leftKneeGroup;

    // Left shin attached to knee group
    const leftShin = new THREE.Mesh(shinGeometry, boneMaterial);
    leftShin.position.set(0, -shinLength / 2, 0); // Relative to knee group
    
    // Apply varus/valgus angle
    const varusValgusRad = (kneePathology.varusValgus * Math.PI) / 180;
    leftShin.rotation.z = -varusValgusRad; // Negative for left side
    
    // Apply tibial torsion
    const tibialTorsionRad = (kneePathology.tibialTorsion * Math.PI) / 180;
    leftShin.rotation.y = tibialTorsionRad * 0.5;
    
    leftShin.name = 'leftShin';
    leftKneeGroup.add(leftShin);
    bonesRef.current['leftShin'] = leftShin;
    
    // Left ankle group - for proper foot hierarchy
    const leftAnkleGroup = new THREE.Group();
    leftAnkleGroup.position.set(0, -shinLength, 0); // Position at ankle joint
    leftAnkleGroup.name = 'leftAnkleGroup';
    leftKneeGroup.add(leftAnkleGroup);
    
    // Add visible ankle joint
    const ankleJointGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const ankleJointMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff }); // Blue color
    const leftAnkleJoint = new THREE.Mesh(ankleJointGeometry, ankleJointMaterial);
    leftAnkleJoint.position.set(0, 0, 0); // At ankle group origin
    leftAnkleJoint.name = 'leftAnkleJoint';
    leftAnkleGroup.add(leftAnkleJoint);
    
    // Left foot attached to ankle group
    const footGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.25);
    const leftFoot = new THREE.Mesh(footGeometry, boneMaterial);
    leftFoot.position.set(0, -0.03, 0.05); // Positioned directly at ankle with minimal gap
    leftFoot.name = 'leftFoot';
    leftAnkleGroup.add(leftFoot);
    bonesRef.current['leftFoot'] = leftFoot;
    
    skeleton.add(leftLegGroup);

    // Right leg group for hierarchical transformation
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.15, 0.8, 0); // Position at hip joint (below pelvis at 0.9)
    rightLegGroup.name = 'rightLegGroup';
    
    // Right thigh attached to leg group
    const rightThigh = new THREE.Mesh(thighGeometry, boneMaterial);
    rightThigh.position.set(0, -thighLength / 2, 0); // Relative to leg group
    
    // Apply femoral neck angle (coxa vara/valga) - mirror for right side
    rightThigh.rotation.z = neckAngleRad * 0.5; // Opposite angle for right side
    
    // Apply femoral anteversion
    rightThigh.rotation.y = -anteversionRad * 0.3; // Opposite for right side
    
    rightThigh.name = 'rightThigh';
    rightLegGroup.add(rightThigh);
    bonesRef.current['rightThigh'] = rightThigh;
    bonesRef.current['rightLegGroup'] = rightLegGroup;

    // Right knee group - for proper shin hierarchy
    const rightKneeGroup = new THREE.Group();
    rightKneeGroup.position.set(0, -thighLength, 0); // Position at knee joint
    rightKneeGroup.name = 'rightKneeGroup';
    rightLegGroup.add(rightKneeGroup);

    // Add visible knee joint
    const rightKneeJoint = new THREE.Mesh(kneeJointGeometry, kneeJointMaterial);
    rightKneeJoint.position.set(0, 0, 0); // At knee group origin
    rightKneeJoint.name = 'rightKneeJoint';
    rightKneeGroup.add(rightKneeJoint);
    bonesRef.current['rightKneeGroup'] = rightKneeGroup;

    // Right shin attached to knee group
    const rightShin = new THREE.Mesh(shinGeometry, boneMaterial);
    rightShin.position.set(0, -shinLength / 2, 0); // Relative to knee group
    
    // Apply varus/valgus angle (opposite for right side)
    rightShin.rotation.z = varusValgusRad;
    
    // Apply tibial torsion (opposite for right side)
    rightShin.rotation.y = -tibialTorsionRad * 0.5;
    
    rightShin.name = 'rightShin';
    rightKneeGroup.add(rightShin);
    bonesRef.current['rightShin'] = rightShin;
    
    // Right ankle group - for proper foot hierarchy
    const rightAnkleGroup = new THREE.Group();
    rightAnkleGroup.position.set(0, -shinLength, 0); // Position at ankle joint
    rightAnkleGroup.name = 'rightAnkleGroup';
    rightKneeGroup.add(rightAnkleGroup);
    
    // Add visible ankle joint
    const rightAnkleJoint = new THREE.Mesh(ankleJointGeometry, ankleJointMaterial);
    rightAnkleJoint.position.set(0, 0, 0); // At ankle group origin
    rightAnkleJoint.name = 'rightAnkleJoint';
    rightAnkleGroup.add(rightAnkleJoint);
    
    // Right foot attached to ankle group
    const rightFoot = new THREE.Mesh(footGeometry, boneMaterial);
    rightFoot.position.set(0, -0.03, 0.05); // Positioned directly at ankle with minimal gap
    rightFoot.name = 'rightFoot';
    rightAnkleGroup.add(rightFoot);
    bonesRef.current['rightFoot'] = rightFoot;
    
    skeleton.add(rightLegGroup);

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
    leftHip.position.set(-0.15, 0.85, 0); // Positioned to insert into hip socket
    leftHip.name = 'leftHip';
    skeleton.add(leftHip);

    const rightHip = new THREE.Mesh(femoralHeadGeometry, jointMaterial);
    rightHip.position.set(0.15, 0.85, 0); // Positioned to insert into hip socket
    rightHip.name = 'rightHip';
    skeleton.add(rightHip);

    // Knee joints - positioned between thigh and shin with varus/valgus adjustment
    const leftKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    const leftKneeOffset = Math.sin(-varusValgusRad) * shinLength * 0.5;
    leftKnee.position.set(-0.15 + leftKneeOffset, 0.85 - thighLength, 0); 
    leftKnee.name = 'leftKnee';
    skeleton.add(leftKnee);

    const rightKnee = new THREE.Mesh(jointGeometry, jointMaterial);
    const rightKneeOffset = Math.sin(varusValgusRad) * shinLength * 0.5;
    rightKnee.position.set(0.15 + rightKneeOffset, 0.85 - thighLength, 0);
    rightKnee.name = 'rightKnee';
    skeleton.add(rightKnee);
    
    // Patella (kneecap) with adjustable height
    const patellaGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const patellaOffset = (kneePathology.patellaHeight - 1.0) * 0.1; // Convert ratio to offset
    
    const leftPatella = new THREE.Mesh(patellaGeometry, boneMaterial);
    leftPatella.position.set(-0.15, 0.85 - thighLength + patellaOffset, 0.05); // Slightly forward
    leftPatella.scale.set(1.2, 1, 0.8); // Flattened shape
    leftPatella.name = 'leftPatella';
    skeleton.add(leftPatella);
    
    const rightPatella = new THREE.Mesh(patellaGeometry, boneMaterial);
    rightPatella.position.set(0.15, 0.85 - thighLength + patellaOffset, 0.05); // Slightly forward
    rightPatella.scale.set(1.2, 1, 0.8); // Flattened shape
    rightPatella.name = 'rightPatella';
    skeleton.add(rightPatella);

    // Ankle joints - positioned at the end of shin
    const leftAnkle = new THREE.Mesh(jointGeometry, jointMaterial);
    leftAnkle.position.set(-0.15, 0.85 - thighLength - shinLength, 0); // Adjusted for raised hip
    leftAnkle.name = 'leftAnkle';
    skeleton.add(leftAnkle);

    const rightAnkle = new THREE.Mesh(jointGeometry, jointMaterial);
    rightAnkle.position.set(0.15, 0.85 - thighLength - shinLength, 0); // Adjusted for raised hip
    rightAnkle.name = 'rightAnkle';
    skeleton.add(rightAnkle);

    // Note: Feet are now created as part of the ankle groups above

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

    // Check for physical examination tests first
    const isPhysicalTest = lowerText.includes('test') || lowerText.includes('examination') || lowerText.includes('assessment');
    
    if (isPhysicalTest && lowerText.includes('shoulder abduction')) {
      animationFrames = generateShoulderAbductionTest();
    } else if (isPhysicalTest && lowerText.includes('shoulder flexion')) {
      animationFrames = generateShoulderFlexionTest();
    } else if (isPhysicalTest && lowerText.includes('shoulder external rotation')) {
      animationFrames = generateShoulderExternalRotationTest();
    } else if (isPhysicalTest && lowerText.includes('shoulder internal rotation')) {
      animationFrames = generateShoulderInternalRotationTest();
    } else if (isPhysicalTest && lowerText.includes('scapula protraction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('scapula retraction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('knee extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('knee flexion')) {
      animationFrames = generateKneeFlexionTest();
    } else if (isPhysicalTest && lowerText.includes('hip flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip abduction')) {
      animationFrames = generateHipAbductionTest();
    } else if (isPhysicalTest && lowerText.includes('hip adduction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip internal rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip external rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle dorsiflexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle plantarflexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('cervical flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('cervical extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('cervical rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('thoracic rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('lumbar flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('lumbar extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('elbow flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('elbow extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('wrist flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('wrist extension')) {
      animationFrames = generateGeneralMovementAnimation();
    }
    // Exercise movements
    else if (lowerText.includes('squat')) {
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
    } else if (lowerText.includes('shoulder elevation') || lowerText.includes('arm raise')) {
      animationFrames = generateShoulderElevationAnimation();
    } else if (bodyParts.shoulder && limitations.limited) {
      animationFrames = generateShoulderLimitationAnimation();
    } else if (bodyParts.back && limitations.stiff) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (bodyParts.knee && limitations.pain) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (bodyParts.hip) {
      animationFrames = generateHipAbductionAnimation();
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
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.8] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
          leftScapula: { position: [-0.22, 1.58, -0.10], rotation: [0.1, -0.4, -0.2] }, // Upward rotation and protraction
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 2000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 1.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.05] },
          leftScapula: { position: [-0.22, 1.60, -0.08], rotation: [0.2, -0.5, -0.3] }, // More upward rotation
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.2] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.8] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
          leftScapula: { position: [-0.22, 1.58, -0.10], rotation: [0.1, -0.4, -0.2] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, -0.1] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 4000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.2] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.2] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          head: { position: [0, 2.1, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  const generateShoulderExternalRotationTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - arms at sides with elbows at 90 degrees
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] }, // Elbow bent 90 degrees
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // External rotation - upper arms rotate outward
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, -1.0, 0] }, // External rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 1.0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] }, // Maintain elbow bend
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.14], rotation: [0, -0.4, -0.1] }, // Slight retraction
          rightScapula: { position: [0.22, 1.55, -0.14], rotation: [0, 0.4, 0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      }
    ];
  };

  const generateShoulderInternalRotationTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - arms at sides with elbows at 90 degrees
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] }, // Elbow bent 90 degrees
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Internal rotation - upper arms rotate inward
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 1.0, 0] }, // Internal rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, -1.0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] }, // Maintain elbow bend
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.10], rotation: [0, -0.2, 0.1] }, // Slight protraction
          rightScapula: { position: [0.22, 1.55, -0.10], rotation: [0, 0.2, -0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      }
    ];
  };

  const generateShoulderFlexionTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // 90 degree flexion (arms forward)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.57, -0.11], rotation: [0.2, -0.3, -0.1] }, // Slight protraction
          rightScapula: { position: [0.22, 1.57, -0.11], rotation: [0.2, 0.3, 0.1] }
        }
      },
      {
        time: 3000,
        joints: {
          // 180 degree flexion (arms overhead)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-3.14, 0, 0] }, // 180 degrees
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-3.14, 0, 0] },
          leftClavicle: { position: [-0.13, 1.72, 0], rotation: [-0.1, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.72, 0], rotation: [-0.1, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.24, 1.6, -0.09], rotation: [0.4, -0.4, -0.2] }, // Upward rotation
          rightScapula: { position: [0.24, 1.6, -0.09], rotation: [0.4, 0.4, 0.2] }
        }
      },
      {
        time: 4500,
        joints: {
          // Return to start
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      }
    ];
  }

  const generateShoulderElevationAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 1.57] }, // 90 degrees
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -1.57] },
          leftScapula: { position: [-0.20, 1.62, -0.08], rotation: [0.3, -0.5, -0.4] }, // Upward rotation and elevation
          rightScapula: { position: [0.20, 1.62, -0.08], rotation: [0.3, 0.5, 0.4] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 3.14] }, // 180 degrees overhead
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -3.14] },
          leftScapula: { position: [-0.18, 1.68, -0.05], rotation: [0.5, -0.6, -0.6] }, // Maximum upward rotation
          rightScapula: { position: [0.18, 1.68, -0.05], rotation: [0.5, 0.6, 0.6] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 1.57] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -1.57] },
          leftScapula: { position: [-0.20, 1.62, -0.08], rotation: [0.3, -0.5, -0.4] },
          rightScapula: { position: [0.20, 1.62, -0.08], rotation: [0.3, 0.5, 0.4] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.3, 0, 0.1] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.1, 0, -0.05] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-0.6, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-0.3, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0.05] }
        }
      },
      {
        time: 2000,
        joints: {
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.2, 0, 0.05] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.3, 0, -0.1] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-0.4, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-0.6, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, -0.05] }
        }
      },
      {
        time: 3000,
        joints: {
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.1, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.1, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-0.2, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-0.2, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4000,
        joints: {
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0.2, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 2000,
        joints: {
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  }

  const generateShoulderAbductionTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - arms at sides
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.1] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
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
        time: 1500,
        joints: {
          // 90 degree abduction
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, -1.57] }, // 90 degrees out
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 1.57] },
          leftClavicle: { position: [-0.13, 1.72, 0], rotation: [0, 0, -0.6] }, // Slight elevation
          rightClavicle: { position: [0.13, 1.72, 0], rotation: [0, 0, 0.6] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.24, 1.58, -0.10], rotation: [0.3, -0.4, -0.3] }, // Upward rotation
          rightScapula: { position: [0.24, 1.58, -0.10], rotation: [0.3, 0.4, 0.3] }
        }
      },
      {
        time: 3000,
        joints: {
          // Full 180 degree abduction (arms overhead)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, -3.14] }, // 180 degrees
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 3.14] },
          leftClavicle: { position: [-0.13, 1.75, 0], rotation: [0, 0, -0.7] }, // More elevation
          rightClavicle: { position: [0.13, 1.75, 0], rotation: [0, 0, 0.7] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.26, 1.62, -0.08], rotation: [0.5, -0.5, -0.4] }, // Maximum upward rotation
          rightScapula: { position: [0.26, 1.62, -0.08], rotation: [0.5, 0.5, 0.4] }
        }
      },
      {
        time: 4500,
        joints: {
          // Return to 90 degrees
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, -1.57] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 1.57] },
          leftClavicle: { position: [-0.13, 1.72, 0], rotation: [0, 0, -0.6] },
          rightClavicle: { position: [0.13, 1.72, 0], rotation: [0, 0, 0.6] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.24, 1.58, -0.10], rotation: [0.3, -0.4, -0.3] },
          rightScapula: { position: [0.24, 1.58, -0.10], rotation: [0.3, 0.4, 0.3] }
        }
      },
      {
        time: 6000,
        joints: {
          // Return to start
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.1] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
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

  const generateSquatAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.0, 0, 0] }, // Thigh horizontal
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.3, 0, 0] }, // Shin angle
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.3, 0, 0] },
          leftHip: { position: [-0.15, 0.5, -0.2], rotation: [0, 0, 0] }, // Follow pelvis position
          rightHip: { position: [0.15, 0.5, -0.2], rotation: [0, 0, 0] }, // Follow pelvis position
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.4, 0, 0] }, // Thigh past horizontal
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.4, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.5, 0, 0] }, // Full knee bend
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.5, 0, 0] },
          leftHip: { position: [-0.15, 0.2, -0.3], rotation: [0, 0, 0] }, // Follow pelvis position
          rightHip: { position: [0.15, 0.2, -0.3], rotation: [0, 0, 0] }, // Follow pelvis position
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.3, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.3, 0, 0] },
          leftHip: { position: [-0.15, 0.5, -0.2], rotation: [0, 0, 0] }, // Follow pelvis position
          rightHip: { position: [0.15, 0.5, -0.2], rotation: [0, 0, 0] }, // Follow pelvis position
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.2, 0, 0] }, // Front leg bent
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.4, 0, 0] }, // Back leg extended
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.4, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0.3, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Arms raised forward to 90 degrees (shoulder flexion)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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

  const generateHipAbductionTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Right leg abducted to 30 degrees
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0.52] }, // 30 degrees abduction
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          // Maximum abduction (45 degrees)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0.78] }, // 45 degrees
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4500,
        joints: {
          // Return to start
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
  }

  const generateHipAbductionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0.5] }, // Leg out to side
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, -0.05] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, -0.8] }, // Arms for balance
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0.2] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] }
        }
      }
    ];
  };

  const generateKneeFlexionTest = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Right knee at 90 degrees flexion
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.57, 0, 0] }, // 90 degree bend
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 3000,
        joints: {
          // Maximum flexion (135 degrees)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [2.35, 0, 0] }, // 135 degrees
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4500,
        joints: {
          // Return to start
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  }

  const generateKneeFlexionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - standing
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [2.0, 0, 0] }, // Knee bent
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [2.0, 0, 0] }, // Knee bent
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.2, 0, 0] }, // Knee raised to 90 degrees
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.2, 0, 0] }, // Knee raised to 90 degrees
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.2, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-0.3, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-0.3, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0.2, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0.2, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.57, 0, 0] }, // Knees bent
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.57, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.2, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.2, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-1.57, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-1.57, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [-1.57, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [-0.7, 0, 0] }, // Right thigh lifted
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Right shin vertical
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [-0.3, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.7, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.7, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.7, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [3.14, 0, 0] }, // Extended back
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [3.14, 0, 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0.7, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0.7, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
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

  // Animation playback effect
  useEffect(() => {
    if (!isPlaying || animationData.length === 0) return;

    let animationFrameId: number;
    let startTime = Date.now();

    const updateAnimation = () => {
      const elapsedTime = Date.now() - startTime;
      const totalDuration = Math.max(...animationData.map(frame => frame.time));
      const loopTime = elapsedTime % totalDuration;

      setCurrentTime(loopTime);
      if (onTimeUpdate) {
        onTimeUpdate(loopTime);
      }

      // Find current and next frames
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
  }, [animationData, isPlaying, onTimeUpdate]);

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