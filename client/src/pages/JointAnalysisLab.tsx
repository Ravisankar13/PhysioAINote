import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera as CameraIcon, 
  Play, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Target,
  Sparkles,
  TrendingUp,
  Ruler,
  RotateCw,
  Cpu,
  Video,
  Clock,
  ChevronRight,
  ChevronDown,
  X,
  Minimize2,
  Maximize2,
  SwitchCamera
} from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';

// Pose landmark indices from MediaPipe
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Joint configuration
type JointType = 'ankle' | 'knee' | 'hip' | 'shoulder' | 'elbow' | 'wrist';

interface JointConfig {
  id: JointType;
  label: string;
  landmarks: { primary: number; secondary: number; tertiary: number };
  additionalTracking?: number[];
  targetPosition: { x: number; y: number };
  toleranceRadius: number;
  movementInstruction: string;
}

const JOINT_CONFIGS: Record<JointType, JointConfig> = {
  ankle: {
    id: 'ankle',
    label: 'Ankle',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_ANKLE,
      secondary: POSE_LANDMARKS.LEFT_KNEE,
      tertiary: POSE_LANDMARKS.LEFT_HIP
    },
    targetPosition: { x: 0.5, y: 0.7 },
    toleranceRadius: 80,
    movementInstruction: "Rise up on your toes and lower back down"
  },
  knee: {
    id: 'knee',
    label: 'Knee',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_KNEE,
      secondary: POSE_LANDMARKS.LEFT_HIP,
      tertiary: POSE_LANDMARKS.LEFT_ANKLE
    },
    targetPosition: { x: 0.5, y: 0.6 },
    toleranceRadius: 80,
    movementInstruction: "Perform a slow squat and stand back up"
  },
  hip: {
    id: 'hip',
    label: 'Hip',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_HIP,
      secondary: POSE_LANDMARKS.LEFT_KNEE,
      tertiary: POSE_LANDMARKS.LEFT_SHOULDER
    },
    targetPosition: { x: 0.5, y: 0.5 },
    toleranceRadius: 80,
    movementInstruction: "Lift your knee toward chest and lower it down"
  },
  shoulder: {
    id: 'shoulder',
    label: 'Shoulder',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_SHOULDER,
      secondary: POSE_LANDMARKS.LEFT_ELBOW,
      tertiary: POSE_LANDMARKS.LEFT_HIP
    },
    additionalTracking: [
      POSE_LANDMARKS.NOSE,
      POSE_LANDMARKS.LEFT_EAR,
      POSE_LANDMARKS.RIGHT_EAR,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_HIP
    ],
    targetPosition: { x: 0.5, y: 0.4 },
    toleranceRadius: 100,
    movementInstruction: "Slowly raise your arm overhead and back down"
  },
  elbow: {
    id: 'elbow',
    label: 'Elbow',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_ELBOW,
      secondary: POSE_LANDMARKS.LEFT_SHOULDER,
      tertiary: POSE_LANDMARKS.LEFT_WRIST
    },
    targetPosition: { x: 0.5, y: 0.45 },
    toleranceRadius: 80,
    movementInstruction: "Bend your elbow and straighten it out"
  },
  wrist: {
    id: 'wrist',
    label: 'Wrist',
    landmarks: { 
      primary: POSE_LANDMARKS.LEFT_WRIST,
      secondary: POSE_LANDMARKS.LEFT_ELBOW,
      tertiary: POSE_LANDMARKS.LEFT_SHOULDER
    },
    targetPosition: { x: 0.5, y: 0.55 },
    toleranceRadius: 80,
    movementInstruction: "Flex your wrist up and down"
  }
};

interface MovementFrame {
  timestamp: number;
  landmarks: any[];
  angle: number;
}

interface MovementMetrics {
  totalRange: number;
  smoothness: number;
  symmetry?: number;
  compensations: string[];
}

interface JointAnalysisResult {
  jointType: JointType;
  movementMetrics: MovementMetrics;
  movementRange: { min: number; max: number; total: number };
  clinicalInterpretation: string;
  timestamp: Date;
}

type Pose = any;
type Camera = any;

type RecordingPhase = 'idle' | 'preparing_next_test' | 'countdown' | 'recording' | 'complete';

// Helper function to detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Helper function to detect if device is a phone (not tablet)
const isPhoneDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = /iphone|android.*mobile/i.test(userAgent);
  return isPhone;
};

