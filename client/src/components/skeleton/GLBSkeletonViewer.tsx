import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Import the model directly using Vite's asset imports
import skeletonModel from "@assets/skeleton_rig.glb";

// Use the imported model path
const MODEL_PATH = skeletonModel;

function SkeletonModel() {
  // Load the GLB file
  const { scene } = useGLTF(MODEL_PATH);
  const modelRef = useRef();

  return (
    <primitive 
      ref={modelRef} 
      object={scene} 
      position={[0, -1, 0]} 
      scale={0.7} 
    />
  );
}

export default function GLBSkeletonViewer() {
  const [rotationSpeed, setRotationSpeed] = useState(0);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Model Viewer - takes up 8/12 columns on medium screens and above */}
          <div className="md:col-span-8">
            <div className="w-full aspect-[4/3] rounded-md overflow-hidden border model-container">
              {/* Fallback content that will show if the 3D model fails to load */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 opacity-0 pointer-events-none error-fallback">
                <div className="text-center p-6">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="80" 
                    height="80" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-400 mx-auto mb-4"
                  >
                    <circle cx="12" cy="4" r="2"></circle>
                    <line x1="12" y1="6" x2="12" y2="10"></line>
                    <line x1="12" y1="10" x2="16" y2="14"></line>
                    <line x1="12" y1="10" x2="8" y2="14"></line>
                    <line x1="12" y1="10" x2="12" y2="16"></line>
                    <line x1="12" y1="16" x2="14" y2="20"></line>
                    <line x1="12" y1="16" x2="10" y2="20"></line>
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Model Loading Error</h3>
                  <p className="text-muted-foreground">
                    We're having trouble loading the 3D model. 
                    Please try again later.
                  </p>
                </div>
              </div>

              {/* The Canvas element for the 3D viewer */}
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="text-center">
                    <div className="inline-flex animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                    <p>Loading 3D Model...</p>
                  </div>
                </div>
              }>
                <Canvas 
                  camera={{ position: [0, 0, 5], fov: 45 }}
                  onError={(error) => {
                    console.error("Canvas error:", error);
                    // Show fallback content if there's an error
                    document.querySelector('.error-fallback')?.classList.remove('opacity-0', 'pointer-events-none');
                  }}
                >
                  <ambientLight intensity={0.7} />
                  <pointLight position={[10, 10, 10]} intensity={0.5} />
                  <pointLight position={[-10, -10, -5]} intensity={0.5} />
                  
                  <group rotation={[0, rotationSpeed * 0.01, 0]}>
                    <SkeletonModel />
                  </group>
                  
                  <OrbitControls 
                    enableZoom={true} 
                    enablePan={true} 
                    minDistance={2} 
                    maxDistance={10}
                  />
                </Canvas>
              </Suspense>
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
                <h4 className="text-sm font-semibold mb-2">Interaction Tips:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                  <li>Drag to rotate the model</li>
                  <li>Scroll to zoom in and out</li>
                  <li>Right-click and drag to pan</li>
                  <li>Double-click to reset the view</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add this script to handle errors in loading the model
const errorScript = document.createElement('script');
errorScript.innerHTML = `
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('THREE')) {
      console.error('Three.js error detected:', event);
      document.querySelector('.error-fallback')?.classList.remove('opacity-0', 'pointer-events-none');
    }
  }, true);
`;
document.head.appendChild(errorScript);