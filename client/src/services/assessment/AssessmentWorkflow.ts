import { PositionDetector, type PositionInfo } from '../movement/PositionDetector';
import { MovementAnalyzer, type MovementMetrics } from '../movement/MovementAnalyzer';
import type { NormalizedLandmark } from '@mediapipe/pose';

export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  requiredPosition: {
    posture: 'standing' | 'sitting' | 'lying';
    orientation: 'frontal' | 'sagittal-left' | 'sagittal-right' | 'posterior';
  };
  duration: number; // seconds
  completed: boolean;
  data?: MovementMetrics;
  instructions: string[];
  clinicalFocus: string[];
}

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: AssessmentStep[];
  overallProgress: number;
  estimatedTimeRemaining: number;
}

export interface AssessmentResult {
  workflowId: string;
  patientId?: string;
  startTime: number;
  endTime?: number;
  steps: AssessmentStep[];
  overallFindings: string[];
  recommendations: string[];
  nextAssessment?: string;
}

export class AssessmentWorkflow {
  private positionDetector: PositionDetector;
  private movementAnalyzer: MovementAnalyzer;
  private currentWorkflow: AssessmentStep[];
  private currentStepIndex: number = 0;
  private workflowId: string;
  private startTime: number;
  private stepStartTime: number = 0;

  constructor() {
    this.positionDetector = new PositionDetector();
    this.movementAnalyzer = new MovementAnalyzer();
    this.workflowId = this.generateWorkflowId();
    this.startTime = Date.now();
    this.currentWorkflow = this.createStandardAssessmentWorkflow();
  }

  /**
   * Create standard physiotherapy assessment workflow
   */
  private createStandardAssessmentWorkflow(): AssessmentStep[] {
    return [
      {
        id: 'standing-frontal',
        title: 'Standing Frontal Assessment',
        description: 'Basic postural assessment from the front',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 30,
        completed: false,
        instructions: [
          'Stand naturally with feet hip-width apart',
          'Look straight ahead at the camera',
          'Let arms hang naturally at sides',
          'Hold steady for complete analysis'
        ],
        clinicalFocus: [
          'Shoulder level symmetry',
          'Hip level alignment',
          'Lateral trunk shift',
          'Weight distribution'
        ]
      },
      {
        id: 'standing-sagittal',
        title: 'Standing Sagittal Assessment',
        description: 'Spinal alignment and posture from the side',
        requiredPosition: {
          posture: 'standing',
          orientation: 'sagittal-left'
        },
        duration: 30,
        completed: false,
        instructions: [
          'Turn sideways (left side facing camera)',
          'Stand naturally with normal posture',
          'Look straight ahead (not at camera)',
          'Maintain relaxed, natural alignment'
        ],
        clinicalFocus: [
          'Cervical lordosis',
          'Thoracic kyphosis',
          'Lumbar lordosis',
          'Head forward posture',
          'Anterior pelvic tilt'
        ]
      },
      {
        id: 'standing-posterior',
        title: 'Standing Posterior Assessment',
        description: 'Back view assessment for spinal alignment',
        requiredPosition: {
          posture: 'standing',
          orientation: 'posterior'
        },
        duration: 30,
        completed: false,
        instructions: [
          'Turn around (back facing camera)',
          'Stand naturally with feet hip-width apart',
          'Keep arms at sides',
          'Maintain normal standing posture'
        ],
        clinicalFocus: [
          'Spinal alignment',
          'Scapular position',
          'Pelvic symmetry',
          'Leg length discrepancy indicators'
        ]
      },
      {
        id: 'sitting-frontal',
        title: 'Sitting Frontal Assessment',
        description: 'Seated posture assessment',
        requiredPosition: {
          posture: 'sitting',
          orientation: 'frontal'
        },
        duration: 20,
        completed: false,
        instructions: [
          'Sit in a chair with feet flat on floor',
          'Sit up straight but naturally',
          'Face the camera directly',
          'Hands resting on thighs'
        ],
        clinicalFocus: [
          'Seated posture quality',
          'Trunk symmetry',
          'Shoulder positioning',
          'Head-neck alignment'
        ]
      },
      {
        id: 'movement-screen',
        title: 'Functional Movement Screen',
        description: 'Basic movement patterns and range of motion',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 60,
        completed: false,
        instructions: [
          'Perform shoulder elevation (raise arms overhead)',
          'Neck rotation left and right',
          'Trunk side bending',
          'Hold each position for 3-5 seconds'
        ],
        clinicalFocus: [
          'Shoulder range of motion',
          'Cervical rotation',
          'Trunk flexibility',
          'Movement quality'
        ]
      }
    ];
  }

