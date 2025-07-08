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
  const [currentFrame, setCurrentFrame] = useState(0);

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

  useEffect(() => {
    if (!mountRef.current || !animationSequences || animationSequences.length === 0) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2937);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      canvas: undefined
    });
    renderer.setSize(256, 256);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clear and append renderer
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Create lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x3b82f6, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create skeleton group
    const skeletonGroup = new THREE.Group();
    skeletonRef.current = skeletonGroup;
    scene.add(skeletonGroup);

    // Create initial skeleton from first frame
    if (animationSequences.length > 0) {
      createSkeletonMesh(animationSequences[0], skeletonGroup);
    }

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (isPlaying && animationSequences.length > 0) {
        // Update skeleton based on current frame
        const frameIndex = Math.floor(currentFrame) % animationSequences.length;
        updateSkeletonFrame(animationSequences[frameIndex], skeletonGroup);
        setCurrentFrame(prev => (prev + 0.5) % animationSequences.length);
      }

      // Rotate skeleton for better viewing
      if (skeletonGroup) {
        skeletonGroup.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };

    animate();

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
  }, [animationSequences, isPlaying]);

  const createSkeletonMesh = (frame: AnimationFrame, skeletonGroup: THREE.Group) => {
    // Clear existing skeleton
    while (skeletonGroup.children.length > 0) {
      skeletonGroup.remove(skeletonGroup.children[0]);
    }

    // Create joint spheres
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0x60a5fa });
    const problemJointMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444 });
    
    frame.keyframes.forEach(keyframe => {
      const isProblematic = movementHeatmap?.find(
        joint => joint.jointName === keyframe.boneName && joint.problemAreas
      );

      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = isProblematic ? problemJointMaterial : jointMaterial;
      const joint = new THREE.Mesh(geometry, material);

      // Position joint
      joint.position.set(
        (keyframe.position[0] - 0.5) * 2, // Normalize and scale
        -(keyframe.position[1] - 0.5) * 2, // Flip Y and normalize
        keyframe.position[2] || 0
      );

      joint.name = keyframe.boneName;
      skeletonGroup.add(joint);
    });

    // Create bone connections
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    
    boneConnections.forEach(([bone1, bone2]) => {
      const joint1 = frame.keyframes.find(kf => kf.boneName === bone1);
      const joint2 = frame.keyframes.find(kf => kf.boneName === bone2);

      if (joint1 && joint2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(
            (joint1.position[0] - 0.5) * 2,
            -(joint1.position[1] - 0.5) * 2,
            joint1.position[2] || 0
          ),
          new THREE.Vector3(
            (joint2.position[0] - 0.5) * 2,
            -(joint2.position[1] - 0.5) * 2,
            joint2.position[2] || 0
          )
        ]);

        const line = new THREE.Line(geometry, boneMaterial);
        skeletonGroup.add(line);
      }
    });
  };

  const updateSkeletonFrame = (frame: AnimationFrame, skeletonGroup: THREE.Group) => {
    // Update joint positions
    frame.keyframes.forEach(keyframe => {
      const joint = skeletonGroup.children.find(
        child => child.name === keyframe.boneName
      ) as THREE.Mesh;

      if (joint) {
        joint.position.set(
          (keyframe.position[0] - 0.5) * 2,
          -(keyframe.position[1] - 0.5) * 2,
          keyframe.position[2] || 0
        );

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
    const lines = skeletonGroup.children.filter(child => child instanceof THREE.Line) as THREE.Line[];
    lines.forEach(line => skeletonGroup.remove(line));

    // Recreate bone connections with updated positions
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    
    boneConnections.forEach(([bone1, bone2]) => {
      const joint1 = frame.keyframes.find(kf => kf.boneName === bone1);
      const joint2 = frame.keyframes.find(kf => kf.boneName === bone2);

      if (joint1 && joint2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(
            (joint1.position[0] - 0.5) * 2,
            -(joint1.position[1] - 0.5) * 2,
            joint1.position[2] || 0
          ),
          new THREE.Vector3(
            (joint2.position[0] - 0.5) * 2,
            -(joint2.position[1] - 0.5) * 2,
            joint2.position[2] || 0
          )
        ]);

        const line = new THREE.Line(geometry, boneMaterial);
        skeletonGroup.add(line);
      }
    });
  };

  return (
    <div ref={mountRef} className={className} style={{ 
      background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' 
    }}>
      {/* Loading state */}
      {(!animationSequences || animationSequences.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Generating 3D Skeleton...
          </div>
        </div>
      )}

      {/* Frame counter */}
      {animationSequences && animationSequences.length > 0 && (
        <div className="absolute top-2 left-2 text-xs text-cyan-400 bg-black/50 px-2 py-1 rounded">
          Frame {Math.floor(currentFrame) + 1}/{animationSequences.length}
        </div>
      )}

      {/* Play status indicator */}
      <div className="absolute top-2 right-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
        {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
      </div>
    </div>
  );
};

export default ThreeDSkeletonPlayer;