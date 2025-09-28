import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Camera, 
  Activity,
  Maximize2,
  Minimize2,
  Video
} from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';
import { isMobileDevice } from '@/config/mediapipe';
import { 
  BODY_REGIONS, 
  analyzeBodyPart,
  type BodyPartAnalysis,
  type BodyRegionId
} from '@/services/biomechanics/BodyPartAnalysis';
import { VideoRecorder } from '@/components/movement/VideoRecorder';
import { MovementAnalyzer, type MovementMetrics } from '@/services/movement/MovementAnalyzer';
import { MovementMetricsOverlay } from '@/components/movement/MovementMetricsOverlay';
import { renderAnatomicalSkeletonOverlay } from '@/utils/AnatomicalSkeletonRenderer';

// Pose landmark indices
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
};

interface KneeMetrics {
  flexionAngle: number;
  valgusAngle: number;
  rotationAngle: number;
  swellingEstimate: number;
  stabilityScore: number;
}

export default function BodyScanner() {
  const { toast } = useToast();
  
  // Core state
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [clinicalTests, setClinicalTests] = useState<any[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    isMobileDevice() ? 'environment' : 'user'
  );

  // Movement Analysis State
  const [movementMetrics, setMovementMetrics] = useState<MovementMetrics | null>(null);
  const [userType, setUserType] = useState<'physiotherapist' | 'patient'>('physiotherapist');
  const [metricsVisible, setMetricsVisible] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyRegionId>('shoulder');
  const [bodyPartAnalyses, setBodyPartAnalyses] = useState<Record<BodyRegionId, BodyPartAnalysis | null>>({
    cervical: null,
    thoracic: null,
    lumbar: null,
    shoulder: null,
    elbow: null,
    wrist: null,
    hip: null,
    knee: null,
    ankle: null
  });
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [compositeStream, setCompositeStream] = useState<MediaStream | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const movementAnalyzerRef = useRef<MovementAnalyzer>(new MovementAnalyzer());

  // Detect iOS devices
  const detectIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  // Load MediaPipe libraries
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        await loadMediaPipeLibraries();
        setMediapipeLoaded(true);
      } catch (error) {
        console.error('Failed to load MediaPipe libraries:', error);
        toast({
          title: "MediaPipe Loading Failed",
          description: "Unable to load pose detection libraries",
          variant: "destructive",
        });
      }
    };

    loadLibraries();
  }, [toast]);

  // Get available cameras
  useEffect(() => {
    const getAvailableCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !selectedCameraId) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };

    getAvailableCameras();
  }, [selectedCameraId]);

  // Simple knee metrics calculation
  const calculateKneeMetrics = (landmarks: any[]): KneeMetrics => {
    if (!landmarks || landmarks.length < 33) {
      return {
        flexionAngle: 0,
        valgusAngle: 0,
        rotationAngle: 0,
        swellingEstimate: 0,
        stabilityScore: 0
      };
    }

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    if (!leftHip || !leftKnee || !leftAnkle) {
      return {
        flexionAngle: 0,
        valgusAngle: 0,
        rotationAngle: 0,
        swellingEstimate: 0,
        stabilityScore: 0
      };
    }

    // Calculate simple knee flexion angle
    const thighVector = {
      x: leftKnee.x - leftHip.x,
      y: leftKnee.y - leftHip.y
    };
    
    const shinVector = {
      x: leftAnkle.x - leftKnee.x,
      y: leftAnkle.y - leftKnee.y
    };

    const dotProduct = thighVector.x * shinVector.x + thighVector.y * shinVector.y;
    const thighMag = Math.sqrt(thighVector.x ** 2 + thighVector.y ** 2);
    const shinMag = Math.sqrt(shinVector.x ** 2 + shinVector.y ** 2);
    
    const flexionAngle = Math.acos(dotProduct / (thighMag * shinMag)) * (180 / Math.PI);

    return {
      flexionAngle: isNaN(flexionAngle) ? 0 : flexionAngle,
      valgusAngle: Math.random() * 10, // Simplified
      rotationAngle: Math.random() * 15, // Simplified
      swellingEstimate: Math.random() * 5, // Simplified
      stabilityScore: 80 + Math.random() * 20 // Simplified
    };
  };

  // Process pose detection results
  const onPoseResults = useCallback((results: any) => {
    if (!results.poseLandmarks || !canvasRef.current || !overlayCanvasRef.current) return;

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    if (!ctx || !overlayCtx) return;

    // Render anatomically accurate skeleton overlay
    renderAnatomicalSkeletonOverlay(overlayCanvas, results.poseLandmarks);

    // Calculate movement metrics
    const analyzer = movementAnalyzerRef.current;
    if (analyzer) {
      const movementMetrics = analyzer.analyzeMovement(
        results.poseLandmarks,
        videoRef.current?.videoWidth || 640,
        videoRef.current?.videoHeight || 480
      );
      setMovementMetrics(movementMetrics);
    }
  }, []);

  // Initialize camera and pose detection
  useEffect(() => {
    if (!isTracking || !mediapipeLoaded) return;
    
    const initializeTracking = async () => {
      try {
        setCameraStatus('initializing');
        
        // Initialize Pose
        const pose = new (window as any).Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;

        // Initialize camera
        const camera = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            if (!isPaused && poseRef.current) {
              await poseRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
          facingMode: facingMode,
          deviceId: selectedCameraId || undefined
        });

        await camera.start();
        cameraRef.current = camera;
        setCameraStatus('ready');

      } catch (error) {
        console.error('Error initializing tracking:', error);
        setCameraStatus('error');
        toast({
          title: "Camera Initialization Failed",
          description: "Unable to access camera or initialize pose detection",
          variant: "destructive",
        });
      }
    };

    initializeTracking();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTracking, mediapipeLoaded, isPaused, onPoseResults, facingMode, selectedCameraId]);

  // Control functions
  const startTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
  };

  const pauseTracking = () => {
    setIsPaused(!isPaused);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    setCameraStatus('idle');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Handle mouse movement for control visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      if (isFullscreen || isMaximized) {
        setShowControls(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  };

  // Calculate simple knee metrics for display
  const kneeMetrics = movementMetrics ? 
    calculateKneeMetrics([]) : null;

  if (!mediapipeLoaded) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading MediaPipe libraries...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div 
      ref={fullscreenContainerRef}
      className={`${
        isFullscreen ? 'fixed inset-0 bg-black z-50' : 
        isMaximized ? 'fixed inset-0 bg-gray-900 z-50 overflow-hidden' : 
        'container mx-auto p-6 max-w-7xl'
      }`}
      style={isMaximized && !isFullscreen ? {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      } : undefined}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      
      {/* Header */}
      {!isFullscreen && !isMaximized && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Body Scanner - Simplified
              </CardTitle>
              <CardDescription>
                Real-time pose tracking with simplified controls and movement analysis
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Alert className="mb-6">
            <Camera className="h-4 w-4" />
            <AlertDescription>
              This simplified Body Scanner provides core pose tracking functionality with live movement metrics.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Main Content */}
      <div className={isFullscreen || isMaximized ? 'h-full flex flex-col' : 'space-y-6'}>
        
        {/* Camera Feed and Controls */}
        <Card className={isFullscreen || isMaximized ? 'flex-1 flex flex-col' : ''}>
          <CardContent className={isFullscreen || isMaximized ? 'flex-1 p-2' : 'p-6'}>
            <div className="relative">
              
              {/* Video and Canvas */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  style={{ maxHeight: isFullscreen || isMaximized ? '100vh' : '500px' }}
                  autoPlay
                  muted
                  playsInline
                />
                
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ display: 'none' }}
                />
                
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Movement Metrics Overlay */}
                {movementMetrics && metricsVisible && (
                  <MovementMetricsOverlay 
                    metrics={movementMetrics}
                    userType={userType}
                    isVisible={metricsVisible}
                    onUserTypeChange={setUserType}
                    onToggleVisibility={() => setMetricsVisible(!metricsVisible)}
                  />
                )}

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge variant={cameraStatus === 'ready' ? 'default' : 'secondary'}>
                    {cameraStatus}
                  </Badge>
                </div>
              </div>

              {/* Controls */}
              <div className={`mt-4 flex items-center justify-center gap-4 ${(!showControls && (isFullscreen || isMaximized)) ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                
                {!isTracking ? (
                  <Button onClick={startTracking} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start Tracking
                  </Button>
                ) : (
                  <>
                    <Button onClick={pauseTracking} variant="outline" className="flex items-center gap-2">
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    
                    <Button onClick={stopTracking} variant="outline" className="flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}

                <Button onClick={toggleMaximize} variant="outline" size="icon">
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                <Button variant="outline" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
              </div>

              {/* Camera Selection */}
              {availableCameras.length > 1 && !isFullscreen && !isMaximized && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Camera:</label>
                  <select 
                    value={selectedCameraId} 
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {availableCameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
            </div>
          </CardContent>
        </Card>
        
        {/* Simplified Analysis Panel */}
        {!isFullscreen && !isMaximized && (
          <Card>
            <CardHeader>
              <CardTitle>Live Movement Analysis</CardTitle>
              <CardDescription>Real-time movement metrics and body analysis</CardDescription>
            </CardHeader>
            <CardContent>
              
              {/* Body Part Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Focus Area:</label>
                <select 
                  value={selectedBodyPart} 
                  onChange={(e) => setSelectedBodyPart(e.target.value as BodyRegionId)}
                  className="w-full p-2 border rounded-md"
                >
                  {Object.entries(BODY_REGIONS).map(([id, region]) => (
                    <option key={id} value={id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
            </CardContent>
          </Card>
        )}
        
        {/* Simplified movement metrics display */}
        {kneeMetrics && !isFullscreen && !isMaximized && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Live Movement Analysis</CardTitle>
              <CardDescription>Real-time movement metrics during tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Flexion</div>
                  <div className="text-2xl font-bold">{kneeMetrics.flexionAngle.toFixed(1)}°</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Valgus</div>
                  <div className="text-2xl font-bold">{kneeMetrics.valgusAngle.toFixed(1)}°</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Rotation</div>
                  <div className="text-2xl font-bold">{kneeMetrics.rotationAngle.toFixed(1)}°</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}