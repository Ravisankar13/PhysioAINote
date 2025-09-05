import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Maximize2, Eye, Activity, Bone } from "lucide-react";

interface BioDigitalPublicEmbedProps {
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

// BioDigital public model IDs that don't require authentication
const BIODIGITAL_PUBLIC_MODELS = {
  fullSkeleton: "production/maleAdult/male_skeleton_system",
  skeletonMuscles: "production/maleAdult/male_musculoskeletal_system", 
  spine: "production/maleAdult/male_spine",
  shoulder: "production/maleAdult/male_shoulder",
  knee: "production/maleAdult/male_knee_joint",
  hip: "production/maleAdult/male_hip_joint",
  nervous: "production/maleAdult/male_nervous_system",
  muscular: "production/maleAdult/male_muscular_system"
};

export default function BioDigitalPublicEmbed({ config }: BioDigitalPublicEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModel, setCurrentModel] = useState("fullSkeleton");
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsLoading(true);
    
    // BioDigital Human public embed URL - no authentication required
    // Using their public viewer with model selection
    const modelPath = BIODIGITAL_PUBLIC_MODELS[currentModel as keyof typeof BIODIGITAL_PUBLIC_MODELS];
    
    // Public embed URL with controls
    const embedUrl = `https://human.biodigital.com/viewer/?id=${modelPath}&ui-info=true&ui-reset=true&ui-fullscreen=true&ui-share=false&ui-tools=true&dk=guest`;
    
    iframe.src = embedUrl;

    iframe.onload = () => {
      setIsLoading(false);
    };
  }, [currentModel]);

  const resetView = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      // Reload the iframe to reset view
      iframe.src = iframe.src;
    }
  };

  const toggleFullscreen = () => {
    if (!iframeRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      iframeRef.current.requestFullscreen();
    }
  };

  // Joint angle display overlay
  const JointAngleDisplay = () => (
    <div className="absolute top-20 left-4 bg-black/80 backdrop-blur rounded-lg p-3 space-y-2 text-xs z-20">
      <div className="text-white font-semibold mb-2 flex items-center">
        <Activity className="w-3 h-3 mr-1" />
        Joint Angles
      </div>
      <div className="space-y-1 text-gray-300">
        <div className="flex justify-between gap-4">
          <span>Shoulder Flexion:</span>
          <span className="text-green-400">{config.jointAngles.shoulderFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Shoulder Abd:</span>
          <span className="text-green-400">{config.jointAngles.shoulderAbduction}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Elbow Flexion:</span>
          <span className="text-blue-400">{config.jointAngles.elbowFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Hip Flexion:</span>
          <span className="text-yellow-400">{config.jointAngles.hipFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Knee Flexion:</span>
          <span className="text-orange-400">{config.jointAngles.kneeFlexion}°</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg">
      {/* Control buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
        <div className="flex gap-2">
          {/* Model selector */}
          <div className="bg-black/50 backdrop-blur rounded-md p-1">
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="bg-transparent text-white text-xs px-2 py-1 outline-none cursor-pointer"
            >
              <option value="fullSkeleton">Full Skeleton</option>
              <option value="skeletonMuscles">Skeleton + Muscles</option>
              <option value="muscular">Muscular System</option>
              <option value="nervous">Nervous System</option>
              <option value="spine">Spine Detail</option>
              <option value="shoulder">Shoulder Complex</option>
              <option value="knee">Knee Joint</option>
              <option value="hip">Hip Joint</option>
            </select>
          </div>
          
          <Button
            size="sm"
            variant={showLabels ? "default" : "secondary"}
            onClick={() => setShowLabels(!showLabels)}
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

      {/* Joint angles display */}
      <JointAngleDisplay />

      {/* BioDigital iframe */}
      <iframe
        ref={iframeRef}
        className="w-full h-full rounded-lg"
        style={{
          border: 'none',
          backgroundColor: '#000000'
        }}
        allow="fullscreen; xr-spatial-tracking; clipboard-write"
        title="BioDigital Human 3D Anatomy"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg z-30">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
            <p className="text-white font-semibold">Loading BioDigital Human...</p>
            <p className="text-sm text-gray-300">
              Professional medical-grade 3D anatomy
            </p>
          </div>
        </div>
      )}

      {/* Status badge */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 z-20">
          <Badge variant="secondary" className="bg-green-900/50 text-green-300 backdrop-blur">
            <Bone className="w-3 h-3 mr-1" />
            BioDigital Human
          </Badge>
        </div>
      )}

      {/* Pathology indicators */}
      {config.pathologies && (
        <div className="absolute bottom-4 left-4 space-y-2 z-20">
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

      {/* Information panel */}
      <div className="absolute bottom-20 left-4 bg-black/80 backdrop-blur rounded-lg p-3 max-w-xs z-20">
        <p className="text-xs text-gray-300">
          <span className="text-white font-semibold">BioDigital Human Viewer</span>
          <br />
          Professional 3D anatomy. Use mouse/touch to rotate, scroll to zoom.
          <br />
          <span className="text-gray-400 mt-1 block">
            Note: Joint angles shown are from your controls. Model manipulation requires manual interaction.
          </span>
        </p>
      </div>
    </div>
  );
}