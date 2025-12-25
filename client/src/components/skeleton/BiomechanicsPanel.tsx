import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronRight,
  Bone,
  Scale,
  Zap,
  Target,
  Heart,
  Brain,
  Loader2,
  RefreshCw,
  Sparkles,
  ClipboardList,
  Dumbbell,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { calculateFullBiomechanics, type BiomechanicsResult } from '@/lib/biomechanicsEngine';
import { calculateInjuryRisks, type InjuryRiskResult, type RiskLevel } from '@/lib/injuryRiskEngine';
import { apiRequest } from '@/lib/queryClient';

interface BiomechanicsPanelProps {
  modelConfig: {
    pelvis: { tilt: number; obliquity: number; rotation: number; drop: number };
    spine: { thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number };
    leftHip: { flexion: number; abduction: number; internalRotation: number };
    rightHip: { flexion: number; abduction: number; internalRotation: number };
    leftKnee: { flexion: number; varus: number };
    rightKnee: { flexion: number; varus: number };
    leftAnkle: { dorsiflexion: number; inversion: number };
    rightAnkle: { dorsiflexion: number; inversion: number };
    leftShoulder: { flexion: number; abduction: number; internalRotation: number };
    rightShoulder: { flexion: number; abduction: number; internalRotation: number };
    leftElbow: { flexion: number; pronation: number };
    rightElbow: { flexion: number; pronation: number };
  };
  onForceVisualizationChange?: (enabled: boolean, data: BiomechanicsResult | null) => void;
}

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

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge 
      variant="outline" 
      className={`${RISK_TEXT_COLORS[level]} border-current`}
      data-testid={`risk-badge-${level}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}

function ForceDisplay({ label, value, unit, threshold, warning }: { 
  label: string; 
  value: number; 
  unit: string; 
  threshold?: number;
  warning?: boolean;
}) {
  const percentage = threshold ? Math.min(100, (value / threshold) * 100) : 50;
  const isHigh = threshold && value > threshold;
  
  return (
    <div className="space-y-1" data-testid={`force-display-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isHigh ? 'text-red-500' : ''}`}>
          {value.toLocaleString()} {unit}
          {isHigh && <AlertTriangle className="inline w-3 h-3 ml-1" />}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-1.5 ${isHigh ? '[&>div]:bg-red-500' : ''}`} 
      />
    </div>
  );
}

function MuscleActivationBar({ name, left, right }: { name: string; left: number; right: number }) {
  const asymmetry = Math.abs(left - right);
  const hasAsymmetry = asymmetry > 15;
  
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs" data-testid={`muscle-activation-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-1">
        <span className={`${hasAsymmetry ? 'text-orange-500' : ''}`}>{left}%</span>
        <Progress value={left} className="h-1.5 flex-1" />
      </div>
      <span className="text-muted-foreground text-center w-24 truncate">{name}</span>
      <div className="flex items-center gap-1">
        <Progress value={right} className="h-1.5 flex-1" />
        <span className={`${hasAsymmetry ? 'text-orange-500' : ''}`}>{right}%</span>
      </div>
    </div>
  );
}