export default function JointAnalysisLab() {
  const { toast } = useToast();
  
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isJointCentered, setIsJointCentered] = useState(false);
  const [centeredDuration, setCenteredDuration] = useState(0);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>(
    isPhoneDevice() ? 'environment' : 'user'
  );
  
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [preparationCountdown, setPreparationCountdown] = useState(4);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [movementData, setMovementData] = useState<MovementFrame[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JointAnalysisResult | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[] | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  // Session management for adaptive assessments
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{
    movementType: string;
    instruction: string;
    movementRange: number;
    smoothness: number;
    compensations: string[];
    symmetry?: number;
    findings: string;
    timestamp: Date;
  }>>([]);
  const [currentHypotheses, setCurrentHypotheses] = useState<Array<{
    diagnosis: string;
    likelihood: "high" | "moderate" | "low";
    supportingEvidence: string[];
    testsNeeded: string[];
  }>>([]);
  const [clinicalReasoning, setClinicalReasoning] = useState<string>('');
  const [nextTestRecommendation, setNextTestRecommendation] = useState<{
    movementType: string;
    instruction: string;
    rationale: string;
  } | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false);
  const [completionReason, setCompletionReason] = useState<string>('');
  const [isGettingNextTest, setIsGettingNextTest] = useState(false);
  
  const [finalDiagnosis, setFinalDiagnosis] = useState<{
    primaryDiagnosis: {
      condition: string;
      confidence: "high" | "moderate" | "low";
      clinicalReasoning: string;
      keyFindings: string[];
    };
    differentialDiagnoses: Array<{
      condition: string;
      likelihood: "high" | "moderate" | "low";
      supportingEvidence: string[];
      ruledOutBy?: string;
    }>;
    clinicalReasoningChain: string[];
    treatmentRecommendations: {
      immediateActions: string[];
      exercises: string[];
      manualTherapy: string[];
      precautions: string[];
    };
    redFlags: string[];
    prognosticIndicators: string[];
  } | null>(null);
  const [isGettingFinalDiagnosis, setIsGettingFinalDiagnosis] = useState(false);
  const [showTestHistory, setShowTestHistory] = useState(false);
  const [showClinicalThinking, setShowClinicalThinking] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const centeredStartTimeRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const jointPositionHistoryRef = useRef<{x: number, y: number, timestamp: number}[]>([]);
  const recordingPhaseRef = useRef<RecordingPhase>('idle');
  const animationFrameRef = useRef<number | null>(null);
  const currentInstructionRef = useRef<string>('');
  const currentMovementTypeRef = useRef<string>('');

  const calculateAngle = (a: any, b: any, c: any): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const isJointStable = useCallback((currentX: number, currentY: number): boolean => {
    const now = Date.now();
    const history = jointPositionHistoryRef.current;
    
    // Add current position to history
    history.push({ x: currentX, y: currentY, timestamp: now });
    
    // Keep only last 1.5 seconds of data
    const cutoff = now - 1500;
    jointPositionHistoryRef.current = history.filter(pos => pos.timestamp > cutoff);
    
    // Need at least 10 frames over 1.5 seconds to determine stability
    if (jointPositionHistoryRef.current.length < 10) return false;
    
    // Calculate variance in position
    const positions = jointPositionHistoryRef.current;
    const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
    
    const variance = positions.reduce((sum, p) => {
      return sum + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
    }, 0) / positions.length;
    
    // Joint is stable if variance is very low (less than 0.0001 in normalized coordinates)
    return variance < 0.0001;
  }, []);

  const calculateMovementMetrics = (frames: MovementFrame[], jointType: JointType): MovementMetrics => {
    if (frames.length < 2) {
      return {
        totalRange: 0,
        smoothness: 0,
        compensations: []
      };
    }

    const angles = frames.map(f => f.angle);
    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);
    const totalRange = maxAngle - minAngle;

    const angleChanges: number[] = [];
    for (let i = 1; i < angles.length; i++) {
      angleChanges.push(Math.abs(angles[i] - angles[i - 1]));
    }
    
    const mean = angleChanges.reduce((a, b) => a + b, 0) / angleChanges.length;
    const variance = angleChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / angleChanges.length;
    const smoothness = Math.sqrt(variance);

    const compensations: string[] = [];
    
    const config = JOINT_CONFIGS[jointType];
    
    if (jointType === 'shoulder') {
      let earlyScapularElevation = false;
      let forwardHeadPosture = false;
      let scapularWinging = false;
      let rhythmDisturbance = false;
      
      const shoulderHeights: number[] = [];
      const armAngles: number[] = [];
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const nose = frame.landmarks[POSE_LANDMARKS.NOSE];
        const leftEar = frame.landmarks[POSE_LANDMARKS.LEFT_EAR];
        const rightEar = frame.landmarks[POSE_LANDMARKS.RIGHT_EAR];
        const leftShoulder = frame.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = frame.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        const leftElbow = frame.landmarks[POSE_LANDMARKS.LEFT_ELBOW];
        const leftHip = frame.landmarks[POSE_LANDMARKS.LEFT_HIP];
        const rightHip = frame.landmarks[POSE_LANDMARKS.RIGHT_HIP];
        
        if (leftShoulder && rightShoulder && leftElbow && leftHip) {
          const shoulderMidpointY = (leftShoulder.y + rightShoulder.y) / 2;
          shoulderHeights.push(shoulderMidpointY);
          armAngles.push(frame.angle);
          
          const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
          if (shoulderTilt > 0.08) {
            earlyScapularElevation = true;
          }
          
          if (nose && leftShoulder && rightShoulder) {
            const shoulderMidpointX = (leftShoulder.x + rightShoulder.x) / 2;
            const headProtraction = nose.x - shoulderMidpointX;
            if (Math.abs(headProtraction) > 0.08) {
              forwardHeadPosture = true;
            }
          }
          
          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
            const hipWidth = Math.abs(leftHip.x - rightHip.x);
            const shoulderProtraction = shoulderWidth / hipWidth;
            if (shoulderProtraction > 1.15) {
              scapularWinging = true;
            }
          }
        }
      }
      
      if (shoulderHeights.length > 2 && armAngles.length > 2) {
        const midIndex = Math.floor(shoulderHeights.length / 2);
        const earlyShoulderElevation = shoulderHeights[0] - shoulderHeights[midIndex];
        const earlyArmElevation = armAngles[midIndex] - armAngles[0];
        
        if (earlyShoulderElevation > 0.03 && earlyArmElevation > 30) {
          rhythmDisturbance = true;
        }
      }
      
      if (earlyScapularElevation) {
        compensations.push('Scapular elevation - early shoulder shrug during arm raise');
      }
      if (forwardHeadPosture) {
        compensations.push('Forward head posture - cervical protraction detected');
      }
      if (scapularWinging) {
        compensations.push('Scapular protraction - possible serratus anterior weakness');
      }
      if (rhythmDisturbance) {
        compensations.push('Altered scapulohumeral rhythm - scapular compensation before 30° abduction');
      }
      
    } else {
      for (const frame of frames) {
        const leftShoulder = frame.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = frame.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        const leftHip = frame.landmarks[POSE_LANDMARKS.LEFT_HIP];
        const rightHip = frame.landmarks[POSE_LANDMARKS.RIGHT_HIP];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
          const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
          const hipTilt = Math.abs(leftHip.y - rightHip.y);
          
          if (shoulderTilt > 0.1) {
            if (!compensations.includes('Shoulder elevation detected')) {
              compensations.push('Shoulder elevation detected');
            }
          }
          
          if (hipTilt > 0.08) {
            if (!compensations.includes('Hip hiking observed')) {
              compensations.push('Hip hiking observed');
            }
          }
          
          const trunkAngle = calculateAngle(leftShoulder, leftHip, rightHip);
          if (Math.abs(trunkAngle - 90) > 15) {
            if (!compensations.includes('Trunk lean detected')) {
              compensations.push('Trunk lean detected');
            }
          }
        }
      }
    }

    let symmetry: number | undefined;
    if (['shoulder', 'hip', 'knee', 'ankle', 'elbow', 'wrist'].includes(jointType)) {
      const leftAngles = angles;
      const avgLeft = leftAngles.reduce((a, b) => a + b, 0) / leftAngles.length;
      symmetry = 100 - Math.min(100, Math.abs(avgLeft - 90));
    }

    return {
      totalRange,
      smoothness,
      symmetry,
      compensations
    };
  };

  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
      setCurrentLandmarks(results.poseLandmarks);
      
      const config = JOINT_CONFIGS[selectedJoint];
      const primary = results.poseLandmarks[config.landmarks.primary];
      const secondary = results.poseLandmarks[config.landmarks.secondary];
      const tertiary = results.poseLandmarks[config.landmarks.tertiary];
      
      if (primary && secondary && tertiary) {
        const angle = calculateAngle(tertiary, primary, secondary);
        
        // Use ref instead of state to avoid stale closure
        if (recordingPhaseRef.current === 'recording') {
          const timestamp = Date.now();
          setMovementData(prev => [...prev, {
            timestamp,
            landmarks: results.poseLandmarks,
            angle
          }]);
        }
        
        if (recordingPhaseRef.current === 'idle' || recordingPhaseRef.current === 'countdown') {
          const stable = isJointStable(primary.x, primary.y);
          setIsJointCentered(stable);
          
          if (stable) {
            if (!centeredStartTimeRef.current) {
              centeredStartTimeRef.current = Date.now();
            }
            const duration = (Date.now() - centeredStartTimeRef.current) / 1000;
            setCenteredDuration(duration);
            
            // Auto-start recording after 1.5 seconds of being stable
            if (duration >= 1.5 && recordingPhaseRef.current === 'idle') {
              startRecording();
            }
          } else {
            centeredStartTimeRef.current = null;
            setCenteredDuration(0);
          }
        }
        
        // Draw circle at current joint position (follows the joint)
        const targetX = primary.x * canvas.width;
        const targetY = primary.y * canvas.height;
        
        const isStable = jointPositionHistoryRef.current.length >= 10 && isJointStable(primary.x, primary.y);
        
        overlayCtx.strokeStyle = isStable ? '#22c55e' : '#ef4444';
        overlayCtx.lineWidth = 4;
        overlayCtx.beginPath();
        overlayCtx.arc(targetX, targetY, config.toleranceRadius, 0, Math.PI * 2);
        overlayCtx.stroke();
        
        overlayCtx.strokeStyle = isStable ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        overlayCtx.lineWidth = 2;
        overlayCtx.beginPath();
        overlayCtx.moveTo(targetX - 20, targetY);
        overlayCtx.lineTo(targetX + 20, targetY);
        overlayCtx.moveTo(targetX, targetY - 20);
        overlayCtx.lineTo(targetX, targetY + 20);
        overlayCtx.stroke();
        
        overlayCtx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        overlayCtx.lineWidth = 3;
        overlayCtx.beginPath();
        overlayCtx.moveTo(tertiary.x * canvas.width, tertiary.y * canvas.height);
        overlayCtx.lineTo(primary.x * canvas.width, primary.y * canvas.height);
        overlayCtx.lineTo(secondary.x * canvas.width, secondary.y * canvas.height);
        overlayCtx.stroke();
        
        [primary, secondary, tertiary].forEach((landmark, idx) => {
          overlayCtx.fillStyle = idx === 0 ? '#3b82f6' : '#60a5fa';
          overlayCtx.beginPath();
          overlayCtx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            idx === 0 ? 10 : 6,
            0,
            Math.PI * 2
          );
          overlayCtx.fill();
        });
        
        overlayCtx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
        overlayCtx.lineWidth = 2;
        const arcRadius = 40;
        const startAngle = Math.atan2(tertiary.y - primary.y, tertiary.x - primary.x);
        overlayCtx.beginPath();
        overlayCtx.arc(
          primary.x * canvas.width,
          primary.y * canvas.height,
          arcRadius,
          startAngle,
          startAngle + (angle * Math.PI / 180)
        );
        overlayCtx.stroke();
        
        overlayCtx.fillStyle = '#fbbf24';
        overlayCtx.font = 'bold 16px Arial';
        overlayCtx.fillText(
          `${angle.toFixed(1)}°`,
          primary.x * canvas.width + 50,
          primary.y * canvas.height - 10
        );

        // Instruction overlay - positioned in upper-center for visibility
        if (recordingPhase === 'idle') {
          const instructionY = 120;
          overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          overlayCtx.fillRect(canvas.width / 2 - 300, instructionY - 50, 600, 100);
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 22px Arial';
          overlayCtx.textAlign = 'center';
          overlayCtx.textBaseline = 'middle';
          
          const currentDuration = centeredStartTimeRef.current ? (Date.now() - centeredStartTimeRef.current) / 1000 : 0;
          
          if (isStable) {
            overlayCtx.fillText(
              `Get ready... ${Math.max(0, 1.5 - currentDuration).toFixed(1)}s`,
              canvas.width / 2,
              instructionY - 15
            );
          }
          
          overlayCtx.fillStyle = isStable ? '#22c55e' : '#fbbf24';
          overlayCtx.font = isStable ? 'bold 24px Arial' : 'bold 20px Arial';
          overlayCtx.fillText(
            config.movementInstruction,
            canvas.width / 2,
            instructionY + 15
          );
        }
        
        if (recordingPhase === 'preparing_next_test') {
          // Black background overlay with next test instruction
          const instructionY = 150;
          overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          overlayCtx.fillRect(canvas.width / 2 - 320, instructionY - 80, 640, 160);
          
          overlayCtx.fillStyle = '#3b82f6';
          overlayCtx.font = 'bold 20px Arial';
          overlayCtx.textAlign = 'center';
          overlayCtx.textBaseline = 'middle';
          overlayCtx.fillText('NEXT TEST', canvas.width / 2, instructionY - 40);
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 26px Arial';
          overlayCtx.fillText(
            nextTestRecommendation?.instruction || 'Prepare for next movement',
            canvas.width / 2,
            instructionY
          );
          
          overlayCtx.fillStyle = '#22c55e';
          overlayCtx.font = 'bold 22px Arial';
          overlayCtx.fillText(
            `Starting in ${preparationCountdown}...`,
            canvas.width / 2,
            instructionY + 45
          );
        }
        
        if (recordingPhase === 'countdown') {
          overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          overlayCtx.fillRect(canvas.width / 2 - 100, canvas.height / 2 - 100, 200, 200);
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 120px Arial';
          overlayCtx.textAlign = 'center';
          overlayCtx.textBaseline = 'middle';
          overlayCtx.fillText(
            countdown > 0 ? countdown.toString() : 'GO!',
            canvas.width / 2,
            canvas.height / 2
          );
        }
        
        if (recordingPhase === 'recording') {
          // Recording indicator dot
          overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          overlayCtx.beginPath();
          overlayCtx.arc(50, 50, 15, 0, Math.PI * 2);
          overlayCtx.fill();
          
          overlayCtx.fillStyle = '#ffffff';
          overlayCtx.font = 'bold 18px Arial';
          overlayCtx.textAlign = 'left';
          overlayCtx.fillText('RECORDING', 75, 55);
          
          // Movement instruction overlay - positioned in upper-center for visibility
          const instructionY = 120;
          overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          overlayCtx.fillRect(canvas.width / 2 - 300, instructionY - 40, 600, 80);
          
          // Use instruction from ref (persists through state updates)
          const displayInstruction = currentInstructionRef.current || config.movementInstruction;
          
          overlayCtx.fillStyle = '#22c55e';
          overlayCtx.font = 'bold 24px Arial';
          overlayCtx.textAlign = 'center';
          overlayCtx.textBaseline = 'middle';
          overlayCtx.fillText(
            displayInstruction,
            canvas.width / 2,
            instructionY
          );
        }
      }
    }
  }, [selectedJoint, isJointStable, calculateAngle, recordingPhase, countdown, preparationCountdown, nextTestRecommendation]);

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        setCameraStatus('initializing');
        
        const loaded = await loadMediaPipeLibraries();
        if (!loaded) {
          throw new Error('Failed to load MediaPipe libraries');
        }
        
        setMediapipeLoaded(true);
        setCameraStatus('ready');
        
        toast({
          title: "Camera Ready",
          description: "MediaPipe pose detection initialized successfully",
        });
      } catch (error) {
        console.error('MediaPipe initialization error:', error);
        setCameraStatus('error');
        toast({
          title: "Initialization Error",
          description: "Failed to initialize pose detection. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    initMediaPipe();
  }, [toast]);

  // Cleanup effect - runs on component unmount
  useEffect(() => {
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Close pose
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {
          console.error('Error closing pose on unmount:', e);
        }
      }
      
      // Stop all video stream tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Clear intervals
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Handle page visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - pause camera processing
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } else {
        // Page is visible - resume camera processing
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getVideoTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const startTracking = async () => {
    if (!mediapipeLoaded || !videoRef.current || !canvasRef.current) return;
    
    try {
      const pose = new window.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
        }
      });
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      pose.onResults(onPoseResults);
      poseRef.current = pose;
      
      // Use getUserMedia directly to support camera selection
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Create a manual camera loop that continues until stopped
        const sendFrame = async () => {
          if (poseRef.current && videoRef.current && videoRef.current.readyState === 4) {
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch (e) {
              console.error('Error sending frame to pose detection:', e);
            }
          }
          // Keep looping as long as poseRef exists (it's set to null when stopping)
          if (poseRef.current) {
            animationFrameRef.current = requestAnimationFrame(sendFrame);
          }
        };
        animationFrameRef.current = requestAnimationFrame(sendFrame);
      }
      
      setIsTracking(true);
      
      toast({
        title: "Tracking Started",
        description: `Position your ${JOINT_CONFIGS[selectedJoint].label.toLowerCase()} in the target circle`,
      });
    } catch (error) {
      console.error('Tracking start error:', error);
      toast({
        title: "Tracking Error",
        description: "Failed to start pose tracking. Please check camera permissions.",
        variant: "destructive",
      });
    }
  };

  const stopTracking = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clean up pose first (this stops the loop)
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch (e) {
        console.error('Error closing pose:', e);
      }
      poseRef.current = null;
    }
    
    // Stop all video stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    // Clear intervals
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    // Reset state
    setIsTracking(false);
    setIsJointCentered(false);
    setCenteredDuration(0);
    setRecordingPhase('idle');
    recordingPhaseRef.current = 'idle';
    setMovementData([]);
    centeredStartTimeRef.current = null;
    jointPositionHistoryRef.current = [];
  };

  const switchCamera = async () => {
    if (!isTracking || recordingPhase !== 'idle') {
      toast({
        title: "Cannot Switch Camera",
        description: "Please stop tracking or wait for recording to complete before switching camera",
        variant: "destructive",
      });
      return;
    }

    try {
      // Stop current tracking
      stopTracking();
      
      // Switch camera facing mode
      const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
      setCameraFacingMode(newFacingMode);
      
      // Small delay to ensure cleanup
      setTimeout(async () => {
        await startTracking();
        
        toast({
          title: "Camera Switched",
          description: `Now using ${newFacingMode === 'user' ? 'front' : 'rear'} camera`,
        });
      }, 300);
    } catch (error) {
      console.error('Camera switch error:', error);
      toast({
        title: "Switch Failed",
        description: "Failed to switch camera",
        variant: "destructive",
      });
    }
  };

  const handleJointChange = (joint: JointType) => {
    setSelectedJoint(joint);
    setAnalysisResult(null);
    setIsJointCentered(false);
    setCenteredDuration(0);
    setRecordingPhase('idle');
    recordingPhaseRef.current = 'idle';
    setMovementData([]);
    centeredStartTimeRef.current = null;
    jointPositionHistoryRef.current = [];
  };

  const startAutomatedNextTest = (testData: { movementType: string; instruction: string; rationale: string }) => {
    console.log('Starting automated next test. Instruction:', testData.instruction);
    
    // Clear previous test results to allow auto-analysis to trigger for new test
    setAnalysisResult(null);
    setMovementData([]);
    setRecordingProgress(0);
    
    // Update state immediately with the new test data
    setNextTestRecommendation(testData);
    
    // Store instruction and movement type in refs for persistent tracking
    currentInstructionRef.current = testData.instruction;
    currentMovementTypeRef.current = testData.movementType;
    
    setRecordingPhase('preparing_next_test');
    recordingPhaseRef.current = 'preparing_next_test';
    setPreparationCountdown(4);
    
    const prepInterval = setInterval(() => {
      setPreparationCountdown(prev => {
        console.log('Preparation countdown:', prev);
        if (prev <= 1) {
          clearInterval(prepInterval);
          setTimeout(() => {
            console.log('Starting recording after preparation with instruction:', testData.instruction);
            startRecording();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    // Set instruction and movement type in refs if not already set (for first test)
    if (!currentInstructionRef.current) {
      const config = JOINT_CONFIGS[selectedJoint];
      currentInstructionRef.current = config.movementInstruction;
      currentMovementTypeRef.current = `Active ${config.label.toLowerCase()} flexion`;
    }
    
    setRecordingPhase('countdown');
    recordingPhaseRef.current = 'countdown';
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            setRecordingPhase('recording');
            recordingPhaseRef.current = 'recording';
            setMovementData([]);
            recordingStartTimeRef.current = Date.now();
            
            const progressInterval = setInterval(() => {
              if (recordingStartTimeRef.current) {
                const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
                const progress = Math.min(100, (elapsed / 5) * 100);
                setRecordingProgress(progress);
                
                if (elapsed >= 5) {
                  clearInterval(progressInterval);
                  setRecordingPhase('complete');
                  recordingPhaseRef.current = 'complete';
                  setRecordingProgress(100);
                  
                  toast({
                    title: "Recording Complete",
                    description: "Analyzing movement...",
                  });
                }
              }
            }, 100);
            
            recordingIntervalRef.current = progressInterval;
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performAnalysis = async () => {
    if (movementData.length === 0) {
      toast({
        title: "No Movement Data",
        description: "Please record a movement first",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const metrics = calculateMovementMetrics(movementData, selectedJoint);
      
      const angles = movementData.map(f => f.angle);
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      
      const movementSummary = {
        frameCount: movementData.length,
        duration: movementData.length > 0 ? 
          (movementData[movementData.length - 1].timestamp - movementData[0].timestamp) / 1000 : 0,
        angleRange: { min: minAngle, max: maxAngle }
      };
      
      const analysisPayload = {
        joint: selectedJoint,
        movementRange: metrics.totalRange,
        smoothness: metrics.smoothness,
        compensationPatterns: metrics.compensations,
        symmetry: metrics.symmetry,
        movementDataSummary: movementSummary
      };

      const response = await fetch('/api/joint-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(analysisPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Analysis failed with status ${response.status}`);
      }

      const aiAnalysis = await response.json();
      
      const result: JointAnalysisResult = {
        jointType: selectedJoint,
        movementMetrics: metrics,
        movementRange: {
          min: minAngle,
          max: maxAngle,
          total: metrics.totalRange
        },
        clinicalInterpretation: aiAnalysis.interpretation?.overall || 'Analysis complete. Movement patterns captured successfully.',
        timestamp: new Date()
      };
      
      setAnalysisResult(result);
      
      // Auto-trigger next test recommendation after analysis
      setTimeout(() => {
        getNextTestRecommendation(result);
      }, 500);
      
      toast({
        title: "AI Analysis Complete",
        description: "Movement analysis results are ready",
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      const metrics = calculateMovementMetrics(movementData, selectedJoint);
      const angles = movementData.map(f => f.angle);
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      
      const fallbackResult: JointAnalysisResult = {
        jointType: selectedJoint,
        movementMetrics: metrics,
        movementRange: {
          min: minAngle,
          max: maxAngle,
          total: metrics.totalRange
        },
        clinicalInterpretation: `Movement analysis complete. Range: ${metrics.totalRange.toFixed(1)}°, Smoothness: ${metrics.smoothness.toFixed(2)}. ${metrics.compensations.length > 0 ? 'Compensations detected: ' + metrics.compensations.join(', ') : 'No significant compensations detected.'}`,
        timestamp: new Date()
      };
      
      setAnalysisResult(fallbackResult);
      
      // Continue adaptive assessment even with local metrics
      setTimeout(() => {
        getNextTestRecommendation(fallbackResult);
      }, 500);
      
      toast({
        title: "Analysis Complete",
        description: "Local analysis completed (AI analysis unavailable)",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getNextTestRecommendation = async (currentResult: JointAnalysisResult) => {
    setIsGettingNextTest(true);
    
    try {
      // Add current test to history using refs for accurate tracking
      const movementType = currentMovementTypeRef.current || 
        `Active ${currentResult.jointType} movement`;
      const instruction = currentInstructionRef.current || 
        JOINT_CONFIGS[currentResult.jointType].movementInstruction;
      
      const newTest = {
        movementType: movementType,
        instruction: instruction,
        movementRange: currentResult.movementMetrics.totalRange,
        smoothness: currentResult.movementMetrics.smoothness,
        compensations: currentResult.movementMetrics.compensations,
        symmetry: currentResult.movementMetrics.symmetry,
        findings: currentResult.clinicalInterpretation,
        timestamp: currentResult.timestamp
      };
      
      const updatedHistory = [...testHistory, newTest];
      setTestHistory(updatedHistory);
      
      // Call AI reasoning endpoint
      const response = await fetch('/api/joint-analysis/next-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jointType: selectedJoint,
          testsPerformed: updatedHistory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get next test recommendation');
      }

      const result = await response.json();
      
      console.log('AI Next Test Response:', result.nextTest);
      
      setClinicalReasoning(result.clinicalReasoning);
      setCurrentHypotheses(result.currentHypotheses || []);
      setNextTestRecommendation(result.nextTest);
      setIsAssessmentComplete(result.isAssessmentComplete);
      setCompletionReason(result.completionReason || '');
      
      if (!isSessionActive) {
        setIsSessionActive(true);
        setSessionId(`session-${Date.now()}`);
      }
      
      if (result.isAssessmentComplete && updatedHistory.length > 0) {
        setTimeout(() => {
          getFinalDiagnosis();
        }, 1000);
      } else if (result.nextTest) {
        // Automatically start preparation for next test
        setTimeout(() => {
          startAutomatedNextTest(result.nextTest);
        }, 1500);
      }
      
      toast({
        title: result.isAssessmentComplete ? "Assessment Complete" : "Next Test Recommended",
        description: result.isAssessmentComplete 
          ? "AI has gathered sufficient diagnostic information"
          : `Recommended: ${result.nextTest?.movementType}`,
      });
      
    } catch (error) {
      console.error('Error getting next test:', error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendation. You can continue manually.",
        variant: "destructive",
      });
    } finally {
      setIsGettingNextTest(false);
    }
  };

  const getFinalDiagnosis = async () => {
    setIsGettingFinalDiagnosis(true);
    
    try {
      const response = await fetch('/api/joint-analysis/final-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jointType: selectedJoint,
          testsPerformed: testHistory,
          currentHypotheses: currentHypotheses
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get final diagnosis');
      }

      const result = await response.json();
      setFinalDiagnosis(result);
      
      toast({
        title: "Final Diagnosis Complete",
        description: "Comprehensive diagnostic report is ready",
      });
      
    } catch (error) {
      console.error('Error getting final diagnosis:', error);
      toast({
        title: "Error",
        description: "Failed to generate final diagnosis",
        variant: "destructive",
      });
    } finally {
      setIsGettingFinalDiagnosis(false);
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setTestHistory([]);
    setCurrentHypotheses([]);
    setClinicalReasoning('');
    setNextTestRecommendation(null);
    setIsSessionActive(false);
    setIsAssessmentComplete(false);
    setCompletionReason('');
    setAnalysisResult(null);
    setRecordingPhase('idle');
    setMovementData([]);
    setFinalDiagnosis(null);
    setIsGettingFinalDiagnosis(false);
    setShowTestHistory(false);
    setShowClinicalThinking(true);
    setPreparationCountdown(4);
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // Auto-trigger analysis when recording completes
  useEffect(() => {
    if (recordingPhase === 'complete' && movementData.length > 0 && !isAnalyzing && !analysisResult) {
      console.log('Auto-triggering analysis with', movementData.length, 'frames');
      // Small delay to ensure UI updates
      const timer = setTimeout(() => {
        performAnalysis();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [recordingPhase, movementData.length, isAnalyzing, analysisResult]);

  const canStartRecording = isTracking && isJointCentered && centeredDuration >= 1 && recordingPhase === 'idle';
  const canAnalyze = recordingPhase === 'complete' && movementData.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Joint Analysis Lab</h1>
          <p className="text-muted-foreground text-lg">
            Movement-based joint analysis with AI-powered biomechanical insights
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Select Joint to Analyze
            </CardTitle>
            <CardDescription>
              Choose the joint you want to analyze
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-3 flex-1">
                {(Object.keys(JOINT_CONFIGS) as JointType[]).map((joint) => (
                  <Button
                    key={joint}
                    variant={selectedJoint === joint ? 'default' : 'outline'}
                    onClick={() => handleJointChange(joint)}
                    disabled={isTracking}
                    data-testid={`button-select-${joint}`}
                    className="flex-1 min-w-[120px]"
                  >
                    {JOINT_CONFIGS[joint].label}
                  </Button>
                ))}
              </div>
              {isSessionActive && (
                <Button
                  onClick={resetSession}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  data-testid="button-reset-session"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5" />
                  Camera Feed
                </CardTitle>
                <CardDescription>
                  {recordingPhase === 'idle' && 'Position your joint within the target circle'}
                  {recordingPhase === 'preparing_next_test' && `Next: ${nextTestRecommendation?.movementType || 'Preparing next test'}...`}
                  {recordingPhase === 'countdown' && 'Get ready...'}
                  {recordingPhase === 'recording' && `Performing: ${nextTestRecommendation?.instruction || JOINT_CONFIGS[selectedJoint].movementInstruction}`}
                  {recordingPhase === 'complete' && 'Recording complete - ready to analyze'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isTracking ? (
                  <Button
                    onClick={startTracking}
                    disabled={cameraStatus !== 'ready'}
                    data-testid="button-start-tracking"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={stopTracking}
                      variant="destructive"
                      data-testid="button-stop-tracking"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                    {isMobileDevice() && (
                      <Button
                        onClick={switchCamera}
                        variant="outline"
                        disabled={recordingPhase !== 'idle'}
                        data-testid="button-switch-camera"
                      >
                        <SwitchCamera className="h-4 w-4 mr-2" />
                        Switch
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cameraStatus === 'initializing' && (
              <Alert className="mb-4" data-testid="alert-initializing">
                <Activity className="h-4 w-4" />
                <AlertTitle>Initializing</AlertTitle>
                <AlertDescription>
                  Loading pose detection system...
                </AlertDescription>
              </Alert>
            )}
            
            {cameraStatus === 'error' && (
              <Alert variant="destructive" className="mb-4" data-testid="alert-error">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to initialize camera. Please check permissions and refresh.
                </AlertDescription>
              </Alert>
            )}

            {isTracking && recordingPhase === 'idle' && (
              <Alert 
                className="mb-4" 
                data-testid={isJointCentered ? 'alert-centered' : 'alert-not-centered'}
              >
                {isJointCentered ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">Ready to Record</AlertTitle>
                    <AlertDescription>
                      <div className="font-semibold mb-1">{JOINT_CONFIGS[selectedJoint].movementInstruction}</div>
                      <div className="text-sm">Starting in {centeredDuration >= 1.5 ? 'now!' : `${(1.5 - centeredDuration).toFixed(1)}s`}</div>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <AlertTitle>Position Yourself</AlertTitle>
                    <AlertDescription>
                      <div className="mb-1">Move your {JOINT_CONFIGS[selectedJoint].label.toLowerCase()} into the target circle</div>
                      <div className="text-sm font-semibold text-yellow-600">Then: {JOINT_CONFIGS[selectedJoint].movementInstruction}</div>
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            {recordingPhase === 'recording' && (
              <Alert className="mb-4 bg-red-50 border-red-200" data-testid="alert-recording">
                <Video className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-600">Recording Movement</AlertTitle>
                <AlertDescription>
                  {JOINT_CONFIGS[selectedJoint].movementInstruction}
                  <Progress value={recordingProgress} className="mt-2" />
                </AlertDescription>
              </Alert>
            )}

            {recordingPhase === 'complete' && !isAnalyzing && !analysisResult && (
              <Alert className="mb-4 bg-green-50 border-green-200" data-testid="alert-complete">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Recording Complete</AlertTitle>
                <AlertDescription>
                  Captured {movementData.length} frames. Analysis starting...
                </AlertDescription>
              </Alert>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4] max-w-5xl mx-auto">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover hidden"
                data-testid="video-feed"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                width={960}
                height={1280}
                data-testid="canvas-video"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                width={960}
                height={1280}
                data-testid="canvas-overlay"
              />
              
              {!isTracking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/80">
                    <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}
            </div>

            {isAnalyzing && (
              <div className="mt-4 flex gap-3 justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing movement...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isSessionActive && testHistory.length > 0 && (
          <div className="fixed right-4 top-24 w-80 z-50">
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Test History
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {testHistory.length} {testHistory.length === 1 ? 'Test' : 'Tests'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowTestHistory(!showTestHistory)}
                      data-testid="button-toggle-history"
                    >
                      {showTestHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {showTestHistory && (
                <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {testHistory.map((test, idx) => (
                    <div key={idx} className="bg-muted p-3 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">Test {idx + 1}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(test.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm">{test.movementType}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Range:</span>
                          <span className="ml-1 font-medium">{test.movementRange.toFixed(1)}°</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Smoothness:</span>
                          <span className="ml-1 font-medium">{test.smoothness.toFixed(2)}</span>
                        </div>
                      </div>
                      {test.compensations.length > 0 && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Compensations:</span>
                          <div className="mt-1 space-y-1">
                            {test.compensations.map((comp, i) => (
                              <Badge key={i} variant="secondary" className="text-xs mr-1">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {finalDiagnosis && isAssessmentComplete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      Final Diagnostic Report
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Comprehensive assessment of {JOINT_CONFIGS[selectedJoint].label} • {testHistory.length} tests performed
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFinalDiagnosis(null)}
                    data-testid="button-close-diagnosis"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Primary Diagnosis
                    </h3>
                    <Badge 
                      variant={finalDiagnosis.primaryDiagnosis.confidence === 'high' ? 'default' : 'secondary'}
                      className="text-sm"
                    >
                      {finalDiagnosis.primaryDiagnosis.confidence} confidence
                    </Badge>
                  </div>
                  <h4 className="text-xl font-bold">{finalDiagnosis.primaryDiagnosis.condition}</h4>
                  <p className="text-sm leading-relaxed">{finalDiagnosis.primaryDiagnosis.clinicalReasoning}</p>
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-2">Key Findings:</p>
                    <div className="space-y-1">
                      {finalDiagnosis.primaryDiagnosis.keyFindings.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {finalDiagnosis.differentialDiagnoses.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Differential Diagnoses</h3>
                    {finalDiagnosis.differentialDiagnoses.map((diff, idx) => (
                      <div key={idx} className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{diff.condition}</h4>
                          <Badge variant="outline">{diff.likelihood} likelihood</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          {diff.supportingEvidence.map((evidence, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{evidence}</span>
                            </div>
                          ))}
                        </div>
                        {diff.ruledOutBy && (
                          <p className="text-xs text-muted-foreground italic">
                            Ruled out by: {diff.ruledOutBy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-600" />
                    Clinical Reasoning Chain
                  </h3>
                  <div className="space-y-2">
                    {finalDiagnosis.clinicalReasoningChain.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded">
                        <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Treatment Recommendations
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-blue-600">Immediate Actions</h4>
                      <ul className="space-y-1">
                        {finalDiagnosis.treatmentRecommendations.immediateActions.map((action, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-green-600">Exercise Therapy</h4>
                      <ul className="space-y-1">
                        {finalDiagnosis.treatmentRecommendations.exercises.map((ex, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-purple-600">Manual Therapy</h4>
                      <ul className="space-y-1">
                        {finalDiagnosis.treatmentRecommendations.manualTherapy.map((mt, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                            {mt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-orange-600">Precautions</h4>
                      <ul className="space-y-1">
                        {finalDiagnosis.treatmentRecommendations.precautions.map((prec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
                            {prec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {finalDiagnosis.redFlags.length > 0 && (
                  <>
                    <Separator />
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Red Flags</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 space-y-1">
                          {finalDiagnosis.redFlags.map((flag, idx) => (
                            <li key={idx} className="text-sm">• {flag}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {finalDiagnosis.prognosticIndicators.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        Prognosis
                      </h3>
                      <ul className="space-y-1">
                        {finalDiagnosis.prognosticIndicators.map((indicator, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isSessionActive && clinicalReasoning && isAssessmentComplete && (
          <div className="fixed left-4 top-24 w-96 z-50">
            <Card className="shadow-lg border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-600" />
                    Clinical Thinking
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Reasoning
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowClinicalThinking(!showClinicalThinking)}
                      data-testid="button-toggle-clinical-thinking"
                    >
                      {showClinicalThinking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showClinicalThinking && (
                <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-purple-600">Clinical Reasoning</h3>
                  <p className="text-xs leading-relaxed whitespace-pre-line bg-muted p-3 rounded">
                    {clinicalReasoning}
                  </p>
                </div>
                
                {currentHypotheses.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-purple-600">Current Hypotheses</h3>
                      {currentHypotheses.map((hyp, idx) => (
                        <div key={idx} className="bg-muted p-3 rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs">{hyp.diagnosis}</span>
                            <Badge 
                              variant={hyp.likelihood === 'high' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {hyp.likelihood}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {hyp.supportingEvidence.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {nextTestRecommendation && !isAssessmentComplete && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-green-600">Next Test</h3>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded space-y-1">
                        <p className="font-medium text-xs">{nextTestRecommendation.instruction}</p>
                        <p className="text-xs text-muted-foreground">
                          {nextTestRecommendation.rationale}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                
                {isAssessmentComplete && (
                  <>
                    <Separator />
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm">Assessment Complete</AlertTitle>
                      <AlertDescription className="text-xs">
                        {completionReason}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
              )}
            </Card>
          </div>
        )}

        {analysisResult && (
          <div 
            className={`fixed ${isPanelCollapsed ? 'right-0 top-20' : 'right-4 top-20'} 
                       ${isPanelCollapsed ? 'w-12' : 'w-96'} 
                       transition-all duration-300 ease-in-out z-50 max-h-[calc(100vh-6rem)] overflow-hidden`}
            data-testid="card-analysis-results"
          >
            <Card className="shadow-2xl border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {!isPanelCollapsed && (
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" />
                      Analysis Results
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                      data-testid="button-toggle-panel"
                    >
                      {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAnalysisResult(null)}
                      data-testid="button-close-panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!isPanelCollapsed && (
                  <CardDescription className="text-xs">
                    {JOINT_CONFIGS[analysisResult.jointType].label} • {analysisResult.timestamp.toLocaleTimeString()}
                  </CardDescription>
                )}
              </CardHeader>
              
              {!isPanelCollapsed && (
                <CardContent className="space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)] pb-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RotateCw className="h-3.5 w-3.5 text-blue-600" />
                        <h3 className="font-semibold text-sm">Movement Range</h3>
                      </div>
                      <div className="space-y-1" data-testid="text-movement-range">
                        <p className="text-xl font-bold text-blue-600">
                          {analysisResult.movementMetrics.totalRange.toFixed(1)}°
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {analysisResult.movementRange.min.toFixed(1)}° - {analysisResult.movementRange.max.toFixed(1)}°
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                        <h3 className="font-semibold text-sm">Smoothness</h3>
                      </div>
                      <div className="space-y-2" data-testid="text-smoothness">
                        <p className="text-xl font-bold text-purple-600">
                          {analysisResult.movementMetrics.smoothness.toFixed(2)}
                        </p>
                        <Badge variant={analysisResult.movementMetrics.smoothness < 2 ? 'default' : 'secondary'} className="text-xs">
                          {analysisResult.movementMetrics.smoothness < 2 ? 'Smooth' : 
                           analysisResult.movementMetrics.smoothness < 4 ? 'Moderate' : 'Jerky'}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-3.5 w-3.5 text-green-600" />
                        <h3 className="font-semibold text-sm">Compensations</h3>
                      </div>
                      <div className="space-y-2" data-testid="text-compensations">
                        <p className="text-xl font-bold text-green-600">
                          {analysisResult.movementMetrics.compensations.length}
                        </p>
                        {analysisResult.movementMetrics.compensations.length > 0 ? (
                          <div className="space-y-1">
                            {analysisResult.movementMetrics.compensations.map((comp, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs block w-full py-1.5">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="default" className="bg-green-600 text-xs">No Compensations</Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-orange-600" />
                        <h3 className="font-semibold text-sm">AI Interpretation</h3>
                        <Badge variant="outline" className="ml-auto text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted rounded-lg" data-testid="text-clinical-interpretation">
                        <p className="text-xs leading-relaxed whitespace-pre-line">
                          {analysisResult.clinicalInterpretation}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
