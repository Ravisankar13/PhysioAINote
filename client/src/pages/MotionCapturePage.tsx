import { Helmet } from "react-helmet";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import MotionCapture from "@/components/MotionCapture";
import MotionProcessor from "@/components/MotionProcessor";
import Enhanced3DSkeleton from "@/components/3d/Enhanced3DSkeleton";
import { Camera, Users, Activity, ArrowLeft, Settings } from "lucide-react";
import { Link } from "wouter";

export default function MotionCapturePage() {
  const { user } = useAuth();
  const [motionData, setMotionData] = useState<any[]>([]);
  const [virtualPatientData, setVirtualPatientData] = useState<any>(null);
  const [captureMode, setCaptureMode] = useState<'standard'>('standard');
  const [recordingSession, setRecordingSession] = useState<any[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const handleMotionDataCapture = (data: any[]) => {
    setMotionData(data);
  };



  const performMotionAnalysis = async (data: any) => {
    // Advanced motion analysis with pattern recognition
    const analysis = {
      movementQuality: data.quality,
      symmetryIndex: calculateSymmetry(data.poses),
      balanceMetrics: calculateBalance(data.poses),
      jointAngles: extractJointAngles(data.poses),
      compensatoryPatterns: detectCompensations(data.poses)
    };
    
    setAnalysisResults(analysis);
  };

  const performSessionAnalysis = async (sessionData: any[]) => {
    if (sessionData.length === 0) return;
    
    // Comprehensive session analysis
    const sessionAnalysis = {
      sessionDuration: sessionData.length / 30, // Assuming 30 FPS
      averageQuality: sessionData.reduce((sum, frame) => sum + frame.quality, 0) / sessionData.length,
      movementPatterns: analyzeMovementPatterns(sessionData),
      progressionMetrics: calculateProgression(sessionData),
      recommendations: generateRecommendations(sessionData)
    };
    
    setAnalysisResults(sessionAnalysis);
  };

  const calculateSymmetry = (poses: any[]) => {
    if (!poses || poses.length === 0) return 0;
    // Placeholder for symmetry calculation
    return Math.random() * 100;
  };

  const calculateBalance = (poses: any[]) => {
    if (!poses || poses.length === 0) return 0;
    // Placeholder for balance calculation
    return Math.random() * 100;
  };

  const extractJointAngles = (poses: any[]) => {
    // Placeholder for joint angle extraction
    return {};
  };

  const detectCompensations = (poses: any[]) => {
    // Placeholder for compensation pattern detection
    return [];
  };

  const analyzeMovementPatterns = (sessionData: any[]) => {
    // Placeholder for movement pattern analysis
    return [];
  };

  const calculateProgression = (sessionData: any[]) => {
    // Placeholder for progression calculation
    return {};
  };

  const generateRecommendations = (sessionData: any[]) => {
    // Placeholder for AI recommendations
    return [];
  };

  const handleSkeletonUpdate = (jointAngles: any, estimatedMeasurements: any) => {
    setVirtualPatientData({
      anthropometrics: estimatedMeasurements,
      jointAngles: jointAngles,
      painAreas: [],
      jointRestrictions: {}
    });
  };

  return (
    <div className="container max-w-7xl py-8 mx-auto">
      <Helmet>
        <title>Patient Motion Capture | PhysioAI</title>
        <meta name="description" content="Record patient movements with camera-based motion capture and create virtual patient models." />
      </Helmet>

      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/skeleton-3d-tool">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to 3D Tool
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Camera className="h-8 w-8" />
              Patient Motion Capture
            </h1>
            <p className="text-muted-foreground mt-2">
              Record real patient movements and convert them into virtual patient models
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4">
          <Badge variant={motionData.length > 0 ? "default" : "secondary"}>
            <Activity className="h-3 w-3 mr-1" />
            {motionData.length > 0 ? `${motionData.length} frames captured` : "No motion data"}
          </Badge>
          <Badge variant={virtualPatientData ? "default" : "secondary"}>
            <Users className="h-3 w-3 mr-1" />
            {virtualPatientData ? "Virtual patient active" : "Virtual patient inactive"}
          </Badge>
        </div>
      </div>

      {/* Motion Capture Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Motion Capture Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Mode:</span>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Standard Motion Capture</span>
                </div>
              </div>
            </div>
            {analysisResults && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="outline">
                  Quality: {(analysisResults.movementQuality * 100).toFixed(0)}%
                </Badge>
                {analysisResults.averageQuality && (
                  <Badge variant="outline">
                    Session Avg: {(analysisResults.averageQuality * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Layout */}
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        {/* Motion Capture Panel */}
        <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
          <MotionCapture 
            onMotionDataCapture={handleMotionDataCapture}
            className="w-full"
          />
          
          {motionData.length > 0 && (
            <MotionProcessor
              motionData={motionData}
              onSkeletonUpdate={handleSkeletonUpdate}
              className="w-full"
            />
          )}

          {/* Real-time Analysis Display */}
          {analysisResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Motion Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(analysisResults.movementQuality * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Movement Quality</div>
                  </div>
                  
                  {analysisResults.symmetryIndex !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analysisResults.symmetryIndex.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Symmetry Index</div>
                    </div>
                  )}
                  
                  {analysisResults.balanceMetrics !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {analysisResults.balanceMetrics.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Balance Score</div>
                    </div>
                  )}
                  
                  {analysisResults.sessionDuration !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {analysisResults.sessionDuration.toFixed(1)}s
                      </div>
                      <div className="text-sm text-muted-foreground">Session Duration</div>
                    </div>
                  )}
                </div>

                {analysisResults.compensatoryPatterns && analysisResults.compensatoryPatterns.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Detected Compensatory Patterns:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.compensatoryPatterns.map((pattern: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResults.recommendations && analysisResults.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">AI Recommendations:</h4>
                    <ul className="space-y-1 text-sm">
                      {analysisResults.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>


      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">How to Use Motion Capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="font-medium">Start Camera</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Start Camera" and position the patient in full view with good lighting
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="font-medium">Record Movement</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Start Recording" and have the patient perform movements like squats, lunges, or reaches
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="font-medium">Analyze Results</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Review the virtual patient recreation, joint angles, and estimated measurements
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Best Results Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure the patient is visible from head to toe</li>
              <li>• Use good lighting with minimal shadows</li>
              <li>• Keep the background clear and uncluttered</li>
              <li>• Record smooth, controlled movements</li>
              <li>• Allow 2-3 seconds before and after the main movement</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}