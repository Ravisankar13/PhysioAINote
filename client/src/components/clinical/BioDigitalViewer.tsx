import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Maximize2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BioDigitalViewerProps {
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

export default function BioDigitalViewer({ config }: BioDigitalViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewer, setViewer] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showMuscles, setShowMuscles] = useState(false);
  const [showNerves, setShowNerves] = useState(false);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const { toast } = useToast();

  // Get BioDigital access token
  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const response = await fetch('/api/biodigital/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to get BioDigital access token');
        }

        const data = await response.json();
        setAccessToken(data.access_token);
      } catch (error) {
        console.error('Error getting BioDigital token:', error);
        toast({
          title: "Connection Error",
          description: "Could not connect to BioDigital API. Using fallback 3D model.",
          variant: "destructive"
        });
      }
    };

    getAccessToken();
  }, []);

  // Initialize BioDigital Human iframe
  useEffect(() => {
    if (!accessToken) return;

    const initializeViewer = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // BioDigital Human embed URL with skeletal system
      // Using their embedded viewer with API access
      const modelId = "be8t-5PBQ-14Ki"; // Male skeletal system model ID
      const embedUrl = `https://human.biodigital.com/widget?be=${modelId}&ui-tools=true&ui-panel=false&dk=${accessToken}`;
      
      iframe.src = embedUrl;

      // Listen for iframe load
      iframe.onload = () => {
        setIsLoading(false);
        
        // Setup communication with iframe
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          // Initialize BioDigital API communication
          setupBioDigitalAPI(iframeWindow);
        }
      };
    };

    initializeViewer();
  }, [accessToken]);

  // Setup BioDigital API communication
  const setupBioDigitalAPI = (iframeWindow: Window) => {
    // BioDigital Human API uses postMessage for communication
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeWindow) return;
      
      // Handle BioDigital API responses
      if (event.data.type === 'HUMAN_API_READY') {
        console.log('BioDigital Human API ready');
        setViewer(event.source);
        
        // Apply initial configuration
        applyConfiguration();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request API ready status
    iframeWindow.postMessage({
      type: 'HUMAN_API_INIT'
    }, '*');
  };

  // Apply configuration to BioDigital model
  const applyConfiguration = () => {
    if (!viewer) return;

    const { jointAngles } = config;

    // Joint rotation commands for BioDigital
    // These map to BioDigital's joint rotation API
    const rotations = [
      {
        objectId: "shoulder_joint_right",
        rotation: {
          x: jointAngles.shoulderFlexion,
          y: 0,
          z: jointAngles.shoulderAbduction
        }
      },
      {
        objectId: "shoulder_joint_left",
        rotation: {
          x: jointAngles.shoulderFlexion,
          y: 0,
          z: -jointAngles.shoulderAbduction
        }
      },
      {
        objectId: "elbow_joint_right",
        rotation: { x: jointAngles.elbowFlexion, y: 0, z: 0 }
      },
      {
        objectId: "elbow_joint_left",
        rotation: { x: jointAngles.elbowFlexion, y: 0, z: 0 }
      },
      {
        objectId: "hip_joint_right",
        rotation: { x: jointAngles.hipFlexion, y: 0, z: 0 }
      },
      {
        objectId: "hip_joint_left",
        rotation: { x: jointAngles.hipFlexion, y: 0, z: 0 }
      },
      {
        objectId: "knee_joint_right",
        rotation: { x: jointAngles.kneeFlexion, y: 0, z: 0 }
      },
      {
        objectId: "knee_joint_left",
        rotation: { x: jointAngles.kneeFlexion, y: 0, z: 0 }
      }
    ];

    // Send rotation commands
    rotations.forEach(rotation => {
      viewer.postMessage({
        type: 'HUMAN_API_COMMAND',
        command: 'scene.rotateObject',
        params: rotation
      }, '*');
    });

    // Apply pathologies if specified
    if (config.pathologies) {
      applyPathologies();
    }
  };

  // Apply pathology visualizations
  const applyPathologies = () => {
    if (!viewer || !config.pathologies) return;

    const { pathologies } = config;

    // Map pathologies to BioDigital conditions
    const pathologyMappings: { [key: string]: string[] } = {
      "Frozen Shoulder": ["adhesive_capsulitis"],
      "Rotator Cuff Tear": ["rotator_cuff_tear"],
      "Disc Herniation": ["herniated_disc_l4_l5"],
      "Scoliosis": ["scoliosis"],
      "Osteoarthritis": ["knee_osteoarthritis", "hip_osteoarthritis"],
      "ACL Tear": ["acl_tear"],
      "Meniscus Tear": ["meniscus_tear"]
    };

    // Show pathology overlays
    Object.entries(pathologies).forEach(([region, pathology]) => {
      if (pathology && pathologyMappings[pathology]) {
        pathologyMappings[pathology].forEach(conditionId => {
          viewer.postMessage({
            type: 'HUMAN_API_COMMAND',
            command: 'scene.showCondition',
            params: { conditionId }
          }, '*');
        });
      }
    });
  };

  // Toggle muscle layer
  const toggleMuscles = () => {
    if (!viewer) return;
    
    const newState = !showMuscles;
    setShowMuscles(newState);
    
    viewer.postMessage({
      type: 'HUMAN_API_COMMAND',
      command: newState ? 'scene.showSystem' : 'scene.hideSystem',
      params: { systemId: 'muscular_system' }
    }, '*');
  };

  // Toggle nerve layer
  const toggleNerves = () => {
    if (!viewer) return;
    
    const newState = !showNerves;
    setShowNerves(newState);
    
    viewer.postMessage({
      type: 'HUMAN_API_COMMAND',
      command: newState ? 'scene.showSystem' : 'scene.hideSystem',
      params: { systemId: 'nervous_system' }
    }, '*');
  };

  // Reset view
  const resetView = () => {
    if (!viewer) return;
    
    viewer.postMessage({
      type: 'HUMAN_API_COMMAND',
      command: 'camera.reset'
    }, '*');
  };

  // Fullscreen mode
  const toggleFullscreen = () => {
    if (!iframeRef.current) return;
    
    if (iframeRef.current.requestFullscreen) {
      iframeRef.current.requestFullscreen();
    }
  };

  // Update configuration when props change
  useEffect(() => {
    if (viewer) {
      applyConfiguration();
    }
  }, [config, viewer]);

  // Fallback to procedural skeleton if no API access
  if (!accessToken) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-400">Connecting to BioDigital Human...</p>
          <p className="text-sm text-gray-500">
            If this takes too long, fallback 3D model will be used
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Control buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showMuscles ? "default" : "secondary"}
            onClick={toggleMuscles}
            className="shadow-lg"
          >
            <Eye className="w-4 h-4 mr-1" />
            Muscles
          </Button>
          <Button
            size="sm"
            variant={showNerves ? "default" : "secondary"}
            onClick={toggleNerves}
            className="shadow-lg"
          >
            <Eye className="w-4 h-4 mr-1" />
            Nerves
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
        allow="fullscreen"
        title="BioDigital Human 3D Anatomy"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
            <p className="text-white">Loading BioDigital Human...</p>
            <p className="text-sm text-gray-300">
              Professional medical-grade 3D anatomy
            </p>
          </div>
        </div>
      )}

      {/* Status badge */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4">
          <Badge variant="secondary" className="bg-green-900/50 text-green-300">
            BioDigital Human Connected
          </Badge>
        </div>
      )}

      {/* Pathology indicators */}
      {config.pathologies && (
        <div className="absolute bottom-4 left-4 space-y-2">
          {Object.entries(config.pathologies).map(([region, pathology]) => 
            pathology && (
              <Badge key={region} variant="secondary" className="bg-red-900/50 text-red-300">
                {pathology}
              </Badge>
            )
          )}
        </div>
      )}
    </div>
  );
}