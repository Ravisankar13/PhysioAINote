import { useState, useRef, useEffect, Suspense, Component } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Plus, 
  Trash2, 
  Clock,
  Brain,
  Lightbulb,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  BookOpen,
  Stethoscope,
  AlertTriangle,
  Menu,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import InteractiveSkeleton from "@/components/3d/InteractiveSkeleton";
import AssessmentTemplates, { type AssessmentTemplate } from "@/components/clinical/AssessmentTemplates";
import AssessmentForm, { type AssessmentResults } from "@/components/clinical/AssessmentForm";
import EvidenceBasedProtocols from "@/components/clinical/EvidenceBasedProtocols";
import EvidenceDisplay from "@/components/clinical/EvidenceDisplay";
import VirtualPatientSidebar from "@/components/virtualPatient/VirtualPatientSidebar";
import FormattedResponse from "@/components/clinical/FormattedResponse";
import SOAPBuilderPanel from "@/components/clinical/SOAPBuilderPanel";

// Error Boundary Component
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('3D Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-gray-600">3D Model Loading Error</p>
            <p className="text-xs text-gray-500 mt-1">Please try refreshing the page</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ChatMessage extends PhysioGptMessage {
  suggestions?: string[];
}

interface ResearchPaper {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  pmid?: string;
  doi?: string;
  abstract: string;
  studyType: 'RCT' | 'Systematic Review' | 'Meta-Analysis' | 'Cohort' | 'Case Study' | 'Clinical Guideline';
  evidenceLevel: 'I' | 'II' | 'III' | 'IV' | 'V';
  gradeRecommendation: 'A' | 'B' | 'C' | 'D';
  relevanceScore: number;
}

interface EvidenceSummary {
  topic: string;
  primaryRecommendation: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  confidenceLevel: 'High' | 'Moderate' | 'Low' | 'Very Low';
  supportingStudies: ResearchPaper[];
  contradictoryEvidence?: string;
  clinicalConsiderations: string[];
  lastUpdated: Date;
}

interface PhysioGptResponse {
  response: string;
  conversationId: number;
  suggestions?: string[];
  evidenceSummary?: EvidenceSummary;
  researchPapers?: ResearchPaper[];
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
}

export default function PhysioGPT() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string | null>(null);
  const [selectedBodyRegionName, setSelectedBodyRegionName] = useState<string | null>(null);
  const [show3DPanel, setShow3DPanel] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [patientContext, setPatientContext] = useState<{
    patientId?: number;
    patientName?: string;
    bodyPart?: string;
  } | null>(null);
  const [selectedAssessmentTemplate, setSelectedAssessmentTemplate] = useState<any | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<any | null>(null);
  const [showVirtualPatients, setShowVirtualPatients] = useState(false);
  const [selectedVirtualPatient, setSelectedVirtualPatient] = useState<any | null>(null);
  const [virtualPatientCollapsed, setVirtualPatientCollapsed] = useState(false);
  const [evidenceData, setEvidenceData] = useState<Map<number, PhysioGptResponse>>(new Map());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSOAPBuilder, setShowSOAPBuilder] = useState(false);
  const [soapBuilderCollapsed, setSOAPBuilderCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch user conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  // Fetch conversation data
  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  }>({
    queryKey: [`/api/physiogpt/conversations/${selectedConversationId}`],
    enabled: !!selectedConversationId,
  });

  // Extract messages from conversation data
  const messages = conversationData?.messages || [];

  // Load patient context from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const patientId = urlParams.get('patient');
    
    if (patientId) {
      const fetchPatientData = async () => {
        try {
          const response = await apiRequest("GET", `/api/virtual-patients/${patientId}`);
          const patientData = await response.json();
          
          setPatientContext({
            patientId: parseInt(patientId),
            patientName: patientData.patient_name,
            bodyPart: patientData.body_part,
          });
          
          const contextMessage = `I would like to discuss patient: ${patientData.patient_name}, a ${patientData.age}-year-old ${patientData.gender} with ${patientData.chief_complaint} affecting the ${patientData.body_part}.`;
          setMessage(contextMessage);
          
          setSuggestions([
            `What assessment tests would you recommend for this ${patientData.body_part} condition?`,
            `What are the potential differential diagnoses?`,
            `What treatment approaches would be most effective?`,
            `What red flags should I screen for?`
          ]);
          
          toast({
            title: "Patient Context Loaded",
            description: `Now discussing ${patientData.patient_name}'s case`,
          });
        } catch (error) {
          console.error("Error loading patient context:", error);
          toast({
            title: "Error",
            description: "Failed to load patient context",
            variant: "destructive",
          });
        }
      };
      
      fetchPatientData();
    }
  }, [location, toast]);

  // Virtual patient selection handler
  const handleVirtualPatientSelect = (patient: any) => {
    setSelectedVirtualPatient(patient);
    
    setPatientContext({
      patientId: patient.id,
      patientName: patient.patientName,
      bodyPart: patient.bodyPart,
    });

    handleNewConversation();

    const contextMessage = `Analyze virtual patient case using ${patient.expertFramework} methodology:

Patient: ${patient.patientName}
Age: ${patient.age} years, Gender: ${patient.gender}
Body Part: ${patient.bodyPart}
Condition: ${patient.condition}
Chief Complaint: ${patient.chiefComplaint}

Presenting Symptoms: ${patient.presentingSymptoms}
Medical History: ${patient.medicalHistory}

Please provide assessment recommendations following ${patient.expertFramework} approach.`;

    setMessage(contextMessage);

    const frameworkSuggestions = {
      'jo-gibson': [
        "What shoulder assessment tests would Jo Gibson recommend?",
        "How should I apply Jo Gibson's movement system approach?",
        "What are the key differential diagnoses to consider?",
        "What treatment principles should guide rehabilitation?"
      ],
      'grimaldi': [
        "What hip assessment approach would Alison Grimaldi recommend?",
        "How should I evaluate hip and pelvic biomechanics?",
        "What are the key loading considerations?",
        "What exercise progression would be most appropriate?"
      ],
      'bisset': [
        "What elbow assessment tests would Leanne Bisset recommend?",
        "How should I evaluate tendon loading capacity?",
        "What are the evidence-based treatment options?",
        "What exercise prescription would be most effective?"
      ],
      'clinical-edge': [
        "What evidence-based assessment approach should I use?",
        "What are the latest research findings for this condition?",
        "How should I apply clinical prediction rules?",
        "What outcome measures would be most appropriate?"
      ],
      'physio-network': [
        "How should I assess pain mechanisms in this case?",
        "What biopsychosocial factors should I consider?",
        "What pain education strategies would be appropriate?",
        "How should I address movement fears and beliefs?"
      ],
      'sports-map': [
        "What sport-specific assessment should I perform?",
        "How should I evaluate movement patterns?",
        "What return-to-sport criteria should I use?",
        "What injury prevention strategies should I implement?"
      ]
    };

    setSuggestions(
      frameworkSuggestions[patient.expertFramework as keyof typeof frameworkSuggestions] || [
        "What assessment tests would you recommend?",
        "What are the potential differential diagnoses?",
        "What treatment approaches would be most effective?",
        "What outcome measures should I use?"
      ]
    );

    toast({
      title: "Virtual Patient Selected",
      description: `Analyzing ${patient.patientName} using ${patient.expertFramework} methodology`,
    });
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("POST", "/api/physiogpt/chat", {
        message: messageContent,
        conversationId: selectedConversationId,
        patientContext: patientContext ? {
          patientId: patientContext.patientId
        } : selectedBodyRegion ? {
          bodyRegion: selectedBodyRegion,
          regionName: selectedBodyRegionName
        } : undefined,
        virtualPatient: selectedVirtualPatient ? {
          id: selectedVirtualPatient.id,
          patientName: selectedVirtualPatient.patientName,
          age: selectedVirtualPatient.age,
          gender: selectedVirtualPatient.gender,
          bodyPart: selectedVirtualPatient.bodyPart,
          condition: selectedVirtualPatient.condition,
          chiefComplaint: selectedVirtualPatient.chiefComplaint,
          presentingSymptoms: selectedVirtualPatient.presentingSymptoms,
          medicalHistory: selectedVirtualPatient.medicalHistory,
          expertFramework: selectedVirtualPatient.expertFramework,
          complexity: selectedVirtualPatient.complexity
        } : undefined
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data: PhysioGptResponse) => {
      if (data.evidenceSummary || data.researchPapers || data.evidenceGrade) {
        setEvidenceData(prev => new Map(prev.set(data.conversationId, data)));
      }
      
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] 
        });
        queryClient.refetchQueries({ 
          queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] 
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/physiogpt/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      setSelectedConversationId(null);
      setSuggestions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (messageContent?: string) => {
    const content = messageContent || message.trim();
    if (!content) {
      return;
    }
    sendMessageMutation.mutate(content);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
    setMessage("");
    setPatientContext(null);
    setSelectedBodyRegion(null);
    setSelectedBodyRegionName(null);
    setAssessmentResults(null);
    setSelectedAssessmentTemplate(null);
    setSelectedVirtualPatient(null);
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setAssessmentResults(null);
    setSelectedAssessmentTemplate(null);
  };

  const handleDeleteConversation = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const handleBodyPartSelected = (bodyPartId: string, displayName: string) => {
    setSelectedBodyRegion(bodyPartId);
    setSelectedBodyRegionName(displayName);
    
    setSuggestions([
      `What are the common causes of ${displayName.toLowerCase()} pain?`,
      `What assessment tests should I perform for ${displayName.toLowerCase()} issues?`,
      `What are the red flags for ${displayName.toLowerCase()} conditions?`,
      `What exercises would you recommend for ${displayName.toLowerCase()} rehabilitation?`
    ]);
    
    toast({
      title: "Body Region Selected",
      description: `Now focused on ${displayName} assessment and treatment`,
    });
  };

  const handleTemplateSelect = (template: AssessmentTemplate) => {
    setSelectedAssessmentTemplate(template);
    setActiveTab("assessment");
  };

  const handleAssessmentComplete = (results: AssessmentResults) => {
    setAssessmentResults(results);
    
    const assessmentMessage = `Based on the assessment results:
${results.findings.join(', ')}

Please provide:
1. Likely diagnosis
2. Recommended treatment plan
3. Key exercises
4. Red flags to monitor`;

    setMessage(assessmentMessage);
    setActiveTab("chat");
  };

  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Collapsible Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 ease-in-out overflow-hidden border-r border-teal-100 bg-white/95 backdrop-blur-sm`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">
                AI Assistant
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(true)}
              className="hover:bg-teal-50 text-teal-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            onClick={handleNewConversation}
            className="w-full mb-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {loadingConversations ? (
                <>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation above</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-teal-200 ${
                      selectedConversationId === conv.id 
                        ? 'border-teal-400 bg-gradient-to-br from-teal-50 to-mint-50 shadow-md' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate text-gray-800">
                            {conv.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(conv.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start hover:bg-teal-50 hover:border-teal-300"
              onClick={() => setShowVirtualPatients(!showVirtualPatients)}
            >
              <Stethoscope className="h-4 w-4 mr-2 text-teal-600" />
              Virtual Patients
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start hover:bg-teal-50 hover:border-teal-300"
              onClick={() => setShow3DPanel(!show3DPanel)}
            >
              <Activity className="h-4 w-4 mr-2 text-teal-600" />
              3D Anatomy
            </Button>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button (when collapsed) */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-4 top-20 z-10 bg-white shadow-md hover:bg-teal-50"
        >
          <Menu className="h-4 w-4 text-teal-600" />
        </Button>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-mint-500 text-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">PhysioGPT Assistant</h1>
                <p className="text-xs opacity-90">Evidence-based clinical support</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {patientContext && (
                <Badge className="bg-white/20 text-white border-white/30">
                  Patient: {patientContext.patientName}
                </Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSOAPBuilder(!showSOAPBuilder)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <FileText className="h-4 w-4 mr-1" />
                SOAP Builder
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {!selectedConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-200 to-mint-200 blur-3xl opacity-30"></div>
                  <Brain className="h-16 w-16 mx-auto text-teal-600 relative" />
                </div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">
                  Welcome to PhysioGPT
                </h2>
                <p className="text-gray-600 mb-6">
                  Your AI-powered physiotherapy assistant. Ask me anything about assessment, treatment, or clinical reasoning.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("What are the latest evidence-based treatments for lower back pain?")}
                  >
                    <Lightbulb className="h-4 w-4 mr-2 text-teal-600" />
                    Back Pain Rx
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("How do I assess shoulder impingement?")}
                  >
                    <FileText className="h-4 w-4 mr-2 text-teal-600" />
                    Shoulder Tests
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("What are red flags for cervical spine?")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2 text-teal-600" />
                    Red Flags
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("Explain central sensitization")}
                  >
                    <BookOpen className="h-4 w-4 mr-2 text-teal-600" />
                    Pain Science
                  </Button>
                </div>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="h-20 w-2/3 ml-auto" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border-2 border-teal-200">
                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <FormattedResponse 
                          content={msg.content}
                          evidenceGrade={
                            evidenceData.has(selectedConversationId!) && index === messages.length - 1
                              ? evidenceData.get(selectedConversationId!)?.evidenceGrade
                              : undefined
                          }
                          confidenceLevel={
                            evidenceData.has(selectedConversationId!) && index === messages.length - 1
                              ? evidenceData.get(selectedConversationId!)?.confidenceLevel
                              : undefined
                          }
                        />
                      ) : (
                        <p className="text-white">
                          {msg.content}
                        </p>
                      )}
                      <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 border-2 border-teal-200">
                      <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200">
                        <User className="h-4 w-4 text-gray-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex gap-3 animate-pulse">
                  <Avatar className="h-8 w-8 border-2 border-teal-200">
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 pb-2">
            <ScrollArea className="w-full" orientation="horizontal">
              <div className="flex gap-2 pb-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                    onClick={() => handleSendMessage(suggestion)}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-white/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  selectedBodyRegion 
                    ? `Ask about ${selectedBodyRegionName}...`
                    : "Ask me anything about physiotherapy..."
                }
                disabled={sendMessageMutation.isPending}
                className="flex-1 border-gray-200 focus:border-teal-400 focus:ring-teal-400"
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-sm"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Optional Panels */}
      {show3DPanel && (
        <div className="w-96 border-l bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">3D Anatomy</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShow3DPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            }>
              <InteractiveSkeleton
                onBodyPartSelected={handleBodyPartSelected}
                selectedBodyPart={selectedBodyRegion}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {showVirtualPatients && (
        <VirtualPatientSidebar
          onClose={() => setShowVirtualPatients(false)}
          onSelectPatient={handleVirtualPatientSelect}
          collapsed={virtualPatientCollapsed}
          onToggleCollapse={() => setVirtualPatientCollapsed(!virtualPatientCollapsed)}
        />
      )}
      
      {/* SOAP Builder Panel */}
      {showSOAPBuilder && (
        <SOAPBuilderPanel
          messages={messages}
          conversationId={selectedConversationId}
          isCollapsed={soapBuilderCollapsed}
          onToggleCollapse={() => setSOAPBuilderCollapsed(!soapBuilderCollapsed)}
          onAnalyze={(content, analysisType) => {
            // Close the SOAP builder after sending analysis
            setMessage(content);
            handleSendMessage(content);
            
            // Optionally show a toast for the analysis type
            toast({
              title: "SOAP Analysis Started",
              description: `Running ${analysisType || 'comprehensive'} analysis...`,
            });
          }}
        />
      )}



      {/* Mobile Floating Action Button */}
      <Button
        className="fixed bottom-20 right-4 md:hidden rounded-full shadow-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
        size="icon"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}