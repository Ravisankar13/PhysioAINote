import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface SkeletonAnimationPlayerProps {
  width: number;
  height: number;
  patientCondition: string;
  className?: string;
}

interface Joint {
  x: number;
  y: number;
  color: string;
}

interface Skeleton {
  head: Joint;
  neck: Joint;
  shoulder: Joint;
  leftShoulder: Joint;
  rightShoulder: Joint;
  leftElbow: Joint;
  rightElbow: Joint;
  leftHand: Joint;
  rightHand: Joint;
  chest: Joint;
  waist: Joint;
  pelvis: Joint;
  leftHip: Joint;
  rightHip: Joint;
  leftKnee: Joint;
  rightKnee: Joint;
  leftFoot: Joint;
  rightFoot: Joint;
}

export default function SkeletonAnimationPlayer({ 
  width, 
  height, 
  patientCondition, 
  className 
}: SkeletonAnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [frame, setFrame] = useState(0);

  // Color palette matching your skeleton image
  const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e91e63'];

  // Get movement limitations based on patient condition
  const getMovementLimitations = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('shoulder')) {
      return {
        shoulderRange: 0.3, // Reduced range
        armElevation: 0.2,
        movementType: 'shoulder_limitation'
      };
    } else if (lowerCondition.includes('knee')) {
      return {
        kneeFlexion: 0.4,
        legMovement: 0.3,
        movementType: 'knee_limitation'
      };
    } else if (lowerCondition.includes('back') || lowerCondition.includes('spine')) {
      return {
        spinalFlexion: 0.2,
        bodyRotation: 0.1,
        movementType: 'back_limitation'
      };
    }
    
    return {
      shoulderRange: 1.0,
      armElevation: 1.0,
      kneeFlexion: 1.0,
      legMovement: 1.0,
      spinalFlexion: 1.0,
      bodyRotation: 1.0,
      movementType: 'normal_movement'
    };
  };

  // Calculate skeleton positions for current frame
  const calculateSkeleton = (frameNumber: number): Skeleton => {
    const time = frameNumber * 0.1; // Animation speed
    const limitations = getMovementLimitations(patientCondition);
    
    // Base positions (centered in canvas)
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate animated positions with clinical limitations
    const skeleton: Skeleton = {
      head: {
        x: centerX,
        y: centerY - 120 + Math.sin(time * 2) * 2,
        color: colors[0]
      },
      neck: {
        x: centerX,
        y: centerY - 100,
        color: colors[1]
      },
      shoulder: {
        x: centerX,
        y: centerY - 80,
        color: colors[2]
      },
      leftShoulder: {
        x: centerX - 30,
        y: centerY - 80,
        color: colors[3]
      },
      rightShoulder: {
        x: centerX + 30,
        y: centerY - 80,
        color: colors[4]
      },
      leftElbow: {
        x: centerX - 30 + Math.sin(time) * 25 * limitations.shoulderRange,
        y: centerY - 50 + Math.cos(time) * 15 * limitations.armElevation,
        color: colors[5]
      },
      rightElbow: {
        x: centerX + 30 - Math.sin(time) * 25 * limitations.shoulderRange,
        y: centerY - 50 + Math.cos(time) * 15 * limitations.armElevation,
        color: colors[6]
      },
      leftHand: {
        x: centerX - 30 + Math.sin(time * 1.2) * 35 * limitations.shoulderRange,
        y: centerY - 20 + Math.cos(time * 1.2) * 25 * limitations.armElevation,
        color: colors[0]
      },
      rightHand: {
        x: centerX + 30 - Math.sin(time * 1.2) * 35 * limitations.shoulderRange,
        y: centerY - 20 + Math.cos(time * 1.2) * 25 * limitations.armElevation,
        color: colors[1]
      },
      chest: {
        x: centerX,
        y: centerY - 40,
        color: colors[2]
      },
      waist: {
        x: centerX,
        y: centerY,
        color: colors[3]
      },
      pelvis: {
        x: centerX,
        y: centerY + 40,
        color: colors[4]
      },
      leftHip: {
        x: centerX - 20,
        y: centerY + 40,
        color: colors[5]
      },
      rightHip: {
        x: centerX + 20,
        y: centerY + 40,
        color: colors[6]
      },
      leftKnee: {
        x: centerX - 20 + Math.sin(time * 1.5) * 8 * limitations.legMovement,
        y: centerY + 80 + Math.cos(time) * 12 * limitations.kneeFlexion,
        color: colors[0]
      },
      rightKnee: {
        x: centerX + 20 - Math.sin(time * 1.5) * 8 * limitations.legMovement,
        y: centerY + 80 - Math.cos(time) * 12 * limitations.kneeFlexion,
        color: colors[1]
      },
      leftFoot: {
        x: centerX - 20 + Math.sin(time * 2) * 12 * limitations.legMovement,
        y: centerY + 120 + Math.cos(time * 1.5) * 8 * limitations.kneeFlexion,
        color: colors[2]
      },
      rightFoot: {
        x: centerX + 20 - Math.sin(time * 2) * 12 * limitations.legMovement,
        y: centerY + 120 - Math.cos(time * 1.5) * 8 * limitations.kneeFlexion,
        color: colors[3]
      }
    };

    return skeleton;
  };

  // Draw skeleton on canvas
  const drawSkeleton = (ctx: CanvasRenderingContext2D, skeleton: Skeleton) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw connections (bones)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#34495e';
    ctx.lineCap = 'round';

    const connections = [
      [skeleton.head, skeleton.neck],
      [skeleton.neck, skeleton.shoulder],
      [skeleton.shoulder, skeleton.chest],
      [skeleton.chest, skeleton.waist],
      [skeleton.waist, skeleton.pelvis],
      [skeleton.shoulder, skeleton.leftShoulder],
      [skeleton.shoulder, skeleton.rightShoulder],
      [skeleton.leftShoulder, skeleton.leftElbow],
      [skeleton.leftElbow, skeleton.leftHand],
      [skeleton.rightShoulder, skeleton.rightElbow],
      [skeleton.rightElbow, skeleton.rightHand],
      [skeleton.pelvis, skeleton.leftHip],
      [skeleton.pelvis, skeleton.rightHip],
      [skeleton.leftHip, skeleton.leftKnee],
      [skeleton.leftKnee, skeleton.leftFoot],
      [skeleton.rightHip, skeleton.rightKnee],
      [skeleton.rightKnee, skeleton.rightFoot]
    ];

    connections.forEach(([joint1, joint2]) => {
      ctx.beginPath();
      ctx.moveTo(joint1.x, joint1.y);
      ctx.lineTo(joint2.x, joint2.y);
      ctx.stroke();
    });

    // Draw joints as colorful circles
    Object.values(skeleton).forEach((joint) => {
      // Draw shadow
      ctx.shadowColor = joint.color;
      ctx.shadowBlur = 8;
      
      ctx.fillStyle = joint.color;
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Add bright center
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add movement limitation indicator
    const limitations = getMovementLimitations(patientCondition);
    if (limitations.movementType !== 'normal_movement') {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${limitations.movementType.replace('_', ' ')}`, width / 2, height - 20);
    }
  };

  // Animation loop
  const animate = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const skeleton = calculateSkeleton(frame);
      drawSkeleton(ctx, skeleton);
      setFrame(prev => prev + 1);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  // Start/stop animation
  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  // Initialize animation
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frame]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const skeleton = calculateSkeleton(0);
      drawSkeleton(ctx, skeleton);
    }
  }, [patientCondition]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full rounded border"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={toggleAnimation}
        className="absolute bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors"
        aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Animation Info */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        Frame: {frame}
      </div>
    </div>
  );
}