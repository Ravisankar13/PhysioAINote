/**
 * Dynamic Movement Classification System
 * Identifies specific exercises and movements using temporal pose analysis
 */

import type { NormalizedLandmark } from '@mediapipe/pose';

export type MovementType = 
  | 'squat' 
  | 'lunge' 
  | 'single_leg_stand' 
  | 'jumping' 
  | 'twisting' 
  | 'sit_to_stand' 
  | 'step_up' 
  | 'heel_raises' 
  | 'arm_raise' 
  | 'walking' 
  | 'static' 
  | 'unknown';

export interface MovementFrame {
  landmarks: NormalizedLandmark[];
  timestamp: number;
  jointAngles: {
    leftKnee: number;
    rightKnee: number;
    leftHip: number;
    rightHip: number;
    leftAnkle: number;
    rightAnkle: number;
    leftShoulder: number;
    rightShoulder: number;
  };
  bodyPosition: {
    centerOfMass: { x: number; y: number };
    baseOfSupport: { x: number; y: number; width: number };
    hipHeight: number;
    shoulderLevel: number;
  };
}

export interface MovementPattern {
  type: MovementType;
  confidence: number;
  phase: 'preparation' | 'execution' | 'completion' | 'hold';
  repetitionCount: number;
  quality: {
    score: number; // 0-10
    issues: string[];
    recommendations: string[];
  };
  duration: number;
  range: {
    maxKneeFlexion: number;
    maxHipFlexion: number;
    verticalDisplacement: number;
  };
}

export interface MovementSequence {
  movements: MovementPattern[];
  currentMovement: MovementPattern | null;
  transitionInProgress: boolean;
  sessionStats: {
    totalMovements: number;
    movementBreakdown: Record<MovementType, number>;
    averageQuality: number;
    totalDuration: number;
  };
}

export class MovementClassifier {
  private frameHistory: MovementFrame[] = [];
  private maxHistoryLength = 150; // ~5 seconds at 30fps
  private currentSequence: MovementSequence;
  private movementThresholds: Record<string, number>;
  private lastMovementDetection: MovementType = 'static';
  private movementStartTime: number = 0;
  private repetitionTracker: Map<MovementType, number> = new Map();

  constructor() {
    this.currentSequence = {
      movements: [],
      currentMovement: null,
      transitionInProgress: false,
      sessionStats: {
        totalMovements: 0,
        movementBreakdown: {} as Record<MovementType, number>,
        averageQuality: 0,
        totalDuration: 0
      }
    };

    // Movement detection thresholds
    this.movementThresholds = {
      minSquatDepth: 90, // degrees knee flexion
      minLungeDepth: 80,
      singleLegBalance: 0.15, // weight distribution threshold
      jumpVelocity: 0.02, // vertical velocity threshold
      twistAngle: 15, // degrees of trunk rotation
      armRaiseAngle: 45, // shoulder elevation
      movementVelocity: 0.001, // minimum movement to detect
      stabilityTime: 1000 // ms to hold for "hold" phase
    };

    // Initialize movement counters
    const movementTypes: MovementType[] = [
      'squat', 'lunge', 'single_leg_stand', 'jumping', 'twisting', 
      'sit_to_stand', 'step_up', 'heel_raises', 'arm_raise', 'walking'
    ];
    movementTypes.forEach(type => {
      this.repetitionTracker.set(type, 0);
      this.currentSequence.sessionStats.movementBreakdown[type] = 0;
    });
  }

  /**
   * Process new pose frame and classify movement
   */
  processFrame(landmarks: NormalizedLandmark[], timestamp: number): MovementSequence {
    // Create movement frame with extracted features
    const frame = this.createMovementFrame(landmarks, timestamp);
    
    // Add to history and maintain size limit
    this.frameHistory.push(frame);
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }

    // Only analyze if we have sufficient history
    if (this.frameHistory.length < 10) {
      return this.currentSequence;
    }

    // Classify current movement
    const detectedMovement = this.classifyMovement();
    
    // Update current sequence
    this.updateMovementSequence(detectedMovement, timestamp);

