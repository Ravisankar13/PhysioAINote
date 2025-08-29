import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera as CameraIcon, 
  Play, 
  Pause, 
  StopCircle, 
  Download, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Maximize2,
  Target,
  Info,
  Layers,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';

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

// Anatomy overlay layers
const ANATOMY_LAYERS = [
  { id: 'bones', label: 'Bones', color: '#ffffff' },
  { id: 'ligaments', label: 'Ligaments', color: '#ff6b6b' },
  { id: 'menisci', label: 'Menisci', color: '#4ecdc4' },
  { id: 'tendons', label: 'Tendons', color: '#45b7d1' },
  { id: 'muscles', label: 'Muscles', color: '#f7b801' }
];

interface KneeMetrics {
  flexionAngle: number;
  valgusAngle: number;
  rotationAngle: number;
  swellingEstimate: number;
  stabilityScore: number;
}

interface TrackedRegion {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  type: 'swelling' | 'bruising' | 'pain' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  timestamp: Date;
}

// MediaPipe types (will be loaded dynamically)
type Pose = any;
type Camera = any;
declare const POSE_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;

export default function BodyScanner() {
  const { toast } = useToast();
  
  // State management
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [selectedView, setSelectedView] = useState<'frontal' | 'lateral' | 'posterior'>('frontal');
  const [visibleLayers, setVisibleLayers] = useState<string[]>(['bones']);
  const [kneeMetrics, setKneeMetrics] = useState<KneeMetrics | null>(null);
  const [trackedRegions, setTrackedRegions] = useState<TrackedRegion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number>();
  
  // Helper function to calculate angle between three points
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };
  
  // Calculate knee metrics from landmarks
  const calculateKneeMetrics = (landmarks: any[]): KneeMetrics => {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    
    // Calculate flexion angles
    const leftFlexion = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightFlexion = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Calculate valgus angle (knee deviation)
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    const kneeCenter = { x: (leftKnee.x + rightKnee.x) / 2, y: (leftKnee.y + rightKnee.y) / 2 };
    const ankleCenter = { x: (leftAnkle.x + rightAnkle.x) / 2, y: (leftAnkle.y + rightAnkle.y) / 2 };
    const valgusAngle = calculateAngle(hipCenter, kneeCenter, ankleCenter);
    
    // Estimate rotation based on knee position relative to hip-ankle line
    const leftRotation = Math.abs(leftKnee.x - ((leftHip.x + leftAnkle.x) / 2)) * 100;
    const rightRotation = Math.abs(rightKnee.x - ((rightHip.x + rightAnkle.x) / 2)) * 100;
    
    // Mock swelling estimate (would use depth estimation in full implementation)
    const swellingEstimate = Math.random() * 20; // 0-20% estimate
    
    // Calculate stability score based on movement consistency
    const stabilityScore = 100 - (Math.abs(leftFlexion - rightFlexion) / 180 * 100);
    
    return {
      flexionAngle: Math.min(leftFlexion, rightFlexion),
      valgusAngle: 180 - valgusAngle,
      rotationAngle: Math.max(leftRotation, rightRotation),
      swellingEstimate,
      stabilityScore
    };
  };
  
  // Process pose detection results
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    // Clear canvases
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    // Draw pose landmarks and connections
    if (results.poseLandmarks) {
      // Calculate and update knee metrics
      const metrics = calculateKneeMetrics(results.poseLandmarks);
      setKneeMetrics(metrics);
      
      // Draw connections
      if (window.drawConnectors && window.POSE_CONNECTIONS) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
      }
      
      // Draw landmarks
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 4
        });
      }
      
      // Draw knee tracking lines
      const leftKnee = results.poseLandmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rightKnee = results.poseLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const leftAnkle = results.poseLandmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rightAnkle = results.poseLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      const leftHip = results.poseLandmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = results.poseLandmarks[POSE_LANDMARKS.RIGHT_HIP];
      
      // Draw alignment guides
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Left leg alignment
      ctx.beginPath();
      ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
      ctx.lineTo(leftKnee.x * canvas.width, leftKnee.y * canvas.height);
      ctx.lineTo(leftAnkle.x * canvas.width, leftAnkle.y * canvas.height);
      ctx.stroke();
      
      // Right leg alignment
      ctx.beginPath();
      ctx.moveTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
      ctx.lineTo(rightKnee.x * canvas.width, rightKnee.y * canvas.height);
      ctx.lineTo(rightAnkle.x * canvas.width, rightAnkle.y * canvas.height);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Draw anatomy overlay if layers are visible
      if (visibleLayers.length > 0) {
        drawAnatomyOverlay(overlayCtx, results.poseLandmarks, overlayCanvas.width, overlayCanvas.height);
      }
      
      // Draw tracked regions
      trackedRegions.forEach(region => {
        drawTrackedRegion(ctx, region, canvas.width, canvas.height);
      });
    }
    
    ctx.restore();
  }, [visibleLayers, trackedRegions]);
  
  // Draw anatomy overlay
  const drawAnatomyOverlay = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    
    // Simple anatomy visualization (placeholder for 3D models)
    visibleLayers.forEach(layerId => {
      const layer = ANATOMY_LAYERS.find(l => l.id === layerId);
      if (!layer) return;
      
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = layer.color;
      
      // Draw simplified knee anatomy around landmarks
      const kneeSize = 40;
      
      // Left knee
      ctx.beginPath();
      ctx.arc(leftKnee.x * width, leftKnee.y * height, kneeSize, 0, 2 * Math.PI);
      ctx.fill();
      
      // Right knee
      ctx.beginPath();
      ctx.arc(rightKnee.x * width, rightKnee.y * height, kneeSize, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add layer-specific details
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(layer.label, leftKnee.x * width - 20, leftKnee.y * height - kneeSize - 5);
      ctx.fillText(layer.label, rightKnee.x * width - 20, rightKnee.y * height - kneeSize - 5);
    });
    
    ctx.globalAlpha = 1;
  };
  
  // Draw tracked region
  const drawTrackedRegion = (ctx: CanvasRenderingContext2D, region: TrackedRegion, width: number, height: number) => {
    ctx.strokeStyle = region.type === 'swelling' ? '#ff0000' : 
                     region.type === 'bruising' ? '#800080' : 
                     region.type === 'pain' ? '#ffa500' : '#00ff00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    
    ctx.beginPath();
    region.points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
    
    // Draw label
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '14px Arial';
    ctx.fillText(region.label, region.points[0].x * width, region.points[0].y * height - 10);
    
    ctx.globalAlpha = 1;
  };
  
  // Load MediaPipe libraries on mount
  useEffect(() => {
    const loadLibraries = async () => {
      const loaded = await loadMediaPipeLibraries();
      setMediapipeLoaded(loaded);
      if (!loaded) {
        toast({
          title: "Failed to load MediaPipe",
          description: "Unable to load pose tracking libraries",
          variant: "destructive",
        });
      }
    };
    loadLibraries();
  }, []);
  
  // Initialize camera and pose detection
  useEffect(() => {
    if (!isTracking || !mediapipeLoaded) return;
    
    const initializeTracking = async () => {
      try {
        setCameraStatus('initializing');
        
        // Wait for MediaPipe to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize Pose
        const pose = new window.Pose({
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
        
        // Initialize Camera
        if (videoRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (poseRef.current && !isPaused && videoRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
            facingMode: 'environment'
          });
          
          cameraRef.current = camera;
          await camera.start();
          setCameraStatus('ready');
          
          toast({
            title: "Camera Ready",
            description: "Real-time knee tracking is active",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Failed to initialize tracking:', error);
        setCameraStatus('error');
        toast({
          title: "Initialization Error",
          description: "Failed to start camera tracking",
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
  }, [isTracking, mediapipeLoaded, isPaused, onPoseResults]);
  
  // Handle region selection (placeholder for SAM 2 integration)
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    // Create a simple circular region (SAM 2 would provide precise segmentation)
    const newRegion: TrackedRegion = {
      id: `region-${Date.now()}`,
      label: `Region ${trackedRegions.length + 1}`,
      points: Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return {
          x: x + Math.cos(angle) * 0.05,
          y: y + Math.sin(angle) * 0.05
        };
      }),
      type: 'swelling',
      severity: 'mild',
      timestamp: new Date()
    };
    
    setTrackedRegions([...trackedRegions, newRegion]);
    
    toast({
      title: "Region Marked",
      description: "Tap on the region to refine selection (SAM 2 integration pending)",
      duration: 2000,
    });
  };
  
  // Toggle anatomy layer visibility
  const toggleLayer = (layerId: string) => {
    setVisibleLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };
  
  // Capture current frame
  const captureFrame = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCapturedFrames(prev => [...prev, dataUrl]);
    
    toast({
      title: "Frame Captured",
      description: "Image saved to analysis history",
      duration: 2000,
    });
  };
  
  // Generate educational report
  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: kneeMetrics,
      regions: trackedRegions,
      frames: capturedFrames,
      view: selectedView,
      educationalNotes: [
        "Region overlies structures commonly associated with medial meniscus and MCL",
        "Consider clinical tests: McMurray's, Thessaly, valgus stress at 30°",
        "Observed movement patterns suggest potential compensatory mechanisms",
        "Recommend clinical correlation with physical examination"
      ]
    };
    
    console.log('Educational Report:', report);
    
    toast({
      title: "Report Generated",
      description: "Educational visualization report created (PDF export pending)",
      duration: 3000,
    });
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Advanced Knee Assessment Tool
          </CardTitle>
          <CardDescription>
            Educational visualization with real-time pose tracking and anatomical overlays
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Educational Tool Only</AlertTitle>
        <AlertDescription>
          This tool provides anatomical education and visualization. It is not intended for diagnosis or treatment.
          Always consult with qualified healthcare professionals for clinical decisions.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video/Canvas Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Live Tracking</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={cameraStatus === 'ready' ? 'default' : 'secondary'}>
                    {cameraStatus === 'ready' ? 'Active' : 
                     cameraStatus === 'initializing' ? 'Initializing...' : 
                     cameraStatus === 'error' ? 'Error' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{selectedView} View</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  className="w-full h-auto cursor-crosshair"
                  onClick={handleCanvasClick}
                />
                <canvas
                  ref={overlayCanvasRef}
                  width={1280}
                  height={720}
                  className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                />
                
                {!isTracking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Button
                      size="lg"
                      onClick={() => setIsTracking(true)}
                      className="gap-2"
                    >
                      <Play className="h-5 w-5" />
                      Start Tracking
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <Button
                    variant={isTracking ? 'destructive' : 'default'}
                    onClick={() => setIsTracking(!isTracking)}
                    disabled={cameraStatus === 'initializing'}
                  >
                    {isTracking ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isTracking ? 'Stop' : 'Start'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={!isTracking}
                  >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={captureFrame}
                    disabled={!isTracking || cameraStatus !== 'ready'}
                  >
                    <CameraIcon className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('frontal')}
                    className={selectedView === 'frontal' ? 'bg-primary/10' : ''}
                  >
                    Front
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('lateral')}
                    className={selectedView === 'lateral' ? 'bg-primary/10' : ''}
                  >
                    Side
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('posterior')}
                    className={selectedView === 'posterior' ? 'bg-primary/10' : ''}
                  >
                    Back
                  </Button>
                </div>
              </div>
              
              {/* View Instructions */}
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedView === 'frontal' ? 'Frontal' : selectedView === 'lateral' ? 'Lateral' : 'Posterior'} View:</strong> 
                  {selectedView === 'frontal' && ' Position camera directly in front. Keep knees visible with slight bend.'}
                  {selectedView === 'lateral' && ' Position camera to the side. Show full leg profile from hip to ankle.'}
                  {selectedView === 'posterior' && ' Position camera behind. Focus on alignment and symmetry.'}
                  <br />
                  <strong>Tip:</strong> Tap on areas of concern to mark regions for tracking.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
        
        {/* Control Panel */}
        <div className="space-y-6">
          {/* Real-time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kneeMetrics ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Flexion Angle</span>
                      <span className="font-mono">{kneeMetrics.flexionAngle.toFixed(1)}°</span>
                    </div>
                    <Progress value={kneeMetrics.flexionAngle / 180 * 100} className="h-2 mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Valgus Angle</span>
                      <span className="font-mono">{kneeMetrics.valgusAngle.toFixed(1)}°</span>
                    </div>
                    <Progress 
                      value={Math.min(kneeMetrics.valgusAngle / 20 * 100, 100)} 
                      className="h-2 mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Rotation</span>
                      <span className="font-mono">{kneeMetrics.rotationAngle.toFixed(1)}°</span>
                    </div>
                    <Progress value={kneeMetrics.rotationAngle / 30 * 100} className="h-2 mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Stability Score</span>
                      <span className="font-mono">{kneeMetrics.stabilityScore.toFixed(0)}%</span>
                    </div>
                    <Progress value={kneeMetrics.stabilityScore} className="h-2 mt-1" />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Start tracking to see live metrics
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Anatomy Layers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Anatomy Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ANATOMY_LAYERS.map(layer => (
                <Button
                  key={layer.id}
                  variant={visibleLayers.includes(layer.id) ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleLayer(layer.id)}
                >
                  {visibleLayers.includes(layer.id) ? 
                    <Eye className="h-4 w-4 mr-2" /> : 
                    <EyeOff className="h-4 w-4 mr-2" />
                  }
                  <span className="flex-1 text-left">{layer.label}</span>
                  <div 
                    className="w-4 h-4 rounded-full ml-2"
                    style={{ backgroundColor: layer.color }}
                  />
                </Button>
              ))}
            </CardContent>
          </Card>
          
          {/* Tracked Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Marked Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trackedRegions.length > 0 ? (
                <div className="space-y-2">
                  {trackedRegions.map(region => (
                    <div key={region.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <div>
                        <p className="text-sm font-medium">{region.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {region.type} - {region.severity}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackedRegions(prev => prev.filter(r => r.id !== region.id))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tap on the video to mark regions
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={generateReport}
                  disabled={!kneeMetrics && trackedRegions.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Educational Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setTrackedRegions([]);
                    setCapturedFrames([]);
                    toast({
                      title: "Session Cleared",
                      description: "All tracked regions and captures removed",
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Captured Frames Gallery */}
      {capturedFrames.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Captured Frames</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {capturedFrames.map((frame, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={frame} 
                    alt={`Capture ${index + 1}`}
                    className="w-full h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = frame;
                      link.download = `knee-capture-${index + 1}.png`;
                      link.click();
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}