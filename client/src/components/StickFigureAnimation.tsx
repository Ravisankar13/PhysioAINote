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

    // Enhanced anatomical connections for realistic bone structure
    const connections = [
      // Head and neck
      ['head', 'neck'],
      ['neck', 'left_shoulder'],
      ['neck', 'right_shoulder'],
      // Upper body structure
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'spine'],
      ['right_shoulder', 'spine'],
      // Arms - left side
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      // Arms - right side  
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      // Torso
      ['spine', 'left_hip'],
      ['spine', 'right_hip'],
      ['left_hip', 'right_hip'],
      // Legs - left side
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['left_ankle', 'left_foot'],
      // Legs - right side
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle'],
      ['right_ankle', 'right_foot']
    ];

    // Draw connections with status-based coloring
    connections.forEach(([startName, endName]) => {
      const start = getKeypointByName(startName);
      const end = getKeypointByName(endName);
      
      if (start && end) {
        // Set color based on joint status
        const affectedJoint = start.status === 'limited' || end.status === 'limited';
        ctx.strokeStyle = affectedJoint ? '#ef4444' : '#2563eb'; // Red for limited, blue for normal
        ctx.lineWidth = affectedJoint ? 4 : 3; // Thicker lines for affected joints
        
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

    // Draw joints as color-coded circles based on clinical status
    keypoints.forEach((kp: any) => {
      if (kp.name !== 'head') {
        // Set joint color based on status
        switch (kp.status) {
          case 'limited':
            ctx.fillStyle = '#ef4444'; // Red for limited/painful
            break;
          case 'compensating':
            ctx.fillStyle = '#f59e0b'; // Yellow for compensating
            break;
          default:
            ctx.fillStyle = '#10b981'; // Green for normal
        }
        
        // Larger circles for affected joints
        const radius = kp.status === 'limited' ? 6 : 4;
        
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add subtle pulsing effect for painful joints
        if (kp.status === 'limited') {
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
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