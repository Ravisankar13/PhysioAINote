import { useRef, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, RefreshCw, AlertCircle, User } from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';
import { MEDIAPIPE_CONFIG, checkMediaPipeSupport } from '@/config/mediapipe';
import { convertMediaPipeTo3D, Posesmoother, Skeleton3DPose } from '@/utils/mediapipeTo3D';

interface CameraPoseCaptureProps {
  onPoseUpdate?: (pose: Skeleton3DPose) => void;
  onRawLandmarks?: (landmarks: any[]) => void;
  className?: string;
  isActive?: boolean;
}

export default function CameraPoseCapture({ 
  onPoseUpdate, 
  onRawLandmarks,
  className,
  isActive: externalIsActive
}: CameraPoseCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const smootherRef = useRef<Posesmoother>(new Posesmoother(0.4));
  const animationFrameRef = useRef<number | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [poseDetected, setPoseDetected] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [smoothingLevel, setSmoothingLevel] = useState(0.4);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    smootherRef.current = new Posesmoother(smoothingLevel);
  }, [smoothingLevel]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setPoseDetected(false);
    setFps(0);
  }, []);

  // Respond to external isActive prop changes
  useEffect(() => {
    if (externalIsActive === false && isActive) {
      stopCamera();
    }
  }, [externalIsActive, isActive, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const support = checkMediaPipeSupport();
      if (!support.supported) {
        throw new Error(support.error || 'MediaPipe not supported');
      }

      const loaded = await loadMediaPipeLibraries();
      if (!loaded) {
        throw new Error('Failed to load MediaPipe libraries');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const pose = new window.Pose({
        locateFile: MEDIAPIPE_CONFIG.pose.locateFile
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      pose.onResults((results: any) => {
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFrameTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          setPoseDetected(true);
          
          if (onRawLandmarks) {
            onRawLandmarks(results.poseLandmarks);
          }

          if (onPoseUpdate) {
            // Always pass false for mirrorMode - video mirroring is handled in UI only
            // The pose data should remain anatomically correct (left arm = left humerus)
            const pose3D = convertMediaPipeTo3D(results.poseLandmarks, false);
            const smoothedPose = smootherRef.current.smooth(pose3D);
            onPoseUpdate(smoothedPose);
          }

          if (canvasRef.current && showPreview) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              
              ctx.save();
              if (mirrorVideo) {
                ctx.scale(-1, 1);
                ctx.translate(-canvasRef.current.width, 0);
              }
              ctx.drawImage(videoRef.current, 0, 0);
              ctx.restore();
              
              // Mirror landmark x-coordinates when video is mirrored
              // MediaPipe uses normalized 0-1 coordinates, so we flip x around 0.5
              const landmarksForDrawing = mirrorVideo
                ? results.poseLandmarks.map((lm: any) => ({
                    ...lm,
                    x: 1 - lm.x  // Mirror x-coordinate
                  }))
                : results.poseLandmarks;
              
              if (window.drawConnectors && window.drawLandmarks) {
                window.drawConnectors(ctx, landmarksForDrawing, window.POSE_CONNECTIONS, {
                  color: '#00FF00',
                  lineWidth: 2
                });
                window.drawLandmarks(ctx, landmarksForDrawing, {
                  color: '#FF0000',
                  lineWidth: 1,
                  radius: 3
                });
              }
            }
          }
        } else {
          setPoseDetected(false);
        }
      });

      await pose.initialize();
      poseRef.current = pose;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });

      await camera.start();
      cameraRef.current = camera;
      
      setIsActive(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setError(err.message || 'Failed to start camera');
      setIsLoading(false);
      stopCamera();
    }
  }, [onPoseUpdate, onRawLandmarks, showPreview, mirrorVideo, stopCamera]);

  const toggleCamera = useCallback(() => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isActive, startCamera, stopCamera]);

  return (
    <Card className={`${className} bg-slate-900 border-slate-700`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Patient Capture
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant={poseDetected ? "default" : "secondary"} className={poseDetected ? "bg-green-600" : ""}>
                {poseDetected ? `Tracking (${fps} FPS)` : 'Searching...'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-0"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover ${!showPreview && 'opacity-0'}`}
          />
          
          {!isActive && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <User className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-sm">Click Start to begin patient capture</p>
              <p className="text-xs text-slate-500 mt-1">Stand in frame facing the camera</p>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-2 text-white">Starting camera...</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={toggleCamera}
            disabled={isLoading}
            className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            data-testid="button-toggle-camera"
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Capture
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Capture
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="mirror"
                checked={mirrorVideo}
                onCheckedChange={setMirrorVideo}
              />
              <Label htmlFor="mirror" className="text-sm text-slate-300">Mirror</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="preview"
                checked={showPreview}
                onCheckedChange={setShowPreview}
              />
              <Label htmlFor="preview" className="text-sm text-slate-300">Preview</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-slate-300">Smoothing</Label>
            <span className="text-xs text-slate-400">{(smoothingLevel * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[smoothingLevel]}
            onValueChange={([value]) => setSmoothingLevel(value)}
            min={0.1}
            max={0.8}
            step={0.05}
            className="w-full"
          />
          <p className="text-xs text-slate-500">Higher = smoother but slower response</p>
        </div>
      </CardContent>
    </Card>
  );
}
