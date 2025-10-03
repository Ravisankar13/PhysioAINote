import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera as CameraIcon, 
  Play, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Target,
  Sparkles,
  TrendingUp,
  Ruler,
  RotateCw,
  Cpu,
  Video,
  Clock
} from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';

// Pose landmark indices from MediaPipe
const POSE_LANDMARKS = {
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  NOSE: 0,
};

// Joint configuration
type JointType = 'ankle' | 'knee' | 'hip' | 'shoulder' | 'elbow' | 'wrist';

interface JointConfig {
  id: JointType;
  label: string;
  landmarks: { primary: number; secondary: number; tertiary: number };
  targetPosition: { x: number; y: number };
  toleranceRadius: number;
  movementInstruction: string;
}

const JOINT_CONFIGS: Record<JointType, JointConfig> = {
  ankle: {
    id: 'ankle',
    label: 'Ankle',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_ANKLE,
      secondary: POSE_LANDMARKS.LEFT_KNEE,
      tertiary: POSE_LANDMARKS.LEFT_HIP
    },
    targetPosition: { x: 0.5, y: 0.7 },
    toleranceRadius: 80,
    movementInstruction: "Rise up on your toes and lower back down"
  },
  knee: {
    id: 'knee',
    label: 'Knee',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_KNEE,
      secondary: POSE_LANDMARKS.LEFT_HIP,
      tertiary: POSE_LANDMARKS.LEFT_ANKLE
    },
    targetPosition: { x: 0.5, y: 0.6 },
    toleranceRadius: 80,
    movementInstruction: "Perform a slow squat and stand back up"
  },
  hip: {
    id: 'hip',
    label: 'Hip',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_HIP,
      secondary: POSE_LANDMARKS.LEFT_KNEE,
      tertiary: POSE_LANDMARKS.LEFT_SHOULDER
    },
    targetPosition: { x: 0.5, y: 0.5 },
    toleranceRadius: 80,
    movementInstruction: "Lift your knee toward chest and lower it down"
  },
  shoulder: {
    id: 'shoulder',
    label: 'Shoulder',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_SHOULDER,
      secondary: POSE_LANDMARKS.LEFT_ELBOW,
      tertiary: POSE_LANDMARKS.LEFT_HIP
    },
    targetPosition: { x: 0.5, y: 0.35 },
    toleranceRadius: 80,
    movementInstruction: "Slowly raise your arm overhead and back down"
  },
  elbow: {
    id: 'elbow',
    label: 'Elbow',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_ELBOW,
      secondary: POSE_LANDMARKS.LEFT_SHOULDER,
      tertiary: POSE_LANDMARKS.LEFT_WRIST
    },
    targetPosition: { x: 0.5, y: 0.45 },
    toleranceRadius: 80,
    movementInstruction: "Bend your elbow and straighten it out"
  },
  wrist: {
    id: 'wrist',
    label: 'Wrist',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_WRIST,
      secondary: POSE_LANDMARKS.LEFT_ELBOW,
      tertiary: POSE_LANDMARKS.LEFT_SHOULDER
    },
    targetPosition: { x: 0.5, y: 0.55 },
    toleranceRadius: 80,
    movementInstruction: "Flex your wrist up and down"
  }
};

interface MovementFrame {
  timestamp: number;
  landmarks: any[];
  angle: number;
}

interface MovementMetrics {
  totalRange: number;
  smoothness: number;
  symmetry?: number;
  compensations: string[];
}

interface JointAnalysisResult {
  jointType: JointType;
  movementMetrics: MovementMetrics;
  movementRange: { min: number; max: number; total: number };
  clinicalInterpretation: string;
  timestamp: Date;
}

type Pose = any;
type Camera = any;

type RecordingPhase = 'idle' | 'countdown' | 'recording' | 'complete';

