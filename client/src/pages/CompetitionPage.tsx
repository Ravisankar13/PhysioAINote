import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  Crown,
  GraduationCap
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import DailyChallengeCard from "@/components/competition/DailyChallengeCard";
import ActiveCompetitions from "@/components/competition/ActiveCompetitions";
import LeaderboardView from "@/components/competition/LeaderboardView";
import AchievementsPanel from "@/components/competition/AchievementsPanel";
import CompetitionHistory from "@/components/competition/CompetitionHistory";

// ComplexCasesView component
function ComplexCasesView() {
  const [, setLocation] = useLocation();
  const { data: complexCases, isLoading } = useQuery({
    queryKey: ['/api/complex-cases']
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleStartCase = (caseId: number) => {
    setLocation(`/competition/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Complex Clinical Cases</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Advanced multi-stage clinical reasoning challenges designed to test your diagnostic skills 
          and clinical decision-making through progressive questioning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complexCases?.map((complexCase: any) => (
          <Card key={complexCase.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{complexCase.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {complexCase.bodyPart || 'General'}
                    </Badge>
                    <Badge 
                      variant={complexCase.difficulty === 'advanced' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {complexCase.difficulty || 'Intermediate'}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="text-sm line-clamp-3">
                {complexCase.patientDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {complexCase.estimatedTime} minutes
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Brain className="h-4 w-4 mr-2" />
                  {complexCase.stages?.length || 3} stages
                </div>
                <Button 
                  onClick={() => handleStartCase(complexCase.id)}
                  className="w-full"
                  variant="default"
                >
                  Start Case Study
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!complexCases || complexCases.length === 0) && (
        <Card className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Complex Cases Available</h3>
          <p className="text-muted-foreground mb-4">
            Complex cases are being set up. Please check back soon or contact support.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function CompetitionPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
          <TabsList className="grid w-full grid-cols-6 lg:w-fit lg:grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="complex-cases" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Complex Cases
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

            {/* Active Competitions Preview */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  Active Competitions
                </CardTitle>
                <CardDescription>
                  Join ongoing competitions and test your skills against other participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveCompetitions 
                  onJoinCompetition={(competitionId) => setLocation(`/competition/${competitionId}`)}
                  preview={true}
                />
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("competitions")}
                  >
                    View All Competitions
                  </Button>
                </div>
              </CardContent>
            </Card>



            {/* Complex Case Studies Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  Complex Case Studies
                </CardTitle>
                <CardDescription>
                  Multi-stage clinical reasoning challenges for advanced practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Complex case studies are integrated into our competition system. Navigate to the 
                    Competitions tab to join multi-stage clinical reasoning challenges.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab("competitions")}
                    className="w-full"
                  >
                    View Complex Case Competitions
                  </Button>
                </div>
              </CardContent>
            </Card>


          </TabsContent>

          {/* Complex Cases Tab */}
          <TabsContent value="complex-cases">
            <ComplexCasesView />
          </TabsContent>

          {/* Daily Challenge Tab */}
          <TabsContent value="daily">
            <DailyChallengeCard />
          </TabsContent>

          {/* Competitions Tab */}
          <TabsContent value="competitions">
            <ActiveCompetitions />
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