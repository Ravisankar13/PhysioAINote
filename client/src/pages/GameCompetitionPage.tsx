import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Clock, 
  Users, 
  Play, 
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  Timer
} from 'lucide-react';

interface GameCompetitionData {
  competition: {
    id: number;
    title: string;
    description: string;
    gameType: string;
    timeLimit?: number;
    status: string;
    maxParticipants: number;
    difficulty?: string;
    bodyPart?: string;
  };
  content: any;
  isParticipating: boolean;
  timeRemaining?: number;
}

export default function GameCompetitionPage() {
  const [match, params] = useRoute('/game-competition/:id');
  const [competitionData, setCompetitionData] = useState<GameCompetitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (match && params?.id) {
      fetchCompetitionData(parseInt(params.id));
    }
  }, [match, params?.id]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && gameStarted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            handleTimeUp();
            return 0;
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, gameStarted]);

  const fetchCompetitionData = async (competitionId: number) => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch competition data');
      }
      
      const data = await response.json();
      setCompetitionData(data);
      
      if (data.competition.timeLimit) {
        setTimeRemaining(data.competition.timeLimit);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load competition",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    setGameStarted(true);
    toast({
      title: "Game Started!",
      description: "Good luck with your clinical challenge!",
    });
  };

  const handleTimeUp = () => {
    toast({
      title: "Time's Up!",
      description: "Your responses have been automatically submitted.",
      variant: "destructive",
    });
    submitAnswers();
  };

  const submitAnswers = async () => {
    if (!competitionData) return;

    try {
      const response = await fetch(`/api/game-competitions/${competitionData.competition.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          responses: answers,
          timeSpent: competitionData.competition.timeLimit ? 
            (competitionData.competition.timeLimit - (timeRemaining || 0)) : 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answers');
      }

      const result = await response.json();
      
      toast({
        title: "Submission Complete!",
        description: `Your score: ${result.score}`,
      });

    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit answers",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading competition...</div>
        </div>
      </div>
    );
  }

  if (!competitionData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Competition Not Found</h3>
            <p className="text-muted-foreground">The competition you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Competition Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{competitionData.competition.title}</CardTitle>
              <CardDescription>{competitionData.competition.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Left</div>
                </div>
              )}
              <Badge variant={competitionData.competition.status === 'active' ? 'default' : 'secondary'}>
                {competitionData.competition.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Game Progress */}
      {gameStarted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Game Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={(currentStep / 5) * 100} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep + 1} of 5</span>
                <span>{Math.round((currentStep / 5) * 100)}% Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {!gameStarted ? 'Ready to Start?' : 'Game in Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!gameStarted ? (
            <div className="text-center space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Timer className="h-8 w-8 mx-auto mb-2" />
                    {competitionData.competition.timeLimit ? 
                      `${Math.floor(competitionData.competition.timeLimit / 60)}` : '∞'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    {competitionData.competition.maxParticipants}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Target className="h-8 w-8 mx-auto mb-2" />
                    {competitionData.competition.difficulty || 'Any'}
                  </div>
                  <div className="text-sm text-muted-foreground">Difficulty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Star className="h-8 w-8 mx-auto mb-2" />
                    {competitionData.competition.bodyPart || 'General'}
                  </div>
                  <div className="text-sm text-muted-foreground">Focus Area</div>
                </div>
              </div>

              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Game Instructions</h3>
                <p className="text-muted-foreground">
                  This is a {competitionData.competition.gameType.replace(/_/g, ' ')} challenge. 
                  You'll be presented with clinical scenarios that test your physiotherapy knowledge and reasoning skills.
                  {competitionData.competition.timeLimit && 
                    ` You have ${Math.floor(competitionData.competition.timeLimit / 60)} minutes to complete all challenges.`
                  }
                </p>
              </div>

              <Button onClick={startGame} size="lg" className="px-8">
                <Play className="h-5 w-5 mr-2" />
                Start Game
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2">Clinical Challenge {currentStep + 1}</h3>
                <p className="text-muted-foreground mb-4">
                  This is a sample clinical scenario. In the full implementation, this would display
                  actual game content based on the competition type.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setCurrentStep(prev => Math.min(prev + 1, 4))}
                    disabled={currentStep >= 4}
                  >
                    Next Challenge
                  </Button>
                  {currentStep >= 4 && (
                    <Button onClick={submitAnswers} variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit All Answers
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competition Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Competition Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Game Type:</span> 
              <span className="ml-2 capitalize">{competitionData.competition.gameType.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge variant="outline" className="ml-2">{competitionData.competition.status}</Badge>
            </div>
            <div>
              <span className="font-medium">Participation:</span> 
              <span className="ml-2">{competitionData.isParticipating ? 'Joined' : 'Not joined'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}