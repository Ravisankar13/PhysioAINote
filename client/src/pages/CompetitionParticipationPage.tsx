import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import { Link } from "react-router-dom";

export default function CompetitionParticipationPage() {
  // Get ID from URL path directly as fallback
  const { id } = useParams();
  let competitionId = parseInt(id as string);
  
  // Fallback: extract ID from window location if useParams fails
  if (!competitionId || isNaN(competitionId)) {
    const pathParts = window.location.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 1];
    competitionId = parseInt(idFromPath);
  }
  
  const [activeCase, setActiveCase] = useState<number | null>(null);
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(null);
  const [diagnoses, setDiagnoses] = useState<Record<number, {
    diagnosis: string;
    treatment: string;
  }>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('Raw ID from URL:', id);
  console.log('Path parts:', window.location.pathname.split('/'));
  console.log('Final competition ID:', competitionId);
  console.log('Is valid ID?', !!competitionId && !isNaN(competitionId));

  // Fetch competition details
  const { data: competition, isLoading: loadingCompetition, error: competitionError } = useQuery({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId
  });

  // Fetch user's participation status
  const { data: participation, isLoading: loadingParticipation, error: participationError } = useQuery({
    queryKey: [`/api/competitions/${competitionId}/participation`],
    enabled: !!competitionId
  });

  // Fetch case studies for this competition
  const { data: caseStudies, isLoading: loadingCases, error: casesError } = useQuery({
    queryKey: [`/api/competitions/${competitionId}/cases`],
    enabled: !!competitionId
  });

  // Debug logging
  console.log('Competition ID:', competitionId);
  console.log('Query keys:', {
    competition: `/api/competitions/${competitionId}`,
    participation: `/api/competitions/${competitionId}/participation`,
    cases: `/api/competitions/${competitionId}/cases`
  });
  console.log('Competition data:', { competition, participation, caseStudies });
  console.log('Errors:', { competitionError, participationError, casesError });
  console.log('Loading states:', { loadingCompetition, loadingParticipation, loadingCases });

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

  // Handle diagnosis input changes
  const updateDiagnosis = (caseId: number, field: 'diagnosis' | 'treatment', value: string) => {
    setDiagnoses(prev => ({
      ...prev,
      [caseId]: {
        ...prev[caseId],
        [field]: value
      }
    }));
  };

  // Submit all diagnoses
  const submitAllDiagnoses = useMutation({
    mutationFn: async () => {
      console.log('[FRONTEND] Starting diagnosis submission...', diagnoses);
      
      const submissions = Object.entries(diagnoses).map(([caseId, data]) => ({
        caseStudyId: parseInt(caseId),
        userDiagnosis: data.diagnosis,
        userReasoning: data.treatment, // Using treatment as reasoning for simplicity
        assessmentTests: [],
        proposedTreatment: data.treatment,
        timeSpent: 300 // Default 5 minutes per case
      }));

      console.log('[FRONTEND] Submitting data:', submissions);

      const response = await apiRequest('POST', `/api/competitions/${competitionId}/submit-all`, {
        attempts: submissions
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[FRONTEND] Received response:', result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Diagnoses Submitted!",
        description: "Redirecting to AI review and scores...",
      });
      
      // Refresh the participation data and redirect to results
      queryClient.invalidateQueries({ queryKey: [`/api/competitions/${competitionId}/participation`] });
      
      // Store the results in sessionStorage for the results page
      sessionStorage.setItem('competitionResults', JSON.stringify(data));
      
      // Redirect to results page after a brief delay
      setTimeout(() => {
        window.location.assign(`/competitions/${competitionId}/results`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
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

  // Handle data safely
  if (!competition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Competition Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The competition you're looking for doesn't exist.
              </p>
              <Link to="/competitions">
                <Button>Back to Competitions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Type guards for data
  const competitionData = competition as any;
  const participationData = participation as any;
  const caseStudiesData = (caseStudies as any) || [];

  if (!competition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Competition Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This competition doesn't exist.
            </p>
            <Link to="/competitions">
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

  // If user hasn't joined yet, show join prompt
  if (participationData && participationData.isParticipating === false) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{competitionData?.title}</h2>
            <p className="text-muted-foreground mb-6">
              You need to join this competition to participate.
            </p>
            <div className="space-x-4">
              <Link to="/competitions">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Competitions
                </Button>
              </Link>
              <Link to="/competitions">
                <Button>
                  Join Competition
                </Button>
              </Link>
            </div>
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
        <Link to="/competitions">
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
                <div className="text-2xl font-bold text-blue-600">{participationData?.totalScore || 0}</div>
                <div className="text-sm text-muted-foreground">Current Score</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{participationData?.rank || "—"}</div>
                <div className="text-sm text-muted-foreground">Current Rank</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Math.floor((participationData?.timeSpent || 0) / 60)}</div>
                <div className="text-sm text-muted-foreground">Time (min)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Studies */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Competition Cases</h3>
        
        {!caseStudiesData || caseStudiesData.length === 0 ? (
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
            {caseStudiesData.map((caseStudy: any, index: number) => {
              const isCompleted = participationData?.caseAttempts?.some((attempt: any) => attempt.caseStudyId === caseStudy.id);
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
                            onClick={() => {
                              console.log('Start Case clicked for:', caseStudy.id);
                              console.log('Competition ID:', competitionId);
                              startCase.mutate(caseStudy.id);
                            }}
                            disabled={startCase.isPending || isActive}
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {startCase.isPending ? "Starting..." : isActive ? "Active" : "Start Case"}
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
                          <Button 
                            size="sm" 
                            onClick={() => {
                              console.log('Begin Diagnosis clicked for case:', caseStudy.id);
                              setExpandedDiagnosis(expandedDiagnosis === caseStudy.id ? null : caseStudy.id);
                            }}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            {expandedDiagnosis === caseStudy.id ? "Hide Diagnosis" : "Begin Diagnosis"}
                          </Button>
                        </div>
                        
                        {/* Expandable diagnosis form */}
                        {expandedDiagnosis === caseStudy.id && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Clinical Diagnosis
                                </label>
                                <textarea
                                  placeholder="Enter your primary diagnosis..."
                                  value={diagnoses[caseStudy.id]?.diagnosis || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDiagnosis(caseStudy.id, 'diagnosis', e.target.value)}
                                  rows={3}
                                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Treatment Plan
                                </label>
                                <textarea
                                  placeholder="Enter your treatment approach..."
                                  value={diagnoses[caseStudy.id]?.treatment || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDiagnosis(caseStudy.id, 'treatment', e.target.value)}
                                  rows={4}
                                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit All Diagnoses Button */}
      {Object.keys(diagnoses).length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ready to Submit?</h3>
                <p className="text-sm text-muted-foreground">
                  You have completed {Object.keys(diagnoses).length} diagnosis(es). 
                  AI will analyze your responses and provide detailed scoring.
                </p>
              </div>
              <Button
                onClick={() => submitAllDiagnoses.mutate()}
                disabled={submitAllDiagnoses.isPending}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {submitAllDiagnoses.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit All Diagnoses
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}