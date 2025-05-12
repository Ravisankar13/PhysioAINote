import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton3DModel } from "@/components/skeleton/Skeleton3DModel";
import SkeletonModelViewer from "@/components/skeleton/SkeletonModelViewer";
import MembershipRequired from "@/components/MembershipRequired";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Skeleton3DTool() {
  const [activeModel, setActiveModel] = useState("generated"); // "generated" or "realistic"
  const [adjustments, setAdjustments] = useState({
    femurLength: 1,
    tibiaLength: 1,
    humerusLength: 1,
    radiusLength: 1,
    spineLength: 1,
    ribcageWidth: 1,
    pelvisWidth: 1
  });

  const handleAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdjustments(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

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
          
          <Tabs value={activeModel} onValueChange={setActiveModel} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="generated">Generated Model</TabsTrigger>
              <TabsTrigger value="realistic">Realistic 3D Model</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generated">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Skeleton3DModel adjustments={adjustments} />
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm mt-6">
                <h2 className="text-xl font-bold mb-4">Adjustment Controls</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(adjustments).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}: <span className="font-bold">{value.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        name={key}
                        min="0.5"
                        max="1.5"
                        step="0.01"
                        value={value}
                        onChange={handleAdjustmentChange}
                        className="w-full accent-primary"
                      />
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setAdjustments({
                    femurLength: 1,
                    tibiaLength: 1,
                    humerusLength: 1,
                    radiusLength: 1,
                    spineLength: 1,
                    ribcageWidth: 1,
                    pelvisWidth: 1
                  })}
                  className="w-full bg-primary text-white py-2 rounded-md mt-6"
                >
                  Reset to Default
                </button>
              </div>
            </TabsContent>
            
            <TabsContent value="realistic">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Realistic 3D Skeletal Model</h2>
                <p className="text-muted-foreground mb-4">
                  This high-fidelity 3D model provides detailed visualization of anatomical structures.
                  Use the controls to rotate, zoom, and examine the model from any angle.
                </p>
                <SkeletonModelViewer />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-center">How to Use This Tool</h2>
            <p className="mb-4">This interactive 3D skeletal model allows you to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Visualize a 3D skeletal representation with accurate proportions</li>
              <li>Rotate, zoom, and pan the model for detailed examination</li>
              <li>Adjust bone lengths and proportions to match patient anatomy</li>
              <li>Visualize effects of anatomical variations on biomechanics</li>
              <li>Switch between a generated model with adjustable parameters and a detailed realistic model</li>
            </ul>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Tips for Physiotherapists:</h3>
              <p className="text-sm text-muted-foreground">
                Use this tool in conjunction with clinical assessments. The adjustable features 
                help to visualize proportional differences and can assist in treatment planning, 
                but should not replace professional clinical judgment.
              </p>
            </div>
          </div>
        </div>
      </MembershipRequired>
    </div>
  );
}