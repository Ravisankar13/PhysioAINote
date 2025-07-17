import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Box, Grid3X3, Activity, ArrowDown, ArrowUp, RotateCw, Target, Zap, Shuffle } from 'lucide-react';
import ThreeDAnatomicalVisualization from './ThreeDAnatomicalVisualization';

interface StickFigureAnimationProps {
  animationData?: any;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  className?: string;
}

type VisualizationMode = '2D' | '3D';

// Movement types for functional exercises
type MovementType = 'squat' | 'walking' | 'shoulder_elevation' | 'spinal_flexion' | 'lunge' | 'reaching' | 'balance';

// Joint angle data for each movement keyframe
interface JointAngles {
  hip: number;
  knee: number;
  ankle: number;
  shoulder: number;
  elbow: number;
  spine: number;
}

// Movement keyframe with timing
interface MovementKeyframe {
  angles: JointAngles;
  duration: number; // milliseconds
  description: string;
}

// Complete movement pattern
interface MovementPattern {
  name: string;
  keyframes: MovementKeyframe[];
  loop: boolean;
  clinicalNotes: string;
}

// Define movement patterns for physiotherapy exercises
const MOVEMENT_PATTERNS: Record<MovementType, MovementPattern> = {
  squat: {
    name: "Squat",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Standing position" },
      { angles: { hip: 60, knee: 90, ankle: 15, shoulder: 30, elbow: 0, spine: 10 }, duration: 1000, description: "Descent phase" },
      { angles: { hip: 90, knee: 120, ankle: 25, shoulder: 45, elbow: 0, spine: 15 }, duration: 500, description: "Bottom position" },
      { angles: { hip: 60, knee: 90, ankle: 15, shoulder: 30, elbow: 0, spine: 10 }, duration: 800, description: "Ascent phase" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Return to standing" }
    ],
    loop: true,
    clinicalNotes: "Observe knee alignment, hip hinge pattern, and ankle mobility during movement"
  },
  walking: {
    name: "Walking Gait",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 20, elbow: 0, spine: 0 }, duration: 300, description: "Heel strike" },
      { angles: { hip: -10, knee: 15, ankle: 10, shoulder: 0, elbow: 0, spine: 0 }, duration: 300, description: "Loading response" },
      { angles: { hip: -20, knee: 5, ankle: -5, shoulder: -20, elbow: 0, spine: 0 }, duration: 300, description: "Mid stance" },
      { angles: { hip: -15, knee: -30, ankle: -15, shoulder: -10, elbow: 0, spine: 0 }, duration: 300, description: "Terminal stance" },
      { angles: { hip: 10, knee: -60, ankle: 20, shoulder: 10, elbow: 0, spine: 0 }, duration: 300, description: "Pre-swing" },
      { angles: { hip: 20, knee: -30, ankle: 10, shoulder: 20, elbow: 0, spine: 0 }, duration: 300, description: "Initial swing" }
    ],
    loop: true,
    clinicalNotes: "Assess gait symmetry, stride length, and weight transfer patterns"
  },
  shoulder_elevation: {
    name: "Shoulder Elevation",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Arms at sides" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 45, elbow: 0, spine: 0 }, duration: 800, description: "45° elevation" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 90, elbow: 0, spine: 0 }, duration: 800, description: "90° elevation" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 135, elbow: 0, spine: 0 }, duration: 800, description: "135° elevation" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 180, elbow: 0, spine: 0 }, duration: 500, description: "Full elevation" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 90, elbow: 0, spine: 0 }, duration: 800, description: "Return descent" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Return to start" }
    ],
    loop: true,
    clinicalNotes: "Monitor for impingement signs, scapular rhythm, and range limitations"
  },
  spinal_flexion: {
    name: "Spinal Flexion",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Neutral spine" },
      { angles: { hip: 15, knee: 0, ankle: 0, shoulder: 10, elbow: 0, spine: 15 }, duration: 1000, description: "Early flexion" },
      { angles: { hip: 30, knee: 0, ankle: 0, shoulder: 20, elbow: 0, spine: 30 }, duration: 1000, description: "Mid flexion" },
      { angles: { hip: 45, knee: 10, ankle: 0, shoulder: 30, elbow: 0, spine: 45 }, duration: 500, description: "Full flexion" },
      { angles: { hip: 30, knee: 0, ankle: 0, shoulder: 20, elbow: 0, spine: 30 }, duration: 800, description: "Return phase" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 800, description: "Return to neutral" }
    ],
    loop: true,
    clinicalNotes: "Assess spinal segmentation, hip hinge pattern, and flexion limitations"
  },
  lunge: {
    name: "Forward Lunge",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Standing ready" },
      { angles: { hip: 30, knee: 45, ankle: 10, shoulder: 0, elbow: 0, spine: 5 }, duration: 1000, description: "Step forward" },
      { angles: { hip: 60, knee: 90, ankle: 20, shoulder: 0, elbow: 0, spine: 10 }, duration: 800, description: "Lunge descent" },
      { angles: { hip: 90, knee: 120, ankle: 25, shoulder: 0, elbow: 0, spine: 15 }, duration: 500, description: "Bottom position" },
      { angles: { hip: 30, knee: 45, ankle: 10, shoulder: 0, elbow: 0, spine: 5 }, duration: 800, description: "Push back up" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 600, description: "Return to standing" }
    ],
    loop: true,
    clinicalNotes: "Monitor knee tracking, balance control, and bilateral strength differences"
  },
  reaching: {
    name: "Functional Reaching",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Neutral position" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 45, elbow: 30, spine: 5 }, duration: 800, description: "Reach initiation" },
      { angles: { hip: 10, knee: 0, ankle: 0, shoulder: 90, elbow: 45, spine: 10 }, duration: 800, description: "Forward reach" },
      { angles: { hip: 15, knee: 0, ankle: 0, shoulder: 120, elbow: 60, spine: 15 }, duration: 500, description: "Maximum reach" },
      { angles: { hip: 10, knee: 0, ankle: 0, shoulder: 90, elbow: 45, spine: 10 }, duration: 600, description: "Return phase" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 600, description: "Return to neutral" }
    ],
    loop: true,
    clinicalNotes: "Evaluate reach distance, compensatory movements, and trunk stability"
  },
  balance: {
    name: "Single Leg Balance",
    keyframes: [
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 500, description: "Double leg stance" },
      { angles: { hip: 30, knee: 90, ankle: 0, shoulder: 15, elbow: 0, spine: 5 }, duration: 1000, description: "Lift one leg" },
      { angles: { hip: 35, knee: 95, ankle: 5, shoulder: 20, elbow: 0, spine: 8 }, duration: 2000, description: "Balance hold" },
      { angles: { hip: 32, knee: 92, ankle: -3, shoulder: 10, elbow: 0, spine: 3 }, duration: 1000, description: "Stabilize" },
      { angles: { hip: 30, knee: 90, ankle: 0, shoulder: 15, elbow: 0, spine: 5 }, duration: 800, description: "Maintain balance" },
      { angles: { hip: 0, knee: 0, ankle: 0, shoulder: 0, elbow: 0, spine: 0 }, duration: 600, description: "Return to double stance" }
    ],
    loop: true,
    clinicalNotes: "Assess postural sway, ankle strategies, and proprioceptive control"
  }
};

