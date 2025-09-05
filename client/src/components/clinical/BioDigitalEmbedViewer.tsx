import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Maximize2, Eye, EyeOff, Bone } from "lucide-react";

interface BioDigitalEmbedViewerProps {
  config: {
    limbLengths: {
      upperArm: number;
      forearm: number;
      thigh: number;
      shin: number;
      spine: number;
    };
    jointAngles: {
      shoulderFlexion: number;
      shoulderAbduction: number;
      elbowFlexion: number;
      hipFlexion: number;
      kneeFlexion: number;
    };
    bodyProportions: {
      shoulderWidth: number;
      hipWidth: number;
    };
    pathologies?: {
      shoulder?: string;
      spine?: string;
      lowerLimb?: string;
    };
  };
}

// BioDigital public models that can be embedded without authentication
const BIODIGITAL_MODELS = {
  skeleton: "be1q8xQ2h8z", // Full skeletal system
  skeletonMuscles: "bexk-Lg-vN1", // Skeleton with muscles
  joints: "be2DK_kMgXH", // Joint focus model
  spine: "be1fbjBBvuz", // Spine detail
  shoulder: "be1o2hPf-M4", // Shoulder complex
  knee: "be1u3iQK14r", // Knee joint
  hip: "be1nVrO95Kx", // Hip joint
};

