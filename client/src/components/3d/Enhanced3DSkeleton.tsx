import React, { useState } from 'react';
import MixamoSkeleton from './MixamoSkeleton';
import Simple3DSkeleton from './Simple3DSkeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

// Patient data interfaces
interface PatientAnthropometrics {
  height: number;
  weight: number;
  limbLengths: {
    upperArm: number;
    forearm: number;
    thigh: number;
    shin: number;
  };
}

interface JointRestrictions {
  shoulder: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  elbow: {
    flexion: number;
    extension: number;
  };
  hip: {
    flexion: number;
    extension: number;
    abduction: number;
    adduction: number;
  };
  knee: {
    flexion: number;
    extension: number;
  };
}

interface Enhanced3DSkeletonProps {
  patientData?: {
    anthropometrics?: PatientAnthropometrics;
    jointRestrictions?: JointRestrictions;
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
}

export default function Enhanced3DSkeleton({ patientData, className }: Enhanced3DSkeletonProps) {
  const [useMixamo, setUseMixamo] = useState(false);

  return (
    <div className={className}>
      {/* Model Type Toggle */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="model-type"
              checked={useMixamo}
              onCheckedChange={setUseMixamo}
            />
            <Label htmlFor="model-type" className="cursor-pointer">
              Use Professional Mixamo Model (Beta)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {useMixamo 
              ? "Using industry-standard rigged model with animation support"
              : "Using procedural skeleton with real-time generation"}
          </p>
        </CardContent>
      </Card>

      {/* Render appropriate skeleton based on toggle */}
      {useMixamo ? (
        <MixamoSkeleton 
          patientData={patientData} 
          className={className}
          showControls={true}
        />
      ) : (
        <Simple3DSkeleton 
          patientData={patientData} 
          className={className} 
        />
      )}
    </div>
  );
}