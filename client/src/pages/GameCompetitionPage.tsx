import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, Users, Trophy, Timer, CheckCircle, XCircle, Brain, TrendingUp, BookOpen, ArrowRight, Lightbulb, Target, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface Competition {
  id: number;
  title: string;
  description: string;
  gameType: string;
  bodyPart: string;
  difficulty: string;
  timeLimit: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: string;
  endTime: string;
  status: string;
}

interface GameContent {
  [key: string]: any;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalScore: number;
  timeSpent: number;
  completedAt: string;
  rank: number;
}

interface QuestionFeedback {
  questionId: string;
  questionText: string;
  userResponse: string;
  correctAnswer?: string;
  aiAnalysis: string;
  score: number;
  strengths: string[];
  improvements: string[];
  clinicalReasoning: string;
  timeSpent?: number;
}

interface SubmissionResult {
  totalScore: number;
  timeSpent: number;
  feedback: string;
  scores: {
    accuracy: number;
    speed: number;
    reasoning: number;
    differential: number;
    treatment: number;
    total: number;
  };
  questionFeedbacks?: QuestionFeedback[];
  recommendedLearning?: string[];
  nextSteps?: string[];
}

function AIFeedbackModal({ 
  isOpen, 
  onClose, 
  submissionResult 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  submissionResult: SubmissionResult | null; 
}) {
  if (!submissionResult) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Target className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI-Powered Clinical Feedback
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of your performance with personalized learning recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(submissionResult.totalScore)}`}>
                    {submissionResult.totalScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-blue-600">
                    {Math.floor(submissionResult.timeSpent / 60)}:{(submissionResult.timeSpent % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Taken</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-semibold ${getScoreColor(submissionResult.scores.accuracy)}`}>
                    {submissionResult.scores.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="space-y-3">
                <h4 className="font-semibold">Category Breakdown</h4>
                {Object.entries(submissionResult.scores).map(([category, score]) => {
                  if (category === 'total') return null;
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize">{category.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={score} className="w-24" />
                        <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                          {score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall Feedback */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-800">AI Analysis</h4>
                <p className="text-sm text-blue-700">{submissionResult.feedback}</p>
              </div>
            </CardContent>
          </Card>

          {/* Question-by-Question Feedback */}
          {submissionResult.questionFeedbacks && submissionResult.questionFeedbacks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Question-by-Question Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissionResult.questionFeedbacks.map((questionFeedback, index) => (
                    <div key={questionFeedback.questionId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-lg">
                          {questionFeedback.questionText}
                        </h4>
                        <div className="flex items-center gap-1">
                          {getScoreIcon(questionFeedback.score)}
                          <span className={`font-bold ${getScoreColor(questionFeedback.score)}`}>
                            {questionFeedback.score}/100
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Your Response */}
                        <div>
                          <h5 className="font-medium mb-2 text-gray-700">Your Response:</h5>
                          <div className="p-3 bg-gray-50 rounded border">
                            <p className="text-sm">{questionFeedback.userResponse}</p>
                          </div>
                        </div>

                        {/* Correct Answer */}
                        {questionFeedback.correctAnswer && (
                          <div>
                            <h5 className="font-medium mb-2 text-green-700">Ideal Response:</h5>
                            <div className="p-3 bg-green-50 rounded border border-green-200">
                              <p className="text-sm text-green-800">{questionFeedback.correctAnswer}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis */}
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <h5 className="font-medium mb-2 text-blue-800 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          AI Clinical Analysis
                        </h5>
                        <p className="text-sm text-blue-700 mb-3">{questionFeedback.aiAnalysis}</p>
                        <p className="text-sm text-blue-600"><strong>Clinical Reasoning:</strong> {questionFeedback.clinicalReasoning}</p>
                      </div>

                      {/* Strengths and Improvements */}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {questionFeedback.strengths.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-green-700 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Strengths
                            </h5>
                            <ul className="text-sm space-y-1">
                              {questionFeedback.strengths.map((strength, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-600">•</span>
                                  <span className="text-green-700">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {questionFeedback.improvements.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-orange-700 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Areas for Improvement
                            </h5>
                            <ul className="text-sm space-y-1">
                              {questionFeedback.improvements.map((improvement, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-orange-600">•</span>
                                  <span className="text-orange-700">{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {index < submissionResult.questionFeedbacks!.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Learning Recommendations */}
          {(submissionResult.recommendedLearning || submissionResult.nextSteps) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Personalized Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {submissionResult.recommendedLearning && submissionResult.recommendedLearning.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Recommended Learning Resources
                      </h4>
                      <ul className="space-y-2">
                        {submissionResult.recommendedLearning.map((resource, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span className="text-sm">{resource}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {submissionResult.nextSteps && submissionResult.nextSteps.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-green-600" />
                        Next Steps
                      </h4>
                      <ul className="space-y-2">
                        {submissionResult.nextSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="px-8">
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GameResults({ competitionId }: { competitionId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaderboard();
  }, [competitionId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/game-competitions/${competitionId}/leaderboard`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Game Completed!</h3>
        <p className="text-muted-foreground">
          Thank you for participating. Here are the current rankings:
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏆 Leaderboard</CardTitle>
          <CardDescription>Competition rankings based on scores and completion time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No participants yet. Be the first to complete this competition!
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : index === 1
                      ? 'bg-gray-50 border-gray-200'
                      : index === 2
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : index === 1
                        ? 'bg-gray-500 text-white'
                        : index === 2
                        ? 'bg-orange-500 text-white'
                        : 'bg-muted-foreground text-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{entry.username}</div>
                      <div className="text-sm text-muted-foreground">
                        Completed in {formatTime(entry.timeSpent)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{entry.totalScore}/100</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.completedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitionOverview({ competition, onStart }: { competition: Competition; onStart: () => void }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            {competition.title}
          </CardTitle>
          <CardDescription>{competition.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Body Part:</span>
                <Badge variant="secondary">{competition.bodyPart}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Difficulty:</span>
                <Badge variant={competition.difficulty === 'beginner' ? 'default' : competition.difficulty === 'intermediate' ? 'secondary' : 'destructive'}>
                  {competition.difficulty}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Time Limit:</span>
                <span>{competition.timeLimit} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Participants:</span>
                <span>{competition.currentParticipants} / {competition.maxParticipants}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Competition Status</h4>
                <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                  {competition.status}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Game Type</h4>
                <p className="text-sm text-muted-foreground">
                  {competition.gameType === 'progressive_diagnostic_challenge' && 'Progressive Diagnostic Challenge - Work as a clinical detective'}
                  {competition.gameType === 'treatment_speed_run' && 'Treatment Speed Run - Fast-track treatment planning'}
                  {competition.gameType === 'lightning_diagnosis' && 'Lightning Diagnosis - Rapid clinical decision making'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-center">
              <Button 
                onClick={onStart} 
                size="lg" 
                className="px-8 py-3"
                disabled={competition.status !== 'active'}
              >
                {competition.status === 'active' ? 'Start Competition' : 'Competition Not Available'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GameCompetitionPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [gameContent, setGameContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [responses, setResponses] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Progressive Diagnostic Challenge state
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [performedTests, setPerformedTests] = useState<string[]>([]);
  const [usedQuestionCredits, setUsedQuestionCredits] = useState<number>(0);
  const [usedTestCredits, setUsedTestCredits] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [showDiagnosisInput, setShowDiagnosisInput] = useState<boolean>(false);
  const [revealedInformation, setRevealedInformation] = useState<Record<string, any>>({});
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCompetitionData();
  }, [id]);

  useEffect(() => {
    if (gameStarted && timeRemaining > 0 && !gameCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setGameCompleted(true);
            submitGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, timeRemaining, gameCompleted]);

  const fetchCompetitionData = async () => {
    try {
      const response = await fetch(`/api/game-competitions/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch competition data');
      }

      const data = await response.json();
      setCompetition(data.competition);
      setGameContent(data.content);
      // Convert time limit from minutes to seconds
      setTimeRemaining((data.competition.timeLimit || 0) * 60);

      // Add temporary logging to understand the data structure
      if (data.competition?.gameType === 'treatment_speed_run' && data.content) {
        console.log('Treatment Speed Run Data:', {
          gameType: data.competition.gameType,
          contentKeys: Object.keys(data.content),
          treatmentSpeedRunContent: data.content.treatmentSpeedRun,
          casesCount: data.content.treatmentSpeedRun?.cases?.length || 0
        });
      }
      
      if (data.competition?.gameType === 'progressive_diagnostic_challenge' && data.content) {
        console.log('Progressive Diagnostic Challenge Data:', {
          gameType: data.competition.gameType,
          contentKeys: Object.keys(data.content),
          progressiveContent: data.content.progressiveDiagnosticChallenge
        });
      }
    } catch (error: any) {
      console.error('Error fetching competition:', error);
      toast({
        title: "Error",
        description: "Failed to load competition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    setGameStarted(true);
  };

  const submitGame = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const timeSpent = ((competition?.timeLimit || 0) * 60) - timeRemaining;
      
      const response = await fetch(`/api/game-competitions/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          responses,
          timeSpent,
          gameType: competition?.gameType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit game');
      }

      const result = await response.json();
      
      // Store submission results with detailed feedback
      setSubmissionResult(result);
      setShowResults(true);
      
      toast({
        title: "Game Completed!",
        description: `Your score: ${result.totalScore}/100`,
      });
      
      setGameCompleted(true);
    } catch (error: any) {
      console.error('Error submitting game:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponse = (key: string, value: any) => {
    setResponses((prev: any) => ({ ...prev, [key]: value }));
  };

  // Helper function to reveal information when questions are asked
  const askQuestion = (questionId: string, challengeContent: any) => {
    const question = challengeContent.availableQuestions?.find((q: any) => q.id === questionId);
    if (!question) return;

    // Mark question as asked and deduct credits
    setAskedQuestions([...askedQuestions, questionId]);
    setUsedQuestionCredits(usedQuestionCredits + question.cost);
    setSelectedQuestion('');

    // Reveal hidden information based on question reveals
    const newRevealedInfo = { ...revealedInformation };
    question.reveals?.forEach((key: string) => {
      if (challengeContent.hiddenInformation?.[key]) {
        newRevealedInfo[key] = challengeContent.hiddenInformation[key];
      }
    });
    setRevealedInformation(newRevealedInfo);

    // Generate appropriate response based on question type
    let response = '';
    if (questionId === 'q1') {
      response = challengeContent.hiddenInformation?.painDescription || 'Patient reports significant pain and discomfort.';
    } else if (questionId === 'q2') {
      response = challengeContent.hiddenInformation?.auditorySymptoms || 'Patient heard a distinct sound during the incident.';
    } else if (questionId === 'q3') {
      response = challengeContent.hiddenInformation?.functionalLoss || 'Patient has difficulty with normal activities.';
    } else {
      response = `Question answered. Additional clinical information revealed. Check the revealed information section.`;
    }
    
    setQuestionResponses({
      ...questionResponses,
      [questionId]: response
    });
  };

  // Helper function to reveal information when tests are performed
  const performTest = (testId: string, challengeContent: any) => {
    const test = challengeContent.availableTests?.find((t: any) => t.id === testId);
    if (!test) return;

    // Mark test as performed and deduct credits
    setPerformedTests([...performedTests, testId]);
    setUsedTestCredits(usedTestCredits + test.cost);
    setSelectedTest('');

    // Reveal hidden information based on test reveals
    const newRevealedInfo = { ...revealedInformation };
    test.reveals?.forEach((key: string) => {
      if (challengeContent.hiddenInformation?.[key]) {
        newRevealedInfo[key] = challengeContent.hiddenInformation[key];
      }
    });
    setRevealedInformation(newRevealedInfo);

    // Generate appropriate test result based on test type
    let result = '';
    if (testId === 't1') {
      result = challengeContent.hiddenInformation?.acl_status || 'Positive test result - significant anterior translation noted.';
    } else if (testId === 't2') {
      result = challengeContent.hiddenInformation?.meniscal_integrity || 'Test shows mechanical symptoms consistent with meniscal pathology.';
    } else {
      result = `Test completed. Results indicate clinical findings. Check the revealed information section.`;
    }
    
    setTestResults({
      ...testResults,
      [testId]: result
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLightningDiagnosis = (content: any) => {
    console.log('renderLightningDiagnosis called with:', content);
    
    // Access the lightning diagnosis content
    const lightningContent = content?.lightningDiagnosis || content?.lightning_diagnosis || {};
    const cases = lightningContent.cases || [];
    
    console.log('lightningContent:', lightningContent);
    console.log('cases:', cases);
    console.log('cases length:', cases.length);
    
    if (!cases || cases.length === 0) {
      console.error('No Lightning Diagnosis cases found');
      return (
        <div className="text-center py-8">
          <p className="text-red-600">No Lightning Diagnosis questions available.</p>
          <p className="text-sm text-gray-500 mt-2">Content keys: {JSON.stringify(Object.keys(content || {}))}</p>
        </div>
      );
    }

    const currentCase = cases[currentStage] || cases[0];
    if (!currentCase) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">No current case available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
          <span className="text-sm font-medium">
            Question {currentStage + 1} of {cases.length}
          </span>
          <span className="text-sm text-blue-600">
            Time Limit: {currentCase.timeLimit || 30} seconds per question
          </span>
        </div>

        {/* Case presentation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium mb-4 text-lg">Clinical Scenario</h4>
          <p className="text-gray-700 leading-relaxed mb-6">
            {currentCase.presentation}
          </p>

          {/* Answer options */}
          <div className="space-y-3">
            <h5 className="font-medium">What is your diagnosis?</h5>
            
            {/* Correct diagnosis option */}
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name={`diagnosis-${currentStage}`}
                value={currentCase.correctDiagnosis}
                checked={responses[`case_${currentStage}`] === currentCase.correctDiagnosis}
                onChange={(e) => handleResponse(`case_${currentStage}`, e.target.value)}
                className="text-blue-600"
              />
              <span>{currentCase.correctDiagnosis}</span>
            </label>

            {/* Red herring options */}
            {currentCase.redHerrings?.map((redHerring: string, index: number) => (
              <label key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name={`diagnosis-${currentStage}`}
                  value={redHerring}
                  checked={responses[`case_${currentStage}`] === redHerring}
                  onChange={(e) => handleResponse(`case_${currentStage}`, e.target.value)}
                  className="text-blue-600"
                />
                <span>{redHerring}</span>
              </label>
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStage(Math.max(0, currentStage - 1))}
              disabled={currentStage === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Previous
            </button>
            
            {currentStage < cases.length - 1 ? (
              <button
                onClick={() => setCurrentStage(Math.min(cases.length - 1, currentStage + 1))}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitGame}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit All Answers'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTreatmentSpeedRun = (content: any) => {
    // Debug logging to understand data flow
    console.log('renderTreatmentSpeedRun called with:', content);
    console.log('content.treatmentSpeedRun:', content?.treatmentSpeedRun);
    
    // Access the treatmentSpeedRun content using camelCase (matching API response)
    const treatmentContent = content?.treatmentSpeedRun || {};
    const cases = treatmentContent.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    console.log('treatmentContent:', treatmentContent);
    console.log('cases:', cases);
    console.log('currentCase:', currentCase);
    console.log('currentStage:', currentStage);
    
    // If no currentCase found, display debug info and return error message
    if (!currentCase || cases.length === 0) {
      console.error('No case data found for Treatment Speed Run:', {
        content,
        treatmentContent,
        cases,
        casesLength: cases.length
      });
      
      return (
        <div className="text-center py-8">
          <p className="text-red-600">No case data available for this Treatment Speed Run.</p>
          <p className="text-sm text-gray-500 mt-2">Content structure: {JSON.stringify(Object.keys(content || {}))}</p>
        </div>
      );
    }

    // Render the Treatment Speed Run case
    return (
      <div className="space-y-6">
        {/* Case Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Case: {currentCase.diagnosis || 'Clinical Case'}
          </h3>
          
          <div className="space-y-4">
            {/* Patient Profile */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Patient Profile</h4>
              <p className="text-sm bg-gray-50 p-3 rounded">{currentCase.patientProfile}</p>
            </div>

            {/* Required Components */}
            {currentCase.requiredComponents && currentCase.requiredComponents.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Required Treatment Components</h4>
                <ul className="text-sm space-y-1">
                  {currentCase.requiredComponents.map((component: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      {component}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scoring Criteria */}
            {currentCase.scoringCriteria && currentCase.scoringCriteria.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Key Scoring Areas</h4>
                <ul className="text-sm space-y-1">
                  {currentCase.scoringCriteria.map((criteria: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Plan Response Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium mb-4">Your Treatment Plan</h4>
          
          <div className="space-y-4">
            {/* Assessment Approach */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Approach
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 text-sm"
                rows={3}
                placeholder="Describe your systematic assessment approach..."
                value={responses.assessmentApproach || ''}
                onChange={(e) => handleResponse('assessmentApproach', e.target.value)}
              />
            </div>

            {/* Treatment Planning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Treatment Plan & Interventions
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 text-sm"
                rows={4}
                placeholder="Detail your evidence-based treatment plan..."
                value={responses.treatmentPlan || ''}
                onChange={(e) => handleResponse('treatmentPlan', e.target.value)}
              />
            </div>

            {/* Clinical Reasoning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Reasoning & Rationale
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 text-sm"
                rows={3}
                placeholder="Explain your clinical reasoning and evidence base..."
                value={responses.clinicalReasoning || ''}
                onChange={(e) => handleResponse('clinicalReasoning', e.target.value)}
              />
            </div>

            {/* Expected Outcomes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Outcomes & Discharge Criteria
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 text-sm"
                rows={3}
                placeholder="Define measurable outcomes and discharge criteria..."
                value={responses.expectedOutcomes || ''}
                onChange={(e) => handleResponse('expectedOutcomes', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgressiveDiagnosticChallenge = (content: any) => {
    console.log('renderProgressiveDiagnosticChallenge called with:', content);
    
    // Access the progressiveDiagnosticChallenge content using camelCase
    const challengeContent = content?.progressiveDiagnosticChallenge;
    
    if (!challengeContent) {
      console.error('No Progressive Diagnostic Challenge content found:', content);
      return (
        <div className="text-center py-8">
          <p className="text-red-600">No Progressive Diagnostic Challenge content available.</p>
          <p className="text-sm text-gray-500 mt-2">Content keys: {JSON.stringify(Object.keys(content || {}))}</p>
        </div>
      );
    }

    const { 
      patientPresentation, 
      availableQuestions = [], 
      availableTests = [],
      resourceBudget = 15
    } = challengeContent;

    const remainingQuestionCredits = resourceBudget - usedQuestionCredits;
    const remainingTestCredits = resourceBudget - usedTestCredits;

    return (
      <div className="space-y-6">
        {/* Patient Presentation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Patient Presentation</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Age:</span> {patientPresentation?.age}
              </div>
              <div>
                <span className="font-medium">Gender:</span> {patientPresentation?.gender}
              </div>
              <div>
                <span className="font-medium">Occupation:</span> {patientPresentation?.occupation}
              </div>
            </div>
            <div>
              <span className="font-medium">Chief Complaint:</span> {patientPresentation?.chiefComplaint}
            </div>
            <div>
              <span className="font-medium">Initial Symptoms:</span>
              <ul className="mt-1 ml-4">
                {patientPresentation?.initialSymptoms?.map((symptom: string, index: number) => (
                  <li key={index} className="list-disc text-sm">{symptom}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Resource Management */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium mb-2">Resource Budget</h4>
          <div className="flex gap-4 text-sm">
            <div>Question Credits: {remainingQuestionCredits}</div>
            <div>Test Credits: {remainingTestCredits}</div>
            <div>Time Remaining: {formatTime(timeRemaining)}</div>
          </div>
        </div>

        {/* Strategic Questioning */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium mb-4">Strategic Questioning</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Question to Ask (Cost varies)
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
              >
                <option value="">Choose a question...</option>
                {availableQuestions
                  .filter((q: any) => !askedQuestions.includes(q.id))
                  .map((question: any) => (
                    <option key={question.id} value={question.id}>
                      {question.question} (Cost: {question.cost} credits)
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
              disabled={!selectedQuestion || remainingQuestionCredits < 1}
              onClick={() => {
                if (selectedQuestion) {
                  askQuestion(selectedQuestion, challengeContent);
                }
              }}
            >
              Ask Question
            </button>
          </div>
        </div>

        {/* Diagnostic Tests */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium mb-4">Available Diagnostic Tests</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Diagnostic Test
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
              >
                <option value="">Choose a test...</option>
                {availableTests
                  .filter((t: any) => !performedTests.includes(t.id))
                  .map((test: any) => (
                    <option key={test.id} value={test.id}>
                      {test.test} (Cost: {test.cost} credits)
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50"
              disabled={!selectedTest || remainingTestCredits < 1}
              onClick={() => {
                if (selectedTest) {
                  performTest(selectedTest, challengeContent);
                }
              }}
            >
              Perform Test
            </button>
          </div>
        </div>

        {/* Question Responses and Test Results */}
        {(Object.keys(questionResponses).length > 0 || Object.keys(testResults).length > 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4">Investigation Results</h4>
            
            {/* Question Responses */}
            {Object.keys(questionResponses).length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-sm text-gray-700 mb-2">Question Responses:</h5>
                <div className="space-y-2">
                  {Object.entries(questionResponses).map(([questionId, response]) => {
                    const question = challengeContent.availableQuestions?.find((q: any) => q.id === questionId);
                    return (
                      <div key={questionId} className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        <div className="text-sm font-medium text-blue-900">
                          Q: {question?.question || 'Question'}
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          A: {response}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-sm text-gray-700 mb-2">Test Results:</h5>
                <div className="space-y-2">
                  {Object.entries(testResults).map(([testId, result]) => {
                    const test = challengeContent.availableTests?.find((t: any) => t.id === testId);
                    return (
                      <div key={testId} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                        <div className="text-sm font-medium text-green-900">
                          Test: {test?.test || 'Diagnostic Test'}
                        </div>
                        <div className="text-sm text-green-800 mt-1">
                          Result: {result}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revealed Information */}
            {Object.keys(revealedInformation).length > 0 && (
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-2">Additional Clinical Information:</h5>
                <div className="space-y-1">
                  {Object.entries(revealedInformation).map(([key, value]) => (
                    <div key={key} className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                      <div className="text-sm text-yellow-800">
                        <span className="font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Diagnosis */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium mb-4">Final Diagnosis & Clinical Reasoning</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Diagnosis
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                placeholder="Enter your primary diagnosis..."
                value={responses.primaryDiagnosis || ''}
                onChange={(e) => handleResponse('primaryDiagnosis', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Reasoning
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 text-sm"
                rows={4}
                placeholder="Explain your diagnostic reasoning based on findings..."
                value={responses.diagnosticReasoning || ''}
                onChange={(e) => handleResponse('diagnosticReasoning', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Competition not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!gameStarted ? (
        <CompetitionOverview 
          competition={competition} 
          onStart={startGame}
        />
      ) : showResults && submissionResult ? (
        <div className="space-y-6">
          {/* Overall Performance Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🎯 Lightning Diagnosis Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {submissionResult.correctAnswers || 0}
                </div>
                <div className="text-sm text-green-800">Correct Diagnoses</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {submissionResult.totalQuestions - (submissionResult.correctAnswers || 0)}
                </div>
                <div className="text-sm text-red-800">Incorrect Diagnoses</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(submissionResult.totalScore || 0)}%
                </div>
                <div className="text-sm text-blue-800">Overall Score</div>
              </div>
            </div>

            {/* AI Performance Analysis */}
            {submissionResult.feedback && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">🤖 AI Performance Analysis</h3>
                <p className="text-blue-800 text-sm leading-relaxed">{submissionResult.feedback}</p>
              </div>
            )}
          </div>

          {/* Question-by-Question Breakdown */}
          {submissionResult.questionFeedbacks && submissionResult.questionFeedbacks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">📋 Question-by-Question Analysis</h3>
              
              {submissionResult.questionFeedbacks.map((feedback: any, index: number) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  feedback.score === 100 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-sm">Question {index + 1}</h4>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      feedback.score === 100 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {feedback.score === 100 ? '✓ Correct' : '✗ Incorrect'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Your Answer: </span>
                      <span>{feedback.userResponse}</span>
                    </div>
                    
                    {feedback.score !== 100 && (
                      <div>
                        <span className="font-medium text-gray-700">Correct Answer: </span>
                        <span className="text-green-600 font-medium">{feedback.correctAnswer}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">AI Analysis: </span>
                      <span className="text-gray-600">{feedback.aiAnalysis}</span>
                    </div>
                    
                    {feedback.improvements && feedback.improvements.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Learning Points: </span>
                        <ul className="list-disc list-inside ml-4 text-gray-600">
                          {feedback.improvements.map((improvement: string, i: number) => (
                            <li key={i}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/game-competitions'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Competitions
            </button>
            <GameResults competitionId={id!} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Game Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">{competition.title}</h1>
                <p className="text-gray-600">{competition.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            </div>
          </div>

          {/* Game Content */}
          <div>
            {competition.gameType === 'lightning_diagnosis' && gameContent && (
              renderLightningDiagnosis(gameContent)
            )}
            
            {competition.gameType === 'treatment_speed_run' && gameContent && (
              renderTreatmentSpeedRun(gameContent)
            )}
            
            {competition.gameType === 'progressive_diagnostic_challenge' && gameContent && (
              renderProgressiveDiagnosticChallenge(gameContent)
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={submitGame}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Game'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
