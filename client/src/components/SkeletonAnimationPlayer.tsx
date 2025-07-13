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
    if (!condition || condition.trim() === '') {
      return {
        shoulderRange: 1.0,
        armElevation: 1.0,
        kneeFlexion: 1.0,
        legMovement: 1.0,
        spinalFlexion: 1.0,
        bodyRotation: 1.0,
        movementType: 'normal_movement',
        painPattern: 'no_limitation'
      };
    }
    
    const lowerCondition = condition.toLowerCase();
    
    // Shoulder-specific conditions
    if (lowerCondition.includes('shoulder') || lowerCondition.includes('rotator cuff') || lowerCondition.includes('impingement') || lowerCondition.includes('arm')) {
      if (lowerCondition.includes('frozen') || lowerCondition.includes('adhesive capsulitis')) {
        return {
          shoulderRange: 0.1, // Severely limited
          armElevation: 0.05,
          movementType: 'frozen_shoulder',
          painPattern: 'severe_restriction'
        };
      } else if (lowerCondition.includes('tear') || lowerCondition.includes('rupture')) {
        return {
          shoulderRange: 0.2,
          armElevation: 0.1,
          movementType: 'rotator_cuff_tear',
          painPattern: 'weakness_limitation'
        };
      } else if (lowerCondition.includes('impingement') || lowerCondition.includes('subacromial')) {
        return {
          shoulderRange: 0.4,
          armElevation: 0.3,
          movementType: 'shoulder_impingement',
          painPattern: 'overhead_limitation'
        };
      } else {
        return {
          shoulderRange: 0.3,
          armElevation: 0.2,
          movementType: 'shoulder_pain',
          painPattern: 'general_limitation'
        };
      }
    }
    
    // Knee-specific conditions
    else if (lowerCondition.includes('knee') || lowerCondition.includes('acl') || lowerCondition.includes('meniscus')) {
      if (lowerCondition.includes('acl') || lowerCondition.includes('ligament')) {
        return {
          kneeFlexion: 0.3,
          legMovement: 0.2,
          movementType: 'knee_instability',
          painPattern: 'instability_pattern'
        };
      } else if (lowerCondition.includes('meniscus') || lowerCondition.includes('cartilage')) {
        return {
          kneeFlexion: 0.4,
          legMovement: 0.3,
          movementType: 'knee_mechanical',
          painPattern: 'mechanical_block'
        };
      } else {
        return {
          kneeFlexion: 0.4,
          legMovement: 0.3,
          movementType: 'knee_limitation',
          painPattern: 'general_knee_pain'
        };
      }
    }
    
    // Back/spine conditions
    else if (lowerCondition.includes('back') || lowerCondition.includes('spine') || lowerCondition.includes('disc')) {
      if (lowerCondition.includes('disc') || lowerCondition.includes('herniat') || lowerCondition.includes('bulg')) {
        return {
          spinalFlexion: 0.1,
          bodyRotation: 0.05,
          movementType: 'disc_herniation',
          painPattern: 'flexion_intolerant'
        };
      } else if (lowerCondition.includes('stenosis') || lowerCondition.includes('arthriti')) {
        return {
          spinalFlexion: 0.2,
          bodyRotation: 0.1,
          movementType: 'spinal_stenosis',
          painPattern: 'extension_intolerant'
        };
      } else {
        return {
          spinalFlexion: 0.2,
          bodyRotation: 0.1,
          movementType: 'back_limitation',
          painPattern: 'general_back_pain'
        };
      }
    }
    
    // Ankle/foot conditions
    else if (lowerCondition.includes('ankle') || lowerCondition.includes('foot') || lowerCondition.includes('achilles')) {
      return {
        ankleRange: 0.3,
        footMovement: 0.2,
        movementType: 'ankle_limitation',
        painPattern: 'weight_bearing_limitation'
      };
    }
    
    // Hip conditions
    else if (lowerCondition.includes('hip') || lowerCondition.includes('groin')) {
      return {
        hipFlexion: 0.3,
        hipRotation: 0.2,
        movementType: 'hip_limitation',
        painPattern: 'hip_restriction'
      };
    }
    
    return {
      shoulderRange: 1.0,
      armElevation: 1.0,
      kneeFlexion: 1.0,
      legMovement: 1.0,
      spinalFlexion: 1.0,
      bodyRotation: 1.0,
      movementType: 'normal_movement',
      painPattern: 'no_limitation'
    };
  };

  // Calculate skeleton positions for current frame
  const calculateSkeleton = (frameNumber: number): Skeleton => {
    const time = frameNumber * 0.08; // Slower animation for clinical realism
    const limitations = getMovementLimitations(patientCondition);
    
    // Base positions (centered in canvas)
    const centerX = width / 2;
    const centerY = height / 2;

    // Create realistic clinical movement patterns based on condition
    let leftShoulderOffset, rightShoulderOffset, leftElbowOffset, rightElbowOffset;
    let leftHandOffset, rightHandOffset;
    
    // Shoulder condition animations
    if (limitations.movementType.includes('shoulder') || limitations.movementType.includes('frozen') || limitations.movementType.includes('rotator')) {
      
      // Determine which side is affected (default to left, but check for "right" in condition)
      const isRightSide = patientCondition.toLowerCase().includes('right');
      const isLeftSide = patientCondition.toLowerCase().includes('left') || !isRightSide; // Default to left
      
      // Create movement limitation pattern
      const attempt = Math.sin(time * 0.5); // Slow attempt cycle
      const movementRange = limitations.shoulderRange || 0.3;
      
      if (limitations.movementType === 'frozen_shoulder') {
        // Very minimal movement, mostly static with slight attempt
        if (isLeftSide) {
          leftElbowOffset = {
            x: Math.sin(time * 0.3) * 3 * movementRange,
            y: Math.max(0, Math.sin(time * 0.3) * 2) // Barely moves up
          };
          leftHandOffset = {
            x: Math.sin(time * 0.3) * 5 * movementRange,
            y: Math.max(0, Math.sin(time * 0.3) * 3)
          };
          // Right side compensates
          rightElbowOffset = {
            x: -Math.sin(time * 0.4) * 15,
            y: Math.sin(time * 0.4) * 12
          };
          rightHandOffset = {
            x: -Math.sin(time * 0.4) * 25,
            y: Math.sin(time * 0.4) * 20
          };
        } else {
          rightElbowOffset = {
            x: -Math.sin(time * 0.3) * 3 * movementRange,
            y: Math.max(0, Math.sin(time * 0.3) * 2)
          };
          rightHandOffset = {
            x: -Math.sin(time * 0.3) * 5 * movementRange,
            y: Math.max(0, Math.sin(time * 0.3) * 3)
          };
        }
      } else if (limitations.movementType === 'shoulder_impingement') {
        // Can start movement but stops abruptly at impingement point
        const impingementPoint = 0.4;
        const movement = Math.sin(time * 0.7);
        const clampedMovement = movement > impingementPoint ? impingementPoint : movement;
        
        if (isLeftSide) {
          leftElbowOffset = {
            x: clampedMovement * 18,
            y: Math.max(0, clampedMovement * 12) // Stops at impingement
          };
          leftHandOffset = {
            x: clampedMovement * 28,
            y: Math.max(0, clampedMovement * 20)
          };
          // Right side overcompensates
          rightElbowOffset = {
            x: -Math.sin(time * 0.7) * 22,
            y: Math.sin(time * 0.7) * 18
          };
          rightHandOffset = {
            x: -Math.sin(time * 0.7) * 32,
            y: Math.sin(time * 0.7) * 25
          };
        } else {
          rightElbowOffset = {
            x: -clampedMovement * 18,
            y: Math.max(0, clampedMovement * 12)
          };
          rightHandOffset = {
            x: -clampedMovement * 28,
            y: Math.max(0, clampedMovement * 20)
          };
        }
      } else {
        // General shoulder pain - hesitant, guarded movement
        const hesitantMovement = Math.sin(time * 0.6) * movementRange;
        
        if (isLeftSide) {
          leftElbowOffset = {
            x: hesitantMovement * 12,
            y: Math.max(0, hesitantMovement * 8) // Limited upward movement
          };
          leftHandOffset = {
            x: hesitantMovement * 20,
            y: Math.max(0, hesitantMovement * 15)
          };
          // Normal movement on right side
          rightElbowOffset = {
            x: -Math.sin(time) * 18,
            y: Math.sin(time * 0.8) * 10
          };
          rightHandOffset = {
            x: -Math.sin(time * 1.2) * 25,
            y: Math.sin(time * 1.2) * 15
          };
        } else {
          rightElbowOffset = {
            x: -hesitantMovement * 12,
            y: Math.max(0, hesitantMovement * 8)
          };
          rightHandOffset = {
            x: -hesitantMovement * 20,
            y: Math.max(0, hesitantMovement * 15)
          };
        }
      }
    } else {
      // Normal arm movement for non-shoulder conditions
      leftElbowOffset = {
        x: Math.sin(time) * 20,
        y: Math.sin(time * 0.8) * 12
      };
      leftHandOffset = {
        x: Math.sin(time * 1.2) * 30,
        y: Math.sin(time * 1.2) * 20
      };
      rightElbowOffset = {
        x: -Math.sin(time) * 20,
        y: Math.sin(time * 0.8) * 12
      };
      rightHandOffset = {
        x: -Math.sin(time * 1.2) * 30,
        y: Math.sin(time * 1.2) * 20
      };
    }

    // Leg movement patterns
    let leftKneeOffset, rightKneeOffset, leftFootOffset, rightFootOffset;
    
    if (limitations.movementType.includes('knee')) {
      // Demonstrate knee limitation
      const kneeMovement = Math.sin(time * 0.7) * limitations.kneeFlexion;
      leftKneeOffset = {
        x: kneeMovement * 5,
        y: Math.max(0, kneeMovement * 8) // Limited flexion
      };
      leftFootOffset = {
        x: kneeMovement * 8,
        y: Math.max(0, kneeMovement * 6)
      };
      
      // Compensation in other leg
      rightKneeOffset = {
        x: -kneeMovement * 3,
        y: kneeMovement * 10
      };
      rightFootOffset = {
        x: -kneeMovement * 6,
        y: kneeMovement * 8
      };
    } else {
      // Normal leg movement
      leftKneeOffset = {
        x: Math.sin(time * 1.5) * 6,
        y: Math.sin(time * 1.3) * 10
      };
      leftFootOffset = {
        x: Math.sin(time * 2) * 10,
        y: Math.sin(time * 1.8) * 8
      };
      rightKneeOffset = {
        x: -Math.sin(time * 1.5) * 6,
        y: Math.sin(time * 1.3) * 10
      };
      rightFootOffset = {
        x: -Math.sin(time * 2) * 10,
        y: Math.sin(time * 1.8) * 8
      };
    }

    // Apply defaults if not set
    leftElbowOffset = leftElbowOffset || { x: Math.sin(time) * 20, y: Math.sin(time * 0.8) * 12 };
    rightElbowOffset = rightElbowOffset || { x: -Math.sin(time) * 20, y: Math.sin(time * 0.8) * 12 };
    leftHandOffset = leftHandOffset || { x: Math.sin(time * 1.2) * 30, y: Math.sin(time * 1.2) * 20 };
    rightHandOffset = rightHandOffset || { x: -Math.sin(time * 1.2) * 30, y: Math.sin(time * 1.2) * 20 };

    // Calculate final skeleton positions
    const skeleton: Skeleton = {
      head: {
        x: centerX,
        y: centerY - 120 + Math.sin(time * 1.5) * 2,
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
        x: centerX - 30 + leftElbowOffset.x,
        y: centerY - 50 + leftElbowOffset.y,
        color: colors[5]
      },
      rightElbow: {
        x: centerX + 30 + rightElbowOffset.x,
        y: centerY - 50 + rightElbowOffset.y,
        color: colors[6]
      },
      leftHand: {
        x: centerX - 30 + leftHandOffset.x,
        y: centerY - 20 + leftHandOffset.y,
        color: colors[0]
      },
      rightHand: {
        x: centerX + 30 + rightHandOffset.x,
        y: centerY - 20 + rightHandOffset.y,
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
        x: centerX - 20 + (leftKneeOffset?.x || 0),
        y: centerY + 80 + (leftKneeOffset?.y || 0),
        color: colors[0]
      },
      rightKnee: {
        x: centerX + 20 + (rightKneeOffset?.x || 0),
        y: centerY + 80 + (rightKneeOffset?.y || 0),
        color: colors[1]
      },
      leftFoot: {
        x: centerX - 20 + (leftFootOffset?.x || 0),
        y: centerY + 120 + (leftFootOffset?.y || 0),
        color: colors[2]
      },
      rightFoot: {
        x: centerX + 20 + (rightFootOffset?.x || 0),
        y: centerY + 120 + (rightFootOffset?.y || 0),
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

    // Add clinical pattern indicator
    const limitations = getMovementLimitations(patientCondition);
    if (limitations.movementType !== 'normal_movement') {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      
      // Show specific clinical pattern
      let displayText = limitations.movementType.replace(/_/g, ' ').toUpperCase();
      if (limitations.movementType === 'shoulder_impingement') {
        displayText = 'IMPINGEMENT - LIMITED OVERHEAD REACH';
      } else if (limitations.movementType === 'frozen_shoulder') {
        displayText = 'FROZEN SHOULDER - SEVERE RESTRICTION';
      } else if (limitations.movementType === 'rotator_cuff_tear') {
        displayText = 'ROTATOR CUFF TEAR - WEAKNESS PATTERN';
      } else if (limitations.movementType === 'shoulder_pain') {
        displayText = 'SHOULDER PAIN - GUARDED MOVEMENT';
      }
      
      ctx.fillText(displayText, width / 2, height - 15);
      
      // Add movement description
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '9px Arial';
      if (limitations.movementType.includes('shoulder')) {
        ctx.fillText('Attempting to lift arm - watch for limitation', width / 2, height - 5);
      } else if (limitations.movementType.includes('knee')) {
        ctx.fillText('Weight bearing with knee limitation', width / 2, height - 5);
      }
    } else {
      ctx.fillStyle = '#2ecc71';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('NORMAL MOVEMENT PATTERN', width / 2, height - 15);
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