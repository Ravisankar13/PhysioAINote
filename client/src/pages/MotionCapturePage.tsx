import { Helmet } from "react-helmet";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import MotionCapture from "@/components/MotionCapture";
import MotionProcessor from "@/components/MotionProcessor";
import Enhanced3DSkeleton from "@/components/3d/Enhanced3DSkeleton";
import { Camera, Users, Activity, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function MotionCapturePage() {
  const { user } = useAuth();
  const [motionData, setMotionData] = useState<any[]>([]);
  const [virtualPatientData, setVirtualPatientData] = useState<any>(null);

  const handleMotionDataCapture = (data: any[]) => {
    setMotionData(data);
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Motion Capture Panel */}
        <div className="xl:col-span-2 space-y-6">
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
        </div>

        {/* 3D Visualization Panel */}
        <div className="xl:col-span-2">
          <Card className="h-[800px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Virtual Patient Visualization
                {virtualPatientData && (
                  <Badge variant="default" className="ml-2">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[720px]">
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                {virtualPatientData ? (
                  <Enhanced3DSkeleton 
                    patientData={virtualPatientData}
                    className="h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium mb-2">No Virtual Patient Data</h3>
                      <p className="text-sm">Record patient movement to see virtual recreation</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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