import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Trophy, 
  Users, 
  Clock, 
  Calendar, 
  Target, 
  BookOpen,
  Timer,
  User,
  CheckCircle,
  ArrowRight,
  Play,
  Crown,
  AlertCircle,
  Settings,
  ChevronRight,
  Search,
  FileText,
  Brain,
  Clipboard,
  Send
} from 'lucide-react';

interface Competition {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  bodyPart: string;
  difficulty: string;
  timeLimit: number;
  maxParticipants: number;
  currentParticipants: number;
  registrationDeadline: string;
  startTime: string;
  endTime: string;
  complexCaseIds: number[];
  rules: {
    stageTimeLimit: number;
    showLeaderboard: boolean;
  };
}

interface Participant {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  totalScore: number;
  rank: number;
  timeSpent: number;
}

export default function ComplexCaseCompetitionsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch upcoming competitions
  const { data: upcomingCompetitions = [], isLoading: loadingUpcoming } = useQuery<Competition[]>({
    queryKey: ['/api/complex-competitions/upcoming'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch active competitions
  const { data: activeCompetitions = [], isLoading: loadingActive } = useQuery<Competition[]>({
    queryKey: ['/api/complex-competitions/active'],
    refetchInterval: 10000 // Refresh every 10 seconds for active competitions
  });

  // Fetch user's registered competitions
  const { data: myRegistrations = [], isLoading: loadingRegistrations, error: registrationError } = useQuery<Competition[]>({
    queryKey: ['/api/complex-competitions/my-registrations'],
    refetchInterval: 30000,
  });

  // Join competition mutation
  const joinCompetitionMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(`/api/complex-competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join competition');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Registration Successful!",
          description: data.message,
        });
        // Refresh competitions data
        queryClient.invalidateQueries({ queryKey: ['/api/complex-competitions'] });
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join competition. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Unregister from competition mutation
  const unregisterMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(`/api/complex-competitions/${competitionId}/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unregister from competition');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Unregistered Successfully!",
          description: data.message,
        });
        // Refresh competitions data
        queryClient.invalidateQueries({ queryKey: ['/api/complex-competitions'] });
      } else {
        toast({
          title: "Unregistration Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unregister from competition. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJoinCompetition = (competitionId: number) => {
    joinCompetitionMutation.mutate(competitionId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date <= now) return 'Started';
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const canJoinCompetition = (competition: Competition) => {
    const now = new Date();
    const registrationDeadline = new Date(competition.registrationDeadline);
    const isRegistrationOpen = now < registrationDeadline;
    const hasSpace = competition.currentParticipants < competition.maxParticipants;
    
    return isRegistrationOpen && hasSpace && competition.status === 'upcoming';
  };

  const CompetitionCard = ({ competition }: { competition: Competition }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{competition.title}</CardTitle>
            <CardDescription className="text-sm">
              {competition.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(competition.status)}>
              {competition.status}
            </Badge>
            <Badge className={getDifficultyColor(competition.difficulty)}>
              {competition.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Competition Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{competition.bodyPart}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span>{competition.timeLimit} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{competition.rules?.stageTimeLimit || 5} min/stage</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
          </div>
        </div>

        {/* Participant Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Participants</span>
            <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
          </div>
          <Progress 
            value={(competition.currentParticipants / competition.maxParticipants) * 100} 
            className="h-2"
          />
        </div>

        {/* Timing Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Starts: {format(new Date(competition.startTime), 'MMM d, yyyy - h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {competition.status === 'upcoming' 
                ? `Registration closes ${formatTimeRemaining(competition.registrationDeadline)}`
                : `Started ${formatTimeRemaining(competition.startTime)}`
              }
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {competition.status === 'upcoming' && (
          canJoinCompetition(competition) ? (
            <Button 
              onClick={() => handleJoinCompetition(competition.id)}
              disabled={joinCompetitionMutation.isPending}
              className="w-full"
            >
              {joinCompetitionMutation.isPending ? (
                "Joining..."
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Join Competition
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="w-full">
              {competition.currentParticipants >= competition.maxParticipants 
                ? "Competition Full" 
                : "Registration Closed"
              }
            </Button>
          )
        )}
        
        {competition.status === 'active' && (
          <Button className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Enter Competition
          </Button>
        )}

        {competition.status === 'completed' && (
          <Button variant="outline" className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            View Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Complex Case Competitions</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test your clinical reasoning skills in time-limited competitions featuring multi-stage complex cases. 
          Compete with fellow healthcare professionals and climb the leaderboards!
        </p>
      </div>

      {/* Competition Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${user?.username === 'Fateofjustice' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({upcomingCompetitions.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Live ({activeCompetitions.length})
          </TabsTrigger>
          <TabsTrigger value="my-registrations" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Registrations ({myRegistrations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          {user?.username === 'Fateofjustice' && (
            <TabsTrigger value="admin-preview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin Preview
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {loadingUpcoming ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading upcoming competitions...</p>
            </div>
          ) : upcomingCompetitions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Competitions</h3>
              <p className="text-muted-foreground">
                New competitions are scheduled regularly. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingCompetitions.map((competition: Competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {loadingActive ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading live competitions...</p>
            </div>
          ) : activeCompetitions.length === 0 ? (
            <div className="text-center py-12">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Live Competitions</h3>
              <p className="text-muted-foreground">
                Active competitions will appear here when they start.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCompetitions.map((competition: Competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-registrations" className="space-y-6">
          <div className="text-center py-12">
            {loadingRegistrations ? (
              <div>
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your registrations...</p>
              </div>
            ) : registrationError ? (
              <div>
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Error Loading Registrations</h3>
                <p className="text-muted-foreground">
                  Unable to load your competition registrations. Please try again.
                </p>
              </div>
            ) : (myRegistrations && myRegistrations.length > 0) ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">My Competition Registrations</h3>
                {myRegistrations.map((competition: Competition) => (
                  <CompetitionCard 
                    key={competition.id} 
                    competition={competition}
                  />
                ))}
              </div>
            ) : (
              <div>
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Registrations</h3>
                <p className="text-muted-foreground">
                  You haven't registered for any competitions yet. Check out the upcoming competitions to join one!
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="text-center py-12">
            <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Global Leaderboard</h3>
            <p className="text-muted-foreground">
              Competition leaderboards coming soon!
            </p>
          </div>
        </TabsContent>

        {user?.username === 'Fateofjustice' && (
          <TabsContent value="admin-preview" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Admin Competition Preview</h2>
                  <p className="text-muted-foreground">
                    Test and preview competition questions before they go live
                  </p>
                </div>
                <Badge variant="destructive" className="text-xs">
                  ADMIN ONLY
                </Badge>
              </div>

              {/* Competition Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Select Competition to Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {upcomingCompetitions.map((competition: Competition) => (
                      <div
                        key={competition.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedCompetition?.id === competition.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedCompetition(competition)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{competition.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {competition.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">
                                {competition.difficulty}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {competition.bodyPart}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {competition.timeLimit}min
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Competition Preview */}
              {selectedCompetition && (
                <AdminCompetitionPreview competition={selectedCompetition} />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Admin Competition Preview Component
function AdminCompetitionPreview({ competition }: { competition: Competition }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  // Fetch complex case details
  const { data: complexCase, isLoading } = useQuery({
    queryKey: ['/api/complex-cases', competition.complexCaseIds?.[0]],
    enabled: competition.complexCaseIds && competition.complexCaseIds.length > 0
  });

  console.log('Complex case data:', complexCase);
  console.log('Competition:', competition);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading case study...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!complexCase) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Case Study Found</h3>
            <p className="text-muted-foreground">
              This competition doesn't have an associated complex case study.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle the complex case service response structure
  const caseData = complexCase?.case || complexCase;
  const stages = complexCase?.stages || [];
  const currentStageData = stages[currentStage];

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentStage]: value
    }));
  };

  const nextStage = () => {
    if (currentStage < stages.length - 1) {
      setCurrentStage(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const prevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(prev => prev - 1);
    }
  };

  const resetPreview = () => {
    setCurrentStage(0);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Admin Preview Results
          </CardTitle>
          <CardDescription>
            Review the complete case study and provided answers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800">Case Study: {caseData?.title}</h4>
              <p className="text-green-700 mt-1">{caseData?.patientDescription}</p>
            </div>
            
            {stages.map((stage: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Stage {index + 1}</Badge>
                  <span className="font-medium">{stage.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{stage.content}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Your Answer:</p>
                    <div className="p-2 bg-gray-50 border rounded">
                      {answers[index] || 'No answer provided'}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Correct Answer:</p>
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      {stage.correctAnswer}
                    </div>
                  </div>
                </div>
                
                {stage.explanation && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{stage.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={resetPreview} variant="outline">
              <ArrowRight className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStageData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Stages Available</h3>
            <p className="text-muted-foreground">
              This case study doesn't have any stages configured.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              {caseData?.title}
            </CardTitle>
            <CardDescription>
              Stage {currentStage + 1} of {stages.length}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Admin Preview Mode
            </Badge>
            <Badge variant="outline">
              {competition.timeLimit}min
            </Badge>
          </div>
        </div>
        <Progress value={((currentStage + 1) / stages.length) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{currentStageData.title}</h3>
            <div className="p-4 bg-gray-50 border rounded-lg">
              <p className="text-sm whitespace-pre-line">{currentStageData.content}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Your Response:</label>
            <textarea
              value={answers[currentStage] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Enter your clinical reasoning and analysis..."
              className="w-full p-3 border rounded-lg min-h-[120px] resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              onClick={prevStage}
              disabled={currentStage === 0}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button onClick={resetPreview} variant="ghost" size="sm">
              Reset
            </Button>
          </div>
          
          <Button 
            onClick={nextStage}
            disabled={!answers[currentStage]?.trim()}
            className="flex items-center gap-2"
          >
            {currentStage === stages.length - 1 ? (
              <>
                <Send className="h-4 w-4" />
                View Results
              </>
            ) : (
              <>
                Next Stage
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}