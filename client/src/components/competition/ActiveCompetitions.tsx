import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  Target,
  Brain,
  Timer,
  Search,
  FileText,
  Stethoscope,
  Activity
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function ActiveCompetitions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: activeCompetitions, isLoading: loadingActive } = useQuery({
    queryKey: ['/api/competitions/active']
  });

  const { data: upcomingCompetitions, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['/api/competitions/upcoming']
  });

  // Fetch game competitions
  const { data: gameCompetitions, isLoading: loadingGames } = useQuery({
    queryKey: ['/api/game-competitions']
  });

  // Join competition mutation
  const joinCompetition = useMutation({
    mutationFn: async (competitionId: number) => {
      console.log('Making API request to join competition:', competitionId);
      const response = await apiRequest('POST', `/api/competitions/${competitionId}/join`);
      const data = await response.json();
      console.log('Join competition response:', data);
      return data;
    },
    onSuccess: (data, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions/upcoming'] });
      
      if (data.alreadyJoined) {
        toast({
          title: "Already Participating",
          description: "Taking you to the competition dashboard...",
        });
      } else {
        toast({
          title: "Joined Competition!",
          description: "Taking you to the competition dashboard...",
        });
      }
      
      // Navigate to competition participation page
      console.log('Navigating to competition:', competitionId);
      setTimeout(() => {
        const targetUrl = `/competition/${competitionId}`;
        console.log('Navigating to:', targetUrl);
        setLocation(targetUrl);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Join Failed",
        description: error.message || "Failed to join competition",
        variant: "destructive",
      });
    },
  });

  const getCompetitionIcon = (type: string, gameType?: string) => {
    // Handle game competition types
    if (gameType) {
      switch (gameType) {
        case 'Lightning Diagnosis':
          return <Zap className="h-5 w-5" />;
        case 'Progressive Diagnostic Challenge':
          return <Search className="h-5 w-5" />;
        case 'Treatment Speed Run':
          return <FileText className="h-5 w-5" />;
        default:
          return <Activity className="h-5 w-5" />;
      }
    }
    
    // Handle traditional competition types
    switch (type) {
      case 'speed_challenge':
        return <Zap className="h-5 w-5" />;
      case 'accuracy_contest':
        return <Target className="h-5 w-5" />;
      case 'differential_race':
        return <Brain className="h-5 w-5" />;
      case 'tournament':
        return <Trophy className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string, gameType?: string) => {
    // Handle game competition types
    if (gameType) {
      switch (gameType) {
        case 'Lightning Diagnosis':
          return 'text-yellow-600';
        case 'Progressive Diagnostic Challenge':
          return 'text-blue-600';
        case 'Treatment Speed Run':
          return 'text-green-600';
        default:
          return 'text-purple-600';
      }
    }
    
    // Handle traditional competition types
    switch (type) {
      case 'speed_challenge':
        return 'text-green-600';
      case 'accuracy_contest':
        return 'text-purple-600';
      case 'differential_race':
        return 'text-blue-600';
      case 'tournament':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getGameTypeDescription = (gameType: string) => {
    switch (gameType) {
      case 'Lightning Diagnosis':
        return '30-second rapid diagnosis challenges';
      case 'Progressive Diagnostic Challenge':
        return '5-minute clinical detective work';
      case 'Treatment Speed Run':
        return 'Comprehensive treatment planning';
      default:
        return 'Clinical challenge';
    }
  };

  const getGameTimeLimitDisplay = (gameType: string, timeLimitMinutes?: number) => {
    if (timeLimitMinutes) {
      return `${timeLimitMinutes} min`;
    }
    
    switch (gameType) {
      case 'Lightning Diagnosis':
        return '30 sec per question';
      case 'Progressive Diagnostic Challenge':
        return '5 min';
      case 'Treatment Speed Run':
        return '10 min';
      default:
        return 'Varies';
    }
  };

  // Safely get competition arrays
  const safeActiveCompetitions = Array.isArray(activeCompetitions) ? activeCompetitions : [];
  const safeUpcomingCompetitions = Array.isArray(upcomingCompetitions) ? upcomingCompetitions : [];
  const safeGameCompetitions = Array.isArray(gameCompetitions) ? gameCompetitions : [];

  if (loadingActive || loadingUpcoming || loadingGames) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render competition card for both traditional and game competitions
  const renderCompetitionCard = (competition: any, isGame: boolean = false) => {
    const gameType = isGame ? competition.gameType : null;
    const isTraditionalActive = !isGame && competition.status === 'active';
    const isUpcoming = !isGame && competition.status === 'upcoming';
    
    return (
      <Card key={competition.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <span className={getTypeColor(competition.type, gameType)}>
                  {getCompetitionIcon(competition.type, gameType)}
                </span>
                {competition.title}
              </CardTitle>
              <CardDescription>
                {isGame ? getGameTypeDescription(gameType) : competition.description}
              </CardDescription>
            </div>
            <Badge 
              variant={isTraditionalActive ? "default" : isUpcoming ? "secondary" : "outline"}
              className={isTraditionalActive ? "bg-green-100 text-green-700" : ""}
            >
              {isGame ? 'Game Challenge' : isTraditionalActive ? 'Active' : 'Upcoming'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {!isGame && competition.endTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTimeRemaining(competition.endTime)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{competition.maxParticipants || 'Unlimited'} max</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span>
                {isGame 
                  ? getGameTimeLimitDisplay(gameType, competition.timeLimitMinutes)
                  : competition.timeLimit ? `${competition.timeLimit} min` : 'No limit'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{competition.bodyPart || 'All'}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="capitalize">
                {competition.difficulty}
              </Badge>
              {isGame && (
                <Badge variant="secondary">
                  {gameType}
                </Badge>
              )}
              {!isGame && competition.prizes && (
                <Badge variant="secondary">
                  Prizes Available
                </Badge>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm">
                View Details
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  if (isGame) {
                    setLocation(`/game-competition/${competition.id}`);
                  } else {
                    joinCompetition.mutate(competition.id);
                  }
                }}
                disabled={!isGame && joinCompetition.isPending}
              >
                {!isGame && joinCompetition.isPending ? "Joining..." : isGame ? "Start Challenge" : "Join Competition"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Active Competitions
        </h3>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              All Challenges
            </TabsTrigger>
            <TabsTrigger value="traditional" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Traditional
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Games
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {safeActiveCompetitions.length === 0 && safeUpcomingCompetitions.length === 0 && safeGameCompetitions.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No competitions available at the moment. Check back soon for new challenges!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {/* Traditional Competitions */}
                {safeActiveCompetitions.map((comp: any) => renderCompetitionCard(comp, false))}
                {safeUpcomingCompetitions.map((comp: any) => renderCompetitionCard(comp, false))}
                
                {/* Game Competitions */}
                {safeGameCompetitions.map((comp: any) => renderCompetitionCard(comp, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="traditional" className="mt-6">
            {safeActiveCompetitions.length === 0 && safeUpcomingCompetitions.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No traditional competitions at the moment. Check back soon for new challenges!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {safeActiveCompetitions.map((comp: any) => renderCompetitionCard(comp, false))}
                {safeUpcomingCompetitions.map((comp: any) => renderCompetitionCard(comp, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="games" className="mt-6">
            {safeGameCompetitions.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No game challenges available at the moment. Game challenges include Lightning Diagnosis, Progressive Diagnostic Challenge, and Treatment Speed Run!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {safeGameCompetitions.map((comp: any) => renderCompetitionCard(comp, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}