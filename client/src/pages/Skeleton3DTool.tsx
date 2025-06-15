import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Enhanced3DSkeleton from "@/components/3d/Enhanced3DSkeleton";
import { useAuth } from "@/hooks/use-auth";

export default function Skeleton3DTool() {
  const [isSaved, setIsSaved] = useState(false);
  const { user } = useAuth();
  
  // Sample patient data for demonstration (can be customized)
  const samplePatientData = {
    anthropometrics: {
      height: 175,
      weight: 70,
      limbLengths: {
        upperArm: 35,
        forearm: 28,
        thigh: 45,
        shin: 38
      }
    },
    jointRestrictions: {
      shoulder: { flexion: 180, extension: 60, abduction: 180, adduction: 30 },
      elbow: { flexion: 145, extension: 0 },
      hip: { flexion: 120, extension: 30, abduction: 45, adduction: 30 },
      knee: { flexion: 135, extension: 0 }
    },
    painAreas: ['shoulder', 'elbow'] // Sample pain areas for demonstration
  };

  const handleSaveModel = () => {
    if (!user) {
      alert("Please sign in to save your model");
      return;
    }
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

      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">3D Skeletal Tool</h1>
          <p className="text-muted-foreground mt-2">
            Interactive 3D skeleton with functional movements for physiotherapy analysis
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
          
        {/* Enhanced 3D Skeleton with Functional Movements */}
        <div className="bg-white rounded-lg shadow-sm h-[800px]">
          <Enhanced3DSkeleton 
            patientData={samplePatientData}
            className="h-full"
          />
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-center">Functional Movement Capabilities</h2>
          <p className="mb-4">This advanced 3D skeleton model provides:</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>High-quality 3D skeleton with accurate anatomical proportions</li>
            <li>Functional movement demonstrations (squats, walking, arm exercises)</li>
            <li>Pain area visualization with red highlighting</li>
            <li>Interactive controls for exercise selection and animation</li>
            <li>Patient-specific scaling based on anthropometric data</li>
            <li>Real-time 3D navigation (rotate, zoom, pan)</li>
          </ul>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Exercise Categories:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
              <div>
                <strong>Lower Body:</strong> Squats, step-ups, step-downs
              </div>
              <div>
                <strong>Upper Body:</strong> Elbow flexion/extension, shoulder flexion
              </div>
              <div>
                <strong>Gait Patterns:</strong> Forward/backward walking
              </div>
              <div>
                <strong>Balance:</strong> Single leg stance with stability challenges
              </div>
            </div>
            <h3 className="font-medium mb-2">Clinical Applications:</h3>
            <p className="text-sm text-muted-foreground">
              Use this tool for movement analysis, patient education, exercise demonstration, 
              and treatment planning. The functional movements help visualize proper biomechanics 
              and assist in explaining rehabilitation exercises to patients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}