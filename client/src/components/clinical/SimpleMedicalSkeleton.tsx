import React, { useState } from "react";
import BodyParts3DSkeleton from "./BodyParts3DSkeleton";
import PoseableSkeleton from "./PoseableSkeleton";
import AnatomicalSkeleton3D from "./AnatomicalSkeleton3D";
import { Button } from "@/components/ui/button";
import { User, Bone, Brain } from "lucide-react";

interface SimpleMedicalSkeletonProps {
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

export default function SimpleMedicalSkeleton({ config }: SimpleMedicalSkeletonProps) {
  const [viewMode, setViewMode] = useState<'bodyparts3d' | 'poseable' | 'anatomical'>('bodyparts3d');

  // Use BodyParts3D model by default
  return (
    <div className="relative w-full h-full">
      {viewMode === 'bodyparts3d' ? (
        <BodyParts3DSkeleton config={config} />
      ) : viewMode === 'poseable' ? (
        <PoseableSkeleton config={config} />
      ) : (
        <AnatomicalSkeleton3D config={config} />
      )}
      
      {/* Toggle buttons */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button
          size="sm"
          variant={viewMode === 'bodyparts3d' ? 'default' : 'ghost'}
          onClick={() => setViewMode('bodyparts3d')}
          className="text-xs"
        >
          <Brain className="w-4 h-4 mr-1" />
          BodyParts3D
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'poseable' ? 'default' : 'ghost'}
          onClick={() => setViewMode('poseable')}
          className="text-xs"
        >
          <User className="w-4 h-4 mr-1" />
          Poseable
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'anatomical' ? 'default' : 'ghost'}
          onClick={() => setViewMode('anatomical')}
          className="text-xs"
        >
          <Bone className="w-4 h-4 mr-1" />
          Anatomical
        </Button>
      </div>
    </div>
  );
}