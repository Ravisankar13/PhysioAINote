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

    // Medical-grade bone material matching reference image
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xF5DEB3,          // Exact bone cream color from reference
      shininess: 2,              // Very low shininess for authentic bone finish
      specular: 0x111111,        // Minimal specular highlights
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide
    });

    const affectedBoneMaterial = new THREE.MeshPhongMaterial({
      color: 0xDC143C,          // Medical red for pathology
      shininess: 5,
      specular: 0x222222,
      transparent: true,
      opacity: 0.85,
      emissive: 0x330000,       // Slight glow for affected areas
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

      // Enhanced femoral condyles (knee joint) - anatomically accurate
      const createFemoralCondyles = () => {
        const condylesGroup = new THREE.Group();
        
        // Medial femoral condyle (larger, more prominent)
        const medialCondyleGeometry = new THREE.SphereGeometry(10, 20, 16);
        const medialCondyle = new THREE.Mesh(medialCondyleGeometry, boneMaterial);
        medialCondyle.position.set(isLeft ? -6 : 6, -32, 3);
        medialCondyle.scale.set(0.8, 0.6, 1.4);
        condylesGroup.add(medialCondyle);

        // Lateral femoral condyle (smaller, rounder)
        const lateralCondyleGeometry = new THREE.SphereGeometry(9, 20, 16);
        const lateralCondyle = new THREE.Mesh(lateralCondyleGeometry, boneMaterial);
        lateralCondyle.position.set(isLeft ? 6 : -6, -32, 3);
        lateralCondyle.scale.set(0.8, 0.6, 1.3);
        condylesGroup.add(lateralCondyle);

        // Intercondylar notch (deep groove between condyles)
        const notchGeometry = new THREE.BoxGeometry(6, 8, 12);
        const notch = new THREE.Mesh(notchGeometry, boneMaterial);
        notch.position.set(0, -32, 0);
        condylesGroup.add(notch);

        // Patellar groove (anterior surface for kneecap)
        const grooveGeometry = new THREE.CylinderGeometry(8, 8, 10, 16);
        const groove = new THREE.Mesh(grooveGeometry, boneMaterial);
        groove.position.set(0, -28, 8);
        groove.rotation.x = Math.PI/2;
        groove.scale.set(1, 0.8, 0.6);
        condylesGroup.add(groove);

        return condylesGroup;
      };

      const femoralCondyles = createFemoralCondyles();
      group.add(femoralCondyles);

      return group;
    };

    // Create anatomically accurate tibia matching reference image
    const createTibia = () => {
      const group = new THREE.Group();
      
      // Enhanced tibial plateau - articulates with femoral condyles
      const createTibialPlateau = () => {
        const plateauGroup = new THREE.Group();
        
        // Main tibial plateau (broad, flat surface)
        const plateauGeometry = new THREE.CylinderGeometry(14, 10, 10, 20);
        const plateau = new THREE.Mesh(plateauGeometry, boneMaterial);
        plateau.position.set(0, 35, 0);
        plateauGroup.add(plateau);

        // Medial tibial condyle (larger, oval-shaped)
        const medialCondyleGeometry = new THREE.SphereGeometry(7, 16, 12);
        const medialCondyle = new THREE.Mesh(medialCondyleGeometry, boneMaterial);
        medialCondyle.position.set(5, 38, 3);
        medialCondyle.scale.set(1.2, 0.4, 1.5);
        plateauGroup.add(medialCondyle);

        // Lateral tibial condyle (smaller, more circular)
        const lateralCondyleGeometry = new THREE.SphereGeometry(6, 16, 12);
        const lateralCondyle = new THREE.Mesh(lateralCondyleGeometry, boneMaterial);
        lateralCondyle.position.set(-5, 38, 3);
        lateralCondyle.scale.set(1.1, 0.4, 1.3);
        plateauGroup.add(lateralCondyle);

        // Intercondylar eminence (central spine between condyles)
        const eminenceGeometry = new THREE.BoxGeometry(4, 6, 8);
        const eminence = new THREE.Mesh(eminenceGeometry, boneMaterial);
        eminence.position.set(0, 38, 0);
        plateauGroup.add(eminence);

        // Tibial spines (medial and lateral intercondylar tubercles)
        const spineGeometry = new THREE.ConeGeometry(1.5, 4, 8);
        const medialSpine = new THREE.Mesh(spineGeometry, boneMaterial);
        medialSpine.position.set(2, 40, 0);
        plateauGroup.add(medialSpine);

        const lateralSpine = new THREE.Mesh(spineGeometry, boneMaterial);
        lateralSpine.position.set(-2, 40, 0);
        plateauGroup.add(lateralSpine);

        return plateauGroup;
      };

      const tibialPlateau = createTibialPlateau();
      group.add(tibialPlateau);

      // Tibial tuberosity (prominent anterior projection)
      const tuberosityGeometry = new THREE.BoxGeometry(6, 5, 4);
      const tuberosity = new THREE.Mesh(tuberosityGeometry, boneMaterial);
      tuberosity.position.set(0, 28, 6);
      group.add(tuberosity);

      // Tibial shaft with realistic contours matching reference image
      const createTibialShaft = () => {
        const shaftGroup = new THREE.Group();
        
        // Upper shaft (wider, triangular)
        const upperShaftGeometry = new THREE.CylinderGeometry(5, 7, 20, 12);
        const upperShaft = new THREE.Mesh(upperShaftGeometry, boneMaterial);
        upperShaft.position.set(0, 15, 0);
        shaftGroup.add(upperShaft);
        
        // Middle shaft (narrower, more cylindrical)
        const middleShaftGeometry = new THREE.CylinderGeometry(4, 5, 25, 12);
        const middleShaft = new THREE.Mesh(middleShaftGeometry, boneMaterial);
        middleShaft.position.set(0, -5, 0);
        shaftGroup.add(middleShaft);
        
        // Lower shaft (expanding toward ankle)
        const lowerShaftGeometry = new THREE.CylinderGeometry(6, 4, 15, 12);
        const lowerShaft = new THREE.Mesh(lowerShaftGeometry, boneMaterial);
        lowerShaft.position.set(0, -25, 0);
        shaftGroup.add(lowerShaft);
        
        return shaftGroup;
      };
      
      const shaft = createTibialShaft();
      group.add(shaft);

      // Medial malleolus (prominent ankle bone - larger and more anatomical)
      const medialMalleolus = new THREE.Mesh(
        new THREE.BoxGeometry(8, 10, 5),
        boneMaterial
      );
      medialMalleolus.position.set(4, -32, 0);
      group.add(medialMalleolus);

      // Tibial plafond (broad ankle joint surface)
      const plafondGeometry = new THREE.CylinderGeometry(10, 10, 6, 16);
      const plafond = new THREE.Mesh(plafondGeometry, boneMaterial);
      plafond.position.set(0, -35, 0);
      group.add(plafond);

      return group;
    };

    // Create anatomically accurate fibula (smaller lateral bone of lower leg)
    const createFibula = () => {
      const group = new THREE.Group();
      
      // Fibular head (proximal end - smaller, articulates with tibia)
      const headGeometry = new THREE.SphereGeometry(4, 12, 10);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.set(0, 35, 0);
      head.scale.set(0.8, 1, 0.8);
      group.add(head);

      // Fibular neck (narrow region below head)
      const neckGeometry = new THREE.CylinderGeometry(2.5, 3, 8, 12);
      const neck = new THREE.Mesh(neckGeometry, boneMaterial);
      neck.position.set(0, 30, 0);
      group.add(neck);

      // Fibular shaft (thin, lateral to tibia)
      const shaftGeometry = new THREE.CylinderGeometry(2, 2.5, 50, 12);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.set(0, 0, 0);
      group.add(shaft);

      // Lateral malleolus (prominent ankle bone - larger than medial)
      const lateralMalleolus = new THREE.Mesh(
        new THREE.BoxGeometry(6, 12, 8),
        boneMaterial
      );
      lateralMalleolus.position.set(0, -30, 0);
      group.add(lateralMalleolus);

      // Styloid process (tip of lateral malleolus)
      const styloidGeometry = new THREE.ConeGeometry(2, 4, 8);
      const styloid = new THREE.Mesh(styloidGeometry, boneMaterial);
      styloid.position.set(0, -35, 0);
      group.add(styloid);

      return group;
    };

    // Create comprehensive foot structure with all major bones
    const createFoot = (isLeft = true) => {
      const group = new THREE.Group();
      
      // Calcaneus (heel bone - largest foot bone)
      const calcaneusGeometry = new THREE.BoxGeometry(20, 12, 35);
      const calcaneus = new THREE.Mesh(calcaneusGeometry, boneMaterial);
      calcaneus.position.set(0, 0, -15);
      // Add calcaneal tuberosity (heel prominence)
      const tuberosityGeometry = new THREE.SphereGeometry(8, 12, 10);
      const tuberosity = new THREE.Mesh(tuberosityGeometry, boneMaterial);
      tuberosity.position.set(0, -4, -25);
      tuberosity.scale.set(1, 0.8, 1.2);
      calcaneus.add(tuberosity);
      group.add(calcaneus);

      // Talus (ankle bone - articulates with tibia/fibula)
      const talusGeometry = new THREE.BoxGeometry(16, 10, 18);
      const talus = new THREE.Mesh(talusGeometry, boneMaterial);
      talus.position.set(0, 8, -5);
      // Talar dome (superior articular surface)
      const domeGeometry = new THREE.CylinderGeometry(8, 8, 6, 16);
      const dome = new THREE.Mesh(domeGeometry, boneMaterial);
      dome.position.set(0, 8, 0);
      dome.rotation.x = Math.PI/2;
      talus.add(dome);
      group.add(talus);

      // Navicular (boat-shaped midfoot bone)
      const navicularGeometry = new THREE.BoxGeometry(12, 6, 8);
      const navicular = new THREE.Mesh(navicularGeometry, boneMaterial);
      navicular.position.set(0, 4, 8);
      group.add(navicular);

      // Cuboid (lateral midfoot bone)
      const cuboidGeometry = new THREE.BoxGeometry(10, 6, 12);
      const cuboid = new THREE.Mesh(cuboidGeometry, boneMaterial);
      cuboid.position.set(isLeft ? -8 : 8, 2, 5);
      group.add(cuboid);

      // Cuneiform bones (medial, intermediate, lateral)
      const medialCuneiformGeometry = new THREE.BoxGeometry(8, 6, 10);
      const medialCuneiform = new THREE.Mesh(medialCuneiformGeometry, boneMaterial);
      medialCuneiform.position.set(isLeft ? 6 : -6, 3, 12);
      group.add(medialCuneiform);

      const intermediateCuneiformGeometry = new THREE.BoxGeometry(6, 5, 8);
      const intermediateCuneiform = new THREE.Mesh(intermediateCuneiformGeometry, boneMaterial);
      intermediateCuneiform.position.set(isLeft ? 2 : -2, 2.5, 14);
      group.add(intermediateCuneiform);

      const lateralCuneiformGeometry = new THREE.BoxGeometry(7, 5, 9);
      const lateralCuneiform = new THREE.Mesh(lateralCuneiformGeometry, boneMaterial);
      lateralCuneiform.position.set(isLeft ? -3 : 3, 2.5, 13);
      group.add(lateralCuneiform);

      // Metatarsals (5 long bones of the foot)
      const metatarsalPositions = [
        { x: isLeft ? 8 : -8, z: 20 },   // 1st metatarsal (big toe)
        { x: isLeft ? 4 : -4, z: 22 },   // 2nd metatarsal
        { x: isLeft ? 0 : 0, z: 23 },    // 3rd metatarsal
        { x: isLeft ? -4 : 4, z: 22 },   // 4th metatarsal
        { x: isLeft ? -8 : 8, z: 20 }    // 5th metatarsal
      ];

      metatarsalPositions.forEach((pos, index) => {
        const length = index === 0 ? 16 : 18; // 1st metatarsal is shorter and thicker
        const radius = index === 0 ? 3 : 2.5;
        
        const metatarsalGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, length, 12);
        const metatarsal = new THREE.Mesh(metatarsalGeometry, boneMaterial);
        metatarsal.position.set(pos.x, 1, pos.z);
        metatarsal.rotation.x = Math.PI/2;
        
        // Metatarsal heads (joint surfaces)
        const headGeometry = new THREE.SphereGeometry(radius * 1.2, 12, 10);
        const head = new THREE.Mesh(headGeometry, boneMaterial);
        head.position.set(0, 0, length/2);
        metatarsal.add(head);
        
        group.add(metatarsal);
      });

      // Phalanges (toe bones)
      const phalangealPositions = [
        { x: isLeft ? 8 : -8, z: 32, toes: 2 },   // Big toe (2 phalanges)
        { x: isLeft ? 4 : -4, z: 35, toes: 3 },   // 2nd toe (3 phalanges)
        { x: isLeft ? 0 : 0, z: 36, toes: 3 },    // 3rd toe (3 phalanges)
        { x: isLeft ? -4 : 4, z: 35, toes: 3 },   // 4th toe (3 phalanges)
        { x: isLeft ? -8 : 8, z: 32, toes: 3 }    // 5th toe (3 phalanges)
      ];

      phalangealPositions.forEach((toe, toeIndex) => {
        for (let i = 0; i < toe.toes; i++) {
          const length = toeIndex === 0 ? (i === 0 ? 8 : 6) : (i === 0 ? 6 : i === 1 ? 4 : 3);
          const radius = toeIndex === 0 ? 2 : 1.5;
          
          const phalanxGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, length, 8);
          const phalanx = new THREE.Mesh(phalanxGeometry, boneMaterial);
          phalanx.position.set(toe.x, 0.5, toe.z + (i * (length + 1)));
          phalanx.rotation.x = Math.PI/2;
          group.add(phalanx);
        }
      });

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

    // Create anatomically accurate pelvis with proper innominate bones
    const createPelvis = () => {
      const group = new THREE.Group();
      
      // Enhanced innominate bone (hip bone) - fusion of ilium, ischium, and pubis
      const createInnominateBone = (side: 'left' | 'right') => {
        const isLeft = side === 'left';
        const innominateGroup = new THREE.Group();
        
        // ILIUM - largest part of hip bone
        const createIlium = () => {
          const iliumGroup = new THREE.Group();
          
          // Iliac wing (ala) - broad, fan-shaped upper portion
          const wingGeometry = new THREE.BoxGeometry(18, 20, 4);
          const wing = new THREE.Mesh(wingGeometry, boneMaterial);
          wing.position.set(0, 12, 0);
          wing.rotation.z = isLeft ? 0.3 : -0.3;
          wing.rotation.y = isLeft ? -0.4 : 0.4;
          wing.scale.set(1, 0.8, 1.2);
          iliumGroup.add(wing);
          
          // Iliac crest - S-shaped superior border
          const crestGeometry = new THREE.CylinderGeometry(1.5, 2, 22, 12);
          const crest = new THREE.Mesh(crestGeometry, boneMaterial);
          crest.position.set(0, 22, 0);
          crest.rotation.z = Math.PI/2;
          crest.rotation.y = isLeft ? -0.4 : 0.4;
          iliumGroup.add(crest);
          
          // Anterior superior iliac spine (ASIS)
          const asisGeometry = new THREE.ConeGeometry(2, 5, 8);
          const asis = new THREE.Mesh(asisGeometry, boneMaterial);
          asis.position.set(0, 20, 8);
          asis.rotation.x = Math.PI/6;
          iliumGroup.add(asis);
          
          // Posterior superior iliac spine (PSIS)
          const psisGeometry = new THREE.ConeGeometry(1.5, 4, 8);
          const psis = new THREE.Mesh(psisGeometry, boneMaterial);
          psis.position.set(0, 18, -8);
          psis.rotation.x = -Math.PI/6;
          iliumGroup.add(psis);
          
          // Iliac fossa (smooth internal surface)
          const fossaGeometry = new THREE.SphereGeometry(12, 16, 12);
          const fossa = new THREE.Mesh(fossaGeometry, boneMaterial);
          fossa.position.set(0, 8, -2);
          fossa.scale.set(0.8, 0.6, 0.3);
          iliumGroup.add(fossa);
          
          return iliumGroup;
        };
        
        // ISCHIUM - posteroinferior part of hip bone
        const createIschium = () => {
          const ischiumGroup = new THREE.Group();
          
          // Ischial body
          const bodyGeometry = new THREE.BoxGeometry(8, 12, 8);
          const body = new THREE.Mesh(bodyGeometry, boneMaterial);
          body.position.set(0, -8, 2);
          ischiumGroup.add(body);
          
          // Ischial tuberosity (sitting bone prominence)
          const tuberosityGeometry = new THREE.SphereGeometry(4, 12, 10);
          const tuberosity = new THREE.Mesh(tuberosityGeometry, boneMaterial);
          tuberosity.position.set(0, -18, 4);
          tuberosity.scale.set(1.2, 0.8, 1);
          ischiumGroup.add(tuberosity);
          
          // Ischial spine
          const spineGeometry = new THREE.ConeGeometry(1.5, 4, 8);
          const spine = new THREE.Mesh(spineGeometry, boneMaterial);
          spine.position.set(0, -4, -6);
          spine.rotation.x = Math.PI;
          ischiumGroup.add(spine);
          
          // Ischial ramus
          const ramusGeometry = new THREE.CylinderGeometry(2.5, 3, 12, 8);
          const ramus = new THREE.Mesh(ramusGeometry, boneMaterial);
          ramus.position.set(0, -12, 8);
          ramus.rotation.x = Math.PI/3;
          ischiumGroup.add(ramus);
          
          return ischiumGroup;
        };
        
        // PUBIS - anteroinferior part of hip bone
        const createPubis = () => {
          const pubisGroup = new THREE.Group();
          
          // Pubic body
          const bodyGeometry = new THREE.BoxGeometry(6, 8, 6);
          const body = new THREE.Mesh(bodyGeometry, boneMaterial);
          body.position.set(0, -12, 12);
          pubisGroup.add(body);
          
          // Superior pubic ramus
          const superiorRamusGeometry = new THREE.CylinderGeometry(2, 3, 10, 8);
          const superiorRamus = new THREE.Mesh(superiorRamusGeometry, boneMaterial);
          superiorRamus.position.set(0, -4, 8);
          superiorRamus.rotation.x = -Math.PI/4;
          pubisGroup.add(superiorRamus);
          
          // Inferior pubic ramus
          const inferiorRamusGeometry = new THREE.CylinderGeometry(2, 2.5, 8, 8);
          const inferiorRamus = new THREE.Mesh(inferiorRamusGeometry, boneMaterial);
          inferiorRamus.position.set(0, -16, 10);
          inferiorRamus.rotation.x = Math.PI/6;
          pubisGroup.add(inferiorRamus);
          
          // Pubic tubercle
          const tubercleGeometry = new THREE.SphereGeometry(1.5, 8, 6);
          const tubercle = new THREE.Mesh(tubercleGeometry, boneMaterial);
          tubercle.position.set(0, -8, 14);
          pubisGroup.add(tubercle);
          
          return pubisGroup;
        };
        
        // ACETABULUM - deep socket for femoral head articulation
        const createAcetabulum = () => {
          const acetabulumGroup = new THREE.Group();
          
          // Acetabular rim (horseshoe-shaped articular surface)
          const rimGeometry = new THREE.TorusGeometry(8, 2, 8, 16);
          const rim = new THREE.Mesh(rimGeometry, boneMaterial);
          rim.position.set(0, -2, 6);
          rim.rotation.x = Math.PI/2;
          rim.rotation.z = Math.PI/8;
          acetabulumGroup.add(rim);
          
          // Acetabular fossa (central non-articular depression)
          const fossaGeometry = new THREE.SphereGeometry(5, 16, 12);
          const fossa = new THREE.Mesh(fossaGeometry, boneMaterial);
          fossa.position.set(0, -2, 6);
          fossa.scale.set(0.8, 0.8, 0.6);
          acetabulumGroup.add(fossa);
          
          // Acetabular notch (inferior gap in rim)
          const notchGeometry = new THREE.BoxGeometry(4, 3, 6);
          const notch = new THREE.Mesh(notchGeometry, boneMaterial);
          notch.position.set(0, -8, 8);
          acetabulumGroup.add(notch);
          
          // Lunate surface (crescent-shaped articular cartilage area)
          const lunateGeometry = new THREE.SphereGeometry(7, 16, 12);
          const lunate = new THREE.Mesh(lunateGeometry, boneMaterial);
          lunate.position.set(0, -2, 6);
          lunate.scale.set(0.9, 0.6, 0.8);
          acetabulumGroup.add(lunate);
          
          return acetabulumGroup;
        };
        
        // Assemble the complete innominate bone
        const ilium = createIlium();
        ilium.position.set(isLeft ? -18 : 18, 8, 0);
        innominateGroup.add(ilium);
        
        const ischium = createIschium();
        ischium.position.set(isLeft ? -15 : 15, -5, 0);
        innominateGroup.add(ischium);
        
        const pubis = createPubis();
        pubis.position.set(isLeft ? -8 : 8, -8, 0);
        innominateGroup.add(pubis);
        
        const acetabulum = createAcetabulum();
        acetabulum.position.set(isLeft ? -15 : 15, -2, 6);
        innominateGroup.add(acetabulum);
        
        return innominateGroup;
      };
      
      // Create left and right innominate bones
      const leftInnominate = createInnominateBone('left');
      const rightInnominate = createInnominateBone('right');
      group.add(leftInnominate, rightInnominate);
      
      // Enhanced sacrum with proper anatomy
      const createSacrum = () => {
        const sacrumGroup = new THREE.Group();
        
        // Main sacral body (triangular, wedge-shaped)
        const sacrumGeometry = new THREE.ConeGeometry(10, 20, 6);
        const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
        sacrum.position.set(0, 0, -12);
        sacrum.rotation.x = Math.PI;
        sacrumGroup.add(sacrum);
        
        // Sacral promontory (anterior projection)
        const promontoryGeometry = new THREE.SphereGeometry(3, 12, 8);
        const promontory = new THREE.Mesh(promontoryGeometry, boneMaterial);
        promontory.position.set(0, 10, -8);
        promontory.scale.set(1, 0.6, 0.8);
        sacrumGroup.add(promontory);
        
        // Sacral foramina (holes for nerve passages)
        for (let i = 0; i < 4; i++) {
          const foramenGeometry = new THREE.SphereGeometry(1.5, 8, 6);
          const leftForamen = new THREE.Mesh(foramenGeometry, boneMaterial);
          leftForamen.position.set(-4, 5 - i * 3, -10 + i);
          sacrumGroup.add(leftForamen);
          
          const rightForamen = new THREE.Mesh(foramenGeometry, boneMaterial);
          rightForamen.position.set(4, 5 - i * 3, -10 + i);
          sacrumGroup.add(rightForamen);
        }
        
        return sacrumGroup;
      };
      
      const sacrum = createSacrum();
      group.add(sacrum);
      
      // Pubic symphysis (fibrocartilaginous joint)
      const pubicSymphysisGeometry = new THREE.BoxGeometry(2, 10, 6);
      const pubicSymphysis = new THREE.Mesh(pubicSymphysisGeometry, boneMaterial);
      pubicSymphysis.position.set(0, -15, 14);
      group.add(pubicSymphysis);
      
      // Enhanced coccyx (tailbone)
      const coccyxGeometry = new THREE.ConeGeometry(2.5, 8, 6);
      const coccyx = new THREE.Mesh(coccyxGeometry, boneMaterial);
      coccyx.position.set(0, -10, -20);
      coccyx.rotation.x = Math.PI/4;
      group.add(coccyx);

      return group;
    };

    // Create anatomically accurate rib cage matching reference image
    const createRibCage = () => {
      const group = new THREE.Group();
      
      // Sternum (breastbone) - elongated central bone
      const sternumGeometry = new THREE.BoxGeometry(3, 45, 2);
      const sternum = new THREE.Mesh(sternumGeometry, boneMaterial);
      sternum.position.set(0, 35, 28);
      group.add(sternum);
      
      // Create 12 pairs of anatomically accurate ribs
      for (let i = 0; i < 12; i++) {
        const ribLevel = 60 - i * 4.5; // Vertical spacing between ribs
        
        // Rib dimensions based on anatomical proportions
        let ribLength, ribCurvature, ribAngle;
        
        if (i < 7) {
          // Upper ribs (1-7) - true ribs, shorter and steeper
          ribLength = 25 + i * 2;
          ribCurvature = 0.8 + i * 0.1;
          ribAngle = 0.3 + i * 0.1;
        } else if (i < 10) {
          // Middle ribs (8-10) - false ribs, longer
          ribLength = 35 - (i - 7) * 1;
          ribCurvature = 1.5;
          ribAngle = 1.2;
        } else {
          // Lower ribs (11-12) - floating ribs, shorter
          ribLength = 20;
          ribCurvature = 1.2;
          ribAngle = 1.4;
        }
        
        // Create curved rib using multiple segments for smooth curvature
        const createCurvedRib = (side: 'left' | 'right') => {
          const ribGroup = new THREE.Group();
          const segments = 8;
          const isLeft = side === 'left';
          
          for (let j = 0; j < segments; j++) {
            const t = j / (segments - 1);
            
            // Create rib curve using parametric equations
            const x = isLeft ? 
              -Math.sin(t * Math.PI * ribCurvature) * ribLength :
              Math.sin(t * Math.PI * ribCurvature) * ribLength;
            const y = 0;
            const z = Math.cos(t * Math.PI * ribCurvature) * ribLength * 0.6;
            
            // Individual rib segment
            const segmentGeometry = new THREE.CylinderGeometry(
              0.8 - t * 0.3, // Taper from spine to front
              0.8 - t * 0.3,
              ribLength / segments * 1.2,
              8
            );
            
            const ribSegment = new THREE.Mesh(segmentGeometry, boneMaterial);
            
            // Position and orient segment
            ribSegment.position.set(x, y, z);
            
            // Calculate rotation for proper rib orientation
            if (j < segments - 1) {
              const nextT = (j + 1) / (segments - 1);
              const nextX = isLeft ?
                -Math.sin(nextT * Math.PI * ribCurvature) * ribLength :
                Math.sin(nextT * Math.PI * ribCurvature) * ribLength;
              const nextZ = Math.cos(nextT * Math.PI * ribCurvature) * ribLength * 0.6;
              
              const direction = new THREE.Vector3(nextX - x, 0, nextZ - z);
              direction.normalize();
              
              ribSegment.lookAt(
                ribSegment.position.x + direction.x,
                ribSegment.position.y + direction.y,
                ribSegment.position.z + direction.z
              );
              
              ribSegment.rotateX(Math.PI / 2);
            }
            
            ribGroup.add(ribSegment);
          }
          
          // Add rib attachment to vertebrae (posterior)
          const posteriorAttachment = new THREE.SphereGeometry(1.2, 8, 6);
          const posteriorJoint = new THREE.Mesh(posteriorAttachment, boneMaterial);
          posteriorJoint.position.set(isLeft ? -3 : 3, 0, -8);
          ribGroup.add(posteriorJoint);
          
          // Add costal cartilage connection for ribs 1-10
          if (i < 10) {
            const cartilageGeometry = new THREE.CylinderGeometry(0.5, 0.7, 8, 6);
            const cartilage = new THREE.Mesh(cartilageGeometry, boneMaterial);
            cartilage.position.set(isLeft ? -ribLength * 0.7 : ribLength * 0.7, 0, ribLength * 0.4);
            cartilage.rotation.x = Math.PI / 2;
            cartilage.rotation.z = isLeft ? -ribAngle : ribAngle;
            ribGroup.add(cartilage);
          }
          
          return ribGroup;
        };
        
        // Create left and right ribs
        const leftRib = createCurvedRib('left');
        const rightRib = createCurvedRib('right');
        
        // Position ribs at correct vertebral level
        leftRib.position.set(0, ribLevel, 0);
        rightRib.position.set(0, ribLevel, 0);
        
        // Add slight downward angle for anatomical accuracy
        leftRib.rotation.x = -ribAngle * 0.3;
        rightRib.rotation.x = -ribAngle * 0.3;
        
        group.add(leftRib);
        group.add(rightRib);
      }
      
      // Add xiphoid process (bottom of sternum)
      const xiphoidGeometry = new THREE.ConeGeometry(1.5, 4, 6);
      const xiphoid = new THREE.Mesh(xiphoidGeometry, boneMaterial);
      xiphoid.position.set(0, 12, 28);
      group.add(xiphoid);
      
      // Add manubrium (top of sternum)
      const manubriumGeometry = new THREE.BoxGeometry(4, 8, 2.5);
      const manubrium = new THREE.Mesh(manubriumGeometry, boneMaterial);
      manubrium.position.set(0, 58, 28);
      group.add(manubrium);
      
      return group;
    };

    // Create complete anatomical skull matching reference
    const createSkull = () => {
      const group = new THREE.Group();
      
      // Cranium (rounded dome shape)
      const craniumGeometry = new THREE.SphereGeometry(11, 24, 20);
      const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
      cranium.position.set(0, 2, 0);
      cranium.scale.set(1, 1.1, 1.15);
      group.add(cranium);

      // Eye sockets (orbital cavities)
      const eyeSocketGeometry = new THREE.SphereGeometry(2.5, 12, 10);
      const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, boneMaterial);
      leftEyeSocket.position.set(-3.5, 0, 8);
      leftEyeSocket.scale.set(1.2, 1, 0.8);
      group.add(leftEyeSocket);

      const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, boneMaterial);
      rightEyeSocket.position.set(3.5, 0, 8);
      rightEyeSocket.scale.set(1.2, 1, 0.8);
      group.add(rightEyeSocket);

      // Nasal cavity
      const nasalGeometry = new THREE.BoxGeometry(1.5, 4, 3);
      const nasal = new THREE.Mesh(nasalGeometry, boneMaterial);
      nasal.position.set(0, -2, 9);
      group.add(nasal);

      // Upper jaw (maxilla)
      const upperJawGeometry = new THREE.BoxGeometry(8, 2, 4);
      const upperJaw = new THREE.Mesh(upperJawGeometry, boneMaterial);
      upperJaw.position.set(0, -4, 6);
      group.add(upperJaw);

      // Lower jaw (mandible) - U-shaped
      const mandibleGeometry = new THREE.BoxGeometry(8, 3, 4);
      const mandible = new THREE.Mesh(mandibleGeometry, boneMaterial);
      mandible.position.set(0, -8, 5);
      group.add(mandible);

      // Temporal bones (side skull)
      const temporalGeometry = new THREE.BoxGeometry(3, 4, 6);
      const leftTemporal = new THREE.Mesh(temporalGeometry, boneMaterial);
      leftTemporal.position.set(-8, -1, 2);
      group.add(leftTemporal);

      const rightTemporal = new THREE.Mesh(temporalGeometry, boneMaterial);
      rightTemporal.position.set(8, -1, 2);
      group.add(rightTemporal);

      return group;
    };

    // Create anatomically accurate shoulder complex and arm
    const createCompleteArm = (side: 'left' | 'right') => {
      const group = new THREE.Group();
      const isLeft = side === 'left';
      
      // CLAVICLE - collar bone connecting sternum to scapula
      const createClavicle = () => {
        const clavicleGroup = new THREE.Group();
        
        // Main clavicular shaft (S-shaped curve)
        const shaftGeometry = new THREE.CylinderGeometry(2, 2.5, 25, 12);
        const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
        shaft.rotation.z = Math.PI/2;
        shaft.rotation.y = isLeft ? 0.2 : -0.2; // Natural S-curve
        clavicleGroup.add(shaft);
        
        // Sternal end (medial, connects to sternum)
        const sternalEndGeometry = new THREE.SphereGeometry(3, 12, 10);
        const sternalEnd = new THREE.Mesh(sternalEndGeometry, boneMaterial);
        sternalEnd.position.set(isLeft ? -12 : 12, 0, 2);
        clavicleGroup.add(sternalEnd);
        
        // Acromial end (lateral, connects to scapula)
        const acromialEndGeometry = new THREE.SphereGeometry(2.5, 12, 10);
        const acromialEnd = new THREE.Mesh(acromialEndGeometry, boneMaterial);
        acromialEnd.position.set(isLeft ? 12 : -12, 0, -2);
        clavicleGroup.add(acromialEnd);
        
        return clavicleGroup;
      };
      
      // SCAPULA - shoulder blade
      const createScapula = () => {
        const scapulaGroup = new THREE.Group();
        
        // Scapular body (triangular flat bone)
        const bodyGeometry = new THREE.BoxGeometry(3, 20, 15);
        const body = new THREE.Mesh(bodyGeometry, boneMaterial);
        body.position.set(0, 0, 0);
        body.rotation.y = isLeft ? 0.3 : -0.3; // Angled against rib cage
        scapulaGroup.add(body);
        
        // Scapular spine (prominent ridge)
        const spineGeometry = new THREE.BoxGeometry(4, 18, 2);
        const spine = new THREE.Mesh(spineGeometry, boneMaterial);
        spine.position.set(isLeft ? -2 : 2, 0, -2);
        spine.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(spine);
        
        // Acromion process (connects to clavicle)
        const acromionGeometry = new THREE.BoxGeometry(2, 6, 4);
        const acromion = new THREE.Mesh(acromionGeometry, boneMaterial);
        acromion.position.set(isLeft ? -2 : 2, 8, -4);
        acromion.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(acromion);
        
        // Coracoid process (anterior projection)
        const coracoidGeometry = new THREE.ConeGeometry(2, 6, 8);
        const coracoid = new THREE.Mesh(coracoidGeometry, boneMaterial);
        coracoid.position.set(isLeft ? 2 : -2, 6, 4);
        coracoid.rotation.x = Math.PI/4;
        coracoid.rotation.y = isLeft ? -0.3 : 0.3;
        scapulaGroup.add(coracoid);
        
        // Glenoid fossa (shoulder socket for humerus)
        const glenoidGeometry = new THREE.SphereGeometry(5, 16, 12);
        const glenoid = new THREE.Mesh(glenoidGeometry, boneMaterial);
        glenoid.position.set(isLeft ? 1 : -1, 5, 2);
        glenoid.scale.set(0.8, 0.8, 0.6);
        glenoid.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(glenoid);
        
        // Superior border
        const superiorBorderGeometry = new THREE.BoxGeometry(2, 2, 12);
        const superiorBorder = new THREE.Mesh(superiorBorderGeometry, boneMaterial);
        superiorBorder.position.set(0, 10, 0);
        superiorBorder.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(superiorBorder);
        
        // Medial border (closest to spine)
        const medialBorderGeometry = new THREE.BoxGeometry(2, 18, 2);
        const medialBorder = new THREE.Mesh(medialBorderGeometry, boneMaterial);
        medialBorder.position.set(isLeft ? 1 : -1, 0, -6);
        medialBorder.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(medialBorder);
        
        // Lateral border (closest to arm)
        const lateralBorderGeometry = new THREE.BoxGeometry(2, 16, 2);
        const lateralBorder = new THREE.Mesh(lateralBorderGeometry, boneMaterial);
        lateralBorder.position.set(isLeft ? -1 : 1, -2, 6);
        lateralBorder.rotation.y = isLeft ? 0.3 : -0.3;
        scapulaGroup.add(lateralBorder);
        
        return scapulaGroup;
      };
      
      // Position shoulder complex
      const clavicle = createClavicle();
      clavicle.position.set(0, 15, 0); // High on chest
      group.add(clavicle);
      
      const scapula = createScapula();
      scapula.position.set(isLeft ? -8 : 8, 5, -8); // Against posterior rib cage
      group.add(scapula);
      
      // HUMERUS (upper arm) - positioned to articulate with glenoid fossa
      const humerus = createHumerus();
      humerus.position.set(isLeft ? -2 : 2, -10, 2); // Raised to connect with shoulder socket
      group.add(humerus);

      // Radius (forearm thumb side)
      const radiusGeometry = new THREE.CylinderGeometry(2.5, 3, 35, 12);
      const radius = new THREE.Mesh(radiusGeometry, boneMaterial);
      radius.position.set(isLeft ? 1 : -1, -50, 2);
      group.add(radius);

      // Ulna (forearm pinky side)
      const ulnaGeometry = new THREE.CylinderGeometry(2, 2.5, 38, 12);
      const ulna = new THREE.Mesh(ulnaGeometry, boneMaterial);
      ulna.position.set(isLeft ? -4 : 4, -51, 2);
      
      // Olecranon process (elbow point)
      const olecranonGeometry = new THREE.BoxGeometry(3, 4, 2);
      const olecranon = new THREE.Mesh(olecranonGeometry, boneMaterial);
      olecranon.position.set(isLeft ? -4 : 4, -32, 0);
      group.add(ulna, olecranon);

      return group;
    };

    // Create hand with fingers
    const createHand = () => {
      const group = new THREE.Group();
      
      // Palm (metacarpals)
      const palmGeometry = new THREE.BoxGeometry(6, 2, 10);
      const palm = new THREE.Mesh(palmGeometry, boneMaterial);
      palm.position.set(0, 0, 0);
      group.add(palm);

      // Create 5 fingers
      for (let i = 0; i < 5; i++) {
        const fingerGroup = new THREE.Group();
        const fingerOffset = (i - 2) * 1.3; // Spread fingers
        
        // Proximal phalanx
        const proximalGeometry = new THREE.CylinderGeometry(0.4, 0.5, 3, 8);
        const proximal = new THREE.Mesh(proximalGeometry, boneMaterial);
        proximal.position.set(fingerOffset, 0, 6);
        fingerGroup.add(proximal);

        // Middle phalanx (skip for thumb)
        if (i !== 0) {
          const middleGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
          const middle = new THREE.Mesh(middleGeometry, boneMaterial);
          middle.position.set(fingerOffset, 0, 9);
          fingerGroup.add(middle);
        }

        // Distal phalanx
        const distalGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const distal = new THREE.Mesh(distalGeometry, boneMaterial);
        distal.position.set(fingerOffset, 0, i === 0 ? 9 : 11.5);
        fingerGroup.add(distal);

        group.add(fingerGroup);
      }

      return group;
    };

    // Create anatomically accurate complete leg matching reference image
    const createCompleteLeg = (side: 'left' | 'right') => {
      const group = new THREE.Group();
      const isLeft = side === 'left';
      
      // Enhanced femur with proper proportions
      const femur = createFemur(isLeft);
      group.add(femur);

      // Enhanced tibia with realistic anatomy - positioned to articulate with femoral condyles
      const tibia = createTibia();
      tibia.position.set(0, -40, 0); // Moved up to connect with femoral condyles
      group.add(tibia);

      // Fibula (lateral leg bone) - positioned alongside tibia
      const fibula = createFibula();
      fibula.position.set(isLeft ? -8 : 8, -40, 0); // Moved up to align with tibia
      group.add(fibula);

      // Enhanced patella (kneecap) - properly positioned in patellar groove
      const createPatella = () => {
        const patellaGroup = new THREE.Group();
        
        // Main patella body (triangular sesamoid bone with proper shape)
        const patellaGeometry = new THREE.SphereGeometry(5, 20, 16);
        const patella = new THREE.Mesh(patellaGeometry, boneMaterial);
        patella.scale.set(1.3, 0.7, 0.8);
        patellaGroup.add(patella);
        
        // Patellar apex (inferior point)
        const apexGeometry = new THREE.ConeGeometry(2, 4, 8);
        const apex = new THREE.Mesh(apexGeometry, boneMaterial);
        apex.position.set(0, -4, 0);
        patellaGroup.add(apex);
        
        // Articular facets (posterior surface that articulates with femur)
        const medialFacetGeometry = new THREE.SphereGeometry(3, 12, 10);
        const medialFacet = new THREE.Mesh(medialFacetGeometry, boneMaterial);
        medialFacet.position.set(isLeft ? 2 : -2, 0, -2);
        medialFacet.scale.set(0.8, 0.6, 0.4);
        patellaGroup.add(medialFacet);
        
        const lateralFacetGeometry = new THREE.SphereGeometry(3.5, 12, 10);
        const lateralFacet = new THREE.Mesh(lateralFacetGeometry, boneMaterial);
        lateralFacet.position.set(isLeft ? -2 : 2, 0, -2);
        lateralFacet.scale.set(0.8, 0.6, 0.4);
        patellaGroup.add(lateralFacet);
        
        // Odd facet (small medial facet for extreme flexion)
        const oddFacetGeometry = new THREE.SphereGeometry(1.5, 8, 6);
        const oddFacet = new THREE.Mesh(oddFacetGeometry, boneMaterial);
        oddFacet.position.set(isLeft ? 3.5 : -3.5, 0, -1);
        oddFacet.scale.set(0.6, 0.4, 0.3);
        patellaGroup.add(oddFacet);
        
        return patellaGroup;
      };
      
      // Position patella in the patellar groove between femoral condyles
      const patella = createPatella();
      patella.position.set(0, -32, 12); // Adjusted to align with new knee joint position
      group.add(patella);

      // Complete foot structure with all bones
      const foot = createFoot(isLeft);
      foot.position.set(0, -115, 0); // Adjusted to align with new tibia position
      group.add(foot);

      return group;
    };



    // Create complete anatomical skeleton with enhanced lower limbs
    const bones = {
      'skull': createSkull(),
      'spine': createSpine(),
      'rib_cage': createRibCage(),
      'pelvis': createPelvis(),
      'left_arm': createCompleteArm('left'),
      'right_arm': createCompleteArm('right'),
      'left_hand': createHand(),
      'right_hand': createHand(),
      'left_leg': createCompleteLeg('left'),  // Now includes fibula and complete foot
      'right_leg': createCompleteLeg('right')  // Now includes fibula and complete foot
    };

    // Position complete skeleton anatomically with enhanced lower limbs
    bones['skull'].position.set(0, 150, 0);
    bones['spine'].position.set(0, 20, 0);
    bones['rib_cage'].position.set(0, 60, 0);
    bones['pelvis'].position.set(0, -20, 0);
    
    // Arms positioned naturally with proper shoulder complex
    bones['left_arm'].position.set(-20, 85, 0); // Raised to connect with enhanced shoulder
    bones['right_arm'].position.set(20, 85, 0); // Raised to connect with enhanced shoulder
    bones['left_hand'].position.set(-23, 5, 0); // Adjusted for new arm position
    bones['right_hand'].position.set(23, 5, 0); // Adjusted for new arm position
    
    // Complete legs with integrated fibula and foot structures - positioned to connect with acetabulum
    bones['left_leg'].position.set(-15, -35, 0); // Moved up to connect femur head with acetabulum
    bones['right_leg'].position.set(15, -35, 0); // Moved up to connect femur head with acetabulum

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