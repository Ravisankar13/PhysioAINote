import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trophy, 
  Target, 
  Clock, 
  Users, 
  Star, 
  Zap, 
  Brain,
  Calendar,
  Award,
  TrendingUp,
  Medal,
  Crown,
  GraduationCap,
  BookOpen,
  Timer,
  User,
  CheckCircle,
  ArrowRight,
  Play,
  AlertCircle,
  AlertTriangle,
  Heart,
  Settings,
  ChevronRight,
  Search,
  FileText,
  Clipboard,
  Send,
  Sword
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, format } from 'date-fns';
import DailyChallengeCard from "@/components/competition/DailyChallengeCard";
import ActiveCompetitions from "@/components/competition/ActiveCompetitions";
import LeaderboardView from "@/components/competition/LeaderboardView";
import AchievementsPanel from "@/components/competition/AchievementsPanel";
import CompetitionHistory from "@/components/competition/CompetitionHistory";

// Tournament interfaces
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

// Interface for complex case competitions
interface ComplexCompetition {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  bodyPart: string;
  difficulty: string;
  timeLimit: number;
  maxParticipants: number;
  currentParticipants: number;
  registrationDeadline: string;
  startTime: string;
  endTime: string;
  complexCaseIds: number[];
  rules: {
    stageTimeLimit: number;
    showLeaderboard: boolean;
  };
}

// Interface for tournaments
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

