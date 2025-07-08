import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface AnimationFrame {
  timestamp: number;
  keyframes: Array<{
    boneName: string;
    position: number[];
    rotation: number[];
  }>;
}

interface MovementHeatmapJoint {
  jointName: string;
  intensity: number;
  problemAreas: boolean;
}

interface ThreeDSkeletonPlayerProps {
  animationSequences: AnimationFrame[];
  movementHeatmap: MovementHeatmapJoint[];
  isPlaying: boolean;
  playbackTime: number;
  className?: string;
}

const ThreeDSkeletonPlayer: React.FC<ThreeDSkeletonPlayerProps> = ({
  animationSequences,
  movementHeatmap,
  isPlaying,
  playbackTime,
  className
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const skeletonRef = useRef<THREE.Group>();
  const animationRef = useRef<number>();
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(0.5); // Slower animation for smooth motion

  // Bone structure for human skeleton
  const boneConnections = [
    // Head to neck
    ['head', 'neck'],
    // Arms
    ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
    ['leftShoulder', 'leftElbow'], ['rightShoulder', 'rightElbow'],
    ['leftElbow', 'leftWrist'], ['rightElbow', 'rightWrist'],
    // Torso
    ['neck', 'spine'],
    ['spine', 'leftHip'], ['spine', 'rightHip'],
    ['leftHip', 'rightHip'],
    // Legs
    ['leftHip', 'leftKnee'], ['rightHip', 'rightKnee'],
    ['leftKnee', 'leftAnkle'], ['rightKnee', 'rightAnkle']
  ];

  // Joint meshes and bone lines storage
  const jointsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const bonesRef = useRef<THREE.Line[]>([]);

  // Helper function to normalize pixel coordinates to 3D space
  const normalizePosition = (x: number, y: number, z: number = 0) => {
    // Assume camera dimensions of 1280x720 based on console logs
    const normalizedX = (x / 1280) - 0.5; // -0.5 to 0.5
    const normalizedY = (y / 720) - 0.5;  // -0.5 to 0.5
    
    return {
      x: normalizedX * 4, // Scale for visibility
      y: -normalizedY * 4, // Flip Y axis for proper orientation
      z: z * 0.1 || 0 // Small Z depth
    };
  };

  // Interpolate between two positions for smooth animation
  const interpolatePosition = (pos1: number[], pos2: number[], t: number): number[] => {
    return [
      pos1[0] + (pos2[0] - pos1[0]) * t,
      pos1[1] + (pos2[1] - pos1[1]) * t,
      pos1[2] + (pos2[2] - pos1[2]) * t
    ];
  };

  // Get interpolated frame between two animation frames
  const getInterpolatedFrame = (frame1: AnimationFrame, frame2: AnimationFrame, t: number): AnimationFrame => {
    const interpolatedKeyframes = frame1.keyframes.map(kf1 => {
      const kf2 = frame2.keyframes.find(kf => kf.boneName === kf1.boneName);
      if (!kf2) return kf1;

      return {
        boneName: kf1.boneName,
        position: interpolatePosition(kf1.position, kf2.position, t),
        rotation: interpolatePosition(kf1.rotation, kf2.rotation, t)
      };
    });

    return {
      timestamp: frame1.timestamp + (frame2.timestamp - frame1.timestamp) * t,
      keyframes: interpolatedKeyframes
    };
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !animationSequences || animationSequences.length === 0) {
      console.log('No mount ref or animation sequences');
      return;
    }

    console.log('Initializing animated 3D skeleton with', animationSequences.length, 'frames');

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2937);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true
    });
    renderer.setSize(400, 400); // Larger size for better visibility
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clear and append renderer
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Create lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x3b82f6, 1.0);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // Create skeleton joints and bones
    createSkeletonStructure(skeletonGroup);

    // Start animation loop
    startAnimationLoop();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [animationSequences, isPlaying, playbackTime]);

  // Create skeleton structure with joints and bones
  const createSkeletonStructure = (skeletonGroup: THREE.Group) => {
    // Clear existing skeleton
    while (skeletonGroup.children.length > 0) {
      skeletonGroup.remove(skeletonGroup.children[0]);
    }
    jointsRef.current.clear();
    bonesRef.current = [];

    if (!animationSequences || animationSequences.length === 0) return;

    // Create joint materials
    const normalJointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x60a5fa,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });
    const problemJointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xef4444,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });

    // Create joints from first frame
    const firstFrame = animationSequences[0];
    firstFrame.keyframes.forEach(keyframe => {
      const isProblematic = movementHeatmap?.find(
        joint => joint.jointName === keyframe.boneName && joint.problemAreas
      );

      const geometry = new THREE.SphereGeometry(0.08, 12, 12);
      const material = isProblematic ? problemJointMaterial : normalJointMaterial;
      const joint = new THREE.Mesh(geometry, material);
      
      joint.castShadow = true;
      joint.receiveShadow = true;
      joint.name = keyframe.boneName;

      // Position joint
      const pos = normalizePosition(keyframe.position[0], keyframe.position[1], keyframe.position[2]);
      joint.position.set(pos.x, pos.y, pos.z);

      skeletonGroup.add(joint);
      jointsRef.current.set(keyframe.boneName, joint);
    });

    // Create bone connections
    createBoneConnections(skeletonGroup, firstFrame);

    console.log(`Created animated skeleton with ${jointsRef.current.size} joints and ${bonesRef.current.length} bones`);
  };

  // Create bone connections between joints
  const createBoneConnections = (skeletonGroup: THREE.Group, frame: AnimationFrame) => {
    // Remove existing bones
    bonesRef.current.forEach(bone => skeletonGroup.remove(bone));
    bonesRef.current = [];

    const boneMaterial = new THREE.LineBasicMaterial({ 
      color: 0x3b82f6, 
      linewidth: 4,
      transparent: true,
      opacity: 0.8
    });

    boneConnections.forEach(([bone1, bone2]) => {
      const joint1 = frame.keyframes.find(kf => kf.boneName === bone1);
      const joint2 = frame.keyframes.find(kf => kf.boneName === bone2);

      if (joint1 && joint2) {
        const pos1 = normalizePosition(joint1.position[0], joint1.position[1], joint1.position[2]);
        const pos2 = normalizePosition(joint2.position[0], joint2.position[1], joint2.position[2]);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pos1.x, pos1.y, pos1.z),
          new THREE.Vector3(pos2.x, pos2.y, pos2.z)
        ]);

        const line = new THREE.Line(geometry, boneMaterial);
        skeletonGroup.add(line);
        bonesRef.current.push(line);
      }
    });
  };

  // Start the animation loop
  const startAnimationLoop = () => {
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Always update skeleton position (for both playing and manual scrubbing)
      if (animationSequences.length > 0) {
        updateSkeletonAnimation();
      }

      // Gentle rotation for better viewing
      if (skeletonRef.current) {
        skeletonRef.current.rotation.y += 0.005;
      }

      // Render the scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    // Start the clock when animation begins
    clockRef.current.start();
    animate();
  };

  // Update skeleton with smooth animation
  const updateSkeletonAnimation = () => {
    if (!animationSequences || animationSequences.length === 0) return;

    let newFrame;
    if (isPlaying) {
      // When playing, advance automatically using frame rate (30 FPS)
      const delta = clockRef.current.getDelta();
      newFrame = currentFrame + (delta * 30 * animationSpeed); // 30 FPS * speed multiplier
    } else {
      // When not playing, use the playbackTime prop for manual scrubbing
      newFrame = playbackTime;
    }
    
    // Loop animation
    const loopedFrame = newFrame % animationSequences.length;
    setCurrentFrame(loopedFrame);

    // Get current and next frame indices
    const currentIndex = Math.floor(loopedFrame);
    const nextIndex = (currentIndex + 1) % animationSequences.length;
    const interpolationFactor = loopedFrame - currentIndex;

    // Get interpolated frame
    const interpolatedFrame = getInterpolatedFrame(
      animationSequences[currentIndex],
      animationSequences[nextIndex],
      interpolationFactor
    );

    // Update joint positions
    interpolatedFrame.keyframes.forEach(keyframe => {
      const joint = jointsRef.current.get(keyframe.boneName);
      if (joint) {
        const pos = normalizePosition(keyframe.position[0], keyframe.position[1], keyframe.position[2]);
        joint.position.set(pos.x, pos.y, pos.z);

        // Apply rotation
        if (keyframe.rotation) {
          joint.rotation.set(
            keyframe.rotation[0] || 0,
            keyframe.rotation[1] || 0,
            keyframe.rotation[2] || 0
          );
        }
      }
    });

    // Update bone connections
    if (skeletonRef.current) {
      createBoneConnections(skeletonRef.current, interpolatedFrame);
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      <div 
        ref={mountRef} 
        className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Animation Info Overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {animationSequences?.length > 0 
          ? `Frame: ${Math.floor(currentFrame) + 1}/${animationSequences.length}`
          : 'Loading...'}
      </div>
      
      {/* Playing Indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Playing
        </div>
      )}
    </div>
  );
};

export default ThreeDSkeletonPlayer;