    return this.currentSequence;
  }

  /**
   * Create movement frame from pose landmarks
   */
  private createMovementFrame(landmarks: NormalizedLandmark[], timestamp: number): MovementFrame {
    // Calculate joint angles
    const jointAngles = {
      leftKnee: this.calculateJointAngle(
        landmarks[23], landmarks[25], landmarks[27] // hip-knee-ankle
      ),
      rightKnee: this.calculateJointAngle(
        landmarks[24], landmarks[26], landmarks[28]
      ),
      leftHip: this.calculateJointAngle(
        landmarks[11], landmarks[23], landmarks[25] // shoulder-hip-knee
      ),
      rightHip: this.calculateJointAngle(
        landmarks[12], landmarks[24], landmarks[26]
      ),
      leftAnkle: this.calculateJointAngle(
        landmarks[25], landmarks[27], landmarks[31] // knee-ankle-foot
      ),
      rightAnkle: this.calculateJointAngle(
        landmarks[26], landmarks[28], landmarks[32]
      ),
      leftShoulder: this.calculateJointAngle(
        landmarks[13], landmarks[11], landmarks[23] // elbow-shoulder-hip
      ),
      rightShoulder: this.calculateJointAngle(
        landmarks[14], landmarks[12], landmarks[24]
      )
    };

    // Calculate body position metrics
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const centerOfMass = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    const baseOfSupport = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
      width: Math.abs(leftAnkle.x - rightAnkle.x)
    };

    const bodyPosition = {
      centerOfMass,
      baseOfSupport,
      hipHeight: centerOfMass.y,
      shoulderLevel: (leftShoulder.y + rightShoulder.y) / 2
    };

    return {
      landmarks,
      timestamp,
      jointAngles,
      bodyPosition
    };
  }

  /**
   * Classify current movement based on frame history
   */
  private classifyMovement(): MovementType {
    if (this.frameHistory.length < 10) return 'static';

    const currentFrame = this.frameHistory[this.frameHistory.length - 1];
    const previousFrames = this.frameHistory.slice(-30); // Last 1 second

    // Calculate movement velocities and patterns
    const velocities = this.calculateVelocities(previousFrames);
    const patterns = this.analyzeMovementPatterns(previousFrames);

    // Check for specific movements in order of complexity
    if (this.detectJumping(velocities, patterns)) return 'jumping';
    if (this.detectSquat(previousFrames)) return 'squat';
    if (this.detectLunge(previousFrames)) return 'lunge';
    if (this.detectSingleLegStand(currentFrame, previousFrames)) return 'single_leg_stand';
    if (this.detectSitToStand(previousFrames)) return 'sit_to_stand';
    if (this.detectStepUp(previousFrames)) return 'step_up';
    if (this.detectHeelRaises(previousFrames)) return 'heel_raises';
    if (this.detectArmRaise(previousFrames)) return 'arm_raise';
    if (this.detectTwisting(previousFrames)) return 'twisting';
    if (this.detectWalking(velocities, patterns)) return 'walking';

    // Check if there's significant movement
    const totalMovement = this.calculateTotalMovement(previousFrames);
    return totalMovement > this.movementThresholds.movementVelocity ? 'unknown' : 'static';
  }

  /**
   * Detect squatting movement
   */
  private detectSquat(frames: MovementFrame[]): boolean {
    if (frames.length < 15) return false;

    const current = frames[frames.length - 1];
    const minKneeAngle = Math.min(current.jointAngles.leftKnee, current.jointAngles.rightKnee);
    
    // Check if knees are sufficiently flexed
    if (minKneeAngle < this.movementThresholds.minSquatDepth) {
      // Check for bilateral symmetry
      const kneeDifference = Math.abs(current.jointAngles.leftKnee - current.jointAngles.rightKnee);
      if (kneeDifference < 30) { // Within 30 degrees
        // Check hip descent pattern
        const hipMovement = this.analyzeVerticalMovement(frames, 'hip');
        return hipMovement.hasDescent && hipMovement.range > 0.05;
      }
    }
    return false;
  }

  /**
   * Detect lunging movement
   */
  private detectLunge(frames: MovementFrame[]): boolean {
    if (frames.length < 15) return false;

    const current = frames[frames.length - 1];
    const kneeAsymmetry = Math.abs(current.jointAngles.leftKnee - current.jointAngles.rightKnee);
    
    // Lunges have asymmetric knee angles
    if (kneeAsymmetry > 20) {
      const minKnee = Math.min(current.jointAngles.leftKnee, current.jointAngles.rightKnee);
      if (minKnee < this.movementThresholds.minLungeDepth) {
        // Check for forward/backward weight shift
        const weightShift = this.analyzeWeightShift(frames);
        return weightShift.magnitude > 0.1;
      }
    }
    return false;
  }

  /**
   * Detect single leg standing
   */
  private detectSingleLegStand(current: MovementFrame, frames: MovementFrame[]): boolean {
    // Check weight distribution asymmetry
    const leftFoot = current.landmarks[27];
    const rightFoot = current.landmarks[28];
    const leftVis = leftFoot?.visibility ?? 0;
    const rightVis = rightFoot?.visibility ?? 0;
    const weightAsymmetry = Math.abs(leftVis - rightVis);
    
    if (weightAsymmetry > this.movementThresholds.singleLegBalance) {
      // Verify stability over time
      const recentFrames = frames.slice(-15);
      const isStable = recentFrames.every(frame => {
        const leftStability = frame.landmarks[27]?.visibility ?? 0;
        const rightStability = frame.landmarks[28]?.visibility ?? 0;
        return Math.abs(leftStability - rightStability) > this.movementThresholds.singleLegBalance;
      });
      return isStable;
    }
    return false;
  }

  /**
   * Detect jumping movement
   */
  private detectJumping(velocities: any, patterns: any): boolean {
    // Look for rapid vertical movement with flight phase
    return velocities.vertical > this.movementThresholds.jumpVelocity && 
           patterns.hasFlightPhase;
  }

  /**
   * Detect sit-to-stand transition
   */
  private detectSitToStand(frames: MovementFrame[]): boolean {
    if (frames.length < 20) return false;

    const hipMovement = this.analyzeVerticalMovement(frames, 'hip');
    const kneeExtension = this.analyzeJointExtension(frames, 'knee');
    
    // Sit-to-stand has upward hip movement with knee extension
    return hipMovement.hasAscent && 
           hipMovement.range > 0.1 && 
           kneeExtension.totalExtension > 45;
  }

  /**
   * Detect step-up movement
   */
  private detectStepUp(frames: MovementFrame[]): boolean {
    const hipMovement = this.analyzeVerticalMovement(frames, 'hip');
    const asymmetricLoading = this.analyzeAsymmetricLoading(frames);
    
    return hipMovement.hasAscent && asymmetricLoading.isAsymmetric;
  }

  /**
   * Detect heel raises (calf raises)
   */
  private detectHeelRaises(frames: MovementFrame[]): boolean {
    // Look for ankle plantarflexion with minimal knee/hip movement
    const ankleMovement = this.analyzeJointMovement(frames, 'ankle');
    const hipStability = this.analyzeJointStability(frames, 'hip');
    
    return ankleMovement.hasSignificantMovement && hipStability.isStable;
  }

  /**
   * Detect arm raise movement
   */
  private detectArmRaise(frames: MovementFrame[]): boolean {
    const current = frames[frames.length - 1];
    const armElevation = Math.max(current.jointAngles.leftShoulder, current.jointAngles.rightShoulder);
    
    return armElevation > this.movementThresholds.armRaiseAngle;
  }

  /**
   * Detect twisting/rotation movement
   */
  private detectTwisting(frames: MovementFrame[]): boolean {
    const shoulderRotation = this.analyzeShoulderRotation(frames);
    return shoulderRotation.totalRotation > this.movementThresholds.twistAngle;
  }

  /**
   * Detect walking movement
   */
  private detectWalking(velocities: any, patterns: any): boolean {
    return patterns.hasAlternatingPattern && 
           velocities.horizontal > 0.01 && 
           patterns.hasStepPattern;
  }

  /**
   * Calculate movement velocities
   */
  private calculateVelocities(frames: MovementFrame[]) {
    if (frames.length < 5) return { vertical: 0, horizontal: 0 };

    const recent = frames.slice(-5);
    const deltaTime = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    if (deltaTime === 0) return { vertical: 0, horizontal: 0 };

    const startPos = recent[0].bodyPosition.centerOfMass;
    const endPos = recent[recent.length - 1].bodyPosition.centerOfMass;
    
    return {
      vertical: Math.abs(endPos.y - startPos.y) / deltaTime,
      horizontal: Math.abs(endPos.x - startPos.x) / deltaTime
    };
  }

  /**
   * Analyze movement patterns for rhythm and coordination
   */
  private analyzeMovementPatterns(frames: MovementFrame[]) {
    // Simplified pattern analysis
    const hasFlightPhase = this.detectFlightPhase(frames);
    const hasAlternatingPattern = this.detectAlternatingPattern(frames);
    const hasStepPattern = this.detectStepPattern(frames);
    
    return {
      hasFlightPhase,
      hasAlternatingPattern,
      hasStepPattern
    };
  }

  /**
   * Helper methods for movement analysis
   */
  private calculateJointAngle(point1: NormalizedLandmark, point2: NormalizedLandmark, point3: NormalizedLandmark): number {
    const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
    const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };
    
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  private analyzeVerticalMovement(frames: MovementFrame[], joint: 'hip' | 'shoulder') {
    if (frames.length < 10) return { hasAscent: false, hasDescent: false, range: 0 };

    const positions = frames.map(frame => 
      joint === 'hip' ? frame.bodyPosition.centerOfMass.y : frame.bodyPosition.shoulderLevel
    );
    
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const range = max - min;
    
    const current = positions[positions.length - 1];
    const start = positions[0];
    
    return {
      hasAscent: current < start - 0.02, // Moving up (y decreases)
      hasDescent: current > start + 0.02, // Moving down (y increases)
      range
    };
  }

  private analyzeJointExtension(frames: MovementFrame[], joint: 'knee' | 'hip'): { totalExtension: number } {
    if (frames.length < 10) return { totalExtension: 0 };

    const angles = frames.map(frame => {
      if (joint === 'knee') {
        return Math.min(frame.jointAngles.leftKnee, frame.jointAngles.rightKnee);
      }
      return Math.min(frame.jointAngles.leftHip, frame.jointAngles.rightHip);
    });

    const min = Math.min(...angles);
    const max = Math.max(...angles);
    
    return { totalExtension: max - min };
  }

  private analyzeWeightShift(frames: MovementFrame[]) {
    if (frames.length < 5) return { magnitude: 0 };

    const shifts = frames.map(frame => frame.bodyPosition.baseOfSupport.x);
    const range = Math.max(...shifts) - Math.min(...shifts);
    
    return { magnitude: range };
  }

  private analyzeAsymmetricLoading(frames: MovementFrame[]) {
    const current = frames[frames.length - 1];
    const leftVis = current.landmarks[27]?.visibility ?? 0;
    const rightVis = current.landmarks[28]?.visibility ?? 0;
    const asymmetry = Math.abs(leftVis - rightVis);
    
    return { isAsymmetric: asymmetry > 0.1 };
  }

  private analyzeJointMovement(frames: MovementFrame[], joint: 'ankle') {
    if (frames.length < 10) return { hasSignificantMovement: false };

    const angles = frames.map(frame => 
      Math.min(frame.jointAngles.leftAnkle, frame.jointAngles.rightAnkle)
    );
    
    const range = Math.max(...angles) - Math.min(...angles);
    return { hasSignificantMovement: range > 20 };
  }

  private analyzeJointStability(frames: MovementFrame[], joint: 'hip') {
    if (frames.length < 10) return { isStable: false };

    const positions = frames.map(frame => frame.bodyPosition.centerOfMass.y);
    const variance = this.calculateVariance(positions);
    
    return { isStable: variance < 0.001 };
  }

  private analyzeShoulderRotation(frames: MovementFrame[]) {
    if (frames.length < 10) return { totalRotation: 0 };

    const rotations = frames.map(frame => {
      const leftShoulder = frame.landmarks[11];
      const rightShoulder = frame.landmarks[12];
      return Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * (180 / Math.PI);
    });

    const range = Math.max(...rotations) - Math.min(...rotations);
    return { totalRotation: Math.abs(range) };
  }

  private detectFlightPhase(frames: MovementFrame[]): boolean {
    // Simplified flight phase detection
    return frames.some(frame => {
      const leftVis = frame.landmarks[27]?.visibility ?? 1;
      const rightVis = frame.landmarks[28]?.visibility ?? 1;
      return leftVis < 0.5 && rightVis < 0.5;
    });
  }

  private detectAlternatingPattern(frames: MovementFrame[]): boolean {
    // Simplified alternating pattern detection
    if (frames.length < 20) return false;

    const weightShifts = frames.map(frame => {
      const leftVis = frame.landmarks[27]?.visibility ?? 0;
      const rightVis = frame.landmarks[28]?.visibility ?? 0;
      return leftVis - rightVis;
    });

    // Count sign changes
    let signChanges = 0;
    for (let i = 1; i < weightShifts.length; i++) {
      if (Math.sign(weightShifts[i]) !== Math.sign(weightShifts[i-1])) {
        signChanges++;
      }
    }

    return signChanges > 4; // Multiple alternations
  }

  private detectStepPattern(frames: MovementFrame[]): boolean {
    // Simplified step pattern detection
    const hipHeights = frames.map(frame => frame.bodyPosition.hipHeight);
    const hasRhythm = this.calculateVariance(hipHeights) > 0.0005;
    
    return hasRhythm;
  }

  private calculateTotalMovement(frames: MovementFrame[]): number {
    if (frames.length < 2) return 0;

    let totalMovement = 0;
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i-1].bodyPosition.centerOfMass;
      const curr = frames[i].bodyPosition.centerOfMass;
      
      totalMovement += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
    }

    return totalMovement / frames.length;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Update movement sequence with new detection
   */
  private updateMovementSequence(detectedMovement: MovementType, timestamp: number): void {
    const isNewMovement = detectedMovement !== this.lastMovementDetection;

    if (isNewMovement) {
      // Complete previous movement if it existed
      if (this.currentSequence.currentMovement && this.lastMovementDetection !== 'static') {
        this.currentSequence.currentMovement.phase = 'completion';
        this.currentSequence.currentMovement.duration = timestamp - this.movementStartTime;
        this.currentSequence.movements.push({...this.currentSequence.currentMovement});
      }

      // Start new movement
      if (detectedMovement !== 'static') {
        this.currentSequence.currentMovement = {
          type: detectedMovement,
          confidence: 0.8, // Will be updated with actual confidence calculation
          phase: 'preparation',
          repetitionCount: this.repetitionTracker.get(detectedMovement) || 0,
          quality: { score: 8, issues: [], recommendations: [] },
          duration: 0,
          range: {
            maxKneeFlexion: 0,
            maxHipFlexion: 0,
            verticalDisplacement: 0
          }
        };
        this.movementStartTime = timestamp;
        this.updateSessionStats(detectedMovement);
      } else {
        this.currentSequence.currentMovement = null;
      }

      this.lastMovementDetection = detectedMovement;
    }

    // Update current movement phase and quality
    if (this.currentSequence.currentMovement) {
      this.updateMovementPhaseAndQuality(timestamp);
    }
  }

  private updateSessionStats(movementType: MovementType): void {
    this.currentSequence.sessionStats.totalMovements++;
    this.currentSequence.sessionStats.movementBreakdown[movementType] = 
      (this.currentSequence.sessionStats.movementBreakdown[movementType] || 0) + 1;
  }

  private updateMovementPhaseAndQuality(timestamp: number): void {
    if (!this.currentSequence.currentMovement) return;

    const duration = timestamp - this.movementStartTime;
    
    // Update phase based on duration and movement characteristics
    if (duration > 2000) { // 2 seconds
      this.currentSequence.currentMovement.phase = 'execution';
    }

    // Update movement quality (simplified)
    this.currentSequence.currentMovement.quality = this.assessMovementQuality();
  }

  private assessMovementQuality(): { score: number; issues: string[]; recommendations: string[] } {
    // Simplified quality assessment
    const currentFrame = this.frameHistory[this.frameHistory.length - 1];
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 10;

    // Check bilateral symmetry
    const kneeSymmetry = Math.abs(currentFrame.jointAngles.leftKnee - currentFrame.jointAngles.rightKnee);
    if (kneeSymmetry > 20) {
      issues.push('Asymmetric knee flexion detected');
      recommendations.push('Focus on equal weight distribution');
      score -= 2;
    }

    // Check alignment
    const hipAlignment = Math.abs(currentFrame.bodyPosition.centerOfMass.x - currentFrame.bodyPosition.baseOfSupport.x);
    if (hipAlignment > 0.1) {
      issues.push('Poor balance alignment');
      recommendations.push('Keep center of mass over base of support');
      score -= 1;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Get current movement status
   */
  getCurrentMovement(): MovementPattern | null {
    return this.currentSequence.currentMovement;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return this.currentSequence.sessionStats;
  }

  /**
   * Reset classifier state
   */
  reset(): void {
    this.frameHistory = [];
    this.currentSequence = {
      movements: [],
      currentMovement: null,
      transitionInProgress: false,
      sessionStats: {
        totalMovements: 0,
        movementBreakdown: {} as Record<MovementType, number>,
        averageQuality: 0,
        totalDuration: 0
      }
    };
    this.lastMovementDetection = 'static';
    this.movementStartTime = 0;
    this.repetitionTracker.clear();
  }
}