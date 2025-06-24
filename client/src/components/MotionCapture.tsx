import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Play, StopCircle, Download } from 'lucide-react';

interface PoseFrame {
  timestamp: number;
  landmarks: any[];
  worldLandmarks: any[];
}

interface MotionCaptureProps {
  onMotionDataCapture?: (data: PoseFrame[]) => void;
  className?: string;
}

export default function MotionCapture({ onMotionDataCapture, className }: MotionCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<PoseFrame[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setIsLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!isCameraActive) return;
    
    setRecordedFrames([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
    
    // Simple frame capture without MediaPipe for now
    const captureInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw current video frame to canvas
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          // Store basic frame data (without pose landmarks for now)
          const frameData: PoseFrame = {
            timestamp: Date.now() - recordingStartTime,
            landmarks: [], // Will be populated when MediaPipe is working
            worldLandmarks: []
          };
          
          setRecordedFrames(prev => [...prev, frameData]);
        }
      }
    }, 100); // Capture every 100ms

    // Store interval ID for cleanup
    (window as any).captureInterval = captureInterval;
  }, [isCameraActive, recordingStartTime]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    // Clear capture interval
    if ((window as any).captureInterval) {
      clearInterval((window as any).captureInterval);
      (window as any).captureInterval = null;
    }
    
    // Callback with recorded data
    if (onMotionDataCapture && recordedFrames.length > 0) {
      onMotionDataCapture(recordedFrames);
    }
  }, [onMotionDataCapture, recordedFrames]);

  // Download recording data
  const downloadRecording = useCallback(() => {
    if (recordedFrames.length === 0) return;
    
    const data = JSON.stringify({
      totalFrames: recordedFrames.length,
      duration: recordedFrames[recordedFrames.length - 1]?.timestamp || 0,
      frames: recordedFrames
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motion-capture-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if ((window as any).captureInterval) {
        clearInterval((window as any).captureInterval);
      }
    };
  }, [stopCamera]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Motion Capture System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {!isCameraActive ? (
              <Button 
                onClick={startCamera} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {isLoading ? 'Starting...' : 'Start Camera'}
              </Button>
            ) : (
              <Button 
                onClick={stopCamera} 
                variant="destructive"
                className="flex items-center gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
            
            {isCameraActive && !isRecording && (
              <Button 
                onClick={startRecording}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Recording
              </Button>
            )}
            
            {isRecording && (
              <Button 
                onClick={stopRecording}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            
            {recordedFrames.length > 0 && (
              <Button 
                onClick={downloadRecording}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Data
              </Button>
            )}
          </div>

          <div className="flex gap-4">
            <Badge variant={isCameraActive ? "default" : "secondary"}>
              Camera: {isCameraActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              Recording: {isRecording ? 'ON' : 'OFF'}
            </Badge>
            {recordedFrames.length > 0 && (
              <Badge variant="outline">
                Frames: {recordedFrames.length}
              </Badge>
            )}
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              width={640}
              height={480}
              style={{ display: 'none' }}
            />
            
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">Camera not active</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Click "Start Camera" to activate video feed</li>
              <li>Click "Start Recording" to capture motion data</li>
              <li>Move around to generate motion data (pose detection coming soon)</li>
              <li>Click "Stop Recording" and "Download Data" to save your session</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}