import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartBar, 
  TrendingUp, 
  Users, 
  Brain,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ComparativeCaseAnalysisProps {
  soapNoteId?: number;
  onAnalysisComplete?: () => void;
}

interface SimilarCase {
  caseId: number;
  similarity: number;
  keyMatchingFactors: string[];
  demographics: {
    ageRange: string;
    gender: string;
    activityLevel: string;
  };
  outcomes: {
    painReduction: number;
    functionImprovement: number;
    timeToRecovery: number;
  };
}

interface TreatmentPathway {
  approach: string;
  caseCount: number;
  successRate: number;
  averageRecoveryTime: number;
  averagePainReduction: number;
  averageFunctionImprovement: number;
  complications: string[];
}

interface Prediction {
  min: number;
  max: number;
  average: number;
}

interface ComparativeAnalysis {
  id: number;
  soapNoteId: number;
  similarCaseIds: number[];
  analysisResults: {
    topSimilarCases: SimilarCase[];
    treatmentRecommendations: any[];
    prognosticFactors: {
      positive: string[];
      negative: string[];
      modifiable: string[];
    };
    expectedOutcomes: {
      painReduction: Prediction;
      functionImprovement: Prediction;
      timeToRecovery: Prediction;
    };
  };
  confidenceScore: number;
  sampleSize: number;
  createdAt: string;
}

