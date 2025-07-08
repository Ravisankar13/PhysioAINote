import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface AnimationFrame {
  timestamp: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
}

interface AIAnimationPlayerProps {
  animationFrames: AnimationFrame[];
  isPlaying: boolean;
  className?: string;
  onPlayPauseToggle?: () => void;
}

const AIAnimationPlayer: React.FC<AIAnimationPlayerProps> = ({
  animationFrames,
  isPlaying,
  className,
  onPlayPauseToggle
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const skeletonRef = useRef<THREE.Group>();
  const animationRef = useRef<number>();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Bone connections for human skeleton (MediaPipe pose landmarks)
  const boneConnections = [
    // Head to shoulders
    [0, 1], [0, 4], // nose to left/right eye inner
    [1, 2], [2, 3], // left eye
    [4, 5], [5, 6], // right eye
    [0, 11], [0, 12], // nose to shoulders
    
    // Torso
    [11, 12], // shoulders
    [11, 23], [12, 24], // shoulders to hips
    [23, 24], // hips
    
    // Arms
    [11, 13], [13, 15], // left arm
    [12, 14], [14, 16], // right arm
    [15, 17], [15, 19], [15, 21], // left hand
    [16, 18], [16, 20], [16, 22], // right hand
    
    // Legs
    [23, 25], [25, 27], [27, 29], [29, 31], // left leg
    [24, 26], [26, 28], [28, 30], [30, 32], // right leg
  ];

  useEffect(() => {
    if (!mountRef.current || !animationFrames?.length) return;

    const initScene = () => {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      
      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current!.clientWidth / mountRef.current!.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 1, 3);
      camera.lookAt(0, 1, 0);
      
      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current!.appendChild(renderer.domElement);
      
      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Ground plane
      const groundGeometry = new THREE.PlaneGeometry(10, 10);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.1;
      ground.receiveShadow = true;
      scene.add(ground);
      
      // Skeleton group
      const skeletonGroup = new THREE.Group();
      scene.add(skeletonGroup);
      
      // Store references
      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      skeletonRef.current = skeletonGroup;
      
      setIsInitialized(true);
    };

    initScene();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      setIsInitialized(false);
    };
  }, [animationFrames]);

  useEffect(() => {
    if (!isInitialized || !animationFrames?.length) return;

    const animate = () => {
      if (!isPlaying) return;

      const frameIndex = currentFrame % animationFrames.length;
      const frame = animationFrames[frameIndex];

      // Clear previous skeleton
      if (skeletonRef.current) {
        skeletonRef.current.clear();
      }

      // Draw joints
      frame.landmarks.forEach((landmark, index) => {
        if (landmark.visibility > 0.5) {
          const geometry = new THREE.SphereGeometry(0.02, 8, 8);
          const material = new THREE.MeshBasicMaterial({ 
            color: landmark.visibility > 0.8 ? 0x00ff00 : 0xffff00 
          });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(landmark.x, landmark.y, landmark.z);
          skeletonRef.current!.add(sphere);
        }
      });

      // Draw bones
      boneConnections.forEach(([startIdx, endIdx]) => {
        const start = frame.landmarks[startIdx];
        const end = frame.landmarks[endIdx];
        
        if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(start.x, start.y, start.z),
            new THREE.Vector3(end.x, end.y, end.z)
          ]);
          const material = new THREE.LineBasicMaterial({ 
            color: 0x00aaff,
            linewidth: 2
          });
          const line = new THREE.Line(geometry, material);
          skeletonRef.current!.add(line);
        }
      });

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Update frame
      setCurrentFrame(prev => (prev + 1) % animationFrames.length);

      // Continue animation
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, 100); // ~10 FPS for smooth viewing
        });
      }
    };

    if (isPlaying) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentFrame, animationFrames, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!animationFrames?.length) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <div className="text-gray-400">No animation data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPlayPauseToggle}
          className="bg-black/20 text-white border-white/20"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        
        <div className="bg-black/20 text-white px-2 py-1 rounded text-xs">
          Frame: {currentFrame + 1}/{animationFrames.length}
        </div>
      </div>
    </div>
  );
};

export default AIAnimationPlayer;