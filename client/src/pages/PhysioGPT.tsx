import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  Activity,
  FileText,
  BookOpen,
  Stethoscope,
  AlertTriangle,
  Menu,
  X,
  Target,
  Download,
  Dumbbell,
  ClipboardCheck,
  Hand,
  Footprints,
  Bone,
  HeartPulse,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import ClinicalResponseDisplay from "@/components/clinical/ClinicalResponseDisplay";
import VisualContentDisplay from "@/components/clinical/VisualContentDisplay";
import { pdfGenerator } from "@/services/pdfGenerator";

// Body region data with special tests
const BODY_REGIONS = {
  cervical: {
    name: "Cervical Spine",
    icon: "🦴",
    color: "from-blue-500 to-blue-600",
    specialTests: [
      { name: "Spurling's Test", purpose: "Cervical radiculopathy", positive: "Reproduction of arm pain" },
      { name: "Upper Limb Tension Test", purpose: "Neural tension", positive: "Symptom reproduction with sensitizing maneuvers" },
      { name: "Distraction Test", purpose: "Cervical radiculopathy", positive: "Relief of symptoms" },
      { name: "Vertebral Artery Test", purpose: "VBI screening", positive: "Dizziness, nystagmus, nausea" },
      { name: "Sharp-Purser Test", purpose: "Upper cervical instability", positive: "Clunk or patient apprehension" }
    ],
    redFlags: ["Severe trauma", "Progressive neurological deficit", "Bladder/bowel dysfunction", "Bilateral arm symptoms"]
  },
  thoracic: {
    name: "Thoracic Spine",
    icon: "🦴",
    color: "from-purple-500 to-purple-600",
    specialTests: [
      { name: "Slump Test", purpose: "Neural tension", positive: "Symptom reproduction" },
      { name: "First Rib Mobility", purpose: "T1 rib dysfunction", positive: "Restricted mobility" },
      { name: "Rib Spring Test", purpose: "Rib hypomobility", positive: "Reduced spring" },
      { name: "Trunk Rotation", purpose: "Thoracic mobility", positive: "Asymmetry or pain" }
    ],
    redFlags: ["Night pain", "Unexplained weight loss", "History of cancer", "Fever"]
  },
  lumbar: {
    name: "Lumbar Spine",
    icon: "🦴",
    color: "from-green-500 to-green-600",
    specialTests: [
      { name: "Straight Leg Raise", purpose: "Lumbar radiculopathy L4-S1", positive: "Pain 30-70°" },
      { name: "Slump Test", purpose: "Neural tension", positive: "Symptom reproduction" },
      { name: "Prone Instability Test", purpose: "Lumbar instability", positive: "Pain relieved with contraction" },
      { name: "McKenzie Extension", purpose: "Directional preference", positive: "Centralization" },
      { name: "Femoral Nerve Stretch", purpose: "Upper lumbar radiculopathy", positive: "Anterior thigh pain" }
    ],
    redFlags: ["Cauda equina symptoms", "Progressive weakness", "Saddle anesthesia", "Bilateral symptoms"]
  },
  shoulder: {
    name: "Shoulder",
    icon: "💪",
    color: "from-teal-500 to-teal-600",
    specialTests: [
      { name: "Neer's Test", purpose: "Subacromial impingement", positive: "Pain with passive flexion" },
      { name: "Hawkins-Kennedy", purpose: "Subacromial impingement", positive: "Pain with internal rotation" },
      { name: "Empty Can Test", purpose: "Supraspinatus pathology", positive: "Weakness or pain" },
      { name: "External Rotation Lag Sign", purpose: "Infraspinatus tear", positive: "Inability to maintain ER" },
      { name: "Apprehension Test", purpose: "Anterior instability", positive: "Apprehension/guarding" },
      { name: "O'Brien's Test", purpose: "SLAP lesion", positive: "Deep pain reduced with supination" },
      { name: "Speed's Test", purpose: "Biceps tendinopathy", positive: "Bicipital groove pain" }
    ],
    redFlags: ["Severe trauma", "Dislocation", "Sudden weakness", "Night pain waking from sleep"]
  },
  elbow: {
    name: "Elbow",
    icon: "💪",
    color: "from-orange-500 to-orange-600",
    specialTests: [
      { name: "Cozen's Test", purpose: "Lateral epicondylalgia", positive: "Lateral elbow pain" },
      { name: "Mill's Test", purpose: "Lateral epicondylalgia", positive: "Lateral elbow pain" },
      { name: "Reverse Cozen's", purpose: "Medial epicondylalgia", positive: "Medial elbow pain" },
      { name: "Valgus Stress Test", purpose: "MCL integrity", positive: "Pain or laxity" },
      { name: "Tinel's Sign (Elbow)", purpose: "Cubital tunnel syndrome", positive: "Tingling into digits 4-5" }
    ],
    redFlags: ["Locked elbow", "Severe swelling", "Obvious deformity", "Loss of pulse"]
  },
  wrist: {
    name: "Wrist & Hand",
    icon: "✋",
    color: "from-pink-500 to-pink-600",
    specialTests: [
      { name: "Phalen's Test", purpose: "Carpal tunnel syndrome", positive: "Paresthesia in median distribution" },
      { name: "Tinel's Sign (Wrist)", purpose: "Carpal tunnel syndrome", positive: "Tingling into thumb/index/middle" },
      { name: "Finkelstein's Test", purpose: "De Quervain's tenosynovitis", positive: "Pain over radial styloid" },
      { name: "Watson's Test", purpose: "Scapholunate instability", positive: "Clunk or pain" },
      { name: "Grind Test (CMC)", purpose: "CMC joint OA", positive: "Pain with compression/rotation" }
    ],
    redFlags: ["Severe trauma", "Open wounds", "Obvious deformity", "Vascular compromise"]
  },
  hip: {
    name: "Hip",
    icon: "🦵",
    color: "from-indigo-500 to-indigo-600",
    specialTests: [
      { name: "FADIR Test", purpose: "FAI/labral pathology", positive: "Groin pain" },
      { name: "FABER Test", purpose: "Hip/SIJ pathology", positive: "Groin or SIJ pain" },
      { name: "Thomas Test", purpose: "Hip flexor tightness", positive: "Thigh rises from table" },
      { name: "Trendelenburg Test", purpose: "Hip abductor weakness", positive: "Contralateral pelvis drop" },
      { name: "Ober's Test", purpose: "ITB/TFL tightness", positive: "Leg doesn't adduct past neutral" },
      { name: "Resisted External Derotation", purpose: "Gluteal tendinopathy", positive: "Lateral hip pain" }
    ],
    redFlags: ["Severe trauma", "Unable to weight bear", "Night pain", "Groin pain with systemic symptoms"]
  },
  knee: {
    name: "Knee",
    icon: "🦵",
    color: "from-cyan-500 to-cyan-600",
    specialTests: [
      { name: "Lachman's Test", purpose: "ACL integrity", positive: "Soft/absent end-feel" },
      { name: "Anterior Drawer", purpose: "ACL integrity", positive: "Increased translation" },
      { name: "Posterior Drawer", purpose: "PCL integrity", positive: "Increased posterior translation" },
      { name: "Valgus Stress Test", purpose: "MCL integrity", positive: "Pain or laxity" },
      { name: "McMurray's Test", purpose: "Meniscal pathology", positive: "Click or pain" },
      { name: "Thessaly Test", purpose: "Meniscal pathology", positive: "Joint line pain" },
      { name: "Patellar Apprehension", purpose: "Patellar instability", positive: "Patient apprehension" }
    ],
    redFlags: ["Locked knee", "Severe effusion", "Obvious deformity", "Inability to extend"]
  },
  ankle: {
    name: "Ankle & Foot",
    icon: "🦶",
    color: "from-amber-500 to-amber-600",
    specialTests: [
      { name: "Anterior Drawer (Ankle)", purpose: "ATFL integrity", positive: "Increased translation" },
      { name: "Talar Tilt Test", purpose: "CFL integrity", positive: "Increased inversion" },
      { name: "Squeeze Test", purpose: "Syndesmosis injury", positive: "Distal ankle pain" },
      { name: "External Rotation Test", purpose: "Syndesmosis injury", positive: "Distal ankle pain" },
      { name: "Thompson's Test", purpose: "Achilles rupture", positive: "Absent plantar flexion" },
      { name: "Windlass Test", purpose: "Plantar fasciitis", positive: "Heel pain with toe extension" }
    ],
    redFlags: ["Unable to weight bear", "Severe swelling", "Ottawa Ankle Rules positive", "Obvious deformity"]
  }
};

