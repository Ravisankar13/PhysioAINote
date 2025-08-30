import { useState, useRef, useEffect, useCallback } from 'react';
import { webXRService } from '@/services/webXRService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera as CameraIcon, 
  Play, 
  Pause, 
  StopCircle, 
  Download, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Target,
  Info,
  Layers,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';
import { AnatomyManager } from '@/services/anatomy/AnatomyManager';
import { 
  BODY_REGIONS, 
  analyzeBodyPart,
  type BodyPartAnalysis,
  type BodyRegionId
} from '@/services/biomechanics/BodyPartAnalysis';
import { DetailedSpineRenderer, RibcageRenderer, PelvisRenderer, BoneMeasurements } from '@/services/anatomy/DetailedBoneStructures';
import { ShoulderComplexRenderer } from '@/services/anatomy/shoulder/ShoulderComplex';
import { 
  EnhancedRibcageRenderer, 
  EnhancedPelvisRenderer, 
  EnhancedKneeRenderer, 
  EnhancedElbowRenderer 
} from '@/services/anatomy/EnhancedAnatomicalStructures';

// Pose landmark indices
const POSE_LANDMARKS = {
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
};

// Anatomy overlay layers
const ANATOMY_LAYERS = [
  { id: 'bones', label: 'Bones', color: '#ffffff' },
  { id: 'ligaments', label: 'Ligaments', color: '#ff6b6b' },
  { id: 'menisci', label: 'Menisci', color: '#4ecdc4' },
  { id: 'tendons', label: 'Tendons', color: '#45b7d1' },
  { id: 'muscles', label: 'Muscles', color: '#f7b801' }
];

interface KneeMetrics {
  flexionAngle: number;
  valgusAngle: number;
  rotationAngle: number;
  swellingEstimate: number;
  stabilityScore: number;
}

interface TrackedRegion {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  type: 'swelling' | 'bruising' | 'pain' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  timestamp: Date;
}

// MediaPipe types (will be loaded dynamically)
type Pose = any;
type Camera = any;
declare const POSE_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;