  /**
   * Process current frame and update workflow
   */
  processFrame(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): {
    position: PositionInfo;
    isCorrectPosition: boolean;
    guidance: string;
    progress: WorkflowProgress;
  } {
    const position = this.positionDetector.detectPosition(landmarks, width, height);
    const currentStep = this.getCurrentStep();
    
    if (!currentStep) {
      return {
        position,
        isCorrectPosition: false,
        guidance: 'Assessment workflow completed',
        progress: this.getProgress()
      };
    }

    const isCorrectPosition = this.isInCorrectPosition(position, currentStep);
    const guidance = this.getPositionGuidance(position, currentStep, isCorrectPosition);

    // Auto-advance step if in correct position for minimum duration
    if (isCorrectPosition && this.stepStartTime === 0) {
      this.stepStartTime = Date.now();
    } else if (!isCorrectPosition) {
      this.stepStartTime = 0;
    }

    // Check if step should be completed
    if (isCorrectPosition && this.stepStartTime > 0) {
      const stepDuration = (Date.now() - this.stepStartTime) / 1000;
      if (stepDuration >= currentStep.duration) {
        this.completeCurrentStep(landmarks, width, height);
      }
    }

    return {
      position,
      isCorrectPosition,
      guidance,
      progress: this.getProgress()
    };
  }

  /**
   * Check if current position matches required position
   */
  private isInCorrectPosition(position: PositionInfo, step: AssessmentStep): boolean {
    const positionMatch = position.posture.type === step.requiredPosition.posture;
    const orientationMatch = this.isOrientationMatch(
      position.orientation.type, 
      step.requiredPosition.orientation
    );
    
    return positionMatch && orientationMatch && 
           position.posture.confidence > 0.7 && 
           position.orientation.confidence > 0.6;
  }

  /**
   * Check orientation match with flexibility for sagittal views
   */
  private isOrientationMatch(current: string, required: string): boolean {
    if (required === 'sagittal-left' || required === 'sagittal-right') {
      return current.includes('sagittal');
    }
    return current === required;
  }

  /**
   * Get position guidance for current step
   */
  private getPositionGuidance(
    position: PositionInfo, 
    step: AssessmentStep, 
    isCorrect: boolean
  ): string {
    if (isCorrect) {
      const timeRemaining = Math.max(0, step.duration - (Date.now() - this.stepStartTime) / 1000);
      return `Perfect! Hold this position for ${timeRemaining.toFixed(0)} more seconds.`;
    }

    const { posture, orientation } = step.requiredPosition;
    
    // Position-specific guidance
    if (position.posture.type !== posture) {
      if (posture === 'sitting' && position.posture.type === 'standing') {
        return 'Please sit down in a chair for the next assessment.';
      }
      if (posture === 'standing' && position.posture.type === 'sitting') {
        return 'Please stand up for the next assessment.';
      }
      return `Please move to ${posture} position.`;
    }

    // Orientation guidance
    if (orientation === 'frontal' && !position.orientation.type.includes('frontal')) {
      return 'Please face the camera directly.';
    }
    if (orientation.includes('sagittal') && !position.orientation.type.includes('sagittal')) {
      return 'Please turn sideways to the camera.';
    }
    if (orientation === 'posterior' && !position.orientation.type.includes('posterior')) {
      return 'Please turn around with your back to the camera.';
    }

    return 'Please adjust your position according to the instructions.';
  }

