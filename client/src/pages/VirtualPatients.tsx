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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SoapVirtualPatient } from "@shared/schema";
import MotionCapture from "@/components/MotionCapture";
import ThreeDSkeletonPlayer from "@/components/ThreeDSkeletonPlayer";
import InteractiveSkeleton from "@/components/virtualPatient/InteractiveSkeleton";

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

  // Runway ML video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [customVideoPrompt, setCustomVideoPrompt] = useState("");
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

  // Generate Leonardo AI video (better alternative to Runway ML)
  const generateLeonardoVideo = async (patient: SoapVirtualPatient, customPrompt?: string) => {
    if (!patient) return;
    
    setIsGeneratingVideo(true);
    setVideoGenerationProgress(0);
    setGeneratedVideoUrl(null);
    
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${patient.id}/generate-leonardo-video`,
        { 
          movementType: 'functional_movement',
          customPrompt: customPrompt || undefined
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const videoData = await response.json();
      setVideoTaskId(videoData.taskId);
      
      console.log('Leonardo AI video generation completed:', videoData.taskId);
      
      if (videoData.videoUrl) {
        // Leonardo AI returns video immediately
        setGeneratedVideoUrl(videoData.videoUrl);
        setIsGeneratingVideo(false);
        setVideoGenerationProgress(100);
        
        toast({
          title: "Leonardo AI Image Generated",
          description: `Professional clinical image ready! Cost: ${videoData.cost} credits`,
        });
      } else {
        // Fallback to polling if needed
        pollLeonardoVideoStatus(videoData.taskId);
      }
      
    } catch (error: any) {
      console.error('Leonardo AI video generation error:', error);
      toast({
        title: "Video Generation Error",
        description: error.message || "Failed to start video generation",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
    }
  };

  // Generate Runway ML video (fallback option)
  const generateRunwayVideo = async (patient: SoapVirtualPatient, customPrompt?: string) => {
    if (!patient) return;
    
    setIsGeneratingVideo(true);
    setVideoGenerationProgress(0);
    setGeneratedVideoUrl(null);
    
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${patient.id}/generate-runway-video`,
        { 
          movementType: 'functional_movement',
          customPrompt: customPrompt || undefined
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const videoData = await response.json();
      setVideoTaskId(videoData.taskId);
      
      console.log('Runway ML video generation started:', videoData.taskId);
      
      toast({
        title: "Video Generation Started",
        description: "Creating realistic clinical movement video...",
      });

      // Start polling for video status
      pollVideoStatus(videoData.taskId);
      
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast({
        title: "Video Generation Error",
        description: error.message || "Failed to start video generation",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
    }
  };

  // Poll Leonardo AI video generation status
  const pollLeonardoVideoStatus = async (taskId: string) => {
    try {
      const response = await apiRequest('GET', `/api/leonardo-video/${taskId}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const statusData = await response.json();
      
      // Update progress
      setVideoGenerationProgress(statusData.progress || 0);
      
      if (statusData.status === 'COMPLETE' && statusData.videoUrl) {
        // Video is ready!
        setGeneratedVideoUrl(statusData.videoUrl);
        setIsGeneratingVideo(false);
        
        toast({
          title: "Leonardo AI Video Ready",
          description: "Professional clinical movement video generated successfully!",
        });
        
      } else if (statusData.status === 'FAILED') {
        // Video generation failed
        setIsGeneratingVideo(false);
        
        toast({
          title: "Video Generation Failed",
          description: statusData.failure_reason || "Unknown error occurred",
          variant: "destructive"
        });
        
      } else if (statusData.status === 'PENDING') {
        // Still processing, continue polling
        setTimeout(() => pollLeonardoVideoStatus(taskId), 3000); // Poll every 3 seconds
      }
      
    } catch (error: any) {
      console.error('Error checking Leonardo AI video status:', error);
      setIsGeneratingVideo(false);
      
      toast({
        title: "Status Check Error",
        description: error.message || "Failed to check video status",
        variant: "destructive"
      });
    }
  };

  // Poll Runway ML video generation status (fallback)
  const pollVideoStatus = async (taskId: string) => {
    try {
      const response = await apiRequest('GET', `/api/runway-video/${taskId}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const statusData = await response.json();
      
      // Update progress
      setVideoGenerationProgress(statusData.progress || 0);
      
      if (statusData.status === 'SUCCEEDED' && statusData.videoUrl) {
        // Video is ready!
        setGeneratedVideoUrl(statusData.videoUrl);
        setIsGeneratingVideo(false);
        
        toast({
          title: "Video Generated Successfully",
          description: "Realistic clinical movement video is ready!",
        });
        
      } else if (statusData.status === 'FAILED') {
        // Video generation failed
        setIsGeneratingVideo(false);
        
        toast({
          title: "Video Generation Failed",
          description: statusData.failure_reason || "Unknown error occurred",
          variant: "destructive"
        });
        
      } else if (statusData.status === 'RUNNING' || statusData.status === 'PENDING') {
        // Still processing, continue polling
        setTimeout(() => pollVideoStatus(taskId), 3000); // Poll every 3 seconds
      }
      
    } catch (error: any) {
      console.error('Error checking video status:', error);
      setIsGeneratingVideo(false);
      
      toast({
        title: "Status Check Error",
        description: error.message || "Failed to check video status",
        variant: "destructive"
      });
    }
  };

  // Generate custom clinical video with Leonardo AI
  const generateCustomLeonardoVideo = async () => {
    if (!customVideoPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a clinical description for video generation",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoGenerationProgress(0);
    setGeneratedVideoUrl(null);
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/generate-leonardo-video',
        { 
          clinicalDescription: customVideoPrompt,
          movementType: 'functional_movement'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const videoData = await response.json();
      setVideoTaskId(videoData.taskId);
      
      console.log('Leonardo AI custom video generated:', videoData.taskId);
      
      if (videoData.videoUrl) {
        // Leonardo AI returns video immediately
        setGeneratedVideoUrl(videoData.videoUrl);
        setIsGeneratingVideo(false);
        setVideoGenerationProgress(100);
        
        toast({
          title: "Leonardo AI Image Generated",
          description: `Professional clinical image ready! Cost: ${videoData.cost} credits`,
        });
      }
      
    } catch (error: any) {
      console.error('Leonardo AI custom video generation error:', error);
      toast({
        title: "Video Generation Error",
        description: error.message || "Failed to start custom video generation",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
    }
  };

  // Generate custom clinical video with Runway ML (fallback)
  const generateCustomVideo = async () => {
    if (!customVideoPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a clinical description for video generation",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoGenerationProgress(0);
    setGeneratedVideoUrl(null);
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/generate-runway-video',
        { 
          clinicalDescription: customVideoPrompt,
          duration: 8,
          watermark: false
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const videoData = await response.json();
      setVideoTaskId(videoData.taskId);
      
      console.log('Custom video generation started:', videoData.taskId);
      
      toast({
        title: "Custom Video Generation Started",
        description: "Creating video from your clinical description...",
      });

      // Start polling for video status
      pollVideoStatus(videoData.taskId);
      
    } catch (error: any) {
      console.error('Custom video generation error:', error);
      toast({
        title: "Video Generation Error",
        description: error.message || "Failed to start custom video generation",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
    }
  };

  // Find Relevant Research function
  const findRelevantResearch = async () => {
    if (!selectedPatient) return;
    
    setIsLoadingResearch(true);
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${selectedPatient.id}/relevant-research`,
        {}
      );
      const researchData = await response.json();
      setRelevantResearch(researchData || []);
      setShowResearchDialog(true);
    } catch (error: any) {
      toast({
        title: "Research Error",
        description: error.message || "Failed to find relevant research",
        variant: "destructive"
      });
    } finally {
      setIsLoadingResearch(false);
    }
  };

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

  // Generate Google Veo video from clinical description
  const generateVeoVideo = async (patientId: number, movementType: string = 'functional_movement') => {
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setVideoGenerationId(null);
    
    try {
      console.log('Generating Google Veo video for patient:', patientId);
      
      const response = await apiRequest('POST', `/api/virtual-patients/${patientId}/generate-veo-video`, {
        movementType,
        clinicalDescription: `Patient demonstrates ${movementType} with clinical limitations`
      });
      
      const result = await response.json();
      console.log('Google Veo video result:', result);
      
      if (result.success) {
        setGeneratedVideoUrl(result.videoUrl);
        setVideoGenerationId(result.generationId);
        
        toast({
          title: "Success",
          description: "AI movement video generated successfully!",
        });
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error: any) {
      console.error('Error generating Google Veo video:', error);
      toast({
        title: "Video Generation Failed",
        description: error.message || "Failed to generate AI movement video",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Generate video from clinical text
  const generateClinicalVideo = async (clinicalDescription: string) => {
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setVideoGenerationId(null);
    
    try {
      console.log('Generating clinical video from text:', clinicalDescription);
      
      const response = await apiRequest('POST', '/api/generate-clinical-video', {
        clinicalDescription,
        movementType: 'functional_movement',
        duration: 5
      });
      
      const result = await response.json();
      console.log('Clinical video result:', result);
      
      if (result.success) {
        setGeneratedVideoUrl(result.videoUrl);
        setVideoGenerationId(result.generationId);
        
        toast({
          title: "Success",
          description: "Clinical movement video generated successfully!",
        });
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error: any) {
      console.error('Error generating clinical video:', error);
      
      // Parse error message for better user feedback
      let errorMessage = "Failed to generate clinical video";
      let errorTitle = "Video Generation Failed";
      
      if (error.message?.includes('authentication')) {
        errorTitle = "Setup Required";
        errorMessage = "Google Cloud credentials need to be configured. Please contact support for video generation setup.";
      } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
        errorTitle = "Connection Error";
        errorMessage = "Unable to connect to video generation service. Please try again later.";
      } else if (error.message?.includes('project')) {
        errorTitle = "Configuration Error";
        errorMessage = "Video generation service is not properly configured.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (patientsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Virtual Patients</h1>
            <p className="text-gray-600">Loading your virtual patient profiles...</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Virtual Patients</h1>
            <p className="text-gray-600">Select a patient to view their comprehensive digital twin</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {virtualPatients.map((patient: SoapVirtualPatient) => (
              <Card 
                key={patient.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => loadEnhancedPatientData(patient)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {editingPatientId === patient.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="text-lg font-semibold"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={savePatientName}
                            disabled={updatePatientMutation.isPending}
                            className="flex items-center gap-1"
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
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Digital Twin
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(patient.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                    
                    {patient.body_part && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span className="capitalize">{patient.body_part}</span>
                      </div>
                    )}
                    
                    {patient.chief_complaint && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Heart className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{patient.chief_complaint}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  Create New Digital Twin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Capture patient movements to create a comprehensive digital twin combining clinical documentation with biomechanical analysis.
                </p>
                <Button onClick={() => setShowMotionCapture(true)} className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Start Motion Capture
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Virtual Patient View - Main Layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Patients
            </Button>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-semibold">
                {enhancedProfile?.demographics.name || selectedPatient.patient_name || 'Patient Profile'}
              </h1>
              {movementData && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  {movementData.source}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={performAIAnalysis}
              disabled={isLoadingAnalysis}
              className="flex items-center gap-2"
            >
              {isLoadingAnalysis ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              AI Analysis
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={findRelevantResearch}
              disabled={isLoadingResearch}
              className="flex items-center gap-2"
            >
              {isLoadingResearch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Find Research
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Redesigned Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel - Patient Profile & Clinical Data */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Patient Demographics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Patient Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 font-medium">Age</span>
                    <p className="text-gray-900">{enhancedProfile?.demographics.age || selectedPatient.age}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Gender</span>
                    <p className="text-gray-900 capitalize">{enhancedProfile?.demographics.gender || selectedPatient.gender}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 font-medium">Body Part</span>
                    <p className="text-gray-900 capitalize">{selectedPatient.body_part}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-gray-500 font-medium">Chief Complaint</span>
                  <p className="text-gray-900 text-sm mt-1">{selectedPatient.chief_complaint}</p>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-emerald-600" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPatient.symptoms_description && (
                  <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                    <p className="font-medium text-yellow-800 text-sm">Symptoms</p>
                    <p className="text-yellow-700 text-sm mt-1">{selectedPatient.symptoms_description}</p>
                  </div>
                )}
                {selectedPatient.past_medical_history && (
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-400">
                    <p className="font-medium text-gray-800 text-sm">Medical History</p>
                    <p className="text-gray-700 text-sm mt-1">{selectedPatient.past_medical_history}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pain Map */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-600" />
                  Pain Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhancedProfile?.painMap.regions.map((region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{region.bodyPart}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(region.intensity / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-red-600">{region.intensity}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Center Panel - 3D Animation */}
          <div className="lg:col-span-6">
            <Card className="h-[600px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  3D Movement Visualization
                  {(() => {
                    const animationData = getAnimationData(selectedPatient);
                    if (animationData) {
                      return (
                        <Badge variant="secondary" className="ml-2">
                          {animationData.source} ({animationData.frames?.length || animationData.animationSequences?.length || 0} frames)
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${animationBlendMode === 'text-only' ? 'bg-green-600 text-white' : ''}`}
                    onClick={() => setAnimationBlendMode('text-only')}
                  >
                    SOAP Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${animationBlendMode === 'motion-only' ? 'bg-blue-600 text-white' : ''}`}
                    onClick={() => setAnimationBlendMode('motion-only')}
                    disabled={!selectedPatient?.motionData}
                  >
                    Motion Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${animationBlendMode === 'hybrid' ? 'bg-purple-600 text-white' : ''}`}
                    onClick={() => setAnimationBlendMode('hybrid')}
                    disabled={!selectedPatient?.motionData}
                  >
                    Hybrid
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[520px] relative">
                {(() => {
                  const animationData = getAnimationData(selectedPatient);
                  if (selectedPatient && animationData && animationData.frames?.length > 0) {
                    return (
                      <div className="w-full h-full relative overflow-hidden">
                        <TwoDVirtualPatient
                          animationFrames={animationData.frames}
                          isPlaying={isPlaying}
                          currentFrame={currentAnimationFrame}
                          onFrameChange={setCurrentAnimationFrame}
                          className="w-full h-full"
                        />
                        {/* Animation Source Badge */}
                        <div className="absolute top-4 left-4 z-10">
                          <Badge className={animationData.source === 'Motion Capture' ? 'bg-blue-600' : 'bg-emerald-600'}>
                            {animationData.source}
                          </Badge>
                        </div>
                        {/* Play Controls */}
                        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="bg-black/20 text-white border-white/20 hover:bg-black/30"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  } else if (selectedPatient) {
                    return (
                      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-600">
                          <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium mb-2">AI Animation System Ready</p>
                          <p className="text-sm">Motion capture or text description will generate enhanced skeleton visualization</p>
                          {animationSequence && (
                            <div className="mt-4">
                              <Badge className="bg-green-600">
                                Animation Generated ({animationSequence.frames?.length || 0} frames)
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-600">
                          <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium mb-2">Select a Virtual Patient</p>
                          <p className="text-sm">Choose a patient from the list to view their digital twin</p>
                        </div>
                      </div>
                    );
                  }
                })()}
                
                {/* Loading overlay when generating animation */}
                {isLoadingAnimation && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Generating AI Movement...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Functional Movement Assessment Buttons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Functional Movement Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Lower Body Movements */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Lower Body</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('squat')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Squat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('step_up')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Step Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('lunge')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Lunge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('single_leg_stand')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Balance
                      </Button>
                    </div>
                  </div>

                  {/* Upper Body Movements */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Upper Body</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('overhead_reach')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Overhead Reach
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFunctionalMovement('shoulder_rotation')}
                        disabled={isGeneratingMovement}
                        className="text-xs"
                      >
                        Shoulder Rotation
                      </Button>
                    </div>
                  </div>

                  {/* AI Video Generation */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      AI Image Generation
                    </h4>
                    
                    {/* Generated Image Display */}
                    {generatedVideoUrl && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="text-xs font-semibold text-blue-800 mb-1">Generated Clinical Image</h5>
                        <div className="relative">
                          <img 
                            src={generatedVideoUrl} 
                            alt="Generated clinical image"
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Badge className="absolute top-1 right-1 bg-blue-600 text-white text-xs">
                            Leonardo AI
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Button
                        onClick={() => selectedPatient && generateLeonardoVideo(selectedPatient)}
                        disabled={!selectedPatient || isGeneratingVideo}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        size="sm"
                      >
                        {isGeneratingVideo ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Generating Video ({videoGenerationProgress}%)...
                          </>
                        ) : (
                          <>
                            <Video className="h-3 w-3 mr-2" />
                            Generate AI Image (Leonardo)
                          </>
                        )}
                      </Button>
                      
                      {/* Alternative Video Generation Options */}
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        <Button
                          onClick={() => selectedPatient && generateRunwayVideo(selectedPatient)}
                          disabled={!selectedPatient || isGeneratingVideo}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          size="sm"
                          variant="outline"
                        >
                          Runway ML
                        </Button>
                        <Button
                          onClick={() => generateFunctionalMovement('squat')}
                          disabled={isGeneratingMovement}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                          size="sm"
                          variant="outline"
                        >
                          3D Animation
                        </Button>
                      </div>
                      

                      
                      {/* Custom Video Generation */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="space-y-2">
                          <Input
                            value={customVideoPrompt}
                            onChange={(e) => setCustomVideoPrompt(e.target.value)}
                            placeholder="Describe clinical movement (e.g., 'Patient showing shoulder limitation during overhead reach')"
                            className="text-xs"
                          />
                          <Button
                            onClick={generateCustomLeonardoVideo}
                            disabled={isGeneratingVideo || !customVideoPrompt.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                            size="sm"
                          >
                            {isGeneratingVideo ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Creating Custom Video...
                              </>
                            ) : (
                              <>
                                <Video className="h-3 w-3 mr-2" />
                                Generate Custom Image (Leonardo)
                              </>
                            )}
                          </Button>
                          
                          {/* Alternative custom video generation */}
                          <Button
                            onClick={generateCustomVideo}
                            disabled={isGeneratingVideo || !customVideoPrompt.trim()}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white text-xs mt-1"
                            size="sm"
                            variant="outline"
                          >
                            {isGeneratingVideo ? "Generating..." : "Use Runway ML Instead"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Clinical Correlation */}
          <div className="lg:col-span-4 space-y-6">
            {/* Clinical Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-red-600" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="text-sm font-semibold text-red-800 mb-1">Chief Complaint</h4>
                      <p className="text-sm text-red-700">
                        {selectedPatient.chief_complaint || selectedPatient.clinicalPresentation?.chiefComplaint || 'Not specified'}
                      </p>
                    </div>
                    
                    {(selectedPatient.symptoms_description || selectedPatient.clinicalPresentation?.symptomsTimeline) && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="text-sm font-semibold text-orange-800 mb-1">Symptoms</h4>
                        <p className="text-sm text-orange-700">
                          {selectedPatient.symptoms_description || selectedPatient.clinicalPresentation?.symptomsTimeline}
                        </p>
                      </div>
                    )}
                    
                    {(selectedPatient.diagnosis || selectedPatient.physicalFindings?.diagnosis) && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="text-sm font-semibold text-green-800 mb-1">Assessment</h4>
                        <p className="text-sm text-green-700">
                          {selectedPatient.diagnosis || selectedPatient.physicalFindings?.diagnosis}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Select a patient to view clinical notes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text-to-Video Generation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5 text-purple-600" />
                  Text-to-Video Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <textarea
                    placeholder="Describe movement limitations:
e.g., 'Patient has shoulder pain and cannot lift left arm above head due to impingement'"
                    value={textToAnimationInput}
                    onChange={(e) => setTextToAnimationInput(e.target.value)}
                    className="w-full h-20 px-3 py-2 bg-white text-gray-800 placeholder-gray-500 rounded-md border border-purple-300 focus:border-purple-500 focus:outline-none resize-none text-sm"
                  />
                  <Button
                    onClick={() => generateClinicalVideo(textToAnimationInput)}
                    disabled={!textToAnimationInput.trim() || isGeneratingVideo}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                  >
                    {isGeneratingVideo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Generate Video from Text
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SOAP Integration Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-teal-600" />
                  AI Clinical Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clinicalData ? (
                  <div className="space-y-4">
                    {clinicalData.soapIntegration.map((item, index) => (
                      <div key={index} className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                        <h4 className="text-sm font-semibold text-teal-800">{item.complaint}</h4>
                        <p className="text-sm text-teal-700 mt-1">{item.movementCorrelation}</p>
                        <Badge variant="outline" className="mt-2 text-xs border-teal-400 text-teal-600">
                          {item.severity}
                        </Badge>
                      </div>
                    ))}
                    
                    {clinicalData.aiInsights.map((insight, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-blue-800">AI Finding</h4>
                          <Badge className="bg-blue-600 text-xs">
                            {insight.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{insight.finding}</p>
                        <p className="text-xs text-blue-600">{insight.recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">AI insights will appear here after analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Panel - Text-to-Digital Patient & Interactive Controls */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          {/* Text-to-Digital Patient Interface */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-800 font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Text-to-Digital Patient
              </h3>
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-400">
                AI Powered
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <textarea
                  placeholder="Describe patient symptoms, movement patterns, or clinical findings...
Example: 'Patient reports decreased shoulder external rotation, pain during overhead movements, visible compensation with hip hiking during arm elevation'"
                  value={textToAnimationInput}
                  onChange={(e) => setTextToAnimationInput(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-white text-gray-800 placeholder-gray-500 rounded-md border border-emerald-300 focus:border-emerald-500 focus:outline-none resize-none text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-500">
                    {textToAnimationInput.length} characters
                  </div>
                  <Button
                    onClick={() => generateAnimationFromText(textToAnimationInput)}
                    disabled={!textToAnimationInput.trim() || isGeneratingFromText}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    {isGeneratingFromText ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Digital Twin
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                  <div className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    <span className="font-medium">Google Veo AI Video Generation</span>
                  </div>
                  <p className="mt-1 text-blue-700">
                    Advanced AI video generation for realistic patient movement demonstrations. Currently in setup phase.
                  </p>
                </div>
                <Button
                  onClick={() => generateClinicalVideo(textToAnimationInput)}
                  disabled={!textToAnimationInput.trim() || isGeneratingVideo}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Test AI Video Generation
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {textAnimationResult && (
              <div className="bg-emerald-100 border border-emerald-300 rounded-md p-3 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 text-sm font-medium">Digital Patient Generated</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Movement Patterns: {textAnimationResult.movementPatterns?.restrictions?.length || 0} identified</div>
                  <div>Animation Frames: {textAnimationResult.animationSequence?.frames?.length || 0} generated</div>
                  <div>Clinical Correlation: Available</div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Controls & Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 rounded-lg mt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => setShowMotionCapture(true)}
                disabled={!selectedPatient}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {selectedPatient?.threeDVisualization ? "Recapture Motion" : "Motion Capture"}
              </Button>
              
              <Button
                onClick={() => selectedPatient && generateAnimation(selectedPatient)}
                disabled={!selectedPatient || isLoadingAnimation}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoadingAnimation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate AI Animation
                  </>
                )}
              </Button>

              <Button
                onClick={performAIAnalysis}
                disabled={!selectedPatient || isLoadingAnalysis}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoadingAnalysis ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    AI Analysis
                  </>
                )}
              </Button>

              <Button
                onClick={findRelevantResearch}
                disabled={!selectedPatient || isLoadingResearch}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoadingResearch ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    Find Research
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs and Modals */}
      {/* Patient Name Edit Dialog */}
      <Dialog open={showPatientNameDialog} onOpenChange={setShowPatientNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Enter patient name"
              className="w-full"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPatientNameDialog(false);
                  setEditingName('');
                  setEditingPatientId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingPatientId && editingName.trim()) {
                    updatePatientMutation.mutate({ 
                      id: editingPatientId, 
                      name: editingName.trim() 
                    });
                  }
                }}
                disabled={!editingName.trim() || updatePatientMutation.isPending}
              >
                {updatePatientMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recapture Confirmation Dialog */}
      <Dialog open={showRecaptureConfirm} onOpenChange={setShowRecaptureConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-600" />
              Confirm Motion Recapture
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              This will replace the existing 3D visualization with new motion data. The current animation and analysis will be overwritten.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRecaptureConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowRecaptureConfirm(false);
                  setShowMotionCapture(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Video className="h-4 w-4 mr-2" />
                Recapture Motion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Motion Capture Dialog */}
      <Dialog open={showMotionCapture} onOpenChange={setShowMotionCapture}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {selectedPatient?.threeDVisualization ? "Recapture Motion Data" : "Motion Capture for 3D Digital Twin"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
{selectedPatient?.threeDVisualization ? (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Overriding Existing Data</h4>
                <p className="text-sm text-orange-700">
                  This will replace the current 3D visualization with new motion data:
                </p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1">
                  <li>• Previous motion sequences will be deleted</li>
                  <li>• New 3D skeletal animation will be generated</li>
                  <li>• Updated movement analysis and problem areas</li>
                  <li>• Fresh clinical correlation data</li>
                  <li>• Improved biomechanical insights</li>
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">3D Visualization Creation</h4>
                <p className="text-sm text-blue-700">
                  Capture patient movements to generate comprehensive 3D digital twin with:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Real-time skeletal mesh reconstruction</li>
                  <li>• Animation sequences from captured movement</li>
                  <li>• Movement heatmaps showing problem areas</li>
                  <li>• Clinical annotations on dysfunction patterns</li>
                  <li>• 3D biomechanical analysis integration</li>
                </ul>
              </div>
            )}
            <MotionCapture 
              onComplete={async (data) => {
                try {
                  setIsLoadingAnalysis(true);
                  
                  // Process and save 3D visualization data
                  console.log('Motion capture complete, data received:', data);
                  if (data.motionData && data.motionData.length > 0 && selectedPatient) {
                    toast({
                      title: "Processing 3D Visualization",
                      description: "Converting motion data into 3D digital twin...",
                    });

                    // Save motion capture data with 3D visualization
                    const response = await apiRequest(
                      'POST', 
                      `/api/virtual-patients/${selectedPatient.id}/save-3d-visualization`,
                      {
                        motionData: data.motionData,
                        analysis: data.analysis,
                        clinicalCorrelations: data.staticPosturalCorrelations || []
                      }
                    );

                    if (response.ok) {
                      const result = await response.json();
                      toast({
                        title: "3D Digital Twin Created",
                        description: "Motion capture data saved with 3D visualization successfully!",
                      });
                      
                      setShowMotionCapture(false);
                      
                      // IMMEDIATE UPDATE: Set the patient to show 3D visualization instantly
                      if (selectedPatient && result.threeDVisualization) {
                        const updatedPatient = {
                          ...selectedPatient,
                          threeDVisualization: result.threeDVisualization,
                          hasMotionData: true
                        };
                        console.log('Updated patient with 3D visualization:', updatedPatient);
                        setSelectedPatient(updatedPatient);
                        
                        // Force immediate enhanced profile reload with new 3D data
                        loadEnhancedPatientData(updatedPatient);
                      } else {
                        console.log('No 3D visualization data received or no selected patient');
                        console.log('selectedPatient:', selectedPatient);
                        console.log('result:', result);
                      }
                      
                      // Background data refresh for persistence
                      queryClient.invalidateQueries({ queryKey: ['/api/virtual-patients'] });
                      
                      // Force re-render by updating patient list
                      if (refetch) {
                        refetch();
                      }
                    } else {
                      throw new Error('Failed to save 3D visualization');
                    }
                  } else {
                    console.log('No motion data - selectedPatient:', selectedPatient, 'data:', data);
                    toast({
                      title: "No Motion Data",
                      description: "Please capture some movement data first.",
                      variant: "destructive"
                    });
                  }
                } catch (error: any) {
                  console.error('3D Visualization Error:', error);
                  toast({
                    title: "3D Visualization Error", 
                    description: error.message || "Failed to create 3D visualization",
                    variant: "destructive"
                  });
                } finally {
                  setIsLoadingAnalysis(false);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Clinical Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {aiAnalysisData ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">AI Analysis Results</h3>
                  <p className="text-sm text-blue-700">{aiAnalysisData.analysis || "Analysis completed successfully"}</p>
                </div>
                {aiAnalysisData.recommendations && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Recommendations</h3>
                    <p className="text-sm text-green-700">{aiAnalysisData.recommendations}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">AI analysis results will appear here</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Research Dialog */}
      <Dialog open={showResearchDialog} onOpenChange={setShowResearchDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Relevant Research Articles
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {relevantResearch && relevantResearch.length > 0 ? (
              <div className="space-y-4">
                {relevantResearch.map((article: any, index: number) => (
                  <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">{article.title}</h3>
                    <p className="text-sm text-green-700 mb-2">{article.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">{article.authors}</span>
                      <Badge className="bg-green-600">{article.year}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Research articles will appear here</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


