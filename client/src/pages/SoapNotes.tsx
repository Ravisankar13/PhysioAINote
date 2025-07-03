import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff, Upload, Users, User, FileAudio, Clock, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SoapNote } from "@shared/schema";

export default function SoapNotesPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeSession, setActiveSession] = useState<SoapNote | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active session
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/soap-notes/sessions/active"],
    refetchInterval: activeSession?.sessionStatus === "processing" ? 2000 : false,
  });

  // Get all SOAP notes
  const { data: soapNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["/api/soap-notes"],
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/soap-notes/sessions", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create session");
      return response.json();
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
      toast({
        title: "Session Started",
        description: "New SOAP notes session created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  // Upload audio mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async ({ sessionId, audioFile }: { sessionId: string; audioFile: File }) => {
      const formData = new FormData();
      formData.append("audio", audioFile);
      
      const response = await fetch(`/api/soap-notes/sessions/${sessionId}/audio`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to process audio");
      return response.json();
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes/sessions/active"] });
      toast({
        title: "Audio Processed",
        description: "SOAP note generated from audio recording",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process audio",
        variant: "destructive",
      });
    },
  });

  // Mark patient switch mutation
  const patientSwitchMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/soap-notes/sessions/${sessionId}/patient-switch`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark patient switch");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes/sessions/active"] });
      toast({
        title: "Patient Switch Marked",
        description: "Session marked for patient transition",
      });
    },
  });

  useEffect(() => {
    if (currentSession) {
      setActiveSession(currentSession);
    }
  }, [currentSession]);

  // Start recording
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream);
      setMediaRecorder(recorder);
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        mediaStream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Process recorded audio
  const processAudio = async () => {
    if (!audioBlob || !activeSession) {
      toast({
        title: "Error",
        description: "No audio recording or active session",
        variant: "destructive",
      });
      return;
    }

    const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, {
      type: "audio/wav",
    });

    uploadAudioMutation.mutate({
      sessionId: activeSession.sessionId,
      audioFile,
    });

    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get session status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      recorded: { color: "bg-blue-100 text-blue-800", label: "Recorded" },
      transcribed: { color: "bg-yellow-100 text-yellow-800", label: "Transcribed" },
      processing: { color: "bg-orange-100 text-orange-800", label: "Processing" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SOAP Notes</h1>
        <p className="text-lg text-gray-600">
          AI-powered clinical documentation with automatic patient switching detection
        </p>
      </div>

      <Tabs defaultValue="recording" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="current">Current Session</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Recording Tab */}
        <TabsContent value="recording" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Audio Recording
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3"
                  >
                    <MicOff className="h-5 w-5 mr-2" />
                    Stop Recording
                  </Button>
                )}

                {!activeSession && (
                  <Button
                    onClick={() => createSessionMutation.mutate()}
                    disabled={createSessionMutation.isPending}
                    variant="outline"
                  >
                    <User className="h-4 w-4 mr-2" />
                    New Session
                  </Button>
                )}
              </div>

              {/* Recording Timer */}
              {isRecording && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                  </div>
                </div>
              )}

              {/* Process Audio */}
              {audioBlob && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Recording Ready
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={processAudio}
                      disabled={uploadAudioMutation.isPending || !activeSession}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {uploadAudioMutation.isPending ? "Processing..." : "Generate SOAP Note"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Session Info */}
              {activeSession && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">Active Session</h3>
                      <p className="text-sm text-blue-700">
                        {activeSession.patientName || "Unknown Patient"} • Session: {activeSession.sessionId.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(activeSession.sessionStatus)}
                      <Button
                        onClick={() => patientSwitchMutation.mutate(activeSession.sessionId)}
                        variant="outline"
                        size="sm"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Switch Patient
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Current Session Tab */}
        <TabsContent value="current">
          {activeSession ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current SOAP Note</span>
                  {getStatusBadge(activeSession.sessionStatus)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Patient Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Patient</label>
                    <p className="text-sm">{activeSession.patientName || "Unknown"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-sm">{activeSession.dateOfVisit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-sm">{activeSession.recordingDuration ? `${Math.round(activeSession.recordingDuration / 60)}m` : "0m"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Confidence</label>
                    <p className="text-sm">{activeSession.confidence || 0}%</p>
                  </div>
                </div>

                {/* SOAP Sections */}
                <div className="space-y-4">
                  {/* Subjective */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Subjective</h3>
                    <div className="p-4 bg-blue-50 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {activeSession.subjective || "No subjective data recorded yet"}
                      </p>
                    </div>
                  </div>

                  {/* Objective */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Objective</h3>
                    <div className="p-4 bg-green-50 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {activeSession.objective || "No objective data recorded yet"}
                      </p>
                    </div>
                  </div>

                  {/* Assessment */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment</h3>
                    <div className="p-4 bg-yellow-50 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {activeSession.assessment || "No assessment recorded yet"}
                      </p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan</h3>
                    <div className="p-4 bg-purple-50 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {activeSession.plan || "No plan recorded yet"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Switch Detection */}
                {activeSession.patientSwitchDetected && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-orange-800">
                      Patient switch detected in this session
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No active session</p>
                <Button onClick={() => createSessionMutation.mutate()}>
                  Start New Session
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-4">
            {notesLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">Loading SOAP notes...</p>
                </CardContent>
              </Card>
            ) : soapNotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No SOAP notes yet</p>
                  <p className="text-sm text-gray-400">Start recording to create your first note</p>
                </CardContent>
              </Card>
            ) : (
              soapNotes.map((note: SoapNote) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {note.patientName || "Unknown Patient"}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(note.sessionStatus)}
                        {note.patientSwitchDetected && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <Users className="h-3 w-3 mr-1" />
                            Switch
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{note.dateOfVisit}</span>
                      {note.recordingDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(note.recordingDuration / 60)}m
                        </span>
                      )}
                      <span>Confidence: {note.confidence || 0}%</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {note.subjective && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Subjective</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{note.subjective}</p>
                        </div>
                      )}
                      {note.assessment && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Assessment</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{note.assessment}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}