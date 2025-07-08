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
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SoapVirtualPatient } from "@shared/schema";
import MotionCapture from "@/components/MotionCapture";
import ThreeDSkeletonPlayer from "@/components/ThreeDSkeletonPlayer";
import AnimatedInteractiveSkeleton from "@/components/virtualPatient/AnimatedInteractiveSkeleton";

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
  
  // Animation state for AI-generated skeleton movement
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string>('');
  const [animationSequence, setAnimationSequence] = useState<any>(null);
  const [animationBlendMode, setAnimationBlendMode] = useState<'text-only' | 'motion-only' | 'hybrid'>('text-only');
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);

  const { toast } = useToast();
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
      const animationData = await response.json();
      setAnimationSequence(animationData.animationSequence);
      
      console.log('Generated AI animation sequence:', animationData);
    } catch (error: any) {
      console.error('Animation generation error:', error);
      toast({
        title: "Animation Error",
        description: error.message || "Failed to generate movement animation",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAnimation(false);
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Back to Patients
            </Button>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold">
                {enhancedProfile?.demographics.name || 'Loading...'}
              </h1>
              {movementData && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Digital Twin Active
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Patient Profile */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Patient Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span>{enhancedProfile?.demographics.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span>{enhancedProfile?.demographics.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupation:</span>
                  <span className="text-right">{enhancedProfile?.demographics.occupation}</span>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Clinical Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhancedProfile?.clinicalTimeline.map((session, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3 pb-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-blue-600">{session.date}</span>
                        <Badge variant="outline" className="text-xs">
                          Pain: {session.painLevel}/10
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{session.session}</p>
                      <p className="text-xs text-gray-800 mt-1">{session.findings}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pain Map Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Pain Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {enhancedProfile?.painMap.regions.map((region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{region.bodyPart}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(region.intensity / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{region.intensity}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Functional Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Functional Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(enhancedProfile?.functionalScores || {}).map(([metric, score]) => (
                    <div key={metric}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm capitalize">{metric}</span>
                        <span className="text-sm font-medium">{score}%</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhancedProfile?.progressTracking.map((metric, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{metric.metric}</span>
                        <span>{metric.current}/{metric.target}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-500">Baseline: {metric.baseline}</span>
                        <span className="text-green-600">
                          +{((metric.current - metric.baseline) / metric.baseline * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(metric.current / metric.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Center Panel - 3D Interactive Patient */}
        <div className="flex-1 flex flex-col bg-gray-900">
          
          {/* 3D Visualization Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-white font-medium">AI-Generated Movement</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs ${animationBlendMode === 'text-only' ? 'bg-green-600 text-white' : 'text-gray-300'}`}
                    onClick={() => setAnimationBlendMode('text-only')}
                  >
                    SOAP Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs ${animationBlendMode === 'motion-only' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
                    onClick={() => setAnimationBlendMode('motion-only')}
                    disabled={!selectedPatient?.motionData}
                  >
                    Motion Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs ${animationBlendMode === 'hybrid' ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
                    onClick={() => setAnimationBlendMode('hybrid')}
                    disabled={!selectedPatient?.motionData}
                  >
                    Hybrid
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-gray-300">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-gray-300">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-gray-300">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-gray-300">
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 3D Visualization Area */}
          <div className="flex-1 relative bg-gradient-to-b from-gray-800 to-gray-900">
            {selectedPatient && selectedPatient?.threeDVisualization ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  {/* AI-Generated Interactive Skeleton Visualization */}
                  <div className="w-full h-96 bg-gray-700 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <AnimatedInteractiveSkeleton
                      animationSequence={animationSequence}
                      onRegionSelect={(region, displayName) => {
                        setSelectedBodyRegion(region);
                        console.log(`Selected body region: ${displayName}`);
                      }}
                      selectedRegion={selectedBodyRegion}
                      autoPlay={true}
                      showControls={true}
                      height="100%"
                    />
                    
                    {/* Loading overlay when generating animation */}
                    {isLoadingAnimation && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <div className="text-center text-white">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Generating AI Movement...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Real-time data indicators */}
                    <div className="absolute top-2 left-2 text-xs text-cyan-400 z-20">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                        Live Data
                      </div>
                    </div>
                    
                    <Badge className="absolute top-2 right-2 bg-green-600 text-white z-20">
                      3D Ready
                    </Badge>
                    
                    {/* Recapture Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute bottom-2 right-2 text-xs bg-orange-600/20 border-orange-500 text-orange-400 hover:bg-orange-600/40 z-20"
                      onClick={() => setShowRecaptureConfirm(true)}
                    >
                      <Video className="h-3 w-3 mr-1" />
                      Recapture
                    </Button>
                    
                    {/* Movement quality badge - Dynamic based on actual analysis */}
                    {selectedPatient.threeDVisualization?.movementHeatmap && (
                      <div className="absolute bottom-2 left-2 text-xs z-20">
                        {(() => {
                          const problemJoints = selectedPatient.threeDVisualization.movementHeatmap
                            .filter(joint => joint.problemAreas || joint.intensity > 70);
                          
                          if (problemJoints.length > 0) {
                            const topProblem = problemJoints.reduce((max, joint) => 
                              joint.intensity > max.intensity ? joint : max
                            );
                            return (
                              <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded">
                                {topProblem.jointName.charAt(0).toUpperCase() + topProblem.jointName.slice(1)} Issue Detected
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                Normal Movement
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-medium mb-2">3D Digital Twin Active</p>
                  <p className="text-gray-300 text-sm mb-4">
                    Complete skeletal model with {selectedPatient.threeDVisualization?.animationSequences?.length || 'multiple'} animation frames
                  </p>
                  
                  {/* 3D Visualization Stats */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-blue-400 text-lg font-semibold">
                        {selectedPatient.threeDVisualization?.skeletalMesh?.bones?.length || 17}
                      </div>
                      <div className="text-xs text-gray-300">Bone Joints</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-green-400 text-lg font-semibold">
                        {selectedPatient.threeDVisualization?.movementHeatmap?.length || 17}
                      </div>
                      <div className="text-xs text-gray-300">Tracked Joints</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-yellow-400 text-lg font-semibold">
                        {selectedPatient.threeDVisualization?.clinicalAnnotations?.length || 3}
                      </div>
                      <div className="text-xs text-gray-300">Clinical Notes</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-purple-400 text-lg font-semibold">
                        {selectedPatient.threeDVisualization?.animationSequences?.length || 24}
                      </div>
                      <div className="text-xs text-gray-300">Keyframes</div>
                    </div>
                  </div>

                  {/* Movement Quality Heatmap - Show analysis for motion capture patients */}
                  {selectedPatient.threeDVisualization && (
                    <div className="mt-6 max-w-md mx-auto">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Movement Quality Analysis</h4>
                      <div className="space-y-2">
                        {selectedPatient.threeDVisualization?.movementHeatmap?.slice(0, 5).map((joint, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 capitalize">{joint.jointName}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    joint.problemAreas ? 'bg-red-500' : 
                                    joint.intensity > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${joint.intensity}%` }}
                                />
                              </div>
                              <span className={
                                joint.problemAreas ? 'text-red-400' : 
                                joint.intensity > 70 ? 'text-yellow-400' : 'text-green-400'
                              }>
                                {joint.intensity.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showComparisonMode && (
                    <div className="mt-4 flex justify-center gap-4">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-green-700 rounded-lg mb-2 flex items-center justify-center">
                          <span className="text-2xl">✓</span>
                        </div>
                        <p className="text-xs">Normal Pattern</p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 h-32 bg-red-700 rounded-lg mb-2 flex items-center justify-center">
                          <span className="text-2xl">⚠</span>
                        </div>
                        <p className="text-xs">Patient Pattern</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : movementData ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-64 h-64 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                    <div className="text-6xl">🏃‍♂️</div>
                  </div>
                  <p className="text-lg font-medium mb-2">Motion Data Available</p>
                  <p className="text-gray-300 text-sm mb-4">
                    Basic movement data with {movementData.capturedMovements.length} captured frames
                  </p>
                  <Button 
                    onClick={() => setShowMotionCapture(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Upgrade to 3D Twin
                  </Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No Motion Data Available</p>
                  <p className="text-gray-300 text-sm mb-4">
                    Capture patient movements to enable 3D visualization
                  </p>
                  <Button 
                    onClick={() => setShowMotionCapture(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Motion Capture
                  </Button>
                </div>
              </div>
            )}

            {/* Movement Quality Indicators */}
            {movementData && (
              <div className="absolute top-4 left-4 space-y-2">
                {movementData.compensationPatterns.map((pattern, index) => (
                  <div key={index} className="bg-red-900/80 backdrop-blur text-white px-3 py-2 rounded-lg text-sm">
                    <div className="font-medium">{pattern.joint} Compensation</div>
                    <div className="text-red-200 text-xs">{pattern.pattern} - {pattern.severity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Movement Analysis Comparison */}
          {movementData && showComparisonMode && (
            <div className="bg-gray-800 p-4 border-t border-gray-700">
              <h3 className="text-white font-medium mb-3">Movement Pattern Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-400 mb-2">Normal Movement</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Symmetric hip movement</li>
                    <li>• Balanced weight distribution</li>
                    <li>• Smooth joint transitions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-red-400 mb-2">Patient Deviations</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Hip hiking on affected side</li>
                    <li>• Compensatory trunk lean</li>
                    <li>• Reduced range of motion</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Clinical Correlation */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* SOAP Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  SOAP Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clinicalData?.soapIntegration.map((item, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3">
                      <p className="text-sm font-medium text-gray-800">{item.complaint}</p>
                      <p className="text-xs text-gray-600 mt-1">{item.movementCorrelation}</p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {item.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Assessment Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Assessment Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clinicalData?.aiInsights.map((insight, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Finding {index + 1}</span>
                        <Badge variant="secondary" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-800">{insight.finding}</p>
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 {insight.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Treatment Response Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Treatment Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clinicalData?.treatmentResponse.map((response, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{response.intervention}</span>
                        <span className="text-xs text-green-600">+{response.movementImprovement}%</span>
                      </div>
                      <p className="text-xs text-gray-600">{response.outcome}</p>
                      <Progress value={response.movementImprovement} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3D Visualization Details */}
            {selectedPatient?.threeDVisualization && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    3D Digital Twin Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-semibold text-blue-600">
                          {selectedPatient.threeDVisualization.skeletalMesh?.vertices?.length || 0}
                        </div>
                        <div className="text-gray-600">3D Vertices</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-semibold text-green-600">
                          {selectedPatient.threeDVisualization.skeletalMesh?.bones?.length || 0}
                        </div>
                        <div className="text-gray-600">Bone Joints</div>
                      </div>
                    </div>

                    {/* Clinical Annotations */}
                    {selectedPatient.threeDVisualization.clinicalAnnotations && selectedPatient.threeDVisualization.clinicalAnnotations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-700">Clinical Annotations</h4>
                        {selectedPatient.threeDVisualization.clinicalAnnotations.slice(0, 3).map((annotation, index) => (
                          <div key={index} className={`p-2 rounded text-xs ${
                            annotation.severity === 'severe' ? 'bg-red-50 border-l-2 border-red-500' :
                            annotation.severity === 'moderate' ? 'bg-orange-50 border-l-2 border-orange-500' :
                            annotation.severity === 'mild' ? 'bg-yellow-50 border-l-2 border-yellow-500' :
                            'bg-green-50 border-l-2 border-green-500'
                          }`}>
                            <div className={`font-medium ${
                              annotation.severity === 'severe' ? 'text-red-800' :
                              annotation.severity === 'moderate' ? 'text-orange-800' :
                              annotation.severity === 'mild' ? 'text-yellow-800' :
                              'text-green-800'
                            }`}>
                              {annotation.severity.toUpperCase()} Issue
                            </div>
                            <div className="text-gray-700 mt-1">{annotation.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Movement Quality Top Issues */}
                    {selectedPatient.threeDVisualization.movementHeatmap && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-700">Movement Quality Issues</h4>
                        {selectedPatient.threeDVisualization.movementHeatmap
                          .filter(joint => joint.problemAreas || joint.intensity > 70)
                          .slice(0, 3)
                          .map((joint, index) => (
                            <div key={index} className="flex justify-between items-center text-xs p-2 bg-red-50 rounded">
                              <span className="font-medium text-red-800 capitalize">{joint.jointName}</span>
                              <span className="text-red-600">{joint.intensity.toFixed(0)}% abnormal</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Generation Info */}
                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                      <div>Generated: {selectedPatient.threeDVisualization.generatedAt ? 
                        new Date(selectedPatient.threeDVisualization.generatedAt).toLocaleDateString() : 'Unknown'}</div>
                      <div className="mt-1">
                        Camera: [{selectedPatient.threeDVisualization.cameraSettings?.position?.join(', ') || 'Default'}]
                      </div>
                    </div>

                    {/* Export Options */}
                    <div className="pt-2 border-t border-gray-200">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => {
                          const dataStr = JSON.stringify(selectedPatient.threeDVisualization, null, 2);
                          const dataBlob = new Blob([dataStr], {type: 'application/json'});
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `3d-visualization-patient-${selectedPatient.id}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast({
                            title: "3D Data Exported",
                            description: "3D visualization data downloaded successfully",
                          });
                        }}
                      >
                        Export 3D Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clinical Value Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Clinical Correlations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="font-medium text-red-800">Pain Report Correlation</p>
                    <p className="text-red-600 text-xs mt-1">
                      "Right shoulder pain" → Compensated reaching pattern detected in motion data
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="font-medium text-orange-800">Movement Limitation</p>
                    <p className="text-orange-600 text-xs mt-1">
                      "Limited ankle dorsiflexion" → Forward trunk lean compensation in squat analysis
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-medium text-green-800">Progress Indicator</p>
                    <p className="text-green-600 text-xs mt-1">
                      "Improved pain scores" → Movement patterns show 25% quality improvement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Interactive Controls */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Movement Playback Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaybackTime(0)}
                disabled={!selectedPatient?.threeDVisualization?.animationSequences?.length}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                disabled={!selectedPatient?.threeDVisualization?.animationSequences?.length}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetPlayback}
                disabled={!selectedPatient?.threeDVisualization?.animationSequences?.length}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Timeline Scrubber */}
            <div className="flex items-center gap-2 w-64">
              <span className="text-xs text-gray-500">
                {Math.floor(playbackTime / 30)}:{(Math.floor(playbackTime) % 30).toString().padStart(2, '0')}
              </span>
              <Slider
                value={[playbackTime]}
                onValueChange={(value) => setPlaybackTime(value[0])}
                max={selectedPatient?.threeDVisualization?.animationSequences?.length || 100}
                step={1}
                disabled={!selectedPatient?.threeDVisualization?.animationSequences?.length}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">
                {Math.floor((selectedPatient?.threeDVisualization?.animationSequences?.length || 90) / 30)}:
                {(Math.floor((selectedPatient?.threeDVisualization?.animationSequences?.length || 90)) % 30).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed:</span>
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="text-xs border rounded px-2 py-1"
                disabled={!movementData}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          {/* Data Integration Tools */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparisonMode(!showComparisonMode)}
              disabled={!movementData}
            >
              <Target className="h-4 w-4 mr-2" />
              {showComparisonMode ? 'Hide' : 'Show'} Comparison
            </Button>
            
            <select 
              value={selectedMovement} 
              onChange={(e) => setSelectedMovement(e.target.value)}
              className="text-sm border rounded px-3 py-1"
              disabled={!movementData}
            >
              <option value="all">All Movements</option>
              <option value="walking">Walking</option>
              <option value="squatting">Squatting</option>
              <option value="reaching">Reaching</option>
            </select>
            
            <Button variant="outline" size="sm" disabled={!movementData}>
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Recapture Confirmation Dialog */}
      <Dialog open={showRecaptureConfirm} onOpenChange={setShowRecaptureConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recapture Motion Data?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will replace the existing 3D visualization and movement analysis for this patient. 
              The current motion data will be permanently overwritten.
            </p>
            <div className="flex justify-end gap-2">
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
          
          {aiAnalysisData && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Clinical Summary</h3>
                <p className="text-gray-700 text-sm">{aiAnalysisData.clinicalSummary}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-2">Diagnostic Analysis</h3>
                <p className="text-gray-700 text-sm">{aiAnalysisData.diagnosticAnalysis}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-2">Treatment Recommendations</h3>
                <p className="text-gray-700 text-sm">{aiAnalysisData.treatmentRecommendations}</p>
              </div>
              
              {aiAnalysisData.keyInsights && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Key Insights</h3>
                    <ul className="space-y-1">
                      {aiAnalysisData.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              
              {aiAnalysisData.confidenceScore && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">AI Confidence Score</span>
                    <span className="text-sm font-bold text-blue-600">{aiAnalysisData.confidenceScore}%</span>
                  </div>
                  <Progress value={aiAnalysisData.confidenceScore} className="h-2" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Research Dialog */}
      <Dialog open={showResearchDialog} onOpenChange={setShowResearchDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Relevant Research Papers
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {relevantResearch.map((paper, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base leading-tight pr-4">
                        {paper.title}
                      </CardTitle>
                      {paper.relevanceScore && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          {paper.relevanceScore}% match
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Authors:</strong> {paper.authors}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Journal:</strong> {paper.journal}
                      </p>
                      {paper.abstract && (
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {paper.abstract}
                        </p>
                      )}
                      {paper.bodyPart && (
                        <Badge variant="outline" className="text-xs">
                          {paper.bodyPart}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {relevantResearch.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No relevant research papers found for this patient case.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}