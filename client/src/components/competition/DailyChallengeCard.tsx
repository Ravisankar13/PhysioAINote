import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Trophy, 
  Users, 
  Brain,
  Target,
  CheckCircle,
  AlertCircle,
  Star
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DailyChallengeCardProps {
  preview?: boolean;
  onStartChallenge?: () => void;
}

export default function DailyChallengeCard({ preview = false, onStartChallenge }: DailyChallengeCardProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [userDiagnosis, setUserDiagnosis] = useState("");
  const [userReasoning, setUserReasoning] = useState("");
  const [proposedTreatment, setProposedTreatment] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch today's challenge
  const { data: challengeData, isLoading } = useQuery({
    queryKey: ['/api/daily-challenge'],
    enabled: !preview
  });

  const challenge = challengeData?.challenge;
  const caseStudy = challengeData?.caseStudy;

  // Submit challenge mutation
  const submitChallenge = useMutation({
    mutationFn: async (attemptData: any) => {
      const response = await apiRequest('POST', '/api/daily-challenge/submit', attemptData);
      return response.json();
    },
    onSuccess: (result) => {
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ['/api/daily-challenge'] });
      toast({
        title: "Challenge Completed!",
        description: `You scored ${result.score} points!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assessmentOptions = [
    "Range of Motion Assessment",
    "Manual Muscle Testing", 
    "Special Tests",
    "Palpation",
    "Postural Assessment",
    "Functional Movement Screen",
    "Pain Assessment (VAS/NPRS)",
    "Neurological Testing",
    "Biomechanical Analysis",
    "Activity-Specific Testing"
  ];

  const handleStartChallenge = () => {
    setIsStarted(true);
    setStartTime(new Date());
  };

  const handleSubmit = () => {
    if (!userDiagnosis.trim() || !userReasoning.trim() || !proposedTreatment.trim()) {
      toast({
        title: "Incomplete Submission",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const timeSpent = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;

    submitChallenge.mutate({
      attempt: {
        caseStudyId: caseStudy.id,
        userDiagnosis,
        userReasoning,
        assessmentTests: selectedTests,
        proposedTreatment,
        timeSpent
      }
    });
  };

  const handleTestSelection = (test: string, checked: boolean) => {
    if (checked) {
      setSelectedTests([...selectedTests, test]);
    } else {
      setSelectedTests(selectedTests.filter(t => t !== test));
    }
  };

  // Preview mode
  if (preview) {
    return (
      <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Today's Challenge</span>
          </div>
          <Badge variant="secondary">20 min</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Test your diagnostic skills with a new clinical case every day
        </p>
        <Button className="w-full" onClick={onStartChallenge}>
          Start Today's Challenge
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!challenge || !caseStudy) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Challenge Available</h3>
          <p className="text-muted-foreground">
            Today's challenge is being prepared. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Challenge Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Daily Challenge
              </CardTitle>
              <CardDescription>{challenge.title}</CardDescription>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {challenge.participantCount || 0} participants
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Avg: {challenge.averageScore || 0}%
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={challenge.difficulty === 'beginner' ? 'secondary' : 
                          challenge.difficulty === 'intermediate' ? 'default' : 'destructive'}>
              {challenge.difficulty}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {challenge.bodyPart}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              20 minutes
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Case Study Content */}
      {!isStarted ? (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Start?</CardTitle>
            <CardDescription>
              You'll have 20 minutes to analyze this case and provide your diagnosis and treatment plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Challenge Preview:</h4>
              <p className="text-sm text-muted-foreground">
                {caseStudy.title} - {caseStudy.complexity} difficulty
              </p>
            </div>
            <Button onClick={handleStartChallenge} size="lg" className="w-full">
              <Brain className="h-4 w-4 mr-2" />
              Start Challenge
            </Button>
          </CardContent>
        </Card>
      ) : showResults ? (
        // Results View
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Challenge Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitChallenge.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {submitChallenge.data.scores.accuracy}
                    </div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {submitChallenge.data.scores.speed}
                    </div>
                    <div className="text-sm text-muted-foreground">Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {submitChallenge.data.scores.reasoning}
                    </div>
                    <div className="text-sm text-muted-foreground">Reasoning</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {submitChallenge.data.scores.treatment}
                    </div>
                    <div className="text-sm text-muted-foreground">Treatment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {submitChallenge.data.score}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Score</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Correct Answer:</h4>
                  <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                    <strong>Diagnosis:</strong> {submitChallenge.data.correctDiagnosis}
                  </div>
                  <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                    <strong>Treatment:</strong> {submitChallenge.data.correctTreatment}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">AI Feedback:</h4>
                  <p className="text-sm">{submitChallenge.data.feedback}</p>
                </div>

                <div className="text-center">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    <Trophy className="h-4 w-4 mr-2" />
                    Rank #{submitChallenge.data.rank}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Challenge Form
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Case Analysis
              {startTime && (
                <div className="text-sm font-normal text-muted-foreground">
                  Started: {startTime.toLocaleTimeString()}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Case Information */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Patient Description</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{caseStudy.patientDescription}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">History</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{caseStudy.history}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Presenting Symptoms</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{caseStudy.presentingSymptoms}</p>
              </div>

              {caseStudy.vitalSigns && (
                <div>
                  <h4 className="font-medium mb-2">Vital Signs</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{caseStudy.vitalSigns}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Assessment Tests */}
            <div>
              <Label className="text-base font-medium">Assessment Tests (Select all that apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {assessmentOptions.map((test) => (
                  <div key={test} className="flex items-center space-x-2">
                    <Checkbox
                      id={test}
                      checked={selectedTests.includes(test)}
                      onCheckedChange={(checked) => handleTestSelection(test, checked as boolean)}
                    />
                    <Label htmlFor={test} className="text-sm font-normal cursor-pointer">
                      {test}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-base font-medium">
                Primary Diagnosis *
              </Label>
              <Input
                id="diagnosis"
                placeholder="Enter your primary diagnosis..."
                value={userDiagnosis}
                onChange={(e) => setUserDiagnosis(e.target.value)}
              />
            </div>

            {/* Clinical Reasoning */}
            <div className="space-y-2">
              <Label htmlFor="reasoning" className="text-base font-medium">
                Clinical Reasoning *
              </Label>
              <Textarea
                id="reasoning"
                placeholder="Explain your clinical reasoning and thought process..."
                rows={4}
                value={userReasoning}
                onChange={(e) => setUserReasoning(e.target.value)}
              />
            </div>

            {/* Treatment Plan */}
            <div className="space-y-2">
              <Label htmlFor="treatment" className="text-base font-medium">
                Proposed Treatment Plan *
              </Label>
              <Textarea
                id="treatment"
                placeholder="Describe your treatment approach and interventions..."
                rows={4}
                value={proposedTreatment}
                onChange={(e) => setProposedTreatment(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              size="lg" 
              className="w-full"
              disabled={submitChallenge.isPending}
            >
              {submitChallenge.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </div>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Submit Challenge
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}