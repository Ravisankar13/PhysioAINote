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

  // Draw anatomical skeleton with realistic bones
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

    const keypoints = frame.keypoints;
    
    // Helper function to find keypoint by name
    const getKeypointByName = (name: string) => {
      return keypoints.find((kp: any) => kp.name === name);
    };

    // Helper function to draw a bone between two points
    const drawBone = (start: any, end: any, width: number, boneColor: string) => {
      if (!start || !end) return;
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      
      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(angle);
      
      // Create gradient for 3D bone effect
      const gradient = ctx.createLinearGradient(0, -width/2, 0, width/2);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(0.5, boneColor);
      gradient.addColorStop(1, '#9ca3af');
      
      ctx.fillStyle = gradient;
      
      // Draw rounded bone shape
      ctx.beginPath();
      ctx.roundRect(0, -width/2, length, width, width/2);
      ctx.fill();
      
      // Add bone outline
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    };

    // Helper function to get bone color based on status
    const getBoneColor = (joint1: any, joint2: any) => {
      if (joint1?.status === 'limited' || joint2?.status === 'limited') {
        return '#ffb3b3'; // Red tint for affected bones
      }
      if (joint1?.status === 'compensating' || joint2?.status === 'compensating') {
        return '#fff3b3'; // Yellow tint for compensating bones
      }
      return '#f5deb3'; // Normal bone color (tan/beige)
    };

    // Draw major bones in anatomical order (back to front)
    
    // 1. Spine/Vertebrae (simplified as single bone)
    const neck = getKeypointByName('neck');
    const spine = getKeypointByName('spine');
    if (neck && spine) {
      drawBone(neck, spine, 8, getBoneColor(neck, spine));
    }

    // 2. Pelvis (simplified as horizontal bone)
    const leftHip = getKeypointByName('left_hip');
    const rightHip = getKeypointByName('right_hip');
    if (leftHip && rightHip) {
      drawBone(leftHip, rightHip, 12, getBoneColor(leftHip, rightHip));
    }

    // 3. Femur bones (thigh bones)
    const leftKnee = getKeypointByName('left_knee');
    const rightKnee = getKeypointByName('right_knee');
    if (leftHip && leftKnee) {
      drawBone(leftHip, leftKnee, 14, getBoneColor(leftHip, leftKnee)); // Left femur
    }
    if (rightHip && rightKnee) {
      drawBone(rightHip, rightKnee, 14, getBoneColor(rightHip, rightKnee)); // Right femur
    }

    // 4. Tibia bones (shin bones)
    const leftAnkle = getKeypointByName('left_ankle');
    const rightAnkle = getKeypointByName('right_ankle');
    if (leftKnee && leftAnkle) {
      drawBone(leftKnee, leftAnkle, 10, getBoneColor(leftKnee, leftAnkle)); // Left tibia
    }
    if (rightKnee && rightAnkle) {
      drawBone(rightKnee, rightAnkle, 10, getBoneColor(rightKnee, rightAnkle)); // Right tibia
    }

    // 5. Fibula bones (smaller lower leg bones) - slightly offset
    if (leftKnee && leftAnkle) {
      const fibulaStart = { x: leftKnee.x - 3, y: leftKnee.y + 5 };
      const fibulaEnd = { x: leftAnkle.x - 3, y: leftAnkle.y };
      drawBone(fibulaStart, fibulaEnd, 4, getBoneColor(leftKnee, leftAnkle)); // Left fibula
    }
    if (rightKnee && rightAnkle) {
      const fibulaStart = { x: rightKnee.x + 3, y: rightKnee.y + 5 };
      const fibulaEnd = { x: rightAnkle.x + 3, y: rightAnkle.y };
      drawBone(fibulaStart, fibulaEnd, 4, getBoneColor(rightKnee, rightAnkle)); // Right fibula
    }

    // 6. Humerus bones (upper arm)
    const leftShoulder = getKeypointByName('left_shoulder');
    const rightShoulder = getKeypointByName('right_shoulder');
    const leftElbow = getKeypointByName('left_elbow');
    const rightElbow = getKeypointByName('right_elbow');
    if (leftShoulder && leftElbow) {
      drawBone(leftShoulder, leftElbow, 10, getBoneColor(leftShoulder, leftElbow)); // Left humerus
    }
    if (rightShoulder && rightElbow) {
      drawBone(rightShoulder, rightElbow, 10, getBoneColor(rightShoulder, rightElbow)); // Right humerus
    }

    // 7. Radius bones (forearm - thumb side)
    const leftWrist = getKeypointByName('left_wrist');
    const rightWrist = getKeypointByName('right_wrist');
    if (leftElbow && leftWrist) {
      drawBone(leftElbow, leftWrist, 6, getBoneColor(leftElbow, leftWrist)); // Left radius
    }
    if (rightElbow && rightWrist) {
      drawBone(rightElbow, rightWrist, 6, getBoneColor(rightElbow, rightWrist)); // Right radius
    }

    // 8. Ulna bones (forearm - pinky side) - slightly offset
    if (leftElbow && leftWrist) {
      const ulnaStart = { x: leftElbow.x - 2, y: leftElbow.y };
      const ulnaEnd = { x: leftWrist.x + 2, y: leftWrist.y };
      drawBone(ulnaStart, ulnaEnd, 5, getBoneColor(leftElbow, leftWrist)); // Left ulna
    }
    if (rightElbow && rightWrist) {
      const ulnaStart = { x: rightElbow.x + 2, y: rightElbow.y };
      const ulnaEnd = { x: rightWrist.x - 2, y: rightWrist.y };
      drawBone(ulnaStart, ulnaEnd, 5, getBoneColor(rightElbow, rightWrist)); // Right ulna
    }

    // 9. Foot bones (simplified)
    const leftFoot = getKeypointByName('left_foot');
    const rightFoot = getKeypointByName('right_foot');
    if (leftAnkle && leftFoot) {
      drawBone(leftAnkle, leftFoot, 6, getBoneColor(leftAnkle, leftFoot)); // Left foot
    }
    if (rightAnkle && rightFoot) {
      drawBone(rightAnkle, rightFoot, 6, getBoneColor(rightAnkle, rightFoot)); // Right foot
    }

    // 10. Shoulder girdle (clavicles)
    if (neck && leftShoulder) {
      drawBone(neck, leftShoulder, 6, getBoneColor(neck, leftShoulder)); // Left clavicle
    }
    if (neck && rightShoulder) {
      drawBone(neck, rightShoulder, 6, getBoneColor(neck, rightShoulder)); // Right clavicle
    }

    // Draw head as skull
    const head = getKeypointByName('head');
    if (head) {
      // Skull shape
      ctx.fillStyle = '#f5deb3';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 14, 0, 2 * Math.PI);
      ctx.fill();
      
      // Skull outline
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 14, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Eye sockets
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(head.x - 4, head.y - 2, 2, 0, 2 * Math.PI);
      ctx.arc(head.x + 4, head.y - 2, 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw joints as articulation points
    keypoints.forEach((kp: any) => {
      if (kp.name !== 'head' && kp.name !== 'left_foot' && kp.name !== 'right_foot') {
        // Set joint color based on status
        switch (kp.status) {
          case 'limited':
            ctx.fillStyle = '#dc2626'; // Dark red for limited/painful joints
            ctx.strokeStyle = '#fca5a5'; // Light red outline
            break;
          case 'compensating':
            ctx.fillStyle = '#d97706'; // Orange for compensating joints
            ctx.strokeStyle = '#fed7aa'; // Light orange outline
            break;
          default:
            ctx.fillStyle = '#047857'; // Dark green for normal joints
            ctx.strokeStyle = '#a7f3d0'; // Light green outline
        }
        
        // Joint size based on status
        const radius = kp.status === 'limited' ? 8 : 6;
        
        // Draw joint capsule
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Joint outline
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Add pulsing effect for painful joints
        if (kp.status === 'limited') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, radius + 3, 0, 2 * Math.PI);
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