export default function JointAnalysisLab() {
  const { toast } = useToast();
  
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isJointCentered, setIsJointCentered] = useState(false);
  const [centeredDuration, setCenteredDuration] = useState(0);
  
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [movementData, setMovementData] = useState<MovementFrame[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JointAnalysisResult | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[] | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const centeredStartTimeRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateAngle = (a: any, b: any, c: any): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const isJointInTarget = useCallback((landmarks: any[], config: JointConfig, width: number, height: number): boolean => {
    const primaryLandmark = landmarks[config.landmarks.primary];
    if (!primaryLandmark) return false;
    
    const jointX = primaryLandmark.x * width;
    const jointY = primaryLandmark.y * height;
    const targetX = config.targetPosition.x * width;
    const targetY = config.targetPosition.y * height;
    
    const distance = Math.sqrt(
      Math.pow(jointX - targetX, 2) + 
      Math.pow(jointY - targetY, 2)
    );
    
    return distance <= config.toleranceRadius;
  }, []);

  const calculateMovementMetrics = (frames: MovementFrame[], jointType: JointType): MovementMetrics => {
    if (frames.length < 2) {
      return {
        totalRange: 0,
        smoothness: 0,
        compensations: []
      };
    }

    const angles = frames.map(f => f.angle);
    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);
    const totalRange = maxAngle - minAngle;

    const angleChanges: number[] = [];
    for (let i = 1; i < angles.length; i++) {
      angleChanges.push(Math.abs(angles[i] - angles[i - 1]));
    }
    
    const mean = angleChanges.reduce((a, b) => a + b, 0) / angleChanges.length;
    const variance = angleChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / angleChanges.length;
    const smoothness = Math.sqrt(variance);

    const compensations: string[] = [];
    
    const config = JOINT_CONFIGS[jointType];
    for (const frame of frames) {
      const leftShoulder = frame.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = frame.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const leftHip = frame.landmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = frame.landmarks[POSE_LANDMARKS.RIGHT_HIP];
      
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
        const hipTilt = Math.abs(leftHip.y - rightHip.y);
        
        if (shoulderTilt > 0.1) {
          if (!compensations.includes('Shoulder elevation detected')) {
            compensations.push('Shoulder elevation detected');
          }
        }
        
        if (hipTilt > 0.08) {
          if (!compensations.includes('Hip hiking observed')) {
            compensations.push('Hip hiking observed');
          }
        }
        
        const trunkAngle = calculateAngle(leftShoulder, leftHip, rightHip);
        if (Math.abs(trunkAngle - 90) > 15) {
          if (!compensations.includes('Trunk lean detected')) {
            compensations.push('Trunk lean detected');
          }
        }
      }
    }

    let symmetry: number | undefined;
    if (['shoulder', 'hip', 'knee', 'ankle', 'elbow', 'wrist'].includes(jointType)) {
      const leftAngles = angles;
      const avgLeft = leftAngles.reduce((a, b) => a + b, 0) / leftAngles.length;
      symmetry = 100 - Math.min(100, Math.abs(avgLeft - 90));
    }

    return {
      totalRange,
      smoothness,
      symmetry,
      compensations
    };
  };

  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
      setCurrentLandmarks(results.poseLandmarks);
      
      const config = JOINT_CONFIGS[selectedJoint];
      const primary = results.poseLandmarks[config.landmarks.primary];
      const secondary = results.poseLandmarks[config.landmarks.secondary];
      const tertiary = results.poseLandmarks[config.landmarks.tertiary];
      
      if (primary && secondary && tertiary) {
        const angle = calculateAngle(tertiary, primary, secondary);
        
        if (recordingPhase === 'recording') {
          const timestamp = Date.now();
          setMovementData(prev => [...prev, {
            timestamp,
            landmarks: results.poseLandmarks,
            angle
          }]);
        }
        
        if (recordingPhase === 'idle' || recordingPhase === 'countdown') {
          const centered = isJointInTarget(results.poseLandmarks, config, canvas.width, canvas.height);
          setIsJointCentered(centered);
          
          if (centered) {
            if (!centeredStartTimeRef.current) {
              centeredStartTimeRef.current = Date.now();
            }
            const duration = (Date.now() - centeredStartTimeRef.current) / 1000;
            setCenteredDuration(duration);
          } else {
            centeredStartTimeRef.current = null;
            setCenteredDuration(0);
          }
        }
        
        const targetX = config.targetPosition.x * canvas.width;
        const targetY = config.targetPosition.y * canvas.height;
        
        const centered = isJointInTarget(results.poseLandmarks, config, canvas.width, canvas.height);
        
        overlayCtx.strokeStyle = centered ? '#22c55e' : '#ef4444';
        overlayCtx.lineWidth = 4;
        overlayCtx.beginPath();
        overlayCtx.arc(targetX, targetY, config.toleranceRadius, 0, Math.PI * 2);
        overlayCtx.stroke();
        
        overlayCtx.strokeStyle = centered ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        overlayCtx.lineWidth = 2;
        overlayCtx.beginPath();
        overlayCtx.moveTo(targetX - 20, targetY);
        overlayCtx.lineTo(targetX + 20, targetY);
        overlayCtx.moveTo(targetX, targetY - 20);
        overlayCtx.lineTo(targetX, targetY + 20);
        overlayCtx.stroke();
        
        overlayCtx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        overlayCtx.lineWidth = 3;
        overlayCtx.beginPath();
        overlayCtx.moveTo(tertiary.x * canvas.width, tertiary.y * canvas.height);
        overlayCtx.lineTo(primary.x * canvas.width, primary.y * canvas.height);
        overlayCtx.lineTo(secondary.x * canvas.width, secondary.y * canvas.height);
        overlayCtx.stroke();
        
        [primary, secondary, tertiary].forEach((landmark, idx) => {
          overlayCtx.fillStyle = idx === 0 ? '#3b82f6' : '#60a5fa';
          overlayCtx.beginPath();
          overlayCtx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            idx === 0 ? 10 : 6,
            0,
            Math.PI * 2
          );
          overlayCtx.fill();
        });
        
        overlayCtx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
        overlayCtx.lineWidth = 2;
        const arcRadius = 40;
        const startAngle = Math.atan2(tertiary.y - primary.y, tertiary.x - primary.x);
        overlayCtx.beginPath();
        overlayCtx.arc(
          primary.x * canvas.width,
          primary.y * canvas.height,
          arcRadius,
          startAngle,
          startAngle + (angle * Math.PI / 180)
        );
        overlayCtx.stroke();
        
        overlayCtx.fillStyle = '#fbbf24';
        overlayCtx.font = 'bold 16px Arial';
        overlayCtx.fillText(
          `${angle.toFixed(1)}°`,
          primary.x * canvas.width + 50,
          primary.y * canvas.height - 10
        );

        if (recordingPhase === 'countdown') {
          overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          overlayCtx.fillRect(canvas.width / 2 - 100, canvas.height / 2 - 100, 200, 200);
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 120px Arial';
          overlayCtx.textAlign = 'center';
          overlayCtx.textBaseline = 'middle';
          overlayCtx.fillText(
            countdown > 0 ? countdown.toString() : 'GO!',
            canvas.width / 2,
            canvas.height / 2
          );
        }
        
        if (recordingPhase === 'recording') {
          overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          overlayCtx.beginPath();
          overlayCtx.arc(50, 50, 15, 0, Math.PI * 2);
          overlayCtx.fill();
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 18px Arial';
          overlayCtx.textAlign = 'left';
          overlayCtx.fillText('RECORDING', 75, 55);
        }
      }
    }
  }, [selectedJoint, isJointInTarget, calculateAngle, recordingPhase, countdown]);

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        setCameraStatus('initializing');
        
        const loaded = await loadMediaPipeLibraries();
        if (!loaded) {
          throw new Error('Failed to load MediaPipe libraries');
        }
        
        setMediapipeLoaded(true);
        setCameraStatus('ready');
        
        toast({
          title: "Camera Ready",
          description: "MediaPipe pose detection initialized successfully",
        });
      } catch (error) {
        console.error('MediaPipe initialization error:', error);
        setCameraStatus('error');
        toast({
          title: "Initialization Error",
          description: "Failed to initialize pose detection. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    initMediaPipe();
  }, [toast]);

  const startTracking = async () => {
    if (!mediapipeLoaded || !videoRef.current || !canvasRef.current) return;
    
    try {
      const pose = new window.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
        }
      });
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      pose.onResults(onPoseResults);
      poseRef.current = pose;
      
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      
      await camera.start();
      cameraRef.current = camera;
      
      setIsTracking(true);
      
      toast({
        title: "Tracking Started",
        description: `Position your ${JOINT_CONFIGS[selectedJoint].label.toLowerCase()} in the target circle`,
      });
    } catch (error) {
      console.error('Tracking start error:', error);
      toast({
        title: "Tracking Error",
        description: "Failed to start pose tracking",
        variant: "destructive",
      });
    }
  };

  const stopTracking = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsTracking(false);
    setIsJointCentered(false);
    setCenteredDuration(0);
    setRecordingPhase('idle');
    setMovementData([]);
    centeredStartTimeRef.current = null;
  };

  const handleJointChange = (joint: JointType) => {
    setSelectedJoint(joint);
    setAnalysisResult(null);
    setIsJointCentered(false);
    setCenteredDuration(0);
    setRecordingPhase('idle');
    setMovementData([]);
    centeredStartTimeRef.current = null;
  };

  const startRecording = () => {
    setRecordingPhase('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            setRecordingPhase('recording');
            setMovementData([]);
            recordingStartTimeRef.current = Date.now();
            
            const progressInterval = setInterval(() => {
              if (recordingStartTimeRef.current) {
                const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
                const progress = Math.min(100, (elapsed / 5) * 100);
                setRecordingProgress(progress);
                
                if (elapsed >= 5) {
                  clearInterval(progressInterval);
                  setRecordingPhase('complete');
                  setRecordingProgress(100);
                  
                  toast({
                    title: "Recording Complete",
                    description: "Movement data captured. Click Analyze to see results.",
                  });
                }
              }
            }, 100);
            
            recordingIntervalRef.current = progressInterval;
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performAnalysis = async () => {
    if (movementData.length === 0) {
      toast({
        title: "No Movement Data",
        description: "Please record a movement first",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const metrics = calculateMovementMetrics(movementData, selectedJoint);
      
      const angles = movementData.map(f => f.angle);
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      
      const movementSummary = {
        frameCount: movementData.length,
        duration: movementData.length > 0 ? 
          (movementData[movementData.length - 1].timestamp - movementData[0].timestamp) / 1000 : 0,
        angleRange: { min: minAngle, max: maxAngle }
      };
      
      const analysisPayload = {
        joint: selectedJoint,
        movementRange: metrics.totalRange,
        smoothness: metrics.smoothness,
        compensationPatterns: metrics.compensations,
        symmetry: metrics.symmetry,
        movementDataSummary: movementSummary
      };

      const response = await fetch('/api/joint-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(analysisPayload)
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const aiAnalysis = await response.json();
      
      const result: JointAnalysisResult = {
        jointType: selectedJoint,
        movementMetrics: metrics,
        movementRange: {
          min: minAngle,
          max: maxAngle,
          total: metrics.totalRange
        },
        clinicalInterpretation: aiAnalysis.interpretation?.overall || 'Analysis complete. Movement patterns captured successfully.',
        timestamp: new Date()
      };
      
      setAnalysisResult(result);
      
      toast({
        title: "AI Analysis Complete",
        description: "Movement analysis results are ready",
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      const metrics = calculateMovementMetrics(movementData, selectedJoint);
      const angles = movementData.map(f => f.angle);
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      
      setAnalysisResult({
        jointType: selectedJoint,
        movementMetrics: metrics,
        movementRange: {
          min: minAngle,
          max: maxAngle,
          total: metrics.totalRange
        },
        clinicalInterpretation: `Movement analysis complete. Range: ${metrics.totalRange.toFixed(1)}°, Smoothness: ${metrics.smoothness.toFixed(2)}. ${metrics.compensations.length > 0 ? 'Compensations detected: ' + metrics.compensations.join(', ') : 'No significant compensations detected.'}`,
        timestamp: new Date()
      });
      
      toast({
        title: "Analysis Complete",
        description: "Local analysis completed (AI analysis unavailable)",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const canStartRecording = isTracking && isJointCentered && centeredDuration >= 1 && recordingPhase === 'idle';
  const canAnalyze = recordingPhase === 'complete' && movementData.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Joint Analysis Lab</h1>
          <p className="text-muted-foreground text-lg">
            Movement-based joint analysis with AI-powered biomechanical insights
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Select Joint to Analyze
            </CardTitle>
            <CardDescription>
              Choose the joint you want to analyze
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(JOINT_CONFIGS) as JointType[]).map((joint) => (
                <Button
                  key={joint}
                  variant={selectedJoint === joint ? 'default' : 'outline'}
                  onClick={() => handleJointChange(joint)}
                  disabled={isTracking}
                  data-testid={`button-select-${joint}`}
                  className="flex-1 min-w-[120px]"
                >
                  {JOINT_CONFIGS[joint].label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5" />
                  Camera Feed
                </CardTitle>
                <CardDescription>
                  {recordingPhase === 'idle' && 'Position your joint within the target circle'}
                  {recordingPhase === 'countdown' && 'Get ready...'}
                  {recordingPhase === 'recording' && `Performing: ${JOINT_CONFIGS[selectedJoint].movementInstruction}`}
                  {recordingPhase === 'complete' && 'Recording complete - ready to analyze'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isTracking ? (
                  <Button
                    onClick={startTracking}
                    disabled={cameraStatus !== 'ready'}
                    data-testid="button-start-tracking"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button
                    onClick={stopTracking}
                    variant="destructive"
                    data-testid="button-stop-tracking"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cameraStatus === 'initializing' && (
              <Alert className="mb-4" data-testid="alert-initializing">
                <Activity className="h-4 w-4" />
                <AlertTitle>Initializing</AlertTitle>
                <AlertDescription>
                  Loading pose detection system...
                </AlertDescription>
              </Alert>
            )}
            
            {cameraStatus === 'error' && (
              <Alert variant="destructive" className="mb-4" data-testid="alert-error">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to initialize camera. Please check permissions and refresh.
                </AlertDescription>
              </Alert>
            )}

            {isTracking && recordingPhase === 'idle' && (
              <Alert 
                className="mb-4" 
                data-testid={isJointCentered ? 'alert-centered' : 'alert-not-centered'}
              >
                {isJointCentered ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">Joint Centered</AlertTitle>
                    <AlertDescription>
                      Hold steady... {centeredDuration >= 1 ? 'Ready to record!' : `${(1 - centeredDuration).toFixed(1)}s`}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <AlertTitle>Position Your Joint</AlertTitle>
                    <AlertDescription>
                      Move your {JOINT_CONFIGS[selectedJoint].label.toLowerCase()} into the target circle
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            {recordingPhase === 'recording' && (
              <Alert className="mb-4 bg-red-50 border-red-200" data-testid="alert-recording">
                <Video className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-600">Recording Movement</AlertTitle>
                <AlertDescription>
                  {JOINT_CONFIGS[selectedJoint].movementInstruction}
                  <Progress value={recordingProgress} className="mt-2" />
                </AlertDescription>
              </Alert>
            )}

            {recordingPhase === 'complete' && (
              <Alert className="mb-4 bg-green-50 border-green-200" data-testid="alert-complete">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Recording Complete</AlertTitle>
                <AlertDescription>
                  Captured {movementData.length} frames. Click "Analyze Movement" to see results.
                </AlertDescription>
              </Alert>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4] max-w-3xl mx-auto">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover hidden"
                data-testid="video-feed"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                width={960}
                height={1280}
                data-testid="canvas-video"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                width={960}
                height={1280}
                data-testid="canvas-overlay"
              />
              
              {!isTracking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/80">
                    <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3 justify-center">
              {canStartRecording && (
                <Button
                  size="lg"
                  onClick={startRecording}
                  data-testid="button-record-movement"
                  className="min-w-[200px]"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Record Movement
                </Button>
              )}
              
              {canAnalyze && (
                <Button
                  size="lg"
                  onClick={performAnalysis}
                  disabled={isAnalyzing}
                  data-testid="button-analyze"
                  className="min-w-[200px]"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Movement
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <Card data-testid="card-analysis-results">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Movement Analysis - {JOINT_CONFIGS[analysisResult.jointType].label}
              </CardTitle>
              <CardDescription>
                Captured at {analysisResult.timestamp.toLocaleTimeString()} • {movementData.length} frames analyzed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold">Movement Range</h3>
                  </div>
                  <div className="space-y-1" data-testid="text-movement-range">
                    <p className="text-2xl font-bold text-blue-600">
                      {analysisResult.movementMetrics.totalRange.toFixed(1)}°
                    </p>
                    <p className="text-sm text-muted-foreground">Total Range</p>
                    <p className="text-xs text-muted-foreground">
                      {analysisResult.movementRange.min.toFixed(1)}° - {analysisResult.movementRange.max.toFixed(1)}°
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <h3 className="font-semibold">Smoothness</h3>
                  </div>
                  <div className="space-y-2" data-testid="text-smoothness">
                    <p className="text-2xl font-bold text-purple-600">
                      {analysisResult.movementMetrics.smoothness.toFixed(2)}
                    </p>
                    <Badge variant={analysisResult.movementMetrics.smoothness < 2 ? 'default' : 'secondary'}>
                      {analysisResult.movementMetrics.smoothness < 2 ? 'Smooth' : 
                       analysisResult.movementMetrics.smoothness < 4 ? 'Moderate' : 'Jerky'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Lower is better</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold">Compensations</h3>
                  </div>
                  <div className="space-y-2" data-testid="text-compensations">
                    <p className="text-2xl font-bold text-green-600">
                      {analysisResult.movementMetrics.compensations.length}
                    </p>
                    {analysisResult.movementMetrics.compensations.length > 0 ? (
                      <div className="space-y-1">
                        {analysisResult.movementMetrics.compensations.map((comp, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs block w-full">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="default" className="bg-green-600">No Compensations</Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">AI Clinical Interpretation</h3>
                  <Badge variant="outline" className="ml-auto">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Generated
                  </Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg" data-testid="text-clinical-interpretation">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {analysisResult.clinicalInterpretation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
