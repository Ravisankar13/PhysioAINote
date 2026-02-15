import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronUp,
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
  Bone,
  ArrowRight,
  CheckCircle2,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  MapPin,
  Crosshair
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { PhysioGptConversation, PhysioGptMessage } from "@shared/schema";
import ClinicalResponseDisplay from "@/components/clinical/ClinicalResponseDisplay";
import VisualContentDisplay from "@/components/clinical/VisualContentDisplay";
import PureThreeGLBViewer from "@/components/skeleton/PureThreeGLBViewer";
import type { AnatomicalRegion, PainMarker } from "@/components/skeleton/PureThreeGLBViewer";
import { pdfGenerator } from "@/services/pdfGenerator";
import { parseClinicalText, mergeHighlights, HIGHLIGHT_COLORS, type RegionHighlight, type ParsedClinicalContext } from "@/lib/clinicalTextParser";

const BODY_REGIONS = {
  cervical: {
    name: "Cervical Spine",
    icon: "🦴",
    color: "from-blue-500 to-blue-600",
    skeletonRegion: "cervical_spine" as AnatomicalRegion,
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
    skeletonRegion: "thoracic_spine" as AnatomicalRegion,
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
    skeletonRegion: "lumbar_spine" as AnatomicalRegion,
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
    skeletonRegion: "left_shoulder" as AnatomicalRegion,
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
    skeletonRegion: "left_elbow" as AnatomicalRegion,
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
    skeletonRegion: "left_elbow" as AnatomicalRegion,
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
    skeletonRegion: "left_hip" as AnatomicalRegion,
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
    skeletonRegion: "left_knee" as AnatomicalRegion,
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
    skeletonRegion: "left_ankle" as AnatomicalRegion,
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

interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
  leftHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; internalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  leftScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  rightScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
  leftWrist: { deviation: number; flexion: number };
  rightWrist: { deviation: number; flexion: number };
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  limbScales: { upperArm: 0, forearm: 0, thigh: 0, shin: 0, overall: 1 },
  spine: { cervicalLordosis: 0, thoracicKyphosis: 0, lumbarLordosis: 0, scoliosis: 0, forwardHead: 0, lateralShift: 0, cervicalRotation: 0, cervicalLateralFlexion: 0, thoracicRotation: 0, lumbarRotation: 0 },
  neck: { flexion: 0, extension: 0, rotation: 0, lateralFlexion: 0, forwardHead: 0 },
  pelvis: { tilt: 0, obliquity: 0, rotation: 0, drop: 0 },
  leftHip: { flexion: 0, extension: 0, abduction: 0, internalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  rightHip: { flexion: 0, extension: 0, abduction: 0, internalRotation: 0, anteversion: 0, neckShaftAngle: 0 },
  leftKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  rightKnee: { flexion: 0, varus: 0, tibialTorsion: 0, recurvatum: 0, tibialSlope: 0, patellaAlta: 0 },
  leftAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, archHeight: 0 },
  rightAnkle: { dorsiflexion: 0, plantarflexion: 0, inversion: 0, eversion: 0, archHeight: 0 },
  leftShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
  rightShoulder: { flexion: 0, abduction: 0, internalRotation: 0, externalRotation: 0, retroversion: 0, elevation: 0, protraction: 0, winging: 0, clavicleLength: 0 },
  leftScapula: { protraction: 0, retraction: 0, elevation: 0, depression: 0, upwardRotation: 0, downwardRotation: 0, anteriorTilt: 0, posteriorTilt: 0, winging: 0, clavicleRotation: 0 },
  rightScapula: { protraction: 0, retraction: 0, elevation: 0, depression: 0, upwardRotation: 0, downwardRotation: 0, anteriorTilt: 0, posteriorTilt: 0, winging: 0, clavicleRotation: 0 },
  leftElbow: { flexion: 0, carryingAngle: 0, pronation: 0 },
  rightElbow: { flexion: 0, carryingAngle: 0, pronation: 0 },
  leftWrist: { deviation: 0, flexion: 0 },
  rightWrist: { deviation: 0, flexion: 0 },
};

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

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [skeletonOpen, setSkeletonOpen] = useState(false);
  const [skeletonHeight, setSkeletonHeight] = useState(40);
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [showJointControls, setShowJointControls] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState<keyof typeof BODY_REGIONS | null>(null);
  const [showSpecialTests, setShowSpecialTests] = useState(false);
  const [zoomToRegion, setZoomToRegion] = useState<AnatomicalRegion | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({ ...DEFAULT_MODEL_CONFIG });
  const [clinicalHighlights, setClinicalHighlights] = useState<RegionHighlight[]>([]);
  const [painMarkers, setPainMarkers] = useState<PainMarker[]>([]);
  const [painMarkerMode, setPainMarkerMode] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerDescription, setMarkerDescription] = useState('');

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [evidenceData, setEvidenceData] = useState<Map<number, PhysioGptResponse>>(new Map());

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");
  const lastAnalyzedLengthRef = useRef(0);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);
  const interimAbortRef = useRef<AbortController | null>(null);
  const triggerLiveAnalysisRef = useRef<(transcript: string) => void>(() => {});

  const isStreamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<PhysioGptConversation[]>({
    queryKey: ["/api/physiogpt/conversations"],
    enabled: !!user,
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: PhysioGptConversation;
    messages: PhysioGptMessage[];
  }>({
    queryKey: [`/api/physiogpt/conversations/${selectedConversationId}`],
    enabled: !!selectedConversationId,
  });

  const messages = conversationData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (interimAbortRef.current) interimAbortRef.current.abort();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const contexts: ParsedClinicalContext[] = [];

      if (messages.length > 0) {
        const recentMessages = messages.slice(-6);
        for (const msg of recentMessages) {
          if (msg.content) {
            contexts.push(parseClinicalText(msg.content));
          }
        }
      }

      if (streamingContent) {
        contexts.push(parseClinicalText(streamingContent));
      }

      if (liveTranscript) {
        contexts.push(parseClinicalText(liveTranscript));
      }

      if (contexts.length > 0) {
        const merged = mergeHighlights(contexts);
        setClinicalHighlights(merged.highlights);

        if (merged.highlights.length > 0 && !skeletonOpen) {
          setSkeletonOpen(true);
        }
      } else {
        setClinicalHighlights([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, streamingContent, liveTranscript]);

  const triggerLiveAnalysis = useCallback(async (transcript: string) => {
    if (isAnalyzingRef.current || !transcript.trim() || transcript.length < 30) return;
    isAnalyzingRef.current = true;
    lastAnalyzedLengthRef.current = transcript.length;

    if (interimAbortRef.current) interimAbortRef.current.abort();
    const analysisAbort = new AbortController();
    interimAbortRef.current = analysisAbort;

    try {
      setIsStreaming(true);
      setStreamingContent("");

      const voiceMessage = `[LIVE CLINICAL SESSION - In Progress]\n\nThe following is a real-time transcription of an ongoing clinical physiotherapy session. Provide a concise interim clinical analysis based on what has been discussed so far:\n\n---\n${transcript}\n---\n\nProvide a brief interim analysis:\n1. **Session Summary** - Key points discussed so far and emerging chief complaint\n2. **Clinical Findings** - Relevant findings extracted so far\n3. **Differential Diagnosis** - Preliminary ranked list based on current information\n4. **Assessment** - Initial clinical impression\n5. **Missing Information** - What additional information is still needed`;

      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: voiceMessage,
          conversationId: selectedConversationId,
          isVoiceSession: true,
          isInterimAnalysis: true,
          clinicalContext: {
            bodyRegion: selectedRegion ? BODY_REGIONS[selectedRegion].name : undefined,
            professionalMode: true
          }
        }),
        signal: analysisAbort.signal,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

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
                if (data.type === 'chunk') {
                  accumulatedContent += data.data;
                  setStreamingContent(accumulatedContent);
                } else if (data.type === 'conversationId' && !selectedConversationId) {
                  setSelectedConversationId(data.data);
                }
              } catch {}
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Live analysis error:", error);
      }
    } finally {
      isAnalyzingRef.current = false;
      isStreamingRef.current = false;
      setIsStreaming(false);
    }
  }, [selectedConversationId, selectedRegion]);

  triggerLiveAnalysisRef.current = triggerLiveAnalysis;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setLiveTranscript("");
      setInterimTranscript("");
      liveTranscriptRef.current = "";
      lastAnalyzedLengthRef.current = 0;
      isAnalyzingRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let recognitionResultIndex = 0;
        recognition.onresult = (event: any) => {
          let interimText = "";
          for (let i = recognitionResultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              liveTranscriptRef.current += result[0].transcript + " ";
              setLiveTranscript(liveTranscriptRef.current.trim());
              recognitionResultIndex = i + 1;
            } else {
              interimText += result[0].transcript;
            }
          }
          setInterimTranscript(interimText);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error("Speech recognition error:", event.error);
          }
        };

        recognition.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            recognitionResultIndex = 0;
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      analysisTimerRef.current = setInterval(() => {
        const currentTranscript = liveTranscriptRef.current;
        const newContentLength = currentTranscript.length - lastAnalyzedLengthRef.current;
        if (newContentLength > 50 && !isAnalyzingRef.current) {
          triggerLiveAnalysisRef.current(currentTranscript);
        }
      }, 10000);

    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = async () => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }

    if (interimAbortRef.current) {
      interimAbortRef.current.abort();
      interimAbortRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const finalTranscript = liveTranscriptRef.current.trim();
    setStreamingContent("");
    isStreamingRef.current = false;
    setIsStreaming(false);

    if (finalTranscript.length > 20) {
      setIsAnalyzingSession(true);
      const durationMins = Math.floor(recordingDuration / 60);
      const durationSecs = recordingDuration % 60;
      const durationStr = durationMins > 0 ? `${durationMins}m ${durationSecs}s` : `${durationSecs}s`;
      const voiceMessage = `[CLINICAL SESSION RECORDING - Duration: ${durationStr}]\n\nThe following is a transcription of a clinical physiotherapy session. Please analyze this as a professional diagnostician and provide a comprehensive clinical report:\n\n---\n${finalTranscript}\n---\n\nPlease provide:\n1. **Session Summary** - Key points discussed and chief complaint\n2. **Clinical Findings** - Relevant subjective and objective findings extracted\n3. **Differential Diagnosis** - Ranked list with reasoning for each\n4. **Assessment** - Your clinical impression based on the evidence\n5. **Treatment Plan** - Evidence-based interventions with dosage parameters\n6. **Prognosis** - Expected outcomes and timeline\n7. **Missing Information** - What additional information, tests, or assessments are needed to refine the diagnosis\n8. **Red Flags** - Any concerning signs that require urgent attention`;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      isAnalyzingRef.current = false;
      setLiveTranscript("");
      setInterimTranscript("");
      sendMessageStreaming(voiceMessage, true);
    } else if (finalTranscript.length > 0) {
      toast({ title: "Recording too short", description: "Please speak more for a proper clinical analysis", variant: "destructive" });
      setLiveTranscript("");
      setInterimTranscript("");
    } else {
      toast({ title: "No speech detected", description: "Please try recording again. Make sure your microphone is working.", variant: "destructive" });
      setLiveTranscript("");
      setInterimTranscript("");
    }
  };

  const sendMessageStreaming = async (messageContent: string, isVoiceSession: boolean = false) => {
    if (isStreamingRef.current) return;
    isStreamingRef.current = true;
    setIsStreaming(true);
    setStreamingContent("");

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/physiogpt/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId: selectedConversationId,
          isVoiceSession,
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
                // skip malformed SSE
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
      isStreamingRef.current = false;
      setIsStreaming(false);
      setIsAnalyzingSession(false);
    }
  };

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

  const resizeStartY = useRef<number | null>(null);
  const didDrag = useRef(false);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartY.current = e.clientY;
    didDrag.current = false;
    setIsDraggingResize(true);
  }, []);

  useEffect(() => {
    if (!isDraggingResize) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainContentRef.current) return;
      if (resizeStartY.current !== null && Math.abs(e.clientY - resizeStartY.current) > 3) {
        didDrag.current = true;
      }
      const rect = mainContentRef.current.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const pct = (offsetY / rect.height) * 100;
      setSkeletonHeight(Math.min(Math.max(pct, 15), 80));
    };
    const handleMouseUp = () => {
      setIsDraggingResize(false);
      resizeStartY.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingResize]);

  const handlePainMarkerAdd = useCallback((marker: PainMarker) => {
    setPainMarkers(prev => [...prev, marker]);
    setEditingMarkerId(marker.id);
    setMarkerDescription('');
  }, []);

  const handlePainMarkerMove = useCallback((id: string, position: { x: number; y: number; z: number }, nearestBone: string, anatomicalLabel: string) => {
    setPainMarkers(prev => prev.map(m => m.id === id ? { ...m, position, nearestBone, anatomicalLabel } : m));
  }, []);

  const handlePainMarkerRemove = useCallback((id: string) => {
    setPainMarkers(prev => prev.filter(m => m.id !== id));
    if (editingMarkerId === id) {
      setEditingMarkerId(null);
      setMarkerDescription('');
    }
  }, [editingMarkerId]);

  const handlePainMarkerDescriptionSubmit = useCallback((markerId: string, description: string) => {
    if (!description.trim() || isStreaming) return;
    let label = 'Unknown area';
    setPainMarkers(prev => {
      const updated = prev.map(m => {
        if (m.id === markerId) {
          label = m.anatomicalLabel;
          return { ...m, description: description.trim() };
        }
        return m;
      });
      return updated;
    });
    setEditingMarkerId(null);
    setMarkerDescription('');

    const prompt = `The patient has marked pain at the ${label} on the anatomical skeleton and describes it as: "${description.trim()}"\n\nPlease provide a clinical assessment. What are the likely differential diagnoses? What specific assessments, special tests, or imaging would you recommend? Are there any red flags to consider?`;
    sendMessageStreaming(prompt);
  }, [isStreaming]);

  const handleAskAboutPainMarkers = useCallback(() => {
    if (painMarkers.length === 0) return;
    const markerDescriptions = painMarkers.map((m, i) => {
      const desc = m.description ? ` - "${m.description}"` : '';
      return `${i + 1}. ${m.anatomicalLabel}${desc}`;
    }).join('\n');
    const prompt = `The patient has indicated pain in the following areas on the anatomical skeleton:\n${markerDescriptions}\n\nPlease provide a clinical assessment considering these pain locations and descriptions. What could be the differential diagnoses? What assessment approach would you recommend? Are there any patterns suggesting a specific condition?`;
    sendMessageStreaming(prompt);
  }, [painMarkers]);

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
    setZoomToRegion(regionData.skeletonRegion);
    if (!skeletonOpen) setSkeletonOpen(true);

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

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentRegionData = selectedRegion ? BODY_REGIONS[selectedRegion] : null;

  const updateModelConfig = (path: string, value: number) => {
    setModelConfig(prev => {
      const next = { ...prev };
      const [group, prop] = path.split('.');
      (next as any)[group] = { ...(next as any)[group], [prop]: value };
      return next;
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-300 overflow-hidden border-r bg-white flex-shrink-0`}>
        <div className="w-[280px] p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">PhysioGPT</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleNewConversation} className="w-full mb-4 bg-teal-600 hover:bg-teal-700 h-9 text-sm">
            <Plus className="h-4 w-4 mr-2" />
            New Consultation
          </Button>

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-1.5">
              {loadingConversations ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No consultations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedConversationId === conv.id ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <MessageCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 absolute right-1"
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
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Sidebar toggle when collapsed */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-20 z-20 bg-white shadow-md h-8 w-8"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      )}

      {/* Main Content Area */}
      <div ref={mainContentRef} className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isDraggingResize ? 'select-none cursor-row-resize' : ''}`}>
        {/* Skeleton Viewer Panel */}
        <div
          className={`${skeletonOpen ? '' : 'h-0'} overflow-hidden border-b bg-gray-900 relative flex-shrink-0`}
          style={skeletonOpen ? { height: `${skeletonHeight}%`, transition: isDraggingResize ? 'none' : 'height 0.3s ease' } : undefined}
        >
          <div className="h-full w-full relative">
            <PureThreeGLBViewer
              modelPath="/models/skeleton_character.glb"
              modelConfig={modelConfig as any}
              zoomToRegion={zoomToRegion}
              className="w-full h-full"
              highlightRegions={clinicalHighlights.map(h => ({
                region: h.region,
                color: HIGHLIGHT_COLORS[h.type].hex,
                intensity: 0.3 + h.severity * 0.7,
              }))}
              enablePainMarkers={painMarkerMode}
              painMarkers={painMarkers}
              onPainMarkerAdd={handlePainMarkerAdd}
              onPainMarkerMove={handlePainMarkerMove}
              onPainMarkerRemove={handlePainMarkerRemove}
            />

            {/* Joint Controls Overlay */}
            {showJointControls && (
              <div className="absolute top-2 right-2 w-56 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-h-[calc(100%-16px)] overflow-y-auto z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Joint Controls</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowJointControls(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-600">Spine Kyphosis</label>
                    <Slider min={-30} max={30} step={1} value={[modelConfig.spine.thoracicKyphosis]}
                      onValueChange={([v]) => updateModelConfig('spine.thoracicKyphosis', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">Lumbar Lordosis</label>
                    <Slider min={-30} max={30} step={1} value={[modelConfig.spine.lumbarLordosis]}
                      onValueChange={([v]) => updateModelConfig('spine.lumbarLordosis', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">L Shoulder Flexion</label>
                    <Slider min={0} max={180} step={1} value={[modelConfig.leftShoulder.flexion]}
                      onValueChange={([v]) => updateModelConfig('leftShoulder.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">R Shoulder Flexion</label>
                    <Slider min={0} max={180} step={1} value={[modelConfig.rightShoulder.flexion]}
                      onValueChange={([v]) => updateModelConfig('rightShoulder.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">L Hip Flexion</label>
                    <Slider min={0} max={120} step={1} value={[modelConfig.leftHip.flexion]}
                      onValueChange={([v]) => updateModelConfig('leftHip.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">R Hip Flexion</label>
                    <Slider min={0} max={120} step={1} value={[modelConfig.rightHip.flexion]}
                      onValueChange={([v]) => updateModelConfig('rightHip.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">L Knee Flexion</label>
                    <Slider min={0} max={140} step={1} value={[modelConfig.leftKnee.flexion]}
                      onValueChange={([v]) => updateModelConfig('leftKnee.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">R Knee Flexion</label>
                    <Slider min={0} max={140} step={1} value={[modelConfig.rightKnee.flexion]}
                      onValueChange={([v]) => updateModelConfig('rightKnee.flexion', v)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-gray-600">Pelvis Tilt</label>
                    <Slider min={-20} max={20} step={1} value={[modelConfig.pelvis.tilt]}
                      onValueChange={([v]) => updateModelConfig('pelvis.tilt', v)} className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Clinical Highlights Legend */}
            {clinicalHighlights.length > 0 && (
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur rounded-lg px-3 py-2 z-10 max-w-[200px]">
                <p className="text-[10px] text-gray-300 uppercase tracking-wider mb-1.5 font-medium">Detected Regions</p>
                <div className="space-y-1">
                  {clinicalHighlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: HIGHLIGHT_COLORS[h.type].css, boxShadow: `0 0 6px ${HIGHLIGHT_COLORS[h.type].css}` }}
                      />
                      <span className="text-[11px] text-white truncate">{h.label}</span>
                      <span className="text-[9px] text-gray-400 ml-auto">{HIGHLIGHT_COLORS[h.type].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pain Marker List Panel */}
            {painMarkers.length > 0 && (
              <div className="absolute bottom-12 right-2 bg-black/80 backdrop-blur rounded-lg px-3 py-2 z-10 w-64 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-gray-300 uppercase tracking-wider font-medium">Pain Markers ({painMarkers.length})</p>
                  <button
                    className="text-[10px] text-red-400 hover:text-red-300"
                    onClick={() => { setPainMarkers([]); setEditingMarkerId(null); setMarkerDescription(''); }}
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {painMarkers.map((m) => (
                    <div key={m.id} className="bg-white/5 rounded px-2 py-1.5">
                      <div className="flex items-center gap-2 group">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-500" style={{ boxShadow: '0 0 6px #ff2222' }} />
                        <span className="text-[11px] text-white truncate flex-1 font-medium">{m.anatomicalLabel}</span>
                        <button
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePainMarkerRemove(m.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {m.description && editingMarkerId !== m.id && (
                        <p className="text-[10px] text-gray-400 mt-1 ml-4 italic cursor-pointer hover:text-gray-300"
                          onClick={() => { setEditingMarkerId(m.id); setMarkerDescription(m.description || ''); }}
                        >
                          "{m.description}"
                        </p>
                      )}
                      {editingMarkerId === m.id ? (
                        <div className="mt-1.5 ml-4">
                          <input
                            type="text"
                            autoFocus
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                            placeholder="Describe the pain (e.g., sharp, dull, radiating...)"
                            value={markerDescription}
                            onChange={(e) => setMarkerDescription(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && markerDescription.trim() && !isStreaming) {
                                handlePainMarkerDescriptionSubmit(m.id, markerDescription);
                              }
                              if (e.key === 'Escape') {
                                setEditingMarkerId(null);
                                setMarkerDescription('');
                              }
                            }}
                          />
                          <div className="flex gap-1 mt-1">
                            <button
                              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] rounded px-2 py-0.5 disabled:opacity-50"
                              disabled={!markerDescription.trim() || isStreaming}
                              onClick={() => handlePainMarkerDescriptionSubmit(m.id, markerDescription)}
                            >
                              Send to Chat
                            </button>
                            <button
                              className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5"
                              onClick={() => { setEditingMarkerId(null); setMarkerDescription(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : !m.description && (
                        <button
                          className="text-[10px] text-teal-400 hover:text-teal-300 mt-1 ml-4"
                          onClick={() => { setEditingMarkerId(m.id); setMarkerDescription(''); }}
                        >
                          + Add description
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleAskAboutPainMarkers}
                  disabled={isStreaming}
                >
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Ask About All Areas
                </Button>
              </div>
            )}

            {/* Skeleton controls bar */}
            <div className="absolute bottom-2 left-2 flex gap-1 z-10">
              <Button
                variant="secondary"
                size="sm"
                className={`h-7 text-xs shadow-sm ${painMarkerMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/90 hover:bg-white'}`}
                onClick={() => {
                  const newMode = !painMarkerMode;
                  setPainMarkerMode(newMode);
                  if (newMode) {
                    if (!skeletonOpen) setSkeletonOpen(true);
                    toast({ title: "Pain Marker Mode", description: "Click on the skeleton to place markers. Right-click to remove. Drag to reposition." });
                  }
                }}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {painMarkerMode ? 'Marking...' : 'Mark Pain'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-white/90 hover:bg-white shadow-sm"
                onClick={() => setShowJointControls(!showJointControls)}
              >
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                Controls
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-white/90 hover:bg-white shadow-sm"
                onClick={() => { setZoomToRegion('full_body'); }}
              >
                Reset View
              </Button>
            </div>

            {/* Body region quick buttons in skeleton area */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 max-w-[200px]">
              {(Object.keys(BODY_REGIONS) as Array<keyof typeof BODY_REGIONS>).map((region) => {
                const data = BODY_REGIONS[region];
                const isSelected = selectedRegion === region;
                return (
                  <button
                    key={region}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : 'bg-white/80 text-gray-700 hover:bg-white'
                    }`}
                    onClick={() => handleRegionSelect(region)}
                  >
                    {data.icon} {data.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skeleton resize handle / toggle */}
        <div className="relative flex-shrink-0">
          {skeletonOpen && (
            <div
              className="absolute inset-x-0 -top-1 h-3 cursor-row-resize z-20 group"
              onMouseDown={handleResizeMouseDown}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 mx-auto w-12 rounded-full bg-gray-300 group-hover:bg-teal-400 transition-colors" />
            </div>
          )}
          <button
            onClick={() => { if (!didDrag.current) setSkeletonOpen(!skeletonOpen); }}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border-b hover:bg-gray-50 text-xs text-gray-500 transition-colors ${skeletonOpen ? 'cursor-row-resize' : 'cursor-pointer'}`}
            onMouseDown={(e) => { if (skeletonOpen) handleResizeMouseDown(e); }}
          >
            {skeletonOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {skeletonOpen ? 'Hide' : 'Show'} Skeleton Viewer
            {skeletonOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {!selectedConversationId && !isStreaming ? (
                /* Welcome Screen */
                <div className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="mb-6">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Stethoscope className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">PhysioGPT</h2>
                    <p className="text-gray-500 mb-8">How can I help with your clinical case?</p>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What's the best approach for assessing acute low back pain?")}
                      >
                        <CardContent className="p-4">
                          <Bone className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Low Back Pain</p>
                          <p className="text-xs text-gray-500 mt-1">Assessment & management approach</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What are the best special tests for rotator cuff pathology?")}
                      >
                        <CardContent className="p-4">
                          <Target className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Rotator Cuff</p>
                          <p className="text-xs text-gray-500 mt-1">Special tests & assessment</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("How do I differentiate between hip and lumbar pathology?")}
                      >
                        <CardContent className="p-4">
                          <Brain className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Hip vs Lumbar</p>
                          <p className="text-xs text-gray-500 mt-1">Differential diagnosis guide</p>
                        </CardContent>
                      </Card>
                      <Card
                        className="cursor-pointer hover:shadow-md hover:border-teal-300 transition-all text-left"
                        onClick={() => handleSendMessage("What's the evidence for manual therapy in neck pain?")}
                      >
                        <CardContent className="p-4">
                          <BookOpen className="h-5 w-5 text-teal-600 mb-2" />
                          <p className="text-sm font-medium">Manual Therapy</p>
                          <p className="text-xs text-gray-500 mt-1">Evidence-based approaches</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Body Region Grid */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Select a body region</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {(Object.keys(BODY_REGIONS) as Array<keyof typeof BODY_REGIONS>).map((region) => {
                          const data = BODY_REGIONS[region];
                          const isSelected = selectedRegion === region;
                          return (
                            <Button
                              key={region}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`flex flex-col h-auto py-2 px-2 text-xs ${isSelected ? `bg-gradient-to-r ${data.color} text-white border-0` : ''}`}
                              onClick={() => handleRegionSelect(region)}
                            >
                              <span className="text-base mb-0.5">{data.icon}</span>
                              <span className="truncate w-full">{data.name.split(' ')[0]}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Streaming response during recording (no conversation yet) */}
                    {isStreaming && streamingContent && (
                      <div className="mt-6 max-w-3xl mx-auto">
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-teal-600 text-white text-xs">
                              <Bot className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[80%] text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 py-0">
                                Live Interim Analysis
                              </Badge>
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                              <ClinicalResponseDisplay content={streamingContent} professionalMode={true} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isStreaming && !streamingContent && (
                      <div className="mt-6 max-w-3xl mx-auto">
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-teal-600 text-white text-xs">
                              <Bot className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : loadingMessages ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-2/3 ml-auto" />
                  <Skeleton className="h-16 w-3/4" />
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-teal-600 text-white text-xs">
                            <Bot className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
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
                                  className="text-xs h-7"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                        <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <Avatar className="h-7 w-7 border border-gray-200 flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-gray-100 text-xs">
                            <User className="h-3.5 w-3.5 text-gray-600" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {/* Streaming response */}
                  {isStreaming && streamingContent && (
                    <div className="flex gap-3">
                      <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-teal-600 text-white text-xs">
                          <Bot className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%]">
                        <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                          <ClinicalResponseDisplay content={streamingContent} professionalMode={true} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typing indicator */}
                  {(sendMessageMutation.isPending || (isStreaming && !streamingContent)) && (
                    <div className="flex gap-3">
                      <Avatar className="h-7 w-7 border border-teal-200 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-teal-600 text-white text-xs">
                          <Bot className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Special Tests Panel */}
          {currentRegionData && (
            <Collapsible open={showSpecialTests} onOpenChange={setShowSpecialTests}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-2 bg-white border-t hover:bg-gray-50 text-sm">
                  <span className="flex items-center gap-2 text-teal-700 font-medium">
                    <ClipboardCheck className="h-4 w-4" />
                    Special Tests: {currentRegionData.name}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showSpecialTests ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-2 bg-gray-50 border-t max-h-44 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentRegionData.specialTests.map((test, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-white rounded-lg border hover:border-teal-300 cursor-pointer transition-colors"
                        onClick={() => {
                          const prompt = `How do I perform ${test.name}? What is the sensitivity/specificity and clinical utility for ${test.purpose}?`;
                          setMessage(prompt);
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-gray-800">{test.name}</p>
                          <p className="text-[10px] text-gray-500">{test.purpose}</p>
                          <p className="text-[10px] text-teal-600">+ : {test.positive}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-xs font-medium text-red-700">Red Flags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentRegionData.redFlags.map((flag, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] border-red-300 text-red-700 py-0">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

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
                      className="whitespace-nowrap hover:bg-teal-50 hover:border-teal-300 h-7 text-xs flex-shrink-0"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      <Lightbulb className="h-3 w-3 mr-1 text-teal-600" />
                      {suggestion.length > 50 ? suggestion.substring(0, 50) + '...' : suggestion}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 py-1.5 border-t bg-gray-50/80">
            <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto">
              {PHYSIO_QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  className={`whitespace-nowrap h-7 text-xs px-2.5 ${action.color}`}
                  onClick={() => handleSendMessage(action.prompt)}
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-3">
            <div className="max-w-3xl mx-auto">
              {/* Recording indicator */}
              {isRecording && (
                <div className="mb-2 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-700 font-semibold">Recording Clinical Session</span>
                        <span className="text-sm text-red-600 font-mono font-bold">{formatRecordingTime(recordingDuration)}</span>
                      </div>
                      <span className="text-xs text-red-500">AI analysis updates live as you speak</span>
                    </div>
                    <Button variant="destructive" size="sm" className="h-7 text-xs px-3" onClick={stopRecording}>
                      <MicOff className="h-3 w-3 mr-1" />
                      Stop & Analyze
                    </Button>
                  </div>
                  {(liveTranscript || interimTranscript) && (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mic className="h-3 w-3 text-gray-500" />
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Live Transcript</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed max-h-20 overflow-y-auto">
                        {liveTranscript}
                        {interimTranscript && <span className="text-gray-400 italic"> {interimTranscript}</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isAnalyzingSession && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
                  <Brain className="h-4 w-4 animate-pulse text-teal-600" />
                  <div>
                    <span className="text-sm text-teal-700 font-medium">Generating final clinical report...</span>
                    <p className="text-xs text-teal-500">Comprehensive diagnosis, assessment, and treatment plan</p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2 items-end"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    currentRegionData
                      ? `Ask about ${currentRegionData.name.toLowerCase()} assessment or treatment...`
                      : "Ask me about assessment, treatment, or clinical reasoning..."
                  }
                  disabled={sendMessageMutation.isPending || isStreaming || isRecording || isTranscribing || isAnalyzingSession}
                  className="flex-1 h-10"
                />
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isStreaming || isTranscribing || isAnalyzingSession}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending || isStreaming || isRecording || isTranscribing || isAnalyzingSession}
                  className="bg-teal-600 hover:bg-teal-700 h-10 w-10 flex-shrink-0"
                  size="icon"
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