import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mic, MicOff, Brain, MessageSquare, Lightbulb, 
  Bot, Send, FileText, UserCheck, TrendingUp, Activity,
  Clock, Users, User, CheckCircle2, FileCheck, Shield, 
  DollarSign, Calendar, Copy, ChevronDown, ChevronUp, 
  Star, AlertTriangle, BookOpen, Copy as CopyIcon,
  BarChart3, Briefcase, Camera, X, StopCircle, Loader2,
  UserPlus, CheckCircle, AlertCircle, Split, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MotionCapture from "@/components/MotionCapture";
import ComparativeCaseAnalysis from "@/components/ComparativeCaseAnalysis";
import { RealtimeVirtualPatient } from "@/components/RealtimeVirtualPatient";
import { ForumShareDialog } from "@/components/ForumShareDialog";
import { RealtimeDocumentQueue } from "@/components/RealtimeDocumentQueue";
import { ClinicalDecisionSupport } from "@/components/ClinicalDecisionSupport";
import { AudioFeatureExtractor } from "@/utils/audioFeatureExtractor";

// Real-time AI assistance interfaces
interface AISuggestion {
  id: string;
  type: 'assessment' | 'differential' | 'treatment' | 'red-flag' | 'documentation';
  suggestion: string;
  reasoning?: string;
  priority: 'high' | 'normal';
  section?: 'subjective' | 'objective' | 'assessment' | 'plan';
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

// Evidence-based articles interface
interface EvidenceArticle {
  id: string;
  title: string;
  authors: string;
  year: number;
  summary: string;
  relevanceScore: number;
  evidenceLevel: 'high' | 'moderate' | 'low';
  keyFindings: string[];
  clinicalApplication: string;
  sourceType: 'research' | 'guideline' | 'expert-opinion';
  url?: string;
}

export default function EnhancedSoapNotesPage() {
  // Navigation
  const [, setLocation] = useLocation();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // Add ref to track recording state for intervals
  const [recordingTime, setRecordingTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null); // Track actual session start time
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null); // Track recording start
  const [totalSessionTime, setTotalSessionTime] = useState(0); // Total time across all patients in session
  const [realTimeTranscript, setRealTimeTranscript] = useState("");
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  
  // Real-time progressive SOAP generation state
  const [progressiveTranscript, setProgressiveTranscript] = useState("");
  const [lastProcessedChunkTime, setLastProcessedChunkTime] = useState<number>(0);
  const [chunkBuffer, setChunkBuffer] = useState<Blob[]>([]);
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);
  
  // Audio recording for 30-minute sessions
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Continuous recording state
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [continuousSession, setContinuousSession] = useState<any>(null);
  const [currentPatientSegments, setCurrentPatientSegments] = useState<any[]>([]);

  const [newPatientName, setNewPatientName] = useState("");
  const [showPatientSwitchDialog, setShowPatientSwitchDialog] = useState(false);
  const [detectedPatients, setDetectedPatients] = useState<any[]>([]);
  const [currentPatientNumber, setCurrentPatientNumber] = useState(1);
  const [lastTranscriptChunk, setLastTranscriptChunk] = useState("");
  const [patientDetectionHistory, setPatientDetectionHistory] = useState<any[]>([]);
  
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
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [lastSuggestionsUpdate, setLastSuggestionsUpdate] = useState<string>("");
  
  // Evidence-based articles state
  const [evidenceArticles, setEvidenceArticles] = useState<EvidenceArticle[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [lastEvidenceUpdate, setLastEvidenceUpdate] = useState<string>("");
  
  const [isCreatingVirtualPatient, setIsCreatingVirtualPatient] = useState(false);
  const [showMotionCaptureIntegration, setShowMotionCaptureIntegration] = useState(false);
  const [isCreatingEnhancedPatient, setIsCreatingEnhancedPatient] = useState(false);
  const [capturedMotionData, setCapturedMotionData] = useState<any>(null);
  const [generatedVirtualPatientId, setGeneratedVirtualPatientId] = useState<number | null>(null);
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState<number | null>(null);
  const [showForumShareDialog, setShowForumShareDialog] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  // Patient fingerprinting state
  const [patientInfo, setPatientInfo] = useState<{
    isReturningPatient: boolean;
    visitNumber: number;
    daysSinceLastVisit?: number;
    progressionTrend?: string;
  } | null>(null);
  const audioFeatureExtractorRef = useRef<AudioFeatureExtractor | null>(null);

  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Continuous recording queries and mutations
  const { data: activeContinuousSession, refetch: refetchActiveSession } = useQuery({
    queryKey: ['/api/continuous-recording/active'],
    enabled: isContinuousMode,
  });

  // Get completed SOAP notes for current continuous session
  const { data: completedSoapNotes = [], refetch: refetchCompletedNotes } = useQuery({
    queryKey: ['/api/continuous-recording/completed-notes', continuousSession?.session?.sessionId || activeContinuousSession?.session?.sessionId],
    enabled: isContinuousMode && !!(continuousSession?.session?.sessionId || activeContinuousSession?.session?.sessionId),
    refetchInterval: 5000, // Refresh every 5 seconds to show new completed notes
  });



  // Set active session when available
  useEffect(() => {
    if (activeContinuousSession?.activeSession && !continuousSession) {
      console.log("Setting active session:", activeContinuousSession.activeSession);
      setContinuousSession(activeContinuousSession.activeSession);
      setCurrentPatientNumber(activeContinuousSession.activeSession.currentPatientNumber || 1);
    }
  }, [activeContinuousSession, continuousSession]);

  // Debounce timer for AI suggestions
  useEffect(() => {
    const currentContent = JSON.stringify(soapSections);
    
    // Only generate if content has changed and we have some content
    if (currentContent !== lastSuggestionsUpdate && 
        (soapSections.subjective || soapSections.objective || 
         soapSections.assessment || soapSections.plan)) {
      
      const timer = setTimeout(() => {
        generateAISuggestions();
      }, 3000); // Wait 3 seconds after user stops typing
      
      return () => clearTimeout(timer);
    }
  }, [soapSections]);

  const startContinuousRecordingMutation = useMutation({
    mutationFn: async (sessionName?: string) => {
      const response = await fetch('/api/continuous-recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName }),
      });
      if (!response.ok) throw new Error('Failed to start continuous recording');
      return response.json();
    },
    onSuccess: (session) => {
      setContinuousSession(session);
      setCurrentPatientNumber(1);
      setDetectedPatients([]);
      // Reset session timing for new session
      setSessionStartTime(null);
      setTotalSessionTime(0);
      setRecordingTime(0);
      toast({
        title: "Continuous Recording Started",
        description: `Started clinic day session: ${session.sessionName}`,
      });
    },
  });

  const endContinuousRecordingMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch('/api/continuous-recording/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error('Failed to end continuous recording');
      return response.json();
    },
    onSuccess: (result) => {
      setContinuousSession(null);
      setIsContinuousMode(false);
      setIsRecording(false);
      // Reset all timing state
      setSessionStartTime(null);
      setTotalSessionTime(0);
      setRecordingTime(0);
      
      // Invalidate completed notes query to refresh the list (should be empty now)
      queryClient.invalidateQueries({ queryKey: ['/api/continuous-recording/completed-notes'] });
      
      toast({
        title: "Clinic Day Session Ended",
        description: result.deletedNotesCount ? "All patient notes have been cleared for privacy." : "Session ended successfully.",
      });
    },
  });

  const manualPatientSwitchMutation = useMutation({
    mutationFn: async ({ sessionId, newPatientName }: { sessionId: string, newPatientName?: string }) => {
      const response = await fetch(`/api/continuous-recording/${sessionId}/switch-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPatientName }),
      });
      if (!response.ok) throw new Error('Failed to switch patient');
      return response.json();
    },
    onSuccess: (result) => {
      console.log("✓ Patient switch SUCCESS:", result);
      console.log("Setting current patient number to:", result.currentPatientNumber);
      setCurrentPatientNumber(result.currentPatientNumber);
      setNewPatientName("");
      setShowPatientSwitchDialog(false);
      
      // Clear current SOAP sections for new patient
      setSoapSections({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
      
      // Refresh completed notes to show the newly generated note
      refetchCompletedNotes();
      
      toast({
        title: "Patient Switched",
        description: `Now recording Patient ${result.currentPatientNumber}. Previous patient notes saved.`,
      });
    },
  });

  // Helper function to get evidence grade badge color
  const getEvidenceGradeColor = (grade: string) => {
    switch (grade.toLowerCase()) {
      case 'a': return 'bg-green-100 text-green-800 border-green-200';
      case 'b': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'c': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'd': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to parse structured PhysioGPT response
  const parsePhysioGPTResponse = (response: string) => {
    const sections = [];
    const lines = response.split('\n');
    let currentSection: any = null;
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Match numbered sections like "1. **Assessment Name**"
      const sectionMatch = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*/);
      if (sectionMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          id: sectionMatch[1],
          title: sectionMatch[2],
          evidenceGrade: '',
          researchSummary: '',
          clinicalApplication: '',
          patientConsiderations: '',
          icon: '🔍'
        };
        continue;
      }

      if (currentSection) {
        // Match evidence grade
        const evidenceMatch = line.match(/Evidence Grade:\s*([A-D])\s*\(([^)]+)\)/);
        if (evidenceMatch) {
          currentSection.evidenceGrade = evidenceMatch[1];
          currentSection.confidence = evidenceMatch[2];
          continue;
        }

        // Match research summary
        if (line.includes('Supporting Research Summary:')) {
          currentSection.researchSummary = line.replace(/.*Supporting Research Summary:\s*/, '');
          continue;
        }

        // Match clinical application
        if (line.includes('Clinical Application Guidance:')) {
          currentSection.clinicalApplication = line.replace(/.*Clinical Application Guidance:\s*/, '');
          continue;
        }

        // Match patient considerations
        if (line.includes('Individual Patient Considerations:')) {
          currentSection.patientConsiderations = line.replace(/.*Individual Patient Considerations:\s*/, '');
          continue;
        }

        // Append to last field if continuing
        if (line.startsWith('-') || line.match(/^\s+[•·]/)) {
          if (currentSection.patientConsiderations && !line.includes(':')) {
            currentSection.patientConsiderations += ' ' + line;
          } else if (currentSection.clinicalApplication && !line.includes(':')) {
            currentSection.clinicalApplication += ' ' + line;
          } else if (currentSection.researchSummary && !line.includes(':')) {
            currentSection.researchSummary += ' ' + line;
          }
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

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
      
      // Display clinical summary if available
      const description = data.virtualPatient?.clinicalSummary 
        ? `Clinical Summary:\n${data.virtualPatient.clinicalSummary}`
        : "Successfully created virtual patient from your SOAP note data.";
      
      toast({
        title: "Virtual Patient Created",
        description: description,
        duration: 8000, // Show longer for clinical summary
      });
      
      // Store the generated virtual patient ID for later use
      if (data.virtualPatient?.id) {
        setGeneratedVirtualPatientId(data.virtualPatient.id);
      }
      
      // Redirect to virtual patients page after a short delay
      setTimeout(() => {
        setLocation('/virtual-patients');
      }, 2000);
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
      // Cleanup MediaRecorder
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      
      // Cleanup media stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Cleanup speech recognition (fallback)
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Cleanup timers
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Cleanup WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mediaRecorder, stream]);

  // Mock user data for demo
  const userData = { id: 1, username: "Demo User" };

  // Mock SOAP notes data
  const soapNotes: any[] = [];
  const notesLoading = false;

  // Old generateAISuggestions removed - using new enhanced version defined later

  // Timer effect - properly handle recording time updates
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingTime(elapsed);
        if (isContinuousMode) {
          setTotalSessionTime(elapsed);
        }
      }, 1000);
      
      intervalRef.current = interval;
      console.log('Timer effect started with interval:', interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          console.log('Timer effect cleanup');
        }
      };
    } else {
      // Clear timer when not recording
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }
  }, [isRecording, recordingStartTime, isContinuousMode]);

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

  // Generate AI-powered virtual patient from SOAP note (privacy-preserving)
  const generateAIVirtualPatient = async () => {
    if (!soapSections.subjective && !soapSections.objective && !soapSections.assessment) {
      toast({
        title: "Insufficient Data",
        description: "Please add clinical information to generate a virtual patient.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingVirtualPatient(true);

    try {
      const response = await fetch('/api/soap-virtual-patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          soapSections: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          transcript: realTimeTranscript,
          sessionDuration: recordingTime,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate virtual patient');
      }

      const data = await response.json();
      
      // Store the generated patient ID
      setGeneratedVirtualPatientId(data.virtualPatient.id);
      
      // Create description with clinical summary if available
      let description = `Successfully created privacy-preserving 3D patient model: ${data.virtualPatient.patient_name || data.virtualPatient.title}`;
      
      if (data.virtualPatient.clinicalSummary) {
        description += `\n\nClinical Summary:\n${data.virtualPatient.clinicalSummary}`;
      }
      
      toast({
        title: "Virtual Patient Created",
        description: description,
        duration: 10000, // Show longer for clinical summary
      });

    } catch (error) {
      console.error('Error generating virtual patient:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate virtual patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingVirtualPatient(false);
    }
  };

  // Form generation functions
  const generateDoctorReport = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'doctor_report',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate doctor report');
      }

      const data = await response.json();
      
      // Copy to clipboard
      await copyToClipboard(data.content);
      
      toast({
        title: "Doctor Report Generated",
        description: "Report has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate doctor report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAHTR = async () => {
    try {
      const response = await fetch('/api/generate-ahtr-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjective: soapSections.subjective,
          objective: soapSections.objective,
          assessment: soapSections.assessment,
          plan: soapSections.plan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AHTR PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'AHTR-Form.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "AHTR PDF Generated",
        description: "AHTR form has been generated and downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate AHTR PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateImagingReferral = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'imaging_referral',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate imaging referral');
      }

      const data = await response.json();
      
      // Copy to clipboard
      await copyToClipboard(data.content);
      
      toast({
        title: "Imaging Referral Generated",
        description: "Imaging referral has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate imaging referral. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateDischargeSummary = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'discharge_summary',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate discharge summary');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Discharge Summary Generated",
        description: "Discharge summary has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate discharge summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateProgressReport = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'progress_report',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate progress report');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Progress Report Generated",
        description: "Progress report has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate progress report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateSpecialistReferral = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'specialist_referral',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate specialist referral');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Specialist Referral Generated",
        description: "Specialist referral has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate specialist referral. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateReturnToWork = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'return_to_work',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate return to work certificate');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Return to Work Certificate Generated",
        description: "Return to work certificate has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate return to work certificate. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Generate evidence-based articles based on transcript
  const generateEvidenceArticles = useCallback(async () => {
    if (!realTimeTranscript || realTimeTranscript.length < 50) return;
    
    setIsLoadingEvidence(true);
    try {
      const response = await fetch('/api/soap-notes/evidence-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: realTimeTranscript,
          soapSections: soapSections
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEvidenceArticles(data.articles || []);
        setLastEvidenceUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching evidence articles:', error);
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [realTimeTranscript, soapSections]);

  // Trigger evidence generation and virtual patient updates when transcript changes
  useEffect(() => {
    if (realTimeTranscript && realTimeTranscript.length > 100) {
      // Generate evidence articles with a debounce
      const evidenceTimer = setTimeout(() => {
        generateEvidenceArticles();
      }, 5000); // 5 second delay
      
      // Send transcript update to WebSocket for virtual patient and document generation
      const vpTimer = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'transcript_update',
            transcript: realTimeTranscript,
            soapSections: soapSections,
            patientInfo: {
              name: patientName || 'Patient',
              date: new Date().toISOString()
            }
          }));
        }
      }, 3000); // 3 second delay for virtual patient updates
      
      return () => {
        clearTimeout(evidenceTimer);
        clearTimeout(vpTimer);
      };
    }
  }, [realTimeTranscript, generateEvidenceArticles]);

  const generateTimeOffWork = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'time_off_work',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate time off work certificate');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Time Off Work Certificate Generated",
        description: "Time off work certificate has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate time off work certificate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateInsuranceDocumentation = async () => {
    try {
      const response = await fetch('/api/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'insurance_documentation',
          soapData: {
            subjective: soapSections.subjective,
            objective: soapSections.objective,
            assessment: soapSections.assessment,
            plan: soapSections.plan,
          },
          patientName: 'Patient Name',
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insurance documentation');
      }

      const data = await response.json();
      await copyToClipboard(data.content);
      
      toast({
        title: "Insurance Documentation Generated",
        description: "Insurance documentation has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate insurance documentation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Copy SOAP notes to clipboard
  const copySoapNotesToClipboard = async () => {
    const soapNote = `
SOAP NOTE
=========

Patient: [Patient Name]
Date: ${new Date().toLocaleDateString()}
Session Duration: ${formatTime(recordingTime)}

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
  const acceptSuggestion = async (suggestion: AISuggestion) => {
    try {
      const response = await fetch('/api/apply-ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion,
          currentSections: soapSections
        }),
      });
      
      if (!response.ok) throw new Error('Failed to apply suggestion');
      
      const { updatedSections } = await response.json();
      setSoapSections(updatedSections);
      
      // Remove the applied suggestion from the list
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      toast({
        title: "Suggestion Applied",
        description: "AI suggestion has been added to your SOAP notes",
      });
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to apply suggestion",
        variant: "destructive",
      });
    }
  };

  // Function to generate AI suggestions
  const generateAISuggestions = async () => {
    // Don't generate if sections are mostly empty
    const hasContent = soapSections.subjective || soapSections.objective || 
                      soapSections.assessment || soapSections.plan;
    
    if (!hasContent) return;
    
    setIsGeneratingSuggestions(true);
    
    try {
      const response = await fetch('/api/generate-ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soapSections,
          transcript: realTimeTranscript
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate suggestions');
      
      const { suggestions } = await response.json();
      setAiSuggestions(suggestions);
      setLastSuggestionsUpdate(JSON.stringify(soapSections));
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Create virtual patient from SOAP notes with optional motion capture data
  const createVirtualPatientFromSOAP = async (includeMotionData: boolean = false) => {
    if (!soapSections.subjective && !soapSections.objective) {
      toast({
        title: "Insufficient Data",
        description: "Please record and generate SOAP sections before creating a virtual patient.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEnhancedPatient(true);

    try {
      const requestData = {
        soapData: {
          subjective: soapSections.subjective,
          objective: soapSections.objective,
          assessment: soapSections.assessment,
          plan: soapSections.plan,
        },
        sessionDuration: recordingTime,
        includeMotionData,
        motionCaptureData: null, // Motion capture moved to Virtual Patients page
      };

      const response = await fetch('/api/enhanced-virtual-patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to create enhanced virtual patient');
      }

      const data = await response.json();
      
      toast({
        title: includeMotionData ? "Digital Twin Created" : "Virtual Patient Created",
        description: includeMotionData 
          ? "Enhanced virtual patient with motion data created successfully"
          : "Virtual patient created from SOAP notes successfully",
      });

      // Navigate to virtual patients page to view the created patient
      setLocation('/virtual-patients');
      
    } catch (error) {
      console.error('Error creating virtual patient:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create virtual patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEnhancedPatient(false);
    }
  };

  // Process patient fingerprint for anonymous follow-up recognition
  const processPatientFingerprint = async (audioFeatures: any, transcript: string) => {
    try {
      const response = await fetch('/api/patient-fingerprint/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioFeatures,
          transcript,
          movementData: capturedMotionData
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatientInfo(data);
        
        if (data.isReturningPatient) {
          toast({
            title: "Returning Patient Recognized",
            description: data.message,
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.log('Patient fingerprinting skipped:', error);
      // Silently fail - fingerprinting is optional
    }
  };

  // Handle motion capture data from the motion capture component
  const handleMotionCaptureComplete = (motionData: any) => {
    setCapturedMotionData(motionData);
    setShowMotionCaptureIntegration(false);
    
    toast({
      title: "Motion Data Captured", 
      description: `Captured movement data. Ready to create digital twin.`,
    });
  };

  // Process complete audio recording with chunked transcription for long recordings
  const processCompleteAudioRecording = async (audioBlob: Blob) => {
    try {
      setIsGeneratingSoap(true);
      console.log('Processing audio blob:', audioBlob.size, 'bytes');
      
      // Extract audio features for patient fingerprinting (anonymous)
      try {
        if (!audioFeatureExtractorRef.current) {
          audioFeatureExtractorRef.current = new AudioFeatureExtractor();
        }
        const audioFeatures = await audioFeatureExtractorRef.current.extractFeatures(audioBlob);
        
        // Process patient fingerprint in the background (don't wait)
        processPatientFingerprint(audioFeatures, realTimeTranscript);
      } catch (error) {
        console.log('Audio feature extraction skipped:', error);
        // Continue without fingerprinting if it fails
      }
      
      const fileSizeMB = audioBlob.size / (1024 * 1024);
      const MAX_CHUNK_SIZE_MB = 10; // Lower chunk size for better reliability
      
      // If file is too large, process in chunks
      if (fileSizeMB > MAX_CHUNK_SIZE_MB) {
        setRealTimeTranscript("Processing long recording in segments for optimal performance...");
        
        // Calculate chunk size and number of chunks
        const chunkSizeBytes = MAX_CHUNK_SIZE_MB * 1024 * 1024;
        const numberOfChunks = Math.ceil(audioBlob.size / chunkSizeBytes);
        
        console.log(`Splitting ${fileSizeMB.toFixed(2)}MB audio into ${numberOfChunks} chunks`);
        
        let fullTranscript = '';
        const transcriptChunks: string[] = [];
        
        // Process each chunk
        for (let i = 0; i < numberOfChunks; i++) {
          const start = i * chunkSizeBytes;
          const end = Math.min(start + chunkSizeBytes, audioBlob.size);
          const chunk = audioBlob.slice(start, end);
          
          setRealTimeTranscript(`Processing segment ${i + 1} of ${numberOfChunks}...`);
          
          try {
            const formData = new FormData();
            formData.append('audio', chunk, `chunk_${i}.webm`);
            formData.append('chunkIndex', i.toString());
            formData.append('totalChunks', numberOfChunks.toString());
            
            const response = await fetch('/api/transcribe-chunk', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              console.error(`Failed to transcribe chunk ${i + 1}`);
              continue; // Skip failed chunks instead of failing entirely
            }
            
            const data = await response.json();
            const chunkTranscript = data.transcription || data.transcript || data.text || '';
            
            if (chunkTranscript) {
              transcriptChunks.push(chunkTranscript);
              fullTranscript = transcriptChunks.join(' ');
              
              // Update real-time transcript with progress
              setRealTimeTranscript(`Transcribed ${i + 1}/${numberOfChunks} segments. Current transcript: ${fullTranscript.substring(0, 200)}...`);
            }
          } catch (error) {
            console.error(`Error processing chunk ${i + 1}:`, error);
            // Continue with remaining chunks
          }
        }
        
        // Final transcript
        if (fullTranscript.length > 10) {
          console.log('Full transcript assembled:', fullTranscript.length, 'characters');
          setRealTimeTranscript(fullTranscript);
          
          // Generate SOAP sections from combined transcript
          await generateSoapSections(fullTranscript);
          
          toast({
            title: "Long Recording Transcribed",
            description: `Successfully transcribed ${numberOfChunks} segments (${fullTranscript.length} characters total).`,
          });
        } else {
          throw new Error('No transcript generated from chunks');
        }
        
      } else {
        // Process normally for smaller files
        setRealTimeTranscript(fileSizeMB > 5 
          ? `Processing ${fileSizeMB.toFixed(1)}MB recording... This may take 60-90 seconds.`
          : fileSizeMB > 2
          ? `Processing ${fileSizeMB.toFixed(1)}MB recording... This may take 30-60 seconds.`
          : "Transcribing audio with OpenAI Whisper...");
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Transcription failed');
        }
        
        const data = await response.json();
        const transcript = data.transcription || data.transcript || data.text || '';
        
        console.log('Transcription received:', transcript.length, 'characters');
        setRealTimeTranscript(transcript);
        
        // Check if we already have SOAP sections from the API response
        if (data.soapNote) {
          console.log('Using SOAP sections from API:', data.soapNote);
          setSoapSections(data.soapNote);
          setIsGeneratingSoap(false);
        } else if (transcript && transcript.length > 10) {
          // Generate SOAP sections from transcript if not provided
          await generateSoapSections(transcript);
        } else {
          // Fallback for short/empty transcripts
          setSoapSections({
            subjective: transcript || "Patient consultation recorded.",
            objective: "Physical examination findings to be documented...",
            assessment: "Clinical assessment based on consultation...",
            plan: "Treatment plan to be developed..."
          });
          setIsGeneratingSoap(false);
        }

        toast({
          title: "Audio Transcribed",
          description: `Successfully transcribed ${transcript.length} characters of audio.`,
        });
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      setRealTimeTranscript("Transcription failed. Please try recording again.");
      
      // Fallback SOAP sections
      setSoapSections({
        subjective: "Audio recording completed - manual transcription may be needed.",
        objective: "Physical examination findings to be documented...",
        assessment: "Clinical assessment to be completed...",
        plan: "Treatment plan to be developed..."
      });
      
      toast({
        title: "Transcription Failed",
        description: "Audio recorded but transcription failed. You can manually enter notes.",
        variant: "destructive",
      });
      
      setIsGeneratingSoap(false);
    }
  };

  // Process intermediate audio for real-time transcription and SOAP generation
  const processIntermediateAudio = async (audioBlob: Blob) => {
    try {
      // Only process if recording is still active and blob has content
      if (!isRecordingRef.current || audioBlob.size < 1000) {
        console.log(`Skipping chunk processing - Recording: ${isRecordingRef.current}, Blob size: ${audioBlob.size}`);
        return;
      }
      
      // Prevent overlapping chunk processing
      if (isProcessingChunk) {
        console.log('Skipping chunk - previous chunk still processing');
        return;
      }
      
      setIsProcessingChunk(true);
      console.log('Processing real-time audio chunk:', audioBlob.size, 'bytes');
      
      // Create FormData for audio file upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');
      formData.append('progressiveTranscript', progressiveTranscript); // Send accumulated transcript for context
      
      // Send to new real-time SOAP processing endpoint
      const response = await fetch('/api/soap-notes/real-time-chunk', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        const chunkTranscript = data.transcription || data.transcript || data.text || '';
        
        if (chunkTranscript && chunkTranscript.length > 10) {
          // Update progressive transcript
          const updatedTranscript = progressiveTranscript 
            ? `${progressiveTranscript} ${chunkTranscript}`
            : chunkTranscript;
          
          setProgressiveTranscript(updatedTranscript);
          setRealTimeTranscript(`🔴 Recording... Last update: ${new Date().toLocaleTimeString()}\n\n${updatedTranscript.slice(-500)}...`);
          
          // Send update to virtual patient through WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'realtime_update',
              transcript: updatedTranscript,
              timestamp: new Date().toISOString()
            }));
          }
          
          // Update SOAP sections if provided
          if (data.soapSections) {
            console.log('Real-time SOAP update received');
            setSoapSections(prevSections => ({
              subjective: data.soapSections.subjective || prevSections.subjective,
              objective: data.soapSections.objective || prevSections.objective,
              assessment: data.soapSections.assessment || prevSections.assessment,
              plan: data.soapSections.plan || prevSections.plan
            }));
            
            // Show real-time update notification
            if (!isGeneratingSoap) {
              setIsGeneratingSoap(true);
              setTimeout(() => setIsGeneratingSoap(false), 1000);
            }
          }
          
          // Update AI suggestions if provided
          if (data.aiSuggestions && data.aiSuggestions.length > 0) {
            setAiSuggestions(data.aiSuggestions);
          }
          
          // If in continuous mode, handle patient detection
          if (isContinuousMode && data.patientSwitch?.patientSwitchDetected) {
            setCurrentPatientNumber(data.patientSwitch.currentPatientNumber);
            toast({
              title: "Patient Switch Detected",
              description: `Now recording Patient ${data.patientSwitch.currentPatientNumber}`,
            });
          }
        }
      }
    } catch (error) {
      console.log('Real-time processing error:', error.message);
      // Don't show errors for intermediate processing - it's optional
    } finally {
      setIsProcessingChunk(false);
    }
  };

  // Continuous recording helper functions



  // Start audio recording for up to 45-minute sessions using progressive chunking
  const startRecording = async () => {
    try {
      // Get microphone access with optimized settings for long recordings
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for smaller file size while maintaining quality
        }
      });
      setStream(mediaStream);
      
      // Create MediaRecorder with optimized settings for long recordings
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm',
        audioBitsPerSecond: 64000 // Lower bitrate for smaller files (still good quality for speech)
      });
      setMediaRecorder(recorder);
      
      const chunks: BlobPart[] = [];
      let recentChunks: BlobPart[] = []; // Store recent chunks for 30-second processing
      
      // Request data every second for real-time processing
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          recentChunks.push(e.data);
        }
      };
      
      // Store interval reference
      const chunkIntervalRef = { current: null as NodeJS.Timeout | null };
      
      // Set up 30-second interval for processing chunks
      chunkIntervalRef.current = setInterval(() => {
        console.log(`30-second interval triggered. Chunks available: ${recentChunks.length}, Recording: ${isRecordingRef.current}`);
        if (recentChunks.length > 0 && isRecordingRef.current) {
          // Create blob from recent chunks
          const intermediateBlob = new Blob(recentChunks, { type: "audio/webm" });
          console.log(`Processing intermediate blob of size: ${intermediateBlob.size} bytes`);
          
          // Process for real-time SOAP generation
          processIntermediateAudio(intermediateBlob);
          
          // Clear recent chunks but keep all chunks for final processing
          recentChunks = [];
        }
      }, 30000); // Process every 30 seconds
      
      // Quick visual feedback interval (every 5 seconds)
      // This will trigger the server to analyze any recent transcript for pain keywords
      const quickUpdateInterval = setInterval(() => {
        if (isRecordingRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Send a trigger for visual update
          wsRef.current.send(JSON.stringify({
            type: 'request_visual_update',
            timestamp: new Date().toISOString()
          }));
        }
      }, 5000); // 5 seconds
      
      recorder.onstop = () => {
        // Clear the chunk processing interval
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
        }
        // Clear the quick update interval
        clearInterval(quickUpdateInterval);
        
        const blob = new Blob(chunks, { type: "audio/webm" }); // Use webm format
        setAudioBlob(blob);
        mediaStream.getTracks().forEach(track => track.stop());
        
        // Process the complete audio recording with chunking if needed
        if (blob.size > 0) {
          console.log(`Final recording size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
          processCompleteAudioRecording(blob);
        }
      };

      // If continuous mode, start continuous recording session
      if (isContinuousMode && !continuousSession) {
        const sessionName = `Clinic Day - ${new Date().toLocaleDateString()}`;
        startContinuousRecordingMutation.mutate(sessionName);
      }

      setIsRecording(true);
      isRecordingRef.current = true; // Set ref for interval access
      
      // Initialize session timing
      const startTime = Date.now();
      setSessionStartTime(startTime);
      setRecordingStartTime(startTime); // Set recording start time for useEffect timer
      setRecordingTime(0);
      setTotalSessionTime(0);
      
      setRealTimeTranscript("🎙️ Recording in progress... Real-time SOAP notes will update every 30 seconds.");
      setProgressiveTranscript(""); // Reset progressive transcript for new recording
      
      console.log('Recording started at:', startTime);
      
      // Start recording - collect data every second for stability
      recorder.start(1000);
      
      toast({
        title: "Recording Started",
        description: `Real-time SOAP generation active. Notes will update every 30 seconds during your ${isContinuousMode ? "continuous" : ""} recording session.`,
      });
      
      // Connect WebSocket when recording starts
      if (userData?.id) {
        const newSessionId = continuousSession?.sessionId || `session-${Date.now()}`;
        setSessionId(newSessionId);
        
        // Initialize single WebSocket for both real-time AI and virtual patient
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/soap-ai?sessionId=${newSessionId}&userId=${userData.id}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected for real-time assistance');
          setIsWebSocketConnected(true);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsWebSocketConnected(false);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data.type);
            
            // Handle different message types
            if (data.type === 'ai_suggestions') {
              if (data.suggestions && data.suggestions.length > 0) {
                setAiSuggestions(data.suggestions);
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        wsRef.current = ws;
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop audio recording and process with AI transcription
  const stopRecording = () => {
    if (isContinuousMode) {
      // In continuous mode, we don't stop - we pause but keep session active
      setIsRecording(false);
      isRecordingRef.current = false; // Clear ref for interval
      
      // Stop MediaRecorder temporarily
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      
      // Stop media stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Clear recording start time to stop timer
      setRecordingStartTime(null);
      
      // Update total session time to current recording time for preservation
      setTotalSessionTime(recordingTime);
      
      toast({
        title: "Recording Paused",
        description: "Click Start Recording to continue with next patient or End Session to finish clinic day.",
      });
    } else {
      // Normal single-patient mode
      setIsRecording(false);
      isRecordingRef.current = false; // Clear ref for interval
      
      // Stop MediaRecorder
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      
      // Stop media stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Clear recording start time to stop timer
      setRecordingStartTime(null);
      
      setRealTimeTranscript("Processing audio recording with AI transcription...");
      
      toast({
        title: "Recording Stopped",
        description: "Processing your audio with AI transcription. This may take a moment for longer recordings.",
      });
    }
  };

  // End continuous recording session
  const endContinuousSession = () => {
    if (continuousSession) {
      // Extract session ID from nested session object
      const actualSession = continuousSession.session || continuousSession;
      const sessionId = actualSession.sessionId || actualSession.id;
      console.log("Ending session with ID:", sessionId);
      endContinuousRecordingMutation.mutate(sessionId);
      
      // Reset session timing
      setSessionStartTime(null);
      setTotalSessionTime(0);
      setRecordingTime(0);
      
      // Stop timer if running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

  // Format recording time - supports up to 60 minutes
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced SOAP Notes
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
            {/* Continuous Recording Mode Toggle */}
            <Card className="border-emerald-200">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Continuous Recording Mode
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isContinuousMode}
                      onChange={(e) => setIsContinuousMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </CardTitle>
              </CardHeader>
              {isContinuousMode && (
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-emerald-700">
                      Record multiple patients back-to-back with AI-powered patient detection and automatic note segmentation
                    </p>
                    
                    {/* Session Status */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-emerald-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-800">{currentPatientNumber}</div>
                        <div className="text-xs text-emerald-600">Current Patient</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-800">{detectedPatients.length}</div>
                        <div className="text-xs text-emerald-600">Detected Patients</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-800">
                          {formatTime(recordingTime)}
                        </div>
                        <div className="text-xs text-emerald-600">Session Time</div>
                      </div>
                    </div>
                    
                    {/* Session Name */}
                    {continuousSession && (
                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700">Session:</span>
                          <span className="text-sm text-emerald-600">{continuousSession.sessionName}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Recent Patient Detections */}
                    {detectedPatients.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-emerald-700">Recent Patient Detections:</span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {detectedPatients.slice(-5).map((patient, index) => (
                            <div key={index} className="text-xs p-2 bg-emerald-100 rounded border border-emerald-200">
                              <span className="font-medium">Patient {patient.patientNumber}</span>
                              <span className="text-emerald-600"> - {patient.confidence}% confidence</span>
                              <div className="text-emerald-500 mt-1">{patient.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Patient Switch */}
                    {continuousSession && (
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            console.log("Switch button clicked. Current session:", continuousSession);
                            setShowPatientSwitchDialog(true);
                          }}
                          variant="outline"
                          className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          size="sm"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Switch to Next Patient
                        </Button>
                        
                        {/* Completed SOAP Notes Access */}
                        {completedSoapNotes.length > 0 && (
                          <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-emerald-700">
                                Completed Notes:
                              </span>
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                {completedSoapNotes.length} patients
                              </Badge>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {completedSoapNotes.map((note, index) => (
                                <div 
                                  key={note.id} 
                                  className="text-xs p-2 bg-emerald-50 rounded border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                                  onClick={() => {
                                    // Set the SOAP sections to show this completed note
                                    setSoapSections({
                                      subjective: note.subjective || '',
                                      objective: note.objective || '',
                                      assessment: note.assessment || '',
                                      plan: note.plan || ''
                                    });
                                    toast({
                                      title: "Patient Note Loaded",
                                      description: `Viewing ${note.patientName || `Patient ${note.patientSequenceNumber}`} notes`,
                                    });
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-emerald-800">
                                      {note.patientName || `Patient ${note.patientSequenceNumber}`}
                                    </span>
                                    <span className="text-emerald-600">
                                      {new Date(note.createdAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="text-emerald-600 mt-1 truncate">
                                    {note.subjective?.substring(0, 50)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-emerald-600 text-center pt-1 border-t border-emerald-200">
                              Click any patient to view their notes
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* End Session Button */}
                    {continuousSession && (
                      <Button
                        onClick={endContinuousSession}
                        variant="outline"
                        className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        disabled={endContinuousRecordingMutation.isPending}
                      >
                        {endContinuousRecordingMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Ending Session...
                          </>
                        ) : (
                          <>
                            <StopCircle className="w-4 h-4 mr-2" />
                            End Clinic Day Session
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Patient Visit Information */}
            {patientInfo && patientInfo.isReturningPatient && (
              <Card className="border-emerald-300 bg-emerald-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-emerald-900">
                        Returning Patient - Visit #{patientInfo.visitNumber}
                      </h3>
                      <p className="text-sm text-emerald-700">
                        {patientInfo.daysSinceLastVisit && 
                          `Last visit: ${patientInfo.daysSinceLastVisit} days ago`}
                        {patientInfo.progressionTrend && 
                          ` • Trend: ${patientInfo.progressionTrend}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <div className="text-sm text-gray-500 mb-2">
                        Debug: {recordingTime}s | Started: {sessionStartTime ? 'Yes' : 'No'} | Interval: {intervalRef.current ? 'Active' : 'None'}
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
                    {isRecording ? (
                      isContinuousMode ? "Pause Recording" : "Stop Recording"
                    ) : (
                      isContinuousMode && continuousSession ? "Continue Recording" : "Start Recording"
                    )}
                  </Button>
                  
                  {realTimeTranscript && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Live Transcript:</h4>
                      <div className="max-h-16 overflow-y-auto text-sm text-gray-700 leading-relaxed border border-gray-200 rounded p-2 bg-white">
                        {realTimeTranscript}
                      </div>
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
                    onClick={copySoapNotesToClipboard}
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
                  <Button 
                    variant="default" 
                    onClick={generateAIVirtualPatient}
                    disabled={isCreatingVirtualPatient}
                    className="flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    {isCreatingVirtualPatient ? "Generating..." : "AI Generate 3D Patient"}
                  </Button>
                  {generatedVirtualPatientId && (
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/virtual-patients')}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      View 3D Patient
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Completed SOAP Notes from Continuous Session */}
            {isContinuousMode && completedSoapNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    Completed Patient Notes ({completedSoapNotes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {completedSoapNotes.map((note, index) => (
                      <div key={note.id || index} className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium text-emerald-800">
                              Patient {index + 1}
                            </span>
                            {note.patient_name && (
                              <span className="text-sm text-emerald-600">
                                - {note.patient_name}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            {new Date(note.created_at).toLocaleTimeString()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-emerald-700">Subjective:</span>
                            <p className="text-emerald-600 mt-1 truncate">
                              {note.subjective?.substring(0, 80)}...
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-emerald-700">Assessment:</span>
                            <p className="text-emerald-600 mt-1 truncate">
                              {note.assessment?.substring(0, 80)}...
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            onClick={() => {
                              // Navigate to full SOAP note view
                              toast({
                                title: "SOAP Note Ready",
                                description: `Complete notes for Patient ${index + 1} are available in your history.`,
                              });
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Full Note
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Assistance Panel */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    AI Suggestions
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAISuggestions()}
                    disabled={isGeneratingSuggestions}
                  >
                    {isGeneratingSuggestions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-3">
                    {isGeneratingSuggestions ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <p className="text-sm text-gray-600">Analyzing your notes for suggestions...</p>
                      </div>
                    ) : aiSuggestions.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        AI suggestions will appear here as you document your session
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
                  <div className="h-96 overflow-y-auto border rounded-lg p-3 space-y-4">
                    {physioGptChat.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        Ask PhysioGPT any clinical question for instant consultation
                      </p>
                    ) : (
                      physioGptChat.map((message) => {
                        const parsedSections = parsePhysioGPTResponse(message.answer);
                        
                        return (
                          <div key={message.id} className="space-y-3">
                            {/* User Question */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-800">You asked:</span>
                              </div>
                              <p className="text-sm text-blue-700">{message.query}</p>
                            </div>

                            {/* PhysioGPT Response */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Bot className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-800">PhysioGPT Clinical Analysis</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(message.answer)}
                                  className="ml-auto h-6 w-6 p-0"
                                >
                                  <CopyIcon className="w-3 h-3" />
                                </Button>
                              </div>

                              {parsedSections.length > 0 ? (
                                <div className="space-y-3">
                                  {parsedSections.map((section, index) => (
                                    <Collapsible
                                      key={index}
                                      open={expandedSections[`${message.id}-${index}`] !== false}
                                      onOpenChange={(open) => 
                                        setExpandedSections(prev => ({
                                          ...prev,
                                          [`${message.id}-${index}`]: open
                                        }))
                                      }
                                    >
                                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <CollapsibleTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-between p-4 h-auto hover:bg-gray-50"
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="text-lg">{section.icon}</span>
                                              <div className="text-left">
                                                <h4 className="font-semibold text-gray-900">
                                                  {section.title}
                                                </h4>
                                                {section.evidenceGrade && (
                                                  <div className="flex items-center gap-2 mt-1">
                                                    <Badge 
                                                      className={`text-xs ${getEvidenceGradeColor(section.evidenceGrade)}`}
                                                      variant="outline"
                                                    >
                                                      <Star className="w-3 h-3 mr-1" />
                                                      Grade {section.evidenceGrade}
                                                    </Badge>
                                                    {section.confidence && (
                                                      <span className="text-xs text-gray-500">
                                                        {section.confidence}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {expandedSections[`${message.id}-${index}`] !== false ? 
                                              <ChevronUp className="w-4 h-4" /> : 
                                              <ChevronDown className="w-4 h-4" />
                                            }
                                          </Button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                          <div className="px-4 pb-4 space-y-3">
                                            {section.researchSummary && (
                                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <BookOpen className="w-4 h-4 text-blue-600" />
                                                  <span className="font-medium text-blue-800">Research Summary</span>
                                                </div>
                                                <p className="text-sm text-blue-700 leading-relaxed">
                                                  {section.researchSummary}
                                                </p>
                                              </div>
                                            )}

                                            {section.clinicalApplication && (
                                              <div className="bg-green-50 p-3 rounded border border-green-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                  <span className="font-medium text-green-800">Clinical Application</span>
                                                </div>
                                                <p className="text-sm text-green-700 leading-relaxed">
                                                  {section.clinicalApplication}
                                                </p>
                                              </div>
                                            )}

                                            {section.patientConsiderations && (
                                              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                  <span className="font-medium text-amber-800">Patient Considerations</span>
                                                </div>
                                                <p className="text-sm text-amber-700 leading-relaxed">
                                                  {section.patientConsiderations}
                                                </p>
                                              </div>
                                            )}

                                            <div className="flex gap-2 mt-3">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyToClipboard(section.title + '\n\n' + 
                                                  (section.researchSummary ? 'Research: ' + section.researchSummary + '\n\n' : '') +
                                                  (section.clinicalApplication ? 'Application: ' + section.clinicalApplication + '\n\n' : '') +
                                                  (section.patientConsiderations ? 'Considerations: ' + section.patientConsiderations : '')
                                                )}
                                                className="text-xs"
                                              >
                                                <CopyIcon className="w-3 h-3 mr-1" />
                                                Copy Section
                                              </Button>
                                            </div>
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  ))}
                                </div>
                              ) : (
                                // Fallback for non-structured responses
                                <div className="bg-white p-3 rounded border border-gray-200">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {message.answer}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isChatLoading && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-pulse">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">PhysioGPT is analyzing...</span>
                        </div>
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

            {/* Evidence-Based Articles Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Evidence & Research
                  </div>
                  {lastEvidenceUpdate && (
                    <span className="text-xs text-gray-500">
                      Updated: {lastEvidenceUpdate}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingEvidence ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">Finding relevant research...</span>
                    </div>
                  </div>
                ) : evidenceArticles.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {evidenceArticles.map((article) => (
                      <div 
                        key={article.id} 
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900 flex-1 pr-2">
                            {article.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs shrink-0 ${
                              article.evidenceLevel === 'high' ? 'border-green-500 text-green-700' :
                              article.evidenceLevel === 'moderate' ? 'border-yellow-500 text-yellow-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {article.evidenceLevel}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">
                          {article.authors} ({article.year})
                        </p>
                        
                        <p className="text-xs text-gray-700 mb-2 line-clamp-2">
                          {article.summary}
                        </p>
                        
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-purple-600 hover:text-purple-700 p-0 h-auto"
                            >
                              <ChevronDown className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2">
                            {article.keyFindings.length > 0 && (
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-xs font-medium text-blue-800 mb-1">Key Findings:</p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                  {article.keyFindings.map((finding, idx) => (
                                    <li key={idx} className="flex items-start">
                                      <span className="mr-1">•</span>
                                      <span>{finding}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {article.clinicalApplication && (
                              <div className="bg-green-50 p-2 rounded">
                                <p className="text-xs font-medium text-green-800 mb-1">Clinical Application:</p>
                                <p className="text-xs text-green-700">{article.clinicalApplication}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-2">
                              <Badge variant="outline" className="text-xs">
                                {article.sourceType}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                Relevance: {Math.round(article.relevanceScore * 100)}%
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => generateEvidenceArticles()}
                      disabled={isLoadingEvidence}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingEvidence ? 'animate-spin' : ''}`} />
                      Refresh Research
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      No research articles yet
                    </p>
                    <p className="text-xs text-gray-500">
                      Start recording to see relevant evidence
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-Time Virtual Patient */}
            <RealtimeVirtualPatient 
              webSocket={wsRef.current}
              isRecording={isRecording}
              className="mb-6"
            />

            {/* Real-Time Document Generation Queue */}
            <RealtimeDocumentQueue
              webSocket={wsRef.current}
              sessionId={sessionId || ''}
              isRecording={isRecording}
            />

            {/* Clinical Decision Support System */}
            <ClinicalDecisionSupport
              transcript={realTimeTranscript}
              soapSections={soapSections}
              isRecording={isRecording}
            />

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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-blue-50"
                      onClick={generateDoctorReport}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Doctor Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-green-50"
                      onClick={generateAHTR}
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      Download AHTR PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-purple-50"
                      onClick={generateImagingReferral}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Generate Imaging Referral
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-indigo-50"
                      onClick={generateDischargeSummary}
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      Discharge Summary
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-emerald-50"
                      onClick={generateProgressReport}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Progress Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-cyan-50"
                      onClick={generateSpecialistReferral}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Specialist Referral
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-lime-50"
                      onClick={generateReturnToWork}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Return to Work Certificate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-amber-50"
                      onClick={generateTimeOffWork}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Time Off Work Certificate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-yellow-50"
                      onClick={generateInsuranceDocumentation}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Insurance Documentation
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start hover:bg-rose-50"
                      onClick={() => setShowForumShareDialog(true)}
                      disabled={!soapSections.subjective && !soapSections.objective && !soapSections.assessment && !soapSections.plan}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Share with Forum Community
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparative Case Analysis */}
            {currentSoapNoteId && (
              <ComparativeCaseAnalysis 
                soapNoteId={currentSoapNoteId}
                onAnalysisComplete={() => {
                  toast({
                    title: "Analysis Complete",
                    description: "Comparative case analysis has been completed successfully",
                  });
                }}
              />
            )}

            


          </div>
        </div>

        {/* Patient Switch Dialog */}
        <Dialog open={showPatientSwitchDialog} onOpenChange={setShowPatientSwitchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Split className="w-5 h-5" />
                Switch to Next Patient
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Manually switch to the next patient in your continuous recording session.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Patient Name (Optional)
                </label>
                <Input
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Enter patient name or leave blank"
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPatientSwitchDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (continuousSession) {
                      // Extract session ID from nested session object
                      const actualSession = continuousSession.session || continuousSession;
                      const sessionId = actualSession.sessionId || actualSession.id;
                      console.log("Manual switch - continuousSession object:", continuousSession);
                      console.log("Manual switch - actual session:", actualSession);
                      console.log("Manual switch - extracted session ID:", sessionId);
                      
                      if (!sessionId) {
                        toast({
                          title: "Error",
                          description: "Session ID not found. Please restart the continuous recording.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      manualPatientSwitchMutation.mutate({
                        sessionId: sessionId,
                        newPatientName: newPatientName || undefined
                      });
                    } else {
                      toast({
                        title: "Error", 
                        description: "No active continuous session found.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={manualPatientSwitchMutation.isPending}
                >
                  {manualPatientSwitchMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Switch Patient
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Motion Capture Integration Dialog */}
        <Dialog open={showMotionCaptureIntegration} onOpenChange={setShowMotionCaptureIntegration}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Motion Capture for Enhanced Virtual Patient
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Digital Patient Twin Creation</h4>
                <p className="text-sm text-blue-700">
                  Capture real patient movement patterns to create a comprehensive digital twin combining:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Clinical findings from your SOAP notes</li>
                  <li>• Real movement dysfunction patterns</li>
                  <li>• 3D biomechanical analysis</li>
                  <li>• Motion quality scoring</li>
                </ul>
              </div>

              <MotionCapture
                onComplete={handleMotionCaptureComplete}
                showDiagnosticRecommendations={false}
                showTreatmentPlanning={false}
                enableDataExport={true}
                onDataExport={(data) => {
                  // Handle motion data for virtual patient creation
                  setCapturedMotionData({
                    poseData: data.poseData,
                    analysis: {
                      duration: data.sessionDuration,
                      totalFrames: data.poseData.length,
                      avgConfidence: data.avgConfidence || 0.8,
                      movementPatterns: data.movementPatterns || [],
                      identifiedDysfunctions: data.identifiedDysfunctions || []
                    },
                    metadata: {
                      captureDate: new Date().toISOString(),
                      sessionId: `session_${Date.now()}`,
                      bodyPart: data.bodyPart || 'general'
                    }
                  });
                }}
              />

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMotionCaptureIntegration(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                {isCreatingEnhancedPatient && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Creating digital twin...</span>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Forum Share Dialog */}
        <ForumShareDialog
          isOpen={showForumShareDialog}
          onClose={() => setShowForumShareDialog(false)}
          soapData={soapSections}
          soapNoteId={currentSoapNoteId || undefined}
          virtualPatientId={generatedVirtualPatientId || undefined}
        />
      </div>
    </div>
  );
}