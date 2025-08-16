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
import type { 
  MovementSession, 
  JointMeasurement,
  MovementImpairment,
  InsertMovementSession 
} from '@shared/movementAnalysisSchema';

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
    id: 'squat',
    name: 'Squat Assessment',
    description: 'Analyze squat mechanics and identify movement impairments',
    duration: 30,
    instructions: [
      'Stand with feet shoulder-width apart',
      'Squat down as low as comfortable',
      'Return to standing position',
      'Repeat 5 times'
    ],
    keyPoints: [
      'Knee alignment',
      'Hip hinge pattern',
      'Trunk position',
      'Ankle mobility'
    ]
  },
  {
    id: 'single_leg_stance',
    name: 'Single Leg Stance',
    description: 'Assess balance and hip stability',
    duration: 30,
    instructions: [
      'Stand on one leg',
      'Hold for 10 seconds',
      'Switch to other leg',
      'Maintain balance without support'
    ],
    keyPoints: [
      'Pelvic stability',
      'Trunk control',
      'Hip drop (Trendelenburg)',
      'Balance strategy'
    ]
  },
  {
    id: 'lunge',
    name: 'Lunge Assessment',
    description: 'Evaluate lower extremity control and stability',
    duration: 30,
    instructions: [
      'Step forward into lunge position',
      'Lower back knee toward ground',
      'Return to standing',
      'Alternate legs'
    ],
    keyPoints: [
      'Knee tracking',
      'Hip stability',
      'Trunk alignment',
      'Dynamic balance'
    ]
  },
  {
    id: 'shoulder_flexion',
    name: 'Shoulder Flexion Test',
    description: 'Assess shoulder mobility and scapular control',
    duration: 20,
    instructions: [
      'Stand with arms at sides',
      'Raise arms overhead',
      'Lower back down',
      'Repeat 5 times'
    ],
    keyPoints: [
      'Range of motion',
      'Scapular rhythm',
      'Compensation patterns',
      'Symmetry'
    ]
  },
  {
    id: 'gait',
    name: 'Gait Analysis',
    description: 'Analyze walking pattern and identify deviations',
    duration: 60,
    instructions: [
      'Walk naturally',
      'Maintain normal pace',
      'Walk back and forth',
      'Continue for assessment duration'
    ],
    keyPoints: [
      'Step length',
      'Cadence',
      'Arm swing',
      'Trunk stability'
    ]
  }
];

export default function MovementAnalysis() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AssessmentTest>(ASSESSMENT_TESTS[0]);
  const [currentMetrics, setCurrentMetrics] = useState<MovementMetrics | null>(null);
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
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number>();
  const recordingIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize MediaPipe Pose
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const pose = new Pose({
      locateFile: (file) => {
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

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (poseRef.current && !isPaused) {
          await poseRef.current.send({ image: videoRef.current! });
        }
      },
      width: 1280,
      height: 720
    });

    cameraRef.current = camera;
    camera.start();

    return () => {
      camera.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused]);

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

      // Analyze movement
      const metrics = analyzeMovementQuality(results.poseLandmarks);
      setCurrentMetrics(metrics);

      // Detect impairments
      const detectedImpairments: string[] = [];
      
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

      setImpairments(detectedImpairments);

      // Record data if recording
      if (isRecording && !isPaused) {
        const timestamp = Date.now() - (sessionStartTime || Date.now());
        setRecordedData(prev => [...prev, {
          timestamp,
          landmarks: results.poseLandmarks,
          metrics,
          impairments: detectedImpairments
        }]);
      }

      // Draw joint angles on canvas
      if (metrics) {
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;

        metrics.jointAngles.forEach((angle: JointAngle, index: number) => {
          if (!angle.isWithinNormal) {
            const y = 30 + index * 20;
            const text = `${angle.joint}: ${angle.angle.toFixed(1)}°`;
            ctx.strokeText(text, 10, y);
            ctx.fillText(text, 10, y);
          }
        });
      }
    }

    ctx.restore();
  }, [isRecording, isPaused, sessionStartTime]);

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
    setIsRecording(true);
    setIsPaused(false);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    setRecordedData([]);
    toast({
      title: "Recording Started",
      description: `Performing ${selectedTest.name}`,
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
      assessmentType: selectedTest.id,
      duration: elapsedTime,
      overallQuality: currentMetrics?.quality || 'fair',
      measurements: recordedData,
      impairments: [...new Set(recordedData.flatMap(d => d.impairments))]
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
        impairments: [...new Set(recordedData.flatMap(d => d.impairments))],
        recommendations: generateRecommendations(impairments)
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
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
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex ${isFullscreen ? 'p-2' : 'p-6'} gap-6 overflow-hidden`}>
        {/* Left Panel - Video Feed */}
        <div className={`${isFullscreen ? 'flex-1' : 'w-2/3'} flex flex-col gap-4`}>
          <Card className="flex-1 overflow-hidden">
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
            <CardContent className="p-0 relative">
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover hidden"
                  autoPlay
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  width={1280}
                  height={720}
                />
                
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
                    <Select
                      value={selectedTest.id}
                      onValueChange={(value) => {
                        const test = ASSESSMENT_TESTS.find(t => t.id === value);
                        if (test) setSelectedTest(test);
                      }}
                      disabled={isRecording}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSESSMENT_TESTS.map(test => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedTest.instructions.map((instruction, i) => (
                        <li key={i} className="text-xs">{instruction}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Metrics and Analysis */}
        {!isFullscreen && (
          <div className="w-1/3 flex flex-col gap-4">
            <Tabs defaultValue="metrics" className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
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
                      {currentMetrics ? (
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
                              {generateRecommendations(impairments).map((rec, i) => (
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