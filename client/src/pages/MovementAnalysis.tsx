import { useState, useRef, useEffect, useCallback } from 'react';
import { MEDIAPIPE_CONFIG, checkMediaPipeSupport, requestCameraPermission } from '@/config/mediapipe';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';
import { FrameworkAnalysisPanel } from '@/components/movement/FrameworkAnalysisPanel';
import { biomechanicalAnalyzer, type BiomechanicalMetrics, type TreatmentPlan } from '@/utils/biomechanicalAnalysis';

// MediaPipe types (will be loaded dynamically)
type Pose = any;
type Camera = any;
type POSE_CONNECTIONS = any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Activity, 
  Camera as CameraIcon, 
  Play, 
  Pause, 
  StopCircle, 
  Download, 
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  Clock,
  FileText,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Info,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import {
  analyzeMovementQuality,
  calculateAllJointAngles,
  detectKneeValgus,
  detectTrendelenburg,
  calculateTrunkLean,
  calculatePelvicTilt,
  type JointAngle,
  type MovementMetrics
} from '@/utils/biomechanics';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import {
  analyzeRunningMechanics,
  detectRunningImpairments,
  generateRunningRecommendations,
  resetRunningAnalysis,
  type RunningMetrics
} from '@/utils/runningBiomechanics';
import type { 
  MovementSession, 
  JointMeasurement,
  MovementImpairment,
  InsertMovementSession 
} from '@shared/movementAnalysisSchema';
import { 
  analyzeWalkingGait, 
  analyzeRunningGait, 
  analyzeStepUp, 
  analyzeStepDown,
  analyzeSingleLegSquat,
  analyzeDoubleSquat,
  analyzeShoulderFlexion,
  generateRecommendations,
  calculateRiskScore,
  type MovementTestResult,
  type GaitMetrics,
  type RunningGaitMetrics,
  type StepAnalysisMetrics,
  type SquatAnalysisMetrics,
  type ShoulderFlexionMetrics
} from '@/utils/specializedMovementAnalysis';
import { 
  getTestConfig,
  getRelevantJoints,
  getCameraInstructions,
  isAngleNormal,
  getAngleSeverity
} from '@/utils/testSpecificConfigs';

interface AssessmentTest {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  instructions: string[];
  keyPoints: string[];
}

const ASSESSMENT_TESTS: AssessmentTest[] = [
  {
    id: 'general',
    name: 'General Movement',
    description: 'Basic movement quality assessment',
    duration: 60,
    instructions: [
      'Perform various movements naturally',
      'Include reaching, bending, rotating',
      'Move at comfortable pace',
      'Continue for full duration'
    ],
    keyPoints: [
      'Movement quality',
      'Range of motion',
      'Symmetry assessment',
      'Balance control',
      'Coordination patterns'
    ]
  },
  {
    id: 'walking-gait',
    name: 'Walking Gait Analysis',
    description: 'Comprehensive walking pattern assessment',
    duration: 60,
    instructions: [
      'Walk naturally back and forth',
      'Maintain normal walking pace',
      'Look straight ahead',
      'Continue for full duration'
    ],
    keyPoints: [
      'Stance/swing phase ratio (60/40)',
      'Step length symmetry',
      'Pelvic stability (Trendelenburg)',
      'Trunk lean assessment',
      'Arm swing coordination'
    ]
  },
  {
    id: 'running-gait',
    name: 'Running Gait Analysis',
    description: 'Running biomechanics and injury risk assessment',
    duration: 90,
    instructions: [
      'Run at comfortable pace (treadmill or in place)',
      'Maintain consistent speed',
      'Natural arm swing',
      'Continue for full assessment'
    ],
    keyPoints: [
      'Cadence (170-180 spm optimal)',
      'Foot strike pattern',
      'Vertical oscillation (<10cm)',
      'Knee valgus assessment',
      'Overstride detection'
    ]
  },
  {
    id: 'step-up',
    name: 'Step Up Test',
    description: 'Assess quadriceps strength and hip control',
    duration: 45,
    instructions: [
      'Step up onto box/step (knee height)',
      'Lead with right leg for 5 reps',
      'Switch to left leg for 5 reps',
      'Control movement up and down'
    ],
    keyPoints: [
      'Knee alignment over toe',
      'Pelvic drop/stability',
      'Trunk compensation',
      'Movement strategy (hip vs knee)'
    ]
  },
  {
    id: 'step-down',
    name: 'Step Down Test',
    description: 'Eccentric control and patellofemoral assessment',
    duration: 45,
    instructions: [
      'Stand on box/step',
      'Slowly lower one leg to tap floor',
      'Return to start position',
      'Perform 5 reps each leg'
    ],
    keyPoints: [
      'Eccentric control quality',
      'Knee valgus/varus',
      'Trendelenburg sign',
      'Speed of descent'
    ]
  },
  {
    id: 'single-leg-squat',
    name: 'Single Leg Squat',
    description: 'Unilateral strength and neuromuscular control',
    duration: 30,
    instructions: [
      'Stand on one leg',
      'Squat to 60-90° knee flexion',
      'Hold for 2 seconds',
      'Return to standing',
      'Perform 5 reps each leg'
    ],
    keyPoints: [
      'Depth achieved',
      'Knee valgus angle',
      'Pelvic control',
      'Balance maintenance',
      'Trunk alignment'
    ]
  },
  {
    id: 'double-leg-squat',
    name: 'Double Leg Squat',
    description: 'Bilateral squat pattern and mobility assessment',
    duration: 30,
    instructions: [
      'Stand feet shoulder-width apart',
      'Squat as deep as comfortable',
      'Hold for 2 seconds',
      'Return to standing',
      'Repeat 5 times'
    ],
    keyPoints: [
      'Depth (full/parallel/partial)',
      'Knee tracking',
      'Spine neutrality',
      'Weight distribution',
      'Heel contact'
    ]
  },
  {
    id: 'shoulder-flexion',
    name: 'Shoulder Flexion (Scapular)',
    description: 'Shoulder mobility and scapular dyskinesis detection',
    duration: 30,
    instructions: [
      'Raise both arms overhead slowly',
      'Reach maximum comfortable height',
      'Lower arms slowly',
      'Repeat 5 times',
      'Palms facing forward'
    ],
    keyPoints: [
      'Scapulohumeral rhythm (2:1)',
      'Scapular winging detection',
      'Early elevation sign',
      'Painful arc (60-120°)',
      'Left/right asymmetry'
    ]
  },
  {
    id: 'lunge',
    name: 'Lunge Assessment',
    description: 'Dynamic lower limb control and stability',
    duration: 45,
    instructions: [
      'Step forward into lunge position',
      'Lower back knee toward floor',
      'Push back to start',
      'Alternate legs for 10 reps'
    ],
    keyPoints: [
      'Knee over toe alignment',
      'Trunk stability',
      'Dynamic valgus',
      'Depth consistency',
      'Balance control'
    ]
  },
  {
    id: 'balance',
    name: 'Single Leg Balance',
    description: 'Static balance and proprioception',
    duration: 60,
    instructions: [
      'Stand on one leg for 30 seconds',
      'Keep hands on hips if possible',
      'Switch legs and repeat',
      'Note compensation patterns'
    ],
    keyPoints: [
      'Time maintained',
      'Sway velocity',
      'Ankle strategy',
      'Hip strategy',
      'Arm compensation'
    ]
  }
];

