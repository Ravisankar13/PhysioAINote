import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Download, Upload } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

// Enhanced Three.js implementation with GLTF loading support
function ThreeJSSkeleton({ config }: { config: SkeletonConfig }) {
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
    scene.background = new THREE.Color(0x111827);
    scene.fog = new THREE.Fog(0x111827, 10, 50);
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

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonGroupRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // Enhanced ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x2a2a3a, 0x1a1a2a);
    gridHelper.position.y = -0.99;
    scene.add(gridHelper);

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

    // Materials
    const boneMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      roughness: 0.7,
      metalness: 0.3
    });
    const jointMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x60a5fa,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x60a5fa,
      emissiveIntensity: 0.1
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

    // Spine with vertebrae
    const spineGroup = new THREE.Group();
    const vertebraeCount = 5;
    for (let i = 0; i < vertebraeCount; i++) {
      const vertebra = createBone(limbLengths.spine / vertebraeCount, 0.04);
      vertebra.position.y = (limbLengths.spine * scale / vertebraeCount) * i;
      spineGroup.add(vertebra);
    }
    group.add(spineGroup);

    // Ribcage
    const ribcageGeometry = new THREE.TorusGeometry(
      bodyProportions.shoulderWidth * scale * 0.4, 
      0.015, 
      6, 
      8
    );
    const ribcage = new THREE.Mesh(ribcageGeometry, boneMaterial);
    ribcage.position.y = limbLengths.spine * scale * 0.7;
    ribcage.rotation.x = Math.PI / 2;
    ribcage.scale.y = 1.5;
    ribcage.castShadow = true;
    group.add(ribcage);

    // Head (skull)
    const skullGroup = new THREE.Group();
    const craniumGeometry = new THREE.SphereGeometry(0.1, 12, 12);
    const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
    cranium.scale.y = 1.2;
    cranium.castShadow = true;
    skullGroup.add(cranium);
    
    const jawGeometry = new THREE.BoxGeometry(0.08, 0.04, 0.08);
    const jaw = new THREE.Mesh(jawGeometry, boneMaterial);
    jaw.position.y = -0.06;
    jaw.castShadow = true;
    skullGroup.add(jaw);
    
    skullGroup.position.y = limbLengths.spine * scale + 0.15;
    group.add(skullGroup);

    // Shoulders (clavicles and scapulae)
    const shoulderGeometry = new THREE.CapsuleGeometry(0.015, bodyProportions.shoulderWidth * scale, 4, 8);
    const shoulders = new THREE.Mesh(shoulderGeometry, boneMaterial);
    shoulders.rotation.z = Math.PI / 2;
    shoulders.position.y = limbLengths.spine * scale;
    shoulders.castShadow = true;
    group.add(shoulders);

    // Pelvis
    const pelvisGeometry = new THREE.TorusGeometry(
      bodyProportions.hipWidth * scale * 0.4,
      0.02,
      6,
      8
    );
    const pelvis = new THREE.Mesh(pelvisGeometry, boneMaterial);
    pelvis.rotation.x = Math.PI / 2;
    pelvis.scale.z = 0.5;
    pelvis.castShadow = true;
    group.add(pelvis);

    // Arms
    const createArm = (side: number) => {
      const armGroup = new THREE.Group();
      
      // Upper arm
      const upperArm = createBone(limbLengths.upperArm, 0.03);
      upperArm.rotation.z = toRad(side * jointAngles.shoulderAbduction);
      upperArm.rotation.x = toRad(jointAngles.shoulderFlexion);
      armGroup.add(upperArm);
      
      // Forearm
      const forearm = createBone(limbLengths.forearm, 0.025);
      forearm.position.y = -limbLengths.upperArm * scale;
      forearm.rotation.x = toRad(-jointAngles.elbowFlexion);
      upperArm.add(forearm);
      
      // Hand
      const handGeometry = new THREE.BoxGeometry(0.04, 0.08, 0.015);
      const hand = new THREE.Mesh(handGeometry, boneMaterial);
      hand.position.y = -limbLengths.forearm * scale - 0.04;
      hand.castShadow = true;
      forearm.add(hand);
      
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
      
      // Thigh
      const thigh = createBone(limbLengths.thigh, 0.04);
      thigh.rotation.x = toRad(jointAngles.hipFlexion);
      legGroup.add(thigh);
      
      // Shin
      const shin = createBone(limbLengths.shin, 0.035);
      shin.position.y = -limbLengths.thigh * scale;
      shin.rotation.x = toRad(-jointAngles.kneeFlexion);
      thigh.add(shin);
      
      // Foot
      const footGeometry = new THREE.BoxGeometry(0.06, 0.02, 0.12);
      const foot = new THREE.Mesh(footGeometry, boneMaterial);
      foot.position.y = -limbLengths.shin * scale - 0.01;
      foot.position.z = 0.04;
      foot.castShadow = true;
      shin.add(foot);
      
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
      <div ref={mountRef} className="w-full h-full bg-gray-900 rounded-lg" />
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