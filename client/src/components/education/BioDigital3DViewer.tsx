/**
 * BioDigital 3D Viewer Component
 * 
 * Embeds the BioDigital Human interactive 3D anatomy viewer
 * Requires a BioDigital API key to be set in environment variables
 */

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Maximize2, RotateCw, ZoomIn, ZoomOut, Eye, EyeOff, Info } from "lucide-react";

interface BioDigital3DViewerProps {
  modelId: string; // BioDigital model identifier
  height?: string;
  viewAngle?: string;
  highlightStructures?: string[];
  showLabels?: boolean;
  title?: string;
  description?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function BioDigital3DViewer({
  modelId,
  height = "500px",
  viewAngle = "default",
  highlightStructures = [],
  showLabels = true,
  title,
  description,
  onLoad,
  onError
}: BioDigital3DViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [humanAPI, setHumanAPI] = useState<any>(null);
  
  // Check for API key
  useEffect(() => {
    const key = import.meta.env.VITE_BIODIGITAL_API_KEY;
    if (!key) {
      const errorMsg = "BioDigital API key not configured. Please set VITE_BIODIGITAL_API_KEY environment variable.";
      setError(errorMsg);
      onError?.(errorMsg);
    } else {
      setApiKey(key);
    }
  }, [onError]);
  
  // Load BioDigital Human API
  useEffect(() => {
    if (!apiKey) return;
    
    // Load the BioDigital Human API script
    const script = document.createElement('script');
    script.src = 'https://human-api.biodigital.com/build/1.2.1/human-api-1.2.1.min.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize the API when iframe loads
      if (iframeRef.current && (window as any).Human) {
        const human = new (window as any).Human(iframeRef.current.id);
        
        human.on('ready', () => {
          setIsLoading(false);
          setHumanAPI(human);
          onLoad?.();
          
          // Apply initial configuration
          if (showLabels) {
            human.annotations.setAnnotationsEnabled(true);
          }
          
          // Highlight specific structures if provided
          if (highlightStructures.length > 0) {
            highlightStructures.forEach(structure => {
              human.scene.selectByName(structure);
            });
          }
        });
        
        human.on('error', (evt: any) => {
          const errorMsg = `BioDigital loading error: ${evt.message}`;
          setError(errorMsg);
          setIsLoading(false);
          onError?.(errorMsg);
        });
      }
    };
    
    script.onerror = () => {
      const errorMsg = "Failed to load BioDigital Human API";
      setError(errorMsg);
      setIsLoading(false);
      onError?.(errorMsg);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey, highlightStructures, showLabels, onLoad, onError]);
  
  // Control functions
  const handleReset = () => {
    if (humanAPI) {
      humanAPI.camera.reset();
    }
  };
  
  const handleZoomIn = () => {
    if (humanAPI) {
      humanAPI.camera.zoom(1.5);
    }
  };
  
  const handleZoomOut = () => {
    if (humanAPI) {
      humanAPI.camera.zoom(0.75);
    }
  };
  
  const toggleLabels = () => {
    if (humanAPI) {
      humanAPI.annotations.toggleAnnotations();
    }
  };
  
  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };
  
  if (error && !apiKey) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{error}</p>
            <p className="text-sm text-muted-foreground">
              To enable 3D anatomy viewing:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Sign up for a free BioDigital developer account at developer.biodigital.com</li>
              <li>Get your API key from the dashboard</li>
              <li>Add VITE_BIODIGITAL_API_KEY to your environment variables</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Build the iframe URL
  const iframeUrl = apiKey 
    ? `https://human.biodigital.com/widget/?m=${modelId}&dk=${apiKey}&ui-nav=true&ui-tools=true&ui-search=true`
    : '';
  
  return (
    <Card className="w-full" data-testid="biodigital-viewer">
      {(title || description) && (
        <div className="p-4 border-b">
          {title && <h3 className="font-semibold text-lg mb-1">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading 3D model...</p>
            </div>
          </div>
        )}
        
        {error && apiKey && (
          <Alert className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {apiKey && (
          <>
            <iframe
              ref={iframeRef}
              id={`biodigital-${modelId}`}
              src={iframeUrl}
              width="100%"
              height={height}
              className="border-0"
              allow="fullscreen"
              title={title || "BioDigital 3D Anatomy Viewer"}
              data-testid="biodigital-iframe"
            />
            
            {/* Control buttons */}
            <div className="absolute bottom-4 left-4 flex gap-2 bg-background/90 p-2 rounded-lg shadow-lg">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                title="Reset view"
                disabled={!humanAPI}
                data-testid="button-reset-view"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                title="Zoom in"
                disabled={!humanAPI}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                title="Zoom out"
                disabled={!humanAPI}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleLabels}
                title="Toggle labels"
                disabled={!humanAPI}
                data-testid="button-toggle-labels"
              >
                {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFullscreen}
                title="Fullscreen"
                data-testid="button-fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Preset model configurations for common anatomy
export const BIODIGITAL_MODELS = {
  shoulder: {
    full: "shoulder_complete",
    rotatorCuff: "shoulder_rotator_cuff",
    bones: "shoulder_bones",
    muscles: "shoulder_muscles",
    jointCapsule: "shoulder_joint_capsule"
  },
  knee: {
    full: "knee_complete",
    ligaments: "knee_ligaments",
    meniscus: "knee_meniscus",
    bones: "knee_bones"
  },
  spine: {
    lumbar: "spine_lumbar",
    cervical: "spine_cervical",
    full: "spine_complete"
  },
  hip: {
    full: "hip_complete",
    muscles: "hip_muscles",
    joint: "hip_joint"
  },
  elbow: {
    full: "elbow_complete",
    ligaments: "elbow_ligaments"
  },
  ankle: {
    full: "ankle_complete",
    ligaments: "ankle_ligaments"
  }
};