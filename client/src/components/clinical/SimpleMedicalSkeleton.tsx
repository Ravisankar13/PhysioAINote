import React, { useState } from "react";
import FreeMedical3D from "./FreeMedical3D";
import AnatomicalSkeleton3D from "./AnatomicalSkeleton3D";
import { Button } from "@/components/ui/button";

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
  const [viewMode, setViewMode] = useState<'3dmodel' | 'anatomical'>('3dmodel');

  // Switch between free 3D models and anatomical skeleton
  return (
    <div className="relative w-full h-full">
      {viewMode === '3dmodel' ? (
        <FreeMedical3D config={config} />
      ) : (
        <AnatomicalSkeleton3D config={config} />
      )}
      
      {/* Toggle button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setViewMode(viewMode === '3dmodel' ? 'anatomical' : '3dmodel')}
        className="absolute top-4 right-20 text-xs opacity-70 hover:opacity-100 z-20"
      >
        Switch to {viewMode === '3dmodel' ? 'Anatomical' : '3D Model'}
      </Button>
    </div>
  );
}