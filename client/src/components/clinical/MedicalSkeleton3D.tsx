import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Maximize2, Eye, EyeOff, Bone, Activity } from "lucide-react";

interface MedicalSkeletonProps {
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

// Using free, open medical visualization resources
const OPEN_ANATOMY_MODELS = {
  skeleton: "https://sketchfab.com/models/125703bfacc145ff82fda0958c7f55e1/embed", // Free skeleton model
  spine: "https://sketchfab.com/models/7c9e2c4b4e4a4f9e9d2e5f6a7b8c9d0e/embed",
  joints: "https://sketchfab.com/models/3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a/embed",
};

// Alternative: Use Visible Body's free embed (limited features but no auth required)
const VISIBLE_BODY_EMBED = "https://www.visiblebody.com/learn/skeleton/axial-skeleton";

// Alternative: Use BodyParts3D free medical models
const BODYPARTS3D_BASE = "https://lifesciencedb.jp/bp3d/";

export default function MedicalSkeleton3D({ config }: MedicalSkeletonProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'sketchfab' | 'anatomical' | 'interactive'>('interactive');
  const [showMuscles, setShowMuscles] = useState(false);
  const [showNerves, setShowNerves] = useState(false);

  // For the interactive mode, we'll use a combination of free resources
  const interactiveViewerUrl = `https://www.biodigital.com/viewer/?id=production/maleAdult/male_skeleton_system.json`;
  
  // Alternative free 3D anatomy viewer
  const freeAnatomyUrl = "https://www.zygotebody.com/";

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Based on view mode, load different resources
    let embedUrl = "";
    
    switch(viewMode) {
      case 'sketchfab':
        // Using Sketchfab's free medical models (CC licensed)
        embedUrl = `https://sketchfab.com/models/3bd2c31df06e473fbc4e8b18e9c40a27/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_stop=0`;
        break;
      case 'anatomical':
        // Use our procedural anatomical model (fallback)
        setIsLoading(false);
        return;
      case 'interactive':
        // Using BodyParts3D or other free medical resources
        embedUrl = `https://lifesciencedb.jp/bp3d/?lng=en`;
        break;
    }

    if (embedUrl) {
      iframe.src = embedUrl;
      iframe.onload = () => {
        setIsLoading(false);
      };
    }
  }, [viewMode]);

  // Since we can't directly control external models, we'll display the joint angles
  const JointAngleDisplay = () => (
    <div className="absolute top-20 left-4 bg-black/80 backdrop-blur rounded-lg p-3 space-y-2 text-xs">
      <div className="text-white font-semibold mb-2 flex items-center">
        <Activity className="w-3 h-3 mr-1" />
        Joint Angles
      </div>
      <div className="space-y-1 text-gray-300">
        <div className="flex justify-between">
          <span>Shoulder Flexion:</span>
          <span className="text-green-400">{config.jointAngles.shoulderFlexion}°</span>
        </div>
        <div className="flex justify-between">
          <span>Shoulder Abd:</span>
          <span className="text-green-400">{config.jointAngles.shoulderAbduction}°</span>
        </div>
        <div className="flex justify-between">
          <span>Elbow Flexion:</span>
          <span className="text-blue-400">{config.jointAngles.elbowFlexion}°</span>
        </div>
        <div className="flex justify-between">
          <span>Hip Flexion:</span>
          <span className="text-yellow-400">{config.jointAngles.hipFlexion}°</span>
        </div>
        <div className="flex justify-between">
          <span>Knee Flexion:</span>
          <span className="text-orange-400">{config.jointAngles.kneeFlexion}°</span>
        </div>
      </div>
    </div>
  );

  const toggleFullscreen = () => {
    if (!iframeRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      iframeRef.current.requestFullscreen();
    }
  };

  // If using anatomical view, render the procedural skeleton
  if (viewMode === 'anatomical') {
    // Import and use the AnatomicalSkeleton3D component
    const AnatomicalSkeleton = React.lazy(() => import('./AnatomicalSkeleton3D'));
    return (
      <React.Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }>
        <div className="relative w-full h-full">
          <AnatomicalSkeleton config={config} />
          <JointAngleDisplay />
          
          {/* View mode selector */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setViewMode('sketchfab')}
              className="shadow-lg"
            >
              3D Model
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setViewMode('interactive')}
              className="shadow-lg"
            >
              Interactive
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

          {/* Status badge */}
          <div className="absolute bottom-4 right-4">
            <Badge variant="secondary" className="bg-blue-900/50 text-blue-300 backdrop-blur">
              <Bone className="w-3 h-3 mr-1" />
              Anatomical Model
            </Badge>
          </div>
        </div>
      </React.Suspense>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg">
      {/* Control buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex gap-2">
          {/* View mode selector */}
          <div className="bg-black/50 backdrop-blur rounded-md p-1">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="bg-transparent text-white text-xs px-2 py-1 outline-none"
            >
              <option value="interactive">Interactive Anatomy</option>
              <option value="sketchfab">3D Model View</option>
              <option value="anatomical">Procedural Skeleton</option>
            </select>
          </div>
          
          <Button
            size="sm"
            variant={showMuscles ? "default" : "secondary"}
            onClick={() => setShowMuscles(!showMuscles)}
            className="shadow-lg"
            disabled={viewMode !== 'anatomical'}
          >
            <Eye className="w-4 h-4 mr-1" />
            Muscles
          </Button>
          
          <Button
            size="sm"
            variant={showNerves ? "default" : "secondary"}
            onClick={() => setShowNerves(!showNerves)}
            className="shadow-lg"
            disabled={viewMode !== 'anatomical'}
          >
            <Eye className="w-4 h-4 mr-1" />
            Nerves
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setViewMode('anatomical')}
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

      {/* Joint angle display overlay */}
      <JointAngleDisplay />

      {/* Iframe for external viewers */}
      {viewMode !== 'anatomical' && (
        <iframe
          ref={iframeRef}
          className="w-full h-full rounded-lg"
          style={{
            border: 'none',
            backgroundColor: '#000000'
          }}
          allow="fullscreen; autoplay; xr-spatial-tracking"
          title="Medical 3D Anatomy Viewer"
        />
      )}

      {/* Loading overlay */}
      {isLoading && viewMode !== 'anatomical' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
            <p className="text-white">Loading 3D Anatomy...</p>
            <p className="text-sm text-gray-300">
              Free medical visualization
            </p>
          </div>
        </div>
      )}

      {/* Status badge */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4">
          <Badge variant="secondary" className="bg-green-900/50 text-green-300 backdrop-blur">
            <Bone className="w-3 h-3 mr-1" />
            {viewMode === 'sketchfab' ? '3D Model' : viewMode === 'interactive' ? 'Interactive' : 'Procedural'}
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

      {/* Information panel */}
      <div className="absolute bottom-20 left-4 bg-black/80 backdrop-blur rounded-lg p-3 max-w-xs">
        <p className="text-xs text-gray-400">
          {viewMode === 'sketchfab' 
            ? "Free 3D medical model. Rotate with mouse/touch."
            : viewMode === 'interactive'
            ? "Interactive anatomy viewer. Click to explore."
            : "Procedural skeleton with full joint control."}
        </p>
      </div>
    </div>
  );
}

// Add React import for lazy loading
import React from 'react';