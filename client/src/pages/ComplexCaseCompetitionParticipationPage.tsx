import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Trophy, 
  Brain, 
  CheckCircle,
  Play,
  ChevronRight,
  ChevronLeft,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ComplexCase {
  id: number;
  title: string;
  patientDescription: string;
  bodyPart: string;
  complexity: string;
  estimatedTimeMinutes: number;
}

interface ComplexCaseStage {
  id: number;
  stageNumber: number;
  title: string;
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'clinical_reasoning';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

interface Competition {
  id: number;
  title: string;
  description: string;
  status: string;
  timeLimit: number;
  maxParticipants: number;
  complexCaseIds: number[];
}

function ComplexCaseCompetitionParticipationPage() {
  const [match, params] = useRoute("/complex-competition/:id");
  const competitionId = params?.id ? parseInt(params.id) : null;
  
  const [currentStage, setCurrentStage] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [competitionResults, setCompetitionResults] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now()); // Add timer state for real-time updates
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch competition details
  const { data: competition, isLoading: loadingCompetition } = useQuery({
    queryKey: [`/api/complex-competitions/${competitionId}`],
    enabled: !!competitionId
  });

  // Fetch complex case details
  const { data: complexCaseData, isLoading: loadingCase } = useQuery({
    queryKey: [`/api/complex-cases/${competition?.complexCaseIds?.[0]}`],
    enabled: !!competition?.complexCaseIds?.[0]
  });

  // Start timer when component mounts
  useEffect(() => {
    if (competition && !timeStarted) {
      setTimeStarted(new Date());
    }
  }, [competition, timeStarted]);

