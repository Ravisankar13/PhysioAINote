import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Clock, 
  Target, 
  Brain,
  Users,
  Star,
  ArrowLeft,
  Play,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function CompetitionParticipationPage() {
  const { id } = useParams();
  const competitionId = parseInt(id as string);
  const [activeCase, setActiveCase] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch competition details
  const { data: competition, isLoading: loadingCompetition } = useQuery({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId
  });

  // Fetch user's participation status
  const { data: participation, isLoading: loadingParticipation } = useQuery({
    queryKey: [`/api/competitions/${competitionId}/participation`],
    enabled: !!competitionId
  });

  // Fetch case studies for this competition
  const { data: caseStudies, isLoading: loadingCases } = useQuery({
    queryKey: [`/api/competitions/${competitionId}/cases`],
    enabled: !!competitionId
  });

  // Start case study mutation
  const startCase = useMutation({
    mutationFn: async (caseId: number) => {
      const response = await apiRequest('POST', `/api/competitions/${competitionId}/cases/${caseId}/start`);
      return response.json();
    },
    onSuccess: (data, caseId) => {
      setActiveCase(caseId);
      toast({
        title: "Case Started",
        description: "Good luck with your diagnosis!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingCompetition || loadingParticipation || loadingCases) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // Type guards for data
  const competitionData = competition as any;
  const participationData = participation as any;
  const caseStudiesData = (caseStudies as any) || [];

  if (!competition || !participation) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Competition Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This competition doesn't exist or you haven't joined it yet.
            </p>
            <Link href="/competitions">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Competitions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCases = participationData?.caseAttempts?.length || 0;
  const totalCases = caseStudiesData?.length || 0;
  const progressPercentage = totalCases > 0 ? (completedCases / totalCases) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/competitions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competitions
          </Button>
        </Link>
        <Badge variant={competitionData?.status === 'active' ? 'default' : 'secondary'}>
          {competitionData?.status}
        </Badge>
      </div>

      {/* Competition Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                {competitionData?.title}
              </CardTitle>
              <CardDescription>{competitionData?.description}</CardDescription>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {competitionData?.maxParticipants} participants
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {competitionData?.timeLimitMinutes} min limit
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{completedCases}/{totalCases} cases completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{participation.totalScore || 0}</div>
                <div className="text-sm text-muted-foreground">Current Score</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{participation.rank || "—"}</div>
                <div className="text-sm text-muted-foreground">Current Rank</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Math.floor((participation.timeSpent || 0) / 60)}</div>
                <div className="text-sm text-muted-foreground">Time (min)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Studies */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Competition Cases</h3>
        
        {!caseStudies || caseStudies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cases Available</h3>
              <p className="text-muted-foreground">
                Cases for this competition are being prepared.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {caseStudies.map((caseStudy: any, index: number) => {
              const isCompleted = participation.caseAttempts?.some((attempt: any) => attempt.caseStudyId === caseStudy.id);
              const isActive = activeCase === caseStudy.id;
              
              return (
                <Card key={caseStudy.id} className={isActive ? "border-blue-500 bg-blue-50/50" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold">{caseStudy.title}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {caseStudy.bodyPart}
                            </Badge>
                            <Badge variant={caseStudy.complexity === 'beginner' ? 'secondary' : 
                                          caseStudy.complexity === 'intermediate' ? 'default' : 'destructive'}>
                              {caseStudy.complexity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => startCase.mutate(caseStudy.id)}
                            disabled={startCase.isPending || isActive}
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {isActive ? "Active" : "Start Case"}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {isActive && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Patient Description:</strong> {caseStudy.patientDescription}
                        </p>
                        <div className="mt-3">
                          <Link href={`/competitions/${competitionId}/cases/${caseStudy.id}`}>
                            <Button size="sm">
                              <Target className="h-4 w-4 mr-2" />
                              Begin Diagnosis
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}