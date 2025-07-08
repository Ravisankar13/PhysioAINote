import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  Activity,
  RotateCcw
} from 'lucide-react';

interface SimplifiedSkeletonProps {
  animationSequences: any[];
  movementHeatmap?: any[];
  isPlaying: boolean;
  playbackTime: number;
  className?: string;
}

// Enhanced skeleton structure with anatomical connections
const SKELETON_CONNECTIONS = [
  // Head and neck
  [0, 1], [1, 2], [2, 3], [3, 7],
  // Left arm
  [7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  // Right arm  
  [8, 10], [10, 12], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  // Torso
  [7, 8], [9, 10],
  // Left leg
  [9, 23], [23, 25], [25, 27], [27, 29], [27, 31],
  // Right leg
  [10, 24], [24, 26], [26, 28], [28, 30], [28, 32]
];

function SkeletonMesh({ landmarks, frameIndex }: { landmarks: any[], frameIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [joints] = useState(() => {
    const jointGeometry = new THREE.SphereGeometry(0.015, 8, 6);
    const jointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    return landmarks.map(() => new THREE.Mesh(jointGeometry, jointMaterial));
  });

  const [bones] = useState(() => {
    const boneGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 6);
    const boneMaterial = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    return SKELETON_CONNECTIONS.map(() => new THREE.Mesh(boneGeometry, boneMaterial));
  });

  useEffect(() => {
    if (!groupRef.current || !landmarks?.length) return;

    // Clear previous meshes
    groupRef.current.clear();

    // Position joints
    joints.forEach((joint, index) => {
      if (landmarks[index]) {
        const pos = landmarks[index];
        joint.position.set(
          (pos.x - 0.5) * 2,
          -(pos.y - 0.5) * 2,
          pos.z * 0.5
        );
        joint.visible = pos.visibility > 0.5;
        groupRef.current!.add(joint);
      }
    });

    // Create bones between connected joints
    bones.forEach((bone, index) => {
      const connection = SKELETON_CONNECTIONS[index];
      const startLandmark = landmarks[connection[0]];
      const endLandmark = landmarks[connection[1]];

      if (startLandmark && endLandmark && 
          startLandmark.visibility > 0.5 && endLandmark.visibility > 0.5) {
        
        const start = new THREE.Vector3(
          (startLandmark.x - 0.5) * 2,
          -(startLandmark.y - 0.5) * 2,
          startLandmark.z * 0.5
        );
        const end = new THREE.Vector3(
          (endLandmark.x - 0.5) * 2,
          -(endLandmark.y - 0.5) * 2,
          endLandmark.z * 0.5
        );

        const distance = start.distanceTo(end);
        const midpoint = start.clone().add(end).multiplyScalar(0.5);

        bone.position.copy(midpoint);
        bone.scale.y = distance;
        bone.lookAt(end);
        bone.rotateX(Math.PI / 2);
        bone.visible = true;
        
        groupRef.current!.add(bone);
      } else {
        bone.visible = false;
      }
    });
  }, [landmarks, joints, bones]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005; // Gentle rotation
    }
  });

  return <group ref={groupRef} />;
}

export default function SimplifiedInteractiveSkeleton({
  animationSequences,
  movementHeatmap = [],
  isPlaying,
  playbackTime,
  className = ""
}: SimplifiedSkeletonProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('SimplifiedInteractiveSkeleton received:', { 
      animationSequences: animationSequences?.length,
      firstFrame: animationSequences?.[0]
    });
  }, [animationSequences]);

  useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (!localIsPlaying || !animationSequences?.length) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => 
        prev >= animationSequences.length - 1 ? 0 : prev + 1
      );
    }, 100); // 10 FPS for smooth playback

    return () => clearInterval(interval);
  }, [localIsPlaying, animationSequences]);

  const currentLandmarks = animationSequences?.[currentFrame]?.landmarks || [];

  if (hasError) {
    return (
      <div className={`relative w-full h-full ${className} flex items-center justify-center bg-gray-800`}>
        <div className="text-center text-white">
          <Activity className="h-12 w-12 mx-auto mb-4" />
          <p>Loading enhanced skeleton...</p>
        </div>
      </div>
    );
  }

  if (!animationSequences?.length) {
    return (
      <div className={`relative w-full h-full ${className} flex items-center justify-center bg-gray-800`}>
        <div className="text-center text-white">
          <Activity className="h-12 w-12 mx-auto mb-4" />
          <p>No motion data available</p>
        </div>
      </div>
    );
  }

  const handlePlay = () => setLocalIsPlaying(true);
  const handlePause = () => setLocalIsPlaying(false);
  const handleReset = () => {
    setCurrentFrame(0);
    setLocalIsPlaying(false);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Enhanced 3D Canvas */}
      <Canvas
        camera={{ position: [2, 1, 2], fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={0.8} />
        <pointLight position={[-2, -2, -2]} intensity={0.4} />
        
        <Suspense fallback={<mesh><boxGeometry args={[0.1, 0.1, 0.1]} /><meshBasicMaterial color="white" /></mesh>}>
          <SkeletonMesh landmarks={currentLandmarks} frameIndex={currentFrame} />
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={5}
          minDistance={1}
        />
      </Canvas>

      {/* Control Panel */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/70 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={localIsPlaying ? handlePause : handlePlay}
            className="text-white hover:bg-white/20"
          >
            {localIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-white hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-white text-sm">
          <Activity className="h-4 w-4" />
          <span>Frame {currentFrame + 1} / {animationSequences?.length || 0}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-white border-white/30">
            Enhanced Skeleton
          </Badge>
          {localIsPlaying && (
            <Badge className="bg-green-600">
              Playing
            </Badge>
          )}
        </div>
      </div>

      {/* Status Info */}
      <div className="absolute top-4 right-4 bg-black/70 rounded-lg px-3 py-2">
        <div className="text-white text-sm">
          <div>Motion Capture Data</div>
          <div className="text-green-400">{animationSequences?.length || 0} frames</div>
        </div>
      </div>
    </div>
  );
}