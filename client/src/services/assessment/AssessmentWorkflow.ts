import { PositionDetector, type PositionInfo } from '../movement/PositionDetector';
import { MovementAnalyzer, type MovementMetrics } from '../movement/MovementAnalyzer';
import { type MovementSequence, type MovementType } from '../movement/MovementClassifier';
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
  adaptiveFor?: MovementType[]; // Movements this step is specifically designed for
  priority?: 'high' | 'medium' | 'low'; // Priority based on detected movements
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
  detectedMovements?: MovementType[];
  movementAdaptations?: string[];
}

export class AssessmentWorkflow {
  private positionDetector: PositionDetector;
  private movementAnalyzer: MovementAnalyzer;
  private currentWorkflow: AssessmentStep[];
  private currentStepIndex: number = 0;
  private workflowId: string;
  private startTime: number;
  private stepStartTime: number = 0;
  private detectedMovements: Set<MovementType> = new Set();
  private movementSequence: MovementSequence | null = null;
  private isAdaptiveMode: boolean = false;

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
   * Create movement-specific assessment steps based on detected movements
   */
  private createMovementAdaptiveSteps(): AssessmentStep[] {
    const adaptiveSteps: AssessmentStep[] = [];

    // Add squat-specific assessment if squatting detected
    if (this.detectedMovements.has('squat')) {
      adaptiveSteps.push({
        id: 'squat-assessment',
        title: 'Squat Movement Analysis',
        description: 'Detailed assessment of squatting mechanics',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 45,
        completed: false,
        instructions: [
          'Perform 5 bodyweight squats',
          'Focus on controlled descent and ascent',
          'Maintain steady breathing throughout',
          'Hold bottom position for 2 seconds on final rep'
        ],
        clinicalFocus: [
          'Knee valgus/varus alignment',
          'Ankle dorsiflexion mobility',
          'Hip flexion range',
          'Core stability during movement',
          'Balance throughout range'
        ],
        adaptiveFor: ['squat'],
        priority: 'high'
      });
    }

    // Add lunge-specific assessment if lunging detected
    if (this.detectedMovements.has('lunge')) {
      adaptiveSteps.push({
        id: 'lunge-assessment',
        title: 'Lunge Movement Analysis',
        description: 'Assessment of lunge mechanics and stability',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 40,
        completed: false,
        instructions: [
          'Perform 3 forward lunges each leg',
          'Step forward into deep lunge position',
          'Return to standing between each rep',
          'Maintain upright torso throughout'
        ],
        clinicalFocus: [
          'Single leg stability',
          'Hip flexor flexibility',
          'Knee tracking over foot',
          'Dynamic balance control',
          'Core engagement'
        ],
        adaptiveFor: ['lunge'],
        priority: 'high'
      });
    }

    // Add single-leg stand assessment if detected
    if (this.detectedMovements.has('single_leg_stand')) {
      adaptiveSteps.push({
        id: 'balance-assessment',
        title: 'Single Leg Balance Analysis',
        description: 'Comprehensive balance and stability assessment',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 30,
        completed: false,
        instructions: [
          'Stand on right leg for 15 seconds',
          'Stand on left leg for 15 seconds',
          'Keep hands on hips',
          'Focus on a fixed point ahead'
        ],
        clinicalFocus: [
          'Static balance control',
          'Ankle strategy activation',
          'Core stability',
          'Visual dependency',
          'Left-right balance comparison'
        ],
        adaptiveFor: ['single_leg_stand'],
        priority: 'high'
      });
    }

    // Add jumping assessment if jumping movements detected
    if (this.detectedMovements.has('jumping')) {
      adaptiveSteps.push({
        id: 'plyometric-assessment',
        title: 'Jumping Movement Analysis',
        description: 'Assessment of plyometric movement patterns',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 35,
        completed: false,
        instructions: [
          'Perform 3 vertical jumps',
          'Land softly on both feet',
          'Use arm swing for momentum',
          'Pause between each jump'
        ],
        clinicalFocus: [
          'Landing mechanics',
          'Shock absorption',
          'Knee alignment on landing',
          'Power generation',
          'Neuromuscular control'
        ],
        adaptiveFor: ['jumping'],
        priority: 'medium'
      });
    }

    // Add arm raise assessment if detected
    if (this.detectedMovements.has('arm_raise')) {
      adaptiveSteps.push({
        id: 'shoulder-assessment',
        title: 'Shoulder Elevation Analysis',
        description: 'Assessment of shoulder mobility and control',
        requiredPosition: {
          posture: 'standing',
          orientation: 'frontal'
        },
        duration: 25,
        completed: false,
        instructions: [
          'Raise both arms overhead slowly',
          'Hold for 5 seconds at top',
          'Lower arms slowly and controlled',
          'Repeat 3 times'
        ],
        clinicalFocus: [
          'Scapulohumeral rhythm',
          'Shoulder impingement signs',
          'Glenohumeral mobility',
          'Scapular stability',
          'Compensatory movements'
        ],
        adaptiveFor: ['arm_raise'],
        priority: 'medium'
      });
    }

    return adaptiveSteps;
  }

