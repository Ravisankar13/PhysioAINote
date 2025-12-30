import { Skeleton3DPose } from "@/utils/mediapipeTo3D";

export interface MovementPattern {
  id: string;
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  clinicalImplication: string;
  relatedConditions: string[];
  affectedRegion: string;
}

export interface ROMAnalysis {
  joint: string;
  side: 'left' | 'right' | 'bilateral';
  measured: number;
  normal: number;
  deficit: number;
  percentOfNormal: number;
  classification: 'normal' | 'mild_restriction' | 'moderate_restriction' | 'severe_restriction';
}

export interface AsymmetryAnalysis {
  joint: string;
  movement: string;
  leftValue: number;
  rightValue: number;
  difference: number;
  percentDifference: number;
  clinicallySignificant: boolean;
}

export interface CompensationPattern {
  name: string;
  description: string;
  primaryJoint: string;
  compensatingJoint: string;
  indicators: string[];
}

export interface MovementAnalysisResult {
  patterns: MovementPattern[];
  romAnalysis: ROMAnalysis[];
  asymmetries: AsymmetryAnalysis[];
  compensations: CompensationPattern[];
  overallMovementQuality: number;
  primaryImpairments: string[];
  clinicalHypotheses: string[];
  recommendedFocus: string[];
}

const RAD_TO_DEG = 57.295779513;

const NORMAL_ROM: Record<string, { min: number; max: number }> = {
  'shoulder_abduction': { min: 0, max: 180 },
  'shoulder_flexion': { min: 0, max: 180 },
  'shoulder_external_rotation': { min: 0, max: 90 },
  'elbow_flexion': { min: 0, max: 150 },
  'hip_flexion': { min: 0, max: 120 },
  'hip_abduction': { min: 0, max: 45 },
  'hip_extension': { min: 0, max: 30 },
  'knee_flexion': { min: 0, max: 140 },
  'ankle_dorsiflexion': { min: 0, max: 20 },
  'spine_flexion': { min: 0, max: 80 },
  'spine_extension': { min: 0, max: 30 },
  'neck_flexion': { min: 0, max: 50 },
  'neck_rotation': { min: 0, max: 80 },
};

export class MovementPatternRecognizer {
  private poseHistory: Skeleton3DPose[] = [];
  private maxHistory = 60;
  private peakValues: Record<string, number> = {};

