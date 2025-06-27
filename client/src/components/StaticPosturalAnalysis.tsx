import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Play, Square, RotateCcw, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { PoseDetection } from './PoseDetection';

interface PosturalAnalysisResult {
  // Spinal Alignment
  forwardHeadPosture: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; angle: number };
  thoracicKyphosis: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; angle: number };
  lumbarLordosis: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; angle: number };
  spinalAlignment: { deviation: number; direction: 'left' | 'right' | 'center' };
  
  // Shoulder Assessment
  shoulderAsymmetry: { detected: boolean; heightDifference: number; higherSide: 'left' | 'right' | 'even' };
  shoulderProtraction: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; distance: number };
  scapularWinging: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; side: 'left' | 'right' | 'bilateral' };
  
  // Pelvic & Hip
  pelvicTilt: { detected: boolean; type: 'anterior' | 'posterior' | 'neutral'; angle: number };
  pelvicRotation: { detected: boolean; rotation: number; direction: 'left' | 'right' };
  hipAsymmetry: { detected: boolean; heightDifference: number; higherSide: 'left' | 'right' | 'even' };
  
  // Lower Extremity
  kneeAlignment: { 
    valgus: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; angle: number };
    varus: { detected: boolean; severity: 'mild' | 'moderate' | 'severe'; angle: number };
  };
  anklePosition: { 
    pronation: { detected: boolean; severity: 'mild' | 'moderate' | 'severe' };
    supination: { detected: boolean; severity: 'mild' | 'moderate' | 'severe' };
  };
  
  // Overall Assessment
  overallPosture: { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' };
  recommendations: string[];
  priorityAreas: string[];
}

interface StaticPosturalAnalysisProps {
  className?: string;
}

