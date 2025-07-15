import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Clock, Target } from "lucide-react";

interface LeaderboardEntry {
  username: string;
  user_id: number;
  total_competitions: number;
  avg_score: number;
  best_score: number;
  last_activity: string;
}

interface PlatformStats {
  totalUsers: number;
  totalCompetitions: number;
  totalSoapNotes: number;
  totalVirtualPatients: number;
}

const GlobalLeaderboard = () => {
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/home/global-leaderboard'],
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/home/platform-stats'],
    staleTime: 1000 * 60 * 10 // 10 minutes
  });

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-slate-500">#{position}</span>;
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Community Excellence</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See how you stack up against fellow physiotherapists and celebrate collective achievements
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Global Leaderboard */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Global Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="w-24 h-4 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-16 h-4 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div 
                        key={entry.user_id} 
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-slate-50 ${
                          index < 3 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(index + 1)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{entry.username}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>{entry.total_competitions} competitions</span>
                              <span>•</span>
                              <span>Best: {formatScore(entry.best_score)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-lg font-bold text-slate-800">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            {formatScore(entry.avg_score)}%
                          </div>
                          <p className="text-xs text-slate-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(entry.last_activity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No competition results yet</p>
                    <p className="text-sm">Be the first to compete!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Platform Statistics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-12 h-6 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : stats ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Active Users</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {stats.totalUsers.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Competitions</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {stats.totalCompetitions.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">SOAP Notes</span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {stats.totalSoapNotes.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Virtual Patients</span>
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        {stats.totalVirtualPatients.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">Stats unavailable</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-3">Ready to test your skills?</p>
                  <div className="grid gap-2">
                    <Badge variant="outline" className="py-2 cursor-pointer hover:bg-blue-50 transition-colors">
                      Join Live Competition
                    </Badge>
                    <Badge variant="outline" className="py-2 cursor-pointer hover:bg-purple-50 transition-colors">
                      Practice Mode
                    </Badge>
                    <Badge variant="outline" className="py-2 cursor-pointer hover:bg-green-50 transition-colors">
                      View Progress
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalLeaderboard;