import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Save, Trash2, Download, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet";
import { apiRequest } from "@/lib/queryClient";

export default function TreatmentNotes() {
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);
  
  const speechRecognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const lastProcessedLengthRef = useRef(0);
  
  const { toast } = useToast();

  // Check Web Speech API support on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setWebSpeechSupported(true);
    } else {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support voice recognition. Please use Chrome or Edge.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Process accumulated transcript with AI to organize it
  const processTranscriptWithAI = useCallback(async (transcript: string) => {
    if (isProcessingRef.current || transcript.length < 20) return;
    
    // Only process new content since last processing
    const newContent = transcript.slice(lastProcessedLengthRef.current);
    if (newContent.length < 30) return; // Wait for enough new content
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('/api/organize-treatment-notes', 'POST', {
        rawTranscript: transcript,
        existingNotes: notes,
        newContent: newContent
      });
      
      if (response.organizedNotes) {
        setNotes(response.organizedNotes);
        lastProcessedLengthRef.current = transcript.length;
      }
    } catch (error) {
      console.error('Error organizing notes:', error);
      // On error, just append the raw transcript
      if (newContent.trim()) {
        setNotes(prev => prev + (prev ? '\n\n' : '') + newContent.trim());
        lastProcessedLengthRef.current = transcript.length;
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [notes]);

  // Initialize and start speech recognition
  const startRecording = useCallback(() => {
    if (!webSpeechSupported) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('[TreatmentNotes] Speech recognition started');
      setIsRecording(true);
      setRecordingTime(0);
      accumulatedTranscriptRef.current = "";
      lastProcessedLengthRef.current = 0;
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update interim display
      setInterimText(interimTranscript);
      
      // Accumulate final transcripts
      if (finalTranscript) {
        accumulatedTranscriptRef.current += finalTranscript;
        
        // Process with AI every ~100 characters of new content
        const newContentLength = accumulatedTranscriptRef.current.length - lastProcessedLengthRef.current;
        if (newContentLength >= 100) {
          processTranscriptWithAI(accumulatedTranscriptRef.current);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[TreatmentNotes] Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition on no-speech error
        try {
          recognition.stop();
          setTimeout(() => {
            if (isRecording) {
              recognition.start();
            }
          }, 100);
        } catch (e) {
          console.log('Error restarting recognition:', e);
        }
      } else if (event.error !== 'aborted') {
        toast({
          title: "Recognition Error",
          description: `Speech recognition error: ${event.error}`,
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      console.log('[TreatmentNotes] Speech recognition ended');
      // Auto-restart only if still recording AND this is still the active recognition instance
      if (speechRecognitionRef.current === recognition) {
        try {
          recognition.start();
          console.log('[TreatmentNotes] Speech recognition auto-restarted');
        } catch (e) {
          console.log('[TreatmentNotes] Could not restart recognition:', e);
        }
      }
    };

    speechRecognitionRef.current = recognition;
    
    try {
      recognition.start();
      toast({
        title: "Recording Started",
        description: "Speak clearly. Your notes will be organized in real-time.",
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Error",
        description: "Failed to start voice recognition.",
        variant: "destructive",
      });
    }
  }, [webSpeechSupported, isRecording, processTranscriptWithAI, toast]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setInterimText("");
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      speechRecognitionRef.current = null;
    }

    // Final processing of any remaining transcript
    if (accumulatedTranscriptRef.current.length > lastProcessedLengthRef.current) {
      await processTranscriptWithAI(accumulatedTranscriptRef.current);
    }

    toast({
      title: "Recording Stopped",
      description: `Session duration: ${formatTime(recordingTime)}`,
    });
  }, [processTranscriptWithAI, recordingTime, toast]);

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Clear notes
  const clearNotes = () => {
    setNotes("");
    accumulatedTranscriptRef.current = "";
    lastProcessedLengthRef.current = 0;
    toast({
      title: "Notes Cleared",
      description: "All notes have been cleared.",
    });
  };

  // Save notes
  const saveNotes = async () => {
    if (!notes.trim()) {
      toast({
        title: "No Notes",
        description: "There are no notes to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('/api/save-treatment-notes', 'POST', { notes });
      
      toast({
        title: "Notes Saved",
        description: "Your treatment notes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Download notes as text file
  const downloadNotes = () => {
    if (!notes.trim()) {
      toast({
        title: "No Notes",
        description: "There are no notes to download.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treatment-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Notes downloaded successfully.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Treatment Notes | PhysioGPT</title>
        <meta name="description" content="Real-time clinical treatment notes with AI organization" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="border-b bg-white dark:bg-slate-800 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
                    Treatment Notes
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Speak naturally. Your notes will be organized in real-time.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-xs text-blue-600 dark:text-blue-400">Organizing...</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* Main Notes Area */}
              <div className="relative">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Your organized treatment notes will appear here as you speak..."
                  className="min-h-[400px] text-base leading-relaxed resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                  data-testid="textarea-treatment-notes"
                />
                
                {/* Interim text overlay */}
                {interimText && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                      <span className="font-medium">Listening: </span>
                      {interimText}
                    </p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleRecording}
                    size="lg"
                    className={`min-w-[140px] ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    data-testid="button-toggle-recording"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Record
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={clearNotes}
                    variant="outline"
                    disabled={!notes.trim() || isRecording}
                    data-testid="button-clear-notes"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  
                  <Button
                    onClick={downloadNotes}
                    variant="outline"
                    disabled={!notes.trim()}
                    data-testid="button-download-notes"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    onClick={saveNotes}
                    disabled={!notes.trim() || isRecording}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-save-notes"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tips for best results:</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Speak clearly and at a natural pace</li>
                  <li>• Include patient details, findings, and treatment provided</li>
                  <li>• Notes are automatically organized as you speak</li>
                  <li>• You can manually edit the notes at any time</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
