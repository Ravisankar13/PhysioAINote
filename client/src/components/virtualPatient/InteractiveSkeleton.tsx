import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  Activity
} from 'lucide-react';

interface InteractiveSkeletonProps {
  animationSequences: any[];
  movementHeatmap?: any[];
  isPlaying: boolean;
  playbackTime: number;
  className?: string;
}

// Simplified skeleton connections for enhanced visualization
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],  // Head to shoulder
  [7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], // Left arm
  [8, 10], [10, 12], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], // Right arm
  [7, 8], [9, 10], // Torso connections
  [9, 23], [23, 25], [25, 27], [27, 29], [27, 31], // Left leg
  [10, 24], [24, 26], [26, 28], [28, 30], [28, 32]  // Right leg
];

export default function InteractiveSkeleton({
  animationSequences,
  movementHeatmap = [],
  isPlaying,
  playbackTime,
  className = ""
}: InteractiveSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);

  useEffect(() => {
    console.log('InteractiveSkeleton received:', { 
      animationSequences: animationSequences?.length,
      firstFrame: animationSequences?.[0]
    });
  }, [animationSequences]);

  useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

  // Animation loop
  useEffect(() => {
    if (!localIsPlaying || !animationSequences?.length) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let frameCount = 0;
    const animate = () => {
      frameCount++;
      if (frameCount % 6 === 0) { // ~10 FPS
        setCurrentFrame(prev => 
          prev >= animationSequences.length - 1 ? 0 : prev + 1
        );
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [localIsPlaying, animationSequences]);

  // Drawing function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animationSequences?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentLandmarks = animationSequences[currentFrame]?.landmarks || [];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (currentLandmarks.length === 0) return;

    // Draw skeleton connections (bones)
    ctx.strokeStyle = '#4ade80'; // Green
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = currentLandmarks[startIdx];
      const end = currentLandmarks[endIdx];
      
      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw joints
    currentLandmarks.forEach((landmark, index) => {
      if (landmark && landmark.visibility > 0.5) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Joint circles
        ctx.fillStyle = '#22d3ee'; // Cyan
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Joint outline
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Add frame info
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Frame ${currentFrame + 1}/${animationSequences.length}`, 10, 30);
    
  }, [currentFrame, animationSequences]);

  const handlePlay = () => setLocalIsPlaying(true);
  const handlePause = () => setLocalIsPlaying(false);
  const handleReset = () => {
    setCurrentFrame(0);
    setLocalIsPlaying(false);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Enhanced Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg"
        style={{ imageRendering: 'auto' }}
      />

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
            <SkipBack className="h-4 w-4" />
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