export function StickFigureAnimation({ 
  animationData,
  isPlaying = false,
  onTogglePlay,
  onReset,
  className = ""
}: StickFigureAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('3D');
  const animationRef = useRef<number | null>(null);
  
  // Movement system state
  const [currentMovement, setCurrentMovement] = useState<MovementType | null>(null);
  const [movementFrame, setMovementFrame] = useState(0);
  const [isMovementPlaying, setIsMovementPlaying] = useState(false);
  const [movementSpeed, setMovementSpeed] = useState(1.0);
  const movementAnimationRef = useRef<number | null>(null);

  // Movement animation system
  const startMovement = (movementType: MovementType) => {
    setCurrentMovement(movementType);
    setMovementFrame(0);
    setIsMovementPlaying(true);
  };

  const stopMovement = () => {
    setIsMovementPlaying(false);
    if (movementAnimationRef.current) {
      cancelAnimationFrame(movementAnimationRef.current);
      movementAnimationRef.current = null;
    }
  };

  const resetMovement = () => {
    setMovementFrame(0);
    setIsMovementPlaying(false);
    if (movementAnimationRef.current) {
      cancelAnimationFrame(movementAnimationRef.current);
      movementAnimationRef.current = null;
    }
  };

  // Movement animation loop
  useEffect(() => {
    if (!isMovementPlaying || !currentMovement) {
      if (movementAnimationRef.current) {
        cancelAnimationFrame(movementAnimationRef.current);
        movementAnimationRef.current = null;
      }
      return;
    }

    const pattern = MOVEMENT_PATTERNS[currentMovement];
    if (!pattern?.keyframes?.length) return;

    const animate = () => {
      setMovementFrame(prev => {
        const nextFrame = prev + 1;
        if (nextFrame >= pattern.keyframes.length) {
          return pattern.loop ? 0 : prev; // Loop or stay at end
        }
        return nextFrame;
      });
      
      movementAnimationRef.current = requestAnimationFrame(animate);
    };

    const currentKeyframe = pattern.keyframes[movementFrame];
    const frameDelay = currentKeyframe ? currentKeyframe.duration / movementSpeed : 500;

    const timeoutId = setTimeout(() => {
      movementAnimationRef.current = requestAnimationFrame(animate);
    }, frameDelay);

    return () => {
      clearTimeout(timeoutId);
      if (movementAnimationRef.current) {
        cancelAnimationFrame(movementAnimationRef.current);
        movementAnimationRef.current = null;
      }
    };
  }, [isMovementPlaying, currentMovement, movementFrame, movementSpeed]);

  // Original animation loop for motion capture data
  useEffect(() => {
    if (!isPlaying || !animationData?.frames?.length || currentMovement) {
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
  }, [isPlaying, animationData?.frames?.length, currentMovement]);

  // Function to generate keypoints from movement angles
  const generateKeypointsFromAngles = (angles: JointAngles): any[] => {
    // Base position (center of canvas)
    const centerX = 200;
    const centerY = 200;
    
    // Convert angles to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    // Generate keypoints based on joint angles
    const keypoints = [];
    
    // Head (fixed relative to spine)
    const headX = centerX;
    const headY = centerY - 80 - Math.sin(toRad(angles.spine)) * 20;
    keypoints.push({ name: 'head', x: headX, y: headY, score: 1.0 });
    
    // Neck
    const neckX = centerX;
    const neckY = centerY - 60 - Math.sin(toRad(angles.spine)) * 15;
    keypoints.push({ name: 'neck', x: neckX, y: neckY, score: 1.0 });
    
    // Spine/torso
    const spineX = centerX + Math.sin(toRad(angles.spine)) * 30;
    const spineY = centerY + Math.cos(toRad(angles.spine)) * 30;
    keypoints.push({ name: 'spine', x: spineX, y: spineY, score: 1.0 });
    
    // Shoulders
    const shoulderWidth = 40;
    const leftShoulderX = neckX - shoulderWidth + Math.sin(toRad(angles.spine)) * 10;
    const leftShoulderY = neckY + 10 + Math.cos(toRad(angles.spine)) * 10;
    const rightShoulderX = neckX + shoulderWidth + Math.sin(toRad(angles.spine)) * 10;
    const rightShoulderY = neckY + 10 + Math.cos(toRad(angles.spine)) * 10;
    
    keypoints.push({ name: 'left_shoulder', x: leftShoulderX, y: leftShoulderY, score: 1.0 });
    keypoints.push({ name: 'right_shoulder', x: rightShoulderX, y: rightShoulderY, score: 1.0 });
    
    // Arms (shoulder elevation affects arm position)
    const armLength = 50;
    const leftElbowX = leftShoulderX + Math.cos(toRad(angles.shoulder - 90)) * armLength;
    const leftElbowY = leftShoulderY + Math.sin(toRad(angles.shoulder - 90)) * armLength;
    const rightElbowX = rightShoulderX + Math.cos(toRad(angles.shoulder + 90)) * armLength;
    const rightElbowY = rightShoulderY + Math.sin(toRad(angles.shoulder + 90)) * armLength;
    
    keypoints.push({ name: 'left_elbow', x: leftElbowX, y: leftElbowY, score: 1.0 });
    keypoints.push({ name: 'right_elbow', x: rightElbowX, y: rightElbowY, score: 1.0 });
    
    // Forearms
    const forearmLength = 45;
    const leftWristX = leftElbowX + Math.cos(toRad(angles.shoulder + angles.elbow - 90)) * forearmLength;
    const leftWristY = leftElbowY + Math.sin(toRad(angles.shoulder + angles.elbow - 90)) * forearmLength;
    const rightWristX = rightElbowX + Math.cos(toRad(angles.shoulder + angles.elbow + 90)) * forearmLength;
    const rightWristY = rightElbowY + Math.sin(toRad(angles.shoulder + angles.elbow + 90)) * forearmLength;
    
    keypoints.push({ name: 'left_wrist', x: leftWristX, y: leftWristY, score: 1.0 });
    keypoints.push({ name: 'right_wrist', x: rightWristX, y: rightWristY, score: 1.0 });
    
    // Hips
    const hipWidth = 35;
    const leftHipX = spineX - hipWidth;
    const leftHipY = spineY + 30;
    const rightHipX = spineX + hipWidth;
    const rightHipY = spineY + 30;
    
    keypoints.push({ name: 'left_hip', x: leftHipX, y: leftHipY, score: 1.0 });
    keypoints.push({ name: 'right_hip', x: rightHipX, y: rightHipY, score: 1.0 });
    
    // Thighs (hip angle affects thigh position)
    const thighLength = 60;
    const leftKneeX = leftHipX + Math.sin(toRad(angles.hip)) * thighLength;
    const leftKneeY = leftHipY + Math.cos(toRad(angles.hip)) * thighLength;
    const rightKneeX = rightHipX + Math.sin(toRad(angles.hip)) * thighLength;
    const rightKneeY = rightHipY + Math.cos(toRad(angles.hip)) * thighLength;
    
    keypoints.push({ name: 'left_knee', x: leftKneeX, y: leftKneeY, score: 1.0 });
    keypoints.push({ name: 'right_knee', x: rightKneeX, y: rightKneeY, score: 1.0 });
    
    // Shins (knee angle affects shin position)
    const shinLength = 55;
    const leftAnkleX = leftKneeX + Math.sin(toRad(angles.hip + angles.knee)) * shinLength;
    const leftAnkleY = leftKneeY + Math.cos(toRad(angles.hip + angles.knee)) * shinLength;
    const rightAnkleX = rightKneeX + Math.sin(toRad(angles.hip + angles.knee)) * shinLength;
    const rightAnkleY = rightKneeY + Math.cos(toRad(angles.hip + angles.knee)) * shinLength;
    
    keypoints.push({ name: 'left_ankle', x: leftAnkleX, y: leftAnkleY, score: 1.0 });
    keypoints.push({ name: 'right_ankle', x: rightAnkleX, y: rightAnkleY, score: 1.0 });
    
    // Feet (ankle angle affects foot position)
    const footLength = 25;
    const leftFootX = leftAnkleX + Math.cos(toRad(angles.ankle)) * footLength;
    const leftFootY = leftAnkleY + Math.sin(toRad(angles.ankle)) * footLength;
    const rightFootX = rightAnkleX + Math.cos(toRad(angles.ankle)) * footLength;
    const rightFootY = rightAnkleY + Math.sin(toRad(angles.ankle)) * footLength;
    
    keypoints.push({ name: 'left_foot', x: leftFootX, y: leftFootY, score: 1.0 });
    keypoints.push({ name: 'right_foot', x: rightFootX, y: rightFootY, score: 1.0 });
    
    return keypoints;
  };

  // Draw animation frame (handles both motion capture and movement patterns)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame;
    
    // Use movement pattern if active, otherwise use motion capture data
    if (currentMovement && visualizationMode === '2D') {
      const pattern = MOVEMENT_PATTERNS[currentMovement];
      if (pattern?.keyframes?.length > 0) {
        const currentKeyframe = pattern.keyframes[movementFrame] || pattern.keyframes[0];
        const keypoints = generateKeypointsFromAngles(currentKeyframe.angles);
        frame = { keypoints };
      }
    } else if (animationData?.frames?.length) {
      frame = animationData.frames[currentFrame];
    }
    
    if (frame && visualizationMode === '2D') {
      drawStickFigure(frame, ctx);
    }
  }, [currentFrame, animationData, currentMovement, movementFrame, visualizationMode]);

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
        const progress = i / (vertebraeCount - 1 || 1);
        const x = progress * length;
        
        // Vertebral body (centered on the spine line, perpendicular to spine direction)
        ctx.beginPath();
        ctx.roundRect(x - 5, -6, 10, 12, 2);
        ctx.fill();
        
        // Spinous process (pointing backward from vertebral body)
        ctx.beginPath();
        ctx.roundRect(x - 2, -2, 4, 8, 1);
        ctx.fill();
        
        // Add outline for each vertebra
        ctx.strokeStyle = isAffected ? '#dc2626' : '#8b5a2b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 5, -6, 10, 12, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(x - 2, -2, 4, 8, 1);
        ctx.stroke();
      }
      
      if (isAffected) {
        // Additional red highlighting for affected spine
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        for (let i = 0; i < vertebraeCount; i++) {
          const progress = i / (vertebraeCount - 1 || 1);
          const x = progress * length;
          ctx.beginPath();
          ctx.roundRect(x - 6, -7, 12, 14, 2);
          ctx.stroke();
        }
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

    // 1. Spine/Vertebrae - Draw directly without rotation
    if (neck && spine) {
      const isAffected = neck.status === 'limited' || spine.status === 'limited';
      
      // Draw spine vertebrae directly on canvas without rotation
      const spineLength = Math.sqrt((spine.x - neck.x) ** 2 + (spine.y - neck.y) ** 2);
      const vertebraeCount = Math.floor(spineLength / 15);
      
      // Set vertebrae color
      const boneColor = getBoneColor(neck, spine);
      const gradient = ctx.createLinearGradient(neck.x - 10, neck.y, neck.x + 10, neck.y);
      gradient.addColorStop(0, isAffected ? '#ffcccc' : '#ffffff');
      gradient.addColorStop(0.5, boneColor);
      gradient.addColorStop(1, '#d4af8a');
      ctx.fillStyle = gradient;
      
      // Draw individual vertebrae along the spine line
      for (let i = 0; i < vertebraeCount; i++) {
        const progress = i / (vertebraeCount - 1 || 1);
        const x = neck.x + (spine.x - neck.x) * progress;
        const y = neck.y + (spine.y - neck.y) * progress;
        
        // Vertebral body (centered on spine)
        ctx.beginPath();
        ctx.roundRect(x - 6, y - 5, 12, 10, 2);
        ctx.fill();
        
        // Spinous process
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, 4, 8, 1);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = isAffected ? '#dc2626' : '#8b5a2b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 6, y - 5, 12, 10, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, 4, 8, 1);
        ctx.stroke();
      }
      
      if (isAffected) {
        // Additional red highlighting for affected spine
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        for (let i = 0; i < vertebraeCount; i++) {
          const progress = i / (vertebraeCount - 1 || 1);
          const x = neck.x + (spine.x - neck.x) * progress;
          const y = neck.y + (spine.y - neck.y) * progress;
          ctx.beginPath();
          ctx.roundRect(x - 7, y - 6, 14, 12, 2);
          ctx.stroke();
        }
      }
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
      {/* Visualization Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <Button
            size="sm"
            variant={visualizationMode === '2D' ? 'default' : 'ghost'}
            onClick={() => setVisualizationMode('2D')}
            className="flex items-center gap-1"
          >
            <Grid3X3 className="h-4 w-4" />
            2D Bones
          </Button>
          <Button
            size="sm"
            variant={visualizationMode === '3D' ? 'default' : 'ghost'}
            onClick={() => setVisualizationMode('3D')}
            className="flex items-center gap-1"
          >
            <Box className="h-4 w-4" />
            3D Models
          </Button>
        </div>
      </div>

      {/* Visualization Display */}
      {visualizationMode === '2D' ? (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border border-gray-300 rounded-lg bg-white"
          />
        </div>
      ) : (
        <ThreeDAnatomicalVisualization
          animationData={animationData}
          currentFrame={currentFrame}
          isPlaying={isPlaying}
        />
      )}

      {/* Animation Info */}
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-600">
          {animationData?.source && (
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
              {animationData.source}
            </span>
          )}
          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-2">
            {visualizationMode === '3D' ? 'Medical-Grade 3D Models' : 'Anatomical 2D Bones'}
          </span>
          {animationData?.frames?.length > 0 ? (
            <span>Frame {currentFrame + 1} of {animationData.frames.length}</span>
          ) : (
            <span>No animation data available</span>
          )}
        </div>

        {/* Movement Pattern Controls (2D Mode Only) */}
        {visualizationMode === '2D' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-gray-700 mb-2">Functional Movements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto">
                <Button
                  size="sm"
                  variant={currentMovement === 'squat' ? "default" : "outline"}
                  onClick={() => startMovement('squat')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <ArrowDown className="h-4 w-4 mb-1" />
                  <span className="text-xs">Squat</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'walking' ? "default" : "outline"}
                  onClick={() => startMovement('walking')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Shuffle className="h-4 w-4 mb-1" />
                  <span className="text-xs">Walking</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'shoulder_elevation' ? "default" : "outline"}
                  onClick={() => startMovement('shoulder_elevation')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <ArrowUp className="h-4 w-4 mb-1" />
                  <span className="text-xs">Shoulder</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'spinal_flexion' ? "default" : "outline"}
                  onClick={() => startMovement('spinal_flexion')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <RotateCw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Spine</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'lunge' ? "default" : "outline"}
                  onClick={() => startMovement('lunge')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Target className="h-4 w-4 mb-1" />
                  <span className="text-xs">Lunge</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'reaching' ? "default" : "outline"}
                  onClick={() => startMovement('reaching')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Activity className="h-4 w-4 mb-1" />
                  <span className="text-xs">Reaching</span>
                </Button>
                <Button
                  size="sm"
                  variant={currentMovement === 'balance' ? "default" : "outline"}
                  onClick={() => startMovement('balance')}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <Zap className="h-4 w-4 mb-1" />
                  <span className="text-xs">Balance</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentMovement(null);
                    resetMovement();
                  }}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <RotateCcw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Clear</span>
                </Button>
              </div>
            </div>

            {/* Movement Controls */}
            {currentMovement && (
              <div className="space-y-3">
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMovementPlaying(!isMovementPlaying)}
                  >
                    {isMovementPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetMovement}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Movement Info */}
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">
                    {MOVEMENT_PATTERNS[currentMovement].name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {MOVEMENT_PATTERNS[currentMovement].keyframes[movementFrame]?.description || "Ready"}
                  </div>
                  <div className="text-xs text-blue-600 mt-2 max-w-md mx-auto">
                    {MOVEMENT_PATTERNS[currentMovement].clinicalNotes}
                  </div>
                </div>

                {/* Speed Control */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-500">Speed:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMovementSpeed(0.5)}
                    className={movementSpeed === 0.5 ? "bg-blue-100" : ""}
                  >
                    0.5x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMovementSpeed(1.0)}
                    className={movementSpeed === 1.0 ? "bg-blue-100" : ""}
                  >
                    1x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMovementSpeed(2.0)}
                    className={movementSpeed === 2.0 ? "bg-blue-100" : ""}
                  >
                    2x
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original Controls (for motion capture data) */}
        {(!currentMovement || visualizationMode === '3D') && (
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
        )}
      </div>
    </div>
  );
}

export default StickFigureAnimation;