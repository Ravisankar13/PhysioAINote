import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';
import { isMobileDevice } from '@/config/mediapipe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, CameraOff, Play, Pause, RotateCcw, Save, Activity, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MovementData {
  timestamp: number;
  poses: poseDetection.Pose[];
  movementType: string;
  qualityScore: number;
  jointAngles?: Record<string, number>;
  velocity?: Record<string, number>;
  acceleration?: Record<string, number>;
}

interface MovementCaptureProps {
  onCaptureComplete?: (data: MovementData[]) => void;
  onAnalysisComplete?: (analysis: any) => void;
  patientId?: number;
  selectedMovement?: string;
}

export const MovementCapture: React.FC<MovementCaptureProps> = ({
  onCaptureComplete,
  onAnalysisComplete,
  patientId,
  selectedMovement = 'general'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedData, setCapturedData] = useState<MovementData[]>([]);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [movementType, setMovementType] = useState(selectedMovement);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [predictiveResults, setPredictiveResults] = useState<any>(null);
  const [abnormalityResults, setAbnormalityResults] = useState<any>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const animationRef = useRef<number>();

  // Movement types for clinical assessment
  const movementTypes = [
    { value: 'general', label: 'General Movement' },
    { value: 'shoulder_flexion', label: 'Shoulder Flexion' },
    { value: 'shoulder_abduction', label: 'Shoulder Abduction' },
    { value: 'hip_flexion', label: 'Hip Flexion' },
    { value: 'knee_flexion', label: 'Knee Flexion' },
    { value: 'squat', label: 'Squat' },
    { value: 'single_leg_stance', label: 'Single Leg Stance' },
    { value: 'gait', label: 'Gait Analysis' },
    { value: 'balance', label: 'Balance Test' },
    { value: 'reach_test', label: 'Functional Reach' }
  ];

  // Initialize pose detection
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        const detectorConfig: poseDetection.MoveNetModelConfig = {
          modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
          enableTracking: true,
          trackerType: poseDetection.TrackerType.BoundingBox
        };
        
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        setDetector(detector);
      } catch (error) {
        console.error('Failed to initialize pose detector:', error);
      }
    };

    initializeDetector();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: isMobileDevice() ? { ideal: 'environment' } : 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Failed to access camera:', error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
      setIsRecording(false);
    }
  };

  // Calculate joint angles from pose keypoints
  const calculateJointAngles = (pose: poseDetection.Pose): Record<string, number> => {
    const angles: Record<string, number> = {};
    const keypoints = pose.keypoints;

    // Helper function to calculate angle between three points
    const calculateAngle = (a: poseDetection.Keypoint, b: poseDetection.Keypoint, c: poseDetection.Keypoint) => {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * 180 / Math.PI);
      if (angle > 180) angle = 360 - angle;
      return angle;
    };

    // Find keypoints by name
    const getKeypoint = (name: string) => keypoints.find(kp => kp.name === name);

    // Calculate key joint angles
    const leftShoulder = getKeypoint('left_shoulder');
    const leftElbow = getKeypoint('left_elbow');
    const leftWrist = getKeypoint('left_wrist');
    const leftHip = getKeypoint('left_hip');
    const leftKnee = getKeypoint('left_knee');
    const leftAnkle = getKeypoint('left_ankle');
    
    if (leftShoulder && leftElbow && leftWrist) {
      angles.leftElbow = calculateAngle(leftShoulder, leftElbow, leftWrist);
    }
    
    if (leftHip && leftKnee && leftAnkle) {
      angles.leftKnee = calculateAngle(leftHip, leftKnee, leftAnkle);
    }

    // Calculate shoulder flexion/abduction based on movement type
    if (movementType === 'shoulder_flexion' || movementType === 'shoulder_abduction') {
      if (leftShoulder && leftElbow && leftHip) {
        angles.leftShoulderFlexion = calculateAngle(leftHip, leftShoulder, leftElbow);
      }
    }

    return angles;
  };

  // Calculate movement quality score
  const calculateQualityScore = (pose: poseDetection.Pose, jointAngles: Record<string, number>): number => {
    let score = 0;
    let factors = 0;

    // Check keypoint confidence
    const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / pose.keypoints.length;
    score += avgConfidence * 30;
    factors++;

    // Movement-specific quality checks
    switch (movementType) {
      case 'shoulder_flexion':
        if (jointAngles.leftShoulderFlexion) {
          // Ideal range: 160-180 degrees
          const flexion = jointAngles.leftShoulderFlexion;
          if (flexion >= 160 && flexion <= 180) score += 40;
          else if (flexion >= 140 && flexion < 160) score += 30;
          else if (flexion >= 120 && flexion < 140) score += 20;
          else score += 10;
          factors++;
        }
        break;

      case 'knee_flexion':
        if (jointAngles.leftKnee) {
          // Ideal range: 130-140 degrees when fully flexed
          const flexion = jointAngles.leftKnee;
          if (flexion <= 30) score += 40; // Full extension
          else if (flexion >= 120 && flexion <= 140) score += 40; // Full flexion
          else score += 20;
          factors++;
        }
        break;

      case 'squat':
        // Check for proper squat form
        const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
        const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
        const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
        
        if (leftHip && leftKnee && leftAnkle) {
          // Check if knee doesn't go past toes
          if (leftKnee.x <= leftAnkle.x + 20) score += 20;
          // Check hip depth
          if (leftHip.y >= leftKnee.y - 10) score += 20;
          factors++;
        }
        break;

      default:
        // General movement quality based on stability
        score += 30;
        factors++;
    }

    return factors > 0 ? Math.min(100, score / factors) : 0;
  };

  // Detect poses and record movement
  const detectPoses = useCallback(async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isRecording) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(detectPoses);
      return;
    }

    // Detect poses
    const poses = await detector.estimatePoses(video);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (poses.length > 0) {
      const pose = poses[0];
      
      // Draw skeleton
      drawSkeleton(ctx, pose);

      // Calculate metrics
      const jointAngles = calculateJointAngles(pose);
      const qualityScore = calculateQualityScore(pose, jointAngles);
      setCurrentQuality(qualityScore);

      // Record movement data
      const movementData: MovementData = {
        timestamp: Date.now(),
        poses,
        movementType,
        qualityScore,
        jointAngles
      };

      setCapturedData(prev => [...prev, movementData]);
    }

    animationRef.current = requestAnimationFrame(detectPoses);
  }, [detector, isRecording, movementType]);

  // Draw skeleton on canvas
  const drawSkeleton = (ctx: CanvasRenderingContext2D, pose: poseDetection.Pose) => {
    const keypoints = pose.keypoints;
    
    // Draw keypoints
    keypoints.forEach(keypoint => {
      if (keypoint.score && keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = keypoint.score > 0.5 ? '#00ff00' : '#ffff00';
        ctx.fill();
      }
    });

    // Draw skeleton connections
    const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
    connections.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      
      if (kp1.score && kp1.score > 0.3 && kp2.score && kp2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  // Start/stop recording
  useEffect(() => {
    if (isRecording) {
      detectPoses();
    }
  }, [isRecording, detectPoses]);

  // Analyze captured movement with AI
  const analyzeMovement = async () => {
    if (capturedData.length === 0) return;
    
    setIsAnalyzing(true);
    
    try {
      // Primary movement analysis
      const analysisResponse = await fetch('/api/movement-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementType,
          movementData: capturedData,
          patientHistory: `Patient ID: ${patientId}`
        })
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        setAnalysisResults(analysis);
        
        // Predictive analytics
        const predictiveResponse = await fetch('/api/ai/predictive-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movementData: capturedData,
            patientHistory: { patientId },
            analysisResult: analysis
          })
        });
        
        if (predictiveResponse.ok) {
          const predictions = await predictiveResponse.json();
          setPredictiveResults(predictions);
        }
        
        // Abnormality detection
        const abnormalityResponse = await fetch('/api/ai/detect-abnormalities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movementData: capturedData
          })
        });
        
        if (abnormalityResponse.ok) {
          const abnormalities = await abnormalityResponse.json();
          setAbnormalityResults(abnormalities);
        }
        
        if (onAnalysisComplete) {
          onAnalysisComplete(analysis);
        }
      }
    } catch (error) {
      console.error('Movement analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Generate SOAP note from analysis
  const generateSOAPNote = async () => {
    if (!analysisResults || !capturedData.length) return;
    
    try {
      const response = await fetch('/api/ai/generate-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementData: capturedData,
          analysisResult: analysisResults,
          patientInfo: { id: patientId },
          additionalNotes: `Movement type: ${movementType}`
        })
      });
      
      if (response.ok) {
        const soapNote = await response.json();
        console.log('Generated SOAP note:', soapNote);
        // Could open a modal or send to SOAP notes page
      }
    } catch (error) {
      console.error('SOAP generation failed:', error);
    }
  };

  // Save captured movement
  const saveMovement = async () => {
    if (capturedData.length === 0) return;

    try {
      const response = await fetch('/api/virtual-patient-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          movementType,
          capturedData,
          analysisResults,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        if (onCaptureComplete) {
          onCaptureComplete(capturedData);
        }
      }
    } catch (error) {
      console.error('Failed to save movement:', error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Video Capture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Movement Capture</span>
            <Badge variant={isCapturing ? "default" : "secondary"}>
              {isCapturing ? 'Camera Active' : 'Camera Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Movement Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Movement Type</label>
            <Select value={movementType} onValueChange={setMovementType} disabled={isRecording}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {movementTypes.map(mt => (
                  <SelectItem key={mt.value} value={mt.value}>
                    {mt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Video Display */}
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full"
            />
            
            {!isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <CameraOff className="w-16 h-16 text-gray-400" />
              </div>
            )}

            {isRecording && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="animate-pulse">
                  Recording
                </Badge>
              </div>
            )}
          </div>

          {/* Quality Indicator */}
          {isRecording && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Movement Quality</span>
                <span>{currentQuality.toFixed(0)}%</span>
              </div>
              <Progress value={currentQuality} className="h-2" />
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isCapturing ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" className="flex-1">
                  <CameraOff className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
                
                {!isRecording ? (
                  <Button onClick={() => setIsRecording(true)} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsRecording(false)} 
                    variant="destructive" 
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Recording Info */}
          {capturedData.length > 0 && !isRecording && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                Captured {capturedData.length} frames of movement data. 
                Average quality: {(capturedData.reduce((sum, d) => sum + d.qualityScore, 0) / capturedData.length).toFixed(1)}%
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Movement Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={analyzeMovement} 
              disabled={capturedData.length === 0 || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>Analyzing...</>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Analyze Movement
                </>
              )}
            </Button>
            
            <Button 
              onClick={saveMovement}
              disabled={capturedData.length === 0}
              variant="outline"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Recording
            </Button>
            
            <Button
              onClick={() => {
                setCapturedData([]);
                setAnalysisResults(null);
              }}
              variant="outline"
              size="icon"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResults && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">AI Analysis Results</h3>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
                  >
                    {showAdvancedAnalysis ? 'Hide' : 'Show'} Advanced
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={generateSOAPNote}
                  >
                    Generate SOAP
                  </Button>
                </div>
              </div>
              
              {/* Movement Quality */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-1">Overall Quality</div>
                <Progress value={analysisResults.overallScore || 0} className="h-2 mb-2" />
                <div className="text-xs text-gray-600">
                  {analysisResults.qualityDescription}
                </div>
              </div>

              {/* Key Findings */}
              {analysisResults.findings && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-2 text-blue-900">Key Findings</div>
                  <ul className="text-xs space-y-1 text-blue-800">
                    {analysisResults.findings.map((finding: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compensations */}
              {analysisResults.compensations && analysisResults.compensations.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm font-medium mb-2 text-yellow-900">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Compensatory Patterns
                  </div>
                  <ul className="text-xs space-y-1 text-yellow-800">
                    {analysisResults.compensations.map((comp: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">⚠</span>
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysisResults.recommendations && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium mb-2 text-green-900">Clinical Recommendations</div>
                  <ul className="text-xs space-y-1 text-green-800">
                    {analysisResults.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Advanced Analysis Section */}
              {showAdvancedAnalysis && (
                <>
                  {/* Predictive Analytics */}
                  {predictiveResults && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium mb-2 text-purple-900">Predictive Analytics</div>
                      <div className="space-y-2 text-xs">
                        {predictiveResults.injuryRiskScore && (
                          <div className="flex justify-between">
                            <span className="text-purple-700">Injury Risk Score:</span>
                            <Badge variant={predictiveResults.injuryRiskScore > 70 ? "destructive" : predictiveResults.injuryRiskScore > 40 ? "secondary" : "default"}>
                              {predictiveResults.injuryRiskScore}/100
                            </Badge>
                          </div>
                        )}
                        {predictiveResults.recoveryTimeline && (
                          <div className="text-purple-700">
                            <div className="font-medium">Recovery Timeline:</div>
                            <div className="ml-2 mt-1">
                              • Optimistic: {predictiveResults.recoveryTimeline.optimistic}<br/>
                              • Realistic: {predictiveResults.recoveryTimeline.realistic}<br/>
                              • Conservative: {predictiveResults.recoveryTimeline.conservative}
                            </div>
                          </div>
                        )}
                        {predictiveResults.treatmentOutcomePrediction && (
                          <div className="flex justify-between">
                            <span className="text-purple-700">Success Probability:</span>
                            <span className="font-medium">{predictiveResults.treatmentOutcomePrediction.successProbability}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Movement Abnormalities */}
                  {abnormalityResults && abnormalityResults.abnormalities && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium mb-2 text-red-900">Detected Abnormalities</div>
                      <div className="space-y-2">
                        {abnormalityResults.abnormalities.map((abnormality: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={abnormality.severity === 'severe' ? 'destructive' : abnormality.severity === 'moderate' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {abnormality.severity}
                              </Badge>
                              <span className="font-medium text-red-900">{abnormality.type}</span>
                            </div>
                            <p className="text-red-700 ml-2">{abnormality.description}</p>
                            <p className="text-red-600 ml-2 italic">{abnormality.clinicalSignificance}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Gait Patterns */}
                      {abnormalityResults.gaitPatterns && (
                        <div className="mt-3 pt-2 border-t border-red-200">
                          <div className="text-xs font-medium text-red-900 mb-1">Gait Pattern Analysis</div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(abnormalityResults.gaitPatterns).map(([pattern, detected]) => {
                              if (typeof detected === 'boolean' && detected) {
                                return (
                                  <div key={pattern} className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-red-600" />
                                    <span className="text-red-700 capitalize">{pattern.replace('_', ' ')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Joint Angles */}
              {analysisResults.jointMetrics && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Measured Joint Angles</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(analysisResults.jointMetrics).map(([joint, value]) => (
                      <div key={joint} className="flex justify-between">
                        <span className="text-gray-600">{joint}:</span>
                        <span className="font-mono">{String(value)}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!analysisResults && capturedData.length === 0 && (
            <Alert>
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="mt-2 text-sm space-y-1">
                  <li>1. Select the movement type to assess</li>
                  <li>2. Start the camera and position yourself in view</li>
                  <li>3. Click "Start Recording" and perform the movement</li>
                  <li>4. Stop recording and analyze the captured data</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};