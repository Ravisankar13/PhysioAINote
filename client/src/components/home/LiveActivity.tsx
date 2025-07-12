import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Trophy, 
  Users, 
  Clock,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: 'competition' | 'tournament' | 'motion_capture' | 'soap_note';
  title: string;
  user?: string;
  timestamp: string;
  status: string;
  metadata?: any;
}

const LiveActivity = () => {
  const { data: tournaments = [] } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: competitions = [] } = useQuery<any[]>({
    queryKey: ["/api/game-competitions"],
  });

  // Generate mock live activity based on real data
  const generateLiveActivity = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    
    // Add recent tournament activities
    tournaments.forEach(tournament => {
      if (tournament.participantCount > 0) {
        activities.push({
          id: `tournament-${tournament.id}`,
          type: 'tournament',
          title: `${tournament.participantCount} players joined ${tournament.title}`,
          timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          status: tournament.status,
          metadata: { participantCount: tournament.participantCount }
        });
      }
    });

    // Add recent competition activities
    competitions.forEach(competition => {
      if (competition.participantCount > 0) {
        activities.push({
          id: `competition-${competition.id}`,
          type: 'competition',
          title: `${competition.participantCount} participants in ${competition.gameType}`,
          timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
          status: competition.status,
          metadata: { gameType: competition.gameType, bodyPart: competition.bodyPart }
        });
      }
    });

    // Add some mock activities for motion capture and soap notes
    const mockActivities = [
      {
        id: 'motion-1',
        type: 'motion_capture' as const,
        title: 'Motion capture session completed',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        status: 'completed'
      },
      {
        id: 'soap-1',
        type: 'soap_note' as const,
        title: 'SOAP note generated with AI assistance',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        status: 'completed'
      },
      {
        id: 'motion-2',
        type: 'motion_capture' as const,
        title: 'Virtual patient created from movement data',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'completed'
      }
    ];

    activities.push(...mockActivities);

    // Sort by timestamp and return latest 8
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  };

  const liveActivities = generateLiveActivity();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'competition':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'motion_capture':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'soap_note':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'tournament' || type === 'competition') {
      switch (status) {
        case 'active':
        case 'in_progress':
          return <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">Live</Badge>;
        case 'registration_open':
        case 'waiting_for_players':
          return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200">Open</Badge>;
        default:
          return null;
      }
    }
    return null;
  };

  // Platform statistics
  const totalActiveCompetitions = competitions.filter(c => c.status === 'active').length;
  const totalActiveTournaments = tournaments.filter(t => t.status !== 'completed').length;
  const totalParticipants = competitions.reduce((sum, c) => sum + c.participantCount, 0) + 
                           tournaments.reduce((sum, t) => sum + t.participantCount, 0);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">{totalActiveCompetitions}</div>
              <div className="text-sm text-muted-foreground">Active Competitions</div>
            </CardContent>
          </Card>
          <Card className="text-center border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{totalActiveTournaments}</div>
              <div className="text-sm text-muted-foreground">Live Tournaments</div>
            </CardContent>
          </Card>
          <Card className="text-center border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 mb-2">{totalParticipants}</div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </CardContent>
          </Card>
        </div>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Live Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {liveActivities.length > 0 ? (
                liveActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                          {activity.metadata?.gameType && (
                            <Badge variant="outline" className="text-xs">
                              {activity.metadata.gameType}
                            </Badge>
                          )}
                          {activity.metadata?.bodyPart && (
                            <Badge variant="outline" className="text-xs">
                              {activity.metadata.bodyPart}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(activity.status, activity.type)}
                      <div className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity to display</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default LiveActivity;