// iOS detection helper
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export default function MovementAnalysis() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AssessmentTest | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<MovementMetrics | null>(null);
  const [runningMetrics, setRunningMetrics] = useState<RunningMetrics | null>(null);
  const [recordedData, setRecordedData] = useState<any[]>([]);
  const [impairments, setImpairments] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<'user' | 'environment'>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    gender: '',
    complaint: ''
  });
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'error' | 'permission-needed' | 'not-started'>('not-started');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showJointAngles, setShowJointAngles] = useState(true);
  const [showAngleControls, setShowAngleControls] = useState(false);
  const [visibleJoints, setVisibleJoints] = useState<{ [key: string]: boolean }>({
    'left_shoulder': true,
    'right_shoulder': true,
    'left_elbow': true,
    'right_elbow': true,
    'left_hip': true,
    'right_hip': true,
    'left_knee': true,
    'right_knee': true,
    'left_ankle': true,
    'right_ankle': true
  });
  const [specializedTestResult, setSpecializedTestResult] = useState<MovementTestResult | null>(null);
  const [specializedMetrics, setSpecializedMetrics] = useState<any>(null);
  const [showTestSelection, setShowTestSelection] = useState(true);
  const [currentPoseLandmarks, setCurrentPoseLandmarks] = useState<any>(null);
  
  // Video recording state
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingStatus, setVideoRecordingStatus] = useState<'idle' | 'recording' | 'stopping' | 'completed'>('idle');
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  
  // Biomechanical analysis state
  const [biomechanicalMetrics, setBiomechanicalMetrics] = useState<BiomechanicalMetrics | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [showBiomechanicalAnalysis, setShowBiomechanicalAnalysis] = useState(true);
  const [kneeValgusHistory, setKneeValgusHistory] = useState<number[]>([]);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number>();
  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const visibleJointsRef = useRef(visibleJoints);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Helper functions for calculating metrics
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const calculateLungeDepth = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    
    const leftDepth = Math.abs(leftHip.y - leftKnee.y) * 180;
    const rightDepth = Math.abs(rightHip.y - rightKnee.y) * 180;
    
    return Math.max(leftDepth, rightDepth);
  };

  const calculateSwayVelocity = (landmarks: any[]) => {
    const nose = landmarks[0];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const centerX = (leftHip.x + rightHip.x) / 2;
    const deviation = Math.abs(nose.x - centerX) * 10;
    
    return Math.min(deviation, 5);
  };

  const calculateCOMDeviation = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    const hipCenter = (leftHip.x + rightHip.x) / 2;
    const ankleCenter = (leftAnkle.x + rightAnkle.x) / 2;
    
    return Math.abs(hipCenter - ankleCenter) * 100;
  };

  const detectBalanceStrategy = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    const hipMovement = Math.abs(leftHip.x - rightHip.x);
    const ankleMovement = Math.abs(leftAnkle.x - rightAnkle.x);
    
    if (hipMovement > ankleMovement * 2) {
      return 'Hip strategy';
    }
    return 'Ankle strategy';
  };

  const calculateLandingForce = (landmarks: any[]) => {
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    const kneeFlexion = (leftKnee.y + rightKnee.y) / 2;
    const anklePosition = (leftAnkle.y + rightAnkle.y) / 2;
    
    const absorption = Math.abs(kneeFlexion - anklePosition);
    const force = absorption < 0.1 ? 4.5 : absorption < 0.2 ? 3.0 : 2.0;
    
    return force;
  };

  const calculateKneeFlexion = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    return 180 - Math.min(leftAngle, rightAngle);
  };

  const calculateReactiveStrengthIndex = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const hipHeight = (leftHip.y + rightHip.y) / 2;
    const jumpHeight = Math.max(0.5 - hipHeight, 0) * 100;
    const contactTime = 0.3; // Estimated
    
    return jumpHeight / contactTime / 10;
  };

  const calculateShoulderFlexion = (landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const leftAngle = calculateAngle(leftHip, leftShoulder, leftWrist);
    const rightAngle = calculateAngle(rightHip, rightShoulder, rightWrist);
    
    return Math.max(leftAngle, rightAngle);
  };

  const detectScapularWinging = (landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const shoulderDistance = Math.abs(leftShoulder.z - rightShoulder.z);
    return shoulderDistance > 0.05;
  };

  const calculateShoulderSymmetry = (landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightWrist = landmarks[16];
    
    const leftHeight = Math.abs(leftShoulder.y - leftWrist.y);
    const rightHeight = Math.abs(rightShoulder.y - rightWrist.y);
    
    const symmetry = (Math.min(leftHeight, rightHeight) / Math.max(leftHeight, rightHeight)) * 100;
    return Math.min(symmetry, 100);
  };

  const calculatePelvicTilt = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * 180 / Math.PI;
    const shoulderAngle = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180 / Math.PI;
    
    return hipAngle - shoulderAngle;
  };

  const detectRotationControl = (landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderRotation = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipRotation = Math.abs(leftHip.x - rightHip.x);
    
    return Math.abs(shoulderRotation - hipRotation) < 0.1;
  };

  const calculateTrunkLean = (landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const angle = Math.atan2(shoulderCenter.x - hipCenter.x, hipCenter.y - shoulderCenter.y) * 180 / Math.PI;
    return angle;
  };

  const detectKneeValgus = (landmarks: any[], side: 'left' | 'right') => {
    const hip = side === 'left' ? landmarks[23] : landmarks[24];
    const knee = side === 'left' ? landmarks[25] : landmarks[26];
    const ankle = side === 'left' ? landmarks[27] : landmarks[28];
    
    const hipToKnee = { x: knee.x - hip.x, y: knee.y - hip.y };
    const kneeToAnkle = { x: ankle.x - knee.x, y: ankle.y - knee.y };
    
    const dotProduct = hipToKnee.x * kneeToAnkle.x + hipToKnee.y * kneeToAnkle.y;
    const mag1 = Math.sqrt(hipToKnee.x ** 2 + hipToKnee.y ** 2);
    const mag2 = Math.sqrt(kneeToAnkle.x ** 2 + kneeToAnkle.y ** 2);
    
    const cosAngle = dotProduct / (mag1 * mag2);
    const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const angleDegrees = (angleRadians * 180) / Math.PI;
    
    const valgusAngle = 180 - angleDegrees;
    
    return {
      present: valgusAngle > 10,
      severity: valgusAngle > 20 ? 'severe' : valgusAngle > 15 ? 'moderate' : valgusAngle > 10 ? 'mild' : null,
      angle: valgusAngle
    };
  };

  const detectTrendelenburg = (landmarks: any[]) => {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const hipDifference = Math.abs(leftHip.y - rightHip.y);
    return hipDifference > 0.05;
  };
  
  // Update ref when visibleJoints state changes
  useEffect(() => {
    visibleJointsRef.current = visibleJoints;
  }, [visibleJoints]);

  // Function to switch cameras
  const switchCamera = async () => {
    if (isSwitchingCamera || !selectedTest) return;
    
    setIsSwitchingCamera(true);
    
    try {
      // Stop current camera
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      
      // Stop current pose detection
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      
      // Toggle camera
      const newCamera = selectedCamera === 'user' ? 'environment' : 'user';
      setSelectedCamera(newCamera);
      
      toast({
        title: "Camera Switching",
        description: `Switching to ${newCamera === 'user' ? 'front' : 'back'} camera...`,
        duration: 2000,
      });
      
      // Camera will be reinitialized by useEffect
    } catch (error) {
      console.error('[MovementAnalysis] Error switching camera:', error);
      toast({
        title: "Camera Switch Failed",
        description: "Could not switch camera. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Initialize MediaPipe Pose - only when a test is selected or camera changes
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !selectedTest) return;

    const initializeCamera = async () => {
      try {
        console.log('[MovementAnalysis] Starting camera initialization...');
        console.log('[MovementAnalysis] Browser:', navigator.userAgent);
        console.log('[MovementAnalysis] Protocol:', window.location.protocol);
        console.log('[MovementAnalysis] Hostname:', window.location.hostname);
        
        // Ensure MediaPipe libraries are loaded
        const librariesLoaded = await loadMediaPipeLibraries();
        if (!librariesLoaded) {
          console.error('[MovementAnalysis] Failed to load MediaPipe libraries');
          setCameraStatus('error');
          setErrorMessage('Failed to load pose detection libraries. Please refresh the page.');
          toast({
            title: "Loading Error",
            description: "Failed to load pose detection libraries. Please refresh the page.",
            variant: "destructive",
          });
          return;
        }
        
        // Check MediaPipe support
        const support = checkMediaPipeSupport();
        console.log('[MovementAnalysis] MediaPipe support check:', support);
        
        if (!support.supported) {
          console.error('[MovementAnalysis] MediaPipe not supported:', support.error);
          setCameraStatus('error');
          setErrorMessage(support.error || 'Your browser doesn\'t support pose detection.');
          toast({
            title: "Compatibility Error",
            description: support.error,
            variant: "destructive",
          });
          return;
        }

        // Request camera permission with better error handling
        setCameraStatus('permission-needed');
        console.log('[MovementAnalysis] Requesting camera permission...');
        
        try {
          await requestCameraPermission();
          console.log('[MovementAnalysis] Camera permission granted');
          setCameraStatus('initializing');
        } catch (permissionError: any) {
          console.error('[MovementAnalysis] Camera permission error:', permissionError);
          setCameraStatus('error');
          setErrorMessage(permissionError.message);
          toast({
            title: "Camera Permission Error",
            description: permissionError.message,
            variant: "destructive",
            duration: 6000,
          });
          return;
        }

        console.log('[MovementAnalysis] Initializing MediaPipe Pose...');
        
        // Try to load MediaPipe with error handling
        try {
          // Get constructors from window (loaded by MediaPipeLoader)
          const PoseConstructor = window.Pose;
          
          if (!PoseConstructor) {
            throw new Error('Pose constructor not available - MediaPipe libraries may not be loaded');
          }
          
          console.log('[MovementAnalysis] Using Pose constructor:', PoseConstructor);
          
          const pose = new PoseConstructor({
            locateFile: MEDIAPIPE_CONFIG.pose.locateFile
          });

          pose.setOptions(MEDIAPIPE_CONFIG.pose.options);
          pose.onResults(onPoseResults);
          poseRef.current = pose;
          console.log('[MovementAnalysis] MediaPipe Pose initialized successfully');
        } catch (poseError: any) {
          console.error('[MovementAnalysis] Failed to initialize Pose:', poseError);
          setCameraStatus('error');
          setErrorMessage('Failed to load pose detection. Please refresh the page.');
          toast({
            title: "Pose Detection Error",
            description: "Failed to load pose detection library. Please refresh and try again.",
            variant: "destructive",
          });
          return;
        }

        if (!videoRef.current) {
          console.error('[MovementAnalysis] Video element not found');
          setCameraStatus('error');
          setErrorMessage('Video element not initialized');
          return;
        }

        console.log('[MovementAnalysis] Creating Camera instance...');
        
        try {
          // Get Camera constructor from window (loaded by MediaPipeLoader)
          const CameraConstructor = window.Camera;
          
          if (!CameraConstructor) {
            throw new Error('Camera constructor not available - MediaPipe libraries may not be loaded');
          }
          
          console.log('[MovementAnalysis] Using Camera constructor:', CameraConstructor);
          
          const camera = new CameraConstructor(videoRef.current, {
            onFrame: async () => {
              if (poseRef.current && !isPaused && videoRef.current) {
                try {
                  await poseRef.current.send({ image: videoRef.current });
                } catch (err) {
                  console.error('[MovementAnalysis] Pose processing error:', err);
                }
              }
            },
            width: MEDIAPIPE_CONFIG.camera.width,
            height: MEDIAPIPE_CONFIG.camera.height,
            facingMode: selectedCamera
          });

          cameraRef.current = camera;
          console.log('[MovementAnalysis] Camera instance created, starting...');
          
          // Start camera with error handling and timeout
          const startPromise = camera.start();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Camera start timeout')), MEDIAPIPE_CONFIG.timeouts.cameraStart)
          );
          
          await Promise.race([startPromise, timeoutPromise]);
          setCameraStatus('ready');
          console.log('[MovementAnalysis] Camera started successfully');
          
          // Show success message only in production
          if (window.location.hostname !== 'localhost') {
            toast({
              title: "Camera Ready",
              description: "Movement analysis is ready to begin",
              duration: 3000,
            });
          }
        } catch (cameraCreateError: any) {
          console.error('[MovementAnalysis] Failed to create/start camera:', cameraCreateError);
          setCameraStatus('error');
          
          let errorMsg = 'Failed to initialize camera. ';
          if (cameraCreateError.message?.includes('timeout')) {
            errorMsg += 'Camera took too long to initialize. Please refresh the page.';
          } else if (cameraCreateError.message?.includes('permission')) {
            errorMsg += 'Camera permission denied. Please allow camera access in your browser settings.';
          } else if (cameraCreateError.message?.includes('NotFound')) {
            errorMsg += 'No camera device found. Please connect a camera.';
          } else if (cameraCreateError.message?.includes('NotAllowed')) {
            errorMsg += 'Camera access blocked. Please check browser permissions.';
          } else {
            errorMsg += `Error: ${cameraCreateError.message || 'Unknown error'}. Please refresh and try again.`;
          }
          
          setErrorMessage(errorMsg);
          toast({
            title: "Camera Error",
            description: errorMsg,
            variant: "destructive",
            duration: 6000,
          });
        }

      } catch (error: any) {
        console.error('[MovementAnalysis] Overall initialization error:', error);
        setCameraStatus('error');
        setErrorMessage(`Initialization failed: ${error.message || 'Unknown error'}`);
        toast({
          title: "Initialization Error",
          description: `Failed to initialize movement analysis: ${error.message || 'Unknown error'}. Please refresh and try again.`,
          variant: "destructive",
        });
      }
    };

    // Add a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      initializeCamera();
    }, 100);

    return () => {
      clearTimeout(initTimer);
    };

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, selectedTest, selectedCamera]);

  // Process pose detection results
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Draw pose landmarks and connections
    if (results.poseLandmarks) {
      // Store current landmarks for framework analysis
      setCurrentPoseLandmarks(results.poseLandmarks);
      
      // Use drawing functions from window (loaded by MediaPipeLoader)
      if (window.drawConnectors && window.POSE_CONNECTIONS) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
      }
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        });
      }
      
      // Draw test-specific visual guides
      const config = getTestConfig(selectedTest?.id || '');
      if (config && config.visualGuides) {
        // Draw knee tracking line for squat tests
        if (config.visualGuides.kneeTrackingLine) {
          const leftKnee = results.poseLandmarks[25];
          const leftAnkle = results.poseLandmarks[27];
          const rightKnee = results.poseLandmarks[26];
          const rightAnkle = results.poseLandmarks[28];
          
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          // Left leg tracking line
          if (leftKnee && leftAnkle) {
            ctx.beginPath();
            ctx.moveTo(leftKnee.x * canvas.width, leftKnee.y * canvas.height);
            ctx.lineTo(leftAnkle.x * canvas.width, leftAnkle.y * canvas.height);
            ctx.stroke();
          }
          
          // Right leg tracking line
          if (rightKnee && rightAnkle) {
            ctx.beginPath();
            ctx.moveTo(rightKnee.x * canvas.width, rightKnee.y * canvas.height);
            ctx.lineTo(rightAnkle.x * canvas.width, rightAnkle.y * canvas.height);
            ctx.stroke();
          }
          
          ctx.setLineDash([]);
        }
        
        // Draw ROM arcs for shoulder flexion
        if (config.visualGuides.romArcs && selectedTest?.id === 'shoulder-flexion') {
          const leftShoulder = results.poseLandmarks[11];
          const rightShoulder = results.poseLandmarks[12];
          
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
          ctx.lineWidth = 3;
          
          // Draw ROM arc for left shoulder
          if (leftShoulder) {
            const x = leftShoulder.x * canvas.width;
            const y = leftShoulder.y * canvas.height;
            const radius = 80;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, Math.PI, 0, false);
            ctx.stroke();
            
            // Draw normal range indicator
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, radius, Math.PI * 1.11, Math.PI * 0.11, false); // 160-180 degrees
            ctx.stroke();
          }
          
          // Draw ROM arc for right shoulder
          if (rightShoulder) {
            const x = rightShoulder.x * canvas.width;
            const y = rightShoulder.y * canvas.height;
            const radius = 80;
            
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(x, y, radius, Math.PI, 0, false);
            ctx.stroke();
            
            // Draw normal range indicator
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, radius, Math.PI * 1.11, Math.PI * 0.11, false);
            ctx.stroke();
          }
        }
        
        // Draw pelvic stability indicator
        if (config.visualGuides.pelvicStabilityIndicator) {
          const leftHip = results.poseLandmarks[23];
          const rightHip = results.poseLandmarks[24];
          
          if (leftHip && rightHip) {
            const leftY = leftHip.y * canvas.height;
            const rightY = rightHip.y * canvas.height;
            const difference = Math.abs(leftY - rightY);
            
            // Draw horizontal line between hips
            ctx.strokeStyle = difference < 10 ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(leftHip.x * canvas.width, leftY);
            ctx.lineTo(rightHip.x * canvas.width, rightY);
            ctx.stroke();
            
            // Draw level indicator
            if (difference > 10) {
              ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
              ctx.font = 'bold 12px Arial';
              const midX = (leftHip.x + rightHip.x) / 2 * canvas.width;
              const midY = (leftY + rightY) / 2;
              ctx.fillText(`Drop: ${difference.toFixed(0)}px`, midX - 30, midY - 10);
            }
          }
        }
      }

      // Perform biomechanical analysis for knee valgus detection
      const bioMetrics = biomechanicalAnalyzer.analyzePose(results.poseLandmarks);
      setBiomechanicalMetrics(bioMetrics);
      
      // Track knee valgus history for trending
      if (bioMetrics.kneeValgus.severity !== 'normal') {
        const maxValgus = Math.max(bioMetrics.kneeValgus.left, bioMetrics.kneeValgus.right);
        setKneeValgusHistory(prev => [...prev.slice(-29), maxValgus]); // Keep last 30 values
      }
      
      // Generate treatment plan if issues detected
      if (bioMetrics.kneeValgus.severity !== 'normal' && !treatmentPlan) {
        const plan = biomechanicalAnalyzer.generateTreatmentPlan(bioMetrics);
        setTreatmentPlan(plan);
      }
      
      // Analyze movement based on selected test
      let detectedImpairments: string[] = [];
      let metrics: MovementMetrics | null = null;
      let specializedMetrics: any = null;
      let testResult: MovementTestResult | null = null;
      
      // Run specialized analysis based on selected test
      switch (selectedTest?.id) {
        case 'walking-gait':
          specializedMetrics = analyzeWalkingGait(results.poseLandmarks);
          detectedImpairments = specializedMetrics.deviations || [];
          testResult = {
            testType: 'walking_gait',
            timestamp: Date.now(),
            metrics: specializedMetrics,
            score: 100 - (detectedImpairments.length * 10),
            risk: detectedImpairments.length > 3 ? 'high' : detectedImpairments.length > 1 ? 'moderate' : 'low',
            recommendations: []
          };
          if (detectedImpairments.length > 0) {
            testResult.recommendations.push('Consider gait retraining exercises');
            testResult.recommendations.push('Focus on hip stabilization');
          }
          break;
          
        case 'running-gait':
          specializedMetrics = analyzeRunningGait(results.poseLandmarks);
          detectedImpairments = [];
          if (specializedMetrics.excessiveKneeValgus) detectedImpairments.push('Excessive knee valgus');
          if (specializedMetrics.overstride) detectedImpairments.push('Overstriding detected');
          if (!specializedMetrics.cadenceOptimal) detectedImpairments.push('Suboptimal cadence');
          if (specializedMetrics.crossoverGait) detectedImpairments.push('Crossover gait pattern');
          testResult = {
            testType: 'running_gait',
            timestamp: Date.now(),
            metrics: specializedMetrics,
            score: 100 - (detectedImpairments.length * 15),
            risk: detectedImpairments.length > 2 ? 'high' : detectedImpairments.length > 0 ? 'moderate' : 'low',
            recommendations: []
          };
          if (specializedMetrics.overstride) {
            testResult.recommendations.push('Increase cadence to reduce overstriding');
          }
          if (specializedMetrics.excessiveKneeValgus) {
            testResult.recommendations.push('Strengthen hip abductors and external rotators');
          }
          setRunningMetrics(analyzeRunningMechanics(results.poseLandmarks));
          break;
          
        case 'step-up':
          specializedMetrics = analyzeStepUp(results.poseLandmarks);
          detectedImpairments = specializedMetrics.compensations || [];
          break;
          
        case 'step-down':
          specializedMetrics = analyzeStepDown(results.poseLandmarks);
          detectedImpairments = specializedMetrics.compensations || [];
          break;
          
        case 'single-leg-squat':
          specializedMetrics = analyzeSingleLegSquat(results.poseLandmarks);
          if (specializedMetrics.qualityScore < 60) {
            detectedImpairments.push('Poor movement quality');
          }
          if (Math.abs(specializedMetrics.kneeValgusAngle.left) > 10 || 
              Math.abs(specializedMetrics.kneeValgusAngle.right) > 10) {
            detectedImpairments.push('Excessive knee valgus');
          }
          testResult = {
            testType: 'single_leg_squat',
            timestamp: Date.now(),
            metrics: specializedMetrics,
            score: specializedMetrics.qualityScore,
            risk: specializedMetrics.qualityScore < 50 ? 'high' : specializedMetrics.qualityScore < 75 ? 'moderate' : 'low',
            recommendations: []
          };
          if (detectedImpairments.includes('Excessive knee valgus')) {
            testResult.recommendations.push('Focus on glute strengthening');
            testResult.recommendations.push('Practice single-leg balance exercises');
          }
          break;
          
        case 'double-leg-squat':
          specializedMetrics = analyzeDoubleSquat(results.poseLandmarks);
          if (specializedMetrics.qualityScore < 60) {
            detectedImpairments.push('Poor squat quality');
          }
          if (!specializedMetrics.spineNeutral) {
            detectedImpairments.push('Loss of spine neutrality');
          }
          break;
          
        case 'shoulder-flexion':
          specializedMetrics = analyzeShoulderFlexion(results.poseLandmarks);
          detectedImpairments = specializedMetrics.compensations || [];
          testResult = {
            testType: 'shoulder_flexion',
            timestamp: Date.now(),
            metrics: specializedMetrics,
            score: 100 - (detectedImpairments.length * 20),
            risk: detectedImpairments.length > 2 ? 'moderate' : 'low',
            recommendations: []
          };
          if (specializedMetrics.hasScapularDyskinesis) {
            testResult.recommendations.push('Focus on scapular stabilization exercises');
          }
          if (detectedImpairments.includes('Early elevation')) {
            testResult.recommendations.push('Improve thoracic mobility');
          }
          break;

        case 'lunge-assessment':
          // Create lunge metrics for live cards
          metrics = analyzeMovementQuality(results.poseLandmarks);
          const lungeMetrics = {
            hipDrop: Math.abs(results.poseLandmarks[23].y - results.poseLandmarks[24].y) * 100,
            kneeValgus: detectKneeValgus(results.poseLandmarks, 'left').present ? 15 : 5,
            trunkLean: Math.abs(calculateTrunkLean(results.poseLandmarks)),
            depth: calculateLungeDepth(results.poseLandmarks)
          };
          setCurrentMetrics({ ...metrics, lungeMetrics });
          break;

        case 'standing-balance':
          // Create balance metrics for live cards
          metrics = analyzeMovementQuality(results.poseLandmarks);
          const balanceMetrics = {
            swayVelocity: calculateSwayVelocity(results.poseLandmarks),
            comDeviation: calculateCOMDeviation(results.poseLandmarks),
            timeToStabilize: elapsedTime < 3 ? elapsedTime : 2.5,
            strategy: detectBalanceStrategy(results.poseLandmarks)
          };
          setCurrentMetrics({ ...metrics, balance: balanceMetrics });
          break;

        case 'drop-jump':
          // Create drop jump metrics for live cards
          metrics = analyzeMovementQuality(results.poseLandmarks);
          const dropJumpMetrics = {
            landingForce: calculateLandingForce(results.poseLandmarks),
            kneeFlexion: calculateKneeFlexion(results.poseLandmarks),
            valgusAngle: Math.max(
              Math.abs(detectKneeValgus(results.poseLandmarks, 'left').angle || 0),
              Math.abs(detectKneeValgus(results.poseLandmarks, 'right').angle || 0)
            ),
            rsi: calculateReactiveStrengthIndex(results.poseLandmarks)
          };
          setCurrentMetrics({ ...metrics, dropJump: dropJumpMetrics });
          break;

        case 'shoulder-screen':
          // Create shoulder metrics for live cards
          metrics = analyzeMovementQuality(results.poseLandmarks);
          const shoulderMetrics = {
            flexion: calculateShoulderFlexion(results.poseLandmarks),
            scapularWinging: detectScapularWinging(results.poseLandmarks),
            painfulArc: false, // Would need user input
            symmetry: calculateShoulderSymmetry(results.poseLandmarks)
          };
          setCurrentMetrics({ ...metrics, shoulder: shoulderMetrics });
          break;

        case 'core-stability':
          // Create core metrics for live cards
          metrics = analyzeMovementQuality(results.poseLandmarks);
          const coreMetrics = {
            plankTime: isRecording ? elapsedTime : 0,
            pelvicTilt: calculatePelvicTilt(results.poseLandmarks),
            rotationControl: detectRotationControl(results.poseLandmarks),
            breathingPattern: 'Diaphragmatic' // Would need more analysis
          };
          setCurrentMetrics({ ...metrics, core: coreMetrics });
          break;
          
        default:
          // Fall back to general analysis for other tests
          metrics = analyzeMovementQuality(results.poseLandmarks);
          setCurrentMetrics(metrics);
          break;
      }
      
      // Always calculate general metrics for display
      if (!metrics) {
        metrics = analyzeMovementQuality(results.poseLandmarks);
        setCurrentMetrics(metrics);
      }
      
      // Add general impairment detection if no specialized analysis was done
      if (!specializedMetrics) {
        // Check for knee valgus
        const leftKneeValgus = detectKneeValgus(results.poseLandmarks, 'left');
        const rightKneeValgus = detectKneeValgus(results.poseLandmarks, 'right');
        
        if (leftKneeValgus.present) {
          detectedImpairments.push(`Left knee valgus (${leftKneeValgus.severity})`);
        }
        if (rightKneeValgus.present) {
          detectedImpairments.push(`Right knee valgus (${rightKneeValgus.severity})`);
        }

        // Check for Trendelenburg
        if (detectTrendelenburg(results.poseLandmarks)) {
          detectedImpairments.push('Trendelenburg sign detected');
        }

        // Check trunk lean
        const trunkLean = calculateTrunkLean(results.poseLandmarks);
        if (Math.abs(trunkLean) > 10) {
          detectedImpairments.push(`Excessive trunk lean (${trunkLean.toFixed(1)}°)`);
        }
      }

      // Update state
      setImpairments(detectedImpairments);
      if (specializedMetrics) {
        setSpecializedMetrics(specializedMetrics);
      }
      if (testResult) {
        setSpecializedTestResult(testResult);
      }

      // Record data if recording
      if (isRecording && !isPaused && metrics) {
        const timestamp = Date.now() - (sessionStartTime || Date.now());
        setRecordedData(prev => [...prev, {
          timestamp,
          landmarks: results.poseLandmarks,
          metrics,
          impairments: detectedImpairments
        }]);
      }

      // Draw joint angles directly on joints (if enabled)
      if (showJointAngles && metrics && results.poseLandmarks) {
        // Map joint names to landmark indices for MediaPipe
        const jointToLandmark: { [key: string]: number } = {
          'left_shoulder': 11,
          'right_shoulder': 12,
          'left_elbow': 13,
          'right_elbow': 14,
          'left_hip': 23,
          'right_hip': 24,
          'left_knee': 25,
          'right_knee': 26,
          'left_ankle': 27,
          'right_ankle': 28
        };

        // Configure text styling for larger display
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        metrics.jointAngles.forEach((angle: JointAngle) => {
          const landmarkIndex = jointToLandmark[angle.joint];
          // Only show angle if this joint is selected to be visible
          if (landmarkIndex !== undefined && results.poseLandmarks[landmarkIndex] && visibleJointsRef.current[angle.joint]) {
            const landmark = results.poseLandmarks[landmarkIndex];
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            // Increased offset for larger circles
            const offsetX = angle.joint.includes('left') ? -55 : 55;
            const offsetY = -35;
            const displayX = x + offsetX;
            const displayY = y + offsetY;

            // Prepare text and circle dimensions
            const text = `${angle.angle.toFixed(0)}°`;
            const circleRadius = 28; // Large circle radius
            
            // Draw outer white border circle for contrast
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(displayX, displayY, circleRadius + 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw shadow/glow effect
            ctx.shadowColor = angle.isWithinNormal ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            
            // Draw main colored circle
            if (angle.isWithinNormal) {
              // Green gradient for normal angles
              const gradient = ctx.createRadialGradient(displayX, displayY, 0, displayX, displayY, circleRadius);
              gradient.addColorStop(0, 'rgba(74, 222, 128, 1)');
              gradient.addColorStop(1, 'rgba(34, 197, 94, 1)');
              ctx.fillStyle = gradient;
            } else {
              // Red gradient for concerning angles
              const gradient = ctx.createRadialGradient(displayX, displayY, 0, displayX, displayY, circleRadius);
              gradient.addColorStop(0, 'rgba(248, 113, 113, 1)');
              gradient.addColorStop(1, 'rgba(239, 68, 68, 1)');
              ctx.fillStyle = gradient;
            }
            
            ctx.beginPath();
            ctx.arc(displayX, displayY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset shadow for text
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Draw angle text in white with black outline for maximum contrast
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(text, displayX, displayY);
            ctx.fillStyle = 'white';
            ctx.fillText(text, displayX, displayY);
            
            // Draw connecting line from joint to circle
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]); // Dashed line
            ctx.beginPath();
            
            // Calculate line endpoints (from edge of joint dot to edge of circle)
            const angle_rad = Math.atan2(displayY - y, displayX - x);
            const lineStartX = x + Math.cos(angle_rad) * 5; // 5px from joint center
            const lineEndX = displayX - Math.cos(angle_rad) * (circleRadius + 3);
            const lineStartY = y + Math.sin(angle_rad) * 5;
            const lineEndY = displayY - Math.sin(angle_rad) * (circleRadius + 3);
            
            ctx.moveTo(lineStartX, lineStartY);
            ctx.lineTo(lineEndX, lineEndY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
          }
        });

        // Also display angles in corner for reference (smaller, less intrusive)
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        
        let yOffset = 30;
        metrics.jointAngles.forEach((angle: JointAngle) => {
          if (!angle.isWithinNormal) {
            const text = `${angle.joint}: ${angle.angle.toFixed(1)}°`;
            ctx.strokeText(text, 10, yOffset);
            ctx.fillText(text, 10, yOffset);
            yOffset += 15;
          }
        });
      }
    }

    ctx.restore();
  }, [isRecording, isPaused, sessionStartTime, selectedTest, showJointAngles]);

  // Toggle fullscreen mode with iOS compatibility
  const toggleFullscreen = () => {
    // For iOS devices, always use the fallback method
    if (isIOS()) {
      setIsFullscreen(!isFullscreen);
      handleIOSFullscreen(!isFullscreen);
      return;
    }
    
    // Check if native fullscreen API is supported for non-iOS devices
    const fullscreenEnabled = document.fullscreenEnabled || 
                             (document as any).webkitFullscreenEnabled ||
                             (document as any).mozFullScreenEnabled ||
                             (document as any).msFullscreenEnabled;

    if (fullscreenEnabled && !isFullscreen && containerRef.current) {
      // Try native fullscreen API first (for desktop and Android)
      const elem = containerRef.current as any;
      const requestFullscreen = elem.requestFullscreen || 
                               elem.webkitRequestFullscreen || 
                               elem.mozRequestFullScreen || 
                               elem.msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(elem).then(() => {
          setIsFullscreen(true);
        }).catch((err: any) => {
          console.log('Fullscreen API not available, using iOS fallback');
          // iOS fallback - just maximize UI
          setIsFullscreen(true);
          handleIOSFullscreen(true);
        });
      } else {
        // No fullscreen API available (iOS)
        setIsFullscreen(true);
        handleIOSFullscreen(true);
      }
    } else if (isFullscreen) {
      // Exit fullscreen
      const exitFullscreen = (document as any).exitFullscreen || 
                            (document as any).webkitExitFullscreen || 
                            (document as any).mozCancelFullScreen || 
                            (document as any).msExitFullscreen;
      
      if (exitFullscreen && document.fullscreenElement) {
        exitFullscreen.call(document).then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
          handleIOSFullscreen(false);
        });
      } else {
        // iOS or no native fullscreen
        setIsFullscreen(false);
        handleIOSFullscreen(false);
      }
    }
  };

  // iOS-specific fullscreen handling
  const handleIOSFullscreen = (enterFullscreen: boolean) => {
    if (enterFullscreen) {
      // Hide Safari UI elements as much as possible
      window.scrollTo(0, 1);
      
      // Add meta tags for better iOS experience
      let viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Lock orientation if possible (works on some devices)
      if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
        (screen.orientation as any).lock('landscape').catch(() => {
          console.log('Orientation lock not supported');
        });
      }
    } else {
      // Restore normal viewport
      let viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      }
      
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      
      // Unlock orientation
      if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
        (screen.orientation as any).unlock();
      }
    }
  };

  // Listen for fullscreen changes and cleanup
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!(document.fullscreenElement || 
                                   (document as any).webkitFullscreenElement ||
                                   (document as any).mozFullScreenElement ||
                                   (document as any).msFullscreenElement);
      
      if (!isNativeFullscreen && isFullscreen) {
        // Native fullscreen exited, but we're still in iOS fullscreen mode
        // Keep the state as is for iOS
      } else {
        setIsFullscreen(isNativeFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Ensure iOS styles are cleaned up
      if (isFullscreen) {
        handleIOSFullscreen(false);
      }
    };
  }, [isFullscreen]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      recordingIntervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  // Video recording functions
  const startVideoRecording = async () => {
    if (!canvasRef.current) return;

    try {
      // Get the canvas stream that includes pose overlay
      const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
      
      // Set up MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2000000 // 2 Mbps for good quality
      };
      
      // Fallback to VP8 if VP9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }
      
      // Final fallback
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedVideoBlob(blob);
        setVideoRecordingStatus('completed');
        
        // Auto-download the video
        downloadVideo(blob);
      };

      mediaRecorder.start(100); // Record in 100ms chunks
      setIsVideoRecording(true);
      setVideoRecordingStatus('recording');
      
      toast({
        title: "Video Recording Started",
        description: "Recording movement analysis with pose overlay",
      });
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start video recording",
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && videoRecordingStatus === 'recording') {
      setVideoRecordingStatus('stopping');
      mediaRecorderRef.current.stop();
      setIsVideoRecording(false);
      
      toast({
        title: "Video Recording Stopped",
        description: "Processing and downloading video...",
      });
    }
  };

  const downloadVideo = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const filename = `movement-analysis-${timestamp[0]}-${timestamp[1].split('.')[0]}.webm`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Video Downloaded",
      description: `Saved as ${filename}`,
    });
  };

  const generateReport = () => {
    if (!selectedTest || recordedData.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const reportData = {
      testName: selectedTest.name,
      testType: selectedTest.id,
      patientInfo: patientInfo.name ? patientInfo : null,
      duration: elapsedTime,
      timestamp: new Date().toISOString(),
      metrics: currentMetrics,
      runningMetrics: runningMetrics,
      specializedMetrics: specializedMetrics,
      impairments: impairments,
      recordedDataSummary: {
        totalFrames: recordedData.length,
        avgConfidence: recordedData.reduce((acc, frame) => acc + (frame.confidence || 0), 0) / recordedData.length,
        keyFindings: extractKeyFindings()
      }
    };

    // Convert to JSON and download
    const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `movement-analysis-report-${timestamp[0]}-${timestamp[1].split('.')[0]}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Analysis Report Downloaded",
      description: `Report saved as ${filename}`,
    });
  };

  const extractKeyFindings = () => {
    const findings = [];
    
    if (currentMetrics) {
      if (currentMetrics.quality === 'poor' || currentMetrics.quality === 'fair') {
        findings.push("Below average movement quality detected");
      }
      if (currentMetrics.symmetry < 70) {
        findings.push("Significant asymmetry observed");
      }
      if (currentMetrics.stability < 60) {
        findings.push("Balance and stability concerns noted");
      }
    }

    if (runningMetrics) {
      if (runningMetrics.cadence < 160 || runningMetrics.cadence > 180) {
        findings.push(`Cadence outside optimal range: ${runningMetrics.cadence} steps/min`);
      }
      if (runningMetrics.verticalOscillation > 10) {
        findings.push(`High vertical oscillation: ${runningMetrics.verticalOscillation}cm`);
      }
    }

    if (impairments.length > 0) {
      findings.push(`Identified impairments: ${impairments.join(', ')}`);
    }

    return findings.length > 0 ? findings : ["No significant abnormalities detected"];
  };

  // Start recording (both data and video)
  const startRecording = () => {
    if (!selectedTest) return;
    
    setIsRecording(true);
    setIsPaused(false);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    setRecordedData([]);
    
    // Start video recording
    startVideoRecording();
    
    // Reset running analysis if starting a running test
    if (selectedTest?.id === 'running-gait') {
      resetRunningAnalysis();
      setRunningMetrics(null);
    }
    
    toast({
      title: "Recording Started",
      description: `Performing ${selectedTest?.name || 'test'}`,
    });
  };

  // Stop recording (both data and video)
  const stopRecording = async () => {
    setIsRecording(false);
    setIsPaused(false);
    
    // Stop video recording
    stopVideoRecording();
    
    // Don't save to database - user wants local files only
    // if (recordedData.length > 0) {
    //   await saveSession();
    // }
    
    // Generate and download analysis report
    if (recordedData.length > 0) {
      generateReport();
    }
    
    toast({
      title: "Recording Stopped",
      description: "Video and analysis report will be downloaded",
    });
  };

  // Pause/Resume recording
  const togglePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Recording Resumed" : "Recording Paused",
    });
  };

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      return await apiRequest('POST', '/api/movement-analysis/sessions', sessionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movement-analysis/sessions'] });
      toast({
        title: "Session Saved",
        description: "Movement analysis has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    }
  });

  // Save session data
  const saveSession = async () => {
    if (!patientInfo.name) {
      toast({
        title: "Patient Information Required",
        description: "Please enter patient name before saving",
        variant: "destructive",
      });
      return;
    }

    const sessionData = {
      patientName: patientInfo.name,
      patientAge: parseInt(patientInfo.age) || null,
      patientGender: patientInfo.gender || null,
      chiefComplaint: patientInfo.complaint || null,
      assessmentType: selectedTest?.id || 'general',
      duration: elapsedTime,
      overallQuality: currentMetrics?.quality || 'fair',
      measurements: recordedData,
      impairments: Array.from(new Set(recordedData.flatMap(d => d.impairments)))
    };

    await saveSessionMutation.mutateAsync(sessionData);
  };



  // Generate recommendations based on impairments
  const generateRecommendations = (impairments: string[]): string[] => {
    const recommendations: string[] = [];
    
    if (impairments.some(i => i.includes('knee valgus'))) {
      recommendations.push('Strengthen hip abductors and external rotators');
      recommendations.push('Practice single-leg balance exercises');
      recommendations.push('Focus on proper knee alignment during squats');
    }
    
    if (impairments.some(i => i.includes('Trendelenburg'))) {
      recommendations.push('Strengthen gluteus medius');
      recommendations.push('Perform side-lying hip abduction exercises');
      recommendations.push('Practice single-leg stance with mirror feedback');
    }
    
    if (impairments.some(i => i.includes('trunk lean'))) {
      recommendations.push('Core strengthening exercises');
      recommendations.push('Postural awareness training');
      recommendations.push('Balance and proprioception exercises');
    }
    
    return recommendations;
  };

  // Handler for test selection
  const handleTestSelection = (test: AssessmentTest) => {
    setSelectedTest(test);
    setShowTestSelection(false);
    setCameraStatus('initializing');
    
    // Get test-specific configuration
    const config = getTestConfig(test.id);
    if (config) {
      // Update visible joints based on test configuration
      setVisibleJoints(config.relevantJoints);
      
      // Show camera instructions
      toast({
        title: "Camera Setup Instructions",
        description: getCameraInstructions(test.id),
        duration: 6000,
      });
    } else {
      toast({
        title: "Test Selected",
        description: `Initializing camera for ${test.name}...`,
      });
    }
  };

  // Handler to go back to test selection
  const handleBackToTestSelection = () => {
    setSelectedTest(null);
    setShowTestSelection(true);
    setCameraStatus('not-started');
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    // Reset all test data
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    setRecordedData([]);
    setCurrentMetrics(null);
    setRunningMetrics(null);
    setSpecializedTestResult(null);
    setSpecializedMetrics(null);
  };

  // Test Selection Screen
  if (showTestSelection && !selectedTest) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Movement Analysis & Biomechanics</h1>
            </div>
          </div>
        </div>

        {/* Test Selection Cards */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Select Assessment Test</h2>
              <p className="text-gray-600">Choose a clinical assessment to analyze movement patterns and identify impairments</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ASSESSMENT_TESTS.map((test) => (
                <Card 
                  key={test.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-500"
                  onClick={() => handleTestSelection(test)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      {/* Icon based on test type */}
                      {test.id.includes('gait') && <Activity className="h-8 w-8 text-blue-600" />}
                      {test.id.includes('squat') && <TrendingDown className="h-8 w-8 text-green-600" />}
                      {test.id.includes('step') && <TrendingUp className="h-8 w-8 text-purple-600" />}
                      {test.id.includes('shoulder') && <RefreshCw className="h-8 w-8 text-orange-600" />}
                      {test.id === 'lunge' && <Activity className="h-8 w-8 text-indigo-600" />}
                      {test.id === 'balance' && <User className="h-8 w-8 text-pink-600" />}
                      {test.id === 'general' && <Activity className="h-8 w-8 text-gray-600" />}
                      <Badge variant="outline">{test.duration}s</Badge>
                    </div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{test.description}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Key Metrics:</p>
                        <div className="flex flex-wrap gap-1">
                          {test.keyPoints.slice(0, 3).map((point, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {point.split('(')[0].trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button className="w-full" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Start Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Select a test from the options above</li>
                <li>Allow camera access when prompted</li>
                <li>Position yourself so your full body is visible</li>
                <li>Follow the test instructions and movement patterns</li>
                <li>Review your results and clinical recommendations</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-50">
      {/* Header - Hide in fullscreen */}
      {!isFullscreen && (
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Movement Analysis & Biomechanics</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToTestSelection}
              >
                <Activity className="h-4 w-4 mr-2" />
                Change Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex ${isFullscreen ? 'p-0' : 'p-4'} gap-4 overflow-hidden ${isFullscreen ? 'bg-black' : ''}`}>
        {/* Left Panel - Video Feed */}
        <div className={`${isFullscreen ? 'flex-1' : 'w-2/3'} flex flex-col gap-2 h-full`}>
          <Card className={`flex-1 overflow-hidden ${isFullscreen ? 'border-0 rounded-none bg-black' : 'h-[90%]'}`}>
            {!isFullscreen && (
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CameraIcon className="h-5 w-5" />
                    Live Movement Capture
                  </CardTitle>
                  {isRecording && (
                    <Badge variant={isPaused ? "secondary" : "destructive"} className="animate-pulse">
                      {isPaused ? 'PAUSED' : 'RECORDING'} - {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            )}
            <CardContent className={`p-0 relative ${isFullscreen ? 'h-full' : 'h-full'}`}>
              <div className={`relative h-full w-full bg-gray-900 rounded-lg overflow-hidden`}>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover hidden"
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'}`}
                  width={1920}
                  height={1080}
                />
                
                {/* Camera Status Indicator */}
                {cameraStatus !== 'ready' && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg">
                    {cameraStatus === 'initializing' && (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Initializing camera...</span>
                      </div>
                    )}
                    {cameraStatus === 'permission-needed' && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Please allow camera access when prompted</span>
                      </div>
                    )}
                    {cameraStatus === 'error' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Camera access failed</span>
                        </div>
                        {errorMessage && (
                          <div className="text-sm text-yellow-400 font-medium">
                            {errorMessage}
                          </div>
                        )}
                        <div className="text-sm text-gray-300">
                          <p>Troubleshooting tips:</p>
                          <ul className="list-disc list-inside mt-1">
                            <li>Ensure you're using HTTPS (not HTTP)</li>
                            <li>Allow camera permissions in browser settings</li>
                            <li>Check if camera is being used by another app</li>
                            <li>Try refreshing the page</li>
                            <li>Try a different browser (Chrome/Edge recommended)</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
                  {/* Video Recording Status */}
                  {isVideoRecording && (
                    <div className="bg-red-600/90 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      {videoRecordingStatus === 'recording' && 'Recording Video'}
                      {videoRecordingStatus === 'stopping' && 'Processing Video...'}
                    </div>
                  )}
                  
                  {/* Recording Controls */}
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button onClick={startRecording} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <>
                        <Button onClick={togglePause} variant="secondary">
                          {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                          {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button onClick={stopRecording} variant="destructive">
                          <StopCircle className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Control Buttons - Top Right */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {/* Camera Switch Button - Only show on mobile devices */}
                    {(isIOS() || /Android/i.test(navigator.userAgent)) && (
                      <Button
                        onClick={switchCamera}
                        disabled={isSwitchingCamera || cameraStatus !== 'ready'}
                        className="bg-blue-600/70 hover:bg-blue-600/90 text-white"
                        size="sm"
                        title={`Switch to ${selectedCamera === 'user' ? 'back' : 'front'} camera`}
                      >
                        <CameraIcon className="h-4 w-4 mr-1" />
                        {selectedCamera === 'user' ? 'Front' : 'Back'}
                      </Button>
                    )}
                    
                    {/* Joint Angles Toggle */}
                    <Button
                      onClick={() => setShowJointAngles(!showJointAngles)}
                      className={`${showJointAngles ? 'bg-green-600/70 hover:bg-green-600/90' : 'bg-black/50 hover:bg-black/70'} text-white`}
                      size="sm"
                      title={showJointAngles ? "Hide Joint Angles" : "Show Joint Angles"}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {showJointAngles ? 'Angles ON' : 'Angles OFF'}
                    </Button>
                    
                    {/* Joint Selection Toggle */}
                    {showJointAngles && (
                      <Button
                        onClick={() => setShowAngleControls(!showAngleControls)}
                        className="bg-black/50 hover:bg-black/70 text-white"
                        size="sm"
                        title="Select which joints to display"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Select Joints
                      </Button>
                    )}
                    
                    {/* Fullscreen Toggle Button */}
                    <Button
                      onClick={toggleFullscreen}
                      className="bg-black/50 hover:bg-black/70 text-white"
                      size="sm"
                      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Joint Selection Panel */}
                  {showJointAngles && showAngleControls && (
                    <div className="bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg max-w-sm">
                      <div className="space-y-3">
                        <div className="text-sm font-semibold mb-2">Select Joints to Display</div>
                        
                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-600">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': true, 'right_shoulder': true,
                                'left_elbow': true, 'right_elbow': true,
                                'left_hip': false, 'right_hip': false,
                                'left_knee': false, 'right_knee': false,
                                'left_ankle': false, 'right_ankle': false
                              });
                            }}
                          >
                            Upper Body
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': false, 'right_shoulder': false,
                                'left_elbow': false, 'right_elbow': false,
                                'left_hip': true, 'right_hip': true,
                                'left_knee': true, 'right_knee': true,
                                'left_ankle': true, 'right_ankle': true
                              });
                            }}
                          >
                            Lower Body
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': true, 'right_shoulder': false,
                                'left_elbow': true, 'right_elbow': false,
                                'left_hip': true, 'right_hip': false,
                                'left_knee': true, 'right_knee': false,
                                'left_ankle': true, 'right_ankle': false
                              });
                            }}
                          >
                            Left Side
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': false, 'right_shoulder': true,
                                'left_elbow': false, 'right_elbow': true,
                                'left_hip': false, 'right_hip': true,
                                'left_knee': false, 'right_knee': true,
                                'left_ankle': false, 'right_ankle': true
                              });
                            }}
                          >
                            Right Side
                          </Button>
                        </div>
                        
                        {/* Individual Joint Checkboxes */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-300">Left Side</div>
                            {['shoulder', 'elbow', 'hip', 'knee', 'ankle'].map(joint => (
                              <label key={`left_${joint}`} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleJoints[`left_${joint}`]}
                                  onChange={(e) => setVisibleJoints(prev => ({
                                    ...prev,
                                    [`left_${joint}`]: e.target.checked
                                  }))}
                                  className="w-3 h-3"
                                />
                                <span className="capitalize">{joint}</span>
                              </label>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-300">Right Side</div>
                            {['shoulder', 'elbow', 'hip', 'knee', 'ankle'].map(joint => (
                              <label key={`right_${joint}`} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleJoints[`right_${joint}`]}
                                  onChange={(e) => setVisibleJoints(prev => ({
                                    ...prev,
                                    [`right_${joint}`]: e.target.checked
                                  }))}
                                  className="w-3 h-3"
                                />
                                <span className="capitalize">{joint}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Select/Clear All */}
                        <div className="flex gap-2 pt-2 border-t border-gray-600">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': true, 'right_shoulder': true,
                                'left_elbow': true, 'right_elbow': true,
                                'left_hip': true, 'right_hip': true,
                                'left_knee': true, 'right_knee': true,
                                'left_ankle': true, 'right_ankle': true
                              });
                            }}
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setVisibleJoints({
                                'left_shoulder': false, 'right_shoulder': false,
                                'left_elbow': false, 'right_elbow': false,
                                'left_hip': false, 'right_hip': false,
                                'left_knee': false, 'right_knee': false,
                                'left_ankle': false, 'right_ankle': false
                              });
                            }}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Recording Status in Fullscreen */}
                {isFullscreen && isRecording && (
                  <div className="absolute top-4 left-4">
                    <Badge variant={isPaused ? "secondary" : "destructive"} className="animate-pulse text-lg px-4 py-2">
                      {isPaused ? 'PAUSED' : 'RECORDING'} - {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assessment Selection - Compact for all tests */}
          {!isFullscreen && selectedTest && (
            <Card className="h-[10%]">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {selectedTest.name}
                  </Badge>
                  <span className="text-xs text-gray-600">
                    {selectedTest.instructions.join(' • ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Live Metric Cards for All Tests */}
        {!isFullscreen && selectedTest && (
          <div className="w-1/3 flex flex-col gap-3 overflow-y-auto">
            <h3 className="text-lg font-semibold">Live Analysis</h3>
            
            {/* Step Down Test Cards */}
            {selectedTest?.id === 'step-down' && (
              <>
            {/* Q-Angle Card */}
            <Card className={`transition-all duration-300 ${
              currentMetrics && currentMetrics.jointAngles.find(a => a.joint === 'left_knee' || a.joint === 'right_knee') 
                ? 'border-2 animate-pulse' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Q-ANGLE</span>
                  {currentMetrics && (() => {
                    const kneeAngle = currentMetrics.jointAngles.find(a => a.joint === 'left_knee' || a.joint === 'right_knee');
                    const qAngle = kneeAngle ? Math.abs(180 - kneeAngle.angle) : 0;
                    const isNormal = qAngle < 20;
                    return (
                      <Badge variant={isNormal ? 'default' : qAngle < 25 ? 'secondary' : 'destructive'}>
                        {isNormal ? '✓' : qAngle < 25 ? '⚠' : '✗'} {qAngle.toFixed(0)}°
                      </Badge>
                    );
                  })()}
                </div>
                <Progress 
                  value={currentMetrics ? Math.min(100, (20 / Math.abs(180 - (currentMetrics.jointAngles.find(a => a.joint === 'left_knee')?.angle || 180))) * 100) : 0} 
                  className="h-2 mb-2" 
                />
                <p className="text-xs text-gray-600">
                  {currentMetrics && Math.abs(180 - (currentMetrics.jointAngles.find(a => a.joint === 'left_knee')?.angle || 180)) > 20 
                    ? 'High patellofemoral stress' 
                    : 'Within normal range'}
                </p>
              </CardContent>
            </Card>

            {/* Patellar Tracking Card */}
            <Card className={`transition-all duration-300 ${
              biomechanicalMetrics?.kneeValgus?.severity !== 'normal' ? 'border-orange-400 border-2' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">PATELLAR TRACKING</span>
                  {biomechanicalMetrics?.kneeValgus && (
                    <Badge variant={
                      biomechanicalMetrics.kneeValgus.severity === 'normal' ? 'default' : 
                      biomechanicalMetrics.kneeValgus.severity === 'mild' ? 'secondary' : 'destructive'
                    }>
                      {biomechanicalMetrics.kneeValgus.severity === 'normal' ? '✓ CENTRAL' : 
                       biomechanicalMetrics.kneeValgus.severity === 'mild' ? '⚠ LATERAL' : '✗ DEVIATED'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span>L: {biomechanicalMetrics?.kneeValgus?.left ? biomechanicalMetrics.kneeValgus.left.toFixed(0) : 0}°</span>
                  <span>R: {biomechanicalMetrics?.kneeValgus?.right ? biomechanicalMetrics.kneeValgus.right.toFixed(0) : 0}°</span>
                </div>
                <p className="text-xs text-gray-600">
                  {biomechanicalMetrics?.kneeValgus?.severity !== 'normal' 
                    ? 'VMO strengthening needed' 
                    : 'Good neuromuscular control'}
                </p>
              </CardContent>
            </Card>

            {/* Trendelenburg Card */}
            <Card className={`transition-all duration-300 ${
              biomechanicalMetrics?.hipDrop?.side !== 'none' ? 'border-red-400 border-2 animate-pulse' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">TRENDELENBURG</span>
                  {biomechanicalMetrics?.hipDrop && (
                    <Badge variant={biomechanicalMetrics.hipDrop.side === 'none' ? 'default' : 'destructive'}>
                      {biomechanicalMetrics.hipDrop.side === 'none' ? '✓ NEGATIVE' : `✗ POSITIVE ${biomechanicalMetrics.hipDrop.side.toUpperCase()}`}
                    </Badge>
                  )}
                </div>
                <div className="text-center text-2xl font-bold mb-1">
                  {biomechanicalMetrics?.hipDrop?.angle ? biomechanicalMetrics.hipDrop.angle.toFixed(1) : '0.0'}°
                </div>
                <p className="text-xs text-gray-600">
                  {biomechanicalMetrics?.hipDrop?.side && biomechanicalMetrics.hipDrop.side !== 'none' 
                    ? `${biomechanicalMetrics.hipDrop.side} hip abductor weakness` 
                    : 'Good hip stability'}
                </p>
              </CardContent>
            </Card>

            {/* Knee Valgus Control Card */}
            <Card className={`transition-all duration-300 ${
              biomechanicalMetrics?.kneeValgus?.severity !== 'normal' ? 'border-yellow-400 border-2' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">KNEE VALGUS</span>
                  {biomechanicalMetrics?.kneeValgus && (
                    <Badge variant={
                      biomechanicalMetrics.kneeValgus.severity === 'normal' ? 'default' : 
                      biomechanicalMetrics.kneeValgus.severity === 'mild' ? 'secondary' : 'destructive'
                    }>
                      {biomechanicalMetrics.kneeValgus.detected ? '✗ DETECTED' : '✓ ABSENT'}
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={biomechanicalMetrics?.kneeValgus ? Math.max(0, 100 - (Math.max(biomechanicalMetrics.kneeValgus.left, biomechanicalMetrics.kneeValgus.right) * 2)) : 100} 
                  className="h-2 mb-2" 
                />
                <p className="text-xs text-gray-600">
                  {biomechanicalMetrics?.kneeValgus?.detected 
                    ? 'Poor frontal plane control' 
                    : 'Good knee alignment'}
                </p>
              </CardContent>
            </Card>

            {/* Trunk Control Card */}
            <Card className={`transition-all duration-300 ${
              biomechanicalMetrics?.forwardLean > 10 ? 'border-blue-400 border-2' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">TRUNK CONTROL</span>
                  {biomechanicalMetrics && (
                    <Badge variant={biomechanicalMetrics.forwardLean < 10 ? 'default' : biomechanicalMetrics.forwardLean < 20 ? 'secondary' : 'destructive'}>
                      {biomechanicalMetrics.forwardLean < 10 ? '✓ STABLE' : biomechanicalMetrics.forwardLean < 20 ? '⚠ MILD LEAN' : '✗ EXCESSIVE'}
                    </Badge>
                  )}
                </div>
                <div className="text-center text-2xl font-bold mb-1">
                  {biomechanicalMetrics?.forwardLean ? biomechanicalMetrics.forwardLean.toFixed(0) : '0'}°
                </div>
                <p className="text-xs text-gray-600">
                  {biomechanicalMetrics?.forwardLean > 10 
                    ? 'Compensation for weakness' 
                    : 'Good postural control'}
                </p>
              </CardContent>
            </Card>

            {/* Ankle Mobility Card */}
            <Card className={`transition-all duration-300 ${
              currentMetrics && currentMetrics.jointAngles.find(a => a.joint === 'left_ankle' || a.joint === 'right_ankle')?.angle < 85 
                ? 'border-purple-400 border-2' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">ANKLE MOBILITY</span>
                  {currentMetrics && (() => {
                    const ankleAngle = currentMetrics.jointAngles.find(a => a.joint === 'left_ankle' || a.joint === 'right_ankle');
                    const dorsiflexion = ankleAngle ? 90 - ankleAngle.angle : 0;
                    return (
                      <Badge variant={dorsiflexion > 10 ? 'default' : dorsiflexion > 5 ? 'secondary' : 'destructive'}>
                        {dorsiflexion > 10 ? '✓ GOOD' : dorsiflexion > 5 ? '⚠ LIMITED' : '✗ RESTRICTED'}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="text-center text-2xl font-bold mb-1">
                  {(() => {
                    const ankleAngle = currentMetrics?.jointAngles.find(a => a.joint === 'left_ankle' || a.joint === 'right_ankle');
                    return ankleAngle ? Math.abs(90 - ankleAngle.angle).toFixed(0) : '0';
                  })()}° DF
                </div>
                <p className="text-xs text-gray-600">
                  {currentMetrics && currentMetrics.jointAngles.find(a => a.joint === 'left_ankle')?.angle < 85 
                    ? 'Mobility work needed' 
                    : 'Adequate range'}
                </p>
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-2">Overall Risk Assessment</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs">Injury Risk:</span>
                  <Badge variant={
                    biomechanicalMetrics && (biomechanicalMetrics.kneeValgus?.severity === 'severe' || biomechanicalMetrics.hipDrop?.side !== 'none') 
                      ? 'destructive' 
                      : biomechanicalMetrics?.kneeValgus?.severity === 'moderate' 
                        ? 'secondary' 
                        : 'default'
                  }>
                    {biomechanicalMetrics && (biomechanicalMetrics.kneeValgus?.severity === 'severe' || biomechanicalMetrics.hipDrop?.side !== 'none') 
                      ? 'HIGH' 
                      : biomechanicalMetrics?.kneeValgus?.severity === 'moderate' 
                        ? 'MODERATE' 
                        : 'LOW'}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Primary Focus: {
                    biomechanicalMetrics?.hipDrop?.side && biomechanicalMetrics.hipDrop.side !== 'none' 
                      ? 'Hip abductor strengthening' 
                      : biomechanicalMetrics?.kneeValgus?.detected 
                        ? 'VMO & glute strengthening' 
                        : 'Maintain current program'
                  }
                </p>
              </CardContent>
            </Card>
              </>
            )}

            {/* Single Leg Squat Cards */}
            {selectedTest?.id === 'single-leg-squat' && (
              <>
                {/* Pelvic Control Card */}
                <Card className={`transition-all duration-300 ${
                  biomechanicalMetrics?.hipDrop?.side !== 'none' ? 'border-red-400 border-2 animate-pulse' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">PELVIC CONTROL</span>
                      <Badge variant={biomechanicalMetrics?.hipDrop?.side === 'none' ? 'default' : 'destructive'}>
                        {biomechanicalMetrics?.hipDrop?.side === 'none' ? '✓ STABLE' : '✗ DROPPED'}
                      </Badge>
                    </div>
                    <div className="text-center text-2xl font-bold mb-1">
                      {biomechanicalMetrics?.hipDrop?.angle ? biomechanicalMetrics.hipDrop.angle.toFixed(1) : '0.0'}°
                    </div>
                    <p className="text-xs text-gray-600">
                      {biomechanicalMetrics?.hipDrop?.side !== 'none' ? 'Glute med weakness' : 'Good control'}
                    </p>
                  </CardContent>
                </Card>

                {/* Knee Alignment Card */}
                <Card className={`transition-all duration-300 ${
                  biomechanicalMetrics?.kneeValgus?.severity !== 'normal' ? 'border-orange-400 border-2' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">KNEE ALIGNMENT</span>
                      <Badge variant={
                        biomechanicalMetrics?.kneeValgus?.severity === 'normal' ? 'default' : 
                        biomechanicalMetrics?.kneeValgus?.severity === 'mild' ? 'secondary' : 'destructive'
                      }>
                        {biomechanicalMetrics?.kneeValgus?.detected ? '✗ VALGUS' : '✓ ALIGNED'}
                      </Badge>
                    </div>
                    <Progress 
                      value={biomechanicalMetrics?.kneeValgus ? Math.max(0, 100 - (Math.max(biomechanicalMetrics.kneeValgus.left || 0, biomechanicalMetrics.kneeValgus.right || 0) * 2)) : 100} 
                      className="h-2 mb-2" 
                    />
                    <p className="text-xs text-gray-600">
                      {biomechanicalMetrics?.kneeValgus?.detected ? 'ACL risk increased' : 'Safe pattern'}
                    </p>
                  </CardContent>
                </Card>

                {/* Balance Stability Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">BALANCE STABILITY</span>
                      <Badge variant="default">TRACKING</Badge>
                    </div>
                    <div className="text-center text-2xl font-bold mb-1">
                      {currentMetrics?.balance?.stability ? (currentMetrics.balance.stability * 100).toFixed(0) : '0'}%
                    </div>
                    <p className="text-xs text-gray-600">Center of mass deviation</p>
                  </CardContent>
                </Card>

                {/* Hip Strength Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">HIP STRENGTH</span>
                      <Badge variant={biomechanicalMetrics?.hipDrop?.side === 'none' ? 'default' : 'secondary'}>
                        {biomechanicalMetrics?.hipDrop?.side === 'none' ? '✓ ADEQUATE' : '⚠ DEFICIT'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {biomechanicalMetrics?.hipDrop?.side !== 'none' ? 'Strengthen glute med' : 'Maintain strength'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Assessment */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Overall Stability</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Focus: {
                        biomechanicalMetrics?.hipDrop?.side !== 'none' ? 'Hip strengthening' :
                        biomechanicalMetrics?.kneeValgus?.detected ? 'Knee control' : 'Good form'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Overhead Squat Cards */}
            {selectedTest?.id === 'overhead-squat' && (
              <>
                {/* Shoulder Mobility Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">SHOULDER MOBILITY</span>
                      <Badge variant={currentMetrics?.shoulderFlexion > 160 ? 'default' : 'secondary'}>
                        {currentMetrics?.shoulderFlexion > 160 ? '✓ FULL' : '⚠ LIMITED'}
                      </Badge>
                    </div>
                    <div className="text-center text-2xl font-bold mb-1">
                      {currentMetrics?.shoulderFlexion?.toFixed(0) || '0'}°
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.shoulderFlexion < 160 ? 'Arms falling forward' : 'Good overhead position'}
                    </p>
                  </CardContent>
                </Card>

                {/* Hip Mobility Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">HIP MOBILITY</span>
                      <Badge variant={currentMetrics?.squatDepth > 90 ? 'default' : 'secondary'}>
                        {currentMetrics?.squatDepth > 90 ? '✓ FULL' : '⚠ LIMITED'}
                      </Badge>
                    </div>
                    <div className="text-center text-2xl font-bold mb-1">
                      {currentMetrics?.squatDepth?.toFixed(0) || '0'}°
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.squatDepth < 90 ? 'Improve hip flexibility' : 'Good depth achieved'}
                    </p>
                  </CardContent>
                </Card>

                {/* Knee Tracking Card */}
                <Card className={`transition-all duration-300 ${
                  biomechanicalMetrics?.kneeValgus?.detected ? 'border-yellow-400 border-2' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">KNEE TRACKING</span>
                      <Badge variant={biomechanicalMetrics?.kneeValgus?.detected ? 'secondary' : 'default'}>
                        {biomechanicalMetrics?.kneeValgus?.detected ? '⚠ VALGUS' : '✓ ALIGNED'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {biomechanicalMetrics?.kneeValgus?.detected ? 'Knees caving inward' : 'Good knee position'}
                    </p>
                  </CardContent>
                </Card>

                {/* Ankle Flexibility Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">ANKLE FLEXIBILITY</span>
                      <Badge variant={currentMetrics?.heelLift ? 'secondary' : 'default'}>
                        {currentMetrics?.heelLift ? '⚠ HEELS UP' : '✓ HEELS DOWN'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.heelLift ? 'Limited dorsiflexion' : 'Good ankle mobility'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Pattern Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Movement Quality</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Key Limitation: {
                        currentMetrics?.shoulderFlexion < 160 ? 'Shoulder mobility' :
                        currentMetrics?.squatDepth < 90 ? 'Hip mobility' :
                        currentMetrics?.heelLift ? 'Ankle flexibility' : 'Good pattern'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Gait Analysis Cards */}
            {selectedTest?.id === 'gait-analysis' && (
              <>
                {/* Cadence Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">CADENCE</span>
                      <Badge variant="default">TRACKING</Badge>
                    </div>
                    <div className="text-center text-2xl font-bold mb-1">
                      {currentMetrics?.gait?.cadence?.toFixed(0) || '0'}
                      <span className="text-sm font-normal"> steps/min</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.gait?.cadence > 170 ? 'Fast pace' : 
                       currentMetrics?.gait?.cadence > 150 ? 'Normal pace' : 'Slow pace'}
                    </p>
                  </CardContent>
                </Card>

                {/* Stride Symmetry Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">STRIDE SYMMETRY</span>
                      <Badge variant={currentMetrics?.gait?.symmetry > 0.9 ? 'default' : 'secondary'}>
                        {currentMetrics?.gait?.symmetry > 0.9 ? '✓ SYMMETRIC' : '⚠ ASYMMETRIC'}
                      </Badge>
                    </div>
                    <Progress 
                      value={(currentMetrics?.gait?.symmetry || 0) * 100} 
                      className="h-2 mb-2" 
                    />
                    <p className="text-xs text-gray-600">
                      L/R ratio: {(currentMetrics?.gait?.symmetry || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                {/* Arm Swing Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">ARM SWING</span>
                      <Badge variant="default">ANALYZING</Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.armSwing?.symmetric ? 'Coordinated pattern' : 'Check coordination'}
                    </p>
                  </CardContent>
                </Card>

                {/* Trunk Rotation Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">TRUNK ROTATION</span>
                      <Badge variant={biomechanicalMetrics?.forwardLean < 5 ? 'default' : 'secondary'}>
                        {biomechanicalMetrics?.forwardLean < 5 ? '✓ NORMAL' : '⚠ EXCESSIVE'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {biomechanicalMetrics?.forwardLean > 5 ? 'Reduced efficiency' : 'Good mechanics'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Efficiency Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Gait Efficiency</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.gait?.symmetry < 0.9 ? 'Asymmetry detected' :
                        biomechanicalMetrics?.forwardLean > 5 ? 'Excessive trunk motion' : 'Normal pattern'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Lunge Assessment Cards */}
            {selectedTest?.id === 'lunge-assessment' && (
              <>
                {/* Hip Control Card */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Hip Control</h4>
                      <Badge variant={currentMetrics?.lungeMetrics?.hipDrop < 5 ? 'default' : 'secondary'}>
                        {currentMetrics?.lungeMetrics?.hipDrop < 5 ? '✓ STABLE' : '⚠ DROPPING'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.lungeMetrics?.hipDrop?.toFixed(1) || 0}°</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.lungeMetrics?.hipDrop > 5 ? 'Weak hip stabilizers' : 'Good lateral control'}
                    </p>
                  </CardContent>
                </Card>

                {/* Knee Tracking Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Knee Alignment</h4>
                      <Badge variant={currentMetrics?.lungeMetrics?.kneeValgus < 10 ? 'default' : 'secondary'}>
                        {currentMetrics?.lungeMetrics?.kneeValgus < 10 ? '✓ ALIGNED' : '⚠ VALGUS'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.lungeMetrics?.kneeValgus > 10 ? 'Inward collapse detected' : 'Proper tracking'}
                    </p>
                  </CardContent>
                </Card>

                {/* Forward Lean Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Trunk Position</h4>
                      <Badge variant={currentMetrics?.lungeMetrics?.trunkLean < 15 ? 'default' : 'secondary'}>
                        {currentMetrics?.lungeMetrics?.trunkLean < 15 ? '✓ UPRIGHT' : '⚠ FORWARD'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.lungeMetrics?.trunkLean?.toFixed(0) || 0}°</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.lungeMetrics?.trunkLean > 15 ? 'Excessive forward lean' : 'Good posture'}
                    </p>
                  </CardContent>
                </Card>

                {/* Depth Quality Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Lunge Depth</h4>
                    <Progress value={Math.min(100, (currentMetrics?.lungeMetrics?.depth || 0) * 100 / 90)} className="h-2 mb-2" />
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.lungeMetrics?.depth > 80 ? 'Good depth' : 'Increase range'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Performance Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Lunge Quality</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.lungeMetrics?.hipDrop > 5 ? 'Hip weakness' :
                        currentMetrics?.lungeMetrics?.kneeValgus > 10 ? 'Knee control' :
                        currentMetrics?.lungeMetrics?.trunkLean > 15 ? 'Forward lean' : 'Good form'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Standing Balance Cards */}
            {selectedTest?.id === 'standing-balance' && (
              <>
                {/* Sway Velocity Card */}
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Postural Sway</h4>
                      <Badge variant={currentMetrics?.balance?.swayVelocity < 2 ? 'default' : 'secondary'}>
                        {currentMetrics?.balance?.swayVelocity < 2 ? '✓ STABLE' : '⚠ UNSTABLE'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.balance?.swayVelocity?.toFixed(1) || 0} cm/s</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.balance?.swayVelocity > 2 ? 'Increased fall risk' : 'Good stability'}
                    </p>
                  </CardContent>
                </Card>

                {/* Center of Mass Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">COM Deviation</h4>
                      <Badge variant={currentMetrics?.balance?.comDeviation < 5 ? 'default' : 'secondary'}>
                        {currentMetrics?.balance?.comDeviation < 5 ? '✓ CENTERED' : '⚠ SHIFTED'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.balance?.comDeviation > 5 ? 'Weight shift detected' : 'Well centered'}
                    </p>
                  </CardContent>
                </Card>

                {/* Time to Stabilization Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Stabilization Time</h4>
                    <div className="text-2xl font-bold">{currentMetrics?.balance?.timeToStabilize?.toFixed(1) || 0}s</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.balance?.timeToStabilize > 3 ? 'Slow recovery' : 'Quick stabilization'}
                    </p>
                  </CardContent>
                </Card>

                {/* Balance Strategy Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Balance Strategy</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {currentMetrics?.balance?.strategy || 'Ankle strategy'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {currentMetrics?.balance?.strategy === 'Hip strategy' ? 'Compensatory pattern' : 'Normal response'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Balance Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Balance Control</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.balance?.swayVelocity > 2 ? 'Excessive sway' :
                        currentMetrics?.balance?.comDeviation > 5 ? 'COM shift' :
                        currentMetrics?.balance?.timeToStabilize > 3 ? 'Slow recovery' : 'Good balance'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Drop Jump Cards */}
            {selectedTest?.id === 'drop-jump' && (
              <>
                {/* Landing Impact Card */}
                <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Landing Force</h4>
                      <Badge variant={currentMetrics?.dropJump?.landingForce < 3 ? 'default' : 'destructive'}>
                        {currentMetrics?.dropJump?.landingForce < 3 ? '✓ SOFT' : '⚠ HARD'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.dropJump?.landingForce?.toFixed(1) || 0}x BW</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.dropJump?.landingForce > 3 ? 'High injury risk' : 'Good absorption'}
                    </p>
                  </CardContent>
                </Card>

                {/* Knee Flexion Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Knee Flexion</h4>
                      <Badge variant={currentMetrics?.dropJump?.kneeFlexion > 60 ? 'default' : 'secondary'}>
                        {currentMetrics?.dropJump?.kneeFlexion > 60 ? '✓ GOOD' : '⚠ STIFF'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.dropJump?.kneeFlexion?.toFixed(0) || 0}°</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.dropJump?.kneeFlexion < 60 ? 'Poor shock absorption' : 'Good cushioning'}
                    </p>
                  </CardContent>
                </Card>

                {/* Valgus Control Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Knee Control</h4>
                      <Badge variant={currentMetrics?.dropJump?.valgusAngle < 10 ? 'default' : 'secondary'}>
                        {currentMetrics?.dropJump?.valgusAngle < 10 ? '✓ STABLE' : '⚠ VALGUS'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.dropJump?.valgusAngle > 10 ? 'ACL injury risk' : 'Safe landing pattern'}
                    </p>
                  </CardContent>
                </Card>

                {/* Reactive Strength Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Reactive Strength</h4>
                    <div className="text-2xl font-bold">{currentMetrics?.dropJump?.rsi?.toFixed(2) || 0}</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.dropJump?.rsi > 1.5 ? 'Excellent power' : 'Build strength'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Performance Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Jump Quality</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.dropJump?.landingForce > 3 ? 'Hard landing' :
                        currentMetrics?.dropJump?.valgusAngle > 10 ? 'Knee collapse' :
                        currentMetrics?.dropJump?.kneeFlexion < 60 ? 'Stiff landing' : 'Good technique'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Shoulder Screen Cards */}
            {selectedTest?.id === 'shoulder-screen' && (
              <>
                {/* Flexion ROM Card */}
                <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Shoulder Flexion</h4>
                      <Badge variant={currentMetrics?.shoulder?.flexion > 170 ? 'default' : 'secondary'}>
                        {currentMetrics?.shoulder?.flexion > 170 ? '✓ FULL' : '⚠ LIMITED'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.shoulder?.flexion?.toFixed(0) || 0}°</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.shoulder?.flexion < 170 ? 'Restricted overhead' : 'Full range'}
                    </p>
                  </CardContent>
                </Card>

                {/* Scapular Control Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Scapular Control</h4>
                      <Badge variant={currentMetrics?.shoulder?.scapularWinging ? 'secondary' : 'default'}>
                        {currentMetrics?.shoulder?.scapularWinging ? '⚠ WINGING' : '✓ STABLE'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.shoulder?.scapularWinging ? 'Weak serratus anterior' : 'Good stability'}
                    </p>
                  </CardContent>
                </Card>

                {/* Painful Arc Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Painful Arc</h4>
                      <Badge variant={currentMetrics?.shoulder?.painfulArc ? 'destructive' : 'default'}>
                        {currentMetrics?.shoulder?.painfulArc ? '⚠ PRESENT' : '✓ CLEAR'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.shoulder?.painfulArc ? 'Impingement likely' : 'Smooth movement'}
                    </p>
                  </CardContent>
                </Card>

                {/* Symmetry Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Side Comparison</h4>
                    <Progress value={currentMetrics?.shoulder?.symmetry || 0} className="h-2 mb-2" />
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.shoulder?.symmetry < 90 ? 'Asymmetry detected' : 'Good symmetry'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Shoulder Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Shoulder Function</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.shoulder?.painfulArc ? 'Pain present' :
                        currentMetrics?.shoulder?.flexion < 170 ? 'Limited ROM' :
                        currentMetrics?.shoulder?.scapularWinging ? 'Poor control' : 'Good function'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Core Stability Cards */}
            {selectedTest?.id === 'core-stability' && (
              <>
                {/* Plank Hold Time Card */}
                <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Plank Hold</h4>
                      <Badge variant={currentMetrics?.core?.plankTime > 60 ? 'default' : 'secondary'}>
                        {currentMetrics?.core?.plankTime > 60 ? '✓ STRONG' : '⚠ WEAK'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{currentMetrics?.core?.plankTime?.toFixed(0) || 0}s</div>
                    <p className="text-xs text-gray-600">
                      {currentMetrics?.core?.plankTime < 60 ? 'Build endurance' : 'Good stamina'}
                    </p>
                  </CardContent>
                </Card>

                {/* Pelvic Control Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Pelvic Tilt</h4>
                      <Badge variant={Math.abs(currentMetrics?.core?.pelvicTilt || 0) < 10 ? 'default' : 'secondary'}>
                        {Math.abs(currentMetrics?.core?.pelvicTilt || 0) < 10 ? '✓ NEUTRAL' : '⚠ TILTED'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {Math.abs(currentMetrics?.core?.pelvicTilt || 0) > 10 ? 
                        (currentMetrics?.core?.pelvicTilt > 0 ? 'Anterior tilt' : 'Posterior tilt') : 
                        'Good alignment'}
                    </p>
                  </CardContent>
                </Card>

                {/* Rotation Control Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">Rotation Control</h4>
                      <Badge variant={currentMetrics?.core?.rotationControl ? 'default' : 'secondary'}>
                        {currentMetrics?.core?.rotationControl ? '✓ STABLE' : '⚠ UNSTABLE'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {!currentMetrics?.core?.rotationControl ? 'Work on anti-rotation' : 'Good control'}
                    </p>
                  </CardContent>
                </Card>

                {/* Breathing Pattern Card */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Breathing Pattern</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {currentMetrics?.core?.breathingPattern || 'Diaphragmatic'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {currentMetrics?.core?.breathingPattern === 'Chest' ? 'Poor pattern' : 'Efficient breathing'}
                    </p>
                  </CardContent>
                </Card>

                {/* Overall Core Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Core Stability</h4>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Primary Issue: {
                        currentMetrics?.core?.plankTime < 60 ? 'Poor endurance' :
                        Math.abs(currentMetrics?.core?.pelvicTilt || 0) > 10 ? 'Pelvic tilt' :
                        !currentMetrics?.core?.rotationControl ? 'Rotation weakness' : 'Good stability'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
