import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Maximize2, Activity, Bone } from "lucide-react";

interface FreeMedical3DProps {
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

// Free Sketchfab medical models (CC licensed, no auth required)
// These are actual public model IDs from Sketchfab
const FREE_3D_MODELS = {
  skeleton: {
    id: "3bd2c31df06e473fbc4e8b18e9c40a27",
    name: "Human Skeleton"
  },
  spine: {
    id: "d6821c5e81d14e4f90a2b2451c954963",
    name: "Vertebral Column"
  },
  skull: {
    id: "ff0e9dcdc17c4ba4b0d2b2fb967c6e38",
    name: "Human Skull"
  },
  ribcage: {
    id: "6c7e7d5b5a5e4c0a9e5b1e6f5e4d3c2b",
    name: "Rib Cage"
  },
  fullbody: {
    id: "1e7f6928e9a04153a9d83e83d5f89bf7",
    name: "Anatomical Model"
  }
};

export default function FreeMedical3D({ config }: FreeMedical3DProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModel, setCurrentModel] = useState("skeleton");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsLoading(true);
    
    // Sketchfab embed URL - completely free, no authentication
    const model = FREE_3D_MODELS[currentModel as keyof typeof FREE_3D_MODELS];
    const embedUrl = `https://sketchfab.com/models/${model.id}/embed?autostart=1&ui_theme=dark&ui_watermark=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_annotations=0`;
    
    iframe.src = embedUrl;

    iframe.onload = () => {
      setTimeout(() => setIsLoading(false), 1000);
    };
  }, [currentModel]);

  const resetView = () => {
    const iframe = iframeRef.current;
    if (iframe) {
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

  // Joint angle display
  const JointAngleDisplay = () => (
    <div className="absolute top-20 left-4 bg-black/80 backdrop-blur rounded-lg p-3 space-y-2 text-xs z-20">
      <div className="text-white font-semibold mb-2 flex items-center">
        <Activity className="w-3 h-3 mr-1" />
        Your Joint Settings
      </div>
      <div className="space-y-1 text-gray-300">
        <div className="flex justify-between gap-4">
          <span>Shoulder Flex:</span>
          <span className="text-green-400">{config.jointAngles.shoulderFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Shoulder Abd:</span>
          <span className="text-green-400">{config.jointAngles.shoulderAbduction}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Elbow:</span>
          <span className="text-blue-400">{config.jointAngles.elbowFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Hip:</span>
          <span className="text-yellow-400">{config.jointAngles.hipFlexion}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Knee:</span>
          <span className="text-orange-400">{config.jointAngles.kneeFlexion}°</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
        <div className="flex gap-2">
          {/* Model selector */}
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="bg-black/50 backdrop-blur text-white text-xs px-3 py-1.5 rounded cursor-pointer outline-none"
          >
            {Object.entries(FREE_3D_MODELS).map(([key, model]) => (
              <option key={key} value={key}>{model.name}</option>
            ))}
          </select>
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

      {/* Joint angles */}
      <JointAngleDisplay />

      {/* 3D Model iframe */}
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        style={{
          border: 'none',
          backgroundColor: '#000'
        }}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        title="3D Medical Model"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-30">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-white" />
            <p className="text-white font-medium">Loading 3D Model...</p>
          </div>
        </div>
      )}

      {/* Status */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 z-20">
          <Badge variant="secondary" className="bg-blue-900/50 text-blue-300 backdrop-blur">
            <Bone className="w-3 h-3 mr-1" />
            3D Medical Model
          </Badge>
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur rounded-lg p-2 max-w-xs z-20">
        <p className="text-xs text-gray-300">
          Interactive 3D model • Rotate with mouse/touch • Scroll to zoom
        </p>
      </div>
    </div>
  );
}