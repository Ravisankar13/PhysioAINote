import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, Users, Trophy, Timer, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Competition {
  id: number;
  title: string;
  description: string;
  gameType: string;
  bodyPart: string;
  difficulty: string;
  timeLimit: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: string;
  endTime: string;
  status: string;
}

interface GameContent {
  [key: string]: any;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalScore: number;
  timeSpent: number;
  completedAt: string;
  rank: number;
}

function GameResults({ competitionId }: { competitionId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaderboard();
  }, [competitionId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}/leaderboard`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Game Completed!</h3>
        <p className="text-muted-foreground">
          Thank you for participating. Here are the current rankings:
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏆 Leaderboard</CardTitle>
          <CardDescription>Competition rankings based on scores and completion time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No participants yet. Be the first to complete this competition!
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : index === 1
                      ? 'bg-gray-50 border-gray-200'
                      : index === 2
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : index === 1
                        ? 'bg-gray-500 text-white'
                        : index === 2
                        ? 'bg-orange-500 text-white'
                        : 'bg-muted-foreground text-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{entry.username}</div>
                      <div className="text-sm text-muted-foreground">
                        Completed in {formatTime(entry.timeSpent)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{entry.totalScore}/100</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.completedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GameCompetitionPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [gameContent, setGameContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [responses, setResponses] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompetitionData();
  }, [id]);

  useEffect(() => {
    if (gameStarted && timeRemaining > 0 && !gameCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setGameCompleted(true);
            submitGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, timeRemaining, gameCompleted]);

  const fetchCompetitionData = async () => {
    try {
      const response = await fetch(`/api/game-competitions/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch competition data');
      }

      const data = await response.json();
      setCompetition(data.competition);
      setGameContent(data.content);
      setTimeRemaining(data.competition.timeLimit);
    } catch (error: any) {
      console.error('Error fetching competition:', error);
      toast({
        title: "Error",
        description: "Failed to load competition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    setGameStarted(true);
  };

  const submitGame = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const timeSpent = competition?.timeLimit - timeRemaining;
      
      const response = await fetch(`/api/game-competitions/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          responses,
          timeSpent,
          gameType: competition?.gameType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit game');
      }

      const result = await response.json();
      
      toast({
        title: "Game Completed!",
        description: `Your score: ${result.totalScore}/100`,
      });
      
      setGameCompleted(true);
    } catch (error: any) {
      console.error('Error submitting game:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponse = (key: string, value: any) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderGameContent = () => {
    if (!gameContent || !competition) return null;

    // Map snake_case game types to camelCase content keys
    const contentKeyMap: { [key: string]: string } = {
      'choose_your_adventure': 'chooseYourAdventure',
      'mystery_patient': 'mysteryPatient',
      'lightning_diagnosis': 'lightningDiagnosis',
      'red_flag_detective': 'redFlagDetective',
      'differential_diagnosis_duel': 'differentialDiagnosisDuel',
      'emergency_room_simulator': 'emergencyRoomSimulator',
      'treatment_speed_run': 'treatmentSpeedRun',
      'journal_club_race': 'journalClubRace',
      'cpg_quiz_master': 'cpgQuizMaster'
    };

    const contentKey = contentKeyMap[competition.gameType] || competition.gameType;
    const content = gameContent[contentKey];
    
    if (!content) {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Game Type: {competition.gameType}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            No content available for this game type. Content key: {contentKey}
          </p>
          <pre className="text-xs bg-muted-foreground/10 p-2 rounded">
            Available keys: {Object.keys(gameContent).join(', ')}
          </pre>
        </div>
      );
    }

    switch (competition.gameType) {
      case 'choose_your_adventure':
        return renderChooseYourAdventure(content);
      case 'mystery_patient':
        return renderMysteryPatient(content);
      case 'lightning_diagnosis':
        return renderLightningDiagnosis(content);
      case 'red_flag_detective':
        return renderRedFlagDetective(content);
      case 'differential_diagnosis_duel':
        return renderDifferentialDiagnosis(content);
      default:
        return (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Game Type: {competition.gameType}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Specialized game content for {competition.gameType}
            </p>
            <Textarea
              placeholder="Enter your response..."
              value={responses.general || ''}
              onChange={(e) => handleResponse('general', e.target.value)}
              className="mb-4"
            />
          </div>
        );
    }
  };

  const renderChooseYourAdventure = (content: any) => {
    const storyline = content.storyline || [];
    const currentScene = storyline[currentStage] || storyline[0];
    
    if (!currentScene) return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Clinical Scenario</h4>
          <p className="text-sm">{currentScene.scene}</p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Choose your approach:</Label>
          {currentScene.choices?.map((choice: any, index: number) => (
            <Button
              key={index}
              variant={responses.currentChoice === index ? "default" : "outline"}
              className="w-full text-left justify-start h-auto p-4"
              onClick={() => handleResponse('currentChoice', index)}
            >
              <div>
                <div className="font-medium">{choice.text}</div>
                <div className="text-xs text-muted-foreground mt-1">{choice.consequences}</div>
              </div>
            </Button>
          ))}
        </div>
        
        {currentStage < storyline.length - 1 && (
          <Button 
            onClick={() => setCurrentStage(prev => prev + 1)}
            disabled={responses.currentChoice === undefined}
          >
            Continue to Next Scene
          </Button>
        )}
      </div>
    );
  };

  const renderMysteryPatient = (content: any) => {
    const clues = content.clues || [];
    const revealedClues = clues.slice(0, currentStage + 1);
    
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Mystery Patient - Clue {currentStage + 1}</h4>
          <Progress value={((currentStage + 1) / clues.length) * 100} className="mb-4" />
        </div>
        
        <div className="space-y-3">
          {revealedClues.map((clue: any, index: number) => (
            <Card key={index} className="p-3">
              <div className="flex items-start gap-3">
                <Badge variant={clue.significance === 'high' ? 'destructive' : clue.significance === 'medium' ? 'default' : 'secondary'}>
                  {clue.clueType}
                </Badge>
                <p className="text-sm">{clue.content}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="diagnosis">Your Current Diagnosis Hypothesis:</Label>
          <Input
            id="diagnosis"
            placeholder="Enter your diagnosis..."
            value={responses.diagnosis || ''}
            onChange={(e) => handleResponse('diagnosis', e.target.value)}
          />
        </div>
        
        {currentStage < clues.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Reveal Next Clue
          </Button>
        )}
      </div>
    );
  };

  const renderLightningDiagnosis = (content: any) => {
    const cases = content.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    if (!currentCase) return null;

    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          <h4 className="font-semibold mb-2 text-destructive">⚡ Lightning Diagnosis - 30 seconds!</h4>
          <p className="text-sm">{currentCase.presentation}</p>
        </div>
        
        <div className="space-y-2">
          <Label>Quick Diagnosis:</Label>
          <Input
            placeholder="Enter your diagnosis immediately..."
            value={responses[`case_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`case_${currentStage}`, e.target.value)}
          />
        </div>
        
        {currentStage < cases.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Case
          </Button>
        )}
      </div>
    );
  };

  const renderRedFlagDetective = (content: any) => {
    const cases = content.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    if (!currentCase) return null;

    return (
      <div className="space-y-4">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-semibold mb-2 text-orange-800">🚩 Red Flag Detective</h4>
          <p className="text-sm">{currentCase.patientStory}</p>
        </div>
        
        <div className="space-y-2">
          <Label>Identified Red Flags (separate with commas):</Label>
          <Textarea
            placeholder="List any red flags you identify..."
            value={responses[`redflags_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`redflags_${currentStage}`, e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Action Required:</Label>
          <Input
            placeholder="What immediate action would you take?"
            value={responses[`action_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`action_${currentStage}`, e.target.value)}
          />
        </div>
        
        {currentStage < cases.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Case
          </Button>
        )}
      </div>
    );
  };

  const renderDifferentialDiagnosis = (content: any) => {
    const rounds = content.rounds || [];
    const currentRound = rounds[currentStage] || rounds[0];
    
    if (!currentRound) return null;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-blue-800">🎯 Differential Diagnosis Duel</h4>
          <p className="text-sm">{currentRound.casePresentation}</p>
        </div>
        
        <div className="space-y-2">
          <Label>List Your Differential Diagnoses (one per line):</Label>
          <Textarea
            placeholder="Enter each possible diagnosis on a new line..."
            value={responses[`differentials_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`differentials_${currentStage}`, e.target.value)}
            rows={6}
          />
        </div>
        
        {currentStage < rounds.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Round
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Competition Not Found</h1>
          <p className="text-muted-foreground">The competition you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Competition Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{competition.title}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {competition.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {gameStarted && !gameCompleted && (
                  <div className="flex items-center gap-2 text-lg font-mono bg-muted px-3 py-1 rounded">
                    <Timer className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                  </div>
                )}
                {gameCompleted && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
                <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                  {competition.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{Math.floor(competition.timeLimit / 60)} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{competition.currentParticipants}/{competition.maxParticipants} participants</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{competition.difficulty}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Game Content */}
        <Card>
          <CardHeader>
            <CardTitle>Game Content</CardTitle>
          </CardHeader>
          <CardContent>
            {!gameStarted ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">Ready to start?</h3>
                <p className="text-muted-foreground mb-6">
                  Once you start, the timer will begin. Make sure you're ready!
                </p>
                <Button onClick={startGame} size="lg">
                  Start Game
                </Button>
              </div>
            ) : gameCompleted ? (
              <GameResults competitionId={id!} />
            ) : (
              <div className="space-y-6">
                {renderGameContent()}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Time remaining: {formatTime(timeRemaining)}
                  </div>
                  <Button 
                    onClick={submitGame} 
                    disabled={submitting}
                    variant="default"
                  >
                    {submitting ? 'Submitting...' : 'Submit Game'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}