import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SimpleSkeletonViewer from "@/components/skeleton/SimpleSkeletonViewer";
import Basic3DSkeletonViewer from "@/components/skeleton/Basic3DSkeletonViewer";
import MembershipRequired from "@/components/MembershipRequired";

export default function Skeleton3DTool() {
  const [isSaved, setIsSaved] = useState(false);
  const [useAdvancedViewer, setUseAdvancedViewer] = useState(true);

  const handleSaveModel = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportImage = () => {
    // In a production app, we would implement actual export functionality
    alert("Export functionality will be available in the next update");
  };
  
  const toggleViewerType = () => {
    setUseAdvancedViewer(!useAdvancedViewer);
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
            
            <Button 
              variant="outline" 
              onClick={toggleViewerType}
              className="ml-2"
            >
              {useAdvancedViewer ? "Switch to Simple View" : "Switch to Advanced View"}
            </Button>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Professional 3D Skeletal Model</h2>
            <p className="text-muted-foreground mb-4">
              This high-fidelity 3D model provides detailed visualization of anatomical structures, 
              featuring a professionally rigged skeletal system with accurate proportions and joint positions.
              Use the controls to rotate, zoom, and examine the model from any angle. Select from different 
              model types to explore various anatomical perspectives.
            </p>
            
            {useAdvancedViewer ? <Basic3DSkeletonViewer /> : <SimpleSkeletonViewer />}
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-center">How to Use This Tool</h2>
            <p className="mb-4">This interactive 3D model viewer allows you to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Explore professionally rendered 3D skeletal models</li>
              <li>Switch between different model types to view various anatomical structures</li>
              <li>Rotate, zoom, and pan the model for examining from multiple angles</li>
              <li>Control rotation speed through the adjustment controls</li>
              <li>Use the models to understand spatial relationships and anatomical structures</li>
            </ul>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Upcoming Features:</h3>
              <p className="text-sm text-muted-foreground mb-3">
                In upcoming updates, this tool will support even more detailed skeletal models with 
                adjustable bone lengths and proportions, allowing you to customize the model to match 
                individual patient anatomy for more personalized education and visualization.
              </p>
              <h3 className="font-medium mb-2">Professional Applications:</h3>
              <p className="text-sm text-muted-foreground">
                Physiotherapists can use 3D models to enhance patient education, explain 
                injury mechanisms, demonstrate movement patterns, and help patients visualize 
                their treatment goals. This 3D visualization tool serves as a powerful 
                supplement to hands-on clinical assessments and interventions.
              </p>
            </div>
          </div>
        </div>
      </MembershipRequired>
    </div>
  );
}