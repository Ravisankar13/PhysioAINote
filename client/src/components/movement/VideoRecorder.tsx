import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  VideoOff, 
  Play, 
  Pause, 
  RotateCcw,
  Download,
  Circle,
  Square,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoRecorderProps {
  stream: MediaStream | null;
  isActive: boolean;
  maxDuration?: number; // in seconds
  onRecordingComplete?: (blob: Blob, url: string) => void;
  className?: string;
}

export function VideoRecorder({ 
  stream, 
  isActive, 
  maxDuration = 300, // 5 minutes default
  onRecordingComplete,
  className 
}: VideoRecorderProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingSize, setRecordingSize] = useState(0);
  
  // Playback state
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  
  // Cleanup function for blob URLs
  const cleanupBlobUrl = useCallback(() => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
  }, [recordedVideoUrl]);
  
  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format size helper
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Start recording
  const startRecording = useCallback(() => {
    if (!stream || !isActive) {
      toast({
        title: "Recording Error",
        description: "Camera stream is not available",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Clear any previous recording
      cleanupBlobUrl();
      recordedChunksRef.current = [];
      setRecordingSize(0);
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          setRecordingSize(prev => prev + event.data.size);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        
        if (onRecordingComplete) {
          onRecordingComplete(blob, url);
        }
        
        toast({
          title: "Recording Complete",
          description: `Video saved (${formatSize(blob.size)})`,
        });
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      
      // Update duration every 100ms for smooth progress
      recordingIntervalRef.current = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'paused') return;
        
        const elapsed = (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;
        setRecordingDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);
      
      toast({
        title: "Recording Started",
        description: "Your movement is being recorded",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording",
        variant: "destructive",
      });
    }
  }, [stream, isActive, maxDuration, cleanupBlobUrl, onRecordingComplete]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  }, []);
  
  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseStartRef.current = Date.now();
      toast({
        title: "Recording Paused",
        description: "Recording has been paused",
      });
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      toast({
        title: "Recording Resumed",
        description: "Recording has been resumed",
      });
    }
  }, []);
  
  // Reset recording
  const resetRecording = useCallback(() => {
    stopRecording();
    cleanupBlobUrl();
    setRecordingDuration(0);
    setRecordingSize(0);
    setPlaybackTime(0);
    setVideoDuration(0);
    recordedChunksRef.current = [];
    
    toast({
      title: "Recording Reset",
      description: "Ready to record new video",
    });
  }, [stopRecording, cleanupBlobUrl]);
  
  // Download video
  const downloadVideo = useCallback(() => {
    if (!recordedVideoUrl) return;
    
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `movement-recording-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download Started",
      description: "Your video is being downloaded",
    });
  }, [recordedVideoUrl]);
  
  // Handle video playback
  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);
  
  // Update playback time
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      setPlaybackTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [recordedVideoUrl]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      cleanupBlobUrl();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [stopRecording, cleanupBlobUrl]);
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Recording
          </span>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Circle className="w-2 h-2 mr-1 fill-current" />
              Recording
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Status */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Duration: {formatTime(recordingDuration)}</span>
              <span>Size: {formatSize(recordingSize)}</span>
            </div>
            <Progress 
              value={(recordingDuration / maxDuration) * 100} 
              className="h-2"
            />
            {recordingDuration > maxDuration * 0.8 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Approaching maximum recording duration ({formatTime(maxDuration)})
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Recording Controls */}
        {!recordedVideoUrl && (
          <div className="flex gap-2">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={!isActive || !stream}
                className="flex-1"
                variant="default"
              >
                <Circle className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
                <Button
                  onClick={togglePause}
                  variant="outline"
                  className="flex-1"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
        
        {/* Playback Section */}
        {recordedVideoUrl && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={recordedVideoUrl}
                className="w-full h-auto"
                controls={false}
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Button
                    onClick={togglePlayback}
                    size="lg"
                    className="rounded-full"
                    variant="secondary"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Playback Progress */}
            <div className="space-y-2">
              <Progress 
                value={videoDuration > 0 ? (playbackTime / videoDuration) * 100 : 0} 
                className="h-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(playbackTime)}</span>
                <span>{formatTime(videoDuration)}</span>
              </div>
            </div>
            
            {/* Playback Controls */}
            <div className="flex gap-2">
              <Button
                onClick={togglePlayback}
                variant="outline"
                className="flex-1"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
              <Button
                onClick={downloadVideo}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Info Alert */}
        {!isRecording && !recordedVideoUrl && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Videos are stored temporarily in your browser. They will be cleared when you refresh the page or record a new video.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}