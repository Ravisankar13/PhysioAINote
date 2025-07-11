import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Clock, 
  Trophy, 
  Target, 
  Crown,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Zap,
  Activity,
  Timer,
  UserCheck,
  UserX
} from "lucide-react";

interface TournamentParticipant {
  id: number;
  tournamentId: number;
  userId: number;
  username: string;
  bracketPosition: number;
  currentRound: number;
  isEliminated: boolean;
  joinedAt: string;
}

interface Tournament {
  id: number;
  title: string;
  description: string;
  status: string;
  maxParticipants: number;
  gameType: string;
  difficulty: string;
  timeLimit: number;
  createdAt: string;
  scheduledStartTime?: string;
}

export default function TournamentWaitingRoom() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    message: string;
    timestamp: Date;
    type: 'join' | 'leave' | 'ready' | 'system';
  }>>([]);
  
  const tournamentId = parseInt(id || "0");

  // Fetch tournament participants
  const { data: participants = [], isLoading: participantsLoading, refetch: refetchParticipants } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/participants`],
    enabled: !!tournamentId,
    refetchInterval: 2000, // Refresh every 2 seconds for live updates
    onSuccess: (data) => {
      console.log("Participants fetched successfully:", data);
    },
    onError: (error) => {
      console.error("Error fetching participants:", error);
    }
  });

  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading, refetch: refetchTournament } = useQuery({
    queryKey: ['/api/tournaments', tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const currentParticipants = participants?.length || 0;
  const maxParticipants = tournament?.maxParticipants || 8;
  const progressPercentage = (currentParticipants / maxParticipants) * 100;

  // Debug logging to see participant data
  useEffect(() => {
    console.log("Participants state:", participants);
    console.log("Participants loading:", participantsLoading);
    console.log("Tournament ID:", tournamentId);
    if (participants?.length > 0) {
      console.log("First participant:", participants[0]);
    }
  }, [participants, participantsLoading, tournamentId]);

  // Activity feed simulation
  useEffect(() => {
    if (participants.length > 0) {
      // Check for new participants and add to activity feed
      const now = new Date();
      participants.forEach((participant: TournamentParticipant) => {
        const joinTime = new Date(participant.joinedAt);
        const timeDiff = now.getTime() - joinTime.getTime();
        
        // If they joined within the last 30 seconds, add to activity feed
        if (timeDiff < 30000) {
          const existingActivity = activityFeed.find(activity => 
            activity.message.includes(participant.username) && activity.type === 'join'
          );
          
          if (!existingActivity) {
            setActivityFeed(prev => [
              {
                id: `join-${participant.id}-${joinTime.getTime()}`,
                message: `${participant.username} joined the tournament`,
                timestamp: joinTime,
                type: 'join'
              },
              ...prev.slice(0, 9) // Keep last 10 activities
            ]);
          }
        }
      });
    }
  }, [participants, activityFeed]);

  const handleLeaveTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Left Tournament",
          description: "You have successfully left the tournament.",
        });
        setLocation('/competitions');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to leave tournament",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave tournament",
        variant: "destructive",
      });
    }
  };

  const toggleReady = () => {
    setIsReady(!isReady);
    
    // Add activity to feed
    setActivityFeed(prev => [
      {
        id: `ready-${Date.now()}`,
        message: isReady ? "You marked yourself as not ready" : "You marked yourself as ready",
        timestamp: new Date(),
        type: 'ready'
      },
      ...prev.slice(0, 9)
    ]);
  };

  if (tournamentLoading || participantsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tournament...</span>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tournament not found or you don't have access to this tournament.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const canStart = currentParticipants >= 4; // Minimum participants needed
  const isFull = currentParticipants >= maxParticipants;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setLocation('/competitions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competitions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{tournament.title}</h1>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tournament Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Tournament Status
            </CardTitle>
            <CardDescription>
              Waiting for players to join before starting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Participant Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Participants</span>
                <span className="text-sm text-muted-foreground">
                  {currentParticipants} / {maxParticipants}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {!canStart && (
                <p className="text-sm text-muted-foreground">
                  Need at least 4 players to start the tournament
                </p>
              )}
            </div>

            {/* Tournament Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-sm font-medium">{tournament.timeLimit}min</div>
                <div className="text-xs text-muted-foreground">Time Limit</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Target className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-sm font-medium">{tournament.difficulty}</div>
                <div className="text-xs text-muted-foreground">Difficulty</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Zap className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-sm font-medium">Elimination</div>
                <div className="text-xs text-muted-foreground">Format</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Crown className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                <div className="text-sm font-medium">Winner</div>
                <div className="text-xs text-muted-foreground">Takes All</div>
              </div>
            </div>

            {/* Tournament Rules */}
            <div className="space-y-3">
              <h4 className="font-semibold">Tournament Rules</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Single elimination tournament format</li>
                <li>• Each match consists of rapid-fire diagnosis challenges</li>
                <li>• Best diagnostic accuracy and speed wins each round</li>
                <li>• Tournament begins automatically when enough players join</li>
                <li>• Winners advance to the next round until final champion</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <Separator />
            <div className="flex gap-3">
              <Button 
                onClick={toggleReady}
                variant={isReady ? "default" : "outline"}
                className="flex-1"
              >
                {isReady ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ready to Play
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLeaveTournament}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Leave Tournament
              </Button>
              
              {/* Test Start Button - for testing purposes */}
              {currentParticipants >= 4 && (
                <Button 
                  variant="default" 
                  onClick={async () => {
                    try {
                      console.log('Starting tournament...');
                      const response = await fetch(`/api/tournaments/${tournamentId}/start`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('Tournament started successfully:', result);
                        // Refresh tournament data
                        await refetchTournament();
                        await refetchParticipants();
                        
                        // Check for user's match after tournament starts
                        setTimeout(async () => {
                          try {
                            const matchResponse = await fetch(`/api/tournaments/${tournamentId}/my-match`, {
                              credentials: 'include'
                            });
                            
                            if (matchResponse.ok) {
                              const match = await matchResponse.json();
                              if (match && match.id) {
                                // Redirect to the match page
                                window.location.href = `/tournament/match/${match.id}`;
                                return;
                              }
                            }
                          } catch (error) {
                            console.error('Error finding match:', error);
                          }
                          
                          // Fallback to tournaments page
                          window.location.href = '/tournaments';
                        }, 2000); // Wait 2 seconds for match creation
                      } else {
                        const errorText = await response.text();
                        console.error('Failed to start tournament:', errorText);
                        
                        // Try to parse error as JSON for better display
                        try {
                          const errorObj = JSON.parse(errorText);
                          alert(`Failed to start tournament: ${errorObj.error || errorText}`);
                        } catch {
                          alert(`Failed to start tournament: ${errorText}`);
                        }
                      }
                    } catch (error) {
                      console.error('Error starting tournament:', error);
                      alert(`Error starting tournament: ${error.message}`);
                    }
                  }}
                  className="flex-1"
                >
                  🚀 START TOURNAMENT (Test)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Participants ({currentParticipants})
            </CardTitle>
            <CardDescription>
              Players in the waiting room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants && participants.length > 0 ? participants.map((participant: TournamentParticipant, index: number) => (
                <div 
                  key={participant.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{participant.username || 'Anonymous'}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {(() => {
                          try {
                            if (!participant.joinedAt) return 'recently';
                            const date = new Date(participant.joinedAt);
                            if (isNaN(date.getTime())) return 'recently';
                            return date.toLocaleTimeString();
                          } catch (error) {
                            console.error('Date parsing error:', error, participant.joinedAt);
                            return 'recently';
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={index === 0 && isReady ? "default" : "secondary"}>
                    {index === 0 && isReady ? "Ready" : "Waiting"}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-4 text-muted-foreground">
                  {participantsLoading ? 'Loading participants...' : 'No participants yet'}
                </div>
              )}
              
              {/* Empty slots */}
              {participants && participants.length > 0 && Array.from({ length: maxParticipants - currentParticipants }).map((_, index) => (
                <div 
                  key={`empty-${index}`} 
                  className="flex items-center gap-3 p-3 border rounded-lg opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {currentParticipants + index + 1}
                  </div>
                  <div className="text-muted-foreground">Waiting for player...</div>
                </div>
              ))}
            </div>

            {/* Tournament Status */}
            <Separator className="my-4" />
            <div className="text-center space-y-2">
              {!canStart ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-center">
                    Waiting for more players to join (minimum 4 needed)
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-center">
                    {isFull ? "Tournament is full! Starting soon..." : "Ready to start when full or timer expires"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Live tournament updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {activityFeed.length > 0 ? (
                <div className="space-y-3">
                  {activityFeed.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0 mt-1">
                        {activity.type === 'join' && <UserCheck className="h-4 w-4 text-green-600" />}
                        {activity.type === 'leave' && <UserX className="h-4 w-4 text-red-600" />}
                        {activity.type === 'ready' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'system' && <Trophy className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Tournament updates will appear here</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bracket Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            Tournament Bracket Preview
          </CardTitle>
          <CardDescription>
            Single elimination bracket structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 bg-muted rounded-lg">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="text-lg font-semibold mb-2">Bracket Generation</h3>
            <p className="text-muted-foreground">
              Tournament bracket will be automatically generated when the tournament starts.
              <br />
              Players will be matched based on their join order and skill level.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}