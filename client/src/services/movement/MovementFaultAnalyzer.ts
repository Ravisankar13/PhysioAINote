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
  private detectExcessiveForwardLean(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; angle: number } {
    const currentFrame = frames[frames.length - 1];
    
    // Get landmarks for trunk alignment analysis
    const leftShoulder = currentFrame.landmarks[11];
    const rightShoulder = currentFrame.landmarks[12];
    const leftHip = currentFrame.landmarks[23];
    const rightHip = currentFrame.landmarks[24];
    
    // Calculate average shoulder and hip positions
    const avgShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const avgHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    // Calculate trunk vector (hip to shoulder)
    const trunkVector = { x: avgShoulder.x - avgHip.x, y: avgShoulder.y - avgHip.y };
    const verticalVector = { x: 0, y: -1 }; // Upward vertical
    
    // Calculate trunk lean angle from vertical
    const dot = trunkVector.x * verticalVector.x + trunkVector.y * verticalVector.y;
    const trunkMag = Math.sqrt(trunkVector.x * trunkVector.x + trunkVector.y * trunkVector.y);
    
    if (trunkMag === 0) return { detected: false, severity: 'mild', confidence: 0, angle: 0 };
    
    const leanAngle = Math.acos(Math.abs(dot) / trunkMag) * (180 / Math.PI);
    
    // Forward lean detected when trunk angle exceeds normal limits
    const detected = leanAngle > 15.0; // degrees from vertical
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (leanAngle > 35.0) severity = 'severe';
    else if (leanAngle > 25.0) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.9, leanAngle / 40.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      angle: leanAngle
    };
  }

  private detectHeelRise(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; liftAmount: number } {
    if (frames.length < 3) {
      return { detected: false, severity: 'mild', confidence: 0, liftAmount: 0 };
    }
    
    const currentFrame = frames[frames.length - 1];
    const initialFrame = frames[0];
    
    // Get heel positions (using ankle as proxy for heel)
    const leftAnkleCurrent = currentFrame.landmarks[27];
    const rightAnkleCurrent = currentFrame.landmarks[28];
    const leftAnkleInitial = initialFrame.landmarks[27];
    const rightAnkleInitial = initialFrame.landmarks[28];
    
    // Calculate vertical displacement of heels
    const leftHeelRise = Math.abs(leftAnkleCurrent.y - leftAnkleInitial.y);
    const rightHeelRise = Math.abs(rightAnkleCurrent.y - rightAnkleInitial.y);
    const maxHeelRise = Math.max(leftHeelRise, rightHeelRise);
    
    // Also check current heel height relative to toes (if available)
    // Using foot index landmarks as approximation
    const leftToe = currentFrame.landmarks[31] || leftAnkleCurrent; // Fallback to ankle
    const rightToe = currentFrame.landmarks[32] || rightAnkleCurrent;
    
    const leftHeelHeight = Math.abs(leftAnkleCurrent.y - leftToe.y);
    const rightHeelHeight = Math.abs(rightAnkleCurrent.y - rightToe.y);
    const maxHeelHeight = Math.max(leftHeelHeight, rightHeelHeight);
    
    // Convert to approximate measurement
    const liftAmountNormalized = Math.max(maxHeelRise, maxHeelHeight * 0.3); // Weight current height less
    
    // Heel rise detected when lift exceeds normal limits
    const detected = liftAmountNormalized > 0.03; // 3% of normalized coordinate space
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (liftAmountNormalized > 0.08) severity = 'severe';
    else if (liftAmountNormalized > 0.055) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.9, liftAmountNormalized / 0.1) : 0;
    
    return {
      detected,
      severity,
      confidence,
      liftAmount: liftAmountNormalized
    };
  }

  private detectAsymmetricLoading(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; imbalance: number } {
    const currentFrame = frames[frames.length - 1];
    
    // Get body landmarks for center of mass calculation
    const leftHip = currentFrame.landmarks[23];
    const rightHip = currentFrame.landmarks[24];
    const leftShoulder = currentFrame.landmarks[11];
    const rightShoulder = currentFrame.landmarks[12];
    const leftAnkle = currentFrame.landmarks[27];
    const rightAnkle = currentFrame.landmarks[28];
    
    // Calculate approximate center of mass
    const centerOfMass = {
      x: (leftHip.x + rightHip.x + leftShoulder.x + rightShoulder.x) / 4,
      y: (leftHip.y + rightHip.y + leftShoulder.y + rightShoulder.y) / 4
    };
    
    // Calculate base of support (center point between feet)
    const baseOfSupport = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2
    };
    
    // Calculate lateral displacement from center line
    const lateralDisplacement = Math.abs(centerOfMass.x - baseOfSupport.x);
    
    // Calculate weight distribution asymmetry
    const leftDistance = Math.abs(centerOfMass.x - leftAnkle.x);
    const rightDistance = Math.abs(centerOfMass.x - rightAnkle.x);
    const totalDistance = leftDistance + rightDistance;
    
    let weightAsymmetry = 0;
    if (totalDistance > 0) {
      const leftWeight = rightDistance / totalDistance;
      const rightWeight = leftDistance / totalDistance;
      weightAsymmetry = Math.abs(leftWeight - rightWeight);
    }
    
    // Convert to percentage imbalance
    const imbalancePercentage = weightAsymmetry * 100;
    
    // Asymmetric loading detected when imbalance exceeds normal limits
    const detected = imbalancePercentage > 15.0; // 15% imbalance threshold
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (imbalancePercentage > 35.0) severity = 'severe';
    else if (imbalancePercentage > 25.0) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.9, imbalancePercentage / 40.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      imbalance: weightAsymmetry
    };
  }

  private detectKneeTrackingFault(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; deviation: number; valgus: boolean } {
    const currentFrame = frames[frames.length - 1];
    
    // Get landmarks for frontal plane knee tracking analysis
    const leftHip = currentFrame.landmarks[23];
    const rightHip = currentFrame.landmarks[24];
    const leftKnee = currentFrame.landmarks[25];
    const rightKnee = currentFrame.landmarks[26];
    const leftAnkle = currentFrame.landmarks[27];
    const rightAnkle = currentFrame.landmarks[28];
    
    // Calculate knee tracking for each leg
    const leftTracking = this.calculateKneeTracking(leftHip, leftKnee, leftAnkle);
    const rightTracking = this.calculateKneeTracking(rightHip, rightKnee, rightAnkle);
    
    // Determine which leg has worse tracking
    const maxDeviation = Math.max(Math.abs(leftTracking.valgusAngle), Math.abs(rightTracking.valgusAngle));
    const primaryValgus = Math.abs(leftTracking.valgusAngle) > Math.abs(rightTracking.valgusAngle);
    const isValgus = (primaryValgus ? leftTracking.valgusAngle : rightTracking.valgusAngle) > 0;
    
    // Knee tracking fault detected when deviation exceeds normal limits
    const detected = maxDeviation > 12.0; // degrees
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (maxDeviation > 25.0) severity = 'severe';
    else if (maxDeviation > 18.0) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.95, maxDeviation / 30.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      deviation: maxDeviation,
      valgus: isValgus
    };
  }
  
  private calculateKneeTracking(hip: NormalizedLandmark, knee: NormalizedLandmark, ankle: NormalizedLandmark): { valgusAngle: number } {
    // Calculate the frontal plane projection angle
    // This measures how much the knee deviates medially (valgus) or laterally (varus) from the hip-ankle line
    
    // Create vectors
    const hipAnkleVector = { x: ankle.x - hip.x, y: ankle.y - hip.y };
    const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
    
    // Calculate the perpendicular distance of knee from the hip-ankle line
    const lineLength = Math.sqrt(hipAnkleVector.x * hipAnkleVector.x + hipAnkleVector.y * hipAnkleVector.y);
    if (lineLength === 0) return { valgusAngle: 0 };
    
    // Normalize the hip-ankle vector
    const normalizedLine = { x: hipAnkleVector.x / lineLength, y: hipAnkleVector.y / lineLength };
    
    // Project knee onto the hip-ankle line
    const projectionLength = hipKneeVector.x * normalizedLine.x + hipKneeVector.y * normalizedLine.y;
    const projectionPoint = {
      x: hip.x + projectionLength * normalizedLine.x,
      y: hip.y + projectionLength * normalizedLine.y
    };
    
    // Calculate perpendicular distance (lateral deviation)
    const lateralDistance = Math.sqrt(
      Math.pow(knee.x - projectionPoint.x, 2) + Math.pow(knee.y - projectionPoint.y, 2)
    );
    
    // Determine if it's medial (valgus) or lateral (varus) deviation
    // Cross product to determine side
    const crossProduct = hipAnkleVector.x * (knee.y - hip.y) - hipAnkleVector.y * (knee.x - hip.x);
    const isMedial = crossProduct > 0; // Positive means knee is to the right of the line (medial for left leg, lateral for right leg)
    
    // Convert distance to approximate angle
    const kneeAngle = Math.atan(lateralDistance / Math.max(0.01, projectionLength)) * (180 / Math.PI);
    
    return {
      valgusAngle: isMedial ? kneeAngle : -kneeAngle
    };
  }

  private detectAnkleCollapse(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; collapseAngle: number } {
    const currentFrame = frames[frames.length - 1];
    
    // Get relevant landmarks for ankle alignment
    const leftAnkle = currentFrame.landmarks[27];
    const rightAnkle = currentFrame.landmarks[28];
    const leftKnee = currentFrame.landmarks[25];
    const rightKnee = currentFrame.landmarks[26];
    const leftHeel = currentFrame.landmarks[29]; // approximate heel position
    const rightHeel = currentFrame.landmarks[30]; // approximate heel position
    
    // Calculate ankle alignment for both sides
    const leftAnkleAlignment = this.calculateAnkleAlignment(leftKnee, leftAnkle, leftHeel);
    const rightAnkleAlignment = this.calculateAnkleAlignment(rightKnee, rightAnkle, rightHeel);
    
    const maxCollapse = Math.max(leftAnkleAlignment.collapse, rightAnkleAlignment.collapse);
    
    // Ankle collapse detected when medial deviation exceeds normal limits
    const detected = maxCollapse > 8.0; // degrees of medial deviation
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (maxCollapse > 18.0) severity = 'severe';
    else if (maxCollapse > 13.0) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.9, maxCollapse / 25.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      collapseAngle: maxCollapse
    };
  }
  
  private calculateAnkleAlignment(knee: NormalizedLandmark, ankle: NormalizedLandmark, heel: NormalizedLandmark): { collapse: number } {
    // Calculate the angle between knee-ankle and ankle-heel vectors to assess medial collapse
    const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
    const ankleMidfoot = { x: heel.x - ankle.x, y: heel.y - ankle.y };
    
    // Calculate angle between vectors
    const dot = kneeAnkleVector.x * ankleMidfoot.x + kneeAnkleVector.y * ankleMidfoot.y;
    const mag1 = Math.sqrt(kneeAnkleVector.x * kneeAnkleVector.x + kneeAnkleVector.y * kneeAnkleVector.y);
    const mag2 = Math.sqrt(ankleMidfoot.x * ankleMidfoot.x + ankleMidfoot.y * ankleMidfoot.y);
    
    if (mag1 === 0 || mag2 === 0) return { collapse: 0 };
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    
    // Collapse is deviation from ideal alignment (should be close to straight)
    const collapse = Math.abs(180 - angle);
    
    return { collapse };
  }

  private detectHipDrop(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; dropAngle: number } {
    const currentFrame = frames[frames.length - 1];
    
    // Get hip landmarks
    const leftHip = currentFrame.landmarks[23];
    const rightHip = currentFrame.landmarks[24];
    
    // Calculate pelvic tilt angle
    const pelvicVector = { x: rightHip.x - leftHip.x, y: rightHip.y - leftHip.y };
    const horizontalVector = { x: 1, y: 0 };
    
    // Calculate angle of pelvis relative to horizontal
    const dot = pelvicVector.x * horizontalVector.x + pelvicVector.y * horizontalVector.y;
    const pelvicMag = Math.sqrt(pelvicVector.x * pelvicVector.x + pelvicVector.y * pelvicVector.y);
    const pelvicAngle = Math.acos(Math.abs(dot) / pelvicMag) * (180 / Math.PI);
    
    // Determine which hip is dropped
    const rightHipDrop = leftHip.y < rightHip.y; // Lower y = higher position
    const dropAngle = Math.abs(pelvicAngle);
    
    // Hip drop detected when pelvic tilt exceeds normal limits
    const detected = dropAngle > 4.0; // degrees
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (dropAngle > 12.0) severity = 'severe';
    else if (dropAngle > 8.0) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.95, dropAngle / 15.0) : 0;
    
    // For single-leg stance, check for temporal consistency
    let temporalConsistency = 1.0;
    if (frames.length > 10) {
      const recentFrames = frames.slice(-10);
      const consistentDrops = recentFrames.filter(frame => {
        const fLeftHip = frame.landmarks[23];
        const fRightHip = frame.landmarks[24];
        const fPelvicVector = { x: fRightHip.x - fLeftHip.x, y: fRightHip.y - fLeftHip.y };
        const fPelvicMag = Math.sqrt(fPelvicVector.x * fPelvicVector.x + fPelvicVector.y * fPelvicVector.y);
        const fPelvicAngle = Math.acos(Math.abs((fPelvicVector.x * horizontalVector.x) / fPelvicMag)) * (180 / Math.PI);
        return fPelvicAngle > 4.0;
      }).length;
      
      temporalConsistency = consistentDrops / recentFrames.length;
    }
    
    return {
      detected,
      severity,
      confidence: confidence * temporalConsistency,
      dropAngle: rightHipDrop ? dropAngle : -dropAngle
    };
  }

  private detectExcessiveSway(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; swayAmount: number } {
    if (frames.length < 5) {
      return { detected: false, severity: 'mild', confidence: 0, swayAmount: 0 };
    }
    
    const currentFrame = frames[frames.length - 1];
    const recentFrames = frames.slice(-10); // Look at last 10 frames
    
    // Calculate center of mass for each frame
    const centerOfMassHistory = recentFrames.map(frame => {
      const leftHip = frame.landmarks[23];
      const rightHip = frame.landmarks[24];
      const leftShoulder = frame.landmarks[11];
      const rightShoulder = frame.landmarks[12];
      
      return {
        x: (leftHip.x + rightHip.x + leftShoulder.x + rightShoulder.x) / 4,
        y: (leftHip.y + rightHip.y + leftShoulder.y + rightShoulder.y) / 4,
        timestamp: frame.timestamp
      };
    });
    
    // Calculate sway velocity and displacement
    let maxDisplacement = 0;
    let totalVelocity = 0;
    
    for (let i = 1; i < centerOfMassHistory.length; i++) {
      const prev = centerOfMassHistory[i - 1];
      const curr = centerOfMassHistory[i];
      
      // Calculate displacement from previous frame
      const displacement = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      
      maxDisplacement = Math.max(maxDisplacement, displacement);
      
      // Calculate velocity (displacement per time)
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds
      if (timeDiff > 0) {
        totalVelocity += displacement / timeDiff;
      }
    }
    
    const avgVelocity = totalVelocity / (centerOfMassHistory.length - 1);
    
    // Calculate range of motion (total sway envelope)
    const xPositions = centerOfMassHistory.map(pos => pos.x);
    const yPositions = centerOfMassHistory.map(pos => pos.y);
    
    const xRange = Math.max(...xPositions) - Math.min(...xPositions);
    const yRange = Math.max(...yPositions) - Math.min(...yPositions);
    const totalSwayRange = Math.sqrt(xRange * xRange + yRange * yRange);
    
    // Convert to approximate centimeters (assuming normalized coordinates)
    const swayAmountCm = totalSwayRange * 100;
    
    // Excessive sway detected when range exceeds normal limits
    const detected = swayAmountCm > 3.0; // > 3cm total sway range
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (swayAmountCm > 8.0) severity = 'severe';
    else if (swayAmountCm > 5.5) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.9, swayAmountCm / 10.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      swayAmount: totalSwayRange
    };
  }

  private analyzeLandingMechanics(frames: MovementFrame[]): MovementFault[] {
    return [];
  }

  private detectShoulderAsymmetry(frames: MovementFrame[]) {
    return { detected: false, severity: 'mild' as const, confidence: 0, difference: 0 };
  }

  private detectForwardHeadPosture(frames: MovementFrame[]): { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; confidence: number; forwardDistance: number; angle: number } {
    const currentFrame = frames[frames.length - 1];
    
    // Get relevant landmarks for cervical spine alignment
    const nose = currentFrame.landmarks[0];
    const leftEar = currentFrame.landmarks[7];
    const rightEar = currentFrame.landmarks[8];
    const leftShoulder = currentFrame.landmarks[11];
    const rightShoulder = currentFrame.landmarks[12];
    
    // Calculate average ear and shoulder positions
    const avgEar = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2
    };
    const avgShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    // Calculate cervical lordosis angle (ear-shoulder alignment)
    const cervicalVector = { x: avgEar.x - avgShoulder.x, y: avgEar.y - avgShoulder.y };
    const verticalVector = { x: 0, y: -1 }; // Upward vertical
    
    // Calculate forward displacement
    const forwardDistance = Math.abs(avgEar.x - avgShoulder.x) * 100; // Convert to approximate cm
    
    // Calculate cervical angle deviation from vertical
    const dot = cervicalVector.x * verticalVector.x + cervicalVector.y * verticalVector.y;
    const cervicalMag = Math.sqrt(cervicalVector.x * cervicalVector.x + cervicalVector.y * cervicalVector.y);
    const angle = Math.acos(Math.abs(dot) / cervicalMag) * (180 / Math.PI);
    
    // Forward head is detected when ear is significantly forward of shoulder
    const detected = forwardDistance > 3.0; // > 3cm forward displacement
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (forwardDistance > 6.0) severity = 'severe';
    else if (forwardDistance > 4.5) severity = 'moderate';
    
    const confidence = detected ? Math.min(0.95, forwardDistance / 8.0) : 0;
    
    return {
      detected,
      severity,
      confidence,
      forwardDistance,
      angle
    };
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
      // Lower Body Faults
      ['knee_valgus', {
        potentialSymptoms: ['Anterior knee pain', 'Medial knee discomfort', 'IT band tightness', 'Patellofemoral pain', 'Hip pain during weight-bearing'],
        injuryRisks: ['ACL injury risk', 'Patellofemoral pain syndrome', 'IT band syndrome', 'Medial collateral ligament strain', 'Hip labral pathology'],
        commonCauses: ['Gluteus medius weakness', 'Ankle dorsiflexion limitation', 'Core instability', 'Hip internal rotation dominance', 'Foot pronation'],
        recommendedInterventions: ['Clamshells and side-lying hip abduction', 'Single-leg glute bridges', 'Ankle mobility exercises', 'Movement pattern retraining', 'Foot intrinsic strengthening'],
        urgencyLevel: 'moderate'
      }],
      ['knee_varus', {
        potentialSymptoms: ['Lateral knee pain', 'Ankle instability', 'Hip abductor overactivity', 'Foot supination discomfort'],
        injuryRisks: ['Lateral collateral ligament strain', 'Peroneal tendinopathy', 'Ankle inversion sprains', 'IT band friction syndrome'],
        commonCauses: ['Hip adductor weakness', 'Foot rigidity', 'Previous ankle injury', 'Lateral hip muscle overactivity'],
        recommendedInterventions: ['Hip adductor strengthening', 'Ankle eversion exercises', 'Foot mobility work', 'Balance training'],
        urgencyLevel: 'moderate'
      }],
      ['excessive_forward_lean', {
        potentialSymptoms: ['Lower back pain', 'Hip flexor tightness', 'Thoracic spine stiffness', 'Anterior hip impingement'],
        injuryRisks: ['Lumbar disc compression', 'Hip flexor tendinopathy', 'Femoroacetabular impingement', 'Thoracolumbar junction dysfunction'],
        commonCauses: ['Ankle dorsiflexion restriction', 'Hip flexor tightness', 'Thoracic kyphosis', 'Core weakness', 'Soleus tightness'],
        recommendedInterventions: ['Calf stretching and ankle mobilization', 'Hip flexor stretching', 'Thoracic extension exercises', 'Deep core activation', 'Posterior chain strengthening'],
        urgencyLevel: 'low'
      }],
      ['heel_rise', {
        potentialSymptoms: ['Calf tightness', 'Achilles tendon discomfort', 'Plantar foot pain', 'Reduced squat depth'],
        injuryRisks: ['Achilles tendinopathy', 'Plantar fasciitis', 'Calf strain', 'Ankle impingement'],
        commonCauses: ['Soleus/gastrocnemius tightness', 'Ankle joint restriction', 'Previous ankle injury', 'Prolonged heel wearing'],
        recommendedInterventions: ['Calf stretching (straight and bent knee)', 'Ankle joint mobilization', 'Eccentric calf strengthening', 'Gradual range of motion progression'],
        urgencyLevel: 'low'
      }],
      ['ankle_collapse', {
        potentialSymptoms: ['Medial ankle pain', 'Arch discomfort', 'Shin splints', 'Knee tracking issues'],
        injuryRisks: ['Posterior tibialis tendinopathy', 'Plantar fasciitis', 'Medial tibial stress syndrome', 'Navicular stress fracture'],
        commonCauses: ['Foot intrinsic weakness', 'Posterior tibialis weakness', 'Excessive foot pronation', 'Hip weakness'],
        recommendedInterventions: ['Foot intrinsic strengthening', 'Posterior tibialis strengthening', 'Arch support exercises', 'Hip stability training'],
        urgencyLevel: 'moderate'
      }],
      ['hip_drop', {
        potentialSymptoms: ['Hip pain', 'Lower back pain', 'Lateral knee pain', 'Trendelenburg gait pattern'],
        injuryRisks: ['IT band syndrome', 'Greater trochanteric bursitis', 'Lumbar spine dysfunction', 'Sacroiliac joint dysfunction'],
        commonCauses: ['Gluteus medius weakness', 'Core instability', 'Previous hip injury', 'Prolonged sitting postures'],
        recommendedInterventions: ['Progressive hip abduction strengthening', 'Single-leg balance training', 'Core stabilization exercises', 'Functional movement retraining'],
        urgencyLevel: 'moderate'
      }],
      ['hip_shift', {
        potentialSymptoms: ['Unilateral hip pain', 'Lower back asymmetry', 'Pelvic floor dysfunction', 'Leg length sensation'],
        injuryRisks: ['Sacroiliac joint dysfunction', 'Hip labral pathology', 'Lumbar scoliotic changes', 'Pelvic floor weakness'],
        commonCauses: ['Unilateral hip weakness', 'Leg length discrepancy', 'Pelvic asymmetry', 'Scoliosis'],
        recommendedInterventions: ['Bilateral hip strengthening', 'Pelvic alignment exercises', 'Unilateral stability training', 'Professional biomechanical assessment'],
        urgencyLevel: 'moderate'
      }],
      ['asymmetric_loading', {
        potentialSymptoms: ['Unilateral leg fatigue', 'Lower back pain', 'Hip discomfort', 'Asymmetric muscle development'],
        injuryRisks: ['Stress fractures', 'Overuse injuries', 'Joint degeneration', 'Muscle imbalances'],
        commonCauses: ['Previous injury compensation', 'Limb dominance', 'Structural asymmetries', 'Neuromuscular control deficits'],
        recommendedInterventions: ['Bilateral strengthening programs', 'Proprioceptive training', 'Movement symmetry training', 'Load distribution awareness'],
        urgencyLevel: 'moderate'
      }],

      // Upper Body Faults
      ['forward_head_posture', {
        potentialSymptoms: ['Neck pain', 'Cervicogenic headaches', 'Upper trapezius tension', 'Suboccipital tightness', 'TMJ dysfunction'],
        injuryRisks: ['Cervical disc degeneration', 'Thoracic outlet syndrome', 'Cervical radiculopathy', 'TMJ disorders', 'Upper crossed syndrome'],
        commonCauses: ['Prolonged computer use', 'Deep neck flexor weakness', 'Upper trapezius dominance', 'Thoracic kyphosis', 'Poor workstation ergonomics'],
        recommendedInterventions: ['Chin tuck exercises', 'Deep neck flexor strengthening', 'Upper trapezius stretching', 'Thoracic extension mobility', 'Ergonomic assessment'],
        urgencyLevel: 'moderate'
      }],
      ['rounded_shoulders', {
        potentialSymptoms: ['Shoulder impingement', 'Thoracic outlet symptoms', 'Upper back tension', 'Breathing difficulties'],
        injuryRisks: ['Subacromial impingement', 'Thoracic outlet syndrome', 'Rotator cuff tendinopathy', 'Biceps tendinopathy'],
        commonCauses: ['Pectoral muscle tightness', 'Rhomboid weakness', 'Prolonged sitting', 'Poor posture habits'],
        recommendedInterventions: ['Pectoral stretching', 'Rhomboid strengthening', 'Postural awareness training', 'Thoracic mobility exercises'],
        urgencyLevel: 'low'
      }],
      ['elevated_shoulders', {
        potentialSymptoms: ['Neck tension', 'Headaches', 'Shoulder blade pain', 'Reduced neck range of motion'],
        injuryRisks: ['Cervical muscle strain', 'Tension headaches', 'Thoracic outlet syndrome', 'Myofascial trigger points'],
        commonCauses: ['Chronic stress', 'Upper trapezius overactivity', 'Anxiety', 'Poor breathing patterns', 'Carrying heavy bags'],
        recommendedInterventions: ['Stress management techniques', 'Upper trapezius stretching', 'Diaphragmatic breathing', 'Shoulder blade depression exercises'],
        urgencyLevel: 'low'
      }],
      ['trunk_rotation', {
        potentialSymptoms: ['Lower back pain', 'Hip restriction', 'Rib cage asymmetry', 'Shoulder impingement'],
        injuryRisks: ['Lumbar disc pathology', 'Facet joint dysfunction', 'Hip labral pathology', 'Sacroiliac dysfunction'],
        commonCauses: ['Hip mobility restrictions', 'Thoracic stiffness', 'Core weakness', 'Scoliosis', 'Rotational sports'],
        recommendedInterventions: ['Thoracic rotation mobility', 'Hip flexibility exercises', 'Core stabilization', 'Anti-rotation strengthening'],
        urgencyLevel: 'moderate'
      }],
      ['arm_asymmetry', {
        potentialSymptoms: ['Unilateral shoulder pain', 'Neck tension', 'Upper back asymmetry', 'Functional limitations'],
        injuryRisks: ['Rotator cuff pathology', 'Cervical dysfunction', 'Thoracic scoliosis', 'Scapular dyskinesis'],
        commonCauses: ['Previous injury', 'Dominant hand overuse', 'Neurological conditions', 'Postural habits'],
        recommendedInterventions: ['Bilateral strengthening programs', 'Scapular stabilization', 'Postural correction', 'Professional assessment'],
        urgencyLevel: 'moderate'
      }],

      // Core and Stability Faults
      ['loss_of_balance', {
        potentialSymptoms: ['Frequent falls', 'Ankle instability', 'Fear of movement', 'Dizziness during movement'],
        injuryRisks: ['Fall-related injuries', 'Ankle sprains', 'Fractures', 'Head trauma', 'Functional decline'],
        commonCauses: ['Vestibular dysfunction', 'Proprioceptive deficits', 'Muscle weakness', 'Vision problems', 'Medication side effects'],
        recommendedInterventions: ['Progressive balance training', 'Proprioceptive exercises', 'Strength training', 'Vestibular rehabilitation', 'Fall prevention strategies'],
        urgencyLevel: 'high'
      }],
      ['excessive_sway', {
        potentialSymptoms: ['Balance insecurity', 'Fatigue during standing', 'Ankle stiffness', 'Lower back tension'],
        injuryRisks: ['Fall risk', 'Ankle overuse', 'Lower back strain', 'Functional limitations'],
        commonCauses: ['Ankle stiffness', 'Hip weakness', 'Visual deficits', 'Inner ear problems', 'Proprioceptive loss'],
        recommendedInterventions: ['Ankle mobility exercises', 'Hip strengthening', 'Visual-motor training', 'Static balance training'],
        urgencyLevel: 'moderate'
      }],
      ['poor_alignment', {
        potentialSymptoms: ['Generalized pain', 'Muscle fatigue', 'Joint stiffness', 'Movement inefficiency'],
        injuryRisks: ['Overuse injuries', 'Joint degeneration', 'Muscle imbalances', 'Chronic pain syndromes'],
        commonCauses: ['Muscle imbalances', 'Joint restrictions', 'Poor movement habits', 'Structural abnormalities'],
        recommendedInterventions: ['Comprehensive postural assessment', 'Targeted strengthening', 'Mobility exercises', 'Movement retraining'],
        urgencyLevel: 'moderate'
      }],
      ['insufficient_range', {
        potentialSymptoms: ['Joint stiffness', 'Movement limitations', 'Compensatory patterns', 'Functional restrictions'],
        injuryRisks: ['Joint contractures', 'Compensatory injuries', 'Functional decline', 'Quality of life impact'],
        commonCauses: ['Joint capsule restrictions', 'Muscle tightness', 'Scar tissue', 'Prolonged immobility', 'Arthritic changes'],
        recommendedInterventions: ['Progressive stretching', 'Joint mobilization', 'Heat therapy', 'Activity modification', 'Professional manual therapy'],
        urgencyLevel: 'moderate'
      }],
      ['excessive_velocity', {
        potentialSymptoms: ['Joint stress', 'Muscle strain', 'Poor control', 'Ballistic movement patterns'],
        injuryRisks: ['Acute muscle strains', 'Joint injuries', 'Loss of control', 'Overuse syndromes'],
        commonCauses: ['Poor motor control', 'Competitive mindset', 'Lack of awareness', 'Neuromuscular dysfunction'],
        recommendedInterventions: ['Slow controlled movement training', 'Motor control exercises', 'Mindfulness techniques', 'Tempo-based training'],
        urgencyLevel: 'low'
      }],
      ['poor_control', {
        potentialSymptoms: ['Jerky movements', 'Muscle co-contraction', 'Fatigue', 'Movement inefficiency'],
        injuryRisks: ['Overuse injuries', 'Joint stress', 'Muscle fatigue', 'Movement disorders'],
        commonCauses: ['Neurological conditions', 'Muscle weakness', 'Poor coordination', 'Fatigue', 'Anxiety'],
        recommendedInterventions: ['Motor control training', 'Strength building', 'Coordination exercises', 'Relaxation techniques', 'Professional assessment'],
        urgencyLevel: 'moderate'
      }]
    ]);
  }

  /**
   * Initialize movement norms database
   */
  private initializeMovementNorms() {
    this.movementNorms = new Map([
      // Squat Movement Norms
      ['knee_flexion_squat', { min: 90, max: 135 }], // degrees
      ['forward_lean_squat', { min: 0, max: 45 }], // degrees from vertical
      ['knee_valgus_angle', { min: 0, max: 10 }], // degrees medial deviation
      ['heel_rise_threshold', { min: 0, max: 0.03 }], // normalized coordinate space
      ['ankle_dorsiflexion_squat', { min: 15, max: 25 }], // degrees required
      
      // Hip and Pelvis Norms
      ['hip_drop_angle', { min: -5, max: 5 }], // degrees from horizontal
      ['pelvic_tilt_standing', { min: -10, max: 15 }], // degrees anterior tilt
      ['hip_internal_rotation', { min: 30, max: 45 }], // degrees
      ['hip_external_rotation', { min: 45, max: 60 }], // degrees
      ['hip_abduction_angle', { min: 30, max: 45 }], // degrees
      
      // Shoulder and Upper Body Norms  
      ['shoulder_elevation', { min: 0, max: 180 }], // degrees
      ['shoulder_abduction', { min: 150, max: 180 }], // degrees
      ['shoulder_flexion', { min: 150, max: 180 }], // degrees
      ['cervical_forward_head', { min: 0, max: 3.0 }], // cm forward displacement
      ['thoracic_kyphosis', { min: 20, max: 40 }], // degrees
      ['shoulder_protraction', { min: 0, max: 2.5 }], // cm forward displacement
      
      // Balance and Stability Norms
      ['postural_sway_range', { min: 0, max: 3.0 }], // cm total sway envelope
      ['single_leg_balance_time', { min: 30, max: 60 }], // seconds
      ['weight_distribution_asymmetry', { min: 0, max: 15 }], // percentage
      ['center_mass_deviation', { min: 0, max: 2.0 }], // cm from base of support
      
      // Ankle and Foot Norms
      ['ankle_dorsiflexion', { min: 15, max: 25 }], // degrees
      ['ankle_plantarflexion', { min: 45, max: 55 }], // degrees
      ['ankle_inversion', { min: 20, max: 30 }], // degrees
      ['ankle_eversion', { min: 10, max: 15 }], // degrees
      ['foot_arch_collapse', { min: 0, max: 8.0 }], // degrees medial deviation
      
      // Knee Tracking Norms
      ['knee_varus_angle', { min: -10, max: 0 }], // degrees lateral deviation
      ['knee_frontal_tracking', { min: -12, max: 12 }], // degrees from hip-ankle line
      ['knee_flexion_lunge', { min: 90, max: 120 }], // degrees
      ['patellofemoral_tracking', { min: -5, max: 5 }], // degrees deviation
      
      // Trunk and Spine Norms
      ['trunk_lean_forward', { min: 0, max: 15 }], // degrees from vertical
      ['trunk_lateral_lean', { min: -10, max: 10 }], // degrees from vertical  
      ['lumbar_lordosis', { min: 30, max: 50 }], // degrees
      ['trunk_rotation_range', { min: 0, max: 45 }], // degrees each direction
      
      // Movement Quality Norms
      ['movement_velocity_control', { min: 0.5, max: 2.0 }], // normalized velocity units
      ['movement_smoothness', { min: 0.7, max: 1.0 }], // smoothness coefficient
      ['joint_coordination', { min: 0.8, max: 1.0 }], // coordination index
      ['movement_symmetry', { min: 0.85, max: 1.0 }], // bilateral symmetry ratio
      
      // Functional Movement Norms
      ['squat_depth_ankle', { min: 90, max: 135 }], // degrees knee flexion
      ['overhead_reach', { min: 160, max: 180 }], // degrees shoulder flexion
      ['single_leg_stance_stability', { min: 0, max: 15 }], // degrees sway range
      ['step_down_control', { min: 0, max: 10 }], // degrees knee valgus
      ['rotational_stability', { min: 0, max: 20 }], // degrees trunk deviation
      
      // Age-Related Adjustment Factors (multipliers for base norms)
      ['age_18_30_factor', { min: 1.0, max: 1.0 }], // baseline
      ['age_31_50_factor', { min: 0.9, max: 1.0 }], // slight reduction
      ['age_51_70_factor', { min: 0.8, max: 0.95 }], // moderate reduction
      ['age_70_plus_factor', { min: 0.7, max: 0.9 }] // greater reduction
    ]);
  }
}