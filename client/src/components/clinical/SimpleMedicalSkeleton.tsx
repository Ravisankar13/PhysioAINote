import React, { useState } from "react";
import PoseableSkeleton from "./PoseableSkeleton";
import AnatomicalSkeleton3D from "./AnatomicalSkeleton3D";
import { Button } from "@/components/ui/button";
import { User, Bone } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'poseable' | 'anatomical'>('poseable');

  // Use the Poseable skeleton with full slider controls by default
  return (
    <div className="relative w-full h-full">
      {viewMode === 'poseable' ? (
        <PoseableSkeleton config={config} />
      ) : (
        <AnatomicalSkeleton3D config={config} />
      )}
      
      {/* Toggle button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setViewMode(viewMode === 'poseable' ? 'anatomical' : 'poseable')}
        className="absolute bottom-4 left-4 text-xs opacity-70 hover:opacity-100 z-20"
      >
        {viewMode === 'poseable' ? <Bone className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />}
        Switch to {viewMode === 'poseable' ? 'Anatomical Skeleton' : 'Poseable Model'}
      </Button>
    </div>
  );
}