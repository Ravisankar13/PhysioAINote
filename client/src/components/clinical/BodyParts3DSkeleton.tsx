import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Maximize2, Download, Bone, Brain, Heart } from "lucide-react";

interface BodyParts3DSkeletonProps {
  config: {
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
    pathologies?: {
      shoulder?: string;
      spine?: string;
      lowerLimb?: string;
    };
  };
}

// Artec 3D Professional Models
const ANATOMICAL_MODELS = {
  skeleton: {
    file: "/models/Human skeleton HD.obj",
    name: "Artec 3D Human Skeleton HD",
    description: "Professional 3D scanned human skeleton with ultra-high detail"
  },
  glb: {
    file: "/models/skeleton.glb",
    name: "GLB Skeleton Model",
    description: "Optimized skeleton in GLB format"
  }
};

export default function BodyParts3DSkeleton({ config }: BodyParts3DSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationIdRef = useRef<number>();
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentModel, setCurrentModel] = useState("skeleton");
  const [modelError, setModelError] = useState<string | null>(null);

  // Joint controls for posing
  const [jointRotations, setJointRotations] = useState({
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    leftShoulder: { x: config.jointAngles.shoulderFlexion, y: 0, z: config.jointAngles.shoulderAbduction },
    rightShoulder: { x: config.jointAngles.shoulderFlexion, y: 0, z: -config.jointAngles.shoulderAbduction },
    leftElbow: { x: config.jointAngles.elbowFlexion, y: 0, z: 0 },
    rightElbow: { x: config.jointAngles.elbowFlexion, y: 0, z: 0 },
    leftHip: { x: config.jointAngles.hipFlexion, y: 0, z: 0 },
    rightHip: { x: config.jointAngles.hipFlexion, y: 0, z: 0 },
    leftKnee: { x: config.jointAngles.kneeFlexion, y: 0, z: 0 },
    rightKnee: { x: config.jointAngles.kneeFlexion, y: 0, z: 0 }
  });

  // Model scale controls
  const [modelScale, setModelScale] = useState({
    overall: 1.0,
    upperBody: 1.0,
    lowerBody: 1.0,
    limbs: 1.0
  });

  // Preset poses
  const applyPresetPose = (poseName: string) => {
    const poses: Record<string, any> = {
      neutral: {
        spine: { x: 0, y: 0, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
        leftShoulder: { x: 0, y: 0, z: 0 },
        rightShoulder: { x: 0, y: 0, z: 0 },
        leftElbow: { x: 0, y: 0, z: 0 },
        rightElbow: { x: 0, y: 0, z: 0 },
        leftHip: { x: 0, y: 0, z: 0 },
        rightHip: { x: 0, y: 0, z: 0 },
        leftKnee: { x: 0, y: 0, z: 0 },
        rightKnee: { x: 0, y: 0, z: 0 }
      },
      examining: {
        ...jointRotations,
        leftShoulder: { x: 90, y: 0, z: 30 },
        leftElbow: { x: 45, y: 0, z: 0 },
        spine: { x: 0, y: 15, z: 0 },
        neck: { x: 0, y: -20, z: 0 }
      },
      walking: {
        ...jointRotations,
        leftHip: { x: 30, y: 0, z: 0 },
        rightHip: { x: -20, y: 0, z: 0 },
        leftKnee: { x: 10, y: 0, z: 0 },
        rightKnee: { x: 45, y: 0, z: 0 },
        leftShoulder: { x: -20, y: 0, z: 0 },
        rightShoulder: { x: 25, y: 0, z: 0 }
      },
      sitting: {
        ...jointRotations,
        leftHip: { x: 90, y: 0, z: 0 },
        rightHip: { x: 90, y: 0, z: 0 },
        leftKnee: { x: 90, y: 0, z: 0 },
        rightKnee: { x: 90, y: 0, z: 0 },
        spine: { x: 10, y: 0, z: 0 }
      }
    };
    
    if (poses[poseName]) {
      setJointRotations(poses[poseName]);
    }
  };

  // Create Three.js scene
  const initScene = () => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 100);
    sceneRef.current = scene;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 1.5, 3);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.8, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8080, 0.2);
    rimLight.position.set(0, 3, -8);
    scene.add(rimLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    // Reference axes
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.y = 0.01;
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Apply rotations to model bones if loaded
      if (modelRef.current) {
        applyJointRotations();
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
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  // Apply joint rotations to the model
  const applyJointRotations = () => {
    if (!modelRef.current) return;
    
    // Convert degrees to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    // Traverse model and find bone groups
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Bone || child instanceof THREE.Object3D) {
        const name = child.name.toLowerCase();
        
        // Apply rotations based on bone names
        if (name.includes("spine") || name.includes("vertebr")) {
          child.rotation.x = toRad(jointRotations.spine.x);
          child.rotation.y = toRad(jointRotations.spine.y);
          child.rotation.z = toRad(jointRotations.spine.z);
        } else if (name.includes("neck") || name.includes("cervical")) {
          child.rotation.x = toRad(jointRotations.neck.x);
          child.rotation.y = toRad(jointRotations.neck.y);
        } else if (name.includes("shoulder_l") || name.includes("humerus_l")) {
          child.rotation.x = toRad(jointRotations.leftShoulder.x);
          child.rotation.z = toRad(jointRotations.leftShoulder.z);
        } else if (name.includes("shoulder_r") || name.includes("humerus_r")) {
          child.rotation.x = toRad(jointRotations.rightShoulder.x);
          child.rotation.z = toRad(jointRotations.rightShoulder.z);
        } else if (name.includes("elbow_l") || name.includes("forearm_l")) {
          child.rotation.x = toRad(jointRotations.leftElbow.x);
        } else if (name.includes("elbow_r") || name.includes("forearm_r")) {
          child.rotation.x = toRad(jointRotations.rightElbow.x);
        } else if (name.includes("hip_l") || name.includes("femur_l")) {
          child.rotation.x = toRad(-jointRotations.leftHip.x);
        } else if (name.includes("hip_r") || name.includes("femur_r")) {
          child.rotation.x = toRad(-jointRotations.rightHip.x);
        } else if (name.includes("knee_l") || name.includes("tibia_l")) {
          child.rotation.x = toRad(-jointRotations.leftKnee.x);
        } else if (name.includes("knee_r") || name.includes("tibia_r")) {
          child.rotation.x = toRad(-jointRotations.rightKnee.x);
        }
      }
    });
    
    // Apply scale
    if (modelRef.current) {
      modelRef.current.scale.set(
        modelScale.overall,
        modelScale.overall,
        modelScale.overall
      );
    }
  };

  // Load 3D model
  const loadModel = async () => {
    setIsLoading(true);
    setModelError(null);
    
    if (!sceneRef.current) {
      setTimeout(() => {
        loadModel();
      }, 100);
      return;
    }
    
    // Try to load the Artec 3D skeleton first
    const objLoader = new OBJLoader();
    
    // Load the high-quality Artec 3D Human Skeleton HD model
    objLoader.load(
      '/models/Human skeleton HD.obj',
      (object) => {
        // Remove existing model
        if (modelRef.current) {
          sceneRef.current!.remove(modelRef.current);
        }
        
        // Apply material to the loaded model
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          emissive: 0x404040,
          shininess: 30,
          specular: 0x808080
        });
        
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Scale and position the model
        object.scale.set(0.01, 0.01, 0.01); // Artec model is large, scale it down
        object.position.set(0, 0, 0);
        
        // Center the model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        object.position.y = 0;
        
        modelRef.current = object;
        sceneRef.current!.add(object);
        setIsLoading(false);
        
        console.log('Artec 3D skeleton loaded successfully');
      },
      (progress) => {
        console.log('Loading:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('Error loading Artec skeleton:', error);
        setModelError('Failed to load Artec 3D model, using fallback');
        // Fall back to procedural skeleton
        createProceduralSkeleton();
      }
    );
  };

  // Create a procedural skeleton (fallback when external models aren't available)
  const createProceduralSkeleton = () => {
    if (!sceneRef.current) return;
    
    // Remove existing model
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }
    
    const skeletonGroup = new THREE.Group();
    
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x606060,
      shininess: 30
    });
    
    // Helper to create bones
    const createBone = (length: number, thickness: number = 0.03) => {
      const geometry = new THREE.CylinderGeometry(thickness, thickness * 0.8, length, 8);
      const bone = new THREE.Mesh(geometry, boneMaterial);
      bone.castShadow = true;
      bone.receiveShadow = true;
      return bone;
    };
    
    // Build skeleton structure similar to BodyParts3D
    // Spine
    const spine = new THREE.Group();
    spine.name = "spine";
    const spineHeight = 0.8;
    const spineMain = createBone(spineHeight, 0.06);
    spineMain.position.y = spineHeight / 2;
    spine.add(spineMain);
    
    // Add vertebrae details
    for (let i = 0; i < 5; i++) {
      const vertebra = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.06),
        boneMaterial
      );
      vertebra.position.y = 0.15 + i * 0.15;
      vertebra.castShadow = true;
      spine.add(vertebra);
    }
    spine.position.y = 0.4;
    skeletonGroup.add(spine);
    
    // Ribcage
    const ribcage = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const ribLevel = new THREE.Group();
      const ribRadius = 0.15 - i * 0.005; // Taper ribs
      
      // Create curved ribs using segments
      const leftRibCurve = new THREE.Group();
      const rightRibCurve = new THREE.Group();
      
      for (let j = 0; j < 5; j++) {
        const angle = (j / 4) * Math.PI / 3;
        const leftSegment = createBone(0.08, 0.015);
        leftSegment.rotation.z = angle;
        leftSegment.position.set(
          -Math.sin(angle) * ribRadius,
          0,
          -Math.cos(angle) * ribRadius * 0.5
        );
        leftRibCurve.add(leftSegment);
        
        const rightSegment = createBone(0.08, 0.015);
        rightSegment.rotation.z = -angle;
        rightSegment.position.set(
          Math.sin(angle) * ribRadius,
          0,
          -Math.cos(angle) * ribRadius * 0.5
        );
        rightRibCurve.add(rightSegment);
      }
      
      leftRibCurve.position.y = 1.2 - i * 0.06;
      rightRibCurve.position.y = 1.2 - i * 0.06;
      
      ribLevel.add(leftRibCurve, rightRibCurve);
      ribcage.add(ribLevel);
    }
    skeletonGroup.add(ribcage);
    
    // Skull
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      boneMaterial
    );
    skull.scale.y = 1.3;
    skull.position.y = 1.8;
    skull.name = "skull";
    skull.castShadow = true;
    skeletonGroup.add(skull);
    
    // Arms
    const createArm = (side: number) => {
      const armGroup = new THREE.Group();
      armGroup.name = side > 0 ? "arm_r" : "arm_l";
      
      // Upper arm (humerus)
      const upperArm = createBone(0.35, 0.04);
      upperArm.name = side > 0 ? "humerus_r" : "humerus_l";
      upperArm.position.y = -0.175;
      armGroup.add(upperArm);
      
      // Forearm (radius/ulna)
      const forearmGroup = new THREE.Group();
      forearmGroup.name = side > 0 ? "forearm_r" : "forearm_l";
      const forearm = createBone(0.3, 0.035);
      forearm.position.y = -0.15;
      forearmGroup.position.y = -0.35;
      forearmGroup.add(forearm);
      armGroup.add(forearmGroup);
      
      // Hand
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.02),
        boneMaterial
      );
      hand.position.y = -0.36;
      forearmGroup.add(hand);
      
      armGroup.position.set(side * 0.25, 1.4, 0);
      return armGroup;
    };
    
    skeletonGroup.add(createArm(-1)); // Left arm
    skeletonGroup.add(createArm(1));  // Right arm
    
    // Pelvis
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.15, 0.2),
      boneMaterial
    );
    pelvis.position.y = 0.4;
    pelvis.castShadow = true;
    skeletonGroup.add(pelvis);
    
    // Legs
    const createLeg = (side: number) => {
      const legGroup = new THREE.Group();
      legGroup.name = side > 0 ? "leg_r" : "leg_l";
      
      // Thigh (femur)
      const thigh = createBone(0.45, 0.05);
      thigh.name = side > 0 ? "femur_r" : "femur_l";
      thigh.position.y = -0.225;
      legGroup.add(thigh);
      
      // Shin (tibia/fibula)
      const shinGroup = new THREE.Group();
      shinGroup.name = side > 0 ? "shin_r" : "shin_l";
      const shin = createBone(0.4, 0.04);
      shin.position.y = -0.2;
      shinGroup.position.y = -0.45;
      shinGroup.add(shin);
      legGroup.add(shinGroup);
      
      // Foot
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.2),
        boneMaterial
      );
      foot.position.set(0, -0.215, 0.05);
      shinGroup.add(foot);
      
      legGroup.position.set(side * 0.12, 0.4, 0);
      return legGroup;
    };
    
    skeletonGroup.add(createLeg(-1)); // Left leg
    skeletonGroup.add(createLeg(1));  // Right leg
    
    // Position the skeleton properly
    skeletonGroup.position.y = 0;
    
    modelRef.current = skeletonGroup;
    sceneRef.current.add(skeletonGroup);
    setIsLoading(false);
  };

  useEffect(() => {
    const cleanup = initScene();
    loadModel();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    loadModel();
  }, [currentModel]);

  const JointSlider = ({ label, joint, axis, min = -90, max = 90 }: any) => {
    const value = jointRotations[joint as keyof typeof jointRotations][axis as "x" | "y" | "z"];
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs">{label}</Label>
          <span className="text-xs text-muted-foreground">{value}°</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={([v]) => {
            setJointRotations(prev => ({
              ...prev,
              [joint]: {
                ...prev[joint as keyof typeof jointRotations],
                [axis]: v
              }
            }));
          }}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />
      </div>
    );
  };

  const ScaleSlider = ({ label, scaleKey }: any) => {
    const value = modelScale[scaleKey as keyof typeof modelScale];
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs">{label}</Label>
          <span className="text-xs text-muted-foreground">{value.toFixed(2)}x</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={([v]) => {
            setModelScale(prev => ({
              ...prev,
              [scaleKey]: v
            }));
          }}
          min={0.5}
          max={1.5}
          step={0.01}
          className="w-full"
        />
      </div>
    );
  };

  return (
    <div className="flex h-full bg-background">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-white mb-2" />
              <p className="text-white">Loading BodyParts3D Model...</p>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {modelError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded">
            {modelError}
          </div>
        )}
        
        {/* Model info */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-3 py-2 rounded">
          <h3 className="text-sm font-semibold">Artec 3D Human Skeleton HD</h3>
          <p className="text-xs text-gray-300">Professional 3D scanned model</p>
        </div>
        
        {/* Preset poses */}
        <div className="absolute top-14 left-4 flex gap-2 flex-wrap max-w-md">
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("neutral")}>
            Neutral
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("examining")}>
            Examining
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("walking")}>
            Walking
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("sitting")}>
            Sitting
          </Button>
        </div>
        
        {/* View controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (controlsRef.current) {
                controlsRef.current.reset();
              }
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (mountRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  mountRef.current.requestFullscreen();
                }
              }
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Attribution for Artec 3D */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-xs max-w-md">
          <p>Human Skeleton HD by <a href="https://www.artec3d.com/portable-3d-scanners" target="_blank" rel="noopener noreferrer" className="underline">Artec 3D</a></p>
          <p className="text-gray-400">Licensed under Creative Commons Attribution v4</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-80 border-l overflow-y-auto">
        <Tabs defaultValue="joints" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="joints">Joint Controls</TabsTrigger>
            <TabsTrigger value="scale">Scale Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="joints" className="p-4 space-y-4">
            {/* Spine & Neck */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Spine & Neck
                </h3>
                <JointSlider label="Spine Flexion/Extension" joint="spine" axis="x" min={-30} max={30} />
                <JointSlider label="Spine Rotation" joint="spine" axis="y" min={-45} max={45} />
                <JointSlider label="Spine Lateral Flexion" joint="spine" axis="z" min={-30} max={30} />
                <JointSlider label="Neck Flexion/Extension" joint="neck" axis="x" min={-45} max={45} />
                <JointSlider label="Neck Rotation" joint="neck" axis="y" min={-70} max={70} />
              </CardContent>
            </Card>

            {/* Left Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Arm</h3>
                <JointSlider label="Shoulder Flexion/Extension" joint="leftShoulder" axis="x" min={-60} max={180} />
                <JointSlider label="Shoulder Abduction" joint="leftShoulder" axis="z" min={0} max={180} />
                <JointSlider label="Elbow Flexion" joint="leftElbow" axis="x" min={0} max={150} />
              </CardContent>
            </Card>

            {/* Right Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Right Arm</h3>
                <JointSlider label="Shoulder Flexion/Extension" joint="rightShoulder" axis="x" min={-60} max={180} />
                <JointSlider label="Shoulder Abduction" joint="rightShoulder" axis="z" min={-180} max={0} />
                <JointSlider label="Elbow Flexion" joint="rightElbow" axis="x" min={0} max={150} />
              </CardContent>
            </Card>

            {/* Left Leg */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Leg</h3>
                <JointSlider label="Hip Flexion/Extension" joint="leftHip" axis="x" min={-30} max={120} />
                <JointSlider label="Knee Flexion" joint="leftKnee" axis="x" min={0} max={135} />
              </CardContent>
            </Card>

            {/* Right Leg */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Right Leg</h3>
                <JointSlider label="Hip Flexion/Extension" joint="rightHip" axis="x" min={-30} max={120} />
                <JointSlider label="Knee Flexion" joint="rightKnee" axis="x" min={0} max={135} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scale" className="p-4 space-y-4">
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Bone className="w-4 h-4" />
                  Model Scaling
                </h3>
                <ScaleSlider label="Overall Scale" scaleKey="overall" />
                <ScaleSlider label="Upper Body Scale" scaleKey="upperBody" />
                <ScaleSlider label="Lower Body Scale" scaleKey="lowerBody" />
                <ScaleSlider label="Limb Scale" scaleKey="limbs" />
              </CardContent>
            </Card>

            {/* Model Info */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <h3 className="text-sm font-semibold">Model Information</h3>
                <p className="text-xs text-muted-foreground">
                  Current Model: {ANATOMICAL_MODELS[currentModel as keyof typeof ANATOMICAL_MODELS].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ANATOMICAL_MODELS[currentModel as keyof typeof ANATOMICAL_MODELS].description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Data Source: BodyParts3D/Anatomography
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}