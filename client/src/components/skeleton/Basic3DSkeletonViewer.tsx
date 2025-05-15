import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define available models for selection
const models = [
  { name: "Skeletal Model", value: "skeleton" },
  { name: "Running Pose", value: "running" },
  { name: "Sitting Pose", value: "sitting" },
];

export default function Basic3DSkeletonViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [selectedModel, setSelectedModel] = useState(models[0].value);
  
  // Define model paths to display based on selection
  const getModelImage = () => {
    switch(selectedModel) {
      case 'running':
        return '/models/running_pose.png'; // This would be a placeholder
      case 'sitting':
        return '/models/sitting_pose.png'; // This would be a placeholder
      case 'skeleton':
      default:
        return '/models/skeleton_model.png'; // This would be a placeholder
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Visualization - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container bg-gray-100">
              <div className="h-full flex flex-col items-center justify-center p-6 text-center relative">
                <div 
                  className="w-full h-full" 
                  style={{
                    backgroundImage: `url(${getModelImage()})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    animation: rotationSpeed > 0 
                      ? `rotate ${20/rotationSpeed}s infinite linear` 
                      : 'none'
                  }}
                />
                
                {/* Fallback SVG if image doesn't load */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="150" 
                    height="150" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-400"
                    style={{
                      animation: rotationSpeed > 0 
                        ? `rotate ${20/rotationSpeed}s infinite linear` 
                        : 'none'
                    }}
                  >
                    <circle cx="12" cy="4" r="2"></circle>
                    <line x1="12" y1="6" x2="12" y2="10"></line>
                    <line x1="12" y1="10" x2="16" y2="14"></line>
                    <line x1="12" y1="10" x2="8" y2="14"></line>
                    <line x1="12" y1="10" x2="12" y2="16"></line>
                    <line x1="12" y1="16" x2="14" y2="20"></line>
                    <line x1="12" y1="16" x2="10" y2="20"></line>
                  </svg>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm">
                  <p className="text-sm text-center">
                    Viewing: <span className="font-semibold">{models.find(m => m.value === selectedModel)?.name}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Adjustment Controls - takes up 4/12 columns on medium screens and above */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-lg font-semibold">Interactive Controls</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-select" className="mb-2 block">Select Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
              <div className="space-y-2">
                <Label htmlFor="rotation-speed">Model Rotation Speed</Label>
                <Slider
                  id="rotation-speed"
                  min={0}
                  max={10}
                  step={0.1}
                  value={[rotationSpeed]}
                  onValueChange={(values) => setRotationSpeed(values[0])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>None</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <Button
                variant="outline"
                onClick={() => setRotationSpeed(0)}
                size="sm"
                className="w-full"
              >
                Stop Rotation
              </Button>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Interaction Tips:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Change the model view using the dropdown</li>
                  <li>Adjust rotation speed with the slider</li>
                  <li>Future versions will support full 3D interaction</li>
                </ul>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-2">Coming Soon:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Full interactive 3D model</li>
                  <li>Movement animations</li>
                  <li>Posture analysis</li>
                  <li>Customizable anatomy</li>
                  <li>Measurement tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add CSS animation for rotation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes rotate {
    from { transform: rotateY(0deg); }
    to { transform: rotateY(360deg); }
  }
`;
document.head.appendChild(styleSheet);