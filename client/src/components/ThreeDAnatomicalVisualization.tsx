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

    // Create anatomically accurate tibia matching reference image
    const createTibia = () => {
      const group = new THREE.Group();
      
      // Tibial plateau (expanded proximal end with joint surfaces)
      const plateauGeometry = new THREE.CylinderGeometry(12, 8, 8, 16);
      const plateau = new THREE.Mesh(plateauGeometry, boneMaterial);
      plateau.position.set(0, 35, 0);
      group.add(plateau);

      // Tibial condyles (medial and lateral joint surfaces)
      const condyleGeometry = new THREE.SphereGeometry(6, 12, 10);
      const medialCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      medialCondyle.position.set(4, 35, 2);
      medialCondyle.scale.set(1, 0.6, 1.2);
      group.add(medialCondyle);

      const lateralCondyle = new THREE.Mesh(condyleGeometry, boneMaterial);
      lateralCondyle.position.set(-4, 35, 2);
      lateralCondyle.scale.set(1, 0.6, 1.2);
      group.add(lateralCondyle);

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

    // Create anatomically accurate pelvis matching reference image
    const createPelvis = () => {
      const group = new THREE.Group();
      
      // Iliac wings (butterfly-shaped hip bones)
      const createIliacWing = (side: 'left' | 'right') => {
        const isLeft = side === 'left';
        const wingGroup = new THREE.Group();
        
        // Main iliac blade (wide, curved wing)
        const iliacBladeGeometry = new THREE.BoxGeometry(12, 16, 3);
        const iliacBlade = new THREE.Mesh(iliacBladeGeometry, boneMaterial);
        iliacBlade.position.set(isLeft ? -20 : 20, 8, 0);
        iliacBlade.rotation.z = isLeft ? 0.4 : -0.4;
        iliacBlade.rotation.y = isLeft ? -0.3 : 0.3;
        wingGroup.add(iliacBlade);
        
        // Iliac crest (top rim of hip bone)
        const iliacCrestGeometry = new THREE.CylinderGeometry(1, 1.5, 18, 8);
        const iliacCrest = new THREE.Mesh(iliacCrestGeometry, boneMaterial);
        iliacCrest.position.set(isLeft ? -20 : 20, 16, 0);
        iliacCrest.rotation.z = Math.PI/2;
        iliacCrest.rotation.y = isLeft ? -0.3 : 0.3;
        wingGroup.add(iliacCrest);
        
        // Acetabulum (deep hip socket)
        const acetabulumGeometry = new THREE.SphereGeometry(6, 16, 12);
        const acetabulum = new THREE.Mesh(acetabulumGeometry, boneMaterial);
        acetabulum.position.set(isLeft ? -15 : 15, -5, 0);
        acetabulum.scale.set(0.9, 0.9, 0.6);
        wingGroup.add(acetabulum);
        
        // Ischium (sitting bone)
        const ischiumGeometry = new THREE.BoxGeometry(6, 8, 6);
        const ischium = new THREE.Mesh(ischiumGeometry, boneMaterial);
        ischium.position.set(isLeft ? -12 : 12, -15, 2);
        wingGroup.add(ischium);
        
        return wingGroup;
      };
      
      // Create left and right iliac wings
      const leftWing = createIliacWing('left');
      const rightWing = createIliacWing('right');
      group.add(leftWing, rightWing);
      
      // Sacrum (triangular bone at spine base)
      const sacrumGeometry = new THREE.ConeGeometry(8, 18, 6);
      const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
      sacrum.position.set(0, 0, -12);
      sacrum.rotation.x = Math.PI;
      group.add(sacrum);
      
      // Pubic symphysis (front pelvic connection)
      const pubicSymphysisGeometry = new THREE.BoxGeometry(3, 8, 4);
      const pubicSymphysis = new THREE.Mesh(pubicSymphysisGeometry, boneMaterial);
      pubicSymphysis.position.set(0, -12, 8);
      group.add(pubicSymphysis);
      
      // Coccyx (tailbone)
      const coccyxGeometry = new THREE.ConeGeometry(2, 6, 6);
      const coccyx = new THREE.Mesh(coccyxGeometry, boneMaterial);
      coccyx.position.set(0, -8, -18);
      coccyx.rotation.x = Math.PI/6;
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

    // Create complete arm bones (humerus, radius, ulna)
    const createCompleteArm = (side: 'left' | 'right') => {
      const group = new THREE.Group();
      const isLeft = side === 'left';
      
      // Humerus (upper arm) - enhanced from previous version
      const humerus = createHumerus();
      humerus.position.set(0, 0, 0);
      group.add(humerus);

      // Radius (forearm thumb side)
      const radiusGeometry = new THREE.CylinderGeometry(2.5, 3, 35, 12);
      const radius = new THREE.Mesh(radiusGeometry, boneMaterial);
      radius.position.set(isLeft ? 3 : -3, -40, 0);
      group.add(radius);

      // Ulna (forearm pinky side)
      const ulnaGeometry = new THREE.CylinderGeometry(2, 2.5, 38, 12);
      const ulna = new THREE.Mesh(ulnaGeometry, boneMaterial);
      ulna.position.set(isLeft ? -2 : 2, -41, 0);
      
      // Olecranon process (elbow point)
      const olecranonGeometry = new THREE.BoxGeometry(3, 4, 2);
      const olecranon = new THREE.Mesh(olecranonGeometry, boneMaterial);
      olecranon.position.set(isLeft ? -2 : 2, -22, -2);
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

      // Enhanced tibia with realistic anatomy
      const tibia = createTibia();
      tibia.position.set(0, -75, 0);
      group.add(tibia);

      // Fibula (lateral leg bone) - anatomically accurate matching reference
      const createFibula = () => {
        const fibulaGroup = new THREE.Group();
        
        // Fibular head (enlarged proximal end with realistic shape)
        const headGeometry = new THREE.SphereGeometry(3.5, 16, 12);
        const head = new THREE.Mesh(headGeometry, boneMaterial);
        head.position.set(0, 30, 0);
        head.scale.set(1, 0.8, 1.2);
        fibulaGroup.add(head);
        
        // Fibular neck (narrow connection to head)
        const neckGeometry = new THREE.CylinderGeometry(2, 3, 6, 12);
        const neck = new THREE.Mesh(neckGeometry, boneMaterial);
        neck.position.set(0, 25, 0);
        fibulaGroup.add(neck);
        
        // Fibular shaft (slender, realistic taper)
        const createFibularShaft = () => {
          const shaftGroup = new THREE.Group();
          
          // Upper shaft
          const upperGeometry = new THREE.CylinderGeometry(2, 2.5, 15, 12);
          const upper = new THREE.Mesh(upperGeometry, boneMaterial);
          upper.position.set(0, 15, 0);
          shaftGroup.add(upper);
          
          // Middle shaft (thinnest part)
          const middleGeometry = new THREE.CylinderGeometry(1.8, 2, 20, 12);
          const middle = new THREE.Mesh(middleGeometry, boneMaterial);
          middle.position.set(0, 0, 0);
          shaftGroup.add(middle);
          
          // Lower shaft (expanding toward ankle)
          const lowerGeometry = new THREE.CylinderGeometry(3, 1.8, 15, 12);
          const lower = new THREE.Mesh(lowerGeometry, boneMaterial);
          lower.position.set(0, -15, 0);
          shaftGroup.add(lower);
          
          return shaftGroup;
        };
        
        const shaft = createFibularShaft();
        fibulaGroup.add(shaft);
        
        // Lateral malleolus (prominent ankle prominence - larger and more defined)
        const malleolus = new THREE.BoxGeometry(6, 8, 4);
        const lateralMalleolus = new THREE.Mesh(malleolus, boneMaterial);
        lateralMalleolus.position.set(0, -28, 0);
        fibulaGroup.add(lateralMalleolus);
        
        return fibulaGroup;
      };
      
      const fibula = createFibula();
      fibula.position.set(isLeft ? 10 : -10, -75, 0);
      group.add(fibula);

      // Patella (kneecap) - anatomically positioned
      const createPatella = () => {
        const patellaGroup = new THREE.Group();
        
        // Main patella body (triangular sesamoid bone)
        const patellaGeometry = new THREE.SphereGeometry(4, 16, 12);
        const patella = new THREE.Mesh(patellaGeometry, boneMaterial);
        patella.scale.set(1.2, 0.8, 0.6);
        patellaGroup.add(patella);
        
        // Patellar facets for femoral articulation
        const facetGeometry = new THREE.BoxGeometry(3, 2, 2);
        const medialFacet = new THREE.Mesh(facetGeometry, boneMaterial);
        medialFacet.position.set(1.5, 0, 2);
        patellaGroup.add(medialFacet);
        
        const lateralFacet = new THREE.Mesh(facetGeometry, boneMaterial);
        lateralFacet.position.set(-1.5, 0, 2);
        patellaGroup.add(lateralFacet);
        
        return patellaGroup;
      };
      
      const patella = createPatella();
      patella.position.set(0, -40, 8);
      group.add(patella);

      return group;
    };

    // Create anatomically accurate foot exactly matching reference image
    const createFoot = () => {
      const group = new THREE.Group();
      
      // Calcaneus (heel bone) - large, robust with realistic shape
      const calcaneusGeometry = new THREE.BoxGeometry(10, 8, 16);
      const calcaneus = new THREE.Mesh(calcaneusGeometry, boneMaterial);
      calcaneus.position.set(0, -2, -8);
      // Add realistic heel contour
      calcaneus.scale.set(1, 0.8, 1.2);
      group.add(calcaneus);
      
      // Calcaneal tuberosity (prominent heel projection)
      const tuberosityGeometry = new THREE.BoxGeometry(8, 6, 6);
      const tuberosity = new THREE.Mesh(tuberosityGeometry, boneMaterial);
      tuberosity.position.set(0, -4, -14);
      group.add(tuberosity);

      // Talus (ankle bone) - dome-shaped for tibia articulation
      const talusGeometry = new THREE.SphereGeometry(4, 16, 12);
      const talus = new THREE.Mesh(talusGeometry, boneMaterial);
      talus.position.set(0, 3, -3);
      talus.scale.set(1.4, 0.8, 1.2);
      group.add(talus);

      // Navicular bone (boat-shaped midfoot bone)
      const navicularGeometry = new THREE.BoxGeometry(8, 4, 5);
      const navicular = new THREE.Mesh(navicularGeometry, boneMaterial);
      navicular.position.set(0, 0, 4);
      group.add(navicular);

      // Cuboid bone (lateral midfoot) - cube-like shape
      const cuboidGeometry = new THREE.BoxGeometry(5, 4, 6);
      const cuboid = new THREE.Mesh(cuboidGeometry, boneMaterial);
      cuboid.position.set(-4, -1, 1);
      group.add(cuboid);

      // Cuneiform bones (3 wedge-shaped bones) - clearly separated
      const cuneiformData = [
        { size: [3, 3, 4], pos: [2, 0, 6] },   // Medial cuneiform (largest)
        { size: [2.5, 2.5, 3], pos: [0, 0, 7] }, // Intermediate cuneiform
        { size: [2, 2, 3], pos: [-2, 0, 6] }     // Lateral cuneiform
      ];
      
      cuneiformData.forEach((bone, i) => {
        const geometry = new THREE.BoxGeometry(...bone.size);
        const cuneiform = new THREE.Mesh(geometry, boneMaterial);
        cuneiform.position.set(...bone.pos);
        group.add(cuneiform);
      });

      // Metatarsals (5 distinct long bones) - clearly visible as separate bones
      const metatarsalData = [
        { length: 10, width: 1.2, pos: [-3.6, 0, 12] },  // 1st metatarsal (shortest, thickest)
        { length: 12, width: 1.0, pos: [-1.8, 0, 13] },  // 2nd metatarsal (longest)
        { length: 11, width: 1.0, pos: [0, 0, 12.5] },   // 3rd metatarsal
        { length: 10, width: 0.9, pos: [1.8, 0, 12] },   // 4th metatarsal
        { length: 9, width: 0.8, pos: [3.6, 0, 11] }     // 5th metatarsal (shortest, thinnest)
      ];
      
      metatarsalData.forEach((bone, i) => {
        const geometry = new THREE.CylinderGeometry(bone.width, bone.width * 0.8, bone.length, 12);
        const metatarsal = new THREE.Mesh(geometry, boneMaterial);
        metatarsal.position.set(...bone.pos);
        metatarsal.rotation.x = Math.PI/2;
        group.add(metatarsal);
      });

      // Toe phalanges (clearly articulated toe bones)
      const toeData = [
        { offset: -3.6, lengths: [4, 3] },      // Big toe (2 phalanges)
        { offset: -1.8, lengths: [3, 2.5, 2] }, // 2nd toe (3 phalanges)
        { offset: 0, lengths: [3, 2.5, 2] },    // 3rd toe (3 phalanges)
        { offset: 1.8, lengths: [2.5, 2, 1.5] }, // 4th toe (3 phalanges)
        { offset: 3.6, lengths: [2, 1.5, 1] }   // 5th toe (3 phalanges)
      ];
      
      toeData.forEach((toe, toeIndex) => {
        const toeGroup = new THREE.Group();
        let currentZ = 18;
        
        toe.lengths.forEach((length, phalangIndex) => {
          const width = 0.6 - (phalangIndex * 0.1) - (toeIndex === 0 ? 0 : 0.1);
          const geometry = new THREE.CylinderGeometry(width, width * 0.8, length, 8);
          const phalanx = new THREE.Mesh(geometry, boneMaterial);
          phalanx.position.set(toe.offset, 0, currentZ + length/2);
          phalanx.rotation.x = Math.PI/2;
          toeGroup.add(phalanx);
          currentZ += length + 0.5; // Small gap between phalanges
        });
        
        group.add(toeGroup);
      });

      return group;
    };

    // Create complete anatomical skeleton
    const bones = {
      'skull': createSkull(),
      'spine': createSpine(),
      'rib_cage': createRibCage(),
      'pelvis': createPelvis(),
      'left_arm': createCompleteArm('left'),
      'right_arm': createCompleteArm('right'),
      'left_hand': createHand(),
      'right_hand': createHand(),
      'left_leg': createCompleteLeg('left'),
      'right_leg': createCompleteLeg('right'),
      'left_foot': createFoot(),
      'right_foot': createFoot()
    };

    // Position complete skeleton anatomically matching reference image
    bones['skull'].position.set(0, 150, 0);
    bones['spine'].position.set(0, 20, 0);
    bones['rib_cage'].position.set(0, 60, 0);
    bones['pelvis'].position.set(0, -20, 0);
    
    // Arms positioned naturally at sides
    bones['left_arm'].position.set(-40, 50, 0);
    bones['right_arm'].position.set(40, 50, 0);
    bones['left_hand'].position.set(-43, -20, 0);
    bones['right_hand'].position.set(43, -20, 0);
    
    // Legs positioned for natural standing pose
    bones['left_leg'].position.set(-15, -50, 0);
    bones['right_leg'].position.set(15, -50, 0);
    bones['left_foot'].position.set(-15, -160, 0);
    bones['right_foot'].position.set(15, -160, 0);
    
    // Rotate feet to proper orientation
    bones['left_foot'].rotation.x = -Math.PI/2;
    bones['right_foot'].rotation.x = -Math.PI/2;

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