  /**
   * Complete current step and advance workflow
   */
  private completeCurrentStep(landmarks: NormalizedLandmark[], width: number, height: number): void {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // Capture movement metrics for this step
    const position = this.positionDetector.detectPosition(landmarks, width, height);
    const metrics = this.movementAnalyzer.analyzeMovement(landmarks, width, height);

    currentStep.completed = true;
    currentStep.data = metrics;
    this.currentStepIndex++;
    this.stepStartTime = 0;
  }

  /**
   * Get current step
   */
  getCurrentStep(): AssessmentStep | null {
    if (this.currentStepIndex >= this.currentWorkflow.length) {
      return null;
    }
    return this.currentWorkflow[this.currentStepIndex];
  }

  /**
   * Get workflow progress
   */
  getProgress(): WorkflowProgress {
    const completedSteps = this.currentWorkflow.filter(step => step.completed);
    const totalDuration = this.currentWorkflow.reduce((sum, step) => sum + step.duration, 0);
    const completedDuration = completedSteps.reduce((sum, step) => sum + step.duration, 0);
    
    return {
      currentStep: this.currentStepIndex + 1,
      totalSteps: this.currentWorkflow.length,
      completedSteps,
      overallProgress: (completedSteps.length / this.currentWorkflow.length) * 100,
      estimatedTimeRemaining: totalDuration - completedDuration
    };
  }

  /**
   * Skip current step (for flexibility)
   */
  skipCurrentStep(): void {
    const currentStep = this.getCurrentStep();
    if (currentStep) {
      currentStep.completed = true;
      this.currentStepIndex++;
      this.stepStartTime = 0;
    }
  }

  /**
   * Go back to previous step
   */
  goToPreviousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentWorkflow[this.currentStepIndex - 1].completed = false;
      this.currentStepIndex--;
      this.stepStartTime = 0;
    }
  }

  /**
   * Check if workflow is complete
   */
  isComplete(): boolean {
    return this.currentStepIndex >= this.currentWorkflow.length;
  }

  /**
   * Generate assessment result
   */
  generateResult(): AssessmentResult {
    const completedSteps = this.currentWorkflow.filter(step => step.completed);
    const overallFindings: string[] = [];
    const recommendations: string[] = [];

    // Analyze completed steps for findings
    completedSteps.forEach(step => {
      if (step.data) {
        // Extract key findings from each step
        if (step.data.posture?.score < 7) {
          overallFindings.push(`${step.title}: Postural concerns identified`);
        }
        if (step.data.balance?.status === 'unstable') {
          overallFindings.push(`${step.title}: Balance instability detected`);
        }
        if (step.data.symmetry && (
          step.data.symmetry.shoulder.status !== 'level' || 
          step.data.symmetry.hip.status !== 'level'
        )) {
          overallFindings.push(`${step.title}: Asymmetry detected`);
        }
      }
    });

    // Generate recommendations based on findings
    if (overallFindings.some(f => f.includes('Postural concerns'))) {
      recommendations.push('Consider postural correction exercises');
      recommendations.push('Ergonomic assessment recommended');
    }
    if (overallFindings.some(f => f.includes('Balance instability'))) {
      recommendations.push('Balance training program advised');
      recommendations.push('Fall risk assessment');
    }
    if (overallFindings.some(f => f.includes('Asymmetry'))) {
      recommendations.push('Detailed asymmetry assessment required');
      recommendations.push('Consider underlying structural issues');
    }

    return {
      workflowId: this.workflowId,
      startTime: this.startTime,
      endTime: Date.now(),
      steps: [...this.currentWorkflow],
      overallFindings,
      recommendations,
      nextAssessment: 'Consider functional movement assessment'
    };
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset workflow to beginning
   */
  reset(): void {
    this.currentStepIndex = 0;
    this.stepStartTime = 0;
    this.startTime = Date.now();
    this.workflowId = this.generateWorkflowId();
    this.currentWorkflow.forEach(step => {
      step.completed = false;
      step.data = undefined;
    });
  }

  /**
   * Get all workflow steps
   */
  getAllSteps(): AssessmentStep[] {
    return [...this.currentWorkflow];
  }
}