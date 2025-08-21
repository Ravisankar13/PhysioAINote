import { useState, useRef, useEffect, useCallback } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
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
  Info
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
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    gender: '',
    complaint: ''
  });
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'error' | 'permission-needed' | 'not-started'>('not-started');
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
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number>();
  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const visibleJointsRef = useRef(visibleJoints);
  
  // Update ref when visibleJoints state changes
  useEffect(() => {
    visibleJointsRef.current = visibleJoints;
  }, [visibleJoints]);

  // Initialize MediaPipe Pose - only when a test is selected
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !selectedTest) return;

    const initializeCamera = async () => {
      try {
        console.log('Starting camera initialization...');
        console.log('Secure context:', window.isSecureContext);
        console.log('Location protocol:', window.location.protocol);
        
        // Check if we're in a secure context
        if (!window.isSecureContext) {
          console.error('Camera access requires HTTPS or localhost');
          setCameraStatus('error');
          toast({
            title: "Camera Access Denied",
            description: "This feature requires a secure connection (HTTPS). Please ensure you're accessing the site via HTTPS.",
            variant: "destructive",
          });
          return;
        }

        // Check for camera permissions
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('getUserMedia is not supported');
          setCameraStatus('error');
          toast({
            title: "Camera Not Supported",
            description: "Your browser doesn't support camera access. Please use a modern browser.",
            variant: "destructive",
          });
          return;
        }

        // Request camera permission first
        setCameraStatus('permission-needed');
        console.log('Requesting camera permission...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('Camera permission granted, stream obtained');
          // Stop the test stream as we'll use MediaPipe's camera
          stream.getTracks().forEach(track => track.stop());
          setCameraStatus('initializing');
        } catch (permissionError) {
          console.error('Camera permission denied:', permissionError);
          setCameraStatus('error');
          toast({
            title: "Camera Permission Denied",
            description: "Please allow camera access in your browser settings and refresh the page.",
            variant: "destructive",
          });
          return;
        }

        console.log('Initializing MediaPipe Pose...');
        const pose = new Pose({
          locateFile: (file) => {
            console.log('Loading MediaPipe file:', file);
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 2,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;
        console.log('MediaPipe Pose initialized');

        if (!videoRef.current) {
          console.error('Video element not found');
          setCameraStatus('error');
          return;
        }

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && !isPaused && videoRef.current) {
              await poseRef.current.send({ image: videoRef.current });
            }
          },
          width: 1920,
          height: 1080,
          facingMode: 'user'
        });

        cameraRef.current = camera;
        
        // Start camera with error handling
        await camera.start().then(() => {
          setCameraStatus('ready');
          console.log('Camera started successfully');
        }).catch((error: any) => {
          console.error('Camera start error:', error);
          setCameraStatus('error');
          toast({
            title: "Camera Error",
            description: "Failed to start camera. Please check camera permissions and try again.",
            variant: "destructive",
          });
        });

      } catch (error) {
        console.error('Camera initialization error:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize movement analysis. Please refresh and try again.",
          variant: "destructive",
        });
      }
    };

    initializeCamera();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, selectedTest]);

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
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 3
      });

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

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Failed to enter fullscreen:', err);
        // Fallback to just UI fullscreen
        setIsFullscreen(!isFullscreen);
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Failed to exit fullscreen:', err);
        setIsFullscreen(!isFullscreen);
      });
    } else {
      // Fallback for when browser fullscreen isn't available
      setIsFullscreen(!isFullscreen);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Start recording
  const startRecording = () => {
    if (!selectedTest) return;
    
    setIsRecording(true);
    setIsPaused(false);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    setRecordedData([]);
    
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

  // Stop recording
  const stopRecording = async () => {
    setIsRecording(false);
    setIsPaused(false);
    
    if (recordedData.length > 0) {
      // Save session data
      await saveSession();
    }
    
    toast({
      title: "Recording Stopped",
      description: "Movement analysis complete",
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

  // Generate report
  const generateReport = () => {
    if (recordedData.length === 0) {
      toast({
        title: "No Data",
        description: "Please record a movement assessment first",
        variant: "destructive",
      });
      return;
    }

    // Calculate summary statistics
    const allAngles = recordedData.flatMap(d => d.metrics?.jointAngles || []);
    const avgSymmetry = recordedData.reduce((sum, d) => sum + (d.metrics?.symmetry || 0), 0) / recordedData.length;
    const avgStability = recordedData.reduce((sum, d) => sum + (d.metrics?.stability || 0), 0) / recordedData.length;

    // Create report content
    const report = {
      patient: patientInfo,
      test: selectedTest,
      duration: elapsedTime,
      summary: {
        averageSymmetry: avgSymmetry.toFixed(1),
        averageStability: avgStability.toFixed(1),
        impairments: Array.from(new Set(recordedData.flatMap(d => d.impairments))),
        recommendations: selectedTest?.id === 'running-gait' 
          ? generateRunningRecommendations(impairments)
          : generateRecommendations(impairments),
        // Add running-specific metrics if applicable
        ...(selectedTest?.id === 'running-gait' && runningMetrics ? {
          runningMetrics: {
            cadence: runningMetrics.cadence,
            footStrike: runningMetrics.footStrike,
            verticalOscillation: runningMetrics.verticalOscillation,
            strideLength: runningMetrics.strideLength,
            groundContactTime: runningMetrics.groundContactTime,
            overstriding: runningMetrics.overstriding,
            crossoverGait: runningMetrics.crossoverGait
          }
        } : {})
      }
    };

    // Download report as JSON (can be enhanced to PDF)
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movement-analysis-${Date.now()}.json`;
    a.click();
    
    toast({
      title: "Report Generated",
      description: "Movement analysis report has been downloaded",
    });
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
    toast({
      title: "Test Selected",
      description: `Initializing camera for ${test.name}...`,
    });
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
        <div className={`${isFullscreen ? 'flex-1' : 'w-3/4'} flex flex-col gap-4`}>
          <Card className={`flex-1 overflow-hidden ${isFullscreen ? 'border-0 rounded-none bg-black' : ''}`}>
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
            <CardContent className={`p-0 relative ${isFullscreen ? 'h-full' : ''}`}>
              <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'} bg-black`}>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover hidden"
                  autoPlay
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
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
                        <div className="text-sm text-gray-300">
                          <p>Troubleshooting tips:</p>
                          <ul className="list-disc list-inside mt-1">
                            <li>Ensure you're using HTTPS (not HTTP)</li>
                            <li>Allow camera permissions in browser settings</li>
                            <li>Check if camera is being used by another app</li>
                            <li>Try refreshing the page</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
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
                
                {/* Control Buttons - Top Right */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="flex gap-2">
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

          {/* Assessment Selection */}
          {!isFullscreen && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Assessment Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Test:</p>
                      <Badge variant="outline" className="text-sm">
                        {selectedTest?.name || 'No test selected'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedTest?.instructions.map((instruction, i) => (
                        <li key={i} className="text-xs">{instruction}</li>
                      )) || <li className="text-xs">Select a test to begin</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Metrics and Analysis */}
        {!isFullscreen && (
          <div className="w-1/4 flex flex-col gap-4">
            <Tabs defaultValue="metrics" className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="test-results">Test Results</TabsTrigger>
                <TabsTrigger value="impairments">Impairments</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Real-Time Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {selectedTest?.id === 'running-gait' && runningMetrics ? (
                        <div className="space-y-4">
                          {/* Cadence */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Cadence</span>
                              <Badge variant={
                                runningMetrics.cadence >= 170 && runningMetrics.cadence <= 180 ? 'default' :
                                runningMetrics.cadence >= 160 && runningMetrics.cadence <= 190 ? 'secondary' : 'destructive'
                              }>
                                {runningMetrics.cadence} SPM
                              </Badge>
                            </div>
                          </div>

                          {/* Foot Strike */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Foot Strike</span>
                              <Badge variant={
                                runningMetrics.footStrike === 'midfoot' ? 'default' :
                                runningMetrics.footStrike === 'forefoot' ? 'secondary' : 'outline'
                              }>
                                {runningMetrics.footStrike.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          {/* Vertical Oscillation */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Vertical Oscillation</span>
                              <span className="text-sm">{runningMetrics.verticalOscillation.toFixed(1)}cm</span>
                            </div>
                            <Progress 
                              value={Math.min(100, (10 - runningMetrics.verticalOscillation) * 10)} 
                              className="h-2" 
                            />
                          </div>

                          {/* Arm Swing Symmetry */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Arm Swing Symmetry</span>
                              <span className="text-sm">{runningMetrics.armSwingSymmetry.toFixed(0)}%</span>
                            </div>
                            <Progress value={runningMetrics.armSwingSymmetry} className="h-2" />
                          </div>

                          {/* Ground Contact Time */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Ground Contact Time</span>
                              <span className="text-sm">{runningMetrics.groundContactTime}ms</span>
                            </div>
                          </div>

                          <Separator />

                          {/* Running Mechanics */}
                          <div>
                            <h4 className="text-sm font-medium mb-3">Running Mechanics</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Stride Length</span>
                                <span>{runningMetrics.strideLength.toFixed(2)}x leg</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Trunk Lean</span>
                                <span className={Math.abs(runningMetrics.trunkLean) < 10 ? 'text-green-600' : 'text-orange-600'}>
                                  {runningMetrics.trunkLean > 0 ? '+' : ''}{runningMetrics.trunkLean.toFixed(1)}°
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Knee Flexion</span>
                                <span>{runningMetrics.kneeFlexion}°</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Hip Extension</span>
                                <span>{runningMetrics.hipExtension}°</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Pelvic Drop</span>
                                <span className={runningMetrics.pelvicDrop < 5 ? 'text-green-600' : 'text-orange-600'}>
                                  {runningMetrics.pelvicDrop.toFixed(1)}cm
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Issues */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Issues Detected</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                {runningMetrics.overstriding ? (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                                <span>Overstriding {runningMetrics.overstriding ? 'Detected' : 'Not Detected'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {runningMetrics.crossoverGait ? (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                                <span>Crossover Gait {runningMetrics.crossoverGait ? 'Present' : 'Normal'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : currentMetrics ? (
                        <div className="space-y-4">
                          {/* Movement Quality */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Movement Quality</span>
                              <Badge variant={
                                currentMetrics.quality === 'excellent' ? 'default' :
                                currentMetrics.quality === 'good' ? 'secondary' :
                                currentMetrics.quality === 'fair' ? 'outline' : 'destructive'
                              }>
                                {currentMetrics.quality.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          {/* Symmetry */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Symmetry</span>
                              <span className="text-sm">{currentMetrics.symmetry.toFixed(1)}%</span>
                            </div>
                            <Progress value={currentMetrics.symmetry} className="h-2" />
                          </div>

                          {/* Stability */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Stability</span>
                              <span className="text-sm">{currentMetrics.stability.toFixed(1)}%</span>
                            </div>
                            <Progress value={currentMetrics.stability} className="h-2" />
                          </div>

                          <Separator />

                          {/* Joint Angles */}
                          <div>
                            <h4 className="text-sm font-medium mb-3">Joint Angles</h4>
                            <div className="space-y-2">
                              {currentMetrics.jointAngles.map((angle, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="capitalize">{angle.joint.replace('_', ' ')}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={angle.isWithinNormal ? 'text-green-600' : 'text-red-600'}>
                                      {angle.angle.toFixed(1)}°
                                    </span>
                                    {angle.isWithinNormal ? (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No movement detected</p>
                          <p className="text-xs mt-1">Position yourself in front of the camera</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test-results" className="mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Specialized Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {specializedTestResult ? (
                        <div className="space-y-4">
                          {/* Test Name and Score */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{selectedTest?.name || 'Test'}</h3>
                              <Badge variant={
                                specializedTestResult.score >= 80 ? 'default' :
                                specializedTestResult.score >= 60 ? 'secondary' : 'destructive'
                              }>
                                Score: {specializedTestResult.score.toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Risk Level:</span>
                              <Badge variant={
                                specializedTestResult.risk === 'low' ? 'outline' :
                                specializedTestResult.risk === 'moderate' ? 'secondary' : 'destructive'
                              }>
                                {specializedTestResult.risk.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Test-Specific Metrics */}
                          {specializedMetrics && (
                            <div>
                              <h4 className="text-sm font-medium mb-3">Test Metrics</h4>
                              <div className="space-y-2 text-xs">
                                {selectedTest?.id === 'walking-gait' && 'stepLengthAsymmetry' in specializedMetrics && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Step Length Asymmetry</span>
                                      <span className={specializedMetrics.stepLengthAsymmetry < 10 ? 'text-green-600' : 'text-orange-600'}>
                                        {specializedMetrics.stepLengthAsymmetry?.toFixed(1) || '0'}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Stance Time</span>
                                      <span>{specializedMetrics.stanceTime?.left?.toFixed(0) || '0'}ms / {specializedMetrics.stanceTime?.right?.toFixed(0) || '0'}ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Hip Drop</span>
                                      <span className={Math.max(specializedMetrics.hipDrop?.left || 0, specializedMetrics.hipDrop?.right || 0) < 5 ? 'text-green-600' : 'text-orange-600'}>
                                        L: {specializedMetrics.hipDrop?.left?.toFixed(1) || '0'}° / R: {specializedMetrics.hipDrop?.right?.toFixed(1) || '0'}°
                                      </span>
                                    </div>
                                  </>
                                )}
                                {selectedTest?.id === 'single-leg-squat' && 'kneeValgusAngle' in specializedMetrics && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Knee Valgus Angle</span>
                                      <span className={Math.max(Math.abs(specializedMetrics.kneeValgusAngle?.left || 0), Math.abs(specializedMetrics.kneeValgusAngle?.right || 0)) < 10 ? 'text-green-600' : 'text-red-600'}>
                                        L: {specializedMetrics.kneeValgusAngle?.left?.toFixed(1) || '0'}° / R: {specializedMetrics.kneeValgusAngle?.right?.toFixed(1) || '0'}°
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Trunk Lateral Flexion</span>
                                      <span>{specializedMetrics.trunkLateralFlexion?.toFixed(1) || '0'}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Balance Score</span>
                                      <span>{specializedMetrics.balanceScore?.toFixed(0) || '0'}%</span>
                                    </div>
                                  </>
                                )}
                                {selectedTest?.id === 'shoulder-flexion' && 'maxFlexionROM' in specializedMetrics && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Max Flexion ROM</span>
                                      <span className={Math.min(specializedMetrics.maxFlexionROM?.left || 0, specializedMetrics.maxFlexionROM?.right || 0) > 160 ? 'text-green-600' : 'text-orange-600'}>
                                        L: {specializedMetrics.maxFlexionROM?.left?.toFixed(0) || '0'}° / R: {specializedMetrics.maxFlexionROM?.right?.toFixed(0) || '0'}°
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Scapular Dyskinesis</span>
                                      <span className={specializedMetrics.hasScapularDyskinesis ? 'text-red-600' : 'text-green-600'}>
                                        {specializedMetrics.hasScapularDyskinesis ? 'Present' : 'Absent'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Movement Quality</span>
                                      <span>{specializedMetrics.movementQuality || '0'}%</span>
                                    </div>
                                  </>
                                )}
                                {selectedTest?.id === 'running-gait' && specializedMetrics && 'cadenceOptimal' in specializedMetrics && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Cadence Optimal</span>
                                      <span className={specializedMetrics.cadenceOptimal ? 'text-green-600' : 'text-orange-600'}>
                                        {specializedMetrics.cadenceOptimal ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Overstriding</span>
                                      <span className={!specializedMetrics.overstride ? 'text-green-600' : 'text-red-600'}>
                                        {specializedMetrics.overstride ? 'Present' : 'Absent'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Hip Drop</span>
                                      <span>{specializedMetrics.hipDropMagnitude?.toFixed(1) || '0'}cm</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {specializedTestResult.recommendations && specializedTestResult.recommendations.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-3">Clinical Recommendations</h4>
                              <div className="space-y-2">
                                {specializedTestResult.recommendations.map((rec, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Key Points */}
                          <div>
                            <h4 className="text-sm font-medium mb-3">Assessment Focus</h4>
                            <div className="space-y-1">
                              {selectedTest?.keyPoints?.map((point, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600">{point}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No specialized test results yet</p>
                          <p className="text-xs mt-1">Perform the selected assessment to see detailed results</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="impairments" className="mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Detected Impairments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {impairments.length > 0 ? (
                        <div className="space-y-3">
                          {impairments.map((impairment, i) => (
                            <Alert key={i} className="border-orange-200 bg-orange-50">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-sm">
                                {impairment}
                              </AlertDescription>
                            </Alert>
                          ))}
                          
                          <Separator className="my-4" />
                          
                          <div>
                            <h4 className="text-sm font-medium mb-3">Recommendations</h4>
                            <div className="space-y-2">
                              {(selectedTest?.id === 'running-gait' 
                                ? generateRunningRecommendations(impairments)
                                : generateRecommendations(impairments)
                              ).map((rec, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                  <p className="text-xs text-gray-700">{rec}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                          <p>No impairments detected</p>
                          <p className="text-xs mt-1">Movement patterns within normal limits</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="report" className="mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Session Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Patient Information */}
                      <div>
                        <label className="text-sm font-medium">Patient Name</label>
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          placeholder="Enter patient name"
                          value={patientInfo.name}
                          onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Age</label>
                          <input
                            type="number"
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                            placeholder="Age"
                            value={patientInfo.age}
                            onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Gender</label>
                          <Select
                            value={patientInfo.gender}
                            onValueChange={(value) => setPatientInfo({...patientInfo, gender: value})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Chief Complaint</label>
                        <textarea
                          className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          rows={3}
                          placeholder="Describe the main complaint"
                          value={patientInfo.complaint}
                          onChange={(e) => setPatientInfo({...patientInfo, complaint: e.target.value})}
                        />
                      </div>
                      
                      <Separator />
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button 
                          onClick={saveSession} 
                          className="w-full"
                          disabled={recordedData.length === 0 || !patientInfo.name}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Session
                        </Button>
                        <Button 
                          onClick={generateReport} 
                          variant="outline" 
                          className="w-full"
                          disabled={recordedData.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}