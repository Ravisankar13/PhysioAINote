/**
 * Movement Analysis Engine for Clinical Assessment
 * Provides real-time quantified movement analysis for physiotherapy applications
 */

import { NormalizedLandmark } from '@mediapipe/pose';
import { PositionDetector, PositionInfo, PostureType, OrientationType } from './PositionDetector';

export interface MovementMetrics {
  position: {
    current: PositionInfo;
    isOptimal: boolean;
    recommendations: {
      nextPosition: string;
      guidance: string;
      assessmentReady: boolean;
    };
  };
  posture: {
    score: number; // 0-10 scale
    headForwardAngle: number; // degrees
    shoulderSymmetry: number; // mm difference
    status: 'excellent' | 'good' | 'fair' | 'poor';
    feedback: string;
    adaptiveAnalysis: {
      relevantForPosition: boolean;
      positionSpecificFindings: string[];
    };
  };
  balance: {
    score: number; // 0-10 scale
    centerOfGravity: { x: number; y: number };
    sway: number; // stability index
    status: 'stable' | 'moderate' | 'unstable';
    feedback: string;
    adaptiveAnalysis: {
      relevantForPosition: boolean;
      positionSpecificMetrics: Record<string, number>;
    };
  };
  symmetry: {
    shoulder: {
      leftHeight: number;
      rightHeight: number;
      difference: number; // mm
      status: 'level' | 'slight' | 'significant';
    };
    hip: {
      leftHeight: number;
      rightHeight: number;
      difference: number;
      status: 'level' | 'slight' | 'significant';
    };
    adaptiveAnalysis: {
      viewOptimal: boolean;
      recommendedViews: OrientationType[];
    };
  };
  rangeOfMotion: {
    shoulderFlexion: {
      left: number;
      right: number;
      normal: number;
      percentage: number;
    };
    neckRotation: {
      current: number;
      normal: number;
      percentage: number;
    };
    adaptiveAnalysis: {
      positionAppropriate: boolean;
      suggestedMovements: string[];
    };
  };
}

export interface SessionData {
  timestamp: number;
  metrics: MovementMetrics;
  patientId?: string;
  sessionType: 'baseline' | 'progress' | 'discharge';
}

export class MovementAnalyzer {
  private previousMetrics: MovementMetrics[] = [];
  private smoothingWindow = 5; // frames for smoothing
  private positionDetector: PositionDetector;
  
  constructor() {
    this.positionDetector = new PositionDetector();
  }
  
  /**
   * Analyze current pose and return comprehensive movement metrics
   */
  analyzeMovement(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): MovementMetrics {
    // First detect current position
    const currentPosition = this.positionDetector.detectPosition(landmarks, width, height);
    
    // Get position-based recommendations
    const positionRecommendations = this.positionDetector.getClinicalRecommendations(currentPosition);
    
    // Perform position-adaptive analysis
    const postureAnalysis = this.analyzePosture(landmarks, width, height, currentPosition);
    const balanceAnalysis = this.analyzeBalance(landmarks, width, height, currentPosition);
    const symmetryAnalysis = this.analyzeSymmetry(landmarks, width, height, currentPosition);
    const romAnalysis = this.analyzeRangeOfMotion(landmarks, width, height, currentPosition);

    const metrics: MovementMetrics = {
      position: {
        current: currentPosition,
        isOptimal: currentPosition.stability.isStable && currentPosition.stability.qualityScore > 7,
        recommendations: {
          nextPosition: this.getNextRecommendedPosition(currentPosition),
          guidance: positionRecommendations.positionGuidance,
          assessmentReady: currentPosition.stability.isStable
        }
      },
      posture: postureAnalysis,
      balance: balanceAnalysis,
      symmetry: symmetryAnalysis,
      rangeOfMotion: romAnalysis
    };

    // Store for trend analysis
    this.previousMetrics.push(metrics);
    if (this.previousMetrics.length > this.smoothingWindow) {
      this.previousMetrics.shift();
    }

    return this.smoothMetrics(metrics);
  }

  /**
   * Analyze posture quality and alignment
   */
  private analyzePosture(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    position: PositionInfo
  ) {
    // Get key landmarks
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    // Calculate head forward position
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const earMidpoint = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2
    };