  // Submit answers mutation
  const submitAnswers = useMutation({
    mutationFn: async () => {
      const timeSpent = timeStarted ? Math.floor((Date.now() - timeStarted.getTime()) / 1000) : 0;
      
      const submission = {
        competitionId,
        complexCaseId: competition?.complexCaseIds?.[0],
        stageAnswers: Object.entries(answers).map(([stageId, answer]) => ({
          stageId: parseInt(stageId),
          answer,
          timeSpent: Math.floor(timeSpent / Object.keys(answers).length) // Distribute time evenly
        })),
        totalTimeSpent: timeSpent
      };

      const response = await apiRequest('POST', `/api/complex-competitions/${competitionId}/submit`, submission);
      return response.json();
    },
    onSuccess: (data) => {
      setCompetitionResults(data);
      setShowResults(true);
      
      toast({
        title: "Submission Successful!",
        description: "Your answers have been analyzed and scored.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Timer countdown and real-time updates
  useEffect(() => {
    if (!timeStarted || showResults) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now); // Update current time to trigger re-render
      
      const elapsed = Math.floor((now - timeStarted.getTime()) / 1000);
      const timeLimit = 10 * 60; // 10 minutes
      const remaining = Math.max(0, timeLimit - elapsed);
      
      // Auto-submit when time runs out
      if (remaining === 0 && !submitAnswers.isPending) {
        clearInterval(interval);
        toast({
          title: "Time's Up!",
          description: "Competition time has ended. Submitting your answers...",
          variant: "destructive",
        });
        submitAnswers.mutate();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeStarted, showResults, submitAnswers, toast]);

  if (loadingCompetition || loadingCase) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!competition || !complexCaseData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Competition Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This competition doesn't exist or is no longer available.
            </p>
            <Link to="/competitions">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Competitions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stages = complexCaseData?.stages || [];
  const currentStageData = stages[currentStage];
  const currentQuestionData = currentStageData?.questions?.[currentQuestion];
  
  // Calculate total questions across all stages
  const totalQuestions = stages.reduce((total, stage) => total + (stage.questions?.length || 0), 0);
  const currentQuestionIndex = stages.slice(0, currentStage).reduce((total, stage) => total + (stage.questions?.length || 0), 0) + currentQuestion;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  
  const timeElapsed = timeStarted ? Math.floor((currentTime - timeStarted.getTime()) / 1000) : 0;
  const timeLimit = 10 * 60; // Fixed 10 minutes for all competitions
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  const handleAnswer = (value: string) => {
    if (currentQuestionData) {
      const questionKey = `${currentStageData.id}-${currentQuestionData.id}`;
      setAnswers(prev => ({
        ...prev,
        [questionKey]: value
      }));
    }
  };

  const handleNext = () => {
    const currentStageQuestions = currentStageData?.questions || [];
    
    // If there are more questions in current stage
    if (currentQuestion < currentStageQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
    // Move to next stage if available
    else if (currentStage < stages.length - 1) {
      setCurrentStage(prev => prev + 1);
      setCurrentQuestion(0);
    }
  };

  const handlePrevious = () => {
    // If not at first question of current stage
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
    // Move to previous stage if available
    else if (currentStage > 0) {
      setCurrentStage(prev => prev - 1);
      const prevStageQuestions = stages[currentStage - 1]?.questions || [];
      setCurrentQuestion(Math.max(0, prevStageQuestions.length - 1));
    }
  };

  const handleSubmit = () => {
    submitAnswers.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show results if competition is completed
  if (showResults && competitionResults) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/competitions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </Link>
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Competition Completed
          </Badge>
        </div>

        {/* Results Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-600" />
              Competition Results: {competition.title}
            </CardTitle>
            <CardDescription>
              Your performance analysis with detailed feedback and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {competitionResults.totalScore || 75}%
                </div>
                <div className="text-lg text-blue-800 font-medium">Overall Score</div>
                <div className="text-sm text-blue-600 mt-1">
                  Based on evidence-based clinical reasoning analysis
                </div>
              </div>

              {/* Category Scores */}
              {competitionResults.categoryScores && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-600">
                      {competitionResults.categoryScores.clinicalReasoning || 75}%
                    </div>
                    <div className="text-sm font-medium text-emerald-800">Clinical Reasoning</div>
                    <div className="text-xs text-emerald-600 mt-1">(40% weight)</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {competitionResults.categoryScores.assessmentSkills || 75}%
                    </div>
                    <div className="text-sm font-medium text-blue-800">Assessment Skills</div>
                    <div className="text-xs text-blue-600 mt-1">(25% weight)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {competitionResults.categoryScores.treatmentPlanning || 75}%
                    </div>
                    <div className="text-sm font-medium text-purple-800">Treatment Planning</div>
                    <div className="text-xs text-purple-600 mt-1">(25% weight)</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {competitionResults.categoryScores.communication || 75}%
                    </div>
                    <div className="text-sm font-medium text-orange-800">Communication</div>
                    <div className="text-xs text-orange-600 mt-1">(10% weight)</div>
                  </div>
                </div>
              )}

              {/* Detailed Feedback */}
              {competitionResults.feedback && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Strengths Identified
                    </h3>
                    <div className="space-y-2">
                      {(competitionResults.feedback.strengths || ["Good effort demonstrated"]).map((strength: string, index: number) => (
                        <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 text-sm">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvement Areas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Areas for Improvement
                    </h3>
                    <div className="space-y-2">
                      {(competitionResults.feedback.improvementAreas || ["Continue developing clinical skills"]).map((area: string, index: number) => (
                        <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-800 text-sm">{area}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence References */}
              {competitionResults.feedback?.evidenceReferences && competitionResults.feedback.evidenceReferences.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-800">Evidence-Based References</h3>
                  <div className="space-y-2">
                    {competitionResults.feedback.evidenceReferences.map((reference: string, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm font-medium">{reference}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Question-by-Question Feedback */}
              {competitionResults.questionFeedback && competitionResults.questionFeedback.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Detailed Question Analysis
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    See exactly where you went wrong and what was expected for each question:
                  </p>
                  <div className="space-y-4">
                    {competitionResults.questionFeedback.map((qf: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Question {qf.questionNumber}</h4>
                          <Badge 
                            variant={qf.score >= 70 ? "default" : qf.score >= 40 ? "secondary" : "destructive"}
                            className="px-2 py-1"
                          >
                            {qf.score}% score
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Your Answer */}
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm font-medium text-red-800 mb-1">Your Answer:</p>
                            <p className="text-sm text-red-700">"{qf.userAnswer}"</p>
                          </div>
                          
                          {/* What Went Wrong */}
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                            <p className="text-sm font-medium text-orange-800 mb-1">What Went Wrong:</p>
                            <p className="text-sm text-orange-700">{qf.whatWentWrong}</p>
                          </div>
                          
                          {/* Expected Answer */}
                          <div className="p-3 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm font-medium text-green-800 mb-1">Expected Answer:</p>
                            <p className="text-sm text-green-700">{qf.expectedAnswer}</p>
                          </div>
                          
                          {/* Learning Points */}
                          {qf.learningPoints && qf.learningPoints.length > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-sm font-medium text-blue-800 mb-2">Key Learning Points:</p>
                              <ul className="text-sm text-blue-700 space-y-1">
                                {qf.learningPoints.map((point: string, pointIndex: number) => (
                                  <li key={pointIndex} className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Resources */}
              {competitionResults.feedback?.recommendedResources && competitionResults.feedback.recommendedResources.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-800">Recommended Learning Resources</h3>
                  <div className="space-y-2">
                    {competitionResults.feedback.recommendedResources.map((resource: string, index: number) => (
                      <div key={index} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-indigo-800 text-sm">{resource}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {competitionResults.feedback?.nextSteps && competitionResults.feedback.nextSteps.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-800">Recommended Next Steps</h3>
                  <div className="space-y-2">
                    {competitionResults.feedback.nextSteps.map((step: string, index: number) => (
                      <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-purple-800 text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Link to="/competitions" className="flex-1">
                  <Button className="w-full" variant="outline">
                    <Trophy className="h-4 w-4 mr-2" />
                    Browse More Competitions
                  </Button>
                </Link>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowResults(false);
                    setCurrentStage(0);
                    setCurrentQuestion(0);
                    setAnswers({});
                    setCompetitionResults(null);
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Try Another Case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/competitions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competitions
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${
            timeRemaining <= 120 ? 'bg-red-100 text-red-800 border border-red-300' : 
            timeRemaining <= 300 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 
            'bg-green-100 text-green-800 border border-green-300'
          }`}>
            <Clock className={`h-5 w-5 ${timeRemaining <= 120 ? 'animate-pulse' : ''}`} />
            <span className="font-mono tracking-wider">{formatTime(timeRemaining)}</span>
            <span className="text-sm font-normal">remaining</span>
          </div>
          <Badge variant="default" className="text-base px-3 py-1">
            Stage {currentStage + 1} of {stages.length}
          </Badge>
        </div>
      </div>

      {/* Competition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            {competition.title}
          </CardTitle>
          <CardDescription>{competition.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{currentQuestionIndex + 1}/{totalQuestions} questions completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">
                Stage {currentStage + 1}/{stages.length}: {currentStageData?.title} (Question {currentQuestion + 1}/{currentStageData?.questions?.length || 0})
              </div>
            </div>

            {/* Progressive Case Information */}
            <div className="space-y-4">
              {/* Initial Case Information */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800">Case: {complexCaseData?.case?.title}</h4>
                <p className="text-blue-700 mt-1">{complexCaseData?.case?.patientDescription}</p>
                
                {/* Initial Presentation - Always shown */}
                {complexCaseData?.case?.initialPresentation && (
                  <div className="mt-3 text-sm">
                    <h5 className="font-medium text-blue-800">Chief Complaint:</h5>
                    <p className="text-blue-700">{typeof complexCaseData.case.initialPresentation === 'string' 
                      ? complexCaseData.case.initialPresentation 
                      : complexCaseData.case.initialPresentation.chiefComplaint || 'Patient presents with symptoms requiring evaluation'}</p>
                  </div>
                )}
              </div>

              {/* Progressive Information Revelation */}
              {stages.slice(0, currentStage + 1).map((stage: any, index: number) => (
                <div key={stage.id} className="p-4 border rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <h5 className="font-semibold text-emerald-800">
                      Stage {index + 1} Information Revealed
                    </h5>
                  </div>
                  
                  {/* Stage Description */}
                  <p className="text-emerald-700 text-sm mb-3">{stage.description}</p>
                  
                  {/* Provided Information */}
                  {stage.providedInformation && (
                    <div className="space-y-2">
                      {typeof stage.providedInformation === 'string' ? (
                        <div>
                          <span className="font-medium text-emerald-800">Additional Information:</span>
                          <p className="text-emerald-700 text-sm mt-1">{stage.providedInformation}</p>
                        </div>
                      ) : typeof stage.providedInformation === 'object' && stage.providedInformation !== null ? (
                        Object.entries(stage.providedInformation).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium text-emerald-800 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </span>
                            <p className="text-emerald-700 text-sm mt-1">{value as string}</p>
                          </div>
                        ))
                      ) : null}
                    </div>
                  )}

                  {/* Show detailed case information progressively */}
                  {index === 0 && complexCaseData?.case?.occupationalHistory && (
                    <div className="mt-3">
                      <span className="font-medium text-emerald-800">Occupational History:</span>
                      <p className="text-emerald-700 text-sm mt-1">{complexCaseData.case.occupationalHistory}</p>
                    </div>
                  )}

                  {index === 1 && complexCaseData?.case?.medicalHistory && (
                    <div className="mt-3">
                      <span className="font-medium text-emerald-800">Medical History:</span>
                      <p className="text-emerald-700 text-sm mt-1">{complexCaseData.case.medicalHistory}</p>
                    </div>
                  )}

                  {index === 2 && complexCaseData?.case?.physicalFindings && (
                    <div className="mt-3">
                      <span className="font-medium text-emerald-800">Physical Examination Findings:</span>
                      {typeof complexCaseData.case.physicalFindings === 'string' ? (
                        <p className="text-emerald-700 text-sm mt-1">{complexCaseData.case.physicalFindings}</p>
                      ) : typeof complexCaseData.case.physicalFindings === 'object' && complexCaseData.case.physicalFindings !== null ? (
                        <div className="space-y-1 mt-1">
                          {Object.entries(complexCaseData.case.physicalFindings).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                              <span className="text-emerald-700 ml-1">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {index === 3 && complexCaseData?.case?.currentMedications && (
                    <div className="mt-3">
                      <span className="font-medium text-emerald-800">Current Medications:</span>
                      <p className="text-emerald-700 text-sm mt-1">{complexCaseData.case.currentMedications}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Future Stages Preview */}
              {currentStage < stages.length - 1 && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <h5 className="font-semibold text-gray-600">
                      Information Available in Future Stages
                    </h5>
                  </div>
                  <div className="space-y-1">
                    {stages.slice(currentStage + 1).map((stage: any, index: number) => (
                      <div key={stage.id} className="text-sm text-gray-500">
                        • Stage {currentStage + index + 2}: {stage.title} - Additional clinical information will be revealed
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {currentStageData && currentQuestionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {currentStageData.title}
            </CardTitle>
            <CardDescription>
              Question {currentQuestion + 1} of {currentStageData.questions?.length || 0} in this stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stage Information */}
            {currentQuestion === 0 && (
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Stage Context</h4>
                <p className="text-blue-700">{currentStageData.description}</p>
                {currentStageData.informationRevealed && (
                  <div className="mt-3 text-sm text-blue-600">
                    <strong>Additional Information:</strong>
                    <div className="mt-1">
                      {Object.entries(currentStageData.informationRevealed).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Question */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="font-medium">{currentQuestionData.questionText}</p>
              <div className="mt-2 text-sm text-gray-600">
                Points available: {currentQuestionData.pointsAvailable}
              </div>
            </div>

            {/* Answer Input */}
            <div className="space-y-3">
              {currentQuestionData.questionType === 'multiple_choice' && currentQuestionData.options ? (
                <div className="space-y-2">
                  {currentQuestionData.options.map((option: any, index: any) => (
                    <label key={index} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={answers[`${currentStageData.id}-${currentQuestionData.id}`] === option}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="text-primary"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  placeholder="Enter your answer..."
                  value={answers[`${currentStageData.id}-${currentQuestionData.id}`] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  rows={4}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStage === 0 && currentQuestion === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {/* Check if this is the last question of the last stage */}
              {currentStage === stages.length - 1 && currentQuestion === (currentStageData?.questions?.length || 1) - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!answers[`${currentStageData.id}-${currentQuestionData.id}`] || submitAnswers.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitAnswers.isPending ? "Submitting..." : "Submit Answers"}
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!answers[`${currentStageData.id}-${currentQuestionData.id}`]}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>All Stages</CardTitle>
          <CardDescription>Track your progress through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {stages.map((stage: any, index: number) => (
              <div
                key={stage.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  index === currentStage
                    ? 'border-primary bg-primary/5'
                    : answers[stage.id]
                    ? 'border-green-500 bg-green-50'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setCurrentStage(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    answers[stage.id] ? 'bg-green-500 text-white' : 
                    index === currentStage ? 'bg-primary text-white' : 'bg-gray-200'
                  }`}>
                    {answers[stage.id] ? <CheckCircle className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className="font-medium">{stage.title}</span>
                </div>
                <Badge variant="outline">{stage.points} pts</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComplexCaseCompetitionParticipationPage;