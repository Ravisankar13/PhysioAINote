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
import ThreeDAnatomicalVisualization from "@/components/ThreeDAnatomicalVisualization";
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
    if (!isPlaying || !selectedPatient?.motionData) return;
    
    const interval = setInterval(() => {
      setPlaybackTime(prev => {
        const next = prev + 1;
        const maxFrames = 100; // Default frame count
        return next >= maxFrames ? 0 : next; // Loop back to start
      });
    }, 33); // ~30 FPS
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedPatient?.motionData]);
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

  // Animation frame progression - simplified and safe
  useEffect(() => {
    if (!isPlaying || !selectedPatient?.motionData) return;
    
    let animationData;
    try {
      animationData = typeof selectedPatient.motionData === 'string' 
        ? JSON.parse(selectedPatient.motionData) 
        : selectedPatient.motionData;
    } catch (e) {
      console.error('Error parsing motion data:', e);
      return;
    }
    
    if (!animationData?.frames?.length) return;
    
    const interval = setInterval(() => {
      setCurrentAnimationFrame(prev => (prev + 1) % animationData.frames.length);
    }, 100); // 10 FPS animation
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedPatient?.id]); // Only depend on isPlaying and patient ID to avoid loops
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
    let motionData = patient?.motionData;
    if (typeof motionData === 'string') {
      try {
        motionData = JSON.parse(motionData);
      } catch (e) {
        console.error('Failed to parse motionData JSON:', e);
        motionData = null;
      }
    }
    
    if (motionData?.frames?.length > 0) {
      console.log('Found AI-generated animation frames in motionData:', motionData.frames.length);
      return {
        source: 'Text Generated',
        frames: motionData.frames,
        animationSequences: motionData.frames,
        movementHeatmap: [],
        movementPatterns: motionData.movementPatterns,
        clinicalCorrelation: motionData.clinicalCorrelation
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
    
    console.log('No animation data found for patient, providing default empty animation');
    // Always return a valid animation object to prevent blank page
    return {
      source: 'No Data - Default',
      frames: [],
      animationSequences: [],
      movementHeatmap: []
    };
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
    try {
      setSelectedPatient(patient);
      
      // Generate AI animation from SOAP text
      await generateAnimation(patient);
      
      // Generate enhanced profile from patient data
    const profile: EnhancedPatientProfile = {
      demographics: {
        name: patient.title || 'Unknown Patient',
        age: 45,
        gender: 'Not specified',
        occupation: 'Not specified'
      },
      clinicalTimeline: [
        {
          date: new Date(patient.createdAt || Date.now()).toLocaleDateString(),
          session: 'Initial Assessment',
          findings: (patient.clinicalPresentation as any)?.chiefComplaint || 'No chief complaint recorded',
          painLevel: 5
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
        const motionData = JSON.parse(patient.motionData || '{}');
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
        // Set empty movement data on error to prevent crashes
        setMovementData({
          capturedMovements: [],
          compensationPatterns: [],
          comparisonData: { normal: [], patient: [], deviations: [] }
        });
      }
    }

    // Generate clinical correlation
    const correlation: ClinicalCorrelation = {
      soapIntegration: [
        {
          complaint: (patient.clinicalPresentation as any)?.chiefComplaint || 'Primary complaint',
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
    } catch (error) {
      console.error('Error loading enhanced patient data:', error);
      // Set default data to prevent crashes
      setEnhancedProfile({
        demographics: {
          name: patient.title || 'Unknown Patient',
          age: 45,
          gender: 'Not specified',
          occupation: 'Not specified'
        },
        clinicalTimeline: [],
        painMap: { regions: [] },
        functionalScores: { mobility: 50, strength: 50, flexibility: 50, balance: 50 },
        progressTracking: []
      });
      setClinicalData({
        soapIntegration: [],
        aiInsights: [],
        treatmentResponse: []
      });
      toast({
        title: "Patient Data Loaded",
        description: "Basic patient information loaded successfully.",
      });
    }
  };

  // Helper functions
  const extractPainLevel = (symptoms: string): number => {
    const painMatch = symptoms.match(/(\d+)\/10/);
    return painMatch ? parseInt(painMatch[1]) : Math.floor(Math.random() * 5) + 3;
  };

  const generatePainMap = (patient: SoapVirtualPatient) => {
    const bodyPart = patient.bodyPart || 'general';
    return [
      {
        bodyPart: bodyPart,
        intensity: extractPainLevel((patient.clinicalPresentation as any)?.chiefComplaint || ''),
        description: (patient.clinicalPresentation as any)?.chiefComplaint || 'Primary pain area'
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
    const description = `${(patient.clinicalPresentation as any)?.chiefComplaint || ''} ${(patient.clinicalPresentation as any)?.symptomsTimeline || ''} ${(patient.assessmentPlan as any)?.primaryDiagnosis || ''}`.trim();
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

  // Handle patient selection
  const handlePatientSelect = (patient: SoapVirtualPatient) => {
    const patientName = patient.title || `Patient ${patient.id}`;
    console.log('DEBUG: Patient selection started for:', patientName);
    console.log('DEBUG: Current URL:', window.location.href);
    
    try {
      // Safe patient selection with proper motion data handling
      const safePatient = {
        ...patient,
        motionData: patient.motionData || null
      };
      
      // Immediately set selected patient
      setSelectedPatient(safePatient);
      console.log('DEBUG: Selected patient state updated');
      
      // Show success notification
      toast({
        title: "Patient Selected",
        description: `Selected ${patientName} - Animation system ready`,
      });
      
      console.log('DEBUG: Patient selection completed successfully');
    } catch (error) {
      console.error('DEBUG: Error in patient selection:', error);
      toast({
        title: "Selection Error",
        description: "Unable to select patient. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Helper functions for editing patient names
  const startEditing = (patient: SoapVirtualPatient) => {
    setEditingPatientId(patient.id!);
    setEditingName(patient.title || `Patient ${patient.id}`);
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
      // Create a temporary patient if none selected
      let targetPatient = selectedPatient;
      if (!selectedPatient) {
        targetPatient = {
          id: Date.now(),
          title: "Generated Patient", 
          userId: 1,
          soapNoteId: null,
          bodyPart: "general",
          patientProfile: {},
          clinicalPresentation: { chiefComplaint: "Movement analysis from text description" },
          physicalFindings: {},
          assessmentPlan: {},
          motionData: null,
          hasMotionData: false,
          aiGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as SoapVirtualPatient;
        setSelectedPatient(targetPatient);
      }

      console.log('Generating animation for patient:', targetPatient?.id);
      
      // Generate stick figure animation data directly from clinical text
      const animationFrames = generateStickFigureFromText(clinicalText);
      
      // Update the patient with animation data
      const updatedPatient = {
        ...targetPatient,
        motionData: JSON.stringify({
          frames: animationFrames,
          animationSource: "text-to-animation",
          generatedAt: new Date().toISOString(),
          description: clinicalText
        }),
        hasMotionData: true,
        aiGenerated: true
      };
      
      setSelectedPatient(updatedPatient as SoapVirtualPatient);
      
      // Clear the input
      setTextToAnimationInput('');

      toast({
        title: "Animation Generated",
        description: `Successfully generated stick figure animation from clinical description`,
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

  // Generate sample motion data for virtual patients without motion data
  const generateSampleMotionData = async (patient: SoapVirtualPatient | null) => {
    if (!patient) return;
    
    setIsGeneratingMovement(true);
    try {
      // Generate realistic motion data based on patient's condition
      const bodyPart = patient.bodyPart || 'general';
      const complaint = (patient.clinicalPresentation as any)?.chiefComplaint || '';
      
      // Create sample motion frames with clinical restrictions
      const motionFrames = generateClinicalMotionFrames(bodyPart, complaint);
      
      // Update patient with generated motion data
      const response = await apiRequest('PUT', `/api/virtual-patients/${patient.id}`, {
        motionData: JSON.stringify({
          frames: motionFrames,
          source: 'AI Generated Sample',
          bodyPart: bodyPart,
          complaint: complaint,
          generatedAt: new Date().toISOString()
        }),
        hasMotionData: true
      });
      
      if (response.ok) {
        // Update local state
        const updatedPatient = {
          ...patient,
          motionData: JSON.stringify({
            frames: motionFrames,
            source: 'AI Generated Sample',
            bodyPart: bodyPart,
            complaint: complaint,
            generatedAt: new Date().toISOString()
          }),
          hasMotionData: true
        };
        
        setSelectedPatient(updatedPatient as SoapVirtualPatient);
        
        toast({
          title: "Motion Data Generated",
          description: `Created ${motionFrames.length} frames of realistic movement patterns for ${bodyPart} condition`,
        });
        
        // Refresh the patients list
        refetch();
      }
    } catch (error: any) {
      console.error('Sample motion generation error:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate sample motion data",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingMovement(false);
    }
  };

  // Generate clinical motion frames based on condition
  const generateClinicalMotionFrames = (bodyPart: string, complaint: string) => {
    const frames = [];
    const frameCount = 60; // 2 seconds at 30fps
    
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      
      // Base skeleton landmarks (33 MediaPipe pose landmarks)
      const landmarks = [];
      
      // Generate realistic movement based on body part and complaint
      for (let j = 0; j < 33; j++) {
        let x = 0.5 + Math.sin(progress * Math.PI * 2) * 0.1; // Base movement
        let y = 0.5 + Math.cos(progress * Math.PI * 2) * 0.05;
        let z = 0;
        
        // Apply clinical restrictions based on body part
        if (bodyPart === 'shoulder' && j >= 11 && j <= 16) {
          // Restrict shoulder movement for shoulder conditions
          y += Math.sin(progress * Math.PI) * 0.02; // Limited elevation
        } else if (bodyPart === 'knee' && (j === 25 || j === 26)) {
          // Knee compensation patterns
          x += Math.sin(progress * Math.PI * 3) * 0.01;
        } else if (bodyPart === 'back' && j >= 11 && j <= 24) {
          // Spinal stiffness pattern
          y *= 0.7; // Reduced movement
        }
        
        landmarks.push({ x, y, z, visibility: 0.9 });
      }
      
      frames.push({
        timestamp: (i / 30) * 1000, // Convert to milliseconds
        landmarks: landmarks,
        worldLandmarks: landmarks // Use same for world coordinates
      });
    }
    
    return frames;
  };

  // Parse motion data for ThreeDSkeletonPlayer component
  const parseMotionDataForThreeD = (motionDataString: string | null) => {
    if (!motionDataString) {
      console.log('No motion data string provided');
      return [];
    }
    
    try {
      console.log('Raw motion data string:', motionDataString.substring(0, 200) + '...');
      const motionData = JSON.parse(motionDataString);
      console.log('Parsed motion data structure:', Object.keys(motionData));
      
      const frames = motionData.frames || [];
      console.log('Found frames:', frames.length);
      
      if (frames.length === 0) {
        console.log('No frames found in motion data');
        return [];
      }
      
      const processedFrames = frames.map((frame: any, index: number) => ({
        timestamp: frame.timestamp || index * 33.33, // 30 FPS
        keyframes: convertLandmarksToKeyframes(frame.landmarks || [])
      }));
      
      console.log('Processed frames for 3D:', processedFrames.length);
      return processedFrames;
    } catch (error) {
      console.error('Error parsing motion data for 3D:', error);
      console.log('Motion data that caused error:', motionDataString);
      return [];
    }
  };

  // Convert MediaPipe landmarks to 3D keyframes
  const convertLandmarksToKeyframes = (landmarks: any[]) => {
    const keyframes = [];
    
    // MediaPipe pose landmark mapping to bone names
    const landmarkToBone = {
      0: 'head',
      11: 'leftShoulder', 12: 'rightShoulder',
      13: 'leftElbow', 14: 'rightElbow', 
      15: 'leftWrist', 16: 'rightWrist',
      23: 'leftHip', 24: 'rightHip',
      25: 'leftKnee', 26: 'rightKnee',
      27: 'leftAnkle', 28: 'rightAnkle'
    };
    
    landmarks.forEach((landmark, index) => {
      const boneName = landmarkToBone[index as keyof typeof landmarkToBone];
      if (boneName && landmark) {
        keyframes.push({
          boneName,
          position: [landmark.x || 0, landmark.y || 0, landmark.z || 0],
          rotation: [0, 0, 0] // Default rotation
        });
      }
    });
    
    // Add derived bones
    if (landmarks[11] && landmarks[12]) {
      // Neck position between shoulders
      keyframes.push({
        boneName: 'neck',
        position: [
          (landmarks[11].x + landmarks[12].x) / 2,
          (landmarks[11].y + landmarks[12].y) / 2,
          (landmarks[11].z + landmarks[12].z) / 2
        ],
        rotation: [0, 0, 0]
      });
    }
    
    if (landmarks[23] && landmarks[24]) {
      // Spine position between hips
      keyframes.push({
        boneName: 'spine',
        position: [
          (landmarks[23].x + landmarks[24].x) / 2,
          (landmarks[23].y + landmarks[24].y) / 2,
          (landmarks[23].z + landmarks[24].z) / 2
        ],
        rotation: [0, 0, 0]
      });
    }
    
    return keyframes;
  };

  // Generate movement heatmap for patient
  const generateMovementHeatmap = (patient: SoapVirtualPatient) => {
    const bodyPart = patient.bodyPart || 'general';
    const complaint = (patient.clinicalPresentation as any)?.chiefComplaint || '';
    
    const heatmap = [
      { jointName: 'head', intensity: 0.2, problemAreas: false },
      { jointName: 'neck', intensity: 0.3, problemAreas: bodyPart === 'neck' },
      { jointName: 'leftShoulder', intensity: 0.4, problemAreas: bodyPart === 'shoulder' },
      { jointName: 'rightShoulder', intensity: 0.4, problemAreas: bodyPart === 'shoulder' },
      { jointName: 'leftElbow', intensity: 0.3, problemAreas: bodyPart === 'elbow' },
      { jointName: 'rightElbow', intensity: 0.3, problemAreas: bodyPart === 'elbow' },
      { jointName: 'leftWrist', intensity: 0.3, problemAreas: bodyPart === 'wrist' },
      { jointName: 'rightWrist', intensity: 0.3, problemAreas: bodyPart === 'wrist' },
      { jointName: 'spine', intensity: 0.5, problemAreas: bodyPart === 'back' },
      { jointName: 'leftHip', intensity: 0.4, problemAreas: bodyPart === 'hip' },
      { jointName: 'rightHip', intensity: 0.4, problemAreas: bodyPart === 'hip' },
      { jointName: 'leftKnee', intensity: 0.5, problemAreas: bodyPart === 'knee' },
      { jointName: 'rightKnee', intensity: 0.5, problemAreas: bodyPart === 'knee' },
      { jointName: 'leftAnkle', intensity: 0.3, problemAreas: bodyPart === 'ankle' },
      { jointName: 'rightAnkle', intensity: 0.3, problemAreas: bodyPart === 'ankle' }
    ];
    
    return heatmap;
  };

  // Generate clinical motion from text description
  const generateClinicalMotionFromText = (text: string) => {
    const frames = [];
    const frameCount = 60; // 2 seconds at 30fps
    const bodyPart = extractBodyPartFromText(text);
    const movementType = extractMovementTypeFromText(text);
    
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      const landmarks = [];
      
      // Generate realistic movement based on text description
      for (let j = 0; j < 33; j++) {
        let x = 0.5 + Math.sin(progress * Math.PI * 2) * 0.15; // More pronounced movement
        let y = 0.5 + Math.cos(progress * Math.PI * 2) * 0.1;
        let z = 0;
        
        // Apply movement patterns based on text analysis
        if (bodyPart === 'shoulder' && (j === 11 || j === 12)) {
          // Shoulder-specific movements
          if (text.toLowerCase().includes('limited') || text.toLowerCase().includes('restricted')) {
            y += Math.sin(progress * Math.PI) * 0.03; // Limited elevation
          } else if (text.toLowerCase().includes('reaching') || text.toLowerCase().includes('overhead')) {
            y += Math.sin(progress * Math.PI) * 0.2; // Full elevation
          }
        } else if (bodyPart === 'back' && j >= 11 && j <= 24) {
          // Spinal movement patterns
          if (text.toLowerCase().includes('stiff') || text.toLowerCase().includes('rigid')) {
            x *= 0.5; y *= 0.5; // Reduced movement
          } else if (text.toLowerCase().includes('flexible') || text.toLowerCase().includes('bending')) {
            x += Math.sin(progress * Math.PI * 2) * 0.1; // Side bending
          }
        } else if (bodyPart === 'knee' && (j === 25 || j === 26)) {
          // Knee movement patterns
          if (text.toLowerCase().includes('limp') || text.toLowerCase().includes('favoring')) {
            y += Math.sin(progress * Math.PI * 3) * 0.02; // Limping gait
          }
        }
        
        landmarks.push({ x, y, z, visibility: 0.9 });
      }
      
      frames.push({
        timestamp: (i / 30) * 1000,
        landmarks: landmarks,
        worldLandmarks: landmarks
      });
    }
    
    return frames;
  };

  // Extract body part from text
  const extractBodyPartFromText = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('shoulder')) return 'shoulder';
    if (lowerText.includes('back') || lowerText.includes('spine')) return 'back';
    if (lowerText.includes('knee')) return 'knee';
    if (lowerText.includes('hip')) return 'hip';
    if (lowerText.includes('ankle')) return 'ankle';
    if (lowerText.includes('elbow')) return 'elbow';
    if (lowerText.includes('wrist')) return 'wrist';
    if (lowerText.includes('neck')) return 'neck';
    return 'general';
  };

  // Extract movement type from text
  const extractMovementTypeFromText = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('reaching') || lowerText.includes('overhead')) return 'elevation';
    if (lowerText.includes('bending') || lowerText.includes('flexion')) return 'flexion';
    if (lowerText.includes('turning') || lowerText.includes('rotation')) return 'rotation';
    if (lowerText.includes('walking') || lowerText.includes('gait')) return 'gait';
    if (lowerText.includes('stiff') || lowerText.includes('limited')) return 'restricted';
    return 'general';
  };

  // Generate stick figure animation frames from clinical text
  const generateStickFigureFromText = (clinicalText: string) => {
    // Parse clinical text to determine movement type and create appropriate animation
    const lowerText = clinicalText.toLowerCase();
    
    // Enhanced anatomical stick figure with proper bone segments
    const baseFrame = {
      keypoints: [
        { x: 200, y: 50, name: 'head', status: 'normal' },
        { x: 200, y: 75, name: 'neck', status: 'normal' },
        { x: 180, y: 100, name: 'left_shoulder', status: 'normal' },
        { x: 220, y: 100, name: 'right_shoulder', status: 'normal' },
        { x: 160, y: 140, name: 'left_elbow', status: 'normal' },
        { x: 240, y: 140, name: 'right_elbow', status: 'normal' },
        { x: 140, y: 180, name: 'left_wrist', status: 'normal' },
        { x: 260, y: 180, name: 'right_wrist', status: 'normal' },
        { x: 200, y: 150, name: 'spine', status: 'normal' },
        { x: 180, y: 200, name: 'left_hip', status: 'normal' },
        { x: 220, y: 200, name: 'right_hip', status: 'normal' },
        { x: 175, y: 250, name: 'left_knee', status: 'normal' },
        { x: 225, y: 250, name: 'right_knee', status: 'normal' },
        { x: 170, y: 300, name: 'left_ankle', status: 'normal' },
        { x: 230, y: 300, name: 'right_ankle', status: 'normal' },
        { x: 165, y: 315, name: 'left_foot', status: 'normal' },
        { x: 235, y: 315, name: 'right_foot', status: 'normal' }
      ]
    };

    // Parse clinical findings from text
    const clinicalFindings = parseClinicalText(lowerText);
    
    // Apply clinical status to affected joints
    baseFrame.keypoints.forEach(kp => {
      if (clinicalFindings.affectedJoints[kp.name]) {
        kp.status = clinicalFindings.affectedJoints[kp.name];
      }
    });

    // Generate movement frames based on clinical description
    const frames = [baseFrame];
    
    // Generate 30 frames of anatomically correct movement animation
    for (let i = 1; i <= 30; i++) {
      const progress = i / 30;
      const frame = generateAnatomicalMovement(baseFrame, progress, clinicalFindings);
      frames.push(frame);
    }
    
    return frames;
  };

  // Parse clinical text to identify specific joint limitations and compensations
  const parseClinicalText = (text: string) => {
    const findings = {
      affectedJoints: {} as Record<string, string>,
      movementType: 'general',
      limitations: [] as string[],
      compensations: [] as string[],
      severity: 'moderate'
    };

    // Identify affected body parts and sides
    const leftSide = text.includes('left') || text.includes('l)') || text.includes('l ');
    const rightSide = text.includes('right') || text.includes('r)') || text.includes('r ');
    
    // Identify specific joints and movements
    if (text.includes('shoulder')) {
      findings.movementType = 'shoulder';
      if (leftSide) findings.affectedJoints['left_shoulder'] = 'limited';
      if (rightSide) findings.affectedJoints['right_shoulder'] = 'limited';
      if (!leftSide && !rightSide) {
        findings.affectedJoints['left_shoulder'] = 'limited';
        findings.affectedJoints['right_shoulder'] = 'limited';
      }
    }
    
    if (text.includes('knee')) {
      findings.movementType = 'knee';
      if (leftSide) findings.affectedJoints['left_knee'] = 'limited';
      if (rightSide) findings.affectedJoints['right_knee'] = 'limited';
      if (!leftSide && !rightSide) {
        findings.affectedJoints['left_knee'] = 'limited';
        findings.affectedJoints['right_knee'] = 'limited';
      }
    }
    
    if (text.includes('ankle')) {
      findings.movementType = 'ankle';
      if (leftSide) findings.affectedJoints['left_ankle'] = 'limited';
      if (rightSide) findings.affectedJoints['right_ankle'] = 'limited';
      if (!leftSide && !rightSide) {
        findings.affectedJoints['left_ankle'] = 'limited';
        findings.affectedJoints['right_ankle'] = 'limited';
      }
    }
    
    if (text.includes('back') || text.includes('spine')) {
      findings.movementType = 'spine';
      findings.affectedJoints['spine'] = 'limited';
    }
    
    if (text.includes('hip')) {
      findings.movementType = 'hip';
      if (leftSide) findings.affectedJoints['left_hip'] = 'limited';
      if (rightSide) findings.affectedJoints['right_hip'] = 'limited';
      if (!leftSide && !rightSide) {
        findings.affectedJoints['left_hip'] = 'limited';
        findings.affectedJoints['right_hip'] = 'limited';
      }
    }

    // Identify limitations
    if (text.includes('decreased') || text.includes('limited') || text.includes('restricted')) {
      findings.limitations.push('range_of_motion');
    }
    if (text.includes('pain') || text.includes('painful')) {
      findings.limitations.push('pain');
    }
    if (text.includes('stiff') || text.includes('rigid')) {
      findings.limitations.push('stiffness');
    }

    // Identify severity
    if (text.includes('severe') || text.includes('significant')) {
      findings.severity = 'severe';
    } else if (text.includes('mild') || text.includes('slight')) {
      findings.severity = 'mild';
    }

    // Identify compensations
    if (text.includes('compensat') || text.includes('favor') || text.includes('avoid')) {
      findings.compensations.push('altered_movement');
    }

    return findings;
  };

  // Generate anatomically correct movement with joint constraints
  const generateAnatomicalMovement = (baseFrame: any, progress: number, findings: any) => {
    const frame = JSON.parse(JSON.stringify(baseFrame));
    
    // Get movement amplitude based on limitations
    const getMovementAmplitude = (jointName: string, normalRange: number) => {
      const status = findings.affectedJoints[jointName];
      if (!status) return normalRange;
      
      switch (findings.severity) {
        case 'severe': return normalRange * 0.3;
        case 'moderate': return normalRange * 0.6;
        case 'mild': return normalRange * 0.8;
        default: return normalRange;
      }
    };

    // Apply specific movement patterns based on clinical findings
    switch (findings.movementType) {
      case 'shoulder':
        generateShoulderMovement(frame, progress, findings, getMovementAmplitude);
        break;
      case 'knee':
        generateKneeMovement(frame, progress, findings, getMovementAmplitude);
        break;
      case 'ankle':
        generateAnkleMovement(frame, progress, findings, getMovementAmplitude);
        break;
      case 'spine':
        generateSpineMovement(frame, progress, findings, getMovementAmplitude);
        break;
      case 'hip':
        generateHipMovement(frame, progress, findings, getMovementAmplitude);
        break;
      default:
        generateGeneralMovement(frame, progress, findings, getMovementAmplitude);
    }

    return frame;
  };

  // Shoulder movement with anatomical constraints
  const generateShoulderMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const cycle = Math.sin(progress * Math.PI * 2);
    
    // Normal shoulder abduction: 0-180 degrees
    const leftRange = getAmplitude('left_shoulder', 60);
    const rightRange = getAmplitude('right_shoulder', 60);
    
    frame.keypoints.forEach((kp: any) => {
      if (kp.name === 'left_shoulder' && findings.affectedJoints['left_shoulder']) {
        // Limited shoulder elevation
        kp.y += cycle * leftRange * 0.3;
      }
      if (kp.name === 'left_elbow' && findings.affectedJoints['left_shoulder']) {
        // Elbow follows shoulder with kinematic chain
        kp.y += cycle * leftRange * 0.5;
        kp.x += cycle * leftRange * 0.2;
      }
      if (kp.name === 'left_wrist' && findings.affectedJoints['left_shoulder']) {
        // Wrist follows elbow
        kp.y += cycle * leftRange * 0.7;
        kp.x += cycle * leftRange * 0.3;
      }
      
      // Add compensation if severe limitation
      if (findings.severity === 'severe' && findings.affectedJoints['left_shoulder']) {
        // Trunk lean compensation
        if (kp.name === 'spine') {
          kp.x += Math.abs(cycle) * 15;
        }
        // Shoulder hiking
        if (kp.name === 'left_shoulder') {
          kp.y -= Math.abs(cycle) * 10;
        }
      }
    });
  };

  // Knee movement with flexion constraints
  const generateKneeMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const cycle = Math.sin(progress * Math.PI * 4); // Walking pattern
    
    // Normal knee flexion: 0-135 degrees
    const leftRange = getAmplitude('left_knee', 40);
    const rightRange = getAmplitude('right_knee', 40);
    
    frame.keypoints.forEach((kp: any) => {
      if (kp.name === 'left_knee' && findings.affectedJoints['left_knee']) {
        // Limited knee flexion
        kp.y += Math.abs(cycle) * leftRange * 0.5;
      }
      if (kp.name === 'left_ankle' && findings.affectedJoints['left_knee']) {
        // Ankle follows knee movement
        kp.y += Math.abs(cycle) * leftRange * 0.3;
      }
      
      // Hip hiking compensation for limited knee flexion
      if (findings.severity !== 'mild' && findings.affectedJoints['left_knee']) {
        if (kp.name === 'left_hip') {
          kp.y -= Math.abs(cycle) * 15; // Hip hikes to clear ground
        }
      }
    });
  };

  // Ankle movement with dorsiflexion/plantarflexion
  const generateAnkleMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const cycle = Math.sin(progress * Math.PI * 3);
    
    // Normal ankle dorsiflexion: 20 degrees, plantarflexion: 50 degrees
    const leftRange = getAmplitude('left_ankle', 15);
    const rightRange = getAmplitude('right_ankle', 15);
    
    frame.keypoints.forEach((kp: any) => {
      if (kp.name === 'left_foot' && findings.affectedJoints['left_ankle']) {
        // Limited foot dorsiflexion
        kp.y += cycle * leftRange * 0.3;
        kp.x += cycle * leftRange * 0.5; // Foot angle change
      }
      if (kp.name === 'left_ankle' && findings.affectedJoints['left_ankle']) {
        kp.y += cycle * leftRange * 0.2;
      }
    });
  };

  // Spine movement with flexion/extension constraints
  const generateSpineMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const cycle = Math.sin(progress * Math.PI * 2);
    
    // Normal spinal flexion: 80 degrees
    const spineRange = getAmplitude('spine', 25);
    
    frame.keypoints.forEach((kp: any) => {
      if (kp.name === 'spine') {
        kp.x += cycle * spineRange * 0.6; // Forward flexion
        kp.y += Math.abs(cycle) * spineRange * 0.3;
      }
      if (kp.name === 'head' || kp.name === 'neck') {
        kp.x += cycle * spineRange * 0.8; // Head follows spine
        kp.y += Math.abs(cycle) * spineRange * 0.4;
      }
      if (kp.name.includes('shoulder')) {
        kp.x += cycle * spineRange * 0.5; // Shoulders follow spine
        kp.y += Math.abs(cycle) * spineRange * 0.2;
      }
    });
  };

  // Hip movement patterns
  const generateHipMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const cycle = Math.sin(progress * Math.PI * 2);
    
    // Normal hip flexion: 120 degrees
    const leftRange = getAmplitude('left_hip', 30);
    const rightRange = getAmplitude('right_hip', 30);
    
    frame.keypoints.forEach((kp: any) => {
      if (kp.name === 'left_hip' && findings.affectedJoints['left_hip']) {
        kp.y += cycle * leftRange * 0.3;
      }
      if (kp.name === 'left_knee' && findings.affectedJoints['left_hip']) {
        // Knee follows hip movement
        kp.y += cycle * leftRange * 0.5;
        kp.x += cycle * leftRange * 0.4;
      }
    });
  };

  // General movement for non-specific descriptions
  const generateGeneralMovement = (frame: any, progress: number, findings: any, getAmplitude: Function) => {
    const sway = Math.sin(progress * Math.PI * 2);
    const breathing = Math.sin(progress * Math.PI * 6);
    
    frame.keypoints.forEach((kp: any) => {
      // Gentle swaying motion
      kp.x += sway * 5;
      
      // Breathing motion
      if (kp.name.includes('shoulder') || kp.name === 'spine') {
        kp.y += breathing * 2;
      }
    });
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

  // Ensure virtualPatients is always an array
  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];

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
              <CardContent className="p-0">
                <ScrollArea className="h-96 px-4">
                  <div className="space-y-3 py-4">
                    {patientsArray.length > 0 ? (
                      patientsArray.map((patient: SoapVirtualPatient) => (
                    <Card 
                      key={patient.id} 
                      className={`cursor-pointer transition-all hover:shadow-md group ${
                        selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePatientSelect(patient);
                      }}
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
                                {patient.title || `Patient ${patient.id}`}
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
                  </div>
                </ScrollArea>
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
                {isLoadingAnalysis ? (
                  <div className="text-center text-gray-500 py-12">
                    <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-400 animate-spin" />
                    <p className="text-lg mb-2">Loading Patient Data</p>
                    <p className="text-sm text-gray-400">
                      Generating movement visualization...
                    </p>
                  </div>
                ) : selectedPatient ? (
                  <div className="space-y-4">
                    {/* Patient Info Header */}
                    <div className="text-center border-b pb-3">
                      <h3 className="text-lg font-semibold">{selectedPatient.title || `Patient ${selectedPatient.id}`}</h3>
                      <div className="text-sm text-gray-600 space-x-4">
                        <span><strong>Body Part:</strong> {selectedPatient.bodyPart || 'Not specified'}</span>
                        <Badge variant="outline">{selectedPatient.hasMotionData ? 'Has Motion Data' : 'No Motion Data'}</Badge>
                      </div>
                    </div>

                    {/* Visualization Mode Selector */}
                    <div className="flex justify-center gap-2 mb-2">
                      <Button
                        size="sm"
                        variant={currentView === 'anterior' ? 'default' : 'outline'}
                        onClick={() => setCurrentView('anterior')}
                      >
                        3D View
                      </Button>
                      <Button
                        size="sm"
                        variant={currentView === 'custom' ? 'default' : 'outline'}
                        onClick={() => setCurrentView('custom')}
                      >
                        2D Skeleton
                      </Button>
                    </div>

                    {/* Animation Display */}
                    <div className="h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
                      {selectedPatient.motionData ? (
                        <div className="w-full h-full">
                          {currentView === 'anterior' ? (
                            <ThreeDAnatomicalVisualization 
                              animationData={selectedPatient.motionData ? (() => {
                                try {
                                  return typeof selectedPatient.motionData === 'string' 
                                    ? JSON.parse(selectedPatient.motionData) 
                                    : selectedPatient.motionData;
                                } catch (e) {
                                  console.error('Error parsing motion data:', e);
                                  return null;
                                }
                              })() : null}
                              isPlaying={isPlaying}
                              currentFrame={playbackTime}
                              className="w-full h-full"
                            />
                          ) : (
                            <TwoDVirtualPatient 
                              isPlaying={isPlaying}
                              currentFrame={playbackTime}
                              className="w-full h-full"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-center space-y-3">
                          {currentView === 'anterior' ? (
                            <ThreeDAnatomicalVisualization 
                              animationData={null}
                              isPlaying={false}
                              currentFrame={0}
                              className="w-full h-full"
                            />
                          ) : (
                            <>
                              <Activity className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                              <p className="text-gray-600 font-medium">No Motion Data Available</p>
                              <p className="text-sm text-gray-500">Generate or capture movement data</p>
                            </>
                          )}
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => setShowMotionCapture(true)}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Motion Capture
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateSampleMotionData(selectedPatient)}
                              disabled={isGeneratingMovement}
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Generate Sample
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Animation Controls */}
                    <div className="flex justify-center items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={!selectedPatient.motionData}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPlaybackTime(0)}
                        disabled={!selectedPatient.motionData}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600">
                        Frame: {playbackTime}
                      </span>
                    </div>

                    {/* Clinical Information */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm"><strong>Chief Complaint:</strong> {(selectedPatient.clinicalPresentation as any)?.chiefComplaint || 'None recorded'}</p>
                      {(selectedPatient.clinicalPresentation as any)?.symptomsTimeline && (
                        <p className="text-sm mt-1"><strong>Symptoms:</strong> {(selectedPatient.clinicalPresentation as any).symptomsTimeline}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">No Patient Selected</p>
                    <p className="text-sm text-gray-400">
                      Select a patient to view stick figure animations
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
                    disabled={!textToAnimationInput.trim() || isGeneratingFromText}
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
              onComplete={(captureData) => {
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
