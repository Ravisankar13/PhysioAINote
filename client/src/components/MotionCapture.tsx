import { useRef, useEffect, useState, useCallback } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Camera as CameraIcon, Download, Upload } from 'lucide-react';

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
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPoseDetectionActive, setIsPoseDetectionActive] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<PoseFrame[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [currentPose, setCurrentPose] = useState<Results | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPoseReady, setIsPoseReady] = useState(false);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initializePose = async () => {
      if (!poseRef.current) {
        console.log('Initializing MediaPipe Pose...');
        const pose = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
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
        
        // Wait for pose to initialize
        await pose.initialize();
        poseRef.current = pose;
        setIsPoseReady(true);
        console.log('MediaPipe Pose initialized successfully');
      }
    };

    initializePose().catch(error => {
      console.error('Failed to initialize MediaPipe Pose:', error);
    });
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle pose detection results
  const onPoseResults = useCallback((results: Results) => {
    setCurrentPose(results);
    
    if (canvasRef.current && results.image) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the input image
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        
        // Draw pose landmarks and connections
        if (results.poseLandmarks) {
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: '#00ff00',
            lineWidth: 2
          });
          drawLandmarks(ctx, results.poseLandmarks, {
            color: '#ff0000',
            radius: 3
          });
        }
      }
    }

    // Record pose data if recording
    if (isRecording && results.poseLandmarks && results.poseWorldLandmarks) {
      const frameData: PoseFrame = {
        timestamp: Date.now() - recordingStartTime,
        landmarks: results.poseLandmarks,
        worldLandmarks: results.poseWorldLandmarks
      };
      
      setRecordedFrames(prev => [...prev, frameData]);
    }
  }, [isRecording, recordingStartTime]);

  // Start camera and pose detection
  const startCamera = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    try {
      console.log('Starting camera initialization...');
      
      // Ensure pose detector is initialized first
      if (!poseRef.current || !isPoseReady) {
        console.log('Pose detector not ready, waiting for initialization...');
        // Wait for pose detector to be ready with timeout
        let attempts = 0;
        while ((!poseRef.current || !isPoseReady) && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        if (!poseRef.current || !isPoseReady) {
          throw new Error('Pose detector failed to initialize. Please refresh the page and try again.');
        }
      }
      
      // Ensure video element exists
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }
      
      console.log('Pose detector and video element ready, requesting camera access...');
      
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      console.log('Camera stream obtained:', stream);
      
      if (videoRef.current && poseRef.current) {
        // Set the video source to the camera stream
        videoRef.current.srcObject = stream;
        
        // Wait for the video to be ready
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            const timeout = setTimeout(() => {
              reject(new Error('Video loading timeout'));
            }, 10000); // 10 second timeout
            
            videoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              console.log('Video metadata loaded');
              videoRef.current?.play().then(() => {
                console.log('Video playing');
                resolve(true);
              }).catch(reject);
            };
            
            videoRef.current.onerror = (error) => {
              clearTimeout(timeout);
              reject(error);
            };
          }
        });

        console.log('Video is ready, setting pose detection active');
        // Set pose detection active first since we have the video stream
        setIsPoseDetectionActive(true);

        // Initialize MediaPipe Camera
        console.log('Initializing MediaPipe Camera...');
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && videoRef.current) {
              await poseRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        
        await camera.start();
        cameraRef.current = camera;
        console.log('Camera started successfully');
      } else {
        throw new Error('Video element or pose detector not available');
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setIsPoseDetectionActive(false); // Reset state on error
      
      const errorObj = error as Error & { name?: string };
      if (errorObj.name === 'NotAllowedError') {
        alert('Camera access denied. Please allow camera permissions and try again.');
      } else if (errorObj.name === 'NotFoundError') {
        alert('No camera found. Please connect a camera and try again.');
      } else if (errorObj.message?.includes('timeout')) {
        alert('Camera loading timed out. Please try again.');
      } else {
        alert('Could not access camera. Error: ' + (errorObj.message || 'Unknown error'));
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // Stop camera and pose detection
  const stopCamera = () => {
    // Stop MediaPipe camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsPoseDetectionActive(false);
    setCurrentPose(null);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Start recording motion data
  const startRecording = () => {
    setRecordedFrames([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
  };

  // Stop recording motion data
  const stopRecording = () => {
    setIsRecording(false);
    if (onMotionDataCapture && recordedFrames.length > 0) {
      onMotionDataCapture(recordedFrames);
    }
  };

  // Export recorded motion data
  const exportMotionData = () => {
    if (recordedFrames.length === 0) return;
    
    const dataStr = JSON.stringify(recordedFrames, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `motion-capture-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Import motion data from file
  const importMotionData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setRecordedFrames(data);
        if (onMotionDataCapture) {
          onMotionDataCapture(data);
        }
      } catch (error) {
        console.error('Error parsing motion data file:', error);
        alert('Invalid motion data file format.');
      }
    };
    reader.readAsText(file);
  };

  // Get pose quality indicator
  const getPoseQuality = () => {
    if (!currentPose?.poseLandmarks) return 'No pose detected';
    
    const landmarks = currentPose.poseLandmarks;
    const visibilitySum = landmarks.reduce((sum, landmark) => sum + (landmark.visibility || 0), 0);
    const avgVisibility = visibilitySum / landmarks.length;
    
    if (avgVisibility > 0.8) return 'Excellent';
    if (avgVisibility > 0.6) return 'Good';
    if (avgVisibility > 0.4) return 'Fair';
    return 'Poor';
  };

  const poseQuality = getPoseQuality();

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5" />
            Motion Capture System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Feed and Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Camera Feed</h3>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-60"
                  playsInline
                  muted
                />
                {!isPoseDetectionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <p className="text-white text-sm">Camera not active</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Pose Detection</h3>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="w-full h-auto max-h-60"
                />
                {!isPoseDetectionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <p className="text-white text-sm">Pose detection not active</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={isPoseDetectionActive ? "default" : isPoseReady ? "secondary" : "outline"}>
                {isPoseDetectionActive ? "Camera Active" : isPoseReady ? "Camera Inactive" : "Initializing Pose Detector..."}
              </Badge>
              <Badge variant={currentPose?.poseLandmarks ? "default" : "secondary"}>
                Pose Quality: {poseQuality}
              </Badge>
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? "Recording" : "Not Recording"}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Recorded Frames: {recordedFrames.length}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            {!isPoseDetectionActive ? (
              <Button 
                onClick={startCamera} 
                disabled={isInitializing || !isPoseReady}
                className="flex items-center gap-2"
              >
                {isInitializing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CameraIcon className="h-4 w-4" />
                    Start Camera
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
            
            {isPoseDetectionActive && !isRecording && (
              <Button onClick={startRecording} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Recording
              </Button>
            )}
            
            {isRecording && (
              <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            
            {recordedFrames.length > 0 && (
              <Button onClick={exportMotionData} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            )}
            
            <Button asChild variant="outline" className="flex items-center gap-2">
              <label htmlFor="import-motion-data">
                <Upload className="h-4 w-4" />
                Import Data
              </label>
            </Button>
            <input
              id="import-motion-data"
              type="file"
              accept=".json"
              onChange={importMotionData}
              className="hidden"
            />
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Instructions:</strong></p>
            <p>1. Click "Start Camera" and position yourself in full view</p>
            <p>2. Ensure good lighting and clear background</p>
            <p>3. Click "Start Recording" and perform the movement</p>
            <p>4. Click "Stop Recording" when complete</p>
            <p>5. Export the data to save or use "Import Data" to load previous recordings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}