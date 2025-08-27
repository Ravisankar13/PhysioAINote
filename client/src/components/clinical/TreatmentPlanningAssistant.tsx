import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Target,
  Activity,
  Home,
  Clock,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  ChevronRight,
  Dumbbell,
  Heart,
  Brain,
  Timer,
  Users,
  CheckCircle,
  BarChart3,
  Zap,
  Repeat,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  name: string;
  category: 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'cardio' | 'functional';
  sets?: number;
  reps?: string;
  hold?: number;
  duration?: number;
  frequency?: string;
  intensity?: string;
  progression?: string;
  precautions?: string;
  equipment?: string[];
  videoUrl?: string;
}

interface TreatmentPhase {
  id: string;
  name: string;
  duration: string;
  goals: string[];
  exercises: Exercise[];
  manualTherapy?: string[];
  modalities?: string[];
  precautions?: string[];
  progressionCriteria?: string[];
}

interface TreatmentPlan {
  diagnosis: string;
  duration: string;
  frequency: string;
  phases: TreatmentPhase[];
  homeProgram: Exercise[];
  outcomes: string[];
  reassessmentDate?: string;
}

interface TreatmentPlanningAssistantProps {
  onGeneratePlan?: (plan: TreatmentPlan) => void;
  onExportPlan?: (plan: TreatmentPlan) => void;
  patientInfo?: {
    diagnosis?: string;
    goals?: string[];
    limitations?: string[];
  };
}

// Sample exercise database
const exerciseDatabase: Exercise[] = [
  // Strengthening
  {
    id: 'ex1',
    name: 'Quadriceps Sets',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    hold: 5,
    intensity: 'Maximal contraction',
    equipment: []
  },
  {
    id: 'ex2',
    name: 'Straight Leg Raises',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    intensity: 'Body weight',
    progression: 'Add ankle weights',
    equipment: ['Ankle weights (optional)']
  },
  {
    id: 'ex3',
    name: 'Glute Bridges',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Body weight to resistance band',
    equipment: ['Resistance band (optional)']
  },
  // Stretching
  {
    id: 'ex4',
    name: 'Hamstring Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: ['Towel or strap']
  },
  {
    id: 'ex5',
    name: 'Hip Flexor Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Moderate stretch',
    equipment: []
  },
  // Mobility
  {
    id: 'ex6',
    name: 'Cat-Cow Mobility',
    category: 'mobility',
    sets: 3,
    reps: '10-12',
    intensity: 'Controlled movement',
    equipment: ['Yoga mat']
  },
  // Neuromuscular
  {
    id: 'ex7',
    name: 'Single Leg Balance',
    category: 'neuromuscular',
    sets: 3,
    hold: 30,
    progression: 'Eyes closed, unstable surface',
    equipment: ['Balance pad (optional)']
  },
  // Cardio
  {
    id: 'ex8',
    name: 'Stationary Cycling',
    category: 'cardio',
    duration: 20,
    intensity: 'Moderate (60-70% HR max)',
    equipment: ['Stationary bike']
  }
];

