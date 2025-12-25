import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  User,
  Target,
  Heart,
  Brain,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Download,
  Printer,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Dumbbell,
  Shield,
  Zap,
  FileText,
  Scale
} from 'lucide-react';
import { Link } from 'wouter';
import { calculateFullBiomechanics, type BiomechanicsResult } from '@/lib/biomechanicsEngine';
import { calculateInjuryRisks, type InjuryRiskResult, type RiskLevel } from '@/lib/injuryRiskEngine';
import { apiRequest } from '@/lib/queryClient';
import { Helmet } from 'react-helmet';

const RISK_COLORS: Record<RiskLevel, string> = {
  minimal: 'bg-green-500',
  low: 'bg-green-400',
  moderate: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const RISK_TEXT_COLORS: Record<RiskLevel, string> = {
  minimal: 'text-green-600',
  low: 'text-green-500',
  moderate: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

interface PatientProfile {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  chiefComplaint: string;
  medicalHistory: string[];
}

interface TreatmentStrategy {
  clinicalSummary: string;
  primaryProblems: Array<{
    problem: string;
    severity: string;
    priority: number;
    relatedFindings: string[];
  }>;
  treatmentGoals: {
    shortTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
    longTerm: Array<{ goal: string; timeframe: string; metrics: string[] }>;
  };
  interventions: {
    manualTherapy: Array<{
      technique: string;
      target: string;
      frequency: string;
      rationale: string;
    }>;
    therapeuticExercises: Array<{
      exercise: string;
      sets: number;
      reps: number;
      frequency: string;
      progression: string;
      rationale: string;
    }>;
    neuromuscularReeducation: Array<{
      activity: string;
      focus: string;
      progression: string;
    }>;
    patientEducation: Array<{
      topic: string;
      keyPoints: string[];
    }>;
  };
  loadManagement: {
    currentLoadCapacity: string;
    recommendedLoadReduction: number;
    activityModifications: string[];
    returnToActivityCriteria: string[];
  };
  precautions: {
    redFlags: string[];
    contraindications: string[];
    watchFor: string[];
  };
  prognosis: {
    expectedRecoveryTime: string;
    prognosticFactors: { positive: string[]; negative: string[] };
    expectedOutcome: string;
  };
}

const defaultModelConfig = {
  pelvis: { tilt: 0, obliquity: 0, rotation: 0, drop: 0 },
  spine: { thoracicKyphosis: 35, lumbarLordosis: 45, scoliosis: 0 },
  leftHip: { flexion: 0, abduction: 0, internalRotation: 0 },
  rightHip: { flexion: 0, abduction: 0, internalRotation: 0 },
  leftKnee: { flexion: 0, varus: 0 },
  rightKnee: { flexion: 0, varus: 0 },
  leftAnkle: { dorsiflexion: 0, inversion: 0 },
  rightAnkle: { dorsiflexion: 0, inversion: 0 },
  leftShoulder: { flexion: 0, abduction: 0, internalRotation: 0 },
  rightShoulder: { flexion: 0, abduction: 0, internalRotation: 0 },
  leftElbow: { flexion: 0, pronation: 0 },
  rightElbow: { flexion: 0, pronation: 0 },
};

export default function PatientAssessmentDashboard() {
  const [patient, setPatient] = useState<PatientProfile>({
    name: 'John Doe',
    age: 35,
    gender: 'Male',
    height: 175,
    weight: 75,
    chiefComplaint: 'Lower back pain with radiation to left leg',
    medicalHistory: ['Sedentary lifestyle', 'Previous ankle sprain (2019)']
  });
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [treatmentStrategy, setTreatmentStrategy] = useState<TreatmentStrategy | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [modelConfig] = useState(defaultModelConfig);
  
  const biomechanics = useMemo(() => {
    return calculateFullBiomechanics(patient.height, patient.weight, modelConfig);
  }, [patient.height, patient.weight, modelConfig]);
  
  const injuryRisks = useMemo(() => {
    return calculateInjuryRisks(biomechanics);
  }, [biomechanics]);
  
  const handleGenerateAIAssessment = async () => {
    setIsGeneratingAI(true);
    setAiError(null);
    
    try {
      const biomechanicsInput = {
        patientInfo: {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          chiefComplaint: patient.chiefComplaint
        },
        anthropometrics: {
          heightCm: patient.height,
          weightKg: patient.weight
        },
        jointForces: biomechanics.jointForces,
        muscleActivation: biomechanics.muscleActivation,
        asymmetryAnalysis: biomechanics.asymmetryAnalysis,
        movementQuality: biomechanics.movementQuality,
        injuryRisks: {
          overallRiskLevel: injuryRisks.overallRiskLevel,
          overallRiskScore: injuryRisks.overallRiskScore,
          highRiskAreas: Object.entries(injuryRisks.jointRisks).flatMap(([category, risks]) => {
            if (category === 'lumbarSpine') {
              return Object.entries(risks).filter(([_, r]: [string, any]) => r.risk > 50).map(([name, r]: [string, any]) => ({
                area: `Lumbar - ${name}`,
                risk: r.risk,
                factors: r.factors
              }));
            }
            return Object.entries(risks).filter(([_, r]: [string, any]) => {
              const avg = ((r.left?.risk || 0) + (r.right?.risk || 0)) / 2;
              return avg > 50;
            }).map(([name, r]: [string, any]) => ({
              area: `${category} - ${name}`,
              risk: Math.round(((r.left?.risk || 0) + (r.right?.risk || 0)) / 2),
              factors: r.factors || []
            }));
          })
        },
        posture: {
          pelvisTilt: modelConfig.pelvis.tilt,
          pelvisObliquity: modelConfig.pelvis.obliquity,
          spineFlexion: modelConfig.spine.lumbarLordosis,
          spineLateralFlexion: modelConfig.spine.scoliosis
        }
      };
      
      const response = await apiRequest('POST', '/api/biomechanics/clinical-assessment', biomechanicsInput);
      const data = await response.json();
      
      if (data.success && data.treatmentStrategy) {
        setTreatmentStrategy(data.treatmentStrategy);
      } else {
        throw new Error(data.error || 'Failed to generate assessment');
      }
    } catch (error: any) {
      console.error('Error generating AI assessment:', error);
      setAiError(error.message || 'Failed to generate AI clinical assessment');
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const getRiskBadge = (level: RiskLevel) => (
    <Badge 
      variant="outline" 
      className={`${RISK_TEXT_COLORS[level]} border-current`}
      data-testid={`risk-badge-${level}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
  
  return (
    <>
      <Helmet>
        <title>Patient Assessment Dashboard - PhysioGPT</title>
        <meta name="description" content="Comprehensive biomechanical assessment dashboard with AI-powered treatment planning for physiotherapy clinical practice." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/test-skeleton">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Skeleton
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-500" />
                  Patient Assessment Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive biomechanical analysis and treatment planning
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-print">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card data-testid="patient-info-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-blue-500" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input 
                      value={patient.name}
                      onChange={(e) => setPatient(p => ({...p, name: e.target.value}))}
                      className="h-8"
                      data-testid="input-patient-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Age</Label>
                    <Input 
                      type="number"
                      value={patient.age}
                      onChange={(e) => setPatient(p => ({...p, age: Number(e.target.value)}))}
                      className="h-8"
                      data-testid="input-patient-age"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height (cm)</Label>
                    <Input 
                      type="number"
                      value={patient.height}
                      onChange={(e) => setPatient(p => ({...p, height: Number(e.target.value)}))}
                      className="h-8"
                      data-testid="input-patient-height"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                    <Input 
                      type="number"
                      value={patient.weight}
                      onChange={(e) => setPatient(p => ({...p, weight: Number(e.target.value)}))}
                      className="h-8"
                      data-testid="input-patient-weight"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chief Complaint</Label>
                  <Input 
                    value={patient.chiefComplaint}
                    onChange={(e) => setPatient(p => ({...p, chiefComplaint: e.target.value}))}
                    className="h-8"
                    data-testid="input-chief-complaint"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  BMI: <span className="font-medium text-foreground">
                    {(patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2" data-testid="risk-overview-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Risk Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <div className="text-3xl font-bold text-blue-600">
                      {biomechanics.movementQuality.overallScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Movement Quality</div>
                    <Progress value={biomechanics.movementQuality.overallScore} className="h-1 mt-2" />
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                    <div className={`text-3xl font-bold ${RISK_TEXT_COLORS[injuryRisks.overallRiskLevel]}`}>
                      {injuryRisks.overallRiskScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Injury Risk Score</div>
                    <div className="mt-2">{getRiskBadge(injuryRisks.overallRiskLevel)}</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                    <div className="text-3xl font-bold text-green-600">
                      {biomechanics.movementQuality.stabilityScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Stability Score</div>
                    <Progress value={biomechanics.movementQuality.stabilityScore} className="h-1 mt-2" />
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
                    <div className="text-3xl font-bold text-purple-600">
                      {biomechanics.movementQuality.mobilityScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Mobility Score</div>
                    <Progress value={biomechanics.movementQuality.mobilityScore} className="h-1 mt-2" />
                  </div>
                </div>
                
                {injuryRisks.thresholdWarnings.jointWarnings.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2 text-orange-600 text-sm font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Clinical Warnings
                    </div>
                    <ul className="text-xs space-y-1">
                      {injuryRisks.thresholdWarnings.jointWarnings.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {w.joint}: {w.metric} exceeds safe threshold
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="forces" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="forces" data-testid="tab-forces">
                <Zap className="w-4 h-4 mr-2" />
                Joint Forces
              </TabsTrigger>
              <TabsTrigger value="muscles" data-testid="tab-muscles">
                <Heart className="w-4 h-4 mr-2" />
                Muscles
              </TabsTrigger>
              <TabsTrigger value="asymmetry" data-testid="tab-asymmetry">
                <Scale className="w-4 h-4 mr-2" />
                Asymmetry
              </TabsTrigger>
              <TabsTrigger value="risks" data-testid="tab-risks">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk Analysis
              </TabsTrigger>
              <TabsTrigger value="treatment" data-testid="tab-treatment">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Treatment
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="forces" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Spinal Forces</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>L5/S1 Compression</span>
                        <span className={biomechanics.jointForces.lumbarSpine.compression > 3400 ? 'text-red-500 font-medium' : ''}>
                          {biomechanics.jointForces.lumbarSpine.compression}N
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, (biomechanics.jointForces.lumbarSpine.compression / 6400) * 100)}
                        className={biomechanics.jointForces.lumbarSpine.compression > 3400 ? '[&>div]:bg-red-500' : ''}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Safe limit: 3,400N | Critical: 6,400N
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>L5/S1 Shear</span>
                        <span>{biomechanics.jointForces.lumbarSpine.shear}N</span>
                      </div>
                      <Progress value={Math.min(100, (biomechanics.jointForces.lumbarSpine.shear / 1000) * 100)} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hip Forces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {biomechanics.jointForces.leftHip.compression}N
                        </div>
                        <div className="text-xs text-muted-foreground">Left Hip</div>
                      </div>
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {biomechanics.jointForces.rightHip.compression}N
                        </div>
                        <div className="text-xs text-muted-foreground">Right Hip</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-center text-muted-foreground">
                      Asymmetry: {biomechanics.asymmetryAnalysis.hipLoadAsymmetry}%
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Knee Forces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded border">
                          <div className="font-bold">{biomechanics.jointForces.leftKnee.patellofemoral}N</div>
                          <div className="text-xs text-muted-foreground">L Patellofemoral</div>
                        </div>
                        <div className="text-center p-2 rounded border">
                          <div className="font-bold">{biomechanics.jointForces.rightKnee.patellofemoral}N</div>
                          <div className="text-xs text-muted-foreground">R Patellofemoral</div>
                        </div>
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        Safe limit: 1,500N
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="muscles" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Core Muscles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Erector Spinae</span>
                        <span>{Math.round(biomechanics.muscleActivation.erectorSpinae)}% MVC</span>
                      </div>
                      <Progress value={biomechanics.muscleActivation.erectorSpinae} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Rectus Abdominis</span>
                        <span>{Math.round(biomechanics.muscleActivation.rectusAbdominis)}% MVC</span>
                      </div>
                      <Progress value={biomechanics.muscleActivation.rectusAbdominis} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Obliques</span>
                        <span>{Math.round(biomechanics.muscleActivation.obliques)}% MVC</span>
                      </div>
                      <Progress value={biomechanics.muscleActivation.obliques} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Lower Limb (L/R)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Glute Max</span>
                      </div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.gluteusMaximus.left)}%</div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.gluteusMaximus.right)}%</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Glute Med</span>
                      </div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.gluteusMedius.left)}%</div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.gluteusMedius.right)}%</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Quadriceps</span>
                      </div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.quadriceps.left)}%</div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.quadriceps.right)}%</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Hamstrings</span>
                      </div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.hamstrings.left)}%</div>
                      <div className="text-center">{Math.round(biomechanics.muscleActivation.hamstrings.right)}%</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="asymmetry" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Load Asymmetry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Weight Distribution</span>
                        <span className={biomechanics.asymmetryAnalysis.weightDistributionAsymmetry > 10 ? 'text-orange-500' : ''}>
                          {biomechanics.asymmetryAnalysis.weightDistributionAsymmetry}%
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {biomechanics.groundReactionForces.weightDistribution.left}%
                          </div>
                          <div className="text-xs text-muted-foreground">Left</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {biomechanics.groundReactionForces.weightDistribution.right}%
                          </div>
                          <div className="text-xs text-muted-foreground">Right</div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Hip Load</span>
                        <span className={biomechanics.asymmetryAnalysis.hipLoadAsymmetry > 15 ? 'text-orange-500' : ''}>
                          {biomechanics.asymmetryAnalysis.hipLoadAsymmetry}%
                        </span>
                      </div>
                      <Progress value={biomechanics.asymmetryAnalysis.hipLoadAsymmetry} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Knee Load</span>
                        <span className={biomechanics.asymmetryAnalysis.kneeLoadAsymmetry > 15 ? 'text-orange-500' : ''}>
                          {biomechanics.asymmetryAnalysis.kneeLoadAsymmetry}%
                        </span>
                      </div>
                      <Progress value={biomechanics.asymmetryAnalysis.kneeLoadAsymmetry} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Muscle Activation Asymmetry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(biomechanics.asymmetryAnalysis.muscleActivationAsymmetry).map(([muscle, value]) => (
                      <div key={muscle}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize">{muscle.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={value > 15 ? 'text-orange-500 font-medium' : ''}>
                            {value}%
                            {value > 15 && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                          </span>
                        </div>
                        <Progress 
                          value={value} 
                          className={value > 15 ? '[&>div]:bg-orange-500' : ''}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="risks" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {injuryRisks.riskFactors.biomechanical.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Biomechanical</h4>
                        <div className="flex flex-wrap gap-1">
                          {injuryRisks.riskFactors.biomechanical.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {injuryRisks.riskFactors.muscular.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Muscular</h4>
                        <div className="flex flex-wrap gap-1">
                          {injuryRisks.riskFactors.muscular.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {injuryRisks.riskFactors.postural.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Postural</h4>
                        <div className="flex flex-wrap gap-1">
                          {injuryRisks.riskFactors.postural.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Movement Quality Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {biomechanics.movementQuality.compensationPatterns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-orange-500 mb-2 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Compensation Patterns
                        </h4>
                        <ul className="text-xs space-y-1">
                          {biomechanics.movementQuality.compensationPatterns.map((p, i) => (
                            <li key={i} className="flex items-start gap-1 text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {biomechanics.movementQuality.movementFaults.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Movement Faults
                        </h4>
                        <ul className="text-xs space-y-1">
                          {biomechanics.movementQuality.movementFaults.map((f, i) => (
                            <li key={i} className="flex items-start gap-1 text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {biomechanics.movementQuality.compensationPatterns.length === 0 && 
                     biomechanics.movementQuality.movementFaults.length === 0 && (
                      <div className="text-center py-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No significant movement faults detected
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="treatment" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI-Powered Treatment Strategy
                  </CardTitle>
                  <CardDescription>
                    Generate evidence-based treatment recommendations from biomechanical analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!treatmentStrategy && !isGeneratingAI && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-medium mb-2">Generate AI Treatment Plan</h4>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                        Analyze the patient's biomechanical data to generate a comprehensive, 
                        evidence-based treatment strategy including exercises, manual therapy, 
                        and rehabilitation milestones.
                      </p>
                      <Button 
                        onClick={handleGenerateAIAssessment}
                        className="bg-gradient-to-r from-purple-600 to-blue-600"
                        size="lg"
                        data-testid="button-generate-treatment"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Treatment Plan
                      </Button>
                      {aiError && (
                        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 text-sm max-w-md mx-auto">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          {aiError}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isGeneratingAI && (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Analyzing biomechanics and generating treatment strategy...
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        This may take 10-15 seconds
                      </p>
                    </div>
                  )}
                  
                  {treatmentStrategy && !isGeneratingAI && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          AI Generated Treatment Plan
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGenerateAIAssessment}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Clinical Summary
                        </h4>
                        <p className="text-sm">{treatmentStrategy.clinicalSummary}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Primary Problems
                          </h4>
                          <div className="space-y-2">
                            {treatmentStrategy.primaryProblems?.map((problem, idx) => (
                              <div key={idx} className="p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{problem.problem}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      problem.severity === 'severe' ? 'text-red-500' :
                                      problem.severity === 'moderate' ? 'text-orange-500' : 'text-yellow-500'
                                    }
                                  >
                                    {problem.severity}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-blue-500" />
                            Treatment Goals
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <h5 className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Short-term (2-4 weeks)
                              </h5>
                              {treatmentStrategy.treatmentGoals?.shortTerm?.slice(0, 2).map((goal, idx) => (
                                <div key={idx} className="text-xs p-2 rounded border mb-1">
                                  {goal.goal}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                          <Dumbbell className="w-4 h-4 text-green-500" />
                          Therapeutic Exercises
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {treatmentStrategy.interventions?.therapeuticExercises?.map((ex, idx) => (
                            <div key={idx} className="p-3 rounded-lg border">
                              <div className="font-medium text-sm text-green-600">{ex.exercise}</div>
                              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{ex.sets} sets</span>
                                <span>×</span>
                                <span>{ex.reps} reps</span>
                                <span>•</span>
                                <span>{ex.frequency}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-sm text-orange-600">
                            <AlertTriangle className="w-4 h-4" />
                            Precautions & Red Flags
                          </h4>
                          <ul className="text-xs space-y-1">
                            {treatmentStrategy.precautions?.redFlags?.map((flag, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
                                {flag}
                              </li>
                            ))}
                            {treatmentStrategy.precautions?.contraindications?.map((c, idx) => (
                              <li key={`c-${idx}`} className="flex items-start gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-sm text-purple-600">
                            <TrendingUp className="w-4 h-4" />
                            Prognosis
                          </h4>
                          <div className="text-sm">
                            <div className="font-medium">
                              Expected Recovery: {treatmentStrategy.prognosis?.expectedRecoveryTime}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {treatmentStrategy.prognosis?.expectedOutcome}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
