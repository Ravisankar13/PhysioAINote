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
  // Use the anatomical skeleton which is working properly
  return <AnatomicalSkeleton3D config={config} />;
}