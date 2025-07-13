import React, { useRef, useEffect, useState } from 'react';

interface TwoDVirtualPatientProps {
  animationFrames?: Array<{
    timestamp: number;
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
      visibility: number;
    }>;
  }>;
  isPlaying?: boolean;
  currentFrame?: number;
  onFrameChange?: (frame: number) => void;
  className?: string;
}

const TwoDVirtualPatient: React.FC<TwoDVirtualPatientProps> = ({
  animationFrames = [],
  isPlaying = false,
  currentFrame = 0,
  onFrameChange,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Draw stick figure on canvas
  const drawStickFigure = (ctx: CanvasRenderingContext2D, landmarks?: Array<{x: number, y: number, z: number, visibility: number}>) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    
    if (!landmarks || landmarks.length === 0) {
      // Draw neutral standing pose
      drawNeutralPose(ctx, canvasWidth, canvasHeight);
      return;
    }

    // Scale and position landmarks for canvas
    const scaledLandmarks = landmarks.map(landmark => ({
      x: landmark.x * canvasWidth + canvasWidth / 2,
      y: landmark.y * canvasHeight + canvasHeight / 4,
      visibility: landmark.visibility
    }));

    // Set drawing style
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ef4444';

    // Draw connections between body parts
    const connections = [
      // Head to shoulders
      [0, 11], [0, 12],
      // Shoulders
      [11, 12],
      // Left arm
      [11, 13], [13, 15],
      // Right arm  
      [12, 14], [14, 16],
      // Torso
      [11, 23], [12, 24],
      [23, 24],
      // Left leg
      [23, 25], [25, 27],
      // Right leg
      [24, 26], [26, 28],
      // Feet
      [27, 31], [28, 32]
    ];

    // Draw lines
    connections.forEach(([start, end]) => {
      if (scaledLandmarks[start] && scaledLandmarks[end] && 
          scaledLandmarks[start].visibility > 0.5 && scaledLandmarks[end].visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(scaledLandmarks[start].x, scaledLandmarks[start].y);
        ctx.lineTo(scaledLandmarks[end].x, scaledLandmarks[end].y);
        ctx.stroke();
      }
    });

    // Draw joint points
    [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(index => {
      if (scaledLandmarks[index] && scaledLandmarks[index].visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(scaledLandmarks[index].x, scaledLandmarks[index].y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // Draw neutral standing pose
  const drawNeutralPose = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ef4444';

    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 120, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Body lines
    ctx.beginPath();
    // Neck to shoulders
    ctx.moveTo(centerX, centerY - 110);
    ctx.lineTo(centerX, centerY - 80);
    // Shoulders
    ctx.moveTo(centerX - 40, centerY - 80);
    ctx.lineTo(centerX + 40, centerY - 80);
    // Torso
    ctx.moveTo(centerX, centerY - 80);
    ctx.lineTo(centerX, centerY + 20);
    // Hips
    ctx.moveTo(centerX - 20, centerY + 20);
    ctx.lineTo(centerX + 20, centerY + 20);
    
    // Left arm
    ctx.moveTo(centerX - 40, centerY - 80);
    ctx.lineTo(centerX - 50, centerY - 40);
    ctx.lineTo(centerX - 45, centerY);
    
    // Right arm
    ctx.moveTo(centerX + 40, centerY - 80);
    ctx.lineTo(centerX + 50, centerY - 40);
    ctx.lineTo(centerX + 45, centerY);
    
    // Left leg
    ctx.moveTo(centerX - 20, centerY + 20);
    ctx.lineTo(centerX - 25, centerY + 80);
    ctx.lineTo(centerX - 20, centerY + 140);
    
    // Right leg
    ctx.moveTo(centerX + 20, centerY + 20);
    ctx.lineTo(centerX + 25, centerY + 80);
    ctx.lineTo(centerX + 20, centerY + 140);
    
    ctx.stroke();

    // Joint points
    const joints = [
      [centerX, centerY - 120], // head
      [centerX - 40, centerY - 80], // left shoulder
      [centerX + 40, centerY - 80], // right shoulder
      [centerX - 50, centerY - 40], // left elbow
      [centerX + 50, centerY - 40], // right elbow
      [centerX - 45, centerY], // left hand
      [centerX + 45, centerY], // right hand
      [centerX - 20, centerY + 20], // left hip
      [centerX + 20, centerY + 20], // right hip
      [centerX - 25, centerY + 80], // left knee
      [centerX + 25, centerY + 80], // right knee
      [centerX - 20, centerY + 140], // left foot
      [centerX + 20, centerY + 140], // right foot
    ];

    joints.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Animation loop
  useEffect(() => {
    if (isPlaying && animationFrames.length > 0) {
      const animate = () => {
        if (onFrameChange) {
          onFrameChange((currentFrame + 1) % animationFrames.length);
        }
        animationRef.current = requestAnimationFrame(animate);
      };
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
  }, [isPlaying, currentFrame, animationFrames.length, onFrameChange]);

  // Draw current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animationFrames.length > 0 && currentFrame < animationFrames.length) {
      const frame = animationFrames[currentFrame];
      drawStickFigure(ctx, frame.landmarks);
    } else {
      drawStickFigure(ctx);
    }
  }, [currentFrame, animationFrames]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawStickFigure(ctx);
  }, []);

  return (
    <div className={`bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="w-full h-full"
        style={{ maxWidth: '400px', maxHeight: '600px' }}
      />
    </div>
  );
};

export default TwoDVirtualPatient;