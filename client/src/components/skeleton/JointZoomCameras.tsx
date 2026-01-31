import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PureThreeGLBViewer, { 
  JointGroup, 
  JOINT_ZOOM_CAMERAS, 
  JOINT_GROUP_LABELS,
  AnimationState 
} from './PureThreeGLBViewer';

interface JointZoomCamerasProps {
  activeJointGroup: JointGroup;
  modelConfig: any;
  animationState: AnimationState;
  onClose: () => void;
}

export default function JointZoomCameras({ 
  activeJointGroup, 
  modelConfig, 
  animationState,
  onClose 
}: JointZoomCamerasProps) {
  const cameras = useMemo(() => {
    if (!activeJointGroup) return [];
    return JOINT_ZOOM_CAMERAS[activeJointGroup] || [];
  }, [activeJointGroup]);

  const label = activeJointGroup ? JOINT_GROUP_LABELS[activeJointGroup] : '';

  if (!activeJointGroup || cameras.length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm text-white">Zoom: {label}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {cameras.length} views
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-2">
        <div className={`grid gap-2 ${cameras.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {cameras.map((camera, index) => (
            <div key={`${activeJointGroup}-${index}`} className="relative">
              <div className="absolute top-1 left-1 z-10">
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-black/60 text-white border-slate-600">
                  {camera.label}
                </Badge>
              </div>
              <div className="aspect-square rounded overflow-hidden bg-slate-800">
                <PureThreeGLBViewer
                  modelPath="/models/skeleton_character.glb"
                  modelConfig={modelConfig}
                  animationState={animationState}
                  fixedCameraPosition={camera.position}
                  fixedCameraLookAt={camera.lookAt}
                  disableControls={true}
                  showLoadingSpinner={false}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
