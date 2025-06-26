import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Video, Square, Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { EnhancedPoseDetection } from './EnhancedPoseDetection';

interface CameraConfig {
  deviceId: string;
  label: string;
  position: 'front' | 'side' | 'back';
  active: boolean;
}

interface MotionData {
  poses: any[];
  timestamp: number;
  cameraIndex: number;
  quality: number;
}

interface MultiCameraMotionCaptureProps {
  onMotionData?: (data: MotionData) => void;
  onRecordingComplete?: (recordingData: MotionData[]) => void;
}

export const MultiCameraMotionCapture: React.FC<MultiCameraMotionCaptureProps> = ({
  onMotionData,
  onRecordingComplete
}) => {
  // Camera management
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [activeCameras, setActiveCameras] = useState<number[]>([]);
  const [streams, setStreams] = useState<MediaStream[]>([]);
  
  // Video and canvas refs for multiple cameras
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const canvasRefs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingData, setRecordingData] = useState<MotionData[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Pose detection state
  const [isPoseDetectionActive, setIsPoseDetectionActive] = useState(false);
  const [detectionQuality, setDetectionQuality] = useState<number[]>([]);
  
  // UI state
  const [selectedView, setSelectedView] = useState('multi');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize camera devices
  const initializeCameras = useCallback(async () => {
    try {
      setError('');
      
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } 
      });
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());
      setCameraPermissionGranted(true);

      // Enumerate available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const cameraConfigs: CameraConfig[] = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        position: index === 0 ? 'front' : index === 1 ? 'side' : 'back',
        active: index === 0 // Activate first camera by default
      }));

      setCameras(cameraConfigs);
      
      // Automatically start the first camera
      if (cameraConfigs.length > 0) {
        await startCamera(0, cameraConfigs[0].deviceId);
        setActiveCameras([0]);
      }

      console.log(`Found ${videoDevices.length} camera(s)`);
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setError('Failed to access cameras. Please ensure camera permissions are granted.');
    }
  }, []);

  // Start individual camera
  const startCamera = async (cameraIndex: number, deviceId: string) => {
    try {
      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRefs[cameraIndex]?.current) {
        videoRefs[cameraIndex].current!.srcObject = stream;
        await videoRefs[cameraIndex].current!.play();
      }

      // Update streams array
      setStreams(prev => {
        const newStreams = [...prev];
        newStreams[cameraIndex] = stream;
        return newStreams;
      });

      console.log(`Camera ${cameraIndex + 1} started successfully`);
    } catch (error) {
      console.error(`Failed to start camera ${cameraIndex + 1}:`, error);
      setError(`Failed to start camera ${cameraIndex + 1}`);
    }
  };

  // Stop individual camera
  const stopCamera = (cameraIndex: number) => {
    if (streams[cameraIndex]) {
      streams[cameraIndex].getTracks().forEach(track => track.stop());
      
      if (videoRefs[cameraIndex]?.current) {
        videoRefs[cameraIndex].current!.srcObject = null;
      }

      setStreams(prev => {
        const newStreams = [...prev];
        newStreams[cameraIndex] = null as any;
        return newStreams;
      });
    }
  };

  // Toggle camera activation
  const toggleCamera = async (cameraIndex: number) => {
    const camera = cameras[cameraIndex];
    if (!camera) return;

    if (activeCameras.includes(cameraIndex)) {
      // Deactivate camera
      stopCamera(cameraIndex);
      setActiveCameras(prev => prev.filter(i => i !== cameraIndex));
    } else {
      // Activate camera
      await startCamera(cameraIndex, camera.deviceId);
      setActiveCameras(prev => [...prev, cameraIndex]);
    }
  };

  // Handle pose data from enhanced detection
  const handlePoseData = useCallback((poses: any[], cameraIndex: number) => {
    if (!poses || poses.length === 0) return;

    // Calculate quality metrics
    const avgConfidence = poses.reduce((sum, pose) => sum + pose.score, 0) / poses.length;
    const keypointCoverage = poses[0]?.keypoints?.filter((kp: any) => kp.confidence > 0.3).length || 0;
    const quality = (avgConfidence * 0.7) + ((keypointCoverage / 17) * 0.3); // 17 is total keypoints

    const motionData: MotionData = {
      poses,
      timestamp: Date.now(),
      cameraIndex,
      quality
    };

    // Update quality metrics
    setDetectionQuality(prev => {
      const newQuality = [...prev];
      newQuality[cameraIndex] = quality;
      return newQuality;
    });

    // Store recording data if recording
    if (isRecording && !isPaused) {
      setRecordingData(prev => [...prev, motionData]);
    }

    // Callback for real-time data
    onMotionData?.(motionData);
  }, [isRecording, isPaused, onMotionData]);

  // Recording controls
  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingData([]);
    setRecordingDuration(0);
    
    // Start timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (!isPaused) {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    // Store timer reference for cleanup
    (window as any).recordingTimer = timer;
  };

  const pauseRecording = () => {
    setIsPaused(!isPaused);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    
    if ((window as any).recordingTimer) {
      clearInterval((window as any).recordingTimer);
    }

    // Process and return recording data
    onRecordingComplete?.(recordingData);
    
    console.log(`Recording completed: ${recordingData.length} frames captured`);
  };

  // Toggle pose detection
  const togglePoseDetection = () => {
    setIsPoseDetectionActive(!isPoseDetectionActive);
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-calibrate camera positions
  const calibrateCameraPositions = async () => {
    // This would implement camera calibration for 3D reconstruction
    console.log('Camera calibration started...');
    // Placeholder for calibration logic
  };

  // Initialize on mount
  useEffect(() => {
    initializeCameras();
    
    return () => {
      // Cleanup all streams
      streams.forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      if ((window as any).recordingTimer) {
        clearInterval((window as any).recordingTimer);
      }
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Multi-Camera Motion Capture
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={cameraPermissionGranted ? "default" : "destructive"}>
                {cameraPermissionGranted ? `${cameras.length} Cameras` : 'No Access'}
              </Badge>
              <Badge variant={isPoseDetectionActive ? "default" : "secondary"}>
                {isPoseDetectionActive ? 'AI Detection Active' : 'Detection Inactive'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button onClick={startRecording} disabled={activeCameras.length === 0}>
                  <Video className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button onClick={pauseRecording} variant="outline">
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive">
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>

            {/* Pose Detection Toggle */}
            <Button 
              onClick={togglePoseDetection}
              variant={isPoseDetectionActive ? "default" : "outline"}
            >
              AI Detection {isPoseDetectionActive ? 'On' : 'Off'}
            </Button>

            {/* Calibration */}
            <Button onClick={calibrateCameraPositions} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Calibrate
            </Button>

            {/* Recording Status */}
            {isRecording && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-sm font-mono">{formatDuration(recordingDuration)}</span>
                </div>
                <Badge variant="outline">{recordingData.length} frames</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-red-600">{error}</div>
            <Button onClick={initializeCameras} variant="outline" size="sm" className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Camera Views */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Views</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedView} onValueChange={setSelectedView}>
            <TabsList>
              <TabsTrigger value="multi">Multi-View</TabsTrigger>
              <TabsTrigger value="single">Single View</TabsTrigger>
              <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
            </TabsList>
            
            <TabsContent value="multi" className="mt-4">
            {/* Multi-camera grid view */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.slice(0, 3).map((camera, index) => (
                <div key={camera.deviceId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{camera.label}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{camera.position}</Badge>
                      {detectionQuality[index] && (
                        <Badge variant={detectionQuality[index] > 0.7 ? "default" : "secondary"}>
                          {(detectionQuality[index] * 100).toFixed(0)}%
                        </Badge>
                      )}
                      <Button
                        onClick={() => toggleCamera(index)}
                        size="sm"
                        variant={activeCameras.includes(index) ? "default" : "outline"}
                      >
                        {activeCameras.includes(index) ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={videoRefs[index]}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <canvas
                      ref={canvasRefs[index]}
                      className="absolute top-0 left-0 w-full h-full"
                      width={640}
                      height={480}
                    />
                    {!activeCameras.includes(index) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                        <span className="text-white">Camera Inactive</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="single" className="mt-4">
            {/* Single camera view with selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {cameras.map((camera, index) => (
                  <Button
                    key={camera.deviceId}
                    onClick={() => toggleCamera(index)}
                    size="sm"
                    variant={activeCameras.includes(index) ? "default" : "outline"}
                  >
                    {camera.label}
                  </Button>
                ))}
              </div>
              {activeCameras.length > 0 && (
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-4xl mx-auto">
                  <video
                    ref={videoRefs[activeCameras[0]]}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRefs[activeCameras[0]]}
                    className="absolute top-0 left-0 w-full h-full"
                    width={1280}
                    height={720}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            {/* Side-by-side comparison view */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCameras.slice(0, 2).map((cameraIndex) => (
                <div key={cameraIndex} className="space-y-2">
                  <h4 className="font-medium">{cameras[cameraIndex]?.label}</h4>
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={videoRefs[cameraIndex]}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <canvas
                      ref={canvasRefs[cameraIndex]}
                      className="absolute top-0 left-0 w-full h-full"
                      width={640}
                      height={480}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Pose Detection Component */}
      {isPoseDetectionActive && (
        <EnhancedPoseDetection
          videoRefs={videoRefs}
          canvasRefs={canvasRefs}
          isActive={isPoseDetectionActive}
          onPoseData={handlePoseData}
          enableMultiCamera={activeCameras.length > 1}
          enableAdvancedFiltering={true}
        />
      )}
    </div>
  );
};

export default MultiCameraMotionCapture;