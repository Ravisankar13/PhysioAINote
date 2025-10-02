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
  Cpu
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
  targetPosition: { x: number; y: number }; // Normalized position (0-1)
  toleranceRadius: number; // In pixels
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
    toleranceRadius: 80
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
    toleranceRadius: 80
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
    toleranceRadius: 80
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
    toleranceRadius: 80
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
    toleranceRadius: 80
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
    toleranceRadius: 80
  }
};

interface JointAnalysisResult {
  jointType: JointType;
  flexionAngle: number;
  extensionAngle: number;
  alignmentScore: number;
  rangeOfMotion: {
    current: number;
    normal: { min: number; max: number };
    percentage: number;
  };
  clinicalInterpretation: string;
  timestamp: Date;
}

// MediaPipe types (loaded dynamically)
type Pose = any;
type Camera = any;

export default function JointAnalysisLab() {
  const { toast } = useToast();
  
  // State management
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isJointCentered, setIsJointCentered] = useState(false);
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JointAnalysisResult | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[] | null>(null);
  const [centeredDuration, setCenteredDuration] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const centeredTimerRef = useRef<NodeJS.Timeout | null>(null);
  const centeredStartTimeRef = useRef<number | null>(null);

  // Calculate angle between three points
  const calculateAngle = (a: any, b: any, c: any): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // Check if joint is within target circle
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

  // Analyze joint metrics
  const analyzeJoint = useCallback((landmarks: any[], jointType: JointType): JointAnalysisResult => {
    const config = JOINT_CONFIGS[jointType];
    const primary = landmarks[config.landmarks.primary];
    const secondary = landmarks[config.landmarks.secondary];
    const tertiary = landmarks[config.landmarks.tertiary];
    
    // Calculate flexion/extension angle
    const flexionAngle = calculateAngle(tertiary, primary, secondary);
    const extensionAngle = 180 - flexionAngle;
    
    // Calculate alignment score (0-100)
    const alignmentScore = Math.min(100, Math.max(0, 
      100 - Math.abs(90 - flexionAngle)
    ));
    
    // Normal ROM ranges by joint type
    const romRanges: Record<JointType, { min: number; max: number }> = {
      ankle: { min: 20, max: 50 },
      knee: { min: 0, max: 135 },
      hip: { min: 0, max: 125 },
      shoulder: { min: 0, max: 180 },
      elbow: { min: 0, max: 145 },
      wrist: { min: 0, max: 90 }
    };
    
    const normalRange = romRanges[jointType];
    const romPercentage = Math.min(100, (flexionAngle / normalRange.max) * 100);
    
    // Generate clinical interpretation
    let interpretation = '';
    if (alignmentScore > 80) {
      interpretation = `Excellent alignment detected. ${config.label} joint shows optimal positioning with ${flexionAngle.toFixed(1)}° of flexion.`;
    } else if (alignmentScore > 60) {
      interpretation = `Good alignment. ${config.label} joint flexion at ${flexionAngle.toFixed(1)}° is within acceptable range.`;
    } else {
      interpretation = `Alignment concern detected. ${config.label} joint shows ${flexionAngle.toFixed(1)}° flexion, which may require clinical assessment.`;
    }
    
    if (romPercentage > 90) {
      interpretation += ' Range of motion appears excellent.';
    } else if (romPercentage > 70) {
      interpretation += ' Range of motion is adequate.';
    } else {
      interpretation += ' Limited range of motion detected - further evaluation recommended.';
    }
    
    return {
      jointType,
      flexionAngle,
      extensionAngle,
      alignmentScore,
      rangeOfMotion: {
        current: flexionAngle,
        normal: normalRange,
        percentage: romPercentage
      },
      clinicalInterpretation: interpretation,
      timestamp: new Date()
    };
  }, []);

  // Process pose detection results
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
      setCurrentLandmarks(results.poseLandmarks);
      
      const config = JOINT_CONFIGS[selectedJoint];
      const centered = isJointInTarget(results.poseLandmarks, config, canvas.width, canvas.height);
      setIsJointCentered(centered);
      
      // Track how long joint has been centered
      if (centered) {
        if (!centeredStartTimeRef.current) {
          centeredStartTimeRef.current = Date.now();
        }
        const duration = (Date.now() - centeredStartTimeRef.current) / 1000;
        setCenteredDuration(duration);
        
        // Enable analyze after 1 second of stable centering
        if (duration >= 1) {
          setCanAnalyze(true);
        }
      } else {
        centeredStartTimeRef.current = null;
        setCenteredDuration(0);
        setCanAnalyze(false);
      }
      
      // Draw target circle
      const targetX = config.targetPosition.x * canvas.width;
      const targetY = config.targetPosition.y * canvas.height;
      
      overlayCtx.strokeStyle = centered ? '#22c55e' : '#ef4444';
      overlayCtx.lineWidth = 4;
      overlayCtx.beginPath();
      overlayCtx.arc(targetX, targetY, config.toleranceRadius, 0, Math.PI * 2);
      overlayCtx.stroke();
      
      // Draw crosshair
      overlayCtx.strokeStyle = centered ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      overlayCtx.lineWidth = 2;
      overlayCtx.beginPath();
      overlayCtx.moveTo(targetX - 20, targetY);
      overlayCtx.lineTo(targetX + 20, targetY);
      overlayCtx.moveTo(targetX, targetY - 20);
      overlayCtx.lineTo(targetX, targetY + 20);
      overlayCtx.stroke();
      
      // Draw joint landmarks
      const primary = results.poseLandmarks[config.landmarks.primary];
      const secondary = results.poseLandmarks[config.landmarks.secondary];
      const tertiary = results.poseLandmarks[config.landmarks.tertiary];
      
      if (primary && secondary && tertiary) {
        // Draw skeleton connections
        overlayCtx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        overlayCtx.lineWidth = 3;
        overlayCtx.beginPath();
        overlayCtx.moveTo(tertiary.x * canvas.width, tertiary.y * canvas.height);
        overlayCtx.lineTo(primary.x * canvas.width, primary.y * canvas.height);
        overlayCtx.lineTo(secondary.x * canvas.width, secondary.y * canvas.height);
        overlayCtx.stroke();
        
        // Draw joint points
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
        
        // Draw angle arc at primary joint
        const angle = calculateAngle(tertiary, primary, secondary);
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
        
        // Draw angle text
        overlayCtx.fillStyle = '#fbbf24';
        overlayCtx.font = 'bold 16px Arial';
        overlayCtx.fillText(
          `${angle.toFixed(1)}°`,
          primary.x * canvas.width + 50,
          primary.y * canvas.height - 10
        );
      }
    }
  }, [selectedJoint, isJointInTarget, calculateAngle]);

  // Initialize MediaPipe
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

  // Start tracking
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

  // Stop tracking
  const stopTracking = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current = null;
    }
    setIsTracking(false);
    setIsJointCentered(false);
    setCanAnalyze(false);
    setCenteredDuration(0);
    centeredStartTimeRef.current = null;
  };

  // Handle joint selection change
  const handleJointChange = (joint: JointType) => {
    setSelectedJoint(joint);
    setAnalysisResult(null);
    setCanAnalyze(false);
    setIsJointCentered(false);
    setCenteredDuration(0);
    centeredStartTimeRef.current = null;
  };

  // Perform analysis
  const performAnalysis = async () => {
    if (!currentLandmarks || !canAnalyze) return;
    
    setIsAnalyzing(true);
    
    try {
      // Calculate local metrics first
      const localResult = analyzeJoint(currentLandmarks, selectedJoint);
      
      // Prepare metrics for backend AI analysis
      const metrics = {
        joint: selectedJoint,
        flexionAngle: localResult.flexionAngle,
        extensionAngle: localResult.extensionAngle,
        alignmentScore: localResult.alignmentScore,
        rangeOfMotion: localResult.rangeOfMotion.percentage,
        poseLandmarks: currentLandmarks
      };

      // Call backend AI analysis
      const response = await fetch('/api/joint-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(metrics)
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const aiAnalysis = await response.json();
      
      // Merge local calculations with AI interpretation
      const enhancedResult: JointAnalysisResult = {
        ...localResult,
        clinicalInterpretation: aiAnalysis.interpretation.overall
      };
      
      setAnalysisResult(enhancedResult);
      
      toast({
        title: "AI Analysis Complete",
        description: aiAnalysis.interpretation.overall.substring(0, 100) + "...",
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze joint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      if (centeredTimerRef.current) {
        clearTimeout(centeredTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Joint Analysis Lab</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered joint analysis with real-time positioning feedback
          </p>
        </div>

        {/* Joint Selection */}
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

        {/* Camera Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5" />
                  Camera Feed
                </CardTitle>
                <CardDescription>
                  Position your {JOINT_CONFIGS[selectedJoint].label.toLowerCase()} within the target circle
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
            {/* Status Alert */}
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

            {isTracking && (
              <Alert 
                className="mb-4" 
                variant={isJointCentered ? 'default' : 'default'}
                data-testid={isJointCentered ? 'alert-centered' : 'alert-not-centered'}
              >
                {isJointCentered ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">Joint Centered</AlertTitle>
                    <AlertDescription>
                      Hold steady... {centeredDuration >= 1 ? 'Ready to analyze!' : `${(1 - centeredDuration).toFixed(1)}s`}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <AlertTitle>Position Your Joint</AlertTitle>
                    <AlertDescription>
                      Move your {JOINT_CONFIGS[selectedJoint].label.toLowerCase()} into the green target circle
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            {/* Video and Canvas */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover hidden"
                data-testid="video-feed"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                width={1280}
                height={720}
                data-testid="canvas-video"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                width={1280}
                height={720}
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

            {/* Analyze Button */}
            {isTracking && (
              <div className="mt-4 flex justify-center">
                <Button
                  size="lg"
                  disabled={!canAnalyze || isAnalyzing}
                  onClick={performAnalysis}
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
                      Analyze Joint
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisResult && (
          <Card data-testid="card-analysis-results">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Analysis Results - {JOINT_CONFIGS[analysisResult.jointType].label}
              </CardTitle>
              <CardDescription>
                Captured at {analysisResult.timestamp.toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Flexion/Extension */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold">Joint Angles</h3>
                  </div>
                  <div className="space-y-1" data-testid="text-flexion-angle">
                    <p className="text-2xl font-bold text-blue-600">
                      {analysisResult.flexionAngle.toFixed(1)}°
                    </p>
                    <p className="text-sm text-muted-foreground">Flexion Angle</p>
                  </div>
                  <div className="space-y-1" data-testid="text-extension-angle">
                    <p className="text-lg text-muted-foreground">
                      {analysisResult.extensionAngle.toFixed(1)}°
                    </p>
                    <p className="text-sm text-muted-foreground">Extension</p>
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-purple-600" />
                    <h3 className="font-semibold">Alignment Score</h3>
                  </div>
                  <div className="space-y-2" data-testid="text-alignment-score">
                    <p className="text-2xl font-bold text-purple-600">
                      {analysisResult.alignmentScore.toFixed(0)}/100
                    </p>
                    <Progress value={analysisResult.alignmentScore} className="h-2" />
                    <Badge variant={analysisResult.alignmentScore > 70 ? 'default' : 'secondary'}>
                      {analysisResult.alignmentScore > 80 ? 'Excellent' : 
                       analysisResult.alignmentScore > 60 ? 'Good' : 'Fair'}
                    </Badge>
                  </div>
                </div>

                {/* Range of Motion */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold">Range of Motion</h3>
                  </div>
                  <div className="space-y-2" data-testid="text-rom">
                    <p className="text-2xl font-bold text-green-600">
                      {analysisResult.rangeOfMotion.percentage.toFixed(0)}%
                    </p>
                    <Progress value={analysisResult.rangeOfMotion.percentage} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Normal: {analysisResult.rangeOfMotion.normal.min}° - {analysisResult.rangeOfMotion.normal.max}°
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* AI Clinical Interpretation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">AI Clinical Interpretation</h3>
                  <Badge variant="outline" className="ml-auto">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Generated
                  </Badge>
                </div>
                <Alert data-testid="text-clinical-interpretation">
                  <AlertDescription className="text-base leading-relaxed">
                    {analysisResult.clinicalInterpretation}
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground italic">
                  Note: This is an automated analysis. Always consult with a qualified healthcare professional for medical advice.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