export function StaticPosturalAnalysis({ className }: StaticPosturalAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PosturalAnalysisResult | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const captureTimeoutRef = useRef<NodeJS.Timeout>();
  const frameCountRef = useRef(0);

  const handlePoseData = useCallback((poses: any[]) => {
    if (isCapturing && poses.length > 0) {
      setCapturedFrames(prev => [...prev, poses[0]]);
      frameCountRef.current += 1;
    }
  }, [isCapturing]);

  const startStaticCapture = useCallback(() => {
    setIsCapturing(true);
    setCapturedFrames([]);
    frameCountRef.current = 0;
    setAnalysisResult(null);

    // Capture for 5 seconds
    captureTimeoutRef.current = setTimeout(() => {
      setIsCapturing(false);
      analyzeStaticPosture();
    }, 5000);
  }, []);

  const stopCapture = useCallback(() => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    setIsCapturing(false);
    if (capturedFrames.length > 0) {
      analyzeStaticPosture();
    }
  }, [capturedFrames]);

  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setCapturedFrames([]);
    frameCountRef.current = 0;
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    setIsCapturing(false);
  }, []);

  const analyzeStaticPosture = useCallback(() => {
    if (capturedFrames.length === 0) return;

    setIsAnalyzing(true);

    // Average all captured frames to get stable pose
    const avgPose = averagePoses(capturedFrames);
    
    // Perform comprehensive postural analysis
    const result = performPosturalAnalysis(avgPose);
    
    setAnalysisResult(result);
    setIsAnalyzing(false);
  }, [capturedFrames]);

  // Average multiple pose frames for stability
  const averagePoses = (poses: any[]): any => {
    if (poses.length === 0) return null;

    const avgKeypoints = poses[0].keypoints.map((_: any, index: number) => {
      const sumX = poses.reduce((sum, pose) => sum + pose.keypoints[index].x, 0);
      const sumY = poses.reduce((sum, pose) => sum + pose.keypoints[index].y, 0);
      const avgConfidence = poses.reduce((sum, pose) => sum + pose.keypoints[index].confidence, 0) / poses.length;

      return {
        x: sumX / poses.length,
        y: sumY / poses.length,
        confidence: avgConfidence,
        name: poses[0].keypoints[index].name
      };
    });

    return { keypoints: avgKeypoints };
  };

  // Main postural analysis function
  const performPosturalAnalysis = (pose: any): PosturalAnalysisResult => {
    const keypoints = pose.keypoints.reduce((acc: any, kp: any) => {
      acc[kp.name] = kp;
      return acc;
    }, {});

    return {
      // Spinal Alignment Analysis
      forwardHeadPosture: analyzeForwardHeadPosture(keypoints),
      thoracicKyphosis: analyzeThoracicKyphosis(keypoints),
      lumbarLordosis: analyzeLumbarLordosis(keypoints),
      spinalAlignment: analyzeSpinalAlignment(keypoints),
      
      // Shoulder Assessment
      shoulderAsymmetry: analyzeShoulderAsymmetry(keypoints),
      shoulderProtraction: analyzeShoulderProtraction(keypoints),
      scapularWinging: analyzeScapularWinging(keypoints),
      
      // Pelvic & Hip Analysis
      pelvicTilt: analyzePelvicTilt(keypoints),
      pelvicRotation: analyzePelvicRotation(keypoints),
      hipAsymmetry: analyzeHipAsymmetry(keypoints),
      
      // Lower Extremity
      kneeAlignment: analyzeKneeAlignment(keypoints),
      anklePosition: analyzeAnklePosition(keypoints),
      
      // Overall Assessment
      overallPosture: calculateOverallPosture(keypoints),
      recommendations: generateRecommendations(keypoints),
      priorityAreas: identifyPriorityAreas(keypoints)
    };
  };

  // Analysis functions for different body regions
  const analyzeForwardHeadPosture = (keypoints: any) => {
    const nose = keypoints['nose'];
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    
    if (!nose || !leftShoulder || !rightShoulder) {
      return { detected: false, severity: 'mild' as const, angle: 0 };
    }

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const horizontalDistance = Math.abs(nose.x - shoulderMidpoint.x);
    const verticalDistance = Math.abs(nose.y - shoulderMidpoint.y);
    const angle = Math.atan2(horizontalDistance, verticalDistance) * (180 / Math.PI);

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (angle > 20) severity = 'severe';
    else if (angle > 10) severity = 'moderate';

    return {
      detected: angle > 5,
      severity,
      angle: Math.round(angle * 10) / 10
    };
  };

  const analyzeThoracicKyphosis = (keypoints: any) => {
    const nose = keypoints['nose'];
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];

    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { detected: false, severity: 'mild' as const, angle: 0 };
    }

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    // Calculate upper back curvature approximation
    const shoulderToHipDistance = Math.sqrt(
      Math.pow(shoulderMidpoint.x - hipMidpoint.x, 2) + 
      Math.pow(shoulderMidpoint.y - hipMidpoint.y, 2)
    );

    const headToShoulderDistance = Math.sqrt(
      Math.pow(nose.x - shoulderMidpoint.x, 2) + 
      Math.pow(nose.y - shoulderMidpoint.y, 2)
    );

    const ratio = headToShoulderDistance / shoulderToHipDistance;
    const angle = ratio * 45; // Approximation

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (angle > 25) severity = 'severe';
    else if (angle > 15) severity = 'moderate';

    return {
      detected: angle > 8,
      severity,
      angle: Math.round(angle * 10) / 10
    };
  };

  const analyzeLumbarLordosis = (keypoints: any) => {
    // Simplified analysis based on hip and shoulder alignment
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { detected: false, severity: 'mild' as const, angle: 0 };
    }

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    const horizontalOffset = Math.abs(shoulderMidpoint.x - hipMidpoint.x);
    const verticalDistance = Math.abs(shoulderMidpoint.y - hipMidpoint.y);
    const angle = Math.atan2(horizontalOffset, verticalDistance) * (180 / Math.PI);

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (angle > 15) severity = 'severe';
    else if (angle > 8) severity = 'moderate';

    return {
      detected: angle > 4,
      severity,
      angle: Math.round(angle * 10) / 10
    };
  };

  const analyzeSpinalAlignment = (keypoints: any) => {
    const nose = keypoints['nose'];
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];

    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { deviation: 0, direction: 'center' as const };
    }

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    const headToShoulder = nose.x - shoulderMidpoint.x;
    const shoulderToHip = shoulderMidpoint.x - hipMidpoint.x;
    const avgDeviation = (Math.abs(headToShoulder) + Math.abs(shoulderToHip)) / 2;

    let direction: 'left' | 'right' | 'center' = 'center';
    if (avgDeviation > 10) {
      direction = (headToShoulder + shoulderToHip) > 0 ? 'right' : 'left';
    }

    return {
      deviation: Math.round(avgDeviation * 10) / 10,
      direction
    };
  };

  const analyzeShoulderAsymmetry = (keypoints: any) => {
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];

    if (!leftShoulder || !rightShoulder) {
      return { detected: false, heightDifference: 0, higherSide: 'even' as const };
    }

    const heightDifference = Math.abs(leftShoulder.y - rightShoulder.y);
    const higherSide: 'left' | 'right' | 'even' = leftShoulder.y < rightShoulder.y ? 'left' : 
                     rightShoulder.y < leftShoulder.y ? 'right' : 'even';

    return {
      detected: heightDifference > 15,
      heightDifference: Math.round(heightDifference * 10) / 10,
      higherSide
    };
  };

  const analyzeShoulderProtraction = (keypoints: any) => {
    const nose = keypoints['nose'];
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];

    if (!nose || !leftShoulder || !rightShoulder) {
      return { detected: false, severity: 'mild' as const, distance: 0 };
    }

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const distance = nose.x - shoulderMidpoint.x;
    const absDistance = Math.abs(distance);

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (absDistance > 40) severity = 'severe';
    else if (absDistance > 25) severity = 'moderate';

    return {
      detected: absDistance > 15,
      severity,
      distance: Math.round(absDistance * 10) / 10
    };
  };

  const analyzeScapularWinging = (keypoints: any) => {
    // Simplified analysis - in real implementation would need more sophisticated detection
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
      return { detected: false, severity: 'mild' as const, side: 'bilateral' as const };
    }

    // Check shoulder-elbow alignment as proxy for scapular position
    const leftAlignment = Math.abs(leftShoulder.x - leftElbow.x);
    const rightAlignment = Math.abs(rightShoulder.x - rightElbow.x);
    const avgAlignment = (leftAlignment + rightAlignment) / 2;

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (avgAlignment > 60) severity = 'severe';
    else if (avgAlignment > 40) severity = 'moderate';

    let side: 'left' | 'right' | 'bilateral' = 'bilateral';
    if (Math.abs(leftAlignment - rightAlignment) > 20) {
      side = leftAlignment > rightAlignment ? 'left' : 'right';
    }

    return {
      detected: avgAlignment > 25,
      severity,
      side
    };
  };

  const analyzePelvicTilt = (keypoints: any) => {
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
      return { detected: false, type: 'neutral' as const, angle: 0 };
    }

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    const kneeMidpoint = {
      x: (leftKnee.x + rightKnee.x) / 2,
      y: (leftKnee.y + rightKnee.y) / 2
    };

    const angle = Math.atan2(hipMidpoint.x - kneeMidpoint.x, hipMidpoint.y - kneeMidpoint.y) * (180 / Math.PI);
    const absAngle = Math.abs(angle);

    let type: 'anterior' | 'posterior' | 'neutral' = 'neutral';
    if (absAngle > 5) {
      type = angle > 0 ? 'anterior' : 'posterior';
    }

    return {
      detected: absAngle > 5,
      type,
      angle: Math.round(angle * 10) / 10
    };
  };

  const analyzePelvicRotation = (keypoints: any) => {
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];

    if (!leftHip || !rightHip) {
      return { detected: false, rotation: 0, direction: 'left' as const };
    }

    const rotation = leftHip.x - rightHip.x;
    const absRotation = Math.abs(rotation);

    const direction: 'left' | 'right' = rotation > 0 ? 'right' : 'left';

    return {
      detected: absRotation > 20,
      rotation: Math.round(absRotation * 10) / 10,
      direction
    };
  };

  const analyzeHipAsymmetry = (keypoints: any) => {
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];

    if (!leftHip || !rightHip) {
      return { detected: false, heightDifference: 0, higherSide: 'even' as const };
    }

    const heightDifference = Math.abs(leftHip.y - rightHip.y);
    const higherSide: 'left' | 'right' | 'even' = leftHip.y < rightHip.y ? 'left' : 
                     rightHip.y < leftHip.y ? 'right' : 'even';

    return {
      detected: heightDifference > 15,
      heightDifference: Math.round(heightDifference * 10) / 10,
      higherSide
    };
  };

  const analyzeKneeAlignment = (keypoints: any) => {
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return {
        valgus: { detected: false, severity: 'mild' as const, angle: 0 },
        varus: { detected: false, severity: 'mild' as const, angle: 0 }
      };
    }

    // Calculate Q-angle approximations
    const leftQAngle = calculateQAngle(leftHip, leftKnee, leftAnkle);
    const rightQAngle = calculateQAngle(rightHip, rightKnee, rightAnkle);
    const avgQAngle = (leftQAngle + rightQAngle) / 2;

    let valgusDetected = false;
    let varusDetected = false;
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';

    if (avgQAngle > 20) {
      valgusDetected = true;
      severity = avgQAngle > 30 ? 'severe' : avgQAngle > 25 ? 'moderate' : 'mild';
    } else if (avgQAngle < -10) {
      varusDetected = true;
      severity = avgQAngle < -20 ? 'severe' : avgQAngle < -15 ? 'moderate' : 'mild';
    }

    return {
      valgus: { detected: valgusDetected, severity, angle: Math.round(Math.max(0, avgQAngle) * 10) / 10 },
      varus: { detected: varusDetected, severity, angle: Math.round(Math.abs(Math.min(0, avgQAngle)) * 10) / 10 }
    };
  };

  const calculateQAngle = (hip: any, knee: any, ankle: any): number => {
    const hipToKnee = Math.atan2(knee.y - hip.y, knee.x - hip.x);
    const kneeToAnkle = Math.atan2(ankle.y - knee.y, ankle.x - knee.x);
    return (hipToKnee - kneeToAnkle) * (180 / Math.PI);
  };

  const analyzeAnklePosition = (keypoints: any) => {
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];

    if (!leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return {
        pronation: { detected: false, severity: 'mild' as const },
        supination: { detected: false, severity: 'mild' as const }
      };
    }

    // Simplified ankle analysis based on knee-ankle alignment
    const leftAlignment = Math.abs(leftKnee.x - leftAnkle.x);
    const rightAlignment = Math.abs(rightKnee.x - rightAnkle.x);
    const avgAlignment = (leftAlignment + rightAlignment) / 2;

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (avgAlignment > 30) severity = 'severe';
    else if (avgAlignment > 20) severity = 'moderate';

    // Determine if inward (pronation) or outward (supination) deviation
    const leftDeviation = leftKnee.x - leftAnkle.x;
    const rightDeviation = rightKnee.x - rightAnkle.x;
    const avgDeviation = (leftDeviation + rightDeviation) / 2;

    return {
      pronation: { detected: avgDeviation > 15, severity },
      supination: { detected: avgDeviation < -15, severity }
    };
  };

  const calculateOverallPosture = (keypoints: any) => {
    // Calculate overall postural score based on all assessments
    let totalScore = 100;
    let deductions = 0;

    // Sample scoring logic - would be more sophisticated in practice
    const fhp = analyzeForwardHeadPosture(keypoints);
    if (fhp.detected) deductions += fhp.severity === 'severe' ? 20 : fhp.severity === 'moderate' ? 15 : 10;

    const shoulderAsym = analyzeShoulderAsymmetry(keypoints);
    if (shoulderAsym.detected) deductions += 15;

    const kneeAlign = analyzeKneeAlignment(keypoints);
    if (kneeAlign.valgus.detected || kneeAlign.varus.detected) deductions += 10;

    totalScore -= deductions;

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    return { score: Math.max(0, totalScore), grade };
  };

  const generateRecommendations = (keypoints: any): string[] => {
    const recommendations: string[] = [];
    
    const fhp = analyzeForwardHeadPosture(keypoints);
    if (fhp.detected) {
      recommendations.push("Perform chin tucks and neck strengthening exercises");
      recommendations.push("Improve workstation ergonomics");
    }

    const shoulderAsym = analyzeShoulderAsymmetry(keypoints);
    if (shoulderAsym.detected) {
      recommendations.push("Address muscle imbalances with targeted strengthening");
      recommendations.push("Consider manual therapy for shoulder alignment");
    }

    const kneeAlign = analyzeKneeAlignment(keypoints);
    if (kneeAlign.valgus.detected) {
      recommendations.push("Strengthen hip abductors and external rotators");
      recommendations.push("Improve knee tracking during functional movements");
    }

    if (recommendations.length === 0) {
      recommendations.push("Maintain current postural awareness and exercise routine");
    }

    return recommendations;
  };

  const identifyPriorityAreas = (keypoints: any): string[] => {
    const priorities: string[] = [];
    
    const fhp = analyzeForwardHeadPosture(keypoints);
    if (fhp.detected && fhp.severity === 'severe') priorities.push("Forward Head Posture");
    
    const shoulderAsym = analyzeShoulderAsymmetry(keypoints);
    if (shoulderAsym.detected && shoulderAsym.heightDifference > 25) priorities.push("Shoulder Asymmetry");
    
    const kneeAlign = analyzeKneeAlignment(keypoints);
    if (kneeAlign.valgus.detected && kneeAlign.valgus.severity === 'severe') priorities.push("Knee Valgus");

    return priorities;
  };

  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'mild': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'severe': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getGradeColor = (grade: 'A' | 'B' | 'C' | 'D' | 'F') => {
    switch (grade) {
      case 'A': return 'text-green-700 bg-green-100';
      case 'B': return 'text-blue-700 bg-blue-100';
      case 'C': return 'text-yellow-700 bg-yellow-100';
      case 'D': return 'text-orange-700 bg-orange-100';
      case 'F': return 'text-red-700 bg-red-100';
    }
  };

  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Static Postural Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!isCapturing && !analysisResult && (
              <Button onClick={startStaticCapture} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start 5-Second Capture
              </Button>
            )}
            
            {isCapturing && (
              <Button onClick={stopCapture} variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Stop Capture
              </Button>
            )}
            
            {(analysisResult || capturedFrames.length > 0) && (
              <Button onClick={resetAnalysis} variant="outline" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Analysis
              </Button>
            )}
          </div>

          {isCapturing && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Camera className="h-4 w-4" />
                <span className="font-medium">Capturing static pose...</span>
                <Badge variant="secondary">{frameCountRef.current} frames</Badge>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Stand still in a natural position. Analysis will begin automatically in a few seconds.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <Activity className="h-4 w-4 animate-spin" />
                <span className="font-medium">Analyzing postural alignment...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Camera Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <PoseDetection 
            onPoseData={handlePoseData}
            className="w-full h-[500px]"
          />
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Overall Postural Assessment
                <Badge className={`text-lg px-3 py-1 ${getGradeColor(analysisResult.overallPosture.grade)}`}>
                  Grade {analysisResult.overallPosture.grade} ({analysisResult.overallPosture.score}%)
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Priority Areas */}
          {analysisResult.priorityAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Priority Areas for Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.priorityAreas.map((area, index) => (
                    <Badge key={index} variant="destructive">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spinal Alignment */}
            <Card>
              <CardHeader>
                <CardTitle>Spinal Alignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Forward Head Posture</span>
                    {analysisResult.forwardHeadPosture.detected ? (
                      <Badge className={getSeverityColor(analysisResult.forwardHeadPosture.severity)}>
                        {analysisResult.forwardHeadPosture.severity} ({analysisResult.forwardHeadPosture.angle}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Thoracic Kyphosis</span>
                    {analysisResult.thoracicKyphosis.detected ? (
                      <Badge className={getSeverityColor(analysisResult.thoracicKyphosis.severity)}>
                        {analysisResult.thoracicKyphosis.severity} ({analysisResult.thoracicKyphosis.angle}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Alignment</span>
                    <Badge variant={analysisResult.spinalAlignment.deviation > 15 ? "destructive" : "secondary"}>
                      {analysisResult.spinalAlignment.direction} ({analysisResult.spinalAlignment.deviation}px)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shoulder Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Shoulder Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Height Asymmetry</span>
                    {analysisResult.shoulderAsymmetry.detected ? (
                      <Badge variant="destructive">
                        {analysisResult.shoulderAsymmetry.higherSide} higher ({analysisResult.shoulderAsymmetry.heightDifference}px)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Protraction</span>
                    {analysisResult.shoulderProtraction.detected ? (
                      <Badge className={getSeverityColor(analysisResult.shoulderProtraction.severity)}>
                        {analysisResult.shoulderProtraction.severity} ({analysisResult.shoulderProtraction.distance}px)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Scapular Winging</span>
                    {analysisResult.scapularWinging.detected ? (
                      <Badge className={getSeverityColor(analysisResult.scapularWinging.severity)}>
                        {analysisResult.scapularWinging.side} - {analysisResult.scapularWinging.severity}
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pelvic & Hip */}
            <Card>
              <CardHeader>
                <CardTitle>Pelvic & Hip Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pelvic Tilt</span>
                    {analysisResult.pelvicTilt.detected ? (
                      <Badge variant="destructive">
                        {analysisResult.pelvicTilt.type} ({analysisResult.pelvicTilt.angle}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Hip Asymmetry</span>
                    {analysisResult.hipAsymmetry.detected ? (
                      <Badge variant="destructive">
                        {analysisResult.hipAsymmetry.higherSide} higher ({analysisResult.hipAsymmetry.heightDifference}px)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pelvic Rotation</span>
                    {analysisResult.pelvicRotation.detected ? (
                      <Badge variant="destructive">
                        {analysisResult.pelvicRotation.direction} rotation ({analysisResult.pelvicRotation.rotation}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lower Extremity */}
            <Card>
              <CardHeader>
                <CardTitle>Lower Extremity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Knee Valgus</span>
                    {analysisResult.kneeAlignment.valgus.detected ? (
                      <Badge className={getSeverityColor(analysisResult.kneeAlignment.valgus.severity)}>
                        {analysisResult.kneeAlignment.valgus.severity} ({analysisResult.kneeAlignment.valgus.angle}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Knee Varus</span>
                    {analysisResult.kneeAlignment.varus.detected ? (
                      <Badge className={getSeverityColor(analysisResult.kneeAlignment.varus.severity)}>
                        {analysisResult.kneeAlignment.varus.severity} ({analysisResult.kneeAlignment.varus.angle}°)
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Ankle Pronation</span>
                    {analysisResult.anklePosition.pronation.detected ? (
                      <Badge className={getSeverityColor(analysisResult.anklePosition.pronation.severity)}>
                        {analysisResult.anklePosition.pronation.severity}
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Clinical Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}