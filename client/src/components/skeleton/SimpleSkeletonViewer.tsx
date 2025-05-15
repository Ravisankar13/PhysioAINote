import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SimpleSkeletonViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Placeholder - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container bg-gray-100">
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="120" 
                  height="120" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="text-gray-400 mb-4"
                >
                  <circle cx="12" cy="4" r="2"></circle>
                  <line x1="12" y1="6" x2="12" y2="10"></line>
                  <line x1="12" y1="10" x2="16" y2="14"></line>
                  <line x1="12" y1="10" x2="8" y2="14"></line>
                  <line x1="12" y1="10" x2="12" y2="16"></line>
                  <line x1="12" y1="16" x2="14" y2="20"></line>
                  <line x1="12" y1="16" x2="10" y2="20"></line>
                </svg>
                <h3 className="text-lg font-medium mb-2">3D Skeleton Visualization</h3>
                <p className="text-muted-foreground mb-4">
                  A professional 3D skeletal model is being integrated in the next update.
                  This tool will provide detailed anatomical visualization for physiotherapy 
                  education and treatment planning.
                </p>
                <div className="inline-flex animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            </div>
          </div>
          
          {/* Adjustment Controls - takes up 4/12 columns on medium screens and above */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-lg font-semibold">Interactive Controls</h3>
            
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
                <h4 className="text-sm font-semibold mb-2">Coming Soon:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Full 3D skeletal model visualization</li>
                  <li>Adjustable bone lengths and proportions</li>
                  <li>Animated movement patterns</li>
                  <li>Joint mobility visualization</li>
                  <li>Export and sharing options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}