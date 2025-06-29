import { useState } from "react";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Target, 
  Clock, 
  Users, 
  Star, 
  Zap, 
  Brain,
  Calendar,
  Award,
  TrendingUp,
  Medal,
  Crown
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import DailyChallengeCard from "@/components/competition/DailyChallengeCard";
import ActiveCompetitions from "@/components/competition/ActiveCompetitions";
import LeaderboardView from "@/components/competition/LeaderboardView";
import AchievementsPanel from "@/components/competition/AchievementsPanel";
import CompetitionHistory from "@/components/competition/CompetitionHistory";

export default function CompetitionPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Mutation to create complex competitions
  const createComplexCompetitionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/create-complex-competitions", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Created ${data.casesCreated} complex cases and ${data.competitionsCreated} competitions`,
      });
      // Refresh competitions data
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating competitions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch user stats and achievements
  const { data: achievements } = useQuery({
    queryKey: ['/api/achievements']
  });

  const { data: userHistory } = useQuery({
    queryKey: ['/api/competitions/user/history']
  });

  const { data: topPerformers } = useQuery({
    queryKey: ['/api/leaderboards/top-performers'],
    queryParams: { limit: 5 }
  });

  const completedCompetitions = userHistory?.filter(h => h.completedAt)?.length || 0;
  const totalAchievements = achievements?.filter(a => a.completed)?.length || 0;
  const averageScore = userHistory?.length > 0 
    ? Math.round(userHistory.reduce((sum, h) => sum + (h.totalScore || 0), 0) / userHistory.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Clinical Reasoning Arena
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test your physiotherapy expertise against colleagues worldwide. 
            Compete in daily challenges, tournaments, and specialty leagues.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4 text-center">
              <Medal className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{completedCompetitions}</div>
              <div className="text-sm text-yellow-600">Competitions</div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">{totalAchievements}</div>
              <div className="text-sm text-purple-600">Achievements</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{averageScore}</div>
              <div className="text-sm text-green-600">Average Score</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {userHistory?.[0]?.rank || "—"}
              </div>
              <div className="text-sm text-blue-600">Best Rank</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Challenge
            </TabsTrigger>
            <TabsTrigger value="competitions" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Competitions
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Challenge Preview */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Today's Challenge
                  </CardTitle>
                  <CardDescription>
                    Fresh clinical case every day - test your diagnostic skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyChallengeCard 
                    preview={true} 
                    onStartChallenge={() => setActiveTab("daily")}
                  />
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>This week's leaders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers?.slice(0, 5).map((performer, index) => (
                    <div key={performer.userId} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{performer.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(performer.averageScore)} avg score
                        </div>
                      </div>
                      {index < 3 && (
                        <Medal className={`h-4 w-4 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-500' :
                          'text-orange-500'
                        }`} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Multi-Stage Clinical Reasoning */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  Multi-Stage Clinical Reasoning
                </CardTitle>
                <CardDescription>
                  Comprehensive case studies with progressive stages - from initial assessment to treatment planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-indigo-200 bg-indigo-50/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-indigo-700">Complete Clinician</h4>
                          <p className="text-xs text-indigo-600">Full assessment to treatment</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>4 Stages</span>
                          <span>45-60 min</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                          onClick={() => setLocation('/complex-case/1')}
                        >
                          Start Case Study
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-emerald-200 bg-emerald-50/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <Target className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-emerald-700">Diagnostic Detective</h4>
                          <p className="text-xs text-emerald-600">Complex differential diagnosis</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>5 Stages</span>
                          <span>30-45 min</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => setLocation('/complex-case/2')}
                        >
                          Start Detective Case
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-700">How Multi-Stage Cases Work</h4>
                      <p className="text-sm text-blue-600">Progressive clinical reasoning through realistic scenarios</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="text-center p-2 bg-white/50 rounded">
                      <div className="font-medium text-blue-700">Stage 1</div>
                      <div className="text-blue-600">History & Assessment</div>
                    </div>
                    <div className="text-center p-2 bg-white/50 rounded">
                      <div className="font-medium text-green-700">Stage 2</div>
                      <div className="text-green-600">Physical Examination</div>
                    </div>
                    <div className="text-center p-2 bg-white/50 rounded">
                      <div className="font-medium text-purple-700">Stage 3</div>
                      <div className="text-purple-600">Diagnosis & Planning</div>
                    </div>
                    <div className="text-center p-2 bg-white/50 rounded">
                      <div className="font-medium text-orange-700">Stage 4</div>
                      <div className="text-orange-600">Patient Education</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/30">
                <CardContent className="p-6 text-center space-y-3">
                  <Zap className="h-10 w-10 text-green-600 mx-auto" />
                  <h3 className="font-semibold text-green-700">Speed Challenge</h3>
                  <p className="text-sm text-green-600">
                    Quick-fire diagnosis under time pressure
                  </p>
                  <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                    Start Challenge
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-purple-200 bg-purple-50/30">
                <CardContent className="p-6 text-center space-y-3">
                  <Brain className="h-10 w-10 text-purple-600 mx-auto" />
                  <h3 className="font-semibold text-purple-700">Accuracy Contest</h3>
                  <p className="text-sm text-purple-600">
                    Precision diagnosis competition
                  </p>
                  <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                    Join Contest
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-orange-200 bg-orange-50/30">
                <CardContent className="p-6 text-center space-y-3">
                  <Target className="h-10 w-10 text-orange-600 mx-auto" />
                  <h3 className="font-semibold text-orange-700">Specialty League</h3>
                  <p className="text-sm text-orange-600">
                    Body part specific competitions
                  </p>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    View Leagues
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Performance */}
            {userHistory && userHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Performance</CardTitle>
                  <CardDescription>Your last 5 competition results</CardDescription>
                </CardHeader>
                <CardContent>
                  <CompetitionHistory limit={5} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Daily Challenge Tab */}
          <TabsContent value="daily">
            <DailyChallengeCard />
          </TabsContent>

          {/* Competitions Tab */}
          <TabsContent value="competitions">
            <div className="space-y-6">
              {/* Create Complex Competitions Button */}
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-600" />
                    Multi-Stage Clinical Reasoning Competitions
                  </CardTitle>
                  <CardDescription>
                    Create advanced competitions with complex case studies based on 2024 research
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => createComplexCompetitionsMutation.mutate()}
                    disabled={createComplexCompetitionsMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {createComplexCompetitionsMutation.isPending 
                      ? "Creating..." 
                      : "Create 10 Advanced Complex Cases"}
                  </Button>
                </CardContent>
              </Card>
              
              <ActiveCompetitions />
            </div>
          </TabsContent>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards">
            <LeaderboardView />
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <AchievementsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}