export default function TreatmentPlanningAssistant({ 
  onGeneratePlan,
  onExportPlan,
  patientInfo 
}: TreatmentPlanningAssistantProps) {
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState(patientInfo?.diagnosis || '');
  const [sessionFrequency, setSessionFrequency] = useState('2x/week');
  const [planDuration, setPlanDuration] = useState('8 weeks');
  const [phases, setPhases] = useState<TreatmentPhase[]>([
    {
      id: 'phase1',
      name: 'Acute/Protection Phase',
      duration: '0-2 weeks',
      goals: ['Reduce pain and inflammation', 'Protect healing tissues', 'Maintain ROM'],
      exercises: [],
      manualTherapy: [],
      modalities: [],
      precautions: [],
      progressionCriteria: []
    }
  ]);
  const [selectedPhase, setSelectedPhase] = useState('phase1');
  const [homeProgram, setHomeProgram] = useState<Exercise[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([
    'Reduce pain to 2/10 or less',
    'Return to full activities',
    'Independent with home program'
  ]);

  const addPhase = () => {
    const newPhase: TreatmentPhase = {
      id: `phase${phases.length + 1}`,
      name: `Phase ${phases.length + 1}`,
      duration: '',
      goals: [],
      exercises: [],
      manualTherapy: [],
      modalities: [],
      precautions: [],
      progressionCriteria: []
    };
    setPhases([...phases, newPhase]);
    setSelectedPhase(newPhase.id);
  };

  const updatePhase = (phaseId: string, updates: Partial<TreatmentPhase>) => {
    setPhases(phases.map(p => p.id === phaseId ? { ...p, ...updates } : p));
  };

  const deletePhase = (phaseId: string) => {
    if (phases.length > 1) {
      setPhases(phases.filter(p => p.id !== phaseId));
      if (selectedPhase === phaseId) {
        setSelectedPhase(phases[0].id);
      }
    }
  };

  const addExerciseToPhase = (phaseId: string, exercise: Exercise) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase && !phase.exercises.find(e => e.id === exercise.id)) {
      updatePhase(phaseId, {
        exercises: [...phase.exercises, exercise]
      });
    }
  };

  const removeExerciseFromPhase = (phaseId: string, exerciseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      updatePhase(phaseId, {
        exercises: phase.exercises.filter(e => e.id !== exerciseId)
      });
    }
  };

  const addToHomeProgram = (exercise: Exercise) => {
    if (!homeProgram.find(e => e.id === exercise.id)) {
      setHomeProgram([...homeProgram, exercise]);
    }
  };

  const removeFromHomeProgram = (exerciseId: string) => {
    setHomeProgram(homeProgram.filter(e => e.id !== exerciseId));
  };

  const generateAIPlan = () => {
    // In production, this would call an AI service
    toast({
      title: "AI Plan Generation",
      description: "Generating evidence-based treatment plan...",
    });
    
    // Simulate AI generation
    setTimeout(() => {
      const aiGeneratedPhases: TreatmentPhase[] = [
        {
          id: 'ai-phase1',
          name: 'Protection & Pain Management',
          duration: '0-2 weeks',
          goals: [
            'Reduce pain to 4/10',
            'Protect healing tissues',
            'Maintain available ROM',
            'Patient education'
          ],
          exercises: [exerciseDatabase[0], exerciseDatabase[3]],
          manualTherapy: ['Gentle mobilizations Grade I-II', 'Soft tissue techniques'],
          modalities: ['Ice', 'TENS as needed'],
          precautions: ['Avoid provocative positions', 'Weight bearing as tolerated'],
          progressionCriteria: ['Pain <4/10', 'Minimal swelling', 'Good quad control']
        },
        {
          id: 'ai-phase2',
          name: 'Mobility & Early Strengthening',
          duration: '2-4 weeks',
          goals: [
            'Restore full ROM',
            'Begin strengthening',
            'Normalize gait pattern',
            'Improve proprioception'
          ],
          exercises: [exerciseDatabase[1], exerciseDatabase[2], exerciseDatabase[5], exerciseDatabase[6]],
          manualTherapy: ['Joint mobilizations Grade III-IV', 'Muscle energy techniques'],
          modalities: ['Heat before exercise'],
          precautions: ['Progress as tolerated'],
          progressionCriteria: ['Full ROM', 'Good strength', 'Single leg stance 30 sec']
        },
        {
          id: 'ai-phase3',
          name: 'Advanced Strengthening & Function',
          duration: '4-8 weeks',
          goals: [
            'Return to full function',
            'Sport-specific training',
            'Injury prevention',
            'Independent with program'
          ],
          exercises: [exerciseDatabase[2], exerciseDatabase[6], exerciseDatabase[7]],
          manualTherapy: ['As needed for restrictions'],
          modalities: [],
          precautions: ['Monitor for overload'],
          progressionCriteria: ['Meet discharge goals', 'Pass functional tests']
        }
      ];
      
      setPhases(aiGeneratedPhases);
      toast({
        title: "Plan Generated",
        description: "AI has created an evidence-based treatment plan",
      });
    }, 2000);
  };

  const exportPlan = () => {
    const plan: TreatmentPlan = {
      diagnosis,
      duration: planDuration,
      frequency: sessionFrequency,
      phases,
      homeProgram,
      outcomes,
      reassessmentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    if (onExportPlan) {
      onExportPlan(plan);
    }
    
    // Create and download text file
    const planText = formatPlanAsText(plan);
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treatment-plan-${diagnosis.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Plan Exported",
      description: "Treatment plan has been downloaded",
    });
  };

  const formatPlanAsText = (plan: TreatmentPlan): string => {
    let text = `TREATMENT PLAN\n`;
    text += `==============\n\n`;
    text += `Diagnosis: ${plan.diagnosis}\n`;
    text += `Duration: ${plan.duration}\n`;
    text += `Frequency: ${plan.frequency}\n`;
    text += `Reassessment: ${plan.reassessmentDate}\n\n`;
    
    text += `TREATMENT PHASES\n`;
    text += `----------------\n`;
    plan.phases.forEach((phase, idx) => {
      text += `\n${idx + 1}. ${phase.name} (${phase.duration})\n`;
      text += `   Goals:\n`;
      phase.goals.forEach(goal => text += `   - ${goal}\n`);
      
      if (phase.exercises.length > 0) {
        text += `   Exercises:\n`;
        phase.exercises.forEach(ex => {
          text += `   - ${ex.name}`;
          if (ex.sets && ex.reps) text += ` (${ex.sets} x ${ex.reps})`;
          if (ex.hold) text += ` Hold: ${ex.hold}s`;
          text += `\n`;
        });
      }
      
      if (phase.progressionCriteria && phase.progressionCriteria.length > 0) {
        text += `   Progression Criteria:\n`;
        phase.progressionCriteria.forEach(criteria => text += `   - ${criteria}\n`);
      }
    });
    
    text += `\nHOME EXERCISE PROGRAM\n`;
    text += `---------------------\n`;
    plan.homeProgram.forEach(ex => {
      text += `- ${ex.name}`;
      if (ex.sets && ex.reps) text += ` (${ex.sets} x ${ex.reps})`;
      if (ex.frequency) text += ` ${ex.frequency}`;
      text += `\n`;
    });
    
    text += `\nEXPECTED OUTCOMES\n`;
    text += `-----------------\n`;
    plan.outcomes.forEach(outcome => text += `- ${outcome}\n`);
    
    return text;
  };

  const currentPhase = phases.find(p => p.id === selectedPhase);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Treatment Planning Assistant
          </div>
          <Button 
            size="sm" 
            onClick={generateAIPlan}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Zap className="h-4 w-4 mr-1" />
            AI Generate
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="phases" className="h-full">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="phases" className="flex-1">
              <Activity className="h-3 w-3 mr-1" />
              Phases
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex-1">
              <Dumbbell className="h-3 w-3 mr-1" />
              Exercises
            </TabsTrigger>
            <TabsTrigger value="home" className="flex-1">
              <Home className="h-3 w-3 mr-1" />
              Home Program
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="flex-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Outcomes
            </TabsTrigger>
          </TabsList>
          
          {/* Phases Tab */}
          <TabsContent value="phases" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Basic Plan Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Diagnosis/Condition</Label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Rotator cuff tendinopathy"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Session Frequency</Label>
                    <Select value={sessionFrequency} onValueChange={setSessionFrequency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x/week">1x/week</SelectItem>
                        <SelectItem value="2x/week">2x/week</SelectItem>
                        <SelectItem value="3x/week">3x/week</SelectItem>
                        <SelectItem value="Daily">Daily HEP only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Phase Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Treatment Phases</Label>
                    <Button size="sm" variant="outline" onClick={addPhase}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Phase
                    </Button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {phases.map((phase, idx) => (
                      <Button
                        key={phase.id}
                        size="sm"
                        variant={selectedPhase === phase.id ? "default" : "outline"}
                        onClick={() => setSelectedPhase(phase.id)}
                        className="flex-shrink-0"
                      >
                        Phase {idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Current Phase Details */}
                {currentPhase && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={currentPhase.name}
                            onChange={(e) => updatePhase(currentPhase.id, { name: e.target.value })}
                            className="font-semibold"
                          />
                          {phases.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletePhase(currentPhase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Input
                            value={currentPhase.duration}
                            onChange={(e) => updatePhase(currentPhase.id, { duration: e.target.value })}
                            placeholder="e.g., 0-2 weeks"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Goals</Label>
                          <Textarea
                            value={currentPhase.goals.join('\n')}
                            onChange={(e) => updatePhase(currentPhase.id, { 
                              goals: e.target.value.split('\n').filter(g => g.trim()) 
                            })}
                            placeholder="One goal per line"
                            className="mt-1 min-h-[80px]"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Progression Criteria</Label>
                          <Textarea
                            value={currentPhase.progressionCriteria?.join('\n') || ''}
                            onChange={(e) => updatePhase(currentPhase.id, { 
                              progressionCriteria: e.target.value.split('\n').filter(c => c.trim()) 
                            })}
                            placeholder="Criteria to advance to next phase"
                            className="mt-1 min-h-[60px]"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Exercises in this Phase</Label>
                          <div className="mt-2 space-y-2">
                            {currentPhase.exercises.map((exercise) => (
                              <div key={exercise.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">{exercise.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeExerciseFromPhase(currentPhase.id, exercise.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Exercises Tab */}
          <TabsContent value="exercises" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {exerciseDatabase.map((exercise) => (
                  <Card key={exercise.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{exercise.name}</h4>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {exercise.category}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => currentPhase && addExerciseToPhase(currentPhase.id, exercise)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Phase
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToHomeProgram(exercise)}
                          >
                            <Home className="h-3 w-3 mr-1" />
                            HEP
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        {exercise.sets && exercise.reps && (
                          <p>Sets/Reps: {exercise.sets} x {exercise.reps}</p>
                        )}
                        {exercise.hold && (
                          <p>Hold: {exercise.hold} seconds</p>
                        )}
                        {exercise.intensity && (
                          <p>Intensity: {exercise.intensity}</p>
                        )}
                        {exercise.progression && (
                          <p>Progression: {exercise.progression}</p>
                        )}
                        {exercise.equipment && exercise.equipment.length > 0 && (
                          <p>Equipment: {exercise.equipment.join(', ')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Home Program Tab */}
          <TabsContent value="home" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {homeProgram.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exercises in home program yet</p>
                    <p className="text-xs mt-1">Add exercises from the Exercises tab</p>
                  </div>
                ) : (
                  homeProgram.map((exercise) => (
                    <Card key={exercise.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{exercise.name}</h4>
                            <div className="text-xs text-muted-foreground mt-1">
                              {exercise.sets && exercise.reps && (
                                <span>{exercise.sets} x {exercise.reps}</span>
                              )}
                              {exercise.hold && (
                                <span> · Hold {exercise.hold}s</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromHomeProgram(exercise.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                
                <div className="pt-4">
                  <Label className="text-xs">Frequency Instructions</Label>
                  <Textarea
                    placeholder="e.g., Perform exercises 2x daily, morning and evening"
                    className="mt-1"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Expected Outcomes</Label>
                  <Textarea
                    value={outcomes.join('\n')}
                    onChange={(e) => setOutcomes(e.target.value.split('\n').filter(o => o.trim()))}
                    placeholder="One outcome per line"
                    className="mt-1 min-h-[120px]"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Plan Duration</Label>
                  <Select value={planDuration} onValueChange={setPlanDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4 weeks">4 weeks</SelectItem>
                      <SelectItem value="6 weeks">6 weeks</SelectItem>
                      <SelectItem value="8 weeks">8 weeks</SelectItem>
                      <SelectItem value="12 weeks">12 weeks</SelectItem>
                      <SelectItem value="16 weeks">16 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Reassessment Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="pt-4 space-y-2">
                  <Button className="w-full" onClick={exportPlan}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Treatment Plan
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Patient Handout
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}