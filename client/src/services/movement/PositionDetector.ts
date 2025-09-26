/**
 * Position Detection Engine for Clinical Assessment
 * Identifies patient posture and orientation for adaptive analysis
 */

import { NormalizedLandmark } from '@mediapipe/pose';

export type PostureType = 'standing' | 'sitting' | 'lying' | 'transitional';
export type OrientationType = 'frontal' | 'sagittal_left' | 'sagittal_right' | 'posterior' | 'oblique';

export interface PositionInfo {
  posture: {
    type: PostureType;
    confidence: number; // 0-1 scale
    details: {
      hipAngle: number;
      kneeAngle: number;
      torsoVertical: boolean;
    };
  };
  orientation: {
    type: OrientationType;
    confidence: number;
    details: {
      shoulderVisibility: { left: number; right: number };
      faceDirection: number; // -1 (left) to 1 (right)
      bodyAngle: number; // degrees from frontal
    };
  };
  stability: {
    isStable: boolean;
    movementDetected: boolean;
    qualityScore: number; // 0-10 for position quality
  };
}

export class PositionDetector {
  private previousPositions: PositionInfo[] = [];
  private stabilityWindow = 10; // frames for stability assessment
  
  /**
   * Detect current patient position from pose landmarks
   */
  detectPosition(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): PositionInfo {
    const postureAnalysis = this.analyzePosture(landmarks, width, height);
    const orientationAnalysis = this.analyzeOrientation(landmarks, width, height);
    const stabilityAnalysis = this.analyzeStability(landmarks, width, height);

    const position: PositionInfo = {
      posture: postureAnalysis,
      orientation: orientationAnalysis,
      stability: stabilityAnalysis
    };

    // Store for trend analysis
    this.previousPositions.push(position);
    if (this.previousPositions.length > this.stabilityWindow) {
      this.previousPositions.shift();
    }

    return this.smoothPosition(position);
  }

  /**
   * Analyze patient posture (standing, sitting, lying)
   */
  private analyzePosture(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) {
    // Key landmarks for posture analysis
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    // Calculate joint angles
    const leftHipAngle = this.calculateAngle(
      { x: leftShoulder.x, y: leftShoulder.y },
      { x: leftHip.x, y: leftHip.y },
      { x: leftKnee.x, y: leftKnee.y }
    );

    const rightHipAngle = this.calculateAngle(
      { x: rightShoulder.x, y: rightShoulder.y },
      { x: rightHip.x, y: rightHip.y },
      { x: rightKnee.x, y: rightKnee.y }
    );

    const leftKneeAngle = this.calculateAngle(
      { x: leftHip.x, y: leftHip.y },
      { x: leftKnee.x, y: leftKnee.y },
      { x: leftAnkle.x, y: leftAnkle.y }
    );

    const rightKneeAngle = this.calculateAngle(
      { x: rightHip.x, y: rightHip.y },
      { x: rightKnee.x, y: rightKnee.y },
      { x: rightAnkle.x, y: rightAnkle.y }
    );

    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Calculate torso vertical alignment
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const torsoAngle = Math.atan2(
      Math.abs(shoulderCenter.x - hipCenter.x),
      Math.abs(shoulderCenter.y - hipCenter.y)
    ) * (180 / Math.PI);

    const torsoVertical = torsoAngle < 15; // Within 15 degrees of vertical

    // Determine posture type and confidence
    let postureType: PostureType;
    let confidence: number;

    if (avgHipAngle > 150 && avgKneeAngle > 150 && torsoVertical) {
      // Standing: Extended hips and knees, upright torso
      postureType = 'standing';
      confidence = Math.min(1.0, (avgHipAngle + avgKneeAngle - 300) / 60);
    } else if (avgHipAngle < 120 && avgKneeAngle < 120) {
      // Sitting: Flexed hips and knees
      postureType = 'sitting';
      confidence = Math.min(1.0, (240 - avgHipAngle - avgKneeAngle) / 60);
    } else if (!torsoVertical && (shoulderCenter.y > hipCenter.y)) {
      // Lying: Torso not vertical, shoulders lower than hips (relative to camera)
      postureType = 'lying';
      confidence = Math.min(1.0, torsoAngle / 45);
    } else {
      // Transitional: Between positions
      postureType = 'transitional';
      confidence = 0.5;
    }

    return {
      type: postureType,
      confidence: Math.max(0.1, confidence),
      details: {
        hipAngle: avgHipAngle,
        kneeAngle: avgKneeAngle,
        torsoVertical
      }
    };
  }

