import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Settings, Activity, Info } from 'lucide-react';

// Patient data interfaces
interface PatientAnthropometrics {
  height: number;
  weight: number;
  limbLengths: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
  };
}

interface JointRestrictions {
  shoulder: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  elbow: {
    flexion: number;
    extension: number;
  };
  hip: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  knee: {
    flexion: number;
    extension: number;
  };
}

interface FunctionalExercise {
  id: string;
  name: string;
  category: 'lower_body' | 'upper_body' | 'gait' | 'balance';
  description: string;
  duration: number;
  icon: string;
}

interface FallbackSkeletonViewerProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

// Functional exercises
const FUNCTIONAL_EXERCISES: FunctionalExercise[] = [
  { id: 'squat', name: 'Squat', category: 'lower_body', description: 'Hip and knee flexion exercise', duration: 3, icon: '🏋️' },
  { id: 'step_up', name: 'Step Up', category: 'lower_body', description: 'Unilateral leg strengthening', duration: 4, icon: '⬆️' },
  { id: 'step_down', name: 'Step Down', category: 'lower_body', description: 'Controlled eccentric movement', duration: 4, icon: '⬇️' },
  { id: 'lunge_forward', name: 'Forward Lunge', category: 'lower_body', description: 'Dynamic leg strengthening', duration: 4, icon: '🚶' },
  { id: 'lunge_side', name: 'Side Lunge', category: 'lower_body', description: 'Lateral movement pattern', duration: 4, icon: '↔️' },
  { id: 'elbow_flexion', name: 'Elbow Flexion', category: 'upper_body', description: 'Bicep strengthening exercise', duration: 3, icon: '💪' },
  { id: 'shoulder_flexion', name: 'Shoulder Flexion', category: 'upper_body', description: 'Forward arm raising', duration: 3, icon: '🙋' },
  { id: 'shoulder_abduction', name: 'Shoulder Abduction', category: 'upper_body', description: 'Lateral arm raising', duration: 3, icon: '🤸' },
  { id: 'walk_forward', name: 'Walk Forward', category: 'gait', description: 'Normal gait pattern', duration: 6, icon: '🚶‍♀️' },
  { id: 'walk_backward', name: 'Walk Backward', category: 'gait', description: 'Reverse gait pattern', duration: 6, icon: '🚶‍♂️' },
  { id: 'single_leg_stance', name: 'Single Leg Stance', category: 'balance', description: 'Balance challenge', duration: 5, icon: '🦵' }
];

