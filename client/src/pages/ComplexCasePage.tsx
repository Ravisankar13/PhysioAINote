import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Clock, User, Stethoscope, Brain, ArrowLeft, AlertCircle, XCircle, CheckCircle, Play, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ComplexCase {
  id: number;
  title: string;
  patientDescription: string;
  occupationalHistory?: string;
  socialHistory?: string;
  medicalHistory: string;
  currentMedications?: string;
  mechanismOfInjury?: string;
  bodyPart: string;
  complexity: string;
  estimatedTime: number;
  initialPresentation?: {
    chiefComplaint: string;
    painScale: number;
    functionalLimitations: string[];
    patientGoals: string[];
  };
  detailedHistory?: {
    onsetDetails: string;
    progressionPattern: string;
    aggravatingFactors: string[];
    easingFactors: string[];
    previousTreatments: string[];
    redFlagScreening: string[];
  };
  physicalFindings?: {
    observation: string;
    palpation: string;
    rangeOfMotion: string;
    strength: string;
    neurological: string;
  };
}

interface StageQuestion {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  options?: string[];
  expectedAnswers: string[];
  scoringCriteria: {
    maxPoints: number;
    partialCredit: boolean;
    keywordPoints: Array<{ keyword: string; points: number }>;
  };
  correctAnswer: string;
  rationale: string;
  learningPoints?: string[];
}

interface CaseStage {
  id: number;
  stage_number: number;
  title: string;
  description: string;
  information_revealed?: {
    patientResponse?: string;
    testResults?: string;
    additionalHistory?: string;
    observationFindings?: string;
  };
  expected_time_minutes: number;
  questions: StageQuestion[];
}

interface CaseDetails {
  case: ComplexCase;
  stages: CaseStage[];
}

interface CaseAttempt {
  id: number;
  userId: number;
  complexCaseId: number;
  competitionId?: number;
  startedAt: string;
  totalTimeSpent: number;
  currentStage: number;
  completed: boolean;
}

