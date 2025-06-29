import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Target, 
  Clock, 
  Brain,
  CheckCircle,
  ArrowLeft,
  Star,
  TrendingUp,
  Award,
  Lightbulb
} from "lucide-react";

interface CompetitionResult {
  participantId: number;
  totalScore: number;
  rank: number;
  caseResults: {
    caseStudyId: number;
    scores: {
      accuracy: number;
      speed: number;
      reasoning: number;
      differential: number;
      treatment: number;
      total: number;
    };
    feedback: string;
  }[];
  achievements?: string[];
}

export default function CompetitionResultsPage() {
  const { id } = useParams();
  const competitionId = parseInt(id as string);
  const [results, setResults] = useState<CompetitionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem('competitionResults');
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
      } catch (error) {
        console.error('Error parsing stored results:', error);
      }
    }
    setLoading(false);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find your competition results. Please try submitting again.
            </p>
            <Link to={`/competitions/${competitionId}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Competition
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <Badge variant="default" className="bg-blue-100 text-blue-700">
          <Trophy className="h-4 w-4 mr-1" />
          Competition Results
        </Badge>
      </div>

      {/* Overall Score Summary */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Award className="h-6 w-6 text-yellow-600" />
            Your Performance Summary
          </CardTitle>
          <CardDescription>
            AI analysis of your clinical reasoning and diagnostic skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(results.totalScore)}`}>
              {results.totalScore}%
            </div>
            <div className="text-xl text-muted-foreground mb-4">
              Overall Score
            </div>
            <Badge 
              variant="outline" 
              className={`text-lg px-4 py-2 ${getScoreBackground(results.totalScore)}`}
            >
              {getPerformanceLevel(results.totalScore)}
            </Badge>
          </div>

          {results.rank && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                <span>Rank: #{results.rank}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Case Results */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600" />
          Detailed Case Analysis
        </h2>
        
        {results.caseResults.map((caseResult, index) => (
          <Card key={caseResult.caseStudyId} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Case Study #{index + 1}</span>
                <Badge variant="outline" className={getScoreBackground(caseResult.scores.total)}>
                  {caseResult.scores.total}% Total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(caseResult.scores.accuracy)}`}>
                    {caseResult.scores.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Target className="h-4 w-4" />
                    Accuracy
                  </div>
                  <Progress value={caseResult.scores.accuracy} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(caseResult.scores.speed)}`}>
                    {caseResult.scores.speed}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Speed
                  </div>
                  <Progress value={caseResult.scores.speed} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(caseResult.scores.reasoning)}`}>
                    {caseResult.scores.reasoning}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Brain className="h-4 w-4" />
                    Reasoning
                  </div>
                  <Progress value={caseResult.scores.reasoning} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(caseResult.scores.differential)}`}>
                    {caseResult.scores.differential}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Star className="h-4 w-4" />
                    Differential
                  </div>
                  <Progress value={caseResult.scores.differential} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(caseResult.scores.treatment)}`}>
                    {caseResult.scores.treatment}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Treatment
                  </div>
                  <Progress value={caseResult.scores.treatment} className="mt-2" />
                </div>
              </div>

              <Separator />

              {/* AI Feedback */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  AI Clinical Feedback
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  {caseResult.feedback}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements */}
      {results.achievements && results.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-600" />
              New Achievements Unlocked!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.achievements.map((achievement, index) => (
                <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Trophy className="h-4 w-4 mr-1" />
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Link to={`/competitions/${competitionId}`}>
          <Button variant="outline">
            Try Another Case
          </Button>
        </Link>
        <Link to="/competitions">
          <Button>
            View All Competitions
          </Button>
        </Link>
      </div>
    </div>
  );
}