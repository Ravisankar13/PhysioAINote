import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { StaticPosturalAnalysis } from "@/components/StaticPosturalAnalysis";
import { ArrowLeft, Scan, Activity, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function StaticPosturalAnalysisPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">
              Please log in to access the static postural analysis features.
            </p>
            <Link href="/auth">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Helmet>
        <title>Static Postural Analysis - PhysioGPT</title>
        <meta name="description" content="AI-powered static postural analysis for comprehensive biomechanical assessment" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Static Postural Analysis
            </h1>
            <p className="text-lg text-gray-600">
              AI-powered comprehensive assessment of static postural abnormalities and biomechanical alignment
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Activity className="h-4 w-4 mr-1" />
              AI-Powered
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              Professional
            </Badge>
          </div>
        </div>

        {/* Key Features Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Assessment Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600 mb-1">9+</div>
                <div className="text-sm text-blue-800">Spinal Assessments</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600 mb-1">8+</div>
                <div className="text-sm text-green-800">Shoulder Evaluations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600 mb-1">12+</div>
                <div className="text-sm text-purple-800">Lower Body Checks</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600 mb-1">15+</div>
                <div className="text-sm text-orange-800">Total Abnormalities</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Spinal Alignment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Forward Head Posture</li>
                <li>• Thoracic Kyphosis</li>
                <li>• Lumbar Lordosis</li>
                <li>• Lateral Deviations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Shoulder Assessment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Height Asymmetry</li>
                <li>• Protraction Analysis</li>
                <li>• Scapular Winging</li>
                <li>• Internal Rotation</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pelvic & Hip</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Pelvic Tilt Detection</li>
                <li>• Hip Height Analysis</li>
                <li>• Rotational Assessment</li>
                <li>• Weight Distribution</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Lower Extremity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Knee Valgus/Varus</li>
                <li>• Q-Angle Assessment</li>
                <li>• Ankle Positioning</li>
                <li>• Foot Alignment</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Instructions and Tips */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Assessment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900">Patient Positioning</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Stand in natural, relaxed position</li>
                  <li>• Arms hanging naturally at sides</li>
                  <li>• Weight evenly distributed</li>
                  <li>• Looking straight ahead</li>
                  <li>• Minimal clothing for visibility</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-green-900">Camera Setup</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Position 8-10 feet from patient</li>
                  <li>• Camera at chest height level</li>
                  <li>• Ensure full body visibility</li>
                  <li>• Good lighting, minimal shadows</li>
                  <li>• Clear, uncluttered background</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-purple-900">Analysis Process</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• 5-second capture period</li>
                  <li>• AI processes multiple frames</li>
                  <li>• Automatic abnormality detection</li>
                  <li>• Comprehensive scoring system</li>
                  <li>• Clinical recommendations provided</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Static Analysis Component */}
        <StaticPosturalAnalysis />
      </div>
    </div>
  );
}