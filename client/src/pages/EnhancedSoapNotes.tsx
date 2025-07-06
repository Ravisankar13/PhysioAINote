import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, MicOff, Brain, MessageSquare, Lightbulb, 
  Bot, Send, FileText, UserCheck, TrendingUp, Activity,
  Clock, Users, User, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function EnhancedSoapNotesPage() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [realTimeTranscript, setRealTimeTranscript] = useState("");
  
  // SOAP sections state
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

  // Get current user data
  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
  });

  // Get current SOAP notes
  const { data: soapNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["/api/soap-notes"],
  });

  // Mock WebSocket connection for demo
  const connectWebSocket = useCallback((sessionId: string, userId: number) => {
    console.log("Connecting WebSocket for real-time AI assistance...");
    setIsWebSocketConnected(true);
    
    // Simulate AI suggestions
    setTimeout(() => {
      setAiSuggestions([
        {
          id: 1,
          type: 'question',
          suggestion: "Ask about pain severity on a scale of 1-10",
          reasoning: "Pain scale assessment is crucial for baseline measurement",
          priority: 'high',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          type: 'diagnosis',
          suggestion: "Consider rotator cuff impingement based on shoulder symptoms",
          reasoning: "Symptoms align with common shoulder pathology patterns",
          priority: 'medium',
          createdAt: new Date().toISOString()
        }
      ]);
    }, 2000);
  }, []);

  // Handle PhysioGPT chat
  const handlePhysioGPTQuery = async (query: string) => {
    if (!query.trim()) return;
    
    setIsChatLoading(true);
    const newMessage: PhysioGPTMessage = {
      id: Date.now(),
      query,
      answer: "Analyzing your clinical question... This would connect to the real PhysioGPT service for instant clinical consultation.",
      timestamp: new Date().toISOString()
    };
    
    setPhysioGptChat(prev => [...prev, newMessage]);
    setChatInput("");
    
    // Simulate response delay
    setTimeout(() => {
      setIsChatLoading(false);
    }, 1500);
  };

  // Create virtual patient from current session
  const createVirtualPatient = async () => {
    if (!soapSections.subjective && !soapSections.objective) {
      toast({
        title: "Insufficient Data",
        description: "Please add some clinical information before creating a virtual patient.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingVirtualPatient(true);
    
    // Simulate virtual patient creation
    setTimeout(() => {
      setIsCreatingVirtualPatient(false);
      toast({
        title: "Virtual Patient Created",
        description: "A new virtual patient has been generated from your SOAP note data.",
      });
    }, 3000);
  };

  // Accept AI suggestion
  const acceptSuggestion = (suggestion: AISuggestion) => {
    // Add suggestion to appropriate SOAP section
    if (suggestion.type === 'question') {
      setSoapSections(prev => ({
        ...prev,
        subjective: prev.subjective + (prev.subjective ? '\n' : '') + `Ask: ${suggestion.suggestion}`
      }));
    } else if (suggestion.type === 'diagnosis') {
      setSoapSections(prev => ({
        ...prev,
        assessment: prev.assessment + (prev.assessment ? '\n' : '') + suggestion.suggestion
      }));
    } else if (suggestion.type === 'treatment') {
      setSoapSections(prev => ({
        ...prev,
        plan: prev.plan + (prev.plan ? '\n' : '') + suggestion.suggestion
      }));
    }
    
    // Remove accepted suggestion
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    
    toast({
      title: "Suggestion Applied",
      description: "AI suggestion has been added to your SOAP note.",
    });
  };

  // Start recording simulation
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    // Simulate real-time transcript
    setTimeout(() => {
      setRealTimeTranscript("Patient reports shoulder pain for 3 weeks...");
    }, 2000);
    
    // Connect WebSocket when recording starts
    if (userData && 'id' in userData && userData.id) {
      connectWebSocket("demo-session", userData.id);
    }
  };

  // Stop recording simulation
  const stopRecording = () => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Simulate SOAP note generation
    setTimeout(() => {
      setSoapSections({
        subjective: realTimeTranscript + " Pain is 7/10, worse with overhead activities.",
        objective: "Limited shoulder flexion 120°, positive Neer test, tender over subacromial space.",
        assessment: "Likely subacromial impingement syndrome.",
        plan: "Conservative management with physiotherapy, NSAIDs, activity modification."
      });
    }, 1000);
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced SOAP Notes with Real-Time AI
          </h1>
          <p className="text-gray-600">
            Live AI assistance for clinical documentation and decision support
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              AI Assistant: {isWebSocketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main SOAP Notes Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Clinical Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="record" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="record">Record</TabsTrigger>
                    <TabsTrigger value="soap">SOAP Note</TabsTrigger>
                    <TabsTrigger value="admin">Admin Tasks</TabsTrigger>
                  </TabsList>

                  {/* Recording Tab */}
                  <TabsContent value="record" className="space-y-4">
                    <div className="text-center py-8">
                      <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                        isRecording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </div>
                      
                      {isRecording && (
                        <div className="mb-4">
                          <div className="text-2xl font-bold text-red-600 mb-2">
                            {formatTime(recordingTime)}
                          </div>
                          <Badge variant="destructive" className="animate-pulse">
                            Recording in progress...
                          </Badge>
                        </div>
                      )}
                      
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="lg"
                        className="mb-4"
                      >
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                      
                      {realTimeTranscript && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold mb-2">Live Transcript:</h4>
                          <p className="text-sm text-gray-700">{realTimeTranscript}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* SOAP Note Tab */}
                  <TabsContent value="soap" className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-green-700">
                          Subjective
                        </label>
                        <Textarea
                          value={soapSections.subjective}
                          onChange={(e) => setSoapSections(prev => ({ ...prev, subjective: e.target.value }))}
                          placeholder="Patient's reported symptoms, history..."
                          className="min-h-20"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-blue-700">
                          Objective
                        </label>
                        <Textarea
                          value={soapSections.objective}
                          onChange={(e) => setSoapSections(prev => ({ ...prev, objective: e.target.value }))}
                          placeholder="Clinical observations, measurements..."
                          className="min-h-20"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-purple-700">
                          Assessment
                        </label>
                        <Textarea
                          value={soapSections.assessment}
                          onChange={(e) => setSoapSections(prev => ({ ...prev, assessment: e.target.value }))}
                          placeholder="Clinical diagnosis, interpretation..."
                          className="min-h-20"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-orange-700">
                          Plan
                        </label>
                        <Textarea
                          value={soapSections.plan}
                          onChange={(e) => setSoapSections(prev => ({ ...prev, plan: e.target.value }))}
                          placeholder="Treatment plan, interventions..."
                          className="min-h-20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button className="flex-1">
                        Save SOAP Note
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={createVirtualPatient}
                        disabled={isCreatingVirtualPatient}
                        className="flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        {isCreatingVirtualPatient ? "Creating..." : "Create Virtual Patient"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Admin Tasks Tab */}
                  <TabsContent value="admin" className="space-y-4">
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="font-semibold mb-2">Automated Administrative Tasks</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        AI-powered generation of administrative documentation
                      </p>
                      <div className="grid gap-2">
                        <Button variant="outline" size="sm">Generate Doctor Report</Button>
                        <Button variant="outline" size="sm">Create AHTR Submission</Button>
                        <Button variant="outline" size="sm">Generate Insurance Forms</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* AI Assistance Panel */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiSuggestions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      AI suggestions will appear here during your session
                    </p>
                  ) : (
                    aiSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}>
                            {suggestion.type}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => acceptSuggestion(suggestion)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm mb-1">{suggestion.suggestion}</p>
                        {suggestion.reasoning && (
                          <p className="text-xs text-gray-500">{suggestion.reasoning}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PhysioGPT Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  PhysioGPT Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-48 overflow-y-auto border rounded-lg p-3 space-y-3">
                    {physioGptChat.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        Ask PhysioGPT any clinical question for instant consultation
                      </p>
                    ) : (
                      physioGptChat.map((message) => (
                        <div key={message.id} className="space-y-2">
                          <div className="bg-blue-50 p-2 rounded text-sm">
                            <strong>You:</strong> {message.query}
                          </div>
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <strong>PhysioGPT:</strong> {message.answer}
                          </div>
                        </div>
                      ))
                    )}
                    {isChatLoading && (
                      <div className="bg-gray-50 p-2 rounded text-sm animate-pulse">
                        PhysioGPT is thinking...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a clinical question..."
                      onKeyPress={(e) => e.key === 'Enter' && handlePhysioGPTQuery(chatInput)}
                    />
                    <Button 
                      size="icon"
                      onClick={() => handlePhysioGPTQuery(chatInput)}
                      disabled={isChatLoading}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Session Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Recording Time:</span>
                    <span>{formatTime(recordingTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Suggestions:</span>
                    <span>{aiSuggestions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chat Messages:</span>
                    <span>{physioGptChat.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}