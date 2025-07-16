import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface StickFigureAnimationProps {
  animationData?: any;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  className?: string;
}

export function StickFigureAnimation({ 
  animationData,
  isPlaying = false,
  onTogglePlay,
  onReset,
  className = ""
}: StickFigureAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !animationData?.frames?.length) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % animationData.frames.length);
      animationRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 100); // 10 FPS

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, animationData?.frames?.length]);

  // Draw animation frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animationData?.frames?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = animationData.frames[currentFrame];
    drawStickFigure(frame, ctx);
  }, [currentFrame, animationData]);

  // Draw stick figure from keypoints
  const drawStickFigure = (frame: any, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 400);
    
    // Reduced logging to avoid console spam
    if (currentFrame === 0) {
      console.log('Animation started - Frame structure:', frame);
      console.log('Frame keys:', Object.keys(frame || {}));
    }
    
    if (!frame?.keypoints?.length) {
      // Draw fallback message
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No keypoints found', 200, 200);
      console.log('No keypoints in frame, showing fallback');
      return;
    }

    // Set drawing style
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#2563eb';

    const keypoints = frame.keypoints;

    // Find keypoints by name
    const getKeypointByName = (name: string) => {
      return keypoints.find((kp: any) => kp.name === name);
    };

    // Draw connections between joints
    const connections = [
      ['head', 'left_shoulder'],
      ['head', 'right_shoulder'],
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'spine'],
      ['right_shoulder', 'spine'],
      ['spine', 'left_hip'],
      ['spine', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];

    // Draw connections
    connections.forEach(([startName, endName]) => {
      const start = getKeypointByName(startName);
      const end = getKeypointByName(endName);
      
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    // Draw head as circle
    const head = getKeypointByName('head');
    if (head) {
      ctx.beginPath();
      ctx.arc(head.x, head.y, 12, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw joints as small circles
    keypoints.forEach((kp: any) => {
      if (kp.name !== 'head') {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="border border-gray-300 rounded-lg bg-white"
        />
      </div>

      {/* Animation Info */}
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-600">
          {animationData?.source && (
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
              {animationData.source}
            </span>
          )}
          {animationData?.frames?.length > 0 ? (
            <span>Frame {currentFrame + 1} of {animationData.frames.length}</span>
          ) : (
            <span>No animation data available</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePlay}
            disabled={!animationData?.frames?.length}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentFrame(0);
              onReset?.();
            }}
            disabled={!animationData?.frames?.length}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StickFigureAnimation;