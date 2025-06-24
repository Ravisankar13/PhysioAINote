import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Play, StopCircle, Download, User, Brain } from 'lucide-react';

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
  const [isPoseDetectionActive, setIsPoseDetectionActive] = useState(false);
  const [poseDetector, setPoseDetector] = useState<any>(null);
  const [virtualPatient, setVirtualPatient] = useState<any>(null);
  const [showVirtualPatient, setShowVirtualPatient] = useState(false);

  // Initialize MediaPipe Pose Detection
  const initializePoseDetection = useCallback(async () => {
    try {
      console.log('Initializing MediaPipe pose detection...');
      setError('Loading pose detection models...');
      
      // Import MediaPipe modules with better error handling
      console.log('Importing MediaPipe modules...');
      const poseModule = await import('@mediapipe/pose');
      const drawingModule = await import('@mediapipe/drawing_utils');
      
      console.log('MediaPipe modules imported successfully');
      
      const pose = new poseModule.Pose({
        locateFile: (file: string) => {
          const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          console.log('Loading MediaPipe file:', url);
          return url;
        }
      });

      console.log('Setting pose options...');
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      console.log('Setting up pose results callback...');
      pose.onResults((results: any) => {
        if (canvasRef.current && results.image) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            try {
              // Clear and draw video frame
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
              
              // Draw pose landmarks if detected
              if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                console.log('Drawing pose landmarks:', results.poseLandmarks.length);
                
                // Draw connections (green lines)
                drawingModule.drawConnectors(ctx, results.poseLandmarks, poseModule.POSE_CONNECTIONS, {
                  color: '#00ff00',
                  lineWidth: 2
                });
                
                // Draw landmarks (red dots)
                drawingModule.drawLandmarks(ctx, results.poseLandmarks, {
                  color: '#ff0000',
                  radius: 3
                });
                
                // Record pose data if recording
                if (isRecording) {
                  const frameData: PoseFrame = {
                    timestamp: Date.now() - recordingStartTime,
                    landmarks: results.poseLandmarks,
                    worldLandmarks: results.poseWorldLandmarks || []
                  };
                  setRecordedFrames(prev => [...prev, frameData]);
                }
              }
            } catch (drawError) {
              console.error('Error drawing pose results:', drawError);
            }
          }
        }
      });

      console.log('Initializing pose detector...');
      await pose.initialize();
      
      setPoseDetector(pose);
      setIsPoseDetectionActive(true);
      setError('');
      console.log('MediaPipe pose detection initialized successfully!');
      
    } catch (error) {
      console.error('Failed to initialize MediaPipe pose detection:', error);
      setError('Pose detection unavailable - camera will work in basic mode');
      setIsPoseDetectionActive(false);
    }
  }, [isRecording, recordingStartTime]);

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
        
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata loaded, starting video...');
          videoRef.current?.play();
          setIsCameraActive(true);
          setIsLoading(false);
          
          // Initialize pose detection after video is ready
          console.log('Initializing pose detection after video start...');
          await initializePoseDetection();
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setIsLoading(false);
    }
  }, [initializePoseDetection]);

  // Start pose processing loop when detector is ready
  useEffect(() => {
    let animationId: number;
    
    if (poseDetector && isPoseDetectionActive && isCameraActive) {
      console.log('Starting pose processing loop...');
      
      const processFrame = () => {
        if (videoRef.current && poseDetector && isPoseDetectionActive) {
          try {
            // Send video frame to pose detector
            poseDetector.send({ image: videoRef.current });
          } catch (error) {
            console.warn('Error processing frame:', error);
          }
        }
        
        if (isPoseDetectionActive && isCameraActive) {
          animationId = requestAnimationFrame(processFrame);
        }
      };
      
      animationId = requestAnimationFrame(processFrame);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [poseDetector, isPoseDetectionActive, isCameraActive]);

  // Stop camera
  const stopCamera = useCallback(() => {
    setIsPoseDetectionActive(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
    setIsRecording(false);
    setPoseDetector(null);
  }, []);

  // Create virtual patient from motion data
  const createVirtualPatient = useCallback(async () => {
    if (recordedFrames.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // Analyze motion patterns from recorded frames
      const motionAnalysis = {
        totalFrames: recordedFrames.length,
        duration: recordedFrames[recordedFrames.length - 1]?.timestamp || 0,
        avgLandmarksPerFrame: recordedFrames.filter(f => f.landmarks.length > 0).length,
        movementQuality: recordedFrames.filter(f => f.landmarks.length > 0).length / recordedFrames.length
      };
      
      // Generate virtual patient profile based on motion data
      const patientProfile = {
        id: `vp_${Date.now()}`,
        name: `Virtual Patient ${Math.floor(Math.random() * 1000)}`,
        age: Math.floor(Math.random() * 50) + 20,
        condition: motionAnalysis.movementQuality > 0.7 ? 'Normal movement patterns' : 'Movement dysfunction detected',
        motionData: recordedFrames,
        analysis: motionAnalysis,
        recommendations: [
          'Assess joint range of motion',
          'Evaluate muscle strength',
          'Check movement compensation patterns'
        ],
        createdAt: new Date().toISOString()
      };
      
      setVirtualPatient(patientProfile);
      setShowVirtualPatient(true);
      setIsLoading(false);
      
      console.log('Virtual patient created:', patientProfile);
      
    } catch (error) {
      console.error('Error creating virtual patient:', error);
      setError('Failed to create virtual patient');
      setIsLoading(false);
    }
  }, [recordedFrames]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!isCameraActive) return;
    
    setRecordedFrames([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
    console.log('Recording started with pose detection');
  }, [isCameraActive]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    console.log('Recording stopped. Frames captured:', recordedFrames.length);
    
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
              <>
                <Button 
                  onClick={createVirtualPatient}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Create Virtual Patient
                </Button>
                <Button 
                  onClick={downloadRecording}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Data
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-4 flex-wrap">
            <Badge variant={isCameraActive ? "default" : "secondary"}>
              Camera: {isCameraActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={isPoseDetectionActive ? "default" : "secondary"}>
              Pose Detection: {isPoseDetectionActive ? 'Active' : 'Inactive'}
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
              style={{ display: isPoseDetectionActive ? 'block' : 'none' }}
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
              <li>Click "Start Camera" to activate video feed and pose detection</li>
              <li>Stand in front of camera - green lines show pose detection working</li>
              <li>Click "Start Recording" to capture motion data with pose landmarks</li>
              <li>Move around to generate comprehensive motion data</li>
              <li>Click "Stop Recording" then "Create Virtual Patient" for AI analysis</li>
            </ul>
          </div>

          {/* Virtual Patient Display */}
          {showVirtualPatient && virtualPatient && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Virtual Patient Created
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">{virtualPatient.name}</p>
                    <p className="text-sm text-muted-foreground">Age: {virtualPatient.age}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Motion Quality:</p>
                    <p className="text-sm">{(virtualPatient.analysis.movementQuality * 100).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium text-sm">Condition:</p>
                  <p className="text-sm">{virtualPatient.condition}</p>
                </div>
                
                <div>
                  <p className="font-medium text-sm">Assessment Recommendations:</p>
                  <ul className="text-sm list-disc list-inside">
                    {virtualPatient.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setShowVirtualPatient(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      const data = JSON.stringify(virtualPatient, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `virtual-patient-${virtualPatient.id}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Patient
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}