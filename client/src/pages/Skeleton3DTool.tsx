import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton3DModel } from "@/components/skeleton/Skeleton3DModel";
import SkeletonModelViewer from "@/components/skeleton/SkeletonModelViewer";
import MembershipRequired from "@/components/MembershipRequired";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Skeleton3DTool() {
  const [activeModel, setActiveModel] = useState("generated"); // "generated" or "realistic"
  const [selectedMovement, setSelectedMovement] = useState<string | undefined>(undefined);
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

  const handleMovementSelection = (movement: string | undefined) => {
    setSelectedMovement(movement);
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
                <Skeleton3DModel adjustments={adjustments} animation={selectedMovement} />
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">Adjustment Controls</h2>
                    <div className="space-y-4">
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
                  
                  <div>
                    <h2 className="text-xl font-bold mb-4">Movement Animations</h2>
                    <p className="text-muted-foreground mb-4">
                      Select a movement to animate the skeletal model. These animations demonstrate common physiotherapy exercises and movements.
                    </p>
                    <div className="space-y-3">
                      {[
                        { id: 'squat', label: 'Squat', description: 'Demonstrates knee and hip flexion with weight-bearing' },
                        { id: 'stepUp', label: 'Step Up', description: 'Shows hip and knee movement during elevation' },
                        { id: 'stepDown', label: 'Step Down', description: 'Illustrates controlled eccentric movement' },
                        { id: 'lunge', label: 'Lunge', description: 'Displays hip mobility and knee alignment in split stance' },
                      ].map((movement) => (
                        <div 
                          key={movement.id}
                          className={`p-3 border rounded-md cursor-pointer transition-all ${selectedMovement === movement.id ? 'border-primary bg-primary/10' : 'hover:bg-gray-50'}`}
                          onClick={() => handleMovementSelection(selectedMovement === movement.id ? undefined : movement.id)}
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">{movement.label}</h3>
                            {selectedMovement === movement.id && (
                              <div className="text-xs text-white bg-primary px-2 py-1 rounded-full">Active</div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{movement.description}</p>
                        </div>
                      ))}
                      
                      {selectedMovement && (
                        <button
                          onClick={() => handleMovementSelection(undefined)}
                          className="w-full border border-gray-300 text-gray-700 py-2 rounded-md mt-2 hover:bg-gray-50"
                        >
                          Stop Animation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="realistic">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Realistic 3D Skeletal Model</h2>
                <p className="text-muted-foreground mb-4">
                  This high-fidelity 3D model provides detailed visualization of anatomical structures.
                  Use the controls to rotate, zoom, and examine the model from any angle. Adjust limb sizes with the controls.
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