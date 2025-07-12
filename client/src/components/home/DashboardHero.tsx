import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  TrendingUp, 
  Calendar,
  Play,
  Target,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tournament {
  id: number;
  title: string;
  status: string;
  participantCount: number;
  maxParticipants: number;
  startTime: string;
  endTime: string;
}

interface Competition {
  id: number;
  title: string;
  gameType: string;
  bodyPart: string;
  difficulty: string;
  participantCount: number;
  timeLimit: number;
  status: string;
  endTime: string;
}

const DashboardHero = () => {
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: competitions = [] } = useQuery<Competition[]>({
    queryKey: ["/api/game-competitions"],
  });

  // Get today's active competition
  const todaysCompetition = competitions.find(comp => comp.status === 'active');
  
  // Get next upcoming tournament
  const upcomingTournament = tournaments.find(t => t.status === 'registration_open' || t.status === 'waiting_for_players');

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <section className="bg-gradient-to-br from-primary/90 to-secondary text-white py-12 md:py-20 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiAwaDZ2LTZoLTZ2NnptLTYtNnY2aC02di02aDZ6bS02IDBoLTZ2LTZoNnY2em0tNi02di02aC02djZoNnptLTYgMGgtNnY2aDZ2LTZ6bTM2LTZoLTZ2Nmg2di02em0tNiAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Main Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            <span>Your Clinical Command Center</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            PhysioGPT Platform
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            AI-powered physiotherapy tools for enhanced clinical practice, real-time competitions, and evidence-based care
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Today's Challenge */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Today's Challenge
                </CardTitle>
                {todaysCompetition && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-100 border-green-400/30">
                    Live
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {todaysCompetition ? (
                <div className="space-y-3">
                  <h3 className="font-medium">{todaysCompetition.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {todaysCompetition.participantCount} participants
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeRemaining(todaysCompetition.endTime)} left
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/30 text-white text-xs">
                      {todaysCompetition.gameType}
                    </Badge>
                    <Badge variant="outline" className="border-white/30 text-white text-xs">
                      {todaysCompetition.bodyPart}
                    </Badge>
                  </div>
                  <Link href={`/competition/${todaysCompetition.id}`}>
                    <Button variant="secondary" size="sm" className="w-full mt-3">
                      <Play className="h-4 w-4 mr-2" />
                      Join Challenge
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/80 mb-3">No active challenges today</p>
                  <Link href="/competitions">
                    <Button variant="secondary" size="sm">
                      View All Competitions
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tournament */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Next Tournament
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTournament ? (
                <div className="space-y-3">
                  <h3 className="font-medium">{upcomingTournament.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {upcomingTournament.participantCount}/{upcomingTournament.maxParticipants}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Starting soon
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/30 text-white text-xs">
                    Elimination Bracket
                  </Badge>
                  <Link href="/competitions">
                    <Button variant="secondary" size="sm" className="w-full mt-3">
                      <Trophy className="h-4 w-4 mr-2" />
                      Register Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/80 mb-3">Check back for upcoming tournaments</p>
                  <Link href="/competitions">
                    <Button variant="secondary" size="sm">
                      View Tournaments
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Platform Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80">Active Competitions</span>
                  <span className="font-semibold">{competitions.filter(c => c.status === 'active').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80">Live Tournaments</span>
                  <span className="font-semibold">{tournaments.filter(t => t.status !== 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80">Total Participants</span>
                  <span className="font-semibold">
                    {competitions.reduce((total, comp) => total + comp.participantCount, 0) + 
                     tournaments.reduce((total, tour) => total + tour.participantCount, 0)}
                  </span>
                </div>
                <Link href="/competitions">
                  <Button variant="secondary" size="sm" className="w-full mt-3">
                    View Leaderboards
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/soap-notes">
            <Button variant="secondary" className="w-full h-12">
              Start SOAP Note
            </Button>
          </Link>
          <Link href="/motion-capture">
            <Button variant="secondary" className="w-full h-12">
              Motion Capture
            </Button>
          </Link>
          <Link href="/physiogpt">
            <Button variant="secondary" className="w-full h-12">
              Ask PhysioGPT
            </Button>
          </Link>
          <Link href="/competitions">
            <Button variant="secondary" className="w-full h-12">
              Join Competition
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;