import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mic, MicOff, Upload, Users, User, FileAudio, Clock, Brain, 
  AlertCircle, CheckCircle2, UserPlus, MessageSquare, Lightbulb, 
  Robot, Send, FileText, UserCheck, TrendingUp, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SoapNote } from "@shared/schema";

// Real-time AI assistance interfaces
interface AISuggestion {
  id: number;
  type: 'question' | 'treatment' | 'diagnosis' | 'administrative';
  suggestion: string;
  reasoning?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface PhysioGPTMessage {
  id: number;
  query: string;
  answer: string;
  timestamp: string;
}

interface RealTimeContext {
  currentTranscript: string;
  soapSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  patientInfo?: {
    name?: string;
    age?: number;
    condition?: string;
  };
}

export default function SoapNotesPage() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Session and notes state
  const [activeSession, setActiveSession] = useState<SoapNote | null>(null);
  const [realTimeTranscript, setRealTimeTranscript] = useState("");
  const [soapSections, setSoapSections] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });
  
  // Real-time AI assistance state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [physioGptChat, setPhysioGptChat] = useState<PhysioGPTMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  // Virtual patient creation state
  const [isCreatingVirtualPatient, setIsCreatingVirtualPatient] = useState(false);
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
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

  // WebSocket connection for real-time AI assistance
  const connectWebSocket = useCallback((sessionId: string, userId: number) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/soap-ai?sessionId=${sessionId}&userId=${userId}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsWebSocketConnected(true);
      console.log("WebSocket connected for real-time AI assistance");
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ai_suggestions') {
          setAiSuggestions(prev => [...prev, ...data.suggestions]);
        } else if (data.type === 'physio_gpt_response') {
          setPhysioGptChat(prev => [...prev, data.message]);
          setIsChatLoading(false);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsWebSocketConnected(false);
    };
    
    wsRef.current.onclose = () => {
      setIsWebSocketConnected(false);
      console.log("WebSocket disconnected");
    };
  }, []);

  // Update real-time context
  const updateRealTimeContext = useCallback((context: RealTimeContext) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'context_update',
        context
      }));
    }
  }, []);

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
      setSoapSections({
        subjective: data.subjective || "",
        objective: data.objective || "",
        assessment: data.assessment || "",
        plan: data.plan || ""
      });
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="current">Current Session</TabsTrigger>
          <TabsTrigger value="paperwork">AI Paperwork</TabsTrigger>
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

        {/* AI Paperwork Tab */}
        <TabsContent value="paperwork">
          <AIPaperworkTab activeSession={activeSession} />
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

