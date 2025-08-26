/**
 * Framework Analyzer - Processes movement data through clinical frameworks
 */

import {
  ClinicalFramework,
  ClinicalPattern,
  AssessmentProtocol,
  TreatmentPathway
} from './clinicalFrameworks';

export interface MovementMetrics {
  jointAngles: Record<string, number>;
  symmetry: Record<string, number>;
  velocity: Record<string, number>;
  acceleration: Record<string, number>;
  stability: Record<string, number>;
  compensations: string[];
  timestamp: number;
}

export interface FrameworkAnalysisResult {
  framework: ClinicalFramework;
  detectedPatterns: ClinicalPattern[];
  assessmentScores: Record<string, number>;
  recommendations: TreatmentPathway[];
  redFlags: string[];
  confidenceScore: number;
  summary: string;
}

export class FrameworkAnalyzer {
  private currentMetrics: MovementMetrics | null = null;
  private historicalData: MovementMetrics[] = [];
  
  /**
   * Calculate joint angles from pose landmarks
   */
  calculateJointAngles(landmarks: any[]): Record<string, number> {
    const angles: Record<string, number> = {};
    
    if (!landmarks || landmarks.length < 33) return angles;
    
    // Shoulder flexion/extension
    const shoulderLeft = this.calculateAngle(
      landmarks[11], // left shoulder
      landmarks[13], // left elbow
      landmarks[15]  // left wrist
    );
    angles['shoulder_left_flexion'] = shoulderLeft;
    
    const shoulderRight = this.calculateAngle(
      landmarks[12], // right shoulder
      landmarks[14], // right elbow
      landmarks[16]  // right wrist
    );
    angles['shoulder_right_flexion'] = shoulderRight;
    
    // Hip flexion/extension
    const hipLeft = this.calculateAngle(
      landmarks[23], // left hip
      landmarks[25], // left knee
      landmarks[27]  // left ankle
    );
    angles['hip_left_flexion'] = hipLeft;
    
    const hipRight = this.calculateAngle(
      landmarks[24], // right hip
      landmarks[26], // right knee
      landmarks[28]  // right ankle
    );
    angles['hip_right_flexion'] = hipRight;
    
    // Knee flexion
    const kneeLeft = this.calculateAngle(
      landmarks[23], // left hip
      landmarks[25], // left knee
      landmarks[27]  // left ankle
    );
    angles['knee_left_flexion'] = kneeLeft;
    
    const kneeRight = this.calculateAngle(
      landmarks[24], // right hip
      landmarks[26], // right knee
      landmarks[28]  // right ankle
    );
    angles['knee_right_flexion'] = kneeRight;
    
    // Trunk lean
    const trunkLean = this.calculateTrunkLean(landmarks);
    angles['trunk_lean'] = trunkLean;
    
    // Pelvic tilt
    const pelvicTilt = this.calculatePelvicTilt(landmarks);
    angles['pelvic_tilt'] = pelvicTilt;
    
    return angles;
  }
  
  /**
   * Calculate angle between three points
   */
  private calculateAngle(p1: any, p2: any, p3: any): number {
    if (!p1 || !p2 || !p3) return 0;
    
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    
    if (angle > 180) {
      angle = 360 - angle;
    }
    
    return angle;
  }
  
  /**
   * Calculate trunk lean angle
   */
  private calculateTrunkLean(landmarks: any[]): number {
    if (!landmarks || landmarks.length < 33) return 0;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0;
    
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const angle = Math.atan2(
      shoulderMidpoint.x - hipMidpoint.x,
      hipMidpoint.y - shoulderMidpoint.y
    ) * 180 / Math.PI;
    
    return angle;
  }
  
  /**
   * Calculate pelvic tilt
   */
  private calculatePelvicTilt(landmarks: any[]): number {
    if (!landmarks || landmarks.length < 33) return 0;
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return 0;
    
    const tilt = Math.atan2(
      rightHip.y - leftHip.y,
      rightHip.x - leftHip.x
    ) * 180 / Math.PI;
    
    return tilt;
  }
  
  /**
   * Calculate symmetry between left and right sides
   */
  calculateSymmetry(landmarks: any[]): Record<string, number> {
    const symmetry: Record<string, number> = {};
    const angles = this.calculateJointAngles(landmarks);
    
    // Shoulder symmetry
    if (angles['shoulder_left_flexion'] && angles['shoulder_right_flexion']) {
      const diff = Math.abs(angles['shoulder_left_flexion'] - angles['shoulder_right_flexion']);
      symmetry['shoulder'] = 100 - (diff / 180 * 100);
    }
    
    // Hip symmetry
    if (angles['hip_left_flexion'] && angles['hip_right_flexion']) {
      const diff = Math.abs(angles['hip_left_flexion'] - angles['hip_right_flexion']);
      symmetry['hip'] = 100 - (diff / 180 * 100);
    }
    
    // Knee symmetry
    if (angles['knee_left_flexion'] && angles['knee_right_flexion']) {
      const diff = Math.abs(angles['knee_left_flexion'] - angles['knee_right_flexion']);
      symmetry['knee'] = 100 - (diff / 180 * 100);
    }
    
    // Overall symmetry
    const symmetryValues = Object.values(symmetry);
    if (symmetryValues.length > 0) {
      symmetry['overall'] = symmetryValues.reduce((a, b) => a + b, 0) / symmetryValues.length;
    }
    
    return symmetry;
  }
  
  /**
   * Detect compensatory patterns
   */
  detectCompensations(landmarks: any[]): string[] {
    const compensations: string[] = [];
    const angles = this.calculateJointAngles(landmarks);
    
    // Excessive trunk lean
    if (Math.abs(angles['trunk_lean'] || 0) > 15) {
      compensations.push('excessive_trunk_lean');
    }
    
    // Pelvic drop
    if (Math.abs(angles['pelvic_tilt'] || 0) > 10) {
      compensations.push('pelvic_drop');
    }
    
    // Knee valgus (simplified detection)
    const leftKnee = landmarks[25];
    const leftHip = landmarks[23];
    const leftAnkle = landmarks[27];
    
    if (leftKnee && leftHip && leftAnkle) {
      const kneePosition = leftKnee.x;
      const midline = (leftHip.x + leftAnkle.x) / 2;
      if (Math.abs(kneePosition - midline) > 0.1) {
        compensations.push('knee_valgus_left');
      }
    }
    
    // Scapular winging (simplified)
    const shoulderAsymmetry = Math.abs(
      (angles['shoulder_left_flexion'] || 0) - (angles['shoulder_right_flexion'] || 0)
    );
    if (shoulderAsymmetry > 20) {
      compensations.push('possible_scapular_dyskinesis');
    }
    
    return compensations;
  }
  
  /**
   * Process movement through a specific framework
   */
  analyzeWithFramework(
    landmarks: any[],
    framework: ClinicalFramework
  ): FrameworkAnalysisResult {
    // Calculate current metrics
    const jointAngles = this.calculateJointAngles(landmarks);
    const symmetry = this.calculateSymmetry(landmarks);
    const compensations = this.detectCompensations(landmarks);
    
    this.currentMetrics = {
      jointAngles,
      symmetry,
      velocity: {}, // Would calculate from temporal data
      acceleration: {}, // Would calculate from temporal data
      stability: {}, // Would calculate from variance
      compensations,
      timestamp: Date.now()
    };
    
    // Store for historical analysis
    this.historicalData.push(this.currentMetrics);
    if (this.historicalData.length > 100) {
      this.historicalData.shift(); // Keep last 100 frames
    }
    
    // Analyze against framework protocols
    const assessmentScores: Record<string, number> = {};
    const redFlags: string[] = [];
    
    framework.assessmentProtocols.forEach(protocol => {
      const score = this.scoreAgainstProtocol(protocol, this.currentMetrics);
      assessmentScores[protocol.id] = score;
      
      // Check for red flags
      protocol.redFlags.forEach(flag => {
        if (this.checkRedFlag(flag, this.currentMetrics)) {
          redFlags.push(`${protocol.name}: ${flag}`);
        }
      });
    });
    
    // Detect clinical patterns
    const detectedPatterns = this.detectClinicalPatterns(framework, this.currentMetrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(framework, detectedPatterns);
    
    // Calculate overall confidence
    const confidenceScore = this.calculateOverallConfidence(assessmentScores, detectedPatterns);
    
    // Generate summary
    const summary = this.generateSummary(framework, detectedPatterns, assessmentScores, redFlags);
    
    return {
      framework,
      detectedPatterns,
      assessmentScores,
      recommendations,
      redFlags,
      confidenceScore,
      summary
    };
  }
  
  /**
   * Score movement against assessment protocol
   */
  private scoreAgainstProtocol(
    protocol: AssessmentProtocol,
    metrics: MovementMetrics
  ): number {
    let score = 100;
    let testsPerformed = 0;
    
    // Check each metric against normal ranges
    Object.entries(protocol.normalRanges).forEach(([metric, range]) => {
      const value = this.getMetricValue(metric, metrics);
      if (value !== null) {
        testsPerformed++;
        if (value < range.min) {
          score -= (range.min - value) / range.min * 20;
        } else if (value > range.max) {
          score -= (value - range.max) / range.max * 20;
        }
      }
    });
    
    // Penalize for compensations
    metrics.compensations.forEach(compensation => {
      if (protocol.redFlags.includes(compensation)) {
        score -= 10;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metricName: string, metrics: MovementMetrics): number | null {
    // Map metric names to actual values
    if (metricName.includes('angle') || metricName.includes('flexion') || metricName.includes('rotation')) {
      return metrics.jointAngles[metricName] || null;
    }
    if (metricName.includes('symmetry')) {
      return metrics.symmetry[metricName.replace('_symmetry', '')] || null;
    }
    if (metricName.includes('lean') || metricName.includes('tilt')) {
      return metrics.jointAngles[metricName] || null;
    }
    return null;
  }
  
  /**
   * Check if a red flag is present
   */
  private checkRedFlag(flag: string, metrics: MovementMetrics): boolean {
    // Check compensations
    if (metrics.compensations.includes(flag)) {
      return true;
    }
    
    // Check specific conditions
    switch (flag) {
      case 'excessive_pelvic_drop':
        return Math.abs(metrics.jointAngles['pelvic_tilt'] || 0) > 10;
      case 'trendelenburg_sign':
        return Math.abs(metrics.jointAngles['pelvic_tilt'] || 0) > 15;
      case 'dynamic_valgus':
        return metrics.compensations.includes('knee_valgus_left') || 
               metrics.compensations.includes('knee_valgus_right');
      case 'winging':
        return metrics.compensations.includes('possible_scapular_dyskinesis');
      default:
        return false;
    }
  }
  
  /**
   * Detect clinical patterns based on framework
   */
  private detectClinicalPatterns(
    framework: ClinicalFramework,
    metrics: MovementMetrics
  ): ClinicalPattern[] {
    const detected: ClinicalPattern[] = [];
    
    framework.clinicalPatterns.forEach(pattern => {
      let indicatorCount = 0;
      let totalIndicators = pattern.indicators.length;
      
      pattern.indicators.forEach(indicator => {
        if (this.checkIndicator(indicator, metrics)) {
          indicatorCount++;
        }
      });
      
      const confidence = indicatorCount / totalIndicators;
      if (confidence > 0.5) {
        detected.push({
          ...pattern,
          confidence: confidence * 100
        });
      }
    });
    
    return detected;
  }
  
  /**
   * Check if an indicator is present
   */
  private checkIndicator(indicator: string, metrics: MovementMetrics): boolean {
    // Map indicators to metric checks
    switch (indicator) {
      case 'painful_arc':
        // Would need pain input from user
        return false;
      case 'overhead_limitation':
        return (metrics.jointAngles['shoulder_left_flexion'] || 180) < 160 ||
               (metrics.jointAngles['shoulder_right_flexion'] || 180) < 160;
      case 'morning_stiffness':
        // Would need user input
        return false;
      case 'knee_valgus':
        return metrics.compensations.includes('knee_valgus_left') ||
               metrics.compensations.includes('knee_valgus_right');
      default:
        return false;
    }
  }
  
  /**
   * Generate treatment recommendations
   */
  private generateRecommendations(
    framework: ClinicalFramework,
    patterns: ClinicalPattern[]
  ): TreatmentPathway[] {
    const recommendations: TreatmentPathway[] = [];
    const addedIds = new Set<string>();
    
    patterns.forEach(pattern => {
      framework.treatmentPathways.forEach(pathway => {
        if (!addedIds.has(pathway.id)) {
          // Match pathways to patterns
          const conditionMatch = pathway.condition.toLowerCase().includes(pattern.id) ||
                                pattern.name.toLowerCase().includes(pathway.condition);
          if (conditionMatch) {
            recommendations.push(pathway);
            addedIds.add(pathway.id);
          }
        }
      });
    });
    
    // If no specific recommendations, add phase 1 general protocol
    if (recommendations.length === 0 && framework.treatmentPathways.length > 0) {
      recommendations.push(framework.treatmentPathways[0]);
    }
    
    return recommendations;
  }
  
  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    assessmentScores: Record<string, number>,
    patterns: ClinicalPattern[]
  ): number {
    const scores = Object.values(assessmentScores);
    const avgAssessmentScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 50;
    
    const patternConfidences = patterns.map(p => p.confidence);
    const avgPatternConfidence = patternConfidences.length > 0
      ? patternConfidences.reduce((a, b) => a + b, 0) / patternConfidences.length
      : 50;
    
    return (avgAssessmentScore * 0.6 + avgPatternConfidence * 0.4);
  }
  
  /**
   * Generate analysis summary
   */
  private generateSummary(
    framework: ClinicalFramework,
    patterns: ClinicalPattern[],
    scores: Record<string, number>,
    redFlags: string[]
  ): string {
    let summary = `Analysis using ${framework.name}:\n\n`;
    
    if (patterns.length > 0) {
      summary += 'Detected Patterns:\n';
      patterns.forEach(p => {
        summary += `- ${p.name} (${p.confidence.toFixed(0)}% confidence)\n`;
      });
      summary += '\n';
    }
    
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    summary += `Overall Assessment Score: ${avgScore.toFixed(0)}%\n`;
    
    if (redFlags.length > 0) {
      summary += '\nRed Flags Detected:\n';
      redFlags.forEach(flag => {
        summary += `⚠️ ${flag}\n`;
      });
    }
    
    summary += `\nEvidence Level: ${framework.evidenceLevel}`;
    
    return summary;
  }
  
  /**
   * Get historical trend for a specific metric
   */
  getHistoricalTrend(metricName: string): number[] {
    return this.historicalData.map(data => {
      return this.getMetricValue(metricName, data) || 0;
    });
  }
  
  /**
   * Clear historical data
   */
  clearHistory(): void {
    this.historicalData = [];
  }
}