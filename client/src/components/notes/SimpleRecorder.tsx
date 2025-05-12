import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimpleRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: any) => void;
}

export function SimpleRecorder({ onRecordingComplete }: SimpleRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      // Use the most basic audio format for maximum compatibility
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Process the recording
        processRecording();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      // Start timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Speak clearly for best transcription results.",
      });
    } catch (err) {
      console.error('Error starting recording:', err);
      setErrorMessage('Could not access microphone. Please check browser permissions.');
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check browser permissions.",
        variant: "destructive",
      });
    }
  };
  
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };
  
  const processRecording = async () => {
    setIsProcessing(true);
    
    try {
      if (audioChunksRef.current.length === 0) {
        throw new Error('No audio recorded');
      }
      
      // Get the MIME type from the MediaRecorder
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      
      // Create audio blob with the correct MIME type
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      
      // Reset timer
      setRecordingTime(0);
      
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to server for transcription
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      toast({
        title: "Transcription successful",
        description: "Your recording has been transcribed and analyzed.",
      });
      
      // Send result to parent component
      onRecordingComplete(audioBlob, data);
    } catch (err: any) {
      console.error('Error processing recording:', err);
      setErrorMessage(err.message || 'Error processing recording');
      
      toast({
        title: "Processing failed",
        description: err.message || "Error processing recording",
        variant: "destructive",
      });
      
      // Still provide the result to parent, but with error
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, { error: err.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  return (
    <Card className="border-primary-100 bg-primary-50">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col items-center">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              size="lg"
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Mic className="mr-2 h-5 w-5" />
              {isProcessing ? 'Processing...' : 'Start Recording'}
            </Button>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="text-center">
                <span className="text-lg font-medium">Recording</span>
                <p className="text-primary-700 text-xl font-semibold mt-1">
                  {formatTime(recordingTime)}
                </p>
              </div>
              
              <div className="animate-pulse h-2 w-full bg-primary-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 w-full"></div>
              </div>
              
              <Button 
                onClick={stopRecording}
                variant="destructive" 
                size="lg"
              >
                <Square className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 text-destructive flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
          
          <p className="text-center text-muted-foreground text-sm mt-4">
            {isRecording 
              ? "Speak clearly. Click Stop when finished." 
              : "Click Start to begin recording your clinical notes"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SimpleRecorder;