import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  SkipForward,
  RotateCw,
  User,
  Target,
  Info
} from 'lucide-react';
import type { AssessmentStep, WorkflowProgress } from '@/services/assessment/AssessmentWorkflow';
import type { PositionInfo } from '@/services/movement/PositionDetector';

interface AssessmentWorkflowPanelProps {
  currentStep: AssessmentStep | null;
  progress: WorkflowProgress;
  position: PositionInfo;
  isCorrectPosition: boolean;
  guidance: string;
  isWorkflowActive: boolean;
  onStartWorkflow: () => void;
  onSkipStep: () => void;
  onPreviousStep: () => void;
  onResetWorkflow: () => void;
}

export function AssessmentWorkflowPanel({
  currentStep,
  progress,
  position,
  isCorrectPosition,
  guidance,
  isWorkflowActive,
  onStartWorkflow,
  onSkipStep,
  onPreviousStep,
  onResetWorkflow
}: AssessmentWorkflowPanelProps) {
  
  if (!isWorkflowActive) {
    return (
      <Card className="w-full" data-testid="assessment-workflow-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Clinical Assessment Workflow
          </CardTitle>
          <CardDescription>
            Guided multi-position assessment for comprehensive clinical evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This workflow will guide you through:
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Standing frontal, sagittal, and posterior views</li>
                <li>Seated postural assessment</li>
                <li>Functional movement screening</li>
              </ul>
            </div>
            <Button 
              onClick={onStartWorkflow} 
              className="w-full"
              data-testid="button-start-workflow"
            >
              Start Assessment Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStep) {
    return (
      <Card className="w-full" data-testid="assessment-workflow-complete">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Assessment Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Comprehensive assessment completed successfully. All {progress.totalSteps} steps finished.
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onResetWorkflow}
                data-testid="button-reset-workflow"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Start New Assessment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="assessment-workflow-active">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Step {progress.currentStep} of {progress.totalSteps}
          </CardTitle>
          <Badge 
            variant={isCorrectPosition ? 'default' : 'secondary'}
            data-testid="badge-position-status"
          >
            {isCorrectPosition ? 'Correct Position' : 'Adjust Position'}
          </Badge>
        </div>
        <CardDescription>{currentStep.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progress.overallProgress)}%</span>
          </div>
          <Progress 
            value={progress.overallProgress} 
            className="w-full"
            data-testid="progress-workflow"
          />
        </div>

        {/* Current Position Status */}
        <Alert className={isCorrectPosition ? 'border-green-500' : 'border-orange-500'}>
          <Info className="h-4 w-4" />
          <AlertDescription data-testid="text-position-guidance">
            {guidance}
          </AlertDescription>
        </Alert>

        {/* Current Step Details */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-sm mb-2">Instructions</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {currentStep.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Circle className="h-3 w-3 mt-1 flex-shrink-0" />
                  {instruction}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-sm mb-2">Clinical Focus</h4>
            <div className="flex flex-wrap gap-1">
              {currentStep.clinicalFocus.map((focus, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs"
                  data-testid={`badge-focus-${index}`}
                >
                  {focus}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Position Requirements */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Required Position</h4>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Posture:</span>{' '}
              <Badge variant="outline">{currentStep.requiredPosition.posture}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">View:</span>{' '}
              <Badge variant="outline">{currentStep.requiredPosition.orientation}</Badge>
            </div>
          </div>
        </div>

        {/* Current Detection Status */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Current Detection</h4>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Detected:</span>{' '}
              <Badge 
                variant={position.posture.type === currentStep.requiredPosition.posture ? 'default' : 'secondary'}
              >
                {position.posture.type} ({Math.round(position.posture.confidence * 100)}%)
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">View:</span>{' '}
              <Badge 
                variant={position.orientation.type.includes(currentStep.requiredPosition.orientation.split('-')[0]) ? 'default' : 'secondary'}
              >
                {position.orientation.type} ({Math.round(position.orientation.confidence * 100)}%)
              </Badge>
            </div>
          </div>
        </div>

        {/* Step Timer */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Hold position for {currentStep.duration} seconds</span>
        </div>

        {/* Navigation Controls */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreviousStep}
            disabled={progress.currentStep === 1}
            data-testid="button-previous-step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSkipStep}
            className="flex-1"
            data-testid="button-skip-step"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip Step
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onResetWorkflow}
            data-testid="button-reset-workflow"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Time Remaining */}
        {progress.estimatedTimeRemaining > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 60)} minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}