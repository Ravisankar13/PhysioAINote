import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  Target,
  Brain,
  Timer,
  Calendar
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
  
  const { data: activeCompetitions, isLoading: loadingActive } = useQuery({
    queryKey: ['/api/competitions/active']
  });

  const { data: upcomingCompetitions, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['/api/competitions/upcoming']
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
        const targetUrl = `/competitions/${competitionId}`;
        console.log('Setting location to:', targetUrl);
        window.location.href = targetUrl;
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

  const getCompetitionIcon = (type: string) => {
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

  const getTypeColor = (type: string) => {
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

  if (loadingActive || loadingUpcoming) {
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

  return (
    <div className="space-y-6">
      
      {/* Active Competitions */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Active Competitions
        </h3>
        
        {!activeCompetitions || !Array.isArray(activeCompetitions) || activeCompetitions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No active competitions at the moment. Check back soon or join upcoming competitions!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {activeCompetitions.map((competition: any) => (
              <Card key={competition.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <span className={getTypeColor(competition.type)}>
                          {getCompetitionIcon(competition.type)}
                        </span>
                        {competition.title}
                      </CardTitle>
                      <CardDescription>{competition.description}</CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTimeRemaining(competition.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.maxParticipants || 'Unlimited'} max</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.timeLimit ? `${competition.timeLimit} min` : 'No limit'}</span>
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
                      {competition.prizes && (
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
                          console.log('Join button clicked for competition:', competition.id);
                          joinCompetition.mutate(competition.id);
                        }}
                        disabled={joinCompetition.isPending}
                      >
                        {joinCompetition.isPending ? "Joining..." : "Join Competition"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Competitions */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Upcoming Competitions
        </h3>
        
        {!upcomingCompetitions || !Array.isArray(upcomingCompetitions) || upcomingCompetitions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No upcoming competitions scheduled. Stay tuned for new challenges!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {upcomingCompetitions.map((competition: any) => (
              <Card key={competition.id} className="hover:shadow-lg transition-shadow border-dashed">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <span className={getTypeColor(competition.type)}>
                          {getCompetitionIcon(competition.type)}
                        </span>
                        {competition.title}
                      </CardTitle>
                      <CardDescription>{competition.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      Upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Starts {new Date(competition.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.maxParticipants || 'Unlimited'} max</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.timeLimit ? `${competition.timeLimit} min` : 'No limit'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{competition.bodyPart || 'All Areas'}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize">
                        {competition.difficulty}
                      </Badge>
                      {competition.bodyPart && (
                        <Badge variant="outline" className="capitalize">
                          {competition.bodyPart || 'All Areas'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">
                        Set Reminder
                      </Button>
                      <Button size="sm" disabled>
                        Register Interest
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Create Competition */}
      <Card className="border-dashed border-2">
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Own Competition</h3>
          <p className="text-muted-foreground mb-4">
            Challenge your colleagues with custom case studies and competitions
          </p>
          <Button variant="outline">
            Create Competition
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}