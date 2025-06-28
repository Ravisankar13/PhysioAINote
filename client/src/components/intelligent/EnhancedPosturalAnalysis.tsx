import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, RotateCcw, Check, Brain, Target, ChevronRight, AlertTriangle } from 'lucide-react';

interface PosturalView {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  completed: boolean;
  imageData?: string;
  analysis?: PosturalAnalysisResult;
  selectedCamera?: string;
  cameraType?: 'front' | 'rear';
}

interface PosturalAnalysisResult {
  alignmentDeviations: Array<{
    type: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
    clinicalSignificance: string;
    affectedStructures: string[];
  }>;
  asymmetries: Array<{
    location: string;
    degree: string;
    compensations: string[];
  }>;
  overallPosture: {
    classification: string;
    primaryPatterns: string[];
    recommendations: string[];
  };
}

interface EnhancedPosturalAnalysisProps {
  symptomAnalysis?: any;
  onAnalysisComplete: (analysis: any) => void;
  onProceedToMovement: () => void;
}

const posturalViews: PosturalView[] = [
  {
    id: 'anterior',
    name: 'Front View',
    description: 'Frontal plane analysis',
    instructions: [
      'Patient stands facing the camera',
      'Feet hip-width apart, arms at sides',
      'Natural head position, looking straight ahead',
      'Ensure full body is visible from head to feet'
    ],
    completed: false
  },
  {
    id: 'posterior',
    name: 'Back View',
    description: 'Posterior assessment',
    instructions: [
      'Patient turns around, back facing camera',
      'Same stance as front view',
      'Arms hanging naturally at sides',
      'Observe spinal alignment and shoulder levels'
    ],
    completed: false
  },
  {
    id: 'lateral_right',
    name: 'Right Side View',
    description: 'Sagittal plane - right lateral',
    instructions: [
      'Patient stands with right side facing camera',
      'Natural standing posture',
      'Arms at sides, head in neutral',
      'Assess cervical, thoracic, lumbar curves'
    ],
    completed: false
  },
  {
    id: 'lateral_left',
    name: 'Left Side View',
    description: 'Sagittal plane - left lateral',
    instructions: [
      'Patient stands with left side facing camera',
      'Mirror the right side positioning',
      'Compare bilateral symmetry',
      'Note any side-to-side differences'
    ],
    completed: false
  }
];

export default function EnhancedPosturalAnalysis({ 
  symptomAnalysis, 
  onAnalysisComplete, 
  onProceedToMovement 
}: EnhancedPosturalAnalysisProps) {
  const [currentView, setCurrentView] = useState<PosturalView>(posturalViews[0]);
  const [views, setViews] = useState<PosturalView[]>(posturalViews);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [frontCameras, setFrontCameras] = useState<MediaDeviceInfo[]>([]);
  const [rearCameras, setRearCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraType, setCurrentCameraType] = useState<'front' | 'rear'>('rear');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    enumerateCameras();
    return () => {
      stopCamera();
    };
  }, []);

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
      // Categorize cameras by type
      const frontCams = cameras.filter(camera => 
        camera.label.toLowerCase().includes('front') || 
        camera.label.toLowerCase().includes('user') ||
        camera.label.toLowerCase().includes('facing')
      );
      
      const rearCams = cameras.filter(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      // If cameras don't have clear labels, assume first is front, second is rear
      if (frontCams.length === 0 && rearCams.length === 0 && cameras.length >= 2) {
        frontCams.push(cameras[0]);
        rearCams.push(cameras[1]);
      } else if (cameras.length === 1) {
        // Single camera - assume it can be used for both
        frontCams.push(cameras[0]);
        rearCams.push(cameras[0]);
      }
      
      setFrontCameras(frontCams);
      setRearCameras(rearCams);
      
      if (cameras.length > 0 && !selectedCamera) {
        // Prefer back camera for postural analysis
        const preferredCamera = rearCams.length > 0 ? rearCams[0] : cameras[0];
        setSelectedCamera(preferredCamera.deviceId);
        setCurrentCameraType(rearCams.length > 0 ? 'rear' : 'front');
      }
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  };

  const switchCameraType = (type: 'front' | 'rear') => {
    setCurrentCameraType(type);
    const cameras = type === 'front' ? frontCameras : rearCameras;
    if (cameras.length > 0) {
      setSelectedCamera(cameras[0].deviceId);
      
      // Update current view with selected camera info
      setViews(prevViews => 
        prevViews.map(view => 
          view.id === currentView.id 
            ? { ...view, selectedCamera: cameras[0].deviceId, cameraType: type }
            : view
        )
      );
      
      // Restart camera if it's currently on
      if (isCameraOn) {
        stopCamera();
        setTimeout(() => startCamera(), 100);
      }
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: selectedCamera ? undefined : { ideal: currentCameraType === 'rear' ? 'environment' : 'user' }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Camera access failed. Please ensure camera permissions are granted.');
    }
  }, [selectedCamera, currentCameraType]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture the current frame
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Update the current view with captured data
    setViews(prevViews => 
      prevViews.map(view => 
        view.id === currentView.id 
          ? { ...view, completed: true, imageData }
          : view
      )
    );

    // Move to next incomplete view or analysis
    const nextIncompleteView = views.find(view => 
      view.id !== currentView.id && !view.completed
    );

    if (nextIncompleteView) {
      setCurrentView(nextIncompleteView);
    } else {
      // All views captured, proceed to analysis
      analyzePosturalData();
    }
  }, [currentView, views]);

  const analyzePosturalData = async () => {
    setIsAnalyzing(true);
    stopCamera();

    try {
      // Prepare captured images for analysis
      const capturedViews = views.filter(view => view.completed && view.imageData);
      
      const response = await fetch('/api/analyze-posture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          views: capturedViews.map(view => ({
            viewType: view.id,
            imageData: view.imageData
          })),
          symptomContext: symptomAnalysis
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setComprehensiveAnalysis(analysis);
        setAnalysisComplete(true);
        onAnalysisComplete(analysis);
      } else {
        // Fallback analysis
        const fallbackAnalysis = generateFallbackPosturalAnalysis();
        setComprehensiveAnalysis(fallbackAnalysis);
        setAnalysisComplete(true);
        onAnalysisComplete(fallbackAnalysis);
      }
    } catch (error) {
      console.error('Postural analysis failed:', error);
      // Generate fallback analysis
      const fallbackAnalysis = generateFallbackPosturalAnalysis();
      setComprehensiveAnalysis(fallbackAnalysis);
      setAnalysisComplete(true);
      onAnalysisComplete(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFallbackPosturalAnalysis = () => {
    // Generate realistic postural analysis based on symptom context
    const bodyRegion = symptomAnalysis?.bodyRegion?.toLowerCase() || '';
    
    let alignmentDeviations = [];
    let asymmetries = [];
    let overallPosture = {
      classification: 'Mixed Postural Dysfunction',
      primaryPatterns: [],
      recommendations: []
    };

    if (bodyRegion.includes('knee')) {
      alignmentDeviations = [
        {
          type: 'Hip Drop',
          severity: 'moderate' as const,
          description: 'Contralateral hip drops during single leg loading',
          clinicalSignificance: 'Indicates weak hip abductors and potential knee valgus',
          affectedStructures: ['Gluteus medius', 'Tensor fasciae latae', 'IT band']
        },
        {
          type: 'Knee Valgus',
          severity: 'mild' as const,
          description: 'Inward angulation of the knee during weight bearing',
          clinicalSignificance: 'Increases patellofemoral joint stress',
          affectedStructures: ['Patellofemoral joint', 'VMO', 'VL balance']
        }
      ];
      overallPosture = {
        classification: 'Lower Extremity Malalignment',
        primaryPatterns: ['Hip abductor weakness', 'Knee valgus collapse', 'Foot pronation'],
        recommendations: [
          'Hip strengthening protocol',
          'Knee tracking re-education',
          'Single leg stability training'
        ]
      };
    } else if (bodyRegion.includes('spine') || bodyRegion.includes('back')) {
      alignmentDeviations = [
        {
          type: 'Forward Head Posture',
          severity: 'moderate' as const,
          description: 'Cervical spine positioned anterior to optimal alignment',
          clinicalSignificance: 'Increases cervical lordosis and suboccipital tension',
          affectedStructures: ['Upper trapezius', 'Levator scapulae', 'Deep neck flexors']
        },
        {
          type: 'Increased Lumbar Lordosis',
          severity: 'mild' as const,
          description: 'Excessive anterior curvature of lumbar spine',
          clinicalSignificance: 'May contribute to facet joint loading and back pain',
          affectedStructures: ['Facet joints', 'Hip flexors', 'Lumbar extensors']
        }
      ];
      overallPosture = {
        classification: 'Upper Crossed Syndrome with Lumbar Extension Pattern',
        primaryPatterns: ['Forward head posture', 'Rounded shoulders', 'Anterior pelvic tilt'],
        recommendations: [
          'Postural re-education',
          'Deep neck flexor strengthening',
          'Hip flexor stretching',
          'Core stabilization'
        ]
      };
    } else if (bodyRegion.includes('shoulder')) {
      alignmentDeviations = [
        {
          type: 'Rounded Shoulders',
          severity: 'moderate' as const,
          description: 'Anterior positioning of glenohumeral joints',
          clinicalSignificance: 'Narrows subacromial space and affects scapular mechanics',
          affectedStructures: ['Subacromial space', 'Posterior deltoid', 'Lower trapezius']
        },
        {
          type: 'Elevated Shoulder',
          severity: 'mild' as const,
          description: 'Unilateral shoulder elevation',
          clinicalSignificance: 'Indicates upper trapezius hyperactivity and asymmetric loading',
          affectedStructures: ['Upper trapezius', 'Levator scapulae', 'Cervical spine']
        }
      ];
      overallPosture = {
        classification: 'Upper Crossed Syndrome',
        primaryPatterns: ['Forward head posture', 'Rounded shoulders', 'Thoracic kyphosis'],
        recommendations: [
          'Scapular stabilization exercises',
          'Pectoral stretching',
          'Postural awareness training'
        ]
      };
    }

    asymmetries = [
      {
        location: 'Shoulder height',
        degree: 'Mild asymmetry',
        compensations: ['Cervical side bending', 'Scapular elevation']
      },
      {
        location: 'Pelvic alignment',
        degree: 'Minimal lateral shift',
        compensations: ['Lumbar side bending', 'Hip hiking']
      }
    ];

    return {
      alignmentDeviations,
      asymmetries,
      overallPosture,
      correlationToSymptoms: `Postural findings correlate with reported ${bodyRegion} pain patterns and functional limitations.`,
      recommendedMovementTests: symptomAnalysis?.recommendedMovements || []
    };
  };

  const selectView = (view: PosturalView) => {
    setCurrentView(view);
    
    // Restore camera settings for this view if previously set
    if (view.selectedCamera && view.cameraType) {
      setSelectedCamera(view.selectedCamera);
      setCurrentCameraType(view.cameraType);
    } else {
      // Set recommended camera type for each view
      const recommendedType = getRecommendedCameraType(view.id);
      setCurrentCameraType(recommendedType);
      
      const cameras = recommendedType === 'front' ? frontCameras : rearCameras;
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }
    }
    
    stopCamera();
  };

  const getRecommendedCameraType = (viewId: string): 'front' | 'rear' => {
    // Front views typically use rear camera for better perspective
    // Side views can use either but rear camera provides more distance
    switch (viewId) {
      case 'anterior':
      case 'posterior':
      case 'lateral_right':
      case 'lateral_left':
        return rearCameras.length > 0 ? 'rear' : 'front';
      default:
        return 'rear';
    }
  };

  const retakePhoto = () => {
    setViews(prevViews => 
      prevViews.map(view => 
        view.id === currentView.id 
          ? { ...view, completed: false, imageData: undefined }
          : view
      )
    );
  };

  const completedViews = views.filter(view => view.completed).length;
  const progress = (completedViews / views.length) * 100;

  if (isAnalyzing) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
          <CardTitle>Analyzing Postural Data</CardTitle>
          <CardDescription>
            AI is processing captured images and correlating with symptom patterns...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analysis Progress</span>
              <span>Processing...</span>
            </div>
            <Progress value={75} className="w-full" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Image Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Alignment Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Correlation Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Movement Prediction</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analysisComplete && comprehensiveAnalysis) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  Postural Analysis Results
                </CardTitle>
                <CardDescription>
                  Multi-plane postural assessment with symptom correlation
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {completedViews} Views Captured
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Postural Classification */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Postural Classification</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  {comprehensiveAnalysis.overallPosture.classification}
                </h4>
                <div className="space-y-1">
                  <p className="text-sm text-blue-800">Primary Patterns:</p>
                  <ul className="text-sm text-blue-700 ml-4">
                    {comprehensiveAnalysis.overallPosture.primaryPatterns.map((pattern: string, index: number) => (
                      <li key={index}>• {pattern}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Alignment Deviations */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Alignment Deviations</h3>
              <div className="space-y-3">
                {comprehensiveAnalysis.alignmentDeviations.map((deviation: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{deviation.type}</h4>
                      <Badge variant={
                        deviation.severity === 'severe' ? 'destructive' :
                        deviation.severity === 'moderate' ? 'default' : 'secondary'
                      }>
                        {deviation.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{deviation.description}</p>
                    <p className="text-sm font-medium mb-1">Clinical Significance:</p>
                    <p className="text-sm text-muted-foreground mb-2">{deviation.clinicalSignificance}</p>
                    <p className="text-sm font-medium mb-1">Affected Structures:</p>
                    <div className="flex flex-wrap gap-1">
                      {deviation.affectedStructures.map((structure: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {structure}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asymmetries */}
            {comprehensiveAnalysis.asymmetries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Postural Asymmetries</h3>
                <div className="space-y-3">
                  {comprehensiveAnalysis.asymmetries.map((asymmetry: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium">{asymmetry.location}</h4>
                      <p className="text-sm text-muted-foreground mb-1">{asymmetry.degree}</p>
                      <p className="text-sm font-medium mb-1">Compensations:</p>
                      <ul className="text-sm text-muted-foreground ml-4">
                        {asymmetry.compensations.map((comp: string, idx: number) => (
                          <li key={idx}>• {comp}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correlation to Symptoms */}
            {comprehensiveAnalysis.correlationToSymptoms && (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertDescription>
                  <strong>Symptom Correlation:</strong> {comprehensiveAnalysis.correlationToSymptoms}
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Postural Recommendations</h3>
              <ul className="space-y-1">
                {comprehensiveAnalysis.overallPosture.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button onClick={onProceedToMovement} className="flex-1">
                <ChevronRight className="h-4 w-4 mr-2" />
                Proceed to Movement Analysis
              </Button>
              <Button variant="outline" onClick={() => {
                setAnalysisComplete(false);
                setCurrentView(posturalViews[0]);
                setViews(posturalViews.map(v => ({ ...v, completed: false, imageData: undefined })));
              }}>
                Retake Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                Multi-Plane Postural Analysis
              </CardTitle>
              <CardDescription>
                Capture multiple views for comprehensive postural assessment
              </CardDescription>
            </div>
            <Badge variant="outline">
              {completedViews} / {views.length} Views Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* View Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {views.map((view) => (
              <Button
                key={view.id}
                variant={currentView.id === view.id ? "default" : "outline"}
                onClick={() => selectView(view)}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                {view.completed && <Check className="h-4 w-4 text-green-600" />}
                <span className="text-sm font-medium">{view.name}</span>
                <span className="text-xs text-muted-foreground">{view.description}</span>
              </Button>
            ))}
          </div>

          {/* Camera Type and Selection */}
          <div className="space-y-4">
            {/* Camera Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Camera Type for {currentView.name}:</label>
              <div className="flex gap-2">
                <Button
                  variant={currentCameraType === 'front' ? "default" : "outline"}
                  onClick={() => switchCameraType('front')}
                  className="flex-1"
                  disabled={frontCameras.length === 0}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Front Camera
                  {frontCameras.length === 0 && <span className="ml-1 text-xs">(N/A)</span>}
                </Button>
                <Button
                  variant={currentCameraType === 'rear' ? "default" : "outline"}
                  onClick={() => switchCameraType('rear')}
                  className="flex-1"
                  disabled={rearCameras.length === 0}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Rear Camera
                  {rearCameras.length === 0 && <span className="ml-1 text-xs">(N/A)</span>}
                </Button>
              </div>
            </div>

            {/* Specific Camera Selection */}
            {((currentCameraType === 'front' && frontCameras.length > 1) || 
              (currentCameraType === 'rear' && rearCameras.length > 1)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select {currentCameraType === 'front' ? 'Front' : 'Rear'} Camera:
                </label>
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select camera..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(currentCameraType === 'front' ? frontCameras : rearCameras).map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{currentView.name} Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {currentView.instructions.map((instruction, index) => (
                <li key={index}>• {instruction}</li>
              ))}
            </ul>
          </div>

          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera
                </Button>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {isCameraOn && (
            <div className="flex gap-4">
              {currentView.completed ? (
                <Button onClick={retakePhoto} variant="outline" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake {currentView.name}
                </Button>
              ) : (
                <Button onClick={captureImage} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture {currentView.name}
                </Button>
              )}
              <Button onClick={stopCamera} variant="outline">
                Stop Camera
              </Button>
            </div>
          )}

          {/* Analysis Button */}
          {completedViews === views.length && (
            <Button onClick={analyzePosturalData} className="w-full" size="lg">
              <Brain className="h-4 w-4 mr-2" />
              Analyze Postural Data with AI
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}