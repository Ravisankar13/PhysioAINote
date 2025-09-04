import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import * as THREE from "three";

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

// Pure Three.js implementation without React Three Fiber to avoid crashes
function ThreeJSSkeleton({ config }: { config: SkeletonConfig }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 1, 2);
    camera.lookAt(0, 0, 0);

    // Renderer setup with minimal settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: false,
      powerPreference: "low-power"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonGroupRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // Simple ground plane
    const groundGeometry = new THREE.PlaneGeometry(3, 3);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x1a1a1a, 
      side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);

    // Mouse controls
    let mouseX = 0;
    let mouseY = 0;
    let isMouseDown = false;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleMouseDown = () => { isMouseDown = true; };
    const handleMouseUp = () => { isMouseDown = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (skeletonGroup) {
        skeletonGroup.rotation.y += 0.005;
        if (isMouseDown) {
          skeletonGroup.rotation.y += mouseX * 0.05;
          skeletonGroup.rotation.x = mouseY * 0.5;
        }
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, []);

  // Update skeleton based on config
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

    // Create bones using simple box geometry
    const boneMaterial = new THREE.MeshPhongMaterial({ color: 0xe0e0e0 });
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0x60a5fa });

    // Spine
    const spineGeometry = new THREE.BoxGeometry(0.04, limbLengths.spine * scale, 0.04);
    const spine = new THREE.Mesh(spineGeometry, boneMaterial);
    spine.position.y = limbLengths.spine * scale / 2;
    skeletonGroupRef.current.add(spine);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const head = new THREE.Mesh(headGeometry, new THREE.MeshPhongMaterial({ color: 0xf0f0f0 }));
    head.position.y = limbLengths.spine * scale + 0.1;
    skeletonGroupRef.current.add(head);

    // Shoulders
    const shoulderGeometry = new THREE.BoxGeometry(bodyProportions.shoulderWidth * scale, 0.03, 0.03);
    const shoulders = new THREE.Mesh(shoulderGeometry, boneMaterial);
    shoulders.position.y = limbLengths.spine * scale;
    skeletonGroupRef.current.add(shoulders);

    // Pelvis
    const pelvisGeometry = new THREE.BoxGeometry(bodyProportions.hipWidth * scale, 0.035, 0.035);
    const pelvis = new THREE.Mesh(pelvisGeometry, boneMaterial);
    pelvis.position.y = 0;
    skeletonGroupRef.current.add(pelvis);

    // Left arm
    const leftUpperArmGeometry = new THREE.BoxGeometry(0.025, limbLengths.upperArm * scale, 0.025);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeometry, boneMaterial);
    leftUpperArm.position.set(
      -bodyProportions.shoulderWidth * scale / 2,
      limbLengths.spine * scale - limbLengths.upperArm * scale / 2,
      0
    );
    leftUpperArm.rotation.z = toRad(jointAngles.shoulderAbduction);
    skeletonGroupRef.current.add(leftUpperArm);

    // Left forearm
    const leftForearmGeometry = new THREE.BoxGeometry(0.02, limbLengths.forearm * scale, 0.02);
    const leftForearm = new THREE.Mesh(leftForearmGeometry, boneMaterial);
    leftForearm.position.set(
      -bodyProportions.shoulderWidth * scale / 2 - Math.sin(toRad(jointAngles.shoulderAbduction)) * limbLengths.upperArm * scale,
      limbLengths.spine * scale - limbLengths.upperArm * scale - limbLengths.forearm * scale / 2,
      0
    );
    leftForearm.rotation.z = toRad(jointAngles.elbowFlexion);
    skeletonGroupRef.current.add(leftForearm);

    // Right arm (mirror of left)
    const rightUpperArmGeometry = new THREE.BoxGeometry(0.025, limbLengths.upperArm * scale, 0.025);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeometry, boneMaterial);
    rightUpperArm.position.set(
      bodyProportions.shoulderWidth * scale / 2,
      limbLengths.spine * scale - limbLengths.upperArm * scale / 2,
      0
    );
    rightUpperArm.rotation.z = -toRad(jointAngles.shoulderAbduction);
    skeletonGroupRef.current.add(rightUpperArm);

    const rightForearmGeometry = new THREE.BoxGeometry(0.02, limbLengths.forearm * scale, 0.02);
    const rightForearm = new THREE.Mesh(rightForearmGeometry, boneMaterial);
    rightForearm.position.set(
      bodyProportions.shoulderWidth * scale / 2 + Math.sin(toRad(jointAngles.shoulderAbduction)) * limbLengths.upperArm * scale,
      limbLengths.spine * scale - limbLengths.upperArm * scale - limbLengths.forearm * scale / 2,
      0
    );
    rightForearm.rotation.z = -toRad(jointAngles.elbowFlexion);
    skeletonGroupRef.current.add(rightForearm);

    // Left leg
    const leftThighGeometry = new THREE.BoxGeometry(0.035, limbLengths.thigh * scale, 0.035);
    const leftThigh = new THREE.Mesh(leftThighGeometry, boneMaterial);
    leftThigh.position.set(
      -bodyProportions.hipWidth * scale / 2,
      -limbLengths.thigh * scale / 2,
      0
    );
    leftThigh.rotation.x = toRad(jointAngles.hipFlexion);
    skeletonGroupRef.current.add(leftThigh);

    const leftShinGeometry = new THREE.BoxGeometry(0.03, limbLengths.shin * scale, 0.03);
    const leftShin = new THREE.Mesh(leftShinGeometry, boneMaterial);
    leftShin.position.set(
      -bodyProportions.hipWidth * scale / 2,
      -limbLengths.thigh * scale - limbLengths.shin * scale / 2,
      Math.sin(toRad(jointAngles.hipFlexion)) * limbLengths.thigh * scale
    );
    leftShin.rotation.x = toRad(jointAngles.kneeFlexion);
    skeletonGroupRef.current.add(leftShin);

    // Right leg (mirror of left)
    const rightThighGeometry = new THREE.BoxGeometry(0.035, limbLengths.thigh * scale, 0.035);
    const rightThigh = new THREE.Mesh(rightThighGeometry, boneMaterial);
    rightThigh.position.set(
      bodyProportions.hipWidth * scale / 2,
      -limbLengths.thigh * scale / 2,
      0
    );
    rightThigh.rotation.x = toRad(jointAngles.hipFlexion);
    skeletonGroupRef.current.add(rightThigh);

    const rightShinGeometry = new THREE.BoxGeometry(0.03, limbLengths.shin * scale, 0.03);
    const rightShin = new THREE.Mesh(rightShinGeometry, boneMaterial);
    rightShin.position.set(
      bodyProportions.hipWidth * scale / 2,
      -limbLengths.thigh * scale - limbLengths.shin * scale / 2,
      Math.sin(toRad(jointAngles.hipFlexion)) * limbLengths.thigh * scale
    );
    rightShin.rotation.x = toRad(jointAngles.kneeFlexion);
    skeletonGroupRef.current.add(rightShin);

  }, [config]);

  return (
    <div ref={mountRef} className="w-full h-full bg-gray-900 rounded-lg" />
  );
}

export default function Skeleton3D({ 
  onPatientDataChange 
}: { 
  onPatientDataChange?: (config: SkeletonConfig) => void 
}) {
  const [config, setConfig] = useState<SkeletonConfig>(defaultConfig);
  const [selectedTab, setSelectedTab] = useState("limbs");
  
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
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
              
              <div className="absolute bottom-4 left-4 text-xs text-gray-400">
                Click and drag to rotate
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}