    // Head forward angle calculation
    const headForwardDistance = (earMidpoint.x - shoulderMidpoint.x) * width;
    const verticalDistance = Math.abs((earMidpoint.y - shoulderMidpoint.y) * height);
    const headForwardAngle = Math.atan2(Math.abs(headForwardDistance), verticalDistance) * (180 / Math.PI);

    // Shoulder height symmetry
    const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y) * height;

    // Calculate overall posture score
    let postureScore = 10;
    
    // Deduct for head forward posture
    if (headForwardAngle > 15) {
      postureScore -= Math.min(4, (headForwardAngle - 15) / 5);
    }
    
    // Deduct for shoulder asymmetry
    if (shoulderHeightDiff > 5) {
      postureScore -= Math.min(3, (shoulderHeightDiff - 5) / 5);
    }

    // Determine status and feedback
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    let feedback: string;

    if (postureScore >= 8.5) {
      status = 'excellent';
      feedback = 'Excellent posture! Keep it up.';
    } else if (postureScore >= 7) {
      status = 'good';
      feedback = 'Good posture with minor adjustments needed.';
    } else if (postureScore >= 5) {
      status = 'fair';
      feedback = 'Moderate posture issues detected. Consider corrections.';
    } else {
      status = 'poor';
      feedback = 'Significant posture concerns. Professional guidance recommended.';
    }

    // Position-specific analysis
    const isRelevantForPosition = position.posture.type === 'standing' || position.posture.type === 'sitting';
    const positionSpecificFindings: string[] = [];
    
    if (position.posture.type === 'standing') {
      if (headForwardAngle > 20) {
        positionSpecificFindings.push('Forward head posture more pronounced in standing');
      }
      if (shoulderHeightDiff > 8) {
        positionSpecificFindings.push('Significant shoulder asymmetry under load');
      }
    } else if (position.posture.type === 'sitting') {
      if (headForwardAngle > 15) {
        positionSpecificFindings.push('Poor seated posture - forward head position');
      }
    }

    return {
      score: Math.max(0, Math.min(10, postureScore)),
      headForwardAngle,
      shoulderSymmetry: shoulderHeightDiff,
      status,
      feedback,
      adaptiveAnalysis: {
        relevantForPosition: isRelevantForPosition,
        positionSpecificFindings
      }
    };
  }

  /**
   * Analyze balance and stability
   */
  private analyzeBalance(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    position: PositionInfo
  ) {
    // Calculate center of gravity using key body segments
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    // Center of gravity approximation
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const ankleCenter = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2
    };

    // Weighted center of gravity (shoulders 25%, hips 50%, ankles 25%)
    const centerOfGravity = {
      x: shoulderCenter.x * 0.25 + hipCenter.x * 0.5 + ankleCenter.x * 0.25,
      y: shoulderCenter.y * 0.25 + hipCenter.y * 0.5 + ankleCenter.y * 0.25
    };

    // Calculate sway (deviation from ankle center)
    const swayX = Math.abs(centerOfGravity.x - ankleCenter.x) * width;
    const swayY = Math.abs(centerOfGravity.y - ankleCenter.y) * height;
    const totalSway = Math.sqrt(swayX * swayX + swayY * swayY);

    // Balance score calculation
    let balanceScore = 10;
    
    // Deduct for excessive sway
    if (totalSway > 20) {
      balanceScore -= Math.min(5, (totalSway - 20) / 10);
    }

    // Weight distribution analysis
    const weightShift = Math.abs(leftAnkle.x - rightAnkle.x) * width;
    if (weightShift > 30) {
      balanceScore -= Math.min(3, (weightShift - 30) / 20);
    }

    // Determine status and feedback
    let status: 'stable' | 'moderate' | 'unstable';
    let feedback: string;

    if (balanceScore >= 8) {
      status = 'stable';
      feedback = 'Excellent balance and stability.';
    } else if (balanceScore >= 6) {
      status = 'moderate';
      feedback = 'Moderate balance with some instability.';
    } else {
      status = 'unstable';
      feedback = 'Balance concerns detected. Consider balance training.';
    }

    // Position-specific analysis
    const isRelevantForPosition = position.posture.type === 'standing';
    const positionSpecificMetrics: Record<string, number> = {};
    
    if (position.posture.type === 'standing') {
      positionSpecificMetrics.weightDistribution = weightShift;
      positionSpecificMetrics.stabilityIndex = totalSway;
    }

    return {
      score: Math.max(0, Math.min(10, balanceScore)),
      centerOfGravity: {
        x: centerOfGravity.x * width,
        y: centerOfGravity.y * height
      },
      sway: totalSway,
      status,
      feedback,
      adaptiveAnalysis: {
        relevantForPosition: isRelevantForPosition,
        positionSpecificMetrics
      }
    };
  }

  /**
   * Analyze bilateral symmetry
   */
  private analyzeSymmetry(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    position: PositionInfo
  ) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Shoulder symmetry
    const shoulderLeftHeight = leftShoulder.y * height;
    const shoulderRightHeight = rightShoulder.y * height;
    const shoulderDifference = Math.abs(shoulderLeftHeight - shoulderRightHeight);

    // Hip symmetry
    const hipLeftHeight = leftHip.y * height;
    const hipRightHeight = rightHip.y * height;
    const hipDifference = Math.abs(hipLeftHeight - hipRightHeight);

    const getSymmetryStatus = (diff: number) => {
      if (diff < 5) return 'level';
      if (diff < 10) return 'slight';
      return 'significant';
    };

    // Position-specific analysis
    const viewOptimal = position.orientation.type === 'frontal' || position.orientation.type === 'posterior';
    const recommendedViews: OrientationType[] = ['frontal', 'posterior'];
    
    if (!viewOptimal) {
      if (position.orientation.type.includes('sagittal')) {
        recommendedViews.unshift('frontal'); // Prioritize frontal for symmetry
      }
    }

    return {
      shoulder: {
        leftHeight: shoulderLeftHeight,
        rightHeight: shoulderRightHeight,
        difference: shoulderDifference,
        status: getSymmetryStatus(shoulderDifference) as 'level' | 'slight' | 'significant'
      },
      hip: {
        leftHeight: hipLeftHeight,
        rightHeight: hipRightHeight,
        difference: hipDifference,
        status: getSymmetryStatus(hipDifference) as 'level' | 'slight' | 'significant'
      },
      adaptiveAnalysis: {
        viewOptimal,
        recommendedViews
      }
    };
  }

  /**
   * Analyze range of motion
   */
  private analyzeRangeOfMotion(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    position: PositionInfo
  ) {
    // Shoulder flexion analysis
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    // Calculate shoulder flexion angles
    const leftShoulderAngle = this.calculateAngle(
      { x: leftElbow.x, y: leftElbow.y },
      { x: leftShoulder.x, y: leftShoulder.y },
      { x: leftShoulder.x, y: leftShoulder.y - 0.1 } // Reference point above shoulder
    );

    const rightShoulderAngle = this.calculateAngle(
      { x: rightElbow.x, y: rightElbow.y },
      { x: rightShoulder.x, y: rightShoulder.y },
      { x: rightShoulder.x, y: rightShoulder.y - 0.1 }
    );

    // Neck rotation analysis (simplified)
    const nose = landmarks[0];
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const neckRotation = Math.abs(nose.x - shoulderMidpoint.x) * 100; // Approximate rotation

    // Position-specific analysis
    const positionAppropriate = position.posture.type === 'sitting' || position.posture.type === 'lying';
    const suggestedMovements: string[] = [];
    
    if (position.posture.type === 'standing') {
      suggestedMovements.push('Sit down for detailed range of motion testing');
    } else if (position.posture.type === 'sitting') {
      suggestedMovements.push('Shoulder elevation', 'Neck rotation', 'Trunk rotation');
    } else if (position.posture.type === 'lying') {
      suggestedMovements.push('Passive range of motion testing', 'Hip flexion', 'Knee flexion');
    }

    return {
      shoulderFlexion: {
        left: leftShoulderAngle,
        right: rightShoulderAngle,
        normal: 180,
        percentage: Math.min(100, ((leftShoulderAngle + rightShoulderAngle) / 2 / 180) * 100)
      },
      neckRotation: {
        current: neckRotation,
        normal: 45,
        percentage: Math.min(100, (neckRotation / 45) * 100)
      },
      adaptiveAnalysis: {
        positionAppropriate,
        suggestedMovements
      }
    };
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(
    point1: { x: number; y: number },
    vertex: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const vector1 = {
      x: point1.x - vertex.x,
      y: point1.y - vertex.y
    };
    
    const vector2 = {
      x: point2.x - vertex.x,
      y: point2.y - vertex.y
    };

    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to prevent NaN

    return angle * (180 / Math.PI);
  }

  /**
   * Apply smoothing to reduce jitter in measurements
   */
  private smoothMetrics(currentMetrics: MovementMetrics): MovementMetrics {
    if (this.previousMetrics.length < 2) {
      return currentMetrics;
    }

    // Simple averaging for smoothing
    const recentMetrics = this.previousMetrics.slice(-3);
    const avgPostureScore = recentMetrics.reduce((sum, m) => sum + m.posture.score, 0) / recentMetrics.length;
    const avgBalanceScore = recentMetrics.reduce((sum, m) => sum + m.balance.score, 0) / recentMetrics.length;

    return {
      ...currentMetrics,
      posture: {
        ...currentMetrics.posture,
        score: avgPostureScore
      },
      balance: {
        ...currentMetrics.balance,
        score: avgBalanceScore
      }
    };
  }

  /**
   * Get trend analysis for progress tracking
   */
  getTrendAnalysis(): {
    postureTrend: 'improving' | 'stable' | 'declining';
    balanceTrend: 'improving' | 'stable' | 'declining';
    overallProgress: number; // percentage change
  } {
    if (this.previousMetrics.length < 10) {
      return {
        postureTrend: 'stable',
        balanceTrend: 'stable',
        overallProgress: 0
      };
    }

    const recent = this.previousMetrics.slice(-5);
    const older = this.previousMetrics.slice(-10, -5);

    const recentPostureAvg = recent.reduce((sum, m) => sum + m.posture.score, 0) / recent.length;
    const olderPostureAvg = older.reduce((sum, m) => sum + m.posture.score, 0) / older.length;

    const recentBalanceAvg = recent.reduce((sum, m) => sum + m.balance.score, 0) / recent.length;
    const olderBalanceAvg = older.reduce((sum, m) => sum + m.balance.score, 0) / older.length;

    const postureDiff = recentPostureAvg - olderPostureAvg;
    const balanceDiff = recentBalanceAvg - olderBalanceAvg;

    const getTrend = (diff: number) => {
      if (diff > 0.5) return 'improving';
      if (diff < -0.5) return 'declining';
      return 'stable';
    };

    const overallProgress = ((postureDiff + balanceDiff) / 2) * 10; // Convert to percentage

    return {
      postureTrend: getTrend(postureDiff),
      balanceTrend: getTrend(balanceDiff),
      overallProgress
    };
  }

  /**
   * Save session data for progress tracking
   */
  saveSession(metrics: MovementMetrics, patientId?: string): SessionData {
    return {
      timestamp: Date.now(),
      metrics,
      patientId,
      sessionType: 'progress'
    };
  }

  /**
   * Get next recommended position based on current position and assessment needs
   */
  private getNextRecommendedPosition(currentPosition: PositionInfo): string {
    const { posture, orientation } = currentPosition;
    
    // Assessment sequence prioritization
    if (posture.type === 'standing') {
      if (orientation.type === 'frontal') {
        return 'Turn sideways for spinal assessment';
      } else if (orientation.type.includes('sagittal')) {
        return 'Turn around for posterior view assessment';
      } else if (orientation.type === 'posterior') {
        return 'Assessment complete - consider sitting position';
      }
    } else if (posture.type === 'sitting') {
      if (orientation.type === 'frontal') {
        return 'Turn sideways for seated spinal assessment';
      } else {
        return 'Return to standing for weight-bearing assessment';
      }
    } else if (posture.type === 'lying') {
      return 'Transition to sitting for functional assessment';
    } else if (posture.type === 'transitional') {
      return 'Hold steady position for movement quality analysis';
    }
    
    return 'Maintain current position for continued assessment';
  }
}