  /**
   * Analyze patient orientation (frontal, sagittal, posterior)
   */
  private analyzeOrientation(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) {
    // Key landmarks for orientation analysis
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Calculate shoulder visibility (based on confidence and relative positions)
    const leftShoulderVis = leftShoulder.visibility || 0;
    const rightShoulderVis = rightShoulder.visibility || 0;

    // Calculate face direction based on nose position relative to shoulders
    const shoulderMidpoint = (leftShoulder.x + rightShoulder.x) / 2;
    const faceDirection = (nose.x - shoulderMidpoint) * 2; // Normalized -1 to 1

    // Calculate body angle from frontal view
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    
    // Shoulder separation indicates viewing angle
    const frontalnessScore = (shoulderWidth + hipWidth) / 2;

    // Calculate actual body angle
    const bodyAngle = Math.acos(Math.min(1, frontalnessScore * 2)) * (180 / Math.PI);

    // Determine orientation type and confidence
    let orientationType: OrientationType;
    let confidence: number;

    if (frontalnessScore > 0.3 && Math.abs(faceDirection) < 0.3) {
      // Frontal: Both shoulders visible, face centered
      orientationType = 'frontal';
      confidence = Math.min(1.0, frontalnessScore / 0.4);
    } else if (leftShoulderVis > rightShoulderVis + 0.2) {
      // Left sagittal: Left shoulder more prominent
      orientationType = 'sagittal_left';
      confidence = Math.min(1.0, (leftShoulderVis - rightShoulderVis) / 0.4);
    } else if (rightShoulderVis > leftShoulderVis + 0.2) {
      // Right sagittal: Right shoulder more prominent
      orientationType = 'sagittal_right';
      confidence = Math.min(1.0, (rightShoulderVis - leftShoulderVis) / 0.4);
    } else if (frontalnessScore < 0.2) {
      // Posterior: Limited shoulder separation, back view
      orientationType = 'posterior';
      confidence = Math.min(1.0, (0.3 - frontalnessScore) / 0.2);
    } else {
      // Oblique: Angled view
      orientationType = 'oblique';
      confidence = 0.6;
    }

    return {
      type: orientationType,
      confidence: Math.max(0.1, confidence),
      details: {
        shoulderVisibility: {
          left: leftShoulderVis,
          right: rightShoulderVis
        },
        faceDirection,
        bodyAngle
      }
    };
  }

