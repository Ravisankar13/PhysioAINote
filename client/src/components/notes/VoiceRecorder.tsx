import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void;
}

const VoiceRecorder = ({ onRecordingComplete }: VoiceRecorderProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create new media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Listen for data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create audio blob and URL
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Transcribe the audio
        transcribeAudio(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start(10); // Collect data every 10ms
      setIsRecording(true);
      setIsPaused(false);
      setAudioUrl(null);
      
      // Start timer
      startTimer();
      
      toast({
        title: "Recording started",
        description: "Speak clearly for best transcription results.",
      });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    // Stop media recorder
    mediaRecorderRef.current.stop();
    
    // Stop all audio tracks
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    
    // Reset state
    setIsRecording(false);
    setIsPaused(false);
    
    // Stop timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    toast({
      title: "Recording stopped",
      description: `Recorded for ${formatTime(recordingTime)}. Processing audio...`,
    });
  };

  const pauseResumeRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      // Resume recording
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
      
      toast({
        title: "Recording resumed",
        description: "Continue speaking clearly.",
      });
    } else {
      // Pause recording
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast({
        title: "Recording paused",
        description: "Resume whenever you're ready.",
      });
    }
  };

  const startTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setIsProcessing(true);
    
    try {
      // Create a form data object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Send to server for transcription
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Pass recording data to parent component
      onRecordingComplete(audioBlob, data.transcript);
      
      toast({
        title: "Transcription complete",
        description: "Audio has been converted to text successfully.",
      });
    } catch (err) {
      console.error("Transcription error:", err);
      toast({
        title: "Transcription failed",
        description: "Could not convert audio to text. Please try again or input text manually.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">Voice Recording</h3>
          
          {isRecording && (
            <div className="w-full mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-500">Recording</span>
                <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
              <Progress value={100} max={100} className="h-2 bg-neutral-200 animate-pulse" />
            </div>
          )}
          
          {audioUrl && !isTranscribing && (
            <div className="w-full">
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}
          
          <div className="flex space-x-3">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                disabled={isTranscribing || isProcessing}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button
                  onClick={pauseResumeRecording}
                  variant="outline"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
          
          {isTranscribing && (
            <div className="text-center mt-4">
              <p className="text-sm text-neutral-600 mb-2">Transcribing audio...</p>
              <Progress value={60} max={100} className="h-2 bg-neutral-200" />
            </div>
          )}
          
          <p className="text-sm text-neutral-500 text-center mt-2">
            Record your session and let AI transcribe the audio to generate clinical notes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;