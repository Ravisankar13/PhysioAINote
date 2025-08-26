import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  FileText,
  Target,
  TrendingUp,
  Brain,
  Zap,
  BarChart3
} from 'lucide-react';
import {
  ClinicalFramework,
  clinicalFrameworks,
  getFrameworksByType
} from '@/utils/clinicalFrameworks';
import {
  FrameworkAnalyzer,
  FrameworkAnalysisResult
} from '@/utils/frameworkAnalyzer';

interface FrameworkAnalysisPanelProps {
  landmarks: any[] | null;
  isAnalyzing: boolean;
  selectedTest?: any;
}

export function FrameworkAnalysisPanel({ 
  landmarks, 
  isAnalyzing,
  selectedTest 
}: FrameworkAnalysisPanelProps) {
  const [selectedFramework, setSelectedFramework] = useState<ClinicalFramework | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FrameworkAnalysisResult | null>(null);
  const [analyzer] = useState(() => new FrameworkAnalyzer());
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Auto-select framework based on test type
  useEffect(() => {
    if (selectedTest && !selectedFramework) {
      // Map test types to framework types
      const testToFramework: Record<string, string> = {
        'squat': 'hip',
        'single_leg': 'hip',
        'shoulder_flex': 'shoulder',
        'overhead': 'shoulder',
        'jump': 'sports',
        'balance': 'sports'
      };
      
      const testType = selectedTest.id || '';
      const frameworkType = Object.entries(testToFramework).find(([key]) => 
        testType.toLowerCase().includes(key)
      )?.[1];
      
      if (frameworkType) {
        const frameworks = getFrameworksByType(frameworkType as any);
        if (frameworks.length > 0) {
          setSelectedFramework(frameworks[0]);
        }
      }
    }
  }, [selectedTest, selectedFramework]);

  // Perform analysis when landmarks update
  useEffect(() => {
    if (landmarks && selectedFramework && (autoAnalyze || isAnalyzing)) {
      const result = analyzer.analyzeWithFramework(landmarks, selectedFramework);
      setAnalysisResult(result);
    }
  }, [landmarks, selectedFramework, autoAnalyze, isAnalyzing, analyzer]);

  const getFrameworkIcon = (type: string) => {
    switch (type) {
      case 'shoulder': return '🦾';
      case 'hip': return '🦴';
      case 'tendinopathy': return '💪';
      case 'sports': return '🏃';
      default: return '📊';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'text-yellow-600';
      case 'moderate': return 'text-orange-600';
      case 'severe': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Clinical Framework Analysis
        </CardTitle>
        <CardDescription>
          Evidence-based movement assessment using clinical frameworks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Framework Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Assessment Framework</label>
          <div className="grid grid-cols-2 gap-2">
            {clinicalFrameworks.map(framework => (
              <Button
                key={framework.id}
                variant={selectedFramework?.id === framework.id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setSelectedFramework(framework)}
              >
                <span className="mr-2">{getFrameworkIcon(framework.type)}</span>
                <span className="truncate">{framework.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Auto-analyze toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Continuous Analysis</span>
          <Button
            variant={autoAnalyze ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoAnalyze(!autoAnalyze)}
          >
            {autoAnalyze ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="treatment">Treatment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Confidence Score */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Analysis Confidence</span>
                  <span className="text-sm text-muted-foreground">
                    {analysisResult.confidenceScore.toFixed(0)}%
                  </span>
                </div>
                <Progress value={analysisResult.confidenceScore} className="h-2" />
              </div>

              {/* Red Flags */}
              {analysisResult.redFlags.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Clinical Red Flags Detected</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {analysisResult.redFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {analysisResult.summary}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              {analysisResult.detectedPatterns.length > 0 ? (
                analysisResult.detectedPatterns.map((pattern, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{pattern.name}</CardTitle>
                        <Badge className={getSeverityColor(pattern.severity)}>
                          {pattern.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="text-sm font-medium">{pattern.confidence.toFixed(0)}%</span>
                      </div>
                      <Progress value={pattern.confidence} className="h-1" />
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Key Indicators:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pattern.indicators.map((indicator, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {indicator.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No clinical patterns detected
                </div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              {/* Assessment Scores */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Assessment Protocol Scores
                </h4>
                {Object.entries(analysisResult.assessmentScores).map(([protocolId, score]) => {
                  const protocol = analysisResult.framework.assessmentProtocols.find(
                    p => p.id === protocolId
                  );
                  return (
                    <div key={protocolId} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{protocol?.name || protocolId}</span>
                        <span className="text-sm font-medium">{score.toFixed(0)}%</span>
                      </div>
                      <Progress value={score} className="h-1" />
                    </div>
                  );
                })}
              </div>

              {/* Joint Angles Display */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Current Joint Angles
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analyzer['currentMetrics']?.jointAngles && 
                    Object.entries(analyzer['currentMetrics'].jointAngles)
                      .slice(0, 6)
                      .map(([joint, angle]) => (
                        <div key={joint} className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-muted-foreground">
                            {joint.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-mono">{angle.toFixed(1)}°</span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="treatment" className="space-y-4">
              {analysisResult.recommendations.length > 0 ? (
                analysisResult.recommendations.map((pathway, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Phase {pathway.phase} - {pathway.condition.replace(/_/g, ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Recommended Exercises:</span>
                        <ul className="list-disc list-inside mt-1">
                          {pathway.exercises.map((exercise, i) => (
                            <li key={i} className="text-sm text-muted-foreground">
                              {exercise.replace(/_/g, ' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Progression Criteria:
                        </span>
                        <ul className="list-disc list-inside mt-1">
                          {pathway.progressionCriteria.map((criteria, i) => (
                            <li key={i} className="text-sm text-muted-foreground">
                              {criteria.replace(/_/g, ' ')}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {pathway.regressionIndicators.length > 0 && (
                        <div>
                          <span className="text-sm font-medium flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            Watch for:
                          </span>
                          <ul className="list-disc list-inside mt-1">
                            {pathway.regressionIndicators.map((indicator, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {indicator.replace(/_/g, ' ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No specific treatment recommendations</p>
                  <p className="text-xs mt-1">Select patterns will generate targeted protocols</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Evidence Level Badge */}
        {selectedFramework && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Evidence Level:</span>
            <Badge variant="outline" className="text-xs">
              {selectedFramework.evidenceLevel.replace(/-/g, ' ')}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}