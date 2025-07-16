import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Trophy, Clock, ArrowRight } from "lucide-react";

interface LeaderboardEntry {
  rank: string;
  username: string;
  score: number;
  timeTaken: number;
  questionsCorrect: number;
  streakLength: number;
  completionDate: string;
}

interface PatternRecognitionStats {
  totalPlayers: number;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  attemptsToday: number;
}

const CompactPatternRecognitionLeaderboard = () => {
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/pattern-recognition/leaderboard'],
    staleTime: 1000 * 60 * 2 // 2 minutes
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PatternRecognitionStats>({
    queryKey: ['/api/pattern-recognition/stats'],
    staleTime: 1000 * 60 * 2 // 2 minutes
  });

  const isLoading = leaderboardLoading || statsLoading;

  if (isLoading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border-blue-100 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-gray-900">Pattern Recognition</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="w-8 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const topThree = leaderboard.slice(0, 3);

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-gray-900">Pattern Recognition</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
            Live Rankings
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.highestScore}</div>
              <div className="text-xs text-gray-600">Best Score</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.totalPlayers}</div>
              <div className="text-xs text-gray-600">Players</div>
            </div>
          </div>
        )}

        {/* Top 3 Rankings */}
        <div className="space-y-2">
          {topThree.length > 0 ? (
            topThree.map((entry, index) => (
              <div key={entry.rank} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {entry.rank}
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-16">
                    {entry.username}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  <span className="text-sm font-bold text-gray-900">{entry.score}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No players yet</p>
              <p className="text-xs text-gray-400">Be the first to compete!</p>
            </div>
          )}
        </div>

        {/* Challenge Call-to-Action */}
        <div className="text-center pt-3 border-t border-gray-100">
          <a 
            href="/game-competition/107" 
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium w-full justify-center"
          >
            <Target className="h-4 w-4" />
            Play Now
          </a>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
              100 Questions • 5 Min
            </Badge>
          </div>
          
          {/* Link to full leaderboard */}
          <div className="mt-2">
            <a 
              href="#pattern-recognition-leaderboard" 
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              View Full Rankings
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactPatternRecognitionLeaderboard;