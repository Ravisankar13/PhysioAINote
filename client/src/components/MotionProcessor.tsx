import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, Activity, Users, Brain, Stethoscope, FileText } from 'lucide-react';
import * as THREE from 'three';
import DiagnosticEngine from './clinical/DiagnosticEngine';
import TreatmentProtocolEngine from './clinical/TreatmentProtocolEngine';

interface PoseFrame {
  timestamp: number;
  landmarks: any[];
  worldLandmarks: any[];
}

interface JointAngles {
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  spine: number;
}

interface MovementAbnormality {
  type: 'knee_valgus' | 'trendelenburg' | 'forward_head' | 'ankle_pronation' | 'hip_drop' | 'pelvic_tilt' | 
        'shoulder_elevation' | 'hip_hiking' | 'lumbar_extension' | 'cervical_rotation' | 'thoracic_kyphosis' | 
        'knee_varus' | 'excessive_hip_flexion' | 'ankle_dorsiflexion_loss' | 'scapular_winging' | 'lateral_trunk_lean' |
        'cervical_extension' | 'lumbar_lordosis' | 'scoliosis' | 'head_tilt' | 'internal_shoulder_rotation' |
        'elbow_hyperextension' | 'wrist_drop' | 'foot_drop' | 'calcaneal_valgus' | 'calcaneal_varus' |
        'toe_walking' | 'antalgic_gait' | 'steppage_gait' | 'circumduction_gait' | 'scissoring_gait' |
        'pelvic_rotation' | 'weight_shift_imbalance' | 'compensatory_head' | 'tremor' | 'ataxic_movement' |
        'bradykinesia' | 'muscle_rigidity';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  timestamp: number;
  affectedSide: 'left' | 'right' | 'bilateral';
  angle?: number;
  normalRange?: string;
  clinicalSignificance: string;
}

interface MotionProcessorProps {
  motionData: PoseFrame[];
  onSkeletonUpdate?: (jointAngles: JointAngles, anthropometrics: any) => void;
  className?: string;
}

interface DiagnosticResult {
  primaryDiagnosis: string;
  confidence: number;
  differentialDiagnoses: Array<{ diagnosis: string; likelihood: number }>;
  redFlags: string[];
  functionalImpact: string;
  recommendedTreatment: string;
  exercisePrescription: string[];
  followUpRecommendations: string[];
}

