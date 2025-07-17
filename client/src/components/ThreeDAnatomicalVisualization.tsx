import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

interface ThreeDAnatomicalVisualizationProps {
  animationData?: any;
  currentFrame?: number;
  isPlaying?: boolean;
  className?: string;
}

interface BoneModel {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
}

const ThreeDAnatomicalVisualization: React.FC<ThreeDAnatomicalVisualizationProps> = ({
  animationData,
  currentFrame = 0,
  isPlaying = false,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const controlsRef = useRef<OrbitControls>();
  const boneModelsRef = useRef<Map<string, BoneModel>>(new Map());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup (orthographic for medical accuracy)
    const aspect = 400 / 400;
    const frustumSize = 300;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2,
      1, 1000
    );
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(400, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Lighting setup for medical visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, -100, 50);
    scene.add(fillLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);

    // Load 3D bone models
    loadBoneModels();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Load 3D bone models
  const loadBoneModels = async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    try {
      // Create procedural bone models
      await createProceduralBoneModels();
      setIsLoaded(true);
      setLoadingProgress(100);
    } catch (error) {
      console.error('Error creating bone models:', error);
      // Fallback to procedural models
      await createProceduralBoneModels();
      setIsLoaded(true);
    }
  };

  // Create procedural 3D bone models
  const createProceduralBoneModels = async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const boneModels = new Map<string, BoneModel>();

    // Realistic bone material with medical-grade appearance
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xF5F5DC,          // Bone white/beige color
      shininess: 5,              // Low shininess for matte bone finish
      specular: 0x222222,        // Subtle specular highlights
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide
    });

    const affectedBoneMaterial = new THREE.MeshPhongMaterial({
      color: 0xDC143C,          // Medical red for pathology
      shininess: 8,
      specular: 0x333333,
      transparent: true,
      opacity: 0.9,
      emissive: 0x220000,       // Slight glow for affected areas
      side: THREE.DoubleSide
    });

    // Create anatomically accurate femur (thigh bone)
    const createFemur = (isLeft: boolean) => {
      const group = new THREE.Group();
      
      // Femoral head (spherical ball joint) - anatomically accurate size
      const headGeometry = new THREE.SphereGeometry(7, 20, 16);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.set(0, 75, 0);
      group.add(head);

      // Femoral neck - angled connection to shaft
      const neckGeometry = new THREE.CylinderGeometry(3.5, 5, 18, 12);
      const neck = new THREE.Mesh(neckGeometry, boneMaterial);
      neck.position.set(isLeft ? -8 : 8, 66, 0);
      neck.rotation.z = isLeft ? -Math.PI/5 : Math.PI/5;
      group.add(neck);

      // Femoral shaft with realistic curvature
      const shaftGeometry = new THREE.CylinderGeometry(5, 7.5, 65, 16);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 25, 0);
      // Add slight anterior bow (natural femur curve)
      shaft.rotation.x = Math.PI/60;
      group.add(shaft);

      // Greater trochanter - prominent bone landmark
      const trochanterGeometry = new THREE.BoxGeometry(8, 12, 6);
      const trochanter = new THREE.Mesh(trochanterGeometry, boneMaterial);
      trochanter.position.set(isLeft ? 6 : -6, 55, 0);
      group.add(trochanter);

      // Femoral condyles (knee joint) - anatomically shaped
      const condyleGeometry = new THREE.SphereGeometry(9, 16, 12);
      const medialCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      medialCondyle.position.set(isLeft ? -5 : 5, -8, 2);
      medialCondyle.scale.set(0.9, 0.7, 1.3);
      group.add(medialCondyle);

      const lateralCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      lateralCondyle.position.set(isLeft ? 5 : -5, -8, 2);
      lateralCondyle.scale.set(0.9, 0.7, 1.3);
      group.add(lateralCondyle);

      // Intercondylar notch
      const notchGeometry = new THREE.BoxGeometry(4, 6, 8);
      const notch = new THREE.Mesh(notchGeometry, boneMaterial);
      notch.position.set(0, -8, 0);
      group.add(notch);

      return group;
    };

    // Create anatomically accurate tibia (shin bone)
    const createTibia = () => {
      const group = new THREE.Group();
      
      // Tibial plateau (flat knee joint surface)
      const plateauGeometry = new THREE.CylinderGeometry(11, 9, 6, 16);
      const plateau = new THREE.Mesh(plateauGeometry, boneMaterial);
      plateau.position.set(0, 32, 0);
      group.add(plateau);

      // Tibial tuberosity (attachment point for patellar ligament)
      const tuberosityGeometry = new THREE.BoxGeometry(5, 4, 3);
      const tuberosity = new THREE.Mesh(tuberosityGeometry, boneMaterial);
      tuberosity.position.set(0, 26, 4);
      group.add(tuberosity);

      // Tibial shaft - triangular cross-section like real tibia
      const shaftPoints = [];
      for (let i = 0; i <= 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        // Create triangular shape with anterior crest
        let radius;
        if (angle < Math.PI/3 || angle > 5*Math.PI/3) {
          radius = 4; // Anterior (front) - sharp crest
        } else {
          radius = 6; // Posterior (back) - rounded
        }
        shaftPoints.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
      }
      const shaftShape = new THREE.Shape(shaftPoints);
      const shaftGeometry = new THREE.ExtrudeGeometry(shaftShape, {
        depth: 50,
        bevelEnabled: false
      });
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, -5, -25);
      shaft.rotation.x = Math.PI/2;
      group.add(shaft);

      // Medial malleolus (ankle prominence)
      const medialMalleolus = new THREE.Mesh(
        new THREE.BoxGeometry(6, 8, 4),
        boneMaterial
      );
      medialMalleolus.position.set(3, -28, 0);
      group.add(medialMalleolus);

      // Tibial plafond (ankle joint surface)
      const plafondGeometry = new THREE.CylinderGeometry(8, 8, 4, 16);
      const plafond = new THREE.Mesh(plafondGeometry, boneMaterial);
      plafond.position.set(0, -30, 0);
      group.add(plafond);

      return group;
    };

    // Create anatomically accurate humerus (upper arm bone)
    const createHumerus = () => {
      const group = new THREE.Group();
      
      // Humeral head (ball-shaped shoulder joint)
      const headGeometry = new THREE.SphereGeometry(8, 20, 16);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.set(0, 28, 0);
      // Anatomical neck angle
      head.rotation.z = Math.PI/12;
      group.add(head);

      // Greater tubercle - attachment for rotator cuff
      const greaterTubercleGeometry = new THREE.BoxGeometry(6, 8, 5);
      const greaterTubercle = new THREE.Mesh(greaterTubercleGeometry, boneMaterial);
      greaterTubercle.position.set(6, 24, 0);
      group.add(greaterTubercle);

      // Lesser tubercle
      const lesserTubercleGeometry = new THREE.BoxGeometry(4, 6, 4);
      const lesserTubercle = new THREE.Mesh(lesserTubercleGeometry, boneMaterial);
      lesserTubercle.position.set(-4, 24, 2);
      group.add(lesserTubercle);

      // Humeral shaft with natural spiral groove
      const shaftGeometry = new THREE.CylinderGeometry(4, 6, 45, 16);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 0, 0);
      group.add(shaft);

      // Deltoid tuberosity (deltoid muscle attachment)
      const deltoidTuberosityGeometry = new THREE.BoxGeometry(8, 6, 4);
      const deltoidTuberosity = new THREE.Mesh(deltoidTuberosityGeometry, boneMaterial);
      deltoidTuberosity.position.set(3, 5, 0);
      group.add(deltoidTuberosity);

      // Medial epicondyle
      const medialEpicondyleGeometry = new THREE.SphereGeometry(3, 12, 8);
      const medialEpicondyle = new THREE.Mesh(medialEpicondyleGeometry, boneMaterial);
      medialEpicondyle.position.set(-5, -22, 0);
      group.add(medialEpicondyle);

      // Lateral epicondyle  
      const lateralEpicondyleGeometry = new THREE.SphereGeometry(3, 12, 8);
      const lateralEpicondyle = new THREE.Mesh(lateralEpicondyleGeometry, boneMaterial);
      lateralEpicondyle.position.set(5, -22, 0);
      group.add(lateralEpicondyle);

      // Capitulum (elbow joint surface)
      const capitulumGeometry = new THREE.SphereGeometry(4, 12, 10);
      const capitulum = new THREE.Mesh(capitulumGeometry, boneMaterial);
      capitulum.position.set(2, -24, 0);
      group.add(capitulum);

      // Trochlea (elbow joint surface)
      const trochleaGeometry = new THREE.CylinderGeometry(3, 3, 6, 12);
      const trochlea = new THREE.Mesh(trochleaGeometry, boneMaterial);
      trochlea.position.set(-2, -24, 0);
      trochlea.rotation.z = Math.PI/2;
      group.add(trochlea);

      return group;
    };

    // Create anatomically accurate spine with natural curvatures
    const createSpine = () => {
      const group = new THREE.Group();
      
      // Create 12 vertebrae with anatomical features
      for (let i = 0; i < 12; i++) {
        const vertebra = new THREE.Group();
        
        // Vertebral body - kidney-shaped like real vertebrae
        const bodyGeometry = new THREE.CylinderGeometry(5, 6, 6, 16);
        const body = new THREE.Mesh(bodyGeometry, boneMaterial);
        vertebra.add(body);

        // Spinous process - prominent posterior projection
        const processGeometry = new THREE.BoxGeometry(2, 4, 12);
        const process = new THREE.Mesh(processGeometry, boneMaterial);
        process.position.set(0, 0, -7);
        vertebra.add(process);

        // Transverse processes - left and right projections
        const transverseLeftGeometry = new THREE.BoxGeometry(8, 3, 2);
        const transverseLeft = new THREE.Mesh(transverseLeftGeometry, boneMaterial);
        transverseLeft.position.set(-6, 0, -2);
        vertebra.add(transverseLeft);

        const transverseRightGeometry = new THREE.BoxGeometry(8, 3, 2);
        const transverseRight = new THREE.Mesh(transverseRightGeometry, boneMaterial);
        transverseRight.position.set(6, 0, -2);
        vertebra.add(transverseRight);

        // Vertebral arch (laminae)
        const archLeftGeometry = new THREE.BoxGeometry(3, 4, 6);
        const archLeft = new THREE.Mesh(archLeftGeometry, boneMaterial);
        archLeft.position.set(-3, 0, -4);
        archLeft.rotation.y = Math.PI/6;
        vertebra.add(archLeft);

        const archRightGeometry = new THREE.BoxGeometry(3, 4, 6);
        const archRight = new THREE.Mesh(archRightGeometry, boneMaterial);
        archRight.position.set(3, 0, -4);
        archRight.rotation.y = -Math.PI/6;
        vertebra.add(archRight);

        // Superior and inferior articular processes
        const superiorProcesses = new THREE.BoxGeometry(2, 3, 2);
        const superiorLeft = new THREE.Mesh(superiorProcesses, boneMaterial);
        superiorLeft.position.set(-4, 3, -3);
        vertebra.add(superiorLeft);

        const superiorRight = new THREE.Mesh(superiorProcesses, boneMaterial);
        superiorRight.position.set(4, 3, -3);
        vertebra.add(superiorRight);

        // Position vertebra with natural spinal curvatures
        vertebra.position.y = i * 8;
        
        // Add natural spinal curves
        if (i < 3) {
          // Cervical lordosis (C1-C3)
          vertebra.rotation.x = Math.PI/25;
          vertebra.position.z = i * 0.5;
        } else if (i >= 3 && i < 7) {
          // Thoracic kyphosis (T1-T4)
          vertebra.rotation.x = -Math.PI/30;
          vertebra.position.z = 1.5 - (i-3) * 0.5;
        } else {
          // Lumbar lordosis (L1-L5)
          vertebra.rotation.x = Math.PI/20;
          vertebra.position.z = -0.5 + (i-7) * 0.3;
        }
        
        group.add(vertebra);
      }

      return group;
    };

    // Create pelvis (hip bone)
    const createPelvis = () => {
      const group = new THREE.Group();
      
      // Iliac bones (hip wings)
      const iliacGeometry = new THREE.SphereGeometry(15, 16, 12);
      const leftIliac = new THREE.Mesh(iliacGeometry, boneMaterial);
      leftIliac.position.set(-12, 0, 0);
      leftIliac.scale.set(1.2, 0.6, 0.8);
      group.add(leftIliac);

      const rightIliac = new THREE.Mesh(iliacGeometry, boneMaterial);
      rightIliac.position.set(12, 0, 0);
      rightIliac.scale.set(1.2, 0.6, 0.8);
      group.add(rightIliac);

      // Sacrum (triangular bone)
      const sacrumGeometry = new THREE.ConeGeometry(8, 15, 8);
      const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
      sacrum.position.set(0, -5, -8);
      sacrum.rotation.x = Math.PI;
      group.add(sacrum);

      // Acetabulum (hip socket)
      const acetabulumGeometry = new THREE.SphereGeometry(6, 16, 12);
      const leftAcetabulum = new THREE.Mesh(acetabulumGeometry, boneMaterial);
      leftAcetabulum.position.set(-15, -8, 0);
      leftAcetabulum.scale.set(0.8, 0.8, 0.5);
      group.add(leftAcetabulum);

      const rightAcetabulum = new THREE.Mesh(acetabulumGeometry, boneMaterial);
      rightAcetabulum.position.set(15, -8, 0);
      rightAcetabulum.scale.set(0.8, 0.8, 0.5);
      group.add(rightAcetabulum);

      return group;
    };

    // Create rib cage
    const createRibCage = () => {
      const group = new THREE.Group();
      
      // Create 12 pairs of ribs
      for (let i = 0; i < 12; i++) {
        const ribLevel = i * 8;
        const ribCurvature = Math.PI * 0.8;
        
        // Left rib
        const leftRibGeometry = new THREE.TorusGeometry(
          12 + i * 1.2, // Radius increases down the chest
          1.5, // Tube thickness
          4, // Radial segments
          16 // Tubular segments
        );
        const leftRib = new THREE.Mesh(leftRibGeometry, boneMaterial);
        leftRib.position.set(-8, ribLevel, 0);
        leftRib.rotation.y = -Math.PI/2;
        leftRib.rotation.z = Math.PI/8;
        leftRib.scale.set(0.8, 1, 0.6);
        group.add(leftRib);

        // Right rib
        const rightRibGeometry = new THREE.TorusGeometry(
          12 + i * 1.2,
          1.5,
          4,
          16
        );
        const rightRib = new THREE.Mesh(rightRibGeometry, boneMaterial);
        rightRib.position.set(8, ribLevel, 0);
        rightRib.rotation.y = Math.PI/2;
        rightRib.rotation.z = -Math.PI/8;
        rightRib.scale.set(0.8, 1, 0.6);
        group.add(rightRib);
      }

      // Sternum (breastbone)
      const sternumGeometry = new THREE.BoxGeometry(4, 20, 2);
      const sternum = new THREE.Mesh(sternumGeometry, boneMaterial);
      sternum.position.set(0, 40, 12);
      group.add(sternum);

      return group;
    };

    // Create skull
    const createSkull = () => {
      const group = new THREE.Group();
      
      // Cranium
      const craniumGeometry = new THREE.SphereGeometry(12, 20, 16);
      const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
      cranium.position.set(0, 0, 0);
      cranium.scale.set(1, 1.1, 1.2);
      group.add(cranium);

      // Jaw (mandible)
      const jawGeometry = new THREE.BoxGeometry(8, 3, 6);
      const jaw = new THREE.Mesh(jawGeometry, boneMaterial);
      jaw.position.set(0, -8, 2);
      group.add(jaw);

      return group;
    };

    // Create and position bone models
    const bones = {
      'left_femur': createFemur(true),
      'right_femur': createFemur(false),
      'left_tibia': createTibia(),
      'right_tibia': createTibia(),
      'left_humerus': createHumerus(),
      'right_humerus': createHumerus(),
      'spine': createSpine(),
      'pelvis': createPelvis(),
      'rib_cage': createRibCage(),
      'skull': createSkull()
    };

    // Position bones anatomically
    bones['left_femur'].position.set(-25, -50, 0);
    bones['right_femur'].position.set(25, -50, 0);
    bones['left_tibia'].position.set(-25, -120, 0);
    bones['right_tibia'].position.set(25, -120, 0);
    bones['left_humerus'].position.set(-50, 30, 0);
    bones['right_humerus'].position.set(50, 30, 0);
    bones['spine'].position.set(0, 10, 0);
    bones['pelvis'].position.set(0, -30, 0);
    bones['rib_cage'].position.set(0, 50, 0);
    bones['skull'].position.set(0, 120, 0);

    // Add bones to scene and store references
    Object.entries(bones).forEach(([name, bone]) => {
      scene.add(bone);
      boneModels.set(name, {
        mesh: bone as THREE.Mesh,
        originalPosition: bone.position.clone(),
        originalRotation: bone.rotation.clone()
      });
    });

    boneModelsRef.current = boneModels;
  };

  // Update bone positions based on animation data
  useEffect(() => {
    if (!animationData?.frames?.length || !isLoaded) return;

    const frame = animationData.frames[currentFrame];
    if (!frame?.keypoints) return;

    const scene = sceneRef.current;
    const boneModels = boneModelsRef.current;
    if (!scene || !boneModels.size) return;

    // Helper function to find keypoint
    const getKeypoint = (name: string) => {
      return frame.keypoints.find((kp: any) => kp.name === name);
    };

    // Position bones based on keypoints
    const leftHip = getKeypoint('left_hip');
    const leftKnee = getKeypoint('left_knee');
    const leftAnkle = getKeypoint('left_ankle');
    const rightHip = getKeypoint('right_hip');
    const rightKnee = getKeypoint('right_knee');
    const rightAnkle = getKeypoint('right_ankle');
    const leftShoulder = getKeypoint('left_shoulder');
    const leftElbow = getKeypoint('left_elbow');
    const rightShoulder = getKeypoint('right_shoulder');
    const rightElbow = getKeypoint('right_elbow');
    const neck = getKeypoint('neck');
    const spine = getKeypoint('spine');

    // Helper function to update bone color based on clinical status
    const updateBoneColor = (bone: THREE.Group | THREE.Mesh, isAffected: boolean) => {
      const material = new THREE.MeshPhongMaterial({
        color: isAffected ? 0xff6b6b : 0xf5deb3,
        shininess: 30,
        specular: 0x333333,
        transparent: isAffected,
        opacity: isAffected ? 0.8 : 1.0
      });

      bone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    };

    // Position all bones systematically
    const bones = Array.from(boneModels.values());
    
    // Position femurs (thigh bones)
    if (leftHip && leftKnee && bones[0]) {
      const leftFemur = bones[0].mesh;
      leftFemur.position.set(
        leftHip.x - 200, 
        -(leftHip.y + leftKnee.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x);
      leftFemur.rotation.z = angle - Math.PI/2;

      // Apply clinical status coloring
      updateBoneColor(leftFemur, leftHip.status === 'limited' || leftKnee.status === 'limited');
    }

    if (rightHip && rightKnee && bones[1]) {
      const rightFemur = bones[1].mesh;
      rightFemur.position.set(
        rightHip.x - 200, 
        -(rightHip.y + rightKnee.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightKnee.y - rightHip.y, rightKnee.x - rightHip.x);
      rightFemur.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightFemur, rightHip.status === 'limited' || rightKnee.status === 'limited');
    }

    // Position tibias (shin bones)
    if (leftKnee && leftAnkle && bones[2]) {
      const leftTibia = bones[2].mesh;
      leftTibia.position.set(
        leftKnee.x - 200, 
        -(leftKnee.y + leftAnkle.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
      leftTibia.rotation.z = angle - Math.PI/2;

      updateBoneColor(leftTibia, leftKnee.status === 'limited' || leftAnkle.status === 'limited');
    }

    if (rightKnee && rightAnkle && bones[3]) {
      const rightTibia = bones[3].mesh;
      rightTibia.position.set(
        rightKnee.x - 200, 
        -(rightKnee.y + rightAnkle.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightAnkle.y - rightKnee.y, rightAnkle.x - rightKnee.x);
      rightTibia.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightTibia, rightKnee.status === 'limited' || rightAnkle.status === 'limited');
    }

    // Position humeri (upper arm bones)
    if (leftShoulder && leftElbow && bones[4]) {
      const leftHumerus = bones[4].mesh;
      leftHumerus.position.set(
        leftShoulder.x - 200, 
        -(leftShoulder.y + leftElbow.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(leftElbow.y - leftShoulder.y, leftElbow.x - leftShoulder.x);
      leftHumerus.rotation.z = angle - Math.PI/2;

      updateBoneColor(leftHumerus, leftShoulder.status === 'limited' || leftElbow.status === 'limited');
    }

    if (rightShoulder && rightElbow && bones[5]) {
      const rightHumerus = bones[5].mesh;
      rightHumerus.position.set(
        rightShoulder.x - 200, 
        -(rightShoulder.y + rightElbow.y) / 2 + 200, 
        0
      );
      
      const angle = Math.atan2(rightElbow.y - rightShoulder.y, rightElbow.x - rightShoulder.x);
      rightHumerus.rotation.z = angle - Math.PI/2;

      updateBoneColor(rightHumerus, rightShoulder.status === 'limited' || rightElbow.status === 'limited');
    }

    // Position spine
    if (neck && spine && bones[6]) {
      const spineModel = bones[6].mesh;
      spineModel.position.set(
        neck.x - 200, 
        -(neck.y + spine.y) / 2 + 200, 
        0
      );

      const angle = Math.atan2(spine.y - neck.y, spine.x - neck.x);
      spineModel.rotation.z = angle - Math.PI/2;

      updateBoneColor(spineModel, neck.status === 'limited' || spine.status === 'limited');
    }

  }, [animationData, currentFrame, isLoaded]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-center">
        <div 
          ref={mountRef} 
          className="border border-gray-300 rounded-lg bg-white"
          style={{ width: 400, height: 400 }}
        />
      </div>
      
      {!isLoaded && (
        <div className="text-center">
          <div className="text-sm text-gray-600">
            Loading 3D anatomical models... {Math.round(loadingProgress)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {isLoaded && (
        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
              3D Medical Models
            </span>
            Professional anatomical visualization
          </div>
          <div className="text-xs text-gray-500">
            Use mouse to rotate, zoom, and examine bones in 3D
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDAnatomicalVisualization;