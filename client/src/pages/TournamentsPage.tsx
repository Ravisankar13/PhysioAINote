import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Trophy, Clock, Target, Zap, Sword, Crown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: number;
  title: string;
  description: string;
  bodyPart: string;
  difficulty: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
  currentRound: number;
  registrationEndTime: string;
  tournamentStartTime: string;
  createdAt: string;
}

interface TournamentParticipant {
  id: number;
  userId: number;
  username: string;
  bracketPosition: number;
  currentRound: number;
  isEliminated: boolean;
  joinedAt: string;
}

interface TournamentMatch {
  id: number;
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
}

interface TournamentDetails {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
}

export default function TournamentsPage() {
  const [, setLocation] = useLocation();
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  // Check if current user is admin
  const isAdmin = user?.username === 'Fateofjustice';
  
  // Debug logging
  console.log('User data:', user);
  console.log('Is admin:', isAdmin, 'Username:', user?.username);
  
  // Alert for debugging
  if (user?.username === 'Fateofjustice') {
    console.log('🔧 ADMIN USER DETECTED - Tab should be visible!');
  }

  // Fetch active tournaments
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['/api/tournaments'],
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  // Fetch selected tournament details
  const { data: tournamentDetails } = useQuery({
    queryKey: ['/api/tournaments', selectedTournament],
    enabled: !!selectedTournament,
    refetchInterval: 10000, // Refetch every 10 seconds for live bracket updates
  });

  // Fetch all tournament content for admin view
  const { data: allTournamentContent } = useQuery({
    queryKey: ['/api/tournaments/admin/all-content'],
    enabled: isAdmin,
  });

  // Register for tournament mutation
  const registerMutation = useMutation({
    mutationFn: (tournamentId: number) => 
      apiRequest(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "You've been registered for the tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      if (selectedTournament) {
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments', selectedTournament] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for tournament",
        variant: "destructive",
      });
    },
  });

  // Start tournament mutation (for testing purposes)
  const startMutation = useMutation({
    mutationFn: (tournamentId: number) => 
      apiRequest(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: "Tournament Started",
        description: "The tournament has begun! Check the brackets.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      if (selectedTournament) {
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments', selectedTournament] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start",
        description: error.message || "Failed to start tournament",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/tournaments?userId=${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to tournament WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'tournament_update':
            queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
            if (selectedTournament) {
              queryClient.invalidateQueries({ queryKey: ['/api/tournaments', selectedTournament] });
            }
            
            if (message.update?.type === 'tournament_started') {
              toast({
                title: "Tournament Started!",
                description: message.update.message,
              });
            }
            break;
            
          case 'upcoming_match':
            toast({
              title: "Match Starting Soon!",
              description: "Your tournament match is about to begin.",
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from tournament WebSocket');
    };

    return () => {
      ws.close();
    };
  }, [selectedTournament, queryClient, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-blue-500';
      case 'waiting_for_players': return 'bg-yellow-500';
      case 'round_1': 
      case 'round_2': 
      case 'round_3': 
      case 'round_4': return 'bg-green-500';
      case 'finals': return 'bg-purple-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return <Target className="h-4 w-4" />;
      case 'intermediate': return <Zap className="h-4 w-4" />;
      case 'advanced': return <Sword className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const renderBracket = (matches: TournamentMatch[]) => {
    const rounds = matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, TournamentMatch[]>);

    return (
      <div className="space-y-6">
        {Object.entries(rounds).map(([round, roundMatches]) => (
          <div key={round} className="space-y-2">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              {round === '1' && <Crown className="h-5 w-5 text-yellow-500" />}
              Round {round}
            </h4>
            <div className="grid gap-2">
              {roundMatches.map((match) => (
                <Card key={match.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${match.winnerId === match.player1Id ? 'text-green-600' : ''}`}>
                          {match.player1Username || 'TBD'}
                        </span>
                        {match.player1Score > 0 && (
                          <Badge variant="outline">{match.player1Score}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">vs</div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${match.winnerId === match.player2Id ? 'text-green-600' : ''}`}>
                          {match.player2Username || 'TBD'}
                        </span>
                        {match.player2Score > 0 && (
                          <Badge variant="outline">{match.player2Score}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                        {match.status}
                      </Badge>
                      {match.winnerId && (
                        <div className="text-sm text-green-600 font-medium">
                          Winner: {match.winnerId === match.player1Id ? match.player1Username : match.player2Username}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Diagnosis Duel Tournaments
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time 1v1 clinical diagnosis competitions with live brackets
          </p>
        </div>
        <Button onClick={() => setLocation('/competitions')}>
          Back to Competitions
        </Button>
      </div>

      <Tabs defaultValue="tournaments" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="tournaments">Active Tournaments</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!selectedTournament}>
            Tournament Bracket
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin-content">
              Admin - All Content
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          {!tournaments || tournaments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active tournaments at the moment. Check back soon for new tournaments!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.filter(Boolean).map((tournament: Tournament) => {
                // Safety check to ensure tournament has required properties
                if (!tournament || !tournament.title) {
                  console.warn('Invalid tournament object:', tournament);
                  return null;
                }
                
                return (
                <Card key={tournament.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{tournament.title}</CardTitle>
                      <Badge className={getStatusColor(tournament.status)}>
                        {tournament.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>{tournament.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        {getDifficultyIcon(tournament.difficulty)}
                        <span className="capitalize">{tournament.difficulty}</span>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {tournament.bodyPart}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {tournament.currentParticipants}/{tournament.maxParticipants}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Round {tournament.currentRound}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {tournament.status === 'registration' || tournament.status === 'waiting_for_players' ? (
                          <Button 
                            onClick={() => registerMutation.mutate(tournament.id)}
                            disabled={registerMutation.isPending}
                            className="flex-1"
                          >
                            {registerMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Register
                          </Button>
                        ) : null}
                        
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedTournament(tournament.id)}
                          className="flex-1"
                        >
                          View Bracket
                        </Button>
                      </div>

                      {/* Development only - Start tournament button */}
                      {(tournament.status === 'waiting_for_players' && tournament.currentParticipants >= 4) && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => startMutation.mutate(tournament.id)}
                          disabled={startMutation.isPending}
                          className="w-full"
                        >
                          {startMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Start Tournament (Dev)
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              }).filter(Boolean)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          {selectedTournament && tournamentDetails && tournamentDetails.tournament ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {tournamentDetails.tournament.title || 'Tournament'}
                  </CardTitle>
                  <CardDescription>
                    {tournamentDetails.tournament.description || 'Tournament details'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{tournamentDetails.participants.length}</div>
                      <div className="text-sm text-muted-foreground">Participants</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{tournamentDetails.tournament.currentRound}</div>
                      <div className="text-sm text-muted-foreground">Current Round</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold capitalize">{tournamentDetails.tournament.difficulty}</div>
                      <div className="text-sm text-muted-foreground">Difficulty</div>
                    </div>
                    <div>
                      <Badge className={getStatusColor(tournamentDetails.tournament.status)}>
                        {tournamentDetails.tournament.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tournament Bracket</CardTitle>
                </CardHeader>
                <CardContent>
                  {tournamentDetails.matches.length > 0 ? (
                    renderBracket(tournamentDetails.matches)
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Tournament bracket will be generated once the tournament starts.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {tournamentDetails.participants.map((participant) => (
                      <div 
                        key={participant.id}
                        className={`p-3 rounded-lg border ${participant.isEliminated ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                      >
                        <div className="font-medium">{participant.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Position #{participant.bracketPosition}
                          {participant.isEliminated && ' (Eliminated)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Select a tournament from the Active Tournaments tab to view its bracket.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Admin Content Tab */}
        {isAdmin && (
          <TabsContent value="admin-content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Admin - All Tournament Content
                </CardTitle>
                <CardDescription>
                  Preview all questions from all 5 tournaments (3 rounds each with 15 questions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allTournamentContent ? (
                  <div className="space-y-6">
                    {allTournamentContent.map((tournament: any) => (
                      <Card key={tournament.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <CardTitle className="text-xl">{tournament.title}</CardTitle>
                          <CardDescription>
                            Competition ID: {tournament.competitionId} | Game Content ID: {tournament.gameContentId}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {tournament.content?.lightning_diagnosis?.rounds && (
                            <div className="space-y-4">
                              {Object.entries(tournament.content.lightning_diagnosis.rounds).map(([roundKey, roundData]: [string, any]) => (
                                <Card key={roundKey} className="border-dashed">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-lg capitalize">
                                      {roundData.description || `${roundKey.replace('_', ' ')}`}
                                    </CardTitle>
                                    <CardDescription>
                                      Difficulty: {roundData.difficulty} | Time per question: {roundData.time_limit_per_question}s | Questions: {roundData.questions?.length || 0}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid gap-3">
                                      {roundData.questions?.slice(0, 5).map((questionId: string) => {
                                        const question = tournament.content.lightning_diagnosis.cases?.find((q: any) => q.id === questionId);
                                        return question ? (
                                          <div key={questionId} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="font-medium text-sm mb-2">
                                              Case #{question.case_number}: {question.body_part}
                                            </div>
                                            <div className="text-sm mb-2">
                                              <strong>Presentation:</strong> {question.patient_presentation}
                                            </div>
                                            <div className="text-sm mb-2">
                                              <strong>Question:</strong> {question.question}
                                            </div>
                                            <div className="text-sm text-green-600 font-medium">
                                              <strong>Answer:</strong> {question.correct_answer}
                                            </div>
                                          </div>
                                        ) : null;
                                      })}
                                      {roundData.questions?.length > 5 && (
                                        <div className="text-sm text-muted-foreground italic">
                                          ... and {roundData.questions.length - 5} more questions
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading tournament content...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}