  /**
   * Enable adaptive mode and integrate movement detection
   */
  enableAdaptiveMode(movementSequence?: MovementSequence): void {
    this.isAdaptiveMode = true;
    if (movementSequence) {
      this.updateDetectedMovements(movementSequence);
    }
  }

  /**
   * Disable adaptive mode and return to standard workflow
   */
  disableAdaptiveMode(): void {
    this.isAdaptiveMode = false;
    this.detectedMovements.clear();
    this.rebuildWorkflow();
  }

  /**
   * Update detected movements from movement sequence
   */
  updateDetectedMovements(movementSequence: MovementSequence): void {
    this.movementSequence = movementSequence;
    
    // Add current movement if active
    if (movementSequence.currentMovement) {
      this.detectedMovements.add(movementSequence.currentMovement.type);
    }
    
    // Add movements from recent history (last 10 movements)
    const recentMovements = movementSequence.movements.slice(-10);
    recentMovements.forEach(movement => {
      if (movement.confidence > 0.7) { // Only add high-confidence movements
        this.detectedMovements.add(movement.type);
      }
    });

    // Rebuild workflow if we have significant movement data
    if (this.detectedMovements.size > 0) {
      this.rebuildWorkflow();
    }
  }

  /**
   * Rebuild workflow based on detected movements
   */
  private rebuildWorkflow(): void {
    if (!this.isAdaptiveMode) {
      this.currentWorkflow = this.createStandardAssessmentWorkflow();
      return;
    }

    // Start with standard workflow as base
    const standardSteps = this.createStandardAssessmentWorkflow();
    const adaptiveSteps = this.createMovementAdaptiveSteps();
    
    // Combine and prioritize steps
    const allSteps = [...standardSteps, ...adaptiveSteps];
    
    // Sort by priority (high priority adaptive steps first)
    allSteps.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      const aPriority = a.priority ? priorityOrder[a.priority] : 3;
      const bPriority = b.priority ? priorityOrder[b.priority] : 3;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, prioritize adaptive steps
      const aIsAdaptive = a.adaptiveFor !== undefined;
      const bIsAdaptive = b.adaptiveFor !== undefined;
      
      if (aIsAdaptive && !bIsAdaptive) return -1;
      if (!aIsAdaptive && bIsAdaptive) return 1;
      
      return 0;
    });

    // Update workflow, preserving completed status of existing steps
    const oldWorkflow = this.currentWorkflow;
    this.currentWorkflow = allSteps;
    
    // Restore completion status for matching steps
    this.currentWorkflow.forEach(newStep => {
      const oldStep = oldWorkflow.find(s => s.id === newStep.id);
      if (oldStep) {
        newStep.completed = oldStep.completed;
        newStep.data = oldStep.data;
      }
    });

    // Adjust current step index if workflow changed
    if (this.currentStepIndex >= this.currentWorkflow.length) {
      this.currentStepIndex = Math.max(0, this.currentWorkflow.length - 1);
    }
  }

  /**
   * Get adaptive workflow info
   */
  getAdaptiveInfo(): {
    isAdaptive: boolean;
    detectedMovements: MovementType[];
    adaptiveStepsCount: number;
  } {
    const adaptiveSteps = this.currentWorkflow.filter(step => step.adaptiveFor);
    
    return {
      isAdaptive: this.isAdaptiveMode,
      detectedMovements: Array.from(this.detectedMovements),
      adaptiveStepsCount: adaptiveSteps.length
    };
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

    // Add movement-specific findings and recommendations
    const movementAdaptations: string[] = [];
    const detectedMovements = Array.from(this.detectedMovements);
    
    if (this.isAdaptiveMode && detectedMovements.length > 0) {
      movementAdaptations.push(`Detected movements: ${detectedMovements.join(', ')}`);
      
      // Add movement-specific recommendations
      if (detectedMovements.includes('squat')) {
        recommendations.push('Focus on squat depth and knee tracking improvements');
        recommendations.push('Consider hip mobility and ankle flexibility assessment');
      }
      if (detectedMovements.includes('lunge')) {
        recommendations.push('Evaluate single-leg stability and balance training');
        recommendations.push('Assess hip flexor flexibility and core strength');
      }
      if (detectedMovements.includes('single_leg_stand')) {
        recommendations.push('Implement progressive balance training program');
        recommendations.push('Consider proprioceptive and vestibular training');
      }
      if (detectedMovements.includes('jumping')) {
        recommendations.push('Focus on landing mechanics and shock absorption');
        recommendations.push('Evaluate plyometric readiness and progression');
      }
    }

    return {
      workflowId: this.workflowId,
      startTime: this.startTime,
      endTime: Date.now(),
      steps: [...this.currentWorkflow],
      overallFindings,
      recommendations,
      nextAssessment: this.isAdaptiveMode 
        ? 'Continue movement-specific interventions based on detected patterns'
        : 'Consider functional movement assessment',
      detectedMovements,
      movementAdaptations
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