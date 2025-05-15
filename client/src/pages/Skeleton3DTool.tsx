import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SkeletonModelViewer from "@/components/skeleton/SkeletonModelViewer";
import MembershipRequired from "@/components/MembershipRequired";

export default function Skeleton3DTool() {
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
        <title>3D Skeletal Tool | PhysioAI</title>
        <meta name="description" content="Interactive 3D skeletal model for physiotherapy diagnosis, assessment, and treatment planning." />
      </Helmet>

      <MembershipRequired feature="skeletonTools">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">3D Skeletal Tool</h1>
            <p className="text-muted-foreground mt-2">
              Visualize and customize a 3D skeletal model for diagnosis and treatment
            </p>
          </div>
          
          <div className="flex justify-center gap-4 mt-4">
            <Button 
              variant={isSaved ? "default" : "outline"} 
              onClick={handleSaveModel}
              className={isSaved ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSaved ? "Model Saved!" : "Save Model"}
            </Button>
            <Button variant="outline" onClick={handleExportImage}>Export Image</Button>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Professional 3D Skeletal Model</h2>
            <p className="text-muted-foreground mb-4">
              This high-fidelity 3D model provides detailed visualization of anatomical structures, 
              featuring a professionally rigged skeletal system with accurate proportions and joint positions.
              Use the controls to rotate, zoom, and examine the model from any angle. Adjust the size of 
              specific body regions using the sliders for in-depth anatomical exploration and patient education.
            </p>
            <SkeletonModelViewer />
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-center">How to Use This Tool</h2>
            <p className="mb-4">This interactive 3D skeletal model allows you to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Visualize a 3D skeletal representation with accurate proportions</li>
              <li>Rotate, zoom, and pan the model for detailed examination</li>
              <li>Adjust bone lengths and proportions to match patient anatomy</li>
              <li>Control limb size adjustments and rotation speed for both models</li>
              <li>Switch between a generated model and a detailed realistic model</li>
              <li>See both the model view and adjustment controls side-by-side</li>
              <li>Animate common physiotherapy movements: squat, step up, step down, and lunge</li>
              <li>Use animations to educate patients on proper movement patterns and range of motion</li>
            </ul>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Tips for Physiotherapists:</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Use this tool in conjunction with clinical assessments. The adjustable features 
                help to visualize proportional differences and can assist in treatment planning, 
                but should not replace professional clinical judgment.
              </p>
              <h3 className="font-medium mb-2">Using Movement Animations:</h3>
              <p className="text-sm text-muted-foreground">
                The animated movements can help demonstrate proper form to patients and highlight 
                problematic movement patterns. Use these animations to explain biomechanical concepts, 
                show how different muscles and joints work together during functional movements, and 
                identify areas that may need focus during rehabilitation.
              </p>
            </div>
          </div>
        </div>
      </MembershipRequired>
    </div>
  );
}