  /**
   * Analyze position stability and quality
   */
  private analyzeStability(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) {
    // Check for movement by comparing with recent positions
    let movementDetected = false;
    let stabilityScore = 1.0;

    if (this.previousPositions.length > 5) {
      const recent = this.previousPositions.slice(-5);
      
      // Check posture consistency
      const postureTypes = recent.map(p => p.posture.type);
      const postureConsistent = postureTypes.every(type => type === postureTypes[0]);
      
      // Check orientation consistency
      const orientationTypes = recent.map(p => p.orientation.type);
      const orientationConsistent = orientationTypes.every(type => type === orientationTypes[0]);

      if (!postureConsistent || !orientationConsistent) {
        movementDetected = true;
        stabilityScore *= 0.7;
      }

      // Check confidence consistency
      const avgConfidence = recent.reduce((sum, p) => 
        sum + (p.posture.confidence + p.orientation.confidence) / 2, 0) / recent.length;
      stabilityScore *= avgConfidence;
    }

    // Calculate quality score based on landmark visibility and confidence
    const visibilityScore = landmarks.reduce((sum, landmark) => 
      sum + (landmark.visibility || 0), 0) / landmarks.length;
    
    const qualityScore = Math.min(10, (visibilityScore * stabilityScore) * 10);

    return {
      isStable: !movementDetected && stabilityScore > 0.8,
      movementDetected,
      qualityScore
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
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return angle * (180 / Math.PI);
  }

  /**
   * Apply smoothing to reduce position detection jitter
   */
  private smoothPosition(currentPosition: PositionInfo): PositionInfo {
    if (this.previousPositions.length < 3) {
      return currentPosition;
    }

    const recent = this.previousPositions.slice(-3);
    
    // Smooth confidence values
    const avgPostureConfidence = recent.reduce((sum, p) => sum + p.posture.confidence, 0) / recent.length;
    const avgOrientationConfidence = recent.reduce((sum, p) => sum + p.orientation.confidence, 0) / recent.length;

    return {
      ...currentPosition,
      posture: {
        ...currentPosition.posture,
        confidence: (currentPosition.posture.confidence + avgPostureConfidence) / 2
      },
      orientation: {
        ...currentPosition.orientation,
        confidence: (currentPosition.orientation.confidence + avgOrientationConfidence) / 2
      }
    };
  }

  /**
   * Get clinical recommendations based on detected position
   */
  getClinicalRecommendations(position: PositionInfo): {
    optimalViews: OrientationType[];
    suggestedAssessments: string[];
    positionGuidance: string;
  } {
    const { posture, orientation } = position;

    let optimalViews: OrientationType[] = [];
    let suggestedAssessments: string[] = [];
    let positionGuidance = '';

    // Position-specific recommendations
    switch (posture.type) {
      case 'standing':
        optimalViews = ['frontal', 'sagittal_left', 'sagittal_right', 'posterior'];
        suggestedAssessments = [
          'Postural alignment',
          'Weight distribution',
          'Balance assessment',
          'Spinal curves (side view)',
          'Shoulder blade positioning (back view)'
        ];
        if (orientation.type === 'frontal') {
          positionGuidance = 'Good frontal view. Turn sideways for spinal assessment.';
        } else if (orientation.type.includes('sagittal')) {
          positionGuidance = 'Perfect for spinal curve assessment. Face forward for symmetry analysis.';
        }
        break;

      case 'sitting':
        optimalViews = ['frontal', 'sagittal_left', 'sagittal_right'];
        suggestedAssessments = [
          'Seated posture',
          'Spinal alignment',
          'Pelvic positioning',
          'Head and neck posture'
        ];
        positionGuidance = 'Seated position detected. Maintain upright posture for assessment.';
        break;

      case 'lying':
        optimalViews = ['frontal', 'sagittal_left', 'sagittal_right'];
        suggestedAssessments = [
          'Spinal alignment',
          'Range of motion testing',
          'Passive movement assessment'
        ];
        positionGuidance = 'Lying position detected. Ensure full body is visible.';
        break;

      case 'transitional':
        optimalViews = ['frontal', 'sagittal_left', 'sagittal_right'];
        suggestedAssessments = [
          'Movement quality',
          'Transition patterns',
          'Compensatory movements'
        ];
        positionGuidance = 'Movement transition detected. Hold steady position for analysis.';
        break;
    }

    return {
      optimalViews,
      suggestedAssessments,
      positionGuidance
    };
  }

  /**
   * Check if position is optimal for specific assessment
   */
  isOptimalForAssessment(
    position: PositionInfo,
    assessmentType: 'posture' | 'balance' | 'symmetry' | 'rom' | 'gait'
  ): boolean {
    const { posture, orientation, stability } = position;

    if (!stability.isStable || stability.qualityScore < 7) {
      return false;
    }

    switch (assessmentType) {
      case 'posture':
        return posture.type === 'standing' && 
               (orientation.type === 'sagittal_left' || orientation.type === 'sagittal_right');
      
      case 'balance':
        return posture.type === 'standing' && orientation.type === 'frontal';
      
      case 'symmetry':
        return posture.type === 'standing' && 
               (orientation.type === 'frontal' || orientation.type === 'posterior');
      
      case 'rom':
        return posture.type === 'sitting' || posture.type === 'lying';
      
      case 'gait':
        return posture.type === 'transitional' && orientation.type === 'sagittal_left';
      
      default:
        return false;
    }
  }
}