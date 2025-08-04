import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Text3DAnimationProps {
  clinicalText: string;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  selectedSide?: 'both' | 'left' | 'right';
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
  anthropometric?: {
    height: number;
    weight: number;
    bodyType: 'ectomorph' | 'mesomorph' | 'endomorph';
  };
  posturalDeviations?: {
    forwardHead: number;
    thoracicKyphosis: number;
    lumbarLordosis: number;
    pelvicTilt: number;
    shoulderHeight: number;
    scoliosis: number;
  };
  movementQuality?: {
    speed: 'very_slow' | 'slow' | 'normal' | 'fast';
    balance: 'poor' | 'fair' | 'good' | 'excellent';
    coordination: 'smooth' | 'mildly_jerky' | 'moderately_jerky' | 'severely_jerky';
    compensations: {
      hipHike: boolean;
      trunkLean: boolean;
      circumduction: boolean;
      trendelenburg: boolean;
    };
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

export default function Text3DAnimation({ 
  clinicalText, 
  isPlaying, 
  onTimeUpdate,
  selectedSide = 'both',
  limbScales = {
    upperArm: 1.0,
    forearm: 1.0,
    thigh: 1.0,
    shin: 1.0,
    torso: 1.0,
    overall: 1.0
  }, 
  hipPathology = {
    neckAngle: 130,
    anteversion: 12,
    acetabularCoverage: 75
  }, 
  kneePathology = {
    varusValgus: 3,
    patellaHeight: 1.0,
    tibialTorsion: 10
  }, 
  shoulderPathology = {
    scapularWinging: 3,
    acSeparation: 0,
    ghSubluxation: 0
  },
  anthropometric = {
    height: 170,
    weight: 70,
    bodyType: 'mesomorph' as const
  },
  posturalDeviations = {
    forwardHead: 0,
    thoracicKyphosis: 35,
    lumbarLordosis: -50,
    pelvicTilt: 8,
    shoulderHeight: 0,
    scoliosis: 0
  },
  movementQuality = {
    speed: 'normal' as const,
    balance: 'good' as const,
    coordination: 'smooth' as const,
    compensations: {
      hipHike: false,
      trunkLean: false,
      circumduction: false,
      trendelenburg: false
    }
  }
}: Text3DAnimationProps) {
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
  }, [rotation, limbScales, hipPathology, kneePathology, shoulderPathology, posturalDeviations]);

  // Generate animation from clinical text
  useEffect(() => {
    if (clinicalText) {
      generateAnimationFromText(clinicalText, selectedSide);
    }
  }, [clinicalText, selectedSide]);

  // Update scapular positions when pathology changes
  useEffect(() => {
    if (!bonesRef.current['leftScapula'] || !bonesRef.current['rightScapula']) return;
    
    const wingingRad = (shoulderPathology.scapularWinging * Math.PI) / 180;
    
    // Update left scapula
    const leftScapula = bonesRef.current['leftScapula'];
    leftScapula.rotation.set(0, -0.3 - wingingRad, 0);
    leftScapula.position.z = -0.12 - (wingingRad * 0.1);
    
    // Update right scapula
    const rightScapula = bonesRef.current['rightScapula'];
    rightScapula.rotation.set(0, 0.3 + wingingRad, 0);
    rightScapula.position.z = -0.12 - (wingingRad * 0.1);
  }, [shoulderPathology.scapularWinging]);

  const createSkeleton = (scene: THREE.Scene) => {
    const skeleton = new THREE.Group();
    skeletonRef.current = skeleton;

    // Realistic bone material
    const boneMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xF5DEB3, // Bone color (off-white/ivory)
      shininess: 25,
      specular: 0x111111
    });

    // Joint material
    const jointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFAAAA,
      shininess: 50,
      opacity: 0.8,
      transparent: true
    });

    // Helper function to create anatomically accurate long bones
    const createLongBone = (length: number, thickness: number, name: string): THREE.Group => {
      const boneGroup = new THREE.Group();
      
      // Shaft (diaphysis)
      const shaftGeometry = new THREE.CylinderGeometry(
        thickness * 0.7,  // top radius
        thickness * 0.7,  // bottom radius
        length * 0.8,     // height (80% of total length)
        12                // segments
      );
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.y = 0;
      boneGroup.add(shaft);
      
      // Upper end (proximal epiphysis)
      const upperEndGeometry = new THREE.SphereGeometry(thickness * 1.2, 12, 8);
      const upperEnd = new THREE.Mesh(upperEndGeometry, boneMaterial);
      upperEnd.position.y = length * 0.4;
      upperEnd.scale.y = 0.8;
      boneGroup.add(upperEnd);
      
      // Lower end (distal epiphysis)
      const lowerEndGeometry = new THREE.SphereGeometry(thickness * 1.1, 12, 8);
      const lowerEnd = new THREE.Mesh(lowerEndGeometry, boneMaterial);
      lowerEnd.position.y = -length * 0.4;
      lowerEnd.scale.y = 0.8;
      boneGroup.add(lowerEnd);
      
      boneGroup.name = name;
      return boneGroup;
    };

    // Helper function to create femur with anatomical head and neck
    const createFemur = (length: number, side: 'left' | 'right'): THREE.Group => {
      const femurGroup = new THREE.Group();
      
      // Shaft
      const shaftGeometry = new THREE.CylinderGeometry(0.045, 0.055, length * 0.8, 12);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.y = -length * 0.1;
      femurGroup.add(shaft);
      
      // Femoral head (ball joint)
      const headGeometry = new THREE.SphereGeometry(0.08, 16, 12);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.y = length * 0.45;
      head.position.x = side === 'left' ? 0.03 : -0.03;
      femurGroup.add(head);
      
      // Neck (connecting head to shaft)
      const neckGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8);
      const neck = new THREE.Mesh(neckGeometry, boneMaterial);
      neck.position.y = length * 0.38;
      neck.position.x = side === 'left' ? 0.015 : -0.015;
      neck.rotation.z = side === 'left' ? -Math.PI / 6 : Math.PI / 6;
      femurGroup.add(neck);
      
      // Greater trochanter
      const trochanterGeometry = new THREE.BoxGeometry(0.06, 0.1, 0.04);
      const trochanter = new THREE.Mesh(trochanterGeometry, boneMaterial);
      trochanter.position.y = length * 0.35;
      trochanter.position.x = side === 'left' ? -0.04 : 0.04;
      femurGroup.add(trochanter);
      
      // Condyles (knee joint)
      const condyleGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.1);
      const condyles = new THREE.Mesh(condyleGeometry, boneMaterial);
      condyles.position.y = -length * 0.45;
      femurGroup.add(condyles);
      
      femurGroup.name = `${side}Femur`;
      return femurGroup;
    };

    // Create spine and ribcage instead of solid torso
    const torsoHeight = 1.2 * limbScales.torso * limbScales.overall;
    
    // Create spine group for all vertebrae
    const spineGroup = new THREE.Group();
    spineGroup.name = 'spineGroup';
    
    // Create individual vertebrae with anatomical curves
    const vertebraHeight = 0.04;
    const spineStartY = torsoHeight + 0.9 - 0.15; // Start spine lower so it connects from head to pelvis
    
    // Define vertebrae regions
    const cervicalCount = 7;
    const thoracicCount = 12;
    const lumbarCount = 5;
    const totalVertebrae = cervicalCount + thoracicCount + lumbarCount;
    
    // Curve parameters (in radians) - enhanced for more natural S-curve
    const cervicalLordosis = -(35 + posturalDeviations.forwardHead * 0.5) * (Math.PI / 180); // Increased cervical lordosis
    const thoracicKyphosis = (40 + posturalDeviations.thoracicKyphosis) * (Math.PI / 180);  // Natural thoracic kyphosis
    const lumbarLordosis = -(40 + posturalDeviations.lumbarLordosis) * (Math.PI / 180);   // Increased lumbar lordosis
    
    let currentY = spineStartY;
    let vertebraIndex = 0;
    
    // Store all vertebrae for rib attachment
    const allVertebrae: THREE.Mesh[] = [];
    const thoracicVertebrae: THREE.Mesh[] = [];
    
    // Track total vertebrae count across regions
    let totalVertebraeCreated = 0;
    
    // Helper function to create vertebra with processes
    const createVertebraWithProcesses = (radius: number, height: number, hasProcesses: boolean = true): THREE.Group => {
      const vertebraGroup = new THREE.Group();
      
      // Main vertebral body
      const bodyGeometry = new THREE.CylinderGeometry(radius, radius, height, 12);
      const body = new THREE.Mesh(bodyGeometry, boneMaterial);
      vertebraGroup.add(body);
      
      if (hasProcesses) {
        // Spinous process (backward pointing)
        const spinousGeometry = new THREE.BoxGeometry(radius * 0.3, height * 0.8, radius * 1.2);
        const spinous = new THREE.Mesh(spinousGeometry, boneMaterial);
        spinous.position.set(0, 0, -radius * 0.7);
        vertebraGroup.add(spinous);
        
        // Transverse processes (side pointing)
        const transverseGeometry = new THREE.BoxGeometry(radius * 1.8, height * 0.6, radius * 0.3);
        const transverse = new THREE.Mesh(transverseGeometry, boneMaterial);
        transverse.position.set(0, 0, -radius * 0.3);
        vertebraGroup.add(transverse);
      }
      
      return vertebraGroup;
    };
    
    // Helper function to create curved spine segment
    const createSpineSegment = (count: number, curvature: number, regionName: string, startY: number) => {
      const baseSpacing = vertebraHeight * 0.8; // Reduced spacing for better connection
      const segmentHeight = count * baseSpacing;
      
      // Improved curve calculation for more visible curves
      let curveRadius: number;
      if (Math.abs(curvature) > 0.01) {
        curveRadius = segmentHeight / (2 * Math.abs(curvature));
      } else {
        curveRadius = 10000; // Very large radius for nearly straight spine
      }
      
      // Determine vertebra sizes based on region with gradual transitions
      let startRadius: number, endRadius: number;
      if (regionName === 'cervical') {
        startRadius = 0.032; // Normal cervical size
        endRadius = 0.036;  // Appropriately sized
      } else if (regionName === 'thoracic') {
        startRadius = 0.036;
        endRadius = 0.042;
      } else { // lumbar
        startRadius = 0.043;
        endRadius = 0.05;
      }
      
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        
        // Gradual size increase within region
        const currentRadius = startRadius + (endRadius - startRadius) * t;
        const currentHeight = vertebraHeight * (1 + t * 0.1);
        
        // Create vertebra with processes (no processes for C1-C2)
        const hasProcesses = regionName !== 'cervical' || i > 1;
        const vertebra = createVertebraWithProcesses(currentRadius, currentHeight, hasProcesses);
        
        // Calculate position along curve
        const angle = curvature * (t - 0.5); // Center the curve
        
        // Position along the curve with enhanced displacement for visible S-curve
        const localY = i * baseSpacing;
        const localZ = Math.sin(angle) * segmentHeight * 0.25; // Increased curve displacement
        
        // Position spine more posteriorly (towards back) - cervical slightly forward
        const spineBackOffset = regionName === 'cervical' ? -0.02 : -0.08; // Cervical slightly less backward than thoracic
        vertebra.position.set(0, startY - localY, localZ + spineBackOffset);
        vertebra.rotation.x = angle * 0.5; // Increased rotation for more pronounced curve
        
        vertebra.name = `${regionName}_vertebra_${i}`;
        spineGroup.add(vertebra);
        
        // Add intervertebral disc AFTER the vertebra (not after the last one)
        if (i < count - 1 || (totalVertebraeCreated < totalVertebrae - 1)) {
          const discHeight = baseSpacing * 0.25;
          const discRadius = currentRadius * 0.9;
          const discGeometry = new THREE.CylinderGeometry(discRadius, discRadius, discHeight, 12);
          const discMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xdddddd,
            opacity: 0.85,
            transparent: true
          });
          const disc = new THREE.Mesh(discGeometry, discMaterial);
          
          // Calculate next vertebra position
          const nextT = Math.min((i + 1) / (count - 1), 1);
          const nextAngle = curvature * (nextT - 0.5);
          const nextY = startY - ((i + 1) * baseSpacing);
          const nextZ = Math.sin(nextAngle) * segmentHeight * 0.25 + spineBackOffset;
          
          // Position disc between current and next vertebra
          disc.position.set(
            0,
            (vertebra.position.y + nextY) / 2,
            (vertebra.position.z + nextZ) / 2
          );
          disc.rotation.x = (angle + nextAngle) * 0.15;
          disc.name = `${regionName}_disc_${i + 1}`;
          spineGroup.add(disc);
        }
        
        // Store vertebrae for later reference
        allVertebrae.push(vertebra);
        
        // Only add to thoracicVertebrae if this is a thoracic region vertebra
        if (regionName === 'thoracic') {
          thoracicVertebrae.push(vertebra);
        }
        
        totalVertebraeCreated++;
        vertebraIndex++;
      }
      
      return startY - segmentHeight;
    };
    
    // Create cervical spine (C1-C7) with lordosis
    currentY = createSpineSegment(cervicalCount, cervicalLordosis, 'cervical', currentY);
    
    // Add transitional vertebra between cervical and thoracic
    const c7t1Transition = createVertebraWithProcesses(0.0355, vertebraHeight * 1.05, true);
    c7t1Transition.position.set(0, currentY - vertebraHeight * 0.4, 0);
    c7t1Transition.name = 'c7_t1_transition';
    spineGroup.add(c7t1Transition);
    allVertebrae.push(c7t1Transition);
    currentY -= vertebraHeight * 0.8;
    
    // Clear thoracicVertebrae array before creating thoracic spine
    thoracicVertebrae.length = 0;
    
    // Create thoracic spine (T1-T12) with kyphosis
    currentY = createSpineSegment(thoracicCount, thoracicKyphosis, 'thoracic', currentY);
    
    // Add transitional vertebra between thoracic and lumbar
    const t12l1Transition = createVertebraWithProcesses(0.0425, vertebraHeight * 1.08, true);
    t12l1Transition.position.set(0, currentY - vertebraHeight * 0.4, 0);
    t12l1Transition.name = 't12_l1_transition';
    spineGroup.add(t12l1Transition);
    allVertebrae.push(t12l1Transition);
    currentY -= vertebraHeight * 0.8;
    
    // Create lumbar spine (L1-L5) with lordosis
    createSpineSegment(lumbarCount, lumbarLordosis, 'lumbar', currentY);
    

    
    // Create visual spine connecting tube for continuous appearance
    if (allVertebrae.length > 1) {
      const spinePoints: THREE.Vector3[] = [];
      allVertebrae.forEach(vertebra => {
        spinePoints.push(vertebra.position.clone());
      });
      
      const spineCurve = new THREE.CatmullRomCurve3(spinePoints, false, 'centripetal');
      const spineGeometry = new THREE.TubeGeometry(spineCurve, 100, 0.02, 12, false);
      const spineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xF5DEB3, 
        opacity: 0.3,
        transparent: true
      });
      const spineLineVisual = new THREE.Mesh(spineGeometry, spineMaterial);
      spineLineVisual.name = 'spineLineVisual';
      spineGroup.add(spineLineVisual);
    }
    
    // Create sternum (breastbone) - positioned to follow thoracic curve
    const sternumGeometry = new THREE.BoxGeometry(0.06, 0.35, 0.03);
    const sternum = new THREE.Mesh(sternumGeometry, boneMaterial);
    
    // Calculate sternum position based on actual thoracic vertebrae positions
    if (thoracicVertebrae.length > 0) {
      // Get average position of middle thoracic vertebrae
      const midStart = Math.floor(thoracicVertebrae.length * 0.3);
      const midEnd = Math.ceil(thoracicVertebrae.length * 0.7);
      let avgY = 0, avgZ = 0, avgRotX = 0;
      let count = 0;
      
      for (let i = midStart; i < midEnd && i < thoracicVertebrae.length; i++) {
        avgY += thoracicVertebrae[i].position.y;
        avgZ += thoracicVertebrae[i].position.z;
        avgRotX += thoracicVertebrae[i].rotation.x;
        count++;
      }
      
      avgY /= count;
      avgZ /= count;
      avgRotX /= count;
      
      // Position sternum in front of the average thoracic position
      sternum.position.set(0, avgY, avgZ + 0.16);
      sternum.rotation.x = avgRotX * 0.8; // Slightly less tilted than vertebrae
    }
    sternum.name = 'sternum';
    spineGroup.add(sternum);
    
    // Create ribcage attached to actual thoracic vertebrae
    const ribCount = 12;
    
    // Create ribs attached to thoracic vertebrae
    for (let i = 0; i < ribCount && i < thoracicVertebrae.length; i++) {
      const vertebra = thoracicVertebrae[i];
      // More aggressive taper for upper ribs (T1-T3 are smaller)
      let ribRadius;
      if (i < 3) {
        ribRadius = 0.08 + (i * 0.02); // Start small for upper ribs
      } else {
        ribRadius = 0.14 - ((i - 3) * 0.003); // Normal taper for rest
      }
      
      // Get vertebra position and rotation
      const vertebraPos = vertebra.position;
      const vertebraRot = vertebra.rotation;
      
      // Create curved rib path starting from actual vertebra position
      // Adjust front extension for upper ribs
      const frontExtension = i < 3 ? 0.12 + (i * 0.02) : 0.2;
      
      // Calculate rib curve that follows the thoracic kyphosis
      // The ribs should curve forward following the spine's curvature
      const ribAngle = vertebraRot.x; // Get the vertebra's tilt angle
      
      // Calculate sternum position for this specific rib level
      const sternumYOffset = 0; // Keep ribs horizontal
      const sternumZ = vertebraPos.z + frontExtension * Math.cos(ribAngle) + 0.05;
      
      // Ribs should angle downward from back to front
      // Adjust rib positioning to be anatomically correct
      const ribVerticalOffset = 0; // No offset needed now that spine is correctly positioned
      const ribDownwardAngle = 0.015 + (i * 0.002); // Gentle downward slope
      
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, vertebraPos.y + ribVerticalOffset, vertebraPos.z), // Back (spine attachment point)
        new THREE.Vector3(ribRadius * 0.7, vertebraPos.y + ribVerticalOffset - ribDownwardAngle * 0.5, vertebraPos.z + (sternumZ - vertebraPos.z) * 0.2),
        new THREE.Vector3(ribRadius, vertebraPos.y + ribVerticalOffset - ribDownwardAngle, vertebraPos.z + (sternumZ - vertebraPos.z) * 0.5),
        new THREE.Vector3(ribRadius * 0.7, vertebraPos.y + ribVerticalOffset - ribDownwardAngle * 0.8, vertebraPos.z + (sternumZ - vertebraPos.z) * 0.8),
        new THREE.Vector3(0, vertebraPos.y + ribVerticalOffset - ribDownwardAngle * 0.5, sternumZ) // Front (sternum position)
      ]);
      
      // Make upper ribs thinner
      const ribThickness = i < 3 ? 0.012 + (i * 0.002) : 0.02;
      const ribGeometry = new THREE.TubeGeometry(ribCurve, 20, ribThickness, 8, false);
      
      // Create a group for this rib pair to handle rotation properly
      const ribPairGroup = new THREE.Group();
      ribPairGroup.position.copy(vertebraPos);
      ribPairGroup.rotation.x = vertebraRot.x; // Rotate entire rib pair with vertebra
      
      // Left rib
      const leftRib = new THREE.Mesh(ribGeometry, boneMaterial);
      leftRib.position.sub(vertebraPos); // Offset to local coordinates
      leftRib.name = `leftRib_${i}`;
      ribPairGroup.add(leftRib);
      
      // Right rib (mirrored)
      const rightRib = new THREE.Mesh(ribGeometry, boneMaterial);
      rightRib.position.sub(vertebraPos); // Offset to local coordinates
      rightRib.scale.x = -1;
      rightRib.name = `rightRib_${i}`;
      ribPairGroup.add(rightRib);
      
      spineGroup.add(ribPairGroup);
    }
    
    skeleton.add(spineGroup);
    bonesRef.current['spineGroup'] = spineGroup; // Add spine group to bonesRef
    
    // Create a reference torso mesh for animations (invisible)
    const torsoReference = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, torsoHeight, 0.01),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    torsoReference.position.y = torsoHeight / 2 + 0.9;
    torsoReference.name = 'torso';
    skeleton.add(torsoReference);
    bonesRef.current['torso'] = torsoReference;

    // Create anatomically accurate skull
    const createSkull = (): THREE.Group => {
      const skullGroup = new THREE.Group();
      
      // Cranium (main skull)
      const craniumGeometry = new THREE.SphereGeometry(0.18, 16, 16);
      const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
      cranium.scale.set(1, 1.1, 0.95); // Slightly elongated vertically
      cranium.position.y = 0.05;
      skullGroup.add(cranium);
      
      // Face/maxilla
      const faceGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.12);
      const face = new THREE.Mesh(faceGeometry, boneMaterial);
      face.position.set(0, -0.05, 0.08);
      skullGroup.add(face);
      
      // Eye sockets
      const eyeSocketGeometry = new THREE.SphereGeometry(0.04, 12, 12);
      const eyeSocketMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        opacity: 0.5,
        transparent: true
      });
      
      const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
      leftEyeSocket.position.set(-0.05, 0, 0.15);
      leftEyeSocket.scale.z = 0.5;
      skullGroup.add(leftEyeSocket);
      
      const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
      rightEyeSocket.position.set(0.05, 0, 0.15);
      rightEyeSocket.scale.z = 0.5;
      skullGroup.add(rightEyeSocket);
      
      // Nasal cavity
      const nasalGeometry = new THREE.ConeGeometry(0.02, 0.04, 3);
      const nasal = new THREE.Mesh(nasalGeometry, eyeSocketMaterial);
      nasal.position.set(0, -0.02, 0.15);
      nasal.rotation.x = Math.PI;
      skullGroup.add(nasal);
      
      // Mandible (jaw)
      const mandibleShape = new THREE.Shape();
      mandibleShape.moveTo(-0.08, 0);
      mandibleShape.quadraticCurveTo(-0.09, -0.05, -0.07, -0.08);
      mandibleShape.lineTo(-0.05, -0.09);
      mandibleShape.quadraticCurveTo(0, -0.1, 0.05, -0.09);
      mandibleShape.lineTo(0.07, -0.08);
      mandibleShape.quadraticCurveTo(0.09, -0.05, 0.08, 0);
      mandibleShape.quadraticCurveTo(0, 0.02, -0.08, 0);
      
      const mandibleGeometry = new THREE.ExtrudeGeometry(mandibleShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01
      });
      
      const mandible = new THREE.Mesh(mandibleGeometry, boneMaterial);
      mandible.position.set(0, -0.12, 0.04);
      skullGroup.add(mandible);
      
      return skullGroup;
    };
    
    // Head - position based on scaled torso
    const headMesh = createSkull();
    headMesh.position.y = torsoHeight + 0.9 + 0.25; // Positioned head appropriately above spine
    headMesh.name = 'head';
    skeleton.add(headMesh);
    bonesRef.current['head'] = headMesh;
    
    // Create anatomically accurate pelvis with two innominate bones
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.7, 0);  // Lowered from 0.9 to 0.7
    pelvisGroup.name = 'pelvisGroup';
    
    // Function to create one innominate bone as a unified butterfly-shaped structure
    const createInnominateBone = (side: 'left' | 'right') => {
      const innominateGroup = new THREE.Group();
      const sideMultiplier = side === 'left' ? -1 : 1;
      
      // Create the main innominate bone as one continuous butterfly-shaped structure
      const innominateShape = new THREE.Shape();
      
      // Start at the acetabulum region (hip socket location)
      innominateShape.moveTo(0.1 * sideMultiplier, 0);
      
      // Trace up to create the large iliac wing (upper butterfly wing)
      innominateShape.bezierCurveTo(
        0.13 * sideMultiplier, 0.03,
        0.2 * sideMultiplier, 0.1,
        0.3 * sideMultiplier, 0.2  // Smaller iliac wing
      );
      
      // Iliac crest (top of the wing) - curved like butterfly wing edge
      innominateShape.bezierCurveTo(
        0.3 * sideMultiplier, 0.23,
        0.23 * sideMultiplier, 0.26,
        0.13 * sideMultiplier, 0.26
      );
      
      // Inner edge of iliac wing toward sacrum
      innominateShape.bezierCurveTo(
        0.07 * sideMultiplier, 0.23,
        0.03 * sideMultiplier, 0.17,
        0.03 * sideMultiplier, 0.1
      );
      
      // Curve down to sacroiliac joint area
      innominateShape.lineTo(0.03 * sideMultiplier, 0);
      
      // Move down posterior side (ischium region)
      innominateShape.bezierCurveTo(
        0.05 * sideMultiplier, -0.03,
        0.08 * sideMultiplier, -0.07,
        0.1 * sideMultiplier, -0.1  // Ischial tuberosity
      );
      
      // Curve forward under obturator foramen
      innominateShape.bezierCurveTo(
        0.08 * sideMultiplier, -0.11,
        0.05 * sideMultiplier, -0.1,
        0.03 * sideMultiplier, -0.09
      );
      
      // Move forward to pubis
      innominateShape.bezierCurveTo(
        0.01 * sideMultiplier, -0.07,
        0, -0.05,
        0, -0.02  // Meet at pubic symphysis
      );
      
      // Superior pubic ramus back to acetabulum
      innominateShape.bezierCurveTo(
        0.01 * sideMultiplier, 0,
        0.05 * sideMultiplier, 0.01,
        0.1 * sideMultiplier, 0  // Back to start
      );
      
      // Create obturator foramen as a hole in the shape
      const foramenPath = new THREE.Path();
      // Create oval hole for obturator foramen
      const fx = 0.05 * sideMultiplier;
      const fy = -0.05;
      foramenPath.moveTo(fx + 0.02 * sideMultiplier, fy);
      foramenPath.ellipse(
        0, 0,  // Center offset
        0.02,  // X radius (smaller)
        0.03,  // Y radius (smaller)
        0,     // Start angle
        Math.PI * 2,  // End angle
        false  // Clockwise
      );
      innominateShape.holes.push(foramenPath);
      
      // Extrude the unified shape
      const innominateGeometry = new THREE.ExtrudeGeometry(innominateShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3
      });
      
      // Create the mesh - no rotation needed, shape is already vertical
      const innominate = new THREE.Mesh(innominateGeometry, boneMaterial);
      innominate.position.set(0, 0, 0);
      innominateGroup.add(innominate);
      
      // Add acetabulum (hip socket) as a separate spherical element
      const coverageAngle = (hipPathology.acetabularCoverage / 100) * Math.PI;
      const socketGeometry = new THREE.SphereGeometry(0.05, 20, 20, 0, coverageAngle);  // Smaller socket
      const socket = new THREE.Mesh(socketGeometry, boneMaterial);
      socket.rotation.z = (Math.PI / 2) * sideMultiplier;
      socket.position.set(0.1 * sideMultiplier, -0.03, 0);  // Adjusted position
      socket.name = `${side}HipSocket`;
      innominateGroup.add(socket);
      
      // Add ischial spine detail
      const spineGeometry = new THREE.ConeGeometry(0.02, 0.04, 8);
      const ischialSpine = new THREE.Mesh(spineGeometry, boneMaterial);
      ischialSpine.rotation.z = -Math.PI / 4 * sideMultiplier;
      ischialSpine.rotation.x = Math.PI / 2; // Point backward
      ischialSpine.position.set(0.12 * sideMultiplier, -0.05, -0.05);
      innominateGroup.add(ischialSpine);
      
      innominateGroup.name = `${side}Innominate`;
      return innominateGroup;
    };
    
    // Create left and right innominate bones
    const leftInnominate = createInnominateBone('left');
    pelvisGroup.add(leftInnominate);
    
    const rightInnominate = createInnominateBone('right');
    pelvisGroup.add(rightInnominate);
    
    // Add pubic symphysis (front connection between innominates)
    const pubicGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const pubicBone = new THREE.Mesh(pubicGeometry, boneMaterial);
    pubicBone.rotation.z = Math.PI / 2;
    pubicBone.position.set(0, -0.15, 0.08);
    pelvisGroup.add(pubicBone);
    
    // Add sacrum (connects to innominates at back)
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
    
    // Add innominate bones to bonesRef for animation
    bonesRef.current['leftInnominate'] = leftInnominate;
    bonesRef.current['rightInnominate'] = rightInnominate;
    
    // Create invisible reference for animations
    const pelvisReference = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pelvisReference.position.set(0, 0.7, 0);  // Match pelvisGroup position
    pelvisReference.name = 'pelvis';
    skeleton.add(pelvisReference);
    bonesRef.current['pelvis'] = pelvisReference;

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
    
    // Create anatomically accurate humerus
    const createHumerus = (length: number): THREE.Group => {
      const humerusGroup = new THREE.Group();
      
      // Shaft
      const shaftGeometry = new THREE.CylinderGeometry(0.035, 0.04, length * 0.8, 10);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.y = -length * 0.1;
      humerusGroup.add(shaft);
      
      // Humeral head (ball joint)
      const headGeometry = new THREE.SphereGeometry(0.06, 12, 10);
      const head = new THREE.Mesh(headGeometry, boneMaterial);
      head.position.y = length * 0.45;
      humerusGroup.add(head);
      
      // Greater tubercle
      const tubercleGeometry = new THREE.BoxGeometry(0.03, 0.04, 0.03);
      const tubercle = new THREE.Mesh(tubercleGeometry, boneMaterial);
      tubercle.position.set(0.035, length * 0.4, 0);
      humerusGroup.add(tubercle);
      
      // Distal end (elbow joint area)
      const distalGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.05);
      const distal = new THREE.Mesh(distalGeometry, boneMaterial);
      distal.position.y = -length * 0.45;
      humerusGroup.add(distal);
      
      return humerusGroup;
    };
    
    // Create anatomically accurate forearm bones (radius and ulna)
    const createForearm = (length: number): THREE.Group => {
      const forearmGroup = new THREE.Group();
      
      // Radius (thumb side)
      const radiusGeometry = new THREE.CylinderGeometry(0.02, 0.025, length * 0.95, 8);
      const radius = new THREE.Mesh(radiusGeometry, boneMaterial);
      radius.position.set(0.015, -length * 0.025, 0);
      forearmGroup.add(radius);
      
      // Ulna (pinky side)
      const ulnaGeometry = new THREE.CylinderGeometry(0.025, 0.02, length * 0.95, 8);
      const ulna = new THREE.Mesh(ulnaGeometry, boneMaterial);
      ulna.position.set(-0.015, -length * 0.025, 0);
      forearmGroup.add(ulna);
      
      // Olecranon process (elbow point)
      const olecranonGeometry = new THREE.BoxGeometry(0.03, 0.04, 0.03);
      const olecranon = new THREE.Mesh(olecranonGeometry, boneMaterial);
      olecranon.position.set(-0.015, length * 0.45, -0.02);
      forearmGroup.add(olecranon);
      
      return forearmGroup;
    };
    
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
    
    // Left upper arm (humerus)
    const leftUpperArm = createHumerus(upperArmLength);
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
    const leftForearm = createForearm(forearmLength);
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
    
    // Right upper arm (humerus)
    const rightUpperArm = createHumerus(upperArmLength);
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
    const rightForearm = createForearm(forearmLength);
    rightForearm.position.set(0, -forearmLength / 2, 0);
    rightForearm.name = 'rightForearm';
    rightElbowGroup.add(rightForearm);
    bonesRef.current['rightForearm'] = rightForearm;

    skeleton.add(rightArmGroup);

    // Create anatomically accurate hand
    const createHand = (): THREE.Group => {
      const handGroup = new THREE.Group();
      
      // Palm
      const palmGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.02);
      const palm = new THREE.Mesh(palmGeometry, boneMaterial);
      palm.position.y = -0.05;
      handGroup.add(palm);
      
      // Fingers (simplified)
      const fingerGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6);
      
      // Index, middle, ring, pinky
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(fingerGeometry, boneMaterial);
        finger.position.set(-0.03 + i * 0.02, -0.13, 0);
        finger.rotation.z = (i - 1.5) * 0.05; // Slight spread
        handGroup.add(finger);
      }
      
      // Thumb
      const thumb = new THREE.Mesh(fingerGeometry, boneMaterial);
      thumb.position.set(-0.04, -0.08, 0.01);
      thumb.rotation.z = -0.4;
      thumb.scale.y = 0.7;
      handGroup.add(thumb);
      
      return handGroup;
    };
    
    // Add hands
    const leftHand = createHand();
    leftHand.position.set(0, -forearmLength - 0.05, 0);
    leftHand.name = 'leftHand';
    leftElbowGroup.add(leftHand); // Attach to elbow group

    const rightHand = createHand();
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
    bonesRef.current['leftScapula'] = leftScapula;
    
    // Right scapula with winging pathology
    const rightScapula = new THREE.Mesh(scapula3D, boneMaterial);
    rightScapula.position.set(0.22, torsoHeight + 0.9 - 0.25, -0.12); // Behind and to the side of the torso
    
    // Apply scapular winging
    rightScapula.rotation.set(0, 0.3 + wingingRad, 0); // Add winging rotation
    rightScapula.position.z = -0.12 - (wingingRad * 0.1); // Move backward with winging
    
    rightScapula.scale.x = -1; // Mirror for right side
    rightScapula.name = 'rightScapula';
    skeleton.add(rightScapula);
    bonesRef.current['rightScapula'] = rightScapula;

    // Legs with scaling
    const thighLength = 0.8 * limbScales.thigh * limbScales.overall;
    const shinLength = 0.8 * limbScales.shin * limbScales.overall;
    
    // Create anatomically accurate tibia
    const createTibia = (length: number): THREE.Group => {
      const tibiaGroup = new THREE.Group();
      
      // Shaft with triangular cross-section
      const shaftGeometry = new THREE.CylinderGeometry(0.035, 0.045, length * 0.9, 8);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.y = -length * 0.05;
      tibiaGroup.add(shaft);
      
      // Tibial plateau (top)
      const plateauGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.07);
      const plateau = new THREE.Mesh(plateauGeometry, boneMaterial);
      plateau.position.y = length * 0.45;
      tibiaGroup.add(plateau);
      
      // Medial malleolus (ankle bone)
      const malleolus = new THREE.SphereGeometry(0.025, 8, 6);
      const medialMalleolus = new THREE.Mesh(malleolus, boneMaterial);
      medialMalleolus.position.set(0.02, -length * 0.45, 0);
      tibiaGroup.add(medialMalleolus);
      
      return tibiaGroup;
    };
    
    // Left leg group for hierarchical transformation
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.1, 0.6, 0); // Position at hip joint (below pelvis at 0.7) - closer together
    leftLegGroup.name = 'leftLegGroup';
    
    // Create anatomically accurate left femur
    const leftThigh = createFemur(thighLength, 'left');
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

    // Left tibia attached to knee group
    const leftShin = createTibia(shinLength);
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
    
    // Left ankle complex - anatomically accurate with talocrural and subtalar joints
    const leftAnkleGroup = new THREE.Group();
    leftAnkleGroup.position.set(0, -shinLength, 0); // Position at ankle joint
    leftAnkleGroup.name = 'leftAnkleGroup';
    leftKneeGroup.add(leftAnkleGroup);
    
    // Talocrural joint (ankle joint proper) - between tibia/fibula and talus
    const talocruralJointGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const talocruralJointMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 }); // Orange color
    const leftTalocruralJoint = new THREE.Mesh(talocruralJointGeometry, talocruralJointMaterial);
    leftTalocruralJoint.position.set(0, 0, 0);
    leftTalocruralJoint.name = 'leftTalocruralJoint';
    leftAnkleGroup.add(leftTalocruralJoint);
    
    // Talus bone
    const talusGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.05);
    const leftTalus = new THREE.Mesh(talusGeometry, boneMaterial);
    leftTalus.position.set(0, -0.03, 0);
    leftTalus.name = 'leftTalus';
    leftAnkleGroup.add(leftTalus);
    bonesRef.current['leftTalus'] = leftTalus;
    
    // Subtalar joint group - for inversion/eversion
    const leftSubtalarGroup = new THREE.Group();
    leftSubtalarGroup.position.set(0, -0.05, 0); // Below talus
    leftSubtalarGroup.name = 'leftSubtalarGroup';
    leftAnkleGroup.add(leftSubtalarGroup);
    bonesRef.current['leftSubtalarGroup'] = leftSubtalarGroup;
    
    // Subtalar joint visual
    const subtalarJointGeometry = new THREE.SphereGeometry(0.035, 16, 16);
    const subtalarJointMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 }); // Dark orange
    const leftSubtalarJoint = new THREE.Mesh(subtalarJointGeometry, subtalarJointMaterial);
    leftSubtalarJoint.position.set(0, 0, 0);
    leftSubtalarJoint.name = 'leftSubtalarJoint';
    leftSubtalarGroup.add(leftSubtalarJoint);
    
    // Calcaneus (heel bone)
    const calcaneusGeometry = new THREE.BoxGeometry(0.08, 0.05, 0.12);
    const leftCalcaneus = new THREE.Mesh(calcaneusGeometry, boneMaterial);
    leftCalcaneus.position.set(0, -0.025, -0.02); // Positioned below subtalar joint
    leftCalcaneus.name = 'leftCalcaneus';
    leftSubtalarGroup.add(leftCalcaneus);
    bonesRef.current['leftCalcaneus'] = leftCalcaneus;
    
    // Midfoot and forefoot
    const midfootGeometry = new THREE.BoxGeometry(0.06, 0.03, 0.08);
    const leftMidfoot = new THREE.Mesh(midfootGeometry, boneMaterial);
    leftMidfoot.position.set(0, -0.04, 0.06);
    leftMidfoot.name = 'leftMidfoot';
    leftSubtalarGroup.add(leftMidfoot);
    
    const forefootGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.06);
    const leftForefoot = new THREE.Mesh(forefootGeometry, boneMaterial);
    leftForefoot.position.set(0, -0.05, 0.12);
    leftForefoot.name = 'leftForefoot';
    leftSubtalarGroup.add(leftForefoot);
    bonesRef.current['leftFoot'] = leftForefoot; // For backward compatibility
    
    skeleton.add(leftLegGroup);

    // Right leg group for hierarchical transformation
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.1, 0.6, 0); // Position at hip joint (below pelvis at 0.7) - closer together
    rightLegGroup.name = 'rightLegGroup';
    
    // Right thigh attached to leg group
    const rightThigh = createFemur(thighLength, 'right');
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
    const rightShin = createTibia(shinLength);
    rightShin.position.set(0, -shinLength / 2, 0); // Relative to knee group
    
    // Apply varus/valgus angle (opposite for right side)
    rightShin.rotation.z = varusValgusRad;
    
    // Apply tibial torsion (opposite for right side)
    rightShin.rotation.y = -tibialTorsionRad * 0.5;
    
    rightShin.name = 'rightShin';
    rightKneeGroup.add(rightShin);
    bonesRef.current['rightShin'] = rightShin;
    
    // Right ankle complex - anatomically accurate with talocrural and subtalar joints
    const rightAnkleGroup = new THREE.Group();
    rightAnkleGroup.position.set(0, -shinLength, 0); // Position at ankle joint
    rightAnkleGroup.name = 'rightAnkleGroup';
    rightKneeGroup.add(rightAnkleGroup);
    
    // Talocrural joint (ankle joint proper) - between tibia/fibula and talus
    const rightTalocruralJoint = new THREE.Mesh(talocruralJointGeometry, talocruralJointMaterial);
    rightTalocruralJoint.position.set(0, 0, 0);
    rightTalocruralJoint.name = 'rightTalocruralJoint';
    rightAnkleGroup.add(rightTalocruralJoint);
    
    // Talus bone
    const rightTalus = new THREE.Mesh(talusGeometry, boneMaterial);
    rightTalus.position.set(0, -0.03, 0);
    rightTalus.name = 'rightTalus';
    rightAnkleGroup.add(rightTalus);
    bonesRef.current['rightTalus'] = rightTalus;
    
    // Subtalar joint group - for inversion/eversion
    const rightSubtalarGroup = new THREE.Group();
    rightSubtalarGroup.position.set(0, -0.05, 0); // Below talus
    rightSubtalarGroup.name = 'rightSubtalarGroup';
    rightAnkleGroup.add(rightSubtalarGroup);
    bonesRef.current['rightSubtalarGroup'] = rightSubtalarGroup;
    
    // Subtalar joint visual
    const rightSubtalarJoint = new THREE.Mesh(subtalarJointGeometry, subtalarJointMaterial);
    rightSubtalarJoint.position.set(0, 0, 0);
    rightSubtalarJoint.name = 'rightSubtalarJoint';
    rightSubtalarGroup.add(rightSubtalarJoint);
    
    // Calcaneus (heel bone)
    const rightCalcaneus = new THREE.Mesh(calcaneusGeometry, boneMaterial);
    rightCalcaneus.position.set(0, -0.025, -0.02); // Positioned below subtalar joint
    rightCalcaneus.name = 'rightCalcaneus';
    rightSubtalarGroup.add(rightCalcaneus);
    bonesRef.current['rightCalcaneus'] = rightCalcaneus;
    
    // Midfoot and forefoot
    const rightMidfoot = new THREE.Mesh(midfootGeometry, boneMaterial);
    rightMidfoot.position.set(0, -0.04, 0.06);
    rightMidfoot.name = 'rightMidfoot';
    rightSubtalarGroup.add(rightMidfoot);
    
    const rightForefoot = new THREE.Mesh(forefootGeometry, boneMaterial);
    rightForefoot.position.set(0, -0.05, 0.12);
    rightForefoot.name = 'rightForefoot';
    rightSubtalarGroup.add(rightForefoot);
    bonesRef.current['rightFoot'] = rightForefoot; // For backward compatibility
    
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

  const generateAnimationFromText = (text: string, side: 'both' | 'left' | 'right' = 'both') => {
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
      animationFrames = generateShoulderAbductionTest(side);
    } else if (isPhysicalTest && lowerText.includes('shoulder flexion')) {
      animationFrames = generateShoulderFlexionTest(side);
    } else if (isPhysicalTest && lowerText.includes('shoulder external rotation')) {
      animationFrames = generateShoulderExternalRotationTest(side);
    } else if (isPhysicalTest && lowerText.includes('shoulder internal rotation')) {
      animationFrames = generateShoulderInternalRotationTest(side);
    } else if (isPhysicalTest && lowerText.includes('scapula protraction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('scapula retraction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('knee extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('knee flexion')) {
      animationFrames = generateKneeFlexionTest(side);
    } else if (isPhysicalTest && lowerText.includes('hip flexion')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip extension')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip abduction')) {
      animationFrames = generateHipAbductionTest(side);
    } else if (isPhysicalTest && lowerText.includes('hip adduction')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip internal rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('hip external rotation')) {
      animationFrames = generateGeneralMovementAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle dorsiflexion')) {
      animationFrames = generateAnkleDorsiflexionAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle plantarflexion')) {
      animationFrames = generateAnklePlantarFlexionAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle inversion')) {
      animationFrames = generateAnkleInversionAnimation();
    } else if (isPhysicalTest && lowerText.includes('ankle eversion')) {
      animationFrames = generateAnkleEversionAnimation();
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

  const generateShoulderExternalRotationTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, (side === 'both' || side === 'left') ? -1.0 : 0, 0] }, // External rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, (side === 'both' || side === 'right') ? 1.0 : 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] }, // Maintain elbow bend
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [-1.57, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.14], rotation: [0, (side === 'both' || side === 'left') ? -0.4 : -0.3, (side === 'both' || side === 'left') ? -0.1 : 0] }, // Slight retraction
          rightScapula: { position: [0.22, 1.55, -0.14], rotation: [0, (side === 'both' || side === 'right') ? 0.4 : 0.3, (side === 'both' || side === 'right') ? 0.1 : 0] }
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

  const generateShoulderInternalRotationTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, (side === 'both' || side === 'left') ? 1.0 : 0, 0] }, // Internal rotation
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, (side === 'both' || side === 'right') ? -1.0 : 0, 0] },
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

  const generateShoulderFlexionTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [(side === 'both' || side === 'left') ? -1.57 : 0, 0, 0] }, // 90 degrees forward
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [(side === 'both' || side === 'right') ? -1.57 : 0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.57, -0.11], rotation: [(side === 'both' || side === 'left') ? 0.2 : 0, -0.3, (side === 'both' || side === 'left') ? -0.1 : 0] }, // Slight protraction
          rightScapula: { position: [0.22, 1.57, -0.11], rotation: [(side === 'both' || side === 'right') ? 0.2 : 0, 0.3, (side === 'both' || side === 'right') ? 0.1 : 0] }
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [(side === 'both' || side === 'left') ? -3.14 : 0, 0, 0] }, // 180 degrees
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [(side === 'both' || side === 'right') ? -3.14 : 0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.72, 0], rotation: [(side === 'both' || side === 'left') ? -0.1 : 0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.72, 0], rotation: [(side === 'both' || side === 'right') ? -0.1 : 0, 0, 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.24, 1.6, -0.09], rotation: [(side === 'both' || side === 'left') ? 0.4 : 0, (side === 'both' || side === 'left') ? -0.4 : -0.3, (side === 'both' || side === 'left') ? -0.2 : 0] }, // Upward rotation
          rightScapula: { position: [0.24, 1.6, -0.09], rotation: [(side === 'both' || side === 'right') ? 0.4 : 0, (side === 'both' || side === 'right') ? 0.4 : 0.3, (side === 'both' || side === 'right') ? 0.2 : 0] }
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

  const generateShoulderAbductionTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
    // Base keyframe values
    const baseStartLeft = { position: [-0.25, 1.65, 0], rotation: [0, 0, 0.1] };
    const baseStartRight = { position: [0.25, 1.65, 0], rotation: [0, 0, -0.1] };
    const base90Left = { position: [-0.25, 1.65, 0], rotation: [0, 0, -1.57] };
    const base90Right = { position: [0.25, 1.65, 0], rotation: [0, 0, 1.57] };
    
    // Determine which arms to move based on side selection
    const leftArmStart = (side === 'both' || side === 'left') ? baseStartLeft : baseStartLeft;
    const rightArmStart = (side === 'both' || side === 'right') ? baseStartRight : baseStartRight;
    const leftArm90 = (side === 'both' || side === 'left') ? base90Left : baseStartLeft;
    const rightArm90 = (side === 'both' || side === 'right') ? base90Right : baseStartRight;
    
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
          leftArmGroup: leftArmStart,
          rightArmGroup: rightArmStart,
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
          leftArmGroup: leftArm90,
          rightArmGroup: rightArm90,
          leftClavicle: { position: [-0.13, (side === 'both' || side === 'left') ? 1.72 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -0.6 : -0.52] },
          rightClavicle: { position: [0.13, (side === 'both' || side === 'right') ? 1.72 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 0.6 : 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [(side === 'both' || side === 'left') ? -0.24 : -0.22, (side === 'both' || side === 'left') ? 1.58 : 1.55, (side === 'both' || side === 'left') ? -0.10 : -0.12], rotation: [(side === 'both' || side === 'left') ? 0.3 : 0, (side === 'both' || side === 'left') ? -0.4 : -0.3, (side === 'both' || side === 'left') ? -0.3 : 0] },
          rightScapula: { position: [(side === 'both' || side === 'right') ? 0.24 : 0.22, (side === 'both' || side === 'right') ? 1.58 : 1.55, (side === 'both' || side === 'right') ? -0.10 : -0.12], rotation: [(side === 'both' || side === 'right') ? 0.3 : 0, (side === 'both' || side === 'right') ? 0.4 : 0.3, (side === 'both' || side === 'right') ? 0.3 : 0] }
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
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -3.14 : 0.1] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 3.14 : -0.1] },
          leftClavicle: { position: [-0.13, (side === 'both' || side === 'left') ? 1.75 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -0.7 : -0.52] },
          rightClavicle: { position: [0.13, (side === 'both' || side === 'right') ? 1.75 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 0.7 : 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [(side === 'both' || side === 'left') ? -0.26 : -0.22, (side === 'both' || side === 'left') ? 1.62 : 1.55, (side === 'both' || side === 'left') ? -0.08 : -0.12], rotation: [(side === 'both' || side === 'left') ? 0.5 : 0, (side === 'both' || side === 'left') ? -0.5 : -0.3, (side === 'both' || side === 'left') ? -0.4 : 0] },
          rightScapula: { position: [(side === 'both' || side === 'right') ? 0.26 : 0.22, (side === 'both' || side === 'right') ? 1.62 : 1.55, (side === 'both' || side === 'right') ? -0.08 : -0.12], rotation: [(side === 'both' || side === 'right') ? 0.5 : 0, (side === 'both' || side === 'right') ? 0.5 : 0.3, (side === 'both' || side === 'right') ? 0.4 : 0] }
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
          leftArmGroup: leftArm90,
          rightArmGroup: rightArm90,
          leftClavicle: { position: [-0.13, (side === 'both' || side === 'left') ? 1.72 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -0.6 : -0.52] },
          rightClavicle: { position: [0.13, (side === 'both' || side === 'right') ? 1.72 : 1.7, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 0.6 : 0.52] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [(side === 'both' || side === 'left') ? -0.24 : -0.22, (side === 'both' || side === 'left') ? 1.58 : 1.55, (side === 'both' || side === 'left') ? -0.10 : -0.12], rotation: [(side === 'both' || side === 'left') ? 0.3 : 0, (side === 'both' || side === 'left') ? -0.4 : -0.3, (side === 'both' || side === 'left') ? -0.3 : 0] },
          rightScapula: { position: [(side === 'both' || side === 'right') ? 0.24 : 0.22, (side === 'both' || side === 'right') ? 1.58 : 1.55, (side === 'both' || side === 'right') ? -0.10 : -0.12], rotation: [(side === 'both' || side === 'right') ? 0.3 : 0, (side === 'both' || side === 'right') ? 0.4 : 0.3, (side === 'both' || side === 'right') ? 0.3 : 0] }
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
          leftArmGroup: leftArmStart,
          rightArmGroup: rightArmStart,
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
          // Starting position - standing with updated pelvis position
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.7, 0], rotation: [0, 0, 0] },  // Updated to 0.7
          leftLegGroup: { position: [-0.1, 0.6, 0], rotation: [0, 0, 0] },  // Updated positions
          rightLegGroup: { position: [0.1, 0.6, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.1, 0.6, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.1, 0.6, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-0.8, 0, 0] }, // Arms forward for balance
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.8, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.1, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.1, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] }, // Starting spine position
          leftInnominate: { position: [0, 0, 0], rotation: [0, 0, 0] }, // Neutral position
          rightInnominate: { position: [0, 0, 0], rotation: [0, 0, 0] } // Neutral position
        }
      },
      {
        time: 1000,
        joints: {
          // Mid-squat position - cleaner movement
          head: { position: [0, 1.7, 0.05], rotation: [0.05, 0, 0] },
          torso: { position: [0, 1.0, -0.05], rotation: [0.1, 0, 0] }, // Slight forward lean
          pelvis: { position: [0, 0.5, -0.1], rotation: [0.15, 0, 0] }, // Hips back slightly
          leftLegGroup: { position: [-0.1, 0.6, 0], rotation: [-0.7, 0, 0] }, // Thigh angle
          rightLegGroup: { position: [0.1, 0.6, 0], rotation: [-0.7, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.2, 0, 0] }, // Knee bend
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.2, 0, 0] },
          leftHip: { position: [-0.1, 0.5, -0.1], rotation: [0, 0, 0] }, // Follow pelvis
          rightHip: { position: [0.1, 0.5, -0.1], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.1, 0.05], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.1, 0.05], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.45, 0.05], rotation: [0.1, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.45, 0.05], rotation: [-1.0, 0, 0] }, // Arms forward
          rightArmGroup: { position: [0.25, 1.45, 0.05], rotation: [-1.0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.5, 0.05], rotation: [0.1, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.5, 0.05], rotation: [0.1, 0, 0.52] },
          leftAnkle: { position: [-0.1, -0.8, 0], rotation: [0.2, 0, 0] }, // Dorsiflexion
          rightAnkle: { position: [0.1, -0.8, 0], rotation: [0.2, 0, 0] },
          leftFoot: { position: [-0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.35, -0.07], rotation: [0.1, -0.3, 0] },
          rightScapula: { position: [0.22, 1.35, -0.07], rotation: [0.1, 0.3, 0] },
          spineGroup: { position: [0, -0.15, 0], rotation: [0.1, 0, 0] }, // Spine flexes forward in mid-squat
          leftInnominate: { position: [0, 0, 0], rotation: [0.15, 0, 0.05] }, // Forward tilt + slight outward rotation
          rightInnominate: { position: [0, 0, 0], rotation: [0.15, 0, -0.05] } // Forward tilt + slight outward rotation
        }
      },
      {
        time: 2000,
        joints: {
          // Bottom position - parallel squat
          head: { position: [0, 1.4, 0.1], rotation: [0.1, 0, 0] },
          torso: { position: [0, 0.7, -0.1], rotation: [0.2, 0, 0] },
          pelvis: { position: [0, 0.3, -0.2], rotation: [0.3, 0, 0] }, // Hips at knee level
          leftLegGroup: { position: [-0.1, 0.6, 0], rotation: [-1.2, 0, 0] }, // Thigh parallel
          rightLegGroup: { position: [0.1, 0.6, 0], rotation: [-1.2, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.4, 0, 0] }, // Full knee bend
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.4, 0, 0] },
          leftHip: { position: [-0.1, 0.3, -0.2], rotation: [0, 0, 0] }, // Follow pelvis
          rightHip: { position: [0.1, 0.3, -0.2], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0, 0.1], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0, 0.1], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.15, 0.1], rotation: [0.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.15, 0.1], rotation: [-1.3, 0, 0] },
          rightArmGroup: { position: [0.25, 1.15, 0.1], rotation: [-1.3, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.2, 0.1], rotation: [0.2, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.2, 0.1], rotation: [0.2, 0, 0.52] },
          leftAnkle: { position: [-0.1, -0.8, 0], rotation: [0.3, 0, 0] }, // More dorsiflexion
          rightAnkle: { position: [0.1, -0.8, 0], rotation: [0.3, 0, 0] },
          leftFoot: { position: [-0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.05, -0.02], rotation: [0.2, -0.3, 0] },
          rightScapula: { position: [0.22, 1.05, -0.02], rotation: [0.2, 0.3, 0] },
          spineGroup: { position: [0, -0.3, 0], rotation: [0.2, 0, 0] }, // Maximum spine flexion at bottom
          leftInnominate: { position: [0, 0, 0], rotation: [0.3, 0, 0.1] }, // Maximum forward tilt + outward rotation
          rightInnominate: { position: [0, 0, 0], rotation: [0.3, 0, -0.1] } // Maximum forward tilt + outward rotation
        }
      },
      {
        time: 3000,
        joints: {
          // Mid-return position - same as mid-squat for symmetry
          head: { position: [0, 1.7, 0.05], rotation: [0.05, 0, 0] },
          torso: { position: [0, 1.0, -0.05], rotation: [0.1, 0, 0] },
          pelvis: { position: [0, 0.5, -0.1], rotation: [0.15, 0, 0] },
          leftLegGroup: { position: [-0.1, 0.6, 0], rotation: [-0.7, 0, 0] },
          rightLegGroup: { position: [0.1, 0.6, 0], rotation: [-0.7, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [1.2, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [1.2, 0, 0] },
          leftHip: { position: [-0.1, 0.5, -0.1], rotation: [0, 0, 0] },
          rightHip: { position: [0.1, 0.5, -0.1], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0.1, 0.05], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0.1, 0.05], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.45, 0.05], rotation: [0.1, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.45, 0.05], rotation: [-1.0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.45, 0.05], rotation: [-1.0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.5, 0.05], rotation: [0.1, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.5, 0.05], rotation: [0.1, 0, 0.52] },
          leftAnkle: { position: [-0.1, -0.8, 0], rotation: [0.2, 0, 0] },
          rightAnkle: { position: [0.1, -0.8, 0], rotation: [0.2, 0, 0] },
          leftFoot: { position: [-0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.35, -0.07], rotation: [0.1, -0.3, 0] },
          rightScapula: { position: [0.22, 1.35, -0.07], rotation: [0.1, 0.3, 0] },
          spineGroup: { position: [0, -0.15, 0], rotation: [0.1, 0, 0] }, // Spine returning to neutral
          leftInnominate: { position: [0, 0, 0], rotation: [0.15, 0, 0.05] }, // Returning to neutral
          rightInnominate: { position: [0, 0, 0], rotation: [0.15, 0, -0.05] } // Returning to neutral
        }
      },
      {
        time: 4000,
        joints: {
          // Return to starting position - same as frame 0
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.7, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.1, 0.6, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.1, 0.6, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.1, 0.6, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.1, 0.6, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.1, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.1, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [-0.8, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [-0.8, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftClavicle: { position: [-0.13, 1.7, 0], rotation: [0, 0, -0.52] },
          rightClavicle: { position: [0.13, 1.7, 0], rotation: [0, 0, 0.52] },
          leftAnkle: { position: [-0.1, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.1, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.1, -0.85, 0.05], rotation: [0, 0, 0] },
          leftScapula: { position: [-0.22, 1.55, -0.12], rotation: [0, -0.3, 0] },
          rightScapula: { position: [0.22, 1.55, -0.12], rotation: [0, 0.3, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] }, // Back to neutral standing
          leftInnominate: { position: [0, 0, 0], rotation: [0, 0, 0] }, // Back to neutral
          rightInnominate: { position: [0, 0, 0], rotation: [0, 0, 0] } // Back to neutral
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

  const generateHipAbductionTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
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
          // 30 degrees abduction
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -0.52 : 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 0.52 : 0] },
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
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, (side === 'both' || side === 'left') ? -0.78 : 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, (side === 'both' || side === 'right') ? 0.78 : 0] },
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

  const generateKneeFlexionTest = (side: 'both' | 'left' | 'right' = 'both'): AnimationKeyframe[] => {
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
          // 90 degrees flexion
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [(side === 'both' || side === 'left') ? 1.57 : 0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [(side === 'both' || side === 'right') ? 1.57 : 0, 0, 0] },
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [(side === 'both' || side === 'left') ? 2.35 : 0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [(side === 'both' || side === 'right') ? 2.35 : 0, 0, 0] },
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] } // Neutral spine
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
          shoulderConnector: { position: [0, 1.3, 0.4], rotation: [1.2, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.8, 0.5], rotation: [0.3, 0, 0] }, // Arms reach down
          rightArmGroup: { position: [0.25, 0.8, 0.5], rotation: [0.3, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0, 0.2], rotation: [1.2, 0, 0] } // Major spine flexion matching torso
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] } // Back to neutral
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
          shoulderConnector: { position: [0, 0.1, -0.3], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] } // Spine flat on ground
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
          shoulderConnector: { position: [0, 0.1, -0.3], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.5, 0], rotation: [-0.3, 0, 0] } // Spine arched in bridge
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
          shoulderConnector: { position: [0, 0.1, -0.3], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.35, 0.1, -0.3], rotation: [0, 0, 0.5] },
          rightArmGroup: { position: [0.35, 0.1, -0.3], rotation: [0, 0, -0.5] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.8], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.1, 0.85], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] } // Back to flat on ground
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftHip: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightHip: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] } // Neutral spine
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
          shoulderConnector: { position: [0, 1.85, 0.1], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.85, 0.1], rotation: [-0.2, 0, 0] },
          rightArmGroup: { position: [0.25, 1.85, 0.1], rotation: [-0.2, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.1, 0.3], rotation: [0, 0, 0] }, // Right foot on step
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.2, 0.35], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0.1, 0], rotation: [0.1, 0, 0] } // Slight forward lean
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
          shoulderConnector: { position: [0, 2.05, 0.3], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 2.05, 0.3], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 2.05, 0.3], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.4, 0.3], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.5, 0.35], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.5, 0.35], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0.3, 0], rotation: [0, 0, 0] } // Elevated with step
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
          shoulderConnector: { position: [0, 1.85, 0.1], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.85, 0.1], rotation: [-0.1, 0, 0] },
          rightArmGroup: { position: [0.25, 1.85, 0.1], rotation: [-0.1, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.6, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.6, 0.3], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.7, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.7, 0.35], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0.1, 0], rotation: [0.1, 0, 0] } // Slight forward lean
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
          leftKnee: { position: [-0.15, 0, 0], rotation: [0, 0, 0] },
          rightKnee: { position: [0.15, 0, 0], rotation: [0, 0, 0] },
          shoulderConnector: { position: [0, 1.65, 0], rotation: [0, 0, 0] },
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, -0.8, 0], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, -0.9, 0.05], rotation: [0, 0, 0] },
          spineGroup: { position: [0, 0, 0], rotation: [0, 0, 0] } // Back to neutral
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
          shoulderConnector: { position: [0, 0.6, -0.2], rotation: [1.57, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.65], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.1, 0.65], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.3, 0], rotation: [1.57, 0, 0] } // Horizontal spine
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
          shoulderConnector: { position: [0, 0.6, -0.2], rotation: [1.57, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.8], rotation: [0, 0, 0] }, // Extended forward
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.6, 1.4], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.65], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.6, 1.45], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.3, 0], rotation: [1.57, 0, 0] } // Maintain neutral horizontal spine
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
          shoulderConnector: { position: [0, 0.6, -0.2], rotation: [1.57, 0, 0] },
          leftArmGroup: { position: [-0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          rightArmGroup: { position: [0.25, 0.6, -0.3], rotation: [1.57, 0, 0] },
          leftElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          rightElbowGroup: { position: [0, -0.5, 0], rotation: [0, 0, 0] },
          leftAnkle: { position: [-0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          rightAnkle: { position: [0.15, 0.1, 0.6], rotation: [0, 0, 0] },
          leftFoot: { position: [-0.15, 0.1, 0.65], rotation: [0, 0, 0] },
          rightFoot: { position: [0.15, 0.1, 0.65], rotation: [0, 0, 0] },
          spineGroup: { position: [0, -0.3, 0], rotation: [1.57, 0, 0] } // Back to horizontal spine
        }
      }
    ];
  };

  // Ankle inversion animation - demonstrates subtalar joint movement
  const generateAnkleInversionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - neutral stance
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          rightSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Left ankle inversion (subtalar joint rotation)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0.52] }, // 30° inversion
          rightSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          rightSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4500,
        joints: {
          // Right ankle inversion
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          rightSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, -0.52] }, // 30° inversion
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 6000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          rightSubtalarGroup: { position: [0, -0.05, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Ankle dorsiflexion animation - demonstrates talocrural joint movement
  const generateAnkleDorsiflexionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - neutral stance
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral ankle
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral ankle
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Left ankle dorsiflexion (talocrural joint movement)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [-0.35, 0, 0] }, // 20° dorsiflexion
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4500,
        joints: {
          // Right ankle dorsiflexion
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [-0.35, 0, 0] }, // 20° dorsiflexion
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 6000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      }
    ];
  };

  // Ankle plantar flexion animation - demonstrates talocrural joint movement
  const generateAnklePlantarFlexionAnimation = (): AnimationKeyframe[] => {
    return [
      {
        time: 0,
        joints: {
          // Starting position - neutral stance
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral ankle
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral ankle
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 1500,
        joints: {
          // Left ankle plantar flexion (pointing toes down)
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0.87, 0, 0] }, // 50° plantar flexion
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
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
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 4500,
        joints: {
          // Right ankle plantar flexion
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0.87, 0, 0] }, // 50° plantar flexion
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
        }
      },
      {
        time: 6000,
        joints: {
          // Return to neutral
          head: { position: [0, 1.9, 0], rotation: [0, 0, 0] },
          torso: { position: [0, 1.2, 0], rotation: [0, 0, 0] },
          pelvis: { position: [0, 0.9, 0], rotation: [0, 0, 0] },
          leftLegGroup: { position: [-0.15, 0.8, 0], rotation: [0, 0, 0] },
          rightLegGroup: { position: [0.15, 0.8, 0], rotation: [0, 0, 0] },
          leftKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          rightKneeGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] },
          leftAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          rightAnkleGroup: { position: [0, -0.8, 0], rotation: [0, 0, 0] }, // Neutral
          leftArmGroup: { position: [-0.25, 1.65, 0], rotation: [0, 0, 0] },
          rightArmGroup: { position: [0.25, 1.65, 0], rotation: [0, 0, 0] }
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
        // First try to get bone from bonesRef (for groups like spineGroup)
        let bone = bonesRef.current[jointName];
        
        // If not in bonesRef, try to find by name in the skeleton
        if (!bone) {
          bone = skeletonRef.current!.getObjectByName(jointName);
        }
        
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