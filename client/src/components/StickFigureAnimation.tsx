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

    // Helper function to draw anatomically accurate bones using SVG paths
    const drawAnatomicalBone = (start: any, end: any, boneType: string, boneColor: string, isAffected: boolean = false) => {
      if (!start || !end) return;
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      
      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(angle);
      
      // Create gradient for 3D bone effect
      const gradient = ctx.createLinearGradient(0, -20, 0, 20);
      gradient.addColorStop(0, isAffected ? '#ffcccc' : '#ffffff');
      gradient.addColorStop(0.3, boneColor);
      gradient.addColorStop(0.7, boneColor);
      gradient.addColorStop(1, '#d4af8a');
      
      ctx.fillStyle = gradient;
      
      // Draw bone based on anatomical type
      switch (boneType) {
        case 'femur':
          drawFemur(length, isAffected);
          break;
        case 'tibia':
          drawTibia(length, isAffected);
          break;
        case 'fibula':
          drawFibula(length, isAffected);
          break;
        case 'humerus':
          drawHumerus(length, isAffected);
          break;
        case 'radius':
          drawRadius(length, isAffected);
          break;
        case 'ulna':
          drawUlna(length, isAffected);
          break;
        case 'clavicle':
          drawClavicle(length, isAffected);
          break;
        case 'pelvis':
          drawPelvis(length, isAffected);
          break;
        case 'spine':
          drawSpine(length, isAffected);
          break;
        case 'foot':
          drawFoot(length, isAffected);
          break;
        default:
          drawGenericBone(length, 8, isAffected);
      }
      
      ctx.restore();
    };

    // Anatomically accurate femur (thigh bone) with femoral head and condyles
    const drawFemur = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Femoral head (ball joint at hip)
      ctx.arc(0, 0, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Femoral neck
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(25, -6);
      ctx.lineTo(25, 6);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      
      // Femoral shaft (main body)
      ctx.beginPath();
      ctx.moveTo(25, -8);
      ctx.lineTo(length - 20, -10);
      ctx.lineTo(length - 20, 10);
      ctx.lineTo(25, 8);
      ctx.closePath();
      ctx.fill();
      
      // Femoral condyles (knee joint surfaces)
      ctx.beginPath();
      ctx.arc(length - 12, -6, 8, 0, 2 * Math.PI);
      ctx.arc(length - 12, 6, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add pathology visualization if affected
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Show stress fracture lines
        ctx.beginPath();
        ctx.moveTo(length * 0.6, -8);
        ctx.lineTo(length * 0.6 + 15, 8);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    // Anatomically accurate tibia (shin bone) with tibial plateau
    const drawTibia = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Tibial plateau (wide top for knee joint)
      ctx.moveTo(0, -12);
      ctx.lineTo(15, -10);
      ctx.lineTo(15, 10);
      ctx.lineTo(0, 12);
      
      // Tibial shaft (triangular cross-section effect)
      ctx.lineTo(5, 8);
      ctx.lineTo(length - 8, 6);
      ctx.lineTo(length, 8);
      ctx.lineTo(length, -8);
      ctx.lineTo(length - 8, -6);
      ctx.lineTo(5, -8);
      ctx.closePath();
      ctx.fill();
      
      // Medial malleolus (inner ankle bone)
      ctx.beginPath();
      ctx.arc(length - 5, 0, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Fibula (smaller outer leg bone)
    const drawFibula = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Thin fibular shaft
      ctx.moveTo(0, -3);
      ctx.lineTo(length - 8, -4);
      ctx.lineTo(length, -6);
      ctx.lineTo(length, 6);
      ctx.lineTo(length - 8, 4);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      
      // Lateral malleolus (outer ankle bone)
      ctx.beginPath();
      ctx.arc(length - 4, 0, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Anatomically accurate humerus with humeral head
    const drawHumerus = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Humeral head (ball joint at shoulder)
      ctx.arc(0, 0, 10, 0, 2 * Math.PI);
      ctx.fill();
      
      // Humeral shaft
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(length * 0.6, -8);
      ctx.lineTo(length - 15, -12);
      ctx.lineTo(length, -8);
      ctx.lineTo(length, 8);
      ctx.lineTo(length - 15, 12);
      ctx.lineTo(length * 0.6, 8);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();
      
      // Deltoid tuberosity (muscle attachment point)
      ctx.beginPath();
      ctx.arc(length * 0.4, -8, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Radius bone (thumb-side forearm)
    const drawRadius = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Radial head (small, round)
      ctx.arc(0, 0, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Radial shaft (widens toward wrist)
      ctx.beginPath();
      ctx.moveTo(3, -2);
      ctx.lineTo(length - 10, -4);
      ctx.lineTo(length, -8);
      ctx.lineTo(length, 8);
      ctx.lineTo(length - 10, 4);
      ctx.lineTo(3, 2);
      ctx.closePath();
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Ulna bone (pinky-side forearm) with olecranon process
    const drawUlna = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Olecranon process (elbow point)
      ctx.moveTo(-5, -8);
      ctx.lineTo(5, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 8);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      
      // Ulnar shaft (narrows toward wrist)
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(length - 5, -2);
      ctx.lineTo(length, -4);
      ctx.lineTo(length, 4);
      ctx.lineTo(length - 5, 2);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Clavicle (collar bone) with S-curve
    const drawClavicle = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // S-curved clavicle shape
      ctx.moveTo(0, -4);
      ctx.bezierCurveTo(length * 0.3, -8, length * 0.7, 4, length, 0);
      ctx.lineTo(length - 2, 6);
      ctx.bezierCurveTo(length * 0.7, 10, length * 0.3, -2, 0, 4);
      ctx.closePath();
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Pelvis (simplified iliac crest)
    const drawPelvis = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Iliac crest (hip bone curve)
      ctx.moveTo(0, -15);
      ctx.bezierCurveTo(length * 0.3, -20, length * 0.7, -20, length, -15);
      ctx.lineTo(length - 10, 0);
      ctx.lineTo(length - 20, 15);
      ctx.bezierCurveTo(length * 0.7, 10, length * 0.3, 10, 20, 15);
      ctx.lineTo(10, 0);
      ctx.closePath();
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Spine (vertebral column)
    const drawSpine = (length: number, isAffected: boolean) => {
      const vertebraeCount = Math.floor(length / 15);
      
      for (let i = 0; i < vertebraeCount; i++) {
        const y = (i * length) / vertebraeCount;
        
        // Vertebral body
        ctx.beginPath();
        ctx.roundRect(-6, y, 12, 10, 2);
        ctx.fill();
        
        // Spinous process
        ctx.beginPath();
        ctx.roundRect(-2, y + 2, 4, 12, 1);
        ctx.fill();
      }
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Foot bones (simplified)
    const drawFoot = (length: number, isAffected: boolean) => {
      ctx.beginPath();
      
      // Calcaneus (heel bone)
      ctx.roundRect(0, -8, length * 0.4, 16, 4);
      ctx.fill();
      
      // Metatarsals (toe bones)
      for (let i = 0; i < 5; i++) {
        const toeY = -6 + (i * 3);
        ctx.beginPath();
        ctx.roundRect(length * 0.4, toeY, length * 0.6, 2, 1);
        ctx.fill();
      }
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Generic bone for fallback
    const drawGenericBone = (length: number, width: number, isAffected: boolean) => {
      ctx.beginPath();
      ctx.roundRect(0, -width/2, length, width, width/2);
      ctx.fill();
      
      if (isAffected) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
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

    // Draw anatomically accurate bones in anatomical order (back to front)
    
    // Get joint references
    const neck = getKeypointByName('neck');
    const spine = getKeypointByName('spine');
    const leftHip = getKeypointByName('left_hip');
    const rightHip = getKeypointByName('right_hip');
    const leftKnee = getKeypointByName('left_knee');
    const rightKnee = getKeypointByName('right_knee');
    const leftAnkle = getKeypointByName('left_ankle');
    const rightAnkle = getKeypointByName('right_ankle');
    const leftShoulder = getKeypointByName('left_shoulder');
    const rightShoulder = getKeypointByName('right_shoulder');
    const leftElbow = getKeypointByName('left_elbow');
    const rightElbow = getKeypointByName('right_elbow');
    const leftWrist = getKeypointByName('left_wrist');
    const rightWrist = getKeypointByName('right_wrist');
    const leftFoot = getKeypointByName('left_foot');
    const rightFoot = getKeypointByName('right_foot');

    // 1. Spine/Vertebrae
    if (neck && spine) {
      const isAffected = neck.status === 'limited' || spine.status === 'limited';
      drawAnatomicalBone(neck, spine, 'spine', getBoneColor(neck, spine), isAffected);
    }

    // 2. Pelvis
    if (leftHip && rightHip) {
      const isAffected = leftHip.status === 'limited' || rightHip.status === 'limited';
      drawAnatomicalBone(leftHip, rightHip, 'pelvis', getBoneColor(leftHip, rightHip), isAffected);
    }

    // 3. Femur bones (thigh bones) with anatomical detail
    if (leftHip && leftKnee) {
      const isAffected = leftHip.status === 'limited' || leftKnee.status === 'limited';
      drawAnatomicalBone(leftHip, leftKnee, 'femur', getBoneColor(leftHip, leftKnee), isAffected);
    }
    if (rightHip && rightKnee) {
      const isAffected = rightHip.status === 'limited' || rightKnee.status === 'limited';
      drawAnatomicalBone(rightHip, rightKnee, 'femur', getBoneColor(rightHip, rightKnee), isAffected);
    }

    // 4. Tibia bones (shin bones) with tibial plateau
    if (leftKnee && leftAnkle) {
      const isAffected = leftKnee.status === 'limited' || leftAnkle.status === 'limited';
      drawAnatomicalBone(leftKnee, leftAnkle, 'tibia', getBoneColor(leftKnee, leftAnkle), isAffected);
    }
    if (rightKnee && rightAnkle) {
      const isAffected = rightKnee.status === 'limited' || rightAnkle.status === 'limited';
      drawAnatomicalBone(rightKnee, rightAnkle, 'tibia', getBoneColor(rightKnee, rightAnkle), isAffected);
    }

    // 5. Fibula bones (smaller outer leg bones) - anatomically positioned
    if (leftKnee && leftAnkle) {
      const fibulaStart = { x: leftKnee.x - 3, y: leftKnee.y + 5, status: leftKnee.status };
      const fibulaEnd = { x: leftAnkle.x - 3, y: leftAnkle.y, status: leftAnkle.status };
      const isAffected = leftKnee.status === 'limited' || leftAnkle.status === 'limited';
      drawAnatomicalBone(fibulaStart, fibulaEnd, 'fibula', getBoneColor(leftKnee, leftAnkle), isAffected);
    }
    if (rightKnee && rightAnkle) {
      const fibulaStart = { x: rightKnee.x + 3, y: rightKnee.y + 5, status: rightKnee.status };
      const fibulaEnd = { x: rightAnkle.x + 3, y: rightAnkle.y, status: rightAnkle.status };
      const isAffected = rightKnee.status === 'limited' || rightAnkle.status === 'limited';
      drawAnatomicalBone(fibulaStart, fibulaEnd, 'fibula', getBoneColor(rightKnee, rightAnkle), isAffected);
    }

    // 6. Humerus bones (upper arm) with humeral head
    if (leftShoulder && leftElbow) {
      const isAffected = leftShoulder.status === 'limited' || leftElbow.status === 'limited';
      drawAnatomicalBone(leftShoulder, leftElbow, 'humerus', getBoneColor(leftShoulder, leftElbow), isAffected);
    }
    if (rightShoulder && rightElbow) {
      const isAffected = rightShoulder.status === 'limited' || rightElbow.status === 'limited';
      drawAnatomicalBone(rightShoulder, rightElbow, 'humerus', getBoneColor(rightShoulder, rightElbow), isAffected);
    }

    // 7. Radius bones (forearm - thumb side) with anatomical details
    if (leftElbow && leftWrist) {
      const isAffected = leftElbow.status === 'limited' || leftWrist.status === 'limited';
      drawAnatomicalBone(leftElbow, leftWrist, 'radius', getBoneColor(leftElbow, leftWrist), isAffected);
    }
    if (rightElbow && rightWrist) {
      const isAffected = rightElbow.status === 'limited' || rightWrist.status === 'limited';
      drawAnatomicalBone(rightElbow, rightWrist, 'radius', getBoneColor(rightElbow, rightWrist), isAffected);
    }

    // 8. Ulna bones (forearm - pinky side) with olecranon process
    if (leftElbow && leftWrist) {
      const ulnaStart = { x: leftElbow.x - 2, y: leftElbow.y, status: leftElbow.status };
      const ulnaEnd = { x: leftWrist.x + 2, y: leftWrist.y, status: leftWrist.status };
      const isAffected = leftElbow.status === 'limited' || leftWrist.status === 'limited';
      drawAnatomicalBone(ulnaStart, ulnaEnd, 'ulna', getBoneColor(leftElbow, leftWrist), isAffected);
    }
    if (rightElbow && rightWrist) {
      const ulnaStart = { x: rightElbow.x + 2, y: rightElbow.y, status: rightElbow.status };
      const ulnaEnd = { x: rightWrist.x - 2, y: rightWrist.y, status: rightWrist.status };
      const isAffected = rightElbow.status === 'limited' || rightWrist.status === 'limited';
      drawAnatomicalBone(ulnaStart, ulnaEnd, 'ulna', getBoneColor(rightElbow, rightWrist), isAffected);
    }

    // 9. Foot bones with anatomical structure
    if (leftAnkle && leftFoot) {
      const isAffected = leftAnkle.status === 'limited' || leftFoot.status === 'limited';
      drawAnatomicalBone(leftAnkle, leftFoot, 'foot', getBoneColor(leftAnkle, leftFoot), isAffected);
    }
    if (rightAnkle && rightFoot) {
      const isAffected = rightAnkle.status === 'limited' || rightFoot.status === 'limited';
      drawAnatomicalBone(rightAnkle, rightFoot, 'foot', getBoneColor(rightAnkle, rightFoot), isAffected);
    }

    // 10. Clavicles (collar bones) with S-curve
    if (neck && leftShoulder) {
      const isAffected = neck.status === 'limited' || leftShoulder.status === 'limited';
      drawAnatomicalBone(neck, leftShoulder, 'clavicle', getBoneColor(neck, leftShoulder), isAffected);
    }
    if (neck && rightShoulder) {
      const isAffected = neck.status === 'limited' || rightShoulder.status === 'limited';
      drawAnatomicalBone(neck, rightShoulder, 'clavicle', getBoneColor(neck, rightShoulder), isAffected);
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