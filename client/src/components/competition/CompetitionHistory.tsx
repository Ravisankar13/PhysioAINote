import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Target, Calendar } from "lucide-react";

interface CompetitionHistoryProps {
  limit?: number;
}

export default function CompetitionHistory({ limit }: CompetitionHistoryProps) {
  const { data: userHistory, isLoading } = useQuery({
    queryKey: ['/api/competitions/user/history']
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border rounded">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!userHistory || userHistory.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No competition history yet</p>
        </CardContent>
      </Card>
    );
  }

  const displayHistory = limit ? userHistory.slice(0, limit) : userHistory;

  return (
    <div className="space-y-3">
      {displayHistory.map((entry: any) => (
        <div key={entry.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Competition #{entry.competitionId}</h4>
                {entry.rank <= 3 && (
                  <Badge variant={entry.rank === 1 ? "default" : "secondary"}>
                    #{entry.rank}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(entry.joinedAt).toLocaleDateString()}
                </div>
                {entry.timeSpent && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(entry.timeSpent / 60)}m
                  </div>
                )}
                {entry.totalScore && (
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {entry.totalScore} pts
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{entry.totalScore || 0}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}