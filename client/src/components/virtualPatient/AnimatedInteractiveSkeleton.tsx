import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Activity,
  Settings,
  Zap,
  Camera,
  Blend
} from 'lucide-react';

interface AnimationFrame {
  timestamp: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
}

interface AnimationSequence {
  frames: AnimationFrame[];
  duration: number;
  metadata: {
    source: "ai-generated" | "motion-capture" | "hybrid";
    confidence: number;
    generatedAt: Date;
    lastUpdated: Date;
  };
}

interface BodyRegion {
  name: string;
  displayName: string;
  landmarkIndices: number[];
  color: string;
}

interface AnimatedInteractiveSkeletonProps {
  animationSequence: AnimationSequence | null;
  onRegionSelect?: (region: string, displayName: string) => void;
  selectedRegion?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  height?: string;
}

const bodyRegions: BodyRegion[] = [
  { name: 'head', displayName: 'Head & Neck', landmarkIndices: [0, 1, 2, 3, 4], color: '#ef4444' },
  { name: 'shoulder_left', displayName: 'Left Shoulder', landmarkIndices: [11], color: '#f97316' },
  { name: 'shoulder_right', displayName: 'Right Shoulder', landmarkIndices: [12], color: '#f97316' },
  { name: 'elbow_left', displayName: 'Left Elbow', landmarkIndices: [13], color: '#06b6d4' },
  { name: 'elbow_right', displayName: 'Right Elbow', landmarkIndices: [14], color: '#06b6d4' },
  { name: 'wrist_left', displayName: 'Left Wrist & Hand', landmarkIndices: [15, 17, 19, 21], color: '#3b82f6' },
  { name: 'wrist_right', displayName: 'Right Wrist & Hand', landmarkIndices: [16, 18, 20, 22], color: '#3b82f6' },
  { name: 'hip_left', displayName: 'Left Hip', landmarkIndices: [23], color: '#8b5cf6' },
  { name: 'hip_right', displayName: 'Right Hip', landmarkIndices: [24], color: '#8b5cf6' },
  { name: 'knee_left', displayName: 'Left Knee', landmarkIndices: [25], color: '#ec4899' },
  { name: 'knee_right', displayName: 'Right Knee', landmarkIndices: [26], color: '#ec4899' },
  { name: 'ankle_left', displayName: 'Left Ankle & Foot', landmarkIndices: [27, 29, 31], color: '#f43f5e' },
  { name: 'ankle_right', displayName: 'Right Ankle & Foot', landmarkIndices: [28, 30, 32], color: '#f43f5e' },
];

