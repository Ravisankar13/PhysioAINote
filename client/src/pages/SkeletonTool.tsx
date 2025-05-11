import { Helmet } from "react-helmet";
import { SkeletonModel } from "@/components/skeleton/SkeletonModel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function SkeletonTool() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  // Redirect to auth page if user is not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>Interactive Skeletal Tool | PhysioAI Conversation</title>
        <meta name="description" content="Interactive 3D skeletal model for physiotherapy diagnosis, assessment, and treatment planning." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interactive Skeletal Tool</h1>
            <p className="text-muted-foreground mt-1">
              Customize and visualize the skeletal model for diagnosis and treatment planning
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>Save Model</Button>
            <Button variant="outline" onClick={() => {}}>Export Image</Button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
          <SkeletonModel />
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold">How to Use This Tool</h2>
          <div className="space-y-2">
            <p>This interactive skeletal model allows you to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Visualize a 3D skeletal model from any angle by dragging to rotate</li>
              <li>Adjust bone lengths to match patient anatomy using the sliders</li>
              <li>Plan interventions based on anatomical variations</li>
              <li>Use as a visual aid when discussing with patients</li>
            </ul>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Tips for Physiotherapists:</h3>
            <p className="text-sm text-muted-foreground">
              Use this tool in conjunction with clinical assessments. The adjustable features 
              help to visualize proportional differences and can assist in treatment planning, 
              but should not replace professional clinical judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}