// AI Paperwork Tab Component
function AIPaperworkTab({ activeSession }: { activeSession: SoapNote | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate automatic paperwork mutation
  const generatePaperworkMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-paperwork`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate paperwork");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Paperwork Generated",
        description: "AI automatic paperwork has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate referral letter mutation
  const generateReferralMutation = useMutation({
    mutationFn: async ({ 
      soapNoteId, 
      data 
    }: { 
      soapNoteId: number; 
      data: { specialtyType: string; reason: string; urgency: string; clinicalFindings: string } 
    }) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to generate referral letter");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Referral Letter Generated",
        description: "Referral letter has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate insurance documentation mutation
  const generateInsuranceMutation = useMutation({
    mutationFn: async ({ soapNoteId, sessionCount }: { soapNoteId: number; sessionCount: number }) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-insurance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionCount }),
      });
      if (!response.ok) throw new Error("Failed to generate insurance documentation");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Insurance Documentation Generated",
        description: "Insurance documentation has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate discharge summary mutation
  const generateDischargeSummaryMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-discharge-summary`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate discharge summary");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Discharge Summary Generated",
        description: "Discharge summary has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate progress report mutation
  const generateProgressReportMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-progress-report`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate progress report");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress Report Generated",
        description: "Progress report has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate imaging referral mutation
  const generateImagingReferralMutation = useMutation({
    mutationFn: async ({ soapNoteId, imagingType }: { soapNoteId: number; imagingType: string }) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-imaging-referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imagingType }),
      });
      if (!response.ok) throw new Error("Failed to generate imaging referral");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Imaging Referral Generated",
        description: "Imaging referral has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate return to work certificate mutation
  const generateReturnToWorkMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-return-to-work`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate return to work certificate");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Return to Work Certificate Generated",
        description: "Return to work certificate has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate time off work certificate mutation
  const generateTimeOffWorkMutation = useMutation({
    mutationFn: async ({ soapNoteId, duration }: { soapNoteId: number; duration: string }) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/generate-time-off-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration }),
      });
      if (!response.ok) throw new Error("Failed to generate time off work certificate");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Time Off Work Certificate Generated",
        description: "Time off work certificate has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create virtual patient mutation
  const createVirtualPatientMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch(`/api/soap-notes/${soapNoteId}/create-virtual-patient`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create virtual patient");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Virtual Patient Created",
        description: data.message || "Virtual patient has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/soap-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!activeSession || activeSession.sessionStatus !== "completed") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Complete a SOAP note session first</p>
          <p className="text-sm text-gray-400">
            AI paperwork generation is available for completed sessions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paperwork Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Paperwork Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {activeSession.paperworkGenerated ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-700">Paperwork Generated</span>
                <span className="text-sm text-gray-500">
                  {activeSession.paperworkGeneratedAt 
                    ? new Date(activeSession.paperworkGeneratedAt).toLocaleString()
                    : ''
                  }
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-700">Paperwork Not Generated</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Generate AI Paperwork</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => generatePaperworkMutation.mutate(activeSession.id)}
              disabled={generatePaperworkMutation.isPending}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Generate All Paperwork
            </Button>

            <Button
              variant="outline"
              onClick={() => generateInsuranceMutation.mutate({ 
                soapNoteId: activeSession.id, 
                sessionCount: 1 
              })}
              disabled={generateInsuranceMutation.isPending}
            >
              Insurance Documentation
            </Button>

            <Button
              variant="outline"
              onClick={() => generateReferralMutation.mutate({
                soapNoteId: activeSession.id,
                data: {
                  specialtyType: "Orthopedic Specialist",
                  reason: "Further evaluation and treatment",
                  urgency: "routine",
                  clinicalFindings: activeSession.assessment || "Clinical findings from assessment"
                }
              })}
              disabled={generateReferralMutation.isPending}
            >
              Generate Referral
            </Button>

            <Button
              variant="outline"
              onClick={() => generateDischargeSummaryMutation.mutate(activeSession.id)}
              disabled={generateDischargeSummaryMutation.isPending}
            >
              Discharge Summary
            </Button>

            <Button
              variant="outline"
              onClick={() => generateProgressReportMutation.mutate(activeSession.id)}
              disabled={generateProgressReportMutation.isPending}
            >
              Progress Report
            </Button>

            <Button
              variant="outline"
              onClick={() => generateImagingReferralMutation.mutate({ 
                soapNoteId: activeSession.id, 
                imagingType: "MRI" 
              })}
              disabled={generateImagingReferralMutation.isPending}
            >
              Imaging Referral
            </Button>

            <Button
              variant="outline"
              onClick={() => generateReturnToWorkMutation.mutate(activeSession.id)}
              disabled={generateReturnToWorkMutation.isPending}
            >
              Return to Work Certificate
            </Button>

            <Button
              variant="outline"
              onClick={() => generateTimeOffWorkMutation.mutate({ 
                soapNoteId: activeSession.id, 
                duration: "1 week" 
              })}
              disabled={generateTimeOffWorkMutation.isPending}
            >
              Time Off Work Certificate
            </Button>

            <Button
              variant="outline"
              onClick={() => createVirtualPatientMutation.mutate(activeSession.id)}
              disabled={createVirtualPatientMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100"
            >
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">Create Virtual Patient</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display Generated Paperwork */}
      {activeSession.paperworkGenerated && (
        <div className="space-y-4">
          {/* Treatment Summary */}
          {activeSession.treatmentSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Treatment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.treatmentSummary}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Notes */}
          {activeSession.progressNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.progressNotes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Codes */}
          {activeSession.billingCodes && activeSession.billingCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {activeSession.billingCodes.map((code, index) => (
                    <Badge key={index} variant="outline">
                      {code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Recommendations */}
          {activeSession.followUpRecommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Follow-up Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.followUpRecommendations}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Home Exercise Program */}
          {activeSession.homeExerciseProgram && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Home Exercise Program</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.homeExerciseProgram}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insurance Documentation */}
          {activeSession.insuranceDocumentation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Insurance Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.insuranceDocumentation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Letter */}
          {activeSession.referralLetter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Referral Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.referralLetter}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Functional Outcomes */}
          {activeSession.functionalOutcomes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Functional Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-teal-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.functionalOutcomes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discharge Instructions */}
          {activeSession.dischargeInstructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discharge Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.dischargeInstructions}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discharge Summary */}
          {activeSession.dischargeSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discharge Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.dischargeSummary}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Report */}
          {activeSession.progressReport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.progressReport}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Imaging Referral */}
          {activeSession.imagingReferral && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Imaging Referral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-cyan-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.imagingReferral}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialist Referral */}
          {activeSession.specialistReferral && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specialist Referral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-rose-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.specialistReferral}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return to Work Certificate */}
          {activeSession.returnToWorkCertificate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Return to Work Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-lime-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.returnToWorkCertificate}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time Off Work Certificate */}
          {activeSession.timeOffWorkCertificate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Off Work Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.timeOffWorkCertificate}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Capacity Assessment */}
          {activeSession.workCapacityAssessment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Work Capacity Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-violet-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeSession.workCapacityAssessment}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Virtual Patient Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Virtual Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {activeSession.virtualPatientGenerated ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-700">Virtual Patient Created</span>
                <span className="text-sm text-gray-500">
                  {activeSession.virtualPatientGeneratedAt 
                    ? new Date(activeSession.virtualPatientGeneratedAt).toLocaleString()
                    : ''
                  }
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700">No Virtual Patient Created</span>
                <span className="text-sm text-gray-500 ml-2">
                  Click "Create Virtual Patient" to generate an anonymized patient profile for simulation
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}