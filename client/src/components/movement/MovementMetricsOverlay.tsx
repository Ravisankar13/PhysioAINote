/**
 * Real-time Movement Metrics Overlay
 * Displays live movement analysis with role-based views
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, 
  User, 
  Stethoscope, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Play,
  Square,
  BarChart3,
  Timer
} from 'lucide-react';
import { MovementMetrics } from '@/services/movement/MovementAnalyzer';

type SessionStatus = 'idle' | 'active' | 'completed';

interface SessionData {
  id: string;
  startTime: Date;
  endTime: Date | null;
  baselineMetrics: MovementMetrics | null;
  finalMetrics: MovementMetrics | null;
  improvements: {
    posture: number;
    balance: number;
    symmetry: number;
  } | null;
}

interface MovementMetricsOverlayProps {
  metrics: MovementMetrics | null;
  isVisible: boolean;
  userType: 'physiotherapist' | 'patient';
  onUserTypeChange: (type: 'physiotherapist' | 'patient') => void;
  onToggleVisibility: () => void;
}

export function MovementMetricsOverlay({
  metrics,
  isVisible,
  userType,
  onUserTypeChange,
  onToggleVisibility
}: MovementMetricsOverlayProps) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Timer for session duration
  useEffect(() => {
    if (sessionStatus === 'active' && currentSession) {
      const interval = setInterval(() => {
        setSessionDuration(Date.now() - currentSession.startTime.getTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStatus, currentSession]);

  const startSession = () => {
    if (!metrics) return;
    
    const session: SessionData = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      endTime: null,
      baselineMetrics: { ...metrics },
      finalMetrics: null,
      improvements: null
    };
    
    setCurrentSession(session);
    setSessionStatus('active');
    setSessionDuration(0);
  };

  const endSession = () => {
    if (!currentSession || !metrics) return;
    
    const improvements = {
      posture: metrics.posture.score - (currentSession.baselineMetrics?.posture.score || 0),
      balance: metrics.balance.score - (currentSession.baselineMetrics?.balance.score || 0),
      symmetry: calculateSymmetryImprovement(metrics, currentSession.baselineMetrics!)
    };
    
    const updatedSession: SessionData = {
      ...currentSession,
      endTime: new Date(),
      finalMetrics: { ...metrics },
      improvements
    };
    
    setCurrentSession(updatedSession);
    setSessionStatus('completed');
  };

  const resetSession = () => {
    setCurrentSession(null);
    setSessionStatus('idle');
    setSessionDuration(0);
  };

  if (!isVisible || !metrics) return null;

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[90vh] overflow-y-auto z-20">
      <Card className="bg-white/95 backdrop-blur-md border-gray-200 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Movement Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Session Controls */}
          {userType === 'physiotherapist' && (
            <div className="flex items-center gap-2 mb-3">
              {sessionStatus === 'idle' && (
                <Button size="sm" onClick={startSession} className="gap-2">
                  <Play className="h-3 w-3" />
                  Start Session
                </Button>
              )}
              {sessionStatus === 'active' && (
                <div className="flex items-center gap-2 flex-1">
                  <Button size="sm" onClick={endSession} variant="destructive" className="gap-2">
                    <Square className="h-3 w-3" />
                    End Session
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Timer className="h-3 w-3" />
                    {formatDuration(sessionDuration)}
                  </div>
                </div>
              )}
              {sessionStatus === 'completed' && (
                <Button size="sm" onClick={resetSession} variant="outline" className="gap-2">
                  <BarChart3 className="h-3 w-3" />
                  New Session
                </Button>
              )}
            </div>
          )}
          
          {/* Role Toggle */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>Patient</span>
            <Switch
              checked={userType === 'physiotherapist'}
              onCheckedChange={(checked) => 
                onUserTypeChange(checked ? 'physiotherapist' : 'patient')
              }
            />
            <span>Physio</span>
            <Stethoscope className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {sessionStatus === 'completed' && currentSession && userType === 'physiotherapist' && (
            <SessionSummary session={currentSession} />
          )}
          
          {userType === 'physiotherapist' ? (
            <PhysiotherapistView metrics={metrics} />
          ) : (
            <PatientView metrics={metrics} sessionStatus={sessionStatus} improvements={currentSession?.improvements} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PhysiotherapistView({ metrics }: { metrics: MovementMetrics }) {
  return (
    <div className="space-y-4">
      {/* Posture Analysis */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Posture Analysis
            <StatusIcon status={metrics.posture.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Score:</span>
            <span className="font-mono text-sm">{metrics.posture.score.toFixed(1)}/10</span>
          </div>
          <Progress value={metrics.posture.score * 10} className="h-2" />
          
          <div className="text-xs space-y-1 text-gray-600">
            <div>Head Forward: {metrics.posture.headForwardAngle.toFixed(1)}°</div>
            <div>Shoulder Diff: {metrics.posture.shoulderSymmetry.toFixed(1)}mm</div>
          </div>
          
          <div className="text-xs bg-gray-50 p-2 rounded">
            {metrics.posture.feedback}
          </div>
        </CardContent>
      </Card>

      {/* Balance Analysis */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Balance & Stability
            <StatusIcon status={metrics.balance.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Score:</span>
            <span className="font-mono text-sm">{metrics.balance.score.toFixed(1)}/10</span>
          </div>
          <Progress value={metrics.balance.score * 10} className="h-2" />
          
          <div className="text-xs space-y-1 text-gray-600">
            <div>Sway: {metrics.balance.sway.toFixed(1)}mm</div>
            <div>CoG: ({metrics.balance.centerOfGravity.x.toFixed(0)}, {metrics.balance.centerOfGravity.y.toFixed(0)})</div>
          </div>
        </CardContent>
      </Card>

      {/* Symmetry Analysis */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bilateral Symmetry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-medium">Shoulders</div>
              <div>L: {metrics.symmetry.shoulder.leftHeight.toFixed(0)}px</div>
              <div>R: {metrics.symmetry.shoulder.rightHeight.toFixed(0)}px</div>
              <div>Diff: {metrics.symmetry.shoulder.difference.toFixed(1)}mm</div>
              <Badge variant={getSymmetryVariant(metrics.symmetry.shoulder.status)} className="text-xs">
                {metrics.symmetry.shoulder.status}
              </Badge>
            </div>
            <div>
              <div className="font-medium">Hips</div>
              <div>L: {metrics.symmetry.hip.leftHeight.toFixed(0)}px</div>
              <div>R: {metrics.symmetry.hip.rightHeight.toFixed(0)}px</div>
              <div>Diff: {metrics.symmetry.hip.difference.toFixed(1)}mm</div>
              <Badge variant={getSymmetryVariant(metrics.symmetry.hip.status)} className="text-xs">
                {metrics.symmetry.hip.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Range of Motion */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Range of Motion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Shoulder Flexion</span>
              <span>{metrics.rangeOfMotion.shoulderFlexion.percentage.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.rangeOfMotion.shoulderFlexion.percentage} className="h-1" />
            
            <div className="flex justify-between">
              <span>Neck Rotation</span>
              <span>{metrics.rangeOfMotion.neckRotation.percentage.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.rangeOfMotion.neckRotation.percentage} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionSummary({ session }: { session: SessionData }) {
  if (!session.improvements) return null;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Session Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-gray-600">
          Duration: {formatDuration(session.endTime!.getTime() - session.startTime.getTime())}
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">Posture</div>
            <div className={`flex items-center justify-center gap-1 ${session.improvements.posture >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {session.improvements.posture >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(session.improvements.posture).toFixed(1)}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Balance</div>
            <div className={`flex items-center justify-center gap-1 ${session.improvements.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {session.improvements.balance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(session.improvements.balance).toFixed(1)}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Symmetry</div>
            <div className={`flex items-center justify-center gap-1 ${session.improvements.symmetry >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {session.improvements.symmetry >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(session.improvements.symmetry).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientView({ 
  metrics, 
  sessionStatus, 
  improvements 
}: { 
  metrics: MovementMetrics;
  sessionStatus: SessionStatus;
  improvements?: { posture: number; balance: number; symmetry: number } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="text-center border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {((metrics.posture.score + metrics.balance.score) / 2).toFixed(1)}
          </div>
          <div className="text-sm text-blue-700 mb-3">Overall Movement Score</div>
          <Progress 
            value={((metrics.posture.score + metrics.balance.score) / 2) * 10} 
            className="h-3"
          />
          <div className="text-xs text-blue-600 mt-2">
            {getOverallFeedback((metrics.posture.score + metrics.balance.score) / 2)}
          </div>
        </CardContent>
      </Card>

      {/* Simple Status Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className={`text-center ${getStatusBgColor(metrics.posture.status)}`}>
          <CardContent className="pt-3 pb-3">
            <div className="text-2xl mb-1">{getStatusEmoji(metrics.posture.status)}</div>
            <div className="text-sm font-medium">Posture</div>
            <div className="text-xs capitalize">{metrics.posture.status}</div>
          </CardContent>
        </Card>

        <Card className={`text-center ${getStatusBgColor(metrics.balance.status)}`}>
          <CardContent className="pt-3 pb-3">
            <div className="text-2xl mb-1">{getBalanceEmoji(metrics.balance.status)}</div>
            <div className="text-sm font-medium">Balance</div>
            <div className="text-xs capitalize">{metrics.balance.status}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Flexibility</span>
              <span>{metrics.rangeOfMotion.shoulderFlexion.percentage.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.rangeOfMotion.shoulderFlexion.percentage} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Stability</span>
              <span>{(metrics.balance.score * 10).toFixed(0)}%</span>
            </div>
            <Progress value={metrics.balance.score * 10} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Encouragement */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Keep it up!</span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            {getEncouragementMessage(metrics)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'excellent':
    case 'good':
    case 'stable':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'fair':
    case 'moderate':
      return <Info className="h-4 w-4 text-yellow-500" />;
    case 'poor':
    case 'unstable':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
}

function getSymmetryVariant(status: string) {
  switch (status) {
    case 'level': return 'default';
    case 'slight': return 'secondary';
    case 'significant': return 'destructive';
    default: return 'default';
  }
}

function getStatusBgColor(status: string) {
  switch (status) {
    case 'excellent':
    case 'good':
    case 'stable':
      return 'bg-green-50 border-green-200';
    case 'fair':
    case 'moderate':
      return 'bg-yellow-50 border-yellow-200';
    case 'poor':
    case 'unstable':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function getStatusEmoji(status: string) {
  switch (status) {
    case 'excellent': return '🌟';
    case 'good': return '😊';
    case 'fair': return '😐';
    case 'poor': return '😟';
    default: return '📊';
  }
}

function getBalanceEmoji(status: string) {
  switch (status) {
    case 'stable': return '⚖️';
    case 'moderate': return '🤏';
    case 'unstable': return '🔄';
    default: return '📊';
  }
}

function getOverallFeedback(score: number) {
  if (score >= 8.5) return 'Excellent movement quality! 🌟';
  if (score >= 7) return 'Good progress, keep it up! 👍';
  if (score >= 5) return 'Making improvements! 📈';
  return 'Let\'s work together on this! 💪';
}

function getEncouragementMessage(metrics: MovementMetrics) {
  const messages = [
    'Your posture is looking better today!',
    'Great balance work - you\'re getting stronger!',
    'Keep up the excellent progress!',
    'Small improvements add up to big changes!',
    'You\'re doing amazing - consistency is key!'
  ];
  
  // Pick message based on scores
  const avgScore = (metrics.posture.score + metrics.balance.score) / 2;
  const index = Math.floor((avgScore / 10) * messages.length);
  return messages[Math.min(index, messages.length - 1)];
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `0:${remainingSeconds.toString().padStart(2, '0')}`;
}

function calculateSymmetryImprovement(current: MovementMetrics, baseline: MovementMetrics): number {
  // Calculate improvement in symmetry - lower difference is better, so we need to reverse the logic
  const currentSymmetryScore = (
    Math.abs(current.symmetry.shoulder.difference) + 
    Math.abs(current.symmetry.hip.difference)
  ) / 2;
  
  const baselineSymmetryScore = (
    Math.abs(baseline.symmetry.shoulder.difference) + 
    Math.abs(baseline.symmetry.hip.difference)
  ) / 2;
  
  // Improvement = reduction in asymmetry (expressed as percentage)
  const improvement = ((baselineSymmetryScore - currentSymmetryScore) / baselineSymmetryScore) * 100;
  return improvement;
}