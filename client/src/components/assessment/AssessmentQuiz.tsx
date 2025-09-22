import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Brain, Target, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  type: "quiz" | "assignment" | "exam";
  questions: Question[];
  maxAttempts: number;
  passingScore: number;
  timeLimit?: number;
  createdAt: string;
  updatedAt: string;
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
}

interface AssessmentQuizProps {
  assessmentId: number;
  courseId: number;
  moduleId: number;
  onComplete?: (passed: boolean, score: number) => void;
}

export default function AssessmentQuiz({ assessmentId, courseId, moduleId, onComplete }: AssessmentQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assessment data
  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: ['/api/education/assessments', assessmentId],
  });

  // Fetch previous attempts
  const { data: attempts } = useQuery<AssessmentAttempt[]>({
    queryKey: ['/api/education/assessments', assessmentId, 'attempts'],
  });

  // Submit assessment mutation
  const submitAssessment = useMutation({
    mutationFn: async (data: { answers: Record<string, any>; timeSpent: number }) => {
      const response = await fetch(`/api/education/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.passed ? "Assessment Passed! 🎉" : "Assessment Complete",
        description: `You scored ${result.score}% ${result.passed ? 'and passed!' : `(${assessment?.passingScore}% needed to pass)`}`,
        variant: result.passed ? "default" : "destructive"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/education/assessments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/education/progress'] });
      
      onComplete?.(result.passed, result.score);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your assessment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Timer effect
  useEffect(() => {
    if (assessment?.timeLimit && timeRemaining === null) {
      setTimeRemaining(assessment.timeLimit * 60); // Convert minutes to seconds
    }
  }, [assessment, timeRemaining]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev <= 1) {
            handleSubmit(); // Auto-submit when time runs out
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // Convert to minutes
    
    await submitAssessment.mutateAsync({
      answers,
      timeSpent
    });
    
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).filter(questionId => 
      answers[questionId] !== undefined && answers[questionId] !== ""
    ).length;
  };

  const canProceed = () => {
    const currentQuestion = assessment?.questions[currentQuestionIndex];
    if (!currentQuestion) return false;
    
    const answer = answers[currentQuestion.id];
    return answer !== undefined && answer !== "";
  };

  if (isLoading) {
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

  if (!assessment) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Assessment Not Found</CardTitle>
          <CardDescription>
            The requested assessment could not be loaded.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const answeredCount = getAnsweredQuestionsCount();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Assessment Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {assessment.title}
              </CardTitle>
              <CardDescription>{assessment.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <Badge variant={timeRemaining < 300 ? "destructive" : "secondary"} className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </Badge>
              )}
              <Badge variant="outline">
                {assessment.questions.length} Questions
              </Badge>
              <Badge variant="outline">
                {assessment.passingScore}% to Pass
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} of {assessment.questions.length}</span>
              <span>{answeredCount} of {assessment.questions.length} answered</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {currentQuestionIndex + 1}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {currentQuestion.question}
          </CardDescription>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{currentQuestion.points} points</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multiple Choice */}
          {currentQuestion.type === "multiple_choice" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                  <Label 
                    htmlFor={`${currentQuestion.id}-${index}`}
                    className="cursor-pointer flex-1 py-2"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* True/False */}
          {currentQuestion.type === "true_false" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${currentQuestion.id}-true`} />
                <Label htmlFor={`${currentQuestion.id}-true`} className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${currentQuestion.id}-false`} />
                <Label htmlFor={`${currentQuestion.id}-false`} className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          )}

          {/* Short Answer */}
          {currentQuestion.type === "short_answer" && (
            <div className="space-y-2">
              <Label htmlFor={`answer-${currentQuestion.id}`}>Your Answer</Label>
              <Textarea
                id={`answer-${currentQuestion.id}`}
                placeholder="Enter your answer here..."
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Essay */}
          {currentQuestion.type === "essay" && (
            <div className="space-y-2">
              <Label htmlFor={`essay-${currentQuestion.id}`}>Your Response</Label>
              <Textarea
                id={`essay-${currentQuestion.id}`}
                placeholder="Provide a detailed response..."
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={8}
                className="min-h-[200px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentQuestionIndex < assessment.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  disabled={!canProceed()}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Submitting..." : "Submit Assessment"}
                  <Award className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}