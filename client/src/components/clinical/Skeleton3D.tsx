import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Download, Upload } from "lucide-react";
import AnatomicalSkeleton3D from "./AnatomicalSkeleton3D";
import BioDigitalEmbedViewer from "./BioDigitalEmbedViewer";

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

const defaultConfig: SkeletonConfig = {
  limbLengths: {
    upperArm: 30,
    forearm: 28,
    thigh: 42,
    shin: 40,
    spine: 50,
  },
  jointAngles: {
    shoulderFlexion: 0,
    shoulderAbduction: 0,
    elbowFlexion: 0,
    hipFlexion: 0,
    kneeFlexion: 0,
  },
  bodyProportions: {
    shoulderWidth: 40,
    hipWidth: 30,
  },
};

// Use BioDigital if available, fallback to anatomical skeleton
function ThreeJSSkeleton({ config }: { config: SkeletonConfig }) {
  const [useBioDigital, setUseBioDigital] = useState(true);
  const [bioDigitalError, setBioDigitalError] = useState(false);

  // Try BioDigital first, fallback to procedural if it fails
  if (useBioDigital && !bioDigitalError) {
    return (
      <div className="relative w-full h-full">
        <BioDigitalEmbedViewer config={config} />
        {/* Fallback button if user prefers procedural */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setUseBioDigital(false)}
          className="absolute bottom-4 left-4 text-xs opacity-50 hover:opacity-100"
        >
          Use Procedural Model
        </Button>
      </div>
    );
  }

  // Fallback to anatomical skeleton
  return (
    <div className="relative w-full h-full">
      <AnatomicalSkeleton3D config={config} />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setUseBioDigital(true);
          setBioDigitalError(false);
        }}
        className="absolute bottom-4 left-4 text-xs opacity-50 hover:opacity-100"
      >
        Try BioDigital
      </Button>
    </div>
  );
}

