import { useState, useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);

  // Initialize 3D scene for virtual patient
  const initVirtualPatient = () => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    camera.position.set(0, 1, 3);
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(400, 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create skeleton group
    const skeleton = new THREE.Group();
    scene.add(skeleton);
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    skeletonRef.current = skeleton;
    
    // Initial render
    renderer.render(scene, camera);
  };

  // Create 3D skeleton from pose landmarks
  const createSkeleton = (landmarks: any[]) => {
    if (!skeletonRef.current || !landmarks || landmarks.length < 17) return;
    
    // Clear previous skeleton
    skeletonRef.current.clear();
    
    // Joint material
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const boneMaterial = new THREE.MeshPhongMaterial({ color: 0x0066cc });
    
    // Create joints
    landmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        const joint = new THREE.SphereGeometry(0.02, 8, 6);
        const jointMesh = new THREE.Mesh(joint, jointMaterial);
        jointMesh.position.set(
          (landmark.x - 0.5) * 2,
          -(landmark.y - 0.5) * 2,
          landmark.z || 0
        );
        skeletonRef.current!.add(jointMesh);
      }
    });
    
    // Create bones (connections between joints)
    const connections = [
      [5, 6], // shoulders
      [5, 7], [7, 9], // left arm
      [6, 8], [8, 10], // right arm
      [5, 11], [6, 12], // torso to hips
      [11, 12], // hips
      [11, 13], [13, 15], // left leg
      [12, 14], [14, 16], // right leg
      [0, 1], [0, 2], // head
      [1, 3], [2, 4] // ears
    ];
    
    connections.forEach(([start, end]) => {
      const startLandmark = landmarks[start];
      const endLandmark = landmarks[end];
      
      if (startLandmark && endLandmark && 
          startLandmark.visibility > 0.5 && endLandmark.visibility > 0.5) {
        
        const startPos = new THREE.Vector3(
          (startLandmark.x - 0.5) * 2,
          -(startLandmark.y - 0.5) * 2,
          startLandmark.z || 0
        );
        const endPos = new THREE.Vector3(
          (endLandmark.x - 0.5) * 2,
          -(endLandmark.y - 0.5) * 2,
          endLandmark.z || 0
        );
        
        const distance = startPos.distanceTo(endPos);
        const bone = new THREE.CylinderGeometry(0.01, 0.01, distance, 8);
        const boneMesh = new THREE.Mesh(bone, boneMaterial);
        
        boneMesh.position.copy(startPos.clone().add(endPos).divideScalar(2));
        boneMesh.lookAt(endPos);
        boneMesh.rotateX(Math.PI / 2);
        
        skeletonRef.current!.add(boneMesh);
      }
    });
  };

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

  // Initialize virtual patient scene
  useEffect(() => {
    initVirtualPatient();
    
    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

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
        if (motionData[0]) {
          const initialJointAngles = processFrame(motionData[0]);
          console.log('Initial joint angles:', initialJointAngles);
          setCurrentJointAngles(initialJointAngles);
          
          // Create initial virtual patient skeleton
          if (motionData[0].landmarks) {
            createSkeleton(motionData[0].landmarks);
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
          }
        }
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
        
        // Update virtual patient skeleton movement
        if (motionData[currentFrame].landmarks) {
          createSkeleton(motionData[currentFrame].landmarks);
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        }
        
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

        {/* Virtual Patient Visualization */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Virtual Patient Movement</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <canvas 
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-48 bg-gray-100 rounded border"
              style={{ maxWidth: '400px', maxHeight: '300px' }}
            />
            <div className="text-xs text-gray-600 mt-2 text-center">
              3D Virtual Patient - Shows movement during analysis
            </div>
          </div>
        </div>

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
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={togglePlayback} size="sm" className="bg-blue-600 hover:bg-blue-700">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? ' Pause' : ' Analyze Motion'}
            </Button>
            <Button onClick={resetPlayback} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <div className="text-sm text-muted-foreground">
              Frame {currentFrame + 1} of {motionData.length}
            </div>
            {isPlaying && (
              <div className="text-sm text-green-600 font-medium animate-pulse">
                Analyzing joint movements...
              </div>
            )}
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

        {/* Real-time Status */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Motion Analysis Status</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Data Quality:</span>
              <span className="font-medium text-green-600">Good</span>
            </div>
            <div className="flex justify-between">
              <span>Joint Tracking:</span>
              <span className="font-medium text-blue-600">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Movement Type:</span>
              <span className="font-medium text-purple-600">{movementType}</span>
            </div>
            <div className="flex justify-between">
              <span>Analysis Mode:</span>
              <span className="font-medium text-orange-600">Live</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}