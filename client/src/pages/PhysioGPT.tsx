import { useState, useRef, useEffect } from "react";
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
  Stethoscope
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import InteractiveSkeleton from "@/components/3d/InteractiveSkeleton";
import AssessmentTemplates, { type AssessmentTemplate } from "@/components/clinical/AssessmentTemplates";
import AssessmentForm, { type AssessmentResults } from "@/components/clinical/AssessmentForm";
import EvidenceBasedProtocols from "@/components/clinical/EvidenceBasedProtocols";
import EvidenceDisplay from "@/components/clinical/EvidenceDisplay";
import ColorCodedContent from "@/components/clinical/ColorCodedContent";
import ColorCodeLegend from "@/components/clinical/ColorCodeLegend";
import VirtualPatientSidebar from "@/components/virtualPatient/VirtualPatientSidebar";

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
  const [showColorLegend, setShowColorLegend] = useState(false);
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

  // Debug logging for state tracking
  useEffect(() => {
    console.log("selectedConversationId changed:", selectedConversationId);
    console.log("Query enabled:", !!selectedConversationId);
    console.log("loadingMessages:", loadingMessages);
    if (selectedConversationId) {
      console.log("Should be querying:", `/api/physiogpt/conversations/${selectedConversationId}`);
    }
  }, [selectedConversationId, loadingMessages]);

  // Log conversation data when it changes
  useEffect(() => {
    if (conversationData) {
      console.log("Conversation data fetched:", conversationData);
      console.log("Messages in conversation:", conversationData?.messages?.length || 0);
      console.log("loadingMessages state:", loadingMessages);
      console.log("selectedConversationId:", selectedConversationId);
      console.log("messages array length:", messages.length);
      if (conversationData?.messages?.length > 0) {
        console.log("First message:", conversationData.messages[0]);
        console.log("Last message:", conversationData.messages[conversationData.messages.length - 1]);
      }
    }
  }, [conversationData, loadingMessages]);

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
          
          // Set initial message with patient context
          const contextMessage = `I would like to discuss patient: ${patientData.patient_name}, a ${patientData.age}-year-old ${patientData.gender} with ${patientData.chief_complaint} affecting the ${patientData.body_part}.`;
          setMessage(contextMessage);
          
          // Set relevant suggestions
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
    console.log("Virtual patient selected:", patient);
    setSelectedVirtualPatient(patient);
    
    // Set patient context for chat
    setPatientContext({
      patientId: patient.id,
      patientName: patient.patientName,
      bodyPart: patient.bodyPart,
    });

    // Create a new conversation for this patient analysis
    handleNewConversation();

    // Set initial message with comprehensive patient context
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

    // Set relevant suggestions based on the expert framework
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
      console.log("Sending message:", messageContent);
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
      console.log("Response received:", result);
      return result;
    },
    onSuccess: (data: PhysioGptResponse) => {
      console.log("Message sent successfully, conversation ID:", data.conversationId);
      console.log("Setting selectedConversationId to:", data.conversationId);
      
      // Store evidence data if available
      if (data.evidenceSummary || data.researchPapers || data.evidenceGrade) {
        setEvidenceData(prev => new Map(prev.set(data.conversationId, data)));
        console.log("Stored evidence data for conversation:", data.conversationId);
      }
      
      // Set conversation ID first
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      
      // Small delay to ensure state is updated before queries
      setTimeout(() => {
        console.log("Invalidating conversation queries for ID:", data.conversationId);
        
        // Invalidate conversations list
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        
        // Force invalidate and refetch the specific conversation
        queryClient.invalidateQueries({ 
          queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] 
        });
        
        // Force refetch
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
    console.log("handleSendMessage called with:", content);
    if (!content) {
      console.log("No content, returning early");
      return;
    }

    console.log("Calling sendMessageMutation.mutate");
    sendMessageMutation.mutate(content);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate(conversationId);
  };

  const handleAssessmentComplete = (results: any) => {
    setAssessmentResults(results);
    setSelectedAssessmentTemplate(null);
    
    // Create a message with assessment results to share with PhysioGPT
    const assessmentSummary = `Assessment completed: ${results.templateName}
Score: ${results.score || 'N/A'}
Interpretation: ${results.interpretation || 'See detailed responses'}
Key findings: ${Object.entries(results.responses).map(([q, a]) => `${q}: ${a}`).join(', ')}
Recommendations: ${results.recommendations?.join('; ') || 'Standard care protocol'}`;
    
    // Switch to chat tab and send assessment results
    setActiveTab("chat");
    handleSendMessage(`Based on this clinical assessment: ${assessmentSummary}. Please provide evidence-based treatment recommendations and next steps.`);
  };

  const handleBodyRegionSelect = (region: string, displayName: string) => {
    setSelectedBodyRegion(region);
    setSelectedBodyRegionName(displayName);
    setShow3DPanel(false);
    
    // Add anatomical context suggestion
    const contextMessage = `I have a question about ${displayName}`;
    setMessage(contextMessage);
    setSuggestions([
      `What are common conditions affecting the ${displayName}?`,
      `Assessment techniques for ${displayName} injuries`,
      `Evidence-based treatment protocols for ${displayName}`,
      `Red flags to screen for in ${displayName} pain`
    ]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationData, shouldAutoScroll]);

  // Auto-select latest conversation when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      setShouldAutoScroll(isAtBottom);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">PhysioGPT</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access your AI physiotherapy assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-2 sm:p-4 lg:p-6">
        <div className={`flex flex-col lg:grid gap-2 sm:gap-4 lg:gap-6 h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] lg:h-[calc(100vh-6rem)] ${
          showVirtualPatients 
            ? show3DPanel 
              ? 'lg:grid-cols-5' 
              : 'lg:grid-cols-4'
            : show3DPanel 
              ? 'lg:grid-cols-4' 
              : 'lg:grid-cols-3'
        }`}>
          {/* Sidebar - Conversations */}
          <div className="lg:col-span-1 h-48 lg:h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-lg">Conversations</CardTitle>
                  <Button
                    onClick={handleNewConversation}
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-2 sm:p-4 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingConversations ? (
                    <div className="space-y-2 sm:space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-2 sm:p-3 rounded-lg border animate-pulse">
                          <div className="h-3 sm:h-4 bg-gray-200 rounded mb-1 sm:mb-2" />
                          <div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-4 sm:py-8">
                      <MessageCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        No conversations yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 sm:space-y-2">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`group p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedConversationId === conversation.id
                              ? "bg-blue-50 border-blue-200"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedConversationId(conversation.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">
                                {conversation.title}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conversation.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-0 group-hover:opacity-100 lg:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface with Tabs */}
          <div className={`${
            showVirtualPatients 
              ? show3DPanel 
                ? 'lg:col-span-2' 
                : 'lg:col-span-2'
              : show3DPanel 
                ? 'lg:col-span-2' 
                : 'lg:col-span-2'
          } transition-all flex-1 lg:flex-initial`}>
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                      <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                        PhysioGPT
                        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                          Clinical AI Assistant
                        </Badge>
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                        Evidence-based physiotherapy guidance and clinical assessments
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    {patientContext && (
                      <Badge variant="default" className="text-xs bg-green-600 hidden sm:inline-flex">
                        Patient: {patientContext.patientName} ({patientContext.bodyPart})
                      </Badge>
                    )}
                    {selectedBodyRegionName && !patientContext && (
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        Context: {selectedBodyRegionName}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVirtualPatients(!showVirtualPatients)}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8"
                    >
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{showVirtualPatients ? 'Hide' : 'Show'} Patients</span>
                      <span className="sm:hidden">VP</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('3D Model button clicked, current show3DPanel:', show3DPanel);
                        setShow3DPanel(!show3DPanel);
                        console.log('3D Model button - new show3DPanel will be:', !show3DPanel);
                      }}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8"
                    >
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{show3DPanel ? 'Hide' : 'Show'} 3D Model</span>
                      <span className="sm:hidden">3D</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Tabs */}
              <div className="px-3 sm:px-6 pt-2 pb-0 border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-8 sm:h-10">
                    <TabsTrigger value="chat" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                      <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Assessments</span>
                      <span className="sm:hidden">Assess</span>
                    </TabsTrigger>
                    <TabsTrigger value="protocols" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Protocols</span>
                      <span className="sm:hidden">Proto</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                  {/* Chat Tab */}
                  {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col">
                      <div 
                        ref={scrollAreaRef}
                        className="flex-1 overflow-y-auto px-3 sm:px-6 min-h-[50vh] sm:min-h-[60vh] max-h-[calc(100vh-300px)] sm:max-h-[calc(90vh-150px)]"
                        onScroll={checkScrollPosition}
                      >
                      {!selectedConversationId ? (
                        <div className="flex items-center justify-center h-full py-4">
                          <div className="text-center space-y-3 sm:space-y-4 max-w-md px-4">
                            <div className="p-3 sm:p-4 bg-blue-50 rounded-full mx-auto w-fit">
                              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">
                                Welcome to PhysioGPT
                              </h3>
                              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                Ask me anything about physiotherapy, patient assessment, 
                                treatment planning, or clinical reasoning. I'm here to help 
                                with evidence-based guidance for your practice.
                              </p>
                            </div>
                            
                            <div className="space-y-2 pt-2 sm:pt-4">
                              <p className="text-xs sm:text-sm font-medium text-gray-700">Try asking:</p>
                              <div className="space-y-1.5 sm:space-y-2">
                                {[
                                  "How should I assess a patient with shoulder impingement?",
                                  "What exercises work best for chronic low back pain?",
                                  "How do I differentiate between different types of headaches?"
                                ].map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="block w-full text-left p-2 sm:p-3 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : loadingMessages ? (
                        <div className="space-y-4 p-4">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-3 sm:space-y-6 p-2 sm:p-4">
                          {/* Color Code Legend */}
                          <ColorCodeLegend 
                            isVisible={showColorLegend}
                            onToggle={() => setShowColorLegend(!showColorLegend)}
                          />
                          {messages.map((msg: any, index: number) => (
                            <div
                              key={msg?.id || index}
                              className={`flex gap-2 sm:gap-3 ${
                                msg?.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              {msg?.role === "assistant" && (
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                                  <AvatarFallback className="bg-blue-600 text-white">
                                    <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div
                                className={`max-w-[85%] sm:max-w-[80%] ${
                                  msg?.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                } rounded-lg p-2 sm:p-3`}
                              >
                                {msg?.role === "assistant" ? (
                                  <ColorCodedContent content={msg?.content || "No content available"} />
                                ) : (
                                  <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                                    {msg?.content || "No content available"}
                                  </div>
                                )}
                                
                                {/* Evidence Display for Assistant Messages */}
                                {msg?.role === "assistant" && selectedConversationId && evidenceData.has(selectedConversationId) && (
                                  <EvidenceDisplay
                                    evidenceSummary={evidenceData.get(selectedConversationId)?.evidenceSummary}
                                    researchPapers={evidenceData.get(selectedConversationId)?.researchPapers}
                                    evidenceGrade={evidenceData.get(selectedConversationId)?.evidenceGrade}
                                    confidenceLevel={evidenceData.get(selectedConversationId)?.confidenceLevel}
                                  />
                                )}
                                
                                <div className="text-xs opacity-70 mt-1 sm:mt-2">
                                  {msg?.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}
                                </div>
                              </div>

                              {msg?.role === "user" && (
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                                  <AvatarFallback className="bg-gray-600 text-white">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground">
                            <p>No messages in this conversation yet.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="px-3 sm:px-6 py-2 sm:py-3 border-t bg-gray-50 flex-shrink-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            Suggested follow-ups:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {suggestions.map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-blue-100 transition-colors text-xs sm:text-sm px-2 py-1"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Input */}
                    <div className="p-3 sm:p-6 border-t flex-shrink-0 bg-white relative z-10">
                      <div className="flex gap-2 sm:gap-3">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Ask about your patients or clinical practice..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendMessageMutation.isPending}
                          className="flex-1 text-sm sm:text-base h-9 sm:h-10"
                        />
                        <Button
                          onClick={() => handleSendMessage()}
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          size="sm"
                          className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 p-0"
                        >
                          {sendMessageMutation.isPending ? (
                            <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* Assessments Tab */}
                  {activeTab === 'assessments' && (
                    <div className="flex-1 overflow-y-auto">
                      {selectedAssessmentTemplate ? (
                        <div className="p-3">
                          <AssessmentForm
                            template={selectedAssessmentTemplate}
                            onComplete={setAssessmentResults}
                            onBack={() => setSelectedAssessmentTemplate(null)}
                          />
                        </div>
                      ) : (
                        <AssessmentTemplates
                          onSelectTemplate={setSelectedAssessmentTemplate}
                          selectedBodyPart={selectedBodyRegion || undefined}
                        />
                      )}
                    </div>
                  )}

                  {/* Protocols Tab */}
                  {activeTab === 'protocols' && (
                    <div className="flex-1 overflow-y-auto">
                      <EvidenceBasedProtocols
                        selectedBodyPart={selectedBodyRegion || undefined}
                      />
                    </div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Virtual Patient Sidebar */}
          {showVirtualPatients && (
            <div className="lg:col-span-1 h-64 sm:h-80 lg:h-full">
              <VirtualPatientSidebar
                onPatientSelect={handleVirtualPatientSelect}
                selectedPatientId={selectedVirtualPatient?.id}
                isCollapsed={virtualPatientCollapsed}
                onToggleCollapse={() => setVirtualPatientCollapsed(!virtualPatientCollapsed)}
              />
            </div>
          )}

          {/* 3D Skeleton Panel */}
          {show3DPanel && (
            <div className="lg:col-span-1 h-64 sm:h-80 lg:h-full">
              <div className="h-full">
                {console.log('Rendering 3D Panel - show3DPanel:', show3DPanel)}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-sm">3D Body Model</CardTitle>
                  </CardHeader>
                  <CardContent className="h-full p-2">
                    <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm text-gray-600">Interactive 3D Body Model</p>
                        <p className="text-xs text-gray-500 mt-1">Click on body regions for targeted assessment</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}