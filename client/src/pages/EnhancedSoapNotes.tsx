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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  Mic, MicOff, Brain, MessageSquare, Lightbulb, 
  Bot, Send, FileText, UserCheck, TrendingUp, Activity,
  Clock, Users, User, CheckCircle2, FileCheck, Shield, 
  DollarSign, Calendar, Copy, ChevronDown, ChevronUp, 
  Star, AlertTriangle, BookOpen, Copy as CopyIcon,
  BarChart3, Briefcase, Camera, X, StopCircle, Loader2,
  UserPlus, CheckCircle, AlertCircle, Split, RefreshCw,
  Save, ClipboardList, Menu, Search, ChevronLeft, ChevronRight,
  Filter, Trash2, Bone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MotionCapture from "@/components/MotionCapture";
import ComparativeCaseAnalysis from "@/components/ComparativeCaseAnalysis";
import { RealtimeVirtualPatient } from "@/components/RealtimeVirtualPatient";
import { ForumShareDialog } from "@/components/ForumShareDialog";
import { RealtimeDocumentQueue } from "@/components/RealtimeDocumentQueue";
import { ClinicalDecisionSupport } from "@/components/ClinicalDecisionSupport";
import { AudioFeatureExtractor } from "@/utils/audioFeatureExtractor";
import { StreamingSOAPNotes } from "@/components/clinical/StreamingSOAPNotes";
import { EnhancedDifferentialDisplay } from "@/components/clinical/EnhancedDifferentialDisplay";

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
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [sidebarSortBy, setSidebarSortBy] = useState<"newest" | "oldest" | "expiring">("newest");
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [useStreamingMode, setUseStreamingMode] = useState(false); // Toggle for streaming mode
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
  const [lastPageStateSave, setLastPageStateSave] = useState<Date | null>(null);

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
  const [isAnalyzingPain, setIsAnalyzingPain] = useState(false);
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
  
  // Temporary SOAP Notes state (24-hour storage)
  const [temporaryNoteId, setTemporaryNoteId] = useState<number | null>(null);
  const [temporaryNotes, setTemporaryNotes] = useState<any[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const temporaryNoteIdRef = useRef<number | null>(null);

  
  // Web Speech API state
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);
  const [webSpeechTranscript, setWebSpeechTranscript] = useState("");
  const [isWebSpeechActive, setIsWebSpeechActive] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const webSpeechTranscriptRef = useRef<string>(""); // Ref to access current transcript in callbacks
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout>();
  const painAnalysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  
  // State for virtual patient parameters
  const [virtualPatientParams, setVirtualPatientParams] = useState<any>(null);
  
  // Virtual Patient 3D Model state
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [shoulderPathology, setShoulderPathology] = useState<any>(null);
  const [spinalPathology, setSpinalPathology] = useState<any>(null);
  const [lowerLimbPathology, setLowerLimbPathology] = useState<any>(null);
  const [limbScales, setLimbScales] = useState<any>(null);
  
  // Clinical Decision Support state
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [differentials, setDifferentials] = useState<string[]>([]);
  const [guidelines, setGuidelines] = useState<string[]>([]);
  
  // Doctor's Report Dialog state - for auto-triggered document generation
  const [showDoctorReportDialog, setShowDoctorReportDialog] = useState(false);
  const [pendingDocumentType, setPendingDocumentType] = useState<string>('');
  const [pendingDocumentName, setPendingDocumentName] = useState<string>('');
  const [doctorReportDetails, setDoctorReportDetails] = useState({
    patientName: '',
    dateOfBirth: '',
    referringDoctor: '',
    dateOfInjury: '',
    diagnosis: '',
    additionalNotes: ''
  });
  
  // PhysioGPT Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  
  // Patient Fingerprint state
  const [transcript, setTranscript] = useState<string>("");
  const [identificationInfo, setIdentificationInfo] = useState<any>(null);
  const [isFollowUpPatient, setIsFollowUpPatient] = useState(false);
  
  // WebSocket state (kept for compatibility but not used)

  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Temporary SOAP Notes queries
  const { data: temporaryNotesData = [] as any[], refetch: refetchTemporaryNotes } = useQuery<any[]>({
    queryKey: ['/api/temporary-soap-notes'],
    refetchInterval: 30000, // Refresh every 30 seconds to check for expired notes
  });

  // Get specific temporary note by ID
  const { data: currentTemporaryNote } = useQuery({
    queryKey: ['/api/temporary-soap-notes', temporaryNoteId],
    enabled: !!temporaryNoteId,
  });

  // Continuous recording queries and mutations
  const { data: activeContinuousSession, refetch: refetchActiveSession } = useQuery<any>({
    queryKey: ['/api/continuous-recording/active'],
    enabled: isContinuousMode,
  });

  // Get completed SOAP notes for current continuous session
  const { data: completedSoapNotes = [] as any[], refetch: refetchCompletedNotes } = useQuery<any[]>({
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

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setWebSpeechSupported(true);
      console.log('[WebSpeech] Speech Recognition API is supported');
    } else {
      console.log('[WebSpeech] Speech Recognition API is NOT supported in this browser');
    }
  }, []);

  // Initialize Web Speech API for real-time transcription
  const initializeWebSpeech = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('[WebSpeech] Speech Recognition not available');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      console.log('[WebSpeech] Speech recognition started');
      setIsWebSpeechActive(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          const trimmedTranscript = finalTranscript.trim();
          setWebSpeechTranscript(trimmedTranscript);
          webSpeechTranscriptRef.current = trimmedTranscript; // Update ref for callbacks
          setProgressiveTranscript(trimmedTranscript);
          setRealTimeTranscript(trimmedTranscript);
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim results for real-time feedback
      if (interimTranscript) {
        setRealTimeTranscript(finalTranscript + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[WebSpeech] Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // This is normal - just means no speech detected, will continue listening
      } else if (event.error === 'aborted') {
        // Recognition was aborted, this is expected when stopping
      } else {
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Transcription will continue when you speak.`,
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      console.log('[WebSpeech] Speech recognition ended');
      // Auto-restart if still recording (handles browser timeout)
      if (isRecordingRef.current && speechRecognitionRef.current) {
        console.log('[WebSpeech] Auto-restarting speech recognition');
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.log('[WebSpeech] Could not restart:', e);
        }
      } else {
        setIsWebSpeechActive(false);
      }
    };

    return recognition;
  }, [toast]);

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
      // Save final state before ending
      if (continuousSession?.session?.sessionId) {
        await savePageState(continuousSession.session.sessionId, currentPatientNumber);
      }
      
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

  // Temporary SOAP Notes mutations
  const createTemporaryNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/temporary-soap-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create temporary note');
      return response.json();
    },
    onSuccess: (data) => {
      setTemporaryNoteId(data.id);
      temporaryNoteIdRef.current = data.id;
      queryClient.invalidateQueries({ queryKey: ['/api/temporary-soap-notes'] });
      toast({
        title: "Temporary Note Created",
        description: "Your note will be automatically deleted after 24 hours",
      });
    },
  });

  const updateTemporaryNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/temporary-soap-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update temporary note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/temporary-soap-notes'] });
      setIsAutoSaving(false);
      setLastAutoSave(new Date());
    },
  });

  const deleteTemporaryNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/temporary-soap-notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete temporary note');
      return response.json();
    },
    onSuccess: () => {
      setTemporaryNoteId(null);
      temporaryNoteIdRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['/api/temporary-soap-notes'] });
      toast({
        title: "Note Deleted",
        description: "Temporary note has been deleted",
      });
    },
  });

  // Auto-save functionality for temporary notes
  useEffect(() => {
    if (temporaryNoteId && !isContinuousMode) {
      // Clear any existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set up new auto-save timer (every 30 seconds)
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTemporaryNote();
      }, 30000);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [soapSections, temporaryNoteId, isContinuousMode]);

  const autoSaveTemporaryNote = async () => {
    if (!temporaryNoteId) return;
    
    setIsAutoSaving(true);
    try {
      await updateTemporaryNoteMutation.mutateAsync({
        id: temporaryNoteId,
        data: {
          patientName: newPatientName || `Patient ${currentPatientNumber}`,
          subjective: soapSections.subjective,
          objective: soapSections.objective,
          assessment: soapSections.assessment,
          plan: soapSections.plan,
          transcriptionText: realTimeTranscript,
          recordingMode: isContinuousMode ? 'continuous' : 'standard',
        },
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Create new temporary note when starting recording
  const createTemporaryNote = async () => {
    if (isContinuousMode) return; // Don't create temporary notes in continuous mode
    
    const data = {
      patientName: newPatientName || `Patient ${currentPatientNumber}`,
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      transcript: '',
      recordingMode: 'standard',
    };
    
    const result = await createTemporaryNoteMutation.mutateAsync(data);
    return result.id;
  };

  // Navigate between temporary notes
  const navigateToNextNote = () => {
    const sortedNotes = [...temporaryNotesData].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const currentIndex = sortedNotes.findIndex(note => note.id === temporaryNoteId);
    if (currentIndex > 0) {
      const nextNote = sortedNotes[currentIndex - 1];
      loadTemporaryNote(nextNote);
    }
  };

  const navigateToPreviousNote = () => {
    const sortedNotes = [...temporaryNotesData].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const currentIndex = sortedNotes.findIndex(note => note.id === temporaryNoteId);
    if (currentIndex !== -1 && currentIndex < sortedNotes.length - 1) {
      const prevNote = sortedNotes[currentIndex + 1];
      loadTemporaryNote(prevNote);
    }
  };

  const loadTemporaryNote = (note: any) => {
    setTemporaryNoteId(note.id);
    temporaryNoteIdRef.current = note.id;
    setSoapSections({
      subjective: note.subjective || '',
      objective: note.objective || '',
      assessment: note.assessment || '',
      plan: note.plan || '',
    });
    setRealTimeTranscript(note.transcript || '');
    setNewPatientName(note.patientName || '');
    
    toast({
      title: "Note Loaded",
      description: `Loaded ${note.patientName || 'Untitled Note'}`,
    });
  };

  // Helper function to capture complete page state
  const capturePageState = () => {
    const pageState = {
      // SOAP Note Content
      soapSections,
      
      // Virtual Patient 3D Model Data
      virtualPatientData: {
        painLocations,
        shoulderPathology,
        spinalPathology,
        lowerLimbPathology,
        limbScales,
        modelConfig: {
          shoulderPathology,
          spinalPathology,
          lowerLimbPathology,
          limbScales
        }
      },
      
      // Clinical Decision Support Data
      clinicalDecisionData: {
        redFlags,
        differentials,
        guidelines
      },
      
      // AI Suggestions
      aiSuggestions,
      
      // PhysioGPT Chat History
      physioGPTData: {
        chatMessages,
        streamingMessage
      },
      
      // Evidence Articles
      evidenceArticles,
      
      // Patient Fingerprint Data
      patientFingerprint: transcript ? {
        transcript,
        identificationInfo,
        isFollowUpPatient
      } : null,
      
      // UI State (collapsed panels, selected tabs, etc.)
      uiState: {
        currentPatientNumber,
        patientName: newPatientName || `Patient ${currentPatientNumber}`,
        recordingTime,
        totalSessionTime
      },
      
      // Timestamp
      savedAt: new Date().toISOString()
    };
    
    return pageState;
  };

  // Helper function to save page state to server
  const savePageState = async (sessionId: string, patientSequence: number) => {
    try {
      const pageState = capturePageState();
      
      const response = await fetch(`/api/continuous-recording/${sessionId}/save-page-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientSequence,
          pageState
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save page state');
      }
      
      console.log(`✓ Page state saved for Patient ${patientSequence}`);
      setLastPageStateSave(new Date());
      return response.json();
    } catch (error) {
      console.error('Error saving page state:', error);
      toast({
        title: "Warning",
        description: "Failed to save page state. Your data may not be preserved.",
        variant: "destructive"
      });
    }
  };

  // Helper function to restore page state from server
  const restorePageState = async (sessionId: string, patientSequence: number) => {
    try {
      const response = await fetch(`/api/continuous-recording/${sessionId}/page-state/${patientSequence}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No saved state found for Patient ${patientSequence}`);
          return false;
        }
        throw new Error('Failed to retrieve page state');
      }
      
      const data = await response.json();
      const pageState = data.pageState;
      
      // Restore all state components
      if (pageState.soapSections) setSoapSections(pageState.soapSections);
      if (pageState.virtualPatientData) {
        setPainLocations(pageState.virtualPatientData.painLocations || []);
        setShoulderPathology(pageState.virtualPatientData.shoulderPathology || null);
        setSpinalPathology(pageState.virtualPatientData.spinalPathology || null);
        setLowerLimbPathology(pageState.virtualPatientData.lowerLimbPathology || null);
        setLimbScales(pageState.virtualPatientData.limbScales || {});
      }
      if (pageState.clinicalDecisionData) {
        setRedFlags(pageState.clinicalDecisionData.redFlags || []);
        setDifferentials(pageState.clinicalDecisionData.differentials || []);
        setGuidelines(pageState.clinicalDecisionData.guidelines || []);
      }
      if (pageState.aiSuggestions) setAiSuggestions(pageState.aiSuggestions);
      if (pageState.physioGPTData) {
        setChatMessages(pageState.physioGPTData.chatMessages || []);
        setStreamingMessage(pageState.physioGPTData.streamingMessage || null);
      }
      if (pageState.evidenceArticles) setEvidenceArticles(pageState.evidenceArticles);
      if (pageState.patientFingerprint) {
        setTranscript(pageState.patientFingerprint.transcript || '');
        setIdentificationInfo(pageState.patientFingerprint.identificationInfo || null);
        setIsFollowUpPatient(pageState.patientFingerprint.isFollowUpPatient || false);
      }
      
      console.log(`✓ Page state restored for Patient ${patientSequence}`);
      toast({
        title: "Patient Data Restored",
        description: `Loaded saved data for Patient ${patientSequence}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error restoring page state:', error);
      toast({
        title: "Warning",
        description: "Failed to restore previous patient data. Starting fresh.",
        variant: "destructive"
      });
      return false;
    }
  };

  const manualPatientSwitchMutation = useMutation({
    mutationFn: async ({ sessionId, newPatientName }: { sessionId: string, newPatientName?: string }) => {
      // Save current patient state before switching
      if (continuousSession?.session?.sessionId) {
        await savePageState(continuousSession.session.sessionId, currentPatientNumber);
      }
      
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
      
      // Clear other state for new patient
      setPainLocations([]);
      setRedFlags([]);
      setDifferentials([]);
      setGuidelines([]);
      setAiSuggestions([]);
      setEvidenceArticles([]);
      setChatMessages([]);
      setTranscript('');
      setIdentificationInfo(null);
      setIsFollowUpPatient(false);
      
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

  // Mutation for extracting patient presentation and viewing in skeleton
  const extractPresentationMutation = useMutation({
    mutationFn: async (soapNoteId: number) => {
      const response = await fetch('/api/extract-patient-presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ soapNoteId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract patient presentation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Presentation Extracted",
        description: `Extracted ${data.jointConstraints?.length || 0} joint constraints. Opening skeleton viewer...`,
        duration: 3000,
      });
      
      // Navigate to skeleton viewer with the presentation ID
      setTimeout(() => {
        setLocation(`/test-skeleton-new?presentationId=${data.id}`);
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Extraction Failed",
        description: "Failed to extract movement restrictions. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handler to view SOAP note in skeleton
  const handleViewInSkeleton = async () => {
    if (!temporaryNoteId) {
      toast({
        title: "No SOAP Note",
        description: "Please record or create a SOAP note first.",
        variant: "destructive",
      });
      return;
    }
    
    // First, we need to save/finalize the temporary note to get a permanent SOAP note ID
    // For now, use the temporary note ID directly since the extraction can work with it
    extractPresentationMutation.mutate(temporaryNoteId);
  };

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
      
      // Cleanup pain analysis interval
      if (painAnalysisIntervalRef.current) {
        clearInterval(painAnalysisIntervalRef.current);
      }
    };
  }, [mediaRecorder, stream]);

  // Track generated documents to prevent duplicates
  const [generatedDocuments, setGeneratedDocuments] = useState<Set<string>>(new Set());
  const [generatingDocuments, setGeneratingDocuments] = useState<Map<string, boolean>>(new Map());
  const lastDocumentCheck = useRef<string>('');

  // Real-time document trigger detection for Web Speech API transcription
  useEffect(() => {
    // Only check when we have meaningful transcript content and are recording
    if (!webSpeechTranscript || webSpeechTranscript.length < 10 || !isRecording) {
      return;
    }
    
    console.log('[DocTrigger] Checking transcript for document triggers:', webSpeechTranscript);
    
    // Document trigger patterns - check the full transcript
    const lowerText = webSpeechTranscript.toLowerCase();
    const docPatterns = [
      { pattern: /doctor['']?s?\s*(report|letter|note)/i, type: 'doctor_report', name: "Doctor's Report" },
      { pattern: /medical\s*certificate/i, type: 'time_off_work', name: 'Medical Certificate' },
    ];
    
    for (const { pattern, type, name } of docPatterns) {
      if (pattern.test(lowerText)) {
        console.log(`[DocTrigger] ✅ DETECTED: ${type} in transcript`);
        
        // Only show dialog if not already shown and not already generating
        if (!showDoctorReportDialog && !generatingDocuments.get(type) && !generatedDocuments.has(type)) {
          console.log(`[DocTrigger] 🚀 Showing dialog for ${type}`);
          
          setPendingDocumentType(type);
          setPendingDocumentName(name);
          setDoctorReportDetails(prev => ({
            ...prev,
            patientName: newPatientName || `Patient ${currentPatientNumber}`,
            diagnosis: soapSections.assessment?.split('.')[0] || ''
          }));
          setShowDoctorReportDialog(true);
          
          toast({
            title: `${name} Detected`,
            description: "Please fill in the required patient details to generate the document.",
          });
        }
        return;
      }
    }
  }, [webSpeechTranscript, isRecording, showDoctorReportDialog, generatingDocuments, generatedDocuments]);

  // Function to detect document generation triggers in transcript
  const detectDocumentTriggers = async (transcript: string, currentSoapSections?: any) => {
    if (!transcript || transcript.length < 20) {
      return;
    }
    
    // Only check new content since last check
    if (transcript === lastDocumentCheck.current) {
      return;
    }
    
    const newContent = transcript.slice(lastDocumentCheck.current.length);
    lastDocumentCheck.current = transcript;
    
    if (newContent.length < 10) {
      return; // Skip if new content is too short
    }
    
    const lowerNewContent = newContent.toLowerCase();
    
    // Document trigger patterns
    const documentTriggers = [
      { pattern: /doctor['']?s?\s*(report|letter|note)/i, type: 'doctor_report', name: "Doctor's Report" },
      { pattern: /medical\s*certificate/i, type: 'time_off_work', name: 'Medical Certificate' },
      { pattern: /time\s*off\s*work/i, type: 'time_off_work', name: 'Time Off Work Certificate' },
      { pattern: /sick\s*(note|leave|certificate)/i, type: 'time_off_work', name: 'Sick Leave Certificate' },
      { pattern: /ahtr\s*(form)?/i, type: 'ahtr', name: 'AHTR Form' },
      { pattern: /allied\s*health\s*treatment/i, type: 'ahtr', name: 'Allied Health Treatment Request' },
      { pattern: /discharge\s*(summary|letter|note)/i, type: 'discharge_summary', name: 'Discharge Summary' },
      { pattern: /imaging\s*(referral|request)/i, type: 'imaging_referral', name: 'Imaging Referral' },
      { pattern: /x-?ray\s*(referral|request)/i, type: 'imaging_referral', name: 'X-Ray Referral' },
      { pattern: /mri\s*(referral|request)/i, type: 'imaging_referral', name: 'MRI Referral' },
      { pattern: /insurance\s*(form|documentation|claim)/i, type: 'insurance', name: 'Insurance Documentation' },
      { pattern: /work\s*cover/i, type: 'insurance', name: 'WorkCover Documentation' },
      { pattern: /return\s*to\s*work/i, type: 'return_to_work', name: 'Return to Work Certificate' },
      { pattern: /fitness\s*for\s*work/i, type: 'return_to_work', name: 'Fitness for Work Certificate' },
      { pattern: /specialist\s*referral/i, type: 'specialist_referral', name: 'Specialist Referral' },
      { pattern: /progress\s*(report|note)/i, type: 'progress_report', name: 'Progress Report' },
    ];
    
    // Check each trigger pattern
    for (const { pattern, type, name } of documentTriggers) {
      if (pattern.test(lowerNewContent) && !generatedDocuments.has(type) && !generatingDocuments.get(type)) {
        console.log(`🎯 Automatic document trigger detected: ${type}`);
        
        // For doctor's report, show dialog to collect required details
        if (type === 'doctor_report' || type === 'time_off_work' || type === 'progress_report') {
          setPendingDocumentType(type);
          setPendingDocumentName(name);
          
          // Pre-fill with any extracted patient name from current session
          setDoctorReportDetails(prev => ({
            ...prev,
            patientName: newPatientName || `Patient ${currentPatientNumber}`,
            diagnosis: soapSections.assessment?.split('.')[0] || ''
          }));
          
          setShowDoctorReportDialog(true);
          
          toast({
            title: `${name} Detected`,
            description: "Please fill in the required patient details to generate the document.",
          });
          
          return; // Exit early - user will complete via dialog
        }
        
        // For other document types, generate immediately
        setGeneratingDocuments(prev => new Map(prev).set(type, true));
        
        toast({
          title: "Document Generation Started",
          description: `Automatically generating ${name} based on conversation`,
        });
        
        try {
          // Send HTTP request to trigger document generation
          const response = await fetch('/api/documents/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              documentType: type,
              sessionId: sessionId || `session-${Date.now()}`,
              soapData: currentSoapSections || {
                subjective: soapSections.subjective || '',
                objective: soapSections.objective || '',
                assessment: soapSections.assessment || '',
                plan: soapSections.plan || '',
              },
              transcript: transcript, // Send full transcript for proper context
              timestamp: new Date().toISOString()
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Document generation response:`, data);
            
            // Mark as generated
            setGeneratedDocuments(prev => new Set([...Array.from(prev), type]));
            
            // If document is already ready, show success immediately
            if (data.status === 'ready' && data.wordPath) {
              toast({
                title: "Document Ready",
                description: `${name} has been generated successfully!`,
              });
              
              // Still add to queue for display
              if ((window as any).addDocumentToQueue) {
                (window as any).addDocumentToQueue(data.documentId, type, name);
              }
            } else {
              // Add document to queue for polling if still generating
              if ((window as any).addDocumentToQueue) {
                (window as any).addDocumentToQueue(data.documentId, type, name);
              }
            }
          } else {
            console.error(`Failed to generate document: ${type}`);
            toast({
              title: "Document Generation Failed",
              description: `Could not generate ${name}. Please try using the manual buttons.`,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error(`Error generating document ${type}:`, error);
        } finally {
          // Remove from generating set
          setGeneratingDocuments(prev => {
            const newMap = new Map(prev);
            newMap.delete(type);
            return newMap;
          });
        }
      }
    }
  };
  
  // Function to generate document after user fills in details
  const generateDocumentWithDetails = async () => {
    if (!pendingDocumentType) return;
    
    setGeneratingDocuments(prev => new Map(prev).set(pendingDocumentType, true));
    setShowDoctorReportDialog(false);
    
    toast({
      title: "Document Generation Started",
      description: `Generating ${pendingDocumentName} with your details...`,
    });
    
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentType: pendingDocumentType,
          sessionId: sessionId || `session-${Date.now()}`,
          soapData: {
            subjective: soapSections.subjective || '',
            objective: soapSections.objective || '',
            assessment: soapSections.assessment || '',
            plan: soapSections.plan || '',
          },
          patientInfo: {
            name: doctorReportDetails.patientName,
            dateOfBirth: doctorReportDetails.dateOfBirth,
            referringDoctor: doctorReportDetails.referringDoctor,
            dateOfInjury: doctorReportDetails.dateOfInjury,
            diagnosis: doctorReportDetails.diagnosis,
            additionalNotes: doctorReportDetails.additionalNotes
          },
          transcript: realTimeTranscript,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Document generation response:`, data);
        
        setGeneratedDocuments(prev => new Set([...Array.from(prev), pendingDocumentType]));
        
        if (data.status === 'ready' && data.wordPath) {
          toast({
            title: "Document Ready",
            description: `${pendingDocumentName} has been generated successfully!`,
          });
        }
        
        if ((window as any).addDocumentToQueue) {
          (window as any).addDocumentToQueue(data.documentId, pendingDocumentType, pendingDocumentName);
        }
      } else {
        toast({
          title: "Document Generation Failed",
          description: `Could not generate ${pendingDocumentName}. Please try again.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error generating document:`, error);
      toast({
        title: "Error",
        description: "Failed to generate document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingDocuments(prev => {
        const newMap = new Map(prev);
        newMap.delete(pendingDocumentType);
        return newMap;
      });
      setPendingDocumentType('');
      setPendingDocumentName('');
    }
  };

  // Function to analyze pain locations from transcript
  const analyzePainLocations = async (transcript: string) => {
    if (!transcript || transcript.length < 10) {
      console.log('[PainAnalysis] Transcript too short:', transcript?.length || 0);
      return;
    }
    
    try {
      console.log('[PainAnalysis] Analyzing transcript:', transcript.substring(0, 100) + '...');
      setIsAnalyzingPain(true);
      
      const response = await fetch('/api/analyze-pain-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      
      if (response.ok) {
        const params = await response.json();
        console.log('[PainAnalysis] Received parameters:', params);
        
        // Ensure we have the expected structure
        if (params.painLocations && Array.isArray(params.painLocations)) {
          const locations = params.painLocations.map((loc: any) => {
            if (typeof loc === 'string') return loc;
            // Handle object format from API - convert bodyPart to readable location
            if (loc.bodyPart) {
              return loc.bodyPart.replace(/_/g, ' '); // Convert "right_shoulder" to "right shoulder"
            }
            return loc.location || 'unknown';
          });
          console.log('[PainAnalysis] Setting pain locations:', locations);
          setVirtualPatientParams({ painLocations: locations });
        } else {
          console.log('[PainAnalysis] No pain locations found in response');
        }
      } else {
        console.error('[PainAnalysis] API response not ok:', response.status);
      }
    } catch (error) {
      console.error('[PainAnalysis] Error:', error);
    } finally {
      setIsAnalyzingPain(false);
    }
  };

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

  // Monitor progressive transcript for pain analysis
  useEffect(() => {
    if (!isRecording || !progressiveTranscript || progressiveTranscript.length < 30) {
      console.log('[PainAnalysis] Skipping useEffect - recording:', isRecording, 'transcript length:', progressiveTranscript?.length || 0);
      return;
    }

    // Check if transcript has meaningful content (not just status messages)
    if (progressiveTranscript.includes("🎙️") || progressiveTranscript.includes("Processing")) {
      console.log('[PainAnalysis] Skipping useEffect - contains status messages');
      return;
    }

    // Trigger pain analysis when we have enough new content
    const shouldAnalyze = progressiveTranscript.length > 50 && 
                         progressiveTranscript.length % 200 < 50; // Analyze every ~200 characters
    
    if (shouldAnalyze) {
      console.log('[PainAnalysis] Triggered by progressive transcript update');
      analyzePainLocations(progressiveTranscript);
    } else {
      console.log('[PainAnalysis] Waiting for more content - length:', progressiveTranscript.length);
    }
  }, [progressiveTranscript, isRecording]);

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
      
      // Virtual patient updates now handled by polling
      const vpTimer = setTimeout(() => {
        // Pain analysis handled by polling in recording functions
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

  // Process browser-generated transcript (from Web Speech API) to generate SOAP notes with streaming
  const processWithBrowserTranscript = async (transcript: string) => {
    try {
      setIsGeneratingSoap(true);
      console.log('[WebSpeech] Processing browser transcript with streaming:', transcript.length, 'characters');
      setRealTimeTranscript(transcript);
      
      // Use streaming endpoint for instant feedback
      const response = await fetch('/api/generate-soap-streaming', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript,
          patientName: newPatientName || `Patient ${currentPatientNumber}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate SOAP from transcript');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let streamedContent = '';
      
      // Read the stream and update UI progressively
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                streamedContent = data.partial || streamedContent + data.chunk;
                
                // Parse and update SOAP sections progressively
                const partialSections = parseStreamedSoapContent(streamedContent);
                if (partialSections.subjective || partialSections.objective || 
                    partialSections.assessment || partialSections.plan) {
                  setSoapSections(prev => ({
                    ...prev,
                    ...partialSections
                  }));
                }
              }
              
              if (data.done && data.soapNote) {
                console.log('[WebSpeech] Streaming complete, final SOAP:', data.soapNote);
                setSoapSections(data.soapNote);
                
                // Update temporary note with the generated SOAP sections
                const noteIdToUpdate = temporaryNoteIdRef.current || temporaryNoteId;
                if (noteIdToUpdate && !isContinuousMode) {
                  console.log('Updating temporary note ID:', noteIdToUpdate, 'with SOAP content');
                  const updateData = {
                    subjective: data.soapNote.subjective || '',
                    objective: data.soapNote.objective || '',
                    assessment: data.soapNote.assessment || '',
                    plan: data.soapNote.plan || '',
                    transcriptionText: transcript,
                    sessionDuration: recordingTime * 1000,
                    patientName: newPatientName || `Patient ${currentPatientNumber}`
                  };
                  updateTemporaryNoteMutation.mutate({ id: noteIdToUpdate, data: updateData });
                }
                
                toast({
                  title: "SOAP Notes Generated",
                  description: `Successfully processed ${transcript.length} characters with real-time streaming.`,
                });
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing browser transcript:', error);
      
      // Fallback SOAP sections
      setSoapSections({
        subjective: transcript || "Audio recording completed - review transcript above.",
        objective: "Physical examination findings to be documented...",
        assessment: "Clinical assessment to be completed...",
        plan: "Treatment plan to be developed..."
      });
      
      toast({
        title: "SOAP Generation Issue",
        description: "Your transcription was captured. AI enhancement is temporarily unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  // Helper function to parse streamed SOAP content progressively
  const parseStreamedSoapContent = (content: string) => {
    const sections: any = {};
    
    const subjectiveMatch = content.match(/\*\*SUBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*OBJECTIVE:|$)/i);
    const objectiveMatch = content.match(/\*\*OBJECTIVE:\*\*\s*([\s\S]*?)(?=\*\*ASSESSMENT:|$)/i);
    const assessmentMatch = content.match(/\*\*ASSESSMENT:\*\*\s*([\s\S]*?)(?=\*\*PLAN:|$)/i);
    const planMatch = content.match(/\*\*PLAN:\*\*\s*([\s\S]*?)$/i);
    
    if (subjectiveMatch?.[1]?.trim()) sections.subjective = subjectiveMatch[1].trim();
    if (objectiveMatch?.[1]?.trim()) sections.objective = objectiveMatch[1].trim();
    if (assessmentMatch?.[1]?.trim()) sections.assessment = assessmentMatch[1].trim();
    if (planMatch?.[1]?.trim()) sections.plan = planMatch[1].trim();
    
    return sections;
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
      const MAX_CHUNK_SIZE_MB = 20; // Increased chunk size - OpenAI Whisper supports up to 25MB
      
      // If file is too large, process in chunks
      if (fileSizeMB > MAX_CHUNK_SIZE_MB) {
        setRealTimeTranscript("Processing long recording in segments for optimal performance...");
        
        // Calculate chunk size and number of chunks
        const chunkSizeBytes = MAX_CHUNK_SIZE_MB * 1024 * 1024;
        const numberOfChunks = Math.ceil(audioBlob.size / chunkSizeBytes);
        
        console.log(`Splitting ${fileSizeMB.toFixed(2)}MB audio into ${numberOfChunks} chunks`);
        console.log(`Audio type: ${audioBlob.type}, Chunk size: ${MAX_CHUNK_SIZE_MB}MB`);
        
        // Show detailed progress to user
        toast({
          title: "Processing Long Recording",
          description: `Your ${Math.round(fileSizeMB)}MB recording will be processed in ${numberOfChunks} segments for optimal quality.`,
        });
        
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
            // Handle iOS formats properly
            const detectedMimeType = audioBlob.type || 'audio/webm';
            const fileExtension = detectedMimeType.includes('mp4') ? 'mp4' : 
                              detectedMimeType.includes('mpeg') ? 'mp3' : 
                              detectedMimeType.includes('wav') ? 'wav' : 'webm';
            const chunkFile = new File([chunk], `chunk_${i}.${fileExtension}`, { type: detectedMimeType });
            formData.append('audio', chunkFile);
            formData.append('chunkIndex', i.toString());
            formData.append('totalChunks', numberOfChunks.toString());
            
            const response = await fetch('/api/transcribe-chunk', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Failed to transcribe chunk ${i + 1}:`, errorText);
              // Show a more informative message
              setRealTimeTranscript(`Processing segment ${i + 1} of ${numberOfChunks}... (retrying)`);
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
        // Create a proper File object with the correct MIME type
        // Detect the actual MIME type from the blob
        const detectedMimeType = audioBlob.type || 'audio/webm';
        const fileExtension = detectedMimeType.includes('mp4') ? 'mp4' : 
                            detectedMimeType.includes('mpeg') ? 'mp3' : 
                            detectedMimeType.includes('wav') ? 'wav' : 'webm';
        const audioFile = new File([audioBlob], `recording.${fileExtension}`, { type: detectedMimeType });
        formData.append('audio', audioFile);
        console.log('Sending audio file with MIME type:', detectedMimeType);
        
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
          
          // Update temporary note with the generated SOAP sections
          const noteIdToUpdate = temporaryNoteIdRef.current || temporaryNoteId;
          if (noteIdToUpdate && !isContinuousMode) {
            console.log('Updating temporary note ID:', noteIdToUpdate, 'with SOAP content');
            const updateData = {
              subjective: data.soapNote.subjective || '',
              objective: data.soapNote.objective || '',
              assessment: data.soapNote.assessment || '',
              plan: data.soapNote.plan || '',
              transcriptionText: transcript,
              sessionDuration: recordingTime * 1000, // Convert to milliseconds
              patientName: data.soapNote.patientName || newPatientName || `Patient ${currentPatientNumber}`
            };
            updateTemporaryNoteMutation.mutate({ id: noteIdToUpdate, data: updateData });
          } else {
            console.warn('Cannot update note - temporaryNoteId:', temporaryNoteId, 'isContinuousMode:', isContinuousMode);
          }
        } else if (transcript && transcript.length > 10) {
          // Generate SOAP sections from transcript if not provided
          await generateSoapSections(transcript);
        } else {
          // Fallback for short/empty transcripts
          const fallbackSections = {
            subjective: transcript || "Patient consultation recorded.",
            objective: "Physical examination findings to be documented...",
            assessment: "Clinical assessment based on consultation...",
            plan: "Treatment plan to be developed..."
          };
          setSoapSections(fallbackSections);
          setIsGeneratingSoap(false);
          
          // Update temporary note even with fallback sections
          const noteIdToUpdate = temporaryNoteIdRef.current || temporaryNoteId;
          if (noteIdToUpdate && !isContinuousMode) {
            console.log('Updating temporary note ID:', noteIdToUpdate, 'with fallback SOAP content');
            const updateData = {
              subjective: fallbackSections.subjective || '',
              objective: fallbackSections.objective || '',
              assessment: fallbackSections.assessment || '',
              plan: fallbackSections.plan || '',
              transcriptionText: transcript || '',
              sessionDuration: recordingTime * 1000,
              patientName: newPatientName || `Patient ${currentPatientNumber}`
            };
            updateTemporaryNoteMutation.mutate({ id: noteIdToUpdate, data: updateData });
          } else {
            console.warn('Cannot update note with fallback - temporaryNoteId:', temporaryNoteId, 'isContinuousMode:', isContinuousMode);
          }
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
      // Handle iOS formats properly
      const detectedMimeType = audioBlob.type || 'audio/webm';
      const fileExtension = detectedMimeType.includes('mp4') ? 'mp4' : 
                          detectedMimeType.includes('mpeg') ? 'mp3' : 
                          detectedMimeType.includes('wav') ? 'wav' : 'webm';
      const audioFile = new File([audioBlob], `chunk.${fileExtension}`, { type: detectedMimeType });
      formData.append('audio', audioFile);
      formData.append('progressiveTranscript', progressiveTranscript); // Send accumulated transcript for context
      formData.append('isCompleteAudio', 'false'); // Flag to indicate this is just a 30-second chunk
      // Send current SOAP sections so server can enhance rather than replace
      formData.append('existingSoapSections', JSON.stringify(soapSections));
      
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
          
          // Trigger pain analysis immediately for new content
          console.log('[PainAnalysis] New transcript chunk received, analyzing for pain locations...');
          analyzePainLocations(updatedTranscript);
          
          // Update SOAP sections if provided - the server already handles merging
          if (data.soapSections) {
            console.log('Real-time SOAP update received - merged sections from server');
            // Server already provides merged/enhanced sections, so we can replace
            setSoapSections({
              subjective: data.soapSections.subjective || '',
              objective: data.soapSections.objective || '',
              assessment: data.soapSections.assessment || '',
              plan: data.soapSections.plan || ''
            });
            
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
          
          // Check for document generation triggers in the transcript
          // Pass the latest SOAP sections if available
          detectDocumentTriggers(updatedTranscript, data.soapSections || soapSections);
          
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
    } catch (error: any) {
      console.log('Real-time processing error:', error.message);
      // Don't show errors for intermediate processing - it's optional
    } finally {
      setIsProcessingChunk(false);
    }
  };

  // Auto-save page state during continuous recording
  useEffect(() => {
    if (!isContinuousMode || !isRecording || !continuousSession?.session?.sessionId) {
      return;
    }
    
    // Auto-save every 2 minutes during recording
    const autoSaveInterval = setInterval(async () => {
      console.log(`⏱️ Auto-saving page state for Patient ${currentPatientNumber}...`);
      await savePageState(continuousSession.session.sessionId, currentPatientNumber);
    }, 120000); // 2 minutes
    
    return () => clearInterval(autoSaveInterval);
  }, [isContinuousMode, isRecording, continuousSession, currentPatientNumber]);

  // Continuous recording helper functions



  // Start audio recording for up to 45-minute sessions using progressive chunking
  const startRecording = async () => {
    try {
      // Reset document generation tracker for new session
      setGeneratedDocuments(new Set());
      lastDocumentCheck.current = '';
      
      // CRITICAL: Clear any existing temporary note ID to prevent overwriting
      setTemporaryNoteId(null);
      
      // Create temporary note if in standard mode
      if (!isContinuousMode) {
        // Generate a unique session ID for this recording
        const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        
        const noteData = {
          sessionId: newSessionId,
          patientName: newPatientName || `Patient ${currentPatientNumber}`,
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          transcript: '',
          sessionDuration: 0,
          recordingMode: 'standard',
          noteOrder: 1
        };
        
        try {
          const result = await createTemporaryNoteMutation.mutateAsync(noteData);
          console.log('Temporary note created with ID:', result.id);
          // Immediately set the temporary note ID so it's available for transcription
          setTemporaryNoteId(result.id);
          // Store it in a ref as well for immediate access in callbacks
          temporaryNoteIdRef.current = result.id;
        } catch (error) {
          console.error('Failed to create temporary note:', error);
          // Continue with recording even if temp note fails
        }
      }
      
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
      
      // Detect iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      // Create MediaRecorder with iOS-compatible settings
      let mimeType = 'audio/webm';
      let recorder: MediaRecorder;
      
      if (isIOS) {
        // iOS Safari doesn't support webm, use mp4 instead
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/mpeg';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
        
        // Create recorder without codec specification for iOS
        recorder = new MediaRecorder(mediaStream, {
          mimeType: mimeType,
          audioBitsPerSecond: 64000
        });
      } else {
        // Non-iOS devices
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
        
        recorder = new MediaRecorder(mediaStream, {
          mimeType: mimeType,
          audioBitsPerSecond: 64000
        });
      }
      
      console.log('Using MIME type:', mimeType, 'iOS device:', isIOS);
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
      
      // Function to start a new 30-second recording cycle
      const startNewRecordingCycle = () => {
        // Create a new MediaRecorder for this 30-second segment
        const cycleRecorder = new MediaRecorder(mediaStream, { mimeType });
        const cycleChunks: BlobPart[] = [];
        
        cycleRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            cycleChunks.push(e.data);
          }
        };
        
        cycleRecorder.onstop = () => {
          if (cycleChunks.length > 0 && isRecordingRef.current) {
            // Create a complete, valid audio file from this cycle's chunks
            const cycleBlob = new Blob(cycleChunks, { type: mimeType });
            console.log(`Processing 30-second segment: ${cycleBlob.size} bytes with MIME type: ${mimeType}`);
            
            // Process for real-time SOAP generation
            processIntermediateAudio(cycleBlob);
          }
        };
        
        // Start recording for this cycle
        cycleRecorder.start();
        
        // Stop after 30 seconds and start a new cycle
        setTimeout(() => {
          if (cycleRecorder.state === 'recording') {
            cycleRecorder.stop();
            // Start next cycle if still recording
            if (isRecordingRef.current) {
              startNewRecordingCycle();
            }
          }
        }, 30000);
      };
      
      // Start the first 30-second recording cycle
      startNewRecordingCycle();
      
      // Quick visual feedback interval (every 5 seconds)
      // Pain analysis now handled by polling
      const quickUpdateInterval = setInterval(() => {
        // Visual updates handled by pain analysis polling
      }, 5000); // 5 seconds
      
      recorder.onstop = () => {
        // Clear the chunk processing interval
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
        }
        // Clear the quick update interval
        clearInterval(quickUpdateInterval);
        
        const blob = new Blob(chunks, { type: mimeType }); // Use detected MIME type
        setAudioBlob(blob);
        mediaStream.getTracks().forEach(track => track.stop());
        
        // Stop Web Speech API if running
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {
            console.log('[WebSpeech] Error stopping:', e);
          }
          speechRecognitionRef.current = null;
        }
        
        // Use browser transcript from ref (captures current value at stop time)
        const browserTranscript = webSpeechTranscriptRef.current;
        console.log('[WebSpeech] onstop - Browser transcript available:', browserTranscript?.length || 0, 'characters');
        
        if (browserTranscript && browserTranscript.length > 10) {
          console.log('[WebSpeech] Using browser transcript for SOAP generation');
          processWithBrowserTranscript(browserTranscript);
        } else if (blob.size > 0) {
          // Fallback to audio processing if no browser transcript
          console.log(`[WebSpeech] No browser transcript, falling back to audio processing: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
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
      
      // Initialize and start Web Speech API for real-time transcription
      setWebSpeechTranscript(""); // Clear previous transcript
      webSpeechTranscriptRef.current = ""; // Clear ref as well
      if (webSpeechSupported) {
        const recognition = initializeWebSpeech();
        if (recognition) {
          speechRecognitionRef.current = recognition;
          try {
            recognition.start();
            console.log('[WebSpeech] Started real-time transcription');
            setRealTimeTranscript("🎙️ Recording... Speak now - your words will appear here in real-time.");
          } catch (e) {
            console.log('[WebSpeech] Could not start:', e);
            setRealTimeTranscript("🎙️ Recording in progress... Real-time transcription starting...");
          }
        } else {
          setRealTimeTranscript("🎙️ Recording in progress... Speech recognition not available.");
        }
      } else {
        setRealTimeTranscript("🎙️ Recording in progress... Browser speech recognition not supported.");
      }
      setProgressiveTranscript(""); // Reset progressive transcript for new recording
      
      console.log('Recording started at:', startTime);
      
      // Start recording - collect data every second for stability
      recorder.start(1000);
      
      toast({
        title: "Recording Started",
        description: `Real-time SOAP generation active. Notes will update every 30 seconds during your ${isContinuousMode ? "continuous" : ""} recording session.`,
      });
      
      // Start pain analysis polling when recording starts
      if (userData?.id) {
        // Clear any existing polling interval
        if (painAnalysisIntervalRef.current) {
          clearInterval(painAnalysisIntervalRef.current);
        }
        
        const newSessionId = continuousSession?.sessionId || `session-${Date.now()}`;
        setSessionId(newSessionId);
        
        // Start polling for pain analysis every 10 seconds
        console.log('[PainAnalysis] Starting pain analysis polling');
        
        // Track last analyzed transcript to avoid duplicate analysis
        let lastAnalyzedTranscript = "";
        
        // Set up polling interval
        const pollInterval = setInterval(() => {
          if (!isRecordingRef.current) {
            clearInterval(pollInterval);
            return;
          }
          
          // Get current transcript from progressive transcript (which contains actual speech)
          const currentTranscript = progressiveTranscript || "";
          
          // Check if we have actual transcript content (not just status messages)
          // and if the transcript has changed significantly since last analysis
          if (currentTranscript && 
              currentTranscript.length > 20 && 
              !currentTranscript.includes("🎙️") &&
              currentTranscript !== lastAnalyzedTranscript &&
              currentTranscript.length > lastAnalyzedTranscript.length + 50) {
            console.log('[PainAnalysis] Analyzing transcript:', currentTranscript.substring(0, 100) + '...');
            analyzePainLocations(currentTranscript);
            lastAnalyzedTranscript = currentTranscript;
          } else {
            console.log('[PainAnalysis] Waiting for new transcript data...', currentTranscript.length);
          }
        }, 10000); // Poll every 10 seconds
        
        painAnalysisIntervalRef.current = pollInterval;
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
      
      // Stop pain analysis polling
      if (painAnalysisIntervalRef.current) {
        clearInterval(painAnalysisIntervalRef.current);
        painAnalysisIntervalRef.current = null;
      }
      
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
      
      // Stop Web Speech API (will be stopped in onstop handler, but mark as stopped)
      setIsWebSpeechActive(false);
      
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
      
      // Stop pain analysis polling
      if (painAnalysisIntervalRef.current) {
        clearInterval(painAnalysisIntervalRef.current);
        painAnalysisIntervalRef.current = null;
      }
      
      // Check if we have a browser transcript
      const hasTranscript = webSpeechTranscript && webSpeechTranscript.length > 10;
      setRealTimeTranscript(hasTranscript 
        ? "Processing your transcript with AI..." 
        : "Processing audio recording...");
      
      toast({
        title: "Recording Stopped",
        description: hasTranscript 
          ? "Processing your real-time transcript with AI."
          : "Processing your audio. This may take a moment for longer recordings.",
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
      
      const generatedSections = {
        subjective: data.subjective || transcript.trim(),
        objective: data.objective || "Physical examination findings to be documented...",
        assessment: data.assessment || "Clinical assessment based on subjective findings...",
        plan: data.plan || "Treatment plan to be developed..."
      };
      
      setSoapSections(generatedSections);
      
      setIsGeneratingSoap(false);
      
      // Update temporary note with generated SOAP sections
      const noteIdToUpdate = temporaryNoteIdRef.current || temporaryNoteId;
      if (noteIdToUpdate && !isContinuousMode) {
        console.log('Updating temporary note ID:', noteIdToUpdate, 'with generated SOAP sections');
        const updateData = {
          subjective: generatedSections.subjective || '',
          objective: generatedSections.objective || '',
          assessment: generatedSections.assessment || '',
          plan: generatedSections.plan || '',
          transcriptionText: transcript,
          sessionDuration: recordingTime * 1000,
          patientName: data.patientName || newPatientName || `Patient ${currentPatientNumber}`
        };
        updateTemporaryNoteMutation.mutate({ id: noteIdToUpdate, data: updateData });
      } else {
        console.warn('Cannot update note with generated sections - temporaryNoteId:', temporaryNoteId, 'isContinuousMode:', isContinuousMode);
      }
      
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
  
  // Filter and sort temporary notes for sidebar
  const getFilteredAndSortedNotes = () => {
    if (!temporaryNotesData) return [];
    
    let filteredNotes = [...temporaryNotesData];
    
    // Apply search filter
    if (sidebarSearchQuery) {
      const query = sidebarSearchQuery.toLowerCase();
      filteredNotes = filteredNotes.filter((note: any) => {
        const patientName = (note.patientName || 'Unnamed Patient').toLowerCase();
        const subjective = (note.soapSections?.subjective || '').toLowerCase();
        const createdDate = new Date(note.createdAt).toLocaleString().toLowerCase();
        
        return patientName.includes(query) || 
               subjective.includes(query) || 
               createdDate.includes(query);
      });
    }
    
    // Apply sorting
    filteredNotes.sort((a: any, b: any) => {
      switch (sidebarSortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'expiring':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        default:
          return 0;
      }
    });
    
    return filteredNotes;
  };
  
  // Load a note from the sidebar
  const loadNoteFromSidebar = (note: any) => {
    // Load SOAP sections directly from note fields (not nested under soapSections)
    setSoapSections({
      subjective: note.subjective || '',
      objective: note.objective || '',
      assessment: note.assessment || '',
      plan: note.plan || ''
    });
    
    // Load transcript and other fields
    setRealTimeTranscript(note.transcriptionText || note.transcript || '');
    setTemporaryNoteId(note.id);
    
    // If there's a patient name, update it
    if (note.patientName) {
      setNewPatientName(note.patientName);
    }
    
    toast({
      title: "Note Loaded",
      description: `Loaded ${note.patientName || 'Patient'} note from ${new Date(note.createdAt).toLocaleString()}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex">
      {/* Left Sidebar for Saved Notes */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-12'} transition-all duration-300 bg-white border-r border-gray-200 shadow-lg flex flex-col h-screen sticky top-0`}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Saved Notes</h2>
                  {temporaryNotesData && temporaryNotesData.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {temporaryNotesData.length}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-blue-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 hover:bg-blue-100 mx-auto"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
          </div>
          
          {/* Search and Filter Controls */}
          {isSidebarOpen && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  className="pl-8 pr-2 h-8 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-gray-500" />
                <select
                  value={sidebarSortBy}
                  onChange={(e) => setSidebarSortBy(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1 flex-1"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="expiring">Expiring Soon</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar Content - Notes List */}
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto p-3">
            {temporaryNotesData && temporaryNotesData.length > 0 ? (
              <div className="space-y-2">
                {getFilteredAndSortedNotes().map((note: any) => {
                  const expiresAt = new Date(note.expiresAt);
                  const now = new Date();
                  const hoursLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
                  const isExpiringSoon = hoursLeft < 6;
                  const isActive = note.id === temporaryNoteId;
                  
                  return (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        isActive 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => loadNoteFromSidebar(note)}
                    >
                      {/* Note Header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-600" />
                          <span className="font-medium text-sm text-gray-900 truncate max-w-[140px]">
                            {note.patientName || 'Unnamed Patient'}
                          </span>
                        </div>
                        {isActive && (
                          <Badge className="text-xs py-0 px-1 bg-green-100 text-green-700">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      {/* Time Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className={`flex items-center gap-1 ${isExpiringSoon ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{hoursLeft}h left</span>
                        </div>
                      </div>
                      
                      {/* Preview */}
                      {note.subjective && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {note.subjective}
                        </p>
                      )}
                      
                      {/* Duration Badge */}
                      {note.sessionDuration && (
                        <div className="mt-2 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatTime(Math.floor(note.sessionDuration / 1000))}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {getFilteredAndSortedNotes().length === 0 && sidebarSearchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notes found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No saved notes</p>
                <p className="text-xs mt-1">Start recording to create notes</p>
              </div>
            )}
          </div>
        )}
        
        {/* Sidebar Footer - Storage Notice */}
        {isSidebarOpen && temporaryNotesData && temporaryNotesData.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">24-hour storage</p>
                <p className="mt-1">Notes auto-delete after 24 hours</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Collapsed Sidebar Indicator */}
        {!isSidebarOpen && temporaryNotesData && temporaryNotesData.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="transform -rotate-90 whitespace-nowrap text-xs text-gray-500 font-medium">
              {temporaryNotesData.length} Notes
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          
          {/* Conditionally render based on mode */}
          {useStreamingMode ? (
            <StreamingSOAPNotes />
          ) : (
            <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enhanced SOAP Notes
            </h1>
            <p className="text-gray-600">
              Live AI assistance for clinical documentation and decision support
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                AI Assistant: {isRecording ? 'Active' : 'Ready'}
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
                              {completedSoapNotes.map((note: any, index: number) => (
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



            {/* Recording + Side Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recording Section */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4" />
                    Audio Recording
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRecording && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-red-600">{formatTime(recordingTime)}</span>
                          <Badge variant="destructive" className="animate-pulse text-xs py-0 h-5">Recording...</Badge>
                        </div>
                      )}
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="sm"
                        className="w-full"
                      >
                        {isRecording ? (
                          isContinuousMode ? "Pause Recording" : "Stop Recording"
                        ) : (
                          isContinuousMode && continuousSession ? "Continue Recording" : "Start Recording"
                        )}
                      </Button>
                    </div>
                  </div>
                  {realTimeTranscript && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-left">
                      <h4 className="font-semibold mb-0.5 text-xs text-gray-600">Live Transcript:</h4>
                      <div className="max-h-12 overflow-y-auto text-xs text-gray-700 leading-relaxed border border-gray-200 rounded p-1.5 bg-white">
                        {realTimeTranscript}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin Tasks + AI Suggestions stacked beside recording */}
              <div className="space-y-4">
                {/* Admin Tasks */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      Admin Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-blue-50" onClick={generateDoctorReport}>
                        <FileText className="w-3 h-3 mr-1.5 shrink-0" />
                        Doctor Report
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-green-50" onClick={generateAHTR}>
                        <FileCheck className="w-3 h-3 mr-1.5 shrink-0" />
                        AHTR PDF
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-purple-50" onClick={generateImagingReferral}>
                        <Shield className="w-3 h-3 mr-1.5 shrink-0" />
                        Imaging Referral
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-indigo-50" onClick={generateDischargeSummary}>
                        <FileCheck className="w-3 h-3 mr-1.5 shrink-0" />
                        Discharge Summary
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-emerald-50" onClick={generateProgressReport}>
                        <BarChart3 className="w-3 h-3 mr-1.5 shrink-0" />
                        Progress Report
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-cyan-50" onClick={generateSpecialistReferral}>
                        <Users className="w-3 h-3 mr-1.5 shrink-0" />
                        Specialist Referral
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-lime-50" onClick={generateReturnToWork}>
                        <Briefcase className="w-3 h-3 mr-1.5 shrink-0" />
                        Return to Work
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-amber-50" onClick={generateTimeOffWork}>
                        <Clock className="w-3 h-3 mr-1.5 shrink-0" />
                        Time Off Work
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-yellow-50" onClick={generateInsuranceDocumentation}>
                        <DollarSign className="w-3 h-3 mr-1.5 shrink-0" />
                        Insurance Docs
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-8 hover:bg-rose-50" onClick={() => setShowForumShareDialog(true)} disabled={!soapSections.subjective && !soapSections.objective && !soapSections.assessment && !soapSections.plan}>
                        <Users className="w-3 h-3 mr-1.5 shrink-0" />
                        Share to Forum
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Suggestions - compact */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        AI Suggestions
                      </div>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => generateAISuggestions()} disabled={isGeneratingSuggestions}>
                        {isGeneratingSuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {isGeneratingSuggestions ? (
                          <div className="text-center py-3">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                            <p className="text-xs text-gray-600">Analyzing...</p>
                          </div>
                        ) : aiSuggestions.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-3">
                            AI suggestions appear as you document
                          </p>
                        ) : (
                          aiSuggestions.map((suggestion) => (
                            <div key={suggestion.id} className="p-2 border rounded-lg">
                              <div className="flex items-start justify-between mb-1">
                                <Badge variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                  {suggestion.type}
                                </Badge>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => acceptSuggestion(suggestion)}>
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs mb-1">{suggestion.suggestion}</p>
                              {suggestion.reasoning && <p className="text-xs text-gray-500">{suggestion.reasoning}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

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
                
                <div className="flex gap-2 mt-4 flex-wrap">
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
                  <Button 
                    variant="secondary" 
                    onClick={handleViewInSkeleton}
                    disabled={extractPresentationMutation.isPending || !temporaryNoteId}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                    data-testid="button-view-in-skeleton"
                  >
                    <Bone className="w-4 h-4" />
                    {extractPresentationMutation.isPending ? "Extracting..." : "View in Skeleton"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Completed SOAP Notes from Continuous Session */}
            {/* Patient State Navigator for Continuous Recording */}
            {isContinuousMode && continuousSession?.session?.sessionId && (
              <Card className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-violet-900 flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" />
                    Patient Session Navigator
                  </h3>
                  <Badge variant="secondary" className="bg-violet-100 text-violet-800">
                    {completedSoapNotes.length + 1} Patients Total
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Previous patients */}
                  {completedSoapNotes.map((note: any, index: number) => (
                    <Button
                      key={note.id}
                      variant="outline"
                      size="sm"
                      className="border-violet-300 hover:bg-violet-100"
                      onClick={async () => {
                        // Save current state first
                        await savePageState(continuousSession.session.sessionId, currentPatientNumber);
                        // Restore selected patient state
                        const restored = await restorePageState(
                          continuousSession.session.sessionId, 
                          note.patientSequenceNumber || index + 1
                        );
                        if (restored) {
                          setCurrentPatientNumber(note.patientSequenceNumber || index + 1);
                        }
                      }}
                    >
                      <User className="w-4 h-4 mr-1" />
                      Patient {note.patientSequenceNumber || index + 1}
                      {note.patientName && ` (${note.patientName})`}
                    </Button>
                  ))}
                  {/* Current patient */}
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700"
                    disabled
                  >
                    <User className="w-4 h-4 mr-1" />
                    Patient {currentPatientNumber} (Current)
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-violet-700">
                    Click on any patient to restore their complete session data.
                  </div>
                  <div className="flex items-center gap-3">
                    {lastPageStateSave && (
                      <span className="text-xs text-violet-600">
                        Last saved: {lastPageStateSave.toLocaleTimeString()}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-violet-300 hover:bg-violet-100"
                      onClick={async () => {
                        if (continuousSession?.session?.sessionId) {
                          await savePageState(continuousSession.session.sessionId, currentPatientNumber);
                          toast({
                            title: "State Saved",
                            description: `Patient ${currentPatientNumber} data saved successfully.`,
                          });
                        }
                      }}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Now
                    </Button>
                  </div>
                </div>
              </Card>
            )}

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
                    {completedSoapNotes.map((note: any, index: number) => (
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
            {/* Clinical Decision Support System - Moved to top */}
            <ClinicalDecisionSupport
              transcript={realTimeTranscript}
              soapSections={soapSections}
              isRecording={isRecording}
            />

            {/* Enhanced Differential Diagnosis */}
            <EnhancedDifferentialDisplay
              soapSections={soapSections}
              transcript={realTimeTranscript}
              onDifferentialSelect={(diff) => {
                setSoapSections(prev => ({
                  ...prev,
                  assessment: prev.assessment 
                    ? `${prev.assessment}\n\nWorking Diagnosis: ${diff.conditionName} (${diff.probabilityScore}% probability)\n${diff.evidenceSummary}`
                    : `Working Diagnosis: ${diff.conditionName} (${diff.probabilityScore}% probability)\n${diff.evidenceSummary}`
                }));
              }}
            />

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
              webSocket={null}
              isRecording={isRecording}
              className="mb-6"
              parameters={virtualPatientParams}
            />

            {/* Real-Time Document Generation Queue */}
            <RealtimeDocumentQueue
              sessionId={sessionId || ''}
              isRecording={isRecording}
              pollInterval={3000}
            />

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

        {/* Floating Document Generation Button - Always visible on right side */}
        {!showDoctorReportDialog && (
          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
            <Button
              onClick={() => {
                setPendingDocumentType('doctor_report');
                setPendingDocumentName("Doctor's Report");
                setShowDoctorReportDialog(true);
              }}
              className="rounded-l-lg rounded-r-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-3 py-6 flex flex-col items-center gap-1"
              data-testid="button-open-doctor-panel"
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Documents</span>
            </Button>
          </div>
        )}

        {/* Doctor's Report Side Panel - Slides in from right, keeps SOAP notes visible */}
        <Sheet open={showDoctorReportDialog} onOpenChange={setShowDoctorReportDialog}>
          <SheetContent side="right" className="w-[400px] sm:w-[450px] overflow-y-auto">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                {pendingDocumentName || "Doctor's Report"}
              </SheetTitle>
              <SheetDescription>
                Fill in patient details to generate the document. Your SOAP notes remain visible.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Voice trigger detected!</span> Complete the required fields below to generate your {pendingDocumentName?.toLowerCase() || "doctor's report"}.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={doctorReportDetails.patientName}
                    onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Enter patient's full name"
                    data-testid="input-patient-name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={doctorReportDetails.dateOfBirth}
                      onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      data-testid="input-dob"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Date of Injury
                    </label>
                    <Input
                      type="date"
                      value={doctorReportDetails.dateOfInjury}
                      onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, dateOfInjury: e.target.value }))}
                      data-testid="input-injury-date"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Referring Doctor
                  </label>
                  <Input
                    value={doctorReportDetails.referringDoctor}
                    onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, referringDoctor: e.target.value }))}
                    placeholder="Dr. Smith"
                    data-testid="input-referring-doctor"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Diagnosis
                  </label>
                  <Input
                    value={doctorReportDetails.diagnosis}
                    onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder="Primary diagnosis"
                    data-testid="input-diagnosis"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Additional Notes
                  </label>
                  <textarea
                    value={doctorReportDetails.additionalNotes}
                    onChange={(e) => setDoctorReportDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    placeholder="Any additional information to include..."
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    data-testid="input-additional-notes"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDoctorReportDialog(false);
                    setPendingDocumentType('');
                    setPendingDocumentName('');
                  }}
                  data-testid="button-cancel-report"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={generateDocumentWithDetails}
                  disabled={!doctorReportDetails.patientName || generatingDocuments.get(pendingDocumentType)}
                  data-testid="button-generate-report"
                >
                  {generatingDocuments.get(pendingDocumentType) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

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
                onMotionDataCapture={(data: any) => {
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
        </>
        )}
        </div>
      </div>
    </div>
  );
}