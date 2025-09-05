import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface SkeletonConfig {
  limbLengths: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
    spine: number;
  };
  jointAngles: {
    shoulderFlexion: number;
    shoulderAbduction: number;
    elbowFlexion: number;
    hipFlexion: number;
    kneeFlexion: number;
  };
  bodyProportions: {
    shoulderWidth: number;
    hipWidth: number;
  };
}

export default function AnatomicalSkeleton3D({ config }: { config: SkeletonConfig }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting for anatomical visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffd4a3, 0.4);
    fillLight.position.set(-5, 5, 3);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonGroupRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      }
      
      // Subtle rotation
      if (skeletonGroup) {
        skeletonGroup.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (controls) {
        controls.dispose();
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, []);

  // Build anatomical skeleton
  useEffect(() => {
    if (!skeletonGroupRef.current) return;

    // Clear existing skeleton
    while (skeletonGroupRef.current.children.length > 0) {
      const child = skeletonGroupRef.current.children[0];
      skeletonGroupRef.current.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }

    const scale = 0.01;
    const { limbLengths, jointAngles, bodyProportions } = config;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // Bone materials
    const boneMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0xd4c5b9,
      roughness: 0.85,
      metalness: 0.1,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8
    });

    const cartilaginousMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0xe8ddd0,
      roughness: 0.9,
      metalness: 0.05,
      opacity: 0.95,
      transparent: true
    });

    // Helper function to create realistic bone
    const createBone = (length: number, topRadius: number, bottomRadius: number) => {
      const geometry = new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        length,
        12,
        1,
        false
      );
      const bone = new THREE.Mesh(geometry, boneMaterial);
      bone.castShadow = true;
      bone.receiveShadow = true;
      return bone;
    };

    // SKULL - Detailed anatomical skull
    const skullGroup = new THREE.Group();
    
    // Cranium (main skull)
    const craniumGeometry = new THREE.SphereGeometry(0.11, 24, 20);
    const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
    cranium.scale.set(0.85, 1.0, 0.9);
    cranium.position.y = 0.02;
    cranium.castShadow = true;
    skullGroup.add(cranium);

    // Frontal bone (forehead)
    const frontalGeometry = new THREE.SphereGeometry(0.09, 16, 12);
    const frontal = new THREE.Mesh(frontalGeometry, boneMaterial);
    frontal.scale.set(1.1, 0.6, 0.8);
    frontal.position.set(0, 0.08, 0.06);
    skullGroup.add(frontal);

    // Occipital (back of skull)
    const occipitalGeometry = new THREE.SphereGeometry(0.08, 16, 12);
    const occipital = new THREE.Mesh(occipitalGeometry, boneMaterial);
    occipital.scale.set(0.9, 0.8, 0.6);
    occipital.position.set(0, 0, -0.08);
    skullGroup.add(occipital);

    // Eye sockets
    const createEyeSocket = (side: number) => {
      const socketGeometry = new THREE.SphereGeometry(0.025, 12, 12);
      const socket = new THREE.Mesh(socketGeometry, new THREE.MeshPhysicalMaterial({ 
        color: 0x000000,
        roughness: 1,
        metalness: 0
      }));
      socket.scale.set(1, 1, 0.7);
      socket.position.set(side * 0.032, 0.015, 0.085);
      return socket;
    };
    skullGroup.add(createEyeSocket(-1));
    skullGroup.add(createEyeSocket(1));

    // Nasal bones and cavity
    const nasalGroup = new THREE.Group();
    const nasalBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.025, 0.02),
      boneMaterial
    );
    nasalBridge.position.set(0, 0.005, 0.095);
    nasalGroup.add(nasalBridge);

    const nasalCavity = new THREE.Mesh(
      new THREE.ConeGeometry(0.012, 0.025, 3),
      new THREE.MeshPhysicalMaterial({ color: 0x000000 })
    );
    nasalCavity.position.set(0, -0.01, 0.09);
    nasalCavity.rotation.x = Math.PI;
    nasalGroup.add(nasalCavity);
    skullGroup.add(nasalGroup);

    // Zygomatic bones (cheekbones)
    const createZygomatic = (side: number) => {
      const zygomaticGeometry = new THREE.BoxGeometry(0.025, 0.015, 0.02);
      const zygomatic = new THREE.Mesh(zygomaticGeometry, boneMaterial);
      zygomatic.position.set(side * 0.055, -0.015, 0.06);
      zygomatic.rotation.y = side * 0.3;
      return zygomatic;
    };
    skullGroup.add(createZygomatic(-1));
    skullGroup.add(createZygomatic(1));

    // Maxilla (upper jaw)
    const maxillaGeometry = new THREE.BoxGeometry(0.075, 0.02, 0.05);
    const maxilla = new THREE.Mesh(maxillaGeometry, boneMaterial);
    maxilla.position.set(0, -0.04, 0.04);
    skullGroup.add(maxilla);

    // Mandible (lower jaw)
    const mandibleGroup = new THREE.Group();
    const mandibleBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.025, 0.045),
      boneMaterial
    );
    mandibleBody.position.set(0, 0, 0.035);
    mandibleGroup.add(mandibleBody);

    // Mandible rami (sides)
    const createRamus = (side: number) => {
      const ramusGeometry = new THREE.BoxGeometry(0.015, 0.04, 0.02);
      const ramus = new THREE.Mesh(ramusGeometry, boneMaterial);
      ramus.position.set(side * 0.04, 0.02, 0);
      return ramus;
    };
    mandibleGroup.add(createRamus(-1));
    mandibleGroup.add(createRamus(1));
    
    mandibleGroup.position.y = -0.075;
    skullGroup.add(mandibleGroup);

    // Temporal bones (temples)
    const createTemporal = (side: number) => {
      const temporalGeometry = new THREE.SphereGeometry(0.025, 8, 8);
      const temporal = new THREE.Mesh(temporalGeometry, boneMaterial);
      temporal.scale.set(1.2, 0.8, 0.8);
      temporal.position.set(side * 0.08, 0.01, 0);
      return temporal;
    };
    skullGroup.add(createTemporal(-1));
    skullGroup.add(createTemporal(1));

    skullGroup.position.y = limbLengths.spine * scale + 0.15;
    skeletonGroupRef.current.add(skullGroup);

    // SPINE - Complete vertebral column
    const spineGroup = new THREE.Group();
    
    // Cervical vertebrae (7)
    for (let i = 0; i < 7; i++) {
      const vertebraHeight = 0.018;
      const vertebra = new THREE.Group();
      
      // Vertebral body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, vertebraHeight, 8),
        boneMaterial
      );
      vertebra.add(body);
      
      // Spinous process
      const process = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.008, 0.025),
        boneMaterial
      );
      process.position.z = -0.02;
      vertebra.add(process);
      
      vertebra.position.y = limbLengths.spine * scale - i * vertebraHeight * 1.1;
      spineGroup.add(vertebra);
    }

    // Thoracic vertebrae (12)
    for (let i = 0; i < 12; i++) {
      const vertebraHeight = 0.02;
      const vertebra = new THREE.Group();
      
      // Vertebral body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 + i * 0.0005, 0.018 + i * 0.0005, vertebraHeight, 8),
        boneMaterial
      );
      vertebra.add(body);
      
      // Spinous process
      const process = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.01, 0.03 + i * 0.001),
        boneMaterial
      );
      process.position.z = -0.025;
      process.rotation.x = 0.3;
      vertebra.add(process);
      
      // Transverse processes
      const createTransverse = (side: number) => {
        const transverse = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.008, 0.008),
          boneMaterial
        );
        transverse.position.x = side * 0.025;
        return transverse;
      };
      vertebra.add(createTransverse(-1));
      vertebra.add(createTransverse(1));
      
      vertebra.position.y = limbLengths.spine * scale * 0.65 - i * vertebraHeight * 1.1;
      spineGroup.add(vertebra);
    }

    // Lumbar vertebrae (5)
    for (let i = 0; i < 5; i++) {
      const vertebraHeight = 0.025;
      const vertebra = new THREE.Group();
      
      // Vertebral body (larger)
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, vertebraHeight, 8),
        boneMaterial
      );
      vertebra.add(body);
      
      // Spinous process
      const process = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.015, 0.025),
        boneMaterial
      );
      process.position.z = -0.03;
      vertebra.add(process);
      
      // Transverse processes
      const createTransverse = (side: number) => {
        const transverse = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.01, 0.01),
          boneMaterial
        );
        transverse.position.x = side * 0.03;
        return transverse;
      };
      vertebra.add(createTransverse(-1));
      vertebra.add(createTransverse(1));
      
      vertebra.position.y = limbLengths.spine * scale * 0.2 - i * vertebraHeight * 1.1;
      spineGroup.add(vertebra);
    }

    skeletonGroupRef.current.add(spineGroup);

    // RIBCAGE - Anatomically accurate ribs
    const ribcageGroup = new THREE.Group();
    
    // Sternum (breastbone)
    const sternumGroup = new THREE.Group();
    
    // Manubrium (top part)
    const manubrium = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.05, 0.015),
      boneMaterial
    );
    manubrium.position.y = limbLengths.spine * scale * 0.75;
    sternumGroup.add(manubrium);
    
    // Body of sternum
    const sternumBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.1, 0.012),
      boneMaterial
    );
    sternumBody.position.y = limbLengths.spine * scale * 0.65;
    sternumGroup.add(sternumBody);
    
    // Xiphoid process
    const xiphoid = new THREE.Mesh(
      new THREE.ConeGeometry(0.008, 0.02, 6),
      cartilaginousMaterial
    );
    xiphoid.position.y = limbLengths.spine * scale * 0.55;
    xiphoid.rotation.z = Math.PI;
    sternumGroup.add(xiphoid);
    
    sternumGroup.position.z = bodyProportions.shoulderWidth * scale * 0.35;
    ribcageGroup.add(sternumGroup);

    // Individual ribs (12 pairs)
    for (let i = 0; i < 12; i++) {
      const ribPair = new THREE.Group();
      const ribY = limbLengths.spine * scale * 0.75 - i * 0.025;
      const ribRadius = bodyProportions.shoulderWidth * scale * (0.4 - i * 0.015);
      const ribThickness = 0.006 + (i < 7 ? 0.002 : 0);
      
      // Create each rib
      const createRib = (side: number) => {
        const ribCurve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(0, 0, -0.02),
          new THREE.Vector3(side * ribRadius * 0.3, 0, -ribRadius * 0.3),
          new THREE.Vector3(side * ribRadius * 0.8, 0, -ribRadius * 0.2),
          new THREE.Vector3(side * ribRadius * 0.9, 0, ribRadius * 0.3)
        );
        
        const ribGeometry = new THREE.TubeGeometry(ribCurve, 20, ribThickness, 8, false);
        const rib = new THREE.Mesh(ribGeometry, boneMaterial);
        rib.castShadow = true;
        return rib;
      };
      
      const leftRib = createRib(-1);
      leftRib.position.y = ribY;
      ribPair.add(leftRib);
      
      const rightRib = createRib(1);
      rightRib.position.y = ribY;
      ribPair.add(rightRib);
      
      // Costal cartilage (for true ribs)
      if (i < 7) {
        const createCostalCartilage = (side: number) => {
          const cartilageGeometry = new THREE.CylinderGeometry(
            ribThickness * 0.8,
            ribThickness,
            ribRadius * 0.15,
            6
          );
          const cartilage = new THREE.Mesh(cartilageGeometry, cartilaginousMaterial);
          cartilage.position.set(
            side * ribRadius * 0.9,
            ribY,
            ribRadius * 0.32
          );
          cartilage.rotation.z = side * 0.5;
          return cartilage;
        };
        ribPair.add(createCostalCartilage(-1));
        ribPair.add(createCostalCartilage(1));
      }
      
      ribcageGroup.add(ribPair);
    }

    skeletonGroupRef.current.add(ribcageGroup);

    // SHOULDER GIRDLE
    const shoulderGroup = new THREE.Group();
    
    // Clavicles (collarbones)
    const createClavicle = (side: number) => {
      const clavicleCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * bodyProportions.shoulderWidth * scale * 0.2, 0, 0.02),
        new THREE.Vector3(side * bodyProportions.shoulderWidth * scale * 0.45, 0, -0.01)
      );
      const clavicleGeometry = new THREE.TubeGeometry(clavicleCurve, 12, 0.01, 8, false);
      const clavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
      clavicle.castShadow = true;
      return clavicle;
    };
    
    const leftClavicle = createClavicle(-1);
    leftClavicle.position.set(0, limbLengths.spine * scale, 0.025);
    shoulderGroup.add(leftClavicle);
    
    const rightClavicle = createClavicle(1);
    rightClavicle.position.set(0, limbLengths.spine * scale, 0.025);
    shoulderGroup.add(rightClavicle);

    // Scapulae (shoulder blades)
    const createScapula = (side: number) => {
      const scapulaGroup = new THREE.Group();
      
      // Main body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.09, 0.008),
        boneMaterial
      );
      body.rotation.z = side * 0.15;
      scapulaGroup.add(body);
      
      // Acromion process
      const acromion = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.015, 0.01),
        boneMaterial
      );
      acromion.position.set(side * 0.03, 0.045, 0.01);
      scapulaGroup.add(acromion);
      
      // Coracoid process
      const coracoid = new THREE.Mesh(
        new THREE.ConeGeometry(0.006, 0.02, 6),
        boneMaterial
      );
      coracoid.position.set(side * 0.02, 0.03, 0.02);
      coracoid.rotation.x = -0.5;
      scapulaGroup.add(coracoid);
      
      // Spine of scapula
      const spine = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.005, 0.01),
        boneMaterial
      );
      spine.position.set(0, 0.02, -0.005);
      spine.rotation.z = side * 0.1;
      scapulaGroup.add(spine);
      
      scapulaGroup.position.set(
        side * bodyProportions.shoulderWidth * scale * 0.45,
        limbLengths.spine * scale * 0.95,
        -0.05
      );
      
      return scapulaGroup;
    };
    
    shoulderGroup.add(createScapula(-1));
    shoulderGroup.add(createScapula(1));
    
    skeletonGroupRef.current.add(shoulderGroup);

    // PELVIS
    const pelvisGroup = new THREE.Group();
    
    // Sacrum
    const sacrumGeometry = new THREE.ConeGeometry(0.035, 0.08, 6);
    const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
    sacrum.position.set(0, -0.02, -0.04);
    sacrum.rotation.x = Math.PI * 0.15;
    pelvisGroup.add(sacrum);
    
    // Coccyx (tailbone)
    const coccyx = new THREE.Mesh(
      new THREE.ConeGeometry(0.01, 0.025, 4),
      boneMaterial
    );
    coccyx.position.set(0, -0.07, -0.05);
    coccyx.rotation.x = Math.PI * 0.2;
    pelvisGroup.add(coccyx);
    
    // Ilium (hip bones)
    const createIlium = (side: number) => {
      const iliumGroup = new THREE.Group();
      
      // Wing of ilium
      const wing = new THREE.Mesh(
        new THREE.SphereGeometry(bodyProportions.hipWidth * scale * 0.4, 12, 8),
        boneMaterial
      );
      wing.scale.set(0.7, 0.5, 0.35);
      wing.rotation.z = side * 0.2;
      iliumGroup.add(wing);
      
      // Iliac crest
      const crest = new THREE.Mesh(
        new THREE.TorusGeometry(bodyProportions.hipWidth * scale * 0.35, 0.008, 6, 12, Math.PI * 0.6),
        boneMaterial
      );
      crest.rotation.x = Math.PI / 2;
      crest.rotation.z = -Math.PI * 0.3;
      iliumGroup.add(crest);
      
      iliumGroup.position.set(side * bodyProportions.hipWidth * scale * 0.35, 0.02, 0);
      return iliumGroup;
    };
    
    pelvisGroup.add(createIlium(-1));
    pelvisGroup.add(createIlium(1));
    
    // Ischium (sit bones)
    const createIschium = (side: number) => {
      const ischiumGroup = new THREE.Group();
      
      // Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.04, 0.025),
        boneMaterial
      );
      body.position.y = -0.03;
      ischiumGroup.add(body);
      
      // Tuberosity
      const tuberosity = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 6),
        boneMaterial
      );
      tuberosity.position.y = -0.05;
      tuberosity.position.z = -0.01;
      ischiumGroup.add(tuberosity);
      
      ischiumGroup.position.set(side * bodyProportions.hipWidth * scale * 0.25, -0.02, -0.02);
      return ischiumGroup;
    };
    
    pelvisGroup.add(createIschium(-1));
    pelvisGroup.add(createIschium(1));
    
    // Pubis
    const pubisGroup = new THREE.Group();
    
    // Pubic bodies
    const createPubicBody = (side: number) => {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.025, 0.025),
        boneMaterial
      );
      body.position.x = side * 0.015;
      return body;
    };
    pubisGroup.add(createPubicBody(-1));
    pubisGroup.add(createPubicBody(1));
    
    // Pubic symphysis
    const symphysis = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.02, 0.02),
      cartilaginousMaterial
    );
    pubisGroup.add(symphysis);
    
    pubisGroup.position.set(0, -0.05, 0.04);
    pelvisGroup.add(pubisGroup);
    
    skeletonGroupRef.current.add(pelvisGroup);

    // ARMS
    const createArm = (side: number) => {
      const armGroup = new THREE.Group();
      
      // Humerus
      const humerusGroup = new THREE.Group();
      
      // Humeral head
      const humeralHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 8),
        boneMaterial
      );
      humeralHead.castShadow = true;
      humerusGroup.add(humeralHead);
      
      // Humerus shaft
      const humerusShaft = createBone(limbLengths.upperArm * scale, 0.018, 0.022);
      humerusShaft.position.y = -limbLengths.upperArm * scale / 2;
      humerusGroup.add(humerusShaft);
      
      // Medial and lateral epicondyles
      const epicondyles = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.015, 0.02),
        boneMaterial
      );
      epicondyles.position.y = -limbLengths.upperArm * scale;
      humerusGroup.add(epicondyles);
      
      humerusGroup.rotation.z = toRad(side * jointAngles.shoulderAbduction);
      humerusGroup.rotation.x = toRad(jointAngles.shoulderFlexion);
      armGroup.add(humerusGroup);
      
      // Forearm
      const forearmGroup = new THREE.Group();
      
      // Radius
      const radius = createBone(limbLengths.forearm * scale, 0.01, 0.012);
      radius.position.set(-side * 0.008, -limbLengths.forearm * scale / 2, 0);
      forearmGroup.add(radius);
      
      // Ulna
      const ulna = createBone(limbLengths.forearm * scale, 0.012, 0.01);
      ulna.position.set(side * 0.008, -limbLengths.forearm * scale / 2, 0);
      forearmGroup.add(ulna);
      
      // Olecranon process (elbow point)
      const olecranon = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.02, 0.015),
        boneMaterial
      );
      olecranon.position.set(side * 0.008, 0, -0.01);
      forearmGroup.add(olecranon);
      
      forearmGroup.position.y = -limbLengths.upperArm * scale;
      forearmGroup.rotation.x = toRad(-jointAngles.elbowFlexion);
      humerusGroup.add(forearmGroup);
      
      // Hand
      const handGroup = new THREE.Group();
      
      // Carpal bones (wrist) - simplified
      const carpals = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.015, 0.025),
        boneMaterial
      );
      handGroup.add(carpals);
      
      // Metacarpals (palm bones)
      for (let i = 0; i < 5; i++) {
        const metacarpal = createBone(0.04, 0.004, 0.003);
        metacarpal.position.set(
          -0.015 + i * 0.0075,
          -0.025,
          0
        );
        metacarpal.rotation.z = (i - 2) * 0.05;
        handGroup.add(metacarpal);
        
        // Phalanges (finger bones)
        const phalangesGroup = new THREE.Group();
        
        // Proximal phalanx
        const proximal = createBone(i === 0 ? 0.015 : 0.02, 0.003, 0.0025);
        proximal.position.y = -0.01;
        phalangesGroup.add(proximal);
        
        // Middle phalanx (except thumb)
        if (i !== 0) {
          const middle = createBone(0.015, 0.0025, 0.002);
          middle.position.y = -0.025;
          phalangesGroup.add(middle);
        }
        
        // Distal phalanx
        const distal = createBone(i === 0 ? 0.01 : 0.012, 0.002, 0.0015);
        distal.position.y = i === 0 ? -0.022 : -0.037;
        phalangesGroup.add(distal);
        
        phalangesGroup.position.set(
          -0.015 + i * 0.0075,
          -0.045,
          0
        );
        handGroup.add(phalangesGroup);
      }
      
      handGroup.position.y = -limbLengths.forearm * scale - 0.02;
      forearmGroup.add(handGroup);
      
      armGroup.position.set(
        side * bodyProportions.shoulderWidth * scale / 2,
        limbLengths.spine * scale,
        0
      );
      
      return armGroup;
    };
    
    skeletonGroupRef.current.add(createArm(-1));
    skeletonGroupRef.current.add(createArm(1));

    // LEGS
    const createLeg = (side: number) => {
      const legGroup = new THREE.Group();
      
      // Femur
      const femurGroup = new THREE.Group();
      
      // Femoral head
      const femoralHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 8),
        boneMaterial
      );
      femoralHead.castShadow = true;
      femurGroup.add(femoralHead);
      
      // Greater trochanter
      const greaterTrochanter = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.03, 0.02),
        boneMaterial
      );
      greaterTrochanter.position.set(side * 0.025, -0.015, 0);
      femurGroup.add(greaterTrochanter);
      
      // Femur shaft
      const femurShaft = createBone(limbLengths.thigh * scale, 0.022, 0.028);
      femurShaft.position.y = -limbLengths.thigh * scale / 2;
      femurGroup.add(femurShaft);
      
      // Femoral condyles
      const condylesGroup = new THREE.Group();
      
      const medialCondyle = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 10, 8),
        boneMaterial
      );
      medialCondyle.position.x = side * 0.015;
      medialCondyle.scale.set(0.8, 1, 1.2);
      condylesGroup.add(medialCondyle);
      
      const lateralCondyle = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 10, 8),
        boneMaterial
      );
      lateralCondyle.position.x = -side * 0.015;
      lateralCondyle.scale.set(0.8, 1, 1.2);
      condylesGroup.add(lateralCondyle);
      
      condylesGroup.position.y = -limbLengths.thigh * scale;
      femurGroup.add(condylesGroup);
      
      femurGroup.rotation.x = toRad(jointAngles.hipFlexion);
      legGroup.add(femurGroup);
      
      // Patella (kneecap)
      const patella = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 6),
        boneMaterial
      );
      patella.scale.set(1, 1, 0.6);
      patella.position.set(0, -limbLengths.thigh * scale, 0.025);
      femurGroup.add(patella);
      
      // Lower leg
      const lowerLegGroup = new THREE.Group();
      
      // Tibia
      const tibia = createBone(limbLengths.shin * scale, 0.02, 0.018);
      tibia.position.set(side * 0.005, -limbLengths.shin * scale / 2, 0);
      lowerLegGroup.add(tibia);
      
      // Tibial tuberosity
      const tuberosity = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.02, 0.01),
        boneMaterial
      );
      tuberosity.position.set(side * 0.005, -0.03, 0.015);
      lowerLegGroup.add(tuberosity);
      
      // Fibula
      const fibula = createBone(limbLengths.shin * scale, 0.008, 0.007);
      fibula.position.set(-side * 0.012, -limbLengths.shin * scale / 2, 0);
      lowerLegGroup.add(fibula);
      
      // Medial and lateral malleoli (ankle bones)
      const medialMalleolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 6),
        boneMaterial
      );
      medialMalleolus.position.set(side * 0.01, -limbLengths.shin * scale, 0);
      lowerLegGroup.add(medialMalleolus);
      
      const lateralMalleolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 6),
        boneMaterial
      );
      lateralMalleolus.position.set(-side * 0.015, -limbLengths.shin * scale + 0.01, 0);
      lowerLegGroup.add(lateralMalleolus);
      
      lowerLegGroup.position.y = -limbLengths.thigh * scale;
      lowerLegGroup.rotation.x = toRad(-jointAngles.kneeFlexion);
      femurGroup.add(lowerLegGroup);
      
      // Foot
      const footGroup = new THREE.Group();
      
      // Talus (ankle bone)
      const talus = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.02, 0.025),
        boneMaterial
      );
      footGroup.add(talus);
      
      // Calcaneus (heel bone)
      const calcaneus = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.025, 0.04),
        boneMaterial
      );
      calcaneus.position.set(0, -0.015, -0.02);
      footGroup.add(calcaneus);
      
      // Navicular
      const navicular = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.015, 0.015),
        boneMaterial
      );
      navicular.position.set(side * 0.01, -0.005, 0.02);
      footGroup.add(navicular);
      
      // Cuboid
      const cuboid = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.015, 0.02),
        boneMaterial
      );
      cuboid.position.set(-side * 0.01, -0.01, 0.015);
      footGroup.add(cuboid);
      
      // Cuneiforms (3 bones, simplified)
      for (let i = 0; i < 3; i++) {
        const cuneiform = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.012, 0.015),
          boneMaterial
        );
        cuneiform.position.set(
          side * 0.005 - i * 0.008,
          -0.008,
          0.035
        );
        footGroup.add(cuneiform);
      }
      
      // Metatarsals (foot bones)
      for (let i = 0; i < 5; i++) {
        const metatarsal = createBone(0.05, 0.005, 0.004);
        metatarsal.position.set(
          -side * 0.02 + i * 0.01,
          -0.01,
          0.06
        );
        metatarsal.rotation.x = Math.PI / 2;
        metatarsal.rotation.y = (i - 2) * 0.1;
        footGroup.add(metatarsal);
        
        // Toe phalanges
        const toeGroup = new THREE.Group();
        
        // Proximal phalanx
        const proximal = createBone(i === 0 ? 0.018 : 0.015, 0.004, 0.003);
        proximal.position.z = 0.008;
        toeGroup.add(proximal);
        
        // Middle phalanx (except big toe)
        if (i !== 0) {
          const middle = createBone(0.01, 0.003, 0.0025);
          middle.position.z = 0.018;
          toeGroup.add(middle);
        }
        
        // Distal phalanx
        const distal = createBone(0.008, 0.0025, 0.002);
        distal.position.z = i === 0 ? 0.02 : 0.025;
        toeGroup.add(distal);
        
        toeGroup.position.set(
          -side * 0.02 + i * 0.01,
          -0.01,
          0.085
        );
        toeGroup.rotation.x = Math.PI / 2;
        footGroup.add(toeGroup);
      }
      
      footGroup.position.y = -limbLengths.shin * scale - 0.02;
      footGroup.position.z = 0.03;
      footGroup.rotation.x = -Math.PI / 2;
      lowerLegGroup.add(footGroup);
      
      legGroup.position.set(
        side * bodyProportions.hipWidth * scale / 2,
        0,
        0
      );
      
      return legGroup;
    };
    
    skeletonGroupRef.current.add(createLeg(-1));
    skeletonGroupRef.current.add(createLeg(1));

  }, [config]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full bg-black rounded-lg" />
    </div>
  );
}