import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trophy, Clock, Target, User, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  player1TimeSpent: number;
  player2TimeSpent: number;
  winnerId: number | null;
  status: string;
  completedAt: string | null;
}

interface Tournament {
  id: number;
  title: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  participantCount: number;
}

export default function TournamentResultsPage() {
  const [, params] = useRoute('/tournament/results/:matchId');
  const matchId = params?.matchId ? parseInt(params.matchId) : null;
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['/api/tournaments/matches', matchId],
    enabled: !!matchId,
  });

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['/api/tournaments', match?.tournamentId],
    enabled: !!match?.tournamentId,
  });

  const { data: nextMatch, isLoading: nextMatchLoading } = useQuery({
    queryKey: ['/api/tournaments', match?.tournamentId, 'my-next-match'],
    enabled: !!match?.tournamentId && match?.status === 'completed' && !!match?.winnerId,
  });

  const handleContinueToNextRound = async () => {
    if (!nextMatch) return;
    
    try {
      await apiRequest('POST', `/api/tournaments/matches/${nextMatch.id}/start`, {});
      window.location.href = `/tournament/match/${nextMatch.id}`;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start next match",
        variant: "destructive",
      });
    }
  };

  const handleReturnToTournaments = () => {
    window.location.href = '/tournaments';
  };

  if (matchLoading || tournamentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading results...</span>
        </div>
      </div>
    );
  }

  if (!match || !tournament) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Tournament results not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPlayer1 = user && match.player1Id === user.id;
  const isPlayer2 = user && match.player2Id === user.id;
  const myScore = isPlayer1 ? match.player1Score : match.player2Score;
  const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
  const myTimeSpent = isPlayer1 ? match.player1TimeSpent : match.player2TimeSpent;
  const opponentTimeSpent = isPlayer1 ? match.player2TimeSpent : match.player1TimeSpent;
  const myUsername = isPlayer1 ? match.player1Username : match.player2Username;
  const opponentUsername = isPlayer1 ? match.player2Username : match.player1Username;
  
  const didIWin = match.winnerId && user && (
    (isPlayer1 && match.winnerId === match.player1Id) ||
    (isPlayer2 && match.winnerId === match.player2Id)
  );

  const isMatchCompleted = match.status === 'completed';
  const canContinue = isMatchCompleted && didIWin && nextMatch;
  const isWaitingForOpponent = !isMatchCompleted;
  const isEliminated = isMatchCompleted && !didIWin;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{tournament.title}</h1>
          <p className="text-gray-600 mt-2">Round {match.round} Results</p>
        </div>

        {/* Match Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Match Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWaitingForOpponent ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Waiting for your opponent to complete their match...
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Winner Announcement */}
                <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  {didIWin ? (
                    <div className="text-green-600">
                      <Trophy className="h-8 w-8 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">Congratulations! You Won!</h3>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      <Target className="h-8 w-8 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">Good Match!</h3>
                      <p>Better luck next time!</p>
                    </div>
                  )}
                </div>

                {/* Score Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 ${didIWin ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    <div className="text-center">
                      <User className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-bold">{myUsername}</h4>
                      <div className="text-2xl font-bold text-blue-600">{myScore}/15</div>
                      <div className="text-sm text-gray-600">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {Math.floor(myTimeSpent / 60)}:{(myTimeSpent % 60).toString().padStart(2, '0')}
                      </div>
                      {didIWin && <Badge className="mt-2" variant="default">Winner</Badge>}
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border-2 ${!didIWin && match.winnerId === (isPlayer1 ? match.player2Id : match.player1Id) ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    <div className="text-center">
                      <User className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-bold">{opponentUsername}</h4>
                      <div className="text-2xl font-bold text-blue-600">{opponentScore}/15</div>
                      <div className="text-sm text-gray-600">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {Math.floor(opponentTimeSpent / 60)}:{(opponentTimeSpent % 60).toString().padStart(2, '0')}
                      </div>
                      {!didIWin && match.winnerId === (isPlayer1 ? match.player2Id : match.player1Id) && (
                        <Badge className="mt-2" variant="default">Winner</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-lg font-bold">{((myScore / 15) * 100).toFixed(1)}%</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-lg font-bold">{(myTimeSpent / 15).toFixed(1)}s</div>
                      <div className="text-sm text-gray-600">Avg per Question</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-lg font-bold">Round {match.round}</div>
                      <div className="text-sm text-gray-600">Tournament Progress</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Round {tournament.currentRound} of {tournament.maxRounds}</span>
                <span>{tournament.participantCount} participants</span>
              </div>
              <Progress value={(tournament.currentRound / tournament.maxRounds) * 100} />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {canContinue ? (
            <Button 
              onClick={handleContinueToNextRound}
              disabled={nextMatchLoading}
              className="flex items-center gap-2"
            >
              {nextMatchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Continue to Round {match.round + 1}
            </Button>
          ) : isEliminated ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">You have been eliminated from this tournament</p>
              <Button onClick={handleReturnToTournaments} variant="outline">
                Return to Tournaments
              </Button>
            </div>
          ) : isWaitingForOpponent ? (
            <Button disabled className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for Opponent...
            </Button>
          ) : (
            <Button onClick={handleReturnToTournaments} variant="outline">
              Return to Tournaments
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}