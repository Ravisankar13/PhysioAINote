import { useQuery } from "@tanstack/react-query";
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

export default function ActiveCompetitions() {
  
  const { data: activeCompetitions, isLoading: loadingActive } = useQuery({
    queryKey: ['/api/competitions/active']
  });

  const { data: upcomingCompetitions, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['/api/competitions/upcoming']
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
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
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
        
        {!activeCompetitions || activeCompetitions.length === 0 ? (
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
                      <span>{competition.maxParticipants} max</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.timeLimit} min</span>
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
                      <Button size="sm">
                        Join Competition
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
        
        {!upcomingCompetitions || upcomingCompetitions.length === 0 ? (
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
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(competition.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(competition.startTime).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.maxParticipants} max</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span>{competition.timeLimit} min</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize">
                        {competition.difficulty}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {competition.bodyPart || 'All Areas'}
                      </Badge>
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