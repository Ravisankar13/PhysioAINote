import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Clock, 
  Timer,
  ArrowLeft,
  Crown,
  Zap
} from "lucide-react";
import { format } from 'date-fns';

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
  tournamentId: number;
  userId: number;
  username: string;
  bracketPosition: number;
  currentRound: number;
  isEliminated: boolean;
  joinedAt: string;
}

export default function TournamentWaitingRoom() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tournamentId, setTournamentId] = useState<number | null>(null);

  // Extract tournament ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/tournament\/(\d+)\/waiting-room/);
    if (match) {
      setTournamentId(parseInt(match[1]));
    }
  }, []);

  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch tournament participants
  const { data: participants, isLoading: participantsLoading } = useQuery<TournamentParticipant[]>({
    queryKey: [`/api/tournaments/${tournamentId}/participants`],
    enabled: !!tournamentId,
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  const goBack = () => {
    setLocation('/competitions');
  };

  if (tournamentLoading || participantsLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tournament Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The tournament you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userParticipant = participants?.find(p => p.userId === user?.id);
  const isRegistered = !!userParticipant;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Tournament Waiting Room
          </h1>
          <p className="text-muted-foreground mt-2">
            Waiting for tournament to start...
          </p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competitions
        </Button>
      </div>

      {/* Tournament Info */}
      <Card className="border-2 border-purple-200 bg-purple-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-purple-600" />
                {tournament.title}
              </CardTitle>
              <CardDescription className="text-base">
                {tournament.description}
              </CardDescription>
              <div className="flex gap-2">
                <Badge variant="outline">{tournament.bodyPart}</Badge>
                <Badge variant="outline">{tournament.difficulty}</Badge>
                <Badge 
                  variant={tournament.status === 'registration' ? 'default' : 'secondary'}
                >
                  {tournament.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{tournament.currentParticipants}/{tournament.maxParticipants}</p>
                <p className="text-sm text-muted-foreground">Participants</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {format(new Date(tournament.registrationEndTime), 'MMM d, h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground">Registration Ends</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {format(new Date(tournament.tournamentStartTime), 'MMM d, h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground">Tournament Starts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Status */}
      {isRegistered ? (
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <Zap className="h-5 w-5" />
              You're Registered!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-green-700">
                <strong>Bracket Position:</strong> #{userParticipant.bracketPosition}
              </p>
              <p className="text-green-700">
                <strong>Registered:</strong> {format(new Date(userParticipant.joinedAt), 'MMM d, h:mm a')}
              </p>
              <p className="text-sm text-green-600">
                You'll be notified when the tournament starts and matches begin!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Not Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              You are not registered for this tournament. Please go back and register before the deadline.
            </p>
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Register
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Participants ({participants?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants && participants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className={`p-3 rounded-lg border ${
                    participant.userId === user?.id 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{participant.username}</p>
                      <p className="text-sm text-muted-foreground">
                        Position #{participant.bracketPosition}
                      </p>
                    </div>
                    {participant.userId === user?.id && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No participants registered yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}