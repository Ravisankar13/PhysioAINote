import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Award, 
  RotateCcw, 
  BookOpen, 
  Brain, 
  Clock,
  Target,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

interface Assessment {
  id: number;
  moduleId: number;
  title: string;
  description?: string;
  type: "quiz" | "case_analysis" | "practical_demo" | "written_response";
  questions: Question[];
  maxAttempts: number;
  passingScore: number;
  timeLimit?: number;
}

interface AssessmentAttempt {
  id: number;
  userId: number;
  assessmentId: number;
  answers: Record<string, any>;
  score: number;
  passed: boolean;
  timeSpent: number;
  startedAt: string;
  completedAt?: string;
  feedback?: {
    aiAnalysis?: string;
    strengthsIdentified?: string[];
    areasForImprovement?: string[];
    recommendedStudy?: string[];
    clinicalInsights?: string[];
  };
}

interface AssessmentResultsProps {
  assessmentId: number;
  attemptId: number;
  courseId: number;
  moduleId: number;
  onRetry?: () => void;
  onContinue?: () => void;
}

export default function AssessmentResults({ 
  assessmentId, 
  attemptId, 
  courseId, 
  moduleId, 
  onRetry, 
  onContinue 
}: AssessmentResultsProps) {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assessment data
  const { data: assessment } = useQuery<Assessment>({
    queryKey: ['/api/education/assessments', assessmentId],
  });

  // Fetch attempt details with AI feedback
  const { data: attempt, isLoading } = useQuery<AssessmentAttempt>({
    queryKey: ['/api/education/attempts', attemptId],
  });

  // Fetch all attempts for comparison
  const { data: allAttempts } = useQuery<AssessmentAttempt[]>({
    queryKey: ['/api/education/assessments', assessmentId, 'attempts'],
  });

  // Generate AI feedback mutation
  const generateFeedback = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/education/attempts/${attemptId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate feedback');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/education/attempts', attemptId] });
      toast({
        title: "AI Analysis Complete! 🤖",
        description: "Personalized feedback and recommendations have been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Feedback Generation Failed",
        description: "Unable to generate AI feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading || !assessment || !attempt) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= assessment.passingScore) return "text-green-600";
    if (score >= assessment.passingScore * 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= assessment.passingScore) return "default";
    return "destructive";
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateAnswersBreakdown = () => {
    const total = assessment.questions.length;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    assessment.questions.forEach(question => {
      const userAnswer = attempt.answers[question.id];
      
      if (!userAnswer || userAnswer === "") {
        unanswered++;
      } else if (question.correctAnswer) {
        // For objective questions, check if answer is correct
        if (Array.isArray(question.correctAnswer)) {
          const isCorrect = question.correctAnswer.includes(userAnswer);
          isCorrect ? correct++ : incorrect++;
        } else {
          userAnswer === question.correctAnswer ? correct++ : incorrect++;
        }
      } else {
        // For subjective questions, assume they're answered (will be manually graded)
        correct++;
      }
    });

    return { total, correct, incorrect, unanswered };
  };

  const breakdown = calculateAnswersBreakdown();
  const bestAttempt = allAttempts?.reduce((best, current) => 
    current.score > best.score ? current : best
  ) || attempt;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Results Header */}
      <Card className={cn(
        "border-2",
        attempt.passed ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
      )}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {attempt.passed ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {attempt.passed ? "Assessment Passed! 🎉" : "Assessment Complete"}
          </CardTitle>
          
          <CardDescription className="text-lg">
            {assessment.title}
          </CardDescription>

          <div className="flex justify-center items-center gap-4 mt-4">
            <Badge 
              variant={getScoreBadgeVariant(attempt.score)} 
              className="text-lg px-4 py-2"
            >
              <Award className="h-4 w-4 mr-2" />
              {attempt.score}%
            </Badge>
            
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(attempt.timeSpent)}
            </Badge>
            
            <Badge variant="outline">
              {assessment.passingScore}% needed
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{breakdown.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{breakdown.incorrect}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{breakdown.unanswered}</div>
              <div className="text-sm text-muted-foreground">Unanswered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{breakdown.total}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Score</span>
              <span className={getScoreColor(attempt.score)}>{attempt.score}%</span>
            </div>
            <Progress value={attempt.score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Learning Analysis
          </CardTitle>
          <CardDescription>
            Get personalized feedback and recommendations to improve your understanding
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attempt.feedback ? (
            <div className="space-y-4">
              {attempt.feedback.aiAnalysis && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">AI Analysis</h4>
                  <p className="text-purple-700">{attempt.feedback.aiAnalysis}</p>
                </div>
              )}

              {attempt.feedback.strengthsIdentified && attempt.feedback.strengthsIdentified.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Strengths Identified
                  </h4>
                  <ul className="list-disc list-inside text-green-700 space-y-1">
                    {attempt.feedback.strengthsIdentified.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {attempt.feedback.areasForImprovement && attempt.feedback.areasForImprovement.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Areas for Improvement
                  </h4>
                  <ul className="list-disc list-inside text-yellow-700 space-y-1">
                    {attempt.feedback.areasForImprovement.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {attempt.feedback.recommendedStudy && attempt.feedback.recommendedStudy.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Recommended Study Topics
                  </h4>
                  <ul className="list-disc list-inside text-blue-700 space-y-1">
                    {attempt.feedback.recommendedStudy.map((topic, index) => (
                      <li key={index}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {showDetailedFeedback ? "Hide" : "Show"} Question-by-Question Review
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Generate AI-powered feedback to understand your performance and get personalized recommendations.
              </p>
              <Button 
                onClick={() => generateFeedback.mutate()}
                disabled={generateFeedback.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generateFeedback.isPending ? "Analyzing..." : "Generate AI Feedback"}
                <Brain className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Question Review */}
      {showDetailedFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Question-by-Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {assessment.questions.map((question, index) => {
                  const userAnswer = attempt.answers[question.id];
                  const isCorrect = question.correctAnswer ? 
                    (Array.isArray(question.correctAnswer) ? 
                      question.correctAnswer.includes(userAnswer) : 
                      userAnswer === question.correctAnswer
                    ) : null;

                  return (
                    <div key={question.id} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {isCorrect === true ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : isCorrect === false ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Question {index + 1}</span>
                            <Badge variant="outline">{question.points} points</Badge>
                          </div>
                          
                          <p className="text-sm">{question.question}</p>
                          
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium">Your answer: </span>
                              <span className={cn(
                                isCorrect === true ? "text-green-600" : 
                                isCorrect === false ? "text-red-600" : "text-blue-600"
                              )}>
                                {userAnswer || "Not answered"}
                              </span>
                            </div>
                            
                            {question.correctAnswer && isCorrect === false && (
                              <div className="text-sm">
                                <span className="font-medium">Correct answer: </span>
                                <span className="text-green-600">
                                  {Array.isArray(question.correctAnswer) ? 
                                    question.correctAnswer.join(", ") : 
                                    question.correctAnswer
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              {allAttempts && allAttempts.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  Best score: {bestAttempt.score}% (Attempt {allAttempts.length - allAttempts.indexOf(bestAttempt)})
                </p>
              )}
              {!attempt.passed && assessment.maxAttempts > 1 && (
                <p className="text-sm text-muted-foreground">
                  {allAttempts?.length || 1} of {assessment.maxAttempts} attempts used
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {!attempt.passed && (allAttempts?.length || 0) < assessment.maxAttempts && (
                <Button variant="outline" onClick={onRetry}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Assessment
                </Button>
              )}
              
              <Button onClick={onContinue}>
                Continue Learning
                <BookOpen className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}