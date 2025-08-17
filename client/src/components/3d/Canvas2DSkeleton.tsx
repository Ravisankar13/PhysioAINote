import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface Canvas2DSkeletonProps {
  patientData?: any;
  className?: string;
  showControls?: boolean;
}

export default function Canvas2DSkeleton({
  patientData,
  className = '',
  showControls = true
}: Canvas2DSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation function
    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save context state
      ctx.save();

      // Center the drawing
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Apply rotation
      rotationRef.current += 0.01;
      ctx.rotate(rotationRef.current);

      // Scale to fit canvas
      const scale = Math.min(canvas.width, canvas.height) / 4;

      // Draw skeleton
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      // Helper function to draw a line
      const drawBone = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.beginPath();
        ctx.moveTo(x1 * scale, y1 * scale);
        ctx.lineTo(x2 * scale, y2 * scale);
        ctx.stroke();
      };

      // Helper function to draw a joint
      const drawJoint = (x: number, y: number, isRed = false) => {
        ctx.fillStyle = isRed ? '#ff0000' : '#00ff00';
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, 4, 0, Math.PI * 2);
        ctx.fill();
      };

      // Define skeleton points (normalized coordinates)
      const skeleton = {
        head: { x: 0, y: -1.7 },
        neck: { x: 0, y: -1.5 },
        chest: { x: 0, y: -1.2 },
        spine: { x: 0, y: -0.9 },
        hips: { x: 0, y: -0.8 },
        leftShoulder: { x: 0.2, y: -1.4 },
        leftElbow: { x: 0.4, y: -1.1 },
        leftHand: { x: 0.5, y: -0.8 },
        rightShoulder: { x: -0.2, y: -1.4 },
        rightElbow: { x: -0.4, y: -1.1 },
        rightHand: { x: -0.5, y: -0.8 },
        leftHip: { x: 0.1, y: -0.8 },
        leftKnee: { x: 0.15, y: -0.4 },
        leftFoot: { x: 0.15, y: 0 },
        rightHip: { x: -0.1, y: -0.8 },
        rightKnee: { x: -0.15, y: -0.4 },
        rightFoot: { x: -0.15, y: 0 }
      };

      // Draw bones
      // Spine
      drawBone(skeleton.head.x, skeleton.head.y, skeleton.neck.x, skeleton.neck.y);
      drawBone(skeleton.neck.x, skeleton.neck.y, skeleton.chest.x, skeleton.chest.y);
      drawBone(skeleton.chest.x, skeleton.chest.y, skeleton.spine.x, skeleton.spine.y);
      drawBone(skeleton.spine.x, skeleton.spine.y, skeleton.hips.x, skeleton.hips.y);

      // Left arm
      drawBone(skeleton.chest.x, skeleton.chest.y, skeleton.leftShoulder.x, skeleton.leftShoulder.y);
      drawBone(skeleton.leftShoulder.x, skeleton.leftShoulder.y, skeleton.leftElbow.x, skeleton.leftElbow.y);
      drawBone(skeleton.leftElbow.x, skeleton.leftElbow.y, skeleton.leftHand.x, skeleton.leftHand.y);

      // Right arm
      drawBone(skeleton.chest.x, skeleton.chest.y, skeleton.rightShoulder.x, skeleton.rightShoulder.y);
      drawBone(skeleton.rightShoulder.x, skeleton.rightShoulder.y, skeleton.rightElbow.x, skeleton.rightElbow.y);
      drawBone(skeleton.rightElbow.x, skeleton.rightElbow.y, skeleton.rightHand.x, skeleton.rightHand.y);

      // Left leg
      drawBone(skeleton.hips.x, skeleton.hips.y, skeleton.leftHip.x, skeleton.leftHip.y);
      drawBone(skeleton.leftHip.x, skeleton.leftHip.y, skeleton.leftKnee.x, skeleton.leftKnee.y);
      drawBone(skeleton.leftKnee.x, skeleton.leftKnee.y, skeleton.leftFoot.x, skeleton.leftFoot.y);

      // Right leg
      drawBone(skeleton.hips.x, skeleton.hips.y, skeleton.rightHip.x, skeleton.rightHip.y);
      drawBone(skeleton.rightHip.x, skeleton.rightHip.y, skeleton.rightKnee.x, skeleton.rightKnee.y);
      drawBone(skeleton.rightKnee.x, skeleton.rightKnee.y, skeleton.rightFoot.x, skeleton.rightFoot.y);

      // Draw joints
      Object.entries(skeleton).forEach(([name, pos]) => {
        // Check if this joint should be red (pain area)
        const isPainArea = patientData?.painAreas?.some((area: string) => 
          area.toLowerCase().includes(name.toLowerCase().replace(/left|right/i, ''))
        );
        drawJoint(pos.x, pos.y, isPainArea);
      });

      // Draw head circle
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(skeleton.head.x * scale, skeleton.head.y * scale, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Restore context state
      ctx.restore();

      // Draw info text
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px monospace';
      ctx.fillText('2D Skeleton Visualization', 10, 20);
      if (patientData?.anthropometrics?.height) {
        ctx.fillText(`Height: ${patientData.anthropometrics.height}cm`, 10, 40);
      }
      if (patientData?.anthropometrics?.weight) {
        ctx.fillText(`Weight: ${patientData.anthropometrics.weight}kg`, 10, 60);
      }
      if (patientData?.painAreas?.length > 0) {
        ctx.fillStyle = '#ff0000';
        ctx.fillText(`Pain Areas: ${patientData.painAreas.join(', ')}`, 10, 80);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [patientData]);

  return (
    <div className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: '#1a1a1a' }}
      />
    </div>
  );
}