import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Stethoscope, Brain, Trophy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ComplexCase {
  id: number;
  title: string;
  patientDescription: string;
  occupationalHistory: string;
  socialHistory: string;
  medicalHistory: string;
  currentMedications: string;
  mechanismOfInjury: string;
  bodyPart: string;
  complexity: string;
  estimatedTime: number;
  initialPresentation: {
    chiefComplaint: string;
    painScale: number;
    functionalLimitations: string[];
    patientGoals: string[];
  };
  stages: Stage[];
}

interface Stage {
  id: number;
  stageNumber: number;
  title: string;
  description: string;
  timeAllocation: number;
  providedInformation: any;
  questions: Question[];
}

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  expectedAnswers: string[];
  correctAnswer: string;
  rationale: string;
  maxPoints: number;
}

interface CaseAttempt {
  id: number;
  userId: number;
  complexCaseId: number;
  competitionId?: number;
  startedAt: string;
  totalTimeSpent: number;
  stageResponses: any[];
  currentStage: number;
  completed: boolean;
}

export default function ComplexCasePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStage, setCurrentStage] = useState(1);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [stageStartTime, setStageStartTime] = useState<number>(Date.now());
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [attempt, setAttempt] = useState<CaseAttempt | null>(null);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [stageScores, setStageScores] = useState<{ [key: number]: number }>({});
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);
  const [finalResults, setFinalResults] = useState<any>(null);

  // Get case data
  const { data: complexCase, isLoading: loadingCase } = useQuery<ComplexCase>({
    queryKey: [`/api/complex-cases/${id}`],
    enabled: !!id
  });

  // Start case attempt when component loads
  useEffect(() => {
    if (complexCase && !attempt) {
      startAttempt();
    }
  }, [complexCase]);

  const startAttempt = async () => {
    try {
      const response = await apiRequest('POST', `/api/complex-cases/${id}/start`, {
        competitionId: null // Could be passed from URL params for competitions
      });
      const attemptData = await response.json();
      setAttempt(attemptData);
      setStageStartTime(Date.now());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start case attempt",
        variant: "destructive",
      });
    }
  };

  const submitStage = async () => {
    if (!attempt || !complexCase) return;

    setIsSubmittingStage(true);
    const currentStageData = complexCase.stages.find(s => s.stageNumber === currentStage);
    if (!currentStageData) return;

    try {
      const stageTimeSpent = Date.now() - stageStartTime;
      const stageResponses = currentStageData.questions.map(q => ({
        questionId: q.id,
        answer: responses[q.id] || '',
        timeSpent: Math.floor(stageTimeSpent / currentStageData.questions.length)
      }));

      const response = await apiRequest('POST', `/api/complex-case-attempts/${attempt.id}/submit-stage`, {
        stageId: currentStageData.id,
        responses: stageResponses,
        timeSpent: stageTimeSpent
      });
      
      const result = await response.json();
      
      // Update state
      setCompletedStages([...completedStages, currentStage]);
      setStageScores({ ...stageScores, [currentStage]: result.stageScore });
      setTotalTimeSpent(totalTimeSpent + stageTimeSpent);
      
      // Show stage feedback
      toast({
        title: "Stage Completed",
        description: `Score: ${result.stageScore}/${currentStageData.questions.reduce((sum, q) => sum + q.maxPoints, 0)}`,
      });

      // Move to next stage or complete case
      if (currentStage < complexCase.stages.length) {
        setCurrentStage(currentStage + 1);
        setStageStartTime(Date.now());
        setResponses({});
      } else {
        completeCase();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit stage",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingStage(false);
    }
  };

  const completeCase = async () => {
    if (!attempt) return;

    try {
      const response = await apiRequest('POST', `/api/complex-case-attempts/${attempt.id}/complete`, {});
      const results = await response.json();
      setFinalResults(results);
      
      toast({
        title: "Case Completed!",
        description: `Final Score: ${results.totalScore}/100`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete case",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 1000 / 60);
    const secs = Math.floor((seconds / 1000) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingCase) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!complexCase) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
            <p className="text-gray-600">The requested complex case could not be found.</p>
            <Button onClick={() => setLocation('/competitions')} className="mt-4">
              Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (finalResults) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Case Completed!</CardTitle>
            <CardDescription>
              {complexCase.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {finalResults.totalScore}/100
                    </div>
                    <Badge variant={finalResults.totalScore >= 80 ? "default" : "secondary"}>
                      Rank #{finalResults.rank}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Clinical Reasoning</span>
                        <span>{finalResults.categoryScores.clinicalReasoning}/100</span>
                      </div>
                      <Progress value={finalResults.categoryScores.clinicalReasoning} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Assessment Skills</span>
                        <span>{finalResults.categoryScores.assessmentSkills}/100</span>
                      </div>
                      <Progress value={finalResults.categoryScores.assessmentSkills} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Treatment Planning</span>
                        <span>{finalResults.categoryScores.treatmentPlanning}/100</span>
                      </div>
                      <Progress value={finalResults.categoryScores.treatmentPlanning} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Communication</span>
                        <span>{finalResults.categoryScores.communication}/100</span>
                      </div>
                      <Progress value={finalResults.categoryScores.communication} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Time Efficiency</span>
                        <span>{finalResults.categoryScores.timeEfficiency}/100</span>
                      </div>
                      <Progress value={finalResults.categoryScores.timeEfficiency} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {finalResults.feedback.strengths.map((strength: string, index: number) => (
                        <li key={index} className="text-sm">{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {finalResults.feedback.improvementAreas.map((area: string, index: number) => (
                        <li key={index} className="text-sm">{area}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Next Steps</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {finalResults.feedback.nextSteps.map((step: string, index: number) => (
                        <li key={index} className="text-sm">{step}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 text-center">
              <Button onClick={() => setLocation('/competitions')} className="mr-4">
                Back to Competitions
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageData = complexCase.stages.find(s => s.stageNumber === currentStage);
  const progress = (currentStage - 1) / complexCase.stages.length * 100;
  const allQuestionsAnswered = currentStageData?.questions.every(q => responses[q.id]?.trim());

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{complexCase.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {complexCase.bodyPart}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {complexCase.complexity}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {complexCase.estimatedTime} min
                </Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Stage {currentStage} of {complexCase.stages.length}</div>
              <Progress value={progress} className="w-32 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Information Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Chief Complaint</h4>
                <p className="text-sm">{complexCase.initialPresentation.chiefComplaint}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Pain Scale</h4>
                <Badge variant="destructive">{complexCase.initialPresentation.painScale}/10</Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Functional Limitations</h4>
                <ul className="text-sm space-y-1">
                  {complexCase.initialPresentation.functionalLimitations.map((limitation, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {limitation}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Patient Goals</h4>
                <ul className="text-sm space-y-1">
                  {complexCase.initialPresentation.patientGoals.map((goal, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Medical History</h4>
                <p className="text-sm">{complexCase.medicalHistory}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Current Medications</h4>
                <p className="text-sm">{complexCase.currentMedications}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {complexCase.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      completedStages.includes(stage.stageNumber)
                        ? 'bg-green-50 text-green-700'
                        : stage.stageNumber === currentStage
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {completedStages.includes(stage.stageNumber) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : stage.stageNumber === currentStage ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-gray-300" />
                    )}
                    <span className="text-sm font-medium">{stage.title}</span>
                    {stageScores[stage.stageNumber] && (
                      <Badge variant="outline" className="ml-auto">
                        {stageScores[stage.stageNumber]}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentStageData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{currentStageData.title}</span>
                  <Badge variant="outline">
                    {currentStageData.timeAllocation} min suggested
                  </Badge>
                </CardTitle>
                <CardDescription>{currentStageData.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Provided Information */}
                {Object.keys(currentStageData.providedInformation).length > 0 && (
                  <Card className="bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(currentStageData.providedInformation).map(([key, value]) => (
                        <div key={key} className="mb-2">
                          <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}: </strong>
                          {String(value)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Questions */}
                <div className="space-y-6">
                  {currentStageData.questions.map((question, index) => (
                    <Card key={question.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Question {question.questionNumber}
                          <Badge className="ml-2">{question.maxPoints} points</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4">{question.questionText}</p>
                        
                        {question.questionType === 'essay' ? (
                          <Textarea
                            placeholder="Enter your detailed response..."
                            value={responses[question.id] || ''}
                            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
                            className="min-h-32"
                          />
                        ) : question.questionType === 'list' ? (
                          <Textarea
                            placeholder="List your answers (one per line)..."
                            value={responses[question.id] || ''}
                            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
                            className="min-h-24"
                          />
                        ) : (
                          <Input
                            placeholder="Enter your answer..."
                            value={responses[question.id] || ''}
                            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
                          />
                        )}
                        
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Type:</strong> {question.questionType.replace('_', ' ')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="flex justify-between items-center pt-4">
                  <div className="text-sm text-gray-600">
                    Time on stage: {formatTime(Date.now() - stageStartTime)}
                  </div>
                  <Button
                    onClick={submitStage}
                    disabled={!allQuestionsAnswered || isSubmittingStage}
                    className="min-w-32"
                  >
                    {isSubmittingStage ? (
                      "Submitting..."
                    ) : currentStage === complexCase.stages.length ? (
                      "Complete Case"
                    ) : (
                      "Next Stage"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}