export default function BioDigitalEmbedViewer({ config }: BioDigitalEmbedViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModel, setCurrentModel] = useState(BIODIGITAL_MODELS.skeleton);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const viewerRef = useRef<any>(null);

  // Initialize BioDigital iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // BioDigital public embed URL (no authentication needed for public models)
    const embedUrl = `https://human.biodigital.com/widget?be=${currentModel}&ui-info=true&ui-reset=true&ui-fullscreen=true&ui-share=false&ui-nav=false`;
    
    iframe.src = embedUrl;

    // Handle iframe load
    iframe.onload = () => {
      setIsLoading(false);
      
      // Setup message communication with iframe
      const handleMessage = (event: MessageEvent) => {
        // Filter messages from BioDigital iframe
        if (event.origin !== 'https://human.biodigital.com') return;
        
        // Handle BioDigital viewer ready event
        if (event.data && event.data.type === 'viewerReady') {
          console.log('BioDigital viewer ready');
          viewerRef.current = iframe.contentWindow;
          
          // Apply initial configuration
          setTimeout(() => applyJointRotations(), 1000);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Send initialization message
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'init',
            data: { annotations: showAnnotations }
          }, '*');
        }
      }, 500);
      
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    };
  }, [currentModel, showAnnotations]);

  // Apply joint rotations based on config
  const applyJointRotations = () => {
    if (!viewerRef.current) return;

    const { jointAngles } = config;

    // Map our joint angles to BioDigital scene transformations
    // Note: BioDigital public embeds have limited API access
    // We can suggest positions through camera movements
    const rotationCommands = {
      shoulder: {
        flexion: jointAngles.shoulderFlexion,
        abduction: jointAngles.shoulderAbduction
      },
      elbow: {
        flexion: jointAngles.elbowFlexion
      },
      hip: {
        flexion: jointAngles.hipFlexion
      },
      knee: {
        flexion: jointAngles.kneeFlexion
      }
    };

    // Send rotation data to iframe
    // This is a simplified approach as full API requires authentication
    viewerRef.current.postMessage({
      action: 'rotate',
      data: rotationCommands
    }, '*');
  };

  // Reset view
  const resetView = () => {
    if (!viewerRef.current) return;
    
    viewerRef.current.postMessage({
      action: 'reset'
    }, '*');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!iframeRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      iframeRef.current.requestFullscreen();
    }
  };

  // Toggle annotations
  const toggleAnnotations = () => {
    setShowAnnotations(!showAnnotations);
    
    if (viewerRef.current) {
      viewerRef.current.postMessage({
        action: 'toggleAnnotations',
        data: { show: !showAnnotations }
      }, '*');
    }
  };

  // Change model based on focus area
  const selectModelForPathology = () => {
    if (!config.pathologies) return BIODIGITAL_MODELS.skeleton;

    if (config.pathologies.shoulder) {
      return BIODIGITAL_MODELS.shoulder;
    } else if (config.pathologies.spine) {
      return BIODIGITAL_MODELS.spine;
    } else if (config.pathologies.lowerLimb) {
      if (config.pathologies.lowerLimb.includes('Knee')) {
        return BIODIGITAL_MODELS.knee;
      } else if (config.pathologies.lowerLimb.includes('Hip')) {
        return BIODIGITAL_MODELS.hip;
      }
    }
    
    return BIODIGITAL_MODELS.skeleton;
  };

  // Update model when pathology changes
  useEffect(() => {
    const recommendedModel = selectModelForPathology();
    if (recommendedModel !== currentModel) {
      setCurrentModel(recommendedModel);
    }
  }, [config.pathologies]);

  // Apply configuration changes
  useEffect(() => {
    if (viewerRef.current) {
      applyJointRotations();
    }
  }, [config.jointAngles]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg">
      {/* Control buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex gap-2">
          {/* Model selector */}
          <div className="bg-black/50 backdrop-blur rounded-md p-1">
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="bg-transparent text-white text-xs px-2 py-1 outline-none"
            >
              <option value={BIODIGITAL_MODELS.skeleton}>Full Skeleton</option>
              <option value={BIODIGITAL_MODELS.skeletonMuscles}>Skeleton + Muscles</option>
              <option value={BIODIGITAL_MODELS.joints}>Joints Focus</option>
              <option value={BIODIGITAL_MODELS.spine}>Spine Detail</option>
              <option value={BIODIGITAL_MODELS.shoulder}>Shoulder Complex</option>
              <option value={BIODIGITAL_MODELS.knee}>Knee Joint</option>
              <option value={BIODIGITAL_MODELS.hip}>Hip Joint</option>
            </select>
          </div>
          
          <Button
            size="sm"
            variant={showAnnotations ? "default" : "secondary"}
            onClick={toggleAnnotations}
            className="shadow-lg"
          >
            <Eye className="w-4 h-4 mr-1" />
            Labels
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={resetView}
            className="shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleFullscreen}
            className="shadow-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* BioDigital iframe */}
      <iframe
        ref={iframeRef}
        className="w-full h-full rounded-lg"
        style={{
          border: 'none',
          backgroundColor: '#000000'
        }}
        allow="fullscreen; xr-spatial-tracking"
        title="BioDigital Human 3D Anatomy Viewer"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
            <p className="text-white">Loading BioDigital Human...</p>
            <p className="text-sm text-gray-300">
              Medical-grade 3D anatomy visualization
            </p>
          </div>
        </div>
      )}

      {/* Status badge */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4">
          <Badge variant="secondary" className="bg-green-900/50 text-green-300 backdrop-blur">
            <Bone className="w-3 h-3 mr-1" />
            BioDigital Human
          </Badge>
        </div>
      )}

      {/* Pathology indicators */}
      {config.pathologies && (
        <div className="absolute bottom-4 left-4 space-y-2">
          {Object.entries(config.pathologies).map(([region, pathology]) => 
            pathology && (
              <Badge 
                key={region} 
                variant="secondary" 
                className="bg-red-900/50 text-red-300 backdrop-blur"
              >
                {pathology}
              </Badge>
            )
          )}
        </div>
      )}

      {/* Joint angle indicators */}
      <div className="absolute top-20 left-4 space-y-1 text-xs text-white/70 bg-black/50 backdrop-blur rounded p-2">
        <div>Shoulder: {config.jointAngles.shoulderFlexion}° / {config.jointAngles.shoulderAbduction}°</div>
        <div>Elbow: {config.jointAngles.elbowFlexion}°</div>
        <div>Hip: {config.jointAngles.hipFlexion}°</div>
        <div>Knee: {config.jointAngles.kneeFlexion}°</div>
      </div>
    </div>
  );
}