import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TestAudioTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [clinicalInsights, setClinicalInsights] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await processAudio(audioBlob);
      
      // Stop all tracks from the stream
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error processing audio');
      }

      const data = await response.json();
      setTranscription(data.transcript || '');
      setClinicalInsights(data.clinicalInsights || '');
      
      toast({
        title: "Transcription complete",
        description: "Audio has been successfully transcribed and analyzed",
      });
    } catch (error: any) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process audio recording",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Audio Transcription Test</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Audio Recording</CardTitle>
            <CardDescription>
              Record your voice to test the OpenAI transcription service
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            {isRecording ? (
              <Button 
                variant="destructive"
                size="lg" 
                className="h-20 w-20 rounded-full"
                onClick={stopRecording}
              >
                <StopCircle className="h-12 w-12" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700"
                onClick={startRecording}
                disabled={isProcessing}
              >
                <Mic className="h-12 w-12" />
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            {isProcessing && (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Processing audio...
              </div>
            )}
          </CardFooter>
        </Card>

        {(transcription || clinicalInsights) && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Transcription and analysis of your audio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {transcription && (
                <div>
                  <h3 className="font-semibold mb-2">Transcription:</h3>
                  <Textarea 
                    readOnly 
                    value={transcription} 
                    className="min-h-[100px]" 
                  />
                </div>
              )}
              
              {clinicalInsights && (
                <div>
                  <h3 className="font-semibold mb-2">Clinical Insights:</h3>
                  <Textarea 
                    readOnly 
                    value={clinicalInsights} 
                    className="min-h-[150px]" 
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestAudioTranscription;