import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JointPosition {
  x: number;
  y: number;
}

interface Skeleton {
  head: JointPosition;
  neck: JointPosition;
  leftShoulder: JointPosition;
  rightShoulder: JointPosition;
  leftElbow: JointPosition;
  rightElbow: JointPosition;
  leftWrist: JointPosition;
  rightWrist: JointPosition;
  spine: JointPosition;
  leftHip: JointPosition;
  rightHip: JointPosition;
  leftKnee: JointPosition;
  rightKnee: JointPosition;
  leftAnkle: JointPosition;
  rightAnkle: JointPosition;
}

interface AnimationFrame {
  skeleton: Skeleton;
  timestamp: number;
}

interface StickFigureAnimationProps {
  clinicalDescription?: string;
  bodyPart?: string;
  className?: string;
}

export function StickFigureAnimation({ 
  clinicalDescription = "", 
  bodyPart = "general",
  className = ""
}: StickFigureAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationFrames, setAnimationFrames] = useState<AnimationFrame[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customDescription, setCustomDescription] = useState(clinicalDescription);
  const [animationSpeed, setAnimationSpeed] = useState(60); // FPS
  const { toast } = useToast();

  // Generate realistic animation frames based on clinical description
  const generateAnimationFromDescription = (description: string, bodyPartTarget: string) => {
    console.log('Generating animation for:', description, bodyPartTarget);
    
    // Default neutral standing position
    const neutralSkeleton: Skeleton = {
      head: { x: 200, y: 60 },
      neck: { x: 200, y: 80 },
      leftShoulder: { x: 180, y: 100 },
      rightShoulder: { x: 220, y: 100 },
      leftElbow: { x: 170, y: 140 },
      rightElbow: { x: 230, y: 140 },
      leftWrist: { x: 165, y: 180 },
      rightWrist: { x: 235, y: 180 },
      spine: { x: 200, y: 160 },
      leftHip: { x: 185, y: 220 },
      rightHip: { x: 215, y: 220 },
      leftKnee: { x: 180, y: 280 },
      rightKnee: { x: 220, y: 280 },
      leftAnkle: { x: 175, y: 340 },
      rightAnkle: { x: 225, y: 340 }
    };

    const frames: AnimationFrame[] = [];
    const frameCount = 120; // 2 seconds at 60 FPS

    // Analyze description for movement type and restrictions
    const desc = description.toLowerCase();
    const isShoulderRelated = bodyPartTarget === 'shoulder' || desc.includes('shoulder') || desc.includes('arm');
    const isBackRelated = bodyPartTarget === 'back' || desc.includes('back') || desc.includes('spine');
    const isKneeRelated = bodyPartTarget === 'knee' || desc.includes('knee');
    const hasRestriction = desc.includes('limited') || desc.includes('restricted') || desc.includes('pain') || desc.includes('stiff');
    const hasCompensation = desc.includes('compensat') || desc.includes('favoring') || desc.includes('avoiding');

    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount;
      const frame = JSON.parse(JSON.stringify(neutralSkeleton)); // Deep clone

      if (isShoulderRelated) {
        // Shoulder elevation movement with potential restrictions
        const maxElevation = hasRestriction ? 45 : 120; // Degrees
        const shoulderAngle = Math.sin(t * Math.PI * 2) * maxElevation;
        
        // Right shoulder elevation
        const shoulderRad = (shoulderAngle * Math.PI) / 180;
        frame.rightElbow.x = frame.rightShoulder.x + 40 * Math.cos(shoulderRad + Math.PI/2);
        frame.rightElbow.y = frame.rightShoulder.y + 40 * Math.sin(shoulderRad + Math.PI/2);
        frame.rightWrist.x = frame.rightElbow.x + 35 * Math.cos(shoulderRad + Math.PI/2);
        frame.rightWrist.y = frame.rightElbow.y + 35 * Math.sin(shoulderRad + Math.PI/2);

        // Add compensation if present
        if (hasCompensation && hasRestriction) {
          // Compensatory trunk lean
          const compensation = Math.sin(t * Math.PI * 2) * 15;
          frame.spine.x += compensation;
          frame.neck.x += compensation;
          frame.head.x += compensation;
        }
      }

      if (isBackRelated) {
        // Spinal flexion/extension movement
        const maxFlexion = hasRestriction ? 20 : 45; // Degrees
        const spinalAngle = Math.sin(t * Math.PI * 2) * maxFlexion;
        
        // Forward bending motion
        const bend = (spinalAngle * Math.PI) / 180;
        frame.head.y = neutralSkeleton.head.y + Math.sin(bend) * 20;
        frame.neck.y = neutralSkeleton.neck.y + Math.sin(bend) * 15;
        frame.spine.y = neutralSkeleton.spine.y + Math.sin(bend) * 10;

        // Add protective guarding if restricted
        if (hasRestriction) {
          const guarding = Math.abs(Math.sin(t * Math.PI * 4)) * 5;
          frame.leftShoulder.y += guarding;
          frame.rightShoulder.y += guarding;
        }
      }

      if (isKneeRelated) {
        // Knee flexion movement with gait simulation
        const walkCycle = Math.sin(t * Math.PI * 4); // Walking pattern
        const flexionAngle = hasRestriction ? 30 : 60; // Degrees
        
        // Right knee flexion during gait
        const kneeAngle = walkCycle * flexionAngle;
        const kneeRad = (kneeAngle * Math.PI) / 180;
        
        frame.rightKnee.y = neutralSkeleton.rightKnee.y - Math.sin(kneeRad) * 15;
        frame.rightAnkle.y = neutralSkeleton.rightAnkle.y - Math.sin(kneeRad) * 25;

        // Compensatory hip hiking if restricted
        if (hasCompensation) {
          frame.rightHip.y -= Math.abs(walkCycle) * 8;
        }
      }

      // Add subtle breathing motion to all animations
      const breathingCycle = Math.sin(t * Math.PI * 6) * 2; // Breathing rate
      frame.leftShoulder.y += breathingCycle;
      frame.rightShoulder.y += breathingCycle;
      frame.spine.y += breathingCycle * 0.5;

      frames.push({
        skeleton: frame,
        timestamp: i * (1000 / 60) // 60 FPS
      });
    }

    return frames;
  };

  // Draw stick figure on canvas
  const drawStickFigure = (skeleton: Skeleton, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 400);
    
    // Set drawing style
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#2563eb';

    // Draw head
    ctx.beginPath();
    ctx.arc(skeleton.head.x, skeleton.head.y, 15, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw body lines
    const connections = [
      [skeleton.head, skeleton.neck],
      [skeleton.neck, skeleton.leftShoulder],
      [skeleton.neck, skeleton.rightShoulder],
      [skeleton.leftShoulder, skeleton.leftElbow],
      [skeleton.leftElbow, skeleton.leftWrist],
      [skeleton.rightShoulder, skeleton.rightElbow],
      [skeleton.rightElbow, skeleton.rightWrist],
      [skeleton.neck, skeleton.spine],
      [skeleton.spine, skeleton.leftHip],
      [skeleton.spine, skeleton.rightHip],
      [skeleton.leftHip, skeleton.leftKnee],
      [skeleton.leftKnee, skeleton.leftAnkle],
      [skeleton.rightHip, skeleton.rightKnee],
      [skeleton.rightKnee, skeleton.rightAnkle]
    ];

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    // Draw joints as small circles
    const joints = Object.values(skeleton);
    joints.forEach(joint => {
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || animationFrames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % animationFrames.length);
    }, 1000 / animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, animationFrames.length, animationSpeed]);

  // Draw current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || animationFrames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = animationFrames[currentFrame];
    drawStickFigure(frame.skeleton, ctx);
  }, [currentFrame, animationFrames]);

  // Generate animation from text
  const handleGenerateAnimation = async () => {
    if (!customDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a clinical description to generate animation",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setIsPlaying(false);

    try {
      // Generate client-side animation
      const frames = generateAnimationFromDescription(customDescription, bodyPart);
      setAnimationFrames(frames);
      setCurrentFrame(0);
      
      toast({
        title: "Animation Generated",
        description: "Stick figure animation created from clinical description",
      });
    } catch (error) {
      console.error('Error generating animation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate animation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (animationFrames.length === 0) {
      handleGenerateAnimation();
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Stick Figure Animation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clinical Description Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Clinical Description</label>
          <Textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Describe the movement or condition (e.g., 'Patient has limited shoulder elevation with compensatory trunk lean')"
            rows={3}
          />
        </div>

        {/* Animation Canvas */}
        <div className="flex justify-center">
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="bg-white rounded border"
            />
          </div>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              disabled={isGenerating || animationFrames.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <Button
              onClick={handleGenerateAnimation}
              variant="default"
              size="sm"
              disabled={isGenerating || !customDescription.trim()}
            >
              Generate Animation
            </Button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Speed:</label>
            <input
              type="range"
              min="30"
              max="120"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="w-16"
            />
            <span className="text-sm text-gray-600">{animationSpeed}fps</span>
          </div>
        </div>

        {/* Animation Info */}
        {animationFrames.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Frame {currentFrame + 1} of {animationFrames.length} | 
            Body Part: {bodyPart} | 
            Duration: {(animationFrames.length / animationSpeed).toFixed(1)}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}