// GameCompetitionsView component for Elite Clinical Competitions
function GameCompetitionsView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('tournaments');
  
  // State to track user's tournament registrations
  const [userRegistrations, setUserRegistrations] = useState<Set<number>>(new Set());

  // Fetch game competitions
  const { data: gameCompetitions = [], isLoading } = useQuery({
    queryKey: ['/api/game-competitions'],
    refetchInterval: 30000
  });

  // Fetch tournaments
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ['/api/tournaments'],
    refetchInterval: 30000
  });

  // Fetch user's tournament registrations
  const { data: userTournamentRegistrations } = useQuery({
    queryKey: ['/api/tournaments/my-registrations'],
    enabled: !!user, // Only fetch if user is logged in
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Update userRegistrations when data is fetched
  useEffect(() => {
    if (userTournamentRegistrations) {
      const registeredTournamentIds = new Set(userTournamentRegistrations.map((reg: any) => reg.tournamentId));
      setUserRegistrations(registeredTournamentIds);
    }
  }, [userTournamentRegistrations]);

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType) {
      case 'red_flag_detective':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'differential_diagnosis_duel':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'lightning_diagnosis':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'emergency_room_simulator':
        return <Heart className="h-5 w-5 text-purple-500" />;
      case 'treatment_speed_run':
        return <Clock className="h-5 w-5 text-green-500" />;
      case 'diagnosis_duel':
        return <Zap className="h-5 w-5 text-orange-500" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-500" />;
    }
  };

  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case 'red_flag_detective':
        return 'border-red-200 bg-red-50/50';
      case 'differential_diagnosis_duel':
        return 'border-blue-200 bg-blue-50/50';
      case 'lightning_diagnosis':
        return 'border-yellow-200 bg-yellow-50/50';
      case 'emergency_room_simulator':
        return 'border-purple-200 bg-purple-50/50';
      case 'treatment_speed_run':
        return 'border-green-200 bg-green-50/50';
      case 'diagnosis_duel':
        return 'border-orange-200 bg-orange-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  const getGameTypeName = (gameType: string) => {
    switch (gameType) {
      case 'red_flag_detective':
        return 'Red Flag Detective';
      case 'differential_diagnosis_duel':
        return 'Differential Race';
      case 'lightning_diagnosis':
        return 'Pattern Recognition';
      case 'emergency_room_simulator':
        return 'Emergency Triage';
      case 'treatment_speed_run':
        return 'Speed Challenge';
      case 'diagnosis_duel':
        return 'Diagnosis Duel';
      default:
        return 'Game Competition';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading Elite Competitions...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const joinTournament = async (tournamentId: number) => {
    try {
      console.log(`Attempting to join tournament ${tournamentId}`);
      const response = await apiRequest('POST', `/api/tournaments/${tournamentId}/register`);
      const result = await response.json();
      
      console.log("Tournament registration response:", result);
      
      if (result.success) {
        toast({
          title: "Tournament Joined!",
          description: "You've successfully registered for the tournament.",
        });
        
        // Update local state to track registration
        setUserRegistrations(prev => new Set(prev).add(tournamentId));
        
        // Refetch tournaments to update participant count
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      } else {
        // Handle case where response is received but not successful
        toast({
          title: "Registration Failed",
          description: result.message || "Registration was not successful",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Tournament registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to join tournament",
        variant: "destructive",
      });
    }
  };

  const enterWaitingRoom = (tournamentId: number) => {
    // Navigate to tournament waiting room
    setLocation(`/tournaments/${tournamentId}/waiting-room`);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-600" />
            Elite Clinical Competitions & Tournaments
          </CardTitle>
          <CardDescription>
            Choose between individual competitions or elimination tournaments. Master clinical skills through specialized challenges.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sub-tabs for Competitions and Tournaments */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Elimination Tournaments
          </TabsTrigger>
          <TabsTrigger value="competitions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Individual Competitions
          </TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-6">
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament: Tournament) => (
                <Card key={tournament.id} className="hover:shadow-lg transition-shadow border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-purple-600" />
                          {tournament.title}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{tournament.bodyPart}</Badge>
                          <Badge variant="outline" className="text-xs">{tournament.difficulty}</Badge>
                        </div>
                      </div>
                      <Badge 
                        variant={tournament.status === 'registration' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {tournament.status === 'registration' ? 'Open' : tournament.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="mb-4">
                      {tournament.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament.currentParticipants}/{tournament.maxParticipants}
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          Round {tournament.currentRound}/5
                        </div>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Registration ends: {format(new Date(tournament.registrationEndTime), 'MMM d, h:mm a')}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          Tournament starts: {format(new Date(tournament.tournamentStartTime), 'MMM d, h:mm a')}
                        </div>
                      </div>
                      
                      {userRegistrations.has(tournament.id) ? (
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => enterWaitingRoom(tournament.id)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Enter Waiting Room
                          </Button>
                          <div className="text-center">
                            <Badge variant="secondary" className="text-xs">
                              ✓ Registered
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => joinTournament(tournament.id)}
                          disabled={tournament.status !== 'registration'}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          {tournament.status === 'registration' ? 'Join Tournament' : 'Tournament Started'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <Alert>
                  <Trophy className="h-4 w-4" />
                  <AlertDescription>
                    No active tournaments at the moment. New elimination tournaments are scheduled regularly featuring 1v1 diagnosis duels!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Individual Competitions Tab */}
        <TabsContent value="competitions" className="space-y-6">
          {gameCompetitions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gameCompetitions.map((competition: any) => (
                <Card key={competition.id} className={`hover:shadow-lg transition-shadow cursor-pointer ${getGameTypeColor(competition.gameType)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getGameTypeIcon(competition.gameType)}
                      {competition.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {getGameTypeName(competition.gameType)}
                    </Badge>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-4">
                  {competition.description}
                </CardDescription>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {competition.timeLimit}min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {competition.currentParticipants || 0}/{competition.maxParticipants}
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {competition.difficulty}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setLocation(`/game-competition/${competition.id}`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Join Competition
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No Elite Competitions available at the moment. New competitions are added regularly - check back soon!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ComplexCaseCompetitionsView component
function ComplexCaseCompetitionsView() {
  const [selectedTab, setSelectedTab] = useState('active');
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch upcoming complex competitions
  const { data: upcomingCompetitions = [], isLoading: loadingUpcoming } = useQuery<ComplexCompetition[]>({
    queryKey: ['/api/complex-competitions/upcoming'],
    refetchInterval: 30000
  });

  // Fetch active complex competitions
  const { data: activeCompetitions = [], isLoading: loadingActive } = useQuery<ComplexCompetition[]>({
    queryKey: ['/api/complex-competitions/active'],
    refetchInterval: 10000
  });

  // Fetch user's registered competitions
  const { data: myRegistrations = [], isLoading: loadingRegistrations } = useQuery<ComplexCompetition[]>({
    queryKey: ['/api/complex-competitions/my-registrations'],
    refetchInterval: 30000,
  });

  // Join competition mutation
  const joinCompetitionMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(`/api/complex-competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join competition');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Registration Successful!",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/complex-competitions'] });
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join competition. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJoinCompetition = (competitionId: number) => {
    joinCompetitionMutation.mutate(competitionId);
  };

  const handleEnterCompetition = (competitionId: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enter competitions.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/complex-competition/${competitionId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date <= now) return 'Started';
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const canJoinCompetition = (competition: ComplexCompetition) => {
    const now = new Date();
    const registrationDeadline = new Date(competition.registrationDeadline);
    const isRegistrationOpen = now < registrationDeadline;
    const hasSpace = competition.currentParticipants < competition.maxParticipants;
    
    return isRegistrationOpen && hasSpace && competition.status === 'upcoming';
  };

  const CompetitionCard = ({ competition }: { competition: ComplexCompetition }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{competition.title}</CardTitle>
            <CardDescription className="text-sm">
              {competition.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(competition.status)}>
              {competition.status}
            </Badge>
            <Badge className={getDifficultyColor(competition.difficulty)}>
              {competition.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{competition.bodyPart}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span>{competition.timeLimit} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{competition.rules?.stageTimeLimit || 5} min/stage</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Participants</span>
            <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
          </div>
          <Progress 
            value={(competition.currentParticipants / competition.maxParticipants) * 100} 
            className="h-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Starts: {format(new Date(competition.startTime), 'MMM d, yyyy - h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {competition.status === 'upcoming' 
                ? `Registration closes ${formatTimeRemaining(competition.registrationDeadline)}`
                : `Started ${formatTimeRemaining(competition.startTime)}`
              }
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {competition.status === 'upcoming' && (
          canJoinCompetition(competition) ? (
            <Button 
              onClick={() => handleJoinCompetition(competition.id)}
              disabled={joinCompetitionMutation.isPending}
              className="w-full"
            >
              {joinCompetitionMutation.isPending ? (
                "Joining..."
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Join Competition
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="w-full">
              {competition.currentParticipants >= competition.maxParticipants 
                ? "Competition Full" 
                : "Registration Closed"
              }
            </Button>
          )
        )}
        
        {competition.status === 'active' && (
          <Button 
            className="w-full"
            onClick={() => handleEnterCompetition(competition.id)}
          >
            <Play className="h-4 w-4 mr-2" />
            Enter Competition
          </Button>
        )}

        {competition.status === 'completed' && (
          <Button variant="outline" className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            View Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  // Check if user is admin
  const isAdmin = user && ["Fateofjustice"].includes(user.username);

  // Fetch tournaments
  const { data: tournaments = [], isLoading: loadingTournaments } = useQuery({
    queryKey: ['/api/tournaments'],
    refetchInterval: 30000,
  });

  // Fetch admin tournament content
  const { data: adminTournamentContent = [], isLoading: loadingAdminContent } = useQuery({
    queryKey: ['/api/tournaments/admin/all-content'],
    enabled: isAdmin,
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Complex Case Competitions</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test your clinical reasoning skills in time-limited competitions featuring multi-stage complex cases. 
          Compete with fellow healthcare professionals and climb the leaderboards!
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Live ({activeCompetitions.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({upcomingCompetitions.length})
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Sword className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="my-registrations" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Registrations ({myRegistrations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin-preview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin Preview
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {loadingUpcoming ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading upcoming competitions...</p>
            </div>
          ) : upcomingCompetitions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Competitions</h3>
              <p className="text-muted-foreground">
                New competitions are scheduled regularly. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingCompetitions.map((competition: ComplexCompetition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {loadingActive ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading live competitions...</p>
            </div>
          ) : activeCompetitions.length === 0 ? (
            <div className="text-center py-12">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Live Competitions</h3>
              <p className="text-muted-foreground">
                Active competitions will appear here when they start.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCompetitions.map((competition: ComplexCompetition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-registrations" className="space-y-6">
          {loadingRegistrations ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading your registrations...</p>
            </div>
          ) : myRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Registrations</h3>
              <p className="text-muted-foreground">
                You haven't registered for any competitions yet. Check the upcoming tab to join!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRegistrations.map((competition: ComplexCompetition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CompetitionHistoryView />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="text-center py-12">
            <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Leaderboards will be available once competitions start.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="text-center space-y-4 mb-8">
            <div className="flex items-center justify-center gap-2">
              <Sword className="h-8 w-8 text-orange-600" />
              <h2 className="text-3xl font-bold">Diagnosis Duel Tournaments</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Compete head-to-head in elimination bracket tournaments. Battle through multiple rounds
              of clinical diagnosis challenges to claim the championship title!
            </p>
          </div>

          <Tabs defaultValue="tournaments" className="w-full">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="tournaments" className="flex items-center gap-2">
                <Sword className="h-4 w-4" />
                Active Tournaments ({tournaments?.length || 0})
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin-all-content" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Admin - All Content ✓
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="tournaments" className="space-y-6">
              {loadingTournaments ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading tournaments...</p>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Sword className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Tournaments</h3>
                  <p className="text-muted-foreground">
                    New tournaments will be scheduled soon. Check back later!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map((tournament: Tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              )}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin-all-content" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-600" />
                      <span className="text-orange-600">Admin Tournament Content Preview</span>
                      <Badge variant="secondary">FOR ADMIN REVIEW</Badge>
                    </CardTitle>
                    <CardDescription>
                      Complete tournament question database for administrative review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAdminContent ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading admin content...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {adminTournamentContent.map((tournament: any, tourneyIndex: number) => (
                          <Card key={tournament.id} className="border-l-4 border-l-orange-600">
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Crown className="h-5 w-5 text-orange-600" />
                                {tournament.title}
                              </CardTitle>
                              <CardDescription>
                                {tournament.bodyPart} • {tournament.difficulty} • {tournament.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {tournament.rounds?.map((round: any, roundIndex: number) => (
                                  <div key={roundIndex} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-orange-50">
                                        Round {round.roundNumber} - {round.difficulty}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {round.questions?.length || 0} questions
                                      </span>
                                    </div>
                                    
                                    <div className="grid gap-3">
                                      {round.questions?.slice(0, 3).map((question: any, qIndex: number) => (
                                        <Card key={qIndex} className="border border-orange-200">
                                          <CardContent className="p-4">
                                            <div className="space-y-2">
                                              <div className="flex items-start gap-2">
                                                <Badge variant="secondary" className="text-xs mt-1">
                                                  Q{qIndex + 1}
                                                </Badge>
                                                <div className="flex-1">
                                                  <p className="text-sm font-medium">{question.clinicalPresentation}</p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    <strong>Correct:</strong> {question.correctDiagnosis}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                      {round.questions?.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                          ... and {round.questions.length - 3} more questions
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin-preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Admin Preview
                </CardTitle>
                <CardDescription>
                  Preview and test complex case competitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...upcomingCompetitions, ...activeCompetitions].map((competition) => (
                      <Card key={`admin-${competition.id}`} className="border-dashed">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{competition.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {competition.bodyPart} • {competition.difficulty}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleEnterCompetition(competition.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Preview Competition
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// TournamentCard component
function TournamentCard({ tournament }: { tournament: Tournament }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async (tournamentId: number) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Tournament Registration Successful!",
        description: "You have been registered for the tournament. Good luck!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for tournament",
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    registerMutation.mutate(tournament.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'registration': return 'Open Registration';
      case 'active': return 'Tournament Active';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-600">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sword className="h-5 w-5 text-orange-600" />
              {tournament.title}
            </CardTitle>
            <CardDescription>{tournament.description}</CardDescription>
          </div>
          <Badge variant="outline" className={getStatusColor(tournament.status)}>
            {getStatusText(tournament.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{tournament.bodyPart}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{tournament.difficulty}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>Round {tournament.currentRound || 1}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Participants</span>
            <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
          </div>
          <Progress 
            value={(tournament.currentParticipants / tournament.maxParticipants) * 100} 
            className="h-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Registration ends: {format(new Date(tournament.registrationEndTime), 'MMM d, h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span>Tournament starts: {format(new Date(tournament.tournamentStartTime), 'MMM d, h:mm a')}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {tournament.status === 'registration' && (
          tournament.currentParticipants < tournament.maxParticipants ? (
            <Button 
              onClick={handleRegister}
              disabled={registerMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {registerMutation.isPending ? (
                "Registering..."
              ) : (
                <>
                  <Sword className="h-4 w-4 mr-2" />
                  Join Tournament
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="w-full">
              Tournament Full
            </Button>
          )
        )}
        
        {tournament.status === 'active' && (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => setLocation(`/tournaments/${tournament.id}`)}
          >
            <Play className="h-4 w-4 mr-2" />
            Enter Tournament
          </Button>
        )}

        {tournament.status === 'completed' && (
          <Button variant="outline" className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            View Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// CompetitionHistoryView component
function CompetitionHistoryView() {
  const { user } = useAuth();
  
  // Fetch user's competition history with detailed results
  const { data: competitionHistory = [], isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['/api/complex-competitions/history'],
    refetchInterval: 30000,
  });

  if (loadingHistory) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading competition history...</p>
      </div>
    );
  }

  if (competitionHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Competition History</h3>
        <p className="text-muted-foreground">
          Complete some competitions to see your detailed results and progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Competition History</h2>
          <p className="text-muted-foreground">
            Review your detailed competition results and performance analytics
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {competitionHistory.length} Competition{competitionHistory.length !== 1 ? 's' : ''} Completed
        </Badge>
      </div>

      <div className="space-y-4">
        {competitionHistory.map((attempt: any, index: number) => (
          <CompetitionHistoryCard key={`${attempt.competitionId}-${index}`} attempt={attempt} />
        ))}
      </div>
    </div>
  );
}

// CompetitionHistoryCard component
function CompetitionHistoryCard({ attempt }: { attempt: any }) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{attempt.competitionTitle}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getBadgeVariant(attempt.totalScore)} className="text-sm font-bold">
              {attempt.totalScore}% Score
            </Badge>
            <Badge variant="outline" className="text-sm">
              Rank #{attempt.rank || 'N/A'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Time Spent</div>
            <div className="text-lg font-semibold">{attempt.timeSpent}min</div>
          </div>
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Questions</div>
            <div className="text-lg font-semibold">{attempt.totalQuestions}</div>
          </div>
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Avg Score</div>
            <div className={`text-lg font-semibold ${getScoreColor(attempt.averageScore)}`}>
              {attempt.averageScore}%
            </div>
          </div>
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Participants</div>
            <div className="text-lg font-semibold">{attempt.totalParticipants}</div>
          </div>
        </div>

        {/* Category Breakdown */}
        {attempt.categoryScores && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Performance Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center p-2 bg-background rounded border">
                <span className="text-sm">Clinical Reasoning</span>
                <Badge variant="outline" className={getScoreColor(attempt.categoryScores.clinicalReasoning)}>
                  {attempt.categoryScores.clinicalReasoning}%
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-background rounded border">
                <span className="text-sm">Assessment Skills</span>
                <Badge variant="outline" className={getScoreColor(attempt.categoryScores.assessmentSkills)}>
                  {attempt.categoryScores.assessmentSkills}%
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-background rounded border">
                <span className="text-sm">Treatment Planning</span>
                <Badge variant="outline" className={getScoreColor(attempt.categoryScores.treatmentPlanning)}>
                  {attempt.categoryScores.treatmentPlanning}%
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-background rounded border">
                <span className="text-sm">Communication</span>
                <Badge variant="outline" className={getScoreColor(attempt.categoryScores.communication)}>
                  {attempt.categoryScores.communication}%
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Analysis Toggle */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-between"
          >
            <span>Detailed Question Analysis</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>

          {expanded && attempt.questionFeedback && (
            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
              {attempt.questionFeedback.map((feedback: any, idx: number) => (
                <Card key={idx} className="border-l-2 border-l-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                      <Badge variant={getBadgeVariant(feedback.score)} className="text-xs">
                        {feedback.score}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {feedback.analysis}
                      </div>
                    </div>
                    {feedback.learningPoints && feedback.learningPoints.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-primary">Key Learning Points:</h5>
                        <ul className="text-sm space-y-1">
                          {feedback.learningPoints.map((point: string, pointIdx: number) => (
                            <li key={pointIdx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span className="text-muted-foreground">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ComplexCasesView component
function ComplexCasesView() {
  const [, setLocation] = useLocation();
  const { data: complexCases, isLoading } = useQuery({
    queryKey: ['/api/complex-cases']
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleStartCase = (caseId: number) => {
    setLocation(`/complex-case/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Practice Case Studies</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Advanced multi-stage clinical reasoning challenges designed to test your diagnostic skills 
          and clinical decision-making through progressive questioning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(complexCases) && complexCases.map((complexCase: any) => (
          <Card key={complexCase.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{complexCase.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {complexCase.bodyPart || 'General'}
                    </Badge>
                    <Badge 
                      variant={complexCase.difficulty === 'advanced' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {complexCase.difficulty || 'Intermediate'}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="text-sm line-clamp-3">
                {complexCase.patientDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {complexCase.estimatedTime} minutes
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Brain className="h-4 w-4 mr-2" />
                  {complexCase.stages?.length || 3} stages
                </div>
                <Button 
                  onClick={() => handleStartCase(complexCase.id)}
                  className="w-full"
                  variant="default"
                >
                  Start Case Study
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!Array.isArray(complexCases) || complexCases.length === 0) && (
        <Card className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Complex Cases Available</h3>
          <p className="text-muted-foreground mb-4">
            Complex cases are being set up. Please check back soon or contact support.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function CompetitionPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user stats and achievements  
  const { data: achievements } = useQuery({
    queryKey: ['/api/achievements']
  });

  const { data: userHistory } = useQuery({
    queryKey: ['/api/competitions/user/history']
  });

  const { data: topPerformers } = useQuery({
    queryKey: ['/api/leaderboards/top-performers']
  });

  // Fetch active complex case competitions for overview
  const { data: activeComplexCompetitions } = useQuery({
    queryKey: ['/api/complex-competitions/active']
  });

  const completedCompetitions = Array.isArray(userHistory) ? userHistory.filter((h: any) => h.completedAt)?.length || 0 : 0;
  const totalAchievements = Array.isArray(achievements) ? achievements.filter((a: any) => a.completed)?.length || 0 : 0;
  const averageScore = Array.isArray(userHistory) && userHistory.length > 0 
    ? Math.round(userHistory.reduce((sum: number, h: any) => sum + (h.totalScore || 0), 0) / userHistory.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Clinical Reasoning Arena
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test your physiotherapy expertise against colleagues worldwide. 
            Compete in daily challenges, tournaments, and specialty leagues.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4 text-center">
              <Medal className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{completedCompetitions}</div>
              <div className="text-sm text-yellow-600">Competitions</div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">{totalAchievements}</div>
              <div className="text-sm text-purple-600">Achievements</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{averageScore}</div>
              <div className="text-sm text-green-600">Average Score</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {Array.isArray(userHistory) && userHistory.length > 0 ? (userHistory as any[])[0]?.rank || "—" : "—"}
              </div>
              <div className="text-sm text-blue-600">Best Rank</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-fit lg:grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="game-competitions" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Elite Games
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Sword className="h-4 w-4" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="complex-cases" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Practice Case Studies
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Challenge
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Leaderboards
            </TabsTrigger>

          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Challenge Preview */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Today's Challenge
                  </CardTitle>
                  <CardDescription>
                    Fresh clinical case every day - test your diagnostic skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyChallengeCard 
                    preview={true} 
                    onStartChallenge={() => setActiveTab("daily")}
                  />
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>This week's leaders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(topPerformers) && topPerformers.slice(0, 5).map((performer: any, index: number) => (
                    <div key={performer.userId} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{performer.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(performer.averageScore)} avg score
                        </div>
                      </div>
                      {index < 3 && (
                        <Medal className={`h-4 w-4 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-500' :
                          'text-orange-500'
                        }`} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Elite Clinical Competitions */}
            <Card className="mb-6 border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Elite Clinical Competitions
                </CardTitle>
                <CardDescription>
                  New competition format: 6 specialized challenges limited to 10 participants each
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer" 
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="font-semibold text-red-700">Red Flag Detective</div>
                      <div className="text-xs text-red-600">Spot dangerous conditions</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="font-semibold text-blue-700">Differential Race</div>
                      <div className="text-xs text-blue-600">Generate differential lists</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-yellow-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="font-semibold text-yellow-700">Pattern Recognition</div>
                      <div className="text-xs text-yellow-600">Instant clinical presentations</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Heart className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="font-semibold text-purple-700">Emergency Triage</div>
                      <div className="text-xs text-purple-600">Multi-patient decisions</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-green-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="font-semibold text-green-700">Manual Therapy</div>
                      <div className="text-xs text-green-600">Optimal technique selection</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-indigo-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                      <div className="font-semibold text-indigo-700">Exercise Prescription</div>
                      <div className="text-xs text-indigo-600">Evidence-based programs</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-orange-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("game-competitions")}>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <div className="font-semibold text-orange-700">Diagnosis Duel</div>
                      <div className="text-xs text-orange-600">10 cases in 60 seconds</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-4 text-center">
                  <Button 
                    onClick={() => setActiveTab("game-competitions")}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    View All Elite Competitions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>








          </TabsContent>

          {/* Game Competitions Tab */}
          <TabsContent value="game-competitions">
            <GameCompetitionsView />
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Sword className="h-8 w-8 text-orange-600" />
                <h2 className="text-3xl font-bold">Diagnosis Duel Tournaments</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real-time 1v1 elimination brackets. Face off against other clinicians in rapid diagnostic challenges with progressive difficulty rounds.
              </p>
            </div>

            <Tabs defaultValue="tournaments" className="w-full">
              <TabsList className={`grid w-full ${user && ["Fateofjustice"].includes(user.username) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <TabsTrigger value="tournaments" className="flex items-center gap-2">
                  <Sword className="h-4 w-4" />
                  Active Tournaments ({tournaments?.length || 0})
                </TabsTrigger>
                {user && ["Fateofjustice"].includes(user.username) && (
                  <TabsTrigger value="admin-all-content" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Admin - All Content ✓
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Active Tournaments Tab */}
              <TabsContent value="tournaments" className="space-y-6">
                {loadingTournaments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading tournaments...</p>
                  </div>
                ) : tournaments.length === 0 ? (
                  <div className="text-center py-12">
                    <Sword className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Active Tournaments</h3>
                    <p className="text-muted-foreground">
                      New tournaments will be scheduled soon. Check back later!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map((tournament: Tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Admin Content Tab */}
              {user && ["Fateofjustice"].includes(user.username) && (
                <TabsContent value="admin-all-content" className="space-y-4">
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
                      {loadingAdminContent ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-2"></div>
                          Loading tournament content...
                        </div>
                      ) : adminTournamentContent && adminTournamentContent.length > 0 ? (
                        <div className="space-y-6">
                          {adminTournamentContent.map((tournament: any) => (
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
                                    {tournament.content.lightning_diagnosis.rounds.map((round: any, roundIndex: number) => (
                                      <div key={roundIndex} className="border rounded-lg p-4">
                                        <h4 className="font-semibold mb-3 text-lg">
                                          Round {roundIndex + 1}: {round.name} ({round.questions?.length || 0} questions)
                                        </h4>
                                        <div className="grid gap-3">
                                          {round.questions?.map((question: any, qIndex: number) => (
                                            <div key={qIndex} className="border-l-2 border-gray-200 pl-3">
                                              <p className="font-medium">Q{qIndex + 1}: {question.scenario}</p>
                                              <p className="text-sm text-green-600 mt-1">
                                                <strong>Answer:</strong> {question.correctDiagnosis}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No tournament content available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>

          {/* Complex Cases Tab */}
          <TabsContent value="complex-cases">
            <ComplexCasesView />
          </TabsContent>

          {/* Daily Challenge Tab */}
          <TabsContent value="daily">
            <DailyChallengeCard />
          </TabsContent>



          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards">
            <LeaderboardView />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}