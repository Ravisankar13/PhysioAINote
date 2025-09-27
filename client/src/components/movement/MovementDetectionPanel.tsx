import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Target, 
  Timer, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RotateCw,
  BarChart3,
  Zap
} from 'lucide-react';
import type { MovementSequence, MovementPattern, MovementType } from '@/services/movement/MovementClassifier';

interface MovementDetectionPanelProps {
  movementSequence: MovementSequence;
  onResetSession: () => void;
  isActive: boolean;
}

const MovementTypeLabels: Record<MovementType, string> = {
  squat: 'Squat',
  lunge: 'Lunge',
  single_leg_stand: 'Single Leg Stand',
  jumping: 'Jumping',
  twisting: 'Twisting',
  sit_to_stand: 'Sit to Stand',
  step_up: 'Step Up',
  heel_raises: 'Heel Raises',
  arm_raise: 'Arm Raises',
  walking: 'Walking',
  static: 'Static Position',
  unknown: 'Unknown Movement'
};

const MovementTypeIcons: Record<MovementType, JSX.Element> = {
  squat: <Target className="h-4 w-4" />,
  lunge: <Activity className="h-4 w-4" />,
  single_leg_stand: <Zap className="h-4 w-4" />,
  jumping: <TrendingUp className="h-4 w-4" />,
  twisting: <RotateCw className="h-4 w-4" />,
  sit_to_stand: <Activity className="h-4 w-4" />,
  step_up: <TrendingUp className="h-4 w-4" />,
  heel_raises: <Activity className="h-4 w-4" />,
  arm_raise: <Activity className="h-4 w-4" />,
  walking: <Activity className="h-4 w-4" />,
  static: <Timer className="h-4 w-4" />,
  unknown: <AlertTriangle className="h-4 w-4" />
};

export function MovementDetectionPanel({ 
  movementSequence, 
  onResetSession, 
  isActive 
}: MovementDetectionPanelProps) {
  const { currentMovement, sessionStats } = movementSequence;

  if (!isActive) {
    return (
      <Card className="w-full" data-testid="movement-detection-inactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Movement Detection
          </CardTitle>
          <CardDescription>
            Real-time exercise and movement classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start tracking to detect movements</p>
            <p className="text-sm mt-2">
              System will automatically identify squats, lunges, jumps, and more
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="movement-detection-active">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Live Movement Detection
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetSession}
            data-testid="button-reset-session"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        <CardDescription>
          AI-powered movement classification and coaching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Movement */}
        <div>
          <h4 className="font-medium mb-3">Current Movement</h4>
          {currentMovement ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {MovementTypeIcons[currentMovement.type]}
                  <span className="font-medium">
                    {MovementTypeLabels[currentMovement.type]}
                  </span>
                </div>
                <Badge 
                  variant={getPhaseVariant(currentMovement.phase)}
                  data-testid={`badge-phase-${currentMovement.phase}`}
                >
                  {currentMovement.phase}
                </Badge>
              </div>

              {/* Movement Quality */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Movement Quality</span>
                  <span className="font-mono">
                    {currentMovement.quality.score.toFixed(1)}/10
                  </span>
                </div>
                <Progress 
                  value={currentMovement.quality.score * 10} 
                  className="h-2"
                  data-testid="progress-movement-quality"
                />
                <div className="flex items-center gap-1 text-sm">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      currentMovement.quality.score >= 8 ? 'bg-green-500' : 
                      currentMovement.quality.score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {getQualityDescription(currentMovement.quality.score)}
                  </span>
                </div>
              </div>

              {/* Confidence */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Detection Confidence</span>
                  <span className="font-mono">
                    {Math.round(currentMovement.confidence * 100)}%
                  </span>
                </div>
                <Progress 
                  value={currentMovement.confidence * 100} 
                  className="h-2"
                  data-testid="progress-detection-confidence"
                />
              </div>

              {/* Repetition Count */}
              {currentMovement.repetitionCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Repetitions</span>
                  <Badge variant="outline" data-testid="badge-rep-count">
                    {currentMovement.repetitionCount}
                  </Badge>
                </div>
              )}

              {/* Movement Issues & Recommendations */}
              {currentMovement.quality.issues.length > 0 && (
                <Alert className="border-orange-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Form Issues Detected:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {currentMovement.quality.issues.map((issue, index) => (
                          <li key={index} data-testid={`issue-${index}`}>
                            {issue}
                          </li>
                        ))}
                      </ul>
                      {currentMovement.quality.recommendations.length > 0 && (
                        <>
                          <p className="font-medium mt-3">Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {currentMovement.quality.recommendations.map((rec, index) => (
                              <li key={index} data-testid={`recommendation-${index}`}>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Timer className="h-8 w-8 mx-auto mb-2" />
              <p>No active movement detected</p>
              <p className="text-sm">Start moving to begin classification</p>
            </div>
          )}
        </div>

        {/* Session Statistics */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Session Statistics
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-total-movements">
                {sessionStats.totalMovements}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Movements
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-avg-quality">
                {sessionStats.averageQuality.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Quality
              </div>
            </div>
          </div>

          {/* Movement Breakdown */}
          {Object.entries(sessionStats.movementBreakdown)
            .filter(([_, count]) => count > 0)
            .length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Movement Breakdown:</p>
              <div className="space-y-2">
                {Object.entries(sessionStats.movementBreakdown)
                  .filter(([_, count]) => count > 0)
                  .map(([movement, count]) => (
                    <div 
                      key={movement} 
                      className="flex items-center justify-between text-sm"
                      data-testid={`movement-stat-${movement}`}
                    >
                      <div className="flex items-center gap-2">
                        {MovementTypeIcons[movement as MovementType]}
                        <span>{MovementTypeLabels[movement as MovementType]}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Movements */}
        {movementSequence.movements.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Recent Movements</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {movementSequence.movements.slice(-5).reverse().map((movement, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                  data-testid={`recent-movement-${index}`}
                >
                  <div className="flex items-center gap-2">
                    {MovementTypeIcons[movement.type]}
                    <span>{MovementTypeLabels[movement.type]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(movement.duration / 1000)}s
                    </Badge>
                    <div className="flex items-center gap-1">
                      {movement.quality.score >= 8 ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : movement.quality.score >= 6 ? (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs">
                        {movement.quality.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getPhaseVariant(phase: string): "default" | "secondary" | "destructive" | "outline" {
  switch (phase) {
    case 'preparation':
      return 'outline';
    case 'execution':
      return 'default';
    case 'completion':
      return 'secondary';
    case 'hold':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getQualityDescription(score: number): string {
  if (score >= 9) return 'Excellent form';
  if (score >= 7) return 'Good form';
  if (score >= 5) return 'Fair form';
  return 'Needs improvement';
}