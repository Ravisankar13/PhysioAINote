import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Clock, Users, User, CheckCircle2, FileCheck, Shield, 
  DollarSign, Calendar, Copy
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
  // Navigation
  const [, setLocation] = useLocation();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [realTimeTranscript, setRealTimeTranscript] = useState("");
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  
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
  

  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for creating virtual patient from SOAP notes
  const createVirtualPatientMutation = useMutation({
    mutationFn: async (soapData: any) => {
      const response = await fetch('/api/soap-virtual-patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(soapData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create virtual patient');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/virtual-patients'] });
      toast({
        title: "Virtual Patient Created",
        description: "Successfully created virtual patient from your SOAP note data.",
      });
      // Redirect to virtual patients page
      setLocation('/virtual-patients');
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create virtual patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Mock user data for demo
  const userData = { id: 1, username: "Demo User" };

  // Mock SOAP notes data
  const soapNotes: any[] = [];
  const notesLoading = false;

  // Generate AI suggestions based on current context
  const generateAISuggestions = useCallback(async () => {
    try {
      const context = {
        transcript: realTimeTranscript,
        currentSection: 'subjective', // Default to subjective section
        patientSymptoms: extractSymptomsFromTranscript(realTimeTranscript),
        bodyPart: extractBodyPartFromTranscript(realTimeTranscript),
        sessionDuration: Math.floor(recordingTime / 60)
      };

      const response = await fetch(`/api/soap-notes/demo-session/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Convert backend response to frontend format
        const suggestions: AISuggestion[] = [];
        let id = 1;

        // Add questions
        data.questions?.forEach((question: string) => {
          suggestions.push({
            id: id++,
            type: 'question',
            suggestion: question,
            reasoning: "AI-generated based on current conversation context",
            priority: 'high',
            createdAt: new Date().toISOString()
          });
        });

        // Add treatments
        data.treatments?.forEach((treatment: string) => {
          suggestions.push({
            id: id++,
            type: 'treatment',
            suggestion: treatment,
            reasoning: "Evidence-based treatment recommendation",
            priority: 'medium',
            createdAt: new Date().toISOString()
          });
        });

        // Add diagnoses
        data.diagnoses?.forEach((diagnosis: string) => {
          suggestions.push({
            id: id++,
            type: 'diagnosis',
            suggestion: diagnosis,
            reasoning: "Differential diagnosis consideration",
            priority: 'medium',
            createdAt: new Date().toISOString()
          });
        });

        setAiSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Set fallback suggestions if API fails
      setAiSuggestions([
        {
          id: 1,
          type: 'question',
          suggestion: "Ask about pain location and intensity",
          reasoning: "Essential baseline information",
          priority: 'high',
          createdAt: new Date().toISOString()
        }
      ]);
    }
  }, [realTimeTranscript, recordingTime]);

  // Mock WebSocket connection for demo
  const connectWebSocket = useCallback((sessionId: string, userId: number) => {
    console.log("Connecting WebSocket for real-time AI assistance...");
    setIsWebSocketConnected(true);
    
    // Generate initial AI suggestions
    generateAISuggestions();
  }, [generateAISuggestions]);

  // Regenerate suggestions when transcript changes significantly
  useEffect(() => {
    if (realTimeTranscript.length > 100 && realTimeTranscript.length % 200 === 0) {
      generateAISuggestions();
    }
  }, [realTimeTranscript, generateAISuggestions]);

  // Handle PhysioGPT chat
  const handlePhysioGPTQuery = async (query: string) => {
    if (!query.trim()) return;
    
    setIsChatLoading(true);
    const newMessage: PhysioGPTMessage = {
      id: Date.now(),
      query,
      answer: "Processing your question...",
      timestamp: new Date().toISOString()
    };
    
    setPhysioGptChat(prev => [...prev, newMessage]);
    setChatInput("");

    try {
      // Create context for PhysioGPT
      const context = {
        transcript: realTimeTranscript,
        currentSection: 'subjective', // Default section
        patientSymptoms: extractSymptomsFromTranscript(realTimeTranscript),
        bodyPart: extractBodyPartFromTranscript(realTimeTranscript),
        sessionDuration: Math.floor(recordingTime / 60)
      };

      const response = await fetch(`/api/physiogpt/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: `${query}\n\nClinical Context:\n- Body Part: ${context.bodyPart}\n- Symptoms: ${context.patientSymptoms.join(', ')}\n- Transcript Context: ${context.transcript.slice(-300)}`,
          patientContext: {
            bodyPart: context.bodyPart,
            symptoms: context.patientSymptoms,
            transcript: context.transcript.slice(-300)
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get PhysioGPT response');
      }

      const data = await response.json();

      setPhysioGptChat(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, answer: data.response || data.answer || data.message || "Response received successfully" }
            : msg
        )
      );

    } catch (error) {
      console.error('Error handling PhysioGPT query:', error);
      setPhysioGptChat(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, answer: "I'm experiencing technical difficulties. Please try again or consult clinical resources directly." }
            : msg
        )
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper functions to extract context from transcript
  const extractSymptomsFromTranscript = (transcript: string): string[] => {
    const symptomKeywords = ['pain', 'ache', 'stiff', 'sore', 'swollen', 'numb', 'weak', 'tight'];
    const symptoms = [];
    const lowerTranscript = transcript.toLowerCase();
    
    for (const keyword of symptomKeywords) {
      if (lowerTranscript.includes(keyword)) {
        symptoms.push(keyword);
      }
    }
    
    return symptoms;
  };

  const extractBodyPartFromTranscript = (transcript: string): string => {
    const bodyParts = ['shoulder', 'knee', 'back', 'neck', 'ankle', 'hip', 'elbow', 'wrist', 'hand', 'foot'];
    const lowerTranscript = transcript.toLowerCase();
    
    for (const bodyPart of bodyParts) {
      if (lowerTranscript.includes(bodyPart)) {
        return bodyPart;
      }
    }
    
    return 'general';
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

    // Prepare SOAP data for virtual patient creation
    const soapData = {
      soapSections: soapSections,
      transcript: realTimeTranscript,
      sessionDuration: recordingTime,
      timestamp: new Date().toISOString()
    };

    createVirtualPatientMutation.mutate(soapData);
  };

  // Copy SOAP notes to clipboard
  const copyToClipboard = async () => {
    const soapNote = `
SOAP NOTE
=========

Patient: [Patient Name]
Date: ${new Date().toLocaleDateString()}
Session Duration: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}

SUBJECTIVE:
${soapSections.subjective || 'No subjective data recorded'}

OBJECTIVE:
${soapSections.objective || 'No objective data recorded'}

ASSESSMENT:
${soapSections.assessment || 'No assessment data recorded'}

PLAN:
${soapSections.plan || 'No plan data recorded'}

---
Generated by PhysioGPT Enhanced SOAP Notes
    `.trim();

    try {
      await navigator.clipboard.writeText(soapNote);
      toast({
        title: "SOAP Note Copied",
        description: "The complete SOAP note has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy Failed", 
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
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

  // Start real speech recognition
  const startRecording = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);
    setRecordingTime(0);
    setRealTimeTranscript("");
    
    // Start timer
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    let finalTranscript = '';
    
    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      setRealTimeTranscript(finalTranscript + interimTranscript);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: "Speech Recognition Error",
        description: `Error: ${event.error}. Please check your microphone permissions.`,
        variant: "destructive",
      });
    };
    
    recognitionRef.current.onend = () => {
      if (isRecording) {
        // Restart recognition if still recording
        recognitionRef.current?.start();
      }
    };
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use speech recognition.",
        variant: "destructive",
      });
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    // Connect WebSocket when recording starts
    if (userData?.id) {
      connectWebSocket("demo-session", userData.id);
    }
  };

  // Stop speech recognition
  const stopRecording = () => {
    setIsRecording(false);
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Generate SOAP sections from transcript
    if (realTimeTranscript.trim()) {
      setIsGeneratingSoap(true);
      setTimeout(() => {
        // Use AI to generate structured SOAP sections from the transcript
        generateSoapSections(realTimeTranscript);
      }, 1000);
    } else {
      toast({
        title: "No Speech Detected",
        description: "No speech was captured. Please try recording again.",
        variant: "destructive",
      });
    }
  };

  // Generate SOAP sections from transcript using AI
  const generateSoapSections = async (transcript: string) => {
    try {
      const response = await fetch('/api/generate-soap-sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate SOAP sections');
      }

      const data = await response.json();
      
      setSoapSections({
        subjective: data.subjective || transcript.trim(),
        objective: data.objective || "Physical examination findings to be documented...",
        assessment: data.assessment || "Clinical assessment based on subjective findings...",
        plan: data.plan || "Treatment plan to be developed..."
      });
      
      setIsGeneratingSoap(false);
      
      toast({
        title: "SOAP Sections Generated",
        description: "AI has analyzed your speech and created structured SOAP sections.",
      });
    } catch (error) {
      console.error('Error generating SOAP sections:', error);
      // Fallback to basic processing
      setSoapSections({
        subjective: transcript.trim(),
        objective: "Physical examination findings to be documented...",
        assessment: "Clinical assessment based on subjective findings...",
        plan: "Treatment plan to be developed..."
      });
      
      setIsGeneratingSoap(false);
      
      toast({
        title: "SOAP Sections Generated",
        description: "Basic SOAP sections created. AI enhancement temporarily unavailable.",
      });
    }
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
          <div className="lg:col-span-2 space-y-6">
            {/* Recording Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Audio Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* SOAP Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  SOAP Note Sections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGeneratingSoap && (
                  <div className="flex items-center justify-center p-8 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-blue-600 font-medium">Generating SOAP Notes...</p>
                      <p className="text-blue-500 text-sm mt-1">AI is analyzing your transcript and creating structured sections</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-4">
                  {/* Subjective */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Subjective
                    </label>
                    <Textarea 
                      value={soapSections.subjective}
                      onChange={(e) => setSoapSections(prev => ({...prev, subjective: e.target.value}))}
                      placeholder="Patient's subjective complaints and history..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Objective */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Objective
                    </label>
                    <Textarea 
                      value={soapSections.objective}
                      onChange={(e) => setSoapSections(prev => ({...prev, objective: e.target.value}))}
                      placeholder="Objective findings, measurements, test results..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Assessment */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Assessment
                    </label>
                    <Textarea 
                      value={soapSections.assessment}
                      onChange={(e) => setSoapSections(prev => ({...prev, assessment: e.target.value}))}
                      placeholder="Clinical assessment and diagnosis..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Plan */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Plan
                    </label>
                    <Textarea 
                      value={soapSections.plan}
                      onChange={(e) => setSoapSections(prev => ({...prev, plan: e.target.value}))}
                      placeholder="Treatment plan and recommendations..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Notes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={createVirtualPatient}
                    disabled={createVirtualPatientMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    {createVirtualPatientMutation.isPending ? "Creating..." : "Create Virtual Patient"}
                  </Button>
                </div>
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
                <div className="max-h-64 overflow-y-auto">
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

            {/* Admin Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Admin Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">
                    AI-powered administrative automation
                  </p>
                  <div className="grid gap-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Doctor Report
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileCheck className="w-4 h-4 mr-2" />
                      Create AHTR Submission
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Generate Insurance Forms
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Billing Codes
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Follow-up
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