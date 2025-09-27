import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Target, 
  TrendingUp,
  Info,
  Heart,
  Brain,
  Shield,
  Lightbulb
} from 'lucide-react';
import type { FaultAnalysisResult, MovementFault, FaultType } from '@/services/movement/MovementFaultAnalyzer';

interface MovementFaultAnalysisPanelProps {
  faultAnalysis: FaultAnalysisResult | null;
  isActive: boolean;
  onDismissFault?: (faultType: FaultType) => void;
}

export function MovementFaultAnalysisPanel({
  faultAnalysis,
  isActive,
  onDismissFault
}: MovementFaultAnalysisPanelProps) {
  
  if (!isActive || !faultAnalysis) {
    return (
      <Card className="w-full opacity-60" data-testid="fault-analysis-inactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Movement Fault Analysis
          </CardTitle>
          <CardDescription>
            Start moving to analyze biomechanical patterns and detect potential issues
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasSignificantFaults = faultAnalysis.detectedFaults.some(fault => 
    fault.severity === 'moderate' || fault.severity === 'severe'
  );

  const qualityColor = faultAnalysis.overallMovementQuality >= 8 ? 'text-green-600' 
    : faultAnalysis.overallMovementQuality >= 6 ? 'text-yellow-600' 
    : 'text-red-600';

  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'mild': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getSeverityIcon = (severity: 'mild' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'mild': return <Info className="h-3 w-3" />;
      case 'moderate': return <AlertTriangle className="h-3 w-3" />;
      case 'severe': return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getFaultDisplayName = (faultType: FaultType): string => {
    return faultType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="w-full" data-testid="movement-fault-analysis-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Movement Analysis
            {hasSignificantFaults && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Issues Detected
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <div className={`text-2xl font-bold ${qualityColor}`}>
              {faultAnalysis.overallMovementQuality.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Movement Quality</div>
          </div>
        </div>
        <CardDescription>
          Real-time biomechanical analysis with clinical insights
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quality Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Quality Score</span>
            <span className={qualityColor}>
              {faultAnalysis.overallMovementQuality.toFixed(1)}/10
            </span>
          </div>
          <Progress 
            value={faultAnalysis.overallMovementQuality * 10} 
            className="w-full"
            data-testid="movement-quality-progress"
          />
        </div>

        {/* Quick Status */}
        {faultAnalysis.detectedFaults.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Excellent movement quality! No significant biomechanical issues detected.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className={hasSignificantFaults ? 'border-orange-200 bg-orange-50' : 'border-yellow-200 bg-yellow-50'}>
            <AlertTriangle className={`h-4 w-4 ${hasSignificantFaults ? 'text-orange-600' : 'text-yellow-600'}`} />
            <AlertDescription className={hasSignificantFaults ? 'text-orange-800' : 'text-yellow-800'}>
              {faultAnalysis.detectedFaults.length} movement issue{faultAnalysis.detectedFaults.length > 1 ? 's' : ''} detected that may contribute to pain or injury risk.
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Analysis */}
        {faultAnalysis.detectedFaults.length > 0 && (
          <Tabs defaultValue="faults" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faults">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Issues ({faultAnalysis.detectedFaults.length})
              </TabsTrigger>
              <TabsTrigger value="clinical">
                <Heart className="h-4 w-4 mr-1" />
                Clinical
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Lightbulb className="h-4 w-4 mr-1" />
                Fixes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faults" className="space-y-3 mt-4">
              {faultAnalysis.detectedFaults.map((fault, index) => (
                <div 
                  key={`${fault.type}-${index}`} 
                  className="border rounded-lg p-3 space-y-2"
                  data-testid={`fault-${fault.type}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(fault.severity)}
                      <span className="font-medium">{getFaultDisplayName(fault.type)}</span>
                    </div>
                    <Badge className={getSeverityColor(fault.severity)}>
                      {fault.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {fault.description}
                  </p>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Measured: {fault.measurementValue.toFixed(1)}°
                    </span>
                    <span>
                      Normal: {fault.normalRange.min}-{fault.normalRange.max}°
                    </span>
                    <span>
                      Confidence: {(fault.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {fault.affectedJoints.map(joint => (
                      <Badge key={joint} variant="outline" className="text-xs">
                        {joint.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="clinical" className="space-y-3 mt-4">
              {/* Primary Concerns */}
              {faultAnalysis.clinicalInsights.primaryConcerns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Potential Symptoms
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.primaryConcerns.map((concern, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        {concern}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {faultAnalysis.clinicalInsights.riskFactors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    Injury Risks
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compensation Patterns */}
              {faultAnalysis.clinicalInsights.compensationPatterns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Compensation Patterns
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.compensationPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        {pattern}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {faultAnalysis.clinicalInsights.primaryConcerns.length === 0 && 
               faultAnalysis.clinicalInsights.riskFactors.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No significant clinical concerns identified
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-3 mt-4">
              {/* Immediate Corrections */}
              {faultAnalysis.recommendations.immediateCorrections.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Immediate Corrections
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.immediateCorrections.map((correction, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        {correction}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Targets */}
              {faultAnalysis.recommendations.exerciseTargets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Exercise Focus Areas
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.exerciseTargets.map((target, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        {target}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Suggestions */}
              {faultAnalysis.recommendations.referralSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Professional Consultation
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.referralSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {faultAnalysis.recommendations.immediateCorrections.length === 0 && 
               faultAnalysis.recommendations.exerciseTargets.length === 0 && 
               faultAnalysis.recommendations.referralSuggestions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No specific recommendations at this time
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Educational Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Clinical Note</p>
              <p>
                This analysis identifies biomechanical patterns that may contribute to symptoms or injury risk. 
                Consult with a qualified healthcare professional for comprehensive assessment and treatment planning.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}