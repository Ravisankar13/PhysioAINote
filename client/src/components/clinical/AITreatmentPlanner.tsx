import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Brain, 
  Send, 
  RefreshCw, 
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  User,
  FileText,
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { exerciseDatabase } from '@/data/exerciseDatabase';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  questionCategory?: string;
}

interface PatientProfile {
  age?: number;
  gender?: string;
  occupation?: string;
  activityLevel?: string;
  symptomDuration?: string;
  painSeverity?: number;
  previousTreatments?: string[];
  comorbidities?: string[];
  goals?: string[];
  limitations?: string[];
  aggravatingFactors?: string[];
  easingFactors?: string[];
  sleepQuality?: string;
  medicationUse?: string[];
}

interface TreatmentPhase {
  id: string;
  name: string;
  duration: string;
  goals: string[];
  exercises: any[];
  precautions: string[];
  progressionCriteria: string[];
  educationPoints: string[];
}

interface TreatmentPlan {
  diagnosis: string;
  patientProfile: PatientProfile;
  phases: TreatmentPhase[];
  homeProgram: any[];
  redFlags: string[];
  outcomeMeasures: string[];
  clinicalReasoning: string;
  lastUpdated: Date;
}

export function AITreatmentPlanner() {
  const [diagnosis, setDiagnosis] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentProgress, setAssessmentProgress] = useState(0);
  const [patientProfile, setPatientProfile] = useState<PatientProfile>({});
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAssessmentStarted, setIsAssessmentStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const startAssessment = async () => {
    if (!diagnosis.trim()) {
      toast({
        title: "Diagnosis Required",
        description: "Please enter a diagnosis or condition to begin the assessment.",
        variant: "destructive"
      });
      return;
    }

    setIsAssessmentStarted(true);
    setIsLoading(true);

    try {
      // Add initial message
      const initialMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I'll help you create a comprehensive treatment plan for ${diagnosis}. Let me ask you some questions to personalize the plan for your patient.`,
        timestamp: new Date(),
        questionCategory: 'Introduction'
      };
      setChatMessages([initialMessage]);

      // Generate initial plan
      generateInitialPlan(diagnosis);

      // Get questions from API
      const response = await apiRequest('POST', '/api/treatment-planner/start', { diagnosis });
      console.log('API Response:', response);
      
      if (response.success && response.questions && response.questions.length > 0) {
        // Store questions for sequential asking
        const questions = response.questions;
        console.log('Questions received:', questions);
        localStorage.setItem('treatment-questions', JSON.stringify(questions));
        
        // Ask first question
        const firstQuestion = questions[0];
        const questionMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: firstQuestion.question,
          timestamp: new Date(),
          questionCategory: firstQuestion.category
        };
        console.log('Adding question message:', questionMessage);
        setChatMessages(prev => [...prev, questionMessage]);
        setCurrentQuestionIndex(1);
        setAssessmentProgress(10);
      } else {
        console.log('No questions in response, using defaults');
        // Fall back to default questions
        setTimeout(() => {
          askNextQuestion();
        }, 500);
      }
    } catch (error) {
      console.error('Error starting assessment:', error);
      // Fall back to default questions on error
      setTimeout(() => {
        askNextQuestion();
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialPlan = (condition: string) => {
    // Create a basic plan that will be refined with each answer
    const initialPlan: TreatmentPlan = {
      diagnosis: condition,
      patientProfile: {},
      phases: [
        {
          id: '1',
          name: 'Acute/Initial Phase',
          duration: '0-2 weeks',
          goals: [
            'Reduce pain and inflammation',
            'Protect healing tissues',
            'Maintain range of motion'
          ],
          exercises: selectExercisesForCondition(condition, 'initial'),
          precautions: ['Avoid painful activities', 'Monitor for red flags'],
          progressionCriteria: ['Pain reduction by 30%', 'Improved function'],
          educationPoints: ['Pain management strategies', 'Activity modification']
        },
        {
          id: '2',
          name: 'Recovery/Strengthening Phase',
          duration: '2-6 weeks',
          goals: [
            'Progressive strengthening',
            'Improve flexibility',
            'Restore normal movement patterns'
          ],
          exercises: selectExercisesForCondition(condition, 'strengthening'),
          precautions: ['Progress gradually', 'Monitor symptoms'],
          progressionCriteria: ['Full ROM achieved', 'Strength 70% of unaffected side'],
          educationPoints: ['Proper exercise technique', 'Load management']
        },
        {
          id: '3',
          name: 'Return to Function Phase',
          duration: '6-12 weeks',
          goals: [
            'Full functional restoration',
            'Return to activities',
            'Prevention strategies'
          ],
          exercises: selectExercisesForCondition(condition, 'functional'),
          precautions: ['Gradual return to sport/work'],
          progressionCriteria: ['Full strength', 'Symptom-free with activities'],
          educationPoints: ['Long-term management', 'Prevention strategies']
        }
      ],
      homeProgram: [],
      redFlags: [],
      outcomeMeasures: generateOutcomeMeasures(condition),
      clinicalReasoning: `Initial treatment plan for ${condition} following evidence-based guidelines.`,
      lastUpdated: new Date()
    };

    setTreatmentPlan(initialPlan);
  };

  const selectExercisesForCondition = (condition: string, phase: string): any[] => {
    // AI would select appropriate exercises from the database
    // For now, we'll do basic matching
    const keywords = condition.toLowerCase().split(' ');
    let relevantExercises = exerciseDatabase.filter(exercise => {
      const exerciseText = `${exercise.name} ${exercise.category} ${exercise.bodyPart}`.toLowerCase();
      return keywords.some(keyword => exerciseText.includes(keyword));
    });

    // Select exercises based on phase
    if (phase === 'initial') {
      relevantExercises = relevantExercises.filter(e => 
        e.category === 'mobility' || e.category === 'stretching'
      ).slice(0, 5);
    } else if (phase === 'strengthening') {
      relevantExercises = relevantExercises.filter(e => 
        e.category === 'strengthening' || e.category === 'stabilization'
      ).slice(0, 6);
    } else {
      relevantExercises = relevantExercises.filter(e => 
        e.category === 'functional' || e.category === 'plyometric'
      ).slice(0, 5);
    }

    return relevantExercises;
  };

  const generateOutcomeMeasures = (condition: string): string[] => {
    const baselineMeasures = ['Visual Analog Scale (VAS)', 'Patient-Specific Functional Scale'];
    
    if (condition.toLowerCase().includes('shoulder')) {
      return [...baselineMeasures, 'DASH Score', 'Shoulder Pain and Disability Index'];
    } else if (condition.toLowerCase().includes('knee')) {
      return [...baselineMeasures, 'KOOS', 'Lysholm Score'];
    } else if (condition.toLowerCase().includes('back') || condition.toLowerCase().includes('lumbar')) {
      return [...baselineMeasures, 'Oswestry Disability Index', 'Roland-Morris'];
    } else if (condition.toLowerCase().includes('neck') || condition.toLowerCase().includes('cervical')) {
      return [...baselineMeasures, 'Neck Disability Index'];
    }
    
    return baselineMeasures;
  };

  const questionBank = [
    { 
      question: "What is the patient's age and gender?", 
      category: "Demographics",
      field: ['age', 'gender']
    },
    { 
      question: "How long has the patient been experiencing symptoms? (e.g., 2 weeks, 3 months)", 
      category: "History",
      field: ['symptomDuration']
    },
    { 
      question: "On a scale of 0-10, what is the patient's average pain level?", 
      category: "Symptoms",
      field: ['painSeverity']
    },
    { 
      question: "What is the patient's occupation and typical daily activities?", 
      category: "Function",
      field: ['occupation', 'activityLevel']
    },
    { 
      question: "What movements or activities make the symptoms worse?", 
      category: "Symptoms",
      field: ['aggravatingFactors']
    },
    { 
      question: "What provides relief or makes symptoms better?", 
      category: "Symptoms",
      field: ['easingFactors']
    },
    { 
      question: "Has the patient tried any previous treatments? If so, what worked or didn't work?", 
      category: "History",
      field: ['previousTreatments']
    },
    { 
      question: "Are there any other medical conditions or medications we should be aware of?", 
      category: "Medical",
      field: ['comorbidities', 'medicationUse']
    },
    { 
      question: "What are the patient's main goals for therapy?", 
      category: "Goals",
      field: ['goals']
    },
    { 
      question: "How is the patient's sleep quality? Any night pain?", 
      category: "Symptoms",
      field: ['sleepQuality']
    }
  ];

  const askNextQuestion = () => {
    // Try to get stored questions from API first
    const storedQuestions = localStorage.getItem('treatment-questions');
    const questions = storedQuestions ? JSON.parse(storedQuestions) : questionBank;
    
    if (currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex];
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: question.question,
        timestamp: new Date(),
        questionCategory: question.category
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setCurrentQuestionIndex(prev => prev + 1);
      setAssessmentProgress((currentQuestionIndex + 1) / questions.length * 100);
    } else {
      // Assessment complete - generate final plan
      generateFinalPlan();
    }
  };

  const generateFinalPlan = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/treatment-planner/complete', {
        diagnosis,
        patientProfile
      });

      if (response.plan) {
        // Update with complete plan from AI
        const completePlan = response.plan;
        if (completePlan.phases && treatmentPlan) {
          setTreatmentPlan({
            ...treatmentPlan,
            phases: completePlan.phases,
            outcomeMeasures: completePlan.outcomeMeasures || treatmentPlan.outcomeMeasures,
            redFlags: completePlan.redFlags || treatmentPlan.redFlags,
            clinicalReasoning: completePlan.clinicalReasoning || treatmentPlan.clinicalReasoning
          });
        }
      }
    } catch (error) {
      console.error('Error generating final plan:', error);
    }

    // Assessment complete message
    const completionMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: "Thank you! I've gathered all the information needed. Your personalized treatment plan is complete and ready for review. You can continue to refine it by asking specific questions or making adjustments.",
      timestamp: new Date(),
      questionCategory: 'Completion'
    };
    setChatMessages(prev => [...prev, completionMessage]);
    setAssessmentProgress(100);
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    const userAnswer = currentInput;
    setCurrentInput('');
    // Process locally for speed - no API calls
    const lastAIMessage = chatMessages.filter(m => m.type === 'ai').pop();
    const questionContext = lastAIMessage?.content || '';
    
    // Update patient profile based on answer
    const updatedProfile = { ...patientProfile };
    const lowerAnswer = userAnswer.toLowerCase();
    const lowerContext = questionContext.toLowerCase();
    
    // Extract information from answer
    if (lowerContext.includes('age') || lowerContext.includes('gender')) {
      const ageMatch = userAnswer.match(/(\d+)\s*(?:year|yr)?/i);
      if (ageMatch) {
        updatedProfile.age = parseInt(ageMatch[1]);
      }
      if (lowerAnswer.includes('male')) {
        updatedProfile.gender = 'male';
      } else if (lowerAnswer.includes('female')) {
        updatedProfile.gender = 'female';
      }
    }
    
    if (lowerContext.includes('knee') || lowerContext.includes('which')) {
      if (lowerAnswer.includes('right')) updatedProfile.affectedSide = 'right';
      if (lowerAnswer.includes('left')) updatedProfile.affectedSide = 'left';
      if (lowerAnswer.includes('both')) updatedProfile.affectedSide = 'bilateral';
    }
    
    if (lowerContext.includes('how long') || lowerContext.includes('duration')) {
      updatedProfile.symptomDuration = userAnswer;
    }
    
    if (lowerContext.includes('rate') || lowerContext.includes('0-10') || lowerContext.includes('pain')) {
      const severityMatch = userAnswer.match(/(\d+)/);
      if (severityMatch) {
        updatedProfile.painSeverity = parseInt(severityMatch[1]);
      }
    }
    
    if (lowerContext.includes('sport') || lowerContext.includes('activity') || lowerContext.includes('occupation')) {
      updatedProfile.occupation = userAnswer;
    }
    
    if (lowerContext.includes('goal')) {
      updatedProfile.goals = userAnswer;
    }
    
    setPatientProfile(updatedProfile);
    
    // Update treatment plan immediately
    if (treatmentPlan) {
      updatePlanBasedOnAnswer(userAnswer);
    }
    
    // Update progress
    setAssessmentProgress(prev => Math.min(prev + 12.5, 100));
    
    // Show typing indicator briefly, then ask next question after 5 seconds
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      askNextQuestion();
    }, 5000);
  };

  const updatePlanBasedOnAnswer = (answer: string) => {
    if (!treatmentPlan) return;

    // Parse answer and update patient profile
    const updatedProfile = { ...patientProfile };
    
    // Simple parsing logic (in real implementation, AI would handle this)
    if (answer.match(/\d+/)) {
      const age = parseInt(answer.match(/\d+/)![0]);
      if (age < 100 && age > 0) {
        updatedProfile.age = age;
      }
    }
    
    if (answer.toLowerCase().includes('male') || answer.toLowerCase().includes('female')) {
      updatedProfile.gender = answer.toLowerCase().includes('male') ? 'male' : 'female';
    }

    setPatientProfile(updatedProfile);

    // Update treatment plan based on new information
    const updatedPlan = { ...treatmentPlan };
    updatedPlan.patientProfile = updatedProfile;
    updatedPlan.lastUpdated = new Date();
    
    // Adjust plan based on specific factors
    if (updatedProfile.age && updatedProfile.age > 65) {
      updatedPlan.phases[0].duration = '0-3 weeks'; // Longer initial phase for elderly
      updatedPlan.phases[0].precautions.push('Consider age-related factors');
    }

    if (answer.toLowerCase().includes('chronic') || answer.toLowerCase().includes('months')) {
      updatedPlan.clinicalReasoning += '\nChronic presentation requires emphasis on central sensitization education and graded exposure.';
      updatedPlan.phases[0].educationPoints.push('Pain neuroscience education');
    }

    setTreatmentPlan(updatedPlan);
  };

  const resetAssessment = () => {
    setDiagnosis('');
    setChatMessages([]);
    setCurrentInput('');
    setIsLoading(false);
    setAssessmentProgress(0);
    setPatientProfile({});
    setTreatmentPlan(null);
    setCurrentQuestionIndex(0);
    setIsAssessmentStarted(false);
  };

  const exportPlan = () => {
    if (!treatmentPlan) return;
    
    // In real implementation, this would generate a PDF or document
    toast({
      title: "Export Started",
      description: "Your treatment plan is being prepared for download.",
    });
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Left Panel - AI Chat Assessment */}
      <div className="w-2/5 flex flex-col h-full">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>AI Treatment Assessment</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={resetAssessment}
                disabled={!isAssessmentStarted}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
            {isAssessmentStarted && (
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Assessment Progress</span>
                  <span>{Math.round(assessmentProgress)}%</span>
                </div>
                <Progress value={assessmentProgress} className="h-2" />
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {!isAssessmentStarted ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start AI Assessment</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Enter a diagnosis to begin the interactive treatment planning process
                </p>
                <div className="w-full max-w-sm space-y-3">
                  <div>
                    <Label htmlFor="diagnosis">Diagnosis/Condition</Label>
                    <Input
                      id="diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Rotator cuff tendinopathy"
                      className="mt-1"
                      onKeyPress={(e) => e.key === 'Enter' && startAssessment()}
                    />
                  </div>
                  <Button onClick={startAssessment} className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Assessment
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.questionCategory && message.type === 'ai' && (
                            <Badge variant="secondary" className="mb-1 text-xs">
                              {message.questionCategory}
                            </Badge>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Type your answer..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !currentInput.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Dynamic Treatment Plan */}
      <div className="flex-1 flex flex-col h-full">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle>Dynamic Treatment Plan</CardTitle>
              {treatmentPlan && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportPlan}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
            {treatmentPlan && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last updated: {treatmentPlan.lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            {!treatmentPlan ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  Treatment plan will appear here as you answer questions
                </p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b px-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="phases">Phases</TabsTrigger>
                  <TabsTrigger value="exercises">Exercises</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="reasoning">Clinical Reasoning</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Diagnosis</h3>
                      <p className="text-lg">{treatmentPlan.diagnosis}</p>
                    </div>
                    
                    {Object.keys(patientProfile).length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Patient Profile</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {patientProfile.age && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>Age: {patientProfile.age}</span>
                            </div>
                          )}
                          {patientProfile.gender && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>Gender: {patientProfile.gender}</span>
                            </div>
                          )}
                          {patientProfile.occupation && (
                            <div className="flex items-center gap-2">
                              <Activity className="h-3 w-3" />
                              <span>Occupation: {patientProfile.occupation}</span>
                            </div>
                          )}
                          {patientProfile.symptomDuration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Duration: {patientProfile.symptomDuration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {treatmentPlan.redFlags.length > 0 && (
                      <div className="border-l-4 border-red-500 bg-red-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <h3 className="font-semibold text-red-900">Red Flags</h3>
                        </div>
                        <ul className="text-sm text-red-800 space-y-1">
                          {treatmentPlan.redFlags.map((flag, idx) => (
                            <li key={idx}>• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold mb-2">Outcome Measures</h3>
                      <div className="flex flex-wrap gap-2">
                        {treatmentPlan.outcomeMeasures.map((measure, idx) => (
                          <Badge key={idx} variant="secondary">
                            {measure}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="phases" className="p-4 space-y-4">
                    {treatmentPlan.phases.map((phase, idx) => (
                      <Card key={phase.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">
                              Phase {idx + 1}: {phase.name}
                            </h3>
                            <Badge variant="outline">{phase.duration}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-1">Goals</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {phase.goals.map((goal, gIdx) => (
                                <li key={gIdx} className="flex items-start gap-1">
                                  <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {goal}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-1">Progression Criteria</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {phase.progressionCriteria.map((criteria, cIdx) => (
                                <li key={cIdx} className="flex items-start gap-1">
                                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                                  {criteria}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {phase.precautions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Precautions</h4>
                              <ul className="text-sm text-amber-600 space-y-1">
                                {phase.precautions.map((precaution, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-1">
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {precaution}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="exercises" className="p-4 space-y-4">
                    {treatmentPlan.phases.map((phase, phaseIdx) => (
                      <div key={phase.id}>
                        <h3 className="font-semibold mb-2">
                          Phase {phaseIdx + 1}: {phase.name}
                        </h3>
                        <div className="grid gap-2">
                          {phase.exercises.map((exercise, exIdx) => (
                            <Card key={exIdx}>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{exercise.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {exercise.category}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {exercise.bodyPart}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {exercise.sets && exercise.reps && (
                                        <span>Sets: {exercise.sets} x {exercise.reps} • </span>
                                      )}
                                      {exercise.hold && (
                                        <span>Hold: {exercise.hold}s • </span>
                                      )}
                                      {exercise.frequency && (
                                        <span>Frequency: {exercise.frequency}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="education" className="p-4 space-y-4">
                    {treatmentPlan.phases.map((phase, idx) => (
                      <div key={phase.id}>
                        <h3 className="font-semibold mb-2">Phase {idx + 1} Education</h3>
                        <ul className="space-y-2">
                          {phase.educationPoints.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="reasoning" className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <h3 className="font-semibold mb-2">Clinical Reasoning</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {treatmentPlan.clinicalReasoning}
                      </p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}