function AnimatedSkeletonModel({ 
  animationSequence, 
  currentFrame, 
  onRegionSelect, 
  selectedRegion 
}: {
  animationSequence: AnimationSequence | null;
  currentFrame: number;
  onRegionSelect?: (region: string, displayName: string) => void;
  selectedRegion?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Get current frame data
  const getCurrentLandmarks = () => {
    if (!animationSequence?.frames || animationSequence.frames.length === 0) {
      return null;
    }
    
    const frameIndex = Math.min(currentFrame, animationSequence.frames.length - 1);
    return animationSequence.frames[frameIndex]?.landmarks;
  };

  const handleRegionClick = (region: BodyRegion) => {
    if (onRegionSelect) {
      onRegionSelect(region.name, region.displayName);
    }
  };

  const landmarks = getCurrentLandmarks();

  if (!landmarks) {
    // Fallback static skeleton
    return (
      <group ref={groupRef}>
        {bodyRegions.map((region, index) => {
          const isSelected = selectedRegion === region.name;
          const isHovered = hoveredRegion === region.name;
          const scale = isSelected ? 1.5 : isHovered ? 1.2 : 1.0;
          const opacity = isSelected ? 0.9 : isHovered ? 0.8 : 0.6;

          // Default positions for fallback
          const defaultY = 1.6 - (index * 0.2);
          const defaultX = (index % 2 === 0) ? -0.2 : 0.2;

          return (
            <mesh
              key={region.name}
              position={[defaultX, defaultY, 0]}
              scale={[scale, scale, scale]}
              onClick={() => handleRegionClick(region)}
              onPointerEnter={() => setHoveredRegion(region.name)}
              onPointerLeave={() => setHoveredRegion(null)}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial
                color={region.color}
                transparent
                opacity={opacity}
                emissive={isSelected ? region.color : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Animated landmark spheres */}
      {bodyRegions.map((region) => {
        const isSelected = selectedRegion === region.name;
        const isHovered = hoveredRegion === region.name;
        const scale = isSelected ? 1.5 : isHovered ? 1.2 : 1.0;
        const opacity = isSelected ? 0.9 : isHovered ? 0.8 : 0.6;

        // Get primary landmark for this region
        const primaryLandmarkIndex = region.landmarkIndices[0];
        const landmark = landmarks[primaryLandmarkIndex];

        if (!landmark || landmark.visibility < 0.3) {
          return null;
        }

        return (
          <mesh
            key={region.name}
            position={[landmark.x, landmark.y, landmark.z]}
            scale={[scale, scale, scale]}
            onClick={() => handleRegionClick(region)}
            onPointerEnter={() => setHoveredRegion(region.name)}
            onPointerLeave={() => setHoveredRegion(null)}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={region.color}
              transparent
              opacity={opacity * landmark.visibility}
              emissive={isSelected ? region.color : '#000000'}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          </mesh>
        );
      })}

      {/* Connecting lines for skeleton structure */}
      <SkeletonConnections landmarks={landmarks} />
    </group>
  );
}

function SkeletonConnections({ landmarks }: { landmarks: Array<{ x: number; y: number; z: number; visibility: number }> }) {
  // Define bone connections (parent-child relationships)
  const connections = [
    // Spine and core
    [11, 12], // Left shoulder to right shoulder
    [11, 23], // Left shoulder to left hip
    [12, 24], // Right shoulder to right hip
    [23, 24], // Left hip to right hip
    
    // Arms
    [11, 13], // Left shoulder to left elbow
    [13, 15], // Left elbow to left wrist
    [12, 14], // Right shoulder to right elbow
    [14, 16], // Right elbow to right wrist
    
    // Legs
    [23, 25], // Left hip to left knee
    [25, 27], // Left knee to left ankle
    [24, 26], // Right hip to right knee
    [26, 28], // Right knee to right ankle
  ];

  return (
    <group>
      {connections.map(([startIdx, endIdx], index) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (!start || !end || start.visibility < 0.5 || end.visibility < 0.5) {
          return null;
        }

        const startPos = new THREE.Vector3(start.x, start.y, start.z);
        const endPos = new THREE.Vector3(end.x, end.y, end.z);
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const distance = direction.length();
        const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);

        // Create rotation to align cylinder with the connection
        const orientation = new THREE.Matrix4().lookAt(startPos, endPos, new THREE.Vector3(0, 1, 0));
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

        return (
          <mesh
            key={`connection-${index}`}
            position={[midpoint.x, midpoint.y, midpoint.z]}
            quaternion={quaternion}
          >
            <cylinderGeometry args={[0.02, 0.02, distance]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function AnimatedInteractiveSkeleton({
  animationSequence,
  onRegionSelect,
  selectedRegion,
  autoPlay = false,
  showControls = true,
  height = "h-96"
}: AnimatedInteractiveSkeletonProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([2, 1, 2]);
  const animationRef = useRef<number>();

  // Animation playback logic
  useEffect(() => {
    if (!isPlaying || !animationSequence?.frames) {
      return;
    }

    const animate = () => {
      setCurrentFrame(prevFrame => {
        const nextFrame = prevFrame + playbackSpeed;
        if (nextFrame >= animationSequence.frames.length) {
          return 0; // Loop back to start
        }
        return Math.floor(nextFrame);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, animationSequence]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleFrameSeek = (value: number[]) => {
    setCurrentFrame(value[0]);
  };

  const resetView = () => {
    setCameraPosition([2, 1, 2]);
  };

  const getSelectedRegionInfo = () => {
    if (!selectedRegion) return null;
    return bodyRegions.find(r => r.name === selectedRegion);
  };

  const selectedInfo = getSelectedRegionInfo();
  const maxFrames = animationSequence?.frames.length || 1;
  const currentTime = animationSequence?.frames[currentFrame]?.timestamp || 0;
  const totalDuration = animationSequence?.duration || 0;

  const getSourceIcon = () => {
    switch (animationSequence?.metadata.source) {
      case "ai-generated":
        return <Zap className="h-4 w-4" />;
      case "motion-capture":
        return <Camera className="h-4 w-4" />;
      case "hybrid":
        return <Blend className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {getSourceIcon()}
            Virtual Patient Movement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {animationSequence?.metadata.source || 'static'}
            </Badge>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {animationSequence 
            ? `AI-generated movement based on clinical findings • Frame ${currentFrame + 1}/${maxFrames}`
            : 'Click body regions to analyze movement patterns'
          }
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={`${height} relative`}>
          <Canvas
            camera={{ position: cameraPosition, fov: 45 }}
            style={{ background: '#f8fafc' }}
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: "default",
              failIfMajorPerformanceCaveat: false
            }}
            onCreated={({ gl }) => {
              try {
                gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              } catch (e) {
                console.warn('WebGL setup warning:', e);
              }
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <directionalLight position={[-10, -10, -5]} intensity={0.4} />
            
            <Suspense fallback={<LoadingFallback />}>
              <AnimatedSkeletonModel 
                animationSequence={animationSequence}
                currentFrame={currentFrame}
                onRegionSelect={onRegionSelect}
                selectedRegion={selectedRegion}
              />
            </Suspense>
            
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxDistance={5}
              minDistance={1}
            />
          </Canvas>
        </div>

        {showControls && animationSequence && (
          <div className="p-4 border-t space-y-3">
            {/* Playback Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant={isPlaying ? "secondary" : "default"}
                  size="sm"
                  onClick={isPlaying ? handlePause : handlePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {Math.round(currentTime / 1000 * 100) / 100}s / {Math.round(totalDuration / 1000 * 100) / 100}s
              </div>
            </div>

            {/* Frame Scrubber */}
            <div className="space-y-2">
              <Slider
                value={[currentFrame]}
                onValueChange={handleFrameSeek}
                max={maxFrames - 1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Frame: {currentFrame + 1}</span>
                <span>Speed: {playbackSpeed}x</span>
              </div>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <Slider
                value={[playbackSpeed]}
                onValueChange={(value) => setPlaybackSpeed(value[0])}
                min={0.1}
                max={3.0}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {selectedInfo && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedInfo.color }}
              />
              <Badge variant="secondary" className="text-sm">
                Selected: {selectedInfo.displayName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Analyzing movement patterns for {selectedInfo.displayName.toLowerCase()}
            </p>
          </div>
        )}

        {!showControls && (
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Body regions:</p>
            <div className="flex flex-wrap gap-1">
              {bodyRegions.slice(0, 6).map((region) => (
                <Badge
                  key={region.name}
                  variant={selectedRegion === region.name ? "default" : "outline"}
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => onRegionSelect?.(region.name, region.displayName)}
                >
                  {region.displayName.split(' ')[0]}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}