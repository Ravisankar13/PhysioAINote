import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Target, Zap, Users, TrendingUp } from 'lucide-react';

interface PatternRecognitionScore {
  rank: number;
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

export function PatternRecognitionLeaderboard() {
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<PatternRecognitionScore[]>({
    queryKey: ['/api/pattern-recognition/leaderboard'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PatternRecognitionStats>({
    queryKey: ['/api/pattern-recognition/stats'],
  });

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  if (leaderboardLoading || statsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Pattern Recognition Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Pattern Recognition Leaderboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top performers in rapid clinical pattern recognition
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Players
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Avg Score
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.averageScore}/100</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                Today
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.attemptsToday}</div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Top 10 Champions
          </h4>
          
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={`${entry.username}-${entry.rank}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    entry.rank <= 3 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(entry.rank)}
                    <div>
                      <div className="font-medium">{entry.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.completionDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <Badge 
                        variant={entry.score === 100 ? "default" : "secondary"}
                        className={entry.score === 100 ? "bg-green-600" : ""}
                      >
                        {entry.score}/100
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">score</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.timeTaken)}
                      </div>
                      <div className="text-xs text-muted-foreground">time</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        {entry.streakLength}
                      </div>
                      <div className="text-xs text-muted-foreground">streak</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No scores yet. Be the first to play!</p>
            </div>
          )}
        </div>

        {/* Challenge Call-to-Action */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            Ready to test your clinical pattern recognition skills?
          </p>
          <a 
            href="/game-competition/107" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Target className="h-4 w-4" />
            Play Pattern Recognition
          </a>
          <div className="mt-2">
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              100 Questions • 5 Minutes • Test Your Speed
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}