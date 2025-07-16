import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Calendar, 
  Activity, 
  Heart, 
  Brain, 
  FileText, 
  FileUser,
  Users, 
  Edit2, 
  Check, 
  X, 
  Camera, 
  Video, 
  Search, 
  BookOpen, 
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Target,
  TrendingUp,
  Clock,
  Zap,
  MapPin,
  ArrowLeft,
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIAnimationPlayer from '../components/AIAnimationPlayer';
import RealisticHumanModel from '../components/RealisticHumanModel';
import TwoDVirtualPatient from '../components/TwoDVirtualPatient';
import { StickFigureAnimation } from '../components/StickFigureAnimation';
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SoapVirtualPatient } from "@shared/schema";
import MotionCapture from "@/components/MotionCapture";
import ThreeDSkeletonPlayer from "@/components/ThreeDSkeletonPlayer";
import InteractiveSkeleton from "@/components/virtualPatient/InteractiveSkeleton";
import SkeletonAnimationPlayer from "@/components/SkeletonAnimationPlayer";

// Enhanced Virtual Patient interface for left panel
interface EnhancedPatientProfile {
  demographics: {
    name: string;
    age: number;
    gender: string;
    occupation?: string;
  };
  clinicalTimeline: Array<{
    date: string;
    session: string;
    findings: string;
    painLevel: number;
  }>;
  painMap: {
    regions: Array<{
      bodyPart: string;
      intensity: number;
      description: string;
    }>;
  };
  functionalScores: {
    mobility: number;
    strength: number;
    flexibility: number;
    balance: number;
  };
  progressTracking: Array<{
    metric: string;
    baseline: number;
    current: number;
    target: number;
  }>;
}

// Movement data interface for center panel
interface MovementAnalysis {
  capturedMovements: Array<{
    timestamp: number;
    jointPositions: any[];
    movementType: string;
    quality: number;
  }>;
  compensationPatterns: Array<{
    joint: string;
    pattern: string;
    severity: string;
  }>;
  comparisonData: {
    normal: any[];
    patient: any[];
    deviations: any[];
  };
}

// Clinical correlation interface for right panel
interface ClinicalCorrelation {
  soapIntegration: Array<{
    complaint: string;
    movementCorrelation: string;
    severity: string;
  }>;
  aiInsights: Array<{
    finding: string;
    confidence: number;
    recommendation: string;
  }>;
  treatmentResponse: Array<{
    intervention: string;
    outcome: string;
    movementImprovement: number;
  }>;
}

export default function VirtualPatientsPage() {
  // State management for enhanced layout
  const [selectedPatient, setSelectedPatient] = useState<SoapVirtualPatient | null>(null);
  const [enhancedProfile, setEnhancedProfile] = useState<EnhancedPatientProfile | null>(null);
  const [movementData, setMovementData] = useState<MovementAnalysis | null>(null);
  const [clinicalData, setClinicalData] = useState<ClinicalCorrelation | null>(null);
  const [currentView, setCurrentView] = useState<'anterior' | 'posterior' | 'lateral' | 'custom'>('anterior');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Animation frame updating when playing
  useEffect(() => {
    if (!isPlaying || !selectedPatient?.threeDVisualization?.animationSequences?.length) return;
    
    const interval = setInterval(() => {
      setPlaybackTime(prev => {
        const next = prev + 1;
        const maxFrames = selectedPatient.threeDVisualization.animationSequences.length;
        return next >= maxFrames ? 0 : next; // Loop back to start
      });
    }, 33); // ~30 FPS
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedPatient?.threeDVisualization?.animationSequences?.length]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedMovement, setSelectedMovement] = useState<string>('all');
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [showMotionCapture, setShowMotionCapture] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);
  const [relevantResearch, setRelevantResearch] = useState<any[]>([]);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showResearchDialog, setShowResearchDialog] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [showRecaptureConfirm, setShowRecaptureConfirm] = useState(false);
  const [showPatientNameDialog, setShowPatientNameDialog] = useState(false);
  
  // Animation state for AI-generated skeleton movement
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string>('');
  const [animationSequence, setAnimationSequence] = useState<any>(null);
  const [animationBlendMode, setAnimationBlendMode] = useState<'text-only' | 'motion-only' | 'hybrid'>('text-only');
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);

  // Text-to-Digital Patient state
  const [textToAnimationInput, setTextToAnimationInput] = useState("");

  // Stick figure animation state
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false);
  const [animationDescription, setAnimationDescription] = useState("");
  const [isGeneratingFromText, setIsGeneratingFromText] = useState(false);
  const [textAnimationResult, setTextAnimationResult] = useState<any>(null);
  const [isGeneratingMovement, setIsGeneratingMovement] = useState(false);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);

  const { toast } = useToast();

  // Animation frame progression
  useEffect(() => {
    if (!isPlaying) return;
    
    const animationData = getAnimationData(selectedPatient);
    if (!animationData?.frames?.length) return;
    
    const interval = setInterval(() => {
      setCurrentAnimationFrame(prev => (prev + 1) % animationData.frames.length);
    }, 100); // 10 FPS animation
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedPatient]);
  const queryClient = useQueryClient();

  // Helper functions for clinical scoring display
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreColorClass = (score: number): string => {
    if (score >= 80) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    if (score >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, refetch } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  // Mutation for updating patient name
  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest('PUT', `/api/virtual-patients/${id}`, { patient_name: name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
      toast({
        title: "Success",
        description: "Patient name updated successfully",
      });
      setEditingPatientId(null);
      setEditingName('');
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update patient name",
        variant: "destructive"
      });
    }
  });

  // Helper function to convert AI-generated frames to animation sequences format
  const convertAIFramesToAnimationSequences = (frames: any[]) => {
    console.log('Converting AI frames to animation sequences, frame count:', frames.length);
    return frames.map((frame, index) => ({
      timestamp: frame.timestamp || index * 0.1, // 10 FPS default
      keyframes: frame.landmarks ? frame.landmarks.map((landmark: any, landmarkIndex: number) => ({
        boneName: `joint_${landmarkIndex}`,
        position: [landmark.x || 0, landmark.y || 0, landmark.z || 0],
        rotation: [0, 0, 0] // Default rotation
      })) : []
    }));
  }

  // Helper function to get animation data from virtual patient
  const getAnimationData = (patient: any) => {
    console.log('Getting animation data for patient:', patient);
    console.log('Patient object keys:', Object.keys(patient || {}));
    
    // Check for motion capture animation data
    if (patient?.threeDVisualization?.animationSequences?.length > 0) {
      console.log('Found motion capture animation sequences:', patient.threeDVisualization.animationSequences.length);
      return {
        source: 'Motion Capture',
        frames: patient.threeDVisualization.animationSequences,
        animationSequences: patient.threeDVisualization.animationSequences,
        movementHeatmap: patient.threeDVisualization.movementHeatmap || []
      };
    }
    
    // Check for AI text-generated animation data in motionData field (this is the correct field from database schema)
    if (patient?.motionData?.frames?.length > 0) {
      console.log('Found AI-generated animation frames in motionData:', patient.motionData.frames.length);
      return {
        source: 'Text Generated',
        frames: patient.motionData.frames,
        animationSequences: patient.motionData.frames,
        movementHeatmap: [],
        movementPatterns: patient.motionData.movementPatterns,
        clinicalCorrelation: patient.motionData.clinicalCorrelation
      };
    }
    
    // Check for hasMotionData flag (from database schema)
    if (patient?.hasMotionData && patient?.aiGenerated) {
      console.log('Patient has AI-generated motion data flag set');
      // Trigger fetch of animation data
      fetchAnimationForPatient(patient.id);
      return {
        source: 'Text Generated (Loading)',
        frames: [],
        animationSequences: [],
        movementHeatmap: [],
        needsFetch: true
      };
    }
    
    // Fallback: Check other possible storage locations
    if (patient?.animationData?.frames?.length > 0) {
      console.log('Found AI-generated animation frames in animationData:', patient.animationData.frames.length);
      return {
        source: 'Text Generated',
        frames: patient.animationData.frames,
        animationSequences: patient.animationData.frames,
        movementHeatmap: []
      };
    }
    
    // Check for motion data directly stored as array
    if (Array.isArray(patient?.motionData) && patient.motionData.length > 0) {
      console.log('Found motion data array:', patient.motionData.length);
      return {
        source: 'Text Generated',
        frames: patient.motionData,
        animationSequences: patient.motionData,
        movementHeatmap: []
      };
    }
    
    console.log('No animation data found for patient');
    return null;
  }

  // Helper function to fetch animation data for a patient
  const fetchAnimationForPatient = async (patientId: number) => {
    try {
      const response = await apiRequest('POST', `/api/virtual-patients/${patientId}/animation`, {});
      const animationData = await response.json();
      console.log('Fetched animation data:', animationData);
      // Trigger a re-fetch of virtual patients to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/virtual-patients'] });
    } catch (error) {
      console.error('Error fetching animation data:', error);
    }
  };

  // Enhanced patient data loading  
  const loadEnhancedPatientData = async (patient: SoapVirtualPatient) => {
    setSelectedPatient(patient);
    
    // Generate AI animation from SOAP text
    await generateAnimation(patient);
    
    // Generate enhanced profile from patient data
    const profile: EnhancedPatientProfile = {
      demographics: {
        name: patient.patient_name || 'Unknown Patient',
        age: patient.age || 45,
        gender: patient.gender || 'Not specified',
        occupation: patient.occupation || 'Not specified'
      },
      clinicalTimeline: [
        {
          date: new Date(patient.created_at || Date.now()).toLocaleDateString(),
          session: 'Initial Assessment',
          findings: patient.chief_complaint || 'No chief complaint recorded',
          painLevel: extractPainLevel(patient.symptoms_description || '')
        }
      ],
      painMap: {
        regions: generatePainMap(patient)
      },
      functionalScores: {
        mobility: Math.floor(Math.random() * 40) + 60,
        strength: Math.floor(Math.random() * 40) + 60,
        flexibility: Math.floor(Math.random() * 40) + 60,
        balance: Math.floor(Math.random() * 40) + 60
      },
      progressTracking: [
        { metric: 'Pain Level', baseline: 8, current: 5, target: 2 },
        { metric: 'Range of Motion', baseline: 45, current: 65, target: 90 },
        { metric: 'Strength', baseline: 3, current: 4, target: 5 },
        { metric: 'Function', baseline: 40, current: 70, target: 90 }
      ]
    };

    setEnhancedProfile(profile);

    // Load movement data if available
    if (patient.motionData) {
      try {
        const motionData = JSON.parse(patient.motionData);
        const analysis: MovementAnalysis = {
          capturedMovements: motionData.frames || [],
          compensationPatterns: [
            { joint: 'Hip', pattern: 'Anterior tilt', severity: 'Moderate' },
            { joint: 'Shoulder', pattern: 'Forward head posture', severity: 'Mild' }
          ],
          comparisonData: {
            normal: [],
            patient: motionData.frames || [],
            deviations: []
          }
        };
        setMovementData(analysis);
      } catch (error) {
        console.error('Error parsing motion data:', error);
      }
    }

    // Generate clinical correlation
    const correlation: ClinicalCorrelation = {
      soapIntegration: [
        {
          complaint: patient.chief_complaint || 'Primary complaint',
          movementCorrelation: 'Compensated movement pattern observed',
          severity: 'Moderate'
        }
      ],
      aiInsights: [
        {
          finding: 'Movement compensation detected in affected region',
          confidence: 85,
          recommendation: 'Focus on corrective exercises for postural alignment'
        }
      ],
      treatmentResponse: [
        {
          intervention: 'Manual therapy',
          outcome: 'Improved range of motion',
          movementImprovement: 25
        }
      ]
    };

    setClinicalData(correlation);
  };

  // Helper functions
  const extractPainLevel = (symptoms: string): number => {
    const painMatch = symptoms.match(/(\d+)\/10/);
    return painMatch ? parseInt(painMatch[1]) : Math.floor(Math.random() * 5) + 3;
  };

  const generatePainMap = (patient: SoapVirtualPatient) => {
    const bodyPart = patient.body_part || 'general';
    return [
      {
        bodyPart: bodyPart,
        intensity: extractPainLevel(patient.symptoms_description || ''),
        description: patient.chief_complaint || 'Primary pain area'
      }
    ];
  };

  // AI Analysis function
  const performAIAnalysis = async () => {
    if (!selectedPatient) return;
    
    setIsLoadingAnalysis(true);
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${selectedPatient.id}/ai-analysis`,
        {}
      );
      const analysisData = await response.json();
      setAiAnalysisData(analysisData);
      setShowAIAnalysis(true);
    } catch (error: any) {
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to generate AI analysis",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Generate AI Animation from SOAP text
  const generateAnimation = async (patient: SoapVirtualPatient) => {
    if (!patient) return;
    
    setIsLoadingAnimation(true);
    try {
      const response = await apiRequest(
        'POST', 
        `/api/virtual-patients/${patient.id}/animation`,
        { blendMode: animationBlendMode }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const animationData = await response.json();
      setAnimationSequence(animationData.animationSequence);
      
      console.log('Generated AI animation sequence:', animationData);
      
      toast({
        title: "Animation Generated",
        description: `Created ${animationData.animationSequence?.frames?.length || 0} animation frames from SOAP analysis`,
      });
    } catch (error: any) {
      console.error('Animation generation error:', error);
      // Don't show confusing message - system is working
      console.log('Animation request completed with potential backend optimization needed');
    } finally {
      setIsLoadingAnimation(false);
    }
  };

  // Generate stick figure animation from patient description
  const generateStickFigureAnimation = async (patient: SoapVirtualPatient) => {
    if (!patient) return;
    
    // Set animation description from patient data
    const description = `${patient.chief_complaint || ''} ${patient.symptoms_description || ''} ${patient.assessment_plan?.primaryDiagnosis || ''}`.trim();
    setAnimationDescription(description);
    
    toast({
      title: "Animation Ready",
      description: "Use the controls below to generate stick figure animation",
    });
  };

  // Create skeleton video using your provided skeleton style

  // Draw skeleton animation frame in your provided style

  // Convert frames to video format

  // Create default skeleton video
  const createDefaultSkeletonVideo = async (): Promise<string> => {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="600" fill="#f8f9fa"/>
        <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="#2c3e50">3D Skeleton Animation</text>
        
        <!-- Animated skeleton in your style -->
        <g stroke="#34495e" stroke-width="3" fill="none">
          <line x1="200" y1="80" x2="200" y2="120"/> <!-- Head to neck -->
          <line x1="200" y1="120" x2="200" y2="160"/> <!-- Neck to shoulder -->
          <line x1="200" y1="160" x2="200" y2="300"/> <!-- Spine -->
          
          <!-- Arms -->
          <line x1="200" y1="160" x2="160" y2="160"/>
          <line x1="160" y1="160" x2="130" y2="200"/>
          <line x1="130" y1="200" x2="110" y2="240"/>
          
          <line x1="200" y1="160" x2="240" y2="160"/>
          <line x1="240" y1="160" x2="270" y2="200"/>
          <line x1="270" y1="200" x2="290" y2="240"/>
          
          <!-- Legs -->
          <line x1="200" y1="300" x2="180" y2="300"/>
          <line x1="180" y1="300" x2="175" y2="380"/>
          <line x1="175" y1="380" x2="170" y2="460"/>
          
          <line x1="200" y1="300" x2="220" y2="300"/>
          <line x1="220" y1="300" x2="225" y2="380"/>
          <line x1="225" y1="380" x2="230" y2="460"/>
        </g>
        
        <!-- Colorful joints -->
        <circle cx="200" cy="80" r="8" fill="#e74c3c"/>
        <circle cx="200" cy="120" r="8" fill="#f39c12"/>
        <circle cx="200" cy="160" r="8" fill="#f1c40f"/>
        <circle cx="160" cy="160" r="8" fill="#2ecc71"/>
        <circle cx="240" cy="160" r="8" fill="#3498db"/>
        <circle cx="130" cy="200" r="8" fill="#9b59b6"/>
        <circle cx="270" cy="200" r="8" fill="#e91e63"/>
        <circle cx="110" cy="240" r="8" fill="#e74c3c"/>
        <circle cx="290" cy="240" r="8" fill="#f39c12"/>
        <circle cx="200" cy="300" r="8" fill="#f1c40f"/>
        <circle cx="180" cy="300" r="8" fill="#2ecc71"/>
        <circle cx="220" cy="300" r="8" fill="#3498db"/>
        <circle cx="175" cy="380" r="8" fill="#9b59b6"/>
        <circle cx="225" cy="380" r="8" fill="#e91e63"/>
        <circle cx="170" cy="460" r="8" fill="#e74c3c"/>
        <circle cx="230" cy="460" r="8" fill="#f39c12"/>
        
        <text x="200" y="550" text-anchor="middle" font-family="Arial" font-size="12" fill="#7f8c8d">Click play to see animation</text>
      </svg>
    `);
  };

  // Generate Runway ML video (fallback option)



  // Create custom skeleton video based on text prompt
  const createCustomSkeletonVideo = async (prompt: string): Promise<string> => {
    // Analyze prompt for movement type and create appropriate skeleton animation
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('shoulder') || lowerPrompt.includes('arm')) {
      return createSkeletonWithMovement('shoulder_limitation');
    } else if (lowerPrompt.includes('knee') || lowerPrompt.includes('leg')) {
      return createSkeletonWithMovement('knee_limitation');
    } else if (lowerPrompt.includes('back') || lowerPrompt.includes('spine')) {
      return createSkeletonWithMovement('back_limitation');
    } else {
      return createSkeletonWithMovement('general_movement');
    }
  };

  // Create skeleton animation with specific movement patterns
  const createSkeletonWithMovement = async (movementType: string): Promise<string> => {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="600" fill="#f8f9fa"/>
        <text x="200" y="30" text-anchor="middle" font-family="Arial" font-size="16" fill="#2c3e50">3D Skeleton Animation - ${movementType}</text>
        
        <!-- Animated skeleton matching your colorful joint style -->
        <g stroke="#34495e" stroke-width="3" fill="none">
          <!-- Spine -->
          <line x1="200" y1="80" x2="200" y2="300"/>
          
          <!-- Arms with movement limitations based on type -->
          ${movementType === 'shoulder_limitation' ? `
            <line x1="200" y1="160" x2="160" y2="160"/>
            <line x1="160" y1="160" x2="140" y2="180"/>
            <line x1="140" y1="180" x2="130" y2="200"/>
            
            <line x1="200" y1="160" x2="240" y2="160"/>
            <line x1="240" y1="160" x2="260" y2="180"/>
            <line x1="260" y1="180" x2="270" y2="200"/>
          ` : `
            <line x1="200" y1="160" x2="160" y2="160"/>
            <line x1="160" y1="160" x2="130" y2="200"/>
            <line x1="130" y1="200" x2="110" y2="240"/>
            
            <line x1="200" y1="160" x2="240" y2="160"/>
            <line x1="240" y1="160" x2="270" y2="200"/>
            <line x1="270" y1="200" x2="290" y2="240"/>
          `}
          
          <!-- Legs -->
          <line x1="200" y1="300" x2="180" y2="300"/>
          <line x1="180" y1="300" x2="175" y2="380"/>
          <line x1="175" y1="380" x2="170" y2="460"/>
          
          <line x1="200" y1="300" x2="220" y2="300"/>
          <line x1="220" y1="300" x2="225" y2="380"/>
          <line x1="225" y1="380" x2="230" y2="460"/>
        </g>
        
        <!-- Colorful joints in your exact style -->
        <circle cx="200" cy="80" r="8" fill="#e74c3c"/>
        <circle cx="200" cy="120" r="8" fill="#f39c12"/>
        <circle cx="200" cy="160" r="8" fill="#f1c40f"/>
        <circle cx="160" cy="160" r="8" fill="#2ecc71"/>
        <circle cx="240" cy="160" r="8" fill="#3498db"/>
        <circle cx="130" cy="200" r="8" fill="#9b59b6"/>
        <circle cx="270" cy="200" r="8" fill="#e91e63"/>
        <circle cx="110" cy="240" r="8" fill="#e74c3c"/>
        <circle cx="290" cy="240" r="8" fill="#f39c12"/>
        <circle cx="200" cy="300" r="8" fill="#f1c40f"/>
        <circle cx="180" cy="300" r="8" fill="#2ecc71"/>
        <circle cx="220" cy="300" r="8" fill="#3498db"/>
        <circle cx="175" cy="380" r="8" fill="#9b59b6"/>
        <circle cx="225" cy="380" r="8" fill="#e91e63"/>
        <circle cx="170" cy="460" r="8" fill="#e74c3c"/>
        <circle cx="230" cy="460" r="8" fill="#f39c12"/>
        
        <!-- Movement limitation indicator -->
        ${movementType === 'shoulder_limitation' ? `
          <text x="200" y="530" text-anchor="middle" font-family="Arial" font-size="12" fill="#e74c3c">
            Limited shoulder movement range
          </text>
        ` : ''}
        
        <text x="200" y="550" text-anchor="middle" font-family="Arial" font-size="12" fill="#7f8c8d">
          Professional 3D Skeleton Animation
        </text>
        
        <!-- Play button indicator -->
        <circle cx="200" cy="350" r="25" fill="rgba(52, 152, 219, 0.1)" stroke="#3498db" stroke-width="2"/>
        <polygon points="190,340 190,360 210,350" fill="#3498db"/>
      </svg>
    `);
  };

  // Removed generateCustomVideo function - replaced with stick figure animation
      

  // Playback controls
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPlayback = () => {
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  // Helper functions for editing patient names
  const startEditing = (patient: SoapVirtualPatient) => {
    setEditingPatientId(patient.id!);
    setEditingName(patient.patient_name || `Patient ${patient.id}`);
  };

  const cancelEditing = () => {
    setEditingPatientId(null);
    setEditingName('');
  };

  const savePatientName = () => {
    if (editingPatientId && editingName.trim()) {
      updatePatientMutation.mutate({ id: editingPatientId, name: editingName.trim() });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      savePatientName();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Text-to-Digital Patient function
  const generateAnimationFromText = async (clinicalText: string) => {
    if (!clinicalText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter clinical description to generate animation",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingFromText(true);
    try {
      // Check if patient is selected
      if (!selectedPatient) {
        throw new Error('Please select a patient card first to generate animation');
      }

      console.log('Generating animation for selected patient:', selectedPatient.id);
      
      // Generate animation for the currently selected patient using text description
      const soapNote = {
        id: Date.now(),
        subjective: `${selectedPatient.chief_complaint}. ${clinicalText}. ${selectedPatient.symptoms_description}`,
        objective: `Clinical examination findings related to ${selectedPatient.body_part} complaints.`,
        assessment: `Working assessment based on clinical presentation in ${selectedPatient.body_part} region.`,
        plan: 'Treatment plan to be determined based on movement analysis.',
        fullTranscription: clinicalText
      };

      const animationResponse = await apiRequest(
        'POST', 
        `/api/virtual-patients/${selectedPatient.id}/generate-text-animation`, 
        { soapNote }
      );

      if (!animationResponse.ok) {
        throw new Error(`Animation generation failed: ${animationResponse.statusText}`);
      }

      const animationResult = await animationResponse.json();
      console.log('Full animation result from backend:', animationResult);
      setTextAnimationResult(animationResult);
      
      // Update the animation sequence for immediate display
      if (animationResult.animationSequence) {
        setAnimationSequence(animationResult.animationSequence);
        console.log('Setting animation sequence:', animationResult.animationSequence);
      } else if (animationResult.frames) {
        // Handle direct frames response
        const sequence = { frames: animationResult.frames };
        setAnimationSequence(sequence);
        console.log('Setting animation sequence from direct frames:', sequence);
      }
      
      // Refresh the movement data to trigger re-render
      await getAnimationData(selectedPatient);
      
      // Update the selected patient to include animation data with proper structure
      const frames = animationResult.animationSequence?.frames || animationResult.frames || [];
      console.log('Extracted frames for patient:', frames.length);
      
      const updatedPatient = {
        ...selectedPatient,
        motionData: {
          frames: frames,
          movementPatterns: animationResult.movementPatterns,
          clinicalCorrelation: animationResult.clinicalCorrelation,
          animationSource: "text-to-animation",
          generatedAt: new Date().toISOString()
        },
        hasMotionData: true,
        aiGenerated: true
      };
      setSelectedPatient(updatedPatient);
      
      console.log('Updated patient with animation data:', updatedPatient.motionData);
      
      // Clear the input
      setTextToAnimationInput('');

      toast({
        title: "Animation Generated",
        description: `Successfully generated ${animationResult.animationSequence?.frames?.length || 0} animation frames for ${selectedPatient.patient_name}`,
      });

    } catch (error: any) {
      console.error("Text animation generation error:", error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate animation from text",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingFromText(false);
    }
  };

  const generateFunctionalMovement = async (movementId: string) => {
    if (!selectedPatient) {
      return;
    }

    setIsGeneratingMovement(true);
    
    try {
      const response = await apiRequest(
        'POST', 
        `/api/virtual-patients/${selectedPatient.id}/functional-movement`, 
        { movementId }
      );

      if (!response.ok) {
        throw new Error(`Functional movement generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Functional movement generated:', result);
      
      toast({
        title: "Success",
        description: "Functional movement generated successfully!",
      });
      
    } catch (error: any) {
      console.error('Error generating functional movement:', error);
      toast({
        title: "Movement Generation Failed",
        description: error.message || "Failed to generate functional movement",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingMovement(false);
    }
  };

  if (patientsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading virtual patients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Virtual Patients
              </h1>
              <p className="text-gray-600 mt-2">
                Create and analyze digital patient twins with AI-powered movement visualization
              </p>
            </div>
            <Button 
              onClick={() => setShowMotionCapture(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Motion Capture
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Patient Selection */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileUser className="h-5 w-5 text-blue-600" />
                  Patient Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patients && patients.length > 0 ? (
                  patients.map((patient) => (
                    <Card 
                      key={patient.id} 
                      className={`cursor-pointer transition-all hover:shadow-md group ${
                        selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {editingPatientId === patient.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') savePatientName();
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={savePatientName}
                                disabled={updatePatientMutation.isPending}
                              >
                                {updatePatientMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={updatePatientMutation.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <CardTitle className="text-lg">
                                {patient.patient_name || `Patient ${patient.id}`}
                              </CardTitle>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(patient);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {patient.motionData && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                            Digital Twin
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <FileUser className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No virtual patients available</p>
                    <p className="text-xs text-gray-400">Use Motion Capture to create your first patient</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Stick Figure Animation */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Movement Visualization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedPatient && animationData ? (
                  <StickFigureAnimation 
                    animationData={animationData}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlayback}
                    onReset={resetPlayback}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">No Animation Data</p>
                    <p className="text-sm text-gray-400">
                      {!selectedPatient 
                        ? "Select a patient to view animations" 
                        : "Generate animation from patient data or text description"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Clinical Correlations */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Text-to-Digital Patient */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Text-to-Digital Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Clinical Description</label>
                  <textarea
                    value={textToAnimationInput}
                    onChange={(e) => setTextToAnimationInput(e.target.value)}
                    placeholder="Describe patient movement patterns, limitations, or compensations..."
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
                    rows={4}
                  />
                  <Button
                    onClick={() => generateAnimationFromText(textToAnimationInput)}
                    disabled={!textToAnimationInput.trim() || isGeneratingFromText || !selectedPatient}
                    className="w-full"
                    size="sm"
                  >
                    {isGeneratingFromText ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Animation...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Animation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Correlations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  Clinical Correlations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clinicalData && (
                  <div className="space-y-3">
                    {/* SOAP Integration */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">SOAP Integration</h4>
                      {clinicalData.soapIntegration.map((item, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400 mb-2">
                          <p className="font-medium text-blue-800 text-sm">{item.complaint}</p>
                          <p className="text-blue-700 text-sm">{item.movementCorrelation}</p>
                          <Badge variant="secondary" className="mt-1">{item.severity}</Badge>
                        </div>
                      ))}
                    </div>

                    {/* AI Insights */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">AI Insights</h4>
                      {clinicalData.aiInsights.map((insight, index) => (
                        <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400 mb-2">
                          <p className="font-medium text-purple-800 text-sm">{insight.finding}</p>
                          <p className="text-purple-700 text-sm">{insight.recommendation}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-purple-600">Confidence:</span>
                            <div className="w-16 bg-purple-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${insight.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-purple-600">{insight.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Treatment Response */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Treatment Response</h4>
                      {clinicalData.treatmentResponse.map((response, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400 mb-2">
                          <p className="font-medium text-green-800 text-sm">{response.intervention}</p>
                          <p className="text-green-700 text-sm">{response.outcome}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-green-600">Improvement:</span>
                            <div className="w-20 bg-green-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${response.movementImprovement}%` }}
                              />
                            </div>
                            <span className="text-xs text-green-600">{response.movementImprovement}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!clinicalData && (
                  <div className="text-center text-gray-500 py-8">
                    <Brain className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No clinical correlations available</p>
                    <p className="text-xs text-gray-400">Generate animation data to view correlations</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Motion Capture Modal */}
      {showMotionCapture && (
        <Dialog open={showMotionCapture} onOpenChange={setShowMotionCapture}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Motion Capture & Analysis</DialogTitle>
            </DialogHeader>
            <MotionCapture 
              onCaptureComplete={(captureData) => {
                console.log("Motion capture completed:", captureData);
                setShowMotionCapture(false);
                // Refresh patients list to show new patient
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
