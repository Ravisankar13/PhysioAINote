import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
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

interface MovementAbnormality {
  type: 'knee_valgus' | 'trendelenburg' | 'forward_head' | 'ankle_pronation' | 'hip_drop' | 'pelvic_tilt';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  timestamp: number;
  affectedSide: 'left' | 'right' | 'bilateral';
  angle?: number;
  normalRange?: string;
  clinicalSignificance: string;
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
  const [detectedAbnormalities, setDetectedAbnormalities] = useState<MovementAbnormality[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);

  // Movement abnormality detection functions
  const detectKneeValgus = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    // Get hip, knee, and ankle positions for both sides
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return abnormalities;
    }
    
    // Calculate knee valgus angle for each leg
    const calculateValgusAngle = (hip: any, knee: any, ankle: any) => {
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      
      const angle = Math.atan2(
        hipKneeVector.x * kneeAnkleVector.y - hipKneeVector.y * kneeAnkleVector.x,
        hipKneeVector.x * kneeAnkleVector.x + hipKneeVector.y * kneeAnkleVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftValgusAngle = calculateValgusAngle(leftHip, leftKnee, leftAnkle);
    const rightValgusAngle = calculateValgusAngle(rightHip, rightKnee, rightAnkle);
    
    // Check for abnormal valgus (normal is typically < 10 degrees)
    if (leftValgusAngle > 15) {
      const severity = leftValgusAngle > 25 ? 'severe' : leftValgusAngle > 20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_valgus',
        severity,
        description: `Left knee valgus detected (${leftValgusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftValgusAngle,
        normalRange: '< 10°',
        clinicalSignificance: 'May indicate hip weakness, poor movement control, or increased injury risk'
      });
    }
    
    if (rightValgusAngle > 15) {
      const severity = rightValgusAngle > 25 ? 'severe' : rightValgusAngle > 20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_valgus',
        severity,
        description: `Right knee valgus detected (${rightValgusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightValgusAngle,
        normalRange: '< 10°',
        clinicalSignificance: 'May indicate hip weakness, poor movement control, or increased injury risk'
      });
    }
    
    return abnormalities;
  };

  const detectTrendelenburg = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return abnormalities;
    
    // Calculate hip height difference
    const hipHeightDiff = Math.abs(leftHip.y - rightHip.y);
    const normalThreshold = 0.03; // 3cm difference threshold
    
    if (hipHeightDiff > normalThreshold) {
      const severity = hipHeightDiff > 0.06 ? 'severe' : hipHeightDiff > 0.04 ? 'moderate' : 'mild';
      const affectedSide = leftHip.y > rightHip.y ? 'right' : 'left';
      
      abnormalities.push({
        type: 'trendelenburg',
        severity,
        description: `Trendelenburg gait pattern - ${affectedSide} hip drop detected`,
        timestamp,
        affectedSide,
        angle: hipHeightDiff * 100, // Convert to percentage
        normalRange: '< 3cm difference',
        clinicalSignificance: 'Indicates hip abductor weakness, may lead to compensatory patterns'
      });
    }
    
    return abnormalities;
  };

  const detectForwardHead = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!nose || !leftShoulder || !rightShoulder) return abnormalities;
    
    // Calculate shoulder midpoint
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    // Calculate forward head angle
    const headForwardDistance = nose.x - shoulderMidpoint.x;
    const verticalDistance = Math.abs(nose.y - shoulderMidpoint.y);
    const forwardHeadAngle = Math.atan(headForwardDistance / verticalDistance) * (180 / Math.PI);
    
    if (Math.abs(forwardHeadAngle) > 15) {
      const severity = Math.abs(forwardHeadAngle) > 30 ? 'severe' : Math.abs(forwardHeadAngle) > 22 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'forward_head',
        severity,
        description: `Forward head posture detected (${Math.abs(forwardHeadAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(forwardHeadAngle),
        normalRange: '< 15°',
        clinicalSignificance: 'May cause neck strain, headaches, and upper cervical dysfunction'
      });
    }
    
    return abnormalities;
  };

  const detectPelvicTilt = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return abnormalities;
    
    // Calculate pelvic tilt angle
    const pelvicTiltAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * (180 / Math.PI);
    
    if (Math.abs(pelvicTiltAngle) > 5) {
      const severity = Math.abs(pelvicTiltAngle) > 15 ? 'severe' : Math.abs(pelvicTiltAngle) > 10 ? 'moderate' : 'mild';
      const direction = pelvicTiltAngle > 0 ? 'right elevation' : 'left elevation';
      
      abnormalities.push({
        type: 'pelvic_tilt',
        severity,
        description: `Pelvic tilt detected - ${direction} (${Math.abs(pelvicTiltAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: pelvicTiltAngle > 0 ? 'right' : 'left',
        angle: Math.abs(pelvicTiltAngle),
        normalRange: '< 5°',
        clinicalSignificance: 'May indicate muscle imbalances, leg length discrepancy, or compensatory patterns'
      });
    }
    
    return abnormalities;
  };

  // Comprehensive abnormality analysis
  const analyzeMovementAbnormalities = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const allAbnormalities: MovementAbnormality[] = [];
    
    allAbnormalities.push(...detectKneeValgus(landmarks, timestamp));
    allAbnormalities.push(...detectTrendelenburg(landmarks, timestamp));
    allAbnormalities.push(...detectForwardHead(landmarks, timestamp));
    allAbnormalities.push(...detectPelvicTilt(landmarks, timestamp));
    
    return allAbnormalities;
  };

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
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // Initial render
    renderer.render(scene, camera);
  };

  // Create 3D skeleton from pose landmarks
  const createSkeleton = (landmarks: any[]) => {
    console.log('Creating skeleton with landmarks:', landmarks.length);
    
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) {
      console.log('Missing 3D scene components');
      return;
    }

    if (!landmarks || landmarks.length === 0) {
      console.log('No landmarks provided');
      return;
    }
    
    // Clear previous skeleton
    if (skeletonRef.current) {
      sceneRef.current.remove(skeletonRef.current);
    }

    const skeleton = new THREE.Group();
    
    // Create joint spheres (green)
    const jointGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const jointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    console.log('Adding joints...');
    let jointsAdded = 0;
    
    landmarks.forEach((landmark, index) => {
      if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
        const joint = new THREE.Mesh(jointGeometry, jointMaterial);
        joint.position.set(
          (landmark.x - 0.5) * 3,  // Scale up for better visibility
          -(landmark.y - 0.5) * 3,
          (landmark.z || 0) * 3
        );
        skeleton.add(joint);
        jointsAdded++;
      }
    });
    
    console.log(`Added ${jointsAdded} joints`);

    // Define bone connections for human pose (MediaPipe format)
    const connections = [
      // Face connections
      [0, 1], [1, 2], [2, 3], [3, 7],
      [0, 4], [4, 5], [5, 6], [6, 8],
      [9, 10],
      // Upper body
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24], // hips
      // Lower body
      [23, 25], [25, 27], [27, 29], [27, 31], // left leg
      [24, 26], [26, 28], [28, 30], [28, 32]  // right leg
    ];

    // Create bone lines (blue)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0066ff, linewidth: 2 });
    
    console.log('Adding bones...');
    let bonesAdded = 0;
    
    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && 
          start.x !== undefined && start.y !== undefined &&
          end.x !== undefined && end.y !== undefined) {
        
        const points = [
          new THREE.Vector3(
            (start.x - 0.5) * 3,
            -(start.y - 0.5) * 3,
            (start.z || 0) * 3
          ),
          new THREE.Vector3(
            (end.x - 0.5) * 3,
            -(end.y - 0.5) * 3,
            (end.z || 0) * 3
          )
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        skeleton.add(line);
        bonesAdded++;
      }
    });

    console.log(`Added ${bonesAdded} bones`);
    
    skeletonRef.current = skeleton;
    sceneRef.current.add(skeleton);
    
    // Force render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    console.log('Skeleton rendered');
  };

  // Calculate angle between three points
  const calculateAngle = (pointA: any, pointB: any, pointC: any): number => {
    if (!pointA || !pointB || !pointC) return 0;
    if (typeof pointA.x === 'undefined' || typeof pointB.x === 'undefined' || typeof pointC.x === 'undefined') return 0;
    
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y
    };
    
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y
    };
    
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    
    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
    
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const angleRad = Math.acos(clampedCos);
    
    return (angleRad * 180) / Math.PI;
  };

  // Process single frame for joint angles
  const processFrame = (frame: PoseFrame): JointAngles => {
    const landmarks = frame.landmarks;
    
    if (!landmarks || landmarks.length < 17) {
      return {
        leftShoulder: 0, rightShoulder: 0,
        leftElbow: 0, rightElbow: 0,
        leftHip: 0, rightHip: 0,
        leftKnee: 0, rightKnee: 0,
        spine: 0
      };
    }

    return {
      leftShoulder: calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
      rightShoulder: calculateAngle(landmarks[14], landmarks[12], landmarks[24]),
      leftElbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
      rightElbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
      leftHip: calculateAngle(landmarks[25], landmarks[23], landmarks[11]),
      rightHip: calculateAngle(landmarks[26], landmarks[24], landmarks[12]),
      leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
      rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
      spine: calculateAngle(landmarks[11], landmarks[23], landmarks[24])
    };
  };

  // Estimate anthropometric measurements
  const estimateAnthropometrics = () => {
    if (!motionData || motionData.length === 0) return null;
    
    const firstFrame = motionData[0];
    if (!firstFrame.landmarks || firstFrame.landmarks.length < 17) return null;
    
    const landmarks = firstFrame.landmarks;
    
    // Calculate distances for limb lengths
    const calculateDistance = (p1: any, p2: any) => {
      if (!p1 || !p2 || typeof p1.x === 'undefined' || typeof p2.x === 'undefined') return 0;
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) * 100; // Convert to cm
    };
    
    return {
      limbLengths: {
        upperArm: Math.round(calculateDistance(landmarks[11], landmarks[13])),
        forearm: Math.round(calculateDistance(landmarks[13], landmarks[15])),
        thigh: Math.round(calculateDistance(landmarks[23], landmarks[25])),
        shin: Math.round(calculateDistance(landmarks[25], landmarks[27]))
      }
    };
  };

  // Analyze movement type
  const analyzeMovementType = (): string => {
    if (!motionData || motionData.length < 10) return 'insufficient data';
    
    const firstFrame = motionData[0];
    const lastFrame = motionData[motionData.length - 1];
    
    if (!firstFrame.landmarks || !lastFrame.landmarks) return 'unknown';
    
    const firstLeftWrist = firstFrame.landmarks[15];
    const lastLeftWrist = lastFrame.landmarks[15];
    const firstRightWrist = firstFrame.landmarks[16];
    const lastRightWrist = lastFrame.landmarks[16];
    
    if (!firstLeftWrist || !lastLeftWrist || !firstRightWrist || !lastRightWrist) {
      return 'unknown';
    }
    
    const leftWristMovement = Math.abs(lastLeftWrist.y - firstLeftWrist.y);
    const rightWristMovement = Math.abs(lastRightWrist.y - firstRightWrist.y);
    
    if (leftWristMovement > 0.2 || rightWristMovement > 0.2) {
      return 'upper body exercise';
    }
    
    const firstLeftAnkle = firstFrame.landmarks[27];
    const lastLeftAnkle = lastFrame.landmarks[27];
    const firstRightAnkle = firstFrame.landmarks[28];
    const lastRightAnkle = lastFrame.landmarks[28];
    
    if (!firstLeftAnkle || !lastLeftAnkle || !firstRightAnkle || !lastRightAnkle) {
      return 'unknown';
    }
    
    const leftAnkleMovement = Math.abs(lastLeftAnkle.y - firstLeftAnkle.y);
    const rightAnkleMovement = Math.abs(lastRightAnkle.y - firstRightAnkle.y);
    
    if (leftAnkleMovement > 0.1 || rightAnkleMovement > 0.1) {
      return 'lower body exercise';
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
        
        // Clear previous abnormalities for new analysis
        setDetectedAbnormalities([]);
        
        // Process first frame immediately
        if (motionData[0]) {
          const initialJointAngles = processFrame(motionData[0]);
          console.log('Initial joint angles:', initialJointAngles);
          setCurrentJointAngles(initialJointAngles);
          
          // Create initial virtual patient skeleton
          if (motionData[0].landmarks) {
            createSkeleton(motionData[0].landmarks);
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
        }
        
        // Analyze movement abnormalities for current frame
        if (motionData[currentFrame].landmarks) {
          const frameAbnormalities = analyzeMovementAbnormalities(
            motionData[currentFrame].landmarks, 
            motionData[currentFrame].timestamp
          );
          
          // Update detected abnormalities (avoid duplicates)
          setDetectedAbnormalities(prev => {
            const newAbnormalities = [...prev];
            frameAbnormalities.forEach(abnormality => {
              // Only add if not already detected for this type in recent frames
              const recentSimilar = newAbnormalities.find(existing => 
                existing.type === abnormality.type && 
                existing.affectedSide === abnormality.affectedSide &&
                Math.abs(existing.timestamp - abnormality.timestamp) < 500 // Within 0.5 seconds
              );
              
              if (!recentSimilar) {
                newAbnormalities.push(abnormality);
              }
            });
            return newAbnormalities;
          });
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

  if (!motionData || motionData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Motion Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
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

        {/* Movement Abnormality Detection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Movement Analysis
          </h3>
          {detectedAbnormalities.length > 0 ? (
            <div className="space-y-2">
              {detectedAbnormalities.map((abnormality, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-l-4 ${
                    abnormality.severity === 'severe' 
                      ? 'bg-red-50 border-red-500' 
                      : abnormality.severity === 'moderate'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={abnormality.severity === 'severe' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {abnormality.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {abnormality.affectedSide} side
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {abnormality.description}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {abnormality.clinicalSignificance}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>
                          <strong>Measured:</strong> {abnormality.angle?.toFixed(1)}°
                        </span>
                        <span>
                          <strong>Normal:</strong> {abnormality.normalRange}
                        </span>
                        <span className="text-gray-500">
                          @{(abnormality.timestamp / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-2">
                {detectedAbnormalities.length} movement pattern{detectedAbnormalities.length !== 1 ? 's' : ''} detected during analysis
              </div>
            </div>
          ) : (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                No significant movement abnormalities detected
              </div>
              <div className="text-xs text-green-600 mt-1">
                Movement patterns appear within normal ranges
              </div>
            </div>
          )}
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
            <div className="text-center text-sm text-muted-foreground py-4">
              Press "Analyze Motion" to see joint angles
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
          <div className="text-xs text-gray-600">
            Virtual Patient Status: {currentJointAngles ? 'Active Analysis' : 'Ready for Analysis'}
          </div>
          {currentJointAngles && (
            <div className="text-xs text-green-600 mt-1">
              Real-time biomechanical analysis and movement pattern detection active
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}