import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Play, StopCircle, Download, User, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import PoseDetection from './PoseDetection';

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
  const [virtualPatient, setVirtualPatient] = useState<any>(null);
  const [showVirtualPatient, setShowVirtualPatient] = useState(false);
  
  const { toast } = useToast();

  // Handle pose data from TensorFlow.js detector
  const handlePoseData = useCallback((poses: any[]) => {
    if (isRecording && poses.length > 0) {
      const pose = poses[0];
      console.log('Recording pose data:', pose.keypoints.length, 'keypoints');
      
      const frameData: PoseFrame = {
        timestamp: Date.now() - recordingStartTime,
        landmarks: pose.keypoints,
        worldLandmarks: pose.keypoints // MoveNet doesn't separate world landmarks
      };
      setRecordedFrames(prev => [...prev, frameData]);
    }
  }, [isRecording, recordingStartTime]);

  // Create virtual patient from recorded motion data
  const createVirtualPatient = useCallback(async () => {
    if (recordedFrames.length === 0) {
      toast({
        title: "No Motion Data",
        description: "Please record some movement data first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/virtual-patient/create', {
        motionData: recordedFrames,
        duration: recordedFrames[recordedFrames.length - 1]?.timestamp || 0,
        frameCount: recordedFrames.length
      });

      const patient = await response.json();
      setVirtualPatient(patient);
      setShowVirtualPatient(true);
      
      toast({
        title: "Virtual Patient Created",
        description: "AI analysis complete with clinical recommendations.",
      });
    } catch (error) {
      console.error('Error creating virtual patient:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create virtual patient from motion data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [recordedFrames, toast]);

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
          setIsPoseDetectionActive(true);
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
    setIsPoseDetectionActive(false);
  }, []);

  // Generate virtual patient from motion data  
  const generateVirtualPatient = useCallback(async () => {
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
  const startRecording = useCallback((e?: React.MouseEvent) => {
    // Prevent any default form submission or navigation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isCameraActive) return;
    
    setRecordedFrames([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
    console.log('Recording started with pose detection');
    
    toast({
      title: "Recording Started",
      description: "Motion capture is now recording pose data.",
    });
  }, [isCameraActive, toast]);

  // Stop recording and automatically generate virtual patient
  const stopRecording = useCallback(async (e?: React.MouseEvent) => {
    try {
      // Prevent any default form submission or navigation
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log('Stop recording called, current frames:', recordedFrames.length);
      
      setIsRecording(false);
      
      // Use current state directly instead of relying on recordedFrames state
      const currentFrames = [...recordedFrames];
      console.log('Recording stopped. Frames captured:', currentFrames.length);
      
      // Callback with recorded data
      if (onMotionDataCapture && currentFrames.length > 0) {
        onMotionDataCapture(currentFrames);
      }
      
      // Automatically generate virtual patient if we have motion data
      if (currentFrames.length > 0) {
        setIsLoading(true);
        
        // Add small delay to ensure state updates complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Analyze motion patterns from recorded frames
        const motionAnalysis = {
          totalFrames: currentFrames.length,
          duration: currentFrames[currentFrames.length - 1]?.timestamp || 0,
          avgLandmarksPerFrame: currentFrames.filter(f => f.landmarks.length > 0).length,
          movementQuality: currentFrames.filter(f => f.landmarks.length > 0).length / currentFrames.length
        };
        
        // Generate virtual patient profile based on motion data
        const patientProfile = {
          id: `vp_${Date.now()}`,
          name: `Virtual Patient ${Math.floor(Math.random() * 1000)}`,
          age: Math.floor(Math.random() * 50) + 20,
          condition: motionAnalysis.movementQuality > 0.7 ? 'Normal movement patterns' : 'Movement dysfunction detected',
          motionData: currentFrames,
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
        
        toast({
          title: "Virtual Patient Created",
          description: `Generated virtual patient from ${currentFrames.length} motion frames.`,
        });
        
        console.log('Virtual patient created:', patientProfile);
        
      } else {
        toast({
          title: "Recording Stopped",
          description: "No motion data captured. Try recording with movement.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in stopRecording:', error);
      setError('Failed to process recording');
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: "Failed to process motion data.",
        variant: "destructive",
      });
    }
  }, [onMotionDataCapture, recordedFrames, toast]);

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
    <div className={`space-y-6 ${className}`} onClick={(e) => e.stopPropagation()}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Motion Capture System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap" onSubmit={(e) => e.preventDefault()}>
            {!isCameraActive ? (
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startCamera();
                }}
                disabled={isLoading}
                className="flex items-center gap-2"
                type="button"
              >
                <Camera className="h-4 w-4" />
                {isLoading ? 'Starting...' : 'Start Camera'}
              </Button>
            ) : (
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  stopCamera();
                }}
                variant="destructive"
                className="flex items-center gap-2"
                type="button"
              >
                <StopCircle className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
            
            {isCameraActive && !isRecording && (
              <Button 
                onClick={(e) => startRecording(e)}
                className="flex items-center gap-2"
                type="button"
              >
                <Play className="h-4 w-4" />
                Start Recording
              </Button>
            )}
            
            {isRecording && (
              <Button 
                onClick={(e) => {
                  console.log('Stop recording button clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  stopRecording(e);
                  return false;
                }}
                variant="destructive"
                className="flex items-center gap-2"
                type="button"
                disabled={isLoading}
              >
                <Square className="h-4 w-4" />
                {isLoading ? 'Processing...' : 'Stop Recording'}
              </Button>
            )}
            
            {recordedFrames.length > 0 && (
              <>
                <Button 
                  onClick={generateVirtualPatient}
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

          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '480px' }}>
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
              width={1280}
              height={720}
              style={{ display: isPoseDetectionActive ? 'block' : 'none' }}
            />
            
            {/* Pose Detection Component */}
            <PoseDetection
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={isPoseDetectionActive && isCameraActive}
              onPoseData={handlePoseData}
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