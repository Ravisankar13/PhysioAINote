import { useRef, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, CameraOff, RefreshCw, AlertCircle, User, Crosshair, Eye, Scan, Loader2, ChevronDown, ChevronUp, Zap, Activity } from 'lucide-react';
import { loadMediaPipeLibraries } from '@/utils/mediapipeLoader';
import { MEDIAPIPE_CONFIG, checkMediaPipeSupport } from '@/config/mediapipe';
import { convertMediaPipeTo3D, Posesmoother, Skeleton3DPose } from '@/utils/mediapipeTo3D';

export interface FocusedRegion {
  id: string;
  label: string;
  joints: string[];
  landmarkIndices: number[];
  description: string;
  clinicalFocus: string[];
  icon: string;
}

export const FOCUSED_REGIONS: FocusedRegion[] = [
  {
    id: 'full_body',
    label: 'Full Body',
    joints: ['all'],
    landmarkIndices: [],
    description: 'Full body posture and movement capture',
    clinicalFocus: ['Overall posture', 'Gait pattern', 'Movement symmetry'],
    icon: '🧍'
  },
  {
    id: 'right_ankle',
    label: 'Right Ankle',
    joints: ['rightKnee', 'rightAnkle'],
    landmarkIndices: [24, 26, 28, 30, 32],
    description: 'Right ankle joint complex',
    clinicalFocus: ['Dorsiflexion ROM', 'Inversion/Eversion', 'Swelling', 'Alignment', 'Weight bearing'],
    icon: '🦶'
  },
  {
    id: 'left_ankle',
    label: 'Left Ankle',
    joints: ['leftKnee', 'leftAnkle'],
    landmarkIndices: [23, 25, 27, 29, 31],
    description: 'Left ankle joint complex',
    clinicalFocus: ['Dorsiflexion ROM', 'Inversion/Eversion', 'Swelling', 'Alignment', 'Weight bearing'],
    icon: '🦶'
  },
  {
    id: 'right_knee',
    label: 'Right Knee',
    joints: ['rightHip', 'rightKnee'],
    landmarkIndices: [24, 26, 28],
    description: 'Right knee joint',
    clinicalFocus: ['Extension deficit', 'Valgus/Varus alignment', 'Effusion', 'Patellar tracking', 'Hyperextension'],
    icon: '🦵'
  },
  {
    id: 'left_knee',
    label: 'Left Knee',
    joints: ['leftHip', 'leftKnee'],
    landmarkIndices: [23, 25, 27],
    description: 'Left knee joint',
    clinicalFocus: ['Extension deficit', 'Valgus/Varus alignment', 'Effusion', 'Patellar tracking', 'Hyperextension'],
    icon: '🦵'
  },
  {
    id: 'right_hip',
    label: 'Right Hip',
    joints: ['rightHip', 'pelvis'],
    landmarkIndices: [23, 24, 26, 12],
    description: 'Right hip and pelvic region',
    clinicalFocus: ['Hip flexion/extension', 'Trendelenburg sign', 'Pelvic obliquity', 'Gait deviation'],
    icon: '🦴'
  },
  {
    id: 'left_hip',
    label: 'Left Hip',
    joints: ['leftHip', 'pelvis'],
    landmarkIndices: [23, 24, 25, 11],
    description: 'Left hip and pelvic region',
    clinicalFocus: ['Hip flexion/extension', 'Trendelenburg sign', 'Pelvic obliquity', 'Gait deviation'],
    icon: '🦴'
  },
  {
    id: 'right_shoulder',
    label: 'Right Shoulder',
    joints: ['rightShoulder', 'rightElbow'],
    landmarkIndices: [12, 14, 16, 11],
    description: 'Right shoulder complex',
    clinicalFocus: ['Elevation ROM', 'Scapular rhythm', 'Impingement signs', 'Rotator cuff function'],
    icon: '💪'
  },
  {
    id: 'left_shoulder',
    label: 'Left Shoulder',
    joints: ['leftShoulder', 'leftElbow'],
    landmarkIndices: [11, 13, 15, 12],
    description: 'Left shoulder complex',
    clinicalFocus: ['Elevation ROM', 'Scapular rhythm', 'Impingement signs', 'Rotator cuff function'],
    icon: '💪'
  },
  {
    id: 'cervical_spine',
    label: 'Neck / Cervical',
    joints: ['neck'],
    landmarkIndices: [0, 7, 8, 11, 12],
    description: 'Cervical spine and head position',
    clinicalFocus: ['Forward head posture', 'Cervical ROM', 'Lateral flexion', 'Rotation deficit'],
    icon: '🗣️'
  },
  {
    id: 'lumbar_spine',
    label: 'Low Back / Lumbar',
    joints: ['spine', 'pelvis'],
    landmarkIndices: [11, 12, 23, 24],
    description: 'Lumbar spine and pelvis',
    clinicalFocus: ['Lordosis', 'Flexion ROM', 'Lateral shift', 'Pelvic tilt', 'Movement control'],
    icon: '🔙'
  },
  {
    id: 'right_leg',
    label: 'Right Leg (Full)',
    joints: ['rightHip', 'rightKnee'],
    landmarkIndices: [24, 26, 28, 30, 32],
    description: 'Full right lower extremity',
    clinicalFocus: ['Limb alignment', 'Movement mechanics', 'Weight distribution', 'Step pattern'],
    icon: '🦿'
  },
  {
    id: 'left_leg',
    label: 'Left Leg (Full)',
    joints: ['leftHip', 'leftKnee'],
    landmarkIndices: [23, 25, 27, 29, 31],
    description: 'Full left lower extremity',
    clinicalFocus: ['Limb alignment', 'Movement mechanics', 'Weight distribution', 'Step pattern'],
    icon: '🦿'
  },
];

export interface CameraFinding {
  type: 'swelling' | 'alignment' | 'movement' | 'rom' | 'skin' | 'deformity' | 'muscle' | 'gait' | 'posture';
  region: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  clinicalSignificance: string;
  suggestedActions: string[];
}

export interface FocusedCameraResult {
  region: FocusedRegion;
  findings: CameraFinding[];
  jointAngles: Record<string, number>;
  overallAssessment: string;
  suggestedMarkers: Array<{
    region: string;
    symptomType: string;
    description: string;
  }>;
  suggestedPostureAdjustments: Record<string, number>;
  timestamp: number;
}

interface FocusedCameraCaptureProps {
  onPoseUpdate?: (pose: Skeleton3DPose) => void;
  onRawLandmarks?: (landmarks: any[]) => void;
  onFocusedAnalysisComplete?: (result: FocusedCameraResult) => void;
  onRegionChange?: (region: FocusedRegion) => void;
  className?: string;
  isActive?: boolean;
}

export default function FocusedCameraCapture({
  onPoseUpdate,
  onRawLandmarks,
  onFocusedAnalysisComplete,
  onRegionChange,
  className,
  isActive: externalIsActive
}: FocusedCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const smootherRef = useRef<Posesmoother>(new Posesmoother(0.4));
  const animationFrameRef = useRef<number | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalysisRef = useRef<number>(0);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [poseDetected, setPoseDetected] = useState(false);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  const [selectedRegion, setSelectedRegion] = useState<FocusedRegion>(FOCUSED_REGIONS[0]);
  const [cameraType, setCameraType] = useState<'full_body' | 'focused'>('full_body');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<FocusedCameraResult | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [computedAngles, setComputedAngles] = useState<Record<string, number>>({});

  useEffect(() => {
    if (onRegionChange) {
      onRegionChange(selectedRegion);
    }
  }, [selectedRegion, onRegionChange]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    setIsActive(false);
    setPoseDetected(false);
    setFps(0);
  }, []);

  useEffect(() => {
    if (externalIsActive === false && isActive) {
      stopCamera();
    }
  }, [externalIsActive, isActive, stopCamera]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const computeRegionAngles = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return {};

    const angle3D = (a: any, b: any, c: any) => {
      const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
      const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
      const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
      const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
      const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);
      if (magBA < 0.001 || magBC < 0.001) return 0;
      return Math.acos(Math.min(1, Math.max(-1, dot / (magBA * magBC)))) * (180 / Math.PI);
    };

    const angles: Record<string, number> = {};
    const region = selectedRegion.id;

    if (region.includes('knee') || region.includes('leg') || region === 'full_body') {
      angles['Right Knee Flexion'] = Math.round(180 - angle3D(landmarks[24], landmarks[26], landmarks[28]));
      angles['Left Knee Flexion'] = Math.round(180 - angle3D(landmarks[23], landmarks[25], landmarks[27]));
    }
    if (region.includes('ankle') || region.includes('leg') || region === 'full_body') {
      angles['Right Ankle Dorsiflexion'] = Math.round(angle3D(landmarks[26], landmarks[28], landmarks[32]) - 90);
      angles['Left Ankle Dorsiflexion'] = Math.round(angle3D(landmarks[25], landmarks[27], landmarks[31]) - 90);
    }
    if (region.includes('hip') || region.includes('leg') || region === 'full_body') {
      angles['Right Hip Flexion'] = Math.round(180 - angle3D(landmarks[12], landmarks[24], landmarks[26]));
      angles['Left Hip Flexion'] = Math.round(180 - angle3D(landmarks[11], landmarks[23], landmarks[25]));
    }
    if (region.includes('shoulder') || region === 'full_body') {
      angles['Right Shoulder Flexion'] = Math.round(180 - angle3D(landmarks[24], landmarks[12], landmarks[14]));
      angles['Left Shoulder Flexion'] = Math.round(180 - angle3D(landmarks[23], landmarks[11], landmarks[13]));
      angles['Right Elbow Flexion'] = Math.round(180 - angle3D(landmarks[12], landmarks[14], landmarks[16]));
      angles['Left Elbow Flexion'] = Math.round(180 - angle3D(landmarks[11], landmarks[13], landmarks[15]));
    }
    if (region.includes('cervical') || region === 'full_body') {
      const midShoulder = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2,
        z: ((landmarks[11].z || 0) + (landmarks[12].z || 0)) / 2
      };
      angles['Head Forward Angle'] = Math.round(angle3D(landmarks[0], midShoulder, { x: midShoulder.x, y: midShoulder.y - 1, z: midShoulder.z }));
    }
    if (region.includes('lumbar') || region === 'full_body') {
      const midHip = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2,
        z: ((landmarks[23].z || 0) + (landmarks[24].z || 0)) / 2
      };
      const midShoulder = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2,
        z: ((landmarks[11].z || 0) + (landmarks[12].z || 0)) / 2
      };
      angles['Trunk Inclination'] = Math.round(angle3D(midShoulder, midHip, { x: midHip.x, y: midHip.y - 1, z: midHip.z }) - 180);
    }

    return angles;
  }, [selectedRegion]);

  const captureFrameForAnalysis = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current || isAnalyzing) return;
    if (Date.now() - lastAnalysisRef.current < 5000) return;

    setIsAnalyzing(true);
    lastAnalysisRef.current = Date.now();

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      if (mirrorVideo) {
        tempCtx.scale(-1, 1);
        tempCtx.translate(-tempCanvas.width, 0);
      }
      tempCtx.drawImage(videoRef.current, 0, 0);

      const imageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);

      const response = await fetch('/api/physiogpt/focused-camera-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image: imageDataUrl,
          region: selectedRegion,
          computedAngles,
          cameraType,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();

      const result: FocusedCameraResult = {
        region: selectedRegion,
        findings: data.findings || [],
        jointAngles: { ...computedAngles, ...(data.jointAngles || {}) },
        overallAssessment: data.overallAssessment || '',
        suggestedMarkers: data.suggestedMarkers || [],
        suggestedPostureAdjustments: data.suggestedPostureAdjustments || {},
        timestamp: Date.now(),
      };

      setAnalysisResults(result);
      setShowDetails(true);

      if (onFocusedAnalysisComplete) {
        onFocusedAnalysisComplete(result);
      }
    } catch (err: any) {
      console.error('Focused analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, selectedRegion, computedAngles, cameraType, mirrorVideo, onFocusedAnalysisComplete]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const support = checkMediaPipeSupport();
      if (!support.supported) {
        throw new Error(support.error || 'MediaPipe not supported');
      }

      const loaded = await loadMediaPipeLibraries();
      if (!loaded) {
        throw new Error('Failed to load MediaPipe libraries');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode
        }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const pose = new window.Pose({
        locateFile: MEDIAPIPE_CONFIG.pose.locateFile
      });

      pose.setOptions({
        modelComplexity: cameraType === 'focused' ? 2 : 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: cameraType === 'focused' ? 0.7 : 0.6,
        minTrackingConfidence: cameraType === 'focused' ? 0.7 : 0.6
      });

      pose.onResults((results: any) => {
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFrameTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          setPoseDetected(true);

          const regionAngles = computeRegionAngles(results.poseLandmarks);
          setComputedAngles(regionAngles);

          if (onRawLandmarks) {
            onRawLandmarks(results.poseLandmarks);
          }

          if (onPoseUpdate) {
            const pose3D = convertMediaPipeTo3D(results.poseLandmarks, false);
            const smoothedPose = smootherRef.current.smooth(pose3D);
            onPoseUpdate(smoothedPose);
          }

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;

              ctx.save();
              if (mirrorVideo) {
                ctx.scale(-1, 1);
                ctx.translate(-canvasRef.current.width, 0);
              }
              ctx.drawImage(videoRef.current, 0, 0);
              ctx.restore();

              const lms = mirrorVideo
                ? results.poseLandmarks.map((lm: any) => ({ ...lm, x: 1 - lm.x }))
                : results.poseLandmarks;

              if (cameraType === 'focused' && selectedRegion.id !== 'full_body') {
                const regionLandmarks = selectedRegion.landmarkIndices;

                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);

                if (regionLandmarks.length >= 2) {
                  let minX = 1, maxX = 0, minY = 1, maxY = 0;
                  regionLandmarks.forEach(idx => {
                    if (idx < lms.length) {
                      minX = Math.min(minX, lms[idx].x);
                      maxX = Math.max(maxX, lms[idx].x);
                      minY = Math.min(minY, lms[idx].y);
                      maxY = Math.max(maxY, lms[idx].y);
                    }
                  });
                  const pad = 0.08;
                  const rx = (minX - pad) * canvasRef.current.width;
                  const ry = (minY - pad) * canvasRef.current.height;
                  const rw = (maxX - minX + 2 * pad) * canvasRef.current.width;
                  const rh = (maxY - minY + 2 * pad) * canvasRef.current.height;
                  ctx.strokeRect(rx, ry, rw, rh);

                  ctx.font = '14px sans-serif';
                  ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
                  ctx.fillText(`📍 ${selectedRegion.label}`, rx + 4, ry - 6);
                }
                ctx.setLineDash([]);

                regionLandmarks.forEach(idx => {
                  if (idx < lms.length) {
                    const x = lms[idx].x * canvasRef.current!.width;
                    const y = lms[idx].y * canvasRef.current!.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = '#00FFFF';
                    ctx.fill();
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }
                });
              }

              if (window.drawConnectors && window.drawLandmarks) {
                const color = cameraType === 'focused' ? '#00FFFF' : '#00FF00';
                window.drawConnectors(ctx, lms, window.POSE_CONNECTIONS, { color, lineWidth: 2 });
                window.drawLandmarks(ctx, lms, { color: '#FF0000', lineWidth: 1, radius: 3 });
              }

              if (Object.keys(regionAngles).length > 0) {
                ctx.font = 'bold 13px monospace';
                ctx.textBaseline = 'top';
                const startY = 10;
                Object.entries(regionAngles).forEach(([label, value], i) => {
                  const text = `${label}: ${value}°`;
                  const y = startY + i * 20;
                  ctx.fillStyle = 'rgba(0,0,0,0.7)';
                  ctx.fillRect(8, y - 2, ctx.measureText(text).width + 12, 18);
                  ctx.fillStyle = Math.abs(value) > 15 ? '#FF6B6B' : '#00FF88';
                  ctx.fillText(text, 14, y);
                });
              }
            }
          }

          if (autoAnalyze && cameraType === 'focused' && selectedRegion.id !== 'full_body') {
            if (!analysisTimerRef.current && Date.now() - lastAnalysisRef.current > 8000) {
              analysisTimerRef.current = setTimeout(() => {
                captureFrameForAnalysis();
                analysisTimerRef.current = null;
              }, 3000);
            }
          }
        } else {
          setPoseDetected(false);
        }
      });

      await pose.initialize();
      poseRef.current = pose;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });

      await camera.start();
      cameraRef.current = camera;
      setIsActive(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setError(err.message || 'Failed to start camera');
      setIsLoading(false);
      stopCamera();
    }
  }, [onPoseUpdate, onRawLandmarks, mirrorVideo, stopCamera, cameraType, selectedRegion, computeRegionAngles, autoAnalyze, captureFrameForAnalysis, facingMode]);

  const toggleCamera = useCallback(() => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isActive, startCamera, stopCamera]);

  const switchFacingMode = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    setMirrorVideo(newMode === 'user');
    if (isActive) {
      stopCamera();
      setTimeout(() => startCamera(), 300);
    }
  }, [facingMode, isActive, stopCamera, startCamera]);

  const severityColor = (severity: string) => {
    if (severity === 'severe') return 'text-red-400 bg-red-900/30 border-red-700';
    if (severity === 'moderate') return 'text-amber-400 bg-amber-900/30 border-amber-700';
    return 'text-green-400 bg-green-900/30 border-green-700';
  };

  return (
    <Card className={`${className} bg-slate-900 border-slate-700 flex flex-col h-full`}>
      <div className="flex-none px-3 pt-3 pb-2 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Clinical Camera</span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant={poseDetected ? "default" : "secondary"} className={`text-xs ${poseDetected ? "bg-green-600" : ""}`}>
                {poseDetected ? `${fps} FPS` : 'Searching...'}
              </Badge>
            )}
            {isAnalyzing && (
              <Badge className="bg-purple-600 text-xs animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={cameraType} onValueChange={(v) => setCameraType(v as any)} className="w-full">
          <TabsList className="w-full h-7 bg-slate-800">
            <TabsTrigger value="full_body" className="text-xs flex-1 h-6">
              <User className="h-3 w-3 mr-1" />
              Full Body
            </TabsTrigger>
            <TabsTrigger value="focused" className="text-xs flex-1 h-6">
              <Crosshair className="h-3 w-3 mr-1" />
              Focused
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {cameraType === 'focused' && (
          <div className="mt-2">
            <Select
              value={selectedRegion.id}
              onValueChange={(v) => {
                const region = FOCUSED_REGIONS.find(r => r.id === v);
                if (region) setSelectedRegion(region);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue placeholder="Select body region" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                {FOCUSED_REGIONS.filter(r => r.id !== 'full_body').map(region => (
                  <SelectItem key={region.id} value={region.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span>{region.icon}</span>
                      <span>{region.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRegion.id !== 'full_body' && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {selectedRegion.clinicalFocus.slice(0, 3).map(focus => (
                  <Badge key={focus} variant="secondary" className="text-[10px] bg-slate-800 text-cyan-400">
                    {focus}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CardContent className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
        {error && (
          <div className="p-2 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2 text-red-300 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

          {!isActive && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              {cameraType === 'focused' ? (
                <>
                  <Crosshair className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Focused Camera Mode</p>
                  <p className="text-xs text-slate-500 mt-1">Point camera at the {selectedRegion.label}</p>
                  <p className="text-xs text-slate-500">Use phone rear camera for best results</p>
                </>
              ) : (
                <>
                  <User className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Full Body Capture</p>
                  <p className="text-xs text-slate-500 mt-1">Stand in frame facing the camera</p>
                </>
              )}
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-white text-sm">Starting camera...</span>
            </div>
          )}

          {cameraType === 'focused' && isActive && selectedRegion.id !== 'full_body' && (
            <div className="absolute top-2 right-2 bg-cyan-500/20 border border-cyan-500/50 rounded px-2 py-1">
              <span className="text-xs text-cyan-300 font-medium">{selectedRegion.icon} {selectedRegion.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <Button
            onClick={toggleCamera}
            disabled={isLoading}
            size="sm"
            className={`h-8 text-xs ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"}`}
          >
            {isActive ? <><CameraOff className="h-3.5 w-3.5 mr-1.5" />Stop</> : <><Camera className="h-3.5 w-3.5 mr-1.5" />Start</>}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-600" onClick={switchFacingMode}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {facingMode === 'user' ? 'Front' : 'Rear'}
            </Button>

            {cameraType === 'focused' && isActive && poseDetected && (
              <Button
                size="sm"
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                onClick={captureFrameForAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                AI Analyze
              </Button>
            )}
          </div>
        </div>

        {cameraType === 'focused' && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Switch id="auto-analyze" checked={autoAnalyze} onCheckedChange={setAutoAnalyze} className="scale-75" />
              <Label htmlFor="auto-analyze" className="text-[11px] text-slate-400">Auto-analyze</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch id="mirror-cam" checked={mirrorVideo} onCheckedChange={setMirrorVideo} className="scale-75" />
              <Label htmlFor="mirror-cam" className="text-[11px] text-slate-400">Mirror</Label>
            </div>
          </div>
        )}

        {Object.keys(computedAngles).length > 0 && isActive && (
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="h-3 w-3 text-cyan-400" />
              <span className="text-[11px] font-medium text-slate-300">Live Joint Angles</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(computedAngles).map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-900/50">
                  <span className="text-slate-400 truncate mr-1">{label}</span>
                  <span className={`font-mono font-medium ${Math.abs(value) > 15 ? 'text-amber-400' : 'text-green-400'}`}>
                    {value}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResults && showDetails && (
          <div className="bg-slate-800/50 rounded-lg border border-cyan-700/30 flex-shrink-0">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-cyan-300"
            >
              <span className="flex items-center gap-1.5">
                <Scan className="h-3.5 w-3.5" />
                AI Vision Findings ({analysisResults.findings.length})
              </span>
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showDetails && (
              <div className="px-3 pb-3 space-y-2">
                {analysisResults.overallAssessment && (
                  <p className="text-[11px] text-slate-300 leading-relaxed">{analysisResults.overallAssessment}</p>
                )}

                {analysisResults.findings.map((finding, i) => (
                  <div key={i} className={`p-2 rounded border text-[11px] ${severityColor(finding.severity)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize">{finding.type}: {finding.region}</span>
                      <Badge className={`text-[9px] ${severityColor(finding.severity)}`}>
                        {finding.severity}
                      </Badge>
                    </div>
                    <p className="opacity-80">{finding.description}</p>
                    {finding.clinicalSignificance && (
                      <p className="mt-1 text-slate-400 italic">{finding.clinicalSignificance}</p>
                    )}
                  </div>
                ))}

                {analysisResults.suggestedMarkers.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Suggested Markers:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisResults.suggestedMarkers.map((m, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] bg-purple-900/30 text-purple-300 border-purple-700">
                          {m.symptomType}: {m.region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
