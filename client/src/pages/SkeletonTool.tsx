import { Helmet } from "react-helmet";
import { SkeletonModel } from "@/components/skeleton/SkeletonModel";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SkeletonTool() {
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveModel = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportImage = () => {
    // In a production app, we would implement actual export functionality
    alert("Export functionality will be available in the next update");
  };

  return (
    <div className="container max-w-6xl py-8 mx-auto">
      <Helmet>
        <title>Interactive Skeletal Tool | PhysioAI Conversation</title>
        <meta name="description" content="Interactive skeletal model for physiotherapy diagnosis, assessment, and treatment planning." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interactive Skeletal Tool</h1>
            <p className="text-muted-foreground mt-1">
              Customize and visualize the skeletal model for diagnosis and treatment planning
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={isSaved ? "default" : "outline"} 
              onClick={handleSaveModel}
              className={isSaved ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSaved ? "Model Saved!" : "Save Model"}
            </Button>
            <Button variant="outline" onClick={handleExportImage}>Export Image</Button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
          <SkeletonModel />
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm space-y-4 text-center">
          <h2 className="text-xl font-bold">How to Use This Tool</h2>
          <div className="space-y-2">
            <p>This interactive skeletal model allows you to:</p>
            <ul className="list-disc space-y-1 inline-block text-left">
              <li>Visualize a 2D skeletal representation with accurate proportions</li>
              <li>Adjust bone lengths to match patient anatomy using the sliders</li>
              <li>Plan interventions based on anatomical variations</li>
              <li>Use as a visual aid when discussing with patients</li>
            </ul>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Tips for Physiotherapists:</h3>
            <p className="text-sm text-muted-foreground mx-auto max-w-2xl">
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