import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// @ts-ignore - Mannequin.js doesn't have TypeScript definitions
import "@/lib/mannequin.min.js";
declare const MANNEQUIN: any;
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Download, Upload, User, Activity, Maximize2 } from "lucide-react";

interface MannequinSkeletonProps {
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

export default function MannequinSkeleton({ config }: MannequinSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mannequinRef = useRef<any>(null);
  const animationIdRef = useRef<number>();

  // Joint angle states (in degrees)
  const [joints, setJoints] = useState({
    // Head and Neck
    headTilt: 0,
    headTurn: 0,
    headNod: 0,
    
    // Spine
    torsoTilt: 0,
    torsoTurn: 0,
    torsoBend: 0,
    
    // Left Arm
    leftShoulderRaise: config.jointAngles.shoulderAbduction,
    leftShoulderStraddle: 0,
    leftShoulderTurn: config.jointAngles.shoulderFlexion,
    leftElbowBend: config.jointAngles.elbowFlexion,
    leftElbowTurn: 0,
    leftWristBend: 0,
    leftWristTurn: 0,
    
    // Right Arm
    rightShoulderRaise: config.jointAngles.shoulderAbduction,
    rightShoulderStraddle: 0,
    rightShoulderTurn: config.jointAngles.shoulderFlexion,
    rightElbowBend: config.jointAngles.elbowFlexion,
    rightElbowTurn: 0,
    rightWristBend: 0,
    rightWristTurn: 0,
    
    // Left Leg
    leftHipRaise: config.jointAngles.hipFlexion,
    leftHipStraddle: 0,
    leftHipTurn: 0,
    leftKneeBend: config.jointAngles.kneeFlexion,
    leftAnkleBend: 0,
    leftAnkleTurn: 0,
    
    // Right Leg
    rightHipRaise: config.jointAngles.hipFlexion,
    rightHipStraddle: 0,
    rightHipTurn: 0,
    rightKneeBend: config.jointAngles.kneeFlexion,
    rightAnkleBend: 0,
    rightAnkleTurn: 0,
  });

  // Limb length scales
  const [limbScales, setLimbScales] = useState({
    upperArmScale: config.limbLengths.upperArm,
    forearmScale: config.limbLengths.forearm,
    thighScale: config.limbLengths.thigh,
    shinScale: config.limbLengths.shin,
    spineScale: config.limbLengths.spine,
    shoulderWidth: config.bodyProportions.shoulderWidth,
    hipWidth: config.bodyProportions.hipWidth,
  });

  // Preset poses
  const applyPresetPose = (poseName: string) => {
    const poses: Record<string, any> = {
      neutral: {
        headTilt: 0, headTurn: 0, headNod: 0,
        torsoTilt: 0, torsoTurn: 0, torsoBend: 0,
        leftShoulderRaise: 0, leftShoulderStraddle: 0, leftShoulderTurn: 0,
        leftElbowBend: 0, leftElbowTurn: 0, leftWristBend: 0, leftWristTurn: 0,
        rightShoulderRaise: 0, rightShoulderStraddle: 0, rightShoulderTurn: 0,
        rightElbowBend: 0, rightElbowTurn: 0, rightWristBend: 0, rightWristTurn: 0,
        leftHipRaise: 0, leftHipStraddle: 0, leftHipTurn: 0,
        leftKneeBend: 0, leftAnkleBend: 0, leftAnkleTurn: 0,
        rightHipRaise: 0, rightHipStraddle: 0, rightHipTurn: 0,
        rightKneeBend: 0, rightAnkleBend: 0, rightAnkleTurn: 0,
      },
      walking: {
        ...joints,
        leftHipRaise: 25, rightHipRaise: -20,
        leftKneeBend: 10, rightKneeBend: 45,
        leftShoulderTurn: -20, rightShoulderTurn: 25,
      },
      sitting: {
        ...joints,
        leftHipRaise: 90, rightHipRaise: 90,
        leftKneeBend: 90, rightKneeBend: 90,
        torsoTilt: 5,
      },
      reaching: {
        ...joints,
        leftShoulderRaise: 90, leftShoulderTurn: 45,
        leftElbowBend: 30, torsoTurn: 15,
      },
      examination: {
        ...joints,
        leftShoulderRaise: 90, leftShoulderStraddle: 30,
        leftElbowBend: 0, rightHipStraddle: 20,
      }
    };
    
    if (poses[poseName]) {
      setJoints(poses[poseName]);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);
    sceneRef.current = scene;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(2, 1.5, 3);
    camera.lookAt(0, 1, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    // Create Mannequin figure
    try {
      // Create a male mannequin
      const mannequin = new MANNEQUIN.Male();
      mannequin.body.castShadow = true;
      mannequin.body.receiveShadow = true;
      
      // Set initial position
      mannequin.position.y = 0;
      
      scene.add(mannequin);
      mannequinRef.current = mannequin;
      
      // Apply initial joint configuration
      updateMannequinPose();
      updateMannequinProportions();
    } catch (error) {
      console.error("Error creating mannequin:", error);
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
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
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener("resize", handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update mannequin pose when joints change
  const updateMannequinPose = () => {
    if (!mannequinRef.current) return;
    
    const m = mannequinRef.current;
    
    // Convert degrees to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    try {
      // Head
      if (m.head) {
        m.head.tilt = toRad(joints.headTilt);
        m.head.turn = toRad(joints.headTurn);
        m.head.nod = toRad(joints.headNod);
      }
      
      // Torso
      if (m.torso) {
        m.torso.tilt = toRad(joints.torsoTilt);
        m.torso.turn = toRad(joints.torsoTurn);
        m.torso.bend = toRad(joints.torsoBend);
      }
      
      // Left Arm
      if (m.l_arm) {
        m.l_arm.raise = toRad(joints.leftShoulderRaise);
        m.l_arm.straddle = toRad(joints.leftShoulderStraddle);
        m.l_arm.turn = toRad(joints.leftShoulderTurn);
      }
      if (m.l_elbow) {
        m.l_elbow.bend = toRad(joints.leftElbowBend);
        m.l_elbow.turn = toRad(joints.leftElbowTurn);
      }
      if (m.l_wrist) {
        m.l_wrist.bend = toRad(joints.leftWristBend);
        m.l_wrist.turn = toRad(joints.leftWristTurn);
      }
      
      // Right Arm
      if (m.r_arm) {
        m.r_arm.raise = toRad(joints.rightShoulderRaise);
        m.r_arm.straddle = toRad(joints.rightShoulderStraddle);
        m.r_arm.turn = toRad(joints.rightShoulderTurn);
      }
      if (m.r_elbow) {
        m.r_elbow.bend = toRad(joints.rightElbowBend);
        m.r_elbow.turn = toRad(joints.rightElbowTurn);
      }
      if (m.r_wrist) {
        m.r_wrist.bend = toRad(joints.rightWristBend);
        m.r_wrist.turn = toRad(joints.rightWristTurn);
      }
      
      // Left Leg
      if (m.l_leg) {
        m.l_leg.raise = toRad(joints.leftHipRaise);
        m.l_leg.straddle = toRad(joints.leftHipStraddle);
        m.l_leg.turn = toRad(joints.leftHipTurn);
      }
      if (m.l_knee) {
        m.l_knee.bend = toRad(joints.leftKneeBend);
      }
      if (m.l_ankle) {
        m.l_ankle.bend = toRad(joints.leftAnkleBend);
        m.l_ankle.turn = toRad(joints.leftAnkleTurn);
      }
      
      // Right Leg
      if (m.r_leg) {
        m.r_leg.raise = toRad(joints.rightHipRaise);
        m.r_leg.straddle = toRad(joints.rightHipStraddle);
        m.r_leg.turn = toRad(joints.rightHipTurn);
      }
      if (m.r_knee) {
        m.r_knee.bend = toRad(joints.rightKneeBend);
      }
      if (m.r_ankle) {
        m.r_ankle.bend = toRad(joints.rightAnkleBend);
        m.r_ankle.turn = toRad(joints.rightAnkleTurn);
      }
    } catch (error) {
      console.error("Error updating mannequin pose:", error);
    }
  };

  // Update mannequin proportions when limb scales change
  const updateMannequinProportions = () => {
    if (!mannequinRef.current) return;
    
    const m = mannequinRef.current;
    
    try {
      // Update body part scales
      if (m.l_arm && m.r_arm) {
        m.l_arm.scale.y = limbScales.upperArmScale;
        m.r_arm.scale.y = limbScales.upperArmScale;
      }
      
      if (m.l_forearm && m.r_forearm) {
        m.l_forearm.scale.y = limbScales.forearmScale;
        m.r_forearm.scale.y = limbScales.forearmScale;
      }
      
      if (m.l_leg && m.r_leg) {
        m.l_leg.scale.y = limbScales.thighScale;
        m.r_leg.scale.y = limbScales.thighScale;
      }
      
      if (m.l_shin && m.r_shin) {
        m.l_shin.scale.y = limbScales.shinScale;
        m.r_shin.scale.y = limbScales.shinScale;
      }
      
      if (m.torso) {
        m.torso.scale.y = limbScales.spineScale;
        m.torso.scale.x = limbScales.shoulderWidth;
      }
      
      if (m.pelvis) {
        m.pelvis.scale.x = limbScales.hipWidth;
      }
    } catch (error) {
      console.error("Error updating mannequin proportions:", error);
    }
  };

  useEffect(() => {
    updateMannequinPose();
  }, [joints]);

  useEffect(() => {
    updateMannequinProportions();
  }, [limbScales]);

  const JointSlider = ({ label, value, onChange, min = -180, max = 180 }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground">{value}°</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
    </div>
  );

  const LimbScaleSlider = ({ label, value, onChange }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground">{value.toFixed(2)}x</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0.5}
        max={1.5}
        step={0.01}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="flex h-full">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* Preset Poses */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("neutral")}>
            <User className="w-4 h-4 mr-1" />
            Neutral
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("walking")}>
            Walking
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("sitting")}>
            Sitting
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("reaching")}>
            Reaching
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPresetPose("examination")}>
            Exam
          </Button>
        </div>