export default function ComparativeCaseAnalysis({ 
  soapNoteId, 
  onAnalysisComplete 
}: ComparativeCaseAnalysisProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing analysis
  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: [`/api/soap-notes/${soapNoteId}/comparative-analysis`],
    enabled: !!soapNoteId,
  });

  // Fetch similar cases
  const { data: similarCases, isLoading: casesLoading } = useQuery({
    queryKey: [`/api/soap-notes/${soapNoteId}/similar-cases`],
    enabled: !!soapNoteId && !analysis,
  });

  // Fetch pathway analysis
  const { data: pathwayAnalysis } = useQuery({
    queryKey: [`/api/soap-notes/${soapNoteId}/pathway-analysis`],
    enabled: !!soapNoteId && !analysis,
  });

  // Fetch outcome predictions
  const { data: predictions } = useQuery({
    queryKey: [`/api/soap-notes/${soapNoteId}/outcome-predictions`],
    enabled: !!soapNoteId && !analysis,
  });

  // Perform comparative analysis mutation
  const performAnalysisMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/soap-notes/${soapNoteId}/comparative-analysis`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/soap-notes/${soapNoteId}/comparative-analysis`] 
      });
      toast({
        title: "Analysis Complete",
        description: "Comparative case analysis has been generated successfully.",
      });
      onAnalysisComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to perform comparative analysis.",
        variant: "destructive",
      });
    },
  });

  const renderConfidenceIndicator = (score: number) => {
    let color = "text-red-500";
    let icon = <AlertCircle className="w-4 h-4" />;
    
    if (score >= 80) {
      color = "text-green-500";
      icon = <CheckCircle className="w-4 h-4" />;
    } else if (score >= 60) {
      color = "text-yellow-500";
      icon = <Minus className="w-4 h-4" />;
    }

    return (
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="font-semibold">{score}% Confidence</span>
      </div>
    );
  };

  const renderOutcomeRange = (prediction: Prediction, unit: string) => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Min: {prediction.min}{unit}</span>
          <span className="font-semibold">Avg: {prediction.average}{unit}</span>
          <span>Max: {prediction.max}{unit}</span>
        </div>
        <Progress value={(prediction.average / prediction.max) * 100} className="h-2" />
      </div>
    );
  };

  const renderPrognosticFactor = (factor: string, type: 'positive' | 'negative' | 'modifiable') => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      modifiable: 'bg-blue-100 text-blue-800'
    };

    const icons = {
      positive: <ArrowUpRight className="w-3 h-3" />,
      negative: <ArrowDownRight className="w-3 h-3" />,
      modifiable: <Target className="w-3 h-3" />
    };

    return (
      <Badge key={factor} className={`${colors[type]} flex items-center gap-1`}>
        {icons[type]}
        {factor}
      </Badge>
    );
  };

  if (!soapNoteId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please save the SOAP note first to perform comparative analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analysisLoading || casesLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Comparative Case Analysis
          </CardTitle>
          {!analysis && (
            <Button
              onClick={() => performAnalysisMutation.mutate()}
              disabled={performAnalysisMutation.isPending}
              size="sm"
            >
              {performAnalysisMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="similar">Similar Cases</TabsTrigger>
            <TabsTrigger value="pathways">Treatment Paths</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {analysis ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{analysis.sampleSize}</div>
                    <div className="text-sm text-muted-foreground">Similar Cases</div>
                  </div>
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">
                      {analysis.analysisResults.treatmentRecommendations.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Treatment Options</div>
                  </div>
                  <div className="text-center">
                    <ChartBar className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    {renderConfidenceIndicator(analysis.confidenceScore)}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Prognostic Factors</h4>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysisResults.prognosticFactors.positive.map((factor) =>
                        renderPrognosticFactor(factor, 'positive')
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysisResults.prognosticFactors.negative.map((factor) =>
                        renderPrognosticFactor(factor, 'negative')
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysisResults.prognosticFactors.modifiable.map((factor) =>
                        renderPrognosticFactor(factor, 'modifiable')
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No analysis performed yet. Click "Run Analysis" to compare with historical cases.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="similar" className="space-y-4">
            {analysis?.analysisResults.topSimilarCases && analysis.analysisResults.topSimilarCases.length > 0 ? (
              <div className="space-y-3">
                {analysis.analysisResults.topSimilarCases.map((similarCase, index) => (
                  <Card key={similarCase.caseId} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Case #{index + 1}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            {(similarCase.similarity * 100).toFixed(1)}% Match
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="font-medium">Matching Factors:</div>
                          <div className="flex flex-wrap gap-1">
                            {similarCase.keyMatchingFactors.map((factor) => (
                              <Badge key={factor} variant="secondary" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : similarCases ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Found {similarCases.caseCount} similar cases
                </p>
                {similarCases.cases?.slice(0, 5).map((c: any, index: number) => (
                  <Card key={index} className="p-4">
                    <Badge variant="outline">Similar Case #{index + 1}</Badge>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No similar cases found. Run analysis to find matching cases.
              </p>
            )}
          </TabsContent>

          <TabsContent value="pathways" className="space-y-4">
            {pathwayAnalysis?.analysis?.pathways ? (
              <div className="space-y-4">
                {pathwayAnalysis.analysis.topRecommendation && (
                  <Card className="p-4 border-green-200 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Top Recommendation</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">{pathwayAnalysis.analysis.topRecommendation.approach}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Success Rate:</span>{" "}
                          {pathwayAnalysis.analysis.topRecommendation.successRate.toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Recovery Time:</span>{" "}
                          {pathwayAnalysis.analysis.topRecommendation.averageRecoveryTime} weeks
                        </div>
                        <div>
                          <span className="font-medium">Cases:</span>{" "}
                          {pathwayAnalysis.analysis.topRecommendation.caseCount}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {pathwayAnalysis.analysis.alternativeApproaches?.map((pathway: TreatmentPathway, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pathway.approach}</span>
                        <Badge variant="outline">
                          {pathway.successRate.toFixed(1)}% Success
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Recovery: {pathway.averageRecoveryTime} weeks</div>
                        <div>Based on {pathway.caseCount} cases</div>
                      </div>
                      {pathway.complications.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Considerations:</span>{" "}
                          {pathway.complications.join(", ")}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No treatment pathway analysis available yet.
              </p>
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            {analysis?.analysisResults.expectedOutcomes ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold">Pain Reduction</span>
                  </div>
                  {renderOutcomeRange(analysis.analysisResults.expectedOutcomes.painReduction, "%")}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Functional Improvement</span>
                  </div>
                  {renderOutcomeRange(analysis.analysisResults.expectedOutcomes.functionImprovement, "%")}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold">Time to Recovery</span>
                  </div>
                  {renderOutcomeRange(analysis.analysisResults.expectedOutcomes.timeToRecovery, " weeks")}
                </Card>
              </div>
            ) : predictions?.predictions ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  {renderConfidenceIndicator(predictions.predictions.confidence)}
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {predictions.predictions.sampleSize} similar cases
                  </p>
                </div>

                {predictions.predictions.predictions && (
                  <>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">Pain Reduction</span>
                      </div>
                      {renderOutcomeRange(predictions.predictions.predictions.painReduction, "%")}
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="font-semibold">Functional Improvement</span>
                      </div>
                      {renderOutcomeRange(predictions.predictions.predictions.functionImprovement, "%")}
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <span className="font-semibold">Time to Recovery</span>
                      </div>
                      {renderOutcomeRange(predictions.predictions.predictions.timeToRecovery, " weeks")}
                    </Card>
                  </>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No outcome predictions available yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}