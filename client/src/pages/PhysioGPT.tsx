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
  X,
  Target,
  Calculator,
  Download
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
import ClinicalReferenceLibrary from "@/components/clinical/ClinicalReferenceLibrary";
import { AITreatmentPlanner } from "@/components/clinical/AITreatmentPlanner";
import ClinicalToolsPanel from "@/components/clinical/ClinicalToolsPanel";
import ClinicalResponseDisplay from "@/components/clinical/ClinicalResponseDisplay";
import VisualContentDisplay from "@/components/clinical/VisualContentDisplay";
import Skeleton3D from "@/components/clinical/Skeleton3D";
import { pdfGenerator } from "@/services/pdfGenerator";

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
  visualContent?: any[];
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
  exerciseImages?: Array<{
    exerciseName: string;
    primaryImageUrl: string;
    instructions?: string[];
    tips?: string[];
    category?: string;
  }>;
  clinicalSections?: {
    assessment?: string;
    clinicalReasoning?: string;
    treatmentPlan?: string;
    precautions?: string;
    redFlags?: string[];
    differentialDiagnosis?: string[];
    outcomeMeasures?: string[];
  };
  contraindications?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
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
  const [showReferenceLibrary, setShowReferenceLibrary] = useState(false);
  const [showTreatmentPlanning, setShowTreatmentPlanning] = useState(false);
  const [showClinicalTools, setShowClinicalTools] = useState(false);
  const [show3DSkeleton, setShow3DSkeleton] = useState(false);
  const [skeletonConfig, setSkeletonConfig] = useState<any>(null);
  const [clinicalContext, setClinicalContext] = useState<{
    bodyRegion?: string;
    conditionType?: 'acute' | 'chronic' | 'post-surgical' | 'sports';
    patientAge?: 'pediatric' | 'adult' | 'geriatric';
    activityLevel?: 'sedentary' | 'recreational' | 'competitive' | 'elite';
    clinicalTags?: string[];
    professionalMode?: boolean;
  }>({});
  const [professionalMode, setProfessionalMode] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
          const response = await apiRequest(`/api/virtual-patients/${patientId}`, "GET");
          const patientData = response;
          
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
  // Streaming message handler
  const sendMessageStreaming = async (messageContent: string) => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamingContent("");
    
    // Abort any previous streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
          } : undefined,
          clinicalContext: {
            ...clinicalContext,
            bodyRegion: selectedBodyRegion || clinicalContext.bodyRegion,
            professionalMode
          }
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let newConversationId = selectedConversationId;
      let evidenceDataReceived: any = {};
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'conversationId':
                    newConversationId = data.data;
                    setSelectedConversationId(newConversationId);
                    break;
                    
                  case 'chunk':
                    accumulatedContent += data.data;
                    setStreamingContent(accumulatedContent);
                    break;
                    
                  case 'evidence':
                    evidenceDataReceived.evidenceSummary = data.data;
                    evidenceDataReceived.evidenceGrade = data.data.evidenceGrade;
                    evidenceDataReceived.confidenceLevel = data.data.confidenceLevel;
                    break;
                    
                  case 'exercises':
                    evidenceDataReceived.exerciseImages = data.data;
                    break;
                  
                  case 'visualContent':
                    evidenceDataReceived.visualContent = data.data;
                    break;
                    
                  case 'suggestions':
                    setSuggestions(data.data || []);
                    break;
                    
                  case 'clinicalSections':
                    evidenceDataReceived.clinicalSections = data.data;
                    break;
                    
                  case 'done':
                    // Update evidence data if received
                    if (Object.keys(evidenceDataReceived).length > 0 && newConversationId) {
                      setEvidenceData(prev => new Map(prev.set(newConversationId, {
                        ...evidenceDataReceived,
                        conversationId: newConversationId,
                        response: accumulatedContent
                      })));
                    }
                    
                    // Refresh conversations
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/physiogpt/conversations/${newConversationId}`] 
                      });
                    }, 100);
                    break;
                    
                  case 'error':
                    toast({
                      title: "Error",
                      description: data.data,
                      variant: "destructive",
                    });
                    break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
      
      setMessage("");
      setStreamingContent("");
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Streaming error:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };
  
  // Regular mutation for non-streaming
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("/api/physiogpt/chat", "POST", {
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
        } : undefined,
        clinicalContext: {
          ...clinicalContext,
          bodyRegion: selectedBodyRegion || clinicalContext.bodyRegion,
          professionalMode
        }
      });
      return response;
    },
    onSuccess: (data: PhysioGptResponse) => {
      if (data.evidenceSummary || data.researchPapers || data.evidenceGrade || data.exerciseImages || data.visualContent) {
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
      await apiRequest(`/api/physiogpt/conversations/${conversationId}`, "DELETE");
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
    
    if (useStreaming) {
      sendMessageStreaming(content);
    } else {
      sendMessageMutation.mutate(content);
    }
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

          {/* Clinical Context Section */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="text-sm font-medium text-gray-700">Clinical Context</div>
            
            {/* Body Region Quick Select */}
            <div className="grid grid-cols-3 gap-1">
              {['Cervical', 'Thoracic', 'Lumbar', 'Shoulder', 'Hip', 'Knee'].map(region => (
                <Button
                  key={region}
                  variant={clinicalContext.bodyRegion === region ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setClinicalContext(prev => ({ ...prev, bodyRegion: region }))}
                >
                  {region}
                </Button>
              ))}
            </div>
            
            {/* Condition Type */}
            <div className="flex gap-1">
              {(['acute', 'chronic', 'post-surgical', 'sports'] as const).map(type => (
                <Button
                  key={type}
                  variant={clinicalContext.conditionType === type ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs flex-1"
                  onClick={() => setClinicalContext(prev => ({ ...prev, conditionType: type }))}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

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
            <Button
              variant="outline"
              className="w-full justify-start hover:bg-teal-50 hover:border-teal-300"
              onClick={() => setShowClinicalTools(!showClinicalTools)}
            >
              <Calculator className="h-4 w-4 mr-2 text-teal-600" />
              Clinical Tools
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
              {/* Professional Mode Toggle */}
              <Button
                variant={professionalMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setProfessionalMode(!professionalMode)}
                className="text-xs"
              >
                {professionalMode ? (
                  <><FileText className="h-3 w-3 mr-1" /> Pro Mode</>  
                ) : (
                  <><User className="h-3 w-3 mr-1" /> Clinical</>
                )}
              </Button>
              {/* Streaming Toggle */}
              <Button
                variant={useStreaming ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setUseStreaming(!useStreaming)}
                className="text-xs"
                title={useStreaming ? "Streaming enabled - responses appear instantly" : "Streaming disabled - wait for complete response"}
              >
                {useStreaming ? (
                  <><Activity className="h-3 w-3 mr-1 animate-pulse" /> Fast</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Standard</>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSOAPBuilder(!showSOAPBuilder)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <FileText className="h-4 w-4 mr-1" />
                SOAP Builder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReferenceLibrary(!showReferenceLibrary)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                References
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTreatmentPlanning(!showTreatmentPlanning)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Activity className="h-4 w-4 mr-1" />
                Treatment Plan
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShow3DSkeleton(!show3DSkeleton)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <User className="h-4 w-4 mr-1" />
                3D Patient Model
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
                        <>
                          <ClinicalResponseDisplay 
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
                            clinicalSections={
                              evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                ? evidenceData.get(selectedConversationId!)?.clinicalSections
                                : undefined
                            }
                            contraindications={
                              evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                ? evidenceData.get(selectedConversationId!)?.contraindications
                                : undefined
                            }
                            icdCodes={
                              evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                ? evidenceData.get(selectedConversationId!)?.icdCodes
                                : undefined
                            }
                            cptCodes={
                              evidenceData.has(selectedConversationId!) && index === messages.length - 1
                                ? evidenceData.get(selectedConversationId!)?.cptCodes
                                : undefined
                            }
                            professionalMode={professionalMode}
                          />
                          {/* Display visual content (AI images, external images, videos) */}
                          {evidenceData.has(selectedConversationId!) && index === messages.length - 1 && 
                           evidenceData.get(selectedConversationId!)?.visualContent && (                            
                            <VisualContentDisplay 
                              visualContent={evidenceData.get(selectedConversationId!)!.visualContent}
                              exerciseImages={evidenceData.get(selectedConversationId!)?.exerciseImages}
                            />
                          )}
                          {/* Display exercise images if available and no visual content */}
                          {evidenceData.has(selectedConversationId!) && index === messages.length - 1 && 
                           !evidenceData.get(selectedConversationId!)?.visualContent &&
                           evidenceData.get(selectedConversationId!)?.exerciseImages && 
                           evidenceData.get(selectedConversationId!)!.exerciseImages!.length > 0 && (
                            <div className="mt-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Target className="h-5 w-5 text-teal-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Exercise Demonstrations</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {evidenceData.get(selectedConversationId!)!.exerciseImages!.map((exercise, idx) => (
                                  <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className="aspect-video relative bg-gradient-to-br from-gray-50 to-gray-100">
                                      <img 
                                        src={exercise.primaryImageUrl} 
                                        alt={exercise.exerciseName}
                                        className="w-full h-full object-contain p-2"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `
                                              <div class="flex flex-col items-center justify-center h-full text-gray-400">
                                                <svg class="h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span class="text-sm">Image unavailable</span>
                                              </div>
                                            `;
                                          }
                                        }}
                                      />
                                    </div>
                                    <CardContent className="p-4">
                                      <h4 className="font-semibold text-gray-800 mb-2">{exercise.exerciseName}</h4>
                                      {exercise.category && (
                                        <Badge variant="secondary" className="mb-2">
                                          {exercise.category}
                                        </Badge>
                                      )}
                                      {exercise.instructions && exercise.instructions.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-sm font-medium text-gray-600 mb-1">Instructions:</p>
                                          <ul className="text-sm text-gray-600 space-y-1">
                                            {exercise.instructions.map((instruction, i) => (
                                              <li key={i} className="flex items-start">
                                                <span className="text-teal-500 mr-2">•</span>
                                                <span>{instruction}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {exercise.tips && exercise.tips.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-sm font-medium text-gray-600 mb-1">Tips:</p>
                                          <ul className="text-sm text-gray-500 space-y-1">
                                            {exercise.tips.map((tip, i) => (
                                              <li key={i} className="flex items-start">
                                                <Lightbulb className="h-3 w-3 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                                <span>{tip}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* PDF Generation Button */}
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const contentType = msg.content.toLowerCase().includes('exercise') || 
                                                   msg.content.toLowerCase().includes('phase') ? 'exercise' : 
                                                   msg.content.toLowerCase().includes('subjective') ||
                                                   msg.content.toLowerCase().includes('objective') ? 'soap' : 'general';
                                
                                pdfGenerator.downloadPDF({
                                  title: `Clinical Response - ${new Date().toLocaleDateString()}`,
                                  content: msg.content,
                                  type: contentType as any,
                                  patientName: patientContext?.patientName || selectedVirtualPatient?.patientName,
                                  date: new Date().toLocaleDateString(),
                                  therapistName: 'PhysioGPT User',
                                  clinicName: 'PhysioGPT Clinical Services'
                                });
                                
                                toast({
                                  title: "PDF Generated",
                                  description: "The document has been downloaded to your device.",
                                });
                              }}
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download PDF
                            </Button>
                          </div>
                        </>
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
              {/* Show streaming content if streaming */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3 animate-fadeIn">
                  <Avatar className="h-8 w-8 border-2 border-teal-200">
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[70%]">
                    <div className="rounded-2xl p-4 shadow-sm bg-white border border-gray-200">
                      <ClinicalResponseDisplay 
                        content={streamingContent}
                        professionalMode={professionalMode}
                      />
                      {/* PDF Button for streaming content */}
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const contentType = streamingContent.toLowerCase().includes('exercise') || 
                                               streamingContent.toLowerCase().includes('phase') ? 'exercise' : 
                                               streamingContent.toLowerCase().includes('subjective') ||
                                               streamingContent.toLowerCase().includes('objective') ? 'soap' : 'general';
                            
                            pdfGenerator.downloadPDF({
                              title: `Clinical Response - ${new Date().toLocaleDateString()}`,
                              content: streamingContent,
                              type: contentType as any,
                              patientName: patientContext?.patientName || selectedVirtualPatient?.patientName,
                              date: new Date().toLocaleDateString(),
                              therapistName: 'PhysioGPT User',
                              clinicName: 'PhysioGPT Clinical Services'
                            });
                            
                            toast({
                              title: "PDF Generated",
                              description: "The document has been downloaded to your device.",
                            });
                          }}
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {(sendMessageMutation.isPending || (isStreaming && !streamingContent)) && (
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

        {/* Clinical Quick Actions Bar */}
        <div className="px-4 py-2 bg-gray-50 border-t flex gap-2 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => {
              const soapPrompt = "Generate a SOAP note based on our conversation";
              setMessage(soapPrompt);
              handleSendMessage(soapPrompt);
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            Generate SOAP
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => {
              const reasoningPrompt = "Show the clinical reasoning pathway for this case";
              setMessage(reasoningPrompt);
              handleSendMessage(reasoningPrompt);
            }}
          >
            <Brain className="h-3 w-3 mr-1" />
            Clinical Reasoning
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => {
              const evidencePrompt = "What's the evidence level for these recommendations?";
              setMessage(evidencePrompt);
              handleSendMessage(evidencePrompt);
            }}
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Evidence Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => {
              const redFlagPrompt = "Screen for red flags in this presentation";
              setMessage(redFlagPrompt);
              handleSendMessage(redFlagPrompt);
            }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Red Flag Screen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => {
              const exercisePrompt = "Generate a phase-based exercise program for this condition";
              setMessage(exercisePrompt);
              handleSendMessage(exercisePrompt);
            }}
          >
            <Activity className="h-3 w-3 mr-1" />
            Exercise Program
          </Button>
        </div>

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
                  professionalMode
                    ? "Enter clinical query with ICD/CPT codes, research citations..."
                    : selectedBodyRegion 
                    ? `Ask about ${selectedBodyRegionName}...`
                    : "Ask me anything about physiotherapy..."
                }
                disabled={sendMessageMutation.isPending || isStreaming}
                className="flex-1 border-gray-200 focus:border-teal-400 focus:ring-teal-400"
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMessageMutation.isPending || isStreaming}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-sm"
              >
                {(sendMessageMutation.isPending || isStreaming) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Panel - Clinical Tools or 3D Anatomy */}
      {(show3DPanel || showClinicalTools) && (
        <div className="w-96 border-l bg-white flex flex-col">
          {show3DPanel && !showClinicalTools && (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">3D Anatomy</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShow3DPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4">
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
            </>
          )}
          
          {showClinicalTools && (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-teal-600" />
                  Clinical Tools
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClinicalTools(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ClinicalToolsPanel />
              </div>
            </>
          )}
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

      {/* 3D Skeleton Panel */}
      {show3DSkeleton && (
        <div className="fixed right-4 top-20 w-[90%] max-w-6xl h-[calc(100vh-6rem)] z-40 animate-slideIn">
          <Card className="h-full shadow-2xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                3D Patient Model Builder
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShow3DSkeleton(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] p-4">
              <Skeleton3D 
                onPatientDataChange={(config) => {
                  setSkeletonConfig(config);
                  // Automatically add patient model data to conversation context
                  if (config) {
                    const modelSummary = `Patient Model Data:
- Limb proportions configured
- Joint angles: Shoulder ${config.jointAngles.shoulderFlexion}°, Hip ${config.jointAngles.hipFlexion}°, Knee ${config.jointAngles.kneeFlexion}°
- Body proportions set`;
                    setPatientContext(prev => ({
                      ...prev,
                      modelData: modelSummary
                    }));
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinical Reference Library Panel */}
      {showReferenceLibrary && (
        <div className="fixed right-4 top-20 w-96 h-[calc(100vh-6rem)] z-40 animate-slideIn">
          <ClinicalReferenceLibrary
            onCiteReference={(reference) => {
              const citation = `According to ${reference.source} (${reference.year}): "${reference.title}" - ${reference.description}`;
              setMessage(message + '\n\n' + citation);
              toast({
                title: "Reference Added",
                description: "Citation has been added to your message",
              });
            }}
            onOpenReference={(reference) => {
              if (reference.url) {
                window.open(reference.url, '_blank');
              } else {
                toast({
                  title: "Reference Details",
                  description: reference.title,
                });
              }
            }}
          />
        </div>
      )}

      {/* Treatment Planning Assistant Panel */}
      {showTreatmentPlanning && (
        <div className="fixed left-4 top-20 right-4 bottom-4 z-40 animate-slideIn">
          <AITreatmentPlanner />
        </div>
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