// Physio-specific quick prompts
const PHYSIO_QUICK_ACTIONS = [
  { 
    id: "assessment", 
    label: "Assessment", 
    icon: ClipboardCheck, 
    prompt: "What assessment approach and special tests would you recommend for this presentation?",
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100"
  },
  { 
    id: "differential", 
    label: "Differentials", 
    icon: Brain, 
    prompt: "What are the differential diagnoses to consider and how do I rule them in/out?",
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100"
  },
  { 
    id: "manual", 
    label: "Manual Therapy", 
    icon: Hand, 
    prompt: "What manual therapy techniques would be appropriate and what's the evidence?",
    color: "bg-teal-50 text-teal-700 hover:bg-teal-100"
  },
  { 
    id: "exercise", 
    label: "Exercise Rx", 
    icon: Dumbbell, 
    prompt: "Provide a progressive exercise prescription with sets, reps, and dosage guidelines.",
    color: "bg-green-50 text-green-700 hover:bg-green-100"
  },
  { 
    id: "education", 
    label: "Patient Education", 
    icon: BookOpen, 
    prompt: "What patient education and self-management strategies should I provide?",
    color: "bg-amber-50 text-amber-700 hover:bg-amber-100"
  },
  { 
    id: "redflags", 
    label: "Red Flags", 
    icon: AlertTriangle, 
    prompt: "Screen for red flags and determine if onward referral is needed.",
    color: "bg-red-50 text-red-700 hover:bg-red-100"
  }
];

