import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Activity, Users } from 'lucide-react';
import * as THREE from 'three';

interface PoseFrame {
  timestamp: number;
  landmarks: any[];
  worldLandmarks: any[];
}

interface JointAngles {
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  spine: number;
}

interface MotionProcessorProps {
  motionData: PoseFrame[];
  onSkeletonUpdate?: (jointAngles: JointAngles, anthropometrics: any) => void;
  className?: string;
}

export default function MotionProcessor({ motionData, onSkeletonUpdate, className }: MotionProcessorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentJointAngles, setCurrentJointAngles] = useState<JointAngles | null>(null);
  const [estimatedAnthropometrics, setEstimatedAnthropometrics] = useState<any>(null);
  const [movementType, setMovementType] = useState<string>('unknown');

  // MoveNet pose landmark indices (17 keypoints)
  const MOVENET_LANDMARKS = {
    NOSE: 0,
    LEFT_EYE: 1,
    RIGHT_EYE: 2,
    LEFT_EAR: 3,
    RIGHT_EAR: 4,
    LEFT_SHOULDER: 5,
    RIGHT_SHOULDER: 6,
    LEFT_ELBOW: 7,
    RIGHT_ELBOW: 8,
    LEFT_WRIST: 9,
    RIGHT_WRIST: 10,
    LEFT_HIP: 11,
    RIGHT_HIP: 12,
    LEFT_KNEE: 13,
    RIGHT_KNEE: 14,
    LEFT_ANKLE: 15,
    RIGHT_ANKLE: 16
  };

  // Calculate angle between three points with safety checks
  const calculateAngle = (pointA: any, pointB: any, pointC: any): number => {
    if (!pointA || !pointB || !pointC) return 0;
    if (typeof pointA.x === 'undefined' || typeof pointB.x === 'undefined' || typeof pointC.x === 'undefined') return 0;
    
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y,
      z: (pointA.z || 0) - (pointB.z || 0)
    };
    
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y,
      z: (pointC.z || 0) - (pointB.z || 0)
    };
    
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;
    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y + vectorBA.z * vectorBA.z);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y + vectorBC.z * vectorBC.z);
    
    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
    
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const angle = Math.acos(clampedCos);
    
    return (angle * 180) / Math.PI;
  };

  // Calculate distance between two points with safety checks
  const calculateDistance = (pointA: any, pointB: any): number => {
    if (!pointA || !pointB) return 0;
    if (typeof pointA.x === 'undefined' || typeof pointB.x === 'undefined') return 0;
    
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    const dz = (pointA.z || 0) - (pointB.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Process pose landmarks to extract joint angles
  const processFrame = (frame: PoseFrame): JointAngles => {
    if (!frame || !frame.landmarks) {
      console.log('No frame or landmarks data');
      return { leftShoulder: 0, rightShoulder: 0, leftElbow: 0, rightElbow: 0, leftHip: 0, rightHip: 0, leftKnee: 0, rightKnee: 0, spine: 0 };
    }
    
    const landmarks = frame.landmarks;
    if (!landmarks || landmarks.length === 0) {
      console.log('Empty landmarks array');
      return { leftShoulder: 0, rightShoulder: 0, leftElbow: 0, rightElbow: 0, leftHip: 0, rightHip: 0, leftKnee: 0, rightKnee: 0, spine: 0 };
    }
    
    console.log('Processing frame with', landmarks.length, 'landmarks');
    console.log('Sample landmark:', landmarks[0]);
    
    // Extract key landmarks using MoveNet indices
    const getLandmark = (index: number) => {
      if (index >= 0 && index < landmarks.length && landmarks[index]) {
        const landmark = landmarks[index];
        // Check if it's a MoveNet keypoint structure
        if (landmark.x !== undefined && landmark.y !== undefined && landmark.score > 0.3) {
          return { x: landmark.x, y: landmark.y, z: landmark.z || 0 };
        }
      }
      return null;
    };
    
    const nose = getLandmark(MOVENET_LANDMARKS.NOSE);
    const leftShoulder = getLandmark(MOVENET_LANDMARKS.LEFT_SHOULDER);
    const rightShoulder = getLandmark(MOVENET_LANDMARKS.RIGHT_SHOULDER);
    const leftElbow = getLandmark(MOVENET_LANDMARKS.LEFT_ELBOW);
    const rightElbow = getLandmark(MOVENET_LANDMARKS.RIGHT_ELBOW);
    const leftWrist = getLandmark(MOVENET_LANDMARKS.LEFT_WRIST);
    const rightWrist = getLandmark(MOVENET_LANDMARKS.RIGHT_WRIST);
    const leftHip = getLandmark(MOVENET_LANDMARKS.LEFT_HIP);
    const rightHip = getLandmark(MOVENET_LANDMARKS.RIGHT_HIP);
    const leftKnee = getLandmark(MOVENET_LANDMARKS.LEFT_KNEE);
    const rightKnee = getLandmark(MOVENET_LANDMARKS.RIGHT_KNEE);
    const leftAnkle = getLandmark(MOVENET_LANDMARKS.LEFT_ANKLE);
    const rightAnkle = getLandmark(MOVENET_LANDMARKS.RIGHT_ANKLE);
    
    console.log('Extracted landmarks:', { leftShoulder, rightShoulder, leftElbow, rightElbow });

    // Calculate joint angles with proper null checks
    const jointAngles: JointAngles = {
      leftShoulder: leftElbow && leftShoulder && leftHip ? calculateAngle(leftElbow, leftShoulder, leftHip) : 0,
      rightShoulder: rightElbow && rightShoulder && rightHip ? calculateAngle(rightElbow, rightShoulder, rightHip) : 0,
      leftElbow: leftShoulder && leftElbow && leftWrist ? calculateAngle(leftShoulder, leftElbow, leftWrist) : 0,
      rightElbow: rightShoulder && rightElbow && rightWrist ? calculateAngle(rightShoulder, rightElbow, rightWrist) : 0,
      leftHip: leftShoulder && leftHip && leftKnee ? calculateAngle(leftShoulder, leftHip, leftKnee) : 0,
      rightHip: rightShoulder && rightHip && rightKnee ? calculateAngle(rightShoulder, rightHip, rightKnee) : 0,
      leftKnee: leftHip && leftKnee && leftAnkle ? calculateAngle(leftHip, leftKnee, leftAnkle) : 0,
      rightKnee: rightHip && rightKnee && rightAnkle ? calculateAngle(rightHip, rightKnee, rightAnkle) : 0,
      spine: leftShoulder && rightShoulder && leftHip && rightHip ? 
        calculateAngle(
          { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2, z: 0 },
          { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2, z: 0 },
          nose || { x: 0, y: 0, z: 0 }
        ) : 0
    };
    
    console.log('Calculated joint angles:', jointAngles);

    return jointAngles;
  };

  // Estimate anthropometric measurements from pose data
  const estimateAnthropometrics = () => {
    if (motionData.length === 0) return null;

    // Use first frame for measurements
    const landmarks = motionData[0].landmarks || [];
    
    if (!landmarks || landmarks.length === 0) return null;
    
    // Extract key landmarks using MoveNet indices
    const getLandmark = (index: number) => {
      if (index >= 0 && index < landmarks.length && landmarks[index]) {
        const landmark = landmarks[index];
        if (landmark.x !== undefined && landmark.y !== undefined) {
          return { x: landmark.x, y: landmark.y, z: landmark.z || 0 };
        }
      }
      return null;
    };
    
    const leftShoulder = getLandmark(MOVENET_LANDMARKS.LEFT_SHOULDER);
    const rightShoulder = getLandmark(MOVENET_LANDMARKS.RIGHT_SHOULDER);
    const leftElbow = getLandmark(MOVENET_LANDMARKS.LEFT_ELBOW);
    const rightElbow = getLandmark(MOVENET_LANDMARKS.RIGHT_ELBOW);
    const leftWrist = getLandmark(MOVENET_LANDMARKS.LEFT_WRIST);
    const rightWrist = getLandmark(MOVENET_LANDMARKS.RIGHT_WRIST);
    const leftHip = getLandmark(MOVENET_LANDMARKS.LEFT_HIP);
    const rightHip = getLandmark(MOVENET_LANDMARKS.RIGHT_HIP);
    const leftKnee = getLandmark(MOVENET_LANDMARKS.LEFT_KNEE);
    const rightKnee = getLandmark(MOVENET_LANDMARKS.RIGHT_KNEE);
    const leftAnkle = getLandmark(MOVENET_LANDMARKS.LEFT_ANKLE);
    const rightAnkle = getLandmark(MOVENET_LANDMARKS.RIGHT_ANKLE);
    const nose = getLandmark(MOVENET_LANDMARKS.NOSE);

    // Calculate limb lengths with safety checks
    const upperArmLength = (calculateDistance(leftShoulder, leftElbow) + calculateDistance(rightShoulder, rightElbow)) / 2;
    const forearmLength = (calculateDistance(leftElbow, leftWrist) + calculateDistance(rightElbow, rightWrist)) / 2;
    const thighLength = (calculateDistance(leftHip, leftKnee) + calculateDistance(rightHip, rightKnee)) / 2;
    const shinLength = (calculateDistance(leftKnee, leftAnkle) + calculateDistance(rightKnee, rightAnkle)) / 2;
    
    // Estimate total height with null checks
    const totalHeight = nose && leftAnkle && rightAnkle ? 
      calculateDistance(nose, { 
        x: (leftAnkle.x + rightAnkle.x) / 2, 
        y: (leftAnkle.y + rightAnkle.y) / 2, 
        z: 0
      }) : 0;

    // Convert to realistic measurements (MediaPipe uses normalized coordinates)
    const heightScale = 170; // Assume average height for scaling
    
    return {
      height: heightScale,
      weight: 70, // Default weight
      limbLengths: {
        upperArm: Math.round(upperArmLength * 100), // Convert to cm
        forearm: Math.round(forearmLength * 100),
        thigh: Math.round(thighLength * 100),
        shin: Math.round(shinLength * 100)
      }
    };
  };

  // Analyze movement type based on joint patterns
  const analyzeMovementType = () => {
    if (motionData.length < 10) return 'unknown';

    let maxKneeFlexion = 0;
    let avgHipFlexion = 0;
    let spineMovement = 0;

    motionData.forEach(frame => {
      const angles = processFrame(frame);
      maxKneeFlexion = Math.max(maxKneeFlexion, Math.max(180 - angles.leftKnee, 180 - angles.rightKnee));
      avgHipFlexion += (180 - angles.leftHip + 180 - angles.rightHip) / 2;
      spineMovement += Math.abs(angles.spine - 180);
    });

    avgHipFlexion /= motionData.length;
    spineMovement /= motionData.length;

    // Classify movement based on patterns
    if (maxKneeFlexion > 60 && avgHipFlexion > 30) {
      return 'squat';
    } else if (maxKneeFlexion > 45 && spineMovement > 10) {
      return 'lunge';
    } else if (spineMovement > 20) {
      return 'bend';
    } else if (maxKneeFlexion < 20) {
      return 'reach';
    }
    
    return 'general movement';
  };

  // Initialize analysis when motion data changes
  useEffect(() => {
    if (motionData && motionData.length > 0) {
      try {
        console.log('Initializing motion analysis with', motionData.length, 'frames');
        console.log('First frame sample:', motionData[0]);
        const anthropometrics = estimateAnthropometrics();
        setEstimatedAnthropometrics(anthropometrics);
        setMovementType(analyzeMovementType());
        setCurrentFrame(0);
        
        // Process first frame immediately
        const initialJointAngles = processFrame(motionData[0]);
        console.log('Initial joint angles:', initialJointAngles);
        setCurrentJointAngles(initialJointAngles);
      } catch (error) {
        console.error('Error analyzing motion data:', error);
        setEstimatedAnthropometrics(null);
        setMovementType('unknown');
      }
    }
  }, [motionData]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || motionData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        if (nextFrame >= motionData.length) {
          setIsPlaying(false);
          return 0;
        }
        return nextFrame;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, motionData.length, playbackSpeed]);

  // Update skeleton when frame changes
  useEffect(() => {
    if (motionData && motionData.length > 0 && currentFrame < motionData.length) {
      try {
        console.log('Processing frame', currentFrame, 'of', motionData.length);
        const jointAngles = processFrame(motionData[currentFrame]);
        console.log('Setting joint angles:', jointAngles);
        setCurrentJointAngles(jointAngles);
        
        if (onSkeletonUpdate) {
          onSkeletonUpdate(jointAngles, estimatedAnthropometrics);
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }
  }, [currentFrame, motionData, estimatedAnthropometrics, onSkeletonUpdate]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPlayback = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleFrameChange = (value: number[]) => {
    setCurrentFrame(value[0]);
    setIsPlaying(false);
  };

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
  };

  if (motionData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No motion data available</p>
            <p className="text-sm">Record patient movement to see analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Virtual Patient Motion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Motion Analysis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{motionData.length}</div>
            <div className="text-xs text-muted-foreground">Frames</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(motionData[motionData.length - 1]?.timestamp / 1000 || 0)}s</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="w-full justify-center">
              {movementType}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Movement Type</div>
          </div>
          <div className="text-center">
            <Badge variant={currentJointAngles ? "default" : "secondary"} className="w-full justify-center">
              {currentJointAngles ? "Active" : "Inactive"}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Virtual Patient</div>
          </div>
        </div>

        {/* Estimated Measurements */}
        {estimatedAnthropometrics && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Estimated Patient Measurements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>Upper Arm: {estimatedAnthropometrics.limbLengths.upperArm}cm</div>
              <div>Forearm: {estimatedAnthropometrics.limbLengths.forearm}cm</div>
              <div>Thigh: {estimatedAnthropometrics.limbLengths.thigh}cm</div>
              <div>Shin: {estimatedAnthropometrics.limbLengths.shin}cm</div>
            </div>
          </div>
        )}

        {/* Current Joint Angles */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Joint Angles (degrees)</h3>
          {currentJointAngles ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Shoulder</div>
                <div className="text-lg font-bold text-blue-600">{Math.round(currentJointAngles.leftShoulder)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Shoulder</div>
                <div className="text-lg font-bold text-blue-600">{Math.round(currentJointAngles.rightShoulder)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Elbow</div>
                <div className="text-lg font-bold text-green-600">{Math.round(currentJointAngles.leftElbow)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Elbow</div>
                <div className="text-lg font-bold text-green-600">{Math.round(currentJointAngles.rightElbow)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Knee</div>
                <div className="text-lg font-bold text-purple-600">{Math.round(currentJointAngles.leftKnee)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Knee</div>
                <div className="text-lg font-bold text-purple-600">{Math.round(currentJointAngles.rightKnee)}°</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4">
              No joint angle data - press play to start analysis
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={togglePlayback} size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={resetPlayback} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Frame {currentFrame + 1} of {motionData.length}
            </div>
          </div>

          {/* Frame Slider */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Frame Position</div>
            <Slider
              value={[currentFrame]}
              onValueChange={handleFrameChange}
              max={motionData.length - 1}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Playback Speed: {playbackSpeed}x</div>
            <Slider
              value={[playbackSpeed]}
              onValueChange={handleSpeedChange}
              max={3}
              min={0.25}
              step={0.25}
              className="w-full"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Virtual Patient Controls:</strong></p>
          <p>• Use playback controls to animate the virtual patient</p>
          <p>• Estimated measurements are calculated from pose data</p>
          <p>• Joint angles update in real-time during playback</p>
          <p>• Movement type is automatically classified</p>
        </div>
      </CardContent>
    </Card>
  );
}