/**
 * Movement Fault Analysis System
 * Detects biomechanical faults during movement and correlates with clinical symptoms
 */

import type { NormalizedLandmark } from '@mediapipe/pose';
import type { MovementType, MovementFrame } from './MovementClassifier';

export type FaultType = 
  // Lower body faults
  | 'knee_valgus'           // Knees cave inward
  | 'knee_varus'            // Knees bow outward  
  | 'excessive_forward_lean' // Forward trunk lean
  | 'heel_rise'             // Heels lift too early
  | 'ankle_collapse'        // Ankle instability
  | 'hip_drop'              // Contralateral hip drop
  | 'hip_shift'             // Lateral hip deviation
  | 'asymmetric_loading'    // Uneven weight distribution
  // Upper body faults
  | 'forward_head_posture'  // Head projects forward
  | 'rounded_shoulders'     // Shoulders internally rotate
  | 'elevated_shoulders'    // Shoulders hike up
  | 'trunk_rotation'        // Excessive trunk twist
  | 'arm_asymmetry'         // Uneven arm positioning
  // Core/stability faults
  | 'loss_of_balance'       // Balance compromise
  | 'excessive_sway'        // Too much postural sway
  | 'poor_alignment'        // Overall postural issues
  | 'insufficient_range'    // Limited movement range
  | 'excessive_velocity'    // Too fast movement
  | 'poor_control'          // Jerky/uncontrolled movement;

export interface MovementFault {
  type: FaultType;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number; // 0-1
  timestamp: number;
  affectedJoints: string[];
  measurementValue: number; // Actual measured value (degrees, etc.)
  normalRange: { min: number; max: number }; // Expected normal range
  description: string;
}

export interface ClinicalCorrelation {
  potentialSymptoms: string[];
  injuryRisks: string[];
  commonCauses: string[];
  recommendedInterventions: string[];
  urgencyLevel: 'low' | 'moderate' | 'high';
}

export interface FaultAnalysisResult {
  detectedFaults: MovementFault[];
  overallMovementQuality: number; // 0-10 score
  clinicalInsights: {
    primaryConcerns: string[];
    riskFactors: string[];
    compensationPatterns: string[];
  };
  recommendations: {
    immediateCorrections: string[];
    exerciseTargets: string[];
    referralSuggestions: string[];
  };
}

export class MovementFaultAnalyzer {
  private faultDatabase: Map<FaultType, ClinicalCorrelation> = new Map();
  private movementNorms: Map<string, { min: number; max: number }> = new Map();

  constructor() {
    this.initializeFaultDatabase();
    this.initializeMovementNorms();
  }

  /**
   * Analyze movement frame for biomechanical faults
   */
  analyzeFaults(
    frames: MovementFrame[], 
    movementType: MovementType,
    isCurrentlyMoving: boolean = true
  ): FaultAnalysisResult {
    const detectedFaults: MovementFault[] = [];
    
    if (frames.length < 5) {
      return this.createEmptyResult();
    }

    const currentFrame = frames[frames.length - 1];
    
    // Analyze movement-specific faults
    switch (movementType) {
      case 'squat':
        detectedFaults.push(...this.analyzeSquatFaults(frames));
        break;
      case 'lunge':
        detectedFaults.push(...this.analyzeLungeFaults(frames));
        break;
      case 'single_leg_stand':
        detectedFaults.push(...this.analyzeBalanceFaults(frames));
        break;
      case 'jumping':
        detectedFaults.push(...this.analyzeJumpingFaults(frames));
        break;
      case 'arm_raise':
        detectedFaults.push(...this.analyzeShoulderFaults(frames));
        break;
      case 'static':
        detectedFaults.push(...this.analyzePosturalFaults(frames));
        break;
      default:
        // General movement analysis for other types
        detectedFaults.push(...this.analyzeGeneralFaults(frames));
        break;
    }

    // Calculate overall movement quality
    const overallQuality = this.calculateMovementQuality(detectedFaults);
    
    // Generate clinical insights
    const clinicalInsights = this.generateClinicalInsights(detectedFaults, movementType);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedFaults, movementType);

    return {
      detectedFaults,
      overallMovementQuality: overallQuality,
      clinicalInsights,
      recommendations
    };
  }

  /**
   * Analyze squat-specific faults
   */
  private analyzeSquatFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    const currentFrame = frames[frames.length - 1];
    
    // Check for knee valgus (knees caving in)
    const kneeValgus = this.detectKneeValgus(frames);
    if (kneeValgus.detected) {
      faults.push({
        type: 'knee_valgus',
        severity: kneeValgus.severity,
        confidence: kneeValgus.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['left_knee', 'right_knee'],
        measurementValue: kneeValgus.angle,
        normalRange: { min: 0, max: 10 }, // degrees of acceptable valgus
        description: `Knees collapse inward ${kneeValgus.angle.toFixed(1)}° beyond normal range`
      });
    }

    // Check for excessive forward lean
    const forwardLean = this.detectExcessiveForwardLean(frames);
    if (forwardLean.detected) {
      faults.push({
        type: 'excessive_forward_lean',
        severity: forwardLean.severity,
        confidence: forwardLean.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['trunk', 'hip'],
        measurementValue: forwardLean.angle,
        normalRange: { min: 0, max: 45 }, // degrees from vertical
        description: `Excessive forward trunk lean at ${forwardLean.angle.toFixed(1)}°`
      });
    }

    // Check for heel rise
    const heelRise = this.detectHeelRise(frames);
    if (heelRise.detected) {
      faults.push({
        type: 'heel_rise',
        severity: heelRise.severity,
        confidence: heelRise.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['left_ankle', 'right_ankle'],
        measurementValue: heelRise.liftAmount,
        normalRange: { min: 0, max: 0.02 }, // normalized lift threshold
        description: 'Heels lifting during descent phase - indicates ankle mobility limitation'
      });
    }

    // Check for asymmetric loading
    const asymmetry = this.detectAsymmetricLoading(frames);
    if (asymmetry.detected) {
      faults.push({
        type: 'asymmetric_loading',
        severity: asymmetry.severity,
        confidence: asymmetry.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['left_hip', 'right_hip'],
        measurementValue: asymmetry.imbalance,
        normalRange: { min: 0, max: 0.15 }, // acceptable weight shift
        description: `${(asymmetry.imbalance * 100).toFixed(1)}% weight distribution imbalance`
      });
    }

    return faults;
  }

  /**
   * Analyze lunge-specific faults
   */
  private analyzeLungeFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    const currentFrame = frames[frames.length - 1];

    // Check for knee tracking issues
    const kneeTracking = this.detectKneeTrackingFault(frames);
    if (kneeTracking.detected) {
      faults.push({
        type: kneeTracking.valgus ? 'knee_valgus' : 'knee_varus',
        severity: kneeTracking.severity,
        confidence: kneeTracking.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['front_knee'],
        measurementValue: kneeTracking.deviation,
        normalRange: { min: -10, max: 10 },
        description: `Front knee tracking ${kneeTracking.deviation > 0 ? 'inward' : 'outward'} by ${Math.abs(kneeTracking.deviation).toFixed(1)}°`
      });
    }

    // Check for ankle collapse
    const ankleCollapse = this.detectAnkleCollapse(frames);
    if (ankleCollapse.detected) {
      faults.push({
        type: 'ankle_collapse',
        severity: ankleCollapse.severity,
        confidence: ankleCollapse.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['front_ankle'],
        measurementValue: ankleCollapse.collapseAngle,
        normalRange: { min: -5, max: 5 },
        description: 'Ankle instability during lunge - medial collapse detected'
      });
    }

    return faults;
  }

  /**
   * Analyze balance-specific faults
   */
  private analyzeBalanceFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    const currentFrame = frames[frames.length - 1];

    // Check for hip drop (Trendelenburg sign)
    const hipDrop = this.detectHipDrop(frames);
    if (hipDrop.detected) {
      faults.push({
        type: 'hip_drop',
        severity: hipDrop.severity,
        confidence: hipDrop.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['pelvis', 'hip'],
        measurementValue: hipDrop.dropAngle,
        normalRange: { min: -5, max: 5 },
        description: `Contralateral hip drop of ${hipDrop.dropAngle.toFixed(1)}° indicating hip abductor weakness`
      });
    }

    // Check for excessive sway
    const sway = this.detectExcessiveSway(frames);
    if (sway.detected) {
      faults.push({
        type: 'excessive_sway',
        severity: sway.severity,
        confidence: sway.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['trunk', 'pelvis'],
        measurementValue: sway.swayAmount,
        normalRange: { min: 0, max: 0.05 },
        description: `Excessive postural sway (${(sway.swayAmount * 100).toFixed(1)}cm) indicating balance deficits`
      });
    }

    return faults;
  }

  /**
   * Analyze jumping-specific faults
   */
  private analyzeJumpingFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    
    // Focus on landing mechanics
    const landingFaults = this.analyzeLandingMechanics(frames);
    faults.push(...landingFaults);

    return faults;
  }

  /**
   * Analyze shoulder-specific faults
   */
  private analyzeShoulderFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    const currentFrame = frames[frames.length - 1];

    // Check for shoulder elevation asymmetry
    const asymmetry = this.detectShoulderAsymmetry(frames);
    if (asymmetry.detected) {
      faults.push({
        type: 'arm_asymmetry',
        severity: asymmetry.severity,
        confidence: asymmetry.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['left_shoulder', 'right_shoulder'],
        measurementValue: asymmetry.difference,
        normalRange: { min: 0, max: 10 },
        description: `${asymmetry.difference.toFixed(1)}° difference in shoulder elevation`
      });
    }

    // Check for forward head posture
    const headPosture = this.detectForwardHeadPosture(frames);
    if (headPosture.detected) {
      faults.push({
        type: 'forward_head_posture',
        severity: headPosture.severity,
        confidence: headPosture.confidence,
        timestamp: currentFrame.timestamp,
        affectedJoints: ['cervical_spine', 'head'],
        measurementValue: headPosture.forwardDistance,
        normalRange: { min: 0, max: 0.05 },
        description: 'Forward head posture detected - may contribute to neck strain'
      });
    }

    return faults;
  }

  /**
   * Analyze postural faults during static positions
   */
  private analyzePosturalFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    
    // Static posture analysis
    const posturalAnalysis = this.analyzeStaticPosture(frames);
    faults.push(...posturalAnalysis);

    return faults;
  }

  /**
   * Analyze general movement faults
   */
  private analyzeGeneralFaults(frames: MovementFrame[]): MovementFault[] {
    const faults: MovementFault[] = [];
    
    // Check for poor movement control
    const movementControl = this.assessMovementControl(frames);
    if (movementControl.detected) {
      faults.push({
        type: 'poor_control',
        severity: movementControl.severity,
        confidence: movementControl.confidence,
        timestamp: frames[frames.length - 1].timestamp,
        affectedJoints: ['multiple'],
        measurementValue: movementControl.jerkiness,
        normalRange: { min: 0, max: 0.1 },
        description: 'Jerky or uncontrolled movement patterns detected'
      });
    }

    return faults;
  }

  // Fault detection methods implementation continues...
  // [The actual detection algorithms would be implemented here]
  
  private detectKneeValgus(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; angle: number } {
    // Simplified implementation - in reality would analyze knee-ankle-hip alignment
    const currentFrame = frames[frames.length - 1];
    
    // Calculate knee alignment relative to ankle and hip
    const leftKnee = currentFrame.landmarks[25];
    const rightKnee = currentFrame.landmarks[26];
    const leftAnkle = currentFrame.landmarks[27];
    const rightAnkle = currentFrame.landmarks[28];
    const leftHip = currentFrame.landmarks[23];
    const rightHip = currentFrame.landmarks[24];
    
    // Simplified valgus calculation
    const leftValgusAngle = this.calculateValgusAngle(leftHip, leftKnee, leftAnkle);
    const rightValgusAngle = this.calculateValgusAngle(rightHip, rightKnee, rightAnkle);
    const maxValgus = Math.max(leftValgusAngle, rightValgusAngle);
    
    const detected = maxValgus > 15; // degrees
    const severity = maxValgus > 25 ? 'severe' : maxValgus > 20 ? 'moderate' : 'mild';
    
    return {
      detected,
      severity,
      confidence: detected ? Math.min(0.9, maxValgus / 30) : 0,
      angle: maxValgus
    };
  }

  private calculateValgusAngle(hip: NormalizedLandmark, knee: NormalizedLandmark, ankle: NormalizedLandmark): number {
    // Calculate the angle between hip-knee and knee-ankle vectors
    const vector1 = { x: hip.x - knee.x, y: hip.y - knee.y };
    const vector2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
    
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
    
    // Convert to valgus measurement (deviation from 180 degrees)
    return Math.abs(180 - angle);
  }

  // Placeholder implementations for other detection methods
  private detectExcessiveForwardLean(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, angle: 0 };
  }

  private detectHeelRise(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, liftAmount: 0 };
  }

  private detectAsymmetricLoading(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, imbalance: 0 };
  }

  private detectKneeTrackingFault(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, deviation: 0, valgus: true };
  }

  private detectAnkleCollapse(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, collapseAngle: 0 };
  }

  private detectHipDrop(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, dropAngle: 0 };
  }

  private detectExcessiveSway(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, swayAmount: 0 };
  }

  private analyzeLandingMechanics(frames: MovementFrame[]): MovementFault[] {
    return [];
  }

  private detectShoulderAsymmetry(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, difference: 0 };
  }

  private detectForwardHeadPosture(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, forwardDistance: 0 };
  }

  private analyzeStaticPosture(frames: MovementFrame[]): MovementFault[] {
    return [];
  }

  private assessMovementControl(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, jerkiness: 0 };
  }

  /**
   * Calculate overall movement quality score
   */
  private calculateMovementQuality(faults: MovementFault[]): number {
    if (faults.length === 0) return 10;
    
    const severityWeights = { mild: 1, moderate: 2, severe: 3 };
    const totalDeduction = faults.reduce((sum, fault) => {
      return sum + (severityWeights[fault.severity] * fault.confidence);
    }, 0);
    
    return Math.max(0, 10 - totalDeduction);
  }

  /**
   * Generate clinical insights from detected faults
   */
  private generateClinicalInsights(faults: MovementFault[], movementType: MovementType) {
    const primaryConcerns: string[] = [];
    const riskFactors: string[] = [];
    const compensationPatterns: string[] = [];

    faults.forEach(fault => {
      const correlation = this.faultDatabase.get(fault.type);
      if (correlation) {
        primaryConcerns.push(...correlation.potentialSymptoms.slice(0, 2));
        riskFactors.push(...correlation.injuryRisks.slice(0, 2));
      }
    });

    return {
      primaryConcerns: Array.from(new Set(primaryConcerns)),
      riskFactors: Array.from(new Set(riskFactors)),
      compensationPatterns: Array.from(new Set(compensationPatterns))
    };
  }

  /**
   * Generate recommendations based on detected faults
   */
  private generateRecommendations(faults: MovementFault[], movementType: MovementType) {
    const immediateCorrections: string[] = [];
    const exerciseTargets: string[] = [];
    const referralSuggestions: string[] = [];

    faults.forEach(fault => {
      const correlation = this.faultDatabase.get(fault.type);
      if (correlation) {
        immediateCorrections.push(...correlation.recommendedInterventions.slice(0, 2));
        
        if (correlation.urgencyLevel === 'high') {
          referralSuggestions.push(`Consider ${fault.type.replace('_', ' ')} assessment by qualified professional`);
        }
      }
    });

    return {
      immediateCorrections: Array.from(new Set(immediateCorrections)),
      exerciseTargets: Array.from(new Set(exerciseTargets)),
      referralSuggestions: Array.from(new Set(referralSuggestions))
    };
  }

  private createEmptyResult(): FaultAnalysisResult {
    return {
      detectedFaults: [],
      overallMovementQuality: 10,
      clinicalInsights: {
        primaryConcerns: [],
        riskFactors: [],
        compensationPatterns: []
      },
      recommendations: {
        immediateCorrections: [],
        exerciseTargets: [],
        referralSuggestions: []
      }
    };
  }

  /**
   * Initialize fault database with clinical correlations
   */
  private initializeFaultDatabase() {
    this.faultDatabase = new Map([
      ['knee_valgus', {
        potentialSymptoms: ['Knee pain', 'Anterior knee pain', 'IT band tightness'],
        injuryRisks: ['ACL injury', 'Patellofemoral pain syndrome', 'IT band syndrome'],
        commonCauses: ['Hip abductor weakness', 'Ankle mobility limitations', 'Core instability'],
        recommendedInterventions: ['Hip abduction strengthening', 'Ankle mobility work', 'Movement retraining'],
        urgencyLevel: 'moderate'
      }],
      ['excessive_forward_lean', {
        potentialSymptoms: ['Lower back pain', 'Hip tightness'],
        injuryRisks: ['Lumbar spine strain', 'Hip flexor tightness'],
        commonCauses: ['Ankle mobility restriction', 'Hip flexor tightness', 'Core weakness'],
        recommendedInterventions: ['Ankle dorsiflexion stretching', 'Hip flexor stretching', 'Core strengthening'],
        urgencyLevel: 'low'
      }],
      ['forward_head_posture', {
        potentialSymptoms: ['Neck pain', 'Headaches', 'Upper back tension'],
        injuryRisks: ['Cervical strain', 'Thoracic outlet syndrome', 'TMJ dysfunction'],
        commonCauses: ['Prolonged sitting', 'Weak deep neck flexors', 'Tight upper trapezius'],
        recommendedInterventions: ['Chin tucks', 'Deep neck flexor strengthening', 'Upper trap stretching'],
        urgencyLevel: 'moderate'
      }],
      ['hip_drop', {
        potentialSymptoms: ['Hip pain', 'Lower back pain', 'Knee pain'],
        injuryRisks: ['IT band syndrome', 'Greater trochanteric bursitis', 'Lumbar dysfunction'],
        commonCauses: ['Hip abductor weakness', 'Core instability', 'Previous injury'],
        recommendedInterventions: ['Hip abduction strengthening', 'Single leg balance training', 'Core stabilization'],
        urgencyLevel: 'moderate'
      }]
      // Additional fault correlations would be added here
    ]);
  }

  /**
   * Initialize movement norms database
   */
  private initializeMovementNorms() {
    this.movementNorms = new Map([
      ['knee_flexion_squat', { min: 90, max: 135 }],
      ['forward_lean_squat', { min: 0, max: 45 }],
      ['knee_valgus_angle', { min: 0, max: 10 }],
      ['shoulder_elevation', { min: 0, max: 180 }],
      ['hip_drop_angle', { min: -5, max: 5 }]
      // Additional norms would be added here
    ]);
  }
}