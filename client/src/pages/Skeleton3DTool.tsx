import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton3DModel } from "@/components/skeleton/Skeleton3DModel";

export default function Skeleton3DTool() {
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
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>3D Skeletal Tool | PhysioAI Conversation</title>
        <meta name="description" content="Interactive 3D skeletal model for physiotherapy diagnosis, assessment, and treatment planning." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">3D Skeletal Tool</h1>
            <p className="text-muted-foreground mt-1">
              Customize and visualize the 3D skeletal model for diagnosis and treatment planning
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

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6">
          <Skeleton3DModel adjustments={adjustments} />
          <p className="text-sm text-center text-gray-600 mt-3 mb-0">
            Use your mouse to rotate, zoom, and pan the 3D model
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">3D Model Adjustments</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Skeleton Body Parts Group */}
            <div className="bg-gray-50 p-3 rounded sm:col-span-2 mb-2 border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold mb-3 text-blue-700">Torso Adjustments</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Spine Length: <span className="font-bold">{adjustments.spineLength.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="spineLength"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={adjustments.spineLength}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Ribcage Width: <span className="font-bold">{adjustments.ribcageWidth.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="ribcageWidth"
                    min="0.7"
                    max="1.3"
                    step="0.01"
                    value={adjustments.ribcageWidth}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Pelvis Width: <span className="font-bold">{adjustments.pelvisWidth.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="pelvisWidth"
                    min="0.7"
                    max="1.3"
                    step="0.01"
                    value={adjustments.pelvisWidth}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
            
            {/* Upper Limbs Group */}
            <div className="bg-gray-50 p-3 rounded sm:col-span-2 mb-2 border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold mb-3 text-blue-700">Arm Adjustments</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Humerus Length: <span className="font-bold">{adjustments.humerusLength.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="humerusLength"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={adjustments.humerusLength}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Radius Length: <span className="font-bold">{adjustments.radiusLength.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="radiusLength"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={adjustments.radiusLength}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
            
            {/* Lower Limbs Group */}
            <div className="bg-gray-50 p-3 rounded sm:col-span-2">
              <h3 className="text-sm font-semibold mb-3 text-blue-700">Leg Adjustments</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Femur Length: <span className="font-bold">{adjustments.femurLength.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="femurLength"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={adjustments.femurLength}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Tibia Length: <span className="font-bold">{adjustments.tibiaLength.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    name="tibiaLength"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={adjustments.tibiaLength}
                    onChange={handleAdjustmentChange}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
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
            className="w-full bg-primary text-white py-2 rounded-md mt-4"
          >
            Reset to Default
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold">How to Use This 3D Tool</h2>
          <div className="space-y-2">
            <p>This interactive 3D skeletal model allows you to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Visualize a 3D skeletal model from any angle by dragging to rotate</li>
              <li>Zoom in/out using the mouse wheel to see details</li>
              <li>Adjust bone dimensions using the sliders to match patient anatomy</li>
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