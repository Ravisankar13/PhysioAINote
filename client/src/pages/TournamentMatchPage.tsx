import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Timer, User, Trophy, Zap, Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TournamentMatch {
  id: number;
  tournamentId: number;
  round: number;
  matchNumber: number;
  player1Id: number;
  player2Id: number;
  player1Username: string;
  player2Username: string;
  player1Score: number;
  player2Score: number;
  winnerId?: number;
  status: string;
  scheduledStartTime?: string;
  completedAt?: string;
  gameContentId: number;
}

interface GameContent {
  id: number;
  gameType: string;
  content: {
    questions: Array<{
      question_id: string;
      clinical_presentation: string;
      patient_demographics: string;
      correct_diagnosis: string;
      distractors: string[];
      time_limit: number;
      body_part: string;
      rationale: string;
    }>;
    timeLimit: number;
    difficulty: string;
  };
}

interface QuestionResponse {
  questionId: string;
  selectedAnswer: string;
  timeSpent: number;
  isCorrect: boolean;
}

export default function TournamentMatchPage() {
  const [, params] = useRoute('/tournament/match/:matchId');
  const matchId = params?.matchId ? parseInt(params.matchId) : null;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [matchStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch match details
  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['/api/tournaments/matches', matchId],
    enabled: !!matchId,
  });

  // Fetch game content
  const { data: gameContent, isLoading: contentLoading } = useQuery({
    queryKey: ['/api/game-content', match?.gameContentId],
    enabled: !!match?.gameContentId,
  });

  const questions = gameContent?.content?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (!currentQuestion || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isSubmitting]);

  // Reset timer when question changes
  useEffect(() => {
    if (currentQuestion) {
      setTimeRemaining(currentQuestion.time_limit || 30);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex]);

  const handleTimeUp = () => {
    if (currentQuestion) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const response: QuestionResponse = {
        questionId: currentQuestion.question_id,
        selectedAnswer: '',
        timeSpent,
        isCorrect: false,
      };
      
      setResponses(prev => [...prev, response]);
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        submitMatch();
      }
    }
  };

  const handleAnswerSelect = (selectedAnswer: string) => {
    if (!currentQuestion || isSubmitting) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correct_diagnosis;
    
    const response: QuestionResponse = {
      questionId: currentQuestion.question_id,
      selectedAnswer,
      timeSpent,
      isCorrect,
    };

    setResponses(prev => [...prev, response]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitMatch();
    }
  };

  const submitMatch = async () => {
    if (!match || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const totalScore = responses.reduce((sum, r) => sum + (r.isCorrect ? 1 : 0), 0);
      const totalTimeSpent = Math.floor((Date.now() - matchStartTime) / 1000);

      await apiRequest(`/api/tournaments/matches/${matchId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          responses: responses.reduce((acc, r) => ({ ...acc, [r.questionId]: r.selectedAnswer }), {}),
          score: totalScore,
          timeSpent: totalTimeSpent,
        }),
      });

      toast({
        title: "Match Submitted",
        description: `You scored ${totalScore}/${questions.length} correct answers!`,
      });

      // Redirect to tournaments page to see results
      window.location.href = '/tournaments';
    } catch (error: any) {
      console.error('Error submitting match:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit match results",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (matchLoading || contentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tournament match...</span>
        </div>
      </div>
    );
  }

  if (!match || !gameContent || !questions.length) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Tournament match not found or no questions available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isSubmitting || responses.length >= questions.length) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <h2 className="text-xl font-semibold">Submitting your answers...</h2>
            <p className="text-muted-foreground">Please wait while we process your results</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            No more questions available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
  const allAnswerOptions = [currentQuestion.correct_diagnosis, ...currentQuestion.distractors].sort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Tournament Match
          </h1>
          <p className="text-muted-foreground mt-2">
            {match.player1Username} vs {match.player2Username} - Round {match.round}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-red-600">{timeRemaining}s</div>
          <div className="text-sm text-muted-foreground">Time Remaining</div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Question Progress</span>
              <span className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Question {currentQuestionIndex + 1}
          </CardTitle>
          <CardDescription>
            <Badge variant="outline" className="mr-2">{currentQuestion.body_part}</Badge>
            Diagnosis Challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Demographics */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Patient Information</h3>
            <p className="text-blue-800">{currentQuestion.patient_demographics}</p>
          </div>

          {/* Clinical Presentation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Clinical Presentation</h3>
            <p className="text-gray-800">{currentQuestion.clinical_presentation}</p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            <h3 className="font-semibold">Select your diagnosis:</h3>
            <div className="grid gap-3">
              {allAnswerOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleAnswerSelect(option)}
                  className="justify-start text-left h-auto p-4 hover:bg-blue-50"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <span className="text-sm font-medium">{String.fromCharCode(65 + index)}</span>
                    </div>
                    <span>{option}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.filter(r => r.isCorrect).length}/{responses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Questions Answered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.length}/{questions.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}