// Original implementation kept for reference
function ThreeJSSkeletonOld({ config }: { config: SkeletonConfig }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 0, 0);

    // Renderer setup with enhanced settings
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
    renderer.toneMappingExposure = 1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup for anatomical visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffd4a3, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
    backLight.position.set(0, 5, -10);
    scene.add(backLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonGroupRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // Remove ground plane and grid for clean anatomical view

    // OrbitControls for better interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Try to load GLTF model
    const loader = new GLTFLoader();
    loader.load(
      '/models/skeleton.glb',
      (gltf: any) => {
        // Model loaded successfully
        modelRef.current = gltf.scene;
        gltf.scene.scale.set(1, 1, 1);
        gltf.scene.position.y = -1;
        gltf.scene.traverse((child: any) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        skeletonGroup.add(gltf.scene);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(gltf.scene);
        }
        
        setModelLoaded(true);
        setLoadError(null);
      },
      (progress: any) => {
        // Progress callback
        console.log('Loading model...', (progress.loaded / progress.total) * 100 + '%');
      },
      (error: any) => {
        console.warn('Failed to load 3D model, using procedural skeleton:', error);
        setLoadError('Using procedural skeleton');
        // Create procedural skeleton as fallback
        createProceduralSkeleton(skeletonGroup, config);
      }
    );

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      
      // Update controls
      if (controls) {
        controls.update();
      }
      
      // Update animations
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Auto-rotate if no model is loaded
      if (!modelLoaded && skeletonGroup) {
        skeletonGroup.rotation.y += 0.005;
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
      
      // Dispose of model
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(material => material.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
      }
      
      renderer.dispose();
    };
  }, []);

  // Update skeleton based on config (for procedural skeleton)
  useEffect(() => {
    if (!skeletonGroupRef.current || modelLoaded) return;

    // Clear existing procedural skeleton
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

    // Recreate procedural skeleton with new config
    createProceduralSkeleton(skeletonGroupRef.current, config);
  }, [config, modelLoaded]);

  // Function to create procedural skeleton
  const createProceduralSkeleton = (group: THREE.Group, config: SkeletonConfig) => {
    const scale = 0.01;
    const { limbLengths, jointAngles, bodyProportions } = config;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // Anatomical bone materials
    const boneMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd4c5b9,  // Bone color
      roughness: 0.85,
      metalness: 0.1
    });
    const jointMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xc8b8a8,  // Slightly darker bone color for joints
      roughness: 0.8,
      metalness: 0.15
    });
    const ribMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xddd0c0,  // Lighter bone for ribs
      roughness: 0.9,
      metalness: 0.05
    });

    // Helper function to create bone with joints
    const createBone = (length: number, radius: number = 0.025) => {
      const bone = new THREE.Group();
      
      // Bone shaft
      const shaftGeometry = new THREE.CylinderGeometry(radius * 0.8, radius, length * scale, 8);
      const shaft = new THREE.Mesh(shaftGeometry, boneMaterial);
      shaft.position.y = length * scale / 2;
      shaft.castShadow = true;
      bone.add(shaft);
      
      // Joint balls at ends
      const jointGeometry = new THREE.SphereGeometry(radius * 1.2, 8, 8);
      const topJoint = new THREE.Mesh(jointGeometry, jointMaterial);
      topJoint.position.y = length * scale;
      topJoint.castShadow = true;
      bone.add(topJoint);
      
      const bottomJoint = new THREE.Mesh(jointGeometry, jointMaterial);
      bottomJoint.castShadow = true;
      bone.add(bottomJoint);
      
      return bone;
    };

    // Anatomical spine with vertebrae
    const spineGroup = new THREE.Group();
    const vertebraeCount = 24; // More realistic vertebrae count
    for (let i = 0; i < vertebraeCount; i++) {
      const vertebraHeight = limbLengths.spine * scale / vertebraeCount;
      const vertebraRadius = 0.02 - (i * 0.0003); // Slightly taper
      
      // Vertebral body
      const vertebraGeometry = new THREE.CylinderGeometry(
        vertebraRadius * 1.2, 
        vertebraRadius * 1.2, 
        vertebraHeight * 0.7, 
        8
      );
      const vertebra = new THREE.Mesh(vertebraGeometry, boneMaterial);
      vertebra.position.y = vertebraHeight * i;
      vertebra.castShadow = true;
      spineGroup.add(vertebra);
      
      // Spinous process (back spike of vertebra)
      const processGeometry = new THREE.ConeGeometry(vertebraRadius * 0.3, vertebraHeight * 0.5, 4);
      const process = new THREE.Mesh(processGeometry, boneMaterial);
      process.position.y = vertebraHeight * i;
      process.position.z = -vertebraRadius * 1.5;
      process.rotation.x = -Math.PI / 2;
      process.castShadow = true;
      spineGroup.add(process);
      
      // Intervertebral disc (simplified)
      if (i < vertebraeCount - 1) {
        const discGeometry = new THREE.CylinderGeometry(
          vertebraRadius * 0.9,
          vertebraRadius * 0.9,
          vertebraHeight * 0.2,
          8
        );
        const disc = new THREE.Mesh(discGeometry, new THREE.MeshStandardMaterial({ 
          color: 0x8b7d6b,
          roughness: 0.9,
          metalness: 0
        }));
        disc.position.y = vertebraHeight * (i + 0.5);
        disc.castShadow = true;
        spineGroup.add(disc);
      }
    }
    group.add(spineGroup);

    // Anatomical ribcage with individual ribs
    const ribcageGroup = new THREE.Group();
    const numRibs = 12;
    for (let i = 0; i < numRibs; i++) {
      const ribAngle = (i / numRibs) * 0.8 - 0.4;
      const ribRadius = bodyProportions.shoulderWidth * scale * 0.35 * (1 - i * 0.02);
      const ribThickness = 0.008;
      
      // Left rib
      const leftRibGeometry = new THREE.TorusGeometry(ribRadius, ribThickness, 4, 12, Math.PI * 0.6);
      const leftRib = new THREE.Mesh(leftRibGeometry, ribMaterial);
      leftRib.position.y = limbLengths.spine * scale * 0.8 - (i * limbLengths.spine * scale * 0.04);
      leftRib.rotation.x = Math.PI / 2 + ribAngle;
      leftRib.rotation.y = -Math.PI * 0.2;
      leftRib.castShadow = true;
      ribcageGroup.add(leftRib);
      
      // Right rib
      const rightRibGeometry = new THREE.TorusGeometry(ribRadius, ribThickness, 4, 12, Math.PI * 0.6);
      const rightRib = new THREE.Mesh(rightRibGeometry, ribMaterial);
      rightRib.position.y = limbLengths.spine * scale * 0.8 - (i * limbLengths.spine * scale * 0.04);
      rightRib.rotation.x = Math.PI / 2 + ribAngle;
      rightRib.rotation.y = Math.PI * 1.2;
      rightRib.castShadow = true;
      ribcageGroup.add(rightRib);
    }
    
    // Sternum
    const sternumGeometry = new THREE.BoxGeometry(0.02, limbLengths.spine * scale * 0.4, 0.03);
    const sternum = new THREE.Mesh(sternumGeometry, boneMaterial);
    sternum.position.y = limbLengths.spine * scale * 0.6;
    sternum.position.z = bodyProportions.shoulderWidth * scale * 0.25;
    sternum.castShadow = true;
    ribcageGroup.add(sternum);
    
    group.add(ribcageGroup);

    // Anatomical skull
    const skullGroup = new THREE.Group();
    
    // Cranium
    const craniumGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
    cranium.scale.set(0.9, 1.1, 0.95);
    cranium.castShadow = true;
    skullGroup.add(cranium);
    
    // Eye sockets
    const eyeSocketGeometry = new THREE.SphereGeometry(0.025, 8, 8);
    const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));
    leftEyeSocket.position.set(-0.03, 0.02, 0.08);
    skullGroup.add(leftEyeSocket);
    
    const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));
    rightEyeSocket.position.set(0.03, 0.02, 0.08);
    skullGroup.add(rightEyeSocket);
    
    // Nasal cavity
    const nasalGeometry = new THREE.ConeGeometry(0.015, 0.03, 3);
    const nasal = new THREE.Mesh(nasalGeometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));
    nasal.position.set(0, -0.01, 0.09);
    nasal.rotation.x = Math.PI;
    skullGroup.add(nasal);
    
    // Jaw/Mandible
    const jawGeometry = new THREE.BoxGeometry(0.08, 0.04, 0.07);
    const jaw = new THREE.Mesh(jawGeometry, boneMaterial);
    jaw.position.y = -0.07;
    jaw.position.z = 0.01;
    jaw.castShadow = true;
    skullGroup.add(jaw);
    
    // Teeth (simplified)
    const teethGeometry = new THREE.BoxGeometry(0.06, 0.008, 0.01);
    const upperTeeth = new THREE.Mesh(teethGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    upperTeeth.position.set(0, -0.04, 0.04);
    skullGroup.add(upperTeeth);
    
    const lowerTeeth = new THREE.Mesh(teethGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    lowerTeeth.position.set(0, -0.08, 0.04);
    skullGroup.add(lowerTeeth);
    
    skullGroup.position.y = limbLengths.spine * scale + 0.15;
    group.add(skullGroup);

    // Anatomical shoulders with clavicles and scapulae
    const shoulderGroup = new THREE.Group();
    
    // Clavicles (collar bones)
    const clavicleLength = bodyProportions.shoulderWidth * scale * 0.45;
    const clavicleCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(clavicleLength * 0.4, 0, clavicleLength * 0.2),
      new THREE.Vector3(clavicleLength, 0, 0)
    );
    const clavicleGeometry = new THREE.TubeGeometry(clavicleCurve, 8, 0.01, 6);
    
    const leftClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    leftClavicle.position.set(-clavicleLength * 0.1, limbLengths.spine * scale, 0.02);
    leftClavicle.rotation.y = Math.PI;
    leftClavicle.castShadow = true;
    shoulderGroup.add(leftClavicle);
    
    const rightClavicle = new THREE.Mesh(clavicleGeometry, boneMaterial);
    rightClavicle.position.set(clavicleLength * 0.1, limbLengths.spine * scale, 0.02);
    rightClavicle.castShadow = true;
    shoulderGroup.add(rightClavicle);
    
    // Scapulae (shoulder blades)
    const scapulaGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.01);
    
    const leftScapula = new THREE.Mesh(scapulaGeometry, boneMaterial);
    leftScapula.position.set(
      -bodyProportions.shoulderWidth * scale * 0.4,
      limbLengths.spine * scale * 0.9,
      -0.04
    );
    leftScapula.rotation.set(0, -0.3, -0.2);
    leftScapula.castShadow = true;
    shoulderGroup.add(leftScapula);
    
    const rightScapula = new THREE.Mesh(scapulaGeometry, boneMaterial);
    rightScapula.position.set(
      bodyProportions.shoulderWidth * scale * 0.4,
      limbLengths.spine * scale * 0.9,
      -0.04
    );
    rightScapula.rotation.set(0, 0.3, 0.2);
    rightScapula.castShadow = true;
    shoulderGroup.add(rightScapula);
    
    group.add(shoulderGroup);

    // Anatomical pelvis
    const pelvisGroup = new THREE.Group();
    
    // Ilium (hip bones)
    const iliumGeometry = new THREE.SphereGeometry(bodyProportions.hipWidth * scale * 0.35, 8, 6);
    const leftIlium = new THREE.Mesh(iliumGeometry, boneMaterial);
    leftIlium.scale.set(0.6, 0.4, 0.3);
    leftIlium.position.set(-bodyProportions.hipWidth * scale * 0.3, 0, 0);
    leftIlium.rotation.z = -0.2;
    leftIlium.castShadow = true;
    pelvisGroup.add(leftIlium);
    
    const rightIlium = new THREE.Mesh(iliumGeometry, boneMaterial);
    rightIlium.scale.set(0.6, 0.4, 0.3);
    rightIlium.position.set(bodyProportions.hipWidth * scale * 0.3, 0, 0);
    rightIlium.rotation.z = 0.2;
    rightIlium.castShadow = true;
    pelvisGroup.add(rightIlium);
    
    // Sacrum
    const sacrumGeometry = new THREE.ConeGeometry(0.04, 0.08, 6);
    const sacrum = new THREE.Mesh(sacrumGeometry, boneMaterial);
    sacrum.position.set(0, -0.02, -0.03);
    sacrum.rotation.x = Math.PI * 0.1;
    sacrum.castShadow = true;
    pelvisGroup.add(sacrum);
    
    // Pubic symphysis
    const pubicGeometry = new THREE.BoxGeometry(bodyProportions.hipWidth * scale * 0.15, 0.02, 0.03);
    const pubic = new THREE.Mesh(pubicGeometry, boneMaterial);
    pubic.position.set(0, -0.05, 0.03);
    pubic.castShadow = true;
    pelvisGroup.add(pubic);
    
    group.add(pelvisGroup);

    // Arms
    const createArm = (side: number) => {
      const armGroup = new THREE.Group();
      
      // Humerus (upper arm)
      const humerusGroup = new THREE.Group();
      
      // Humeral head (ball joint)
      const humeralHeadGeometry = new THREE.SphereGeometry(0.025, 8, 8);
      const humeralHead = new THREE.Mesh(humeralHeadGeometry, jointMaterial);
      humeralHead.castShadow = true;
      humerusGroup.add(humeralHead);
      
      // Humerus shaft
      const humerusGeometry = new THREE.CylinderGeometry(0.015, 0.02, limbLengths.upperArm * scale, 8);
      const humerus = new THREE.Mesh(humerusGeometry, boneMaterial);
      humerus.position.y = -limbLengths.upperArm * scale / 2;
      humerus.castShadow = true;
      humerusGroup.add(humerus);
      
      // Elbow joint
      const elbowGeometry = new THREE.SphereGeometry(0.02, 8, 8);
      const elbow = new THREE.Mesh(elbowGeometry, jointMaterial);
      elbow.position.y = -limbLengths.upperArm * scale;
      elbow.scale.set(1.2, 0.8, 1);
      elbow.castShadow = true;
      humerusGroup.add(elbow);
      
      humerusGroup.rotation.z = toRad(side * jointAngles.shoulderAbduction);
      humerusGroup.rotation.x = toRad(jointAngles.shoulderFlexion);
      armGroup.add(humerusGroup);
      
      // Radius and Ulna (forearm bones)
      const forearmGroup = new THREE.Group();
      
      // Ulna (larger forearm bone)
      const ulnaGeometry = new THREE.CylinderGeometry(0.01, 0.012, limbLengths.forearm * scale, 6);
      const ulna = new THREE.Mesh(ulnaGeometry, boneMaterial);
      ulna.position.set(side * 0.008, -limbLengths.forearm * scale / 2, 0);
      ulna.castShadow = true;
      forearmGroup.add(ulna);
      
      // Radius (smaller forearm bone)
      const radiusGeometry = new THREE.CylinderGeometry(0.008, 0.01, limbLengths.forearm * scale, 6);
      const radius = new THREE.Mesh(radiusGeometry, boneMaterial);
      radius.position.set(-side * 0.008, -limbLengths.forearm * scale / 2, 0);
      radius.castShadow = true;
      forearmGroup.add(radius);
      
      // Wrist joint
      const wristGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.02);
      const wrist = new THREE.Mesh(wristGeometry, jointMaterial);
      wrist.position.y = -limbLengths.forearm * scale;
      wrist.castShadow = true;
      forearmGroup.add(wrist);
      
      forearmGroup.position.y = -limbLengths.upperArm * scale;
      forearmGroup.rotation.x = toRad(-jointAngles.elbowFlexion);
      humerusGroup.add(forearmGroup);
      
      // Anatomical hand with fingers
      const handGroup = new THREE.Group();
      
      // Palm
      const palmGeometry = new THREE.BoxGeometry(0.04, 0.05, 0.012);
      const palm = new THREE.Mesh(palmGeometry, boneMaterial);
      palm.castShadow = true;
      handGroup.add(palm);
      
      // Fingers (simplified)
      for (let f = 0; f < 5; f++) {
        const fingerLength = f === 0 ? 0.025 : 0.035; // Thumb is shorter
        const fingerX = f === 0 ? -0.025 : -0.015 + (f - 1) * 0.01;
        
        const fingerGeometry = new THREE.CylinderGeometry(0.003, 0.003, fingerLength);
        const finger = new THREE.Mesh(fingerGeometry, boneMaterial);
        finger.position.set(fingerX, -0.025 - fingerLength/2, 0);
        finger.castShadow = true;
        handGroup.add(finger);
      }
      
      handGroup.position.y = -limbLengths.forearm * scale - 0.04;
      forearmGroup.add(handGroup);
      
      armGroup.position.set(
        side * bodyProportions.shoulderWidth * scale / 2,
        limbLengths.spine * scale,
        0
      );
      
      return armGroup;
    };

    group.add(createArm(-1)); // Left arm
    group.add(createArm(1));  // Right arm

    // Legs
    const createLeg = (side: number) => {
      const legGroup = new THREE.Group();
      
      // Femur (thigh bone)
      const femurGroup = new THREE.Group();
      
      // Femoral head (ball joint)
      const femoralHeadGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const femoralHead = new THREE.Mesh(femoralHeadGeometry, jointMaterial);
      femoralHead.castShadow = true;
      femurGroup.add(femoralHead);
      
      // Femur shaft (with slight curve)
      const femurGeometry = new THREE.CylinderGeometry(0.02, 0.025, limbLengths.thigh * scale, 8);
      const femur = new THREE.Mesh(femurGeometry, boneMaterial);
      femur.position.y = -limbLengths.thigh * scale / 2;
      femur.castShadow = true;
      femurGroup.add(femur);
      
      // Knee joint (patella and condyles)
      const kneeGroup = new THREE.Group();
      
      // Knee condyles
      const condyleGeometry = new THREE.SphereGeometry(0.025, 8, 8);
      const medialCondyle = new THREE.Mesh(condyleGeometry, jointMaterial);
      medialCondyle.position.set(side * 0.015, 0, 0);
      medialCondyle.scale.set(0.8, 1, 1.2);
      medialCondyle.castShadow = true;
      kneeGroup.add(medialCondyle);
      
      const lateralCondyle = new THREE.Mesh(condyleGeometry, jointMaterial);
      lateralCondyle.position.set(-side * 0.015, 0, 0);
      lateralCondyle.scale.set(0.8, 1, 1.2);
      lateralCondyle.castShadow = true;
      kneeGroup.add(lateralCondyle);
      
      // Patella (kneecap)
      const patellaGeometry = new THREE.SphereGeometry(0.018, 6, 6);
      const patella = new THREE.Mesh(patellaGeometry, boneMaterial);
      patella.position.set(0, 0, 0.025);
      patella.scale.set(1, 1, 0.6);
      patella.castShadow = true;
      kneeGroup.add(patella);
      
      kneeGroup.position.y = -limbLengths.thigh * scale;
      femurGroup.add(kneeGroup);
      
      femurGroup.rotation.x = toRad(jointAngles.hipFlexion);
      legGroup.add(femurGroup);
      
      // Tibia and Fibula (shin bones)
      const shinGroup = new THREE.Group();
      
      // Tibia (larger shin bone)
      const tibiaGeometry = new THREE.CylinderGeometry(0.018, 0.02, limbLengths.shin * scale, 8);
      const tibia = new THREE.Mesh(tibiaGeometry, boneMaterial);
      tibia.position.set(side * 0.005, -limbLengths.shin * scale / 2, 0);
      tibia.castShadow = true;
      shinGroup.add(tibia);
      
      // Fibula (smaller shin bone)
      const fibulaGeometry = new THREE.CylinderGeometry(0.008, 0.008, limbLengths.shin * scale, 6);
      const fibula = new THREE.Mesh(fibulaGeometry, boneMaterial);
      fibula.position.set(-side * 0.012, -limbLengths.shin * scale / 2, 0);
      fibula.castShadow = true;
      shinGroup.add(fibula);
      
      // Ankle joint
      const ankleGeometry = new THREE.BoxGeometry(0.035, 0.015, 0.025);
      const ankle = new THREE.Mesh(ankleGeometry, jointMaterial);
      ankle.position.y = -limbLengths.shin * scale;
      ankle.castShadow = true;
      shinGroup.add(ankle);
      
      shinGroup.position.y = -limbLengths.thigh * scale;
      shinGroup.rotation.x = toRad(-jointAngles.kneeFlexion);
      femurGroup.add(shinGroup);
      
      // Anatomical foot
      const footGroup = new THREE.Group();
      
      // Heel (calcaneus)
      const heelGeometry = new THREE.BoxGeometry(0.03, 0.025, 0.04);
      const heel = new THREE.Mesh(heelGeometry, boneMaterial);
      heel.position.set(0, 0, -0.02);
      heel.castShadow = true;
      footGroup.add(heel);
      
      // Midfoot
      const midfootGeometry = new THREE.BoxGeometry(0.045, 0.02, 0.06);
      const midfoot = new THREE.Mesh(midfootGeometry, boneMaterial);
      midfoot.position.set(0, -0.005, 0.02);
      midfoot.castShadow = true;
      footGroup.add(midfoot);
      
      // Toes (simplified)
      for (let t = 0; t < 5; t++) {
        const toeLength = t === 0 ? 0.02 : 0.015;
        const toeX = -0.02 + t * 0.01;
        
        const toeGeometry = new THREE.CylinderGeometry(0.003, 0.003, toeLength);
        const toe = new THREE.Mesh(toeGeometry, boneMaterial);
        toe.position.set(toeX, -0.01, 0.05 + toeLength/2);
        toe.rotation.x = Math.PI / 2;
        toe.castShadow = true;
        footGroup.add(toe);
      }
      
      footGroup.position.y = -limbLengths.shin * scale - 0.01;
      footGroup.position.z = 0.02;
      shinGroup.add(footGroup);
      
      legGroup.position.set(
        side * bodyProportions.hipWidth * scale / 2,
        0,
        0
      );
      
      return legGroup;
    };

    group.add(createLeg(-1)); // Left leg
    group.add(createLeg(1));  // Right leg
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full bg-black rounded-lg" />
      {loadError && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-yellow-900/50 text-yellow-300">
            {loadError}
          </Badge>
        </div>
      )}
      {modelLoaded && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-green-900/50 text-green-300">
            3D Model Loaded
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function Skeleton3D({ 
  onPatientDataChange 
}: { 
  onPatientDataChange?: (config: SkeletonConfig) => void 
}) {
  const [config, setConfig] = useState<SkeletonConfig>(defaultConfig);
  const [selectedTab, setSelectedTab] = useState("limbs");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateLimbLength = (limb: keyof typeof config.limbLengths, value: number) => {
    const newConfig = {
      ...config,
      limbLengths: {
        ...config.limbLengths,
        [limb]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const updateJointAngle = (joint: keyof typeof config.jointAngles, value: number) => {
    const newConfig = {
      ...config,
      jointAngles: {
        ...config.jointAngles,
        [joint]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const updateBodyProportion = (prop: keyof typeof config.bodyProportions, value: number) => {
    const newConfig = {
      ...config,
      bodyProportions: {
        ...config.bodyProportions,
        [prop]: value,
      },
    };
    setConfig(newConfig);
    onPatientDataChange?.(newConfig);
  };
  
  const resetToDefault = () => {
    setConfig(defaultConfig);
    onPatientDataChange?.(defaultConfig);
  };
  
  const saveConfiguration = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `patient-skeleton-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedConfig = JSON.parse(e.target?.result as string);
        setConfig(loadedConfig);
        onPatientDataChange?.(loadedConfig);
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[700px]">
      {/* 3D Viewport */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <div className="h-full relative">
              <ThreeJSSkeleton config={config} />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={saveConfiguration}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Load
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={loadConfiguration}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div className="absolute bottom-4 left-4 text-xs text-gray-400">
                Click and drag to rotate • Scroll to zoom
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls Panel */}
      <div className="lg:col-span-1">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Patient Configuration</h3>
            
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="limbs">Limbs</TabsTrigger>
                <TabsTrigger value="joints">Joints</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
              </TabsList>
              
              {/* Limb Length Controls */}
              <TabsContent value="limbs" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Upper Body (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Upper Arm: {config.limbLengths.upperArm}cm</Label>
                    <Slider
                      value={[config.limbLengths.upperArm]}
                      onValueChange={([v]) => updateLimbLength("upperArm", v)}
                      min={20}
                      max={40}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Forearm: {config.limbLengths.forearm}cm</Label>
                    <Slider
                      value={[config.limbLengths.forearm]}
                      onValueChange={([v]) => updateLimbLength("forearm", v)}
                      min={20}
                      max={35}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Lower Body (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Thigh: {config.limbLengths.thigh}cm</Label>
                    <Slider
                      value={[config.limbLengths.thigh]}
                      onValueChange={([v]) => updateLimbLength("thigh", v)}
                      min={35}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Shin: {config.limbLengths.shin}cm</Label>
                    <Slider
                      value={[config.limbLengths.shin]}
                      onValueChange={([v]) => updateLimbLength("shin", v)}
                      min={35}
                      max={45}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Core (cm)</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spine: {config.limbLengths.spine}cm</Label>
                    <Slider
                      value={[config.limbLengths.spine]}
                      onValueChange={([v]) => updateLimbLength("spine", v)}
                      min={40}
                      max={60}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Joint Angle Controls */}
              <TabsContent value="joints" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Shoulder</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.shoulderFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.shoulderFlexion]}
                      onValueChange={([v]) => updateJointAngle("shoulderFlexion", v)}
                      min={-90}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Abduction: {config.jointAngles.shoulderAbduction}°</Label>
                    <Slider
                      value={[config.jointAngles.shoulderAbduction]}
                      onValueChange={([v]) => updateJointAngle("shoulderAbduction", v)}
                      min={0}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Elbow</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.elbowFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.elbowFlexion]}
                      onValueChange={([v]) => updateJointAngle("elbowFlexion", v)}
                      min={0}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Hip</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.hipFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.hipFlexion]}
                      onValueChange={([v]) => updateJointAngle("hipFlexion", v)}
                      min={-20}
                      max={120}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm text-muted-foreground pt-4">Knee</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Flexion: {config.jointAngles.kneeFlexion}°</Label>
                    <Slider
                      value={[config.jointAngles.kneeFlexion]}
                      onValueChange={([v]) => updateJointAngle("kneeFlexion", v)}
                      min={0}
                      max={135}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Body Proportion Controls */}
              <TabsContent value="body" className="space-y-4 overflow-y-auto max-h-[550px] mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Shoulder Width: {config.bodyProportions.shoulderWidth}cm</Label>
                    <Slider
                      value={[config.bodyProportions.shoulderWidth]}
                      onValueChange={([v]) => updateBodyProportion("shoulderWidth", v)}
                      min={30}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Hip Width: {config.bodyProportions.hipWidth}cm</Label>
                    <Slider
                      value={[config.bodyProportions.hipWidth]}
                      onValueChange={([v]) => updateBodyProportion("hipWidth", v)}
                      min={25}
                      max={40}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Patient Measurements</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Height estimate: ~{(config.limbLengths.spine + config.limbLengths.thigh + config.limbLengths.shin + 20)}cm</p>
                      <p>• Arm reach: ~{(config.limbLengths.upperArm + config.limbLengths.forearm) * 2}cm</p>
                      <p>• Shoulder-to-hip ratio: {(config.bodyProportions.shoulderWidth / config.bodyProportions.hipWidth).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">Clinical Notes</h4>
                    <div className="space-y-1 text-xs text-blue-200">
                      <p>• Joint angles represent restrictions</p>
                      <p>• 0° indicates neutral position</p>
                      <p>• Positive values show flexion/abduction</p>
                      <p>• Save configurations for tracking</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Status Information */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">3D Model: Professional Skeleton</span>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}