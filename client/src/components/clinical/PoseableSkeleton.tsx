import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Download, Upload, User, Activity, Maximize2 } from "lucide-react";

interface PoseableSkeletonProps {
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

export default function PoseableSkeleton({ config }: PoseableSkeletonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();
  
  // Joint groups for manipulation
  const jointsRef = useRef<{
    neck?: THREE.Object3D;
    leftShoulder?: THREE.Object3D;
    rightShoulder?: THREE.Object3D;
    leftElbow?: THREE.Object3D;
    rightElbow?: THREE.Object3D;
    leftWrist?: THREE.Object3D;
    rightWrist?: THREE.Object3D;
    spine?: THREE.Object3D;
    leftHip?: THREE.Object3D;
    rightHip?: THREE.Object3D;
    leftKnee?: THREE.Object3D;
    rightKnee?: THREE.Object3D;
    leftAnkle?: THREE.Object3D;
    rightAnkle?: THREE.Object3D;
  }>({});

  // Joint angle states (in degrees)
  const [joints, setJoints] = useState({
    // Head and Neck
    neckTilt: 0,
    neckRotation: 0,
    
    // Spine
    spineBend: 0,
    spineRotation: 0,
    spineLean: 0,
    
    // Left Arm
    leftShoulderFlexion: config.jointAngles.shoulderFlexion,
    leftShoulderAbduction: config.jointAngles.shoulderAbduction,
    leftShoulderRotation: 0,
    leftElbowFlexion: config.jointAngles.elbowFlexion,
    leftWristFlexion: 0,
    leftWristRotation: 0,
    
    // Right Arm
    rightShoulderFlexion: config.jointAngles.shoulderFlexion,
    rightShoulderAbduction: config.jointAngles.shoulderAbduction,
    rightShoulderRotation: 0,
    rightElbowFlexion: config.jointAngles.elbowFlexion,
    rightWristFlexion: 0,
    rightWristRotation: 0,
    
    // Left Leg
    leftHipFlexion: config.jointAngles.hipFlexion,
    leftHipAbduction: 0,
    leftHipRotation: 0,
    leftKneeFlexion: config.jointAngles.kneeFlexion,
    leftAnkleFlexion: 0,
    leftAnkleRotation: 0,
    
    // Right Leg
    rightHipFlexion: config.jointAngles.hipFlexion,
    rightHipAbduction: 0,
    rightHipRotation: 0,
    rightKneeFlexion: config.jointAngles.kneeFlexion,
    rightAnkleFlexion: 0,
    rightAnkleRotation: 0,
  });

  // Limb length scales
  const [limbScales, setLimbScales] = useState({
    upperArmLength: config.limbLengths.upperArm,
    forearmLength: config.limbLengths.forearm,
    thighLength: config.limbLengths.thigh,
    shinLength: config.limbLengths.shin,
    spineHeight: config.limbLengths.spine,
    shoulderWidth: config.bodyProportions.shoulderWidth,
    hipWidth: config.bodyProportions.hipWidth,
  });

  // Preset poses
  const applyPresetPose = (poseName: string) => {
    const poses: Record<string, any> = {
      neutral: {
        neckTilt: 0, neckRotation: 0,
        spineBend: 0, spineRotation: 0, spineLean: 0,
        leftShoulderFlexion: 0, leftShoulderAbduction: 0, leftShoulderRotation: 0,
        leftElbowFlexion: 0, leftWristFlexion: 0, leftWristRotation: 0,
        rightShoulderFlexion: 0, rightShoulderAbduction: 0, rightShoulderRotation: 0,
        rightElbowFlexion: 0, rightWristFlexion: 0, rightWristRotation: 0,
        leftHipFlexion: 0, leftHipAbduction: 0, leftHipRotation: 0,
        leftKneeFlexion: 0, leftAnkleFlexion: 0, leftAnkleRotation: 0,
        rightHipFlexion: 0, rightHipAbduction: 0, rightHipRotation: 0,
        rightKneeFlexion: 0, rightAnkleFlexion: 0, rightAnkleRotation: 0,
      },
      walking: {
        ...joints,
        leftHipFlexion: 30, rightHipFlexion: -20,
        leftKneeFlexion: 10, rightKneeFlexion: 45,
        leftShoulderFlexion: -20, rightShoulderFlexion: 25,
        spineBend: 5,
      },
      sitting: {
        ...joints,
        leftHipFlexion: 90, rightHipFlexion: 90,
        leftKneeFlexion: 90, rightKneeFlexion: 90,
        spineBend: 10,
        leftAnkleFlexion: 0, rightAnkleFlexion: 0,
      },
      reaching: {
        ...joints,
        rightShoulderFlexion: 90, rightShoulderAbduction: 30,
        rightElbowFlexion: 30, spineRotation: 15, spineLean: 10,
      },
      examination: {
        ...joints,
        leftShoulderFlexion: 0, leftShoulderAbduction: 90,
        leftElbowFlexion: 0, rightHipAbduction: 20,
        neckRotation: -30,
      }
    };
    
    if (poses[poseName]) {
      setJoints(poses[poseName]);
    }
  };

  // Create skeleton function
  const createSkeleton = (scene: THREE.Scene) => {
    const skeleton = new THREE.Group();
    skeletonRef.current = skeleton;
    
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xf4f1e8,
      emissive: 0x303020,
      shininess: 10,
    });
    
