import React, { lazy, Suspense } from 'react';
import { ProductionPlaceholder } from '@/components/ProductionPlaceholder';

// Determine if we're in production build mode
const isProductionBuild = import.meta.env.PROD;

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Conditionally load heavy components
export const MovementCapture = isProductionBuild 
  ? () => <ProductionPlaceholder feature="Movement Capture" description="Advanced movement capture with TensorFlow.js - loads on demand in production." />
  : lazy(() => import('@/components/MovementCapture').then(m => ({ default: m.MovementCapture })));

export const PoseDetection = isProductionBuild
  ? () => <ProductionPlaceholder feature="Pose Detection" description="Real-time pose detection - loads on demand in production." />
  : lazy(() => import('@/components/PoseDetection').then(m => ({ default: m.PoseDetection })));

export const EnhancedPoseDetection = isProductionBuild
  ? () => <ProductionPlaceholder feature="Enhanced Pose Detection" description="Multi-model pose detection ensemble - loads on demand in production." />
  : lazy(() => import('@/components/EnhancedPoseDetection').then(m => ({ default: m.EnhancedPoseDetection })));

export const StaticPosturalAnalysis = isProductionBuild
  ? () => <ProductionPlaceholder feature="Static Postural Analysis" description="Comprehensive postural assessment - loads on demand in production." />
  : lazy(() => import('@/components/StaticPosturalAnalysis').then(m => ({ default: m.StaticPosturalAnalysis })));

// Wrapper to handle Suspense
export const withSuspense = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};