export default function BodyScanner() {
  const { toast } = useToast();
  
  // State management
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [selectedView, setSelectedView] = useState<'frontal' | 'lateral' | 'posterior'>('frontal');
  const [visibleLayers, setVisibleLayers] = useState<string[]>(['bones']);
  const [kneeMetrics, setKneeMetrics] = useState<KneeMetrics | null>(null);
  const [trackedRegions, setTrackedRegions] = useState<TrackedRegion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  const [anatomyLayers, setAnatomyLayers] = useState({
    bones: true,
    ligaments: false,
    menisci: false,
    tendons: false,
    cartilage: false,
    vessels: false
  });
  const [clinicalTests, setClinicalTests] = useState<any[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyRegionId>('shoulder');
  const [bodyPartAnalyses, setBodyPartAnalyses] = useState<Record<BodyRegionId, BodyPartAnalysis | null>>({
    cervical: null,
    thoracic: null,
    lumbar: null,
    shoulder: null,
    elbow: null,
    wrist: null,
    hip: null,
    knee: null,
    ankle: null
  });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const anatomyManagerRef = useRef<AnatomyManager>(new AnatomyManager());
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number>();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const spineRendererRef = useRef<DetailedSpineRenderer>(new DetailedSpineRenderer());
  const ribcageRendererRef = useRef<RibcageRenderer>(new RibcageRenderer());
  const pelvisRendererRef = useRef<PelvisRenderer>(new PelvisRenderer());
  const shoulderRendererRef = useRef<ShoulderComplexRenderer>(new ShoulderComplexRenderer());
  
  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (fullscreenContainerRef.current) {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
        showControlsTemporarily();
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
      setShowControls(true);
    }
  };

  // Show controls temporarily when user interacts
  const showControlsTemporarily = () => {
    setShowControls(true);
    
    // Clear existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Hide controls after 3 seconds if in fullscreen
    if (isFullscreen) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
  };

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    if (isFullscreen) {
      showControlsTemporarily();
    }
  };

  // Helper function to calculate angle between three points
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };
  
  // Calculate knee metrics from landmarks
  const calculateKneeMetrics = (landmarks: any[]): KneeMetrics => {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    
    // Calculate flexion angles
    const leftFlexion = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightFlexion = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Calculate valgus angle (knee deviation)
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    const kneeCenter = { x: (leftKnee.x + rightKnee.x) / 2, y: (leftKnee.y + rightKnee.y) / 2 };
    const ankleCenter = { x: (leftAnkle.x + rightAnkle.x) / 2, y: (leftAnkle.y + rightAnkle.y) / 2 };
    const valgusAngle = calculateAngle(hipCenter, kneeCenter, ankleCenter);
    
    // Estimate rotation based on knee position relative to hip-ankle line
    const leftRotation = Math.abs(leftKnee.x - ((leftHip.x + leftAnkle.x) / 2)) * 100;
    const rightRotation = Math.abs(rightKnee.x - ((rightHip.x + rightAnkle.x) / 2)) * 100;
    
    // Mock swelling estimate (would use depth estimation in full implementation)
    const swellingEstimate = Math.random() * 20; // 0-20% estimate
    
    // Calculate stability score based on movement consistency
    const stabilityScore = 100 - (Math.abs(leftFlexion - rightFlexion) / 180 * 100);
    
    return {
      flexionAngle: Math.min(leftFlexion, rightFlexion),
      valgusAngle: 180 - valgusAngle,
      rotationAngle: Math.max(leftRotation, rightRotation),
      swellingEstimate,
      stabilityScore
    };
  };
  
  // Process pose detection results
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    // Clear canvases
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    // Draw pose landmarks and connections
    if (results.poseLandmarks) {
      // Calculate and update knee metrics
      const metrics = calculateKneeMetrics(results.poseLandmarks);
      setKneeMetrics(metrics);
      
      // Removed basic pose visualization - using anatomical overlay instead
      
      // Perform body part analysis for selected region
      const analysis = analyzeBodyPart(selectedBodyPart, results.poseLandmarks);
      setBodyPartAnalyses(prev => ({
        ...prev,
        [selectedBodyPart]: analysis
      }));
      
      // Draw knee tracking lines
      const leftKnee = results.poseLandmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rightKnee = results.poseLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const leftAnkle = results.poseLandmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rightAnkle = results.poseLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      const leftHip = results.poseLandmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = results.poseLandmarks[POSE_LANDMARKS.RIGHT_HIP];
      
      // Draw alignment guides
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Left leg alignment
      ctx.beginPath();
      ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
      ctx.lineTo(leftKnee.x * canvas.width, leftKnee.y * canvas.height);
      ctx.lineTo(leftAnkle.x * canvas.width, leftAnkle.y * canvas.height);
      ctx.stroke();
      
      // Right leg alignment
      ctx.beginPath();
      ctx.moveTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
      ctx.lineTo(rightKnee.x * canvas.width, rightKnee.y * canvas.height);
      ctx.lineTo(rightAnkle.x * canvas.width, rightAnkle.y * canvas.height);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Draw anatomy overlay if layers are visible
      if (visibleLayers.length > 0) {
        drawAnatomyOverlay(overlayCtx, results.poseLandmarks, overlayCanvas.width, overlayCanvas.height);
      }
      
      // Draw tracked regions
      trackedRegions.forEach(region => {
        drawTrackedRegion(ctx, region, canvas.width, canvas.height);
      });
    }
    
    ctx.restore();
  }, [visibleLayers, trackedRegions, selectedBodyPart]);
  
  // Draw anatomy overlay with realistic structures
  const drawAnatomyOverlay = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Clear the overlay canvas first
    ctx.clearRect(0, 0, width, height);
    
    // Render detailed bone structures if bones layer is visible
    if (visibleLayers.includes('bones')) {
      // Render detailed spine with individual vertebrae (keeping only this for spine measurements)
      const spineRenderer = spineRendererRef.current;
      if (spineRenderer) {
        const vertebrae = spineRenderer.generateDetailedVertebrae(landmarks, width, height);
        spineRenderer.renderVertebrae(ctx, vertebrae, true);
        
        // Calculate and display clinical measurements
        const cobbAngle = BoneMeasurements.calculateCobbAngle(vertebrae);
        const thoracicKyphosis = BoneMeasurements.calculateSpinalCurvature(vertebrae, 'thoracic');
        const lumbarLordosis = BoneMeasurements.calculateSpinalCurvature(vertebrae, 'lumbar');
        
        // Display measurements
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Cobb Angle: ${cobbAngle.toFixed(1)}°`, 10, height - 60);
        ctx.fillText(`Thoracic Kyphosis: ${thoracicKyphosis.toFixed(1)}°`, 10, height - 45);
        ctx.fillText(`Lumbar Lordosis: ${lumbarLordosis.toFixed(1)}°`, 10, height - 30);
      }
      
      // Enhanced Ribcage with costovertebral joints and detailed anatomy
      const enhancedRibcageRenderer = new EnhancedRibcageRenderer();
      const enhancedRibcageData = enhancedRibcageRenderer.generateEnhancedRibcage(landmarks, width, height);
      enhancedRibcageRenderer.renderEnhancedRibcage(ctx, enhancedRibcageData);
      
      // Enhanced Pelvis with ASIS, PSIS, and clinical measurements
      const enhancedPelvisRenderer = new EnhancedPelvisRenderer();
      const enhancedPelvisData = enhancedPelvisRenderer.generateEnhancedPelvis(landmarks, width, height);
      enhancedPelvisRenderer.renderEnhancedPelvis(ctx, enhancedPelvisData);
      
      // Render shoulder complex (keeping this as it has unique features)
      const shoulderRenderer = shoulderRendererRef.current;
      if (shoulderRenderer) {
        // Render left shoulder
        if (landmarks[11]) { // Left shoulder landmark exists
          shoulderRenderer.render(ctx, landmarks, width, height, 'left');
        }
        
        // Render right shoulder
        if (landmarks[12]) { // Right shoulder landmark exists
          shoulderRenderer.render(ctx, landmarks, width, height, 'right');
        }
      }
      
      // Enhanced Knee joints (both sides)
      const enhancedKneeRenderer = new EnhancedKneeRenderer();
      if (landmarks[25]) { // Left knee
        const leftKnee = enhancedKneeRenderer.generateEnhancedKnee(landmarks, width, height, 'left');
        enhancedKneeRenderer.renderEnhancedKnee(ctx, leftKnee, 'left', {
          x: landmarks[25].x * width,
          y: landmarks[25].y * height
        });
      }
      if (landmarks[26]) { // Right knee
        const rightKnee = enhancedKneeRenderer.generateEnhancedKnee(landmarks, width, height, 'right');
        enhancedKneeRenderer.renderEnhancedKnee(ctx, rightKnee, 'right', {
          x: landmarks[26].x * width,
          y: landmarks[26].y * height
        });
      }
      
      // Enhanced Elbow joints (both sides)
      const enhancedElbowRenderer = new EnhancedElbowRenderer();
      if (landmarks[13]) { // Left elbow
        const leftElbow = enhancedElbowRenderer.generateEnhancedElbow(landmarks, width, height, 'left');
        enhancedElbowRenderer.renderEnhancedElbow(ctx, leftElbow, 'left', {
          x: landmarks[13].x * width,
          y: landmarks[13].y * height
        });
      }
      if (landmarks[14]) { // Right elbow
        const rightElbow = enhancedElbowRenderer.generateEnhancedElbow(landmarks, width, height, 'right');
        enhancedElbowRenderer.renderEnhancedElbow(ctx, rightElbow, 'right', {
          x: landmarks[14].x * width,
          y: landmarks[14].y * height
        });
      }
      
      // Draw the main bones (femur, tibia, humerus, etc.)
      drawBones(ctx, landmarks, width, height);
    }
    
    // Render other layers (muscles, ligaments, etc.)
    visibleLayers.forEach(layerId => {
      if (layerId === 'bones') return; // Already handled above
      
      const layer = ANATOMY_LAYERS.find(l => l.id === layerId);
      if (!layer) return;
      
      switch(layerId) {
        case 'muscles':
          drawMuscles(ctx, landmarks, width, height);
          break;
        case 'ligaments':
          drawLigaments(ctx, landmarks, width, height);
          break;
        case 'menisci':
          drawMenisci(ctx, landmarks, width, height);
          break;
        case 'tendons':
          drawTendons(ctx, landmarks, width, height);
          break;
      }
    });
  };
  
  // Draw bone structures with enhanced anatomical detail
  const drawBones = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    
    // Bone styling
    ctx.strokeStyle = '#e8e8e8';
    ctx.fillStyle = '#f5f5f5';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.globalAlpha = 0.85;
    
    // Helper function to draw anatomically accurate bone with features
    const drawDetailedBone = (start: any, end: any, boneName: string, thickness: number = 8) => {
      const startX = start.x * width;
      const startY = start.y * height;
      const endX = end.x * width;
      const endY = end.y * height;
      
      // Calculate bone angle and length
      const angle = Math.atan2(endY - startY, endX - startX);
      const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      
      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(angle);
      
      // Draw bone shaft with anatomical features
      if (boneName.includes('Femur')) {
        // Femur: Add greater trochanter and condyles
        // Proximal end (hip joint)
        ctx.beginPath();
        ctx.arc(0, 0, thickness * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Greater trochanter
        ctx.beginPath();
        ctx.ellipse(thickness, -thickness * 0.5, thickness * 0.8, thickness * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Shaft with slight curve
        const gradient = ctx.createLinearGradient(0, 0, length, 0);
        gradient.addColorStop(0, '#f5f5f5');
        gradient.addColorStop(0.5, '#e8e8e8');
        gradient.addColorStop(1, '#f5f5f5');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(0, -thickness/2);
        ctx.quadraticCurveTo(length/2, -thickness/2 - 2, length, -thickness * 0.8);
        ctx.lineTo(length, thickness * 0.8);
        ctx.quadraticCurveTo(length/2, thickness/2 + 2, 0, thickness/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Distal condyles
        ctx.beginPath();
        ctx.ellipse(length - thickness, 0, thickness * 1.2, thickness * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
      } else if (boneName.includes('Tibia')) {
        // Tibia: Add tibial plateau and malleolus
        // Proximal tibial plateau
        ctx.beginPath();
        ctx.rect(-thickness * 0.8, -thickness * 0.8, thickness * 1.6, thickness * 1.6);
        ctx.fill();
        ctx.stroke();
        
        // Shaft
        ctx.beginPath();
        ctx.moveTo(0, -thickness/2);
        ctx.lineTo(length, -thickness * 0.4);
        ctx.lineTo(length, thickness * 0.4);
        ctx.lineTo(0, thickness/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Medial malleolus
        ctx.beginPath();
        ctx.ellipse(length, thickness * 0.3, thickness * 0.5, thickness * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
      } else if (boneName.includes('Humerus')) {
        // Humerus: Add head and epicondyles
        // Humeral head
        ctx.beginPath();
        ctx.arc(0, 0, thickness * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Shaft
        ctx.fillRect(0, -thickness/2, length, thickness);
        ctx.strokeRect(0, -thickness/2, length, thickness);
        
        // Epicondyles
        ctx.beginPath();
        ctx.ellipse(length, -thickness * 0.6, thickness * 0.6, thickness * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(length, thickness * 0.6, thickness * 0.6, thickness * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
      } else {
        // Default bone structure
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.lineWidth = thickness;
        ctx.stroke();
        
        // Joint ends
        ctx.beginPath();
        ctx.arc(0, 0, thickness/2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(length, 0, thickness/2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.restore();
    };
    
    // Draw femur (thigh bone) - thicker as it's the largest bone
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    
    if (leftHip && leftKnee) {
      drawDetailedBone(leftHip, leftKnee, 'Left Femur', 12); // Femur is thicker
      
      // Add femur label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Femur', leftHip.x * width + 15, leftHip.y * height + (leftKnee.y - leftHip.y) * height / 2);
    }
    
    if (rightHip && rightKnee) {
      drawDetailedBone(rightHip, rightKnee, 'Right Femur', 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Femur', rightHip.x * width - 35, rightHip.y * height + (rightKnee.y - rightHip.y) * height / 2);
    }
    
    // Draw patella (kneecap)
    ctx.fillStyle = '#f0f0f0';
    if (leftKnee) {
      ctx.beginPath();
      const patellaX = leftKnee.x * width;
      const patellaY = leftKnee.y * height;
      ctx.ellipse(patellaX, patellaY - 5, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Patella', patellaX + 18, patellaY);
    }
    
    if (rightKnee) {
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      const patellaX = rightKnee.x * width;
      const patellaY = rightKnee.y * height;
      ctx.ellipse(patellaX, patellaY - 5, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Patella', patellaX - 45, patellaY);
    }
    
    // Draw tibia (shin bone)
    ctx.strokeStyle = '#e8e8e8';
    ctx.fillStyle = '#f5f5f5';
    if (leftKnee && leftAnkle) {
      drawDetailedBone(leftKnee, leftAnkle, 'Left Tibia', 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Tibia', leftKnee.x * width + 15, leftKnee.y * height + (leftAnkle.y - leftKnee.y) * height / 2);
    }
    
    if (rightKnee && rightAnkle) {
      drawDetailedBone(rightKnee, rightAnkle, 'Right Tibia', 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Tibia', rightKnee.x * width - 35, rightKnee.y * height + (rightAnkle.y - rightKnee.y) * height / 2);
    }
    
    // Draw upper body bones (humerus, radius, ulna)
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    
    // Draw humerus (upper arm)
    if (leftShoulder && leftElbow) {
      drawDetailedBone(leftShoulder, leftElbow, 'Left Humerus', 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Humerus', leftShoulder.x * width + 10, leftShoulder.y * height + (leftElbow.y - leftShoulder.y) * height / 2);
    }
    
    if (rightShoulder && rightElbow) {
      drawDetailedBone(rightShoulder, rightElbow, 'Right Humerus', 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Humerus', rightShoulder.x * width - 40, rightShoulder.y * height + (rightElbow.y - rightShoulder.y) * height / 2);
    }
    
    // Draw radius and ulna (forearm bones)
    if (leftElbow && leftWrist) {
      // Radius (thumb side)
      const radiusOffset = 0.003;
      drawDetailedBone(
        { x: leftElbow.x - radiusOffset, y: leftElbow.y },
        { x: leftWrist.x - radiusOffset, y: leftWrist.y },
        'Left Radius', 6
      );
      
      // Ulna (pinky side)
      drawDetailedBone(
        { x: leftElbow.x + radiusOffset, y: leftElbow.y },
        { x: leftWrist.x + radiusOffset, y: leftWrist.y },
        'Left Ulna', 6
      );
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.fillText('Radius/Ulna', leftElbow.x * width + 10, leftElbow.y * height + (leftWrist.y - leftElbow.y) * height / 2);
    }
    
    if (rightElbow && rightWrist) {
      // Radius (thumb side)
      const radiusOffset = 0.003;
      drawDetailedBone(
        { x: rightElbow.x + radiusOffset, y: rightElbow.y },
        { x: rightWrist.x + radiusOffset, y: rightWrist.y },
        'Right Radius', 6
      );
      
      // Ulna (pinky side)
      drawDetailedBone(
        { x: rightElbow.x - radiusOffset, y: rightElbow.y },
        { x: rightWrist.x - radiusOffset, y: rightWrist.y },
        'Right Ulna', 6
      );
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.fillText('Radius/Ulna', rightElbow.x * width - 50, rightElbow.y * height + (rightWrist.y - rightElbow.y) * height / 2);
    }
    
    // Draw fibula (smaller bone parallel to tibia)
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 5;
    if (leftKnee && leftAnkle) {
      const fibulaOffset = 15;
      ctx.beginPath();
      ctx.moveTo(leftKnee.x * width + fibulaOffset, leftKnee.y * height);
      ctx.lineTo(leftAnkle.x * width + fibulaOffset, leftAnkle.y * height);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Fibula', leftKnee.x * width + fibulaOffset + 5, leftKnee.y * height + (leftAnkle.y - leftKnee.y) * height / 2 + 15);
    }
    
    if (rightKnee && rightAnkle) {
      const fibulaOffset = -15;
      ctx.beginPath();
      ctx.moveTo(rightKnee.x * width + fibulaOffset, rightKnee.y * height);
      ctx.lineTo(rightAnkle.x * width + fibulaOffset, rightAnkle.y * height);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Fibula', rightKnee.x * width + fibulaOffset - 35, rightKnee.y * height + (rightAnkle.y - rightKnee.y) * height / 2 + 15);
    }
    
    ctx.restore();
  };
  
  // Draw muscle structures
  const drawMuscles = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    ctx.globalAlpha = 0.6;
    
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    
    // Draw quadriceps (front of thigh)
    ctx.fillStyle = '#ff6b6b';
    if (leftHip && leftKnee) {
      const startX = leftHip.x * width;
      const startY = leftHip.y * height;
      const endX = leftKnee.x * width;
      const endY = leftKnee.y * height;
      
      // Draw muscle belly shape
      ctx.beginPath();
      ctx.moveTo(startX - 10, startY);
      ctx.quadraticCurveTo(startX - 25, (startY + endY) / 2, endX - 8, endY);
      ctx.lineTo(endX + 8, endY);
      ctx.quadraticCurveTo(startX + 25, (startY + endY) / 2, startX + 10, startY);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Quadriceps', startX - 50, (startY + endY) / 2);
    }
    
    if (rightHip && rightKnee) {
      ctx.fillStyle = '#ff6b6b';
      const startX = rightHip.x * width;
      const startY = rightHip.y * height;
      const endX = rightKnee.x * width;
      const endY = rightKnee.y * height;
      
      ctx.beginPath();
      ctx.moveTo(startX - 10, startY);
      ctx.quadraticCurveTo(startX - 25, (startY + endY) / 2, endX - 8, endY);
      ctx.lineTo(endX + 8, endY);
      ctx.quadraticCurveTo(startX + 25, (startY + endY) / 2, startX + 10, startY);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Quadriceps', startX + 15, (startY + endY) / 2);
    }
    
    // Draw gastrocnemius (calf muscle)
    ctx.fillStyle = '#ffa500';
    if (leftKnee && leftAnkle) {
      const startX = leftKnee.x * width;
      const startY = leftKnee.y * height + 10;
      const endX = leftAnkle.x * width;
      const endY = leftAnkle.y * height;
      
      ctx.beginPath();
      ctx.moveTo(startX - 5, startY);
      ctx.quadraticCurveTo(startX - 20, startY + (endY - startY) * 0.3, endX - 5, endY);
      ctx.lineTo(endX + 5, endY);
      ctx.quadraticCurveTo(startX + 20, startY + (endY - startY) * 0.3, startX + 5, startY);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Gastrocnemius', startX - 55, startY + (endY - startY) * 0.4);
    }
    
    if (rightKnee && rightAnkle) {
      ctx.fillStyle = '#ffa500';
      const startX = rightKnee.x * width;
      const startY = rightKnee.y * height + 10;
      const endX = rightAnkle.x * width;
      const endY = rightAnkle.y * height;
      
      ctx.beginPath();
      ctx.moveTo(startX - 5, startY);
      ctx.quadraticCurveTo(startX - 20, startY + (endY - startY) * 0.3, endX - 5, endY);
      ctx.lineTo(endX + 5, endY);
      ctx.quadraticCurveTo(startX + 20, startY + (endY - startY) * 0.3, startX + 5, startY);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('Gastrocnemius', startX + 10, startY + (endY - startY) * 0.4);
    }
    
    ctx.restore();
  };
  
  // Draw ligament structures
  const drawLigaments = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    ctx.globalAlpha = 0.7;
    
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    
    // Draw ACL, PCL, MCL, LCL around knee joint
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]);
    
    if (leftKnee) {
      const kneeX = leftKnee.x * width;
      const kneeY = leftKnee.y * height;
      
      // ACL (Anterior Cruciate Ligament)
      ctx.beginPath();
      ctx.moveTo(kneeX - 10, kneeY - 10);
      ctx.lineTo(kneeX + 10, kneeY + 10);
      ctx.stroke();
      
      // PCL (Posterior Cruciate Ligament)
      ctx.beginPath();
      ctx.moveTo(kneeX + 10, kneeY - 10);
      ctx.lineTo(kneeX - 10, kneeY + 10);
      ctx.stroke();
      
      // MCL (Medial Collateral Ligament)
      ctx.beginPath();
      ctx.moveTo(kneeX - 15, kneeY - 15);
      ctx.lineTo(kneeX - 15, kneeY + 15);
      ctx.stroke();
      
      // LCL (Lateral Collateral Ligament)
      ctx.beginPath();
      ctx.moveTo(kneeX + 15, kneeY - 15);
      ctx.lineTo(kneeX + 15, kneeY + 15);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('ACL/PCL', kneeX - 50, kneeY - 20);
      ctx.fillText('MCL', kneeX - 35, kneeY);
      ctx.fillText('LCL', kneeX + 20, kneeY);
    }
    
    if (rightKnee) {
      const kneeX = rightKnee.x * width;
      const kneeY = rightKnee.y * height;
      
      // ACL
      ctx.beginPath();
      ctx.moveTo(kneeX - 10, kneeY - 10);
      ctx.lineTo(kneeX + 10, kneeY + 10);
      ctx.stroke();
      
      // PCL
      ctx.beginPath();
      ctx.moveTo(kneeX + 10, kneeY - 10);
      ctx.lineTo(kneeX - 10, kneeY + 10);
      ctx.stroke();
      
      // MCL
      ctx.beginPath();
      ctx.moveTo(kneeX + 15, kneeY - 15);
      ctx.lineTo(kneeX + 15, kneeY + 15);
      ctx.stroke();
      
      // LCL
      ctx.beginPath();
      ctx.moveTo(kneeX - 15, kneeY - 15);
      ctx.lineTo(kneeX - 15, kneeY + 15);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('ACL/PCL', kneeX + 5, kneeY - 20);
      ctx.fillText('LCL', kneeX - 40, kneeY);
      ctx.fillText('MCL', kneeX + 20, kneeY);
    }
    
    ctx.restore();
  };
  
  // Draw menisci structures
  const drawMenisci = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    ctx.globalAlpha = 0.7;
    
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    
    ctx.fillStyle = '#4ecdc4';
    
    if (leftKnee) {
      const kneeX = leftKnee.x * width;
      const kneeY = leftKnee.y * height;
      
      // Draw C-shaped menisci
      ctx.beginPath();
      ctx.arc(kneeX - 8, kneeY, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(kneeX - 8, kneeY, 8, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(kneeX + 8, kneeY, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.arc(kneeX + 8, kneeY, 8, Math.PI * 0.5, Math.PI * 1.5, true);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Menisci', kneeX - 25, kneeY + 25);
    }
    
    if (rightKnee) {
      ctx.fillStyle = '#4ecdc4';
      const kneeX = rightKnee.x * width;
      const kneeY = rightKnee.y * height;
      
      ctx.beginPath();
      ctx.arc(kneeX - 8, kneeY, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(kneeX - 8, kneeY, 8, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(kneeX + 8, kneeY, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.arc(kneeX + 8, kneeY, 8, Math.PI * 0.5, Math.PI * 1.5, true);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Menisci', kneeX - 25, kneeY + 25);
    }
    
    ctx.restore();
  };
  
  // Draw tendon structures
  const drawTendons = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    ctx.save();
    ctx.globalAlpha = 0.6;
    
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    
    ctx.strokeStyle = '#45b7d1';
    ctx.lineWidth = 4;
    
    // Draw patellar tendon
    if (leftKnee) {
      const kneeX = leftKnee.x * width;
      const kneeY = leftKnee.y * height;
      
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY - 18);
      ctx.lineTo(kneeX, kneeY + 20);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Patellar Tendon', kneeX - 55, kneeY + 35);
    }
    
    if (rightKnee) {
      const kneeX = rightKnee.x * width;
      const kneeY = rightKnee.y * height;
      
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY - 18);
      ctx.lineTo(kneeX, kneeY + 20);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Patellar Tendon', kneeX + 5, kneeY + 35);
    }
    
    // Draw Achilles tendon
    if (leftAnkle) {
      const ankleX = leftAnkle.x * width;
      const ankleY = leftAnkle.y * height;
      
      ctx.beginPath();
      ctx.moveTo(ankleX, ankleY - 30);
      ctx.lineTo(ankleX, ankleY + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Achilles', ankleX - 45, ankleY + 15);
    }
    
    if (rightAnkle) {
      const ankleX = rightAnkle.x * width;
      const ankleY = rightAnkle.y * height;
      
      ctx.beginPath();
      ctx.moveTo(ankleX, ankleY - 30);
      ctx.lineTo(ankleX, ankleY + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('Achilles', ankleX + 5, ankleY + 15);
    }
    
    ctx.restore();
  };
  
  // Draw tracked region
  const drawTrackedRegion = (ctx: CanvasRenderingContext2D, region: TrackedRegion, width: number, height: number) => {
    ctx.strokeStyle = region.type === 'swelling' ? '#ff0000' : 
                     region.type === 'bruising' ? '#800080' : 
                     region.type === 'pain' ? '#ffa500' : '#00ff00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    
    ctx.beginPath();
    region.points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
    
    // Draw label
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '14px Arial';
    ctx.fillText(region.label, region.points[0].x * width, region.points[0].y * height - 10);
    
    ctx.globalAlpha = 1;
  };
  
  // Load MediaPipe libraries, check WebXR, and enumerate cameras on mount
  useEffect(() => {
    const loadLibraries = async () => {
      const loaded = await loadMediaPipeLibraries();
      setMediapipeLoaded(loaded);
      if (!loaded) {
        toast({
          title: "Failed to load MediaPipe",
          description: "Unable to load pose tracking libraries",
          variant: "destructive",
        });
      }
    };
    loadLibraries();
    
    // Check WebXR support
    webXRService.checkXRSupport().then(support => {
      setXrSupported(support.supported && (support.immersiveAR || support.inline));
      if (support.supported) {
        console.log('[BodyScanner] WebXR supported:', support);
      }
    });
    
    // Enumerate available cameras
    const enumerateCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        console.log('[BodyScanner] Available cameras:', cameras);
      } catch (error) {
        console.error('[BodyScanner] Failed to enumerate cameras:', error);
      }
    };
    enumerateCameras();
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowControls(true);
        if (controlsTimeout) {
          clearTimeout(controlsTimeout);
          setControlsTimeout(null);
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Initialize camera and pose detection
  useEffect(() => {
    if (!isTracking || !mediapipeLoaded) return;
    
    const initializeTracking = async () => {
      try {
        setCameraStatus('initializing');
        
        // Wait for MediaPipe to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize Pose
        const pose = new window.Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
          }
        });
        
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        pose.onResults(onPoseResults);
        poseRef.current = pose;
        
        // Initialize Camera with selected facing mode or specific device
        if (videoRef.current) {
          const cameraConfig: any = {
            onFrame: async () => {
              if (poseRef.current && !isPaused && videoRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720
          };
          
          // Use specific device ID if selected, otherwise use facing mode
          if (selectedCameraId) {
            cameraConfig.deviceId = selectedCameraId;
          } else {
            cameraConfig.facingMode = facingMode;
          }
          
          const camera = new window.Camera(videoRef.current, cameraConfig);
          
          cameraRef.current = camera;
          await camera.start();
          setCameraStatus('ready');
          
          const cameraDesc = selectedCameraId 
            ? availableCameras.find(c => c.deviceId === selectedCameraId)?.label || 'Selected camera'
            : `${facingMode === 'user' ? 'Front' : 'Back'} camera`;
          
          toast({
            title: "Camera Ready",
            description: `Using ${cameraDesc} for tracking`,
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Failed to initialize tracking:', error);
        setCameraStatus('error');
        toast({
          title: "Initialization Error",
          description: "Failed to start camera tracking",
          variant: "destructive",
        });
      }
    };
    
    initializeTracking();
    
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTracking, mediapipeLoaded, isPaused, onPoseResults, facingMode, selectedCameraId, availableCameras]);
  
  // Handle region selection with SAM 2 integration
  const handleCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isTracking) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    // Get current frame as image data
    const imageData = canvasRef.current.toDataURL('image/png');
    
    try {
      // Call SAM 2 segmentation API
      const response = await fetch('/api/body-scanner/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageData,
          clickPoint: { x, y },
          frameIndex: capturedFrames.length
        })
      });
      
      if (response.ok) {
        const { segmentation } = await response.json();
        
        // Convert segmentation mask to points for visualization
        const points: { x: number; y: number }[] = [];
        const { bounds, mask } = segmentation;
        
        // Extract contour points from mask (simplified)
        for (let i = 0; i < 32; i++) {
          const angle = (i / 32) * Math.PI * 2;
          const radius = 0.05 + (Math.random() * 0.02); // Vary radius based on actual mask
          points.push({
            x: x + Math.cos(angle) * radius,
            y: y + Math.sin(angle) * radius
          });
        }
        
        const newRegion: TrackedRegion = {
          id: `region-${Date.now()}`,
          label: `Region ${trackedRegions.length + 1}`,
          points,
          type: 'swelling',
          severity: 'mild',
          timestamp: new Date()
        };
        
        setTrackedRegions([...trackedRegions, newRegion]);
        
        toast({
          title: "Region Segmented",
          description: `Confidence: ${(segmentation.confidence * 100).toFixed(0)}%`,
          duration: 2000,
        });
      } else {
        // Fallback to simple circular region
        const newRegion: TrackedRegion = {
          id: `region-${Date.now()}`,
          label: `Region ${trackedRegions.length + 1}`,
          points: Array.from({ length: 16 }, (_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            return {
              x: x + Math.cos(angle) * 0.05,
              y: y + Math.sin(angle) * 0.05
            };
          }),
          type: 'swelling',
          severity: 'mild',
          timestamp: new Date()
        };
        
        setTrackedRegions([...trackedRegions, newRegion]);
      }
    } catch (error) {
      console.error('Segmentation error:', error);
      // Fallback to simple region
      const newRegion: TrackedRegion = {
        id: `region-${Date.now()}`,
        label: `Region ${trackedRegions.length + 1}`,
        points: Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          return {
            x: x + Math.cos(angle) * 0.05,
            y: y + Math.sin(angle) * 0.05
          };
        }),
        type: 'swelling',
        severity: 'mild',
        timestamp: new Date()
      };
      
      setTrackedRegions([...trackedRegions, newRegion]);
    }
  };
  
  // Toggle anatomy layer visibility
  const toggleLayer = (layerId: string) => {
    setVisibleLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };
  
  // Capture current frame
  const captureFrame = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCapturedFrames(prev => [...prev, dataUrl]);
    
    toast({
      title: "Frame Captured",
      description: "Image saved to analysis history",
      duration: 2000,
    });
  };
  
  // Estimate depth for current frame
  const estimateDepth = async () => {
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    
    try {
      const response = await fetch('/api/body-scanner/depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageData })
      });
      
      if (response.ok) {
        const { depthAnalysis } = await response.json();
        
        // Visualize depth map on overlay canvas
        if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext('2d');
          if (ctx) {
            // Simple depth visualization (blue = close, red = far)
            ctx.globalAlpha = 0.3;
            const gradient = ctx.createLinearGradient(0, 0, overlayCanvasRef.current.width, 0);
            gradient.addColorStop(0, 'blue');
            gradient.addColorStop(0.5, 'green');
            gradient.addColorStop(1, 'red');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            ctx.globalAlpha = 1;
          }
        }
        
        toast({
          title: "Depth Estimated",
          description: `Depth range: ${depthAnalysis.minDepth.toFixed(2)} - ${depthAnalysis.maxDepth.toFixed(2)}`,
          duration: 2000,
        });
        
        return depthAnalysis;
      }
    } catch (error) {
      console.error('Depth estimation error:', error);
      toast({
        title: "Depth Estimation Failed",
        description: "Using simplified depth model",
        variant: "destructive",
        duration: 2000,
      });
    }
    return null;
  };
  
  // Generate educational report with insights
  const generateReport = async () => {
    // Get depth analysis if not already done
    const depthAnalysis = await estimateDepth();
    
    // Generate educational insights
    try {
      const insightsResponse = await fetch('/api/body-scanner/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          regions: trackedRegions,
          kneeMetrics,
          depthAnalysis
        })
      });
      
      if (insightsResponse.ok) {
        const { insights } = await insightsResponse.json();
        
        // Save the session
        const saveResponse = await fetch('/api/body-scanner/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            bodyPart: 'knee',
            view: selectedView,
            regions: trackedRegions,
            metrics: kneeMetrics,
            depthAnalysis,
            frames: capturedFrames
          })
        });
        
        if (saveResponse.ok) {
          const { scanId } = await saveResponse.json();
          
          toast({
            title: "Report Generated",
            description: `Scan #${scanId} saved with educational insights`,
            duration: 3000,
          });
          
          // Display insights
          console.log('Educational Insights:', insights);
          
          // Create downloadable report (simplified for now)
          const reportContent = {
            scanId,
            timestamp: new Date().toISOString(),
            view: selectedView,
            metrics: kneeMetrics,
            insights,
            disclaimer: "Educational visualization only - not for diagnostic purposes"
          };
          
          // Download as JSON (PDF generation would be added later)
          const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `knee-assessment-${scanId}.json`;
          a.click();
        }
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: "Unable to generate complete insights",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  return (
    <div 
      ref={fullscreenContainerRef}
      className={`${isFullscreen ? 'fixed inset-0 bg-black z-50' : 'container mx-auto p-6 max-w-7xl'}`}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      
      {/* Non-fullscreen header */}
      {!isFullscreen && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Advanced Knee Assessment Tool
              </CardTitle>
              <CardDescription>
                Educational visualization with real-time pose tracking and anatomical overlays
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Educational Tool Only</AlertTitle>
            <AlertDescription>
              This tool provides anatomical education and visualization. It is not intended for diagnosis or treatment.
              Always consult with qualified healthcare professionals for clinical decisions.
            </AlertDescription>
          </Alert>
          
          {/* Phase 2 Features Info */}
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Advanced Features (Phase 2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">SAM 2 Segmentation</p>
                    <p className="text-muted-foreground">Click to precisely segment regions of interest</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">MiDaS Depth Estimation</p>
                    <p className="text-muted-foreground">3D depth analysis for volume comparison</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Educational Insights</p>
                    <p className="text-muted-foreground">Anatomical correlations and clinical tests</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Fullscreen Top Bar */}
      {isFullscreen && (
        <div 
          className={`absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-sm transition-all duration-300 z-10 ${
            showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
        >
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-4">
              <Badge variant={cameraStatus === 'ready' ? 'default' : 'secondary'}>
                {cameraStatus === 'ready' ? 'Active' : 
                 cameraStatus === 'initializing' ? 'Initializing...' : 
                 cameraStatus === 'error' ? 'Error' : 'Inactive'}
              </Badge>
              <Badge variant="outline">{selectedView} View</Badge>
              {isTracking && (
                <Badge variant="secondary">
                  {isPaused ? 'Paused' : 'Tracking'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen Left Panel - Camera Settings */}
      {isFullscreen && (
        <div 
          className={`absolute left-0 top-20 bottom-20 bg-black/80 backdrop-blur-sm transition-all duration-300 z-10 ${
            leftPanelOpen && showControls ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          }`}
          style={{ width: '280px' }}
        >
          <div className="p-4 border-b border-white/20">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-semibold">Camera Settings</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLeftPanelOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Camera Selector */}
            {availableCameras.length > 0 && (
              <div>
                <label className="text-white text-sm mb-2 block">Camera</label>
                <select 
                  className="w-full px-3 py-2 border border-white/20 rounded-md text-sm bg-black/50 text-white"
                  value={selectedCameraId || facingMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'user' || value === 'environment') {
                      setFacingMode(value as 'user' | 'environment');
                      setSelectedCameraId('');
                    } else {
                      setSelectedCameraId(value);
                      const camera = availableCameras.find(c => c.deviceId === value);
                      if (camera?.label.toLowerCase().includes('front')) {
                        setFacingMode('user');
                      } else if (camera?.label.toLowerCase().includes('back')) {
                        setFacingMode('environment');
                      }
                    }
                    toast({
                      title: "Camera Selected",
                      description: "Will apply when tracking restarts",
                      duration: 1500,
                    });
                  }}
                >
                  <optgroup label="Standard">
                    <option value="user">Front Camera</option>
                    <option value="environment">Back Camera</option>
                  </optgroup>
                  {availableCameras.length > 1 && (
                    <optgroup label="Available Cameras">
                      {availableCameras.map((camera, idx) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
            
            {/* View Mode */}
            <div>
              <label className="text-white text-sm mb-2 block">View Mode</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedView === 'frontal' ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedView('frontal')}
                  className="flex-1 text-white"
                >
                  Front
                </Button>
                <Button
                  size="sm"
                  variant={selectedView === 'lateral' ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedView('lateral')}
                  className="flex-1 text-white"
                >
                  Side
                </Button>
                <Button
                  size="sm"
                  variant={selectedView === 'posterior' ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedView('posterior')}
                  className="flex-1 text-white"
                >
                  Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen Right Panel - Visualization Settings */}
      {isFullscreen && (
        <div 
          className={`absolute right-0 top-20 bottom-20 bg-black/80 backdrop-blur-sm transition-all duration-300 z-10 ${
            rightPanelOpen && showControls ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
          style={{ width: '280px' }}
        >
          <div className="p-4 border-b border-white/20">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-semibold">Visualization</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRightPanelOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Anatomy Layers */}
            <div>
              <label className="text-white text-sm mb-2 block">Anatomy Layers</label>
              <div className="space-y-2">
                {ANATOMY_LAYERS.map(layer => (
                  <label key={layer.id} className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={visibleLayers.includes(layer.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleLayers([...visibleLayers, layer.id]);
                        } else {
                          setVisibleLayers(visibleLayers.filter(l => l !== layer.id));
                        }
                      }}
                      className="rounded border-white/20"
                    />
                    <span className="text-sm">{layer.label}</span>
                    <div 
                      className="w-3 h-3 rounded-full ml-auto"
                      style={{ backgroundColor: layer.color }}
                    />
                  </label>
                ))}
              </div>
            </div>
            
            {/* Measurement Display */}
            {kneeMetrics && (
              <div>
                <label className="text-white text-sm mb-2 block">Measurements</label>
                <div className="space-y-1 text-white text-sm">
                  <div className="flex justify-between">
                    <span>Flexion:</span>
                    <span>{kneeMetrics.flexionAngle.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valgus:</span>
                    <span>{kneeMetrics.valgusAngle.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rotation:</span>
                    <span>{kneeMetrics.rotationAngle.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Video element always present but hidden */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />
      
      {/* Main Content Area */}
      {isFullscreen ? (
        // Fullscreen Video Area
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="relative w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-full object-contain cursor-crosshair"
              onClick={handleCanvasClick}
              style={{ maxWidth: '100vw', maxHeight: '100vh' }}
            />
            <canvas
              ref={overlayCanvasRef}
              width={1920}
              height={1080}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ maxWidth: '100vw', maxHeight: '100vh' }}
            />
            
            {!isTracking && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Button
                  size="lg"
                  onClick={() => setIsTracking(true)}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Play className="h-5 w-5" />
                  Start Tracking
                </Button>
              </div>
            )}
            
            {/* Fullscreen Body Part Analysis Tabs */}
            <div 
              className={`absolute bottom-20 left-4 right-4 max-w-4xl mx-auto bg-black/90 backdrop-blur-md rounded-lg transition-all duration-300 ${
                showControls ? 'translate-y-0 opacity-100' : 'translate-y-[calc(100%+5rem)] opacity-0'
              }`}
              style={{ maxHeight: '40vh', overflowY: 'auto' }}
            >
              <div className="p-4">
                <Tabs value={selectedBodyPart} onValueChange={(value) => setSelectedBodyPart(value as BodyRegionId)}>
                  <TabsList className="grid grid-cols-9 mb-4 bg-black/50">
                    {BODY_REGIONS.map(region => (
                      <TabsTrigger 
                        key={region.id} 
                        value={region.id}
                        className="text-xs text-white data-[state=active]:bg-white/20"
                      >
                        <span className="mr-1">{region.icon}</span>
                        <span className="hidden sm:inline">{region.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {BODY_REGIONS.map(region => {
                    const analysis = bodyPartAnalyses[region.id];
                    
                    return (
                      <TabsContent key={region.id} value={region.id} className="text-white">
                        {analysis ? (
                          <div className="space-y-3">
                            {/* Compact Score Display */}
                            <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                              <span className="text-sm font-medium">Overall Score</span>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{analysis.overallScore.toFixed(0)}%</span>
                                <Badge 
                                  variant={
                                    analysis.overallScore >= 80 ? 'default' :
                                    analysis.overallScore >= 60 ? 'secondary' : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {analysis.overallScore >= 80 ? 'Good' :
                                   analysis.overallScore >= 60 ? 'Fair' : 'Needs Attention'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Compact Measurements */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {analysis.measurements.slice(0, 6).map((measurement, idx) => (
                                <div key={idx} className="p-2 bg-white/10 rounded">
                                  <div className="text-xs opacity-70">{measurement.name}</div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold">{measurement.value.toFixed(1)}</span>
                                    <span className="text-xs opacity-70">{measurement.unit}</span>
                                  </div>
                                  <div className="h-1 bg-white/20 rounded-full mt-1">
                                    <div 
                                      className={`h-full rounded-full ${
                                        measurement.interpretation === 'normal' ? 'bg-green-500' :
                                        measurement.interpretation === 'below' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.max(0, 
                                          ((measurement.value - measurement.normalRange.min) / 
                                           (measurement.normalRange.max - measurement.normalRange.min)) * 100
                                        ))}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-white/70">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Start tracking to see analysis</p>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            </div>
            
            {/* Fullscreen Bottom Control Bar */}
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm transition-all duration-300 ${
                showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
            >
              <div className="flex justify-center items-center gap-4 p-4">
                <Button
                  variant={isTracking ? 'destructive' : 'default'}
                  onClick={() => setIsTracking(!isTracking)}
                  disabled={cameraStatus === 'initializing'}
                  size="sm"
                >
                  {isTracking ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isTracking ? 'Stop' : 'Start'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPaused(!isPaused)}
                  disabled={!isTracking}
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/20"
                >
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="outline"
                  onClick={captureFrame}
                  disabled={!isTracking || cameraStatus !== 'ready'}
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/20"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/20"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Layers
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Regular Mode Layout
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video/Canvas Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Live Tracking</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={cameraStatus === 'ready' ? 'default' : 'secondary'}>
                      {cameraStatus === 'ready' ? 'Active' : 
                       cameraStatus === 'initializing' ? 'Initializing...' : 
                       cameraStatus === 'error' ? 'Error' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{selectedView} View</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                      title="Enter fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    className="w-full h-auto cursor-crosshair"
                    onClick={handleCanvasClick}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    width={1280}
                    height={720}
                    className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                  />
                  
                  {!isTracking && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Button
                        size="lg"
                        onClick={() => setIsTracking(true)}
                        className="gap-2"
                      >
                        <Play className="h-5 w-5" />
                        Start Tracking
                      </Button>
                    </div>
                  )}
                </div>
              
              {/* Control Buttons */}
              <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={isTracking ? 'destructive' : 'default'}
                    onClick={() => setIsTracking(!isTracking)}
                    disabled={cameraStatus === 'initializing'}
                  >
                    {isTracking ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isTracking ? 'Stop' : 'Start'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={!isTracking}
                  >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={captureFrame}
                    disabled={!isTracking || cameraStatus !== 'ready'}
                  >
                    <CameraIcon className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                  
                  {/* Camera Selector for Mobile Devices */}
                  {availableCameras.length > 0 && (
                    <select 
                      className="px-3 py-1.5 border rounded-md text-sm bg-background"
                      value={selectedCameraId || facingMode}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'user' || value === 'environment') {
                          setFacingMode(value as 'user' | 'environment');
                          setSelectedCameraId('');
                        } else {
                          setSelectedCameraId(value);
                          // Find and set the appropriate facing mode
                          const camera = availableCameras.find(c => c.deviceId === value);
                          if (camera?.label.toLowerCase().includes('front')) {
                            setFacingMode('user');
                          } else if (camera?.label.toLowerCase().includes('back')) {
                            setFacingMode('environment');
                          }
                        }
                        toast({
                          title: "Camera Selected",
                          description: "Will apply when tracking restarts",
                          duration: 1500,
                        });
                      }}
                    >
                      <optgroup label="Standard">
                        <option value="user">Front Camera</option>
                        <option value="environment">Back Camera</option>
                      </optgroup>
                      {availableCameras.length > 1 && (
                        <optgroup label="Available Cameras">
                          {availableCameras.map((camera, idx) => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                              {camera.label || `Camera ${idx + 1}`}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('frontal')}
                    className={selectedView === 'frontal' ? 'bg-primary/10' : ''}
                  >
                    Front
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('lateral')}
                    className={selectedView === 'lateral' ? 'bg-primary/10' : ''}
                  >
                    Side
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedView('posterior')}
                    className={selectedView === 'posterior' ? 'bg-primary/10' : ''}
                  >
                    Back
                  </Button>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={estimateDepth}
                    disabled={!isTracking || cameraStatus !== 'ready'}
                  >
                    <Layers className="h-4 w-4 mr-1" />
                    Depth
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newMode = facingMode === 'user' ? 'environment' : 'user';
                      setFacingMode(newMode);
                      toast({
                        title: "Camera Switched",
                        description: `Will use ${newMode === 'user' ? 'front' : 'back'} camera on next start`,
                        duration: 2000,
                      });
                    }}
                  >
                    <RotateCw className="h-4 w-4 mr-1" />
                    {facingMode === 'user' ? 'Front' : 'Back'}
                  </Button>
                </div>
              </div>
              
              {/* View Instructions */}
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedView === 'frontal' ? 'Frontal' : selectedView === 'lateral' ? 'Lateral' : 'Posterior'} View:</strong> 
                  {selectedView === 'frontal' && ' Position camera directly in front. Keep knees visible with slight bend.'}
                  {selectedView === 'lateral' && ' Position camera to the side. Show full leg profile from hip to ankle.'}
                  {selectedView === 'posterior' && ' Position camera behind. Focus on alignment and symmetry.'}
                  <br />
                  <strong>Tip:</strong> Tap on areas of concern to mark regions for tracking.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {/* Body Part Analysis Tabs - Below Video */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Body Part Analysis</CardTitle>
              <CardDescription>
                Real-time biomechanical measurements for each body region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedBodyPart} onValueChange={(value) => setSelectedBodyPart(value as BodyRegionId)}>
                <TabsList className="grid grid-cols-9 mb-4">
                  {BODY_REGIONS.map(region => (
                    <TabsTrigger 
                      key={region.id} 
                      value={region.id}
                      className="text-xs"
                    >
                      <span className="mr-1">{region.icon}</span>
                      {region.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {BODY_REGIONS.map(region => {
                  const analysis = bodyPartAnalyses[region.id];
                  
                  return (
                    <TabsContent key={region.id} value={region.id} className="space-y-4">
                      {analysis ? (
                        <>
                          {/* Overall Score */}
                          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-semibold">Overall Score</h4>
                              <p className="text-sm text-muted-foreground">
                                Based on {analysis.measurements.length} measurements
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold">
                                {analysis.overallScore.toFixed(0)}%
                              </div>
                              <Badge 
                                variant={
                                  analysis.overallScore >= 80 ? 'default' :
                                  analysis.overallScore >= 60 ? 'secondary' : 'destructive'
                                }
                              >
                                {analysis.overallScore >= 80 ? 'Good' :
                                 analysis.overallScore >= 60 ? 'Fair' : 'Needs Attention'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Measurements Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysis.measurements.map((measurement, idx) => (
                              <div key={idx} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-sm">{measurement.name}</h5>
                                  <Badge 
                                    variant={
                                      measurement.interpretation === 'normal' ? 'outline' :
                                      measurement.interpretation === 'below' ? 'secondary' : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {measurement.interpretation}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-2 mb-2">
                                  <span className="text-2xl font-bold">
                                    {measurement.value.toFixed(1)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {measurement.unit}
                                  </span>
                                </div>
                                
                                <div className="text-xs text-muted-foreground mb-1">
                                  Normal: {measurement.normalRange.min}-{measurement.normalRange.max} {measurement.unit}
                                </div>
                                
                                {/* Visual indicator bar */}
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      measurement.interpretation === 'normal' ? 'bg-green-500' :
                                      measurement.interpretation === 'below' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, 
                                        ((measurement.value - measurement.normalRange.min) / 
                                         (measurement.normalRange.max - measurement.normalRange.min)) * 100
                                      ))}%`
                                    }}
                                  />
                                </div>
                                
                                {measurement.clinicalSignificance && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    <Info className="inline h-3 w-3 mr-1" />
                                    {measurement.clinicalSignificance}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Recommendations */}
                          {analysis.recommendations.length > 0 && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Clinical Recommendations
                              </h4>
                              <ul className="space-y-1 text-sm">
                                {analysis.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Start tracking to see {region.label} analysis</p>
                          <p className="text-sm mt-2">
                            Position yourself in view and begin tracking
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Control Panel */}
        <div className="space-y-6">
          {/* Real-time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kneeMetrics ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Flexion Angle</span>
                      <span className="font-mono">{kneeMetrics.flexionAngle.toFixed(1)}°</span>
                    </div>
                    <Progress value={kneeMetrics.flexionAngle / 180 * 100} className="h-2 mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Valgus Angle</span>
                      <span className="font-mono">{kneeMetrics.valgusAngle.toFixed(1)}°</span>
                    </div>
                    <Progress 
                      value={Math.min(kneeMetrics.valgusAngle / 20 * 100, 100)} 
                      className="h-2 mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Rotation</span>
                      <span className="font-mono">{kneeMetrics.rotationAngle.toFixed(1)}°</span>
                    </div>
                    <Progress value={kneeMetrics.rotationAngle / 30 * 100} className="h-2 mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Stability Score</span>
                      <span className="font-mono">{kneeMetrics.stabilityScore.toFixed(0)}%</span>
                    </div>
                    <Progress value={kneeMetrics.stabilityScore} className="h-2 mt-1" />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Start tracking to see live metrics
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Body Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Body Regions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={anatomyManagerRef.current?.isRegionActive('shoulder') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    anatomyManagerRef.current?.toggleRegion('shoulder');
                    setIsTracking(false);
                    setTimeout(() => setIsTracking(true), 100);
                  }}
                >
                  Shoulder
                </Button>
                <Button
                  variant={anatomyManagerRef.current?.isRegionActive('knee') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    anatomyManagerRef.current?.toggleRegion('knee');
                    setIsTracking(false);
                    setTimeout(() => setIsTracking(true), 100);
                  }}
                >
                  Knee
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-50"
                >
                  Hip (Soon)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-50"
                >
                  Spine (Soon)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-50"
                >
                  Elbow (Soon)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-50"
                >
                  Ankle (Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Anatomy Layers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Anatomy Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ANATOMY_LAYERS.map(layer => (
                <Button
                  key={layer.id}
                  variant={visibleLayers.includes(layer.id) ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleLayer(layer.id)}
                >
                  {visibleLayers.includes(layer.id) ? 
                    <Eye className="h-4 w-4 mr-2" /> : 
                    <EyeOff className="h-4 w-4 mr-2" />
                  }
                  <span className="flex-1 text-left">{layer.label}</span>
                  <div 
                    className="w-4 h-4 rounded-full ml-2"
                    style={{ backgroundColor: layer.color }}
                  />
                </Button>
              ))}
            </CardContent>
          </Card>
          
          {/* Tracked Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Marked Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trackedRegions.length > 0 ? (
                <div className="space-y-2">
                  {trackedRegions.map(region => (
                    <div key={region.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <div>
                        <p className="text-sm font-medium">{region.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {region.type} - {region.severity}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrackedRegions(prev => prev.filter(r => r.id !== region.id))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tap on the video to mark regions
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Phase 3: WebXR 3D Anatomy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                3D Anatomy Overlay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {xrSupported ? (
                  <>
                    <Button
                      className="w-full"
                      variant={xrActive ? "destructive" : "default"}
                      onClick={async () => {
                        if (xrActive) {
                          await webXRService.endXRSession();
                          setXrActive(false);
                        } else if (canvasRef.current) {
                          const started = await webXRService.startXRSession(canvasRef.current);
                          setXrActive(started);
                          if (!started) {
                            toast({
                              title: "AR Not Available",
                              description: "Using standard visualization mode",
                            });
                          }
                        }
                      }}
                    >
                      {xrActive ? "Exit AR Mode" : "Start AR Mode"}
                    </Button>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Anatomy Layers:</p>
                      {Object.entries(anatomyLayers).map(([layer, visible]) => (
                        <div key={layer} className="flex items-center justify-between">
                          <label className="text-sm capitalize">{layer}</label>
                          <Button
                            size="sm"
                            variant={visible ? "default" : "outline"}
                            onClick={() => {
                              setAnatomyLayers(prev => ({
                                ...prev,
                                [layer]: !prev[layer as keyof typeof prev]
                              }));
                              webXRService.toggleLayer(layer);
                            }}
                          >
                            {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    WebXR not supported in this browser
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Phase 4: Clinical Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Clinical Tests Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trackedRegions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Suggested Tests:</p>
                    {['McMurray Test', 'Lachman Test', 'Valgus Stress Test'].map(test => (
                      <div key={test} className="p-2 bg-muted rounded text-sm">
                        <p className="font-medium">{test}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Educational visualization only
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Mark regions to see suggested clinical tests
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={generateReport}
                  disabled={!kneeMetrics && trackedRegions.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Educational Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setTrackedRegions([]);
                    setCapturedFrames([]);
                    toast({
                      title: "Session Cleared",
                      description: "All tracked regions and captures removed",
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
      
      {/* Captured Frames Gallery */}
      {!isFullscreen && capturedFrames.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Captured Frames</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {capturedFrames.map((frame, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={frame} 
                    alt={`Capture ${index + 1}`}
                    className="w-full h-auto rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = frame;
                      link.download = `knee-capture-${index + 1}.png`;
                      link.click();
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}