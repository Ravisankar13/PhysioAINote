import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Grid2X2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PureThreeGLBViewer, { CameraAngle, CAMERA_PRESETS, AnimationState } from './PureThreeGLBViewer';
import { BiomechanicsVisualizationData } from '@/lib/forceVisualization';
import { JointLimits } from '@/lib/movementSequences';

interface ViewConfig {
  angle: CameraAngle;
  enabled: boolean;
}

interface MultiViewSkeletonLayoutProps {
  modelPath?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelConfig?: any;
  animationState?: AnimationState;
  jointLimits?: JointLimits;
  biomechanicsData?: BiomechanicsVisualizationData;
  onAnimationFrame?: (jointValues: { [key: string]: { [prop: string]: number } }) => void;
  className?: string;
}

const DEFAULT_VIEWS: ViewConfig[] = [
  { angle: 'front', enabled: true },
  { angle: 'left', enabled: true },
  { angle: 'back', enabled: true },
  { angle: 'right', enabled: true },
];

export default function MultiViewSkeletonLayout({
  modelPath,
  modelConfig,
  animationState,
  jointLimits,
  biomechanicsData,
  onAnimationFrame,
  className = ''
}: MultiViewSkeletonLayoutProps) {
  const [views, setViews] = useState<ViewConfig[]>(DEFAULT_VIEWS);
  const [isExpanded, setIsExpanded] = useState(false);

  const enabledViews = views.filter(v => v.enabled);
  const viewCount = enabledViews.length;

  const toggleView = (angle: CameraAngle) => {
    setViews(prev => prev.map(v => 
      v.angle === angle ? { ...v, enabled: !v.enabled } : v
    ));
  };

  const getGridClass = () => {
    if (viewCount === 1) return 'grid-cols-1';
    if (viewCount === 2) return 'grid-cols-2';
    if (viewCount === 3) return 'grid-cols-3';
    return 'grid-cols-2 grid-rows-2';
  };

  const getViewHeight = () => {
    if (isExpanded) {
      if (viewCount <= 2) return '600px';
      return '400px';
    }
    if (viewCount <= 2) return '400px';
    return '300px';
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid2X2 className="h-5 w-5 text-green-400" />
            Multi-Angle Skeleton View
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {views.map(view => (
                <div key={view.angle} className="flex items-center gap-1.5">
                  <Switch
                    id={`view-${view.angle}`}
                    checked={view.enabled}
                    onCheckedChange={() => toggleView(view.angle)}
                    className="data-[state=checked]:bg-green-500"
                    data-testid={`toggle-view-${view.angle}`}
                  />
                  <Label 
                    htmlFor={`view-${view.angle}`} 
                    className="text-xs text-slate-400 cursor-pointer"
                  >
                    {CAMERA_PRESETS[view.angle].label}
                  </Label>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white"
              data-testid="toggle-expand"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewCount === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-500">
            Enable at least one view to see the skeleton
          </div>
        ) : (
          <div 
            className={`grid gap-2 ${getGridClass()}`}
            style={{ minHeight: getViewHeight() }}
          >
            {enabledViews.map((view, index) => (
              <div 
                key={view.angle} 
                className="relative rounded-lg overflow-hidden border border-slate-700"
                style={{ height: getViewHeight() }}
                data-testid={`skeleton-view-${view.angle}`}
              >
                <PureThreeGLBViewer
                  modelPath={modelPath}
                  modelConfig={modelConfig}
                  animationState={animationState}
                  jointLimits={jointLimits}
                  biomechanicsData={biomechanicsData}
                  onAnimationFrame={index === 0 ? onAnimationFrame : undefined}
                  cameraAngle={view.angle}
                  disableControls={true}
                  showLabel={true}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
