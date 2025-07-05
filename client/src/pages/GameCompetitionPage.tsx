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
import { Clock, Users, Trophy, Timer, CheckCircle, XCircle, Brain, TrendingUp, BookOpen, ArrowRight, Lightbulb, Target } from 'lucide-react';
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
      setTimeRemaining(data.competition.timeLimit);
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
      const timeSpent = (competition?.timeLimit || 0) - timeRemaining;
      
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTreatmentSpeedRun = (content: any) => {
    const treatmentContent = content.treatment_speed_run || {};
    const cases = treatmentContent.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    if (!currentCase) {
      console.log('No treatment speed run content found:', content);
      return <div className="text-center py-4 text-muted-foreground">No treatment speed run cases available.</div>;
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-blue-800">🏃‍♂️ Treatment Speed Run</h4>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Diagnosis:</span> {currentCase.diagnosis}
            </div>
            <div className="text-sm">
              <span className="font-medium">Patient Profile:</span> {currentCase.patientProfile}
            </div>
            <div className="text-sm">
              <span className="font-medium">Time Limit:</span> {Math.floor(currentCase.timeLimit / 60)} minutes
            </div>
          </div>
        </div>

        {currentCase.requiredComponents && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h5 className="font-medium mb-2 text-green-800">Required Treatment Components:</h5>
            <ul className="text-sm space-y-1">
              {currentCase.requiredComponents.map((component: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {component}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Immediate Assessment Plan:</Label>
            <Textarea
              placeholder="Describe your immediate assessment approach and key tests..."
              value={responses[`assessment_${currentStage}`] || ''}
              onChange={(e) => handleResponse(`assessment_${currentStage}`, e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Treatment Protocol:</Label>
            <Textarea
              placeholder="Detail your comprehensive treatment plan including manual therapy, exercises, and interventions..."
              value={responses[`treatment_${currentStage}`] || ''}
              onChange={(e) => handleResponse(`treatment_${currentStage}`, e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Exercise Prescription:</Label>
            <Textarea
              placeholder="Provide specific exercises with sets, reps, progression criteria..."
              value={responses[`exercises_${currentStage}`] || ''}
              onChange={(e) => handleResponse(`exercises_${currentStage}`, e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Patient Education & Home Program:</Label>
            <Textarea
              placeholder="Describe patient education points and home management strategies..."
              value={responses[`education_${currentStage}`] || ''}
              onChange={(e) => handleResponse(`education_${currentStage}`, e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Follow-up Plan:</Label>
            <Input
              placeholder="Outline follow-up schedule and outcome measures..."
              value={responses[`followup_${currentStage}`] || ''}
              onChange={(e) => handleResponse(`followup_${currentStage}`, e.target.value)}
            />
          </div>
        </div>

        {currentCase.scoringCriteria && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h5 className="font-medium mb-2 text-yellow-800">Scoring Criteria:</h5>
            <ul className="text-sm space-y-1">
              {currentCase.scoringCriteria.map((criteria: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  {criteria}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {currentStage < cases.length - 1 && (
          <Button onClick={() => setCurrentStage((prev: number) => prev + 1)}>
            Next Case
          </Button>
        )}
      </div>
    );
  };

  const renderProgressiveDiagnosticChallenge = (content: any) => {
    // Debug: Log the content structure to understand what we're working with
    console.log('Progressive Diagnostic Challenge content received:', content);
    console.log('Content keys:', Object.keys(content || {}));
    
    // The content passed here IS the progressive diagnostic challenge content
    // No need to access content.progressiveDiagnosticChallenge - content IS the progressive content
    const progressiveContent = content;
    
    console.log('Progressive content extracted:', progressiveContent);
    
    if (!progressiveContent || !progressiveContent.patientPresentation) {
      console.log('No progressive content found - returning error message');
      return <div className="text-center py-4 text-muted-foreground">No diagnostic challenge cases available.</div>;
    }

    return (
      <div className="space-y-6">
        {/* Case Information */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Progressive Diagnostic Challenge
          </h4>
          
          {/* Patient Presentation */}
          <div className="bg-white p-3 rounded-lg mb-3">
            <h5 className="font-medium mb-2">Patient Presentation</h5>
            <div className="text-sm space-y-1">
              <p><strong>Age:</strong> {progressiveContent.patientPresentation?.age} years old</p>
              <p><strong>Gender:</strong> {progressiveContent.patientPresentation?.gender}</p>
              <p><strong>Occupation:</strong> {progressiveContent.patientPresentation?.occupation}</p>
              <p><strong>Chief Complaint:</strong> {progressiveContent.patientPresentation?.chiefComplaint}</p>
            </div>
            
            {progressiveContent.patientPresentation?.initialSymptoms && (
              <div className="mt-2">
                <strong className="text-sm">Initial Symptoms:</strong>
                <ul className="text-sm ml-4 mt-1">
                  {progressiveContent.patientPresentation.initialSymptoms.map((symptom: string, idx: number) => (
                    <li key={idx} className="list-disc">{symptom}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Time Limit: {progressiveContent.timeLimit} min</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">💬</span>
              <span>Questions: {usedQuestionCredits}/{progressiveContent.resourceBudget}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">🔬</span>
              <span>Tests: {usedTestCredits}/{progressiveContent.resourceBudget}</span>
            </div>
          </div>
        </div>

        {/* Investigation Phase */}
        {!showDiagnosisInput && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Questions Panel */}
            <div className="space-y-4">
              <h5 className="font-medium text-lg">Ask Strategic Questions</h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {progressiveContent.availableQuestions?.map((q: any) => (
                  <div key={q.id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    askedQuestions.includes(q.id) 
                      ? 'bg-green-50 border-green-300' 
                      : usedQuestionCredits + q.cost > progressiveContent.resourceBudget
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => {
                    if (!askedQuestions.includes(q.id) && usedQuestionCredits + q.cost <= progressiveContent.resourceBudget) {
                      setAskedQuestions([...askedQuestions, q.id]);
                      setUsedQuestionCredits(prev => prev + q.cost);
                      handleResponse('questions', [...askedQuestions, q.id].join(', '));
                    }
                  }}>
                    <div className="flex justify-between items-start">
                      <p className="text-sm flex-1">{q.question}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">
                        {q.cost} credit{q.cost > 1 ? 's' : ''}
                      </span>
                    </div>
                    {askedQuestions.includes(q.id) && (
                      <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                        <strong>Information Revealed:</strong> {progressiveContent.hiddenInformation?.[q.reveals?.[0]] || 'Additional clinical details revealed'}
                        {q.revealsRedFlag && <span className="ml-2 text-red-600 font-medium">⚠️ Red Flag</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tests Panel */}
            <div className="space-y-4">
              <h5 className="font-medium text-lg">Order Assessment Tests</h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {progressiveContent.availableTests?.map((test: any) => (
                  <div key={test.id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    performedTests.includes(test.id) 
                      ? 'bg-green-50 border-green-300' 
                      : usedTestCredits + test.cost > progressiveContent.resourceBudget
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:bg-purple-50'
                  }`}
                  onClick={() => {
                    if (!performedTests.includes(test.id) && usedTestCredits + test.cost <= progressiveContent.resourceBudget) {
                      setPerformedTests([...performedTests, test.id]);
                      setUsedTestCredits(prev => prev + test.cost);
                      handleResponse('tests', [...performedTests, test.id].join(', '));
                    }
                  }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{test.test}</p>
                        <p className="text-xs text-gray-600 capitalize">{test.category}</p>
                      </div>
                      <div className="text-xs space-y-1">
                        <span className="block bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {test.cost} credits
                        </span>
                      </div>
                    </div>
                    {performedTests.includes(test.id) && (
                      <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                        <strong>Test Results:</strong> {progressiveContent.hiddenInformation?.[test.reveals?.[0]] || 'Positive findings revealed'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowDiagnosisInput(true)}
            disabled={askedQuestions.length === 0 && performedTests.length === 0}
          >
            Submit Diagnosis
          </Button>
          {showDiagnosisInput && (
            <Button 
              variant="outline"
              onClick={() => setShowDiagnosisInput(false)}
            >
              Continue Investigation
            </Button>
          )}
        </div>

        {/* Diagnosis Input */}
        {showDiagnosisInput && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h5 className="font-medium mb-3 text-yellow-800">Final Diagnosis & Clinical Reasoning</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Diagnosis:</label>
                <Input
                  placeholder="Enter your primary diagnosis..."
                  value={responses.diagnosis || ''}
                  onChange={(e) => handleResponse('diagnosis', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Clinical Reasoning:</label>
                <Textarea
                  placeholder="Explain your clinical reasoning, key findings that led to this diagnosis, and ruled out differentials..."
                  value={responses.reasoning || ''}
                  onChange={(e) => handleResponse('reasoning', e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Differential Diagnoses Considered:</label>
                <Textarea
                  placeholder="List other diagnoses you considered and why you ruled them out..."
                  value={responses.differentials || ''}
                  onChange={(e) => handleResponse('differentials', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scoring Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium mb-2">Scoring Weights</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="font-medium">Efficiency:</span> {progressiveContent.scoringCriteria?.efficiency || 25}%
            </div>
            <div>
              <span className="font-medium">Thoroughness:</span> {progressiveContent.scoringCriteria?.thoroughness || 25}%
            </div>
            <div>
              <span className="font-medium">Safety:</span> {progressiveContent.scoringCriteria?.safety || 30}%
            </div>
            <div>
              <span className="font-medium">Accuracy:</span> {progressiveContent.scoringCriteria?.accuracy || 20}%
            </div>
          </div>
        </div>
        
        {/* Clinical Information Panel */}
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <h5 className="font-medium mb-2 text-emerald-800">Differential Diagnoses to Consider</h5>
          <div className="text-sm text-emerald-700">
            {progressiveContent.differentialDiagnoses?.map((diagnosis: string, idx: number) => (
              <span key={idx} className="inline-block bg-emerald-100 px-2 py-1 rounded mr-2 mb-1">
                {diagnosis}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGameContent = () => {
    if (!gameContent || !competition) return null;

    // For treatment_speed_run and progressive_diagnostic_challenge, pass the entire gameContent
    // because these functions access nested content directly (e.g., content.treatment_speed_run)
    if (competition.gameType === 'treatment_speed_run' || competition.gameType === 'progressive_diagnostic_challenge') {
      const content = gameContent;
      
      if (!content) {
        return (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Game Type: {competition.gameType}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              No content available for this game type.
            </p>
            <pre className="text-xs bg-muted-foreground/10 p-2 rounded">
              Available keys: {Object.keys(gameContent).join(', ')}
            </pre>
          </div>
        );
      }
    }

    // Map snake_case game types to camelCase content keys for other game types
    const contentKeyMap: { [key: string]: string } = {
      'choose_your_adventure': 'chooseYourAdventure',
      'mystery_patient': 'mysteryPatient', 
      'lightning_diagnosis': 'lightningDiagnosis',
      'red_flag_detective': 'redFlagDetective',
      'differential_diagnosis_duel': 'differentialDiagnosisDuel',
      'emergency_room_simulator': 'emergencyRoomSimulator',
      'journal_club_race': 'journalClubRace',
      'cpg_quiz_master': 'cpgQuizMaster'
    };

    const contentKey = contentKeyMap[competition.gameType] || competition.gameType;
    const content = competition.gameType === 'treatment_speed_run' || competition.gameType === 'progressive_diagnostic_challenge' 
      ? gameContent 
      : gameContent[contentKey];
    
    if (!content) {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Game Type: {competition.gameType}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            No content available for this game type. Content key: {contentKey}
          </p>
          <pre className="text-xs bg-muted-foreground/10 p-2 rounded">
            Available keys: {Object.keys(gameContent).join(', ')}
          </pre>
        </div>
      );
    }

    switch (competition.gameType) {
      case 'choose_your_adventure':
        return renderChooseYourAdventure(content);
      case 'mystery_patient':
        return renderMysteryPatient(content);
      case 'lightning_diagnosis':
        return renderLightningDiagnosis(content);
      case 'treatment_speed_run':
        return renderTreatmentSpeedRun(content);
      case 'progressive_diagnostic_challenge':
        return renderProgressiveDiagnosticChallenge(content);
      case 'red_flag_detective':
        return renderRedFlagDetective(content);
      case 'differential_diagnosis_duel':
        return renderDifferentialDiagnosis(content);
      default:
        return (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Game Type: {competition.gameType}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Specialized game content for {competition.gameType}
            </p>
            <Textarea
              placeholder="Enter your response..."
              value={responses.general || ''}
              onChange={(e) => handleResponse('general', e.target.value)}
              className="mb-4"
            />
          </div>
        );
    }
  };

  const renderChooseYourAdventure = (content: any) => {
    const storyline = content.storyline || [];
    const currentScene = storyline[currentStage] || storyline[0];
    
    if (!currentScene) return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Clinical Scenario</h4>
          <p className="text-sm">{currentScene.scene}</p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Choose your approach:</Label>
          {currentScene.choices?.map((choice: any, index: number) => (
            <Button
              key={index}
              variant={responses.currentChoice === index ? "default" : "outline"}
              className="w-full text-left justify-start h-auto p-4"
              onClick={() => handleResponse('currentChoice', index)}
            >
              <div>
                <div className="font-medium">{choice.text}</div>
                <div className="text-xs text-muted-foreground mt-1">{choice.consequences}</div>
              </div>
            </Button>
          ))}
        </div>
        
        {currentStage < storyline.length - 1 && (
          <Button 
            onClick={() => setCurrentStage(prev => prev + 1)}
            disabled={responses.currentChoice === undefined}
          >
            Continue to Next Scene
          </Button>
        )}
      </div>
    );
  };

  const renderMysteryPatient = (content: any) => {
    const clues = content.clues || [];
    const revealedClues = clues.slice(0, currentStage + 1);
    
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Mystery Patient - Clue {currentStage + 1}</h4>
          <Progress value={((currentStage + 1) / clues.length) * 100} className="mb-4" />
        </div>
        
        <div className="space-y-3">
          {revealedClues.map((clue: any, index: number) => (
            <Card key={index} className="p-3">
              <div className="flex items-start gap-3">
                <Badge variant={clue.significance === 'high' ? 'destructive' : clue.significance === 'medium' ? 'default' : 'secondary'}>
                  {clue.clueType}
                </Badge>
                <p className="text-sm">{clue.content}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="diagnosis">Your Current Diagnosis Hypothesis:</Label>
          <Input
            id="diagnosis"
            placeholder="Enter your diagnosis..."
            value={responses.diagnosis || ''}
            onChange={(e) => handleResponse('diagnosis', e.target.value)}
          />
        </div>
        
        {currentStage < clues.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Reveal Next Clue
          </Button>
        )}
      </div>
    );
  };

  const renderLightningDiagnosis = (content: any) => {
    const cases = content.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    if (!currentCase) return null;

    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          <h4 className="font-semibold mb-2 text-destructive">⚡ Lightning Diagnosis - 30 seconds!</h4>
          <p className="text-sm">{currentCase.presentation}</p>
        </div>
        
        <div className="space-y-2">
          <Label>Quick Diagnosis:</Label>
          <Input
            placeholder="Enter your diagnosis immediately..."
            value={responses[`case_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`case_${currentStage}`, e.target.value)}
          />
        </div>
        
        {currentStage < cases.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Case
          </Button>
        )}
      </div>
    );
  };



  const renderRedFlagDetective = (content: any) => {
    const cases = content.cases || [];
    const currentCase = cases[currentStage] || cases[0];
    
    if (!currentCase) return null;

    return (
      <div className="space-y-4">
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-semibold mb-2 text-orange-800">🚩 Red Flag Detective</h4>
          <p className="text-sm">{currentCase.patientStory}</p>
        </div>
        
        <div className="space-y-2">
          <Label>Identified Red Flags (separate with commas):</Label>
          <Textarea
            placeholder="List any red flags you identify..."
            value={responses[`redflags_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`redflags_${currentStage}`, e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Action Required:</Label>
          <Input
            placeholder="What immediate action would you take?"
            value={responses[`action_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`action_${currentStage}`, e.target.value)}
          />
        </div>
        
        {currentStage < cases.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Case
          </Button>
        )}
      </div>
    );
  };

  const renderDifferentialDiagnosis = (content: any) => {
    const rounds = content.rounds || [];
    const currentRound = rounds[currentStage] || rounds[0];
    
    if (!currentRound) return null;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-blue-800">🎯 Differential Diagnosis Duel</h4>
          <p className="text-sm">{currentRound.casePresentation}</p>
        </div>
        
        <div className="space-y-2">
          <Label>List Your Differential Diagnoses (one per line):</Label>
          <Textarea
            placeholder="Enter each possible diagnosis on a new line..."
            value={responses[`differentials_${currentStage}`] || ''}
            onChange={(e) => handleResponse(`differentials_${currentStage}`, e.target.value)}
            rows={6}
          />
        </div>
        
        {currentStage < rounds.length - 1 && (
          <Button onClick={() => setCurrentStage(prev => prev + 1)}>
            Next Round
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Competition Not Found</h1>
          <p className="text-muted-foreground">The competition you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Competition Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{competition.title}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {competition.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {gameStarted && !gameCompleted && (
                  <div className="flex items-center gap-2 text-lg font-mono bg-muted px-3 py-1 rounded">
                    <Timer className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                  </div>
                )}
                {gameCompleted && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
                <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                  {competition.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{Math.floor(competition.timeLimit / 60)} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{competition.currentParticipants}/{competition.maxParticipants} participants</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{competition.difficulty}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Game Content */}
        <Card>
          <CardHeader>
            <CardTitle>Game Content</CardTitle>
          </CardHeader>
          <CardContent>
            {!gameStarted ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">Ready to start?</h3>
                <p className="text-muted-foreground mb-6">
                  Once you start, the timer will begin. Make sure you're ready!
                </p>
                <Button onClick={startGame} size="lg">
                  Start Game
                </Button>
              </div>
            ) : gameCompleted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Game Completed!</h3>
                <p className="text-muted-foreground mb-6">
                  Your responses have been analyzed with AI feedback.
                </p>
                {submissionResult && (
                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">
                      Score: {submissionResult.totalScore}/100
                    </div>
                    <Button 
                      onClick={() => setShowResults(true)}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Brain className="h-5 w-5 mr-2" />
                      View Detailed AI Feedback
                    </Button>
                  </div>
                )}
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <a href="/game-competitions">Return to Competitions</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {renderGameContent()}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Time remaining: {formatTime(timeRemaining)}
                  </div>
                  <Button 
                    onClick={submitGame} 
                    disabled={submitting}
                    variant="default"
                  >
                    {submitting ? 'Submitting...' : 'Submit Game'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Feedback Modal */}
      <AIFeedbackModal 
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        submissionResult={submissionResult}
      />
    </div>
  );
}