interface PhysioGptResponse {
  response: string;
  conversationId: number;
  suggestions?: string[];
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
  exerciseImages?: Array<{
    exerciseName: string;
    primaryImageUrl: string;
    instructions?: string[];
    tips?: string[];
    category?: string;
  }>;
  visualContent?: any[];
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
  
  // Core state
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Clinical context
  const [selectedRegion, setSelectedRegion] = useState<keyof typeof BODY_REGIONS | null>(null);
  const [showSpecialTests, setShowSpecialTests] = useState(false);
  
  // Streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [evidenceData, setEvidenceData] = useState<Map<number, PhysioGptResponse>>(new Map());
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  // Fetch messages
  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  }>({
    queryKey: [`/api/physiogpt/conversations/${selectedConversationId}`],
    enabled: !!selectedConversationId,
  });

  const messages = conversationData?.messages || [];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Streaming message handler
  const sendMessageStreaming = async (messageContent: string) => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamingContent("");
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId: selectedConversationId,
          clinicalContext: {
            bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
            professionalMode: true
          }
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
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
                    if (Object.keys(evidenceDataReceived).length > 0 && newConversationId) {
                      setEvidenceData(prev => new Map(prev.set(newConversationId!, {
                        ...evidenceDataReceived,
                        conversationId: newConversationId!,
                        response: accumulatedContent
                      })));
                    }
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
                      queryClient.invalidateQueries({ queryKey: [`/api/physiogpt/conversations/${newConversationId}`] });
                    }, 100);
                    break;
                  case 'error':
                    toast({ title: "Error", description: data.data, variant: "destructive" });
                    break;
                }
              } catch (e) {
                console.error("Error parsing SSE:", e);
              }
            }
          }
        }
      }
      
      setMessage("");
      setStreamingContent("");
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Mutation fallback
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("/api/physiogpt/chat", "POST", {
        message: messageContent,
        conversationId: selectedConversationId,
        clinicalContext: {
          bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
          professionalMode: true
        }
      });
      return response;
    },
    onSuccess: (data: PhysioGptResponse) => {
      if (data.evidenceGrade || data.exerciseImages || data.visualContent) {
        setEvidenceData(prev => new Map(prev.set(data.conversationId, data)));
      }
      setSelectedConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      setMessage("");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
        queryClient.invalidateQueries({ queryKey: [`/api/physiogpt/conversations/${data.conversationId}`] });
      }, 100);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest(`/api/physiogpt/conversations/${conversationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physiogpt/conversations"] });
      setSelectedConversationId(null);
      setSuggestions([]);
    },
  });

  const handleSendMessage = useCallback((messageContent?: string) => {
    const content = messageContent || message.trim();
    if (!content) return;
    sendMessageStreaming(content);
  }, [message, selectedConversationId, selectedRegion]);

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSuggestions([]);
    setMessage("");
  };

  const handleRegionSelect = (region: keyof typeof BODY_REGIONS) => {
    setSelectedRegion(region);
    setShowSpecialTests(true);
    
    const regionData = BODY_REGIONS[region];
    setSuggestions([
      `What assessment approach should I use for ${regionData.name.toLowerCase()} pain?`,
      `What are the common differential diagnoses for ${regionData.name.toLowerCase()}?`,
      `What are evidence-based exercises for ${regionData.name.toLowerCase()} rehabilitation?`,
      `What manual therapy techniques are effective for ${regionData.name.toLowerCase()}?`
    ]);
    
    toast({
      title: `${regionData.name} Selected`,
      description: "Special tests and relevant prompts loaded",
    });
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const currentRegionData = selectedRegion ? BODY_REGIONS[selectedRegion] : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar - Conversations */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-72'} transition-all duration-300 overflow-hidden border-r bg-white`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800">PhysioGPT</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(true)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleNewConversation} className="w-full mb-4 bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            New Consultation
          </Button>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {loadingConversations ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No consultations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      selectedConversationId === conv.id ? 'border-teal-400 bg-teal-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{conv.title}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this conversation?")) {
                              deleteConversationMutation.mutate(conv.id);
                            }
                          }}
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
        </div>
      </div>

      {/* Toggle sidebar button */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-2 top-20 z-10 bg-white shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Region 1: Patient Snapshot / Clinical Context */}
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-600">Select Body Region</h2>
              {currentRegionData && (
                <Badge className={`bg-gradient-to-r ${currentRegionData.color} text-white`}>
                  {currentRegionData.icon} {currentRegionData.name}
                </Badge>
              )}
            </div>
            
            {/* Body Region Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {(Object.keys(BODY_REGIONS) as Array<keyof typeof BODY_REGIONS>).map((region) => {
                const data = BODY_REGIONS[region];
                const isSelected = selectedRegion === region;
                return (
                  <Button
                    key={region}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`flex flex-col h-auto py-2 px-3 ${isSelected ? `bg-gradient-to-r ${data.color} text-white border-0` : ''}`}
                    onClick={() => handleRegionSelect(region)}
                    data-testid={`region-${region}`}
                  >
                    <span className="text-lg mb-1">{data.icon}</span>
                    <span className="text-xs">{data.name.split(' ')[0]}</span>
                  </Button>
                );
              })}
            </div>

            {/* Special Tests Collapsible */}
            {currentRegionData && (
              <Collapsible open={showSpecialTests} onOpenChange={setShowSpecialTests} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-teal-700 hover:bg-teal-50">
                    <span className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Special Tests for {currentRegionData.name}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showSpecialTests ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {currentRegionData.specialTests.map((test, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-2 p-2 bg-white rounded border hover:border-teal-300 cursor-pointer transition-colors"
                        onClick={() => {
                          const prompt = `How do I perform ${test.name}? What is the sensitivity/specificity and clinical utility for ${test.purpose}?`;
                          setMessage(prompt);
                        }}
                        data-testid={`special-test-${idx}`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800">{test.name}</p>
                          <p className="text-xs text-gray-600">{test.purpose}</p>
                          <p className="text-xs text-teal-600">+ : {test.positive}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                    
                    {/* Red Flags */}
                    <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">Red Flags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {currentRegionData.redFlags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-red-300 text-red-700">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        {/* Region 2: AI Dialogue */}
        <ScrollArea className="flex-1 p-4">
          {!selectedConversationId && !isStreaming ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Stethoscope className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">PhysioGPT</h2>
                <p className="text-gray-600 mb-6">
                  Your evidence-based physiotherapy clinical assistant. Select a body region above, then ask about assessment, treatment, or clinical reasoning.
                </p>
                
                {/* Quick start prompts */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("What's the best approach for assessing acute low back pain?")}
                    data-testid="quick-prompt-lbp"
                  >
                    <Bone className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
                    <span className="text-sm">Low Back Pain Assessment</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("What are the best special tests for rotator cuff pathology?")}
                    data-testid="quick-prompt-shoulder"
                  >
                    <Target className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
                    <span className="text-sm">Rotator Cuff Assessment</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("How do I differentiate between hip and lumbar pathology?")}
                    data-testid="quick-prompt-hip"
                  >
                    <Brain className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
                    <span className="text-sm">Hip vs Lumbar Differential</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage("What's the evidence for manual therapy in neck pain?")}
                    data-testid="quick-prompt-neck"
                  >
                    <BookOpen className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
                    <span className="text-sm">Manual Therapy Evidence</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="h-20 w-2/3 ml-auto" />
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border-2 border-teal-200">
                      <AvatarFallback className="bg-teal-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white border shadow-sm'
                    }`}>
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
                            professionalMode={true}
                          />
                          {evidenceData.has(selectedConversationId!) && index === messages.length - 1 && 
                           evidenceData.get(selectedConversationId!)?.visualContent && (                            
                            <VisualContentDisplay 
                              visualContent={evidenceData.get(selectedConversationId!)!.visualContent}
                              exerciseImages={evidenceData.get(selectedConversationId!)?.exerciseImages}
                            />
                          )}
                          <div className="mt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                pdfGenerator.downloadPDF({
                                  title: `Clinical Response - ${new Date().toLocaleDateString()}`,
                                  content: msg.content,
                                  type: 'general',
                                  date: new Date().toLocaleDateString(),
                                  therapistName: 'PhysioGPT User'
                                });
                                toast({ title: "PDF Generated" });
                              }}
                              className="text-xs"
                              data-testid="download-pdf"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-right text-gray-500' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 border-2 border-gray-200">
                      <AvatarFallback className="bg-gray-100">
                        <User className="h-4 w-4 text-gray-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Streaming response */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 border-2 border-teal-200">
                    <AvatarFallback className="bg-teal-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[75%]">
                    <div className="rounded-2xl p-4 bg-white border shadow-sm">
                      <ClinicalResponseDisplay content={streamingContent} professionalMode={true} />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {(sendMessageMutation.isPending || (isStreaming && !streamingContent)) && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 border-2 border-teal-200">
                    <AvatarFallback className="bg-teal-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      <span className="text-sm text-gray-500">Analyzing...</span>
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
          <div className="px-4 py-2 border-t bg-white">
            <ScrollArea className="w-full">
              <div className="flex gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => handleSendMessage(suggestion)}
                    data-testid={`suggestion-${index}`}
                  >
                    <Lightbulb className="h-3 w-3 mr-1 text-teal-600" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Region 3: Quick Actions & Input */}
        <div className="border-t bg-white">
          {/* Physio Quick Actions */}
          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto">
              {PHYSIO_QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  className={`whitespace-nowrap ${action.color}`}
                  onClick={() => handleSendMessage(action.prompt)}
                  data-testid={`action-${action.id}`}
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4">
            <div className="max-w-3xl mx-auto">
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
                    currentRegionData 
                      ? `Ask about ${currentRegionData.name.toLowerCase()} assessment or treatment...`
                      : "Ask me about assessment, treatment, or clinical reasoning..."
                  }
                  disabled={sendMessageMutation.isPending || isStreaming}
                  className="flex-1"
                  data-testid="chat-input"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessageMutation.isPending || isStreaming}
                  className="bg-teal-600 hover:bg-teal-700"
                  data-testid="send-button"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
