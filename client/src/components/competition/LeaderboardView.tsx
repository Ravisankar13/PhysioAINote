import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, Trophy, Crown, Target, Zap } from "lucide-react";

export default function LeaderboardView() {
  const [category, setCategory] = useState("overall");
  const [timeframe, setTimeframe] = useState("weekly");

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: [`/api/leaderboards/${category}/${timeframe}`]
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-500" />;
      default:
        return <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</div>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Global Leaderboards</h3>
          <p className="text-muted-foreground">See how you rank against other physiotherapists</p>
        </div>
        <div className="flex gap-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Overall</SelectItem>
              <SelectItem value="speed">Speed</SelectItem>
              <SelectItem value="accuracy">Accuracy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {category === 'speed' ? <Zap className="h-5 w-5" /> : 
             category === 'accuracy' ? <Target className="h-5 w-5" /> : 
             <Trophy className="h-5 w-5" />}
            {category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard
          </CardTitle>
          <CardDescription>
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1).replace('_', ' ')} rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rankings available for this category and timeframe.
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry: any, index: number) => (
                <div 
                  key={entry.id} 
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 
                    'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium">{entry.username || entry.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.gamesPlayed} games played
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="text-lg font-bold">{entry.score}</div>
                    {entry.averageScore && (
                      <div className="text-xs text-muted-foreground">
                        Avg: {Math.round(entry.averageScore)}
                      </div>
                    )}
                  </div>
                  
                  {entry.winStreak > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {entry.winStreak} streak
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}