  addPose(pose: Skeleton3DPose): void {
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistory) {
      this.poseHistory.shift();
    }
    this.updatePeakValues(pose);
  }

  private updatePeakValues(pose: Skeleton3DPose): void {
    const values: Record<string, number> = {
      'leftShoulder_abduction': Math.abs(pose.leftShoulder.x * RAD_TO_DEG),
      'leftShoulder_flexion': Math.abs(pose.leftShoulder.z * RAD_TO_DEG),
      'rightShoulder_abduction': Math.abs(pose.rightShoulder.x * RAD_TO_DEG),
      'rightShoulder_flexion': Math.abs(pose.rightShoulder.z * RAD_TO_DEG),
      'leftElbow_flexion': Math.abs(pose.leftElbow.x * RAD_TO_DEG),
      'rightElbow_flexion': Math.abs(pose.rightElbow.x * RAD_TO_DEG),
      'leftHip_flexion': Math.abs(pose.leftHip.x * RAD_TO_DEG),
      'rightHip_flexion': Math.abs(pose.rightHip.x * RAD_TO_DEG),
      'spine_flexion': Math.abs(pose.spine.x * RAD_TO_DEG),
      'spine_lateral': Math.abs(pose.spine.z * RAD_TO_DEG),
      'neck_flexion': Math.abs(pose.neck.x * RAD_TO_DEG),
      'neck_lateral': Math.abs(pose.neck.z * RAD_TO_DEG),
    };

    Object.entries(values).forEach(([key, value]) => {
      if (!this.peakValues[key] || value > this.peakValues[key]) {
        this.peakValues[key] = value;
      }
    });
  }

  analyze(currentPose: Skeleton3DPose): MovementAnalysisResult {
    const patterns: MovementPattern[] = [];
    const romAnalysis: ROMAnalysis[] = [];
    const asymmetries: AsymmetryAnalysis[] = [];
    const compensations: CompensationPattern[] = [];
    const primaryImpairments: string[] = [];
    const clinicalHypotheses: string[] = [];
    const recommendedFocus: string[] = [];

    const leftShoulderAbd = Math.abs(currentPose.leftShoulder.x * RAD_TO_DEG);
    const rightShoulderAbd = Math.abs(currentPose.rightShoulder.x * RAD_TO_DEG);
    const leftShoulderFlex = Math.abs(currentPose.leftShoulder.z * RAD_TO_DEG);
    const rightShoulderFlex = Math.abs(currentPose.rightShoulder.z * RAD_TO_DEG);
    const leftElbowFlex = Math.abs(currentPose.leftElbow.x * RAD_TO_DEG);
    const rightElbowFlex = Math.abs(currentPose.rightElbow.x * RAD_TO_DEG);
    const leftHipFlex = Math.abs(currentPose.leftHip.x * RAD_TO_DEG);
    const rightHipFlex = Math.abs(currentPose.rightHip.x * RAD_TO_DEG);
    const spineFlex = Math.abs(currentPose.spine.x * RAD_TO_DEG);
    const spineLateral = Math.abs(currentPose.spine.z * RAD_TO_DEG);
    const neckFlex = Math.abs(currentPose.neck.x * RAD_TO_DEG);

    romAnalysis.push(
      this.analyzeROM('Shoulder Abduction', 'left', leftShoulderAbd, NORMAL_ROM.shoulder_abduction.max),
      this.analyzeROM('Shoulder Abduction', 'right', rightShoulderAbd, NORMAL_ROM.shoulder_abduction.max),
      this.analyzeROM('Shoulder Flexion', 'left', leftShoulderFlex, NORMAL_ROM.shoulder_flexion.max),
      this.analyzeROM('Shoulder Flexion', 'right', rightShoulderFlex, NORMAL_ROM.shoulder_flexion.max),
      this.analyzeROM('Elbow Flexion', 'left', leftElbowFlex, NORMAL_ROM.elbow_flexion.max),
      this.analyzeROM('Elbow Flexion', 'right', rightElbowFlex, NORMAL_ROM.elbow_flexion.max),
      this.analyzeROM('Hip Flexion', 'left', leftHipFlex, NORMAL_ROM.hip_flexion.max),
      this.analyzeROM('Hip Flexion', 'right', rightHipFlex, NORMAL_ROM.hip_flexion.max),
    );

    const shoulderAbdAsymmetry = this.analyzeAsymmetry('Shoulder', 'Abduction', leftShoulderAbd, rightShoulderAbd);
    const shoulderFlexAsymmetry = this.analyzeAsymmetry('Shoulder', 'Flexion', leftShoulderFlex, rightShoulderFlex);
    const hipFlexAsymmetry = this.analyzeAsymmetry('Hip', 'Flexion', leftHipFlex, rightHipFlex);
    const elbowFlexAsymmetry = this.analyzeAsymmetry('Elbow', 'Flexion', leftElbowFlex, rightElbowFlex);

    if (shoulderAbdAsymmetry.clinicallySignificant) asymmetries.push(shoulderAbdAsymmetry);
    if (shoulderFlexAsymmetry.clinicallySignificant) asymmetries.push(shoulderFlexAsymmetry);
    if (hipFlexAsymmetry.clinicallySignificant) asymmetries.push(hipFlexAsymmetry);
    if (elbowFlexAsymmetry.clinicallySignificant) asymmetries.push(elbowFlexAsymmetry);

    if (shoulderAbdAsymmetry.clinicallySignificant) {
      const restrictedSide = leftShoulderAbd < rightShoulderAbd ? 'left' : 'right';
      patterns.push({
        id: 'shoulder_abd_restriction',
        name: `${restrictedSide} Shoulder Abduction Restriction`,
        description: `Reduced ${restrictedSide} shoulder abduction range with ${shoulderAbdAsymmetry.percentDifference.toFixed(0)}% asymmetry`,
        severity: shoulderAbdAsymmetry.percentDifference > 30 ? 'severe' : shoulderAbdAsymmetry.percentDifference > 15 ? 'moderate' : 'mild',
        clinicalImplication: 'May indicate subacromial impingement, rotator cuff pathology, or capsular restriction',
        relatedConditions: ['Subacromial impingement', 'Rotator cuff tendinopathy', 'Adhesive capsulitis', 'AC joint pathology'],
        affectedRegion: 'shoulder',
      });
      primaryImpairments.push(`${restrictedSide} shoulder mobility deficit`);
      clinicalHypotheses.push('Possible subacromial impingement or rotator cuff involvement');
      recommendedFocus.push('Shoulder mobility and rotator cuff assessment');
    }

    if (spineLateral > 10) {
      compensations.push({
        name: 'Lateral Trunk Lean',
        description: `Trunk shifting ${spineLateral.toFixed(1)}° laterally during movement`,
        primaryJoint: 'Trunk',
        compensatingJoint: spineLateral > 0 ? 'Left lateral flexion' : 'Right lateral flexion',
        indicators: ['Asymmetric weight bearing', 'Hip or spine stiffness', 'Core weakness'],
      });
      patterns.push({
        id: 'lateral_trunk_lean',
        name: 'Lateral Trunk Compensation',
        description: 'Patient demonstrating lateral trunk lean during movement',
        severity: spineLateral > 20 ? 'severe' : spineLateral > 15 ? 'moderate' : 'mild',
        clinicalImplication: 'May indicate hip weakness, spine stiffness, or pain avoidance behavior',
        relatedConditions: ['Hip abductor weakness', 'Lumbar spine dysfunction', 'Leg length discrepancy'],
        affectedRegion: 'spine',
      });
    }

    if (neckFlex > 25) {
      patterns.push({
        id: 'forward_head_posture',
        name: 'Forward Head Posture',
        description: `Excessive cervical flexion of ${neckFlex.toFixed(1)}° observed`,
        severity: neckFlex > 40 ? 'severe' : neckFlex > 30 ? 'moderate' : 'mild',
        clinicalImplication: 'Associated with neck pain, headaches, and upper crossed syndrome',
        relatedConditions: ['Cervicogenic headache', 'Neck pain', 'Upper crossed syndrome', 'TMJ dysfunction'],
        affectedRegion: 'cervical',
      });
      primaryImpairments.push('Forward head posture');
      recommendedFocus.push('Cervical posture and deep neck flexor activation');
    }

    if (hipFlexAsymmetry.clinicallySignificant && spineLateral > 8) {
      compensations.push({
        name: 'Hip-Spine Compensation Pattern',
        description: 'Trunk compensation for hip mobility restriction',
        primaryJoint: 'Hip',
        compensatingJoint: 'Lumbar spine',
        indicators: ['Hip stiffness', 'Lumbar hypermobility', 'Altered movement pattern'],
      });
      clinicalHypotheses.push('Hip mobility restriction with lumbar compensation');
    }

    const restrictedJoints = romAnalysis.filter(r => r.classification !== 'normal');
    const qualityScore = Math.max(0, 100 - (
      (restrictedJoints.length * 10) +
      (asymmetries.length * 8) +
      (compensations.length * 12) +
      (patterns.filter(p => p.severity === 'severe').length * 15)
    ));

    if (primaryImpairments.length === 0 && restrictedJoints.length > 0) {
      restrictedJoints.forEach(r => {
        if (r.classification !== 'normal') {
          primaryImpairments.push(`${r.side} ${r.joint} ${r.classification.replace('_', ' ')}`);
        }
      });
    }

    if (clinicalHypotheses.length === 0 && patterns.length > 0) {
      patterns.forEach(p => {
        if (p.relatedConditions && p.relatedConditions.length > 0) {
          clinicalHypotheses.push(`Consider ${p.relatedConditions[0]} based on ${p.name}`);
        }
      });
    }

    if (recommendedFocus.length === 0) {
      if (patterns.length > 0) {
        recommendedFocus.push(`Address ${patterns[0].affectedRegion} mobility and stability`);
      }
      if (asymmetries.length > 0) {
        recommendedFocus.push('Symmetry training and bilateral movement patterns');
      }
      if (recommendedFocus.length === 0) {
        recommendedFocus.push('General movement quality and body awareness');
      }
    }

    return {
      patterns,
      romAnalysis,
      asymmetries,
      compensations,
      overallMovementQuality: Math.round(qualityScore),
      primaryImpairments,
      clinicalHypotheses,
      recommendedFocus,
    };
  }

  private analyzeROM(joint: string, side: 'left' | 'right', measured: number, normal: number): ROMAnalysis {
    const deficit = normal - measured;
    const percentOfNormal = (measured / normal) * 100;
    
    let classification: ROMAnalysis['classification'] = 'normal';
    if (percentOfNormal < 50) classification = 'severe_restriction';
    else if (percentOfNormal < 70) classification = 'moderate_restriction';
    else if (percentOfNormal < 85) classification = 'mild_restriction';

    return { joint, side, measured, normal, deficit, percentOfNormal, classification };
  }

  private analyzeAsymmetry(joint: string, movement: string, leftValue: number, rightValue: number): AsymmetryAnalysis {
    const difference = Math.abs(leftValue - rightValue);
    const average = (leftValue + rightValue) / 2;
    const percentDifference = average > 0 ? (difference / average) * 100 : 0;
    
    return {
      joint,
      movement,
      leftValue,
      rightValue,
      difference,
      percentDifference,
      clinicallySignificant: percentDifference > 10 && difference > 5,
    };
  }

  getPeakValues(): Record<string, number> {
    return { ...this.peakValues };
  }

  reset(): void {
    this.poseHistory = [];
    this.peakValues = {};
  }
}

export const movementPatternRecognizer = new MovementPatternRecognizer();
