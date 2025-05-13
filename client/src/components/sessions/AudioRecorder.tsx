import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface AudioRecorderProps {
  sessionId: number;
  onRecordingComplete: (audioId: number) => void;
  onTranscriptReceived?: (transcript: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  sessionId, 
  onRecordingComplete,
  onTranscriptReceived 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Reset chunks
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Could not start recording",
        description: "Please ensure microphone access is granted.",
        variant: "destructive",
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setIsRecording(false);
      
      toast({
        title: "Recording stopped",
        description: `Audio recorded for ${formatTime(recordingTime)}.`,
      });
    }
  };
  
  const uploadRecording = async () => {
    if (!audioBlob) {
      toast({
        title: "No recording to upload",
        description: "Please record audio first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('duration', recordingTime.toString());
      
      // Simulated progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      const response = await fetch(`/api/sessions/${sessionId}/audio`, {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload recording');
      }
      
      const result = await response.json();
      
      toast({
        title: "Recording uploaded successfully",
        description: "Audio saved to session.",
      });
      
      // Notify parent component
      if (result.recording && result.recording.id) {
        onRecordingComplete(result.recording.id);
      }
      
      // Auto start transcription if configured
      transcribeAudio();
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload audio recording.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const transcribeAudio = async () => {
    setIsTranscribing(true);
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/transcribe`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe recording');
      }
      
      const result = await response.json();
      
      toast({
        title: "Audio transcribed successfully",
        description: "Transcript saved to session.",
      });
      
      // Call the callback with transcript if provided
      if (onTranscriptReceived && result.transcript) {
        onTranscriptReceived(result.transcript);
      }
    } catch (error) {
      console.error('Error transcribing recording:', error);
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Could not transcribe audio recording.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Audio Recorder</h3>
          {isRecording && (
            <div className="flex items-center">
              <span className="animate-pulse mr-2 h-3 w-3 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700 text-white"
              disabled={isUploading || isTranscribing}
            >
              <Mic size={24} />
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              size="lg" 
              className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700 text-white"
            >
              <Square size={24} />
            </Button>
          )}
        </div>
        
        {audioBlob && !isRecording && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {Math.round(audioBlob.size / 1024)} KB · {formatTime(recordingTime)}
              </span>
              
              <Button
                onClick={uploadRecording}
                disabled={isUploading || isTranscribing}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            
            {isUploading && (
              <Progress value={uploadProgress} className="h-2" />
            )}
            
            {!isUploading && uploadProgress === 100 && (
              <Button
                onClick={transcribeAudio}
                disabled={isTranscribing}
                variant="outline"
                className="w-full"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Transcribing...
                  </>
                ) : (
                  "Generate Transcript"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;