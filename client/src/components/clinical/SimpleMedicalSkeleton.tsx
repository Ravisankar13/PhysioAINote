import React from "react";
import BioDigitalPublicEmbed from "./BioDigitalPublicEmbed";

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
  // Use the BioDigital public embed viewer
  return <BioDigitalPublicEmbed config={config} />;
}