    const jointMaterial = new THREE.MeshPhongMaterial({
      color: 0xe0d5c0,
      emissive: 0x404030,
      shininess: 20,
    });

    // Helper function to create a bone
    const createBone = (length: number, thickness: number = 0.03) => {
      const geometry = new THREE.CylinderGeometry(thickness, thickness * 0.8, length, 8);
      const bone = new THREE.Mesh(geometry, boneMaterial);
      bone.castShadow = true;
      bone.receiveShadow = true;
      return bone;
    };
    
    // Helper function to create a joint
    const createJoint = (radius: number = 0.04) => {
      const geometry = new THREE.SphereGeometry(radius, 12, 12);
      const joint = new THREE.Mesh(geometry, jointMaterial);
      joint.castShadow = true;
      return joint;
    };

    // SPINE
    const spineGroup = new THREE.Group();
    jointsRef.current.spine = spineGroup;
    const spineLength = limbScales.spineHeight * 0.8;
    const spine = createBone(spineLength, 0.05);
    spine.position.y = spineLength / 2;
    spineGroup.add(spine);
    
    // Position the entire skeleton above ground
    spineGroup.position.y = 0.8;
    
    // Pelvis
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(limbScales.hipWidth * 0.4, 0.15, 0.12),
      boneMaterial
    );
    pelvis.castShadow = true;
    spineGroup.add(pelvis);
    
    // Ribcage
    const ribcage = new THREE.Mesh(
      new THREE.ConeGeometry(limbScales.shoulderWidth * 0.35, 0.4, 8),
      boneMaterial
    );
    ribcage.position.y = spineLength * 0.7;
    ribcage.rotation.z = Math.PI;
    ribcage.castShadow = true;
    spineGroup.add(ribcage);
    
    skeleton.add(spineGroup);

    // HEAD & NECK
    const neckGroup = new THREE.Group();
    jointsRef.current.neck = neckGroup;
    neckGroup.position.y = spineLength;
    
    const neck = createBone(0.1, 0.025);
    neck.position.y = 0.05;
    neckGroup.add(neck);
    
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      boneMaterial
    );
    head.position.y = 0.15;
    head.scale.y = 1.2;
    head.castShadow = true;
    neckGroup.add(head);
    
    spineGroup.add(neckGroup);

    // LEFT ARM
    const leftShoulderGroup = new THREE.Group();
    jointsRef.current.leftShoulder = leftShoulderGroup;
    leftShoulderGroup.position.set(-limbScales.shoulderWidth * 0.45, spineLength * 0.95, 0);
    
    const leftShoulderJoint = createJoint();
    leftShoulderGroup.add(leftShoulderJoint);
    
    const leftUpperArm = createBone(limbScales.upperArmLength * 0.3);
    leftUpperArm.position.y = -limbScales.upperArmLength * 0.15;
    leftShoulderGroup.add(leftUpperArm);
    
    // Left Elbow
    const leftElbowGroup = new THREE.Group();
    jointsRef.current.leftElbow = leftElbowGroup;
    leftElbowGroup.position.y = -limbScales.upperArmLength * 0.3;
    
    const leftElbowJoint = createJoint(0.03);
    leftElbowGroup.add(leftElbowJoint);
    
    const leftForearm = createBone(limbScales.forearmLength * 0.25);
    leftForearm.position.y = -limbScales.forearmLength * 0.125;
    leftElbowGroup.add(leftForearm);
    
    // Left Wrist
    const leftWristGroup = new THREE.Group();
    jointsRef.current.leftWrist = leftWristGroup;
    leftWristGroup.position.y = -limbScales.forearmLength * 0.25;
    
    const leftWristJoint = createJoint(0.025);
    leftWristGroup.add(leftWristJoint);
    
    const leftHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.1, 0.02),
      boneMaterial
    );
    leftHand.position.y = -0.05;
    leftHand.castShadow = true;
    leftWristGroup.add(leftHand);
    
    leftElbowGroup.add(leftWristGroup);
    leftShoulderGroup.add(leftElbowGroup);
    spineGroup.add(leftShoulderGroup);

    // RIGHT ARM (mirror of left)
    const rightShoulderGroup = new THREE.Group();
    jointsRef.current.rightShoulder = rightShoulderGroup;
    rightShoulderGroup.position.set(limbScales.shoulderWidth * 0.45, spineLength * 0.95, 0);
    
    const rightShoulderJoint = createJoint();
    rightShoulderGroup.add(rightShoulderJoint);
    
    const rightUpperArm = createBone(limbScales.upperArmLength * 0.3);
    rightUpperArm.position.y = -limbScales.upperArmLength * 0.15;
    rightShoulderGroup.add(rightUpperArm);
    
    // Right Elbow
    const rightElbowGroup = new THREE.Group();
    jointsRef.current.rightElbow = rightElbowGroup;
    rightElbowGroup.position.y = -limbScales.upperArmLength * 0.3;
    
    const rightElbowJoint = createJoint(0.03);
    rightElbowGroup.add(rightElbowJoint);
    
    const rightForearm = createBone(limbScales.forearmLength * 0.25);
    rightForearm.position.y = -limbScales.forearmLength * 0.125;
    rightElbowGroup.add(rightForearm);
    
    // Right Wrist
    const rightWristGroup = new THREE.Group();
    jointsRef.current.rightWrist = rightWristGroup;
    rightWristGroup.position.y = -limbScales.forearmLength * 0.25;
    
    const rightWristJoint = createJoint(0.025);
    rightWristGroup.add(rightWristJoint);
    
    const rightHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.1, 0.02),
      boneMaterial
    );
    rightHand.position.y = -0.05;
    rightHand.castShadow = true;
    rightWristGroup.add(rightHand);
    
    rightElbowGroup.add(rightWristGroup);
    rightShoulderGroup.add(rightElbowGroup);
    spineGroup.add(rightShoulderGroup);

    // LEFT LEG
    const leftHipGroup = new THREE.Group();
    jointsRef.current.leftHip = leftHipGroup;
    leftHipGroup.position.set(-limbScales.hipWidth * 0.2, 0, 0);
    
    const leftHipJoint = createJoint(0.04);
    leftHipGroup.add(leftHipJoint);
    
    const leftThigh = createBone(limbScales.thighLength * 0.4, 0.04);
    leftThigh.position.y = -limbScales.thighLength * 0.2;
    leftHipGroup.add(leftThigh);
    
    // Left Knee
    const leftKneeGroup = new THREE.Group();
    jointsRef.current.leftKnee = leftKneeGroup;
    leftKneeGroup.position.y = -limbScales.thighLength * 0.4;
    
    const leftKneeJoint = createJoint(0.035);
    leftKneeGroup.add(leftKneeJoint);
    
    const leftShin = createBone(limbScales.shinLength * 0.35, 0.035);
    leftShin.position.y = -limbScales.shinLength * 0.175;
    leftKneeGroup.add(leftShin);
    
    // Left Ankle
    const leftAnkleGroup = new THREE.Group();
    jointsRef.current.leftAnkle = leftAnkleGroup;
    leftAnkleGroup.position.y = -limbScales.shinLength * 0.35;
    
    const leftAnkleJoint = createJoint(0.03);
    leftAnkleGroup.add(leftAnkleJoint);
    
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.15),
      boneMaterial
    );
    leftFoot.position.set(0, -0.015, 0.05);
    leftFoot.castShadow = true;
    leftAnkleGroup.add(leftFoot);
    
    leftKneeGroup.add(leftAnkleGroup);
    leftHipGroup.add(leftKneeGroup);
    skeleton.add(leftHipGroup);

    // RIGHT LEG (mirror of left)
    const rightHipGroup = new THREE.Group();
    jointsRef.current.rightHip = rightHipGroup;
    rightHipGroup.position.set(limbScales.hipWidth * 0.2, 0, 0);
    
    const rightHipJoint = createJoint(0.04);
    rightHipGroup.add(rightHipJoint);
    
    const rightThigh = createBone(limbScales.thighLength * 0.4, 0.04);
    rightThigh.position.y = -limbScales.thighLength * 0.2;
    rightHipGroup.add(rightThigh);
    
    // Right Knee
    const rightKneeGroup = new THREE.Group();
    jointsRef.current.rightKnee = rightKneeGroup;
    rightKneeGroup.position.y = -limbScales.thighLength * 0.4;
    
    const rightKneeJoint = createJoint(0.035);
    rightKneeGroup.add(rightKneeJoint);
    
    const rightShin = createBone(limbScales.shinLength * 0.35, 0.035);
    rightShin.position.y = -limbScales.shinLength * 0.175;
    rightKneeGroup.add(rightShin);
    
    // Right Ankle
    const rightAnkleGroup = new THREE.Group();
    jointsRef.current.rightAnkle = rightAnkleGroup;
    rightAnkleGroup.position.y = -limbScales.shinLength * 0.35;
    
    const rightAnkleJoint = createJoint(0.03);
    rightAnkleGroup.add(rightAnkleJoint);
    
    const rightFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.15),
      boneMaterial
    );
    rightFoot.position.set(0, -0.015, 0.05);
    rightFoot.castShadow = true;
    rightAnkleGroup.add(rightFoot);
    
    rightKneeGroup.add(rightAnkleGroup);
    rightHipGroup.add(rightKneeGroup);
    skeleton.add(rightHipGroup);

    scene.add(skeleton);
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
    camera.lookAt(0, 0.8, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.8, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    // Create skeleton
    createSkeleton(scene);

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
  }, [limbScales]);

  // Update skeleton pose when joints change
  useEffect(() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    // Neck
    if (jointsRef.current.neck) {
      jointsRef.current.neck.rotation.x = toRad(joints.neckTilt);
      jointsRef.current.neck.rotation.y = toRad(joints.neckRotation);
    }
    
    // Spine
    if (jointsRef.current.spine) {
      jointsRef.current.spine.rotation.x = toRad(joints.spineBend);
      jointsRef.current.spine.rotation.y = toRad(joints.spineRotation);
      jointsRef.current.spine.rotation.z = toRad(joints.spineLean);
    }
    
    // Left Arm
    if (jointsRef.current.leftShoulder) {
      jointsRef.current.leftShoulder.rotation.x = toRad(joints.leftShoulderFlexion);
      jointsRef.current.leftShoulder.rotation.z = toRad(-joints.leftShoulderAbduction);
      jointsRef.current.leftShoulder.rotation.y = toRad(joints.leftShoulderRotation);
    }
    if (jointsRef.current.leftElbow) {
      jointsRef.current.leftElbow.rotation.x = toRad(joints.leftElbowFlexion);
    }
    if (jointsRef.current.leftWrist) {
      jointsRef.current.leftWrist.rotation.x = toRad(joints.leftWristFlexion);
      jointsRef.current.leftWrist.rotation.y = toRad(joints.leftWristRotation);
    }
    
    // Right Arm
    if (jointsRef.current.rightShoulder) {
      jointsRef.current.rightShoulder.rotation.x = toRad(joints.rightShoulderFlexion);
      jointsRef.current.rightShoulder.rotation.z = toRad(joints.rightShoulderAbduction);
      jointsRef.current.rightShoulder.rotation.y = toRad(joints.rightShoulderRotation);
    }
    if (jointsRef.current.rightElbow) {
      jointsRef.current.rightElbow.rotation.x = toRad(joints.rightElbowFlexion);
    }
    if (jointsRef.current.rightWrist) {
      jointsRef.current.rightWrist.rotation.x = toRad(joints.rightWristFlexion);
      jointsRef.current.rightWrist.rotation.y = toRad(joints.rightWristRotation);
    }
    
    // Left Leg
    if (jointsRef.current.leftHip) {
      jointsRef.current.leftHip.rotation.x = toRad(-joints.leftHipFlexion);
      jointsRef.current.leftHip.rotation.z = toRad(-joints.leftHipAbduction);
      jointsRef.current.leftHip.rotation.y = toRad(joints.leftHipRotation);
    }
    if (jointsRef.current.leftKnee) {
      jointsRef.current.leftKnee.rotation.x = toRad(-joints.leftKneeFlexion);
    }
    if (jointsRef.current.leftAnkle) {
      jointsRef.current.leftAnkle.rotation.x = toRad(joints.leftAnkleFlexion);
      jointsRef.current.leftAnkle.rotation.y = toRad(joints.leftAnkleRotation);
    }
    
    // Right Leg
    if (jointsRef.current.rightHip) {
      jointsRef.current.rightHip.rotation.x = toRad(-joints.rightHipFlexion);
      jointsRef.current.rightHip.rotation.z = toRad(joints.rightHipAbduction);
      jointsRef.current.rightHip.rotation.y = toRad(joints.rightHipRotation);
    }
    if (jointsRef.current.rightKnee) {
      jointsRef.current.rightKnee.rotation.x = toRad(-joints.rightKneeFlexion);
    }
    if (jointsRef.current.rightAnkle) {
      jointsRef.current.rightAnkle.rotation.x = toRad(joints.rightAnkleFlexion);
      jointsRef.current.rightAnkle.rotation.y = toRad(joints.rightAnkleRotation);
    }
  }, [joints]);

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
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap max-w-md">
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
        <div className="absolute top-4 right-4">
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
                  label="Neck Flexion/Extension"
                  value={joints.neckTilt}
                  onChange={(v: number) => setJoints({ ...joints, neckTilt: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Neck Rotation"
                  value={joints.neckRotation}
                  onChange={(v: number) => setJoints({ ...joints, neckRotation: v })}
                  min={-90}
                  max={90}
                />
              </CardContent>
            </Card>

            {/* Spine */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Spine</h3>
                <JointSlider
                  label="Spine Flexion/Extension"
                  value={joints.spineBend}
                  onChange={(v: number) => setJoints({ ...joints, spineBend: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Spine Rotation"
                  value={joints.spineRotation}
                  onChange={(v: number) => setJoints({ ...joints, spineRotation: v })}
                  min={-60}
                  max={60}
                />
                <JointSlider
                  label="Spine Lateral Flexion"
                  value={joints.spineLean}
                  onChange={(v: number) => setJoints({ ...joints, spineLean: v })}
                  min={-30}
                  max={30}
                />
              </CardContent>
            </Card>

            {/* Left Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Arm</h3>
                <JointSlider
                  label="Shoulder Flexion/Extension"
                  value={joints.leftShoulderFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderFlexion: v })}
                  min={-60}
                  max={180}
                />
                <JointSlider
                  label="Shoulder Abduction"
                  value={joints.leftShoulderAbduction}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderAbduction: v })}
                  min={0}
                  max={180}
                />
                <JointSlider
                  label="Shoulder Rotation"
                  value={joints.leftShoulderRotation}
                  onChange={(v: number) => setJoints({ ...joints, leftShoulderRotation: v })}
                  min={-90}
                  max={90}
                />
                <JointSlider
                  label="Elbow Flexion"
                  value={joints.leftElbowFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftElbowFlexion: v })}
                  min={0}
                  max={150}
                />
                <JointSlider
                  label="Wrist Flexion/Extension"
                  value={joints.leftWristFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftWristFlexion: v })}
                  min={-70}
                  max={70}
                />
              </CardContent>
            </Card>

            {/* Right Arm */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Right Arm</h3>
                <JointSlider
                  label="Shoulder Flexion/Extension"
                  value={joints.rightShoulderFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderFlexion: v })}
                  min={-60}
                  max={180}
                />
                <JointSlider
                  label="Shoulder Abduction"
                  value={joints.rightShoulderAbduction}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderAbduction: v })}
                  min={0}
                  max={180}
                />
                <JointSlider
                  label="Shoulder Rotation"
                  value={joints.rightShoulderRotation}
                  onChange={(v: number) => setJoints({ ...joints, rightShoulderRotation: v })}
                  min={-90}
                  max={90}
                />
                <JointSlider
                  label="Elbow Flexion"
                  value={joints.rightElbowFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightElbowFlexion: v })}
                  min={0}
                  max={150}
                />
                <JointSlider
                  label="Wrist Flexion/Extension"
                  value={joints.rightWristFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightWristFlexion: v })}
                  min={-70}
                  max={70}
                />
              </CardContent>
            </Card>

            {/* Left Leg */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Left Leg</h3>
                <JointSlider
                  label="Hip Flexion/Extension"
                  value={joints.leftHipFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftHipFlexion: v })}
                  min={-30}
                  max={120}
                />
                <JointSlider
                  label="Hip Abduction"
                  value={joints.leftHipAbduction}
                  onChange={(v: number) => setJoints({ ...joints, leftHipAbduction: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Hip Rotation"
                  value={joints.leftHipRotation}
                  onChange={(v: number) => setJoints({ ...joints, leftHipRotation: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Knee Flexion"
                  value={joints.leftKneeFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftKneeFlexion: v })}
                  min={0}
                  max={135}
                />
                <JointSlider
                  label="Ankle Dorsi/Plantar Flexion"
                  value={joints.leftAnkleFlexion}
                  onChange={(v: number) => setJoints({ ...joints, leftAnkleFlexion: v })}
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
                  label="Hip Flexion/Extension"
                  value={joints.rightHipFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightHipFlexion: v })}
                  min={-30}
                  max={120}
                />
                <JointSlider
                  label="Hip Abduction"
                  value={joints.rightHipAbduction}
                  onChange={(v: number) => setJoints({ ...joints, rightHipAbduction: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Hip Rotation"
                  value={joints.rightHipRotation}
                  onChange={(v: number) => setJoints({ ...joints, rightHipRotation: v })}
                  min={-45}
                  max={45}
                />
                <JointSlider
                  label="Knee Flexion"
                  value={joints.rightKneeFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightKneeFlexion: v })}
                  min={0}
                  max={135}
                />
                <JointSlider
                  label="Ankle Dorsi/Plantar Flexion"
                  value={joints.rightAnkleFlexion}
                  onChange={(v: number) => setJoints({ ...joints, rightAnkleFlexion: v })}
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
                  value={limbScales.upperArmLength}
                  onChange={(v: number) => setLimbScales({ ...limbScales, upperArmLength: v })}
                />
                <LimbScaleSlider
                  label="Forearm Length"
                  value={limbScales.forearmLength}
                  onChange={(v: number) => setLimbScales({ ...limbScales, forearmLength: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Leg Proportions</h3>
                <LimbScaleSlider
                  label="Thigh Length"
                  value={limbScales.thighLength}
                  onChange={(v: number) => setLimbScales({ ...limbScales, thighLength: v })}
                />
                <LimbScaleSlider
                  label="Shin Length"
                  value={limbScales.shinLength}
                  onChange={(v: number) => setLimbScales({ ...limbScales, shinLength: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-semibold">Body Proportions</h3>
                <LimbScaleSlider
                  label="Spine Height"
                  value={limbScales.spineHeight}
                  onChange={(v: number) => setLimbScales({ ...limbScales, spineHeight: v })}
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