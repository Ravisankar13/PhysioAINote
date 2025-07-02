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
  ChevronLeft
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
      // Store results in sessionStorage for the results page
      sessionStorage.setItem('competitionResults', JSON.stringify(data));
      
      toast({
        title: "Submission Successful!",
        description: "Your answers have been submitted and scored.",
      });
      
      // Redirect to results page
      window.location.href = `/complex-competition/${competitionId}/results`;
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
  
  const timeElapsed = timeStarted ? Math.floor((Date.now() - timeStarted.getTime()) / 1000) : 0;
  const timeRemaining = Math.max(0, (competition.timeLimit * 60) - timeElapsed);

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
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(timeRemaining)} remaining
          </Badge>
          <Badge variant="default">
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