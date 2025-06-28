import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Star, Zap, Target, Brain, Crown, Flame } from "lucide-react";

const getAchievementIcon = (type: string) => {
  const icons: Record<string, any> = {
    speed_demon: Zap,
    accuracy_master: Target,
    streak_keeper: Flame,
    differential_expert: Brain,
    treatment_guru: Award,
    case_crusher: Trophy,
    specialty_champion: Crown,
    quick_thinker: Zap,
    research_master: Star
  };
  const IconComponent = icons[type] || Award;
  return <IconComponent className="h-6 w-6" />;
};

export default function AchievementsPanel() {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['/api/achievements']
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const completedAchievements = achievements?.filter((a: any) => a.completed) || [];
  const inProgressAchievements = achievements?.filter((a: any) => !a.completed) || [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Your Achievements</h3>
        <p className="text-muted-foreground">
          {completedAchievements.length} of {achievements?.length || 0} achievements unlocked
        </p>
      </div>

      {/* Completed Achievements */}
      {completedAchievements.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Unlocked Achievements ({completedAchievements.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedAchievements.map((achievement: any) => (
              <Card key={achievement.id} className="border-2 border-yellow-200 bg-yellow-50/30">
                <CardContent className="p-4 text-center">
                  <div className="text-yellow-600 mb-3 flex justify-center">
                    {getAchievementIcon(achievement.achievementType)}
                  </div>
                  <h5 className="font-semibold mb-1">{achievement.title}</h5>
                  <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    Completed
                  </Badge>
                  {achievement.completedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(achievement.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Achievements */}
      {inProgressAchievements.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            In Progress ({inProgressAchievements.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressAchievements.map((achievement: any) => (
              <Card key={achievement.id} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-gray-400 mt-1">
                      {getAchievementIcon(achievement.achievementType)}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold mb-1">{achievement.title}</h5>
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{achievement.progress} / {achievement.target}</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.target) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Achievements Yet */}
      {(!achievements || achievements.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
            <p className="text-muted-foreground">
              Start competing to unlock your first achievement!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}