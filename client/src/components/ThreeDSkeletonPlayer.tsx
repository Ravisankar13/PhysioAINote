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

  useEffect(() => {
    console.log('ThreeDSkeletonPlayer useEffect called with:', {
      mountRef: !!mountRef.current,
      animationSequences: animationSequences?.length || 0,
      movementHeatmap: movementHeatmap?.length || 0
    });
    
    if (!mountRef.current) {
      console.log('No mount ref');
      return;
    }

    // If no animation sequences, create a test skeleton
    if (!animationSequences || animationSequences.length === 0) {
      console.log('Creating test skeleton');
      createTestSkeleton();
      return;
    }

    console.log('Initializing Three.js scene for real skeleton data');

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
    renderer.setSize(256, 256);
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

    // Create initial skeleton from first frame
    if (animationSequences.length > 0) {
      console.log('Creating skeleton from first frame:', animationSequences[0]);
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
        skeletonGroup.rotation.y += 0.01;
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
    console.log('Creating skeleton mesh with frame:', frame);
    console.log('First few keyframes positions:', frame.keyframes.slice(0, 3).map(kf => ({ 
      name: kf.boneName, 
      pos: kf.position 
    })));
    
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

      const geometry = new THREE.SphereGeometry(0.08, 8, 8); // Slightly larger for visibility
      const material = isProblematic ? problemJointMaterial : jointMaterial;
      const joint = new THREE.Mesh(geometry, material);

      // Position joint using normalized coordinates
      const pos = normalizePosition(keyframe.position[0], keyframe.position[1], keyframe.position[2]);
      joint.position.set(pos.x, pos.y, pos.z);

      joint.name = keyframe.boneName;
      skeletonGroup.add(joint);
      
      console.log(`Joint ${keyframe.boneName}: raw(${keyframe.position[0]}, ${keyframe.position[1]}) -> normalized(${pos.x}, ${pos.y})`);
    });

    // Create bone connections
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 });
    
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
      }
    });

    console.log(`Created skeleton with ${skeletonGroup.children.length} elements`);
  };

  const updateSkeletonFrame = (frame: AnimationFrame, skeletonGroup: THREE.Group) => {
    // Update joint positions
    frame.keyframes.forEach(keyframe => {
      const joint = skeletonGroup.children.find(
        child => child.name === keyframe.boneName
      ) as THREE.Mesh;

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
    const lines = skeletonGroup.children.filter(child => child instanceof THREE.Line) as THREE.Line[];
    lines.forEach(line => skeletonGroup.remove(line));

    // Recreate bone connections with updated positions
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 });
    
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
      }
    });
  };

  const createTestSkeleton = () => {
    if (!mountRef.current) return;

    // Initialize Three.js scene for test
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2937);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(256, 256);
    
    // Clear and append renderer
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Create basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x3b82f6, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create a simple test skeleton
    const testGroup = new THREE.Group();
    
    // Create joint spheres in basic human pose
    const jointPositions = [
      { name: 'head', pos: [0, 1.6, 0] },
      { name: 'neck', pos: [0, 1.4, 0] },
      { name: 'leftShoulder', pos: [-0.4, 1.2, 0] },
      { name: 'rightShoulder', pos: [0.4, 1.2, 0] },
      { name: 'leftElbow', pos: [-0.6, 0.8, 0] },
      { name: 'rightElbow', pos: [0.6, 0.8, 0] },
      { name: 'spine', pos: [0, 0.8, 0] },
      { name: 'leftHip', pos: [-0.2, 0.0, 0] },
      { name: 'rightHip', pos: [0.2, 0.0, 0] },
      { name: 'leftKnee', pos: [-0.2, -0.6, 0] },
      { name: 'rightKnee', pos: [0.2, -0.6, 0] },
      { name: 'leftAnkle', pos: [-0.2, -1.2, 0] },
      { name: 'rightAnkle', pos: [0.2, -1.2, 0] }
    ];

    // Create joints
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0x60a5fa });
    jointPositions.forEach(joint => {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const mesh = new THREE.Mesh(geometry, jointMaterial);
      mesh.position.set(joint.pos[0], joint.pos[1], joint.pos[2]);
      testGroup.add(mesh);
    });

    // Create bones
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    const connections = [
      ['head', 'neck'], ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
      ['leftShoulder', 'leftElbow'], ['rightShoulder', 'rightElbow'],
      ['neck', 'spine'], ['spine', 'leftHip'], ['spine', 'rightHip'],
      ['leftHip', 'rightHip'], ['leftHip', 'leftKnee'], ['rightHip', 'rightKnee'],
      ['leftKnee', 'leftAnkle'], ['rightKnee', 'rightAnkle']
    ];

    connections.forEach(([start, end]) => {
      const startJoint = jointPositions.find(j => j.name === start);
      const endJoint = jointPositions.find(j => j.name === end);
      if (startJoint && endJoint) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...startJoint.pos),
          new THREE.Vector3(...endJoint.pos)
        ]);
        const line = new THREE.Line(geometry, boneMaterial);
        testGroup.add(line);
      }
    });

    scene.add(testGroup);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      testGroup.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    console.log('Test skeleton created and animating');
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
            <div>Generating 3D Skeleton...</div>
            <div className="text-xs text-gray-400 mt-1">
              Data: {animationSequences?.length || 0} frames
            </div>
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