        {/* View Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (rendererRef.current && mountRef.current) {
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
      </div>

      {/* Control Panel */}
      <div className="w-80 border-l bg-background overflow-y-auto">
        <Tabs defaultValue="joints" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="joints">Joint Angles</TabsTrigger>
            <TabsTrigger value="proportions">Proportions</TabsTrigger>
          </TabsList>

          <TabsContent value="joints" className="p-4 space-y-4">
            {/* Head & Neck */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Head & Neck</h3>
                <JointSlider
                  label="Head Tilt"
                  value={joints.headTilt}
                  onChange={(v: number) => setJoints({ ...joints, headTilt: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Head Turn"
                  value={joints.headTurn}
                  onChange={(v: number) => setJoints({ ...joints, headTurn: v })}
                  min={-90}
                  max={90}
                />
                <JointSlider
                  label="Head Nod"
                  value={joints.headNod}
                  onChange={(v: number) => setJoints({ ...joints, headNod: v })}
                  min={-45}
                  max={45}
                />
              </CardContent>
            </Card>

            {/* Torso */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Torso</h3>
                <JointSlider
                  label="Torso Tilt"
                  value={joints.torsoTilt}
                  onChange={(v: number) => setJoints({ ...joints, torsoTilt: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Torso Turn"
                  value={joints.torsoTurn}
                  onChange={(v: number) => setJoints({ ...joints, torsoTurn: v })}
                  min={-90}
                  max={90}
                />
                <JointSlider
                  label="Torso Bend"
                  value={joints.torsoBend}
                  onChange={(v: number) => setJoints({ ...joints, torsoBend: v })}
                  min={-45}
                  max={45}
                />
              </CardContent>
            </Card>

            {/* Left Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Arm</h3>
                <JointSlider
                  label="Shoulder Flexion/Extension"
                  value={joints.leftShoulderTurn}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderTurn: v })}
                />
                <JointSlider
                  label="Shoulder Abduction"
                  value={joints.leftShoulderRaise}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderRaise: v })}
                />
                <JointSlider
                  label="Shoulder Rotation"
                  value={joints.leftShoulderStraddle}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderStraddle: v })}
                />
                <JointSlider
                  label="Elbow Flexion"
                  value={joints.leftElbowBend}
                  onChange={(v: number) => setJoints({ ...joints, leftElbowBend: v })}
                  min={0}
                  max={150}
                />
                <JointSlider
                  label="Wrist Flexion"
                  value={joints.leftWristBend}
                  onChange={(v: number) => setJoints({ ...joints, leftWristBend: v })}
                  min={-90}
                  max={90}
                />
              </CardContent>
            </Card>

            {/* Right Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Right Arm</h3>
                <JointSlider
                  label="Shoulder Flexion/Extension"
                  value={joints.rightShoulderTurn}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderTurn: v })}
                />
                <JointSlider
                  label="Shoulder Abduction"
                  value={joints.rightShoulderRaise}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderRaise: v })}
                />
                <JointSlider
                  label="Shoulder Rotation"
                  value={joints.rightShoulderStraddle}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderStraddle: v })}
                />
                <JointSlider
                  label="Elbow Flexion"
                  value={joints.rightElbowBend}
                  onChange={(v: number) => setJoints({ ...joints, rightElbowBend: v })}
                  min={0}
                  max={150}
                />
                <JointSlider
                  label="Wrist Flexion"
                  value={joints.rightWristBend}
                  onChange={(v: number) => setJoints({ ...joints, rightWristBend: v })}
                  min={-90}
                  max={90}
                />
              </CardContent>
            </Card>

            {/* Left Leg */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Leg</h3>
                <JointSlider
                  label="Hip Flexion"
                  value={joints.leftHipRaise}
                  onChange={(v: number) => setJoints({ ...joints, leftHipRaise: v })}
                  min={-30}
                  max={120}
                />
                <JointSlider
                  label="Hip Abduction"
                  value={joints.leftHipStraddle}
                  onChange={(v: number) => setJoints({ ...joints, leftHipStraddle: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Knee Flexion"
                  value={joints.leftKneeBend}
                  onChange={(v: number) => setJoints({ ...joints, leftKneeBend: v })}
                  min={0}
                  max={135}
                />
                <JointSlider
                  label="Ankle Dorsiflexion"
                  value={joints.leftAnkleBend}
                  onChange={(v: number) => setJoints({ ...joints, leftAnkleBend: v })}
                  min={-45}
                  max={30}
                />
              </CardContent>
            </Card>

            {/* Right Leg */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Right Leg</h3>
                <JointSlider
                  label="Hip Flexion"
                  value={joints.rightHipRaise}
                  onChange={(v: number) => setJoints({ ...joints, rightHipRaise: v })}
                  min={-30}
                  max={120}
                />
                <JointSlider
                  label="Hip Abduction"
                  value={joints.rightHipStraddle}
                  onChange={(v: number) => setJoints({ ...joints, rightHipStraddle: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Knee Flexion"
                  value={joints.rightKneeBend}
                  onChange={(v: number) => setJoints({ ...joints, rightKneeBend: v })}
                  min={0}
                  max={135}
                />
                <JointSlider
                  label="Ankle Dorsiflexion"
                  value={joints.rightAnkleBend}
                  onChange={(v: number) => setJoints({ ...joints, rightAnkleBend: v })}
                  min={-45}
                  max={30}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proportions" className="p-4 space-y-4">
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Arm Proportions</h3>
                <LimbScaleSlider
                  label="Upper Arm Length"
                  value={limbScales.upperArmScale}
                  onChange={(v: number) => setLimbScales({ ...limbScales, upperArmScale: v })}
                />
                <LimbScaleSlider
                  label="Forearm Length"
                  value={limbScales.forearmScale}
                  onChange={(v: number) => setLimbScales({ ...limbScales, forearmScale: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Leg Proportions</h3>
                <LimbScaleSlider
                  label="Thigh Length"
                  value={limbScales.thighScale}
                  onChange={(v: number) => setLimbScales({ ...limbScales, thighScale: v })}
                />
                <LimbScaleSlider
                  label="Shin Length"
                  value={limbScales.shinScale}
                  onChange={(v: number) => setLimbScales({ ...limbScales, shinScale: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Body Proportions</h3>
                <LimbScaleSlider
                  label="Spine Height"
                  value={limbScales.spineScale}
                  onChange={(v: number) => setLimbScales({ ...limbScales, spineScale: v })}
                />
                <LimbScaleSlider
                  label="Shoulder Width"
                  value={limbScales.shoulderWidth}
                  onChange={(v: number) => setLimbScales({ ...limbScales, shoulderWidth: v })}
                />
                <LimbScaleSlider
                  label="Hip Width"
                  value={limbScales.hipWidth}
                  onChange={(v: number) => setLimbScales({ ...limbScales, hipWidth: v })}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}