// 2D Canvas skeleton renderer
const CanvasSkeleton: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentExercise: string | null;
  isPerformingExercise: boolean;
  exerciseProgress: number;
  painAreas: string[];
  showJointLimits: boolean;
  patientData?: any;
}> = ({ canvasRef, currentExercise, isPerformingExercise, exerciseProgress, painAreas, showJointLimits, patientData }) => {
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set canvas background
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate center and scale
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 400;
      
      // Get exercise animation values
      const getAnimation = () => {
        if (!isPerformingExercise || !currentExercise) return {};
        
        const phase = exerciseProgress * Math.PI * 2;
        const progress = exerciseProgress;
        
        switch (currentExercise) {
          case 'squat':
            const squatDepth = Math.sin(phase) * 30 * scale;
            return { bodyY: squatDepth, legAngle: Math.abs(squatDepth) * 0.3 };
            
          case 'shoulder_flexion':
            const shoulderFlex = Math.sin(phase) * 60;
            return { leftArmAngle: shoulderFlex, rightArmAngle: shoulderFlex };
            
          case 'shoulder_abduction':
            const shoulderAbd = Math.sin(phase) * 45;
            return { leftArmAbduction: shoulderAbd, rightArmAbduction: -shoulderAbd };
            
          case 'elbow_flexion':
            const elbowFlex = (Math.sin(phase) + 1) / 2 * 90;
            return { leftElbowAngle: elbowFlex, rightElbowAngle: elbowFlex };
            
          case 'lunge_forward':
            const lungeFlex = Math.sin(phase) * 20;
            return { leftLegAngle: lungeFlex, rightLegAngle: -lungeFlex * 0.8, bodyZ: Math.abs(lungeFlex) * 0.5 };
            
          case 'lunge_side':
            const sideLunge = Math.sin(phase) * 15;
            return { leftLegSide: sideLunge, rightLegSide: -sideLunge * 0.5, bodyX: sideLunge * 0.2 };
            
          case 'step_up':
            const stepHeight = Math.max(0, Math.sin(progress * Math.PI)) * 25;
            return { rightLegLift: stepHeight, bodyY: stepHeight * 0.3 };
            
          case 'step_down':
            const stepDown = Math.max(0, Math.sin(progress * Math.PI + Math.PI)) * 20;
            return { rightLegLift: -stepDown, bodyY: -stepDown * 0.2 };
            
          case 'walk_forward':
            const walkPhase = progress * Math.PI * 4;
            const leftStep = Math.sin(walkPhase) * 20;
            const rightStep = Math.sin(walkPhase + Math.PI) * 20;
            return { leftLegAngle: leftStep, rightLegAngle: rightStep, leftArmSwing: -leftStep * 0.5, rightArmSwing: -rightStep * 0.5 };
            
          case 'walk_backward':
            const backPhase = progress * Math.PI * 4;
            const leftBack = -Math.sin(backPhase) * 15;
            const rightBack = -Math.sin(backPhase + Math.PI) * 15;
            return { leftLegAngle: leftBack, rightLegAngle: rightBack, leftArmSwing: leftBack * 0.3, rightArmSwing: rightBack * 0.3 };
            
          case 'single_leg_stance':
            const sway = Math.sin(phase * 3) * 5;
            return { leftLegLift: 20, bodySway: sway, leftArmBalance: sway * 0.5, rightArmBalance: -sway * 0.5 };
            
          default:
            return {};
        }
      };
      
      const anim = getAnimation();
      
      // Draw skeleton
      ctx.strokeStyle = '#f4e6d7';
      ctx.fillStyle = '#f4e6d7';
      ctx.lineWidth = 8 * scale;
      ctx.lineCap = 'round';
      
      // Body position adjustments
      const bodyOffsetX = (anim.bodyX || 0) * scale + (anim.bodySway || 0) * scale;
      const bodyOffsetY = (anim.bodyY || 0) * scale;
      
      // Head
      ctx.beginPath();
      ctx.arc(centerX + bodyOffsetX, centerY - 150 * scale + bodyOffsetY, 25 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Neck
      ctx.beginPath();
      ctx.moveTo(centerX + bodyOffsetX, centerY - 125 * scale + bodyOffsetY);
      ctx.lineTo(centerX + bodyOffsetX, centerY - 110 * scale + bodyOffsetY);
      ctx.stroke();
      
      // Torso
      ctx.beginPath();
      ctx.moveTo(centerX + bodyOffsetX, centerY - 110 * scale + bodyOffsetY);
      ctx.lineTo(centerX + bodyOffsetX, centerY - 20 * scale + bodyOffsetY);
      ctx.stroke();
      
      // Left arm
      const leftArmAngle = (anim.leftArmAngle || 0) + (anim.leftArmSwing || 0) + (anim.leftArmBalance || 0);
      const leftArmAbduction = anim.leftArmAbduction || 0;
      const leftElbowAngle = anim.leftElbowAngle || 0;
      
      const leftShoulderX = centerX + bodyOffsetX - 20 * scale;
      const leftShoulderY = centerY - 90 * scale + bodyOffsetY;
      
      const leftElbowX = leftShoulderX - Math.cos((leftArmAngle + leftArmAbduction) * Math.PI / 180) * 40 * scale;
      const leftElbowY = leftShoulderY + Math.sin((leftArmAngle + leftArmAbduction) * Math.PI / 180) * 40 * scale;
      
      const leftHandX = leftElbowX - Math.cos((leftArmAngle + leftArmAbduction + leftElbowAngle) * Math.PI / 180) * 35 * scale;
      const leftHandY = leftElbowY + Math.sin((leftArmAngle + leftArmAbduction + leftElbowAngle) * Math.PI / 180) * 35 * scale;
      
      // Draw left arm
      ctx.beginPath();
      ctx.moveTo(leftShoulderX, leftShoulderY);
      ctx.lineTo(leftElbowX, leftElbowY);
      ctx.lineTo(leftHandX, leftHandY);
      ctx.stroke();
      
      // Right arm
      const rightArmAngle = (anim.rightArmAngle || 0) + (anim.rightArmSwing || 0) + (anim.rightArmBalance || 0);
      const rightArmAbduction = anim.rightArmAbduction || 0;
      const rightElbowAngle = anim.rightElbowAngle || 0;
      
      const rightShoulderX = centerX + bodyOffsetX + 20 * scale;
      const rightShoulderY = centerY - 90 * scale + bodyOffsetY;
      
      const rightElbowX = rightShoulderX + Math.cos((rightArmAngle + rightArmAbduction) * Math.PI / 180) * 40 * scale;
      const rightElbowY = rightShoulderY + Math.sin((rightArmAngle + rightArmAbduction) * Math.PI / 180) * 40 * scale;
      
      const rightHandX = rightElbowX + Math.cos((rightArmAngle + rightArmAbduction + rightElbowAngle) * Math.PI / 180) * 35 * scale;
      const rightHandY = rightElbowY + Math.sin((rightArmAngle + rightArmAbduction + rightElbowAngle) * Math.PI / 180) * 35 * scale;
      
      // Draw right arm
      ctx.beginPath();
      ctx.moveTo(rightShoulderX, rightShoulderY);
      ctx.lineTo(rightElbowX, rightElbowY);
      ctx.lineTo(rightHandX, rightHandY);
      ctx.stroke();
      
      // Left leg
      const leftLegAngle = (anim.leftLegAngle || 0) + (anim.leftLegSide || 0);
      const leftLegLift = anim.leftLegLift || 0;
      
      const leftHipX = centerX + bodyOffsetX - 15 * scale;
      const leftHipY = centerY - 20 * scale + bodyOffsetY;
      
      const leftKneeX = leftHipX + Math.sin(leftLegAngle * Math.PI / 180) * 50 * scale;
      const leftKneeY = leftHipY + 50 * scale - leftLegLift * scale;
      
      const leftFootX = leftKneeX + Math.sin(leftLegAngle * Math.PI / 180) * 45 * scale;
      const leftFootY = leftKneeY + 45 * scale;
      
      // Draw left leg
      ctx.beginPath();
      ctx.moveTo(leftHipX, leftHipY);
      ctx.lineTo(leftKneeX, leftKneeY);
      ctx.lineTo(leftFootX, leftFootY);
      ctx.stroke();
      
      // Right leg
      const rightLegAngle = (anim.rightLegAngle || 0) + (anim.rightLegSide || 0);
      const rightLegLift = anim.rightLegLift || 0;
      
      const rightHipX = centerX + bodyOffsetX + 15 * scale;
      const rightHipY = centerY - 20 * scale + bodyOffsetY;
      
      const rightKneeX = rightHipX + Math.sin(rightLegAngle * Math.PI / 180) * 50 * scale;
      const rightKneeY = rightHipY + 50 * scale - rightLegLift * scale;
      
      const rightFootX = rightKneeX + Math.sin(rightLegAngle * Math.PI / 180) * 45 * scale;
      const rightFootY = rightKneeY + 45 * scale;
      
      // Draw right leg
      ctx.beginPath();
      ctx.moveTo(rightHipX, rightHipY);
      ctx.lineTo(rightKneeX, rightKneeY);
      ctx.lineTo(rightFootX, rightFootY);
      ctx.stroke();
      
      // Draw joints
      ctx.fillStyle = '#e8dcc6';
      const joints = [
        { x: leftShoulderX, y: leftShoulderY, r: 8 * scale },
        { x: rightShoulderX, y: rightShoulderY, r: 8 * scale },
        { x: leftElbowX, y: leftElbowY, r: 6 * scale },
        { x: rightElbowX, y: rightElbowY, r: 6 * scale },
        { x: leftHipX, y: leftHipY, r: 8 * scale },
        { x: rightHipX, y: rightHipY, r: 8 * scale },
        { x: leftKneeX, y: leftKneeY, r: 6 * scale },
        { x: rightKneeX, y: rightKneeY, r: 6 * scale }
      ];
      
      joints.forEach(joint => {
        ctx.beginPath();
        ctx.arc(joint.x, joint.y, joint.r, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw pain areas
      if (painAreas.length > 0) {
        ctx.fillStyle = '#ff4444';
        painAreas.forEach((area, index) => {
          let x = centerX, y = centerY;
          switch (area.toLowerCase()) {
            case 'shoulder':
            case 'shoulders':
              x = index % 2 === 0 ? leftShoulderX : rightShoulderX;
              y = index % 2 === 0 ? leftShoulderY : rightShoulderY;
              break;
            case 'back':
            case 'spine':
              x = centerX + bodyOffsetX;
              y = centerY - 65 * scale + bodyOffsetY;
              break;
            case 'hip':
            case 'hips':
              x = index % 2 === 0 ? leftHipX : rightHipX;
              y = index % 2 === 0 ? leftHipY : rightHipY;
              break;
            case 'knee':
            case 'knees':
              x = index % 2 === 0 ? leftKneeX : rightKneeX;
              y = index % 2 === 0 ? leftKneeY : rightKneeY;
              break;
          }
          
          ctx.beginPath();
          ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Draw joint restrictions
      if (showJointLimits) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        
        // Shoulder restrictions
        ctx.beginPath();
        ctx.arc(leftShoulderX, leftShoulderY, 15 * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(rightShoulderX, rightShoulderY, 15 * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
      }
      
      // Exercise name
      if (isPerformingExercise && currentExercise) {
        ctx.fillStyle = '#3b82f6';
        ctx.font = `${20 * scale}px Arial`;
        ctx.textAlign = 'center';
        const exerciseName = FUNCTIONAL_EXERCISES.find(ex => ex.id === currentExercise)?.name || 'Exercise';
        ctx.fillText(exerciseName, centerX, centerY - 180 * scale);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [currentExercise, isPerformingExercise, exerciseProgress, painAreas, showJointLimits, patientData]);
  
  return null;
};

export default function FallbackSkeletonViewer({ patientData, className }: FallbackSkeletonViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showJointLimits, setShowJointLimits] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [isPerformingExercise, setIsPerformingExercise] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  
  // Animation loop
  useEffect(() => {
    if (!isPerformingExercise) return;
    
    const interval = setInterval(() => {
      setExerciseProgress(prev => (prev + 0.02 * animationSpeed) % 1);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPerformingExercise, animationSpeed]);
  
  // Auto rotation when not performing exercise
  useEffect(() => {
    if (isPerformingExercise || !isAnimating) return;
    
    const interval = setInterval(() => {
      setExerciseProgress(prev => (prev + 0.01 * animationSpeed) % 1);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isAnimating, isPerformingExercise, animationSpeed]);
  
  const handleExerciseStart = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setIsPerformingExercise(true);
    setExerciseProgress(0);
  };
  
  const handleExerciseStop = () => {
    setIsPerformingExercise(false);
    setSelectedExercise('');
    setExerciseProgress(0);
  };
  
  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);
  
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 2D Skeleton Viewer */}
        <div className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          <CanvasSkeleton
            canvasRef={canvasRef}
            currentExercise={selectedExercise}
            isPerformingExercise={isPerformingExercise}
            exerciseProgress={exerciseProgress}
            painAreas={patientData?.painAreas || []}
            showJointLimits={showJointLimits}
            patientData={patientData}
          />
        </div>
        
        {/* Control Panel */}
        <div className="space-y-4">
          {/* Animation Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Animation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="animation-toggle">Auto Rotate</Label>
                <Switch
                  id="animation-toggle"
                  checked={isAnimating}
                  onCheckedChange={setIsAnimating}
                />
              </div>
              
              {isAnimating && (
                <div>
                  <Label className="text-sm font-medium">Speed: {animationSpeed}x</Label>
                  <Slider
                    value={[animationSpeed]}
                    onValueChange={(value) => setAnimationSpeed(value[0])}
                    max={3}
                    min={0.1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label htmlFor="joint-limits">Show Joint Limits</Label>
                <Switch
                  id="joint-limits"
                  checked={showJointLimits}
                  onCheckedChange={setShowJointLimits}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Functional Movements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Functional Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(
                FUNCTIONAL_EXERCISES.reduce((acc, exercise) => {
                  if (!acc[exercise.category]) acc[exercise.category] = [];
                  acc[exercise.category].push(exercise);
                  return acc;
                }, {} as Record<string, FunctionalExercise[]>)
              ).map(([category, exercises]) => (
                <div key={category} className="space-y-2">
                  <Badge variant="outline" className="capitalize">
                    {category.replace('_', ' ')}
                  </Badge>
                  <div className="grid grid-cols-1 gap-2">
                    {exercises.map((exercise) => (
                      <Button
                        key={exercise.id}
                        variant={selectedExercise === exercise.id ? "default" : "outline"}
                        size="sm"
                        className="text-xs p-2 h-auto"
                        onClick={() => 
                          isPerformingExercise && selectedExercise === exercise.id
                            ? handleExerciseStop()
                            : handleExerciseStart(exercise.id)
                        }
                      >
                        <div className="text-left w-full">
                          <div className="font-medium">{exercise.name}</div>
                          <div className="text-xs opacity-70">{exercise.description}</div>
                        </div>
                        {isPerformingExercise && selectedExercise === exercise.id ? (
                          <Pause className="h-3 w-3 ml-1" />
                        ) : (
                          <Play className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              
              {isPerformingExercise && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-3"
                  onClick={handleExerciseStop}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Exercise
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Patient Info */}
          {patientData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Patient Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {patientData.anthropometrics && (
                  <div className="text-sm">
                    <p><strong>Height:</strong> {patientData.anthropometrics.height}cm</p>
                    <p><strong>Weight:</strong> {patientData.anthropometrics.weight}kg</p>
                  </div>
                )}
                
                {patientData.painAreas && patientData.painAreas.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Pain Areas:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patientData.painAreas.map((area, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}