function JointRiskCard({ 
  title, 
  risks 
}: { 
  title: string; 
  risks: Array<{ name: string; risk: number; level: RiskLevel; factors: string[] }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const highestRisk = Math.max(...risks.map(r => r.risk));
  const highestLevel = risks.reduce((max, r) => {
    const levels: RiskLevel[] = ['minimal', 'low', 'moderate', 'high', 'critical'];
    return levels.indexOf(r.level) > levels.indexOf(max) ? r.level : max;
  }, 'minimal' as RiskLevel);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div 
          className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
          data-testid={`joint-risk-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${RISK_COLORS[highestLevel]}`} />
            <span className="text-sm text-muted-foreground">{highestRisk}%</span>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-3 py-2 space-y-3">
        {risks.map((risk, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{risk.name}</span>
              <RiskBadge level={risk.level} />
            </div>
            <Progress 
              value={risk.risk} 
              className={`h-1 [&>div]:${RISK_COLORS[risk.level]}`} 
            />
            {risk.factors.length > 0 && (
              <ul className="text-xs text-muted-foreground pl-4 list-disc">
                {risk.factors.slice(0, 2).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
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

export default function BiomechanicsPanel({ modelConfig, onForceVisualizationChange }: BiomechanicsPanelProps) {
  const [patientHeight, setPatientHeight] = useState(175);
  const [patientWeight, setPatientWeight] = useState(75);
  const [showForces, setShowForces] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [treatmentStrategy, setTreatmentStrategy] = useState<TreatmentStrategy | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const biomechanics = useMemo(() => {
    return calculateFullBiomechanics(patientHeight, patientWeight, modelConfig);
  }, [patientHeight, patientWeight, modelConfig]);
  
  const injuryRisks = useMemo(() => {
    return calculateInjuryRisks(biomechanics);
  }, [biomechanics]);
  
  const handleForceToggle = () => {
    const newState = !showForces;
    setShowForces(newState);
    onForceVisualizationChange?.(newState, newState ? biomechanics : null);
  };
  
  const handleRecalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      if (showForces) {
        onForceVisualizationChange?.(true, biomechanics);
      }
    }, 500);
  };
  
  const handleGenerateAIAssessment = async () => {
    setIsGeneratingAI(true);
    setAiError(null);
    
    try {
      const biomechanicsInput = {
        patientInfo: {
          chiefComplaint: "Biomechanical assessment"
        },
        anthropometrics: {
          heightCm: patientHeight,
          weightKg: patientWeight
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
  
  // Format bilateral risks for display
  const formatBilateralRisks = (category: 'hip' | 'knee' | 'ankle' | 'shoulder') => {
    const categoryRisks = injuryRisks.jointRisks[category];
    return Object.entries(categoryRisks).map(([key, value]) => {
      const v = value as { left: { risk: number; level: RiskLevel }; right: { risk: number; level: RiskLevel }; factors: string[] };
      const avgRisk = Math.round((v.left.risk + v.right.risk) / 2);
      const maxLevel = v.left.risk > v.right.risk ? v.left.level : v.right.level;
      return {
        name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        risk: avgRisk,
        level: maxLevel,
        factors: v.factors,
      };
    });
  };
  
  const formatLumbarRisks = () => {
    return Object.entries(injuryRisks.jointRisks.lumbarSpine).map(([key, value]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      risk: value.risk,
      level: value.level,
      factors: value.factors,
    }));
  };

  return (
    <Card className="w-full" data-testid="biomechanics-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Biomechanical Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={injuryRisks.overallRiskLevel === 'critical' || injuryRisks.overallRiskLevel === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
              data-testid="overall-risk-score"
            >
              Risk Score: {injuryRisks.overallRiskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="height" className="text-xs">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={patientHeight}
              onChange={(e) => setPatientHeight(Number(e.target.value))}
              className="h-8"
              data-testid="input-patient-height"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={patientWeight}
              onChange={(e) => setPatientWeight(Number(e.target.value))}
              className="h-8"
              data-testid="input-patient-weight"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={showForces ? "default" : "outline"} 
            size="sm" 
            onClick={handleForceToggle}
            className="flex-1"
            data-testid="button-toggle-force-visualization"
          >
            <Zap className="w-4 h-4 mr-1" />
            {showForces ? 'Hide Forces' : 'Show Forces'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecalculate}
            disabled={isCalculating}
            data-testid="button-recalculate"
          >
            {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
        
        <Tabs defaultValue="forces" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="forces" className="text-xs" data-testid="tab-forces">
              <Zap className="w-3 h-3 mr-1" />
              Forces
            </TabsTrigger>
            <TabsTrigger value="muscles" className="text-xs" data-testid="tab-muscles">
              <Heart className="w-3 h-3 mr-1" />
              Muscles
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs" data-testid="tab-risks">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Risks
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs" data-testid="tab-quality">
              <Target className="w-3 h-3 mr-1" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs" data-testid="tab-ai-treatment">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Plan
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="forces" className="mt-3 space-y-4">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Bone className="w-4 h-4" />
                    Spinal Forces
                  </h4>
                  <div className="space-y-2 pl-2">
                    <ForceDisplay 
                      label="L5/S1 Compression" 
                      value={biomechanics.jointForces.lumbarSpine.compression} 
                      unit="N"
                      threshold={3400}
                    />
                    <ForceDisplay 
                      label="L5/S1 Shear" 
                      value={biomechanics.jointForces.lumbarSpine.shear} 
                      unit="N"
                      threshold={500}
                    />
                    <ForceDisplay 
                      label="Thoracic Compression" 
                      value={biomechanics.jointForces.thoracicSpine.compression} 
                      unit="N"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Hip Forces</h4>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Left</span>
                      <ForceDisplay 
                        label="Compression" 
                        value={biomechanics.jointForces.leftHip.compression} 
                        unit="N"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Right</span>
                      <ForceDisplay 
                        label="Compression" 
                        value={biomechanics.jointForces.rightHip.compression} 
                        unit="N"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Knee Forces</h4>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Left</span>
                      <ForceDisplay 
                        label="Patellofemoral" 
                        value={biomechanics.jointForces.leftKnee.patellofemoral} 
                        unit="N"
                        threshold={1500}
                      />
                      <ForceDisplay 
                        label="Tibiofemoral" 
                        value={biomechanics.jointForces.leftKnee.compression} 
                        unit="N"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Right</span>
                      <ForceDisplay 
                        label="Patellofemoral" 
                        value={biomechanics.jointForces.rightKnee.patellofemoral} 
                        unit="N"
                        threshold={1500}
                      />
                      <ForceDisplay 
                        label="Tibiofemoral" 
                        value={biomechanics.jointForces.rightKnee.compression} 
                        unit="N"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Scale className="w-4 h-4" />
                    Ground Reaction Forces
                  </h4>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="text-center p-2 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {biomechanics.groundReactionForces.weightDistribution.left}%
                      </div>
                      <div className="text-xs text-muted-foreground">Left Foot</div>
                      <div className="text-xs">{biomechanics.groundReactionForces.leftFoot.vertical} N</div>
                    </div>
                    <div className="text-center p-2 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {biomechanics.groundReactionForces.weightDistribution.right}%
                      </div>
                      <div className="text-xs text-muted-foreground">Right Foot</div>
                      <div className="text-xs">{biomechanics.groundReactionForces.rightFoot.vertical} N</div>
                    </div>
                  </div>
                  {biomechanics.asymmetryAnalysis.weightDistributionAsymmetry > 10 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                      <AlertTriangle className="w-3 h-3" />
                      Weight shift asymmetry: {biomechanics.asymmetryAnalysis.weightDistributionAsymmetry}%
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="muscles" className="mt-3">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Core Muscles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Erector Spinae</span>
                      <span>{Math.round(biomechanics.muscleActivation.erectorSpinae)}%</span>
                    </div>
                    <Progress value={biomechanics.muscleActivation.erectorSpinae} className="h-1.5" />
                    
                    <div className="flex justify-between text-xs">
                      <span>Rectus Abdominis</span>
                      <span>{Math.round(biomechanics.muscleActivation.rectusAbdominis)}%</span>
                    </div>
                    <Progress value={biomechanics.muscleActivation.rectusAbdominis} className="h-1.5" />
                    
                    <div className="flex justify-between text-xs">
                      <span>Obliques</span>
                      <span>{Math.round(biomechanics.muscleActivation.obliques)}%</span>
                    </div>
                    <Progress value={biomechanics.muscleActivation.obliques} className="h-1.5" />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Bilateral Comparison (L vs R)</h4>
                  <div className="space-y-2">
                    <MuscleActivationBar 
                      name="Glute Max" 
                      left={Math.round(biomechanics.muscleActivation.gluteusMaximus.left)} 
                      right={Math.round(biomechanics.muscleActivation.gluteusMaximus.right)} 
                    />
                    <MuscleActivationBar 
                      name="Glute Med" 
                      left={Math.round(biomechanics.muscleActivation.gluteusMedius.left)} 
                      right={Math.round(biomechanics.muscleActivation.gluteusMedius.right)} 
                    />
                    <MuscleActivationBar 
                      name="Quadriceps" 
                      left={Math.round(biomechanics.muscleActivation.quadriceps.left)} 
                      right={Math.round(biomechanics.muscleActivation.quadriceps.right)} 
                    />
                    <MuscleActivationBar 
                      name="Hamstrings" 
                      left={Math.round(biomechanics.muscleActivation.hamstrings.left)} 
                      right={Math.round(biomechanics.muscleActivation.hamstrings.right)} 
                    />
                    <MuscleActivationBar 
                      name="Gastrocnemius" 
                      left={Math.round(biomechanics.muscleActivation.gastrocnemius.left)} 
                      right={Math.round(biomechanics.muscleActivation.gastrocnemius.right)} 
                    />
                    <MuscleActivationBar 
                      name="Hip Flexors" 
                      left={Math.round(biomechanics.muscleActivation.iliopsoas.left)} 
                      right={Math.round(biomechanics.muscleActivation.iliopsoas.right)} 
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Asymmetry Analysis</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Glute Max:</span>
                      <span className={biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.gluteMax > 15 ? 'text-orange-500 font-medium' : ''}>
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.gluteMax}%
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.gluteMax > 15 && 
                          <AlertTriangle className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Quads:</span>
                      <span className={biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.quadriceps > 15 ? 'text-orange-500 font-medium' : ''}>
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.quadriceps}%
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.quadriceps > 15 && 
                          <AlertTriangle className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Glute Med:</span>
                      <span className={biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.gluteMed > 15 ? 'text-orange-500 font-medium' : ''}>
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.gluteMed}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Hamstrings:</span>
                      <span className={biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.hamstrings > 15 ? 'text-orange-500 font-medium' : ''}>
                        {biomechanics.asymmetryAnalysis.muscleActivationAsymmetry.hamstrings}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="risks" className="mt-3">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${RISK_COLORS[injuryRisks.overallRiskLevel]}`} />
                    <span className="font-medium">Overall Risk Level</span>
                  </div>
                  <RiskBadge level={injuryRisks.overallRiskLevel} />
                </div>
                
                <JointRiskCard 
                  title="Lumbar Spine" 
                  risks={formatLumbarRisks()} 
                />
                
                <JointRiskCard 
                  title="Hip" 
                  risks={formatBilateralRisks('hip')} 
                />
                
                <JointRiskCard 
                  title="Knee" 
                  risks={formatBilateralRisks('knee')} 
                />
                
                <JointRiskCard 
                  title="Ankle" 
                  risks={formatBilateralRisks('ankle')} 
                />
                
                <JointRiskCard 
                  title="Shoulder" 
                  risks={formatBilateralRisks('shoulder')} 
                />
                
                {injuryRisks.thresholdWarnings.jointWarnings.length > 0 && (
                  <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <h4 className="text-sm font-medium flex items-center gap-1 text-orange-600 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Threshold Warnings
                    </h4>
                    <ul className="text-xs space-y-1">
                      {injuryRisks.thresholdWarnings.jointWarnings.map((w, i) => (
                        <li key={i} className="text-muted-foreground">
                          {w.joint}: {w.metric} exceeds safe threshold
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="quality" className="mt-3">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="text-4xl font-bold text-blue-600 mb-1">
                    {biomechanics.movementQuality.overallScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Movement Quality</div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg border">
                    <div className="text-xl font-semibold">{biomechanics.movementQuality.stabilityScore}</div>
                    <div className="text-xs text-muted-foreground">Stability</div>
                  </div>
                  <div className="text-center p-2 rounded-lg border">
                    <div className="text-xl font-semibold">{biomechanics.movementQuality.mobilityScore}</div>
                    <div className="text-xs text-muted-foreground">Mobility</div>
                  </div>
                  <div className="text-center p-2 rounded-lg border">
                    <div className="text-xl font-semibold">{biomechanics.movementQuality.controlScore}</div>
                    <div className="text-xs text-muted-foreground">Control</div>
                  </div>
                </div>
                
                {biomechanics.movementQuality.compensationPatterns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      Compensation Patterns
                    </h4>
                    <ul className="text-xs space-y-1 pl-2">
                      {biomechanics.movementQuality.compensationPatterns.map((p, i) => (
                        <li key={i} className="flex items-center gap-1 text-orange-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {biomechanics.movementQuality.movementFaults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Movement Faults
                    </h4>
                    <ul className="text-xs space-y-1 pl-2">
                      {biomechanics.movementQuality.movementFaults.map((f, i) => (
                        <li key={i} className="flex items-center gap-1 text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {biomechanics.movementQuality.compensationPatterns.length === 0 && 
                 biomechanics.movementQuality.movementFaults.length === 0 && (
                  <div className="text-center p-4">
                    <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No significant movement faults detected
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    Risk Factors Identified
                  </h4>
                  <div className="space-y-2">
                    {injuryRisks.riskFactors.biomechanical.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Biomechanical:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {injuryRisks.riskFactors.biomechanical.slice(0, 4).map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {injuryRisks.riskFactors.muscular.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Muscular:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {injuryRisks.riskFactors.muscular.slice(0, 4).map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="ai" className="mt-3">
            <ScrollArea className="h-[320px] pr-3">
              {!treatmentStrategy && !isGeneratingAI && (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <h4 className="font-medium mb-2">AI Clinical Assessment</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a comprehensive treatment strategy based on the biomechanical analysis using AI.
                  </p>
                  <Button 
                    onClick={handleGenerateAIAssessment}
                    className="bg-gradient-to-r from-purple-600 to-blue-600"
                    data-testid="button-generate-ai-assessment"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Treatment Plan
                  </Button>
                  {aiError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {aiError}
                    </div>
                  )}
                </div>
              )}
              
              {isGeneratingAI && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing biomechanics and generating treatment strategy...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take 10-15 seconds
                  </p>
                </div>
              )}
              
              {treatmentStrategy && !isGeneratingAI && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleGenerateAIAssessment}
                      data-testid="button-regenerate-ai"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                    <p className="text-sm">{treatmentStrategy.clinicalSummary}</p>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="problems">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-red-500" />
                          Primary Problems ({treatmentStrategy.primaryProblems?.length || 0})
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {treatmentStrategy.primaryProblems?.map((problem, idx) => (
                            <div key={idx} className="p-2 rounded border text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{problem.problem}</span>
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
                              {problem.relatedFindings?.length > 0 && (
                                <div className="text-muted-foreground">
                                  Findings: {problem.relatedFindings.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="goals">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          Treatment Goals
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Short-term
                            </h5>
                            {treatmentStrategy.treatmentGoals?.shortTerm?.map((goal, idx) => (
                              <div key={idx} className="text-xs p-2 rounded border mb-1">
                                <div className="font-medium">{goal.goal}</div>
                                <div className="text-muted-foreground">{goal.timeframe}</div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">Long-term</h5>
                            {treatmentStrategy.treatmentGoals?.longTerm?.map((goal, idx) => (
                              <div key={idx} className="text-xs p-2 rounded border mb-1">
                                <div className="font-medium">{goal.goal}</div>
                                <div className="text-muted-foreground">{goal.timeframe}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="exercises">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-green-500" />
                          Exercises ({treatmentStrategy.interventions?.therapeuticExercises?.length || 0})
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {treatmentStrategy.interventions?.therapeuticExercises?.map((ex, idx) => (
                            <div key={idx} className="p-2 rounded border text-xs">
                              <div className="font-medium text-green-600">{ex.exercise}</div>
                              <div className="grid grid-cols-3 gap-1 mt-1 text-muted-foreground">
                                <span>{ex.sets} sets</span>
                                <span>{ex.reps} reps</span>
                                <span>{ex.frequency}</span>
                              </div>
                              <div className="mt-1 text-muted-foreground italic">{ex.rationale}</div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="precautions">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Precautions
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {treatmentStrategy.precautions?.redFlags?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-red-500 mb-1">Red Flags</h5>
                              <ul className="text-xs space-y-1">
                                {treatmentStrategy.precautions.redFlags.map((flag, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
                                    {flag}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {treatmentStrategy.precautions?.contraindications?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-orange-500 mb-1">Contraindications</h5>
                              <ul className="text-xs space-y-1">
                                {treatmentStrategy.precautions.contraindications.map((c, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5" />
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="prognosis">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-500" />
                          Prognosis
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-xs">
                          <div className="p-2 rounded bg-muted/50">
                            <span className="font-medium">Expected Recovery: </span>
                            {treatmentStrategy.prognosis?.expectedRecoveryTime}
                          </div>
                          <div>
                            <p className="text-muted-foreground">{treatmentStrategy.prognosis?.expectedOutcome}</p>
                          </div>
                          {treatmentStrategy.prognosis?.prognosticFactors?.positive?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {treatmentStrategy.prognosis.prognosticFactors.positive.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-green-500 text-xs">{f}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