export default function ComplexCasePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentStage, setCurrentStage] = useState(1);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [stageStartTime, setStageStartTime] = useState<number>(Date.now());
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [attempt, setAttempt] = useState<CaseAttempt | null>(null);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [stageScores, setStageScores] = useState<{ [key: number]: number }>({});
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [showingResults, setShowingResults] = useState<{ [key: number]: boolean }>({});

  // Get case data with stages and questions
  const { data: caseDetails, isLoading: loadingCase, error } = useQuery<CaseDetails>({
    queryKey: [`/api/complex-case/${id}`],
    enabled: !!id
  });

  // Debug logging
  useEffect(() => {
    if (caseDetails) {
      console.log('Case details loaded:', caseDetails);
      console.log('Stages:', caseDetails.stages);
      console.log('Current stage:', currentStage);
      const currentStageData = caseDetails.stages.find(s => s.stage_number === currentStage);
      console.log('Current stage data:', currentStageData);
      if (currentStageData) {
        console.log('Questions for current stage:', currentStageData.questions);
      }
    }
  }, [caseDetails, currentStage]);

  // Start case attempt when component loads
  useEffect(() => {
    if (caseDetails && !attempt) {
      startAttempt();
    }
  }, [caseDetails]);

  const startAttempt = async () => {
    try {
      const response = await apiRequest('POST', `/api/complex-case/${id}/start`, {
        competitionId: null
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
    if (!attempt || !caseDetails || !currentStageData) return;

    setIsSubmittingStage(true);
    try {
      const stageTimeSpent = Date.now() - stageStartTime;
      const stageResponses = currentStageData.questions.map(q => ({
        questionId: q.id,
        answer: responses[q.id] || '',
        timeSpent: Math.floor(stageTimeSpent / currentStageData.questions.length)
      }));

      const response = await apiRequest('POST', `/api/complex-case-attempt/${attempt.id}/stage/${currentStageData.id}/submit`, {
        responses: stageResponses,
        timeSpent: stageTimeSpent
      });
      
      const result = await response.json();
      
      // Update state
      setCompletedStages([...completedStages, currentStage]);
      setStageScores({ ...stageScores, [currentStage]: result.stageScore });
      setTotalTimeSpent(totalTimeSpent + stageTimeSpent);
      
      // Show results for this stage
      setShowingResults({ ...showingResults, [currentStage]: true });
      
      toast({
        title: "Stage Complete",
        description: `Stage ${currentStage} submitted successfully. Score: ${result.stageScore}%`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit stage response",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingStage(false);
    }
  };

  const nextStage = () => {
    if (caseDetails && currentStage < caseDetails.stages.length) {
      setCurrentStage(currentStage + 1);
      setStageStartTime(Date.now());
      setShowingResults({ ...showingResults, [currentStage]: false });
    } else {
      completeAttempt();
    }
  };

  const completeAttempt = async () => {
    if (!attempt) return;

    try {
      const response = await apiRequest('POST', `/api/complex-case-attempt/${attempt.id}/complete`);
      const results = await response.json();
      setFinalResults(results);
      
      toast({
        title: "Case Complete",
        description: `Case completed with overall score: ${results.overallScore}%`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete case attempt",
        variant: "destructive",
      });
    }
  };

  const handleResponseChange = (questionId: number, answer: string) => {
    setResponses({ ...responses, [questionId]: answer });
  };

  const currentStageData = caseDetails?.stages.find(s => s.stage_number === currentStage);
  const progress = caseDetails ? (currentStage / caseDetails.stages.length) * 100 : 0;

  if (loadingCase) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !caseDetails) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Case Not Found or No Interactive Content</h2>
            <p className="text-gray-600 mb-4">
              This complex case doesn't have interactive stages and questions yet.
            </p>
            <Button onClick={() => setLocation('/competitions')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show final results
  if (finalResults) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Case Completed!</CardTitle>
            <CardDescription>
              {caseDetails.case.title} - Overall Score: {finalResults.overallScore}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold">Total Time</h3>
                  <p className="text-2xl text-blue-600">{Math.floor(finalResults.totalTimeSpent / 60)}m</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold">Stages Completed</h3>
                  <p className="text-2xl text-green-600">{completedStages.length}/{caseDetails.stages.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold">Overall Score</h3>
                  <p className="text-2xl text-purple-600">{finalResults.overallScore}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Stage Breakdown</h3>
              {caseDetails.stages.map((stage, index) => (
                <Card key={stage.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{stage.title}</span>
                      <Badge variant={stageScores[stage.stage_number] >= 70 ? "default" : "destructive"}>
                        {stageScores[stage.stage_number] || 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => setLocation('/competitions')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Competitions
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{caseDetails.case.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {caseDetails.case.bodyPart}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {caseDetails.case.complexity}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {caseDetails.case.estimatedTime} min
                </Badge>
              </CardDescription>
            </div>
            <Button onClick={() => setLocation('/competitions')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                Stage {currentStage} of {caseDetails.stages.length}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      {/* Current Stage */}
      {currentStageData && (
        <div className="space-y-6">
          {/* Stage Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">Stage {currentStage}</Badge>
                {currentStageData.title}
              </CardTitle>
              <CardDescription>{currentStageData.description}</CardDescription>
              {currentStageData.expected_time_minutes && (
                <Badge variant="outline" className="w-fit">
                  <Clock className="h-3 w-3 mr-1" />
                  {currentStageData.expected_time_minutes} minutes
                </Badge>
              )}
            </CardHeader>
          </Card>

          {/* Provided Information */}
          {currentStageData.information_revealed && (
            <Card>
              <CardHeader>
                <CardTitle>Clinical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentStageData.information_revealed.patientResponse && (
                  <div>
                    <h4 className="font-semibold mb-2">Patient Response</h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded">
                      {currentStageData.information_revealed.patientResponse}
                    </p>
                  </div>
                )}
                {currentStageData.information_revealed.testResults && (
                  <div>
                    <h4 className="font-semibold mb-2">Test Results</h4>
                    <p className="text-gray-700 bg-green-50 p-3 rounded">
                      {currentStageData.information_revealed.testResults}
                    </p>
                  </div>
                )}
                {currentStageData.information_revealed.additionalHistory && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional History</h4>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded">
                      {currentStageData.information_revealed.additionalHistory}
                    </p>
                  </div>
                )}
                {currentStageData.information_revealed.observationFindings && (
                  <div>
                    <h4 className="font-semibold mb-2">Observation Findings</h4>
                    <p className="text-gray-700 bg-purple-50 p-3 rounded">
                      {currentStageData.information_revealed.observationFindings}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {currentStageData.questions.map((question, questionIndex) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Question {question.questionNumber}: {question.questionText}
                  </CardTitle>
                  <CardDescription>
                    Points: {question.scoringCriteria.maxPoints} | Type: {question.questionType}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Answer Input */}
                  {question.questionType === 'multiple_choice' && question.options ? (
                    <RadioGroup
                      value={responses[question.id] || ''}
                      onValueChange={(value) => handleResponseChange(question.id, value)}
                    >
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                          <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : question.questionType === 'short_answer' ? (
                    <Input
                      placeholder="Enter your answer..."
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    />
                  ) : (
                    <Textarea
                      placeholder="Enter your detailed response..."
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      rows={4}
                    />
                  )}

                  {/* Show results if stage is completed */}
                  {showingResults[currentStage] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded">
                      <h4 className="font-semibold text-green-700 mb-2">Correct Answer:</h4>
                      <p className="text-gray-700 mb-3">{question.correctAnswer}</p>
                      
                      <h4 className="font-semibold text-blue-700 mb-2">Rationale:</h4>
                      <p className="text-gray-700 mb-3">{question.rationale}</p>
                      
                      {question.learningPoints && question.learningPoints.length > 0 && (
                        <>
                          <h4 className="font-semibold text-purple-700 mb-2">Learning Points:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {question.learningPoints.map((point, index) => (
                              <li key={index} className="text-gray-700">{point}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              onClick={() => setCurrentStage(Math.max(1, currentStage - 1))}
              disabled={currentStage === 1}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Stage
            </Button>

            <div className="flex gap-4">
              {!completedStages.includes(currentStage) && !showingResults[currentStage] && (
                <Button 
                  onClick={submitStage} 
                  disabled={isSubmittingStage || currentStageData.questions.some(q => !responses[q.id])}
                >
                  {isSubmittingStage ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Stage
                    </>
                  )}
                </Button>
              )}

              {(completedStages.includes(currentStage) || showingResults[currentStage]) && (
                <Button onClick={nextStage}>
                  {currentStage === caseDetails.stages.length ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Case
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Next Stage
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}