export default function MotionProcessor({ motionData, onSkeletonUpdate, className }: MotionProcessorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentJointAngles, setCurrentJointAngles] = useState<JointAngles | null>(null);
  const [estimatedAnthropometrics, setEstimatedAnthropometrics] = useState<any>(null);
  const [movementType, setMovementType] = useState<string>('unknown');
  const [detectedAbnormalities, setDetectedAbnormalities] = useState<MovementAbnormality[]>([]);
  const [activeTab, setActiveTab] = useState('analysis');
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [patientAnswers, setPatientAnswers] = useState<Record<string, any>>({});
  const [analysisPhase, setAnalysisPhase] = useState<'motion' | 'diagnosis' | 'treatment'>('motion');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);

  // Movement abnormality detection functions
  const detectKneeValgus = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    // Get hip, knee, and ankle positions for both sides
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return abnormalities;
    }
    
    // Calculate knee valgus angle for each leg
    const calculateValgusAngle = (hip: any, knee: any, ankle: any) => {
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      
      const angle = Math.atan2(
        hipKneeVector.x * kneeAnkleVector.y - hipKneeVector.y * kneeAnkleVector.x,
        hipKneeVector.x * kneeAnkleVector.x + hipKneeVector.y * kneeAnkleVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftValgusAngle = calculateValgusAngle(leftHip, leftKnee, leftAnkle);
    const rightValgusAngle = calculateValgusAngle(rightHip, rightKnee, rightAnkle);
    
    // Check for abnormal valgus (normal is typically < 10 degrees)
    if (leftValgusAngle > 15) {
      const severity = leftValgusAngle > 25 ? 'severe' : leftValgusAngle > 20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_valgus',
        severity,
        description: `Left knee valgus detected (${leftValgusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftValgusAngle,
        normalRange: '< 10°',
        clinicalSignificance: 'May indicate hip weakness, poor movement control, or increased injury risk'
      });
    }
    
    if (rightValgusAngle > 15) {
      const severity = rightValgusAngle > 25 ? 'severe' : rightValgusAngle > 20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_valgus',
        severity,
        description: `Right knee valgus detected (${rightValgusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightValgusAngle,
        normalRange: '< 10°',
        clinicalSignificance: 'May indicate hip weakness, poor movement control, or increased injury risk'
      });
    }
    
    return abnormalities;
  };

  const detectTrendelenburg = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return abnormalities;
    
    // Calculate hip height difference
    const hipHeightDiff = Math.abs(leftHip.y - rightHip.y);
    const normalThreshold = 0.03; // 3cm difference threshold
    
    if (hipHeightDiff > normalThreshold) {
      const severity = hipHeightDiff > 0.06 ? 'severe' : hipHeightDiff > 0.04 ? 'moderate' : 'mild';
      const affectedSide = leftHip.y > rightHip.y ? 'right' : 'left';
      
      abnormalities.push({
        type: 'trendelenburg',
        severity,
        description: `Trendelenburg gait pattern - ${affectedSide} hip drop detected`,
        timestamp,
        affectedSide,
        angle: hipHeightDiff * 100, // Convert to percentage
        normalRange: '< 3cm difference',
        clinicalSignificance: 'Indicates hip abductor weakness, may lead to compensatory patterns'
      });
    }
    
    return abnormalities;
  };

  const detectForwardHead = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!nose || !leftShoulder || !rightShoulder) return abnormalities;
    
    // Calculate shoulder midpoint
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    // Calculate forward head angle
    const headForwardDistance = nose.x - shoulderMidpoint.x;
    const verticalDistance = Math.abs(nose.y - shoulderMidpoint.y);
    const forwardHeadAngle = Math.atan(headForwardDistance / verticalDistance) * (180 / Math.PI);
    
    if (Math.abs(forwardHeadAngle) > 15) {
      const severity = Math.abs(forwardHeadAngle) > 30 ? 'severe' : Math.abs(forwardHeadAngle) > 22 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'forward_head',
        severity,
        description: `Forward head posture detected (${Math.abs(forwardHeadAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(forwardHeadAngle),
        normalRange: '< 15°',
        clinicalSignificance: 'May cause neck strain, headaches, and upper cervical dysfunction'
      });
    }
    
    return abnormalities;
  };

  const detectPelvicTilt = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return abnormalities;
    
    // Calculate pelvic tilt angle
    const pelvicTiltAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * (180 / Math.PI);
    
    if (Math.abs(pelvicTiltAngle) > 5) {
      const severity = Math.abs(pelvicTiltAngle) > 15 ? 'severe' : Math.abs(pelvicTiltAngle) > 10 ? 'moderate' : 'mild';
      const direction = pelvicTiltAngle > 0 ? 'right elevation' : 'left elevation';
      
      abnormalities.push({
        type: 'pelvic_tilt',
        severity,
        description: `Pelvic tilt detected - ${direction} (${Math.abs(pelvicTiltAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: pelvicTiltAngle > 0 ? 'right' : 'left',
        angle: Math.abs(pelvicTiltAngle),
        normalRange: '< 5°',
        clinicalSignificance: 'May indicate muscle imbalances, leg length discrepancy, or compensatory patterns'
      });
    }
    
    return abnormalities;
  };

  const detectAnklePronation = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftKnee || !leftAnkle || !rightKnee || !rightAnkle) return abnormalities;
    
    // Calculate ankle alignment relative to knee
    const calculatePronationAngle = (knee: any, ankle: any) => {
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const verticalVector = { x: 0, y: 1 };
      
      const angle = Math.atan2(
        kneeAnkleVector.x * verticalVector.y - kneeAnkleVector.y * verticalVector.x,
        kneeAnkleVector.x * verticalVector.x + kneeAnkleVector.y * verticalVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftPronationAngle = calculatePronationAngle(leftKnee, leftAnkle);
    const rightPronationAngle = calculatePronationAngle(rightKnee, rightAnkle);
    
    if (leftPronationAngle > 8) {
      const severity = leftPronationAngle > 20 ? 'severe' : leftPronationAngle > 15 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'ankle_pronation',
        severity,
        description: `Left ankle overpronation detected (${leftPronationAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftPronationAngle,
        normalRange: '< 8°',
        clinicalSignificance: 'May cause foot pain, plantar fasciitis, or knee tracking issues'
      });
    }
    
    if (rightPronationAngle > 8) {
      const severity = rightPronationAngle > 20 ? 'severe' : rightPronationAngle > 15 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'ankle_pronation',
        severity,
        description: `Right ankle overpronation detected (${rightPronationAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightPronationAngle,
        normalRange: '< 8°',
        clinicalSignificance: 'May cause foot pain, plantar fasciitis, or knee tracking issues'
      });
    }
    
    return abnormalities;
  };

  const detectShoulderElevation = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[3];
    const rightEar = landmarks[4];
    
    if (!leftShoulder || !rightShoulder || !leftEar || !rightEar) return abnormalities;
    
    // Calculate shoulder height difference
    const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    
    // Calculate ear-shoulder distance to detect shoulder elevation
    const leftEarShoulderDist = Math.abs(leftEar.y - leftShoulder.y);
    const rightEarShoulderDist = Math.abs(rightEar.y - rightShoulder.y);
    const normalEarShoulderDist = 0.15; // Normal distance threshold
    
    if (shoulderHeightDiff > 0.04) {
      const severity = shoulderHeightDiff > 0.08 ? 'severe' : shoulderHeightDiff > 0.06 ? 'moderate' : 'mild';
      const elevatedSide = leftShoulder.y < rightShoulder.y ? 'left' : 'right';
      
      abnormalities.push({
        type: 'shoulder_elevation',
        severity,
        description: `${elevatedSide} shoulder elevation detected`,
        timestamp,
        affectedSide: elevatedSide as 'left' | 'right',
        angle: shoulderHeightDiff * 100,
        normalRange: '< 4cm difference',
        clinicalSignificance: 'May indicate upper trapezius tension, stress response, or compensatory patterns'
      });
    }
    
    if (leftEarShoulderDist < normalEarShoulderDist) {
      const severity = leftEarShoulderDist < 0.08 ? 'severe' : leftEarShoulderDist < 0.12 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'shoulder_elevation',
        severity,
        description: 'Left shoulder elevated toward ear',
        timestamp,
        affectedSide: 'left',
        angle: (normalEarShoulderDist - leftEarShoulderDist) * 100,
        normalRange: '> 15cm ear-shoulder distance',
        clinicalSignificance: 'Indicates upper trapezius overactivity and potential cervical dysfunction'
      });
    }
    
    if (rightEarShoulderDist < normalEarShoulderDist) {
      const severity = rightEarShoulderDist < 0.08 ? 'severe' : rightEarShoulderDist < 0.12 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'shoulder_elevation',
        severity,
        description: 'Right shoulder elevated toward ear',
        timestamp,
        affectedSide: 'right',
        angle: (normalEarShoulderDist - rightEarShoulderDist) * 100,
        normalRange: '> 15cm ear-shoulder distance',
        clinicalSignificance: 'Indicates upper trapezius overactivity and potential cervical dysfunction'
      });
    }
    
    return abnormalities;
  };

  const detectExcessiveHipFlexion = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const rightShoulder = landmarks[12];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    
    if (!leftShoulder || !leftHip || !leftKnee || !rightShoulder || !rightHip || !rightKnee) return abnormalities;
    
    // Calculate hip flexion angles
    const calculateHipFlexionAngle = (shoulder: any, hip: any, knee: any) => {
      const hipShoulderVector = { x: shoulder.x - hip.x, y: shoulder.y - hip.y };
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      
      const angle = Math.atan2(
        hipShoulderVector.x * hipKneeVector.y - hipShoulderVector.y * hipKneeVector.x,
        hipShoulderVector.x * hipKneeVector.x + hipShoulderVector.y * hipKneeVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftHipFlexion = calculateHipFlexionAngle(leftShoulder, leftHip, leftKnee);
    const rightHipFlexion = calculateHipFlexionAngle(rightShoulder, rightHip, rightKnee);
    
    if (leftHipFlexion > 25) {
      const severity = leftHipFlexion > 45 ? 'severe' : leftHipFlexion > 35 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'excessive_hip_flexion',
        severity,
        description: `Excessive left hip flexion detected (${leftHipFlexion.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftHipFlexion,
        normalRange: '< 25° in standing',
        clinicalSignificance: 'May indicate hip flexor tightness, anterior pelvic tilt, or postural dysfunction'
      });
    }
    
    if (rightHipFlexion > 25) {
      const severity = rightHipFlexion > 45 ? 'severe' : rightHipFlexion > 35 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'excessive_hip_flexion',
        severity,
        description: `Excessive right hip flexion detected (${rightHipFlexion.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightHipFlexion,
        normalRange: '< 25° in standing',
        clinicalSignificance: 'May indicate hip flexor tightness, anterior pelvic tilt, or postural dysfunction'
      });
    }
    
    return abnormalities;
  };

  const detectThoracicKyphosis = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return abnormalities;
    
    // Calculate shoulder midpoint and hip midpoint
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    // Calculate thoracic curve by measuring head-shoulder-hip alignment
    const headShoulderVector = { x: nose.x - shoulderMidpoint.x, y: nose.y - shoulderMidpoint.y };
    const shoulderHipVector = { x: shoulderMidpoint.x - hipMidpoint.x, y: shoulderMidpoint.y - hipMidpoint.y };
    
    const kyphosisAngle = Math.atan2(
      headShoulderVector.x * shoulderHipVector.y - headShoulderVector.y * shoulderHipVector.x,
      headShoulderVector.x * shoulderHipVector.x + headShoulderVector.y * shoulderHipVector.y
    ) * (180 / Math.PI);
    
    if (Math.abs(kyphosisAngle) > 20) {
      const severity = Math.abs(kyphosisAngle) > 40 ? 'severe' : Math.abs(kyphosisAngle) > 30 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'thoracic_kyphosis',
        severity,
        description: `Excessive thoracic kyphosis detected (${Math.abs(kyphosisAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(kyphosisAngle),
        normalRange: '< 20°',
        clinicalSignificance: 'May indicate thoracic spine stiffness, weak deep neck flexors, or postural syndrome'
      });
    }
    
    return abnormalities;
  };

  const detectKneeVarus = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) return abnormalities;
    
    // Calculate varus angle (opposite of valgus - knee bowing outward)
    const calculateVarusAngle = (hip: any, knee: any, ankle: any) => {
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      
      // For varus, we look for outward deviation
      const crossProduct = hipKneeVector.x * kneeAnkleVector.y - hipKneeVector.y * kneeAnkleVector.x;
      const dotProduct = hipKneeVector.x * kneeAnkleVector.x + hipKneeVector.y * kneeAnkleVector.y;
      
      const angle = Math.atan2(crossProduct, dotProduct) * (180 / Math.PI);
      
      // Return positive for outward deviation (varus)
      return angle < 0 ? Math.abs(angle) : 0;
    };
    
    const leftVarusAngle = calculateVarusAngle(leftHip, leftKnee, leftAnkle);
    const rightVarusAngle = calculateVarusAngle(rightHip, rightKnee, rightAnkle);
    
    if (leftVarusAngle > 12) {
      const severity = leftVarusAngle > 25 ? 'severe' : leftVarusAngle > 18 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_varus',
        severity,
        description: `Left knee varus detected (${leftVarusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftVarusAngle,
        normalRange: '< 12°',
        clinicalSignificance: 'May indicate lateral knee compartment loading, IT band tightness, or hip abductor weakness'
      });
    }
    
    if (rightVarusAngle > 12) {
      const severity = rightVarusAngle > 25 ? 'severe' : rightVarusAngle > 18 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'knee_varus',
        severity,
        description: `Right knee varus detected (${rightVarusAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightVarusAngle,
        normalRange: '< 12°',
        clinicalSignificance: 'May indicate lateral knee compartment loading, IT band tightness, or hip abductor weakness'
      });
    }
    
    return abnormalities;
  };

  const detectLateralTrunkLean = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return abnormalities;
    
    // Calculate trunk centerline
    const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    
    // Calculate lateral deviation from vertical
    const trunkLateralDeviation = Math.abs(shoulderCenter.x - hipCenter.x);
    const trunkLength = Math.abs(shoulderCenter.y - hipCenter.y);
    
    if (trunkLength > 0) {
      const leanAngle = Math.atan(trunkLateralDeviation / trunkLength) * (180 / Math.PI);
      
      if (leanAngle > 8) {
        const severity = leanAngle > 20 ? 'severe' : leanAngle > 15 ? 'moderate' : 'mild';
        const leanDirection = shoulderCenter.x > hipCenter.x ? 'right' : 'left';
        
        abnormalities.push({
          type: 'lateral_trunk_lean',
          severity,
          description: `Lateral trunk lean detected - leaning ${leanDirection} (${leanAngle.toFixed(1)}°)`,
          timestamp,
          affectedSide: leanDirection as 'left' | 'right',
          angle: leanAngle,
          normalRange: '< 8°',
          clinicalSignificance: 'May indicate hip abductor weakness, scoliosis, or compensatory movement pattern'
        });
      }
    }
    
    return abnormalities;
  };

  // Spinal & Postural Abnormalities
  const detectCervicalExtension = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftEar = landmarks[3];
    const rightEar = landmarks[4];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) return abnormalities;
    
    const earMidpoint = { x: (leftEar.x + rightEar.x) / 2, y: (leftEar.y + rightEar.y) / 2 };
    const shoulderMidpoint = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    
    // Calculate cervical extension angle (chin poke)
    const noseEarVector = { x: nose.x - earMidpoint.x, y: nose.y - earMidpoint.y };
    const earShoulderVector = { x: earMidpoint.x - shoulderMidpoint.x, y: earMidpoint.y - shoulderMidpoint.y };
    
    const extensionAngle = Math.atan2(
      noseEarVector.x * earShoulderVector.y - noseEarVector.y * earShoulderVector.x,
      noseEarVector.x * earShoulderVector.x + noseEarVector.y * earShoulderVector.y
    ) * (180 / Math.PI);
    
    if (Math.abs(extensionAngle) > 15) {
      const severity = Math.abs(extensionAngle) > 30 ? 'severe' : Math.abs(extensionAngle) > 22 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'cervical_extension',
        severity,
        description: `Cervical extension/chin poke posture detected (${Math.abs(extensionAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(extensionAngle),
        normalRange: '< 15°',
        clinicalSignificance: 'Indicates weak deep neck flexors, upper cervical restriction, or compensatory posture'
      });
    }
    
    return abnormalities;
  };

  const detectLumbarLordosis = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftKnee || !rightKnee) return abnormalities;
    
    const shoulderMidpoint = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const hipMidpoint = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    const kneeMidpoint = { x: (leftKnee.x + rightKnee.x) / 2, y: (leftKnee.y + rightKnee.y) / 2 };
    
    // Calculate lumbar curve by hip-knee alignment relative to shoulder-hip line
    const shoulderHipVector = { x: hipMidpoint.x - shoulderMidpoint.x, y: hipMidpoint.y - shoulderMidpoint.y };
    const hipKneeVector = { x: kneeMidpoint.x - hipMidpoint.x, y: kneeMidpoint.y - hipMidpoint.y };
    
    const lordosisAngle = Math.atan2(
      shoulderHipVector.x * hipKneeVector.y - shoulderHipVector.y * hipKneeVector.x,
      shoulderHipVector.x * hipKneeVector.x + shoulderHipVector.y * hipKneeVector.y
    ) * (180 / Math.PI);
    
    if (Math.abs(lordosisAngle) > 25) {
      const severity = Math.abs(lordosisAngle) > 45 ? 'severe' : Math.abs(lordosisAngle) > 35 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'lumbar_lordosis',
        severity,
        description: `Excessive lumbar lordosis detected (${Math.abs(lordosisAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(lordosisAngle),
        normalRange: '< 25°',
        clinicalSignificance: 'May indicate tight hip flexors, weak abdominals, or anterior pelvic tilt'
      });
    }
    
    return abnormalities;
  };

  const detectScoliosis = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return abnormalities;
    
    // Calculate spinal curve deviation
    const shoulderDiff = leftShoulder.x - rightShoulder.x;
    const hipDiff = leftHip.x - rightHip.x;
    
    // Detect lateral curve by comparing shoulder and hip alignment
    const curveMagnitude = Math.abs(shoulderDiff - hipDiff);
    
    if (curveMagnitude > 0.08) {
      const severity = curveMagnitude > 0.15 ? 'severe' : curveMagnitude > 0.12 ? 'moderate' : 'mild';
      const curveDirection = shoulderDiff > hipDiff ? 'right convex' : 'left convex';
      
      abnormalities.push({
        type: 'scoliosis',
        severity,
        description: `Possible scoliotic curve detected - ${curveDirection}`,
        timestamp,
        affectedSide: 'bilateral',
        angle: curveMagnitude * 100,
        normalRange: '< 8cm deviation',
        clinicalSignificance: 'May indicate structural spinal asymmetry or functional muscle imbalances'
      });
    }
    
    return abnormalities;
  };

  const detectHeadTilt = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftEar = landmarks[3];
    const rightEar = landmarks[4];
    
    if (!leftEar || !rightEar) return abnormalities;
    
    // Calculate head tilt angle
    const tiltAngle = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x) * (180 / Math.PI);
    
    if (Math.abs(tiltAngle) > 8) {
      const severity = Math.abs(tiltAngle) > 20 ? 'severe' : Math.abs(tiltAngle) > 15 ? 'moderate' : 'mild';
      const tiltDirection = tiltAngle > 0 ? 'right' : 'left';
      
      abnormalities.push({
        type: 'head_tilt',
        severity,
        description: `Head tilt detected - tilting ${tiltDirection} (${Math.abs(tiltAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: tiltDirection as 'left' | 'right',
        angle: Math.abs(tiltAngle),
        normalRange: '< 8°',
        clinicalSignificance: 'May indicate cervical dysfunction, vestibular issues, or compensatory pattern'
      });
    }
    
    return abnormalities;
  };

  // Upper Extremity Abnormalities
  const detectInternalShoulderRotation = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) return abnormalities;
    
    // Calculate internal rotation by measuring elbow position relative to shoulder-wrist line
    const calculateInternalRotation = (shoulder: any, elbow: any, wrist: any, side: string) => {
      const shoulderWristVector = { x: wrist.x - shoulder.x, y: wrist.y - shoulder.y };
      const shoulderElbowVector = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
      
      const rotationAngle = Math.atan2(
        shoulderWristVector.x * shoulderElbowVector.y - shoulderWristVector.y * shoulderElbowVector.x,
        shoulderWristVector.x * shoulderElbowVector.x + shoulderWristVector.y * shoulderElbowVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(rotationAngle);
    };
    
    const leftRotation = calculateInternalRotation(leftShoulder, leftElbow, leftWrist, 'left');
    const rightRotation = calculateInternalRotation(rightShoulder, rightElbow, rightWrist, 'right');
    
    if (leftRotation > 30) {
      const severity = leftRotation > 50 ? 'severe' : leftRotation > 40 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'internal_shoulder_rotation',
        severity,
        description: `Left shoulder internal rotation detected (${leftRotation.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftRotation,
        normalRange: '< 30°',
        clinicalSignificance: 'Indicates tight pectorals, weak posterior deltoid, or rounded shoulder posture'
      });
    }
    
    if (rightRotation > 30) {
      const severity = rightRotation > 50 ? 'severe' : rightRotation > 40 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'internal_shoulder_rotation',
        severity,
        description: `Right shoulder internal rotation detected (${rightRotation.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightRotation,
        normalRange: '< 30°',
        clinicalSignificance: 'Indicates tight pectorals, weak posterior deltoid, or rounded shoulder posture'
      });
    }
    
    return abnormalities;
  };

  const detectElbowHyperextension = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    
    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist) return abnormalities;
    
    // Calculate elbow extension angle
    const calculateElbowAngle = (shoulder: any, elbow: any, wrist: any) => {
      const shoulderElbowVector = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
      const elbowWristVector = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
      
      const angle = Math.atan2(
        shoulderElbowVector.x * elbowWristVector.y - shoulderElbowVector.y * elbowWristVector.x,
        shoulderElbowVector.x * elbowWristVector.x + shoulderElbowVector.y * elbowWristVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftElbowAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);
    
    if (leftElbowAngle > 185) {
      const severity = leftElbowAngle > 200 ? 'severe' : leftElbowAngle > 190 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'elbow_hyperextension',
        severity,
        description: `Left elbow hyperextension detected (${leftElbowAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftElbowAngle,
        normalRange: '< 185°',
        clinicalSignificance: 'May indicate joint hypermobility, ligamentous laxity, or compensatory pattern'
      });
    }
    
    if (rightElbowAngle > 185) {
      const severity = rightElbowAngle > 200 ? 'severe' : rightElbowAngle > 190 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'elbow_hyperextension',
        severity,
        description: `Right elbow hyperextension detected (${rightElbowAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightElbowAngle,
        normalRange: '< 185°',
        clinicalSignificance: 'May indicate joint hypermobility, ligamentous laxity, or compensatory pattern'
      });
    }
    
    return abnormalities;
  };

  const detectWristDrop = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    
    if (!leftElbow || !leftWrist || !rightElbow || !rightWrist) return abnormalities;
    
    // Calculate wrist drop by comparing wrist height to elbow
    const leftWristDrop = leftWrist.y - leftElbow.y;
    const rightWristDrop = rightWrist.y - rightElbow.y;
    
    if (leftWristDrop > 0.15) {
      const severity = leftWristDrop > 0.25 ? 'severe' : leftWristDrop > 0.20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'wrist_drop',
        severity,
        description: `Left wrist drop detected`,
        timestamp,
        affectedSide: 'left',
        angle: leftWristDrop * 100,
        normalRange: '< 15cm below elbow',
        clinicalSignificance: 'May indicate radial nerve palsy, wrist extensor weakness, or neurological dysfunction'
      });
    }
    
    if (rightWristDrop > 0.15) {
      const severity = rightWristDrop > 0.25 ? 'severe' : rightWristDrop > 0.20 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'wrist_drop',
        severity,
        description: `Right wrist drop detected`,
        timestamp,
        affectedSide: 'right',
        angle: rightWristDrop * 100,
        normalRange: '< 15cm below elbow',
        clinicalSignificance: 'May indicate radial nerve palsy, wrist extensor weakness, or neurological dysfunction'
      });
    }
    
    return abnormalities;
  };

  // Lower Extremity Abnormalities
  const detectAnkleDorsiflexionLoss = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftKnee || !leftAnkle || !rightKnee || !rightAnkle) return abnormalities;
    
    // Calculate ankle dorsiflexion angle (limited upward movement)
    const calculateDorsiflexionAngle = (knee: any, ankle: any) => {
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const verticalVector = { x: 0, y: -1 }; // Upward direction
      
      const angle = Math.atan2(
        kneeAnkleVector.x * verticalVector.y - kneeAnkleVector.y * verticalVector.x,
        kneeAnkleVector.x * verticalVector.x + kneeAnkleVector.y * verticalVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(angle);
    };
    
    const leftDorsiflexionAngle = calculateDorsiflexionAngle(leftKnee, leftAnkle);
    const rightDorsiflexionAngle = calculateDorsiflexionAngle(rightKnee, rightAnkle);
    
    if (leftDorsiflexionAngle < 10) {
      const severity = leftDorsiflexionAngle < 5 ? 'severe' : leftDorsiflexionAngle < 7 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'ankle_dorsiflexion_loss',
        severity,
        description: `Left ankle dorsiflexion restriction detected (${leftDorsiflexionAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftDorsiflexionAngle,
        normalRange: '> 10°',
        clinicalSignificance: 'May indicate ankle stiffness, Achilles tightness, or posterior capsule restriction'
      });
    }
    
    if (rightDorsiflexionAngle < 10) {
      const severity = rightDorsiflexionAngle < 5 ? 'severe' : rightDorsiflexionAngle < 7 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'ankle_dorsiflexion_loss',
        severity,
        description: `Right ankle dorsiflexion restriction detected (${rightDorsiflexionAngle.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightDorsiflexionAngle,
        normalRange: '> 10°',
        clinicalSignificance: 'May indicate ankle stiffness, Achilles tightness, or posterior capsule restriction'
      });
    }
    
    return abnormalities;
  };

  const detectFootDrop = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftAnkle = landmarks[27];
    const leftFootIndex = landmarks[31]; // Foot index if available
    const rightAnkle = landmarks[28];
    const rightFootIndex = landmarks[32];
    
    if (!leftAnkle || !rightAnkle) return abnormalities;
    
    // Detect foot drop by ankle position relative to normal standing
    const leftAnkleHeight = leftAnkle.y;
    const rightAnkleHeight = rightAnkle.y;
    
    // Compare ankle heights for asymmetry (foot drop causes affected foot to hang lower)
    const ankleHeightDiff = Math.abs(leftAnkleHeight - rightAnkleHeight);
    
    if (ankleHeightDiff > 0.05) {
      const severity = ankleHeightDiff > 0.12 ? 'severe' : ankleHeightDiff > 0.08 ? 'moderate' : 'mild';
      const affectedSide = leftAnkleHeight > rightAnkleHeight ? 'left' : 'right';
      
      abnormalities.push({
        type: 'foot_drop',
        severity,
        description: `${affectedSide} foot drop pattern detected`,
        timestamp,
        affectedSide: affectedSide as 'left' | 'right',
        angle: ankleHeightDiff * 100,
        normalRange: '< 5cm height difference',
        clinicalSignificance: 'May indicate peroneal nerve palsy, L5 radiculopathy, or dorsiflexor weakness'
      });
    }
    
    return abnormalities;
  };

  const detectCalcanealAlignment = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftAnkle = landmarks[27];
    const leftKnee = landmarks[25];
    const rightAnkle = landmarks[28];
    const rightKnee = landmarks[26];
    
    if (!leftAnkle || !leftKnee || !rightAnkle || !rightKnee) return abnormalities;
    
    // Calculate heel alignment relative to knee
    const calculateHeelAlignment = (knee: any, ankle: any, side: string) => {
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const verticalVector = { x: 0, y: 1 };
      
      const alignmentAngle = Math.atan2(
        kneeAnkleVector.x * verticalVector.y - kneeAnkleVector.y * verticalVector.x,
        kneeAnkleVector.x * verticalVector.x + kneeAnkleVector.y * verticalVector.y
      ) * (180 / Math.PI);
      
      return alignmentAngle;
    };
    
    const leftAlignment = calculateHeelAlignment(leftKnee, leftAnkle, 'left');
    const rightAlignment = calculateHeelAlignment(rightKnee, rightAnkle, 'right');
    
    if (Math.abs(leftAlignment) > 15) {
      const severity = Math.abs(leftAlignment) > 25 ? 'severe' : Math.abs(leftAlignment) > 20 ? 'moderate' : 'mild';
      const alignmentType = leftAlignment > 0 ? 'valgus' : 'varus';
      
      abnormalities.push({
        type: alignmentType === 'valgus' ? 'calcaneal_valgus' : 'calcaneal_varus',
        severity,
        description: `Left calcaneal ${alignmentType} detected (${Math.abs(leftAlignment).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: Math.abs(leftAlignment),
        normalRange: '< 15°',
        clinicalSignificance: `May indicate ${alignmentType === 'valgus' ? 'overpronation, flat feet' : 'supination, high arches'} or posterior tibial dysfunction`
      });
    }
    
    if (Math.abs(rightAlignment) > 15) {
      const severity = Math.abs(rightAlignment) > 25 ? 'severe' : Math.abs(rightAlignment) > 20 ? 'moderate' : 'mild';
      const alignmentType = rightAlignment > 0 ? 'valgus' : 'varus';
      
      abnormalities.push({
        type: alignmentType === 'valgus' ? 'calcaneal_valgus' : 'calcaneal_varus',
        severity,
        description: `Right calcaneal ${alignmentType} detected (${Math.abs(rightAlignment).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: Math.abs(rightAlignment),
        normalRange: '< 15°',
        clinicalSignificance: `May indicate ${alignmentType === 'valgus' ? 'overpronation, flat feet' : 'supination, high arches'} or posterior tibial dysfunction`
      });
    }
    
    return abnormalities;
  };

  const detectToeWalking = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftAnkle = landmarks[27];
    const leftKnee = landmarks[25];
    const rightAnkle = landmarks[28];
    const rightKnee = landmarks[26];
    
    if (!leftAnkle || !leftKnee || !rightAnkle || !rightKnee) return abnormalities;
    
    // Detect toe walking by excessive plantarflexion
    const calculatePlantarflexion = (knee: any, ankle: any) => {
      const kneeAnkleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const angle = Math.atan2(kneeAnkleVector.y, kneeAnkleVector.x) * (180 / Math.PI);
      return Math.abs(angle);
    };
    
    const leftPlantarflexion = calculatePlantarflexion(leftKnee, leftAnkle);
    const rightPlantarflexion = calculatePlantarflexion(rightKnee, rightAnkle);
    
    if (leftPlantarflexion > 30) {
      const severity = leftPlantarflexion > 45 ? 'severe' : leftPlantarflexion > 37 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'toe_walking',
        severity,
        description: `Left toe walking pattern detected (${leftPlantarflexion.toFixed(1)}° plantarflexion)`,
        timestamp,
        affectedSide: 'left',
        angle: leftPlantarflexion,
        normalRange: '< 30°',
        clinicalSignificance: 'May indicate Achilles contracture, spasticity, or neurological condition'
      });
    }
    
    if (rightPlantarflexion > 30) {
      const severity = rightPlantarflexion > 45 ? 'severe' : rightPlantarflexion > 37 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'toe_walking',
        severity,
        description: `Right toe walking pattern detected (${rightPlantarflexion.toFixed(1)}° plantarflexion)`,
        timestamp,
        affectedSide: 'right',
        angle: rightPlantarflexion,
        normalRange: '< 30°',
        clinicalSignificance: 'May indicate Achilles contracture, spasticity, or neurological condition'
      });
    }
    
    return abnormalities;
  };

  // Gait & Dynamic Movement Abnormalities
  const detectAntalgicGait = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    
    if (!leftHip || !rightHip || !leftKnee || !rightKnee) return abnormalities;
    
    // Detect asymmetric weight bearing (antalgic gait)
    const leftLegLength = Math.sqrt(Math.pow(leftKnee.x - leftHip.x, 2) + Math.pow(leftKnee.y - leftHip.y, 2));
    const rightLegLength = Math.sqrt(Math.pow(rightKnee.x - rightHip.x, 2) + Math.pow(rightKnee.y - rightHip.y, 2));
    
    const legLengthDiff = Math.abs(leftLegLength - rightLegLength);
    
    if (legLengthDiff > 0.05) {
      const severity = legLengthDiff > 0.12 ? 'severe' : legLengthDiff > 0.08 ? 'moderate' : 'mild';
      const shorterSide = leftLegLength < rightLegLength ? 'left' : 'right';
      
      abnormalities.push({
        type: 'antalgic_gait',
        severity,
        description: `Antalgic gait pattern - ${shorterSide} side weight avoidance`,
        timestamp,
        affectedSide: shorterSide as 'left' | 'right',
        angle: legLengthDiff * 100,
        normalRange: '< 5cm asymmetry',
        clinicalSignificance: 'Indicates pain avoidance, potential injury, or protective weight shifting'
      });
    }
    
    return abnormalities;
  };

  const detectSteppageGait = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    
    if (!leftHip || !leftKnee || !rightHip || !rightKnee) return abnormalities;
    
    // Detect excessive knee lift (steppage gait)
    const calculateKneeFlexion = (hip: any, knee: any) => {
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      const verticalVector = { x: 0, y: 1 };
      
      const flexionAngle = Math.atan2(
        hipKneeVector.x * verticalVector.y - hipKneeVector.y * verticalVector.x,
        hipKneeVector.x * verticalVector.x + hipKneeVector.y * verticalVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(flexionAngle);
    };
    
    const leftKneeFlexion = calculateKneeFlexion(leftHip, leftKnee);
    const rightKneeFlexion = calculateKneeFlexion(rightHip, rightKnee);
    
    if (leftKneeFlexion > 45) {
      const severity = leftKneeFlexion > 65 ? 'severe' : leftKneeFlexion > 55 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'steppage_gait',
        severity,
        description: `Left steppage gait detected - excessive knee lift (${leftKneeFlexion.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftKneeFlexion,
        normalRange: '< 45°',
        clinicalSignificance: 'May indicate foot drop compensation, peroneal nerve palsy, or dorsiflexor weakness'
      });
    }
    
    if (rightKneeFlexion > 45) {
      const severity = rightKneeFlexion > 65 ? 'severe' : rightKneeFlexion > 55 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'steppage_gait',
        severity,
        description: `Right steppage gait detected - excessive knee lift (${rightKneeFlexion.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightKneeFlexion,
        normalRange: '< 45°',
        clinicalSignificance: 'May indicate foot drop compensation, peroneal nerve palsy, or dorsiflexor weakness'
      });
    }
    
    return abnormalities;
  };

  const detectCircumductionGait = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) return abnormalities;
    
    // Detect leg swinging outward pattern
    const calculateLegSwing = (hip: any, knee: any, ankle: any) => {
      const hipAnkleVector = { x: ankle.x - hip.x, y: ankle.y - hip.y };
      const hipKneeVector = { x: knee.x - hip.x, y: knee.y - hip.y };
      
      const swingAngle = Math.atan2(
        hipAnkleVector.x * hipKneeVector.y - hipAnkleVector.y * hipKneeVector.x,
        hipAnkleVector.x * hipKneeVector.x + hipAnkleVector.y * hipKneeVector.y
      ) * (180 / Math.PI);
      
      return Math.abs(swingAngle);
    };
    
    const leftSwing = calculateLegSwing(leftHip, leftKnee, leftAnkle);
    const rightSwing = calculateLegSwing(rightHip, rightKnee, rightAnkle);
    
    if (leftSwing > 20) {
      const severity = leftSwing > 35 ? 'severe' : leftSwing > 27 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'circumduction_gait',
        severity,
        description: `Left circumduction gait detected - leg swinging outward (${leftSwing.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'left',
        angle: leftSwing,
        normalRange: '< 20°',
        clinicalSignificance: 'May indicate spasticity, hemiplegia, or compensation for leg length discrepancy'
      });
    }
    
    if (rightSwing > 20) {
      const severity = rightSwing > 35 ? 'severe' : rightSwing > 27 ? 'moderate' : 'mild';
      abnormalities.push({
        type: 'circumduction_gait',
        severity,
        description: `Right circumduction gait detected - leg swinging outward (${rightSwing.toFixed(1)}°)`,
        timestamp,
        affectedSide: 'right',
        angle: rightSwing,
        normalRange: '< 20°',
        clinicalSignificance: 'May indicate spasticity, hemiplegia, or compensation for leg length discrepancy'
      });
    }
    
    return abnormalities;
  };

  const detectScissoringGait = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    
    if (!leftHip || !rightHip || !leftKnee || !rightKnee) return abnormalities;
    
    // Detect legs crossing midline
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    
    // Scissoring occurs when knees come closer together than hips
    const scissoringRatio = kneeWidth / hipWidth;
    
    if (scissoringRatio < 0.7) {
      const severity = scissoringRatio < 0.5 ? 'severe' : scissoringRatio < 0.6 ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'scissoring_gait',
        severity,
        description: `Scissoring gait pattern detected - legs crossing midline`,
        timestamp,
        affectedSide: 'bilateral',
        angle: (1 - scissoringRatio) * 100,
        normalRange: '> 70% hip width',
        clinicalSignificance: 'May indicate spasticity, cerebral palsy, or upper motor neuron lesion'
      });
    }
    
    return abnormalities;
  };

  // Functional Movement Pattern Abnormalities
  const detectPelvicRotation = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return abnormalities;
    
    // Calculate pelvic rotation relative to shoulder alignment
    const hipVector = { x: rightHip.x - leftHip.x, y: rightHip.y - leftHip.y };
    const shoulderVector = { x: rightShoulder.x - leftShoulder.x, y: rightShoulder.y - leftShoulder.y };
    
    const rotationAngle = Math.atan2(
      hipVector.x * shoulderVector.y - hipVector.y * shoulderVector.x,
      hipVector.x * shoulderVector.x + hipVector.y * shoulderVector.y
    ) * (180 / Math.PI);
    
    if (Math.abs(rotationAngle) > 12) {
      const severity = Math.abs(rotationAngle) > 25 ? 'severe' : Math.abs(rotationAngle) > 18 ? 'moderate' : 'mild';
      const rotationDirection = rotationAngle > 0 ? 'clockwise' : 'counterclockwise';
      
      abnormalities.push({
        type: 'pelvic_rotation',
        severity,
        description: `Pelvic rotation asymmetry detected - ${rotationDirection} (${Math.abs(rotationAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.abs(rotationAngle),
        normalRange: '< 12°',
        clinicalSignificance: 'May indicate hip mobility restrictions, muscle imbalances, or compensatory movement patterns'
      });
    }
    
    return abnormalities;
  };

  const detectWeightShiftImbalance = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const nose = landmarks[0];
    
    if (!leftHip || !rightHip || !leftAnkle || !rightAnkle || !nose) return abnormalities;
    
    // Calculate center of mass relative to base of support
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    const ankleCenter = { x: (leftAnkle.x + rightAnkle.x) / 2, y: (leftAnkle.y + rightAnkle.y) / 2 };
    
    // Measure lateral weight shift
    const weightShift = Math.abs(hipCenter.x - ankleCenter.x);
    const headShift = Math.abs(nose.x - ankleCenter.x);
    
    if (weightShift > 0.08) {
      const severity = weightShift > 0.15 ? 'severe' : weightShift > 0.12 ? 'moderate' : 'mild';
      const shiftDirection = hipCenter.x > ankleCenter.x ? 'right' : 'left';
      
      abnormalities.push({
        type: 'weight_shift_imbalance',
        severity,
        description: `Weight shift imbalance detected - shifting ${shiftDirection}`,
        timestamp,
        affectedSide: shiftDirection as 'left' | 'right',
        angle: weightShift * 100,
        normalRange: '< 8cm lateral shift',
        clinicalSignificance: 'May indicate balance deficits, weakness, or pain avoidance strategies'
      });
    }
    
    return abnormalities;
  };

  const detectCompensatoryHead = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return abnormalities;
    
    const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    
    // Calculate head compensation relative to body alignment
    const bodyVector = { x: shoulderCenter.x - hipCenter.x, y: shoulderCenter.y - hipCenter.y };
    const headVector = { x: nose.x - shoulderCenter.x, y: nose.y - shoulderCenter.y };
    
    const compensationAngle = Math.atan2(
      headVector.x * bodyVector.y - headVector.y * bodyVector.x,
      headVector.x * bodyVector.x + headVector.y * bodyVector.y
    ) * (180 / Math.PI);
    
    if (Math.abs(compensationAngle) > 18) {
      const severity = Math.abs(compensationAngle) > 35 ? 'severe' : Math.abs(compensationAngle) > 25 ? 'moderate' : 'mild';
      const compensationDirection = compensationAngle > 0 ? 'right' : 'left';
      
      abnormalities.push({
        type: 'compensatory_head',
        severity,
        description: `Compensatory head movement detected - ${compensationDirection} deviation (${Math.abs(compensationAngle).toFixed(1)}°)`,
        timestamp,
        affectedSide: compensationDirection as 'left' | 'right',
        angle: Math.abs(compensationAngle),
        normalRange: '< 18°',
        clinicalSignificance: 'May indicate balance compensation, vestibular dysfunction, or postural adaptation'
      });
    }
    
    return abnormalities;
  };

  // Neurological Movement Indicators
  const detectTremor = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const nose = landmarks[0];
    
    if (!leftWrist || !rightWrist || !nose) return abnormalities;
    
    // Simple tremor detection by measuring rapid position changes
    // This is a basic implementation - real tremor detection would need multiple frames
    const leftWristVelocity = Math.sqrt(Math.pow(leftWrist.x, 2) + Math.pow(leftWrist.y, 2));
    const rightWristVelocity = Math.sqrt(Math.pow(rightWrist.x, 2) + Math.pow(rightWrist.y, 2));
    const headVelocity = Math.sqrt(Math.pow(nose.x, 2) + Math.pow(nose.y, 2));
    
    // Detect abnormal movement patterns (this is simplified)
    if (leftWristVelocity > 0.5) {
      abnormalities.push({
        type: 'tremor',
        severity: 'mild',
        description: 'Possible left hand tremor detected',
        timestamp,
        affectedSide: 'left',
        angle: leftWristVelocity * 100,
        normalRange: 'Minimal involuntary movement',
        clinicalSignificance: 'May indicate Parkinson\'s disease, essential tremor, or medication side effects'
      });
    }
    
    if (rightWristVelocity > 0.5) {
      abnormalities.push({
        type: 'tremor',
        severity: 'mild',
        description: 'Possible right hand tremor detected',
        timestamp,
        affectedSide: 'right',
        angle: rightWristVelocity * 100,
        normalRange: 'Minimal involuntary movement',
        clinicalSignificance: 'May indicate Parkinson\'s disease, essential tremor, or medication side effects'
      });
    }
    
    return abnormalities;
  };

  const detectAtaxicMovement = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose) return abnormalities;
    
    // Detect coordination issues by measuring body segment alignment variability
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const centerlineDeviation = Math.abs(nose.x - ((leftShoulder.x + rightShoulder.x) / 2));
    
    const coordinationRatio = Math.abs(shoulderWidth - hipWidth) / Math.max(shoulderWidth, hipWidth);
    
    if (coordinationRatio > 0.3 || centerlineDeviation > 0.1) {
      const severity = (coordinationRatio > 0.5 || centerlineDeviation > 0.15) ? 'severe' : 
                      (coordinationRatio > 0.4 || centerlineDeviation > 0.12) ? 'moderate' : 'mild';
      
      abnormalities.push({
        type: 'ataxic_movement',
        severity,
        description: 'Ataxic movement pattern detected - coordination difficulties',
        timestamp,
        affectedSide: 'bilateral',
        angle: coordinationRatio * 100,
        normalRange: '< 30% asymmetry',
        clinicalSignificance: 'May indicate cerebellar dysfunction, alcohol intoxication, or neurological disorder'
      });
    }
    
    return abnormalities;
  };

  const detectBradykinesia = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    // Note: True bradykinesia detection requires temporal analysis across multiple frames
    // This is a simplified version based on static posture indicators
    
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    
    if (!leftElbow || !leftWrist || !rightElbow || !rightWrist) return abnormalities;
    
    // Detect reduced arm swing/movement by measuring elbow-wrist distance
    const leftArmExtension = Math.sqrt(Math.pow(leftWrist.x - leftElbow.x, 2) + Math.pow(leftWrist.y - leftElbow.y, 2));
    const rightArmExtension = Math.sqrt(Math.pow(rightWrist.x - rightElbow.x, 2) + Math.pow(rightWrist.y - rightElbow.y, 2));
    
    if (leftArmExtension < 0.15) {
      abnormalities.push({
        type: 'bradykinesia',
        severity: 'mild',
        description: 'Possible left arm bradykinesia - reduced movement amplitude',
        timestamp,
        affectedSide: 'left',
        angle: leftArmExtension * 100,
        normalRange: '> 15cm arm extension',
        clinicalSignificance: 'May indicate Parkinson\'s disease, medication effects, or movement disorder'
      });
    }
    
    if (rightArmExtension < 0.15) {
      abnormalities.push({
        type: 'bradykinesia',
        severity: 'mild',
        description: 'Possible right arm bradykinesia - reduced movement amplitude',
        timestamp,
        affectedSide: 'right',
        angle: rightArmExtension * 100,
        normalRange: '> 15cm arm extension',
        clinicalSignificance: 'May indicate Parkinson\'s disease, medication effects, or movement disorder'
      });
    }
    
    return abnormalities;
  };

  const detectMuscleRigidity = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const abnormalities: MovementAbnormality[] = [];
    
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    
    if (!leftShoulder || !leftElbow || !rightShoulder || !rightElbow || 
        !leftHip || !leftKnee || !rightHip || !rightKnee) return abnormalities;
    
    // Detect rigidity by measuring joint angles (rigid posture)
    const leftElbowAngle = Math.atan2(leftElbow.y - leftShoulder.y, leftElbow.x - leftShoulder.x) * (180 / Math.PI);
    const rightElbowAngle = Math.atan2(rightElbow.y - rightShoulder.y, rightElbow.x - rightShoulder.x) * (180 / Math.PI);
    const leftKneeAngle = Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) * (180 / Math.PI);
    const rightKneeAngle = Math.atan2(rightKnee.y - rightHip.y, rightKnee.x - rightHip.x) * (180 / Math.PI);
    
    // Check for abnormally fixed positions
    const elbowAsymmetry = Math.abs(leftElbowAngle - rightElbowAngle);
    const kneeAsymmetry = Math.abs(leftKneeAngle - rightKneeAngle);
    
    if (elbowAsymmetry < 5 && kneeAsymmetry < 5) {
      // Very symmetric = possible rigidity
      abnormalities.push({
        type: 'muscle_rigidity',
        severity: 'mild',
        description: 'Possible muscle rigidity pattern - abnormally fixed posture',
        timestamp,
        affectedSide: 'bilateral',
        angle: Math.min(elbowAsymmetry, kneeAsymmetry),
        normalRange: '> 5° natural asymmetry',
        clinicalSignificance: 'May indicate Parkinson\'s disease, dystonia, or neurological rigidity'
      });
    }
    
    return abnormalities;
  };

  // Comprehensive abnormality analysis
  const analyzeMovementAbnormalities = (landmarks: any[], timestamp: number): MovementAbnormality[] => {
    const allAbnormalities: MovementAbnormality[] = [];
    
    // Original core detections
    allAbnormalities.push(...detectKneeValgus(landmarks, timestamp));
    allAbnormalities.push(...detectTrendelenburg(landmarks, timestamp));
    allAbnormalities.push(...detectForwardHead(landmarks, timestamp));
    allAbnormalities.push(...detectPelvicTilt(landmarks, timestamp));
    
    // Enhanced postural detections
    allAbnormalities.push(...detectAnklePronation(landmarks, timestamp));
    allAbnormalities.push(...detectShoulderElevation(landmarks, timestamp));
    allAbnormalities.push(...detectExcessiveHipFlexion(landmarks, timestamp));
    allAbnormalities.push(...detectThoracicKyphosis(landmarks, timestamp));
    allAbnormalities.push(...detectKneeVarus(landmarks, timestamp));
    allAbnormalities.push(...detectLateralTrunkLean(landmarks, timestamp));
    
    // Spinal & postural abnormalities
    allAbnormalities.push(...detectCervicalExtension(landmarks, timestamp));
    allAbnormalities.push(...detectLumbarLordosis(landmarks, timestamp));
    allAbnormalities.push(...detectScoliosis(landmarks, timestamp));
    allAbnormalities.push(...detectHeadTilt(landmarks, timestamp));
    
    // Upper extremity abnormalities
    allAbnormalities.push(...detectInternalShoulderRotation(landmarks, timestamp));
    allAbnormalities.push(...detectElbowHyperextension(landmarks, timestamp));
    allAbnormalities.push(...detectWristDrop(landmarks, timestamp));
    
    // Lower extremity abnormalities
    allAbnormalities.push(...detectAnkleDorsiflexionLoss(landmarks, timestamp));
    allAbnormalities.push(...detectFootDrop(landmarks, timestamp));
    allAbnormalities.push(...detectCalcanealAlignment(landmarks, timestamp));
    allAbnormalities.push(...detectToeWalking(landmarks, timestamp));
    
    // Gait & dynamic movement abnormalities
    allAbnormalities.push(...detectAntalgicGait(landmarks, timestamp));
    allAbnormalities.push(...detectSteppageGait(landmarks, timestamp));
    allAbnormalities.push(...detectCircumductionGait(landmarks, timestamp));
    allAbnormalities.push(...detectScissoringGait(landmarks, timestamp));
    
    // Functional movement patterns
    allAbnormalities.push(...detectPelvicRotation(landmarks, timestamp));
    allAbnormalities.push(...detectWeightShiftImbalance(landmarks, timestamp));
    allAbnormalities.push(...detectCompensatoryHead(landmarks, timestamp));
    
    // Neurological indicators
    allAbnormalities.push(...detectTremor(landmarks, timestamp));
    allAbnormalities.push(...detectAtaxicMovement(landmarks, timestamp));
    allAbnormalities.push(...detectBradykinesia(landmarks, timestamp));
    allAbnormalities.push(...detectMuscleRigidity(landmarks, timestamp));
    
    return allAbnormalities;
  };

  // Diagnostic workflow handlers
  const handleDiagnosisComplete = (result: DiagnosticResult) => {
    setDiagnosticResult(result);
    setAnalysisPhase('treatment');
    setActiveTab('treatment');
  };

  const handleProtocolSelect = (protocol: any) => {
    setSelectedProtocol(protocol);
  };

  const generateComprehensiveReport = () => {
    if (!diagnosticResult || !selectedProtocol) return;

    const report = {
      patientInfo: patientAnswers,
      movementAnalysis: {
        totalFrames: motionData.length,
        duration: Math.round(motionData[motionData.length - 1]?.timestamp / 1000 || 0),
        movementType,
        abnormalities: detectedAbnormalities
      },
      clinicalDiagnosis: diagnosticResult,
      treatmentPlan: selectedProtocol,
      anthropometrics: estimatedAnthropometrics,
      timestamp: new Date().toISOString()
    };

    // Create downloadable report
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motion-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const proceedToDiagnosis = () => {
    setAnalysisPhase('diagnosis');
    setActiveTab('diagnosis');
  };

  // Initialize 3D scene for virtual patient
  const initVirtualPatient = () => {
    console.log('Initializing virtual patient 3D scene...');
    
    if (!canvasRef.current) {
      console.error('Canvas ref not available');
      return;
    }

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      
      const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);
      
      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current, 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      renderer.setSize(400, 300);
      renderer.setClearColor(0xf0f0f0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Add a test cube to verify rendering works - make it more visible
      const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const testCube = new THREE.Mesh(testGeometry, testMaterial);
      testCube.position.set(0, 0, 0);
      scene.add(testCube);
      
      // Also add a rotating animation to the cube to make it obvious
      const animateCube = () => {
        if (testCube.parent) {
          testCube.rotation.x += 0.01;
          testCube.rotation.y += 0.01;
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          requestAnimationFrame(animateCube);
        }
      };
      animateCube();
      
      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      
      // Create animation loop for continuous rendering
      const animate = () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        requestAnimationFrame(animate);
      };
      animate();
      
      // Initial render with test cube
      renderer.render(scene, camera);
      console.log('✓ 3D scene initialized successfully with test cube and animation loop');
      
      // Remove test cube and show skeleton after 1 second
      setTimeout(() => {
        if (scene && testCube) {
          scene.remove(testCube);
          
          // If we have motion data, create skeleton immediately
          if (motionData && motionData.length > 0 && motionData[0]?.landmarks) {
            createSkeleton(motionData[0].landmarks);
          } else {
            // Show test skeleton if no motion data
            createTestSkeleton();
          }
          
          renderer.render(scene, camera);
          console.log('Test cube removed, skeleton displayed');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing 3D scene:', error);
    }
  };

  // Create 3D skeleton from pose landmarks
  const createSkeleton = (landmarks: any[]) => {
    console.log('Creating skeleton with landmarks:', landmarks?.length || 0);
    
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) {
      console.error('Missing 3D scene components');
      return;
    }

    if (!landmarks || landmarks.length === 0) {
      console.log('No landmarks provided');
      return;
    }
    
    try {
      // Clear previous skeleton
      if (skeletonRef.current) {
        sceneRef.current.remove(skeletonRef.current);
        skeletonRef.current = null;
      }

      const skeleton = new THREE.Group();
      
      // Create joint spheres (bright green, larger for visibility)
      const jointGeometry = new THREE.SphereGeometry(0.05, 12, 12);
      const jointMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: false
      });
      
      console.log('Adding joints...');
      let jointsAdded = 0;
      let validLandmarks = 0;
      
      landmarks.forEach((landmark, index) => {
        if (landmark && 
            typeof landmark.x === 'number' && 
            typeof landmark.y === 'number' &&
            !isNaN(landmark.x) && !isNaN(landmark.y)) {
          validLandmarks++;
          
          const joint = new THREE.Mesh(jointGeometry, jointMaterial);
          // Normalize coordinates from camera space to 3D space
          const x = (landmark.x / 1280 - 0.5) * 2;  // Normalize to -1 to 1
          const y = -(landmark.y / 720 - 0.5) * 2;  // Normalize to -1 to 1
          const z = (landmark.z || 0) * 0.5;
          
          joint.position.set(x, y, z);
          skeleton.add(joint);
          jointsAdded++;
          
          console.log(`Joint ${index}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        } else {
          console.log(`Invalid landmark ${index}:`, landmark);
        }
      });
      
      console.log(`Found ${validLandmarks} valid landmarks, added ${jointsAdded} joints`);

      // Simplified bone connections that work with most pose models
      const connections = [
        // Core body structure
        [11, 12], // shoulders
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 23], [12, 24], // torso
        [23, 24], // hips
        [23, 25], [25, 27], // left leg
        [24, 26], [26, 28], // right leg
        // Head if available
        [0, 1], [0, 2] // nose to eyes
      ];

      // Create bone lines (bright blue, thicker)
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x0066ff, 
        linewidth: 3,
        transparent: false
      });
      
      console.log('Adding bones...');
      let bonesAdded = 0;
      
      connections.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        
        if (start && end && 
            typeof start.x === 'number' && typeof start.y === 'number' &&
            typeof end.x === 'number' && typeof end.y === 'number' &&
            !isNaN(start.x) && !isNaN(start.y) &&
            !isNaN(end.x) && !isNaN(end.y)) {
          
          const startPos = new THREE.Vector3(
            (start.x / 1280 - 0.5) * 2,
            -(start.y / 720 - 0.5) * 2,
            (start.z || 0) * 0.5
          );
          
          const endPos = new THREE.Vector3(
            (end.x / 1280 - 0.5) * 2,
            -(end.y / 720 - 0.5) * 2,
            (end.z || 0) * 0.5
          );
          
          const points = [startPos, endPos];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial);
          skeleton.add(line);
          bonesAdded++;
        }
      });

      console.log(`Added ${bonesAdded} bones to skeleton`);
      
      if (jointsAdded > 0 || bonesAdded > 0) {
        skeletonRef.current = skeleton;
        sceneRef.current.add(skeleton);
        
        // Ensure camera is positioned to see the skeleton
        cameraRef.current.position.set(0, 0, 4);
        cameraRef.current.lookAt(0, 0, 0);
        
        // Force render
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        console.log('✓ Skeleton rendered successfully with', jointsAdded, 'joints and', bonesAdded, 'bones');
      } else {
        console.warn('No valid skeleton elements created - creating test skeleton');
        createTestSkeleton();
      }
      
    } catch (error) {
      console.error('Error creating skeleton:', error);
      createTestSkeleton();
    }
  };

  // Create a test skeleton when real pose data isn't available
  const createTestSkeleton = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    try {
      // Clear previous skeleton
      if (skeletonRef.current) {
        sceneRef.current.remove(skeletonRef.current);
        skeletonRef.current = null;
      }

      const skeleton = new THREE.Group();
      
      // Test skeleton positions (basic human pose)
      const testPose = [
        { x: 0.5, y: 0.2, z: 0 },    // 0: nose
        { x: 0.48, y: 0.18, z: 0 },  // 1: left eye
        { x: 0.52, y: 0.18, z: 0 },  // 2: right eye
        { x: 0.46, y: 0.2, z: 0 },   // 3: left ear
        { x: 0.54, y: 0.2, z: 0 },   // 4: right ear
        { x: 0.42, y: 0.35, z: 0 },  // 5: left shoulder
        { x: 0.58, y: 0.35, z: 0 },  // 6: right shoulder
        { x: 0.38, y: 0.5, z: 0 },   // 7: left elbow
        { x: 0.62, y: 0.5, z: 0 },   // 8: right elbow
        { x: 0.35, y: 0.65, z: 0 },  // 9: left wrist
        { x: 0.65, y: 0.65, z: 0 },  // 10: right wrist
        { x: 0.45, y: 0.6, z: 0 },   // 11: left hip
        { x: 0.55, y: 0.6, z: 0 },   // 12: right hip
        { x: 0.44, y: 0.75, z: 0 },  // 13: left knee
        { x: 0.56, y: 0.75, z: 0 },  // 14: right knee
        { x: 0.43, y: 0.9, z: 0 },   // 15: left ankle
        { x: 0.57, y: 0.9, z: 0 }    // 16: right ankle
      ];
      
      // Create joints
      const jointGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const jointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      
      testPose.forEach((point, index) => {
        const joint = new THREE.Mesh(jointGeometry, jointMaterial);
        joint.position.set(
          (point.x - 0.5) * 2,
          -(point.y - 0.5) * 2,
          point.z
        );
        skeleton.add(joint);
      });
      
      // Create bones
      const connections = [
        [0, 1], [0, 2], // head
        [5, 6], // shoulders
        [5, 7], [7, 9], // left arm
        [6, 8], [8, 10], // right arm
        [5, 11], [6, 12], // torso
        [11, 12], // hips
        [11, 13], [13, 15], // left leg
        [12, 14], [14, 16] // right leg
      ];
      
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0066ff, linewidth: 2 });
      
      connections.forEach(([start, end]) => {
        const startPoint = testPose[start];
        const endPoint = testPose[end];
        
        if (startPoint && endPoint) {
          const points = [
            new THREE.Vector3(
              (startPoint.x - 0.5) * 2,
              -(startPoint.y - 0.5) * 2,
              startPoint.z
            ),
            new THREE.Vector3(
              (endPoint.x - 0.5) * 2,
              -(endPoint.y - 0.5) * 2,
              endPoint.z
            )
          ];
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial);
          skeleton.add(line);
        }
      });
      
      skeletonRef.current = skeleton;
      sceneRef.current.add(skeleton);
      
      // Position camera
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
      
      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      console.log('✓ Test skeleton created and rendered');
      
    } catch (error) {
      console.error('Error creating test skeleton:', error);
    }
  };

  // Calculate angle between three points
  const calculateAngle = (pointA: any, pointB: any, pointC: any): number => {
    if (!pointA || !pointB || !pointC) return 0;
    if (typeof pointA.x === 'undefined' || typeof pointB.x === 'undefined' || typeof pointC.x === 'undefined') return 0;
    
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y
    };
    
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y
    };
    
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    
    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
    
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const angleRad = Math.acos(clampedCos);
    
    return (angleRad * 180) / Math.PI;
  };

  // Process single frame for joint angles
  const processFrame = (frame: PoseFrame): JointAngles => {
    const landmarks = frame.landmarks;
    
    if (!landmarks || landmarks.length < 17) {
      return {
        leftShoulder: 0, rightShoulder: 0,
        leftElbow: 0, rightElbow: 0,
        leftHip: 0, rightHip: 0,
        leftKnee: 0, rightKnee: 0,
        spine: 0
      };
    }

    return {
      leftShoulder: calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
      rightShoulder: calculateAngle(landmarks[14], landmarks[12], landmarks[24]),
      leftElbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
      rightElbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
      leftHip: calculateAngle(landmarks[25], landmarks[23], landmarks[11]),
      rightHip: calculateAngle(landmarks[26], landmarks[24], landmarks[12]),
      leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
      rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
      spine: calculateAngle(landmarks[11], landmarks[23], landmarks[24])
    };
  };

  // Estimate anthropometric measurements
  const estimateAnthropometrics = () => {
    if (!motionData || motionData.length === 0) return null;
    
    const firstFrame = motionData[0];
    if (!firstFrame.landmarks || firstFrame.landmarks.length < 17) return null;
    
    const landmarks = firstFrame.landmarks;
    
    // Calculate distances for limb lengths
    const calculateDistance = (p1: any, p2: any) => {
      if (!p1 || !p2 || typeof p1.x === 'undefined' || typeof p2.x === 'undefined') return 0;
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) * 100; // Convert to cm
    };
    
    return {
      limbLengths: {
        upperArm: Math.round(calculateDistance(landmarks[11], landmarks[13])),
        forearm: Math.round(calculateDistance(landmarks[13], landmarks[15])),
        thigh: Math.round(calculateDistance(landmarks[23], landmarks[25])),
        shin: Math.round(calculateDistance(landmarks[25], landmarks[27]))
      }
    };
  };

  // Analyze movement type
  const analyzeMovementType = (): string => {
    if (!motionData || motionData.length < 10) return 'insufficient data';
    
    const firstFrame = motionData[0];
    const lastFrame = motionData[motionData.length - 1];
    
    if (!firstFrame.landmarks || !lastFrame.landmarks) return 'unknown';
    
    const firstLeftWrist = firstFrame.landmarks[15];
    const lastLeftWrist = lastFrame.landmarks[15];
    const firstRightWrist = firstFrame.landmarks[16];
    const lastRightWrist = lastFrame.landmarks[16];
    
    if (!firstLeftWrist || !lastLeftWrist || !firstRightWrist || !lastRightWrist) {
      return 'unknown';
    }
    
    const leftWristMovement = Math.abs(lastLeftWrist.y - firstLeftWrist.y);
    const rightWristMovement = Math.abs(lastRightWrist.y - firstRightWrist.y);
    
    if (leftWristMovement > 0.2 || rightWristMovement > 0.2) {
      return 'upper body exercise';
    }
    
    const firstLeftAnkle = firstFrame.landmarks[27];
    const lastLeftAnkle = lastFrame.landmarks[27];
    const firstRightAnkle = firstFrame.landmarks[28];
    const lastRightAnkle = lastFrame.landmarks[28];
    
    if (!firstLeftAnkle || !lastLeftAnkle || !firstRightAnkle || !lastRightAnkle) {
      return 'unknown';
    }
    
    const leftAnkleMovement = Math.abs(lastLeftAnkle.y - firstLeftAnkle.y);
    const rightAnkleMovement = Math.abs(lastRightAnkle.y - firstRightAnkle.y);
    
    if (leftAnkleMovement > 0.1 || rightAnkleMovement > 0.1) {
      return 'lower body exercise';
    }
    
    return 'general movement';
  };

  // Initialize virtual patient scene
  useEffect(() => {
    console.log('useEffect triggered - initializing virtual patient');
    
    // Add a small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      initVirtualPatient();
    }, 100);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Also initialize when canvas ref becomes available
  useEffect(() => {
    if (canvasRef.current && !sceneRef.current) {
      console.log('Canvas ref available, initializing 3D scene');
      initVirtualPatient();
    }
  }, [canvasRef.current]);

  // Initialize analysis when motion data changes
  useEffect(() => {
    if (motionData && motionData.length > 0) {
      try {
        console.log('Initializing motion analysis with', motionData.length, 'frames');
        console.log('First frame sample:', motionData[0]);
        const anthropometrics = estimateAnthropometrics();
        setEstimatedAnthropometrics(anthropometrics);
        setMovementType(analyzeMovementType());
        setCurrentFrame(0);
        
        // Clear previous abnormalities for new analysis
        setDetectedAbnormalities([]);
        
        // Process first frame immediately
        if (motionData[0]) {
          const initialJointAngles = processFrame(motionData[0]);
          console.log('Initial joint angles:', initialJointAngles);
          setCurrentJointAngles(initialJointAngles);
          
          // Create initial virtual patient skeleton with delay to ensure 3D scene is ready
          if (motionData[0].landmarks) {
            setTimeout(() => {
              createSkeleton(motionData[0].landmarks);
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error analyzing motion data:', error);
        setEstimatedAnthropometrics(null);
        setMovementType('unknown');
      }
    }
  }, [motionData]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || motionData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        if (nextFrame >= motionData.length) {
          setIsPlaying(false);
          return 0;
        }
        return nextFrame;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, motionData.length, playbackSpeed]);

  // Update skeleton when frame changes
  useEffect(() => {
    if (motionData && motionData.length > 0 && currentFrame < motionData.length) {
      try {
        console.log('Processing frame', currentFrame, 'of', motionData.length);
        const jointAngles = processFrame(motionData[currentFrame]);
        console.log('Setting joint angles:', jointAngles);
        setCurrentJointAngles(jointAngles);
        
        // Update virtual patient skeleton movement
        if (motionData[currentFrame].landmarks) {
          createSkeleton(motionData[currentFrame].landmarks);
        }
        
        // Analyze movement abnormalities for current frame
        if (motionData[currentFrame].landmarks) {
          const frameAbnormalities = analyzeMovementAbnormalities(
            motionData[currentFrame].landmarks, 
            motionData[currentFrame].timestamp
          );
          
          // Update detected abnormalities (avoid duplicates)
          setDetectedAbnormalities(prev => {
            const newAbnormalities = [...prev];
            frameAbnormalities.forEach(abnormality => {
              // Only add if not already detected for this type in recent frames
              const recentSimilar = newAbnormalities.find(existing => 
                existing.type === abnormality.type && 
                existing.affectedSide === abnormality.affectedSide &&
                Math.abs(existing.timestamp - abnormality.timestamp) < 500 // Within 0.5 seconds
              );
              
              if (!recentSimilar) {
                newAbnormalities.push(abnormality);
              }
            });
            return newAbnormalities;
          });
        }
        
        if (onSkeletonUpdate) {
          onSkeletonUpdate(jointAngles, estimatedAnthropometrics);
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }
  }, [currentFrame, motionData, estimatedAnthropometrics, onSkeletonUpdate]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPlayback = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleFrameChange = (value: number[]) => {
    setCurrentFrame(value[0]);
    setIsPlaying(false);
  };

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
  };

  if (!motionData || motionData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Motion Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No motion data available</p>
            <p className="text-sm">Record patient movement to see analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Motion Analysis & Clinical Assessment
          </div>
          {diagnosticResult && selectedProtocol && (
            <Button onClick={generateComprehensiveReport} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${analysisPhase === 'motion' ? 'text-blue-600' : analysisPhase === 'diagnosis' || analysisPhase === 'treatment' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${analysisPhase === 'motion' ? 'bg-blue-600 text-white' : analysisPhase === 'diagnosis' || analysisPhase === 'treatment' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Motion Analysis</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${analysisPhase === 'diagnosis' ? 'text-blue-600' : analysisPhase === 'treatment' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${analysisPhase === 'diagnosis' ? 'bg-blue-600 text-white' : analysisPhase === 'treatment' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Clinical Diagnosis</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${analysisPhase === 'treatment' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${analysisPhase === 'treatment' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="font-medium">Treatment Planning</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Motion Analysis
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-2" disabled={detectedAbnormalities.length === 0}>
              <Brain className="h-4 w-4" />
              Clinical Diagnosis
            </TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center gap-2" disabled={!diagnosticResult}>
              <Stethoscope className="h-4 w-4" />
              Treatment Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            {/* Motion Analysis Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{motionData.length}</div>
            <div className="text-xs text-muted-foreground">Frames</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(motionData[motionData.length - 1]?.timestamp / 1000 || 0)}s</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="w-full justify-center">
              {movementType}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Movement Type</div>
          </div>
          <div className="text-center">
            <Badge variant={currentJointAngles ? "default" : "secondary"} className="w-full justify-center">
              {currentJointAngles ? "Active" : "Inactive"}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Virtual Patient</div>
          </div>
        </div>

        {/* Estimated Measurements */}
        {estimatedAnthropometrics && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Estimated Patient Measurements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>Upper Arm: {estimatedAnthropometrics.limbLengths.upperArm}cm</div>
              <div>Forearm: {estimatedAnthropometrics.limbLengths.forearm}cm</div>
              <div>Thigh: {estimatedAnthropometrics.limbLengths.thigh}cm</div>
              <div>Shin: {estimatedAnthropometrics.limbLengths.shin}cm</div>
            </div>
          </div>
        )}

        {/* Virtual Patient Visualization */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Virtual Patient Movement</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <canvas 
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-48 bg-gray-100 rounded border"
              style={{ maxWidth: '400px', maxHeight: '300px', display: 'block' }}
            />
            <div className="text-xs text-gray-600 mt-2 text-center">
              3D Virtual Patient - Shows movement during analysis
              {sceneRef.current ? ' (Active)' : ' (Initializing...)'}
            </div>
          </div>
        </div>

        {/* Movement Abnormality Detection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Movement Analysis Results
          </h3>
          {detectedAbnormalities.length > 0 ? (
            <div className="space-y-2">
              {detectedAbnormalities.map((abnormality, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-l-4 ${
                    abnormality.severity === 'severe' 
                      ? 'bg-red-50 border-red-500' 
                      : abnormality.severity === 'moderate'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={abnormality.severity === 'severe' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {abnormality.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {abnormality.affectedSide} side
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {abnormality.description}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {abnormality.clinicalSignificance}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>
                          <strong>Measured:</strong> {abnormality.angle?.toFixed(1)}°
                        </span>
                        <span>
                          <strong>Normal:</strong> {abnormality.normalRange}
                        </span>
                        <span className="text-gray-500">
                          @{(abnormality.timestamp / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    {detectedAbnormalities.length} movement pattern{detectedAbnormalities.length !== 1 ? 's' : ''} detected
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Ready for clinical diagnosis and treatment planning
                  </div>
                </div>
                <Button 
                  onClick={proceedToDiagnosis}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Proceed to Diagnosis
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-sm text-green-700">
                  No significant movement abnormalities detected
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Movement patterns appear within normal ranges
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Normal movement patterns detected
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Proceed to clinical assessment for comprehensive evaluation
                  </div>
                </div>
                <Button 
                  onClick={proceedToDiagnosis}
                  variant="outline"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Clinical Assessment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Current Joint Angles */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Joint Angles (degrees)</h3>
          {currentJointAngles ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Shoulder</div>
                <div className="text-lg font-bold text-blue-600">{Math.round(currentJointAngles.leftShoulder)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Shoulder</div>
                <div className="text-lg font-bold text-blue-600">{Math.round(currentJointAngles.rightShoulder)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Elbow</div>
                <div className="text-lg font-bold text-green-600">{Math.round(currentJointAngles.leftElbow)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Elbow</div>
                <div className="text-lg font-bold text-green-600">{Math.round(currentJointAngles.rightElbow)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">L Knee</div>
                <div className="text-lg font-bold text-purple-600">{Math.round(currentJointAngles.leftKnee)}°</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">R Knee</div>
                <div className="text-lg font-bold text-purple-600">{Math.round(currentJointAngles.rightKnee)}°</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              Press "Analyze Motion" to see joint angles
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={togglePlayback} size="sm" className="bg-blue-600 hover:bg-blue-700">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? ' Pause' : ' Analyze Motion'}
            </Button>
            <Button onClick={resetPlayback} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <div className="text-sm text-muted-foreground">
              Frame {currentFrame + 1} of {motionData.length}
            </div>
            {isPlaying && (
              <div className="text-sm text-green-600 font-medium animate-pulse">
                Analyzing joint movements...
              </div>
            )}
          </div>

          {/* Frame Slider */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Frame Position</div>
            <Slider
              value={[currentFrame]}
              onValueChange={handleFrameChange}
              max={motionData.length - 1}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Playback Speed: {playbackSpeed}x</div>
            <Slider
              value={[playbackSpeed]}
              onValueChange={handleSpeedChange}
              max={3}
              min={0.25}
              step={0.25}
              className="w-full"
            />
          </div>
        </div>

            {/* Real-time Status */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">
                Virtual Patient Status: {currentJointAngles ? 'Active Analysis' : 'Ready for Analysis'}
              </div>
              {currentJointAngles && (
                <div className="text-xs text-green-600 mt-1">
                  Real-time biomechanical analysis and movement pattern detection active
                </div>
              )}
            </div>

            {/* Proceed to Diagnosis Button */}
            {detectedAbnormalities.length > 0 && analysisPhase === 'motion' && (
              <div className="flex justify-center pt-4">
                <Button onClick={proceedToDiagnosis} className="bg-blue-600 hover:bg-blue-700">
                  <Brain className="h-4 w-4 mr-2" />
                  Proceed to Clinical Diagnosis
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="diagnosis" className="space-y-4">
            {detectedAbnormalities.length > 0 ? (
              <DiagnosticEngine
                abnormalities={detectedAbnormalities}
                onDiagnosisComplete={handleDiagnosisComplete}
                onProceedToTreatment={() => setActiveTab('treatment')}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Complete motion analysis first to proceed with diagnosis</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="treatment" className="space-y-4">
            {diagnosticResult ? (
              <TreatmentProtocolEngine
                diagnosticResult={diagnosticResult}
                patientAnswers={patientAnswers}
                abnormalities={detectedAbnormalities}
                onProtocolSelect={handleProtocolSelect}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Complete clinical diagnosis first to proceed with treatment planning</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}